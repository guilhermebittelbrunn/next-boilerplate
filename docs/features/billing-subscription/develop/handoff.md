# Handoff do develop: assinatura Stripe de ponta a ponta

Implementação do `analyze/plan.md` numa rodada autônoma do `/cycle`. Nenhuma dependência nova, nenhuma
credencial gravada em arquivo versionado. As chaves falsas (`sk_test_offline_qa`, `whsec_offline_qa`)
aparecem só dentro de testes e em variável de ambiente de processo no smoke. Nada foi commitado e nenhuma
branch foi criada.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---|---|
| 4.9 Config que falha cedo, D17, D19 | `packages/payments/keys.ts` (`\|\| undefined`, sem `skipValidation`), `index.ts` (`getWebhookSecret`, `isPaymentsConfigured`), `ai.ts` (`getPaymentsAgentToolkit()` sob demanda) |
| 10.1 Contrato | `packages/sdk/src/types/payments/{payments,index}.ts`, `types/index.ts`, `types/user/user.ts` (`stripeCustomerId?`, `subscription?`), `types/account/account.ts` (`subscription` serializada), `actions/payments/action.ts`, `client/index.ts` (`payments`) |
| 4.2 Validação | `apps/api/(shared)/validation/payments.schema.ts` |
| 4.4, 10.3 Regra de reconciliação | `apps/api/(shared)/lib/billing-state.ts` |
| 4.6 Checkout, portal, catálogo | `apps/api/(shared)/lib/billing.ts` |
| 4.3 Persistência | `apps/api/(shared)/repositories/user.repository.ts` (3 métodos), `payment-event.repository.ts` (novo) |
| 4.1 Rotas | `apps/api/app/(routes)/payments/{plans,checkout,portal}/route.ts` |
| 4.5 Webhook | `apps/api/app/(routes)/webhooks/payments/route.ts` (reescrito) |
| 4.8 Expurgo e exportação | `apps/api/(shared)/lib/account-erasure.ts`, `account-export.ts`, `app/(routes)/account/deletion/route.ts` |
| 4.9 Aviso de meia configuração | `apps/api/instrumentation.ts` |
| 10.6 `.env.example` | `apps/api/.env.example` (comentário acima de `STRIPE_*` e na `NEXT_PUBLIC_APP_URL`, sem valor) |
| 5.1 App | `shared/lib/queryKeys.ts`, `shared/lib/formatPlanPrice.ts`, `account/(hooks)/{useListPlans,usePaymentsMutations,useCheckoutConfirmation}.tsx`, `account/(components)/{AccountBillingPanel,BillingPlanCard}.tsx`, `AccountTabs.tsx`, `(common)/routes.tsx` |
| 5.2 Web | `apps/web/env.ts`, `shared/lib/pricingCta.ts`, `app/[locale]/pricing/page.tsx` |
| 5.3, 10.5 i18n | `translations/apps/app/pages/common/account.ts` (bloco `billing`), `translations/packages/shared/utils.ts` (6 códigos) |
| Docs | `docs/PAYMENTS.md` (reescrito), `docs/PRE-PRODUCTION.md` (item 12 e linha `billing` da declaração do expurgo), `.claude/skills/payments-flow/SKILL.md` (reescrita), `docs/SETUP.md` e `docs/SECURITY.md` (uma afirmação falsa em cada, ver desvios) |

## Contrato e raio de impacto

- `UserDTO` ganhou `stripeCustomerId?` e `subscription?` (opcionais). `AccountDTO` virou
  `Omit<UserWithAuthDTO, "subscription"> & { …, subscription?: SubscriptionStateDTO | null }`.
  `pnpm --filter app typecheck`, `api` e `web` passam sem mexer em consumidor existente.
- `apiClient.payments.listPlans()`, `.createCheckout({ priceId, locale })`, `.openPortal({ locale })`.
  Consumidores: `useListPlans`, `usePaymentsMutations`.
- Constante de runtime nova no SDK: `LIVE_SUBSCRIPTION_STATUSES` (usada por `billing-state.ts` e pelo painel).

## Códigos de erro novos

`PAYMENTS_NOT_CONFIGURED` (503), `PAYMENTS_PLAN_NOT_FOUND` (404), `PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE`
(409), `PAYMENTS_CUSTOMER_NOT_FOUND` (409), `PAYMENTS_PROVIDER_UNAVAILABLE` (503),
`ACCOUNT_DELETION_BILLING_FAILED` (503). Os seis estão em `apiErrors` nos 3 idiomas: `parity.test.ts`
passa, e `apps/app/__tests__/accountApiErrorCopy.test.ts` agora prova que cada um traduz nos 3 idiomas sem
cair na mensagem genérica (28 testes).

## Desvios do plano

1. **A afirmação "chave malformada derruba o boot" não se confirma como escrita (critério 3 do plano).**
   Medido: com `STRIPE_SECRET_KEY=pk_test_wrong_slot`, `pnpm --filter api build` sai com código 1 e
   `Invalid environment variables` apontando `STRIPE_SECRET_KEY`. Em runtime (`next start` já buildado), o
   processo **sobe** e toda requisição, inclusive `GET /health`, responde 500 com a mesma mensagem no log,
   porque o `proxy.ts` importa `@/env`, que estende `payments()`. É o mesmo comportamento que o repo já tem
   para `CORS_ORIGIN` ausente (medido no mesmo smoke). Não acrescentei validação no `instrumentation.ts`:
   ela também só roda quando chega a primeira requisição, então não mudaria nada. O `/test` deve medir o
   critério como "build falha; runtime responde 500 em tudo com a mensagem de validação".
2. **`incomplete_expired` também é terminal** em `decideSubscriptionWrite`, além de `canceled`. A Stripe não
   tira uma assinatura de nenhum dos dois estados; o plano só listava `canceled`.
3. **O fallback por `metadata.profileId` no webhook também grava o vínculo** (`linkStripeCustomer`) quando o
   perfil achado não tem `stripeCustomerId`. Sem isso, todo evento seguinte daquela assinatura repetiria o
   fallback.
4. **`resolveLocale` no lugar de `getDefaultLocale()`** nas rotas de checkout e portal. Faz o mesmo quando o
   corpo não traz locale e garante um `Locale` válido mesmo com `NEXT_PUBLIC_DEFAULT_LOCALE` inválido.
5. **Webhook sem `isPaymentsConfigured()`**: com `getStripe()` e `getWebhookSecret()` não nulos a condição já
   é a mesma, então a terceira checagem do pseudo-diff seria redundante.
6. **Portal sem corpo**: `req.body ? parseRequestJson(req) : {}`. O SDK sempre manda `{}`; o ramo sem corpo
   cobre um `curl` sem `-d`.
7. **Falha ao gravar o vínculo do cliente no Firestore durante o checkout responde 503
   `PAYMENTS_PROVIDER_UNAVAILABLE`**, porque está no mesmo `try` da chamada à Stripe. O código não distingue
   Firestore de Stripe nesse ponto.
8. **`useCheckoutConfirmation` virou um hook próprio** em `(hooks)/`, com teste de timers. Depois das 10
   tentativas ele para e o aviso continua em "Confirmando o pagamento"; o plano não dizia o que mostrar
   depois do limite.
9. **Docs fora da lista do plano**: `docs/SETUP.md` dizia que a validação das chaves é pulada sem
   `STRIPE_SECRET_KEY`, e `docs/SECURITY.md` dizia que os handlers do webhook eram TODO. As duas frases
   ficaram falsas com esta entrega e foram corrigidas (política §4, "medir e corrigir doc ao passar").
10. `NEXT_PUBLIC_APP_URL` na `apps/web` foi redeclarado com `z.string().optional()` e `|| undefined`, igual
    às vizinhas do arquivo, em vez do `z.url()` do `core()`.

Nenhuma decisão D1–D22 ou P1–P8 foi revertida.

### Testes existentes cujo contrato mudou (asserção trocada, nada afrouxado)

| Arquivo | O que mudou | Por quê |
|---|---|---|
| `apps/api/__tests__/paymentsWebhookRoute.test.ts` | Os 3 casos "sem configuração" passam de 200 `Not configured` para 503 `PAYMENTS_NOT_CONFIGURED` | D6/P7 |
| idem | O segredo vem do mock de `getWebhookSecret` e não mais de `@/env` | D13, corrige o defeito do `next dev` |
| idem | "aceita `subscription_schedule.canceled`" agora afirma o log `webhook-unhandled-event` e que nada é aplicado | D9 |
| idem | "evento sem customer" continua 200 e passou a afirmar também que nenhum vínculo é gravado | reforço |
| `apps/api/__tests__/accountErasure.test.ts` | A ordem esperada começa por `billing`; o caso "ponto de extensão / `billing-not-linked`" virou "`no-subscription`" | D14; o motivo antigo deixou de existir |
| `apps/api/__tests__/accountDeletionRoute.test.ts` | Só a fixture `DONE_REPORT` (billing primeiro, `no-subscription`) | reflete o relatório novo |
| `apps/app/__tests__/accountTabsOverflow.test.tsx` | O mock do placeholder virou mock do `AccountBillingPanel` | a aba passou a renderizar o painel |

## Validação (medida)

| Gate | Comando | Resultado |
|---|---|---|
| Lint | `pnpm check` | `Checked 698 files … No fixes applied.` |
| Gates do CI | `pnpm turbo run lint typecheck test` (sem `--force`) | `Tasks: 24 successful, 24 total` |
| Testes por workspace | `pnpm turbo run test` | api 804 (66 arquivos), app 554 (73), web 39 (7), payments 22 (4), internationalization 44 (5); shared 44, security 31, email 137, auth 101, analytics 34 inalterados |
| Build degradado | `env -u STRIPE_SECRET_KEY -u STRIPE_WEBHOOK_SECRET pnpm --filter {api,app,web} build` (com o `.env` local, onde as duas chaves estão vazias) | os três saem com código 0 |
| Build com chave malformada | `STRIPE_SECRET_KEY=pk_test_wrong_slot pnpm --filter api build` | código 1, `Invalid environment variables` |

Testes novos ou ampliados: `packages/payments` (`keys`, `paymentsConfig`, `aiToolkit`: 14); `apps/api`
(`billingState` 33, `paymentsPlansRoute` 11, `paymentsCheckoutRoute` 31, `paymentsPortalRoute` 8,
`paymentsWebhookRoute` 30 com 3 assinados de verdade por `generateTestHeaderString`,
`paymentEventRepository` 4, `userRepositoryBilling` 8, `accountErasure` 14, mais casos em
`accountDeletionRoute`, `accountExportRoute` e `instrumentation`); `apps/app` (`formatPlanPrice` 12,
`accountBillingPanel` 22, `usePaymentsMutations` 4, `useCheckoutConfirmation` 4, `commonNavRoutes` 2, mais
casos em `accountTabsOverflow` e `accountApiErrorCopy`); `apps/web` (`pricingCta` 4). Nenhum depende de
emulador ou rede.

### Smoke local (só para me desbloquear, não é validação)

`next start -p 3002` da API buildada, porta livre antes (`lsof -ti tcp:3002` vazio), processo derrubado por
PID no fim (`3002 livre`). Precisei passar `CORS_ORIGIN` no ambiente do processo, porque o `.env` local não
tem a variável e o `instrumentation.ts` recusa produção sem ela (comportamento preexistente).

- Sem chaves: `POST /webhooks/payments` → `503 {"error":{"code":"PAYMENTS_NOT_CONFIGURED"}}`;
  `GET /payments/plans` e `POST /payments/checkout` sem token → `401 AUTH_INVALID_TOKEN`.
- Só `STRIPE_SECRET_KEY`: log de boot `[payments] billing is DISABLED (no STRIPE_WEBHOOK_SECRET). Set both
  Stripe keys or neither.`; webhook → 503.
- As duas chaves falsas: webhook sem `stripe-signature` e com assinatura inventada → `500
  {"message":"something went wrong","ok":false}` e log `[payments] webhook-failed requestId=…`.

Não subi emulador, `apps/app` nem browser. Nenhuma chamada autenticada foi feita.

## A verificar no `/test`

Tudo abaixo eu não medi. Repro sugerido em cada linha.

1. **Aba billing degradada** (rodada A): placeholder "Cobrança em breve" em light, dark e mobile, 3 idiomas;
   skeleton antes dele sem pulo de layout.
2. **`GET /payments/plans` autenticado sem chaves** → 200 `{enabled:false, plans:[]}` (`curl` com cookie de
   sessão do emulador). Checkout e portal autenticados → 503 `PAYMENTS_NOT_CONFIGURED`.
3. **Modo `simple`** (`NEXT_PUBLIC_PRODUCT_MODE=simple` no build do app): aba e item da sidebar ausentes;
   `/account?tab=billing` abre o perfil. Coberto por teste de componente, não por browser.
4. **Rodada B, chaves falsas no ambiente do processo da API** + emulador + `pnpm seed`:
   - aba mostra `billing.loadError` e a API responde 503 `PAYMENTS_PROVIDER_UNAVAILABLE` (a Stripe recusa
     `sk_test_offline_qa`);
   - harness temporário (script Node resolvido a partir de `packages/payments`, removido ao fim) assina com
     `stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_offline_qa" })` e faz POST:
     `checkout.session.completed` com `client_reference_id=<profileId>` e `customer=cus_qa` → doc ganha
     `stripeCustomerId`; `customer.subscription.created` ativo com `items.data[0].price` e
     `current_period_end` → card "Plano atual", badge "Ativa", "Renova em", "Gerenciar assinatura"; o mesmo
     evento reenviado → `{"ok":true,"duplicate":true}` e `updatedAt` idêntico; `updated` com `created`
     anterior → doc não muda; `updated` com `past_due` → badge e `pastDueHint`; `deleted` → `canceled` e
     a aba volta aos planos (com o erro de catálogo); corpo adulterado → 500 e doc intacto;
   - **transação `applySubscriptionState` contra o emulador**: a suíte só tem db falso. Conferir que o doc
     recebe `subscription` com `Timestamp` em `currentPeriodEnd`/`lastEventAt` e que `GET /account` devolve
     ISO;
   - **`findByStripeCustomerId` contra o emulador** (consulta de campo único sem índice composto);
   - "Gerenciar assinatura" com estado ativo → toast traduzido de `PAYMENTS_PROVIDER_UNAVAILABLE` nos 3
     idiomas;
   - exclusão de conta com assinatura ativa gravada → 503 `ACCOUNT_DELETION_BILLING_FAILED`, conta ainda
     entra, perfil intacto (a chave falsa faz o `subscriptions.cancel` falhar); sem assinatura → exclusão
     como antes;
   - exportação → `account.subscription` e `account.stripeCustomerId` no JSON;
   - personificando: estado visível, botões desabilitados, POST de checkout com headers de personificação →
     403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY`;
   - `?checkout=success` e `?checkout=canceled` abertos à mão → alertas; com estado ativo, "Assinatura
     ativa."; sem estado, o aviso de confirmação fica e a aba relê `GET /account` 10 vezes (aba Network).
5. **`apps/web` `/pricing`** com `NEXT_PUBLIC_APP_URL` preenchida no ambiente da web: os dois primeiros CTAs
   → `<app>/<locale>/account?tab=billing`; `simple` → URL do app; hero, cta e link do painel no header
   passam a apontar para o app (efeito colateral declarado da D12). Localmente o `.env` da web tem a
   variável vazia, então sem preencher o CTA continua em `/<locale>/sign-up`.
6. **`pnpm --filter api dev:with-stripe`**: a leitura do segredo saiu de `@/env` e foi para
   `@repo/payments`, o que deveria fazer o webhook funcionar em `next dev`. Não testei em `next dev`; o teste
   de rota só prova que a rota lê `getWebhookSecret()`.
7. **Botão com `loading`**: o `Button` do design system troca o texto pelo spinner, então o botão clicado
   perde o nome acessível enquanto redireciona (o mesmo acontece em `AccountPrivacyPanel`).

**Não observável sem conta Stripe real (🔒):** Checkout e Portal reais, redirect de volta com assinatura
criada pela Stripe, catálogo real, cancelamento bem-sucedido no expurgo, entrega real de webhook.

## Lacunas de teste conhecidas

- `applySubscriptionState` e `findByStripeCustomerId` só contra db falso (ver item 4 acima).
- Nenhum teste renderiza `BillingPlanCard` isolado; ele é exercitado pelo `accountBillingPanel.test.tsx`.
- `pricing/page.tsx` não tem teste de renderização; o helper `resolvePlanCtaHref` tem.
- O efeito da redeclaração de `NEXT_PUBLIC_APP_URL` em hero, cta e header não tem teste.

## Achados que continuam abertos (do plano, sem mudança aqui)

A1 (modo `simple` não restringe o painel comum), A2 (soft delete do admin não cancela a assinatura), A3
(`STRIPE_*` publicadas em `.env.example` de `apps/app` e `apps/web`, que não as leem) e A4 (webhook responde
500 para assinatura inválida) continuam abertos, fora do escopo desta entrega. A4 foi medido no smoke
acima.

## Dados e processos criados

Nenhum usuário, documento ou conta. Logs de smoke em `/tmp/x/` (fora do repo). Builds `.next` dos três apps
ficaram no disco (ignorados pelo git).
