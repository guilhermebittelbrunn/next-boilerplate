# Revisão: seção de billing na home do admin

Rodada autônoma do `/cycle`, sem perguntas ao usuário. Revisão por leitura do diff e dos gates estáticos;
nada foi executado além de `pnpm check`, `typecheck` e a paridade de i18n. Nenhum commit, nenhum push,
nenhuma branch criada. `HEAD` em `a1f87d0`, 2026-09-25.

## Branch

| Item | Valor |
|------|-------|
| Atual | `admin-billing-insights` (workspace do Conductor), sem upstream e sem commit além de `origin/main` |
| Regex do `review.md` sobre a atual | **inválida**: falta o `type` (`feat/…`) |
| Nome resolvido | `feat/admin-billing-insights`. A feature toca `packages/sdk`, `apps/api`, `apps/app` e `packages/internationalization`, então o `project` fica omitido |
| Regex sobre o nome resolvido | **passa** |
| Ação | nenhuma agora. A política do `/cycle` proíbe criar branch na rodada autônoma e o workspace é do Conductor. A branch é criada no primeiro commit aprovado, com `git switch -c feat/admin-billing-insights` a partir do `HEAD` atual. O `switch -c` preserva o working tree e o índice, então o rename já preparado segue junto. A branch atual não é renomeada. Mesmo procedimento de `billing-subscription`. |

## Revisão: diff da feature `admin-billing-insights`

Nada bloqueante. Duas afirmações de documentação estavam erradas e foram corrigidas. O código confere
com o plano nos pontos que se decidem lendo: idempotência, moeda, fuso, autorização, degradação e
ausência de chamada à Stripe na leitura.

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

| # | `arquivo:linha` | Problema | Ação |
|---|-----------------|----------|------|
| A1 | `docs/PAYMENTS.md:37`, `docs/PRE-PRODUCTION.md:466` | Diziam que `GET /payments/summary` com a cobrança desligada responde "sem ler o Firestore". O guard lê o perfil do admin antes (`apps/api/app/(guards)/admin.ts:45`). O que a rota não lê são as coleções de cobrança. | Corrigido: "sem ler as coleções de cobrança" (no `PAYMENTS.md`, com "o guard ainda lê o perfil do admin"). |
| A2 | `docs/SECURITY.md:13-24` | A auditoria contou 29 rotas, 18 com guard e `payments/*` ×3, sobre `a1f87d0`. A feature acrescenta `payments/summary`. Medido agora: `find "apps/api/app/(routes)" -name route.ts \| wc -l` dá 30, e 19 delas importam `requireAdminApi` ou `requireCommonPanelApi`. | Corrigido para 30, dezenove e `payments/*` ×4, com a data "sobre `a1f87d0` mais a rota `payments/summary`". A soma confere: 6 + 3 + 1 + 4 + 1 + 4 = 19, e 30 − 19 = 11 sem guard. |

### 🟢 Sugestão / nit

| # | `arquivo:linha` | Observação | Ação |
|---|-----------------|------------|------|
| S1 | `(components)/BillingPlansChart.tsx:16` | O `ChartConfig` recebe `axisLabel` (cortado em 6 caracteres) como `label`, e o `CategoryBarChart` usa o mesmo `label` no tick e no tooltip (`packages/design-system/components/ui/category-bar-chart.tsx:56-63`). O tooltip mostra "Profi…" em vez do nome inteiro. O nome completo está na lista abaixo do gráfico. Separar os dois exige prop nova no design system, fora do escopo mínimo. | Registrado; vai para o `/test` conferir e, se incomodar, para o backlog. |
| S2 | `(components)/RecentActivationsCard.tsx:55` | Assinante encontrado, mas sem `displayName` e sem `email`, cai em "Usuário removido" com o estilo de usuário presente. Com e-mail/senha e Google o Auth sempre traz e-mail. | Nenhuma. |
| S3 | `apps/api/(shared)/lib/billing-summary.ts:56` | A ordem das linhas de moeda compara valores brutos na menor unidade de moedas diferentes (1000 JPY vem antes de 900 centavos de USD). É só ordem de exibição; nenhuma soma cruza moedas. | Nenhuma. |
| S4 | `apps/api/app/(routes)/webhooks/payments/route.ts:126` | Uma fatura `subscription_create` de valor zero (assinatura com trial) conta como contratação na data do início do trial, e a conversão do trial chega como `subscription_cycle`, que não conta. O boilerplate não configura trial: `rg trial` em `packages/payments` e nas rotas `payments/*` não acha nada. | Decisão em aberto 4. |
| S5 | `(components)/BillingRevenueCard.tsx:57` | Se o `Intl` recusar o código da moeda, o fallback mostra o valor na menor unidade (`2900 BRL`). Só acontece com código ISO inválido. | Nenhuma. |
| S6 | `specs/BACKLOG.md:468` | O achado "webhook da Stripe ecoa o evento inteiro" foi fechado por este diff (`route.ts:242` responde `{ ok: true }`), mas o backlog, escrito pela auditoria antes da feature, ainda o lista aberto. | Não editado: fechar achado do backlog é do `/spec --sync`. |

### ✅ OK

- Rota `apps/api/app/(routes)/payments/summary/route.ts`: `export const GET = requireAdminApi(async () => …)`,
  mesmo formato de `users/activity-summary`. Cobrança desligada responde 200 `{ data: { enabled: false } }`
  (linha 13) pelo mesmo `isBillingEnabled()` da aba do usuário; índice ausente vira 503
  `SUMMARY_INDEX_MISSING` (linha 22), código que já existe nos 3 idiomas; outra falha sobe.
- A leitura nunca chama a Stripe: `billing-summary.ts` e a rota só importam repositórios e o Admin SDK do
  Firebase. Nenhum `getStripe` no caminho.
- Idempotência em duas camadas. O dedupe por `event.id` continua antes do `dispatch` (`route.ts:228`).
  `paidInvoice` e `subscriptionActivation` usam `create()` com id natural e tratam `ALREADY_EXISTS` como
  resultado ("exists"), sem retorno antecipado: se a ativação falhou numa entrega, a reentrega cria só ela.
  A receita é somada na leitura, sem contador.
- Ordem de eventos: nenhuma escrita nova depende dela. A ativação guarda `customerId` e o vínculo com o
  perfil é feito na leitura (`identifyByStripeCustomerIds`).
- `invoice.paid` sem `priceId` grava só a fatura, sem ativação se faltar assinatura ou cliente, e não chama
  `ensurePlanLabel`.
- Multimoeda: `sumByCurrency` agrupa por moeda em minúsculas e nunca soma moedas diferentes.
- Mês UTC: `utcMonthRange` usa `Date.UTC(ano, mês + 1, 1)`, que vira o ano sozinho; datas no front com
  `timeZone: "UTC"` (`billingInsights.ts:134`).
- `ensurePlanLabel` (`plan-label.ts`): o `try` cobre a leitura do cache, a chamada à Stripe e a gravação;
  `timeout: 3000` e `maxNetworkRetries: 0` na chamada (linha 45); o log leva só o tipo do erro.
- Webhook sem eco: `route.ts:242` responde `{ ok: true }`. Nenhum consumidor no repo lê esse corpo
  (`rg webhooks/payments` só acha o proxy e o script da Stripe CLI). Os logs novos levam tipo de evento,
  `billingReason` e `requestId`, sem valor, e-mail ou payload.
- `paidInvoice` grava por whitelist e não guarda cliente nem perfil; `customerId` só existe em memória no
  `PaidInvoiceRecord`.
- Nenhum índice composto pela leitura: igualdade/`in` ou intervalo sobre um campo só, mais `select`, e
  `orderBy` de campo único. Soft delete filtrado em memória.
- Front: prefetch com a mesma `queryKey` do hook (`queryKeys.payments.summary()`), dentro de
  `if (!(await isImpersonating()))`, com `getServerApiClient`. Modo `simple` corta em três lugares: prefetch
  (`page.tsx:27`), `enabled` do hook (`useBillingSummary.tsx:15`) e retorno `null` da seção
  (`BillingInsightsSection.tsx:37`). Erro via `handleClientError(new FormattedError(error, locale))` e
  `LoadErrorState`, como na seção de atividade. Gráfico com `next/dynamic` e `ssr: false`.
- Todas as strings visíveis vêm de `dictionary.apps.app.pages.admin.home.billing`, nos 3 idiomas com a
  mesma estrutura. O critério da receita ("não desconta reembolsos e não substitui a contabilidade") e a
  moeda aparecem junto do número, como a spec pede.
- SDK: `summary()` em `PaymentsActions`, que já está registrada no `Client`; erro propaga cru; nenhum tipo
  existente mudou.
- Comentários: nenhum cita plano, etapa, handoff ou card (`rg` no diff e nos arquivos novos). Os que
  existem explicam restrição externa (versão da API da Stripe, teto de latência do webhook, fuso na
  hidratação, limite do eixo).
- `billing.ts` está idêntico ao `HEAD`, como o handoff afirma (fora do `git status`).
- Artefatos da feature varridos por segredo: só aparecem `sk_test_offline_qa` e `whsec_offline_qa`
  (placeholders do harness offline, que não autenticam em lugar nenhum) e e-mails `@example.com`.

**Corte da spec.** O implementado cobre o corte de `specs/admin-billing-insights.md`. Divergência
registrada: a spec fala em "assinaturas ativas" e a contagem usa `LIVE_SUBSCRIPTION_STATUSES` (inclui
`trialing`, `past_due`, `unpaid`, `paused`), decisão P3 do plano, declarada na descrição do cartão. O
rótulo do eixo em 6 caracteres, e não nos 10 do plano, é desvio da implementação com a conta no
comentário de `billingInsights.ts` e no teste de i18n; a medição fica para o `/test`.

### 👁 Verificar no `/test`

1. **`ALREADY_EXISTS` real.** Os testes mockam o código 6. Repro (rodada B, emulador): entregar o mesmo
   `invoice.paid` duas vezes com `event.id` diferentes, e depois duas vezes em paralelo (dois `curl`
   assinados ao mesmo tempo). Esperado: um documento em `paidInvoice/<invoice.id>`, um em
   `subscriptionActivation/<sub.id>`, receita do mês igual, as duas respostas 200.
2. **Ordem.** `invoice.paid` (`subscription_create`) antes de `checkout.session.completed`: a contratação
   aparece como "Usuário removido"; depois do checkout ligar o cliente, com o nome da pessoa, sem nova
   escrita em `subscriptionActivation`.
3. **Fatura sem preço.** `invoice.paid` com `billing_reason: manual`, sem linha de assinatura: grava só
   `paidInvoice`, soma na receita, nenhum `plan-label-unresolved` no log.
4. **Duas moedas e moeda sem casas.** Faturas em `brl` e `usd` no mesmo mês: duas linhas e a nota "sem
   conversão". Uma em `jpy`: valor não dividido por 100.
5. **Borda do mês em UTC**, gravada no emulador: `paid_at` às 23:59:59Z do último dia do mês anterior fica
   fora; às 00:00:00Z do dia 1 entra. `Timestamp` relido como ISO em `trackingSince` e `activatedAt`.
6. **Consulta `in` sobre `subscription.status` com `select`** contra o emulador: perfis com status vivo
   contam, `canceled` não, soft delete sai da contagem e a contratação dele vira "Usuário removido".
7. **Rota com credencial real.** Admin do seed: com a cobrança desligada, 200 `{"data":{"enabled":false}}`
   e a home sem título nem esqueleto da seção; ligada (chaves falsas), 200 com os três blocos. Perfil
   comum: 403 `ADMIN_FORBIDDEN`. Sem credencial: 401. Nenhuma requisição à Stripe na leitura (com a chave
   falsa, qualquer chamada apareceria como erro no log).
8. **Degradação 503.** Só o teste de rota prova `SUMMARY_INDEX_MISSING`; no emulador não há índice a
   faltar. Na UI, com a resposta forçada, a seção mostra a mensagem traduzida e o resto da home continua.
   Em projeto real fica 🔒.
9. **Modo `simple`.** `NEXT_PUBLIC_PRODUCT_MODE=simple` no app: nenhuma requisição a `/payments/summary`
   na aba de rede e nenhum elemento da seção.
10. **Corpo do webhook.** Entrega assinada de `invoice.paid` com `customer_email` e `customer_address` no
    payload: resposta exatamente `{"ok":true}`.
11. **`ensurePlanLabel` com a chave falsa.** Webhook responde 200, log com `plan-label-unresolved` e só o
    tipo do erro, tempo de resposta abaixo de ~3 s. Com `planLabel/<price>` gravado à mão e `resolvedAt`
    recente, nenhuma tentativa de chamada.
12. **Eixo e tooltip.** 6 planos (4 barras + "Outros") a 320 px e 375 px nos 3 idiomas: rótulos sem
    sobreposição. Registrar o que o tooltip mostra (achado S1).
13. **Hidratação e `Intl`.** Console sem aviso na home com dados nos 3 idiomas; texto exato de R$ 29,00 e
    do mês em en e es no navegador.
14. **Light, dark e mobile** da seção: cartões, `Alert` de `invoice.paid` ausente, gráfico e lista.

### Lacunas de teste

| Lacuna (do handoff ou nova) | Veredito |
|-----------------------------|----------|
| `in` em subcampo com `select`, `Timestamp` relido como ISO e `create()` concorrente com `ALREADY_EXISTS` contra Firestore de verdade | continua aberta; itens 1, 5 e 6 acima |
| Ausência de índice composto num projeto Firebase real | continua aberta, 🔒 (pré-requisito 9.1 do plano, fora do alcance do `/test`) |
| en e es conferidos só no título, no usuário removido e no plano sem nome | continua aberta; a paridade garante as chaves, o item 13 confere o texto |
| Tooltip do gráfico com rótulo cortado (nova) | fora de escopo do código desta feature; o `/test` registra o que vê |

Nenhuma correção desta revisão tocou código, então nenhuma lacuna foi fechada aqui.

## Correções aplicadas

Todas em documentação; nenhum arquivo de código mudou.

- `docs/PAYMENTS.md:37`: "sem ler o Firestore" virou "sem ler as coleções de cobrança (o guard ainda lê o
  perfil do admin)".
- `docs/PRE-PRODUCTION.md:466`: mesma troca, sem o parêntese.
- `docs/SECURITY.md:13-15, 23-24`: 29 → 30 rotas, dezoito → dezenove com guard, `payments/*` ×3 → ×4, e a
  data de medição passa a citar a rota nova.
- `docs/SECURITY.md:159`: frase nova no item do webhook: a resposta de sucesso é só `{ "ok": true }`, sem o
  evento, porque uma fatura traz e-mail e endereço do cliente.

## Raio de impacto

- `@repo/sdk`: só acréscimos (`Billing*DTO`, `BillingSummaryDataDTO`, `BillingSummaryDTO`,
  `payments.summary()`). Consumidores: `useBillingSummary` e o prefetch de `admin/(pages)/page.tsx`, além
  dos testes. Nenhum outro app lê esses tipos.
- Webhook: o corpo de sucesso muda de `{ result: event, ok: true }` para `{ ok: true }`. Nenhum consumidor
  no repo; quem lê é o log de entregas da Stripe.
- `payment-event.repository.ts` troca a checagem inline pelo helper `isAlreadyExistsError`, com o mesmo
  comportamento.
- `user.repository.ts`: dois métodos novos, nenhum existente alterado.
- Infra dos forks: o endpoint do webhook precisa de `invoice.paid` (cinco eventos) e as coleções
  `paidInvoice` e `subscriptionActivation` não podem ter TTL. Está no §12 do `docs/PRE-PRODUCTION.md`.

## Decisões em aberto

1. **Branch.** Criar `feat/admin-billing-insights` a partir do `HEAD` no primeiro commit aprovado.
   Recomendação: sim.
2. **`docs/SECURITY.md` em commit misto.** A recontagem da auditoria e a da rota nova estão nas mesmas
   linhas e não se separam com `git add -p`. Recomendação: o arquivo inteiro vai no commit de documentação
   da feature, com isso dito na mensagem.
3. **`docs/PRE-PRODUCTION.md` dividido com `git add -p`.** São 8 hunks; o 6º (`@@ -568`, medição da suíte)
   e o 8º (`@@ -675`, correção sobre o modo `simple`) são da auditoria, os outros seis são da feature.
   Recomendação: separar, como no plano de commits abaixo.
4. **Trial como contratação** (S4). Recomendação: manter. Se um fork usar trial, trocar a condição para
   exigir `amount_paid > 0` na primeira fatura.
5. **Tooltip cortado** (S1). Recomendação: achado no backlog para o `CategoryBarChart` aceitar um rótulo de
   eixo separado do nome, se o `/test` confirmar.

## Gates

| O quê | Comando | Resultado |
|-------|---------|-----------|
| lint e typecheck | `pnpm turbo run lint typecheck` (sem `--force`) | 14/14 tasks, 13 em cache, 1,3 s |
| lint/format | `pnpm check` | 723 arquivos, 0 correções |
| paridade de i18n | `pnpm --filter @repo/internationalization test` | 47 testes em 5 arquivos |
| suíte | não rodada (é do `/test`) | o handoff registra 1936 testes em 189 arquivos, sem remedição aqui |

## Plano de commits

O índice **não** está vazio: `specs/billing-subscription.md -> docs/features/billing-subscription/spec.md`
já está preparado. Ele entra no commit 1, junto com as modificações não preparadas do mesmo arquivo.
Conferir `git diff --cached --stat` antes do commit 1 e `git show --stat --oneline HEAD` depois de cada
um.

Os commits de `apps/app` (9 a 11) não passam no typecheck sozinhos: os componentes leem
`dictionary.…billing`, que só chega no commit 12. É a consequência da ordem
`sdk → api → app → internationalization` da regra de commits, a mesma das features anteriores.

Caminhos abreviados: `(components)/` e `(hooks)/` ficam em
`apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/`.

1. `docs(specs): audit backlog against the delivered billing subscription`
   - `specs/BACKLOG.md` (leva também a linha do achado D2 da rodada 2, que ficou no mesmo hunk de
     uma alteração da auditoria), `specs/admin-billing-insights.md`, `specs/e2e-testing.md`,
     `specs/observability-logging.md`, `specs/teams-organizations.md`
   - `docs/features/billing-subscription/spec.md` (rename já preparado + modificações)
   - `docs/features/billing-subscription/analyze/plan.md`, `docs/features/admin-analytics-dashboard/spec.md`,
     `docs/features/data-rights-lgpd/spec.md`, `docs/features/user-activity-tracking/spec.md`,
     `docs/features/user-activity-tracking/analyze/plan.md`
   - `docs/AUTH-SSO.md`
   - `docs/PRE-PRODUCTION.md`, só os hunks 6 e 8:
     `printf 'n\nn\nn\nn\nn\ny\nn\ny\n' | git add -p docs/PRE-PRODUCTION.md`, conferido com
     `git diff --cached docs/PRE-PRODUCTION.md | grep '^@@'` (dois hunks, `-568` e `-675`)
2. `feat(sdk): add billing summary contract to payments actions`
   - `packages/sdk/src/types/payments/payments.ts`, `packages/sdk/src/actions/payments/action.ts`
3. `refactor(api): share the Firestore ALREADY_EXISTS check`
   - `apps/api/(shared)/infra/firestore-errors.ts`, `apps/api/(shared)/repositories/payment-event.repository.ts`
4. `feat(api): map paid invoices and plan labels from Stripe objects`
   - `apps/api/(shared)/lib/billing-state.ts`, `apps/api/__tests__/billingState.test.ts`
5. `feat(api): add paid invoice and subscription activation repositories`
   - `apps/api/(shared)/repositories/paid-invoice.repository.ts`,
     `apps/api/(shared)/repositories/subscription-activation.repository.ts`,
     `apps/api/(shared)/mappers/subscription-activation.mapper.ts`,
     `apps/api/__tests__/paidInvoiceRepository.test.ts`,
     `apps/api/__tests__/subscriptionActivationRepository.test.ts`
6. `feat(api): cache plan display names resolved from Stripe`
   - `apps/api/(shared)/lib/plan-label.ts`, `apps/api/(shared)/repositories/plan-label.repository.ts`,
     `apps/api/__tests__/planLabelRepository.test.ts`, `apps/api/__tests__/planLabelResolution.test.ts`
7. `feat(api): record invoice.paid in the payments webhook and stop echoing the event`
   - `apps/api/app/(routes)/webhooks/payments/route.ts`, `apps/api/__tests__/paymentsWebhookRoute.test.ts`,
     `apps/api/.env.example`
8. `feat(api): add GET /payments/summary for the admin home`
   - `apps/api/(shared)/repositories/user.repository.ts`, `apps/api/(shared)/lib/billing-summary.ts`,
     `apps/api/app/(routes)/payments/summary/route.ts`, `apps/api/__tests__/userRepositoryBilling.test.ts`,
     `apps/api/__tests__/billingSummary.test.ts`, `apps/api/__tests__/paymentsSummaryRoute.test.ts`
9. `feat(app): add billing summary hook and query key`
   - `apps/app/shared/lib/queryKeys.ts`, `(hooks)/useBillingSummary.tsx`,
     `apps/app/__tests__/useBillingSummary.test.tsx`
10. `feat(app): add plan chart and UTC date helpers for billing insights`
    - `apps/app/shared/lib/billingInsights.ts`, `apps/app/__tests__/billingInsights.test.ts`
11. `feat(app): add billing insights section to the admin home`
    - `(components)/BillingInsightsSection.tsx`, `(components)/BillingPlansCard.tsx`,
      `(components)/BillingPlansChart.tsx`, `(components)/BillingRevenueCard.tsx`,
      `(components)/RecentActivationsCard.tsx`, `(components)/AdminHomeClient.tsx`,
      `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/page.tsx`,
      `apps/app/__tests__/billingInsightsSection.test.tsx`, `apps/app/__tests__/adminHomeClient.test.tsx`,
      `apps/app/__tests__/adminHomeActivityDegraded.test.tsx`, `apps/app/__tests__/adminHomePrefetch.test.tsx`
12. `feat(internationalization): add admin home billing copy`
    - `packages/internationalization/translations/apps/app/pages/admin/home.ts`,
      `packages/internationalization/__tests__/chartAxisLabels.test.ts`
13. `docs: document the admin billing summary`
    - `docs/PAYMENTS.md`, `docs/PRE-PRODUCTION.md` (hunks restantes), `docs/SECURITY.md` (misto: carrega
      também a recontagem de rotas da auditoria, nas mesmas linhas)
14. `docs(features): admin-billing-insights`
    - `docs/features/admin-billing-insights/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
      `review/review.md`, `test/criterios-aceite.md`, `test/report.md`). A pasta `test/e2e/` é descartada
      pelo `.gitignore`

Título de PR sugerido: `feat: admin billing insights on the admin home`.

## Rodada 2: defeitos do `/test`

O `/test` fechou com 17 ✅, 2 ❌ e 4 🔒 (`test/report.md`). Os dois ❌ voltaram para cá.

### D1, critério 19: rótulos do eixo de planos se sobrepõem a 320 px

Desta entrega. O QA mediu os ticks a 320 px: "Básic…" de x=57 a 95 e "Empre…" de 93 a 136, 2 px de
sobreposição nos 3 idiomas; os centros ficam a cerca de 38 px um do outro, e "Empre…" mede 43 px. O
comentário de `PLAN_AXIS_LABEL_MAX_CHARS` supunha 41 px por coluna. A 375 px nada se sobrepõe.

**Correção: corte em 5 caracteres.** Na conta com a medida do tick, um rótulo de seis caracteres custa
cerca de 7,2 px por caractere (43 px ÷ 6), então seis ocupam 43 px e passam dos 38 px entre ticks; cinco
ficam perto de 36 px. Enquanto cada rótulo couber na distância entre ticks, dois vizinhos centrados nos
seus ticks não se tocam.

- `apps/app/shared/lib/billingInsights.ts:7-14`: `PLAN_AXIS_LABEL_MAX_CHARS` de 6 para 5, e o comentário
  passa a descrever a distância de 38 px entre ticks e os 43 px de "Empre…", sem dizer que foi medido aqui.
- `apps/app/__tests__/billingInsights.test.ts:29-39, 85-89`: constantes com a medida do tick
  (`TICK_SPACING_AT_320_PX = 38`, 43 px para 6 caracteres) e um teste novo, "o maior rótulo possível cabe na
  distância entre ticks a 320 px", que exige `PLAN_AXIS_LABEL_MAX_CHARS × 7,2 ≤ 38`. As expectativas de corte
  passam a "Prof…" e "Plan…".
- `packages/internationalization/__tests__/chartAxisLabels.test.ts:48-60`: o limite sai da mesma conta
  (`Math.floor(38 / (43 / 6))` = 5) em vez de um 6 fixo.
- `packages/internationalization/translations/apps/app/pages/admin/home.ts:72, 167`: a barra que agrupa os
  demais planos virou "Resto" em pt-br e "Other" em en; "Otros" em es já tinha 5 caracteres. Com o limite
  em 5, "Outros" e "Others" sairiam cortados no eixo.

**Os testes falham sem a correção.** Com o limite de volta em 6 e as traduções antigas, o
`billingInsights.test.ts` reprova 3 testes (entre eles o novo, da distância entre ticks) e o
`chartAxisLabels.test.ts` reprova 2 (pt-br e en). Com a correção, 33/33 nos dois arquivos do app e 47/47 no
pacote de i18n.

**Alternativas descartadas.**
- Reduzir a fonte do eixo. A 11 px, seis caracteres ainda dão cerca de 39 px, acima dos 38 px; só a 10 px
  caberiam, pequeno demais para leitura. E mexer na fonte do `CategoryBarChart` atinge o gráfico de
  recência, que não tem defeito.
- Manter "Outros" sem corte, por ser a última barra e ter vizinho só de um lado. A 320 px ela mediu 38 px,
  o limite exato; com um vizinho de 5 caracteres a folga seria de cerca de 1 px, e na conta conservadora de
  7,2 px por caractere ela já não cabe. "Resto" cabe sem depender de folga.
- Cair para 3 barras + agrupamento. Muda a decisão D16 do plano (5 barras, uma por cor do tema) para
  resolver um problema que o corte resolve.

A conta usa a média do rótulo mais largo medido, não o pior caractere possível: um nome feito só de "M" ou
"W" ainda pode passar dos 36 px. O QA remede com os nomes do harness.

### D2, critério 18: componente client em pt-br no SSR de `/en` e `/es`

Anterior à entrega; a seção nova herda. **Não corrigido.** Foi para o `specs/BACKLOG.md:480`, na tabela
"UI, i18n e front-end", com `arquivo:linha` e o repro.

Raio medido antes de decidir:
- `getDictionary()` do `@repo/internationalization/client` aparece em 63 arquivos de `apps/app`,
  `apps/web`, `packages/design-system` e `packages/auth`.
- Não existe provider nem contexto de locale no app: o único `createContext` é o do `panelStore`.
- Um client component não pode importar `next/headers`, então o SSR dele não enxerga o cookie `x-locale`;
  o `getCookie` sem `window` devolve `null` (`utils/cookies.ts:2-4`) e `resolveLocale` cai no padrão.
- Parte das chamadas roda fora de render: `packages/design-system/index.tsx:25` chama `getDictionary()`
  dentro de um callback de redirecionamento, e `apps/app/shared/lib/formatDisplayDateTime.ts:21` é função
  utilitária.

Por que não corrigir aqui. A correção na raiz é um `LocaleProvider` no layout de `[locale]`, alimentado pelo
segmento da URL, e um hook `useDictionary()` no lugar de `getDictionary()` nos componentes. O provider cabe
em poucos arquivos, mas só resolve se as 63 chamadas passarem a ler o contexto, e isso é refatorar dezenas de
arquivos fora da feature, em quatro workspaces.

Alternativas descartadas:
- Fazer o próprio `getDictionary()` ler o contexto (com `use()` do React) e cair no cookie fora de render.
  Evita mexer nas chamadas, mas depende de capturar o erro de hook chamado fora de render, e continua
  divergindo quando o cookie e a URL discordam, que é o caso que já apareceu no `/pricing`.
- Guardar o locale da requisição numa variável de módulo durante o SSR. Requisições concorrentes no mesmo
  processo trocariam o idioma uma da outra.
- Corrigir só a seção nova (locale por `useParams()` e `getDictionaryForLocale`). A sidebar, o breadcrumb e
  as outras seções da home continuam divergindo, então o "Hydration failed" não some e o critério 18 não
  fecha.

### 👁 Verificar no `/test` (rodada 2)

1. **D1 a 320 px nos 3 idiomas**, com os 6 planos do harness ("Básico Anual", "Empresarial Premium", "Pro",
   "Profissional Plus", "Starter" e um sem nome): pelo `getBoundingClientRect` dos
   `.recharts-cartesian-axis-tick-value`, nenhum par vizinho com sobreposição. Esperado no eixo: "Bási…",
   "Empr…", "Pro", "Prof…" e "Resto" / "Other" / "Otros". Conferir também a 375 px, que não pode ter
   regredido, e registrar a folga mínima medida.
2. **D2 não foi corrigido.** O critério 18 continua falhando em en e es por causa anterior à entrega,
   registrada no backlog. Não há o que remedir nesta rodada; basta confirmar que pt-br segue sem aviso.

### Gates da rodada 2

| O quê | Comando | Resultado |
|-------|---------|-----------|
| lint e typecheck | `pnpm turbo run lint typecheck` (sem `--force`) | 14/14 tasks, 11 em cache, 8,5 s |
| paridade de i18n | `pnpm --filter @repo/internationalization test` | 47 testes em 5 arquivos |
| testes tocados | `vitest run` de `billingInsights` e `billingInsightsSection` (app) | 33/33; com o limite antigo, 3 falhas |

### Plano de commits: o que muda

Nenhum commit novo. As mudanças da rodada 2 entram nos commits que já existiam no plano:
- commit 1 (`docs(specs)`): `specs/BACKLOG.md` leva a linha do achado D2;
- commit 10 (`feat(app): add plan chart and UTC date helpers…`): `billingInsights.ts` e
  `billingInsights.test.ts` já com o limite de 5;
- commit 12 (`feat(internationalization): add admin home billing copy`): `home.ts` com "Resto"/"Other" e o
  `chartAxisLabels.test.ts` com a conta de 38 px;
- commit 14 (`docs(features)`): `test/criterios-aceite.md` e `test/report.md`, varridos (sem senha, token
  ou chave; e-mails só `@example.com`).

Não há `fix(internationalization)`, porque o D2 não foi corrigido.

**Commits realizados:** (preenchido pelo orquestrador depois dos commits)
