# Relatório de QA: pré-condição determinística no caso 1 do E2E de foco

Branch: `guilhermebittelbrunn/claude-cycle-full-pipeline` (não protegida). Nenhum commit, nenhuma branch
criada. Rodada do `/cycle`.

## Escopo

Só `apps/e2e/tests/focusNotObscured.spec.ts`. Não há superfície de runtime nova: o objeto da tarefa é o
próprio teste E2E. Por isso a validação usou o Playwright do repo, que sobe emulador, api, app e web e
dirige o Chromium, e não o `agent-browser`. Uma passada de `agent-browser` repetiria o que o spec já faz
no mesmo viewport, sem medir nada a mais.

Vitest e paridade de i18n não se aplicam: nenhum workspace com teste unitário mudou e nenhuma chave de
tradução ou `error.code` foi tocada.

## Comandos e resultados

Todos com `JAVA_HOME=/opt/homebrew/opt/openjdk@21` no `PATH`. Seis execuções do Playwright no total.

| # | O que | Comando | Resultado |
|---|-------|---------|-----------|
| 1 | Estabilidade, arquivo intacto | `pnpm --filter e2e exec playwright test tests/focusNotObscured.spec.ts --project=chromium --repeat-each=10` | `34 passed (3.5m)`: 4 setups + 30/30, nenhum flaky |
| 2 | Medição (spec com `console.log` temporário) | mesmo, com `--grep "Tab and Shift\+Tab"` | `5 passed (57.0s)`; números abaixo |
| 3 | P1, sem `scroll-pb-20` no `layout.tsx` | mesmo `--grep` | caso 1 reprovou, mensagem abaixo |
| 4 | P2, sem `fill`, viewport 375×1600 | mesmo `--grep` | caso 1 reprovou na pré-condição |
| 5 | P3, sem `fill`, viewport original | mesmo `--grep` | `5 passed (57.8s)` |
| 6 | Achado 🟢, sem `setSelectionRange` | mesmo `--grep` | caso 1 reprovou no Shift+Tab |
| - | Typecheck | `pnpm --filter e2e typecheck` | `tsc --noEmit` sem erro |

`pnpm check` não foi remedido. O spec não mudou desde o número do handoff (1155 arquivos, nenhum fix), e as
mutações desta etapa foram desfeitas antes de qualquer gate.

## Verificar no `/test`: veredito por item

- **Estabilidade, 30/30**: confirmado. Execução 1, `34 passed`, sem flaky.
- **Folga com a descrição preenchida e a página no topo**: medido. Com `scrollY` 0 e viewport 375×812, a
  barra de ações começa em 743 px. 11 elementos focáveis fora das barras começam abaixo dela; a distância
  de cada um ao topo da barra foi 19, 129, 131, 131, 163, 163, 195, 195, 227, 227 e 295 px. O de 19 px é
  o primeiro botão depois da descrição, que pela ordem do formulário é o select Tipo; o de 295 px é a data
  de nascimento. Os pares de mesmo valor são o rádio do gênero e o `input` oculto que o acompanha. A
  descrição preenchida mede 306 px, como o plano estimava. A estimativa de cerca de 200 px de folga mínima
  não se confirmou (são 19 px), mas a pré-condição exige um único campo abaixo da barra, e o último está a
  295 px. Antes da tarefa era um campo a 6 px.
- **`scrollY` ao chegar na barra**: 372 px.
- **P1**: confirmado. Reprova numa parada do Tab (`focusNotObscured.spec.ts:132`, laço de Tab) com
  `Received: "button ends at 798px, under the action bar that starts at 743px"`.
- **P2**: confirmado, comentando só o `fill` (o `setSelectionRange` ficou, como a revisão indicou).
  Reprova em `:125` com `Error: some field must start under the action bar with the page at the top`,
  `Expected: > 0`, `Received: 0`.
- **P3**: confirmado. Sem o `fill` e com 375×812, o caso passa: a folga antiga (um campo a 6 px) era a
  única coisa que sustentava a pré-condição.
- **Achado 🟢, sem `setSelectionRange`**: confirmado, mensagem idêntica à do handoff.
  `Received: "description starts at -59px, under the navbar that ends at 64px"`, no laço de Shift+Tab
  (`:144` da variante, que corresponde a `:146` do arquivo real). No print da falha a linha 12, com o
  caret, aparece logo abaixo da navbar, e as linhas 1 a 5 ficam escondidas sob ela.

## Critérios de aceite

| Critério | Status | Meio |
|----------|--------|------|
| O caso 1 garante a própria pré-condição | PASS | e2e (medição temporária) |
| O caso 1 não passa vazio | PASS (pré-condição provada por P2; asserção de `scrollY` só no caminho feliz) | e2e |
| O caso 1 reprova sem a reserva de foco | PASS | e2e (P1) |
| O arquivo fica estável em repetição | PASS | e2e (`--repeat-each=10`) |
| Nenhum código de produção muda | PASS | git + typecheck |

Texto completo em `test/criterios-aceite.md`.

## Decisões de custo de teste

O teste da tarefa já é da faixa cara, e a infra é o objeto dele: a reserva de `scroll-padding` só existe
no layout renderizado num navegador real, e nenhum teste com jsdom mede `getBoundingClientRect` de
verdade. Não criei teste novo. As provas P1 a P3 e a medição foram mutações temporárias, desfeitas depois
de cada execução.

## Restaurações

Antes de mexer, salvei cópia do spec, do `layout.tsx` e do `git diff` do spec no scratchpad da sessão.
Depois de cada mutação:

- spec: `cmp` com a cópia sem diferença, e `git diff` do arquivo igual byte a byte ao diff salvo
  (execuções 2, 4, 5 e 6);
- `layout.tsx`: `git diff --stat apps/app/app/layout.tsx` vazio e `cmp` sem diferença (execução 3).

Estado final: entre os dois arquivos mexidos, `git status` mostra só o spec modificado, como antes, e o `layout.tsx` sem diff. O resto do working tree, de outras tarefas da rodada, não foi tocado. As
saídas do Playwright ficaram em `apps/e2e/test-results/` e `apps/e2e/playwright-report/`, que o
`.gitignore` descarta.

## Ambiente

Na primeira checagem, as portas 3000, 3002, 8080, 9099, 9199, 4400 e 4500 estavam ocupadas por outro
workspace (servidores Next e emuladores de outro checkout). Não derrubei nada: esperei cerca de 1 minuto,
até liberarem. Antes de cada execução conferi 3000 a 3003, 8080, 9099, 9199, 4000, 4400 e 4500 com
`lsof -ti tcp:<porta> -sTCP:LISTEN`, todas livres. O `webServer` do `playwright.config.ts` subiu e
derrubou emulador, api, app e web em cada execução. No fim, todas as portas da lista estavam livres.

Nenhuma conta criada. O spec usa o `storageState` do setup do E2E contra o emulador. Nenhum dado de dev
alterado.

## Lacunas

- Folga, P1 a P3 e repetição (listadas pelo handoff e pela revisão): fechadas aqui.
- Prova de reprovação isolada da asserção "the Tab walk must scroll the document": continua aberta. Ela
  só reprovaria se algum campo começasse abaixo da barra e mesmo assim o Tab não rolasse, cenário que
  nenhuma mutação do plano produz. Fora de escopo.
- Caret no fim de um textarea longo ao voltar com Shift+Tab: continua aberta, sem cobertura, à espera do
  `/spec --sync` decidir se o achado 🟢 vira backlog. O comportamento foi reproduzido nesta etapa.

## Observação sobre o gate

No `STATE.md`, a linha `review` está `in-progress`. Nenhum commit da feature existe ainda
(`git log main..HEAD` vazio), porque o `/cycle` não commita: o gate fica aberto até o `/review` executar o
plano de commits.
