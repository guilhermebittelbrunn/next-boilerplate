# Pesquisa — sair do Next.js para o TanStack Start?

> Pesquisa exploratória, **não** é um plano de execução. Data: 2026-08-20.
> Fontes externas verificadas contra docs primárias (TanStack, Vercel, npm). Fontes internas com `file:line`.

## TL;DR

A intuição de que "o Next não está pagando o próprio custo aqui" está **correta** — mas por um motivo
diferente do imaginado, e a conclusão não é "remover o Next".

1. **O React Query não é a causa do client-side.** O padrão de prefetch no servidor já está
   implementado e correto em 3 páginas. A causa real é o **modelo de credencial ser browser-first**:
   `useAuthorizedQuery` retém toda query até o bearer token existir no browser. Isso é arquitetura, não
   framework — **migrar não resolve, o problema viaja junto**.
2. **A decisão certa é por app, não global.** `apps/api` → sair do Next (mas não para o Start).
   `apps/app` → melhor candidato real ao Start. `apps/web` → **ficar** no Next.
3. **Existem ganhos grandes disponíveis sem migrar nada** — inclusive o maior ganho de performance do
   repo hoje, que é um bug de 1 linha na `apps/web`.

---

## 1. Checagem da premissa: o React Query é o culpado?

**Não.** Medição em `apps/app`: **36 de 90** módulos não-teste têm `"use client"` (40%).

O prefetch no servidor **já existe e está no padrão recomendado** (`prefetchQuery` → `dehydrate` →
`HydrationBoundary`), em 3 rotas:

| Arquivo | Query |
|---|---|
| `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/(home)/page.tsx:19,27-29` | `entities.list()` |
| `.../entities/(pages)/edit/[id]/page.tsx:23,31-33` | `entities.detail(id)` |
| `.../(admin)/admin/(pages)/users/(pages)/(home)/page.tsx:21,29-31` | `users.list()` |

Ou seja: o Query está sendo usado do jeito que a doc dele manda para App Router. As causas reais do peso
client-side são outras:

| Causa | Evidência |
|---|---|
| **Todo o chrome autenticado é client** | `Navbar.tsx:1`, `Sidebar.tsx:1`, `(common)/sidebar.tsx:1`, `admin/sidebar.tsx:1`, `(common)/routes.tsx:1`, `admin/routes.tsx:1`, `PanelNavbarControls.tsx:1`, `ProfileDropdown.tsx:1`, `LanguageSwitcher.tsx:3`, `Container.tsx:1`, `Footer.tsx:1`, `ScrollToTopButton.tsx:1` |
| **4 camadas de provider client na raiz** | `app/layout.tsx:38-47` → `QueryProvider` → `AnalyticsProvider` → `AppDesignProvider` → `ClientLayout`; e `AppDesignProvider` expande para 5 providers (`packages/design-system/index.tsx:40-55`) |
| **Os 3 dicionários inteiros vão no bundle** | `packages/internationalization/client.ts:3` importa `translations/global` — pt-br + en + es no JS do cliente |
| **4 páginas são elas mesmas client** | `playground`, `entities/create`, `admin/users/create`, `admin/users/edit/[id]` |
| **Auth é client-driven (raiz do problema)** | `AuthRequestPanelContext.tsx:113-155` é o único escritor dos headers de auth do SDK e faz no-op no servidor (`:69-71`); `shared/hooks/useAuthorizedQuery.ts:21-35` força `enabled: … && sdkAuthorized` |

> **O ponto que importa:** o último item é a raiz. O SDK autentica por bearer token no browser, então
> *nenhuma* query pode rodar antes da hidratação. Trocar Next por TanStack Start não muda isso — o Start
> teria exatamente o mesmo problema, porque o problema é de onde vem a credencial, não de quem renderiza.

---

## 2. O Next está sendo pago e não usado

Este é o argumento **a favor** da sua intuição, e ele é forte.

### `apps/app` — superfície do Next não utilizada

`notFound()`, `headers()`, Server Actions, ISR/`revalidate`/cache tags, `next/og`, `sitemap`/`robots`/
`manifest`, `next/font` (direto), `error.tsx`, `generateStaticParams`, rotas paralelas/interceptadas, PPR.
`generateMetadata` existe em **2 arquivos** (`sign-in`, `sign-up`) — o dashboard autenticado inteiro sobe
**sem title/description**, porque não há `metadata` em `app/layout.tsx`.

Há ainda **dois middlewares completos e não conectados**: `packages/auth/middleware.ts` (só referenciado
por `apps/app/midd_teste.ts`, 16 linhas comentadas) e `packages/security/middleware.ts` (nosecone,
importado por ninguém).

### `apps/web` — paga o pipeline estático e não usa nada dele

**Zero SSG.** Não existe `generateStaticParams`, nem `export const dynamic/revalidate`, em nenhum lugar do
repo. E toda página chama `getDictionary()`, que chama `cookies()` em
`packages/internationalization/server.ts:19` → **toda rota `[locale]` é force-dynamic**, incluindo
`legal/privacy`, `legal/terms` e `pricing`, que são conteúdo estático puro. Pior: as páginas chamam
`getDictionary()` duas vezes por request (em `generateMetadata` **e** no corpo, ex.
`legal/privacy/page.tsx:7` e `:16`).

O locale no servidor **nunca** vem do segmento `[locale]` da URL — vem do cookie `x-locale` que o proxy
escreveu (`apps/web/proxy.ts:56,60`). O `[locale]` é decorativo para data loading.

### `apps/api` — o Next é quase só tipo

10 route handlers. **Todos** retornam `Response`/`Response.json` padrão da web, exceto o webhook. Nenhum
`export const runtime`. O acoplamento real ao Next é:

- `apps/api/proxy.ts` — CORS, 2 chamadas de `NextResponse`
- `(routes)/webhooks/payments/route.ts:4,43-44` — `headers()` do `next/headers` (1 linha, substituível por `request.headers`)
- `(shared)/lib/resolve-api-actor.ts:34` — `req.cookies.get(...)`, o único membro Next-específico de `NextRequest` realmente usado em todo o app
- `app/layout.tsx` + `app/global-error.tsx` — **vestígio de UI que arrasta `@repo/design-system` + geist para dentro de uma API JSON**

O raw body do Stripe já funciona sem gambiarra (`await request.text()`, `route.ts:42`) — isso é web
standard, não Next.

---

## 3. Estado real do TanStack Start (verificado)

| Fato | Valor |
|---|---|
| Versão atual | `@tanstack/react-start@1.168.48`, publicado **2026-08-19** (ativíssimo) |
| Downloads/semana | **15,7M** vs `next` 45,1M (≈35%) — adoção real, não hobby |
| v1 | RC anunciado em [2025-09-23](https://tanstack.com/blog/announcing-tanstack-start-v1); série 1.168.x hoje |
| Deploy Vercel | **First-class.** Vercel detecta automaticamente; requer plugin **Nitro**; usa **Fluid Compute** por padrão ([docs](https://vercel.com/docs/frameworks/full-stack/tanstack-start)) |
| Bundler | Vite (e Rsbuild) |
| Lovable | usa TanStack Start em **todos** os projetos novos, deploy zero-config na Vercel |

### O que tem

SSR de documento completo, streaming, **selective SSR por rota** (`ssr: true | false | 'data-only'`, com
forma de função `({params, search}) => …`), **static prerendering** (com crawl de links, filtro,
concorrência), **static server functions** (executadas em build), server functions type-safe, server
routes com middleware por rota e por handler, middleware de request, search params tipados com validação
em runtime, integração profunda com o Query (loader + `ensureQueryData` + hidratação).

### O que falta — pela **própria Vercel** ([comparativo oficial](https://vercel.com/i/tanstack-vs-next-js))

- **RSC**: "experimental as of v1 RC and **not enabled by default**". Vai chegar como adição não-breaking em 1.x.
- **Image optimization**: "does not have a first-party Image Optimization component today" — ecossistema (`@unpic/react`) ou Nitro + Build Output API manual.
- **ISR**: só "approximate ISR with Cache-Control headers". Sem equivalente a **Runtime Cache** ou **Skew Protection** — a Vercel chama isso de **"a structural gap"** para sites de conteúdo.
- **Ecossistema**: "smaller and more self-selecting, and some integrations your team wants may need to be assembled rather than installed".

### O enquadramento da Vercel — e ele encaixa neste repo com precisão incômoda

> **Next fits** — "applications where content is the experience": marketing sites, docs, storefronts.
> **TanStack Start fits** — "applications where interactive state is the experience": **dashboards, admin panels, and search-heavy UIs with complex URL state like filters and pagination**.

Isso é literalmente a divisão `apps/web` vs `apps/app` deste monorepo.

---

## 4. Veredito por app

### `apps/api` → sair do Next, **mas não para o Start** ✅ maior ganho, menor risco

Uma API só-JSON não precisa de framework de UI — nem Next, nem Start. O acoplamento é quase todo
type-level (§2). Alvo natural: **Hono** em Vercel Functions (Node runtime, obrigatório por causa do
`firebase-admin`). Ganhos: perde `layout.tsx`/`global-error.tsx` e o design-system inteiro do grafo de
build, perde o `.next/`, startup e deploy muito mais rápidos, e o `@repo/sdk` já é **100% agnóstico**
(zero import de `next`) — o contrato não muda.

### `apps/app` → candidato legítimo ao TanStack Start ⚠️ ganho real, custo real

**A favor:** é exatamente o caso de uso que a Vercel aponta. Search params tipados resolveriam algo que
hoje **não existe** no app (as tabelas têm `searchFields` mas nenhum estado na URL — filtro e paginação
não são linkáveis nem recarregáveis). `ssr: 'data-only'` descreve com precisão o que essas telas querem:
loader no servidor, componente no cliente. Dev server em Vite é ordens de magnitude mais rápido que o
build atual. E como o RSC aqui é usado em 3 páginas apenas, o "RSC experimental" do Start custa pouco.

**Contra — o custo concentra-se em 3 pontos:**

1. **`apps/app/proxy.ts:63-126` é a peça mais difícil.** É um gate default-deny que roda **Firebase Admin
   antes de qualquer JS da app** (`getUserFromSessionCookie`, `:94`), mais normalização de locale. No
   Start isso vira `beforeLoad` + middleware de server route — semanticamente parecido, mas **não
   idêntico**: o proxy do Next roda antes de todo código de app; `beforeLoad` roda dentro do router.
   Precisa de reprojeto cuidadoso, não port linha a linha. Há também a lógica anti-loop documentada em
   `(common)/layout.tsx:29-34` e `admin/layout.tsx:26-30` que depende dessa ordem.
2. **`packages/auth` está profundamente entrelaçado**: 5 de 8 módulos são Next-only — `session.ts`
   (cookies() exclusivamente), `server.ts` (cookies() + redirect()), `provider.tsx` (`useRouter`),
   `middleware.ts` (`NextMiddleware`), e os componentes usam `next/link`. Só `client.ts`, `types.ts`,
   `keys.ts`, `redirect.ts`, `session-routes.ts` são limpos (`session-routes.ts` usa só `Request`/`Response` — bom sinal).
3. **Efeito colateral nos packages**: `packages/internationalization/server.ts` é `"use server"` + cookies();
   `packages/design-system/components/ui/responsive-image.tsx:4` importa `next/image` (e **`next` não está
   declarado** no `package.json` desse pacote — dependência fantasma via hoisting);
   `@repo/analytics` usa `@next/third-parties`; `@repo/security` está preso via `@arcjet/next` +
   `@nosecone/next`.

### `apps/web` → **ficar no Next** ✅

SEO é o produto aqui: `generateMetadata` nas 7 rotas com hreflang completo + `x-default`
(`apps/web/shared/lib/seo.ts:56-60`), `sitemap.ts` com alternates, `robots.ts`, JSON-LD
(Organization/WebSite/FAQPage). Trocar isso por um ecossistema que a própria Vercel descreve como tendo
"a structural gap" em cache de leitura e sem image optimization first-party é assumir risco de SEO sem
ganho compensatório.

**Mas:** hoje ela não colhe nada disso (§2). Corrigir o `cookies()` vem antes de qualquer decisão.

### `apps/email` → não-problema

`next` é devDependency só; é o preview server do React Email.

---

## 5. Ganhos disponíveis **sem migrar nada**

Ordenados por retorno/esforço. Vale fazer isso primeiro — em parte porque melhora o repo de qualquer
forma, em parte porque **é o teste honesto da hipótese**: se o app ficar bom depois disso, a migração era
sobre outra coisa.

1. **`apps/web`: usar `params.locale` em vez do cookie no `getDictionary()`.** Destrava SSG +
   `generateStaticParams` no site de marketing inteiro. É o maior ganho de performance do repo hoje e é um
   fix do lado do Next.
2. **Code-split dos dicionários.** `packages/internationalization/client.ts:3` manda os 3 idiomas para o
   browser; carregar só o ativo. Ganho de bundle imediato, risco zero.
3. **Tirar `"use client"` do chrome que não tem estado** (`Container`, `Footer`, partes do `Header`).
4. **Corrigir o import cross-app**: `apps/web/app/[locale]/layout.tsx:9` importa o `QueryProvider` de
   **dentro da `apps/app`**, enquanto `apps/web/shared/providers/query-provider.tsx` existe e não é usado.
   Isso quebraria qualquer split de app — arrumar antes de qualquer coisa.
5. **Limpeza de código morto**: os 2 middlewares não conectados, `apps/api/global-error.tsx` (tira o
   design-system da API), `apps/api/vercel.json` (cron diário apontando para `/cron/keep-alive`, **rota que
   não existe** → 404 por dia), `NEXT_RUNTIME` declarado e nunca lido.
6. **Skew de versão**: `packages/auth/package.json:24` pina `next: 15.1.3` contra `16.0.0` em todo o resto.
7. **Assimetria**: `entities/edit/[id]` tem prefetch + `loading.tsx`; `admin/users/edit/[id]` é client puro
   com nenhum dos dois.

---

## 6. Recomendação

**Não faça uma migração big-bang de "remover o Next".** O repo não tem um problema de Next — tem um
problema de credencial client-first (§1) mais uma pilha de superfície do Next paga e não usada (§2). O
segundo justifica mexer; o primeiro não é resolvido mexendo.

Sequência sugerida:

1. **Agora, sem migrar:** os 7 itens do §5. Baixo risco, ganho imediato, e re-mede a premissa.
2. **Depois, se quiser um piloto:** `apps/api` → Hono. É o de maior ganho e menor risco, valida o pipeline
   Vercel non-Next, e não toca em UI. Se der ruim, o `@repo/sdk` protege o front (contrato inalterado).
3. **Só então avaliar `apps/app` → TanStack Start**, com o gate honesto sendo: *o `proxy.ts` foi
   reprojetado como `beforeLoad` + middleware sem regressão no gate default-deny nem no anti-loop de
   role?* Se sim, o resto é trabalhoso mas mecânico. Fazer disso o **último** passo, não o primeiro.
4. **`apps/web` fica no Next.** Revisitar só se o Start ganhar image optimization first-party e um
   equivalente de ISR.

O framework a mais aqui não é o Next — é o `apps/api` ser um app Next com um `layout.tsx` vazio e um
`global-error.tsx` que importa um design system.

---

## Fontes

- [Announcing TanStack Start v1 (RC)](https://tanstack.com/blog/announcing-tanstack-start-v1) — TanStack Blog, 2025-09-23
- [TanStack Start Overview](https://tanstack.com/start/latest/docs/framework/react/overview)
- [Selective SSR](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr) · [Static Prerendering](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering) · [Server Routes](https://tanstack.com/start/latest/docs/framework/react/guide/server-routes) · [Middleware](https://tanstack.com/start/latest/docs/framework/react/guide/middleware)
- [TanStack Start on Vercel](https://vercel.com/docs/frameworks/full-stack/tanstack-start) — Vercel Docs, atualizado 2026-07-10
- [Choosing between TanStack Start and Next.js](https://vercel.com/i/tanstack-vs-next-js) — Vercel
- [Support for TanStack Start](https://vercel.com/changelog/support-for-tanstack-start) — Vercel Changelog
- [TanStack Query — Advanced SSR](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)
- [TanStack Start ISR in Vercel — Discussion #6369](https://github.com/TanStack/router/discussions/6369)
- [Vercel Image Optimization em TanStack Start](https://blog.ronanru.com/vercel-image-optimization-in-tanstack-start/)
- [TanStack Start authentication guide](https://workos.com/blog/tanstack-start-authentication-guide) — WorkOS
- npm: `@tanstack/react-start@1.168.48` / `next@16.3.1`; downloads via `api.npmjs.org/downloads/point/last-week`
