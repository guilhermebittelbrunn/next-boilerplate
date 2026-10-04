# Plano: acesso por plano espelhado na API

- **Spec:** [`specs/plan-entitlements.md`](../../../../specs/plan-entitlements.md), corte de MVP inteiro.
- **Rodada:** autônoma (`/cycle --no-audit`), 2026-09-30. Nenhuma pergunta foi feita ao usuário: cada
  decisão não trivial está em "Perguntas em aberto", com a opção adotada e a descartada.
- **Branch:** nenhuma. Quem cria é o `/review`.

## Resumo

A API ganha uma checagem de plano composta sobre `requireCommonPanelApi`: recusa com
`PLAN_SUBSCRIPTION_REQUIRED` quem não tem assinatura viva e com `PLAN_FEATURE_REQUIRED` quem tem assinatura
mas não tem o recurso pedido, ambos 403. Os recursos vêm do Stripe Entitlements: o webhook passa a tratar
`entitlements.active_entitlement_summary.updated` e grava os `lookup_key` ativos em `user.entitlements`, com
regra de ordem por `event.created`. O `GET /account` devolve um `planAccess` já calculado no servidor
(`enforced`, `subscribed`, `features`), e o app ganha o componente `PlanGate`, que troca o conteúdo por um
convite traduzido com link para a aba de cobrança. A criação de `entity` demonstra o gate atrás da variável
`NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE`, vazia por padrão. Com a cobrança desligada (`isBillingEnabled()`
falso, o que inclui o modo `simple`), `enforced` é `false` e nada bloqueia.

Zero dependência nova: `stripe@19.1.0` já tipa o evento e a API de listagem.

## Fontes lidas

| Fonte | O que dela entrou no plano |
|-------|----------------------------|
| `specs/plan-entitlements.md` | problema, corte, fora do corte, recomendações (Entitlements; demo em `entity` desligada) |
| Stripe, [Entitlements](https://docs.stripe.com/billing/entitlements.md?dashboard-or-api=api) (lida em 2026-09-30) | o payload traz o resumo completo; `entitlements.data` tem **no máximo 10** itens e, acima disso, o resto vem pela API paginada; recurso ligado a produto só vale para assinaturas existentes no próximo ciclo; a doc recomenda persistir localmente |
| Stripe, [List active entitlements](https://docs.stripe.com/api/entitlements/active-entitlement/list) | `customer` obrigatório, `limit` de 1 a 100, paginação por cursor |
| `packages/payments/node_modules/stripe/package.json` | versão instalada `19.1.0` |
| `stripe/types/EventTypes.d.ts:1461-1472` | `EntitlementsActiveEntitlementSummaryUpdatedEvent`, `data.object: Stripe.Entitlements.ActiveEntitlementSummary` |
| `stripe/types/Entitlements/ActiveEntitlementSummaries.d.ts` | `customer: string`, `entitlements: ApiList<ActiveEntitlement>` (tem `has_more`) |
| `stripe/types/Entitlements/ActiveEntitlements.d.ts` | `lookup_key: string` |
| `stripe/types/index.d.ts:384-387` | `stripe.entitlements.activeEntitlements` existe no cliente |
| `docs/features/billing-subscription/` | precedente dos critérios 🔒 e da rodada de QA com webhook assinado localmente contra o emulador |

**Referências não lidas:** nenhuma. O preço do Stripe Entitlements continua **não confirmado**: nenhuma das
duas páginas fala em custo. Fica registrado em Riscos.

---

# Etapa 1: análise

## 1. Contexto

**Em uma frase:** dar ao fork que cobra assinatura uma checagem de servidor reutilizável, "esta rota exige
assinatura viva" ou "exige o recurso X", com código de erro traduzido e um componente de tela que mostra o
convite para assinar.

**Objetivos (o corte da spec, sem acréscimo):**

1. Checagem reutilizável na API, por status e por recurso nomeado, com código próprio.
2. Recursos do titular mantidos no perfil pelo webhook e expostos pelo SDK junto da conta.
3. Jeito padrão no app de condicionar um trecho de tela ao plano, com convite traduzido e link para a aba
   de cobrança.
4. Demonstração em `entity`, atrás de recurso configurável, desligada por padrão.
5. No modo `simple`, ou com a cobrança desligada, nada bloqueia.

**Fora de escopo (da spec, respeitado):** metering, cotas e créditos; bloqueio em `past_due`, trial, cupom
e reembolso; assento por membro; tela de administração de recursos por plano. Também fica fora: gate em
`apps/web`, gate nas rotas de edição/exclusão de `entity`, e qualquer releitura periódica da Stripe para
reconciliar recursos.

**Corte de MVP:** os cinco itens acima formam a menor fatia que se prova de ponta a ponta. A demonstração em
`entity` cobre só a criação (`POST /entities` e a tela `/entities/create`); é o suficiente para o padrão ser
copiado e não muda nada para quem não configura a variável.

| Pergunta do guia | Resposta |
|------------------|----------|
| Apps impactados | `packages/sdk`, `apps/api`, `apps/app`, `packages/internationalization`. `apps/web`: N/A. |
| Área do painel | Comum. A checagem compõe `requireCommonPanelApi` (`apps/api/app/(guards)/common-panel.ts:32-114`). O admin não tem `subjectProfile` e não é alvo. |
| Modo de produto | Só `subscription` liga o gate, via `isBillingEnabled()` (`apps/api/(shared)/lib/billing.ts:22-28`), que já exige `isSubscriptionMode()`, as duas chaves Stripe e `NEXT_PUBLIC_APP_URL`. |
| Depende de assinatura | Sim, é o objeto da tarefa. |
| Env nova | `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE`, opcional, na `apps/api` e na `apps/app`. |
| Genérico ou específico | Genérico. Mora em `apps/api`, `apps/app` e no contrato do SDK; nada entra em `packages/payments`. |

## 2. A regra de acesso (decisão central)

O status da assinatura chega por `customer.subscription.*` e os recursos por
`entitlements.active_entitlement_summary.updated`. São eventos diferentes e podem chegar fora de ordem. A
regra adotada é a conjunção, e **a negação vence**:

| `enforced` (`isBillingEnabled()`) | assinatura viva | recurso pedido | recurso na lista | resultado |
|-----------------------------------|-----------------|----------------|------------------|-----------|
| `false` | qualquer | qualquer | qualquer | passa |
| `true` | não | qualquer | qualquer | `PLAN_SUBSCRIPTION_REQUIRED` |
| `true` | sim | nenhum | qualquer | passa |
| `true` | sim | `X` | não | `PLAN_FEATURE_REQUIRED` |
| `true` | sim | `X` | sim | passa |

"Assinatura viva" é `isLiveSubscription` (`apps/api/(shared)/lib/billing-state.ts:16-22`), sobre
`LIVE_SUBSCRIPTION_STATUSES` (`packages/sdk/src/types/payments/payments.ts:20-26`): `active`, `trialing`,
`past_due`, `unpaid`, `paused`. Não bloquear em `past_due` é exigência do "Fora do corte"; `unpaid` e
`paused` passarem é consequência de reaproveitar a mesma definição e vai para Perguntas em aberto (P3).

Consequências da conjunção, todas desejadas:

- Assinatura cancelada com a lista de recursos ainda não atualizada: nega, porque o status já caiu.
- Assinatura recém-criada antes de o evento de recursos chegar: gate por status passa, gate por recurso
  nega por alguns segundos. A tela de retorno do checkout já espera o webhook (`useCheckoutConfirmation`).
- Fork que não cadastra recursos na Stripe: só o gate por status funciona. A spec aceita isso, e o
  `PAYMENTS.md` passa a dizer.

## 3. Dados (Firestore)

Coleção `user`, campo novo opcional, escrito só pelo webhook:

| Campo | Tipo | Default | `null`? | Justificativa |
|-------|------|---------|---------|---------------|
| `entitlements.features` | `string[]` | ausente | o mapa inteiro pode faltar | `lookup_key` dos recursos ativos, sem repetição e em ordem alfabética (documento estável, diff legível) |
| `entitlements.lastEventAt` | `Timestamp` | ausente | não, quando o mapa existe | `event.created` do evento que produziu a lista; base da regra de ordem |

- Perfil sem o campo lê como "nenhum recurso". Não há backfill: fork que já vende passa a ter a lista no
  próximo evento de recursos daquele cliente.
- Ownership: o documento é o próprio perfil, achado por `stripeCustomerId`
  (`userRepository.findByStripeCustomerId`, `apps/api/(shared)/repositories/user.repository.ts:67-78`).
- Consultas: nenhuma nova. A busca por `stripeCustomerId` já existe e é de campo único. Sem índice composto.
- `firestore.rules`: sem mudança. A postura é negar todo acesso direto de cliente (`firestore.rules`, bloco
  `match /{document=**}`), e a API usa o Admin SDK.
- Exclusão e exportação: o expurgo já apaga o documento inteiro (`purgeProfile`); a exportação passa a levar
  `account.entitlements`, com `null` quando não existe, no mesmo molde de `subscription`
  (`apps/api/(shared)/lib/account-export.ts:56-67`).

## 4. Contrato `@repo/sdk`

Arquivo novo `packages/sdk/src/types/payments/plan-access.ts`, exportado pelo barril de `payments`:

- `EntitlementsState` / `EntitlementsStateDTO` (datas como `Date` no servidor e ISO no DTO, o mesmo par de
  `SubscriptionState` / `SubscriptionStateDTO` em `payments.ts:30-52`).
- `PlanRequirement = { feature?: string }`. Objeto vazio quer dizer "só assinatura viva".
- `PLAN_ACCESS_DENIALS` e o tipo `PlanAccessDenial` (os dois códigos de erro).
- `PlanAccessDTO = { enforced: boolean; subscribed: boolean; features: string[] }`.
- `planAccessDenial(access, requirement): PlanAccessDenial | null`, função pura com a tabela da seção 2.

Alterações:

- `UserDTO.entitlements?: EntitlementsState | null` (`packages/sdk/src/types/user/user.ts:62-65`, ao lado
  de `subscription`).
- `AccountDTO` (`packages/sdk/src/types/account/account.ts:5-11`): omite `entitlements` do
  `UserWithAuthDTO` e reexpõe como `EntitlementsStateDTO`; ganha `planAccess: PlanAccessDTO`, obrigatório.
- `AccountDataExportDTO.account` passa a `Omit<AccountDTO, "avatarUrl" | "planAccess">`: `planAccess` é
  estado do ambiente, não dado do titular.
- Nenhuma action nova. `apiClient.account.me()` já devolve `AccountDTO`.

Quem quebra: só o tipo. `rg AccountDTO` acha `account-avatar.ts`, `account-export.ts`, os componentes da
conta e `accountPreferencesForm.test.tsx`, que monta a fixture com `as unknown as AccountDTO` (linha 58) e
não quebra. `withAvatarUrl` passa a devolver `Omit<AccountDTO, "planAccess">` e quem acrescenta o campo é a
rota.

## 5. API

### 5.1 Peças novas

| Peça | Arquivo | Papel |
|------|---------|-------|
| `toPlanAccess(holder)` | `apps/api/(shared)/lib/plan-access.ts` | monta o `PlanAccessDTO` a partir do perfil (ou do registro mesclado da conta) e de `isBillingEnabled()`; lê `entitlements.features` de forma tolerante (só strings) |
| `refusePlanAccess(profile, requirement)` | idem | devolve `Response` 403 com o código, ou `null`. Mesmo formato de `assertReadOnlyWhileImpersonating` (`apps/api/(shared)/lib/impersonation-read-only.ts:19-31`) |
| `requirePlanApi(requirement, handler)` | `apps/api/app/(guards)/plan.ts` | compõe `requireCommonPanelApi` e chama `refusePlanAccess` antes do handler. `requirement` aceita `PlanRequirement`, `null` (sem gate) ou função que devolve um dos dois, resolvida a cada requisição |
| `entityPlanRequirement()` | `apps/api/(shared)/lib/entity-plan.ts` | lê `env.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE`; vazio devolve `null` |
| `toEntitlementsState`, `decideEntitlementsWrite` | `apps/api/(shared)/lib/billing-state.ts` | conversão do resumo e regra de ordem, puras |
| `listActiveEntitlementKeys(stripe, customerId)` | `apps/api/(shared)/lib/billing.ts` | só para o caso `has_more`; pagina `stripe.entitlements.activeEntitlements.list` |
| `applyEntitlementsState(id, next)` | `apps/api/(shared)/repositories/user.repository.ts` | leitura e escrita numa transação, como `applySubscriptionState` (`:88-116`) |

A ordem dentro do guard importa: `requireCommonPanelApi` já recusa escrita sob personificação antes de
montar o contexto (`common-panel.ts:65-71`). O gate de plano roda depois disso, então uma escrita
personificada continua recebendo `AUTH_REQUEST_IMPERSONATION_READ_ONLY`, nunca um código de plano.

### 5.2 Webhook

Novo `case "entitlements.active_entitlement_summary.updated"` no `dispatch`
(`apps/api/app/(routes)/webhooks/payments/route.ts:154-184`), chamando `reconcileEntitlements`:

1. `customerId = summary.customer`; perfil por `findByStripeCustomerId`. Sem perfil: `logProfileNotFound`,
   evento marcado, 200 (o comportamento atual para os outros eventos). Não há fallback por
   `metadata.profileId`: o resumo não carrega metadata, e o cliente é ligado ao perfil antes de a sessão de
   checkout existir (`billing.ts:107`).
2. `features`: se `summary.entitlements.has_more` for falso, os `lookup_key` de `summary.entitlements.data`;
   se for verdadeiro, `listActiveEntitlementKeys`. É a única exceção à invariante "nada de reler a Stripe no
   webhook" da skill `payments-flow`, e só acontece com mais de 10 recursos ativos. Falha da Stripe aqui
   lança, a rota responde 500 sem marcar o evento e a Stripe reentrega.
3. `applyEntitlementsState(profile.id, { features, lastEventAt: event.created })`.
4. Log `webhook-entitlements-reconciled` com `eventType`, `result`, `featureCount` e `requestId`. Os
   `lookup_key` não vão para o log.

**Regra de ordem (`decideEntitlementsWrite`).** O resumo é sempre o estado completo, então basta "o mais
novo vence": nada gravado ou `lastEventAt` ilegível, aplica; `next.lastEventAt` anterior ao gravado, ignora
(`stale`); igual ou posterior, aplica. No empate de segundo vale a última entrega (P13).

Dedupe por `event.id` já cobre reentrega (`route.ts:228`); o evento é marcado só depois do handler
(`route.ts:232-233`).

### 5.3 Rotas alteradas

| Rota | Mudança |
|------|---------|
| `POST /entities` (`apps/api/app/(routes)/entities/route.ts:55`) | `requireCommonPanelApi` vira `requirePlanApi(entityPlanRequirement, ...)`. Com a variável vazia, `entityPlanRequirement()` é `null` e a rota se comporta como hoje. `GET /entities` não muda. |
| `GET /account` e `PUT /account` (`apps/api/app/(routes)/account/route.ts:97-105`, `:166`) | a resposta ganha `planAccess: toPlanAccess(merged)`. Nenhuma chamada à Stripe. |
| `GET /account/export` | `entitlements` normalizado para `null` quando ausente; `planAccess` não entra. |

### 5.4 Códigos de erro

| `error.code` | Status | Quando |
|--------------|--------|--------|
| `PLAN_SUBSCRIPTION_REQUIRED` | 403 | cobrança ligada e o titular sem assinatura viva |
| `PLAN_FEATURE_REQUIRED` | 403 | cobrança ligada, assinatura viva, recurso pedido fora da lista |

Os dois entram em `apiErrors` nos 3 idiomas
(`packages/internationalization/translations/packages/shared/utils.ts`). O `HTTP_STATUS`
(`packages/shared/utils/helpers/httpStatus.ts`) não tem 402, e o app não trata 403 de forma global
(`rg "403|FORBIDDEN" apps/app/shared packages/sdk/src` sem resultado fora de testes), então o código chega
ao `handleClientError` normalmente.

### 5.5 Modo degradado

| Situação | Comportamento |
|----------|---------------|
| Modo `simple` | `isBillingEnabled()` falso, `planAccess.enforced` falso, nenhuma rota recusa. O painel comum nem é a área do usuário nesse modo. |
| `subscription` sem chaves Stripe ou sem `NEXT_PUBLIC_APP_URL` | idem. A app sobe, o build passa. |
| Variável `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` vazia ou ausente | `POST /entities` e a tela de criação idênticos aos de hoje. |
| Cobrança ligada, recursos não cadastrados na Stripe | gate por status funciona; gate por recurso sempre nega quem não tem o recurso, porque a lista fica vazia. É o comportamento correto e fica documentado. |
| Endpoint sem o evento novo | igual à linha acima. |

## 6. Front (`apps/app`)

- `apps/app/shared/components/ui/PlanGate.tsx` (`"use client"`): props `requirement: PlanRequirement`,
  `children`, `loadingFallback?`. Lê a conta com `useMyAccount` (`apps/app/shared/hooks/useMyAccount.ts`) e
  decide com `planAccessDenial(account.planAccess, requirement)`.
  - carregando: `loadingFallback` (na tela de criação, `FormSkeleton`);
  - erro ao carregar a conta ou conta sem `planAccess`: mostra `children` (a API decide, e a recusa chega
    como toast traduzido);
  - negado: `PlanGateInvite`, um `Card` com título e descrição por código e um `Button asChild` com `Link`
    para `withLocalePath(locale, "/account?tab=billing")` (o mesmo helper do `ProfileDropdown.tsx:63`);
  - liberado: `children`.
- `apps/app/shared/lib/entityPlanRequirement.ts`: lê `env.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE`, no molde de
  `shared/lib/storageEnabled.ts`.
- `entities/(pages)/create/page.tsx`: mantém o `Header` e, quando `entityPlanRequirement()` não é `null`,
  envolve o `<Form>` em `<PlanGate>`. Com a variável vazia, o `PlanGate` nem é montado (evita hook
  condicional e mantém intactos os testes de hoje, como `entityFormsReadOnly.test.tsx`).
- Sem rota nova, sem `queryKey` nova (reaproveita `queryKeys.account.me()`), sem formulário novo.
- Depois do checkout, a conta é relida pelo `useCheckoutConfirmation`; a tela de criação busca a conta ao
  montar. Não é preciso invalidar nada.

## 7. i18n

- `apiErrors.PLAN_SUBSCRIPTION_REQUIRED` e `apiErrors.PLAN_FEATURE_REQUIRED` nos 3 idiomas.
- `apps.app.shared.planGate` (`translations/apps/app/shared/index.ts`): `subscriptionRequired.{title,
  description}`, `featureRequired.{title, description}`, `viewPlans`.
- Paridade coberta pelo `packages/internationalization/__tests__/parity.test.ts`. Usar `/i18n-sync`.

## 8. Autorização, segurança e personificação

- O gate vive no servidor. A UI só antecipa a mesma decisão com os dados que o servidor calculou.
- Nenhum corpo de requisição escreve `entitlements`: o `PUT /account` monta o patch campo a campo a partir
  do schema e o webhook só confia no que passou por `constructEvent`.
- O `lookup_key` é texto do catálogo, sem PII. Mesmo assim, fica fora do log.
- Personificação: o admin vê o que o titular vê. `GET /account` devolve o `planAccess` do sujeito, e o
  `PlanGate` reflete o plano dele. Escrita personificada continua sendo recusada pelo read-only antes do
  gate de plano. O link do convite leva à aba de cobrança, onde os botões já ficam desabilitados sob
  personificação.
- Admin no painel admin: N/A (`requireAdminApi` não tem `subjectProfile`).

## 9. Testes

Tudo em Vitest, sem emulador e sem rede. Nenhum teste de emulador novo: não há consulta nova, índice novo
nem regra do Firestore nova, e a transação segue o mesmo molde já testado com `db` falso em
`userRepositoryBilling.test.ts`.

| Teste | Nível | Prova |
|-------|-------|-------|
| `apps/api/__tests__/planAccess.test.ts` (novo) | unit | a tabela da seção 2 em `planAccessDenial`; `toPlanAccess` com cobrança ligada e desligada (mock de `@/(shared)/lib/billing`), lista ausente, lista malformada; `refusePlanAccess` com status e código |
| `apps/api/__tests__/planGuard.test.ts` (novo) | rota com guard mockado | `requirePlanApi` com `null`, com objeto e com função; handler não roda na recusa; escrita personificada recebe o read-only, não o código de plano |
| `apps/api/__tests__/entitiesRoutePlanGate.test.ts` (novo) | rota com `vi.mock` de repositório e guard | variável vazia cria como hoje; variável preenchida sem assinatura responde `PLAN_SUBSCRIPTION_REQUIRED` e não chama `create`; sem o recurso responde `PLAN_FEATURE_REQUIRED`; com o recurso cria; `GET /entities` nunca é gateado |
| `billingState.test.ts` (estende) | unit | `toEntitlementsState` (dedupe, ordem, timestamp); `decideEntitlementsWrite` (nada gravado, mais antigo, igual, mais novo, ilegível) |
| `userRepositoryBilling.test.ts` (estende) | repositório com `db` falso | `applyEntitlementsState` devolve `applied`, `skipped` e `missing` e escreve dentro da transação |
| `paymentsWebhookRoute.test.ts` (estende) | rota com `constructEvent` mockado e um caso assinado | evento grava a lista; perfil ausente responde 200 e marca o evento; `has_more` chama a listagem com o `customer` e usa o resultado; listagem que falha responde 500 e não marca; payload assinado com `stripe.webhooks.generateTestHeaderString` a partir do exemplo da doc da Stripe |
| `accountRoute.test.ts` (estende) | rota | `GET /account` traz `planAccess` com `enforced: false` com a cobrança desligada e com `subscribed`/`features` corretos quando ligada |
| `accountExportRoute.test.ts` (estende) | rota | `entitlements` presente e `null` quando ausente; `planAccess` fora da exportação |
| `apps/app/__tests__/planGate.test.tsx` (novo) | componente com `useMyAccount` mockado | cobrança desligada mostra o conteúdo; carregando mostra o fallback; sem assinatura mostra o convite de assinatura com `href` `/pt-br/account?tab=billing`; sem recurso mostra o convite de recurso; liberado mostra o conteúdo; erro na conta mostra o conteúdo |
| `apps/app/__tests__/entityPlanRequirement.test.ts` (novo) | unit | vazio e ausente dão `null`; valor dá `{ feature }` |
| `apps/app/__tests__/entityCreatePlanGate.test.tsx` (novo) | componente | com requisito e acesso negado, a tela de criação mostra o convite e não o formulário; sem requisito, o formulário aparece sem montar o `PlanGate` |

Testes existentes que precisam de mock novo, porque a rota passa a importar `plan-access.ts` →
`billing.ts` → `@repo/payments` (que importa `server-only`): `entitiesRouteList.test.ts`,
`entitiesRouteImpersonation.test.ts`, `entityPhotoReference.test.ts`, `accountRoute.test.ts` e
`storageUpload.emulator.test.ts`. A correção em cada um é
`vi.mock("@/(shared)/lib/billing", () => ({ isBillingEnabled: () => false }))`, que reproduz o
comportamento de hoje. Nenhuma asserção existente muda.

## 10. O que o `/test` percorre

Sem conta Stripe, seguindo o precedente da rodada B de `billing-subscription`: chaves fictícias com o
prefixo certo (`sk_test_…`, `whsec_…`) ligam `isBillingEnabled()` sem chamar a Stripe, e o webhook é
exercido com payload assinado localmente por `generateTestHeaderString`. Os valores fictícios não vão para
nenhum artefato.

Estados e como produzir:

| Estado | Como produzir |
|--------|---------------|
| sem assinatura | perfil de QA recém-criado (`qa-plan-entitlements@example.com`) |
| assinatura viva sem recurso | webhook assinado `customer.subscription.updated` com `status: active` para o `stripeCustomerId` do perfil (gravar o `stripeCustomerId` direto no emulador) |
| assinatura viva com recurso | webhook assinado `entitlements.active_entitlement_summary.updated` com o `lookup_key` igual ao da variável |
| assinatura cancelada com recurso ainda gravado | `customer.subscription.deleted` sem novo evento de recursos |
| demo desligada | `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` vazia na API e no app |
| cobrança desligada | apagar as chaves Stripe da API |

Fluxos:

1. Demo desligada: `/entities/create` cria como hoje; `POST /entities` responde 201.
2. Demo ligada, sem assinatura: a tela mostra o convite de assinatura; "Ver planos" leva a
   `/<locale>/account?tab=billing`; `POST /entities` direto (curl com o token) responde 403
   `PLAN_SUBSCRIPTION_REQUIRED` mesmo com a UI escondendo o formulário.
3. Assinatura viva sem o recurso: convite de recurso; `POST /entities` responde 403 `PLAN_FEATURE_REQUIRED`.
4. Assinatura viva com o recurso: formulário aparece e a criação passa.
5. Cancelada com recurso ainda gravado: volta ao convite de assinatura (a negação vence).
6. Cobrança desligada com a demo ligada: formulário aparece e a criação passa.
7. Admin personificando o titular sem plano: vê o convite; o link leva à aba de cobrança com botões
   desabilitados.
8. Reentrega do mesmo `event.id` responde `{ duplicate: true }`; um evento de recursos mais antigo que o
   gravado não sobrescreve a lista.

Combinações: o convite em light, dark e mobile, nos 3 idiomas (pt-br, en, es); o toast traduzido do
`PLAN_FEATURE_REQUIRED` quando a UI está desatualizada (por exemplo, recurso revogado com a tela aberta e
clique em salvar).

## 11. Critérios que fecham só com conta Stripe real (🔒)

Não reprovam a entrega; viram "não verificado".

- 🔒 A Stripe entrega `entitlements.active_entitlement_summary.updated` ao endpoint cadastrado, no formato
  da versão `2025-09-30.clover`, e o perfil recebe a lista.
- 🔒 Um recurso cadastrado no Dashboard e ligado ao produto aparece no perfil depois de um checkout real; em
  assinatura já existente, só a partir do próximo ciclo (comportamento documentado pela Stripe).
- 🔒 O que a Stripe faz com os recursos ativos em `past_due`, `unpaid` e `paused`. A doc não diz; se ela os
  revogar, o gate por recurso nega nesses estados mesmo com o gate por status passando.
- 🔒 Cliente com mais de 10 recursos: a listagem paginada real (`has_more`), coberta aqui só com mock.

## 12. Pré-requisitos manuais de infra

O `/develop` não os satisfaz e o `/test` não reprova por eles. Entram no item 12 de
`docs/PRE-PRODUCTION.md`.

1. Cadastrar no painel da Stripe (Product catalog → Features) cada recurso com o `lookup_key` que o código
   do fork vai pedir, e ligá-lo aos produtos que o incluem.
2. Acrescentar `entitlements.active_entitlement_summary.updated` aos eventos do endpoint
   `https://<api>/webhooks/payments` (passam de cinco para seis).
3. Opcional, só para ver a demonstração: `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` com o mesmo valor na
   `apps/api` e na `apps/app` (Vercel). Na `apps/app` o valor é embutido no build, então mudar exige novo
   deploy.
4. Conferir na conta Stripe se o Entitlements tem custo. As páginas lidas não falam disso.

---

# Etapa 2: blueprint técnico

## 10.1 Contrato

```ts
// packages/sdk/src/types/payments/plan-access.ts  (novo)
export type EntitlementsState = {
    /** Provider lookup keys of the features the customer holds right now. */
    features: string[];
    /** Creation instant of the provider event that produced this list. */
    lastEventAt: Date;
};

export type EntitlementsStateDTO = Omit<EntitlementsState, "lastEventAt"> & {
    lastEventAt: string;
};

/** An empty requirement asks only for a live subscription. */
export type PlanRequirement = { feature?: string };

export const PLAN_ACCESS_DENIALS = [
    "PLAN_SUBSCRIPTION_REQUIRED",
    "PLAN_FEATURE_REQUIRED",
] as const;

export type PlanAccessDenial = (typeof PLAN_ACCESS_DENIALS)[number];

/** `enforced: false` means billing is off here, so nothing is gated. */
export type PlanAccessDTO = {
    enforced: boolean;
    subscribed: boolean;
    features: string[];
};

export function planAccessDenial(
    access: PlanAccessDTO,
    requirement: PlanRequirement
): PlanAccessDenial | null {
    if (!access.enforced) {
        return null;
    }
    if (!access.subscribed) {
        return "PLAN_SUBSCRIPTION_REQUIRED";
    }
    if (requirement.feature && !access.features.includes(requirement.feature)) {
        return "PLAN_FEATURE_REQUIRED";
    }
    return null;
}
```

```diff
 // packages/sdk/src/types/payments/index.ts
 export * from "./payments";
+export * from "./plan-access";

 // packages/sdk/src/types/user/user.ts
-import type { SubscriptionState } from "../payments/payments";
+import type { SubscriptionState } from "../payments/payments";
+import type { EntitlementsState } from "../payments/plan-access";
 ...
     subscription?: SubscriptionState | null;
+    /** Written only by the payments webhook. Absent means no feature was ever granted. */
+    entitlements?: EntitlementsState | null;
 };

 // packages/sdk/src/types/account/account.ts
-export type AccountDTO = Omit<UserWithAuthDTO, "subscription"> & {
+export type AccountDTO = Omit<UserWithAuthDTO, "subscription" | "entitlements"> & {
     phone: string | null;
     avatar: string | null;
     avatarUrl: string | null;
     preferences: UserPreferences;
     subscription?: SubscriptionStateDTO | null;
+    entitlements?: EntitlementsStateDTO | null;
+    /** Computed per request; never stored. */
+    planAccess: PlanAccessDTO;
 };
 ...
-    account: Omit<AccountDTO, "avatarUrl">;
+    account: Omit<AccountDTO, "avatarUrl" | "planAccess">;
```

## 10.2 API: checagem e guard

```ts
// apps/api/(shared)/lib/plan-access.ts  (novo)
import {
    type PlanAccessDTO,
    type PlanRequirement,
    planAccessDenial,
} from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { isBillingEnabled } from "./billing";
import { isLiveSubscription } from "./billing-state";

type PlanHolder = { subscription?: unknown; entitlements?: unknown };

export function readEntitlementFeatures(stored: unknown): string[] {
    const features = (stored as { features?: unknown } | null)?.features;
    return Array.isArray(features)
        ? features.filter((key): key is string => typeof key === "string")
        : [];
}

export function toPlanAccess(holder: PlanHolder): PlanAccessDTO {
    return {
        enforced: isBillingEnabled(),
        subscribed: isLiveSubscription(holder.subscription as { status?: unknown }),
        features: readEntitlementFeatures(holder.entitlements),
    };
}

export function refusePlanAccess(
    holder: PlanHolder,
    requirement: PlanRequirement
): Response | null {
    const denial = planAccessDenial(toPlanAccess(holder), requirement);
    return denial
        ? Response.json({ error: { code: denial } }, { status: HTTP_STATUS.FORBIDDEN })
        : null;
}
```

```ts
// apps/api/app/(guards)/plan.ts  (novo)
import type { PlanRequirement } from "@repo/sdk/src/types";
import { refusePlanAccess } from "@/(shared)/lib/plan-access";
import { requireCommonPanelApi } from "./common-panel";

type RequirementSource =
    | PlanRequirement
    | null
    | (() => PlanRequirement | null);

const resolve = (source: RequirementSource) =>
    typeof source === "function" ? source() : source;

/** Runs after the common-panel guard, so an impersonated write is refused as read-only first. */
export function requirePlanApi<TRouteContext extends Record<string, unknown> | undefined = undefined>(
    source: RequirementSource,
    handler: Parameters<typeof requireCommonPanelApi<TRouteContext>>[0]
) {
    return requireCommonPanelApi<TRouteContext>(async (req, ctx) => {
        const requirement = resolve(source);
        const refusal = requirement
            ? refusePlanAccess(ctx.subjectProfile, requirement)
            : null;
        return refusal ?? handler(req, ctx);
    });
}
```

```ts
// apps/api/(shared)/lib/entity-plan.ts  (novo)
import type { PlanRequirement } from "@repo/sdk/src/types";
import { env } from "@/env";

export function entityPlanRequirement(): PlanRequirement | null {
    const feature = env.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE;
    return feature ? { feature } : null;
}
```

```diff
 // apps/api/app/(routes)/entities/route.ts
-export const POST = requireCommonPanelApi(async (req, ctx) => {
+export const POST = requirePlanApi(entityPlanRequirement, async (req, ctx) => {
```

Exemplo de recusa:

```http
POST /entities
{ "name": "Cliente QA", "type": "customer" }

HTTP/1.1 403
{ "error": { "code": "PLAN_FEATURE_REQUIRED" } }
```

## 10.3 API: webhook

```ts
// apps/api/(shared)/lib/billing-state.ts  (acréscimo)
export function toEntitlementsState(
    lookupKeys: readonly string[],
    eventCreatedSeconds: number
): EntitlementsState {
    return {
        features: [...new Set(lookupKeys)].sort(),
        lastEventAt: new Date(eventCreatedSeconds * MS_PER_SECOND),
    };
}

export type EntitlementsWriteDecision = { kind: "apply" } | { kind: "skip"; reason: "stale" };

/** The summary is always the whole list, so the newest event wins outright. */
export function decideEntitlementsWrite(
    stored: unknown,
    next: EntitlementsState
): EntitlementsWriteDecision {
    const raw = (stored as { lastEventAt?: unknown } | null)?.lastEventAt;
    const storedMs = raw ? Date.parse(normalizeFirestoreInstant(raw)) : Number.NaN;
    if (Number.isNaN(storedMs) || next.lastEventAt.getTime() >= storedMs) {
        return { kind: "apply" };
    }
    return { kind: "skip", reason: "stale" };
}
```

```ts
// apps/api/(shared)/lib/billing.ts  (acréscimo)
const MAX_ACTIVE_ENTITLEMENTS = 1000;
const ENTITLEMENTS_PAGE_SIZE = 100;

/** Only for summaries flagged `has_more`: the event carries at most ten entitlements. */
export async function listActiveEntitlementKeys(
    stripe: Stripe,
    customerId: string
): Promise<string[]> {
    const entitlements = await stripe.entitlements.activeEntitlements
        .list({ customer: customerId, limit: ENTITLEMENTS_PAGE_SIZE })
        .autoPagingToArray({ limit: MAX_ACTIVE_ENTITLEMENTS });
    return entitlements.map((entitlement) => entitlement.lookup_key);
}
```

```diff
 // apps/api/app/(routes)/webhooks/payments/route.ts
+async function reconcileEntitlements(
+    stripe: Stripe,
+    event: Stripe.Event,
+    summary: Stripe.Entitlements.ActiveEntitlementSummary,
+    requestId: string | null
+): Promise<void> {
+    const profile = await userRepository.findByStripeCustomerId(summary.customer);
+    if (!profile) {
+        logProfileNotFound(event.type, requestId);
+        return;
+    }
+
+    const lookupKeys = summary.entitlements.has_more
+        ? await listActiveEntitlementKeys(stripe, summary.customer)
+        : summary.entitlements.data.map((entitlement) => entitlement.lookup_key);
+    const state = toEntitlementsState(lookupKeys, event.created);
+    const result = await userRepository.applyEntitlementsState(profile.id, state);
+
+    logEvent("payments", "webhook-entitlements-reconciled", {
+        eventType: event.type,
+        result,
+        featureCount: state.features.length,
+        requestId,
+    });
+}
 ...
         case "invoice.paid": { ... }
+        case "entitlements.active_entitlement_summary.updated": {
+            await reconcileEntitlements(stripe, event, event.data.object, requestId);
+            break;
+        }
```

Payload de exemplo para os testes, tirado da doc da Stripe (ids fictícios):

```json
{
  "id": "evt_qa_entitlements",
  "type": "entitlements.active_entitlement_summary.updated",
  "created": 1780000000,
  "data": {
    "object": {
      "object": "entitlements.active_entitlement_summary",
      "customer": "cus_qa",
      "entitlements": {
        "object": "list",
        "data": [
          { "id": "ent_qa_1", "object": "entitlements.active_entitlement", "feature": "feat_qa_1", "livemode": false, "lookup_key": "advanced-reports" }
        ],
        "has_more": false,
        "url": "/v1/customer/cus_qa/entitlements"
      },
      "livemode": false
    }
  }
}
```

## 10.4 Persistência

```ts
// apps/api/(shared)/repositories/user.repository.ts  (acréscimo, ao lado de applySubscriptionState)
applyEntitlementsState(
    id: string,
    next: EntitlementsState
): Promise<"applied" | "skipped" | "missing"> {
    const ref = this.db.collection(this.table).doc(id);

    return this.db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) {
            return "missing";
        }
        if (decideEntitlementsWrite(snapshot.data()?.entitlements, next).kind === "skip") {
            return "skipped";
        }
        transaction.update(ref, { entitlements: next, updatedAt: new Date() });
        return "applied";
    });
}
```

Documento depois do primeiro evento:

```json
{
  "stripeCustomerId": "cus_qa",
  "subscription": { "status": "active", "...": "..." },
  "entitlements": {
    "features": ["advanced-reports"],
    "lastEventAt": "<Timestamp 2026-05-28T...>"
  }
}
```

## 10.5 Conta e exportação

```diff
 // apps/api/(shared)/lib/account-avatar.ts
 export async function withAvatarUrl(
     merged: Record<string, unknown>
-): Promise<AccountDTO> {
+): Promise<Omit<AccountDTO, "planAccess">> {

 // apps/api/app/(routes)/account/route.ts
+const toAccountResponse = async (merged: Record<string, unknown>): Promise<AccountDTO> => ({
+    ...(await withAvatarUrl(merged)),
+    planAccess: toPlanAccess(merged),
+});
 ...
-    return Response.json({ data: await withAvatarUrl(merged) });
+    return Response.json({ data: await toAccountResponse(merged) });
 (nos dois pontos: GET :104 e PUT :166)

 // apps/api/(shared)/lib/account-export.ts  (toExportAccount)
+    const entitlements =
+        merged.entitlements && typeof merged.entitlements === "object"
+            ? (merged.entitlements as AccountDTO["entitlements"])
+            : null;
     return {
         ...,
         subscription,
+        entitlements,
     };
```

Resposta de `GET /account` (trecho):

```json
{
  "data": {
    "subscription": { "status": "active", "priceId": "price_qa", "...": "..." },
    "entitlements": { "features": ["advanced-reports"], "lastEventAt": "2026-05-28T00:26:40.000Z" },
    "planAccess": { "enforced": true, "subscribed": true, "features": ["advanced-reports"] }
  }
}
```

## 10.6 Env

```diff
 // apps/api/env.ts  (client; redeclarado aqui pelo mesmo motivo de NEXT_PUBLIC_APP_URL: skipValidation em dev)
     client: {
         NEXT_PUBLIC_APP_URL: z.url().optional(),
+        NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE: z.string().max(80).optional(),
     },
     runtimeEnv: {
         ...
+        NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE:
+            process.env.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE || undefined,
     },

 // apps/app/env.ts  (client)
+        NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE: z.string().max(80).optional(),
 ...
+        NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE:
+            process.env.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE || undefined,
```

O `|| undefined` segue a política de "string vazia é ausência" (`.claude/cycle-policy.md` §3) e o que
`packages/payments/keys.ts:16-19` já faz. O teto de 80 é o limite de `lookup_key` da Stripe.

`.env.example` dos dois apps, linha nova e comentada:

```bash
# Optional demo of the plan gate. Set it to a Stripe feature lookup key and creating an
# entity requires a live subscription that includes that feature (only while billing is
# on). Empty keeps the entity CRUD as it is. Use the same value in apps/api and apps/app.
NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE=""
```

## 10.7 Front: árvore de arquivos

```
apps/app/
  shared/components/ui/PlanGate.tsx          (novo, "use client": PlanGate + PlanGateInvite)
  shared/lib/entityPlanRequirement.ts        (novo)
  env.ts                                     (variável nova)
  .env.example                               (variável nova)
  app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/page.tsx  (envolve o form)
  __tests__/planGate.test.tsx                (novo)
  __tests__/entityPlanRequirement.test.ts    (novo)
  __tests__/entityCreatePlanGate.test.tsx    (novo)
```

```tsx
// apps/app/shared/components/ui/PlanGate.tsx  (esqueleto)
"use client";

type PlanGateProps = {
    requirement: PlanRequirement;
    children: ReactNode;
    loadingFallback?: ReactNode;
};

export function PlanGate({ requirement, children, loadingFallback = null }: PlanGateProps) {
    const { data: account, isLoading } = useMyAccount();

    if (isLoading) {
        return loadingFallback;
    }
    const denial = account?.planAccess
        ? planAccessDenial(account.planAccess, requirement)
        : null;

    return denial ? <PlanGateInvite denial={denial} /> : children;
}

function PlanGateInvite({ denial }: { denial: PlanAccessDenial }) {
    const { dictionary, locale } = getDictionary();
    const planGate = dictionary.apps.app.shared.planGate;
    const copy = denial === "PLAN_FEATURE_REQUIRED"
        ? planGate.featureRequired
        : planGate.subscriptionRequired;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{copy.title}</CardTitle>
                <CardDescription>{copy.description}</CardDescription>
            </CardHeader>
            <CardFooter>
                <Button asChild>
                    <Link href={withLocalePath(locale, "/account?tab=billing")}>
                        {planGate.viewPlans}
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}
```

```diff
 // entities/(pages)/create/page.tsx
+    const planRequirement = entityPlanRequirement();
+    const createForm = (
+        <Form {...form}> ...o mesmo JSX de hoje... </Form>
+    );
 ...
             <Container contentOnly>
-                <Form {...form}> ... </Form>
+                {planRequirement ? (
+                    <PlanGate loadingFallback={<FormSkeleton />} requirement={planRequirement}>
+                        {createForm}
+                    </PlanGate>
+                ) : (
+                    createForm
+                )}
             </Container>
```

## 10.8 i18n

```ts
// translations/packages/shared/utils.ts → apiErrors
"pt-br": {
    PLAN_SUBSCRIPTION_REQUIRED: "Esta ação exige uma assinatura ativa.",
    PLAN_FEATURE_REQUIRED: "O seu plano não inclui este recurso.",
},
en: {
    PLAN_SUBSCRIPTION_REQUIRED: "This action requires an active subscription.",
    PLAN_FEATURE_REQUIRED: "Your plan does not include this feature.",
},
es: {
    PLAN_SUBSCRIPTION_REQUIRED: "Esta acción requiere una suscripción activa.",
    PLAN_FEATURE_REQUIRED: "Tu plan no incluye esta función.",
},

// translations/apps/app/shared/index.ts → planGate
"pt-br": {
    planGate: {
        subscriptionRequired: {
            title: "Disponível para assinantes",
            description: "Assine um plano para usar este recurso.",
        },
        featureRequired: {
            title: "Fora do seu plano",
            description: "O seu plano atual não inclui este recurso. Veja os planos que incluem.",
        },
        viewPlans: "Ver planos",
    },
},
en: {
    planGate: {
        subscriptionRequired: {
            title: "Available to subscribers",
            description: "Subscribe to a plan to use this feature.",
        },
        featureRequired: {
            title: "Not in your plan",
            description: "Your current plan does not include this feature. See the plans that do.",
        },
        viewPlans: "View plans",
    },
},
es: {
    planGate: {
        subscriptionRequired: {
            title: "Disponible para suscriptores",
            description: "Suscríbete a un plan para usar esta función.",
        },
        featureRequired: {
            title: "Fuera de tu plan",
            description: "Tu plan actual no incluye esta función. Mira los planes que la incluyen.",
        },
        viewPlans: "Ver planes",
    },
},
```

## 10.9 Documentação

| Arquivo | Mudança |
|---------|---------|
| `docs/PAYMENTS.md` | linha nova na tabela de eventos (`entitlements.active_entitlement_summary.updated`); campo `entitlements` em "Dados"; seção curta "Acesso por plano" (regra da seção 2, `requirePlanApi`, `PlanGate`, os dois códigos, modo degradado, a demo); "Fora do corte" perde "bloquear acesso por plano" e mantém "bloquear em `past_due`" |
| `docs/PRE-PRODUCTION.md` §12 | seis eventos em vez de cinco; recursos no Dashboard ligados aos produtos; variável opcional da demo; conferir custo do Entitlements. De passagem, corrigir a referência `billing-state.ts:141-147` (linha 485), que hoje aponta para `toPlanLabel`: a regra citada está em `billing-state.ts:207-214` |
| `.claude/skills/payments-flow/SKILL.md` | a receita "Gate de acesso por plano" (linhas 62-66) passa a apontar para `requirePlanApi`/`refusePlanAccess` e `PlanGate`; a invariante "nada de reler a Stripe no webhook" ganha a exceção do `has_more` |
| `apps/api/.env.example` | variável da demo; lista de eventos do comentário Stripe ganha o sexto |
| `apps/app/.env.example` | variável da demo |

## 10.10 Ordem de implementação e commits

1. `feat(sdk): plan access contract and entitlements on the profile`
2. `feat(api): plan access check and requirePlanApi guard` (plan-access, guard, testes `planAccess`/`planGuard`)
3. `feat(api): reconcile Stripe entitlements from the payments webhook` (billing-state, billing, repositório, webhook, testes)
4. `feat(api): expose planAccess on the account and entitlements on the export` (account route, avatar, export, testes)
5. `feat(api): gate entity creation behind an optional plan feature` (entity-plan, env, `.env.example`, rota, testes novos e mocks nos testes existentes)
6. `feat(app): PlanGate component with the subscribe invite` (componente + teste)
7. `feat(app): optional plan gate on the entity create screen` (env, `.env.example`, `entityPlanRequirement`, página, testes)
8. `feat(internationalization): plan gate copy and plan access error codes`
9. `docs: plan access in PAYMENTS, PRE-PRODUCTION and the payments-flow skill`
10. `docs(specs): plan-entitlements in progress` (só o frontmatter da spec)
11. `docs(features): plan-entitlements`

Os commits 2 a 5 só ficam verdes juntos com o 8 no `pnpm test` (paridade de `apiErrors`). Se o `/review`
preferir cada commit verde, o 8 sobe para logo depois do 1.

## 10.11 `contends_on` previsto

```
packages/sdk/src/types/payments/plan-access.ts            (novo)
packages/sdk/src/types/payments/index.ts
packages/sdk/src/types/user/user.ts
packages/sdk/src/types/account/account.ts
apps/api/(shared)/lib/plan-access.ts                      (novo)
apps/api/(shared)/lib/entity-plan.ts                      (novo)
apps/api/app/(guards)/plan.ts                             (novo)
apps/api/(shared)/lib/billing-state.ts
apps/api/(shared)/lib/billing.ts
apps/api/(shared)/lib/account-avatar.ts
apps/api/(shared)/lib/account-export.ts
apps/api/(shared)/repositories/user.repository.ts
apps/api/app/(routes)/webhooks/payments/route.ts
apps/api/app/(routes)/entities/route.ts
apps/api/app/(routes)/account/route.ts
apps/api/env.ts
apps/api/.env.example
apps/api/__tests__/planAccess.test.ts                     (novo)
apps/api/__tests__/planGuard.test.ts                      (novo)
apps/api/__tests__/entitiesRoutePlanGate.test.ts          (novo)
apps/api/__tests__/billingState.test.ts
apps/api/__tests__/userRepositoryBilling.test.ts
apps/api/__tests__/paymentsWebhookRoute.test.ts
apps/api/__tests__/accountRoute.test.ts
apps/api/__tests__/accountExportRoute.test.ts
apps/api/__tests__/entitiesRouteList.test.ts
apps/api/__tests__/entitiesRouteImpersonation.test.ts
apps/api/__tests__/entityPhotoReference.test.ts
apps/api/__tests__/storageUpload.emulator.test.ts
apps/app/shared/components/ui/PlanGate.tsx                (novo)
apps/app/shared/lib/entityPlanRequirement.ts              (novo)
apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/page.tsx
apps/app/env.ts
apps/app/.env.example
apps/app/__tests__/planGate.test.tsx                      (novo)
apps/app/__tests__/entityPlanRequirement.test.ts          (novo)
apps/app/__tests__/entityCreatePlanGate.test.tsx          (novo)
packages/internationalization/translations/packages/shared/utils.ts
packages/internationalization/translations/apps/app/shared/index.ts
docs/PAYMENTS.md
docs/PRE-PRODUCTION.md
.claude/skills/payments-flow/SKILL.md
specs/plan-entitlements.md                                (só frontmatter, já feito nesta etapa)
```

Os três arquivos do `contends_on` da spec estão aqui, menos `packages/sdk/src/types/payments/payments.ts`:
o contrato novo foi para um arquivo próprio no mesmo diretório, e `payments.ts` não muda.

---

# Perguntas em aberto

Nenhuma bloqueia o `/develop`. Cada uma traz a opção adotada.

**P1. Stripe Entitlements ou mapa local de preço para recurso?**
Opções: Entitlements; mapa `priceId → features` no código ou em env.
**Adotada: Entitlements**, recomendação da spec. Conferido no código: `stripe@19.1.0` tipa o evento
(`EventTypes.d.ts:1461-1472`) e o cliente expõe `entitlements.activeEntitlements` (`index.d.ts:384-387`).
O fork muda o plano sem deploy. Descartada: mapa local, que duplica o catálogo da Stripe e exige deploy a
cada mudança de plano.

**P2. Quando status e lista de recursos discordam, quem vence?**
Opções: conjunção (precisa dos dois); só a lista; só o status.
**Adotada: conjunção, a negação vence** (seção 2). Cobre a janela entre os dois eventos sem liberar quem
cancelou. Descartada: confiar só na lista, que libera por segundos quem acabou de cancelar se o evento de
recursos atrasar.

**P3. `unpaid` e `paused` contam como assinatura viva para o gate?**
Opções: reaproveitar `LIVE_SUBSCRIPTION_STATUSES` (inclui os dois); criar uma lista própria de acesso
(`active`, `trialing`, `past_due`).
**Adotada: reaproveitar.** A spec define o gate sobre "assinatura viva" e cita `isLiveSubscription`; o
"Fora do corte" deixa bloqueio por inadimplência para cada fork. Descartada: lista própria, que é decisão de
produto sobre inadimplência. Fica a seu critério se quiser bloquear `unpaid`/`paused` no core.

**P4. Cliente com mais de 10 recursos ativos (o evento traz no máximo 10).**
Opções: buscar a lista completa na Stripe só quando `has_more`; guardar só os 10; sempre reler a Stripe.
**Adotada: buscar só quando `has_more`.** É a orientação da doc da Stripe e a única exceção à invariante
"nada de reler a Stripe no webhook", testada com mock. Descartadas: guardar 10 (nega em silêncio o 11º
recurso) e reler sempre (webhook impossível de testar sem conta e uma chamada a mais por evento).

**P5. Status HTTP da recusa.**
Opções: 403; 402.
**Adotada: 403.** `HTTP_STATUS` não tem 402 e a RFC 9110 reserva o 402 para uso futuro. Descartada: 402.

**P6. Um código de erro ou dois?**
**Adotada: dois** (`PLAN_SUBSCRIPTION_REQUIRED`, `PLAN_FEATURE_REQUIRED`), para a UI distinguir "assine"
de "seu plano não inclui". Descartado: um código só, que obrigaria a mesma copy para quem não paga e para
quem paga o plano errado.

**P7. Como o app sabe se o gate está ligado?**
Opções: `planAccess` calculado no `GET /account`; usar o `enabled` de `GET /payments/plans`; uma env no app.
**Adotada: `planAccess` na conta.** Já vem na leitura que o painel faz, não chama a Stripe e usa o mesmo
`isBillingEnabled()` da API. Descartadas: `GET /payments/plans` (chama `prices.list` e falha com 503 se a
Stripe cair) e env no app (não sabe das chaves Stripe da API e pode divergir).

**P8. Onde mora a regra pura?**
Opções: função `planAccessDenial` no SDK, usada pela API e pelo app; uma cópia em cada lado.
**Adotada: no SDK**, junto dos tipos de `payments`. É a primeira função de runtime em
`packages/sdk/src/types` (até aqui só constantes, como `LIVE_SUBSCRIPTION_STATUSES`), e o SDK não tem
Vitest: o teste dela mora em `apps/api/__tests__/planAccess.test.ts`. Descartada: duas cópias, que divergem
na primeira mudança.

**P9. O que a demonstração em `entity` protege?**
Opções: só a criação; criação e edição; a lista inteira.
**Adotada: só a criação** (`POST /entities` + `/entities/create`), o menor raio que mostra o padrão nas duas
pontas. Descartadas: edição (exige o gate no `[id]/route.ts` e na tela de edição sem ganho didático) e lista
(esconderia dados já criados de quem cancelou, decisão de produto).

**P10. Variável da demonstração.**
Opções: `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` com o mesmo nome nos dois apps; duas variáveis diferentes;
aceitar um valor sentinela para "só assinatura".
**Adotada: um nome nos dois apps**, como `NEXT_PUBLIC_PRODUCT_MODE` (que já precisa ser igual nos três,
`docs/PRE-PRODUCTION.md:457`). Descartadas: duas variáveis (mais chance de divergir) e o sentinela (um
`lookup_key` pode ter qualquer valor, então o sentinela colide).

**P11. Nome e forma do campo no perfil.**
Opções: `entitlements: { features, lastEventAt }`; `planFeatures: string[]`.
**Adotada: `entitlements` com `lastEventAt`**, porque a regra de ordem precisa do instante e o termo é o da
Stripe. Descartada: array solto, que não tem como recusar evento atrasado.

**P12. O que o `PlanGate` mostra se a conta não carregar?**
Opções: o conteúdo; um `LoadErrorState`.
**Adotada: o conteúdo.** A API decide de qualquer forma e devolve o código traduzido no toast. Descartada:
`LoadErrorState`, que trava a tela inteira por causa de um dado acessório.

**P13. Dois eventos de recursos no mesmo segundo.**
**Adotada: aplica o que chegar por último.** `event.created` tem resolução de segundo e não há outro campo
de ordem no resumo. Descartada: ignorar o empate, que pode deixar a lista mais antiga.

**P14. Referência quebrada em `docs/PRE-PRODUCTION.md:485`.**
O texto cita `billing-state.ts:141-147` para a regra que mantém a assinatura mais recente; essas linhas são
`toPlanLabel`. **Adotada: corrigir para `billing-state.ts:207-214`** ao editar o §12, como manda a política
de medir e corrigir doc ao passar por ela. Descartada: deixar como está.

# Riscos

- **Prova sem conta Stripe é parcial.** Gate, componente, regra de ordem e webhook se provam com Vitest e com
  webhook assinado localmente. A entrega real do evento e o comportamento da Stripe em estados de
  inadimplência ficam 🔒 (seção 11).
- **Custo do Entitlements não confirmado.** As duas páginas lidas não falam em preço. Vai para o
  `PRE-PRODUCTION.md` como item a conferir.
- **Mudança no template `entity`.** Todo fork copia esse slice. A variável nasce vazia e, vazia, a tela nem
  monta o `PlanGate`; o teste `entitiesRoutePlanGate.test.ts` prova que a rota se comporta como hoje.
- **Cinco testes existentes ganham um mock.** A cadeia `plan-access.ts → billing.ts → @repo/payments` puxa
  `server-only`. O mock de `isBillingEnabled` mantém o comportamento atual e nenhuma asserção muda.
- **Recurso ligado a produto não vale na hora para quem já assina.** A Stripe só cria o recurso ativo no
  próximo ciclo. Vai para o `PAYMENTS.md`.
- **`AccountDTO.planAccess` obrigatório.** Fixture tipada de `AccountDTO` sem o campo quebra o typecheck; a
  única encontrada usa `as unknown as AccountDTO` e não quebra.
