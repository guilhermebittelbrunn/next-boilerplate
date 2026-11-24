# Revisão: fatia 2 da revisão de segurança (defesa em profundidade)

Rodou dentro do `/cycle`, sem perguntas. Fontes: [`analyze/plan.md`](../analyze/plan.md),
[`develop/handoff.md`](../develop/handoff.md), `git diff` e os arquivos não rastreados. Nada foi commitado.

## Branch

- **`feat/delivery-security-hardening`**, criada com `git switch -c` a partir de
  `guilhermebittelbrunn/remaining-tasks-cycle` (sem upstream, nenhum commit à frente de `origin/main`, HEAD em
  `5829ea3`). O working tree veio junto, sem `stash` nem `reset`.
- A branch anterior estava fora do padrão `<project>/<type>/<title>`. Como esta rodada junta a fatia 2, a
  fatia 3 da mesma spec e tarefas diretas em vários apps e pacotes, o `project` foi omitido, que é a forma
  aceita para mudança que cruza apps.
- Regex do `/review`: `branch OK: feat/delivery-security-hardening`.

## Revisão: diff da fatia 2 + auditoria do backlog + docs

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `docs/SECURITY.md`, tabela de CORS: a primeira linha dizia "Sem header `Origin`, sem o cookie
  `access-token` ou com `Authorization`", o que se lê como três condições independentes. Lida assim, "sem
  `Origin`" bastaria para passar, contradizendo a linha seguinte e o código
  (`apps/api/(shared)/lib/cookie-write-origin.ts:12-20`). **Corrigido**: a linha passou a separar leitura
  (`GET`/`HEAD`/`OPTIONS`) de escrita sem o cookie, com `Authorization` ou com `Sec-Fetch-Site: same-origin`.

### 🟢 Sugestão / nit

- `apps/api/instrumentation-node.ts:1-6`: o JSDoc dizia que encerrar o processo "faz uma configuração errada
  em produção parar o deploy". Isso não foi medido na Vercel, e o próprio `docs/PRE-PRODUCTION.md` §5 marca
  esse comportamento como 🔒. **Corrigido**: o comentário agora diz que o Next continua no ar respondendo 500
  (um health check que só testa a porta vê o servidor saudável) e que encerrar transforma o erro numa queda
  que a plataforma registra.
- `packages/auth/provider.tsx:178-181`: o `DELETE /api/auth/session` da saída ignora a resposta. Se a rota
  responder 403 (proxy reverso que reescreve `Host`, por exemplo), o cookie fica e a saída falha em
  silêncio. A mesma condição já derrubaria o `POST` de login antes deste diff, então a regressão só aparece
  num ambiente onde o login já quebra. Não corrigido; fica registrado.
- `apps/api/(shared)/lib/cookie-write-origin.ts:5`: quarta cópia do literal `"access-token"`. Decisão Q17 do
  plano (importar `@repo/auth/session` levaria `firebase-admin` e `next/headers` ao proxy). Mantido.
- Três constantes de 180 dias continuam duplicadas no `app` e na `web` ao lado da nova
  `PREFERENCE_COOKIE_MAX_AGE_SECONDS` (Q14). Mesmo valor; consolidar fica para o backlog.
- O commit de `@repo/auth` muda a assinatura de `sessionDELETE`. Entre ele e os commits de `app` e `web` que
  ajustam `app/api/auth/session/route.ts`, o typecheck dos dois apps quebra. Os commits saem em sequência no
  mesmo PR, então o estado final é consistente.

### ✅ OK

- **Raio de impacto da escrita por cookie na API** (`apps/api/proxy.ts:199-209`), conferido por leitura:
  - servidor dos front-ends para a API: `getServerApiClient` (`apps/app/lib/server/apiServerClient.ts:29`) e
    `createSessionAuthority` (`packages/sdk/src/client/sessionAuthority.ts:38`) mandam
    `Authorization: Bearer` e não mandam cookie, então passam;
  - SDK no navegador: chamada cross-origin, o navegador manda `Origin`, e a allowlist decide como antes;
  - webhook da Stripe (`/webhooks/payments`): sem cookie de sessão, passa;
  - preflight: `OPTIONS` não está em `MUTATING_METHODS`, segue para o ramo de preflight;
  - E2E: `apps/e2e/support/stackEnv.ts:72` define `CORS_ORIGIN`, e a suíte não faz `request.post` direto
    contra a API nem contra as rotas de sessão.
- **Rotas de sessão dos front-ends**: os quatro chamadores de navegador (`packages/auth/provider.tsx:165,178,196,225`,
  `SignInForm.tsx:98`, `SignUpFormClient.tsx:87`, `googleSignInApi.ts:80`) fazem `fetch` same-origin com
  `POST` ou `DELETE`, métodos em que o navegador manda `Origin` mesmo na mesma origem. `sessionDELETE` e
  `customTokenPOST` só têm os dois chamadores de cada app (`git grep`), e as rotas já recebiam `request`.
- **Cookie `Secure` no dev em HTTP**: `isHttpsPage()` e `preferenceCookieOptions(protocol)` decidem pelo
  protocolo, não por `NODE_ENV`. Em `http://localhost` nenhum dos dois marca `Secure`. O consentimento
  (`packages/analytics/provider.tsx:81-85`) passa `secure` explícito e não muda.
- **`process.exit(1)` e testes**: `bootOrExit` só encerra com `NODE_ENV=production`; em `test` e
  `development` relança, como antes. Os testes de boot espiam `process.exit`.
- **`process.exit(1)` e `next build`**: o código não depende de `NEXT_PHASE`; a afirmação de que o build não
  executa `register` vem do smoke do `/develop` e está na lista abaixo.
- **Logs de `@repo/auth`**: `authErrorFields` (`packages/auth/server.ts:150-158`) entrega só o `code` do
  provedor ou o `name` da classe; `logEvent` não aceita objeto. Nenhum dos sete pontos imprime `message`.
- **Zod no `idToken`** (`packages/auth/session-routes.ts:23-27`): corpo inválido continua em
  `AUTH_MISSING_TOKEN`, sem código novo e sem i18n novo.
- **Teto do e-mail do admin** (`apps/api/(shared)/validation/user-admin.schema.ts:6,9`): constante
  extraída, `max` antes do `email`.
- **Corte da spec**: os cinco itens da fatia 2 de `specs/delivery-security-review.md` estão no diff. Um desvio
  registrado: o encerramento do boot cobre também a credencial do Firestore ausente (Q7), além do
  `CORS_ORIGIN` que a spec cita.
- **Comentários**: nenhum cita o fluxo; os novos explicam porquê.
- **Âncoras de linha nos docs**: conferidas contra o código atual em `SECURITY.md`, `PRE-PRODUCTION.md`,
  `INCIDENT-RESPONSE.md`, `ROPA.md`, `SUBPROCESSORS.md` e `BACKUP.md` (`proxy.ts:74,99,106,122-134,222`,
  `session.ts:79-90`, `session-routes.ts:125`, `server.ts:101,315,324-327,353-355`, `panelState.ts:19-20`,
  proxies `:250,254` e `:122,126`). Todas batem.
- **Auditoria do backlog** (`specs/*.md`): só deslocamento de âncora e status depois da PR #73, nada desta
  fatia. Vai em commit próprio.

### 👁 Verificar no `/test`

Afirmações do handoff que a leitura não confirma. A de maior risco é a primeira: ela sustenta que a regra nova
não quebra login nem SSO.

1. **Login, SSO e saída no navegador não recebem 403** (V1). A leitura confirma que os `fetch` são `POST`/`DELETE`
   same-origin; não confirma o `Host` que chega à rota atrás do `next dev`/`next start`. Repro: entrar no `app`
   por e-mail e por Google, abrir a `web` (bootstrap por `custom-token`), deixar o refresh rodar, sair. Nenhum
   403 em `/api/auth/session`, `/session/refresh` e `/custom-token`; o cookie `access-token` some após a saída.
2. **Rotas de sessão com o app de pé** (V2). Repro: `curl -X POST "$APP/api/auth/session" -d '{}'` → 403;
   com `-H 'Sec-Fetch-Site: same-origin'` → 400 `AUTH_MISSING_TOKEN`; `idToken` de 5000 caracteres com
   `Origin: $APP` → 400; `POST /api/auth/custom-token` e `DELETE /api/auth/session` sem `Origin` → 403. Igual
   na `web`.
3. **Escrita por cookie na API** (V3). O handoff mediu o 403 e o 401 com bearer. Falta medir: com
   `Origin` da allowlist e cookie → passa do proxy (401 do guard); `POST /webhooks/payments` sem cookie e sem
   `Origin` → não é 403 (400 de assinatura); `OPTIONS` com `Origin` da allowlist e cookie → 204.
4. **`Set-Cookie` do `x-locale`** (V4). Repro: `curl -sI "$APP/pt-br/sign-in"` e `"$WEB/en"` →
   `Max-Age=15552000; Path=/; SameSite=lax`, sem `Secure`. Com `-H 'x-forwarded-proto: https'`, conferir se
   `request.nextUrl.protocol` passa a `https:` e o `Secure` aparece; se não aparecer, registrar como
   limitação (atrás de proxy reverso o `Secure` depende do protocolo que o Next enxerga).
5. **Boot em produção** (V5). Repro: `env -u CORS_ORIGIN NODE_ENV=production pnpm --filter api build` →
   `exit=0`, sem linha `[boot]` nem `Warning: A Node.js API is used`; `CORS_ORIGIN= npx next start -p 3002`
   → sai com 1 e a linha `[boot] CORS_ORIGIN is required in production…`; `CORS_ORIGIN=" , "` → idem; sem
   credencial do Firestore (`FIREBASE_ADMIN_*` vazias) → sai com 1 e linha `[boot]`. Este último só o
   unitário (T11) mediu.
6. **`bp:*` e `setCookie` com `Secure` numa página HTTPS real**. Só medido espiando `document.cookie`. Sem
   ambiente HTTPS local, fica 🔒.
7. **E2E de `signIn`/`signUp`** (V6), projetos `chromium` e `mobile`. Não rodados no `/develop`.
8. **Contagens da suíte** do handoff (`@repo/shared` 63, `@repo/auth` 201, `api` 1758, `app` 1277, `web` 308)
   não foram remedidas aqui.

## Correções aplicadas

| arquivo | o que mudou |
|---------|-------------|
| `apps/api/instrumentation-node.ts:1-7` | JSDoc deixa de prometer que encerrar o processo para o deploy; descreve o 500 com a porta respondendo e a queda que a plataforma registra |
| `docs/SECURITY.md` (tabela de CORS) | primeira linha da tabela de CORS separa leitura de escrita e cita `Sec-Fetch-Site: same-origin`, em vez de três condições soltas |

## Raio de impacto (contrato)

- `@repo/auth/session-routes`: `sessionDELETE(request, authority?)`; `customTokenPOST(request, authority?)` com
  `request` obrigatório. Consumidores: `apps/app/app/api/auth/session/route.ts`,
  `apps/web/app/api/auth/session/route.ts` (ajustados) e as duas rotas `custom-token` (já passavam).
- `@repo/auth/session`: `isSameOriginRequest` recusa requisição sem `Origin` e sem
  `Sec-Fetch-Site: same-origin`. Único consumidor: `session-routes.ts`.
- `@repo/shared/utils`: `isHttpsPage`, `preferenceCookieOptions`, `PREFERENCE_COOKIE_MAX_AGE_SECONDS`. Os seis
  chamadores de `setCookie` sem `secure` passam a gravar `Secure` em HTTPS.
- `apps/api` proxy: escrita com o cookie `access-token`, sem `Origin`, sem bearer e sem
  `Sec-Fetch-Site: same-origin` → 403 `AUTH_FORBIDDEN_ORIGIN`. Cliente que não é navegador e usa o cookie
  precisa mandar bearer ou `Origin`.
- `@repo/sdk` e `@repo/internationalization`: sem mudança.

## Lacunas de teste

| lacuna (do handoff) | veredito |
|---------------------|----------|
| Nenhum teste prova o encerramento do processo do Next fora do smoke | continua aberta; o objeto é o runtime, vai para o item 5 da lista acima |
| A ausência do aviso de Edge no build não tem teste automatizado | continua aberta; só o log do build prova, item 5 |

Nenhuma lacuna nova. As correções desta revisão foram em comentário e documentação.

## Decisões em aberto

Nenhuma. A branch foi resolvida aqui (acima) e os 🟢 não pedem decisão.

## Gates

| gate | comando | resultado |
|------|---------|-----------|
| lint/format | `pnpm check` | `Checked 1117 files in 681ms. No fixes applied.` |
| typecheck | `pnpm turbo run typecheck --filter=api --filter=app --filter=web --filter=@repo/auth` | `Tasks: 4 successful, 4 total` (3 do cache; `api` rodou de novo pela edição do comentário) |
| i18n | não rodado | nenhum arquivo de `packages/internationalization` mudou |
| suíte | não rodada | é do `/test`; nenhuma correção daqui tocou código executável |

## Plano de commits

O plano desta fatia foi recomposto com o da fatia 3 e o da tarefa `e2e-org-ownership-flake-and-web-api-url`, que
rodam no mesmo working tree e na mesma branch. O plano combinado está em
[`../../app-footer-focus-not-obscured/review/review.md`](../../app-footer-focus-not-obscured/review/review.md),
seção "Plano de commits combinado da rodada" (recomposto quando as tarefas seguintes da rodada entraram). Os commits desta fatia mantêm mensagens e arquivos; as correções de
documentação saem num commit `docs` único da rodada, porque quatro documentos têm trechos de mais de uma mudança.

Varredura de segredo em `docs/features/delivery-security-review-slice-2/`: nenhuma senha, chave, token real ou
e-mail de pessoa. Os `access-token=x` e `eyJ...` são marcadores de exemplo.

Commits realizados: _(preenchido pelo orquestrador)_
