# Critérios de Aceite (Checklist)

Escopo: `POST /notifications/[id]/read` em `apps/api`. O diff não tem tela, então nenhum critério depende de
tema, responsivo ou idioma renderizado.

- [x] **Corrida entre leitura e escrita responde 404**
  Quando `findById` encontra a notificação não lida do dono e o documento some antes do `update`, a rota
  responde `404` com `{ error: { code: "NOTIFICATION_NOT_FOUND" } }`, nunca 500. O teste de rota faz
  `markRead` resolver `null` e confere status e corpo. Com a rota do HEAD no lugar, o mesmo teste reprova.

- [x] **`markRead` devolve `null` e não cria documento**
  Chamado com um id que não existe no Firestore, `markRead` resolve `null` e a coleção continua sem aquele
  id. O emulador confirma: o `update` cru rejeita com `code === 5` e, depois do `markRead`, `get()` devolve
  `exists === false`. Com o repositório do HEAD, o emulador reprova com
  `promise rejected "Error: 5 NOT_FOUND: no entity to update"`.

- [x] **Só o NOT_FOUND é absorvido**
  Qualquer outra rejeição do `update` (permissão, indisponibilidade, código diferente de `5`) continua
  subindo com o código original e vira 500, como antes. O teste do repositório rejeita com `code: 7`
  (PERMISSION_DENIED) e espera a mesma rejeição. O helper `isNotFoundError` aceita só `{ code: 5 }` e recusa
  `null`, `undefined`, `{}`, `{ code: 6 }`, `{ code: 7 }` e `{ code: "5" }`.

- [x] **O 404 da corrida não revela existência**
  A corrida usa o mesmo `notFound()` dos casos de id inutilizável, id ausente e notificação de outro dono:
  mesmo status e mesmo corpo. Quem chama não consegue distinguir "apagada agora" de "nunca foi sua".

- [x] **Comportamentos atuais preservados**
  Id inexistente no `findById`, notificação de outro dono, ids inutilizáveis (barra, reservado, `.`, `..`,
  acima do limite) e notificação já lida mantêm as respostas que já tinham, sem asserção alterada. O caso
  feliz devolve `{ data: { id, readAt } }` com o mesmo instante gravado em `readAt` e `updatedAt`.

- [x] **Escrita sob impersonação continua barrada**
  O guard barra o `POST` antes do repositório quando o admin está personificando
  (`notificationsRouteImpersonation.test.ts`), e esse teste segue verde na suíte da api.

- [x] **Sem mudança de contrato nem de i18n**
  O diff da tarefa não toca `packages/sdk`, `packages/internationalization` nem `apps/app`.
  `NOTIFICATION_NOT_FOUND` já existe em `apiErrors` nos 3 idiomas, e a paridade de i18n (67 testes) passa
  no gate da branch.

## Roteiro de teste manual

Não há roteiro manual útil. A corrida dura milissegundos entre duas chamadas ao Firestore e não se
reproduz clicando. A prova é a soma de duas metades automatizadas: a rota com `markRead` resolvendo `null`
(Vitest com mock) e o `markRead` contra o emulador.
