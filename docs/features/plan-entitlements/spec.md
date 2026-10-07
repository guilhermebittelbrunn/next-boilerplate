---
id: plan-entitlements
title: Acesso por plano espelhado na API
status: done
value: médio
effort: M
audience: produto
area: [apps/api, apps/app, packages/sdk, packages/internationalization]
mode: subscription
depends_on: []
contends_on: ["apps/api/app/(routes)/webhooks/payments/route.ts", apps/api/(shared)/lib/billing-state.ts, packages/sdk/src/types/payments/payments.ts]
feature: plan-entitlements
updated: 2026-10-04
---

# Acesso por plano espelhado na API

## Problema

O fork que cobra assinatura já vende o plano, recebe o pagamento e mostra o status na conta. O que ele não tem
é o passo seguinte: liberar uma funcionalidade só para quem paga, ou só para quem está num plano específico.
Hoje cada fork que precisar disso vai escrever a própria checagem, e o erro mais provável é o de sempre:
esconder o botão na tela e deixar a rota aberta.

O repositório já guarda tudo que a checagem precisa no perfil do usuário. Falta a peça reutilizável que diz
"esta rota exige assinatura viva" ou "esta rota exige o recurso X", no servidor, com um código de erro que a UI
traduz em convite para assinar.

## O que já existe no repo

- `packages/sdk/src/types/user/user.ts:63,65` — o perfil guarda `stripeCustomerId` e `subscription`
  (`SubscriptionState`: status, preço, produto, intervalo, fim do período e outros, em
  `packages/sdk/src/types/payments/payments.ts:30-44`).
- `apps/api/(shared)/lib/billing-state.ts:16-22` — `isLiveSubscription`, sobre `LIVE_SUBSCRIPTION_STATUSES`
  do SDK. Hoje bloqueia checkout duplicado (`payments/checkout/route.ts:41`), decide o cancelamento no
  arquivamento (`users/[id]/route.ts:72`) e no expurgo (`account-erasure.ts:77`) e, dentro de
  `decideSubscriptionWrite` (`billing-state.ts:210`), ignora um `deleted` atrasado de assinatura já
  substituída.
- `apps/api/app/(guards)/common-panel.ts` — o guard do painel comum já entrega o `subjectProfile`, então uma
  checagem de plano pode ser composta sobre ele sem outra leitura do Firestore.
- `apps/api/app/(routes)/webhooks/payments/route.ts:154-184` (o `switch`) trata `checkout.session.completed`,
  os três eventos de `customer.subscription.*` e `invoice.paid`, com dedupe por `event.id` (`:228`).
- `apps/api/(shared)/lib/billing-state.ts:62-87` — os `features` do `PlanDTO` vêm de
  `product.marketing_features`, que é texto de vitrine, não permissão.
- `packages/next-config/product-mode.ts:14-16` — `isSubscriptionMode()` é a chave do modo do produto; quem
  liga a cobrança no fork inteiro é `isBillingEnabled()` (`apps/api/(shared)/lib/billing.ts:22-28`), que junta
  o modo às chaves da Stripe e ao `NEXT_PUBLIC_APP_URL`. Nenhuma das duas é checagem por usuário.
- **Lacuna:** `grep` por `requireActiveSubscription`, `entitlement`, `planLimit` e `PLAN_FEATURES` em `apps/`
  e `packages/`: 0. Nenhuma rota, hook ou componente condiciona acesso ao plano.

### Por que reabrir uma lacuna descartada

A linha "Gate de acesso por plano · bloqueio em `past_due` · trial, cupom..." ficou nas lacunas do
`BACKLOG.md` do arquivamento de `billing-subscription` até a descoberta de 2026-09-26, com a nota de que o
gate por plano era o candidato mais forte a spec própria. Esta spec pega só o gate; o resto da linha continua
descartado pelo mesmo motivo e segue nas lacunas como linha própria. *(Correção da auditoria de 2026-09-27: a
versão anterior dizia que a linha "está" nas lacunas e citava a nota entre aspas; a linha já saiu, e a frase
não existe mais no repositório.)*

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](../../../specs/research/saas-starter-feature-benchmark.md), tabela
  original e adendo de 2026-09-26.
- Prevalência: **2/10** para feature flags e 2/10 para metering na tabela original; o adendo confirma que o
  padrão dos kits é entregar o estado da assinatura e deixar o gate com quem constrói. O Makerkit documenta
  entitlements como receita, não como recurso pronto
  (<https://makerkit.dev/docs/next-supabase-turbo/recipes/subscription-entitlements>, 2026-09-26); o Open SaaS
  guarda status e plano no usuário e diz "you can choose how to handle this status within your app"
  (<https://docs.opensaas.sh/general/user-overview/>). Prevalência baixa, e por isso `value: médio`.
- O provedor tem o mecanismo: Stripe Entitlements liga recursos com `lookup_key` a produtos e mantém as
  permissões ativas do cliente, avisando por `entitlements.active_entitlement_summary.updated`; a doc
  recomenda persistir as permissões localmente
  (<https://docs.stripe.com/billing/entitlements.md?dashboard-or-api=api>, 2026-09-26). O preço do recurso é
  **não confirmado**.

## Proposta — corte de MVP

- [x] A API tem uma checagem reutilizável que recusa, com código de erro próprio, quem não tem assinatura viva.
      A mesma checagem aceita um recurso nomeado e recusa quem não tem esse recurso.
- [x] A lista de recursos do titular é mantida no perfil a partir do webhook da Stripe e exposta ao front pelo
      SDK, junto do que a conta já devolve.
- [x] O app tem um jeito padrão de condicionar um trecho de tela ao plano, que mostra o convite para assinar
      no lugar do conteúdo, com texto traduzido e link para a aba de cobrança.
- [x] O recurso de referência `entity` demonstra o gate atrás de um recurso configurável, desligado por
      padrão: fork que não configura nada vê o comportamento de hoje.
- [x] No modo `simple`, ou com a cobrança desligada, a checagem não bloqueia nada.

### Entrega (auditoria de 2026-10-04)

Entregue pela PR #38 (`2ed0df2`, branch `feat/plan-entitlements`), mergeada em 2026-10-04 com os quatro checks
verdes na PR e na execução de merge (`gh run 37239016680`). A auditoria conferiu cada item no código em `main`,
sem partir do `STATE.md`:

| item | evidência |
|------|-----------|
| 1. Checagem reutilizável na API | `requirePlanApi` compõe sobre o guard do painel comum (`apps/api/app/(guards)/plan.ts:21-32`) e recusa com `403` e `error.code` (`apps/api/(shared)/lib/plan-access.ts:32-44`). A decisão mora no SDK, para a tela e a API usarem a mesma regra: `planAccessDenial` devolve `PLAN_SUBSCRIPTION_REQUIRED` ou `PLAN_FEATURE_REQUIRED` (`packages/sdk/src/types/payments/plan-access.ts:33-47`). Códigos traduzidos nos 3 idiomas (`translations/packages/shared/utils.ts:74-75`, `:205-207`, `:337-339`) |
| 2. Recursos no perfil pelo webhook e expostos pelo SDK | o webhook trata `entitlements.active_entitlement_summary.updated` (`webhooks/payments/route.ts:219`) e reconcilia em `reconcileEntitlements` (`:156`), que busca a lista completa quando o resumo vem com `has_more`; a gravação passa por `userRepository.applyEntitlementsState` (`user.repository.ts:123`), com a regra de ordem em `decideEntitlementsWrite` (`billing-state.ts:253`). `GET /account` e `PUT /account` devolvem `planAccess` (`account/route.ts:28-33`, `:112`, `:174`), tipado em `AccountDTO` |
| 3. Jeito padrão de condicionar a tela | `PlanGate` (`apps/app/shared/components/ui/PlanGate.tsx:36-56`) mostra o convite traduzido com link para `/account?tab=billing` (`:58-82`). Relê a conta a cada montagem, porque o evento de recursos chega depois do de assinatura |
| 4. Demonstração em `entity`, desligada por padrão | `POST /entities` usa `requirePlanApi(entityPlanRequirement, …)` (`entities/route.ts:57`); a página de criação embrulha o formulário em `PlanGate` só quando há requisito (`entities/(pages)/create/page.tsx:62`, `:103-112`). A variável `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` vem vazia nos dois `.env.example` (`apps/api/.env.example:91`, `apps/app/.env.example:80`), e vazia vira "sem requisito" (`apps/api/(shared)/lib/entity-plan.ts:4-7`) |
| 5. No-op com a cobrança desligada | `toPlanAccess` marca `enforced` com `isBillingEnabled()` (`plan-access.ts:22-30`), que exige modo `subscription`, chaves da Stripe e `NEXT_PUBLIC_APP_URL` (`apps/api/(shared)/lib/billing.ts:24-30`); `planAccessDenial` não nega nada com `enforced: false` |

Testes da entrega, todos em Vitest sem emulador: `planGuard.test.ts`, `planAccess.test.ts`,
`entitiesRoutePlanGate.test.ts`, `entityPlanEnv.test.ts`, `billingEntitlementKeys.test.ts` e os casos novos de
`paymentsWebhookRoute.test.ts` na `apps/api`; `planGate.test.tsx`, `planGateAccountRefresh.test.tsx`,
`entityCreatePlanGate.test.tsx` e `entityPlanRequirement*.test.ts` na `apps/app`. Passaram no gate desta
auditoria.

O `/test` fechou com 15 ✅, 0 ❌ e 1 🔒: a entrega real da Stripe e o catálogo de recursos só se provam com conta
de teste. O skeleton do formulário em light, dark e 375 px ficou sem medição na segunda rodada. A pergunta em
aberto sobre Entitlements ou mapa local foi decidida pela recomendação da spec (Entitlements).

O que fica por fork: cadastrar os recursos no Dashboard da Stripe, assinar o sexto evento no endpoint e conferir
o custo do Entitlements (`docs/PRE-PRODUCTION.md` §12, a partir da `:455`).

O `STATE.md` da feature ficou com `review: in-progress`, embora a PR tenha sido mergeada. É a mesma defasagem
registrada em outras entregas; a auditoria não edita o `STATE.md` além do campo `spec:`, que já estava certo.

### Fora do corte

- **Limites de uso, cotas e créditos** (metering). Continua descartado: exige contagem no servidor e
  reconciliação com a Stripe, e aparece em 2/10.
- **Bloqueio em `past_due`**, trial, cupom e reembolso. Decisão de produto de cada fork; o Customer Portal
  cobre o lado de cobrança.
- **Assento por membro.** Depende de [`teams-organizations`](../../../specs/teams-organizations.md), que está `deferred`.
- Tela de administração dos recursos por plano. O catálogo mora na Stripe.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Tipo dos recursos do titular; campo no DTO da conta; código de erro novo. |
| `apps/api` | Checagem composta sobre o guard do painel comum; o webhook passa a tratar o evento de permissões e grava no perfil; a rota de criação de `entity` usa a checagem quando configurada. |
| `apps/app` | Componente ou hook de gate com convite para assinar; uso de demonstração em `entity`. |
| `apps/web` | N/A. |
| `packages/*` | i18n do convite e do `apiErrors`. |
| Infra/env | O endpoint de webhook de cada fork precisa assinar o evento de permissões (`docs/PRE-PRODUCTION.md` §12); recursos cadastrados no painel da Stripe. Variável para ligar a demonstração, opcional. |

## Riscos e trade-offs

- **Prova sem conta Stripe é parcial.** A checagem por status e o componente se provam com teste unitário e sob
  o emulador, gravando o perfil direto. O evento real de permissões só se prova com conta de teste da Stripe,
  e esses critérios voltam 🔒, como os de `billing-subscription`.
- **Mudar a referência `entity` mexe no template que todo fork copia.** Por isso a demonstração nasce desligada.
- **Duas fontes de verdade.** Status da assinatura e lista de recursos chegam por eventos diferentes e podem
  ficar fora de ordem por instantes. O `/analyze` precisa de uma regra clara de qual vence.
- **Dependência do Entitlements.** Se o fork não cadastrar recursos na Stripe, só a checagem por status
  funciona. Isso é aceitável e precisa estar no documento de pagamentos.
- Custo para fork que não cobra: nenhum; tudo é no-op fora do modo `subscription`.

## Sinais de pronto

- Um usuário sem assinatura que chama direto a rota protegida recebe o código de erro, mesmo com a UI
  escondendo o botão.
- Com assinatura viva e o recurso no plano, a mesma chamada passa.
- A tela protegida mostra o convite para assinar a quem não tem o plano, nos 3 idiomas.
- Com a demonstração desligada, o CRUD de `entity` funciona como hoje.

## Perguntas em aberto

- Usar Stripe Entitlements ou um mapa local de preço para recursos? — **recomendação:** Entitlements; o
  catálogo já mora na Stripe e o fork muda o plano sem deploy. O mapa local só se o preço do recurso na Stripe
  for um problema.
- Demonstrar em `entity` ou só documentar? — **recomendação:** demonstrar, desligado por padrão; sem uso no
  código, o padrão não é copiado.
