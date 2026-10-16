---
slug: api-auth-webhook-error-codes
title: Contrato de erro de /auth/me, /auth/sign-in e do webhook de pagamentos
task: -
spec: none (tarefa direta)
branch: guilhermebittelbrunn/cycle-2-features-implement
epic: -
updated: 2026-10-15 15:30
---

# Pipeline: contrato de erro de /auth/me, /auth/sign-in e do webhook de pagamentos

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-14 21:57 | analyze/plan.md | `/auth/me` responde 401 `AUTH_INVALID_TOKEN`; `/auth/sign-in` valida com Zod e responde `VALIDATION_FAILED`, `AUTH_INVALID_CREDENTIALS` (novo), `USERS_AUTH_RATE_LIMITED` e `USERS_NOT_FOUND`; webhook com assinatura recusada responde 400 `VALIDATION_FAILED` e o 500 do handler ganha `PAYMENTS_WEBHOOK_HANDLER_FAILED` (novo) |
| develop | done    | 2026-10-15 00:15 | develop/handoff.md | três rotas respondem `error.code`; `AUTH_INVALID_CREDENTIALS` e `PAYMENTS_WEBHOOK_HANDLER_FAILED` nos 3 idiomas; api 1222/1222, i18n 67/67, typecheck e `pnpm check` limpos; 19 dos 70 testes da área falham no código anterior |
| review  | in-progress | 2026-10-15 00:22 | review/review.md | sem bloqueante; dois docs corrigidos (`PRE-PRODUCTION.md:568` dizia 500 para o webhook sem assinatura, `SECURITY.md:19` citava `grep -L` sem `-E`); typecheck, `pnpm check` (889) e paridade (67/67) limpos; branch atual inválida, recomendado `fix/web-docs-link-and-api-error-codes`, não renomeada; plano de 12 commits combinado com a tarefa da web e a auditoria |
| test    | done    | 2026-10-15 15:30 | test/criterios-aceite.md, test/report.md | 11 critérios aprovados, 0 reprovados, 1 não verificado (429 do Arcjet, exige `ARCJET_KEY`); api 1222/1222, i18n 67/67, `pnpm test` da raiz 3.139/3.139; `curl -i` contra a API em `next build` + `next start` confirmou status, `error.code` e `x-request-id`; login e logout da app ok; nenhum defeito. `test/report.md` gravado pelo orquestrador com o conteúdo do `analista-qa`, porque a harness bloqueou a escrita do subagent |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec: recomendação #2 da auditoria pós-PR #45 (`specs/BACKLOG.md:286-328`). Segunda de duas
  tarefas na mesma branch; a primeira, `web-docs-link-and-mobile-menu`, só mexe em `apps/web`.
- Plano feito em rodada autônoma do `/cycle`. As oito perguntas em aberto já vêm decididas no fim do
  `analyze/plan.md`, cada uma com a alternativa descartada.
- **A auditoria errou sobre a Stripe.** Ela afirma que um 400 encerra as reentregas do webhook. A documentação da
  Stripe diz que qualquer resposta fora de `2xx` é reentregue por até três dias. O 400 segue correto por outros
  motivos (§1.1 do plano), mas nem o código nem a documentação podem prometer o fim das reentregas. Correção do
  backlog fica para o `/spec --sync`.
- Sem mudança em `packages/sdk`, `apps/app` ou `apps/web`; sem env nova; sem pré-requisito de infraestrutura.
- Branch: `guilhermebittelbrunn/cycle-2-features-implement` reprova na regex do `/review`. O nome recomendado,
  `fix/web-docs-link-and-api-error-codes`, passa. Sem remoto e sem commit, então `git branch -m` resolve; decisão do
  usuário antes do primeiro commit.
