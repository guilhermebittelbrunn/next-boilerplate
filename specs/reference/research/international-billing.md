---
topic: international-billing
question: Vale o core oferecer, desligado por padrão, imposto automático (Stripe Tax), preço do mesmo plano em várias moedas e formas de pagamento locais (Pix, Boleto, SEPA) na assinatura Stripe que já existe?
lens: produto
panel: [next-forge, supastarter, makerkit, shipfast, open-saas]
reference: [stripe-docs, lemon-squeezy, stripe-managed-payments, vercel-docs]
collected: 2026-11-25
revalidate_after: 2027-02-25
confidence: média
---

# Cobrança internacional na assinatura Stripe: imposto, moeda e formas de pagamento

## Resposta curta

Nenhum dos cinco starters do painel liga Stripe Tax, preço em várias moedas ou forma de pagamento local por
padrão. Quatro deles resolvem o imposto internacional de outro jeito: oferecem um provedor que é merchant of
record (MoR) ao lado da Stripe. Isso rebaixa o valor de uma spec de cobrança internacional para médio.

Três achados da documentação da Stripe mudam o corte pedido:

1. **Stripe Tax não atende empresa sediada no Brasil**, e não calcula imposto para cliente no Brasil. O Brasil
   não aparece na tabela de países da Stripe Tax nem como local da empresa nem como local do cliente.
2. **O `tax_id_collection` do Checkout não coleta CNPJ nem CPF.** A lista de tipos aceitos não tem nenhum tipo
   `br_*`. Quem coleta CPF/CNPJ no Checkout é o próprio fluxo do Boleto e do Pix.
3. **Pagamento assíncrono muda o retorno do Checkout.** No Boleto, a Stripe manda a pessoa para a página do
   boleto, não para o `success_url`. E a assinatura com método de confirmação adiada pode ficar `incomplete` ou
   já nascer `active` antes de o dinheiro entrar, dependendo do método.

Corte recomendado: a fatia de formas de pagamento (correção do fluxo assíncrono) primeiro, porque protege
qualquer fork brasileiro que ligar Boleto ou Pix no Dashboard; depois moeda por região com `currency_options`;
Stripe Tax por último e só para fork com empresa num país atendido.

## Prevalência

Painel de cinco starters, verificado na página de documentação de pagamentos de cada um em 2026-11-25. O
critério é "entrega por padrão, configurado no código".

| Referência | Stripe Tax ligado | Preço em várias moedas | Forma de pagamento local | Provedor MoR como alternativa | Fonte |
|---|---|---|---|---|---|
| next-forge | não mencionado | não mencionado | não mencionado | não (só Stripe) | https://www.next-forge.com/docs/packages/payments |
| Supastarter | não mencionado | não mencionado | não mencionado | sim (Lemon Squeezy, Creem, Polar, Dodo Payments; a página não diz quais são MoR) | https://supastarter.dev/docs/nextjs/payments/overview |
| Makerkit | não: a página diz "You handle (or use Stripe Tax)" | não mencionado | não mencionado | sim (Lemon Squeezy e Paddle, descritos como MoR) | https://makerkit.dev/docs/next-supabase-turbo/billing/overview |
| ShipFast | não mencionado | não mencionado | não mencionado | sim (logo do Lemon Squeezy; a página só documenta a Stripe) | https://shipfa.st/docs/features/payments |
| Open SaaS | não mencionado | não mencionado | não mencionado | sim (Lemon Squeezy, Polar e Paddle, descritos como MoR) | https://docs.opensaas.sh/guides/payment-integrations/ |

- Stripe Tax ligado por padrão: **0 de 5**. Makerkit é o único que cita a Stripe Tax, como opção do fork.
- Preço em várias moedas: **0 de 5**.
- Forma de pagamento local configurada: **0 de 5**.
- Provedor MoR como caminho para imposto internacional: **4 de 5** (next-forge é a exceção).
- "Não mencionado" quer dizer que a página de documentação não fala do assunto. Não li o código-fonte dos
  starters pagos, então não dá para afirmar que o código não liga `automatic_tax`.

## O que o mercado trata como o mínimo

Para cobrança internacional, o mínimo dos starters é **não fazer nada além do checkout em uma moeda** e
delegar imposto a um MoR quando o produto precisa. Como o pacote de pagamentos deste repo encapsula só a Stripe
([`docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md), seção de pacotes e tabela da stack), o insumo do corte
vem da documentação da Stripe, não da prevalência:

- **Imposto.** `automatic_tax[enabled]=true` na sessão. Para cliente já existente, o Checkout usa o endereço de
  entrega, depois o de cobrança; `billing_address_collection=required` força a coleta e
  `customer_update[address]=auto` grava no cliente o endereço digitado. A Stripe só recolhe imposto onde a conta
  tem cadastro fiscal ativo (Tax > Registrations).
- **ID fiscal.** `tax_id_collection[enabled]=true` mostra o campo conforme o país do cliente; com cliente
  existente, `customer_update[name]=auto` grava o nome da empresa. O Checkout grava o ID em `customer.tax_ids` e
  o devolve em `customer_details.tax_ids` no `checkout.session.completed`. A Stripe só confere o formato no
  Checkout; a validação contra base do governo é assíncrona e existe para ABN, VAT da UE e VAT do Reino Unido,
  com o evento `customer.tax_id.updated`.
- **Moeda.** Duas formas, comparadas abaixo.
- **Pagamento assíncrono.** Para Boleto no Checkout, a Stripe documenta três eventos: `checkout.session.completed`
  (boleto gerado, ainda não pago), `checkout.session.async_payment_succeeded` (pago) e
  `checkout.session.async_payment_failed` (venceu).

### `currency_options` × Adaptive Pricing

| | `currency_options` (preço manual por moeda) | Adaptive Pricing |
|---|---|---|
| Quem define o valor | O fork, por moeda, no Dashboard ou na API | A Stripe, com câmbio em tempo real |
| Escolha da moeda | Automática pela localização do cliente, ou forçada pelo parâmetro `currency` da sessão | Automática, por "machine learning" segundo a Stripe |
| Assinatura | Funciona; a renovação cobra o valor fixo da moeda | Só assinatura nova e "cross-border"; cada ciclo usa o câmbio do momento; a faixa de estabilidade de pelo menos 4% é sob pedido |
| Formas de pagamento | As que a moeda aceita (iDEAL em EUR, Pix em BRL) | Em assinatura cross-border, só cartão, Link, Apple Pay e Google Pay |
| Custo | Tarifas normais da Stripe, mais conversão quando houver | 0% para o fork; o cliente paga 2% a 4% embutidos no câmbio |
| A landing consegue mostrar o preço local? | Sim: o valor está no `Price` (o campo `currency_options` só vem com `expand`) | Não confirmado: não achei API para consultar o preço convertido antes do Checkout |
| Convivência | `currency_options` vence o Adaptive Pricing para as moedas que define | Converte para as demais moedas |
| Requisito | Toda sessão com Stripe Tax precisa de `tax_behavior` para cada moeda | O preço base tem de estar numa moeda de liquidação da conta |

A Stripe recomenda o Adaptive Pricing na página de preços manuais ("to reduce currency exchange rate fluctuation
risk"). Para este core, o problema dele é a landing: a `/pricing` mostra um valor e o Checkout cobra outro. O
`currency_options` deixa landing, aba de cobrança e Checkout com o mesmo número, e é o único dos dois que
habilita Pix e Boleto em BRL para um fork cujo preço base está em USD. Recomendação: `currency_options` no core;
Adaptive Pricing documentado como chave do Dashboard que o fork pode ligar sem código.

Limite que vale para os dois: a Stripe prende o cliente a uma moeda enquanto ele tiver assinatura ativa, e não há
como ter duas assinaturas ativas em moedas diferentes no mesmo cliente
([nota de suporte](https://support.stripe.com/questions/why-are-customers-locked-to-a-specific-currency-and-can-not-be-moved-to-a-price-in-another-currency)).

### Formas de pagamento em assinatura

Pela matriz de suporte da Stripe e pela página de cada método (lidas em 2026-11-25):

| Método | Assinatura (Billing) | Checkout em modo `subscription` | Onde a empresa pode estar | Observação |
|---|---|---|---|---|
| Cartão | sim | sim | quase todos | confirmação imediata |
| Link | sim | sim | quase todos | a nota 6 da matriz diz que o Payment Element não aceita Link no Brasil; o Checkout não tem essa nota |
| Apple Pay / Google Pay | sim | sim | quase todos | Google Pay com Stripe Tax no Checkout exige endereço de entrega |
| SEPA Direct Debit | sim | sim | UE, AU, CA, HK, JP, MX, NZ, SG, US | moeda EUR; confirmação adiada |
| ACH Direct Debit | sim | sim | US | confirmação adiada |
| Boleto | sim | sim | **só BR** | só BRL, só cliente BR; confirmação em até 1 dia útil; boleto vence em 3 dias por padrão (0 a 60); sem reembolso e sem contestação; "off-session payments" não suportado |
| Pix | sim, via Pix Automático | sim, via Pix Automático | conflito entre páginas: a do Pix lista BR, US, CA, UE, GB, CH, NO, AU, SG; a matriz diz "BR (Invite only), US" | só BRL, só cliente BR; cobrança recorrente com aviso do banco 3 dias antes; o mandato tem teto (padrão 400 BRL); cliente pode revogar no banco (`mandate.updated`); IOF de 3,5% para empresa fora do Brasil |
| OXXO, Konbini, iDEAL, Bancontact e outros | variam | vários marcados "não suportado no Checkout em modo de assinatura" ou "só `send_invoice`" | variam | fora do corte |

Status da assinatura com método de confirmação adiada (página "Como funcionam as assinaturas"): com
`charge_automatically`, a assinatura nasce `incomplete` e tem 23 horas para receber o primeiro pagamento,
depois vira `incomplete_expired`. A mesma página diz que, com métodos de confirmação adiada como ACH, a
assinatura "pode passar diretamente para `active`" com o PaymentIntent em `processing`, e cai para `past_due` se
o pagamento falhar depois. **Não confirmado**: qual dos dois comportamentos o Boleto e o Pix produzem no Checkout
em modo de assinatura, e como a janela de 23 horas convive com o vencimento de 3 dias do boleto. Isso precisa ser
medido na sandbox (a Stripe oferece e-mails de teste como `succeed_immediately@` e `expire_with_delay@`).

## O que é opcional / avançado

- **Nota fiscal brasileira.** Nenhum recurso da Stripe lido aqui emite NF-e ou NFS-e. Depende de provedor externo
  (eNotas, NFE.io, Focus NFe e outros, não avaliados nesta nota), do município e do regime tributário de cada
  fork. Para SaaS o documento costuma ser a NFS-e (serviço), não a NF-e (mercadoria); confirmar com o contador do
  fork.
- **Stripe Tax "padrão ligado" no Checkout**: em preview e só para pagamento avulso
  (https://docs.stripe.com/tax/checkout/page).
- **Faixa de estabilidade do Adaptive Pricing em assinatura**: sob pedido à Stripe.
- **Seletor de moeda na landing**: nenhuma referência do painel tem.

## Obrigações e requisitos externos

- **Stripe Tax só recolhe onde há cadastro.** "O Stripe Tax recolhe imposto apenas nas jurisdições em que você tem
  um cadastro ativo" (https://docs.stripe.com/tax/checkout/page). O cadastro na autoridade fiscal é do fork.
- **Brasil fora da Stripe Tax.** Tabela de países em https://docs.stripe.com/tax/supported-countries (lida em
  2026-11-25): BR não aparece. México é o único país da América Latina listado como local de empresa.
- **IOF no Pix cross-border.** 3,5% cobrado do cliente brasileiro que paga empresa de fora, por padrão; o fork
  pode absorver com `amount_includes_iof=always` (https://docs.stripe.com/payments/pix).
- **Boleto exige empresa no Brasil** e não tem reembolso (https://docs.stripe.com/payments/boleto).
- **LGPD**: endereço de cobrança e ID fiscal passam a ser dados pessoais tratados pela Stripe em nome do fork; o
  registro de operações do fork (`docs/ROPA.md`) e a lista de suboperadores (`docs/SUBPROCESSORS.md`) precisam
  citar essas categorias.

## Armadilhas conhecidas

- **Preço do card da assinatura na moeda errada.** Com `currency_options`, o `Price` continua com a moeda e o valor
  padrão; a moeda cobrada fica na assinatura. Código que lê `price.currency` e `price.unit_amount` mostra o valor
  da moeda padrão para quem paga em outra.
- **Adaptive Pricing esconde a moeda local.** A sessão e o PaymentIntent ficam na moeda do preço; a moeda local só
  aparece em `presentment_details`.
- **Imposto contado como receita.** Com imposto por fora do preço, o `amount_paid` da fatura inclui o imposto.
- **Boleto não volta para o `success_url`.** A pessoa vai para a página do boleto, e qualquer espera "volte e
  confira" baseada no retorno não roda.
- **Pix Automático tem teto.** Cobrança acima do valor do mandato falha; troca de plano para cima pode exigir novo
  mandato.
- **Lemon Squeezy deixou de aceitar cadastro.** A página de preços diz que o serviço "is no longer accepting new
  sign-ups and will shut down on March 31, 2027" (https://www.lemonsqueezy.com/pricing). Starter que oferece
  Lemon Squeezy como MoR carrega um provedor em fim de vida.

## Custo herdado por todo fork

- **Com as três fatias desligadas: zero.** Nenhuma dependência nova; as opções são parâmetros da sessão do
  Checkout que já existe.
- **Stripe Tax ligado**: 0,5% por transação onde o fork tem cadastro, na integração low-code (Checkout e Billing);
  US$ 0,50 por transação na integração por API. Sem taxa de adesão. Preço do "Tax Complete" não publicado
  (https://stripe.com/tax/pricing).
- **Adaptive Pricing**: 0% para o fork, 2% a 4% para o cliente.
- **Formas de pagamento locais**: tarifa por método na página de preços da Stripe; não levantada aqui.

## MoR como alternativa (por que não entra no core)

Merchant of record vende em nome do fork e assume imposto, fraude e contestação. As opções vistas:

| Provedor | Situação em 2026-11-25 | Fonte |
|---|---|---|
| Lemon Squeezy | sem novos cadastros, encerra em 2027-03-31; 5% + 50¢ por transação | https://www.lemonsqueezy.com/pricing |
| Stripe Managed Payments | MoR da própria Stripe, só produto digital, só via Checkout ou Payment Links; empresa precisa estar em CA, US, UE, GB, CH, NO, LI, AU, HK, JP ou SG. **Brasil não está na lista.** Tarifa não publicada na documentação lida | https://docs.stripe.com/payments/managed-payments/eligibility |
| Paddle, Polar | citados como MoR pelo Open SaaS e pelo Makerkit; não li a documentação deles | ver tabela de prevalência |

Não entra no core porque troca o provedor de cobrança inteiro (catálogo, webhook, portal, exportação), e o core só
integra a Stripe. O Managed Payments é a exceção que usa o mesmo Checkout, mas não atende fork com empresa no Brasil.
Fica como nota no `docs/PAYMENTS.md` para o fork que vende produto digital a partir de um país atendido.

## Fontes

- https://docs.stripe.com/tax/checkout — Stripe Tax no Checkout, inclusive assinatura
- https://docs.stripe.com/tax/checkout/page — `automatic_tax`, ordem de endereços, `billing_address_collection`, `customer_update`, cadastro fiscal
- https://docs.stripe.com/tax/checkout/tax-ids — `tax_id_collection`, tipos aceitos (sem `br_*`), validação, `customer.tax_id.updated`
- https://docs.stripe.com/tax/supported-countries — países da Stripe Tax (sem BR)
- https://stripe.com/tax/pricing — 0,5% low-code, US$ 0,50 por API
- https://docs.stripe.com/payments/checkout/localize-prices/manual-currency-prices.md?payment-ui=stripe-hosted — `currency_options`, parâmetro `currency`, `tax_behavior` por moeda, limitações
- https://docs.stripe.com/payments/currencies/localize-prices/adaptive-pricing.md?payment-ui=stripe-hosted — Adaptive Pricing, métodos em assinatura cross-border, `presentment_details`, 2% a 4%
- https://support.stripe.com/questions/adaptive-pricing-for-subscriptions — assinatura só nova e cross-border, câmbio a cada ciclo, faixa de estabilidade sob pedido
- https://support.stripe.com/questions/adaptive-pricing — tarifa; não lista países de empresa
- https://docs.stripe.com/api/prices/object — `currency_options` só com `expand`; `tax_behavior` imutável depois de definido
- https://support.stripe.com/questions/why-are-customers-locked-to-a-specific-currency-and-can-not-be-moved-to-a-price-in-another-currency — cliente preso a uma moeda
- https://docs.stripe.com/payments/payment-methods/payment-method-support — matriz por produto e por modo do Checkout
- https://docs.stripe.com/payments/pix — Pix, Pix Automático, IOF, países
- https://docs.stripe.com/payments/pix/pix-automatico — mandato, aviso de 3 dias, teto padrão de 400 BRL, retentativas
- https://docs.stripe.com/billing/subscriptions/pix.md?api-integration=checkout — assinatura Pix pelo Checkout, `mandate.updated`
- https://docs.stripe.com/payments/boleto — Boleto: só BR, confirmação em até 1 dia útil, sem reembolso
- https://docs.stripe.com/payments/boleto/accept-a-payment?payment-ui=checkout — não volta para o `success_url`; eventos `async_payment_*`; vencimento
- https://docs.stripe.com/billing/subscriptions/overview — status `incomplete` (23 h), confirmação adiada pode nascer `active`
- https://docs.stripe.com/payments/managed-payments e https://docs.stripe.com/payments/managed-payments/eligibility — MoR da Stripe, países
- https://www.lemonsqueezy.com/pricing — tarifa e encerramento
- https://vercel.com/docs/headers/request-headers — `x-vercel-ip-country` (país do IP do visitante)
- Starters: as cinco URLs da tabela de prevalência
