---
id: international-billing
title: Cobrança internacional opcional (imposto, moeda por região e formas de pagamento)
status: proposed
value: médio
effort: G
audience: produto
area: [apps/api, apps/app, apps/web, packages/sdk, packages/shared, packages/internationalization]
mode: subscription
depends_on: []
contends_on: [apps/api/(shared)/lib/billing.ts, apps/api/(shared)/lib/billing-state.ts, apps/api/app/(routes)/webhooks/payments/route.ts, apps/api/env.ts]
feature: -
updated: 2026-11-27
---

# Cobrança internacional opcional (imposto, moeda por região e formas de pagamento)

> **Resumo**
> - **O quê:** três extensões opcionais da assinatura Stripe que já existe: imposto calculado pela Stripe Tax com
>   endereço e ID fiscal, o mesmo plano cobrado em várias moedas conforme a região do visitante, e tratamento
>   correto de Boleto, Pix e outros pagamentos que só confirmam depois.
> - **Por quê:** hoje o fork cobra numa moeda só, sem imposto, e quem paga com boleto fica sem estado na tela e
>   livre para abrir uma segunda assinatura enquanto o primeiro boleto não compensa.
> - **Status:** `proposed` · valor médio · esforço G · produto
> - **Próximo passo:** aguardando triagem; se aprovada, `/analyze international-billing` começando pela fatia 3

## Problema

Um fork que vende para fora do país, ou para empresas, esbarra em três limites do checkout atual.

O preço sai numa moeda só: o visitante da Europa vê "R$ 29,00" e paga em real, com a conversão e a tarifa do
cartão dele. O checkout não calcula imposto nem pede endereço ou ID fiscal, então o fork que precisa recolher VAT
ou sales tax faz isso à mão ou não faz. E a lista de formas de pagamento vem do Dashboard da Stripe, o que
significa que um fork brasileiro pode ligar Boleto ou Pix sem que o fluxo do core saiba lidar com um pagamento que
confirma dias depois: a pessoa não volta para a tela de confirmação, a aba de cobrança mostra os planos como se
nada tivesse acontecido, e um segundo checkout é aceito.

Se nada for feito, cada fork que vende fora do país, ou que liga um método assíncrono, refaz esse trecho sozinho,
no ponto mais sensível da cobrança.

## O que já existe no repo

- `apps/api/(shared)/lib/billing.ts:121-140` — `createCheckoutSession` abre o Checkout com `mode: "subscription"`,
  `customer`, um `line_item`, metadata e `locale: toStripeLocale(...)` (`:139`). Não passa `automatic_tax`,
  `tax_id_collection`, `billing_address_collection`, `customer_update`, `currency` nem `payment_method_types`. Sem
  `payment_method_types`, os métodos vêm da configuração do Dashboard.
- `apps/api/(shared)/lib/billing.ts:92-112` — o cliente Stripe nasce só com e-mail e `metadata.profileId`, sem
  endereço.
- `apps/api/(shared)/lib/billing.ts:52-68` — o catálogo lista preços recorrentes ativos com o produto expandido;
  as opções de moeda do preço não são pedidas.
- `apps/api/(shared)/lib/plan-catalog-cache.ts:19-37` — um catálogo em memória por processo, válido por uma hora,
  compartilhado por todos os visitantes da landing.
- `apps/api/(shared)/lib/billing-state.ts:38-60` — o estado da assinatura grava `unitAmount` e `currency` lidos do
  `Price` (`:50-51`), não da assinatura. Com preço em várias moedas, quem paga em outra moeda veria o valor da
  moeda padrão no card.
- `apps/api/(shared)/lib/billing-state.ts:107-127` — a fatura paga grava `amount_paid` (`:123`), que inclui imposto
  quando ele é cobrado por fora do preço.
- `apps/api/(shared)/lib/billing-summary.ts:36-58` — a receita do admin já soma por moeda, sem converter. A fatia 2
  não precisa mexer aqui.
- `apps/api/app/(routes)/webhooks/payments/route.ts:224-269` (era `:206-251` até a PR #78) — o webhook trata `checkout.session.completed` só para
  ligar o cliente ao perfil (`:230-233`), os três eventos de assinatura, `invoice.paid` e o resumo de recursos.
  `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
  `invoice.payment_failed` e `mandate.updated` caem no `default` e só viram log (`:245-249`).
- `apps/api/app/(routes)/payments/checkout/route.ts:39-46` — o checkout recusa só quem tem assinatura viva, e
  `LIVE_SUBSCRIPTION_STATUSES` (`packages/sdk/src/types/payments/payments.ts:20-26`) não inclui `incomplete`.
  Uma assinatura esperando o boleto não bloqueia um segundo checkout.
- `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useCheckoutConfirmation.tsx:5-30` — a
  aba de cobrança consulta a conta 10 vezes, a cada 3 s, depois da volta com `?checkout=success`. Com Boleto a
  Stripe não manda a pessoa de volta para o `success_url`, então essa espera nunca começa.
- `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountBillingPanel.tsx:39-48` — a
  aba distingue `past_due`/`unpaid` (aviso de pagamento) e assinatura viva; `incomplete` não tem estado próprio.
- `packages/shared/utils/helpers/formatPlanPrice.ts:16-37` — formata o valor no idioma da página e já respeita moeda
  sem casas decimais. Serve à fatia 2 sem mudança de regra.
- `apps/web/app/[locale]/pricing/components/plan-card.tsx:34` — o card da landing formata o preço do catálogo no
  idioma da rota. `docs/PAYMENTS.md:80-81` documenta que o preço sai na moeda do `Price` ("R$29.00 / month" em
  `/en/pricing`).
- `apps/api/(shared)/lib/account-export.ts:58-77` — a exportação leva `stripeCustomerId` e `subscription`. Endereço
  e ID fiscal não existem no perfil hoje.
- `apps/api/env.ts:30` e `:46` — o padrão de recurso opcional ligado por variável já existe
  (`EMAIL_LINK_SIGN_IN_ENABLED`, `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED`).
- `docs/PRE-PRODUCTION.md:666-683` (era `:586-603` até a PR #78) — o risco aceito de assinatura duplicada assume uma janela de segundos (duas
  abas antes do webhook). Com boleto, a janela passa a ser de dias.
- **Lacuna:** não há imposto, ID fiscal nem endereço no checkout; não há preço em outra moeda; e o fluxo não
  conhece pagamento pendente.

**Relação com outras specs.** Estende o que [`billing-subscription`](../../docs/features/billing-subscription/spec.md)
entregou (checkout, webhook, portal) e o risco "Moeda e idioma" que
[`pricing-page-catalog`](../../docs/features/pricing-page-catalog/spec.md) deixou escrito (`:126`). Não muda a regra
de [`plan-entitlements`](../../docs/features/plan-entitlements/spec.md): o gate continua olhando o status. Disputa
os mesmos arquivos de [`one-time-purchase`](one-time-purchase.md) (deferred), sem dependência de ordem; se as duas
andarem juntas, uma espera a outra.

## Evidência de mercado

- Nota: [`reference/research/international-billing.md`](../reference/research/international-billing.md)
- Prevalência: **0 de 5** starters (next-forge, Supastarter, Makerkit, ShipFast, Open SaaS) ligam Stripe Tax, preço
  em várias moedas ou método de pagamento local por padrão. **4 de 5** resolvem imposto internacional oferecendo um
  provedor merchant of record ao lado da Stripe. É uma aposta, não um padrão, e por isso o valor é médio.
- O que pesa a favor vem da Stripe, não dos starters: imposto, ID fiscal e moeda são parâmetros da mesma sessão de
  Checkout que o core já cria, e Boleto e Pix aparecem no Checkout de assinatura assim que o fork os liga no
  Dashboard, com ou sem o core estar pronto para eles.
- Três fatos que limitam o corte:
  1. A Stripe Tax não atende empresa sediada no Brasil nem calcula imposto para cliente no Brasil
     (https://docs.stripe.com/tax/supported-countries, lida em 2026-11-25).
  2. O `tax_id_collection` do Checkout não coleta CNPJ nem CPF; a lista de tipos não tem `br_*`
     (https://docs.stripe.com/tax/checkout/tax-ids). Boleto e Pix pedem CPF/CNPJ no próprio fluxo deles.
  3. Em assinatura "cross-border" com Adaptive Pricing, só cartão, Link, Apple Pay e Google Pay funcionam
     (https://docs.stripe.com/payments/currencies/localize-prices/adaptive-pricing.md?payment-ui=stripe-hosted).
- Fontes principais: https://docs.stripe.com/tax/checkout/page ·
  https://docs.stripe.com/payments/checkout/localize-prices/manual-currency-prices.md?payment-ui=stripe-hosted ·
  https://docs.stripe.com/payments/payment-methods/payment-method-support ·
  https://docs.stripe.com/billing/subscriptions/overview · https://docs.stripe.com/payments/boleto/accept-a-payment?payment-ui=checkout ·
  https://docs.stripe.com/billing/subscriptions/pix.md?api-integration=checkout

## Proposta — corte de MVP

Três fatias independentes, cada uma desligada por padrão e ligada por configuração do fork. Com tudo desligado, a
sessão de Checkout, a landing e a aba de cobrança ficam iguais às de hoje. Cada fatia cabe num `/analyze`
próprio; a ordem recomendada é 3, 2, 1 (ver "Perguntas em aberto").

### Fatia 1: impostos (Stripe Tax)

Serve ao fork cuja empresa está num país atendido pela Stripe Tax (EUA, UE, Reino Unido, Canadá, Austrália,
México e outros da tabela da Stripe). Para fork com empresa no Brasil, esta fatia não calcula nada.

- [ ] Com a opção ligada, o Checkout calcula o imposto pelo endereço do cliente, mostra o valor do imposto antes do
      pagamento e sempre pede endereço de cobrança, que fica gravado no cliente da Stripe.
- [ ] Com a opção ligada, quem compra como empresa informa o ID fiscal e o nome da empresa (nos tipos que o Checkout
      aceita, como VAT da UE e do Reino Unido), e os dois saem nas faturas da assinatura. A Stripe aplica a
      cobrança reversa quando a lei manda.
- [ ] O registro de fatura paga guarda o imposto separado do valor, e a receita do mês no admin não conta imposto
      como receita.
- [ ] Endereço e ID fiscal ficam na Stripe e não são copiados para o perfil. A exportação de dados continua como
      está, e `docs/PAYMENTS.md`, `docs/ROPA.md` e `docs/SUBPROCESSORS.md` passam a dizer que essas duas
      categorias vão para a Stripe e que o titular as vê e corrige no Customer Portal.
- [ ] `docs/PRE-PRODUCTION.md` §12 ganha os passos do fork: cadastro fiscal na Stripe, comportamento de imposto dos
      preços (incluso ou por fora, que não muda depois de definido), código fiscal do produto, custo da Stripe Tax e
      o aviso de que empresa no Brasil não é atendida.

### Fatia 2: moeda por região

- [ ] O fork cadastra outras moedas no mesmo preço da Stripe, e o catálogo da API devolve, por plano, as moedas e
      os valores disponíveis.
- [ ] Com a opção ligada, a moeda de cada visitante sai de uma regra configurável pelo fork: o país do visitante,
      quando a hospedagem informa, e o idioma da página quando não informa. Sem regra, ou sem a moeda no preço, vale
      a moeda padrão do preço, como hoje.
- [ ] A `/pricing` mostra o valor na moeda escolhida, e o Checkout cobra essa mesma moeda e esse mesmo valor: o que a
      landing promete é o que a Stripe cobra.
- [ ] A aba de cobrança lista os planos na mesma moeda, e o card da assinatura mostra a moeda e o valor realmente
      cobrados pela assinatura, não os da moeda padrão do preço.
- [ ] O catálogo continua lido da Stripe uma vez por hora por processo; a escolha da moeda acontece sobre o catálogo
      em cache e não multiplica chamadas à Stripe.
- [ ] `docs/PAYMENTS.md` explica o Adaptive Pricing como alternativa que o fork liga só no Dashboard, com o custo
      para o cliente (2% a 4%) e a consequência: a landing mostra um valor e o Checkout converte para outro.

### Fatia 3: formas de pagamento e pagamento assíncrono

- [ ] `docs/PAYMENTS.md` ganha a tabela dos métodos que funcionam no Checkout de assinatura, com o que cada um exige
      (país da empresa, moeda, convite da Stripe, configuração no Dashboard): cartão, Link, Apple Pay, Google Pay,
      SEPA, ACH, Boleto e Pix Automático. O core continua sem lista fixa de métodos; quem decide é o Dashboard.
- [ ] Uma assinatura esperando pagamento (boleto emitido, Pix aguardando autorização, débito em processamento)
      aparece na aba de cobrança como "pagamento pendente", com o caminho para concluir o pagamento quando a Stripe o
      fornecer, em vez da lista de planos para assinar de novo.
- [ ] O checkout recusa uma segunda assinatura enquanto existe uma pendente e ainda não expirada.
- [ ] O webhook reconhece os eventos de pagamento assíncrono (confirmação e falha do pagamento da sessão, falha de
      fatura) e o mandato do Pix revogado, atualiza o estado gravado e avisa o dono no sino quando o pagamento
      pendente é confirmado ou falha. A idempotência por evento continua a mesma.
- [ ] Quem paga com boleto e não volta pelo `success_url` encontra o estado pendente ao abrir a aba de cobrança de
      novo.
- [ ] `docs/PRE-PRODUCTION.md` §12 lista os eventos novos que o endpoint precisa assinar e o roteiro de teste na
      sandbox com os e-mails de teste da Stripe (pagamento imediato, pagamento atrasado, boleto vencido).

### Fora do corte

- **Nota fiscal brasileira (NF-e/NFS-e).** A Stripe não emite nota fiscal no Brasil. Emitir exige um provedor
  externo (eNotas, NFE.io, Focus NFe e outros), certificado digital, cadastro na prefeitura ou na Sefaz e regras que
  mudam com o município e o regime tributário de cada empresa (Simples, Lucro Presumido, MEI). Para SaaS o documento
  costuma ser a NFS-e, de serviço; isso precisa ser confirmado com o contador do fork. Nada disso é genérico o
  bastante para o core: o fork escuta `invoice.paid`, que o webhook já trata, e chama o provedor que escolheu.
- **Merchant of record.** Trocar a Stripe por um MoR muda catálogo, webhook, portal e exportação. O Lemon Squeezy
  não aceita cadastro novo e encerra em 2027-03-31, segundo a própria página de preços; o Stripe Managed Payments
  usa o mesmo Checkout, mas só atende produto digital e empresa fora do Brasil. Fica uma nota no `docs/PAYMENTS.md`.
- **Validação assíncrona do ID fiscal** (`customer.tax_id.updated`) e a decisão do que fazer com um VAT não
  verificado: depende da política fiscal de cada fork.
- **Imposto por alíquota manual** (tax rates): o preço por região deixa de funcionar com alíquota manual, segundo a
  Stripe, e a Stripe Tax cobre o caso.
- **Seletor de moeda na landing** e troca de moeda de uma assinatura existente: a Stripe prende o cliente a uma
  moeda enquanto houver assinatura ativa.
- **Métodos que só funcionam com `send_invoice`** (OXXO, Konbini, Multibanco, PromptPay e outros marcados assim na
  matriz da Stripe): mudariam o modo de cobrança da assinatura inteira.
- **Novo mandato do Pix na troca de plano para valor acima do teto.** A troca de plano é feita pelo portal; o
  core documenta o limite e o fork decide o teto do mandato.
- **Absorver o IOF do Pix** para empresa fora do Brasil: escolha comercial do fork, documentada na tabela de métodos.
- **Compra avulsa com Boleto ou Pix**: pertence a [`one-time-purchase`](one-time-purchase.md).

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Plano ganha as moedas disponíveis; estado da assinatura ganha a noção de pagamento pendente; fatura paga ganha o imposto separado. Sem recurso novo |
| `apps/api` | Sessão de Checkout com opções de imposto, ID fiscal, endereço e moeda conforme a configuração; catálogo com opções de moeda; estado da assinatura lido da moeda da assinatura; webhook com eventos assíncronos e mandato; checkout recusa assinatura pendente. Sem coleção nova |
| `apps/app` | Aba de cobrança: estado "pagamento pendente", planos na moeda escolhida, card com a moeda cobrada |
| `apps/web` | `/pricing` mostra o valor na moeda do visitante |
| `packages/*` | `@repo/shared`: escolha da moeda a partir de país e idioma, reaproveitada pela landing e pela app. `@repo/internationalization`: textos do estado pendente, do aviso no sino e dos erros novos, nos 3 idiomas. `@repo/payments`: nenhuma mudança prevista |
| Infra/env | Uma configuração por fatia, desligada por padrão. Eventos novos no endpoint de webhook. Na conta Stripe do fork: cadastro fiscal (fatia 1), moedas nos preços (fatia 2), métodos ligados no Dashboard (fatia 3) |

## Riscos e trade-offs

- **Custo que o fork herda só se ligar.** Stripe Tax custa 0,5% por transação onde o fork tem cadastro, na
  integração por Checkout (https://stripe.com/tax/pricing, lida em 2026-11-25). Com as fatias desligadas, custo zero:
  nenhuma dependência nova, nenhuma variável obrigatória.
- **A fatia 1 não serve a fork com empresa no Brasil**, que é o caso mais comum dos forks deste repo. Se nenhum fork
  previsto vende a partir de empresa no exterior, a fatia 1 pode sair do corte sem perder o resto.
- **Status do Boleto e do Pix na primeira fatura não está confirmado.** A Stripe documenta que, com método de
  confirmação adiada, a assinatura pode ficar `incomplete` (janela de 23 horas) ou nascer `active` com o pagamento
  em processamento. Qual dos dois acontece com Boleto e Pix no Checkout de assinatura, e como as 23 horas convivem
  com o boleto que vence em 3 dias, precisa ser medido na sandbox antes do plano. Se nascer `active`, o gate de
  plano libera acesso antes de o dinheiro entrar, porque hoje ele não bloqueia `past_due` (`docs/PAYMENTS.md:232`).
- **Elegibilidade do Pix não está clara.** A página do Pix lista o Brasil entre os países de empresa; a matriz de
  suporte diz "BR (Invite only), US". O fork confere no Dashboard antes de prometer Pix.
- **Landing por visitante.** Escolher a moeda pelo país do IP torna a `/pricing` dependente de cada requisição. A
  landing já busca o catálogo a cada render, mas qualquer cache de página precisa considerar o país.
- **Moeda presa ao cliente.** Quem assinou em BRL e cancelou pode assinar em USD depois, mas não ter duas assinaturas
  ativas em moedas diferentes. Com o checkout recusando assinatura viva, o core não chega a esse caso.
- **Preço com imposto incluso ou por fora** é definido por preço e por moeda, e não muda depois. Um fork que errar
  isso recria os preços.

## Sinais de pronto

- Com as três opções desligadas, a sessão de Checkout criada é idêntica à de hoje, e a landing e a aba de cobrança
  não mudam.
- Fatia 1: na sandbox, um cliente com endereço num país onde o fork tem cadastro vê a linha de imposto no Checkout;
  um VAT válido da UE aparece na fatura; a receita do admin soma o valor sem o imposto.
- Fatia 2: um visitante cujo país ou idioma mapeia para uma moeda cadastrada vê na `/pricing` o mesmo valor e a mesma
  moeda que o Checkout cobra; o card da assinatura mostra a moeda cobrada.
- Fatia 3: na sandbox com Boleto, a aba mostra "pagamento pendente" depois do checkout, um segundo checkout é
  recusado, e o vencimento ou a compensação do boleto mudam o estado e geram o aviso no sino.

## Perguntas em aberto

- **Ordem e corte.** Fazer as três fatias, uma por `/analyze`, na ordem 3, 2, 1? — **recomendação:** sim. A fatia 3
  corrige um risco que já existe para qualquer fork que ligar Boleto ou Pix no Dashboard; a 2 vem em seguida porque
  é ela que habilita BRL ao lado de USD; a 1 por último.
- **A fatia 3 precisa de chave?** — **recomendação:** não. Ela só reage a eventos e estados que aparecem quando o
  fork liga um método assíncrono no Dashboard; sem esses métodos, nada muda. Chave só nas fatias 1 e 2.
- **Stripe Tax ou cálculo próprio de imposto?** — **recomendação:** Stripe Tax. Cálculo próprio exige manter tabela
  de alíquotas por país e estado, que é o que a Stripe Tax e os MoR vendem. E manter a fatia 1 mesmo sem atender
  empresa no Brasil, desde que seja a última; se nenhum fork previsto vende de fora do Brasil, movê-la para "Fora do
  corte".
- **`currency_options` ou Adaptive Pricing?** — **recomendação:** `currency_options` no core. É o único dos dois em
  que a landing mostra o mesmo valor que o Checkout cobra, a renovação não oscila com o câmbio e Pix e Boleto
  funcionam em BRL. O Adaptive Pricing fica documentado como chave de Dashboard que o fork liga por conta própria.
- **Regra de escolha da moeda.** País do IP, idioma da página ou os dois? — **recomendação:** os dois, com o país
  primeiro quando a hospedagem informa (a Vercel manda o país do IP num header) e o idioma como reserva; o mapa
  país/idioma para moeda fica na configuração do fork. Seletor manual fica fora.
- **Acesso durante o pagamento pendente.** Liberar o produto antes de o boleto compensar? — **recomendação:** não
  mudar a regra do gate no core. `incomplete` já não libera acesso; se a medição na sandbox mostrar que Boleto ou Pix
  nascem `active`, documentar o comportamento e deixar a decisão para o fork, como já acontece com `past_due`.
- **Quais métodos documentar como suportados.** — **recomendação:** cartão, Link, Apple Pay, Google Pay, SEPA, ACH,
  Boleto e Pix Automático, com o Pix marcado "confirme a elegibilidade da conta no Dashboard" por causa do conflito
  entre as páginas da Stripe. Os métodos que só funcionam com `send_invoice` ficam listados como não suportados.
