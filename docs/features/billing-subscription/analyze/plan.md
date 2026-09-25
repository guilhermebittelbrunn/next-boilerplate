# Plano: assinatura Stripe de ponta a ponta

Spec de origem: [`docs/features/billing-subscription/spec.md`](../spec.md). Plano feito numa
rodada autônoma do `/cycle`: nenhuma pergunta foi feita ao usuário. Onde a spec decide, o plano segue a
spec; onde ela é omissa, segue o padrão `entity`; onde há ambiguidade real, escolhe o menor raio de impacto
e registra a escolha em [Perguntas em aberto](#perguntas-em-aberto).

Branch: nenhuma. Quem cria e nomeia é o `revisor-codigo`, no `/review`.

---

## Etapa 1. Análise

### 1. Contexto

**Resumo.** O usuário comum escolhe um plano na aba `/account?tab=billing`, paga no Stripe Checkout, volta
para o app com o resultado na tela e passa a ver plano, situação e fim do período gravados no próprio
perfil. O webhook deixa de ser stub e reconcilia criação, troca e cancelamento de assinatura, com dedupe
por `event.id`. O Customer Portal cobre troca de plano, cartão e cancelamento. A exclusão de conta passa a
cancelar a assinatura antes de apagar o perfil, e a exportação de dados passa a levar o estado da
assinatura.

**Objetivos (os seis itens do corte da spec + a obrigação transferida):**

| # | Item da spec | Onde é entregue |
|---|--------------|-----------------|
| C1 | Usuário autenticado vê os planos ativos do catálogo Stripe, com preço e moeda | `GET /payments/plans` + `AccountBillingPanel` |
| C2 | Escolher um plano leva ao Checkout e volta ao app com o resultado visível | `POST /payments/checkout` + aviso `checkout=success\|canceled` |
| C3 | Estado da assinatura gravado no perfil e lido pela UI | `user.stripeCustomerId` + `user.subscription`, lidos via `GET /account` |
| C4 | Webhook reconcilia criado/atualizado/cancelado sem efeito duplicado em reentrega | `POST /webhooks/payments` + coleção `paymentEvent` + regra de ordem |
| C5 | Assinante abre o portal da Stripe | `POST /payments/portal` |
| C6 | CTAs do `pricing` da `apps/web` levam ao fluxo real no modo `subscription` | `apps/web/.../pricing/page.tsx` |
| C7 | Passo `billing` do expurgo cancela a assinatura; exportação leva o estado | `account-erasure.ts`, `account-export.ts` |

**Fora de escopo** (da spec, sem mudança): trial, cupom, downgrade proporcional, reembolso e faturas em UI
própria; gate de acesso por plano; cobrança por organização; endurecimento do webhook além da idempotência
(fila, retry, alerta, e o 500 que a rota devolve para assinatura inválida, que é de `api-hardening`).

Também fica fora, por decisão desta análise: bloquear acesso em `past_due` (a spec recomenda só exibir),
pré-selecionar o plano a partir do CTA da web, traduzir nome e descrição de produto (vêm da Stripe num
idioma só), trilha de auditoria de checkout/portal e cancelamento da assinatura no soft delete feito pelo
admin (`apps/api/app/(routes)/users/[id]/route.ts:117`), que vira achado.

**Corte de MVP.** A menor fatia que entrega valor observável é exatamente a lista acima. Não há abstração
de "provedor de pagamento": a Stripe é o único caso e fica assim.

**Apps impactados:** `packages/payments`, `packages/sdk`, `apps/api`, `apps/app`, `apps/web`,
`packages/internationalization`, docs.

**Área do painel:** comum (`(common)`). O admin não ganha tela; `requireCommonPanelApi` recusa perfil admin
com `COMMON_PANEL_FORBIDDEN` (`apps/api/app/(guards)/common-panel.ts:77-82`).

**Modo de produto.** A cobrança só existe em `subscription`. No `simple`, a aba de billing e o item da
sidebar somem, e a API responde como "não configurado". Isso precisa ser feito aqui porque, medido agora,
**nenhum arquivo de `apps/app` lê o modo de produto** (`rg "product-mode|PRODUCT_MODE" apps/app` não
encontra nada), então hoje o usuário comum de um fork `simple` alcança o painel comum inteiro. Ver o
achado A1 no fim.

**Dependência de assinatura:** esta feature grava o estado, não aplica gate (spec, "Fora do corte").

**Dependências externas e env:** Stripe. Nenhuma env nova. `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`
já existem (`packages/payments/keys.ts:7-8`, `apps/api/.env.example`). A API usa `NEXT_PUBLIC_APP_URL`, já
redeclarado em `apps/api/env.ts:32-34,44`, para montar as URLs de retorno. A `apps/web` passa a redeclarar
`NEXT_PUBLIC_APP_URL` (ver D12).

**Genérico × específico.** Tudo aqui é genérico: planos vêm do catálogo do fork, não há regra de produto.
`packages/payments` é pacote de integração e pode crescer (política do `/cycle`, §2).

**Zero dependência nova.** `stripe@19.1.0` já está em `packages/payments/package.json:14`. Nada de serviço
pago novo no repositório; a conta Stripe de cada fork é pré-requisito manual.

#### 1.1 Fontes

- Spec (lida por completo), `docs/PAYMENTS.md`, `.claude/skills/payments-flow/SKILL.md`,
  `.claude/cycle-policy.md`, `docs/feature-analysis-guide.md`, slice `entity`.
- Tipos da Stripe instalados: `node_modules/stripe` 19.1.0. Com a versão de API fixada em
  `packages/payments/index.ts:5` (`2025-09-30.clover`), `current_period_end` **não existe** em
  `Subscription` (`types/Subscriptions.d.ts` não tem o campo) e vive no item
  (`types/SubscriptionItems.d.ts:53`). O plano lê o fim do período do primeiro item.
- `generateTestHeaderString` existe em `types/Webhooks.d.ts:92`: é o que permite assinar evento de teste
  sem conta Stripe.
- Referências não lidas: nenhuma.

#### 1.2 Estado atual medido (o que o código faz hoje)

| Fato | Evidência |
|------|-----------|
| `getStripe()` devolve `null` sem chave | `packages/payments/index.ts:14-24` |
| `paymentsAgentToolkit` é construído em escopo de módulo com `secretKey \|\| ""` | `packages/payments/ai.ts:4-5` |
| `keys.ts` usa `.optional()` sem normalizar string vazia e desliga validação sem secret | `packages/payments/keys.ts:7-14` |
| Handlers do webhook são stubs; só dois eventos roteados | `apps/api/app/(routes)/webhooks/payments/route.ts:10-27,51-65` |
| Sem configuração, o webhook responde **200** `Not configured` e o evento se perde | `route.ts:32-34` |
| **Defeito:** em `next dev` o webhook sempre responde `Not configured`, mesmo com as chaves no `.env` | `route.ts:32` lê `env.STRIPE_WEBHOOK_SECRET` de `@/env`; `apps/api/env.ts:46` liga `skipValidation` em development, e o `createEnv` devolve só o `runtimeEnv` do próprio módulo (`@t3-oss/env-core/dist/src-Bb3GbGAa.js:36-37`: `if (skip) return runtimeEnv;`), que não declara o segredo. `pnpm --filter api dev:with-stripe` nunca funcionou |
| `UserDTO` não tem assinatura nem cliente Stripe | `packages/sdk/src/types/user/user.ts:42-60` |
| `Client` tem sete actions, nenhuma `payments` | `packages/sdk/src/client/index.ts:13-31` |
| Aba billing renderiza placeholder | `AccountTabs.tsx:84-86`, `AccountBillingPlaceholder.tsx:6-22` |
| Passo `billing` do expurgo responde `skipped: billing-not-linked` | `apps/api/(shared)/lib/account-erasure.ts:67-78` |
| A exportação espalha o documento de perfil inteiro no bloco `account` | `apps/api/(shared)/lib/account-export.ts:37-59` |
| `GET /account` devolve o documento de perfil mesclado com o Auth | `apps/api/app/(routes)/account/route.ts:97-105` |
| **Defeito:** na `apps/web`, `env.NEXT_PUBLIC_APP_URL` é sempre `undefined` | `apps/web/env.ts:7-30` usa `skipValidation: true` e não redeclara a variável, que só vem de `core()`; mesmo mecanismo da linha acima. Os CTAs de `pricing/page.tsx:75-85,118-128`, `hero.tsx:44`, `cta.tsx:35` e o link do painel em `header/index.tsx:35-38` sempre caem no fallback |
| O redirect de sessão guarda só o `pathname`, sem query | `apps/app/proxy.ts:186` |

### 2. Dados (Firestore)

#### 2.1 Coleção `user` (existente): dois campos novos

| Campo | Tipo | Default | `null`? | Justificativa |
|-------|------|---------|---------|---------------|
| `stripeCustomerId` | `string` | ausente | sim | Liga o perfil ao cliente Stripe. Gravado no primeiro checkout, antes de a sessão existir, para que todo evento de assinatura ache o perfil pelo `customer`. Nome já usado em `docs/PAYMENTS.md` e na skill; alternativa descartada: `billingCustomerId` (genérico demais para um campo que só a Stripe preenche). |
| `subscription` | `SubscriptionState` (mapa) | ausente | sim | Último estado conhecido da assinatura, escrito só pelo webhook. Nome da skill e da spec. |

Forma de `subscription` no documento:

```ts
{
  subscriptionId: "sub_…",
  status: "active",                 // Stripe.Subscription.Status
  priceId: "price_…" | null,
  productId: "prod_…" | null,
  unitAmount: 2900 | null,          // menor unidade da moeda
  currency: "brl" | null,
  interval: "month" | null,         // day | week | month | year
  intervalCount: 1 | null,
  currentPeriodEnd: Timestamp | null,   // items.data[0].current_period_end
  cancelAtPeriodEnd: false,
  lastEventAt: Timestamp            // event.created, usado na regra de ordem
}
```

`unitAmount`/`currency`/`interval` ficam no snapshot para que o card "Plano atual" funcione mesmo quando o
preço foi arquivado no catálogo ou quando a listagem de planos falha.

**Ownership:** o próprio documento de perfil; nenhum id vem do body.

**Documentos antigos:** ficam válidos. Ausência de `subscription` significa "sem assinatura", e a UI trata
`undefined` e `null` igual. Sem backfill.

#### 2.2 Coleção nova `paymentEvent` (dedupe do webhook)

Nome em camelCase singular, como `auditEvent` (`audit-event.repository.ts:76`). O id do documento é o
`event.id` da Stripe.

```ts
{ type: "customer.subscription.updated", createdAt: Date, expiresAt: Date /* createdAt + 30 dias */ }
```

`expiresAt` existe para uma política de TTL opcional (pré-requisito de infra, não bloqueador). A Stripe
reentrega por até 3 dias; 30 dias cobre com folga.

#### 2.3 Consultas

| Consulta | Forma | Índice |
|----------|-------|--------|
| Perfil por cliente Stripe | `where("stripeCustomerId", "==", id)` e filtro de `deletedAt` em memória | Só o índice automático de campo único. Nenhum índice composto novo, logo nada a publicar. |
| Evento já processado | `doc(event.id).get()` | Nenhum |
| Aplicar snapshot | `runTransaction` lendo e escrevendo o doc do perfil | Nenhum |

O limite do `BaseRepository` não pesa aqui: nenhuma listagem, e o filtro em memória atua sobre no máximo
um ou dois documentos por cliente.

**Regras do Firestore:** sem mudança. A API usa o Admin SDK e o deny-all continua valendo
(`firestore.rules`).

### 3. Contrato `@repo/sdk`

Tipos novos em `packages/sdk/src/types/payments/payments.ts` (+ `index.ts`, exportado em
`packages/sdk/src/types/index.ts`). Action nova `PaymentsActions` em
`packages/sdk/src/actions/payments/action.ts`, registrada no `Client` como `payments`, contexto `common`.

`UserDTO` ganha `stripeCustomerId?` e `subscription?` (persistido, com `Date`). `AccountDTO` sobrescreve
`subscription` com a forma serializada (datas ISO), seguindo o par `OnboardingState`/`OnboardingStateDTO`
de `user.ts:24-33`.

**Quem quebra:** ninguém. Campos são opcionais. `AccountDTO` passa a ser
`Omit<UserWithAuthDTO, "subscription"> & {…}`; os consumidores (`rg AccountDTO apps packages`) só leem
campos que continuam lá. `AccountDataExportDTO.account` herda o campo novo automaticamente.

### 4. API (`apps/api`)

#### 4.1 Rotas

| Método e path | Guard | O que faz |
|---------------|-------|-----------|
| `GET /payments/plans` | `requireCommonPanelApi` | `{ data: { enabled, plans } }`. Com a cobrança desligada, `enabled: false` e `plans: []`, status 200 (ver D5). |
| `POST /payments/checkout` | `requireCommonPanelApi` | Valida `priceId`, garante o cliente Stripe, cria a sessão e devolve `{ data: { url } }`. |
| `POST /payments/portal` | `requireCommonPanelApi` | Exige `stripeCustomerId`, cria a sessão do portal, devolve `{ data: { url } }`. |
| `POST /webhooks/payments` | nenhum (assinatura Stripe) | Verifica, deduplica, despacha, marca processado. |

"Cobrança ligada" (`isBillingEnabled()`) = `isSubscriptionMode()` **e** as duas chaves Stripe **e**
`NEXT_PUBLIC_APP_URL`. O webhook depende só das duas chaves (`isPaymentsConfigured()`), porque um evento
que chega precisa ser reconciliado em qualquer modo.

**Impersonação:** o guard já recusa escrita personificada com `AUTH_REQUEST_IMPERSONATION_READ_ONLY` 403
(`apps/api/(shared)/lib/impersonation-read-only.ts:19-31`), o que cobre checkout e portal sem código novo.
`GET /payments/plans` é leitura e segue aberto.

**CORS:** nenhum header novo.

#### 4.2 Validação (Zod), `apps/api/(shared)/validation/payments.schema.ts`

```ts
const PRICE_ID_MAX = 255;
const localeSchema = z.enum(["pt-br", "en", "es"]).optional();

export const createCheckoutSchema = z.object({
    priceId: z.string().trim().startsWith("price_").max(PRICE_ID_MAX),
    locale: localeSchema,
});
export const openPortalSchema = z.object({ locale: localeSchema });
// parseCreateCheckout / parseOpenPortal no formato { ok, value } | { ok, response }
// com VALIDATION_FAILED 400, igual a entity.schema.ts:74-87
```

O portal aceita body ausente: o handler usa `parseRequestJson` só quando há corpo, ou o schema aceita `{}`
(o desenvolvedor escolhe o que o helper permitir sem gambiarra).

#### 4.3 Persistência

- `userRepository` (`apps/api/(shared)/repositories/user.repository.ts`) ganha:
  - `findByStripeCustomerId(customerId)`: consulta de campo único, filtra `deletedAt` em memória, devolve o
    primeiro com `id`, no mesmo formato de `findByReferenceId` (`:27-42`).
  - `linkStripeCustomer(id, customerId)`: `update({ id, stripeCustomerId })`.
  - `applySubscriptionState(id, next, eventType)`: `runTransaction`, lê o doc, chama a função pura
    `decideSubscriptionWrite(stored, next, eventType)` e grava só se a decisão for `apply`. Devolve
    `"applied" | "skipped" | "missing"`.
- `paymentEventRepository` novo em `(shared)/repositories/payment-event.repository.ts`, estende
  `BaseRepository` só para herdar `db`/`table`:
  - `wasProcessed(eventId): Promise<boolean>`
  - `markProcessed(event): Promise<void>`: `doc(id).create(...)` engolindo `ALREADY_EXISTS` (código 6),
    mesmo padrão de `auditEventRepository.appendOnce` (`audit-event.repository.ts:88-108`).
- Sem mapper novo: a coleção `user` não tem mapper (`user.repository.ts:24`), e a conversão
  `Timestamp` → ISO para a UI já acontece em `serializeFirestoreData` (`user.mapper.ts:30-57`), usado por
  `GET /account`.

#### 4.4 Regra de reconciliação (o que faz o estado bater)

Função pura em `apps/api/(shared)/lib/billing-state.ts`, testada em matriz:

1. Nada gravado, ou gravada outra assinatura → aplica, **exceto** quando a gravada está viva e a nova não
   está (um `deleted` atrasado de uma assinatura antiga não derruba a atual).
2. Mesma assinatura já `canceled` → ignora (cancelamento é terminal na Stripe).
3. Mesma assinatura e evento `customer.subscription.created` → ignora (é por definição o estado mais
   antigo; resolve o empate de segundo entre `created` e `updated`).
4. Mesma assinatura e `event.created` menor que `lastEventAt` → ignora (evento fora de ordem).
5. Caso contrário → aplica.

Status "vivos": `active`, `trialing`, `past_due`, `unpaid`, `paused`. A lista fica no SDK
(`LIVE_SUBSCRIPTION_STATUSES`) porque a UI usa a mesma regra para decidir entre "Assinar" e "Gerenciar".

#### 4.5 Protocolo do webhook

```
verifica assinatura (constructEvent, segredo via getWebhookSecret())
  └ já processado? → 200 { ok: true, duplicate: true }, nenhum handler roda
  └ despacha:
      checkout.session.completed      → liga customer ao perfil de client_reference_id, se faltar
      customer.subscription.created   ┐
      customer.subscription.updated   ├ perfil por customer (fallback metadata.profileId)
      customer.subscription.deleted   ┘ → applySubscriptionState
      outro tipo                      → log webhook-unhandled-event (inclui subscription_schedule.canceled)
  └ markProcessed(event)             → só depois de o handler terminar
  └ handler lançou                   → 500, não marca, a Stripe reentrega
  └ perfil não encontrado            → log webhook-profile-not-found, 200, marca processado
```

`subscription_schedule.canceled` sai do roteamento: cancelar um *schedule* não cancela a assinatura, então
o handler atual estava semanticamente errado. O cancelamento real chega como
`customer.subscription.deleted`.

Sem configuração, o webhook passa a responder **503** `{ error: { code: "PAYMENTS_NOT_CONFIGURED" } }` em
vez de 200 (ver D6).

#### 4.6 Checkout, portal e catálogo (`apps/api/(shared)/lib/billing.ts`)

- **Catálogo:** `stripe.prices.list({ active: true, type: "recurring", expand: ["data.product"], limit: 100 })`,
  descarta produto inativo ou apagado, ordena por `unit_amount` crescente, mapeia para `PlanDTO` (nome e
  descrição do produto, `marketing_features[].name` como `features`).
- **Checkout:**
  1. Cobrança desligada → 503 `PAYMENTS_NOT_CONFIGURED`.
  2. `subjectProfile.subscription` com status vivo → 409 `PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE` (evita a
     cobrança duplicada que a spec cita).
  3. `stripe.prices.retrieve(priceId)`: inexistente (`resource_missing`), inativo ou não recorrente → 404
     `PAYMENTS_PLAN_NOT_FOUND`. Não se confia no `priceId` do body.
  4. Cliente: reusa `stripeCustomerId`; senão `stripe.customers.create({ email, metadata: { profileId } },
     { idempotencyKey: "customer-<profileId>" })` e grava com `linkStripeCustomer`. A chave de idempotência
     faz dois cliques concorrentes (ou uma gravação que falhou e foi repetida em até 24 h) devolverem o mesmo
     cliente.
  5. `stripe.checkout.sessions.create({ mode: "subscription", customer, line_items: [{ price, quantity: 1 }],
     client_reference_id: profileId, metadata: { profileId }, subscription_data: { metadata: { profileId } },
     success_url: <app>/<locale>/account?tab=billing&checkout=success, cancel_url: …&checkout=canceled,
     locale: <stripeLocale> })`.
  6. Qualquer erro da Stripe fora dos casos acima → 503 `PAYMENTS_PROVIDER_UNAVAILABLE`.
- **Portal:** desligada → 503; sem `stripeCustomerId` → 409 `PAYMENTS_CUSTOMER_NOT_FOUND`;
  `stripe.billingPortal.sessions.create({ customer, return_url: <app>/<locale>/account?tab=billing, locale })`;
  erro → 503 `PAYMENTS_PROVIDER_UNAVAILABLE`.
- `locale` ausente → `getDefaultLocale()` de `@repo/internationalization/utils`. Mapeamento para a Stripe:
  `pt-br → "pt-BR"`, `en → "en"`, `es → "es"`.
- Email do cliente: `ctx.user.email`. Sob impersonação a escrita já foi recusada, então ator e titular são a
  mesma pessoa.

#### 4.7 Erros novos

| `error.code` | Status | Quando |
|--------------|--------|--------|
| `PAYMENTS_NOT_CONFIGURED` | 503 | checkout/portal com cobrança desligada; webhook sem as duas chaves |
| `PAYMENTS_PLAN_NOT_FOUND` | 404 | `priceId` inexistente, inativo ou não recorrente |
| `PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE` | 409 | checkout com assinatura viva |
| `PAYMENTS_CUSTOMER_NOT_FOUND` | 409 | portal sem cliente Stripe ligado |
| `PAYMENTS_PROVIDER_UNAVAILABLE` | 503 | a Stripe recusou ou falhou (chave inválida, rede, 5xx) |
| `ACCOUNT_DELETION_BILLING_FAILED` | 503 | a exclusão não conseguiu cancelar a assinatura; nada foi apagado |

`VALIDATION_FAILED` (400), `AUTH_INVALID_TOKEN` (401), `COMMON_PANEL_FORBIDDEN` (403) e
`AUTH_REQUEST_IMPERSONATION_READ_ONLY` (403) já existem. `HTTP_STATUS` não tem 502, e por isso falha de
provedor usa 503, como `STORAGE_NOT_CONFIGURED` (`files/route.ts:14-18`); acrescentar 502 em
`packages/shared` seria mudança fora da tarefa.

Os seis códigos entram em `apiErrors` nos três idiomas
(`packages/internationalization/translations/packages/shared/utils.ts`).

#### 4.8 Exclusão e exportação (obrigação transferida)

**Expurgo** (`account-erasure.ts`):

- `billing` passa a ser o **primeiro** passo. Hoje é o segundo (`:94-96`), depois de `storage`.
- `cancelBilling(profile)`:
  - sem `subscription` viva → `skipped: "no-subscription"`;
  - viva e `getStripe()` nulo → `failed: "billing-not-configured"`;
  - viva → `stripe.subscriptions.cancel(subscriptionId)`; `resource_missing` conta como `done` (já não
    existe); outro erro → `failed` com o nome do erro, como `reasonOf` já faz (`:32-36`).
- Se `billing` falhar, `runAccountErasure` para ali e devolve os demais passos como
  `skipped: "billing-failed"`. Continua coerente com o comentário de `:80-88`: parar no meio é pior que
  terminar **ou não começar**, e com `billing` primeiro nada foi apagado ainda.
- A rota de exclusão (`account/deletion/route.ts:74-89`) passa a checar o passo `billing` antes de
  `authAccount`: `failed` → 503 `ACCOUNT_DELETION_BILLING_FAILED`. A conta fica intacta e o titular pode
  tentar de novo.
- O comentário "Extension point…" (`:67-71`) sai; o motivo `billing-not-linked` deixa de existir.

**Exportação** (`account-export.ts`): o bloco `account` já recebe `subscription` e `stripeCustomerId`
porque espalha o documento mesclado (`:40-44`). O plano torna isso explícito em `toExportAccount`
(`:37-59`): `subscription` e `stripeCustomerId` normalizados para `null` quando ausentes, como `phone` e
`avatar` já são, para o arquivo ter sempre as duas chaves. Um teste prova que o estado chega ao arquivo.

#### 4.9 Configuração que falha cedo

- `packages/payments/keys.ts`: `runtimeEnv` com `process.env.X || undefined` nas duas chaves (string vazia é
  ausência, regra da política §3) e **sem** `skipValidation`. Com a normalização, ausente passa no
  `.optional()`; uma chave malformada (ex.: `pk_…` no lugar da secret) derruba o boot com mensagem do Zod.
- `packages/payments/index.ts`: `getWebhookSecret(): string | null` e `isPaymentsConfigured(): boolean`,
  ambos lendo `keys()` do próprio pacote. O webhook deixa de ler `@/env`, o que corrige o defeito do
  `next dev`.
- `apps/api/instrumentation.ts`: com exatamente uma das duas chaves presente, `console.warn` no boot
  dizendo que a cobrança está desligada e qual falta, no mesmo formato do aviso do `ARCJET_KEY`
  (`:26-30`). Não derruba o processo: sem as duas, nada cobra, então o risco é de funcionalidade, não de
  dinheiro.
- `packages/payments/ai.ts`: `paymentsAgentToolkit` vira `getPaymentsAgentToolkit(): StripeAgentToolkit | null`,
  construído sob demanda como `getStripe()`. Resolve o 🔴 da spec antes que alguém importe o módulo.

### 5. Front-end

#### 5.1 `apps/app`

- `AccountTabs.tsx`: a aba `billing` renderiza `AccountBillingPanel` no lugar do placeholder (`:84-86`).
  Com `!isSubscriptionMode()`, a aba sai de `accountTabValues` (`:20-26`) e `?tab=billing` cai em
  `profile` via `resolveTab` (`:30-33`).
- `routes.tsx`: o item `billing` (`:51-54`) só entra na lista em modo `subscription`.
- `AccountBillingPanel.tsx` (novo, `"use client"`), estados:

| Estado | Como se produz | O que aparece |
|--------|----------------|---------------|
| Carregando | primeira carga de planos | skeleton do design system |
| Desligado | `enabled: false` (sem chaves, sem app URL ou modo `simple`) | `AccountBillingPlaceholder`, **sem mudança** (a UI volta ao que existia) |
| Erro nos planos | `PAYMENTS_PROVIDER_UNAVAILABLE` ou rede | texto `billing.loadError`; o card de plano atual continua, se houver assinatura |
| Catálogo vazio | `enabled: true`, `plans: []` | texto `billing.noPlans` |
| Sem assinatura viva | `subscription` ausente, `null` ou `canceled` | cards de plano (nome, preço/intervalo, descrição, features) com botão "Assinar" |
| Assinatura viva | status em `LIVE_SUBSCRIPTION_STATUSES` | card "Plano atual": nome (resolvido pelo `priceId` nos planos; fallback `billing.unknownPlan`), preço do snapshot, badge de status, "Renova em"/"Termina em" (`cancelAtPeriodEnd`), botão "Gerenciar assinatura" |
| `past_due`/`unpaid` | status | texto `billing.pastDueHint` no card |
| Voltou do checkout | `?checkout=success` | alerta "Confirmando o pagamento…"; revalida `account.me` a cada 3 s, até 10 vezes, e troca para "Assinatura ativa." quando o status fica vivo |
| Cancelou o checkout | `?checkout=canceled` | alerta neutro "Pagamento cancelado. Nenhuma cobrança foi feita." |
| Personificando | `useAuthRequestPanel().isImpersonating` | botões desabilitados, como em `AccountPrivacyPanel.tsx:92,130` |
| Redirecionando | mutation pendente | todos os botões de plano e o de gerenciar desabilitados, o clicado com `loading` |

- Hooks em `account/(hooks)/`:
  - `useListPlans.tsx`: `useListPlans` + `fetchPlans` no mesmo arquivo, com `useAuthorizedQuery`
    (`shared/hooks/useAuthorizedQuery.ts:21-35`) e `queryKeys.payments.plans()`.
  - `usePaymentsMutations.tsx`: `checkoutMutation` e `portalMutation`; sucesso →
    `window.location.assign(url)`; erro → `errorAlert(handleClientError(new FormattedError(error, locale)))`,
    como `useAccountDataRights.tsx:49-59`.
- `shared/lib/queryKeys.ts`: `payments: { all: ["payments"], plans: () => [...all, "plans"] }`.
- `shared/lib/formatPlanPrice.ts` (novo, puro): `Intl.NumberFormat(bcp47, { style: "currency", currency })`
  com o expoente da moeda tirado de `resolvedOptions().maximumFractionDigits`, para não dividir JPY por 100.
  `unitAmount` nulo → `null` (UI omite o preço).
- Sem prefetch RSC dos planos: é uma aba entre cinco e a chamada vai à Stripe; buscar no servidor em toda
  visita a `/account` custaria uma chamada externa para quem abriu o perfil. `account.me` continua com o
  prefetch que já tem (`account/(pages)/(home)/page.tsx:16-24`).

#### 5.2 `apps/web`

- `apps/web/env.ts`: redeclara `NEXT_PUBLIC_APP_URL` em `client` e `runtimeEnv`, como o comentário de
  `:10-12` manda fazer para toda variável estendida.
- `apps/web/shared/lib/pricingCta.ts` (novo, puro): `resolvePlanCtaHref({ appUrl, locale, subscriptionMode })`:
  modo `subscription` com `appUrl` → `${appUrl}/${locale}/account?tab=billing`; senão o comportamento atual
  (`appUrl || /${locale}/sign-up`).
- `pricing/page.tsx:75-85,118-128`: os dois CTAs usam o helper. O terceiro (contato) não muda.

Efeito colateral declarado da redeclaração: `hero.tsx:44`, `cta.tsx:35` e o link do painel no header
(`header/index.tsx:35-38`) passam a usar a URL do app quando ela estiver configurada, que é o que o código
deles já pretende. Ver D12.

Limitação conhecida: um visitante sem sessão que clica no CTA passa pelo sign-in do app e volta para
`/account` na aba de perfil, porque `apps/app/proxy.ts:186` guarda só o `pathname`. Ver pergunta P6.

#### 5.3 i18n

Chaves novas em `translations/apps/app/pages/common/account.ts`, bloco `billing` (as duas existentes,
`emptyTitle` e `emptyDescription`, continuam). Árvore na seção 10.5. Seis códigos em `apiErrors`. Nenhuma
chave nova na `apps/web`.

### 6. Autorização e segurança

- Checkout, portal e catálogo passam pelo guard; a chave secreta nunca sai do servidor.
- O perfil do checkout é sempre `ctx.subjectProfile`; nenhum id do body é usado para achar perfil.
- O webhook confia só no que passou por `constructEvent`. O `client_reference_id` e o `metadata.profileId`
  chegam dentro do evento assinado.
- Impersonação: checkout e portal recusados pelo guard (403), botões desabilitados na UI; a leitura dos
  planos e do estado segue aberta, que é o propósito do modo.
- Admin: 403 `COMMON_PANEL_FORBIDDEN` nas três rotas.
- `stripeCustomerId` aparece em `GET /account` e na exportação. É dado do próprio titular e não dá acesso a
  nada sem a chave secreta.
- Logs: `logEvent("payments", …)` com `eventType`, `requestId` e o resultado (`applied`/`skipped`); nunca
  email, nunca payload.
- Arcjet: sem ajuste.

### 7. Testes (Vitest)

Nível mais barato que prova cada comportamento. Nenhum teste da suíte depende de emulador ou de rede: o
emulador entra só no roteiro do `/test` (seção 8).

| Arquivo | Nível | Prova |
|---------|-------|-------|
| `packages/payments/__tests__/paymentsConfig.test.ts` | unit | `isPaymentsConfigured` com as duas, uma, nenhuma e strings vazias; `getWebhookSecret` |
| `packages/payments/__tests__/keys.test.ts` | unit | string vazia vira `undefined` e não derruba; chave malformada lança |
| `packages/payments/__tests__/aiToolkit.test.ts` | unit (mock de `@stripe/agent-toolkit/ai-sdk`) | `null` sem chave; nada construído no import |
| `apps/api/__tests__/billingState.test.ts` | unit puro | matriz de `decideSubscriptionWrite` (as 5 regras + a exceção da regra 1); `toSubscriptionState` lendo o fim do período do item; `toPlanDTO` e o filtro de produto inativo |
| `apps/api/__tests__/paymentsPlansRoute.test.ts` | rota, `vi.mock` de `@repo/payments` e do repositório | desligado por chave, por modo `simple` e por falta de app URL → 200 `enabled: false`; ligado → mapeia e ordena; Stripe lança → 503 `PAYMENTS_PROVIDER_UNAVAILABLE`; sem token → 401; admin → 403 |
| `apps/api/__tests__/paymentsCheckoutRoute.test.ts` | rota | 503 desligado; 400 body inválido; 404 preço ausente/inativo/avulso; 409 assinatura viva; reusa cliente; cria cliente com `idempotencyKey` e grava o vínculo; parâmetros da sessão (referência, metadata, URLs com locale, locale Stripe); 503 em falha; 403 personificando (guard real) |
| `apps/api/__tests__/paymentsPortalRoute.test.ts` | rota | 503 desligado; 409 sem cliente; `return_url` com locale; 503 em falha; 403 personificando |
| `apps/api/__tests__/paymentsWebhookRoute.test.ts` (existente, 13 casos) | rota | adaptar os 3 casos de "sem configuração" para 503 `PAYMENTS_NOT_CONFIGURED`; segredo vindo de `getWebhookSecret` (não de `@/env`); duplicado não chama handler; marca só depois do handler; handler lança → 500 e não marca; vínculo no `checkout.session.completed`; `created/updated/deleted` chamam `applySubscriptionState` com o perfil achado pelo customer e pelo fallback de metadata; perfil ausente → 200 com log; `subscription_schedule.canceled` passa a ser não tratado |
| `apps/api/__tests__/paymentEventRepository.test.ts` | unit, db falso | `ALREADY_EXISTS` engolido; outros erros sobem; `wasProcessed` |
| `apps/api/__tests__/userRepositoryBilling.test.ts` | unit, db falso | `findByStripeCustomerId` ignora perfil soft-deletado; `applySubscriptionState` grava ou não conforme a decisão, dentro da transação |
| `apps/api/__tests__/accountErasure.test.ts` (existente) | unit | ordem com `billing` primeiro; `no-subscription`; cancela quando viva; `resource_missing` → `done`; falha para o expurgo e nada mais roda; `billing-not-configured` |
| `apps/api/__tests__/accountDeletionRoute.test.ts` (existente) | rota | `billing` falhou → 503 `ACCOUNT_DELETION_BILLING_FAILED` e `deleteUser` não é chamado |
| `apps/api/__tests__/accountExportRoute.test.ts` (existente) | rota | `subscription` e `stripeCustomerId` no arquivo; `null` quando ausentes |
| `apps/api/__tests__/instrumentation.test.ts` (existente) | unit | aviso com meia configuração; silêncio com as duas ou nenhuma |
| `apps/app/__tests__/formatPlanPrice.test.ts` | unit puro | BRL, USD, JPY, valor nulo |
| `apps/app/__tests__/accountBillingPanel.test.tsx` | componente, mocks de hooks | todos os estados da tabela 5.1, incluindo personificação e o alerta de retorno |
| `apps/app/__tests__/usePaymentsMutations.test.tsx` | hook | sucesso → `window.location.assign(url)`; erro → `errorAlert` com a mensagem de `FormattedError` |
| `apps/app/__tests__/accountTabsOverflow.test.tsx` (existente) | componente | trocar o mock do placeholder pelo do painel; caso novo: modo `simple` tem 4 abas |
| `apps/app/__tests__/commonNavRoutes.test.tsx` | hook | item billing some no modo `simple` |
| `apps/web/__tests__/pricingCta.test.ts` | unit puro | os três ramos do helper |
| `packages/internationalization/__tests__/parity.test.ts` (existente) | unit | paridade das chaves novas nos 3 idiomas |

### 8. O que o `/test` vai percorrer

O `/test` roda duas configurações da API. Nenhuma usa conta Stripe real, e nenhum valor abaixo é segredo.

**Rodada A, degradada (como o repo vem):** chaves vazias, emulador de Auth e Firestore com `pnpm seed`.

1. Aba `/account?tab=billing` com usuário comum → placeholder "Cobrança em breve" igual ao de hoje, light,
   dark, mobile, 3 idiomas.
2. `curl` autenticado em `POST /payments/checkout` e `POST /payments/portal` → 503 `PAYMENTS_NOT_CONFIGURED`;
   `GET /payments/plans` → 200 `enabled: false`; `POST /webhooks/payments` → 503.
3. `pnpm --filter api build` e `pnpm --filter app build` sem nenhuma variável da Stripe → passam.
4. Com `NEXT_PUBLIC_PRODUCT_MODE=simple` no app: aba billing e item da sidebar ausentes; `?tab=billing` abre
   o perfil.

**Rodada B, configurada offline:** a API sobe com `STRIPE_SECRET_KEY=sk_test_offline_qa` e
`STRIPE_WEBHOOK_SECRET=whsec_offline_qa` **no ambiente do processo**, não no `.env` versionado. As strings são
falsas de propósito: passam no formato, a Stripe recusa qualquer chamada de rede, e a assinatura de webhook
é HMAC local.

1. Aba billing → planos com erro (`billing.loadError`), porque a Stripe recusa a chave falsa: prova que a
   falha do provedor vira `PAYMENTS_PROVIDER_UNAVAILABLE` e não 500.
2. Harness temporário (script Node resolvido a partir de `packages/payments`, removido ao fim) assina
   payloads com `stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_offline_qa" })` e faz POST
   no webhook:
   - `checkout.session.completed` com `client_reference_id=<profileId do usuário de QA>` e
     `customer=cus_qa` → o documento `user` no emulador ganha `stripeCustomerId`;
   - `customer.subscription.created` (status `active`, preço com `unit_amount`/`currency`/`recurring`) → o
     doc ganha `subscription`; a aba mostra o card "Plano atual" com preço do snapshot, badge "Ativa",
     "Renova em", botão "Gerenciar assinatura";
   - o mesmo evento reenviado com o mesmo `id` → resposta `duplicate: true`, documento idêntico
     (`updatedAt` inclusive);
   - `customer.subscription.updated` com `created` anterior ao último → documento não muda;
   - `customer.subscription.updated` com `status: past_due` → badge e texto de pagamento pendente;
   - `customer.subscription.deleted` → status `canceled`, a aba volta a mostrar os planos (com o erro de
     catálogo, por causa da chave falsa);
   - assinatura adulterada → 500, documento não muda.
3. "Gerenciar assinatura" com o estado ativo → toast traduzido de `PAYMENTS_PROVIDER_UNAVAILABLE` nos 3
   idiomas.
4. Exclusão de conta de um usuário de QA com assinatura ativa gravada pelo harness → 503
   `ACCOUNT_DELETION_BILLING_FAILED`, conta ainda entra, perfil intacto no emulador. Sem assinatura → a
   exclusão segue como hoje.
5. Exportação do mesmo usuário → JSON com `account.subscription` e `account.stripeCustomerId`.
6. `GET /account` personificando o usuário de QA → estado visível; botões desabilitados; POST de checkout
   com headers de personificação → 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY`.
7. `?checkout=success` e `?checkout=canceled` abertos à mão → alertas corretos; com o estado já ativo,
   "Assinatura ativa."
8. `apps/web` `/pricing` em modo `subscription` com `NEXT_PUBLIC_APP_URL` → os dois primeiros CTAs apontam para
   `<app>/<locale>/account?tab=billing`; em `simple` → comportamento anterior.

Dados de QA: usuários `qa-billing@example.com` e `qa-billing-delete@example.com` no emulador, listados no
relatório para limpeza.

**Não observável sem conta Stripe real (vira 🔒, não reprovação):** página real do Checkout e pagamento com
cartão de teste; redirect de volta com a assinatura criada pela Stripe; página real do Customer Portal e
cancelamento por ela refletindo no app; listagem de um catálogo real; cancelamento bem-sucedido no expurgo
contra a Stripe (coberto só por teste com cliente mockado); entrega real de webhook pela Stripe ou pelo
`stripe listen`.

### 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Sem chaves Stripe, o painel mostra o mesmo placeholder de hoje**
  Com `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` vazias, a aba `/account?tab=billing` renderiza o
  `AccountBillingPlaceholder` com a copy atual nos 3 idiomas, em light, dark e mobile. `GET /payments/plans`
  responde 200 com `{ enabled: false, plans: [] }` e nenhuma requisição sai para a Stripe. Prova: rodada A do
  `/test` e `paymentsPlansRoute.test.ts`.

- [ ] **Sem chaves Stripe, as escritas respondem com código, nunca 500**
  `POST /payments/checkout` e `POST /payments/portal` respondem 503 `PAYMENTS_NOT_CONFIGURED`; o webhook
  responde 503 com o mesmo código e não lê o corpo. String vazia conta como ausência. Prova: testes de rota
  e `curl` na rodada A.

- [ ] **Build e boot passam sem nenhuma variável da Stripe**
  `pnpm --filter api build` e `pnpm --filter app build` passam com as variáveis vazias ou ausentes. Com só uma
  das duas chaves, a API sobe e emite um aviso `[payments]` no boot dizendo qual falta; a cobrança fica
  desligada. Uma chave malformada (prefixo errado) derruba o boot com erro de validação. Prova:
  `instrumentation.test.ts`, `keys.test.ts`, build na rodada A.

- [ ] **Modo `simple` não tem cobrança**
  Com `NEXT_PUBLIC_PRODUCT_MODE=simple`, a aba billing some de `AccountTabs`, o item some da sidebar e
  `?tab=billing` abre a aba de perfil. A API trata como desligado (`enabled: false`, 503 nas escritas) mesmo
  com chaves presentes. Prova: `accountTabsOverflow.test.tsx`, `commonNavRoutes.test.tsx`, teste de rota e
  rodada A.

- [ ] **Planos ativos com preço e moeda**
  Com a cobrança ligada, a aba lista os preços recorrentes ativos cujo produto está ativo, do mais barato ao
  mais caro, com nome, descrição, features e preço formatado na moeda do preço e no locale da tela (JPY sem
  casas decimais). Catálogo vazio mostra `billing.noPlans`; falha da Stripe mostra `billing.loadError` e a
  API responde 503 `PAYMENTS_PROVIDER_UNAVAILABLE`. Prova: `paymentsPlansRoute.test.ts`,
  `billingState.test.ts`, `formatPlanPrice.test.ts`; catálogo real 🔒.

- [ ] **Checkout valida o preço e não duplica assinatura**
  `priceId` fora do formato → 400 `VALIDATION_FAILED`; preço inexistente, inativo ou avulso → 404
  `PAYMENTS_PLAN_NOT_FOUND`; usuário com assinatura viva (`active`, `trialing`, `past_due`, `unpaid`,
  `paused`) → 409 `PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE`. O clique desabilita todos os botões até o
  redirect, e dois pedidos concorrentes reusam o mesmo cliente Stripe pela chave de idempotência. Prova:
  `paymentsCheckoutRoute.test.ts`, `accountBillingPanel.test.tsx`.

- [ ] **Checkout leva à Stripe e volta com o resultado visível**
  A sessão é criada com o cliente do perfil, `client_reference_id` e `metadata.profileId`, locale da tela, e
  URLs de retorno `<app>/<locale>/account?tab=billing&checkout=success|canceled`. Voltando com `success`, a
  aba avisa que está confirmando e revalida o estado até ele ficar vivo; com `canceled`, avisa que nada foi
  cobrado. Prova: teste de rota e de componente; alertas abertos à mão na rodada B; ida e volta real 🔒.

- [ ] **Estado gravado no perfil e lido pela UI**
  O documento `user` guarda `stripeCustomerId` e `subscription` (status, preço, valor, moeda, intervalo, fim
  do período, cancelamento agendado). A aba lê o estado de `GET /account`, sem chamar a Stripe para isso, e
  mostra o card "Plano atual" mesmo quando a listagem de planos falha. Perfil antigo sem os campos lê como
  "sem assinatura". Prova: rodada B, passo 2.

- [ ] **Webhook reconcilia criação, troca e cancelamento**
  `customer.subscription.created`, `updated` e `deleted` atualizam `subscription` no perfil achado por
  `stripeCustomerId`, com fallback para `metadata.profileId`. `checkout.session.completed` liga o cliente ao
  perfil quando o vínculo falta. `subscription_schedule.canceled` passa a ser só registrado. Perfil não
  encontrado responde 200 e registra `webhook-profile-not-found`. Prova: `paymentsWebhookRoute.test.ts` e
  rodada B.

- [ ] **Reentrega e fora de ordem não mudam o estado**
  Evento com `id` já processado responde 200 `duplicate: true` sem rodar handler nem tocar o documento.
  Evento mais antigo que o último aplicado é ignorado; `created` depois de `updated` da mesma assinatura é
  ignorado; nada ressuscita uma assinatura `canceled`; o `deleted` atrasado de uma assinatura antiga não
  derruba a atual. Handler que falha responde 500 e não marca o evento, para a Stripe reentregar. Prova:
  `billingState.test.ts`, teste de rota, rodada B.

- [ ] **Portal para quem tem cliente Stripe**
  "Gerenciar assinatura" aparece só com assinatura viva e abre o Customer Portal com retorno para a aba
  billing no locale da tela. Sem cliente ligado → 409 `PAYMENTS_CUSTOMER_NOT_FOUND`; falha da Stripe → 503 com
  toast traduzido. Prova: `paymentsPortalRoute.test.ts`, rodada B passo 3; portal real 🔒.

- [ ] **`past_due` é exibido, não bloqueado**
  Status `past_due` ou `unpaid` mostra o badge correspondente e o texto pedindo para atualizar o cartão; o
  acesso ao resto do painel não muda. Prova: `accountBillingPanel.test.tsx`, rodada B.

- [ ] **Personificação é só leitura**
  Um admin personificando vê o estado e os planos, com os botões desabilitados; checkout e portal com headers
  de personificação respondem 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY`. Admin sem personificar recebe 403
  `COMMON_PANEL_FORBIDDEN`; sem token, 401 `AUTH_INVALID_TOKEN`. Prova: testes de rota com o guard real e
  rodada B.

- [ ] **Exclusão de conta cancela a assinatura antes de apagar**
  O passo `billing` roda primeiro. Sem assinatura viva → `skipped: no-subscription` e a exclusão segue.
  Com assinatura viva, cancela na Stripe; assinatura que a Stripe já não tem conta como feita. Se o
  cancelamento falhar, ou se a Stripe não estiver configurada, nada é apagado e a rota responde 503
  `ACCOUNT_DELETION_BILLING_FAILED`. Prova: `accountErasure.test.ts`, `accountDeletionRoute.test.ts`, rodada B
  passo 4 (caminho de falha); cancelamento real 🔒.

- [ ] **Exportação leva o estado da assinatura**
  O arquivo de `GET /account/export` traz `account.subscription` e `account.stripeCustomerId`, com `null`
  quando não existem. Prova: `accountExportRoute.test.ts`, rodada B passo 5.

- [ ] **CTAs do pricing levam ao fluxo real**
  Em modo `subscription` com `NEXT_PUBLIC_APP_URL`, os CTAs dos dois primeiros planos da `apps/web` apontam para
  `<app>/<locale>/account?tab=billing`; em `simple` ou sem a URL, o destino é o de antes. O de contato não
  muda. Prova: `pricingCta.test.ts`, rodada B passo 8.

- [ ] **Copy e erros nos 3 idiomas**
  Todo texto novo da aba e os seis códigos novos existem em pt-br, en e es, com a mesma estrutura. Nenhuma
  string solta em JSX. Prova: `parity.test.ts` e a passada nos 3 idiomas.

### 9.1 Pré-requisitos manuais de infra

O `/develop` não satisfaz nenhum destes e o `/test` não reprova por eles. Todos vão para
`docs/PRE-PRODUCTION.md`, numa seção "Stripe, só se o fork cobra assinatura".

1. Criar produtos e preços **recorrentes** no Dashboard da Stripe de cada fork (ou com
   `getPaymentsAgentToolkit()`).
2. Configurar o Customer Portal: cancelamento, troca de plano (com a lista de produtos) e atualização de
   cartão; reembolso conforme a lei aplicável.
3. Registrar o endpoint `https://<api>/webhooks/payments` com os eventos `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated` e `customer.subscription.deleted`, **na
   versão de API `2025-09-30.clover`**. Numa versão anterior a 2025-03-31, o payload traz o fim do período em
   outro lugar e o snapshot grava `currentPeriodEnd: null`.
4. `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` no ambiente da `apps/api` (Vercel), e
   `NEXT_PUBLIC_APP_URL` no ambiente da `apps/api` e da `apps/web`.
5. Opcional: política de TTL do Firestore no campo `expiresAt` da coleção `paymentEvent`.
6. Atualizar a declaração "até onde a exclusão de conta alcança" (`PRE-PRODUCTION.md:562-582`): o passo
   `billing` deixa de ser `skipped: billing-not-linked`.

---

## Etapa 2. Blueprint técnico

### 10.1 Contrato (`packages/sdk/src/types/payments/payments.ts`)

```ts
import type { UserPreferences } from "../user/user";

export const SUBSCRIPTION_STATUSES = [
    "active", "trialing", "past_due", "unpaid", "paused",
    "incomplete", "incomplete_expired", "canceled",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Statuses in which the customer still holds (or is still being billed for) the plan. */
export const LIVE_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
    "active", "trialing", "past_due", "unpaid", "paused",
];

export type PlanInterval = "day" | "week" | "month" | "year";

export type SubscriptionState = {
    subscriptionId: string;
    status: SubscriptionStatus;
    priceId: string | null;
    productId: string | null;
    unitAmount: number | null;
    currency: string | null;
    interval: PlanInterval | null;
    intervalCount: number | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    lastEventAt: Date;
};

export type SubscriptionStateDTO = Omit<SubscriptionState, "currentPeriodEnd" | "lastEventAt"> & {
    currentPeriodEnd: string | null;
    lastEventAt: string;
};

export type PlanDTO = {
    priceId: string;
    productId: string;
    name: string;
    description: string | null;
    features: string[];
    unitAmount: number | null;
    currency: string;
    interval: PlanInterval;
    intervalCount: number;
};

export type PaymentPlansDTO = { enabled: boolean; plans: PlanDTO[] };
export type CreateCheckoutRequest = { priceId: string; locale?: UserPreferences["locale"] };
export type OpenPortalRequest = { locale?: UserPreferences["locale"] };
export type PaymentRedirectDTO = { url: string };
```

Pseudo-diffs do contrato:

```diff
// packages/sdk/src/types/user/user.ts  (UserDTO, :42-60)
     onboarding?: OnboardingState | null;
+    stripeCustomerId?: string | null;
+    /** Written only by the payments webhook. Absent means the profile never subscribed. */
+    subscription?: SubscriptionState | null;
 };

// packages/sdk/src/types/account/account.ts  (:4-9)
-export type AccountDTO = UserWithAuthDTO & {
+export type AccountDTO = Omit<UserWithAuthDTO, "subscription"> & {
     phone: string | null;
     avatar: string | null;
     avatarUrl: string | null;
     preferences: UserPreferences;
+    subscription?: SubscriptionStateDTO | null;
 };

// packages/sdk/src/types/index.ts
+export * from "./payments";

// packages/sdk/src/client/index.ts  (:13-31)
+import PaymentsActions from "../actions/payments/action";
 …
+    payments!: PaymentsActions;
 …
+        this.payments = new PaymentsActions(this);
```

Action (`packages/sdk/src/actions/payments/action.ts`), mesmo molde de `actions/account/action.ts`:

```ts
export default class PaymentsActions {
    constructor(private readonly client: Client) { this.client = client; }

    async listPlans(): Promise<PaymentPlansDTO>            // GET  /payments/plans
    async createCheckout(body: CreateCheckoutRequest): Promise<PaymentRedirectDTO>  // POST /payments/checkout
    async openPortal(body?: OpenPortalRequest): Promise<PaymentRedirectDTO>         // POST /payments/portal
}
```

### 10.2 Rotas

Esqueleto do checkout (`apps/api/app/(routes)/payments/checkout/route.ts`):

```ts
export const POST = requireCommonPanelApi(async (req, ctx) => {
    const stripe = getStripe();
    if (!(stripe && isBillingEnabled())) return errorResponse("PAYMENTS_NOT_CONFIGURED", 503);

    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const parsed = parseCreateCheckout(parsedBody.value);
    if (!parsed.ok) return parsed.response;

    if (isLiveSubscription(ctx.subjectProfile.subscription)) {
        return errorResponse("PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE", 409);
    }

    const locale = parsed.value.locale ?? getDefaultLocale();
    try {
        const price = await findRecurringPrice(stripe, parsed.value.priceId);
        if (!price) return errorResponse("PAYMENTS_PLAN_NOT_FOUND", 404);

        const customerId = await ensureStripeCustomer(stripe, ctx.subjectProfile, ctx.user.email ?? null);
        const url = await createCheckoutSession(stripe, { customerId, priceId: price.id,
            profileId: ctx.subjectProfile.id, locale });
        return Response.json({ data: { url } });
    } catch {
        logEvent("payments", "checkout-failed", { requestId: requestIdFrom(req) });
        return errorResponse("PAYMENTS_PROVIDER_UNAVAILABLE", 503);
    }
});
```

Exemplos:

```http
POST /payments/checkout
{ "priceId": "price_1Qx…", "locale": "pt-br" }

200 { "data": { "url": "https://checkout.stripe.com/c/pay/cs_test_…" } }
409 { "error": { "code": "PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE" } }
```

```http
GET /payments/plans

200 { "data": { "enabled": true, "plans": [
  { "priceId": "price_1Qx…", "productId": "prod_R…", "name": "Pro", "description": "Para times pequenos",
    "features": ["5 membros", "Suporte por e-mail"], "unitAmount": 2900, "currency": "brl",
    "interval": "month", "intervalCount": 1 } ] } }

200 { "data": { "enabled": false, "plans": [] } }
```

Webhook, pseudo-diff (`apps/api/app/(routes)/webhooks/payments/route.ts`):

```diff
-/** biome-ignore-all lint/suspicious/useAwait: … stubs … */
-import { env } from "@/env";
+import { getStripe, getWebhookSecret, isPaymentsConfigured } from "@repo/payments";
+import { paymentEventRepository } from "@/(shared)/repositories/payment-event.repository";
+import { userRepository } from "@/(shared)/repositories/user.repository";
+import { toSubscriptionState } from "@/(shared)/lib/billing-state";

-const handleCheckoutSessionCompleted = async (data) => { /* TODO */ };
-const handleSubscriptionScheduleCanceled = async (data) => { /* TODO */ };
+const linkCheckoutCustomer = async (session: Stripe.Checkout.Session) => { … };
+const reconcileSubscription = async (event: Stripe.Event, subscription: Stripe.Subscription) => { … };

 export const POST = async (request: Request): Promise<Response> => {
     const stripe = getStripe();
-    if (!(stripe && env.STRIPE_WEBHOOK_SECRET)) {
-        return NextResponse.json({ message: "Not configured", ok: false });
+    const secret = getWebhookSecret();
+    if (!(stripe && secret && isPaymentsConfigured())) {
+        return NextResponse.json({ error: { code: "PAYMENTS_NOT_CONFIGURED" } }, { status: 503 });
     }
     …
-    const event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
+    const event = stripe.webhooks.constructEvent(body, signature, secret);
+    if (await paymentEventRepository.wasProcessed(event.id)) {
+        return NextResponse.json({ ok: true, duplicate: true });
+    }
     switch (event.type) {
-        case "checkout.session.completed": …handleCheckoutSessionCompleted
-        case "subscription_schedule.canceled": …
+        case "checkout.session.completed": await linkCheckoutCustomer(event.data.object); break;
+        case "customer.subscription.created":
+        case "customer.subscription.updated":
+        case "customer.subscription.deleted":
+            await reconcileSubscription(event, event.data.object); break;
         default: logEvent("payments", "webhook-unhandled-event", { eventType: event.type });
     }
+    await paymentEventRepository.markProcessed(event);
     return NextResponse.json({ result: event, ok: true });
```

Tabela `error.code` → status: seção 4.7.

### 10.3 Persistência

```ts
// apps/api/(shared)/lib/billing-state.ts  (puro, sem cliente Stripe)
export function isLiveSubscription(state: { status?: string } | null | undefined): boolean;
export function toSubscriptionState(subscription: Stripe.Subscription, eventCreatedSeconds: number): SubscriptionState;
export function toPlanDTO(price: Stripe.Price): PlanDTO | null;   // null para produto inativo/apagado
export type SubscriptionWriteDecision = { kind: "apply" } | { kind: "skip"; reason:
    "stale" | "terminal" | "created-after-known" | "older-subscription-ended" };
export function decideSubscriptionWrite(stored: unknown, next: SubscriptionState,
    eventType: Stripe.Event.Type): SubscriptionWriteDecision;

// apps/api/(shared)/lib/billing.ts  (fala com a Stripe)
export function isBillingEnabled(): boolean;
export function toStripeLocale(locale: Locale): "pt-BR" | "en" | "es";
export function billingReturnUrl(locale: Locale, outcome?: "success" | "canceled"): string;
export async function listPlans(stripe: Stripe): Promise<PlanDTO[]>;
export async function findRecurringPrice(stripe: Stripe, priceId: string): Promise<Stripe.Price | null>;
export async function ensureStripeCustomer(stripe: Stripe, profile: UserDTO, email: string | null): Promise<string>;
export async function createCheckoutSession(stripe: Stripe, input: {…}): Promise<string>;
export async function createPortalSession(stripe: Stripe, customerId: string, locale: Locale): Promise<string>;
export async function cancelSubscriptionForErasure(stripe: Stripe, subscriptionId: string): Promise<void>;
```

`decideSubscriptionWrite` recebe `stored: unknown` porque vem do documento cru (datas como `Timestamp`); a
comparação usa `normalizeFirestoreInstant` de `@repo/shared/utils`.

### 10.4 Front, árvore de arquivos

```
apps/app/app/[locale]/(authenticated)/(common)/
├── routes.tsx                                   (alterado: item billing só em subscription)
└── (pages)/account/
    ├── (components)/
    │   ├── AccountTabs.tsx                      (alterado)
    │   ├── AccountBillingPanel.tsx              (novo)
    │   ├── AccountBillingPlaceholder.tsx        (sem mudança; reusado no estado desligado)
    │   └── BillingPlanCard.tsx                  (novo, se o painel passar de ~150 linhas)
    └── (hooks)/
        ├── useListPlans.tsx                     (novo)
        └── usePaymentsMutations.tsx             (novo)
apps/app/shared/lib/queryKeys.ts                 (alterado)
apps/app/shared/lib/formatPlanPrice.ts           (novo)
apps/web/env.ts                                  (alterado)
apps/web/shared/lib/pricingCta.ts                (novo)
apps/web/app/[locale]/pricing/page.tsx           (alterado)
```

Sem formulário RHF: a seleção é um botão por card, sem campo a validar. Componentes do design system:
`Card`, `Badge`, `Button` (com `loading`), `Alert`, `Skeleton`.

```diff
// AccountTabs.tsx
+import { isSubscriptionMode } from "@repo/next-config/product-mode";
-import { AccountBillingPlaceholder } from "./AccountBillingPlaceholder";
+import { AccountBillingPanel } from "./AccountBillingPanel";
 …
-const accountTabValues = ["profile", "security", "preferences", "billing", "privacy"] as const;
+const allAccountTabValues = ["profile", "security", "preferences", "billing", "privacy"] as const;
+const accountTabValues = isSubscriptionMode()
+    ? allAccountTabValues
+    : allAccountTabValues.filter((value) => value !== "billing");
 …
-            <TabsContent value="billing">
-                <AccountBillingPlaceholder />
-            </TabsContent>
+            {accountTabValues.includes("billing") ? (
+                <TabsContent value="billing">
+                    <AccountBillingPanel account={account} />
+                </TabsContent>
+            ) : null}
```

`isSubscriptionMode()` lê `process.env.NEXT_PUBLIC_PRODUCT_MODE`, inlinado no build
(`packages/next-config/product-mode.ts:9-25`), então é seguro no cliente; o teste controla o valor com
`vi.stubEnv` ou mock do módulo.

```diff
// apps/web/app/[locale]/pricing/page.tsx  (:75-85 e :118-128)
+import { isSubscriptionMode } from "@repo/next-config/product-mode";
+import { resolvePlanCtaHref } from "@/shared/lib/pricingCta";
 …
+    const planCtaHref = resolvePlanCtaHref({
+        appUrl: env.NEXT_PUBLIC_APP_URL,
+        locale,
+        subscriptionMode: isSubscriptionMode(),
+    });
 …
-<Link href={env.NEXT_PUBLIC_APP_URL || `/${locale}/sign-up`}>
+<Link href={planCtaHref}>
```

### 10.5 i18n

`translations/apps/app/pages/common/account.ts`, bloco `billing` (pt-br abaixo; en e es com a mesma
árvore):

```ts
billing: {
    emptyTitle: "Cobrança em breve",            // existente
    emptyDescription: "…",                       // existente
    description: "Escolha um plano ou gerencie a sua assinatura.",
    plansTitle: "Planos",
    noPlans: "Nenhum plano disponível no momento.",
    loadError: "Não foi possível carregar os planos.",
    subscribe: "Assinar",
    manage: "Gerenciar assinatura",
    currentPlan: "Plano atual",
    unknownPlan: "Plano contratado",
    pricePerInterval: "{price} / {interval}",
    pricePerIntervals: "{price} a cada {count} {interval}",
    interval: {
        day: { one: "dia", other: "dias" },
        week: { one: "semana", other: "semanas" },
        month: { one: "mês", other: "meses" },
        year: { one: "ano", other: "anos" },
    },
    status: {
        active: "Ativa", trialing: "Em teste", past_due: "Pagamento pendente", unpaid: "Não paga",
        paused: "Pausada", incomplete: "Incompleta", incomplete_expired: "Expirada", canceled: "Cancelada",
    },
    renewsOn: "Renova em {date}",
    endsOn: "Termina em {date}",
    pastDueHint: "O último pagamento não foi aprovado. Atualize o cartão para manter a assinatura.",
    checkoutPending: "Confirmando o pagamento. A assinatura aparece aqui em instantes.",
    checkoutConfirmed: "Assinatura ativa.",
    checkoutCanceled: "Pagamento cancelado. Nenhuma cobrança foi feita.",
},
```

`translations/packages/shared/utils.ts`, `apiErrors` (pt-br; en e es equivalentes):

```ts
PAYMENTS_NOT_CONFIGURED: "A cobrança não está disponível neste ambiente.",
PAYMENTS_PLAN_NOT_FOUND: "Este plano não está mais disponível.",
PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE: "Você já tem uma assinatura ativa. Use Gerenciar assinatura para trocar de plano.",
PAYMENTS_CUSTOMER_NOT_FOUND: "Não há assinatura para gerenciar nesta conta.",
PAYMENTS_PROVIDER_UNAVAILABLE: "O serviço de pagamento não respondeu. Tente de novo em instantes.",
ACCOUNT_DELETION_BILLING_FAILED: "Não conseguimos cancelar a sua assinatura, então a conta não foi excluída. Tente de novo em instantes.",
```

### 10.6 Adaptação de código existente (pontos de atenção)

| Arquivo | Mudança | Atenção |
|---------|---------|---------|
| `packages/payments/keys.ts:7-14` | `\|\| undefined` nas duas chaves; remove `skipValidation` | chave malformada passa a derrubar `apps/api/env.ts` no import, em dev inclusive; é o comportamento pedido |
| `packages/payments/index.ts` | `getWebhookSecret`, `isPaymentsConfigured` | `server-only` continua; testes mockam como `getStripe.test.ts:8` |
| `packages/payments/ai.ts` | `getPaymentsAgentToolkit()` lazy | atualizar `docs/PAYMENTS.md:14,68` e `SKILL.md:14`, que citam o nome antigo |
| `apps/api/app/(routes)/webhooks/payments/route.ts` | persistência, dedupe, 503 | remove o `biome-ignore` de `:1` quando os handlers deixarem de ser stubs |
| `apps/api/(shared)/repositories/user.repository.ts` | 3 métodos | a transação usa `this.db.runTransaction`, API do Admin SDK |
| `apps/api/(shared)/lib/account-erasure.ts:13-19,67-78,94-108` | `billing` primeiro, cancelamento, parada | o tipo `ErasureStepName` não muda; o motivo `billing-not-linked` some |
| `apps/api/app/(routes)/account/deletion/route.ts:74-89` | checa `billing` antes de `authAccount` | resposta de sucesso inalterada |
| `apps/api/(shared)/lib/account-export.ts:37-59` | normaliza `subscription`/`stripeCustomerId` | `EXPORT_FORMAT.version` continua 1: o formato só ganha chaves |
| `apps/api/instrumentation.ts:26-30` | aviso de meia configuração | lê `process.env` direto, como o aviso do Arcjet |
| `apps/api/.env.example` | comentário acima de `STRIPE_*` explicando o modo degradado e os quatro eventos | sem valor preenchido |
| `apps/app/.env.example:23-24`, `apps/web/.env.example:5-6` | nada | as duas variáveis não são lidas por esses apps; vira achado A3, não muda aqui |
| `docs/PAYMENTS.md` | reescrever "Estado atual" com data de medição, tabela de eventos (sai `subscription_schedule.canceled`), 503 sem configuração, versão de API do endpoint | a política manda medir e corrigir doc ao passar por ele |
| `docs/PRE-PRODUCTION.md` | seção Stripe (9.1) + linha `billing` da declaração do expurgo | |

### 10.7 Ordem de implementação e de commit

1. `feat(payments): lazy agent toolkit, config helpers and empty-string-safe keys` (`packages/payments` + testes)
2. `feat(sdk): payments contract and subscription state on the profile` (`packages/sdk`)
3. `feat(api): plans, checkout and portal routes` (`billing.ts`, `billing-state.ts`, schema, 3 rotas, testes, `.env.example`)
4. `feat(api): reconcile subscriptions from the payments webhook` (repositórios, webhook, testes)
5. `feat(api): cancel the subscription before erasing an account and export its state` (erasure, deletion, export, testes)
6. `feat(api): warn at boot on a half-configured Stripe setup` (instrumentation + teste)
7. `feat(app): billing tab with plans, checkout and portal` (hooks, `formatPlanPrice`, painel, testes)
8. `feat(app): hide billing in simple product mode` (`AccountTabs`, `routes.tsx`, testes)
9. `feat(web): pricing CTAs lead to the app billing tab` (`env.ts`, helper, página, teste)
10. `feat(internationalization): billing copy and payments error codes`
11. `docs: payments state, Stripe pre-production steps and erasure reach` (`PAYMENTS.md`, `PRE-PRODUCTION.md`, `SKILL.md`)
12. `docs(features): billing-subscription` (sempre o último)

### 10.8 Env e config

Nenhuma variável nova. O que cada fork configura está em 9.1. Localmente, o `.env` da API continua com as
duas chaves vazias e tudo sobe degradado.

---

## Decisões tomadas sem perguntar

| # | Decisão | Alternativa descartada | Por quê |
|---|---------|------------------------|---------|
| D1 | Catálogo vem da Stripe em tempo real | config local tipada | recomendação da spec; o fork não mantém preço em dois lugares |
| D2 | Modo `simple` esconde aba e item, e a API trata como desligado | mostrar desabilitado | recomendação da spec; a API espelha a UI (regra de ouro 4) |
| D3 | `past_due` só é exibido | bloquear acesso | recomendação da spec; gate é de outra spec |
| D4 | Estado no documento `user` (`subscription` + `stripeCustomerId`) | coleção própria `subscription` | a spec pede "gravado no perfil"; `GET /account` e a exportação já levam o documento inteiro |
| D5 | `GET /payments/plans` desligado responde 200 `{ enabled: false }` | 503 `PAYMENTS_NOT_CONFIGURED` na leitura | a leitura descreve a configuração em vez de falhar; o app não tem helper para ler `error.code` de query e o React Query tentaria de novo (`QueryProvider.tsx:8,22`). As escritas continuam com o código. Ver P1 |
| D6 | Webhook sem configuração responde 503 com código | manter 200 `Not configured` | com 200 o evento se perde; com 503 a Stripe reentrega por até 3 dias e nada some enquanto o fork termina de configurar. Três testes mudam |
| D7 | Dedupe por `event.id` na coleção `paymentEvent`, marcado depois do handler | marcar antes de processar | marcar antes perde o evento quando o handler falha; a regra de ordem torna o reprocessamento concorrente inofensivo |
| D8 | Regra de ordem por `event.created` + regras de terminalidade, sem chamar a Stripe no webhook | reler a assinatura da Stripe a cada evento | reler custa uma chamada externa por evento e tornaria o webhook improvável sem conta real; os dados do payload bastam |
| D9 | Eventos `customer.subscription.created/updated/deleted` + `checkout.session.completed`; sai `subscription_schedule.canceled` | manter o schedule | cancelar um schedule não cancela a assinatura; o handler atual estava errado |
| D10 | Cliente Stripe criado no checkout, com chave de idempotência por perfil | criar no cadastro | não cria cliente para quem nunca vai pagar; a chave cobre clique duplo |
| D11 | Lógica Stripe em `apps/api/(shared)/lib/billing*.ts`; `packages/payments` ganha só config e o toolkit lazy | mover checkout/portal/catálogo para `packages/payments` | os testes de rota mockam num lugar só, e a lógica usa `UserDTO`/`PlanDTO` do SDK, que o pacote de integração não conhece. Ver P5 |
| D12 | Redeclarar `NEXT_PUBLIC_APP_URL` em `apps/web/env.ts` | helper que lê `process.env` só no pricing | é o padrão do próprio arquivo (`:10-12`); o efeito em hero, cta e header é o comportamento que o código já pretende. Desvio registrado |
| D13 | Webhook lê o segredo de `@repo/payments` | redeclarar `STRIPE_WEBHOOK_SECRET` em `apps/api/env.ts` | o segredo já tem dono no pacote; `getStripe()` já lê de lá |
| D14 | `billing` vira o primeiro passo do expurgo e, se falhar, o expurgo não começa | manter a ordem e só registrar a falha | apagar o perfil com a assinatura ativa perde o vínculo e deixa a pessoa sendo cobrada sem ninguém saber de quem é |
| D15 | Expurgo usa `subscriptions.cancel` imediato | `customers.del` | é o que a spec pede; apagar o cliente também remove histórico que a empresa pode precisar. Ver P3 |
| D16 | Stripe desligada + assinatura viva recusa a exclusão | apagar mesmo assim | mesma razão de D14. Ver P2 |
| D17 | Remover `skipValidation` de `packages/payments/keys.ts` e normalizar string vazia | manter | com a normalização ele não protege mais nada, e sem ele a chave malformada falha cedo, como a spec pede |
| D18 | Meia configuração só avisa no boot | derrubar o processo em produção | sem as duas chaves nada cobra; derrubar trocaria um risco de funcionalidade por indisponibilidade |
| D19 | Corrigir o toolkit lazy em `ai.ts` | deixar fora | o defeito é o mesmo que `getStripe()` corrigiu, custa poucas linhas, e a spec aponta que esta entrega é o que levaria alguém a importar o módulo |
| D20 | Falha da Stripe responde 503 `PAYMENTS_PROVIDER_UNAVAILABLE` | acrescentar 502 em `HTTP_STATUS` | segue `STORAGE_NOT_CONFIGURED` e não toca `packages/shared` |
| D21 | Sem prefetch RSC dos planos | prefetch em `/account` | a chamada vai à Stripe e só serve a uma das cinco abas |
| D22 | Nenhum teste da suíte depende de emulador ou rede | teste de integração do webhook contra o emulador | o CI roda os testes herméticos (`env: []`); o emulador entra no roteiro do `/test`, rodada B |

## Perguntas em aberto

Cada item já vem com a opção adotada; o `/cycle` não parou para perguntar.

- **P1. Leitura do catálogo com a cobrança desligada: 200 `{ enabled: false }` ou 503 com código?**
  Opções: (a) 200 com `enabled: false`; (b) 503 `PAYMENTS_NOT_CONFIGURED` e o app lê o código do erro.
  **Adotada: (a).** O app não tem hoje um jeito de ler `error.code` numa query, e o retry padrão atrasaria o
  placeholder. As escritas respondem 503 com código, como a política pede.

- **P2. Exclusão de conta quando há assinatura viva mas a Stripe foi desligada no fork.**
  Opções: (a) recusar com `ACCOUNT_DELETION_BILLING_FAILED` até alguém religar a Stripe ou cancelar à mão;
  (b) apagar e registrar a falha no log. **Adotada: (a)**, porque apagar deixa a pessoa sendo cobrada sem
  vínculo para achar de quem é a assinatura. O custo é que o direito de exclusão fica bloqueado enquanto o
  operador não resolve.

- **P3. No expurgo, cancelar a assinatura ou apagar o cliente Stripe (`customers.del`)?**
  Opções: (a) `subscriptions.cancel`; (b) `customers.del`, que também cancela e tira o email da Stripe.
  **Adotada: (a)**, que é o texto da spec. (b) apaga mais dado pessoal, mas também histórico que pode ser
  exigido para fins fiscais; é decisão de produto e jurídico de cada fork.

- **P4. Cancelamento no expurgo: imediato ou no fim do período?**
  **Adotada: imediato**, sem reembolso proporcional (reembolso está fora do corte). Um fork que queira
  reembolsar o período restante faz isso pelo Dashboard.

- **P5. Checkout, portal e catálogo em `packages/payments` ou em `apps/api`?**
  A spec diz que "`payments` ganha planos/checkout/portal". **Adotada: `apps/api/(shared)/lib/billing*.ts`**,
  com `packages/payments` ganhando só config e o toolkit lazy. A lógica depende de tipos do SDK que o pacote
  de integração não conhece, e os testes de rota ficam com um único ponto de mock. Mover depois é mecânico.

- **P6. Visitante sem sessão que clica no CTA do pricing volta para a aba de perfil, não para a de billing.**
  O redirect do proxy do app guarda só o `pathname` (`apps/app/proxy.ts:186`). Opções: (a) aceitar neste
  corte; (b) preservar a query no redirect de sessão, o que mexe em `proxy.ts` e em
  `postAuthRedirectTarget` (`packages/auth/redirect.ts`). **Adotada: (a)**, menor raio: auth fica intocado.
  Quem já tem sessão cai direto na aba.

- **P7. Webhook sem configuração: 503 (a Stripe reentrega) ou 200 (descarta)?**
  **Adotada: 503**, pela razão de D6. Se o fork preferir silêncio enquanto não configura, basta não registrar
  o endpoint na Stripe.

- **P8. Nome e descrição do plano vêm da Stripe num idioma só.** **Adotada: aceitar neste corte.** Traduzir
  exigiria `metadata` por idioma no produto ou config local, o que contradiz D1.

## Achados fora do escopo (para o backlog)

- **A1. O modo `simple` não restringe o painel comum.** `docs/AUTH-SSO.md:66-71` afirma que o layout
  `(common)` redireciona comum para a web e cita `commonUserUsesPanel()` e
  `apps/web/app/[locale]/(authenticated)/layout.tsx`; nenhum dos três existe (`rg` em `apps/app` por
  `product-mode` não acha nada; `packages/next-config/product-mode.ts` não exporta `commonUserUsesPanel`; o
  layout da web não existe). `PRE-PRODUCTION.md:586-588` repete a premissa. Esta entrega esconde só a
  billing; o resto do painel continua alcançável no `simple`. Precisa de spec ou correção de doc própria.
- **A2. Soft delete de usuário pelo admin não cancela assinatura** (`users/[id]/route.ts:117`). Com esta
  entrega, um usuário apagado pelo admin continua sendo cobrado.
- **A3. `apps/app/.env.example:23-24` e `apps/web/.env.example:5-6` publicam `STRIPE_*`**, que nenhum dos
  dois apps lê.
- **A4. O webhook responde 500 para assinatura inválida** (`route.ts:68-79`), o que faz a Stripe reentregar
  um evento que nunca vai validar. É de `api-hardening`.

## Riscos

- **Versão de API do endpoint.** Um endpoint registrado numa versão anterior a 2025-03-31 manda o fim do
  período em outro campo, e o snapshot grava `currentPeriodEnd: null` sem falhar. Mitigação: pré-requisito
  9.1.3 explícito e a UI omite a data quando ela é nula.
- **Transação no Firestore** não tem teste contra o emulador na suíte; a decisão é pura e testada, e a
  transação passa pelo `/test` na rodada B.
- **Harness do `/test`** assina payloads que imitam a Stripe. Um payload montado à mão pode divergir do real
  em campos que o código não lê; os campos lidos são poucos e estão tipados por `stripe@19.1.0`.
- **Efeito colateral da D12** na home da web: hero, cta e header passam a apontar para o app quando a URL
  estiver configurada. O `/test` confere os três.
- **Ordem do expurgo muda** e um teste existente (`accountErasure.test.ts:139-150`) será reescrito; o
  `/review` deve conferir que a mudança está na asserção e não num afrouxamento.
