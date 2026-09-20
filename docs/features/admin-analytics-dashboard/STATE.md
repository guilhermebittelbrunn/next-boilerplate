---
slug: admin-analytics-dashboard
title: Métricas de atividade na home do admin
task: -
spec: admin-analytics-dashboard
branch: feat/admin-analytics-dashboard
epic: -
updated: 2026-09-19 20:43
---

# Pipeline — Métricas de atividade na home do admin

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-19 14:36 | analyze/plan.md | Rota `GET /users/activity-summary` sob `requireAdminApi`, 5 agregações, dois `MetricCard` e histograma de recência de 5 faixas na home do admin |
| develop | done    | 2026-09-19 15:57 | develop/handoff.md | Slice completo no disco e conferido contra o blueprint; gates verdes, com a suíte da `app` instável sob carga por causa alheia ao diff |
| review  | done    | 2026-09-19 20:28 | review/review.md | Rodada 1 do `/test`: rótulo sumido do eixo corrigido com `interval={0}` no `CategoryBarChart` e copy das faixas encurtada nos 3 idiomas; antes disso, dois 🟡 de ponteiro de documentação e a branch criada |
| test    | done    | 2026-09-19 20:43 | test/report.md  | 20 ✅, 0 ❌, 2 🔒 em 22 critérios; o ❌ do eixo fechou na rodada 2 (5 de 5 rótulos a 375 px e a 320 px nos 3 idiomas) e a home comum não regrediu; gates verdes (418 na `app`, 597 na `api`, 33 na i18n) |
| observe | pending | -                | -               | - (opcional) |

## Notas

- **Pré-requisito de infra, fora do alcance do código:** um índice composto novo em `user`
  (`deletedAt` + `lastAccessAt`). Vira a secção §1.7 de `docs/PRE-PRODUCTION.md`. A fila de índices
  versionados e não publicados tem 6 entradas hoje, recontadas contra `firestore.indexes.json`; este é o
  sétimo.
- **Para o `/test`:** a degradação por índice ausente não é observável localmente. O emulador serve a
  consulta indexada ou não, então o cenário fica marcado como bloqueado por infra em vez de reprovado. A
  cobertura é o teste de rota (503 `SUMMARY_INDEX_MISSING`) mais o teste de componente.
- O corte exclui o item c da spec (visitas à `apps/web`), billing, tempo real, export, segmentação e
  filtro de intervalo.
- **Suíte de testes da `apps/app`:** roda verde inteira (57 arquivos, 409 testes) numa máquina ociosa, mas
  sob contenção estoura o `testTimeout` em arquivos que este diff não toca, variando de execução para
  execução. Detalhe e as cinco medições estão no `develop/handoff.md`. O `/test` rodou a suíte cinco vezes
  ao longo das duas rodadas sem bater na instabilidade, agora com 58 arquivos e 418 testes.
- **O eixo do gráfico, resolvido em duas rodadas:** a rodada 1 do `/test` reprovou o critério porque a
  375 px, em inglês, o eixo mostrava quatro rótulos para cinco barras. O `/review` atacou as duas causas,
  `interval={0}` no `CategoryBarChart` e rótulos de faixa em notação numérica, e a rodada 2 remediu: cinco
  de cinco rótulos a 375 px e a 320 px nos três idiomas, sem sobreposição nem corte. A home comum, que
  compartilha o componente, também foi medida nas duas larguras e não regrediu.
- **O que nenhuma das duas rodadas mediu:** o `interval={0}` sozinho, sem o encurtamento da copy. O
  `/review` argumenta que essa variante trocaria rótulo omitido por rótulo sobreposto, e a decisão de
  encurtar os rótulos se apoia nisso. O que está medido é o conjunto das três mudanças.
