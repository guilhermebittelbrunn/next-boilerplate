---
slug: admin-billing-insights
title: Seção de billing na home do admin
task: -
spec: admin-billing-insights
branch: feat/admin-billing-insights
epic: -
updated: 2026-09-25 11:16
---

# Pipeline — Seção de billing na home do admin

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-25 00:24 | analyze/plan.md | `GET /payments/summary` sob `requireAdminApi` lê três coleções novas alimentadas pelo webhook (`paidInvoice` e `subscriptionActivation` por `invoice.paid`, cache de nomes `planLabel`) mais o snapshot de `user.subscription`; receita recebida por moeda no mês UTC, 5 contratações, planos vigentes no gráfico; seção some em `simple` e com a cobrança desligada; nenhum índice composto; webhook para de ecoar o evento |
| develop | done    | 2026-09-25 10:04 | develop/handoff.md | Slice completo do SDK à documentação, com o código de uma execução anterior revisado e corrigido; `ensurePlanLabel` foi para módulo próprio porque quebrava quatro suítes, e o rótulo do eixo ficou em 6 caracteres, não nos 10 do plano; gate do CI 24/24 com 1936 testes |
| review  | done    | 2026-09-25 11:05 | review/review.md | Rodada 2 sobre o `/test`: D1 corrigido (eixo de planos cortado em 5 caracteres pela distância de 38 px entre ticks a 320 px; barra agrupada vira "Resto"/"Other"/"Otros"; testes do app e de i18n falham com o limite antigo). D2 (SSR em pt-br em `/en` e `/es`) não corrigido: anterior à entrega, a raiz pede migrar 63 arquivos para um provider de locale; foi para `specs/BACKLOG.md:480`. Gates: `lint typecheck` 14/14, i18n 47/5. Branch `feat/admin-billing-insights` criada; os 14 commits foram aprovados pelo usuário junto com o push |
| test    | done    | 2026-09-25 11:16 | test/report.md  | Rodada 2: 18 ✅, 1 ❌ pré-existente fora do escopo, 4 🔒. D1 fechado: corte em 5, folga mínima de 5,1 px entre rótulos a 320 px e 16,1 px a 375 px nos 3 idiomas, light e dark. pt-br sem aviso de hidratação; o D2 (SSR em pt-br em en e es) fica com dono em `specs/BACKLOG.md:480`. Suítes app 598/76, i18n 47/5, raiz 10/10; nenhum teste criado |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Plano feito em rodada autônoma do `/cycle`. As seis perguntas em aberto já vêm com a opção adotada, e as
  25 decisões tomadas sem perguntar estão no fim do `analyze/plan.md`, cada uma com a alternativa descartada.
- As três lacunas que a auditoria registrou na spec têm resposta na seção 1 do plano: ativação pela primeira
  fatura paga (`subscription_create`), nome do plano num cache local resolvido pelo webhook sem bloquear, e
  livro de faturas pagas com id igual ao da fatura.
- Idempotência em duas camadas: o dedupe por `event.id` que já existe e a chave natural por fatura e por
  assinatura, que cobre a reentrega depois de uma marcação que falhou. A receita é somada na leitura, então
  não há contador a duplicar.
- Pré-requisitos manuais de infra na seção 9.1 do plano: acrescentar `invoice.paid` ao endpoint do webhook de
  cada fork (passam a ser cinco eventos) e não aplicar TTL às coleções novas. Nenhum índice composto e
  nenhuma variável nova. O `/test` não reprova por eles.
- Defeito corrigido no caminho: o webhook deixa de ecoar o evento Stripe inteiro na resposta de sucesso
  (achado aberto no `specs/BACKLOG.md`), o que muda uma asserção de `paymentsWebhookRoute.test.ts`.
- Fica 🔒 sem conta Stripe real: entrega real de `invoice.paid`, resolução real do nome do produto, forma
  real do payload e a ausência de índice composto num projeto Firebase real. O resto se prova com testes de
  rota e unitários e com o harness de webhook assinado contra o emulador (seção 8 do plano).
- `/develop`: dois desvios corrigem o plano (rótulo do eixo em 6 caracteres; `ensurePlanLabel` em
  `(shared)/lib/plan-label.ts`), com a justificativa no `develop/handoff.md`. Os trechos desta feature em
  `docs/PRE-PRODUCTION.md`, que a auditoria do backlog também alterou, estão listados no handoff para o
  `/review` separar os commits.
- `/review`: rodada autônoma, nenhum commit feito. A branch atual (`admin-billing-insights`) falha no regex do
  padrão; `feat/admin-billing-insights` passa e será criada com `git switch -c` no primeiro commit aprovado.
  O índice já tem o rename `specs/billing-subscription.md -> docs/features/billing-subscription/spec.md`, que
  entra no commit da auditoria. `docs/PRE-PRODUCTION.md` se divide com `git add -p` (hunks 6 e 8 são da
  auditoria); `docs/SECURITY.md` vai inteiro no commit de documentação da feature.
- `/test`: rodada autônoma, emulador e harness de webhook assinado em `/tmp`, todos derrubados e apagados no fim. Nenhum
  arquivo de código ou teste alterado. Os dois ❌ (critérios 18 e 19) e os repros estão na seção "Defeitos" do
  `test/report.md`; o D2 tem causa anterior à entrega e afeta a home inteira em en e es, então corrigi-lo na raiz
  ou aceitá-lo é decisão do `/review`. Contas de QA só no emulador; nada entra no `docs/PRE-PRODUCTION.md`.
- `/review` rodada 2: o D1 do `/test` fechou pela conta com a medida do tick e fica para o QA remedir a
  320 px nos 3 idiomas. O D2 ficou fora por decisão registrada no `review/review.md` (seção "Rodada 2"), com
  as alternativas descartadas; o critério 18 segue ❌ por causa anterior à feature.
- `/test` rodada 2: remediu só o eixo e a hidratação em pt-br, com emulador e harness novos, derrubados e
  apagados no fim. O critério 18 fica ❌ por defeito anterior à entrega e não bloqueia o `test = done`.
