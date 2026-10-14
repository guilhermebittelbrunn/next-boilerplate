---
slug: date-input-locale
title: DateInput e Calendar no idioma ativo
task: -
spec: none
branch: fix/date-input-locale
epic: -
updated: 2026-10-13 17:46
---

# Pipeline — DateInput e Calendar no idioma ativo

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-13 17:12 | analyze/plan.md | `calendarLocales` (`ptBR`/`enUS`/`es` de `react-day-picker/locale`) em `calendar.tsx`, lido com `getDictionary()` e passado ao `DayPicker` antes do `{...props}`; `formatMonthDropdown` via `dateLib`; `DateInput` com placeholder do dicionário e `format(..., "PPP", { locale })`; `/contact` da web corrigida junto; 1 folha de i18n (`components.dateInput.placeholder`); 9 casos jsdom num teste novo; sem SDK, API, env ou infra; 4 commits sugeridos |
| develop | done    | 2026-10-13 17:20 | develop/handoff.md | `calendarLocales` + `getDictionary()` no `Calendar` e no `DateInput`, `/contact` da web corrigida, folha `components.dateInput.placeholder` nos 3 idiomas; 16 casos novos em `dateInputLocale.test.tsx` (10 reprovam no `HEAD`); gates verdes; desvios só no teste (T5, T6, T9) |
| review  | in-progress | 2026-10-13 17:30 | review/review.md | sem bloqueante; 1 🟡 corrigido (`calendarLocales` saiu do módulo `"use client"` para `lib/calendar-locales.ts`); troca de idioma confirmada por leitura (o subtree de `[locale]` remonta); 6 itens para o `/test`; gates verdes; 5 commits propostos na branch `fix/date-input-locale` |
| test    | done    | 2026-10-13 17:46 | test/criterios-aceite.md; test/report.md | 8/8 critérios ✅ em build de produção (app/web) + emulador, 3 idiomas, claro/escuro, 390 px; 6/6 itens do review confirmados; 1 teste novo na web (`contactFormDateLocale`, 3 casos); `pnpm test` raiz verde; nenhum defeito novo, 3 achados anteriores para o backlog (#418 na `/contact` com fuso diferente, calendário sem `defaultMonth`, estouro do header da web em es) |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec, a partir da recomendação #1 de `specs/BACKLOG.md:230-272`. Plano feito em rodada
  autônoma do `/cycle`: as 7 decisões tomadas sem perguntar estão na §12 do plano, e as 3 perguntas da §11 já
  vêm com a opção adotada.
- `contends_on`: `packages/design-system/components/ui/date-input.tsx` e
  `packages/design-system/components/ui/calendar.tsx`. Esta tarefa também toca
  `apps/web/app/[locale]/contact/components/contact-form-client.tsx` (§11, P1).
- O `specs/BACKLOG.md` já estava modificado neste checkout antes desta etapa; conferir
  `git diff --cached --stat` antes do primeiro commit.
- Pré-requisitos manuais de infra: nenhum.
