---
id: admin-billing-insights
title: Seção de billing na home do admin
status: proposed
value: médio
effort: M
audience: produto
area: [apps/app, apps/api, packages/sdk, packages/design-system, packages/internationalization]
mode: subscription
depends_on: [billing-subscription, dashboard-home]
contends_on: ["apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/(components)/AdminHomeClient.tsx", apps/app/shared/lib/queryKeys.ts, apps/api/app/(routes)/webhooks/payments/route.ts, apps/api/(shared)/repositories/user.repository.ts, firestore.indexes.json]
feature: -
updated: 2026-09-25
---

# Seção de billing na home do admin

## Problema

Um fork que cobra assinatura não tem, dentro do próprio produto, nenhuma leitura do que está vendendo.
Para saber quem assinou esta semana, qual plano sai mais e quanto entrou no mês, o operador abre o painel
da Stripe.

O painel da Stripe responde em termos de cliente e de cobrança, não em termos do produto: ele não sabe qual
usuário do fork é qual `customer`, nem o nome que o produto dá aos planos. Cruzar as duas coisas vira
trabalho manual, repetido toda semana, feito fora do sistema que tem a resposta.

## Por que esta spec está separada de [`admin-analytics-dashboard`](../docs/features/admin-analytics-dashboard/spec.md)

Porque, quando as duas foram escritas, a parte de billing não tinha sobre o que ser construída. Os KPIs de
atividade e o gráfico de acesso foram entregues pela PR #22; esta seção esperou
[`billing-subscription`](../docs/features/billing-subscription/spec.md).

**A dependência foi entregue.** `billing-subscription` saiu da fila com 6 de 6 itens do corte, pela PR #25
(merge `a1f87d0` em 2026-09-24, CI `success` nesse SHA), e está arquivada. A spec deixou de estar bloqueada.
O que a PR #25 **não** entregou, e que este corte precisa, está no fim da seção seguinte: é aí que mora o
trabalho desta spec.

## O que já existe no repo

Remedido em 2026-09-25, com o `HEAD` em `a1f87d0`.

**Cobrança, entregue pela PR #25:**

- **Rotas de pagamento do usuário comum**, todas sob `requireCommonPanelApi`:
  `apps/api/app/(routes)/payments/plans/route.ts:12`, `payments/checkout/route.ts:20` e
  `payments/portal/route.ts:14`. Nenhuma rota de billing existe sob `requireAdminApi`. A API tem hoje **29**
  `route.ts`.
- **Estado da assinatura no perfil.** `UserDTO` ganhou `stripeCustomerId` e `subscription`
  (`packages/sdk/src/types/user/user.ts:62-65`). O snapshot `SubscriptionState`
  (`packages/sdk/src/types/payments/payments.ts:30-44`) guarda `subscriptionId`, `status`, `priceId`,
  `productId`, `unitAmount`, `currency`, `interval`, `intervalCount`, `currentPeriodEnd`,
  `cancelAtPeriodEnd` e `lastEventAt`. `LIVE_SUBSCRIPTION_STATUSES` (`payments.ts:20-26`) define o que conta
  como assinatura viva.
- **Webhook que reconcilia.** `apps/api/app/(routes)/webhooks/payments/route.ts` verifica a assinatura com
  o corpo bruto (`:145-159`) e trata quatro eventos: `checkout.session.completed` vincula o cliente ao perfil
  (`:28-49`), e `customer.subscription.created|updated|deleted` gravam o snapshot (`:74-96`, `:107-111`).
  Qualquer outro evento cai em `webhook-unhandled-event` (`:113-117`). A gravação passa por
  `userRepository.applySubscriptionState`, numa transação (`apps/api/(shared)/repositories/user.repository.ts:71-104`),
  com uma regra que só deixa o snapshot andar para frente (`decideSubscriptionWrite`,
  `apps/api/(shared)/lib/billing-state.ts:130-165`).
- **Dedupe por `event.id`, resolvido.** `paymentEventRepository`
  (`apps/api/(shared)/repositories/payment-event.repository.ts:22-56`) grava um documento por evento, com o
  id do evento como id do documento, só depois de o handler terminar (`route.ts:161-167`). Uma entrega
  concorrente que já marcou o evento conta como o mesmo resultado (`:49-53`). Esta spec herda isso pronto.
- **Interruptor.** `isBillingEnabled()` (`apps/api/(shared)/lib/billing.ts:22-28`) exige modo
  `subscription`, as duas chaves Stripe e `NEXT_PUBLIC_APP_URL`. No app, `isSubscriptionMode()` já esconde a
  aba de billing (`AccountTabs.tsx:33-35`) e o item da barra lateral (`(common)/routes.tsx:52-58`).
- **Prova sem conta Stripe.** O `/test` de `billing-subscription` exercitou o webhook com chaves falsas no
  ambiente do processo, payload assinado localmente e o emulador do Firestore, e fechou 19 critérios assim
  (`docs/features/billing-subscription/test/report.md`, rodada B). O mesmo harness serve aqui.

**Peças da home, entregues por `dashboard-home`** (PR #19, merge `bfc4d8f`; spec arquivada em
[`docs/features/dashboard-home/spec.md`](../docs/features/dashboard-home/spec.md)):
`apps/app/shared/components/ui/MetricCard.tsx:11-17` (cartão de métrica com esqueleto),
`packages/design-system/components/ui/category-bar-chart.tsx:25-77` (gráfico de barras temático, com rótulo
acessível), `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/(components)/AdminHomeClient.tsx:34-56`
(o arranjo de cartões) e `apps/app/shared/lib/queryKeys.ts` (a factory de chaves). A rota
`apps/api/app/(routes)/users/summary/route.ts:6-20` é o molde de agregado sob `requireAdminApi`, com
degradação traduzível quando falta índice, e `BaseRepository.countQuery`
(`apps/api/(shared)/repositories/base.repository.ts:138-141`) conta sem ler documento.

**O que ainda falta para este corte**, item a item:

| item do corte | o que a base tem hoje | o que falta |
|---------------|-----------------------|-------------|
| Contratações recentes | O snapshot diz qual plano e qual situação, mas não **quando** a assinatura começou. `lastEventAt` muda a cada evento, e `toSubscriptionState` não copia o `start_date` da Stripe (`billing-state.ts:36-58`) | Um instante de ativação persistido |
| Planos mais vendidos | Dá para contar perfis com `subscription.status` vivo, agrupando por `subscription.priceId`. O snapshot não guarda o **nome** do plano: o nome só vem da Stripe, em `listPlans` (`billing.ts:50-67`, `toPlanDTO` em `billing-state.ts:61-86`), e o corte proíbe chamar a Stripe ao renderizar a home | Nome do plano disponível sem chamada síncrona à Stripe |
| Receita mensal | Nada. O snapshot tem o preço de tabela do plano (`unitAmount`), não o que foi cobrado. Nenhum evento de fatura é tratado, e `paymentEvent` guarda só `type`, `createdAt` e `expiresAt` (`payment-event.repository.ts:11-16`), com validade de 30 dias pensada para uma política de TTL opcional (`:7-8`). Não serve de fonte para agregado | Persistir o evento de cobrança com valor, moeda e instante |
| Tudo lido da base local, com dedupe | O dedupe existe | Nada além do que as linhas acima pedem |
| Estado vazio e i18n | O padrão de cartões e o gráfico existem | A seção nova |

O webhook ainda devolve o evento Stripe inteiro no corpo da resposta de sucesso (`route.ts:176`). É um
achado aberto no `BACKLOG.md` e fica no mesmo arquivo que esta spec vai alterar.

## Evidência de mercado

- Notas: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md) e
  [`research/compliance-trust-baseline.md`](research/compliance-trust-baseline.md) (ambas coletadas em
  2026-08-21, dentro da validade).

**O benchmark não sustenta esta spec.** Ele mede "Assinatura Stripe (checkout + portal)" em **9 em 10**, com
valor alto — mas isso é a dependência ([`billing-subscription`](../docs/features/billing-subscription/spec.md)), não este painel.
**Não existe linha** no levantamento para leitura de receita, MRR ou painel financeiro dentro do produto, e
não medi prevalência disso entre os starters. A linha de "Dashboard de métricas do produto" está em 3/10 e
trata de métricas de uso, não de dinheiro.

O que sustenta a spec é o problema de cruzamento descrito acima: o dado de cobrança fica no provedor e o
dado de usuário fica no fork, e ninguém junta os dois. O `value: médio` reflete que isso só importa depois
que o fork vende alguma coisa.

**O que a nota de conformidade impõe ao desenho**, e que é o ponto mais importante desta spec:

- **Dedupe por `event.id` é obrigatório**, porque a Stripe **não garante ordem nem entrega única**.
  Agregar receita a partir de webhook sem dedupe produz um número inflado, e inflado de forma silenciosa.
- **Verificação de assinatura com corpo bruto** e tolerância padrão, nunca zero.
- **Guardar apenas `cus_`/`pm_`/bandeira/últimos 4/validade** mantém o fork em SAQ A. Qualquer rota que
  aceite número de cartão joga para SAQ D. Um painel de receita não precisa de nada além de identificador,
  valor, moeda e instante.
- Confirmação de pagamento por `invoice.paid`, com tratamento de `requires_action` e
  `invoice.payment_action_required` (SCA/3DS).

## Proposta — corte de MVP

Cobre o item **e** inteiro do pedido: contratações recentes, planos mais vendidos e receita mensal.

- [ ] **Contratações recentes:** as últimas N ativações de assinatura, com usuário, plano e data, sob
      `requireAdminApi`.
- [ ] **Planos mais vendidos:** contagem de assinaturas ativas por plano, no gráfico de barras que já
      existe.
- [ ] **Receita mensal:** o valor do mês corrente, com a **moeda** e o **critério** ("faturado" ou
      "recebido") escritos na tela junto do número.
- [ ] Os três leem **dado persistido na base do próprio fork**, alimentado pelo webhook de pagamento **com
      dedupe por `event.id`**. Nada de chamar a Stripe de forma síncrona ao renderizar a home.
- [ ] Estado vazio para o fork que ainda não vendeu nada, e i18n nos 3 idiomas, com moeda e data formatadas
      por idioma.

### Reescopo que o `/analyze` deve aplicar (decisão do usuário em 2026-09-24)

A auditoria de 2026-09-24 mostrou que a entrega de `billing-subscription` grava o estado atual da
assinatura, mas não grava dois dos três dados que este corte exibe. O usuário escolheu como preencher essa
falta. Os cinco itens acima continuam valendo; o que muda é **de onde** cada número sai.

1. **Item 1 (contratações recentes): o snapshot de assinatura ganha o instante de ativação.** Ele é gravado
   na primeira vez que a assinatura entra num status vivo (`LIVE_SUBSCRIPTION_STATUSES`,
   `packages/sdk/src/types/payments/payments.ts:20-26`) e não muda nos eventos seguintes. `lastEventAt`
   (`payments.ts:43`) continua sendo o instante do último evento e não serve para isto. A escrita acontece
   dentro da transação que já aplica o snapshot (`apps/api/(shared)/repositories/user.repository.ts:72-100`)
   e respeita a regra de ordem de `decideSubscriptionWrite` (`apps/api/(shared)/lib/billing-state.ts:130`):
   um evento atrasado não pode apagar nem reescrever o instante de ativação. Perfil com assinatura gravada
   antes deste campo fica sem ele e não aparece na lista.
2. **Item 2 (planos mais vendidos): sem dado novo.** A contagem sai do `subscription.priceId` e do
   `subscription.status` que o perfil já guarda, contando só status vivos.
3. **Item 3 (receita do mês): coleção própria de faturas pagas, alimentada por `invoice.paid`.** O critério
   exibido na tela é "recebido". Cada fatura paga vira um registro com valor, moeda, instante do pagamento
   e o vínculo com o perfil, sem dado de cartão. A coleção **não tem TTL**: ela é histórico financeiro, ao
   contrário do `paymentEvent`, que expira em 30 dias e continua servindo só para idempotência
   (`apps/api/(shared)/repositories/payment-event.repository.ts:7-8`). A soma do mês é feita por moeda; se
   houver mais de uma, os valores aparecem separados.
4. **Item 4 (dedupe): o que existe basta.** O dedupe por `event.id` do webhook
   (`apps/api/app/(routes)/webhooks/payments/route.ts:161-167`) já cobre `invoice.paid`. Além disso, a
   fatura é gravada com a própria identidade da fatura, de modo que reprocessar o mesmo pagamento não gera
   segundo registro.
5. **A reconciliação que já funciona não muda.** `invoice.paid` entra como um caso novo no roteamento do
   webhook (`route.ts:98-119`), sem alterar os ramos de `customer.subscription.*` nem de
   `checkout.session.completed`. O endpoint da Stripe de cada fork passa a precisar desse evento, o que vai
   para o item 12 de `docs/PRE-PRODUCTION.md`.
6. **Exclusão de conta.** A fatura paga é registro financeiro, não dado de perfil. O `/analyze` decide entre
   manter o registro sem o vínculo com a pessoa ou apagá-lo no expurgo, e escreve a escolha na declaração do
   expurgo em `docs/PRE-PRODUCTION.md`, junto da linha `billing` que já existe.
7. **Verificabilidade.** Tudo se prova com o emulador e webhook assinado localmente
   (`generateTestHeaderString`), como na entrega de `billing-subscription`. Só a entrega real de
   `invoice.paid` pela Stripe fica 🔒.

> **Divergência da entrega (registrada no merge de 2026-09-25).** Este bloco foi escrito em outro workspace,
> em paralelo ao `/cycle` que implementou a spec, e só chegou a esta branch no merge com `main`. A entrega
> segue o bloco nos itens 2 a 5. Diverge em dois pontos, e a decisão de alinhar é do usuário:
>
> - **Item 1.** O instante de ativação não foi para o snapshot do perfil. Ele é gravado na coleção
>   `subscriptionActivation/<sub_id>`, criada uma vez na primeira fatura paga com
>   `billing_reason=subscription_create`, e não na primeira vez que a assinatura entra num status vivo.
>   Na prática, uma assinatura em `trialing` sem fatura paga não aparece como contratação.
> - **Item 3.** O registro de fatura paga não guarda o vínculo com o perfil. Ele guarda o `customerId`, e o
>   usuário é resolvido na leitura. Por isso o item 6 ficou resolvido como "manter o registro, sem dado de
>   pessoa", e a declaração do expurgo no `docs/PRE-PRODUCTION.md` diz isso.

### Fora do corte

- Coorte, churn, MRR, ARR e LTV. São definições contábeis que exigem acordo sobre o que conta como o quê, e
  errar nelas é pior do que não tê-las.
- Reembolso, disputa e chargeback refletidos no número.
- Nota fiscal, imposto e conciliação contábil.
- Previsão e comparação com período anterior.
- Detalhamento por usuário a partir do número, e exportação.
- Consolidação multimoeda. O corte **declara** a moeda; não converte.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Agregado de cobrança para o painel admin, sobre o contrato de `packages/sdk/src/types/payments/payments.ts`. |
| `apps/api` | Rota de agregado sob `requireAdminApi`; o webhook passa a persistir o evento de cobrança, reusando o dedupe de `paymentEvent` que já existe. |
| `apps/app` | Seção de billing no `AdminHomeClient`, com cartões e gráfico; chaves novas em `queryKeys.ts`. |
| `apps/web` | N/A. |
| `packages/*` | `design-system`: mais um consumidor do gráfico. i18n nos 3 idiomas, com formatação de moeda. |
| Infra/env | Nenhuma variável além das que `billing-subscription` já exige. Um evento a mais no endpoint da Stripe de cada fork. Provável índice composto para a agregação por período. |

## Riscos e trade-offs

- **Número de dinheiro na tela é um contrato de correção.** Uma receita que diverge da Stripe é pior que
  nenhuma receita, porque alguém vai tomar decisão em cima dela. O dedupe por `event.id` já existe
  (`payment-event.repository.ts`); o critério explícito na tela continua sendo desta spec. Mesmo com os dois,
  isto é um painel operacional e **não** substitui contabilidade. Vale escrever isso na tela.
- **Evento novo no endpoint de cada fork.** O `docs/PRE-PRODUCTION.md` §12 manda registrar exatamente quatro
  eventos no endpoint da Stripe. Receita confirmada por `invoice.paid` exige um quinto, e o fork que não
  atualizar o endpoint vê receita zero sem erro nenhum. A instrução do §12 precisa mudar junto.
- **Receita só existe a partir da entrega.** Webhook não traz histórico. Um fork que já vende quando esta
  spec chegar começa a contar do zero, a não ser que alguém importe as faturas antigas pela API da Stripe.
  Importação está fora do corte; o estado vazio precisa dizer desde quando o número conta.
- **Perfil apagado some da conta.** `findByStripeCustomerId` ignora perfil com `deletedAt`
  (`user.repository.ts:50-61`), e o soft delete pelo admin não cancela a assinatura
  (`users/[id]/route.ts:117`, achado no `BACKLOG.md`). Uma fatura paga por um cliente cujo perfil foi
  apagado pelo admin chega, não acha dono e não entra na receita, embora o dinheiro tenha entrado.
- **Nome do plano num idioma só.** Nome e descrição vêm do produto na Stripe, no idioma em que foram escritos
  (decisão P8 de `billing-subscription`). O gráfico de planos herda isso.
- **Verificação.** Quase tudo se prova sem conta Stripe, com o harness de payload assinado e o emulador que
  `billing-subscription` usou. Fica 🔒 só a entrega real de `invoice.paid` pela Stripe.
- **Multimoeda quebra a soma.** O snapshot já registra a moeda por assinatura (`payments.ts:37`). Um fork
  que venda em mais de uma moeda não pode somar valores sem conversão, e conversão está fora do corte. A
  saída é declarar a moeda e, havendo mais de uma, mostrar separado em vez de somar errado.
- **Índice composto de novo.** Agregar por mês ou contar por plano e situação provavelmente pede índice, e a
  fila de índices versionados e não publicados tem **seis** entradas (`docs/PRE-PRODUCTION.md` §1.1, §1.2,
  §1.5 e §1.7), recontadas em 2026-09-24.
- **Modo de produto.** `mode: subscription`: um fork `simple` não instala isto, e a seção precisa sumir
  inteira em vez de mostrar zeros. `isBillingEnabled()` (`billing.ts:22-28`) é o interruptor que já existe.

## Sinais de pronto

- O admin abre a home e vê quem assinou recentemente, qual plano vende mais e quanto entrou no mês.
- Cada número traz a moeda e o critério ao lado.
- Reentregar o mesmo evento de webhook não altera a receita exibida.
- Um fork sem nenhuma assinatura vê estado vazio com orientação, não uma seção de zeros.
- Um fork em `mode: simple` não vê a seção.
- A home não fica mais lenta nem quebra quando a Stripe está fora do ar, porque a leitura é da base local.

## Perguntas em aberto

- ~~Receita "faturada" ou "recebida"?~~ **Decidido em 2026-09-24:** recebida, confirmada por
  `invoice.paid`. Ver o reescopo acima.
- ~~A agregação sai de uma coleção própria ou de consulta à Stripe sob demanda?~~ **Decidido em
  2026-09-24:** coleção própria de faturas pagas, alimentada pelo webhook e sem TTL. Ver o reescopo acima.
- **Quem vê a seção: qualquer admin ou um papel separado?** — **recomendação:** qualquer admin no primeiro
  corte. Papel de finanças é problema de RBAC, que vive em
  [`teams-organizations`](teams-organizations.md), hoje `deferred`.
- **Quantas contratações recentes mostrar, e a partir de qual evento uma assinatura conta como "recente"?**
  — **recomendação:** as 5 últimas ativações, pelo instante em que a assinatura passou a ativa. Cinco cabe
  na home sem competir com o resto; a lista completa é assunto de uma tela própria, fora deste corte.
