# Relatório de QA: server-locale-from-url

Rodada autônoma do `/cycle`, em 2026-10-07, na branch `fix/server-locale-from-url` (não protegida). A
medição foi feita em `next build && next start` das duas apps, com o ambiente do emulador. Nada foi medido
em `next dev`.

Resultado final, depois da rodada 2: 11 critérios, 11 ✅, 0 ❌, 0 🔒.

Na rodada 1 o placar foi 10 ✅, 1 ❌. O ❌ era a troca de idioma suave na `apps/app`, que não atualizava o
`<html lang>` (achado O2). O código anterior a esta tarefa se comportava igual, então não era regressão. O
`/review` corrigiu o O2 com o componente `DocumentLangSync`, e a remedição está na seção
[Rodada 2](#rodada-2-remedição-do-o2). As seções abaixo descrevem a rodada 1 tal como foi medida.
Nenhum defeito de produção introduzido por este diff.

## Cobertura de testes

| comando | resultado |
|---------|-----------|
| `pnpm test` (raiz, JDK 21 no `PATH`, sem `--force`) | 15/15 tasks, 4 do cache, 1m23s. i18n 67 (7 arquivos), web 87 (14), app 823 (101), api 1205 (93), `api:test:emulator` 186 (4), e2e 16, auth 127, email 202, design-system 60, shared 44, security 45, payments 22, next-config 32, analytics 34, sdk 9 |
| `pnpm --filter @repo/internationalization test` | incluído no `pnpm test`: 67 testes, paridade pt-br/en/es verde |
| `pnpm check`, `typecheck` de i18n, web e app | não rodados de novo. Esta etapa não alterou código nem teste; valem os números do `/review` (858 arquivos sem erro; 3/3 typecheck) |

O `test:emulator` sobe e derruba os próprios emuladores; conferi as portas 8080, 9099, 9199, 4001, 4400,
4500 e 9150 livres depois dele.

### Prova de que os testes novos reprovam o código antigo

O handoff afirmava isso; medi de novo. Criei um worktree temporário do `HEAD` (`5f4a8e9`), copiei os quatro
arquivos de teste da feature, acrescentei só a constante `LOCALE_REQUEST_HEADER` em `utils.ts` (sem efeito
de comportamento) e rodei:

| teste | no código antigo |
|-------|------------------|
| `packages/internationalization/__tests__/serverDictionary.test.ts` | 3 falham, 5 passam. Falham: URL vence cookie, primeira visita sem cookie, padrão inválido vira `pt-br` |
| `apps/web/__tests__/proxyLocale.test.ts` | 4 falham, 1 passa (o redirect sem repasse) |
| `apps/app/__tests__/proxy.test.ts` + `notFoundPageHomeLink.test.tsx` | 4 falham, 24 passam. Falham: 404 no idioma da URL, repasse, header forjado, asset com header forjado |

Os números batem com o handoff. O worktree foi removido (`git worktree list` sem a entrada).

### Testes criados nesta etapa

Nenhum. Os quatro arquivos da feature cobrem, no nível unitário, a ordem header, cookie e padrão, os
valores inválidos, o repasse e a sobrescrita nos dois proxies, o descarte no ramo de asset e a 404 da app.
O que falta é a ligação entre o override de header do proxy e o `headers()` do Server Component, que é do
Next e só se prova com o servidor de pé. Medi essa ligação por `curl` e browser em build de produção
(abaixo). Um teste com processo externo para isso seria a faixa cara sem objeto de infra próprio, e o
plano já decidiu não acrescentar caso de `lang` ao Playwright (pergunta 6).

## Decisões de custo de teste

| módulo tocado | decisão |
|---------------|---------|
| `packages/internationalization/server.ts` | unitário com `next/headers` mockado basta: a função só lê dois valores e escolhe. 8 casos |
| `apps/web/proxy.ts` | unitário do proxy lendo `x-middleware-request-*` basta para o repasse; a entrega ao render foi medida em build |
| `apps/app/proxy.ts` | idem, 4 casos novos em `describe("proxy locale")` |
| `apps/app/shared/components/ui/NotFoundPage.tsx` | teste de componente com `headers` e `cookies` mockados; 1 caso novo |
| `apps/web/app/[locale]/pricing/page.tsx` | só remoção de comentário; `pricingPage.test.tsx` existente cobre a página |

Nenhum teste da faixa cara criado.

## Critérios de aceite, item a item

| # | critério | status | meio | valor medido |
|---|----------|--------|------|--------------|
| 1 | Primeira visita à landing no idioma da URL | ✅ | curl + browser (build) | Sem cookie: `/en` → `lang="en"`, h1 "Home", FAQ "Frequently asked questions", `<title>Home`; `/es` → `lang="es"`, h1 "Inicio", "Preguntas frecuentes", rodapé em espanhol; `/pt-br` → `lang="pt-br"`, "Início", "Perguntas frequentes". `set-cookie: x-locale=en; Path=/` em `/en` |
| 2 | URL vence cookie em toda página da web | ✅ | curl + browser (build) | Cookie `pt-br`: `/en/pricing` `lang="en"` "Pricing"; `/en/contact` `lang="en"` "Contact - Next Boilerplate"; `/en/legal/privacy` `lang="en"` h1 "Privacy Policy"; `/es/pricing` `lang="es"` "Precios". Navegação client-side para `/pt-br/pricing` com cookie `en`: `lang="pt-br"`, título "Preços", h1 "Preços" |
| 3 | Server Action no idioma da URL | ✅ | curl (build) | `POST` com `Next-Action` da action `getDictionary` e cookie `pt-br` em `/en/contact` → `"locale":"en"`; cookie `en` em `/es` → `"es"` e em `/pt-br` → `"pt-br"`. A action de contato não tem chamador na UI, então não há envio de formulário a medir |
| 4 | Na app, `lang` acompanha a URL na carga completa | ✅ | curl + browser (build) | Anônimo: cookie `pt-br` em `/en/sign-in` → `lang="en"`, "Sign In"; cookie `en` em `/es/sign-in` → `lang="es"`, "Iniciar sesión"; cookie `es` em `/pt-br/sign-in` → `lang="pt-br"`, "Entrar". Logado, cookie `pt-br`: `/en/entities` → `lang="en"`, aba "User dashboard", colunas "Photo, Name, Type, Created, Active, Actions"; `/es/entities` → `lang="es"`, "Panel de usuario", "Foto, Nombre, Tipo". Logado, cookie `es` em `/pt-br/entities` → `lang="pt-br"`, "Painel do usuário" |
| 5 | Troca pelo seletor atualiza o `lang` sem recarregar | rodada 1: ❌ (app, pré-existente) · ✅ (web). Rodada 2: ✅ | browser (build), mais medição no `HEAD` | Web: `/pt-br` → `/en` pelo seletor, marcador em `window` preservado, `lang="en"`, h1 "Home". App: `/en/entities` → `/es/entities` pelo seletor, marcador preservado, título "Panel de usuario" e colunas em espanhol, mas `document.documentElement.lang` continua `"en"`; depois de recarregar, `"es"`. No `HEAD` (`5f4a8e9`), mesmo build e mesma conta: idêntico, `lang="en"` depois da troca |
| 6 | 404 da app no idioma da URL | ✅ | curl + browser (build) | Logado, cookie `pt-br`: `/en/rota-inexistente` → 404, `lang="en"`, "Page not found", link "Go to home" → `/en`. `/es/...` → "Página no encontrada", "Ir al inicio" → `/es`. Cookie `en` em `/pt-br/...` → "Página não encontrada", "Ir para o início" → `/pt-br` |
| 7 | Sem idioma na URL: cookie, depois padrão | ✅ | curl (build) + unitário | `/x/y/nao-existe.txt` (ramo de asset): cookie `es` → 404 `lang="es"`, "Página no encontrada", link `/es`; sem cookie → `lang="pt-br"`, link `/pt-br`. `/` → 307 `location: /pt-br/` nas duas apps. Padrão inválido: teste unitário "falls back to pt-br when the configured default is not a supported locale" |
| 8 | Header forjado não escolhe o idioma | ✅ | curl (build) + unitário | `x-request-locale: es` + cookie `pt-br` em `/en` (web) → `lang="en"`; mesmo par em `/en/sign-in` (app) → `lang="en"`. Asset: `x-request-locale: en` + cookie `es` em `/x/y/nao-existe.txt` → `lang="es"`. Valor inválido: `x-request-locale: fr` + cookie `en` no asset → `lang="en"` |
| 9 | Nenhum header interno vaza | ✅ | curl (build) | 0 ocorrências de `x-middleware` em 10 URLs das duas apps (incluindo `/`, redirects, `/en/entities` anônimo, asset 404, `/api/inexistente`), todas com `x-request-locale: es` forjado. CSP e HSTS presentes em `/`, `/en/sign-in`, redirect de `/en/entities`, asset 404 e redirect de `/`. Na web, a CSP segue `report-only` |
| 10 | Teste que o código antigo reprova | ✅ | Vitest no `HEAD` | 3/8, 4/5 e 4/28 falham no código antigo; `pnpm test` verde (15/15) |
| 11 | Tema e responsivo sem mudança | ✅ | browser (build) | Web `/es` a 375 px light e dark: `scrollWidth` = `clientWidth` (360, barra de rolagem de 15 px), hero, botões e logos dentro da largura. Web `/en` desktop light e dark: legível. App `/es/entities` a 375 px light e dark: `scrollWidth` 375 = `clientWidth`, a tabela rola dentro do próprio contêiner. App `/en/sign-in` a 375 px light e dark e `/en/rota-inexistente` dark: sem corte |

## Verificar no `/test` (lista do `review.md`)

1. **Web, primeira visita sem cookie: confirmado.** `/en` → `lang="en"`, h1 "Home"; `/es` → `lang="es"`,
   h1 "Inicio". O título do FAQ, que é Server Component, também sai no idioma da URL.
2. **Web, URL vence cookie: confirmado.** `/en/pricing` com cookie `pt-br` → `lang="en"`. `curl -D -` em
   `/en` → `set-cookie: x-locale=en; Path=/`.
3. **Web, header forjado: confirmado.** `x-request-locale: es` + cookie `pt-br` em `/en` → `lang="en"`.
4. **Web, Server Action de contato: confirmado pelo mecanismo, com ressalva.** A action `contact` não tem
   chamador na UI (só `contactAction.test.ts` a importa), então não há envio de formulário a disparar. Medi
   o `POST` de Server Action com a action `getDictionary`, que o build expõe porque `server.ts` é
   `"use server"`: em `/en/contact` com cookie `pt-br`, a resposta traz `"locale":"en"`.
5. **App, carga completa: confirmado.** `/en/sign-in` com cookie `pt-br` → `lang="en"`. Logado,
   `/en/entities` → `lang="en"` e `/es/entities` → `lang="es"`, ambos com cookie `pt-br`.
6. **App, 404 logado: confirmado.** `lang="en"`, "Page not found", link "Go to home" para `/en`.
7. **App, ramo de asset: confirmado, com o repro corrigido.** O caminho sugerido, `/nao-existe.txt`, não
   chega ao 404: um caminho de um segmento casa com a rota `[locale]` (com `locale = "nao-existe.txt"`) e o
   visitante anônimo recebe 307 para `/nao-existe.txt/sign-in`, que termina em
   `/pt-br/sign-in?redirect=...` depois de 3 redirects. Isso já acontecia antes desta tarefa (achado O1).
   Com `/x/y/nao-existe.txt`, que passa pelo mesmo ramo: cookie `es` → 404 `lang="es"`; com
   `x-request-locale: en` somado → ainda `lang="es"`.
8. **App, fora do matcher: confirmado; o `ARCHITECTURE.md` está certo.** `/api/inexistente` com
   `x-request-locale: en` + cookie `es` → 404 `lang="en"`, "Page not found". Sem o header → `lang="es"`;
   com `fr` → `lang="es"`.
9. **Nenhum `x-middleware-*`; CSP e HSTS: confirmado.** Zero ocorrências; CSP e HSTS presentes em todos os
   ramos sob o matcher, inclusive no redirect de `/`. Fora do matcher (`/api/*`, `_next/static`) não há CSP
   nem HSTS, como antes.
10. **`LanguageSwitcher` atualiza o `lang`: na rodada 1, derrubado na app e confirmado na web; na rodada 2, confirmado na app.** Na app, depois da troca
    suave de `/en/entities` para `/es/entities`, o `lang` ficou `"en"`. No `HEAD`, idêntico. Ver achado O2.

## Lacunas de teste herdadas

- **Ligação do override do proxy com `headers()` no Server Component, sem teste unitário:** continua
  aberta como teste automatizado, mas o comportamento está medido aqui em build de produção (itens 1 a 9).
  Só fecha com teste contra servidor de pé, que o plano recusou.
- **Testes de proxy presos ao formato `x-middleware-request-*` do Next 16.0.0:** continua aberta, e
  aceita. Mesmo risco dos testes de `x-app-path`.
- **Sem caso E2E de `lang` no Playwright:** fora de escopo (pergunta 6 do plano).

## Achados

Nenhum defeito introduzido por este diff. Os três abaixo existem no `HEAD` e ficam fora do escopo; a
recomendação é registrar no `specs/BACKLOG.md`.

- **O1. Arquivo inexistente de um segmento na app redireciona para o login em vez de dar 404.**
  Repro: `curl -s -D - -o /dev/null http://localhost:3000/favicon-novo.png` (anônimo) → 307
  `location: /favicon-novo.png/sign-in`; seguindo, três redirects até `/pt-br/sign-in?redirect=...`. Causa
  provável: o proxy deixa passar o caminho com extensão (`apps/app/proxy.ts:197-199`), mas a rota
  `[locale]` aceita qualquer segmento, e `requireSession` (`apps/app/lib/server/authSession.ts:37`)
  redireciona para `/${locale}/sign-in` com o segmento no lugar do idioma. O comentário de
  `isStaticAssetPath` (`apps/app/proxy.ts:127-133`) diz que o ramo existe justamente para não mandar
  visitante ao login. Correção sugerida (hipótese): `notFound()` no layout de `[locale]` quando o parâmetro
  não está em `locales`.
- **O2. Na `apps/app`, a troca de idioma suave não atualiza o `<html lang>`. Corrigido na rodada 2 do `/review`; remedido abaixo.** Repro: logado, abrir
  `/en/entities`, trocar para "Español" no seletor; `document.documentElement.lang` fica `"en"` até
  recarregar. Medido igual no `HEAD`. Causa: o root layout da app (`apps/app/app/layout.tsx`) fica acima
  do segmento `[locale]` e não é renderizado de novo numa navegação suave. A web não tem o problema porque
  o root layout dela é `app/[locale]/layout.tsx`. O `test/report.md` de
  `i18n-hydration-admin-delete-billing` (linha 67) registrou o contrário; não confirmei em que modo aquela
  medição foi feita. Leitor de tela segue pronunciando o idioma anterior até a próxima carga completa
  (WCAG 3.1.1). Correção sugerida (hipótese): um efeito no `LocaleProvider`
  (`packages/internationalization/client.ts`) que grave `document.documentElement.lang` quando o `locale`
  muda.
- **O3. `getDictionary` e `getTranslations` ficam expostas como Server Actions públicas.** Como
  `packages/internationalization/server.ts` tem `"use server"`, o build registra as duas no
  `server-reference-manifest.json`, e qualquer `POST` com o id certo recebe o dicionário inteiro. O
  conteúdo é público (é o texto da UI), então o risco é baixo. Anterior a esta tarefa.

Também visto e já registrado no backlog: a 404 da `apps/web` é a padrão do Next, com `<html>` sem `lang`
(`specs/BACKLOG.md:639`), e a 404 da app sai sem `<title>` (`specs/BACKLOG.md:690`). Fora do diff, o
`next start` da web registra `Cannot assign to read only property 'redirects'` ao checar a config.

## Evidências e2e

O que prova cada item é o texto da tabela acima. Os prints em `test/e2e/` são apoio, e o `.gitignore` os
descarta:

- `01-web-en-light.png`, `02-web-en-dark.png`: `/en` sem cookie, 1280 px. Header "Home / Product /
  Contact", seletor "English", hero "Home", botões "Sign In" e "Sign Up".
- `03-web-es-mobile-light.png`, `04-web-es-mobile-dark.png`: `/es` sem cookie, 375 px. "Inicio",
  "Iniciar sesión", "Registrarse", "Empresas que confían en nosotros".
- `05-app-en-entities-light.png`, `07-app-en-entities-dark.png`: logado, `/en/entities` com cookie `pt-br`.
- `06-app-404-en-dark.png`: logado, `/en/rota-inexistente` com cookie `pt-br`. "Page not found", "The
  address you opened does not exist or has been moved.", "Go to home".
- `08-app-es-entities-mobile-light.png`, `09-app-es-entities-mobile-dark.png`: logado, `/es/entities` com
  cookie `pt-br`, 375 px. "Entidades", "Nuevo", "Buscar por nombre o descripción", "Actualizar", colunas
  "Foto, Nombre, Tipo", tipos "Cliente", "Colaborador", "Franquicia".
- `10-app-signin-en-mobile-light.png`, `11-app-signin-en-mobile-dark.png`: anônimo, `/en/sign-in` com
  cookie `pt-br`, 375 px. "Sign In", "Enter with your account to continue", "Continue with Google".

O console e os erros de página do browser ficaram vazios nas duas sessões. Os logs do `next start` da app
e da web não têm erro de hidratação nem `#418`.

## Cross-check

| eixo | coberto |
|------|---------|
| `apps/web` × `apps/app` | as duas, em build de produção |
| anônimo × comum logado | os dois. Admin e personificação não mudam nada: o idioma não depende do ator, e o diff não toca guard |
| `subscription` × `simple` | não se aplica: o diff não toca billing |
| 3 idiomas | pt-br, en e es na web (landing) e na app (login, entidades, 404) |
| light × dark × 375 px | web `/en` e `/es`; app login, entidades e 404 |

## Ambiente do e2e

Todas as portas estavam livres no início; não reutilizei nada do usuário.

- Subi e derrubei por PID: `next start` da web (3001) e da app (3000), `next dev` da API (3002, que não é
  objeto da medição) e `pnpm emulators` (Auth 9099, Firestore 8080, Storage 9199, UI 4001, hub 4400, 4500,
  9150), este encerrado com `SIGINT`. Também um `next start` do `HEAD` na porta 3100, para a medição de
  base.
- O ambiente de cada servidor veio do mesmo montador do `pnpm e2e` (`apps/e2e/support/stackEnv.ts`):
  `.env.example` com o bloco do emulador forçado e as credenciais reais vazias, projeto
  `demo-next-boilerplate`.
- No fim, 3000, 3001, 3002, 3100, 8080, 9099, 9199, 4001, 4400, 4500 e 9150 ficaram sem processo
  escutando.
- Os dois worktrees temporários do `HEAD` (`/tmp/slfu/base`, `/tmp/slfu/base2`) foram removidos e
  `git worktree prune` rodou.

## Estado de dev alterado

- `apps/web/.next` e `apps/app/.next` foram reconstruídos com o ambiente do emulador. Um `next start` sem
  novo build vai apontar para o emulador, não para o `.env` local.
- Dados de QA: nenhuma conta criada. Usei a conta `user@example.com` do `pnpm seed`, que só existe no
  emulador e morreu com ele. Nenhuma conta em projeto Firebase real, nada a acrescentar ao
  `docs/PRE-PRODUCTION.md`.
- Nenhum arquivo do repositório alterado fora desta pasta.

## Rodada 2: remedição do O2

O `/review` acrescentou `apps/app/shared/components/DocumentLangSync.tsx`, um componente client que grava
`document.documentElement.lang` a partir de `useParams().locale` quando o segmento é um idioma válido. Ele
fica montado em `apps/app/app/layout.tsx:78` e tem teste próprio em
`apps/app/__tests__/documentLangSync.test.tsx` (3 casos). Remedi só o que essa mudança toca, com a app
reconstruída (`pnpm --filter app build`, ambiente do emulador) e em `next start`. A web não mudou e não foi
medida de novo.

### Testes

| comando | resultado |
|---------|-----------|
| `pnpm turbo run test typecheck --filter=app` (sem `--force`) | 10/10 tasks, todas do cache (mesmas entradas que o `/review` já rodou). app 826 testes em 102 arquivos (823 + os 3 do `DocumentLangSync`); typecheck verde |
| `pnpm test` da raiz | não rodado de novo: a mudança fica só na `apps/app`, cuja suíte está acima. Vale o 15/15 da rodada 1 para os demais workspaces |

Nenhum teste criado nesta rodada. O unitário do componente cobre a troca de segmento, a rota sem segmento e
o segmento inválido; o efeito no navegador foi medido abaixo.

### Troca de idioma suave na app

Logado como `user@example.com` do seed, carga completa de `/en/entities` com `x-locale=pt-br` (`lang="en"`),
um marcador gravado em `window` e um `MutationObserver` no atributo `lang` do `<html>`:

| ação | marcador | `lang` final | mudanças do atributo | conteúdo |
|------|----------|--------------|----------------------|----------|
| "Español" no seletor, `/en/entities` → `/es/entities` | preservado | `es` | uma, 441 ms depois do clique, já em `/es/entities` | aba "Panel de usuario", colunas "Foto, Nombre, Tipo" |
| "Português", `/es/entities` → `/pt-br/entities` | preservado | `pt-br` | uma, 395 ms depois do clique, já em `/pt-br/entities` | aba "Painel do usuário", colunas "Foto, Nome, Tipo" |
| botão voltar do navegador → `/es/entities` | preservado | `es` | não medido | colunas "Foto, Nombre" |
| a 375 px, "English", `/es/entities` → `/en/entities` | preservado | `en` | não medido | colunas "Photo, Name, Type" |

Os 441 ms e 395 ms incluem a requisição RSC da página nova: o atributo muda uma vez, quando a URL já é a
nova, sem passar por valor intermediário.

### O componente não sobrescreve rota sem segmento válido

No browser, depois de `networkidle` e mais 1,5 s para a hidratação:

| URL | cookie `x-locale` | `lang` depois da hidratação | título | link de início |
|-----|-------------------|-----------------------------|--------|----------------|
| `/x/y/nao-existe.txt` | `es` | `es` | "Página no encontrada" | `/es` |
| `/x/y/nao-existe.txt` | sem cookie | `pt-br` | "Página não encontrada" | `/pt-br` |
| `/en/nao-existe.txt` | `es` | `es` | "Página no encontrada" | `/es` |
| `/en/rota-inexistente` | `pt-br` | `en` | "Page not found" | `/en` |
| `/es/rota-inexistente` | `pt-br` | `es` | "Página no encontrada" | `/es` |
| `/api/inexistente` | `es` | `es` | "Página no encontrada" | `/es` |

Em `/en/nao-existe.txt` o `lang` segue o cookie (`es`), e não o `en` do caminho, porque o 404 raiz não
recebe o segmento como parâmetro. Página e `lang` ficam coerentes entre si; é o comportamento descrito no
critério de rota sem idioma na URL.

### Tema e responsivo depois da troca

- `12-r2-app-ptbr-after-switch-light.png` e `13-r2-app-ptbr-after-switch-dark.png`: `/pt-br/entities`
  depois da troca, 1280 px. Sidebar "Plataforma, Playground, Entidades, Configurações", breadcrumb "Início >
  Entidades", botões "Novo" e "Atualizar", colunas "Foto, Nome, Tipo, Criado em, Ativo, Ações", datas "7 de
  out. de 2026, 19:01". No dark, a classe do `<html>` é `dark` e o `lang` é `pt-br`; o componente não mexe
  na classe.
- `14-r2-app-en-after-switch-mobile.png`: `/en/entities` a 375 px depois da troca. `scrollWidth` 375 =
  `clientWidth`; "Entities", "New", "Search by name or description", "Refresh"; a tabela rola dentro do
  próprio contêiner, como na rodada 1.

O console e os erros de página do browser ficaram vazios; o log do `next start` da app não tem erro de
hidratação.

### Ambiente da rodada 2

Portas livres no início. Subi e derrubei por PID: `pnpm emulators` (encerrado com `SIGINT`), `next dev` da
API (3002) e `next start` da app (3000). No fim, 3000, 3001, 3002, 3100, 8080, 9099, 9199, 4001, 4400, 4500
e 9150 ficaram sem processo escutando. A sessão do browser foi fechada e o harness temporário em `/tmp`,
apagado. Nenhuma conta criada: usei de novo a conta do seed, que morreu com o emulador. `apps/app/.next`
ficou de novo com o build do ambiente do emulador.
