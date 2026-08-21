# Pagamentos & assinaturas (Stripe)

Como o fluxo de assinatura funciona neste boilerplate e o que falta implementar em cada fork. Para o passo a passo de implementação, use a skill `/payments-flow`. Aspectos de segurança em [`docs/SECURITY.md`](SECURITY.md).

## Estado atual (implementado)

- `@repo/payments` expõe o cliente `stripe` (server-only) e um `paymentsAgentToolkit` (`@repo/payments/ai`) para criar produtos/preços/payment links.
- **Rotas** em `apps/api`: `GET /payments/plans` (público; `prices.list` → `PlanDTO`), `POST /payments/checkout` e `POST /payments/portal` (`requireCommonPanelApi`). O **webhook** trata `checkout.session.completed` e `customer.subscription.updated|deleted`.
- **Persistência**: `UserDTO.subscription` (`stripeCustomerId`, `status`, `priceId`, `currentPeriodEnd`) no doc `user`, via `userRepository.updateSubscriptionByReferenceId`. O customer é criado no 1º checkout com `metadata.firebaseUid` + `client_reference_id`, e o webhook reconcilia por esse UID.
- **SDK**: `apiClient.payments.{listPlans,createCheckout,createPortal}`.
- **UI**: "Minha assinatura" em `apps/app` (área comum, **modo `subscription`** — sidebar `Assinatura`) liga checkout/portal; os CTAs do pricing (`apps/web`) apontam para essa área no modo subscription.
- **Falta por fork**: criar os produtos/preços no Stripe e ajustar a política de reembolso/copy. A skill `/payments-flow` ajuda a estender. **Idempotência**: os handlers de webhook relêem o estado do objeto Stripe a cada evento (sem dedup por `event.id`), e o checkout não deduplica `customers` por `metadata.firebaseUid` antes de criar — suficiente para começar; endureça (store de `event.id` processado + busca de customer) conforme o volume.

## Fluxo alvo (ponta a ponta)

```
  Front (app/web)                 apps/api                        Stripe
  ───────────────                 ────────                        ──────
  [Ver planos]  ───── SDK ──────► GET /payments/plans ──────────► prices.list
  [Assinar]     ───── SDK ──────► POST /payments/checkout ──────► checkout.sessions.create
        ◄──────── { url } ───────────────────────────────────────┘
  redirect p/ Stripe Checkout ──────────────────────────────────► (pagamento)
                                                                     │ webhook
  perfil atualizado ◄── userRepository ◄── POST /webhooks/payments ◄┘ checkout.session.completed
  [Gerenciar]   ───── SDK ──────► POST /payments/portal ────────► billingPortal.sessions.create
        ◄──────── { url } ───────────────────────────────────────┘
  redirect p/ Customer Portal (cancelar/trocar plano/reembolso)
```

## Conceitos-chave

- **Customer ↔ usuário**: salve `stripeCustomerId` no perfil (coleção `user`) no primeiro checkout. É o que permite ao webhook reconciliar o pagamento com o usuário (junto com `metadata.userId`).
- **Checkout/Portal são server-side**: criados na API (com guard), nunca no front. O front só recebe a `url` e redireciona. A `STRIPE_SECRET_KEY` nunca vai ao cliente.
- **Webhook é a fonte de verdade do estado**: a assinatura só é considerada ativa quando `checkout.session.completed` chega e é persistida. Trate reentregas de forma idempotente.

## Eventos de webhook a tratar

| Evento | Ação no perfil |
|--------|----------------|
| `checkout.session.completed` | marca assinatura ativa (plano, status, fim do período) |
| `customer.subscription.updated` | atualiza plano/status (ex.: `past_due`) |
| `customer.subscription.deleted` / `subscription_schedule.canceled` | marca cancelada |

## Cancelamento e reembolso (conformidade legal)

- O **Customer Portal** (configurável no Dashboard → Billing → Customer portal) cobre cancelamento e troca de plano sem código. Habilite o cancelamento e, conforme a legislação aplicável (ex.: direito de arrependimento de 7 dias no CDC brasileiro), permita reembolso na janela devida.
- Reembolsos programáticos: `stripe.refunds.create({ payment_intent })` numa rota **admin** (`requireAdminApi`).
- Documente a política de reembolso na `apps/web` (use `/copywriting` para a copy).

## Planos

- Defina produtos/preços no Stripe (Dashboard ou `paymentsAgentToolkit`). Exponha-os ao front via rota (`prices.list`) ou via config tipada no app (mais simples/barato). Mapeie para um `PlanDTO` no `@repo/sdk`.
- Pricing público (`apps/web`) e seleção de plano (`apps/app`) consomem o mesmo contrato.

## Ambiente e teste local

- Vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (ver [`docs/SETUP.md`](SETUP.md)).
- Local: `pnpm --filter api dev:with-stripe` sobe a API e o `stripe listen`. Dispare eventos com `stripe trigger checkout.session.completed` e use cartões de teste (`4242 4242 4242 4242`).
