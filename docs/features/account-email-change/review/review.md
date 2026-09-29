# Revisão: troca de e-mail do titular

Revisão feita em rodada autônoma do `/cycle`, em 2026-09-29, sobre o diff não commitado da feature
(35 arquivos alterados, 17 novos). Nada foi commitado nem pushado.

## Branch

- Atual: `run-full-task-cycle-v1`, sem upstream e sem commit além de `origin/main` (`3e5ec4c`).
- Regex do padrão `<project>/<type>/<title>`: **inválida** (`BRANCH INVALIDA: run-full-task-cycle-v1`).
- Nesta rodada a branch não foi criada nem renomeada: a política do `/cycle` (§1) proíbe, e o workspace do
  Conductor pede para não renomear.
- Nome proposto: `feat/account-email-change`. O diff cruza `apps/api` e `apps/app`, então o `project` fica
  omitido. Passou no regex (`branch OK: feat/account-email-change`). Na hora dos commits, criar a partir da
  atual com `git switch -c feat/account-email-change`.

## Revisão: escopo `account-email-change`

Nada bloqueante. Três correções aplicadas: o foco do diálogo ao fechar, o foco ao abrir (achado pelo `/test`,
depois da revisão) e a conferência do tipo do código na rota de verificação de e-mail.

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/app/.../account/(components)/AccountEmailChangeDialog.tsx:107-108` (antes da correção): o diálogo
  abre por um botão que fica fora dele, sem `AlertDialogTrigger`. O Radix, ao fechar um diálogo modal,
  chama `event.preventDefault()` e foca `context.triggerRef.current`
  (`@radix-ui/react-dialog@1.1.15/dist/index.mjs:146-149`). Sem trigger, o foco caía no `<body>` depois de
  Esc, Cancelar ou do envio bem-sucedido. Isso regride o WCAG 2.4.3 (ordem do foco) logo depois da
  feature de acessibilidade. **Corrigido** (ver abaixo).
- `AccountEmailChangeDialog.tsx:108` (antes da correção), **achado pelo `/test`, não pela revisão**: ao
  abrir o diálogo pelo teclado, o foco não entrava nele. `document.activeElement` ficava no botão "Trocar
  e-mail", fora de `[role=alertdialog]`, e o Tab passava pelo campo de arquivo, por "Escolher imagem" e por
  "Salvar" antes de chegar ao diálogo. O `AlertDialogContent` do Radix cancela o autofoco de abertura e
  foca o `cancelRef` (`@radix-ui/react-alert-dialog@1.1.23/dist/index.mjs:58-60`), que só o
  `AlertDialogCancel` preenche; este diálogo usa o `Footer` do app e não tem `AlertDialogCancel`. Também
  WCAG 2.4.3. Escapou desta revisão porque a leitura do Radix conferiu o foco ao fechar
  (`onCloseAutoFocus`) e não o de abrir (`onOpenAutoFocus`), que tem a mesma causa: o diálogo não usa as
  peças do Radix que guardam as referências de foco. **Corrigido** (ver abaixo).
- `apps/api/app/(routes)/auth/email-verification/confirm/route.ts:24` (antes da correção) aplicava
  qualquer `oobCode` sem conferir o tipo. Com esta feature passa a existir código `VERIFY_AND_CHANGE_EMAIL` no sistema, e a
  página cai em `VerifyEmailResult` sempre que `mode` não é exatamente `verifyAndChangeEmail`
  (`apps/app/app/[locale]/(unauthenticated)/verify-email/page.tsx:34-38`). Um link de troca aberto sem
  `mode` trocava o e-mail pela rota de verificação, sem `revokeUserSessions` e sem o evento
  `account.email.change`, e o cartão dizia "e-mail confirmado". O link que a API gera sempre traz `mode`
  (`auth-action-links.ts`, `toAppLink`), então isso só acontece com URL editada ou truncada. O caminho
  direto pelo Identity Toolkit, já documentado em `docs/SECURITY.md`, continua com o mesmo efeito e não
  tem solução nesta fatia. **Corrigido** por decisão do orquestrador (política do `/cycle` §3, defeito
  encontrado no caminho). É desvio do plano, que só previa a conferência na rota nova.

### 🟢 Sugestão / nit

- `apps/app/app/[locale]/(unauthenticated)/verify-email/components/ConfirmEmailChangeResult.tsx:53-62`:
  o cartão de erro é o mesmo para todo `error.code`. Um `429 AUTH_RATE_LIMITED` do proxy mostra "o link
  pode ter expirado", embora o código não tenha sido gasto e recarregar a página resolva. Espelha
  `VerifyEmailResult`, e o plano (§5.2) pediu isso. Sem ação.
- `packages/internationalization/translations/packages/email/index.ts:58`, `:126`, `:193`: o aviso manda
  "troque sua senha agora e fale com o suporte". O plano (§15) registra que trocar a senha não invalida um
  link já emitido; quem reverte é o suporte. A frase não mente, porque o suporte está nela, mas a ordem
  sugere que a senha resolve. Sem ação; fica para decisão de copy.
- `apps/api/(shared)/lib/auth-action-links.ts` (`buildEmailChangeLink`): se `getUserByEmail` recusar um
  endereço que o Zod aceitou (`auth/invalid-email`), o erro sobe e a rota responde
  `500 ACCOUNT_UPDATE_FAILED`, com `error.code` e sem stack. É raro e não vaza nada. Sem ação.
- Achado para o backlog, fora desta fatia: o diálogo de exclusão de conta tem o mesmo defeito de foco na
  abertura (`apps/app/.../account/(components)/AccountPrivacyPanel.tsx:137`, `AlertDialogContent` sem
  `AlertDialogCancel`, rodapé pelo `Footer`). Não corrigi: a política do `/cycle` §3 manda corrigir na
  raiz a partir de 3 call sites, e há 2. Contagem no repo: 3 `AlertDialogContent` na `apps/app`
  (`AccountEmailChangeDialog.tsx`, `AccountPrivacyPanel.tsx`, `AccountSecurityForm.tsx`); só o
  `AccountSecurityForm.tsx:132` usa `AlertDialogCancel`. Se um terceiro diálogo com `Footer` aparecer, a
  correção passa para o `AlertDialogContent` de `packages/design-system/components/ui/alert-dialog.tsx`.
- Achado para o backlog, fora desta fatia: `lacksPasswordProvider`
  (`AccountEmailChangeDialog.tsx:36-46`) duplica `requiresPrivacyChannel`
  (`AccountPrivacyPanel.tsx:40-48`), inclusive a constante `PASSWORD_PROVIDER_ID` (`:29` nos dois
  arquivos). O plano já previa (§15). Não mexi no painel de privacidade.

### ✅ OK

- `POST /account/email` (`apps/api/app/(routes)/account/email/route.ts`): `requireCommonPanelApi` roda
  antes de tudo. Sem credencial a resposta é `401 AUTH_INVALID_TOKEN`; personificando, o guard recusa a
  escrita com `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY` (`common-panel.ts:65-71`) antes do handler; a
  checagem ator × titular (`:70-75`) repete a da exclusão de conta. Só depois disso vem o
  `503 EMAIL_NOT_CONFIGURED` (`:77-82`), antes de ler o corpo e de gastar cota. O 503 não sai para quem não
  está autenticado.
- Ordem no pedido: corpo `.strict()` → conta sem e-mail → sem provedor de senha → endereço igual (sem
  diferenciar maiúsculas) → senha atual pelo Identity Toolkit → link → aviso ao endereço antigo → link ao
  novo. O link não sai se o aviso falhar (`:147-155`). Todo erro esperado tem `error.code`; o único 500 é
  `ACCOUNT_UPDATE_FAILED`, para falha inesperada do Admin SDK.
- `POST /auth/email-change/confirm`: pública como as outras de `/auth/*` e no rate limit
  (`apps/api/proxy.ts:53`). Confere `requestType === "VERIFY_AND_CHANGE_EMAIL"` antes de aplicar
  (`confirm/route.ts:48-56`), então código de verificação ou de redefinição não é gasto. O `uid` revogado e
  auditado vem da resposta do toolkit, nunca do corpo. `revokeUserSessions` e `recordAuditEvent` engolem
  as próprias falhas (`packages/auth/server.ts:323-329`, `audit-recorder.ts:91-120`), então depois de o
  e-mail mudar a rota não responde erro.
- Revogação com efeito real: `getCurrentUser` confere `isMintedBeforeRevocation` no caminho do ID token
  (`packages/auth/server.ts`), e o session cookie é verificado com `checkRevoked`.
- `EMAIL_EXISTS` no apply vira `USERS_AUTH_EMAIL_ALREADY_IN_USE` (`toolkit-error-codes.ts:46-49`).
- Os 3 códigos novos (`ACCOUNT_EMAIL_UNCHANGED`, `ACCOUNT_EMAIL_CHANGE_REAUTH_UNSUPPORTED`,
  `AUTH_EMAIL_CHANGE_FAILED`) estão em `apiErrors` nos 3 idiomas. Todos os outros códigos que as duas rotas
  emitem já existiam lá (conferido um a um com `rg`).
- SDK: `requestEmailChange` e `confirmEmailChange` seguem o padrão (`data.data`, erro propaga cru). O
  `AuditAction.ACCOUNT_EMAIL_CHANGE` tem rótulo nos 3 idiomas em `auditTrail.ts`.
- `apps/app`: toda string do diálogo, do botão, do texto "sem senha" e da página de confirmação vem do
  dicionário. Diálogo com `AlertDialogTitle` e `AlertDialogDescription` (dão `aria-labelledby` e
  `aria-describedby`), campos por `HookFormInput`/`HookFormInputPassword` com `autoComplete`, `Footer`
  dentro do `<form>` com `isLoading` e `disabled={isImpersonating}`. O diálogo fica fora do `<form>` do
  perfil pelo motivo que o comentário explica.
- Comentários novos seguem `.claude/rules/code-comments.md`: nenhum cita artefato do fluxo.
- `docs/SECURITY.md`: as contagens foram remedidas. São 32 arquivos de rota, 20 com guard e 12 sem, e
  `RATE_LIMITED_PATHS` ocupa `proxy.ts:45-58` com 12 caminhos.
- Corte de MVP da spec (`specs/account-email-change.md`): os cinco objetivos da §1.4 do plano têm código
  correspondente. Nenhuma divergência.
- Artefatos em `docs/features/account-email-change/`: sem senha, token ou e-mail de pessoa real. Só
  aparecem endereços `@example.com` do seed e de QA, e `voce@exemplo.com` do placeholder.

### 👁 Verificar no `/test`

1. **Suíte da `apps/app` depois da correção de foco.** A revisão não roda teste. Repro:
   `pnpm --filter app test`, com atenção a `__tests__/accountEmailChangeDialog.test.tsx`.
2. **Foco ao abrir e ao fechar o diálogo.** Repro no `agent-browser`: na aba Perfil, dar Tab até "Trocar
   e-mail" e apertar Enter. Esperado: `document.activeElement` é o `input[name="newEmail"]`, dentro de
   `[role=alertdialog]`, e o Tab seguinte vai para "Senha atual", sem passar por arquivo, "Escolher
   imagem" ou "Salvar". Depois fechar por Esc, por Cancelar e por um envio aceito (ou o 503 do modo
   degradado, que mantém aberto): nos dois primeiros e no aceito, o foco volta a "Trocar e-mail". Nos 3
   idiomas e em 375 px.
3. **A conferência do tipo do código não gasta o código** (afirmação que sustenta o corte da rota de
   confirmação; o `/develop` mediu à mão, sem evidência persistida). Repro contra o emulador de Auth: gerar
   `generateEmailVerificationLink`, mandar o `oobCode` para `/auth/email-change/confirm` (esperado
   `400 AUTH_OOB_CODE_INVALID`) e depois para `/auth/email-verification/confirm` (esperado 200).
4. **Confirmação feliz**: gerar `generateVerifyAndChangeEmailLink`, abrir
   `/pt-br/verify-email?mode=verifyAndChangeEmail&oobCode=<código>`. Esperado: cartão de sucesso com
   "Entrar", `tokensValidAfterTime` avançado, o endereço antigo sem conta, o novo com
   `emailVerified=true`, 1 evento `account.email.change`, e a sessão aberta noutra aba caindo.
5. **Mesma página no navegador da sessão antiga**: o cartão de sucesso continua na tela depois do
   `logout()` (o plano espera que `adoptSharedSession` falhe e a página não navegue).
6. **Código de troca recusado pela rota de verificação**: gerar `generateVerifyAndChangeEmailLink` no
   emulador e abrir `/pt-br/verify-email?oobCode=<código>` sem `mode`. Esperado: cartão de erro,
   `POST /auth/email-verification/confirm` com `400 AUTH_OOB_CODE_INVALID`, e o e-mail da conta sem mudar
   (`getUserByEmail` do antigo ainda encontra). Depois, o mesmo código em
   `/pt-br/verify-email?mode=verifyAndChangeEmail&oobCode=<código>` ainda troca, o que prova que não foi
   gasto. Conferir também que a verificação comum continua respondendo 200 com código de
   `generateEmailVerificationLink`.
7. **Dois pedidos pendentes**: aplicar um link e ver o outro responder `AUTH_OOB_CODE_INVALID`.
8. **Endereço tomado entre o pedido e o clique**: criar conta com o endereço novo depois de gerar o link;
   esperado `400 USERS_AUTH_EMAIL_ALREADY_IN_USE`.
9. **Modo degradado na tela**: app sem Resend → Perfil → Trocar e-mail → Enviar link. Toast de
   `EMAIL_NOT_CONFIGURED` traduzido nos 3 idiomas e diálogo aberto.
10. **Aba Perfil**: frase "em breve" ausente e botão visível com a conta de senha do seed; conta só Google
    mostrando `emailChange.unsupported`.
11. **Personificação**: botão desabilitado e `POST /account/email` forçado com os headers reais do SDK
    respondendo `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`.
12. **Tema, largura e idioma**: light, dark e 375 px na aba Perfil com o diálogo aberto e na página de
    confirmação, nos 3 idiomas, com axe sem violação nova.
13. **Trilha do admin**: rótulo "E-mail alterado pelo titular" na tela de auditoria.

## Correções aplicadas

- `apps/app/.../account/(components)/AccountEmailChangeDialog.tsx`: prop nova
  `returnFocusRef: RefObject<HTMLButtonElement | null>` e `onCloseAutoFocus` no `AlertDialogContent`, que
  cancela o padrão do Radix e foca o botão que abriu o diálogo.
- `apps/app/.../account/(components)/AccountProfileForm.tsx`: `useRef` no botão "Trocar e-mail"
  (`:43`, `:120`) passado ao diálogo (`:171`).
- `AccountEmailChangeDialog.tsx`: `onOpenAutoFocus` no `AlertDialogContent` com `event.preventDefault()` e
  `form.setFocus("newEmail")`. O handler da prop roda antes do do Radix (`composeEventHandlers`), e o
  `preventDefault` impede o Radix de tentar o `cancelRef` vazio. Não interfere no `onCloseAutoFocus`: um
  trata a montagem do `FocusScope`, o outro a desmontagem.
- `apps/app/__tests__/accountEmailChangeDialog.test.tsx`: teste novo que abre pelo botão focado e confere
  que `document.activeElement` é o campo "Novo e-mail", dentro de `[role=alertdialog]`. Os 3 testes de
  retorno do foco focavam o campo à mão (`newEmailField.focus()`) para contornar o defeito; agora esperam o
  foco chegar sozinho ao campo antes de fechar, o que é mais estrito.
- `apps/api/app/(routes)/auth/email-verification/confirm/route.ts`: chama `identityCheckOobCode` antes de
  `identityApplyOobCode` e responde `400 AUTH_OOB_CODE_INVALID`, sem gastar o código, quando
  `requestType !== "VERIFY_EMAIL"`. As falhas do toolkit na conferência e na aplicação passam pelo mesmo
  `mapOobActionMessageToCode` com fallback `AUTH_EMAIL_VERIFICATION_FAILED`. O nome `VERIFY_EMAIL` foi
  conferido no emulador (`firebase-tools@15.30.1`, `lib/emulator/auth/operations.js:676`, `:789`), e
  `accounts:resetPassword` sem `newPassword` devolve `requestType` sem apagar o código (`:615-642`).
- `apps/api/__tests__/authEmailVerification.test.ts`: mock de `identityCheckOobCode` com `VERIFY_EMAIL`
  por padrão e 5 casos novos: conferência antes da aplicação; recusa de `VERIFY_AND_CHANGE_EMAIL` e de
  `PASSWORD_RESET` sem chamar o apply; `INVALID_OOB_CODE` e `EXPIRED_OOB_CODE` vindos da conferência. Os
  dois casos de corpo inválido passaram a exigir que a conferência também não aconteça. Com a rota antiga
  os 5 casos novos falham; com a nova, 22/22.
- `docs/SECURITY.md:11`: uma frase sobre a conferência inversa na rota de verificação.

Custo da correção: uma chamada a mais ao Identity Toolkit por verificação de e-mail. No emulador,
`accounts:resetPassword` exige `allowPasswordSignup`; um projeto com o provedor de senha desligado passaria
a recusar a verificação, mas nesse projeto não existe conta de senha para verificar.

Antes, ao fechar: `onCloseAutoFocus` do Radix → `triggerRef.current` nulo → foco no `<body>`. Depois:
`handleCloseAutoFocus` → `event.preventDefault()` → `returnFocusRef.current?.focus()`.

## Raio de impacto

Tudo aditivo. `AccountActions.requestEmailChange` só é usado por `useAccountMutations`;
`AuthActions.confirmEmailChange`, só por `useEmailVerification`. `AuditAction` ganhou um valor; os
consumidores (`audit-event.mapper.ts`, `AuditListClient.tsx`) tratam o campo como string ou usam o
dicionário, que já tem o rótulo. `ToolkitApplyOob` passou a ser exportado. A prop nova do diálogo só tem um
chamador (`AccountProfileForm.tsx:167`). `apps/web` não é afetada.

## Lacunas de teste

- Confirmação contra o emulador de Auth sem teste automatizado: **continua aberta**, fora de escopo (o
  `test:emulator` não sobe o Auth; mudar isso é infra, D13 do plano).
- Entrega real dos dois e-mails e comportamento do Firebase de produção: **fora de escopo**, pendência em
  `docs/PRE-PRODUCTION.md` §3.
- Retorno do foco ao fechar o diálogo: **fechada** pelos 3 testes que o `/test` criou em
  `accountEmailChangeDialog.test.tsx` (Esc, Cancelar, pedido aceito).
- Foco ao abrir o diálogo: **fechada aqui**, com o teste "leva o foco ao campo do novo e-mail quando o
  diálogo abre" no mesmo arquivo.
- Rota de verificação aceitando código de troca: **fechada aqui**, com os 5 casos em
  `authEmailVerification.test.ts`.

## Decisões em aberto

1. **Branch.** A atual é inválida. Recomendação: criar `feat/account-email-change` a partir da atual antes
   do primeiro commit.
2. **Índice não vazio.** O `git mv` de `specs/accessibility-conformance.md` para
   `docs/features/accessibility-conformance/spec.md` já está preparado e entraria no primeiro commit.
   Recomendação: `git restore --staged specs/accessibility-conformance.md docs/features/accessibility-conformance/spec.md`
   antes do commit 1 e preparar de novo no commit 12 com `git add -A` nos dois caminhos.
3. **Commits intermediários não compilam sozinhos.** A rota do pedido (commit 3) importa o template do
   commit 7, e o template lê a copy do commit 10. É a ordem que a convenção do repo impõe (i18n por último).
   Recomendação: manter.

## Gates

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint | `pnpm check` | 806 arquivos, nenhuma correção |
| Typecheck | `pnpm turbo run typecheck --filter=app --filter=api --filter=@repo/sdk --filter=@repo/email --filter=@repo/internationalization --filter=web` | 6/6 tasks (5 do cache; `app` remedido depois da correção de foco) |
| Typecheck da API | `pnpm turbo run typecheck --filter=api` | 1/1, remedido depois da correção da rota |
| Teste da rota corrigida | `pnpm --filter api exec vitest run __tests__/authEmailVerification.test.ts` | 22/22; com a rota antiga, 5 falhas (os casos novos) |
| Paridade de i18n | `pnpm --filter @repo/internationalization test` | 59/59 em 6 arquivos |
| Lint e typecheck da app, depois da correção do foco de abertura | `pnpm check` · `pnpm --filter app typecheck` | 806 arquivos limpos · 0 erro |
| Teste do diálogo | `pnpm --filter app exec vitest run __tests__/accountEmailChangeDialog.test.tsx` | 15/15 |
| Mutação: sem `onOpenAutoFocus` | mesmo arquivo | 4 falhas: o teste novo e os 3 de retorno do foco |
| Mutação: sem `onCloseAutoFocus` | mesmo arquivo | 3 falhas: os 3 de retorno do foco |

Fora esses dois arquivos, nenhum teste rodou aqui. Os números do `/develop` (api 1017, app 752, email 202) são
anteriores às três correções.

## Plano de commits

Antes do commit 1: `git diff --cached --stat` tem de sair vazio (ver decisão 2). Depois de cada commit,
conferir `git show --stat --oneline HEAD` contra a lista.

1. `feat(sdk): add email change request and confirmation actions`
   - `packages/sdk/src/types/account/account.ts`
   - `packages/sdk/src/types/audit/audit.ts`
   - `packages/sdk/src/actions/account/action.ts`
   - `packages/sdk/src/actions/auth/action.ts`
2. `feat(api): add email change link and action code check helpers`
   - `apps/api/(shared)/lib/auth-action-links.ts`
   - `apps/api/(shared)/lib/firebase-identity-toolkit.ts`
   - `apps/api/(shared)/lib/toolkit-error-codes.ts`
   - `apps/api/__tests__/authActionLinks.test.ts`
   - `apps/api/__tests__/firebaseIdentityToolkit.test.ts`
   - `apps/api/__tests__/oobActionErrorCodes.test.ts`
3. `feat(api): add POST /account/email to request an email change`
   - `apps/api/(shared)/validation/account.schema.ts`
   - `apps/api/app/(routes)/account/email/route.ts`
   - `apps/api/__tests__/accountSchema.test.ts`
   - `apps/api/__tests__/accountEmailRoute.test.ts`
4. `feat(api): add public email change confirmation route`
   - `apps/api/(shared)/validation/auth.schema.ts`
   - `apps/api/app/(routes)/auth/email-change/confirm/route.ts`
   - `apps/api/__tests__/authEmailChangeConfirm.test.ts`
5. `fix(api): refuse non-verification codes on email verification confirm`
   - `apps/api/app/(routes)/auth/email-verification/confirm/route.ts`
   - `apps/api/__tests__/authEmailVerification.test.ts`
6. `feat(api): rate limit the email change endpoints`
   - `apps/api/proxy.ts`
   - `apps/api/__tests__/corsOrigin.test.ts`
7. `feat(email): add email change notice template`
   - `packages/email/templates/email-change-notice.tsx`
   - `packages/email/templates/previews/email-change-notice.en.tsx`
   - `packages/email/templates/previews/email-change-notice.es.tsx`
   - `packages/email/preview-data.ts`
   - `packages/email/__tests__/emailCopy.test.ts`
   - `packages/email/__tests__/previews.test.tsx`
   - `packages/email/__tests__/templates.test.tsx`
8. `feat(app): add email change dialog to the profile tab`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(validations)/accountEmailChangeSchema.ts`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountEmailChangeDialog.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useAccountMutations.tsx`
   - `apps/app/__tests__/accountEmailChangeSchema.test.ts`
   - `apps/app/__tests__/accountEmailChangeDialog.test.tsx`
   - `apps/app/__tests__/accountApiErrorCopy.test.ts`
9. `feat(app): confirm the email change from the verify-email link`
   - `apps/app/app/[locale]/(unauthenticated)/verify-email/page.tsx`
   - `apps/app/app/[locale]/(unauthenticated)/verify-email/components/ConfirmEmailChangeResult.tsx`
   - `apps/app/shared/hooks/useEmailVerification.ts`
   - `apps/app/__tests__/useEmailVerification.test.tsx`
   - `apps/app/__tests__/verifyEmailPage.test.tsx`
10. `feat(internationalization): add email change copy and error codes`
   - `packages/internationalization/translations/apps/app/pages/common/account.ts`
   - `packages/internationalization/translations/apps/app/pages/emailVerification/index.ts`
   - `packages/internationalization/translations/apps/app/pages/admin/auditTrail.ts`
   - `packages/internationalization/translations/packages/email/index.ts`
   - `packages/internationalization/translations/packages/shared/utils.ts`
11. `docs: document the account email change`
    - `docs/SECURITY.md`
    - `docs/PAYMENTS.md`
    - `docs/PRE-PRODUCTION.md`
12. `docs(specs): archive accessibility-conformance and sync the backlog`
    - `specs/BACKLOG.md`
    - `specs/accessibility-conformance.md` (remoção, parte do rename)
    - `docs/features/accessibility-conformance/spec.md` (destino do rename, com o status `done` e a nota de
      entrega)
    - `docs/features/accessibility-conformance/analyze/plan.md` (link para `../spec.md`)
13. `docs(features): account-email-change`
    - `docs/features/account-email-change/STATE.md`
    - `docs/features/account-email-change/analyze/plan.md`
    - `docs/features/account-email-change/develop/handoff.md`
    - `docs/features/account-email-change/review/review.md`

Título de PR sugerido: `feat: account email change with link confirmation`. Depois do último commit, o
`/review` pergunta se deve rodar `git push -u origin feat/account-email-change`.

### Commits realizados

Na branch `feat/account-email-change`, criada a partir de `run-full-task-cycle-v1` depois da aprovação do
usuário. O último commit, `docs(features): account-email-change`, traz também `test/criterios-aceite.md` e
`test/report.md`.

- `704c77b` feat(sdk): add email change request and confirmation actions
- `7b2a135` feat(api): add email change link and action code check helpers
- `5b67298` feat(api): add POST /account/email to request an email change
- `9a2fbe7` feat(api): add public email change confirmation route
- `7867d6f` fix(api): refuse non-verification codes on email verification confirm
- `31206dd` feat(api): rate limit the email change endpoints
- `fe5400d` feat(email): add email change notice template
- `88aec90` feat(app): add email change dialog to the profile tab
- `e905c3a` feat(app): confirm the email change from the verify-email link
- `5b7bce2` feat(internationalization): add email change copy and error codes
- `cbb0bf9` docs: document the account email change
- `3994654` docs(specs): archive accessibility-conformance and sync the backlog
