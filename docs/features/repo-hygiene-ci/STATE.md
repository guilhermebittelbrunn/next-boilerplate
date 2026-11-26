---
slug: repo-hygiene-ci
title: Higiene de repositório e CI
task: -
spec: -
branch: feat/admin-account-forms-and-session-revocation
epic: -
updated: 2026-11-26 12:03
---

# Pipeline — Higiene de repositório e CI

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-26 02:47 | analyze/plan.md | `gitleaks:allow` inline no fixture, `agentRules: false` no `@repo/next-config` e `ignore` de versão maior do `stripe` no Dependabot |
| develop | done    | 2026-11-26 02:51 | develop/handoff.md | Os três itens implementados sem desvio; `next dev` da `api` removeu um `AGENTS.md` semeado; o Gitleaks fica para o CI |
| review  | done    | 2026-11-26 12:03 | review/review.md | Código sem achado; o literal do `LEAKY_TOKEN` saiu do plano e do handoff, que o job `secrets` varreria no commit `docs(features)`; `ignore` × atualização de segurança fica 🔒 |
| test    | done    | 2026-11-26 03:03 | test/report.md  | 7 PASS, 2 🔒 (Dependabot só após merge); Gitleaks 8.30.1 medido: HEAD 1 achado, working tree e `docs/features/` 0; smoke removeu o `AGENTS.md`; `pnpm test` raiz 15/15 |
| observe | pending | -                | -               | - (opcional)     |

## Notas
- Tarefa direta, sem spec, com três itens da lista de tarefas diretas de `specs/reference/AUDIT.md`. Sem superfície de runtime: o `/test` não abre browser e sobe só um `next dev` curto da `apps/api` para medir o item 2.
