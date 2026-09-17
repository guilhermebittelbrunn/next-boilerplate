# Pagamentos & assinaturas (Stripe)

Como o fluxo de assinatura funciona neste boilerplate e o que falta implementar em cada fork. Para o passo a passo de implementação, use a skill `/payments-flow`. Aspectos de segurança em [`docs/SECURITY.md`](SECURITY.md).

## Estado atual (medido em 2026-09-14)

> ⚠️ **Não há fluxo de assinatura funcionando.** O que existe é o encanamento da borda: o cliente Stripe e
> um webhook que valida assinatura de evento mas **não persiste nada**. Tudo abaixo de "Fluxo alvo" é
> **projeto**, não estado — a entrega está no backlog como
> [`specs/billing-subscription.md`](../specs/billing-subscription.md).

**O que existe:**

- `@repo/payments` expõe `getStripe()` (`packages/payments/index.ts:14`, server-only), que constrói o cliente sob demanda e devolve `null` quando não há `STRIPE_SECRET_KEY` — por isso o build da API não quebra num ambiente sem chave. Toda rota que usa o cliente precisa tratar o `null`. Expõe também um `paymentsAgentToolkit` (`packages/payments/ai.ts:4`) para criar produtos/preços/payment links.
- **Uma** rota: `POST /webhooks/payments` (`apps/api/app/(routes)/webhooks/payments/route.ts`). Ela valida a assinatura com `constructEvent` e despacha **dois** eventos — `checkout.session.completed` e `subscription_schedule.canceled`. Sem `STRIPE_WEBHOOK_SECRET` responde `{ ok: false, message: "Not configured" }`.

**O que NÃO existe** (e que versões anteriores deste documento afirmavam existir):

- ❌ **Os handlers de evento são stubs vazios** (`route.ts:10-27`, com `TODO`). Nenhum evento muda nada: assinatura paga não vira acesso.
- ❌ **Nenhuma persistência**: não há `UserDTO.subscription`, `stripeCustomerId` nem `updateSubscriptionByReferenceId` em lugar nenhum do repo.
- ❌ **Nenhuma rota de plano, checkout ou portal** — `GET /payments/plans`, `POST /payments/checkout` e `POST /payments/portal` não existem.
- ❌ **Nada no SDK**: não há `apiClient.payments`.
- ❌ **Nenhuma UI de assinatura com conteúdo** na `apps/app` — existe o **lugar**, não o conteúdo: a aba `/account?tab=billing` (`AccountTabs.tsx:23,76-77`, alcançada por `routes.tsx:53` → `paths.ts:54-56`) renderiza o `AccountBillingPlaceholder`, um empty state traduzido nos 3 idiomas. ⚠️ *Corrigido em 2026-09-15: a versão anterior desta linha dizia "nenhuma UI de assinatura **e nenhum modo `subscription`**", e as duas metades eram falsas — o modo `subscription` existe e é o **padrão** (`packages/next-config/product-mode.ts:12` declara o tipo, `:14` o torna default em `DEFAULT_PRODUCT_MODE`, `:23` expõe `isSubscriptionMode()`, consumido em `apps/web/…/header/index.tsx:38`). Este documento errou na direção oposta à de sempre: afirmou ausência onde havia presença.*
- ❌ O webhook **não** trata `customer.subscription.updated|deleted`.

**Consequência prática para um fork:** ligar as chaves da Stripe hoje faz o webhook responder `200` e
descartar o evento em silêncio. Idempotência, dedup de `customer` e reconciliação por UID são decisões que
ainda **não foram tomadas** — não são dívida a endurecer, são código a escrever.

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
