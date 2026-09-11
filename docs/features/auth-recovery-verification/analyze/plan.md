# Análise + Blueprint — Recuperação de senha e verificação de e-mail

- **Slug**: `auth-recovery-verification`
- **Spec de origem**: [`specs/auth-recovery-verification.md`](../../../../specs/auth-recovery-verification.md) (#1 da fila do `specs/BACKLOG.md`)
- **Dependência**: `transactional-emails` — **satisfeita em `main`** (PR #9, commit `400f290`)
- **Card / wiki / Figma / print**: nenhum. **Referências não lidas: nenhuma.**
- **Data**: 2026-09-10

> A spec responde *o quê/por quê* e é decisão de produto tomada. Este documento responde **como**.
> Toda afirmação abaixo cita `arquivo:linha` conferido em 2026-09-10.

---

## 0. Sumário executivo do desenho

Quatro rotas novas na `apps/api` sob `auth/`, quatro métodos novos em `AuthActions` do SDK, três páginas
novas no grupo `(unauthenticated)` da `apps/app`, um banner no painel comum, dois slugs de ação no
dicionário de e-mail e seis `error.code` novos. **Zero mudança em Firestore** (coleção, campo, índice,
regra, backfill: nada — `emailVerified` vive no Firebase Auth, não no documento `user`).

O eixo do desenho é: **o link de ação é gerado pelo Admin SDK, o `oobCode` é extraído da URL que ele
devolve, e o e-mail sai pelo nosso Resend apontando para uma página nossa.** A página hospedada do
Firebase nunca é alcançada e **nenhum fork precisa configurar o console** para isso funcionar.

---

## 1. Contexto da tarefa

### 1.1 Resumo em uma frase

Quem esquece a senha passa a recuperá-la sozinho por e-mail traduzido e tela própria, e quem se cadastra
por senha recebe verificação de e-mail com reenvio protegido — sem ninguém tocar no console do Firebase.

### 1.2 Objetivos (o corte de MVP, verbatim da spec `:61-65`)

| # | Item do corte | Onde é entregue |
|---|---------------|-----------------|
| 1 | Login oferece "esqueci minha senha"; usuário pede redefinição pelo e-mail | `SignInForm.tsx` + `/forgot-password` + `POST /auth/password/reset-request` |
| 2 | E-mail traduzido, link de validade limitada, senha nova por tela do **próprio app** | slug `resetPassword` + `/reset-password?oobCode=` + `POST /auth/password/reset` |
| 3 | Redefinir encerra as sessões ativas em todos os apps | `revokeUserSessions` no handler de reset |
| 4 | Cadastro dispara verificação; app mostra aviso ao não verificado com reenvio protegido | `SignUpFormClient` + `POST /auth/email-verification/send` + `EmailNotVerifiedNotice` |
| 5 | Erros novos chegam como `error.code` traduzido nos 3 idiomas | 6 códigos novos em `apiErrors` |

### 1.3 Fora de escopo

Herdado da spec (`:67-73`), **sem reabertura**:

- **Bloquear o acesso do não verificado.** O app só *expõe* o estado. Nenhum guard, nenhum proxy, nenhum
  layout passa a checar `emailVerified`.
- Troca de senha autenticada e "sair de todos os dispositivos" na UI → `specs/account-settings.md`.
- MFA/2FA · troca de e-mail com verificação do endereço novo.
- Rate limiting robusto (janela dedicada por identidade) → `api-hardening`. Aqui a rota entra na janela
  global existente de 20 req/60s por IP.

Fora de escopo decidido **nesta análise** (justificado em §11):

- Corrigir as 3 rotas de auth pré-existentes (`sign-in`, `sign-up`, `sign-in/google`), que não validam
  body e respondem erro em 3 dialetos diferentes.
- Levar o banner de não verificado para o painel **admin** ou para a `apps/web`.
- Ligar o gatilho de verificação na rota morta `POST /auth/sign-up`.

### 1.4 Apps impactados

| Camada | Impacto |
|--------|---------|
| `apps/api` | 4 rotas públicas/actor-autenticadas novas, 1 lib nova, 1 schema novo, 2 libs estendidas, `proxy.ts` (rate limit) |
| `apps/app` | 3 páginas em `(unauthenticated)`, 1 banner, 1 hook, `SignInForm`, `SignUpFormClient`, `proxy.ts` (paths públicos + bounce) |
| `apps/web` | **N/A** — o login do usuário vive na `apps/app` (spec `:82`) |
| `packages/sdk` | 4 métodos + 6 tipos em `AuthActions` |
| `packages/internationalization` | 3 nós novos em `apps.app.pages`, 1 chave em `signIn`, 2 slugs em `packages.email.actionLink.actions`, 6 códigos em `apiErrors` |
| `packages/shared` | 1 linha: `SERVICE_UNAVAILABLE: 503` em `HTTP_STATUS` |
| `packages/auth` | **N/A** — `revokeUserSessions` (`server.ts:212`) já existe e basta. **Nada é adicionado a `client.ts`**: ver D-5 |
| `packages/email` | **N/A** — nenhum arquivo tocado. `action-link.tsx:11-12` é genérico por slug |
| Firestore | **N/A** — nenhuma coleção, campo, índice, regra ou backfill |

### 1.5 Área do painel, modo de produto, assinatura

- **Área**: as três páginas novas são **não autenticadas** (grupo `(unauthenticated)`, layout em
  `(unauthenticated)/layout.tsx:38-42`, que já centraliza qualquer `children` num painel de 400px — cabe
  sem alteração). O banner vive no painel **comum** (`(common)/layout.tsx:36-42`).
- **Modo de produto**: as páginas de recuperação funcionam igual nos dois modos (o login é na `apps/app`
  em ambos). O **banner** só aparece no painel comum, que no modo `simple` é inalcançável pelo usuário
  comum (`(common)/layout.tsx:22-34` manda admin para `/admin`; no `simple` o comum opera na `apps/web`).
  → registrado em Q3.
- **Assinatura/plano**: não depende. Nada de `@repo/payments`.

### 1.6 Genérico × específico

100% genérico, e é a razão de estar no core: todo fork herda recuperação de senha. Nada de domínio de
produto entra em `packages/*` — a copy dos e-mails vai para o dicionário (que o fork traduz) e a marca
já está isolada em `packages/email/brand.ts`.

### 1.7 Dependências externas e env

Nenhuma variável **nova**. Três que existem deixam de ser opcionais **de fato**:

| Var | Onde está | O que muda |
|-----|-----------|-----------|
| `FIREBASE_WEB_API_KEY` | `apps/api/.env.example:12`, lida em `firebase-identity-toolkit.ts:27` | Passa a ser exigida também no *confirm* de reset e de verificação |
| `NEXT_PUBLIC_APP_URL` | `apps/api/.env.example:33`, schema em `packages/next-config/keys.ts:22` (`optional()`), disponível na API via `apps/api/env.ts:9` (`extends: [… core() …]`) | Passa a ser a **base do link do e-mail**. Sem ela não há link que funcione |
| `RESEND_FROM` / `RESEND_TOKEN` | `apps/api/.env.example:19-20`, schema `packages/email/keys.ts:47-48` | Sem elas o fluxo de reset **não existe**, e a rota diz isso (D-4) |

---

## 2. Dados (Firestore) — **N/A por completo**

Registro explícito, porque é um resultado e não um esquecimento:

- **Coleção**: nenhuma nova; `user` inalterada. O documento persistido tem só 5 campos
  (`packages/sdk/src/types/user/user.ts:7-14`: `type`, `reference_id`, `createdAt`, `updatedAt`,
  `deletedAt`) e **não guarda e-mail** — `userRepository` só tem `findByReferenceId(uid)`
  (`user.repository.ts:15-30`) e `list` (`:32-43`).
- **Campos novos**: nenhum. `emailVerified` já viaja no `UserWithAuthDTO`
  (`packages/sdk/src/types/user/user.ts:33`) porque `serializeUserRecord` o copia do `UserRecord` do
  Firebase Auth (`user.mapper.ts:8`). A fonte da verdade é o Auth, não o Firestore.
- **Consultas novas**: nenhuma. O limite conhecido do `BaseRepository` (sem paginação, sem `orderBy`,
  filtro em memória) **não é exercitado** por esta feature.
- **`getUserByEmail`**: a resolução e-mail → uid usa o **Admin SDK**
  (`getAuthInstance().getUserByEmail`), não o Firestore. Primeiro uso desse método no repo (grep: zero
  ocorrências hoje).
- **Índice composto**: nenhum. **Regras do Firestore**: inalteradas. **Backfill**: nenhum.

---

## 3. Contrato — `@repo/sdk`

Tudo entra em `AuthActions` (`packages/sdk/src/actions/auth/action.ts`), que já está registrada como
`authApi` no `Client` (`packages/sdk/src/client/index.ts:14,19`). **Nenhum arquivo novo no SDK, nenhuma
entrada nova no `Client`, nenhum tipo em `src/types/`** — o recurso é auth, não uma entidade de domínio.

**Contexto**: nenhum. Estas ações não são de painel; três são públicas e uma é do ator. Não há
`ensureIsCommonContext()`/`ensureIsAdminContext()` no caminho.

### 3.1 Tipos novos

```ts
// packages/sdk/src/actions/auth/action.ts

export type PasswordResetRequestBody = {
    email: string;
    /** Idioma do e-mail. Ausente → a API cai no default do fork. */
    locale?: string;
};

export type PasswordResetConfirmBody = {
    oobCode: string;
    password: string;
};

export type EmailVerificationSendBody = {
    locale?: string;
};

export type EmailVerificationConfirmBody = {
    oobCode: string;
};

/** Resposta deliberadamente sem informação: ver a decisão anti-enumeração. */
export type AuthActionRequested = { requested: true };

export type AuthActionConfirmed = { confirmed: true };
```

### 3.2 Assinaturas

```ts
async requestPasswordReset(body: PasswordResetRequestBody): Promise<AuthActionRequested>
async confirmPasswordReset(body: PasswordResetConfirmBody): Promise<AuthActionConfirmed>
async sendEmailVerification(body?: EmailVerificationSendBody): Promise<AuthActionRequested>
async confirmEmailVerification(body: EmailVerificationConfirmBody): Promise<AuthActionConfirmed>
```

Todas seguem o padrão de `me()` (`action.ts:32-39`): `this.client.request<Response<T>>` e retorno de
`data.data`.

### 3.3 Quem quebra

**Ninguém.** As adições são puramente aditivas. Consumidores atuais de `authApi`:
`apps/app/shared/lib/postLoginNavigation.ts:18`, `apps/app/lib/server/authSession.ts:23` (ambos `me()`)
e `apps/app/shared/lib/googleSignInApi.ts:36` (`signInWithGoogle`). Nenhum é tocado.

---

## 4. API (`apps/api`)

### 4.1 Achado que determina o desenho: o sign-up do app **não passa pela API**

Confirmado por grep em `apps` + `packages` (2026-09-10): `POST /auth/sign-up` e `POST /auth/sign-in`
**não têm nenhum chamador**. O SDK só expõe `me()` (`action.ts:32`) e `signInWithGoogle()` (`:45`). O
cadastro do app vai direto ao Firebase pelo client SDK:
`SignUpFormClient.tsx:92-97` → `provider.tsx:224-229` (`signUpMutation`) →
`packages/auth/client.ts:127-130` (`createUserWithEmailAndPassword`).

**Consequência**: pôr o gatilho de verificação dentro de `auth/sign-up/route.ts` **não dispararia nada**
pela UI. O gatilho tem de ser uma chamada explícita do cliente após o cadastro — o que, de bônus,
resolve o item 2 das decisões de produto de graça: o caminho Google (`googleSignInApi.ts`) simplesmente
não chama. → **D-1**.

### 4.2 Rotas, métodos e guard

| Método + path | Auth | Guard | Rate-limited |
|---|---|---|---|
| `POST /auth/password/reset-request` | pública | nenhum (`export async function POST`) | **sim** |
| `POST /auth/password/reset` | pública (o `oobCode` é a credencial) | nenhum | **sim** |
| `POST /auth/email-verification/send` | ator autenticado | `resolveApiActor(req)` inline | **sim** |
| `POST /auth/email-verification/confirm` | pública (o `oobCode` é a credencial) | nenhum | **sim** |

**Não existe wrapper de rota pública neste repo** — público é a *ausência* de guard, e as 3 rotas de auth
atuais são `export async function POST(req: Request)` cru (`sign-in/route.ts:4`, `sign-up/route.ts:10`,
`sign-in/google/route.ts:9`). As rotas novas seguem esse padrão; **não inventar um `publicApi`** nesta
tarefa.

**Por que `resolveApiActor` e não `requireCommonPanelApi`** na rota de reenvio (→ **D-6**):

1. O precedente exato é `auth/me/route.ts:5-6`, que é autenticada e não é de painel.
2. `requireCommonPanelApi` exige perfil `COMMON` (`common-panel.ts:74-79`) — excluiria admin, e é o
   guard que resolve **impersonação**, cujo `subjectProfile` é justamente quem *não* deve receber o
   e-mail.
3. `assertReadOnlyWhileImpersonating` (`impersonation-read-only.ts:19-30`) recusaria o POST em modo
   personificação. Como `resolveApiActor` devolve sempre o **ator real**, o reenvio age na conta de quem
   está logado de verdade, o que é o comportamento seguro. E a UI nunca oferece o botão nessa situação
   (§6).

**Header customizado novo**: nenhum → `allowHeaders` do CORS (`apps/api/(shared)/lib/cors.ts:12-18`)
fica intacto.

### 4.3 Rate limit — passo obrigatório e não automático

`isRateLimitedPath` usa `Array.includes` (`apps/api/proxy.ts:37-39`), **match exato**. Uma rota nova
nasce sem limite. As 4 strings entram literalmente em `RATE_LIMITED_PATHS` (`proxy.ts:31-35`).

Limitações a registrar, não a resolver aqui:

- A janela é **global por IP**: 20 req/60s (`packages/security/index.ts:13,19,48`), compartilhada com
  `sign-in`/`sign-up`. Não há orçamento por endereço de e-mail. Isso é `api-hardening`, não este corte.
- Sem `ARCJET_KEY` o limitador é **no-op silencioso** (`packages/security/index.ts:42-44`). Ou seja: num
  fork sem Arcjet, o reenvio de verificação e o pedido de reset ficam ilimitados. Vai para o
  pós-entrega (§12) e para o `.env.example`.

### 4.4 Validação na borda (Zod)

Arquivo novo `apps/api/(shared)/validation/auth.schema.ts`, no estilo de `entity.schema.ts` (consts para
magic numbers no topo, união discriminada, `{ error: { code: "VALIDATION_FAILED" } }` +
`HTTP_STATUS.BAD_REQUEST`). Body sempre lido com `parseRequestJson(req)`
(`apps/api/(shared)/lib/parse-request-json.ts:4`) — **as rotas de auth atuais não fazem isso; as novas
fazem**.

`localeSchema` reaproveita `locales` de `@repo/internationalization/utils:3` (`z.enum(locales)`) — não
inventar um union novo de idiomas.

`MIN_PASSWORD_LENGTH = 6`, coerente com `user-admin.schema.ts:4`, `signInSchema.ts:6` e o schema de
cadastro do app.

### 4.5 Persistência

Nenhum repositório novo, nenhum mapper novo, nenhum mapper alterado. O único acesso a dados é ao Firebase
Auth via Admin SDK (`getAuthInstance()`, `packages/auth/server.ts:66`).

### 4.6 Erros — códigos e status

| `error.code` | Status | Quando | Novo? |
|---|---|---|---|
| `VALIDATION_FAILED` | 400 | JSON inválido ou Zod reprovando | existe (`utils.ts:29`) |
| `EMAIL_NOT_CONFIGURED` | **503** | `isEmailEnabled()` falso **ou** `NEXT_PUBLIC_APP_URL` ausente — checado **antes de qualquer lookup** | **novo** |
| `AUTH_OOB_CODE_INVALID` | 400 | toolkit devolve `INVALID_OOB_CODE` | **novo** |
| `AUTH_OOB_CODE_EXPIRED` | 400 | toolkit devolve `EXPIRED_OOB_CODE` | **novo** |
| `USERS_AUTH_WEAK_PASSWORD` | 400 | toolkit devolve `WEAK_PASSWORD` | existe (`utils.ts:31`) |
| `USERS_AUTH_RATE_LIMITED` | **429** | toolkit devolve `TOO_MANY_ATTEMPTS_TRY_LATER` | existe (`utils.ts:33`) |
| `AUTH_PASSWORD_RESET_FAILED` | 400 | fallback do toolkit no confirm de reset (inclui `USER_DISABLED`) | **novo** |
| `AUTH_EMAIL_VERIFICATION_FAILED` | 400 | fallback do toolkit no confirm de verificação | **novo** |
| `EMAIL_SEND_FAILED` | **503** | `provider-error` **na rota autenticada** de reenvio | **novo** |
| `AUTH_INVALID_TOKEN` | 401 | `resolveApiActor` devolve `null` no reenvio | existe (`utils.ts:8`) |
| `AUTH_RATE_LIMITED` | 429 | estouro da janela, resposta do `proxy.ts:77-88` | existe (`utils.ts:43`) |

**6 códigos novos** → 6 entradas × 3 idiomas em
`packages/internationalization/translations/packages/shared/utils.ts` (§7). Sem isso, o
`parity.test.ts:55-59` reprova.

`HTTP_STATUS` não tem 503 (`packages/shared/utils/helpers/httpStatus.ts:1-13`) → **acrescentar
`SERVICE_UNAVAILABLE: 503`**. Justificativa: `not-configured` não é erro do cliente nem bug — é
dependência ausente. Um `500` mentiria e um `400` culparia o usuário. É uma linha, genérica, no lugar
certo.

### 4.7 Contrato de resposta

| Rota | Sucesso |
|---|---|
| `reset-request` | `200` `{ "data": { "requested": true } }` |
| `email-verification/send` | `200` `{ "data": { "requested": true } }` |
| `password/reset` | `200` `{ "data": { "confirmed": true } }` |
| `email-verification/confirm` | `200` `{ "data": { "confirmed": true } }` |

`200 { data }` e **não `204`**: `HTTP_STATUS` não tem 204 e o SDK devolve `data.data` — um 204 sem body
faria `data` ser `undefined` e o desempacotamento estourar. Corpo mínimo e uniforme, sem informação
explorável.

---

## 5. Front-end (`apps/app`)

### 5.1 Rotas e renderização

```
apps/app/app/[locale]/(unauthenticated)/
├── layout.tsx                                   ← intacto (:38-42 já centraliza qualquer children)
├── sign-in/components/SignInForm.tsx            ← EDITADO (link no rodapé, :186-196)
├── sign-up/components/SignUpFormClient.tsx      ← EDITADO (gatilho de verificação no onSuccess)
├── forgot-password/
│   ├── page.tsx                                 ← NOVO  server: generateMetadata + <ForgotPasswordForm />
│   ├── components/ForgotPasswordForm.tsx        ← NOVO  "use client"
│   └── validations/forgotPasswordSchema.ts      ← NOVO  buildForgotPasswordSchema(dictionary)
├── reset-password/
│   ├── page.tsx                                 ← NOVO  server: lê searchParams.oobCode
│   ├── components/ResetPasswordForm.tsx         ← NOVO  "use client"
│   └── validations/resetPasswordSchema.ts       ← NOVO  buildResetPasswordSchema(dictionary)
└── verify-email/
    ├── page.tsx                                 ← NOVO  server: lê searchParams.oobCode
    └── components/VerifyEmailResult.tsx         ← NOVO  "use client"

apps/app/shared/components/ui/
└── EmailNotVerifiedNotice.tsx                   ← NOVO  "use client", espelha ImpersonationReadOnlyNotice

apps/app/shared/hooks/
└── useEmailVerification.ts                      ← NOVO  mutations de reenvio e de confirmação

apps/app/app/[locale]/(authenticated)/(common)/layout.tsx  ← EDITADO (1 linha, depois do <Navbar />)
apps/app/proxy.ts                                          ← EDITADO (PUBLIC_PATHS + isenção do bounce)
```

- **Server Component por padrão**: as três `page.tsx` são server (metadata + leitura de `searchParams`);
  só os componentes de formulário/resultado são `"use client"`.
- **Prefetch RSC / `HydrationBoundary`**: **N/A** — nenhuma dessas telas lê lista ou detalhe.
- **`loading.tsx`**: **N/A** — não há query de página; o estado de carregamento é `isPending` de mutation.
- **`paths.ts` / `routes.tsx` / `sidebar.tsx`**: **N/A** — as factories de rota nomeada só cobrem a área
  autenticada (`(common)/paths.ts`, `admin/paths.ts`); a área não autenticada usa string literal, como
  já fazem `SignInForm.tsx:192` e `SignUpFormClient.tsx:198`. Seguir o padrão vigente.

### 5.2 O `proxy.ts` da `apps/app` — duas mudanças, e a segunda é um bug real

**(a) allowlist.** `PUBLIC_PATHS` (`apps/app/proxy.ts:58`) é `["/sign-in", "/sign-up"]` e é a única
referência no repo (`:58`, `:61`, `:137`). O modelo é **default-deny** (`:143-148`), então sem esta
edição as três páginas novas redirecionam para o sign-in. Passa a
`["/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/verify-email"]`.

**(b) o bounce do autenticado destrói o `oobCode`.** Em `:150-164`, um visitante **com sessão** numa rota
pública é mandado para a home e a linha `:161` faz `redirectUrl.search = ""`. Um usuário logado que
clique no link do e-mail em `/pt-br/reset-password?oobCode=…` perde o código em silêncio — e o caso é
comum (pediu reset em outro dispositivo; ou está logado e quer só verificar o e-mail). Precisa de
isenção: os dois paths que carregam `oobCode` não sofrem o bounce.

```ts
/** These carry a single-use action code in the query string: bouncing an authenticated
 *  visitor here would discard the code and leave them with no way back. */
const OOB_ACTION_PATHS = ["/reset-password", "/verify-email"] as const;

function isOobActionPath(path: string): boolean {
    return OOB_ACTION_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}
```

e em `:150`: `if (isPublic && sessionUser && !isOobActionPath(appPath))`.

**CSP**: nada a mudar. `connectSrc` já contém `NEXT_PUBLIC_API_URL` e as páginas novas só falam com a
nossa API (`apps/app/proxy.ts:14-51`).

### 5.3 Dados

- **`queryKeys.ts`**: **nenhuma chave nova.** Tudo aqui é mutation; o estado de verificação vem do
  usuário do Firebase já em memória. `apps/app/shared/lib/queryKeys.ts` fica intacto.
- **Hooks de lista/por id (`useListX`/`useFindXById`)**: **N/A** — não há leitura.
- **`useAuthorizedQuery`** (`apps/app/shared/hooks/useAuthorizedQuery.ts:21-35`): **N/A** — é gate de
  *query*, e não há query.
- **Erro**: sempre `errorAlert(handleClientError(new FormattedError(error, locale)))`, exatamente como
  `useEntityCrud.tsx:33-34,58`. É o que traduz o `error.code` pelo `apiErrors`
  (`formattedError.ts:56-84`).
- **Zero `fetch`/axios cru, zero URL hardcoded**: tudo por `apiClient.authApi.*`
  (`apps/app/shared/lib/client.ts:3-7`).

**Como a UI lê `emailVerified`** (→ **D-3**): `useAuth().user` é o `User` do **Firebase client SDK**
(`packages/auth/types.ts:41` `export type UserDTO = User`), que já carrega `emailVerified` nativamente.
O banner é 100% client-side, **sem uma requisição de rede**. Não é preciso `authApi.me()`, nem uma action
`user.me()` (que não existe), nem tipar o `AuthMePayload` (`action.ts:4-7`).

**Depois de confirmar a verificação**, o `emailVerified` do token em cache continua `false`. A tela de
sucesso força o refresh com `getIdToken(true)` (`packages/auth/client.ts:172-180` já aceita
`forceRefresh`), o que faz `onIdTokenChanged` (`provider.tsx:175-192`) re-disparar e o banner desaparecer
sem reload manual.

### 5.4 Formulários

Schemas como **factory** `buildXFormSchema(dictionary)`, no molde literal de
`sign-in/validations/signInSchema.ts:8-15`, com `MIN_PASSWORD_LENGTH = 6` e mensagens saindo do
dicionário. `resetPasswordSchema` repete o `.refine` de confirmação de `signUpSchema.ts:21-24`.

| Tela | Campo | Componente | Origem da label |
|---|---|---|---|
| `/forgot-password` | `email` | `HookFormInput` `type="email"` | `forgotPassword.form.email` / `.emailPlaceholder` |
| `/reset-password` | `password` | `HookFormInputPassword` | `resetPassword.form.password` |
| `/reset-password` | `confirmPassword` | `HookFormInputPassword` | `resetPassword.form.confirmPassword` |

Estrutura visual: **copiar o card de `SignInForm.tsx:110-120`** (mesmo wrapper, mesmo
`w-full max-w-md space-y-8 rounded-xl border bg-card p-8 shadow-sm`) para as três telas ficarem
irmãs do login. Botão de submit com `disabled={isPending}` **e** `loading={isPending}` — como o
sign-in (`:152-159`) e **não** como o sign-up, que esqueceu o `loading` (`SignUpFormClient.tsx:157-165`).

`FormContainer` / `Footer` / `Container`: **N/A** — são o vocabulário das telas de painel; o grupo
`(unauthenticated)` não os usa em nenhum dos dois formulários existentes. Não introduzir aqui.

`Table`, `searchFields`, `ActionsMenu`, sentinela de select: **N/A**.

### 5.5 Estados de tela

| Tela | Estados |
|---|---|
| `/forgot-password` | formulário → submetendo (`loading`) → **confirmação genérica** (mesmo texto sempre) · erro `EMAIL_NOT_CONFIGURED` via `errorAlert` |
| `/reset-password` | `oobCode` ausente → painel "link inválido" + link para o login · formulário → submetendo → sucesso ("senha alterada, entre de novo") · erro traduzido por código |
| `/verify-email` | `oobCode` ausente → "link inválido" · confirmando (spinner) → sucesso → erro |
| banner | oculto se `emailVerified` · oculto se `loading` · oculto se impersonando · visível com botão "reenviar" → `isPending` → toast de sucesso |

O `FullScreenLoader` (`shared/components/ui/FullScreenLoader.tsx`) é o spinner de transição de auth já
usado pelos dois forms (`SignInForm.tsx:105-107`) — reaproveitar em `/verify-email`.

### 5.6 i18n e a11y

- **Zero string em JSX.** Label, placeholder, título, descrição, texto de botão, `aria-label`, toast e
  mensagem de Zod: tudo do dicionário.
- Variáveis com nome descritivo (`forgotPasswordCopy`, `resetPasswordCopy`, `emailVerificationCopy`) —
  nunca `t`/`d`.
- Cliente usa `getDictionary()` de `@repo/internationalization/client`; as `page.tsx` server usam
  `getDictionary()` de `.../server` (padrão de `sign-in/page.tsx:7`).
- O banner precisa ser **live region própria**: um `Alert` com `role="alert"` (o componente já traz
  `role="alert"`, `alert.tsx:30`), mesma justificativa escrita em
  `ImpersonationReadOnlyNotice.tsx:14-18`.
- Variante do `Alert`: `default` (`alert.tsx:10`). Não `destructive` — não verificar não é erro, é
  pendência.

---

## 6. Autorização e segurança

- **Espelhamento**: as 4 rotas têm sua própria checagem no servidor. As duas de `confirm` são públicas
  **por desenho** — o `oobCode` de uso único emitido pelo Firebase *é* a credencial, e é o mesmo modelo
  da página hospedada que estamos substituindo.
- **Nenhum id vindo do body é confiado.** O reenvio de verificação ignora qualquer identificador do
  corpo: o alvo é `actor.uid`/`actor.email` de `resolveApiActor` (o corpo só carrega `locale`). O reset
  atua sobre o e-mail que o próprio `oobCode` resolve dentro do Firebase.
- **PII em log**: seguir o formato já estabelecido — linha única, prefixo estável, `chave=valor`, **sem
  endereço, corpo ou assunto** (`packages/email/index.ts:39-49`, `apps/api/proxy.ts:41-49`). Nenhum log
  novo pode conter e-mail. `sendEmail` já cuida do seu lado.
- **Dado sensível em DTO/erro**: as respostas de sucesso são `{ requested: true }` / `{ confirmed: true }`
  — nada de `email`, `uid` ou `requestType` (que `accounts:resetPassword` devolve e nós descartamos).
- **Impersonação**: (a) o banner **não aparece** enquanto um admin personifica — mesma checagem de
  `ImpersonationReadOnlyNotice.tsx:21-26` (`useAuthRequestPanel().isImpersonating`), invertida em sinal;
  (b) se a rota fosse chamada mesmo assim, `resolveApiActor` a resolve para o **ator**, então um admin
  personificando nunca dispara e-mail para o usuário personificado.
- **Camadas envolvidas**: `apps/app/proxy.ts` (paths públicos + isenção do bounce) → nada em
  `requireSession`/`requireAdmin` → `resolveApiActor` numa das quatro rotas. **Nenhuma** camada passa a
  checar `emailVerified` (o bloqueio está fora do corte, spec `:69`).
- **Enumeração de conta**: ver D-2 e D-4, que resolvem juntos o único ponto de tensão do desenho.

---

## 7. i18n — árvore de chaves novas

### 7.1 `apiErrors` (`translations/packages/shared/utils.ts`) — 6 códigos × 3 idiomas

| Código | pt-br | en | es |
|---|---|---|---|
| `EMAIL_NOT_CONFIGURED` | "O envio de e-mails não está configurado. Fale com o suporte." | "Email delivery is not configured. Contact support." | "El envío de correos no está configurado. Contacta al soporte." |
| `EMAIL_SEND_FAILED` | "Não foi possível enviar o e-mail agora. Tente de novo em instantes." | "The email could not be sent right now. Try again shortly." | "No se pudo enviar el correo ahora. Inténtalo de nuevo en unos momentos." |
| `AUTH_OOB_CODE_INVALID` | "Este link não é válido. Peça um novo." | "This link is not valid. Request a new one." | "Este enlace no es válido. Solicita uno nuevo." |
| `AUTH_OOB_CODE_EXPIRED` | "Este link expirou. Peça um novo." | "This link has expired. Request a new one." | "Este enlace ha caducado. Solicita uno nuevo." |
| `AUTH_PASSWORD_RESET_FAILED` | "Não foi possível redefinir a senha. Peça um novo link." | "Could not reset the password. Request a new link." | "No se pudo restablecer la contraseña. Solicita un enlace nuevo." |
| `AUTH_EMAIL_VERIFICATION_FAILED` | "Não foi possível confirmar o e-mail. Peça um novo link." | "Could not confirm the email. Request a new link." | "No se pudo confirmar el correo. Solicita un enlace nuevo." |

### 7.2 E-mail — 2 slugs novos (`translations/packages/email/index.ts`)

Entram em `actionLink.actions`, ao lado de `confirmAccess` (`:20-28` pt-br, `:58-66` en, `:96-104` es).
5 chaves cada → **2 × 3 × 5 = 30 valores**. **Nenhum arquivo de template é tocado**: `ActionSlug` é
`keyof EmailCopy["actionLink"]["actions"]` (`action-link.tsx:11-12`), e o comentário ali já diz que um
fork adiciona ação adicionando slug.

```ts
resetPassword: {
    subject: "Redefinir sua senha em {brand}",
    preview: "Escolha uma senha nova para {brand}",
    title: "Pedido de nova senha",
    body: "Recebemos um pedido para redefinir a senha da sua conta. Use o botão abaixo para escolher uma senha nova. O link é pessoal e tem prazo de validade.",
    cta: "Escolher senha nova",
},
verifyEmail: {
    subject: "Confirme seu e-mail em {brand}",
    preview: "Confirme seu endereço de e-mail em {brand}",
    title: "Confirme seu e-mail",
    body: "Falta um passo: confirme que este endereço é seu para garantir o acesso à conta e o recebimento de avisos importantes. O link é pessoal e tem prazo de validade.",
    cta: "Confirmar meu e-mail",
},
```

(en/es equivalentes; `{brand}` é interpolado por `interpolate.ts:4-11` e `ignoreNote` — `:18-19` — já
existe e serve aos dois.)

**`{name}` deliberadamente ausente** dos dois títulos: no pedido de reset o repo não conhece o nome de
exibição de forma confiável e uma segunda chamada ao Admin SDK só para isso não se paga.
`ActionLinkData.name` é obrigatório (`action-link.tsx:15`), então passamos o e-mail — e como o título não
usa `{name}`, ele não aparece. `interpolate` deixa placeholder desconhecido intacto (`:8-10`), então nada
quebra de nenhum lado.

### 7.3 Copy da UI (`translations/apps/app/pages/`)

**Arquivo novo `forgotPassword/index.ts`**

```
meta: { title, description }
title, description
form: { email, emailPlaceholder, submit }
validation: { emailInvalid }
sent: { title, description }
backToSignIn
```

**Arquivo novo `resetPassword/index.ts`**

```
meta: { title, description }
title, description
form: { password, passwordPlaceholder, confirmPassword, submit }
validation: { passwordMin, passwordsDoNotMatch }
invalidLink: { title, description }
success: { title, description }
goToSignIn
```

**Arquivo novo `emailVerification/index.ts`** (cobre o banner **e** a página `/verify-email`)

```
notice: { title, description, resend }
messages: { resent, resendFailed }
meta: { title, description }
confirming
success: { title, description }
error: { title, description }
invalidLink: { title, description }
goToPanel
```

**Edição em `signIn/index.ts`**: 1 chave nova `forgotPassword` ("Esqueci minha senha" / "Forgot your
password?" / "¿Olvidaste tu contraseña?").

**Edição em `pages/index.ts`**: 3 imports + 3 linhas × 3 idiomas no `pagesTranslations` (`:1-33`).

> `signUp/index.ts` importa `signInTranslations` (`:1,28`) — nada a fazer lá; a chave nova é do sign-in.

**Paridade**: `parity.test.ts:15-22` varre `globalTranslations` recursivamente, sem lista fixa de ramos,
então os nós novos são cobertos sem uma linha de teste. Rodar `/i18n-sync`.

---

## 8. Validação visual (obrigatória — regra de ouro 11)

`pnpm --filter app dev` (3000) + `pnpm --filter api dev` (3002) + `pnpm --filter email dev` (3003).
`agent-browser` **em sequência** — chamada concorrente trava o daemon e o print sai da aba errada.

| # | Fluxo | O que provar |
|---|---|---|
| V1 | `/pt-br/sign-in` | O link "esqueci minha senha" existe, está no rodapé junto do "criar conta" e navega |
| V2 | `/pt-br/forgot-password` | Formulário, submetendo, e a **tela de confirmação idêntica** para e-mail existente e inexistente (print lado a lado — é a prova visual da anti-enumeração) |
| V3 | `/pt-br/reset-password` **sem** `oobCode` | Painel "link inválido", sem formulário e sem erro cru |
| V4 | `/pt-br/reset-password?oobCode=lixo` | Mensagem traduzida de `AUTH_OOB_CODE_INVALID`, não stack trace |
| V5 | ciclo completo real | Pedir reset → abrir o link recebido → definir senha → entrar com a senha nova |
| V6 | sessão em outro app | Logado na `apps/app`; após o reset, a navegação seguinte cai no sign-in (item 3 do corte) |
| V7 | cadastro novo | O banner de não verificado aparece no painel comum; "reenviar" mostra toast |
| V8 | `/pt-br/verify-email?oobCode=…` | Confirmação → sucesso → **o banner desaparece sem reload manual** |
| V9 | impersonação | Admin personificando um usuário não verificado: o banner **não** aparece |
| V10 | 3 idiomas | V2 e o banner em `pt-br`, `en`, `es` |
| V11 | tema + responsivo | As 3 telas e o banner em light, dark e mobile |
| V12 | preview 3003 | Os 2 slugs novos × 3 idiomas (6 telas) renderizando assunto, corpo e CTA |
| V13 | fork sem Resend | Com `RESEND_TOKEN=""`, `/forgot-password` mostra a mensagem de `EMAIL_NOT_CONFIGURED` (D-4) e **não** finge sucesso |

---

## 9. Critérios de aceite

Gerados na íntegra pelo `/test` no formato §9.1 do guia. Insumo obrigatório, além dos itens do corte:

- **Autorização**: anônimo (as 3 páginas abrem), logado (não é bounceado das páginas de `oobCode`),
  admin, admin personificando (banner oculto e rota agindo sobre o ator), token ausente no reenvio
  (`AUTH_INVALID_TOKEN`, 401).
- **Anti-enumeração**: e-mail cadastrado × não cadastrado × sintaticamente inválido → as duas primeiras
  respostas **byte a byte iguais** (status, corpo e tela); a terceira é `VALIDATION_FAILED`.
- **`oobCode`**: ausente · vazio · lixo · expirado · **já usado** (segundo POST com o mesmo código) ·
  string gigante (acima do `OOB_CODE_MAX`).
- **Senha**: 5 caracteres (reprova no client e na API) · 6 (aceita) · vazia · só espaços · divergente da
  confirmação · acima do máximo.
- **Sessões**: sessão aberta na `apps/app` **antes** do reset deixa de valer **depois**; e a sessão de
  outro app do monorepo também (é o mesmo cookie compartilhado).
- **Duplo clique / submit repetido** nos três formulários e no botão de reenviar; cancelar no meio.
- **Rate limit**: 21ª chamada em 60s → `AUTH_RATE_LIMITED` 429 com header `Retry-After`; e o
  comportamento **sem** `ARCJET_KEY` (ilimitado, documentado).
- **Fork sem e-mail configurado**: `EMAIL_NOT_CONFIGURED` 503 na tela, traduzido, em vez de sucesso falso.
- **Antes × depois**: quem esquecia a senha perdia a conta; agora recupera. Nenhuma tela existente muda
  de comportamento além do link novo no sign-in.
- **Tema e responsivo** nos 3 idiomas.

---

## 10. Blueprint técnico

### 10.1 Gerar o link e ficar com o `oobCode` — o coração do desenho

**Arquivo novo `apps/api/(shared)/lib/auth-action-links.ts`**

```ts
import { getAuthInstance } from "@repo/auth/server";
import type { Locale } from "@repo/internationalization/utils";
import { env } from "@/env";

type AuthActionKind = "reset-password" | "verify-email";

const APP_PATH_BY_KIND: Record<AuthActionKind, string> = {
    "reset-password": "reset-password",
    "verify-email": "verify-email",
};

/** Both prerequisites of a working link, checked before any account lookup. */
export function canSendAuthActionLink(): boolean {
    return isEmailEnabled() && Boolean(env.NEXT_PUBLIC_APP_URL);
}

/**
 * The Admin SDK hands back a URL pointing at Firebase's own hosted handler, which
 * neither translates nor carries the brand. Only the single-use code inside it is
 * kept, and the link is rebuilt against this project's own page — so a fork gets a
 * working flow without configuring an action URL in the Firebase console.
 *
 * Answers `null` for an address with no account: the caller must not be able to
 * tell that case apart from a delivered email.
 */
export async function buildAuthActionLink(
    kind: AuthActionKind,
    email: string,
    locale: Locale
): Promise<string | null> {
    const auth = getAuthInstance();

    let firebaseLink: string;
    try {
        firebaseLink =
            kind === "reset-password"
                ? await auth.generatePasswordResetLink(email)
                : await auth.generateEmailVerificationLink(email);
    } catch (error) {
        if ((error as { code?: string }).code === "auth/user-not-found") {
            return null;
        }
        throw error;
    }

    const oobCode = new URL(firebaseLink).searchParams.get("oobCode");
    if (!oobCode) {
        return null;
    }

    const base = env.NEXT_PUBLIC_APP_URL as string;
    const path = APP_PATH_BY_KIND[kind];
    return `${base}/${locale}/${path}?oobCode=${encodeURIComponent(oobCode)}`;
}
```

Chamadas do Admin SDK **sem `actionCodeSettings`** de propósito: passar um `continueUrl` obrigaria cada
fork a incluir o domínio na lista de domínios autorizados do Firebase, e nós não usamos o `continueUrl`
para nada — o destino já está no link que montamos.

### 10.2 Identity Toolkit — dois verbos novos

**Edição em `apps/api/(shared)/lib/firebase-identity-toolkit.ts`.** Hoje `parseToolkitResponse` (`:36-43`)
está amarrada ao shape de sessão. Extrair o miolo e reaproveitar:

```diff
+type ToolkitResetPassword = { email: string; requestType: string };
+type ToolkitApplyOob = { localId: string; email: string; emailVerified: boolean };
+
+async function parseToolkitJson<T>(res: Response, fallback: string): Promise<T> {
+    const data = (await res.json()) as T & ToolkitErrorBody;
+    if (!res.ok || data.error) {
+        throw new IdentityToolkitError(
+            data.error?.message ?? fallback,
+            data.error?.code
+        );
+    }
+    return data;
+}
+
 async function parseToolkitResponse(res: Response): Promise<ToolkitSuccess> {
-    const data = (await res.json()) as ToolkitSuccess & ToolkitErrorBody;
-    if (!res.ok || data.error) {
-        const msg = data.error?.message ?? "Authentication request failed";
-        throw new IdentityToolkitError(msg, data.error?.code);
-    }
-    return data;
+    return parseToolkitJson<ToolkitSuccess>(res, "Authentication request failed");
 }
+
+/** Consumes a password-reset action code and sets the new password. */
+export async function identityResetPassword(
+    oobCode: string,
+    newPassword: string
+): Promise<ToolkitResetPassword> {
+    const key = getWebApiKey();
+    const res = await fetch(`${BASE}/accounts:resetPassword?key=${key}`, {
+        method: "POST",
+        headers: { "Content-Type": "application/json" },
+        body: JSON.stringify({ oobCode, newPassword }),
+    });
+    return parseToolkitJson<ToolkitResetPassword>(res, "Password reset failed");
+}
+
+/** Applies an email-verification action code. */
+export async function identityApplyOobCode(
+    oobCode: string
+): Promise<ToolkitApplyOob> {
+    const key = getWebApiKey();
+    const res = await fetch(`${BASE}/accounts:update?key=${key}`, {
+        method: "POST",
+        headers: { "Content-Type": "application/json" },
+        body: JSON.stringify({ oobCode }),
+    });
+    return parseToolkitJson<ToolkitApplyOob>(res, "Email verification failed");
+}
```

### 10.3 Mapa de erro do toolkit

**Edição em `apps/api/(shared)/lib/toolkit-error-codes.ts`.** A função atual (`:5-20`) tem fallback fixo
`USERS_AUTH_SIGN_UP_FAILED`, errado para estes fluxos. Adicionar **sem alterar a existente** (o chamador
`users/route.ts:58` não pode mudar de comportamento):

```ts
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";

/** Maps an action-code failure to a stable code, with the caller's own fallback. */
export function mapOobActionMessageToCode(
    message: string,
    fallback: string
): string {
    const m = message.toUpperCase();
    if (m.includes("EXPIRED_OOB_CODE")) {
        return "AUTH_OOB_CODE_EXPIRED";
    }
    if (m.includes("INVALID_OOB_CODE")) {
        return "AUTH_OOB_CODE_INVALID";
    }
    if (m.includes("WEAK_PASSWORD")) {
        return "USERS_AUTH_WEAK_PASSWORD";
    }
    if (m.includes("TOO_MANY_ATTEMPTS") || m.includes("TOO_MANY_REQUESTS")) {
        return "USERS_AUTH_RATE_LIMITED";
    }
    return fallback;
}

export function statusForAuthErrorCode(code: string): number {
    return code === "USERS_AUTH_RATE_LIMITED"
        ? HTTP_STATUS.TOO_MANY_REQUESTS
        : HTTP_STATUS.BAD_REQUEST;
}
```

`USER_DISABLED` cai no fallback de propósito: "esta conta está desativada" é enumeração de estado de
conta, e o caso é raro. Registrado em Q4.

### 10.4 Schema Zod

**Arquivo novo `apps/api/(shared)/validation/auth.schema.ts`**

```ts
import { locales } from "@repo/internationalization/utils";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { z } from "zod";

const EMAIL_MAX = 320;
const MIN_PASSWORD_LENGTH = 6;
const PASSWORD_MAX = 1024;
const OOB_CODE_MAX = 2048;

const localeSchema = z.enum(locales);
const oobCodeSchema = z.string().trim().min(1).max(OOB_CODE_MAX);

export const passwordResetRequestSchema = z.object({
    email: z.string().trim().max(EMAIL_MAX).email(),
    locale: localeSchema.optional(),
});

export const passwordResetConfirmSchema = z.object({
    oobCode: oobCodeSchema,
    password: z.string().min(MIN_PASSWORD_LENGTH).max(PASSWORD_MAX),
});

export const emailVerificationSendSchema = z.object({
    locale: localeSchema.optional(),
});

export const emailVerificationConfirmSchema = z.object({
    oobCode: oobCodeSchema,
});

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type EmailVerificationSendInput = z.infer<typeof emailVerificationSendSchema>;
export type EmailVerificationConfirmInput = z.infer<typeof emailVerificationConfirmSchema>;

type ParseResult<T> = { ok: true; value: T } | { ok: false; response: Response };

function parseWith<T>(schema: z.ZodType<T>, body: unknown): ParseResult<T> {
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return {
            ok: false,
            response: Response.json(
                { error: { code: "VALIDATION_FAILED" } },
                { status: HTTP_STATUS.BAD_REQUEST }
            ),
        };
    }
    return { ok: true, value: parsed.data };
}

export const parsePasswordResetRequest = (body: unknown) =>
    parseWith(passwordResetRequestSchema, body);
export const parsePasswordResetConfirm = (body: unknown) =>
    parseWith(passwordResetConfirmSchema, body);
export const parseEmailVerificationSend = (body: unknown) =>
    parseWith(emailVerificationSendSchema, body);
export const parseEmailVerificationConfirm = (body: unknown) =>
    parseWith(emailVerificationConfirmSchema, body);
```

> `z.string().trim().max(EMAIL_MAX).email()` — `.email()` por último para não mascarar o limite de
> tamanho. `emailVerificationSendSchema` aceita `{}` (locale ausente é legítimo).

### 10.5 Handler 1 — `POST /auth/password/reset-request`

`apps/api/app/(routes)/auth/password/reset-request/route.ts`

```ts
export async function POST(req: Request) {
    // Checked before the account lookup, on purpose: the answer must depend on the
    // fork's configuration and never on whether the address has an account.
    if (!canSendAuthActionLink()) {
        return Response.json(
            { error: { code: "EMAIL_NOT_CONFIGURED" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }

    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }
    const parsed = parsePasswordResetRequest(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    const { email, locale: requested } = parsed.value;
    const locale = resolveLocale(requested);
    const url = await buildAuthActionLink("reset-password", email, locale);

    if (url) {
        // A transient delivery failure must not become a way to tell an existing
        // address from an unknown one, so it is logged and answered like a success.
        await sendEmail({
            template: actionLinkEmail,
            to: email,
            locale,
            data: { name: email, url, action: "resetPassword" },
        });
    }

    return Response.json({ data: { requested: true } });
}
```

**Payload**
```json
{ "email": "jane@example.com", "locale": "pt-br" }
```
**Resposta (idêntica para e-mail existente e inexistente)**
```json
{ "data": { "requested": true } }
```

### 10.6 Handler 2 — `POST /auth/password/reset`

`apps/api/app/(routes)/auth/password/reset/route.ts`

```ts
export async function POST(req: Request) {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }
    const parsed = parsePasswordResetConfirm(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    let email: string;
    try {
        ({ email } = await identityResetPassword(
            parsed.value.oobCode,
            parsed.value.password
        ));
    } catch (e) {
        if (e instanceof IdentityToolkitError) {
            const code = mapOobActionMessageToCode(
                e.message,
                "AUTH_PASSWORD_RESET_FAILED"
            );
            return Response.json(
                { error: { code } },
                { status: statusForAuthErrorCode(code) }
            );
        }
        throw e;
    }

    // Every open session must stop working: the shared session cookie is verified
    // with the revocation check on, so dropping the refresh tokens invalidates it
    // in every app at the next navigation.
    try {
        const user = await getAuthInstance().getUserByEmail(email);
        await revokeUserSessions(user.uid);
    } catch (error) {
        console.error("Could not revoke sessions after password reset", error);
    }

    return Response.json({ data: { confirmed: true } });
}
```

O mecanismo do item 3 do corte é verificável: `getUserFromSessionCookie` chama
`verifySessionCookie(sessionCookie, true)` (`packages/auth/server.ts:193-196`) — o `true` é o
`checkRevoked`. É o que o `apps/app/proxy.ts:141` usa em cada navegação e o que
`resolveApiActor` (`:28,36`) usa na API. `revokeUserSessions` (`server.ts:212-218`) já engole a própria
falha, então o `try/catch` aqui só protege o `getUserByEmail`.

**Resposta**: `200 { "data": { "confirmed": true } }`.

### 10.7 Handler 3 — `POST /auth/email-verification/send`

`apps/api/app/(routes)/auth/email-verification/send/route.ts`

```ts
export async function POST(req: NextRequest) {
    const actor = await resolveApiActor(req);
    if (!actor) {
        return Response.json(
            { error: { code: "AUTH_INVALID_TOKEN" } },
            { status: HTTP_STATUS.UNAUTHORIZED }
        );
    }
    if (!canSendAuthActionLink()) {
        return Response.json(
            { error: { code: "EMAIL_NOT_CONFIGURED" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }
    if (!actor.email || actor.emailVerified) {
        // Nothing to do and nothing to leak: an already verified account gets the
        // same answer as one that was just emailed.
        return Response.json({ data: { requested: true } });
    }

    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }
    const parsed = parseEmailVerificationSend(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    const locale = resolveLocale(parsed.value.locale);
    const url = await buildAuthActionLink("verify-email", actor.email, locale);
    if (!url) {
        return Response.json(
            { error: { code: "AUTH_EMAIL_VERIFICATION_FAILED" } },
            { status: HTTP_STATUS.BAD_REQUEST }
        );
    }

    const result = await sendEmail({
        template: actionLinkEmail,
        to: actor.email,
        locale,
        data: { name: actor.displayName ?? actor.email, url, action: "verifyEmail" },
    });

    // Here the caller is authenticated and asking about their own account, so a
    // delivery failure can be reported without telling anyone anything new.
    if (!result.sent) {
        return Response.json(
            { error: { code: "EMAIL_SEND_FAILED" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }

    return Response.json({ data: { requested: true } });
}
```

### 10.8 Handler 4 — `POST /auth/email-verification/confirm`

`apps/api/app/(routes)/auth/email-verification/confirm/route.ts` — mesma forma do handler 2, chamando
`identityApplyOobCode(oobCode)`, fallback `AUTH_EMAIL_VERIFICATION_FAILED`, **sem** revogar sessão
(confirmar o e-mail não invalida credencial nenhuma) e respondendo
`200 { "data": { "confirmed": true } }`.

### 10.9 `apps/api/proxy.ts` — pseudo-diff

```diff
 const RATE_LIMITED_PATHS = [
     "/auth/sign-in",
     "/auth/sign-up",
     "/auth/sign-in/google",
+    "/auth/password/reset-request",
+    "/auth/password/reset",
+    "/auth/email-verification/send",
+    "/auth/email-verification/confirm",
 ];
```

Atualizar também o docblock `:25-30`, que hoje descreve só os 3 endpoints de sessão.

### 10.10 `apps/app/proxy.ts` — pseudo-diff

```diff
-export const PUBLIC_PATHS = ["/sign-in", "/sign-up"] as const;
+export const PUBLIC_PATHS = [
+    "/sign-in",
+    "/sign-up",
+    "/forgot-password",
+    "/reset-password",
+    "/verify-email",
+] as const;
@@
-    if (isPublic && sessionUser) {
+    if (isPublic && sessionUser && !isOobActionPath(appPath)) {
```

### 10.11 SDK — pseudo-diff

```diff
+    async requestPasswordReset(
+        body: PasswordResetRequestBody
+    ): Promise<AuthActionRequested> {
+        const { data } = await this.client.request<Response<AuthActionRequested>>({
+            url: "/auth/password/reset-request",
+            method: "POST",
+            data: body,
+        });
+        return data.data;
+    }
```
(+ `confirmPasswordReset` → `/auth/password/reset`, `sendEmailVerification` →
`/auth/email-verification/send` com `data: body ?? {}`, `confirmEmailVerification` →
`/auth/email-verification/confirm`.)

### 10.12 `SignInForm.tsx` — pseudo-diff do rodapé (`:186-196`)

```diff
+                <div className="text-center text-sm">
+                    <Link
+                        className="text-primary hover:underline"
+                        href={`/${locale}/forgot-password`}
+                    >
+                        {dictionary.apps.app.pages.signIn.forgotPassword}
+                    </Link>
+                </div>
                 <div className="text-center text-sm">
                     <span className="text-muted-foreground">
                         {dictionary.apps.app.pages.signIn.noAccount}
```

### 10.13 `SignUpFormClient.tsx` — o gatilho da verificação

O padrão já existe no sign-in: `signIn.mutate(data, { onSuccess: handleSuccessSignIn })`
(`SignInForm.tsx:124-129`). React Query executa o `onSuccess` da mutation **e** o da chamada.

```diff
+    /**
+     * Fire-and-forget: the account already exists at this point, and the panel
+     * carries a notice with its own resend button, so a failed send must never
+     * block the navigation that just succeeded.
+     */
+    const requestVerificationEmail = async (credential: UserCredential) => {
+        try {
+            const accessToken = await credential.user.getIdToken();
+            apiClient.setAuthorizationHeader(accessToken);
+            await apiClient.authApi.sendEmailVerification({ locale });
+        } catch {
+            // deliberately silent
+        }
+    };
@@
-        signUp.mutate({ email: data.email, password: data.password });
+        signUp.mutate(
+            { email: data.email, password: data.password },
+            { onSuccess: requestVerificationEmail }
+        );
```

O `setAuthorizationHeader` antes da chamada copia `handleSuccessSignIn`
(`SignInForm.tsx:64-70`) e evita a corrida com o `AuthRequestPanelContext.tsx:82`, que só seta o header
quando o `accessToken` propaga pelo contexto.

**O caminho Google não é tocado** (`googleSignInApi.ts`) → decisão de produto 2 cumprida por construção.

### 10.14 `EmailNotVerifiedNotice.tsx` — forma

Espelha `ImpersonationReadOnlyNotice.tsx` linha a linha (mesmo `Alert`/`AlertTitle`/`AlertDescription`,
mesmo `getDictionary()` client, mesmo `return null` precoce):

```tsx
export function EmailNotVerifiedNotice() {
    const { dictionary, locale } = getDictionary();
    const { user, loading } = useAuth();
    const { isImpersonating } = useAuthRequestPanel();
    const { resend } = useEmailVerification();

    // An admin acting as someone else must not be able to email that person, and
    // their own verification state is not what this screen is about.
    if (loading || isImpersonating || !user || user.emailVerified) {
        return null;
    }
    …
}
```

Montagem: **uma linha** em `(common)/layout.tsx`, depois do `<Navbar />` (`:39`). O
`(authenticated)/layout.tsx` não serve (`:15` devolve `children` cru, fora do `SidebarProvider`).

### 10.15 Ordem de implementação e de commit

Um commit por app/pacote, ordenado por dependência, testes junto da funcionalidade que cobrem.

| # | Commit | Conteúdo |
|---|---|---|
| 1 | `feat(shared): add the service-unavailable status to the HTTP map` | `httpStatus.ts` (1 linha) |
| 2 | `feat(sdk): password reset and email verification actions` | `actions/auth/action.ts` |
| 3 | `feat(api): generate branded action links from the identity toolkit` | `auth-action-links.ts`, `firebase-identity-toolkit.ts`, `toolkit-error-codes.ts` + `authActionLinks.test.ts` |
| 4 | `feat(api): password reset endpoints` | `auth.schema.ts`, as 2 rotas de `password/` + `authPasswordReset.test.ts` |
| 5 | `feat(api): email verification endpoints` | as 2 rotas de `email-verification/` + `authEmailVerification.test.ts` |
| 6 | `fix(api): rate limit the account recovery endpoints` | `apps/api/proxy.ts` + extensão de `corsOrigin.test.ts` |
| 7 | `fix(app): keep the action code when an authenticated visitor opens a recovery link` | `apps/app/proxy.ts` + extensão de `proxy.test.ts` |
| 8 | `feat(app): forgot and reset password screens` | `forgot-password/`, `reset-password/`, link no `SignInForm` + testes de schema |
| 9 | `feat(app): email verification notice and confirmation screen` | `verify-email/`, `EmailNotVerifiedNotice`, `useEmailVerification`, `(common)/layout.tsx`, `SignUpFormClient` |
| 10 | `feat(internationalization): copy for account recovery and email verification` | 3 nós novos + `signIn.forgotPassword` + 2 slugs de e-mail + 6 `apiErrors` + `templates.test.tsx` estendido |
| 11 | `docs(features): auth-recovery-verification` | `docs/features/auth-recovery-verification/` |

> Os commits 8/9 dependem do 10 para **tipar** (o dicionário é a fonte dos tipos de copy). Implementar
> o i18n **primeiro** e commitar por último é a ordem que o repo já pratica; `git add` por caminho.

### 10.16 Testes a criar

| Arquivo | Cobre |
|---|---|
| `apps/api/__tests__/authActionLinks.test.ts` | extração do `oobCode` da URL do Firebase; `null` em `auth/user-not-found`; `null` sem `oobCode`; a URL montada tem locale e path certos; `canSendAuthActionLink` falso sem `RESEND_*` **e** sem `NEXT_PUBLIC_APP_URL` |
| `apps/api/__tests__/authPasswordReset.test.ts` | 503 `EMAIL_NOT_CONFIGURED` **antes** de qualquer lookup; **resposta byte a byte idêntica** para e-mail conhecido × desconhecido; `sendEmail` chamado com `action: "resetPassword"` e o locale pedido; confirm com código inválido/expirado/senha fraca/rate-limit → código e status certos; `revokeUserSessions` chamado com o uid resolvido; `revokeUserSessions` falhando **não** derruba o 200 |
| `apps/api/__tests__/authEmailVerification.test.ts` | 401 sem ator; 200 sem envio quando já verificado; `EMAIL_SEND_FAILED` 503 em `provider-error`; confirm com código inválido |
| `apps/api/__tests__/corsOrigin.test.ts` (extensão de `:266-268`) | as 4 rotas novas estão de fato limitadas, e vizinhas próximas (`/auth/password`, `/auth/password/reset/`) **não** estão |
| `apps/app/__tests__/proxy.test.ts` (extensão de `:118-124`) | as 3 páginas novas abrem para anônimo; e o teste novo: visitante **com sessão** em `/pt-br/reset-password?oobCode=x` **não** é bounceado e **mantém** a query |
| `apps/app/__tests__/forgotPasswordSchema.test.ts` | e-mail inválido/vazio/só espaços/gigante, mensagens vindas do dicionário real |
| `apps/app/__tests__/resetPasswordSchema.test.ts` | mínimo de 6, divergência de confirmação com `path: ["confirmPassword"]` |
| `packages/email/__tests__/templates.test.tsx` (extensão) | os 2 slugs novos renderizam assunto/título/corpo/CTA nos 3 idiomas e trazem a URL |
| `packages/internationalization/__tests__/parity.test.ts` | **nenhuma alteração** — varre recursivamente (`:15-22`) |

Padrão dos testes de rota: `vi.mock` do módulo de toolkit, do `@repo/email`, do `@repo/auth/server` e do
`resolveApiActor`, seguido de `await import(...)` da rota — como `apps/api/__tests__/googleSignInProfile.test.ts:82,95`.

### 10.17 Env e config

Nenhuma variável nova. Editar os comentários de `apps/api/.env.example`:

- `:10-12` — `FIREBASE_WEB_API_KEY`: acrescentar que também atende reset e verificação.
- `:33` — `NEXT_PUBLIC_APP_URL`: passa de decorativa na API a **base do link dos e-mails de ação**;
  sem ela o pedido de reset responde `EMAIL_NOT_CONFIGURED`.
- `:19-20` — `RESEND_FROM`/`RESEND_TOKEN`: sem elas **não há recuperação de senha**.
- `:25-27` — `ARCJET_KEY`: acrescentar que sem ela o pedido de reset e o reenvio ficam **ilimitados**.

**Não** adicionar nada ao `turbo.json`: `lint`/`typecheck`/`test` têm `env: []` de propósito.

---

## 11. Decisões (com o porquê)

| # | Decisão | Por quê |
|---|---|---|
| **D-1** | O gatilho da verificação é uma **chamada do cliente após o cadastro**, não a rota `POST /auth/sign-up` | Provado por grep: o sign-up do app vai direto ao Firebase (`packages/auth/client.ts:127`); a rota da API **não tem chamador**. Pôr o gatilho lá não dispararia nada pela UI. E, de bônus, o caminho Google não chama → decisão de produto 2 sai por construção. A rota morta **não** ganha o gatilho: é código sem cobertura e com dialeto de erro divergente; corrigi-la é tarefa própria (→ Q5) |
| **D-2** | **Anti-enumeração**: `reset-request` responde `200 { requested: true }` exista ou não a conta | Decisão de produto 1. `buildAuthActionLink` devolve `null` em `auth/user-not-found` e o handler segue para o mesmo retorno. Também vale para `provider-error`/`invalid-recipient`: logados e respondidos como sucesso, para que uma falha transitória não vire oráculo |
| **D-3** | O banner lê `useAuth().user.emailVerified` (Firebase client `User`), **sem requisição** | `packages/auth/types.ts:41` já é o `User` do Firebase. Evita inventar `user.me()` no SDK e evita tipar o `AuthMePayload` destipado (`action.ts:4-7`). Consome de fato o campo que a spec aponta como órfão (`:30`) |
| **D-4** | `not-configured` **propaga**, sem tocar em `packages/email`; e a tensão com D-2 é resolvida **checando a configuração antes do lookup** | Decisão de produto 4. `packages/email/index.ts:99-102` nunca lança de propósito — quem chama decide. Para "redefinir senha", engolir é perder a conta. A tensão se dissolve porque `canSendAuthActionLink()` é a **primeira** instrução do handler: a resposta `EMAIL_NOT_CONFIGURED` é função *só* da configuração do fork, nunca do input, então não pode revelar existência de conta. "Não configurado" é falha de infraestrutura e pode ser dita; "e-mail não existe" não pode, e não é |
| **D-5** | **Nada é adicionado a `packages/auth/client.ts`** | O Firebase client SDK tem `sendPasswordResetEmail`/`sendEmailVerification`, mas eles enviam pela **página hospedada** do Firebase, que não traduz nem respeita a marca — exatamente o que a spec `:62,92` recusa. Todo o fluxo passa pela API, onde o Resend e o dicionário vivem |
| **D-6** | A rota de reenvio usa `resolveApiActor`, não `requireCommonPanelApi` | Precedente `auth/me/route.ts:5-6`. O guard de painel exigiria perfil `COMMON` (`common-panel.ts:74-79`), recusaria POST em impersonação (`impersonation-read-only.ts:19-30`) e o seu `subjectProfile` é justamente quem *não* deve receber o e-mail. `resolveApiActor` devolve o ator real: o reenvio sempre age na conta de quem está logado |
| **D-7** | O link é montado por nós a partir do `oobCode` extraído, **sem `actionCodeSettings`** | Um `continueUrl` obrigaria cada fork a autorizar o domínio no console do Firebase, e nós não o usamos — o destino já está no link que montamos. Assim a feature funciona num fork recém-clonado sem passo manual no console |
| **D-8** | `HTTP_STATUS` ganha `SERVICE_UNAVAILABLE: 503` | `not-configured` não é erro do cliente (400 culparia o usuário) nem bug (500 mentiria): é dependência ausente. Uma linha, genérica, em `packages/shared/utils/helpers/httpStatus.ts` |
| **D-9** | `/verify-email` **confirma automaticamente ao montar**, com guarda de `useRef` | É o que a página hospedada do Firebase faz, e uma tela de "clique para confirmar depois de clicar no e-mail" é pior produto. Trade-off aceito: um scanner de e-mail que renderize JS poderia consumir o código de uso único — mitigado pelo botão de reenvio sempre disponível no banner |
| **D-10** | O banner vive **só no painel comum** | É onde mora quem se cadastrou sozinho. Contas admin são provisionadas por outro admin (`POST /users` → `identitySignUp`, `users/route.ts:54`) e nasceriam todas não verificadas, transformando o banner em ruído permanente do painel admin. Levar para o admin é iteração (→ Q3) |
| **D-11** | Resposta `200 { data: … }` nas 4 rotas, não `204` | `HTTP_STATUS` não tem 204 e o SDK devolve `data.data` — um 204 sem corpo faria o desempacotamento estourar. Corpo mínimo e uniforme, sem informação explorável |
| **D-12** | As 3 rotas de auth pré-existentes **não são corrigidas aqui** | `sign-in/route.ts:5,7` não valida body nem captura erro (senha errada é 500), e os erros saem em 3 dialetos (`{error:"str"}`, `{message:"str"}`, `{error:{code}}`). É dívida real e independente; misturá-la aqui infla o diff e o raio de teste. Registrada em Q5 e para o `/spec --sync` |

### 11.1 Herança de risco (spec `:48-50`)

Esta é a **primeira feature a chamar `actionLinkEmail` por um caminho alcançável pela UI**. Grep
confirma: `welcomeEmail` e `actionLinkEmail` têm zero chamador de produção, e a `apps/api` declara
`@repo/email` no `package.json:22` e no `env.ts:2` **sem nunca enviar nada**. Orçar descoberta de defeito
de integração: primeiro envio real da API, primeiro `sendEmail` num handler de rota, primeiro consumo do
`SendResult` por quem chama. O item V13 do roteiro visual existe para isso.

Riscos concretos a vigiar no `/develop`:

- `packages/email/package.json` **não tem `main`/`exports`** (achado registrado no
  `transactional-emails`): `@repo/email` resolve só pelo alias TS. Importar de dentro da `apps/api` pode
  exigir ajuste que não apareceu ainda porque ninguém importou de lá.
- `packages/email/index.ts` é server-side (`resend`); as rotas da API são server — ok. Mas o `apps/api`
  tem `skipValidation` em `development` (`apps/api/env.ts:30`), então **em dev o `env.NEXT_PUBLIC_APP_URL`
  pode vir `undefined` mesmo com `.env` preenchido**. `canSendAuthActionLink()` cobre isso devolvendo
  falso — o que significa que em dev, sem `.env` correto, a tela mostra `EMAIL_NOT_CONFIGURED`. Não é
  bug; é o sinal funcionando. Anotar no handoff para não perseguir fantasma.

---

## 12. Pós-entrega

- **Env em produção (Vercel)**: `RESEND_FROM` + `RESEND_TOKEN` (com **domínio verificado, SPF + DKIM** —
  passo de DNS, sem contorno), `FIREBASE_WEB_API_KEY`, `NEXT_PUBLIC_APP_URL` apontando para o host real
  da `apps/app`, e `ARCJET_KEY` (sem ela o reset é ilimitado por IP).
- **Firestore**: nenhum índice a criar, nenhuma regra a publicar.
- **Webhook**: nenhum.
- **Rollback**: reverter os commits basta. Não há dado gravado, nenhum documento fica órfão. O único
  efeito colateral irreversível é e-mail já enviado e sessão já revogada — nenhum dos dois impede o
  usuário de entrar de novo.
- **O que um fork ajusta**: traduzir os 2 slugs novos em `translations/packages/email/index.ts`
  (os valores entregues são exemplos neutros), editar `packages/email/brand.ts`, e decidir se quer
  **bloquear** o não verificado — que este corte deliberadamente deixa desligado.
- **Doc a atualizar** (sugestão, não bloqueante): uma seção em [`docs/AUTH-SSO.md`](../../../AUTH-SSO.md)
  descrevendo o ciclo do `oobCode` e por que a página hospedada do Firebase não é usada.

---

## 13. Perguntas em aberto

Nenhuma bloqueia a implementação. Todas seguem com a recomendação adotada; o `/develop` parte com elas.

| # | Pergunta | Recomendação **adotada** |
|---|---|---|
| **Q1** | Validade do link de ação — deixar o default do Firebase (1h para reset) ou encurtar? | **Deixar o default.** Não há API do Admin SDK para definir isso por link; é configuração de projeto no console. Encurtar é decisão do fork |
| **Q2** | Depois de redefinir a senha, logar o usuário automaticamente? | **Não.** Redefinir revoga todas as sessões (item 3 do corte); logar de volta na mesma requisição contradiz o gesto. A tela de sucesso manda para o login |
| **Q3** | Banner de não verificado também no painel **admin** e na `apps/web` (modo `simple`)? | **Não neste corte** (D-10). No modo `simple` o usuário comum opera na `apps/web` e não veria o aviso — lacuna conhecida, registrada, iteração seguinte |
| **Q4** | `USER_DISABLED` merece código próprio? | **Não.** Cai no fallback `AUTH_PASSWORD_RESET_FAILED`. "Esta conta está desativada" é enumeração de estado de conta, e o caso é raro |
| **Q5** | Corrigir as 3 rotas de auth pré-existentes (sem Zod, sem try/catch no `sign-in`, 3 dialetos de erro) e/ou remover as mortas? | **Fora desta tarefa** (D-12). Vale uma spec própria; anotar no `/spec --sync` |
| **Q6** | Caminho de reset para conta **só-Google** (sem provedor de senha)? O Firebase gera o link e o reset **cria** a credencial de senha | **Manter como está** — é o comportamento do Firebase e é útil (o usuário passa a ter os dois meios). Não vale código extra para bloquear |
| **Q7** | Página de "link expirado" com botão "pedir um novo" inline, em vez de mandar ao `/forgot-password`? | **Mandar ao `/forgot-password`.** Menos superfície, e o `oobCode` expirado não carrega o e-mail para pré-preencher |
| **Q8** | Reenvio de verificação com cooldown visível no botão (ex.: 60s), além do rate limit do Arcjet? | **Não neste corte.** O rate limit global cobre o abuso; cooldown de UI é polimento e cai bem em `account-settings` |
