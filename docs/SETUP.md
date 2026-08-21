# Setup local & variáveis de ambiente

Como subir o boilerplate do zero e o mapa **real** das variáveis de ambiente. A fonte de verdade de cada var é o `keys.ts` do pacote correspondente (validado por `@t3-oss/env-nextjs`) e o `env.ts` de cada app.

> Os `.env.example` de `apps/{api,app,web}` já refletem **apenas** as vars usadas por este fork (agrupadas e comentadas). Copie o de cada app para `.env` (ou `.env.local`) e preencha. Este documento detalha **como obter/usar cada uma**. As chaves do upstream next-forge não usadas (Clerk, `DATABASE_URL`, BetterStack, Svix, Knock, Liveblocks, BaseHub) foram removidas.

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
Usado pelos **três** apps: `apps/api` (guards verificam o ID token), e `apps/app` + `apps/web` (proxy/SSR verificam a sessão **e mintam** o session cookie compartilhado + custom tokens da SSO cross-app — ver [`docs/AUTH-SSO.md`](AUTH-SSO.md)). Cada app precisa do service account.

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

### URLs entre apps
| Var | App | Para quê |
|-----|-----|----------|
| `NEXT_PUBLIC_API_URL` | `app`, `web`, `api` | Base URL do `@repo/sdk`. Em dev: `http://localhost:3002`. **Sem isto o front não fala com a API.** |
| `NEXT_PUBLIC_APP_URL` | todos | URL do painel. Link "Ir para o painel" (web, modo subscription), redirect comum→painel, e **base das URLs de retorno do Stripe checkout/portal** (api). |
| `NEXT_PUBLIC_WEB_URL` | todos | URL da web. Redirect do comum → web no modo `simple`. |
| `NEXT_PUBLIC_DOCS_URL` | `app`, `web` | Link de Documentação no header (opcional; oculto se vazio). |
| `CORS_ORIGIN` | `api` | Origem permitida nas respostas da API (`Access-Control-Allow-Origin`). Default `*`; em prod, sua origem web/app. |

### Modo de produto e sessão · `@repo/next-config` (`packages/next-config/keys.ts`) + `@repo/auth/session`
| Var | App | Para quê |
|-----|-----|----------|
| `NEXT_PUBLIC_PRODUCT_MODE` | `app`, `web` | `subscription` (usuário opera no painel; assinatura Stripe) \| `simple` (usuário opera na web; painel admin-only). Default `subscription`. Dirige roteamento/navbar/áreas — ver [`docs/AUTH-SSO.md`](AUTH-SSO.md) e [`docs/PAYMENTS.md`](PAYMENTS.md). |
| `SESSION_COOKIE_DOMAIN` | `app`, `web` | **Vazio em dev** (cookie host-only em `localhost`, compartilhado entre portas). Em prod: domínio registrável pai (`example.com`) para `app.example.com` + `example.com` compartilharem a sessão. Nunca um public suffix (`vercel.app`). |
| `SESSION_COOKIE_MAX_AGE_DAYS` | `app`, `web` | Duração da sessão em dias (Firebase: ~0.0035–14). Default 5. |

### SEO (apenas `apps/web`) · `@repo/seo`
Identidade da marca para metadata/Open Graph/JSON-LD. Todas opcionais (defaults neutros): `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_AUTHOR`, `NEXT_PUBLIC_APP_AUTHOR_URL`, `NEXT_PUBLIC_TWITTER_HANDLE`.

### i18n · `@repo/internationalization`
`NEXT_PUBLIC_DEFAULT_LOCALE` (`pt-br` | `en` | `es`, default `pt-br`) — locale usado quando a URL não traz prefixo de idioma.

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
`NEXT_PUBLIC_GA_MEASUREMENT_ID` (Google Analytics). Opcional; deixe vazio para desligar.

## Rodando

```bash
pnpm dev                          # todos os apps (3000/3001/3002/3003)
pnpm --filter app dev             # só um app
pnpm --filter api dev:with-stripe # API (3002) + encaminhamento de webhooks Stripe
```

Portas: `app` 3000 · `web` 3001 · `api` 3002 · `email` 3003.

## Conductor (workspaces paralelos)

O repo traz [`.conductor/settings.toml`](../.conductor/settings.toml), então cada workspace novo já nasce
pronto para os agents rodarem typecheck, testes, lint e subir os apps:

| Config | Efeito |
|--------|--------|
| `file_include_globs` | Copia os gitignored necessários para o workspace: `apps/*/.env`, `.env` da raiz e os arquivos locais do Claude. **Sem os `.env`, o front não fala com a API e o Firebase não inicializa.** |
| `scripts.setup` | `pnpm install` na criação do workspace (root + `apps/*` + `packages/*`). |
| `scripts.archive` | Remove todo `node_modules` do worktree antes de arquivar (~2 GB por workspace). |
| `scripts.run_mode` | `nonconcurrent`: as portas são fixas nos scripts `dev` e os apps se referenciam por `NEXT_PUBLIC_*_URL`, então **um workspace roda de cada vez**. |
| `scripts.run.*` | Botão Run: `dev` (todos), `app`, `web`, `api`, `test`, `check`. |

⚠️ Conductor só passa a refletir o `settings.toml` **depois que ele chega à branch default no remoto**
(`origin/main`). Antes disso, para valer já: copie o arquivo para `.conductor/settings.local.toml` no
diretório raiz do repositório (`~/next-boilerplate/`) — essa cópia é pessoal, não versionada, e tem
precedência. **Apague-a depois do merge**, ou ela continuará sobrepondo o arquivo compartilhado.

Para rodar dois workspaces em paralelo seria preciso parametrizar as portas (`$CONDUCTOR_PORT`) nos
scripts `dev` **e** nas URLs cruzadas de cada `.env` — hoje não é suportado.

## Firestore

- O modelo de dados (coleções `user`, `entity`, …) é acessado pela API. As **regras de segurança** vivem em [`firestore.rules`](../firestore.rules) — leia [`docs/SECURITY.md`](SECURITY.md) **antes de fazer deploy das regras** (há uma dependência arquitetural importante).
- Provisione o Firestore no Firebase Console (modo de produção) e faça deploy das regras com a Firebase CLI (`npx -y firebase-tools@latest deploy --only firestore:rules`) ou via Firebase MCP.

## Pendências de higiene (recomendadas)

- **`apps/api/(shared)/infra/dabatase.ts`** tem a config Firebase **hardcoded** (apiKey/projectId no código). Mover para `NEXT_PUBLIC_FIREBASE_*` (já presentes no `.env.example` da api) evita divergência entre ambientes/forks. Ver [`docs/SECURITY.md`](SECURITY.md).
