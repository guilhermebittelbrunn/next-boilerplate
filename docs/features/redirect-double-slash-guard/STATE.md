---
slug: redirect-double-slash-guard
title: Guard de redirect recusa barra dupla no caminho resolvido
task: -
spec: -
branch: feat/audit-log-levels
epic: -
updated: 2026-11-27 14:56
---

# Pipeline — Guard de redirect recusa barra dupla no caminho resolvido

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-27 14:04 | analyze/plan.md | `postAuthRedirectTarget` passa a recusar `pathname` resolvido com `//` (tab, CR/LF e `\` literais hoje passam); uma condição em `packages/auth/redirect.ts:42` + 6 casos de recusa e 4 de limite no teste do pacote; 6 chamadores herdam o fallback sem edição; `//` em query segue recusado pela checagem bruta (fora de escopo); 1 commit `fix(auth)` |
| develop | done    | 2026-11-27 14:09 | develop/handoff.md | `&& !resolvedPath.includes("//")` em `packages/auth/redirect.ts:43-45` + comentário 39-41; 3 `it` novos no teste (6 recusas, 2 aceitos, query/hash); mutante derruba as 6 recusas; auth 219/219, app 93 testes do guard, typecheck e `pnpm check` limpos |
| review  | done    | 2026-11-27 14:11 | review/review.md | Sem bloqueante; checagem sobre o `pathname` resolvido, destinos legítimos e os 6 chamadores conferidos; nenhuma correção; `pnpm check` e typecheck auth/app limpos; índice tem 2 renames de outra tarefa; recomendado 1 commit `fix(auth)` junto com o da `small-api-web-fixes` |
| test    | done    | 2026-11-27 14:56 | test/report.md | auth 219/219 (18 no guard); mutante derruba só o `it` de recusa e as 6 entradas passam; 10 destinos legítimos intactos; 6/6 critérios PASS; `pnpm turbo run lint typecheck` 15/15 e `pnpm test --concurrency=1` 15/15 (3 rodadas paralelas caíram em timeout por load 30-88, workspaces verdes isolados); sem browser (função pura) |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec, tirada do achado 🟢 de `docs/features/small-api-web-fixes/review/review.md:33-37`.
  Plano feito em rodada autônoma do `/cycle`; decisões na §11 do plano.
- Parte do working tree da `small-api-web-fixes`, que já mexe em `packages/auth/redirect.ts` e no teste do
  guard e ainda não foi commitada. Commitar aquela primeiro ou separar os hunks com `git add -p`.
- Pré-requisitos manuais de infra: nenhum.
