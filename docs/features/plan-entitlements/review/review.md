# Revisão: acesso por plano espelhado na API

Rodada autônoma (`/cycle --no-audit`), 2026-09-30. Diff revisado: working tree contra `e791d3a`
(`origin/main`), 47 entradas no `git status --short` antes das correções, 48 depois (um teste novo).
Nada foi levado ao índice, nada foi commitado. Nenhum app, emulador, browser ou suíte de testes foi
executado nesta etapa.

## Branch

- Nome: `feat/plan-entitlements`, criada com `git switch -c` a partir do HEAD destacado em `e791d3a`.
- O diff toca `packages/sdk`, `apps/api`, `apps/app` e `packages/internationalization`. Por isso a branch
  não leva prefixo de projeto, que é a forma aceita para mudança em vários apps.
- `git branch --list '*plan-entitlements*'` e `git ls-remote --heads origin '*plan-entitlements*'` saíram
  vazios antes da criação.
- Regex de `.claude/agents/revisor-codigo.md`: `branch OK: feat/plan-entitlements`.

## Achados

| Sev. | Onde | Problema | Ação |
|------|------|----------|------|
| 🟡 | `apps/api/__tests__/impersonationReadOnly.test.ts` (versão do `/develop`, bloco "calls the helper or returns a base guard") | A checagem do guard composto era por arquivo: bastava um `return requireCommonPanelApi(` em qualquer ponto. Um arquivo com dois `export function require*Api` e uma única delegação passava, e o teste de simetria não exercitava o `requirePlanApi`. | Endurecido (ver decisão abaixo). |
| 🟡 | `apps/api/(shared)/lib/billing.ts:182-191` | `listActiveEntitlementKeys` sem teste: no webhook ele é mockado, então nada provava o `customer`, o tamanho de página, o teto de 1000 nem a propagação do erro que faz o webhook responder 500. | Teste novo `apps/api/__tests__/billingEntitlementKeys.test.ts`, com a Stripe falsa. |
| 🟡 | `apps/api/__tests__/entityPlanEnv.test.ts`, `apps/app/__tests__/entityPlanRequirementEnv.test.ts` | Os testes com `""` provavam só que a variável carrega e vira "sem gate". `z.string().max(80).optional()` aceita `""`, e `entityPlanRequirement` trata `""` como falso, então tirar o `\|\| undefined` de `env.ts` não reprovava nada. | Caso novo nos dois arquivos: com `""`, `env.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` tem de ser `undefined`. |
| 🟢 | `apps/app/shared/components/ui/PlanGate.tsx:38-48` | O gate decide com o `AccountDTO` em cache (`staleTime` de 60 s em `apps/app/shared/providers/QueryProvider.tsx:6`). `useCheckoutConfirmation` para de invalidar a conta assim que a assinatura fica viva (`AccountBillingPanel.tsx:248-251`). Se o evento de recursos chegar depois do de assinatura, a tela pode mostrar "Fora do seu plano" por até um minuto, enquanto a API já deixaria criar. A API continua sendo a autoridade, e o `PAYMENTS.md` já avisa que o gate por recurso nega por alguns segundos depois do checkout. | Sem mudança de código. Vai para "Verificar no `/test`". |
| ✅ | `apps/api/app/(guards)/plan.ts:25-31` | Compõe `requireCommonPanelApi`, que recusa a escrita personificada em `common-panel.ts:65-71` antes de chamar o handler. O plano só é olhado dentro do handler. | - |
| ✅ | `apps/api/(shared)/repositories/user.repository.ts:49-63` | `findByReferenceId` devolve o documento cru, então `ctx.subjectProfile.entitlements` e `.subscription` chegam ao `refusePlanAccess` sem passar por whitelist. | - |
| ✅ | `apps/api/(shared)/mappers/user.mapper.ts:30-46` | `serializeFirestoreValue` é recursivo: o `Timestamp` de `entitlements.lastEventAt` sai como ISO no `GET /account`, pelo mesmo caminho do `subscription.lastEventAt`. | - |
| ✅ | `firestore.rules`, `apps/api/(shared)/validation/` | Regras negam todo acesso de cliente, e nenhum schema usa `passthrough`/`looseObject`: o titular não consegue gravar `entitlements` pelo `PUT /account` nem direto no Firestore. | - |
| ✅ | `apps/api/app/(routes)/webhooks/payments/route.ts:156-187` | O resumo não traz metadata, e o perfil é achado só pelo `customer`. Isso fecha porque `ensureStripeCustomer` (`billing.ts:92-112`) grava o vínculo antes de criar a sessão de checkout. | - |
| ✅ | `apps/api/(shared)/lib/billing.ts:24-30` | `isBillingEnabled` exige `isSubscriptionMode()`, então no modo `simple` `planAccess.enforced` é `false` e nada bloqueia, como pede o corte da spec. | - |
| ✅ | `docs/PRE-PRODUCTION.md`, `docs/PAYMENTS.md` | A referência `billing-state.ts:207-214` aponta para o caso de assinatura com id diferente em `decideSubscriptionWrite`; `LIVE_SUBSCRIPTION_STATUSES` tem os cinco status citados; a afirmação de que recurso novo só vale no próximo ciclo tem fonte com data em `analyze/plan.md:27`. | - |
| ✅ | Desvio 1 do handoff | `<Link className={buttonVariants()}>` segue `NotFoundPage.tsx`; o `Button` do design system não tem `asChild`. | - |

Nenhum achado bloqueante.

A skill `/code-review` foi acionada e revisou outro checkout (o diff de `specs/BACKLOG.md` da worktree
principal), então o resultado dela não vale para esta feature. A busca por bug desta revisão é a leitura
registrada na tabela acima.

### Corte da spec

O que foi implementado corresponde aos cinco itens do corte de MVP de `specs/plan-entitlements.md`: checagem
reutilizável com os dois códigos, lista de recursos no perfil a partir do webhook e exposta na conta,
`PlanGate` com convite traduzido e link para a cobrança, demonstração em `entity` desligada por padrão, e
nada bloqueado com a cobrança desligada ou no modo `simple`. Não achei divergência.

## Decisão sobre o teste de personificação

A extensão do `/develop` não afrouxava a regra em relação ao que existia: antes, o teste aceitava qualquer
arquivo que contivesse a string `assertReadOnlyWhileImpersonating`, inclusive num comentário. Mas deixava
uma brecha nova: a delegação era contada por arquivo, não por guard exportado.

O que mudou em `apps/api/__tests__/impersonationReadOnly.test.ts`:

- Os guards base (`admin.ts`, `common-panel.ts`) continuam obrigados a conter a chamada ao helper.
- Um guard que não é base passa se chamar o helper ou se importar um guard base (`./admin` ou
  `./common-panel`) e tiver pelo menos uma delegação `return require(CommonPanel|Admin)Api(` para cada
  `export function require*Api` do arquivo.
- O teste de simetria ganhou um caso: `requirePlanApi({ feature }, handler)` responde a `POST`, `PUT`,
  `PATCH` e `DELETE` personificados com o mesmo status e o mesmo corpo do `requireCommonPanelApi`, sem
  rodar o handler. O módulo `@/(shared)/lib/billing` é mockado com a cobrança ligada, para o plano estar em
  jogo e mesmo assim não ser consultado.

O comentário do bloco descreve a regra (inclusive o caso de dois guards com uma delegação) e não cita o
fluxo.

## Correções aplicadas

- `apps/api/__tests__/impersonationReadOnly.test.ts`: checagem de delegação por guard exportado, exigência
  de import do guard base, caso de simetria com `requirePlanApi`.
- `apps/api/__tests__/billingEntitlementKeys.test.ts` (novo): `listActiveEntitlementKeys` lista pelo
  `customer` com `limit: 100`, pagina com `autoPagingToArray({ limit: 1000 })`, devolve os `lookup_key`,
  devolve `[]` sem recursos e deixa passar o erro da Stripe.
- `apps/api/__tests__/entityPlanEnv.test.ts` e `apps/app/__tests__/entityPlanRequirementEnv.test.ts`: caso
  que exige `undefined` em `env.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` quando a variável vem `""`.

Nenhum arquivo de produção foi alterado. Os testes acima não foram executados aqui: passaram pelo
`typecheck` e pelo `pnpm check`.

## Raio de impacto

- `AccountDTO` ganha `planAccess` obrigatório e `entitlements` opcional. Quem monta o tipo é só
  `apps/api/app/(routes)/account/route.ts` (`toAccountResponse`, no `GET` e no `PUT`). Consumidores no app:
  `useMyAccount`, `PlanGate` e os componentes de `account/(components)/` (`AccountBillingPanel`,
  `AccountEmailChangeDialog`, `AccountTabs`, `AccountPreferencesForm`, `AccountProfileForm`,
  `AccountPrivacyPanel`), que só leem. `pnpm --filter app typecheck` passa.
- `AccountDataExportDTO.account` passa a omitir `planAccess`; o produtor é `account-export.ts`.
- `UserDTO.entitlements` aparece também no `UserWithAuthDTO` que as rotas de admin devolvem. Nenhuma tela de
  admin lê o campo.
- `POST /entities` troca `requireCommonPanelApi` por `requirePlanApi`. Sem `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE`,
  o requisito é `null` e a rota se comporta como antes.
- `planAccessDenial` é a primeira função de runtime em `packages/sdk/src/types`. Não tem dependência e é
  importada por `apps/api` e `apps/app`.

## Verificar no `/test`

1. **Suíte da API e do app com os testes desta etapa.** Repro: `pnpm turbo run test --filter=api --filter=app`.
   Em especial `impersonationReadOnly.test.ts` (o caso novo de simetria importa `plan.ts`, que importa
   `plan-access` e `billing-state`), `billingEntitlementKeys.test.ts` e os dois testes de env.
2. **`storageUpload.emulator.test.ts`** recebeu o mock de `@/(shared)/lib/billing` e não foi executado.
   Repro: `pnpm --filter api test:emulator` (JDK 21).
3. **403 real na criação com a UI mostrando o convite.** Com cobrança ligada (chaves fictícias com o prefixo
   certo), `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE=advanced-reports` nos dois apps e um titular sem assinatura:
   `POST /entities` direto com o token responde 403 `PLAN_SUBSCRIPTION_REQUIRED`; `/entities/create` mostra o
   convite e "Ver planos" leva a `/<locale>/account?tab=billing`. Com assinatura `active` gravada e sem o
   recurso, 403 `PLAN_FEATURE_REQUIRED` e o convite "Fora do seu plano".
4. **Webhook assinado grava a lista.** Evento `entitlements.active_entitlement_summary.updated` assinado com
   `generateTestHeaderString`, `stripeCustomerId` gravado no emulador: `user.entitlements.features` em ordem
   e sem repetição, e `GET /account` devolvendo `entitlements.lastEventAt` em ISO e `planAccess.features`
   com o recurso.
5. **Convite renderizado** em light, dark e mobile, nos 3 idiomas. Os testes de componente conferem texto e
   `href` só em pt-br; o `Card` dentro do `Container contentOnly` não foi olhado por ninguém.
6. **Toast de `PLAN_FEATURE_REQUIRED` com a tela desatualizada.** Abrir `/entities/create` com o recurso,
   remover `entitlements.features` no emulador e salvar: o toast traduzido aparece. Nenhum teste cobre
   `handleClientError` com esse código.
7. **Cache da conta depois do checkout** (achado 🟢). Gravar a assinatura `active` primeiro, abrir
   `/entities/create` (convite "Fora do seu plano"), depois entregar o evento de recursos e voltar à tela em
   menos de 60 s. Registrar quanto tempo o convite fica enquanto o `POST /entities` direto já responde 201.
8. **Admin personificando titular sem plano vê o convite** (fluxo 7 do plano). Coberto só na API
   (`planGuard.test.ts`, "judges an impersonated read by the subject's plan").
9. **Modo degradado no build.** `pnpm --filter app build` com `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE=""`
   explícito no ambiente. O build do `/develop` rodou sem a variável definida, não com ela vazia.

## Lacunas de teste

| Lacuna (do handoff) | Veredito |
|---------------------|----------|
| `listActiveEntitlementKeys` sem teste unitário | Fechada aqui, com a Stripe mockada (`billingEntitlementKeys.test.ts`). A paginação contra a Stripe real continua 🔒. |
| Testes de env não isolam o `\|\| undefined` | Fechada aqui nos dois apps. O build com a variável vazia continua aberto (item 9 acima). |
| Critérios 🔒 da seção 11 do plano | Continuam abertos. Só fecham com conta Stripe real. |

Lacuna nova: nenhum teste cobre o toast de `PLAN_FEATURE_REQUIRED` vindo de `handleClientError` (item 6).
Fica para o `/test` decidir se cobre com teste de componente ou só com a passada no browser.

## Decisões em aberto

Nenhuma nova. P3 do plano (`unpaid` e `paused` passam pelo gate por status) continua sendo escolha do
usuário.

## Gates

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint | `pnpm check` | 822 arquivos, sem erro (821 no handoff, mais o teste novo). |
| Typecheck | `pnpm turbo run typecheck --filter=api --filter=app` | 2 de 2 tarefas com sucesso, sem cache, depois das correções. |
| Paridade de i18n | não rodado de novo | Nenhuma correção tocou `packages/internationalization`. Vale o número do handoff: 6 arquivos, 59 testes. |

## Plano de commits

A ordem canônica é `packages/sdk` → `apps/api` → `apps/app` → `packages/internationalization`. Aqui o
commit de i18n sobe antes do app: `PlanGate.tsx` lê `dictionary.apps.app.shared.planGate`, e o
`typecheck` do app reprovaria no commit do app sem as chaves. A API não depende do dicionário (nenhum teste
cruza código de erro com `apiErrors`), então ela fica verde logo depois do SDK. A ordem foi deduzida
lendo o código; o verde commit a commit não foi medido.

1. `feat(sdk): add plan access contract and entitlements to the account`
   - `packages/sdk/src/types/payments/plan-access.ts`
   - `packages/sdk/src/types/payments/index.ts`
   - `packages/sdk/src/types/user/user.ts`
   - `packages/sdk/src/types/account/account.ts`
2. `feat(api): persist plan entitlements from the Stripe webhook`
   - `apps/api/(shared)/lib/billing-state.ts`
   - `apps/api/(shared)/lib/billing.ts`
   - `apps/api/(shared)/repositories/user.repository.ts`
   - `apps/api/app/(routes)/webhooks/payments/route.ts`
   - `apps/api/__tests__/billingState.test.ts`
   - `apps/api/__tests__/userRepositoryBilling.test.ts`
   - `apps/api/__tests__/paymentsWebhookRoute.test.ts`
   - `apps/api/__tests__/billingEntitlementKeys.test.ts`
3. `feat(api): add requirePlanApi guard over the common panel guard`
   - `apps/api/(shared)/lib/plan-access.ts`
   - `apps/api/app/(guards)/plan.ts`
   - `apps/api/__tests__/planAccess.test.ts`
   - `apps/api/__tests__/planGuard.test.ts`
   - `apps/api/__tests__/impersonationReadOnly.test.ts`
4. `feat(api): return planAccess and entitlements from the account routes`
   - `apps/api/(shared)/lib/account-avatar.ts`
   - `apps/api/(shared)/lib/account-export.ts`
   - `apps/api/app/(routes)/account/route.ts`
   - `apps/api/__tests__/accountRoute.test.ts`
   - `apps/api/__tests__/accountExportRoute.test.ts`
   - `apps/api/__tests__/storageUpload.emulator.test.ts`
5. `feat(api): gate entity creation behind an optional plan feature`
   - `apps/api/(shared)/lib/entity-plan.ts`
   - `apps/api/app/(routes)/entities/route.ts`
   - `apps/api/env.ts`
   - `apps/api/.env.example`
   - `apps/api/__tests__/entitiesRoutePlanGate.test.ts`
   - `apps/api/__tests__/entityPlanEnv.test.ts`
   - `apps/api/__tests__/entitiesRouteList.test.ts`
   - `apps/api/__tests__/entitiesRouteImpersonation.test.ts`
   - `apps/api/__tests__/entityPhotoReference.test.ts`
6. `feat(internationalization): add plan gate copy and plan error codes`
   - `packages/internationalization/translations/packages/shared/utils.ts`
   - `packages/internationalization/translations/apps/app/shared/index.ts`
7. `feat(app): add PlanGate component with a subscribe invite`
   - `apps/app/shared/components/ui/PlanGate.tsx`
   - `apps/app/shared/hooks/useMyAccount.ts`
   - `apps/app/__tests__/planGate.test.tsx`
   - `apps/app/__tests__/planGateAccountRefresh.test.tsx`
   - `apps/app/__tests__/apiErrorCopy.test.ts`
8. `feat(app): gate entity creation on the optional plan feature`
   - `apps/app/env.ts`
   - `apps/app/.env.example`
   - `apps/app/shared/lib/entityPlanRequirement.ts`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/page.tsx`
   - `apps/app/__tests__/entityPlanRequirement.test.ts`
   - `apps/app/__tests__/entityPlanRequirementEnv.test.ts`
   - `apps/app/__tests__/entityCreatePlanGate.test.tsx`
9. `docs: document plan access in the payments and pre-production guides`
   - `docs/PAYMENTS.md`
   - `docs/PRE-PRODUCTION.md`
10. `docs(claude): add the plan gate recipe to the payments-flow skill`
    - `.claude/skills/payments-flow/SKILL.md`
11. `docs(specs): mark plan-entitlements in progress`
    - `specs/plan-entitlements.md`
12. `docs(features): plan-entitlements`
    - `docs/features/plan-entitlements/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
      `review/review.md`, `test/criterios-aceite.md`, `test/report.md`; `test/e2e/` fica de fora pelo
      `.gitignore`)

Varredura de segredo em `docs/features/plan-entitlements/`, refeita na rodada 2 com o `test/`: nenhuma
chave `sk_`/`whsec_` real, senha ou e-mail de pessoa. Os e-mails citados são `qa-plan-entitlements@example.com`
(`analyze/plan.md:299`) e as contas do seed `admin@example.com`, `user@example.com` e `user2@example.com`
(`test/report.md:158`), todos do domínio reservado para exemplo. O relatório só menciona a senha pública do
seed, documentada em `docs/SETUP.md`, sem escrevê-la.

Título de PR sugerido: `feat: plan entitlements mirrored in the API`.

### Commits realizados

(preenchido pelo `/review` depois dos commits)

## Rodada 2: defeito D1 do `/test` e cache depois da assinatura

O `/test` (`test/report.md`) achou um defeito de produção que esta revisão deixou passar: o `PlanGate`
decidia pelo `isLoading` de `useMyAccount`. A query vem de `useAuthorizedQuery`, que fica com
`enabled: false` até o SDK receber o token, e no servidor o React Query não busca. Nos dois casos
`isLoading` é `false` e `data` é `undefined`, então o componente renderizava os filhos. O QA mediu o
formulário no HTML do servidor e na tela por 0,4 a 1,3 s antes do convite. O teste da primeira rodada só
simulava o carregamento com `isLoading: true`, estado que a query desabilitada nunca produz, e eu aceitei
esse teste como prova.

### O que mudou

| Arquivo | Mudança |
|---------|---------|
| `apps/app/shared/components/ui/PlanGate.tsx` | "Sem dados e sem erro" agora mostra o `loadingFallback` (`if (!(account \|\| isError))`), no lugar do `if (isLoading)`. O componente lê a conta com `useMyAccount({ refetchOnMount: "always" })`. Dois comentários curtos explicam o caso da query desabilitada e por que a conta é relida a cada montagem. |
| `apps/app/shared/hooks/useMyAccount.ts` | Aceita `{ refetchOnMount }` opcional e repassa ao `useAuthorizedQuery`. Os outros quatro chamadores (`ProfileDropdown`, `CommonHomeClient`, `OnboardingClient`, `AccountClient`) chamam sem argumento, e `undefined` mantém o padrão do React Query. |
| `apps/app/__tests__/planGate.test.tsx` | Caso `{ data: undefined, isLoading: false, isError: false }` exigindo o fallback e nenhum link; caso que exige a chamada com `{ refetchOnMount: "always" }`. O mock passou a repassar os argumentos. |
| `apps/app/__tests__/planGateAccountRefresh.test.tsx` (novo) | `PlanGate` com o `useMyAccount` real, `QueryClient` com `staleTime` de 60 s como o do app e `apiClient` mockado. Conta em cache sem o recurso: o convite aparece, a montagem relê a conta uma vez e o conteúdo entra. Com `sdkAuthorized` falso: fallback, nenhum conteúdo, nenhuma chamada. |

P12 continua valendo: com `isError`, o conteúdo aparece e a API decide. O caso "leaves the decision to
the API when the account fails to load" continua verde.

Efeito colateral aceito: se o token nunca chegar, o gate fica no fallback em vez de mostrar o conteúdo.
Dentro da área autenticada isso não acontece no fluxo normal, e mostrar o conteúdo nesse caso seria
justamente o defeito.

### Mutação

| Variante | Resultado |
|----------|-----------|
| Código corrigido | `planGate.test.tsx` + `planGateAccountRefresh.test.tsx`: 12 de 12. Com `entityCreatePlanGate.test.tsx`: 15 de 15. |
| Condição de volta a `if (isLoading)` | 2 reprovam: "shows the fallback while the query waits for the token or renders on the server" e "keeps the content out while the query waits for the token". |
| Sem `refetchOnMount: "always"` | 2 reprovam: "asks for a fresh account on every mount" e "rereads a cached account on mount, so features granted after it was cached unlock the content". |

O arquivo foi restaurado depois de cada variante, e a última execução do código corrigido deu 12 de 12.

### Decisão sobre o item 7 (cache da conta depois da assinatura)

O QA mediu pior do que o achado 🟢 da primeira rodada previa: com o evento de recursos entregue, o
`POST /entities` dava 201 em 10 s e o convite ficou mais de 80 s na tela, inclusive depois de navegar
para a lista e voltar, porque a conta ainda estava dentro do `staleTime` e o app usa
`refetchOnWindowFocus: false`.

Escada de decisão:

- A spec não fala do tempo de atualização da tela.
- No repo, `useCheckoutConfirmation` já invalida a conta, mas para assim que a assinatura fica viva, e o
  evento de recursos chega depois. Ele não sabe qual recurso esperar, então não dá para estender o
  polling até "chegaram os recursos" sem acoplar a tela de cobrança ao gate.
- Menor raio: o `PlanGate` relê a conta a cada montagem (`refetchOnMount: "always"` só no observador
  dele). Custa um `GET /account` por montagem do gate quando já há cache; na carga fria a busca é a mesma
  de antes. Os outros consumidores da conta não mudam.

Adotada a terceira. O que continua: com a tela do gate aberta e parada, o convite só some na próxima
montagem (navegar e voltar) ou ao recarregar. Polling dentro do `PlanGate` foi descartado: seria uma
requisição a cada intervalo em toda tela com gate, para cobrir uma janela que só existe nos segundos
depois de assinar. Fica 🟢, com a API sempre como autoridade.

### Gates da rodada 2

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint | `pnpm check` | 823 arquivos, sem erro. |
| Typecheck | `pnpm --filter app typecheck` | sem erro. |
| Testes tocados | `pnpm exec vitest run __tests__/planGate.test.tsx __tests__/planGateAccountRefresh.test.tsx __tests__/entityCreatePlanGate.test.tsx` (em `apps/app`) | 3 arquivos, 15 testes. |

A suíte inteira do app não foi rodada aqui.

### O `/test` precisa remedir no browser

1. **D1 na carga fria.** Mesmo repro do relatório (demo ligada, `user@example.com` sem assinatura,
   recarregar `/pt-br/entities/create`): o HTML do servidor não pode conter `id="birthdate"`, e o
   `MutationObserver` não pode ver o formulário antes do convite. O esperado é skeleton e depois convite.
2. **Titular com o recurso na carga fria.** Skeleton, depois formulário, sem o convite piscar no meio.
3. **Item 7 depois da correção.** Assinatura `active` gravada, abrir `/entities/create` (convite), entregar
   o evento de recursos, ir para a lista e voltar em menos de 60 s: o formulário aparece depois de um
   `GET /account`. Medir esse tempo. Com a tela parada, o convite fica até a próxima montagem (aceito).
4. **Conta que não carrega** (P12): com `GET /account` falhando, o formulário aparece e o `POST` recebe 403
   com o toast traduzido.
5. Suíte do app inteira (`pnpm turbo run test --filter=app`), por causa da mudança em `useMyAccount`.
