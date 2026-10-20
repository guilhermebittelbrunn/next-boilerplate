# Critérios de Aceite (Checklist)

Teto de 100 KiB (102 400 bytes) no corpo JSON lido pelo `parseRequestJson`, em `apps/api`. O helper roda
depois do guard de cada rota e não lê contexto de usuário, então comum, admin, personificação e não
autenticado recebem o mesmo tratamento; o modo de produto (`subscription` × `simple`) não muda nada. O diff
não tem UI: tema, responsivo e os três idiomas ficam de fora, e nenhum `error.code` novo aparece. Os dez
primeiros critérios vêm do plano. O CA11 e o CA12 foram acrescentados pelo `/test` na rodada 1, e o CA13 na
rodada 2, a partir do que a medição no servidor real mostrou. O status medido de cada item, com o meio de verificação, está em `test/report.md`.

- [x] **CA1. Corpo declarado acima de 100 KiB é recusado sem ser lido**
  Uma requisição com `content-length` maior que 102 400 a qualquer rota que usa `parseRequestJson` recebe
  `413` com `{ "error": { "code": "VALIDATION_FAILED" } }`. O corpo não é lido: no teste, `bodyUsed` continua
  `false`; no servidor, a resposta sai antes de o cliente terminar de enviar. Um `content-length` não numérico
  (`abc`), negativo ou ausente não conta como declaração e cai na medição do CA2.

- [x] **CA2. Corpo sem `content-length` é medido enquanto é lido**
  Com `transfer-encoding: chunked`, ou com um `content-length` menor que o corpo real, o helper soma os bytes
  de cada pedaço e para a leitura ao passar de 102 400, respondendo `413 VALIDATION_FAILED`. O stream não é
  drenado até o fim: um cliente que respeita backpressure fica parado logo depois do 413.

- [x] **CA3. O limite é inclusivo**
  Um corpo de exatamente 102 400 bytes com JSON válido é aceito e chega ao Zod da rota, com ou sem
  `content-length`. Com 102 401 bytes, a resposta é 413 nos dois modos de envio.

- [x] **CA4. JSON inválido e corpo ausente mantêm o comportamento anterior**
  `POST` sem corpo, JSON malformado e corpo já consumido continuam respondendo `400 VALIDATION_FAILED`, como
  antes da mudança. O `POST /payments/portal` sem corpo continua tratando o corpo como `{}`
  (`payments/portal/route.ts:23-25`).

- [x] **CA5. Decodificação igual à do `req.json()`**
  Um caractere multibyte partido entre dois pedaços do stream chega inteiro ao valor parseado. Um BOM no
  início é removido, e um byte UTF-8 inválido vira `U+FFFD`, como no `req.json()`.

- [x] **CA6. Rota pública recusa antes do provedor**
  `POST /contact`, com o canal ativo e um corpo acima do teto, responde `413 VALIDATION_FAILED` sem chamar o
  `sendEmail`, tanto pelo tamanho contado quanto pelo `content-length` declarado. Com o canal inativo,
  continua `503 CONTACT_UNAVAILABLE` sem ler o corpo. Uma mensagem de 5001 caracteres (dentro do teto de
  bytes, fora do Zod) continua `400 VALIDATION_FAILED`.

- [x] **CA7. Webhook e upload não mudam**
  `POST /webhooks/payments` continua lendo o corpo cru com `request.text()`, sem o nosso teto, e `POST /files`
  continua com o teto próprio de 4 MiB de `file.schema.ts`. As suítes `paymentsWebhookRoute.test.ts`,
  `fileUploadRoute.test.ts` e `uploadedImageValidation.test.ts` passam sem alteração.

- [x] **CA8. Nenhum chamador quebra**
  Os 22 handlers que chamam o helper seguem com as suítes verdes sem edição, incluindo as das outras duas
  tarefas da PR. Nenhum arquivo de rota é editado por esta tarefa.

- [x] **CA9. Sem copy nova**
  `VALIDATION_FAILED` já existe em `apiErrors` nos três idiomas, então o teste de paridade de i18n não muda.
  Um cliente que receba o 413 mostra "Dados inválidos." / "Invalid data." / "Datos no válidos.", porque o
  `FormattedError` traduz pelo `error.code` sem olhar o status.

- [x] **CA10. Documentação conferida contra o código**
  O `docs/SECURITY.md` descreve o teto, as duas camadas, as rotas fora do helper e os tetos da plataforma. A
  frase da `:160` diz dez das treze rotas de `/account` fora do rate limit, com a lista atual.

- [x] **CA11. Recusa pelo stream não deixa erro não tratado no servidor**
  Quando o helper para a leitura de um corpo acima do teto (CA2), o servidor do Next não registra
  `unhandledRejection` nem outro erro: o 413 é uma resposta prevista, não uma falha. Uma rota pública sem
  `ARCJET_KEY` aceita requisições sem limite, então cada linha de erro por requisição vira volume de log que
  qualquer pessoa sem credencial consegue gerar.

- [ ] **CA12. Tetos da plataforma**
  Na Vercel, corpo acima de 4,5 MB é recusado antes do handler, sem `error.code`. No `next start`, com
  `proxy.ts`, o Next guarda até 10 MiB do corpo e trunca o resto. Os dois comportamentos são da plataforma e
  não mudam com este diff; ficam como não verificáveis sem a infra e não reprovam a tarefa.

- [ ] **CA13. Conexão recusada pelo teto é encerrada**
  Depois do 413 da camada do stream, o servidor fecha a conexão em vez de deixá-la aberta com o resto do corpo
  parado na fila do socket. Sem isso, cada corpo grande recusado prende um descritor de arquivo e o buffer do
  kernel até o `requestTimeout` do Node (300 s por padrão), e o RSS do processo cresce enquanto essas conexões
  existem. Com o helper anterior ao teto, que lia o corpo inteiro, a conexão fechava ao fim da resposta.
