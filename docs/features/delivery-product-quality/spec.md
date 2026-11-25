---
id: delivery-product-quality
title: Core aprovado na parte 3 da entrega (celular, 404, desempenho e SEO)
status: done
value: alto
effort: G
audience: produto
area: [apps/web, apps/app, apps/api, apps/e2e, packages/seo, packages/analytics, packages/security, packages/internationalization]
mode: ambos
depends_on: []
contends_on: [packages/seo/metadata.ts, "apps/app/app/[locale]/(authenticated)/(common)/layout.tsx", "apps/app/app/[locale]/(authenticated)/(admin)/admin/layout.tsx", packages/analytics/provider.tsx, "apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx"]
feature: delivery-product-quality
updated: 2026-11-24
---

# Core aprovado na parte 3 da entrega (celular, 404, desempenho e SEO)

## Problema

A [etapa de entrega](../../delivery/README.md) passa a exigir de todo fork a parte 3,
[validação de qualidade do produto](../../delivery/03-product-quality.md): celular, formulários, 404,
PageSpeed, imagens, `og:image`, sitemap, Analytics, `robots.txt`, meta descriptions e títulos. Medido hoje,
o próprio core reprova em itens que nenhum fork deveria ter de corrigir sozinho. O mais grave: a imagem de
compartilhamento da landing ainda é a arte do next-forge, e vai para produção em silêncio se o fork esquecer
de trocá-la. Sem esta spec, cada fork descobre as mesmas falhas na própria entrega e as corrige de um jeito.

## O que já existe no repo

Medido em 2026-11-19 sobre `583194b`. Os itens de 404, `og:image` e `robots.txt` foram relidos em 2026-11-23 sobre
`a391d1c`, depois da fatia 1 (PR #71); os de celular, desempenho e sitemap, sobre `18288c9`, depois da fatia 2
(PR #72); e os de Google Analytics e títulos, sobre `5829ea3`, depois da fatia 3 (PR #73). O que cada fatia fechou
está marcado no item.

- **Celular** — Tailwind mobile-first e o padrão de viewport do Next (nenhum `export const viewport` em app
  ou web). **Fechado pela fatia 2:** o Playwright tem o projeto `mobile` ao lado do `chromium`
  (`apps/e2e/playwright.config.ts:54-67`), e o axe roda a 390 px nos fluxos críticos. **Segue como lacuna:** o
  celular roda só em pt-br e no tema claro; tema escuro e os outros idiomas a 390 px seguem com o `agent-browser`.
- **Formulários** — os 20 formulários do core usam `buildXSchema(dictionary)` com `zodResolver`. **Lacuna:**
  sem E2E para contato, login da landing, esqueci/redefinir senha, link por e-mail, os blocos da conta,
  convite e usuários do admin; `emailLinkSchema`, `onboardingFormSchema` e `buildUpdateUserFormSchema` sem
  teste de schema.
- **404** — `apps/app/app/not-found.tsx:1-5` traduzido e testado (`notFoundPageHomeLink.test.tsx`).
  **Fechado pela fatia 1:** a `apps/web` ganhou `app/[locale]/not-found.tsx` traduzido, e a `apps/api`, a rota
  coringa `app/[[...path]]/route.ts` com `404 ROUTE_NOT_FOUND`. **Segue como lacuna:** nenhum `error.tsx` de
  segmento (fora do corte).
- **Desempenho** — bundle analyzer (`packages/next-config/index.ts:11`, era `:10` até a PR #64), fontes self-host
  (`packages/design-system/lib/fonts.ts`), nenhum `<img>` cru, GA carregado só depois do consentimento.
  **Fechado pela fatia 2:** `pnpm lighthouse` mede home, preços e contato contra o build de produção da landing.
  **Segue como lacuna:** a landing monta o `DesignSystemProvider` (antd + um `AuthProvider`,
  `apps/web/app/[locale]/layout.tsx:39`; `packages/design-system/index.tsx:41-55`), então todo visitante anônimo
  baixa antd e o SDK do Firebase Auth. O segundo `AuthProvider`, aninhado no layout, saiu na PR #74 (tarefa
  direta `e2e-org-ownership-flake-and-web-api-url`). O número que o "Fora do corte" esperava chegou com a fatia 2: na mediana de cinco execuções, a home
  fica em Performance 87 e LCP 3,9 s, abaixo da meta da parte 3 nos dois (ver a conferência da fatia 2).
- **Imagens** — nenhuma acima de 100 KB; `images.formats` com AVIF e WebP
  (`packages/next-config/index.ts:7`, era `:6` até a PR #64). Sem lacuna.
- **`og:image`** — **fechado pela fatia 1:** a arte do next-forge saiu da `web` e da `api`, e
  `apps/web/app/[locale]/opengraph-image.tsx` gera um PNG por idioma, no build, a partir de `getBrand()`.
  **Segue como lacuna:** nenhuma página passa imagem própria a `createMetadata`, que usa o título como `alt`
  (`packages/seo/metadata.ts:80-88`, `alt: title` em `:86`); uma imagem por página vai precisar de `alt` separado.
- **Sitemap** — `apps/web/app/sitemap.ts:10-16`: 5 rotas × 3 idiomas com `alternates.languages`, base vinda
  de `NEXT_PUBLIC_WEB_URL`. **Fechado pela fatia 2:** o sitemap não emite mais `lastModified`, e
  `apps/web/__tests__/sitemap.test.ts` compara a lista com as páginas de `app/[locale]`. A lista continua manual,
  mas o teste quebra quando ela diverge.
- **Google Analytics** — GA4 com Consent Mode v2 (`packages/analytics/consent.ts:79-97`,
  `provider.tsx:49-54`), carregado só depois do aceite. **Fechado pela fatia 3:** `sign_up` e `generate_lead` saem
  pelo `useAnalyticsEvent()` do `@repo/analytics`, só com consentimento e id do GA (ver a conferência da fatia 3).
- **`robots.txt`** — `apps/web/app/robots.ts:4-13` é estático, `allow: "/"`, sem depender de env: a
  produção nunca sai com `Disallow: /`. **Fechado pela fatia 1:** `apps/app` e `apps/api` mandam
  `X-Robots-Tag: noindex` pelo proxy, e as telas de login e cadastro da landing saíram do `Disallow` e levam
  `noindex` na metadata.
- **Meta descriptions e títulos** — as 7 páginas da landing têm título e descrição traduzidos com
  `hreflang` (`apps/web/shared/lib/seo.ts:67-103`, era `:45-69` até a PR #71). **Lacuna:** a copy é de exemplo (home "Início" com a
  stack na descrição, contato com a marca literal "Next Boilerplate"); o painel não tem descrição por tela.
  **Fechado pela fatia 3:** os dois layouts do painel declaram `title.template`, e as dez telas internas têm
  título próprio.

## Evidência de mercado

- Limiares "bons" dos Core Web Vitals no percentil 75: LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1
  (<https://web.dev/articles/vitals>). Pontuação de 90 a 100 no Lighthouse é "good"
  (<https://developer.chrome.com/docs/lighthouse/performance/performance-scoring>).
- O Google pede `robots.txt` só para controlar rastreamento e diz que ele "is not a mechanism for keeping a
  web page out of Google"; para tirar da busca, `noindex` por meta tag ou `X-Robots-Tag`, numa página que o
  `robots.txt` não bloqueie
  (<https://developers.google.com/search/docs/crawling-indexing/robots/intro>,
  <https://developers.google.com/search/docs/crawling-indexing/block-indexing>).
- Descrição única por página e título descritivo e conciso
  (<https://developers.google.com/search/docs/appearance/snippet>,
  <https://developers.google.com/search/docs/appearance/title-link>). Sitemap com URL absoluta e `lastmod`
  que reflita a última alteração relevante
  (<https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap>).
- `og:image` é uma das quatro propriedades obrigatórias do Open Graph (<https://ogp.me/>); o Next gera a
  imagem por código com `ImageResponse`
  (<https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image>).
- `sign_up` e `generate_lead` são eventos recomendados do GA4
  (<https://developers.google.com/analytics/devguides/collection/ga4/reference/events>).
- Lighthouse CI aparece no baseline de engenharia já pesquisado:
  [`research/engineering-baseline.md`](../../../specs/reference/research/engineering-baseline.md).
- Todas as URLs acima foram abertas em 2026-11-19.

## Proposta — corte de MVP

Em fatias, cada uma entregável sozinha:

**Fatia 1: o que um fork herda sem perceber** (✅ entregue pela PR #71, `a391d1c`, em 2026-11-23, e conferida no
código de `main`)

- [x] **`og:image` gerada da marca**: a landing gera a imagem por código com o nome, o logo e a proposta
      vindos da marca configurável, por idioma, com `og:image:alt`; a arte do next-forge sai da `web` e da
      `api`.
- [x] **404 da landing traduzido**, com a marca e um link para a home, nos três idiomas.
- [x] **404 da API em JSON**, com `error.code` próprio, para qualquer rota que não existe.
- [x] **Painel, API e telas de autenticação fora do índice**: `X-Robots-Tag: noindex` em toda resposta do
      `app` e da `api`, e `noindex` nas telas de login e cadastro da landing, que saem do `Disallow`.

**Conferência da fatia 1 no código de `a391d1c`** (auditoria de 2026-11-23):

| item | evidência | teste |
|------|-----------|-------|
| `og:image` da marca | `apps/web/app/[locale]/opengraph-image.tsx:24-26` (`generateStaticParams` com os três idiomas, então o PNG sai no build) e `:57` (`ImageResponse`); nome, logo e frase vêm de `getBrand()` e do dicionário em `apps/web/shared/lib/openGraph.ts:39-54`, com o logo trocado por monograma quando a busca falha (`:60-84`); `buildLocaleMetadata` declara `openGraph.images` com URL absoluta, 1200 × 630 e `alt` traduzido (`apps/web/shared/lib/seo.ts:91-99`); os dois `opengraph-image.png` saíram da `web` e da `api` | `apps/web/__tests__/openGraph.test.ts`, `seo.test.ts` |
| 404 da landing | `apps/web/app/[locale]/not-found.tsx:15-53` (cartão com título, descrição, link para `/${locale}` e `<title>` com a marca em `:23`); `app/[locale]/[...rest]/page.tsx:3-5` leva caminho desconhecido ao `notFound()`; `shared/lib/localeSegment.ts:9-13`, chamado no layout (`app/[locale]/layout.tsx:23`, era `:24` até a PR #74), recusa idioma inválido; textos em `translations/apps/web/pages/notFound/index.ts` | `notFoundPage.test.tsx`, `localeSegment.test.ts`, E2E em `apps/e2e/tests/landing.spec.ts` |
| 404 da API em JSON | `apps/api/app/[[...path]]/route.ts:6-16` responde `404 { error: { code: "ROUTE_NOT_FOUND" } }` nos cinco métodos; o código está nos três idiomas (`translations/packages/shared/utils.ts:116`, `:299`, `:488`) | `apps/api/__tests__/routeNotFound.test.ts` |
| `noindex` | opção `noIndex` em `applySecurityHeaders` (`packages/security/middleware.ts:153-158`, `:180-182`), ligada em `apps/app/proxy.ts:199-207` (inclusive no atalho de `/api/*`) e em `apps/api/proxy.ts:141-143` (era `:137-139` até a PR #74), aplicada a toda resposta do proxy da API (recusa de origem, preflight, 429 e passagem); a `web` não liga; login e cadastro da landing com `indexable: false` (`sign-in/page.tsx:12`, `sign-up/page.tsx:12`, que vira `robots: { index: false, follow: true }` em `seo.ts:101`); `robots.ts` sem `disallow` | `packages/security/__tests__/csp.test.ts`, `apps/app/__tests__/securityHeaders.test.ts`, `apps/web/__tests__/securityHeaders.test.ts` (ausência na landing), `robots.test.ts` |

O `/test` fechou com 11 ✅, 0 ❌ e 1 🔒 (o validador de Open Graph, que exige a landing publicada num domínio), em
build de produção. O CI da execução de merge passou nos seis jobs (`gh run 45230519218`).

**Deriva da fatia 1:**

- **O 404 da landing depende de JavaScript.** Com idioma válido, o servidor responde 404 com
  `<html id="__next_error__">` e o corpo vazio; o cartão traduzido só aparece depois que o cliente monta a
  árvore. Antes da fatia, o mesmo endereço respondia o 404 do Next em inglês, com `<h1>`. O status 404 e o
  `noindex` estão certos, e o buscador não indexa corpo de 404. O `/review` explicou a causa lendo o Next 16.4.6
  (o caminho de recuperação de erro monta um shell vazio quando `notFound()` sobe até o layout numa rota
  dinâmica), e o `/test` mediu que envolver o `children` em `Suspense` transforma o 404 em 200. A única saída
  conhecida é o `global-not-found`, experimental, que o plano descartou. A decisão de aceitar está em
  "Perguntas em aberto".
- **`noindex` só nas respostas que passam pelo proxy.** Arquivo estático fora do `matcher` do `app` (como
  `_next/static`) sai sem o cabeçalho. Não é página, então o efeito na busca é nulo.
- **O `contends_on` foi revisto nesta auditoria para as fatias 2 e 3:** saíram `packages/security/middleware.ts` e
  `apps/web/app/[locale]/layout.tsx`, entregues na fatia 1; entraram `apps/web/app/sitemap.ts` (fatia 2) e os dois
  layouts do painel que ganham `title.template` (fatia 3). A fatia 1 declarou quatro arquivos, tocou dois deles e
  mais 31 fora da lista (fora de `docs/` e `specs/`), 11 deles de teste.

**Fatia 2: medição no repositório** (✅ entregue pela PR #72, `18288c9`, em 2026-11-23, e conferida no código de
`main`)

- [x] **Projeto `mobile` no Playwright** rodando os fluxos críticos e o axe a 390 px.
- [x] **Lighthouse por comando** (`pnpm lighthouse` ou equivalente) contra o build de produção da landing,
      com os limiares da parte 3 e saída que o relatório de entrega consegue citar.
- [x] **Teste do sitemap**: a lista bate com as páginas públicas da landing e `lastModified` deixa de ser a
      hora da requisição.

**Conferência da fatia 2 no código de `18288c9`** (auditoria de 2026-11-23):

| item | evidência | teste |
|------|-----------|-------|
| projeto `mobile` | `apps/e2e/playwright.config.ts:61-66`: projeto `mobile` com `devices["Pixel 7"]` e viewport 390 × 844 (`:20`), restrito aos fluxos de `landing`, `signIn`, `signUp` e `entityCrud` (`CRITICAL_FLOWS`, `:19`); `expectAccessible` roda o axe e, só no celular, reprova a rota com rolagem horizontal (`apps/e2e/support/a11y.ts:104-118`); `apps/e2e/support/panelNavigation.ts` abre a barra lateral antes de procurar o link do painel | o job `e2e` da execução de merge (`gh run 45256020354`) rodou 9 testes `[mobile]` e 40 no total, todos verdes; o `/test` rodou o `mobile` com `--repeat-each=5` (29 de 29) e provou com uma spec temporária que a checagem reprova um bloco de 600 px |
| `pnpm lighthouse` | atalho na raiz (`package.json:28`) para `apps/e2e/lighthouse/run.mjs`, que sobe o `next start` da landing na 3001 (ou mede um servidor dado com `--url`), roda `npx lighthouse@12.8.2` em perfil mobile no Chromium do Playwright (`:84`) e grava a tabela em `apps/e2e/lighthouse-results/summary.md`, pasta fora do Git (`.gitignore:325`); limiares da parte 3 em `apps/e2e/lighthouse/summary.mjs:11-49` (Performance 90, demais categorias 95, LCP 2,5 s, CLS 0,1, TBT 200 ms); a versão fica em `summary.mjs:1` | `apps/e2e/__tests__/lighthouseSummary.test.ts` (21 casos); a auditoria rodou o comando cinco vezes em `main`, exit 0 nas cinco, com a porta livre no fim |
| teste do sitemap | `apps/web/app/sitemap.ts:18-36` sem `lastModified`; as 5 rotas manuais seguem em `:10-16` | `apps/web/__tests__/sitemap.test.ts`: a lista bate com as páginas de `app/[locale]` menos login e cadastro, cada entrada tem URL absoluta e alternativa nos três idiomas, e a saída não depende da hora; o `/test` contou 15 `<loc>` e 0 `<lastmod>` no build |

O `/test` fechou com 0 ❌ e 1 🔒 (o `--url` contra uma preview da Vercel), depois de duas rodadas: a primeira achou o
Ctrl+C deixando o `next start` órfão na porta 3001, e o `/review` corrigiu antes do merge. O CI da execução de merge
passou nos seis jobs.

**Números do `pnpm lighthouse` em `main`** (cinco execuções da auditoria de 2026-11-23, mesma máquina, perfil
mobile; mediana, com mínimo e máximo entre parênteses):

| página | Performance | LCP | Best practices |
|--------|-------------|-----|----------------|
| `/pt-br` | 87 🟡 (85 a 97) | 3,9 s 🟡 (2,3 a 4,0) | 96 ✅ |
| `/pt-br/pricing` | 94 ✅ (91 a 96) | 2,8 s 🟡 (2,2 a 2,9) | 96 ✅ |
| `/pt-br/contact` | 96 ✅ (94 a 98) | 2,2 s ✅ (2,0 a 3,0) | 93 🟡 |

Acessibilidade e SEO deram 100 e CLS 0 nas três páginas, nas cinco execuções. As etapas da PR #72 mediram a home
entre 57 e 93 em outras cinco execuções.

**Deriva da fatia 2:**

- **O sitemap não emite `lastModified`.** O corte pedia que ele deixasse de ser a hora da requisição, e o impacto
  por camada falava em valor estável; a fatia omitiu o campo, que o protocolo trata como opcional. Uma data por rota
  ficou como pergunta.
- **O projeto `mobile` faz mais do que o corte pedia:** além do axe, reprova rolagem horizontal (WCAG 1.4.10). O
  helper da barra lateral repete o toque quando o primeiro se perde antes da hidratação (cerca de 1 em 10 no
  `/test`); o defeito do componente virou achado no `BACKLOG.md`.
- **`contends_on`:** a fatia tocou os dois arquivos seus que estavam na lista e mais 13 fora de `docs/` e `specs/`,
  5 deles novos. O campo foi revisto nesta auditoria para a fatia 3: saíram `apps/e2e/playwright.config.ts` e
  `apps/web/app/sitemap.ts`; entraram `packages/analytics/provider.tsx` e o `SignUpFormClient.tsx` da app, onde o
  evento de cadastro tende a nascer.

**Fatia 3: títulos e conversão** (✅ entregue pela PR #73, `5829ea3`, em 2026-11-23, e conferida no código de
`main`; o CI da execução de merge ficou vermelho por um E2E instável fora da fatia, e por isso a auditoria de
2026-11-23 não arquivou a spec; arquivada em 2026-11-24, depois da sua resposta à D20, ver "Perguntas em aberto")

- [x] **Título próprio por tela do painel**, a partir do dicionário, com `title.template` nos layouts.
- [x] **Eventos `sign_up` e `generate_lead`** pelo `@repo/analytics`, só com consentimento, e um helper para
      o fork registrar os eventos do produto.

**Conferência da fatia 3 no código de `5829ea3`** (auditoria de 2026-11-23, noite):

| item | evidência | teste |
|------|-----------|-------|
| título por tela | `panelTitleTemplate` (`apps/app/shared/lib/panelTitles.ts:11-19`) devolve `default: "<área> \| <marca>"` e `template: "%s \| <marca>"`, usado no `generateMetadata` dos dois layouts (`(common)/layout.tsx:24-35`, `title` em `:31`; `admin/layout.tsx:22-33`, `title` em `:29`); `PANEL_PAGE_TITLES` (`panelTitles.ts:21-42`) registra dez telas com rótulos que o dicionário já tinha, e `panelPageMetadata` (`apps/app/lib/server/panelMetadata.ts:13-20`) lê o dicionário no idioma da rota; as seis telas server exportam `generateMetadata` na própria `page.tsx`, e as quatro telas cliente num `layout.tsx` irmão (criar entidade, criar e editar usuário, playground). As duas telas iniciais ficam com o nome da área | `apps/app/__tests__/panelTitles.test.ts` (varre o disco e reprova tela sem registro), `panelLayoutTitle.test.ts`; E2E com `toHaveTitle` em `apps/e2e/tests/entityCrud.spec.ts:15`, nos projetos `chromium` e `mobile` |
| `sign_up` e `generate_lead` | `ANALYTICS_EVENT` e `sendAnalyticsEvent` (`packages/analytics/events.ts:1-4`, `:20-31`), que só chama o `gtag` com consentimento, id do GA e `gtag` presente; `useAnalyticsEvent()` (`packages/analytics/events-context.tsx:15-20`), mudo fora do provider; o `AnalyticsProvider` publica o `trackEvent` (`provider.tsx:102-113`, `:125-127`). `sign_up` em seis pontos: cadastro por e-mail na app (`SignUpFormClient.tsx:104`) e na landing (`sign-up-form-client.tsx:60`), e Google nas duas telas da app (`SignInForm.tsx:52`, `SignUpFormClient.tsx:53`, pelo `onAccountCreated` de `googleSignInApi.ts:41`) e nas duas da landing (`sign-in-form-client.tsx:146-147`, `sign-up-form-client.tsx:97-98`); âncoras remedidas em 2026-11-24, depois da PR #74, que mexeu nos cinco arquivos (eram `:133`, `:53`, `:54`, `:42`, `:140-141` e `:92-93`), com `isNewAccount` (`packages/auth/client.ts:177-178`). `generate_lead` no contato aceito (`contact-form-client.tsx:62`). Nenhuma dependência nem variável nova | `packages/analytics/__tests__/events.test.ts`, `apps/app/__tests__/analyticsEvents.test.tsx`, `signUpAnalytics.test.tsx` e `googleSignInApi.test.ts`, `apps/web/__tests__/signUpAnalytics.test.tsx` e `contactForm.test.tsx`, `packages/auth/__tests__/newAccount.test.ts` |

O `/test` fechou com 14 ✅, 0 ❌ e 1 🔒 (ver os eventos chegarem numa propriedade GA4 real, item 19 do
`docs/PRE-PRODUCTION.md`). No navegador, o `sign_up` sobreviveu ao carregamento completo de página nas duas telas da
app e não saiu com o banner recusado, sem decisão ou no login seguinte com Google. O CI da PR passou nos seis jobs
(`gh run 45309579027`). O da execução de merge (`gh run 45311956449`) terminou em `failure` no job `e2e`:
`organizationOwnership.spec.ts:68` reprovou na primeira tentativa por contraste do botão "Atualizar" em
`/pt-br/organization` e passou na segunda, e a config do Playwright reprova teste instável no CI
(`apps/e2e/playwright.config.ts:36`). Os outros cinco jobs passaram. A PR #74 consertou o teste (a espera da
`GET /organization/invitations` antes do axe, tarefa direta `e2e-org-ownership-flake-and-web-api-url`), e a execução de
merge dela (`gh run 45408797430`, sobre `c58f2ef`, que contém o corte inteiro desta spec) passou no `e2e` com 45
testes e nenhum instável; reprovou só em `secrets`, por um falso positivo do Gitleaks num arquivo de teste de
`delivery-security-review` (ver a spec dela).

**Deriva da fatia 3:**

- **O título fica em `apps/app`, não em `packages/seo`.** O impacto por camada citava um template de título no
  pacote; o `/analyze` pôs a lógica em `apps/app/shared/lib/panelTitles.ts`, porque o único consumidor é o painel e
  a landing já titula cada página por `buildLocaleMetadata`. `packages/seo/metadata.ts` não foi tocado. A spec
  estava imprecisa; sem efeito no corte.
- **O `sign_up` do Google na app sai logo depois do popup, antes da troca de sessão.** Se a troca falhar, o evento
  já saiu; a conta existe no Firebase nesse ponto, então o evento conta "conta criada", e a próxima tentativa não
  repete o evento porque o `isNewUser` volta falso. Decisão do `/develop`, aceita pelo `/review`.
- **`contends_on`:** a fatia declarou cinco arquivos e tocou quatro (ficou de fora `packages/seo/metadata.ts`);
  fora da lista, tocou 32 arquivos fora de `docs/` e `specs/`, 14 deles novos e 10 de teste.

### Fora do corte

- **Dieta do bundle da landing** (tirar antd e o `AuthProvider` duplicado do layout público). É a maior
  alavanca de desempenho, mas mexe em autenticação e no design system; vira spec própria quando o
  Lighthouse da fatia 2 der o número.
- **Copy de SEO da landing.** Texto de exemplo é trabalho do fork (seção 3.3 de `docs/FORKING.md`); o core
  só garante que o mecanismo existe e que o teste acusa texto de exemplo.
- **Lighthouse bloqueando o CI.** O comando entra primeiro como medição; transformar em gate depende de
  estabilizar a variação entre execuções.
- **`error.tsx` de segmento em cada grupo de rotas.** Fica para quando a fatia 1 estiver no ar e houver um
  caso de falha medido.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Nenhum. |
| `apps/api` | Rota coringa de 404 em JSON; `noindex` pelo cabeçalho de segurança; remove a `opengraph-image.png` sem uso. |
| `apps/app` | `noindex`; `title.template` e título por tela. |
| `apps/web` | `opengraph-image` por código; `not-found` traduzido; `noindex` nas telas de autenticação e `robots.ts` sem os `Disallow` delas; sitemap sem `lastModified` (entregue assim pela fatia 2); eventos de conversão. |
| `apps/e2e` | Projeto `mobile` e `pnpm lighthouse` (entregues pela fatia 2); E2E dos formulários sem cobertura que a fatia escolher (contato e esqueci/redefinir senha primeiro). |
| `packages/*` | `seo` (template de título, imagem por página), `analytics` (helper de evento), `security` (`X-Robots-Tag`), `internationalization` (404, títulos, `og:image:alt`). |
| Infra/env | Nenhuma variável nova. O Lighthouse roda por `npx` com a versão fixada (12.8.2), sem entrar no `package.json` nem no lockfile. |

## Riscos e trade-offs

- **`noindex` errado tira o site do Google.** O cabeçalho entra só em `app` e `api`; um teste precisa
  garantir que a landing nunca o recebe.
- **`og:image` dinâmica roda numa função.** A imagem deve ser gerada no build (rota estática) para não
  custar invocação a cada compartilhamento.
- **Lighthouse varia de execução para execução.** Por isso ele entra como medição e não como gate.
- **Custo herdado pelo fork:** nenhum serviço pago; o PageSpeed Insights e o Lighthouse são gratuitos.

## Sinais de pronto

- Rodar a parte 3 da etapa de entrega contra o core termina sem nenhum 🔴 e sem 🟡 nos itens 3.3, 3.6, 3.7 e
  3.9.
- Colar a URL da landing num validador de Open Graph mostra a marca configurada, não a arte do next-forge.
- `curl` numa rota inexistente da API devolve 404 em JSON com `error.code`.
- `curl -I` numa tela do painel e na API mostra `x-robots-tag: noindex`; na landing, não.
- O relatório de entrega consegue citar a pontuação do Lighthouse produzida por um comando do repositório.

## Perguntas em aberto

- **Aceitar que o 404 da landing dependa de JavaScript?** (deriva da fatia 1) — **recomendação:** aceitar. O
  status e o `noindex` estão certos e a correção conhecida é uma API experimental do Next. Sem JavaScript, a
  pessoa vê página em branco onde antes via o 404 do Next em inglês.
- **Abrir a spec da dieta do bundle da landing?** (gatilho do "Fora do corte", atingido pela fatia 2) —
  **recomendação:** sim, como spec `proposed` dirigida (`/spec`), depois da fatia 3. Na mediana de cinco
  execuções, a home fica em Performance 87 e LCP 3,9 s, e preços em LCP 2,8 s. A Performance da home foi de 57 a
  97 em dez execuções na mesma máquina, então a spec nova precisa partir da mediana, não de uma execução.
- **Três escolhas da fatia 2 que o `/analyze` deixou como pergunta** — **recomendação:** (a) subir o Node do
  repositório para 22.19 ou mais, o que libera o Lighthouse 13: só quando houver outro motivo para mexer no Node;
  (b) uma data declarada por rota no sitemap: não, até existir conteúdo que muda com frequência; (c) mediana de
  várias execuções: sim, mas no procedimento do `/deliver` (rodar o comando três vezes e citar a mediana), sem
  mudar o comando. Em (c) a auditoria de 2026-11-23 diverge do plano, por causa da variação medida.

- **Arquivar a spec com o CI da execução de merge da PR #73 vermelho?** (D20) — **recomendação de 2026-11-24:**
  arquivar. O motivo do vermelho sumiu: o teste instável foi consertado pela PR #74, e o `e2e` da execução de merge
  dela, sobre um código que contém o corte inteiro desta spec, passou com 45 testes e nenhum instável. O único job
  vermelho nessa execução é o `secrets`, por um falso positivo num teste de outra spec, que só examina o commit novo
  e não diz nada sobre este corte. A recomendação de 2026-11-23 (rodar de novo o job da PR #73) não foi seguida e
  perdeu o sentido. **Respondida em 2026-11-24:** arquivar. A spec saiu de `specs/` nesse dia.
- **Duas escolhas da fatia 3 que o `/analyze` decidiu por padrão** — (a) mandar os eventos também ao Vercel
  Analytics: **não agora**; eventos customizados lá dependem de plano pago, segundo o próprio plano (a página de
  preços não foi reaberta), e o hook aceita um segundo destino sem mudar os chamadores; (b) pôr a área no meio do
  título do admin (`<tela> | <área> | <marca>`): **não**; fica longo na aba, e as telas de cada área já têm nomes
  distintos.

**Respondidas pelas entregas:** o `noindex` do painel foi por cabeçalho (`X-Robots-Tag` em `applySecurityHeaders`,
fatia 1); o Lighthouse ficou como comando local, fora do CI, e com a versão fixada em 12.8.2 (fatia 2).
