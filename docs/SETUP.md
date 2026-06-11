# Setup local & variáveis de ambiente

Como subir o boilerplate do zero e o mapa **real** das variáveis de ambiente. A fonte de verdade de cada var é o `keys.ts` do pacote correspondente (validado por `@t3-oss/env-nextjs`) e o `env.ts` de cada app.

> ⚠️ **Os arquivos `.env.example` estão desatualizados** — herdaram chaves do upstream next-forge (Clerk, `DATABASE_URL`, BetterStack, Svix, Knock, Liveblocks, BaseHub) que **não são usadas** neste fork. Use este documento como referência; ignore as chaves abaixo que não aparecem aqui. (Limpar os `.env.example` é uma tarefa recomendada — veja "Pendências de higiene".)

## Pré-requisitos

- Node `22.12.0` (`nvm use`) · pnpm `10.19.0`
- Contas: **Firebase** (Auth + Firestore), **Stripe**, **Resend**. Opcional: **Arcjet** (segurança), Google Analytics/PostHog.
- [Stripe CLI](https://docs.stripe.com/stripe-cli) para webhooks locais.

```bash
nvm use            # Node 22.12.0
pnpm install
```

## Variáveis por serviço

Cada var é lida pelo `keys.ts` indicado. Copie o `.env.example` de cada app para `.env.local` (ou `.env`) e preencha **apenas** o que está abaixo.

### Firebase — Auth (Admin, server) · pacote `@repo/auth` (`packages/auth/keys.ts`)
Usado pela `apps/api` (guards verificam o ID token) e onde houver auth no servidor.

| Var | Obrigatória | Onde obter |
|-----|-------------|-----------|
| `FIREBASE_ADMIN_PROJECT_ID` | sim* | Firebase Console → Project settings → Service accounts |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | sim | idem (gerar chave privada de service account) |
| `FIREBASE_ADMIN_PRIVATE_KEY` | sim | idem — manter `\n` escapados; o código faz `replace(/\\n/g, "\n")` |
| `FIREBASE_WEB_API_KEY` | sim | Web API key (Identity Toolkit, usada no sign-in/sign-up REST). Faz fallback p/ `NEXT_PUBLIC_FIREBASE_API_KEY` |

\* `FIREBASE_ADMIN_PROJECT_ID` cai para `NEXT_PUBLIC_FIREBASE_PROJECT_ID` se omitido (mesmo projeto).

### Firebase — client (browser) · lido em `@repo/auth/client.ts` e providers
Usado por `apps/app` e `apps/web` (sign-in/sign-up no cliente, sessão).

`NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` — todos em Firebase Console → Project settings → Your apps (Web).

> ⚠️ Em desenvolvimento, o client cai num app "mock" se faltar config (não quebra), mas auth real exige essas vars.

### SDK / API URL — front
| Var | App | Para quê |
|-----|-----|----------|
| `NEXT_PUBLIC_API_URL` | `app`, `web` | Base URL do `@repo/sdk` (`apps/app/shared/lib/client.ts`). Em dev: `http://localhost:3002`. **Sem isto o front não fala com a API.** |
| `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_WEB_URL` | todos | URLs cruzadas entre apps. |

### Stripe — pagamentos · pacote `@repo/payments` (`packages/payments/keys.ts`)
| Var | Obrigatória | Onde obter |
|-----|-------------|-----------|
| `STRIPE_SECRET_KEY` | p/ pagamentos | Stripe Dashboard → Developers → API keys (`sk_...`) |
| `STRIPE_WEBHOOK_SECRET` | p/ webhooks | `stripe listen` imprime `whsec_...`, ou Dashboard → Webhooks |

Se `STRIPE_SECRET_KEY` não estiver setada, a validação é pulada (o app sobe sem Stripe).

### Resend — e-mail · pacote `@repo/email` (`packages/email/keys.ts`)
`RESEND_TOKEN` (API key `re_...`) e `RESEND_FROM` (remetente verificado).

### Arcjet — segurança · pacote `@repo/security` (`packages/security/keys.ts`)
`ARCJET_KEY` (opcional para dev; recomendado em produção).

### Analytics (opcional) · `@repo/analytics`
`NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`.

## Rodando

```bash
pnpm dev                          # todos os apps (3000/3001/3002/3003)
pnpm --filter app dev             # só um app
pnpm --filter api dev:with-stripe # API (3002) + encaminhamento de webhooks Stripe
```

Portas: `app` 3000 · `web` 3001 · `api` 3002 · `email` 3003.

## Firestore

- O modelo de dados (coleções `user`, `entity`, …) é acessado pela API. As **regras de segurança** vivem em [`firestore.rules`](../firestore.rules) — leia [`docs/SECURITY.md`](SECURITY.md) **antes de fazer deploy das regras** (há uma dependência arquitetural importante).
- Provisione o Firestore no Firebase Console (modo de produção) e faça deploy das regras com a Firebase CLI (`npx -y firebase-tools@latest deploy --only firestore:rules`) ou via Firebase MCP.

## Pendências de higiene (recomendadas)

- **Limpar os `.env.example`** de `apps/{api,app,web}` para refletir só as vars acima (remover Clerk/`DATABASE_URL`/BetterStack/Svix/Knock/Liveblocks/BaseHub).
- **`apps/api/(shared)/infra/dabatase.ts`** tem a config Firebase **hardcoded** (apiKey/projectId no código). Mover para `NEXT_PUBLIC_FIREBASE_*` evita divergência entre ambientes/forks. Ver [`docs/SECURITY.md`](SECURITY.md).
