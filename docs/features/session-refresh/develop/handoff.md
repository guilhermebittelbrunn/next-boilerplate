# Handoff — Renovação deslizante da sessão

- **Plano**: [`analyze/plan.md`](../analyze/plan.md)
- **Rodada**: autônoma (`/cycle`), sem interação com o usuário
- **Branch**: nenhuma criada. Mudanças no working tree, como manda o fluxo.

## O que mudou, camada por camada

Nem `packages/sdk` nem `apps/api` entraram, como o plano previu. A cadeia começa em `packages/auth`.

### B1 · `packages/auth/server.ts`

Três funções novas e um wrapper:

- `verifyIdTokenClaims(idToken)` — claims do ID token, `null` nos motivos benignos.
- `decodeSessionCookie(cookie)` — `verifySessionCookie(cookie, false)`, sem consultar o provedor.
- `getSessionFromCookie(cookie)` — `{ user, decoded }` com `checkRevoked: true`.
- `getUserFromSessionCookie` virou wrapper de uma linha sobre `getSessionFromCookie`.

Os seis chamadores de produção e os quatro arquivos de teste que fazem `vi.mock` do símbolo continuam
como estavam. `serverSessionRevocation.test.ts` passa sem edição, que era a prova pedida.

### B2 · `packages/auth/session.ts`

- `SESSION_ORIGIN_CLAIM = "sessionAuthTime"`.
- `getSessionAbsoluteMaxAgeMs()` — lê `SESSION_ABSOLUTE_MAX_AGE_DAYS` com `||`, default 30 dias,
  grampeada entre a vida do cookie e 90 dias.
- `resolveSessionOriginSeconds(claims)` — prefere `sessionAuthTime`, cai em `auth_time`, devolve `null`
  quando não há nenhum dos dois.
- `isWithinAbsoluteCap(originSeconds)` — `true` quando a origem não é legível.
- `shouldRefreshSession(iat)` — limiar em metade da vida do cookie, comparação `>=`.
- `mintSessionCookie` devolve `MintSessionResult` em vez de lançar.

### B3 · `packages/auth/session-routes.ts`

`sessionRefreshPOST` novo, na ordem que o plano definiu: origem, corpo, cookie presente, cookie decodável,
throttle, revogação, mint. `sessionPOST` e `customTokenPOST` passaram a tratar o resultado do mint;
`customTokenPOST` recusa o bootstrap com o teto estourado e repassa a origem na claim.

### B5 · Arquivos de rota

`apps/app/app/api/auth/session/refresh/route.ts` e `apps/web/app/api/auth/session/refresh/route.ts`,
re-exports finos.

### B6 · `packages/auth/provider.tsx`

`refreshSessionCookie` e `handleSessionExpired` novos; `applySignedInUser` passou a chamar a renovação e a
cair no `syncSessionCookie` só quando a resposta é `AUTH_NO_SESSION`. `onAuthSuccess` e `signOutMutation`
não foram tocados.

### B7 · i18n

`packages.auth.provider.session.expired` e `apiErrors.AUTH_SESSION_EXPIRED`, nos três idiomas.

### B8 · Env e documentação

`SESSION_ABSOLUTE_MAX_AGE_DAYS=""` nos dois `.env.example`; uma linha na tabela do `docs/SETUP.md` e uma
seção nova em `docs/AUTH-SSO.md`.

### Testes

- `packages/auth/__tests__/sessionAbsoluteCap.test.ts` — 23 casos
- `packages/auth/__tests__/sessionRefreshRoute.test.ts` — 16 casos

## Contrato

Nenhum DTO e nenhuma action do SDK mudaram. O contrato HTTP novo é `POST /api/auth/session/refresh`, com
`{ refreshed: boolean }` no sucesso. O consumidor é o `AuthProvider`, montado pelos dois front-ends.

A mudança de assinatura com raio de impacto é `mintSessionCookie`, que deixou de lançar. Só `sessionPOST`
a chamava.

## Código de erro novo

`AUTH_SESSION_EXPIRED`, 401, em `apiErrors` nos três idiomas
(`packages/internationalization/translations/packages/shared/utils.ts`). Os outros quatro códigos da rota
já existiam. `pnpm --filter @repo/internationalization test` passa, com o teste de paridade incluso.

## O pressuposto 🔴 nº 1: verificado, e confirmado

O plano marcou como não verificado que `createSessionCookie` preserva as claims do ID token. Verifiquei
executando contra o emulador de Auth antes de construir em cima.

Com `createCustomToken(uid, { sessionAuthTime: 1700000000 })` → `signInWithCustomToken` →
`createSessionCookie` → `verifySessionCookie`:

```
idToken.sessionAuthTime = 1700000000 (number)
cookie.sessionAuthTime  = 1700000000 (number)
idToken.auth_time = 1789674355   <- reescrito pelo custom token, como o plano previa
cookie.auth_time  = 1789674355
```

A claim sobrevive aos dois saltos, e o tipo se mantém numérico. O fallback do §7.1 não foi necessário.

A mesma coisa foi confirmada com a app de pé: uma chamada a `POST /api/auth/custom-token` a partir da
`apps/web`, com sessão estabelecida na `apps/app`, devolveu um token com
`claims: { sessionAuthTime: 1789675322 }`.

## Desvios do plano

**1. O teto não é imposto só antes do mint; `createSessionCookie` também é protegido.** O blueprint do
§B1 deixava `createSessionCookie` sem `try`. Como `sessionPOST` hoje traduz qualquer exceção dele em
`AUTH_INVALID_TOKEN`, deixar a chamada nua transformaria uma recusa do provedor em 500. Envolvi em `try`
e devolvo `{ ok: false, reason: "invalid-token" }`, preservando o comportamento atual.

**2. Status HTTP em constantes locais, não em `HTTP_STATUS` do `@repo/shared`.** Escrevi primeiro com
`import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus"`, que é o padrão da `apps/api`. O
resolver do Vitest da `packages/auth` recusa: o `exports` do `@repo/shared` publica só `.` e `./utils`, e
os apps só conseguem o import fundo porque declaram alias `@repo` no `vitest.config.mts`. Preferi três
constantes locais em `session-routes.ts` a acrescentar alias ou mexer no `exports` de um pacote
compartilhado. Anotado abaixo como dívida.

**3. `sessionDELETE` continua chamando `getUserFromSessionCookie`.** Trocar para `getSessionFromCookie`
seria equivalente e não estava no plano.

## Validação

Comandos e números medidos:

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint/format | `pnpm check` | 605 arquivos, 0 erros (base: 601/0; +4 arquivos novos) |
| Turbo | `pnpm turbo run lint typecheck test` | 24/24 tasks |
| Testes | `pnpm turbo run test --force` | 1315 testes em 132 arquivos (base: 1276/130) |
| `packages/auth` | `pnpm --filter @repo/auth test` | 101 testes, 8 arquivos |
| i18n | `pnpm --filter @repo/internationalization test` | 27 testes, paridade verde |
| Tipos | `pnpm --filter @repo/auth typecheck` | limpo |

Nenhum teste existente foi editado, desativado ou afrouxado.

## Validação visual

Ambiente: emuladores de Auth e Firestore (`pnpm emulators` com `JAVA_HOME` apontando para o
`openjdk@21` do brew; o JDK 17 do sistema não serve para o Firestore), `pnpm seed`, e os três apps
subidos com as envs de emulação exportadas no shell. Screenshots em
[`screenshots/`](screenshots/).

**Login e navegação (`apps/app`, 3000).** Login com e-mail e senha em pt-br, en e es. A sequência de rede
é a desenhada: sem cookie, `POST /api/auth/session/refresh` responde 401 `AUTH_NO_SESSION` e o provider cai
no `sessionPOST`; a partir daí só aparece `refresh` 200. Navegar entre páginas não produziu nenhuma
gravação de cookie nova (`POST /api/auth/session` ficou parado em 4 chamadas, todas do login).

**Bootstrap de SSO (`apps/web`, 3001).** Com a sessão estabelecida na `apps/app`, abrir a `apps/web`
adotou a sessão sem redirect: `POST /api/auth/custom-token` 200 seguido de `refresh` 200. A `apps/web`
registrou **zero** chamadas a `POST /api/auth/session` — o mint redundante pós-bootstrap que o plano
previa que sumiria de fato sumiu.

**Teto absoluto.** O piso do teto é a vida do cookie, então encurtei as duas: `SESSION_COOKIE_MAX_AGE_DAYS`
e `SESSION_ABSOLUTE_MAX_AGE_DAYS` em `0.0035` (302 s, o mínimo do Firebase). O `Max-Age=302` do
`Set-Cookie` confirmou que as envs chegaram ao processo. Ciclo completo medido por HTTP:

```
t+0s    refresh -> 200 {"refreshed":false}   cookie intacto
t+160s  refresh -> 200 {"refreshed":true}    iat avança, auth_time preservado
t+321s  refresh -> 401 AUTH_SESSION_EXPIRED  cookie limpo
```

No browser, o mesmo ciclo levou à tela de login com `?redirect=%2Fpt-br%2Fentities`, o cookie foi removido
do jar e o alerta apareceu com a copy correta. Em es, lido direto do DOM:
`"Tu sesión ha expirado. Inicia sesión de nuevo para continuar."`

**Temas, viewports e idiomas.** pt-br em dark, en em light, es em mobile (390x844). O alerta e a tela de
login ficam legíveis nos três. O único aviso do overlay de dev é o `images.domains` deprecado, que já
existia antes desta tarefa.

Os screenshots `06` a `08` mostram a tela de login com o `?redirect=` já aplicado, depois do alerta ter
desaparecido; o `09` pegou o alerta ainda na tela.

**ID token inválido não derruba sessão válida.** Chamando a rota com um `idToken` falso depois do limiar,
a resposta foi 401 `AUTH_INVALID_TOKEN` e o cookie continuou no lugar, como desenhado.

## O que o emulador não consegue provar

**A revogação não é verificável neste ambiente.** Depois de `DELETE /api/auth/session`, a renovação
seguinte respondeu `{"refreshed": true}` e gravou cookie novo. Investiguei antes de tratar como bug, e a
causa é o emulador: `verifySessionCookie(cookie, true)` aceita o cookie depois de `revokeRefreshTokens`.
Probe isolado, sem passar pelo nosso código:

```
=== antes da revogação ===   verifySessionCookie(checkRevoked=true): MPPc6n7...
tokensValidAfterTime: Thu, 17 Sep 2026 20:47:30 GMT
=== depois da revogação ===  ACEITOU o cookie revogado
```

Duas consequências. A primeira: isso não é regressão desta tarefa. `getUserFromSessionCookie` faz
exatamente a mesma chamada e é o que o `apps/app/proxy.ts` usa em toda navegação autenticada, então o
logout já não interrompe navegação sob emulador hoje. A segunda: o caminho está coberto por teste
(`sessionRefreshRoute.test.ts`, "limpa o cookie de uma sessão revogada em vez de ressuscitá-la"), que
força `verifySessionCookie` a rejeitar com `auth/session-cookie-revoked` e cobra o 401 + cookie limpo.

Verificar de verdade exige projeto Firebase real. O `/test` decide se vale.

## Pendências e o que o `/review` deve olhar com desconfiança

1. **Dois alertas em vez de um.** Sob StrictMode de dev, `applySignedInUser` roda duas vezes e as duas
   chamadas recebem 401, então o toast aparece duplicado (li os dois no DOM). Em produção o StrictMode não
   duplica montagem, mas duas chamadas simultâneas produziriam dois alertas. Não bloqueia; é cosmético.

2. **`apps/web` não tem `postAuthRedirectTarget` no mesmo desenho da `apps/app`.** Validei o `?redirect=`
   apenas na `apps/app`. A `apps/web` monta o mesmo provider e o mesmo `handleSessionExpired`, mas não
   percorri o estouro do teto lá.

3. **Dívida do `exports` de `@repo/shared`.** `apps/api/proxy.ts` e `packages/auth/provider.tsx` importam
   caminhos fundos (`@repo/shared/utils/helpers/*`) que o `exports` do pacote não publica. Funciona porque
   o resolver do Next e o alias `@repo` dos apps toleram; o Vitest da `packages/auth` não. Fora do raio
   desta tarefa.

4. **`packages/auth` continua declarando `next: 15.1.3` sob monorepo em 16.** Não alinhei, por instrução
   explícita. A única API do Next tocada é `cookies()`, já `await`ada.

5. **A janela entre teto e vida do cookie é estreita por construção.** Como o teto tem piso na vida do
   cookie, quem não renovar dentro da janela perde a sessão pela expiração do cookie e recebe
   `AUTH_NO_SESSION`, não `AUTH_SESSION_EXPIRED`. Os dois levam à tela de login, mas só o segundo mostra
   mensagem. Observei os dois casos.

## Lacunas de teste para o `/test`

- Revogação de ponta a ponta (ver seção acima): precisa de Firebase real.
- Estouro do teto percorrido na `apps/web`.
- O caminho `refreshed: false` → navegação segue sem alerta com a rota devolvendo 500 ou erro de rede.
  Coberto por desenho (o `catch` devolve `"error"`), não exercitado no browser.

## Infra

Nada a provisionar. `SESSION_ABSOLUTE_MAX_AGE_DAYS` é opcional: ausente ou vazia, a feature funciona com
30 dias. O modo degradado está coberto pelos dois primeiros casos de `sessionAbsoluteCap.test.ts` e foi o
modo em que os apps subiram na validação visual antes de eu encurtar as janelas de propósito.
