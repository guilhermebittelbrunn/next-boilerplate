# Plano: o idioma renderizado no servidor sai da URL, não do cookie

Tarefa direta, sem spec. Origem: recomendação da auditoria de 2026-10-07 em `specs/BACKLOG.md:177-210` e o
achado aberto em `specs/BACKLOG.md:547` ("O `getDictionary()` do servidor lê o cookie `x-locale`, não a URL").
Plano feito em rodada autônoma do `/cycle`: as decisões tomadas sem perguntar estão na §11, cada uma com a
opção adotada e as descartadas.

## 0. Sumário do desenho

- Os dois proxies passam a repassar o idioma do segmento da URL num header de requisição,
  `x-request-locale`, com `NextResponse.next({ request: { headers } })`. É o mesmo mecanismo que a
  `apps/app` já usa para o caminho (`apps/app/proxy.ts:241-245`, `APP_PATH_HEADER`).
- `getDictionary()` do servidor lê esse header primeiro; se ele estiver ausente ou não for um idioma
  suportado, cai no cookie `x-locale` e depois no padrão, como hoje.
- O `cookieStore.set("x-locale", …)` dos proxies fica: é ele que lembra a escolha para a próxima requisição
  sem idioma na URL.
- Nenhum dos 18 chamadores de `getDictionary()` muda, nem os dois layouts com `<html lang>`.
- A `NotFoundPage` da `apps/app`, que tem uma cópia própria da leitura do cookie, passa a usar
  `getDictionary()`. Sem isso, um 404 em `/en/...` sairia com `lang="en"` e o texto no idioma do cookie.
- Sem SDK, API, Firestore, chave de i18n, env ou infra. 6 arquivos de código (1 novo de teste na web, 1 novo
  no pacote), 2 testes existentes estendidos, 5 documentos corrigidos.

## 1. Contexto

### 1.1 Problema

`getDictionary()` de `@repo/internationalization/server` resolve o idioma só pelo cookie `x-locale`
(`packages/internationalization/server.ts:18-35`). Os proxies gravam esse cookie com `cookies().set`
(`apps/web/proxy.ts:107`, `:111`; `apps/app/proxy.ts:195`, `:199`), o que vira `Set-Cookie` na **resposta**.
A renderização da mesma requisição ainda lê o cookie que o navegador mandou: o antigo, ou nenhum.

Efeitos medidos em quatro `/test`:

- primeira visita sem cookie a `/en` ou `/es` da `apps/web`: Server Components em pt-br, componentes client
  no idioma da URL, na mesma página (PR #28);
- `<html lang>` uma navegação atrasado nas duas apps, porque os layouts tiram o `lang` do mesmo
  `getDictionary()` (`apps/web/app/[locale]/layout.tsx:23`, `:30`; `apps/app/app/layout.tsx:48`, `:73`).
  `/en/sign-in` com `x-locale=pt-br` sai com `lang="pt-br"` (`docs/features/onboarding-flow/test/report.md:192-194`);
  `/en/entities` com `lang="pt-br"` e `/es/entities` com `lang="en"` depois de navegação completa
  (`docs/features/action-menu-keyboard-delete/test/report.md:173-175`). Falha o critério 3.1.1 do WCAG
  (nível A): leitor de tela pronuncia a página no idioma errado.

O lado client já segue a URL: `LocaleProvider` lê `useParams().locale`
(`packages/internationalization/client.ts:47-56`). Só o servidor ficou para trás.

A troca de idioma pelo `LanguageSwitcher` (navegação suave) não sofre do atraso: o switcher grava o cookie no
navegador antes do `router.push` (`apps/app/shared/components/ui/LanguageSwitcher.tsx:50-53`;
`apps/web/app/[locale]/components/header/language-switcher.tsx:44-47`), e o `/test` de
`i18n-hydration-admin-delete-billing` mediu `document.documentElement.lang` passando a `es` nessa troca
(`docs/features/i18n-hydration-admin-delete-billing/test/report.md:67`). O defeito aparece em carga completa
de uma URL cujo idioma difere do cookie: link compartilhado, URL digitada, primeira visita, aba nova.

### 1.2 Recontagem dos chamadores

A auditoria fala em "27 chamadores sem idioma". O número certo é **27 arquivos que importam
`@repo/internationalization/server`**, dos quais **18 chamam `getDictionary()`** (16 na web, 2 na app):

| app | chama `getDictionary()` | arquivos |
|-----|-------------------------|----------|
| web | 16 | `app/page.tsx`, `[locale]/layout.tsx`, `(home)/page.tsx`, `(home)/components/{cta,faq,features,hero,stats}.tsx`, `components/footer.tsx`, `contact/page.tsx`, `contact/actions/contact.tsx` (Server Action), `legal/privacy/page.tsx`, `legal/terms/page.tsx`, `pricing/page.tsx`, `sign-in/page.tsx`, `sign-up/page.tsx` |
| app | 2 | `app/layout.tsx`, `app/page.tsx` |

Os outros 9 da `apps/app` chamam `getTranslations(locale)` com o `locale` dos `params` (os layouts dos dois
painéis e as páginas de `(unauthenticated)` e `onboarding`), então já seguem a URL. A exceção é a
`NotFoundPage` (`apps/app/shared/components/ui/NotFoundPage.tsx:21-32`), que chama `getTranslations` com um
idioma lido do cookie por uma função própria. Ela entra no escopo (§5.4).

### 1.3 Objetivo e corte

**Dentro:**

1. Primeira visita sem cookie a `/en` e `/es` da web sai com `<html lang>` e texto de Server Component no
   idioma da URL.
2. Na app, `<html lang>` (e o texto da página de 404) acompanha a URL mesmo com cookie de outro idioma, sem
   atraso.
3. Rota sem idioma na URL continua caindo no cookie e depois no padrão.
4. Testes que provam cada caso (§7).
5. Documentos que hoje afirmam "o servidor lê o cookie" passam a dizer o que o código faz (§12.5).

**Fora:**

- Passar `locale` pelos `params` aos 18 chamadores, o que destravaria SSG na web
  (`docs/RESEARCH-tanstack-vs-next.md:187`). Com `headers()` as rotas continuam dinâmicas, exatamente como já
  são por causa do `cookies()`. Nada muda em renderização estática.
- Os achados vizinhos no mesmo `apps/app/proxy.ts`: deep link do onboarding sem query string (`:244`), bounce
  que apaga a query (`:229`), TTL do cookie `x-locale` (`:195`, `:199`, `specs/BACKLOG.md:608`). E o
  `skipValidation` da web, preso à E13.
- O `x-locale` allow-listado no CORS da API (`apps/api/(shared)/lib/cors.ts:17`, `specs/BACKLOG.md:610`).
- O redirecionamento de `/` para o idioma padrão sem olhar o cookie (`apps/web/proxy.ts:105-108`,
  `apps/app/proxy.ts:193-196`). É comportamento atual e o critério 3 pede "como hoje".

### 1.4 Apps impactados

| área | impacto |
|------|---------|
| `packages/internationalization` | `getDictionary()` lê o header antes do cookie; constante nova `LOCALE_REQUEST_HEADER` em `utils.ts` |
| `apps/web` | `proxy.ts` repassa o header; comentário que deixa de ser verdade em `pricing/page.tsx:37-38` sai |
| `apps/app` | `proxy.ts` repassa o header; `NotFoundPage` usa `getDictionary()` |
| `apps/api` | nenhum: não importa o módulo do servidor (grep vazio em `apps/api`) |
| `packages/sdk`, `apps/email` | nenhum |

Área do painel: as duas (comum e admin) e as telas sem sessão. Modo de produto (`subscription`/`simple`):
indiferente. Plano/assinatura: indiferente.

### 1.5 Fontes

`specs/BACKLOG.md:177-210` (recomendação, critério de pronto, `contends_on`), `:547` (achado), `:722-729`
(ampliação), e os quatro relatórios de `/test` citados em §1.1. Nenhuma referência externa ficou sem leitura.

## 2. Dados (Firestore)

N/A.

## 3. Contrato `@repo/sdk`

N/A.

## 4. API (`apps/api`)

N/A. A API não chama `getDictionary()` do servidor e não passa pelos proxies das apps.

## 5. Front-end

### 5.1 Mecanismo: header de requisição escrito pelo proxy

O Server Component não tem acesso ao pathname. A app já resolveu isso uma vez: o proxy grava o caminho num
header de requisição (`apps/app/proxy.ts:241-245`) e `apps/app/lib/server/onboarding.ts:39` lê com
`headers()`. O `/test` do onboarding mediu em build de produção que o override de header e o
`cookies().set` convivem na mesma resposta, e que um `x-app-path` forjado pelo cliente é substituído
(`docs/features/onboarding-flow/test/report.md:90`, `:165`). O idioma segue o mesmo caminho.

- Nome: `x-request-locale`, exportado como `LOCALE_REQUEST_HEADER` de `packages/internationalization/utils.ts`.
  Não pode morar em `server.ts`: o arquivo é `"use server"` (`server.ts:1`) e só pode exportar funções
  async (ver o `biome-ignore` em `server.ts:13`). Os dois proxies já importam de
  `@repo/internationalization/utils` (`apps/web/proxy.ts:3`, `apps/app/proxy.ts:4`).
- `set`, nunca `append`: um valor enviado pelo navegador é sobrescrito, como o `x-app-path`.

### 5.2 Ramos de cada proxy

`apps/web/proxy.ts` (`route`, `:91-127`):

| ramo | linha | renderiza? | o que muda |
|------|-------|------------|------------|
| sem idioma na URL → redirect para o padrão | `:100-108` | não | nada |
| Arcjet nega → `403` JSON | `:120-124` | não | nada |
| segue | `:126` | sim | `NextResponse.next()` vira `NextResponse.next({ request: { headers } })` com o header |

`apps/app/proxy.ts` (`route`, `:175-246`):

| ramo | linha | renderiza? | o que muda |
|------|-------|------------|------------|
| asset estático (extensão no path) | `:178-180` | só o 404 raiz, se o arquivo não existir | nada; sem header, cai no cookie (caso 3, §8) |
| sem idioma → redirect | `:189-196` | não | nada |
| anônimo em rota privada → sign-in | `:207-213` | não | nada |
| logado em rota pública → bounce | `:215-232` | não | nada |
| sessão encerrada noutro aparelho → limpa cookie e segue | `:216-217` | sim, pelo ramo final | coberto pelo ramo final |
| Arcjet nega | `:235-239` | não | nada |
| segue | `:243-245` | sim | `requestHeaders.set(LOCALE_REQUEST_HEADER, currentLocale)` ao lado do `APP_PATH_HEADER` |

Todo ramo que renderiza página com idioma na URL passa pelo `NextResponse.next` final, então o header
chega em todos. Server Actions (`apps/web/app/[locale]/contact/actions/contact.tsx`) são `POST` para a URL da
página, passam pelo matcher (`apps/web/proxy.ts:56-58`) e recebem o mesmo header.

### 5.3 `getDictionary()`

Ordem: header válido → cookie válido → padrão. O fallback passa a usar `resolveLocale`
(`packages/internationalization/utils.ts:21-32`), que valida o padrão. Hoje, com
`NEXT_PUBLIC_DEFAULT_LOCALE` inválido (ex.: `pt-BR`), a função devolve `locale: "pt-BR"` e
`dictionary: undefined` (`server.ts:29-34`), e a página quebra no primeiro acesso ao dicionário. Com
`resolveLocale`, cai em `pt-br`. A mudança é da mesma linha que esta tarefa reescreve.

Custo: um `await headers()` a mais por chamada, em paralelo com o `cookies()`. Os dois são APIs dinâmicas;
nenhuma rota muda de modo de renderização.

### 5.4 `NotFoundPage` (`apps/app`)

`resolveLocaleFromRequest()` (`NotFoundPage.tsx:21-28`) repete a lógica antiga de `getDictionary()`. A página
renderiza dentro do root layout (`apps/app/app/not-found.tsx`; não há `not-found` sob `[locale]`). Corrigido
só o layout, um logado em `/en/qualquer-coisa` com cookie `pt-br` veria `lang="en"` e o texto em português.
Troca: `const { dictionary, locale } = await getDictionary();`, apagando a função local e os imports de
`cookies`, `getTranslations`, `getDefaultLocale`, `locales` e `Locale` que ficarem sem uso.

### 5.5 `pricing/page.tsx` (web)

O comentário em `apps/web/app/[locale]/pricing/page.tsx:37-38` afirma que o cookie "still names the previous
locale". Depois da correção isso deixa de ser verdade. O código (`resolveLocale(routeLocale)`) continua certo
e coberto por `apps/web/__tests__/pricingPage.test.tsx:48`; sai só o comentário (pergunta 4, §11).

### 5.6 Rotas, estados, formulários, tabelas

Nenhuma rota nova, nenhum formulário, nenhuma tabela. Os layouts (`apps/web/app/[locale]/layout.tsx`,
`apps/app/app/layout.tsx`) ficam como estão: continuam lendo `locale` de `getDictionary()`.

### 5.7 i18n

Nenhuma chave nova, nenhum `apiErrors` novo.

## 6. Autorização e segurança

- O header só escolhe idioma. Um cliente que forje `x-request-locale` consegue o mesmo que trocando a URL.
  Mesmo assim, o proxy sobrescreve o valor (`set`), e `getDictionary()` só aceita valores de `locales`.
- No ramo de asset estático da app (`apps/app/proxy.ts:178-180`) o header do navegador passa sem
  sobrescrita. O único render possível ali é o 404 raiz, e o efeito é o idioma desse 404. Não vale um ramo
  a mais no proxy.
- Os headers internos `x-middleware-request-*` não chegam ao navegador; o Next os consome. Já medido para o
  `x-app-path` (`docs/features/onboarding-flow/test/report.md:165`), e o `/test` reconfere (§8).
- Impersonação: indiferente. O idioma não depende de quem é o ator.
- Nada de autorização muda; nenhum guard é tocado.

## 7. Testes

Nível: Vitest unitário. Nenhum teste precisa de emulador nem de app de pé. A ligação "override de header do
proxy → `headers()` no Server Component" é do Next e fica para o `/test` em build de produção (§8).

| # | arquivo | caso | nível | falha hoje? |
|---|---------|------|-------|-------------|
| T1 | `packages/internationalization/__tests__/serverDictionary.test.ts` (novo) | header `en`, cookie `pt-br` → `locale: "en"` e dicionário inglês | unit, `next/headers` mockado | sim (devolve `pt-br`) |
| T2 | idem | header `es`, sem cookie → `es` | idem | sim (devolve o padrão) |
| T3 | idem | sem header, cookie `es` → `es` | idem | não: regressão do caso 3 |
| T4 | idem | sem header, sem cookie, `NEXT_PUBLIC_DEFAULT_LOCALE=en` → `en` | idem | não: regressão do caso 3 |
| T5 | idem | header inválido (`fr`, `EN`), cookie `en` → `en` | idem | não: protege contra implementação ingênua que use `resolveLocale(header)` e pule o cookie |
| T6 | idem | sem header, sem cookie, `NEXT_PUBLIC_DEFAULT_LOCALE=pt-BR` → `pt-br` com dicionário definido | idem | sim (devolve `dictionary: undefined`) |
| T7 | `apps/web/__tests__/proxyLocale.test.ts` (novo) | `GET /en` sem cookie → `x-middleware-request-x-request-locale: en`, e `cookies().set("x-locale", "en")` continua sendo chamado | unit do proxy | sim (sem override) |
| T8 | idem | `GET /es/pricing` → header `es` | idem | sim |
| T9 | idem | header `x-request-locale: es` forjado em `/pt-br` → `pt-br` | idem | sim |
| T10 | `apps/app/__tests__/proxy.test.ts` (estende `describe("proxy locale")`) | anônimo em `/es/sign-in` → header `es`; logado em `/en/entities` → header `en` | unit do proxy | sim |
| T11 | idem | header forjado `es` em `/pt-br/entities` → `pt-br` | idem | sim (o `new Headers(request.headers)` copia o forjado) |
| T12 | `apps/app/__tests__/notFoundPageHomeLink.test.tsx` (estende) | header `en`, cookie `pt-br` → link "Go to home" e `resolveNotFoundHomePath("en")` | componente | sim |

Mapa para o critério de pronto 4 ("um teste que falha com o código atual para cada caso"):

- caso 1 (web, `/en` e `/es` sem cookie): T2, T7, T8;
- caso 2 (app, URL vence cookie): T1, T10, T11, T12;
- caso 3 (sem idioma na URL → cookie → padrão): T6 falha hoje, na metade "padrão". A metade "cookie" (T3)
  **não tem como falhar com o código atual**, porque é o comportamento que já existe e que o critério pede
  para preservar. Fica como teste de regressão, e T5 cobre a mutação mais provável da implementação nova.
  Registrado na pergunta 5 (§11).

Ajustes em testes existentes:

- `notFoundPageHomeLink.test.tsx:9-16`: o mock de `next/headers` ganha `headers` (por padrão `new Headers()`),
  senão `getDictionary()` real quebra. Os casos atuais, guiados pelo cookie, seguem iguais.
- `apps/app/__tests__/proxy.test.ts` e `apps/web/__tests__/securityHeaders.test.ts` já montam
  `headers: new Headers(...)` no request (`proxy.test.ts:64`, `securityHeaders.test.ts:32`); nada a ajustar.
- Os três testes da web que importam o módulo do servidor o mockam por inteiro (`brandSurfaces.test.tsx:40`,
  `contactAction.test.ts:18`, `pricingPage.test.tsx:11`); nada a ajustar.

Cada teste novo que "falha hoje" precisa ser visto falhando: o `/develop` roda T1, T2, T6-T12 contra o código
antigo antes de aplicar a correção (ou reverte só o código e roda) e registra no handoff.

## 8. O que o `/test` vai percorrer

Em `pnpm --filter web build && start` (3001) e `pnpm --filter app build && start` (3000), nunca em
`next dev` (`.claude/cycle-policy.md`, §4).

Por HTTP, sem navegador (`curl -s`, extraindo `<html ... lang="…">` e um texto de Server Component):

1. Web sem cookie: `/en` e `/es` → `lang="en"`/`lang="es"` e o título do hero (`hero.tsx`, Server Component)
   no idioma da URL. `/pt-br` → `pt-br`. `curl -i` mostra `set-cookie: x-locale=<idioma>`.
2. Web com cookie de outro idioma: `Cookie: x-locale=pt-br` em `/en/pricing` → `lang="en"`, cabeçalho em inglês.
3. App anônima: `Cookie: x-locale=pt-br` em `/en/sign-in` → `lang="en"` (o repro da
   `onboarding-flow/test/report.md:192`); `Cookie: x-locale=en` em `/es/sign-in` → `lang="es"`.
4. Forjado: `x-request-locale: es` com `Cookie: x-locale=pt-br` em `/en/sign-in` → `lang="en"`.
5. Vazamento: nenhuma resposta traz `x-middleware-request-*` nem `x-middleware-override-headers`.
6. Caso 3 em produção: `Cookie: x-locale=es` em `http://localhost:3000/nao-existe.txt` (ramo de asset, sem
   header) → 404 raiz com `lang="es"` e o texto do 404 em espanhol; sem cookie → `pt-br`. Na web, `/` segue
   com 307 para `/pt-br`.

Com `agent-browser` (conta de QA no emulador, `qa-server-locale@example.com`):

7. Logado, cookie em `pt-br`: carga completa de `/en/entities` e `/es/entities` → `document.documentElement.lang`
   igual à URL (o repro da `action-menu-keyboard-delete/test/report.md:173`).
8. Logado, `/en/rota-que-nao-existe` com cookie `pt-br` → `lang="en"` e "Go to home".
9. Regressão da troca suave: `LanguageSwitcher` em `/en/entities` → `/es/entities`, `lang` passa a `es`
   (como em `i18n-hydration-admin-delete-billing/test/report.md:67`); e na web, de `/pt-br` para `/en`.
10. Landing `/en` e `/es` numa sessão sem cookie em light, dark e 375 px: só para conferir que nada mudou de
    lugar. O diff não toca CSS.

Nada fica 🔒 por infra externa.

## 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Primeira visita à landing em inglês ou espanhol sai inteira no idioma da URL**
  Sem cookie `x-locale`, `GET /en` e `GET /es` da `apps/web` em build de produção respondem com
  `<html lang="en">` e `<html lang="es">`, e o texto dos Server Components (hero, features, FAQ, rodapé) sai no
  mesmo idioma dos componentes client. A resposta continua gravando `x-locale` com o idioma da URL, para a
  próxima visita sem idioma no caminho.

- [ ] **A URL vence o cookie em toda página da web**
  Com `x-locale=pt-br`, `/en/pricing`, `/en/contact` e `/en/legal/privacy` saem com `lang="en"` e título,
  metadados e texto em inglês. O envio do formulário de contato (Server Action) em `/en/contact` responde com
  as mensagens em inglês, porque o `POST` também passa pelo proxy.

- [ ] **Na app, o `lang` acompanha a URL na carga completa**
  Com cookie de outro idioma, `/en/sign-in` sai com `lang="en"` e `/es/sign-in` com `lang="es"`, sem precisar
  de uma segunda navegação. Logado, a carga completa de `/en/entities` e `/es/entities` também sai com o `lang`
  da URL. A troca pelo seletor de idioma continua atualizando o `lang` sem recarregar a página.

- [ ] **A página de 404 da app fala o idioma da URL**
  Logado e com `x-locale=pt-br`, `/en/<rota-inexistente>` mostra o 404 com `lang="en"`, o texto em inglês e o
  link "Go to home" apontando para a home do painel em `/en`. Antes da correção, o texto vinha do cookie.

- [ ] **Sem idioma na URL, o servidor usa o cookie e depois o padrão**
  Uma página renderizada sem passar pelo ramo final do proxy (o 404 de um caminho com extensão, como
  `/nao-existe.txt` na app) sai no idioma do cookie `x-locale`; sem cookie, no padrão. `/` continua
  redirecionando para `/pt-br` nas duas apps. Com `NEXT_PUBLIC_DEFAULT_LOCALE` inválido, o padrão vira `pt-br`
  em vez de quebrar a página com dicionário vazio.

- [ ] **Header forjado não escolhe o idioma**
  Um `x-request-locale` enviado pelo navegador é sobrescrito pelo proxy com o idioma da URL. Um valor fora de
  `pt-br`/`en`/`es` que chegue ao servidor é ignorado, e a resolução segue para o cookie.

- [ ] **Nenhum header interno vaza para o navegador**
  As respostas das duas apps não trazem `x-middleware-request-x-request-locale` nem
  `x-middleware-override-headers`, e os headers de segurança (CSP, HSTS) seguem presentes em todos os ramos,
  inclusive no redirect de `/`.

- [ ] **Cada caso tem um teste que o código antigo reprova**
  Os testes de `getDictionary()`, dos dois proxies e da página de 404 descritos no plano falham contra o código
  anterior à correção, com exceção do teste de regressão "sem header, cookie `es`", que descreve o
  comportamento preservado. `pnpm check`, `typecheck` dos workspaces tocados e `pnpm test` ficam verdes.

- [ ] **Tema e responsivo sem mudança**
  A landing em `/en` e `/es` e o login da app em light, dark e 375 px ficam como antes: o diff não toca estilo,
  e o texto em inglês ou espanhol não pode empurrar nada para fora da largura que já não empurrasse no
  carregamento client.

## 10. Blueprint técnico

### 10.1 `packages/internationalization/utils.ts`

```ts
export const locales = ["pt-br", "en", "es"] as const;
// ...

/** Written by the proxies with the locale segment of the URL; any value the browser sent is replaced. */
export const LOCALE_REQUEST_HEADER = "x-request-locale";
```

### 10.2 `packages/internationalization/server.ts`

```diff
-import { cookies } from "next/headers";
+import { cookies, headers } from "next/headers";
 import { globalTranslations } from "./translations/global";
 import {
-    getDefaultLocale,
     type IGetDictionaryResponse,
+    LOCALE_REQUEST_HEADER,
+    type Locale,
     locales,
+    resolveLocale,
 } from "./utils";

-type Locale = (typeof locales)[number];
+const LOCALE_COOKIE = "x-locale";
+
+function isSupportedLocale(value: string | null | undefined): value is Locale {
+    return Boolean(value) && locales.includes(value as Locale);
+}

 export async function getDictionary(): Promise<IGetDictionaryResponse> {
-    const cookieStore = await cookies();
-    const localeCookie = cookieStore.get("x-locale")?.value;
-    if (localeCookie && locales.includes(localeCookie as Locale)) { ... }
-    const defaultLocale = getDefaultLocale();
-    return { dictionary: globalTranslations[defaultLocale as Locale], locale: defaultLocale as Locale };
+    const [requestHeaders, cookieStore] = await Promise.all([headers(), cookies()]);
+    // The proxy only writes the cookie on the response, so on this request it may still name
+    // the previous language; the header carries the URL segment being rendered.
+    const urlLocale = requestHeaders.get(LOCALE_REQUEST_HEADER);
+    const locale = isSupportedLocale(urlLocale)
+        ? urlLocale
+        : resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
+
+    return { dictionary: globalTranslations[locale], locale };
 }
```

`getTranslations` não muda. O helper `isSupportedLocale` não é exportado, então não esbarra na regra do
`"use server"`. O comentário entra pela exceção 1 de `.claude/rules/code-comments.md` (restrição do framework
que não se vê no código); o `/develop` pode cortá-lo se o nome da constante bastar.

### 10.3 `apps/web/proxy.ts`

```diff
-import { getDefaultLocale, locales } from "@repo/internationalization/utils";
+import {
+    getDefaultLocale,
+    LOCALE_REQUEST_HEADER,
+    locales,
+} from "@repo/internationalization/utils";
 ...
-    return NextResponse.next();
+    // Server components cannot read the URL, and the cookie set above only reaches the next
+    // request. Set, never appended: a value the browser sent must not reach them.
+    const requestHeaders = new Headers(request.headers);
+    requestHeaders.set(LOCALE_REQUEST_HEADER, currentLocale);
+    return NextResponse.next({ request: { headers: requestHeaders } });
```

O `cookieStore.set("x-locale", …)` de `:107` e `:111` fica.

### 10.4 `apps/app/proxy.ts`

```diff
-import { getDefaultLocale, locales } from "@repo/internationalization/utils";
+import {
+    getDefaultLocale,
+    LOCALE_REQUEST_HEADER,
+    locales,
+} from "@repo/internationalization/utils";
 ...
-    // Layouts cannot read the URL, so the path travels as a request header. Set, never
-    // appended: a value the browser sent must not reach the server components.
+    // Layouts cannot read the URL, so the path and its locale travel as request headers. Set,
+    // never appended: a value the browser sent must not reach the server components.
     const requestHeaders = new Headers(request.headers);
     requestHeaders.set(APP_PATH_HEADER, pathname);
+    requestHeaders.set(LOCALE_REQUEST_HEADER, currentLocale);
     return NextResponse.next({ request: { headers: requestHeaders } });
```

### 10.5 `apps/app/shared/components/ui/NotFoundPage.tsx`

```diff
-import { getTranslations } from "@repo/internationalization/server";
-import { getDefaultLocale, type Locale, locales } from "@repo/internationalization/utils";
-import { cookies } from "next/headers";
+import { getDictionary } from "@repo/internationalization/server";
 ...
-async function resolveLocaleFromRequest(): Promise<Locale> { ... }
-
 export async function NotFoundPage() {
-    const locale = await resolveLocaleFromRequest();
-    const dictionary = await getTranslations(locale);
+    const { dictionary, locale } = await getDictionary();
     const notFoundCopy = dictionary.apps.app.pages.common.notFound;
```

### 10.6 `apps/web/app/[locale]/pricing/page.tsx`

Apagar as duas linhas de comentário em `:37-38`. O resto fica.

### 10.7 Testes (esqueleto)

```ts
// packages/internationalization/__tests__/serverDictionary.test.ts
const { headerValues, cookieValues } = vi.hoisted(() => ({
    headerValues: new Map<string, string>(),
    cookieValues: new Map<string, string>(),
}));

vi.mock("next/headers", () => ({
    headers: async () => new Headers(Object.fromEntries(headerValues)),
    cookies: async () => ({
        get: (name: string) =>
            cookieValues.has(name) ? { value: cookieValues.get(name) } : undefined,
    }),
}));

const { getDictionary } = await import("../server");
// beforeEach: limpa os dois Maps e restaura NEXT_PUBLIC_DEFAULT_LOCALE (padrão de resolveLocale.test.ts:4-16)
// it("a URL vence o cookie") -> headerValues.set(LOCALE_REQUEST_HEADER, "en"); cookieValues.set("x-locale", "pt-br")
//   expect(locale).toBe("en"); expect(dictionary).toBe(globalTranslations.en)
```

```ts
// apps/web/__tests__/proxyLocale.test.ts: mocks iguais aos de securityHeaders.test.ts:4-19,
// com cookieSetMock em vez de vi.fn() anônimo para conferir o x-locale gravado.
const response = await proxy(makeRequest("/en"));
expect(response.headers.get(`x-middleware-request-${LOCALE_REQUEST_HEADER}`)).toBe("en");
expect(cookieSetMock).toHaveBeenCalledWith("x-locale", "en");
```

```ts
// apps/app/__tests__/proxy.test.ts, dentro de describe("proxy locale")
it("forwards the locale of the path to the server components", async () => {
    const response = await proxy(anonymous("/es/sign-in"));
    expect(response.headers.get("x-middleware-request-x-request-locale")).toBe("es");
});
```

### 10.8 Documentos

| arquivo | hoje diz | passa a dizer |
|---------|----------|---------------|
| `docs/ARCHITECTURE.md:64` | servidor resolve pelo cookie `x-locale` | servidor resolve pelo idioma da URL que o proxy repassa em `x-request-locale`; sem ele, cookie `x-locale` e depois o padrão |
| `AGENTS.md:25` | "O do servidor lê o cookie `x-locale`" | idem, em uma frase |
| `apps/app/CLAUDE.md:47` | "o do servidor lê o cookie `x-locale`" | idem |
| `.claude/skills/i18n-sync/SKILL.md:14` | "No servidor, o locale vem do cookie `x-locale`" | idem |
| `docs/PRE-PRODUCTION.md:414` | âncoras `server.ts:20`, `apps/app/proxy.ts:169,173`, `apps/web/proxy.ts:104,108` | âncoras recontadas depois da edição (o cookie continua sendo gravado; muda só a linha) |

`docs/RESEARCH-tanstack-vs-next.md:76` é nota de pesquisa datada (2026-08-20) e descreve o estado daquele dia.
Fica como está. `specs/BACKLOG.md` é do `/spec --sync`.

### 10.9 Ordem de implementação e de commit

A ordem padrão (SDK → API → app/web → i18n) põe o pacote de i18n por último porque normalmente ele só
recebe chaves. Aqui ele é a dependência: os proxies importam a constante dele. Então vai primeiro.

1. `fix(internationalization): resolve the server locale from the request URL before the cookie`
   `utils.ts`, `server.ts`, `__tests__/serverDictionary.test.ts`.
2. `fix(web): forward the URL locale to server rendering`
   `apps/web/proxy.ts`, `apps/web/__tests__/proxyLocale.test.ts`, `apps/web/app/[locale]/pricing/page.tsx` (comentário).
3. `fix(app): forward the URL locale to server rendering`
   `apps/app/proxy.ts`, `apps/app/__tests__/proxy.test.ts`.
4. `fix(app): render the not-found page in the URL locale`
   `NotFoundPage.tsx`, `notFoundPageHomeLink.test.tsx`.
5. `docs: the server locale comes from the URL`
   `docs/ARCHITECTURE.md`, `docs/PRE-PRODUCTION.md`.
6. `docs(claude): the server locale comes from the URL`
   `AGENTS.md`, `apps/app/CLAUDE.md`, `.claude/skills/i18n-sync/SKILL.md`.
7. `docs(features): server-locale-from-url`

### 10.10 Env e infra

Nenhuma variável nova. **Pré-requisitos manuais de infra: nenhum.** Nada a registrar em
`docs/PRE-PRODUCTION.md` além da correção de âncoras da §10.8.

## 11. Perguntas em aberto

Todas já com a opção adotada; a rodada seguiu sem esperar resposta.

1. **Qual mecanismo leva o idioma da URL ao servidor na mesma requisição?**
   (a) header de requisição escrito pelo proxy e lido por `getDictionary()`; (b) reescrever o cookie na
   requisição (`request.cookies.set` + `NextResponse.next({ request })`); (c) passar `locale` dos `params` a
   cada chamador.
   **Adotada: (a).** Tem precedente no repo (`APP_PATH_HEADER`, medido em produção), deixa a precedência
   URL → cookie → padrão num lugar só e testável sem proxy, e corrige os 18 chamadores sem tocar em nenhum.
   (b) também exige trocar o `NextResponse.next()` da web, então não economiza nada nos proxies, e faz
   `cookies().get("x-locale")` no servidor mentir sobre a preferência guardada. (c) mexe em 16 arquivos da web,
   inclusive componentes sem `params` (`hero`, `cta`, `faq`, `features`, `stats`, `footer`) e uma Server Action;
   só se paga junto de uma tarefa de SSG.

2. **Nome do header.** `x-request-locale` (adotado), `x-locale` ou `x-app-locale`.
   `x-locale` já é o nome do cookie e aparece na allow-list de CORS da API (`cors.ts:17`), o que confunde quem
   lê. `x-app-locale` sugere que é só da `apps/app`, mas a web usa o mesmo.

3. **A `NotFoundPage` entra?** Sim (adotado) ou fica como achado.
   É a mesma leitura do cookie, copiada, num arquivo; deixá-la de fora produziria uma página com `lang` em
   inglês e texto em português. Um arquivo e um caso de teste.

4. **O que fazer com o contorno do `pricing/page.tsx`?** (a) apagar só o comentário que ficou falso
   (adotado); (b) apagar também o contorno e usar o `locale` de `getDictionary()`, removendo o teste
   "usa o locale da rota"; (c) não mexer.
   (a) é a menor mudança que deixa de mentir. O código continua certo e coberto; (b) apaga um teste que ainda
   descreve algo verdadeiro.

5. **Critério 4 para o caso 3.** O critério pede "um teste que falha com o código atual" para cada caso, mas o
   caso 3 descreve comportamento que o código atual já tem. Adotado: T6 (padrão inválido) falha hoje e cobre a
   metade "padrão"; T3 fica como regressão declarada; T5 protege a implementação nova. Alternativa: escrever T3
   de forma artificial para falhar hoje, o que não prova nada.

6. **Teste E2E de `lang` no Playwright?** Não (adotado) ou um caso em `apps/e2e/tests/landing.spec.ts` que abre
   `/en` sem cookie e lê `html[lang]`. Os unitários provam cada lado; a ligação proxy → `headers()` é do Next e o
   `/test` mede em build. Se você quiser um guarda permanente no CI para o WCAG 3.1.1, o caso E2E custa uma
   carga de página por PR.

7. **`resolveLocale` no fallback muda comportamento?** Só quando `NEXT_PUBLIC_DEFAULT_LOCALE` é inválido: hoje a
   página quebra com dicionário `undefined`, depois cai em `pt-br`. Adotado: entra, porque é a linha reescrita e
   o `client.ts` já usa `resolveLocale` para o mesmo fim (`client.ts:21-29`).

## 12. Decisões tomadas sem perguntar

| decisão | descartada | por quê |
|---------|------------|---------|
| Header em vez de cookie na requisição ou `params` | (b), (c) da pergunta 1 | precedente, raio, testabilidade |
| Constante em `utils.ts` | em `server.ts` | `"use server"` só exporta função async |
| Manter `cookieStore.set` nos proxies | remover | é o que lembra a escolha para `/` e para rotas sem idioma |
| Não mexer nos layouts | trocar `getDictionary()` por `params` no `[locale]/layout.tsx` da web | a correção na fonte já resolve; a app não tem `params` no root layout |
| Não sanitizar o header no ramo de asset da app | `delete` do header nesse ramo | efeito máximo é o idioma de um 404 escolhido pelo próprio cliente |
| Pacote de i18n como primeiro commit | ordem padrão com i18n por último | aqui o pacote é a dependência dos proxies |
| Corrigir as 5 âncoras/afirmações em docs | deixar para o `/spec --sync` | `.claude/cycle-policy.md` §4: afirmação barata de medir num doc é corrigida ao passar por ela |
| Corrigir a contagem "27 chamadores" para 27 importadores / 18 chamadores | repetir o número | recontado com grep (§1.2) |
