# Handoff do `/develop`: fatia 2 da revisão de segurança (defesa em profundidade)

Plano: [`analyze/plan.md`](../analyze/plan.md). Rodou dentro do `/cycle`, sem perguntas. Nada foi commitado e
nenhuma branch foi criada. As mudanças em `specs/*.md` que já estavam no working tree são da auditoria do
backlog e não foram tocadas.

## Blueprint → arquivos

| item | arquivos |
|------|----------|
| B1 `setCookie` com `Secure` em HTTPS + helpers | `packages/shared/utils/helpers/cookies.ts` (`PREFERENCE_COOKIE_MAX_AGE_SECONDS`, `isHttpsPage`, `preferenceCookieOptions`; `setCookie` usa `options?.secure ?? isHttpsPage()`) |
| B2 origem nas rotas de sessão | `packages/auth/session.ts` (`isSameOriginRequest` sem `Origin` só aceita `Sec-Fetch-Site: same-origin`), `packages/auth/session-routes.ts` (`refuseForeignOrigin` nas quatro rotas; `sessionDELETE(request, authority?)`; `customTokenPOST(request, authority?)` com `request` obrigatório) |
| B2 Zod no corpo | `packages/auth/session-routes.ts` (`idTokenBodySchema`, `idToken` de 1 a 4096 caracteres; `extractIdToken` removido) |
| B2 logs | `packages/auth/server.ts` (`authErrorFields` + sete `logEvent("auth", …)` com os eventos da tabela §4.3 do plano) |
| B3 regra da escrita por cookie | `apps/api/(shared)/lib/cookie-write-origin.ts` (novo; `isUnprovenCookieWrite` e `MUTATING_METHODS`, que saiu do `proxy.ts` para não duplicar) |
| B4 proxy da API | `apps/api/proxy.ts` (recusa `missing-origin` logo depois da allowlist, antes do preflight e do rate limit); `apps/api/(shared)/lib/cors.ts` (JSDoc de `isOriginAllowed` cita a exceção) |
| B5 boot que encerra | `apps/api/instrumentation.ts` (`prepareServer`, gate com `parseAllowedOrigins`), `apps/api/instrumentation-node.ts` (novo; `bootOrExit` com o `process.exit(1)`) |
| B6 teto do e-mail do admin | `apps/api/(shared)/validation/user-admin.schema.ts` (`EMAIL_MAX = 320`) |
| B7 `app` | `apps/app/proxy.ts` (`x-locale` com `preferenceCookieOptions(request.nextUrl.protocol)`), `apps/app/shared/lib/panelState.ts` (`; secure` em HTTPS, inclusive ao apagar), `apps/app/app/api/auth/session/route.ts` (`DELETE(request)`) |
| B7 `web` | `apps/web/proxy.ts`, `apps/web/app/api/auth/session/route.ts` |
| B8 docs | `docs/SECURITY.md`, `docs/SETUP.md`, `docs/PRE-PRODUCTION.md` §5, `docs/delivery/01-security-review.md` (1.10, 1.18, 1.19), `docs/AUTH-SSO.md`; âncoras de linha deslocadas por este diff em `docs/INCIDENT-RESPONSE.md`, `docs/ROPA.md`, `docs/SUBPROCESSORS.md`, `docs/BACKUP.md`, `docs/PRE-PRODUCTION.md` (tabela de cookies e §sessão) |

## Contrato

- `@repo/sdk`: nada mudou.
- `@repo/auth/session-routes`: `sessionDELETE(authority?)` virou `sessionDELETE(request, authority?)`, e o
  `request` de `customTokenPOST` deixou de ser opcional. Chamadores: `apps/app/app/api/auth/session/route.ts`,
  `apps/web/app/api/auth/session/route.ts` (ajustados) e as duas rotas `custom-token`, que já passavam a
  requisição. `git grep "sessionDELETE\|customTokenPOST" -- apps packages` não acha outro chamador.
- `@repo/auth/session`: `isSameOriginRequest` passa a recusar requisição sem `Origin` e sem
  `Sec-Fetch-Site: same-origin`. Só `session-routes.ts` a usa.
- `@repo/shared/utils`: três exports novos (`isHttpsPage`, `preferenceCookieOptions`,
  `PREFERENCE_COOKIE_MAX_AGE_SECONDS`). Os seis chamadores de `setCookie` sem `secure` passam a gravar
  `Secure` em página HTTPS; o consentimento (`packages/analytics/provider.tsx`) passa `secure` explícito e não
  muda.

## Códigos de erro

Nenhum novo. `AUTH_FORBIDDEN_ORIGIN`, `AUTH_MISSING_TOKEN` e `VALIDATION_FAILED` já existem em `apiErrors` nos
três idiomas, e `packages/internationalization` não foi tocado.

## Desvios do plano

1. **`process.exit` foi para um módulo próprio, `apps/api/instrumentation-node.ts`.** O plano punha o `try`/
   `catch` com `process.exit(1)` dentro de `register`. Medido: com o `process.exit` em `instrumentation.ts`
   (no `register` ou numa função auxiliar no mesmo arquivo), o `next build` da `api` passa, mas o Turbopack
   imprime `Warning: A Node.js API is used (process.exit …) which is not supported in the Edge Runtime`,
   porque o arquivo também é empacotado para Edge. Pôr o `process.exit` num módulo separado importado
   dentro de uma função também não resolveu. O aviso só some com `await import("./instrumentation-node")`
   direto no ramo `if (process.env.NEXT_RUNTIME === "nodejs")` de `register` (logs em
   `/tmp/api-build-slice2{,b,c,d}.log`; o último não tem a linha `Warning:`). O comportamento é o do plano.
2. **Sem ramo `NEXT_PHASE`.** O build não executa `register`: `env -u CORS_ORIGIN NODE_ENV=production pnpm
   --filter api build` → `exit=0`, sem nenhuma linha `[boot]` no log. O desvio previsto em §4.4 seria código
   morto e não entrou.
3. **`logEvent` importado de `@repo/shared/utils`, não de `@repo/shared/utils/helpers/log`.** O `package.json`
   de `@repo/shared` só exporta `.` e `./utils`. Os apps resolvem o caminho profundo pelo alias `@repo` do
   Vitest e pelo bundler do Next, mas a suíte de `@repo/auth` não tem esse alias. Com o caminho profundo, 8
   arquivos de teste de `@repo/auth` falharam com `Missing "./utils/helpers/log" specifier in "@repo/shared"
   package`. `session-routes.ts` já importava `HTTP_STATUS` do barrel.
4. **O proxy do `app` e da `web` importa `preferenceCookieOptions` do barrel `@repo/shared/utils`**, que já
   era importado ali (`handleClientError`). O `panelState.ts` usa o caminho profundo
   `@repo/shared/utils/helpers/cookies`, como outros arquivos do `apps/app`.
5. **T12 ficou em `apps/api/__tests__/usersRoute.test.ts`**, não em `adminCreateUserErrorCodes.test.ts`. Esse
   último testa só o mapeamento de código do Admin SDK; os mocks de guard e do Identity Toolkit que a rota
   precisa já estão em `usersRoute.test.ts`.
6. **Testes existentes ajustados além dos que o plano previa** (adaptação ao contrato novo, nenhuma asserção
   afrouxada):
   - `packages/auth/__tests__/serverSessionRevocation.test.ts`: o caso "`revokeUserSessions` continua
     engolindo a recusa" contava `console.error` uma vez. Agora confere `console.warn` com a linha exata
     `[auth] session-revoke-failed code=auth/internal-error` e `console.error` não chamado. Os três
     `expect(console.error).not.toHaveBeenCalled()` dos códigos benignos ganharam o mesmo para `console.warn`,
     senão passariam sem provar nada.
   - `apps/api/__tests__/corsOrigin.test.ts`: o `makeRequest` falso ganhou `cookies.has`, porque a regra nova
     lê `request.cookies` e todo `NextRequest` real tem esse campo.
   - `apps/app/__tests__/proxy.test.ts` e `apps/web/__tests__/proxyLocale.test.ts`: as três asserções
     `cookieSetMock("x-locale", "<locale>")` passaram a exigir também o terceiro argumento com
     `maxAge: 15552000`, `secure: false`.
7. **Âncoras de linha em docs.** Além dos cinco documentos do plano, corrigi as âncoras que este diff deslocou
   em `packages/auth/server.ts`, `session.ts`, `session-routes.ts`, `apps/api/proxy.ts`, nos proxies e no
   `panelState.ts`. Duas já estavam erradas antes e foram corrigidas junto: `apps/api/proxy.ts:94-106` (log de
   bloqueio, agora `:122-134`) e `apps/api/proxy.ts:60-78` (lista estrita, agora `:74-96`), em `ROPA.md`,
   `SUBPROCESSORS.md` e `INCIDENT-RESPONSE.md`. Os `RESEARCH-*.md` são notas datadas e ficaram como estão.

## Decisões em aberto e pendências

- Nenhuma bloqueia. As decisões Q1 a Q17 do plano foram seguidas como estão.
- O comportamento numa função da Vercel quando o boot encerra continua 🔒 (registrado em
  `docs/PRE-PRODUCTION.md` §5).

## Validação (smoke do `/develop`, com cache)

| gate | comando | resultado |
|------|---------|-----------|
| lint/format | `pnpm check` | `Checked 1117 files … No fixes applied`, sem erro |
| typecheck | `pnpm --filter {app,web,api,@repo/auth} typecheck` | os quatro sem saída de erro (`@repo/shared` não tem script de typecheck) |
| turbo | `pnpm turbo run lint typecheck test` | `Tasks: 29 successful, 29 total` |
| testes | `pnpm turbo run test` | `@repo/shared` 63, `@repo/auth` 201 (15 arquivos), `api` 1758 (128), `app` 1277 (140), `web` 308 (34); demais pacotes sem mudança, todos verdes |
| i18n | não rodado à parte: nenhum arquivo de `packages/internationalization` mudou; a suíte dele entrou no turbo acima (67 testes) |
| build da api | `env -u CORS_ORIGIN NODE_ENV=production pnpm --filter api build` | `exit=0`, sem `[boot]` nem `Warning:` no log |

Smoke de runtime, com a porta 3002 livre antes e depois (`lsof -ti tcp:3002` vazio), processos subidos e
derrubados por mim:

- `CORS_ORIGIN= NODE_ENV=production npx next start -p 3002` (em `apps/api`): o processo saiu com `exit=1` e
  imprimiu `[boot] CORS_ORIGIN is required in production: set the comma-separated list of origins allowed to
  call this API.` A porta ficou livre.
- `CORS_ORIGIN=http://localhost:3000 NODE_ENV=production npx next start -p 3002`: `/health` → 200;
  `curl -X POST /entities -H 'Cookie: access-token=x'` → `403`, `Vary: Origin, Accept-Encoding`, corpo
  `{"error":{"code":"AUTH_FORBIDDEN_ORIGIN"}}`, e o log do processo trouxe
  `[security] blocked reason=missing-origin path=/entities method=POST requestId=…`; o mesmo com
  `Authorization: Bearer x` → `401`.
- O grep de 1.16 (`docs/delivery/01-security-review.md`) acha três linhas, nenhuma de `packages/auth/server.ts`:
  `apps/api/app/global-error.tsx:15`, `SignUpFormClient.tsx:123` e `requestErrorReporter.ts:52` (as de Q10).

## Testes adicionados

| # | arquivo | casos |
|---|---------|-------|
| T1 | `apps/api/__tests__/cookieWriteOrigin.test.ts` (novo) | 14: os quatro métodos mutáveis recusados; `Sec-Fetch-Site` `cross-site`/`same-site`/`none` não provam origem; cada condição isolada libera (`GET`, `HEAD`, `OPTIONS`, `Origin`, `same-origin`, `Authorization`, sem cookie) |
| T2 | `apps/api/__tests__/corsOrigin.test.ts` | +10: 403 com `Vary: Origin`, sem `Access-Control-Allow-Origin`, com `x-request-id` e sem chamar o rate limit; log `reason=missing-origin` sem o valor do cookie; bearer, origem da allowlist, `same-origin`, `GET`, `POST` anônimo, webhook e cookie que não é o de sessão passam; `cross-site` recusa |
| T3/T5 | `packages/auth/__tests__/sessionOrigin.test.ts` (novo) | 44: tabela de `isSameOriginRequest` (11 casos); as quatro rotas recusam sem prova de origem, com outro host e com `Origin` malformado, sem chamar Firebase nem ler/gravar cookie, e passam com `same-origin`; corpo vazio, sem `idToken`, numérico, vazio e com 4097 caracteres → 400 `AUTH_MISSING_TOKEN` nas duas rotas de POST; 4096 chega ao Firebase; campo extra ignorado |
| T4 | `sessionRoutesAuthority.test.ts`, `sessionRefreshRoute.test.ts` | o construtor manda `Origin: http://<HOST>`; `sessionDELETE(request(), …)` e `customTokenPOST(request())` |
| T6 | `packages/auth/__tests__/serverErrorLogging.test.ts` (novo) | 15: as sete funções com erro de código → `[auth] <evento> code=auth/internal-error`; sem código → `reason=TypeError`; valor que não é `Error` → `reason=unknown`; nenhum e-mail, token, uid ou mensagem fictícios em `console.warn`/`console.error`; `createCustomToken` ainda relança |
| T7 | `packages/shared/__tests__/cookies.test.ts` | +7: `Secure` em HTTPS sem opção, ausente em HTTP, `secure: false` vence; `isHttpsPage` (incluindo servidor); `preferenceCookieOptions` |
| T8 | `apps/app/__tests__/proxy.test.ts`, `apps/web/__tests__/proxyLocale.test.ts` | +2 em cada: redirecionamento da raiz com 180 dias e sem `Secure` em HTTP; `secure: true` com `https://` no `href`, na página e no redirecionamento |
| T9 | `apps/app/__tests__/panelState.test.ts` | +2: os quatro `document.cookie` de duas gravações terminam em `; secure` em HTTPS (inclusive o que apaga) e nenhum leva `secure` em HTTP |
| T10 | `apps/api/__tests__/corsOriginBoot.test.ts` | o "refuses to start" virou três casos (ausente, `""`, `" , "`) com `console.error` `[boot] CORS_ORIGIN is required in production` e `process.exit(1)`, sem resolver o Firestore; produção com lista e desenvolvimento sem lista resolvem o Firestore e não chamam `exit` |
| T11 | `apps/api/__tests__/instrumentation.test.ts` | +1: credencial ausente em produção → `[boot] Firebase Admin credentials are not configured…` e `exit(1)`; o caso em `NODE_ENV=test` que relança ficou como estava |
| T12 | `apps/api/__tests__/usersRoute.test.ts` | +2: e-mail de 321 caracteres → 400 `VALIDATION_FAILED` sem chamar o Identity Toolkit; 320 chega ao provedor. Mutação: sem o `.max(EMAIL_MAX)`, o caso de 321 falha (`1 failed`), então é o teto que recusa, não a regex de e-mail |

## A verificar no `/test`

- **Login, SSO e saída no navegador (V1).** Os testes provam a regra, não que todo navegador manda `Origin`
  nos `fetch` de `provider.tsx`, `SignInForm.tsx`, `SignUpFormClient.tsx` e `googleSignInApi.ts`. Repro:
  entrar no `app` por e-mail, abrir a `web`, sair; nenhum 403 em `/api/auth/session`, `/custom-token`,
  `/session/refresh`.
- **Rotas de sessão contra o app de pé (V2).** Só o unitário mediu. Repro: `curl -X POST "$APP/api/auth/session"
  -d '{}'` sem `Origin` → 403; com `-H 'Sec-Fetch-Site: same-origin'` → 400 `AUTH_MISSING_TOKEN`; `idToken` de
  5000 caracteres com `Origin` correto → 400; `custom-token` e `DELETE /session` sem `Origin` → 403. Igual na
  `web`.
- **`Set-Cookie` do `x-locale` no runtime (V4).** Só o unitário (T8) mediu os atributos. Repro: `curl -sI
  "$APP/pt-br/sign-in"` e `"$WEB/en"` → `Max-Age=15552000; Path=/; SameSite=lax`, sem `Secure` em HTTP. O ramo
  HTTPS depende de `request.nextUrl.protocol` refletir o protocolo real atrás de proxy; testar com
  `-H 'x-forwarded-proto: https'`.
- **Cookies `bp:*` e `setCookie` numa página HTTPS real.** Só medido com `document.cookie` espiado; não há
  ambiente HTTPS local.
- **Boot sem credencial do Firestore em `next start`.** Só o T11 mediu; o `next start` local tinha credencial.
- **Os dois `curl` novos do item 1.10** de `docs/delivery/01-security-review.md`: o da API foi medido (403); o
  de `$APP/api/auth/session` sem `Origin` só pelo unitário.
- **E2E de `signIn`/`signUp` (V6)**, `chromium` e `mobile`: não rodados aqui.

## Lacunas de teste conhecidas

- Nenhum teste prova o encerramento do processo do Next fora do smoke acima; o objeto é o runtime (V5).
- O caminho `await import("./instrumentation-node")` só é exercitado pelos testes de `register` no Vitest; a
  ausência do aviso de Edge no build não tem teste automatizado, só o log do build.
