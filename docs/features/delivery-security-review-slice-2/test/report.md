# Relatório do `/test`: fatia 2 da revisão de segurança (defesa em profundidade)

Rodou dentro do `/cycle`, sem perguntas, na branch `feat/delivery-security-hardening` (não protegida). Nada foi
commitado e nenhuma branch foi criada. Fontes: [`analyze/plan.md`](../analyze/plan.md),
[`develop/handoff.md`](../develop/handoff.md), [`review/review.md`](../review/review.md).

Placar: **11 ✅, 0 ❌, 1 🔒** (o encerramento do processo numa função da Vercel). Nenhum defeito de produção
encontrado. Nenhum teste criado: a cobertura unitária do `/develop` já prova cada regra no nível mais barato, e o
que faltava era runtime, medido aqui.

## Escopo

`git diff --name-only` toca `packages/shared`, `packages/auth`, `apps/api`, `apps/app` e `apps/web`, mais
documentação e specs. A fatia não muda nenhum pixel: não há componente, texto de UI nem tradução nova. Por isso a
passada de navegador foi funcional (login, SSO, saída, cookies), sem matriz de tema, viewport e idioma (decisão Q15
do plano). O `mobile` entrou pelo E2E filtrado, o tema escuro e o inglês apareceram de passagem na passada HTTPS, e
os três idiomas entraram pelo `Set-Cookie` do `x-locale`.

## Cobertura: testes executados

| comando | resultado |
|---------|-----------|
| `JAVA_HOME=…openjdk@21 pnpm test` (raiz: `turbo test test:emulator`, sem `--force`) | `Tasks: 15 successful, 15 total`, 13 do cache; `exit=0` |
| ↳ `@repo/shared` | 63 testes, 5 arquivos, pass |
| ↳ `@repo/auth` | 201 testes, 15 arquivos, pass |
| ↳ `api` | 1758 testes, 128 arquivos, pass (cache miss pela edição do JSDoc no `/review`) |
| ↳ `app` | 1277 testes, 140 arquivos, pass |
| ↳ `web` | 308 testes, 34 arquivos, pass |
| ↳ `api:test:emulator` | 274 testes, 8 arquivos, pass (contra os emuladores de Firestore e Storage) |
| ↳ `@repo/internationalization` (paridade) | 67 testes, pass. O diff não toca o pacote; entrou pelo turbo |
| ↳ demais pacotes | `security` 65, `next-config` 38, `payments` 19, `e2e` (vitest) 38, `email` 208, `sdk` 15, `design-system` 172, `analytics` 41, todos pass |
| `npx playwright test signIn signUp --project=chromium --project=mobile` (em `apps/e2e`) | `14 passed (2.7m)`: 4 de setup, 5 no `chromium`, 5 no `mobile` |

As contagens batem uma a uma com as do handoff (`63 / 201 / 1758 / 1277 / 308`). Typecheck e `pnpm check` não
foram rodados de novo: o `/review` mediu (`typecheck` 4/4, `pnpm check` 1117 arquivos) e esta etapa não mexeu em
nenhum arquivo do repositório fora de `docs/features/`.

No log do E2E, as rotas de sessão responderam `POST /api/auth/session` 200 (30 vezes),
`POST /api/auth/session/refresh` 200 (14) e 401 (10, sem sessão), `POST /api/auth/custom-token` 401 (13, sem
sessão). Nenhum 403 numa rota `/api/auth/*`. Os três `GET /account 403` da API vêm do admin batendo numa rota do
painel comum: é `GET`, a regra nova não se aplica a ele, e o comportamento já existia.

## Critérios de aceite com status

| # | critério | status | meio |
|---|----------|--------|------|
| 1 | Escrita na API carregada só pelo cookie, sem `Origin`, é recusada | ✅ | unit (T1, T2) + `curl` contra `next start` |
| 2 | Bearer, `GET`, preflight e chamada anônima sem `Origin` continuam passando | ✅ | unit (T2) + `curl` + navegador (`POST /entities` 201) |
| 3 | Rotas de sessão das front-ends exigem prova de mesma origem | ✅ | unit (T3/T5) + `curl` contra `app` e `web` em `next start` |
| 4 | Login, SSO e saída continuam funcionando no navegador | ✅ | E2E 14/14 + `agent-browser` em `next start` (HTTP e HTTPS) + sonda Playwright para o Google |
| 5 | Corpo das rotas de sessão validado por Zod com teto | ✅ | unit (T5) + `curl` |
| 6 | E-mail do usuário criado pelo admin tem teto | ✅ | unit (T12, com mutação) + `curl` com bearer de admin |
| 7 | `x-locale` gravado pelo servidor dura 180 dias | ✅ | unit (T8) + `curl -I` + navegador |
| 8 | Cookies de preferência do navegador ganham `Secure` em HTTPS | ✅ | unit (T7, T9) + navegador numa página HTTPS local |
| 9 | `@repo/auth` não imprime o objeto de erro | ✅ | unit (T6) + grep de 1.16 |
| 10 | API em produção sem `CORS_ORIGIN` encerra o processo | ✅ local / 🔒 Vercel | unit (T10) + `next build` e `next start` |
| 11 | Falha de credencial do Firestore em produção também encerra o processo | ✅ | unit (T11) + `next start` |

O ramo "fora de produção sem `CORS_ORIGIN` sobe com as origens de `localhost`" (critério 10) só tem prova
unitária (T10); o E2E sempre define a lista.

## Verificar no `/test` (lista do `review.md`)

1. **Login, SSO e saída sem 403: confirmado.** Em `next start` (produção, emulador), com HAR gravado no
   navegador: cadastro de `qa-security-slice-2@example.com` → `POST /api/auth/session` 200 (três vezes),
   onboarding e `POST /entities` 201; troca para inglês; abrir `http://localhost:3001/en` mostrou o botão
   "Sign Out" e o HAR registrou `POST :3001/api/auth/custom-token` 200 (duas vezes) e `session/refresh` 200;
   "Sign Out" na `web` → `DELETE :3001/api/auth/session` 200 e o `access-token` sumiu da lista de cookies;
   login por e-mail no `app` → 200; "Sign out" no `app` → `DELETE :3000/api/auth/session` 200, cookie apagado,
   página de sign-in. O Google pelo emulador: o `agent-browser` abre o popup do IdP, mas o popup não devolve o
   resultado para a aba de origem (limitação da ferramenta; os botões ficaram `disabled` esperando). Repeti só
   esse caso com uma sonda Playwright descartável em `/tmp`, contra a mesma stack: `POST :3002/auth/sign-in/google`
   200, `POST /api/auth/session` 200, cookie `access-token` com `Secure` e `HttpOnly`, chegada em `/en/onboarding`
   (conta Google nova). Nenhuma chamada `/api/auth/*` voltou 403 em nenhuma das passadas.
2. **Rotas de sessão com o app de pé: confirmado**, no `app` (3000) e na `web` (3001), ambos em `next start`.
   Sem `Origin` → 403 `AUTH_FORBIDDEN_ORIGIN`; `Sec-Fetch-Site: same-origin` e `{}` → 400 `AUTH_MISSING_TOKEN`;
   `same-site` e `cross-site` → 403; `Origin: https://evil.example`, `Origin: not a url` e `Origin: null` → 403;
   `Origin` do próprio host com `idToken` de 5000 e de 4097 caracteres → 400; 4096 → 401 `AUTH_INVALID_TOKEN`
   (chegou à verificação); `idToken` numérico, vazio ou corpo que não é JSON → 400; `session/refresh` sem
   `Origin` → 403 e com 4097 → 400; `custom-token` sem `Origin` ou de outra origem → 403, do próprio host sem
   cookie → 401 `AUTH_NO_SESSION`; `DELETE /api/auth/session` sem `Origin` ou de outra origem → 403 sem nenhum
   `Set-Cookie`; com `same-origin` → 200 e `access-token=; Max-Age=0; Secure; HttpOnly; SameSite=lax`. Extras:
   `Origin: http://localhost:3001` contra o `app` → 403; `Origin: http://127.0.0.1:3000` com `Host: localhost:3000`
   → 403.
3. **Escrita por cookie na API: confirmado**, com um número diferente do previsto. `POST /entities`, `PUT /account`,
   `PATCH` e `DELETE /entities/abc` com `Cookie: access-token=x` e sem `Origin` → 403, `Vary: Origin`, sem
   `Access-Control-Allow-Origin`, com `x-request-id`. Com `Authorization: Bearer x` → 401; com
   `Origin: http://localhost:3000` → 401 e `Access-Control-Allow-Origin: http://localhost:3000`; com
   `Sec-Fetch-Site: same-origin` → 401; com `cross-site` → 403; sem cookie → 401; só com `x-locale` → 401;
   `GET /entities` com cookie → 401. `OPTIONS` com `Origin` da allowlist e cookie → 204. O webhook
   (`POST /webhooks/payments` sem cookie e sem `Origin`) respondeu **503 `PAYMENTS_NOT_CONFIGURED`**, e não o 400 de
   assinatura que o `review.md` esperava, porque a stack de QA não tem Stripe. O que importa para a regra se
   confirma: não é 403. O log trouxe `[security] blocked reason=missing-origin path=/entities method=POST
   requestId=…` para cada recusa e `reason=origin` para a origem estranha; `grep -c 'access-token=x'` no log deu 0.
4. **`Set-Cookie` do `x-locale`: confirmado.** `curl -I` em `/pt-br/sign-in`, `/en/sign-in`, `/es/sign-in` e `/`
   do `app` e em `/pt-br`, `/en`, `/es` e `/` da `web`: `x-locale=<idioma>; Path=/; Expires=…; Max-Age=15552000;
   SameSite=lax`, sem `Secure`; a raiz responde 307 para `/pt-br/` com o mesmo cookie. Com
   `-H 'x-forwarded-proto: https'`, o `next start` passa a enxergar HTTPS e o `Secure` aparece nas duas apps,
   inclusive no 307. Atrás de um proxy de TLS que repassa o protocolo, então, o ramo HTTPS funciona.
5. **Boot em produção: confirmado**, e o caso da credencial, que só o T11 media, foi medido aqui.
   - Build: `CORS_ORIGIN` ausente, `NODE_ENV=production pnpm --filter api build` → `exit=0`, nenhuma linha
     `[boot]`, nenhuma linha `A Node.js API is used` (três builds; o único aviso é o `DEP0040` do `punycode`).
   - `next start -p 3002` com `CORS_ORIGIN` ausente, `CORS_ORIGIN=` e `CORS_ORIGIN=" , "`: os três imprimem
     `✓ Ready`, depois `[boot] CORS_ORIGIN is required in production: set the comma-separated list of origins
     allowed to call this API.` e saem com `exit=1`; `lsof -ti tcp:3002` vazio depois de cada um.
   - Sem credencial (`FIREBASE_ADMIN_*` vazias, sem `FIRESTORE_EMULATOR_HOST` nem `FIREBASE_AUTH_EMULATOR_HOST`,
     `CORS_ORIGIN` válido): `[boot] Firebase Admin credentials are not configured. Please set FIREBASE_ADMIN_*
     environment variables.` e `exit=1`, porta livre.
   - Com a lista configurada (stack do emulador): `/health` 200 `{"message":"OK"}` e `/health/ready` 200.
   - Armadilha encontrada no caminho, que não é defeito desta fatia: a primeira tentativa do caso sem credencial
     **não** encerrou, ficou no ar e respondeu 500 em `/health`. O build tinha sido feito com
     `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` no ambiente, o Next embutiu o valor no bundle do servidor, e
     `isEmulated()` passou a responder `true` em runtime mesmo sem a variável, pulando a checagem de credencial.
     Refeito o build sem as variáveis de emulador, o encerramento apareceu. Ver "Observações".
6. **`bp:*` e `setCookie` com `Secure` numa página HTTPS real: confirmado**, contra a previsão de 🔒. Pus um proxy
   de TLS descartável (Node, certificado autoassinado em `/tmp`) em `https://localhost:8443` → `app` em
   `next start`, repassando `x-forwarded-proto: https`, e incluí essa origem no `CORS_ORIGIN` da API. Login como
   admin do seed por HTTPS → `POST /api/auth/session` 200. Cookies lidos pelo navegador: `access-token`
   `secure=True` (5 dias), `x-locale` e `x-timezone` `secure=True` (180 dias). Troca de ambiente para "User
   dashboard" → `bp:panel-request-role` e `bp:impersonate-firebase-uid` com `secure=True` e 14 dias. Tema
   escuro → `x-theme` `secure=True`, 180 dias. Volta para "Administration" → `bp:impersonate-firebase-uid`
   removido (o apagamento com `; secure` funciona) e `bp:panel-request-role=admin`. Saída por HTTPS →
   `DELETE https://localhost:8443/api/auth/session` 200, cookie apagado. Na mesma passada em HTTP, `x-locale` e
   `x-timezone` saíram com `secure=False` e 180 dias.
7. **E2E de `signIn`/`signUp`: confirmado**, 14/14 nos projetos `chromium` e `mobile` (tabela acima).
8. **Contagens da suíte: confirmado**, idênticas às do handoff.

## Decisões de custo de teste

Nenhum teste novo, e nenhum da faixa cara. Por módulo tocado:

| módulo | o que já cobria |
|--------|-----------------|
| `apps/api/(shared)/lib/cookie-write-origin.ts` + `proxy.ts` | T1 (14 casos da função pura) e T2 (+10 no proxy com `NextRequest`): cada condição isolada, `Vary`, log sem cookie, rate limit não chamado |
| `packages/auth/session.ts` + `session-routes.ts` | T3/T5 (44 casos): tabela de `isSameOriginRequest`, as quatro rotas, teto de 4096, corpo inválido |
| `packages/auth/server.ts` | T6 (15 casos): as sete funções, `code`/`reason`, nada de e-mail, uid ou mensagem no log |
| `packages/shared/utils/helpers/cookies.ts` | T7 (+7): `Secure` em HTTPS, ausente em HTTP, `secure: false` vence |
| `apps/app/proxy.ts`, `apps/web/proxy.ts` | T8 (+2 em cada): 180 dias, `secure` por protocolo |
| `apps/app/shared/lib/panelState.ts` | T9 (+2): `; secure` em HTTPS, inclusive ao apagar |
| `apps/api/instrumentation.ts` + `instrumentation-node.ts` | T10 e T11: os três valores de `CORS_ORIGIN`, credencial ausente, `exit(1)` só em produção |
| `apps/api/(shared)/validation/user-admin.schema.ts` | T12 (+2), com mutação provando que é o `max` que recusa |

O que nenhum unitário prova é o runtime do Next (o processo encerrar, o `Set-Cookie` real, o navegador mandar
`Origin`). Isso foi medido acima, uma vez, e não vira teste versionado: um teste que sobe `next start` custaria um
build por execução no CI para provar uma linha que o T10/T11 já cobre na lógica.

## Lacunas herdadas

| lacuna (do handoff/review) | veredito |
|----------------------------|----------|
| Nenhum teste prova o encerramento do processo do Next fora do smoke | **continua aberta** como teste automatizado. Medida aqui nos quatro casos (item 5); fica fora do nível barato pelo motivo acima |
| A ausência do aviso de Edge no build não tem teste automatizado | **continua aberta** como teste. Medida aqui em três builds, nenhuma linha `A Node.js API is used` |
| `bp:*` e `setCookie` com `Secure` sem ambiente HTTPS (🔒 no handoff) | **fechada aqui**, com o proxy de TLS local (item 6) |
| Boot sem credencial do Firestore só no T11 | **fechada aqui** (item 5) |
| Os dois `curl` novos do item 1.10 de `docs/delivery/01-security-review.md` | **fechada aqui**: o da API → 403 (item 3), o de `$APP/api/auth/session` sem `Origin` → 403 (item 2) |
| E2E de `signIn`/`signUp` não rodados | **fechada aqui**, 14/14 |
| Encerramento do processo numa função da Vercel | **continua aberta** (🔒), exige deploy; já registrada em `docs/PRE-PRODUCTION.md` §5 |

## Grep da parte 1 (V7)

- 1.16: três linhas, nenhuma de `packages/auth/server.ts`: `apps/api/app/global-error.tsx:15`,
  `SignUpFormClient.tsx:123` e `packages/shared/utils/helpers/requestErrorReporter.ts:52`, as três excluídas por Q10.
- 1.18: os chamadores de `setCookie` passam pelo helper com `Secure` por protocolo; os `cookieStore.set("x-locale")`
  dos proxies usam `localeCookie`; `panelState.ts:140,144` põe `secureAttribute`. Sobram `sidebar.tsx:109`
  (shadcn, Q6) e o `deleteCookie` de `cookies.ts:71`, que só expira o cookie.

## Ambiente do e2e

Todas as portas estavam livres no início (3000 a 3003, 8080, 9099, 9199, 4001, 4400, 4500). Nada foi reutilizado
do usuário.

| o que | como | derrubado |
|-------|------|-----------|
| Stack do Playwright (emuladores + `next dev` de api/app/web) | o próprio `playwright test` sobe e derruba (`webServer`) | sim, pelo Playwright |
| Builds de produção | `pnpm --filter {api,app,web} build` com o ambiente do emulador gerado por `buildStackEnv` (`apps/e2e/support/stackEnv.ts`) e uma service account de mentira só para passar na validação do `env.ts` | não há processo; os `.next/` das três apps ficaram com build de produção (gitignored) |
| Boot da API (quatro casos de falha) | `next start -p 3002`, um de cada vez | cada um saiu sozinho com `exit=1`; o primeiro caso sem credencial (o do bundle com emulador embutido) foi morto por PID |
| Emuladores (auth, firestore, storage) | `firebase emulators:start` em background, PID guardado | `SIGINT` no PID |
| `api` (3002), `app` (3000), `web` (3001) em `next start` | background, PID guardado; a API foi reiniciada uma vez para incluir `https://localhost:8443` no `CORS_ORIGIN` | `kill` por PID |
| Proxy de TLS (8443) | script Node em `/tmp`, PID guardado | `kill` por PID |

Ao final, `lsof -ti tcp:<porta> -sTCP:LISTEN` saiu vazio em 3000, 3001, 3002, 3003, 8443, 8080, 9099, 9199, 4001,
4400, 4500 e 9150, e não sobrou `next-server` nem emulador em `ps`. O `next dev` do Playwright gerou
`apps/{api,app,web}/AGENTS.md` não rastreados; apaguei os três. O script descartável, a chave e o certificado de
TLS e a senha gerada para a conta de QA ficaram em `/tmp/qa-slice2/` e foram apagados; nenhum harness entrou no
repositório.

## Evidências e2e

O texto acima é a prova. Os prints em `test/e2e/` são descartados pelo `.gitignore` e serviram só para conferir
na hora:

- `01-web-sso-signed-in.png`: landing da `web` em inglês com "Sign Out" no cabeçalho, depois do login no `app`;
- `02-https-admin-dark.png`: painel admin em `https://localhost:8443/en/admin`, tema escuro, seletor
  "Administration", cartões "Users 3 / Admins 1 / Common users 2" (os dados do seed).

Nenhum print mostra e-mail de pessoa real.

## Dados de QA e estado de dev

Tudo no emulador (projeto `demo-next-boilerplate`), que morreu com o processo. Nenhum dado em projeto Firebase real
e nenhuma conta para limpar.

- `qa-security-slice-2@example.com` (e-mail e senha; a senha foi gerada na hora e não está em arquivo nenhum),
  com a entidade "QA slice 2 entity";
- `qa-security-slice-2-google@example.com` (Google pelo IdP do emulador), parou no onboarding;
- o seed do emulador (`apps/api/scripts/seed-emulator.mjs`), rodado uma vez para ter um admin na passada HTTPS. Ele
  recria o estado do emulador do zero.

`.claude/dev-credentials.local.md` não existe neste workspace e não foi necessário.

## Observações para o `/spec --sync` (nenhuma é defeito desta fatia)

- **Logout entre apps não é verificável na stack do E2E.** `buildStackEnv("web")` não define
  `NEXT_PUBLIC_API_URL` (fica o `""` do `.env.example`), então o `sessionAuthority` da `web` não fala com a API. Na
  passada: sair na `web` apagou o cookie, mas a sessão não foi encerrada na API; ao abrir o `app`, o cliente
  Firebase da origem 3000 regravou o cookie (`POST :3000/api/auth/session` 200) e a pessoa continuou logada. É o
  modo degradado que o `docs/AUTH-SSO.md` descreve ("Se a API não responder, o cookie é gravado como antes"), e o
  passo 3 de "Como validar o fluxo completo" fica sem cobertura enquanto o E2E não passar a URL da API para a
  `web`. Sugestão: `crossAppUrls` em `apps/e2e/support/stackEnv.ts` devolver `NEXT_PUBLIC_API_URL` também para a
  `web`.
- **Build de produção com variável de emulador embutida.** `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` é inlined no
  bundle do servidor da API, e `isEmulated()` (`packages/auth/emulator.ts`) lê essa variável. Um build de produção
  feito com ela no ambiente sobe "emulado" para sempre: pula a checagem de credencial e não encerra no boot. Só
  acontece se alguém buildar produção com a variável definida, mas o efeito é silencioso.
- O build de produção da API exige `FIREBASE_ADMIN_*` válidas (o `env.ts` valida ao coletar page data), inclusive
  uma chave PEM que o `cert()` consiga ler. Para buildar contra o emulador foi preciso uma service account de
  mentira. Comportamento anterior a esta fatia.
- `bp:panel-request-role` continua no navegador depois da saída. Não é credencial (a API revalida a cada
  requisição), e o comportamento já existia.
