# Revisão: delivery-product-quality, fatia 1

Revisão do diff da fatia 1 (`og:image` gerada, 404 traduzido da landing, 404 em JSON na API, `X-Robots-Tag`
no painel e na API, `noindex` em login e cadastro). Rodou dentro do `/cycle`, sem perguntas ao usuário, em duas
rodadas. A primeira não mexeu em código. A segunda, depois do `/test`, corrigiu o 404 sem `<title>` (seção
"Rodada 2" no fim).

## Branch

- Nome: `feat/delivery-product-quality`, criada com `git switch -c` a partir de
  `guilhermebittelbrunn/cycle-command-v12` (mesmo commit de `origin/main`, `afb5b35`, zero commits à frente e
  sem upstream). O working tree e o índice vieram junto.
- Sem prefixo de projeto porque a feature cruza `packages/security`, `apps/api`, `apps/app`, `apps/web` e
  `packages/internationalization`.
- Regex do `/review`: `branch OK: feat/delivery-product-quality`.
- A branch de origem estava fora do padrão `<project>/<type>/<title>`. Não foi renomeada: é a branch do
  workspace do Conductor.

## Revisão

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/web/app/[locale]/[...rest]/page.tsx:4` + `apps/web/app/[locale]/not-found.tsx`: o 404 da landing
  com idioma válido chega do servidor sem corpo (`<html id="__next_error__">`). Conferi a causa lendo o código
  do Next 16.4.6 instalado e ela é a que o handoff descreveu, mas não é específica desta versão:
  - o `HTTPAccessFallbackBoundary` que mostra o `not-found.tsx` é um error boundary de cliente
    (`next/dist/client/components/http-access-fallback/error-boundary.js:63-90`);
  - o renderizador de HTML do React no servidor não executa error boundaries
    (`next/dist/compiled/react-dom/cjs/react-dom-server.node.production.js` não contém
    `getDerivedStateFromError`);
  - então o `notFound()` lançado pela página sobe até o shell, e o Next entra na recuperação de erro
    (`app-render.js:2489-2510`), que devolve o `errorShell` vazio (`app-render.js:1321-1330`) com o payload
    RSC da renderização original embutido (`app-render.js:2573-2577`). No navegador, o cliente monta a árvore
    a partir desse payload e o boundary mostra o 404 dentro do layout.

  O `not-found.tsx` está no nível certo (mesmo segmento do root layout, envolve o `children` do layout), e o
  layout não lança nada para idioma válido (`layout.tsx:24` só rejeita o que não está em `locales`). Não há
  correção dentro do corte que mantenha o status 404. Renderizar o cartão direto em `[...rest]` daria 200
  (soft 404). Um `Suspense` em volta do `children` entregaria header e footer no HTML, mas com status que só
  medindo dá para saber (o `/test` mediu na rodada 2: vira 200). `global-not-found` é experimental e foi
  descartado na Q7 do plano.

  **É regressão do HTML do servidor.** Em `main`, `/pt-br/qualquer-coisa` não casava com rota nenhuma e caía
  no `/_not-found` gerado pelo Next, que usa o layout e o `not-found` embutidos como página, sem `notFound()`
  lançado (`next/dist/build/webpack/loaders/next-app-loader/index.js:362-430`). Esse 404 sai renderizado no
  servidor, em inglês, sem marca, com `<h1 class="next-error-h1">404</h1>`. Agora o 404 é traduzido e fica
  dentro do layout, mas só com JS. Status 404 e `<meta name="robots" content="noindex">` continuam no HTML.
  Ficou em "Decisões em aberto".
- ~~O critério "Idioma inválido no primeiro segmento responde 404" descreve errado a página.~~ Derrubado pelo
  `/test`. Quem lança é o próprio root layout (`localeSegment.ts:11`) e o HTML do servidor sai como
  `__next_error__` vazio, como eu previa. Mas no navegador o cliente monta a página padrão do Next,
  "404 | This page could not be found.", e não uma página em branco. O critério estava certo.

### 🟢 Sugestão / nit

- `og:image` como `https://http/localhost:3001/...` na metadata do 404: é configuração local. O Next monta a
  base da imagem de arquivo com `` `https://${VERCEL_PROJECT_PRODUCTION_URL}` `` sem tratar protocolo
  (`next/dist/lib/metadata/resolvers/resolve-url.js:54-57`), e só usa esse fallback quando a rota não declara
  `metadataBase`. As páginas declaram, via `createMetadata`, cujo `resolveMetadataBase`
  (`packages/seo/metadata.ts:18-31`) já aceita a env com ou sem protocolo. O handoff atribuiu o defeito a esse
  `metadataBase`, o que não procede. O 404 não exporta metadata, então cai no fallback do Next. Na Vercel a env
  vem sem protocolo e o problema não aparece. Imagem social em página 404 não tem uso, então não mexi.
- `apps/web/app/[locale]/opengraph-image.tsx`: `generateStaticParams` gera os três idiomas, mas não há
  `dynamicParams = false`. `/favicon.ico/opengraph-image` passa pelo matcher do proxy (ele exclui o que começa
  com `favicon.ico`), chega à rota da imagem com `locale = "favicon.ico"` e, pela leitura, responde 200 com a
  imagem do idioma padrão, gerada sob demanda. Inofensivo. Fica de nota para uma rodada futura.
- O 404 da landing não tem `<title>` próprio: nem o layout nem o `[...rest]` exportam metadata. Marquei como
  nit na rodada 1. O `/test` mediu `document.title` vazio e o classificou como defeito (WCAG 2.4.2). Corrigido
  na rodada 2.

### ✅ OK

- `packages/security/middleware.ts:153-185`: o terceiro parâmetro virou objeto `{ reportOnly, noIndex }`, com
  os dois desligados por padrão. Os três consumidores foram ajustados (`apps/web/proxy.ts:95,100`,
  `apps/app/proxy.ts:200,205`, `apps/api/proxy.ts:138`). Nenhum outro chamador no repo (`rg`).
- A landing não liga `noIndex`. O T3 (`apps/web/__tests__/securityHeaders.test.ts`) afirma a ausência do
  cabeçalho em `/pt-br`, `/en/pricing`, `/` e `POST /api/auth/session`.
- `apps/api/app/[[...path]]/route.ts`: sem guard, e está certo assim, porque não lê corpo nem dado. Responde
  `{ error: { code: "ROUTE_NOT_FOUND" } }` com `HTTP_STATUS.NOT_FOUND`. `HEAD` e `OPTIONS` ficam com o Next e
  o proxy. O código novo tem texto nos três blocos de `apiErrors` (`utils.ts:116,299,488`).
- `apps/web/shared/lib/seo.ts`: `openGraph.images` com URL absoluta, 1200 × 630 e `alt` traduzido;
  `indexable: false` gera `robots: { index: false, follow: true }`. Não há import circular: `seo.ts` importa
  `openGraph.ts`, e o contrário não acontece.
- `apps/web/app/robots.ts`: sem `Disallow`, como manda o plano (o rastreador precisa ler a página para ver o
  `noindex`).
- `loadBrandLogo` (`openGraph.ts:60-84`): timeout de 3 s, lista fechada de `content-type`, qualquer falha cai
  no monograma.
- i18n: chaves novas (`apps.web.pages.notFound`, `apps.web.openGraph.imageAlt`, `ROUTE_NOT_FOUND`) nos três
  idiomas, nenhuma string solta em JSX, variável descritiva (`notFoundCopy`).
- Comentários: os quatro novos explicam um porquê que o código não mostra (cores em hex para o renderizador
  da imagem, por que a imagem é declarada em `buildLocaleMetadata`, por que `noindex` e não `Disallow`, por que
  o root layout valida o idioma). Nenhum cita plano, etapa ou spec.
- Testes T1 a T10 no nível mais barato (unit e proxy com mocks), sem emulador e sem rede.
- Spec: o diff cobre o corte da fatia 1 de `specs/delivery-product-quality.md` e nada das fatias 2 e 3.

### 👁 Verificar no `/test`

Em ordem de risco. Tudo contra `pnpm --filter web build && pnpm --filter web start` (porta 3001).

1. **404 com idioma válido, HTML do servidor.** `curl -s localhost:3001/pt-br/xxx | grep -c '<h1'` (esperado
   pela leitura: `0`) e `curl -s localhost:3001/pt-br/xxx | grep -o '<html[^>]*>'` (esperado:
   `id="__next_error__"`). Repetir em `/en/a/b/c` e `/es/legal/nao-existe`. Status com
   `curl -s -o /dev/null -w '%{http_code}'` (esperado: 404).
2. **Comparação com `main`.** Num worktree de `main` (`git worktree add /tmp/main-wt origin/main`), build e
   start da `web`, depois `curl -s localhost:3001/pt-br/xxx | grep -c '<h1'`. Esperado pela leitura: `1`, com
   "This page could not be found." no HTML. Se der isso, a regressão do HTML do servidor está confirmada.
   Derrubar o processo e remover o worktree no fim.
3. **404 com idioma válido, navegador com JS.** `/<idioma>/esta-pagina-nao-existe` nos três idiomas: header
   com a marca, footer, título, descrição e botão para `/<idioma>`, em light, dark e 390 px. Anotar quanto
   tempo a página fica em branco antes do cartão aparecer.
4. **404 de idioma inválido.** `curl` em `/favicon.ico` e `/api` (status 404, HTML `__next_error__`) e o mesmo
   no navegador: anotar o que aparece (pela leitura, página em branco, e não a página padrão do Next que o
   critério descreve).
5. **V5 no `app`.** `curl -sI` em `$APP/pt-br/sign-in`, `$APP/pt-br/entities` sem sessão e
   `$APP/api/auth/session`: esperado `x-robots-tag: noindex`. Hoje só o T2, com mocks, cobre isso.
6. **V6 completo na `web`.** `curl -sI` no 404 em `/en` e `/es`, além de `/pt-br`, `/pt-br/sign-in`,
   `/api/auth/session` e `/pt-br/opengraph-image`: nenhum `x-robots-tag`.
7. **Imagem no navegador.** `/<idioma>/opengraph-image` nos três idiomas: marca, monograma ou logo e a frase do
   idioma. O `/develop` olhou só o PNG de `pt-br`.
8. **`pnpm e2e`.** Não rodou em nenhuma etapa.

## Lacunas de teste

Vereditos sobre as lacunas que o handoff listou:

- Render do PNG pelo `ImageResponse` e 404 real do Next fora do Vitest: **continua aberta**, por decisão do
  plano. Os itens 1 a 4 e 7 acima medem em runtime.
- O T3 não cobre resposta que não passa pelo proxy da `web` (arquivo estático fora do matcher): **continua
  aberta**, risco baixo. Nenhuma rota da `web` grava `x-robots-tag` fora do proxy (`rg` sem resultado).
- Nova: nada automatizado prova que o 404 da landing mostra o cartão no navegador. O E2E da landing pode
  cobrir isso num passo; fica para o `/test` decidir se vale.

## Decisões em aberto

1. **404 da landing sem HTML no servidor.** Opções:
   - (a) aceitar. O status 404 e o `noindex` continuam corretos, e o buscador não indexa corpo de 404. Quem
     tem JS vê o 404 traduzido dentro do layout; quem não tem vê página em branco, onde antes via o 404 em
     inglês do Next;
   - (b) experimentar um `Suspense` em volta do `children` no layout para header e footer saírem no HTML. Só
     serve se o `/test` medir que o status continua 404;
   - (c) `global-not-found` experimental, já descartado na Q7.

   Recomendação: (a), com o critério do plano corrigido para dizer que o 404 depende de JS. Vira achado no
   `/spec --sync`. A opção (b) saiu da mesa na rodada 2: o `/test` mediu e o 404 vira 200.
2. ~~Texto do critério de idioma inválido.~~ Resolvida: o `/test` mediu a página padrão do Next no navegador, e o
   critério estava certo.

## Gates

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint/format | `pnpm check` | "Checked 1093 files in 1037ms. No fixes applied." |
| Typecheck | `pnpm turbo run typecheck --filter=web --filter=app --filter=api --filter=@repo/security --filter=@repo/internationalization` | 5/5, todos do cache (nenhum arquivo mudou desde o `/develop`) |
| Paridade i18n | `pnpm --filter @repo/internationalization test` | 67/67 |

A suíte Vitest dos apps não foi rodada aqui. Ela é do `/test`, e o handoff já registrou os números.

## Varredura de segredo

`rg` por senha, token, chave, `sk_`/`pk_`, `AIza`, chave privada e e-mail em
`docs/features/delivery-product-quality/`: só falsos positivos (`AUTH_INVALID_TOKEN`, "tokens claros" do tema,
`objectFit: "contain"`). Nenhum print versionado.

## Rodada 2

O `/test` gravou `test/report.md` e `test/criterios-aceite.md` com 11 ✅, 0 ❌ e 1 🔒, e trouxe três resultados
que mudam esta revisão.

### Corrigido: o 404 da landing não tinha `<title>`

`document.title` saía vazio nos três idiomas (WCAG 2.4.2), e por isso o `/test` não chamou `expectAccessible` no
E2E do 404.

O mecanismo foi escolhido lendo o Next instalado. O `not-found.tsx` aceita `metadata` e `generateMetadata`: o
Next lê o módulo da convenção de erro (`next/dist/lib/metadata/resolve-metadata.js:113-120`), e a recuperação de
erro resolve a metadata com `errorType` (`app-render.js:1284-1300`, `lib/metadata/metadata.js:142-144`). Mas essa
metadata vai só para o shell de erro. O cliente monta o 404 a partir do payload da renderização original
(`app-render.js:2573-2577`), cuja metadata é a do layout e da página `[...rest]`, sem título. Então a saída foi um
`<title>` renderizado no próprio componente, que o React 19 iça para o `<head>` quando o cartão é montado. É o
mesmo recurso que o 404 embutido do Next usa (`client/components/http-access-fallback/error-fallback.js:16-18`).

- `apps/web/app/[locale]/not-found.tsx`: `<title>{`${notFoundCopy.title} | ${getBrand().name}`}</title>`, no
  formato `Título | Marca` que o `createMetadata` dá às outras páginas. Nenhuma chave nova de i18n. Um
  comentário de duas linhas explica por que o título está no componente e não na metadata.
- `apps/web/__tests__/notFoundPage.test.tsx`: caso novo nos três idiomas, que exige um único `<title>` igual a
  `<título do idioma> | Acme`. O arquivo passou com 6 de 6 testes (`pnpm exec vitest run
  __tests__/notFoundPage.test.tsx`). Rodei só este arquivo, porque é a cobertura que acrescentei.
- `apps/e2e/tests/landing.spec.ts`: no teste do 404 que o `/test` criou, entraram
  `toHaveTitle(/^Página não encontrada \| /)` e `expectAccessible(page, testInfo, { route: "web:/pt-br/esta-pagina-nao-existe" })`.
  A marca fica fora da asserção porque o E2E não fixa `NEXT_PUBLIC_APP_NAME`.

Medição barata, com a porta 3001 livre antes e depois (subi com `next start`, derrubei pelo PID):
`pnpm --filter web build` e `curl` em `/pt-br/xxx`, `/en/a/b/c` e `/es/legal/nao-existe`. Os três respondem 404,
`<html id="__next_error__">`, zero `<h1` e nenhuma tag `<title>` no HTML, como esperado. No payload RSC aparecem
`"title",null,{"children":"Página não encontrada | next-boilerplate"}` (e `Page not found | next-boilerplate` em
`/en/x`). O payload também traz `"404: This page could not be found."`, o título do 404 embutido do Next. Não confirmei de
onde ele vem; o mais provável é o 404 que o Next usa quando o root layout falha, o do caso de idioma inválido. Qual dos dois vira o
`document.title` no navegador é medição do `/test`.

### Confirmado pelo `/test`

- Regressão do HTML do servidor: nesta branch, `<h1` = 0 e `__next_error__`; em `main`, `<h1` = 1 e "This page
  could not be found.". Fica a decisão 1, com a recomendação (a).
- O `Suspense` em volta do `children` (opção b) foi medido e transforma o 404 em 200. Descartado.
- Idioma inválido mostra no navegador a página padrão do Next. Achado da rodada 1 corrigido acima.
- `pnpm e2e`: 30 de 31. A falha em `organizationOwnership.spec.ts:68` também acontece em `main`, por tempo sob
  `next dev`. Não é desta fatia.

### Gates da rodada 2

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint/format | `pnpm check` | "Checked 1093 files in 3s. No fixes applied." |
| Typecheck | `pnpm turbo run typecheck --filter=web --filter=e2e` | 2/2 |
| Paridade i18n | não rodou | nenhuma chave mudou nesta rodada; o 67/67 da rodada 1 vale |
| Teste do 404 | `pnpm exec vitest run __tests__/notFoundPage.test.tsx` em `apps/web` | 6/6 |

### O que o `/test` precisa medir de novo

1. `document.title` no navegador em `/<idioma>/esta-pagina-nao-existe`, nos três idiomas. Esperado:
   `<título do idioma> | <marca>`, e não `404: This page could not be found.`.
2. `pnpm e2e --grep "unknown landing path"`: o teste do 404, agora com `toHaveTitle` e `expectAccessible`. Se o
   axe apontar violação no cartão do 404, ela é desta fatia.
3. `document.title` em `/favicon.ico`: segue `404: This page could not be found.`, sem mudança.

### Varredura de segredo dos artefatos do `/test`

`rg` por senha, segredo, chave, `sk_`/`pk_`, `AIza`, chave privada e e-mail em `test/`: nada. Os screenshots de
`test/e2e/` ficam fora pelo `.gitignore` (`.gitignore:302`).

## Plano de commits

O índice **não está vazio**: tem o `git mv specs/delivery-infra-hardening.md →
docs/features/delivery-infra-hardening/spec.md` da auditoria do backlog. Antes do commit 1, tire o rename do
índice sem mexer no working tree:

```bash
git restore --staged specs/delivery-infra-hardening.md docs/features/delivery-infra-hardening/spec.md
git diff --cached --stat   # tem de sair vazio
```

No commit 13, os dois caminhos voltam juntos com `git add -A` e o git reconhece o rename.

`apps/web/shared/lib/seo.ts` carrega a imagem social e o `indexable` no mesmo arquivo. Sem `git add -p`, ele
entra inteiro no commit 6, junto com o `seo.test.ts`, que cobre as duas coisas. Entre o commit 1 e o 5, o
`apps/web/proxy.ts` ainda passa o booleano antigo; entre o 6 e o 9, a `web` lê chaves de i18n que só entram no
commit 9. É a consequência da ordem `packages → api → app → web → i18n` que a regra de commits impõe.

O E2E do 404 vai num commit `test(e2e)` próprio, o 10, depois do i18n. `apps/e2e` é outro workspace, e a regra
é um commit por app. Ele também lê `ptBr.apps.web.pages.notFound`, que só existe a partir do commit 9.

| # | Mensagem | Arquivos |
|---|----------|----------|
| 1 | `feat(security): add a noIndex option to applySecurityHeaders` | `packages/security/middleware.ts`, `packages/security/__tests__/csp.test.ts` |
| 2 | `feat(api): send X-Robots-Tag noindex on every api response` | `apps/api/proxy.ts`, `apps/api/__tests__/requestId.test.ts` |
| 3 | `feat(api): answer unknown routes with a JSON ROUTE_NOT_FOUND` | `apps/api/app/[[...path]]/route.ts`, `apps/api/__tests__/routeNotFound.test.ts`, `apps/api/app/opengraph-image.png` (remoção) |
| 4 | `feat(app): send X-Robots-Tag noindex on every panel response` | `apps/app/proxy.ts`, `apps/app/__tests__/securityHeaders.test.ts` |
| 5 | `refactor(web): pass the CSP report-only flag as an option object` | `apps/web/proxy.ts`, `apps/web/__tests__/securityHeaders.test.ts` |
| 6 | `feat(web): generate the share image per locale with next/og` | `apps/web/app/[locale]/opengraph-image.tsx`, `apps/web/app/[locale]/opengraph-image.png` (remoção), `apps/web/shared/lib/openGraph.ts`, `apps/web/shared/lib/seo.ts`, `apps/web/__tests__/openGraph.test.ts`, `apps/web/__tests__/seo.test.ts` |
| 7 | `feat(web): keep sign-in and sign-up out of search with noindex` | `apps/web/app/[locale]/sign-in/page.tsx`, `apps/web/app/[locale]/sign-up/page.tsx`, `apps/web/app/robots.ts`, `apps/web/__tests__/robots.test.ts` |
| 8 | `feat(web): translated 404 page and 404 for unknown locale segments` | `apps/web/app/[locale]/layout.tsx`, `apps/web/app/[locale]/not-found.tsx`, `apps/web/app/[locale]/[...rest]/page.tsx`, `apps/web/shared/lib/localeSegment.ts`, `apps/web/__tests__/localeSegment.test.ts`, `apps/web/__tests__/notFoundPage.test.tsx` |
| 9 | `feat(internationalization): add landing 404, share image alt and ROUTE_NOT_FOUND copy` | `packages/internationalization/translations/apps/web/index.ts`, `packages/internationalization/translations/apps/web/openGraph.ts`, `packages/internationalization/translations/apps/web/pages/index.ts`, `packages/internationalization/translations/apps/web/pages/notFound/index.ts`, `packages/internationalization/translations/packages/shared/utils.ts` |
| 10 | `test(e2e): cover the landing 404 and unknown locale segments` | `apps/e2e/tests/landing.spec.ts` |
| 11 | `docs: document the generated share image and the noindex surfaces` | `docs/FORKING.md`, `docs/SECURITY.md` |
| 12 | `docs: link the delivery guide to the archived infra hardening spec` | `docs/delivery/README.md` |
| 13 | `docs(specs): archive delivery-infra-hardening and sync the backlog` | `specs/delivery-infra-hardening.md` (remoção) + `docs/features/delivery-infra-hardening/spec.md` (rename com edição), `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/delivery-security-review.md`, `specs/observability-logging.md`, `specs/social-sign-in-providers.md` |
| 14 | `docs(features): delivery-product-quality` | `docs/features/delivery-product-quality/STATE.md`, `docs/features/delivery-product-quality/analyze/plan.md`, `docs/features/delivery-product-quality/develop/handoff.md`, `docs/features/delivery-product-quality/review/review.md`, `docs/features/delivery-product-quality/test/criterios-aceite.md`, `docs/features/delivery-product-quality/test/report.md` |

Título de PR sugerido: `feat: delivery part 3 slice 1 (share image, translated 404, noindex)`. Depois do último
commit aprovado, o `/review` pergunta se faz `git push -u origin feat/delivery-product-quality`.

### Commits realizados

_(preenchido pelo orquestrador)_
