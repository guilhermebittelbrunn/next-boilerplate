# Revisão: server-locale-from-url

Rodada autônoma do `/cycle`, em 2026-10-07. Escopo: o diff do working tree mais os três arquivos novos
(`packages/internationalization/__tests__/serverDictionary.test.ts`, `apps/web/__tests__/proxyLocale.test.ts`,
esta pasta). A revisão leu código e rodou só os gates estáticos; não subiu app nem rodou a suíte.

Houve uma segunda rodada, depois do `/test`: o achado O2 do `test/report.md` (o `<html lang>` da app não
acompanha a troca suave de idioma) pertence ao critério 2 desta tarefa e foi corrigido aqui. Ver "Rodada 2".

## Branch

- Nome: `fix/server-locale-from-url`, criada com `git switch -c` a partir do HEAD de
  `guilhermebittelbrunn/cycle-command` (`5f4a8e9`, igual a `origin/main`, sem commit à frente e sem upstream).
  O working tree veio junto; o índice ficou vazio (`git diff --cached --stat` sem saída).
- Sem `project` no prefixo porque o diff cruza `packages/internationalization`, `apps/web` e `apps/app`. A
  regra de `.claude/rules/git-commits.md` manda omitir o escopo quando há vários apps, e é a única forma sem
  prefixo que a regex aceita. Tipo `fix`: a tarefa corrige o idioma errado no render do servidor.
- Regex do Passo 3 do `/review`: `branch OK: fix/server-locale-from-url`.
- A branch antiga continua existindo e não foi renomeada (é a branch do workspace do Conductor).

## Achados

| sev. | arquivo:linha | problema | ação |
|------|---------------|----------|------|
| 🟡 | `packages/internationalization/utils.ts:7` | O JSDoc de `LOCALE_REQUEST_HEADER` dizia que qualquer valor do navegador é substituído. Fora do `matcher` dos proxies (`/api/*`, `_next/*`, `favicon.ico`) ninguém substitui nada. | Corrigido: o comentário diz que o proxy grava o header e que quem lê tem de validar contra `locales`. |
| 🟡 | `docs/ARCHITECTURE.md:64` | Mesma afirmação ("sobrescrevendo qualquer valor"), e "rota fora do ramo final do proxy" sugeria que essas rotas chegam sem header. | Corrigido: o texto separa o caso do matcher, diz que fora dele o header chega como o navegador mandou e que o efeito máximo é escolher o idioma da própria resposta. |
| 🟢 | `apps/app/app/not-found.tsx` + `apps/app/app/layout.tsx:48` | `/api/inexistente` (e `_next/static/...` inexistente) na app fica fora do matcher, cai no 404 raiz, e o root layout e a `NotFoundPage` chamam `getDictionary()` com o header do navegador. `getDictionary()` só aceita `pt-br`/`en`/`es` (`server.ts:15-17`), a resposta é dinâmica (lê `headers()`/`cookies()`) e nada mais lê o header. Efeito: o próprio cliente escolhe o idioma do próprio 404. | Aceito e documentado no `ARCHITECTURE.md`. Não vale mexer no matcher por isso. |
| 🟡 | `apps/app/app/layout.tsx:66-78` | (Rodada 2, O2 do `/test`.) O `<html>` da app fica no root layout, acima de `[locale]`, e não renderiza de novo numa navegação suave. Trocar de `/en/entities` para `/es/entities` pelo `LanguageSwitcher` traduz a página e deixa `lang="en"` até recarregar. Medido igual no `HEAD`, mas o critério 2 pede o `lang` acompanhando a URL sem atraso. | Corrigido com `DocumentLangSync` (ver "Rodada 2"). |
| 🟢 | `apps/app/proxy.ts:203,213` · `apps/web/proxy.ts:99,110` | Os proxies redirecionam para `getDefaultLocale()` sem validar. Com `NEXT_PUBLIC_DEFAULT_LOCALE=pt-BR`, `/` vai para `/pt-BR/`, que não é idioma válido e redireciona de novo sem fim. Dívida anterior a esta tarefa (`packages/next-config/keys.ts:27` aceita qualquer string). | Fora de escopo. Registrado aqui para virar item do backlog; `getDictionary()` já cai em `pt-br` nesse caso. |
| ✅ | `apps/web/proxy.ts:130-134` · `apps/app/proxy.ts:260-265` | Todo ramo que renderiza passa pelo `NextResponse.next` final com `set`, nunca `append`. Redirects e 403 do Arcjet não renderizam. O ramo de asset da app apaga o header quando vem do navegador (`proxy.ts:164-172`). | Nada a fazer. |
| ✅ | `packages/internationalization/server.ts:24-37` | Ordem header válido, cookie válido, padrão. O único comportamento novo no fallback é o padrão inválido virar `pt-br` em vez de `dictionary: undefined`. Cookie válido, cookie ausente, cookie vazio e `NEXT_PUBLIC_DEFAULT_LOCALE=""` dão o mesmo resultado de antes (`resolveLocale` em `utils.ts:27-38`). | Nada a fazer. |
| ✅ | `packages/internationalization/server.ts:29-30` | O comentário afirma que o cookie gravado pelo proxy só chega na requisição seguinte. Conferido no Next 16.0.0: `cookies().set` dentro do middleware vira `set-cookie` direto na resposta (`next/dist/server/web/adapter.js:272-273`). O merge para o render da mesma requisição (`x-middleware-set-cookie`, `request-store.js:45-60`) só acontece com `NextResponse.cookies.set`, que os proxies não usam. O defeito era real e o comentário é verdadeiro. | Nada a fazer. |
| ✅ | `apps/app/__tests__/proxy.test.ts:49` · `apps/web/__tests__/proxyLocale.test.ts:23` | Os testes leem `x-middleware-request-*` e `x-middleware-override-headers`, formato interno do Next. Os testes de `x-app-path` em `HEAD` já faziam isso (3 ocorrências de `x-middleware-request-x-app-path`). Mesmo padrão, mesmo risco de upgrade. | Aceito. |
| ✅ | `apps/app/shared/components/ui/NotFoundPage.tsx:16` | A função local que repetia a lógica antiga saiu e a página usa `getDictionary()`. Os outros testes que tocam `getDictionary()` (`pricingPage`, `brandSurfaces`, `contactAction` na web) mocam `@repo/internationalization/server` inteiro, então o `headers()` novo não os afeta. | Nada a fazer. |
| ✅ | docs | `AGENTS.md:25`, `apps/app/CLAUDE.md:47`, `.claude/skills/i18n-sync/SKILL.md:14` batem com o código. `apps/app/CLAUDE.md:81`: só existe `apps/app/app/not-found.tsx`. Âncoras do `PRE-PRODUCTION.md:414` conferidas (`server.ts:13`, `apps/app/proxy.ts:214,218`, `apps/web/proxy.ts:111,115`). | Nada a fazer. |
| ✅ | comentários | `server.ts:29-30`, `apps/web/proxy.ts:130-131`, `apps/app/proxy.ts:159-163` e `:260-261` explicam o porquê e não citam o fluxo. O comentário removido do `pricing/page.tsx` descrevia o cookie desatualizado, que deixou de ser o caso. | Nada a fazer. |

Nada bloqueante. O `/code-review` (esforço baixo) não devolveu achado.

## Correções aplicadas

- `packages/internationalization/utils.ts:7-10`: JSDoc de `LOCALE_REQUEST_HEADER` reescrito. Antes: "any
  value the browser sent is replaced". Depois: o proxy grava o segmento da URL; rotas fora do matcher recebem
  o que o navegador mandou, então quem lê valida contra `locales`.
- `docs/ARCHITECTURE.md:64`: o trecho sobre o header passa a separar a rota sob o matcher (header
  sobrescrito) da rota fora dele (header do navegador, limitado aos três idiomas).

Essas duas não mudam comportamento. A da rodada 2 muda, e está descrita na seção seguinte.

## Rodada 2: `<html lang>` na troca suave de idioma (O2)

O que mudou:

- `apps/app/shared/components/DocumentLangSync.tsx` (novo): componente client que lê `useParams().locale` e,
  quando o segmento é um dos três idiomas, grava `document.documentElement.lang` num efeito. Sem segmento ou
  com segmento inválido, não faz nada.
- `apps/app/app/layout.tsx:78`: monta `<DocumentLangSync />` no `<body>`, antes do `LocaleProvider`.
- `apps/app/__tests__/documentLangSync.test.tsx` (novo, 3 casos em jsdom): segue o segmento numa troca
  (`en` para `es`); rota sem segmento mantém o `lang` do servidor; segmento inválido (`favicon-novo.png`) é
  ignorado.

Alternativas descartadas:

- Mover o `<html>` para um layout de `[locale]`: a app tem rota fora do segmento (`app/not-found.tsx`, que
  renderiza no root layout), e ela ficaria sem `<html>`.
- Efeito no `LocaleProvider` (`packages/internationalization/client.ts`), como o `/test` sugeriu: atinge as
  duas apps, e a web não precisa (o `<html>` dela já fica em `app/[locale]/layout.tsx`). Além disso, o
  provider resolve idioma ausente para o padrão (`resolveLocale(null)`), então gravaria `pt-br` por cima do
  `lang` que o servidor deu ao 404 raiz.
- Criar `app/[locale]/layout.tsx` só para montar o componente: um arquivo de rota a mais para o mesmo
  efeito; a guarda do segmento já deixa o 404 raiz intacto.

Efeito no 404 raiz e nas rotas fora de `[locale]`: nenhum. Sem `locale` nos params, o componente não toca no
`lang`. Em `/en/rota-inexistente`, se o Next expuser `locale: "en"`, o efeito grava o mesmo valor que o
servidor já renderizou.

Prova de falha antes e depois (`npx vitest run __tests__/documentLangSync.test.tsx` em `apps/app`):

- com o componente devolvendo `null` sem efeito: 1 falha, 2 passam. Falha "follows the locale segment
  across a soft navigation" com `expected 'en' to be 'es'`. Os dois que passam são regressão declarada (não
  tocar no `lang` sem segmento válido);
- com a correção: 3/3.

## Raio de impacto

- Contrato novo: o header de requisição `x-request-locale`. Quem escreve: `apps/web/proxy.ts:133`,
  `apps/app/proxy.ts:264` (e `:170` apaga). Quem lê: só `packages/internationalization/server.ts:31`.
- `getDictionary()` do servidor tem 18 chamadores (16 na web, 2 na app, mais a `NotFoundPage`). Nenhum mudou
  de assinatura. Os dois root layouts (`apps/web/app/[locale]/layout.tsx:23`, `apps/app/app/layout.tsx:48`)
  passam a ter `lang` vindo da URL.
- `apps/app/app/page.tsx` e `apps/web/app/page.tsx` chamam `getDictionary()` em `/`, mas o proxy redireciona
  `/` antes de renderizar.
- Sem SDK, API, Firestore, env, chave de i18n ou `apiErrors`.

## Verificar no `/test`

Nada abaixo dá para confirmar lendo código: depende da ligação entre o override de header do proxy e o
`headers()` do Server Component, que é do Next. Medir em `pnpm --filter <app> build && start`, não em
`next dev`.

1. Web, primeira visita sem cookie (a afirmação que sustenta a tarefa):
   `curl -s http://localhost:3001/en | grep -o '<html[^>]*lang="[^"]*"'` deve dar `lang="en"`; o mesmo
   para `/es`. Conferir também o texto do hero no idioma da URL.
2. Web, URL vence cookie: `curl -s -H 'Cookie: x-locale=pt-br' http://localhost:3001/en/pricing` com
   `lang="en"`, e `curl -s -D - http://localhost:3001/en -o /dev/null` com `set-cookie: x-locale=en`.
3. Web, header forjado: `curl -s -H 'x-request-locale: es' -H 'Cookie: x-locale=pt-br' http://localhost:3001/en`
   com `lang="en"`.
4. Web, Server Action de contato em `/en/contact` com cookie `pt-br`: a mensagem de retorno sai em inglês.
5. App: `curl -s -H 'Cookie: x-locale=pt-br' http://localhost:3000/en/sign-in` com `lang="en"`; logado, carga
   completa de `/en/entities` e `/es/entities` com `lang` da URL.
6. App, 404 logado: `/en/rota-inexistente` com cookie `pt-br` mostra `lang="en"`, "Page not found" e link
   para `/en`.
7. App, ramo de asset: `curl -s -H 'Cookie: x-locale=es' http://localhost:3000/x/y/nao-existe.txt` com 404 e
   `lang="es"`; com `-H 'x-request-locale: en'` somado, ainda `lang="es"`. (A primeira versão deste item
   usava `/nao-existe.txt`, que dá 307: com um segmento só, a rota `[locale]` captura o caminho. É o O1.)
8. App, fora do matcher: `curl -s -H 'x-request-locale: en' -H 'Cookie: x-locale=es' http://localhost:3000/api/inexistente`
   deve dar `lang="en"` (o header forjado vale aqui, como o `ARCHITECTURE.md` passa a dizer). Se der `es`,
   o doc está errado e precisa voltar.
9. Nenhuma resposta das duas apps traz `x-middleware-request-*` nem `x-middleware-override-headers`
   (`curl -s -D - ... -o /dev/null | grep -i x-middleware`). CSP e HSTS presentes, inclusive no redirect de `/`.
10. App, rodada 2: logado em `/en/entities`, trocar para "Español" no `LanguageSwitcher`, sem recarregar.
    `document.documentElement.lang` tem de ser `"es"` logo depois da navegação. Conferir também que o 404
    raiz de `/x/y/nao-existe.txt` com cookie `es` continua `lang="es"` depois da hidratação (o componente não
    pode sobrescrever). Só este item e o complemento do 404 precisam de nova medição; os outros 9 já têm
    veredito no `test/report.md`.

## Lacunas de teste

Vereditos sobre as lacunas que o handoff listou:

- Ligação override do proxy com `headers()` no Server Component, sem teste unitário: continua aberta. Cobre
  os itens 1 a 8 acima, no `/test`.
- Testes de proxy presos ao formato `x-middleware-request-*` do Next 16.0.0: continua aberta, e é aceita. É
  o mesmo padrão dos testes de `x-app-path` já em `main`; um upgrade do Next quebra os dois juntos.
- Sem caso E2E de `lang` no Playwright: fora de escopo (pergunta 6 do plano, resposta "não").

Lacuna nova: nenhuma. A troca suave de idioma tem teste de componente (`documentLangSync.test.tsx`). A
montagem dele no root layout não tem teste unitário, e o item 10 cobre isso no `/test`.

## Achados para o backlog

Confirmados por leitura. Já existiam no `HEAD` e ficam fora desta tarefa. Não editei `specs/BACKLOG.md` para
não misturar com o diff da auditoria que já está no working tree; quem registra é o `/spec --sync`.

- O1 do `/test`: arquivo inexistente de um segmento na app (`/favicon-novo.png`) redireciona o anônimo para
  `/favicon-novo.png/sign-in` em vez de dar 404. O proxy deixa passar o caminho com extensão
  (`apps/app/proxy.ts:197-199`), a rota `[locale]` aceita o segmento e `requireSession`
  (`apps/app/lib/server/authSession.ts:37`) monta `/${locale}/sign-in` com ele.
- O3 do `/test`: `getDictionary` e `getTranslations` ficam expostas como Server Actions, porque
  `packages/internationalization/server.ts:1` declara `"use server"`. Devolvem só o dicionário público; risco
  baixo.
- Redirect sem fim com `NEXT_PUBLIC_DEFAULT_LOCALE` inválido: `apps/app/proxy.ts:203,213`,
  `apps/web/proxy.ts:99,110` (achado 🟢 acima).

## Decisões em aberto

Nenhuma que bloqueie o commit. Dois registros para o relatório do ciclo:

- O plano de commits inclui a auditoria do backlog (`specs/BACKLOG.md`, `specs/account-security-mfa.md`),
  que já estava no working tree antes desta feature. Fica num commit `docs(specs)` próprio, na mesma branch.
  Se a preferência for PR separada, basta tirar esse commit do plano e levar os dois arquivos para outra
  branch.
- Os três achados antigos listados em "Achados para o backlog" viram itens do backlog, não correção nesta
  PR.

## Gates

| gate | comando | resultado |
|------|---------|-----------|
| lint | `pnpm check` | 858 arquivos, sem erro |
| typecheck | `pnpm turbo run typecheck --filter=@repo/internationalization --filter=web --filter=app` | 3/3 tasks (2 do cache) |
| paridade de i18n | `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes |

Os testes de web e app não foram rodados de novo: a revisão só mudou um comentário no pacote de i18n e um
documento. Os números do handoff valem (web 87, app 823).

Rodada 2 (mexeu na `apps/app`):

| gate | comando | resultado |
|------|---------|-----------|
| lint | `pnpm check` | 860 arquivos, sem erro |
| typecheck + testes da app | `pnpm turbo run typecheck test --filter=app` | 10/10 tasks; app 102 arquivos, 826 testes (823 + 3 novos) |

## Plano de commits

Ordem: auditoria do backlog, que já estava no working tree, depois o código (pacote de i18n primeiro,
porque os proxies importam a constante dele), documentação e, por último, os artefatos da feature.

1. `docs(specs): audit the backlog against the code`
   `specs/BACKLOG.md`, `specs/account-security-mfa.md`
2. `fix(internationalization): resolve the server locale from the request URL before the cookie`
   `packages/internationalization/utils.ts`, `packages/internationalization/server.ts`,
   `packages/internationalization/__tests__/serverDictionary.test.ts`
3. `fix(web): forward the URL locale to server rendering`
   `apps/web/proxy.ts`, `apps/web/__tests__/proxyLocale.test.ts`, `apps/web/app/[locale]/pricing/page.tsx`
4. `fix(app): forward the URL locale to server rendering`
   `apps/app/proxy.ts`, `apps/app/__tests__/proxy.test.ts`
5. `fix(app): render the not-found page in the URL locale`
   `apps/app/shared/components/ui/NotFoundPage.tsx`, `apps/app/__tests__/notFoundPageHomeLink.test.tsx`
6. `fix(app): keep the html lang in step with the URL on a soft language switch`
   `apps/app/shared/components/DocumentLangSync.tsx`, `apps/app/app/layout.tsx`,
   `apps/app/__tests__/documentLangSync.test.tsx`
7. `docs: the server locale comes from the URL`
   `docs/ARCHITECTURE.md`, `docs/PRE-PRODUCTION.md`
8. `docs(claude): the server locale comes from the URL`
   `AGENTS.md`, `apps/app/CLAUDE.md`, `.claude/skills/i18n-sync/SKILL.md`
9. `docs(features): server-locale-from-url`
   `docs/features/server-locale-from-url/`

Título de PR sugerido: `fix: server-rendered pages use the locale from the URL`.

Varredura de segredo em `docs/features/server-locale-from-url/`: nenhuma senha, token ou chave. O único
e-mail é `qa-server-locale@example.com` (`analyze/plan.md:269`), de domínio reservado.

Commits realizados: _(preenchido pelo `/review` depois dos commits)_
