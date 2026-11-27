---
slug: design-system-refresh
title: Skills de design e refactor de interface do app, da landing e do design system
task: -
spec: none (pedido direto)
branch: feat/design-system-refresh
epic: -
updated: 2026-11-27 19:05
---

# Pipeline: refactor de interface

| etapa   | status      | quando           | artefato           | resumo (1 linha) |
|---------|-------------|------------------|--------------------|------------------|
| analyze | skipped     | -                | -                  | Pedido direto, sem plano: a direção ficou registrada em `docs/DESIGN.md` |
| develop | done        | 2026-11-27 18:11 | develop/handoff.md | Seis fontes de skills de design em `.claude/skills/`; antd e react-toastify removidos; tokens, primitivos, shell do painel, telas do app e landing refeitos; `docs/DESIGN.md` novo e docs de fork atualizadas; `turbo run lint typecheck test` 29/29 |
| review  | in-progress | 2026-11-27 19:05 | review/review.md   | Sem bloqueante; 6 pontos de atenção (nomes inventados no hero, onboarding vs `apps/app/CLAUDE.md`, cor dos e-mails, backlog do antd, índice com 4 remoções, typecheck no commit 26); 2 correções; branch renomeada para `feat/design-system-refresh`; 38 commits propostos |
| test    | pending     | -                | -                  | - |
| observe | pending     | -                | -                  | - (opcional) |

## Notas

- Bypass do gate: o trabalho foi feito na conversa, fora do `/analyze` e do `/develop`. A pasta e o handoff foram
  criados depois, no início do `/review`, com o aceite do usuário.
- Diff grande e transversal: `packages/design-system` atinge os dois apps. A revisão olha raio de impacto antes de
  estilo.
- Nada foi visto renderizado no `apps/app` (sem credencial do Firebase no worktree). O `/test` é obrigatório.
