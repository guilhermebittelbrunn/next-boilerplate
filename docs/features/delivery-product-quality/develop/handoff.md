# Handoff do `/develop`: delivery-product-quality, fatia 1

Implementação da fatia 1 conforme `analyze/plan.md`: `og:image` gerada da marca, 404 traduzido da landing com
validação do segmento `[locale]`, 404 em JSON na API e `X-Robots-Tag: noindex` no painel e na API. Nada foi
commitado. O índice do git continua só com o `git mv` de `specs/delivery-infra-hardening.md` que a auditoria
deixou (`git diff --cached --stat` → 1 arquivo).

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| 10.1 opção `noIndex` | `packages/security/middleware.ts` (tipo `ApplySecurityHeadersFlags`, constante `ROBOTS_NOINDEX`, terceiro parâmetro vira objeto), `packages/security/__tests__/csp.test.ts` |
| 10.1 chamadas | `apps/web/proxy.ts` (`{ reportOnly: REPORT_ONLY }`, sem `noIndex`), `apps/app/proxy.ts` (`{ noIndex: true }` nas duas saídas), `apps/api/proxy.ts` (`withSecurityHeaders` com `{ noIndex: true }`) |
| 10.2 rota coringa da API | `apps/api/app/[[...path]]/route.ts` (novo), `apps/api/__tests__/routeNotFound.test.ts` (novo); `apps/api/app/opengraph-image.png` apagado |
| 10.3 imagem social | `apps/web/app/[locale]/opengraph-image.tsx` (novo), `apps/web/shared/lib/openGraph.ts` (novo); `apps/web/app/[locale]/opengraph-image.png` apagado |
| 10.4 metadata | `apps/web/shared/lib/seo.ts` (`openGraphImageUrl`, `openGraph.images`, `indexable`), `apps/web/app/[locale]/sign-in/page.tsx`, `apps/web/app/[locale]/sign-up/page.tsx`, `apps/web/app/robots.ts` |
| 10.5 404 da landing | `apps/web/app/[locale]/layout.tsx`, `apps/web/app/[locale]/not-found.tsx` (novo), `apps/web/app/[locale]/[...rest]/page.tsx` (novo), `apps/web/shared/lib/localeSegment.ts` (novo) |
| 10.6 i18n | `translations/apps/web/pages/notFound/index.ts` (novo), `translations/apps/web/openGraph.ts` (novo), `translations/apps/web/pages/index.ts`, `translations/apps/web/index.ts`, `translations/packages/shared/utils.ts` (todos sob `packages/internationalization/`) |
| 10.7 docs | `docs/FORKING.md` (§3.2 e tabela de checklist), `docs/SECURITY.md` (parágrafo sobre `X-Robots-Tag` em "Cabeçalhos de segurança + CSP") |
| Testes | T1 `packages/security/__tests__/csp.test.ts`; T2 `apps/app/__tests__/securityHeaders.test.ts`; T3 `apps/web/__tests__/securityHeaders.test.ts`; T4 `apps/api/__tests__/requestId.test.ts`; T5 `routeNotFound.test.ts`; T6 `apps/web/__tests__/seo.test.ts`; T7 `openGraph.test.ts`; T8 `robots.test.ts`; T9 `notFoundPage.test.tsx`; T10 `localeSegment.test.ts` (novos em `apps/web/__tests__/`) |

## Contrato

O SDK e os DTOs não mudam. A assinatura pública que mudou é a de `applySecurityHeaders` (`@repo/security/middleware`):
o terceiro parâmetro deixou de ser o booleano `reportOnly` e virou `{ reportOnly?, noIndex? }`. Ela tem três
consumidores, todos ajustados: `apps/web/proxy.ts`, `apps/app/proxy.ts` e `apps/api/proxy.ts`. Um fork que
chame a função com o booleano antigo quebra no typecheck, não em runtime.

`buildLocaleMetadata` (`apps/web/shared/lib/seo.ts`) ganhou o parâmetro opcional `indexable` (padrão `true`) e
passou a devolver `openGraph.images`. As sete páginas da landing usam essa função; só login e cadastro passam
`indexable: false`.

## Códigos de erro novos

`ROUTE_NOT_FOUND` (404). Entrou em `apiErrors` nos três blocos de
`packages/internationalization/translations/packages/shared/utils.ts`, ao lado de `ENTITY_NOT_FOUND`. A
paridade passa (`pnpm --filter @repo/internationalization test` → 67/67).

## Desvios do plano

1. **`CardTitle` não é `h1`.** O plano (§5.4) diz que o 404 tem `h1` "via `CardTitle`, como no app". No design
   system, `CardTitle` renderiza um `div` (`packages/design-system/components/ui/card.tsx:30-38`), e o
   `NotFoundPage` do app também não tem `h1`. No 404 da landing o título vai num `<h1>` dentro do `CardTitle`. O
   T9 afirma o `<h1` no markup. O `NotFoundPage` do app não foi mexido (fora do escopo).
2. **`openGraphImageUrl` mora em `seo.ts`**, não em `openGraph.ts`. Foi a saída que o plano deixou para evitar o
   import circular: `seo.ts` importa `openGraph.ts`, e `openGraph.ts` não importa nada de `seo.ts`.
3. **Função `truncateTagline` exportada.** O plano descreve o corte em 160 caracteres sem nomear a função. Ela
   ficou exportada para o T7 testar o corte direto.
4. **O logo é desenhado com `objectFit: "contain"`.** Sem isso, um logo que não é quadrado sairia deformado no
   quadrado de 112 px.

O plano B do §10.5 (`dynamicParams = false`) não foi necessário: a validação no root layout já devolve 404 para
idioma inválido (medido abaixo).

## Validação

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint/format | `pnpm check` | "Checked 1093 files ... No fixes applied", exit 0 |
| Typecheck + testes | `pnpm turbo run typecheck test --filter=web --filter=app --filter=api --filter=@repo/security --filter=@repo/internationalization` | 18/18 tasks; testes: `api` 1729, `app` 1225, `web` 285, `@repo/security` 65, `@repo/internationalization` 67, todos passando |
| Paridade i18n | `pnpm --filter @repo/internationalization test` | 67/67 |
| Build `web` | `pnpm build` em `apps/web` | exit 0; `/[locale]/opengraph-image` sai como ● SSG com `/pt-br`, `/en`, `/es` |
| Build `api` | `pnpm build` em `apps/api` | exit 0; `ƒ /[[...path]]` na lista de rotas |

O `test:emulator` não rodou. Nenhum arquivo deste diff toca regras do Firestore, Storage ou emulador.

### Smoke em `next start` (build de produção)

Servidores que subi e derrubei (`web` na 3001 e `api` na 3002, as duas portas livres antes). A `api` precisou de
`CORS_ORIGIN="http://localhost:3000,http://localhost:3001"` só no processo, porque sem ele o
`instrumentation` recusa subir em produção e toda rota, inclusive `/health`, responde 500. Isso vem da
configuração local, não deste diff.

- `curl -s -o /dev/null -w '%{http_code}'` na `web`: `/pt-br`, `/en/pricing`, `/es/contact` → 200;
  `/pt-br/esta-pagina-nao-existe`, `/en/a/b/c`, `/es/legal/nao-existe`, `/favicon.ico`, `/api` → 404; `/xyz` → 307.
  Isso confirma o risco que o plano pediu para conferir cedo: `notFound()` no root layout `[locale]` devolve 404.
- `curl -s $WEB/<página> | grep -oE '<meta (property|name)="(og:image|twitter:image|robots)[^>]*>'` em `/pt-br`,
  `/en/pricing`, `/es/sign-in` e `/pt-br/legal/privacy`: `og:image` absoluto em `/<idioma>/opengraph-image`,
  `og:image:width` 1200, `og:image:height` 630, `og:image:alt` no idioma, e `twitter:image` igual. Também
  confirma que a imagem chega às páginas que exportam `openGraph` próprio. Só `/es/sign-in` tem
  `<meta name="robots" content="noindex, follow"/>`.
- `curl -s $WEB/robots.txt` → `User-Agent: *`, `Allow: /`, `Sitemap: ...`, sem `Disallow`.
- `curl -sI` em `/pt-br`, `/pt-br/sign-in`, `/pt-br/opengraph-image`, `/pt-br/nao-existe` e `POST /api/auth/session`
  da `web` → nenhum `x-robots-tag`.
- `curl -s $WEB/<idioma>/opengraph-image | file -` → `PNG image data, 1200 x 630` nos três idiomas, com 43 879,
  42 071 e 43 734 bytes. As três imagens são diferentes entre si (`cmp`).
- Modo degradado: build com `NEXT_PUBLIC_APP_LOGO_URL="https://10.255.255.1/logo.png"` (IP não roteável) → exit 0,
  e o `.next/server/app/pt-br/opengraph-image.body` sai idêntico byte a byte à imagem com monograma (`cmp`).
  Build com um PNG servido em `http://127.0.0.1:8765/logo.png` → exit 0, um `GET /logo.png` no log do servidor
  de teste e imagem diferente da do monograma. Depois disso refiz o build com o `.env` padrão.
- `api`: `GET`, `POST`, `PUT`, `PATCH`, `DELETE` em `/esta-rota-nao-existe`, mais `GET /`, `GET /opengraph-image.png`
  e `GET /entities/x/y/z` → `404 application/json {"error":{"code":"ROUTE_NOT_FOUND"}}`. `HEAD /nao-existe` →
  404 com `x-request-id`, `x-robots-tag: noindex` e `content-type: application/json`. `GET /health` → 200 com
  `x-robots-tag: noindex`. `OPTIONS` com `Origin` permitido → 204 com `x-robots-tag: noindex`. `GET /icon.png`
  → 200. `GET /entities` sem sessão → 401 `AUTH_INVALID_TOKEN`. `PUT /health` → 405, como o plano previa.

Não subi o `app`. O `x-robots-tag` dele está coberto pelo T2 (proxy com mocks) e falta medir com `curl` (V5).

## Achado: o 404 da landing sai com HTML vazio no servidor

As respostas 404 da `web` (`/es/legal/nao-existe`, `/favicon.ico`) vêm com `<html id="__next_error__">` e
`<body>` sem markup: `grep -c '<h1'` → 0, enquanto `/pt-br` dá 1. O título "Página no encontrada" existe, mas
só dentro do payload RSC (`self.__next_f.push`), e o cartão é montado pelo cliente na hidratação. Quando
`notFound()` sobe até o shell numa rota dinâmica, o Next 16.4.6 entra no caminho de recuperação de erro
(`next/dist/server/app-render/app-render.js:2496-2560`), que monta o `errorShell` vazio
(`app-render.js:1323-1330`). Não é algo do layout ou do `not-found.tsx`. A saída seria `global-not-found`, que
é experimental e o plano descartou na Q7. Fica registrado como achado, sem correção.

Consequência prática: com JS ligado o visitante deve ver o 404 dentro do layout; sem JS a página fica em branco
(o status continua 404 e o `<meta name="robots" content="noindex"/>` sai no HTML). Precisa ser confirmado no navegador, ver a lista abaixo.

## A verificar no `/test`

- **404 com JS ligado** (agent-browser): `/<idioma>/esta-pagina-nao-existe` nos 3 idiomas mostra header com a
  marca, footer, título, descrição e botão para `/<idioma>`, em light, dark e 390 px. Medir também o tempo em
  branco antes da hidratação, por causa do achado acima.
- **V5 no `app`**: `curl -sI $APP/pt-br/sign-in`, `$APP/pt-br/entities` (sem sessão, redirect) e
  `$APP/api/auth/session` devem trazer `x-robots-tag: noindex`. Por enquanto só o T2 cobre isso.
- **Imagem no navegador**: abrir `/<idioma>/opengraph-image` nos 3 idiomas e conferir marca, monograma e frase.
  Olhei o PNG de `pt-br` (monograma e com logo) só para saber se o layout montou; isso não conta como validação.
- **V6 completo**: o `curl -sI` no 404 da `web` foi medido (sem `x-robots-tag`); falta repetir em `/en` e `/es`.
- **E2E**: `pnpm e2e` não rodou. Nenhum arquivo de `apps/e2e` cita `opengraph`, `robots`, `favicon` ou o código
  novo (`grep -rln` sem resultado), mas a suíte precisa passar.

## Lacunas de teste conhecidas

- O render do PNG pelo `ImageResponse` e o 404 real do Next ficaram fora do Vitest, como o plano previa. Foram
  medidos no smoke acima, mas não viram regressão automática.
- O T3 afirma a ausência de `x-robots-tag` no proxy da `web`; uma resposta que não passe pelo proxy (arquivo
  estático fora do matcher) não é coberta. Hoje nenhuma rota da `web` grava esse cabeçalho fora do proxy.

## Notas para o `/spec --sync`

- O 404 de idioma inválido da `web` fecha o 🟡 de `/favicon.ico` (`specs/BACKLOG.md:726`) e o 🟢 de `GET /api`
  (`specs/BACKLOG.md:1531`), pelo smoke acima. A confirmação formal é do `/test` (V8).
- Novo: o 404 da landing não tem SSR (achado acima).
- Novo, fora do diff: com `VERCEL_PROJECT_PRODUCTION_URL="http://localhost:3001"` no `.env` local, o Next monta
  o `og:image` do arquivo do layout como `https://http/localhost:3001/...`. Isso só aparece na metadata do 404,
  porque nas páginas o `openGraph.images` explícito substitui o do layout. A causa é o valor com protocolo
  naquela env, que o `metadataBase` de `packages/seo/metadata.ts` não trata.
- Continuam abertos os achados do plano §13: `PUT /health` → 405 sem `error.code` (medido: 405) e o O1 do `app`.

## Incidente de processo

Rodei por engano `git rm --cached apps/api/app/opengraph-image.png`, que preparou a remoção no índice. Desfiz com
`git restore --staged` no mesmo caminho e apaguei o arquivo com `rm`. `git diff --cached --stat` voltou a
mostrar só o rename da auditoria.
