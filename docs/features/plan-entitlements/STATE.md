---
slug: plan-entitlements
title: Acesso por plano espelhado na API
task: -
spec: plan-entitlements
branch: feat/plan-entitlements
epic: -
updated: 2026-10-01 05:10
---

# Pipeline — Acesso por plano espelhado na API

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-30 21:55 | analyze/plan.md | `requirePlanApi`/`refusePlanAccess` sobre o guard comum (403 `PLAN_SUBSCRIPTION_REQUIRED` e `PLAN_FEATURE_REQUIRED`); webhook trata `entitlements.active_entitlement_summary.updated` e grava `user.entitlements` com regra de ordem; `GET /account` devolve `planAccess`; `PlanGate` no app; demo na criação de `entity` atrás de `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE`, vazia por padrão; zero dependência nova |
| develop | done    | 2026-09-30 22:20 | develop/handoff.md | Slice SDK → API → app → i18n implementado como no plano; `requirePlanApi` na criação de `entity`, webhook grava `user.entitlements`, `planAccess` na conta, `PlanGate` no app; 8 desvios menores (sem `asChild` no `Button`, teste de varredura dos guards estendido para guard composto); gates verdes, `test:emulator` não rodado |
| review  | in-progress | 2026-09-30 23:10 | review/review.md | Rodada 2: D1 do `/test` corrigido no `PlanGate` (sem dados e sem erro mostra o fallback) e conta relida a cada montagem do gate (item 7); mutação confirmada nos dois; `pnpm check`, typecheck do app e os 15 testes tocados verdes; commit 7 e 12 do plano ajustados |
| test    | done    | 2026-10-01 05:10 | test/report.md | Rodada 2: D1 corrigido (três cargas frias sem o formulário, HTML do servidor sem ele), recurso novo aparece na próxima montagem em cerca de 120 ms, conta fora do ar libera o formulário e a API recusa com toast nos 3 idiomas; app 96/778, `pnpm test` 14/14, emulador 4/170; 15 ✅, 0 ❌, 1 🔒; skeleton em light/dark/375 px não medido (agentes de QA travaram na passada de browser) |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Plano feito em rodada autônoma do `/cycle --no-audit`, em paralelo com outra feature. As 14 perguntas em
  aberto já vêm com a opção adotada e a descartada, no fim do `analyze/plan.md`.
- A regra de acesso é a conjunção de status e recursos: quando os dois eventos da Stripe discordam, a
  negação vence (seção 2 do plano).
- Pré-requisitos manuais de infra (recursos no Dashboard da Stripe, sexto evento no endpoint, variável
  opcional da demo, conferir custo do Entitlements) estão na seção 12 do plano e vão para
  `docs/PRE-PRODUCTION.md` §12. O `/test` não reprova por eles.
- Quatro critérios só fecham com conta Stripe real e ficam 🔒 (seção 11 do plano).
- A spec foi marcada `in-progress` com `feature: plan-entitlements`. O `specs/BACKLOG.md` não foi tocado:
  outro workspace é dono da auditoria nesta rodada.
- O `/test` rodou com o `review` ainda `in-progress` e sem commit da feature: o plano de commits do `/review`
  continua pendente de execução.
