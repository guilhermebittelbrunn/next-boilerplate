# Handoff do `/develop`: política de senha (fatia 1 de `account-security-mfa`)

Rodada autônoma do `/cycle`, 2026-09-26. Nada commitado, nenhuma branch criada. O working tree também tem as edições da auditoria em `specs/`, que não são desta etapa.

## Desvios do plano

1. **`auth/quota-exceeded` entrou no mapa de erros do Admin SDK**, como `USERS_AUTH_RATE_LIMITED` (429). O plano mapeava três códigos e mandava o resto para 500. Cota do projeto estourada é recusa temporária, e o código já tem copy nos 3 idiomas e status próprio em `statusForAuthErrorCode`. Os outros três nomes do plano conferem com o `firebase-admin` instalado (13.6.0, `lib/utils/error.js:411`, `:474`, `:539`, prefixo `auth/` em `:158`).
2. **Falha do rollback não vira 500 sem código.** Se o perfil não grava e o `deleteUser` também falha, a rota registra `[auth] sign-up-rollback-failed` e responde `500 USERS_PROFILE_CREATE_FAILED`. No plano, a exceção do `deleteUser` subia e o Next respondia 500 sem corpo. A conta órfã que sobra ganha o perfil na primeira leitura de `/auth/me` (`getMergedUserByUid`).
3. **`HTTP_STATUS.CREATED` (201) acrescentado** em `packages/shared/utils/helpers/httpStatus.ts`, que não tinha a constante. O esqueleto do plano já a usava.
4. **O teste de componente da `apps/web` testa as opções da mutation, não o DOM.** A `apps/web` roda Vitest em `environment: "node"` e não tem `@testing-library/react` nem `jsdom`, e acrescentar essas dependências seria dependência nova. O teste renderiza o form com `renderToString`, captura as opções do `useMutation` e exercita `mutationFn`, `onSuccess` e `onError`. Não cobre o estado desabilitado do botão nem o erro inline; o erro inline está coberto no teste do schema.
5. **Dois testes existentes mudaram de expectativa porque a regra mudou**, sem afrouxar nada: `accountPasswordRoute.test.ts` esperava `VALIDATION_FAILED` para senha nova curta e agora espera `AUTH_PASSWORD_TOO_SHORT`; `authPasswordReset.test.ts` e `authSchemas.test.ts` usavam `secret1` (7 caracteres) como senha nova válida e passaram para 8.

Nenhuma decisão do plano se mostrou errada. As três conferências pedidas deram:

- **Códigos do Admin SDK**: nomes conferem (item 1).
- **O que acontecia depois de `createUserWithEmailAndPassword`**: no `AuthProvider`, `signUpMutation` e `signInMutation` usavam o mesmo `onAuthSuccess` (`provider.tsx:332-363` antes da mudança: cookie de sessão, alerta de sucesso, redirecionamento pós-login). O e-mail de verificação da `apps/app` era um `onSuccess` passado ao `mutate` do formulário e agora é passado ao `signIn.mutate`. O perfil no Firestore nascia preguiçoso em `/auth/me` e agora nasce na rota, com a mesma forma. Não há analytics de cadastro no código (`git grep -i "sign_up\|trackSign"` vazio). O bootstrap de SSO web→app não depende de como a conta foi criada. Nenhum desses efeitos ficou de fora.
- **Consumidores de `signUp` em `packages/auth`**: além dos dois formulários e do componente sem uso, só havia mocks em testes (`packages/auth/__tests__/clientEmulator.test.ts`, `firebaseClient.test.ts`, `apps/app/__tests__/authProviderLanguageSwitch.test.tsx`, `sessionExpiredSignOut.test.tsx`), limpos. O `apps/e2e` não usa `signUp`: `signUp.spec.ts` dirige a tela.

## Blueprint → arquivos

| item | arquivos |
|------|----------|
| Fonte única | `packages/shared/utils/helpers/passwordPolicy.ts` (novo), `helpers/index.ts`, `helpers/httpStatus.ts` |
| Contrato | `packages/sdk/src/actions/auth/action.ts`: `SignUpRequest`, `AuthAccountCreated`, `signUp()` |
| Validação na API | `apps/api/(shared)/validation/password.schema.ts` (novo), `auth.schema.ts` (`signUpSchema`, `parseSignUp`, `parseWithPasswordPolicy`, reset com `newPasswordSchema`), `account.schema.ts`, `user-admin.schema.ts`, `app/(routes)/users/route.ts` |
| Rota de cadastro | `apps/api/app/(routes)/auth/sign-up/route.ts` (reescrita), `apps/api/(shared)/lib/toolkit-error-codes.ts` (`mapAdminCreateUserErrorToCode`) |
| `apps/app` | `sign-up/components/SignUpFormClient.tsx`; schemas `signUpSchema.ts`, `resetPasswordSchema.ts`, `signInSchema.ts`, `userFormSchema.ts`, `accountFormSchema.ts` (chave `newPasswordMin`), `accountDeletionSchema.ts` |
| `apps/web` | `sign-up/components/sign-up-form-client.tsx`, `sign-up/validations/signUp.ts` (factory `buildSignUpSchema`), `sign-in/validations/signInSchema.ts` (só a constante) |
| `packages/auth` | `client.ts`, `provider.tsx`, `types.ts` (sai `SignUpDTO`), `package.json` (sai `./components/sign-up`), `components/sign-up.tsx` (apagado) |
| i18n | `translations/apps/app/pages/{signUp,resetPassword}/index.ts`, `admin/users.ts`, `common/account.ts`, `translations/apps/web/pages/signUp/index.ts`, `translations/packages/shared/utils.ts` |
| Docs | `docs/SECURITY.md` (seção Autenticação e nota do rate limit), `docs/PRE-PRODUCTION.md` (item 8 e a nova "Declaração — o que a política de senha não alcança") |

## Contrato e raio de impacto

- `authApi.signUp` é novo; quem chama: `SignUpFormClient.tsx` (app) e `sign-up-form-client.tsx` (web). A rota não tinha cliente antes.
- `POST /auth/sign-up` mudou a resposta de `{ session, user }` para `201 { data: { created: true } }` e os erros para `{ error: { code } }`. Nenhum consumidor da forma antiga (`git grep "auth/sign-up" packages/sdk` estava vazio antes).
- `useAuth()` perdeu `signUp`. Fork que o use quebra no typecheck.
- `POST /users` ganhou teto de 1024 na senha e o código `AUTH_PASSWORD_TOO_SHORT`.

## Códigos de erro

- Novo: `AUTH_PASSWORD_TOO_SHORT` (400), em `apiErrors` nos 3 idiomas. Paridade conferida pelo teste de i18n; a presença de "8" na copy, por `passwordPolicyCopy.test.ts`.
- Reaproveitados na rota de cadastro: `VALIDATION_FAILED`, `USERS_AUTH_EMAIL_ALREADY_IN_USE`, `USERS_AUTH_INVALID_EMAIL`, `USERS_AUTH_WEAK_PASSWORD`, `USERS_AUTH_RATE_LIMITED`, `USERS_AUTH_SIGN_UP_FAILED`, `USERS_PROFILE_CREATE_FAILED`. Todos já tinham copy.
- Log novo: `[auth] sign-up-failed` e `[auth] sign-up-rollback-failed`, só com `requestId`.

## Validação (com o instrumento)

| afirmação | instrumento | resultado |
|-----------|-------------|-----------|
| Gates do CI passam | `pnpm turbo run lint typecheck test` | 26/26 tasks ok |
| Typecheck dos workspaces tocados | `pnpm turbo run typecheck --filter=api --filter=app --filter=web --filter=@repo/auth --filter=@repo/sdk --filter=@repo/internationalization` | 6/6 ok |
| Testes | `pnpm turbo run test --filter=...` | api 931, app 654, web 59, `@repo/auth` 101, `@repo/internationalization` 59, `@repo/shared` 44; zero falhas |
| Lint | `pnpm check` | 762 arquivos, sem erro |
| Nenhuma cópia da constante sobrou | `git grep -n "MIN_PASSWORD_LENGTH =" -- apps packages \| wc -l` | 0 |
| Caminho direto saiu do código | `git grep -n createUserWithEmailAndPassword -- apps packages \| wc -l` | 0 |
| Rota responde com código na borda, sob `next dev` | `pnpm --filter api dev` sem `ARCJET_KEY` + `curl -X POST /auth/sign-up` | 7 caracteres → `400 AUTH_PASSWORD_TOO_SHORT`; 7 espaços → idem; e-mail inválido → `400 VALIDATION_FAILED`; JSON quebrado → `400 VALIDATION_FAILED`; `POST /auth/password/reset` com 7 → `400 AUTH_PASSWORD_TOO_SHORT`. Servidor derrubado depois (porta 3002 livre) |

Não chamei a rota com senha válida no smoke: o `.env` da API aponta para o projeto Firebase de dev, e o caminho feliz criaria conta real. O caminho feliz está coberto por `signUpProfile.test.ts` com o Admin SDK mockado.

Testes novos ou alterados: `apps/api/__tests__/signUpProfile.test.ts` (reescrito, 18 casos), `adminCreateUserErrorCodes.test.ts` (novo), `authPasswordReset.test.ts`, `accountSchema.test.ts`, `accountPasswordRoute.test.ts`, `usersRoute.test.ts`; `apps/app/__tests__/passwordPolicySchemas.test.ts`, `passwordPolicyCopy.test.ts`, `signUpFormApi.test.tsx` (novos), `authSchemas.test.ts`, `accountFormSchema.test.ts`, `accountApiErrorCopy.test.ts`; `apps/web/__tests__/signUpSchema.test.ts`, `signUpFormApi.test.tsx` (novos).

## A verificar no `/test`

Nada disto foi medido aqui.

- **Cadastro de ponta a ponta na `apps/app` com o emulador**: 8 caracteres → `POST /auth/sign-up` 201, depois login, cookie de sessão, onboarding no passo 1 e `POST /auth/email-verification/send`. O E2E `apps/e2e/tests/signUp.spec.ts` (`demo1234`) deve continuar verde.
- **Cadastro na `apps/web`**: mesmo fluxo, sem e-mail de verificação; mensagens de validação em `/en/sign-up` e `/es/sign-up` no idioma da rota.
- **CORS da `apps/web` para `/auth/sign-up`**: a web já chamava a API no login, mas o cadastro é uma rota nova para ela. Repro: preflight de `http://localhost:3001` para `POST http://localhost:3002/auth/sign-up`.
- **Botão desabilitado entre a criação e o login** (duplo clique não cria duas contas). A app tem `isSubmitting = createAccount.isPending || signIn.isPending || googleSignIn.isPending`; a web não inclui o Google no `disabled` do submit, como antes. O teste de componente da app não mede o botão.
- **Toast de e-mail repetido** ("Este e-mail já está em uso.") vindo de `USERS_AUTH_EMAIL_ALREADY_IN_USE`, nas duas front-ends.
- **Conta antiga com senha de 6** (criada por REST no emulador): entra na app e na web, troca a senha informando a atual de 6, confirma a exclusão com 6.
- **Troca de senha**: nova de 7 mostra "A nova senha deve ter ao menos 8 caracteres." e a atual curta mostra a mensagem de 6.
- **Layout do erro inline** em light, dark e 375 px, nos 3 idiomas.
- **Colar senha** nos campos tocados.

## Lacunas de teste conhecidas

- Nenhum teste prova o `disabled` dos botões de cadastro durante criação e login (app e web).
- O teste da web não monta DOM (desvio 4).
- A mensagem cravada em pt-br do login da `apps/web` (`sign-in/validations/signInSchema.ts`) segue fora do escopo, como o plano definiu (D12).
- `apps/api/scripts/create-dev-admin.mjs` não aplica a política (P4, adotada como "não nesta fatia").

## Decisões em aberto

As perguntas P1 a P5 do plano seguem com a opção adotada lá. Nenhuma pergunta nova.

## Contas e dados criados

Nenhum. O smoke só exercitou caminhos que recusam antes do Firebase.
