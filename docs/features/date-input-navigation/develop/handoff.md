# Handoff do `/develop`: seletores de data levam à data certa

Implementação do plano em `analyze/plan.md`, sem desvio de desenho. Os desvios abaixo são só de forma nos testes.
Nada foi commitado nem adicionado ao índice; o `specs/BACKLOG.md` modificado é da auditoria e não foi tocado.

## Blueprint para arquivos

| Item do plano | Arquivo | O que mudou |
|---------------|---------|-------------|
| 13.1 design system | `packages/design-system/components/ui/date-input.tsx` | `DateInputProps` ganha `Pick<PropsBase, "captionLayout" \| "endMonth" \| "startMonth">`; as três props e `defaultMonth={selected}` vão para o `Calendar` |
| 8.1 | `packages/design-system/__tests__/dateInputNavigation.test.tsx` (novo) | casos N1 a N8 (10 testes, porque N5 roda nos 3 idiomas) |
| 13.2 app | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(components)/EntityFormFields.tsx` | `captionLayout="dropdown"` no `HookFormDateInput` de `birthdate` |
| 8.2 | `apps/app/__tests__/entityBirthdateField.test.tsx` (novo) | 2 testes: vazio abre com os dois seletores e o ano em 2026; preenchido com `1990-04-17` abre com o ano em 1990 |
| 13.3 web | `apps/web/app/[locale]/contact/components/contact-form-client.tsx` | o bloco `Popover` + `Calendar` vira `<DateInput id="date" onChange={setDate} value={date} />`, com estado inicial `""`; saem `Calendar`, `Popover*`, `calendarLocales`, `cn`, `format`, `CalendarIcon` e o `locale` do `getDictionary()` |
| 8.3 | `apps/web/__tests__/contactFormDateLocale.test.tsx` (reescrito) | C1 nos 3 idiomas, C2 e C3 (5 testes) |
| 13.4 | `AGENTS.md` | um item na seção "Data (`DateInput`)" |

## Contrato

Sem mudança em `@repo/sdk`, na API ou em schema. O único contrato mexido é o tipo `DateInputProps`, que ganha três
props opcionais. Consumidores do `DateInput` no repositório: `HookFormDateInput` (herda as props pelo `...rest`, sem
edição), `AuditFilters.tsx` em `/admin/audit` (não passa as props novas; ganha só o `defaultMonth`) e agora a
`/contact` da web.

## Códigos de erro e i18n

Nenhum `error.code` novo e nenhuma chave de tradução nova. Os rótulos dos seletores vêm do locale do
react-day-picker, e o placeholder da `/contact` vem de `components.dateInput.placeholder`, que já existia.

## Desvios em relação ao plano

Nenhum desvio de desenho. Conferi as decisões que dependiam do pacote instalado e nenhuma estava errada:
`PropsBase` é exportado por `react-day-picker` (`dist/esm/types/props.d.ts:21`, reexportado em `types/index.d.ts`),
e o typecheck dos três workspaces passou com o `Pick`.

Desvios de forma, só nos testes:

1. **N1 procura o dia 17 dentro do `grid`.** O botão do `DateInput` mostra "17 de abril de 1990", então
   `getByRole("button", { name: /17 de abril de 1990/ })` achava dois elementos. O teste agora usa
   `within(screen.getByRole("grid"))`. A asserção continua a mesma.
2. **O teste da `apps/app` tem um caso a mais** (data preenchida abre no ano 1990). O plano pedia só o vazio.
3. **N4 confere o mês pelo texto da opção selecionada (`abr`)**, que é o que o `<select>` mostra, em vez do
   índice do mês.
4. **Constantes no topo dos testes** (`APRIL_17_1990_DAY_BUTTON`, `YEARS_FROM_A_CENTURY_AGO_TO_THIS_YEAR`,
   `DATE_LABEL_TAG`, …) e datas com `parseISO`, porque o Biome reprova regex dentro de função
   (`useTopLevelRegex`) e número mágico (`noMagicNumbers`).

### Teste substituído: `contactFormDateLocale.test.tsx`

O teste antigo afirmava que o botão da `/contact` mostrava a data de hoje formatada no idioma. A data de hoje
pré-selecionada sai de propósito (D4/P1 do plano), então essa asserção não tem mais objeto. A cobertura de
"data formatada no idioma da página" continua no mesmo componente que a `/contact` passou a usar:
`packages/design-system/__tests__/dateInputLocale.test.tsx`, caso "formata a data escolhida no idioma da página"
(`describe.each(locales)`, linhas 116-120), que roda nos 3 idiomas e passou nesta rodada.

## Validação (instrumentos)

| Gate | Comando | Resultado |
|------|---------|-----------|
| Testes novos no código antigo | `vitest run` de cada arquivo novo, rodado antes de editar o código de produção | design system: 9 de 10 reprovam, só N2 passa (regressão, como o plano previa). App: 2 de 2 reprovam ("Unable to find … combobox"). Web: 5 de 5 reprovam (placeholder ausente, HTML diferente entre 13/10 e 14/10, botão sem `id="date"`) |
| Testes novos no código novo | mesmos arquivos | todos passam |
| Typecheck | `corepack pnpm turbo run typecheck --filter=@repo/design-system --filter=app --filter=web` | 3 de 3 tarefas ok, exit 0 |
| Lint | `corepack pnpm check` | exit 0, 878 arquivos, sem erro |
| Suítes | `corepack pnpm turbo run test --filter=@repo/design-system --filter=app --filter=web --filter=@repo/internationalization` | 11 de 11 tarefas ok. Design system 142 testes (11 arquivos), app 843 (104), web 95 (16), internationalization 67 (7, inclui a paridade) |
| `initialFocus` fora do código | `grep -rn "initialFocus" apps packages` (sem `node_modules`) | zero ocorrências |
| Caso de `dateInputLocale.test.tsx:204-218` independente do mês | cópia temporária do arquivo com `vi.setSystemTime(new Date("2026-11-15T12:00:00"))`, rodando só esse caso no código novo; arquivo apagado depois | passa. Não rodei a mesma sonda no código antigo, então a afirmação do plano de que ele reprova em novembro continua sem medição minha |

Para os testes no código antigo, escrevi os três arquivos primeiro e só depois editei `date-input.tsx`,
`EntityFormFields.tsx` e `contact-form-client.tsx`. Não usei `git stash`.

## A verificar no `/test`

Nada abaixo foi medido nesta etapa. Não subi app, web nem browser.

1. **Seletores no navegador.** `/entities/edit/<id>` da entidade do seed com `1990-04-17`, nos 3 idiomas: os
   seletores mostram `abr`/`Apr`/`abr` e `1990`, com o dia 17 marcado. No jsdom isso passou só em pt-br.
2. **Valor salvo pela API.** Trocar o ano pelo seletor, escolher um dia, salvar e conferir no `GET /entities/<id>`
   que o `birthdate` foi `yyyy-MM-dd`. O teste N8 prova o `onChange("1990-10-17")`, mas não a ida até a API.
3. **Reabrir no mês salvo depois de fechar.** N3 prova com `Escape` e `rerender` no jsdom; falta medir no browser
   real, onde o popover tem animação de saída do Radix.
4. **Erro #418 na `/contact`.** Servidor com `TZ=Pacific/Kiritimati`, navegador em `America/Sao_Paulo`, com o init
   script de `window.onerror` usado em `date-input-locale/test/report.md:65`. O teste C2 só prova que o HTML do
   servidor não depende do relógio.
5. **Rótulo "Data" na `/contact`.** Clicar no rótulo foca o botão, e a árvore de acessibilidade dá ao botão o nome
   "Data"/"Date"/"Fecha". C3 prova só que `for="date"` e `id="date"` estão no HTML.
6. **Layout da `/contact`.** O botão agora usa a classe do `DateInput` (`h-9 w-full`, sem o `max-w-sm` antigo) e o
   popover abre com `align="start"`. Conferir em 1280 px e 390 px, claro e escuro, que o campo continua alinhado
   com os outros do formulário.
7. **Filtros de `/admin/audit`.** "De" e "Até" sem seletor, navegação sem limite, e uma data escolhida reabre no mês
   dela. O `auditFilters.test.tsx` mocka o `DateInput`, então nenhum teste cobre isso.
8. **Os dois `<select>` no popover.** Cabem em 390 px nos 3 idiomas e a lista nativa de opções é legível no escuro.

## Lacunas de teste conhecidas

- Nenhum teste renderiza o `AuditFilters` com o `DateInput` real.
- N5 confere os nomes acessíveis dos seletores nos 3 idiomas, mas o caso de posição (N4) roda só em pt-br.
- A ausência de `initialFocus` não tem teste. A prop não chega ao DOM no react-day-picker 9.13.0; a conferência é
  por leitura e pelo `grep` acima.

## Decisões em aberto

Nenhuma nova. As quatro perguntas da §11 do plano (P1 a P4) seguem com a opção adotada lá.
