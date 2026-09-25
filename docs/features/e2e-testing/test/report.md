# Relatório do /test: testes E2E e acessibilidade automatizada

Rodada autônoma do `/cycle`, em 2026-09-25, na branch `test/e2e-testing`. O diff não muda código de produto,
então não houve passada com `agent-browser` (política §3.1 do `/cycle`: diff sem superfície de runtime não
sobe browser para validação visual). O objeto do teste aqui é a própria suíte, então rodei `pnpm e2e` e medi
cada item da lista "Verificar no `/test`" do `review/review.md`.

**Veredito: `blocked`.** A suíte tem um teste de acessibilidade instável (D1): na primeira execução com
`CI=1`, um teste falhou nas duas tentativas e outro só passou no retry, o que reprova o job `e2e` no GitHub.
A causa está no `ProfileDropdown` do app e no momento em que o axe varre a tela. Havia também uma mutação
esquecida no working tree (D2), que não é desta etapa.

## Defeitos encontrados

### D1. Varredura do axe corre contra o carregamento do menu de perfil (instável, reprova o CI)

- **Sintoma:** `[critical] button-name` em `/pt-br/entities` e `/pt-br/entities/create` no dark, alvo
  `#radix-_R_1pl5rknebn9mlb_`, elemento `<button … aria-haspopup="menu" data-slot="dropdown-menu-trigger">`.
- **Causa:** o gatilho do `apps/app/shared/components/ui/ProfileDropdown.tsx` só tem nome acessível depois que
  o usuário do Firebase e o `GET /account` carregam; antes disso `initials` é `""` e o `span` com o nome fica
  vazio. No trace da falha, o `axe.runPartial` começou às 12:05:11.305Z, o `accounts:lookup` no emulador
  respondeu às 12:05:11.706Z e o `GET /account` às 12:05:11.764Z. O axe viu o botão vazio. No
  `error-context.md`, capturado depois, o mesmo botão já tinha nome.
- **Frequência medida:** execução 1 (`CI=1`, compilação fria, 342 s): `/pt-br/entities/create` falhou nas duas
  tentativas e `/pt-br/entities` falhou e passou no retry (`1 failed, 1 flaky, 20 passed`, código 1). Execução
  2 (`CI=1`, compilação quente, 70 s): 22/22. Repetição quente
  `playwright test tests/a11yDark.spec.ts --grep "as a common user" --repeat-each=6`: 1 falha em 18, mesma
  regra e mesmo alvo.
- **Repro:** `CI=1 pnpm e2e` com o `.next` do app frio, ou a repetição acima.
- **Correção sugerida (não aplicada nesta etapa):** dar nome acessível fixo ao gatilho do `ProfileDropdown`
  (`aria-label` vindo do dicionário), o que também cobre o mobile, onde o nome fica em `hidden md:inline` e só
  as iniciais contam. Na suíte, o `ready` das rotas autenticadas do `a11yDark.spec.ts` e o
  `entityCrud.spec.ts` poderiam esperar o gatilho do perfil ter nome antes de varrer. A primeira resolve na
  raiz; a segunda só esconde o sintoma.

### D2. Mutação esquecida em `EntityFormFields.tsx`

O working tree chegou a esta etapa com
`apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(components)/EntityFormFields.tsx` sem o
`label={entitiesForm.description}` do `HookFormTextarea`, alterado depois da revisão. O arquivo não estava no
handoff, no `review.md` nem no plano de commits. Havia também um `apps/e2e/test-results/` de uma execução
abortada. A remoção causa `[critical] label` em `/pt-br/entities/create` e `/pt-br/entities/edit/[id]`
(medido no item 4b abaixo).

Não corrigi nesta etapa; durante as medições usei a versão do `HEAD` e, no fim, devolvi o arquivo como o
encontrei. O orquestrador do `/cycle` reverteu o arquivo para o `HEAD` com `git checkout --` logo depois.

### Achados menores

- **Telemetria do Next sai da máquina.** O `lsof` pegou app, web e API conectados a `64.239.123.65:443`
  (`telemetry.nextjs.org`, Vercel) e app e web a `104.16.x.34:443` (`registry.npmjs.org`, checagem de versão
  do `next dev`). Nenhum endereço do Google. Sugestão: `NEXT_TELEMETRY_DISABLED=1` no `buildStackEnv`.
- **Login quebrado demora 5,1 min para reprovar.** O `toHaveURL` do setup usa `FIRST_COMPILE_TIMEOUT`
  (300 s), então uma regressão de login custa esse tempo no job antes do vermelho.
- **O critério 7, como escrito, não prova a regra `label`.** O campo `name` tem `placeholder`, que o axe aceita
  como nome acessível. Tirar o `label` dele reprova a suíte pelo locator `getByLabel('Nome')`, não pela
  verificação de acessibilidade.

## Verificar no `/test`

| # | Item do `review.md` | Veredito | Medição |
|---|---------------------|----------|---------|
| 1 | Critério 1 com servidor que responde 200 | ✅ | Servidor de teste respondendo 200 em 3000, 3001 e 3002: saída em 1 s, código 1, `Error: http://localhost:3002/health/ready is already used, make sure that nothing is running on the port/url or set reuseExistingServer:true in config.webServer.`, nenhum teste listado. Só 3000 e 3001 ocupadas: a API subiu, a suíte saiu em 4 s com a mesma mensagem para `http://localhost:3000/pt-br/sign-in` e a 3002 ficou livre depois. Usei um servidor Python mínimo no lugar de um `pnpm dev`, para não subir o app com o `.env` real; o Playwright só olha o status da URL |
| 2 | Critério 2 completo | ✅ / 🔒 | `lsof -nP -a -p <listener + filhos> -i TCP` a cada 20 s na execução 1 (36 amostras) e a cada 3 s na execução 2 (57 amostras). API: saída só para `127.0.0.1:8080`, `127.0.0.1:9099` e a telemetria do Next. App: `127.0.0.1:9099`, `[::1]:3002` e loopback interno, mais telemetria e `registry.npmjs.org`. Nenhum IP do Google (`identitytoolkit`, `securetoken` e `firestore.googleapis.com` resolvem para 172.217.x e 142.251.x; nenhum apareceu). No browser, o trace da falha mostra só `localhost:3000`, `localhost:3002` e `127.0.0.1:9099` (`accounts:lookup?key=demo-api-key`). O `accounts:query` do emulador listou uma conta `e2e-signup-<timestamp>@example.com` depois de cada execução. A ausência da conta no projeto real fica 🔒: não consultei o projeto real. Limite: amostragem por `lsof` não pega conexão que abre e fecha entre duas amostras |
| 3 | Critério 3, `DEMO_PROJECT_ID` adulterado | ✅ | Com `real-project`: saída em 1 s, código 1, `The e2e environment for apps/api is not an emulator target.` seguido de `Refusing to seed: the target project is "real-project".`, stack em `playwright.config.ts:20`. Nenhuma linha `[api]`, `[app]` ou `[web]` no log. Revertido; `git diff` do arquivo igual ao de antes |
| 4a | Critério 5, login quebrado | ✅ | `onSubmit` do `SignInForm` trocado por `event.preventDefault()`. `playwright test tests/signIn.spec.ts tests/entityCrud.spec.ts tests/panelSwitch.spec.ts`: código 1 em 327 s, `✘ [setup] › sign in as the common user (5.1m)` com `Expected: "http://localhost:3000/pt-br"`, `Received: "http://localhost:3000/pt-br/sign-in"`, `1 failed`, `8 did not run`. Os três specs não chegam a falhar individualmente: o setup reprova antes, como o review previa. Revertido, arquivo igual ao `HEAD` |
| 4b | Critério 7, `label` fora do `name` | ❌ como escrito | Suíte vermelha (código 1, 102 s), mas pela razão errada: `expect(locator).toBeVisible() failed`, `Locator: getByLabel('Nome')`, em `entityCrud` e no dark de `/pt-br/entities/create`. A regra `label` não aparece, porque o `placeholder` do campo satisfaz o axe. A capacidade que o critério quer provar funciona com um campo sem placeholder: tirando o `label` do `description`, `[critical] label @ /pt-br/entities/create (dark)`, `(light)` e `@ /pt-br/entities/edit/[id] (light)`, alvo `#description`, `Form elements must have labels`. O `entityCrud` seguiu até a edição por causa do `expect.soft` e terminou `✘` (46 s, `2 failed`). Revertido |
| 5 | Critério 6, trace da falha | ✅ | Pasta da falha do D1 com `trace.zip` (985 KB), `test-failed-1.png`, `video.webm`, `error-context.md`; `playwright-report/index.html` regravado. Lido por linha de comando (sem abrir o viewer): 65 requisições com URL, método e status, e 4 mensagens de console. No trace do critério 5: 47 requisições, `POST /api/auth/custom-token`, nenhum `signInWithPassword` (coerente com o submit quebrado), 9 mensagens de console, entre elas o 401 e o aviso do React sobre a prop injetada na mutação |
| 6 | Critério 11, execução dos jobs | 🔒 | Só depois do push. Por leitura: `changes`, `e2e` e `coverage` com `needs: changes` e `if` de job, `permissions: contents: read`, nenhum `secrets.`. O filtro do `changes` rodado em bash com listas de exemplo: só docs/specs/`.claude`/`*.md` dá `product=false`; `docs/a.md` com `apps/app/page.tsx` dá `true`; `ci.yml` e `pnpm-lock.yaml` dão `true` |
| 7 | Duração no runner | 🔒 | Só depois do push. Local: 342 s (5,7 min) com compilação fria e 70 s com quente, contra 10,2 min do handoff. Teto do job: 25 min |
| 8 | Instabilidade, `CI=1` duas vezes | ❌ | Execução 1: `1 failed, 1 flaky, 20 passed`. Execução 2: 22/22. Ver D1 |

Placar: 5 ✅ (1, 2, 3, 4a, 5), 2 ❌ (4b como escrito, 8), 2 🔒 (6, 7), mais a parte do projeto real do item 2.

## Critérios de aceite, item a item

| Critério | Status | Meio |
|----------|--------|------|
| A suíte sobe o próprio ambiente e fecha verde | PASS, com ressalva | e2e (execução 2: 22/22; execução 1 vermelha por D1) |
| Porta ocupada interrompe a suíte sem reaproveitar o servidor | PASS | e2e (item 1) |
| Nenhuma conexão com o projeto Firebase real | PASS no que dá para medir; ausência no projeto real 🔒 | e2e + `lsof` + API do emulador (item 2) |
| Alvo fora do emulador é recusado antes de subir servidor | PASS | e2e (item 3) + unitário `stackEnv.test.ts` |
| Os 9 fluxos cobertos passam com URL e texto esperados | PASS | e2e: os 9 passaram nas duas execuções |
| Login quebrado deixa a suíte vermelha | PASS | e2e com mutação (item 4a) |
| Falha deixa evidência navegável | PASS | e2e + leitura do `trace.zip` (item 5) |
| Campo sem nome acessível reprova a verificação de acessibilidade | PASS com `description`; FALHOU como escrito com `name` | e2e com mutação (item 4b) |
| Allowlist tolera só o que declara | PASS | unitário `a11yFilter.test.ts` (8 testes, incluindo `minor`/`moderate`, rota, tema e exceção obsoleta) + leitura: 8 entradas, todas com `ruleId`, `selector` e `reason`. Anotação `a11y-stale-exception` não observada em execução real |
| Resultado da acessibilidade é estável entre execuções | FALHOU | e2e (item 8, D1) |
| Cobertura consolidada é determinística | PASS | `pnpm coverage`: 182 arquivos, 1833 testes, linhas 65,18%, statements 65,2%, funções 54,68%, branches 61,77%, igual às duas execuções do handoff. Tabela: 14 workspaces e o total, sem `apps/e2e` |
| O gate do CI continua sem browser | PASS | `pnpm turbo run lint typecheck test`: 26/26, `e2e:test` e `e2e:typecheck` presentes, 0 ocorrência de `chromium`/`webServer`/`playwright test` no log |
| Jobs do CI e pulo em PR de documentação | PASS por leitura; execução 🔒 | leitura do YAML + filtro em bash (item 6) |
| Documentação separa a suíte da passada com agent-browser | PASS | leitura dos diffs de `CLAUDE.md`, `review-checklist.md`, `AI-WORKFLOW.md`, `SETUP.md` |
| Branch protection pede os dois checks | PASS por leitura; bloqueio real 🔒 (P1) | leitura de `PRE-PRODUCTION.md` §9 e `SETUP.md:181` |

## Cobertura e gates

Todos sem `--force`.

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter e2e test` | 16/16 (8 `a11yFilter`, 8 `stackEnv`), 162 ms |
| `pnpm --filter e2e typecheck` | sem erro |
| `pnpm test` (raiz) | 11/11 tasks, 10 em cache; `app:test` rodou (559 testes, 73 arquivos). Total 1833 testes em 182 arquivos: api 804, app 559, email 137, auth 101, shared 44, internationalization 44, web 41, analytics 34, security 31, payments 22, e2e 16 |
| `pnpm turbo run lint typecheck test` | 26/26, 25 em cache, 900 ms |
| `pnpm coverage` + `node scripts/coverage-summary.mjs` | ver tabela acima, 28 s |
| Paridade de i18n | não se aplica: nenhuma chave mudou |
| `pnpm e2e` | 2 execuções completas com `CI=1`, 1 repetição direcionada e 5 execuções com mutação, descritas acima |

## Decisões de custo de teste

- Não criei teste. O `stackEnv.ts` e o `a11yFilter.ts` já têm unitário; o que faltava provar (config
  recusando, porta ocupada, rede, trace) só se prova executando a suíte, que é a própria infra em teste.
- `playwright.config.ts` e `global.setup.ts`: um unitário da config teria de importar `@playwright/test` e
  simular o carregamento, e não provaria mais que os itens 1 e 3, que medi executando.

## Lacunas herdadas

| Lacuna | Veredito |
|--------|----------|
| `playwright.config.ts` e `global.setup.ts` sem unitário | Fechada por execução: recusa da config (item 3), porta ocupada (item 1), seed e aquecimento nas duas execuções completas. Unitário continua inexistente, por decisão de custo |
| `scripts/coverage-summary.mjs` sem teste | Continua aberta, risco baixo. A tabela desta rodada bate com o total do v8 (diferença só de arredondamento, 65,19% contra 65,18%) |
| Suíte só em `pt-br`, desktop, onboarding ligado | Fora de escopo (D12 do plano) |

## Ambiente do e2e

- Todas as portas (3000, 3001, 3002, 3003, 3100 a 3102, 8080, 9099, 4001, 4400, 4500, 9150) estavam livres no
  início; não havia ambiente do usuário para reaproveitar.
- O emulador subiu com `pnpm emulators` e JDK 21, ficou de pé durante todas as execuções e foi derrubado com
  `SIGINT` no processo do firebase-tools; o log mostrou o desligamento de Firestore, Auth, hub e logging, e os
  processos sumiram.
- Servidores de teste Python nas portas 3000 a 3002, para o item 1, foram derrubados por PID logo depois.
- API, app e web foram subidos e derrubados pelo Playwright a cada execução.
- No fim, `lsof -ti tcp:<porta> -sTCP:LISTEN` saiu vazio em todas as portas acima, e o `ps` não mostrou
  `cloud-firestore-emulator`, `next dev` nem `playwright`.
- `apps/e2e/test-results/` foi apagado (gitignored). Ficaram `apps/e2e/playwright-report/`, `apps/e2e/.auth/` e
  `coverage/`, todos gitignored.

## Mutações temporárias

Três arquivos mutados, um de cada vez, e revertidos: `apps/e2e/support/stackEnv.ts`, `SignInForm.tsx` e
`EntityFormFields.tsx`. No fim, `git status --porcelain`, o `shasum` do `git diff`, o `git diff --cached
--stat` e o `shasum` de cada arquivo de `apps/e2e` bateram com o retrato tirado antes da primeira mutação,
incluindo a mutação esquecida do D2, revertida depois pelo orquestrador.

## Dados de QA

Só no emulador, que não exporta dados e morreu com o processo: duas contas `e2e-signup-<timestamp>@example.com`
e as `entity` "E2E <timestamp>" que o próprio teste cria e exclui. Nenhuma conta no projeto Firebase real e
nada em `docs/PRE-PRODUCTION.md` para limpar.

## Rodada 2

Medição das correções da seção "Rodada 2" do `review/review.md`: `aria-label` no gatilho do `ProfileDropdown`,
chave `profileDropdown.triggerLabel` nos três idiomas e `NEXT_TELEMETRY_DISABLED` no `stackEnv.ts`.

**Veredito: `blocked`.** O D1 está resolvido, mas a primeira execução com `CI=1` voltou `1 flaky, 21
passed` com código 1, agora por outro teste (D3). Com `failOnFlakyTests`, isso reprova o job `e2e`.

### D3. Hidratação da web corre contra o axe em `web:/pt-br/sign-up` (instável, reprova o CI)

- **Sintoma:** `[critical] button-name @ web:/pt-br/sign-up (dark)`, alvo `#radix-_R_16jd9etb_`, elemento
  `<button … data-slot="dropdown-menu-trigger"></button>`, vazio. No retry, passou.
- **Causa:** o `LanguageSwitcher` da web
  (`apps/web/app/[locale]/components/header/language-switcher.tsx`) põe um `<Button>` dentro do
  `DropdownMenuTrigger`, que já renderiza um `button`. No HTML do servidor, o parser fecha o `button` externo
  ao encontrar o interno, e o gatilho fica vazio. O console do trace mostra `In HTML, <button> cannot be a
  descendant of <button>. This will cause a hydration error.` e `Hydration failed because the server rendered
  HTML didn't match the client. As a result this tree will be regenerated on the client.` O snapshot de DOM
  do trace, no momento da varredura, tem o `BUTTON#radix-_R_16jd9etb_` sem filhos, dentro de
  `header > … > div.hidden.md:inline`. O axe varreu antes de o React refazer a árvore. O `ready` da rota
  (`getByLabel` do e-mail) já está visível no HTML do servidor, então não espera a hidratação.
- **Frequência medida:** execução completa com `.next` do app frio: 1 flaky em 22. Repetição
  `playwright test tests/a11yDark.spec.ts --grep "signed out" --repeat-each=6`: 1 falha em 24, na primeira
  visita a `web:/pt-br/sign-up`, com três `button-name` e dois `nested-interactive` fora da allowlist (o DOM
  antes da hidratação não casa os seletores das exceções).
- **Já estava lá na rodada 1**, sem aparecer: é o mesmo `Button` dentro do trigger que a allowlist tolera como
  `nested-interactive` (`button:has(a, button)`) e que o backlog já registra ("Correção: `Button asChild`").
- **Repro:** `CI=1 pnpm e2e` logo depois de subir a web, ou a repetição acima.
- **Correção sugerida (não aplicada):** `DropdownMenuTrigger asChild` no `LanguageSwitcher` da web, o que
  tira o `button` aninhado, o erro de hidratação e a entrada `nested-interactive` do seletor de idioma. Na
  suíte, esperar a hidratação antes de varrer só esconde o sintoma.

### Itens medidos

| # | Item | Veredito | Medição |
|---|------|----------|---------|
| 1a | D1 com `.next` do app frio | ✅ para o D1, ❌ para a suíte | Apaguei `apps/app/.next` (180 MB). `CI=1 pnpm e2e`: 71 s, código 1, `1 flaky, 21 passed`. Nenhum `button-name` em `/pt-br/entities` nem em `/pt-br/entities/create`, que eram as rotas do D1. O flaky é o D3 |
| 1b | Repetição das rotas do comum | ✅ | `--grep "as a common user" --repeat-each=6`: 0 falhas em 18 (22 passed contando o setup), código 0. Na rodada 1 tinha dado 1 em 18 |
| 2 | Unitários | ✅ | `profileDropdownAccount` + `profileDropdownCookieConsent`: 11/11. `pnpm --filter e2e test`: 16/16. `pnpm --filter @repo/internationalization test`: 44/44. `pnpm test` da raiz: 11/11 tasks; `app` 563 testes (559 + 1 do revisor + 3 meus) |
| 3 | Telemetria | ✅ | `lsof` a cada 3 s durante a execução 1a (59 amostras): nenhuma conexão com `64.239.x` (`telemetry.nextjs.org`). App e web ainda falam com `104.16.0.34:443` (`registry.npmjs.org`, checagem de versão do `next dev`), como o review já previa. API: só `127.0.0.1:8080` e `127.0.0.1:9099` |
| 4 | Nome nos 3 idiomas e mobile | ✅ | Unitário parametrizado novo (abaixo): com o cookie `x-locale` em `pt-br`, `en` e `es`, `getByRole("button", { name })` acha o gatilho sem conta e sem usuário, com "Abrir menu do perfil", "Open profile menu" e "Abrir menú del perfil". Como os três textos são diferentes, o caso `en` só passa se o locale do cookie foi lido. Mobile por leitura: o `aria-label` fica no `DropdownMenuTrigger` (`ProfileDropdown.tsx:42`), fora de qualquer classe responsiva; só o `span` do nome tem `hidden md:inline` |
| 5 | Critério 7 com `description` | ✅ | Medido na rodada 1, item 4b: `[critical] label` em `/pt-br/entities/create` (light e dark) e `/pt-br/entities/edit/[id]`, alvo `#description`, e o teste termina `✘` apesar do `expect.soft` |

Placar da rodada 2: 5 ✅ (1b, 2, 3, 4, 5) e 1 ❌ (1a, pela suíte, por causa do D3). O D1 está fechado.

### Sem passada com agent-browser

O `aria-label` não muda nada que se veja: não tem classe, não muda layout, e light, dark e mobile continuam
como estavam. O nome acessível nos três idiomas fica provado no unitário, e o mobile por leitura. As
varreduras do axe nas rotas autenticadas, em light (`entityCrud`) e dark (`a11yDark`), passaram nas duas
medições acima sem `button-name` no gatilho. Não achei motivo para subir o app com `agent-browser`.

### Teste criado

`apps/app/__tests__/profileDropdownAccount.test.tsx`: `it.each(["pt-br", "en", "es"])` "nomeia o gatilho no
idioma do cookie x-locale". Usa o `setCookie` de `@repo/shared/utils/helpers/cookies`, o mesmo helper de
`usersListLastAccess.test.tsx`, e apaga o cookie no `finally`. A primeira versão atribuía a `document.cookie`
direto, e o Biome reprovou (`lint/suspicious/noDocumentCookie`, 2 erros) no `pnpm turbo run lint typecheck
test`; troquei pelo helper antes de fechar. Faixa barata: jsdom, sem servidor.

### Gates da rodada 2

Sem `--force`.

| Comando | Resultado |
|---------|-----------|
| `pnpm check` | 723 arquivos, "No fixes applied" |
| `pnpm turbo run lint typecheck test` | 26/26, 23 em cache |
| `pnpm test` | 11/11 tasks, 1837 testes (app 563) |
| `pnpm e2e` | 1 execução completa com `CI=1` e 2 repetições direcionadas, descritas acima |

### Ambiente da rodada 2

- Portas 3000 a 3003, 3100 a 3102, 8080, 9099, 4001, 4400, 4500 e 9150 livres no início.
- Emulador subido por mim com JDK 21: PIDs 72150 (pnpm), 72170 (firebase-tools), 72259 (Java do Firestore).
  Derrubei com `SIGINT` no 72170; o log registrou o desligamento, e os PIDs e as portas sumiram.
- API, app e web subidos e derrubados pelo Playwright em cada execução.
- No fim, todas as portas da lista vazias no `lsof`, e nenhum `cloud-firestore-emulator`, `next dev` nem
  `playwright` no `ps`. `apps/e2e/test-results/` apagado; `apps/app/.next` vai ser recriado no próximo `dev`.
- Dados: só as contas `e2e-signup-*` no emulador, apagadas pelo seed da execução seguinte e depois pelo fim do
  processo.

### Mutações

Nenhuma nesta rodada. A única mudança em arquivo versionado é o teste novo acima. `git status --porcelain` e
`git diff --cached --stat` batem com o retrato tirado no início.

### Lacunas

| Lacuna | Veredito |
|--------|----------|
| Login quebrado leva 5,1 min para reprovar | Continua aberta (achado do review, sem correção) |
| `registry.npmjs.org` durante `next dev` | Continua aberta: `NEXT_TELEMETRY_DISABLED` não desliga a checagem de versão |
| `scripts/coverage-summary.mjs` sem teste | Continua aberta, risco baixo |
| Nome acessível que não contém o primeiro nome visível (`label-content-name-mismatch`) | Continua aberta, 🟢 do review. A regra é experimental e não roda com as tags da suíte |
