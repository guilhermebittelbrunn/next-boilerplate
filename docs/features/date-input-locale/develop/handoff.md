# Handoff do develop: date-input-locale

Implementação do `analyze/plan.md` sobre o working tree que já trazia o `specs/BACKLOG.md` modificado pela
auditoria. Não mexi nele. Sem branch, sem commit, sem `git add` (`git diff --cached --stat` vazio ao final).

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| §6 / §13.6 i18n | `packages/internationalization/translations/components/ui/date-input.ts` (novo, `placeholder` nos 3 idiomas, textos da §6); `components/index.ts` liga como `dateInput` nos três blocos |
| §5.1 / §13.1 `Calendar` | `packages/design-system/components/ui/calendar.tsx`: `calendarLocales` exportado (`:28`, `satisfies Record<Locale, DayPickerLocale>`), `getDictionary()` no corpo (`:47-48`), `formatMonthDropdown` via `dateLib` com fallback `new DateLib(...)` (`:201`), `locale={calendarLocale}` antes do `{...props}` (`:208`) |
| §5.1 / §13.1 `DateInput` | `packages/design-system/components/ui/date-input.tsx`: sem default `"Pick a date"`, `getDictionary()` em `:60`, `format(selected, "PPP", { locale: calendarLocales[locale] })` e `placeholder ?? dictionary.components.dateInput.placeholder` em `:91-93`. O `onSelect` que grava `yyyy-MM-dd` não mudou |
| §5.3 / §13.2 `apps/web` (P1) | `apps/web/app/[locale]/contact/components/contact-form-client.tsx`: importa `calendarLocales`, desestrutura `locale` (`:22`) e formata com `{ locale: calendarLocales[locale] }` (`:92-96`) |
| §8 T1-T9 | `packages/design-system/__tests__/dateInputLocale.test.tsx` (novo, 10 `it`, 16 casos com os `each`) |

O barrel `components/ui/index.ts:53` já faz `export * from './calendar'`, então `calendarLocales` sai por ali
sem mudança no arquivo.

## Contrato

Nenhum DTO, action do SDK ou rota de API mudou. A única API nova é o export `calendarLocales` de
`packages/design-system/components/ui/calendar.tsx`. Consumidores: `date-input.tsx`, a `/contact` da
`apps/web` e o teste novo.

Quem passa a ver o efeito sem mudar arquivo: `EntityFormFields.tsx:154-157` (placeholder do dicionário),
`AuditFilters.tsx:82-91` (mantém o próprio placeholder; data e calendário no idioma) e qualquer outro uso do
`Calendar`, que agora recebe `locale` por padrão.

## Códigos de erro novos

Nenhum. Sem mudança em `apiErrors`.

## Desvios do plano

Nenhuma decisão de código do plano estava errada. Os três desvios ficam no teste:

1. **T6 não reaproveita o mesmo elemento no `rerender`.** O plano pedia `rerender` "do mesmo `Calendar`"
   trocando só o `params.locale`. Com um único elemento JSX guardado numa constante e passado de novo, o
   React descarta a re-renderização do filho (a referência é a mesma) e o `Calendar` continua com o idioma
   antigo: medido, o caso reprovou com `Unable to find an element with the text: October 2026` com a
   correção aplicada. É consequência da D1: `getDictionary()` lê estado de módulo e não assina o contexto,
   como o JSDoc de `packages/internationalization/client.ts` avisa para componentes acima do `[locale]`. O
   teste agora cria um elemento novo a cada `rerender`, que é o que acontece quando a página re-renderiza,
   e a instância continua montada. Não troquei para `useDictionary()` porque o `Calendar` e o `DateInput` só
   aparecem abaixo do `[locale]`, e a regra de `apps/app/CLAUDE.md` manda `getDictionary()` nesse caso. A
   troca real de idioma por `router.push` vai para o `/test`.
2. **T5 lê o cabeçalho dos dias com `{ hidden: true }`.** O react-day-picker renderiza a linha de dias da
   semana com `aria-hidden`, então `getAllByRole("columnheader")` sem a opção não acha nada. O teste confere
   o `aria-label` do primeiro `th`: `domingo` / `Sunday` / `lunes`.
3. **T9 reprova no `HEAD`, e o plano dizia que passaria.** O teste acha o dia 20 pelo nome acessível em
   pt-br (`/20 de outubro de 2026/`); no `HEAD` o rótulo sai em inglês e a busca falha antes do clique. O
   valor gravado (`2026-10-20`) segue sendo o que o caso prova com a correção aplicada. A busca por
   `getByText("20", { selector: "button" })` não encontrou o botão no jsdom, por isso o nome acessível.

Achado do T1: `labels.labelNext` nos locales do react-day-picker é string, não função. O caso confere só que
o rótulo existe.

## Validação

Gates sem `--force`:

| Gate | Comando | Resultado |
|------|---------|-----------|
| lint | `pnpm check` | exit 0, 875 arquivos, "No fixes applied" |
| typecheck | `pnpm turbo run typecheck --filter=@repo/design-system --filter=web --filter=app --filter=@repo/internationalization` | 4/4 tasks ok (1 do cache) |
| testes | `pnpm turbo run test --filter=@repo/design-system --filter=web --filter=app --filter=@repo/internationalization` | 11/11 tasks ok. design-system 10 arquivos/132 testes, app 103/841, web 15/90, internationalization 7/67 |
| paridade i18n | `parity.test.ts` dentro da suíte de `@repo/internationalization` | verde nos 67 |

O design system tinha 116 testes; a diferença para 132 são os 16 casos novos. `hookformAria.test.tsx`
(renderiza o `HookFormDateInput` sem `LocaleProvider`), `entityFormsReadOnly.test.tsx` e
`auditFilters.test.tsx` passaram sem mudança.

## Mutação (os testes reprovam sem a correção)

Cada mutação foi feita com cópia em `/tmp` e restaurada; `cmp` e `git diff --stat` conferidos depois.

| Mutação | Resultado em `dateInputLocale.test.tsx` |
|---------|------------------------------------------|
| `calendar.tsx` e `date-input.tsx` voltam ao `HEAD` (`git show HEAD:<arquivo>`), i18n mantida | 10 de 16 reprovam: T1; T2 e T4 em pt-br e es; T5 em pt-br e es; T6; T8; T9. Passam no `HEAD`: T2/T4/T5 em en (o texto antigo já é o inglês), T3, o placeholder vazio e T7 |
| `locale={calendarLocale}` movido para depois do `{...props}` | 1 de 16 reprova (T7, o `locale` do chamador deixa de vencer) |
| `formatMonthDropdown` volta a `toLocaleString("default", { month: "short" })` | 1 de 16 reprova (T8). O processo roda em `en-US` (`Intl.DateTimeFormat().resolvedOptions().locale`) e sai "Oct" |

## Smoke local

Não subi app nem processo. Nenhum screenshot.

## A verificar no `/test`

- Troca de idioma pelo seletor em `/entities/edit/<id>` e `/entities/create`: o botão do `DateInput` e o
  calendário aberto mudam de idioma sem recarregar (§9 item 3). O jsdom só provou a troca quando o pai
  re-renderiza (desvio 1). Repro: abrir a página em pt-br, trocar para en e es pelo seletor e ler o texto do
  botão e a legenda do calendário.
- Hidratação: console sem aviso em `/entities/edit/<id>` nos três idiomas (§9 item 7). Não medi; o `format`
  roda no servidor e no cliente com o mesmo locale do segmento.
- `/contact` da `apps/web` nos três idiomas (§9 item 5). Só o typecheck e a suíte da web cobrem; nenhum teste
  renderiza o `ContactFormClient`.
- `/admin/audit` (§9 item 4) e o `birthdate` gravado como `yyyy-MM-dd` na resposta da API (§9 item 1).
- Layout do popover em 390 px com as legendas mais longas ("septiembre 2026") e semana começando na
  segunda em es (§9 item 6).
- `captionLayout="dropdown"` não tem consumidor no produto; só o T8 mede.

## Lacunas de teste conhecidas

- Nenhum teste renderiza o `ContactFormClient` da `apps/web` (ambiente `node`, sem `@testing-library/react`).
- A troca de idioma por navegação do App Router não é reproduzível no jsdom.
