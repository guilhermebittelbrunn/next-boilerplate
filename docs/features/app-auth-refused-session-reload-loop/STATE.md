---
slug: app-auth-refused-session-reload-loop
title: Laço de recarga com a sessão recusada no login e no cadastro da app
task: -
spec: -
branch: feat/delivery-security-hardening
epic: -
updated: 2026-11-24 03:41
---

# Pipeline: laço de recarga com a sessão recusada

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-24 02:21 | analyze/plan.md | Provider desloga na recusa; hook único na app só navega com cookie gravado; ref da landing zera quando `user` some |
| develop | done    | 2026-11-24 02:55 | develop/handoff.md | Provider e hook `useSignedInRedirect` deslogam na recusa; ref da landing zera num efeito próprio; T1–T4 com mock, suítes app/web/auth verdes |
| review  | done    | 2026-11-24 03:40 | review/review.md | Rodada 2: pós-login da app por carga completa (`postLoginNavigation="full-page"`), hook parado durante login em andamento; plano combinado de 31 commits |
| test    | done    | 2026-11-24 03:41 | test/report.md | Rodada 2: 13/13. Laço fechado (1 carga em toda recusa); R1 e link por e-mail chegam ao painel por carga completa com o sino em <120 ms; Google da app por carga completa; 2 `POST` por login; E2E 16/16 |
| observe | pending | -                | -               | - (opcional)     |

## Notas
- Tarefa direta do `/cycle`, sem spec. Achados de origem: o 🟡 do laço e o 🟢 do `signInStartedHereRef` em `specs/BACKLOG.md`.
- Nenhum arquivo previsto tem mudança não commitada de outra feature desta rodada (conferido em 2026-11-24 02:18).
- `/test` rodada 1 terminou `blocked` por um critério parcial (R1); o `/review` aplicou a navegação de página inteira pós-login e a rodada 2 aprovou os 13 critérios.
