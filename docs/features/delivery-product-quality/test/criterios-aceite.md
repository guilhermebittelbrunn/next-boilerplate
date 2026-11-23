# Critérios de Aceite (Checklist)

Fatia 1 de `delivery-product-quality`: imagem social por idioma, 404 traduzido da landing, 404 em JSON na API e
`noindex` no painel, na API e em login e cadastro da landing. Base: `analyze/plan.md` §9, com dois critérios
reescritos depois da medição do `/test` (marcados abaixo). O status medido de cada item está em `report.md`.

- [ ] **A landing publica uma `og:image` da marca em todas as páginas**
  As sete páginas públicas da landing (home, preços, contato, privacidade, termos, login e cadastro), nos três
  idiomas, emitem `og:image` com URL absoluta para `/<idioma>/opengraph-image`, mais `og:image:width` 1200,
  `og:image:height` 630 e `og:image:alt`. O `twitter:image` sai com a mesma URL, porque o Next copia a imagem
  do Open Graph quando o cartão do X não declara a sua. Uma página com `openGraph` próprio também recebe a
  imagem, porque ela é declarada em `buildLocaleMetadata`, e não só no layout.

- [ ] **A imagem é gerada por código, com a marca e a frase do idioma**
  `GET /<idioma>/opengraph-image` responde `200`, `content-type: image/png`, um PNG de 1200 × 630 abaixo de
  300 KB, com o nome de `NEXT_PUBLIC_APP_NAME` (ou `next-boilerplate` quando a variável está vazia), o logo de
  `NEXT_PUBLIC_APP_LOGO_URL` e a frase de `apps.web.pages.home.meta.description` daquele idioma, cortada em
  160 caracteres com reticências. As três imagens são diferentes entre si e saem no `next build` como rotas
  estáticas (●), sem custo de função por compartilhamento. A arte antiga do next-forge, que citava Prisma e
  PlanetScale, não existe mais em `apps/web` nem em `apps/api`.

- [ ] **A imagem degrada sem logo e com logo inacessível**
  Sem `NEXT_PUBLIC_APP_LOGO_URL`, com uma URL que não responde em 3 s, com status diferente de 200 ou com um
  `content-type` fora de PNG, JPEG e SVG (`image/webp`, `text/html`, ausente), a imagem sai com um monograma
  (a inicial da marca num quadrado escuro) no lugar do logo. Em nenhum desses casos o build falha ou a rota
  responde 500. Nenhuma variável de ambiente nova é necessária.

- [ ] **O `og:image:alt` está no idioma da página**
  O texto alternativo vem de `apps.web.openGraph.imageAlt`, com `{brand}` e `{tagline}` substituídos, nos três
  idiomas ("Cartão de apresentação de …", "… preview card: …", "Tarjeta de presentación de …"). Um idioma não
  suportado passado a `buildLocaleMetadata` cai no idioma padrão sem lançar erro.

- [ ] **O 404 da landing é traduzido, tem caminho de volta e depende de JavaScript** (reescrito no `/test`)
  `/<idioma>/qualquer-coisa`, inclusive com mais de um nível (`/en/a/b/c`) e dentro de uma seção existente
  (`/es/legal/nao-existe`), responde `404` com `<meta name="robots" content="noindex">` no HTML. No navegador
  com JavaScript, a página mostra o 404 dentro do layout da landing: header com a marca e o seletor de idioma,
  footer, título "Página não encontrada" ("Page not found", "Página no encontrada") num `<h1>`, uma descrição e
  um único botão para `/<idioma>`, que leva à home do mesmo idioma. A aba mostra "<título traduzido> |
  <marca>" ("Página não encontrada | next-boilerplate" e os equivalentes), com um único `<title>` no `<head>`,
  e não o "404: This page could not be found." que o Next embute; a página passa no `expectAccessible` (axe,
  WCAG 2.1 AA). Funciona em light, dark e em 390 px sem rolagem horizontal. O HTML que sai do servidor tem só o shell de erro (`<html id="__next_error__">`, corpo
  vazio): sem JavaScript a página fica em branco, e o cartão aparece depois que o cliente monta a árvore. Em
  `main`, o mesmo endereço respondia o 404 padrão do Next, em inglês e sem marca, renderizado no servidor.
  Aceitar essa troca é decisão em aberto do `/review`.

- [ ] **Idioma inválido no primeiro segmento responde 404** (reescrito no `/test`)
  `/favicon.ico` e `/api` (exato), que em `main` respondem `200` com o HTML da home, passam a responder `404`.
  No navegador aparece a página padrão do Next ("404 | This page could not be found."), sem o layout da
  landing e com a aba "404: This page could not be found.", porque quem recusa o segmento é o próprio root
  layout. Assim como no item anterior, ela é montada
  pelo cliente: o HTML do servidor vem com `__next_error__` e corpo vazio. Um primeiro segmento que não parece
  idioma nem arquivo (`/xyz`) continua sendo redirecionado pelo proxy (`307`). As páginas válidas (`/pt-br`,
  `/en/pricing`, `/es/contact`) continuam `200` com o conteúdo no HTML.

- [ ] **A API responde 404 em JSON para rota inexistente**
  `GET`, `POST`, `PUT`, `PATCH` e `DELETE` em qualquer caminho que não exista, inclusive `/`, o antigo
  `/opengraph-image.png` e um subcaminho de rota dinâmica sem handler (`/entities/x/y/z`), respondem `404` com
  `content-type: application/json` e `{ "error": { "code": "ROUTE_NOT_FOUND" } }`. `HEAD` responde 404 sem
  corpo. A resposta mantém CORS para origem permitida, `x-request-id` e os cabeçalhos de segurança. Uma origem
  recusada continua recebendo `403 AUTH_FORBIDDEN_ORIGIN`. O código tem texto em `apiErrors` nos três idiomas.
  Um método não suportado numa rota que existe (`PUT /health`) continua `405`, fora desta fatia.

- [ ] **Painel e API saem do índice por cabeçalho**
  Toda resposta do `app` que passa pelo proxy (login, cadastro, o redirect `307` de uma rota autenticada sem
  sessão para `/pt-br/sign-in`, `/api/auth/session` em qualquer método) e toda resposta da `api` (sucesso, 401,
  404, 405, recusa de origem, preflight e a recusa `429` por limite de taxa) leva `x-robots-tag: noindex`. Não é
  preciso estar logado para ver o cabeçalho.

- [ ] **A landing nunca recebe `X-Robots-Tag`**
  Nenhuma resposta da `web` leva `x-robots-tag`: páginas (incluindo login e cadastro), a rota da imagem nos três
  idiomas, o 404 em pt-br, en e es, o 404 de idioma inválido, `robots.txt`, `sitemap.xml`, `/api/auth/session` e
  o redirect `307`. Um teste automatizado afirma essa ausência, porque o erro aqui tira o site inteiro da busca e
  só aparece semanas depois.

- [ ] **Login e cadastro da landing saem do índice sem bloquear o rastreador**
  `/<idioma>/sign-in` e `/<idioma>/sign-up` emitem `<meta name="robots" content="noindex, follow">` nos três
  idiomas, e o `robots.txt` da landing não tem `Disallow` para eles (o rastreador precisa ler a página para ver o
  `noindex`). As outras cinco páginas não emitem `robots` e continuam indexáveis; o `robots.txt` mantém
  `Allow: /` e a linha `Sitemap:`.

- [ ] **Nada muda no SDK nem nos dados, e as suítes continuam verdes**
  Nenhuma action, DTO, coleção ou variável de ambiente nova. `pnpm test` (incluindo `test:emulator`) passa, e o
  `pnpm e2e` existente continua verde, agora com dois passos que cobrem o 404 da landing: o status e o cartão
  traduzido com o botão de volta, e o `404` de `/favicon.ico` e `/api`.

- [ ] **Validação externa da imagem social** (não verificável sem infra)
  Colar a URL da landing publicada num validador de Open Graph (opengraph.xyz, Sharing Debugger da Meta, Post
  Inspector do LinkedIn) mostra o cartão com a imagem e o texto do idioma. Exige domínio público e
  `NEXT_PUBLIC_WEB_URL` de produção; sem isso a `og:image` aponta para localhost. O `noindex` das previews da
  Vercel é configuração do projeto na Vercel, não código.
