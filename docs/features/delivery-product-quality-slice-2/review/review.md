# Revisão: parte 3 da entrega, fatia 2 (medição no repositório)

Revisão do working tree sobre `a391d1c` contra `docs/review-checklist.md`, com o `develop/handoff.md` como
ponto de partida. Rodou dentro do `/cycle`, sem perguntas ao usuário. Não subi app, não rodei Vitest nem
Playwright: essa parte é do `/test`.

## Branch

- Nome: `feat/delivery-product-quality-slice-2`, criada com `git switch -c` a partir de
  `guilhermebittelbrunn/cycle-request` (placeholder do Conductor, sem commit além de `origin/main` e sem
  upstream). O working tree veio junto.
- Sem prefixo de projeto porque o diff toca dois apps (`apps/e2e` e `apps/web`). Segue a fatia 1, que entrou
  como `feat/delivery-product-quality`.
- Regex do `/review`: `branch OK: feat/delivery-product-quality-slice-2`.
- O placeholder `guilhermebittelbrunn/cycle-request` continua existindo localmente. Não apaguei.

## Revisão: `apps/e2e`, `apps/web`, raiz

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/e2e/lighthouse/run.mjs:124` (corrigido na rodada 1 sem medição; o `/test` mostrou que não bastava;
  ver "Rodada 2"). O `next start` sobe com `detached: true`, num grupo de
  processos próprio, então o Ctrl+C do terminal não chega nele. O handler de `SIGINT` só derrubava o servidor
  se a variável `server` de `main` já estivesse preenchida, e ela só era preenchida quando
  `startProductionServer` retornava, depois de o servidor responder. Um Ctrl+C durante a espera de até 60 s
  saía com `process.exit(1)` e deixava o `next start` órfão segurando a 3001. O mesmo acontecia quando o
  `pnpm` saía antes de o servidor responder: o erro subia sem matar o grupo. Agora a função recebe um
  `onSpawn` que registra o processo logo depois do `spawn` (`run.mjs:146`), e o `finally` de `main` derruba o
  servidor em todos os caminhos de erro. O `stopServer` interno do caminho de timeout saiu, porque o `finally`
  já cobre esse caso.

### 🟢 Sugestão / nit

- `apps/e2e/support/panelNavigation.ts:22-30`. O `toPass` repete o toque no botão enquanto o `Sheet` está
  fechado. Pela leitura, ele não esconde menu quebrado: só toca quando o diálogo "Barra lateral" não está
  visível, espera até 2 s por ele a cada tentativa e reprova em 30 s se o diálogo nunca abrir. O link é
  procurado depois, sem filtro de escopo, mas no celular a barra de desktop está em `hidden md:block`
  (`packages/design-system/components/ui/sidebar.tsx:234`), então o link só fica visível dentro do `Sheet`.
  O que ele esconde é um menu que precisa de dois toques. A causa provável do primeiro toque perdido está no
  próprio componente: até o `useIsMobile` assumir `true`, o `toggleSidebar` (`sidebar.tsx:116`) alterna o
  estado de desktop, que no celular não aparece. Para uma pessoa de verdade essa janela é de milissegundos.
  Fica como está; o `--repeat-each` do `/test` mede quantas vezes o retry acontece.
- `apps/e2e/__tests__/lighthouseSummary.test.ts:1`. O `biome-ignore-all lint/style/noMagicNumbers` tem motivo
  escrito e segue o precedente de `packages/design-system/__tests__/themeContrast.test.ts:1` e
  `antdTheme.test.tsx:1`. Os números são as fronteiras dos limiares, e nomear cada um esconderia o valor que
  o teste afirma. Aceito.
- `apps/e2e/lighthouse/run.mjs:287-294`. Um `SIGTERM` mandado só para o `node` (sem passar pelo terminal) não
  chega ao `npx lighthouse` filho, que não é `detached` e pode deixar um Chromium aberto até terminar a
  página. Com Ctrl+C o terminal manda o sinal para o grupo inteiro e o filho cai junto. Não corrigi: o uso
  documentado é interativo.

### ✅ OK

- Limiares de `apps/e2e/lighthouse/summary.mjs:12-48` batem com a tabela de `docs/delivery/03-product-quality.md`
  §3.4 (Performance ≥ 90, 🟡 de 50 a 89, 🔴 abaixo; demais categorias ≥ 95, 🟡; LCP < 2,5 s 🟡; CLS < 0,1 🟡;
  TBT < 200 ms 🟢).
- O código de saída segue o que o `docs/SETUP.md` promete: `main` devolve 1 só quando alguma página não foi
  medida por inteiro (`isComplete`), nunca por pontuação baixa.
- `CHROME_PATH` vazio cai no Chromium do Playwright (`run.mjs:84`, usa `||`), coerente com a regra de string
  vazia como ausência.
- Versão fixada (`lighthouse@12.8.2`), como a spec recomenda. Nenhuma dependência nova no `package.json` nem
  no lockfile.
- `apps/web/app/sitemap.ts` perdeu só `lastModified`. `apps/web/__tests__/sitemap.test.ts` segue o padrão de
  teste do repo (`vi.hoisted` + `vi.mock` antes do `await import`, imports explícitos de `vitest`) e descobre
  as páginas pelo sistema de arquivos, então página nova do fork entra na conferência sem editar o teste.
- `testInfo.project.use.isMobile` vem de `devices["Pixel 7"]`; o reflow só roda no projeto `mobile`.
- Nenhum texto de UI novo, nenhuma chave de i18n nova. O helper lê `components.sidebar.toggle` e
  `components.sidebar.mobileTitle`, que existem nos três idiomas.
- Comentários explicam o porquê e não citam artefato do fluxo.
- Corresponde ao corte da fatia 2 em `specs/delivery-product-quality.md:139-145`. "Lighthouse bloqueando o
  CI" segue fora, como a spec manda.
- CI: o job `e2e` tem `timeout-minutes: 25`. Na última execução em `main` (`a391d1c`, run 45230519218) a
  suíte rodou 31 testes em 3,6 min e o job inteiro em 4,5 min. O projeto `mobile` acrescenta 9 testes, que
  levaram 2,8 min nesta máquina segundo o handoff. Cabe com folga.

### 👁 Verificar no `/test`

Prioridade pela afirmação que sustenta o corte.

1. **Estabilidade do helper da barra lateral** (desvio 1). Uma execução verde não prova que o toque perdido
   foi contornado. Repro: `pnpm --filter e2e e2e --project=mobile tests/signIn.spec.ts tests/signUp.spec.ts --repeat-each=5`.
   Registrar quantas execuções passaram e se alguma precisou de mais de um toque (trace de uma execução).
2. **V1 completa**: o projeto `mobile` inteiro (`entityCrud` e `landing` só passaram antes do desvio 1).
   Repro: `pnpm --filter e2e e2e --project=mobile`.
3. **V3, o reflow reprova vazamento.** Ninguém viu a asserção falhar. Repro: spec temporária no `mobile` que
   injeta `<div style="width:600px">` e chama `expectAccessible`; tem de reprovar com
   `<rota> scrolls horizontally`. Na mesma passada, conferir a frase de `apps/e2e/support/a11y.ts:109-110`
   sobre `innerWidth` crescer na emulação; se não crescer, cortar a frase. Apagar a spec no fim.
4. **V2 de `landing` e `entityCrud` no desktop.** Repro: `pnpm --filter e2e e2e --project=chromium tests/landing.spec.ts tests/entityCrud.spec.ts`.
5. **Ctrl+C durante a medição e durante a subida** (o segundo caso é o que corrigi nesta revisão). Repro:
   `pnpm lighthouse`, Ctrl+C logo depois de iniciar (antes de "Measuring") e, numa segunda rodada, durante
   "Measuring"; depois de cada uma, `lsof -ti tcp:3001` tem de sair vazio.
6. **V4 de novo depois da correção**, porque `run.mjs` mudou: `pnpm lighthouse` com o `apps/web/.next` que o
   `/develop` deixou; exit 0, tabela em `apps/e2e/lighthouse-results/summary.md`, 3001 livre no fim.
7. **V5**: `pnpm --filter web exec next start -p 3001` à mão, depois `pnpm lighthouse --url http://localhost:3001`.
   Confere também que o `pnpm` da raiz repassa `--url` ao script. O cabeçalho da tabela tem de dizer
   `server already running`.
8. **V7**: `curl -s localhost:3001/sitemap.xml` contra o build. 15 `<loc>`, nenhum `<lastmod>`.

## Itens herdados do handoff, com veredito

| Item | Veredito |
|------|----------|
| V3 (reflow pega vazamento) | Segue para o `/test`, item 3 |
| Estabilidade do helper com `--repeat-each=5` | Segue para o `/test`, item 1. A leitura descarta que o retry esconda menu que nunca abre |
| V1 completa | Segue para o `/test`, item 2 |
| V2 de `landing` e `entityCrud` | Segue para o `/test`, item 4 |
| V5 e V7 | Seguem para o `/test`, itens 7 e 8 |
| Ctrl+C derruba o `next start` | Durante a medição, segue para o `/test`. Durante a subida, a leitura mostrou que **não** derrubava; corrigido aqui e vai para o `/test`, item 5 |
| Logs `[app] [request] failed … digest=414930086` | Fechado por leitura, fora de escopo. O log da última execução do job `e2e` em `main` (`a391d1c`, run 45230519218) já mostra `[request] failed method=GET routeType=render` em `/pt-br` (2×), `/pt-br/admin` (1×) e `/pt-br/onboarding` (3×), com outro digest. É anterior a esta fatia, que não toca `apps/app`. Recomendo virar achado no backlog |
| Lacuna: `run.mjs` sem teste unitário | Continua aberta. Testar o ciclo de processo exige servidor de pé; o `/test` cobre pelos itens 5 a 7 |
| Lacuna: ramo "Lighthouse sai com código ≠ 0" sem execução de ponta a ponta | Continua aberta. A renderização da linha está coberta em `lighthouseSummary.test.ts`; o `/test` pode forçar com `CHROME_PATH` apontando para um binário que sai com erro, se for barato |

## Correções aplicadas

- `apps/e2e/lighthouse/run.mjs`: `startProductionServer` recebe `onSpawn` e devolve só a `baseUrl`; `main`
  registra o servidor no `spawn`, e o timeout de subida deixa a derrubada para o `finally`.
- `apps/e2e/lighthouse/run.mjs` (rodada 2): listeners de `SIGINT`/`SIGTERM` permanentes (`process.on`),
  `stopOnSignal` idempotente e laço de medição que para depois do sinal. Medido; ver "Rodada 2".

## Raio de impacto

- `sitemap.xml` da `web` deixa de emitir `<lastmod>`. Consumidores: buscadores e o item 3.7 do `/deliver`.
- `expectAccessible` ganhou a checagem de reflow, mas ela só roda com `isMobile`. Os testes do projeto
  `chromium` não mudam.
- `signIn.spec.ts` e `signUp.spec.ts` trocaram a asserção do link pelo helper; no desktop o helper só faz a
  mesma asserção de antes.
- Nenhum contrato de SDK, API, design system ou i18n mudou.

## Decisões em aberto

Nenhuma nova. Q1, Q5 e Q9 do plano seguem como estavam. O log `[request] failed` em `main` é candidato a
achado no backlog, não decisão desta fatia.

## Gates

| Gate | Resultado |
|------|-----------|
| `pnpm check` | `Checked 1098 files in 642ms. No fixes applied.` |
| `pnpm turbo run typecheck --filter=e2e --filter=web` | 2 tarefas, 2 com sucesso (rodou depois da correção em `run.mjs`) |
| `node --check apps/e2e/lighthouse/run.mjs` | sem erro de sintaxe |
| Paridade de i18n | não se aplica: o diff não toca `packages/internationalization` |

## Varredura de segredo

`docs/features/delivery-product-quality-slice-2/` tem `STATE.md`, `analyze/plan.md`, `develop/handoff.md` e
este arquivo. A busca por senha, token, chave, `sk_`/`pk_` e e-mail não encontrou nada.

## Rodada 2: Ctrl+C ainda deixava o `next start` órfão

### Erro da rodada 1

Na rodada 1 declarei o 🟡 de `run.mjs` como corrigido só por leitura, sem medir. A correção (`onSpawn`)
estava certa no que fazia, mas não resolvia o caso que importa. O `/test` mediu `pnpm lighthouse` com SIGINT
no grupo do terminal e achou o `next start` vivo na 3001 em 3 de 3 interrupções na subida e em 2 de 3 durante
"Measuring" (`test/report.md`, seção "Defeito"). O handler `stopOnSignal` nunca rodou.

### Causa

O Ctrl+C chega ao `node` do runner três vezes no mesmo milissegundo: uma do terminal e outra de cada `pnpm`
da cadeia (`pnpm lighthouse` → `pnpm --filter e2e lighthouse` → `node`), que repassa o sinal ao filho. Com
`process.once`, o primeiro sinal remove o listener, o Node volta à disposição padrão e o sinal repetido mata o
processo antes de o `stopServer` mandar `SIGTERM` ao grupo do servidor. Chamando o `node` direto, sem `pnpm`,
o sinal chega uma vez só, e por isso o caso passava.

### Correção

`apps/e2e/lighthouse/run.mjs:286-302`:

- `process.once` virou `process.on`, para os sinais repetidos caírem no handler e não na disposição padrão;
- `stopOnSignal` ficou idempotente com a flag `interrupted`: o segundo e o terceiro sinal retornam sem fazer
  nada enquanto o primeiro derruba o servidor;
- o laço de medição para quando `interrupted` está ligada (`run.mjs:320`) e devolve 1. Sem isso, o
  Lighthouse da página atual morre com o sinal, o laço segue e dispara o `npx` da página seguinte enquanto o
  servidor está sendo derrubado. Esse `npx` ficaria órfão quando o `process.exit` rodasse;
- um comentário de três linhas explica por que o listener precisa continuar registrado. Sem ele, a próxima
  pessoa a ler o código volta para `once`.

A sugestão do `/test` foi tratada como hipótese. Medi abaixo.

### Medição

Repro do `/test`, com o `pnpm lighthouse` num grupo de processos próprio
(`perl -e "setpgrp(0,0); exec @ARGV" pnpm lighthouse &`), `kill -INT -<pgid>` e `lsof -ti tcp:3001` 3 s
depois. Script em `/tmp/lhprobe/probe.zsh`, fora do repositório. Build da `web` já existente em
`apps/web/.next`.

| Execução | Runner | Resultado |
|----------|--------|-----------|
| Controle, SIGINT na subida | rodada 1 (`process.once`) | `next start` e `next-server` vivos no grupo próprio, 3001 ocupada. O repro pega o defeito. Derrubei o grupo com `kill -TERM -<pgid>` |
| SIGINT na subida, 3× | rodada 2 | 3 de 3: exit 1, `lsof -ti tcp:3001` vazio, nenhum `next start` nem `next-server` |
| SIGINT 3 s depois de "Measuring", 3× | rodada 2 | 3 de 3: exit 1, 3001 livre, nenhum `npx lighthouse@12.8.2` sobrando, uma linha "Measuring" por execução (o laço não passou para a página seguinte) |
| `pnpm lighthouse` completo | rodada 2 | exit 0 em 1 min 2 s, três páginas medidas, 3001 livre no fim |

Saída da execução completa (número de máquina local, varia entre execuções):

```markdown
Lighthouse 12.8.2 · 2026-11-23T18:47:48.109Z · commit a391d1c · http://localhost:3001 (next start started by the command)

| /pt-br | 88 🟡 | 100 ✅ | 96 ✅ | 100 ✅ | 3.9 s 🟡 | 0.000 ✅ | 55 ms ✅ |
| /pt-br/pricing | 93 ✅ | 100 ✅ | 96 ✅ | 100 ✅ | 3.2 s 🟡 | 0.000 ✅ | 24 ms ✅ |
| /pt-br/contact | 95 ✅ | 100 ✅ | 93 🟡 | 100 ✅ | 3.0 s 🟡 | 0.000 ✅ | 23 ms ✅ |
```

Também errei no próprio repro: a primeira versão do script leu o PGID antes de o `setpgrp` rodar e mandou o
SIGINT para o meu grupo. O runner sobreviveu e seguiu medindo. Mandei SIGINT direto ao `node` dele, e a 3001
ficou livre. Essa execução não entra na contagem. Limpeza: `apps/e2e/lighthouse-results/` apagada, nenhum
`AGENTS.md` criado em `apps/*`, 3001 livre no fim.

### Teste automatizado do sinal

Não escrevi. O defeito mora na interação com o repasse de sinal do `pnpm`, e só um teste que suba a cadeia
real (`pnpm` → `node` → `next start`) e mande SIGINT ao grupo provaria isso. Esse teste precisa do build da
`web`. Como o `turbo build` depende de `test`, pôr o teste na suíte criaria um ciclo, e o job `verify` do CI
não tem build. A versão barata (chamar o handler duas vezes num teste unitário) exigiria extrair o `main` só
para testar e não pegaria a causa real, que é a disposição padrão do Node voltando entre sinais. O
comentário no código e o repro desta seção ficam como proteção. O comando é ferramenta de entrega usada à
mão, não gate.

### Gates da rodada 2

| Gate | Resultado |
|------|-----------|
| `pnpm check` | `Checked 1098 files in 679ms. No fixes applied.` |
| `pnpm turbo run typecheck --filter=e2e` | 1 tarefa, 1 com sucesso |
| `node --check apps/e2e/lighthouse/run.mjs` | sem erro |

### Plano de commits

Não muda. A correção está em `apps/e2e/lighthouse/run.mjs`, que já está no commit 3. A pasta
`docs/features/delivery-product-quality-slice-2/` agora inclui `test/criterios-aceite.md` e `test/report.md`
e continua no commit 7. A busca por senha, token, chave e e-mail nos dois arquivos novos não encontrou
nada.

## Plano de commits

Ordem de dependência, um assunto por commit. Antes do primeiro, `git diff --cached --stat` tem de sair vazio
(saiu vazio na criação da branch).

1. `feat(web): drop the build time from the sitemap lastmod`
   - `apps/web/app/sitemap.ts`
   - `apps/web/__tests__/sitemap.test.ts`
2. `test(e2e): run the critical flows on a 390 px mobile project`
   - `apps/e2e/playwright.config.ts`
   - `apps/e2e/support/a11y.ts`
   - `apps/e2e/support/panelNavigation.ts`
   - `apps/e2e/tests/signIn.spec.ts`
   - `apps/e2e/tests/signUp.spec.ts`
3. `feat(e2e): add pnpm lighthouse for the landing production build`
   - `apps/e2e/lighthouse/run.mjs`
   - `apps/e2e/lighthouse/summary.mjs`
   - `apps/e2e/__tests__/lighthouseSummary.test.ts`
   - `apps/e2e/package.json`
   - `package.json`
   - `.gitignore`
   - O `package.json` e o `.gitignore` da raiz entram aqui porque só carregam o atalho e a pasta de saída
     deste comando.
4. `docs: document the mobile E2E project and pnpm lighthouse`
   - `docs/SETUP.md`
   - `docs/delivery/03-product-quality.md`
   - `CLAUDE.md`
5. `docs(claude): point the delivery command to pnpm lighthouse and the mobile project`
   - `.claude/commands/deliver.md`
6. `docs(specs): audit the backlog against a391d1c`
   - `specs/BACKLOG.md`
   - `specs/delivery-product-quality.md`
   - `specs/delivery-security-review.md`
   - `specs/social-sign-in-providers.md`
7. `docs(features): delivery-product-quality-slice-2`
   - `docs/features/delivery-product-quality-slice-2/` (inteira)

Título de PR sugerido: `feat: delivery part 3 slice 2 (mobile E2E project, pnpm lighthouse, sitemap test)`.

### Commits realizados

(preenchido pelo orquestrador)
