# Handoff do `/develop`: estabilidade da suíte Vitest da `apps/app` sob carga

## Resumo

Três edições, uma por arquivo de teste, como o blueprint pedia. Nenhum arquivo de produção, nenhuma mudança em
`apps/app/vitest.config.mts`, nenhuma asserção removida.

A carga artificial **não reproduziu** nenhum dos três sintomas originais na linha de base (cinco execuções da suíte
inteira, com 16 e depois 32 processos `yes`). Por isso o verde depois da correção mostra que nada piorou e que o
teste do calendário ficou mais barato (medido), mas **não prova** que as falhas originais do `tableLoadMore` e do
`signInEmailLinkEntry` acabaram. Detalhes em "Linha de base".

## Blueprint → arquivos

| item do plano | arquivo | o que mudou |
|---------------|---------|-------------|
| 10.2 | `apps/app/__tests__/tableLoadMore.test.tsx` | `beforeEach(() => { cleanup(); })` virou `afterEach(cleanup)`; import de `beforeEach` trocado por `afterEach`. O `cleanup()` no meio do teste "só oferece carregar mais…" continua. |
| 10.3 | `apps/app/__tests__/signInEmailLinkEntry.test.tsx` | constante `SLOW_MACHINE_WAIT = { timeout: 10_000 }` aplicada às quatro esperas: `findByRole` do link por e-mail, `waitFor` + `findByRole` do teste "desligado" e `waitFor` do teste "consulta falha". |
| 10.4 | `apps/app/__tests__/auditFiltersDateInput.test.tsx` | o botão de próximo mês e o botão do dia 10 de janeiro de 2027 passam a ser buscados com `getByLabelText` em vez de `getByRole("button", { name })`. `getByRole("dialog")`, `getByRole("grid")` e o botão "Aplicar" ficaram como estavam. |

Contrato, API e i18n: nada. Nenhum código de erro novo.

## Conferência antes da troca no calendário

O plano pedia confirmar que o `aria-label` do dia fica no `<button>` e não na célula.

- Leitura de `react-day-picker` 9.13.0 (`dist/esm/DayPicker.js:315-322`): a célula (`role="gridcell"`) só recebe
  `aria-label` quando o dia **não** é interativo; no dia interativo, o rótulo vai no `DayButton`. O `CalendarDayButton`
  do design-system (`packages/design-system/components/ui/calendar.tsx:207-242`) repassa as props para o `Button`.
- Medição: um arquivo de teste descartável, cópia do teste com `console.log(el.tagName)` nos elementos achados,
  imprimiu `PROBE next BUTTON` três vezes e `PROBE day BUTTON 10`. O arquivo foi apagado logo depois
  (`ls __tests__/zz*` sem resultado).

O teste continua provando o mesmo fluxo: o botão de próximo mês não está desabilitado, a navegação chega a janeiro de
2027, o calendário reabre em "janeiro 2027" e `onApply` recebe `{ from: "2027-01-10" }`. Se o clique não
selecionasse o dia, as duas últimas asserções falhariam.

## Medições

Máquina com 8 núcleos (`sysctl -n hw.ncpu`). Outros processos fora do meu controle também pesavam: o load chegou a
127 com só 16 ou 32 `yes` meus rodando, então os números de load abaixo somam a minha carga e a dos outros.

### Duração do teste "navegam além do fim do ano corrente…"

Comando: `NODE_ENV=test npx vitest run __tests__/auditFiltersDateInput.test.tsx --reporter=verbose`, a partir de
`apps/app`. Para comparar na mesma condição, alternei o arquivo original (cópia guardada fora do repo) e o editado,
em pares consecutivos.

| condição | original (ms) | editado (ms) | load 1 min no início |
|----------|---------------|--------------|----------------------|
| 16 `yes`, par 1 | 3297 | 1525 | 94 / 85 |
| 16 `yes`, par 2 | 2816 | 1708 | 75 / 69 |
| 16 `yes`, par 3 | 3856 | 1973 | 63 / 63 |
| sem `yes`, par 1 | 1358 | 371 | 42 / 40 |
| sem `yes`, par 2 | 884 | 346 | 38 / 36 |
| sem `yes`, par 3 | 631 | 350 | 34 / 34 |

Com carga, a média caiu de 3323 ms para 1735 ms (48%). Sem a minha carga, de 958 ms para 356 ms (63%). O critério
pedia queda de pelo menos um terço, então o plano B (prazo de 40 s no `it`) não foi aplicado.

Antes da edição, também medi o original sozinho: sem carga 655, 781 e 862 ms (load 6); com 16 `yes` 7112, 4027 e
5233 ms (load 13 a 19).

### Linha de base da suíte inteira (antes da correção)

Comando: `pnpm --filter app test`, a partir da raiz. Contagem de "Unhandled" e `_location` com `grep -c` no log de
cada execução.

| execução | carga | load 1 min no início | saída | resultado | Unhandled |
|----------|-------|----------------------|-------|-----------|-----------|
| 1 | 16 `yes` | 21,6 | 0 | 1360/1360 | 0 |
| 2 | 16 `yes` | 32,7 | 1 | 1 falha: `signUpFormSubmitLock.test.tsx` (`expected true to be false`) | 0 |
| 3 | 16 `yes` | 54,9 | 0 | 1360/1360 | 0 |
| 4 | 32 `yes` | 52,7 | 0 | 1360/1360 | 0 |
| 5 | 32 `yes` | 97,9 | 1 | 2 falhas por timeout de 20 s: `accountSignInMethodsPanel.test.tsx:247` e `accountTabs.test.tsx:333` | 0 |

Nenhuma das cinco reprovou nos três arquivos desta tarefa, e nenhuma teve "Unhandled Errors" nem `_location`. O mais
perto de reproduzir foi o `auditFiltersDateInput`, que levou 17,3 s no arquivo inteiro na execução 5 (13,8 s na 2 e
11,5 s na 4), contra o limite de 20 s.

**Conclusão: a linha de base não reproduziu os sintomas.** O `afterEach(cleanup)` do `tableLoadMore` e o prazo de
10 s do `signInEmailLinkEntry` estão sustentados pela leitura de código do plano, não por uma falha que eu tenha visto
sumir. Também não capturei a pilha do `_location`, porque o erro não apareceu.

### Suíte inteira depois da correção

| execução | carga | load 1 min no início | saída | resultado | Unhandled | tableLoadMore / signIn / auditFilters (ms) |
|----------|-------|----------------------|-------|-----------|-----------|---------------------------------------------|
| 1 | 16 `yes` | 55,1 | 0 | 1360/1360 | 0 | 11674 / 2106 / 5409 |
| 2 | 16 `yes` | 64,1 | 0 | 1360/1360 | 0 | 9751 / 3015 / 7552 |
| 3 | 16 `yes` | 49,0 | 0 | 1360/1360 | 0 | 6755 / 2431 / 4907 |
| 4 | sem `yes` | 29,6 | 0 | 1360/1360 | 0 | n/d |

Os três arquivos juntos, em laço, com 16 `yes` (`npx vitest run` dos três a partir de `apps/app`): 5 de 5 com saída
0, 11/11 testes e 0 "Unhandled", load de 53 a 80.

### Processos de carga

Iniciei 32 `yes` com PIDs gravados num arquivo da pasta de rascunho e derrubei por PID (`xargs kill`), 16 antes da
comparação do calendário e 16 no fim. Conferência final: `ps -p <pids>` sem nenhum vivo e `pgrep -x yes | wc -l`
igual a 0.

## Gates

| comando | resultado |
|---------|-----------|
| `pnpm --filter app test` com 16 `yes` (3 vezes) | saída 0 nas três, 149 arquivos e 1360 testes |
| `pnpm --filter app test` sem `yes` | saída 0, 1360/1360, 90,3 s |
| `pnpm --filter app typecheck` | saída 0 |
| `pnpm check` | saída 0, 1148 arquivos, nenhuma correção |
| `git status --short apps/app/vitest.config.mts` | vazio |
| `git diff HEAD` dos três arquivos, filtrado por `skip`/`only`/`retry`/`todo`/`expect` | só as linhas reformatadas de `waitFor(() => expect(...))`, sem remoção |

## Desvios

Nenhum no código. No roteiro de medição:

- A comparação do calendário foi feita em pares alternados (original e editado em sequência) em vez de três antes e
  três depois em momentos diferentes. O load da máquina variava muito por causa de outros processos, e a alternância
  deixa os dois lados na mesma condição.
- O plano mandava derrubar a carga com `pkill -x yes`. Usei `kill` por PID, só nos processos que iniciei.

## Achados novos (fora do escopo, para o backlog)

Apareceram na linha de base, antes da correção, em arquivos que esta tarefa não toca:

- `signUpFormSubmitLock.test.tsx`, teste "keeps both buttons disabled from account creation until the sign-in
  settles, with no gap in between": `AssertionError: expected true to be false` com 16 `yes` e load 32,7. É falha de
  asserção, não de prazo, então pode ser uma corrida no próprio teste ou no formulário.
- `accountSignInMethodsPanel.test.tsx:247` e `accountTabs.test.tsx:333`: timeout de 20 s com 32 `yes` e load 97,9.
  O `accountTabs.test.tsx` está modificado no working tree por outra feature não commitada.

Nenhum dos três caiu nas quatro execuções depois da correção, o que não diz nada sobre eles: a tarefa não os tocou.

## Decisões em aberto

Nenhuma bloqueante. Continua de pé a pergunta do plano sobre limpeza automática global do Testing Library na
`apps/app`.

## A verificar no `/test`

- **Se o erro `_location` do `tableLoadMore` some de fato.** Não reproduzi a falha antes da correção. Repro sugerido:
  a mesma máquina e carga em que o achado original foi medido (load de 18 a 22 com a suíte inteira), ou mais execuções
  da suíte com 32 `yes`, procurando "Unhandled Errors" no log. Se aparecer, capturar a pilha.
- **Se o `signInEmailLinkEntry` deixa de cair pela espera do `findBy`.** Mesmo caso: sem reprodução prévia. Repro:
  `pnpm --filter app test` sob carga, várias execuções, conferindo o arquivo.
- Rodar o roteiro 10.6 completo de novo para ter uma segunda medição independente.

## Lacunas de teste conhecidas

Nenhuma criada. A tarefa só mexe em testes existentes.
