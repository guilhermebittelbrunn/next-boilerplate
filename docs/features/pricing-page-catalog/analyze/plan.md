# Plano: página de preços a partir do catálogo da Stripe

- **Spec:** [`specs/pricing-page-catalog.md`](../../../../specs/pricing-page-catalog.md), corte de MVP inteiro.
- **Decisão do usuário já tomada:** D4, o CTA do visitante leva ao cadastro da **app**.
- **Rodada:** autônoma (`/cycle`), 2026-10-16. Nenhuma pergunta foi feita ao usuário. Cada decisão não
  trivial está em "Perguntas em aberto", com a opção adotada, a descartada e o motivo.
- **Branch:** nenhuma. Quem cria é o `/review`.

## Resumo

A API ganha `GET /payments/catalog`, sem guard, com o mesmo contrato de `GET /payments/plans`
(`{ enabled, plans }`) e um cache de uma hora em memória do processo, com uma única requisição em voo
por vez. Duas visitas seguidas à landing pedem o catálogo à Stripe uma vez só. A rota fica fora da lista
de rate limit de propósito: quem a chama é o servidor da landing, de um único endereço, e um orçamento
por IP estrangularia a própria página. O SDK ganha `apiClient.payments.listCatalog()`.

A `/pricing` da landing passa a montar os cards a partir desse catálogo: nome, descrição, preço formatado
na moeda do preço e no idioma da página, intervalo e recursos de marketing. O card "Enterprise" continua
como cópia fixa que leva ao contato. Sem cobrança ligada, em modo `simple`, com a API fora do ar ou com a
Stripe falhando, a página mostra um estado vazio traduzido e nenhum preço. Preços, nomes e a tabela de
recursos de exemplo saem do dicionário.

Cada plano leva a `<app>/<locale>/sign-up?redirect=<locale>/account?tab=billing&plan=<priceId>`. Para a
escolha sobreviver, o plano corrige a perda de query string na raiz, em `apps/app/proxy.ts` (os três
pontos da auditoria e um quarto achado nesta análise), faz os links entre cadastro e login carregarem o
`redirect`, e a aba de cobrança destaca o card cujo `priceId` veio em `?plan=`. O formatador de preço
sai da `apps/app` para `@repo/shared`, porque agora duas apps o usam.

Zero dependência nova, zero variável de ambiente nova, nenhum código de erro novo.

## Fontes lidas

| Fonte | O que dela entrou no plano |
|-------|----------------------------|
| `specs/pricing-page-catalog.md` | problema, corte, fora do corte, D4, recomendação de cache de 1 h, os três pontos de perda de query |
| `.claude/cycle-policy.md` | corrigir na raiz, modo degradado testado, string vazia é ausência, sem dependência nova |
| `docs/feature-analysis-guide.md` | formato deste plano |
| `docs/PAYMENTS.md`, `docs/PRE-PRODUCTION.md` §12, `docs/SECURITY.md:155` | estado atual da cobrança, contrato "desligada", lista de rate limit documentada |
| `docs/features/billing-subscription/` | precedente do catálogo injetado no browser no `/test` (`test/report.md:177`) e dos critérios 🔒 |
| `docs/features/onboarding-flow/` | a deriva do deep link: o caminho volta, a query não (`spec.md:246`) |
| `docs/features/plan-entitlements/` | formato do plano e do `STATE.md` |
| Slice `entity` e `payments/plans` | padrão de rota, teste de rota com `vi.mock`, SDK |

**Referências não lidas:** nenhuma. As fontes de mercado da spec (Makerkit, Supastarter, `nextjs/saas-starter`)
já foram lidas na escrita dela e não mudam o "como".

**Medido nesta análise** (Node 22, WHATWG `URL`, o mesmo usado pelo harness de `apps/app/__tests__/proxy.test.ts:51-55`):
atribuir `"/pt-br/account?tab=billing&plan=price_1"` a `url.pathname` produz
`/pt-br/account%3Ftab=billing&plan=price_1`; copiar `pathname` e `search` de
`new URL(target, "http://placeholder.invalid")` produz `/pt-br/account?tab=billing&plan=price_1` e, com um
alvo `//evil.com/x`, o host da resposta continua o da requisição.

---

# Etapa 1: análise

## 1. Contexto

**Em uma frase:** a landing de cada fork passa a mostrar os planos que a Stripe vende, e o botão de cada um
leva a escolha até a aba de cobrança da app, passando pelo cadastro e pelo onboarding.

**Objetivos (o corte de MVP da spec, inteiro):**

1. Visitante sem login vê em `/pricing` os planos ativos do catálogo, nos três idiomas, com o mesmo catálogo.
2. Leitura pública do catálogo pela API, sem login, com cache, expondo só o catálogo.
3. Botão que preserva a escolha: cadastro (ou login), onboarding se ligado, aba de cobrança com o plano em
   destaque a um clique do checkout. Quem já está logado vai direto para a aba.
4. Sem Stripe ou em modo `simple`, nenhum preço inventado e estado vazio traduzido.
5. Preços, nomes e tabela de exemplo saem do dicionário da landing.

**Fora de escopo** (da spec, sem re-litigar): seletor mensal/anual, tabela comparativa por plano, nome e
descrição traduzidos, trial e cupom, plano "fale conosco" gerado do catálogo.

**Também fora:** cache na CDN, rate limit da rota pública (seção 5.3), cache na aba de cobrança da app (ela
continua lendo `GET /payments/plans` sem cache), checkout disparado direto da landing.

**Apps impactados:** `apps/web` (página e CTA), `apps/api` (rota pública e cache), `apps/app` (proxy, links
de auth, destaque na aba), `packages/sdk` (uma ação), `packages/shared` (formatador movido),
`packages/internationalization` (cópia).

**Área do painel:** comum (aba `/account?tab=billing`). Admin: nenhuma mudança.

**Modo de produto:** só `subscription` mostra planos. Em `simple`, a landing não consulta a API e mostra o
estado vazio; a API responde `enabled: false` porque `isBillingEnabled()` exige o modo
(`apps/api/(shared)/lib/billing.ts:24-30`).

**Dependências externas:** Stripe (já integrada). Nenhuma variável nova: o catálogo é o mesmo da
`billing-subscription`.

**Genérico ou específico:** genérico. O único código novo em pacote é o formatador movido para
`@repo/shared` (utilitário transversal, sem domínio) e uma ação no SDK.

## 2. O caminho da escolha do plano (decisão central)

A escolha viaja na URL, como o destino `redirect` que o fluxo de auth já honra. Mapa de cada salto, com o
que acontece hoje e depois do plano:

| # | Salto | Onde | Hoje | Depois |
|---|-------|------|------|--------|
| 1 | Landing → cadastro da app | `apps/web/shared/lib/pricingCta.ts:13-27` | leva a `account?tab=billing`, sem plano e sem passar pelo cadastro | `<app>/<loc>/sign-up?redirect=%2F<loc>%2Faccount%3Ftab%3Dbilling%26plan%3D<priceId>` |
| 2a | Visitante já logado abre o cadastro | `apps/app/proxy.ts:234-251` | `redirectUrl.pathname = target` escapa o `?`: `/pt-br/account%3Ftab=...`, caminho sem rota | path e query copiados separadamente (seção 7.1) |
| 2b | Cadastro concluído | `SignUpFormClient.tsx:65-93`, `postLoginNavigation.ts:112-129`, `packages/auth/redirect.ts:10-33` | preserva a query | sem mudança |
| 2c | Visitante com conta clica "Entrar" no cadastro | `SignUpFormClient.tsx:223-228` | link para `/<loc>/sign-in` sem `redirect`: a escolha some | link carrega o `redirect` (seção 7.2) |
| 2d | Inverso, "Criar conta" no login | `SignInForm.tsx:206-211` | idem | idem |
| 3 | Layout comum desvia para o onboarding | `apps/app/proxy.ts:262-263` grava só o `pathname` em `x-app-path`; `apps/app/lib/server/onboarding.ts:32-41` monta o destino com ele | `?redirect=%2Fpt-br%2Faccount`, sem a query | header com `pathname + search` |
| 4 | Onboarding concluído | `onboarding/page.tsx:36-48`, `OnboardingClient.tsx:65-75`, `shared/lib/onboarding.ts:85-117` | preserva a query que receber, inclusive trocando o idioma (`withDestinationLocale`) | sem mudança |
| 5 | Aba de cobrança | `AccountTabs.tsx:51-53` lê `tab` na montagem; `AccountBillingPanel.tsx:238-239` lê `checkout` | não lê `plan` | lê `plan` e destaca o card (seção 7.3) |
| 6 | Anônimo abre a aba direto | `apps/app/proxy.ts:227-231` | `redirect` recebe só o `pathname`, e a query original fica solta na URL do login | `redirect` com path e query; a URL do login sem parâmetros soltos |
| 7 | Caminho sem locale | `apps/app/proxy.ts:213` | `new URL("/<default><pathname>")` descarta a query | prefixa o locale e mantém a query |

Os pontos 2a, 3 e 6 vêm da auditoria da spec, conferidos nas linhas acima. O ponto 7 foi achado nesta
análise: não está no caminho do CTA (que sempre tem locale), mas é o mesmo defeito no mesmo arquivo, e a
política manda corrigir o componente em vez de cada sintoma.

**Open redirect.** Nenhuma correção afrouxa a validação. O destino continua passando por
`postAuthRedirectTarget` (`packages/auth/redirect.ts:10-33`: começa com `/`, sem `//`, prefixado por
locale) antes de qualquer redirect, e o proxy só altera `pathname` e `search` de um clone da URL da
própria requisição, então o host da resposta não muda nem com um alvo malicioso. Os links de cadastro e
login carregam o `redirect` já sanitizado pela mesma função.

## 3. Dados (Firestore)

N/A. Nenhuma coleção, campo ou consulta. O catálogo mora na Stripe; o cache é memória do processo.

## 4. Contrato `@repo/sdk`

- **Tipo:** reaproveita `PaymentPlansDTO` e `PlanDTO` (`packages/sdk/src/types/payments/payments.ts:54-70`),
  como a spec pede. Sem tipo novo.
- **Ação nova:** `PaymentsActions.listCatalog(): Promise<PaymentPlansDTO>` em
  `packages/sdk/src/actions/payments/action.ts`, `GET /payments/catalog`. Não exige contexto nem
  credencial. `payments` já está registrado no `Client` (`packages/sdk/src/client/index.ts:22,33`).
- **Quem quebra:** ninguém. `listPlans()` continua igual e segue sendo a fonte da aba de cobrança.

## 5. API (`apps/api`)

### 5.1 Rota pública

- `GET /payments/catalog`, arquivo `apps/api/app/(routes)/payments/catalog/route.ts`.
- **Sem guard**, no formato das rotas públicas existentes (`export async function`, como
  `auth/password/reset-request/route.ts:52`). `export const dynamic = "force-dynamic"`, como
  `health/route.ts:1-3`, para a rota nunca ser pré-renderizada no build com uma chamada à Stripe.
- **Contrato de "desligada"** igual ao de `payments/plans/route.ts:12-28`: sem cliente Stripe ou com
  `isBillingEnabled()` falso, 200 `{ data: { enabled: false, plans: [] } }` sem chamar a Stripe.
- **Ligada:** 200 `{ data: { enabled: true, plans } }`, com `plans` vindo do cache.
- **Falha da Stripe:** 503 `PAYMENTS_PROVIDER_UNAVAILABLE` (código existente, já traduzido) e a linha de log
  `[payments] catalog-failed requestId=...`.
- **CORS:** o chamador é o servidor da landing, sem header `Origin`, e `isOriginAllowed(null)` já deixa
  passar (`apps/api/(shared)/lib/cors.ts:43-53`). Nenhuma mudança em `CORS_ORIGIN`.

### 5.2 Cache de uma hora

Arquivo novo `apps/api/(shared)/lib/plan-catalog-cache.ts`, no padrão do cache em memória de
`activity-recorder.ts:12` com a costura de teste `resetActivityDedupeCache` (`:95-99`):

- guarda a **promise** de `listPlans(stripe)` (`billing.ts:52-68`) com `expiresAt = agora + 1 h`;
- leituras dentro da validade devolvem a mesma promise, inclusive enquanto ela está em voo, então N visitas
  simultâneas com o cache vazio viram uma chamada;
- falha não fica guardada: a promise rejeitada sai do cache e a próxima visita tenta de novo;
- `resetPlanCatalogCache()` para os testes.

A validade é por processo. Em serverless, cada instância quente pede o catálogo no máximo uma vez por
hora: o número de chamadas à Stripe passa a depender de quantas instâncias existem, e não do tráfego
(seção Riscos).

### 5.3 Rate limit

`/payments/catalog` **não** entra em `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:45-58`). Motivos:

1. O limitador conta por `ip.src`, 20 requisições por 60 s (`packages/security/index.ts:11-17,45-55`). Quem
   chama a rota é o servidor da landing, então todas as visitas chegam do mesmo endereço e a página inteira
   pararia na 21ª visita do minuto.
2. Com o cache, o volume de requisições não chega à Stripe, que era o risco da spec.
3. Cada decisão do Arcjet consome a cota do fork no Arcjet.

A decisão vira uma frase no docblock de `apps/api/proxy.ts:30-44`, ao lado das outras exclusões
(`/auth/me`, `/webhooks/payments`), e um teste que prova que a rota não passa pelo limitador.

### 5.4 Códigos de erro

Nenhum novo. `PAYMENTS_PROVIDER_UNAVAILABLE` já existe em `apiErrors` nos três idiomas
(`translations/packages/shared/utils.ts:73,207,343`).

### 5.5 Modo degradado

| Situação | `GET /payments/catalog` | Landing |
|----------|------------------------|---------|
| Sem `STRIPE_SECRET_KEY` ou sem `STRIPE_WEBHOOK_SECRET` | 200 `enabled: false`, Stripe não chamada | estado vazio |
| Modo `simple` | 200 `enabled: false` | não chama a API; estado vazio |
| Sem `NEXT_PUBLIC_APP_URL` na API | 200 `enabled: false` | estado vazio |
| Catálogo vazio | 200 `enabled: true, plans: []` | estado vazio |
| Stripe falha | 503 `PAYMENTS_PROVIDER_UNAVAILABLE` | estado vazio + linha `[payments] catalog-unavailable status=503` |
| API fora do ar ou `NEXT_PUBLIC_API_URL` vazia na web | (sem resposta) | estado vazio; com a URL vazia, nem tenta |

Em nenhum caso a página responde 500, e o build das duas apps não depende da Stripe nem da API de pé (a
página é dinâmica porque `getDictionary` lê `headers()`, `packages/internationalization/server.ts:24-28`).

## 6. Front: `apps/web`

### 6.1 Página

- `apps/web/app/[locale]/pricing/page.tsx` continua Server Component. Busca dicionário e catálogo em
  paralelo e usa o locale da rota (`resolveLocale(routeLocale)`) para formatar preço, montar o CTA e o link
  de contato, como o teste atual já exige para o CTA (`apps/web/__tests__/pricingPage.test.tsx:48-56`).
- **Layout:** cabeçalho com `h1` (hoje é `h2`, sem `h1` na página) e a descrição; abaixo, grade de cards
  `gap-4 md:grid-cols-2 xl:grid-cols-3`. Um card por plano do catálogo e, por último, o card fixo de
  contato. Com o catálogo vazio, o lugar dos planos vira um painel de estado vazio no estilo de
  `AccountBillingPlaceholder.tsx` (borda tracejada, ícone `CreditCard`), seguido do card de contato.
- **Card do plano** (`components/plan-card.tsx`, Server Component): `Card` do design system, como o
  `BillingPlanCard` da app; nome, descrição quando houver, preço com `describePlanPrice` (some quando
  `unitAmount` é `null`), lista de recursos com ícone `Check`, botão-link "Escolher plano" com o href do CTA.
- **Card de contato** (`components/contact-plan-card.tsx`): título, descrição, "Sob consulta", botão
  "Fale conosco" para `/<loc>/contact`. Sai a tabela comparativa (`page.tsx:187-294`).
- Direção visual: só tokens do design system (`Card`, `buttonVariants`, `text-muted-foreground`,
  `border-primary`), sem cor nova. Light e dark herdam dos tokens. A skill `brainstorming` não foi
  acionada: a spec já define o conteúdo e o layout reaproveita o card que a app usa.

### 6.2 Dados

- `apps/web/shared/lib/planCatalog.ts`, `loadPlanCatalog(): Promise<PlanDTO[]>`:
  - modo `simple` (`isSubscriptionMode()`, `packages/next-config/product-mode.ts:23-25`) ou
    `env.NEXT_PUBLIC_API_URL` falsa (string vazia conta como ausência) → `[]` sem chamar a API;
  - `apiClient.payments.listCatalog()` (`apps/web/shared/lib/client.ts:3-7`) → `plans` se `enabled`, senão `[]`;
  - erro → `[]` e `logEvent("payments", "catalog-unavailable", { status })`.
- O `apiClient` da web é um singleton, mas no servidor ninguém escreve header nele: o
  `setAuthorizationHeader` só roda num `useEffect` (`apps/web/app/[locale]/clientLayout.tsx:14-22`).
  A chamada sai sem credencial, que é o que a rota pública espera.

### 6.3 CTA

`resolvePlanCtaHref` ganha `priceId` obrigatório. Em modo assinatura com URL da app, devolve
`<app>/<loc>/sign-up?redirect=<encodeURIComponent("/<loc>/account?tab=billing&plan=<priceId>")>`. Os ramos
"sem URL da app" (`/<loc>/sign-up` da própria landing) e "modo `simple`" (`appUrl`) ficam como estão.

## 7. Front: `apps/app`

### 7.1 Proxy

Quatro mudanças em `apps/app/proxy.ts`, todas para preservar a query que o visitante trouxe:

1. `:213`, caminho sem locale: o redirect inclui `request.nextUrl.search`.
2. `:227-231`, anônimo em rota protegida: `url.search = ""` antes de gravar `redirect`, e `redirect` passa a
   ser `pathname + search`. Hoje a query original fica solta na URL do login, ao lado do `redirect`.
3. `:247-249`, quem tem sessão e abre uma rota pública com `?redirect=`: o destino é lido com
   `new URL(target, "http://placeholder.invalid")` e só `pathname` e `search` são copiados para o clone da
   URL da requisição. O host da resposta continua o da requisição.
4. `:262-263`, header `x-app-path` com `pathname + search`. O único consumidor é o portão do onboarding, e
   ele já separa a query ao comparar caminhos (`shared/lib/onboarding.ts:66-73`).

### 7.2 Links entre cadastro e login

- `sign-up/page.tsx` e `sign-in/page.tsx` leem `searchParams.redirect` (mesmo padrão de
  `onboarding/page.tsx:20,36-43`) e passam `redirect` ao formulário cliente. Ler no servidor evita
  `useSearchParams` sem `Suspense` nessas páginas.
- Helper novo `apps/app/shared/lib/authRedirectLink.ts`, `withRedirectQuery(path, rawRedirect)`: sanitiza com
  `postAuthRedirectTarget(raw, "")` e devolve `path` com `?redirect=` quando sobra um destino válido.
- `SignUpFormClient` usa no link "Entrar" (`:223-228`), `SignInForm` no link "Criar conta" (`:206-211`).
  A prop é opcional, então os testes que renderizam os formulários sem ela continuam válidos.

### 7.3 Destaque na aba de cobrança

- `AccountBillingPanel` lê `searchParams.get("plan")` ao lado de `checkout` (`:238-239`) e passa
  `highlightedPriceId` a `PlanList` (`:167-212`), que marca `highlighted` no card cujo `priceId` bate.
- `BillingPlanCard` ganha `highlighted?: boolean`: `border-primary ring-2 ring-primary` no `Card` e um `Badge`
  "Plano escolhido" em `CardAction` (mesmo encaixe do badge de status do `CurrentPlanCard`, `:131-135`).
  O texto do badge é a pista acessível; o anel é só visual.
- `plan` que não está no catálogo, catálogo que falhou ou assinatura viva (a lista de planos nem aparece,
  `:286-308`): nenhum destaque, sem mensagem nova. O checkout já valida o preço na Stripe
  (`findRecurringPrice`, `checkout/route.ts:51-54`).
- Personificação: o destaque aparece e os botões seguem desligados (`actionsDisabled`, `:267-271`).
- Trocar de aba reescreve a query só com `tab` (`AccountTabs.tsx:61`) e o destaque some. Aceito: quem trocou
  de aba já saiu da escolha.

### 7.4 Formatador de preço

`apps/app/shared/lib/formatPlanPrice.ts` vai para `packages/shared/utils/helpers/formatPlanPrice.ts`, sem
mudança de código, e entra no barril `helpers/index.ts`. Os quatro consumidores da app trocam o import:
`AccountBillingPanel.tsx:28-31`, `BillingPlanCard.tsx:15`, `BillingRevenueCard.tsx:10`, `billingInsights.ts:2`.
O teste vai junto para `packages/shared/__tests__/`. O tipo `PlanInterval` local do arquivo continua local:
`@repo/shared` não pode importar `@repo/sdk`, que depende dele.

## 8. i18n

- **Landing** (`translations/apps/web/pages/pricing/index.ts`): saem `items` (preços, `membersQtd`,
  `pricePeriod`) e `featuresTable`. Entram `choosePlan`, `pricePerInterval`, `pricePerIntervals`,
  `interval.{day,week,month,year}.{one,other}`, `emptyTitle`, `emptyDescription` e o bloco fixo
  `enterprise` (`title`, `description`, `price`, `linkButton`). A forma de `pricePerInterval`,
  `pricePerIntervals` e `interval` repete a de `apps.app.pages.common.account.billing` para casar com o tipo
  `PlanPriceCopy`. Correções de passagem: a descrição em `es` diz "Veja los precios" (português) e a do
  "Enterprise" em `en` é um template literal com quebras e indentação.
- **App** (`translations/apps/app/pages/common/account.ts`, bloco `billing`): entra `chosenPlan`.
- **`apiErrors`:** nada novo.
- Paridade: `packages/internationalization/__tests__/parity.test.ts` cobre a forma nos três idiomas.

## 9. Autorização, segurança e personificação

- **Endpoint público** por definição da spec. Expõe só `PlanDTO`, que já é uma whitelist de dados de
  catálogo (`billing-state.ts:63-88`): nada de metadata, cliente, assinante ou chave.
- **Abuso:** sem rate limit (seção 5.3). O pior caso é custo de invocação da função, igual a `/health`; a
  Stripe vê no máximo uma chamada por hora por instância.
- **Open redirect:** seção 2. Testes cobrem os alvos `//host`, `https://host` e `\host` depois da mudança.
- **Header forjado:** `x-app-path` continua `set`, nunca `append` (`proxy.ts:260-263`).
- **`plan` na URL:** só seleciona qual card recebe destaque; não chega à API. O checkout valida o preço.
- **Personificação:** a rota pública não tem sujeito. Na aba, o admin personificando vê o destaque com os
  botões desligados, como hoje.
- **Admin que clica no CTA logado:** o proxy o manda para `/account`, e o layout comum o desvia para
  `/admin` (`(common)/layout.tsx:46-51`). Nada muda.

## 10. Testes

Todos no nível mais barato que prova o comportamento. Nenhum exige emulador ou app de pé: nada aqui toca
Firestore, rules ou índice.

| Arquivo | Nível | Prova |
|---------|-------|-------|
| `apps/api/__tests__/planCatalogCache.test.ts` (novo) | unit, `vi.useFakeTimers`, cliente Stripe falso | duas leituras na validade = 1 chamada; depois de 1 h + 1 ms = 2; leituras simultâneas com cache vazio = 1; falha não fica guardada (rejeita e depois resolve = 2 chamadas, a segunda devolve os planos) |
| `apps/api/__tests__/paymentsCatalogRoute.test.ts` (novo) | rota, `vi.mock("@repo/payments")` e `@/env` | responde 200 sem credencial; `enabled: false` sem chave, com só uma chave, em `simple` e sem URL da app, sem chamar a Stripe; ordenado e sem produto arquivado; duas requisições = 1 `prices.list`; falha = 503 `PAYMENTS_PROVIDER_UNAVAILABLE` + linha `[payments] catalog-failed`; cada plano só com as chaves de `PlanDTO` |
| `apps/api/__tests__/proxyArcjetKey.test.ts` (+1) | proxy com Arcjet mockado | `GET /payments/catalog` com chave real e limitador negando passa direto, sem chamar o Arcjet |
| `apps/app/__tests__/proxy.test.ts` (+5) | proxy | caminho sem locale mantém a query; anônimo com query vai ao login com `redirect` completo e sem parâmetro solto; logado no cadastro com `redirect` que tem query vai a `/pt-br/account?tab=billing&plan=price_1` exato, mesma origem; alvos `//evil`, `https://evil` e `/\evil` ainda caem em `/pt-br`; `x-app-path` carrega a query |
| `apps/app/__tests__/onboardingRedirect.test.ts` (+1) | unit com `headers()` mockado | header com query vira `/pt-br/onboarding?redirect=%2Fpt-br%2Faccount%3Ftab%3Dbilling%26plan%3Dprice_1` |
| `apps/app/__tests__/onboardingState.test.ts` (+1) | unit | `buildOnboardingPath` e `withDestinationLocale` mantêm a query |
| `apps/app/__tests__/authRedirectLink.test.ts` (novo) | unit | carrega `redirect` válido; omite quando ausente; descarta alvo inseguro |
| `apps/app/__tests__/signUpFormApi.test.tsx` (+1) e `signInEnterResubmit.test.tsx` (+1) | componente | o link para o outro formulário carrega o `redirect` |
| `apps/app/__tests__/accountBillingPanel.test.tsx` (+3) | componente | `?plan=price_business` põe o badge só no Business; `plan` desconhecido, nenhum badge; assinatura viva, nem lista nem badge |
| `packages/shared/__tests__/formatPlanPrice.test.ts` (movido) | unit | os mesmos 12 casos de antes, no novo endereço |
| `apps/web/__tests__/pricingCta.test.ts` (reescrito) | unit | href com `redirect` codificado e `plan`; barra final; `simple`; sem URL da app |
| `apps/web/__tests__/planCatalog.test.ts` (novo) | unit, `apiClient` mockado | `simple` e URL vazia não chamam a API; `enabled` devolve os planos; `enabled: false` e erro devolvem `[]`, o erro com a linha de log |
| `apps/web/__tests__/pricingPage.test.tsx` (reescrito) | `renderToStaticMarkup`, exceção estreita do `apps/web/CLAUDE.md` | dois planos em `en` com preço formatado, recursos e um href por plano; catálogo vazio mostra a cópia do estado vazio, o card de contato e nenhum link de cadastro; locale da rota vence o do cookie; o subtree `pricing` do dicionário não tem dígito em nenhum dos três idiomas |

Gates: `pnpm turbo run lint typecheck test` cobre tudo acima. `test:emulator` não muda.

## 11. O que o `/test` percorre

**Preparação:**

- Emulador de Auth e Firestore e a API real, como nas rodadas anteriores. API sem chave Stripe para os
  estados vazios e com `STRIPE_SECRET_KEY=sk_test_offline_qa` + `STRIPE_WEBHOOK_SECRET=whsec_offline_qa`
  para o 503 (precedente em `billing-subscription/test/report.md:141`).
- **Catálogo para a landing:** a landing lê o catálogo no servidor, então injetar resposta no browser não
  alcança. Um stub HTTP temporário em `/tmp/pricing-qa/` responde `GET /payments/catalog` com dois planos
  (`price_qa_pro`, BRL 2900/mês, dois recursos; `price_qa_business`, BRL 9900/mês, descrição `null`), e a
  `apps/web` sobe com `NEXT_PUBLIC_API_URL` apontando para ele. A `apps/app` continua na API real.
- **Catálogo para a aba:** injetado no browser na resposta de `GET /payments/plans`, com os mesmos dois
  `priceId` (precedente em `billing-subscription/test/report.md:177`).
- Conta de QA nova, `qa-pricing@example.com`, e uma segunda já existente para o caminho do login.

**Fluxos:**

1. **Catálogo nos três idiomas:** `/pt-br/pricing`, `/en/pricing`, `/es/pricing` mostram os dois planos com
   nome, preço no idioma da página ("R$ 29,00 / mês", "R$29.00 / month", "R$ 29,00 / mes"), recursos e o card
   de contato. O texto "R$ 40" ou "$40" não aparece. Light, dark e 375 px.
2. **Estado vazio:** API sem chave → a página mostra a cópia vazia nos três idiomas, sem preço e com o card de
   contato. Repetir com a API com chave falsa (503) e com a API desligada: mesma tela, sem 500.
3. **Modo `simple`:** web com `NEXT_PUBLIC_PRODUCT_MODE=simple` → estado vazio, e o log do stub mostra zero
   acessos.
4. **Visitante novo:** clicar "Escolher plano" no Pro → URL do cadastro da app com o `redirect` → criar a conta →
   onboarding com `?redirect=` contendo `plan` → concluir → `/pt-br/account?tab=billing&plan=price_qa_pro`,
   aba de cobrança aberta, badge "Plano escolhido" só no Pro, botão "Assinar" habilitado.
5. **Troca de idioma no fim do onboarding:** escolher English → `/en/account?...plan=price_qa_pro`, badge
   "Selected plan".
6. **Visitante já logado:** com sessão, clicar o CTA → vai direto à aba com o destaque. Conferir que a
   Location não contém `%3F` e que não há 404.
7. **Conta existente pelo cadastro:** no cadastro, clicar "Entrar" → URL do login com o mesmo `redirect` →
   entrar → aba com o destaque.
8. **Deep link anônimo:** abrir `/pt-br/account?tab=billing&plan=price_qa_pro` sem sessão → login com
   `redirect` contendo a query e sem `tab`/`plan` soltos → entrar → aba com o destaque.
9. **Build sem Stripe e sem API:** `env -u STRIPE_SECRET_KEY -u STRIPE_WEBHOOK_SECRET pnpm --filter api build`
   e `pnpm --filter web build` com a API parada saem com código 0.

**Combinações arriscadas:** a grade de cards no mobile (um card por linha, o botão sem quebrar), o anel do
destaque no dark, o badge em `es` ("Plan elegido") no card estreito.

**Não observável sem infra externa (vira 🔒):** seção 12.

## 12. Critérios que fecham só com conta Stripe real (🔒)

| Critério | Por quê |
|----------|---------|
| Catálogo real da Stripe na landing | exige conta com produtos; o `/test` usa stub (mesmo 🔒 da `billing-subscription`) |
| Número real de chamadas à Stripe em produção | o cache é provado com cliente falso; contar chamadas reais pede conta e deploy com várias instâncias |
| Checkout real a partir do card destacado | mesmo 🔒 da `billing-subscription` |

## 13. Pré-requisitos manuais de infra

**Nenhum novo.** O que a landing precisa já está em `docs/PRE-PRODUCTION.md` §12 (produtos e preços
recorrentes na Stripe, as duas chaves na `apps/api`, `NEXT_PUBLIC_APP_URL` na `apps/api` e na `apps/web`,
`NEXT_PUBLIC_PRODUCT_MODE` igual nos três apps) e em `docs/SETUP.md:69` (`NEXT_PUBLIC_API_URL` na
`apps/web`). `CORS_ORIGIN` não muda: a chamada vem do servidor da landing, sem `Origin`.

O `/develop` só acrescenta texto ao §12 (o que a landing mostra sem a configuração e um `curl` de
verificação da rota pública). O `/test` não reprova nada por falta de conta Stripe: esses itens são 🔒.

---

# Etapa 2: blueprint técnico

## 10.1 Contrato (`packages/sdk`)

```ts
// packages/sdk/src/actions/payments/action.ts
async listCatalog(): Promise<PaymentPlansDTO> {
    const { data } = await this.client.request<Response<PaymentPlansDTO>>({
        url: "/payments/catalog",
        method: "GET",
    });

    return data.data;
}
```

Tipos usados, sem mudança (`packages/sdk/src/types/payments/payments.ts:54-70`):

```ts
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
```

## 10.2 API: rota e cache

```ts
// apps/api/(shared)/lib/plan-catalog-cache.ts
import type { Stripe } from "@repo/payments";
import type { PlanDTO } from "@repo/sdk/src/types";
import { listPlans } from "./billing";

const MS_PER_MINUTE = 60_000;
const CATALOG_TTL_MINUTES = 60;
export const CATALOG_TTL_MS = CATALOG_TTL_MINUTES * MS_PER_MINUTE;

type CachedCatalog = { plans: Promise<PlanDTO[]>; expiresAt: number };

let cachedCatalog: CachedCatalog | null = null;

/**
 * The catalog is public, so the provider is asked at most once an hour per process.
 * Concurrent misses share the request in flight; a failure is dropped so the next
 * visit tries again.
 */
export function listPlansCached(stripe: Stripe): Promise<PlanDTO[]> {
    const now = Date.now();
    if (cachedCatalog && cachedCatalog.expiresAt > now) {
        return cachedCatalog.plans;
    }

    const entry: CachedCatalog = {
        plans: listPlans(stripe),
        expiresAt: now + CATALOG_TTL_MS,
    };
    cachedCatalog = entry;
    entry.plans.catch(() => {
        if (cachedCatalog === entry) {
            cachedCatalog = null;
        }
    });

    return entry.plans;
}

/** Test seam: the cache outlives a single request by design. */
export function resetPlanCatalogCache(): void {
    cachedCatalog = null;
}
```

```ts
// apps/api/app/(routes)/payments/catalog/route.ts
import { getStripe } from "@repo/payments";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { isBillingEnabled } from "@/(shared)/lib/billing";
import { listPlansCached } from "@/(shared)/lib/plan-catalog-cache";

export const dynamic = "force-dynamic";

/** Unguarded: the landing renders it for visitors who do not have an account yet. */
export async function GET(req: Request) {
    const stripe = getStripe();

    if (!(stripe && isBillingEnabled())) {
        return Response.json({ data: { enabled: false, plans: [] } });
    }

    try {
        const plans = await listPlansCached(stripe);
        return Response.json({ data: { enabled: true, plans } });
    } catch {
        logEvent("payments", "catalog-failed", { requestId: requestIdFrom(req) });
        return Response.json(
            { error: { code: "PAYMENTS_PROVIDER_UNAVAILABLE" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }
}
```

**Exemplo de resposta** (200, cobrança ligada):

```json
{
  "data": {
    "enabled": true,
    "plans": [
      {
        "priceId": "price_qa_pro",
        "productId": "prod_qa_pro",
        "name": "Pro",
        "description": "Para times pequenos",
        "features": ["5 membros", "Suporte por e-mail"],
        "unitAmount": 2900,
        "currency": "brl",
        "interval": "month",
        "intervalCount": 1
      }
    ]
  }
}
```

| `error.code` | Status | Quando |
|--------------|--------|--------|
| `PAYMENTS_PROVIDER_UNAVAILABLE` | 503 | a Stripe falhou ao listar os preços (existente) |
| `AUTH_FORBIDDEN_ORIGIN` | 403 | chamada de browser com `Origin` fora da lista (existente, do proxy) |

## 10.3 API: proxy (só documentação da decisão)

```diff
  * Identity Toolkit quota on each password attempt. The email change request spends it
  * too, and sends two emails on top.
  *
+ * `/payments/catalog` stays off the list on purpose: the landing's server asks for it on
+ * behalf of every visitor, from one address, so a per-address budget would throttle the
+ * page itself. Its cache already keeps the provider out of the request path.
+ *
  * Matched exactly, so a new endpoint is unlimited until it is listed here.
  */
```

## 10.4 Persistência

N/A.

## 10.5 `apps/app`: proxy

```diff
+/**
+ * The target may carry a query, and assigning it to `pathname` would escape the `?`.
+ * Only the path and query of the parsed target are copied, so the response keeps the
+ * host the request came to.
+ */
+const PLACEHOLDER_ORIGIN = "http://placeholder.invalid";
+
+function pointAt(url: Pick<URL, "pathname" | "search">, target: string): void {
+    const parsed = new URL(target, PLACEHOLDER_ORIGIN);
+    url.pathname = parsed.pathname;
+    url.search = parsed.search;
+}

 // route(), linha 213
-        const newUrl = new URL(`/${defaultLocale}${pathname}`, request.url);
+        const newUrl = new URL(
+            `/${defaultLocale}${pathname}${request.nextUrl.search}`,
+            request.url
+        );

 // linhas 227-231
     if (!(isPublic || sessionUser)) {
         const url = request.nextUrl.clone();
         url.pathname = `/${currentLocale}/sign-in`;
-        url.searchParams.set("redirect", pathname);
+        url.search = "";
+        url.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
         return NextResponse.redirect(url);
     }

 // linhas 247-249
             const redirectUrl = request.nextUrl.clone();
-            redirectUrl.search = "";
-            redirectUrl.pathname = target;
+            pointAt(redirectUrl, target);
             return NextResponse.redirect(redirectUrl);

 // linhas 260-263
-    // Layouts cannot read the URL, so the path and its locale travel as request headers.
+    // Layouts cannot read the URL, so the path, its query and its locale travel as request headers.
     // Set, never appended: a value the browser sent must not reach the server components.
     const requestHeaders = new Headers(request.headers);
-    requestHeaders.set(APP_PATH_HEADER, pathname);
+    requestHeaders.set(APP_PATH_HEADER, `${pathname}${request.nextUrl.search}`);
```

O harness de `proxy.test.ts` usa `URL` comum com `clone()` (`:51-55`), que reproduz o escape do `?` medido
acima; os casos novos rodam nele sem mudança.

## 10.6 `apps/app`: links entre cadastro e login

```ts
// apps/app/shared/lib/authRedirectLink.ts
import { postAuthRedirectTarget } from "@repo/auth/redirect";

export function withRedirectQuery(
    path: string,
    rawRedirect: string | null | undefined
): string {
    const target = postAuthRedirectTarget(rawRedirect ?? null, "");
    return target ? `${path}?redirect=${encodeURIComponent(target)}` : path;
}
```

```diff
 // sign-up/page.tsx (sign-in/page.tsx igual, com SignInForm)
 type SignUpProps = {
     readonly params: Promise<{ locale: string }>;
+    readonly searchParams: Promise<{ redirect?: string | string[] }>;
 };
-export default function SignUp() {
-    return <SignUpFormClient />;
+export default async function SignUp({ searchParams }: SignUpProps) {
+    const { redirect } = await searchParams;
+    return (
+        <SignUpFormClient redirect={typeof redirect === "string" ? redirect : null} />
+    );
 }

 // SignUpFormClient.tsx
-export default function SignUpFormClient() {
+type SignUpFormClientProps = { redirect?: string | null };
+
+export default function SignUpFormClient({ redirect = null }: SignUpFormClientProps) {
 ...
                     <Link
                         className="text-primary hover:underline"
-                        href={`/${locale}/sign-in`}
+                        href={withRedirectQuery(`/${locale}/sign-in`, redirect)}
                     >

 // SignInForm.tsx: mesma prop; o link "Criar conta" usa withRedirectQuery(`/${locale}/sign-up`, redirect)
```

## 10.7 `apps/app`: destaque na aba

```diff
 // AccountBillingPanel.tsx
     const checkoutOutcome = searchParams.get("checkout");
+    const chosenPriceId = searchParams.get("plan");
 ...
                 <PlanList
                     disabled={actionsDisabled}
+                    highlightedPriceId={chosenPriceId}
                     loadFailed={isError}

 // PlanList
 type PlanListProps = {
     plans: PlanDTO[];
+    highlightedPriceId: string | null;
 ...
                         <BillingPlanCard
                             disabled={disabled}
+                            highlighted={plan.priceId === highlightedPriceId}
                             key={plan.priceId}

 // BillingPlanCard.tsx
 type BillingPlanCardProps = {
     plan: PlanDTO;
+    highlighted?: boolean;
 ...
-        <Card className="h-full">
+        <Card className={cn("h-full", highlighted && "border-primary ring-2 ring-primary")}>
             <CardHeader>
                 <CardTitle>{plan.name}</CardTitle>
+                {highlighted ? (
+                    <CardAction>
+                        <Badge>{billingCopy.chosenPlan}</Badge>
+                    </CardAction>
+                ) : null}
```

## 10.8 `packages/shared`: formatador

```
git mv apps/app/shared/lib/formatPlanPrice.ts packages/shared/utils/helpers/formatPlanPrice.ts
git mv apps/app/__tests__/formatPlanPrice.test.ts packages/shared/__tests__/formatPlanPrice.test.ts
```

```diff
 // packages/shared/utils/helpers/index.ts
 export * from "./formattedError";
+export * from "./formatPlanPrice";
 export * from "./handleClientError";

 // os quatro consumidores da app
-import { describePlanPrice, formatPeriodEnd } from "@/shared/lib/formatPlanPrice";
+import { describePlanPrice, formatPeriodEnd } from "@repo/shared/utils/helpers/formatPlanPrice";
```

Para cada commit ficar verde, o `/review` pode separar em dois: primeiro o arquivo novo no pacote (cópia +
teste), depois a troca de imports e a remoção na app (seção 10.13).

## 10.9 `apps/web`

**Árvore:**

```
apps/web/
  app/[locale]/pricing/
    page.tsx                         (reescrito)
    components/
      plan-card.tsx                  (novo, Server Component)
      contact-plan-card.tsx          (novo, Server Component)
  shared/lib/
    planCatalog.ts                   (novo)
    pricingCta.ts                    (priceId e redirect pelo cadastro)
  __tests__/
    planCatalog.test.ts              (novo)
    pricingCta.test.ts               (reescrito)
    pricingPage.test.tsx             (reescrito)
```

```ts
// apps/web/shared/lib/planCatalog.ts
import { isSubscriptionMode } from "@repo/next-config/product-mode";
import type { PlanDTO } from "@repo/sdk/src/types";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { env } from "@/env";
import { apiClient } from "@/shared/lib/client";

const statusOf = (error: unknown): number | null =>
    (error as { response?: { status?: number } } | null)?.response?.status ?? null;

export async function loadPlanCatalog(): Promise<PlanDTO[]> {
    if (!(isSubscriptionMode() && env.NEXT_PUBLIC_API_URL)) {
        return [];
    }

    try {
        const catalog = await apiClient.payments.listCatalog();
        return catalog.enabled ? catalog.plans : [];
    } catch (error) {
        logEvent("payments", "catalog-unavailable", { status: statusOf(error) });
        return [];
    }
}
```

```ts
// apps/web/shared/lib/pricingCta.ts
type PlanCtaInput = {
    appUrl: string | undefined;
    locale: string;
    subscriptionMode: boolean;
    priceId: string;
};

/**
 * The plan is bought from the billing tab of the app, after an account exists: the visitor
 * goes through the app's sign-up, which carries the choice in `redirect` to the tab.
 */
export function resolvePlanCtaHref({ appUrl, locale, subscriptionMode, priceId }: PlanCtaInput): string {
    if (!appUrl) {
        return `/${locale}/sign-up`;
    }

    if (!subscriptionMode) {
        return appUrl;
    }

    const billingPath = `/${locale}/account?tab=billing&plan=${encodeURIComponent(priceId)}`;
    return `${appUrl.replace(TRAILING_SLASHES, "")}/${locale}/sign-up?redirect=${encodeURIComponent(billingPath)}`;
}
```

Exemplo: `resolvePlanCtaHref({ appUrl: "https://app.example.com", locale: "en", subscriptionMode: true,
priceId: "price_pro" })` →
`https://app.example.com/en/sign-up?redirect=%2Fen%2Faccount%3Ftab%3Dbilling%26plan%3Dprice_pro`.

```tsx
// apps/web/app/[locale]/pricing/page.tsx (esqueleto)
const Pricing = async ({ params }: PricingProps) => {
    const { locale: routeLocale } = await params;
    const locale = resolveLocale(routeLocale);
    const [{ dictionary }, plans] = await Promise.all([getDictionary(), loadPlanCatalog()]);
    const pricingCopy = dictionary.apps.web.pages.pricing;

    return (
        <div className="w-full py-20 lg:py-40">
            <div className="container mx-auto flex flex-col items-center gap-12">
                <header className="flex max-w-xl flex-col gap-2 text-center">
                    <h1 className="font-regular text-3xl tracking-tighter md:text-5xl">
                        {dictionary.components.header.product.pricing}
                    </h1>
                    <p className="text-lg text-muted-foreground leading-relaxed tracking-tight">
                        {pricingCopy.description}
                    </p>
                </header>
                <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {plans.length > 0 ? (
                        plans.map((plan) => (
                            <PlanCard
                                ctaHref={resolvePlanCtaHref({
                                    appUrl: env.NEXT_PUBLIC_APP_URL,
                                    locale,
                                    subscriptionMode: isSubscriptionMode(),
                                    priceId: plan.priceId,
                                })}
                                ctaLabel={pricingCopy.choosePlan}
                                key={plan.priceId}
                                locale={locale}
                                plan={plan}
                                priceCopy={pricingCopy}
                            />
                        ))
                    ) : (
                        <PricingEmptyState copy={pricingCopy} />
                    )}
                    <ContactPlanCard copy={pricingCopy.enterprise} href={`/${locale}/contact`} />
                </div>
            </div>
        </div>
    );
};
```

`PricingEmptyState` pode ficar no próprio `page.tsx` (é um bloco de poucas linhas) ou num terceiro arquivo
em `components/`, a critério do `/develop`. `generateMetadata` não muda.

## 10.10 i18n

```ts
// translations/apps/web/pages/pricing/index.ts (pt-br; en e es com a mesma forma)
"pt-br": {
    title: "Preços",
    description: "Veja os preços do nosso boilerplate",
    choosePlan: "Escolher plano",
    pricePerInterval: "{price} / {interval}",
    pricePerIntervals: "{price} a cada {count} {interval}",
    interval: {
        day: { one: "dia", other: "dias" },
        week: { one: "semana", other: "semanas" },
        month: { one: "mês", other: "meses" },
        year: { one: "ano", other: "anos" },
    },
    emptyTitle: "Planos em breve",
    emptyDescription: "Os planos aparecem aqui assim que estiverem disponíveis.",
    enterprise: {
        title: "Enterprise",
        description: "Nosso objetivo é simplificar o comércio de pequenas e médias empresas, tornando-o mais fácil e rápido do que nunca para todos e em todos os lugares.",
        price: "Sob consulta",
        linkButton: "Fale conosco",
    },
},
```

| Chave | pt-br | en | es |
|-------|-------|----|----|
| `description` | Veja os preços do nosso boilerplate | See the prices of our boilerplate | Consulta los precios de nuestro boilerplate |
| `choosePlan` | Escolher plano | Choose plan | Elegir plan |
| `pricePerIntervals` | {price} a cada {count} {interval} | {price} every {count} {interval} | {price} cada {count} {interval} |
| `interval.*` | dia/dias, semana/semanas, mês/meses, ano/anos | day/days, week/weeks, month/months, year/years | día/días, semana/semanas, mes/meses, año/años |
| `emptyTitle` | Planos em breve | Plans coming soon | Planes próximamente |
| `emptyDescription` | Os planos aparecem aqui assim que estiverem disponíveis. | Plans will show up here as soon as they are available. | Los planes aparecerán aquí en cuanto estén disponibles. |
| `enterprise.price` | Sob consulta | Custom pricing | Precio a medida |
| `enterprise.linkButton` | Fale conosco | Contact us | Contáctanos |

`enterprise.title` e `enterprise.description` mantêm o texto atual de cada idioma; em `en` vira string de uma
linha. Saem `items` e `featuresTable` dos três.

No bloco `billing` de `translations/apps/app/pages/common/account.ts`:

| Chave | pt-br | en | es |
|-------|-------|----|----|
| `chosenPlan` | Plano escolhido | Selected plan | Plan elegido |

Use `/i18n-sync` para a paridade.

## 10.11 Documentação

| Arquivo | Mudança |
|---------|---------|
| `docs/PAYMENTS.md:23,30,37,53` | rota `catalog` na tabela de peças, linha da web (página lê o catálogo, CTA pelo cadastro com `plan`), `GET /payments/catalog` na tabela de "desligada", seta da landing no diagrama, parágrafo sobre cache de 1 h por processo, moeda do preço com formatação do idioma da página e nome do produto num idioma só |
| `docs/PRE-PRODUCTION.md` §12 (`:471`, `:564`) | sem a configuração, a landing mostra o estado vazio; `curl https://<api>/payments/catalog` responde 200 sem sessão |
| `docs/SECURITY.md:155` | `/payments/catalog` na lista do que fica de fora do rate limit, com o motivo |
| `docs/FORKING.md:149` | a página de preços deixa de ser texto estático: planos vêm da Stripe; o dicionário guarda só a cópia da página e o card de contato |
| `docs/SUBPROCESSORS.md:35` | novo ponto de chamada à Stripe: `apps/api/(shared)/lib/plan-catalog-cache.ts` (pela rota `payments/catalog`) |
| `apps/api/.env.example:53-56` | `GET /payments/catalog` ao lado de `GET /payments/plans` no comentário de "desligada" |
| `.claude/skills/payments-flow/SKILL.md:8-9,28` | rota `catalog` na lista e a página de preços lendo o catálogo |

## 10.12 Env

Nenhuma variável nova e nenhum valor novo para os forks configurarem.

## 10.13 Ordem de implementação e commits

1. `feat(sdk): public plan catalog action`
2. `feat(api): public plan catalog with a one-hour cache` (cache, rota, `.env.example`, `planCatalogCache.test.ts`, `paymentsCatalogRoute.test.ts`)
3. `test(api): keep the public catalog off the rate limiter` (docblock de `proxy.ts` e o caso novo em `proxyArcjetKey.test.ts`)
4. `refactor(shared): plan price formatting in the shared package` (arquivo, barril, teste)
5. `refactor(app): read plan price formatting from the shared package` (quatro imports, remoção do arquivo e do teste da app)
6. `fix(app): keep the query string through the proxy redirects` (`proxy.ts`, `proxy.test.ts`, `onboardingRedirect.test.ts`, `onboardingState.test.ts`)
7. `fix(app): carry the redirect between sign-up and sign-in` (helper, duas páginas, dois formulários, testes)
8. `feat(app): highlight the plan chosen on the pricing page` (`AccountBillingPanel`, `BillingPlanCard`, teste)
9. `feat(web): pricing page reads the Stripe catalog` (loader, CTA, página, componentes, testes)
10. `feat(internationalization): pricing catalog copy and chosen plan badge`
11. `docs: public plan catalog in payments, pre-production, security, forking and subprocessors`
12. `docs(claude): payments-flow lists the public catalog route`
13. `docs(features): pricing-page-catalog`

Os commits 8 e 9 só passam no `typecheck` junto com o 10 (chaves novas e removidas do dicionário). Se o
`/review` quiser cada commit verde, o 10 sobe para logo depois do 1. Os commits 4 e 5 existem separados
justamente para não cruzar `packages/shared` com `apps/app`.

## 10.14 `contends_on` previsto

```
packages/sdk/src/actions/payments/action.ts
apps/api/(shared)/lib/plan-catalog-cache.ts                         (novo)
apps/api/app/(routes)/payments/catalog/route.ts                     (novo)
apps/api/proxy.ts                                                   (só docblock)
apps/api/.env.example
apps/api/__tests__/planCatalogCache.test.ts                         (novo)
apps/api/__tests__/paymentsCatalogRoute.test.ts                     (novo)
apps/api/__tests__/proxyArcjetKey.test.ts
packages/shared/utils/helpers/formatPlanPrice.ts                    (movido da app)
packages/shared/utils/helpers/index.ts
packages/shared/__tests__/formatPlanPrice.test.ts                   (movido da app)
apps/app/proxy.ts
apps/app/shared/lib/authRedirectLink.ts                             (novo)
apps/app/shared/lib/billingInsights.ts                              (só import)
apps/app/app/[locale]/(unauthenticated)/sign-up/page.tsx
apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx
apps/app/app/[locale]/(unauthenticated)/sign-in/page.tsx
apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx
apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountBillingPanel.tsx
apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/BillingPlanCard.tsx
apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/(components)/BillingRevenueCard.tsx   (só import)
apps/app/__tests__/proxy.test.ts
apps/app/__tests__/onboardingRedirect.test.ts
apps/app/__tests__/onboardingState.test.ts
apps/app/__tests__/authRedirectLink.test.ts                         (novo)
apps/app/__tests__/signUpFormApi.test.tsx
apps/app/__tests__/signInEnterResubmit.test.tsx
apps/app/__tests__/accountBillingPanel.test.tsx
apps/web/app/[locale]/pricing/page.tsx
apps/web/app/[locale]/pricing/components/plan-card.tsx              (novo)
apps/web/app/[locale]/pricing/components/contact-plan-card.tsx      (novo)
apps/web/shared/lib/planCatalog.ts                                  (novo)
apps/web/shared/lib/pricingCta.ts
apps/web/__tests__/planCatalog.test.ts                              (novo)
apps/web/__tests__/pricingCta.test.ts
apps/web/__tests__/pricingPage.test.tsx
packages/internationalization/translations/apps/web/pages/pricing/index.ts
packages/internationalization/translations/apps/app/pages/common/account.ts
docs/PAYMENTS.md
docs/PRE-PRODUCTION.md
docs/SECURITY.md
docs/FORKING.md
docs/SUBPROCESSORS.md
.claude/skills/payments-flow/SKILL.md
```

Em relação ao `contends_on` da spec: `apps/api/app/(routes)/payments/plans/route.ts` e
`apps/api/(shared)/lib/billing.ts` **não** mudam (a rota pública é irmã e o cache mora num arquivo próprio).
Entram fora da lista da spec os formulários de cadastro e login da app, que colidem com
`magic-link-sign-in` (`proposed`) e `social-sign-in-providers` (`deferred`) em `SignInForm.tsx` e
`SignUpFormClient.tsx`. Nenhuma colisão com `linked-sign-in-methods` nem com `in-app-notifications`.

---

# Perguntas em aberto

Nenhuma bloqueia o `/develop`. Cada uma traz a opção adotada.

**P1. Mecanismo do cache de uma hora.**
Opções: memória do processo na API; `Cache-Control: s-maxage=3600` para a CDN; cache do Next na landing
(`unstable_cache` ou `"use cache"`); documento no Firestore.
**Adotada: memória do processo na API**, com a promise em voo compartilhada e falha descartada. A spec põe o
cache na API, o padrão já existe (`activity-recorder.ts:12,95-99`) e se prova com teste unitário.
Descartadas: a CDN depende do host, fragmenta por `Origin` (o proxy manda `Vary: Origin`,
`cors.ts:63-84`) e seguraria o `enabled: false` depois de o fork ligar a cobrança; o cache do Next não
alcança o SDK, que usa axios e não `fetch`, e o `cacheComponents` está desligado; o Firestore troca uma
chamada à Stripe por uma escrita e uma leitura.

**P2. Rota nova ou tirar o guard de `/payments/plans`?**
**Adotada: rota nova `GET /payments/catalog`.** Tirar o guard deixaria a aba de cobrança até uma hora
atrasada (se o cache valesse para as duas) e apagaria o contrato de acesso coberto em
`paymentsPlansRoute.test.ts:230-269`. Descartada pelo raio de impacto.

**P3. A rota pública entra no rate limit?**
**Adotada: não**, seção 5.3. Descartada: entrar na lista, que com `ip.src` do servidor da landing limitaria a
página inteira a 20 renderizações por minuto.

**P4. Formato da resposta pública.**
Opções: `PaymentPlansDTO` como está; um tipo sem `productId`.
**Adotada: `PaymentPlansDTO`**, como a seção de impacto da spec pede ("com o tipo de plano que já existe").
`PlanDTO` já é uma whitelist de catálogo, e o `productId` aparece no próprio Checkout hospedado da Stripe.
Descartada: um segundo tipo para omitir um campo público. Se você ler "expõe só o que a página mostra" de
forma estrita, é um `Omit<PlanDTO, "productId">` na rota e no SDK.

**P5. Como a escolha atravessa cadastro e onboarding.**
**Adotada: `plan` dentro do `redirect`, com a correção na raiz do proxy.** Descartadas: cookie ou
`localStorage` (a spec cita "guardá-la por outro meio"), porque landing e app podem estar em origens
diferentes, viraria estado a limpar e deixaria o defeito do proxy vivo para qualquer outro deep link.

**P6. O CTA de quem já está logado.**
**Adotada: o mesmo href para todos** (cadastro da app, D4); o proxy devolve quem tem sessão direto à aba.
Descartada: a landing detectar a sessão e montar outro link, que exigiria ler a sessão na página pública e
manter dois hrefs.

**P7. Login a partir do cadastro.**
**Adotada: os links entre cadastro e login carregam o `redirect`.** A spec diz "cria a conta (ou entra)", e
sem isso a escolha some em quem já tem conta. Descartada: deixar como está.

**P8. Onde fica o formatador de preço.**
**Adotada: `@repo/shared`.** É lógica pura (com o caso do JPY) usada por duas apps. Descartadas: duplicar
na landing (duas cópias da regra do expoente); `@repo/payments`, que importa `server-only` e não pode ir a
componente cliente da app.

**P9. Cópia de intervalo na landing.**
**Adotada: chaves próprias no dicionário da landing**, como a spec lista no impacto de i18n. Descartada: um
namespace compartilhado, que obrigaria a mexer nas chaves da aba de cobrança e nos testes dela.

**P10. Um estado vazio ou três?**
**Adotada: um só** ("Planos em breve") para desligada, catálogo vazio e falha. A página é pública e não
deve dizer se a cobrança do fork está configurada; o dono já vê a distinção na app. Descartada: três
mensagens.

**P11. Card "Enterprise" no estado vazio.**
**Adotada: continua aparecendo**, com "Sob consulta" e "Fale conosco". É cópia fixa e leva ao contato,
que funciona em qualquer modo. Descartada: esconder.

**P12. `?plan=` com assinatura viva.**
**Adotada: sem destaque e sem aviso**; a aba mostra o plano atual como hoje e troca de plano é no portal.
Descartada: aviso "você já assina", que é cópia e comportamento novos fora do corte.

**P13. O quarto ponto de perda de query (`proxy.ts:213`).**
**Adotada: corrigir junto.** Uma linha, mesmo defeito, mesmo arquivo. Descartada: deixar para o backlog.

**P14. Correções de passagem na página.**
**Adotadas:** título da página como `h1` (hoje não há `h1`), a descrição em `es` ("Veja los precios") e o
template literal com indentação em `en`. Custam três linhas num arquivo que está sendo reescrito.

**P15. Discordância com o corte.** Nenhuma. Uma nota de leitura: o sinal "duas visitas não geram duas
chamadas" vale por instância do servidor (ver Riscos), que é o que um cache sem infra nova consegue dar.

---

# Riscos

- **Cache por instância.** Em serverless, N instâncias quentes fazem até N chamadas por hora. O total
  deixa de crescer com o tráfego, que era o objetivo, mas não é "uma chamada por hora" global.
- **Preço novo leva até uma hora para aparecer na landing.** A aba da app lê sem cache, e o checkout
  confirma o preço na Stripe (`findRecurringPrice`). Um plano arquivado pode aparecer na landing por até
  uma hora; quem clicar chega à aba sem destaque e vê o catálogo atual.
- **Moeda e idioma.** Um fork que vende em BRL e mostra a página em inglês exibe "R$29.00 / month". É o
  comportamento correto e vai escrito em `PAYMENTS.md`.
- **Nome e descrição num idioma só**, como já acontece na aba (fora do corte).
- **Uma chamada à API por visita à `/pricing`.** A página é dinâmica; a latência é a de uma ida e volta à
  API com o catálogo em memória.
- **Endpoint sem rate limit** pode ser martelado, custando invocações de função como `/health`; não alcança
  a Stripe.
- **`postAuthRedirectTarget` decodifica duas vezes** (`packages/auth/redirect.ts:19`, depois do
  `searchParams.get`). Valores de query com `%26`, `%3D` ou `%25` perdem a codificação ao passar por ele. Os
  `priceId` da Stripe (`price_` + alfanuméricos) não são afetados. Fica como achado, abaixo.

# Achados para o backlog (não entram nesta entrega)

1. **Deriva do `onboarding-flow` fechada.** A correção do `x-app-path` (seção 7.1, item 4) é exatamente a
   deriva registrada em `docs/features/onboarding-flow/spec.md:246`; o `/spec --sync` pode marcá-la como
   resolvida depois da entrega.
2. **Decodificação dupla em `postAuthRedirectTarget`** (`packages/auth/redirect.ts:19`), descrita em Riscos.
3. **Sessão expirada perde a query.** `expiredSessionOrigin` (`packages/auth/provider.tsx:79-90`) usa só
   `window.location.pathname` quando não há `redirect`. Fora do caminho do CTA.
4. **`packages/shared` sem `typecheck`** (já citado em `.claude/cycle-policy.md` §5.1). O formatador movido
   continua checado pelo `typecheck` da `apps/app` e da `apps/web`, que o importam.
