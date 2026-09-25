# Pagamentos & assinaturas (Stripe)

Como o fluxo de assinatura funciona neste boilerplate e o que cada fork configura. Para estender o fluxo,
use a skill `/payments-flow`. Aspectos de segurança em [`docs/SECURITY.md`](SECURITY.md). Os passos de
console da Stripe estão em [`docs/PRE-PRODUCTION.md`](PRE-PRODUCTION.md), item "Stripe".

## Estado atual (medido em 2026-09-25)

O fluxo existe de ponta a ponta no modo de produto `subscription`: o usuário comum escolhe um plano na aba
`/account?tab=billing`, paga no Stripe Checkout, volta para o app e vê o plano, a situação e o fim do
período gravados no próprio perfil. Quem já assina abre o Customer Portal pela mesma aba. O admin vê, na
home do painel, o valor recebido no mês, os planos com mais assinaturas vigentes e as últimas contratações,
tudo lido de coleções que o webhook alimenta.

**Peças, por camada:**

| Camada | Onde | O que faz |
|--------|------|-----------|
| Config | `packages/payments/keys.ts` | `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`, string vazia lida como ausência. Chave com prefixo errado (`pk_` no lugar de `sk_`) falha a validação: o `next build` da API sai com erro e, em runtime, toda requisição responde 500 com `Invalid environment variables` no log. |
| Cliente | `packages/payments/index.ts` | `getStripe()` (devolve `null` sem chave), `getWebhookSecret()` e `isPaymentsConfigured()` (as duas chaves ou nada). |
| Toolkit | `packages/payments/ai.ts` | `getPaymentsAgentToolkit()`, construído sob demanda; devolve `null` sem chave. Serve para semear produtos e preços. |
| Contrato | `packages/sdk/src/types/payments/`, `actions/payments/action.ts` | `PlanDTO`, `SubscriptionState`, `LIVE_SUBSCRIPTION_STATUSES`, `BillingSummaryDTO`; `apiClient.payments.listPlans()`, `.createCheckout()`, `.openPortal()`, `.summary()`. |
| Rotas | `apps/api/app/(routes)/payments/{plans,checkout,portal}` | Catálogo, sessão de checkout e sessão de portal, todas com `requireCommonPanelApi`. |
| Resumo do admin | `apps/api/app/(routes)/payments/summary`, `(shared)/lib/billing-summary.ts` | `GET /payments/summary` com `requireAdminApi`: receita do mês por moeda, planos vigentes e contratações recentes. Nunca chama a Stripe. |
| Lógica | `apps/api/(shared)/lib/billing.ts`, `billing-state.ts`, `plan-label.ts` | Fala com a Stripe; converte assinatura, fatura e preço em snapshot/DTO/registro; decide se um evento pode sobrescrever o estado gravado; mantém o cache de nomes de plano. |
| Webhook | `apps/api/app/(routes)/webhooks/payments/route.ts` | Verifica a assinatura, deduplica por `event.id`, reconcilia o perfil e registra faturas pagas. |
| UI | `apps/app/.../account/(components)/AccountBillingPanel.tsx` | Planos, plano atual, badge de status, avisos de retorno do checkout. |
| UI admin | `apps/app/.../admin/(pages)/(components)/BillingInsightsSection.tsx` | Seção de cobrança da home do admin: recebido no mês, planos mais vendidos, contratações recentes. |
| Web | `apps/web/shared/lib/pricingCta.ts` | Os CTAs dos dois primeiros planos do `/pricing` levam a `<app>/<locale>/account?tab=billing`. |

**"Cobrança ligada"** exige quatro coisas ao mesmo tempo: `NEXT_PUBLIC_PRODUCT_MODE` diferente de `simple`,
as duas chaves Stripe e `NEXT_PUBLIC_APP_URL` na API (é a base das URLs de retorno). Faltando qualquer uma:

| Superfície | Resposta |
|------------|----------|
| `GET /payments/plans` | 200 `{ "enabled": false, "plans": [] }`, sem chamar a Stripe |
| `GET /payments/summary` | 200 `{ "data": { "enabled": false } }`, sem ler as coleções de cobrança (o guard ainda lê o perfil do admin); a home do admin não mostra a seção |
| `POST /payments/checkout`, `POST /payments/portal` | 503 `PAYMENTS_NOT_CONFIGURED` |
| Aba billing | O mesmo placeholder "Cobrança em breve" que existia antes da feature |
| Modo `simple` | Aba billing e item da sidebar somem; `?tab=billing` abre o perfil; a home do admin nem faz a requisição do resumo |

O webhook depende só das duas chaves, porque um evento que chega precisa ser reconciliado em qualquer modo.
Sem elas responde 503 `PAYMENTS_NOT_CONFIGURED`, e a Stripe reentrega por até 3 dias. Com só uma das duas
chaves, a API avisa no boot: `[payments] billing is DISABLED (no STRIPE_WEBHOOK_SECRET)`.

## Fluxo

```
  apps/app                        apps/api                        Stripe
  ────────                        ────────                        ──────
  aba billing ──── SDK ─────────► GET /payments/plans ──────────► prices.list (recorrentes ativos)
  [Assinar]   ──── SDK ─────────► POST /payments/checkout ──────► customers.create (1ª vez, idempotente)
                                                                  checkout.sessions.create
        ◄──────── { url } ───────────────────────────────────────┘
  redirect p/ Checkout ─────────────────────────────────────────► pagamento
  volta com ?checkout=success                                        │ webhook
  relê GET /account a cada 3 s ◄── user.subscription ◄── POST /webhooks/payments ◄┘
  [Gerenciar] ──── SDK ─────────► POST /payments/portal ────────► billingPortal.sessions.create
```

## Dados

Coleção `user`, dois campos opcionais:

- `stripeCustomerId`: gravado no primeiro checkout, antes de a sessão existir, para que todo evento ache o
  perfil pelo `customer`.
- `subscription`: último estado conhecido, escrito só pelo webhook. Guarda `subscriptionId`, `status`,
  `priceId`, `productId`, `unitAmount`, `currency`, `interval`, `intervalCount`, `currentPeriodEnd`,
  `cancelAtPeriodEnd` e `lastEventAt`. O preço fica no snapshot para o card "Plano atual" funcionar mesmo
  com o preço arquivado ou com a listagem de planos fora do ar.

Perfil sem os dois campos lê como "sem assinatura". Não há backfill.

Coleção `paymentEvent`: um documento por evento processado, com id igual ao `event.id`, `type`,
`createdAt` e `expiresAt` (30 dias depois, para uma política de TTL opcional).

Três coleções alimentam o resumo do admin, todas escritas só pelo webhook e nenhuma com TTL:

| Coleção | Id | Campos | Escrita |
|---------|----|--------|---------|
| `paidInvoice` | `invoice.id` | `amountPaid` (menor unidade da moeda), `currency`, `paidAt`, `billingReason`, `subscriptionId`, `priceId`, `recordedAt` | toda `invoice.paid`, com `create()`: a mesma fatura nunca entra duas vezes |
| `subscriptionActivation` | `subscription.id` | `customerId`, `priceId`, `activatedAt`, `recordedAt` | só a fatura com `billing_reason = subscription_create`, a primeira de cada assinatura |
| `planLabel` | `price.id` | `name`, `productId`, `interval`, `intervalCount`, `resolvedAt` | `prices.retrieve` best-effort, renovado a cada 7 dias |

Nenhuma delas guarda perfil, nome ou e-mail. O assinante de uma contratação é achado na leitura, pelo
`stripeCustomerId` do perfil; perfil apagado aparece como "Usuário removido". A contagem de planos lê
`user.subscription` dos perfis não apagados com status em `LIVE_SUBSCRIPTION_STATUSES`. Nenhuma consulta pede
índice composto. Cada abertura da home lê um documento por assinatura vigente e um por fatura paga no mês;
acima de 5 000 assinaturas vigentes, vale trocar por um documento de contagem mantido pelo webhook.

## Eventos de webhook

| Evento | Ação |
|--------|------|
| `checkout.session.completed` | Liga o `customer` ao perfil de `client_reference_id` (ou `metadata.profileId`) se o vínculo faltar |
| `customer.subscription.created` / `updated` / `deleted` | Acha o perfil pelo `customer` (fallback `metadata.profileId`) e grava o snapshot numa transação; garante o nome do plano no cache |
| `invoice.paid` | Grava a fatura em `paidInvoice`; se for a primeira da assinatura (`subscription_create`), grava a contratação em `subscriptionActivation`; garante o nome do plano no cache |
| qualquer outro | Registra `webhook-unhandled-event` e responde 200 |

`subscription_schedule.canceled` não é tratado: cancelar um schedule não cancela a assinatura. O
cancelamento real chega como `customer.subscription.deleted`.

**Idempotência e ordem.** Evento com `id` já processado responde 200 `{ duplicate: true }` sem rodar
handler. O evento é marcado só depois de o handler terminar; se o handler lança, a rota responde 500 e a
Stripe reentrega. A escrita do snapshot segue `decideSubscriptionWrite`:

1. Nada gravado, ou outra assinatura gravada: aplica, a menos que a gravada esteja viva e a nova não (um
   `deleted` atrasado de uma assinatura antiga não derruba a atual).
2. Mesma assinatura já `canceled` ou `incomplete_expired`: ignora. A Stripe não tira uma assinatura desses
   estados.
3. Mesma assinatura e evento `created`: ignora (é o estado mais antigo e empata no segundo com o primeiro
   `updated`).
4. Mesma assinatura e `event.created` anterior a `lastEventAt`: ignora.
5. Caso contrário, aplica.

Perfil não encontrado responde 200, registra `webhook-profile-not-found` e marca o evento.

A fatura e a contratação têm uma segunda camada de idempotência: o id do documento é o da fatura e o da
assinatura, então um handler que roda de novo (evento marcado sem sucesso, ou duas entregas concorrentes)
encontra o documento e não escreve nada. A receita é somada na leitura, sem contador a incrementar.

O nome do plano é cosmético. `ensurePlanLabel` consulta a Stripe com teto de 3 s e sem retry, e qualquer
falha vira `plan-label-unresolved` no log sem mudar a resposta do webhook. A resposta de sucesso é
`{ "ok": true }`, sem o evento: a fatura traz e-mail e endereço do cliente, que não devem ir para o log de
entregas da Stripe.

**Versão de API do endpoint.** O fim do período é lido de `items.data[0].current_period_end`, que é onde a
versão `2025-09-30.clover` (fixada em `getStripe()`) o entrega. Um endpoint registrado numa versão anterior a
2025-03-31 manda o campo em outro lugar, e o snapshot grava `currentPeriodEnd: null`; a UI então omite a
data.

## Checkout, portal e erros

- O checkout recusa quem já tem assinatura viva (`active`, `trialing`, `past_due`, `unpaid`, `paused`) com
  409 `PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE`: trocar de plano é pelo portal.
- Na volta com `?checkout=success`, enquanto o webhook não grava a assinatura, os botões "Assinar" ficam
  desabilitados. A recusa acima só enxerga o que já está no perfil, então é a UI que cobre essa janela.
- Duas abas pagas antes de qualquer webhook ainda geram duas assinaturas na Stripe. O perfil guarda a mais
  recente e o expurgo cancela só essa. É um risco aceito para o MVP; a correção, para quem precisar dela
  antes do release, está no item 12 do [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md#12-stripe--só-se-o-fork-cobra-assinatura).
- O `priceId` do corpo só nomeia o preço. A API consulta a Stripe e recusa preço inexistente, inativo,
  avulso ou de produto arquivado com 404 `PAYMENTS_PLAN_NOT_FOUND`.
- O cliente Stripe é criado com a chave de idempotência `customer-<profileId>`, então clique duplo não gera
  dois clientes.
- O portal exige `stripeCustomerId`: sem ele, 409 `PAYMENTS_CUSTOMER_NOT_FOUND`.
- Qualquer outra falha da Stripe (chave recusada, rede, 5xx) vira 503 `PAYMENTS_PROVIDER_UNAVAILABLE`.
- Personificação é só leitura: checkout e portal respondem 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY`, e os
  botões ficam desabilitados.

Os códigos novos têm tradução nos 3 idiomas em `apiErrors`.

## Exclusão e exportação de conta

- O passo `billing` do expurgo roda **primeiro**. Com assinatura viva, cancela na Stripe
  (`subscriptions.cancel`, imediato, sem reembolso proporcional); assinatura que a Stripe já não tem conta
  como feita. Se o cancelamento falhar, ou se a Stripe estiver desligada com assinatura viva gravada, nada
  é apagado e `POST /account/deletion` responde 503 `ACCOUNT_DELETION_BILLING_FAILED`.
- A exportação leva `account.subscription` e `account.stripeCustomerId`, com `null` quando não existem.

## Fora do corte

Trial, cupom, downgrade proporcional, reembolso e faturas em UI própria; MRR, churn e receita líquida de
reembolso no resumo do admin; importar faturas anteriores ao cadastro de `invoice.paid`; bloquear acesso por plano ou em
`past_due` (o status só é exibido); cobrança por organização; nome e descrição de plano traduzidos (vêm da
Stripe num idioma só); cancelar a assinatura quando o **admin** faz soft delete de um usuário
(`apps/api/app/(routes)/users/[id]/route.ts`), que hoje não cancela.

Reembolso programático, se um fork precisar: `stripe.refunds.create({ payment_intent })` numa rota com
`requireAdminApi`. Política de reembolso (ex.: arrependimento de 7 dias do CDC) se configura no Customer
Portal.

## Teste local

- Sem conta Stripe, a suíte cobre o fluxo com cliente mockado, e o teste do webhook assina payloads com
  `stripe.webhooks.generateTestHeaderString`, que calcula o HMAC localmente.
- Com conta de teste: preencha as duas chaves no `.env` da API e rode `pnpm --filter api dev:with-stripe`
  (API + `stripe listen`). Dispare eventos com `stripe trigger customer.subscription.created` e pague com o
  cartão `4242 4242 4242 4242`.
- O segredo que o `stripe listen` imprime (`whsec_…`) é o que vai em `STRIPE_WEBHOOK_SECRET` localmente;
  ele é diferente do segredo do endpoint registrado no Dashboard.
