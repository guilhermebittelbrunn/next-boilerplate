# Revisão: política de senha (fatia 1 de `account-security-mfa`)

Rodada autônoma do `/cycle`, 2026-09-26. Revisão por leitura de código e gates estáticos. Nada foi commitado,
nenhuma branch foi criada ou renomeada.

## Branch

- Atual: `cycle-full-pipeline-run`, sem upstream e sem commit à frente de `origin/main`.
- Regex do `/review`: **inválida** (não segue `<project>/<type>/<title>`).
- O workspace é gerenciado pelo Conductor, e esta rodada não cria nem renomeia branch. Nome proposto, que passou
  no regex: **`feat/account-security-password-policy`**. Sem prefixo de projeto porque o diff cruza `api`,
  `app`, `web` e vários pacotes.
- Comando previsto, depois da aprovação do usuário: `git switch -c feat/account-security-password-policy`,
  criada a partir da branch atual. Como a branch atual não tem remoto nem commit de terceiro,
  `git branch -m feat/account-security-password-policy` também serve.

## Revisão — diff da fatia 1 (shared, sdk, api, app, web, auth, i18n, docs)

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/api/app/(routes)/auth/sign-up/route.ts:44` e `:62`: `[auth] sign-up-failed` e
  `[auth] sign-up-rollback-failed` registravam só o `requestId`. Quando o Admin SDK falha por configuração
  (credencial ausente, provedor desligado, erro interno do Firebase), a rota responde
  `500 USERS_AUTH_SIGN_UP_FAILED` e o log não dizia por quê. **Corrigido**: as duas linhas levam
  `reason=<código do provedor ou nome do erro>`, calculado por `adminAuthErrorReason` em
  `apps/api/(shared)/lib/toolkit-error-codes.ts`. A mensagem do erro continua fora do log, porque pode trazer
  o e-mail.
- `docs/SECURITY.md:10`: a linha editada nesta fatia dizia que o Identity Toolkit REST atende o "sign-in
  server-side em algumas rotas" e a criação pelo admin. Pelo `rg firebase-identity-toolkit apps/api/app`, ele
  também atende a redefinição de senha por link, a confirmação de e-mail, o login com Google e a conferência
  da senha atual na troca e na exclusão de conta. **Corrigido.**
- `docs/SECURITY.md:156`: o texto apontava `apps/api/proxy.ts:63` para o `logEvent("security", "blocked", …)`,
  que está em `:67`. O erro é anterior a esta fatia; corrigi porque está no parágrafo vizinho ao que ela
  editou.
- `docs/PRE-PRODUCTION.md`, seção "Declaração — o que a política de senha não alcança": dizia que a regra de 8
  a 1024 vale "nos formulários das duas front-ends". Os formulários aplicam só o mínimo de 8; o teto de 1024
  só a API confere. **Corrigido.**

### 🟢 Sugestão / nit

- `apps/app/.../sign-up/components/SignUpFormClient.tsx:112-119` e
  `apps/web/.../sign-up/components/sign-up-form-client.tsx:34-40`: se a conta é criada e o login logo em
  seguida falha (rede, 429 do limite, falha ao criar o cookie de sessão), reenviar o formulário responde
  `USERS_AUTH_EMAIL_ALREADY_IN_USE` e a pessoa precisa ir ao login por conta própria. Não corrigi porque muda
  o fluxo. Ver "Decisões em aberto".
- `apps/api/app/(routes)/auth/sign-up/route.ts:37-42`: `USERS_AUTH_EMAIL_ALREADY_IN_USE` revela que o e-mail
  já tem conta. O comportamento anterior era o mesmo (o `createUserWithEmailAndPassword` do cliente devolvia
  `auth/email-already-in-use`), e o Arcjet limita a varredura quando há `ARCJET_KEY`. Sem ação.
- `apps/web/app/[locale]/sign-in/validations/signInSchema.ts:4-11`: mensagens em pt-br cravadas no schema.
  É anterior à fatia e ficou fora dela por decisão do plano (D12).

### ✅ OK

- **Validação de borda**: `POST /auth/sign-up` passa por `parseRequestJson` e `parseSignUp` antes de tocar o
  Admin SDK. O e-mail é aparado, com teto de 320 caracteres; a senha tem de 8 a 1024 e não é aparada
  (`apps/api/(shared)/validation/password.schema.ts`, `auth.schema.ts`).
- **Contrato**: todo ramo da rota responde `{ error: { code } }`. O sucesso é `201 { data: { created: true } }`,
  a mesma forma de `AuthAccountCreated` em `packages/sdk/src/actions/auth/action.ts`. O SDK deixa o erro
  propagar cru.
- **Rollback**: se o perfil não grava, a rota chama `deleteUser`. Se o `deleteUser` também falha, a falha vai
  para o log e a resposta sai com `USERS_PROFILE_CREATE_FAILED`, nunca como exceção sem corpo.
- **Sem env**: `getAuthInstance()` é preguiçoso e lança `Error` sem `code` quando faltam as
  `FIREBASE_ADMIN_*` (`packages/auth/server.ts:57-67`). A chamada fica dentro do `try`, então a resposta é
  `500 USERS_AUTH_SIGN_UP_FAILED` com código. Sem `ARCJET_KEY`, `checkRateLimit` deixa passar
  (`packages/security/index.ts:42`) e a rota continua respondendo, sem limite. Esse limite está documentado
  nos dois docs.
- **Rate limit**: `/auth/sign-up` está em `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:46`).
- **`signUp` fora de `packages/auth`**: `rg "SignUpDTO|components/sign-up|createUserWithEmailAndPassword"` e
  a busca por `useAuth().signUp` não acham consumidor fora de `specs/` e deste diretório. O E2E
  (`apps/e2e/tests/signUp.spec.ts`) dirige a tela e não usa a função.
- **Fonte única**: `git grep -n "MIN_PASSWORD_LENGTH =" -- apps packages | wc -l` dá 0. As três constantes
  vivem em `packages/shared/utils/helpers/passwordPolicy.ts`. `createUserWithEmailAndPassword` também dá 0.
- **i18n**: `AUTH_PASSWORD_TOO_SHORT` em `apiErrors`, `newPasswordMin` e o bloco `validation` do cadastro da
  web existem em pt-br, en e es. O formulário da web deixou de ter texto cravado.
- **Troca e exclusão de conta**: `isPasswordTooShort` só olha o campo `password`, então senha atual curta
  continua `VALIDATION_FAILED`, e contas antigas com senha de 6 seguem entrando.
- **Corte da spec**: bate com a primeira fatia de `specs/account-security-mfa.md` (só o item 4). Divergência
  registrada: a checagem contra as 3.000 senhas mais comuns (ASVS 6.2.4) ficou para a próxima fatia, pela
  pergunta P2 do plano.
- **Comentários**: o comentário no topo da rota explica uma restrição externa (limite do Firebase por IP) e
  não cita o fluxo.
- **Segredo nos artefatos**: `docs/features/account-security-mfa/` só tem e-mails `example.com` e a senha
  pública do seed do emulador (`demo1234`), a mesma de `apps/e2e/support/seedAccounts.ts` e
  `docs/SETUP.md`.

### 👁 Verificar no `/test`

É a primeira lista que o `/test` abre. Nenhum destes itens dá para confirmar lendo o código.

1. **Caminho feliz do cadastro contra o emulador** (a afirmação que sustenta a fatia; o handoff não chamou a
   rota com senha válida). Repro: stack com emulador, `/pt-br/sign-up` na `apps/app` com
   `qa-password-policy-app-<n>@example.com` e 8 caracteres. Esperado: `POST /auth/sign-up` 201, depois login,
   cookie de sessão, onboarding no passo 1 e `POST /auth/email-verification/send`. Conferir que o Admin SDK da
   API cria a conta no **emulador** e não no projeto de dev. `pnpm e2e` (`signUp.spec.ts`, `demo1234`) tem
   de seguir verde.
2. **Cadastro na `apps/web`**, mesmo fluxo e sem e-mail de verificação. Mensagens de validação em
   `/en/sign-up` e `/es/sign-up` no idioma da rota. O toast de erro aparece (é o primeiro componente da web a
   chamar `useAlert` direto; até aqui só o `AuthProvider` usava).
3. **CORS da web para a rota nova**: preflight de `http://localhost:3001` para
   `POST http://localhost:3002/auth/sign-up`.
4. **Botão desabilitado sem janela entre criar a conta e começar o login** (duplo clique não cria duas contas
   nem dispara dois logins). A app usa `createAccount.isPending || signIn.isPending || googleSignIn.isPending`;
   a web não inclui o Google no `disabled` do submit. Nenhum teste mede isso.
5. **E-mail repetido**: toast "Este e-mail já está em uso." nas duas front-ends, vindo de
   `USERS_AUTH_EMAIL_ALREADY_IN_USE`.
6. **Login falha depois da conta criada** (item 🟢 acima). Repro: forçar erro no `POST /api/auth/session` ou no
   limite logo após o 201 e reenviar o formulário. Registrar o que a pessoa vê.
7. **Conta antiga com senha de 6** (criada por REST no emulador): entra na app e na web, troca a senha
   informando a atual de 6, confirma a exclusão com 6.
8. **Troca de senha**: nova de 7 mostra "A nova senha deve ter ao menos 8 caracteres."; atual curta mostra a
   mensagem de 6.
9. **Redefinição por link e criação pelo admin**: 7 recusado no formulário; 7 enviado direto à API responde
   `400 AUTH_PASSWORD_TOO_SHORT`.
10. **Layout do erro inline** em light, dark e 375 px, nos 3 idiomas, e colar senha nos campos tocados.

## Correções aplicadas

| arquivo | o que mudou |
|---------|-------------|
| `apps/api/(shared)/lib/toolkit-error-codes.ts` | `adminAuthErrorReason(error)`: código do provedor ou nome do erro, nunca a mensagem. `mapAdminCreateUserErrorToCode` passa a usar o mesmo leitor de `code` (sem mudar o resultado). |
| `apps/api/app/(routes)/auth/sign-up/route.ts` | `sign-up-failed` e `sign-up-rollback-failed` levam `reason`. |
| `apps/api/__tests__/adminCreateUserErrorCodes.test.ts` | 4 casos para `adminAuthErrorReason`, inclusive erro com e-mail na mensagem. |
| `apps/api/__tests__/signUpProfile.test.ts` | Asserta `reason=auth/internal-error`; no rollback, asserta a linha, `reason=Error` e que o e-mail não aparece. |
| `docs/SECURITY.md` | Uso do Identity Toolkit REST medido; `proxy.ts:63` → `:67`. |
| `docs/PRE-PRODUCTION.md` | O formulário aplica o mínimo; o teto de 1024 é só da API. |

Os dois arquivos de teste rodaram: 33/33.

## Raio de impacto

- `useAuth()` perdeu `signUp`, e `@repo/auth` perdeu o export `./components/sign-up` e o tipo `SignUpDTO`.
  Nenhum consumidor no repo; fork que usava quebra no typecheck.
- `POST /auth/sign-up` trocou `{ session, user }` por `201 { data: { created: true } }` e os erros por
  `{ error: { code } }`. Antes não havia cliente da rota no repo.
- `authApi.signUp` é novo no SDK; chamado por `SignUpFormClient.tsx` (app) e `sign-up-form-client.tsx` (web).
- `POST /users`, `POST /auth/password/reset` e `POST /account/password` passam a responder
  `400 AUTH_PASSWORD_TOO_SHORT` para senha nova curta (antes `VALIDATION_FAILED`), e `POST /users` ganhou teto
  de 1024.
- `HTTP_STATUS.CREATED` novo em `@repo/shared`.

## Lacunas de teste

| lacuna (do handoff) | veredito |
|---------------------|----------|
| Nenhum teste prova o `disabled` dos botões de cadastro durante criação e login | continua aberta (item 4 do `/test`) |
| O teste da web não monta DOM | continua aberta; a web não tem `jsdom` e acrescentar seria dependência nova |
| Mensagem cravada em pt-br no login da web | fora de escopo (D12) |
| `apps/api/scripts/create-dev-admin.mjs` não aplica a política | fora de escopo (P4) |
| Log de falha do Admin SDK sem motivo | fechada aqui, com teste |

## Decisões em aberto

- **Nome e criação da branch**: `feat/account-security-password-policy`, a partir da atual. Recomendação:
  criar com `git switch -c` na aprovação dos commits.
- **Reenvio do cadastro depois de conta criada e login falho**: (a) deixar como está, e a pessoa vai ao login;
  (b) quando o reenvio receber `USERS_AUTH_EMAIL_ALREADY_IN_USE` logo depois de um 201 na mesma tela, tentar o
  `signIn` com as mesmas credenciais. Recomendação: (a) nesta fatia e medir no `/test` (item 6). (b) muda
  fluxo e mereceria teste próprio.

## Gates

| gate | comando | resultado |
|------|---------|-----------|
| Lint + typecheck (todos os workspaces) | `pnpm turbo run lint typecheck` | 15/15 tasks, 13 do cache; Biome em 762 arquivos, sem erro |
| Paridade de i18n | `pnpm --filter @repo/internationalization test` | 6 arquivos, 59/59 |
| Testes alterados nesta revisão | `vitest run __tests__/adminCreateUserErrorCodes.test.ts __tests__/signUpProfile.test.ts` (api) | 33/33 |

A suíte inteira não rodou aqui; o número do handoff (api 931, app 654, web 59) é anterior às correções, e o
`/test` remede.

## Plano de commits

Ordem pensada para cada commit passar no typecheck sozinho. Dois desvios da ordem padrão:

- **i18n antes de app e web**: `accountFormSchema.ts` usa `validation.newPasswordMin` e o schema da web usa
  `dictionary.apps.web.pages.signUp.validation`. Com o i18n no fim, os commits de app e web não compilam.
- **`packages/auth` depois de app e web, e a limpeza dos mocks da app num commit próprio depois dele**: os
  formulários precisam parar de usar `useAuth().signUp` antes de o pacote remover a função. Os dois testes
  da app que mocam `@repo/auth/client` renderizam o `AuthProvider`; se perdessem o `signUp` do mock antes de o
  provider parar de importá-lo, quebrariam. O mock com um export a mais é inofensivo, então a limpeza entra
  depois.
- **Web num commit só**: `signUp.ts` troca o export `signUpSchema` por `buildSignUpSchema`, e o formulário que
  o importa tem de mudar junto.

1. `feat(shared): add password policy constants and HTTP 201`
   - `packages/shared/utils/helpers/passwordPolicy.ts`
   - `packages/shared/utils/helpers/httpStatus.ts`
   - `packages/shared/utils/helpers/index.ts`
2. `feat(sdk): add authApi.signUp`
   - `packages/sdk/src/actions/auth/action.ts`
3. `feat(api): enforce the 8-character minimum on every password set`
   - `apps/api/(shared)/validation/password.schema.ts`
   - `apps/api/(shared)/validation/auth.schema.ts`
   - `apps/api/(shared)/validation/account.schema.ts`
   - `apps/api/(shared)/validation/user-admin.schema.ts`
   - `apps/api/app/(routes)/users/route.ts`
   - `apps/api/__tests__/accountSchema.test.ts`
   - `apps/api/__tests__/accountPasswordRoute.test.ts`
   - `apps/api/__tests__/authPasswordReset.test.ts`
   - `apps/api/__tests__/usersRoute.test.ts`
4. `feat(api): create sign-up accounts through the Admin SDK`
   - `apps/api/app/(routes)/auth/sign-up/route.ts`
   - `apps/api/(shared)/lib/toolkit-error-codes.ts`
   - `apps/api/__tests__/signUpProfile.test.ts`
   - `apps/api/__tests__/adminCreateUserErrorCodes.test.ts`
5. `feat(internationalization): password policy copy and AUTH_PASSWORD_TOO_SHORT`
   - `packages/internationalization/translations/apps/app/pages/admin/users.ts`
   - `packages/internationalization/translations/apps/app/pages/common/account.ts`
   - `packages/internationalization/translations/apps/app/pages/resetPassword/index.ts`
   - `packages/internationalization/translations/apps/app/pages/signUp/index.ts`
   - `packages/internationalization/translations/apps/web/pages/signUp/index.ts`
   - `packages/internationalization/translations/packages/shared/utils.ts`
6. `feat(app): apply the shared password policy to the form schemas`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(validations)/userFormSchema.ts`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(validations)/accountDeletionSchema.ts`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(validations)/accountFormSchema.ts`
   - `apps/app/app/[locale]/(unauthenticated)/reset-password/validations/resetPasswordSchema.ts`
   - `apps/app/app/[locale]/(unauthenticated)/sign-in/validations/signInSchema.ts`
   - `apps/app/app/[locale]/(unauthenticated)/sign-up/validations/signUpSchema.ts`
   - `apps/app/__tests__/accountFormSchema.test.ts`
   - `apps/app/__tests__/authSchemas.test.ts`
   - `apps/app/__tests__/accountApiErrorCopy.test.ts`
   - `apps/app/__tests__/passwordPolicySchemas.test.ts`
   - `apps/app/__tests__/passwordPolicyCopy.test.ts`
7. `feat(app): create the account through the API on sign-up`
   - `apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx`
   - `apps/app/__tests__/signUpFormApi.test.tsx`
8. `feat(web): create the account through the API and translate sign-up validation`
   - `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx`
   - `apps/web/app/[locale]/sign-up/validations/signUp.ts`
   - `apps/web/app/[locale]/sign-in/validations/signInSchema.ts`
   - `apps/web/__tests__/signUpSchema.test.ts`
   - `apps/web/__tests__/signUpFormApi.test.tsx`
9. `refactor(auth): remove client-side email sign-up`
   - `packages/auth/client.ts`
   - `packages/auth/provider.tsx`
   - `packages/auth/types.ts`
   - `packages/auth/package.json`
   - `packages/auth/components/sign-up.tsx` (removido)
   - `packages/auth/__tests__/clientEmulator.test.ts`
   - `packages/auth/__tests__/firebaseClient.test.ts`
10. `test(app): drop signUp from the auth client mocks`
    - `apps/app/__tests__/authProviderLanguageSwitch.test.tsx`
    - `apps/app/__tests__/sessionExpiredSignOut.test.tsx`
11. `docs: document the password policy and the sign-up route`
    - `docs/SECURITY.md`
    - `docs/PRE-PRODUCTION.md`
12. `docs(specs): audit the backlog and rescope account-security-mfa`
    - `specs/BACKLOG.md`
    - `specs/account-security-mfa.md`
    - `specs/observability-logging.md`
13. `docs(features): account-security-mfa`
    - `docs/features/account-security-mfa/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
      `review/review.md`)

Título de PR sugerido: `feat: password policy and API sign-up`.

### Commits realizados

(preenchido pelo orquestrador)
