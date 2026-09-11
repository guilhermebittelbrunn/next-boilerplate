# Handoff — Recuperação de senha e verificação de e-mail

- **Slug**: `auth-recovery-verification`
- **Plano**: `analyze/plan.md` (12 decisões D-1..D-12, roteiro V1–V13)
- **Data**: 2026-09-10
- **Branch**: `spec-sync-then-next-task` — **nada commitado**, working tree limpo de artefatos temporários.

O plano foi executado como está. **Três defeitos reais** apareceram na validação e foram corrigidos
(§3) — dois deles quebravam a feature por completo e o plano só suspeitava de um.

---

## 1. Blueprint → arquivos

| Item do blueprint | Arquivos |
|---|---|
| §10 `HTTP_STATUS` 503 | `packages/shared/utils/helpers/httpStatus.ts` (+`SERVICE_UNAVAILABLE`) |
| §10.11 SDK — 4 ações + 6 tipos | `packages/sdk/src/actions/auth/action.ts` |
| §10.1 geração do link de ação | `apps/api/(shared)/lib/auth-action-links.ts` **(novo)** |
| §10.2 toolkit — 2 verbos | `apps/api/(shared)/lib/firebase-identity-toolkit.ts` (`parseToolkitJson`, `identityResetPassword`, `identityApplyOobCode`) |
| §10.3 mapa de erro do `oobCode` | `apps/api/(shared)/lib/toolkit-error-codes.ts` (`mapOobActionMessageToCode`, `statusForAuthErrorCode`) |
| §10.4 schema Zod | `apps/api/(shared)/validation/auth.schema.ts` **(novo)** |
| §10.5 handler `reset-request` | `apps/api/app/(routes)/auth/password/reset-request/route.ts` |
| §10.6 handler `reset` | `apps/api/app/(routes)/auth/password/reset/route.ts` |
| §10.7 handler `verification/send` | `apps/api/app/(routes)/auth/email-verification/send/route.ts` |
| §10.8 handler `verification/confirm` | `apps/api/app/(routes)/auth/email-verification/confirm/route.ts` |
| §10.9 rate limit | `apps/api/proxy.ts` (4 paths + docblock) |
| §10.10 proxy da app | `apps/app/proxy.ts` (`PUBLIC_PATHS` +3, `OOB_ACTION_PATHS`, `matchesPathPrefix`) |
| §5.1 `/forgot-password` | `forgot-password/{page.tsx,components/ForgotPasswordForm.tsx,validations/forgotPasswordSchema.ts}` |
| §5.1 `/reset-password` | `reset-password/{page.tsx,components/ResetPasswordForm.tsx,validations/resetPasswordSchema.ts}` |
| §5.1 `/verify-email` | `verify-email/{page.tsx,components/VerifyEmailResult.tsx}` |
| §10.12 link no sign-in | `(unauthenticated)/sign-in/components/SignInForm.tsx` |
| §10.13 gatilho no sign-up | `(unauthenticated)/sign-up/components/SignUpFormClient.tsx` |
| §10.14 banner + montagem | `shared/components/ui/EmailNotVerifiedNotice.tsx`, `(authenticated)/(common)/layout.tsx` |
| §5.3 hook de mutations | `shared/hooks/useEmailVerification.ts` |
| §7 i18n | `translations/apps/app/pages/{forgotPassword,resetPassword,emailVerification}/index.ts` (novos), `pages/index.ts`, `pages/signIn/index.ts`, `packages/email/index.ts`, `packages/shared/utils.ts` |
| §10.17 env | `apps/api/.env.example` (4 comentários) |

**Fora do blueprint** (justificado): `apps/app/app/[locale]/(unauthenticated)/components/AuthCard.tsx`
(§2), `apps/api/env.ts` e `packages/auth/client.ts` (§3).

Todos os N/A do plano seguem N/A: **zero** Firestore, `apps/web`, `packages/email` (arquivos),
`queryKeys`, prefetch RSC, `loading.tsx`, `paths.ts`, `Container`/`FormContainer`/`Footer`/`Table`.

---

## 2. Desvios em relação ao plano

| # | Desvio | Por quê |
|---|---|---|
| 1 | **`AuthCard`** novo em `(unauthenticated)/components/` em vez de copiar o card do `SignInForm` nas 3 telas | O card aparece em **7 estados** (formulário, enviado, link inválido, sucesso ×2, erro). Copiar o wrapper 7× é duplicação sem ganho; o componente mantém exatamente a mesma classe (`w-full max-w-md space-y-8 rounded-xl border bg-card p-8 shadow-sm`), então as telas ficam irmãs do login como o plano quer. Sem `"use client"` — é presentacional |
| 2 | **`emailVerification.messages.resendFailed` não existe** | Era chave morta: o `onError` do reenvio usa `FormattedError` → `apiErrors`, que já traduz `EMAIL_NOT_CONFIGURED` / `EMAIL_SEND_FAILED` / `AUTH_RATE_LIMITED`. Uma chave a mais no dicionário que ninguém lê é dívida |
| 3 | Testes de schema em **`apps/app/__tests__/authSchemas.test.ts`** (estendido) em vez de 2 arquivos novos | O arquivo já existe e serve exatamente a isso (`buildSignInSchema`/`buildSignUpSchema`). Dois arquivos novos fragmentariam sem motivo |
| 4 | `apps/app/__tests__/emailNotVerifiedNotice.test.tsx` **novo** (não previsto) | É a prova determinística do **V9** (banner oculto sob impersonação), que o roteiro pedia por browser. Espelha `impersonationReadOnlyNotice.test.ts`; cobre os 4 termos do guard. Preferível a um screenshot: não apodrece |
| 5 | O catch de `buildAuthActionLink` **não** cita `auth/user-not-found`; a resolução da conta virou um `getUserByEmail` antes | Defeito real — §3.1 |
| 6 | `apps/api/env.ts` declara `NEXT_PUBLIC_APP_URL` | Defeito real — §3.2 |
| 7 | `reloadCurrentUser()` novo em `packages/auth/client.ts`, contra a letra do **D-5** | Defeito real — §3.3. D-5 recusa os *remetentes* do Firebase client (`sendPasswordResetEmail`/`sendEmailVerification`), porque mandam pela página hospedada. Um `reload` não envia nada e fica ao lado do `getIdToken` que já vive lá; a alternativa era importar `firebase/auth` dentro de `apps/app`, furando a fronteira do pacote |

---

## 3. Defeitos encontrados na validação (e corrigidos)

### 3.1 🔴 Conta inexistente virava **500** — furo de anti-enumeração

O plano (§10.1) tratava a conta ausente por `error.code === "auth/user-not-found"`. **Na prática o
Firebase não devolve isso** em `generatePasswordResetLink`. Medido contra o projeto real:

```
code= auth/internal-error
message= "INTERNAL ASSERT FAILED: Unable to create the email action link"
```

Resultado antes da correção: `POST /auth/password/reset-request` respondia **500** para e-mail
desconhecido e **200** para conhecido — ou seja, o endpoint **era** um oráculo de enumeração, exatamente
o que D-2 existe para impedir.

Correção em `auth-action-links.ts`: a conta é resolvida antes, com `getUserByEmail`, que **sim** devolve
`auth/user-not-found`; e qualquer recusa do gerador de link passou a virar `null` (logado sem endereço,
prefixo `[auth-action-link]`) em vez de exceção. Coberto por 3 testes novos, incluindo um que garante que
o log não carrega o endereço.

### 3.2 🔴 Feature morta em desenvolvimento (`EMAIL_NOT_CONFIGURED` sempre)

O plano registrou como ⚪ que `env.NEXT_PUBLIC_APP_URL` "pode vir `undefined`" em dev. É pior: **vem
sempre**. Com `skipValidation: true`, o `createEnv` do `@t3-oss/env-nextjs` responde com o `runtimeEnv`
**do próprio módulo e descarta tudo o que veio por `extends`** — comprovado isoladamente:

| `skipValidation` | `env.NEXT_PUBLIC_APP_URL` (herdado de `core()`) |
|---|---|
| `true` | `undefined` |
| `false` | `"http://localhost:3000"` |

Como `apps/api/env.ts:30` liga `skipValidation` em `development`, `canSendAuthActionLink()` era
permanentemente falso: **todo** pedido de reset em dev respondia 503, em qualquer fork, com `.env`
correto. Correção: `apps/api/env.ts` declara `NEXT_PUBLIC_APP_URL` no seu próprio `client`/`runtimeEnv`
(validado em produção, presente em dev).

> Vale para o `/spec --sync`: **qualquer** valor que a `apps/api` consuma via `extends` está `undefined`
> em dev pelo mesmo motivo. Não auditei os outros consumidores — está fora desta tarefa.

### 3.3 🟡 O banner sobrevivia à confirmação

D-3 apostava em `getIdToken(true)` para retirar o banner. Medido: o `POST .../confirm` devolvia 200, o
Firebase passava a `emailVerified: true`, **e o banner continuava na tela**. `User.emailVerified` vem do
registro da conta, não do ID token — um refresh de token não o atualiza.

Correção: `reloadCurrentUser()` em `packages/auth/client.ts` (`reload(user)` **e** `getIdToken(true)`: o
primeiro atualiza o registro, o segundo faz o `onIdTokenChanged` re-disparar). Chamado com `.catch()` no
hook — o `oobCode` já foi gasto nesse ponto, então uma falha no refresh não pode transformar uma
confirmação bem-sucedida em tela de erro. **Reconferido no browser: o banner desaparece (V8).**

---

## 4. Contrato

`AuthActions` (`packages/sdk/src/actions/auth/action.ts`) — só adição, nada quebra:

| Método | Rota | Tipos |
|---|---|---|
| `requestPasswordReset` | `POST /auth/password/reset-request` | `PasswordResetRequestBody` → `AuthActionRequested` |
| `confirmPasswordReset` | `POST /auth/password/reset` | `PasswordResetConfirmBody` → `AuthActionConfirmed` |
| `sendEmailVerification` | `POST /auth/email-verification/send` | `EmailVerificationSendBody?` → `AuthActionRequested` |
| `confirmEmailVerification` | `POST /auth/email-verification/confirm` | `EmailVerificationConfirmBody` → `AuthActionConfirmed` |

**Consumidores**: `ForgotPasswordForm` (1), `ResetPasswordForm` (2), `SignUpFormClient` + `EmailNotVerifiedNotice`
via `useEmailVerification` (3), `VerifyEmailResult` via `useEmailVerification` (4). `me()` e
`signInWithGoogle()` intocados; nenhum chamador existente foi tocado.

**Raio de impacto fora do recurso**: `packages/shared` (1 linha), `packages/auth/client.ts` (1 export
novo), `apps/api/env.ts` (1 var), `apps/api/proxy.ts` e `apps/app/proxy.ts`.

---

## 5. Códigos de erro novos — 6, nos 3 idiomas

Em `translations/packages/shared/utils.ts` (`apiErrors`), pt-br/en/es, paridade verificada:

`EMAIL_NOT_CONFIGURED` (503) · `EMAIL_SEND_FAILED` (503) · `AUTH_OOB_CODE_INVALID` (400) ·
`AUTH_OOB_CODE_EXPIRED` (400) · `AUTH_PASSWORD_RESET_FAILED` (400) ·
`AUTH_EMAIL_VERIFICATION_FAILED` (400).

Reaproveitados: `VALIDATION_FAILED`, `USERS_AUTH_WEAK_PASSWORD`, `USERS_AUTH_RATE_LIMITED`,
`AUTH_INVALID_TOKEN`, `AUTH_RATE_LIMITED`. Slugs de e-mail novos: `resetPassword`, `verifyEmail`
(5 chaves × 2 × 3 = 30 valores).

---

## 6. Validação

| Gate | Comando | Resultado |
|---|---|---|
| Lint/format | `pnpm check` | ✅ 454 arquivos, 0 erro |
| CI completo | `pnpm turbo run lint typecheck test` | ✅ **23/23 tasks** |
| API | `pnpm --filter api test` | ✅ 25 arquivos / 228 testes |
| App | `pnpm --filter app test` | ✅ 24 arquivos / 170 testes |
| Paridade i18n | `pnpm --filter @repo/internationalization test` | ✅ 27 testes (paridade dos 3 idiomas) |

**Testes escritos**: `apps/api/__tests__/authActionLinks.test.ts` (11) ·
`authPasswordReset.test.ts` (16) · `authEmailVerification.test.ts` (13) ·
`apps/app/__tests__/emailNotVerifiedNotice.test.tsx` (5) · extensões em `corsOrigin.test.ts` (+2, rate
limit exato das 4 rotas e vizinhas não limitadas), `apps/app/__tests__/proxy.test.ts` (+2, `oobCode`
preservado para visitante logado), `authSchemas.test.ts` (+9), `packages/email/__tests__/templates.test.tsx`
(+6, 2 slugs × 3 idiomas).

---

## 7. Validação visual — V1 a V13

`agent-browser` (comandos **em sequência**), `apps/app` :3000 + `apps/api` :3002, **contra o projeto
Firebase real**. Screenshots em `develop/screenshots/` (30 arquivos).

| # | Status | Prova |
|---|---|---|
| V1 | ✅ | "Esqueci minha senha" no rodapé do sign-in, acima de "Cadastrar" → `/forgot-password`. `v1-sign-in-footer-light.png` |
| V2 | ✅ **forte** | `v2-sent-known-address.png` e `v2-sent-unknown-address.png` têm **o mesmo SHA1** (`ac21e722…`) — idênticos byte a byte. Na API: `{"data":{"requested":true}} [200]` para os dois, mesmo com `provider-error` no e-mail conhecido |
| V3 | ✅ | Painel "Link inválido", sem formulário, sem erro cru. `v3-reset-invalid-link.png` |
| V4 | ✅ | `?oobCode=lixo` → toast `AUTH_OOB_CODE_INVALID` traduzido. `v4-reset-oobcode-invalid.png` |
| V5 | ✅ **ciclo real** | Pedido → `oobCode` real do Admin SDK → senha nova → **login com a senha nova** entrando no painel. `v5-reset-success.png` |
| V6 | ✅ | Sessão aberta **antes** do reset: a navegação seguinte cai em `/sign-in?redirect=%2Fpt-br`. `tokensValidAfterTime` avançou → `revokeUserSessions` rodou |
| V7 | ✅ | Cadastro pela UI disparou `POST /auth/email-verification/send` **sem bloquear** a navegação (D-1 provado). Banner no painel comum; "reenviar" → toast `EMAIL_SEND_FAILED` traduzido. `v7-*.png` |
| V8 | ✅ | `?oobCode=` real → "E-mail confirmado" → voltar ao painel: **banner sumiu, sem reload manual**. `v8-verify-success.png`, `v8-notice-gone-after-confirm.png` |
| V9 | ⚠️ **por teste**, não por browser | `emailNotVerifiedNotice.test.tsx` cobre `isImpersonating → null` e os outros 3 termos. Não dirigi impersonação real: eu já havia verificado todas as contas comuns de QA do projeto e criar admin+comum novos com perfil no Firestore saía do escopo. **Recomendo ao `/test` fechar por browser** |
| V10 | ✅ | `pt-br`/`en`/`es` nas 3 telas (título, campos, botão, links). `v10-forgot-{en,es}.png` |
| V11 | ✅ | Light + dark + mobile (390×844) nas 3 telas e no banner, sem overflow. `v11-*.png` |
| V12 | ✅ | 6 renders (2 slugs × 3 idiomas): assunto, título, corpo, CTA, URL de fallback, nota de ignorar, rodapé de conta. `v12-email-*.png` |
| V13 | ✅ | Com `RESEND_*` vazios (estado nativo do `.env` local), `/forgot-password` mostra `EMAIL_NOT_CONFIGURED` traduzido — **não** finge sucesso. `v13-email-not-configured.png` |

**Bônus (o bug do plano §5.2b)**: visitante **logado** abrindo `/pt-br/reset-password?oobCode=<real>`
**permaneceu** na página com o código intacto e o formulário renderizado — o bounce não o engoliu.

### Como o e-mail foi contornado (leia antes de reproduzir)

Não tenho credencial Resend. Para exercitar os caminhos de sucesso, `RESEND_FROM`/`RESEND_TOKEN` de
`apps/api/.env` receberam **placeholder** temporário: `isEmailEnabled()` passa, `sendEmail` falha no
provedor (`provider-error`) e o comportamento projetado aparece — o `reset-request` responde **sucesso**
(anti-enumeração) e o reenvio autenticado responde **`EMAIL_SEND_FAILED` 503**. A assimetria de D-2/D-4
foi observada ao vivo, nos dois sentidos.

O `oobCode` foi obtido pelo **mesmo** `generatePasswordResetLink`/`generateEmailVerificationLink` que a
rota usa, via script descartável (removido). **`apps/api/.env` foi restaurado ao estado original** e
nenhum script sobrou no working tree.

**Não coberto**: a entrega real pelo Resend (SPF/DKIM, caixa de entrada, renderização em cliente de
e-mail). Precisa de credencial e domínio verificado — §9.

---

## 8. Pendências e decisões em aberto

1. **V9 por browser** — ver acima. Não bloqueia; o guard está coberto por teste.
2. **Entrega real de e-mail nunca exercitada** — este é o primeiro `sendEmail` da `apps/api` (risco
   herdado, plano §11.1). O que foi provado: o template renderiza nos 3 idiomas, `sendEmail` é chamado com
   `action`/`locale`/`to` certos, e as duas falhas (`not-configured`, `provider-error`) se comportam como
   projetado. O que falta: um envio que **chega**.
3. **O reset marca o e-mail como verificado.** Efeito do próprio Firebase (`accounts:resetPassword`):
   observei `emailVerified` virar `true` após o reset, e o banner desaparecer em consequência. Coerente
   com Q6 e favorável, mas **não estava no plano** — vale um critério de aceite explícito.
4. **Rate limit não observável localmente**: `ARCJET_KEY` vazio no `.env` local, e a API avisa no boot
   (`rate limiting is DISABLED`). As 4 rotas **estão** em `RATE_LIMITED_PATHS` com teste de match exato,
   mas o 429 + `Retry-After` real não foi exercitado.
5. **O Firebase limita a geração de links** (`TOO_MANY_ATTEMPTS_TRY_LATER` após ~6 chamadas seguidas no
   projeto de dev). Não é defeito nosso; atrapalha teste repetitivo. Nesse estado
   `buildAuthActionLink` responde `null` → `reset-request` devolve sucesso (correto) e o reenvio devolve
   `AUTH_EMAIL_VERIFICATION_FAILED`.
6. **Contas de QA alteradas** no projeto Firebase de desenvolvimento: as contas `qa-common-ci@`,
   `qa-probe-common@` e `qa-api-hardening@` tiveram a **senha redefinida** durante a validação (as
   senhas novas não são registradas aqui — este arquivo é versionado; peça-as por canal privado ou
   redefina de novo pelo próprio fluxo). Essas três e mais uma conta criada pela UI ficaram
   `emailVerified: true`. Se o QA depende do estado anterior, precisa reprovisionar.
7. **Q1–Q8 do plano** seguem com a recomendação adotada; nenhuma reaberta.

---

## 9. Lacunas de teste conhecidas (para o `/test`)

- **Autorização**: `AUTH_INVALID_TOKEN` no reenvio está coberto por teste; falta **admin personificando**
  chamando a rota (deve agir sobre o ator, não sobre o personificado).
- **`oobCode` já usado**: segundo POST com o mesmo código (o primeiro POST está coberto). Também
  `oobCode` acima de `OOB_CODE_MAX` (2048).
- **Duplo clique/submit repetido** nos 3 formulários e no botão de reenviar; cancelar no meio.
- **Rate limit de verdade**: 21ª chamada em 60s com `ARCJET_KEY` presente → 429 + `Retry-After`.
- **Sessão cruzando apps**: V6 provou a revogação na `apps/app`; a `apps/web` compartilhando o mesmo
  cookie não foi verificada.
- **Envio real pelo Resend**, ponta a ponta (item 2 acima).
- **V9 por browser** (item 1 acima).
- **`/verify-email` com o código consumido por um scanner de e-mail** (trade-off aceito em D-9).
- **`packages/auth/client.ts`**: `reloadCurrentUser` não tem teste unitário — `packages/auth` não tem
  suíte Vitest hoje. Coberto indiretamente (V8) e blindado pelo `.catch()`.

---

## 10. Pós-entrega (do plano §12, revisado)

Nenhuma variável **nova**. Passam a ser obrigatórias de fato: `RESEND_FROM` + `RESEND_TOKEN` (domínio
verificado, SPF + DKIM), `FIREBASE_WEB_API_KEY` (ou `NEXT_PUBLIC_FIREBASE_API_KEY`) e
`NEXT_PUBLIC_APP_URL` apontando para o host real da `apps/app`. `ARCJET_KEY` recomendada: sem ela o
pedido de reset é ilimitado por IP. **Nenhum passo no console do Firebase** (D-7 confirmado na prática:
o ciclo completo rodou sem tocar em domínio autorizado ou action URL).
