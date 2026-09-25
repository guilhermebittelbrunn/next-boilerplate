# Revisão: testes E2E e acessibilidade automatizada

Rodada autônoma do `/cycle`, em 2026-09-25. A revisão leu o código e rodou só os gates estáticos: não subiu
app, não rodou a suíte Playwright nem a suíte Vitest. O que depende de execução está em
[Verificar no `/test`](#verificar-no-test).

## Branch

- **Nome:** `test/e2e-testing`, renomeada a partir de `specs-backlog-sync` com `git branch -m`.
- **Base:** `main` em `a1f87d0`. A branch antiga não tinha commit próprio (`git log origin/main..HEAD` vazio)
  nem upstream, então renomear era seguro.
- **Por que sem `project`:** o diff toca dois apps (`apps/e2e` e um teste de `apps/app`) além da raiz, e a
  regra manda omitir o prefixo nesse caso. O tipo é `test` porque a entrega é infraestrutura de teste.
- **Regex de validação:** `branch OK: test/e2e-testing`. O nome antigo reprovava por não ter `<type>/`.
- A mesma branch carrega a auditoria do backlog (`/spec --sync`), em commits separados no plano abaixo.

## Achados

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/e2e/a11y/allowlist.ts:41-51` e `:98-106`: as exceções `[data-slot="select-trigger"]` e
  `[data-slot="switch"]` casam qualquer `Select` ou `Switch` das rotas listadas, não só o seletor de ambiente,
  o de usuário personificado, o filtro de usuários e o switch de linha. Um `Select` novo sem nome em
  `/pt-br/admin` ou `/pt-br/admin/users` passaria sem aviso. Um campo novo sem `label` continua reprovando,
  porque nenhuma exceção usa a regra `label`. **Não corrigido:** estreitar o seletor sem rodar a suíte
  arrisca uma exceção que deixa de casar e reprova o job. A saída limpa é corrigir os componentes e apagar
  as duas entradas. Registrado em `specs/BACKLOG.md`, seção "Achados da entrega `e2e-testing`".
- `docs/PRE-PRODUCTION.md` mistura dois assuntos: o primeiro hunk (§9, exigir `verify` e `e2e`) é desta
  entrega e o segundo (recontagem da suíte e do gate) é da auditoria. Separar exigiria `git add -p`, que este
  ambiente não suporta. O plano de commits põe o arquivo inteiro no commit de documentação da feature e diz
  isso no corpo da mensagem. `specs/e2e-testing.md` também mistura, mas lá as duas partes são bookkeeping de
  backlog (status `in-progress` e contagens), então o arquivo inteiro vai no commit `docs(specs)`.

### 🟢 Sugestão / nit

- `vitest.config.mts:3-6`: o comentário dizia que só o `pnpm coverage` lê o arquivo. O Vitest procura o
  config do diretório atual para cima (`empathic` `any()`, usado em `vitest/dist/chunks/cli-api.*.js`), então
  um workspace que rode `vitest` sem config própria cai neste arquivo e roda todos os projetos. Hoje os dez
  workspaces com `test` têm config própria, então nada quebra. **Corrigido:** o comentário agora descreve
  esse comportamento.
- `apps/e2e/support/stackEnv.ts:18`: `DEMO_PROJECT_ID` repete o valor de `packages/auth/emulator.ts:16` e do
  script `emulators` (`package.json:14`). `apps/e2e` não depende de `@repo/auth`, então a cópia é aceitável.
  Aberto.
- `apps/e2e/support/stackEnv.ts:72`: a web não recebe `NEXT_PUBLIC_API_URL` nem as outras URLs cruzadas, e
  fica com os valores vazios do `.env.example`. Nenhum teste submete formulário a partir da web, então não
  afeta a suíte atual. Vira problema no primeiro teste que cadastrar pela landing com `E2E_*_PORT`
  definidas. Aberto.
- `apps/e2e/support/a11y.ts:45`: um alvo do axe com mais de uma parte (iframe ou shadow DOM) vira seletor
  unido por espaço, que o `querySelector` não resolve. A exceção deixa de casar e o teste reprova, ou seja,
  falha para o lado seguro. Aberto, sem ação.

### ✅ OK

- **A suíte não alcança o Firebase real, por leitura.** `buildStackEnv` (`stackEnv.ts:107-128`) parte do
  `.env.example`, zera toda chave que só existe em `.env`, `.env.local`, `.env.development` ou
  `.env.development.local`, zera as credenciais do Firebase, `GOOGLE_APPLICATION_CREDENTIALS` e `ARCJET_KEY`,
  força o bloco do emulador e chama `assertEmulatorTarget` antes de devolver. A config monta os três ambientes
  no carregamento (`playwright.config.ts:19-23`), antes de qualquer `webServer`. O valor vazio vence o `.env`
  porque o `@next/env` 16.0.0 só aplica a chave do arquivo quando `typeof origEnv[key] === "undefined"`.
  Com os hosts do emulador, o Admin SDK inicia sem credencial e com project id `demo-`
  (`packages/auth/server.ts:47-54`), e o Identity Toolkit da API usa a origem do emulador
  (`apps/api/(shared)/lib/firebase-identity-toolkit.ts:14`). O seed roda direto, sem `--env-file-if-exists`
  (`tests/global.setup.ts:29-37`), e o próprio script recusa alvo fora do emulador
  (`apps/api/scripts/seed-emulator.mjs:6-7`).
- **Servidor já de pé não é reaproveitado:** `reuseExistingServer: false` em api, app e web
  (`playwright.config.ts:80`, `:90`, `:100`). Só o emulador é reaproveitado.
- **CI:** `permissions: contents: read` no topo (`ci.yml:11-12`) vale para os jobs novos; nenhuma referência
  a `secrets.`. O `verify` não mudou. `e2e` e `coverage` dependem de `changes` por `if` de job
  (`ci.yml:66-69`, `:124-127`), então PR só de documentação pula os dois e o check conta como sucesso.
- **`pnpm test` não sobe browser:** o `test` de `apps/e2e` é Vitest com `include: ["__tests__/**/*.test.ts"]`
  (`apps/e2e/vitest.config.mts:6`). Os dois unitários importam só `support/stackEnv.ts` (e dele `urls.ts`,
  `paths.ts`, `emulatorTarget.mjs`) e `support/a11yFilter.ts` com tipos da allowlist. Nenhum importa o
  runtime do Playwright.
- **Allowlist casada por rota, regra e seletor:** `applicableExceptions` filtra por rota e tema
  (`a11yFilter.ts:44-52`) e `filterViolations` exige regra igual e `matches(target, selector)`
  (`:70-74`). O casamento acontece no navegador, com `element.matches` (`a11y.ts:31-55`). Exceção que não
  casa vira anotação `a11y-stale-exception` sem reprovar (`a11y.ts:88-93`).
- **Comentários:** nenhum cita plano, handoff, etapa ou ID de card (grep em `apps/e2e`, `vitest.config.mts`,
  `scripts/coverage-summary.mjs`, `ci.yml` e no teste de `apps/app`).
- **Segredos:** nenhum em `docs/features/e2e-testing/`. A senha do seed aparece só em código
  (`apps/e2e/support/seedAccounts.ts:3`), igual à de `seed-emulator.mjs:17` e à publicada em
  `docs/SETUP.md:341`, e vale só no emulador. O handoff cita um caminho local com o nome de usuário
  (`develop/handoff.md:63`), que já é público como dono do repositório.
- **Corte de MVP da spec:** C1 a C5 correspondem ao código. O bloqueio de merge (C2) depende do P1, que
  está em `docs/PRE-PRODUCTION.md` §9.
- **Contagem de testes do handoff confere por leitura:** 4 de setup, 9 de fluxo (landing 1, cadastro 1,
  login 4, CRUD 1, troca de painel 2) e 9 em dark (4 sem sessão, 3 do comum, 2 do admin), 22 no total.
- **i18n:** nenhuma chave nova. Os seletores leem o dicionário `pt-br`.

## Correções aplicadas

| Arquivo | O que mudou |
|---------|-------------|
| `vitest.config.mts` | Comentário reescrito: explica que o Vitest sobe diretórios atrás do config e que um workspace sem config própria roda todos os projetos. |
| `specs/BACKLOG.md` | Seção nova "Achados da entrega `e2e-testing`" com três linhas: os sete grupos de violação tolerados pela allowlist (incluindo o seletor amplo), o gatilho `<div>` do `ActionsMenu` e o CTA "Entrar" do hero que leva a `/contact`. O "Switch language" fixo já estava no backlog e não foi repetido. |
| branch | `specs-backlog-sync` renomeada para `test/e2e-testing`. |

## Raio de impacto

- Nenhum DTO, action do SDK, rota, `error.code` ou chave de i18n mudou.
- `pnpm-lock.yaml`: o `@playwright/test` é peer opcional do `next`, e o pnpm regravou a chave de resolução
  de todos os `next@…`. A versão do `next` não mudou.
- `apps/app/__tests__/cookieBannerAuthLayoutOffset.test.tsx`: o caminho do layout passou de `process.cwd()`
  para `__dirname`. Só afeta esse teste.
- `vitest.config.mts` da raiz: lido pelo `pnpm coverage` e por qualquer `vitest` rodado num diretório sem
  config própria.

## Verificar no `/test`

A lista do handoff, com o veredito de cada item depois da leitura:

1. **Critério 1 com servidor que responda 200 na porta.** Por leitura, `reuseExistingServer: false` está nos
   três apps. Falta medir a mensagem. Repro: `pnpm --filter app dev` na 3000, depois `pnpm e2e`; esperado
   sair com erro que nomeia a porta ou a URL, sem rodar teste. Derrube só o que você subiu.
2. **Critério 2 completo.** A montagem do ambiente foi confirmada por leitura (ver ✅). Falta a medição de
   rede. Repro: durante uma execução inteira, `lsof -a -p <pid> -i TCP` na API e no app, a cada minuto;
   esperado só `127.0.0.1:8080`, `127.0.0.1:9099` e as portas locais da própria suíte. Depois, a conta
   `e2e-signup-*` tem de aparecer em `curl http://127.0.0.1:9099/emulator/v1/projects/demo-next-boilerplate/accounts`.
   A ausência no projeto real fica 🔒 sem credencial dele.
3. **Critério 3.** Por leitura, a config chama `buildStackEnv` no topo do módulo, antes do `defineConfig`.
   Repro: trocar temporariamente `DEMO_PROJECT_ID` em `apps/e2e/support/stackEnv.ts:18` por `real-project`,
   rodar `pnpm e2e`; esperado `Refusing to seed: the target project is "real-project"` antes de qualquer log
   de `webServer`. Reverter.
4. **Critérios 5 e 7.** Não rodados por ninguém. Repro do 5: fazer o `SignInForm` deixar de chamar o submit;
   esperado `signIn.spec.ts`, `entityCrud.spec.ts` e `panelSwitch.spec.ts` vermelhos (os dois últimos já no
   `setup`). Repro do 7: tirar o `label` do campo `description` em `EntityFormFields.tsx` (o `name` tem `placeholder`, que o axe aceita como nome); esperado falha com a regra
   `label`, rota e alvo na mensagem. A asserção é `expect.soft` (`a11y.ts:95`), então confira que o teste
   termina como falho e não só com aviso. Reverter os dois.
5. **Critério 6.** Repro: provocar uma falha, abrir `pnpm --filter e2e exec playwright show-trace
   test-results/<teste>/trace.zip` e conferir rede e console do momento da falha.
6. **Critério 11, execução real dos jobs.** O YAML foi conferido por leitura (ver ✅). A execução fica 🔒 até
   o push: `changes`, `e2e` e `coverage` rodando numa PR, e o pulo numa PR só de documentação.
7. **Duração no runner do GitHub.** 🔒 até o push. Local: 10,2 min numa máquina com o Turbopack lento; o teto
   do job é 25 min.
8. **Instabilidade.** Só uma rodada verde completa. Repro: `CI=1 pnpm e2e` duas vezes seguidas, que liga
   `retries: 1` e `failOnFlakyTests`; esperado zero `flaky`.

## Lacunas de teste

| Lacuna (do handoff) | Veredito |
|---------------------|----------|
| `playwright.config.ts` e `global.setup.ts` sem unitário | Continua aberta. A parte que importa (a recusa) está em `stackEnv.ts`, que tem unitário; o resto só se prova executando, e o item 3 acima cobre a config. |
| `scripts/coverage-summary.mjs` sem teste | Continua aberta, risco baixo: o script só agrega o JSON do v8. |
| Suíte só em `pt-br`, desktop e com onboarding ligado | Fora de escopo (D12 do plano). Idiomas e mobile seguem com o `agent-browser`. |

## Decisões em aberto

1. **Seletores amplos da allowlist** (`select-trigger`, `switch`). Recomendação: manter até corrigir os
   componentes, porque estreitar sem executar arrisca reprovar o job. A correção de verdade é o `aria-label`
   nos componentes, pelo backlog.
2. **Corrigir já as violações toleradas** (pergunta 2 do plano). O default adotado foi allowlist agora. A lista
   cresceu de 2 violações previstas para 7 grupos medidos, o que pode mudar a sua resposta.
3. **`docs/PRE-PRODUCTION.md` em commit misto.** Recomendação: aceitar, com o motivo no corpo do commit.
4. **Uma PR para feature e auditoria.** A branch leva os dois assuntos em commits separados. Recomendação:
   uma PR só, com título da feature e a auditoria descrita no corpo. A alternativa é mover os commits da
   auditoria para uma branch `specs/docs/backlog-sync` depois de commitar.

## Gates

Rodada 1:

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint/format | `pnpm check` | 723 arquivos, "No fixes applied" |
| Typecheck | `pnpm turbo run typecheck --filter=e2e --filter=app` | 2/2, em cache (as correções não tocam nenhum dos dois workspaces) |
| Paridade de i18n | não se aplica | nenhuma chave mudou |
| Gate completo | citado do handoff, sem remedir | `pnpm turbo run lint typecheck test` 26/26 |

## Rodada 2: correções depois do `/test`

O `/test` voltou `blocked` (`test/report.md`). Esta rodada trata o que ele devolveu, sem rodar a suíte.

### D1 🔴: gatilho do menu de perfil sem nome acessível

O gatilho do `ProfileDropdown` só tinha nome quando o usuário do Firebase ou o `GET /account` carregavam:
antes disso `initials` é `""` e o `span` do nome fica vazio (`ProfileDropdown.tsx:37-50`). O axe varria nesse
intervalo e acusava `[critical] button-name`, com 3 falhas em 4 tentativas com `.next` frio e 1 em 18 quente,
segundo o relatório. No mobile o `span` é `hidden md:inline`, então o nome dependia só das iniciais.

**Correção na raiz:** o gatilho recebe `aria-label` fixo do dicionário, que não depende de dado carregado.

| Arquivo | O que mudou |
|---------|-------------|
| `packages/internationalization/translations/apps/app/shared/index.ts` | Chave `profileDropdown.triggerLabel` nos três idiomas: "Abrir menu do perfil", "Open profile menu", "Abrir menú del perfil" |
| `apps/app/shared/components/ui/ProfileDropdown.tsx:42` | `<DropdownMenuTrigger aria-label={profileDropdown.triggerLabel}>` |
| `apps/app/__tests__/profileDropdownAccount.test.tsx` | Caso novo: sem conta e sem usuário do Firebase, `getByRole("button", { name })` acha o gatilho pelo texto do dicionário |

A suíte não ganhou espera nenhuma, então o sintoma não foi escondido. `DropdownMenuTrigger` repassa as
props ao `Trigger` do Radix (`packages/design-system/components/ui/dropdown-menu.tsx:25-33`), que renderiza o
`button`. O outro teste do componente (`profileDropdownCookieConsent.test.tsx:29`) acha o gatilho por
`getByRole("button")` sem nome e não é afetado. Nenhuma exceção da allowlist cobria esse botão, então nada
fica obsoleto.

🟢 Efeito colateral aberto: com `aria-label`, o primeiro nome visível ao lado do avatar deixa de fazer parte
do nome acessível. A regra do axe para isso (`label-content-name-mismatch`) é experimental e não roda com as
tags da suíte. Se incomodar, o rótulo pode passar a interpolar o nome quando ele existir.

### D2: mutação em `EntityFormFields.tsx`

Conferido: `git status` não lista o arquivo, então ele está igual ao `HEAD` depois do `git checkout --` do
orquestrador. Não entra no plano de commits.

### Telemetria do Next

`apps/e2e/support/stackEnv.ts` ganhou `OFFLINE_BLOCK` com `NEXT_TELEMETRY_DISABLED: "1"`, aplicado junto do
bloco do emulador, e `apps/e2e/__tests__/stackEnv.test.ts` passou a esperar a chave. O relatório também viu
app e web falando com `registry.npmjs.org` (checagem de versão do `next dev`); essa variável não desliga essa
checagem, e ela continua como achado aberto.

### Critério 7

O exemplo usava o campo `name`, cujo `placeholder` o axe aceita como nome, então a suíte reprovava pelo
locator e não pela regra `label`. Corrigido para `description` (campo sem `placeholder`) em
`analyze/plan.md` (critério 7), `develop/handoff.md` (lista "A verificar no `/test`") e no item 4 da lista
da rodada 1 acima. Os arquivos de `test/` são do QA e não foram editados.

### Fica como achado, sem correção

- `apps/e2e/tests/global.setup.ts:13` e `:50-52`: o login do `setup` espera até `FIRST_COMPILE_TIMEOUT`
  (300 s), então um login quebrado leva 5,1 min para reprovar o job.

### Gates da rodada 2

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint/format | `pnpm check` | 723 arquivos, "No fixes applied" |
| Typecheck | `pnpm turbo run typecheck --filter=e2e --filter=app --filter=@repo/internationalization` | 3/3, sem cache |
| Paridade de i18n | `pnpm --filter @repo/internationalization test` | 5 arquivos, 44/44 |

A suíte Vitest do `apps/app` e do `apps/e2e` não rodou aqui: os dois testes alterados ficam para o `/test`.

### Verificar no `/test`, rodada 2

1. **D1 resolvido.** Repro: `.next` do app frio, `CI=1 pnpm e2e`; esperado 22/22 sem `flaky`. Depois,
   `playwright test tests/a11yDark.spec.ts --grep "as a common user" --repeat-each=6`; esperado 0 falhas em 18.
2. **Nome do gatilho nos três idiomas e no mobile.** Repro com `agent-browser`: `/pt-br`, `/en` e `/es` do
   painel em 375 px, conferir o nome acessível do `data-slot="dropdown-menu-trigger"` antes e depois de o
   avatar carregar ("Abrir menu do perfil", "Open profile menu", "Abrir menú del perfil"). O diff agora toca
   UI do `apps/app`, então a passada de browser volta a valer.
3. **Unitários alterados.** `pnpm --filter app exec vitest run __tests__/profileDropdownAccount.test.tsx
   __tests__/profileDropdownCookieConsent.test.tsx` e `pnpm --filter e2e test`; esperado verdes (5 casos no
   primeiro arquivo, 16 no e2e).
4. **Telemetria.** Repro: `lsof -nP -a -p <pids> -i TCP` durante uma execução; esperado nenhuma conexão com
   `telemetry.nextjs.org` (`64.239.123.65`). `registry.npmjs.org` pode seguir aparecendo.
5. **Critério 7 corrigido.** Tirar o `label` do `description`; esperado `[critical] label` com alvo
   `#description`, já medido no item 4b do relatório. Só reconfirmar se o `/test` quiser fechar o critério
   com a redação nova.

## Plano de commits

O índice tem hoje o rename `specs/billing-subscription.md` → `docs/features/billing-subscription/spec.md`
(`git diff --cached --stat` → 1 arquivo). Ele pertence ao commit 13. Antes do primeiro commit, esvazie o
índice com `git reset -q` e confira `git diff --cached --stat` vazio.

A chave de i18n entra **antes** do componente, invertendo a ordem da regra (`apps/app` →
`packages/internationalization`): o `ProfileDropdown` lê `profileDropdown.triggerLabel`, e sem a chave o
commit do app não passa no typecheck.

1. `chore: add e2e and coverage dev dependencies and scripts`
   `package.json`, `pnpm-lock.yaml`, `apps/e2e/package.json`
2. `test(e2e): add emulator-only stack env and playwright config`
   `.gitignore`, `apps/e2e/tsconfig.json`, `apps/e2e/vitest.config.mts`, `apps/e2e/playwright.config.ts`,
   `apps/e2e/support/paths.ts`, `apps/e2e/support/urls.ts`, `apps/e2e/support/stackEnv.ts`,
   `apps/e2e/support/seedAccounts.ts`, `apps/e2e/support/dictionary.ts`, `apps/e2e/support/signIn.ts`,
   `apps/e2e/__tests__/stackEnv.test.ts`
3. `test(e2e): add axe check with an initial allowlist`
   `apps/e2e/support/a11y.ts`, `apps/e2e/support/a11yFilter.ts`, `apps/e2e/a11y/allowlist.ts`,
   `apps/e2e/__tests__/a11yFilter.test.ts`
4. `test(e2e): cover sign-up, sign-in, entity crud, panel switch and landing`
   `apps/e2e/tests/global.setup.ts`, `apps/e2e/tests/landing.spec.ts`, `apps/e2e/tests/signUp.spec.ts`,
   `apps/e2e/tests/signIn.spec.ts`, `apps/e2e/tests/entityCrud.spec.ts`, `apps/e2e/tests/panelSwitch.spec.ts`,
   `apps/e2e/tests/a11yDark.spec.ts`
5. `feat(internationalization): add the profile menu trigger label`
   `packages/internationalization/translations/apps/app/shared/index.ts`
   (corpo: vem antes do app porque o componente lê a chave e não compila sem ela)
6. `fix(app): give the profile menu trigger an accessible name`
   `apps/app/shared/components/ui/ProfileDropdown.tsx`, `apps/app/__tests__/profileDropdownAccount.test.tsx`
7. `test(app): read the auth layout source relative to the test file`
   `apps/app/__tests__/cookieBannerAuthLayoutOffset.test.tsx`
8. `chore: add consolidated vitest coverage report`
   `vitest.config.mts`, `scripts/coverage-summary.mjs`
9. `ci: run e2e and coverage jobs on product changes`
   `.github/workflows/ci.yml`
10. `docs: document the e2e suite, coverage and the agent-browser boundary`
    `CLAUDE.md`, `docs/SETUP.md`, `docs/review-checklist.md`, `docs/AI-WORKFLOW.md`, `docs/PRE-PRODUCTION.md`
    (corpo: o arquivo também leva a recontagem da suíte e do gate feita pela auditoria do backlog, no mesmo §9)
11. `docs: remeasure guarded api routes in the security doc`
    `docs/SECURITY.md`
12. `docs(specs): sync backlog after the billing delivery`
    `specs/BACKLOG.md`, `specs/admin-billing-insights.md`, `specs/observability-logging.md`,
    `specs/teams-organizations.md`, `specs/e2e-testing.md`
    (corpo: também marca `e2e-testing` como `in-progress` e registra os achados de acessibilidade da suíte E2E)
13. `docs(features): archive the billing spec and repoint its links`
    `specs/billing-subscription.md` (remoção), `docs/features/billing-subscription/spec.md`,
    `docs/features/billing-subscription/analyze/plan.md`, `docs/features/admin-analytics-dashboard/spec.md`,
    `docs/features/data-rights-lgpd/spec.md`, `docs/features/user-activity-tracking/spec.md`,
    `docs/features/user-activity-tracking/analyze/plan.md`
14. `docs(features): e2e-testing`
    `docs/features/e2e-testing/`

Título de PR sugerido: `test: add playwright e2e suite with axe checks and coverage`.

### Commits realizados

(preenchido pelo orquestrador)
