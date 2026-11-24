# Plano: core aprovado na parte 1 da entrega (fatia 2, "defesa em profundidade")

- Spec: [`specs/delivery-security-review.md`](../../../../specs/delivery-security-review.md) (`status: approved`), só
  a fatia 2. A fatia 1 saiu na PR #64 e tem o pipeline em `docs/features/delivery-security-review/`.
- Modo: autônomo, dentro do `/cycle`. Nenhuma pergunta foi feita; as decisões estão em "Perguntas em aberto
  (decididas por padrão)", no fim.
- Código lido em `5829ea3` (HEAD do workspace `lima`), em 2026-11-23. Âncoras desta versão.
- A fatia 3 da mesma spec roda depois, no mesmo working tree. A fronteira está em §1.3.

---

## Etapa 1: análise

### 1. Contexto

#### 1.1 Problema e objetivo

A parte 1 da etapa de entrega (`docs/delivery/01-security-review.md`) tem quatro itens que o core ainda deixa
para o fork resolver: 1.10 (CSRF), 1.16 (dado sensível em log), 1.18 (cookies) e 1.19 (CORS em produção),
além dos limites de 1.3/1.19. A fatia 1 fechou o que expunha dado hoje. Esta fecha as defesas em
profundidade, para que um fork novo passe nesses itens sem mexer em nada.

Em uma frase: a escrita autenticada por cookie passa a exigir prova de origem, os cookies de preferência
ganham `Secure` em HTTPS e prazo, `@repo/auth` deixa de imprimir o erro inteiro, a API encerra o processo
quando sobe em produção sem `CORS_ORIGIN`, e as duas entradas sem teto ganham limite.

#### 1.2 Corte (os cinco itens da fatia 2 da spec)

| # | item da spec | lacuna medida em `5829ea3` |
|---|--------------|-----------------------------|
| I1 | Origem conferida em toda escrita autenticada por cookie, na API e nas rotas de sessão das front-ends | `isOriginAllowed` aceita `origin === null` (`apps/api/(shared)/lib/cors.ts:48-53`), e a credencial por cookie é aceita (`apps/api/(shared)/lib/resolve-api-actor.ts:45-48`); `isSameOriginRequest` aceita ausência de `Origin` (`packages/auth/session.ts:78-82`); `customTokenPOST` não confere origem (`packages/auth/session-routes.ts:190-198`); `sessionDELETE` nem recebe a requisição (`session-routes.ts:174-183`) |
| I2 | Cookies de preferência com `Secure` em HTTPS e `maxAge`, pelo helper compartilhado | `setCookie` só põe `Secure` quando pedem (`packages/shared/utils/helpers/cookies.ts:24-31`); `x-locale` gravado pelo servidor sem `maxAge` nem `Secure` (`apps/app/proxy.ts:249,253`, `apps/web/proxy.ts:121,125`), o que transforma o cookie de 180 dias do seletor de idioma em cookie de sessão a cada requisição; `bp:*` sem `Secure` (`apps/app/shared/lib/panelState.ts:138,142`) |
| I3 | Logs sem objeto inteiro: os `console.error(error)` de `@repo/auth` passam a `logEvent` com código | sete chamadas em `packages/auth/server.ts:194,211,227,260,286,315,340` |
| I4 | API cai no boot sem `CORS_ORIGIN` em produção | `apps/api/instrumentation.ts:63-67` lança, mas o Next segue ouvindo e responde 500 em texto a tudo (medido no `/test` da PR #53, registrado no `BACKLOG.md`, linha do gate do `CORS_ORIGIN`) |
| I5 | `max` em toda string de entrada e Zod no corpo das rotas de sessão | `adminCreateUserSchema.email` sem `max` (`apps/api/(shared)/validation/user-admin.schema.ts:8`); `extractIdToken` sem Zod e sem teto (`packages/auth/session-routes.ts:36-54`) |

A auditoria de `max` (§4.5) varreu os doze arquivos de `apps/api/(shared)/validation/` e as rotas que leem
query string. Fora as duas lacunas acima, toda string tem `.max()` ou passa por regex ancorada de tamanho
fixo.

#### 1.3 Fora do corte

- O "Fora do corte" da spec inteiro: segundo fator, captcha/App Check, nonce na CSP, e-mail verificado nos
  guards, enumeração de e-mail.
- A fatia 3 inteira. Ela mexe em `entity.schema.ts` (foto), `account-avatar.ts`, na rota de upload, no
  formulário de cadastro da landing, em `packages/auth/components/sign-in.tsx` e no `exports` de
  `packages/auth/package.json`, e em `packages/email/index.ts`. Esta fatia não toca nenhum desses arquivos.
- Os quatro chamadores de `revokeUserSessions` que engolem a falha (deriva da fatia 1). A spec deixou para
  este `/analyze` decidir; ficam fora (Q9). O que muda neles é só a linha de log, porque o
  `console.error` de `revokeUserSessions` faz parte do I3.
- O `console.error(error)` de `packages/shared/utils/helpers/requestErrorReporter.ts:52` e os dois de
  navegador (`apps/api/app/global-error.tsx:15`, `apps/app/.../SignUpFormClient.tsx:123`). O item da spec
  fala de `@repo/auth` (Q10).
- O cookie `sidebar_state` do `Sidebar` do shadcn (`packages/design-system/components/ui/sidebar.tsx:109`),
  que o `pnpm bump-ui` regrava (Q6).
- Consolidar as três constantes de 180 dias que já existem no `apps/app` e no `apps/web` (Q14).

#### 1.4 Apps impactados

| camada | impacto |
|--------|---------|
| `packages/shared` | `setCookie` com `Secure` padrão em HTTPS; `isHttpsPage()` e `preferenceCookieOptions()` novos |
| `packages/auth` | `isSameOriginRequest` exige `Origin` ou `Sec-Fetch-Site: same-origin`; `customTokenPOST` e `sessionDELETE` passam a conferir origem; Zod no corpo de `sessionPOST`/`sessionRefreshPOST`; sete logs viram `logEvent` |
| `apps/api` | proxy recusa escrita por cookie sem `Origin`; boot encerra o processo em produção; `max` no e-mail do admin |
| `apps/app` | proxy grava `x-locale` com `maxAge` e `Secure` em HTTPS; `bp:*` com `Secure` em HTTPS; rota `DELETE /api/auth/session` repassa a requisição |
| `apps/web` | proxy grava `x-locale` como o `app`; rota `DELETE /api/auth/session` repassa a requisição |
| `packages/sdk` | N/A |
| `packages/internationalization` | N/A: nenhum código de erro novo |

- Área do painel: N/A (nada de tela). Modo de produto: o comportamento é o mesmo em `subscription` e
  `simple`. Assinatura: N/A.
- Dependência nova: nenhuma. `zod` já é dependência de `@repo/auth` (`packages/auth/package.json:27`) e
  `@repo/shared` já é dependência dele (`:21`). Variável de ambiente nova: nenhuma.
- Genérico: sim. Tudo vive em pacote de integração (`auth`), em `shared` ou no proxy de cada app.

#### 1.5 Fontes

| fonte | lido |
|-------|------|
| `specs/delivery-security-review.md` | inteira |
| `specs/BACKLOG.md` | "A próxima: fatia 2", fatos medidos 1 a 4, achados do gate do `CORS_ORIGIN`, do refresh sem `Origin`, do TTL do `x-locale`, do helper sem `Secure` e dos quatro chamadores |
| `.claude/cycle-policy.md` | inteira |
| `docs/feature-analysis-guide.md` | inteira |
| `docs/delivery/01-security-review.md` | 1.10, 1.16, 1.18 e 1.19 |
| `docs/SECURITY.md:171-204`, `docs/SETUP.md:73`, `docs/PRE-PRODUCTION.md:379-386,494-504` | trechos que esta fatia torna falsos |

Referências não lidas: nenhuma.

### 2. Dados (Firestore)

N/A. Nenhuma coleção, campo ou consulta muda.

### 3. Contrato `@repo/sdk`

N/A. O SDK manda `Authorization: Bearer` (`packages/sdk/src/client/base.ts:112-114`) e não liga
`withCredentials`, então o navegador nunca leva o cookie de sessão à API por ele. O `sessionAuthority` do
servidor também usa bearer (`packages/sdk/src/client/sessionAuthority.ts:38`), assim como o cliente de
servidor do `app` (`apps/app/lib/server/apiServerClient.ts:30`). Nenhum chamador do repositório cai na
recusa nova da API.

### 4. API e pacotes de servidor

#### 4.1 I1: origem na API

Hoje o proxy decide só pela allowlist (`apps/api/proxy.ts:180-189`), e requisição sem `Origin` passa. A
credencial por cookie continua aceita no `resolveFirebaseCredential` (`resolve-api-actor.ts:45-48`), e ela é
justamente a que um navegador manda sozinho.

Regra nova, aplicada no proxy logo depois da allowlist e antes do preflight e do rate limit:

> método mutável (`POST`, `PUT`, `PATCH`, `DELETE`) **e** sem `Origin` **e** com o cookie `access-token`
> **e** sem `Authorization` **e** `Sec-Fetch-Site` diferente de `same-origin` → `403 AUTH_FORBIDDEN_ORIGIN`.

- Bearer sem `Origin` continua aceito (servidor→servidor, SSR, `sessionAuthority`), como a spec pede em
  "Riscos". Um formulário de outro site não consegue pôr `Authorization`.
- Requisição sem cookie e sem `Origin` continua passando: é anônima, não há sessão para forjar. O webhook da
  Stripe (`/webhooks/payments`) está nesse caso.
- `Origin: null` (string) já é recusado hoje, porque `"null"` não está na allowlist.
- `GET` não muda.

O teste fica no nível da função pura (nova, `apps/api/(shared)/lib/cookie-write-origin.ts`) e do proxy
(`corsOrigin.test.ts`), que já monta `NextRequest` com header livre.

#### 4.2 I1: origem nas rotas de sessão das front-ends

`isSameOriginRequest` (`packages/auth/session.ts:78-89`) passa a:

| `Origin` | `Sec-Fetch-Site` | hoje | depois |
|----------|------------------|------|--------|
| mesmo host | qualquer | aceita | aceita |
| outro host | qualquer | recusa | recusa |
| malformado | qualquer | recusa | recusa |
| ausente | `same-origin` | aceita | aceita |
| ausente | `same-site`, `cross-site`, `none` | aceita | **recusa** |
| ausente | ausente | aceita | **recusa** |

Todo navegador suportado manda `Origin` em `POST`/`DELETE` de mesma origem, e os chamadores reais são
`fetch` do próprio app (`packages/auth/provider.tsx:165,178,196,225`, `SignInForm.tsx:98`,
`SignUpFormClient.tsx:87`, `googleSignInApi.ts:80`). Nenhum código de servidor chama essas rotas, e a suíte
E2E não as chama por `APIRequestContext` (`git grep "api/auth/session" -- apps/e2e` vazio).

Rotas que passam a usar a checagem:

| rota | hoje | depois |
|------|------|--------|
| `POST /api/auth/session` (`sessionPOST`) | confere, aceita sem `Origin` | regra nova |
| `POST /api/auth/session/refresh` (`sessionRefreshPOST`) | confere, aceita sem `Origin` | regra nova |
| `POST /api/auth/custom-token` (`customTokenPOST`) | não confere | regra nova; `request` deixa de ser opcional |
| `DELETE /api/auth/session` (`sessionDELETE`) | não recebe a requisição | regra nova; assinatura `sessionDELETE(request, authority?)` |

A recusa é a mesma de hoje: `403 AUTH_FORBIDDEN_ORIGIN`, antes de ler corpo, cookie ou Firebase.

#### 4.3 I3: logs de `@repo/auth`

As sete chamadas trocam `console.error("<texto>", error)` por `logEvent("auth", "<evento>", fields)`.
`logEvent` só aceita primitivos (`packages/shared/utils/helpers/log.ts:18-25`) e imprime uma linha
`[auth] <evento> k=v`. `fields` carrega:

- `code`: o código do Firebase (`auth/internal-error`, `auth/user-not-found`), lido por
  `firebaseAuthErrorCode` (`server.ts:133-143`), que já existe;
- `reason`: o `name` do erro quando não há código (`TypeError`, `FetchError`), o mesmo critério do
  `reasonOf` de `apps/api/(shared)/lib/session-tracker.ts:20-24`. A mensagem nunca entra, porque é nela que
  o provedor ecoa e-mail, uid ou token.

| linha | função | evento |
|-------|--------|--------|
| `:194` | `getIdTokenSession` | `id-token-session-failed` |
| `:211` | `getUserById` | `user-lookup-failed` |
| `:227` | `createCustomToken` | `custom-token-failed` (continua relançando) |
| `:260` | `verifyIdTokenClaims` | `id-token-verify-failed` |
| `:286` | `decodeSessionCookie` | `session-cookie-decode-failed` |
| `:315` | `getSessionFromCookie` | `session-cookie-verify-failed` |
| `:340` | `revokeUserSessions` | `session-revoke-failed` (o mesmo nome que `session-revocation.ts:15` já usa) |

Nenhum uid entra no log. Os códigos benignos continuam filtrados antes, como hoje.

#### 4.4 I4: boot que encerra o processo

`register` lança, o Next imprime "Failed to prepare server" e o processo segue ouvindo, respondendo 500 em
texto a toda rota. A correção é encerrar o processo de fato em produção:

- o corpo atual de `register` vira `prepareServer()`;
- `register` chama `prepareServer()` num `try`; no `catch`, fora de produção relança (o comportamento de
  hoje, que não derruba o `pnpm dev` do turbo); em produção imprime uma linha
  `[boot] <mensagem>` com `console.error` e chama `process.exit(1)`;
- o gate passa a usar `parseAllowedOrigins(process.env.CORS_ORIGIN).length === 0`, então `""` e `" , "`
  contam como ausência ("string vazia é ausência").

O `catch` cobre também a credencial do Firestore (`getFirestoreAdmin()`, `instrumentation.ts:72-73`), que
tem o mesmo defeito e cujo comentário (`:47-53`) já promete "a startup crash" (Q7). A linha impressa leva só
a `message` do erro: a nossa, para o `CORS_ORIGIN`, e a do `firebase-admin` para credencial ausente ou chave
malformada, que não ecoa o valor.

O `/develop` mede se o `next build` executa `register`. Se executar, o build sem `CORS_ORIGIN` passaria a
morrer, e o gate precisa pular `process.env.NEXT_PHASE === "phase-production-build"`. Se não executar, esse
desvio não entra (seria código morto).

#### 4.5 I5: limites

Auditoria das strings de entrada em `apps/api/(shared)/validation/`:

| arquivo | string | teto |
|---------|--------|------|
| `account.schema.ts` | `displayName`, `phone`, `avatar`, `reauthIdToken`, `newEmail`, senhas | `.max()` (`:11-15,37-71`) |
| `account.schema.ts:62` | `signInMethodIdSchema` | regex `^[a-z0-9.]{1,64}$` (`:16`) |
| `audit.schema.ts:25` | `calendarDaySchema` | regex `^\d{4}-\d{2}-\d{2}$` (`:6`) |
| `auth.schema.ts` | e-mails, `oobCode`, `idToken`, `requestUri` | `.max()` (`:11-49`) |
| `contact.schema.ts` | `name`, `email`, `message` | `.max()` |
| `entity.schema.ts` | `name`, `description`, `photo` | `.max()` |
| `organization.schema.ts` | e-mail; `token` | `.max(254)`; regex de 43 caracteres (`:9`) |
| `pagination.schema.ts` | `cursor` | `.max(512)` |
| `password.schema.ts` | senhas | `.max(PASSWORD_MAX_LENGTH)` |
| `payments.schema.ts` | `priceId` | `.max(255)` |
| `session.schema.ts:4` | id da sessão | regex `^\d{1,12}$` |
| `user-admin.schema.ts:8` | `email` | **nenhum** |

Query string: `users/route.ts:34` (`type`) passa por `parseUserTypeFilter` (enum); `file.schema.ts:158`
(`scope`) é comparado a valores fixos.

Mudanças:

- `user-admin.schema.ts:8`: `z.string().max(EMAIL_MAX).email()` com `EMAIL_MAX = 320`, o mesmo número de
  `auth.schema.ts:11` e `account.schema.ts:14`. Sem `trim`, para não mudar o que o campo aceita (Q12).
- `session-routes.ts`: `extractIdToken` vira um `z.object({ idToken: z.string().min(1).max(4096) })`, o
  mesmo teto de `GOOGLE_ID_TOKEN_MAX` e `REAUTH_ID_TOKEN_MAX`. Corpo que falha responde
  `400 AUTH_MISSING_TOKEN`, o código de hoje, que o cliente já trata (Q11).

#### 4.6 Códigos de erro

Nenhum novo. Reusados:

| código | status | onde passa a sair também |
|--------|--------|--------------------------|
| `AUTH_FORBIDDEN_ORIGIN` | 403 | escrita por cookie sem `Origin` na API; rotas de sessão sem `Origin` nem `Sec-Fetch-Site: same-origin`; `custom-token` e `DELETE /session` de outra origem |
| `AUTH_MISSING_TOKEN` | 400 | `idToken` acima de 4096 caracteres |
| `VALIDATION_FAILED` | 400 | e-mail do admin acima de 320 caracteres |

Os três já existem em `apiErrors` nos três idiomas (`translations/packages/shared/utils.ts:26-27`,
`:210-211`, `:395-396`).

### 5. Front-end

Nenhuma tela muda. O que muda no navegador:

- `setCookie` (`packages/shared/utils/helpers/cookies.ts:8-32`) põe `Secure` quando
  `window.location.protocol === "https:"` e o chamador não passou `secure`. Passar `secure: false`
  explicitamente continua valendo. Alcança os seis chamadores: `x-locale` (`LanguageSwitcher.tsx:53`,
  `OnboardingClient.tsx:69`, `postLoginNavigation.ts:53`, `language-switcher.tsx:47` da web), `x-theme`
  (`themePreference.ts:33,60`), o fuso (`DisplayTimeZoneProvider.tsx:46`), a preferência da conta
  (`AccountPreferencesForm.tsx:89`). O consentimento (`packages/analytics/provider.tsx:81-86`) já passa
  `secure` explícito e não muda.
- O `x-locale` gravado pelo proxy das duas apps ganha `maxAge` de 180 dias, `path: "/"`, `sameSite: "lax"` e
  `secure` quando `request.nextUrl.protocol === "https:"`, por `preferenceCookieOptions()` do helper.
- `writeCookie` de `panelState.ts:131-143` acrescenta `; secure` quando `isHttpsPage()`.

`Secure` decidido pelo protocolo, e não por `NODE_ENV` (Q5): em `localhost` por HTTP o cookie continua sem
`Secure` e funciona; atrás de um proxy que não repassa o protocolo, o cookie sai sem `Secure`, que é o
comportamento de hoje.

`removeCookie` não muda: apagar a partir de uma página HTTPS sobrescreve o cookie com `Secure` também.

### 6. i18n

N/A. Nenhuma chave nova; os códigos reusados já estão traduzidos (§4.6).

### 7. Autorização e segurança

- A regra nova da API é camada extra, não substitui o guard: requisição aceita pelo proxy ainda passa pelo
  guard e pela checagem de dono.
- Impersonação: o admin personificando usa bearer, como qualquer usuário do painel
  (`AuthRequestPanelContext.tsx:82`). Sem efeito.
- A spec avisa que recusar escrita sem `Origin` pode quebrar cliente que não é navegador e usa cookie. Não
  existe nenhum no repositório (§3). Fork que tiver um precisa mandar bearer ou `Origin`; isso entra na
  documentação (§B8).
- Os logs novos não carregam uid, e-mail, token nem mensagem do provedor.

### 8. Testes (nível mais barato que prova)

| # | arquivo | nível | prova |
|---|---------|-------|-------|
| T1 | `apps/api/__tests__/cookieWriteOrigin.test.ts` (novo) | função pura | a tabela da regra de §4.1: recusa só com método mutável, sem `Origin`, com cookie, sem `Authorization` e sem `Sec-Fetch-Site: same-origin`; cada condição isolada libera |
| T2 | `apps/api/__tests__/corsOrigin.test.ts` (estender) | proxy com `NextRequest` | `POST` com cookie e sem `Origin` → 403 `AUTH_FORBIDDEN_ORIGIN`, `Vary: Origin`, sem `Access-Control-Allow-Origin`, `logEvent` com `reason=missing-origin` e sem cookie no log; com bearer passa; `GET` com cookie passa; `POST` sem cookie passa; `POST /webhooks/payments` sem cookie passa |
| T3 | `packages/auth/__tests__/sessionOrigin.test.ts` (novo) | função pura + handlers | a tabela de §4.2 em `isSameOriginRequest`; cada uma das quatro rotas recusa com 403 sem `Origin` e sem `Sec-Fetch-Site`, sem chamar Firebase nem mexer no cookie |
| T4 | `packages/auth/__tests__/sessionRoutesAuthority.test.ts` e `sessionRefreshRoute.test.ts` (ajustar) | handlers | o construtor de requisição passa a mandar `Origin: http://<HOST>`; `customTokenPOST()` e `sessionDELETE(authority)` ganham a requisição. É adaptação ao contrato novo; nenhuma asserção sai |
| T5 | `sessionOrigin.test.ts` ou `sessionRefreshRoute.test.ts` | handler | `idToken` de 4097 caracteres, número e corpo vazio → 400 `AUTH_MISSING_TOKEN` sem chamar `verifyIdToken`; 4096 passa ao Firebase |
| T6 | `packages/auth/__tests__/serverErrorLogging.test.ts` (novo) | unidade com o mock de `firebase-admin` de `serverSessionRevocation.test.ts` | para cada uma das sete funções, um erro com `code: "auth/internal-error"` e `message` com e-mail e token fictícios gera `console.warn` com `[auth] <evento> code=auth/internal-error`, sem a mensagem; `console.error` não é chamado; erro sem código gera `reason=<name>`; `createCustomToken` ainda relança |
| T7 | `packages/shared/__tests__/cookies.test.ts` (estender) | unidade | `Secure` presente com `window.location.protocol = "https:"` e sem opção; ausente em `http:`; `secure: false` explícito vence o HTTPS; `preferenceCookieOptions("https:")` e `("http:")` |
| T8 | `apps/app/__tests__/proxy.test.ts` e `apps/web/__tests__/proxyLocale.test.ts` (ajustar) | proxy com mock de `cookies()` | `cookieSetMock` chamado com `("x-locale", "<locale>", { maxAge: 15552000, secure: false, ... })` em `http://`; com `https://` no `href`, `secure: true` |
| T9 | `apps/app/__tests__/panelState.test.ts` (estender) | unidade | `writePanelCookies` grava `secure` em HTTPS e não grava em HTTP. O jsdom descarta cookie `Secure` numa página `http://`, então o teste espia o setter de `document.cookie`, como `cookies.test.ts:8-11` faz com `vi.stubGlobal` |
| T10 | `apps/api/__tests__/corsOriginBoot.test.ts` (ajustar e estender) | unidade com `process.exit` espiado | produção sem `CORS_ORIGIN`, com `""` e com `" , "` → `console.error` com `[boot] CORS_ORIGIN is required in production` e `process.exit(1)`, sem resolver o Firestore; produção com a lista → resolve; fora de produção sem lista → resolve. O caso "refuses to start" troca `rejects.toThrow` por `exit(1)`: o comportamento mudou de propósito |
| T11 | `apps/api/__tests__/instrumentation.test.ts` (estender) | unidade | credencial ausente em produção → `exit(1)`; fora de produção continua relançando (o caso atual, em `NODE_ENV=test`, fica como está) |
| T12 | `apps/api/__tests__/adminCreateUserErrorCodes.test.ts` (estender) | rota com `vi.mock` | e-mail de 321 caracteres → 400 `VALIDATION_FAILED`, sem chamar o Firebase |

Nenhum teste com emulador ou app de pé. O único comportamento que o unitário não prova é o do processo do
Next quando `register` encerra, e esse vai para o `/test` (V5), porque o objeto da prova é o runtime.

### 9. O que o `/test` vai percorrer

A fatia não muda layout. A passada de navegador é funcional: confirma que o login e o SSO entre as apps
continuam funcionando com a origem conferida, e que os cookies saem com os atributos novos. Não há matriz
de tema e viewport, porque nenhum pixel muda (Q15). Os três idiomas entram só pelo `x-locale`.

| # | o quê | como | esperado |
|---|-------|------|----------|
| V1 | login e SSO | `agent-browser`, emulador: entrar no `app` por e-mail, abrir a `web`, sair | `POST /api/auth/session` 200, `POST /api/auth/custom-token` 200 na outra app, `DELETE /api/auth/session` 200; nenhum 403 no console de rede |
| V2 | CSRF nas rotas de sessão | `curl` contra `$APP` e `$WEB` | `POST /api/auth/session` sem `Origin` nem `Sec-Fetch-Site` → 403 `AUTH_FORBIDDEN_ORIGIN`; com `Sec-Fetch-Site: same-origin` e corpo `{}` → 400 `AUTH_MISSING_TOKEN`; com `Origin: https://evil.example` → 403; `idToken` de 5000 caracteres com `Origin` correto → 400; `custom-token` e `DELETE /session` sem `Origin` → 403 |
| V3 | CSRF na API | `curl` contra `$API` | `POST /entities` com `Cookie: access-token=x` e sem `Origin` → 403 `AUTH_FORBIDDEN_ORIGIN`; o mesmo com `Authorization: Bearer x` → 401 do guard; com `Origin` da allowlist → 401; sem cookie e sem `Origin` → 401. Os dois `curl` do item 1.10 de `01-security-review.md` → 403 |
| V4 | cookies | `curl -sI "$APP/pt-br/sign-in"` e `"$WEB/en"`; no navegador, trocar de idioma nos três | `Set-Cookie: x-locale=…; Path=/; Max-Age=15552000; SameSite=lax`, sem `Secure` em HTTP. Tentar `-H 'x-forwarded-proto: https'`: se o Next refletir em `nextUrl.protocol`, `Secure` aparece; se não, o ramo HTTPS fica 🔒 com o T8 como prova |
| V5 | boot em produção | `pnpm --filter api build` sem `CORS_ORIGIN`; depois `CORS_ORIGIN= pnpm --filter api start -p 3002` | o build passa; o `start` sai com código 1 imprimindo `[boot] CORS_ORIGIN is required in production…`, e a porta 3002 fica livre (`lsof -i :3002` vazio). Com a lista configurada, sobe e `/health` responde 200 |
| V6 | regressão E2E | `pnpm e2e` filtrado: `signIn.spec.ts`, `signUp.spec.ts` (projetos `chromium` e `mobile`) | verde. São os fluxos que passam pelas rotas de sessão |
| V7 | grep da parte 1 | os comandos de 1.16 e 1.18 de `01-security-review.md` | 1.16 sem nenhuma linha de `packages/auth/server.ts`; as três restantes são as de Q10 |

🔒 de saída: o encerramento do processo numa função da Vercel (V5 só mede `next start`).

### 10. Pré-requisitos manuais de infra

Nenhum pré-requisito novo. O `/develop` e o `/test` rodam tudo localmente.

| pendência | quem | caminho degradado sem ela |
|-----------|------|---------------------------|
| `CORS_ORIGIN` em produção | o fork, na Vercel. Já era obrigatória (`docs/PRE-PRODUCTION.md` §5) | antes: o processo ficava no ar respondendo 500 a tudo. Depois: o processo encerra no boot com a linha `[boot]`. Na Vercel, a função falha a cada cold start; o comportamento exato lá não é verificável localmente |
| Proxy de TLS repassando o protocolo (só em hospedagem própria) | o fork | `x-locale` sai sem `Secure`, que é o comportamento de hoje. Na Vercel o protocolo chega certo |
| Cliente não-navegador que usa o cookie de sessão | o fork, se tiver | recebe 403 `AUTH_FORBIDDEN_ORIGIN` até mandar bearer ou `Origin`. Nenhum existe no core |

O `/develop` não precisa de chave, conta nem serviço. Para o V5 e o V6: JDK 21 à frente no `PATH`
(`/opt/homebrew/opt/openjdk@21`) e as portas 3000 a 3002 livres.

### 11. Riscos

- **Testes de sessão que montam requisição sem `Origin`.** `sessionRoutesAuthority.test.ts:88` e
  `sessionRefreshRoute.test.ts:96` constroem `Request` sem o header; com a regra nova, viram 403. A correção é
  o construtor mandar `Origin`, não afrouxar a regra (T4).
- **`next build` executando `register`.** Se executar, `process.exit(1)` derruba o build do CI. Medir antes
  (§4.4).
- **`process.exit` e o Biome.** Os scripts de `apps/api/scripts/*.mjs` já chamam `process.exit` e passam no
  lint, mas o `instrumentation.ts` é TypeScript sob as regras do Next. Se o Ultracite reclamar, `biome-ignore`
  com o motivo (encerrar o processo é o objetivo).
- **jsdom e `Secure`.** O jsdom descarta cookie `Secure` em página HTTP; teste que lê `document.cookie` de
  volta não vê o cookie. T7 e T9 espiam o setter.
- **Commits intermediários.** A assinatura de `sessionDELETE` muda em `@repo/auth`; as rotas do `app` e da
  `web` só compilam de novo nos commits seguintes. O plano de commits põe os três em sequência (§B9).
- **Contenção com a fatia 3.** Disjunta em arquivos (§1.3). O `packages/auth/package.json` não é tocado aqui.

### 12. Achados para o `/spec --sync`

- Fecham com esta fatia, se o `/test` confirmar: o gate do `CORS_ORIGIN` que não derruba o processo, o helper
  de cookie sem `Secure`, o TTL do `x-locale` e o refresh de sessão sem `Origin` (os quatro do `BACKLOG.md`
  absorvidos pela spec). A parte de rate limit do achado do refresh continua aberta: a rota vive nas
  front-ends, fora do proxy da API.
- Continuam abertos, com veredito: os quatro chamadores de `revokeUserSessions` (Q9); o
  `console.error(error)` do reporter e os dois de navegador (Q10); `sidebar_state` sem `Secure` (Q6); as três
  constantes de 180 dias duplicadas (Q14).

---

## Etapa 2: blueprint técnico

### B1. `packages/shared/utils/helpers/cookies.ts`

```ts
const PREFERENCE_COOKIE_MAX_AGE_DAYS = 180;
const SECONDS_PER_DAY = 86_400;
export const PREFERENCE_COOKIE_MAX_AGE_SECONDS =
    PREFERENCE_COOKIE_MAX_AGE_DAYS * SECONDS_PER_DAY; // 15552000

export const isHttpsPage = (): boolean =>
    typeof window !== "undefined" && window.location?.protocol === "https:";

/** Attributes for a preference cookie written by the server (`cookies().set`). */
export const preferenceCookieOptions = (protocol: string) => ({
    path: "/",
    sameSite: "lax" as const,
    maxAge: PREFERENCE_COOKIE_MAX_AGE_SECONDS,
    secure: protocol === "https:",
});

 export const setCookie = (name, value, expiresIn, options?) => {
     if (typeof window === "undefined") return;
+    const secure = options?.secure ?? isHttpsPage();
     ...
-        ...(options?.secure ? ["Secure"] : []),
+        ...(secure ? ["Secure"] : []),
 };
```

O comentário em português de `:22-23` fica como está (não é desta fatia).

### B2. `packages/auth`

`session.ts`:

```ts
 export function isSameOriginRequest(request: Request): boolean {
     const origin = request.headers.get("origin");
     if (!origin) {
-        return true;
+        return request.headers.get("sec-fetch-site") === "same-origin";
     }
     ...
 }
```

O JSDoc de `:73-77` passa a dizer a regra nova (sem `Origin`, só a marca de mesma origem do navegador).

`session-routes.ts`:

```ts
import { z } from "zod";

const ID_TOKEN_MAX_LENGTH = 4096;
const idTokenBodySchema = z.object({
    idToken: z.string().min(1).max(ID_TOKEN_MAX_LENGTH),
});

async function readIdToken(request: Request): Promise<string | null> {
    try {
        const parsed = idTokenBodySchema.safeParse(await request.json());
        return parsed.success ? parsed.data.idToken : null;
    } catch {
        return null;
    }
}

function refuseForeignOrigin(request: Request): Response | null {
    return isSameOriginRequest(request)
        ? null
        : jsonError("AUTH_FORBIDDEN_ORIGIN", HTTP_STATUS.FORBIDDEN);
}

export async function sessionDELETE(
    request: Request,
    authority?: SessionAuthority
): Promise<Response> {
    const refused = refuseForeignOrigin(request);
    if (refused) return refused;
    ...
}

export async function customTokenPOST(
    request: Request,
    authority?: SessionAuthority
): Promise<Response> {
    const refused = refuseForeignOrigin(request);
    if (refused) return refused;
    ...
}
```

`sessionPOST` e `sessionRefreshPOST` passam a usar `refuseForeignOrigin` no lugar do `if` atual.
`extractIdToken` sai.

`server.ts`:

```ts
import { logEvent } from "@repo/shared/utils/helpers/log";

function authErrorFields(error: unknown) {
    const code = firebaseAuthErrorCode(error);
    return code
        ? { code }
        : { reason: error instanceof Error ? error.name : "unknown" };
}

-        console.error("Error verifying token:", error);
+        logEvent("auth", "id-token-session-failed", authErrorFields(error));
```

E o mesmo nas outras seis, com os eventos da tabela de §4.3.

### B3. `apps/api/(shared)/lib/cookie-write-origin.ts` (novo)

```ts
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SESSION_COOKIE_NAME = "access-token";

/**
 * A browser attaches the session cookie on its own, so a write carried by it alone must
 * prove where it came from. Every supported browser sends `Origin` on these methods; a
 * bearer token cannot be attached by another site, and server callers use one.
 */
export function isUnprovenCookieWrite(request: NextRequest): boolean {
    return (
        MUTATING_METHODS.has(request.method) &&
        request.headers.get("origin") === null &&
        request.headers.get("sec-fetch-site") !== "same-origin" &&
        !request.headers.has("authorization") &&
        request.cookies.has(SESSION_COOKIE_NAME)
    );
}
```

O nome do cookie é literal, como já é em `apps/app/proxy.ts:257` e `apps/app/lib/server/apiServerClient.ts:5`
(Q17). `MUTATING_METHODS` já existe em `proxy.ts:99`; o `/develop` pode exportar dali ou daqui, sem
duplicar.

### B4. `apps/api/proxy.ts`

```ts
 function logBlocked(
-    reason: RateLimitBlockReason | "origin",
+    reason: RateLimitBlockReason | "origin" | "missing-origin",
 ...

-function refuseOrigin(request: NextRequest, requestId: string): NextResponse {
-    logBlocked("origin", request, requestId);
+function refuseOrigin(
+    request: NextRequest,
+    requestId: string,
+    reason: "origin" | "missing-origin" = "origin"
+): NextResponse {
+    logBlocked(reason, request, requestId);
 ...

     if (!isOriginAllowed(origin, allowedOrigins)) { ... }

+    if (isUnprovenCookieWrite(request)) {
+        return withRequestId(
+            withSecurityHeaders(
+                withCors(refuseOrigin(request, requestId, "missing-origin"), null)
+            ),
+            requestId
+        );
+    }

     if (request.method === "OPTIONS") { ... }
```

Resposta de exemplo:

```http
POST /entities HTTP/1.1
Cookie: access-token=eyJ...

HTTP/1.1 403
Vary: Origin
x-request-id: 3f1c...
{"error":{"code":"AUTH_FORBIDDEN_ORIGIN"}}
```

Log: `[security] blocked reason=missing-origin path=/entities method=POST requestId=3f1c...`.

### B5. `apps/api/instrumentation.ts`

```ts
import { parseAllowedOrigins } from "@/(shared)/lib/cors";

async function prepareServer(): Promise<void> {
    if (
        process.env.NODE_ENV === "production" &&
        parseAllowedOrigins(process.env.CORS_ORIGIN).length === 0
    ) {
        throw new Error("CORS_ORIGIN is required in production: …");
    }
    warnOnDisabledRateLimit();
    warnOnHalfConfiguredPayments();
    const { getFirestoreAdmin } = await import("@repo/auth/server");
    getFirestoreAdmin();
}

export const register = async () => {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;
    try {
        await prepareServer();
    } catch (error) {
        if (process.env.NODE_ENV !== "production") throw error;
        // Next logs a failed `register` and keeps serving 500s; only exiting stops the deploy.
        console.error(`[boot] ${error instanceof Error ? error.message : "unknown"}`);
        process.exit(1);
    }
};
```

O comentário de `:47-57` é reescrito para dizer o que o código faz agora. O ramo `NEXT_PHASE` só entra se o
`/develop` medir que o build executa `register` (§4.4).

### B6. `apps/api/(shared)/validation/user-admin.schema.ts`

```ts
+const EMAIL_MAX = 320;
 export const adminCreateUserSchema = z.object({
-    email: z.string().email(),
+    email: z.string().max(EMAIL_MAX).email(),
```

### B7. `apps/app` e `apps/web`

`apps/app/proxy.ts` e `apps/web/proxy.ts`:

```ts
+import { preferenceCookieOptions } from "@repo/shared/utils/helpers/cookies";
+const localeCookie = preferenceCookieOptions(request.nextUrl.protocol);
-        cookieStore.set("x-locale", defaultLocale);
+        cookieStore.set("x-locale", defaultLocale, localeCookie);
 ...
-    cookieStore.set("x-locale", currentLocale);
+    cookieStore.set("x-locale", currentLocale, localeCookie);
```

`apps/app/shared/lib/panelState.ts`:

```ts
+import { isHttpsPage } from "@repo/shared/utils/helpers/cookies";
+const secureAttribute = () => (isHttpsPage() ? "; secure" : "");
-    document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
+    document.cookie = `${name}=; path=/; max-age=0; samesite=lax${secureAttribute()}`;
-    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${PANEL_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
+    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${PANEL_COOKIE_MAX_AGE_SECONDS}; samesite=lax${secureAttribute()}`;
```

`apps/app/app/api/auth/session/route.ts` e `apps/web/app/api/auth/session/route.ts`:

```ts
-export function DELETE() {
-    return sessionDELETE(sessionAuthority);
+export function DELETE(request: Request) {
+    return sessionDELETE(request, sessionAuthority);
 }
```

As rotas de `custom-token` já passam a requisição; não mudam.

### B8. Documentação a corrigir (o código passa a desmenti-la)

| arquivo | trecho | correção |
|---------|--------|----------|
| `docs/SECURITY.md:171-180` | tabela de CORS | linha nova: escrita sem `Origin` com cookie e sem bearer → `403 AUTH_FORBIDDEN_ORIGIN`; a linha "sem `Origin`" passa a dizer "sem cookie de sessão, ou com bearer" |
| `docs/SECURITY.md:204` | aviso do refresh | `isSameOriginRequest` exige `Origin` do mesmo host ou `Sec-Fetch-Site: same-origin`; a parte do rate limit continua |
| `docs/SETUP.md:73` | `CORS_ORIGIN` | a regra da escrita por cookie e "sem ela a API encerra o processo" |
| `docs/PRE-PRODUCTION.md:379-386` | §5 | o aviso "O gate não mata o processo" sai; entra o que acontece agora e o 🔒 da Vercel |
| `docs/delivery/01-security-review.md` | 1.10 e 1.19, "O core já faz" | a recusa sem `Origin` e o boot que encerra |
| `docs/AUTH-SSO.md:125` | "cross-origin → 403" | acrescentar "sem `Origin` → 403" |

O `/develop` mede cada âncora antes de editar.

### B9. Ordem de implementação e plano de commits

1. `feat(shared): mark preference cookies Secure on https pages` (B1 + T7)
2. `feat(auth): require a same-origin proof on every session route` (B2 origem + Zod + T3/T4/T5)
3. `fix(auth): log provider failures by code instead of the error object` (B2 logs + T6)
4. `feat(api): refuse cookie-carried writes without an origin` (B3/B4 + T1/T2)
5. `fix(api): exit the process when the production boot fails` (B5 + T10/T11)
6. `fix(api): cap the admin-created user email` (B6 + T12)
7. `feat(app): long-lived Secure locale and panel cookies, origin on sign-out` (B7 app + T8/T9)
8. `feat(web): long-lived Secure locale cookie, origin on sign-out` (B7 web + T8)
9. `docs: describe the origin check and the fatal production boot` (B8)
10. `docs(features): delivery-security-review-slice-2`

Os commits 2, 7 e 8 dependem um do outro por causa da assinatura de `sessionDELETE`; ficam em sequência.

### B10. Env e config

Nenhuma variável nova. Nenhuma mudança de `.env.example`.

### B11. Rollback

Reverter os commits. Não há dado gravado. Cookies já emitidos com `Secure`/`Max-Age` continuam válidos e
são sobrescritos na próxima gravação.

---

## Critérios de aceite (rascunho para o `/test`)

# Critérios de Aceite (Checklist)

- [ ] **Escrita na API carregada só pelo cookie, sem `Origin`, é recusada**
  Um `POST`, `PUT`, `PATCH` ou `DELETE` na API com o cookie `access-token`, sem `Authorization`, sem `Origin`
  e sem `Sec-Fetch-Site: same-origin` recebe `403` com `{ "error": { "code": "AUTH_FORBIDDEN_ORIGIN" } }`,
  `Vary: Origin` e nenhum `Access-Control-Allow-Origin`. A recusa acontece antes do guard e do rate limit, e o
  log registra `reason=missing-origin` sem cookie, IP nem corpo.

- [ ] **Bearer, `GET` e chamada anônima sem `Origin` continuam passando**
  A mesma escrita com `Authorization: Bearer` segue para o guard (401 com token inválido, 2xx com válido).
  `GET` com cookie e sem `Origin` não é recusado pelo proxy, e `POST` sem cookie e sem `Origin`, como o
  webhook da Stripe, também não. `Origin` da allowlist com cookie segue para o guard, como hoje.

- [ ] **Rotas de sessão das front-ends exigem prova de mesma origem**
  `POST /api/auth/session`, `POST /api/auth/session/refresh`, `POST /api/auth/custom-token` e
  `DELETE /api/auth/session`, no `app` e na `web`, respondem `403 AUTH_FORBIDDEN_ORIGIN` quando não há
  `Origin` nem `Sec-Fetch-Site: same-origin`, e também com `Origin` de outro host ou malformado. A recusa não
  lê o corpo, não consulta o Firebase e não apaga nem grava cookie.

- [ ] **Login, SSO e saída continuam funcionando no navegador**
  Entrar no `app` por e-mail grava o cookie (`POST /api/auth/session` 200); abrir a `web` adota a sessão
  (`POST /api/auth/custom-token` 200); sair responde 200 e apaga o cookie. Nenhuma dessas chamadas recebe 403.
  Os E2E de `signIn` e `signUp`, nos projetos `chromium` e `mobile`, ficam verdes.

- [ ] **Corpo das rotas de sessão validado por Zod com teto**
  `idToken` ausente, não-string, vazio ou acima de 4096 caracteres responde `400 AUTH_MISSING_TOKEN` sem
  chamar o Firebase. Um `idToken` de até 4096 caracteres segue para a verificação, e campos extras no corpo
  continuam ignorados.

- [ ] **E-mail do usuário criado pelo admin tem teto**
  `POST /users` com e-mail de 321 caracteres responde `400 VALIDATION_FAILED` sem chamar o Firebase. Um e-mail
  válido de até 320 caracteres segue o fluxo de hoje, sem `trim` novo.

- [ ] **`x-locale` gravado pelo servidor dura 180 dias**
  Toda resposta do proxy do `app` e da `web` que grava `x-locale` manda `Max-Age=15552000; Path=/;
  SameSite=lax`, tanto no redirecionamento da raiz para o idioma padrão quanto na página com idioma. Em HTTP
  o cookie sai sem `Secure`; em HTTPS sai com `Secure`. Trocar de idioma pelo seletor nos três idiomas não
  rebaixa o cookie a cookie de sessão.

- [ ] **Cookies de preferência do navegador ganham `Secure` em HTTPS**
  `setCookie` sem a opção `secure` grava `Secure` quando a página é HTTPS e não grava em HTTP; `secure: false`
  explícito é respeitado. Os cookies de painel `bp:panel-request-role` e `bp:impersonate-firebase-uid` seguem
  a mesma regra, inclusive quando são apagados.

- [ ] **`@repo/auth` não imprime o objeto de erro**
  As sete falhas de `packages/auth/server.ts` saem como uma linha `[auth] <evento> code=<código Firebase>` ou
  `reason=<nome do erro>`, sem a mensagem do provedor, sem uid e sem token. O comando de 1.16 da parte 1 não
  acha mais nenhuma linha de `packages/auth/server.ts`. `createCustomToken` continua relançando o erro.

- [ ] **API em produção sem `CORS_ORIGIN` encerra o processo**
  `next start` em produção com `CORS_ORIGIN` ausente, vazio ou só com vírgulas sai com código 1 e imprime
  `[boot] CORS_ORIGIN is required in production…`, sem deixar a porta ouvindo. Com a lista configurada a API
  sobe e `/health` responde 200; fora de produção sem a lista ela sobe com as origens de `localhost`. O
  build de produção sem `CORS_ORIGIN` continua passando. Na Vercel, o comportamento fica 🔒.

- [ ] **Falha de credencial do Firestore em produção também encerra o processo**
  Em produção, sem a service account, o boot imprime `[boot] Firebase Admin credentials are not configured…`
  e sai com código 1, em vez de responder 500 a tudo. Fora de produção o erro continua sendo lançado, como
  hoje.

---

## Perguntas em aberto (decididas por padrão)

Nenhuma bloqueia o `/develop`. Cada uma tem a pergunta, as opções, a adotada e o motivo.

**Q1. Que valor de `Sec-Fetch-Site` substitui a falta de `Origin`?**
Opções: só `same-origin`; também `same-site`; também `none`. **Adotada: só `same-origin`.** A spec fala em
"`Origin` nem `Sec-Fetch-Site`" sem dizer o valor. `same-site` deixaria um subdomínio comprometido passar, e
`none` é navegação digitada, que não faz `POST`. Na API, que não serve página, isso equivale a exigir `Origin`.

**Q2. A API recusa toda escrita sem `Origin`, ou só a carregada pelo cookie?**
Opções: toda; só com cookie e sem bearer. **Adotada: só com cookie e sem bearer.** A spec pede "escrita
autenticada por cookie" e diz que o bearer continua aceito sem `Origin`. Recusar tudo quebraria o webhook da
Stripe e as chamadas de servidor.

**Q3. `DELETE /api/auth/session` (saída) entra na checagem?**
Opções: entrar; deixar como está, porque um `DELETE` de outra origem já exige preflight que a front-end não
responde. **Adotada: entrar.** A spec diz "toda escrita autenticada por cookie". O custo são duas linhas nas
rotas e a mudança de assinatura de `sessionDELETE`.

**Q4. `customTokenPOST(request?)` continua com a requisição opcional?**
Opções: opcional, pulando a checagem quando falta; obrigatória. **Adotada: obrigatória.** Os dois chamadores
já passam a requisição (`apps/app/app/api/auth/custom-token/route.ts:10`, `apps/web/...:10`); opcional deixaria
um caminho sem checagem.

**Q5. `Secure` decidido por `NODE_ENV === "production"` ou pelo protocolo?**
Opções: `NODE_ENV`, como o cookie de sessão (`session.ts:64`) e o de consentimento (`analytics/server.ts:28`);
o protocolo da página ou da requisição. **Adotada: protocolo.** A spec diz "`Secure` em HTTPS". O protocolo
acerta nos dois sentidos: não marca `Secure` num `next start` por HTTP em `localhost`, e marca numa preview
HTTPS. O cookie de sessão e o de consentimento não mudam.

**Q6. `sidebar_state` (shadcn) entra?**
Opções: editar `packages/design-system/components/ui/sidebar.tsx`; deixar. **Adotada: deixar.** O arquivo é
regravado pelo `pnpm bump-ui` e está fora do Biome (`biome.jsonc`, `files.includes`). O cookie guarda só
aberto/fechado. Vai como achado 🟢 no backlog.

**Q7. O boot que encerra cobre só o `CORS_ORIGIN` ou toda falha do `register`?**
Opções: só `CORS_ORIGIN`, como diz o item da spec; toda falha em produção. **Adotada: toda falha em
produção.** A credencial do Firestore ausente tem o mesmo defeito (500 a tudo, processo no ar) e o
comentário de `instrumentation.ts:47-53` promete "a startup crash" para ela. A política manda corrigir na
raiz. Fora de produção nada muda, para não derrubar o `pnpm dev`.

**Q8. `CORS_ORIGIN=" , "` conta como configurada?**
Opções: sim (o gate atual olha só a string); não. **Adotada: não.** O gate passa a usar `parseAllowedOrigins`,
o mesmo parser do proxy. Antes, essa lista passava no boot e virava allowlist vazia em produção.

**Q9. Os quatro chamadores de `revokeUserSessions` que engolem a falha entram?**
Opções: trocar os quatro para a variante que lança; trocar só o de desvincular método de login; deixar.
**Adotada: deixar.** Não estão no corte da fatia 2. Três desativam ou apagam a conta antes, e a conta
desativada já é recusada na verificação do token. No quarto (desvincular a senha), o próprio comentário da rota
diz que o Firebase revoga os refresh tokens ao restaurar o endereço
(`account/sign-in-methods/[id]/route.ts:119-121`), e quando a restauração falha a rota já responde 500. A
única mudança nos quatro é o log virar `logEvent` (I3).

**Q10. O `console.error(error)` do reporter de erro e os dois de navegador entram?**
Opções: trocar os três; deixar. **Adotada: deixar.** O item da spec é "os `console.error(error)` de
`@repo/auth`". O reporter justifica o objeto por escrito (`requestErrorReporter.ts:33-38`): o runtime já
imprime o erro não tratado. Os outros dois rodam no navegador e não vão para log de servidor. O grep de 1.16
continua achando os três; a parte 1 classifica log como 🟡, não 🔴.

**Q11. Que código sai quando o `idToken` excede o teto?**
Opções: `AUTH_MISSING_TOKEN` (o de hoje para corpo inválido); `VALIDATION_FAILED`; um código novo.
**Adotada: `AUTH_MISSING_TOKEN`.** Mantém o contrato que `SessionCookieRejectedError` já trata e não pede
tradução nova.

**Q12. O e-mail do admin ganha `trim` junto com o `max`?**
Opções: `.trim().max().email()`, como os outros e-mails; só `.max().email()`. **Adotada: só `max`.** O `trim`
mudaria o que o campo aceita, fora do item da spec.

**Q13. Regex ancorada de tamanho fixo conta como teto?**
Opções: acrescentar `.max()` redundante; aceitar a regex. **Adotada: aceitar.** `^\d{1,12}$`, `^[a-z0-9.]{1,64}$`,
`^[A-Za-z0-9_-]{43}$` e `^\d{4}-\d{2}-\d{2}$` já recusam string maior. Não há ganho em repetir o número.

**Q14. As três constantes de 180 dias no `app` e na `web` passam a importar a do helper?**
Opções: consolidar (`LanguageSwitcher.tsx:23-25`, `themePreference.ts:5-8`, `language-switcher.tsx:22-24`);
deixar. **Adotada: deixar.** O valor é o mesmo e o item da spec não pede. Vai como achado 🟢.

**Q15. O `/test` faz a matriz light/dark/mobile e três idiomas?**
Opções: matriz completa; passada funcional. **Adotada: passada funcional** (§9). Nenhum pixel muda; a regra
de ouro 11 cobre fluxo que toca UI ou layout, e aqui o que muda é cabeçalho e cookie. Os três idiomas entram
pelo `x-locale` (V4), e o `mobile` pelo E2E (V6).

**Q16. Código ou motivo novo para a recusa sem `Origin`?**
Opções: código novo (`AUTH_MISSING_ORIGIN`); reusar `AUTH_FORBIDDEN_ORIGIN` com motivo distinto no log.
**Adotada: reusar o código e distinguir no log** (`reason=missing-origin`). Para o cliente as duas recusas
são a mesma coisa, e o código já está traduzido.

**Q17. O proxy da API importa `SESSION_COOKIE_NAME` de `@repo/auth/session`?**
Opções: importar; literal `"access-token"`. **Adotada: literal.** `@repo/auth/session` importa `server-only`,
`next/headers` e o `firebase-admin`, que o proxy não carrega hoje. O literal já é o padrão nos proxies
(`apps/app/proxy.ts:257`, `apps/app/lib/server/apiServerClient.ts:5`).
