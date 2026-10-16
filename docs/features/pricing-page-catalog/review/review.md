# Revisão: pricing-page-catalog

Rodada autônoma do `/cycle`, 2026-10-16. Nenhuma pergunta ao usuário: as decisões estão no fim, cada uma com
a opção adotada e a descartada. Nada foi commitado nem preparado no índice (`git diff --cached --stat`
vazio no fim da revisão).

Escopo lido: o diff inteiro do working tree contra `c8577b7` (`main`), os arquivos novos, o
`develop/handoff.md` e as seções 2, 7, 9, 10.13 e "Riscos" do `analyze/plan.md`. O conteúdo de `specs/` não
foi revisado nem editado; só entra no plano de commits.

## Branch

| | |
|---|---|
| Atual | `guilhermebittelbrunn/spec-discussion`, sem upstream e sem commit à frente de `origin/main` |
| Regex da atual | **reprova** (`BRANCH INVALIDA`): o prefixo `guilhermebittelbrunn/` não é projeto e falta o `type` |
| Proposta | `feat/pricing-page-catalog` |
| Regex da proposta | **passa** (`branch OK: feat/pricing-page-catalog`) |
| Por que sem projeto | o diff toca `apps/api`, `apps/app`, `apps/web` e quatro pacotes; com vários apps o padrão omite o projeto |
| Base | a própria branch atual, que está em `c8577b7` (`main`) |
| Status | proposta, a criar na aprovação. Esta rodada não criou, não renomeou e não trocou de branch |

Na aprovação, como a branch atual não tem remoto nem commit de terceiro, o caminho do
`.claude/rules/git-commits.md` é `git branch -m feat/pricing-page-catalog`. Se o Conductor não deixar
renomear, `git switch -c feat/pricing-page-catalog` antes do primeiro `git add` dá o mesmo resultado.

## Achados

### 🔴 Bloqueante

- `packages/auth/redirect.ts:31-43` (antes `:23-32`): **open redirect para quem tem sessão.** O guard aceitava
  `/pt-br/../\evil.com`, porque a string começa com `/pt-br/` e não contém `//`. O parser de URL lê `\` como
  `/` e resolve o `..`, então o proxy da app montava `http://<app>//evil.com`, e o roteador do Next reescreve
  o `Location` de um redirect do proxy para caminho relativo quando o host é o mesmo
  (`next/dist/server/lib/router-utils/resolve-routes.js:456`, função `getRelativeURL`). O navegador recebia
  `Location: //evil.com` e saía do domínio. Variantes que passavam: `%2e%2e` no lugar de `..`, `..\\`, tab no
  meio (`/../\t/`) e as mesmas com codificação dupla, porque o guard decodifica de novo o que o
  `searchParams.get` já decodificou. Basta um link `https://<app>/pt-br/sign-in?redirect=%2Fpt-br%2F..%2F%5Cevil.com`
  para quem está logado.
  **Não foi o diff que introduziu**: o `redirectUrl.pathname = target` de `HEAD` dava o mesmo `//evil.com`
  (simulei as duas versões com o `URL` do Node e a mesma relativização). Mas a feature passa a mandar gente
  por esse caminho, e o docblock novo de `pointAt` (`apps/app/proxy.ts:156-160`) afirma que "a resposta
  mantém o host da requisição", o que só vale para a URL absoluta, antes da relativização.
  **Corrigido na raiz** (ver "Correções aplicadas").

### 🟡 Atenção

- `apps/app/__tests__/proxy.test.ts:301-309`: o teste "never lets a backslash in the deep link change the host"
  confere que o `Location` absoluto começa com `${ORIGIN}/`. O caso de ataque acima também começa
  (`http://localhost:3000//evil.com`), então o teste passaria com a falha aberta. Ele não prova o que o nome
  diz. Precisa conferir o `Location` depois da relativização (não pode começar com `//`). Lacuna para o
  `/test`, abaixo.
- `analyze/plan.md:917-919` (10.13): o plano diz que subir o commit de i18n para logo depois do SDK deixa
  cada commit verde. Não deixa para a landing: o arquivo `translations/apps/web/pages/pricing/index.ts`
  remove `items` e `featuresTable`, que a página de `HEAD` lê, e acrescenta as chaves que a página nova lê.
  Nenhuma ordem separa os dois sem um commit vermelho no `typecheck` da `web`. Ver decisão D3.

### 🟢 Sugestão / nit

- `apps/app/proxy.ts:280` + `apps/app/shared/lib/onboarding.ts:90`: com a query no `x-app-path`, o portão do
  onboarding passa a query pelo `postAuthRedirectTarget`, que decodifica mais uma vez. Uma query com `%`
  malformado, ou que vire `//` depois de decodificada (`?next=https%3A%2F%2F…`), derruba o deep link e o
  desvio vai para `/<locale>/onboarding` sem `redirect`. O portão continua funcionando e não há laço; só a
  volta ao destino se perde. É o achado 2 do plano (decodificação dupla), que **continua aberto e fora de
  escopo**.
- `apps/web/shared/lib/planCatalog.ts:29`: a landing usa no servidor o singleton `apiClient`, o mesmo em
  que o navegador grava o `Authorization` (`apps/web/app/[locale]/clientLayout.tsx:14-21`). No servidor ele
  nunca recebe header, porque essa gravação roda num `useEffect`, e a chamada do catálogo não leva
  credencial. Sem risco hoje. Se um fork passar a mexer em header desse cliente no servidor, o catálogo
  herda.
- `apps/api/(shared)/lib/plan-catalog-cache.ts:30-34`: uma falha não fica em cache. Com a Stripe fora do ar, cada
  visita refaz a chamada, uma de cada vez por instância (a requisição em voo é compartilhada). O plano aceitou
  isso; registro só para quem for mexer no TTL.
- `docs/PRE-PRODUCTION.md:478-480` e `.claude/skills/payments-flow/SKILL.md:10-12`: linhas de prosa acima de
  110 colunas, fora do padrão dos arquivos. Quebradas.

### ✅ OK

- **Rota pública expõe só o que a página mostra.** `GET /payments/catalog`
  (`apps/api/app/(routes)/payments/catalog/route.ts:13-32`) devolve o mesmo `{ enabled, plans }` de
  `GET /payments/plans`, montado pelo mesmo `toPlanDTO` (`apps/api/(shared)/lib/billing-state.ts:63-88`), que é
  uma whitelist de catálogo: preço, produto, nome, descrição, recursos, valor, moeda e intervalo. Nada de
  `metadata`, `lookup_key`, cliente ou assinante. O teste da rota confere a lista exata de chaves e que
  `metadata: "do-not-leak"` não sai. A rota protegida não guarda nada além disso: o guard dela existe pelo
  painel, não porque o catálogo seja segredo.
- **Modo degradado** (lido no código): sem Stripe ou cobrança desligada → 200 `enabled: false` sem chamar a
  Stripe (`route.ts:16-18`); Stripe falhando → 503 `PAYMENTS_PROVIDER_UNAVAILABLE`, que já existe em `apiErrors`
  nos três idiomas (`translations/packages/shared/utils.ts:73,207,343`); na landing, modo `simple` ou sem
  `NEXT_PUBLIC_API_URL` → nenhuma chamada (`planCatalog.ts:24-26`), e qualquer erro vira lista vazia com uma
  linha de log (`planCatalog.ts:31-36`). Nenhum caminho dá 500.
- **SDK como única porta**, inclusive na `web`: `apiClient.payments.listCatalog()` (`planCatalog.ts:29`), com
  `timeout: 5000` no SDK (`packages/sdk/src/actions/payments/action.ts:33-41`). O erro propaga cru, sem
  `FormattedError` no SDK.
- **Os quatro pontos do proxy da app**, lidos um a um:
  1. sem locale (`apps/app/proxy.ts:226-229`): o destino é `/${defaultLocale}${pathname}${search}`; começa
     sempre com `/<locale>/` e a query vem depois do `?`, então não muda o host;
  2. anônimo em rota protegida (`:243-248`): a query vai inteira dentro do valor de `redirect`, e o
     `url.search = ""` tira a query solta do login;
  3. quem tem sessão numa rota pública (`:251-266`): `pointAt` copia só `pathname` e `search`. Com a correção
     do guard, nenhum alvo aceito resolve para caminho que comece com `//`;
  4. `x-app-path` (`:279-281`): continua `set`, nunca `append`. O portão compara caminhos cortando em `?`/`#`
     (`shared/lib/onboarding.ts:66-73`), e a página de onboarding fica fora do layout `(common)`, que é onde o
     portão roda (`(common)/layout.tsx:53-56`), então não há laço.
  Laço de redirect: cada salto do item 3 tira pelo menos o prefixo `/<locale>/sign-in?redirect=` do alvo, então
  a cadeia encolhe até cair em `/<locale>`.
- **Página da landing continua dinâmica**: `getDictionary()` lê `headers()` e `cookies()`
  (`packages/internationalization/server.ts:23-27`), então o build não chama a API e o catálogo é lido a cada
  visita, como o plano previu.
- **i18n**: chaves novas nos três idiomas com a mesma forma; `items` e `featuresTable` saíram e nada mais as
  lê (`rg` em `apps/` e `packages/`, sem resultado). O `es` corrigiu "Veja" para "Consulta". Nenhuma string
  solta nos componentes novos; `aria-hidden` nos ícones decorativos.
- **Design system**: `Card`/`CardTitle`/`CardAction`, `Badge` e `buttonVariants` do pacote; nenhuma cor nova.
  `CardTitle` é `div` (`packages/design-system/components/ui/card.tsx:30-38`), então o `h2` dentro dele é
  válido e a hierarquia fica `h1` → `h2`.
- **Destaque na aba**: `?plan=` só escolhe qual card recebe selo e anel (`AccountBillingPanel.tsx:243,301`);
  não chega à API e não dispara checkout. Com assinatura viva a lista nem aparece (`:291`).
- **Formatador movido**: o conteúdo de `packages/shared/utils/helpers/formatPlanPrice.ts` é idêntico ao
  `apps/app/shared/lib/formatPlanPrice.ts` de `HEAD` (`diff` vazio); nenhum import antigo sobrou; `@repo/shared`
  já é dependência declarada de `api`, `app` e `web`.
- **Comentários**: nenhum cita plano, handoff, etapa ou ID. Os docblocks novos explicam porquê (prazo do SDK,
  rota sem guard, rota fora do rate limit, cache por processo).
- **Corte de MVP da spec** (`specs/pricing-page-catalog.md:66-78`): os cinco itens estão no código. Divergência
  registrada no plano, e confirmada aqui: o `contends_on` real inclui os formulários de cadastro e login da app
  e não inclui `payments/plans/route.ts` nem `billing.ts`.
- **Âncoras dos docs, medidas**: `apps/api/proxy.ts:49-62` é a lista de rate limit, `:68-80` o `logBlocked`,
  `:74` o `logEvent("security", "blocked", …)`, `:151` o `checkRateLimit`; `apps/app/proxy.ts:230,234` são os
  dois `cookieStore.set("x-locale", …)`; `catalog/route.ts:14` e `plans/route.ts:13` são o `getStripe()`. A
  contagem de 12 caminhos em `SECURITY.md` bate com a lista. As citações de `specs/` ficaram antigas, como o
  handoff avisou (desvio 5); são do `/spec --sync`.
- **Segredos nos artefatos**: `docs/features/pricing-page-catalog/` não tem senha, token, chave real nem
  e-mail de pessoa. Os únicos valores parecidos com chave são `sk_test_offline_qa` e `whsec_offline_qa`
  (`plan.md:336`, `handoff.md:108`), inventados para forçar o 503 e sem validade em conta nenhuma.

### 👁 Verificar no `/test`

Lista completa na seção própria, abaixo.

## Correções aplicadas

| Arquivo | O que mudou |
|---|---|
| `packages/auth/redirect.ts` | O guard resolve o caminho com `new URL(path, "http://placeholder.invalid")` e só aceita se o `pathname` resolvido ainda começar com um locale. A checagem de locale virou a função `isLocalePrefixed`, usada antes e depois da resolução. Continua devolvendo o caminho original, então nenhum destino que passava antes muda de forma. |
| `docs/PRE-PRODUCTION.md:478-480` | Parágrafo requebrado em 110 colunas. Texto igual. |
| `.claude/skills/payments-flow/SKILL.md:10-12` | Idem. |

Before/after do guard, porque muda comportamento (só para entrada maliciosa):

```ts
// antes
const isLocalePrefixed = locales.some(
    (locale) => path === `/${locale}` || path.startsWith(`/${locale}/`)
);
return isLocalePrefixed ? path : fallback;

// depois
if (!isLocalePrefixed(path)) {
    return fallback;
}
// The URL parser reads `\` as `/` and resolves `..`, so `/pt-br/../\evil.com` passes the
// checks above and still parses to `//evil.com`, which leaves the host once made relative.
const resolvedPath = new URL(path, PLACEHOLDER_ORIGIN).pathname;
return isLocalePrefixed(resolvedPath) ? path : fallback;
```

Como medi, sem rodar a suíte: copiei a função corrigida num script Node e passei os 13 casos de
`apps/app/__tests__/postAuthRedirectTarget.test.ts` (todos com o mesmo resultado de antes), mais
`/pt-br/../\evil.com`, `/pt-br/%2e%2e/\evil.com`, a forma com codificação dupla, `/pt-br/..\\evil.com`,
`/pt-br/../\t/evil.com`, `/pt-br/\evil.example.com` e `/pt-br/account?tab=billing&plan=price_1`. Para cada
um, montei o `Location` como o `pointAt` monta e apliquei a relativização do Next: nenhum começou com `//`, e
os destinos legítimos saíram intactos. O script foi apagado.

Por que na raiz e não no `pointAt`: `postAuthRedirectTarget` é o guard declarado (`apps/app/CLAUDE.md:71`
manda não duplicar) e tem seis consumidores: o proxy, o portão do onboarding, os links entre cadastro e
login, a navegação pós-login da app e dois pontos do `AuthProvider`. No navegador o `..` resolve para o mesmo
host e não sai do domínio; só o redirect do proxy, que o Next relativiza, saía.

## Raio de impacto

| Mudança | Consumidores |
|---|---|
| `PaymentsActions.listCatalog()` (SDK, aditivo) | só `apps/web/shared/lib/planCatalog.ts`. `listPlans()` não mudou |
| `GET /payments/catalog` (rota nova, sem guard) | a landing, pelo SDK |
| `postAuthRedirectTarget` (correção minha) | `apps/app/proxy.ts:260`, `apps/app/shared/lib/onboarding.ts:90`, `apps/app/shared/lib/authRedirectLink.ts:8`, `apps/app/shared/lib/postLoginNavigation.ts:125`, `packages/auth/provider.tsx:87,145`. Só muda para alvo cujo `..` sai do locale |
| `@repo/shared` exporta `formatPlanPrice`, `describePlanPrice`, `formatPeriodEnd`, `toBcp47Locale`, `PlanPriceCopy` | `app` (4 arquivos) e `web` (`plan-card.tsx`). O barril de `helpers` ganhou um módulo só com `Intl`, sem dependência de servidor |
| `SignInForm` e `SignUpFormClient` com prop `redirect` opcional | só as duas páginas; quem renderiza sem a prop não muda |
| `BillingPlanCard` com prop `highlighted` opcional | só `AccountBillingPanel` |
| Dicionário `apps.web.pages.pricing` (`items` e `featuresTable` removidos) | só a página `/pricing`, reescrita |
| `x-app-path` com query | só `apps/app/lib/server/onboarding.ts:39` |

## Verificar no `/test`

Começa por estes, em ordem de risco. Cada item traz o veredito do que a leitura confirmou.

1. **Open redirect fechado** (achado 🔴 desta revisão). A leitura e a simulação confirmam a correção; falta a
   resposta real do `next dev`/`next start`, que é quem relativiza. Repro com a app de pé e uma sessão:
   `curl -s -o /dev/null -D - -b "access-token=<cookie>" 'http://localhost:3000/pt-br/sign-in?redirect=%2Fpt-br%2F..%2F%5Cevil.example.com' | grep -i '^location'`
   → esperado `location: /pt-br`. Repetir com `redirect=%2Fpt-br%2F%252e%252e%2F%255cevil.example.com`
   (codificação dupla) e `redirect=%2Fpt-br%2F..%2F%09%2Fevil.example.com` (tab). Prova negativa, opcional:
   o mesmo `curl` contra um worktree descartável em `HEAD` deve devolver `location: //evil.example.com` (a
   simulação diz isso; ninguém mediu num servidor de pé).
2. **Visitante logado clicando o CTA** (handoff). A leitura confirma que `pointAt` grava `pathname` e
   `search` separados, sem `%3F`. O teste usa `URL`, não `NextURL`. Repro:
   `curl -s -o /dev/null -D - -b "access-token=<cookie>" 'http://localhost:3000/pt-br/sign-up?redirect=%2Fpt-br%2Faccount%3Ftab%3Dbilling%26plan%3Dprice_1' | grep -i '^location'`
   → `location: /pt-br/account?tab=billing&plan=price_1`, e a página abre sem 404.
3. **Fluxo do visitante novo** (handoff, fluxos 4 e 5 do plano). Cada salto confirmado por leitura:
   `pricingCta.ts:30-31` → `sign-up/page.tsx:21-28` → `postLoginNavigation.ts:120-126` → `proxy.ts:280` →
   `(common)/layout.tsx:53-56` → `onboarding/page.tsx:40-47`. O caminho inteiro no browser não foi
   percorrido. Repro: landing em `/pt-br/pricing` com o stub do catálogo (seção 11 do plano), "Escolher plano",
   cadastro com `qa-pricing-catalog@example.com`, onboarding até o fim trocando para `en` no último passo,
   aterrissar em `/en/account?tab=billing&plan=<priceId>` com o selo "Selected plan" só naquele card.
   Atenção: o selo depende de `GET /payments/plans` devolver planos, e o stub da landing não cobre a API. Sem
   chave Stripe de teste a aba mostra "Cobrança em breve" e o critério do selo fica 🔒.
4. **"Entrar" a partir do cadastro e deep link anônimo** (handoff, fluxos 7 e 8). Confirmado por leitura
   (`SignUpFormClient.tsx:232`, `SignInForm.tsx:213-216`, `proxy.ts:243-248`). Repro no browser: abrir
   anônimo `/pt-br/account?tab=billing&plan=price_1`, conferir a URL do login, clicar "Criar conta" e depois
   "Entrar", e ver o `redirect` intacto nos dois.
5. **503 da Stripe** (handoff). Confirmado por leitura (`route.ts:23-30`, `planCatalog.ts:31-36`). Repro: API
   com `STRIPE_SECRET_KEY=sk_test_offline_qa` e `STRIPE_WEBHOOK_SECRET=whsec_offline_qa`;
   `curl -i http://localhost:3002/payments/catalog` → `503` e `{"error":{"code":"PAYMENTS_PROVIDER_UNAVAILABLE"}}`;
   `/en/pricing` → estado vazio e, no log da web, `[payments] catalog-unavailable status=503 reason=ERR_BAD_RESPONSE`.
6. **Modo `simple`** (handoff). Confirmado por leitura: `planCatalog.ts:24` volta antes de chamar o SDK.
   Repro: web com `NEXT_PUBLIC_PRODUCT_MODE=simple` e o stub contando acessos → estado vazio e zero acessos.
7. **Catálogo com planos na landing** (handoff). A formatação está coberta pelo teste do formatador; o layout
   não. Repro com o stub: "R$ 29,00 / mês" em `pt-br`, "R$29.00 / month" em `en`, "29,00 BRL / mes" em `es`; um
   card por linha no mobile, dois no `md`, três no `xl`, com o card "Enterprise" fechando a linha; light e
   dark.
8. **Selo e anel do destaque** (handoff): `ring-2 ring-primary` visível no dark; "Plan elegido" cabendo no card
   estreito em `es`.
9. **Build sem Stripe e sem API** (handoff, fluxo 9). Por leitura, a `/pricing` é dinâmica (lê `headers()`),
   então o build da web não chama a API. Repro: `pnpm --filter web build` sem a API de pé; e
   `pnpm --filter api build` sem as chaves Stripe (exige as `FIREBASE_ADMIN_*`).
10. **Duas visitas, uma chamada à Stripe** (sinal de pronto da spec). Confirmado por leitura e pelo
    `planCatalogCache.test.ts`. Medir só dá com chave Stripe de teste (contar as chamadas no painel da Stripe
    depois de duas visitas); sem ela, 🔒.

## Lacunas de teste

Veredito para cada lacuna que o handoff listou, mais as novas.

| Lacuna | Veredito |
|---|---|
| Nenhum teste renderiza `sign-in/page.tsx` e `sign-up/page.tsx` (Server Components que leem `searchParams.redirect`) | **continua aberta**. Risco baixo: as páginas só repassam a string (`sign-in/page.tsx:21-26`) |
| Proxy da app testado com `URL`, não com `NextURL` | **continua aberta**, e é pior do que o handoff descreveu: o teste também não modela a relativização do `Location` pelo Next, que é onde a falha 🔴 aparecia. Cobertura real fica com o `curl` dos itens 1 e 2 acima |
| Layout da landing sem teste automatizado | **continua aberta**, é da passada de browser (item 7) |
| **Nova:** `apps/app/__tests__/postAuthRedirectTarget.test.ts` não tem caso de `..` com `\`, `%2e%2e`, tab ou codificação dupla, então a correção desta revisão não tem teste de regressão | **aberta, prioridade alta** para o `/test`. Casos: `/pt-br/../\evil.com`, `/pt-br/%2e%2e/\evil.com`, `%2Fpt-br%2F%252e%252e%2F%255cevil.com`, `/pt-br/..\\evil.com`, `/pt-br/../\t/evil.com` → `FALLBACK`; e `/pt-br/x/../entities` → aceito |
| **Nova:** `proxy.test.ts:301-309` confere o `Location` absoluto | **aberta**. Trocar a asserção por `locationOf(response)` não começar com `//` e acrescentar o alvo `%2Fpt-br%2F..%2F%5Cevil.example.com` |

Não criei nem rodei teste: é do `/test`.

## Decisões em aberto

Todas adotadas sem perguntar, como pede o `/cycle`. O usuário confirma no `/review`.

| # | Decisão | Adotada | Descartada e por quê |
|---|---|---|---|
| D1 | Onde fechar o open redirect | Na raiz, em `packages/auth/redirect.ts` | No `pointAt` do proxy: cobriria só um dos seis consumidores e duplicaria o guard, contra `apps/app/CLAUDE.md:71` |
| D2 | O que o guard devolve | O caminho original, depois de validar o resolvido | Devolver o caminho normalizado pelo `URL`: fecharia o mesmo buraco, mas mudaria a forma de destinos legítimos com caractere codificado nos seis consumidores |
| D3 | Landing e dicionário da landing em commits separados | Separados (commits 11 e 12), com o 11 vermelho no `typecheck` da `web` até o 12 entrar. A PR sobe os dois juntos | Um commit misto `web` + `internationalization`: verde em cada passo, mas fere o "não misture" de `.claude/rules/git-commits.md`, e a exceção da `cycle-policy` §6 é só para o caso de `git add -p` |
| D4 | O git ver o formatador como rename | Não: a adição em `packages/shared` (commit 6) e a remoção na `app` (commit 9) ficam em commits diferentes, e o histórico registra add + delete | Um commit só com os dois lados para o git mostrar `R100`: cruza `packages/shared` com `apps/app`. Quem quiser o rename pode juntar 6 e 9 e conferir com `git show --stat -M HEAD` |
| D5 | `AccountBillingPanel.tsx` e `BillingPlanCard.tsx` têm a troca de import do formatador e o destaque no mesmo arquivo | Os dois vão inteiros no commit do destaque (8), com o motivo no corpo | Separar exigiria `git add -p`, interativo e indisponível aqui |
| D6 | Nome da branch | `feat/pricing-page-catalog`, a criar na aprovação | Manter `guilhermebittelbrunn/spec-discussion`: reprova no regex |
| D7 | Auditoria do backlog e specs novas na mesma branch | Mesma branch, em commit `docs(specs)` próprio, antes dos artefatos | Branch `specs/docs/…` separada a partir de `main`: PR mais limpa, mas a spec desta feature está no mesmo lote e o `BACKLOG.md` cita as duas coisas |

## Gates estáticos

| Gate | Comando | Resultado |
|---|---|---|
| Lint | `pnpm check` | 901 arquivos, nenhuma correção (rodado de novo depois das minhas edições) |
| Typecheck | `pnpm turbo run typecheck --filter=api --filter=app --filter=web --filter=@repo/sdk --filter=@repo/internationalization --filter=@repo/auth` | 6/6 (5 do cache do `/develop`) |
| Typecheck do pacote corrigido | `pnpm turbo run typecheck --filter=@repo/auth` | 1/1, sem cache, depois da correção |
| Paridade i18n | `pnpm turbo run test --filter=@repo/internationalization` | 7 arquivos, 67 testes (cache; não mexi em i18n) |

A assinatura de `postAuthRedirectTarget` não mudou, então o `typecheck` em cache da `app` continua valendo.
Não rodei a suíte de nenhum workspace: o número do `/develop` (`pnpm turbo run lint typecheck test` 29/29)
não cobre a minha correção em `packages/auth`, e quem remede é o `/test` (`@repo/auth` e
`apps/app/__tests__/postAuthRedirectTarget.test.ts`, `proxy.test.ts`, `onboardingState.test.ts`,
`authRedirectLink.test.ts`).

## Rodada 1 (depois do `/test`)

O `/test` fechou com 21 ✅, 0 ❌ e 3 🔒 (`test/report.md`). Mediu o open redirect em servidor de pé: em `HEAD`
dava `location: //evil.example.com`, com a correção dá `location: /pt-br`, em `next dev` e em `next start`.
Esta rodada trata o que ele trouxe de volta.

### Regressão visual corrigida: cards da `/pricing` colados na borda

Em 375 px os cards começavam em x = 0 com 360 px de largura, e a 1280 px o primeiro também encostava. Em
`HEAD` a página era uma tabela com `px-3`/`md:px-6` em cada célula, e a reescrita pôs cards com borda direto
num `container mx-auto` sem padding (`apps/web/app/[locale]/pricing/page.tsx:41`). A regressão é desta
entrega.

Correção em `apps/web/app/[locale]/pricing/page.tsx:40`: o wrapper externo passou de
`w-full py-20 lg:py-40` para `w-full px-4 py-20 md:px-2 lg:py-40`. É o mesmo padding que o cabeçalho e o
rodapé da landing usam por fora do `container`
(`apps/web/app/[locale]/components/header/index.tsx:106`, `apps/web/app/[locale]/components/footer.tsx:56`),
então a borda esquerda dos cards passa a coincidir com a do logo do cabeçalho em todas as larguras: 16 px no
mobile e 8 px do `md` em diante. O estado vazio e o card de contato estão na mesma grade e herdam o recuo, e
o título centralizado não muda.

Descartada: `px-4` no próprio `container`, como em
`apps/web/app/[locale]/legal/components/legal-document.tsx:24`, que foi a hipótese do QA. Resolve o encosto,
mas do `md` em diante deixa os cards 8 px mais para dentro que o logo do cabeçalho. Também descartado
mexer no `container` do design system: as seções da home têm o mesmo encosto (o QA contou sete containers
em x = 0 em 375 px), mas estão fora do diff, e o cabeçalho e o rodapé já compensam por fora, o que daria
padding dobrado neles. Ficou como achado para o backlog, abaixo.

### Testes novos do QA, encaixados no plano

| Teste | Cobre | Commit |
|---|---|---|
| `apps/app/__tests__/postAuthRedirectTarget.test.ts` (+4 casos de `..`) | a correção do guard em `packages/auth/redirect.ts` | 7, `test(app)` próprio, logo depois dos commits de pacote |
| `apps/app/__tests__/proxy.test.ts` (+1 caso, 5 variantes: `Location` relativo não começa com `//`) | o proxy usando o guard corrigido | 8, junto do resto do arquivo |
| `apps/app/__tests__/accountBillingPanel.test.tsx` (+1 caso de personificação) | o destaque na aba | 9 |
| `apps/app/__tests__/authPagesRedirect.test.tsx` (novo, 6 testes) | as páginas de login e cadastro repassando o `redirect` | 11 |

O caso novo do `proxy.test.ts` fecha a lacuna do teste fraco de `proxy.test.ts:301-309`: ele confere o
`Location` depois de tirar a origem, que é o que o Next entrega ao navegador. O `authPagesRedirect.test.tsx`
fecha a lacuna "nenhum teste renderiza as páginas", herdada do handoff.

Decisão D8, sobre o commit 4 (`fix(auth)`) levar teste no próprio pacote: não leva. Os testes do
`postAuthRedirectTarget` sempre viveram em `apps/app/__tests__/`, e os casos novos do QA ficam ao lado dos 13
antigos. Duplicá-los em `packages/auth/__tests__/` seria teste redundante (checklist §6), e mover o arquivo
inteiro é refactor fora da tarefa. O commit 7 sai logo depois dos commits de pacote, para a prova ficar ao
lado da correção no histórico. Descartado: pôr o teste no commit 4, o que cruzaria `packages/auth` com
`apps/app`. A dívida (`pnpm --filter @repo/auth test` não exercita o guard do próprio pacote) vai para o
backlog.

### Expectativa corrigida: preço em `es`

Em `es`, o BRL sai "29,00 BRL / mes", não "R$ 29,00 / mes". É o CLDR do `Intl`, igual à aba da app; o código
está certo e a expectativa estava errada. Corrigi o item 7 de "Verificar no `/test`" acima. O
`analyze/plan.md:349` e o `develop/handoff.md:113` ainda trazem a forma errada; ficaram como estavam, porque
registram o que aquelas etapas esperavam, e o `test/report.md` documenta a medição. Nenhum doc em `docs/`
cita o preço em `es`: o `PAYMENTS.md` só dá o exemplo de `en` ("R$29.00 / month"), que confere.

### Achados para o backlog (fora do diff, não corrigidos)

1. **Abas da conta se sobrepõem em `en` a 1280 px.** "Security" e "Preferences" ficam colados e "Preferences"
   passa por baixo de "Billing"; em 375 px a lista rola na horizontal. Medido pelo `/test`.
   `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountTabs.tsx` não está no
   diff.
2. **Seções da home colam na borda lateral no mobile.** `hero`, `features`, `stats`, `cases`, `testimonials`,
   `faq` e `cta` usam `container mx-auto` sem padding (`apps/web/app/[locale]/(home)/components/`); o QA mediu
   sete containers em x = 0 em 375 px. A correção na raiz seria um padding no `container`, mas o cabeçalho e
   o rodapé já compensam por fora e precisariam ser ajustados junto.
3. **Teste do guard de redirect fora do pacote.** `apps/app/__tests__/postAuthRedirectTarget.test.ts` testa
   `packages/auth/redirect.ts`, então o `test` do `@repo/auth` não cobre o próprio guard. Mover o arquivo para
   `packages/auth/__tests__/` resolve.

### Gates da rodada 1

| Gate | Comando | Resultado |
|---|---|---|
| Lint | `pnpm check` | 902 arquivos, nenhuma correção |
| Typecheck e testes da `web` | `pnpm turbo run typecheck test --filter=web` | 11/11 tasks (9 do cache, as duas da `web` rodaram); `web` 20 arquivos, 131 testes |

Os testes do QA na `apps/app` não foram remedidos aqui: não mexi neles nem no que eles cobrem nesta rodada, e
o número é o do `test/report.md` (suíte da raiz 15/15).

### Verificar no `/test`, rodada 2

1. **Recuo dos cards da `/pricing`.** Com o stub do catálogo, em `/pt-br/pricing`: a 375 px o primeiro card
   começa em x = 16 e termina 16 px antes da borda direita; a 1280 px começa em x = 8, no mesmo `left` do
   `container` do cabeçalho (`document.querySelector('header > div').getBoundingClientRect().left` igual ao
   `left` do primeiro `[data-slot="card"]`). Repetir sem o stub, com o estado vazio e o card de contato.
   Light e dark, uma passada basta, porque a mudança é só de espaçamento.
2. Nada mais muda de comportamento nesta rodada.

## Plano de commits

Antes do primeiro commit: criar a branch (D6) e conferir que `git diff --cached --stat` sai vazio. Depois de
cada commit: `git show --stat --oneline HEAD` contra a lista. Toda mensagem termina com o trailer
`Co-Authored-By` da sessão. Esta é a versão final, depois da rodada 1.

**Desvio da ordem padrão.** A ordem do repo põe a i18n por último. Aqui a chave `billing.chosenPlan` sobe
antes da app (commit 5), porque o commit do destaque a lê e ela só acrescenta. O dicionário da landing não
tem ordem verde possível (D3) e fica logo antes da página, para a janela vermelha ser de um commit só.

| # | Mensagem | Arquivos |
|---|---|---|
| 1 | `feat(sdk): add the public plan catalog action` | `packages/sdk/src/actions/payments/action.ts`, `packages/sdk/__tests__/paymentsCatalog.test.ts` |
| 2 | `feat(api): serve the plan catalog publicly with a one-hour cache` | `apps/api/(shared)/lib/plan-catalog-cache.ts`, `apps/api/app/(routes)/payments/catalog/route.ts`, `apps/api/.env.example`, `apps/api/__tests__/planCatalogCache.test.ts`, `apps/api/__tests__/paymentsCatalogRoute.test.ts` |
| 3 | `test(api): keep the public catalog off the rate limiter` | `apps/api/proxy.ts`, `apps/api/__tests__/proxyArcjetKey.test.ts` |
| 4 | `fix(auth): reject redirect targets whose dot segments leave the locale` | `packages/auth/redirect.ts` |
| 5 | `feat(internationalization): add the chosen plan badge copy` | `packages/internationalization/translations/apps/app/pages/common/account.ts` |
| 6 | `refactor(shared): move plan price formatting to the shared package` | `packages/shared/utils/helpers/formatPlanPrice.ts`, `packages/shared/utils/helpers/index.ts`, `packages/shared/__tests__/formatPlanPrice.test.ts` |
| 7 | `test(app): cover redirect targets whose dot segments leave the locale` | `apps/app/__tests__/postAuthRedirectTarget.test.ts` |
| 8 | `fix(app): keep the query string through the proxy redirects` | `apps/app/proxy.ts`, `apps/app/__tests__/proxy.test.ts`, `apps/app/__tests__/onboardingRedirect.test.ts`, `apps/app/__tests__/onboardingState.test.ts` |
| 9 | `feat(app): highlight the plan chosen on the pricing page` | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountBillingPanel.tsx`, `.../account/(components)/BillingPlanCard.tsx`, `apps/app/__tests__/accountBillingPanel.test.tsx` (misto, D5) |
| 10 | `refactor(app): read plan price formatting from the shared package` | `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/(components)/BillingRevenueCard.tsx`, `apps/app/shared/lib/billingInsights.ts`, remoção de `apps/app/shared/lib/formatPlanPrice.ts` e `apps/app/__tests__/formatPlanPrice.test.ts` (`git rm` dos dois caminhos) |
| 11 | `fix(app): carry the redirect between sign-up and sign-in` | `apps/app/shared/lib/authRedirectLink.ts`, `apps/app/__tests__/authRedirectLink.test.ts`, `apps/app/__tests__/authPagesRedirect.test.tsx`, `apps/app/app/[locale]/(unauthenticated)/sign-up/page.tsx`, `.../sign-up/components/SignUpFormClient.tsx`, `.../sign-in/page.tsx`, `.../sign-in/components/SignInForm.tsx`, `apps/app/__tests__/signUpFormApi.test.tsx`, `apps/app/__tests__/signInEnterResubmit.test.tsx` |
| 12 | `feat(internationalization): replace the sample pricing plans with catalog copy` | `packages/internationalization/translations/apps/web/pages/pricing/index.ts` (vermelho na `web` até o 13, D3) |
| 13 | `feat(web): build the pricing page from the Stripe catalog` | `apps/web/app/[locale]/pricing/page.tsx`, `apps/web/app/[locale]/pricing/components/plan-card.tsx`, `.../components/contact-plan-card.tsx`, `.../components/pricing-empty-state.tsx`, `apps/web/shared/lib/planCatalog.ts`, `apps/web/shared/lib/pricingCta.ts`, `apps/web/__tests__/planCatalog.test.ts`, `apps/web/__tests__/pricingCta.test.ts`, `apps/web/__tests__/pricingPage.test.tsx` |
| 14 | `docs: describe the public plan catalog and the landing pricing page` | `docs/PAYMENTS.md`, `docs/PRE-PRODUCTION.md`, `docs/SECURITY.md`, `docs/FORKING.md`, `docs/SUBPROCESSORS.md` |
| 15 | `docs: refresh the api proxy line references` | `docs/ROPA.md`, `docs/INCIDENT-RESPONSE.md` |
| 16 | `docs(claude): list the public catalog in the payments-flow skill` | `.claude/skills/payments-flow/SKILL.md` |
| 17 | `docs(specs): audit the backlog and add seven specs from the market benchmark` | `specs/BACKLOG.md`, `specs/research/saas-starter-feature-benchmark.md`, `specs/observability-logging.md`, `specs/account-security-mfa.md`, `specs/contact-support-channel.md`, `specs/in-app-notifications.md`, `specs/linked-sign-in-methods.md`, `specs/magic-link-sign-in.md`, `specs/one-time-purchase.md`, `specs/pricing-page-catalog.md`, `specs/social-sign-in-providers.md` |
| 18 | `docs(features): pricing-page-catalog` | `docs/features/pricing-page-catalog/`: `STATE.md`, `analyze/plan.md`, `develop/handoff.md`, `review/review.md`, `test/criterios-aceite.md`, `test/report.md`. O `test/e2e/` é descartado pelo `.gitignore:300` |

Segredos no commit 18, conferidos de novo com o `test/` dentro: nenhuma senha, token ou chave real. Os
e-mails são `qa-pricing-catalog@example.com`, `user@example.com` e `admin@example.com`, todos de emulador; o
`report.md:196-197` diz que a senha da conta de QA ficou só em `/tmp`. `sk_test_offline_qa` e
`whsec_offline_qa` são inventados.

Corpo sugerido do commit 4:

```
fix(auth): reject redirect targets whose dot segments leave the locale

The guard checked the raw string, so /pt-br/../\evil.com passed: it
starts with a locale and has no double slash. The URL parser turns the
backslash into a slash and resolves the dot segment to //evil.com, and
Next rewrites a same-host proxy redirect to a relative Location, which
the browser then follows off-site. The resolved pathname now has to
keep the locale prefix too.
```

Corpo sugerido do commit 9:

```
feat(app): highlight the plan chosen on the pricing page

The billing tab reads ?plan= and marks the matching card with a badge
and a ring. Nothing else changes: the parameter never reaches the API
and does not start a checkout.

Both files also switch the price formatter import to @repo/shared; the
two changes share the files and would need an interactive partial add
to split.
```

Corpo sugerido do commit 12:

```
feat(internationalization): replace the sample pricing plans with catalog copy

The page that read the removed keys is rewritten in the next commit;
the web typecheck fails between the two.
```

Depois do último commit, perguntar ao usuário se sobe com `git push -u origin feat/pricing-page-catalog`.
Título de PR sugerido: `feat: pricing page built from the Stripe catalog`.

### Commits realizados

O usuário aprovou os commits e o push ao pedir a PR, em 2026-10-16. A branch `feat/pricing-page-catalog` foi
criada com `git switch -c` a partir de `guilhermebittelbrunn/spec-discussion`, sem renomear a branch do
workspace. Antes de cada commit o índice estava vazio, e depois de cada um a lista de `git show` bateu com a
do plano. O 18 é este commit de artefatos.

| # | hash | mensagem |
|---|------|----------|
| 1 | `478d04c` | `feat(sdk): add the public plan catalog action` |
| 2 | `836b8c7` | `feat(api): serve the plan catalog publicly with a one-hour cache` |
| 3 | `c054ef1` | `test(api): keep the public catalog off the rate limiter` |
| 4 | `58790a9` | `fix(auth): reject redirect targets whose dot segments leave the locale` |
| 5 | `e975f88` | `feat(internationalization): add the chosen plan badge copy` |
| 6 | `4095d43` | `refactor(shared): move plan price formatting to the shared package` |
| 7 | `a9f88aa` | `test(app): cover redirect targets whose dot segments leave the locale` |
| 8 | `de7b0fb` | `fix(app): keep the query string through the proxy redirects` |
| 9 | `847507b` | `feat(app): highlight the plan chosen on the pricing page` |
| 10 | `2668807` | `refactor(app): read plan price formatting from the shared package` |
| 11 | `effdf41` | `fix(app): carry the redirect between sign-up and sign-in` |
| 12 | `258ecb2` | `feat(internationalization): replace the sample pricing plans with catalog copy` |
| 13 | `6906fe6` | `feat(web): build the pricing page from the Stripe catalog` |
| 14 | `e37089a` | `docs: describe the public plan catalog and the landing pricing page` |
| 15 | `f91bfb3` | `docs: refresh the api proxy line references` |
| 16 | `231affa` | `docs(claude): list the public catalog in the payments-flow skill` |
| 17 | `00ba423` | `docs(specs): audit the backlog and add seven specs from the market benchmark` |
| 18 | — | `docs(features): pricing-page-catalog` |
