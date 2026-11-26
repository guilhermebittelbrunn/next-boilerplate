# Critérios de Aceite (Checklist)

Tarefa `auth-revocation-failure`. O status por item, com o meio de prova, está em `test/report.md`.

- [x] **Desvincular a senha com revogação recusada responde 500 AUTH_SESSIONS_NOT_REVOKED**
  Com a senha e o Google na conta, a devolução do e-mail bem-sucedida e o Firebase recusando
  `revokeRefreshTokens`, `DELETE /account/sign-in-methods/password` responde `500` com
  `{ error: { code: "AUTH_SESSIONS_NOT_REVOKED" } }`. A senha continua desvinculada, o evento
  `account.signInMethod.unlink` é gravado e o log `[auth] session-revoke-failed` sai com o `requestId` e o
  código do provedor, nunca com a mensagem. A tela não desloga, recarrega a conta e mostra a mensagem
  traduzida que manda usar "Sair de todos os dispositivos", em pt-br, en e es.

- [x] **Falha da devolução do e-mail continua prevalecendo**
  Se a devolução do e-mail falha nas duas tentativas, a resposta é `500 ACCOUNT_UPDATE_FAILED` e o log
  `[account] password-unlink-email-restore-failed` sai, com ou sem falha da revogação. A revogação é
  tentada mesmo assim, depois da devolução.

- [x] **Desvincular sem falha segue respondendo 204**
  Com a revogação aceita, desvincular a senha responde `204` e a tela desloga. Desvincular o Google
  continua `204` sem chamar a revogação. Impersonação continua recusada com
  `403 AUTH_REQUEST_IMPERSONATION_FORBIDDEN` antes de qualquer escrita.

- [x] **Admin desativa a conta e a revogação falha**
  `PUT /users/:id` com `disabled: true` e revogação recusada responde `500 USERS_SESSIONS_NOT_REVOKED`. A
  conta fica desativada no Firebase Auth, o `type` enviado junto fica gravado e o evento `user.update` é
  gravado com `changedFields` contendo `disabled`. A ordem é desativar, revogar, auditar.

- [x] **Toggle de status mantém "desativado" quando só a revogação falhou**
  No admin, ao desligar o switch da lista e receber `USERS_SESSIONS_NOT_REVOKED`, o switch continua
  desligado, o cache da lista e do detalhe mantém `disabled: true` e aparece o alerta com a mensagem
  traduzida nos três idiomas. Para qualquer outro erro o switch volta a ligar. O `PUT` sai uma vez só.
  Reativar (`disabled: false`) não chama a revogação.

- [x] **Arquivar usuário com revogação recusada não arquiva**
  `DELETE /users/:id` com a desativação aceita e a revogação recusada responde
  `503 USERS_DELETE_AUTH_FAILED`, o perfil não é arquivado e nenhum evento de arquivamento é gravado.
  Repetir a ação com a revogação aceita arquiva normalmente. Uma conta que some do Firebase Auth entre a
  desativação e a revogação é arquivada.

- [x] **Conta arquivada no primeiro contato continua sem perfil**
  Quando uma conta com perfil arquivado entra de novo e a revogação falha, `findOrCreateProfile` devolve
  `null` e grava um único `[auth] archived-account-lockout-failed`. Nenhum perfil novo é criado.

- [x] **Expurgo da conta não muda**
  No passo `authAccount`, uma revogação recusada é registrada em log e `deleteUser` roda em seguida. O passo
  só reporta `failed` se `deleteUser` falhar.

- [x] **Mensagem nova nos três idiomas**
  `USERS_SESSIONS_NOT_REVOKED` existe em `apiErrors` em pt-br, en e es, e o teste de paridade passa. A
  mensagem diz que a conta foi desativada, que as sessões abertas não foram encerradas e que, enquanto a
  conta continuar desativada, a pessoa não entra.

- [ ] **Devolver o e-mail no desvincular revoga os refresh tokens do Firebase (não verificado)**
  A documentação deixou de afirmar isso e passou a dizer "não foi medido". Medir exige o emulador de Auth
  ou um projeto de dev com sessão real e a devolução do e-mail executada de verdade. Fica em aberto como
  pergunta do plano, sem bloquear a tarefa, porque a rota agora revoga explicitamente e reporta a recusa.
