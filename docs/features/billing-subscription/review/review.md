# Revisão: assinatura Stripe de ponta a ponta

Rodada autônoma do `/cycle`. Li o diff inteiro (código, testes e docs), apliquei o
`docs/review-checklist.md` e rodei só os gates estáticos. Não subi app, não usei browser e não rodei a
suíte inteira. Rodei apenas os dois arquivos de teste cobrindo o código que alterei.

## Branch

| Campo | Valor |
|---|---|
| Atual | `run-full-task-cycle`, sem upstream, sem commit à frente de `origin/main` |
| Regex na atual | **inválida** (não segue `<project>/<type>/<title>`) |
| Proposta | `feat/billing-subscription` |
| Regex na proposta | **OK** |
| Por que sem `project` | o diff cruza `apps/api`, `apps/app`, `apps/web` e três pacotes; vários apps omitem o prefixo |
| Base | `d52c4f0` (HEAD atual, contido em `origin/main`) |
| Ação | **nenhuma agora.** O workspace é do Conductor e a instrução do ambiente é não renomear nem trocar de branch sem pedido do usuário. A branch deve ser criada na hora do commit, com aprovação: `git switch -c feat/billing-subscription` a partir do HEAD atual. |

## Revisão: billing-subscription

### 🔴 Bloqueante

Nada bloqueante.

### 🟡 Atenção

- `apps/app/.../account/(components)/AccountBillingPanel.tsx:246-265`: na volta com `?checkout=success`,
  enquanto o webhook não grava a assinatura, a aba mostrava a lista de planos com "Assinar" **habilitado**.
  A recusa `PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE` da API (`payments/checkout/route.ts:41`) só enxerga o que
  já está no perfil, então um segundo clique nessa janela abria uma segunda assinatura e cobrava duas vezes.
  **Corrigido:** `awaitingConfirmation` (success sem assinatura viva) entra em `actionsDisabled`, e a mesma
  flag alimenta `useCheckoutConfirmation`. Linha nova em `docs/PAYMENTS.md` (seção "Checkout, portal e
  erros"). O teste do painel continua 22/22; o caso novo não tem teste (ver lacunas).
- Proteção contra assinatura duplicada só existe no snapshot do perfil. Se duas assinaturas vivas
  chegarem a existir (por exemplo, checkout aberto em duas abas antes de qualquer webhook),
  `decideSubscriptionWrite` aplica a mais recente por cima da outra (`billing-state.ts:141-147`) e o
  expurgo cancela só a gravada (`account-erasure.ts:95`). A outra continua cobrando sem vínculo no perfil.
  **Não corrigido**, vai para decisões em aberto.

### 🟢 Sugestão / nit

- `apps/api/instrumentation.ts:4-18`: o JSDoc novo de `warnOnHalfConfiguredPayments` foi inserido entre o
  JSDoc de `register` e a função, deixando o texto sobre Firestore e `CORS_ORIGIN` pendurado em cima da
  função errada. **Corrigido:** a função nova subiu e o JSDoc original voltou para cima de `register`.
  `instrumentation.test.ts` 13/13.
- `apps/web/env.ts:20-21`: o comentário narrava o estado anterior ("the landing always fell back…").
  **Corrigido** para a razão atual, no mesmo tom do comentário do bloco.
- `apps/api/app/(routes)/webhooks/payments/route.ts:176`: a resposta de sucesso devolve o evento inteiro
  (`{ result: event, ok: true }`). Já era assim antes do diff; a Stripe ignora o corpo. Deixado como está.
- `/payments/checkout` e `/payments/portal` ficaram fora de `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:44-55`),
  e `docs/SECURITY.md:148` avisa que rota nova nasce sem limite. O plano decidiu "Arcjet: sem ajuste".
  Mantido; vai para decisões em aberto com recomendação.
- `billing-state.ts:160` compara `event.created` com `<`. Dois `updated` da mesma assinatura no mesmo
  segundo, entregues fora de ordem, ficam com o que chegou por último. É o limite da granularidade de
  segundo do `event.created`; o caso de empate que o código trata é só o do `created`.
- `useListPlans.tsx:6`: a função se chama `fetchPlans`, e a convenção é `fetchXList`. Não renomeei.

### ✅ OK

- **Modo degradado nunca responde 500.** `plans` devolve 200 `{ enabled: false, plans: [] }` sem chamar a
  Stripe (`plans/route.ts:15-17`); checkout e portal devolvem 503 `PAYMENTS_NOT_CONFIGURED`
  (`checkout/route.ts:22-27`, `portal/route.ts:16-21`); webhook sem chave devolve 503 com o mesmo código
  (`webhooks/payments/route.ts:136-141`). Falha da Stripe vira 503 `PAYMENTS_PROVIDER_UNAVAILABLE`, sem
  mensagem interna na resposta.
- `packages/payments/keys.ts`: `|| undefined` trata `STRIPE_*=""` como ausência e a validação deixou de
  ser pulada. `ai.ts` não constrói mais o toolkit em escopo de módulo.
- **Guards.** As três rotas novas usam `requireCommonPanelApi`. Sob personificação, o guard devolve 403
  `AUTH_REQUEST_IMPERSONATION_READ_ONLY` para POST antes de chegar ao handler (`common-panel.ts:65-71`),
  então checkout e portal ficam bloqueados. Nenhum id vem do corpo: o perfil é `ctx.subjectProfile`.
- **Idempotência e ordem do webhook.** O evento é marcado depois do handler (`route.ts:161-167`); falha
  responde 500 sem marcar; `markProcessed` usa `create()` e trata `ALREADY_EXISTS` como sucesso.
  `applySubscriptionState` lê e escreve dentro de `runTransaction` (`user.repository.ts:77-101`), e a regra
  de ordem é função pura testada em `billingState.test.ts`.
- **Expurgo com billing primeiro.** Falha no cancelamento, ou assinatura viva com a Stripe desligada, para
  tudo antes de apagar qualquer dado, e a rota responde 503 `ACCOUNT_DELETION_BILLING_FAILED`.
- **Testes com contrato trocado, não afrouxado.** `accountErasure.test.ts`: a ordem esperada passou a
  começar por `billing` e o caso `billing-not-linked` virou `no-subscription`; ganhou cinco casos novos,
  incluindo "nada é apagado quando o cancelamento falha" com `calls` igual a `["billing"]`, e o caso "segue
  apagando depois de um passo que falhou" continua lá. `paymentsWebhookRoute.test.ts`: os três casos "sem
  configuração" trocaram 200 `Not configured` por 503 `PAYMENTS_NOT_CONFIGURED` e o segundo ganhou a
  asserção de status que não tinha; `subscription_schedule.canceled` passou a afirmar o log de evento não
  tratado e que nada é aplicado; "evento sem customer" passou a afirmar que nenhum vínculo é gravado.
- `Timestamp` → ISO no `GET /account` e na exportação: `serializeFirestoreValue` é recursivo
  (`user.mapper.ts:30-47`), então `subscription.currentPeriodEnd` e `lastEventAt` saem como string.
- `findById` do `BaseRepository` ignora perfil com `deletedAt`, e `findByStripeCustomerId` filtra em
  memória, então o webhook não reconcilia perfil apagado.
- SDK como fachada: `PaymentsActions` registrada no `Client`, retorna `data.data`, erro sobe cru. O app só
  chama `apiClient.payments.*`.
- i18n: bloco `billing` e os seis códigos novos em `apiErrors` nos três idiomas, estrutura idêntica.
- Nenhum comentário no código cita o fluxo (varredura por `plan.md`, `handoff`, `D1..D22`, "critério",
  `TODO` nos arquivos alterados e novos: zero).
- Segredo: nada real nos artefatos da feature nem nos docs. As chaves que aparecem (`sk_test_offline_qa`,
  `whsec_offline_qa`, `cus_qa`) são falsas e os e-mails do plano usam `example.com`.
- Corte de MVP da spec `billing-subscription`: os seis itens e a obrigação do passo `billing` estão
  cobertos. Os desvios do handoff (dez, todos menores) não tiram nada do corte.

### 👁 Verificar no `/test`

Afirmações do handoff que a leitura não fecha. A primeira é a de maior risco.

1. **Transação `applySubscriptionState` e `findByStripeCustomerId` contra o emulador.** A suíte só tem db
   falso. Repro: emulador + `pnpm seed`, harness assinando eventos com `generateTestHeaderString` e
   `whsec_offline_qa`; conferir `subscription` gravado com `Timestamp`, `GET /account` devolvendo ISO,
   reenvio devolvendo `{"ok":true,"duplicate":true}` com `updatedAt` idêntico, e `updated` com `created`
   anterior sem mudar o documento.
2. **Trava nova do "Assinar" na volta do checkout.** Repro: abrir `/account?tab=billing&checkout=success`
   com catálogo habilitado (chaves falsas) e perfil sem assinatura; os botões de plano ficam desabilitados
   e o aviso "Confirmando o pagamento" aparece. Sem `checkout=success`, habilitados.
3. **Aba degradada sem chaves**: placeholder "Cobrança em breve" em light, dark e mobile, três idiomas, com
   skeleton antes e sem pulo de layout. `GET /payments/plans` autenticado → 200 `{enabled:false}`; checkout e
   portal autenticados → 503 `PAYMENTS_NOT_CONFIGURED`.
4. **Exclusão com assinatura viva e chave falsa** → 503 `ACCOUNT_DELETION_BILLING_FAILED`, a conta ainda
   entra e o perfil fica intacto. Sem assinatura, a exclusão segue como antes.
5. **Personificação**: estado visível, botões desabilitados, POST de checkout com headers de
   personificação → 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY`.
6. **Webhook em `next dev`** (`pnpm --filter api dev:with-stripe`): pela leitura, `getWebhookSecret()` lê
   `keys()` sem `skipValidation`, então o segredo deveria chegar. Ninguém rodou em `next dev`.
7. **Chave malformada**: build da API sai com código 1; em runtime toda requisição responde 500 com
   `Invalid environment variables` (desvio 1 do handoff). Medir nessa forma.
8. **Modo `simple`** no build do app: aba e item da sidebar ausentes, `?tab=billing` abre o perfil.
9. **`/pricing` da web** com `NEXT_PUBLIC_APP_URL` preenchida: os dois primeiros CTAs levam a
   `<app>/<locale>/account?tab=billing`; hero, cta e link do header passam a apontar para o app.
10. **`?checkout=canceled`** e **`past_due`** (badge destrutivo e `pastDueHint`), três idiomas.
11. **Botão com `loading`** perde o nome acessível enquanto redireciona (mesmo comportamento do
    `AccountPrivacyPanel`).

Sem conta Stripe real, ficam 🔒: Checkout e Portal reais, catálogo real, entrega real de webhook e
cancelamento bem-sucedido no expurgo.

## Raio de impacto

- `UserDTO` ganhou `stripeCustomerId?` e `subscription?` (opcionais). `AccountDTO` passou a
  `Omit<UserWithAuthDTO, "subscription">` com `subscription?: SubscriptionStateDTO | null`. Typecheck dos
  três apps passa sem mudar consumidor existente.
- `Client.payments` é action nova; consumidores: `useListPlans`, `usePaymentsMutations`.
- `@repo/payments`: `paymentsAgentToolkit` virou `getPaymentsAgentToolkit()`. Nenhum importador no repo;
  `docs/PAYMENTS.md` e a skill `payments-flow` já citam o nome novo.
- `keys()` passou a validar sempre. Afeta todo app que estende `payments()`: com `STRIPE_*` vazias sobe
  normalmente; com prefixo errado o build falha.
- Webhook: resposta sem configuração passou de 200 para 503. Endpoint já registrado na Stripe de um fork
  sem chaves na API vai acumular reentregas por até três dias, que é a intenção.
- Rotas novas fora do rate limit (ver 🟢).

## Lacunas de teste

| Lacuna | Veredito |
|---|---|
| `applySubscriptionState` e `findByStripeCustomerId` só contra db falso | continua aberta; item 1 do `/test` |
| `BillingPlanCard` sem teste isolado | continua aberta, risco baixo (exercitado pelo `accountBillingPanel.test.tsx`) |
| `pricing/page.tsx` sem teste de renderização | fechada na rodada 2 para o `href` dos CTAs (`pricingPage.test.tsx`); layout segue com o `/test` |
| Efeito de `NEXT_PUBLIC_APP_URL` em hero, cta e header sem teste | continua aberta; item 9 do `/test` |
| Trava do "Assinar" com `checkout=success` sem assinatura (nova, criada nesta revisão) | aberta; um caso em `accountBillingPanel.test.tsx` fecha |

Achados do plano A1 (modo `simple` não restringe o painel comum), A2 (soft delete do admin não cancela a
assinatura), A3 (`STRIPE_*` nos `.env.example` de `apps/app` e `apps/web`) e A4 (assinatura inválida no
webhook responde 500): fora de escopo, continuam abertos.

## Decisões em aberto

1. **Checagem de assinatura duplicada na Stripe.** Recomendo, em entrega seguinte, que o checkout liste as
   assinaturas vivas do `stripeCustomerId` na Stripe antes de criar a sessão e responda
   `PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE` se houver alguma. Custa uma chamada a mais por checkout e fecha o
   caso das duas abas. Não fiz aqui porque muda o contrato da rota testada e exige casos novos.
2. **Rate limit em `/payments/checkout` e `/payments/portal`.** Recomendo manter fora: exigem sessão, o
   cliente Stripe é criado com chave de idempotência e a própria Stripe limita a conta. Reavaliar se
   aparecer abuso medido.
3. **Branch.** Criar `feat/billing-subscription` a partir do HEAD atual na hora do primeiro commit, com
   aprovação do usuário.

### Respostas do usuário (2026-09-24)

- **Item 1:** a sobrescrita fica como está no MVP. A checagem na Stripe está escrita como passo opcional
  antes do release no item 12 de `docs/PRE-PRODUCTION.md` ("Risco aceito: assinatura duplicada"), com uma
  linha apontando para lá em `docs/PAYMENTS.md`.
- **P2 do plano** (recusar a exclusão enquanto houver assinatura viva e a Stripe estiver desligada):
  mantida.
- **Item 3:** branch `feat/billing-subscription` aprovada, com commit e push.
- Fora desta feature: as dependências de desenvolvimento de `e2e-testing` foram aprovadas, e a descoberta
  (`/spec` sem argumento) segue em avaliação. Os dois registros estão em `specs/BACKLOG.md`.

## Gates (medidos nesta revisão, sem `--force`)

| Gate | Resultado |
|---|---|
| `pnpm check` | 698 arquivos, nenhuma correção |
| `pnpm turbo run typecheck` | 13/13 tasks (10 em cache) |
| `pnpm --filter @repo/internationalization test` | 44/44 em 5 arquivos (paridade ok) |
| `apps/app` `accountBillingPanel.test.tsx` (arquivo alterado) | 22/22 |
| `apps/api` `instrumentation.test.ts` (arquivo alterado) | 13/13 |

Suíte completa: não rodada aqui (é do `/test`). O handoff mediu `pnpm turbo run lint typecheck test` com
24/24 tasks antes das correções desta revisão.

## Rodada 2: defeitos do `/test`

O `/test` (`test/report.md`) trouxe dois defeitos e um ponto de a11y. Tratei cada sugestão como hipótese:
implementei, medi e decidi.

### D1. CTA do `/pricing` com o locale da visita anterior: corrigido

`getDictionary()` de `packages/internationalization/server.ts` lê o cookie `x-locale`, e
`apps/web/proxy.ts:104-108` grava esse cookie na mesma resposta. Na troca de idioma pela URL, a página
ainda enxerga o idioma anterior.

- **Correção:** `apps/web/app/[locale]/pricing/page.tsx` recebe `params` e monta o `href` dos dois CTAs de
  plano com `resolveLocale(routeLocale)`. O resto da página (copy, metadata, link `/contact` do plano
  Enterprise) continua no cookie, porque é anterior à feature e o mesmo mecanismo atinge as ~20 páginas
  da web que chamam `getDictionary()` sem argumento. Isso foi para o backlog.
- **Teste:** `apps/web/__tests__/pricingPage.test.tsx` renderiza a página com `renderToStaticMarkup`, com o
  cookie simulado em `pt-br` e a rota em `en`, e espera os dois `href` em `/en/`; um segundo caso cobre
  segmento desconhecido caindo no locale padrão. **Prova de que pega o defeito:** com a página
  voltando a usar o locale do cookie, os 2 casos falham; com a correção, 2/2 passam. A helper
  `pricingCta` já recebia o locale, então um teste unitário dela não pegaria a troca.
- Para renderizar JSX na suíte da web, que não tem o plugin do React, o `apps/web/vitest.config.mts`
  ganhou `esbuild: { jsx: "automatic" }` (sem dependência nova). O `apps/web/CLAUDE.md` descreve essa
  exceção estreita à regra "suíte de lógica pura". Suíte da web: 41/41 em 8 arquivos.
- **Hero, CTA e header:** não têm o defeito por causa desta entrega. Com `NEXT_PUBLIC_APP_URL`
  preenchida, o `href` do hero e do CTA da home é a URL do app sem locale. O link "Ir para o painel" do
  header (`header/index.tsx:35-37`) usa o locale do `getDictionary()` do cliente, como todos os outros
  links do header; o mecanismo é anterior e vale para o header inteiro. Registrado no backlog, sem
  correção aqui.

### D2. `text-destructive` com 1,97:1 no dark: registrado, token não alterado

Recalculei o contraste convertendo oklch → sRGB linear e aplicando a fórmula do WCAG, com o fundo
`--background` do dark (`oklch(0.145 0 0)`):

| `--destructive` do dark | texto sobre o fundo | branco sobre o token sólido | branco sobre `/60` (badge, botão) | branco sobre `/90` (hover) |
|---|---|---|---|---|
| atual `oklch(0.396 0.141 25.723)` | **1,97:1** | 10,06:1 | 14,43:1 | 11,07:1 |
| `oklch(0.6 0.22 25)` | 4,49:1 | 4,41:1 | 8,90:1 | 5,21:1 |
| `oklch(0.62 0.22 25)` | 4,88:1 | 4,06:1 | 8,38:1 | 4,82:1 |
| `oklch(0.637 0.237 25.331)` (o `--destructive-foreground` do dark) | 5,18:1 | 3,82:1 | 8,09:1 | 4,56:1 |

O 1,97:1 confere com os 2,0:1 do QA. O token também é fundo sólido com texto branco: o
`ConfigProvider` do antd usa `colorError: var(--color-destructive)` (`antd-app.tsx:20`), e o item
`danger` do dropdown (a ação "excluir" do `ActionMenu`, `action-menu.tsx:96`) pinta fundo `colorError` e
texto branco no hover. Nenhum valor passa nas duas condições: com o texto em 4,5:1 (L ≈ 0,60), o branco
sobre o token cai para 4,41:1. Clarear o token troca um defeito de contraste por outro, num componente
que não é desta entrega. Não existe workaround no repo para texto: `label.tsx:21` só repete
`dark:text-destructive`.

**Decisão:** token intocado e achado no `specs/BACKLOG.md` com `arquivo:linha` e o caminho provável
(mapear o `--destructive-foreground` do dark, 5,18:1, no `@theme` e usá-lo como cor de texto de erro).
O `pastDueHint` segue com 1,97:1 no dark, igual a toda mensagem de erro de formulário do repositório.

### Item 11. Botão em `loading` sem nome acessível: registrado

A causa está no design system: `Button` troca o conteúdo pelo `Spinner` quando `loading`
(`button.tsx:72-73`), e o `Spinner` traz `aria-label="Loading"` literal em inglês (`spinner.tsx:8-9`).
O painel de billing só passa `loading`. Corrigir no uso exigiria o mesmo `aria-label` em cada botão com
`loading` (billing, `AccountPrivacyPanel`, formulários), que é replicar workaround. Foi para o backlog
junto com o literal em inglês.

### Gates da rodada 2 (sem `--force`)

| Gate | Resultado |
|---|---|
| `pnpm check` | 699 arquivos, nenhuma correção |
| `pnpm turbo run typecheck` | 13/13 (11 em cache) |
| `apps/web` `pnpm --filter web test` (config alterada) | 41/41 em 8 arquivos |
| `pricingPage.test.tsx` com a correção revertida | 2/2 falham (confirma que o teste pega o D1) |
| Paridade de i18n | não remedida: nenhuma tradução mudou desde a rodada 1 (44/44) |

## Plano de commits

Antes de começar: o índice já tem o rename `specs/onboarding-flow.md → docs/features/onboarding-flow/spec.md`,
que é da auditoria e só entra no commit 16. Tire do índice primeiro, sem perder o working tree:

```bash
git restore --staged specs/onboarding-flow.md docs/features/onboarding-flow/spec.md
git diff --cached --stat   # tem de sair vazio
```

Commits intermediários de `apps/app` (9, 10) não compilam sozinhos, porque as chaves de i18n só entram no
12. É consequência da ordem de dependência adotada no repo (i18n por último).

| # | Mensagem | Arquivos |
|---|---|---|
| 1 | `feat(payments): treat empty Stripe keys as absent and expose webhook config` | `packages/payments/keys.ts`, `packages/payments/index.ts`, `packages/payments/__tests__/keys.test.ts`, `packages/payments/__tests__/paymentsConfig.test.ts` |
| 2 | `fix(payments): build the agent toolkit on demand` | `packages/payments/ai.ts`, `packages/payments/__tests__/aiToolkit.test.ts` |
| 3 | `feat(sdk): add payments contract and subscription fields` | `packages/sdk/src/types/payments/index.ts`, `packages/sdk/src/types/payments/payments.ts`, `packages/sdk/src/types/index.ts`, `packages/sdk/src/types/user/user.ts`, `packages/sdk/src/types/account/account.ts`, `packages/sdk/src/actions/payments/action.ts`, `packages/sdk/src/client/index.ts` |
| 4 | `feat(api): add subscription reconciliation rules and billing persistence` | `apps/api/(shared)/lib/billing-state.ts`, `apps/api/(shared)/repositories/user.repository.ts`, `apps/api/(shared)/repositories/payment-event.repository.ts`, `apps/api/__tests__/billingState.test.ts`, `apps/api/__tests__/userRepositoryBilling.test.ts`, `apps/api/__tests__/paymentEventRepository.test.ts` |
| 5 | `feat(api): add plans, checkout and portal routes` | `apps/api/(shared)/lib/billing.ts`, `apps/api/(shared)/validation/payments.schema.ts`, `apps/api/app/(routes)/payments/plans/route.ts`, `apps/api/app/(routes)/payments/checkout/route.ts`, `apps/api/app/(routes)/payments/portal/route.ts`, `apps/api/__tests__/paymentsPlansRoute.test.ts`, `apps/api/__tests__/paymentsCheckoutRoute.test.ts`, `apps/api/__tests__/paymentsPortalRoute.test.ts` |
| 6 | `feat(api): reconcile subscriptions in the payments webhook` | `apps/api/app/(routes)/webhooks/payments/route.ts`, `apps/api/__tests__/paymentsWebhookRoute.test.ts` |
| 7 | `feat(api): cancel the subscription before erasing an account` | `apps/api/(shared)/lib/account-erasure.ts`, `apps/api/(shared)/lib/account-export.ts`, `apps/api/app/(routes)/account/deletion/route.ts`, `apps/api/__tests__/accountErasure.test.ts`, `apps/api/__tests__/accountDeletionRoute.test.ts`, `apps/api/__tests__/accountExportRoute.test.ts` |
| 8 | `feat(api): warn at boot when only one Stripe key is set` | `apps/api/instrumentation.ts`, `apps/api/__tests__/instrumentation.test.ts`, `apps/api/.env.example` |
| 9 | `feat(app): add billing data hooks and price formatting` | `apps/app/shared/lib/queryKeys.ts`, `apps/app/shared/lib/formatPlanPrice.ts`, `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useListPlans.tsx`, `.../account/(hooks)/usePaymentsMutations.tsx`, `.../account/(hooks)/useCheckoutConfirmation.tsx`, `apps/app/__tests__/formatPlanPrice.test.ts`, `apps/app/__tests__/usePaymentsMutations.test.tsx`, `apps/app/__tests__/useCheckoutConfirmation.test.tsx` |
| 10 | `feat(app): replace the billing placeholder with the subscription panel` | `.../account/(components)/AccountBillingPanel.tsx`, `.../account/(components)/BillingPlanCard.tsx`, `.../account/(components)/AccountTabs.tsx`, `apps/app/app/[locale]/(authenticated)/(common)/routes.tsx`, `apps/app/__tests__/accountBillingPanel.test.tsx`, `apps/app/__tests__/accountTabsOverflow.test.tsx`, `apps/app/__tests__/commonNavRoutes.test.tsx` |
| 11 | `feat(web): send pricing plan CTAs to the billing tab in the route locale` | `apps/web/env.ts`, `apps/web/shared/lib/pricingCta.ts`, `apps/web/app/[locale]/pricing/page.tsx`, `apps/web/__tests__/pricingCta.test.ts`, `apps/web/__tests__/pricingPage.test.tsx`, `apps/web/vitest.config.mts`, `apps/web/CLAUDE.md` |
| 12 | `feat(internationalization): add billing copy and payments error messages` | `packages/internationalization/translations/apps/app/pages/common/account.ts`, `packages/internationalization/translations/packages/shared/utils.ts` |
| 13 | `test(app): cover the payments error copy in the three locales` | `apps/app/__tests__/accountApiErrorCopy.test.ts` |
| 14 | `docs: document the Stripe subscription flow` | `docs/PAYMENTS.md`, `docs/SECURITY.md`, `docs/SETUP.md`, `docs/PRE-PRODUCTION.md` (**só** os hunks do item 12 e da linha `billing` do expurgo, ver abaixo) |
| 15 | `docs(claude): update the payments-flow skill for the shipped flow` | `.claude/skills/payments-flow/SKILL.md` |
| 16 | `docs(specs): sync the backlog with the delivered features` (corpo da mensagem: "Also records three findings from the billing-subscription review: dark destructive contrast, Button loading name, web locale cookie.") | `specs/onboarding-flow.md` (removido) + `docs/features/onboarding-flow/spec.md` (rename com as edições do working tree), `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/admin-billing-insights.md`, `specs/billing-subscription.md`, `specs/e2e-testing.md`, `specs/observability-logging.md`, `docs/PRE-PRODUCTION.md` (o hunk restante, da remedição da suíte), `docs/features/account-settings/spec.md`, `docs/features/admin-analytics-dashboard/analyze/plan.md`, `docs/features/api-hardening/spec.md`, `docs/features/audit-log/analyze/plan.md`, `docs/features/audit-log/spec.md`, `docs/features/auth-recovery-verification/analyze/plan.md`, `docs/features/auth-recovery-verification/spec.md`, `docs/features/ci-pipeline/analyze/plan.md`, `docs/features/cookie-consent/analyze/plan.md`, `docs/features/cookie-consent/spec.md`, `docs/features/cursor-pagination/analyze/plan.md`, `docs/features/cursor-pagination/spec.md`, `docs/features/file-upload-storage/analyze/plan.md`, `docs/features/file-upload-storage/spec.md`, `docs/features/firebase-emulator-seed/spec.md`, `docs/features/onboarding-flow/analyze/plan.md`, `docs/features/session-refresh/analyze/plan.md`, `docs/features/session-refresh/review/review.md`, `docs/features/session-refresh/spec.md`, `docs/features/transactional-emails/spec.md`, `docs/features/user-activity-tracking/analyze/plan.md`, `docs/features/user-activity-tracking/spec.md` |
| 17 | `docs(features): billing-subscription` | `docs/features/billing-subscription/STATE.md`, `docs/features/billing-subscription/analyze/plan.md`, `docs/features/billing-subscription/develop/handoff.md`, `docs/features/billing-subscription/review/review.md`, `docs/features/billing-subscription/test/criterios-aceite.md`, `docs/features/billing-subscription/test/report.md` (`test/e2e/` é ignorado pelo git; varridos sem segredo: só contas `example.com` do emulador e chaves falsas) |

`...` abrevia `apps/app/app/[locale]/(authenticated)/(common)/(pages)`.

**Como separar `docs/PRE-PRODUCTION.md`.** O `git diff` do arquivo tem três hunks: o 1º (item 12, Stripe) e
o 3º (linha `billing` da tabela do expurgo) são da feature; o 2º (remedição da suíte em 2026-09-24) é da
auditoria. `git add -p` não serve aqui porque é interativo. Para o commit 14, gere um patch só com os hunks
1 e 3 e aplique no índice:

```bash
git diff docs/PRE-PRODUCTION.md > /tmp/pp.patch
python3 - <<'EOF'
import re
s = open("/tmp/pp.patch").read()
parts = re.split(r'(?m)^(?=@@ )', s)
open("/tmp/pp-billing.patch", "w").write(parts[0] + parts[1] + parts[3])
EOF
git apply --cached /tmp/pp-billing.patch
```

No commit 16, `git add docs/PRE-PRODUCTION.md` leva o hunk que sobrou.

**`specs/BACKLOG.md` misto.** Além da auditoria, o arquivo recebeu na rodada 2 as três linhas de achado
(contraste do `--destructive`, nome do `Button` em `loading`, cookie de locale da web). Separar exigiria
recortar hunks de um diff de 500+ linhas; o commit 16 leva as duas coisas e diz isso no corpo da mensagem.
O D2 não gerou commit `fix(design-system)` porque o token não foi alterado. Conferi com `git apply --cached --check`
que o patch dos hunks 1 e 3 aplica limpo no índice atual.

**Título de PR sugerido:** `feat: stripe subscription billing end to end`.

**Commits realizados** na branch `feat/billing-subscription`, a partir de `d52c4f0`:

| # | hash | mensagem |
|---|------|----------|
| 1 | `9def76d` | `feat(payments): treat empty Stripe keys as absent and expose webhook config` |
| 2 | `4458034` | `fix(payments): build the agent toolkit on demand` |
| 3 | `2f5d0de` | `feat(sdk): add payments contract and subscription fields` |
| 4 | `4e0ead4` | `feat(api): add subscription reconciliation rules and billing persistence` |
| 5 | `8c90516` | `feat(api): add plans, checkout and portal routes` |
| 6 | `b060962` | `feat(api): reconcile subscriptions in the payments webhook` |
| 7 | `94b90c9` | `feat(api): cancel the subscription before erasing an account` |
| 8 | `e0e01da` | `feat(api): warn at boot when only one Stripe key is set` |
| 9 | `9c305f7` | `feat(app): add billing data hooks and price formatting` |
| 10 | `186f3e9` | `feat(app): replace the billing placeholder with the subscription panel` |
| 11 | `3a8de28` | `feat(web): send pricing plan CTAs to the billing tab in the route locale` |
| 12 | `682ce4e` | `feat(internationalization): add billing copy and payments error messages` |
| 13 | `0bf3e4d` | `test(app): cover the payments error copy in the three locales` |
| 14 | `c6517ef` | `docs: document the Stripe subscription flow` |
| 15 | `f1ca335` | `docs(claude): update the payments-flow skill for the shipped flow` |
| 16 | `e8e3a45` | `docs(specs): sync the backlog with the delivered features` |
| 17 | este | `docs(features): billing-subscription` |

Cada commit foi conferido contra a lista de arquivos do plano antes de ser gravado.
