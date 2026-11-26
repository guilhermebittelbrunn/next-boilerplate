---
slug: auth-revocation-failure
title: Falha da revogação de sessões nos chamadores restantes
task: -
spec: -
branch: feat/admin-account-forms-and-session-revocation
epic: -
updated: 2026-11-26 12:03
---

# Pipeline: falha da revogação de sessões nos chamadores restantes

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-26 01:59 | analyze/plan.md | Desvincular a senha passa a responder `AUTH_SESSIONS_NOT_REVOKED`; admin desativando responde `USERS_SESSIONS_NOT_REVOKED` (novo) e o toggle não faz rollback; arquivar responde `USERS_DELETE_AUTH_FAILED`; o expurgo fica como está |
| develop | done    | 2026-11-26 02:11 | develop/handoff.md | A responde `AUTH_SESSIONS_NOT_REVOKED`, B responde `USERS_SESSIONS_NOT_REVOKED` sem rollback no toggle, C propaga a recusa (`503 USERS_DELETE_AUTH_FAILED`), D igual; 9 dos 11 testes novos reprovam o código antigo; ajuste pós-review devolve o código do Firebase ao log `session-revoke-failed` |
| review  | done    | 2026-11-26 12:03 | review/review.md | Sem bloqueante; A, B e C reportam a recusa e D segue best-effort com `deleteUser` em seguida; 3 âncoras velhas de docs corrigidas; código do Firebase de volta ao log da revogação (ajuste pós-review, helper da API reaproveitado); plano combinado com 30 commits |
| test    | done    | 2026-11-26 02:40 | test/report.md  | 9 de 10 critérios PASS, 1 🔒 (devolução do e-mail revoga tokens); 2 testes de componente novos reprovam sem o comportamento; API 1859/1859, app 1378/1378, emulador 274/274; `pnpm test` da raiz saiu 1 só por timeout de worker do vitest com a máquina carregada |
| observe | pending | -                | -               | - (opcional)     |

## Notas
- Origem: `specs/reference/AUDIT.md`, "Achados da PR #64" (quatro chamadores que engolem a falha da revogação). Rodada autônoma do `/cycle`: as decisões estão no plano, em "Decisões tomadas sem perguntar".
- Sem browser no `/test`: a recusa de `revokeRefreshTokens` não é reproduzível sem alterar código. A prova é a suíte Vitest.
