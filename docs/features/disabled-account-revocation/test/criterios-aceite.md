# Critérios de Aceite (Checklist)

Conta desativada pelo admin deixa de valer na API na hora. Os itens marcados foram medidos no `/test` de
2026-09-30, parte em teste de unidade e parte contra o projeto Firebase de desenvolvimento, com a API rodando
e uma conta de QA. O meio e o valor observado de cada um estão em `report.md`. O item desmarcado não foi
percorrido no navegador; o motivo também está no relatório.

- [x] **Bearer de conta desativada é recusado pelas rotas com guard**
  Com a conta desativada no Firebase Auth e um ID token emitido antes da desativação, ainda dentro da validade
  de 1 hora, qualquer rota protegida por `requireAdminApi` ou `requireCommonPanelApi` responde
  `401 { error: { code: "AUTH_INVALID_TOKEN" } }`. Antes da mudança a mesma requisição resolvia o usuário e
  respondia 200. `GET /auth/me`, que não usa guard e passa por `getMergedUserFromIdToken`, também passa a
  responder 401. O caso vale para conta comum e para conta admin desativada por outro admin.

- [x] **A recusa não depende de revogação**
  Mesmo que a revogação de sessões falhe ou não aconteça (conta desativada direto no console do Firebase, por
  exemplo), `getCurrentUser` devolve `null` para `disabled: true`. O teste de unidade usa um token emitido
  depois da marca de revogação para provar que a recusa vem de `disabled`, e não de `tokensValidAfterTime`.
  Contra o projeto real, a conta desativada só pelo Admin SDK, sem revogação, recebe 401 no bearer antigo.

- [x] **Conta ativa segue funcionando**
  Com `disabled: false` ou ausente no `UserRecord`, `getCurrentUser` devolve o usuário como antes, e os casos
  de revogação que já existiam em `serverSessionRevocation.test.ts` continuam passando sem alteração. Uma conta
  reativada sem revogação volta a aceitar o bearer que tinha.

- [x] **Nenhuma chamada nova ao Firebase por requisição**
  `getCurrentUser` continua fazendo exatamente um `verifyIdToken` sem `checkRevoked` e um `getUser`. O teste
  confere que `verifyIdToken` recebe um único argumento, o token, e que o usuário é buscado uma vez.

- [x] **Desativar pelo admin revoga as sessões da conta**
  `PUT /users/:id` com `disabled: true` chama `revokeUserSessions` com o `reference_id` do perfil alvo (o uid do
  Firebase), uma única vez, depois do `updateUser` e antes do evento de auditoria. A resposta segue 200 com o
  usuário mesclado, e o evento `USER_UPDATE` é gravado com `changedFields: ["disabled"]`, sem valor. Contra o
  projeto real, o `tokensValidAfterTime` da conta avança na desativação.

- [x] **Outras edições não revogam**
  `PUT` com `disabled: false`, só com `displayName`, só com `type`, ou com `type` e `displayName` juntos não
  chamam `revokeUserSessions`. Reativar uma conta não encerra sessão nenhuma, porque ela não tem sessão viva:
  contra o projeto real, o `tokensValidAfterTime` não muda na reativação.

- [x] **Falha e recusa não revogam**
  Se o `updateUser` lançar, a rota lança como antes e nada é revogado nem auditado. Perfil inexistente responde
  `404 USERS_NOT_FOUND` e patch vazio responde `400 USERS_NOTHING_TO_UPDATE`, os dois sem revogar. Corpo com
  `disabled` de tipo errado responde `400 VALIDATION_FAILED`. Usuário comum que tenta o `PUT` recebe
  `403 ADMIN_FORBIDDEN` e requisição sem bearer recebe `401 AUTH_INVALID_TOKEN`; nos dois casos a conta alvo
  não muda.

- [x] **Reativar não ressuscita a sessão antiga**
  Depois de desativar e reativar pelo `PUT`, o ID token emitido antes da desativação continua recusado com
  `401 AUTH_INVALID_TOKEN`, pela marca de revogação. A pessoa precisa entrar de novo, e o login novo funciona.
  Enquanto a conta está desativada, o login por senha é recusado pelo Firebase com `USER_DISABLED`.

- [x] **Recusa sem ruído no log**
  Com a conta desativada, o bearer recusado por `getCurrentUser` cai no fallback
  `getUserFromSessionCookie(bearer)` de `resolveApiActor`. O Firebase rejeita o ID token como cookie de sessão
  com um código que o pacote trata como benigno, e a API não registra `console.error` em nenhuma das
  requisições recusadas.

- [ ] **Quem é desativado é levado ao sign-in e vê a mensagem certa**
  Com o app aberto, a próxima chamada à API volta 401 e a próxima navegação cai no sign-in pelo `proxy.ts`. Ao
  tentar entrar, o formulário mostra "Esta conta foi desativada." (pt-br), "User disabled." (en) e "Esta
  cuenta ha sido desactivada." (es), textos que já existem. Nenhuma tela ou chave nova. O diff não toca UI, e o
  caminho do 401 é o mesmo que a revogação de sessão já dispara.

- [x] **Os documentos descrevem o comportamento novo**
  `docs/INCIDENT-RESPONSE.md` diz que desativar revoga as sessões e que a API recusa o bearer na hora, e a
  linha "Revogar a sessão de outro usuário" aponta desativar e reativar como saída. O achado em
  `specs/account-security-mfa.md` aparece como corrigido, sem afirmar nada que o código não faça. Os
  `arquivo:linha` citados nesses trechos batem com o código final, e a frase do runbook sobre a medição contra
  o projeto de dev descreve a medição desta rodada.

- [x] **Nenhum teste depende do emulador**
  Os testes novos rodam em `pnpm turbo run test`, sem JDK nem emulador, e caem quando a correção é removida:
  2 falhas ao tirar `user.disabled ||` de `server.ts` e 2 falhas ao tirar a chamada de `revokeUserSessions` da
  rota.
