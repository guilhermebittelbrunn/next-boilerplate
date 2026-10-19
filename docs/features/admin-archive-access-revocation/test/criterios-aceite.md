# Critérios de Aceite (Checklist)

Feature: arquivar um usuário pelo admin tira o acesso dele. Os critérios CA1 a CA11 vêm da §9 do
`analyze/plan.md`; o CA12 e o CA13 foram acrescentados pelo `/test` para os dois desfechos de tela que o plano
não descrevia. Marcado com `[x]` é o que o `/test` mediu e passou. O status de cada item, com o meio usado, está
em `test/report.md`. A segunda rodada, depois da correção em `apps/app/shared/lib/googleSignInApi.ts`, mediu de novo
o CA8 e o CA13, que passaram.

- [x] **CA1. Arquivar desativa a conta e revoga as sessões antes do soft delete**
  O `DELETE /users/[id]` de um admin sobre outro usuário chama `updateUser(uid, { disabled: true })` e
  `revokeUserSessions(uid)` com o `reference_id` do perfil alvo, nessa ordem, antes de gravar `deletedAt`. Com
  assinatura viva, o cancelamento na Stripe vem antes de tudo. A resposta continua 204 sem corpo e o evento
  `user.delete` entra na trilha uma vez por arquivamento. No emulador, a conta fica `disabled: true` e o
  `validSince` avança.

- [x] **CA2. Falha na desativação não arquiva e responde `USERS_DELETE_AUTH_FAILED`**
  Se o Firebase Auth recusar a desativação por qualquer motivo que não seja conta inexistente, a rota responde
  503 com `{ error: { code: "USERS_DELETE_AUTH_FAILED" } }`. O perfil continua com `deletedAt: null` e nenhum
  evento de auditoria é gravado. O log registra só o `requestId` e o código do provedor
  (`reason=auth/invalid-uid`, por exemplo), nunca a mensagem. O admin vê o texto traduzido no toast em pt-br, en e
  es e pode tentar de novo. A segunda tentativa com a Stripe já cancelada só se mede com Stripe real.

- [x] **CA3. Conta que não existe mais no Auth é arquivada normalmente**
  Quando `updateUser` responde `auth/user-not-found`, o arquivamento segue: soft delete, evento de auditoria e
  204, sem chamar a revogação. Recusar deixaria um perfil órfão que nunca poderia ser arquivado.

- [x] **CA4. A ordem com o billing e com as recusas existentes é preservada**
  Com a Stripe desligada e assinatura viva (`status: "active"`), a rota responde 503
  `USERS_DELETE_BILLING_FAILED` e a conta continua habilitada. Arquivar a própria conta responde 403
  `USERS_SELF_LOCKOUT_FORBIDDEN`, e um id inexistente responde 404 `USERS_NOT_FOUND`, os dois sem tocar no Auth. O
  admin personificando alguém (`x-request-role: common`) recebe 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY` e o
  alvo continua habilitado e vivo.

- [x] **CA5. A sessão aberta de quem foi arquivado deixa de valer na hora**
  Uma conta logada no momento do arquivamento recebe 401 `AUTH_INVALID_TOKEN` na requisição seguinte, com o
  bearer antigo e com o cookie de sessão. A rota de sessão da app (`POST /api/auth/session`) recusa o ID token
  antigo com 401 e o proxy da app manda o cookie antigo para `/pt-br/sign-in`. O número de documentos `user` com
  aquele `reference_id` continua 1.

- [x] **CA6. Nenhum caminho de login recria perfil para um uid arquivado**
  `getMergedUserByUid` e `getMergedUserFromIdToken` devolvem `null` quando o uid não tem perfil vivo e tem um
  arquivado, sem chamar `createDefaultUserProfile`. `/auth/me` responde 401 `AUTH_INVALID_TOKEN`,
  `/auth/sign-in` responde 404 `USERS_NOT_FOUND` e o `GET /users/[id]` do admin por uid responde 404. O primeiro
  `/auth/me` de uma conta sem perfil nenhum continua criando um perfil `common`.

- [x] **CA7. A conta arquivada antes da correção é desativada no primeiro contato**
  Para um perfil arquivado cuja conta segue habilitada no Auth, o primeiro `/auth/me`, `/auth/sign-in`,
  `/auth/sign-in/google` ou `GET /users/[id]` por uid desativa a conta e revoga as sessões, além de responder como
  no CA6. Se essa desativação falhar, a resposta não muda, o perfil não é recriado, o erro vai para o log como
  `auth/archived-account-lockout-failed` sem PII e a próxima chamada tenta de novo. O caminho de falha só tem
  cobertura de unidade (M4): o emulador não deixa recusar o `updateUser` de uma conta que existe.

- [x] **CA8. Entrar pela app com conta arquivada não gera laço de redirecionamento**
  A pessoa arquivada antes da correção que entra pela tela de login termina na tela de login com o formulário
  utilizável, sem laço entre `/sign-in` e a home. Isso vale para e-mail e senha e para Google. Quem foi arquivado
  depois da correção nem passa do SDK do Firebase e vê "Esta conta foi desativada." em pt-br, "User disabled." em
  en e "Esta cuenta ha sido desactivada." em es, pelos dois métodos.

- [x] **CA9. Login com Google de conta arquivada não devolve sessão**
  `POST /auth/sign-in/google` para um uid sem perfil vivo responde 404 `USERS_NOT_FOUND`, com `error` como única
  chave do corpo, sem `session` e sem perfil novo. O login com Google de uma conta nova continua criando o perfil
  e devolvendo a sessão, e uma segunda entrada da mesma conta não cria um segundo perfil.

- [x] **CA10. `USERS_DELETE_AUTH_FAILED` tem texto nos 3 idiomas**
  O código existe em `apiErrors` em pt-br, en e es, e o teste de paridade de `@repo/internationalization` passa. O
  texto diz que o usuário não foi arquivado e que dá para tentar de novo, sem detalhe técnico do provedor. O toast
  acrescenta "(Código do erro: <requestId>)", o mesmo id que o log da API grava.

- [x] **CA11. Antes e depois medidos**
  No código anterior à correção (`4eeb07b`), arquivar e entrar de novo deixa a conta habilitada, o `/auth/me`
  responde 200 e um segundo documento `user` nasce para o mesmo uid. Depois da correção, o mesmo roteiro termina
  com a conta desativada, um documento só e 401. Os testes de unidade T1 a T4, M2, M4, M5 e G1 caem quando a
  correção é revertida, e o teste novo de emulador cai quando a leitura de `deletedAt` confunde `null` com campo
  ausente.

- [x] **CA12. A sessão aberta de uma conta legada termina parada no login**
  Com a conta logada na app e o perfil arquivado direto no Firestore (o estado das contas arquivadas antes da
  correção), abrir `/pt-br` gera um único redirecionamento HTTP para `/pt-br/sign-in`. O cliente não chama
  `POST /api/auth/session` nem navega por `window.location.replace`, e a tela fica no formulário de login por pelo
  menos 15 segundos. A conta termina `disabled: true` e o número de perfis continua 1.

- [x] **CA13. O login com Google de conta legada termina no formulário, com a mensagem de erro**
  Uma conta Google habilitada com perfil arquivado escolhe a conta no popup. A API responde 404 e desativa a
  conta, e a pessoa vê o toast "Usuário não encontrado." e o formulário de login de volta, pronto para outra
  tentativa, sem cookie de sessão. Uma segunda tentativa mostra "Esta conta foi desativada.". O botão do Google
  na tela de cadastro (`/pt-br/sign-up`) usa a mesma função e termina do mesmo jeito: toast e formulário de
  cadastro na tela. Uma conta Google com perfil vivo continua entrando normalmente.
