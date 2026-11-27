---
slug: test-cleanup-and-todate
title: Limpeza global do Testing Library na app e leitura única de instante do Firestore
task: -
spec: -
branch: feat/audit-log-levels
epic: -
updated: 2026-11-27 14:02
---

# Pipeline — Limpeza global do Testing Library na app e leitura única de instante do Firestore

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-27 10:07 | analyze/plan.md | Parte A: `setupFiles` com `afterEach(cleanup)` na `app` (24 arquivos hoje não limpam), teste-canário e medição da suíte antes e depois; parte B: `readFirestoreInstant` em `@repo/shared` e os três helpers da `api` viram adaptadores de uma linha (mapper de `user` idêntico, convite falha fechado, onboarding normaliza ISO); design system fora por falta de repro; sem SDK, i18n, env nem infra; 5 commits sugeridos |
| develop | done    | 2026-11-27 13:51 | develop/handoff.md | Parte A: `setupFiles` com `afterEach(cleanup)` na `app`, suíte 154/1403 → 155/1405 sem teste caído (diff arquivo a arquivo) e canário com mutação; parte B: `readFirestoreInstant` em `@repo/shared`, três helpers da `api` trocados, teste unitário novo provando que o convite com validade ilegível falha fechado (desvio de D8); gates app/api/shared, emulador 284/284, typecheck e `pnpm check` verdes |
| review  | done    | 2026-11-27 13:58 | review/review.md | Sem bloqueante nem atenção; nenhuma correção; mudança de comportamento da api conferida por chamador (só `ORGANIZATION_INVITATION_EXPIRED`, código existente); `tsc` pontual do teste do `shared` limpo; typecheck e `pnpm check` verdes; 5 commits propostos depois das outras tarefas da branch |
| test    | done    | 2026-11-27 14:02 | test/report.md | 9/9 critérios ✅; os 4 itens do review confirmados por mutação (canário, suíte por arquivo com e sem setup, convite contra o `HEAD`); lacuna do `isOpen` fechada com `organizationInvitationIssue.test.ts` (9 testes); `pnpm test` raiz com emulador e `turbo run lint typecheck` verdes para o working tree inteiro; sem browser (diff sem UI) |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec, a partir de dois itens de "Tarefas diretas candidatas" em `specs/reference/AUDIT.md`
  (`:344` e `:350`). Plano feito em rodada autônoma do `/cycle`: as 8 decisões estão na §12 do plano, cada uma com a
  alternativa descartada, e as 4 perguntas da §11 já vêm com a opção adotada.
- A auditoria listou três helpers; a leitura achou um quarto, `normalizeFirestoreInstant` em `@repo/shared`, que fica
  intocado e vira achado (plano, §13).
- Nenhum arquivo do plano está modificado no working tree, que carrega a `audit-log-levels` não commitada. O
  `useListAuditEvents.test.tsx`, modificado por ela, passa a ser limpo pela configuração sem ser editado.
- Pré-requisitos manuais de infra: nenhum.
