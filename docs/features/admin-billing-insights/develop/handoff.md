# Handoff do `/develop`: seção de billing na home do admin

Plano: [`analyze/plan.md`](../analyze/plan.md). Rodada autônoma do `/cycle`, sem perguntas ao usuário.
Nenhuma branch criada, nenhum commit. Medido em 2026-09-25 com o `HEAD` em `a1f87d0`.

## Como esta etapa começou

O working tree já trazia quase todo o código da feature, de uma execução anterior do `/develop` que parou
antes de rodar o lint, escrever a documentação e gravar este handoff (arquivos com data entre 00:35 e 01:13).
Esta etapa revisou esse código contra o plano, corrigiu o que quebrava, completou o que faltava e rodou os
gates. O que foi mexido aqui está marcado como tal abaixo.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| 10.1 contrato | `packages/sdk/src/types/payments/payments.ts` (tipos `Billing*DTO` e `BillingSummaryDataDTO`), `packages/sdk/src/actions/payments/action.ts` (`summary()`) |
| 4.3 webhook `invoice.paid` e fim do eco | `apps/api/app/(routes)/webhooks/payments/route.ts`, `apps/api/(shared)/lib/billing-state.ts` (`toPaidInvoiceRecord`, `toPlanLabel`) |
| 4.3 nome do plano | `apps/api/(shared)/lib/plan-label.ts` (`ensurePlanLabel`, `PLAN_LABEL_TTL_DAYS`, `PLAN_LABEL_TIMEOUT_MS`), `apps/api/(shared)/repositories/plan-label.repository.ts` |
| 4.6 persistência | `apps/api/(shared)/repositories/paid-invoice.repository.ts`, `subscription-activation.repository.ts`, `apps/api/(shared)/mappers/subscription-activation.mapper.ts`, `apps/api/(shared)/infra/firestore-errors.ts` (`isAlreadyExistsError`), `apps/api/(shared)/repositories/payment-event.repository.ts` (passa a usar o helper), `apps/api/(shared)/repositories/user.repository.ts` (`countLiveSubscriptionsByPrice`, `identifyByStripeCustomerIds`) |
| 4.5 montagem | `apps/api/(shared)/lib/billing-summary.ts` |
| 10.2 rota | `apps/api/app/(routes)/payments/summary/route.ts` |
| env | `apps/api/.env.example` (lista de eventos com `invoice.paid`) |
| 5.1–5.3 front | `apps/app/shared/lib/queryKeys.ts`, `apps/app/shared/lib/billingInsights.ts`, `admin/(pages)/(hooks)/useBillingSummary.tsx`, `admin/(pages)/(components)/{BillingInsightsSection,BillingRevenueCard,BillingPlansCard,BillingPlansChart,RecentActivationsCard}.tsx`, `AdminHomeClient.tsx`, `page.tsx` |
| 5.4 i18n | `packages/internationalization/translations/apps/app/pages/admin/home.ts` (bloco `billing` nos 3 idiomas), `packages/internationalization/__tests__/chartAxisLabels.test.ts` |
| 10.6 docs | `docs/PRE-PRODUCTION.md` §12 e declaração da exclusão de conta, `docs/PAYMENTS.md` |

Os caminhos `admin/(pages)/…` ficam sob `apps/app/app/[locale]/(authenticated)/(admin)/`.

Testes novos: `apps/api/__tests__/{billingSummary,paidInvoiceRepository,subscriptionActivationRepository,planLabelRepository,planLabelResolution,paymentsSummaryRoute}.test.ts`,
`apps/app/__tests__/{billingInsights.test.ts,billingInsightsSection.test.tsx,useBillingSummary.test.tsx}`.
Testes estendidos: `billingState`, `paymentsWebhookRoute`, `userRepositoryBilling` (API);
`adminHomePrefetch`, `adminHomeClient`, `adminHomeActivityDegraded` (app); `chartAxisLabels` (i18n).

## Contrato e raio de impacto

- Entram `BillingPlanCountDTO`, `BillingSubscriberDTO`, `BillingActivationDTO`, `BillingRevenueByCurrencyDTO`,
  `BillingRevenueDTO`, `BillingSummaryDataDTO` e `BillingSummaryDTO`, mais o método
  `apiClient.payments.summary()`. Nenhum tipo existente mudou.
- Consumidores: `useBillingSummary` e o prefetch de `admin/(pages)/page.tsx`.
- Mudança de contrato do webhook: a resposta de sucesso passa de `{ result: event, ok: true }` para
  `{ ok: true }`. Nenhum consumidor no repo lê esse corpo; quem lê é o log de entregas da Stripe.

## Códigos de erro

Nenhum código novo. A rota usa `AUTH_INVALID_TOKEN`, `ADMIN_FORBIDDEN` e `SUMMARY_INDEX_MISSING`, que já
existem nos 3 idiomas. `apiErrors` não mudou.

## Desvios do plano

1. **Corrigido, o plano estava errado: rótulo do eixo cortado em 6 caracteres, não em 10.** A seção 5.3
   pedia 10. O próprio repo mede o limite em `chartAxisLabels.test.ts`: a 375 px sobram cerca de 52 px por
   categoria, com um caractere largo de ~6,9 px a 12 px de fonte, o que dá 7 caracteres. A 320 px a conta
   fica em cerca de 41 px por coluna, ou 6 caracteres. Dez caracteres ocupariam perto de 69 px e se
   sobreporiam ao vizinho. A execução anterior já tinha usado 6; esta etapa manteve o valor e trocou o
   comentário do código e o do teste, que diziam que o espaçamento "foi medido", pela conta acima, porque
   não há medição registrada. `PLAN_AXIS_LABEL_MAX_CHARS = 6` em `billingInsights.ts`; o teste de i18n
   garante que "Outros"/"Others"/"Otros" cabem inteiros.
2. **Corrigido nesta etapa: `ensurePlanLabel` saiu de `billing.ts` para `(shared)/lib/plan-label.ts`.** O
   plano o punha em `billing.ts`. Isso fazia `billing.ts` importar o repositório de `planLabel` e, com ele,
   o cliente do Firestore. Quatro suítes que importam `billing.ts` sem mockar o banco quebraram na coleta
   (`paymentsCheckoutRoute`, `paymentsPlansRoute`, `paymentsPortalRoute`, `accountErasure`: `vitest run`
   com 4 arquivos falhando, 818 testes passando). Com o módulo próprio, `billing.ts` volta a ser idêntico
   ao `HEAD` e nenhum teste existente precisou de mock novo. `planLabelResolution.test.ts` e o mock de
   `paymentsWebhookRoute.test.ts` apontam para o módulo novo.
3. **Helper de `ALREADY_EXISTS`.** O plano deixava opcional. Com três cópias da mesma checagem, o helper
   `isAlreadyExistsError` foi criado e `payment-event.repository.ts` passou a usá-lo (troca de 3 linhas,
   mesmo comportamento; `paymentEventRepository.test.ts` passa).
4. **`BillingPlansCard.tsx` em arquivo próprio.** A árvore do plano não o listava. Ele contém a lista de
   planos e carrega `BillingPlansChart` com `next/dynamic`, como o plano pede.
5. **`BillingSummaryDataDTO`.** Tipo extra no contrato, usado como retorno de `buildBillingSummary` no
   lugar do `Omit<Extract<…>>` do plano. Mesma forma.
6. **Ordenação dos planos.** O desempate por nome usava um caractere invisível (`U+FFFF`) como sentinela
   para mandar os sem nome para o fim. Foi trocado por `compareNamedFirst`, explícito. Mesmo resultado nos
   testes de `rankPlanCounts`.
7. **Lint.** A execução anterior não tinha rodado o Biome: 45 erros, todos em arquivos da feature
   (números mágicos e regex em teste, sombra de variável, import não usado, função com 5 parâmetros). Foram
   corrigidos sem mudar asserção. `toEntry` em `billingInsights.ts` passou a receber um objeto.

**Asserção do eco do webhook (P6).** O teste "aceita checkout.session.completed devolvendo o evento
verificado" virou "aceita checkout.session.completed sem ecoar o evento no corpo" e passou a exigir
`toEqual({ ok: true })`. É a troca de contrato decidida no plano (a fatura traz e-mail e endereço do
cliente), e a asserção nova é mais estrita que a antiga, porque um corpo com o evento reprova.

## Pendências e decisões em aberto

- Nenhuma pergunta do plano bloqueou código. P1 a P6 seguem com a opção adotada no plano.
- `docs/PRE-PRODUCTION.md` já estava modificado pela auditoria do backlog. Os trechos desta feature, todos
  acréscimos dentro do §12 e da declaração de exclusão de conta:
  1. checklist do §12: "com os quatro eventos" virou "com os cinco eventos (inclui `invoice.paid`)";
  2. checklist do §12: o item de TTL ganhou "e em nenhuma outra coleção de cobrança";
  3. parágrafo novo depois de "O que acontece sem ela", começando em "Na home do admin, com a cobrança
     desligada";
  4. passo 3: `invoice.paid` na lista de eventos e o parágrafo "Num endpoint que já existe…";
  5. passo 5: o parágrafo "Não aplique TTL em `paidInvoice` nem em `subscriptionActivation`…";
  6. "Como verificar": a linha `curl … /payments/summary    # 401`, a frase sobre a resposta
     `{"ok":true}` e as duas frases finais sobre a home do admin e o 503 `SUMMARY_INDEX_MISSING`;
  7. tabela da declaração "até onde a exclusão de conta alcança", linha `billing`: a frase final sobre
     `paidInvoice` e `subscriptionActivation`.

  O resto do diff desse arquivo (§ da suíte de testes e a correção sobre o modo `simple`) é da auditoria.
  Separar exige `git add -p`; se não compensar, vale o commit misto registrado.

## Validação (com instrumento)

| O quê | Comando | Resultado |
|-------|---------|-----------|
| typecheck | `pnpm --filter api typecheck`, `pnpm --filter app typecheck`, `pnpm --filter @repo/sdk typecheck` | sem erro |
| lint/format | `pnpm check` | 723 arquivos, 0 correções, 0 erros |
| gate do CI | `pnpm turbo run lint typecheck test` (sem `--force`) | 24/24 tasks, 12 em cache, 28,5 s |
| suíte | mesma execução | 1936 testes em 189 arquivos: `api` 882/72, `app` 597/76, `@repo/internationalization` 47/5, demais workspaces sem mudança |
| paridade i18n | `pnpm --filter @repo/internationalization test` | 47 testes em 5 arquivos |
| build da API com as chaves Stripe vazias | `npx next build` em `apps/api` | passa; `/payments/summary` listada como rota dinâmica |
| build do app | `npx next build` em `apps/app`, uma vez sem `NEXT_PUBLIC_PRODUCT_MODE` e outra com `simple` | as duas compilam; a última build deixada em `.next` é a do modo padrão |
| rota sem credencial, build de produção, chaves vazias | `CORS_ORIGIN=http://localhost:3000 npx next start -p 3002` + `curl -i /payments/summary` | 401 `{"error":{"code":"AUTH_INVALID_TOKEN"}}` (também com `Bearer x`) |
| método errado | `curl -X POST /payments/summary` | 405 |
| webhook sem chaves | `curl -i -X POST /webhooks/payments -d '{}'` | 503 `{"error":{"code":"PAYMENTS_NOT_CONFIGURED"}}` |

O processo da API na porta 3002 foi iniciado e derrubado por esta etapa; a porta estava livre antes e
ficou livre depois. Sem `CORS_ORIGIN`, `next start` responde 500 em toda rota
(`CORS_ORIGIN is required in production`): é comportamento anterior do boot de produção, não desta feature.

Referência para o crescimento: a auditoria mediu 1817 testes em 180 arquivos no mesmo `HEAD`, então a
feature soma 119 testes em 9 arquivos.

## A verificar no `/test`

Nada abaixo foi medido nesta etapa.

1. **Resposta `enabled: false` com credencial de admin real.** Só o teste de rota prova. Repro: rodada A do
   plano, admin do seed no emulador, `GET /payments/summary` → 200 `{"data":{"enabled":false}}`, e a home
   sem nenhum elemento da seção.
2. **Modo `simple` no navegador.** Com `NEXT_PUBLIC_PRODUCT_MODE=simple` no app, nenhuma requisição a
   `/payments/summary` na aba de rede.
3. **Rótulos do eixo a 320 px e 375 px nos 3 idiomas**, com 6 planos (4 barras + "Outros"). O limite de 6
   caracteres vem de conta, não de medição.
4. **Hidratação.** Console sem aviso na home do admin com dados, nos 3 idiomas (datas e mês em UTC,
   moeda pelo `Intl`).
5. **Texto exato do `Intl` no navegador** para R$ 29,00 em en e es. Os testes de componente rodam no
   Node do Vitest e cobrem título, "Usuário removido" e "Plano sem nome" nos 3 idiomas, BRL/USD em pt-br e
   JPY em en; o ICU do navegador pode escrever diferente.
6. **Rodada B inteira** (webhook assinado contra o emulador): idempotência por fatura com `id` de evento
   novo, `subscription_cycle` sem contratação nova, duas moedas, `planLabel` gravado à mão sendo lido,
   soft delete virando "Usuário removido", `plan-label-unresolved` no log com a chave falsa, resposta
   `{"ok":true}`.
7. **Light, dark e mobile** da seção: cartões, aviso (`Alert`), gráfico e lista.

## Lacunas de teste conhecidas

- Nenhum teste da suíte executa o `in` em subcampo de mapa com `select` (`subscription.status`) contra um
  Firestore de verdade, nem o `Timestamp` gravado e relido como ISO, nem o `create()` concorrente
  devolvendo `ALREADY_EXISTS`. O plano põe isso na rodada B do `/test`, contra o emulador.
- A ausência de índice composto só se prova num projeto Firebase real (pré-requisito 9.1, item 2).
- Os testes de componente conferem en e es só no título, no usuário removido e no plano sem nome; o resto
  da copy nesses idiomas entra pela paridade de chaves.
