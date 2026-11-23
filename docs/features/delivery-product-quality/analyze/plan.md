# Plano: core aprovado na parte 3 da entrega, fatia 1 (o que um fork herda sem perceber)

- **Spec**: [`specs/delivery-product-quality.md`](../../../../specs/delivery-product-quality.md) (`status: approved`).
  Problema, evidência e corte são decisão de produto já tomada. Este plano responde ao *como*.
- **Escopo**: só a **fatia 1** da spec (linhas 99-107). As fatias 2 (Playwright mobile, Lighthouse, teste do
  sitemap) e 3 (título por tela, eventos de conversão) ficam fora, assim como tudo que a spec lista em "Fora do
  corte".
- **Modo**: rodada autônoma do `/cycle`. Nenhuma pergunta foi feita; as decisões estão em
  [Perguntas em aberto](#perguntas-em-aberto-decididas-por-padrão), cada uma com a alternativa descartada.
- **Medido em**: 2026-11-23, sobre `afb5b35` (PR #65 já no `main`), só leitura. Next instalado: `16.4.6`
  (`apps/web/node_modules/next/package.json:3`).

---

## Etapa 1: análise

### 1. Contexto

A parte 3 da etapa de entrega ([`docs/delivery/03-product-quality.md`](../../../delivery/03-product-quality.md))
cobra de todo fork itens que o core reprova hoje. A fatia 1 junta os quatro que o fork herda sem saber:

| # | Item do corte (spec) | Item da parte 3 | Estado medido neste checkout |
|---|----------------------|-----------------|------------------------------|
| 1 | `og:image` gerada da marca, por idioma, com `og:image:alt`; a arte do next-forge sai da `web` e da `api` | 3.6 | `apps/web/app/[locale]/opengraph-image.png` e `apps/api/app/opengraph-image.png`, idênticas (58 106 bytes, 1200 × 630). **Achado novo**: mesmo essa arte não chega às páginas. Ver abaixo |
| 2 | 404 da landing traduzido, com a marca e link para a home | 3.3 | a `apps/web` não tem `not-found.tsx`; o root layout é `app/[locale]/layout.tsx`, não existe `app/layout.tsx` |
| 3 | 404 da API em JSON com `error.code` | 3.3 | nenhuma rota coringa em `apps/api/app/`; rota inexistente cai na página 404 HTML do Next |
| 4 | `X-Robots-Tag: noindex` em toda resposta do `app` e da `api`; `noindex` em login e cadastro da landing, que saem do `Disallow` | 3.9 | `applySecurityHeaders` (`packages/security/middleware.ts:154-170`) não grava `X-Robots-Tag`; `apps/web/app/robots.ts:11` tem `disallow: ["/*/sign-in", "/*/sign-up"]` |

**Achado que muda o item 1: a `og:image` da landing não é emitida em página nenhuma hoje.** Lido no código do
Next 16.4.6: o arquivo `opengraph-image.*` do segmento `[locale]` entra na metadata daquele nível
(`next/dist/lib/metadata/metadata-resolution-primitives.js:113-122`, `mergeStaticMetadata`). Em seguida a página
filha exporta `openGraph` e o Next **substitui** o objeto inteiro (`:147`, `newResolvedMetadata.openGraph =
resolveOpenGraph(metadata.openGraph, …)`). As sete páginas da landing passam por `buildLocaleMetadata`
(`apps/web/shared/lib/seo.ts:45-69`), que sempre manda `openGraph.locale` (`:66-68`), então a imagem do layout
some. Trocar o PNG por um `opengraph-image.tsx` no mesmo lugar daria o mesmo resultado. A correção é a página
declarar `openGraph.images` ela mesma, e é o que este plano faz em `buildLocaleMetadata`. Confirmação por
medição fica para o `/test` (V1).

**Valor para o usuário (o fork):** o link colado no WhatsApp ou LinkedIn mostra a marca configurada; um
endereço quebrado na landing cai numa página no idioma do visitante com caminho de volta; a API responde 404 no
mesmo contrato das outras rotas; painel e API não aparecem no Google.

**Corte de MVP desta fatia**, sem nada a mais:

1. `apps/web/app/[locale]/opengraph-image.tsx` gerando a imagem com `next/og` (já vem no `next`, zero
   dependência nova), estática por idioma, e `buildLocaleMetadata` apontando `openGraph.images` para ela com
   `alt` traduzido. Os dois PNG do next-forge são apagados.
2. `apps/web/app/[locale]/not-found.tsx` + `apps/web/app/[locale]/[...rest]/page.tsx` + validação do segmento
   `[locale]` no root layout.
3. `apps/api/app/[[...path]]/route.ts` respondendo `404 { error: { code: "ROUTE_NOT_FOUND" } }`.
4. Opção `noIndex` em `applySecurityHeaders`, ligada no `app` e na `api`; `noindex` por metadata em
   `/sign-in` e `/sign-up` da landing; `robots.ts` sem os `Disallow`.

**Fora de escopo** (spec, "Fora do corte" e fatias 2 e 3): dieta do bundle da landing; copy de SEO; Lighthouse;
`error.tsx` por segmento; projeto `mobile` no Playwright; teste do sitemap e `lastModified`; `title.template` e
título por tela; eventos `sign_up`/`generate_lead`; imagem própria por página (a fatia entrega uma imagem por
idioma, a mesma para as sete páginas). Também fica fora: `robots.ts` no `app` (ver Q6), título na página 404 e
a marca no 404 do `app`, que a spec dá como entregue (`apps/app/app/not-found.tsx:1-5`).

**Pendência herdada do backlog, fechada de passagem:** o 🟡 do `/favicon.ico` da `web` que devolve a home
(`specs/BACKLOG.md:726`). Hoje `/favicon.ico` fica fora do matcher do proxy (`apps/web/proxy.ts:61`) e cai no
segmento `[locale]` com `locale = "favicon.ico"`, renderizando a home com 200. A validação do segmento (item 2)
faz esse pedido responder 404. Pelo mesmo caminho fecha o 🟢 de `GET /api` exato respondendo a home
(`specs/BACKLOG.md:1531`). Não entra arquivo `favicon.ico` novo (ver Q5). O O1 do backlog (`apps/app`,
`/favicon-novo.png` mandando ao login, `specs/BACKLOG.md:892`) é do `app` e **continua aberto**: o `app` tem
`app/layout.tsx` e outro desenho de roteamento.

### 1.1 Fontes

| Fonte | Lida? | Uso |
|-------|-------|-----|
| `specs/delivery-product-quality.md` | sim, inteira | corte, riscos, sinais de pronto, perguntas da spec |
| `docs/delivery/03-product-quality.md` §3.3, §3.6, §3.9 | sim | critério de aprovado de cada item |
| `specs/BACKLOG.md:202-235`, `:726`, `:892`, `:1531` | sim | notas da auditoria, pendências do favicon e do `/api` |
| `.claude/cycle-policy.md` | sim | regra de decisão, modo degradado, nenhuma dependência nova |
| Docs do Next embarcadas (`node_modules/next/dist/docs/…/opengraph-image.md`, `not-found.md`) | sim | `generateStaticParams` em rota de imagem, `global-not-found` (experimental), `noindex` automático no 404 |
| Código do Next 16.4.6 (`metadata-resolution-primitives.js`, `next-metadata-route-loader.js:40-44,189-201`, `get-metadata-route.js:64-81`) | sim | merge de `openGraph`, reexport de `generateStaticParams`, URL sem sufixo de hash fora de grupo |
| Validadores de Open Graph (opengraph.xyz, Meta, LinkedIn) | não | exigem a landing publicada; ficam 🔒 no `/test` |

---

### 2. Dados (Firestore)

N/A. Nenhuma coleção, campo ou consulta.

### 3. Contrato `@repo/sdk`

N/A. Nenhuma action nova. A rota coringa não tem action: existe para quem chama um caminho errado, e o SDK só
chama caminhos que existem. O código `ROUTE_NOT_FOUND` ainda assim entra em `apiErrors`, para que um fork que
erre um caminho veja texto traduzido e não o código cru.

### 4. API (`apps/api`)

| Rota | Métodos | Guard | Resposta |
|------|---------|-------|----------|
| `apps/api/app/[[...path]]/route.ts` (novo) | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` (o `HEAD` o Next implementa a partir do `GET`; `OPTIONS` o proxy responde antes, `apps/api/proxy.ts:191-198`) | nenhum: não há recurso a proteger | `404` `{ "error": { "code": "ROUTE_NOT_FOUND" } }`, `application/json` |

- Catch-all **opcional** para cobrir também `/`, que hoje não tem rota. A API não tem `app/page.tsx` nem
  `app/route.ts`, então não há conflito de especificidade. Rotas concretas e dinâmicas de `(routes)/`
  (`entities/[id]`, …) e os metadados (`icon.png`, `apple-icon.png`) são mais específicos e continuam vencendo.
- Fica fora do grupo `(routes)`: não é um recurso, é o fallback.
- `export const dynamic = "force-dynamic"`, como `health/route.ts:1-3`, para o build não tentar pré-renderizar
  uma resposta 404.
- O proxy continua aplicando CORS, `x-request-id`, cabeçalhos de segurança e orçamento de taxa (um `POST` num
  caminho inexistente conta no orçamento `standard`, `apps/api/proxy.ts:115`, o que é desejável).
- **Código de erro novo**: `ROUTE_NOT_FOUND` → `404`. Entradas em `apiErrors` nos 3 idiomas.
- Fora: método não suportado numa rota que existe (`PUT /health`) continua `405` do Next, sem corpo JSON. Vai
  como achado para o `/spec --sync` (§13), não para esta fatia.
- `apps/api/app/opengraph-image.png` é apagado. Sem ele, `GET /opengraph-image.png` passa a responder o 404 em
  JSON.

### 5. Front-end

**`apps/web`** (todas as mudanças de UI da fatia):

| Arquivo | Mudança |
|---------|---------|
| `app/[locale]/opengraph-image.tsx` (novo) | `ImageResponse` de `next/og`, 1200 × 630, `generateStaticParams` com os 3 idiomas (o loader reexporta, `next-metadata-route-loader.js:40-44,198`), então sai no build como 3 PNG estáticos. Server, sem `"use client"` |
| `app/[locale]/opengraph-image.png` | apagado (o Next não aceita os dois no mesmo segmento) |
| `shared/lib/openGraph.ts` (novo) | lógica pura: `OPEN_GRAPH_IMAGE_SIZE`, `openGraphImageUrl(locale)`, `resolveOpenGraphCard(locale)` (marca, frase e `alt` a partir do dicionário) e `loadBrandLogo(url)` (busca o logo com timeout e devolve data URL ou `null`) |
| `shared/lib/seo.ts:45-69` | `buildLocaleMetadata` passa `openGraph.images` (URL absoluta, 1200 × 630, `alt` traduzido) e aceita `indexable?: boolean` (padrão `true`); `false` gera `robots: { index: false, follow: true }` |
| `app/[locale]/sign-in/page.tsx:8-12`, `sign-up/page.tsx:8-12` | `indexable: false` |
| `app/robots.ts:7-12` | remove `disallow`; mantém `allow: "/"` e `sitemap` |
| `app/[locale]/not-found.tsx` (novo) | Server Component, dentro do root layout (com `Header` e `Footer`, logo a marca aparece no topo, `components/header/index.tsx:212-232`). Card com título, descrição e link para `/${locale}`, no padrão do `NotFoundPage` do app (`apps/app/shared/components/ui/NotFoundPage.tsx:15-49`) |
| `app/[locale]/[...rest]/page.tsx` (novo) | chama `notFound()`. Sem ele, um caminho desconhecido com idioma válido (`/pt-br/xyz`) não passa pelo `not-found.tsx` do segmento, porque o root layout está sob `[locale]` e não existe `app/not-found.tsx` |
| `shared/lib/localeSegment.ts` (novo) | `ensureSupportedLocale(value): Locale`, que chama `notFound()` quando o valor não está em `locales` |
| `app/[locale]/layout.tsx:17-25` | recebe `params`, chama `ensureSupportedLocale` antes de qualquer outra coisa |
| `proxy.ts:95-99`, `:102-106` | só a assinatura nova: `{ reportOnly: REPORT_ONLY }`. **Sem** `noIndex` |

Renderização: tudo Server Component. A imagem não lê `headers()`/`cookies()` (usa `globalTranslations[locale]`
pelo parâmetro da rota, não `getDictionary()`), então continua estática.

**`apps/app`**: só `proxy.ts:200` e `:203` passam `{ noIndex: true }`. Nenhuma tela muda.

### 5.4 i18n e a11y

| Chave | Onde | Uso |
|-------|------|-----|
| `apps.web.pages.notFound.{title, description, goHome}` | `translations/apps/web/pages/notFound/index.ts` (novo) + `pages/index.ts` | página 404 da landing |
| `apps.web.openGraph.imageAlt` | `translations/apps/web/openGraph.ts` (novo) + `apps/web/index.ts` | `og:image:alt`, com `{brand}` e `{tagline}` |
| `packages.shared.utils.apiErrors.ROUTE_NOT_FOUND` | `translations/packages/shared/utils.ts` (3 blocos: `:7`, `:191`, `:373`) | texto do 404 da API |

A11y: o 404 tem um `h1` (via `CardTitle`, como no app), um único link com texto, e o Next injeta
`<meta name="robots" content="noindex">` no 404 sozinho (`not-found.md`, seção `not-found.js`). A imagem social
tem `alt` traduzido. Contraste do card na imagem: texto `#0a0a0a` e `#525252` sobre `#ffffff`, ambos acima de
4,5:1.

### 6. Autorização e segurança

- **Risco principal da spec**: `noindex` na landing tira o site do Google. Mitigação em três camadas: o padrão
  de `applySecurityHeaders` é **sem** `X-Robots-Tag`; só `apps/app/proxy.ts` e `apps/api/proxy.ts` ligam a
  opção; e um teste da `web` afirma a ausência do cabeçalho na página e em `/api/*`.
- `X-Robots-Tag: noindex` sai em toda resposta que passa pelos proxies do `app` (matcher
  `apps/app/proxy.ts:127`, inclusive redirects para o login e `/api/*`) e da `api` (matcher `"/:path*"`,
  `apps/api/proxy.ts:238-240`, inclusive recusa de origem, 429 e preflight). Arquivos fora do matcher do `app`
  (`_next/static`, `_next/image`, `favicon.ico`) ficam sem o cabeçalho, e não precisam dele.
- `X-Robots-Tag` não é segredo e não muda CSP nem CORS. Impersonação: N/A.
- A rota coringa da API não lê corpo, não toca em Firestore e não tem guard: não há o que vazar.
- `loadBrandLogo` busca uma URL que já passou por `toHttpsUrl` (`packages/next-config/brand.ts:30-46`: só
  `https:`, ou `http:` em loopback, e host sem caractere especial) e roda **no build**, não por requisição de
  visitante. Timeout de 3 s e aceitação só de `image/png`, `image/jpeg` e `image/svg+xml`; qualquer falha vira
  monograma.

### 7. Testes (Vitest)

Todos no nível mais barato. Nenhum exige emulador nem app de pé.

| # | Arquivo | Nível | Prova |
|---|---------|-------|-------|
| T1 | `packages/security/__tests__/csp.test.ts` (estender) | unit | `noIndex: true` grava `x-robots-tag: noindex`; sem a opção, o cabeçalho não existe; `reportOnly` pelo objeto continua trocando para `content-security-policy-report-only` (os três `headersFor(…, true)` de `:194`, `:208`, `:228` passam a usar o objeto) |
| T2 | `apps/app/__tests__/securityHeaders.test.ts` (estender) | proxy com mocks já existentes | página, redirect ao login e `/api/auth/session` saem com `x-robots-tag: noindex` |
| T3 | `apps/web/__tests__/securityHeaders.test.ts` (estender) | proxy | `/pt-br` e `/api/auth/session` saem **sem** `x-robots-tag` (é o teste que a spec exige em "Riscos") |
| T4 | `apps/api/__tests__/requestId.test.ts` ou novo `apiRobotsHeader.test.ts` | proxy | resposta liberada, recusa de origem, preflight e 429 levam `x-robots-tag: noindex` |
| T5 | `apps/api/__tests__/routeNotFound.test.ts` (novo) | rota | cada método exportado devolve 404, `content-type` JSON e `{ error: { code: "ROUTE_NOT_FOUND" } }`; `dynamic === "force-dynamic"` |
| T6 | `apps/web/__tests__/seo.test.ts` (estender) | unit | `openGraph.images[0]` com URL absoluta `${base}/${locale}/opengraph-image`, 1200 × 630 e `alt` no idioma; idioma não suportado cai no padrão; `indexable: false` gera `robots.index === false`; sem a opção, `robots` não existe |
| T7 | `apps/web/__tests__/openGraph.test.ts` (novo) | unit, `fetch` por `vi.stubGlobal` | `resolveOpenGraphCard` lê marca e frase do dicionário nos 3 idiomas e corta a frase em 160 caracteres; `loadBrandLogo` devolve `null` sem URL, com `fetch` rejeitado, com status ≠ 200 e com `content-type` não aceito, e data URL com PNG; `generateStaticParams`, `size` e `contentType` da rota |
| T8 | `apps/web/__tests__/robots.test.ts` (novo) | unit | sem `disallow`, `allow: "/"`, `sitemap` absoluto |
| T9 | `apps/web/__tests__/notFoundPage.test.tsx` (novo) | `renderToStaticMarkup`, como `pricingPage.test.tsx` | título, descrição e texto do link nos 3 idiomas; `href` é `/${locale}`; um único link |
| T10 | `apps/web/__tests__/localeSegment.test.ts` (novo) | unit, `next/navigation` mockado | `ensureSupportedLocale` devolve o idioma válido e chama `notFound()` para `favicon.ico`, `api` e `""`; a página `[...rest]` chama `notFound()` |
| T11 | `packages/internationalization/__tests__/parity.test.ts` | existente | paridade das chaves novas, sem mudança no teste |

Fora do Vitest de propósito: renderizar o PNG com `ImageResponse` (resvg em WASM) e o 404 real do Next. Os dois
são comportamento de runtime e o `/test` mede com `curl` e `file` num build de produção.

### 8. O que o `/test` vai percorrer

Contra `pnpm --filter <app> build && start` (o comportamento do 404 e da rota estática de imagem tem de ser o de
produção, não o do `next dev`; política §4).

**Sem navegador** (`curl`):

| # | Medida | Esperado |
|---|--------|----------|
| V1 | `curl -s $WEB/pt-br \| grep -oE '<meta (property\|name)="(og\|twitter):image[^>]*>'` nas 7 páginas e nos 3 idiomas | `og:image` absoluto apontando `/<idioma>/opengraph-image`, `og:image:width` 1200, `og:image:height` 630, `og:image:alt` no idioma, `twitter:image` igual |
| V2 | `curl -s -o /tmp/og-<idioma>.png $WEB/<idioma>/opengraph-image && file … && ls -l …` | PNG 1200 × 630, < 300 KB, para os 3 idiomas; a saída de `next build` lista as 3 rotas como estáticas |
| V3 | idem com `NEXT_PUBLIC_APP_LOGO_URL` vazio e com uma URL que não responde | build passa nos dois casos; imagem com monograma |
| V4 | `curl -si $API/esta-rota-nao-existe`, `-X POST`, `-X DELETE`, `curl -sI`, e `$API/` | `404`, `content-type: application/json`, corpo `{"error":{"code":"ROUTE_NOT_FOUND"}}` (no `HEAD`, só status e cabeçalhos) |
| V5 | `curl -sI $API/health`, `$APP/pt-br/sign-in`, `$APP/pt-br/entities` (sem sessão, redirect), `$APP/api/auth/session` | `x-robots-tag: noindex` em todos |
| V6 | `curl -sI $WEB/pt-br`, `$WEB/pt-br/sign-in`, `$WEB/api/auth/session`, `$WEB/pt-br/opengraph-image` | **nenhum** `x-robots-tag` |
| V7 | `curl -s $WEB/pt-br/sign-in \| grep robots` e `curl -s $WEB/robots.txt` | `<meta name="robots" content="noindex, follow">` em sign-in e sign-up; `robots.txt` sem `Disallow` |
| V8 | `curl -s -o /dev/null -w '%{http_code}' $WEB/pt-br/esta-pagina-nao-existe`, `/en/a/b/c`, `/es/legal/nao-existe`, `/favicon.ico`, `/api` | `404` em todos (hoje `/favicon.ico` e `/api` dão 200 com a home) |
| V9 | `curl -s $WEB/pt-br` e `$WEB/pt-br/pricing` | 200 sem regressão: a validação do layout não derruba página válida |

**Com `agent-browser`** (uma passada, light + dark + mobile 390 px, 3 idiomas):

- `/<idioma>/esta-pagina-nao-existe`: o 404 renderiza dentro do layout (header com a marca e o seletor de
  idioma, footer), título e descrição no idioma da URL, botão leva para `/<idioma>`. Checar contraste do card
  no dark e que nada corta no celular.
- `/<idioma>/opengraph-image` aberto direto no navegador nos 3 idiomas: marca, logo ou monograma e a frase do
  idioma, sem a arte do next-forge.
- O 404 de idioma inválido (`/favicon.ico`) é a página padrão do Next, sem layout. É esperado; só confirmar o
  status.

**Não observável sem infra externa** (vira 🔒, não reprova): colar a URL num validador de Open Graph
(opengraph.xyz, Sharing Debugger da Meta, Post Inspector do LinkedIn), que exige a landing publicada num
domínio; `noindex` nas previews da Vercel (ver §11).

### 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **A landing publica uma `og:image` da marca em todas as páginas**
  As sete páginas públicas da landing (home, preços, contato, privacidade, termos, login e cadastro), nos três
  idiomas, emitem `og:image` com URL absoluta para `/<idioma>/opengraph-image`, mais `og:image:width` 1200,
  `og:image:height` 630 e `og:image:alt`. O `twitter:image` sai igual, porque o Next copia a imagem do Open
  Graph quando o cartão do X não declara a sua. Antes desta mudança nenhuma página emitia `og:image`, porque o
  `openGraph` da página substituía o do layout.

- [ ] **A imagem é gerada por código, com marca e frase do idioma**
  `GET /<idioma>/opengraph-image` responde um PNG de 1200 × 630, abaixo de 300 KB, com o nome de
  `NEXT_PUBLIC_APP_NAME` (ou `next-boilerplate` quando vazio), o logo de `NEXT_PUBLIC_APP_LOGO_URL` e a frase
  de `apps.web.pages.home.meta.description` daquele idioma, cortada em 160 caracteres com reticências. As três
  imagens saem no build como rotas estáticas, sem custo de função por compartilhamento. A arte do next-forge
  (que cita Prisma e PlanetScale) não existe mais em `apps/web` nem em `apps/api`.

- [ ] **A imagem degrada sem logo e com logo inacessível**
  Sem `NEXT_PUBLIC_APP_LOGO_URL`, com uma URL que não responde em 3 s, com status diferente de 200 ou com um
  formato fora de PNG, JPEG e SVG, a imagem sai com um monograma (a inicial da marca num quadrado) no lugar do
  logo. Em nenhum desses casos o build falha ou a rota responde 500. Nenhuma variável de ambiente nova é
  necessária.

- [ ] **O `og:image:alt` está no idioma da página**
  O texto alternativo vem de `apps.web.openGraph.imageAlt` com `{brand}` e `{tagline}` substituídos, nos três
  idiomas. Um idioma não suportado passado a `buildLocaleMetadata` cai no idioma padrão, sem lançar erro.

- [ ] **O 404 da landing é traduzido e tem caminho de volta**
  `/<idioma>/qualquer-coisa`, inclusive com mais de um nível (`/en/a/b/c`) e dentro de seções existentes
  (`/es/legal/nao-existe`), responde 404 e renderiza dentro do layout da landing: header com a marca, footer,
  título "Página não encontrada" (ou equivalente em inglês e espanhol), uma descrição e um único link para
  `/<idioma>`. O Next acrescenta `noindex` à página sozinho. Precisa funcionar em light, dark e celular sem
  texto cortado.

- [ ] **Idioma inválido no primeiro segmento responde 404**
  `/favicon.ico` e `/api` (exato), que hoje respondem 200 com o HTML da home, passam a responder 404. A página
  nesse caso é a padrão do Next, sem layout, porque o root layout é o próprio segmento recusado. As páginas
  válidas (`/pt-br`, `/en/pricing`, `/es/contact`) continuam 200.

- [ ] **A API responde 404 em JSON para rota inexistente**
  `GET`, `POST`, `PUT`, `PATCH` e `DELETE` em qualquer caminho que não exista, inclusive `/` e um subcaminho
  de rota dinâmica sem handler, respondem `404` com `content-type: application/json` e
  `{ "error": { "code": "ROUTE_NOT_FOUND" } }`. `HEAD` responde 404 sem corpo. A resposta continua com CORS,
  `x-request-id` e cabeçalhos de segurança. O código tem texto em `apiErrors` nos três idiomas. Um método não
  suportado numa rota que existe continua `405` (fora desta fatia).

- [ ] **Painel e API saem do índice por cabeçalho**
  Toda resposta do `app` que passa pelo proxy (páginas, redirect ao login, `/api/auth/*`) e toda resposta da
  `api` (inclusive recusa de origem, 429 e preflight) leva `x-robots-tag: noindex`. Não é preciso estar logado
  para ver o cabeçalho.

- [ ] **A landing nunca recebe `X-Robots-Tag`**
  Nenhuma resposta da `web` (páginas, `/api/auth/*`, a rota da imagem, o 404) leva `x-robots-tag`. Um teste
  automatizado afirma essa ausência, porque o erro aqui tira o site inteiro da busca e só aparece semanas
  depois.

- [ ] **Login e cadastro da landing saem do índice sem bloquear o rastreador**
  `/<idioma>/sign-in` e `/<idioma>/sign-up` emitem `<meta name="robots" content="noindex, follow">` nos três
  idiomas, e o `robots.txt` da landing não tem mais `Disallow` para eles (o Google precisa ler a página para ver
  o `noindex`). As demais páginas não emitem `robots` e continuam indexáveis; o `robots.txt` mantém
  `Allow: /` e o `Sitemap:`.

- [ ] **Nada muda no SDK nem nos dados**
  Nenhuma action, DTO, coleção ou variável de ambiente nova. `pnpm turbo run lint typecheck test` passa, e o
  `pnpm e2e` existente continua verde.

---

## Etapa 2: blueprint técnico

### 10.1 `packages/security/middleware.ts`

Pseudo-diff (o padrão continua indexável; só quem liga a opção recebe o cabeçalho):

```ts
 const PERMISSIONS_POLICY_HEADER = "permissions-policy";
+const ROBOTS_HEADER = "x-robots-tag";
+
+/** Keeps a response out of search results while still letting crawlers read it. */
+export const ROBOTS_NOINDEX = "noindex";
+
+export type ApplySecurityHeadersFlags = {
+    /** Sends CSP as report-only, for a surface where a wrong policy must not blank the page. */
+    reportOnly?: boolean;
+    /** Only for surfaces that must never be indexed: a wrong value takes a public site off search. */
+    noIndex?: boolean;
+};

 export function applySecurityHeaders<T extends Response>(
     response: T,
     options: Options,
-    reportOnly = false
+    { reportOnly = false, noIndex = false }: ApplySecurityHeadersFlags = {}
 ): T {
     …
     response.headers.set(PERMISSIONS_POLICY_HEADER, PERMISSIONS_POLICY);
+
+    if (noIndex) {
+        response.headers.set(ROBOTS_HEADER, ROBOTS_NOINDEX);
+    }

     return response;
 }
```

Chamadas a ajustar (todas conferidas neste checkout):

| Arquivo | Linha | Novo |
|---------|-------|------|
| `apps/web/proxy.ts` | `:95-99`, `:102-106` | `applySecurityHeaders(…, securityOptions, { reportOnly: REPORT_ONLY })` |
| `apps/app/proxy.ts` | `:200`, `:203` | `applySecurityHeaders(…, securityOptions, { noIndex: true })` |
| `apps/api/proxy.ts` | `:137-139` (`withSecurityHeaders`) | `applySecurityHeaders(response, securityOptions, { noIndex: true })` |
| `packages/security/__tests__/csp.test.ts` | `:20-23` (`headersFor`) | aceita e repassa `{ reportOnly }` |

Os comentários de JSDoc acima explicam a regra (o porquê), não o fluxo; não citar plano nem etapa.

### 10.2 `apps/api/app/[[...path]]/route.ts` (novo)

```ts
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const routeNotFound = () =>
    NextResponse.json(
        { error: { code: "ROUTE_NOT_FOUND" } },
        { status: HTTP_STATUS.NOT_FOUND }
    );

export const GET = routeNotFound;
export const POST = routeNotFound;
export const PUT = routeNotFound;
export const PATCH = routeNotFound;
export const DELETE = routeNotFound;
```

| `error.code` | Status | Quando |
|--------------|--------|--------|
| `ROUTE_NOT_FOUND` | 404 | caminho sem rota, em qualquer método exceto `OPTIONS` |

Resposta de exemplo:

```http
HTTP/1.1 404 Not Found
content-type: application/json
x-request-id: 3f0c…
x-robots-tag: noindex

{"error":{"code":"ROUTE_NOT_FOUND"}}
```

Também: `git rm apps/api/app/opengraph-image.png`.

### 10.3 `og:image` da landing

Árvore:

```
apps/web/
  app/[locale]/opengraph-image.tsx   (novo; substitui opengraph-image.png, apagado)
  shared/lib/openGraph.ts            (novo)
  shared/lib/seo.ts                  (altera buildLocaleMetadata)
```

`apps/web/shared/lib/openGraph.ts`:

```ts
import { type Locale, resolveLocale } from "@repo/internationalization/utils";
import { globalTranslations } from "@repo/internationalization/translations/global";
import { getBrand } from "@repo/next-config/brand";
import { getWebBaseUrl } from "@/shared/lib/seo";

export const OPEN_GRAPH_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export const OPEN_GRAPH_TAGLINE_MAX_LENGTH = 160;
const LOGO_TIMEOUT_MS = 3000;
const SUPPORTED_LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

export type OpenGraphCard = {
    brandName: string;
    logoUrl: string | null;
    tagline: string;
    alt: string;
};

export function openGraphImageUrl(locale: Locale): string {
    return `${getWebBaseUrl()}/${locale}/opengraph-image`;
}

export function resolveOpenGraphCard(value: string): OpenGraphCard {
    const locale = resolveLocale(value);
    const dictionary = globalTranslations[locale];
    const brand = getBrand();
    const tagline = truncate(dictionary.apps.web.pages.home.meta.description, OPEN_GRAPH_TAGLINE_MAX_LENGTH);
    return {
        brandName: brand.name,
        logoUrl: brand.logoUrl,
        tagline,
        alt: dictionary.apps.web.openGraph.imageAlt
            .replace("{brand}", brand.name)
            .replace("{tagline}", tagline),
    };
}

export async function loadBrandLogo(url: string | null): Promise<string | null> {
    if (!url) return null;
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(LOGO_TIMEOUT_MS) });
        const type = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
        if (!response.ok || !SUPPORTED_LOGO_TYPES.includes(type)) return null;
        const bytes = Buffer.from(await response.arrayBuffer()).toString("base64");
        return `data:${type};base64,${bytes}`;
    } catch {
        return null;
    }
}
```

`truncate` corta na última palavra antes do limite e acrescenta `…`. Atenção ao import circular: `seo.ts`
passa a importar `openGraph.ts`, e `openGraph.ts` precisa de `getWebBaseUrl`. Para evitar o ciclo, mover
`openGraphImageUrl` para `seo.ts` ou passar a base como argumento; o `/develop` escolhe, mantendo `getWebBaseUrl`
onde está (os testes de `seo.test.ts:18-57` dependem dele ali).

`apps/web/app/[locale]/opengraph-image.tsx` (esqueleto; estilos inline porque o Satori não lê Tailwind nem
`var()`, e todo `div` com mais de um filho precisa de `display: "flex"`):

```tsx
import { locales } from "@repo/internationalization/utils";
import { ImageResponse } from "next/og";
import { loadBrandLogo, OPEN_GRAPH_IMAGE_SIZE, resolveOpenGraphCard } from "@/shared/lib/openGraph";

export const size = OPEN_GRAPH_IMAGE_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
    return locales.map((locale) => ({ locale }));
}

export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const card = resolveOpenGraphCard(locale);
    const logo = await loadBrandLogo(card.logoUrl);

    return new ImageResponse(
        (
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center",
                          width: "100%", height: "100%", padding: 96, gap: 40,
                          background: CARD_COLORS.background }}>
                <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
                    {logo ? <img alt="" height={112} src={logo} width={112} />
                          : <Monogram letter={card.brandName.charAt(0).toUpperCase()} />}
                    <span style={{ fontSize: 72, color: CARD_COLORS.foreground }}>{card.brandName}</span>
                </div>
                <span style={{ fontSize: 40, lineHeight: 1.3, color: CARD_COLORS.muted }}>{card.tagline}</span>
            </div>
        ),
        size
    );
}
```

- `CARD_COLORS`: `background #ffffff`, `foreground #0a0a0a`, `muted #525252`, `monogram #171717` com letra
  branca. São cópias em hex dos tokens claros de `packages/design-system/styles/globals.css:10-21`, pelo mesmo
  motivo que o `antdSeedColors` existe (`packages/design-system/providers/antd-app.tsx:20-35`): o renderizador
  não entende `oklch()` nem `var()`. Não importar `antdSeedColors`: o módulo é `"use client"` e numa rota de
  servidor o import vira referência de cliente, não valor. Um comentário curto no código diz isso (é restrição
  externa, uma das exceções da regra de comentários).
- Fonte: a padrão do `next/og` (Geist Regular, embarcada em
  `next/dist/compiled/@vercel/og/Geist-Regular.ttf`), que cobre os acentos de pt-br e es. Nenhum download de
  fonte. Hierarquia por tamanho, não por peso.
- **Não** exportar `alt` da rota: ele seria um valor só para os três idiomas. O `alt` por idioma vem da
  metadata da página (10.4).

### 10.4 `apps/web/shared/lib/seo.ts`

```ts
 type PageMeta = { title: string; description: string; image?: string };

 export function buildLocaleMetadata({
     meta,
     locale,
     path = "",
+    indexable = true,
 }: {
     meta: PageMeta;
     locale: string;
     path?: string;
+    indexable?: boolean;
 }): Metadata {
+    const card = resolveOpenGraphCard(locale);
     …
     return createMetadata({
         ...meta,
         alternates: { … },
         openGraph: {
             locale: OG_LOCALES[locale] ?? "en_US",
+            images: [
+                {
+                    url: openGraphImageUrl(resolveLocale(locale)),
+                    ...OPEN_GRAPH_IMAGE_SIZE,
+                    alt: card.alt,
+                },
+            ],
         },
+        ...(indexable ? {} : { robots: { index: false, follow: true } }),
     });
 }
```

- `createMetadata` (`packages/seo/metadata.ts:78`) faz `merge(defaultMetadata, properties)`, e o padrão não
  tem `images`, então o array entra inteiro. **`packages/seo` não muda.** O parâmetro `image` dele
  (`:80-88`) usa o título como `alt`, o que não serve aqui; deixá-lo como está para a "imagem por página" de
  uma fatia futura.
- URL absoluta a partir de `getWebBaseUrl()` (mesma origem do sitemap e do JSON-LD), em vez de URL relativa
  com `metadataBase`, que hoje só lê `VERCEL_PROJECT_PRODUCTION_URL` (`packages/seo/metadata.ts:13-31`).
- Sem o sufixo `?<hash>` que o Next põe nas imagens por arquivo: a URL é estável. Quando o fork trocar a
  marca, o cache dos validadores se limpa pedindo nova coleta neles (anotado em §11).

Sign-in e sign-up:

```ts
     return buildLocaleMetadata({
         meta: dictionary.apps.web.pages.signIn.meta,
         locale,
         path: "/sign-in",
+        indexable: false,
     });
```

`apps/web/app/robots.ts`:

```ts
     rules: {
         userAgent: "*",
         allow: "/",
-        // Auth pages have no SEO value across locales.
-        disallow: ["/*/sign-in", "/*/sign-up"],
     },
```

### 10.5 404 da landing

Árvore:

```
apps/web/
  app/[locale]/layout.tsx            (valida o segmento)
  app/[locale]/not-found.tsx         (novo)
  app/[locale]/[...rest]/page.tsx    (novo)
  shared/lib/localeSegment.ts        (novo)
```

```ts
// shared/lib/localeSegment.ts
import { type Locale, locales } from "@repo/internationalization/utils";
import { notFound } from "next/navigation";

export function ensureSupportedLocale(value: string): Locale {
    if (!locales.includes(value as Locale)) {
        notFound();
    }
    return value as Locale;
}
```

```tsx
// app/[locale]/[...rest]/page.tsx
import { notFound } from "next/navigation";

export default function UnmatchedPath() {
    notFound();
}
```

```tsx
// app/[locale]/layout.tsx
 type RootLayoutProperties = {
     readonly children: ReactNode;
+    readonly params: Promise<{ locale: string }>;
 };

-const RootLayout = async ({ children }: RootLayoutProperties) => {
+const RootLayout = async ({ children, params }: RootLayoutProperties) => {
+    ensureSupportedLocale((await params).locale);
     const [{ locale }, consent] = await Promise.all([…]);
```

`app/[locale]/not-found.tsx`: Server Component, `getDictionary()` (o idioma vem do cabeçalho que o proxy grava,
`apps/web/proxy.ts:146-148`), `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardFooter` e
`buttonVariants({ size: "lg" })` num `Link` com ícone e rótulo dentro de um `span`, como em
`apps/app/shared/components/ui/NotFoundPage.tsx:20-48`. Diferenças: `href` é `/${locale}` (a landing não tem
painel a resolver) e o contêiner usa `min-h-[60vh]` em vez de `min-h-screen`, porque header e footer já ocupam
a tela. Nome do export: `NotFound` (componente React, PascalCase; arquivo segue a convenção do Next).

Comportamento esperado por caminho:

| Caminho | Quem decide | Resultado |
|---------|-------------|-----------|
| `/pt-br/xyz`, `/en/a/b/c`, `/es/legal/nao-existe` | `[...rest]` → `notFound()` | 404 com `not-found.tsx` dentro do layout |
| `/favicon.ico`, `/api` | layout → `ensureSupportedLocale` → `notFound()` | 404, página padrão do Next (sem layout). Lido no código: `app-render.js:2506-2509` põe o status do erro de acesso na resposta mesmo quando o erro vem do root layout. Medir no `/test` (V8) |
| `/xyz` (sem idioma, passando pelo proxy) | proxy | redirect para `/pt-br/xyz` → 404 traduzido (sem mudança no proxy) |
| `/pt-br/opengraph-image`, `/pt-br/icon.png`, `/sitemap.xml`, `/robots.txt`, `/api/auth/session` | rotas mais específicas | sem mudança |

Plano B, se o V8 mostrar 500 ou 200 no idioma inválido: `generateStaticParams` + `export const dynamicParams =
false` no layout. Não é o padrão porque muda como o build trata as sete páginas (que leem `headers()`) e tem
raio maior.

### 10.6 i18n

```ts
// translations/apps/web/pages/notFound/index.ts (novo)
export const notFoundTranslations = {
    "pt-br": {
        title: "Página não encontrada",
        description: "O endereço que você abriu não existe ou mudou de lugar.",
        goHome: "Voltar para o início",
    },
    en: {
        title: "Page not found",
        description: "The address you opened does not exist or has moved.",
        goHome: "Back to home",
    },
    es: {
        title: "Página no encontrada",
        description: "La dirección que abriste no existe o cambió de lugar.",
        goHome: "Volver al inicio",
    },
};

// translations/apps/web/openGraph.ts (novo), plugado em apps/web/index.ts ao lado de `pages`
export const openGraphTranslations = {
    "pt-br": { imageAlt: "Cartão de apresentação de {brand}: {tagline}" },
    en: { imageAlt: "{brand} preview card: {tagline}" },
    es: { imageAlt: "Tarjeta de presentación de {brand}: {tagline}" },
};

// translations/packages/shared/utils.ts, dentro de apiErrors nos três blocos
ROUTE_NOT_FOUND: "Este endereço não existe na API.",      // pt-br
ROUTE_NOT_FOUND: "This API route does not exist.",          // en
ROUTE_NOT_FOUND: "Esta ruta de la API no existe.",          // es
```

`notFound` entra em `translations/apps/web/pages/index.ts` nos três blocos, como `error` (`:27`, `:41`, `:55`).
Usar a skill `/i18n-sync`.

### 10.7 Documentação

| Arquivo | Mudança |
|---------|---------|
| `docs/FORKING.md:157` e `:571` | `opengraph-image.png` vira `opengraph-image.tsx`, gerada de `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_LOGO_URL` e da frase `apps.web.pages.home.meta.description`; o fork troca a copy, não a imagem |
| `docs/SECURITY.md:139-145` | parágrafo sobre `X-Robots-Tag: noindex` no `app` e na `api`, pela opção `noIndex` de `applySecurityHeaders`, e por que a landing não recebe |

`docs/delivery/03-product-quality.md` não muda: os comandos de §3.3, §3.6 e §3.9 já medem o que esta fatia
entrega.

### 10.8 Ordem de implementação e de commit

Sem SDK. Um commit por pacote/app, na ordem da regra. O typecheck intermediário da `web` só fecha depois do
commit de i18n; é a ordem que `.claude/rules/git-commits.md` manda.

| # | Commit | Arquivos |
|---|--------|----------|
| 1 | `feat(security): add a noindex option to the security headers` | `packages/security/middleware.ts`, `packages/security/__tests__/csp.test.ts` |
| 2 | `feat(api): answer unknown routes with a JSON 404` | `apps/api/app/[[...path]]/route.ts`, `apps/api/__tests__/routeNotFound.test.ts` |
| 3 | `feat(api): keep api responses out of search indexes` | `apps/api/proxy.ts`, teste T4 |
| 4 | `chore(api): drop the unused next-forge share image` | `apps/api/app/opengraph-image.png` (remoção) |
| 5 | `feat(app): keep panel responses out of search indexes` | `apps/app/proxy.ts`, `apps/app/__tests__/securityHeaders.test.ts` |
| 6 | `feat(web): generate the share image from the brand` | `apps/web/app/[locale]/opengraph-image.tsx`, remoção do `.png`, `shared/lib/openGraph.ts`, `shared/lib/seo.ts`, testes T6 e T7 |
| 7 | `feat(web): noindex the auth pages instead of disallowing them` | `sign-in/page.tsx`, `sign-up/page.tsx`, `robots.ts`, `proxy.ts`, testes T3 e T8 |
| 8 | `feat(web): translated 404 and locale segment validation` | `[locale]/layout.tsx`, `[locale]/not-found.tsx`, `[locale]/[...rest]/page.tsx`, `shared/lib/localeSegment.ts`, testes T9 e T10 |
| 9 | `feat(internationalization): copy for the landing 404, share image alt and ROUTE_NOT_FOUND` | as três árvores de tradução |
| 10 | `docs: share image and noindex in the forking and security guides` | `docs/FORKING.md`, `docs/SECURITY.md` |
| 11 | `docs(features): delivery-product-quality` | `docs/features/delivery-product-quality/` |

O commit 7 inclui o `apps/web/proxy.ts` porque a assinatura de `applySecurityHeaders` muda no commit 1; se o
`/review` preferir, a troca de assinatura da `web` pode ir junto do 1 como commit misto, registrando o porquê.

### 10.9 Env nova

Nenhuma. A imagem usa `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_LOGO_URL` e `NEXT_PUBLIC_WEB_URL`, todas já
existentes e todas opcionais (`packages/next-config/brand.ts:61-70`).

**Modo degradado**, conferido item a item:

| Situação | Comportamento |
|----------|---------------|
| sem `NEXT_PUBLIC_APP_NAME` | imagem e `alt` com `next-boilerplate` (`DEFAULT_BRAND_NAME`) |
| sem `NEXT_PUBLIC_APP_LOGO_URL`, ou logo fora do ar, lento, com status ≠ 200 ou em formato não aceito | monograma; build passa |
| sem `NEXT_PUBLIC_WEB_URL` nem `VERCEL_PROJECT_PRODUCTION_URL` | `og:image` aponta para `http://localhost:3001`, o mesmo fallback do sitemap (`apps/web/shared/lib/seo.ts:28-38`). O item 3.7 da entrega já reprova isso em produção |
| API sem nenhuma env opcional | a rota coringa não lê env; responde 404 JSON |
| `app`/`api` sem env | o `X-Robots-Tag` é constante, não depende de env |

---

## 11. Pré-requisitos manuais de infra

O `/develop` não consegue satisfazer estes, e o `/test` não deve reprovar por eles (marcar 🔒):

- **Validador de Open Graph**: colar a URL da landing publicada em opengraph.xyz, no Sharing Debugger da Meta
  e no Post Inspector do LinkedIn. Exige domínio público. Ao trocar a marca depois, pedir nova coleta nos
  mesmos validadores, porque a URL da imagem não muda.
- **Previews da Vercel com `noindex`**: o item 3.9 da entrega cobra `x-robots-tag: noindex` nas previews. A
  landing não manda o cabeçalho de propósito; quem cobre a preview é a Vercel, por configuração do projeto. O
  fork confere com `curl -sI <URL da preview>`. Não é código deste repositório.
- **`NEXT_PUBLIC_WEB_URL` em produção**: já documentada; sem ela a `og:image` aponta para localhost. Conferir no
  projeto `web` da Vercel.
- **Search Console**: pedir remoção de URLs do painel que já estejam indexadas, se o fork esteve no ar antes
  desta mudança.

Nada aqui exige serviço pago nem dependência nova. O `/cycle` registra o que couber em `docs/PRE-PRODUCTION.md`.

## 12. Sinais de pronto da spec cobertos por esta fatia

| Sinal (spec, linhas 158-163) | Onde se prova |
|------------------------------|---------------|
| Parte 3 sem 🟡 em 3.3 | V4, V8 e a passada de navegador do 404 |
| Parte 3 sem 🟡/🔴 em 3.6 | V1, V2; o validador fica 🔒 |
| Parte 3 sem 🟡 em 3.9 | V5, V6, V7; a preview da Vercel fica 🔒 |
| Validador de Open Graph mostra a marca | 🔒 (§11) |
| `curl` em rota inexistente da API devolve 404 JSON | V4 |
| `curl -I` no painel e na API mostra `noindex`; na landing, não | V5, V6, T2 a T4 |
| 3.7 e Lighthouse | fatia 2, fora |

---

## Perguntas em aberto (decididas por padrão)

Nenhuma foi perguntada. Cada uma traz a decisão adotada, a alternativa descartada e o porquê.

**Q1. `noindex` do painel: cabeçalho ou `robots` no layout?**
Adotado: cabeçalho, pela opção `noIndex` em `applySecurityHeaders` (recomendação da própria spec). Cobre
redirect, JSON e `/api/*`, que meta tag não cobre. Descartado: `metadata.robots` nos layouts do `app`.

**Q2. Assinatura de `applySecurityHeaders`: quarto parâmetro booleano ou objeto?**
Adotado: o terceiro parâmetro vira objeto `{ reportOnly, noIndex }`. Três chamadas mudam (duas na `web`, uma no
teste). Descartado: `applySecurityHeaders(res, opts, false, true)`, ilegível e fácil de inverter, num lugar em
que inverter tira a landing do Google. Descartado também: marcar o `noindex` dentro de `buildApiOptions`, porque
o `app` usa o mesmo `buildBrowserAppOptions` da `web` e precisaria de um terceiro construtor.

**Q3. Imagem: arquivo `opengraph-image.tsx` puro ou também `images` explícito na metadata?**
Adotado: os dois. O arquivo gera o PNG estático; `buildLocaleMetadata` declara `openGraph.images`, porque o Next
descarta a imagem do layout quando a página exporta `openGraph` (achado do §1). Descartado: um
`opengraph-image.tsx` em cada uma das sete pastas de página (sete cópias da mesma imagem) e `generateImageMetadata`
(continua sendo do layout e some do mesmo jeito).

**Q4. "Proposta" na imagem: de onde vem?**
Adotado: `apps.web.pages.home.meta.description`, que já é o subtítulo do hero (`(home)/components/hero.tsx:23-25`)
e a meta description da home. A marca (`getBrand`) não tem campo de proposta. Descartado: chave nova só para a
imagem, que o fork teria de manter em paralelo à do hero. Consequência: com a copy de exemplo, a imagem mostra a
frase de exemplo; trocar a copy é trabalho do fork, fora do corte da spec.

**Q5. `/favicon.ico` da `web`: servir um arquivo ou responder 404?**
Adotado: 404, pela validação do segmento `[locale]`, sem arquivo novo. A landing declara o ícone por
`<link rel="icon">` a partir de `app/[locale]/icon.png`; um `favicon.ico` na raiz seria mais um arquivo de marca
que todo fork tem de trocar. Descartado: `apps/web/public/favicon.ico`. O 🟡 de `BACKLOG.md:726` fecha porque o
defeito descrito era devolver a home com 200.

**Q6. `robots.ts` no `app`?**
Adotado: não. Um `Disallow` no painel impediria o Google de ler o `noindex` do cabeçalho, que é o mecanismo que
a própria spec cita (evidência de mercado, linhas 76-79). Descartado: `robots.ts` com `Disallow: /`.

**Q7. 404 da landing: `global-not-found` ou `[...rest]` + `not-found.tsx`?**
Adotado: `[...rest]` + `not-found.tsx` dentro do layout, com validação do segmento no layout. Usa API estável e
mostra header e footer. Descartado: `experimental.globalNotFound` (experimental, ignora o layout e exigiria
repetir estilos e tema como o `global-error.tsx` faz, e não pegaria `/favicon.ico`, que casa com uma rota).

**Q8. Rota coringa da API: `[...path]` ou `[[...path]]`, dentro ou fora de `(routes)`?**
Adotado: `[[...path]]` (opcional, cobre `/`) fora do grupo. Descartado: `[...path]` (deixaria `/` com o 404
HTML) e colocar em `(routes)` (é fallback, não recurso).

**Q9. Nome do código: `ROUTE_NOT_FOUND` ou `NOT_FOUND`?**
Adotado: `ROUTE_NOT_FOUND`, no padrão `<ÁREA>_<MOTIVO>` dos códigos existentes (`ENTITY_NOT_FOUND`,
`USERS_NOT_FOUND`). `NOT_FOUND` sozinho se confundiria com recurso inexistente numa rota válida.

**Q10. Paleta da imagem: hex copiado ou import de `antdSeedColors`?**
Adotado: constantes hex locais copiadas dos tokens claros. Descartado: importar `antdSeedColors`, que mora num
módulo `"use client"`. Mover a constante para um módulo neutro do design system seria refatoração fora da
tarefa.

**Q11. Discordância com o corte?** Nenhuma. O `noindex` nas telas de login e cadastro da landing está no corte
da spec (linha 106-107), embora o resumo da auditoria não o cite; está planejado.

## 13. Achados para o `/spec --sync`

- **Fechados por esta fatia, se o `/test` confirmar**: 🟡 `/favicon.ico` da `web` (`specs/BACKLOG.md:726`) e
  🟢 `GET /api` exato na `web` (`specs/BACKLOG.md:1531`). Ambos medidos em V8.
- **Continua aberto**: O1, `apps/app` mandando arquivo inexistente de um segmento ao login
  (`specs/BACKLOG.md:892`). É do `app`, fora do corte.
- **Novo, fora do corte**: método não suportado numa rota existente da API (`PUT /health`) responde `405` do
  Next sem `error.code`. Pequeno e concreto; candidato a achado no backlog com `apps/api/app/(routes)/health/route.ts`
  como exemplo.
- **Novo, para a "imagem por página" de fatia futura**: `createMetadata` usa o título como `alt` da imagem
  (`packages/seo/metadata.ts:80-88`); quando uma página passar imagem própria, vai precisar de `alt` separado.
