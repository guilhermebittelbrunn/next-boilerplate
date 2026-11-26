# Revisão: falha da revogação de sessões nos chamadores restantes

Rodada autônoma do `/cycle`, 2026-11-26. Escopo: os arquivos listados no `develop/handoff.md`. As outras quatro
tarefas do working tree (`app-form-layout-centered`, `admin-own-account`, `app-test-suite-stability`,
`account-avatar-polish`) já tinham revisão e não foram revistas aqui.

## Branch

- Atual: `guilhermebittelbrunn/claude-cycle-full-pipeline`. **Reprova** no regex do Passo 3 de
  `.claude/commands/review.md` (prefixo `guilhermebittelbrunn` não é projeto, e falta o `type`). Sem upstream
  (`git rev-parse @{u}` falha) e sem commit à frente de `origin/main`.
- Esta rodada não cria nem renomeia branch (regra do `/cycle`). A troca fica para o `/review`, em
  "Decisões em aberto".
- Proposta: `feat/admin-account-forms-and-session-revocation`, que passa no regex. Com cinco tarefas,
  `feat/admin-account-and-centered-forms` (proposta anterior, também válida) deixa de fora a correção de
  segurança desta tarefa, que é a única mudança de comportamento da API fora da área de conta do admin.
  Sem prefixo de projeto porque o diff toca `api`, `app`, pacotes e docs.

## Revisão: auth-revocation-failure

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/api/(shared)/lib/session-revocation.ts:15-17`: o log `[auth] session-revoke-failed` do
  `revokeSessionsOrReport` grava só o `requestId`. Antes desta tarefa, A (desvincular a senha) e B (admin
  desativa) passavam por `revokeUserSessions`, que grava o código do Firebase
  (`packages/auth/server.ts:362-364`, `authErrorFields`). A recusa agora chega ao cliente, mas o operador perde
  o motivo no log dessas duas rotas. **Corrigido depois da revisão** pelo `/develop` (seção "Ajuste
  pós-review" do handoff): o helper grava `requestId` mais `code` ou `reason`, e três testes travam o payload.
  Relido: a linha não carrega e-mail, uid nem token, só o `requestId` e o código do provedor ou o nome do erro;
  a mensagem do erro nunca entra. A versão do `/develop` copiava a extração do código que a API já tem em
  `toolkit-error-codes.ts` (`adminErrorCodeOf`, `adminAuthErrorReason`, com o mesmo contrato de nunca logar a
  mensagem). Troquei a cópia pelo reuso: `adminErrorCodeOf` passou a ser exportada e
  `session-revocation.ts:25-32` usa as duas. A saída é idêntica (`{ code }` quando há código, senão
  `{ reason: error.name }`), então os testes ajustados pelo `/develop` continuam valendo sem mudança.

### 🟢 Sugestão / nit

- `packages/internationalization/translations/packages/shared/utils.ts:61` (e `:247`, `:435`): a copy
  reaproveitada de `AUTH_SESSIONS_NOT_REVOKED` diz "Entre de novo e use 'Sair de todos os dispositivos'". No
  desvincular da senha a sessão atual não foi encerrada (a revogação falhou), então a pessoa não precisa entrar
  de novo para achar o botão. A instrução continua executável e o plano escolheu reaproveitar o código; fica
  como nota.
- Âncoras velhas encontradas no caminho e corrigidas (anteriores a esta tarefa, nas mesmas linhas ou arquivos
  que ela já editava): `docs/INCIDENT-RESPONSE.md:50` e `docs/SUBPROCESSORS.md:32` apontavam
  `packages/auth/server.ts:353-355`, que começa no fim do JSDoc; o `revokeUserSessionsOrThrow` está em
  `:354-356`. `docs/BACKUP.md:96` apontava `base.repository.ts:225-226` (`updateBulk`); o `delete` que grava
  `deletedAt` está em `:229-230`.
- Âncoras em `specs/` que esta tarefa deslocou ou fecha ficam para o `/spec --sync`:
  `specs/features/account-security-mfa.md:344` (`users/[id]/route.ts:154-156`, hoje `:158-160`) e o achado
  "Os quatro chamadores que ainda engolem a falha da revogação" em `specs/reference/AUDIT.md:345`, que esta
  tarefa resolve.

### ✅ OK

As perguntas de segurança da rodada, conferidas no código:

- **A, desvincular a senha.** `account/sign-in-methods/[id]/route.ts:124` troca a chamada que engolia a recusa
  por `revokeSessionsOrReport`, e `:139-141` responde `500 AUTH_SESSIONS_NOT_REVOKED`. A precedência do
  `ACCOUNT_UPDATE_FAILED` (`:126-137`) se mantém, e nesse caso a recusa sai no log. O comentário removido
  afirmava que o Firebase revoga os refresh tokens na devolução do e-mail, o que nunca foi medido; a remoção
  está certa e o comentário que ficou (`:123`) diz o porquê da revogação.
- **B, admin desativa.** `users/[id]/route.ts:154-156` desativa no Auth antes de tudo e lança se o Firebase
  recusar (comportamento anterior). A revogação vem em `:158-160`, a auditoria em `:162-172` e só depois o
  `500 USERS_SESSIONS_NOT_REVOKED` (`:176-178`). A conta continua desativada de fato: o cookie de sessão é
  verificado com `checkRevoked: true` (`packages/auth/server.ts:324-327`), que recusa conta desativada, e o
  bearer cai em `user.disabled` (`packages/auth/server.ts:200`). O corpo do 500 é só `{ error: { code } }`
  (`session-revocation.ts:29-32`) e o log não carrega mensagem do provedor. No app, `useUserCrud.tsx:118-122`
  mostra o alerta e sai antes do rollback; qualquer outro código ainda reverte.
- **Sem repetição do `PUT`.** O interceptor do SDK só age em 401 (`packages/sdk/src/client/base.ts:81-90`), e
  o `QueryProvider` só configura `retry` para queries (`apps/app/shared/providers/QueryProvider.tsx:17-25`);
  mutation não repete por padrão no React Query. Um 500 não duplica o evento de auditoria. Isso estava na lista
  "A verificar no `/test`" do handoff e sai dela.
- **C, arquivar.** `account-access.ts:12-21` lança quando a revogação é recusada. O `DELETE`
  (`users/[id]/route.ts:225-236`) responde `503 USERS_DELETE_AUTH_FAILED` sem soft delete nem auditoria e
  loga só `adminAuthErrorReason`. `user-merge.ts:62-67` captura, loga `archived-account-lockout-failed` e
  devolve `null`, então nenhum perfil novo nasce para a conta arquivada.
- **Desvio 1 é seguro.** O `auth/user-not-found` só é tratado como conta inexistente quando vem do Firebase
  Auth, e `revokeRefreshTokens` só devolve esse código quando o uid não existe mais. Como o `updateUser` acabou
  de passar com o mesmo uid, o caso é a conta apagada entre as duas chamadas, e conta apagada não tem sessão
  que sobreviva (a verificação do cookie carrega o usuário). Qualquer outro código relança (`:20`). Não há
  caminho para arquivar uma conta que existe sem revogar.
- **D, expurgo.** `account-erasure.ts:236-239` continua com a revogação best-effort seguida de `deleteUser`.
  Está certo: com a conta apagada nenhuma sessão passa, e se o `deleteUser` falhar o passo `authAccount` sai
  como falho no relatório do expurgo.
- **Comentários.** O novo em `users/[id]/route.ts:174-175` e o de `useUserCrud.tsx:118` explicam por que não
  há rollback, são autocontidos e não citam o fluxo (`.claude/rules/code-comments.md`).
- **i18n.** `USERS_SESSIONS_NOT_REVOKED` existe nos três idiomas (`utils.ts:36-37`, `:222-223`, `:409-410`),
  depois de `USERS_DELETE_AUTH_FAILED`, no mesmo tom das mensagens vizinhas do admin. A frase "enquanto a conta
  continuar desativada, ele não consegue entrar" bate com o código acima.
- **Docs.** Todas as âncoras que a tarefa mudou foram remedidas com `sed -n`: `users/[id]/route.ts:50-52`,
  `:83`, `:117`, `:138-140`, `:151-156`, `:158-160`, `:176-178`, `:185`, `:197-199`, `:201-206`, `:226`, `:238` e
  `user-merge.ts:56-72` apontam para o código descrito. As afirmações novas de `SECURITY.md:12` e
  `INCIDENT-RESPONSE.md:51-52` batem com a leitura acima.
- **Arquivos compartilhados.** Nenhum arquivo desta tarefa aparece no plano das outras quatro, e os diffs de
  `docs/*.md`, `utils.ts` e dos testes só têm hunks desta tarefa.
- **Testes por leitura.** Os testes novos de B e C conferem ordem, status, ausência de soft delete e de
  auditoria, e que a mensagem do provedor não vaza no log (`usersAdminArchiveAccess.test.ts`). O teste do app
  cobre os três idiomas e o rollback para outro código.

### 👁 Verificar no `/test`

Não há forma barata de forçar a recusa de `revokeRefreshTokens` em dev: o emulador de Auth não falha a
chamada sob demanda, e apagar a conta gera `auth/user-not-found`, que o `PUT` já recusa no `updateUser`. Por
isso, nada nesta tarefa justifica abrir browser.

- O painel de métodos de login, com `500 AUTH_SESSIONS_NOT_REVOKED` no desvincular, não sai da conta, recarrega
  os métodos e mostra a mensagem. Lido em `useSignInMethodMutations.tsx:71-74` (o `onError` chama
  `refreshAccount` e `alertUnlessDismissed`), sem medição. Repro: teste de hook com
  `apiClient.account.unlinkSignInMethod` rejeitando um `AxiosError` 500 com esse código; conferir
  `refreshAccount` chamado, alerta com a copy do idioma e nenhum `signOut`.
- O switch da lista de usuários continua desligado (conta desativada) depois do 500. O teste de hook prova o
  cache, não a renderização. Repro: teste de componente da listagem com o hook real e o `apiClient` mockado.
- 🔒 Se o Firebase revoga os refresh tokens ao receber o e-mail de volta no desvincular da senha. Exige
  emulador ou projeto de dev com sessão real; não é para este `/test`.
- Rodar os 11 testes novos e os afetados (5 arquivos da API, o teste novo do app) e a suíte dos dois apps.

## Correções aplicadas

| arquivo | o que mudou |
|---------|-------------|
| `docs/INCIDENT-RESPONSE.md:50` | `packages/auth/server.ts:353-355` passa a `:354-356` |
| `docs/SUBPROCESSORS.md:32` | `packages/auth/server.ts:353-355` passa a `:354-356` |
| `docs/BACKUP.md:96` | `base.repository.ts:225-226` passa a `:229-230` |
| `apps/api/(shared)/lib/toolkit-error-codes.ts:79` | `adminErrorCodeOf` passa a ser exportada |
| `apps/api/(shared)/lib/session-revocation.ts:5`, `:25-32` | `revokeFailureFields` usa `adminErrorCodeOf` e `adminAuthErrorReason` em vez de repetir a extração do código |

## Raio de impacto

- SDK: nada mudou.
- `sessionsNotRevokedResponse(code?)`: default igual ao anterior; `account/password`, `account/password/set` e
  `auth/email-change/confirm` continuam respondendo `AUTH_SESSIONS_NOT_REVOKED`.
- `revokeAccountAccess` passa a lançar na recusa. Chamadores: `DELETE /users/:id` (já tratava) e
  `user-merge.ts` (já capturava). Nenhum outro em `apps/` ou `packages/`.
- `revokeUserSessions` (best-effort) fica com um único chamador, o expurgo.
- Código novo `USERS_SESSIONS_NOT_REVOKED`: lido só por `useUserCrud.tsx`.
- `adminErrorCodeOf` passa a ser exportada de `toolkit-error-codes.ts`; o comportamento dela não mudou e o único
  importador novo é `session-revocation.ts`.

## Lacunas de teste

- Teste de componente do painel de métodos com `AUTH_SESSIONS_NOT_REVOKED`: continua aberta (primeiro item de
  "Verificar no `/test`").
- `PUT` com `disabled: true` e `updateUser` recusado: fora de escopo. O comportamento é anterior à tarefa e já
  tem o teste "does not revoke when Firebase Auth fails".
- Payload do log `session-revoke-failed` com o código do provedor: fechada pelo ajuste pós-review
  (`accountSignInMethodsRoute.test.ts`, `authEmailChangeConfirm.test.ts`, `usersAdminAuditTrail.test.ts`).

## Decisões em aberto

1. Resolvida: o código do Firebase voltou ao log de `revokeSessionsOrReport` (ver achado 🟡).
2. Nome da branch. A atual reprova no regex. Recomendo `git switch -c feat/admin-account-forms-and-session-revocation`
   antes do primeiro commit (ou `git branch -m`, já que não há upstream nem commit). Alternativa: manter a
   proposta anterior, `feat/admin-account-and-centered-forms`.
3. As três perguntas do plano seguem abertas: repetir só a revogação pelo painel do admin; avisar na copy de
   `USERS_SESSIONS_NOT_REVOKED` para não reativar a conta; medir se a devolução do e-mail revoga os refresh
   tokens.

## Gates estáticos

| gate | resultado |
|------|-----------|
| `pnpm check` | rodado depois do reuso do helper: 1151 arquivos, sem erro |
| typecheck `api` | rodado depois do reuso do helper: 1/1 task ok |
| typecheck `app` | não remedido (o app não mudou aqui); handoff: ok |
| suíte da API | não rodada aqui; o `/develop` mediu 1859/1859 antes do reuso, que não muda a saída. Fica para o `/test` |
| paridade i18n | não remedida (nenhuma chave mudou aqui); handoff: 7 arquivos, 67 testes |

## Plano de commits

Plano combinado das cinco tarefas, renumerado (30 commits). Os 23 de
`docs/features/account-avatar-polish/review/review.md` mantêm conteúdo e ordem relativa; esta tarefa entra
como 10, 11, 12, 20, 22, 25 e 30, cada um no grupo do seu projeto. Os commits 13 e 14 (antigos 10 e 11) usam
`git add -p`. Antes do primeiro: `git diff --cached --stat` vazio (conferido nesta revisão: vazio).

O commit 20 (app) lê `USERS_SESSIONS_NOT_REVOKED` antes do commit 22, que cria a chave. Entre os dois, o teste
`useUserCrudSessionsNotRevoked.test.tsx` não passa e o typecheck do app acusa a chave ausente. É o mesmo padrão
do commit 17 (página do admin) contra o 21 (copy do admin) e se resolve no fim da série.

1. `docs(specs): audit backlog against b7f9124`
   - `specs/BACKLOG.md`, `specs/reference/AUDIT.md`
   - `specs/features/account-security-mfa.md`, `specs/features/admin-own-account.md`,
     `specs/features/app-form-layout-centered.md`, `specs/features/signup-email-verification.md`,
     `specs/features/social-sign-in-providers.md`
   - `specs/reference/research/compliance-trust-baseline.md`, `specs/reference/research/object-storage-costs.md`,
     `specs/reference/research/saas-starter-feature-benchmark.md`
2. `test(e2e): retry action menu trigger until the row dropdown hydrates`
   - `apps/e2e/tests/focusNotObscured.spec.ts`
3. `feat(app): center the narrow page column`
   - `apps/app/shared/components/ui/pageLayout.ts`, `apps/app/__tests__/pageShell.test.tsx`
4. `feat(app): size full-page forms and account panels to their content`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/edit/[id]/EditEntityClient.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountBillingPanel.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPrivacyPanel.tsx`
5. `feat(app): add narrow loading skeletons to the create and edit form pages`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/loading.tsx`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/loading.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/loading.tsx`
   - `apps/app/__tests__/formLoadingSkeletons.test.tsx`
6. `docs(app): document centered narrow pages and content-height forms`
   - `apps/app/CLAUDE.md`
7. `feat(api): add requireOwnAccountApi guard for the caller's own account`
   - `apps/api/app/(guards)/common-panel.ts`
   - `apps/api/__tests__/ownAccountGuard.test.ts`, `apps/api/__tests__/impersonationReadOnly.test.ts`
8. `feat(api): open the own-account routes to the admin`
   - `apps/api/app/(routes)/account/route.ts`, `apps/api/app/(routes)/account/password/route.ts`,
     `apps/api/app/(routes)/account/password/set/route.ts`
   - `apps/api/__tests__/accountRoute.test.ts`, `apps/api/__tests__/accountPasswordRoute.test.ts`,
     `apps/api/__tests__/accountPasswordSetRoute.test.ts`, `apps/api/__tests__/accountSessionsRoute.test.ts`,
     `apps/api/__tests__/accountExportRoute.test.ts`, `apps/api/__tests__/accountDeletionRoute.test.ts`
9. `feat(api): route personal uploads through the own-account guard`
   - `apps/api/app/(routes)/files/route.ts`, `apps/api/__tests__/fileUploadRoute.test.ts`
10. `fix(api): log the provider code when a session revocation is refused` (esta tarefa, ajuste pós-review)
    - `apps/api/(shared)/lib/session-revocation.ts`, `apps/api/(shared)/lib/toolkit-error-codes.ts`
    - `apps/api/__tests__/authEmailChangeConfirm.test.ts` (o chamador da troca de e-mail não mudou; só a
      asserção do payload do log, que este helper muda)
    - Leva junto o parâmetro `code` de `sessionsNotRevokedResponse`, com default igual ao anterior; quem o usa
      é o commit 12. Vem antes de 11 e 12 porque os testes deles conferem o código do provedor no log.
11. `fix(api): report a refused session revocation when unlinking the password` (esta tarefa)
    - `apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts`
    - `apps/api/__tests__/accountSignInMethodsRoute.test.ts`
12. `fix(api): stop the admin disable and archive from swallowing a refused session revocation` (esta tarefa)
    - `apps/api/(shared)/lib/account-access.ts`, `apps/api/app/(routes)/users/[id]/route.ts`
    - `apps/api/__tests__/usersAdminAuditTrail.test.ts`, `apps/api/__tests__/usersAdminArchiveAccess.test.ts`,
      `apps/api/__tests__/userMergeArchivedProfile.test.ts`, `apps/api/__tests__/usersAdminDeleteBilling.test.ts`,
      `apps/api/__tests__/googleSignInProfile.test.ts`, `apps/api/__tests__/welcomeNotification.test.ts`
    - B e C ficam juntos porque o `PUT` e o `DELETE` estão no mesmo arquivo de rota e o mock de
      `@repo/auth/server` em `usersAdminAuditTrail.test.ts` serve os dois; separados, o commit do meio deixa
      esse teste vermelho.
13. `fix(app): disable the avatar upload while impersonating`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx`
      **só o hunk de `disabled={isImpersonating}`**, via `git add -p` (aceitar esse, recusar os outros quatro)
    - `apps/app/__tests__/accountProfileFormAvatarReadOnly.test.tsx`
    - Conferir depois: `git show HEAD -- <AccountProfileForm.tsx>` mostra uma linha adicionada e nenhuma
      removida.
14. `fix(app): unmount the profile menu avatar image when the picture goes away`
    - `apps/app/shared/components/ui/ProfileDropdown.tsx` **só os hunks de `avatarSrc` e do `AvatarImage`
      condicional** (2º e 3º de 4), via `git add -p`; recusar o de `accountPath` e o do `Link`
    - `apps/app/__tests__/profileDropdownAvatarEmpty.test.tsx`
    - Conferir depois: `git show HEAD -- <ProfileDropdown.tsx>` mostra 4 linhas adicionadas, 2 removidas, e
      nenhuma menção a `accountPath`.
15. `feat(app): let the account forms hide what the admin area does not offer` (corpo da mensagem:
    "Also drops flex-1 from the three account forms so they size to their content.")
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx`
      (o arquivo inteiro: depois do commit 13 só restam os hunks desta mudança)
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm.tsx`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPreferencesForm.tsx`
    - `apps/app/__tests__/accountProfileFormEmail.test.tsx`, `apps/app/__tests__/accountSecurityForm.test.tsx`,
      `apps/app/__tests__/accountPreferencesForm.test.tsx`
16. `feat(app): add the admin section set to the account tabs`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/accountTabRouting.ts`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountTabs.tsx`
    - `apps/app/__tests__/accountTabRouting.test.ts`, `apps/app/__tests__/accountTabs.test.tsx`
17. `feat(app): add the admin account page`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/page.tsx`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/AdminAccountClient.tsx`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/loading.tsx`
    - `apps/app/shared/lib/panelTitles.ts`, `apps/app/__tests__/adminAccountPage.test.tsx`
18. `feat(app): point the admin navigation to the admin account`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/layout.tsx`,
      `apps/app/app/[locale]/(authenticated)/(admin)/admin/paths.ts`,
      `apps/app/app/[locale]/(authenticated)/(admin)/admin/routes.tsx`
    - `apps/app/shared/components/ui/Navbar.tsx`, `apps/app/shared/components/ui/ProfileDropdown.tsx` (o arquivo
      inteiro: depois do commit 14 só restam os hunks de `accountPath`)
    - `apps/app/__tests__/profileDropdownAccount.test.tsx`
19. `test(app): harden three tests against a loaded machine`
    - `apps/app/__tests__/tableLoadMore.test.tsx`
    - `apps/app/__tests__/signInEmailLinkEntry.test.tsx`
    - `apps/app/__tests__/auditFiltersDateInput.test.tsx`
20. `fix(app): keep the user disabled in the list when only the session revocation failed` (esta tarefa)
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(hooks)/useUserCrud.tsx`
    - `apps/app/__tests__/useUserCrudSessionsNotRevoked.test.tsx`
21. `feat(internationalization): add the admin account copy`
    - `packages/internationalization/translations/apps/app/pages/admin/account.ts`
    - `packages/internationalization/translations/apps/app/pages/admin/index.ts`
    - `packages/internationalization/translations/apps/app/pages/admin/routes/index.ts`
22. `fix(internationalization): add the USERS_SESSIONS_NOT_REVOKED message` (esta tarefa)
    - `packages/internationalization/translations/packages/shared/utils.ts`
23. `docs(api): list requireOwnAccountApi among the guards`
    - `apps/api/CLAUDE.md`
24. `docs: document the own-account guard in the auth panel and review checklist`
    - `docs/AUTH-PANEL.md`, `docs/review-checklist.md`
25. `docs: describe how a refused session revocation is reported` (esta tarefa)
    - `docs/SECURITY.md`, `docs/INCIDENT-RESPONSE.md`, `docs/BACKUP.md`, `docs/SUBPROCESSORS.md`
26. `docs(features): app-form-layout-centered`
    - `docs/features/app-form-layout-centered/` (os `.md`; os screenshots são ignorados)
27. `docs(features): admin-own-account`
    - `docs/features/admin-own-account/`
28. `docs(features): app-test-suite-stability`
    - `docs/features/app-test-suite-stability/`
29. `docs(features): account-avatar-polish`
    - `docs/features/account-avatar-polish/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
      `review/review.md`, mais o que o `/test` gravar)
30. `docs(features): auth-revocation-failure` (esta tarefa)
    - `docs/features/auth-revocation-failure/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
      `review/review.md`, mais o que o `/test` gravar)

Corpos sugeridos para os commits desta tarefa:

- 10: "Log the Firebase error code, or the error name when there is none, next to the request id when a
  session revocation is refused. Never the message, which can carry the address. Also lets the caller pick the
  error code of the 500."
- 11: "Unlinking the password ends every session of the account. When Firebase refused the revocation, the
  route still answered 204. It now answers 500 AUTH_SESSIONS_NOT_REVOKED, after the audit event and the address
  restore; a failed restore still takes precedence with ACCOUNT_UPDATE_FAILED."
- 12: "Disabling a user now answers 500 USERS_SESSIONS_NOT_REVOKED when the revocation is refused. The account
  stays disabled and the audit event is recorded first. Archiving refuses with 503 USERS_DELETE_AUTH_FAILED
  instead of archiving an account whose sessions may still be open; an account already gone from Firebase Auth
  is still archived."
- 20: "The account is already disabled on the server when the API answers USERS_SESSIONS_NOT_REVOKED, so the
  toggle keeps it disabled and shows the message instead of rolling back."

Varredura de segredo em `docs/features/auth-revocation-failure/`: nenhuma senha, token, chave ou e-mail de
pessoa real; os acertos do grep são nomes de função e de código de erro. Repetir no que o `/test` gravar antes
do commit 30.

Título de PR sugerido: `feat: admin own account area, centered form pages and session revocation errors`.

Depois do último commit aprovado, o `/review` pergunta se deve rodar
`git push -u origin <branch resolvida>` (proposta: `feat/admin-account-forms-and-session-revocation`).

### Commits realizados

(preenchido pelo orquestrador)
