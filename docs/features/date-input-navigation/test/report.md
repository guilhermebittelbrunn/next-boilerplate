# Relatório do `/test`: seletores de data levam à data certa

Rodada autônoma do `/cycle`, em `guilhermebittelbrunn/cycle-command-v4` (não protegida). Nenhum commit, nenhuma
branch e nenhum `git add`. Os dois arquivos de teste novos ou alterados por esta etapa ficam no working tree para
o `/review` commitar.

Resultado: 12 critérios verificados e corretos, 0 falhas, 1 não verificado (a lista nativa do `<select>` no
escuro). Nenhum defeito de produção encontrado no diff.

## Cobertura

| Comando | Resultado |
|---------|-----------|
| `corepack pnpm test` (raiz, `turbo test test:emulator`), antes dos testes novos | 15 de 15 tarefas, 12 do cache |
| `corepack pnpm turbo run test` (para ler os números por workspace) | 14 de 14, todas do cache. design system 142 (11 arquivos), app 843 (104), web 95 (16), i18n 67 (7, inclui a paridade), api 1205 (93) |
| `vitest run __tests__/dateInputNavigation.test.tsx` em `packages/design-system` | 14 de 14 (eram 10) |
| `vitest run __tests__/auditFiltersDateInput.test.tsx` em `apps/app` | 2 de 2 (arquivo novo) |
| `corepack pnpm turbo run test typecheck --filter=@repo/design-system --filter=app --filter=web` | 14 de 14 tarefas. design system 146 (11), app 845 (105), web 95 (16); typecheck dos três sem erro |
| `corepack pnpm check` | 879 arquivos, nenhum erro |
| `corepack pnpm test` (raiz), depois dos testes novos, com JDK 21 no `PATH` | 15 de 15 tarefas, 13 do cache. `api:test:emulator` 186 testes em 4 arquivos |

Rodei sem `--force`. A paridade de i18n veio do cache porque o diff não toca `packages/internationalization`.

O stderr do design system mostra "In HTML, `<button>` cannot be a descendant of `<button>`" em
`componentCopy.test.tsx`, no caso dos botões de fechar do `Dialog`. É aviso de um teste que esta entrega não
tocou, e o teste passa.

### Testes criados ou alterados nesta etapa

| Arquivo | O que prova |
|---------|-------------|
| `packages/design-system/__tests__/dateInputNavigation.test.tsx` | +3 casos `it.each(locales)`: com `1990-04-17`, os seletores mostram `abr`/`1990`, `Apr`/`1990` e `abr`/`1990`. Fecha a lacuna "N4 só em pt-br". +1 caso: valor `17/04/1990`, fora do formato, abre no mês atual |
| `apps/app/__tests__/auditFiltersDateInput.test.tsx` (novo) | `AuditFilters` com o `DateInput` real: o calendário de "De" abre sem `combobox`; o próximo mês segue habilitado de outubro de 2026 a janeiro de 2027; escolher 10/01/2027 e reabrir mostra "janeiro 2027"; "Aplicar" entrega `{ from: "2027-01-10" }`. Fecha a lacuna "nenhum teste renderiza o `AuditFilters` com o `DateInput` real" |

Pela leitura de `getInitialMonth` (`month || defaultMonth || today`), o caso de reabertura do teste novo da
auditoria e os três casos de posição reprovariam no código anterior: sem `defaultMonth` o calendário abre em
outubro de 2026, e sem `captionLayout` não há `<select>`. Não rodei esses testes contra o código antigo. O caso
do valor fora do formato passaria no código antigo também; ele protege contra regressão.

## Decisões de custo de teste

Nenhum teste da faixa cara. O diff não toca API, Firestore, regras nem sessão.

| Módulo tocado | Decisão |
|---------------|---------|
| `date-input.tsx` | jsdom basta: abertura no mês, seletores, intervalo e `onChange` são comportamento do componente |
| `EntityFormFields.tsx` | `entityBirthdateField.test.tsx` (jsdom) já cobria; nada acrescentado |
| `AuditFilters.tsx` (consumidor sem mudança) | teste novo em jsdom com o `DateInput` real, no lugar do mock do `auditFilters.test.tsx` |
| `contact-form-client.tsx` | `contactFormDateLocale.test.tsx` (SSR em `node`) já cobria o HTML do servidor. O #418 depende de servidor e navegador em fusos diferentes e só se mede de ponta a ponta, o que foi feito com o `agent-browser` |

## Critérios de aceite

| # | Critério | Status | Meio | Evidência |
|---|----------|--------|------|-----------|
| 1 | Calendário abre no mês da data selecionada | ✅ | e2e + unit | `/pt-br/entities/edit/<Joana>` abriu com `abr`/`1990` e "terça-feira, 17 de abril de 1990, selecionado". Depois de escolher 11/09/2001, reabriu em `set`/`2001`. Valor fora do formato: unit |
| 2 | Seletor de mês e ano no nascimento | ✅ | e2e + unit | pt-br `abr`/`1990`, en `Apr`/`1990`, es `abr`/`1990`; nomes "Escolha o mês"/"Escolha o ano", "Choose the Month"/"Choose the Year", "Elegir el mes"/"Elegir el año"; meses `jan…dez`, `Jan…Dec`, `ene…dic` |
| 3 | Intervalo padrão do seletor de ano | ✅ | e2e + unit | 101 opções, de 1926 a 2026, nos três idiomas. Em `/pt-br/entities/create`: botão "Escolha uma data", seletores `out`/`2026`; com `dez`/`2026`, "Ir para o próximo mês" com `aria-disabled="true"` |
| 4 | Intervalo configurável | ✅ | unit | `startMonth` 2020 e `endMonth` 2030 dão 11 anos. Nenhuma tela usa as props |
| 5 | Quem não pede o seletor fica como está | ✅ | e2e + unit novo | ver item 5 da lista do review |
| 6 | Valor gravado inalterado | ✅ | e2e | `PUT /entities/<Joana>` 200; `GET` devolveu `"birthdate":"2001-09-11"` e, depois da segunda gravação em en, `"birthdate":"1990-04-17"` |
| 7 | Personificação continua sem gravar | ✅ | unit | `entityFormsReadOnly.test.tsx` passou na suíte da app. A frase do plano "o campo continua desabilitado" não procede: `EntityFormFields.tsx` não passa `disabled` aos campos, e o bloqueio fica no botão de salvar. Sem e2e: o menu de ações de `/admin/users` mostra só "Editar" e "Arquivar", e não procurei a personificação por outro caminho |
| 8 | `/contact` sem erro de hidratação | ✅ | e2e | ver item 1 da lista do review |
| 9 | `/contact` começa vazia, com o placeholder | ✅ | e2e + SSR | "Escolha uma data", "Pick a date", "Elige una fecha". Em es, escolhi 12/08/2026: botão "12 de agosto de 2026", reaberto em "agosto 2026" com o dia 12 marcado |
| 10 | Rótulo "Data" ligado ao botão | ✅ | e2e + SSR | ver item 4 da lista do review |
| 11 | Tema e responsivo | ✅ | e2e | ver itens 6 e 7 da lista do review |
| 12 | Lista nativa do `<select>` no escuro | 🔒 | e2e parcial | estilos computados medidos; a lista em si não renderiza em headless (item 7) |
| 13 | Regressão | ✅ | suíte | tabela de comandos acima |

## Verificar no `/test`

| # | Item do `review.md` | Veredito |
|---|---------------------|----------|
| 1 | Erro #418 na `/contact` | **confirmado** que não acontece mais. Web em `next start` com `TZ=Pacific/Kiritimati` (15/10 05:05 no servidor) e navegador em `America/Sao_Paulo` (14/10 12:05), init script que registra `window.onerror`, `unhandledrejection` e `console.error` antes da primeira navegação. `/pt-br/contact`, `/en/contact` e `/es/contact`: zero entradas. Nenhum texto de data no HTML do servidor (`curl`), só o placeholder. Não fiz controle positivo nesta rodada; o mesmo método pegou o #418 no `HEAD` anterior (`date-input-locale/test/report.md`, item 3) |
| 2 | Seletores no navegador, 3 idiomas | **confirmado**. Joana com `1990-04-17`: pt-br claro 1280 `abr`/`1990`; en claro 390 `Apr`/`1990`; es escuro 390 `abr`/`1990`. Nas três, dia 17 com `aria-selected` e nome "terça-feira, 17 de abril de 1990, selecionado" / "Tuesday, April 17th, 1990, selected" / "martes, 17 de abril de 1990, seleccionado" |
| 3 | Reabrir no mês salvo | **confirmado**. Escolhi `set` e `2001` nos seletores e cliquei em 11: o popover fechou com o botão "11 de setembro de 2001" e reabriu em `set`/`2001`. Também fechei e reabri com 30 ms de intervalo, no meio da animação de saída (`data-state="closed"` no momento do segundo clique): abriu um popover só, em `set`/`2001`. Navegar até `nov`/`2001` sem escolher dia, fechar e reabrir voltou para `set`/`2001`. Depois de recarregar a página em en, o calendário abriu em `Sep`/`2001` |
| 4 | Rótulo "Data" na `/contact` | **confirmado**, com a expectativa ajustada pelo review. O clique real no `<label for="date">` abriu o calendário em pt-br, en e es (`aria-expanded="true"`, legenda "octubre 2026"/"October 2026"). O foco foi para o primeiro botão do popover ("Go to the Previous Month") e voltou ao `#date` depois do `Escape`. Na árvore de acessibilidade o botão aparece como `button "Fecha"`, e `button.labels` devolve "Data", "Date" e "Fecha" |
| 5 | Filtros de `/admin/audit` | **confirmado**. Admin do seed, pt-br claro 1280: o calendário de "De" abriu em "outubro 2026" sem `<select>`; seis cliques em "Ir para o próximo mês" chegaram a "abril 2027" com o botão sempre sem `aria-disabled`. Voltei a setembro de 2026, escolhi o dia 10 (botão "10 de setembro de 2026") e reabri: "setembro 2026", dia 10 marcado. Em "Até" escolhi hoje. "Aplicar" disparou `GET /audit-events?limit=20&from=2026-09-10&to=2026-10-14` (200), e a tabela mostrou "Nenhum evento registrado.", que bate com a API sem filtro (`items: []`). es escuro 390: "Desde" com "Elige una fecha", calendário "octubre 2026" sem `<select>`, popover entre x=49 e x=299, `scrollWidth` 390 |
| 6 | Layout da `/contact` | **confirmado**. pt-br claro 1280: `#date`, `#firstname` e `#lastname` com as mesmas bordas (x=779 a x=1097) e altura de 36 px. pt-br escuro 390: os três de x=36 a x=354, 36 px; popover aberto de x=36 a x=286, `scrollWidth` 390 |
| 7 | Os dois `<select>` no popover | **confirmado em parte, 🔒 no resto**. Em 390 px, nos três idiomas, os dois `<select>` ficam dentro do popover (mês de x=95 a x=148, ano de x=156 a x=219, popover de x=32 a x=282) e o `scrollWidth` é 390. No escuro (en, 1280), o `<select>` tem `color-scheme: dark`, cor `lab(98.26 0 0)` sobre `lab(2.75 0 0)`, e as opções herdam a cor clara com fundo transparente. A lista que abre ao clicar é desenhada pelo sistema operacional e não aparece em navegador headless, então a legibilidade dela fica 🔒 |
| 8 | Valor salvo pela API | **confirmado**. `GET /entities/<Joana>` com token do emulador: 200 e `"birthdate":"2001-09-11"`; depois de voltar para 17/04/1990 pelos seletores em en, `"birthdate":"1990-04-17"` |

## Evidências e2e

App (3000) e web (3001) em build de produção (`next build` e `next start`), com o env da `apps/e2e`
(`buildStackEnv`: credenciais do Admin vazias, projeto `demo-next-boilerplate`, emuladores em `127.0.0.1`). A
API rodou em `next dev` (3002) pelo mesmo motivo da rodada anterior: o build dela exige credenciais do Admin que
o env do emulador zera. A API não está no diff.

| Tela | Idioma | Tema/viewport | Observado |
|------|--------|---------------|-----------|
| `/contact` | pt-br, en, es | claro, 1280 | botão "Escolha uma data" / "Pick a date" / "Elige una fecha"; rótulo "Data"/"Date"/"Fecha"; zero erros |
| `/contact` | es | claro, 1280 | clique no rótulo abre "octubre 2026", sem `<select>`; data escolhida "12 de agosto de 2026", reaberta em "agosto 2026" |
| `/contact` | pt-br | escuro, 390 | campo alinhado aos inputs; popover "outubro 2026" dentro da tela |
| `/entities/edit/<Joana>` | pt-br | claro, 1280 | `abr`/`1990`, 101 anos, salvo como `2001-09-11` |
| `/entities/edit/<Joana>` | en | escuro, 1280 | reaberto em `Sep`/`2001` depois do reload; salvo de volta como `1990-04-17` |
| `/entities/edit/<Joana>` | es | escuro, 390 | `abr`/`1990`, dia 17 marcado, popover de x=32 a x=282 |
| `/entities/edit/<Joana>` | en | claro, 390 | `Apr`/`1990`, botão "April 17th, 1990" |
| `/entities/create` | pt-br | claro, 390 | "Escolha uma data", `out`/`2026`, próximo mês desabilitado em `dez`/`2026` |
| `/admin/audit` | pt-br | claro, 1280 | sem seletor, sem limite, reabre em setembro de 2026, filtro aplicado |
| `/admin/audit` | es | escuro, 390 | sem seletor, "octubre 2026" |

O `window.__qaErrors` do init script ficou vazio em todas as páginas das duas sessões (comum e admin).

Em 390 px, sem rolar, o botão "Data de nascimento" fica atrás do rodapé fixo (Voltar/Salvar) de
`/entities/edit`, e o clique cai no rodapé. Rolando a página, o campo aparece e funciona. É o layout de sempre da
tela, sem relação com este diff.

Screenshots de apoio em `docs/features/date-input-navigation/test/e2e/` (`01-contact-es-label-click.png` a
`08-admin-audit-ptbr-light-1280.png`). O `.gitignore` descarta a pasta; a prova é o texto acima. Os prints só
mostram contas e entidades do seed do emulador.

## Ambiente do e2e

Todas as portas estavam livres no início (3000, 3001, 3002, 3003, 9099, 8080, 4001, 9199, 4400, 4500, 9150).
Não reutilizei nada do usuário.

- Subi: `pnpm emulators` (auth, firestore, storage, com JDK 21 no `PATH`), o seed do emulador, `next dev -p 3002`
  na API, `next start -p 3000` na app e `next start -p 3001` na web com `TZ=Pacific/Kiritimati`.
- Derrubei por PID. Os servidores Next saíram com `SIGTERM` nos filhos do `pnpm`; o emulador saiu com `SIGINT` no
  `firebase-tools`, que encerrou os dois processos Java. Conferência final: nenhuma das portas acima com
  processo, e nenhum `next start`/`next dev` deste workspace vivo. O segundo `pnpm test` da raiz, rodado depois,
  subiu e derrubou os próprios emuladores e também não deixou porta ocupada.
- Fechei as duas sessões do agent-browser (`qa-din` e `qa-din-admin`). O env, o init script e as sondas ficaram
  em `/tmp/qa-din/`, fora do repositório. Apaguei o `firestore-debug.log` que o emulador criou na raiz (ignorado
  pelo git). O `apps/api/firestore-debug.log` é do `test:emulator` da própria suíte.
- Efeito colateral: `apps/app/.next` e `apps/web/.next` agora têm build de produção com a config do emulador
  embutida (ignorados pelo git). Um `next start` sem rebuild nesses apps falaria com o emulador; `pnpm dev` não é
  afetado.

## Dados de QA

Tudo no emulador, que morreu com o processo. Nada em projeto real e nenhuma conta nova.

- Contas usadas: a comum (`user@example.com`) e a de admin (`admin@example.com`) do
  `apps/api/scripts/seed-emulator.mjs`. A senha do seed é pública no repositório e não foi copiada para cá. Não
  existe `.claude/dev-credentials.local.md` e ele não foi necessário.
- Entidade alterada: Joana Ribeiro, do seed. `birthdate` foi a `2001-09-11` e voltou a `1990-04-17`.
- Nada a acrescentar ao `docs/PRE-PRODUCTION.md`.

## Lacunas

| Lacuna | Origem | Veredito |
|--------|--------|----------|
| Nenhum teste renderiza o `AuditFilters` com o `DateInput` real | handoff e review | **fechada** pelo `auditFiltersDateInput.test.tsx` |
| N4 (posição dos seletores) só em pt-br | handoff e review | **fechada**: três casos novos em jsdom e medição nos três idiomas no navegador |
| Ausência de `initialFocus` sem teste | handoff | **fechada por leitura** no review; não acrescentei teste porque a prop não chega ao DOM |
| Teste da `apps/app` dependia do idioma padrão | review | **fechada** no review |
| A sonda de novembro em `dateInputLocale.test.tsx:204-218` nunca rodou contra o código antigo | handoff | **continua aberta**, sem efeito prático: com o `defaultMonth` o caso independe do mês |
| Legibilidade da lista nativa do `<select>` no escuro | handoff e review | **continua aberta** (🔒): exige navegador com janela, no macOS e no Windows |
| Personificação sem e2e | plano §10 | **fora de escopo** do e2e desta rodada; coberta por `entityFormsReadOnly.test.tsx` |

## Achados fora do diff

1. **Estouro horizontal no header da web em es**, já registrado no `date-input-locale/test/report.md` (achado
   3): em `/es/contact`, 1280 px, `scrollWidth` 1304. O único elemento além da borda é o link "Registrarse"
   (borda direita em x=1304). pt-br e en ficam em 1280. Anterior a esta tarefa.
2. **O texto do plano sobre o rótulo e a personificação não descreve o código.** "Clicar no rótulo foca o botão"
   (§9 e §10) é, na verdade, "abre o calendário", como o review já tinha lido. "Sob personificação o campo
   continua desabilitado" (§10) não procede: só o envio é bloqueado. Corrigi os dois em
   `test/criterios-aceite.md`; o código está certo.
