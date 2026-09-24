---
name: payments-flow
description: Implementa ou estende o fluxo de assinatura/pagamento Stripe neste boilerplate (next-forge fork) — listagem de planos, checkout, portal de cobrança (cancelar/reembolsar), mapeamento de customer no perfil e handlers de webhook. Use quando o usuário pedir "adicionar assinatura/planos", "integrar pagamento/checkout Stripe", "cancelar/reembolsar assinatura", "portal de cobrança" ou completar o webhook de pagamentos. Server-side via @repo/payments.
---

# Fluxo de pagamentos (Stripe)

O fluxo de assinatura já existe de ponta a ponta: catálogo, checkout, portal, webhook com dedupe e regra de
ordem, aba billing no `apps/app`, CTAs do pricing na `apps/web`, cancelamento no expurgo e estado na
exportação. Esta skill serve para **estender** esse fluxo sem quebrar as invariantes dele. Visão narrativa e
tabela de eventos: [`docs/PAYMENTS.md`](../../../docs/PAYMENTS.md). Configuração de conta:
[`docs/PRE-PRODUCTION.md`](../../../docs/PRE-PRODUCTION.md), item 12. Segurança:
[`docs/SECURITY.md`](../../../docs/SECURITY.md).

Compõe [`/new-api-route`](../new-api-route/SKILL.md) (rotas) e [`/i18n-sync`](../i18n-sync/SKILL.md)
(textos e erros).

## Onde cada coisa mora

| Peça | Arquivo |
|------|---------|
| Chaves e cliente | `packages/payments/keys.ts`, `index.ts` (`getStripe`, `getWebhookSecret`, `isPaymentsConfigured`) |
| Toolkit para semear catálogo | `packages/payments/ai.ts` (`getPaymentsAgentToolkit()`, `null` sem chave) |
| Contrato | `packages/sdk/src/types/payments/payments.ts`, `actions/payments/action.ts` |
| Lógica Stripe | `apps/api/(shared)/lib/billing.ts` (catálogo, cliente, sessões, `isBillingEnabled`) |
| Lógica pura | `apps/api/(shared)/lib/billing-state.ts` (`toSubscriptionState`, `toPlanDTO`, `decideSubscriptionWrite`) |
| Persistência | `userRepository.findByStripeCustomerId` / `linkStripeCustomer` / `applySubscriptionState`; `paymentEventRepository` |
| Rotas | `apps/api/app/(routes)/payments/{plans,checkout,portal}`, `webhooks/payments` |
| UI | `apps/app/.../account/(components)/AccountBillingPanel.tsx`, `BillingPlanCard.tsx`, hooks em `(hooks)/` |

## Invariantes (não quebre)

- **Cliente só dentro do handler**: `const stripe = getStripe()` e trate o `null`. Nunca construa cliente
  Stripe em escopo de módulo; o build de um fork sem chave quebraria.
- **Cobrança ligada = modo `subscription` + as duas chaves + `NEXT_PUBLIC_APP_URL`** (`isBillingEnabled()`).
  Rota de escrita desligada responde 503 `PAYMENTS_NOT_CONFIGURED`; a leitura do catálogo responde 200
  `{ enabled: false }` para a aba cair no placeholder.
- **Falha da Stripe vira código, nunca 500**: envolva a chamada e responda 503
  `PAYMENTS_PROVIDER_UNAVAILABLE` (ou um código novo, traduzido nos 3 idiomas em `apiErrors`).
- **O perfil é sempre `ctx.subjectProfile`**. Nenhum id de perfil ou de cliente vem do corpo.
- **Webhook**: confie só no que passou por `constructEvent`; deduplique por `event.id` antes de despachar
  e marque o evento **depois** do handler (handler que lança responde 500 e a Stripe reentrega). Todo
  evento novo de assinatura passa por `applySubscriptionState`, que aplica `decideSubscriptionWrite` numa
  transação.
- **O estado da assinatura é escrito só pelo webhook.** Checkout e portal nunca gravam `subscription`.
- **Nada de reler a Stripe no webhook**: o payload basta, e reler tornaria o webhook impossível de testar
  sem conta.
- **Expurgo**: o passo `billing` roda primeiro e, se falhar, nada é apagado.

## Receitas

### Tratar um evento novo

1. Acrescente o `case` em `dispatch` (`webhooks/payments/route.ts`).
2. Se o evento muda a assinatura, converta com `toSubscriptionState` e grave com `applySubscriptionState`.
   Se só liga dados, use um método pequeno no `userRepository`.
3. Teste em `apps/api/__tests__/paymentsWebhookRoute.test.ts`: um caso com `constructEvent` mockado e, se o
   formato do payload importar, um caso assinado com `stripe.webhooks.generateTestHeaderString`.
4. Documente o evento na tabela de `docs/PAYMENTS.md` e na lista de eventos do item 12 de
   `docs/PRE-PRODUCTION.md`.

### Gate de acesso por plano

Leia `account.subscription` (UI) ou `ctx.subjectProfile.subscription` (API) com `isLiveSubscription` de
`billing-state.ts`, que usa `LIVE_SUBSCRIPTION_STATUSES` do SDK. Espelhe o gate na API: esconder na UI não
protege nada.

### Reembolso programático

Rota com `requireAdminApi` chamando `stripe.refunds.create({ payment_intent })`. O Customer Portal já cobre
cancelamento e troca de plano sem código.

## Teste

- Suíte (sem rede, sem emulador): mocke `@repo/payments` e `@/env` como em
  `apps/api/__tests__/paymentsCheckoutRoute.test.ts`; lógica pura em `billingState.test.ts`.
- Local com conta de teste: `pnpm --filter api dev:with-stripe` (API + `stripe listen`), depois
  `stripe trigger customer.subscription.created` e cartão `4242 4242 4242 4242`. O `whsec_…` que o
  `stripe listen` imprime vai em `STRIPE_WEBHOOK_SECRET` local.

## Checklist

- [ ] Secret key só no servidor; checkout, portal e reembolso em rotas com guard.
- [ ] Rota nova trata `getStripe()` nulo e `isBillingEnabled()` falso com `error.code`.
- [ ] Webhook verifica assinatura, deduplica e reconcilia pela regra de ordem.
- [ ] Textos e `error.code` nos 3 idiomas (`pnpm --filter @repo/internationalization test`).
- [ ] `pnpm turbo run lint typecheck test` passa.
