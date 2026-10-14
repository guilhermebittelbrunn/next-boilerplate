# Revisão: seletores de data levam à data certa

Revisão por leitura do diff em `packages/design-system`, `apps/app`, `apps/web` e `AGENTS.md`, contra
`docs/review-checklist.md`, mais os gates estáticos. Rodada autônoma do `/cycle`: nenhuma branch foi criada ou
renomeada e nada foi adicionado ao índice.

## Branch

| Item | Valor |
|------|-------|
| Atual | `guilhermebittelbrunn/cycle-command-v4` (criada pelo Conductor, não protegida) |
| Regex do padrão sobre a atual | `BRANCH INVALIDA: guilhermebittelbrunn/cycle-command-v4` |
| Recomendada | `fix/date-input-navigation` |
| Regex do padrão sobre a recomendada | `branch OK: fix/date-input-navigation` |
| Estado da atual | sem upstream e sem commit acima de `origin/main`; `fix/date-input-navigation` não existe no remoto |

O diff cruza três workspaces (`packages/design-system`, `apps/app`, `apps/web`), então o nome omite o `<project>`,
que é a forma sem prefixo que `.claude/rules/git-commits.md` aceita para vários apps e que o regex já reconhece. O
achado E11 do `specs/BACKLOG.md` registra que PRs nessa situação saíram fora do padrão; este nome passa no regex. O
tipo é `fix` porque o centro da entrega é defeito (calendário abrindo no mês errado, erro #418 na `/contact`); o
seletor de ano no nascimento entra como `feat` no commit próprio.

A política do `/cycle` proíbe mexer em branch durante a rodada. Como a branch atual não tem upstream nem commit
próprio, o caminho previsto pela regra é renomear (`git branch -m fix/date-input-navigation`) antes do primeiro
commit. Fica para o usuário decidir no `/review`.

A PR passou a cobrir também `form-field-focus-and-names` e depois `web-header-reflow-and-menu-name`. A
recomendação atual é `fix/date-pickers-form-fields-and-header` (`branch OK`), registrada no `review.md` da terceira
tarefa; no meio do caminho foi `fix/date-pickers-and-form-fields`. O `fix/date-input-navigation` acima fica como histórico desta revisão.

## Revisão: date-input-navigation

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `apps/app/__tests__/entityBirthdateField.test.tsx:37-59`: o formulário era renderizado sem `LocaleProvider`. O
  mock de `useParams` com `pt-br` não chegava ao `getDictionary()`, que no navegador cai no
  `NEXT_PUBLIC_DEFAULT_LOCALE` (`packages/internationalization/utils.ts:21-24`). O teste só passava porque o padrão
  é `pt-br`; um fork com outro idioma padrão o veria reprovar. **Corrigido**: o formulário agora fica dentro do
  `LocaleProvider`, como o plano previa (§8.2). Medido: a versão anterior, rodada com
  `NEXT_PUBLIC_DEFAULT_LOCALE=en`, reprova 2 de 2 ("Unable to find a label with the text of: Data de
  nascimento"); a corrigida passa 2 de 2 com e sem a variável. A sonda foi apagada depois.
- Item 5 da lista do handoff: a expectativa "clicar no rótulo foca o botão" está imprecisa. Pela especificação
  HTML, clicar num `<label>` ligado a um `<button>` dispara o clique do botão, e o botão é o `PopoverTrigger`
  (`packages/design-system/components/ui/date-input.tsx:74-97`). O esperado é o calendário abrir. A lista abaixo já
  traz a expectativa ajustada.

### ✅ OK

- `date-input.tsx:40`: `Pick<PropsBase, "captionLayout" | "endMonth" | "startMonth">` acompanha o tipo do
  react-day-picker sem cópia. `HookFormDateInput` herda as três props pelo `Omit` (`hookformDateInput.tsx:14-17`) e
  as repassa no `...rest` (`:52`), sem edição.
- `date-input.tsx:100-109`: `defaultMonth={selected}` e as três props chegam ao `Calendar`, que repassa tudo ao
  `DayPicker` por `{...props}` (`calendar.tsx:202`). `captionLayout={undefined}` cai no padrão `"label"`
  (`calendar.tsx:30`).
- O limite de cem anos só existe com seletor de ano: `getNavMonth.js` define `startMonth`/`endMonth` padrão apenas
  quando `captionLayout` é `dropdown` ou `dropdown-years`. Sem a prop, a navegação segue sem limite, o que confirma
  por leitura o "sem limite" dos filtros de `/admin/audit` e a frase nova do `AGENTS.md:79`.
- `dateInputLocale.test.tsx:204-218` deixa de depender do mês do relógio: com `value="2026-10-13"`, o
  `defaultMonth` abre outubro de 2026 em qualquer data (`getInitialMonth.js`: `month || defaultMonth || today`).
- `contact-form-client.tsx`: o bloco feito à mão saiu e o `DateInput` entrou com `id="date"`
  (`:71-75`), o que dá alvo ao `<Label htmlFor="date">` (`:65`). Estado inicial `""` (`:13`); nenhum caminho do
  primeiro render lê o relógio, porque o `Calendar` só monta com o popover aberto. Os imports que sobraram são todos
  usados.
- `initialFocus`: zero ocorrências em `apps` e `packages` (`rg -n initialFocus apps packages`, sem `node_modules`).
- Nenhuma string de UI nova, nenhum `error.code`, nenhuma chave de i18n. O placeholder da `/contact` vem de
  `components.dateInput.placeholder`, que já existia nos três idiomas.
- Nenhum comentário adicionado no código. O design system continua presentacional, sem fetch nem sessão, e
  `date-input` segue reexportado em `components/ui/index.ts:54`.
- Testes no lugar certo (`__tests__/`), imports explícitos de `vitest`, sem `toBeInTheDocument`, no nível mais
  barato (jsdom e SSR), sem emulador.

### 👁 Verificar no `/test`

Veredito para os 8 itens do handoff, em ordem de risco.

1. **Erro #418 na `/contact`** (sustenta o corte da web). Por leitura a causa saiu: o estado inicial é `""` e nada
   no primeiro render depende do relógio; o C2 prova que o HTML do servidor não muda entre dois dias. Falta a
   medição de ponta a ponta. Repro: web em `build && start` com `TZ=Pacific/Kiritimati`, navegador em
   `America/Sao_Paulo`, o init script de `window.onerror` de `docs/features/date-input-locale/test/report.md:65`;
   carregar `/pt-br/contact`, `/en/contact` e `/es/contact` e contar zero erros.
2. **Seletores no navegador, 3 idiomas.** Segue para o `/test`: o N5 cobre os nomes acessíveis nos três idiomas,
   mas a posição (`abr`/`1990`) só foi provada em pt-br. Repro: `/entities/edit/<id>` da entidade do seed com
   `1990-04-17`; abrir o calendário em pt-br, en e es e ler o texto da opção selecionada dos dois `<select>` e o dia
   marcado.
3. **Reabrir no mês salvo.** Por leitura, o `PopoverContent` não usa `forceMount` (`popover.tsx:19-38`), então o
   Radix desmonta o conteúdo ao fechar e o `DayPicker` lê `defaultMonth` de novo na próxima abertura. Falta medir no
   navegador, onde há animação de saída. Repro: escolher 11/09/2001 pelos seletores, fechar, reabrir logo em
   seguida e ler `set`/`2001`.
4. **Rótulo "Data" na `/contact`.** Por leitura, `for="date"` aponta para o botão. Expectativa ajustada: clicar no
   rótulo **abre** o calendário (o clique no label vira clique no botão). Repro: clicar em "Data"/"Date"/"Fecha" e
   ver o popover aberto; na árvore de acessibilidade, o nome do botão deve ser o texto do rótulo.
5. **Filtros de `/admin/audit`.** Por leitura, `AuditFilters.tsx:82-91` não passa as props novas e os valores são
   `""` ou `yyyy-MM-dd` (`auditFiltersSchema.ts:15-18`), então ficam sem seletor e sem limite e ganham só o
   `defaultMonth`. Nenhum teste usa o `DateInput` real ali (`auditFilters.test.tsx` o mocka). Repro: escolher uma
   data em "De", reabrir e ler o mês; navegar alguns meses além de dezembro de 2026 e conferir o botão de próximo
   mês habilitado; aplicar o filtro.
6. **Layout da `/contact`.** Por leitura, o botão perdeu o `max-w-sm`, mas o contêiner do campo já tem
   `grid w-full max-w-sm` (`contact-form-client.tsx:64`), então a largura não deve mudar. Repro: 1280 px e 390 px,
   claro e escuro, comparar a borda do botão de data com a dos inputs vizinhos.
7. **Os dois `<select>` no popover.** Segue para o `/test`. Repro: 390 px nos três idiomas, sem rolagem horizontal;
   no escuro, abrir a lista nativa de anos e ler o contraste.
8. **Valor salvo pela API.** Confirmado por leitura: o caminho de gravação (`date-input.tsx:104-107`,
   `format(date, "yyyy-MM-dd")`) não mudou, e o N8 prova o `onChange("1990-10-17")` pelo seletor. Prioridade baixa;
   se o item 2 já salvar uma vez, basta ler o `birthdate` do `GET /entities/<id>`.

## Correções aplicadas

| Arquivo | O que mudou |
|---------|-------------|
| `apps/app/__tests__/entityBirthdateField.test.tsx` | importa `LocaleProvider` de `@repo/internationalization/client` (depois dos `vi.mock`) e envolve o `<Form>` com ele |

## Raio de impacto

O único contrato alterado é `DateInputProps`, com três props opcionais. Consumidores: `HookFormDateInput`
(herda sem edição), `AuditFilters.tsx` em `/admin/audit` (só ganha o `defaultMonth`), `EntityFormFields.tsx`
(passa `captionLayout="dropdown"`) e a `/contact` da web (passa a usar o componente). Nenhum outro arquivo de
`apps` ou `packages` importa `DateInput`. SDK, API, schema e i18n não mudam.

## Lacunas de teste

| Lacuna | Veredito |
|--------|----------|
| Nenhum teste renderiza o `AuditFilters` com o `DateInput` real | continua aberta; coberta por leitura e pelo item 5 acima |
| N4 (posição dos seletores) roda só em pt-br | continua aberta; o item 2 acima mede no navegador |
| Ausência de `initialFocus` sem teste | fechada por leitura: zero ocorrências no código |
| Teste da `apps/app` dependia do idioma padrão | fechada aqui |

## Decisões em aberto

- Branch: renomear `guilhermebittelbrunn/cycle-command-v4` para `fix/date-pickers-form-fields-and-header` (antes
  `fix/date-input-navigation`) antes do primeiro commit. Recomendação: renomear; a branch não tem upstream nem commit próprio.
- As perguntas P1 a P4 do plano seguem com a opção adotada lá. Nada novo.

## Backlog

A auditoria de 2026-10-14 (`specs/BACKLOG.md`) registra quatro achados novos vindos da PR #44. Esta entrega fecha
três deles no código: o calendário que abre no mês atual, a hidratação da `/contact` com fuso diferente e o
`initialFocus`. O `data-day` em `calendar.tsx:229` continua aberto, fora do corte. A atualização fica para o próximo
`/spec --sync`.

## Gates

| Gate | Comando | Resultado |
|------|---------|-----------|
| Typecheck | `corepack pnpm turbo run typecheck --filter=@repo/design-system --filter=app --filter=web` | 3 de 3 tarefas ok, 0 em cache, 8,7 s |
| Lint | `corepack pnpm check` | 878 arquivos, nenhum erro |
| Paridade de i18n | não rodada | o diff não toca `packages/internationalization`; vale a medição do handoff (67 testes em 7 arquivos) |
| Teste alterado | `vitest run __tests__/entityBirthdateField.test.tsx` em `apps/app` | 2 de 2, com e sem `NEXT_PUBLIC_DEFAULT_LOCALE=en` |
| Índice | `git diff --cached --stat` | vazio |
| Segredo nos artefatos | `rg` por senha, token, chave e e-mail em `docs/features/date-input-navigation/` | nenhuma ocorrência |

A suíte completa não foi rodada aqui; é do `/test`.

## Plano de commits

Substituído pelo plano consolidado da PR, que soma esta tarefa, `form-field-focus-and-names` e
`web-header-reflow-and-menu-name`: `docs/features/web-header-reflow-and-menu-name/review/review.md`, seção "Plano
de commits". Os seis commits que estavam aqui continuam lá, com as mesmas mensagens (posições 1, 5, 9, 12, 13 e
14); o `docs(features)` desta pasta inclui `test/criterios-aceite.md` e `test/report.md`, e o teste
`apps/app/__tests__/auditFiltersDateInput.test.tsx`, criado pelo `/test`, tem commit `test(app)` próprio (6).

### Commits realizados

(preenchido pelo `/review` depois de commitar)
