---
slug: date-input-navigation
title: Seletores de data levam à data certa
task: -
spec: none
branch: fix/date-pickers-form-fields-and-header (recomendada para a PR das três tarefas, a renomear a partir de guilhermebittelbrunn/cycle-command-v4)
epic: -
updated: 2026-10-14 12:22
---

# Pipeline — Seletores de data levam à data certa

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-14 11:44 | analyze/plan.md | `defaultMonth={selected}` no `DateInput` para todos; props opcionais `captionLayout`/`startMonth`/`endMonth` repassadas ao `Calendar`; `captionLayout="dropdown"` só no nascimento de `entity`; `/contact` passa a usar o `DateInput` (começa vazia, sem `initialFocus`, `Label` ligado por `id="date"`); `data-day` fora do corte; sem i18n, SDK, API, env ou infra; 3 arquivos de teste (2 novos, 1 reescrito); 5 commits sugeridos |
| develop | done    | 2026-10-14 11:53 | develop/handoff.md | `defaultMonth` e as props `captionLayout`/`startMonth`/`endMonth` no `DateInput`, seletor no nascimento de `entity`, `/contact` com `DateInput`; 17 testes novos ou reescritos, 16 reprovam no código antigo (N2 é regressão) e todos passam; typecheck, `pnpm check` e as suítes de design system, app, web e i18n passam |
| review  | done    | 2026-10-14 12:05 | review/review.md | nenhum achado bloqueante; o teste da `apps/app` passou a usar o `LocaleProvider` (antes dependia do idioma padrão); typecheck 3/3 e `pnpm check` (878 arquivos) passam; 8 itens com veredito para o `/test`; branch recomendada `fix/date-input-navigation` (passa no regex, a atual não); 6 commits propostos, aguardando aprovação do usuário |
| test    | done    | 2026-10-14 12:22 | test/report.md | 12 critérios ✅, 0 ❌, 1 🔒 (lista nativa do `<select>` no escuro, não renderiza em headless); os 8 itens do review confirmados em build de produção, incluindo zero #418 na `/contact` com o servidor em `TZ=Pacific/Kiritimati`; 2 testes novos ou ampliados (design system 146, app 845), `pnpm test` da raiz 15/15; nenhum defeito no diff; portas liberadas |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec, a partir da recomendação #1 de `specs/BACKLOG.md:231-278`. Plano feito em rodada
  autônoma do `/cycle`: as 9 decisões tomadas sem perguntar estão na §12 do plano, e as 4 perguntas da §11 já vêm
  com a opção adotada.
- Desvio em relação à auditoria: a `/contact` troca o bloco de data feito à mão pelo `DateInput` em vez de receber
  três remendos (§12, D4). O teste SSR `contactFormDateLocale.test.tsx` é reescrito porque a data de hoje
  pré-selecionada sai de propósito (§8.3).
- Achado: `dateInputLocale.test.tsx:204-218` só passa enquanto o relógio estiver em outubro de 2026; o
  `defaultMonth` desta tarefa tira essa dependência (§1.3).
- `contends_on`: `packages/design-system/components/ui/date-input.tsx`,
  `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(components)/EntityFormFields.tsx` e
  `apps/web/app/[locale]/contact/components/contact-form-client.tsx`.
- O `specs/BACKLOG.md` já estava modificado neste checkout antes desta etapa; conferir
  `git diff --cached --stat` antes do primeiro commit.
- Pré-requisitos manuais de infra: nenhum.
- Revisão feita em rodada autônoma do `/cycle`: nenhum commit, nenhuma branch criada ou renomeada. Os commits do
  plano em `review/review.md` aguardam a aprovação do usuário.
- `/test` em rodada autônoma do `/cycle`: dados só no emulador (Joana Ribeiro voltou a `1990-04-17`), nenhuma conta nova. O `/review` deve incluir `apps/app/__tests__/auditFiltersDateInput.test.tsx` no commit da app (junto do `entityBirthdateField.test.tsx`) e `test/criterios-aceite.md` e `test/report.md` no commit `docs(features)`.
