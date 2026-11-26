---
slug: notification-markread-missing
title: markRead contra notificação apagada
task: -
spec: -
branch: feat/admin-account-forms-and-session-revocation
epic: -
updated: 2026-11-26 12:03
---

# Pipeline — markRead contra notificação apagada

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-26 05:04 | analyze/plan.md | `markRead` absorve o NOT_FOUND do `update` e a rota responde 404 `NOTIFICATION_NOT_FOUND` em vez de 500; só `apps/api` |
| develop | done    | 2026-11-26 05:08 | develop/handoff.md | `isNotFoundError` em `infra/firestore-errors.ts`, `markRead` devolve `null` no NOT_FOUND e a rota responde 404; testes de rota, repositório, helper e 1 de emulador |
| review  | done    | 2026-11-26 12:03 | review/review.md | Sem bloqueante; catch só absorve NOT_FOUND, 404 igual ao de outro dono, `markRead` com um chamador; `try/finally` no teste `code: 7`; plano combinado vai a 54 commits (20 e 54) |
| test    | done    | 2026-11-26 05:14 | test/report.md  | 7/7 critérios PASS; api 1890 + emulador 281; rota e repositório do HEAD reprovam (2 unit + 1 emulador); gate CI 30/30 tasks, 4805 testes; portas livres |
| observe | pending | -                | -               | - (opcional)     |

## Notas
- Origem: `specs/reference/AUDIT.md:352` e `:1319`. Sem spec nem card.
- O `/test` não abriu browser: o diff não tem superfície de UI.
- `review` segue `in-progress` porque os commits do plano ainda não existem (`git log main..HEAD` vazio); o `/review` fecha a etapa ao commitar.
