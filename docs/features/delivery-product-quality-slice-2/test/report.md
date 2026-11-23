# Relatório do `/test`: parte 3 da entrega, fatia 2

Branch `feat/delivery-product-quality-slice-2`, working tree sobre `a391d1c`. Rodou dentro do `/cycle`, sem perguntas
ao usuário. Nenhum arquivo de produção ficou alterado por este `/test` (ver "Diagnóstico do Ctrl+C").

**Resultado: `done`.** A rodada 1 achou um defeito em `apps/e2e/lighthouse/run.mjs` (Ctrl+C no `pnpm lighthouse`
deixava o `next start` órfão na 3001, justamente o caso que a revisão tinha declarado corrigido). O `/review` corrigiu
e a rodada 2 confirmou a correção. O resto da fatia passou na rodada 1.

## Placar

| Status | Itens |
|--------|-------|
| ✅ | 1 (helper com `--repeat-each=5`), 2 (V1), 3 (V3), 4 (V2), 5 (Ctrl+C derruba o `next start`, rodada 2), 6 (V4), 7 (V5), 8 (V7), V6, ramo "Lighthouse sai com código ≠ 0", sem build, sem navegador, `--locale` inválido, Vitest dos workspaces, `pnpm test` da raiz, typecheck |
| ❌ | nenhum (o item 5 falhou na rodada 1 e passou na rodada 2) |
| 🔒 | `pnpm lighthouse --url` contra preview pública da Vercel |

## Verificar no `/test` (lista do `review.md`)

| # | Item | Veredito | Medido |
|---|------|----------|--------|
| 1 | Estabilidade do helper da barra lateral | ✅ confirmado | 29 de 29 passaram (4 do `setup` + 5 testes × 5 repetições), 3,3 min. Contei as ações de clique em "Alternar barra lateral" no trace de cada uma das 10 execuções que usam o helper: 9 com um toque, 1 com dois (`signIn` "a common user…", repetição 4; o segundo toque veio 3,5 s depois do primeiro). O toque perdido acontece de verdade, perto de 1 em 10, e o retry o cobre sem esconder menu quebrado |
| 2 | V1, projeto `mobile` inteiro | ✅ confirmado | Na mesma execução do item 4: os 9 testes `[mobile]` de `entityCrud` (1), `landing` (3), `signIn` (4) e `signUp` (1) passaram |
| 3 | V3, reflow reprova vazamento, e a frase sobre `innerWidth` | ✅ confirmado | Spec temporária `tests/zzReflowProbe.landing.spec.ts` (apagada). Em `[mobile]`, sem injeção: passou, com `innerWidth 390, clientWidth 390, scrollWidth 390`. Com `<div style="width:600px">`: reprovou com `Error: web:/pt-br#leak600 scrolls horizontally`, e as medidas viraram `innerWidth 600, clientWidth 390, scrollWidth 600`. Em `[chromium]` as duas variantes passaram (1280 nas três medidas; a checagem não roda no desktop). A frase de `a11y.ts:109-110` se sustenta no que importa: o `innerWidth` cresce com o vazamento e o `clientWidth` não. Nit: depois da injeção, `visualViewport.scale` ficou em 1, então o "zooms out" não aparece nessa medida; não muda a escolha do `clientWidth` |
| 4 | V2, `landing` e `entityCrud` no desktop | ✅ confirmado | `[chromium]`: `entityCrud` (1), `landing` (3), `signIn` (4) e `signUp` (1) passaram. O helper no desktop só afirma o link |
| 5 | Ctrl+C durante a subida e durante a medição | ✅ confirmado na rodada 2 | Rodada 1: 3 de 3 órfãos na subida e 2 de 3 durante "Measuring" (ver "Defeito"). Rodada 2, depois da correção: 6 de 6 com a 3001 livre (ver "Rodada 2") |
| 6 | V4 depois da correção em `run.mjs` | ✅ confirmado | `pnpm lighthouse`: exit 0 em 57 s, `summary.md` e três JSON gravados, `lsof -ti tcp:3001` vazio no fim, `git status` não mostra `lighthouse-results/` |
| 7 | V5, `--url` contra `next start` subido à mão | ✅ confirmado | O `pnpm` da raiz repassa o argumento (`> node lighthouse/run.mjs --url http://localhost:3001`), três "Measuring", exit 0, cabeçalho `http://localhost:3001 (server already running)`. O servidor subido à mão continuou de pé depois |
| 8 | V7, sitemap no build | ✅ confirmado | `curl -s localhost:3001/sitemap.xml`: 15 `<loc>` (`/pt-br`, `/en`, `/es` e `pricing`, `contact`, `legal/privacy`, `legal/terms` nos três idiomas), 0 `<lastmod>`, 0 `sign-in`/`sign-up`, 15 `hreflang` para cada idioma. `changefreq`: 3 `weekly`, 3 `monthly`, 9 `yearly`; `priority`: 3 × 1, 3 × 0.8, 3 × 0.5, 6 × 0.3 |

## Defeito

### `run.mjs`: Ctrl+C no `pnpm lighthouse` deixa o `next start` órfão

**Repro.** Porta 3001 livre, `apps/web/.next` com build. Num shell com controle de job, `pnpm lighthouse &` e, assim
que existir um processo `next start -p 3001`, `kill -INT -<pgid do job>` (o mesmo que o Ctrl+C do terminal faz).
Esperar 3 s e rodar `lsof -ti tcp:3001`: sai o PID do `next-server`, que continua com o `pnpm --filter web exec next
start -p 3001` como pai, no grupo próprio criado pelo `detached: true`. O `pnpm` informa
`Command failed with signal "SIGINT"`: o `node` do runner morreu pelo sinal, sem passar pelo `stopOnSignal`.

**Contagem.** Subida: 3 de 3 órfãos. Durante "Measuring": 2 de 3 órfãos. Chamando `node apps/e2e/lighthouse/run.mjs`
direto, sem `pnpm` no meio, a interrupção na subida derrubou o servidor (exit 1, 3001 livre).

**Diagnóstico do Ctrl+C.** Instrumentei uma cópia do `run.mjs` no lugar e restaurei o original depois (`cmp` com o
backup confirmou o arquivo idêntico):

- só com log no `stopOnSignal` e no evento `exit`: o handler foi registrado e nunca executou, e o `exit` não disparou.
  O processo morreu pelo sinal;
- com listeners permanentes de `SIGINT`/`SIGTERM`: o `node` recebeu `SIGINT`, `SIGINT` e `SIGTERM` no mesmo
  milissegundo. Os dois `pnpm` da cadeia (`pnpm lighthouse` → `pnpm --filter e2e lighthouse` → `node`) repassam o
  sinal ao filho, que já tinha recebido o do terminal.

Hipótese: com `process.once`, o primeiro sinal remove o listener e o Node devolve a disposição padrão; o sinal
repassado pelo `pnpm` chega nessa janela e mata o processo antes de o `stopServer` mandar `SIGTERM` ao grupo.

**Correção sugerida (hipótese testada).** Trocar `process.once` por `process.on` nas linhas 293-294 e tornar o
`stopOnSignal` idempotente (uma flag que ignora o segundo sinal enquanto o primeiro derruba o servidor). Com só a
troca `once` → `on`, medi 2 de 2 interrupções na subida e 1 de 1 durante "Measuring" com exit 1 e a 3001 livre. O
arquivo voltou ao original depois do teste; a correção é do `/review`.

## Cobertura e comandos

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter web test` | 33 arquivos, 296 testes, todos passaram |
| `pnpm --filter e2e test` | 3 arquivos, 38 testes, todos passaram (21 em `lighthouseSummary.test.ts`) |
| `pnpm --filter e2e e2e --project=mobile tests/signIn.spec.ts tests/signUp.spec.ts --repeat-each=5 --trace=on` (JDK 21) | 29 passaram, 3,3 min |
| `pnpm --filter e2e e2e --project=mobile --project=chromium tests/landing.spec.ts tests/entityCrud.spec.ts tests/signIn.spec.ts tests/signUp.spec.ts tests/zzReflowProbe.landing.spec.ts` (JDK 21) | 25 passaram, 1 falhou de propósito (a injeção de 600 px no `mobile`), 3,4 min |
| `pnpm lighthouse` (V4) | exit 0, 57 s |
| `pnpm lighthouse` com a 3001 ocupada (V6) | exit 1, `Port 3001 is already in use. Stop that server or pass --port <free port>.` |
| `pnpm lighthouse --url http://localhost:3001` (V5) | exit 0, `server already running` |
| `CHROME_PATH=/usr/bin/false pnpm lighthouse --url http://localhost:3001` | exit 1; as três linhas com "not measured" em todas as colunas e a seção "Not measured" com `lighthouse exited with code 1: at poll (…chrome-launcher.js:363:17)` |
| `pnpm lighthouse --url http://localhost:3001 --locale xx` | exit 1, `--locale must be one of pt-br, en, es; got "xx".` |
| `node apps/e2e/lighthouse/run.mjs` sem `apps/web/.next/BUILD_ID` | exit 1, `apps/web has no production build. Run \`pnpm --filter web build\` first.` (o `BUILD_ID` voltou ao lugar) |
| `CHROME_PATH=/nope node apps/e2e/lighthouse/run.mjs` | exit 1, `No browser at /nope. Run \`pnpm --filter e2e exec playwright install chromium\` or set CHROME_PATH.` |
| `pnpm test` (raiz, sem `--force`, JDK 21) | 15 tarefas, 15 com sucesso, 12 do cache, 50 s; 4 375 testes no total, incluindo os 274 do `api:test:emulator` |
| `pnpm turbo run typecheck --filter=e2e --filter=web` | 2 tarefas, 2 do cache, exit 0 |

Não rodei `pnpm check` de novo: o `/review` mediu e este `/test` não deixou arquivo novo no repositório. Paridade de i18n
não se aplica, o diff não toca `packages/internationalization`.

### Saída do `pnpm lighthouse` (V4)

Medição de máquina local; varia entre execuções. A home foi de 57 (medida do `/develop`) para 84 aqui, e para 91 na
V5 contra o servidor subido à mão.

```markdown
Lighthouse 12.8.2 · 2026-11-23T18:36:54.625Z · commit a391d1c · http://localhost:3001 (next start started by the command)

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
|------|---|---|---|---|---|---|---|
| /pt-br | 84 🟡 | 100 ✅ | 96 ✅ | 100 ✅ | 4.5 s 🟡 | 0.000 ✅ | 70 ms ✅ |
| /pt-br/pricing | 93 ✅ | 100 ✅ | 96 ✅ | 100 ✅ | 3.2 s 🟡 | 0.000 ✅ | 19 ms ✅ |
| /pt-br/contact | 96 ✅ | 100 ✅ | 93 🟡 | 100 ✅ | 2.8 s 🟡 | 0.000 ✅ | 19 ms ✅ |
```

## Critérios de aceite, item a item

| Critério | Status | Meio |
|----------|--------|------|
| Os fluxos críticos rodam a 390 px no Playwright | PASS | E2E (itens 1, 2) |
| No celular, o teste abre a barra lateral antes de procurar um link dela | PASS | E2E + trace (item 1) |
| O axe roda a 390 px nas telas dos fluxos críticos | PASS | E2E (item 2), allowlist vazia |
| Rolagem horizontal reprova no celular | PASS | E2E com spec temporária (item 3) |
| `pnpm lighthouse` mede o build de produção da landing | PASS | execução (V4, V6, sem build) |
| Ctrl+C no `pnpm lighthouse` derruba o `next start` | PASS | execução (item 5, rodada 2) |
| `--url` mede um servidor que já está de pé | PASS | execução (V5, `--locale xx`) |
| A saída é uma tabela que o relatório de entrega cita | PASS | execução (V4) + unit (`lighthouseSummary.test.ts`) |
| Medição incompleta não aparece como aprovada | PASS | execução (`CHROME_PATH=/usr/bin/false`) + unit |
| O Chromium do Playwright serve de navegador | PASS | execução (V4 sem `CHROME_PATH`, `CHROME_PATH=/nope`) |
| O sitemap lista exatamente as páginas públicas indexáveis | PASS | unit (`sitemap.test.ts`) + V7 |
| As páginas excluídas são de fato não indexáveis | PASS | unit + V7 (nenhum `sign-in`/`sign-up`) |
| `lastModified` deixa de ser a hora da geração | PASS | unit + V7 |
| Documentação aponta para os comandos novos | PASS | leitura + `grep` de `npx lighthouse` (só aparece com versão, em `specs/delivery-product-quality.md:205`) |
| `pnpm lighthouse --url` contra preview da Vercel | não coberto 🔒 | exige deploy |

## Decisões de custo de teste

- **Nenhum teste novo criado.** `summary.mjs` (limiares, tabela, "not measured") já tem 21 testes unitários e
  `sitemap.ts` tem `sitemap.test.ts`, que o `/develop` provou reprovar com página nova e com `lastModified` de volta.
- **`run.mjs`**: o defeito achado é de ciclo de processo e sinais, entre `pnpm`, `node` e um grupo `detached`. Um
  unitário com `child_process` mockado não reproduz o sinal repassado pelo `pnpm`, e o `main()` roda no import do
  módulo. Cobrir isso pede um teste que sobe processo de verdade, o que só faz sentido junto da correção. Fica como
  sugestão para o `/review`: depois de trocar `once` por `on`, um teste em `apps/e2e/__tests__` que dispara o runner
  com `spawn` e `detached`, manda `SIGINT` ao grupo e confere a porta. É faixa cara; o que ele prova (o sinal duplo
  do `pnpm`) não tem versão barata.
- **Projeto `mobile`**: os próprios specs são o teste; a V3 provou a asserção nova com uma spec temporária, apagada.

## Por que não abri o `agent-browser`

O diff não muda tela de produto. A única mudança de runtime é o `sitemap.xml`, conferido com `curl`. O projeto
`mobile` do Playwright já percorreu os quatro fluxos a 390 × 844 no Chromium, com axe e a checagem de reflow. Tema e
idiomas não mudaram.

## Lacunas herdadas

| Lacuna | Veredito |
|--------|----------|
| `run.mjs` sem teste unitário | Continua aberta como teste unitário. O ciclo de sinais foi medido por execução nas duas rodadas; o `/review` decidiu não escrever o teste de faixa cara (motivo no `review.md`, rodada 2) |
| Ramo "Lighthouse sai com código ≠ 0" sem execução | Fechada. `CHROME_PATH=/usr/bin/false` produziu as três linhas "not measured", a seção com o motivo e exit 1 |
| Logs `[app] [request] failed … digest=414930086` | Fora de escopo, como o `review.md` decidiu. Apareceram de novo aqui (`/pt-br`, `/pt-br/admin`, `/pt-br/onboarding`, `/pt-br/entities`) com todos os testes verdes |

## Ambiente do e2e

- Todas as portas (3000, 3001, 3002, 3003, 8080, 9099, 4001, 9199, 4400, 4500) estavam livres no início. Nada do
  usuário foi reutilizado.
- Emulador, `api`, `app` e `web` subiram pelo `webServer` do Playwright nas duas execuções e caíram com ele.
- `next start` da V5 subiu à mão num grupo próprio e caiu com `kill -TERM -<pgid>`. Os `next start` órfãos do item 5
  (seis, um por interrupção que falhou) foram derrubados do mesmo jeito.
- No fim, as dez portas livres e nenhum processo `next start`, `next dev` ou `firebase emulators` de pé.
- Apaguei `apps/{api,app,web}/AGENTS.md` (gerados pelo `next dev`), `apps/e2e/test-results/`,
  `apps/e2e/playwright-report/` e `apps/e2e/lighthouse-results/`. O `apps/web/.next` do build ficou.

## Estado de dev alterado

Nenhum. As contas do `signUp.spec.ts` foram criadas no emulador e morreram com ele. Nenhuma conta em projeto Firebase
real.

## Rodada 2

O `/review` corrigiu `apps/e2e/lighthouse/run.mjs` depois da rodada 1. Os listeners de `SIGINT` e `SIGTERM` passaram
de `process.once` para `process.on`, o `stopOnSignal` ficou idempotente com a flag `interrupted`, e o laço de medição
devolve 1 quando a flag está ligada, para não chamar o `npx` da página seguinte. Esta rodada mediu só o item 5 e a V4,
com o mesmo repro da rodada 1. A suíte E2E não rodou de novo.

### Item 5: Ctrl+C derruba o `next start`

Mesmo procedimento da rodada 1: `pnpm lighthouse` num grupo de processos próprio e SIGINT para o grupo inteiro, como faz
o Ctrl+C do terminal. Na subida, o sinal saiu assim que apareceu um processo `next start -p 3001`; na medição, 3 s
depois da primeira linha "Measuring". Três segundos depois de cada interrupção conferi a porta 3001 e procurei
`next start -p 3001`, `lighthouse@12.8.2` e o Chromium do Playwright (`ms-playwright`).

| Momento | Rodadas | Exit | Depois da interrupção |
|---------|---------|------|-----------------------|
| Subida do `next start` | 3 | 1 nas três | 3001 livre e nenhum processo sobrando, nas três |
| Durante "Measuring" | 3 | 1 nas três | 3001 livre e nenhum processo sobrando, nas três; cada log tem uma linha "Measuring" só |

Na rodada 1 o resultado tinha sido 3 de 3 órfãos na subida e 2 de 3 durante a medição. Agora o `pnpm` informa
`Command failed with exit code 1`, e não mais `signal "SIGINT"`: o runner tratou o sinal e saiu sozinho.

### V4 de novo

`pnpm lighthouse` saiu com código 0 em 58 s, gravou `summary.md` e os três JSON, deixou a 3001 livre e nenhum processo
sobrando. `git status` não mostra `lighthouse-results/`. Medição de máquina local, que varia entre execuções:

```markdown
Lighthouse 12.8.2 · 2026-11-23T18:51:09.249Z · commit a391d1c · http://localhost:3001 (next start started by the command)

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
|------|---|---|---|---|---|---|---|
| /pt-br | 93 ✅ | 100 ✅ | 96 ✅ | 100 ✅ | 3.1 s 🟡 | 0.000 ✅ | 90 ms ✅ |
| /pt-br/pricing | 96 ✅ | 100 ✅ | 96 ✅ | 100 ✅ | 2.8 s 🟡 | 0.000 ✅ | 21 ms ✅ |
| /pt-br/contact | 96 ✅ | 100 ✅ | 93 🟡 | 100 ✅ | 2.8 s 🟡 | 0.000 ✅ | 44 ms ✅ |
```

### Testes

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter e2e test` | 3 arquivos, 38 testes, todos passaram |

### Ambiente

As portas 3000, 3001, 3002, 3003, 8080, 9099 e 4001 estavam livres antes e continuaram livres depois. Todos os
`next start` desta rodada foram subidos pelo próprio `pnpm lighthouse` e caíram com ele; não precisei matar nenhum
processo. Apaguei `apps/e2e/lighthouse-results/` no fim. O `next dev` não rodou, então nenhum `AGENTS.md` foi gerado.
