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
| Contrato | `packages/sdk/src/types/payments/`, `actions/payments/action.ts` | `PlanDTO`, `SubscriptionState`, `LIVE_SUBSCRIPTION_STATUSES`, `BillingSummaryDTO`, `PlanAccessDTO`, `planAccessDenial`; `apiClient.payments.listPlans()`, `.createCheckout()`, `.openPortal()`, `.summary()`. |
| Rotas | `apps/api/app/(routes)/payments/{plans,checkout,portal}` | Catálogo, sessão de checkout e sessão de portal, todas com `requireCommonPanelApi`. |
| Resumo do admin | `apps/api/app/(routes)/payments/summary`, `(shared)/lib/billing-summary.ts` | `GET /payments/summary` com `requireAdminApi`: receita do mês por moeda, planos vigentes e contratações recentes. Nunca chama a Stripe. |
| Lógica | `apps/api/(shared)/lib/billing.ts`, `billing-state.ts`, `plan-label.ts` | Fala com a Stripe; converte assinatura, fatura e preço em snapshot/DTO/registro; decide se um evento pode sobrescrever o estado gravado; mantém o cache de nomes de plano. |
| Webhook | `apps/api/app/(routes)/webhooks/payments/route.ts` | Verifica a assinatura, deduplica por `event.id`, reconcilia o perfil (assinatura e recursos do plano) e registra faturas pagas. |
| Acesso por plano | `apps/api/app/(guards)/plan.ts`, `(shared)/lib/plan-access.ts`, `apps/app/shared/components/ui/PlanGate.tsx` | `requirePlanApi` recusa na API quem não tem assinatura viva ou o recurso pedido; `PlanGate` antecipa a mesma decisão na tela. Ver "Acesso por plano". |
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
| Rotas com `requirePlanApi`, `PlanGate` | Nada é bloqueado: `planAccess.enforced` vem `false` |

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

- `entitlements`: os recursos ativos do cliente, escritos só pelo webhook. Guarda `features` (os
  `lookup_key` dos recursos, sem repetição e em ordem alfabética) e `lastEventAt`.

Perfil sem os campos lê como "sem assinatura" e "nenhum recurso". Não há backfill: quem já assinava antes do
evento de recursos estar cadastrado no endpoint passa a ter a lista no próximo evento daquele cliente.

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
| `entitlements.active_entitlement_summary.updated` | Acha o perfil pelo `customer` (não há fallback: o resumo não traz metadata) e grava `entitlements` numa transação. O evento traz no máximo 10 recursos; com `has_more`, a lista completa é buscada em `entitlements.activeEntitlements.list` |
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

A lista de recursos segue `decideEntitlementsWrite`, mais simples porque o resumo é sempre a lista inteira:
nada gravado ou instante gravado ilegível, aplica; `event.created` anterior ao `lastEventAt` gravado, ignora;
igual ou posterior, aplica. Dois resumos no mesmo segundo ficam com o último entregue. Se a listagem da
Stripe falha no caso `has_more`, a rota responde 500 sem marcar o evento e a Stripe reentrega. O log
`webhook-entitlements-reconciled` leva o resultado e a contagem de recursos, nunca os `lookup_key`.

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

## Acesso por plano

A API decide; a tela só antecipa a decisão com os dados que a API calculou. A regra pede as duas coisas, e a
negação vence:

| Cobrança ligada | Assinatura viva | Recurso pedido | Recurso no perfil | Resultado |
|-----------------|-----------------|----------------|-------------------|-----------|
| não | qualquer | qualquer | qualquer | passa |
| sim | não | qualquer | qualquer | 403 `PLAN_SUBSCRIPTION_REQUIRED` |
| sim | sim | nenhum | qualquer | passa |
| sim | sim | `X` | não | 403 `PLAN_FEATURE_REQUIRED` |
| sim | sim | `X` | sim | passa |

"Assinatura viva" é `LIVE_SUBSCRIPTION_STATUSES` (`active`, `trialing`, `past_due`, `unpaid`, `paused`): o
gate não bloqueia inadimplência, que fica a critério de cada fork. Status e recursos chegam em eventos
diferentes, e a conjunção cobre a janela entre eles: quem cancelou perde o acesso assim que o status cai,
mesmo com a lista de recursos ainda gravada. Logo depois do checkout, o gate por recurso nega por alguns
segundos, até o evento de recursos chegar.

- **API:** `requirePlanApi(requirement, handler)` em `apps/api/app/(guards)/plan.ts` compõe
  `requireCommonPanelApi`. `requirement` é `{}` (só assinatura viva), `{ feature: "<lookup_key>" }`, `null`
  (sem gate) ou uma função que devolve um desses, avaliada a cada requisição. A escrita personificada continua
  recusada como `AUTH_REQUEST_IMPERSONATION_READ_ONLY` antes de o plano ser olhado. Para uma checagem no meio
  do handler, `refusePlanAccess(profile, requirement)` devolve a `Response` 403 ou `null`.
- **Conta:** `GET /account` e `PUT /account` devolvem `planAccess` (`enforced`, `subscribed`, `features`),
  calculado a cada requisição sem chamar a Stripe. `enforced` é `isBillingEnabled()`.
- **App:** `<PlanGate requirement={...} loadingFallback={...}>` em `apps/app/shared/components/ui/PlanGate.tsx`
  lê a conta com `useMyAccount` e, negado, troca o conteúdo por um convite traduzido com link para
  `/<locale>/account?tab=billing`. Se a conta não carrega, mostra o conteúdo: a API recusa de qualquer jeito e
  o código chega traduzido no toast.
- **Demonstração:** `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE`, com o mesmo valor na `apps/api` e na `apps/app`,
  coloca a criação de `entity` (`POST /entities` e `/entities/create`) atrás desse recurso. Vazia, o CRUD é o
  de sempre e a tela nem monta o `PlanGate`. Na `apps/app` o valor entra no build.
- **Recursos na Stripe:** cada recurso é cadastrado em Product catalog → Features com o `lookup_key` que o
  código pede, e ligado aos produtos que o incluem. Recurso ligado a um produto só vale para quem já assina
  a partir do próximo ciclo (comportamento documentado pela Stripe). Fork que não cadastra recursos usa só o
  gate por status: o gate por recurso nega todo mundo, porque a lista fica vazia.

## Exclusão e exportação de conta

- O passo `billing` do expurgo roda **primeiro**. Com assinatura viva, cancela na Stripe
  (`subscriptions.cancel`, imediato, sem reembolso proporcional); assinatura que a Stripe já não tem conta
  como feita. Se o cancelamento falhar, ou se a Stripe estiver desligada com assinatura viva gravada, nada
  é apagado e `POST /account/deletion` responde 503 `ACCOUNT_DELETION_BILLING_FAILED`.
- O arquivamento de usuário pelo admin (`DELETE /users/[id]`) segue a mesma regra antes do soft delete: com
  assinatura viva, cancela na hora; assinatura que a Stripe já não tem conta como cancelada. Se o
  cancelamento falhar, ou se a Stripe estiver desligada com assinatura viva gravada, o usuário não é
  arquivado e a rota responde 503 `USERS_DELETE_BILLING_FAILED`. Sem assinatura viva, a Stripe não é
  chamada.
- A exportação leva `account.subscription`, `account.entitlements` e `account.stripeCustomerId`, com `null`
  quando não existem. `planAccess` fica fora: descreve o ambiente, não um dado do titular.

## Troca de e-mail do titular

A troca de e-mail (`POST /account/email` e a confirmação pelo link) muda só o endereço do Firebase Auth. O
`customer` da Stripe guarda o e-mail com que foi criado no primeiro checkout
(`ensureStripeCustomer` em `apps/api/(shared)/lib/billing.ts`) e nada o atualiza depois: recibos e avisos
de cobrança seguem para o endereço antigo. O titular muda o endereço de cobrança pelo Customer Portal,
desde que o portal esteja configurado para permitir a edição dos dados do cliente (ver
`docs/PRE-PRODUCTION.md` §12).

## Fora do corte

Trial, cupom, downgrade proporcional, reembolso e faturas em UI própria; MRR, churn e receita líquida de
reembolso no resumo do admin; importar faturas anteriores ao cadastro de `invoice.paid`; bloquear acesso em
`past_due`, `unpaid` ou `paused`; cotas, metering e créditos; assento por membro; tela de administração de
recursos por plano; cobrança por organização; nome e descrição de plano traduzidos (vêm da
Stripe num idioma só).

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
