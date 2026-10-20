# Revisão: borda da API (413 com `connection: close` e id inválido nas rotas `[id]`)

Rodada autônoma do `/cycle`, passo 4. Escopo: o diff de `apps/api` (3 arquivos de código, 3 de teste), as duas
frases de documentação (`docs/SECURITY.md`, `AGENTS.md`) e, só para o plano de commits, a auditoria do backlog que
está no mesmo working tree. Base: `main` em `3a118c6`.

## Branch

- Atual: `guilhermebittelbrunn/cycle-command-v6`. Não é protegida, não tem upstream e não tem commit além de
  `origin/main` (`git log origin/main..HEAD` vazio).
- Regex do padrão: **inválida** (`BRANCH INVALIDA: guilhermebittelbrunn/cycle-command-v6`). O prefixo é o usuário do
  Conductor, não um `project`, e não há `type`.
- Nome proposto: **`api/fix/edge-413-close-and-route-id`**. Regex: `branch OK`. `project` é `api` porque o código do
  diff está todo em `apps/api`; `type` é `fix` porque as duas metades corrigem defeito (socket preso e 500 no lugar
  de 404).
- Não criei nem renomeei a branch. O workspace do Conductor não permite renomear sem pedido do usuário, e o `/cycle`
  não muda branch. O primeiro passo do plano de commits é `git checkout -b api/fix/edge-413-close-and-route-id`,
  a executar só com o "sim" do usuário. Como não há upstream nem commit próprio, o caminho seria o `git branch -m`;
  a branch nova a partir da atual chega ao mesmo resultado sem tocar no nome que o Conductor controla.

## Revisão: `apps/api` + docs

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `apps/api/(shared)/lib/pagination.ts:13-17`: o JSDoc de `isUsableDocumentId` dizia que o *driver* lança e que o
  risco era "um cursor forjado". Com a guarda em `findById`, a função também protege id de rota, e o handoff mediu
  que o id reservado (`__x__`) é recusado pelo servidor (`INVALID_ARGUMENT`), não pelo driver. **Corrigido**: o texto
  agora diz "Firestore throws on an invalid path or a reserved id" e "a forged cursor or route id".
- `apps/api/app/(routes)/users/[id]/route.ts:97-99`: com `findById` devolvendo `null`, o `GET` passa a chamar
  `getMergedUserByUid(id)` para ids que antes davam 500. Para id lixo, `getAuthInstance().getUser` rejeita e o `catch`
  de `user-merge.ts:20-22` devolve `null`, então a resposta é 404. Se existir no Auth um uid com `/` (o Firebase
  aceita, como lembra `session-key.ts:20`), o admin passa a ver esse usuário, e `findOrCreateProfile`
  (`user-merge.ts:55-71`) cria o perfil que faltar. É o mesmo comportamento de qualquer uid sem perfil hoje; não muda
  nada aqui. Fica registrado para o `/test` contar documentos depois do `GET`.
- `apps/api/app/(routes)/notifications/[id]/read/route.ts:19-22`: a checagem própria ficou redundante com a de
  `findById`. Mantida pela D4 do plano (evita a chamada ao repositório e tem 5 testes). Sem ação.

### ✅ OK

- `parse-request-json.ts:11-22`: `refuse` ganhou `headers` opcional e `refuseTooLarge()` é usado nas duas recusas 413
  (`:57` e `:66`). O 400 continua sem o header (`:70`). O comentário de `:19-20` explica uma restrição externa (o Node
  segura o socket até o `requestTimeout`) sem citar o fluxo, dentro da exceção 1 de `code-comments.md`.
- `base.repository.ts:145-147`: guarda antes de `collection().doc()`, sem comentário (a razão está no JSDoc da
  função importada). `pagination.ts` não importa nada, então não há ciclo.
- `pagination.ts:21`: `Buffer.byteLength(id, "utf8")` no lugar de `id.length`. O runtime é Node em toda a `apps/api`:
  nenhuma rota declara `export const runtime` (`rg "runtime\s*="` vazio), `pagination.ts` já usava `Buffer` em
  `encodeCursor`/`decodeCursor` (`:30`, `:38`), o repositório importa `firebase-admin` (só Node) e `proxy.ts` não
  importa nenhum dos dois arquivos.
- Chamadores de `findById` (raio de impacto abaixo): todos tratam `null`. Nenhum deles monta id que a guarda recuse
  por engano.
- Testes: `baseRepository.test.ts` espiona `fakeDb.collection`, o mesmo objeto passado ao `BaseRepository`
  (`:328`), e restaura o espião no `finally`. O caso de controle de 1 500 bytes garante que a guarda não engole id
  válido. `paginationQuery.test.ts` cobre os dois lados do limite em ASCII e em `é`. `parseRequestJson.test.ts` cobre
  o header nas duas camadas e a ausência dele no 400.
- `AGENTS.md:46` e `docs/SECURITY.md:176`: descrevem o comportamento atual. Os números do `SECURITY.md` (20 envios,
  2 s, dez tentativas do `fetch`) batem com as tabelas do handoff; a medição em si vai para a lista abaixo.
- Sem `error.code` novo, sem i18n, sem SDK, sem env. Nenhum comentário cita artefato do fluxo.

### 👁 Verificar no `/test`

Afirmações do handoff que a leitura não confirma. A tabela "A verificar no `/test`" do handoff vem com veredito em
cada linha.

| # | afirmação | origem | veredito | repro sugerido |
|---|-----------|--------|----------|----------------|
| 1 | 413 fecha a conexão: 0 ESTABLISHED depois da rajada, nas duas camadas | handoff, tabela do 413; §8 itens 1 e 2 | continua aberto, é a afirmação que sustenta a metade 1 | `next start` + 50 × 5 MiB em `chunked` e 50 com `content-length` (com e sem `-H 'Expect:'`) contra `POST /auth/sign-in`; `lsof -nP -a -p <pid> -iTCP -sTCP:ESTABLISHED \| grep -c 3002` aos 2 s e aos 60 s |
| 2 | `fetch` do Node recebe 413, sem `ECONNRESET` (R1) | handoff, R1; §8 item 3 | continua aberto | script com `fetch` do Node 22, 5 MiB, `content-length` e `ReadableStream` com `duplex: "half"`, mais amostras; se possível, com latência simulada (`tc`/`dnctl`) ou fora do loopback. O resultado decide a frase do `SECURITY.md:176` |
| 3 | zero `unhandledRejection`/`AbortError` durante a rajada | handoff; §8 item 4 | continua aberto | `grep -c -E 'unhandledRejection\|AbortError'` no log do `next start` depois da rajada de 50 |
| 4 | 400 de JSON inválido mantém `keep-alive` | handoff | fechado por leitura (`parse-request-json.ts:70` não passa header) e pelo teste do helper; no socket, continua aberto | `curl -sD - -X POST -d '{nope' .../auth/sign-in` e conferir `Connection: keep-alive` |
| 5 | `a%2Fb`, `a%2Fb%2Fc`, `__x__` e 751 `é` respondem 404 nas 6 combinações de método e rota | handoff, tabela de ids; §8 itens 6 e 7 | fechado por leitura até o repositório (todo `null` vira 404 em `entities/[id]/route.ts:24`, `:40`, `:102` e `users/[id]/route.ts:102`, `:116`, `:179`); o 404 por HTTP continua aberto | os `curl --path-as-is` do handoff, com bearer de comum e de admin do seed; `grep -c -E 'must point\|INVALID_ARGUMENT'` no log deve dar 0 |
| 6 | `PUT` e `DELETE` de entidade criada na hora respondem 200/204 | handoff, "não fiz" | continua aberto | criar com `POST /entities`, depois `PUT` e `DELETE` com o id devolvido |
| 7 | `GET /users/a%2Fb` não cria perfil pelo fallback | handoff | parcialmente fechado por leitura: `getUser("a/b")` rejeita se o uid não existe no Auth e o `catch` devolve `null` antes de `findOrCreateProfile` (`user-merge.ts:17-24`). Continua aberto por medição | contar documentos de `user` no emulador antes e depois do `GET` |
| 8 | webhook com `profileId` inválido cai em `logProfileNotFound`, sem 500 | handoff | fechado por leitura: `webhooks/payments/route.ts:50-53` loga e retorna; `:77` devolve `null` e `reconcileSubscription` segue sem perfil. Medição continua aberta, exige evento assinado | `stripe trigger checkout.session.completed --add checkout_session:client_reference_id=a/b` com `stripe listen` apontando para a API |
| 9 | `.`/`..` não chegam ao handler por HTTP (o Next devolve o 404 dele) | handoff, desvio 1 | não dá para confirmar por leitura; o `/test` lê o critério como "404, sem 500" | `curl --path-as-is` em `/entities/.`, `/entities/..`, `/entities/%2E`, `/entities/%2E%2E` |
| 10 | sem token, `GET /entities/a%2Fb` → 401 | handoff | fechado por leitura: o guard `requireCommonPanelApi` roda antes do handler | (opcional) o `curl` sem `authorization` |
| 11 | id real do seed continua 200 em `entities` e `users` | handoff | fechado por leitura do caso de controle de 1 500 bytes; por HTTP continua aberto | `GET` do primeiro id das listas |

### Raio de impacto

`BaseRepository.findById` é herdado por todo repositório. Chamadores, conferidos com
`rg -n "\.findById\(" apps/api` fora de `__tests__`:

| chamador | origem do id | efeito |
|----------|--------------|--------|
| `entities/[id]/route.ts:22`, `:38`, `:100` | parâmetro da rota | id inválido: 500 → 404 `ENTITY_NOT_FOUND` |
| `users/[id]/route.ts:114`, `:177` | parâmetro da rota | id inválido: 500 → 404 `USERS_NOT_FOUND` |
| `user-merge.ts:105` (`getMergedUserByFirestoreDocId`, chamado em `users/[id]/route.ts:97` e `:169`) | parâmetro da rota ou id já lido | no `GET`, id inválido cai no fallback por uid (ver 🟢 acima) |
| `webhooks/payments/route.ts:50`, `:77` | `client_reference_id`/`metadata.profileId` do evento assinado | `profileId` com `/` ou reservado: 500 com reentrega da Stripe → perfil não encontrado. O valor vem do checkout criado pela própria API (id automático de 20 caracteres) |
| `notifications/[id]/read/route.ts:24` | parâmetro, já filtrado em `:20` | nenhum |
| `session.repository.ts:62` | `sessionDocId` (`session-key.ts:21-23`): `encodeURIComponent(uid)` + `_` + segundos | nenhum. Sem `/`, termina em dígito (nunca casa `^__.*__$`), e o uid do Firebase tem no máximo 128 caracteres |

Nenhum repositório sobrescreve `findById`. `decodeCursor` (`pagination.ts:52`) herda o limite em bytes: um cursor
com id de 751 `é` passa a ser recusado como cursor inválido, o que é o certo. Sem consumidor fora de `apps/api`
(`packages/sdk` tem métodos `findById` próprios, que chamam a API por HTTP).

### Achados fora do escopo (para o backlog, não corrigidos)

Confirmados por leitura. Não estão no `specs/BACKLOG.md` nem no `docs/PRE-PRODUCTION.md` (`rg` vazio); o próximo
`/spec --sync` registra.

- 🟡 `packages/auth/keys.ts:49-50`: `FIREBASE_ADMIN_CLIENT_EMAIL` e `FIREBASE_ADMIN_PRIVATE_KEY` são lidos com
  `process.env.X` direto. Com `FIREBASE_ADMIN_PROJECT_ID` preenchido (ou herdado de `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  por `:46-48`) e os outros dois como `""`, que é como `apps/api/.env.example:22-23` os publica, a checagem de
  `:65-70` deixa passar e `firebaseAuthKeysSchema.parse` (`:81`) lança: `""` falha em `.email()` (`:13`) e em
  `.min(1)` (`:14`). O mesmo arquivo já usa `||` em `:54-61` pelo mesmo motivo. Isso fere a regra "string vazia é
  ausência" da `.claude/cycle-policy.md` §3. O caso típico é o dev que configura só o projeto do emulador. Correção
  provável: `|| undefined` nas duas linhas.
- 🟢 `apps/api/instrumentation.ts:63-67` + comentário de `:49-57`: o comentário promete "a startup crash with a clear
  message" quando falta `CORS_ORIGIN` em produção. O handoff viu o `next start` subir com `unhandledRejection` em vez
  de cair. Se isso se confirmar, o comentário descreve um efeito que não acontece, e o processo serve requisições sem
  allowlist de CORS. Não dá para confirmar por leitura; precisa de `next start` sem a variável.

### Lacunas de teste

| lacuna (do handoff) | veredito |
|---------------------|----------|
| Sem teste de rota para id inválido (D6) | continua aberta, por decisão do plano. Concordo: as suítes de rota mockam o repositório, e o teste só provaria que `null` vira 404, coisa já coberta |
| Sem teste de emulador (D7) | continua aberta, por decisão do plano. O comportamento do driver real fica com o `/test` (itens 5 e 9 da tabela acima) |

Nenhuma lacuna nova. A minha correção foi só de JSDoc.

## Correções aplicadas

- `apps/api/(shared)/lib/pagination.ts:13-17`: JSDoc de `isUsableDocumentId` atualizado para o papel atual da função
  (cursor e id de rota) e para o que o handoff mediu (o reservado é recusado pelo servidor, não pelo driver).

## Decisões em aberto

Nenhuma nova. As quatro da §11 do plano seguem como adotadas.

## Gates

| gate | comando | resultado |
|------|---------|-----------|
| lint | `pnpm check` | 965 arquivos, sem correção, exit 0 |
| typecheck | `pnpm --filter api typecheck` | exit 0 |
| vitest dos arquivos tocados | `vitest run` em `paginationQuery`, `baseRepository`, `parseRequestJson` e `notificationsRoute` | 4 arquivos, 111 testes, 0 falhas |
| i18n | não se aplica | nenhuma chave nova |

A suíte inteira da `api` não foi rodada aqui (é do `/test`). O número do handoff é 1 453/1 453; a minha mudança só
tocou comentário.

## Varredura de segredo

`docs/features/api-edge-413-close-and-route-id/` não tem senha, token, chave nem e-mail de pessoa. As ocorrências de
"token" e "Bearer" são placeholders (`Bearer <token>`, `Bearer <id token>`) ou a frase do handoff dizendo que os
tokens ficaram em `/tmp` e foram apagados.

## Plano de commits

Antes de tudo, com o "sim" do usuário: `git checkout -b api/fix/edge-413-close-and-route-id`.

O índice tem um rename já preparado pela auditoria (`specs/in-app-notifications.md` →
`docs/features/in-app-notifications/spec.md`, 56% de similaridade) e o arquivo de destino ainda tem alterações fora
do índice. Para começar com `git diff --cached --stat` vazio e manter a ordem código → docs → specs → features,
desfaça a preparação antes do primeiro commit:

```bash
git restore --staged specs/in-app-notifications.md docs/features/in-app-notifications/spec.md
git diff --cached --stat   # tem de sair vazio
```

Nada se perde: o working tree já tem o estado final (o arquivo antigo apagado e o novo com as edições). No commit 4,
`git add` dos dois caminhos prepara a remoção e o arquivo novo juntos, e o Git volta a registrar o rename pela
similaridade. A alternativa, commitar o `docs(specs)` primeiro com o rename já preparado, inverteria a ordem pedida.

Depois de cada commit, conferir `git show --stat --oneline HEAD` contra a lista.

1. `fix(api): close the connection after a 413 body-cap refusal`
   - `apps/api/(shared)/lib/parse-request-json.ts`
   - `apps/api/__tests__/parseRequestJson.test.ts`
2. `fix(api): answer 404 for document ids Firestore refuses as a path`
   - `apps/api/(shared)/lib/pagination.ts`
   - `apps/api/(shared)/repositories/base.repository.ts`
   - `apps/api/__tests__/paginationQuery.test.ts`
   - `apps/api/__tests__/baseRepository.test.ts`
3. `docs: describe the 413 connection close and findById on unusable ids`
   - `docs/SECURITY.md`
   - `AGENTS.md`
4. `docs(specs): archive in-app-notifications and sync the backlog after its delivery`
   - `specs/BACKLOG.md`
   - `specs/account-security-mfa.md`
   - `specs/observability-logging.md`
   - `specs/one-time-purchase.md`
   - `specs/in-app-notifications.md` (remoção)
   - `docs/features/in-app-notifications/spec.md`
5. `docs(features): api-edge-413-close-and-route-id`
   - `docs/features/api-edge-413-close-and-route-id/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
     `review/review.md`)

Título de PR sugerido: `fix(api): close the connection on 413 and answer 404 for unusable route ids`.

Depois do último commit aprovado, o `/review` pergunta se deve rodar
`git push -u origin api/fix/edge-413-close-and-route-id`.

### Commits realizados

(preenchido pelo orquestrador)
