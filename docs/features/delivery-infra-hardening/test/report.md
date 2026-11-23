# Relatório do `/test`: delivery-infra-hardening

Rodada autônoma do `/cycle`, em 2026-11-23, sobre `388a453` com o working tree da feature. Branch
`guilhermebittelbrunn/cycle-command-v11` (nome inválido; a renomeação proposta pelo `/review` ainda não foi
feita). Nada foi commitado, nenhuma branch foi criada.

Resultado: nenhum defeito de produção. 12 critérios verificados, 0 reprovados, 3 não verificáveis fora do
GitHub. Os oito itens de "Verificar no `/test`" foram medidos; V8 continua 🔒 com a prova local registrada.

## Verificar no `/test`

| # | Veredito | O que foi medido |
|---|---|---|
| V1 | confirmado | `web` em `next start` com a chave do `apps/web/.env`. Sem `ARCJET_ENV`: `python-requests` 200 e Chrome 200, com três linhas "Client IP address is missing" e "Failed to build fingerprint" no log, como o handoff disse. Com `ARCJET_ENV=development`: `python-requests` 403, `curl/8.7.1` 403, `HeadlessChrome/149` 403, Chrome 131 200, Googlebot falsificado 200. O 403 traz `permissions-policy`, HSTS, `nosniff`, `referrer-policy` e CSP `Report-Only`, com corpo `{"error":"Um erro inesperado aconteceu"}`. `app` em `next start` com a mesma chave passada por variável de ambiente (o `apps/app/.env` não tem chave) e `ARCJET_ENV=development`: `/pt-br/sign-in` com `python-requests` 403, `curl` 403, Chrome 200; o 403 traz CSP, `permissions-policy`, HSTS, `nosniff` e `referrer-policy`. Sem chave (`ARCJET_KEY=""`): `python-requests` e `curl` 200 na landing, nenhuma linha do Arcjet no log |
| V2 | confirmado | Build da `web` com `NEXT_PUBLIC_APP_URL` preenchida: os CTAs "Cadastrar" do hero e do rodapé apontam para `http://localhost:3000`; depois do login o header mostra "Ir para o painel", que leva a `http://localhost:3000/pt-br`. Build com a variável vazia: os três "Cadastrar" apontam para `/pt-br/sign-up`. Nos dois, `agent-browser console` e `errors` vazios, e o menu "Alternar tema" abre com "Claro / Escuro / Sistema" (a página hidratou) |
| V3 | confirmado | `app` e `web` em `next start` apontando para o emulador. Com ID token do emulador: `POST /api/auth/session` 200, `set-cookie: access-token=…; Max-Age=432000; Secure; HttpOnly; SameSite=lax`, e na mesma resposta CSP (`Report-Only` na `web`), COOP, CORP, `permissions-policy`, `referrer-policy`, HSTS, `nosniff` e `x-frame-options`, sem `location`. `POST /api/auth/session/refresh` 200 `{"refreshed":false}`; `POST /api/auth/custom-token` 200 com token; `DELETE /api/auth/session` 200 com `access-token=; Max-Age=0`. Todas com `permissions-policy`. Sem token: `POST` de session e de refresh 400 `AUTH_MISSING_TOKEN`, custom-token 401 `AUTH_NO_SESSION`, todas com os cinco cabeçalhos e sem `location` nem `x-locale`. Com a chave do Arcjet ativa, `python-requests` nessas rotas recebe a resposta da rota (400/401/200), não 403 |
| V4 | confirmado | `pnpm e2e`: 29 de 29 (2,1 min), incluindo cadastro, login comum e admin, senha errada, deep link, troca de painel e o CTA da landing. No log, `POST /api/auth/session` 200 (24 vezes), `refresh` 200 (32) e 401 (8), `custom-token` 200 e 401 na `web`. A suíte não faz `DELETE /api/auth/session`; o logout veio da passada de browser (abaixo) |
| V5 | confirmado | `curl -sI` em `next start`: `web` `/pt-br` 200, `/` 307 e o 403 do Arcjet; `app` `/pt-br/sign-in` 200 e 403; `api` `/health` 200, `POST /entities` sem sessão 401 `AUTH_INVALID_TOKEN`, preflight `OPTIONS` 204. Todas com `permissions-policy: accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()` |
| V6 | confirmado, com uma parte 🔒 | `pnpm --filter app build` com o bucket do `.env`: saída 0. Build com `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=""` (ambiente do emulador): saída 0. Com o bucket, `/_next/image` responde 404 "upstream response is invalid" para `storage.googleapis.com/<bucket>/…` inexistente, também com a query de URL assinada (`X-Goog-Algorithm`, `X-Goog-Signature`), o que prova que o padrão deixou passar; 400 `"url" parameter is not allowed` para `outro-bucket-qa`, para `<bucket>-evil` e para `www.google.com`; 200 para `lh3.googleusercontent.com`. A foto real pelo otimizador com 200 ficou 🔒: o seed do emulador não tem usuário com foto, e não li objeto do bucket real |
| V7 | confirmado | Build da `web` com `NEXT_PUBLIC_APP_LOGO_URL=http://cdn.example.com/logo.png`: saída 0; `/pt-br` 200; `img-src 'self' data: blob:` sem `cdn.example.com`; nenhuma ocorrência no HTML; o header mostra o triângulo genérico e não tem `<img>`. Controle positivo com `http://localhost:3001/showcase/showcase.jpg`: o logo carrega (`naturalWidth > 0`) e `img-src` ganha `http://localhost:3001` |
| V8 | 🔒, prova local registrada | Gitleaks 8.30.1 baixado com `curl` para `mktemp -d`; `shasum -a 256 -c` OK para `darwin_arm64` e `linux_x64` (o SHA do Linux começa com `551f6fc83ea4`, igual ao fixado no `ci.yml`). Repo descartável com chave `sk_live_` aleatória gerada em tempo de execução, rodando o mesmo bloco `run:` do job: PR com o commit do segredo, saída 1; PR só com commit limpo, saída 0; push com `BEFORE` zerado, saída 1; `before..sha` cobrindo o segredo, saída 1; push só do commit limpo, saída 0. `git diff origin/main \| gitleaks stdin` saída 0, e os arquivos não rastreados sem achado. As duas pastas foram apagadas. `pnpm audit --prod --audit-level=high` saída 0, `--audit-level=moderate` saída 1. Os dois YAML carregam (`ruby -ryaml`); jobs `verify,secrets,audit,changes,e2e,coverage`; Dependabot `npm:/` e `github-actions:/`, semanais. Job reprovando PR no runner, Dependabot abrindo PR e Googlebot verdadeiro passando só o GitHub e a produção provam |

## Testes

| Comando | Resultado |
|---|---|
| `pnpm turbo run test --filter=web --filter=app --filter=@repo/security --filter=@repo/next-config --filter=api` | 13/13 tasks, todas em cache (mesmos arquivos da medição do handoff). `@repo/security` 61, `@repo/next-config` 38, `web` 238 (28 arquivos), `app` 1222 (137), `api` 1719 (126) |
| `pnpm test` (raiz, `JAVA_HOME` no `openjdk@21`) | saída 0; 15/15 tasks, 14 em cache; `api:test:emulator` rodou: 274 testes em 8 arquivos |
| `pnpm e2e` (`JAVA_HOME` no `openjdk@21`) | 29 passed (2,1 min), saída 0 |

Paridade de i18n: não se aplica (nenhuma chave nova). Lint e typecheck: não remedidos, porque o diff de
código não mudou desde o `/review` (1080 arquivos no lint, typecheck dos quatro workspaces sem erro). A única
edição deste `/test` foi em `docs/SUBPROCESSORS.md`. Sem `--force`: não houve motivo para desconfiar do
cache. Os testes instáveis conhecidos (`actionMenu`, `signInEmailLinkEntry`) não caíram.

### Testes criados

Nenhum. O que a feature mudou já tem teste no nível barato (T1 a T8 do plano: `webEnvArcjet`,
`proxyBotProtection`, `securityHeaders` de `app` e `web`, `proxyLocale`, `csp`, `brand`, `nextConfigImages`,
`rateLimit`). O que faltava era comportamento de servidor, e ele foi medido em `next start`.

### Decisões de custo de teste

| Módulo tocado | Decisão |
|---|---|
| `apps/web/env.ts` | O unitário com o `@/env` real já cobre chave presente, ausente, vazia, só espaço e sem prefixo |
| `apps/web/proxy.ts`, `apps/app/proxy.ts` | Unitários com `NextResponse` real cobrem `/api/*` e o 403. O matcher compilado pelo Next foi medido em servidor (V3, V5, `/apis`). Um teste com o compilador interno do Next dependeria de API não pública |
| `packages/security/middleware.ts`, `index.ts` | Unitários cobrem o valor do cabeçalho e o `shield` em `DRY_RUN` |
| `packages/next-config/brand.ts` | T6 cobre os hosts de loopback por igualdade; o build foi medido em V7 |
| `apps/app/next.config.ts` | T7 importa o arquivo real; os builds com e sem bucket e o otimizador foram medidos em V6 |
| `.github/*`, `.gitignore` | Não cabem em Vitest; prova local em V8 e `git check-ignore` |

Nenhum teste da faixa cara (emulador ou app de pé) foi criado.

## Critérios de aceite

Texto completo em `criterios-aceite.md`.

| # | Critério | Status | Meio |
|---|---|---|---|
| 1 | A chave do Arcjet chega ao proxy da landing | ✅ | unit (T1) + servidor (403 com chave, 200 sem) |
| 2 | A landing recusa cliente automatizado e deixa passar navegador | ✅ | servidor, `curl` com cinco user agents |
| 3 | A landing sobe e funciona sem a chave | ✅ | build do ambiente do emulador (chave vazia) + servidor |
| 4 | A landing hidrata no navegador com o `env` validado | ✅ | `agent-browser`, dois builds |
| 5 | Permissions-Policy nos três apps | ✅ | servidor, `curl -sI` |
| 6 | Cabeçalhos nas rotas de sessão das front-ends | ✅ | servidor, `curl` com ID token do emulador |
| 7 | Login, logout e SSO continuam funcionando | ✅ | `pnpm e2e` + `agent-browser` |
| 8 | Logo da marca só em HTTPS fora de loopback | ✅ | unit (T6) + build + `agent-browser` |
| 9 | Otimizador de imagem restrito ao bucket do produto | ✅ | build com e sem bucket + `curl` em `/_next/image` |
| 10 | Segredo no diff reprova o CI | 🔒 | prova local (V8) |
| 11 | Dependência vulnerável de produção reprova o CI | 🔒 | `pnpm audit` local |
| 12 | Actions pinadas por SHA | ✅ | `grep` + `gh api` nos 6 SHAs e na tag anotada |
| 13 | Dependabot configurado | 🔒 | YAML local |
| 14 | `.gitignore` cobre variantes de `.env` e a service account | ✅ | `git check-ignore` |
| 15 | Documentação sem afirmação falsa | ✅ | leitura e medição, com correção em `SUBPROCESSORS.md` |

Contagem: 12 ✅, 0 ❌, 3 🔒.

## Passada de browser

Uma execução com `agent-browser`, comandos em sequência, contra `app` e `web` em `next start` e a `api` em
`next dev`, todos apontando para o emulador com o seed. Contas usadas: `user@example.com` e
`admin@example.com` do seed do emulador (a senha do seed é pública e fica em
`apps/e2e/support/seedAccounts.ts`).

- Landing em `pt-br`, `en` e `es`: títulos "Início", "Home" e "Inicio", com o mesmo `h1`, console sem erro.
- Tema: em `light`, fundo claro; em `dark`, `html.dark`, fundo `lab(2.75 0 0)` e `h1` em `lab(98.26 0 0)`.
  Mobile de 390 px em dark: sem rolagem horizontal, header com "Cadastrar" e o botão de menu.
- Login na `web` com senha errada: "Senha incorreta.", e a URL continua em `/pt-br/sign-in`. Com a senha
  certa, volta para `/pt-br` com "Ir para o painel" e "Sair" no header e o cookie `access-token` gravado.
- "Ir para o painel" abre `http://localhost:3000/pt-br` autenticado: `h1` "Olá", resumo com 4 entidades.
- Sair no app (menu do usuário, "Sair"): URL `/pt-br/sign-in?redirect=%2Fpt-br`, sem `access-token`.
  `/pt-br/entities` sem sessão redireciona para `sign-in?redirect=%2Fpt-br%2Fentities`.
- De volta à `web`: `refresh` 401 (duas vezes) e `session` 401 (duas vezes), e a landing manda para
  `/pt-br/sign-in?redirect=%2Fpt-br`. O logout de um app chegou ao outro na carga seguinte.
- `sign-in` do `app` em `pt-br`, `en` e `es`: "Entrar", "Sign In", "Iniciar sesión". Em `es`, dark e 390 px,
  sem rolagem horizontal. Login de admin em `es` leva a `/es/admin`; `/es/admin/users` mostra o `h1`
  "Usuarios" e 4 linhas, sem rolagem horizontal. `/en/admin` em light mostra o `h1` "Hello"; "Sign out" leva
  a `/en/sign-in?redirect=%2Fen` e apaga o cookie.

Screenshots em `test/e2e/01` a `14`. O `.gitignore` descarta a pasta, então o texto acima é a evidência.
Nenhum print mostra dado de pessoa real, só as contas `@example.com` do seed.

## Lacunas herdadas

| Lacuna (de `review.md` e `handoff.md`) | Veredito |
|---|---|
| Shield em `DRY_RUN` provado só pela configuração passada ao Arcjet | fora de escopo: que o provedor não recuse em `DRY_RUN` é comportamento dele |
| Job `secrets` provado pelo script local, não pelo runner | continua aberta (🔒, V8); a prova local foi refeita aqui com cinco cenários |
| Corpo do 403 do bloqueio de bot sem teste | continua aberta. O corpo medido é `{"error":"Um erro inesperado aconteceu"}`, em pt-br e sem `error.code`. Não vale teste enquanto ninguém decidir o corpo |
| Matcher testado como `RegExp`, não como o Next compila | fechada aqui por medição: em `next start`, `/api/auth/*` passa pelo proxy (cabeçalhos presentes, sem redirect), e `/apis` e `/api-docs` levam 307 para `/pt-br/…` |
| F4 medido só na `web` | fechada aqui (V5) |
| F5 e F6 sem medição em servidor | fechadas aqui (V3, V4) |
| Build do app com e sem bucket | fechada aqui (V6) |
| F11 só no nível da função | fechada aqui (V7) |
| Q7 (Dependabot cobre os workspaces) e Googlebot verdadeiro | continuam abertas (🔒) |

## Observações

Nenhuma destas é defeito desta feature.

- Sem `NEXT_PUBLIC_API_URL` na `web`, o logout feito no app não chega à landing. A primeira passada usou o
  ambiente do e2e, em que a `web` não recebe essa variável, e a landing regravou o cookie com `refresh` 200
  depois do logout. É o comportamento descrito em `packages/auth/session-routes.ts` ("Without it, the cookie
  is written on Firebase's word alone"). Com a variável preenchida, a propagação funcionou. O `pnpm e2e` não
  cobre esse caminho porque o `stackEnv` da `web` não define `NEXT_PUBLIC_API_URL`. Fica como achado para o
  backlog.
- `GET /api` (exato) na `web` responde 200 com a home em pt-br, porque cai em `[locale]` com `locale=api`. O
  proxy novo devolve `NextResponse.next()` para esse caminho, que tem o mesmo efeito de quando o matcher o
  excluía. Anterior à tarefa.
- `HeadlessChrome` leva 403 na landing com a chave do Arcjet. O e2e e o showcase zeram `ARCJET_KEY` e não são
  afetados; um fork que rodar automação de browser contra uma landing com chave vai ver o bloqueio.
- O `next build` da `api` falha com o ambiente só de emulador (exige `FIREBASE_ADMIN_PRIVATE_KEY`), e o
  `next start` exige `CORS_ORIGIN`. Os dois são anteriores à tarefa; por isso a `api` da passada de browser
  rodou em `next dev`, como no e2e.
- No hero da landing, o link "Entrar" tem ícone de telefone e leva a `/pt-br/contact`. Copy anterior à
  tarefa, fora do escopo.

## Correção feita neste `/test`

`docs/SUBPROCESSORS.md` tinha três referências de linha de `apps/app` desatualizadas.
`apps/app/next.config.ts:19-23` (avatar) virou `:23-26`, porque esta tarefa acrescentou a constante do bucket
no topo do arquivo. `apps/app/proxy.ts:19` virou `:25` e `apps/app/proxy.ts:66` virou `:72` (derivas
anteriores à tarefa), e a linha do Storage ganhou `apps/app/next.config.ts:29-37`. Nenhum código de produção
foi alterado. O arquivo já está no commit 11 do plano do `/review`.

## Ambiente do e2e

- As portas 3000, 3001, 3002, 3003, 9099, 8080, 9199, 4001, 4400 e 4500 estavam livres no início; nada do
  usuário foi reutilizado.
- O `pnpm e2e` subiu e derrubou o próprio ambiente (emulador, `api`, `app` e `web` em `next dev`).
- Subi e derrubei por PID: `web` e `app` em `next start` em várias rodadas, a `api` em `next start` (3002) e
  depois em `next dev`, e o `pnpm emulators`, encerrado com SIGINT no processo do `firebase-tools`. No fim,
  `lsof -ti` saiu vazio nas dez portas e o `ps` não mostrou nenhum `next` ou emulador deste workspace.
- O pré-aquecimento do `next dev` não disparou o aviso de upgrade: as duas execuções de cada app chegaram a
  "Ready". O e2e gerou `apps/{api,app,web}/AGENTS.md`, que apaguei.
- Removi o harness temporário (`/tmp/dih-run.mjs`, `/tmp/dih-probe.sh`). Os logs ficaram em
  `/tmp/dih-*.log`, fora do repositório e sem segredo.

## Estado de dev alterado

- Nenhuma conta criada no Firebase real e nenhum dado escrito nele. As contas usadas são do seed do emulador
  e morreram com ele.
- Os diretórios `.next` de `apps/web`, `apps/app` e `apps/api` ficaram com builds de QA; o último da `web` e
  do `app` aponta para o emulador. O git ignora esses diretórios, o próximo `pnpm build` os substitui e o
  `next dev` usa outro diretório.
- A `ARCJET_KEY` local foi lida do `apps/web/.env` e passada por variável de ambiente, sem ser impressa nem
  gravada.
