# Handoff do `/develop`: delivery-infra-hardening

Rodada autônoma do `/cycle`, sobre `388a453`, em 2026-11-23. Nada foi commitado. As mudanças em `specs/`
que já estavam no working tree são da auditoria do backlog e não foram tocadas.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| 10.1 Chave do Arcjet chega ao proxy da landing | `apps/web/env.ts` (sem `skipValidation`, comentários reescritos); testes novos `apps/web/__tests__/webEnvArcjet.test.ts` (T1) e `apps/web/__tests__/proxyBotProtection.test.ts` (T2) |
| 10.2 Varredura de segredo | `.github/workflows/ci.yml` (job `secrets`); `.gitignore` (`.env*`, `!.env.example`, `*-firebase-adminsdk-*.json`) |
| 10.3 Actions por SHA | `.github/workflows/ci.yml` (os 17 `uses:` que existiam; os 4 dos jobs novos já nascem pinados, 21 no total) |
| 10.4 Dependabot e audit | `.github/dependabot.yml` (novo); `.github/workflows/ci.yml` (job `audit`) |
| 10.5 Cabeçalhos | `packages/security/middleware.ts` (`PERMISSIONS_POLICY` exportada, aplicada em `applySecurityHeaders`); `apps/app/proxy.ts` e `apps/web/proxy.ts` (matcher sem `api`, `isApiPath` com resposta cedo); testes `packages/security/__tests__/csp.test.ts` (T3), `apps/web/__tests__/securityHeaders.test.ts` e `apps/app/__tests__/securityHeaders.test.ts` (T4 e o matcher do app, T5), `apps/web/__tests__/proxyLocale.test.ts` (T5 da web) |
| 10.6 Logo e `remotePatterns` | `packages/next-config/brand.ts` (`toHttpsUrl`, `http:` só em loopback) + `packages/next-config/__tests__/brand.test.ts` (T6); `apps/app/next.config.ts` (sem `images.domains`, Storage só em `/<bucket>/**`) + `apps/app/__tests__/nextConfigImages.test.ts` (T7, novo) |
| 10.7 Shield da API em `DRY_RUN` | `packages/security/index.ts` (`API_SHIELD_MODE`) + `packages/security/__tests__/rateLimit.test.ts` (T8) |
| 10.8 Documentação | `docs/FORKING.md`, `docs/SETUP.md`, `docs/SECURITY.md`, `docs/PRE-PRODUCTION.md` (itens 8 e 9 ampliados, item 17 novo), `docs/SUBPROCESSORS.md`, `docs/delivery/02-infra-hardening.md` (2.7, 2.12, 2.20), `docs/ARCHITECTURE.md` (fora do plano, ver desvios) |

## Contrato

Nenhum DTO, action do SDK, rota da API ou `error.code` mudou. O que muda para quem consome:

- `@repo/security/middleware` exporta `PERMISSIONS_POLICY` e `applySecurityHeaders` passa a gravar
  `permissions-policy` em toda resposta. Chamam a função os proxies de `apps/api`, `apps/app` e `apps/web`.
- `@repo/security` (`checkRateLimit`) monta `shield({ mode: "DRY_RUN" })` antes do `slidingWindow` nos dois
  orçamentos. Só a `apps/api/proxy.ts` chama. Em `DRY_RUN` a decisão não muda.
- `@repo/next-config/brand`: `getBrand().logoUrl` e `getBrandLogoOrigin()` passam a devolver `null` para
  `http:` fora de `localhost`, `127.0.0.1` e `[::1]`. Consumidores: os três apps e `@repo/email`.

## Códigos de erro novos

Nenhum. Sem chave nova de i18n.

## Desvios do plano

1. **O F1 do plano não funciona como escrito.** Com a chave do `apps/web/.env` e `next start` local,
   `curl -A 'python-requests/2.31' http://localhost:3001/pt-br` devolveu **200**, não 403. O log do servidor
   mostra o motivo: `Client IP address is missing. If this is a dev environment set the ARCJET_ENV env var to
   "development"` seguido de `Failed to build fingerprint`. Sem IP, o Arcjet devolve decisão de erro e o
   `secure()` deixa passar. Subindo o mesmo build com `ARCJET_ENV=development`, o mesmo `curl` devolveu
   **403**. O `/test` precisa subir a `web` com `ARCJET_ENV=development` em F1 e F2. Documentei isso em
   `docs/FORKING.md` §7.3 e em `docs/delivery/02-infra-hardening.md` item 2.12. Na Vercel o IP chega pelos
   cabeçalhos do proxy dela, então a nota vale só para execução local.
2. **`gh release download` devolveu 401** para os assets do Gitleaks (o `gh api` funcionou). Baixei os
   mesmos arquivos com `curl -sSfL` da URL pública do release e conferi com o checksums oficial. O roteiro do
   §12.1 do plano deve usar `curl` no lugar de `gh release download`.
3. **`docs/ARCHITECTURE.md:104` editado**, fora da lista do plano. A frase dizia que `/api/*` fica fora do
   `matcher` do proxy, o que deixou de ser verdade. Continua verdade que o proxy não mexe no header de
   idioma dessas rotas, e a frase nova diz isso.
4. **Docs com afirmação falsa corrigida de passagem**: `docs/SETUP.md` dizia "Três consequências" antes de
   uma lista de cinco; `docs/SUBPROCESSORS.md:40` citava `apps/api/proxy.ts:177`, mas a chamada de
   `checkRateLimit` está na linha 202 (deriva anterior a esta tarefa); `docs/PRE-PRODUCTION.md` item 9 ainda
   dizia "exigindo os checks `verify` e `e2e`" no parágrafo de baixo.
5. `docs/FORKING.md` §4: o passo novo de restringir as chaves entrou como passo 8, e "Publique rules e
   índices" virou o passo 9. Conferi as referências externas a passos do §4 (`grep` em `docs/`, `specs/` e
   `.claude/`): só citam os passos 1, 3, 4 e 5. O passo 2 dizia que a proteção da chave pública "está nas
   rules e na API"; agora cita também a restrição da chave.
6. Pequenas escolhas que o plano deixava em aberto: a função do `brand.ts` virou `toHttpsUrl`; o comentário do
   job `secrets` usa "a key flagged by secret scanning" (a variante que o plano sugeria, porque o alerta #1
   ainda está aberto); o T6 descarta também `http://localhost.example.com` e `http://127.0.0.2`, para provar
   que a lista de loopback é por igualdade de host.
7. O cálculo do intervalo no job `secrets` ficou igual ao plano (`base.sha..head.sha`). Avaliei trocar por
   `HEAD^1..HEAD^2` do merge commit, que dispensa os valores do evento, e mantive o plano porque ele não está
   errado e o `fetch-depth: 0` traz os dois SHAs.

## Decisões em aberto e pendências

- O 403 do bloqueio de bot na landing responde `{"error":"Um erro inesperado aconteceu"}` (medido no smoke
  com `ARCJET_ENV=development`). É o que `handleClientError` devolve para um `Error` sem código, e o proxy do
  painel faz o mesmo. Não mudei: quem recebe é um robô, e não há tela. Fica como achado se alguém quiser um
  corpo `{ error: { code } }` no padrão da API.
- Q7 (Dependabot com `directory: /` cobre os workspaces do pnpm?) segue não verificável fora do GitHub.
- Pré-requisitos de console P1 a P9 do plano (§11) continuam com o dono do repositório e com cada fork. O
  item 17 do `PRE-PRODUCTION.md` e as linhas novas dos itens 8 e 9 registram a parte de fork.

## Validação (o que foi medido, com o comando)

| O quê | Comando | Resultado |
|-------|---------|-----------|
| SHAs das actions | script `bash` com `gh api repos/<repo>/git/ref/tags/<tag>`, seguindo `git/tags/<sha>` enquanto `object.type == tag`, depois `gh api repos/<repo>/commits/<sha> --jq .sha` | 12 tags (6 móveis e 6 exatas) resolvem nos mesmos 6 commits do plano. `pnpm/action-setup` `v6` e `v6.1.1` são tags anotadas (`f53f5227…` e `9bbca1e9…`), ambas dereferenciadas até `73e46992…`. Nenhuma tag andou desde a análise |
| SHAs gravados no `ci.yml` | `grep -oE 'uses: [^ ]+@[0-9a-f]{40}' .github/workflows/ci.yml` + `gh api repos/<repo>/commits/<sha>` | 6 SHAs distintos, todos `OK`; `grep -cE 'uses: [^ ]+@v[0-9]'` → 0 |
| Release do Gitleaks | `gh api repos/gitleaks/gitleaks/releases/latest` | `v8.30.1`, publicada em 2026-03-21 |
| Checksum do binário | `curl` do `gitleaks_8.30.1_checksums.txt` e dos `.tar.gz` em `mktemp -d`, `shasum -a 256 -c -` | `linux_x64.tar.gz: OK` com `551f6fc8…2470eb` (igual ao fixado no workflow); `darwin_arm64.tar.gz: OK`. O `.tar.gz` do Linux traz `gitleaks` na raiz (`tar -tzf`) |
| Gitleaks reprova segredo | repo descartável em `mktemp -d`, chave no formato `sk_live_` montada com `/dev/urandom` em tempo de execução | `-1`: saída 1; o mesmo bloco `run:` do job com `EVENT=pull_request`: saída 1; push com `BEFORE` zerado: saída 1; `before..sha`: saída 1; intervalo vazio: saída 0. Repo apagado depois |
| `gitleaks:allow` | mesmo método, linha com o comentário | saída 0 |
| Branch limpa | `gitleaks git --log-opts="origin/main..HEAD"`; `git diff origin/main \| gitleaks stdin`; `gitleaks dir` em cada arquivo não rastreado | 0, 0 e nenhum achado. A branch não tem commit à frente de `origin/main`, então só o diff do working tree conta |
| `pnpm audit` | `pnpm audit --prod --audit-level=high` / `--audit-level=moderate` | saída 0 / saída 1 (12 achados, 1 alto ignorado pela exceção do `@grpc/grpc-js`) |
| YAML | `ruby -ryaml -e 'YAML.load_file(...)'` nos dois arquivos | ok; jobs: `verify,secrets,audit,changes,e2e,coverage` |
| `.gitignore` | `git check-ignore -v apps/api/.env.production apps/web/.env.development apps/app/.env x-firebase-adminsdk-ab12c.json apps/api/my-proj-firebase-adminsdk-fbsvc-123.json` | os cinco ignorados (saída 0); `git check-ignore` nos três `.env.example` → saída 1 |
| `.gitignore` não esconde arquivo rastreado novo | `git ls-files -ci --exclude-standard` | só os screenshots de `docs/features/**` que já eram ignorados antes |
| nosecone não emite o cabeçalho | `grep -ril permissions-policy node_modules/.pnpm/nosecone@*/node_modules/nosecone/` | nenhuma ocorrência |
| Testes | `pnpm turbo run test typecheck --filter=web --filter=app --filter=@repo/security --filter=@repo/next-config --filter=api` | 18/18 tasks. `@repo/security` 61, `@repo/next-config` 38, `web` 238 (28 arquivos), `app` 1222 (137 arquivos), `api` 1719 (126 arquivos) |
| T1 e T2 falham sem a correção | `apps/web/env.ts` de `HEAD` no lugar, `pnpm vitest run` nos dois arquivos, arquivo novo restaurado | 3 falham, 11 passam: "hands the configured key to the proxy", "checks the visitor…", "refuses an automated client with 403…" |
| Typecheck | mesma linha acima | `web`, `app`, `api`, `@repo/security`, `@repo/next-config` sem erro |
| Lint | `pnpm check` | saída 0, 1080 arquivos |
| Build degradado da web | `ARCJET_KEY="" pnpm exec next build` em `apps/web` | saída 0 |
| Smoke da web sem chave | `ARCJET_KEY="" next start -p 3001`, `curl` | `python-requests` em `/pt-br` → 200 com `permissions-policy`, CSP `Report-Only` e HSTS; `POST /api/auth/session` com `{}` → 400 com `permissions-policy`, `x-content-type-options`, HSTS e CSP, sem `location` e sem `set-cookie` |
| Smoke da web com a chave local | `next start -p 3001` lendo `apps/web/.env`, com e sem `ARCJET_ENV=development` | sem: `python-requests` → 200 (Arcjet sem IP). Com: `python-requests` → 403 com `permissions-policy` e `nosniff`; Chrome → 200; `POST /api/auth/session` com `python-requests` → 400 (o Arcjet não é consultado em `/api/*`) |

A porta 3001 estava livre antes de cada subida; matei os processos que subi e conferi com `lsof -ti tcp:3001`
(vazio). O valor da `ARCJET_KEY` não foi impresso: conferi só o prefixo com `grep -c`.

## A verificar no `/test`

- F1/F2 com `ARCJET_ENV=development`, agora como evidência do `/test` (o smoke acima foi só para me
  desbloquear).
- F4 nos três apps, em `build && start`: `curl -sI` no `app` (`/pt-br/sign-in`) e na `api` (`/health`). Só
  medi a `web`.
- F5 no `app` (`:3000`): `POST`, `DELETE` em `/api/auth/session`, `POST /api/auth/session/refresh`,
  `POST /api/auth/custom-token`. Coberto por teste unitário com proxy real e `NextResponse`, não medido em
  servidor.
- F6 e `pnpm e2e`: login, logout e SSO com o proxy rodando nas rotas de sessão. Sem medição minha. O risco é
  o `Set-Cookie` da rota de sessão e o corpo do `POST` atravessarem o proxy; o `next start` da web devolveu o
  400 da rota com o corpo `{}`, então o corpo chega, mas o caminho com cookie gravado não foi exercido.
- Build do `app` com e sem `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`. O T7 importa o `next.config.ts` real, mas
  não houve `next build` do app.
- F11: logo `http://cdn.example.com/logo.png` no build da `web` some e não entra no `img-src`. Coberto por
  T6 no nível da função, não no build.
- Fora do alcance local (🔒): job `secrets` reprovando PR no GitHub, job `audit` no runner, Dependabot
  abrindo PR e cobrindo os workspaces (Q7), Googlebot verdadeiro passando pela lista de permissão.

## Lacunas de teste conhecidas

- O shield em `DRY_RUN` é provado pela configuração passada ao Arcjet (mock). Que o Arcjet realmente não
  recusa em `DRY_RUN` é comportamento do provedor, sem teste aqui.
- O job `secrets` é provado pelo mesmo script rodado localmente, não pelo runner do GitHub.
- Nenhum teste cobre o corpo do 403 do bloqueio de bot além do status e dos cabeçalhos.
