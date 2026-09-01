# Critérios de Aceite (Checklist) — `firestore-admin-access`

> Status por item: **PASS** (verificado) · **BLOQUEADO** (depende de ação humana) · **FALHOU** ·
> **NÃO COBERTO**. O meio de verificação vem entre parênteses: unit, rota, e2e (browser), API (curl contra
> o Firestore real de dev) ou estático.
>
> Escopo do diff: `git diff origin/main...HEAD` — `apps/api` (infra, `BaseRepository`, 2 repositórios,
> `env.ts`, `instrumentation.ts`, `.env.example`, `package.json`), `packages/auth/keys.ts`,
> `firestore.rules`, `firestore.indexes.json`, `.firebaserc` e docs. **Zero arquivo de `packages/sdk`,
> `apps/app`, `apps/web` ou `packages/internationalization`.**

---

## 1. Driver de banco

- [x] **A API só fala com o Firestore pelo Admin SDK** — **PASS** (unit `firestoreDriver.test.ts`, estático)
  Nenhum arquivo de `apps/api/(shared)/**` ou `apps/api/app/**` pode importar `firebase/firestore` ou
  `firebase/app`: o client SDK roda como cliente anônimo e seria negado pelas rules `deny-all`. O teste
  varre a árvore inteira e falha listando os infratores, com asserção de sanidade (`>10` arquivos varridos)
  para não passar vacuamente se o scanner quebrar. `firebase` também saiu das dependências da api e
  `firebase-admin` deixou de ser `devDependency`.

- [x] **O dialeto do Admin SDK é respeitado onde o typecheck não protege** — **PASS** (unit
  `baseRepository.test.ts`, 20 testes)
  A armadilha central é `snap.exists()` (método, client SDK) → `snap.exists` (propriedade, admin): o TS não
  pega, porque o dublê e o tipo divergem em runtime. O dublê em memória expõe `exists` como booleano e
  reproduz a semântica real de campo ausente (documento **sem** o campo não casa `deletedAt == null`,
  via `Symbol("missing")`). Provado load-bearing por mutação nas etapas anteriores (reverter para
  `snap.exists()` derruba 7 testes).

- [x] **`findAll()` aplica o `rowMapper`, como `findById()`** — **PASS** (unit `baseRepository.test.ts`)
  Antes, a listagem devolvia a linha crua e só a busca por id passava pelo mapper — o que deixava
  `createdAt` sair em formato diferente entre lista e detalhe. O teste semeia um `createdAt` em formato de
  `Timestamp` e exige ISO na saída de `findAll()`, e há um caso irmão para repositório **sem** mapper
  (fallback para a linha crua + `id`).

## 2. Formato do payload (o que mudou de observável)

- [x] **`GET /users` devolve `createdAt`/`updatedAt` como string ISO** — **PASS** (unit
  `baseRepository.test.ts`, API)
  Era a única divergência declarada: com o client SDK o `instanceof Timestamp` do mapper era sempre falso e
  o campo vazava como objeto. Medido em runtime contra o Firestore de dev: os 4 registros de
  `GET /users?type=admin` trazem `createdAt` do tipo `str` (amostra `'2026-04-13T22:53:08.612Z'`) e a
  resposta inteira não contém `_seconds`.

- [x] **As respostas que passam por `mergeAuthAndFirestore` também saem em ISO** — **PASS** (unit
  `userProfileSerialization.test.ts`, rota `mergedUserPayload.test.ts`, API)
  Esta é a **segunda** mudança de payload, corrigida em `84201b6` e que até agora não tinha prova. Sem a
  serialização, o `Timestamp` do Admin SDK serializa como `{_seconds,_nanoseconds}` (formato **diferente**
  do `{type,seconds,nanoseconds}` do client SDK) em 7 endpoints, e cria a incoerência de `GET /users`
  devolver ISO e `GET /users/:id` devolver objeto para o mesmo campo do mesmo recurso. Medido em runtime:
  `POST /auth/sign-in`, `GET /auth/me`, `GET /users/:id` e `POST /users` devolvem
  `'2026-08-22T16:22:57.960Z'` e nenhuma resposta contém `_seconds`. O teste unitário usa um `Timestamp`
  **real** de `firebase-admin/firestore` (o dublê duck-typed do `baseRepository.test.ts` não serve, porque
  `serializeFirestoreData` usa `instanceof`) e falha se a serialização for revertida — confirmado por
  mutação: 1 teste unitário + 3 testes de rota caem.

- [x] **Um `createdAt` recém-criado em memória chega ao cliente como data** — **PASS após correção**
  (unit `userProfileSerialization.test.ts`)
  Encontrado FALHANDO pelo QA e **corrigido em seguida**. Quando o perfil não existe no Firestore,
  `getMergedUserByUid` o cria na hora (`ensureDefaultUserProfile`) e mescla o **retorno de `create()`**, que
  traz `createdAt`/`updatedAt` como `Date` do JS, não como `Timestamp`. `serializeFirestoreValue` só tratava
  `Timestamp`; um `Date` caía no ramo genérico de objeto, `Object.entries(new Date())` é vazio e o campo
  virava **`{}`**. Reproduzido em runtime: perfil soft-deletado pelo admin → o usuário chama `GET /auth/me`
  → `createdAt = {}`. Atingia `GET /auth/me` e `POST /auth/sign-in` de qualquer conta de Auth sem perfil
  vivo. Era **regressão introduzida por `84201b6`** (antes o `Date` virava ISO no `JSON.stringify`).
  `serializeFirestoreValue` passou a tratar `Date` ao lado de `Timestamp`, e o teste que trava a regressão
  foi provado load-bearing: removida a correção, ele — e só ele — falha.

- [x] **O `update()` continua reescrevendo o documento inteiro, sem piorar** — **PASS** (unit
  `baseRepository.test.ts`, e2e 11/12)
  Defeito pré-existente preservado por decisão (Q4): o `update()` lê via `findById` — que com mapper devolve
  **string ISO** — e regrava tudo, então depois do primeiro `PUT` o `createdAt` fica gravado como string.
  Há teste asseverando exatamente isso, para que quem for consertar precise atualizá-lo conscientemente. No
  repositório **sem** mapper (`user`) o campo volta como `Timestamp` — também coberto. Na UI, o `Criado em`
  segue correto depois de um `PUT` e de um reload (`30 de ago. de 2026, 22:26`), que é o risco real da
  coleção com tipo misto.

## 3. Contrato HTTP inalterado

- [x] **Nenhum arquivo de `packages/sdk`, `apps/app` ou `apps/web` no diff** — **PASS** (estático)
  A migração é contract-preserving por construção: se o front precisou mudar, a troca de driver vazou. O
  diff contra `origin/main` tem 18 arquivos de código, todos em `apps/api`, `packages/auth/keys.ts` e
  configuração de raiz. Nenhum `error.code` novo, nenhuma chave de i18n, nenhuma action de SDK.

- [x] **O CRUD `entity` funciona de ponta a ponta** — **PASS** (e2e 08–14)
  Percorrido como usuário comum criado pelo próprio sign-up: lista vazia com o texto traduzido →
  submit inválido mostrando `Informe o nome.` → criar → `Criado em` com data real → toggle `enabled`
  **confirmado após reload** (não só otimista) → editar (a tela de edição mostra
  `Criado em: 30 de ago. de 2026, 22:26`) → excluir com confirmação → lista vazia após reload. Nenhum
  `1970`, nenhum `Invalid Date`, nenhum erro no console além do aviso pré-existente de compatibilidade do
  antd com React 19.

- [x] **A gestão de usuários funciona de ponta a ponta** — **PASS** (e2e 01–06)
  Lista admin (caminho `findAll()` + `serializeFirestoreData`) renderiza; edição de `displayName` via
  `PUT /users/:id` persiste e **aparece na lista após reload**; criação via `POST /users` aparece na
  listagem. A lista foi filtrada por `qa-` antes de qualquer captura, então só contas `@example.com`
  aparecem nos prints.

## 4. Autorização e ownership

- [x] **Usuário não autenticado é recusado** — **PASS** (rota `mergedUserPayload.test.ts`, API)
  `GET /auth/me` e `GET /users/:id` respondem 401 quando o ator não resolve. Medido também sem credencial
  contra a API real: `GET /users` → 401, `GET /entities/:id` → 401.

- [x] **Usuário comum não alcança a área admin** — **PASS** (rota `mergedUserPayload.test.ts`)
  Um chamador autenticado cujo perfil não é admin recebe 403 com `{"error":{"code":"ADMIN_FORBIDDEN"}}` em
  `GET /users/:id`, e o repositório de usuários não é sequer consultado. O guard roda de verdade no teste
  (só `resolveApiActor` e o repositório são dublês), então uma regressão no guard aparece.

- [x] **Recurso de outro usuário responde 404, não 403** — **PASS** (API, dois usuários comuns reais)
  Entidade criada pelo usuário A e lida/editada/excluída pelo usuário B: `GET`, `PUT` e `DELETE`
  `/entities/:id` respondem **404** com `{"error":{"code":"ENTITY_NOT_FOUND"}}` — a existência do recurso
  alheio não vaza. `GET /entities` de B devolve 0 registros. Id inexistente para o próprio dono também dá
  404, ou seja, os dois casos são indistinguíveis de fora, que é o comportamento desejado.

- [x] **Admin personificando lê, mas não escreve** — **PASS** (e2e 07, API)
  Com a impersonação ativa a tela mostra o aviso `Modo somente leitura`, o botão `Novo` fica desabilitado e
  a lista traz as entidades **do personificado** (vazia para a conta usada, coerente com o escopo por
  `userId`). Sem impersonação, um admin agindo no painel comum recebe 403
  `{"error":{"code":"AUTH_REQUEST_IMPERSONATION_REQUIRED"}}` — a troca de driver não afetou a resolução de
  perfil nem o read-only.

## 5. Falha cedo, sem modo degradado

- [x] **A API não sobe sem as três `FIREBASE_ADMIN_*`** — **PASS** (unit `instrumentation.test.ts`)
  `register()` resolve a instância do Firestore no boot e propaga a exceção, transformando credencial
  ausente em crash de startup com mensagem clara em vez de todo request falhando depois. Coberto também o
  guard de runtime: no `edge` o hook não toca no Firestore. O comportamento real (processo morrendo,
  `/health` inalcançável) foi medido no `/develop`; aqui ficou travado por suíte.

- [x] **`apps/api/env.ts` continua exigindo as três variáveis** — **PASS** (unit
  `serviceAccountEnv.test.ts`)
  Essa exigência tem efeito de **build** (`createEnv` valida eagerly e `@/env` é importado por uma rota),
  então uma regressão aqui quebra deploy, não só runtime. Os testes cobrem: conjunto completo → carrega;
  conjunto vazio → `Invalid environment variables`; cada uma das três ausentes → erro **nomeando** a
  variável; e-mail malformado → erro apontando `FIREBASE_ADMIN_CLIENT_EMAIL`. Provado load-bearing por
  mutação: esvaziar o bloco `server` de `env.ts` derruba o caso do conjunto vazio.

- [x] **Credencial parcial é erro; credencial ausente é tolerada** — **PASS** (unit
  `serviceAccountEnv.test.ts`)
  `packages/auth/keys.ts` é consumido pelos 3 apps, então o conjunto **inteiramente** ausente precisa
  continuar passando (front-ends que só usam a web API key) enquanto o conjunto **pela metade** precisa
  falhar nomeando o que falta — antes ele passava e só explodia no primeiro request que tocava o Firebase.
  Os três ramos estão cobertos, incluindo o fallback de `FIREBASE_ADMIN_PROJECT_ID` para
  `NEXT_PUBLIC_FIREBASE_PROJECT_ID`.

## 6. Rules e índices

- [ ] **Com as rules `deny-all` publicadas, a aplicação funciona de ponta a ponta** — **BLOQUEADO —
  depende de ação humana**
  Sinal de pronto `:111` da spec. As rules **não foram publicadas**: o Firebase CLI não tem conta
  autorizada nesta máquina e o servidor MCP do Firebase lê o mesmo cofre vazio (tentado e recusado no
  `/review`). A metade verificável está PASS — a aplicação funciona inteira **com** o Admin SDK, que é a
  precondição — mas o comportamento **sob** as rules publicadas não pode ser afirmado sem publicá-las.
  Requer `npx -y firebase-tools@latest login` (interativo) e
  `deploy --only firestore:rules,firestore:indexes`.

- [ ] **Leitura direta com as credenciais públicas é negada** — **BLOQUEADO — depende de ação humana**
  Sinal de pronto `:113` da spec. Medido agora, nesta sessão: a leitura REST de `entity` com a
  `NEXT_PUBLIC_FIREBASE_API_KEY` devolve **HTTP 200 com 1223 bytes e 1 documento real**. O furo continua
  aberto e só fecha com o deploy das rules. Não é falha da implementação — o arquivo está escrito em
  `deny-all` e nada mais no código depende disso — mas **não pode ser marcado PASS**.

- [x] **Nenhuma consulta atual exige índice ausente** — **PASS** (API, e2e)
  Todos os fluxos foram percorridos contra o Firestore real (lista, detalhe, criação, edição, exclusão,
  impersonação, lista admin) sem nenhum `FAILED_PRECONDITION`/`requires an index` chegando à UI ou às
  respostas HTTP — todas as chamadas retornaram 200/201/204/401/403/404 conforme esperado. A entrada
  versionada em `firestore.indexes.json` (duas igualdades de `findByReferenceId`) é **preventiva**, como as
  docs passaram a dizer.

## 7. Interface e ambientes

- [x] **Tema claro e escuro** — **PASS** (e2e 01, 04)
  A lista admin usa `Table` (antd), que não é theme-aware por padrão; foi conferida nos dois temas e
  respeita o tema em ambos, incluindo cabeçalho, linhas e o `Switch` da coluna `Ativo`.

- [x] **Responsivo mobile e desktop** — **PASS** (e2e 05, 06)
  A 390×844, nos dois temas, a tabela degrada para rolagem horizontal com a barra visível e a busca e o
  botão `Atualizar` empilham. Sem overflow quebrado nem conteúdo cortado sem rolagem.

- [x] **Os 3 idiomas não são afetados** — **PASS** (estático, i18n 2/2)
  O diff não toca `packages/internationalization` e não adiciona nenhum `error.code`, então não há chave
  nova para traduzir. A paridade foi rodada assim mesmo e segue verde (2 testes). As telas percorridas
  ficaram em pt-br, com os textos vindo do dicionário (`Nenhuma entidade cadastrada.`, `Informe o nome.`,
  `Modo somente leitura`).

- [x] **Modo de produto (`subscription` × `simple`)** — **PASS por análise** (estático)
  A troca de driver acontece **abaixo** dos guards e não lê o modo de produto em lugar nenhum; nenhum
  arquivo do diff referencia `NEXT_PUBLIC_PRODUCT_MODE` nem `getProductMode()`. Não há caminho pelo qual o
  modo altere o comportamento da persistência, então não foi exercitado nos dois modos de propósito.

## 8. Gates de qualidade

- [x] **Suíte verde nos workspaces afetados e no root** — **PASS**
  `pnpm --filter api test` 104/104 (era 72), `pnpm --filter app test` 135/135,
  `pnpm --filter @repo/internationalization test` 2/2 e `pnpm test` (root, que gateia `turbo build`) com as
  3 tarefas verdes. Nenhum teste `skip`, nenhum `only`.

- [x] **Typecheck e lint sem regressão** — **PASS**
  `pnpm --filter api typecheck` limpo. `pnpm check` em 192 erros / 37 warnings, **idêntico** à baseline da
  branch; `npx biome check` nos 5 arquivos de teste tocados/criados dá 0 erro e 0 warning.
