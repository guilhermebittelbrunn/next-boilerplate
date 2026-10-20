# Critérios de Aceite (Checklist)

Marcados `[x]` os critérios medidos nesta rodada do `/test` (2026-10-20). O status de cada um, com o meio e os
números, está em `report.md`. O único `[ ]` é o comportamento na Vercel, que ninguém mede sem a infra.

- [x] **Recusa por tamanho fecha a conexão (corpo em stream)**
  Um corpo acima de 100 KiB enviado sem `content-length` (`transfer-encoding: chunked`) recebe `413` com
  `{ "error": { "code": "VALIDATION_FAILED" } }` e o header `connection: close`. Em `next start`, depois de uma
  rajada de 50 recusas simultâneas de 5 MiB, nenhuma conexão fica ESTABLISHED quando as respostas já saíram,
  e nenhuma aos 60 s. Sem o header, 40 das 50 ficavam abertas aos 2 s e aos 60 s, até o `requestTimeout`
  do Node (300 s).

- [x] **Recusa por tamanho fecha a conexão (`content-length` declarado)**
  Um `content-length` acima do teto recebe `413 VALIDATION_FAILED` com `connection: close`, sem o helper ler o
  corpo. Vale com e sem `Expect: 100-continue`: com o `Expect`, o Node manda `100 Continue` antes do 413, e o
  413 continua com o header. Nenhuma conexão fica aberta 2 s nem 60 s depois da rajada de 50.

- [x] **Cliente que envia tudo antes de ler tem comportamento documentado**
  Com o `fetch` do Node mandando 5 MiB, o resultado é medido nas duas camadas e descrito no `docs/SECURITY.md`,
  incluindo a fração de tentativas que recebe `ECONNRESET` ou `EPIPE` em vez do 413. Um erro de socket não
  reprova o critério, porque corpo acima do teto não é uso legítimo. O critério passa quando o documento diz o
  que foi medido, inclusive o caso com latência e o que ficou sem medição (Vercel).

- [x] **Recusa por JSON inválido não muda**
  Corpo abaixo do teto que não é JSON (`{nope`), ou corpo ausente, continua recebendo `400 VALIDATION_FAILED`
  com `Connection: keep-alive`. Duas requisições seguidas pelo mesmo cliente reutilizam a mesma conexão. O
  teste do helper prova a ausência do header no 400.

- [x] **Nenhum erro não tratado nas recusas**
  Durante as rajadas acima do teto e as tentativas do `fetch`, o log do servidor não mostra
  `unhandledRejection` nem `AbortError`. É a regressão do CA11 de `request-body-size-limit`: o helper solta o
  stream sem cancelá-lo, e fechar a conexão não pode trazer o erro de volta.

- [x] **Id inválido em `entities/[id]` responde 404**
  `GET`, `PUT` e `DELETE` com id contendo `/` (`a%2Fb` e `a%2Fb%2Fc`), reservado (`__x__`) ou acima de 1 500
  bytes UTF-8 (751 `é`) respondem `404 ENTITY_NOT_FOUND`, nunca 500. O `PUT` responde 404 mesmo com corpo
  válido e não grava nada na coleção. `.`, `..`, `%2E` e `%2E%2E` não chegam ao handler: o Next responde o
  próprio 404 em HTML antes da rota, o que satisfaz "404, nunca 500"; a guarda de `.`/`..` no repositório é
  provada pelo teste unitário. Sem token, a resposta continua `401 AUTH_INVALID_TOKEN`.

- [x] **Id inválido em `users/[id]` responde 404**
  As mesmas formas de id, com credencial de admin, respondem `404 USERS_NOT_FOUND` em `GET`, `PUT` e `DELETE`.
  No `GET`, o fallback por uid também termina em 404, sem 500 e sem criar perfil (a coleção `user` tem o mesmo
  número de documentos antes e depois). Usuário comum na mesma rota recebe `403 ADMIN_FORBIDDEN`, porque o guard
  roda antes do id.

- [x] **`findById` não toca o Firestore com id inutilizável**
  `BaseRepository.findById` devolve `null` para qualquer id que `isUsableDocumentId` recuse, sem chamar
  `collection().doc()`. Um id de exatamente 1 500 bytes continua chegando ao Firestore. Por HTTP, o log do
  servidor não mostra `must point` nem `INVALID_ARGUMENT` depois das 30 chamadas com id inválido.

- [x] **Limite do id medido em bytes**
  `isUsableDocumentId` recusa 751 `é` (1 502 bytes) e aceita 750 (1 500 bytes); o mesmo vale para ASCII em
  1 501 e 1 500. `decodeCursor` herda a regra: um cursor que carrega 751 `é` decodifica como `null`, e um com
  750 devolve o id.

- [x] **Ids válidos seguem funcionando**
  Leitura de uma entidade real e de um usuário real pelo admin respondem 200. Uma entidade criada na hora
  responde 200 no `PUT`, mostra o nome novo no `GET` seguinte, responde 204 no `DELETE` e depois 404
  `ENTITY_NOT_FOUND`. A edição de um usuário real pelo admin responde 200. A suíte da `api` passa inteira.

- [x] **Webhook com `profileId` inválido não vira 500**
  Um evento assinado `checkout.session.completed` com `client_reference_id` `a/b` ou `__x__`, e um
  `customer.subscription.updated` com `metadata.profileId` `a/b`, respondem 200 `{ "ok": true }` e registram
  `[payments] webhook-profile-not-found` no log, sem reentrega da Stripe.

- [x] **Documentação descreve o comportamento medido**
  A subseção "Tamanho do corpo" do `docs/SECURITY.md` diz que o 413 fecha a conexão, por quê, os números
  medidos em `next start` (incluindo o custo para o `fetch` do Node) e que na Vercel nada foi medido. O
  `AGENTS.md` diz que `findById` devolve `null` para id que o Firestore recusa como caminho.

- [ ] **Comportamento na Vercel**
  Na Vercel, corpo acima de 4,5 MB é recusado pela plataforma antes do handler, e o que acontece com a conexão
  depois do 413 do helper, entre 100 KiB e 4,5 MB, não foi medido. Fica não verificado, sem pendência de infra,
  porque exige um deploy que este ciclo não faz.
