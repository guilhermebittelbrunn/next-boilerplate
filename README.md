# Boilerplate MVP — monorepo full-stack

Boilerplate em **monorepo** (Turborepo + pnpm) para gerar rapidamente **MVPs** coringa. Fork customizado do [next-forge](https://github.com/vercel/next-forge), com stack escolhida para **começar de graça e escalar**: Next.js na Vercel, Firebase (Auth + Firestore), Stripe, Resend e i18n próprio.

> 📐 [Arquitetura](docs/ARCHITECTURE.md) · ⚙️ [Setup & env](docs/SETUP.md) · 🔒 [Segurança](docs/SECURITY.md) · 💳 [Pagamentos](docs/PAYMENTS.md) · 🤖 [Workflow com IA](docs/AI-WORKFLOW.md) · 📋 Convenções: [`AGENTS.md`](AGENTS.md) + `CLAUDE.md` aninhados · 🧭 [Mapa rápido](CLAUDE.md)

## Filosofia

- **Genérico no pacote, específico no app** — `packages/*` é infraestrutura reutilizável entre forks; o domínio de cada produto vive em `apps/*`.
- **Grátis para começar** — Vercel, Firebase (Spark), Stripe (sem custo fixo), Resend (free tier).
- **Global por padrão** — multi-idioma (pt-br/en/es) sem serviço de terceiros, tema light/dark/system, responsivo mobile-first.
- **Type-safe de ponta a ponta** — o front fala com a API só por um SDK tipado.

## Apps

| App | Porta | Papel |
|-----|-------|-------|
| `apps/web` | 3001 | Landing/CTA pública — marketing, SEO, pricing, FAQ, contato. |
| `apps/app` | 3000 | Aplicação do usuário — dashboard, cadastro, assinaturas e **área admin** (gestão de usuários + impersonação). |
| `apps/api` | 3002 | API HTTP (Next no servidor) — guards → repositórios Firestore → DTOs. |
| `apps/email` | 3003 | Preview/dev dos templates de e-mail (React Email). |

## Packages

- **`@repo/sdk`** — fachada (axios) de chamada à API; única porta do front.
- **`@repo/design-system`** — UI compartilhada (shadcn), tema (light/dark/system via tokens CSS), componentes `HookForm*` (RHF).
- **`@repo/internationalization`** — dicionário pt-br/en/es, sem terceiros.
- **`@repo/auth`** — Firebase (Admin no servidor + client), API estilo Clerk.
- **`@repo/payments`** — Stripe (planos, checkout, webhooks).
- **`@repo/email`** — templates + envio via Resend.
- **`@repo/shared`** — utils transversais (`HTTP_STATUS`, `FormattedError`, normalização de datas).
- **`@repo/analytics` · `@repo/security` (Arcjet) · `@repo/seo` · `@repo/next-config` · `@repo/typescript-config`** — integrações e config.

## Começando

### Pré-requisitos
- Node `22.12.0` (ver [`.nvmrc`](.nvmrc))
- [pnpm](https://pnpm.io) `10.19.0`
- Conta Firebase (Auth + Firestore), Stripe e Resend
- [Stripe CLI](https://docs.stripe.com/stripe-cli) para webhooks locais

### Instalação
```sh
pnpm install
```

### Variáveis de ambiente
Referência autoritativa (as vars reais, por serviço): [`docs/SETUP.md`](docs/SETUP.md). Resumo:
- **Firebase Admin** (`apps/api`): `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`.
- **Firebase client** (`apps/app`, `apps/web`): chaves `NEXT_PUBLIC_FIREBASE_*`.
- **API URL** (front): `NEXT_PUBLIC_API_URL`.
- **Stripe** / **Resend** conforme os `.env.example`.

### Rodando
```sh
pnpm dev                       # sobe todos os apps via turbo
pnpm --filter app dev          # ou só um app (app | web | api | email)
pnpm --filter api dev:with-stripe   # API + encaminhamento de webhooks Stripe
```

## Comandos

```sh
pnpm check       # lint/format check (Ultracite/Biome)
pnpm fix         # auto-fix de lint/format
pnpm test        # Vitest em todos os workspaces
pnpm build       # build de produção (depende de test)
pnpm bump-ui     # re-sincroniza componentes shadcn no design-system
pnpm --filter <app> typecheck   # tsc --noEmit de um workspace
```

## CRUD de referência

O recurso `entity` implementa um CRUD vertical completo (SDK → API → app → i18n) e serve como **template vivo** para novos recursos — veja a skill `/new-crud` em [`docs/AI-WORKFLOW.md`](docs/AI-WORKFLOW.md).

## Deploy

Cada app é independente e pensado para a **Vercel** (a API roda Next no servidor). Ver `vercel.json` em cada app.

## Licença

MIT — ver [`license.md`](license.md).
