# Plano: `DateInput` e `Calendar` no idioma ativo

Tarefa direta, sem spec. Vem da recomendação #1 de `specs/BACKLOG.md` (seção "Ordem recomendada",
`:230-272`), que reúne os dois últimos achados de strings soltas do design system deixados de fora pela PR #43.
Plano feito em rodada autônoma do `/cycle`: as decisões tomadas sem perguntar estão na §12, e a §11 traz as
perguntas já com a opção adotada.

As âncoras foram reconferidas neste checkout em 2026-10-13. Abreviações: `<ds>` =
`packages/design-system/components/ui`, `<i18n>` = `packages/internationalization/translations`,
`<rdp>` = `node_modules/.pnpm/react-day-picker@9.13.0_react@19.2.0/node_modules/react-day-picker/dist/esm`.

## 0. Sumário do desenho

- `<ds>/calendar.tsx` ganha o mapa `calendarLocales` (`pt-br` → `ptBR`, `en` → `enUS`, `es` → `es`, todos de
  `react-day-picker/locale`), no molde do `antdLocales` (`providers/antd-app.tsx:150-154`). O `Calendar` lê o
  idioma com `getDictionary()` e passa `locale={calendarLocales[locale]}` ao `DayPicker` **antes** do
  `{...props}`, então um `locale` do chamador continua vencendo. O `formatMonthDropdown` passa a formatar com
  o `dateLib` que o próprio DayPicker entrega, em vez de `toLocaleString("default")`.
- `<ds>/date-input.tsx` perde o default `"Pick a date"`, usa `placeholder ?? dictionary.components.dateInput.placeholder`
  e formata a data com `format(selected, "PPP", { locale: calendarLocales[locale] })`. O valor gravado continua
  `format(date, "yyyy-MM-dd")` (`:93`), sem locale.
- Os locales do react-day-picker estendem os do date-fns (`<rdp>/locale/pt-BR.js:4-6`), então o mesmo objeto
  serve para o `DayPicker` e para o `format` do date-fns. As duas bibliotecas resolvem para o mesmo
  `date-fns@4.1.0`. Nenhuma dependência nova.
- `apps/web/.../contact-form-client.tsx:89` repete o `format(date, "PPP")` sem locale do lado de fora do
  `DateInput`. Entra no corte pela `cycle-policy` §3 ("defeito encontrado no caminho, corrija"): sem isso, o
  calendário da página de contato passaria a falar português e o botão continuaria em inglês (§11, P1).
- i18n: uma folha nova, `<i18n>/components/ui/date-input.ts`, com `placeholder`, ligada em
  `<i18n>/components/index.ts`. Nenhum `apiErrors`.
- Teste novo em jsdom no `@repo/design-system` (`dateInputLocale.test.tsx`), que reprova no código atual em
  pt-br e es.
- Sem SDK, API, Firestore, env ou infra.

## 1. Contexto

### 1.1 Problema

Medido neste checkout:

| Âncora | Hoje | Efeito |
|--------|------|--------|
| `<ds>/date-input.tsx:51` | `placeholder = "Pick a date"` | "Pick a date" em pt-br e es quando o chamador não passa placeholder |
| `<ds>/date-input.tsx:86` | `format(selected, "PPP")` sem `locale` | "October 13th, 2026" nos três idiomas |
| `<ds>/calendar.tsx:38-194` | `DayPicker` sem `locale` | o DayPicker cai no `enUS` (`<rdp>/classes/DateLib.js:463`, `this.options = { locale: enUS, ...options }`): mês, dias da semana e os rótulos "Go to the Previous Month"/"Go to the Next Month" em inglês |
| `<ds>/calendar.tsx:187-191` | `formatMonthDropdown: (date) => date.toLocaleString("default", { month: "short" })` | segue o idioma do navegador, não o da URL. Só aparece com `captionLayout` de dropdown, que nenhum consumidor usa hoje |
| `apps/web/app/[locale]/contact/components/contact-form-client.tsx:89` | `format(date, "PPP")` sem `locale` | data do botão em inglês na `/contact` |

Saída medida com o date-fns 4.1.0 e os locales do react-day-picker 9.13.0 instalados, para 13/10/2026:

| Idioma | `format(d, "PPP", { locale })` | legenda (`formatMonthYear`) | mês curto (`"LLL"`) | dia da semana (`"cccccc"`) | `labelNext` / `labelPrevious` | `weekStartsOn` |
|--------|------|------|------|------|------|------|
| pt-br (`ptBR`) | 13 de outubro de 2026 | outubro 2026 | out | ter | Ir para o próximo mês / Ir para o mês anterior | 0 (domingo) |
| en (`enUS`) | October 13th, 2026 | October 2026 | Oct | Tu | Go to the Next Month / Go to the Previous Month | 0 (domingo) |
| es (`es`) | 13 de octubre de 2026 | octubre 2026 | oct | ma | Ir al mes siguiente / Ir al mes anterior | 1 (segunda) |

Duas consequências que o `/test` deve esperar, e que não são defeito: em es a semana do calendário passa a
começar na segunda-feira, porque é o que o locale `es` do date-fns declara; e em pt-br e es os nomes de mês e
dia saem em minúscula ("outubro 2026"), que é a grafia do date-fns para esses idiomas (§11, P2).

### 1.2 Conferência das afirmações da auditoria

| Afirmação | Situação |
|-----------|----------|
| `date-input.tsx:51` crava "Pick a date"; `:86` formata sem locale; `:93` grava `yyyy-MM-dd` | confere |
| `calendar.tsx:38-194` sem `locale`; `:188-189` com `toLocaleString("default")`; `{...props}` em `:193` | confere |
| react-day-picker 9.13.0 exporta `react-day-picker/locale` com `ptBR` e `es` | confere (`package.json` `exports["./locale"]`; `locale.d.ts:45`, `:89`). Também exporta `enUS` (`:41`), com os rótulos em inglês, que usamos para `en` |
| date-fns 4.1.0 | confere; o `react-day-picker` aponta para o mesmo `date-fns@4.1.0` do `@repo/design-system` |
| Zero dependência nova | confere: `react-day-picker` e `date-fns` já estão em `packages/design-system/package.json` |
| Os 8 componentes da PR #43 leem o dicionário com `getDictionary()` | confere para os do design system (`add-button.tsx:15`, `dialog.tsx:58`, `pagination.tsx:16`, `select/index.tsx:84`, `table.tsx:70`, `hookformInputPassword.tsx:43`); o `AntdAppProvider` é a exceção com `useDictionary()` (`antd-app.tsx:158`), porque fica acima do `[locale]` |
| `EntityFormFields.tsx:154-157` sem placeholder; `AuditFilters.tsx:82-91` com placeholder | confere (`:85` e `:90` passam `auditFilters.datePlaceholder`) |
| `Calendar` também em `contact-form-client.tsx:102` | confere, e a auditoria não citou o `format(date, "PPP")` da `:89`, que tem o mesmo defeito |

Nada da auditoria foi derrubado. Dois acréscimos: a `:89` da página de contato e o `weekStartsOn` do `es`.

### 1.3 Objetivo e corte

Corte de MVP:

1. Sem `placeholder` do chamador, o `DateInput` mostra o placeholder do dicionário nos três idiomas; o
   `placeholder` do chamador continua vencendo.
2. Com data, o botão do `DateInput` formata no idioma da URL.
3. O `Calendar` mostra legenda, dias da semana, rótulos de navegação e meses do dropdown no idioma ativo e
   acompanha a troca de idioma; um `locale` passado pelo chamador vence.
4. O valor gravado continua `yyyy-MM-dd`; nada muda no schema nem na API de `entity`.
5. O botão de data da `/contact` (`apps/web`) formata no idioma da URL, junto com o calendário dela.

Fora do corte, só citados:

- `data-day={day.date.toLocaleDateString()}` em `<ds>/calendar.tsx:220`: atributo de dados do shadcn, não é
  visível nem lido por leitor de tela. Fica como está.
- O `initialFocus` em `contact-form-client.tsx:103`, marcado como `@deprecated` no react-day-picker 9
  (`<rdp>/types/props.d.ts:316-318`). Achado para o backlog (§13.3).
- Remover o `auditFilters.datePlaceholder` (`<i18n>/apps/app/pages/admin/auditTrail.ts:33`, `:72`, `:111`),
  que passa a ter o mesmo texto do default. Ele é o caso que prova que o placeholder do chamador vence.
- Expor `locale` como prop do `DateInput`. Nenhum consumidor pede.
- Capitalizar mês e dia da semana em pt-br e es (§11, P2).

### 1.4 Apps impactados

| App/pacote | Impacto |
|------------|---------|
| `packages/design-system` | `components/ui/calendar.tsx`, `components/ui/date-input.tsx`; 1 teste novo |
| `apps/web` | `app/[locale]/contact/components/contact-form-client.tsx` (2 linhas) |
| `packages/internationalization` | 1 folha nova em `<i18n>/components/ui/` + `components/index.ts` |
| `apps/app` | nenhum arquivo; muda o que aparece em `/entities/create`, `/entities/edit/<id>` e `/admin/audit` |
| `apps/api`, `packages/sdk`, demais | nenhum |

Área: comum (formulário de `entity`) e admin (filtros da trilha de auditoria). Modo de produto e plano:
indiferentes.

### 1.5 Fontes

`specs/BACKLOG.md:230-272`; `docs/features/ui-strings-and-password-focus/analyze/plan.md` (§1.5, §12 D1 e D4,
§11 P3, que adiou exatamente este item). Nenhuma referência inacessível.

### 1.6 Como o componente obtém o idioma ativo

`@repo/internationalization/client` tem duas leituras (`client.ts:64-71`):

- `getDictionary()`: no servidor lê o `LocaleContext` com `use()`; no navegador lê o idioma que o
  `LocaleProvider` renderizou por último (`lastRenderedBrowserLocale`, `client.ts:17`, `:41-46`, `:55-57`).
- `useDictionary()`: lê o `LocaleContext` nos dois lados, e por isso re-renderiza quando o contexto muda.

O `LocaleProvider` resolve o idioma a partir do segmento `[locale]` (`client.ts:48-60`). Na `apps/app` ele fica
no root layout (`apps/app/app/layout.tsx:79`), na `apps/web` no `[locale]/layout.tsx:34`. A regra de
`apps/app/CLAUDE.md:47` manda usar `getDictionary()` em geral e `useDictionary()` só em componente client
acima do segmento `[locale]`. O `DateInput` e o `Calendar` só aparecem dentro de páginas sob `[locale]`, e o
seletor de idioma troca de página com `router.push` para `/<novo-idioma>/...`
(`apps/app/shared/components/ui/LanguageSwitcher.tsx:47-56`), o que re-renderiza a árvore da página. A PR #43
mediu esse caminho no `/test` para os componentes que usam `getDictionary()` ("rótulos acompanham pt-br → en
→ es sem recarregar"). Por isso `getDictionary()` (§12, D1).

`getDictionary()` deve ser chamado no corpo do componente, fora de `useMemo` e de inicializador de `useState`
(`client.ts:61-63`). Os dois arquivos já são `"use client"`.

Hidratação: o botão do `DateInput` é renderizado no servidor. Lá o idioma vem do `LocaleContext` (segmento da
URL); no navegador vem do mesmo segmento. O valor é data sem hora (`parseIsoDate`, `date-input.tsx:16-22`),
então fuso não muda o dia formatado. Não há risco novo de divergência de hidratação.

## 2. Dados (Firestore)

N/A. O `birthdate` de `entity` continua string `yyyy-MM-dd` ou `null`.

## 3. Contrato `@repo/sdk`

N/A.

## 4. API

N/A. Nenhum `error.code` novo.

## 5. Front-end

### 5.1 Design system

**`<ds>/calendar.tsx`**

- Exporta `calendarLocales`, `satisfies Record<Locale, DayPickerLocale>` (`Locale` de
  `@repo/internationalization/utils`, `DayPickerLocale` de `react-day-picker`), com `ptBR`, `enUS` e `es` de
  `react-day-picker/locale`. Como `components/ui/index.ts:53` faz `export * from './calendar'`, o mapa sai
  no barrel junto, como o `antdLocales` sai do provider.
- No corpo: `const { locale } = getDictionary();` e `const calendarLocale = calendarLocales[locale];`.
- `locale={calendarLocale}` no `DayPicker`, em ordem alfabética entre `formatters` e `showOutsideDays`, antes do
  `{...props}`.
- `formatMonthDropdown: (month, dateLib) => (dateLib ?? new DateLib({ locale: calendarLocale })).format(month, "LLL")`.
  O DayPicker sempre passa o `dateLib` (`<rdp>/DayPicker.js:260`, `<rdp>/helpers/getMonthOptions.js:23`), e
  esse `dateLib` foi montado com o `locale` efetivo, inclusive o do chamador
  (`<rdp>/DayPicker.js:87`, `:98`). O fallback só cobre o tipo, em que o parâmetro é opcional.
- O `...formatters` do chamador continua depois, como hoje.

**`<ds>/date-input.tsx`**

- `const { dictionary, locale } = getDictionary();` no corpo.
- Remove o default `placeholder = "Pick a date"` da desestruturação; o texto vira
  `placeholder ?? dictionary.components.dateInput.placeholder`. `??` mantém um placeholder vazio passado de
  propósito pelo chamador.
- `format(selected, "PPP", { locale: calendarLocales[locale] })`, importando `calendarLocales` do mesmo módulo
  de onde já vem o `Calendar` (`date-input.tsx:4`).
- `onSelect` (`:92-95`) não muda.
- O `DateInput` não repassa `locale` ao `Calendar`: o `Calendar` resolve o mesmo idioma sozinho.

### 5.2 `apps/app`

Nenhum arquivo. `EntityFormFields.tsx:154-157` passa a mostrar o placeholder do dicionário;
`AuditFilters.tsx:82-91` continua com o próprio placeholder, agora com data e calendário traduzidos.

### 5.3 `apps/web`

`contact-form-client.tsx:19` passa a desestruturar `locale` também, e a `:89` vira
`format(date, "PPP", { locale: calendarLocales[locale] })`, importando `calendarLocales` de
`@repo/design-system/components/ui/calendar` (o arquivo já importa o `Calendar` dali, `:4`). O formulário é
maquete: o estado inicial já vem com a data de hoje (`:20`).

### 5.4 Estados

| Estado | Como produzir | Esperado |
|--------|---------------|----------|
| vazio, sem placeholder do chamador | `/entities/create` | "Escolha uma data" / "Pick a date" / "Elige una fecha" |
| vazio, com placeholder do chamador | `/admin/audit` | `auditFilters.datePlaceholder` (mesmos textos hoje) |
| com data | `/entities/edit/<id>` de uma entidade do seed com `birthdate` (`apps/api/scripts/seed-emulator.mjs:47`, `:55`, `:83`) | ex.: `1990-04-17` → "17 de abril de 1990" / "April 17th, 1990" / "17 de abril de 1990" |
| calendário aberto | clicar no botão | legenda, cabeçalho dos dias e nomes dos botões de mês anterior/próximo no idioma |
| erro de validação | `birthdate` inválido não é produzível pela UI (só sai `yyyy-MM-dd` do `onSelect`) | sem mudança |
| desabilitado | durante o envio (`hookformDateInput.tsx:57-59`) | sem mudança |

## 6. i18n

Folha nova `<i18n>/components/ui/date-input.ts`:

```ts
export const dateInputTranslations = {
    "pt-br": { placeholder: "Escolha uma data" },
    en: { placeholder: "Pick a date" },
    es: { placeholder: "Elige una fecha" },
};
```

Ligada em `<i18n>/components/index.ts` como `dateInput` nos três blocos. Os textos repetem os de
`auditFilters.datePlaceholder` (`auditTrail.ts:33`, `:72`, `:111`), para os dois campos de data do produto
falarem igual. Os rótulos do calendário vêm prontos do `react-day-picker/locale` e não entram no dicionário
(§12, D3).

## 7. Autorização e segurança

N/A. Nenhuma regra de acesso muda. Sob personificação, o formulário de `entity` continua em modo leitura como
antes (`entityFormsReadOnly.test.tsx`); o botão do `DateInput` desabilitado mostra a data no idioma da URL.

## 8. Testes

Todos em jsdom, sem emulador: nada aqui depende de Firestore, regra ou processo externo.

| # | Arquivo | Nível | O que prova |
|---|---------|-------|-------------|
| T1 | `packages/design-system/__tests__/dateInputLocale.test.tsx` (novo) | unidade | `calendarLocales` tem exatamente as chaves de `locales`, e cada valor tem `labels.labelNext` |
| T2 | mesmo arquivo | componente | `it.each(locales)`: `<DateInput />` sem valor dentro do `LocaleProvider` mostra `globalTranslations[locale].components.dateInput.placeholder` |
| T3 | mesmo arquivo | componente | `<DateInput placeholder="Data de corte" />` mostra "Data de corte" em pt-br |
| T4 | mesmo arquivo | componente | `it.each`: `<DateInput value="2026-10-13" />` mostra "13 de outubro de 2026" / "October 13th, 2026" / "13 de octubre de 2026" (literais esperados no teste, não derivados do código) |
| T5 | mesmo arquivo | componente | `it.each`: `<Calendar mode="single" month={new Date(2026, 9, 1)} />` mostra a legenda "outubro 2026" / "October 2026" / "octubre 2026" e os botões com nome "Ir para o mês anterior"/"Ir para o próximo mês" (e equivalentes); o primeiro cabeçalho de dia da semana em es é segunda-feira |
| T6 | mesmo arquivo | componente | troca de idioma sem remontar: `rerender` do mesmo `Calendar` com `params.locale` em pt-br → en → es atualiza a legenda, como `antdLocale.test.tsx:87` |
| T7 | mesmo arquivo | componente | `locale={enUS}` passado ao `Calendar` sob pt-br vence: legenda "October 2026" |
| T8 | mesmo arquivo | componente | `captionLayout="dropdown"` em pt-br: as opções do seletor de mês incluem "out" (hoje sai o mês do idioma do processo, "Oct" no Node em inglês) |
| T9 | mesmo arquivo | componente | `DateInput` em pt-br: abrir o popover, clicar no dia 20 e conferir `onChange("2026-10-20")`, com `value="2026-10-13"` |

Setup: o mesmo do `componentCopy.test.tsx` (mock de `next/navigation` com `params` içados e `renderInLocale`).
O popover do Radix depende de `ResizeObserver`, então o teste copia o `NoopObserver` dele
(`componentCopy.test.tsx:77-92`). Atenção ao estado de módulo: `getDictionary()` lembra o último idioma
renderizado pelo `LocaleProvider`, então todo caso renderiza dentro do provider.

Mutação a registrar no handoff: T2 e T4 reprovam no `HEAD` em pt-br e es (passam em en, porque o texto atual
já é o inglês); T5 e T6 reprovam no `HEAD` em pt-br e es; T7 passa no `HEAD` (o `{...props}` já vence) e
fica como regressão; T8 reprova se o processo não estiver em pt; T9 passa no `HEAD` e é regressão do critério 4.

Regressão que já existe e deve seguir verde: `hookformAria.test.tsx:96-97` (renderiza o `HookFormDateInput`
sem `LocaleProvider`; `getDictionary()` cai no idioma padrão, sem `useParams`), `apps/app/__tests__/auditFilters.test.tsx:47`
(mocka o `DateInput` inteiro, não é afetado), `entityFormsReadOnly.test.tsx` e a paridade de i18n
(`packages/internationalization/__tests__/parity.test.ts`).

## 9. O que o `/test` vai percorrer

App em `build && start` com emuladores e `pnpm seed`. Três idiomas, claro e escuro, 1280 px e 390 px.

1. `/entities/create`: o botão de "Data de nascimento" mostra "Escolha uma data" / "Pick a date" / "Elige una
   fecha". Abrir o calendário: legenda do mês atual, cabeçalho dos dias e os nomes dos botões de mês
   anterior/próximo (pela árvore de acessibilidade) no idioma. Em es a primeira coluna é segunda-feira.
   Escolher um dia: o botão mostra a data por extenso no idioma. Salvar e conferir na resposta da API (aba de
   rede ou `GET /entities/<id>`) que o `birthdate` foi como `yyyy-MM-dd`.
2. `/entities/edit/<id>` de uma entidade do seed com `birthdate` (ex.: `1990-04-17`): a data aparece por extenso
   no idioma. Outra do seed com `birthdate: null` mostra o placeholder.
3. Troca de idioma pelo seletor, sem recarregar, em `/entities/edit/<id>`: o botão e o calendário mudam de
   idioma. A troca é um `router.push` para outra URL; o formulário pode perder edição não salva, como já
   acontece hoje (não é critério desta tarefa).
4. `/admin/audit`: os dois campos de período continuam com o placeholder da tela; data escolhida e calendário
   no idioma; aplicar filtro continua funcionando.
5. `apps/web` `/contact`: botão de data e calendário no idioma.
6. Claro, escuro e 390 px: o popover do calendário cabe na tela e a legenda mais longa ("septiembre 2026",
   "setembro 2026") não quebra o layout.
7. Console sem aviso de hidratação no carregamento de `/entities/edit/<id>` nos três idiomas.

Nada aqui depende de infra externa; nada fica 🔒 por isso.

## 10. Critérios de aceite

- [ ] **Placeholder do campo de data no idioma da página**
  Em `/entities/create`, sem valor, o campo de data mostra "Escolha uma data" em pt-br, "Pick a date" em en e
  "Elige una fecha" em es. Quando o chamador passa `placeholder`, como os filtros de `/admin/audit`, o texto do
  chamador continua valendo. Um placeholder vazio passado de propósito continua vazio.

- [ ] **Data escolhida por extenso no idioma da URL**
  Com valor `2026-10-13`, o botão mostra "13 de outubro de 2026", "October 13th, 2026" e "13 de octubre de 2026".
  O mesmo vale para a data carregada em `/entities/edit/<id>` e para a escolhida nos filtros de auditoria.
  Valor ausente ou fora do formato `yyyy-MM-dd` continua mostrando o placeholder, como hoje.

- [ ] **Calendário no idioma ativo**
  Ao abrir o calendário, a legenda do mês, o cabeçalho dos dias da semana e os nomes acessíveis dos botões de
  mês anterior e próximo saem no idioma da URL. Em es a semana começa na segunda-feira, pelo locale do
  date-fns. Com `captionLayout` de dropdown, os meses saem no idioma da URL, não no do navegador.

- [ ] **Troca de idioma sem recarregar**
  Trocar o idioma pelo seletor atualiza o placeholder, a data formatada e o calendário na página seguinte sem
  recarregar a aplicação. Um `locale` passado explicitamente ao `Calendar` continua vencendo o idioma da URL.

- [ ] **Valor gravado inalterado**
  Escolher um dia continua gravando `yyyy-MM-dd` no formulário em qualquer idioma, e a API de `entity` recebe e
  devolve o `birthdate` no mesmo formato. Nenhum schema, rota ou documento muda.

- [ ] **Página de contato da landing**
  Em `/contact` da `apps/web`, o botão de data e o calendário seguem o idioma da URL nos três idiomas.

- [ ] **Tema, responsivo e regressão**
  Claro, escuro e 390 px sem mudança de layout em relação ao `HEAD`, e sem aviso de hidratação no console. A
  paridade de i18n passa, e a suíte do design system, da `apps/app` e da `apps/web` passa sem afrouxar teste.

## 11. Perguntas em aberto

Todas já vêm com a opção adotada; mudar qualquer uma é barato e localizado.

| # | Pergunta | Opções | Adotada e por quê |
|---|----------|--------|-------------------|
| P1 | Corrigir também o `format(date, "PPP")` da `/contact` (`contact-form-client.tsx:89`), fora dos arquivos citados? | (a) incluir; (b) deixar para outra tarefa | (a). A `cycle-policy` §3 manda corrigir defeito encontrado no caminho. Sem ela, esta tarefa deixaria a `/contact` pior: calendário em português e botão em inglês. Custa 2 linhas e um commit na `apps/web` |
| P2 | Capitalizar mês e dia da semana em pt-br e es ("Outubro 2026")? | (a) deixar como o date-fns entrega ("outubro 2026"); (b) classe `capitalize` na legenda e no cabeçalho | (a). Em português e espanhol, nome de mês e dia da semana se escrevem em minúscula, e (b) é decisão visual que mexe nos três idiomas |
| P3 | Semana começando na segunda-feira em es? | (a) seguir o locale (`weekStartsOn: 1`); (b) fixar domingo com `weekStartsOn={0}` | (a). É o padrão do locale `es` e o que um usuário em espanhol espera; o chamador ainda pode passar `weekStartsOn` |

## 12. Decisões tomadas sem perguntar

| # | Decisão | Alternativa descartada | Motivo |
|---|---------|------------------------|--------|
| D1 | `getDictionary()` no `Calendar` e no `DateInput` | `useDictionary()` | é o padrão dos componentes do design system abaixo do `[locale]` (PR #43, D1 e D4; `apps/app/CLAUDE.md:47`), e a troca de idioma por `router.push` re-renderiza a página |
| D2 | Um mapa só, `calendarLocales` em `calendar.tsx`, usado pelo DayPicker e pelo `format` | mapa de `date-fns/locale` separado no `date-input.tsx`; arquivo novo em `lib/` | os locales do react-day-picker são os do date-fns com `labels` a mais e apontam para o mesmo date-fns 4.1.0; um mapa evita duas tabelas que podem divergir. Fica no módulo do `Calendar`, como o `antdLocales` fica no provider que o usa |
| D3 | Rótulos do calendário vêm do `react-day-picker/locale` | chaves próprias no dicionário passadas por `labels` | o pacote já traz os rótulos traduzidos e o `getLabels` aplica (`<rdp>/helpers/getLabels.js:22-27`); copiar para o dicionário duplicaria texto sem ganho |
| D4 | `locale` antes do `{...props}` | depois | o chamador precisa vencer (critério 3 da auditoria) |
| D5 | `formatMonthDropdown` via `dateLib` | `format` do date-fns com o locale do dicionário | o `dateLib` já carrega o locale efetivo, inclusive o do chamador; com o dicionário, um `locale` do chamador seria ignorado no dropdown |
| D6 | Manter o placeholder dos filtros de auditoria | remover o `auditFilters.datePlaceholder` | mudança mínima, e é o caso que prova que o chamador vence |
| D7 | Uma folha `components/ui/date-input.ts` com `placeholder` | chave dentro de outra folha | molde das folhas da PR #43, uma por componente |

## 13. Blueprint técnico

### 13.1 Design system

`<ds>/calendar.tsx`:

```diff
 "use client";

 import {
   Button,
   buttonVariants,
 } from "@repo/design-system/components/ui/button";
 import { cn } from "@repo/design-system/lib/utils";
+import { getDictionary } from "@repo/internationalization/client";
+import type { Locale } from "@repo/internationalization/utils";
 import {
   ChevronDownIcon,
   ChevronLeftIcon,
   ChevronRightIcon,
 } from "lucide-react";
 import type React from "react";
 import { useEffect, useRef } from "react";
 import {
+  DateLib,
   type DayButton,
+  type DayPickerLocale,
   DayPicker,
   getDefaultClassNames,
 } from "react-day-picker";
+import { enUS, es, ptBR } from "react-day-picker/locale";
+
+export const calendarLocales = {
+  "pt-br": ptBR,
+  en: enUS,
+  es,
+} satisfies Record<Locale, DayPickerLocale>;

 function Calendar({ ... }) {
   const defaultClassNames = getDefaultClassNames();
+  const { locale } = getDictionary();
+  const calendarLocale = calendarLocales[locale];

   return (
     <DayPicker
       ...
       formatters={{
-        formatMonthDropdown: (date) =>
-          date.toLocaleString("default", { month: "short" }),
+        formatMonthDropdown: (month, dateLib) =>
+          (dateLib ?? new DateLib({ locale: calendarLocale })).format(month, "LLL"),
         ...formatters,
       }}
+      locale={calendarLocale}
       showOutsideDays={showOutsideDays}
       {...props}
     />
   );
 }
```

`<ds>/date-input.tsx`:

```diff
-import { Calendar } from "@repo/design-system/components/ui/calendar";
+import {
+  Calendar,
+  calendarLocales,
+} from "@repo/design-system/components/ui/calendar";
 ...
+import { getDictionary } from "@repo/internationalization/client";
 ...
       disabled,
-      placeholder = "Pick a date",
+      placeholder,
       "aria-describedby": ariaDescribedBy,
     },
     ref
   ) {
+    const { dictionary, locale } = getDictionary();
     const [open, setOpen] = useState(false);
     const selected = parseIsoDate(value);
 ...
-              {selected ? format(selected, "PPP") : placeholder}
+              {selected
+                ? format(selected, "PPP", { locale: calendarLocales[locale] })
+                : (placeholder ?? dictionary.components.dateInput.placeholder)}
```

O Biome ordena imports e atributos JSX; o `pnpm fix` acerta a ordem final.

### 13.2 `apps/web`

`contact-form-client.tsx`:

```diff
-import { Calendar } from "@repo/design-system/components/ui/calendar";
+import {
+    Calendar,
+    calendarLocales,
+} from "@repo/design-system/components/ui/calendar";
 ...
-    const { dictionary } = getDictionary();
+    const { dictionary, locale } = getDictionary();
 ...
-                                                format(date, "PPP")
+                                                format(date, "PPP", {
+                                                    locale: calendarLocales[locale],
+                                                })
```

### 13.3 Achados para o backlog (o `/spec --sync` registra)

- `contact-form-client.tsx:103` usa `initialFocus`, `@deprecated` no react-day-picker 9
  (`<rdp>/types/props.d.ts:316-318`, "Use autoFocus instead").
- `<ds>/calendar.tsx:220` grava `data-day` com `toLocaleDateString()` do navegador. Invisível hoje; vira
  problema se algum teste ou CSS passar a depender dele.

### 13.4 Árvore de arquivos

```
packages/design-system/
  components/ui/calendar.tsx            (editado)
  components/ui/date-input.tsx          (editado)
  __tests__/dateInputLocale.test.tsx    (novo)
packages/internationalization/translations/components/
  ui/date-input.ts                      (novo)
  index.ts                              (editado)
apps/web/app/[locale]/contact/components/
  contact-form-client.tsx               (editado)
```

### 13.5 Ordem de implementação

1. i18n: folha `date-input.ts` + `components/index.ts` (o tipo do dicionário precisa da chave antes de o
   `DateInput` ler `components.dateInput`).
2. Design system: `calendar.tsx`, depois `date-input.tsx`, depois o teste.
3. `apps/web`: `contact-form-client.tsx`.
4. `pnpm check`, `pnpm --filter @repo/design-system typecheck`, `pnpm --filter web typecheck`,
   `pnpm --filter app typecheck` (o `app` consome o barrel) e a suíte dos três workspaces mais a da i18n.

### 13.6 Chaves de i18n

```
components
└── dateInput
    └── placeholder   pt-br "Escolha uma data" · en "Pick a date" · es "Elige una fecha"
```

### 13.7 Env e infra

Nenhuma variável nova.

**Pré-requisitos manuais de infra: nenhum.** Não há bucket, índice, regra, webhook nem credencial envolvidos;
nada vai para o `docs/PRE-PRODUCTION.md`.

### 13.8 Plano de commits (para o `/review`)

A i18n vai primeiro para cada commit compilar sozinho, como na PR #43 (o `DateInput` lê uma chave que só
existe depois dela). O `specs/BACKLOG.md` já está modificado neste checkout pela auditoria e é assunto
separado: conferir `git diff --cached --stat` antes do primeiro commit.

1. `feat(internationalization): add the default date input placeholder`: `date-input.ts`, `components/index.ts`.
2. `fix(design-system): localize the calendar and date input to the active locale`: `calendar.tsx`,
   `date-input.tsx`, `dateInputLocale.test.tsx`.
3. `fix(web): format the contact form date in the page locale`: `contact-form-client.tsx`.
4. `docs(features): date-input-locale`: `docs/features/date-input-locale/`.
