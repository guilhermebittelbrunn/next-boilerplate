# Arquitetura

Visão de sistema do boilerplate. Este documento explica **como as peças se conectam**; as convenções de implementação ficam em [`AGENTS.md`](../AGENTS.md) e nos `CLAUDE.md` aninhados por escopo (`apps/*/CLAUDE.md`, `packages/CLAUDE.md`), com o mapa rápido em [`CLAUDE.md`](../CLAUDE.md).

## Propósito

Monorepo **boilerplate full-stack** (fork customizado do [next-forge](https://github.com/vercel/next-forge)) para gerar **vários forks de MVPs**. Princípio mestre: **genérico no pacote, específico no app** — `packages/*` carrega infraestrutura reutilizável; o domínio de cada produto vive em `apps/*`. Toda a stack é escolhida para **começar de graça e escalar** (Vercel, Firebase, free tiers).

## Topologia

```
┌─────────────┐   ┌─────────────┐        Monorepo (Turborepo + pnpm)
│  apps/web   │   │  apps/app   │
│  (CTA/SEO)  │   │ (dashboard, │
│   :3001     │   │   admin)    │
└──────┬──────┘   │   :3000     │
       │          └──────┬──────┘
       │  @repo/sdk      │  @repo/sdk         apps/email :3003
       │  (axios facade) │                    (preview React Email)
       └────────┬────────┘
                ▼
         ┌─────────────┐   guards → repositórios → mappers
         │  apps/api   │ ─────────────────────────────────►  Firestore
         │   :3002     │   (@repo/auth verifica o token Firebase)
         └─────────────┘ ──► Stripe (webhooks) · Resend (e-mail)
```

- **`apps/web`** — landing/CTA pública: marketing, SEO, pricing, FAQ, contato. Foco em performance e acessibilidade.
- **`apps/app`** — aplicação do usuário autenticado: dashboard, cadastro, assinaturas e **área admin** (gestão de usuários + impersonação).
- **`apps/api`** — API HTTP em Next no servidor. Orquestra HTTP, valida na borda, aplica guards e fala com o Firestore. É o único ponto que toca persistência.
- **`apps/email`** — ambiente de dev/preview dos templates (`@repo/email`).

## Fluxo de dados (front → API → Firestore)

1. O front **nunca** chama a API direto. Usa o `apiClient` (`apps/app/shared/lib/client.ts`), instância de `Client` do `@repo/sdk`.
2. O `Client` (axios) tem uma **action por recurso** (`apiClient.entity.list()`, `.create(body)`, …) e injeta headers de contexto de auth (`BaseClient.setAuthRequestContext`): `userId`, `requestUserId`, `userRole`, `x-role`.
3. Na `apps/api`, o handler é embrulhado por um **guard** (`requireCommonPanelApi` / `requireAdminApi`) que:
   - valida o `Authorization: Bearer <token>` via `@repo/auth/server` (`getCurrentUser` → Firebase Admin `verifyIdToken`),
   - resolve o perfil Firestore do ator e o **subject** (titular ou usuário personificado),
   - injeta `ctx.subjectProfile`, `ctx.authRequest` no handler.
4. O handler **valida o input** (Zod, `parseCreateX`/`parseUpdateX`), monta o patch (`omitUndefined`), resolve `[id]` (`resolveIdFromContext`) e chama o **repositório**.
5. O **repositório** estende `BaseRepository<DTO>` (Firestore) e usa um **mapper** para normalizar (`Timestamp`→ISO, opcionais) entre o documento persistido e o `DTO` exposto pelo `@repo/sdk`. Soft delete via `deletedAt`.
6. A resposta volta como `{ data }` ou, em erro, `{ error: { code } }` com status HTTP correto.

> Não há camada "domain" separada: a `Entity` é o documento Firestore + `id`; o `DTO` é o tipo do `@repo/sdk`. Repositórios simples (ex.: `user`) dispensam mapper.

## Autenticação e impersonação (admin)

- **Provider**: Firebase. No servidor, `@repo/auth/server` inicializa o Admin SDK (`FIREBASE_ADMIN_*`) e expõe uma API estilo Clerk (`auth()`, `currentUser()`, `getCurrentUser(token)`). O token vem do cookie `access-token`.
- **Admin impersona usuário comum**: o SDK carrega `requestUserId`/`x-role` e o guard `requireCommonPanelApi` resolve o `subjectProfile` como o usuário personificado. Ao trocar o usuário em `PanelNavbarControls`, o app faz `window.location.reload()` para que todos os pedidos em curso passem a usar o novo contexto.
- **Regra**: autorização é **sempre** repetida no servidor (guards). UI oculta nunca é a única proteção.

## Internacionalização

- Pacote próprio `@repo/internationalization`, **sem serviço de terceiros**. Idiomas: `pt-br`, `en`, `es`.
- Dicionário composto por arquivos-folha (cada um com as 3 chaves de idioma) que sobem por `index.ts` até `translations/global.ts`.
- Locale resolvido pelo cookie `x-locale`; `getDictionary()` (client/server) já aplica fallback/default.
- Erros de API: a API responde `error.code` estável; o app traduz via `apiErrors` (`translations/packages/shared/utils.ts`) + `FormattedError`/`handleClientError`.

## UI, tema e responsividade

- **`@repo/design-system`**: componentes shadcn + tokens CSS + `next-themes` (light/dark/system). Componentes `HookForm*` ligam os primitivos ao React Hook Form.
- **Tema configurável por CSS**: as cores da identidade ficam em tokens; mudar o tema do fork é editar variáveis CSS, que propagam para todos os componentes.
- **Responsivo mobile-first**, breakpoints consistentes com o design system.

## Pagamentos

- **`@repo/payments`** encapsula a Stripe (planos, checkout, portal). A `apps/api` expõe `(routes)/webhooks/payments/route.ts`; em dev, `pnpm --filter api dev:with-stripe` encaminha eventos via Stripe CLI.

## Build, deploy e tooling

- **Turborepo** orquestra `dev`/`build`/`test`/`analyze` (`turbo.json`); `build` depende de `test`.
- **pnpm workspaces** (`apps/*`, `packages/*`); `public-hoist-pattern[]=*` no `.npmrc` para resolução estável de libs no IDE.
- **Biome/Ultracite** para lint/format (`pnpm check` / `pnpm fix`); **Vitest** para testes.
- **Deploy**: cada app é independente e pensado para a **Vercel**; a API também roda lá (Next no servidor) — ver `vercel.json` de cada app.

## Onde cada coisa vive

| Camada | Caminho | Papel |
|--------|---------|-------|
| Fachada HTTP | `packages/sdk` | Única porta do front para a API. |
| UI + tema | `packages/design-system` | Componentes genéricos, dark mode, RHF. |
| Traduções | `packages/internationalization` | pt-br/en/es, chaves estáveis. |
| Auth | `packages/auth` | Firebase Admin + client, API estilo Clerk. |
| Pagamentos | `packages/payments` | Stripe. |
| E-mail | `packages/email` | Templates + Resend. |
| Utils transversais | `packages/shared` | `HTTP_STATUS`, `FormattedError`, mappers de data. |
| Config compartilhada | `packages/next-config`, `packages/typescript-config` | Next/TS base. |
| Integrações | `packages/analytics`, `packages/security`, `packages/seo` | Analytics, Arcjet, SEO. |
