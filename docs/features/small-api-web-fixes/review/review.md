# Revisão: lote de correções pequenas (web, auth, e2e, scripts de start)

Rodada autônoma do `/cycle`, sem o usuário acompanhando. Escopo: só os arquivos dos itens 2, 3, 5 e 6 listados no
`develop/handoff.md`. O resto do working tree pertence a três tarefas já revisadas e ficou de fora.

## Branch

- `feat/audit-log-levels`, reutilizada. O usuário pediu que toda a madrugada ficasse nela; nenhuma branch foi
  criada ou trocada.
- Regex de validação do nome: passou (`branch OK`).
- Índice intocado: segue com os dois `git mv` de `specs/` de outra tarefa
  (`admin-own-account/spec.md`, `app-form-layout-centered/spec.md`).

## Revisão — itens 2, 3, 5 e 6

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/app/__tests__/onboardingState.test.ts:138-160` — as entradas codificadas `"%2Fpt-br%2Fonboarding"` e
  `"%2Fpt-br%2Fonboarding%3Fx%3D1"` continuavam passando, mas porque o guard as recusa, não porque o laço do
  onboarding foi detectado. Os dois testes diziam provar a detecção do laço e, para essas entradas, provavam
  outra coisa. **Corrigido**: as duas saíram das listas de laço, e a lista de destinos inseguros
  (`:125-136`) ganhou `"%2Fes%2Fentities"`, que só cai no fallback `/es` se o guard não decodificar de novo.
- `packages/auth/redirect.ts:29` — o desvio declarado no handoff (`/pt-br/%2F%2Fevil.com` no header
  `x-app-path`, antes recusado, agora aceito) não tinha teste. Análise abaixo; conclusão: o destino não sai da
  origem. **Corrigido** com teste dedicado em `packages/auth/__tests__/postAuthRedirectTarget.test.ts:30-44`.

### 🟢 Sugestão / nit

- `packages/auth/redirect.ts:33,41-42` — anterior a este lote e sem relação com a remoção da decodificação:
  `"/pt-br/\t/evil.com"` e `"/pt-br/\\/evil.com"` passam pelo guard e resolvem para `/pt-br//evil.com` e
  `/pt-br///evil.com`. Mesma origem, então não é open redirect, mas contradiz o nome do teste "rejects a path
  smuggling a double slash" (`postAuthRedirectTarget.test.ts:88`). Endurecer custa uma condição
  (`!resolvedPath.includes("//")`). Ficou como decisão em aberto: muda comportamento fora do escopo do lote.
- `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx:28` — `TRAILING_SLASHES` repete a constante
  de `apps/web/shared/lib/pricingCta.ts:1`. Duas cópias de uma regex de uma linha; não vale um módulo novo agora.

### ✅ OK

- Item 2: `NEXT_PUBLIC_APP_URL` vazia é tratada como ausência na borda (`apps/web/env.ts:32`, `|| undefined`) e o
  componente testa por valor verdadeiro (`sign-in-form-client.tsx:38-40`), então string vazia esconde o link. O
  `<a>` aponta para a app, que tem a rota (`apps/app/app/[locale]/(unauthenticated)/forgot-password/page.tsx`) e a
  trata como pública (`apps/app/proxy.ts:93`). A copy nos 3 idiomas é idêntica à do login da app
  (`translations/apps/app/pages/signIn/index.ts:24,49,74`). Paridade de i18n verde.
- Item 3: nenhum código de produção decodifica o resultado do guard (`rg decodeURI` em `apps/` e `packages/` fora
  de testes: zero ocorrências). Leitura dos chamadores na seção seguinte.
- Item 5: `apps/e2e/support/regExp.ts` é a mesma função que estava em `signIn.spec.ts`; os quatro usos com texto
  do dicionário passam por ela.
- Item 6: `apps/web/package.json:7` e `apps/api/package.json:9` com `next start -p ${PORT:-porta}`. No
  `apps/api/package.json`, a linha `backfill-audit-levels` (`:15`) é da `audit-log-levels` e não foi mexida.
- Comentários: o JSDoc novo do guard (`redirect.ts:18-20`) explica o porquê (contrato do valor de entrada) e não
  cita artefato do fluxo.

### 👁 Verificar no `/test`

1. **Item 6, app respondendo na porta.** Depois de `pnpm --filter web build` e `pnpm --filter api build`:
   `pnpm --filter web start` → `curl -sI http://localhost:3001/pt-br`; `PORT=3105 pnpm --filter web start` →
   `curl -sI http://localhost:3105/pt-br`; na api, `curl -s http://localhost:3002/health` e `:3105/health`
   (espera `200 {"message":"OK"}`). O handoff mediu só a porta impressa pelo Next, sem build.
2. **Item 2 no navegador.** `/{pt-br,en,es}/sign-in` da landing com `NEXT_PUBLIC_APP_URL` preenchida: o link
   aparece acima de "Não tem uma conta?" e abre `<APP_URL>/{locale}/forgot-password`. Com
   `NEXT_PUBLIC_APP_URL=""`, o link some e o resto fica igual. Light, dark e mobile 390 px. O teste de componente
   mede `href` e presença, não layout nem contraste do bloco `space-y-2` novo.
3. **Item 3 no fluxo.** `/pt-br/sign-in?redirect=%2Fpt-br%2Faccount%3Ftab%3Dbilling` leva a
   `/pt-br/account?tab=billing` depois do login. Afirmação do handoff que sustenta o item: um `%26` dentro da
   query do destino agora sobrevive. Repro: `/pt-br/sign-in?redirect=%2Fpt-br%2Fentities%3Fq%3Da%2526b` deve
   terminar em `/pt-br/entities?q=a%26b` (antes terminava em `q=a&b`).
4. **Item 3, forma codificada no header.** Com sessão de usuário comum e onboarding pendente, abrir
   `/pt-br/%2F%2Fevil.com`: o redirecionamento para o onboarding deve carregar
   `redirect=%2Fpt-br%2F%252F%252Fevil.com`, e concluir o onboarding deve cair em `/pt-br/%2F%2Fevil.com`
   (404 da app), nunca em `evil.com`.
5. **Item 5.** `pnpm e2e` sem mudança de resultado; roda no job `e2e` do CI.

## Item 3: análise de segurança

**(a) Chamadores.** Li todos os pontos que chamam `postAuthRedirectTarget`, direta ou indiretamente:

| chamador | origem do valor | decodificado uma vez? |
|----------|-----------------|------------------------|
| `apps/app/proxy.ts:280` | `request.nextUrl.searchParams.get("redirect")` | sim |
| `apps/app/shared/lib/postLoginNavigation.ts:122-125` | `URLSearchParams(window.location.search).get` | sim |
| `packages/auth/provider.tsx:92-94` e `:157-159` | `URLSearchParams(...).get("redirect")` | sim |
| `apps/app/shared/lib/authRedirectLink.ts:8` (`SignInForm.tsx:194`, `SignUpFormClient.tsx:214`) | prop `redirect` vinda do `searchParams` da página | sim |
| `InvitationAcceptance.tsx:56-57` | caminho montado em código, token com `encodeURIComponent` | já é caminho; não deve ser decodificado |
| `onboarding/page.tsx:40` | `searchParams.redirect` | sim |
| `lib/server/onboarding.ts:39-40` → `buildOnboardingPath` | header `x-app-path` = `${pathname}${search}` do proxy | é caminho de URL; não deve ser decodificado |

Nenhum chamador passa valor ainda codificado. O ciclo de ida e volta fecha: `buildOnboardingPath` codifica o
destino uma vez (`shared/lib/onboarding.ts:104`) e a página do onboarding lê uma vez, então
`/pt-br/%2F%2Fevil.com` volta como `/pt-br/%2F%2Fevil.com`.

**(b) O desvio declarado.** O guard devolve o valor recebido, não o caminho resolvido. Todos os destinos finais
resolvem esse valor contra a origem atual com o parser WHATWG: `pointAt` no proxy (`proxy.ts:170-174`, via
`new URL`), `redirect()` do Next (`onboarding/page.tsx:45`, cabeçalho `Location` relativo),
`window.location.replace` (`SignInForm.tsx:63`, `SignUpFormClient.tsx:64`, `useSignedInRedirect.ts:63`,
`provider.tsx:389`) e `router.replace(withDestinationLocale(...))` (`OnboardingClient.tsx:70`). O
`withDestinationLocale` só troca o primeiro segmento e não pode produzir `//` no início.

O parser WHATWG não decodifica `%2F`, `%5C` nem `%09` no pathname; só trata `\` literal como `/` e remove tab e
quebra de linha literais. Medi a réplica exata do guard em Node contra `https://app.example.com`:

| entrada | saída do guard | origem final |
|---------|----------------|--------------|
| `/pt-br/%2F%2Fevil.com` | igual | `https://app.example.com` |
| `/pt-br/%5C%5Cevil.com` | igual | mesma |
| `/pt-br/%09/evil.com` | igual | mesma |
| `/pt-br/..%2F..%2F%2F%2Fevil.com` | igual (`..%2F` não é segmento de ponto) | mesma |
| `/pt-br/%2e%2e/%2e%2e/%2F%2Fevil.com` | fallback | — |
| `/pt-br/../../\/evil.com` | fallback | — |
| `/pt-br/\t/evil.com` (tab literal) | igual | mesma, pathname `/pt-br//evil.com` |

Nenhuma entrada sai da origem. A checagem final sobre o `pathname` resolvido (`redirect.ts:41-42`) exige o
prefixo `/<locale>/`, e esse prefixo impede que o resultado vire `//host`. Quem já consegue pôr
`/pt-br/%2F%2Fevil.com` no header também consegue abrir esse endereço diretamente, então o guard não abre
nada novo. Não recusei `%2F`/`%5C` codificados: sem risco medido, seria regra a mais no guard compartilhado.

O teste novo (`postAuthRedirectTarget.test.ts:30-44`) fixa a propriedade: as quatro primeiras formas da tabela
são aceitas sem alteração e `new URL(resultado, origem)` mantém a origem. Se alguém recolocar a segunda
decodificação, `/pt-br/%2F%2Fevil.com` vira `/pt-br//evil.com`, cai no fallback e o teste falha.

**(c) `onboardingState.test.ts`.** Tratado no 🟡 acima.

## Correções aplicadas

| arquivo | mudança |
|---------|---------|
| `packages/auth/__tests__/postAuthRedirectTarget.test.ts:30-44` | teste novo: `%2F`, `%5C`, `%09` e `..%2F` codificados no caminho são aceitos e ficam na mesma origem |
| `apps/app/__tests__/onboardingState.test.ts:132` | `"%2Fes%2Fentities"` entra na lista de destinos inseguros |
| `apps/app/__tests__/onboardingState.test.ts:138-160` | saem `"%2Fpt-br%2Fonboarding"` e `"%2Fpt-br%2Fonboarding%3Fx%3D1"` das listas de laço, que passavam por outro motivo |

Nenhum código de produção mudou na revisão.

## Raio de impacto

- `postAuthRedirectTarget` (`@repo/auth/redirect`): consumidores na tabela da análise acima, todos em
  `apps/app` e `packages/auth`. `apps/web` não importa o guard.
- Chave `apps.web.pages.signIn.forgotPassword`: só `sign-in-form-client.tsx` e o teste novo.
- `apps/e2e/support/regExp.ts`: só os quatro specs do E2E.
- Scripts `start`: a Vercel não usa; o `pnpm lighthouse` chama `next start -p` direto, sem o script.

## Lacunas de teste

| lacuna (do handoff) | veredito |
|---------------------|----------|
| Item 6 sem teste automatizado | continua aberta; medição no item 1 do 👁 |
| `/pt-br/%2F%2Fevil.com` do header sem teste | fechada aqui (`postAuthRedirectTarget.test.ts:30-44`); o fluxo de ponta a ponta fica no item 4 do 👁 |
| `signInForgotPassword.test.tsx` em jsdom por arquivo | não é lacuna; segue o padrão do vizinho `signInFormRedirect.test.tsx` |

## Decisões em aberto

1. **Recusar caminho que resolve com `//` depois do prefixo** (`redirect.ts:41-42`, adicionando
   `&& !resolvedPath.includes("//")`). Anterior ao lote, mesma origem. Recomendação: tarefa direta separada,
   com teste para `"/pt-br/\t/evil.com"` e `"/pt-br/\\/evil.com"`.
2. **Ordem dos commits no `apps/api/package.json`.** O arquivo tem dois hunks no mesmo bloco do diff: o `start`
   (`:9`, deste lote) e o `backfill-audit-levels` (`:15`, da `audit-log-levels`). Recomendação: preparar só a
   linha do `start` com o patch descrito no plano de commits, nunca `git add apps/api/package.json` inteiro.

## Gates

| gate | comando | resultado |
|------|---------|-----------|
| lint | `pnpm check` | 1170 arquivos, nenhuma correção |
| typecheck | `pnpm turbo run typecheck --filter=@repo/auth --filter=app --filter=web --filter=e2e --filter=api` | 5/5 (2 do cache) |
| paridade i18n | `pnpm --filter @repo/internationalization test` | 67/67, 7 arquivos |
| testes pontuais dos arquivos alterados | `npx vitest run` em `packages/auth` e `apps/app` | 15/15 e 17/17 |

Os testes de `web` e `e2e` não foram rodados de novo: a revisão não tocou nesses escopos e o handoff registrou
web 319 e e2e 41.

## Plano de commits

Entra depois dos commits das outras três tarefas do working tree. Antes do primeiro commit deste lote,
`git diff --cached --stat` tem de sair vazio (os dois `git mv` de `specs/` não são deste lote).

1. `fix(auth): stop decoding the post-auth redirect twice`
   - `packages/auth/redirect.ts`
   - `packages/auth/__tests__/postAuthRedirectTarget.test.ts`
   - `apps/app/__tests__/postAuthRedirectTarget.test.ts` (remoção)
   - Registro do rename: `git add apps/app/__tests__/postAuthRedirectTarget.test.ts packages/auth/__tests__/postAuthRedirectTarget.test.ts`.
     O arquivo novo mantém 103 das 107 linhas, e o git mostra `rename` no `git show --stat`.
2. `test(app): stop relying on a second decode in onboarding destination tests`
   - `apps/app/__tests__/onboardingState.test.ts`
3. `fix(api): default start port to 3002 and honour PORT`
   - só a linha 9 de `apps/api/package.json`, com o patch:
     ```
     --- a/apps/api/package.json
     +++ b/apps/api/package.json
     @@ -9 +9 @@
     -    "start": "next start",
     +    "start": "next start -p ${PORT:-3002}",
     ```
     `git apply --cached --unidiff-zero <patch>` (conferido com `--check`). Se a `audit-log-levels` já tiver
     sido commitada com a linha do `backfill-audit-levels` isolada, o arquivo sobra só com este hunk e
     `git add apps/api/package.json` basta. Confirmar com `git diff --cached apps/api/package.json`.
4. `fix(web): default start port to 3001 and honour PORT`
   - `apps/web/package.json`
5. `feat(web): link landing sign-in to the app's password recovery`
   - `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx`
   - `apps/web/__tests__/signInForgotPassword.test.tsx`
6. `feat(internationalization): add landing sign-in forgot password copy`
   - `packages/internationalization/translations/apps/web/pages/signIn/index.ts` (o arquivo não tem hunk de
     outra tarefa)
7. `test(e2e): share escapeRegExp across specs`
   - `apps/e2e/support/regExp.ts`, `apps/e2e/__tests__/regExp.test.ts`, `apps/e2e/tests/entityCrud.spec.ts`,
     `apps/e2e/tests/landing.spec.ts`, `apps/e2e/tests/panelSwitch.spec.ts`, `apps/e2e/tests/signIn.spec.ts`
8. `docs(features): small-api-web-fixes`
   - `docs/features/small-api-web-fixes/` (varrido: sem senha, token ou e-mail real; os `token=` que aparecem
     são template literal de código citado)

O commit 5 usa uma chave que só existe depois do 6. Se cada commit precisar compilar sozinho, inverta 5 e 6.

Título de PR sugerido: `fix: small api, web, auth and e2e fixes`.

Commits realizados: _(preenchido pelo `/review`)_
