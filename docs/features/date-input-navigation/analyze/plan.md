# Plano: seletores de data levam à data certa

Tarefa direta, sem spec. Vem da recomendação #1 de `specs/BACKLOG.md` (seção "Ordem recomendada", `:231-278`),
que reúne três defeitos medidos pelo `/test` da PR #44 (`docs/features/date-input-locale/test/report.md:137-151`).
Plano feito em rodada autônoma do `/cycle`: as decisões tomadas sem perguntar estão na §12, e a §11 traz as
perguntas já com a opção adotada.

As âncoras foram reconferidas neste checkout em 2026-10-14. Abreviações: `<ds>` =
`packages/design-system/components/ui`, `<entity>` =
`apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities`, `<contact>` =
`apps/web/app/[locale]/contact/components`, `<rdp>` =
`node_modules/.pnpm/react-day-picker@9.13.0_react@19.2.0/node_modules/react-day-picker/dist/esm`.

## 0. Sumário do desenho

- `<ds>/date-input.tsx` passa `defaultMonth={selected}` ao `Calendar`. Com valor, o calendário abre no mês da data;
  sem valor, `selected` é `undefined` e o react-day-picker cai no mês atual, como hoje.
- `DateInputProps` ganha três props opcionais, repassadas ao `Calendar`: `captionLayout`, `startMonth` e `endMonth`
  (tipos de `PropsBase` do react-day-picker). Sem elas, nada muda para os consumidores atuais. O
  `HookFormDateInput` herda as três sem edição, porque o tipo dele deriva de `DateInputProps` e o componente repassa
  `...rest` (`packages/design-system/components/form/hookform/hookformDateInput.tsx:14-17`, `:52`).
- `<entity>/(components)/EntityFormFields.tsx:154-157`: o campo de nascimento passa `captionLayout="dropdown"`. Os
  filtros de `/admin/audit` (`AuditFilters.tsx:82-91`) ficam como estão.
- `<contact>/contact-form-client.tsx`: o bloco de data feito à mão (`Popover` + `Button` + `Calendar` + `format`,
  `:79-114`) vira um `DateInput` com `id="date"`, valor inicial `""`. Isso resolve de uma vez o erro #418 (o estado
  inicial deixa de depender do relógio), o `initialFocus` (some junto com o `Calendar` direto), o `Label` sem
  controle (`htmlFor="date"` passa a apontar para o botão) e herda o `defaultMonth` do primeiro item.
- Sem chave de i18n nova: os rótulos do seletor de mês e ano vêm do locale do react-day-picker
  (`<rdp>/locale/pt-BR.js:16`, `:20`; `en-US.js:22`, `:26`; `es.js:16`, `:20`).
- Testes: um arquivo novo em jsdom no design system, um novo em jsdom na `apps/app` e o teste SSR da `/contact`
  reescrito. Todos reprovam no código atual.
- Sem SDK, API, Firestore, env, dependência nem infra.

## 1. Contexto

### 1.1 Problema

| Âncora | Hoje | Efeito |
|--------|------|--------|
| `<ds>/date-input.tsx:95-102` | `<Calendar mode="single" onSelect=… selected={selected} />`, sem `defaultMonth` | o react-day-picker abre em `month \|\| defaultMonth \|\| today` (`<rdp>/helpers/getInitialMonth.js:13-14`): uma data já preenchida abre no mês atual |
| `<entity>/(components)/EntityFormFields.tsx:154-157` | `HookFormDateInput` sem `captionLayout` | só navegação mês a mês; de outubro de 2026 a abril de 1990 são 438 cliques em "mês anterior" |
| `<contact>/contact-form-client.tsx:21` | `useState<Date \| undefined>(new Date())` | o botão mostra o dia do servidor no HTML e o dia do navegador na hidratação; com dias diferentes, erro React #418 (medido com `TZ=Pacific/Kiritimati`, `date-input-locale/test/report.md:65`) |
| `<contact>/contact-form-client.tsx:108` | `initialFocus` | `@deprecated` (`<rdp>/types/props.d.ts:316-318`) e, medido no pacote instalado, sem efeito nenhum: o único consumidor de foco inicial é `useFocus.js:19`, que lê só `autoFocus` |
| `<contact>/contact-form-client.tsx:73` | `<Label htmlFor="date">` | nenhum elemento tem `id="date"`; o botão de data não tem nome acessível vindo do rótulo |

### 1.2 Conferência das afirmações da auditoria

| Afirmação | Situação |
|-----------|----------|
| `date-input.tsx:95-102` sem `defaultMonth`; `getInitialMonth.js:13-14` com `month \|\| defaultMonth \|\| today` | confere |
| `EntityFormFields.tsx:154-157` sem seletor | confere |
| `captionLayout="dropdown"` já traduzido pela PR #44 (`calendar.tsx:192-197`) | confere (`formatMonthDropdown` com o `dateLib`) |
| Sem `startMonth`/`endMonth`, o seletor vai de 100 anos atrás ao fim do ano corrente (`getNavMonth.js:33-44`) | confere. Acréscimo: o mesmo intervalo trava também os botões de mês anterior/próximo e o mês inicial (`getInitialMonth.js:16-23` faz o clamp), então uma data fora dele abre na borda do intervalo |
| `AuditFilters.tsx:82-91` | confere |
| `contact-form-client.tsx:21` (`new Date()`), `:108` (`initialFocus`), `:73` (`htmlFor="date"` sem alvo) | confere. Acréscimo: `initialFocus` é ignorado em runtime no 9.13.0, então removê-lo não muda comportamento |
| `data-day` com `toLocaleDateString()` em `calendar.tsx:229` | confere. Nenhum arquivo do repositório lê o atributo (`grep -rn "data-day" apps packages` só acha a própria linha) |
| Rótulos "Escolha o mês/ano" no locale do react-day-picker | confere nos três idiomas: "Escolha o mês"/"Escolha o ano", "Choose the Month"/"Choose the Year", "Elegir el mes"/"Elegir el año" |
| Seed com `1990-04-17` | confere (`apps/api/scripts/seed-emulator.mjs:47`; também `1985-11-02` em `:55` e `2000-01-30` em `:83`) |

Nada da auditoria foi derrubado. Um desvio de forma na `/contact` (§12, D4): em vez de três remendos no bloco feito
à mão, o bloco passa a usar o `DateInput`.

### 1.3 Achado: um teste que hoje só passa em outubro de 2026

`packages/design-system/__tests__/dateInputLocale.test.tsx:204-218` abre um `DateInput` com `value="2026-10-13"` e
clica no botão "20 de outubro de 2026". Como o calendário abre no mês atual, o botão só existe quando o relógio está
em outubro de 2026. Em novembro de 2026 a grade começa no domingo, 1º de novembro (conferido com `date`), sem dias de
outubro, e o teste reprova. Nenhuma linha desse teste muda: o `defaultMonth` desta tarefa faz o calendário abrir em
outubro de 2026 por causa do valor, e o teste passa em qualquer mês.

### 1.4 Objetivo e corte

Corte de MVP:

1. Com valor, o calendário do `DateInput` abre no mês da data; sem valor, no mês atual. Vale para todos os
   consumidores, porque é o comportamento esperado de qualquer seletor de data.
2. O `DateInput` aceita `captionLayout`, `startMonth` e `endMonth` opcionais. Sem eles, a navegação segue igual à de
   hoje, sem limite de intervalo.
3. O campo de nascimento de `entity` usa o seletor de mês e ano, com o intervalo padrão do react-day-picker
   (de 1º de janeiro de cem anos atrás até 31 de dezembro do ano corrente).
4. O valor gravado continua `yyyy-MM-dd` (`date-input.tsx:98`); schema e API de `entity` não mudam.
5. A `/contact` da web não tem mais erro de hidratação por fuso, não usa `initialFocus`, e o rótulo "Data" nomeia o
   botão.

Fora do corte, só citados:

- `data-day={day.date.toLocaleDateString()}` (`calendar.tsx:229`). Nenhum código, teste ou CSS lê o atributo, e o
  `Calendar` só renderiza no navegador (dentro do popover), então não há divergência de hidratação. Mexer nele não
  muda nada observável. Continua como achado no backlog.
- Limitar o nascimento a datas passadas (`endMonth` no mês atual, `disabled={{ after: hoje }}`). O schema do front
  (`entityFormSchema.ts:76-82`) e o da API (`entity.schema.ts:39-43`) aceitam data futura; mudar isso é regra de
  produto (§11, P2).
- Data de nascimento com mais de cem anos. O seletor não alcança o ano e o calendário abre em janeiro do primeiro ano
  do intervalo; o botão continua mostrando a data certa e o valor não se perde enquanto ninguém clica num dia. Um
  fork que precise disso passa `startMonth` (§11, P3).
- `autoFocus` no `Calendar` do `DateInput` (foco no dia selecionado ao abrir). Hoje o Radix foca o primeiro
  elemento focável do popover, o botão de mês anterior, e o `initialFocus` da `/contact` nunca teve efeito. Mudar
  o foco de todos os `DateInput` é decisão de acessibilidade à parte (§11, P4).
- Anos em ordem decrescente no seletor (`reverseYears`, `<rdp>/types/props.d.ts:198`).
- Estouro do header da web em es, citado no mesmo relatório. Não tem relação com data.

### 1.5 Apps impactados

| App/pacote | Impacto |
|------------|---------|
| `packages/design-system` | `components/ui/date-input.tsx`; 1 teste novo |
| `apps/app` | `<entity>/(components)/EntityFormFields.tsx` (1 prop); 1 teste novo |
| `apps/web` | `<contact>/contact-form-client.tsx`; teste `contactFormDateLocale.test.tsx` reescrito |
| `AGENTS.md` | 1 linha na seção "Data (`DateInput`)" |
| `apps/api`, `packages/sdk`, `packages/internationalization`, demais | nenhum |

Área: comum (formulário de `entity`) e admin (filtros da trilha, só como regressão). Modo de produto e plano:
indiferentes. A `/contact` é pública.

### 1.6 Fontes

`specs/BACKLOG.md:231-278`; `docs/features/date-input-locale/test/report.md:65`, `:137-151`;
`docs/features/date-input-locale/analyze/plan.md` §13.3. Nenhuma referência inacessível.

## 2. Dados (Firestore)

N/A. O `birthdate` de `entity` continua string `yyyy-MM-dd` ou `null`.

## 3. Contrato `@repo/sdk`

N/A.

## 4. API

N/A. Nenhum `error.code` novo.

## 5. Front-end

### 5.1 Design system: `<ds>/date-input.tsx`

- `DateInputProps` ganha `Pick<PropsBase, "captionLayout" | "endMonth" | "startMonth">` (`PropsBase` é exportado
  por `react-day-picker`, `<rdp>/types/props.d.ts:21`; os campos estão em `:100`, `:127` e `:190`).
- As três props são desestruturadas e repassadas ao `Calendar`, junto com `defaultMonth={selected}`.
- `defaultMonth` só vale na montagem do DayPicker. O `PopoverContent` do Radix desmonta o conteúdo ao fechar, então
  cada abertura monta o calendário de novo com o valor do momento: escolher uma data, fechar e reabrir mostra o mês
  da nova data. O teste N3 (§8) prova isso.
- Com `captionLayout="dropdown"`, o react-day-picker deixa a legenda visível como dois `<select>` ("abr" e "1990") e
  mantém uma `span role="status"` escondida com a legenda completa ("abril 1990") (`<rdp>/DayPicker.js:257-279`).
- O `Calendar` não muda. Já repassa `captionLayout` (`calendar.tsx:30`, `:44`) e os demais por `{...props}` (`:202`).

### 5.2 `apps/app`

`EntityFormFields.tsx:154-157` ganha `captionLayout="dropdown"`. Mais nada no formulário muda. Sob personificação o
campo continua desabilitado (`entityFormsReadOnly.test.tsx`), e o popover não abre.

### 5.3 `apps/web`

`contact-form-client.tsx`:

- estado vira `const [date, setDate] = useState("")`;
- o `<Popover>…</Popover>` (`:79-114`) dá lugar a `<DateInput id="date" onChange={setDate} value={date} />`;
- o `<Label htmlFor="date">` externo (`:73-78`) fica, para manter o mesmo espaçamento (`gap-1`) dos outros campos
  do formulário; agora ele aponta para o botão do `DateInput` (`date-input.tsx:82`, `id={id}`);
- saem os imports que ficam sem uso: `Calendar`, `Popover*`, `calendarLocales`, `cn`, `format` e `CalendarIcon`.
  `Button`, `Input`, `Label`, `Check`, `MoveRight` e `getDictionary` continuam. O `locale` da desestruturação de
  `getDictionary()` (`:20`) também sai, porque só servia ao `format`.

O botão vazio passa a mostrar o placeholder do dicionário ("Escolha uma data" / "Pick a date" / "Elige una fecha",
`components.dateInput.placeholder`) em vez de repetir o rótulo "Data". O popover passa a abrir alinhado à esquerda
(`align="start"`, `date-input.tsx:94`). O formulário é maquete: não tem `<form>`, o botão "Enviar" não tem handler,
e a action `contact` (`apps/web/app/[locale]/contact/actions/contact.tsx`) não recebe data. Nada a jusante lê o
estado.

### 5.4 Estados

| Estado | Como produzir | Esperado |
|--------|---------------|----------|
| nascimento vazio | `/entities/create` | placeholder; ao abrir, mês e ano atuais nos seletores (`out` / `2026`) |
| nascimento preenchido | `/entities/edit/<id>` da entidade do seed com `1990-04-17` | ao abrir, seletores em `abr` / `1990`, dia 17 marcado |
| nascimento com `null` | `/entities/edit/<id>` de uma entidade do seed sem data (`seed-emulator.mjs:39`) | igual ao vazio |
| reabrir depois de escolher | escolher 11/09/2001 pelos seletores, fechar, reabrir | seletores em `set` / `2001` |
| filtros da trilha | `/admin/audit`, "De"/"Até" | sem seletor de mês e ano; com data escolhida, reabre no mês dela |
| `/contact` vazia | carregar a página | placeholder no idioma; nenhum erro no console, mesmo com fuso do servidor diferente |
| personificação | admin personificando, `/entities/edit/<id>` | botão desabilitado, como hoje |

## 6. i18n

Nenhuma chave nova. Rótulos dos seletores vêm de `labels.labelMonthDropdown`/`labelYearDropdown` do locale que o
`Calendar` já aplica (`calendar.tsx:39-40`, `:200`). O placeholder da `/contact` vem da folha
`components.dateInput` criada pela PR #44.

## 7. Autorização e segurança

N/A. Nenhuma regra de acesso muda. A troca na `/contact` dá nome acessível ao botão de data, o que é melhoria de
acessibilidade e não de segurança.

## 8. Testes

Todos em jsdom ou SSR em `node`, sem emulador nem app de pé. Nada aqui depende de Firestore, regra ou processo
externo. Nos casos que dependem do relógio, usar `vi.useFakeTimers({ toFake: ["Date"] })` com
`vi.setSystemTime(new Date("2026-10-13T12:00:00"))`, como o `contactFormDateLocale.test.tsx:20-23` já faz.

### 8.1 Design system: `packages/design-system/__tests__/dateInputNavigation.test.tsx` (novo, jsdom)

Setup copiado do `dateInputLocale.test.tsx:19-39`, `:81-88` (mock de `next/navigation` com `params` içados,
`NoopObserver`, `renderInLocale`). Abrir o popover com `fireEvent.click` no botão do `DateInput`.

| # | Caso | No `HEAD` |
|---|------|-----------|
| N1 | `value="1990-04-17"`, abrir: a legenda "abril 1990" aparece e o botão do dia 17 existe | reprova (abre em outubro de 2026) |
| N2 | sem valor, relógio em 13/10/2026, abrir: legenda "outubro 2026" | passa; regressão |
| N3 | `value="1990-04-17"`, abrir, fechar com `Escape`, `rerender` com `value="2001-09-11"`, abrir: legenda "setembro 2001" | reprova |
| N4 | `captionLayout="dropdown"`, `value="1990-04-17"`, relógio em 13/10/2026: comboboxes "Escolha o mês" e "Escolha o ano"; ano selecionado `1990`, mês selecionado abril; opções de ano de `1926` a `2026` (101) | reprova (a prop não existe e o calendário não tem combobox) |
| N5 | `it.each(locales)` com `captionLayout="dropdown"`: nomes dos comboboxes "Escolha o mês"/"Escolha o ano", "Choose the Month"/"Choose the Year", "Elegir el mes"/"Elegir el año" (literais no teste) | reprova |
| N6 | `captionLayout="dropdown" startMonth={2020-01-01} endMonth={2030-12-31}`: opções de ano de `2020` a `2030` | reprova |
| N7 | sem `captionLayout`, `value="2030-06-15"`: nenhum combobox, legenda "junho 2030" e o botão de próximo mês habilitado (sem `aria-disabled`) | reprova na legenda (abre no mês atual); "sem combobox" e "próximo mês habilitado" já valem hoje e ficam como regressão |
| N8 | `captionLayout="dropdown"`, sem valor, relógio em 13/10/2026: trocar o ano para `1990` no combobox e clicar no dia 17 chama `onChange("1990-10-17")` | reprova; prova que o valor gravado continua `yyyy-MM-dd` pelo caminho novo |

### 8.2 `apps/app`: `apps/app/__tests__/entityBirthdateField.test.tsx` (novo, jsdom)

Renderiza `EntityFormFields mode="create"` dentro de um `FormProvider` de `useForm` com os `defaultValues` do
formulário, sob `LocaleProvider` com `params.locale = "pt-br"`. Mocks: `next/navigation` (`useParams`), e o que o
componente puxa de fora se o render exigir (`@/shared/lib/storageEnabled`, por exemplo, como os testes vizinhos
fazem). Abre o campo pelo rótulo (`getByLabelText("Data de nascimento")`) e confere o combobox "Escolha o ano".
Prova que o modelo de CRUD que o `/new-crud` copia liga o seletor. No `HEAD`, reprova.

### 8.3 `apps/web`: `apps/web/__tests__/contactFormDateLocale.test.tsx` (reescrito, SSR em `node`)

O teste atual afirma que a data de hoje aparece no botão (`:29-43`). Esse comportamento sai de propósito (§12, D4),
então o teste é substituído, não afrouxado. A formatação da data no idioma continua coberta, no mesmo componente
que a `/contact` passa a usar, por `dateInputLocale.test.tsx:116-120`.

| # | Caso | No `HEAD` |
|---|------|-----------|
| C1 | `it.each(locales)`: o HTML do servidor mostra `globalTranslations[locale].components.dateInput.placeholder` | reprova (mostra a data) |
| C2 | o HTML gerado com o relógio em `2026-10-13T12:00:00` é igual ao gerado com `2026-10-14T12:00:00` | reprova. É a prova barata do #418: a hidratação diverge se e somente se o primeiro render depende do relógio |
| C3 | o HTML tem `<label` com `for="date"` e `<button` com `id="date"` | reprova (o botão não tem `id`) |

A ausência de `initialFocus` não ganha teste: a prop não chega ao DOM nem muda comportamento no 9.13.0, então um
teste não teria o que observar. O `/review` confere por leitura.

### 8.4 Regressão que deve seguir verde

`dateInputLocale.test.tsx` inteiro (com o caso de `:204-218` agora independente do mês), `hookformAria.test.tsx:96-97`,
`apps/app/__tests__/auditFilters.test.tsx` (mocka o `DateInput`), `entityFormsReadOnly.test.tsx` (mocka o
`EntityFormFields`) e a paridade de i18n.

Mutação a registrar no handoff: N1, N3 a N8, o teste da `apps/app` e C1 a C3 reprovam com o código atual.

## 9. O que o `/test` vai percorrer

App e web em `build && start`, emuladores com `pnpm seed`. Três idiomas, claro e escuro, 1280 px e 390 px. O
navegador em `America/Sao_Paulo`.

1. `/entities/edit/<id>` da entidade com `1990-04-17`: abrir o calendário. Os seletores mostram `abr` e `1990`
   (pt-br), `Apr` e `1990` (en), `abr` e `1990` (es); o dia 17 está marcado. Os nomes acessíveis dos dois seletores
   saem no idioma.
2. Mesma tela: trocar o ano pelo seletor, escolher um dia, salvar, e conferir na resposta da API (`GET /entities/<id>`
   ou aba de rede) que o `birthdate` foi como `yyyy-MM-dd`. Reabrir: o calendário abre no mês salvo.
3. `/entities/create`: abrir o calendário vazio. Seletores no mês e ano atuais; o seletor de ano vai de 1926 a 2026.
4. `/admin/audit`: os campos "De" e "Até" continuam sem seletor de mês e ano, os botões de mês anterior e próximo
   continuam sem limite, e uma data escolhida reabre no mês dela. Aplicar o filtro continua funcionando.
5. `/contact` da web, servidor com `TZ=Pacific/Kiritimati` (o repro do `date-input-locale/test/report.md:65`):
   zero erro no console e em `window.onerror` (o mesmo init script daquela medição, porque o console do
   agent-browser não captura o #418 em produção). O botão mostra o placeholder no idioma; clicar no rótulo "Data"
   foca o botão; a árvore de acessibilidade dá ao botão o nome "Data". Escolher uma data mostra a data por extenso
   no idioma, e reabrir abre no mês dela.
6. Claro, escuro e 390 px: os dois `<select>` do seletor cabem no popover sem estourar a tela, nos três idiomas.
   Os meses curtos têm três letras nos três idiomas (medido com o date-fns 4.1.0: `jan … dez`, `Jan … Dec`,
   `ene … dic`), então a largura não deve variar por idioma. No escuro, conferir que a lista de opções nativa do
   `<select>` é legível.

Nada aqui depende de infra externa; nada fica 🔒 por isso.

## 10. Critérios de aceite

- [ ] **Calendário abre no mês da data selecionada**
  Em qualquer `DateInput` com valor, abrir o calendário mostra o mês desse valor: "abril 1990" para a entidade do
  seed com `1990-04-17` em `/entities/edit/<id>`. Sem valor, com `null` vindo da API ou com valor fora do formato
  `yyyy-MM-dd`, abre no mês atual, como hoje. Escolher outra data, fechar e reabrir mostra o mês da nova data.

- [ ] **Seletor de mês e ano no nascimento de `entity`**
  O campo "Data de nascimento" de `/entities/create` e `/entities/edit/<id>` mostra um seletor de mês e outro de ano,
  com nomes acessíveis no idioma da URL ("Escolha o mês"/"Escolha o ano", "Choose the Month"/"Choose the Year",
  "Elegir el mes"/"Elegir el año"). O seletor de ano cobre de 1926 a 2026 (cem anos para trás até o fim do ano
  corrente). Sob personificação o campo continua desabilitado.

- [ ] **Quem não pede o seletor fica como está**
  Os campos "De" e "Até" de `/admin/audit` continuam com a navegação mês a mês, sem seletor e sem limite de
  intervalo: o botão de próximo mês continua habilitado em qualquer ano. Eles ganham apenas a abertura no mês da
  data selecionada.

- [ ] **Intervalo configurável**
  Um `DateInput` com `captionLayout="dropdown"`, `startMonth` e `endMonth` limita o seletor de ano a esse
  intervalo. Sem `startMonth`/`endMonth`, vale o intervalo padrão do critério anterior.

- [ ] **Valor gravado inalterado**
  Escolher um dia pelos seletores de mês e ano continua gravando `yyyy-MM-dd` no formulário, e a API de `entity`
  recebe e devolve o `birthdate` no mesmo formato. Nenhum schema, rota ou documento muda.

- [ ] **`/contact` sem erro de hidratação**
  Com o servidor da web em `TZ=Pacific/Kiritimati` e o navegador em `America/Sao_Paulo`, a `/contact` carrega sem
  erro #418 nos três idiomas. O campo de data começa vazio, com o placeholder do idioma ("Escolha uma data", "Pick a
  date", "Elige una fecha"), em vez de pré-selecionar o dia de hoje.

- [ ] **`/contact` acessível e sem prop depreciada**
  O rótulo "Data"/"Date"/"Fecha" está ligado ao botão do calendário: clicar no rótulo foca o botão, e o nome
  acessível do botão é o texto do rótulo. O código da página não usa mais `initialFocus`. A data escolhida aparece
  por extenso no idioma e o calendário reabre no mês dela.

- [ ] **Tema, responsivo e regressão**
  Claro, escuro e 390 px sem estouro horizontal, com os seletores legíveis nos dois temas. `pnpm check`, os
  `typecheck` do design system, da app e da web, e as suítes desses três workspaces passam, com os testes novos
  reprovando no código anterior.

## 11. Perguntas em aberto

Todas já vêm com a opção adotada; mudar qualquer uma é barato e localizado.

| # | Pergunta | Opções | Adotada e por quê |
|---|----------|--------|-------------------|
| P1 | A `/contact` deve começar com a data de hoje pré-selecionada? | (a) começar vazia; (b) preencher hoje num `useEffect` depois da montagem | (a). O formulário é maquete sem envio, e uma conversa agendada não tem motivo para começar hoje. (b) faz o botão piscar do placeholder para a data e mantém código só para isso |
| P2 | Limitar o nascimento a datas passadas? | (a) não, intervalo padrão até o fim do ano corrente; (b) `endMonth` no mês atual e dias futuros desabilitados | (a). Os schemas do front e da API aceitam data futura hoje; restringir é regra de produto, não navegação |
| P3 | Cobrir nascimento com mais de cem anos? | (a) não, intervalo padrão; (b) `startMonth` fixo, como 1900 | (a). O critério da auditoria pede cem anos, e o padrão entrega 101 sem número mágico. Fork que precise passa `startMonth` |
| P4 | Ligar `autoFocus` no calendário do `DateInput` (foco no dia selecionado ao abrir)? | (a) não nesta tarefa; (b) sim, para todos os `DateInput` | (a). Muda o foco de todos os consumidores e merece medição própria de teclado; a `/contact` não perde nada, porque o `initialFocus` dela nunca teve efeito |

## 12. Decisões tomadas sem perguntar

| # | Decisão | Alternativa descartada | Motivo |
|---|---------|------------------------|--------|
| D1 | `defaultMonth={selected}` para todos os `DateInput` | ligar só por prop | abrir no mês da data é o comportamento esperado de qualquer seletor; o critério 1 da auditoria vale para todos |
| D2 | Expor `captionLayout`, `startMonth` e `endMonth` | só `captionLayout`; prop booleana (`monthYearPicker`); objeto `calendarProps` | só `captionLayout` deixaria um fork com data futura (vencimento) preso ao fim do ano corrente sem saída, que é o risco apontado pela auditoria; um booleano inventa vocabulário que o `Calendar` não usa; `calendarProps` abriria `mode`, `selected` e `onSelect`, que o `DateInput` controla |
| D3 | Tipos via `Pick<PropsBase, …>` | redeclarar as uniões à mão | acompanha o react-day-picker sem cópia |
| D4 | `/contact` passa a usar o `DateInput` | três remendos no bloco feito à mão (`useState()` sem data, `initialFocus` → `autoFocus`, `id="date"` no botão, e ainda um `defaultMonth`) | regra de ouro 7 ("não reinvente primitivos") e `cycle-policy` §3 ("corrigir na raiz, não replicar workaround"): o bloco reimplementa o `DateInput` e teria de repetir cada correção dele. O arquivo continua um só |
| D5 | `Label` externo na `/contact`, `DateInput` sem `label` | passar `label` ao `DateInput` | o `DateInput` usa `gap-2` entre rótulo e botão (`date-input.tsx:63`); os outros campos do formulário usam `gap-1`. Manter o rótulo externo preserva o layout |
| D6 | Remover `initialFocus` sem trocar por `autoFocus` | `autoFocus` na `/contact` | `initialFocus` não faz nada no 9.13.0; removê-lo preserva o comportamento medido. Ligar foco é a P4 |
| D7 | `data-day` fora do corte | trocar por `format(day.date, "yyyy-MM-dd")` | ninguém lê o atributo e não há efeito observável; não tem relação com navegação |
| D8 | Não mexer no `dateInputLocale.test.tsx` | fixar o relógio no caso de `:204-218` | o `defaultMonth` já tira a dependência do mês; editar o teste seria mudança sem efeito |
| D9 | Uma linha no `AGENTS.md` sobre as props novas | não documentar | a seção "Data (`DateInput`)" (`AGENTS.md:75-78`) é onde o `/new-crud` e quem copia `entity` procuram como usar o componente |

## 13. Blueprint técnico

### 13.1 Design system

`<ds>/date-input.tsx`:

```diff
 import { format, isValid, parseISO } from "date-fns";
 import { CalendarIcon } from "lucide-react";
 import { forwardRef, useState } from "react";
+import type { PropsBase } from "react-day-picker";
 import { Label } from "./label";
 ...
 export type DateInputProps = {
   "aria-describedby"?: string;
   ...
   placeholder?: string;
-};
+} & Pick<PropsBase, "captionLayout" | "endMonth" | "startMonth">;
 ...
       disabled,
       placeholder,
+      captionLayout,
+      startMonth,
+      endMonth,
       "aria-describedby": ariaDescribedBy,
     },
 ...
             <Calendar
+              captionLayout={captionLayout}
+              defaultMonth={selected}
+              endMonth={endMonth}
               mode="single"
               onSelect={(date) => {
                 onChange?.(date ? format(date, "yyyy-MM-dd") : "");
                 setOpen(false);
               }}
               selected={selected}
+              startMonth={startMonth}
             />
```

`captionLayout={undefined}` cai no default `"label"` do `Calendar` (`calendar.tsx:30`), então quem não passa a prop
vê o mesmo de hoje. O Biome ordena imports e atributos; o `pnpm fix` acerta a ordem final.

### 13.2 `apps/app`

`<entity>/(components)/EntityFormFields.tsx`:

```diff
                 <HookFormDateInput
+                    captionLayout="dropdown"
                     label={entitiesForm.birthdate}
                     name="birthdate"
                 />
```

### 13.3 `apps/web`

`<contact>/contact-form-client.tsx`:

```diff
 import { Button } from "@repo/design-system/components/ui/button";
-import { Calendar } from "@repo/design-system/components/ui/calendar";
+import { DateInput } from "@repo/design-system/components/ui/date-input";
 import { Input } from "@repo/design-system/components/ui/input";
 import { Label } from "@repo/design-system/components/ui/label";
-import {
-    Popover,
-    PopoverContent,
-    PopoverTrigger,
-} from "@repo/design-system/components/ui/popover";
-import { calendarLocales } from "@repo/design-system/lib/calendar-locales";
-import { cn } from "@repo/design-system/lib/utils";
 import { getDictionary } from "@repo/internationalization/client";
-import { format } from "date-fns";
-import { CalendarIcon, Check, MoveRight } from "lucide-react";
+import { Check, MoveRight } from "lucide-react";
 import { useState } from "react";

 export const ContactFormClient = () => {
-    const { dictionary, locale } = getDictionary();
-    const [date, setDate] = useState<Date | undefined>(new Date());
+    const { dictionary } = getDictionary();
+    const [date, setDate] = useState("");
 ...
                                 <Label htmlFor="date">
                                     {dictionary.apps.web.pages.contact.hero.form.date}
                                 </Label>
-                                <Popover>
-                                    … (Button com format(date, "PPP", …), PopoverContent, Calendar initialFocus) …
-                                </Popover>
+                                <DateInput
+                                    id="date"
+                                    onChange={setDate}
+                                    value={date}
+                                />
```

### 13.4 `AGENTS.md`

Na seção "Data (`DateInput`)", depois da linha do `HookFormDateInput`:

```diff
+- Com valor, o calendário abre no mês da data. `captionLayout="dropdown"` liga os seletores de mês e ano (usado na
+  data de nascimento de `entity`); sem `startMonth`/`endMonth` o ano vai de cem anos atrás ao fim do ano corrente,
+  então campo de data futura com seletor precisa passar `endMonth`.
```

### 13.5 Árvore de arquivos

```
packages/design-system/
  components/ui/date-input.tsx                 (editado)
  __tests__/dateInputNavigation.test.tsx       (novo)
apps/app/
  app/[locale]/(authenticated)/(common)/(pages)/entities/(components)/EntityFormFields.tsx   (editado)
  __tests__/entityBirthdateField.test.tsx      (novo)
apps/web/
  app/[locale]/contact/components/contact-form-client.tsx   (editado)
  __tests__/contactFormDateLocale.test.tsx     (reescrito)
AGENTS.md                                      (editado, 1 item)
```

### 13.6 `contends_on`

- `packages/design-system/components/ui/date-input.tsx`
- `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(components)/EntityFormFields.tsx`
- `apps/web/app/[locale]/contact/components/contact-form-client.tsx`

Disjunto dos `contends_on` das três specs vivas, conforme `specs/BACKLOG.md` (seção "Lotes paralelos").

### 13.7 Ordem de implementação

1. Design system: `date-input.tsx`, depois `dateInputNavigation.test.tsx`.
2. `apps/app`: `EntityFormFields.tsx` e `entityBirthdateField.test.tsx`.
3. `apps/web`: `contact-form-client.tsx` e `contactFormDateLocale.test.tsx`.
4. `AGENTS.md`.
5. `pnpm check`, `pnpm --filter @repo/design-system typecheck`, `pnpm --filter app typecheck`,
   `pnpm --filter web typecheck` e as suítes dos três workspaces.

### 13.8 Chaves de i18n

Nenhuma.

### 13.9 Env

Nenhuma variável nova.

## 14. Pré-requisitos manuais de infra

Nenhum. Não há bucket, índice, regra, webhook, serviço nem credencial envolvidos, e nada vai para o
`docs/PRE-PRODUCTION.md`.

## 15. Plano de commits (para o `/review`)

O `specs/BACKLOG.md` já está modificado neste checkout pela auditoria de 2026-10-14 e é assunto separado
(`docs(specs)`): conferir `git diff --cached --stat` antes do primeiro commit.

1. `fix(design-system): open the date input calendar on the selected month and accept a month and year selector`:
   `date-input.tsx`, `dateInputNavigation.test.tsx`.
2. `feat(app): add a month and year selector to the entity birthdate field`: `EntityFormFields.tsx`,
   `entityBirthdateField.test.tsx`.
3. `fix(web): use the shared date input on the contact form`: `contact-form-client.tsx`,
   `contactFormDateLocale.test.tsx`.
4. `docs: document the date input month and year selector`: `AGENTS.md`.
5. `docs(features): date-input-navigation`: `docs/features/date-input-navigation/`.
