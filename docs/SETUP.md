# Setup local & variáveis de ambiente

Como subir o boilerplate do zero e o mapa **real** das variáveis de ambiente. A fonte de verdade de cada var é o `keys.ts` do pacote correspondente (validado por `@t3-oss/env-nextjs`) e o `env.ts` de cada app.

> Os `.env.example` de `apps/{api,app,web}` refletem **apenas** as vars usadas por este fork (agrupadas e comentadas). Copie o de cada app para `.env` (ou `.env.local`) e preencha. Este documento detalha **como obter/usar cada uma**. As chaves herdadas do upstream next-forge e não usadas aqui — Clerk, `DATABASE_URL`, BetterStack, Svix, Knock, Liveblocks, BaseHub, `FLAGS_SECRET` e PostHog — foram removidas.

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

> ⛔ **A `apps/api` não sobe sem as três.** Para ela a service account não é só auth: é a credencial do **banco** (o Firestore é acessado pelo Admin SDK). `apps/api/instrumentation.ts` resolve a instância no boot e o processo morre com mensagem clara se faltar alguma — não há modo degradado.
>
> As três também são exigidas em **`pnpm --filter api build`**: `apps/api/env.ts` as declara como server vars
> obrigatórias e é importado por uma rota, então o build de produção falha com `Invalid environment
> variables` se elas não estiverem no ambiente de build (só `NODE_ENV=development` pula a validação).
> Considere isso ao configurar CI ou qualquer build fora da Vercel.

> ⚠️ **A service account é tudo ou nada.** `packages/auth/keys.ts` aceita o conjunto **inteiramente ausente** (um front que só precise de `FIREBASE_WEB_API_KEY`), mas rejeita um conjunto **parcial** como erro de env, nomeando as vars que faltam. Atenção ao caso de borda: como `FIREBASE_ADMIN_PROJECT_ID` cai para `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, ter essa var pública configurada já torna o conjunto "não vazio" — então `FIREBASE_ADMIN_CLIENT_EMAIL` e `FIREBASE_ADMIN_PRIVATE_KEY` passam a ser exigidas. É o comportamento desejado (os três apps precisam do service account), mas explica a mensagem se você configurar só a parte pública.

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

- O modelo de dados (coleções `user`, `entity`, …) é acessado **só** pela API, que se autentica com a service account via Admin SDK e por isso **ignora** as security rules. O arquivo de rules ([`firestore.rules`](../firestore.rules)) está escrito em `deny-all`. Contexto em [`docs/SECURITY.md`](SECURITY.md).
- ⛔ **Escrito no arquivo ≠ publicado.** Enquanto o `deploy` abaixo não rodar, qualquer pessoa com a chave pública do projeto lê e grava a base direto, ignorando os guards da API. Publicar é obrigatório em todo ambiente, inclusive dev.
- Provisione o Firestore no Firebase Console (modo de produção) e publique rules **e** índices:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes
```

- Os índices compostos **declarados** para as consultas atuais estão em [`firestore.indexes.json`](../firestore.indexes.json). O Firestore serve as consultas de hoje sem eles (só igualdades, resolvidas pelos índices de campo único automáticos), então a declaração é preventiva — não espere um erro se remover. Se uma consulta nova responder `FAILED_PRECONDITION … requires an index`, a mensagem do Firestore nomeia o índice exato: acrescente a entrada ao arquivo e republique.

### Projeto alvo — `.firebaserc` é versionado

O [`.firebaserc`](../.firebaserc) na raiz é **versionado** e seu `default` aponta para o projeto de referência deste boilerplate. Isso encurta os comandos (sem `--project`) e mantém o project id num lugar só.

**Um fork não deve rodar `firebase use <id>`**: esse comando **reescreve um arquivo versionado**, deixando o `git status` sujo para sempre ou forçando um commit do id próprio por cima. Use uma das duas saídas:

- `npx -y firebase-tools@latest deploy --project <id-do-fork> --only firestore:rules,firestore:indexes` — o flag **sobrepõe** o `default` sem tocar no arquivo. **Recomendado.**
- `npx -y firebase-tools@latest use --add` — grava um **alias** nomeado ao lado do `default`, o que ao menos torna a mudança intencional e revisável no diff.

## Primeiro admin (bootstrap de desenvolvimento)

O cadastro público cria sempre um usuário **comum**, e a rota que cria admin exige um admin autenticado —
então o primeiro admin de um ambiente novo não nasce pelo produto. Para criá-lo:

```bash
pnpm --filter api create-dev-admin <email> <senha>
# ou: DEV_ADMIN_EMAIL=... DEV_ADMIN_PASSWORD=... pnpm --filter api create-dev-admin
```

O script usa as `FIREBASE_ADMIN_*` do `apps/api/.env`, cria (ou reaproveita) o usuário no Firebase Auth e
grava/promove o documento correspondente na coleção `user` com `type: "admin"`. A senha vem por argumento
ou variável de ambiente e **nunca** é gravada em arquivo nem impressa pelo script.

É **idempotente e serve para recuperar acesso**: se o e-mail já existir, o script define a senha informada
nessa conta e promove o perfil a admin. Rodar de novo é a forma de voltar a entrar quando a senha se perdeu.

> Prefira a forma com variável de ambiente: o `pnpm` ecoa a linha de comando que executa, então a senha
> passada por argumento aparece no terminal e no histórico do shell.

> ⚠️ É ferramenta de **desenvolvimento**. Ela fala com o projeto Firebase configurado no `.env`: apontada
> para produção, cria um administrador real — e redefine a senha de uma conta existente.

## Pendências de higiene (recomendadas)

- **`apps/api/.env.example`** ainda carrega chaves do upstream next-forge que este fork não usa (Clerk, `DATABASE_URL`, BetterStack, Svix, Knock, Liveblocks, BaseHub) — apesar da nota no topo deste documento. Limpar evita que cada fork herde configuração morta.
