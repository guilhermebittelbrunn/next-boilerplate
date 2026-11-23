---
id: delivery-product-quality
title: Core aprovado na parte 3 da entrega (celular, 404, desempenho e SEO)
status: approved
value: alto
effort: G
audience: produto
area: [apps/web, apps/app, apps/api, apps/e2e, packages/seo, packages/analytics, packages/security, packages/internationalization]
mode: ambos
depends_on: []
contends_on: [packages/security/middleware.ts, packages/seo/metadata.ts, "apps/web/app/[locale]/layout.tsx", apps/e2e/playwright.config.ts]
feature: -
updated: 2026-11-23
---

# Core aprovado na parte 3 da entrega (celular, 404, desempenho e SEO)

## Problema

A [etapa de entrega](../docs/delivery/README.md) passa a exigir de todo fork a parte 3,
[validação de qualidade do produto](../docs/delivery/03-product-quality.md): celular, formulários, 404,
PageSpeed, imagens, `og:image`, sitemap, Analytics, `robots.txt`, meta descriptions e títulos. Medido hoje,
o próprio core reprova em itens que nenhum fork deveria ter de corrigir sozinho. O mais grave: a imagem de
compartilhamento da landing ainda é a arte do next-forge, e vai para produção em silêncio se o fork esquecer
de trocá-la. Sem esta spec, cada fork descobre as mesmas falhas na própria entrega e as corrige de um jeito.

## O que já existe no repo

Medido em 2026-11-19 sobre `583194b`.

- **Celular** — Tailwind mobile-first e o padrão de viewport do Next (nenhum `export const viewport` em app
  ou web). `apps/e2e/playwright.config.ts:49-56` tem só o projeto `Desktop Chrome`. **Lacuna:** nenhum E2E
  em celular; o axe roda só em desktop e pt-br.
- **Formulários** — os 20 formulários do core usam `buildXSchema(dictionary)` com `zodResolver`. **Lacuna:**
  sem E2E para contato, login da landing, esqueci/redefinir senha, link por e-mail, os blocos da conta,
  convite e usuários do admin; `emailLinkSchema`, `onboardingFormSchema` e `buildUpdateUserFormSchema` sem
  teste de schema.
- **404** — `apps/app/app/not-found.tsx:1-5` traduzido e testado (`notFoundPageHomeLink.test.tsx`).
  **Lacuna:** a `apps/web` não tem `not-found.tsx` e mostra o 404 padrão do Next em inglês; a `apps/api` não
  tem rota coringa e responde 404 em HTML, fora do contrato `{ error: { code } }`; nenhum `error.tsx` de
  segmento.
- **Desempenho** — bundle analyzer (`packages/next-config/index.ts:11`, era `:10` até a PR #64), fontes self-host
  (`packages/design-system/lib/fonts.ts`), nenhum `<img>` cru, GA carregado só depois do consentimento.
  **Lacuna:** nenhum Lighthouse no repo nem no CI; a landing monta o `DesignSystemProvider` (antd + um
  `AuthProvider`) e um segundo `AuthProvider` (`apps/web/app/[locale]/layout.tsx:36-37`,
  `packages/design-system/index.tsx:42-44`), então todo visitante anônimo baixa antd e o SDK do Firebase
  Auth.
- **Imagens** — nenhuma acima de 100 KB; `images.formats` com AVIF e WebP
  (`packages/next-config/index.ts:7`, era `:6` até a PR #64). Sem lacuna.
- **`og:image`** — `apps/web/app/[locale]/opengraph-image.png`, 1200 × 630, estática e global. **Lacuna:** o
  conteúdo é a arte do next-forge (cita Prisma e PlanetScale, que a stack não usa), não muda com a marca
  (`getBrand()`), e nenhuma página passa imagem própria a `createMetadata`
  (`packages/seo/metadata.ts:80-88`). Uma cópia idêntica está na `apps/api`, sem uso.
- **Sitemap** — `apps/web/app/sitemap.ts:10-16`: 5 rotas × 3 idiomas com `alternates.languages`, base vinda
  de `NEXT_PUBLIC_WEB_URL`. **Lacuna:** `lastModified = new Date()` (`:20`) declara toda página alterada a
  cada requisição; a lista é manual e nenhum teste a compara com as páginas públicas.
- **Google Analytics** — GA4 com Consent Mode v2 (`packages/analytics/consent.ts:79-97`,
  `provider.tsx:49-54`), carregado só depois do aceite. **Lacuna:** nenhum evento de conversão
  (`sign_up`, `generate_lead`): `sendGAEvent`/`gtag('event')` têm zero ocorrências.
- **`robots.txt`** — `apps/web/app/robots.ts:4-14` é estático, `allow: "/"`, sem depender de env: a
  produção nunca sai com `Disallow: /`. **Lacuna:** `apps/app` e `apps/api` não têm `robots` nem
  `X-Robots-Tag: noindex`, então login, recuperação de senha e verificação de e-mail do painel ficam
  indexáveis. As telas de login e cadastro da landing estão em `Disallow`, o que impede o Google de ler um
  `noindex` nelas.
- **Meta descriptions e títulos** — as 7 páginas da landing têm título e descrição traduzidos com
  `hreflang` (`apps/web/shared/lib/seo.ts:45-69`). **Lacuna:** a copy é de exemplo (home "Início" com a
  stack na descrição, contato com a marca literal "Next Boilerplate"); o painel tem dois títulos para cerca
  de doze telas (`(common)/layout.tsx:24-33`, `admin/layout.tsx:22-31`) e nenhuma descrição; não existe
  `title.template`.

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
  [`research/engineering-baseline.md`](research/engineering-baseline.md).
- Todas as URLs acima foram abertas em 2026-11-19.

## Proposta — corte de MVP

Em fatias, cada uma entregável sozinha:

**Fatia 1: o que um fork herda sem perceber**

- [ ] **`og:image` gerada da marca**: a landing gera a imagem por código com o nome, o logo e a proposta
      vindos da marca configurável, por idioma, com `og:image:alt`; a arte do next-forge sai da `web` e da
      `api`.
- [ ] **404 da landing traduzido**, com a marca e um link para a home, nos três idiomas.
- [ ] **404 da API em JSON**, com `error.code` próprio, para qualquer rota que não existe.
- [ ] **Painel, API e telas de autenticação fora do índice**: `X-Robots-Tag: noindex` em toda resposta do
      `app` e da `api`, e `noindex` nas telas de login e cadastro da landing, que saem do `Disallow`.

**Fatia 2: medição no repositório**

- [ ] **Projeto `mobile` no Playwright** rodando os fluxos críticos e o axe a 390 px.
- [ ] **Lighthouse por comando** (`pnpm lighthouse` ou equivalente) contra o build de produção da landing,
      com os limiares da parte 3 e saída que o relatório de entrega consegue citar.
- [ ] **Teste do sitemap**: a lista bate com as páginas públicas da landing e `lastModified` deixa de ser a
      hora da requisição.

**Fatia 3: títulos e conversão**

- [ ] **Título próprio por tela do painel**, a partir do dicionário, com `title.template` nos layouts.
- [ ] **Eventos `sign_up` e `generate_lead`** pelo `@repo/analytics`, só com consentimento, e um helper para
      o fork registrar os eventos do produto.

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
| `apps/web` | `opengraph-image` por código; `not-found` traduzido; `noindex` nas telas de autenticação e `robots.ts` sem os `Disallow` delas; sitemap com `lastModified` estável; eventos de conversão. |
| `apps/e2e` | Projeto `mobile`; E2E dos formulários sem cobertura que a fatia escolher (contato e esqueci/redefinir senha primeiro). |
| `packages/*` | `seo` (template de título, imagem por página), `analytics` (helper de evento), `security` (`X-Robots-Tag`), `internationalization` (404, títulos, `og:image:alt`). |
| Infra/env | Nenhuma variável nova. O Lighthouse usa `npx`, sem dependência fixa. |

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

- **O `noindex` do painel vai por cabeçalho ou por `robots` no layout?** — **recomendação:** cabeçalho
  (`X-Robots-Tag`) no `applySecurityHeaders`, porque cobre também respostas que não são HTML.
- **O Lighthouse roda no CI?** — **recomendação:** só como comando local e passo opcional do `/deliver`
  nesta spec; o job de CI fica para depois de medir a variação.
