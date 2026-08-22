# Handoff — `firestore-admin-access`

> A `apps/api` deixou de falar com o Firestore pelo **client SDK não autenticado** e passou a usar
> `getFirestoreAdmin()` (identidade de serviço). **Contrato HTTP inalterado** — nenhum arquivo de
> `packages/sdk` e nenhum de `apps/app` entra no diff.

Executado: **P0–P6 e P8**. **P7 (publicar rules + índices) NÃO foi executado** — bloqueio de ambiente
documentado abaixo.

---

## 1. Passo → arquivos

| Passo | Escopo | Arquivos |
|-------|--------|----------|
| **P0** | Baseline + snapshot antes | nenhum (números em §5, payloads em §4) |
| **P1** | credencial parcial vira erro de env | `packages/auth/keys.ts` |
| **P2** | `firebase-admin` → `dependencies` | `apps/api/package.json`, `pnpm-lock.yaml` |
| **P3** | **a migração** | `apps/api/(shared)/infra/database.ts` **(novo)** · `apps/api/(shared)/infra/dabatase.ts` **(deletado)** · `apps/api/(shared)/repositories/base.repository.ts` · `.../entity.repository.ts` · `.../user.repository.ts` · `apps/api/__tests__/userRepositoryList.test.ts` (mock apontando para o caminho novo) · `apps/api/package.json` (`firebase` removido) · `apps/api/__tests__/baseRepository.test.ts` **(novo)** · `apps/api/__tests__/firestoreDriver.test.ts` **(novo)** |
| **P4** | `findAll()` aplica o `rowMapper` | `apps/api/(shared)/repositories/base.repository.ts` · `apps/api/__tests__/baseRepository.test.ts` |
| **P5** | falha cedo, sem modo degradado | `apps/api/env.ts` · `apps/api/instrumentation.ts` · `apps/api/.env.example` |
| **P6** | índice + rules publicáveis + projeto alvo | `firestore.indexes.json` · `firestore.rules` · `.firebaserc` **(novo, versionado)** |
| **P7** | **publicar** rules + índices | ⛔ **não executado** — ver §6 |
| **P8** | documentação | `docs/SECURITY.md` · `docs/SETUP.md` |

**Não tocados** (e isso é requisito, não coincidência): `packages/sdk/**`, `apps/app/**`, `apps/web/**`,
`packages/internationalization/**`, `firebase.json`, `app/(routes)/**`, `app/(guards)/**`,
`(shared)/validation/**`, `(shared)/mappers/**`.

`specs/**` tem 7 arquivos modificados **no working tree por uma auditoria anterior a esta tarefa** — não
foram tocados aqui.

---

## 2. Contrato

**Nenhuma mudança.** Zero DTO, zero `Create/UpdateRequest`, zero action, zero registro no `Client`.
Nenhum `error.code` novo → **zero chave de i18n**, nada em `apiErrors`, paridade dos 3 idiomas intacta
(teste rodado, §5).

O que mudou de tipo é interno: `BaseRepository` recebe `Firestore` do **`firebase-admin/firestore`** em vez
de `firebase/firestore`. Assinatura do construtor `(db, table, rowMapper?)` intacta, então
`super(db, "entity", entityMapper)` e `super(db, "user")` não mudaram.

**Raio de impacto do rename `dabatase.ts` → `database.ts`**: 3 importadores, todos ajustados —
`user.repository.ts`, `entity.repository.ts` e o `vi.mock` de `__tests__/userRepositoryList.test.ts`.
`grep -rn dabatase` no repo (fora de `specs/` e `docs/features/`) → **0 ocorrências**.

---

## 3. Desvios em relação ao plano

Nenhum desvio de escopo. Três decisões de implementação que o plano deixava abertas em nível de detalhe:

1. **Gate do P6 sem `--dry-run`** (que exige auth). Substituído por validação local com o **próprio
   validador do firebase-tools**: `FirestoreApi().validateSpec()` aprova o `firestore.indexes.json`, e
   verifiquei que ele rejeita entrada malformada (`Must contain "queryScope"`) — ou seja, o validador está
   de fato exercitando o schema. Além disso, o **corpo aplicável de `firestore.rules` é byte-idêntico**: o
   diff só toca linhas de comentário (verificado filtrando o `git diff`), então não há risco de sintaxe.
2. **Suppression morta removida** em `base.repository.ts`: o `biome-ignore-all lint/nursery/noShadow`
   existia por causa do import `doc` do client SDK, que deixou de existir. O `noParameterProperties`
   permanece, agora com explicação real em vez do placeholder `<explanation>` (que o Biome sinalizava).
   Efeito colateral positivo: −2 warnings no `pnpm check`.
3. **`.env.example`**: o bloco `FIREBASE_ADMIN_*` foi **movido para o topo do `# Server`** (estava solto no
   fim do arquivo, depois do bloco `# Client`) com o comentário de que a API não inicia sem ele. O resto do
   arquivo ficou intocado, conforme Q5.

---

## 4. Diff de payload (§7.3) — o "nada mudou" medido

Capturado antes de qualquer edição e repetido depois, com conta `@example.com`.
**Divergência: exatamente uma, a esperada.**

### `GET /users` (admin) — a única mudança observável

| | `createdAt` / `updatedAt` |
|---|---|
| **antes** | `{"seconds": 178…, "nanoseconds": …}` (objeto) |
| **depois** | `"2026-08-20T12:39:44.984Z"` (string ISO) |

Causa (§2.3b do plano): `user.mapper.ts:31` compara com `instanceof Timestamp` importado de
`firebase-admin/firestore`, enquanto os dados chegavam do **client SDK** — o `instanceof` era **sempre
falso**. Com o Admin SDK ele casa e o campo passa a ser serializado. **A migração conserta um defeito**,
não introduz um.

Tudo o mais idêntico: mesmo conjunto de chaves (17), mesma contagem de registros (10 comuns / 4 admins),
`deletedAt` segue `null`. **Nenhuma tela consome o campo** — confirmado no browser: a lista admin não tem
coluna de data (§7, screenshot 13).

### `GET /entities` e o CRUD — byte-idênticos

| Chamada | Antes | Depois |
|---|---|---|
| `GET /entities` (2 docs, ordem `createdAt` desc) | ISO em ambos | **igual, ordem igual** |
| `POST /entities` | `201` + DTO com ISO | igual |
| `PUT /entities/{id}` | `200` + `{"data":{"id":…}}` | igual |
| `GET /entities/{id}` | `200` + DTO | igual |
| `DELETE /entities/{id}` | `204` | igual |
| `GET /entities` pós-delete | id excluído ausente | igual |
| `GET /entities/{id}` pós-delete | `404 ENTITY_NOT_FOUND` | igual |

O snapshot incluiu de propósito **os dois formatos de dado que convivem em produção** (§2.3c):
- `Snapshot Untouched` — nunca editada, `createdAt` gravado como **`Timestamp`**;
- `Snapshot Mixed` — sofreu um `PUT` antes da migração, `createdAt` gravado como **string ISO**.

Ambas renderizam data correta depois da migração, na API e na UI. Essa é a prova concreta de que o dado
misto sobrevive à troca de driver.

### Furo de segurança, medido

Leitura direta do Firestore via REST com a chave pública do projeto, **antes** de publicar as rules:

```
HTTP 200 — 1223 bytes de dados reais
```

É a vulnerabilidade quantificada. O `403` esperado só chega com o P7 (§6). Corpo da resposta não foi
salvo em artefato nenhum (continha dados reais).

---

## 5. Validação — comandos e números

| Gate | Baseline (antes) | Depois |
|------|------------------|--------|
| `pnpm --filter api typecheck` | limpo | **limpo** |
| `pnpm --filter app typecheck` | limpo | **limpo** |
| `pnpm --filter web typecheck` | limpo | **limpo** |
| `pnpm --filter api test` | 8 arquivos / 56 testes | **10 arquivos / 72 testes** |
| `pnpm test` (gateia o build) | 3 tarefas ok (1+21+8 arquivos) | **3 tarefas ok (1+21+10)** |
| `pnpm --filter @repo/internationalization test` (paridade) | 2 testes ok | **2 testes ok** |
| `pnpm check` | **197 erros / 39 warnings** | **192 erros / 37 warnings** |

`pnpm check` **melhorou** (−5 erros, −2 warnings) e nenhum dos arquivos desta tarefa aparece na lista:
rodei `npx biome check` só nos 12 arquivos tocados → **0 erros, 0 warnings**. A redução vem da deleção do
`dabatase.ts` (config hardcoded) e da limpeza do `base.repository.ts`. O único hit da árvore da api é
`(shared)/lib/parse-request-json.ts`, **não tocado** e pré-existente.

### Testes novos (fecham a cobertura zero do §7.1)

**`apps/api/__tests__/baseRepository.test.ts`** (12 testes) — dublê em memória da superfície do Admin SDK
(`collection().where().where().get()`, `.doc().get()`, `.add()`, `.doc().update()`), com `exists` como
**propriedade booleana** e semântica fiel do Firestore (documento sem o campo **não** casa `== null`).
Cobre T1–T9: `findById` inexistente/soft-deleted; `createdAt` como Timestamp-shape → ISO; `createdAt` já
ISO → intacto; `findAll` filtrando `deletedAt` **e** aplicando o mapper (+ fallback sem mapper);
`create` estampando timestamps; `update` devolvendo id; soft delete não removendo; `listByUserId`
filtrando/ordenando em memória; `findByReferenceId` emitindo **as duas igualdades** e devolvendo `null`
em vazio.

> **O dublê foi provado, não presumido.** Reverti temporariamente `snap.exists` para `snap.exists()` e
> **7 testes falharam** com `TypeError: snap.exists is not a function`. A armadilha central do §4.3 está
> de fato coberta — não é teste decorativo.

**`apps/api/__tests__/firestoreDriver.test.ts`** (2 testes) — varre `(shared)/**` e `app/**` e falha se
algum arquivo importar `firebase/firestore` ou `firebase/app`. Trava a migração contra reintrodução. Tem
uma asserção de sanidade (`>10` arquivos varridos) para não passar vacuamente se o scanner quebrar.

**Limite honesto**: o dublê codifica o contrato do Admin SDK conforme documentado; não prova o driver
real. Quem prova é §4 (payload real) + §7 (browser). As duas camadas foram executadas.

### Gate empírico do índice (§6.2)

Todos os fluxos percorridos contra o Firestore real, com log da API varrido no fim:
`grep -icE "FAILED_PRECONDITION|requires an index|PERMISSION_DENIED"` → **0**. Nenhum índice faltando
para as consultas atuais. Nenhum erro de qualquer tipo no log da API durante toda a sessão.

### Gate do P5, provado nas duas direções

| Cenário | Resultado |
|---|---|
| `.env` sem as três `FIREBASE_ADMIN_*` (mas com `NEXT_PUBLIC_FIREBASE_PROJECT_ID`) | **API morre no boot**, `Exit status 1`, `/health` inalcançável. Mensagem: erro de env nomeando `FIREBASE_ADMIN_CLIENT_EMAIL` e `FIREBASE_ADMIN_PRIVATE_KEY` como obrigatórias |
| `.env` sem nenhuma var Firebase | **API morre no boot**: `An error occurred while loading instrumentation hook: Firebase Admin credentials are not configured. Please set FIREBASE_ADMIN_* environment variables.` |
| `.env` completo | **sobe** (`Ready in 1027ms`), `/health` → `200` |

O `.env` real foi restaurado ao fim. Note que o primeiro cenário é o caso de borda do §5.3: como
`FIREBASE_ADMIN_PROJECT_ID` cai para `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, o conjunto deixa de ser vazio e o
refine novo dispara — produzindo uma mensagem **mais** precisa que a genérica (nomeia as vars que faltam).
Documentado em `docs/SETUP.md`.

---

## 6. ⛔ Não feito — P7 e o `--dry-run` (bloqueio de ambiente)

O Firebase CLI **não tem conta autorizada** nesta máquina:

```
$ npx -y firebase-tools@latest login:list
⚠  No authorized accounts, run "firebase login"
```

`firebase login` é interativo, então **não** publiquei nada e **não** rodei `deploy --dry-run`. Duas
pendências, ambas do usuário:

```bash
# 1. autenticar (uma vez por máquina) — interativo
npx -y firebase-tools@latest login

# 2. validar a sintaxe sem publicar  ← o gate do P6 que ficou pendente
npx -y firebase-tools@latest deploy --only firestore:rules --dry-run

# 3. publicar rules + índices  ← o P7
npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes

# 4. provar que o furo fechou (esperado 403; hoje devolve 200 com dados)
curl -s -o /dev/null -w '%{http_code}\n' \
  "https://firestore.googleapis.com/v1/projects/next-boilerplate-576d0/databases/(default)/documents/entity?key=<NEXT_PUBLIC_FIREBASE_API_KEY>"
```

O projeto alvo vem do `.firebaserc` versionado, então os comandos vão para
`next-boilerplate-576d0` sem `--project`.

⛔ **A ordem é inegociável e já está satisfeita**: a API **já está rodando no Admin SDK**, então publicar
agora é seguro. E o **rollback correto é reverter o código da API primeiro** — republicar rules permissivas
sem reverter reexpõe a base inteira e não é rollback.

**Consequência do bloqueio para os sinais de pronto da spec**: `:111` (rules publicadas) e `:113` (leitura
direta negada) **continuam abertos**. Todo o resto está entregue e medido.

---

## 7. Validação visual (regra de ouro 11 / §7.4)

Feita com `agent-browser`, **comandos estritamente em sequência**. Screenshots em
`docs/features/firestore-admin-access/develop/screenshots/`.

| # | Arquivo | O que prova |
|---|---------|-------------|
| 01 | `01-entities-list-dark.png` | lista com `Criado em` = **data real** nos **dois** formatos de armazenamento (Timestamp e ISO). Sem `1970`, sem `Invalid Date` |
| 02 | `02-create-form-invalid-dark.png` | submit inválido: mensagem de campo obrigatório traduzida |
| 03 | `03-entities-list-after-create-dark.png` | `POST` → nova linha no topo, `createdAt` correto, ordenação desc preservada |
| 04 | `04-edit-form-createdat-dark.png` | `formatDisplayDateTime` na tela de edição: `Criado em: 22 de ago. de 2026, 13:39` |
| 05 | `05-toggle-enabled-dark.png` | toggle `enabled` otimista |
| 06 | `06-entities-list-light.png` | **light**: o `Table` (antd) respeita o tema |
| 07 | `07-entities-list-mobile-light.png` | **mobile 390×844** light |
| 08 | `08-entities-list-mobile-dark.png` | **mobile** dark |
| 09 | `09-entities-empty-state-dark.png` | estado vazio: "Nenhuma entidade cadastrada." (i18n) |
| 10 | `10-delete-confirm-dark.png` | confirmação de exclusão |
| 11 | `11-after-delete-dark.png` | `DELETE` → linha some da lista |
| 12 | `12-entities-load-error-dark.png` | erro de carregamento (500 stubado): degrada sem crash |
| 13 | `13-admin-users-list-dark.png` | painel admin lista usuários — **caminho do `findAll()` + `serializeFirestoreData`**, ou seja o código do §4. Sem coluna de data, confirmando que ninguém consome `createdAt` |
| 14 | `14-admin-user-edit-dark.png` | edição de usuário (tipo / `displayName`) |
| 15 | `15-impersonation-entities-readonly-dark.png` | admin personificando um comum: entidades do personificado carregam **e** o aviso somente-leitura aparece |

**Fluxos percorridos de ponta a ponta** (não apenas "compilou"):
`sign-in` → lista → criar → **editar e salvar** → toggle → excluir → lista, como usuário comum; e
`sign-in` admin → lista de usuários → editar e salvar → **verificado que persistiu na lista** →
impersonação → sair da impersonação. O toggle e a edição foram confirmados com **reload** — não só pelo
estado otimista.

**Impersonação também verificada no nível da API** (é o caminho que passa por `findByReferenceId`, a
consulta C4 que sustenta o índice do §6.2): `GET` impersonado → `200`; `POST` impersonado → `403`
`{"error":{"code":"AUTH_REQUEST_IMPERSONATION_READ_ONLY"}}`. A troca de driver não afetou a resolução de
perfil nem o read-only entregue em `e45669a`.

**Console do browser**: único erro é o aviso pré-existente `[antd: compatible] antd v5 support React is
16 ~ 18` — não relacionado a esta tarefa.

**Higiene de PII**: a lista admin foi **filtrada por `qa-`** antes de qualquer screenshot, então só as duas
contas `@example.com` aparecem. Nenhum payload bruto de `/users` e nenhum nome/e-mail de pessoa real neste
documento ou nos prints.

---

## 8. Achados e pendências

### Achados para o `specs/BACKLOG.md` (via `/spec --sync`, não agora)

1. **`update()` reescreve o documento inteiro** (`base.repository.ts:102-117`). **Defeito preservado de
   propósito** (Q4): lê via `findById` — que com mapper devolve **string ISO** — e reescreve tudo, então
   depois do primeiro `PUT` o `createdAt` fica gravado como string. Também reescreve campos que o cliente
   não enviou, apesar do `omitUndefined` da rota. Há teste **asseverando** esse comportamento
   (`"rewrites the whole document, so createdAt lands back as an ISO string"`) — quem for consertar precisa
   atualizar esse teste conscientemente, que é exatamente o ponto.
2. **`docs/SETUP.md:5`** afirma que o `.env.example` foi limpo das heranças do next-forge — **não foi**.
   Registrado agora como pendência explícita em "Pendências de higiene" no próprio `SETUP.md`.
3. O `createdAt` de `GET /users` (§4) **nasceu e morreu neste ciclo** — a migração consertou. Não precisa
   virar achado.
4. **`BaseRepository` continua sem paginação, sem `orderBy` e sem filtro composto.** A migração removeu o
   *impedimento técnico* (o Admin SDK suporta tudo isso) mas não usou nada disso, de propósito (§1.2):
   `listByUserId` segue lendo **todos** os documentos de um `userId` e ordenando em memória. Pertence a
   `specs/cursor-pagination`.

### Pendências

- **P7 + `--dry-run`** (§6) — bloqueio de ambiente, comandos prontos acima.
- **Env em produção (Vercel), projeto `api`**: as três `FIREBASE_ADMIN_*`, com `\n` escapados no private
  key. **Sem elas o deploy sobe e morre no boot** — é o comportamento desejado, mas tem de entrar no
  checklist de release, porque antes desta tarefa a API subia sem elas.
- **Dados de teste no projeto Firebase de dev** (`next-boilerplate-576d0`): 2 entidades
  (`Snapshot Untouched`, `Snapshot Mixed`) e 2 contas `@example.com` (`qa-admin`, `qa-common`, esta última
  renomeada para `QA Common Renamed` durante a validação). Deixei de propósito, para o `/review` e o
  `/test` poderem redirigir os fluxos. **Remover ao fechar o pipeline.** As senhas são descartáveis, foram
  geradas na hora e **não estão gravadas em arquivo nenhum**.

### Decisões em aberto

Nenhuma. As 6 perguntas do plano §10 estavam decididas e nenhuma precisou ser reaberta. Nada na
implementação levantou pergunta nova.

---

## 9. O que o `/review` precisa saber

- **Branch**: dono é o `revisor-codigo`. Sugestão do plano §8.1: `api/refactor/firestore-admin-access`.
  Branch atual **`iniciar-specs-individualmente`** (não `tacoma`, como o plano supunha) — não é protegida,
  mas não segue o padrão `<project>/<type>/<title>`. **Nada foi commitado.**
- **`specs/**` tem 7 arquivos modificados que NÃO são desta tarefa** (auditoria anterior no working tree).
  Não incluir nos commits desta feature.
- **Ordem de commits** conforme plano §8.1 (dependência primeiro, um por app/pacote):
  1. `fix(auth): reject a partial Firebase Admin credential set` — P1
  2. `chore(api): promote firebase-admin to a runtime dependency` — P2 (+ `pnpm-lock.yaml`)
  3. `refactor(api): read and write Firestore through the Admin SDK` — P3 (inclui os 2 testes novos)
  4. `fix(api): apply the row mapper in findAll` — P4
  5. `feat(api): require Firebase service-account credentials at startup` — P5
  6. `chore: version the Firestore index and make the deny-all rules publishable` — P6 (raiz, sem escopo)
  7. `docs: record the Admin SDK access model and the rules publish path` — P8
  8. `docs(features): firestore-admin-access` — artefatos, por último
- **Invariante a cobrar**: o diff **não pode** conter arquivo de `packages/sdk` nem de `apps/app`. Hoje não
  contém — se contiver, a migração deixou de ser contract-preserving.
- **A mudança de payload do §4 é intencional e conhecida.** Não é regressão.

## 10. Lacunas de teste para o `/test`

1. **`serializeFirestoreData` não tem teste unitário** — é o mapper cujo comportamento **mudou** (§4). Um
   teste com `Timestamp` real do `firebase-admin/firestore` fixaria o formato ISO e impediria que uma
   futura troca de driver o quebre de novo em silêncio.
2. **`instrumentation.ts` não tem teste.** O comportamento foi provado empiricamente (§5), não por suíte.
   Um teste que chame `register()` com env vazia e espere `rejects.toThrow` é barato — atenção só ao
   guard `NEXT_RUNTIME`.
3. **`packages/auth/keys.ts` não tem teste** para o refine novo: conjunto vazio → tolerado; parcial →
   erro; completo → ok. É lógica de configuração com três ramos e zero cobertura.
4. **`userRepository.list()` com `findAll` real**: o teste existente espiona `findAll`, então não exercita
   a query nem o merge sobre dado vindo do driver. O dublê de `baseRepository.test.ts` já existe e pode
   ser reaproveitado.
5. **`update()`/`delete()` de `UserRepository`** (sem mapper) não têm teste — só o caminho com mapper foi
   coberto.
