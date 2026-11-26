---
slug: setup-docs-cleanup
title: Stripe só na api e gitleaks local no modo git
task: -
spec: -
branch: feat/admin-account-forms-and-session-revocation
epic: -
updated: 2026-11-26 12:03
---

# Pipeline: Stripe só na api e gitleaks local no modo git

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-26 03:50 | analyze/plan.md | Tira `STRIPE_*` dos `.env.example` de app e web (medido: só a api lê), ajusta `FORKING.md:373-374` e troca o `gitleaks stdin` do `SETUP.md:207` por `gitleaks git --pre-commit` |
| develop | done    | 2026-11-26 03:55 | develop/handoff.md | `STRIPE_*` fora dos `.env.example` de app e web, `FORKING.md:373` ajustado, `SETUP.md` com `gitleaks git --pre-commit [--staged]` (flags conferidos na 8.30.1, prova em repo descartável) |
| review  | done    | 2026-11-26 12:03 | review/review.md | Sem bloqueante e sem correção; leitores de `STRIPE_*` e docs medidos; `SETUP.md` commitado antes do commit da `repo-hygiene-ci`, com `git apply --cached --unidiff-zero` (commits 26, 27, 34 e 46 de 46) |
| test    | done    | 2026-11-26 04:04 | test/report.md | 13/13 critérios PASS; gitleaks 8.30.1 próprio (sha256 ok) reproduz a tabela e dá `no leaks found` no repo real; branch: `pnpm test` 15/15, `check` 1155, `lint typecheck` 15/15 |
| observe | pending | -                | -               | - (opcional)     |

## Notas
- Rodada autônoma do `/cycle`. O `docs/SETUP.md` já tem um hunk não commitado da `repo-hygiene-ci` (linhas 210-215); esta tarefa edita só o bloco de comandos (203-208), e o commit separa os dois com `git apply --cached --unidiff-zero` nos hunks 1 e 2 (`git add -p` não separa o hunk com `-U3`). Ordem em `review/review.md`.
- Sem runtime: o `/test` não sobe app nem browser.
