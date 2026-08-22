# Review — `firestore-admin-access`

> A migração está **correta e contract-preserving no que importa**. Os testes novos são load-bearing
> (provado por mutação, não por leitura). O defeito do `update()` foi preservado exatamente como decidido.
> **Dois problemas reais**: (1) existe uma **segunda** mudança de payload não declarada, em 7 endpoints;
> (2) as docs reescritas afirmavam proteção que **não está publicada** — o mesmo defeito do
> `docs/PAYMENTS.md`. O (2) foi corrigido aqui; o (1) é decisão do usuário.

## Branch

| | |
|---|---|
| **Resolvida** | `api/refactor/firestore-admin-access` — **criada** |
| **Base** | `iniciar-specs-individualmente`, que estava em `e45669a` = **exatamente `origin/main`** (`git rev-list --left-right --count origin/main...HEAD` → `0 0`) |
| **Por quê criar** | A branch anterior tinha **zero commits próprios** (criação é lossless: o working tree veio inteiro), estava no tip de `origin/main` — commitar lá produz commits indistinguíveis da mainline — e seu nome descreve **outro** escopo (a triagem de `specs/`), além de não seguir `<project>/<type>/<title>`. Nome conforme a sugestão do plano. |

## Achados

| # | Sev | Onde | Problema | Ação |
|---|-----|------|----------|------|
| 1 | **Alta** | `apps/api/(shared)/mappers/user.mapper.ts:52-60` (`mergeAuthAndFirestore`) | **Segunda mudança de payload, não declarada.** O merge não passa o lado Firestore por `serializeFirestoreData`, então `createdAt`/`updatedAt` saem como `Timestamp` cru. O `Timestamp` do Admin SDK serializa com chaves **diferentes** do client SDK: `{_seconds,_nanoseconds}` vs `{type,seconds,nanoseconds}`. Atinge **7 endpoints** (lista abaixo). Cria também uma **incoerência nova**: `GET /users` devolve ISO e `GET /users/:id` devolve `{_seconds,…}` para o **mesmo campo do mesmo recurso** — antes os dois eram iguais. | **Decisão em aberto** (muda comportamento) |
| 2 | **Alta** | `docs/SETUP.md:117`, `docs/SECURITY.md:26-34` | Docs afirmavam a proteção como vigente (“As rules estão em `deny-all`: nenhum cliente lê o Firestore direto”) quando as rules **não foram publicadas** — a base segue aberta (medido: `200` com dados). O aviso alto-e-claro que existia antes (“achado crítico… prioridade #1”) foi **removido** junto. É o defeito do `docs/PAYMENTS.md` (`specs/BACKLOG.md:169`) se repetindo. | **Corrigido** |
| 3 | Média | `apps/api/env.ts` | As três `FIREBASE_ADMIN_*` viraram server vars obrigatórias, e `@/env` é importado por `app/(routes)/webhooks/payments/route.ts:6`. `createEnv` valida **eagerly** (probado: lança `Invalid environment variables`) e `skipValidation` só cobre `development` → **`pnpm --filter api build` passa a exigir as três**. Antes o build da api rodava sem segredo nenhum (os outros `keys()` se autoprotegem). O handoff diz “o deploy sobe e morre no boot” — na verdade **falha antes, no build**. | **Corrigido** (documentado) |
| 4 | Baixa | `docs/SETUP.md:124`, `firestore.indexes.json` | Doc dizia “índices compostos **exigidos** pelas consultas atuais”. Nenhuma consulta atual exige: são só igualdades, servidas pelos índices de campo único automáticos — o próprio gate empírico do `/develop` mediu **0** `FAILED_PRECONDITION`. A entrada é preventiva. | **Corrigido** (reescrito para “declarados … preventiva”) |
| 5 | Nit | `specs/BACKLOG.md:181`, `specs/firestore-admin-access.md:28,103,121`, `specs/firebase-emulator-seed.md:39,114`, `specs/cursor-pagination.md:100` | Ainda descrevem `dabatase.ts` e o client SDK como presentes. | **Não tocado** — `specs/` é outro escopo; anotado para o `/spec --sync` |
| 6 | Nit | console do browser | 2 erros: `[antd: compatible] antd v5 support React is 16 ~ 18` e um hydration mismatch num `DropdownMenuTrigger` (Radix). | **Pré-existentes** — este diff não tem um único arquivo de front-end |

### Escopo do achado 1

Todo endpoint cuja resposta sai de `getMergedUserByUid` / `getMergedUserByFirestoreDocId`:

`GET /auth/me` · `POST /auth/sign-in` · `POST /auth/sign-in/google` · `POST /auth/sign-up` ·
`GET /users/:id` · `PUT /users/:id` · `POST /users`

Medido nesta sessão, com conta `@example.com`:

```
GET /auth/me       createdAt -> {"_seconds": 1787432470, "_nanoseconds": 602000000}
GET /users         createdAt -> "2026-08-22T16:22:57.960Z"        <- ISO (mudança declarada)
GET /users/:id     createdAt -> {"_seconds": 1787415777, "_nanoseconds": 960000000}
```

Formato dos dois SDKs confirmado direto na lib, não por memória:

```
firebase-admin/firestore  JSON.stringify -> {"_seconds":…,"_nanoseconds":…}   (own keys: _seconds,_nanoseconds; sem toJSON)
firebase/firestore        JSON.stringify -> {"type":"firestore/timestamp/1.0","seconds":…,"nanoseconds":…}
```

**Nenhum consumidor hoje**: `grep createdAt` em `apps/app` só acha o slice `entity` (que passa pelo
`entityMapper` → ISO). A lista admin não tem coluna de data — confirmado na tela. Então **não é regressão
visível**, mas é mudança de contrato não declarada e a nova incoerência list-vs-detail é uma armadilha para
o próximo que consumir o campo. `UserDTO.createdAt: Date` (`packages/sdk/src/types/user/user.ts:11`) já era
mentira em JSON nos dois formatos — pré-existente.

## Correções aplicadas

Só documentação. **Nenhuma linha de código de produção foi alterada por mim** — os dois problemas de
comportamento viraram decisão do usuário.

| Arquivo | O que mudou |
|---------|-------------|
| `docs/SECURITY.md` | Bloco `⛔ ESTADO ATUAL` acima das “Consequências”: as rules **não estão publicadas**, a base segue legível/gravável pela chave pública, e o arquivo em `deny-all` **não protege nada** até o deploy. “Consequências” → “Consequências (uma vez publicadas)”. |
| `docs/SETUP.md` (§Firestore) | Trocado “As rules estão em `deny-all`: nenhum cliente lê o Firestore direto” por “O arquivo … está **escrito** em `deny-all`” + bullet novo `⛔ Escrito no arquivo ≠ publicado`. |
| `docs/SETUP.md` (§Firebase Auth) | Parágrafo novo: as três vars também são exigidas em `pnpm --filter api build`, com o motivo (`env.ts` + rota importadora + validação eager) e o aviso para CI. |
| `docs/SETUP.md` (§Firestore) | “índices compostos **exigidos**” → “**declarados** … a declaração é preventiva — não espere um erro se remover”. |

Nenhum comentário novo em código; nenhuma referência a artefato do fluxo nas edições.

## O que eu verifiquei, e como

### Tradução client → Admin SDK: os testes são load-bearing (mutação, não leitura)

O dublê de `baseRepository.test.ts` **não** é um mock que concorda com a implementação: é um Firestore em
memória genérico (`collection().where().where().get()`, `.doc().get()`, `.add()`, `.doc().update()`) com
`exists` como **propriedade** booleana e a semântica real de campo ausente (documento sem o campo **não**
casa `== null`, via `Symbol("missing")`). Provei por mutação:

| Mutação aplicada temporariamente | Resultado |
|---|---|
| `!snap.exists` → `!snap.exists()` (dialeto do client SDK) | **7 testes falham** — reproduz o número do handoff |
| `findAll()` volta a ignorar o `rowMapper` (reverte o P4) | **1 teste falha** |

Arquivo restaurado byte-a-byte depois (`diff` limpo contra o backup). `firestoreDriver.test.ts` trava a
reintrodução do client SDK e tem asserção de sanidade contra passar vacuamente.

**Limite do dublê** (é o que gera a lacuna de teste 1): `adminTimestamp()` é duck-typed (`{toDate}`), não um
`Timestamp` real. Serve para o `entityMapper` (que faz duck typing em `.toDate()`), mas **não pode** cobrir
`serializeFirestoreData`, que usa `instanceof Timestamp` — exatamente o único comportamento que mudou.
Outra infidelidade menor: o `update()` do dublê aceita `undefined`, o Admin SDK real rejeita (o client SDK
também rejeitava, então não é regressão).

### Defeito do `update()`: preservado, não consertado nem piorado

Confirmado **no dado real**, lendo o documento cru com o Admin SDK depois de um `PUT` pela UI:

```
createdAt -> String "2026-08-22T21:02:16.451Z"     <- gravado como string após o PUT
updatedAt -> Timestamp
stored field count: 11  (nenhum campo extra; o id não vaza para o documento)
```

Read-modify-write intacto, e há teste asseverando (`"rewrites the whole document, so createdAt lands back
as an ISO string"`). Consequência concreta a registrar: com `createdAt` de tipo misto na coleção, um
`orderBy("createdAt")` no Firestore ordenaria por tipo antes de valor — hoje inofensivo porque
`listByUserId` ordena em memória, e é uma pedra no caminho de `specs/cursor-pagination`.

Contraponto interessante: `UserRepository` não tem mapper, então o `update()` dele regrava `createdAt` como
`Timestamp` — o defeito só se manifesta nos repositórios **com** mapper.

### Falha cedo, sem modo degradado

Nenhum fallback silencioso para o client SDK sobrou. `apps/api/(shared)/infra/` tem só `database.ts` (3
linhas, `getFirestoreAdmin()`); `grep dabatase` fora de `specs/`/`docs/features` → 0.

**Raio de impacto de `packages/auth/keys.ts` (pacote → 3 apps): sem quebra.** `keys()` é chamada
lazily dentro de `getFirebaseAdminApp()` (`packages/auth/server.ts:33`). O caminho “conjunto inteiramente
ausente” continua com early-return, então o comportamento só muda para conjunto **parcial** — caso em que
`server.ts:37-46` já lançava no primeiro request. Consumidores: `apps/app` usa `@repo/auth/server`
(`proxy.ts`); `apps/web` usa `@repo/auth/session`, que importa `createSessionCookie` de `./server` — ambos
já precisavam do service account antes. `apps/app/env.ts` e `apps/web/env.ts` **não** estendem `auth()`, só
`apps/api/env.ts`. Typecheck dos 3 apps limpo.

### `.firebaserc` e a contrapartida do Q6

`.firebaserc` versionado com `{"projects":{"default":"next-boilerplate-576d0"}}`. **A nota exigida entrou**:
`docs/SETUP.md` tem a seção “Projeto alvo — `.firebaserc` é versionado”, que diz explicitamente que o fork
**não deve** rodar `firebase use <id>` (reescreve arquivo versionado) e recomenda `--project <id>`, com
`use --add` como segunda opção. `firestore.rules` repete o ponteiro no cabeçalho.

### `firestore.indexes.json`

Schema no formato que o Firebase aceita (`collectionGroup` / `queryScope: COLLECTION` / `fields[].order`),
uma entrada só, para `findByReferenceId`. Ver achado 4 sobre a redação da doc.

## Validação visual

`agent-browser`, comandos **estritamente em sequência**, contra `api` (3002) + `app` (3000) subidos do zero
nesta sessão. Prints em `review/screenshots/`. **Não herdei nada do `/develop`** — refiz o caminho crítico.

Conta comum criada nesta sessão via **sign-up pela UI** (exercita `POST /auth/sign-up` →
`userRepository.create` pelo Admin SDK), porque a senha da `qa-common` não estava gravada em lugar nenhum,
por design.

| # | Print | O que prova |
|---|-------|-------------|
| 01 | `01-entities-empty-dark.png` | estado vazio i18n (“Nenhuma entidade cadastrada.”) |
| 02 | `02-entities-after-create-dark.png` | `POST` → linha nova, `Criado em` = **“22 de ago. de 2026, 18:02”** (data real, sem `1970`/`Invalid Date`) |
| 03 | `03-entity-edit-createdat-dark.png` | `formatDisplayDateTime` na edição: “Criado em: 22 de ago. de 2026, 18:02” |
| 04 | `04-entities-list-light.png` | **light** — tabela antd respeita o tema |
| 05 | `05-entities-list-mobile-light.png` | **mobile 390×844 light** |
| 06 | `06-entities-list-mobile-dark.png` | **mobile dark** |
| 07 | `07-delete-confirm-dark.png` | confirmação de exclusão |
| 08 | `08-admin-users-filtered-dark.png` | lista admin — caminho `findAll()` + `serializeFirestoreData`. Sem coluna de data (ninguém consome `createdAt` de usuário) |
| 09 | `09-admin-users-after-edit-dark.png` | `PUT /users/:id` persistido e refletido na lista |
| 10 | `10-impersonation-readonly-dark.png` | impersonação ativa + aviso “Modo somente leitura” |

**Fluxos de ponta a ponta** (cada mutação confirmada com **reload**, não só pelo estado otimista):
sign-up → lista → criar → editar e salvar → toggle `enabled` → excluir → lista vazia, como comum; e
sign-in admin → lista de usuários → editar `displayName` → verificado na lista → impersonar → entidades do
personificado com read-only.

Além da tela, no dado: o soft delete deixa o documento vivo com `deletedAt` = `Timestamp` e `enabled: false`
(`snap.exists` lido como propriedade = `true`).

**Log da API**: `grep -icE "FAILED_PRECONDITION|requires an index|PERMISSION_DENIED|UNAUTHENTICATED"` → **0**;
`grep -icE "Error|error:"` → **0** em toda a sessão. **Console do browser**: só os 2 erros pré-existentes do
achado 6.

**Higiene de PII**: a lista admin foi filtrada por `qa-` **antes** de qualquer print — só `@example.com`
aparece. Nenhum payload bruto de `/users`, nenhum nome/e-mail de pessoa real neste documento ou nos prints.
A opção de impersonação foi escolhida por nome `QA …` sem printar a lista aberta.

## Lacunas de teste (para o `/test`)

Mantidas as 5 do handoff — nenhuma foi fechada aqui — mais duas que este review levantou:

1. `serializeFirestoreData` sem teste unitário. É **o** mapper cujo comportamento mudou, e o dublê do
   `baseRepository.test.ts` **não consegue** cobri-lo (duck type ≠ `instanceof Timestamp`). Precisa de um
   `Timestamp` real do `firebase-admin/firestore`.
2. `instrumentation.ts` sem teste (`register()` com env vazia → `rejects.toThrow`; atenção ao guard
   `NEXT_RUNTIME`).
3. `packages/auth/keys.ts` sem teste para o refine novo (vazio → tolera; parcial → erro nomeando as vars;
   completo → ok). Três ramos, zero cobertura.
4. `userRepository.list()` com `findAll` real (o teste atual espiona `findAll`); o dublê já existe e serve.
5. `update()`/`delete()` de `UserRepository` (caminho **sem** mapper) sem teste — é justamente onde o
   `createdAt` volta como `Timestamp` em vez de string.
6. **Novo:** nenhum teste fixa o formato de `createdAt` nas respostas que passam por
   `mergeAuthAndFirestore` (`/auth/me`, `/users/:id`, …). É o achado 1 passando sem rede.
7. **Novo:** nada garante que `apps/api/env.ts` continue exigindo as três vars — e essa exigência tem
   efeito de build (achado 3).

## Decisões em aberto

1. **Serializar o lado Firestore em `mergeAuthAndFirestore` (achado 1)?**
   **Recomendação: sim, agora, em commit próprio.** É uma linha
   (`serializeFirestoreData(firestoreData)` antes do spread), elimina o vazamento de `{_seconds,…}` em 7
   endpoints e alinha `GET /users/:id` com `GET /users`, que já devolve ISO. Sem consumidor hoje, então o
   risco de fazer é mínimo — e o risco de **não** fazer é deixar duas formas do mesmo campo no contrato.
   Não fiz porque muda payload. *Alternativa*: aceitar e registrar no `BACKLOG.md` como deriva conhecida —
   mais barato agora, mais caro quando alguém consumir o campo.
2. **`pnpm --filter api build` exigir as três `FIREBASE_ADMIN_*` (achado 3) é o desejado?**
   **Recomendação: manter e seguir documentado** (foi o que fiz) — é coerente com “falha cedo, sem modo
   degradado”. Mas se `specs/ci-pipeline` for construir a api sem segredos, a saída é um
   `skipValidation` que também cubra `!!process.env.CI`. Decisão de produto, não de review.
3. **Commit de `specs/` nesta branch.** Os 7 arquivos de `specs/` são de outro escopo (auditoria anterior) e
   agora estão na branch desta feature. **Recomendação: commit próprio, escopo `specs`, na mesma branch**
   (é o que o plano de commits abaixo faz) — separá-los em outra branch exigiria stash e não paga o custo.

## Gates

| Gate | Resultado |
|---|---|
| `pnpm --filter api typecheck` | **limpo** |
| `pnpm --filter app typecheck` | **limpo** |
| `pnpm --filter web typecheck` | **limpo** |
| `pnpm --filter api test` | **10 arquivos / 72 testes** ok |
| `pnpm --filter @repo/internationalization test` (paridade 3 idiomas) | **2 ok** — diff não toca i18n |
| `pnpm check` | **192 erros / 37 warnings** (baseline 197/39) — inalterado pelas minhas edições |
| `npx biome check` nos 9 arquivos de código tocados | **0 erros, 0 warnings** |

O único warning na árvore desta tarefa é `userRepositoryList.test.ts:55` (`profiles as any`), **pré-existente**
— confirmado em `git show HEAD:…`.

## Pendências que seguem abertas

- **P7 (publicar rules + índices) e o `deploy --dry-run`**: Firebase CLI sem conta autorizada,
  `firebase login` é interativo. **Fora do escopo deste review** — não tentei publicar nem logar. Comandos
  prontos no handoff §6. Os sinais de pronto `:111` e `:113` da spec continuam abertos, e agora isso está
  dito com honestidade nas docs (achado 2).
- **Dados de teste no projeto de dev** (`next-boilerplate-576d0`), a remover ao fechar o pipeline: as 2
  entidades de snapshot e as contas `qa-admin` / `qa-common` do `/develop`, mais o que eu criei —
  `qa-review-common@example.com` (`QA Review Renamed`) e 1 entidade soft-deleted
  (`Review Admin SDK Entity (edited)`). A senha do `qa-admin` foi **redefinida** por
  `create-dev-admin` nesta sessão e não está gravada em arquivo nenhum.

## Plano de commits proposto

Ordem de dependência (`packages` → `apps/api` → raiz → docs). Nenhum commit feito — o gate é do `/review`.

| # | Mensagem | Arquivos |
|---|----------|----------|
| 1 | `fix(auth): reject a partial Firebase Admin credential set` | `packages/auth/keys.ts` |
| 2 | `chore(api): promote firebase-admin to a runtime dependency` | `apps/api/package.json` · `pnpm-lock.yaml` |
| 3 | `refactor(api): read and write Firestore through the Admin SDK` | `apps/api/(shared)/infra/database.ts` (novo) · `apps/api/(shared)/infra/dabatase.ts` (deletado) · `apps/api/(shared)/repositories/base.repository.ts` · `apps/api/(shared)/repositories/entity.repository.ts` · `apps/api/(shared)/repositories/user.repository.ts` · `apps/api/__tests__/baseRepository.test.ts` (novo) · `apps/api/__tests__/firestoreDriver.test.ts` (novo) · `apps/api/__tests__/userRepositoryList.test.ts` |
| 4 | `fix(api): apply the row mapper in findAll` | `apps/api/(shared)/repositories/base.repository.ts` (hunk do `findAll`) — **ver nota** |
| 5 | `feat(api): require Firebase service-account credentials at startup` | `apps/api/env.ts` · `apps/api/instrumentation.ts` · `apps/api/.env.example` |
| 6 | `chore: version the Firestore index and make the deny-all rules publishable` | `firestore.indexes.json` · `firestore.rules` · `.firebaserc` |
| 7 | `docs: record the Admin SDK access model and the unpublished-rules state` | `docs/SECURITY.md` · `docs/SETUP.md` |
| 8 | `docs(specs): sync the backlog audit` | `specs/BACKLOG.md` · `specs/api-hardening.md` · `specs/audit-log.md` · `specs/ci-pipeline.md` · `specs/firebase-emulator-seed.md` · `specs/firestore-admin-access.md` · `specs/teams-organizations.md` |
| 9 | `docs(features): firestore-admin-access` | `docs/features/firestore-admin-access/**` |

**Nota sobre os commits 3 e 4** (o plano os separava): ambos tocam `base.repository.ts`, e o P4 é um hunk
dentro do `findAll()` que o P3 **reescreveu por inteiro**. Separar exige `git add -p` e produz um commit 3
que não compila conceitualmente sozinho. **Recomendação: fundir 3 e 4** em
`refactor(api): read and write Firestore through the Admin SDK`, mencionando no corpo que o `findAll()`
passou a aplicar o `rowMapper`. Se o usuário quiser a separação do Q2, é `git add -p` no hunk do `findAll`.

**PR sugerida**: `refactor(api): read and write Firestore through the Admin SDK`.

Título alternativo se o commit 8 ficar junto: prefira **duas PRs** — esta e uma de `specs`.

Depois do último commit aprovado, **perguntar** ao usuário antes de
`git push -u origin api/refactor/firestore-admin-access`.

**Antes do commit 9**: a pasta `docs/features/firestore-admin-access/` foi conferida — nenhum segredo nos
artefatos, nenhuma PII nos prints (filtro `qa-` aplicado), nenhuma senha gravada.
