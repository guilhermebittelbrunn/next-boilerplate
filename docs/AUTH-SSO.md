# Autenticação unificada cross-front-end (SSO web ↔ app)

Como uma única sessão autenticada é compartilhada entre `apps/web` (landing/CTA) e
`apps/app` (painel). Base de auth em `@repo/auth` (Firebase Auth + Admin SDK). Segurança
geral em [`docs/SECURITY.md`](SECURITY.md).

## Modelo

Quem loga/cadastra num front-end segue autenticado no outro. O mecanismo é um **session
cookie do Firebase** compartilhado (não o ID token cru), porque a persistência do client
SDK do Firebase é **por origem** (IndexedDB) e não cruza `web` ↔ `app`.

Dois tipos de credencial, desambiguados pelo transporte:

| Credencial | Transporte | Onde | Verificação |
|---|---|---|---|
| **ID token** (curto, ~1h) | `Authorization: Bearer` | client → API | `verifyIdToken` |
| **Session cookie** (dias, revogável) | cookie `access-token` | proxy/SSR + SSO | `verifySessionCookie` |

Peças (todas genéricas em `@repo/auth`):
- `createSessionCookie` / `getUserFromSessionCookie` / `revokeUserSessions` ([packages/auth/server.ts](../packages/auth/server.ts)).
- Helper de cookie + CSRF same-origin ([packages/auth/session.ts](../packages/auth/session.ts)) e os handlers de rota ([packages/auth/session-routes.ts](../packages/auth/session-routes.ts)), re-expostos por cada app em `app/api/auth/{session,custom-token}/route.ts`.
- **Bootstrap por custom token** no provider ([packages/auth/provider.tsx](../packages/auth/provider.tsx)): ao abrir o 2º app com cookie válido mas sem sessão de client, ele busca `POST /api/auth/custom-token` → `signInWithCustomToken` → o client passa a emitir ID tokens. Sem redirect.
- API aceita as duas credenciais via `resolveApiActor` ([apps/api/(shared)/lib/resolve-api-actor.ts](<../apps/api/(shared)/lib/resolve-api-actor.ts>)).

## Cookie: dev vs prod

Regra única, controlada por env:
- **Dev:** deixe `SESSION_COOKIE_DOMAIN` **vazio**. O cookie fica host-only em `localhost` e o browser **ignora a porta**, então `localhost:3000` e `localhost:3001` já compartilham.
- **Prod:** `SESSION_COOKIE_DOMAIN=<domínio registrável>` (ex.: `example.com`) → `example.com` + `app.example.com` compartilham. Atributos: `HttpOnly; Secure; SameSite=Lax; Path=/`. Vida útil via `SESSION_COOKIE_MAX_AGE_DAYS` (default 5; 5min–14 dias).

⚠️ **Vercel preview:** `*.vercel.app` está na Public Suffix List — browsers recusam um cookie com `Domain=vercel.app`. Sessão **compartilhada** entre previews só com **domínio custom** (`*.preview.example.com`). Cada preview funciona standalone; produção usa subdomínios custom (onde funciona).

## Logout

`DELETE /api/auth/session` revoga os refresh tokens (`revokeUserSessions`) e limpa o cookie
compartilhado (com o mesmo `Domain`), então o outro front-end perde o SSR na hora e o client
dele falha no próximo refresh de token. O `signOut` do provider só dispara o DELETE — nunca
limpamos o cookie passivamente, ou o 2º app deslogaria o usuário ao abrir.

## Modo de produto

`NEXT_PUBLIC_PRODUCT_MODE` (`subscription` | `simple`, default `subscription`) +
`getProductMode()`/`isSubscriptionMode()`/`commonUserUsesPanel()` ([packages/next-config/product-mode.ts](../packages/next-config/product-mode.ts)). Lido server+client; define todo o roteamento/navegação:

| | `subscription` | `simple` |
|---|---|---|
| Usuário comum opera em | painel (`apps/app`) | web (`apps/web`) |
| Painel (`apps/app`) | comum + admin | **só admin** (comum redirecionado p/ web) |
| Navbar da web (logado) | link "Ir para o painel" | dropdown de **Áreas** (`/dashboard`, scaffold) |
| Assinatura | "Minha assinatura" no painel (Stripe) | — (monetização simples) |

Enforcement server-side: o layout `(common)` do app redireciona comum→web no `simple` ([(common)/layout.tsx](<../apps/app/app/[locale]/(authenticated)/(common)/layout.tsx>)); o grupo `(authenticated)` da web redireciona →app no `subscription` ([(authenticated)/layout.tsx](<../apps/web/app/[locale]/(authenticated)/layout.tsx>), com `requireSession` espelhando `apps/app`). Em `simple`, exige `NEXT_PUBLIC_WEB_URL`/`NEXT_PUBLIC_APP_URL` para os redirects cross-app. Assinatura: ver [docs/PAYMENTS.md](PAYMENTS.md).

## Fallback: domínios registráveis distintos

Se um fork colocar os apps em **domínios diferentes** (ex.: `marketing.com` + `myapp.io`), o
cookie compartilhado é impossível. Use **token hand-off**: app A faz `verifySessionCookie` →
`createCustomToken` → redireciona para app B com um código de uso único → app B faz
`signInWithCustomToken` e cria o próprio cookie. (`createCustomToken` já existe.)

## Como validar o fluxo completo (precisa de Firebase)

A SSO real precisa de Firebase configurado (`.env.local` por app com `NEXT_PUBLIC_FIREBASE_*`
e `FIREBASE_ADMIN_*`). Com os apps no ar (`pnpm dev`):
1. Logar na **web** (`:3001`) → conferir o cookie `access-token` **sem `Domain`** (host-only).
2. Abrir o **app** (`:3000`) → proxy autentica via cookie; o provider faz o bootstrap por custom token; chamadas client→API funcionam.
3. Logar no app e voltar à web → também autenticado. **Logout num** → ambos deslogam.

Sem Firebase, as rotas respondem corretamente mesmo assim: `custom-token` → 401 `AUTH_NO_SESSION`,
`session` POST sem corpo → 400 / cross-origin → 403, app protegido sem sessão → redirect a `sign-in`.
