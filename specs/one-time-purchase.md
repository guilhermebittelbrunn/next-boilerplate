---
id: one-time-purchase
title: Compra avulsa com acesso vitalício
status: deferred
value: médio
effort: M
audience: produto
area: [apps/api, apps/app, packages/sdk, packages/internationalization]
mode: subscription
depends_on: []
contends_on: [apps/api/(shared)/lib/billing.ts, apps/api/(shared)/lib/billing-state.ts, apps/api/(shared)/lib/plan-access.ts, apps/api/app/(routes)/webhooks/payments/route.ts, apps/api/(shared)/lib/account-export.ts, "apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountBillingPanel.tsx"]
feature: -
updated: 2026-10-16
---

# Compra avulsa com acesso vitalício

> **`deferred` em 2026-10-16 — motivo.** A spec altera todo o núcleo de cobrança (catálogo, estado da assinatura,
> gate por plano, webhook e exportação de dados) e nenhum fork pediu venda avulsa até agora. Volta para a fila
> quando um fork precisar cobrar uma vez. A pergunta do estorno (D9) fica aberta até lá.

## Problema

O fork só sabe vender assinatura. Um MVP que quer cobrar uma vez (acesso vitalício, um módulo extra, um pacote
fechado) não tem caminho: o preço avulso cadastrado na Stripe some da aba de cobrança e, se alguém tentar comprá-lo
pelo identificador, a API recusa. Para muitos MVPs, cobrar uma vez é a primeira forma de validar se alguém paga,
antes de decidir por recorrência.

Fazer isso por fora do core repete o trecho mais frágil da cobrança: confirmar o pagamento pelo webhook, uma vez só,
e só então liberar o acesso no servidor.

## O que já existe no repo

- `apps/api/(shared)/lib/billing.ts:52-68` — o catálogo lê só `type: "recurring"`; `billing.ts:130-140` abre o
  checkout só com `mode: "subscription"`.
- `apps/api/(shared)/lib/billing-state.ts:63-73` — `toPlanDTO` devolve `null` para preço avulso.
- `docs/PAYMENTS.md:165-166` — preço avulso pedido no checkout responde 404 `PAYMENTS_PLAN_NOT_FOUND`;
  `docs/PRE-PRODUCTION.md:513-516` avisa o fork de que preço avulso não aparece.
- `apps/api/app/(routes)/payments/checkout/route.ts:39-46` — o checkout recusa quem já tem assinatura viva. Uma
  compra avulsa não pode herdar essa recusa.
- `apps/api/app/(routes)/webhooks/payments/route.ts:194-232` — o webhook trata `checkout.session.completed` só para
  ligar o cliente ao perfil, e já tem idempotência por evento (`paymentEvent`).
- `apps/api/(shared)/lib/plan-access.ts:22-30` — o acesso por recurso vem só dos entitlements da assinatura; o
  `requirePlanApi` e o `PlanGate` da app consomem esse resultado.
- `apps/api/(shared)/lib/billing-summary.ts:128` — a receita do mês na home do admin soma faturas pagas
  (`paidInvoice`), que só a assinatura gera hoje.
- **Lacuna:** não há compra única, registro de compra nem acesso concedido por ela.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md), adendo de
  2026-10-16, seção "Pagamento avulso".
- Prevalência: **4 de 10** starters (Makerkit, desligado por padrão, com pedidos e assinaturas coexistindo desde a
  versão 2.12.0; Supastarter, com plano vitalício de exemplo; ShipFast; Open SaaS, como pacote de créditos). O
  starter de assinatura da Vercel não suporta e está arquivado.
- Provedor: o guia de fulfillment da Stripe exige webhook (`checkout.session.completed` e, para meio de pagamento
  com confirmação posterior, `checkout.session.async_payment_succeeded`) e entrega "only once per payment", porque
  a função pode ser chamada várias vezes, inclusive ao mesmo tempo.
- Fontes: <https://makerkit.dev/docs/next-supabase-turbo/billing/one-off-payments> ·
  <https://supastarter.dev/docs/nextjs/payments/plans> ·
  <https://docs.stripe.com/checkout/fulfillment.md?payment-ui=stripe-hosted> ·
  <https://docs.stripe.com/billing/entitlements.md?dashboard-or-api=api> (lidas em 2026-10-16).

## Proposta — corte de MVP

- [ ] Um preço avulso ativo na Stripe aparece na aba de cobrança como compra única, separado dos planos de
      assinatura, com nome, valor e recursos de marketing do produto.
- [ ] Comprar abre o checkout de pagamento único, mesmo para quem já tem assinatura viva.
- [ ] A compra é confirmada pelo webhook, inclusive quando o pagamento se confirma depois, e registrada uma vez só,
      mesmo com evento repetido ou simultâneo.
- [ ] A compra paga libera, para sempre, os recursos ligados ao produto, pelo mesmo controle de acesso por recurso
      que a assinatura usa: a API recusa o recurso a quem não comprou, e o `PlanGate` da app se comporta igual.
- [ ] A aba de cobrança lista as compras do usuário (produto, valor, data e situação).
- [ ] As compras entram na exportação de dados do titular e saem no expurgo da conta.

### Fora do corte

- **Créditos e consumo**: a lacuna "Metering / limites de uso / créditos" segue descartada; o pacote de créditos do
  Open SaaS é esse caso.
- **Carrinho com vários itens e compra junto com a assinatura** (o "mixed cart" da Stripe).
- **Compra sem conta** (cliente convidado da Stripe).
- **Cupom, nota fiscal e reembolso pela UI.** O reembolso feito no painel da Stripe é tratado na pergunta abaixo.
- **Receita avulsa na home do admin**: hoje a receita soma faturas; incluir compras avulsas é ajuste do
  `admin-billing-insights`, registrado como risco.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Tipo de produto avulso no catálogo, tipo de compra, ação de checkout avulso e de listagem das compras. |
| `apps/api` | Catálogo com preços avulsos, checkout de pagamento único, entrega idempotente no webhook, coleção de compras por dono e acesso por recurso que soma assinatura e compras. |
| `apps/app` | Seção de compras avulsas na aba de cobrança. |
| `apps/web` | Se [`pricing-page-catalog`](pricing-page-catalog.md) vier antes, a página pública passa a mostrar o produto avulso. |
| `packages/*` | i18n: textos da seção e `apiErrors` novos nos três idiomas. |
| Infra/env | Novos eventos no endpoint de webhook de cada fork (`PRE-PRODUCTION.md` §12) e um índice por dono. Nenhuma variável. |

## Riscos e trade-offs

- **De onde vem a lista de recursos de um produto avulso.** O Stripe Entitlements, que o repositório usa, é descrito
  sobre assinatura ("This guide assumes that you're already using Stripe Subscriptions"). Se ele concede recurso
  numa compra avulsa: **não confirmado**. O `/analyze` precisa escolher a fonte e mantê-la única; uma segunda lista
  de recursos dentro do código seria uma fonte a mais para divergir da Stripe.
- **Núcleo de cobrança.** A spec mexe no catálogo, no checkout, no webhook e no acesso por recurso, os mesmos
  arquivos de `billing-subscription` e `plan-entitlements`. Não roda em paralelo com nenhuma spec de cobrança.
- **Receita do admin.** Com compras avulsas, "recebido no mês" deixa de bater com o que a Stripe recebeu, porque só
  soma faturas. Precisa estar escrito na tela ou no `docs/PAYMENTS.md`.
- **Modo `simple`.** A cobrança só liga em modo assinatura (`billing.ts:24-30`). Um fork que só vende avulso precisa
  continuar em `subscription`; o nome do modo passa a enganar (E10).
- **Esforço.** M no limite de G, pelo número de arquivos de cobrança tocados.
- O `/test` prova com o SDK da Stripe simulado; a entrega real fica 🔒, como nas outras specs de cobrança.

## Sinais de pronto

- Com um catálogo de teste que tem um preço recorrente e um avulso, a aba de cobrança mostra os dois em seções
  separadas.
- Um evento simulado de compra paga, entregue duas vezes, gera um registro de compra só e libera o recurso do
  produto para o comprador.
- Um pagamento com confirmação posterior só libera o recurso no evento de confirmação.
- Uma rota protegida por recurso aceita quem comprou e recusa quem não comprou, com o código que a app já traduz.
- A exportação de dados traz as compras; a exclusão da conta apaga o registro local.

## Perguntas em aberto

- Um estorno feito no painel da Stripe deve retirar o acesso? — **recomendação:** sim, no corte, com mais um evento
  no endpoint do fork; sem isso, o acesso vitalício sobrevive ao dinheiro devolvido.
