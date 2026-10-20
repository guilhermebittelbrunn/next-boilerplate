# Plano: borda da API (conexão fechada no 413 e id inválido nas rotas `[id]`)

- **Slug:** `api-edge-413-close-and-route-id`
- **Origem:** tarefa direta, sem spec. É a recomendação de `specs/BACKLOG.md:230-249` ("A próxima: tarefa direta na
  borda da API"), que junta dois achados 🟡: `specs/BACKLOG.md:1698` (conexão aberta depois do `413`, o D2 de
  `request-body-size-limit`) e `specs/BACKLOG.md:1721` (id com `%2F` nas rotas `[id]`).
- **Base:** `main` em `3a118c6` (PR #52). Branch atual `guilhermebittelbrunn/cycle-command-v6`; este plano não cria nem
  nomeia branch.
- **Escopo:** só `apps/api`, mais duas frases de documentação (`docs/SECURITY.md` e `AGENTS.md`). Sem SDK, sem front,
  sem i18n, sem variável de ambiente, sem infra.

## 0. Sumário do desenho

1. **413 com `connection: close`.** `parseRequestJson` ganha um `refuseTooLarge()` que monta o `413
   VALIDATION_FAILED` com o header `connection: close`, e as duas recusas por tamanho passam a usá-lo
   (`parse-request-json.ts:51-53` e `:59-61`). O `400` não muda: nele o corpo foi lido inteiro e a conexão pode ser
   reaproveitada. A hipótese se sustenta pela leitura do Next 16.0.0 instalado e já foi medida numa variante em
   `next start` pelo `/test` da PR #51 (§1.2).
2. **Id que o Firestore recusa como caminho vira "não encontrado" no repositório.** `BaseRepository.findById`
   (`base.repository.ts:143-144`) devolve `null` sem chamar `doc(id)` quando `isUsableDocumentId(id)` é falso. As
   rotas `entities/[id]` e `users/[id]` já tratam `null` com `404 ENTITY_NOT_FOUND` e `404 USERS_NOT_FOUND`, então
   nenhuma rota muda. De passagem, `isUsableDocumentId` passa a medir o limite de 1 500 em bytes UTF-8, como o
   Firestore define, e não em unidades UTF-16 (`pagination.ts:21`).

Nenhum `error.code` novo. Nenhum contrato do SDK muda.

## 1. Contexto

### 1.1 Problema 1: a conexão fica aberta depois do 413

`parseRequestJson` recusa corpo acima de 100 KiB em duas camadas: `content-length` declarado acima do teto, sem ler
(`parse-request-json.ts:51-53`), e soma dos bytes do stream, que para de ler e solta o leitor com `releaseLock()`
ao passar do teto (`:36-41`, recusa em `:59-61`). As duas passam por `refuse` (`:11-17`), que monta a resposta sem
nenhum header além do padrão.

O `/test` de `request-body-size-limit` mediu o efeito em `next start`
(`docs/features/request-body-size-limit/test/report.md:280-318`): 201 requisições de 5 MiB em `chunked` deixaram 152
conexões ESTABLISHED, cada uma com 400 KB a 980 KB parados na fila de recepção, até perto dos 300 s (o
`requestTimeout` padrão do Node). O RSS foi de 132 192 KB a 189 456 KB e voltou quando as conexões caíram. Nas rotas
públicas, e sem `ARCJET_KEY`, qualquer pessoa segura sockets do servidor mandando corpos grandes depressa.

O `docs/SECURITY.md:172-179` (subseção "Tamanho do corpo") não diz nada sobre isso; a auditoria marcou a omissão em
`specs/BACKLOG.md:611`.

### 1.2 A hipótese do `connection: close` se sustenta?

O pedido do `/cycle` foi avaliar se um header hop-by-hop num `Response` do App Router chega ao socket ou se o
Next/undici o descarta. Evidência:

- **undici aceita o header.** `Response.json(body, { headers: { connection: "close" } })` não filtra nomes no Node:
  a lista de nomes proibidos do Fetch vale para requisição, e para resposta o guard só cobre `set-cookie`. O teste
  unitário da §7.1 confirma isso no mesmo runtime (`apps/api/vitest.config.ts` usa `environment: "node"`).
- **O Next copia o header para o `ServerResponse`.** O handler de rota do App Router entrega a resposta a
  `sendResponse` (`apps/api/node_modules/next/dist/build/templates/app-route.js:316`). Ali, cada header do `Response`
  vira `res.appendHeader(name, value)` (`next/dist/server/send-response.js:35-54`). O único nome filtrado é
  `x-middleware-set-cookie` (`:37`), e o resto só é pulado se já existir no `res` (`:49-50`). Next 16.0.0, conferido
  em `apps/api/node_modules/next/package.json`.
- **O Node fecha o socket.** `http.ServerResponse` marca a resposta como a última da conexão quando o header
  `Connection` traz `close` e encerra o socket ao terminar de escrever, em vez de esperar o resto do corpo para
  reaproveitar a conexão.
- **Já foi medido.** A variante com `headers: { connection: "close" }` só no 413, servida com `next start`, deu 50 ×
  413, o header no cliente e 0 conexões abertas 2 s depois, com 0 `unhandledRejection` (`report.md:315-318`). A
  variante não entrou no código.

Conclusão: a correção é real em `next start` e não finge resolver. Fica 🔒 o que não dá para medir sem infra:

- **Vercel.** A plataforma termina a conexão HTTP no proxy dela, remove headers hop-by-hop e recusa sozinha corpo
  acima de 4,5 MB (`docs/SECURITY.md:179`). Se o D2 existe lá e se o header tem efeito, ninguém mediu.
- **`next dev`** não conta como evidência (`.claude/cycle-policy.md`, §4).

**Risco a medir (§13, R1).** Fechar um socket com dados não lidos na fila de recepção faz o kernel mandar `RST`.
Um cliente que só lê a resposta depois de terminar de enviar pode receber `ECONNRESET` em vez do 413. No localhost
o `curl` recebeu 50 × 413 na variante, mas o `/test` precisa medir com um cliente que não lê antes de enviar tudo
(o `fetch` do Node). Se o 413 se perder, o desfecho continua aceitável: corpo acima de 100 KiB não é uso legítimo
(o maior corpo legítimo tem cerca de 74 KB, `docs/SECURITY.md:174`), e a alternativa (leitura "lingering" com
descarte até um teto e um prazo) é mais código para um caso de abuso. O que muda é o texto do `SECURITY.md`, que
precisa dizer o que foi medido (§10.5).

### 1.3 Problema 2: id com `%2F` vira 500 nas rotas `[id]`

O Next decodifica `%2F` no parâmetro, e o `/` chega ao handler: medido pelo `/develop` da PR #52 em
`POST /notifications/a%2Fb/read` (`docs/features/in-app-notifications/develop/handoff.md:45-46`). Nas rotas que não
validam, o id vai direto a `findById`, que faz `this.db.collection(this.table).doc(id).get()`
(`base.repository.ts:143-144`). Com um `/`, `doc("a/b")` aponta para uma coleção e o driver lança; a rota responde
500 em vez de 404.

Pontos onde o id chega a `findById` sem validação, conferidos em `3a118c6` (as âncoras do backlog continuam certas):

| rota | linha | caminho até o `doc(id)` |
|------|-------|-------------------------|
| `GET /entities/[id]` | `entities/[id]/route.ts:21-22` | `entityRepository.findById(id)` |
| `PUT /entities/[id]` | `:37-38` | idem |
| `DELETE /entities/[id]` | `:99-100` | idem |
| `GET /users/[id]` | `users/[id]/route.ts:95-97` | `getMergedUserByFirestoreDocId(id)` → `userRepository.findById` (`user-merge.ts:105`); se der `null`, tenta `getMergedUserByUid(id)` (`:98-99`) |
| `PUT /users/[id]` | `:113-114` | `userRepository.findById(id)` |
| `DELETE /users/[id]` | `:176-177` | idem |

Há cinco rotas `[id]` na API (`find apps/api/app -path '*[*]*' -name route.ts`). As outras três já tratam o id antes:

- `notifications/[id]/read/route.ts:18-22` chama `isUsableDocumentId` e responde `404 NOTIFICATION_NOT_FOUND`, com
  cinco casos de teste em `notificationsRoute.test.ts:300-323`;
- `account/sessions/[id]/route.ts:30` passa o id por `parseSessionId`;
- `account/sign-in-methods/[id]/route.ts:64` passa por `parseSignInMethodId` (o id é um provedor, como
  `google.com`, e não um documento).

Outros chamadores de `findById` fora das rotas `[id]`: `session.repository.ts:62` (id montado por `sessionDocId`, que
codifica o `uid` com `encodeURIComponent`, `session-key.ts:21-23`) e o webhook de pagamentos
(`webhooks/payments/route.ts:50` e `:77`, com o `profileId` vindo do evento assinado).

Dois detalhes do comportamento atual, por leitura:

- Com **duas** barras (`a/b/c`), `doc` aponta para um documento numa subcoleção (`entity/a/b/c`) e não lança; hoje a
  resposta é 404 porque o documento não existe. A correção fecha esse caminho também.
- `isUsableDocumentId` mede `id.length` (`pagination.ts:21`), que conta unidades UTF-16. O Firestore limita o id a
  1 500 **bytes**. Um id com 751 `é` tem 751 de `length` e 1 502 bytes: passa pela checagem e chega ao driver.

O 500 nestas duas rotas ainda é leitura do `/review` da PR #52 (`specs/BACKLOG.md:1721`). O backlog pede medir antes
de corrigir (`:248-249`); isso é o passo 0 do `/develop` (§10.6).

### 1.4 Objetivo e corte de MVP

- Toda recusa `413` do `parseRequestJson` fecha a conexão.
- `GET`, `PUT` e `DELETE` de `entities/[id]` e `users/[id]` respondem `404` com o código de sempre para qualquer id
  que o Firestore recuse como caminho, sem 500.
- `docs/SECURITY.md` descreve o que foi medido.

**Fora de escopo:**

- Guarda em `BaseRepository.update`/`delete` e nos `doc(id)` próprios dos repositórios (`user.repository.ts:113`,
  `:143`, `:174`; `notification.repository.ts:66`). Toda rota chama `findById` antes de escrever.
- Leitura "lingering" do corpo depois do 413 (§1.2).
- Comportamento na Vercel (🔒).
- Migrar os dublês de `Request` sem `body` (`specs/BACKLOG.md:1699`).
- Remover a checagem própria de `notifications/[id]/read` (§12, D4).

### 1.5 Apps impactados

| área | impacto |
|------|---------|
| `apps/api` | `parse-request-json.ts`, `base.repository.ts`, `pagination.ts` e três arquivos de teste |
| `packages/sdk`, `apps/app`, `apps/web`, i18n | nenhum. Os códigos `ENTITY_NOT_FOUND` e `USERS_NOT_FOUND` já existem e já são traduzidos |
| docs | `docs/SECURITY.md` (subseção "Tamanho do corpo"), `AGENTS.md:46` (uma oração sobre `findById`) |

Painel comum (`entities`) e admin (`users`). Modo de produto e plano: indiferente.

## 2. Dados (Firestore)

Nada novo: sem coleção, campo, índice ou migração. Muda só o que `findById` faz com um id que nunca poderia ser um
documento daquela coleção: devolve `null` em vez de lançar (ou, com duas barras, de ler uma subcoleção).

## 3. Contrato `@repo/sdk`

N/A. As respostas `404` com `ENTITY_NOT_FOUND`/`USERS_NOT_FOUND` e `413 VALIDATION_FAILED` já fazem parte do contrato.

## 4. API

### 4.1 Rota e guard

Nenhuma rota nova, nenhum guard alterado. Os guards rodam antes do handler, então um id inválido continua exigindo
credencial (`requireCommonPanelApi` em entities, `requireAdminApi` em users): sem token, `401` como hoje.

### 4.2 Onde aplicar a validação do id

Três opções avaliadas:

| opção | o que muda | por que não / por que sim |
|-------|-----------|---------------------------|
| A. `resolveIdFromContext` devolve `string \| null` (`resolve-route-id.ts:8-13`), sugerida pelo `/review` da PR #52 | assinatura de um helper usado por 5 rotas, 9 chamadas | aplica regra de documento do Firestore a ids que não são documento (`sign-in-methods/[id]` recebe `google.com`), obriga as 5 rotas a tratar `null`, e não protege o webhook nem quem chama `findById` sem rota |
| B. checagem em cada handler, como em `notifications/[id]/read` | 6 ramos novos em 2 arquivos | o padrão já existe numa rota; com mais 6 viraria workaround em 7 lugares. A `.claude/cycle-policy.md` §3 manda corrigir no componente compartilhado a partir de 3 |
| **C. `BaseRepository.findById` devolve `null` para id inutilizável** (adotada) | 1 linha + 1 import | é onde o driver lança. Cobre as 6 chamadas das duas rotas, o webhook e todo CRUD que um fork gerar com `/new-crud`, sem mudar assinatura nenhuma. As rotas já mapeiam `null` para o `404` certo |

Efeito colateral da opção C, todos aceitáveis:

- **Webhook de pagamentos** (`webhooks/payments/route.ts:50`, `:77`): um `profileId` inválido nos metadados de um
  evento assinado hoje lança (500, e a Stripe reenvia o evento). Passa a cair no ramo de perfil não encontrado
  (`logProfileNotFound`, `:51-53`) ou em `null` em `findSubscriptionOwner`. O `profileId` vem de checkout criado pela
  própria API, então isso só acontece com sessão criada por fora.
- **`GET /users/[id]`**: com `findById` devolvendo `null`, a rota tenta `getMergedUserByUid("a/b")`
  (`users/[id]/route.ts:98-99`). `getAuthInstance().getUser` falha (uid inexistente, ou acima de 128 caracteres) e o
  `catch` de `user-merge.ts:21-23` devolve `null`: `404 USERS_NOT_FOUND`. Custa uma chamada ao Auth por id lixo, numa
  rota só de admin.
- **`session.repository.ts:62`**: o id é `encodeURIComponent(uid)_<chave>`, sem `/`; nada muda.

### 4.3 Limite em bytes

`isUsableDocumentId` passa a comparar `Buffer.byteLength(id, "utf8")` com 1 500. Isso segue a documentação do
Firestore ("Constraints on document IDs": no máximo 1 500 bytes) e afeta também o cursor de paginação
(`pagination.ts:52`), que fica mais correto do mesmo jeito. Se o emulador não recusar ids acima de 1 500 bytes, a
mudança fica justificada só pela documentação (🔒 em produção) e o handoff registra isso.

### 4.4 Erros

| situação | status | `error.code` | mudança |
|----------|--------|--------------|---------|
| corpo acima de 100 KiB (declarado ou medido) | 413 | `VALIDATION_FAILED` | ganha `connection: close` |
| corpo ausente ou JSON inválido | 400 | `VALIDATION_FAILED` | nenhuma (sem `connection: close`) |
| id inválido em `entities/[id]` (`GET`/`PUT`/`DELETE`) | 404 | `ENTITY_NOT_FOUND` | era 500 |
| id inválido em `users/[id]` (`GET`/`PUT`/`DELETE`) | 404 | `USERS_NOT_FOUND` | era 500 |

Nada novo em `apiErrors`.

### 4.5 Ordem dentro do `PUT`

Nas duas rotas o `PUT` chama `findById` antes de `parseRequestJson` (`entities/[id]/route.ts:38` e `:47`;
`users/[id]/route.ts:114` e `:123`). Um `PUT` com id inválido e corpo acima do teto responde `404`, sem ler o corpo e
sem `connection: close`. É o comportamento de hoje para id inexistente; não muda.

## 5. Front-end

N/A. O app já trata `404` dessas rotas (é o mesmo caminho de um registro apagado).

## 6. Autorização e segurança

- Ownership e guard intactos. O `404` para id inválido não revela nada: é a mesma resposta de id inexistente ou de
  outro dono (`entities/[id]/route.ts:24`).
- O caminho para subcoleção (`a/b/c`) deixa de ser lido. Hoje não vaza dado (nenhuma coleção tem subcoleção com o
  formato `entity/<id>/<sub>/<id>` e o resultado ainda passaria pela checagem de `userId`), mas é uma leitura a menos
  fora do formato esperado.
- **Impersonação:** nada muda. `GET /entities/[id]` lido pelo admin personificando passa pelo mesmo `findById`; `PUT`
  e `DELETE` continuam recusados pelo modo somente leitura antes do handler.
- O `connection: close` reduz o tempo que um socket fica preso por corpo recusado, de até ~300 s para o tempo de
  escrever a resposta (medido na variante). Rate limit, quando houver `ARCJET_KEY`, continua sendo a outra defesa.

## 7. Testes

Todos no nível unitário, que prova o comportamento sem processo externo. Nenhum teste de emulador novo: o objeto
aqui é a guarda antes do driver, e o fake de `baseRepository.test.ts` prova que o driver não é chamado. O que só o
driver real mostra (o 500 de antes, o 404 de depois) é medido pelo `/test` com `curl` (§8).

### 7.1 `apps/api/__tests__/parseRequestJson.test.ts` (existente, 13 casos)

- 413 por `content-length` declarado: `response.headers.get("connection") === "close"` (estender o caso de `:101`
  ou novo caso ao lado);
- 413 pelo stream (`chunked`, sem `content-length`): o mesmo header (junto de `:135` ou `:88`);
- 400 por JSON inválido: `response.headers.get("connection")` é `null` (junto de `:198`).

Os dois primeiros falham com o código de hoje.

### 7.2 `apps/api/__tests__/baseRepository.test.ts` (existente, `describe("BaseRepository.findById")` em `:396`)

`it.each` com `"a/b"`, `"a/b/c"`, `"__reserved__"`, `"."`, `".."`, `"x".repeat(1501)` e `"é".repeat(751)`:
`findById` resolve `null` e `fakeDb.collection` não é chamado (`vi.spyOn(fakeDb, "collection")`, restaurado no
fim). Mais um caso de controle: `"é".repeat(750)` (1 500 bytes) chega ao `collection`. O fake não lança com caminho
inválido, então o espião é o que torna o teste capaz de falhar com o código de hoje.

### 7.3 `apps/api/__tests__/paginationQuery.test.ts` (existente)

`describe("isUsableDocumentId")` novo: aceita 1 500 bytes ASCII e 750 `é`; recusa 1 501 ASCII e 751 `é`. O caso de
751 `é` falha com o código de hoje.

### 7.4 O que não ganha teste e por quê

Testes de rota de `entities/[id]` e `users/[id]` com id inválido: as suítes dessas rotas fazem `vi.mock` do
repositório (`entitiesRouteImpersonation.test.ts:48`, `usersAdminArchiveAccess.test.ts`), então o teste só provaria
que um `null` mockado vira 404, coisa que os testes atuais já provam. A garantia nova mora no repositório (§7.2).

### 7.5 Suítes

`pnpm --filter api test` (último número registrado: 1368/1368, PR #51; a PR #52 somou casos) e `pnpm --filter api
typecheck`; `pnpm check` no fim.

## 8. O que o `/test` vai ter de percorrer

Diff sem UI: sem `agent-browser`, sem idiomas, temas ou viewports. Medições em `apps/api` com `pnpm --filter api build`
e `next start -p 3002` (nunca `next dev`), com emulador e seed (`pnpm emulators` + `pnpm seed`, `docs/SETUP.md:129-134`)
para as rotas autenticadas. Credenciais do seed vêm de `docs/SETUP.md` ("Estado que o `pnpm seed` cria") ou de
`.claude/dev-credentials.local.md`, e não entram em nenhum artefato.

1. **D2 fechado, camada do stream.** Repetir o repro de `request-body-size-limit/test/report.md:286-290`: 50 × 5 MiB em
   `chunked` contra `POST /auth/sign-in`; contar conexões com `lsof -nP -a -p <pid> -iTCP | grep -c ESTABLISHED` 2 s
   e 60 s depois. Esperado: 50 × 413, `connection: close` na resposta, 0 conexões.
2. **Camada do `content-length` declarado.** Mesma rajada com corpo de 5 MiB e `content-length` real, com e sem
   `-H 'Expect:'` (o `curl` manda `Expect: 100-continue` acima de 1 MiB). Esperado: 413, header presente, 0 conexões.
3. **Cliente que não lê antes de terminar de enviar (R1).** `fetch` do Node 22 com corpo de 5 MiB. Registrar se o
   cliente recebe 413 ou `ECONNRESET`, nas duas camadas. Qualquer resultado é aceitável desde que medido e escrito
   no `SECURITY.md`.
4. **`unhandledRejection`.** Zero no log do servidor durante as rajadas (regressão do CA11 da PR #51).
5. **400 sem fechar.** JSON inválido abaixo do teto: 400, sem `connection: close`.
6. **Id inválido, entities.** Com bearer de usuário comum do seed: `GET`, `PUT` (corpo válido) e `DELETE` em
   `/entities/a%2Fb`, `/entities/a%2Fb%2Fc`, `/entities/__x__` e um id de 751 `é` codificado. Esperado: 404
   `ENTITY_NOT_FOUND` em todos, nada de 500 no log.
7. **Id inválido, users.** Com bearer de admin do seed: os mesmos ids em `/users/...`. Esperado: 404 `USERS_NOT_FOUND`.
8. **Sem regressão.** `GET /entities/<id real do seed>` → 200; `GET /users/<id real>` → 200; `PUT` e `DELETE` de
   uma entidade criada na hora → 200 e 204.
9. **Sem token**, `GET /entities/a%2Fb` → 401, como antes.

🔒 Vercel: não medido, sem infra.

## 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Recusa por tamanho fecha a conexão (corpo em stream)**
  Um corpo acima de 100 KiB enviado sem `content-length` (`transfer-encoding: chunked`) recebe `413` com
  `{ "error": { "code": "VALIDATION_FAILED" } }` e o header `connection: close`. Em `next start`, 50 recusas seguidas
  de 5 MiB não deixam nenhuma conexão ESTABLISHED 2 s depois, onde antes ficavam até cerca de 300 s.

- [ ] **Recusa por tamanho fecha a conexão (`content-length` declarado)**
  Um `content-length` acima do teto recebe `413 VALIDATION_FAILED` com `connection: close`, sem o helper ler o corpo.
  Vale com e sem `Expect: 100-continue`; nenhuma conexão fica aberta 2 s depois da rajada.

- [ ] **Cliente que envia tudo antes de ler tem comportamento documentado**
  Com o `fetch` do Node mandando 5 MiB, o resultado (413 recebido ou `ECONNRESET`) é medido nas duas camadas e
  descrito no `docs/SECURITY.md`. O critério passa quando o documento diz o que foi medido; um `ECONNRESET` não o
  reprova, porque corpo acima do teto não é uso legítimo.

- [ ] **Recusa por JSON inválido não muda**
  Corpo abaixo do teto que não é JSON, ou corpo ausente, continua recebendo `400 VALIDATION_FAILED`, sem
  `connection: close`. O teste do helper prova a ausência do header.

- [ ] **Nenhum erro não tratado nas recusas**
  Durante as rajadas acima do teto, o log do servidor não mostra `unhandledRejection` nem `AbortError`. É a regressão
  do CA11 de `request-body-size-limit`.

- [ ] **Id inválido em `entities/[id]` responde 404**
  `GET`, `PUT` e `DELETE` com id contendo `/` (inclusive `%2F` e duas barras), reservado (`__x__`), `.`/`..` ou acima
  de 1 500 bytes UTF-8 respondem `404 ENTITY_NOT_FOUND`, nunca 500. O `PUT` responde 404 mesmo com corpo válido,
  sem gravar nada. Sem token, a resposta continua 401.

- [ ] **Id inválido em `users/[id]` responde 404**
  As mesmas formas de id, com credencial de admin, respondem `404 USERS_NOT_FOUND` em `GET`, `PUT` e `DELETE`. No
  `GET`, o fallback por uid também termina em 404, sem 500 e sem criar perfil.

- [ ] **`findById` não toca o Firestore com id inutilizável**
  `BaseRepository.findById` devolve `null` para qualquer id que `isUsableDocumentId` recuse, sem chamar
  `collection().doc()`. Um id de exatamente 1 500 bytes continua chegando ao Firestore.

- [ ] **Limite do id medido em bytes**
  `isUsableDocumentId` recusa 751 `é` (1 502 bytes) e aceita 750 (1 500 bytes); o mesmo vale para ASCII em 1 501 e
  1 500. O cursor de paginação herda a regra.

- [ ] **Ids válidos seguem funcionando**
  Leitura, edição e exclusão de uma entidade real e leitura e edição de um usuário real pelo admin respondem como
  antes (200/204). A suíte da `api` passa inteira.

- [ ] **Documentação descreve o comportamento medido**
  A subseção "Tamanho do corpo" do `docs/SECURITY.md` diz que o 413 fecha a conexão, por quê, onde foi medido
  (`next start`) e que na Vercel não foi medido. O `AGENTS.md` diz que `findById` devolve `null` para id que o
  Firestore recusa como caminho.

## 10. Blueprint técnico

### 10.1 `apps/api/(shared)/lib/parse-request-json.ts`

```ts
const refuse = (status: number, headers?: HeadersInit): ParsedJson => ({
    ok: false,
    response: Response.json(
        { error: { code: "VALIDATION_FAILED" } },
        { status, headers }
    ),
});

// The rest of an oversized body is never read, so Node would keep the keep-alive socket
// open waiting for it until requestTimeout. Closing it frees the socket right away.
const refuseTooLarge = (): ParsedJson =>
    refuse(HTTP_STATUS.PAYLOAD_TOO_LARGE, { connection: "close" });

export async function parseRequestJson(req: Request): Promise<ParsedJson> {
    if (exceedsDeclaredLength(req)) {
-       return refuse(HTTP_STATUS.PAYLOAD_TOO_LARGE);
+       return refuseTooLarge();
    }
    ...
        if (!bytes) {
-           return refuse(HTTP_STATUS.PAYLOAD_TOO_LARGE);
+           return refuseTooLarge();
        }
    ...
}
```

O comentário entra pela exceção 1 de `.claude/rules/code-comments.md` (restrição externa: o Node segura o socket).
O JSDoc de `:46-49` pode ganhar "and closes the connection on 413", se o `/develop` achar que ajuda.

### 10.2 `apps/api/(shared)/repositories/base.repository.ts`

```ts
+import { isUsableDocumentId } from "@/(shared)/lib/pagination";
 ...
     async findById(id: string): Promise<DTO | null> {
+        if (!isUsableDocumentId(id)) {
+            return null;
+        }
         const snap = await this.db.collection(this.table).doc(id).get();
```

`pagination.ts` não importa nada (conferido), então não há ciclo. A razão do `return null` já está no JSDoc de
`isUsableDocumentId` (`pagination.ts:13-17`); não precisa de outro comentário.

### 10.3 `apps/api/(shared)/lib/pagination.ts`

```ts
-const DOCUMENT_ID_MAX_LENGTH = 1500;
+const DOCUMENT_ID_MAX_BYTES = 1500;
 ...
     return (
         id.length > 0 &&
-        id.length <= DOCUMENT_ID_MAX_LENGTH &&
+        Buffer.byteLength(id, "utf8") <= DOCUMENT_ID_MAX_BYTES &&
```

### 10.4 Exemplos

```http
POST /auth/sign-in HTTP/1.1
transfer-encoding: chunked
content-type: application/json

<5 MiB>

HTTP/1.1 413 Payload Too Large
content-type: application/json
connection: close

{"error":{"code":"VALIDATION_FAILED"}}
```

```http
GET /entities/a%2Fb HTTP/1.1
authorization: Bearer <id token>

HTTP/1.1 404 Not Found
{"error":{"code":"ENTITY_NOT_FOUND"}}
```

### 10.5 Documentação

- **`docs/SECURITY.md`, subseção "Tamanho do corpo" (`:172-179`).** Depois da frase sobre soltar o stream sem
  cancelar (`:174`), acrescentar o fechamento da conexão. Rascunho, a ajustar ao que o `/test` medir:

  > A resposta 413 sai com `connection: close`. O helper não lê o resto do corpo, e sem esse header o Node manteria o
  > socket aberto esperando por ele até o `requestTimeout` (300 s por padrão). Medido em `next start`: 50 recusas de
  > 5 MiB seguidas, nenhuma conexão aberta 2 s depois. Um cliente que só lê a resposta depois de terminar de enviar
  > pode receber a conexão encerrada em vez do 413 [trocar pelo resultado medido]. Na Vercel não foi medido.

- **`AGENTS.md:46`.** Acrescentar ao fim: "`findById` devolve `null` para um id que o Firestore recusaria como caminho
  (com `/`, reservado, `.`/`..` ou acima de 1 500 bytes), então a rota responde o seu 404 em vez de 500."

### 10.6 Ordem de implementação e de commit

0. **Medir antes (smoke do `/develop`, no código de hoje):** emulador + `next start`, `GET /entities/a%2Fb` e
   `GET /users/a%2Fb` com credencial do seed. Esperado: 500. Registrar no handoff o status e a linha do log, e
   também o resultado de um id de 751 `é` (se o emulador não recusar, a §4.3 fica justificada só pela documentação).
1. `parse-request-json.ts` + `parseRequestJson.test.ts`.
2. `pagination.ts` + `base.repository.ts` + `paginationQuery.test.ts` + `baseRepository.test.ts`.
3. `docs/SECURITY.md` e `AGENTS.md`, depois das medições do `/test` para o texto final do R1. O `/develop` escreve o
   rascunho; o `/test` corrige a frase com o número medido.

Plano de commits sugerido ao `/review` (inglês, um assunto por commit, sem SDK nem i18n):

1. `fix(api): close the connection after a 413 body-cap refusal`
2. `fix(api): answer 404 for document ids Firestore refuses as a path`
3. `docs: describe the 413 connection close and findById on unusable ids`
4. `docs(features): api-edge-413-close-and-route-id`

O índice tem um `git mv` da auditoria (`specs/in-app-notifications.md` → `docs/features/in-app-notifications/spec.md`)
que não pertence a esta tarefa; o `/review` decide a qual commit ele vai, antes do primeiro.

### 10.7 Env e configuração

Nenhuma variável nova, nenhuma mudança de `next.config`, `proxy.ts` ou `requestTimeout`.

## Pré-requisitos manuais de infra

**Nenhum.** Não há variável, serviço, índice, rule nem configuração de provedor a criar. O que fica 🔒 (comportamento
na Vercel) não depende de ação manual para a entrega valer; não vira pendência em `docs/PRE-PRODUCTION.md`, só a
frase "não medido" no `SECURITY.md`.

## 11. Perguntas em aberto (decididas pela rodada autônoma)

1. **Onde validar o id?** Opções: `resolveIdFromContext` (sugestão do `/review` da PR #52), cada handler, ou
   `BaseRepository.findById`. **Adotada:** `findById` (§4.2). Porquê: é onde o driver lança, protege rotas, webhook
   e CRUDs futuros com uma linha, e não aplica regra de documento a ids que não são documento. A política do
   `/cycle` (§3, raiz em vez de workaround em 3+ lugares) vence a "menor superfície" das outras duas.
2. **Fechar a conexão também no 400?** **Adotada:** não. No 400 o corpo foi lido inteiro (ou não existia), e fechar
   só custaria um handshake a mais ao cliente legítimo que errou o JSON.
3. **Corrigir o limite em bytes de `isUsableDocumentId` nesta tarefa?** **Adotada:** sim (§4.3). É uma linha na peça
   que a tarefa adota, e o furo é do mesmo tipo (id que o Firestore recusa chegando ao driver). Alternativa
   descartada: registrar como achado, o que deixaria a correção desta tarefa incompleta de saída.
4. **Se o R1 aparecer (cliente recebe `ECONNRESET` em vez do 413), implementar leitura "lingering"?**
   **Adotada:** não; documentar o comportamento medido. Corpo acima de 100 KiB não é uso legítimo, e drenar com teto
   e prazo é mais código e mais tempo de socket preso, o oposto do objetivo. Se o usuário discordar, vira achado.

## 12. Decisões tomadas sem perguntar

| id | decisão | alternativa descartada | porquê |
|----|---------|------------------------|--------|
| D1 | `connection: close` só nas duas recusas 413, via `refuseTooLarge()` | header em toda resposta do helper | o 400 não deixa corpo pendente (§11.2) |
| D2 | guarda em `BaseRepository.findById` | `resolveIdFromContext` ou checagem por rota | §4.2 e §11.1 |
| D3 | limite de id em bytes UTF-8 | manter `id.length` | documentação do Firestore (§4.3) |
| D4 | manter a checagem própria de `notifications/[id]/read` | removê-la por redundância | ela evita a chamada ao repositório e tem 5 testes que afirmam isso (`notificationsRoute.test.ts:300-323`); remover é refatoração fora da tarefa |
| D5 | sem guarda em `update`/`delete` do `BaseRepository` | proteger todos os `doc(id)` | toda rota chama `findById` antes; mudança mínima |
| D6 | sem teste de rota novo para id inválido | um caso por rota com repositório mockado | seria tautológico (§7.4) |
| D7 | sem teste de emulador novo | caso em `*.emulator.test.ts` | a guarda age antes do driver; o fake com espião prova o curto-circuito, e o `/test` mede o driver real com `curl` |
| D8 | slug `api-edge-413-close-and-route-id` | outro nome | o sugerido pelo `/cycle` descreve as duas metades |

## 13. Riscos e hipóteses a medir

- **R1. `RST` em vez de 413** para cliente que só lê depois de enviar (§1.2). Medir no `/test` (§8, item 3). Não
  reprova a entrega; muda o texto do `SECURITY.md`.
- **R2. Algum proxy na frente do `next start`** (nginx, load balancer de fork que não usa a Vercel) pode bufferizar o
  corpo e tornar o header inócuo, ou removê-lo. Fora do que o repo controla; a frase do `SECURITY.md` diz onde foi
  medido.
- **R3. O emulador pode não recusar id acima de 1 500 bytes.** Nesse caso o critério de bytes fica provado só pelo
  teste unitário e pela documentação do Firestore (🔒 em produção).
- **R4. O 500 de hoje é leitura.** Se o smoke do passo 0 não reproduzir o 500, a guarda continua valendo (o driver
  lança com `doc("a/b")`, e o `/` chega ao handler, medido na PR #52), mas o handoff registra o que foi visto.
- **R5. `findById` que devolve `null` esconde erro de programação** (alguém montar caminho com `/` por engano). Hoje
  nenhum chamador faz isso (§1.3: `sessionDocId` codifica o uid); o teste de controle com 1 500 bytes impede que a
  guarda engula id válido.
