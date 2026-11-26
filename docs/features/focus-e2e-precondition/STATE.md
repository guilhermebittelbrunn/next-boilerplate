---
slug: focus-e2e-precondition
title: Pré-condição determinística no caso 1 do E2E de foco
task: -
spec: -
branch: feat/admin-account-forms-and-session-revocation
epic: -
updated: 2026-11-26 12:03
---

# Pipeline: pré-condição determinística no caso 1 do E2E de foco

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-26 03:26 | analyze/plan.md | Descrição longa garante campos abaixo da barra no caso 1, mais asserção de que o Tab rolou; provas de reprovação P1/P2 |
| develop | done    | 2026-11-26 03:34 | develop/handoff.md | Caso 1 com descrição longa, caret no início, `scrollTo(0)` e asserção de `scrollY`; spec passou 3/3 no chromium |
| review  | done    | 2026-11-26 12:03 | review/review.md | Sem bloqueante; `setSelectionRange` mantido como setup legítimo; achado 🟢 do caret no textarea; commits 6 e 42 no plano combinado |
| test    | done    | 2026-11-26 03:47 | test/report.md  | 30/30 no `--repeat-each=10`; P1, P2 e P3 confirmadas; folga mínima 19 px (11 controles abaixo da barra), `scrollY` 372 |
| observe | pending | -                | -               | - (opcional)     |

## Notas
- Tarefa direta vinda do achado 🟢 de `specs/reference/AUDIT.md:1856`. O spec já tem o `toPass` do caso 3 no working tree (tarefa `app-form-layout-centered`), que deve ser preservado.
