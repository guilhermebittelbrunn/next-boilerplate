# Revisão: delivery-infra-hardening

Rodada autônoma do `/cycle`, sobre `388a453`, em 2026-11-23. Nada foi commitado nem pushado, e a branch não
foi criada nem renomeada.

## Branch

| | |
|---|---|
| Atual | `guilhermebittelbrunn/cycle-command-v11`, sem upstream, sem commit à frente de `origin/main`, sem ref remota |
| Regex do `revisor-codigo` | `BRANCH INVALIDA: guilhermebittelbrunn/cycle-command-v11` (o prefixo não é um `project` e falta o `type`) |
| Proposta | `feat/delivery-infra-hardening`. O diff toca dois apps (`app`, `web`) e dois pacotes, então o `project` fica de fora |
| Regex no nome proposto | `branch OK: feat/delivery-infra-hardening` |
| Base | a própria branch atual, que está em `388a453` (= `origin/main`) |

O `/cycle` não mexe em branch antes da aprovação, então só registro o comando. Como a branch não tem commit
de terceiro nem remoto, a regra de `.claude/rules/git-commits.md` manda renomear:

```bash
git branch -m feat/delivery-infra-hardening
```

Se o Conductor depender do nome atual do workspace, a alternativa é criar a branch nova a partir dela, com o
working tree junto: `git switch -c feat/delivery-infra-hardening`.

## Achados

Nenhum bloqueante.

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

| `arquivo:linha` | Problema | Ação |
|---|---|---|
| `.github/workflows/ci.yml:130-134` (job `changes`) | `${{ github.event_name }}` interpolado dentro do `run:`. O valor não vem do autor da PR, mas o job `secrets` novo já passa tudo por `env:` e o arquivo ficava com dois padrões | **Corrigido**: virou `env: EVENT` e o script lê `"$EVENT"` |
| `.github/workflows/ci.yml:80-94` (job `secrets`) | Num push em `main` depois de um force-push, `$BEFORE` pode não existir no clone e o `git log` falha com "bad revision", reprovando o job. A `main` protegida não aceita force-push, então o caso só existe antes do item 9 do `PRE-PRODUCTION.md` | Mantido. Registrado aqui |
| `.github/workflows/ci.yml` (jobs `secrets` e `audit`) | `actions/checkout` com `persist-credentials` no padrão (`true`). Nenhum dos dois jobs sobe artefato, então o token não sai do runner | Mantido. Fora do corte da spec |
| `apps/app/__tests__/securityHeaders.test.ts` (bloco "app proxy matcher") e `apps/web/__tests__/proxyLocale.test.ts:98-118` | O matcher é testado como `RegExp` comum. O Next compila o matcher com path-to-regexp, e o próprio `apps/app/proxy.ts:140-141` avisa que lookahead ancorado não se comporta igual lá | Mantido. A prova real é o servidor, item V3 abaixo |
| `apps/web/proxy.ts:87`, `apps/app/proxy.ts:159` | O 403 do bloqueio de bot responde `{"error":"Um erro inesperado aconteceu"}`, texto em pt-br sem `error.code`. Comportamento anterior à tarefa e igual nos dois proxies; o handoff já registrou | Mantido. Quem recebe é um robô e não há tela |
| `apps/app/proxy.ts:127`, `apps/web/proxy.ts:61` | O matcher antigo `(?!…\|api)` excluía qualquer caminho que começasse com `api`, inclusive `/apis` ou `/api-docs`. Agora só `/api` e `/api/*` respondem cedo, e o resto passa pelo roteamento de idioma (redirect para `/<locale>/…`) | Mantido. É o comportamento certo; nenhuma rota do repo começa com `api` fora de `/api/` |

### ✅ OK

- **Proxies em `/api/*`.** `isApiPath` é a primeira coisa no `proxy()` dos dois apps e devolve
  `applySecurityHeaders(NextResponse.next(), …)`. Lendo `packages/auth/session-routes.ts` e
  `packages/auth/session.ts:166-184`: as rotas de sessão gravam e apagam o cookie com `cookies()` de
  `next/headers` dentro do route handler e respondem com `Response.json`. Nenhuma delas redireciona. O
  proxy não grava cookie nesse caminho (o `cookieStore.set("x-locale")` fica dentro de `route()`), não
  reescreve cabeçalho de requisição e não lê o corpo, então `Origin`/`Host` (usados por
  `isSameOriginRequest`) e o corpo chegam como o navegador mandou. O único cabeçalho que o proxy põe e a rota
  também poderia pôr seria um dos de segurança, e nenhuma rota de sessão faz isso. O que a leitura não fecha
  é a forma como o Next junta os cabeçalhos do `NextResponse.next()` com a resposta do handler, item V3.
- **`ci.yml`.** Os 21 `uses:` estão pinados por SHA com a versão em comentário (`grep -cE 'uses: [^ ]+@[0-9a-f]{40} # v'` → 21 de 21).
  Conferi os 6 SHAs distintos com `gh api repos/<o>/<r>/commits/<sha> --jq .sha`, e todos existem:
  `actions/checkout@3d3c42e5`, `pnpm/action-setup@73e46992`, `actions/setup-node@949feb24`,
  `actions/setup-java@d1374f8a`, `actions/cache@55cc8345`, `actions/upload-artifact@cf430e03`;
  `git/ref/tags/v7.0.1` do checkout aponta para o mesmo commit. O job `secrets` passa todo valor de `github.*`
  por `env:`, confere o SHA-256 do binário antes de extrair (`sha256sum -c -`), usa `fetch-depth: 0` (o
  bastante para `base.sha..head.sha`, porque o head da PR é pai do merge commit) e não tem `${{ }}` dentro
  do `run:`. `permissions: contents: read` continua no topo e nenhum job pede mais. O job `audit` não instala
  nada e respeita `pnpm.auditConfig.ignoreGhsas`, que já tem a justificativa no bloco `"//"` do
  `package.json`. YAML dos dois arquivos carrega (`ruby -ryaml`).
- **`dependabot.yml`.** Chaves válidas (`groups` com `dependency-type` e `update-types`, `patterns`). O
  comentário sobre o cooldown padrão de 3 dias vem da referência de opções do Dependabot lida pelo
  `/analyze` em 2026-11-23 (`analyze/plan.md`, fontes); não reli a página.
- **`apps/web/env.ts` sem `skipValidation`.** Os schemas do `extends` já se validavam sozinhos antes da
  mudança: `email()` e `security()` chamam `createEnv` sem `skipValidation`, com `preprocess` que lê `""`
  como ausente, e `core()` continua com `skipValidation`. Então nenhum modo novo de falhar o build aparece; o
  que muda é que o `extends` passa a entrar no objeto final, e `env.ARCJET_KEY` chega ao proxy. O schema
  `client` da própria `web` é todo `z.string().optional()`, que aceita `""`, e os dois campos que precisam
  ler `""` como ausente (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_DOCS_URL`) já usam `|| undefined` no
  `runtimeEnv`. No cliente, o único consumidor é `app/[locale]/components/header/index.tsx`, que só lê
  `NEXT_PUBLIC_*`, então o proxy do t3-env não tem acesso de servidor para recusar. Isso é leitura; o
  navegador fica para V2.
- **`packages/next-config/brand.ts`.** `toHttpsUrl` aceita `https:` e `http:` só quando `url.hostname` é
  exatamente `localhost`, `127.0.0.1` ou `[::1]` (o WHATWG URL guarda IPv6 com colchetes, então o `Set`
  bate). Nenhum outro uso do nome antigo `toHttpUrl` no repo.
- **`apps/app/next.config.ts`.** Bucket vazio ou só com espaço não gera padrão (`?.trim() || undefined`).
  `images.domains` saiu, e o `www.google.com` que estava lá não tem uso no código (`grep` vazio). O padrão
  `/<bucket>/**` casa com a URL assinada V4 de `signReadUrl` (`apps/api/(shared)/lib/storage.ts:88-110`),
  que é path-style porque não passa `virtualHostedStyle`.
- **`Permissions-Policy`.** Só `packages/security/middleware.ts` define o cabeçalho; nenhum `vercel.json` ou
  `headers()` de `next.config` concorre. Nenhum código usa câmera, geolocalização ou Payment Request
  (`grep` por `getUserMedia`, `geolocation`, `PaymentRequest`, `@stripe/stripe-js` vazio).
- **Shield em `DRY_RUN`.** `packages/security/index.ts:28` e os dois orçamentos. Em `LIVE`, uma recusa do
  shield cai em `reason: "denied"` e sai como `429 AUTH_RATE_LIMITED` por `refuseRateLimit`
  (`apps/api/proxy.ts:163-175`), como o `SECURITY.md` diz.
- **Comentários.** Nenhum comentário novo cita plano, handoff, spec, etapa ou ID (`grep` no diff e nos
  arquivos novos). Os que entraram explicam regra externa ou motivo não óbvio.
- **Docs.** Medi as afirmações baratas dos trechos editados e todas batem: as linhas citadas em
  `SUBPROCESSORS.md` (`packages/security/index.ts:97` e `:134`, `apps/api/proxy.ts:202`,
  `apps/app/proxy.ts:153`, `apps/web/proxy.ts:76`) e em `SECURITY.md` (`index.ts:28`); "seis jobs" no
  `SETUP.md`; o `FORKING.md` dizer que a `web` não envia e-mail (nenhum uso de Resend em `apps/web` fora do
  `env.ts`, o contato vai por `packages/sdk/src/actions/contact`).
- **Segredo.** `gitleaks` 8.30.1 (binário oficial com checksum conferido, numa pasta temporária apagada
  depois): `git diff origin/main | gitleaks stdin` → "no leaks found", e `gitleaks dir` limpo em cada arquivo
  não rastreado. `grep` por `sk_live`, `AIza…`, `BEGIN PRIVATE KEY`, `ajkey_…`, `whsec_` e e-mail real nos
  artefatos: só menções textuais ao formato (a chave de teste do handoff foi gerada em tempo de execução e não
  está escrita) e `qa@example.com`.
- **Corte da spec.** Os sete itens e o shield do plano estão no diff. O desvio de verdade é o do F1 (o
  bloqueio de bot local só decide com `ARCJET_ENV=development`), já documentado em `docs/FORKING.md` §7.3 e no
  item 2.12 de `docs/delivery/02-infra-hardening.md`.

## Correções aplicadas

- `.github/workflows/ci.yml`, job `changes`, passo `scope`: `${{ github.event_name }}` saiu do `run:` e
  entrou como `env: EVENT`; o teste virou `[ "$EVENT" != "pull_request" ]`. Mesmo comportamento.

## Raio de impacto

- `@repo/security/middleware` (`PERMISSIONS_POLICY` exportada; `applySecurityHeaders` grava
  `permissions-policy` em toda resposta): proxies de `apps/api`, `apps/app` e `apps/web`.
- `@repo/security` (`checkRateLimit` com `shield` em `DRY_RUN`): só `apps/api/proxy.ts`. A decisão não muda em
  `DRY_RUN`, mas cada chamada passa a avaliar mais uma regra no Arcjet.
- `@repo/next-config/brand` (`logoUrl` e `getBrandLogoOrigin()` devolvem `null` para `http:` fora de
  loopback): os três apps e `@repo/email`. Um fork que hoje usa logo em `http://` público perde o logo e o
  `img-src` correspondente, de propósito.
- Matcher dos proxies de `app` e `web`: as rotas `/api/auth/*` dos dois apps passam pelo proxy.
- `apps/app/next.config.ts`: o otimizador de imagem recusa Storage de outro bucket, e recusa Storage inteiro
  com `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` vazia. Quem usa `/_next/image` com URL do Storage:
  `UsersListClient.tsx` (foto do usuário, otimizada). `EntitiesListClient.tsx` usa `unoptimized` e não passa
  pelo otimizador.
- Nenhum DTO, action do SDK, rota da API, `error.code` ou chave de i18n mudou.

## Verificar no `/test`

Cada item vem com o veredito sobre o que o handoff listava.

| # | O que medir | Origem | Repro sugerido |
|---|---|---|---|
| V1 | Bloqueio de bot da landing e do painel em servidor de produção (F1/F2) | handoff, continua aberto | `pnpm --filter web build && ARCJET_ENV=development pnpm --filter web start` e, com a `ARCJET_KEY` local, `curl -s -o /dev/null -w '%{http_code}\n' -A 'python-requests/2.31' http://localhost:3001/pt-br` → 403; o mesmo com UA de Chrome → 200. Repetir no `app` (`:3000/pt-br/sign-in`) |
| V2 | A landing hidrata no navegador com o `env` validado (o t3-env no cliente vira Proxy e recusa acesso a variável de servidor) | novo, desta revisão | `agent-browser` em `http://localhost:3001/pt-br` com `NEXT_PUBLIC_APP_URL` preenchida e depois vazia: console sem "Attempted to access a server-side environment variable" nem "Invalid environment variables"; o CTA do header aponta para `NEXT_PUBLIC_APP_URL` |
| V3 | Rotas de sessão do `app` em servidor: cabeçalhos de segurança somados à resposta do handler, `Set-Cookie` preservado (F5) | handoff, continua aberto; a leitura fechou só o lado do proxy | `pnpm --filter app build && pnpm --filter app start`; `curl -si -X POST -H 'Origin: http://localhost:3000' -H 'Content-Type: application/json' -d '{}' http://localhost:3000/api/auth/session` → 400 `AUTH_MISSING_TOKEN` com `permissions-policy`, HSTS, CSP, sem `location`. Depois, com um ID token válido do emulador no corpo, o 200 tem de trazer `set-cookie: access-token=…` **e** `permissions-policy`. Repetir `DELETE /api/auth/session` (cookie expirado no `set-cookie`), `POST /api/auth/session/refresh` e `POST /api/auth/custom-token` |
| V4 | Login, logout e SSO web↔app com o proxy nas rotas de sessão (F6) | handoff, continua aberto | `pnpm e2e` (cobre cadastro, login e troca de painel) e uma passada com `agent-browser`: entrar na `web`, abrir o `app`, sair |
| V5 | Cabeçalhos nos três apps em `build && start` (F4) | handoff, continua aberto (só a `web` foi medida) | `curl -sI http://localhost:3000/pt-br/sign-in` e `curl -sI http://localhost:3002/health`: `permissions-policy` com os 8 recursos desligados |
| V6 | Build do `app` com e sem bucket, e a foto da lista de usuários pelo otimizador | handoff, continua aberto; o raio de impacto acrescentou a lista | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET= pnpm --filter app build` e com o valor do `.env`: os dois saem 0. Com o bucket, abrir `/pt-br/admin/users` com um usuário que tenha foto no Storage e conferir que `/_next/image?url=…storage.googleapis.com/<bucket>/…` responde 200; uma URL de outro bucket responde 400 |
| V7 | Logo `http://cdn.example.com/logo.png` some do build da `web` e do `img-src` (F11) | handoff, continua aberto no nível de build (a função está coberta pelo T6) | `NEXT_PUBLIC_APP_LOGO_URL=http://cdn.example.com/logo.png pnpm --filter web build && … start`; `curl -sI :3001/pt-br` sem `cdn.example.com` na CSP, e a página com o ícone genérico |
| V8 | Job `secrets` reprovando PR no runner, job `audit` no runner, Dependabot abrindo PR e cobrindo os workspaces (Q7), Googlebot verdadeiro passando | handoff, 🔒 continua aberto | Fora do alcance local. Prova equivalente: §12.1 do `analyze/plan.md`, com `curl` no lugar de `gh release download` (desvio 2 do handoff) |

## Lacunas de teste

- Shield em `DRY_RUN` provado só pela configuração passada ao Arcjet (mock): **fora de escopo**. Que o
  provedor não recuse em `DRY_RUN` é comportamento dele.
- Job `secrets` provado pelo mesmo script rodado localmente: **continua aberto**, item V8.
- Corpo do 403 do bloqueio de bot sem teste: **continua aberto**, e é o nit da tabela acima. Não vale teste
  enquanto o corpo não for decidido.
- Matcher testado como `RegExp` comum, não como o Next compila: **continua aberto**, coberto na prática por V3
  e V5.

## Decisões em aberto

1. **Branch.** Renomear para `feat/delivery-infra-hardening` antes do primeiro commit (comando acima).
   Recomendação: `git branch -m`, que é o que a regra pede para branch sem remoto.
2. **`ci.yml` num commit só.** O plano separava "pinar actions" de "jobs novos", o que exige `git add -p` no
   mesmo arquivo. Recomendação: um commit misto, com o motivo na mensagem (a política do `/cycle` aceita).
3. **`docs/PRE-PRODUCTION.md`.** O `STATE.md` e o plano dizem que o arquivo já tinha um hunk da auditoria do
   backlog. Os três hunks que estão no working tree (itens 8, 9 e 17) correspondem a §10.8 do plano, e não
   achei um quarto. Recomendação: o arquivo inteiro no commit de documentação da feature.

## Gates

| Gate | Comando | Resultado |
|---|---|---|
| Lint | `pnpm turbo run lint` (`//#lint`, Biome) | saída 0, 1080 arquivos, sem correção (cache miss, rodou) |
| Typecheck | `pnpm turbo run lint typecheck --filter=web --filter=app --filter=@repo/security --filter=@repo/next-config` | 4/4, **cache hit** ("FULL TURBO"): os arquivos são os mesmos da medição do handoff |
| Typecheck `api` | não rodei | a correção desta revisão foi só em YAML; vale o número do handoff (sem erro) |
| Paridade de i18n | não se aplica | nenhuma chave nova |
| YAML | `ruby -ryaml` nos dois arquivos de `.github/` | ok; jobs `verify,secrets,audit,changes,e2e,coverage`; `changes.steps[1].env.EVENT` presente |

## Plano de commits

Antes do primeiro: `git diff --cached --stat` vazio (conferido nesta revisão) e a branch renomeada. Depois de
cada commit, `git show --stat --oneline HEAD` contra a lista.

| # | Mensagem | Arquivos |
|---|---|---|
| 1 | `feat(security): send a restrictive Permissions-Policy on every response` | `packages/security/middleware.ts`, `packages/security/__tests__/csp.test.ts` |
| 2 | `feat(security): run the Arcjet shield in dry run on the API limiter` | `packages/security/index.ts`, `packages/security/__tests__/rateLimit.test.ts` |
| 3 | `fix(next-config): accept a plain http logo only on loopback hosts` | `packages/next-config/brand.ts`, `packages/next-config/__tests__/brand.test.ts` |
| 4 | `fix(web): let the Arcjet key reach the proxy` | `apps/web/env.ts`, `apps/web/__tests__/webEnvArcjet.test.ts`, `apps/web/__tests__/proxyBotProtection.test.ts` |
| 5 | `feat(web): send the security headers on the session routes` | `apps/web/proxy.ts`, `apps/web/__tests__/securityHeaders.test.ts`, `apps/web/__tests__/proxyLocale.test.ts` |
| 6 | `feat(app): send the security headers on the session routes` | `apps/app/proxy.ts`, `apps/app/__tests__/securityHeaders.test.ts` |
| 7 | `fix(app): limit the image optimizer to the product bucket` | `apps/app/next.config.ts`, `apps/app/__tests__/nextConfigImages.test.ts` |
| 8 | `ci: pin actions by SHA, scan new commits for secrets and audit prod deps` | `.github/workflows/ci.yml` |
| 9 | `ci: add Dependabot for npm and GitHub Actions` | `.github/dependabot.yml` |
| 10 | `chore: ignore every env variant and service account keys` | `.gitignore` |
| 11 | `docs: firebase key restrictions, new CI jobs, headers and bot protection` | `docs/ARCHITECTURE.md`, `docs/FORKING.md`, `docs/PRE-PRODUCTION.md`, `docs/SECURITY.md`, `docs/SETUP.md`, `docs/SUBPROCESSORS.md`, `docs/delivery/02-infra-hardening.md` |
| 12 | `docs(specs): audit the backlog against 388a453` | `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/admin-own-account.md`, `specs/delivery-infra-hardening.md`, `specs/delivery-product-quality.md`, `specs/delivery-security-review.md`, `specs/observability-logging.md`, `specs/one-time-purchase.md`, `specs/social-sign-in-providers.md` |
| 13 | `docs(features): delivery-infra-hardening` | `docs/features/delivery-infra-hardening/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`, `review/review.md`) |

Corpo do commit 8: "Single commit for the workflow file: splitting the SHA pins from the new jobs would need a
partial add of the same file." Título de PR sugerido: `feat: core hardening for delivery part 2 (infra)`.
Depois do último commit aprovado, perguntar se faz `git push -u origin feat/delivery-infra-hardening`.

### Commits realizados

(preenchido pelo orquestrador)
