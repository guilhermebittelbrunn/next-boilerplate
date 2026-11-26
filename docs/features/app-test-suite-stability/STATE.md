---
slug: app-test-suite-stability
title: Estabilidade da suíte Vitest da apps/app sob carga
task: -
spec: -
branch: feat/admin-account-forms-and-session-revocation
epic: -
updated: 2026-11-26 12:03
---

# Pipeline — Estabilidade da suíte Vitest da apps/app sob carga

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-26 00:00 | analyze/plan.md | Três edições em arquivos de teste da `apps/app`: `afterEach(cleanup)` no `tableLoadMore`, prazo de 10 s nas esperas do `signInEmailLinkEntry`, consultas por rótulo no calendário do `auditFiltersDateInput`. Medição: suíte inteira com 16 `yes` em paralelo, 3 execuções |
| develop | done    | 2026-11-26 00:42 | develop/handoff.md | As três edições aplicadas. Teste do calendário 48% mais rápido sob carga (pares alternados). Suíte verde 3/3 com 16 `yes`, mas a linha de base (5 execuções, 16 e 32 `yes`) não reproduziu os sintomas originais |
| review  | done    | 2026-11-26 12:03 | review/review.md | Sem bloqueante nem correção. Nenhuma asserção afrouxada (conferido no `react-day-picker` 9.13.0). Linha de base sem reprodução segue explícita no Verificar no `/test`. Commits 14 e 20 acrescentados ao plano combinado |
| test    | done    | 2026-11-26 01:08 | test/report.md  | Asserções intactas e calendário 48% mais rápido (medição própria). Suíte verde com 16 `yes`; com 32 `yes` saiu 1 por timeout do pool do Vitest em 6 arquivos fora do escopo. Sintomas originais não reproduzidos (🔒). `pnpm test` raiz saída 0. `review` segue in-progress (sem commits) |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec. Origem: achado 🟡 em `specs/reference/AUDIT.md` (seção "Achados do `/test` de `admin-own-account`").
- Diff só de teste, sem superfície de runtime: o `/test` não sobe app nem abre browser.
- Nenhum dos três arquivos-alvo nem o `vitest.config.mts` foi alterado pelas features não commitadas do working tree.
