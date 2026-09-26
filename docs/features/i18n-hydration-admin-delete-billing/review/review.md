# Revisão: i18n-hydration-admin-delete-billing

Rodada autônoma do `/cycle`. A revisão leu o diff, conferiu as afirmações do handoff contra o código e rodou
só os gates estáticos. Não subiu app, não abriu navegador e não rodou a suíte inteira.

## Branch

- Atual: `sync-spec-backlog-audit`. **Não passa no regex** do padrão `<project>/<type>/<title>`.
- Não tem upstream (`git rev-parse --abbrev-ref --symbolic-full-name @{u}` falha) nem commit à frente de
  `origin/main` (`git log --oneline origin/main..HEAD` sai vazio). O caminho previsto seria renomear.
- O `/cycle` proíbe criar ou renomear branch (`cycle-policy.md` §1), então a revisão só definiu o nome.
- Nome proposto: **`fix/i18n-hydration-admin-delete-billing`**. Passou no regex. Não leva prefixo de
  projeto porque o diff toca `apps/api`, `apps/app` e `apps/web`.
- **Ação pendente antes do primeiro commit**: `git branch -m fix/i18n-hydration-admin-delete-billing`.
  Pode renomear sem risco porque a branch não tem remoto nem commit de terceiro.

## Revisão: H1 (locale do dicionário client) e A2 (arquivamento pelo admin)

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `packages/internationalization/client.ts:40-45`: no servidor, `getDictionary()` lê o locale com
  `use(LocaleContext)`. No React 19.2, o `use` de um contexto passa pelo `readContext` do Fizz, que em
  desenvolvimento chama `console.error("Context can only be read while React is rendering...")` quando a
  leitura acontece dentro de um callback de `useMemo` ou de um inicializador de `useState`/`useReducer`
  (`react-dom-server.node.development.js:3934-3940`, `:3969`, `:4026`). O valor devolvido continua certo.
  Nenhum dos 63 call sites cai nisso hoje: todos chamam no corpo do componente ou do hook, e o
  `formatDisplayDateTime` roda dentro de `render` de coluna, que o `rc-table` calcula com o `useMemo` do
  `rc-util`, feito com `useRef`. **Corrigido aqui**: o JSDoc de `getDictionary()` passou a dizer isso, para
  quem escrever o próximo call site.
- `packages/internationalization/client.ts:47-56`: no navegador, `lastRenderedBrowserLocale` é gravado no
  render do `LocaleProvider`, mesmo que esse render pertença a uma transição que ainda não foi commitada.
  Numa troca de idioma por `router.push` em que o segmento novo suspende, um componente da árvore antiga que
  re-renderize nesse intervalo sai no idioma novo até a transição terminar. O efeito é passageiro e o
  desenho do plano o aceita. Sem ação; fica registrado como limite conhecido.
- `apps/api/app/(routes)/users/[id]/route.ts:159-162`: o log `admin-user-delete-billing-failed` leva
  `requestId` e `reason`, sem o id do perfil. Para achar qual usuário falhou é preciso cruzar o `requestId`
  com a trilha de auditoria, e a trilha não registra a tentativa recusada. O id do documento não é dado
  pessoal. Sem ação: o mesmo desenho vale para a exclusão pelo titular, e mudar os dois está fora da tarefa.

### ✅ OK

H1:

- O ramo do servidor nunca grava estado de módulo. `lastRenderedBrowserLocale` só é escrito dentro de
  `if (!isServer())` (`client.ts:52-54`), e `readActiveLocale()` no servidor devolve direto o
  `use(LocaleContext)` (`:40-42`). `fallbackLocale()` devolve `null` no servidor (`:31-33`), então o cookie
  não entra no SSR. Os testes "isola duas requisições concorrentes" e "não guarda o idioma em estado de
  módulo entre requisições" cobrem esse ramo com `renderToReadableStream`.
- Hidratação: no SSR o locale vem do contexto, preenchido por `useParams()`. No primeiro render do navegador
  o `LocaleProvider` renderiza antes dos filhos, grava o mesmo valor de `useParams()` e os filhos o leem.
  Os dois lados partem da mesma fonte.
- `useParams()` num client component do root layout da `apps/app` (`apps/app/app/layout.tsx:77`) devolve
  os params da rota inteira, inclusive o `[locale]` que fica abaixo do layout. Rota sem segmento
  (`not-found`, `page.tsx` da raiz) cai no padrão `pt-br` nos dois lados, sem divergência.
- Chamar `getDictionary()` fora de render no SSR lança erro, como o handoff diz: sem dispatcher ativo, o
  `use` não tem onde rodar. A contagem por leitura bate com a do handoff: 70 arquivos de produção importam
  `@repo/internationalization/client` (68 mais os 2 layouts), e as únicas chamadas fora do corpo de
  componente ou hook são `getRedirectPath` (`packages/design-system/index.tsx:25`), que é callback de
  navegador, e o `formatDisplayDateTime` citado acima.
- `apps/web/app/[locale]/global-error.tsx:14` fica fora do provider. No navegador ele passa a ler o último
  locale renderizado em vez do cookie; no prerender de `/_global-error` o contexto é `null` e sai `pt-br`,
  como antes.
- D-dev1 está correto e fica. O `AuthProvider` da `apps/app` está dentro do `LocaleProvider`
  (`layout.tsx:77` → `AppDesignProvider` → `AuthProviderWithAlerts`) e acima do `[locale]`. Com
  `useDictionary()` ele assina o contexto e re-renderiza quando o provider muda de valor. `dictionary` é o
  mesmo objeto por locale (`globalTranslations[l]`), então o `useCallback` de `provider.tsx:250` só muda de
  identidade quando o idioma muda. Nenhum outro componente acima do segmento lê o dicionário no render:
  `ClientLayout` e os providers de `apps/app/shared/providers/` não importam o módulo.
- A troca de `<ClientLayout> {children} </ClientLayout>` por `{" "}{children}{" "}` em
  `apps/web/app/[locale]/layout.tsx:47-48` preserva os dois espaços que o JSX original já gerava.
- Lockfile: nenhum pacote novo entrou no grafo. `@types/react@19.2.2`, `@types/react-dom@19.2.2` e
  `react-dom@19.2.0` já estavam na seção `packages` do `HEAD` (`pnpm-lock.yaml` do `HEAD`, linhas 4501,
  4512 e 8510). O diff só acrescenta o importer do `@repo/internationalization` e troca o `csstype` do
  `@types/react` de `3.1.3` para `3.2.3`, que já existia. `next` já era dependência do pacote de i18n, então
  o import de `next/navigation` em `client.ts` não cria vínculo novo.

A2:

- Ordem: busca do perfil → rótulo da auditoria → cancelamento → soft delete → auditoria
  (`route.ts:141-183`). A falha no cancelamento retorna antes do `userRepository.delete` e antes do
  `recordAuditEvent`.
- 503 `USERS_DELETE_BILLING_FAILED` com `HTTP_STATUS.SERVICE_UNAVAILABLE`, tanto com a Stripe desligada
  (`getStripe()` nulo, `reason: "billing-not-configured"`) quanto com o cancelamento lançando erro.
- `logEvent` recebe só `requestId` e `error.name`. A assinatura de `LogFields` não aceita objeto, e o teste
  "logging only the error name" confere que a mensagem do provedor não aparece no log.
- `resource_missing` arquiva: `cancelSubscriptionForErasure` (`apps/api/(shared)/lib/billing.ts:162-174`)
  engole esse código e devolve normalmente. É o mesmo helper da exclusão pelo titular
  (`account-erasure.ts:95`).
- Sem assinatura viva a Stripe não é chamada: `isLiveSubscription` é o mesmo critério do titular e da
  contagem do admin.
- Guard `requireAdminApi<RouteIdParamsContext>` preservado no `DELETE`, com `resolveIdFromContext`.
- Perfil arquivado com `subscription.status` ainda `active` não infla a contagem de assinaturas do admin:
  `countLiveSubscriptionsByPrice` descarta `deletedAt` em memória (`user.repository.ts:243`).
- `USERS_DELETE_BILLING_FAILED` tem entrada em `apiErrors` nos 3 idiomas, no mesmo tom de
  `ACCOUNT_DELETION_BILLING_FAILED`. O aviso novo do diálogo de arquivamento existe em pt-br, en e es.
- O app já mostra o texto certo: `useUserCrud` trata erro com `handleClientError(new FormattedError(error,
  locale))`.
- Testes: `usersAdminDeleteBilling.test.ts` tem 12 casos e cobre caminho feliz, os 4 status vivos além de
  `active`, os 2 terminais, Stripe desligada, falha da Stripe, `resource_missing` e 404. As duas suítes que
  importam a rota ganharam mock de `@repo/payments` e `@/env`, na borda.
- Docs: `docs/PAYMENTS.md`, `docs/PRE-PRODUCTION.md`, `docs/ARCHITECTURE.md`, `AGENTS.md`,
  `apps/app/CLAUDE.md` e `.claude/skills/i18n-sync/SKILL.md` descrevem o que o código faz agora. A linha
  "cancelar a assinatura quando o admin faz soft delete" saiu do "Fora do corte" do `PAYMENTS.md`, o que
  está certo.

### 👁 Verificar no `/test`

Por ordem de risco. O primeiro item sustenta o corte do H1 e só foi medido na `apps/web`, só no `Header`,
por `curl`.

1. **Sem "Hydration failed"/"did not match" na `apps/app`.** O smoke do handoff não tocou a `apps/app`, e
   é lá que o provider fica acima do `[locale]`. Repro: abrir `/en/admin`, `/es/admin`, `/en/entities`,
   `/en/account` e `/en/sign-in` com e sem cookie `x-locale=pt-br`, console do navegador aberto; na web,
   `/en` e `/es`. Conferir também que o texto do SSR (`curl` da página) já sai no idioma da URL.
2. **Troca de idioma sem recarregar.** Repro: em `/en/entities`, trocar pelo `LanguageSwitcher` para `es`;
   sidebar, breadcrumb e tabela em espanhol.
3. **D-dev1, toast do `AuthProvider` depois da troca.** Nada automatizado cobre o re-render. Repro: em
   `/en/sign-in`, trocar para `/es/sign-in` por navegação suave, entrar com a conta de QA e conferir o toast
   de sucesso em espanhol.
4. **Datas no SSR.** Repro: `/en/admin/users`, coluna de último acesso no formato inglês no HTML do
   servidor e sem mismatch na hidratação.
5. **Aviso de console do React no servidor.** Repro: com `pnpm --filter app dev`, carregar
   `/en/admin/users` e `/en/entities` e procurar "Context can only be read while React is rendering" no
   terminal do Next. Esperado: nenhuma ocorrência.
6. **Diálogo de arquivamento** com a frase nova nos 3 idiomas.
7. **Arquivar usuário sem assinatura**: 204 e o toast de sempre.
8. **Arquivar com assinatura viva e a Stripe desligada.** Repro: perfil de QA no emulador com
   `subscription.status = "active"` gravado à mão, API sem `STRIPE_SECRET_KEY`; arquivar mostra o toast de
   `USERS_DELETE_BILLING_FAILED` e o usuário continua na listagem.
9. **Cancelamento real numa conta Stripe de teste**: 🔒, exige conta no provedor.

Observação sem reprovar (O4, fora do escopo): na primeira carga de `/en` sem cookie, o `<html lang>` e o
banner de consentimento (`AnalyticsProvider` recebe o `locale` do `getDictionary()` do servidor, que lê o
cookie) ficam em `pt-br`.

## Rodada 1: volta do `/test` (D1)

O `/test` reprovou o critério 3: a landing falha a hidratação nos 3 idiomas, em dev e em produção (`#418`).
Detalhe em `test/report.md`, seção "Defeitos", D1. O defeito não veio deste diff, mas o plano prometia a
web hidratando sem erro, e o orquestrador decidiu corrigir nesta entrega (`cycle-policy.md` §3).

### 🔴 Bloqueante

- `apps/web/app/[locale]/components/header/index.tsx:82-88` (numeração do `HEAD`): cada item da navegação
  desktop era `NavigationMenuLink` (`<a>`) → `Button` (`<button>`) → `Link` (`<a>`). O parser HTML fecha o
  primeiro `<a>` quando encontra o segundo, o DOM deixa de bater com o que o React renderizou e a
  hidratação falha. **Corrigido** (abaixo).

### 🟡 Atenção

- O mesmo arquivo tinha mais quatro `<a>` dentro de `<button>`: o botão de contato do menu Produto
  (`:107-121` no `HEAD`), o link do painel (`:186-196`), entrar (`:215-225`) e cadastrar (`:226-233`).
  `<a>` dentro de `<button>` não derruba a hidratação, porque o parser não fecha nada nesse caso, mas é
  conteúdo inválido, cria dois alvos de foco para uma ação só e é a regra `nested-interactive` do axe.
  **Corrigido** junto, por estar no mesmo componente.

### 🟢 Sugestão / nit

- O mesmo padrão `Button > Link` continua em `apps/web/app/[locale]/(home)/components/hero.tsx:27-52`,
  `cta.tsx:23-43`, `faq.tsx:36-47` e `pricing/page.tsx:85-96`, `:127-134`, `:165-176`. Nenhum deles tem
  `<a>` dentro de `<a>`, então não causa o D1. Já estão registrados em `specs/BACKLOG.md:450` e cobertos
  pela exceção `WEB_BUTTON_WRAPPING_LINK` de `apps/e2e/a11y/allowlist.ts`. Ficam fora, por mudança mínima.
- Com o header corrigido, a exceção `WEB_BUTTON_WRAPPING_LINK` na rota `web:/pt-br/sign-up` provavelmente
  fica sem alvo: por leitura, o header era o único `button:has(a, button)` dessa página (o seletor de idioma
  usa `DropdownMenuTrigger asChild` e o formulário de cadastro não aninha link em botão). Sem rodar a suíte
  E2E, a allowlist não mudou. Se a anotação `a11y-stale-exception` aparecer para essa rota, a rota sai da
  lista em `allowlist.ts:88-91`, e a frase "The web header" sai do `reason`.

### Correção

`Button` do design system não tem `asChild` e sempre envolve os filhos num `<div>`, então não serve para
virar link. A correção aplica as classes de `buttonVariants` direto no elemento de link:

- Navegação desktop (`header/index.tsx:86-95`): `<NavigationMenuLink asChild className={buttonVariants({
  variant: "ghost" })}>` com o `Link` como filho único. O Radix repassa ao `<a>` do `Link` o
  `data-slot="navigation-menu-link"`, as classes e o comportamento de teclado do menu. O `cn` do
  `NavigationMenuLink` resolve os conflitos com as classes base dele (`p-2` → `px-4 py-2`, `flex` →
  `inline-flex`, `gap-1` → `gap-2`, `rounded-sm` → `rounded-md`).
- Contato do menu Produto (`:114-127`): `Link` com `cn(buttonVariants({ size: "sm" }), "mt-10")`.
- Painel (`:194-205`), entrar (`:225-234`) e cadastrar (`:236-241`): `<a>`/`Link` com `buttonVariants` da
  mesma variante. Onde havia `hidden md:inline` no botão, o link usa `hidden md:inline-flex`: um `<button>`
  com `display: inline` ainda se comporta como bloco em linha, e um `<a>` com `inline` perderia altura e
  padding vertical.

O que muda no visual e precisa de olho no `/test`: o item de navegação deixa de ter o `p-2` do link externo
em volta do botão. A altura do item cai de uns 52 px para 36 px (`h-9`) e o espaço entre os itens passa a
ser só o `gap-4` da lista. O item também ganha `focus:bg-accent` da base do `NavigationMenuLink`, que
antes ficava no `<a>` externo.

Teste novo: `apps/web/__tests__/headerInteractiveNesting.test.tsx` renderiza o `Header` real com
`renderToString`, dentro do `LocaleProvider`, nos estados visitante e logado no modo assinatura com link de
docs, e percorre as tags `<a>`/`<button>` com uma pilha, falhando em qualquer aninhamento. Contra o header
do `HEAD` o teste falha nos dois estados (`a > button`, `a > button > a` e `button > a`); com a correção,
passa. Um terceiro caso fixa o detector com o HTML do defeito.

### 👁 Verificar no `/test` (rodada 1)

1. **Critério 3 de novo.** Repro: `pnpm --filter web dev`, abrir `/pt-br`, `/en` e `/es` com o console
   aberto; nenhum "cannot be a descendant of" nem "Hydration failed". Depois `next build && next start -p
   3001` e as mesmas URLs sem `#418`.
2. **Visual do header** em light, dark e mobile: altura e espaçamento dos itens da navegação, estados de
   hover e foco, botões de entrar/cadastrar e o link do painel com a mesma aparência de antes. Em mobile
   o link de entrar continua oculto e o de cadastrar aparece.
3. **Teclado**: Tab percorre cada item da navegação uma vez (antes eram duas paradas, o `<button>` e o
   `<a>`); setas funcionam dentro do `NavigationMenu`; Enter navega.
4. **Menu Produto**: abrir, clicar em Contato e chegar a `/<locale>/contact`.
5. **E2E, se rodar**: anotação `a11y-stale-exception` para `web:/pt-br/sign-up`.

## Correções aplicadas

| Arquivo | O que mudou |
|---------|-------------|
| `packages/internationalization/client.ts:59-64` | O JSDoc de `getDictionary()` passou a dizer que, no servidor, a chamada tem de ficar no corpo do componente, porque dentro de `useMemo` ou de inicializador de `useState` o React registra erro em desenvolvimento. Só comentário, sem mudança de comportamento. |
| `apps/web/app/[locale]/components/header/index.tsx:86-95, 114-127, 194-205, 225-241` | Rodada 1 (D1). Link e botão deixam de ser aninhados: cada ação é um único `<a>` com as classes de `buttonVariants`, e a navegação desktop usa `NavigationMenuLink asChild`. |
| `apps/web/__tests__/headerInteractiveNesting.test.tsx` (novo) | Rodada 1. Três casos: visitante, logado no modo assinatura e o próprio detector. |

## Raio de impacto

- `@repo/internationalization/client`: duas exportações novas (`LocaleProvider`, `useDictionary`).
  `getDictionary()` e `getDictionaryForLocale()` mantêm a assinatura. Consumidores: 68 arquivos de produção
  em `apps/app`, `apps/web`, `packages/auth` e `packages/design-system`, nenhum alterado além do
  `AuthProvider`. Mudança de contrato no servidor: chamar `getDictionary()` do client fora de render lança
  erro. Por leitura, nenhum call site faz isso.
- `DELETE /users/[id]`: novo 503 com `USERS_DELETE_BILLING_FAILED`. O SDK não muda
  (`apiClient.users.delete` já propaga `{ error: { code } }`). Consumidor: `useUserCrud` na área admin.
- Lockfile: sem pacote novo.

## Lacunas de teste

| Lacuna (do handoff) | Veredito |
|---------------------|----------|
| Re-render do `AuthProvider` na troca de idioma sem teste automatizado (o pacote de i18n roda em `node`, sem jsdom) | **Continua aberta.** Vai para o `/test` como item 3 da lista acima. |
| Cancelamento passa e soft delete falha (Firestore fora), sem teste | **Continua aberta.** Por leitura, o estado resultante é recuperável: o webhook `customer.subscription.deleted` acha o perfil ainda ativo e grava `canceled`, e a nova tentativa pula a Stripe. |

Lacuna nova: nenhuma.

## Decisões em aberto

1. Renomear a branch para `fix/i18n-hydration-admin-delete-billing` antes do primeiro commit. Recomendação:
   `git branch -m`, já que não há remoto nem commit à frente de `main`.
2. D-dev1 (`useDictionary()` no `AuthProvider`): recomendação é manter. A leitura acima confirma o
   mecanismo.

## Gates

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint | `pnpm check` | 753 arquivos, sem erro |
| Typecheck | `pnpm turbo run typecheck --filter=api --filter=app --filter=web --filter=@repo/internationalization --filter=@repo/auth` | 5/5, todos do cache |
| i18n + paridade | `pnpm --filter @repo/internationalization test` | 6 arquivos, 59 testes, `parity.test.ts` e `localeProvider.test.ts` passam |
| Lint do arquivo corrigido | `npx biome check packages/internationalization/client.ts` | sem erro |

A correção foi só de comentário, então os testes de `api`, `app`, `web` e `auth` não foram rodados de novo.
Vale o número do handoff.

Rodada 1:

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint | `pnpm check` | 755 arquivos, sem erro |
| Typecheck | `pnpm --filter web typecheck` | sem erro |
| Teste novo | `vitest run __tests__/headerInteractiveNesting.test.tsx` em `apps/web` | 3/3 com a correção; 2 de 3 falham com o header do `HEAD` no lugar |

O resto da suíte da `apps/web` não foi rodado aqui: é do `/test`.

## Varredura de segredo

`docs/features/i18n-hydration-admin-delete-billing/`, `specs/BACKLOG.md`, `specs/observability-logging.md` e
as duas specs movidas: nenhuma senha, token, chave ou e-mail real. Só aparecem nomes de variável
(`STRIPE_SECRET_KEY`, `RESEND_TOKEN`).

## Plano de commits

⚠️ **O índice não está vazio.** `git diff --cached --stat` mostra os dois `git mv` da auditoria do backlog
(`specs/admin-billing-insights.md` → `docs/features/admin-billing-insights/spec.md` e
`specs/e2e-testing.md` → `docs/features/e2e-testing/spec.md`). Por isso o commit da auditoria é o
**primeiro a executar**: ele absorve o que já está preparado. Antes dele, rode `git diff --cached --stat` e
confira que só esses dois renames aparecem.

O `@repo/internationalization` aparece em dois pontos: o `client.ts` é contrato que `auth`, `app` e `web`
consomem, e vai antes deles, como o SDK iria; as traduções seguem a regra e vão por último entre os
commits de código.

0. Renomear a branch: `git branch -m fix/i18n-hydration-admin-delete-billing`.
1. `docs(specs): reconcile the backlog after the billing insights and e2e deliveries`
   - `specs/BACKLOG.md`
   - `specs/observability-logging.md`
   - `specs/admin-billing-insights.md` → `docs/features/admin-billing-insights/spec.md` (rename já no índice; `git add` da versão modificada)
   - `specs/e2e-testing.md` → `docs/features/e2e-testing/spec.md` (idem)
   - `docs/features/admin-analytics-dashboard/spec.md`
   - `docs/features/admin-billing-insights/analyze/plan.md`
   - `docs/features/e2e-testing/analyze/plan.md`
2. `fix(internationalization): resolve the client dictionary from the url locale`
   - `packages/internationalization/client.ts`
   - `packages/internationalization/package.json`
   - `pnpm-lock.yaml`
   - `packages/internationalization/__tests__/localeProvider.test.ts`
3. `fix(auth): re-render the auth provider when the language changes`
   - `packages/auth/provider.tsx`
4. `fix(api): cancel the live subscription before an admin archives a user`
   - `apps/api/app/(routes)/users/[id]/route.ts`
   - `apps/api/__tests__/usersAdminDeleteBilling.test.ts`
   - `apps/api/__tests__/usersAdminAuditTrail.test.ts`
   - `apps/api/__tests__/mergedUserPayload.test.ts`
5. `fix(app): mount the locale provider in the root layout`
   - `apps/app/app/layout.tsx`
6. `fix(web): mount the locale provider in the locale layout`
   - `apps/web/app/[locale]/layout.tsx`
7. `fix(web): stop nesting links inside links and buttons in the header` (rodada 1, D1)
   - `apps/web/app/[locale]/components/header/index.tsx`
   - `apps/web/__tests__/headerInteractiveNesting.test.tsx`
8. `fix(internationalization): translate the admin archive billing failure`
   - `packages/internationalization/translations/packages/shared/utils.ts`
   - `packages/internationalization/translations/apps/app/pages/admin/users.ts`
9. `docs: describe the url-driven client locale and the admin archive cancellation`
   - `docs/PAYMENTS.md`
   - `docs/PRE-PRODUCTION.md`
   - `docs/ARCHITECTURE.md`
10. `docs(claude): update the locale guidance for agents`
    - `AGENTS.md`
    - `apps/app/CLAUDE.md`
    - `.claude/skills/i18n-sync/SKILL.md`
11. `docs(features): i18n-hydration-admin-delete-billing`
    - `docs/features/i18n-hydration-admin-delete-billing/`

O commit 7 vem depois do 6 porque o teste novo monta o `Header` dentro do `LocaleProvider`; os dois não
dependem um do outro em código de produção.

Depois de cada commit, `git show --stat --oneline HEAD` contra a lista acima.

PR sugerida: `fix: client locale from the url segment, header hydration and subscription cancel on admin archive`.

### Commits realizados

(preenchido por quem commitar)
