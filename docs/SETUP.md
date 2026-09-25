# Setup local & variáveis de ambiente

Como subir o boilerplate do zero e o mapa **real** das variáveis de ambiente. A fonte de verdade de cada var é o `keys.ts` do pacote correspondente (validado por `@t3-oss/env-nextjs`) e o `env.ts` de cada app.

> Os `.env.example` de `apps/{api,app,web}` refletem **apenas** as vars usadas por este fork (agrupadas e comentadas). Copie o de cada app para `.env` (ou `.env.local`) e preencha. Este documento detalha **como obter/usar cada uma**. As chaves herdadas do upstream next-forge e não usadas aqui — Clerk, `DATABASE_URL`, BetterStack, Svix, Knock, Liveblocks, BaseHub, `FLAGS_SECRET` e PostHog — foram removidas.

> 🚀 **Indo para produção?** Este documento cobre o ambiente local. Os passos que só existem fora do repo — publicar as rules do Firestore, verificar o domínio de e-mail no DNS, ligar branch protection — estão em [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md), em formato de checklist.

## Pré-requisitos

- Node `22.12.0` (`nvm use`) · pnpm `10.19.0`
- **JDK 21+** — só para rodar os emuladores do Firebase (eles são JARs). `java -version` precisa dizer `21` ou mais; o `firebase-tools` recusa versões anteriores. No macOS: `brew install openjdk@21`. A fórmula é **keg-only**: o `brew` instala e não põe no `PATH`, então `java -version` continua respondendo a versão antiga (ou nenhuma) e parece que a instalação falhou. Aponte o `JAVA_HOME` na sessão antes de subir o emulador:

  ```bash
  export JAVA_HOME=/opt/homebrew/opt/openjdk@21   # Intel: /usr/local/opt/openjdk@21
  export PATH="$JAVA_HOME/bin:$PATH"
  ```

  Para não repetir a cada terminal, ponha as duas linhas no `~/.zshrc`.
- Contas: **Firebase** (Auth + Firestore), **Stripe**, **Resend** — necessárias **para publicar**, não para desenvolver. Para desenvolver local, os emuladores substituem o Firebase (ver [Emulador do Firebase](#emulador-do-firebase-caminho-local-padrão)). Opcional: **Arcjet** (segurança), Google Analytics/PostHog.
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
| `FIREBASE_STORAGE_BUCKET` | **não** | Bucket do Cloud Storage (ex.: `<project-id>.firebasestorage.app`). **Chave do upload de arquivo**: vazia, `POST /files` responde `STORAGE_NOT_CONFIGURED` (503) e o painel mantém o campo de URL. Faz fallback p/ `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`. ⚠️ Exige plano **Blaze** — ver [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md) §6 |

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

> 📦 **`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` é também o interruptor do upload de arquivo** no `apps/app`:
> preenchida, o formulário mostra o seletor de arquivo e o host do bucket entra na política de imagem;
> vazia, ele mantém o campo de URL. Deve ter o **mesmo valor** de `FIREBASE_STORAGE_BUCKET` na `apps/api`.
> Ativação, permissões da service account e custo: [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md) §6.

### URLs entre apps
| Var | App | Para quê |
|-----|-----|----------|
| `NEXT_PUBLIC_API_URL` | `app`, `web`, `api` | Base URL do `@repo/sdk`. Em dev: `http://localhost:3002`. **Sem isto o front não fala com a API.** |
| `NEXT_PUBLIC_APP_URL` | todos | URL do painel. Link "Ir para o painel" (web, modo subscription), redirect comum→painel, e **base das URLs de retorno do Stripe checkout/portal** (api). |
| `NEXT_PUBLIC_WEB_URL` | todos | URL da web. Redirect do comum → web no modo `simple`. |
| `NEXT_PUBLIC_DOCS_URL` | `app`, `web` | Link de Documentação no header (opcional; oculto se vazio). |
| `CORS_ORIGIN` | `api` | **Lista de origens separada por vírgula** (`https://app.example.com,https://example.com`) autorizadas a chamar a API pelo browser. **Obrigatória em produção**: sem ela a API não sobe (`apps/api/instrumentation.ts`). Fora de produção, vazia = `http://localhost:3000,http://localhost:3001`. **Não existe coringa.** Requisição sem header `Origin` (servidor→servidor, prefetch RSC) passa sem cabeçalho de CORS; origem fora da lista recebe `403 AUTH_FORBIDDEN_ORIGIN`. |

> ⚠️ **Preview deploys**: o domínio efêmero (`*.vercel.app`) não está em `CORS_ORIGIN` e o browser será recusado. Acrescente a origem do preview à variável do ambiente de preview — mesma armadilha dos *Authorized domains* do Firebase.

### Modo de produto e sessão · `@repo/next-config` (`packages/next-config/keys.ts`) + `@repo/auth/session`
| Var | App | Para quê |
|-----|-----|----------|
| `NEXT_PUBLIC_PRODUCT_MODE` | `app`, `web` | `subscription` (usuário opera no painel; assinatura Stripe) \| `simple` (usuário opera na web; painel admin-only). Default `subscription`. Dirige roteamento/navbar/áreas — ver [`docs/AUTH-SSO.md`](AUTH-SSO.md) e [`docs/PAYMENTS.md`](PAYMENTS.md). |
| `NEXT_PUBLIC_PRIVACY_CONTACT` | `web` | Endereço publicado como canal de privacidade nas páginas legais. Vazio: o canal cai no formulário de `/contact`, que entrega em `ownerInbox()`. |
| `SESSION_COOKIE_DOMAIN` | `app`, `web` | **Vazio em dev** (cookie host-only em `localhost`, compartilhado entre portas). Em prod: domínio registrável pai (`example.com`) para `app.example.com` + `example.com` compartilharem a sessão. Nunca um public suffix (`vercel.app`). |
| `SESSION_COOKIE_MAX_AGE_DAYS` | `app`, `web` | Duração da sessão em dias (Firebase: ~0.0035–14). Default 5. |
| `SESSION_ABSOLUTE_MAX_AGE_DAYS` | `app`, `web` | Teto absoluto da sessão em dias, contado da autenticação original. Enquanto a aba está aberta o cookie é renovado; passado o teto a renovação é recusada com `AUTH_SESSION_EXPIRED` e o cookie é limpo. Default 30, grampeado entre `SESSION_COOKIE_MAX_AGE_DAYS` e 90. |
| `ONBOARDING_ENABLED` | `app` | Fluxo de onboarding depois do cadastro (nome de exibição e idioma), lido em `apps/app/env.ts`. Vazio ou ausente: ligado. `"false"`: ninguém é desviado e `/onboarding` redireciona para o painel. A API continua gravando o estado inicial em perfis novos, então quem se cadastrar com a variável em `"false"` passa pelo fluxo uma vez se ela voltar a ficar vazia. |

### SEO (apenas `apps/web`) · `@repo/seo`
Identidade da marca para metadata/Open Graph/JSON-LD. Todas opcionais (defaults neutros): `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_AUTHOR`, `NEXT_PUBLIC_APP_AUTHOR_URL`, `NEXT_PUBLIC_TWITTER_HANDLE`.

### i18n · `@repo/internationalization`
`NEXT_PUBLIC_DEFAULT_LOCALE` (`pt-br` | `en` | `es`, default `pt-br`) — locale usado quando a URL não traz prefixo de idioma.

### Stripe — pagamentos · pacote `@repo/payments` (`packages/payments/keys.ts`)
| Var | Obrigatória | Onde obter |
|-----|-------------|-----------|
| `STRIPE_SECRET_KEY` | p/ pagamentos | Stripe Dashboard → Developers → API keys (`sk_...`) |
| `STRIPE_WEBHOOK_SECRET` | p/ webhooks | `stripe listen` imprime `whsec_...`, ou Dashboard → Webhooks |

Opcionais: vazias ou ausentes, a API sobe com a cobrança desligada (a aba billing mostra o placeholder e as
rotas de pagamento respondem `PAYMENTS_NOT_CONFIGURED`). Preencha as duas ou nenhuma; com só uma, a API avisa
no boot. Uma chave com prefixo errado (`pk_` como secret, por exemplo) falha a validação. Passo a passo em
[`docs/PRE-PRODUCTION.md`](PRE-PRODUCTION.md), item 12.

### Resend — e-mail · pacote `@repo/email` (`packages/email/keys.ts`)
`RESEND_TOKEN` (API key `re_...`) e `RESEND_FROM` (remetente verificado).

### Arcjet — segurança · pacote `@repo/security` (`packages/security/keys.ts`)
`ARCJET_KEY` (opcional para dev; recomendado em produção).

### Analytics (opcional) · `@repo/analytics`
`NEXT_PUBLIC_GA_MEASUREMENT_ID` (Google Analytics). Opcional; deixe vazio para desligar.

## Rodando

O caminho local padrão são **três comandos**, em dois terminais — sem conta no Google e sem tocar em dado real:

```bash
pnpm emulators   # terminal 1: Auth + Firestore emulados (deixe rodando)
pnpm seed        # terminal 2: popula o estado inicial
pnpm dev         # terminal 2: todos os apps (3000/3001/3002/3003)
```

Detalhes, credenciais do seed e como sair do emulador: [Emulador do Firebase](#emulador-do-firebase-caminho-local-padrão).

```bash
pnpm --filter app dev             # só um app
pnpm --filter api dev:with-stripe # API (3002) + encaminhamento de webhooks Stripe
```

Portas: `app` 3000 · `web` 3001 · `api` 3002 · `email` 3003 · emulador Auth 9099 · Firestore 8080 · UI do
emulador 4001. O `emulators:start` também reserva **4400** (hub), **4500** e **9150** — não são
configuráveis pelo `firebase.json` e entram na conta de "porta ocupada derruba tudo".

## CI — GitHub Actions

O pipeline vive em [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). São quatro jobs:

| Job | Quando roda | Executa | Teto |
|-----|-------------|---------|------|
| `verify` | toda PR e todo push em `main` | `pnpm turbo run lint typecheck test` | 15 min |
| `changes` | toda PR e todo push em `main` | decide se o diff alcança o produto (ver abaixo) | 5 min |
| `e2e` | quando `changes` diz que sim | `pnpm e2e` (ver [Testes E2E](#testes-e2e-playwright)) | 25 min |
| `coverage` | quando `changes` diz que sim | `pnpm coverage` e o resumo por workspace no sumário do job | 15 min |

| Item | Valor |
|------|-------|
| Dispara em | toda `pull_request` (qualquer branch alvo) e todo `push` em `main` |
| Node / pnpm | lidos do repositório: `.nvmrc` (`22.12.0`) e `packageManager` (`pnpm@10.19.0`) |
| Cache | store do pnpm, via `actions/setup-node` com chave no `pnpm-lock.yaml`; no `e2e`, também os JARs do emulador e o Chromium do Playwright |
| Secrets | **nenhum** |
| Concorrência | execuções concorrentes na mesma ref são canceladas |

O `changes` pula `e2e` e `coverage` numa PR que só mexe em `docs/`, `specs/`, `.claude/` ou arquivos `.md`.
Qualquer outro arquivo liga os dois, inclusive `packages/auth`, o `pnpm-lock.yaml` ou o `firebase.json`, que
quebram o login sem tocar `apps/`. Push em `main` roda sempre. Job pulado por `if` conta como sucesso para
check obrigatório, então exigir `e2e` não trava PR de documentação.

Três consequências que valem entender antes de mexer:

- **O comando é o mesmo dos dois lados.** `pnpm turbo run lint typecheck test` roda igual no seu terminal e
  no runner. Nada de lint só do diff no CI: isso reintroduz o "passa aqui, quebra lá".
- **`build` está fora de propósito.** `apps/api` exige `FIREBASE_ADMIN_PROJECT_ID`, `_CLIENT_EMAIL` e
  `_PRIVATE_KEY` para buildar; incluí-lo obrigaria a configurar segredos e um clone limpo deixaria de rodar
  o pipeline. O build continua sendo verificado onde ele roda de verdade: localmente e na Vercel.
- **`--frozen-lockfile` é um gate de graça.** Mexeu num `package.json` sem rodar `pnpm install`? A PR fica
  vermelha na instalação. Commite o `pnpm-lock.yaml` junto.
- **Fork privado paga o `e2e` em minutos de Actions.** O `verify` leva cerca de um minuto; o `e2e` sobe
  emulador, três servidores `next dev` e um navegador, e leva vários. Repositório público não paga.

### Runbook — branch protection (ação manual no GitHub)

Workflow é arquivo versionado; **required check não é**. Um fork clona `.github/workflows/` mas nasce sem
nenhuma proteção — o CI apenas sinaliza, e nada impede um push direto em `main`. Para que a verificação
bloqueie o merge, alguém precisa ligar isto **uma vez por repositório**:

1. Abra uma PR qualquer e deixe o workflow rodar ao menos uma vez — o GitHub só lista um check depois de
   tê-lo visto executar.
2. `Settings` → `Branches` → `Add branch ruleset` (ou `Add rule` no modelo clássico), alvo `main`.
3. Marque:
   - **Require a pull request before merging** — é o que fecha o push direto em `main`.
   - **Require status checks to pass before merging** e, na busca, selecione **`verify`** e **`e2e`** (o
     `name:` de cada job). O `e2e` só aparece na busca depois de ter rodado numa PR (passo 1). Não exija
     `changes` nem `coverage`: o primeiro só decide, o segundo é informativo. Se aparecerem checks com nome
     parecido, confira que vieram do workflow `CI`.
   - **Require branches to be up to date before merging** — evita o merge que passa isolado e quebra a
     `main` combinado com outro PR.
4. Deixe **Allow force pushes** e **Allow deletions** desmarcados.
5. Se o repositório usa administradores que também abrem PR, marque **Do not allow bypassing the above
   settings** — sem isso a proteção é uma sugestão.

Confira ao final abrindo uma PR com um erro deliberado (um `console.log` basta, o Biome trata como erro):
o botão de merge tem de ficar bloqueado.

> Enquanto isso não estiver ligado, a regra de nunca commitar em `main` é garantida só pelo hook local
> `.claude/hooks/block-protected-branch-write.sh`, que não existe num clone sem o ferramental de IA.

## Testes E2E (Playwright)

A suíte vive em `apps/e2e` e percorre, num Chromium de verdade e contra o emulador, os fluxos que todo fork
herda: cadastro com onboarding, login (comum, admin, senha errada, deep link com `?redirect=`), CRUD de
`entity`, troca de painel do admin, usuário comum barrado no `/admin` e o CTA de cadastro da landing. Nas
telas percorridas ela roda o axe e falha em violação `critical` ou `serious`.

É rede de regressão. Ela não julga tema, alinhamento, responsivo nem idioma (roda só em `pt-br` e desktop),
então não substitui a passada com `agent-browser` numa entrega de front-end.

### Rodar local

Precisa do JDK 21 no `PATH` (ver [Pré-requisitos](#pré-requisitos)) e, na primeira vez, do navegador:

```bash
pnpm --filter e2e exec playwright install chromium
pnpm e2e                          # sobe emulador + api/app/web, roda o seed e a suíte
pnpm --filter e2e e2e:report      # abre o relatório HTML da última execução
```

O `pnpm e2e` sobe tudo sozinho e derruba ao terminar. As portas 3000, 3001 e 3002 precisam estar livres: a
suíte nunca reaproveita um `app`, `web` ou `api` já de pé, porque um `pnpm dev` aberto pode estar lendo o
`.env` local. Se uma delas estiver ocupada, o erro nomeia a porta. Para rodar mesmo assim, troque as três
portas da suíte:

```bash
E2E_APP_PORT=3100 E2E_WEB_PORT=3101 E2E_API_PORT=3102 pnpm e2e
```

Sem essas variáveis, valem 3000/3001/3002. O emulador é a exceção: se já houver um no ar, a suíte usa esse.
Em qualquer caso o projeto `setup` roda o seed no começo, e o estado do emulador volta ao de
[Estado que o `pnpm seed` cria](#estado-que-o-pnpm-seed-cria).

A primeira execução é lenta: o `next dev` compila cada rota na primeira requisição, e o `setup` visita as
rotas da suíte antes dos testes para pagar esse custo uma vez só.

### Por que a suíte ignora o seu `.env`

O ambiente de cada servidor é montado a partir do `.env.example` do app (`apps/e2e/support/stackEnv.ts`).
Toda chave que só existe nos arquivos `.env*` locais vai vazia, as credenciais do Firebase e a `ARCJET_KEY`
vão vazias, e o bloco do emulador (`FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`,
`NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST`, project id `demo-next-boilerplate`) é forçado. Como o Next lê
`process.env` antes dos arquivos, o valor vazio vence o do `.env`. Antes de subir qualquer servidor, a config
confere o resultado com a mesma regra do seed (`apps/api/scripts/emulatorTarget.mjs`) e recusa se ele puder
alcançar um projeto real.

### Evidência no CI

O job `e2e` publica o artefato `e2e-evidence` quando falha: `playwright-report/` (relatório HTML) e
`test-results/`, com trace, vídeo e screenshot de cada teste que falhou. O trace abre em
`pnpm --filter e2e exec playwright show-trace <trace.zip>` e mostra rede e console do momento da falha.

No CI, cada teste tem uma segunda tentativa, e um teste que só passa nela reprova o job
(`failOnFlakyTests`). O relatório marca esse teste como `flaky`, o que separa "quebrou" de "passa quase
sempre". Espera fixa (`waitForTimeout`) não entra na suíte: toda espera é asserção.

### Acessibilidade e a allowlist

As exceções do axe ficam em `apps/e2e/a11y/allowlist.ts`. Cada entrada tem rota, regra, um seletor CSS
escrito à mão que o elemento precisa casar e o motivo. O seletor não é o que o axe imprime: aquele é montado
a partir de classes e ids gerados e muda a cada ajuste de estilo. Uma exceção cobre só aquela regra naquele
elemento daquela rota, então um campo novo sem rótulo na mesma tela continua reprovando.

Entrada que não casa mais nada aparece como anotação `a11y-stale-exception` no relatório, sem reprovar;
remova-a. Corrigiu o componente? Tire a exceção no mesmo PR. Violação `minor` e `moderate` não reprova e fica
no anexo JSON de cada teste.

## Cobertura

```bash
pnpm coverage                      # roda todos os workspaces numa execução só, com v8
node scripts/coverage-summary.mjs  # tabela markdown por workspace, a partir do resumo gerado
```

O `vitest.config.mts` da raiz lista os configs de `apps/*` e `packages/*` como `projects`. Relatório por
workspace não soma, então o número consolidado sai dessa execução única. A saída fica em `coverage/`
(`coverage-summary.json` e `index.html`). Arquivo que nenhum teste importa conta como 0%. `apps/e2e` roda os
próprios testes, mas fica fora da medição.

Não há limiar. O job `coverage` do CI publica a tabela no sumário da execução e o relatório como artefato,
e só falha quando um teste falha.

`@vitest/coverage-v8` está fixado em `4.0.3` porque exige exatamente a mesma versão do `vitest`. Quem
atualizar o `vitest` atualiza os dois juntos.

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

## Emulador do Firebase (caminho local padrão)

Os `.env.example` já vêm apontados para os emuladores. Copiando-os, o stack inteiro roda **local, offline,
sem conta no Google e sem tocar em dado real** — o service account do Firebase só é necessário para publicar.

```bash
cp apps/api/.env.example apps/api/.env
cp apps/app/.env.example apps/app/.env
cp apps/web/.env.example apps/web/.env

pnpm emulators   # terminal 1 — deixe rodando; Ctrl+C encerra e descarta o estado
pnpm seed        # terminal 2
pnpm dev         # terminal 2
```

### Estado que o `pnpm seed` cria

Todas as contas usam a senha **`demo1234`**.

| e-mail | papel | dados |
|--------|-------|-------|
| `admin@example.com` | admin | acesso à área `/admin` |
| `user@example.com` | comum | 4 `entity` (um de cada tipo + um desabilitado) |
| `user2@example.com` | comum | 2 `entity` — existem para testar posse: abrir um registro deles logado como `user@example.com` tem de dar 404 |

**`pnpm seed` apaga e repovoa**: reset e seed são o mesmo comando, então rodá-lo duas vezes devolve
exatamente o mesmo estado, sem duplicata. O estado vive **só** nos emuladores e morre com o processo —
não há `--import`/`--export-on-exit` de propósito, para que o ponto de partida seja sempre o mesmo.

Essas credenciais são seguras porque não existem fora daqui: o seed **recusa rodar** se os hosts do
emulador não estiverem preenchidos, ou se o project id não começar com `demo-`.

### Por que `demo-next-boilerplate`

Os emuladores aceitam qualquer project id prefixado com `demo-` sem credencial nenhuma, e o Google nunca
emite um — é esse par que permite rodar sem conta. O id vai **na linha de comando** (`pnpm emulators` já
passa `--project`), nunca no [`.firebaserc`](../.firebaserc), que é versionado (ver a seção acima).

### Voltar para um projeto Firebase real

**Esvazie o bloco do emulador** nos três `.env` (`FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`,
`NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`) e preencha o service account
e as `NEXT_PUBLIC_FIREBASE_*`. Sem nenhuma dessas variáveis, o comportamento é exatamente o de antes de os
emuladores existirem — o código não tem default algum, quem é opinativo é o `.env.example`.

> ⚠️ **Trate o bloco como unidade.** Preencher metade — servidor emulado e navegador não, ou o contrário —
> coloca os dois lados em projetos Firebase diferentes: o login "funciona" e o perfil não é encontrado.
> É a falha mais provável de um fork.

### Armadilhas

- **A primeira execução precisa de internet.** O `firebase-tools` baixa os JARs dos emuladores na primeira
  vez (para `~/.cache/firebase/emulators/`). Da segunda em diante, funciona offline de verdade.
- **Precisa de JDK 21+.** Com Java 17 o `firebase-tools` recusa com `no longer supports Java version before 21`.
  Se você instalou pelo `brew`, a fórmula é keg-only e não entra no `PATH` sozinha: exporte `JAVA_HOME` e
  `PATH` antes de rodar `pnpm emulators` (ver [Pré-requisitos](#pré-requisitos)). Sem isso o `java -version`
  aponta para o JDK antigo e a mensagem sugere, erradamente, que o 21 não está instalado.
- **Porta ocupada derruba tudo.** Se a porta da UI (4001) ou qualquer outra estiver em uso, o
  `emulators:start` aborta inteiro, inclusive Auth e Firestore. O erro nomeia a porta; mude-a no bloco
  `emulators` do [`firebase.json`](../firebase.json).
- **`pnpm --filter api build` não funciona sob o emulador** — `apps/api/env.ts` exige os três
  `FIREBASE_ADMIN_*` fora de `development`. O caminho local é `pnpm dev`; o build continua exigindo
  service account, como já documentado acima.
- **Upload de imagem fica desligado sob o emulador.** O Cloud Storage **não** é emulado aqui, e um bucket
  real combinado com os hosts do emulador gravaria objeto de verdade num bucket de verdade — sem erro
  visível. Por isso, emulando, a API responde `STORAGE_NOT_CONFIGURED` e o formulário de entidade cai no
  campo de URL da foto. Para exercitar upload, use um projeto Firebase real.

## Primeiro admin (bootstrap de desenvolvimento)

O cadastro público cria sempre um usuário **comum**, e a rota que cria admin exige um admin autenticado —
então o primeiro admin de um ambiente novo não nasce pelo produto.

**No emulador** o `pnpm seed` já entrega `admin@example.com`, e não é preciso mais nada. Para criar outro,
ou para um projeto real:

```bash
# contra o emulador — não precisa de service account nem de flag
pnpm --filter api create-dev-admin <email> <senha>

# contra um projeto Firebase REAL — exige o service account e consentimento explícito
DEV_ADMIN_EMAIL=... DEV_ADMIN_PASSWORD=... pnpm --filter api create-dev-admin --allow-real-project
```

O script cria (ou reaproveita) o usuário no Firebase Auth e grava/promove o documento correspondente na
coleção `user` com `type: "admin"`. A senha vem por argumento ou variável de ambiente e **nunca** é gravada
em arquivo nem impressa pelo script.

É **idempotente e serve para recuperar acesso**: se o e-mail já existir, o script define a senha informada
nessa conta e promove o perfil a admin. Rodar de novo é a forma de voltar a entrar quando a senha se perdeu.

> Prefira a forma com variável de ambiente: o `pnpm` ecoa a linha de comando que executa, então a senha
> passada por argumento aparece no terminal e no histórico do shell.

> ⚠️ **Sem nenhum host de emulador configurado, o script recusa rodar** e explica como prosseguir. Criar um
> administrador com senha conhecida num projeto real é irreversível, então isso exige `--allow-real-project`
> (ou `DEV_ADMIN_ALLOW_REAL_PROJECT=1`) escrito à mão.

## Pendências de higiene (recomendadas)

- **`apps/api/.env.example`** ainda carrega chaves do upstream next-forge que este fork não usa (Clerk, `DATABASE_URL`, BetterStack, Svix, Knock, Liveblocks, BaseHub) — apesar da nota no topo deste documento. Limpar evita que cada fork herde configuração morta.
