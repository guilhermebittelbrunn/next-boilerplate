---
name: payments-flow
description: Implementa ou estende o fluxo de assinatura/pagamento Stripe neste boilerplate (next-forge fork) — listagem de planos, checkout, portal de cobrança (cancelar/reembolsar), mapeamento de customer no perfil e handlers de webhook. Use quando o usuário pedir "adicionar assinatura/planos", "integrar pagamento/checkout Stripe", "cancelar/reembolsar assinatura", "portal de cobrança" ou completar o webhook de pagamentos. Server-side via @repo/payments.
---

# Fluxo de pagamentos (Stripe)

Constrói o fluxo de assinatura ponta a ponta sobre o pacote `@repo/payments` (que expõe o cliente `stripe`) e a rota de webhook já existente. Hoje **só o webhook existe** (com handlers em TODO) — esta skill cria as peças que faltam. Visão narrativa: [`docs/PAYMENTS.md`](../../../docs/PAYMENTS.md). Segurança: [`docs/SECURITY.md`](../../../docs/SECURITY.md).

Compõe [`/new-api-route`](../new-api-route/SKILL.md) (rotas) e [`/i18n-sync`](../i18n-sync/SKILL.md) (textos/erros).

## Pré-requisitos
- `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` no ambiente da API (ver [`docs/SETUP.md`](../../../docs/SETUP.md)).
- Produtos/preços criados no Stripe (Dashboard ou via `paymentsAgentToolkit` de `@repo/payments/ai`). Anote os `price_...`.
- Cliente: `import { getStripe } from "@repo/payments"` (server-only) e `const stripe = getStripe()` dentro do handler. Devolve `null` sem `STRIPE_SECRET_KEY` — trate esse caso antes de usar (o webhook responde `Not configured`). **Nunca** use a secret key no front.

## Peças do fluxo (criar na ordem)

### 1. Mapear o customer no perfil do usuário
Para os webhooks reconciliarem o pagamento com o usuário, persista o `stripeCustomerId` no perfil (coleção `user`):
- Adicione `stripeCustomerId?: string` ao `UserDTO` (`@repo/sdk`) e ao mapper/persistência do usuário na API.
- Ao iniciar o primeiro checkout, crie/recupere o customer (`stripe.customers.create({ email, metadata: { userId } })`) e salve o id no perfil via `userRepository`.

### 2. Listagem de planos
- Exponha os planos para o front. Opções: ler de `stripe.prices.list({ active: true, expand: ["data.product"] })` numa rota, **ou** uma config tipada de planos no app (mais simples e barato). Em ambos, mapeie para um DTO no `@repo/sdk` (`PlanDTO`: id, nome, preço, intervalo, features).
- Textos (nome/descrição/CTA) via dictionary — `/i18n-sync`.

### 3. Checkout (server-side)
- Rota `POST /payments/checkout` (guard `requireCommonPanelApi`): cria `stripe.checkout.sessions.create({ mode: "subscription", customer, line_items: [{ price, quantity: 1 }], success_url, cancel_url, metadata: { userId } })` e retorna `{ url }`.
- SDK action `apiClient.payments.createCheckout(priceId)` → retorna a URL; o front redireciona (`window.location.href = url`).
- `success_url`/`cancel_url` apontam para páginas do `apps/app` (use env de URL, não hardcode).

### 4. Portal de cobrança (cancelar / atualizar / reembolso)
- Rota `POST /payments/portal` (guard): `stripe.billingPortal.sessions.create({ customer, return_url })` → `{ url }`. O Customer Portal cobre **cancelamento, troca de plano e histórico**; configure-o no Dashboard (Settings → Billing → Customer portal) habilitando cancelamento e, se aplicável, reembolsos conforme a lei do consumidor (ex.: direito de arrependimento).
- SDK action `apiClient.payments.openPortal()`; o front redireciona para a URL.
- Reembolsos programáticos (quando necessário): `stripe.refunds.create({ payment_intent })` numa rota admin protegida (`requireAdminApi`).

### 5. Handlers de webhook (completar os TODOs)
Em `apps/api/app/(routes)/webhooks/payments/route.ts` (assinatura já é verificada):
- `checkout.session.completed`: resolva o usuário pelo `customer`/`metadata.userId`, persista plano/status (ex.: `subscriptionStatus: "active"`, `plan`, `currentPeriodEnd`) no perfil via `userRepository`.
- `customer.subscription.updated` / `customer.subscription.deleted` / `subscription_schedule.canceled`: atualize o status (`canceled`, `past_due`, …).
- Idempotência: trate reentregas (o Stripe pode reenviar) — ex.: cheque o estado antes de reprocessar.
- Responda 2xx só após persistir; erros não-fatais não devem devolver 5xx em loop.

### 6. UI e i18n
- Página de planos (`apps/app` autenticado) com `Table`/cards do design system; botão "Assinar" → checkout; "Gerenciar assinatura" → portal. Para a `apps/web` (pricing pública), use a skill `copywriting` na copy.
- Status da assinatura (badge) e estados de erro via dictionary (`/i18n-sync`); novos `error.code` (ex.: `PAYMENTS_CHECKOUT_FAILED`) nos 3 idiomas em `apiErrors`.

## Teste local
```bash
pnpm --filter api dev:with-stripe   # API (3002) + `stripe listen` encaminhando webhooks
stripe trigger checkout.session.completed   # dispara um evento de teste
```
Use cartões de teste do Stripe (`4242 4242 4242 4242`).

## Checklist
- [ ] Secret key só no servidor; checkout/portal/reembolso em rotas com guard.
- [ ] Webhook verifica assinatura (mantido) e handlers persistem estado de forma idempotente.
- [ ] `stripeCustomerId` mapeado no perfil; webhooks reconciliam pelo customer/metadata.
- [ ] Cancelamento/reembolso disponíveis (Customer Portal configurado conforme a lei).
- [ ] Textos e `error.code` nos 3 idiomas.
- [ ] `pnpm --filter api typecheck` e `pnpm check` passam.
