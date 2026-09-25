# Handoff do /develop: testes E2E e acessibilidade automatizada

Rodada autônoma do `/cycle`, em 2026-09-24. Nenhum código de produto mudou. Fora de `apps/e2e`, o único arquivo de app
tocado é um teste de `apps/app` (desvio 11). As mudanças da auditoria do backlog que já estavam no working tree (`specs/*`,
`docs/SECURITY.md`, os `docs/features/*` de outras features e o rename staged de `billing-subscription`) não
foram tocadas, e o índice do git continua só com aquele rename (`git diff --cached --stat` → 1 arquivo).

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| 10.1 workspace | `apps/e2e/package.json`, `tsconfig.json`, `vitest.config.mts`, `playwright.config.ts` |
| 10.4 ambiente dos servidores | `apps/e2e/support/stackEnv.ts`, `support/urls.ts`, `support/paths.ts` |
| suporte dos specs | `apps/e2e/support/seedAccounts.ts`, `support/dictionary.ts`, `support/signIn.ts` |
| 10.5 setup | `apps/e2e/tests/global.setup.ts` |
| seção 8, fluxos | `apps/e2e/tests/landing.spec.ts`, `signUp.spec.ts`, `signIn.spec.ts`, `entityCrud.spec.ts`, `panelSwitch.spec.ts` |
| 10.6 acessibilidade | `apps/e2e/support/a11y.ts`, `support/a11yFilter.ts`, `a11y/allowlist.ts`, `tests/a11yDark.spec.ts` |
| 7, unitários | `apps/e2e/__tests__/stackEnv.test.ts`, `__tests__/a11yFilter.test.ts` |
| 10.7 cobertura | `vitest.config.mts` (raiz), `scripts/coverage-summary.mjs`, `package.json` (scripts `coverage` e `e2e`, devDependency `@vitest/coverage-v8@4.0.3`) |
| dependências | `pnpm-lock.yaml` (`@playwright/test@1.63.0`, `@axe-core/playwright@4.13.0`, `@vitest/coverage-v8@4.0.3`) |
| 10.8 CI | `.github/workflows/ci.yml`: jobs `changes`, `e2e` e `coverage`. O `verify` não mudou; só o comentário do `permissions` passou a falar dos jobs no plural |
| 10.9 | `.gitignore` (`apps/e2e/playwright-report/`, `test-results/`, `blob-report/`, `.auth/`) |
| 10.10 docs | `CLAUDE.md` (comandos, parágrafo do CI, regra de ouro 11), `docs/review-checklist.md` (tabela do CI e §7), `docs/AI-WORKFLOW.md` ("passada de browser" no lugar de "e2e com `agent-browser`", linha do CI e parágrafo da fronteira), `docs/SETUP.md` (tabela de jobs do CI, custo em fork privado, runbook pedindo `verify` e `e2e`, seções "Testes E2E (Playwright)" e "Cobertura"), `docs/PRE-PRODUCTION.md` §9 (só o item de branch protection) |

Majors das actions novas, conferidos com `gh api repos/<action>/releases/latest` em 2026-09-24:
`actions/setup-java@v6` (v6.0.1), `actions/cache@v6` (v6.1.0), `actions/upload-artifact@v7` (v7.0.1).

## Contrato

Nenhum DTO, action do SDK ou rota da API mudou. Não há código de erro novo nem entrada nova em `apiErrors`.

O raio de impacto fora de `apps/e2e` está no lockfile. O `@playwright/test` é peer opcional do `next`, então o
pnpm regravou a chave de resolução de todos os `next@…` do lockfile com `(@playwright/test@1.63.0)`
(`git diff --stat pnpm-lock.yaml` → 209 inserções, 49 remoções). A versão do `next` não mudou.

## ⚠️ Desvios em relação ao plano

1. **Portas configuráveis: `E2E_APP_PORT`, `E2E_WEB_PORT`, `E2E_API_PORT`.** O plano dizia "nenhuma variável
   nova". Sem elas, a suíte não roda numa máquina com qualquer coisa escutando na 3000, e nesta a 3000 é de
   outro workspace (comanda10, PID 91303), que não pode ser derrubado. O default é 3000/3001/3002, as mesmas
   portas dos scripts `dev`, então quem não define nada tem o comportamento do plano, inclusive a recusa de
   reaproveitar servidor. Com as variáveis, `stackEnv.ts` acerta `CORS_ORIGIN` e `NEXT_PUBLIC_*_URL` da API e
   do app, e os servidores sobem com `pnpm --filter <app> exec next dev -p <porta>` em vez do script `dev`,
   que tem a porta fixa. Documentado em `docs/SETUP.md`, "Rodar local".
2. **Prontidão do emulador medida no Auth (`http://127.0.0.1:9099/`), não no hub (`:4400/emulators`).** O
   `firebase-tools` sobe o hub antes de tudo e o Auth depois do Firestore
   (`node_modules/firebase-tools/lib/emulator/controller.js`: hub na linha 302, Firestore na 505, Auth na
   570). O hub responderia antes dos dois emuladores estarem prontos, que era o risco que o próprio plano
   previa.
3. **O seed roda com `node scripts/seed-emulator.mjs` (cwd `apps/api`), não com `pnpm --filter api seed`.** O
   script do pacote usa `--env-file-if-exists=.env`, que carregaria o `.env` real desta máquina. As chaves
   que a suíte define já venceriam, e o seed recusaria um project id sem `demo-`, mas chamar o script direto
   tira o `.env` da equação.
4. **`gracefulShutdown: { signal: "SIGINT" }` no webServer do emulador.** Na primeira execução, o Playwright
   matou o `pnpm emulators` e o Java do Firestore ficou órfão escutando na 8080 (PID 71899, pai 1, cwd deste
   workspace). Eu matei esse processo com `kill 71899`. Com o SIGINT, o `firebase-tools` desliga os
   emuladores: depois das rodadas seguintes, `lsof -ti tcp:8080` saiu vazio e o `ps` não mostrou nenhum
   `cloud-firestore-emulator`.
5. **Timeouts maiores e aquecimento das rotas no `setup`.** O plano previa "timeouts maiores". Aqui o
   `next dev` levou de 30 s a 3 min na primeira compilação de uma rota (`GET /pt-br/entities 200 in 3.0min`,
   com load average 11 a 17 na máquina). Uma causa é local: existe um `~/pnpm-lock.yaml` fora do repositório,
   e o Turbopack escolhe a home como raiz do workspace (aviso "We detected multiple lockfiles and selected the
   directory of /Users/guilhermebittelbrunn/pnpm-lock.yaml"). Não mexi nesse arquivo. O `setup` agora visita
   as rotas da suíte uma vez, esperando só o `commit` da navegação, antes dos testes. Valores atuais:
   `timeout` do teste 120 s, `expect` 30 s, subida de servidor 300 s, aquecimento até 30 min.
6. **O dicionário é carregado com `createRequire`.** `@repo/internationalization` publica TypeScript sem
   `"type": "module"`, e o import nomeado em ESM falhou (`SyntaxError: Named export 'globalTranslations' not
   found`). O `require` passa pelo loader do Playwright e devolve o módulo; o tipo continua vindo do
   `typeof import(...)`.
7. **Chaves de peer do `next` regravadas no lockfile**, descrito em "Contrato". É efeito do pnpm, não uma
   escolha.

Mais quatro desvios que apareceram nas primeiras execuções:

8. **A exceção da allowlist casa por seletor CSS escrito à mão, não pelo `target` do axe.** O plano pedia
   igualdade com `node.target.join(" ")`. Os alvos medidos saíram assim: `#_R_akqbaj9bn5ritpesnfl5rknebn9mlb_`
   (id do `useId`), `#_r_1_-form-item > .-translate-y-1\/2.top-1\/2.right-2`,
   `.lg\:aspect-auto.h-full.lg\:col-span-2:nth-child(1) > …`. Eles mudam com qualquer ajuste de classe ou de
   ordem de render, e a allowlist apodreceria a cada PR de estilo. Cada exceção agora tem `selector`, e o
   helper confere no próprio navegador, com `element.matches(selector)`, se o elemento que o axe apontou
   casa com ele. Continua valendo rota + regra + elemento. Um campo novo sem rótulo na mesma tela não casa
   `input + button.absolute` e reprova. O filtro segue puro e recebe o casamento como função
   (`TargetMatcher`), coberto em `__tests__/a11yFilter.test.ts`.
9. **A mensagem de senha errada aceita `auth/wrong-password` ou `auth/invalid-credential`.** O emulador
   respondeu `INVALID_PASSWORD` (corpo da resposta de `accounts:signInWithPassword` no trace da rodada 6), e a
   tela mostrou "Senha incorreta." em vez de "Credenciais inválidas…". Um projeto real com proteção contra
   enumeração de e-mail responde `INVALID_LOGIN_CREDENTIALS`. As duas mensagens vêm do dicionário.
10. **A troca de painel confere o aviso de somente leitura em `/pt-br/entities`, não na home.** O
    `ImpersonationReadOnlyNotice` só aparece nas telas que gravam (lista, criação e edição de `entity`, e
    conta), então esperar o aviso na home falhava. O teste agora confere o seletor de ambiente em "Painel do
    usuário" na home, abre "Entidades", espera o aviso e o botão "Novo" desabilitado, e volta para
    "Administração".

11. **`apps/app/__tests__/cookieBannerAuthLayoutOffset.test.tsx` passou a ler o layout relativo a
    `__dirname`, não a `process.cwd()`.** O plano pedia ajustar o config raiz, e não os configs por
    workspace, se algo não resolvesse a partir da raiz. O problema não era de config: o teste montava o
    caminho com `process.cwd()`, que no `pnpm coverage` é a raiz do repositório
    (`ENOENT … amsterdam/app/[locale]/(unauthenticated)/layout.tsx`, 1 arquivo reprovado de 182). Com
    `join(__dirname, "../app/[locale]/(unauthenticated)/layout.tsx")` o teste passa nos dois modos
    (`pnpm --filter app exec vitest run` desse arquivo → 4/4; `pnpm coverage` → 182/182). `jsdom` e
    `@vitejs/plugin-react` resolveram a partir da raiz sem ajuste.

## Allowlist inicial (`apps/e2e/a11y/allowlist.ts`)

Todas as entradas vieram das rodadas 5 a 8. Cada uma vira achado de backlog pelo `/review`. "Tema" vazio vale
para light e dark.

| Regra | Seletor | Rotas | Tema | Motivo |
|-------|---------|-------|------|--------|
| `button-name` (critical) | `input + button.absolute` | `/pt-br/sign-in`, `/pt-br/sign-up`, `web:/pt-br/sign-up` | | Botão de mostrar/ocultar senha do `HookFormInputPassword` só tem ícone. Correção: `aria-label` traduzido no design system |
| `nested-interactive` (serious) | `button:has(a, button)` | `web:/pt-br`, `web:/pt-br/sign-up` | | Header, hero e CTA da web põem um `Link` dentro de `<Button>`, e o seletor de idioma põe um `Button` dentro do trigger. Correção: `Button asChild` |
| `color-contrast` (serious) | `.bg-muted .text-muted-foreground` | `web:/pt-br` | light | Cards de features, depoimentos e CTA com `text-muted-foreground` sobre `bg-muted`, abaixo de 4,5:1 |
| `document-title` (serious) | `html` | `/pt-br`, `/pt-br/entities`, `/pt-br/entities/create`, `/pt-br/entities/edit/[id]`, `/pt-br/entities#impersonating`, `/pt-br/admin`, `/pt-br/admin/users` | | As páginas autenticadas do painel não declaram metadata, então o documento não tem `<title>` (`grep -rln generateMetadata apps/app/app` só acha as páginas não autenticadas e o onboarding) |
| `color-contrast` (serious) | `[data-slot="avatar-fallback"]` | as mesmas do painel, menos `/pt-br/admin/users` | light | Iniciais do avatar na navbar com `text-muted-foreground` sobre `bg-muted` |
| `button-name` (critical) | `[data-slot="select-trigger"]` | `/pt-br/entities#impersonating`, `/pt-br/admin`, `/pt-br/admin/users` | | Seletor de ambiente, seletor de usuário personificado e filtro da lista de usuários sem `label`/`aria-label` |
| `button-name` (critical) | `[data-slot="switch"]` | `/pt-br/entities`, `/pt-br/entities#impersonating`, `/pt-br/admin/users` | | Switch de "Ativo" em cada linha da tabela sem nome acessível |

Achados fora do escopo, que o `/review` leva ao backlog junto com os da tabela:

- O gatilho do `ActionsMenu` (`action-menu.tsx`) é um `<div>` sem papel. O axe não o vê, e o spec clica no
  `svg` da última célula da linha (A2 do plano).
- `apps/web/app/[locale]/components/header/language-switcher.tsx` tem o texto "Switch language" fixo, fora
  do dicionário.
- O CTA primário da landing diz "Entrar" e leva a `/contact` (A1 do plano). A suíte não afirma esse
  comportamento.

## Decisões em aberto

Nenhuma bloqueia. A pergunta 2 do plano (corrigir já as violações da allowlist) continua com o default
adotado: allowlist agora, correção pelo backlog. A lista cresceu de 2 violações previstas para 7 grupos
medidos, e isso pode mudar a resposta do usuário.

## Validação

Todos os comandos rodaram sem `--force`.

| O que | Comando | Resultado |
|-------|---------|-----------|
| Unitários da suíte | `pnpm --filter e2e test` | 16/16 (8 em `stackEnv.test.ts`, 8 em `a11yFilter.test.ts`) |
| Tipos da suíte | `pnpm --filter e2e typecheck` | sem erro |
| Lint/format | `pnpm check` | 723 arquivos, "No fixes applied", sem erro |
| Gate do CI | `pnpm turbo run lint typecheck test` | 26/26 tasks (1 lint, 13 typecheck, 11 test com `e2e#test`), 19 s, 24 em cache |
| `pnpm test` da raiz | `pnpm test` | 11/11 tasks, 22 s. `grep -ciE "playwright\|chromium\|webServer"` no log → 0 |
| Tasks do gate que tocam o Playwright | `pnpm turbo run lint typecheck test --dry=json` | nenhuma. `e2e#test` é `NODE_ENV=test vitest run` e `e2e#typecheck` é `tsc --noEmit` |
| Cobertura | `pnpm coverage`, duas vezes seguidas | 182 arquivos, 1833 testes, nas duas. Linhas 65,18%, statements 65,2%, funções 54,68%, branches 61,77%. `cmp` dos dois `coverage-summary.json` → idênticos. 50 s e 39 s |
| Tabela por workspace | `node scripts/coverage-summary.mjs` | 14 workspaces mais o total, sem linha de `apps/e2e`. O total da tabela arredonda (65,19% de linhas); o `text-summary` do v8 trunca (65,18%) |
| Suíte E2E | `E2E_APP_PORT=3100 E2E_WEB_PORT=3101 E2E_API_PORT=3102 pnpm e2e`, JDK 21 via `JAVA_HOME` | rodada 8: 22/22 verdes em 10,2 min (614 s de parede): 4 de setup, 9 de fluxo, 9 de a11y no dark |

Depois da rodada 8, só tirei da allowlist a entrada de contraste do avatar em `/pt-br/admin/users` (light),
rota que nenhuma varredura em light visita. A remoção não muda o resultado, e a suíte não rodou de novo
depois dela.

Uso da allowlist, contado nos 21 anexos `axe …` do relatório da rodada 8: toda entrada casou em pelo menos
um tema varrido, e nenhuma anotação `a11y-stale-exception` apareceu. Os dois passos do onboarding saíram sem
violação `critical`/`serious`.

Critério 1, porta ocupada, nas portas default: `pnpm e2e` saiu com código 1 em 45 s, com
`[app] Error: listen EADDRINUSE: address already in use :::3000` e `Process from config.webServer was not able
to start`. Quem estava na 3000 respondia 404 em `/pt-br/sign-in`, então o Playwright não o tomou por servidor
pronto e não o reaproveitou.

Critério 2, parcial: durante a rodada 3, `lsof -a -p <pid da API na 3102> -i TCP` mostrou só
`127.0.0.1:…->127.0.0.1:8080 (ESTABLISHED)` e o listen da 3102.

Typecheck de `app`, `api` e `web`: estão no gate acima (13 typecheck), e nenhum arquivo de código deles mudou.

Processos: a cada rodada o Playwright subiu e derrubou emulador e servidores. No fim, `lsof -ti tcp:<porta>
-sTCP:LISTEN` para 3100, 3101, 3102, 8080, 9099, 4400, 4001, 4500 e 9150 saiu vazio, e o `ps` não mostrou
nenhum `cloud-firestore-emulator` nem `next dev -p 310x`. O processo do outro workspace na 3000 (PID 91303)
nunca foi tocado; na última checagem a 3000 também estava livre, porque ele encerrou sozinho. `apps/e2e/test-results/` e `apps/e2e/.auth/` foram apagados; `apps/e2e/playwright-report/`
e `coverage/` ficaram, ambos ignorados pelo git.

## A verificar no `/test`

- Critério 1 com um servidor que responda 200 na porta (um `pnpm dev` de verdade): a mensagem esperada é a
  do Playwright (`… is already used …`).
- Critério 2 completo: `lsof` da API e do app durante toda a suíte, e nenhuma conta `e2e-signup-*` fora do
  emulador.
- Critério 3: trocar o `DEMO_PROJECT_ID` de `stackEnv.ts` por um id sem `demo-` e ver a config recusar antes
  de subir servidor. O unitário cobre a função (`assertEmulatorTarget`), não a config.
- Critério 5, quebra proposital do login, e critério 7, tirar o `label` do `description` em `EntityFormFields.tsx`.
  Não fiz nenhum dos dois.
- Critério 6: artefatos de falha. As rodadas que falharam geraram `test-results/<teste>/trace.zip`, vídeo e
  screenshot, mas eu não abri o trace no viewer.
- Critério 11: execução real dos jobs `changes`, `e2e` e `coverage` no GitHub (🔒 até o push), incluindo o
  pulo em PR só de documentação.
- Duração no runner do GitHub. Aqui a rodada verde levou 10,2 min, com o Turbopack lento por causa do
  lockfile na home. O teto do job é 25 min.
- Instabilidade: só uma rodada verde completa. Nenhum teste passou só na segunda tentativa, porque local não
  há retry.

## Lacunas de teste conhecidas

- `playwright.config.ts` e `global.setup.ts` não têm unitário. São cobertos pela própria execução da suíte.
- `scripts/coverage-summary.mjs` não tem teste.
- A suíte roda só em `pt-br`, desktop e com o onboarding ligado (D12 do plano).

## Contas e dados criados

Só no emulador: uma conta `e2e-signup-<timestamp>@example.com` por execução e uma `entity` "E2E <timestamp>"
criada e excluída no mesmo teste. O seed do começo de cada execução apaga as duas.
