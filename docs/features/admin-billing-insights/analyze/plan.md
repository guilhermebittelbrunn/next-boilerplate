# Plano: seção de billing na home do admin

Spec de origem: [`spec.md`](../spec.md) (arquivada em 2026-09-25; nasceu em `specs/admin-billing-insights.md`).
Plano feito numa rodada autônoma do `/cycle`, sem perguntas ao
usuário. Onde a spec decide, o plano segue a spec. Onde ela é omissa, segue o padrão do repo (`entity`,
`users/summary`, `users/activity-summary`). Onde a ambiguidade é real, escolhe o menor raio de impacto e
registra a escolha em [Perguntas em aberto](#perguntas-em-aberto).

Branch: nenhuma criada aqui. O checkout está em `admin-billing-insights`, fora do padrão
`<project>/<type>/<title>`; quem nomeia e cria a branch é o `revisor-codigo`, no `/review`.

Medido em 2026-09-25 com o `HEAD` em `a1f87d0`.

---

## Etapa 1. Análise

### 1. Contexto

**Resumo.** O admin abre a home e vê, abaixo do bloco de atividade, uma seção de cobrança com três leituras:
quanto foi recebido no mês corrente (por moeda, com o critério escrito ao lado), quais planos têm mais
assinaturas vigentes e quem contratou por último. Tudo sai de coleções locais que o webhook de pagamento
alimenta; a home nunca chama a Stripe.

**Objetivos (os cinco itens do corte da spec):**

| # | Item da spec | Onde é entregue |
|---|--------------|-----------------|
| C1 | Contratações recentes: últimas N ativações com usuário, plano e data, sob `requireAdminApi` | coleção `subscriptionActivation` (gravada por `invoice.paid` de `billing_reason = subscription_create`) + `GET /payments/summary` |
| C2 | Planos mais vendidos: assinaturas ativas por plano, no gráfico de barras existente | leitura de `user.subscription` + cache de nomes `planLabel` + `CategoryBarChart` |
| C3 | Receita mensal com moeda e critério ("recebido") na tela | coleção `paidInvoice` (gravada por `invoice.paid`), somada por moeda no mês UTC |
| C4 | Tudo lido da base do fork, alimentado pelo webhook com dedupe por `event.id` | dedupe existente em `paymentEvent` + chave natural por fatura e por assinatura |
| C5 | Estado vazio e i18n nos 3 idiomas, moeda e data por idioma | `BillingInsightsSection` + chaves em `translations/apps/app/pages/admin/home.ts` |

**As três lacunas que a auditoria registrou na spec, e como este plano fecha cada uma:**

| Lacuna | Resposta |
|--------|----------|
| (a) Nenhum instante de ativação gravado | A primeira fatura paga de uma assinatura (`billing_reason = subscription_create`) é o instante em que ela passou a ativa. O webhook grava um documento `subscriptionActivation/<sub_id>` com `status_transitions.paid_at`. Renovação (`subscription_cycle`) não conta, então um fork que já vendia não vê assinante antigo aparecer como contratação nova quando a renovação chegar. |
| (b) Nome do plano só vem da Stripe | O webhook, ao processar um evento que cita um `priceId`, garante um documento `planLabel/<price_id>` com nome do produto e intervalo. A busca na Stripe é best-effort (timeout curto, sem retry, nunca derruba o webhook) e o resultado fica em cache por 7 dias. A home só lê o cache; sem nome, mostra "Plano sem nome". |
| (c) Nenhum evento de fatura persistido; `paymentEvent` não serve de fonte | `invoice.paid` passa a ser tratado. Cada fatura vira um documento `paidInvoice/<in_id>` com valor pago, moeda e instante. `paymentEvent` continua só como dedupe, com TTL opcional; o livro de faturas não tem TTL. |

**Fora de escopo** (da spec, sem mudança): coorte, churn, MRR, ARR e LTV; reembolso, disputa e chargeback;
nota fiscal e conciliação; previsão e comparação com período anterior; detalhamento por usuário a partir do
número e exportação; conversão de moeda.

Também fica fora, por decisão desta análise: importar faturas antigas da Stripe (a spec já coloca fora);
link da linha de contratação para a página do usuário (seria o começo do detalhamento); tratar
`invoice.payment_action_required` e `invoice.payment_failed` (o estado da assinatura já reflete isso pelo
snapshot, e a receita conta só o que foi pago); papel de finanças separado (é RBAC, de
`teams-organizations`).

**Corte de MVP.** Uma rota de agregado, três coleções pequenas alimentadas pelo webhook e uma seção na
home. Nenhum contador mantido por gatilho, nenhum job, nenhuma chamada à Stripe na leitura.

**Apps impactados:** `packages/sdk`, `apps/api`, `apps/app`, `packages/internationalization`, docs.
`packages/design-system` não muda: a seção é mais um consumidor de `CategoryBarChart`
(`packages/design-system/components/ui/category-bar-chart.tsx:25-77`). `apps/web`: N/A.

**Área do painel:** admin (`(admin)/admin`). A rota usa `requireAdminApi`
(`apps/api/app/(guards)/admin.ts:30-54`), que responde 401 `AUTH_INVALID_TOKEN` sem credencial e 403
`ADMIN_FORBIDDEN` para perfil comum.

**Modo de produto.** Só existe em `subscription`. No `simple`, o app nem faz a requisição
(`isSubscriptionMode()` de `packages/next-config/product-mode.ts:23-25`, inlinado no build) e a API responde
`{ enabled: false }` porque `isBillingEnabled()` exige o modo (`apps/api/(shared)/lib/billing.ts:22-28`).

**Dependência de assinatura:** nenhuma para ver a seção; ela descreve a cobrança, não depende dela.

**Dependências externas e env:** Stripe, só no webhook. Nenhuma variável nova. Um evento a mais
(`invoice.paid`) no endpoint de cada fork: pré-requisito manual, seção 9.1.

**Genérico × específico.** Genérico: qualquer fork que venda assinatura pela Stripe tem fatura, plano e
ativação. Tudo fica em `apps/*` e no `sdk`; `packages/payments` não muda.

**Zero dependência nova.** `stripe@19.1.0` (`packages/payments/package.json:14`) e `firebase-admin@13.6.0`
(`@google-cloud/firestore@7.11.6`) já trazem o que o plano usa.

#### 1.1 Fontes

- Spec lida por completo, incluindo a tabela "O que ainda falta para este corte".
- `.claude/cycle-policy.md`, `docs/feature-analysis-guide.md`, slice `entity`.
- Slice de referência entregue: `docs/features/billing-subscription/` (spec, plano, handoff, review,
  relatório do `/test`, em especial a rodada B com webhook assinado e emulador).
- Molde de agregado e home: `docs/features/dashboard-home/`, `docs/features/admin-analytics-dashboard/`.
- Tipos da Stripe instalados (`node_modules/.pnpm/stripe@19.1.0…/types`):
  - `Invoices.d.ts:100` `amount_paid`, `:154` `billing_reason`, `:184` `customer`, `:331` `parent`,
    `:1045-1061` `SubscriptionDetails` (`subscription`, `metadata`), `:1452` `status_transitions.paid_at`,
    `:499-508` os valores de `BillingReason`.
  - `InvoiceLineItems.d.ts:81` `pricing`, `:88` `subscription`, `:281-291` `price_details.price/product`.
  - `lib.d.ts:156-161`: `RequestOptions` aceita `timeout` e `maxNetworkRetries` por chamada.
- Referências não lidas: nenhuma.

#### 1.2 Estado atual medido

| Fato | Evidência |
|------|-----------|
| O webhook trata `checkout.session.completed` e `customer.subscription.created/updated/deleted`; o resto cai em `webhook-unhandled-event` | `apps/api/app/(routes)/webhooks/payments/route.ts:98-119` |
| Dedupe por `event.id` antes de despachar, marcação só depois do handler | `route.ts:161-167`, `payment-event.repository.ts:27-55` |
| O webhook ecoa o evento Stripe inteiro no corpo de sucesso | `route.ts:176` (`{ result: event, ok: true }`), achado aberto no `specs/BACKLOG.md:468` |
| `paymentEvent` guarda só `type`, `createdAt`, `expiresAt` (30 dias) | `payment-event.repository.ts:11-16`, `:7-8` |
| O snapshot de assinatura não tem instante de ativação nem nome de plano | `packages/sdk/src/types/payments/payments.ts:30-44`, `billing-state.ts:36-58` |
| O nome do plano só aparece em `listPlans`, que chama a Stripe | `billing.ts:50-66`, `billing-state.ts:61-86` |
| `findByStripeCustomerId` é consulta de campo único com filtro de `deletedAt` em memória | `user.repository.ts:46-62` |
| Molde de agregado admin com 503 traduzível para índice ausente | `apps/api/app/(routes)/users/activity-summary/route.ts:6-20`, `isMissingIndexError` em `apps/api/(shared)/lib/pagination.ts:59` |
| `SUMMARY_INDEX_MISSING` já existe nos 3 idiomas | `packages/internationalization/translations/packages/shared/utils.ts:109` (pt-br) |
| A home do admin tem um bloco por rota, cada um com sua falha | `AdminHomeClient.tsx:73-89`, `UserActivitySection.tsx:40-137` |
| O gráfico é carregado sob demanda para não puxar o recharts no primeiro chunk | `UserActivitySection.tsx:20-28` |
| O prefetch RSC da home pula quando o admin está personificando | `admin/(pages)/page.tsx:11-28` |
| `MetricCard` aceita só `value: number` e imprime cru para não divergir entre servidor e browser | `apps/app/shared/components/ui/MetricCard.tsx:11-17`, `:42-47` |
| Formatação de moeda por idioma já existe e respeita moeda sem casas decimais | `apps/app/shared/lib/formatPlanPrice.ts:16-37` |
| A API já recebe o fuso do navegador (`x-user-timezone`), mas o client do prefetch no servidor não manda | `apps/api/(shared)/lib/auth-request-context.ts:132-145`; `apps/app/lib/server/apiServerClient.ts` não deriva fuso |
| O eixo do gráfico mostra todo rótulo e não esconde nenhum; rótulo curto é responsabilidade de quem chama | `category-bar-chart.tsx:51-55` |
| `firestore.indexes.json` tem 7 entradas; 6 não publicadas no projeto de referência | `firestore.indexes.json`, `docs/PRE-PRODUCTION.md` §1.8 |

### 2. Dados (Firestore)

Três coleções novas, todas gravadas só pelo webhook, pelo Admin SDK. Nenhum campo novo em `user`.

#### 2.1 `paidInvoice` (livro de faturas pagas)

Nome: `paidInvoice` (alternativa descartada: `billingInvoice`, que sugere guardar fatura em qualquer
estado). Id do documento = `invoice.id` (`in_…`).

| Campo | Tipo | `null`? | Origem | Justificativa |
|-------|------|---------|--------|---------------|
| `amountPaid` | `number` | não | `invoice.amount_paid` | valor efetivamente pago, na menor unidade da moeda |
| `currency` | `string` | não | `invoice.currency` (minúsculo, como a Stripe manda) | a soma é por moeda |
| `paidAt` | `Timestamp` | não | `status_transitions.paid_at`, com fallback para `event.created` | define o mês |
| `billingReason` | `string` | sim | `invoice.billing_reason` | distingue primeira cobrança de renovação |
| `subscriptionId` | `string` | sim | `parent.subscription_details.subscription`, fallback `lines.data[0].subscription` | rastreio |
| `priceId` | `string` | sim | `lines.data[0].pricing.price_details.price` | rastreio |
| `recordedAt` | `Timestamp` | não | `new Date()` | quando o webhook gravou |

Sem `profileId`, sem `customer`, sem e-mail. A receita não precisa saber de quem é o dinheiro, e isso deixa
a coleção fora do expurgo de conta (ver seção 6). Sem `deletedAt`: fatura paga não se apaga.

#### 2.2 `subscriptionActivation` (primeira cobrança paga de cada assinatura)

Nome: `subscriptionActivation` (alternativa descartada: `billingActivation`, menos claro sobre a chave).
Id do documento = `subscription.id` (`sub_…`).

| Campo | Tipo | `null`? | Origem |
|-------|------|---------|--------|
| `customerId` | `string` | não | `invoice.customer` (id ou objeto expandido) |
| `priceId` | `string` | sim | primeira linha da fatura |
| `activatedAt` | `Timestamp` | não | o mesmo `paidAt` da fatura |
| `recordedAt` | `Timestamp` | não | `new Date()` |

Só é gravado quando `billing_reason === "subscription_create"` e a fatura tem assinatura e cliente. A
Stripe gera exatamente uma fatura `subscription_create` por assinatura, então "criar se não existe" basta.
O vínculo com o usuário é feito na leitura, por `stripeCustomerId`, e não por `profileId` gravado. Assim o
vínculo sobrevive a uma nova assinatura do mesmo cliente e desaparece sozinho quando o perfil é expurgado.

#### 2.3 `planLabel` (cache de nome de plano)

Nome: `planLabel` (alternativa descartada: `billingPlan`, que sugere catálogo). Id = `price.id`.

| Campo | Tipo | `null`? | Origem |
|-------|------|---------|--------|
| `name` | `string` | sim | nome do produto expandido; senão `price.nickname`; senão `null` |
| `productId` | `string` | sim | `price.product` |
| `interval` | `PlanInterval` | sim | `price.recurring.interval` |
| `intervalCount` | `number` | sim | `price.recurring.interval_count` |
| `resolvedAt` | `Timestamp` | não | quando o webhook consultou a Stripe |

#### 2.4 Consultas e índices

| Consulta | Forma | Índice |
|----------|-------|--------|
| Receita do mês | `paidInvoice` `where paidAt >= início` e `where paidAt < fim`, `.select("amountPaid", "currency")` | intervalo num campo só: índice automático |
| Desde quando conta | `paidInvoice` `orderBy("paidAt", "asc").limit(1)` | automático |
| Contratações recentes | `subscriptionActivation` `orderBy("activatedAt", "desc").limit(5)` | automático |
| Planos vigentes | `user` `where("subscription.status", "in", LIVE_SUBSCRIPTION_STATUSES)`, `.select(...)`, `deletedAt` filtrado em memória | `in` num campo só (subcampo de mapa também é indexado automaticamente): automático |
| Quem é cada contratante | `user` `where("stripeCustomerId", "in", [até 5 ids])`, `deletedAt` em memória; depois `getAuthInstance().getUsers(...)` em lote | automático |
| Nomes | `db.getAll(...planLabel refs)` | nenhum |

**Nenhum índice composto novo.** Cada consulta usa filtro ou ordenação num campo só, e o filtro de soft
delete fica em memória, pelo mesmo argumento de `findByStripeCustomerId` (`user.repository.ts:46-50`). A
fila de índices não publicados não cresce, e a feature funciona num fork novo sem `deploy --only
firestore:indexes`. A rota mantém o `isMissingIndexError` → 503 `SUMMARY_INDEX_MISSING` como defesa, igual
às irmãs.

**Limite de escala registrado (decisão de arquitetura).** A consulta de planos lê um documento por
assinatura vigente a cada abertura da home (só os campos do `select`). O Firestore não tem `GROUP BY`, e a
agregação `count()` exigiria saber os `priceId` de antemão e um índice composto por cima. Com mil assinantes
isso são mil leituras por visita à home do admin, uma tela de uso interno. Gatilho para rever: passar de
5 000 assinaturas vigentes, quando o caminho é um documento de contagem mantido pelo webhook. A receita tem
o mesmo perfil (uma leitura por fatura paga no mês) e o mesmo gatilho, com o caminho de um documento de
total mensal por moeda.

`AggregateField.sum` existe no SDK instalado (`@google-cloud/firestore` `types/firestore.d.ts:2598`), mas
somar por moeda pediria `where currency ==` por moeda, com índice composto `currency` + `paidAt` e a lista de
moedas vinda de outro lugar. Não compensa no corte.

**Regras do Firestore:** sem mudança. `firestore.rules` continua deny-all e a API usa o Admin SDK.

**Documentos existentes:** nada muda em `user`. Um fork que já vende começa com as três coleções vazias:
receita e contratações contam a partir do momento em que `invoice.paid` chega; os planos vigentes aparecem
na hora, porque vêm do snapshot que já existe; os nomes aparecem conforme os eventos de assinatura chegam
(no pior caso, uma renovação por preço). Sem backfill.

### 3. Contrato `@repo/sdk`

Tipos novos em `packages/sdk/src/types/payments/payments.ts` (o barril `types/index.ts` já exporta
`./payments`). Um método novo em `PaymentsActions` (`packages/sdk/src/actions/payments/action.ts:10-52`):
`summary()`, chamado no contexto `admin`, no mesmo molde de `user.summary()`
(`packages/sdk/src/actions/user/user/action.ts:35-42`).

**Quem quebra:** ninguém. Só entram tipos e um método.

### 4. API (`apps/api`)

#### 4.1 Rota

| Método e path | Guard | Resposta |
|---------------|-------|----------|
| `GET /payments/summary` | `requireAdminApi` | `{ data: BillingSummaryDTO }`. Cobrança desligada → 200 `{ data: { enabled: false } }` sem tocar no Firestore. Ligada → 200 com os três blocos. Índice recusado → 503 `SUMMARY_INDEX_MISSING`. |

"Cobrança desligada" é `!isBillingEnabled()`: modo `simple`, falta de uma das chaves ou falta de
`NEXT_PUBLIC_APP_URL`. É a mesma definição que esconde a aba de billing do usuário comum, então as duas
telas nunca discordam. A resposta 200 com `enabled: false` segue a decisão D5/P1 de `billing-subscription`:
o app não tem helper para ler `error.code` de uma query, e o retry do React Query atrasaria o sumiço.

A rota nunca importa nem chama `getStripe()`. Stripe fora do ar não afeta a home.

**Impersonação:** a home do admin não é renderizada enquanto o admin personifica, e o prefetch já pula
nesse caso (`page.tsx:14`). A rota é do ator admin; `requireAdminApi` segue as regras de sempre.

**CORS:** nenhum header novo.

#### 4.2 Validação

Rota sem corpo e sem query string: nada a validar com Zod. O mês é calculado no servidor.

#### 4.3 Webhook: `invoice.paid`

Novo ramo no `dispatch` (`route.ts:98-119`):

```
invoice.paid
  └ record = toPaidInvoiceRecord(invoice, event.created)       (puro, billing-state.ts)
  └ paidInvoiceRepository.recordOnce(record)                   (create com id = invoice.id; ALREADY_EXISTS = mesmo resultado)
  └ billingReason == "subscription_create" e subscriptionId e customerId?
        └ subscriptionActivationRepository.recordOnce(...)     (create com id = subscription.id)
  └ priceId? → ensurePlanLabel(stripe, priceId, requestId)     (best-effort, nunca lança)
  └ logEvent("payments", "webhook-invoice-recorded", { eventType, billingReason, requestId })
```

Os ramos `customer.subscription.*` ganham uma linha no fim de `reconcileSubscription`
(`route.ts:74-96`): `ensurePlanLabel(stripe, state.priceId, requestId)` quando há `priceId`, rodando mesmo
se o perfil não for encontrado ou o snapshot for ignorado, porque o nome é do preço, não do perfil.

`ensurePlanLabel` (`billing.ts`, fala com a Stripe):

1. Lê `planLabel/<priceId>`. Existe e `resolvedAt` tem menos de 7 dias → para.
2. `stripe.prices.retrieve(priceId, { expand: ["product"] }, { timeout: 3000, maxNetworkRetries: 0 })`.
3. `toPlanLabel(price)` (puro): nome do produto se expandido e não apagado; senão `price.nickname`; senão
   `null`. Diferente de `toPlanDTO`, não descarta produto arquivado: assinante antigo de plano arquivado
   ainda precisa de nome.
4. Grava com `set`.
5. Qualquer falha (Stripe, rede, Firestore) → `logEvent("payments", "plan-label-unresolved", { requestId,
   reason: <nome do erro> })` e retorno normal. O cache velho, se houver, fica.

O teto de 3 s limita o custo de latência a eventos com preço novo ou cache vencido. Com a chave falsa do
harness, a chamada falha rápido e o webhook responde 200 do mesmo jeito.

**Eco do evento removido.** A resposta de sucesso passa de `{ result: event, ok: true }` para
`{ ok: true }`. Com `invoice.paid`, o corpo ecoado levaria `customer_email`, `customer_name` e endereço de
cobrança para o log de entregas da Stripe. É o achado `specs/BACKLOG.md:468`, no arquivo que esta tarefa
altera; a política manda corrigir defeito encontrado no caminho. O teste
"aceita checkout.session.completed devolvendo o evento verificado"
(`paymentsWebhookRoute.test.ts:264`) troca a asserção.

#### 4.4 Idempotência e ordem

A receita é número de dinheiro, então a garantia vem em duas camadas.

1. **Evento (`event.id`), já existe.** Reentrega do mesmo evento responde 200 `{ ok: true, duplicate: true }`
   antes de qualquer handler (`route.ts:162-164`).
2. **Fato (`invoice.id` e `subscription.id`), nova.** A camada 1 tem duas janelas: o handler terminou e a
   gravação de `paymentEvent` falhou (o webhook responde 500 e a Stripe reentrega o mesmo `event.id`, que
   ainda não está marcado), e duas entregas concorrentes que passam por `wasProcessed` antes de qualquer
   uma marcar. Nos dois casos o handler roda de novo, e o `create()` com id natural encontra o documento e
   não escreve nada. A receita é somada na leitura a partir dos documentos, então cada fatura entra uma vez
   por construção. Não há contador a incrementar, logo não há incremento duplicado possível.

**Ordem.** Nenhuma escrita nova depende da ordem de chegada.

- A fatura é um fato independente; `paidAt` é propriedade dela, não do instante de entrega.
- A ativação usa o `paidAt` da fatura `subscription_create` e é gravada uma vez. Chegar antes ou depois de
  `customer.subscription.created` ou de `checkout.session.completed` não muda nada, porque o documento
  guarda `customerId`, e o vínculo com o perfil é feito na leitura.
- `invoice.paid` antes de o cliente estar ligado a um perfil: a fatura entra na receita igual; a ativação
  aparece com o nome do usuário assim que o `checkout.session.completed` ligar o cliente.
- O nome do plano é um cache por preço, sem ordem.
- A contagem de planos vem do snapshot, que já tem a regra de ordem de `decideSubscriptionWrite`
  (`billing-state.ts:126-165`).

Handler que lança continua respondendo 500 sem marcar o evento (`route.ts:168-174`), e a reentrega é segura
pela camada 2.

#### 4.5 Montagem do resumo (`apps/api/(shared)/lib/billing-summary.ts`)

```
buildBillingSummary(now):
  month = utcMonthRange(now)                                      (puro)
  em paralelo:
    activations  = subscriptionActivationRepository.listRecent(5)
    planCounts   = userRepository.countLiveSubscriptionsByPrice()
    monthRows    = paidInvoiceRepository.listPaidBetween(month.start, month.end)
    firstPaidAt  = paidInvoiceRepository.firstPaidAt()
  em paralelo:
    labels       = planLabelRepository.findByPriceIds(priceIds de planCounts ∪ activations)
    subscribers  = userRepository.identifyByStripeCustomerIds(customerIds das activations)
  return {
    recentActivations: activations → toActivationDTO(activation, labels, subscribers),
    plans:             rankPlanCounts(planCounts, labels),           (puro: ordena por contagem desc, depois nome)
    revenue: { periodStart, periodEnd, byCurrency: sumByCurrency(monthRows), trackingSince: firstPaidAt },
  }
```

- `utcMonthRange(now)`: `[primeiro dia 00:00Z, primeiro dia do mês seguinte 00:00Z)`. Fatura às
  `23:59:59.999Z` do último dia entra no mês; às `00:00:00.000Z` do dia 1 entra no seguinte.
- `sumByCurrency`: agrupa por moeda, soma `amountPaid`, conta faturas, ordena por valor desc. Moedas
  diferentes nunca se somam.
- `identifyByStripeCustomerIds`: consulta `in`, descarta perfil com `deletedAt`, chama `getUsers` uma vez
  (limite da Admin SDK: 100 identificadores; aqui são até 5) e devolve `displayName` e `email`. Usuário que
  o Auth não conhece, ou perfil apagado, vira `subscriber: null` ("Usuário removido"). Falha transitória do
  Admin SDK sobe, como `mergeWithAuthUser` já faz (`user.repository.ts:202-220`).

Constante `RECENT_ACTIVATIONS_LIMIT = 5` no módulo.

#### 4.6 Persistência

- `paidInvoiceRepository` (`(shared)/repositories/paid-invoice.repository.ts`), estende `BaseRepository`
  como `paymentEventRepository`: `recordOnce(record)`, `listPaidBetween(start, end)`, `firstPaidAt()`.
- `subscriptionActivationRepository` (`subscription-activation.repository.ts`): `recordOnce(input)`,
  `listRecent(limit)`, com mapper `subscription-activation.mapper.ts` que normaliza `activatedAt` para ISO
  com `normalizeFirestoreInstant` (regra de ouro 5).
- `planLabelRepository` (`plan-label.repository.ts`): `findByPriceIds(ids)` (sem chamada quando a lista é
  vazia), `find(id)`, `save(id, label)`.
- `userRepository` ganha `countLiveSubscriptionsByPrice()` e `identifyByStripeCustomerIds(ids)`.
- O `create()` com engolimento de `ALREADY_EXISTS` (código 6) segue `payment-event.repository.ts:36-55`. Vale
  extrair a constante e o teste de código para um helper em `(shared)/infra/` se o desenvolvedor achar que
  três cópias pedem isso; não é obrigatório.
- `recordOnce` de `paidInvoice` grava com whitelist de chaves: `customerId` e `profileId` nunca entram.

#### 4.7 Erros

Nenhum código novo.

| `error.code` | Status | Quando |
|--------------|--------|--------|
| `AUTH_INVALID_TOKEN` | 401 | sem credencial (existente) |
| `ADMIN_FORBIDDEN` | 403 | perfil comum (existente) |
| `SUMMARY_INDEX_MISSING` | 503 | Firestore recusou a consulta por índice (existente, já traduzido) |

Com a cobrança desligada a resposta é 200 `{ enabled: false }`, não um código.

### 5. Front-end (`apps/app`)

#### 5.1 Onde entra

`AdminHomeClient.tsx` ganha `<BillingInsightsSection />` depois de `<UserActivitySection />` (`:89`). A seção
é dona da própria requisição e da própria falha, como o bloco de atividade: se o resumo de cobrança falhar,
os cartões de usuários e o bloco de atividade continuam.

`page.tsx` ganha um terceiro prefetch, só quando `isSubscriptionMode()`:
`queryKeys.payments.summary()` com `client.payments.summary()`. `prefetchQuery` não lança, então um 503 no
servidor só deixa o cliente buscar de novo.

#### 5.2 Dados

- `queryKeys.payments.summary: () => [...queryKeys.payments.all, "summary"]` (`queryKeys.ts:47-50`).
- `admin/(pages)/(hooks)/useBillingSummary.tsx`: `fetchBillingSummary` + `useBillingSummary` no mesmo
  arquivo, com `useAuthorizedQuery` e `enabled: isSubscriptionMode()`.

#### 5.3 Estados da seção

| Estado | Como se produz | O que aparece |
|--------|----------------|---------------|
| Modo `simple` | `NEXT_PUBLIC_PRODUCT_MODE=simple` no app | nada; nenhuma requisição sai |
| Cobrança desligada | chaves vazias ou sem `NEXT_PUBLIC_APP_URL` na API | nada (`enabled: false`) |
| Carregando | primeira carga sem prefetch | título da seção + esqueletos de cartão e gráfico |
| Erro | 503 `SUMMARY_INDEX_MISSING`, 500, rede | título + `LoadErrorState` com a mensagem traduzida |
| Vazio | `enabled: true`, sem planos vigentes, sem contratações e `trackingSince: null` | um cartão com título e orientação: os números aparecem a partir da primeira assinatura paga e contam só do momento em que o webhook passou a receber `invoice.paid` |
| Assinaturas sem fatura registrada | `plans` não vazio e `trackingSince: null` | aviso: há assinaturas vigentes mas nenhuma fatura paga registrada; conferir se `invoice.paid` está no endpoint |
| Normal | dados | cartão de receita, cartão de planos (gráfico + lista), cartão de contratações |

Cartão de receita (`BillingRevenueCard`):

- Título "Recebido em {mês}", com o mês de `periodStart` formatado por
  `Intl.DateTimeFormat(bcp47, { month: "long", year: "numeric", timeZone: "UTC" })`.
- Uma linha por moeda, com `formatPlanPrice(amountPaid, currency, locale)`
  (`apps/app/shared/lib/formatPlanPrice.ts:16-37`).
- Com mais de uma moeda: nota "Valores em moedas diferentes aparecem separados, sem conversão."
- Sem fatura no mês: "Nenhuma fatura paga neste mês."
- Dica fixa com o critério: faturas pagas, mês fechado em UTC, sem descontar reembolsos, não substitui a
  contabilidade. Com `trackingSince`, "Contando desde {data}."

Cartão de planos (`BillingPlansChart`, carregado com `next/dynamic` e `ssr: false`, como
`UserActivitySection.tsx:22-28`):

- Até 5 barras. Com mais de 5 planos, os 4 primeiros e uma barra "Outros" com a soma dos demais.
- Chaves do `ChartConfig` são `plan0`…`plan3` e `other`, com cores `var(--chart-1)`…`var(--chart-5)`. Não usar
  o `priceId` como chave: ele vira nome de variável CSS.
- Rótulo do eixo: nome truncado em 10 caracteres com "…". O eixo mostra todo rótulo
  (`category-bar-chart.tsx:51-55`), então o corte é responsabilidade daqui; a rodada de
  `admin-analytics-dashboard` já perdeu rótulo a 320 px.
- Abaixo do gráfico, uma lista com amostra de cor, nome completo, intervalo ("mensal", "anual", "a cada 3
  meses") e contagem. Ela desfaz a ambiguidade de dois preços do mesmo produto e é a alternativa textual do
  SVG, que só tem `aria-label`.
- Plano sem nome no cache: "Plano sem nome", com o `priceId` em texto secundário na lista.
- Descrição: assinaturas vigentes, incluindo as com pagamento pendente (`LIVE_SUBSCRIPTION_STATUSES`,
  `payments.ts:20-26`).

Cartão de contratações (`RecentActivationsCard`): até 5 linhas com `displayName ?? email ?? "Usuário
removido"`, rótulo do plano e data (`dateStyle: "medium"`, `timeZone: "UTC"`). Vazio: "Nenhuma contratação
registrada ainda."

**Datas e moeda sem divergência de hidratação.** O componente é client, mas é renderizado no servidor com os
dados do prefetch. Toda formatação recebe locale explícito, e toda data recebe `timeZone: "UTC"`. Sem o fuso
fixo, o servidor (UTC na Vercel) e o navegador (fuso local) escreveriam dias diferentes perto da meia-noite.
É também por isso que o mês da receita é UTC (pergunta P1).

Sem formulário, sem tabela antd. Componentes: `Card*`, `Skeleton`, `Alert` (aviso de `invoice.paid`),
`LoadErrorState`, `CategoryBarChart`. `MetricCard` não muda (ele só aceita número e o valor aqui é texto
formatado e possivelmente multimoeda).

#### 5.4 i18n

Bloco `billing` novo em `translations/apps/app/pages/admin/home.ts`, nos 3 idiomas (árvore na seção 10.5).
Nenhum código de erro novo em `apiErrors`.

### 6. Autorização e segurança

- A rota passa por `requireAdminApi`; a UI escondida no modo `simple` não é a única proteção, a API responde
  `enabled: false` pelo mesmo critério.
- O DTO devolve `displayName` e `email` de até 5 assinantes, dado que o admin já vê na listagem de usuários.
- PCI: nada de cartão. O livro guarda só ids da Stripe, valor, moeda e instante, o que mantém o fork em SAQ A
  conforme a nota de conformidade citada na spec.
- Logs: tipo de evento, `billingReason`, `requestId`, resultado. Nunca valor, e-mail ou payload.
- O webhook deixa de ecoar o evento (4.3), o que tira e-mail e endereço do cliente do corpo de resposta.
- **Expurgo de conta:** nenhuma coleção nova guarda `profileId`, nome ou e-mail. `paidInvoice` e
  `subscriptionActivation` guardam ids da Stripe e valores, na mesma classe do histórico de faturas que já
  fica na Stripe por decisão registrada (`docs/PRE-PRODUCTION.md`, declaração "até onde a exclusão de conta
  alcança"). Depois do expurgo, a consulta por `stripeCustomerId` não acha perfil e a linha mostra "Usuário
  removido". `account-erasure.ts` não muda; a declaração ganha uma frase.
- Impersonação: nenhum efeito (seção 4.1).
- Firestore rules e Arcjet: sem ajuste.

### 7. Testes (Vitest)

Nível mais barato que prova cada comportamento. Nenhum teste da suíte depende de emulador ou rede; o
emulador entra no roteiro do `/test` (seção 8).

| Arquivo | Nível | Prova |
|---------|-------|-------|
| `apps/api/__tests__/billingState.test.ts` (existente, estender) | unit puro | `toPaidInvoiceRecord`: `paid_at` e fallback para `event.created`; assinatura por `parent.subscription_details` e fallback pela linha; `customer` como string e como objeto; `priceId` da primeira linha; linhas vazias. `toPlanLabel`: produto expandido, produto apagado com `nickname`, sem nada → `null`, produto arquivado mantém nome |
| `apps/api/__tests__/billingSummary.test.ts` | unit puro | `utcMonthRange` (último ms do mês, 1º de janeiro, fevereiro bissexto); `sumByCurrency` (uma moeda, duas moedas separadas, valor zero, ordem); `rankPlanCounts` com e sem nome; `toActivationDTO` com assinante ausente |
| `apps/api/__tests__/paidInvoiceRepository.test.ts` | unit, db falso | `recordOnce` grava só a whitelist (sem `customerId`), engole `ALREADY_EXISTS`, propaga outro erro; cláusulas `>=`/`<` em `paidAt` e o `select`; `firstPaidAt` com `orderBy asc limit 1` e `null` em coleção vazia |
| `apps/api/__tests__/subscriptionActivationRepository.test.ts` | unit, db falso | `recordOnce` idempotente; `listRecent` com `orderBy desc limit 5`; ISO no retorno |
| `apps/api/__tests__/planLabelRepository.test.ts` | unit, db falso | `findByPriceIds([])` não chama o banco; `getAll` com os ids; `save` |
| `apps/api/__tests__/userRepositoryBilling.test.ts` (existente, estender) | unit, db falso | `countLiveSubscriptionsByPrice`: `in` com exatamente `LIVE_SUBSCRIPTION_STATUSES`, `select`, perfil apagado fora, agrupamento; `identifyByStripeCustomerIds`: lista vazia não consulta, perfil apagado fora, `getUsers` uma vez, `user-not-found` some do mapa |
| `apps/api/__tests__/planLabelResolution.test.ts` | unit, Stripe e repositório mockados | cache fresco não chama a Stripe; ausente chama `prices.retrieve` com `expand` e `{ timeout: 3000, maxNetworkRetries: 0 }` e grava; vencido renova; Stripe lança → não lança, não sobrescreve, loga `plan-label-unresolved` |
| `apps/api/__tests__/paymentsWebhookRoute.test.ts` (existente, estender) | rota | `invoice.paid` `subscription_create` grava fatura e ativação; `subscription_cycle` grava só a fatura; fatura sem assinatura (manual) grava só a fatura; `ensurePlanLabel` chamado nos ramos de assinatura e fatura, e a falha dele não muda a resposta 200; handler de fatura que lança → 500 sem marcar; corpo de sucesso é `{ ok: true }` sem o evento; o caso existente de duplicado continua sem rodar handler |
| `apps/api/__tests__/paymentsSummaryRoute.test.ts` | rota, repositórios e `@repo/payments` mockados | `enabled: false` sem chave, no `simple` e sem app URL, sem tocar repositório; `enabled: true` com os três blocos; 503 `SUMMARY_INDEX_MISSING`; falha alheia sobe; 403 `ADMIN_FORBIDDEN`; 401; só exporta `GET`; `getStripe` nunca chamado |
| `apps/app/__tests__/billingInsights.test.ts` | unit puro | dados do gráfico (≤5 planos, >5 com "Outros", truncamento, chaves `plan0…`/`other`); rótulo de intervalo; mês e data em UTC nos 3 idiomas |
| `apps/app/__tests__/billingInsightsSection.test.tsx` | componente, hook mockado | some no `simple` e com `enabled: false`; esqueleto; erro traduzido; vazio; aviso de `invoice.paid`; moeda por idioma; duas moedas em linhas separadas; "Usuário removido"; "Plano sem nome" |
| `apps/app/__tests__/useBillingSummary.test.tsx` | hook | no `simple` não chama `apiClient.payments.summary`; no `subscription` chama e guarda sob `queryKeys.payments.summary()` |
| `apps/app/__tests__/adminHomePrefetch.test.tsx` (existente, estender) | página RSC | prefetch de `payments.summary` no `subscription`, ausente no `simple` e ao personificar |
| `apps/app/__tests__/adminHomeClient.test.tsx` (existente) | componente | mock de `BillingInsightsSection` como marcador, igual ao de `UserActivitySection` (`:26-31`) |
| `packages/internationalization/__tests__/parity.test.ts` (existente) | unit | paridade do bloco `billing` |

**Sem teste de emulador na suíte**, pelo mesmo motivo da D22 de `billing-subscription`: o CI roda os testes
herméticos. O que o emulador provaria além do unitário (o `in` em subcampo de mapa com `select` executando de
verdade, `Timestamp` gravado e lido de volta como ISO, o `create()` concorrente devolvendo `ALREADY_EXISTS`
com código 6) entra no roteiro do `/test`. E o emulador não prova que índice composto não é necessário: ele
serve qualquer consulta. Isso fica como conferência pós-deploy (9.1).

### 8. O que o `/test` vai percorrer

Duas configurações da API, nenhuma com conta Stripe real. Nenhum valor abaixo é segredo.

**Rodada A, degradada:** chaves vazias, emulador de Auth e Firestore com `pnpm seed`, admin do seed.

1. Home do admin em light, dark e mobile, nos 3 idiomas: nenhuma seção de cobrança; os blocos de usuários e
   de atividade como antes. No DevTools, `GET /payments/summary` responde 200 `{ "data": { "enabled": false } }`.
2. App com `NEXT_PUBLIC_PRODUCT_MODE=simple`: nenhuma requisição a `/payments/summary`.
3. `curl` sem credencial → 401; com um usuário comum → 403 `ADMIN_FORBIDDEN`.

**Rodada B, configurada offline:** API com `STRIPE_SECRET_KEY=sk_test_offline_qa`,
`STRIPE_WEBHOOK_SECRET=whsec_offline_qa` e `NEXT_PUBLIC_APP_URL` **no ambiente do processo**, como no
`/test` de `billing-subscription`. Harness temporário em `/tmp` que assina payloads com
`stripe.webhooks.generateTestHeaderString`, removido ao fim.

1. Seção vazia: admin abre a home antes de qualquer evento → cartão de estado vazio com orientação.
2. `checkout.session.completed` e `customer.subscription.created` (status `active`, `price_qa_basic`) para o
   usuário comum do seed, com `customer=cus_qa1` → a seção mostra o aviso de `invoice.paid` ausente (há plano
   vigente, nenhuma fatura), o gráfico com uma barra "Plano sem nome", e a contratação ainda vazia.
3. `invoice.paid` `subscription_create`, `in_qa1`, `amount_paid=2900`, `currency=brl`, `paid_at` no mês
   corrente, `parent.subscription_details.subscription=sub_qa1` → aviso some; "Recebido em <mês>" mostra
   R$ 29,00 em pt-br (em en e es, registrar no relatório o texto exato que o `Intl` produzir);
   contratação com o nome ou e-mail do usuário, plano e data; "Contando desde".
4. Mesmo evento reenviado com o mesmo `id` → `{"ok":true,"duplicate":true}`; receita inalterada.
5. Evento **novo** (`id` diferente) para a mesma `in_qa1` → 200; nenhum documento novo em `paidInvoice`;
   receita inalterada. Simula a janela entre handler e marcação.
6. `invoice.paid` `subscription_cycle` de `in_qa2` (R$ 29,00) → receita R$ 58,00; nenhuma contratação nova.
7. Segundo usuário (`qa-billing-insights@example.com`) com `cus_qa2`, `price_qa_pro`, e `invoice.paid` em
   `usd` → duas linhas de moeda, sem soma, com a nota de moedas separadas; duas barras; duas contratações na
   ordem certa.
8. Fatura com `paid_at` no mês anterior → não entra no mês; `trackingSince` recua para ela.
9. Documento `planLabel/price_qa_pro` gravado direto no emulador com `name: "Pro"`, `interval: "month"` →
   barra e lista mostram "Pro" e "mensal"; o outro plano segue "Plano sem nome". Prova que a home lê o cache.
10. Mais de 5 planos (6 preços em 6 perfis, via harness) → 4 barras + "Outros", rótulos visíveis a 375 px e
    a 320 px nos 3 idiomas.
11. Soft delete do segundo usuário pelo admin → contratação vira "Usuário removido", a barra dele sai da
    contagem, a receita não muda.
12. Log da API durante o harness: `plan-label-unresolved` aparece (a chave falsa faz a Stripe recusar) e o
    webhook responde 200; nenhum log traz e-mail ou valor.
13. Resposta de sucesso do webhook é `{"ok":true}`, sem o evento.
14. Console do navegador sem aviso de hidratação na home, nos 3 idiomas.

Dados de QA: `qa-billing-insights@example.com` no emulador, e os documentos das três coleções; tudo morre com
o emulador e é listado no relatório.

**Não observável sem conta Stripe real (vira 🔒, não reprovação):** entrega real de `invoice.paid` pela
Stripe ou pelo `stripe listen`; resolução real do nome do produto por `prices.retrieve`; forma real do
payload de `invoice.paid` na versão `2025-09-30.clover` (o harness imita os campos que o código lê); a
ausência de necessidade de índice composto num projeto Firebase real.

### 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **A seção some quando a cobrança está desligada**
  Com `STRIPE_SECRET_KEY` ou `STRIPE_WEBHOOK_SECRET` vazias, ou sem `NEXT_PUBLIC_APP_URL` na API, a home do
  admin não mostra nenhum elemento da seção de cobrança, nem título, nem esqueleto, nem zeros. `GET
  /payments/summary` responde 200 `{ "data": { "enabled": false } }` sem ler o Firestore e sem chamar a
  Stripe. String vazia conta como ausência. Os cartões de usuários e o bloco de atividade continuam iguais.
  Prova: `paymentsSummaryRoute.test.ts`, `billingInsightsSection.test.tsx`, rodada A.

- [ ] **A seção some no modo `simple`**
  Com `NEXT_PUBLIC_PRODUCT_MODE=simple`, o app não faz a requisição a `/payments/summary` nem no prefetch do
  servidor nem no cliente, e a seção não aparece. Mesmo com as chaves presentes, a API responde
  `enabled: false` nesse modo. Prova: `useBillingSummary.test.tsx`, `adminHomePrefetch.test.tsx`, teste de
  rota, rodada A passo 2.

- [ ] **Só admin lê o resumo de cobrança**
  Sem credencial, a rota responde 401 `AUTH_INVALID_TOKEN`; com um perfil comum, 403 `ADMIN_FORBIDDEN`, e a
  mensagem traduzida existe nos 3 idiomas. Enquanto o admin personifica, a home do admin não é renderizada e
  o prefetch não roda. A rota só exporta `GET`. Prova: teste de rota, `adminHomePrefetch.test.tsx`, rodada A
  passo 3.

- [ ] **Receita do mês é o valor recebido, com moeda e critério na tela**
  O cartão mostra a soma de `amount_paid` das faturas `invoice.paid` com `paid_at` no mês corrente,
  formatada na moeda da fatura e no idioma da tela (moeda sem casas decimais, como JPY, não é dividida por
  100). Ao lado do número aparecem o critério (faturas pagas, mês fechado em UTC, sem descontar reembolsos,
  não substitui a contabilidade) e "Contando desde" a primeira fatura registrada. Sem fatura no mês, o
  cartão diz "Nenhuma fatura paga neste mês" em vez de mostrar zero numa moeda inventada. Prova:
  `billingSummary.test.ts`, `billingInsightsSection.test.tsx`, rodada B passos 3 e 6.

- [ ] **Moedas diferentes aparecem separadas, sem conversão**
  Faturas em `brl` e `usd` no mesmo mês produzem duas linhas, cada uma com o seu total e a sua moeda,
  ordenadas pelo valor, e a nota de que moedas diferentes não são somadas. Nenhum total geral é calculado.
  Prova: `billingSummary.test.ts`, teste de componente, rodada B passo 7.

- [ ] **O mês é fechado em UTC, com limites exatos**
  Uma fatura paga às `23:59:59.999Z` do último dia do mês entra no mês; uma paga às `00:00:00.000Z` do dia 1
  entra no mês seguinte; a virada de dezembro para janeiro e fevereiro bissexto seguem a mesma regra. Fatura
  do mês anterior não entra no total, mas conta para "Contando desde". Prova: `billingSummary.test.ts`,
  rodada B passo 8.

- [ ] **Reentregar o mesmo evento não altera a receita**
  Um `invoice.paid` com `id` já processado responde 200 `{ "ok": true, "duplicate": true }` sem rodar
  handler, sem criar documento e sem mudar o valor exibido. Prova: teste de rota existente e rodada B
  passo 4.

- [ ] **Reprocessar a mesma fatura não duplica a receita**
  Se o handler de uma fatura rodar de novo (evento com outro `id` para a mesma fatura, ou reentrega depois
  de a marcação em `paymentEvent` falhar), o documento `paidInvoice/<in_id>` já existe, nada é regravado e a
  receita continua a mesma. Duas entregas concorrentes da mesma fatura terminam com um documento só.
  Prova: `paidInvoiceRepository.test.ts` (engole `ALREADY_EXISTS`), rodada B passo 5.

- [ ] **Falha no handler não perde nem duplica a fatura**
  Se a gravação da fatura ou da ativação lançar, o webhook responde 500 e não marca o evento, para a Stripe
  reentregar. Na reentrega, o que já foi gravado não é repetido. Prova: teste de rota e teste de
  repositório.

- [ ] **Contratações recentes mostram as 5 últimas primeiras cobranças**
  A lista traz até 5 assinaturas, da mais recente para a mais antiga, pela data da primeira fatura paga
  (`billing_reason = subscription_create`), com usuário, plano e data no idioma da tela, em UTC. Renovação
  (`subscription_cycle`), troca de plano (`subscription_update`) e fatura manual não criam contratação. Com
  mais de 5, só as 5 mais recentes aparecem. Assinante que já existia antes da entrega não aparece como
  contratação nova quando a renovação chega. Prova: testes de webhook e de repositório, rodada B passos 3,
  6 e 7.

- [ ] **Usuário apagado aparece como removido, e o dinheiro continua contado**
  Quando o perfil do contratante tem `deletedAt`, foi expurgado ou não existe mais no Firebase Auth, a linha
  mostra "Usuário removido" com plano e data. A receita não depende do perfil: fatura de cliente sem perfil,
  ou paga antes de o `checkout.session.completed` ligar o cliente, entra no total. Os planos vigentes não
  contam perfil apagado. Prova: `userRepositoryBilling.test.ts`, teste de componente, rodada B passo 11.

- [ ] **Planos mais vendidos contam assinaturas vigentes por plano**
  O gráfico mostra, por preço, quantos perfis não apagados têm `subscription.status` em
  `LIVE_SUBSCRIPTION_STATUSES` (ativa, em teste, pagamento pendente, não paga, pausada), do maior para o
  menor, e a descrição diz que pagamento pendente conta. Com mais de 5 planos, aparecem os 4 primeiros e
  "Outros" com a soma dos demais. A lista abaixo do gráfico traz nome completo, intervalo e contagem. Sem
  plano vigente, o cartão diz "Nenhuma assinatura vigente". Prova: `billingInsights.test.ts`,
  `userRepositoryBilling.test.ts`, rodada B passos 7 e 10.

- [ ] **O nome do plano vem do cache local, e a home nunca chama a Stripe**
  A rota lê o nome em `planLabel` e nunca chama `getStripe()`. O webhook tenta resolver o nome de um preço
  novo ou com cache de mais de 7 dias, com timeout de 3 s e sem retry; se a Stripe falhar, o webhook responde
  200 do mesmo jeito, registra `plan-label-unresolved` e mantém o nome antigo, se houver. Preço sem nome no
  cache aparece como "Plano sem nome", com o `priceId` na lista. Prova: `planLabelResolution.test.ts`, teste
  de rota (`getStripe` não chamado), rodada B passos 9 e 12; resolução real 🔒.

- [ ] **Fork que ainda não vendeu vê orientação, não zeros**
  Sem plano vigente, sem contratação e sem nenhuma fatura registrada, a seção mostra um único cartão dizendo
  que os números aparecem a partir da primeira assinatura paga e que contam só do momento em que o webhook
  passou a receber `invoice.paid`. Nenhum cartão com valor zero é exibido nesse estado. Prova: teste de
  componente, rodada B passo 1.

- [ ] **Assinaturas sem fatura registrada geram aviso de configuração**
  Quando há plano vigente mas nenhuma fatura foi registrada (`trackingSince` nulo), a seção mostra o aviso
  para conferir se `invoice.paid` está cadastrado no endpoint do webhook. O aviso some assim que a primeira
  fatura chega. Prova: teste de componente, rodada B passos 2 e 3.

- [ ] **Índice recusado degrada só a seção**
  Se o Firestore recusar uma consulta por índice, a rota responde 503 `SUMMARY_INDEX_MISSING` e a seção
  mostra a mensagem traduzida nos 3 idiomas; os cartões de usuários e o bloco de atividade continuam. Outra
  falha não é rotulada como índice e sobe. Prova: teste de rota e teste de componente.

- [ ] **O webhook não ecoa mais o evento**
  A resposta de sucesso do webhook é `{ "ok": true }` para qualquer tipo de evento, sem o objeto da Stripe.
  Os demais comportamentos do webhook (503 sem configuração, 500 para assinatura inválida, duplicado)
  não mudam. Prova: `paymentsWebhookRoute.test.ts`, rodada B passo 13.

- [ ] **Moeda, mês e data seguem o idioma sem divergência de hidratação**
  Em pt-br, en e es, valores, nome do mês e datas saem formatados pelo `Intl` com o locale da tela e fuso
  UTC, e o HTML do servidor bate com o do navegador (nenhum aviso de hidratação no console). Toda a copy da
  seção existe nos 3 idiomas com a mesma estrutura. Prova: `billingInsights.test.ts`, `parity.test.ts`,
  rodada B passo 14.

- [ ] **Tema e tamanho de tela**
  Em light e dark, cartões, aviso, gráfico e lista usam os tokens do tema, com contraste legível. A 375 px e
  a 320 px, os cartões empilham, todo rótulo do eixo aparece (truncado em 10 caracteres) e a lista não
  estoura a largura. Prova: rodada B passo 10.

### 9.1 Pré-requisitos manuais de infra

O `/develop` não satisfaz nenhum destes e o `/test` não reprova por eles. Vão para `docs/PRE-PRODUCTION.md`
§12, que o `/develop` atualiza.

1. **Acrescentar `invoice.paid` ao endpoint do webhook** de cada fork (Dashboard → Developers → Webhooks →
   endpoint → eventos), na versão `2025-09-30.clover`. Passam a ser cinco eventos. Sem ele, receita e
   contratações ficam vazias; a seção mostra o aviso de configuração quando há assinatura vigente. Numa
   versão de API anterior a 2025-03-31, `parent.subscription_details` não existe; o código cai na assinatura
   da linha da fatura, mas a versão exigida é a de sempre.
2. **Nenhum índice composto a publicar.** Conferência opcional depois do deploy: abrir a home do admin num
   projeto real e confirmar que `GET /payments/summary` não responde 503 `SUMMARY_INDEX_MISSING`.
3. **Nenhuma variável nova.** Vale o que o §12 já pede.
4. **Não aplicar TTL em `paidInvoice` nem em `subscriptionActivation`.** O TTL opcional continua só em
   `paymentEvent.expiresAt`.
5. **Fork que já vende:** a receita e as contratações começam do zero na data em que `invoice.paid` for
   registrado; os nomes de plano aparecem conforme os eventos de assinatura chegam (até um ciclo de
   cobrança). Importar faturas antigas está fora do corte.

**Modo degradado, resumido:** sem Stripe configurada, sem `NEXT_PUBLIC_APP_URL` ou em `simple` → seção
ausente, API 200 `enabled: false`; Stripe fora do ar → home intacta, webhook grava tudo e o nome fica para a
próxima tentativa; índice ausente → 503 `SUMMARY_INDEX_MISSING` traduzido, só a seção degrada; `invoice.paid`
não cadastrado → aviso na seção. Nenhum caso responde 500.

---

## Etapa 2. Blueprint técnico

### 10.1 Contrato (`packages/sdk/src/types/payments/payments.ts`)

```ts
/** `name` is null until the payments webhook resolved it from the provider. */
export type BillingPlanCountDTO = {
    priceId: string | null;
    productId: string | null;
    name: string | null;
    interval: PlanInterval | null;
    intervalCount: number | null;
    count: number;
};

export type BillingSubscriberDTO = {
    profileId: string;
    displayName: string | null;
    email: string | null;
};

export type BillingActivationDTO = {
    subscriptionId: string;
    priceId: string | null;
    planName: string | null;
    interval: PlanInterval | null;
    intervalCount: number | null;
    /** First paid invoice of the subscription, ISO. */
    activatedAt: string;
    /** Null when the profile was deleted or never linked to the customer. */
    subscriber: BillingSubscriberDTO | null;
};

export type BillingRevenueByCurrencyDTO = {
    currency: string;
    /** In the smallest unit of `currency`. */
    amountPaid: number;
    invoiceCount: number;
};

/** Paid invoices of one calendar month in UTC, `[periodStart, periodEnd)`. */
export type BillingRevenueDTO = {
    periodStart: string;
    periodEnd: string;
    byCurrency: BillingRevenueByCurrencyDTO[];
    /** Earliest paid invoice on record; null when none was ever received. */
    trackingSince: string | null;
};

export type BillingSummaryDTO =
    | { enabled: false }
    | {
          enabled: true;
          recentActivations: BillingActivationDTO[];
          plans: BillingPlanCountDTO[];
          revenue: BillingRevenueDTO;
      };
```

Action:

```diff
// packages/sdk/src/actions/payments/action.ts
+    async summary(): Promise<BillingSummaryDTO> {
+        const { data } = await this.client.request<Response<BillingSummaryDTO>>({
+            url: "/payments/summary",
+            method: "GET",
+        });
+
+        return data.data;
+    }
```

### 10.2 Rota (`apps/api/app/(routes)/payments/summary/route.ts`)

```ts
export const GET = requireAdminApi(async () => {
    if (!isBillingEnabled()) {
        return Response.json({ data: { enabled: false } });
    }

    try {
        const summary = await buildBillingSummary(new Date());
        return Response.json({ data: { enabled: true, ...summary } });
    } catch (error) {
        if (isMissingIndexError(error)) {
            return Response.json(
                { error: { code: "SUMMARY_INDEX_MISSING" } },
                { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
            );
        }
        throw error;
    }
});
```

Exemplos:

```http
GET /payments/summary

200 { "data": {
  "enabled": true,
  "recentActivations": [
    { "subscriptionId": "sub_qa2", "priceId": "price_qa_pro", "planName": "Pro",
      "interval": "month", "intervalCount": 1, "activatedAt": "2026-09-24T14:02:11.000Z",
      "subscriber": { "profileId": "p9", "displayName": "Ana", "email": "ana@example.com" } },
    { "subscriptionId": "sub_qa1", "priceId": "price_qa_basic", "planName": null,
      "interval": null, "intervalCount": null, "activatedAt": "2026-09-20T10:00:00.000Z",
      "subscriber": null }
  ],
  "plans": [
    { "priceId": "price_qa_pro", "productId": "prod_qa", "name": "Pro", "interval": "month",
      "intervalCount": 1, "count": 12 },
    { "priceId": "price_qa_basic", "productId": null, "name": null, "interval": "month",
      "intervalCount": 1, "count": 3 }
  ],
  "revenue": {
    "periodStart": "2026-09-01T00:00:00.000Z", "periodEnd": "2026-10-01T00:00:00.000Z",
    "byCurrency": [
      { "currency": "brl", "amountPaid": 5800, "invoiceCount": 2 },
      { "currency": "usd", "amountPaid": 1900, "invoiceCount": 1 }
    ],
    "trackingSince": "2026-08-30T09:12:00.000Z"
  }
} }

200 { "data": { "enabled": false } }
503 { "error": { "code": "SUMMARY_INDEX_MISSING" } }
```

Tabela `error.code` → status: seção 4.7.

Webhook, pseudo-diff (`apps/api/app/(routes)/webhooks/payments/route.ts`):

```diff
+import { ensurePlanLabel } from "@/(shared)/lib/billing";
-import { toSubscriptionState } from "@/(shared)/lib/billing-state";
+import { toPaidInvoiceRecord, toSubscriptionState } from "@/(shared)/lib/billing-state";
+import { paidInvoiceRepository } from "@/(shared)/repositories/paid-invoice.repository";
+import { subscriptionActivationRepository } from "@/(shared)/repositories/subscription-activation.repository";

 async function reconcileSubscription(event, subscription, requestId) {
+    const state = toSubscriptionState(subscription, event.created);
     const profile = await findSubscriptionOwner(subscription);
     if (!profile) {
         logProfileNotFound(event.type, requestId);
-        return;
+    } else {
+        const result = await userRepository.applySubscriptionState(profile.id, state, event.type);
+        logEvent("payments", "webhook-subscription-reconciled", { eventType: event.type, result, requestId });
     }
-    …
+    if (state.priceId) {
+        await ensurePlanLabel(stripe, state.priceId, requestId);
+    }
 }

+async function recordPaidInvoice(stripe, event, invoice, requestId) {
+    const record = toPaidInvoiceRecord(invoice, event.created);
+    await paidInvoiceRepository.recordOnce(record);
+    if (record.billingReason === "subscription_create" && record.subscriptionId && record.customerId) {
+        await subscriptionActivationRepository.recordOnce({
+            subscriptionId: record.subscriptionId,
+            customerId: record.customerId,
+            priceId: record.priceId,
+            activatedAt: record.paidAt,
+        });
+    }
+    if (record.priceId) {
+        await ensurePlanLabel(stripe, record.priceId, requestId);
+    }
+    logEvent("payments", "webhook-invoice-recorded", {
+        eventType: event.type, billingReason: record.billingReason, requestId,
+    });
+}

 switch (event.type) {
     …
+    case "invoice.paid": {
+        await recordPaidInvoice(stripe, event, event.data.object, requestId);
+        break;
+    }
 }
 …
-    return NextResponse.json({ result: event, ok: true });
+    return NextResponse.json({ ok: true });
```

`dispatch` passa a receber `stripe`, que o `POST` já tem em mãos (`route.ts:133`). O desenvolvedor pode
manter a estrutura atual de `reconcileSubscription` com early return, desde que `ensurePlanLabel` rode nos
dois caminhos.

### 10.3 Persistência

```ts
// apps/api/(shared)/lib/billing-state.ts  (puro, acrescentar)
export type PaidInvoiceRecord = {
    invoiceId: string;
    customerId: string | null;        // usado só para a ativação; não é persistido em paidInvoice
    subscriptionId: string | null;
    priceId: string | null;
    billingReason: string | null;
    amountPaid: number;
    currency: string;
    paidAt: Date;
};
export function toPaidInvoiceRecord(invoice: Stripe.Invoice, eventCreatedSeconds: number): PaidInvoiceRecord;

export type PlanLabel = {
    name: string | null;
    productId: string | null;
    interval: PlanInterval | null;
    intervalCount: number | null;
};
export function toPlanLabel(price: Stripe.Price): PlanLabel;

// apps/api/(shared)/lib/billing.ts  (fala com a Stripe, acrescentar)
export const PLAN_LABEL_TTL_DAYS = 7;
export async function ensurePlanLabel(stripe: Stripe, priceId: string, requestId: string | null): Promise<void>;

// apps/api/(shared)/lib/billing-summary.ts  (novo)
export const RECENT_ACTIVATIONS_LIMIT = 5;
export function utcMonthRange(now: Date): { start: Date; end: Date };
export function sumByCurrency(rows: { amountPaid: number; currency: string }[]): BillingRevenueByCurrencyDTO[];
export function rankPlanCounts(counts: LivePlanCount[], labels: Map<string, PlanLabel>): BillingPlanCountDTO[];
export async function buildBillingSummary(now: Date): Promise<Omit<Extract<BillingSummaryDTO, { enabled: true }>, "enabled">>;

// apps/api/(shared)/repositories/paid-invoice.repository.ts  (coleção "paidInvoice")
recordOnce(record: PaidInvoiceRecord): Promise<"created" | "exists">;
listPaidBetween(start: Date, end: Date): Promise<{ amountPaid: number; currency: string }[]>;
firstPaidAt(): Promise<string | null>;

// apps/api/(shared)/repositories/subscription-activation.repository.ts  (coleção "subscriptionActivation")
recordOnce(input: { subscriptionId: string; customerId: string; priceId: string | null; activatedAt: Date }): Promise<"created" | "exists">;
listRecent(limit: number): Promise<SubscriptionActivationRow[]>;   // activatedAt ISO, pelo mapper

// apps/api/(shared)/repositories/plan-label.repository.ts  (coleção "planLabel")
find(priceId: string): Promise<(PlanLabel & { resolvedAt: string }) | null>;
findByPriceIds(priceIds: string[]): Promise<Map<string, PlanLabel>>;
save(priceId: string, label: PlanLabel): Promise<void>;

// apps/api/(shared)/repositories/user.repository.ts  (acrescentar)
export type LivePlanCount = { priceId: string | null; productId: string | null;
    interval: PlanInterval | null; intervalCount: number | null; count: number };
countLiveSubscriptionsByPrice(): Promise<LivePlanCount[]>;
identifyByStripeCustomerIds(customerIds: string[]): Promise<Map<string, BillingSubscriberDTO>>;
```

Forma dos documentos:

```ts
// paidInvoice/in_1Qx…
{ amountPaid: 2900, currency: "brl", paidAt: Timestamp, billingReason: "subscription_create",
  subscriptionId: "sub_1Qx…", priceId: "price_1Qx…", recordedAt: Timestamp }

// subscriptionActivation/sub_1Qx…
{ customerId: "cus_R…", priceId: "price_1Qx…", activatedAt: Timestamp, recordedAt: Timestamp }

// planLabel/price_1Qx…
{ name: "Pro", productId: "prod_R…", interval: "month", intervalCount: 1, resolvedAt: Timestamp }
```

### 10.4 Front, árvore de arquivos

```
apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/
├── page.tsx                                  (alterado: prefetch de payments.summary no modo subscription)
├── (components)/
│   ├── AdminHomeClient.tsx                   (alterado: <BillingInsightsSection />)
│   ├── BillingInsightsSection.tsx            (novo, "use client": estados da seção)
│   ├── BillingRevenueCard.tsx                (novo)
│   ├── BillingPlansChart.tsx                 (novo, carregado com next/dynamic, ssr: false)
│   └── RecentActivationsCard.tsx             (novo)
└── (hooks)/
    └── useBillingSummary.tsx                 (novo)
apps/app/shared/lib/queryKeys.ts              (alterado)
apps/app/shared/lib/billingInsights.ts        (novo, puro: dados do gráfico, rótulo de intervalo, mês e data em UTC)
```

Se `BillingRevenueCard` e `RecentActivationsCard` ficarem pequenos, podem morar dentro de
`BillingInsightsSection.tsx`; o gráfico fica em arquivo próprio por causa do carregamento sob demanda.

```diff
// page.tsx
+import { isSubscriptionMode } from "@repo/next-config/product-mode";
 …
             await Promise.all([
                 queryClient.prefetchQuery({ queryKey: queryKeys.users.summary(), … }),
                 queryClient.prefetchQuery({ queryKey: queryKeys.users.activitySummary(), … }),
+                ...(isSubscriptionMode()
+                    ? [queryClient.prefetchQuery({
+                          queryKey: queryKeys.payments.summary(),
+                          queryFn: () => client.payments.summary(),
+                      })]
+                    : []),
             ]);

// queryKeys.ts
     payments: {
         all: ["payments"] as const,
         plans: () => [...queryKeys.payments.all, "plans"] as const,
+        summary: () => [...queryKeys.payments.all, "summary"] as const,
     },

// AdminHomeClient.tsx
+import { BillingInsightsSection } from "./BillingInsightsSection";
 …
                     <UserActivitySection />
+                    <BillingInsightsSection />
```

```ts
// (hooks)/useBillingSummary.tsx
export function fetchBillingSummary(): Promise<BillingSummaryDTO> {
    return apiClient.payments.summary();
}

export const useBillingSummary = () => {
    const query = useAuthorizedQuery({
        queryKey: queryKeys.payments.summary(),
        queryFn: fetchBillingSummary,
        enabled: isSubscriptionMode(),
    });
    return { data: query.data, isLoading: query.isLoading, error: query.error, refetch: query.refetch };
};
```

### 10.5 i18n

`translations/apps/app/pages/admin/home.ts`, bloco `billing` (pt-br abaixo; en e es com a mesma árvore):

```ts
billing: {
    title: "Cobrança",
    description: "Assinaturas e pagamentos registrados pelo webhook da Stripe.",
    empty: {
        title: "Nenhuma assinatura ainda",
        description:
            "Quando a primeira assinatura for paga, as contratações, os planos e o valor recebido aparecem aqui. Os números contam a partir do momento em que o webhook passou a receber o evento invoice.paid; vendas anteriores não entram.",
    },
    missingInvoiceEvent:
        "Há assinaturas vigentes, mas nenhuma fatura paga foi registrada. Confira se o evento invoice.paid está cadastrado no endpoint do webhook da Stripe.",
    revenue: {
        title: "Recebido em {month}",
        criteria:
            "Faturas pagas no mês, fechado em UTC. Não desconta reembolsos e não substitui a contabilidade.",
        trackingSince: "Contando desde {date}.",
        multiCurrency: "Valores em moedas diferentes aparecem separados, sem conversão.",
        none: "Nenhuma fatura paga neste mês.",
    },
    plans: {
        title: "Planos mais vendidos",
        description: "Assinaturas vigentes por plano, incluindo as com pagamento pendente.",
        empty: "Nenhuma assinatura vigente.",
        other: "Outros",
        unnamed: "Plano sem nome",
        interval: { day: "diário", week: "semanal", month: "mensal", year: "anual" },
        everyInterval: "a cada {count} {unit}",
        intervalUnits: { day: "dias", week: "semanas", month: "meses", year: "anos" },
    },
    activations: {
        title: "Contratações recentes",
        description: "Pela data da primeira cobrança paga. Datas em UTC.",
        empty: "Nenhuma contratação registrada ainda.",
        removedUser: "Usuário removido",
    },
},
```

`apiErrors`: nenhum código novo.

### 10.6 Adaptação de código existente

| Arquivo | Mudança | Atenção |
|---------|---------|---------|
| `apps/api/app/(routes)/webhooks/payments/route.ts` | ramo `invoice.paid`, `ensurePlanLabel` nos ramos de assinatura, `stripe` passado ao `dispatch`, resposta `{ ok: true }` | o JSDoc de `:127-131` continua certo; não citar plano nem spec em comentário |
| `apps/api/(shared)/lib/billing-state.ts` | `toPaidInvoiceRecord`, `toPlanLabel` | puro, sem cliente Stripe |
| `apps/api/(shared)/lib/billing.ts` | `ensurePlanLabel` | nunca lança; log só com nome do erro |
| `apps/api/(shared)/repositories/user.repository.ts` | 2 métodos | `select` com caminhos de subcampo (`"subscription.priceId"`); `getUsers` em lote |
| `apps/api/__tests__/paymentsWebhookRoute.test.ts:264` | asserção do corpo de sucesso | troca de contrato declarada, não afrouxamento; mocks novos para os dois repositórios e para `ensurePlanLabel` |
| `apps/api/.env.example:55-56` | lista de eventos ganha `invoice.paid` | sem valor preenchido |
| `apps/app/__tests__/adminHomeClient.test.tsx` | mock de `BillingInsightsSection` | igual ao de `UserActivitySection` |
| `docs/PRE-PRODUCTION.md` §12 | checklist e passo 3 com cinco eventos; comportamento sem `invoice.paid`; aviso de não pôr TTL no livro | e a declaração "até onde a exclusão de conta alcança" ganha uma frase sobre `paidInvoice` e `subscriptionActivation` |
| `docs/PAYMENTS.md` | tabela de eventos com `invoice.paid`; seção "Dados" com as três coleções; resumo do admin | medir antes de escrever (política §4) |

`specs/BACKLOG.md` e o arquivamento da spec ficam para o `/spec --sync`.

### 10.7 Ordem de implementação e de commit

1. `feat(sdk): billing summary contract for the admin home` (`packages/sdk`)
2. `feat(api): record paid invoices and first activations from the payments webhook` (`billing-state.ts`,
   repositórios `paidInvoice` e `subscriptionActivation` com mapper, ramo `invoice.paid`, resposta sem eco,
   `.env.example`, testes)
3. `feat(api): cache plan names resolved by the payments webhook` (`planLabel`, `ensurePlanLabel`, chamadas no
   webhook, testes)
4. `feat(api): admin billing summary route` (métodos do `userRepository`, `billing-summary.ts`, rota, testes)
5. `feat(app): billing section on the admin home` (`queryKeys`, hook, helpers, componentes, prefetch, testes)
6. `feat(internationalization): admin billing section copy`
7. `docs: invoice.paid webhook event and billing collections` (`PRE-PRODUCTION.md`, `PAYMENTS.md`)
8. `docs(features): admin-billing-insights` (sempre o último)

### 10.8 Env e config

Nenhuma variável nova. O que cada fork faz está em 9.1.

---

## Decisões tomadas sem perguntar

| # | Decisão | Alternativa descartada | Por quê |
|---|---------|------------------------|---------|
| D1 | Receita "recebida", por `invoice.paid` | "faturada", por `invoice.finalized` | recomendação da spec; é o número que não encolhe por falha de cobrança |
| D2 | Coleções próprias alimentadas pelo webhook | consultar a Stripe ao renderizar | recomendação da spec e proibição do corte |
| D3 | Qualquer admin vê a seção | papel de finanças | recomendação da spec; RBAC é de `teams-organizations` |
| D4 | 5 contratações | lista maior ou paginada | recomendação da spec |
| D5 | Seção ausente em `simple` e com cobrança desligada; API 200 `{ enabled: false }` | 503 com código | recomendação da spec; mesmo padrão de `GET /payments/plans` (D5/P1 de `billing-subscription`) |
| D6 | Moeda declarada, uma linha por moeda, sem soma | total convertido | recomendação da spec |
| D7 | Ativação = primeira fatura paga (`subscription_create`) | primeiro evento de assinatura com status vivo, ou `subscription.start_date` | é o instante exato em que a assinatura passou a ativa, inclusive em pagamento assíncrono; renovação de assinante antigo não vira contratação nova. Custa depender de `invoice.paid`, que a receita já exige. Ver P2 |
| D8 | Livro `paidInvoice` com id = `invoice.id` e soma na leitura | total mensal incrementado por transação | idempotente por construção, sem transação e sem índice; o custo de leitura só pesa acima do gatilho registrado em 2.4 |
| D9 | `subscriptionActivation` como coleção própria, id = `subscription.id` | campo `activatedAt` no snapshot do perfil, ou flag na fatura com índice composto | ordena por um campo só (sem índice), guarda histórico além da assinatura atual e não mexe no tipo `SubscriptionState` |
| D10 | Vínculo contratação → usuário por `stripeCustomerId`, na leitura | `profileId` gravado no documento | o vínculo sobrevive a nova assinatura do mesmo cliente e some sozinho no expurgo; nenhuma coleção nova entra no `account-erasure.ts` |
| D11 | Livro sem `profileId` e sem `customer` | guardar para detalhamento futuro | detalhamento está fora do corte; menos dado pessoal |
| D12 | Nome do plano: cache `planLabel` resolvido no webhook, best-effort, 3 s, sem retry, 7 dias | gravar o catálogo a partir de `GET /payments/plans`; usar só `price.nickname` | o webhook é quem escreve dado de cobrança; um GET do usuário comum que grava é efeito colateral; `nickname` costuma ser vazio. Ver P4 |
| D13 | Falha ao resolver nome nunca derruba o webhook | falhar para a Stripe reentregar | o nome é cosmético; reentregar por ele atrasaria o registro da fatura |
| D14 | Planos contam `LIVE_SUBSCRIPTION_STATUSES` | só `active` | é a regra única do repo para assinatura viva (`payments.ts:20-26`) e o que a auditoria da spec descreve; a descrição do cartão diz que pagamento pendente conta. Ver P3 |
| D15 | Plano = preço (`priceId`), rótulo com intervalo | agrupar por produto | cada preço é um plano no `PlanDTO` e na aba do usuário; mensal e anual do mesmo produto são vendas diferentes |
| D16 | Até 5 barras, 4 + "Outros" quando passa | todas as barras | o design system tem 5 cores de gráfico e o eixo não esconde rótulo |
| D17 | Mês e datas em UTC | fuso do navegador via `x-user-timezone` | o prefetch do servidor não conhece o fuso e a chave de cache é a mesma; o número mudaria na hidratação. Ver P1 |
| D18 | Nenhum índice composto | filtro de `deletedAt` na consulta | a fila de 6 índices não publicados não cresce; mesmo argumento de `findByStripeCustomerId` |
| D19 | Uma rota com os três blocos | três rotas | os três vêm da mesma configuração e falham juntos; nenhum depende de índice próprio |
| D20 | Remover o eco do evento na resposta do webhook | deixar para `api-hardening` | defeito no arquivo que a tarefa altera, e `invoice.paid` traz e-mail e endereço |
| D21 | Receita conta toda `invoice.paid`, inclusive fatura manual e de valor zero | só faturas de assinatura com valor | é dinheiro recebido pela Stripe; fatura zero soma zero |
| D22 | Perfil apagado: fatura entra na receita, sai da contagem de planos, contratação vira "Usuário removido" | ignorar a fatura sem dono | resolve o risco da spec: o dinheiro entrou e deve aparecer |
| D23 | Novo `summary()` em `PaymentsActions` | action nova `BillingActions` | o recurso da API é `payments`; `UserActions` já mistura métodos comuns e de admin |
| D24 | Sem teste de emulador na suíte | teste de integração do webhook no Vitest | o CI é hermético; o emulador entra na rodada B do `/test` |
| D25 | Não tratar `invoice.payment_action_required` | tratar SCA/3DS | o snapshot já reflete `incomplete`/`past_due` e a receita conta só o pago |

## Perguntas em aberto

Cada item já vem com a opção adotada; o `/cycle` não parou para perguntar.

- **P1. Em que fuso fecha o "mês corrente"?**
  Opções: (a) UTC; (b) fuso do navegador, pelo header `x-user-timezone` que a API já lê
  (`auth-request-context.ts:132-145`), sem prefetch no servidor; (c) variável de ambiente com o fuso do
  fork. **Adotada: (a).** Determinístico, igual no servidor e no navegador, sem env nova. O custo é que um
  admin no Brasil vê a virada do mês às 21h do último dia. (b) perde o prefetch; (c) acrescenta
  configuração.

- **P2. O que conta como "ativação"?**
  Opções: (a) a primeira fatura paga da assinatura (`subscription_create`); (b) o primeiro evento
  `customer.subscription.*` com status vivo; (c) `subscription.start_date`. **Adotada: (a).** É o instante
  exato e não transforma a renovação de um assinante antigo em contratação nova. Consequência: sem
  `invoice.paid` no endpoint, contratações também ficam vazias, e o aviso da seção cobre isso.

- **P3. "Planos mais vendidos" conta quais situações?**
  Opções: (a) `LIVE_SUBSCRIPTION_STATUSES` (ativa, em teste, pagamento pendente, não paga, pausada); (b) só
  `active`. **Adotada: (a)**, com a descrição do cartão dizendo que pagamento pendente conta. Se o produto
  preferir (b), é trocar a lista numa função e a copy.

- **P4. De onde vem o nome do plano?**
  Opções: (a) cache resolvido pelo webhook com uma chamada best-effort à Stripe; (b) gravar o catálogo toda
  vez que um usuário comum abre a aba de planos; (c) só `price.nickname`, sem chamada. **Adotada: (a).**
  Fica 🔒 a resolução real. Um fork que já vende vê "Plano sem nome" até o próximo evento de cada preço.

- **P5. Escala da contagem de planos e da receita.**
  Ambas leem um documento por assinatura vigente ou por fatura do mês a cada abertura da home. **Adotada:
  aceitar no MVP**, com gatilho de 5 000 para migrar para documento de contagem mantido pelo webhook.

- **P6. Remover o eco do evento na resposta do webhook nesta entrega.**
  **Adotada: sim.** Muda uma asserção de teste. Se a preferência for manter o escopo estrito, é reverter
  uma linha.

## Achados fora do escopo (para o backlog)

- **A1. Soft delete de usuário pelo admin não cancela a assinatura** (já no `specs/BACKLOG.md:229`, pergunta 3).
  Com esta entrega, o perfil apagado sai da contagem de planos enquanto a Stripe segue cobrando e a receita
  segue contando. A seção deixa isso visível em vez de esconder.
- **A2. `formatPeriodEnd` não fixa fuso** (`apps/app/shared/lib/formatPlanPrice.ts:77-85`). A aba de billing do
  usuário comum pode escrever datas diferentes no servidor e no navegador perto da meia-noite. Não entra
  aqui porque a aba não é tocada.
- **A3. A exportação de dados do titular não leva `subscriptionActivation`.** O documento só tem ids da
  Stripe e uma data, e o próprio titular vê as faturas no Customer Portal; registrar para quando
  `data-rights-lgpd` for revisitada.

## Riscos

- **Payload do harness.** O `/test` monta `invoice.paid` à mão. Os campos lidos são poucos e tipados por
  `stripe@19.1.0` (seção 1.1), mas a forma real na versão `2025-09-30.clover` só a Stripe prova.
- **Versão do endpoint.** Numa versão anterior a 2025-03-31, `parent.subscription_details` não vem; o
  fallback pela linha da fatura cobre a assinatura, mas o preço (`pricing.price_details`) também mudou de
  lugar e sairia `null`. A exigência de versão do §12 continua valendo.
- **Latência do webhook.** `ensurePlanLabel` soma até 3 s em evento com preço novo ou cache vencido. A Stripe
  espera resposta em alguns segundos; o teto fica abaixo disso, mas o `/review` deve conferir o timeout na
  chamada.
- **Hidratação.** Moeda e data formatadas no servidor e no navegador dependem do ICU de cada um. Com locale e
  fuso explícitos a saída costuma bater; o `/test` confere o console.
- **Número de dinheiro na tela.** O critério escrito junto do valor e o "não substitui a contabilidade" são
  parte do contrato, não enfeite; o `/review` deve tratá-los como requisito.
