# Relatório do `/test`: borda da API (413 com `connection: close` e id inválido nas rotas `[id]`)

Rodada autônoma do `/cycle`, passo 5, em 2026-10-20. Branch: `guilhermebittelbrunn/cycle-command-v6` (não
protegida; o nome proposto pelo `/review` é `api/fix/edge-413-close-and-route-id`). Não criei branch, não fiz
commit nem `git add`, e não mexi no rename que está no índice.

## Resumo

- 12 critérios ✅, 0 ❌, 1 🔒 (Vercel).
- Nenhum defeito de produção no diff.
- Uma afirmação do handoff caiu: o `fetch` do Node **não** recebe sempre o 413. Com 240 tentativas, 10 terminaram
  em `ECONNRESET`/`EPIPE` (4,2%), contra 0 de 120 sem o header. O plano aceita esse desfecho, mas o
  `docs/SECURITY.md` dizia "dez tentativas, sem `ECONNRESET`". Reescrevi o parágrafo com os números desta rodada,
  como o plano previa (§8 item 3).
- Um teste novo de custo baixo (2 casos em `paginationQuery.test.ts`) fecha a lacuna do cursor herdar o limite em
  bytes.

## Superfície e ambiente

O diff só toca `apps/api` e documentação, sem UI. Por isso não usei `agent-browser`, idiomas, temas nem viewports.
Medi por HTTP (`curl` 8.7.1 e o `fetch` do Node 22.13.0) contra a `api` em **build de produção** (`next build` +
`next start -p 3002`, Next 16.0.0), com os emuladores de Auth, Firestore e Storage e o `pnpm seed`.

| serviço | origem | PID / encerramento |
|---------|--------|--------------------|
| emuladores (`pnpm emulators`, JDK 21 do Homebrew via `JAVA_HOME`) | subi (portas 9099, 8080, 9199, 4001, 4400, 4500 e 9150 livres antes) | `kill` no PID do `pnpm` e depois nos dois filhos que seguiam presos às portas (`firebase` e o `java` do Firestore) |
| `api` em `next start` | subi (3002 livre) | `kill` por PID a cada reinício e no fim |

Nada do usuário estava de pé, então nada foi reutilizado. No fim, `lsof -ti tcp:<porta>` saiu vazio em 3002,
9099, 8080, 9199, 4001, 4400, 4500 e 9150. O harness temporário (`/tmp/qa-api-edge`: scripts, payload de 5 MiB,
chave RSA fictícia e os ID tokens do emulador) foi apagado. `apps/api/.next` ficou com o build, e o git o ignora.

O `apps/api/.env` deste checkout é antigo (chaves da era Clerk). Não o editei: sobrescrevi pelo ambiente do
processo os hosts do emulador, `FIREBASE_ADMIN_PROJECT_ID=demo-next-boilerplate`, uma service account fictícia em
formato válido (chave RSA gerada na hora e descartada), `CORS_ORIGIN`, e deixei vazios `ARCJET_KEY`, `STRIPE_*`,
`RESEND_*` e os `NEXT_PUBLIC_FIREBASE_*` de projeto real. Os tokens vieram de `accounts:signInWithPassword` no
emulador com as contas do seed (`admin@example.com` e `user@example.com`; a senha do seed está em
`docs/SETUP.md`).

### Controle "antes da correção"

Para saber se o instrumento distingue os dois comportamentos, medi também o código sem o header. Em vez de mexer
no código-fonte, troquei nos 22 chunks compilados de `.next/server` o argumento `{connection:"close"}` por
`void 0` (o que reproduz o `refuse` de antes), reiniciei o `next start`, medi e restaurei os 22 arquivos de uma
cópia. Depois da restauração, `grep` encontrou o `connection:"close"` nos 22 e o `void 0` em nenhum, e o `curl`
voltou a receber `connection: close`.

## Gates

| gate | comando | resultado |
|------|---------|-----------|
| suíte da `api` | `pnpm --filter api test` | antes do teste novo: 112 arquivos, 1 453 testes, 0 falhas. Depois: 112 arquivos, 1 455 testes, 0 falhas |
| root (antecipa o `build`) | `pnpm test` com `JAVA_HOME` no JDK 21 | 15/15 tasks, 13 do cache. `api:test` 1 455, `api:test:emulator` 207 (5 arquivos), sem falha. Demais workspaces: app 958, web 169, design-system 171, email 205, auth 132, internationalization 67, shared 56, security 45, analytics 34, next-config 32, payments 22, e2e 16, sdk 11 |
| typecheck | `pnpm --filter api typecheck` | exit 0 |
| lint | `pnpm check` | 965 arquivos, sem correção |
| i18n | não se aplica | nenhuma chave nem `error.code` novo |

Sem `--force`: nada me fez suspeitar do cache.

## Testes criados

| arquivo | casos | o que prova |
|---------|-------|-------------|
| `apps/api/__tests__/paginationQuery.test.ts` | `decodes an id of two-byte characters at the byte limit` e `refuses an id over the byte limit even when its length is under it` | `decodeCursor` herda o limite em bytes: 750 `é` volta como id, 751 `é` vira `null`. O segundo caso falharia com o `id.length` de antes, porque 751 caracteres ficam abaixo de 1 500 |

Escrevi esses dois porque o critério "o cursor de paginação herda a regra" só tinha leitura de código: o
`parseListQuery` recusa um cursor desse tamanho pelo comprimento antes de chegar ao id, então os testes de cursor
existentes não provavam a herança.

## Decisões de custo de teste

| módulo tocado | decisão |
|---------------|---------|
| `parse-request-json.ts` | sem teste novo. Os 3 casos do `/develop` já provam o header nas duas recusas e a ausência no 400. O efeito no socket depende do servidor HTTP do Node, então medi por HTTP e não criei teste da faixa cara: uma suíte que sobe `next start` e conta sockets seria lenta, dependente de timing e não diria nada que o teste do helper mais esta medição não digam |
| `base.repository.ts` | sem teste novo. Os 8 casos com espião em `fakeDb.collection` provam que nenhum id recusado chega ao Firestore |
| `pagination.ts` | 2 casos novos, na faixa barata (acima) |
| rotas `entities/[id]` e `users/[id]` | sem teste novo (D6 do plano). As suítes de rota mockam o repositório; um id inválido só provaria que `null` vira 404, o que elas já cobrem. O comportamento ponta a ponta foi medido por HTTP |
| teste de emulador (D7) | não criei. O objeto aqui não é a infra: a guarda age antes de qualquer chamada ao Firestore, e o espião já prova isso. Um teste contra o emulador só provaria de novo que o driver e o servidor recusam `a/b` e `__x__` |

## Verificar no `/test` (os 11 itens do `review.md`)

| # | afirmação | veredito | medido |
|---|-----------|----------|--------|
| 1 | 413 fecha a conexão: 0 ESTABLISHED depois da rajada, nas duas camadas | **confirmado** | Rajadas de 50 × 5 MiB contra `POST /auth/sign-in`, `lsof -nP -a -p <pid> -iTCP -sTCP:ESTABLISHED`, contado do lançamento da rajada. `chunked`: três rajadas, 50/50 `413` com `connection: close` em todas; aos 2 s, 0, 2 e 0 conexões (na segunda, 7 `curl` ainda estavam em curso, e o mais lento terminou em 2,42 s); aos 60 s, 0 nas três. `content-length` com `Expect: 100-continue`: 50/50 `413` com `connection: close`, 0 aos 2 s e aos 60 s. `content-length` sem `Expect`: igual. Controle sem o header: `chunked` deixou **40** ESTABLISHED aos 2 s e aos 60 s (e 40 `FIN_WAIT_1` do lado do cliente); `content-length` com e sem `Expect` deixou 0, porque o `curl` fecha a conexão sozinho ao receber o 413. A correção muda o resultado na camada do stream; na do `content-length` o `curl` não mostra diferença |
| 2 | `fetch` do Node recebe 413, sem `ECONNRESET` (R1) | **derrubado** | Loopback, 5 MiB, duas rodadas de 30 sequenciais + 30 simultâneas por camada (240 tentativas): 230 × `413 conn=close VALIDATION_FAILED`, 10 erros na escrita. `content-length`: 8/120 (7 `ECONNRESET`, 1 `EPIPE`); `chunked` com `ReadableStream` e `duplex: "half"`: 2/120 (`EPIPE`). 9 dos 10 vieram dos lotes simultâneos. Controle sem o header: 120/120 `413 conn=keep-alive`. Com latência: sem `sudo` para `dnctl`/`pfctl`, usei um proxy TCP em Node que atrasa cada sentido (25 ms e 100 ms) e limita o upload a 2 MB/s, repassando o `FIN` e simulando o `RST` do servidor quando o cliente continua enviando: 40/40 `413`. O proxy não reproduz a entrega real de `RST` numa rede, então o resultado com latência é indicativo. `docs/SECURITY.md` reescrito com esses números |
| 3 | zero `unhandledRejection`/`AbortError` | **confirmado** | `grep -c -E 'unhandledRejection\|AbortError'` deu 0 nos logs de todas as instâncias do `next start` com o código atual (rajadas, `fetch`, ids, webhook) e também no controle |
| 4 | 400 de JSON inválido mantém `keep-alive` | **confirmado** | `{nope` → `400`, `Connection: keep-alive`, `Keep-Alive: timeout=5`, corpo `VALIDATION_FAILED`. Corpo ausente → `400`, `Connection: keep-alive`. Duas requisições no mesmo `curl -v`: `Re-using existing connection` |
| 5 | `a%2Fb`, `a%2Fb%2Fc`, `__x__` e 751 `é` → 404 nas 6 combinações | **confirmado** | `curl --path-as-is` com bearer de comum em `entities` e de admin em `users`: 404 `ENTITY_NOT_FOUND`/`USERS_NOT_FOUND` em `GET`, `PUT` e `DELETE` para os quatro ids (24/24). 750 `é` (1 500 bytes) também dá 404 nas 6, agora pela leitura do Firestore. `grep -c -E 'must point\|INVALID_ARGUMENT'` no log: 0. Coleção `entity`: 6 documentos e o mesmo hash do conteúdo antes e depois, então o `PUT` não gravou |
| 6 | `PUT` e `DELETE` de entidade criada na hora → 200/204 | **confirmado** | `POST /entities` → id novo; `PUT {"name":"qa-api-edge-edited"}` → 200 `{ data: { id } }`; `GET` → 200 com o nome novo; `DELETE` → 204; `GET` depois → 404 `ENTITY_NOT_FOUND` (o documento segue no Firestore, como exclusão lógica) |
| 7 | `GET /users/a%2Fb` não cria perfil | **confirmado** | Coleção `user`: 3 documentos antes e depois. O único campo que mudou na rodada foi `lastAccessAt` dos dois perfis que fizeram as chamadas, gravado pelo registro de atividade. Ver também o achado 4 abaixo |
| 8 | webhook com `profileId` inválido cai em `logProfileNotFound`, sem 500 | **confirmado** | `next start` reiniciado com `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` fictícios e eventos assinados localmente (HMAC do esquema da Stripe). `checkout.session.completed` com `client_reference_id` `a/b` e `__x__`, e `customer.subscription.updated` com `metadata.profileId` `a/b`: 200 `{"ok":true}` nos três, e três linhas `[payments] webhook-profile-not-found` no log |
| 9 | `.`/`..` não chegam ao handler | **confirmado** | `/entities/.`, `/entities/..`, `/entities/%2E`, `/entities/%2E%2E` e os mesmos em `/users`: 404 `text/html` do Next. `PUT` e `DELETE` em `/entities/%2E`: 404. Nenhum 500 |
| 10 | sem token, `GET /entities/a%2Fb` → 401 | **confirmado** | `401 AUTH_INVALID_TOKEN`, em `entities` e em `users`. Usuário comum em `/users/a%2Fb`: `403 ADMIN_FORBIDDEN` |
| 11 | id real do seed continua 200 | **confirmado** | `GET /entities/<primeiro id da lista do usuário>` → 200; `GET /users/<primeiro id da lista do admin>` → 200; `PUT /users/<id de user2@example.com> {"displayName":"qa-api-edge"}` → 200, com o nome refletido no `GET`, e revertido para vazio em seguida (200) |

## Critérios de aceite

| critério | status | meio |
|----------|--------|------|
| Recusa por tamanho fecha a conexão (corpo em stream) | ✅ | HTTP (item 1) + teste do helper |
| Recusa por tamanho fecha a conexão (`content-length` declarado) | ✅ | HTTP (item 1) + teste do helper |
| Cliente que envia tudo antes de ler tem comportamento documentado | ✅ | HTTP (item 2). O texto herdado estava errado; passou depois da correção do `SECURITY.md` nesta etapa |
| Recusa por JSON inválido não muda | ✅ | HTTP (item 4) + teste do helper |
| Nenhum erro não tratado nas recusas | ✅ | log do `next start` (item 3) |
| Id inválido em `entities/[id]` responde 404 | ✅ | HTTP (itens 5, 9 e 10). `.`/`..` recebem o 404 do Next, não `ENTITY_NOT_FOUND`; a guarda deles no repositório é provada pelo unitário |
| Id inválido em `users/[id]` responde 404 | ✅ | HTTP + contagem no emulador (itens 5 e 7) |
| `findById` não toca o Firestore com id inutilizável | ✅ | unitário com espião + log sem `must point`/`INVALID_ARGUMENT` |
| Limite do id medido em bytes | ✅ | unitário (`isUsableDocumentId` e os 2 casos novos de `decodeCursor`) |
| Ids válidos seguem funcionando | ✅ | HTTP (itens 6 e 11) + suíte da `api` 1 455/1 455 |
| Webhook com `profileId` inválido não vira 500 | ✅ | HTTP com evento assinado (item 8) |
| Documentação descreve o comportamento medido | ✅ | leitura de `docs/SECURITY.md:176-178` (reescrito aqui) e `AGENTS.md:46` |
| Comportamento na Vercel | 🔒 | exige deploy |

## Achados

1. **R1 (custo do `connection: close`).** Descrito no item 2. Não é defeito: o plano aceita o erro de socket para
   corpo acima do teto. O que estava errado era a frase do `SECURITY.md`, e corrigi.
2. **🟡 do `review.md` sobre `packages/auth/keys.ts:49-50`: derrubado.** Medi `keys()` com um teste descartável
   (apagado depois). Na forma do `.env.example` (os três `FIREBASE_ADMIN_*` vazios e
   `NEXT_PUBLIC_FIREBASE_PROJECT_ID` preenchido), `keys()` **não** lança: `FIREBASE_ADMIN_PROJECT_ID ?? ...` fica
   `""`, a checagem de `:65-70` vê os três vazios e devolve tudo `undefined`. Só lança com o conjunto parcial
   (projeto preenchido e e-mail ou chave vazios), e lança também com os dois **ausentes** (erro `custom`
   "is required when any other FIREBASE_ADMIN_* variable is set"). A correção sugerida (`|| undefined`) trocaria
   apenas a mensagem, de "Invalid email address" para essa. A falha de build do handoff vem do `apps/api/env.ts`,
   que exige as três para o build de produção, e o `docs/SETUP.md:47-50` já documenta isso. Sobra um 🟢: a
   mensagem para o conjunto parcial com `""` é menos clara que a do conjunto parcial ausente.
3. **🟢 do `review.md` sobre `apps/api/instrumentation.ts:49-67`: metade confirmada.** `next start` sem
   `CORS_ORIGIN` não cai: o processo segue escutando na 3002 e responde `500 Internal Server Error` (texto, sem
   `error.code`) a toda requisição, inclusive `/health` e o preflight de `http://localhost:3000`, com
   `unhandledRejection` e "Failed to prepare server" no log. O comentário promete "a startup crash", que não
   acontece. O receio de servir sem allowlist não se confirma: nenhuma rota responde. Para o backlog.
4. **Uid com `/` no Auth (observação do `review.md`): confirmado.** Criei no emulador o usuário
   `qa-api-edge/slash` (`qa-api-edge@example.com`). `GET /users/qa-api-edge%2Fslash` como admin respondeu 200 com
   o usuário e criou o perfil (`user`: 3 → 4 documentos). Antes da correção essa chamada dava 500. É o mesmo
   comportamento de qualquer uid sem perfil, então não é regressão; fica registrado.
5. **`/files` responde o próprio 413 (`UPLOAD_FILE_TOO_LARGE`) sem `connection: close`**
   (`apps/api/(shared)/validation/file.schema.ts:108`). Medi 20 × 5 MiB com `content-length` e sem `Expect`:
   20/20 `413` com `Connection: keep-alive` e 0 conexões abertas aos 2 s, porque o `curl` fecha sozinho. Em
   `chunked`, a rota lê o corpo inteiro pelo `formData()` antes de recusar, então não sobra corpo para prender o
   socket. Não medi defeito; fica como nota de consistência para o backlog.

## Lacunas herdadas

| lacuna | veredito |
|--------|----------|
| Sem teste de rota para id inválido (D6) | continua aberta, por decisão do plano, com a qual concordo. O comportamento por HTTP foi medido aqui |
| Sem teste de emulador (D7) | continua aberta, por decisão do plano. O que o emulador provaria (500 do driver/servidor sem a guarda) está fora do código desta tarefa; o 404 por HTTP foi medido aqui |
| Rajada de 50 e contagem aos 60 s (handoff) | fechada aqui (item 1) |
| R1 com mais amostras e latência (handoff) | fechada aqui, com o limite do proxy registrado (item 2) |
| `unhandledRejection` na rajada de 50 (handoff) | fechada aqui (item 3) |
| `PUT`/`DELETE` de entidade criada na hora (handoff) | fechada aqui (item 6) |
| `GET /users/a%2Fb` cria perfil? (handoff) | fechada aqui (item 7) |
| Webhook com `profileId` inválido (handoff) | fechada aqui (item 8) |
| `FIREBASE_ADMIN_CLIENT_EMAIL=""` derruba o build (handoff, achado fora do escopo) | fechada aqui: não é defeito do `keys.ts` (achado 2) |
| `next start` sem `CORS_ORIGIN` (handoff, achado fora do escopo) | fechada aqui como medição; a correção do comentário vai para o backlog (achado 3) |
| Cursor herda o limite em bytes (só leitura de código) | fechada aqui com 2 testes unitários |
| Comportamento na Vercel | continua aberta, 🔒 |

## Estado de dev alterado

Tudo ficou nos emuladores, que não exportam dados ao sair: uma entidade `qa-api-edge` criada e excluída, o
usuário `qa-api-edge/slash` (`qa-api-edge@example.com`) com o perfil criado pelo `GET`, os eventos de webhook
`evt_qa_api_edge_*`, o `displayName` de `user2@example.com` alterado e revertido, e `lastAccessAt` dos perfis do
seed. Nenhum projeto Firebase real foi tocado e nenhuma conta nova vai para o `docs/PRE-PRODUCTION.md`.

## Arquivos alterados nesta etapa

- `apps/api/__tests__/paginationQuery.test.ts`: 2 casos novos.
- `docs/SECURITY.md:176-178`: parágrafo do 413 reescrito com as medições desta rodada (antes: rajada de 20 e dez
  tentativas do `fetch`).
- `docs/features/api-edge-413-close-and-route-id/test/criterios-aceite.md`, este relatório e o `STATE.md`.
