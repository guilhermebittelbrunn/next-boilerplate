---
slug: small-api-web-fixes
title: Lote de correções pequenas (web, auth, e2e, scripts de start)
task: -
spec: -
branch: feat/audit-log-levels
epic: -
updated: 2026-11-27 13:37
---

# Pipeline — Lote de correções pequenas (web, auth, e2e, scripts de start)

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-27 10:07 | analyze/plan.md | 4 de 6 candidatas ficam: link "esqueci a senha" na landing apontando para a app (some sem `NEXT_PUBLIC_APP_URL`, copy nos 3 idiomas), guard de redirect sem a segunda decodificação e com o teste movido para `packages/auth`, `escapeRegExp` compartilhado em 5 usos do E2E, `start` da web e da api com `-p ${PORT:-porta}`; cortados o `405` sem `error.code` (vale para 57 rotas, decisão de arquitetura) e `getMergedUserFromIdToken` (adiado, arquivos em uso pela `audit-log-levels`); sem SDK, env nova, dependência ou infra; 7 commits sugeridos |
| develop | done    | 2026-11-27 12:59 | develop/handoff.md | Itens 2, 3, 5 e 6 implementados: link "esqueci a senha" na landing (some sem `NEXT_PUBLIC_APP_URL`), guard de redirect sem a segunda decodificação com o teste movido para `packages/auth` (e `onboardingState.test.ts:119` ajustado, fora do plano), `escapeRegExp` compartilhado no E2E, `start` da web/api com `-p ${PORT:-porta}` (porta medida pelo `Local:` do Next; resposta HTTP fica para o `/test`); gates verdes, mutantes falham |
| review  | done    | 2026-11-27 13:10 | review/review.md | Sem bloqueante; guard sem a segunda decodificação não deixa o destino sair da origem (chamadores lidos, `%2F`/`%5C`/`%09` medidos); teste novo de mesma origem no `packages/auth`, entradas codificadas de `onboardingState.test.ts` que passavam por outro motivo trocadas; gates verdes; 8 commits propostos, `start` da api por patch de uma linha |
| test    | done    | 2026-11-27 13:37 | test/report.md  | 12/12 critérios ✅: link da landing nos 3 idiomas (some com env vazia, contraste 17,9:1 e 19:1, mobile 390 px sem estouro), `%26` chega como `q=a%26b`, `/pt-br/%2F%2Fevil.com` fica na origem, `start` em 3001/3002 e `PORT=3105` medidos com build + `curl`, `pnpm e2e` 45/45, `pnpm test` raiz verde na 4ª execução (carga 50-69); teste da landing reescrito para importar uma vez (estourava 20 s sob carga) |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec, tirada de "Tarefas diretas candidatas" em `specs/reference/AUDIT.md:330-390`. Plano
  feito em rodada autônoma do `/cycle`: as 12 decisões estão na §6 do plano, cada uma com a alternativa
  descartada, e as 3 perguntas da §7 já trazem a recomendação.
- O working tree contém a feature `audit-log-levels`, ainda não commitada. Deste lote, só
  `apps/api/package.json` (item 6) coincide com um arquivo dela; o hunk do `start` (linha 9) tende a se juntar
  ao do `backfill-audit-levels` (linha 15). Commitar a `audit-log-levels` antes, ou preparar a linha com
  `git apply --cached`, e conferir `git diff --cached` antes de cada commit.
- O item 4 (`getMergedUserFromIdToken`) foi adiado pelo mesmo motivo: `user-merge.ts` e
  `userMergeArchivedProfile.test.ts` estão modificados pela outra feature, com hunks encostados.
- Pré-requisitos manuais de infra: nenhum.
