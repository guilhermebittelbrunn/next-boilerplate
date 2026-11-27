# Critérios de Aceite (Checklist)

Tarefa `notification-read-race`. Status medido no `/test` de 2026-11-27: ✅ medido e aprovado, ❌ falhou,
🔒 não verificado nesta rodada. O meio de cada medição está entre parênteses e o detalhe fica no
`report.md`.

- [x] **"Marcar todas como lidas" termina quando uma notificação some no meio do lote** ✅ (repositório com Firestore falso e emulador)
  Se um documento lido pela consulta de `markAllReadByUserId` for apagado (TTL em `expiresAt` ou expurgo da
  conta) antes do `batch.commit()`, o lote inteiro cai com gRPC `NOT_FOUND` (código 5) e nada é gravado. A
  passada perdida não soma em `updated`, a próxima passada relê a consulta sem o documento apagado e marca as
  restantes. Com três não lidas e uma apagada antes do primeiro commit, o método resolve com `2` e a contagem
  de não lidas termina em `0`. A rota `POST /notifications/read-all` deixa de responder 500 nesse caso.

- [x] **O lote real do Firestore rejeita com código 5 quando um documento some** ✅ (emulador)
  A correção parte da premissa de que o Admin SDK rejeita o lote com `code: 5` quando um documento do lote
  não existe mais no commit. O caso de emulador apaga um documento entre a leitura e o commit real do
  primeiro lote, guarda o erro e afirma `code: 5`. O mesmo caso confere que o documento apagado continua
  ausente e que as outras duas ficam lidas.

- [x] **Outro erro de commit continua subindo** ✅ (repositório com Firestore falso)
  Só `NOT_FOUND` é absorvido. Um erro como `PERMISSION_DENIED` (código 7) é relançado sem gravar nada, e a
  rota continua tratando apenas `isMissingIndexError`; o resto chega ao cliente como erro, igual a antes.

- [x] **`POST /notifications/read-all` mantém o contrato no caminho sem corrida** ✅ (HTTP contra a API de pé)
  A rota responde `200` com `{ data: { updated: N } }`, em que `N` é o número de não lidas da pessoa. Numa
  segunda chamada, sem não lidas, responde `200` com `updated: 0`. O formato do corpo não mudou, então o SDK
  e o hook `markAllRead` seguem sem alteração.

- [x] **"Marcar como lida" numa notificação apagada tira a linha do sino sem aviso** ✅ (hook e browser)
  Quando a rota `POST /notifications/:id/read` responde `404` com `error.code` `NOTIFICATION_NOT_FOUND`, o
  hook remove a linha de todas as páginas da lista em cache e não chama `errorAlert`. Nenhum toast aparece,
  nem "Notificação não encontrada.", e a linha não volta como não lida. A lista não é relida por causa do
  `404`.

- [x] **O contador fica com 1 a menos depois do `404`** ✅ (hook e browser)
  O desconto otimista feito no `onMutate` permanece, porque o servidor também não conta mais o documento
  apagado. O badge do sino passa de `N` para `N - 1` e não volta ao valor anterior. Se a notificação já
  estava lida ou a contagem não estava carregada, nada é descontado, como antes.

- [x] **Clique no título de uma notificação apagada navega sem aviso na página de destino** ✅ (browser)
  O título com link chama `markRead` antes de navegar. Com o documento apagado, a navegação acontece, a
  página de destino abre sem toast, o contador desconta 1 e, ao reabrir o sino, a linha não está mais lá.

- [x] **Erro que não é `NOTIFICATION_NOT_FOUND` mantém o comportamento antigo** ✅ (hook)
  Qualquer outra falha do `markRead` (rede, 500, outro código) passa por `restoreCache`: a linha volta a
  ficar não lida, o contador volta ao valor anterior e o `errorAlert` mostra a mensagem traduzida. O teste
  existente "desfaz e avisa quando a API recusa" segue passando sem mudança.

- [x] **A marca de lista velha sobrevive à remoção da linha** ✅ (hook)
  A remoção usa `writeList`, que preserva a marca de lista desatualizada. Lista ausente no cache continua
  ausente: o `setQueryData` não cria uma lista vazia.

- [x] **Marcar como lida uma notificação que existe continua igual** ✅ (browser)
  Controle do fluxo feliz: a rota responde `200`, a linha fica marcada como lida, sem toast, e o contador
  desconta 1.

- [ ] **Notificação de outra pessoa responde 404 e some do sino** 🔒 (leitura de código)
  A rota de `read` responde `404 NOTIFICATION_NOT_FOUND` também quando `row.userId` não é o
  `subjectProfile.id`, então a linha some do mesmo jeito. Na prática a lista só traz notificações da própria
  pessoa, e o caso só ocorre com manipulação. Não foi exercitado nesta rodada.

- [ ] **Sob personificação o botão continua desabilitado** 🔒 (leitura de código)
  O `readOnly` da personificação desabilita "Marcar como lida" e impede o `markRead` no clique do título
  (`NotificationItem.tsx`). Nada mudou nesse caminho, e ele não foi percorrido no browser nesta rodada.

- [x] **Layout do sino no mobile** ✅ (browser, 390 x 844, tema escuro)
  O sino usa o mesmo popover no mobile, com largura limitada à viewport. A remoção da linha apagada, a
  ausência de toast e o desconto do contador se repetem nessa largura. A tarefa não tem texto novo, então
  um idioma (pt-br) bastou.
