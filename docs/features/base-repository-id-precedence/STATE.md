---
slug: base-repository-id-precedence
title: Id do documento vence no BaseRepository
task: -
spec: -
branch: feat/admin-account-forms-and-session-revocation
epic: -
updated: 2026-11-26 12:03
---

# Pipeline: Id do documento vence no BaseRepository

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-26 04:06 | analyze/plan.md | Inverter a ordem do spread em `toEntity`, `toDTO` sem mapper e `create` da base; seis testes unitários, cinco reprovam o código atual |
| develop | done    | 2026-11-26 04:09 | develop/handoff.md | Spread invertido nos três pontos da base; seis testes, cinco reprovavam o HEAD; api 1879/1879, emulador 279/279 |
| review  | done    | 2026-11-26 12:03 | review/review.md | Sem bloqueante; teste de `paginate` acrescentado (71/71); commit 17 do plano passa a levar só os hunks 2 e 3 do teste; plano com 48 commits |
| test    | done    | 2026-11-26 04:17 | test/report.md  | api 1880/1880, emulador 280/280 (+1 teste novo de emulador), 6 de 7 testes reprovam o HEAD como esperado; `pnpm test` raiz verde; sem browser (diff só api) |
| observe | pending | -                | -               | - (opcional)     |

## Notas
- Depende dos hunks não commitados de `stripe-customer-lookup-mapper` em `user.repository.ts` e `baseRepository.test.ts`; commitar depois daquela tarefa.
