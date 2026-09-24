# Revisão — renovação deslizante da sessão

- **Plano**: [`analyze/plan.md`](../analyze/plan.md) · **Handoff**: [`develop/handoff.md`](../develop/handoff.md)
- **Rodada**: autônoma (`/cycle`), sem interação com o usuário
- **Ambiente**: emuladores de Auth e Firestore (JDK 21), `pnpm seed`, `api`/`app`/`web` subidos pela
  revisão com `SESSION_COOKIE_MAX_AGE_DAYS` e `SESSION_ABSOLUTE_MAX_AGE_DAYS` em `0.0035` (302 s, o mínimo
  do Firebase). Todas as portas estavam livres no início; todos os processos subidos aqui foram encerrados
  ao final.

## Branch

`auth/feat/session-refresh`, criada a partir de `bangkok-v1` (que não é protegida, mas está fora do padrão
de nome). O projeto é `auth` porque o código vive em `packages/auth`; `apps/app`, `apps/web` e
`packages/internationalization` entram como consumidores.

Validação do nome contra o regex de [`.claude/rules/git-commits.md`](../../../../.claude/rules/git-commits.md):
`branch OK: auth/feat/session-refresh`.

## Segunda rodada — o defeito que o `/test` devolveu

O QA mediu que o re-login depois do estouro do teto caía em `/pt-br`, e não no destino de onde a pessoa
tinha sido tirada. A causa estava em `handleSessionExpired`: ele montava o `?redirect=` com o
`window.location.pathname` do momento. Quando a recusa chega com a pessoa já na tela de login — que é o
caso quando o cookie expira antes do teto — o pathname é `/pt-br/sign-in`, e o destino que o
`apps/app/proxy.ts` tinha acabado de montar era sobrescrito.

`packages/auth/provider.tsx:72-82` ganhou `expiredSessionOrigin`: lê o `redirect` que já está na URL e só
cai no pathname quando não existe nenhum. O valor herdado passa por `postAuthRedirectTarget`, o guard de
open-redirect do próprio repo (`packages/auth/redirect.ts`), então destino de outra origem não é
repassado. Quando a conta fecha na própria tela de login, o `push` vai sem query, em vez de mandar a
pessoa de volta ao login depois do login.

Medido no browser com janelas de 302 s, seguindo o repro do QA:

```
login → /pt-br/entities → 305 s sem tocar na aba → recarrega
proxy    → /pt-br/sign-in?redirect=%2Fpt-br%2Fentities
provider → refresh 401 → session 401 AUTH_SESSION_EXPIRED → logout + alerta + push
URL final: /pt-br/sign-in?redirect=%2Fpt-br%2Fentities
re-login → /pt-br/entities, com a listagem carregada (screenshot 13)
```

Dois casos novos em `apps/app/__tests__/sessionExpiredSignOut.test.tsx` fixam o contrato: o destino do
proxy é preservado, e um `redirect` de outra origem é descartado. Verifiquei que eles pegam a regressão —
com o `handleSessionExpired` de volta ao pathname, os dois falham e os seis casos do QA continuam verdes.

Sobre o 🟡 do throttle, que o QA mediu em até 32,5 dias com o padrão 5/30: concordo com a leitura dele. A
renovação recusa, que é o que o corte pede; a janela vem de checar o teto só depois do limiar, e mexer
nisso é decisão de produto, não correção de revisão.

## Achados

| sev | arquivo:linha | problema | ação |
|-----|---------------|----------|------|
| 🔴 | `apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx:82` + `packages/auth/provider.tsx:246` | Com o teto estourado **e o cookie já ausente**, `POST /api/auth/session` passa a responder 401 `AUTH_SESSION_EXPIRED`. Os dois chamadores ignoravam a recusa: o formulário navegava assim mesmo e o provider engolia a exceção. O proxy devolvia a navegação para `/sign-in`, o efeito rodava de novo, e o resultado era laço infinito de `GET /pt-br` → `GET /pt-br/sign-in` com `FullScreenLoader` permanente. Sem formulário de login, sem aviso, sem saída. | Corrigido (ver abaixo) |
| 🟡 | `packages/auth/session-routes.ts:108` | O throttle roda antes da checagem de revogação, então uma sessão revogada continua recebendo `{ refreshed: false }` 200 até o limiar. É escolha de custo do plano e não estende sessão nenhuma: o mint, que é o que prolonga, só acontece depois de `getSessionFromCookie` com `checkRevoked`. O proxy segue verificando revogação a cada navegação. | Mantido, registrado |
| ❌→✅ | `packages/auth/provider.tsx:226` (rodada 2) | `handleSessionExpired` montava o `?redirect=` com o pathname atual. Notada na tela de login, a expiração sobrescrevia o destino que o proxy tinha montado, e o re-login caía em `/pt-br` em vez do lugar de onde a pessoa saiu. Contraria a decisão nº 3 da spec. | Corrigido e medido (ver "Segunda rodada") |
| 🟢 | `packages/auth/session-routes.ts:117` | A rota regrava o cookie a partir do `idToken` do corpo sem comparar o `uid` dele com o do cookie atual. Não há escalação: quem tem um ID token válido de outra conta já consegue o mesmo por `POST /api/auth/session`, sem cookie nenhum. | Registrado em decisões em aberto |
| 🟢 | `packages/auth/provider.tsx:232` (login em `apps/app`) | O login dispara `POST /api/auth/session` três vezes (StrictMode de dev + `onAuthSuccess` + `applySignedInUser`). Comportamento anterior à tarefa; a renovação não piorou a conta. | Não tocado |
| ✅ | `packages/auth/session.ts:96-140` | Teto lido de env com `||` (string vazia conta como ausência), default 30 dias, grampeado entre a vida do cookie e 90. Limiar em metade da vida do cookie. Coberto por 23 casos em `sessionAbsoluteCap.test.ts`. |  |
| ✅ | `packages/auth/session.ts:147` | O teto é imposto dentro de `mintSessionCookie`, então vale também para `sessionPOST` — o `provider.tsx` não tem como passar por cima. |  |
| ✅ | `packages/auth/session-routes.ts:2` | Status HTTP vêm de `HTTP_STATUS` do `@repo/shared/utils`, e não de constantes locais. O desvio nº 2 do handoff já não descreve o código no working tree. `pnpm --filter @repo/auth test` passa com esse import. |  |
| ✅ | `packages/internationalization/translations/packages/{auth/index,shared/utils}.ts` | `provider.session.expired` e `apiErrors.AUTH_SESSION_EXPIRED` nos três idiomas, com a mesma estrutura. Paridade verde. |  |
| ✅ | diff inteiro | Nenhum comentário cita `plan.md`, `handoff.md`, `STATE.md` ou `docs/features/`. Nenhum `console.log`. Nenhuma credencial nos artefatos da feature. |  |

## Correções aplicadas

**`packages/auth/provider.tsx`** — `syncSessionCookie` passou a lançar `SessionCookieRejectedError`
carregando o `error.code` da resposta, e o `catch` de `applySignedInUser` trata `AUTH_SESSION_EXPIRED`
chamando `handleSessionExpired`. Isso desloga o usuário do Firebase no cliente, que é o que interrompe o
laço: enquanto o `user` existia, toda tela continuava tentando navegar para a área autenticada. O parsing
do `error.code` virou o helper `readErrorCode`, usado também por `refreshSessionCookie`.

**`apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx`** — o efeito que redireciona
quem chega com sessão persistida agora olha o status da resposta e **não navega** quando a gravação do
cookie devolve 401. Sem cookie, o destino volta para o sign-in de qualquer jeito; ficar parado é o que
deixa o formulário aparecer. O comentário que já estava ali descrevia exatamente esse laço como o motivo
de gravar o cookie antes de navegar — o teto absoluto quebrou o pressuposto de que a gravação sempre
funciona.

**`packages/auth/provider.tsx`, rodada 2** — `handleSessionExpired` passou a montar o `?redirect=` com
`expiredSessionOrigin`, que prefere o destino já carregado na URL.

**`apps/app/__tests__/sessionExpiredSignOut.test.tsx`, rodada 2** — dois casos acrescentados ao arquivo do
QA, sem tocar nos seis que já estavam lá.

As mudanças estão no working tree, não commitadas.

## Raio de impacto

- `mintSessionCookie` deixou de lançar e devolve união discriminada. Chamadores: `sessionPOST` e
  `sessionRefreshPOST`, ambos em `packages/auth/session-routes.ts`.
- `POST /api/auth/session` ganhou um motivo novo de recusa (401 `AUTH_SESSION_EXPIRED`). Chamadores no
  cliente: `provider.tsx`, `SignInForm.tsx`, `SignUpFormClient.tsx` e `shared/lib/googleSignInApi.ts`. Os
  dois primeiros foram corrigidos; os outros dois só rodam depois de autenticação recém-feita, quando o
  teto não pode ter estourado.
- `getUserFromSessionCookie` virou wrapper de `getSessionFromCookie`. Os seis chamadores de produção e os
  quatro arquivos de teste que fazem `vi.mock` do símbolo seguem funcionando sem edição.
- `customTokenPOST` passou a repassar a claim `sessionAuthTime`. Consumidor: o bootstrap de SSO do
  `provider.tsx` nos dois front-ends.

## 👁 Validação visual

Screenshots em [`screenshots/`](screenshots/): `05` a `12` da primeira rodada, `13` da segunda.

**Login e navegação em `apps/app` (3000).** Login com e-mail e senha em pt-br, dashboard renderizado com os
dados da API (4 entidades, 3 ativas) e listagem de entidades carregando pelo `apiClient`. A sequência de
rede no login é `refresh` 401 `AUTH_NO_SESSION` → `session` 200 → `refresh` 200. Refeito depois das
correções, com o mesmo resultado.

**Bootstrap de SSO em `apps/web` (3001).** Com a sessão estabelecida na `apps/app`, a `apps/web` responde
`POST /api/auth/custom-token` 200 com token e adota a sessão: o header passa a mostrar "Sair". A contagem
de `POST /api/auth/session` na `apps/web` é **zero**, como o plano previa.

**Teto absoluto, por HTTP.** Ciclo medido contra a `apps/app` com janelas de 302 s:

```
t+0s    session  200 {"ok":true}                        Max-Age=302
t+0s    refresh  200 {"refreshed":false}
t+160s  refresh  200 {"refreshed":true}                 cookie novo, Max-Age=302
t+316s  refresh  401 {"error":{"code":"AUTH_SESSION_EXPIRED"}}   Set-Cookie Max-Age=0
```

A recusa em `t+316s` acontece mesmo com o cookie tendo sido renovado em `t+160s`, que é a prova de que o
teto conta da autenticação original e não da última renovação.

**Teto absoluto, no browser.** Antes da correção, `/pt-br/entities` com o teto estourado ficava em laço:
`GET /pt-br` → `GET /pt-br/sign-in` repetidos, cada um com `refresh` 401 + `session` 401, spinner
permanente (screenshot `07`). Depois da correção, a mesma navegação chega em
`/pt-br/sign-in?redirect=%2Fpt-br%2Fentities` com o alerta
`"Sua sessão expirou. Entre novamente para continuar."` lido da árvore de acessibilidade, **um** alerta e
não dois, o formulário renderizado e nenhuma requisição nova em 12 s de observação.

**Teto absoluto na `apps/web`** (a lacuna que o `/develop` deixou aberta). Passado o teto, a landing deixa
de mostrar "Sair", a sequência é `refresh` 401 → `session` 401 e para aí, sem laço. A `apps/web` não
redireciona para o sign-in porque a landing é pública, o que é o comportamento correto para ela.

**Destino preservado (rodada 2).** Repro do QA percorrido inteiro: o `?redirect=%2Fpt-br%2Fentities`
sobrevive ao `handleSessionExpired` e o re-login devolve a pessoa à listagem de entidades (screenshot
`13`). Só duas chamadas de auth na volta (`refresh` 401, `session` 401), sem laço.

**Temas e viewports.** Sign-in em dark e light (1280x577) e em mobile (390x844). Sem quebra de layout.

**Aviso pré-existente**: a `apps/web` registra no console um `<button>` aninhado em `<button>` no header.
Não vem deste diff.

## Lacunas de teste

- Revogação de ponta a ponta continua sem cobertura executável: `verifySessionCookie(cookie, true)` aceita
  o cookie depois de `revokeRefreshTokens` no emulador. Exige projeto Firebase real.
- O laço corrigido na primeira rodada e o destino preservado na segunda **já têm teste**: os seis casos do
  QA em `sessionExpiredSignOut.test.tsx` mais os dois que acrescentei ali.
- O caminho `refreshed: false` com a rota devolvendo 500 ou erro de rede está coberto por teste
  (`sessionExpiredSignOut.test.tsx`), mas não foi percorrido no browser.

## Decisões em aberto

1. **Comparar o `uid` do cookie com o do ID token na renovação.** Hoje a rota regrava a partir do token do
   corpo sem conferir se é a mesma conta do cookie. Não abre escalação, mas deixa o contrato da rota menos
   honesto do que o nome dela sugere. Recomendação: tratar divergência como `AUTH_NO_SESSION`, que já leva
   o provider a cair no `sessionPOST`. Fora do raio desta revisão.
2. **`sessionDELETE` continua em `getUserFromSessionCookie`** (desvio nº 3 do handoff). A troca por
   `getSessionFromCookie` seria equivalente e não estava no plano. Recomendação: deixar como está.
3. **`packages/auth` declara `next: 15.1.3` sob monorepo em 16.** Dívida pré-existente, deliberadamente
   fora do raio.

## Gates

| gate | comando | rodada 1 | rodada 2 |
|------|---------|----------|----------|
| Lint/format | `pnpm check` | 605 arquivos, 0 erros | 607 arquivos, 0 erros |
| Turbo | `pnpm turbo run lint typecheck test` | 24/24 tasks | 24/24 tasks |
| Testes | soma dos workspaces | 1315 em 132 arquivos | 1325 em 134 arquivos |
| `packages/auth` | `pnpm --filter @repo/auth test` | 101 testes, 8 arquivos | 101 testes, 8 arquivos |
| i18n | incluído na execução do turbo | 27 testes, paridade verde | 27 testes, paridade verde |

A rodada 1 bateu com a linha de base do `/develop`. A rodada 2 soma os 8 casos do QA mais os 2 que
acrescentei. Nenhum teste existente foi editado, desativado ou afrouxado.

## Correspondência com o corte de MVP

Os sete itens do corte de [`specs/session-refresh.md`](../spec.md) estão
atendidos pelo código. O item "a renovação respeita a revogação" está implementado
(`session-routes.ts:112-115`: `getSessionFromCookie` com `checkRevoked` antes do mint, e limpeza do cookie
quando o provedor recusa) e coberto por teste unitário, mas não é verificável no emulador. Isso não é
regressão desta tarefa: `getUserFromSessionCookie`, que o `apps/app/proxy.ts` usa em toda navegação
autenticada, faz a mesma chamada e é afetado do mesmo jeito.

## Plano de commits

Proposto, não executado. Quatro assuntos, nesta ordem. São onze commits, e não dez: os dois arquivos de
teste do `/test` vivem em `apps/app`, então não cabem no commit do `packages/auth`, e separá-los do
`route.ts` deixa cada commit com um assunto só.

1. `feat(auth): enforce an absolute session lifetime and expose session claims`
   `packages/auth/server.ts` · `packages/auth/session.ts` ·
   `packages/auth/__tests__/sessionAbsoluteCap.test.ts`
2. `feat(auth): add the session refresh route and carry the sign-in instant across SSO`
   `packages/auth/session-routes.ts` · `packages/auth/__tests__/sessionRefreshRoute.test.ts`
3. `fix(auth): sign the user out and keep the destination when the session is refused for good`
   `packages/auth/provider.tsx`
4. `feat(app): mount the session refresh route`
   `apps/app/app/api/auth/session/refresh/route.ts` · `apps/app/.env.example`
5. `fix(app): stop the redirect loop when the session lifetime is over`
   `apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx` ·
   `apps/app/__tests__/sessionExpiredSignOut.test.tsx` ·
   `apps/app/__tests__/signInPersistedSessionRedirect.test.tsx`
6. `feat(web): mount the session refresh route`
   `apps/web/app/api/auth/session/refresh/route.ts` · `apps/web/.env.example`
7. `feat(internationalization): add the expired session copy and error code`
   `packages/internationalization/translations/packages/auth/index.ts` ·
   `packages/internationalization/translations/packages/shared/utils.ts`
8. `docs: document the absolute session lifetime`
   `docs/AUTH-SSO.md` · `docs/SETUP.md`
9. `docs(specs): reconcile the backlog with the code`
   `specs/BACKLOG.md` · `specs/admin-analytics-dashboard.md` · `specs/admin-billing-insights.md` ·
   `specs/billing-subscription.md` · `specs/data-rights-lgpd.md` · `specs/e2e-testing.md` ·
   `specs/observability-logging.md` · `specs/session-refresh.md` · `specs/teams-organizations.md` ·
   `specs/user-activity-tracking.md` · `specs/dashboard-home.md` → `docs/features/dashboard-home/spec.md`
10. `docs: correct the guard count and the Firestore index checklist`
    `docs/SECURITY.md` · `docs/PRE-PRODUCTION.md`
11. `docs(features): session-refresh`
    `docs/features/session-refresh/`

Os testes do commit 5 cobrem o provider do commit 3, mas moram na `apps/app` e é lá que o `pnpm test` os
roda. Os commits 8 e 10 são os dois blocos de documentação: o 8 nasceu da feature (descreve o teto e a
variável nova), o 10 nasceu da auditoria do backlog (corrige a contagem de guards e a lista de índices).
O 9 carrega o `git mv` de `specs/dashboard-home.md`, que é a spec entregue saindo do backlog.

### Commits realizados

(preenchido pelo `/review` depois da aprovação)
