# Critérios de Aceite (Checklist)

Comportamento de `DELETE /account/sign-in-methods/password` quando a devolução do e-mail falha. A rota está no
painel comum (`requireCommonPanelApi`) e recusa a personificação antes de qualquer chamada ao Firebase. O modo
de produto (`subscription` × `simple`) não muda nada aqui. O diff não tem UI, então tema, responsivo e os três
idiomas ficam de fora: nenhum texto novo, nenhum `error.code` novo. O status medido de cada item está em
`test/report.md`.

- [ ] **CA1. Devolução passageira não deixa a conta sem e-mail**
  Quando a primeira chamada que devolve `email` e `emailVerified` falha e a segunda passa, a rota responde 204,
  sem corpo. As duas devoluções levam o mesmo `email` e o mesmo `emailVerified` lidos antes do desvínculo. As
  sessões são revogadas depois da devolução que passou, e nenhum `logEvent` sai.

- [ ] **CA2. Falha persistente revoga as sessões**
  Quando a devolução falha nas duas tentativas, `revokeUserSessions` recebe o `uid` do titular, depois da última
  tentativa. A senha já saiu, então as sessões acabam como no caminho feliz. Se a própria revogação falhar, a
  resposta não muda, porque `revokeUserSessions` engole o erro.

- [ ] **CA3. Falha persistente responde com o código que já existe**
  A resposta é `500` com `{ "error": { "code": "ACCOUNT_UPDATE_FAILED" } }`, sem código novo e sem mudança em
  `apiErrors`. O evento `account.signInMethod.unlink` continua na trilha, com `changedFields: ["password"]`,
  porque o desvínculo aconteceu.

- [ ] **CA4. Falha persistente fica registrada sem dado pessoal**
  A rota chama `logEvent("account", "password-unlink-email-restore-failed", ...)` com `uid`, `requestId`,
  `reason` e `attempts: 2`. O `reason` é o código do Admin SDK (por exemplo `auth/internal-error`) ou o nome do
  erro. O e-mail da conta e a mensagem do erro não aparecem em nenhuma chamada a `logEvent`.

- [ ] **CA5. Log e trilha carregam o mesmo `requestId`**
  Com o cabeçalho `x-request-id` na requisição, o `logEvent` da falha persistente e o `recordAuditEvent` do
  desvínculo recebem o mesmo valor. É esse par que permite achar, a partir da linha de log, o endereço a
  devolver no `targetLabel` do evento da trilha.

- [ ] **CA6. A linha impressa é uma só e não traz o endereço**
  Com o `logEvent` real, a falha persistente imprime exatamente
  `[account] password-unlink-email-restore-failed uid=<uid> requestId=<id> reason=<código> attempts=2`, numa
  linha. Uma mensagem de erro do provedor que contenha o e-mail e uma quebra de linha não chega à saída.

- [ ] **CA7. Só a devolução é repetida**
  Se o próprio desvínculo (`providersToUnlink`) falha, a rota responde `500 ACCOUNT_UPDATE_FAILED` depois de uma
  única chamada ao Admin SDK, sem trilha, sem revogação e sem log. Desvincular o Google segue igual: uma
  chamada, 204 e nenhuma revogação.

- [ ] **CA8. Caminho feliz da senha inalterado**
  Sem falha, a rota chama o Admin SDK exatamente duas vezes (desvínculo e devolução), grava a trilha, revoga as
  sessões depois da devolução e responde 204, sem log.

- [ ] **CA9. Conta sem e-mail pula a devolução e revoga**
  Numa conta sem `email` com dois métodos, desvincular a senha faz uma chamada só ao Admin SDK (o desvínculo),
  grava a trilha com o `displayName` no `targetLabel`, revoga as sessões e responde 204, sem log.

- [ ] **CA10. Recusas anteriores ao desvínculo inalteradas**
  Personificação (`403 AUTH_REQUEST_IMPERSONATION_FORBIDDEN`), titular divergente (403), id inválido ou provedor
  não vinculado (`404 ACCOUNT_SIGN_IN_METHOD_NOT_FOUND`) e último método (`409 ACCOUNT_SIGN_IN_METHOD_LAST`)
  respondem como antes, sem nenhuma chamada a `updateUser`.

- [ ] **CA11. O Firebase se comporta como a rota supõe**
  No emulador de Auth, desvincular a senha apaga `email` e zera `emailVerified` sem revogar o ID token aberto.
  Devolver o endereço numa segunda chamada traz os dois de volta e revoga o token. Sem a devolução, a chamada
  explícita a `revokeRefreshTokens` revoga o token, que é o estado em que a rota deixa a conta na falha
  persistente.

- [ ] **CA12. Teste rápido e prova contra a versão anterior**
  O arquivo de teste da rota não espera tempo real entre tentativas. Com a rota de `4b0be90`, os dois casos de
  falha da devolução falham; com a rota nova, passam.

- [ ] **CA13. Documentação de segurança atualizada**
  A entrada "Métodos de login" de `docs/SECURITY.md` diz que a devolução é tentada duas vezes, que na falha
  persistente as sessões acabam e a rota responde `500 ACCOUNT_UPDATE_FAILED`, e que o log traz `uid` e
  `requestId` para cruzar com o evento da trilha ou com a linha `[audit] write-failed`.

## Roteiro manual (só com falha injetada no Admin SDK)

A sequência no navegador depois do 500 não se reproduz sem forçar a falha da segunda chamada `updateUser`.
Quem tiver esse meio (um proxy na frente do Identity Toolkit, por exemplo) segue estes passos:

1. Entrar na app com `qa-password-unlink@example.com`, numa conta com senha e Google vinculados.
2. Abrir Conta → Segurança e desvincular a senha, com a segunda chamada `updateUser` forçada a falhar duas vezes.
3. Esperado: alerta com o texto de `ACCOUNT_UPDATE_FAILED` no idioma ativo, seguido da saída para o login, porque
   o `refreshAccount` do `onError` recebe 401 com a sessão revogada.
4. Entrar de novo pelo Google. Esperado: a conta não tem mais senha. Ninguém mediu se o login com Google
   devolve o e-mail à conta; se não devolver, o endereço está no `targetLabel` do evento da trilha.
