# Revisão: date-input-locale

Revisão feita em rodada autônoma do `/cycle`, em 2026-10-13, sobre o working tree. Nenhum commit, nenhuma
branch criada, índice vazio ao terminar (`git diff --cached --stat` sem saída).

## Branch

- Atual: `guilhermebittelbrunn/cycle-command-v3`, no mesmo commit da `origin/main` (`7fb2fe9`), sem upstream
  e sem commit à frente. O regex do `/review` reprova o nome (`BRANCH INVALIDA`).
- Proposta: **`fix/date-input-locale`**, a criar a partir da atual com `git switch -c fix/date-input-locale`.
  O regex aprova (`branch OK: fix/date-input-locale`).
- Por que sem `<project>`: o diff cruza `packages/internationalization`, `packages/design-system` e
  `apps/web`. `packages` deixaria a `apps/web` de fora, e `design-system` esconderia os outros dois. O
  precedente é o registrado em E11 do `specs/BACKLOG.md`: a PR #43, que cruzava pacotes e apps, saiu como
  `fix/<slug>`, forma que o regex aceita.
- Não criei a branch: o `/cycle` não cria branch nem commita. Quem cria é o orquestrador do `/review`, depois
  da aprovação do usuário.

## Diff revisado

Dois assuntos no working tree:

1. `specs/BACKLOG.md`: auditoria do backlog pós-PR #43. Não revisei o conteúdo como código; só separei no plano
   de commits.
2. A feature: folha de i18n `components.dateInput`, `Calendar` e `DateInput` no idioma ativo, `/contact` da
   `apps/web` e o teste `dateInputLocale.test.tsx`, mais os artefatos em `docs/features/date-input-locale/`.

## Revisão

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `packages/design-system/components/ui/calendar.tsx:28` (antes da correção): `calendarLocales` era exportado
  de um módulo `"use client"`. Um Server Component que o importasse para formatar data receberia uma client
  reference no lugar do objeto, e `calendarLocales[locale]` lançaria erro em runtime ("Cannot access ... on
  the server"). O typecheck não pega isso. Hoje os três consumidores são client (`date-input.tsx`,
  `contact-form-client.tsx`, o teste), mas o mapa é API nova de um pacote que todo fork herda, e formatar
  data numa página RSC é o uso óbvio dele. **Corrigido**: o mapa foi para
  `packages/design-system/lib/calendar-locales.ts`, sem diretiva, e os quatro consumidores importam de lá.

### 🟢 Sugestão / nit

- `apps/web/app/[locale]/contact/components/contact-form-client.tsx:21`: `useState(new Date())` roda no
  servidor e no cliente. Com o servidor em UTC e o navegador em `America/Sao_Paulo`, entre 21h e 23h59 o dia
  difere e o texto do botão diverge na hidratação. É anterior a esta tarefa (o diff só acrescenta o locale ao
  `format`) e fica fora do corte. Vai para o `/test` observar e, se aparecer, para o backlog.
- `calendar.tsx:200`: `locale={calendarLocale}` antes do `{...props}` faz um `locale={undefined}` explícito
  do chamador voltar ao `enUS` do DayPicker. Nenhum consumidor faz isso; registro só para quem ler a API.
- `getDictionary()` no `Calendar` e no `DateInput` segue o precedente dos componentes do design system da PR
  #43 (`add-button.tsx`, `carousel.tsx`). Funciona porque os dois só aparecem abaixo do segmento `[locale]`
  (ver a análise abaixo). Se um fork usar o `Calendar` num componente acima do segmento, o idioma não acompanha
  a troca; `useDictionary()` cobriria os dois casos. Não troquei: mudaria o padrão dos demais componentes do
  pacote, fora do escopo.

### ✅ OK

- Troca de idioma pelo `LanguageSwitcher` re-renderiza `DateInput` e `Calendar` em todos os consumidores,
  confirmado por leitura (análise abaixo).
- `satisfies Record<Locale, DayPickerLocale>` (`lib/calendar-locales.ts:9`) obriga as três chaves de
  `Locale`; tirar uma reprova o typecheck. O T1 confere as chaves contra `locales` em runtime.
- O valor gravado continua `yyyy-MM-dd`: `date-input.tsx:98`, `format(date, "yyyy-MM-dd")`, sem locale. O
  padrão é numérico e não depende do idioma.
- SSR e hidratação com o locale: no servidor, `getDictionary()` lê `use(LocaleContext)`
  (`packages/internationalization/client.ts:41-44`); no cliente, lê o `lastRenderedBrowserLocale` que o
  `LocaleProvider` grava no render (`client.ts:52-54`). O provider é ancestral dos dois componentes, então
  renderiza antes deles na hidratação, com o mesmo `useParams()`. O `value` é data local sem hora
  (`parseISO("yyyy-MM-dd")`), então fuso não muda o texto do `DateInput`.
- Tree-shaking: `react-day-picker@9.13.0` declara `"sideEffects": ["**/*.css"]` e o entry `locale` é ESM com
  reexports nomeados; importar `enUS`, `es` e `ptBR` não puxa os demais locales.
- `formatMonthDropdown` (`calendar.tsx:192-197`) usa o `dateLib` que o DayPicker passa
  (`formatMonthDropdown(month, dateLib = defaultDateLib)` em `dist/esm/formatters/formatMonthDropdown.js:13`),
  que já carrega o `locale` efetivo, inclusive o do chamador.
- i18n: folha nova `translations/components/ui/date-input.ts` no formato das irmãs (`spinner.ts`), ligada nos
  três blocos de `components/index.ts`. Textos iguais ao `datePlaceholder` já existente em `auditTrail.ts`.
  Nenhum literal de UI sobrou: `rg "Pick a date"` só acha as traduções.
- Design system continua presentacional (sem fetch, sem sessão); depender de
  `@repo/internationalization/client` tem precedente (`carousel.tsx`, `add-button.tsx`, `antd-app.tsx`).
- Sem comentário novo no código; nenhuma referência ao fluxo.
- Teste em `packages/design-system/__tests__/`, imports explícitos de `vitest`, sem `toBeInTheDocument`,
  `next/navigation` mockado com `vi.hoisted`.

### 👁 Verificar no `/test`

1. **Troca de idioma pelo seletor com o `DateInput` na tela.** Fechei por leitura que funciona, mas é o
   critério que sustenta a tarefa e o jsdom não reproduz a navegação. Repro: `/pt-br/entities/edit/<id>` com
   `birthdate` preenchido; trocar para `en` e depois `es` pelo seletor da navbar, sem recarregar; ler o texto
   do botão (`October 13th, 2026`, `13 de octubre de 2026`) e abrir o calendário para ler a legenda e o
   primeiro dia da semana (`lunes` em es). Repetir com o popover aberto antes de clicar no seletor.
2. **Hidratação.** Console sem aviso de hydration mismatch em `/entities/edit/<id>` nos três idiomas, carregando
   a página direto pela URL (não por navegação).
3. **`/contact` da `apps/web` nos três idiomas.** Nenhum teste renderiza o `ContactFormClient`. Ler o botão da
   data e a legenda do calendário em `/pt-br/contact`, `/en/contact` e `/es/contact`. Se der para controlar o
   horário, observar o caso do nit sobre `new Date()` entre 21h e 23h59.
4. **`/admin/audit`**: os dois filtros de data mantêm o `datePlaceholder` da página e mostram data e calendário
   no idioma ativo.
5. **`birthdate` gravado como `yyyy-MM-dd`** na resposta da API depois de escolher um dia em es.
6. **Popover em 390 px** com a legenda mais longa (`septiembre 2026`) e a semana começando na segunda em es.

## Por que a troca de idioma re-renderiza (leitura)

O handoff registrou que, num `rerender` com o mesmo elemento, o `Calendar` não atualiza, porque
`getDictionary()` lê estado de módulo e não assina contexto. Isso é verdade, mas não é o que acontece na troca
real:

- O `LanguageSwitcher` (`apps/app/shared/components/ui/LanguageSwitcher.tsx:47-58`, e o da web em
  `apps/web/app/[locale]/components/header/language-switcher.tsx:50`) faz `router.push` para
  `/<novo-locale>/<mesmo caminho>`. Muda o valor do segmento dinâmico `[locale]`.
- No `next@16.0.0`, o `OuterLayoutRouter` usa como `key` do subtree o `stateKey` do segmento
  (`dist/esm/client/components/layout-router.js:418` e `:553`), e para segmento dinâmico ele é
  `locale|<valor>|d` (`create-router-cache-key.js`). Valor novo, key nova: tudo abaixo de `[locale]` é
  desmontado e montado de novo. `cacheComponents` não está ligado em nenhum `next.config`, então não há
  `<Activity>` guardando a árvore antiga.
- Na `apps/app`, o `LocaleProvider` está no root layout (`apps/app/app/layout.tsx:79`), acima do segmento. Ele
  re-renderiza com o `useParams()` novo e grava o locale antes de os filhos montarem. Na `apps/web`, o provider
  está dentro do próprio `[locale]/layout.tsx:34` e remonta junto.
- `EntityFormFields.tsx:154`, `AuditFilters.tsx:82-91` e `contact-form-client.tsx` ficam abaixo do segmento;
  o `Calendar` dentro do `Popover` também, porque o portal do Radix mantém a posição na árvore React. Nenhum
  dos dois componentes é memoizado.

A conclusão vale enquanto esses consumidores estiverem abaixo de `[locale]`. O caso acima do segmento é o nit
sobre `useDictionary()`.

## Correções aplicadas

- `packages/design-system/lib/calendar-locales.ts` (novo): o mapa `calendarLocales` com o
  `satisfies Record<Locale, DayPickerLocale>`, sem `"use client"`.
- `packages/design-system/components/ui/calendar.tsx:9`: importa `calendarLocales` de `lib/`; saíram a
  definição local, o export e os imports `Locale`, `DayPickerLocale` e `react-day-picker/locale`.
- `packages/design-system/components/ui/date-input.tsx:4,10`: `Calendar` de `components/ui/calendar`,
  `calendarLocales` de `lib/calendar-locales`.
- `apps/web/app/[locale]/contact/components/contact-form-client.tsx:4,12`: mesma troca de import.
- `packages/design-system/__tests__/dateInputLocale.test.tsx:1-3`: mesma troca de import.

Comportamento igual; muda só o módulo de onde o mapa sai. O mapa deixa de sair pelo barrel
`components/ui/index.ts`, que nenhum consumidor usava para ele.

## Raio de impacto

- Nenhum DTO, action do SDK, rota, `error.code` ou `apiErrors` mudou.
- API nova: `calendarLocales` em `@repo/design-system/lib/calendar-locales`. Consumidores: `date-input.tsx`,
  `calendar.tsx`, `contact-form-client.tsx`, o teste.
- Mudança de comportamento sem mudança de arquivo: todo `Calendar` e todo `DateInput` passam a seguir o idioma
  ativo. Usos no produto: `EntityFormFields.tsx:154` (passa a usar o placeholder do dicionário),
  `AuditFilters.tsx:82-91` (mantém o próprio placeholder) e `contact-form-client.tsx:107`.
- `DateInput` sem `placeholder` em teste sem `LocaleProvider` (`hookformAria.test.tsx`) cai no locale padrão;
  o handoff mediu essa suíte verde.
- A suíte E2E (`apps/e2e`) não procura `Pick a date` nem data formatada (`rg` sem resultado).

## Lacunas de teste

| Lacuna (do handoff) | Veredito |
|---------------------|----------|
| Nenhum teste renderiza o `ContactFormClient` da `apps/web` (ambiente `node`, sem `@testing-library/react`) | continua aberta; coberta pelo item 3 do `/test` |
| Troca de idioma por navegação do App Router não é reproduzível no jsdom | continua aberta como teste automatizado; o comportamento foi fechado por leitura e vai ao item 1 do `/test` |

Nenhuma lacuna nova. O nome do T6 ("troca o idioma sem remontar quando a página re-renderiza") descreve o
re-render do pai, que não é o caminho da troca real (lá o subtree remonta). O caso continua útil e não mudei.

## Decisões em aberto

1. **Nome da branch.** Recomendação: `fix/date-input-locale`, criada a partir da atual. Alternativa:
   `design-system/fix/date-input-locale`, se o usuário preferir nomear pelo pacote principal; o regex aprova as
   duas.
2. **`new Date()` inicial na `/contact`** (nit acima). Recomendação: não mexer nesta PR; se o `/test`
   reproduzir o mismatch, registrar no backlog com `arquivo:linha`.

## Gates

| Gate | Comando | Resultado |
|------|---------|-----------|
| lint | `pnpm check` | exit 0, 875 arquivos, "No fixes applied" (o `lib/` do design system é excluído do Biome) |
| typecheck | `pnpm turbo run typecheck --filter=@repo/design-system --filter=web --filter=app` | 3/3 ok (1 do cache) |
| teste do arquivo tocado | `vitest run __tests__/dateInputLocale.test.tsx` em `packages/design-system` | 16/16 |
| paridade i18n | não remedido: não toquei em `packages/internationalization` | número do handoff, 7 arquivos/67 testes verdes |

Sem `--force`. Typecheck de `@repo/internationalization` não foi remedido pelo mesmo motivo (handoff: ok).

## Varredura de segredo

`rg` por senha, token, chave, e-mail e prefixos de credencial em `docs/features/date-input-locale/`: só aparecem
nomes de componente (`hookformInputPassword.tsx`, `ui-strings-and-password-focus`). Nenhum segredo, nenhum
screenshot.

## Plano de commits

Antes do primeiro: criar a branch (`git switch -c fix/date-input-locale`) e conferir
`git diff --cached --stat` vazio. Depois de cada commit, `git show --stat --oneline HEAD` contra a lista.

O i18n vem antes do design system, contra a ordem padrão da regra, porque `date-input.tsx` lê
`dictionary.components.dateInput.placeholder`: com o design system primeiro, aquele commit não passaria no
typecheck. A PR #43 seguiu a mesma ordem pelo mesmo motivo.

1. `docs(specs): audit the backlog after PR #43`
   - `specs/BACKLOG.md`
2. `fix(internationalization): add the date input placeholder in three languages`
   - `packages/internationalization/translations/components/ui/date-input.ts`
   - `packages/internationalization/translations/components/index.ts`
3. `fix(design-system): render DateInput and Calendar in the active locale`
   - `packages/design-system/lib/calendar-locales.ts`
   - `packages/design-system/components/ui/calendar.tsx`
   - `packages/design-system/components/ui/date-input.tsx`
   - `packages/design-system/__tests__/dateInputLocale.test.tsx`
4. `fix(web): format the contact form date in the active locale`
   - `apps/web/app/[locale]/contact/components/contact-form-client.tsx`
5. `docs(features): date-input-locale`
   - `docs/features/date-input-locale/STATE.md`
   - `docs/features/date-input-locale/analyze/plan.md`
   - `docs/features/date-input-locale/develop/handoff.md`
   - `docs/features/date-input-locale/review/review.md`

Título de PR sugerido: `fix: render DateInput and Calendar in the active locale`.

Depois do último commit aprovado, o orquestrador pergunta se faz `git push -u origin fix/date-input-locale`.

### Commits realizados

(preenchido pelo orquestrador)
