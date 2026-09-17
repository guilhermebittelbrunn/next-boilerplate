# Plano — Renovação deslizante da sessão

- **Spec de origem**: [`specs/session-refresh.md`](../../../../specs/session-refresh.md)
- **Slug**: `session-refresh`
- **Rodada**: autônoma (`/cycle`). As perguntas em aberto da spec já vêm decididas — ver a seção final.
- **Contenção**: `packages/auth/session.ts`, `session-routes.ts`, `server.ts`. A spec
  [`account-security-mfa`](../../../../specs/account-security-mfa.md) declara os mesmos três arquivos e
  não pode rodar no mesmo lote.

---

# Etapa 1 — Análise

## 1. Contexto

A sessão de cada fork expira em tempo absoluto contado do login. Quem está no meio de um formulário é
derrubado igual a quem fechou o navegador há cinco dias, porque nada no repositório observa o uso.

### 1.1 O que a leitura do código mudou em relação à spec

A spec afirma que "nada renova" (`specs/session-refresh.md:52`). **Isso não é exato, e a diferença muda o
desenho.** Existe hoje uma renovação acidental:

1. `packages/auth/client.ts:196-201` — `subscribeToIdTokenState` é `onIdTokenChanged`, que dispara a cada
   refresh do ID token pelo SDK do Firebase (aproximadamente de hora em hora).
2. `packages/auth/provider.tsx:175-192` — cada disparo chama `applySignedInUser`.
3. `packages/auth/provider.tsx:146-158` — `applySignedInUser` chama `syncSessionCookie(token)` sem
   condição nenhuma.
4. `packages/auth/provider.tsx:96-115` — `syncSessionCookie` faz `POST /api/auth/session`, que cai em
   `sessionPOST` → `mintSessionCookie` → cookie regravado com vida cheia.

Ou seja: **com uma aba aberta, a sessão já desliza indefinidamente hoje**, de hora em hora, sem teto e sem
ninguém ter decidido isso. É o defeito que a spec descreve em "Riscos" (`:128-130`) — sessão que nunca
morre — já presente no repositório, como efeito colateral de um listener.

Isso reordena as prioridades do corte:

- **O teto absoluto é o item de maior valor**, e é o único item do corte que não existe de forma nenhuma.
- **O caminho de renovação explícito e o limite de frequência** têm valor por tornarem o comportamento
  nomeado, throttled e testável — não por acrescentarem uma capacidade que falta.
- **Enquanto o teto não for imposto em `mintSessionCookie`, ele é decorativo**: o cliente sempre tem um ID
  token na mão e pode chamar `POST /api/auth/session` direto, contornando qualquer rota de renovação nova.
  O ponto de imposição precisa ser o ponto de gravação, não a rota nova.

### 1.2 O detalhe do provedor que decide o desenho

`createSessionCookie` só aceita um ID token; não existe "renovar cookie a partir do cookie"
(`packages/auth/server.ts:229-237`). Então qualquer renovação passa por um ID token vindo do cliente. O
servidor sozinho não consegue estender nada.

O `auth_time` do ID token é o instante da autenticação original e **sobrevive aos refreshes do token**
feitos pelo mesmo refresh token. Ele é preservado no cookie de sessão gerado a partir dele. Logo, o teto
sai de graça na maioria dos casos: basta ler `auth_time` do que já se verifica.

**Exceto por um caminho.** `signInWithCustomToken` é uma autenticação nova, e reseta `auth_time` para o
agora. Esse caminho é justamente o bootstrap de SSO entre `apps/web` e `apps/app`
(`packages/auth/session-routes.ts:91-102` + `provider.tsx:123-144`). Sem tratamento, abrir o segundo app
reinicia a janela do teto — e o cenário é rotineiro, não adversarial. O teto ficaria deslizando junto com
a sessão, que é exatamente o defeito a evitar.

### 1.3 Corte de MVP

Item por item do corte da spec (`specs/session-refresh.md:86-101`):

| # | Item da spec | Como entra |
|---|--------------|------------|
| 1 | Caminho de renovação no mesmo pacote que monta as rotas de sessão | `sessionRefreshPOST` em `packages/auth/session-routes.ts`, montado por `apps/app` e `apps/web` em `app/api/auth/session/refresh/route.ts` |
| 2 | Renovação só depois de uma fração da vida do cookie | Throttle sobre o `iat` do cookie atual, constante `SESSION_REFRESH_AFTER_FRACTION = 0.5`. Antes do limiar responde 200 `{ refreshed: false }` sem tocar no provedor |
| 3 | Teto absoluto a partir do `auth_time`, por env com default e grampo | `SESSION_ABSOLUTE_MAX_AGE_DAYS`, default 30 dias, grampeada em `[vida do cookie, 90 dias]`. Imposta dentro de `mintSessionCookie`, não na rota |
| 4 | Renovação respeita revogação; provedor recusa → limpa o cookie | `checkRevoked: true` antes de regravar; recusa e estouro do teto chamam `clearSessionCookie()` |
| 5 | Segundo plano, sem bloquear; falhar em renovar não desloga | O `AuthProvider` dispara e ignora o resultado, salvo o estouro do teto |
| 6 | Texto novo nos 3 idiomas | `packages.auth.provider.session.expired` + `apiErrors.AUTH_SESSION_EXPIRED` |

**Um item a mais, que o corte da spec não previu e sem o qual o item 3 não funciona:** carregar o
`auth_time` original através do bootstrap de SSO (§1.2). Custa uma claim adicional no custom token e uma
leitura no `customTokenPOST`. Sem isso o teto reinicia sempre que alguém abre o segundo app.

### 1.4 Fora de escopo

O que a spec exclui (`:105-113`) fica excluído: tela de sessões ativas, rotação de refresh token,
"continuar conectado" no login, aviso de inatividade com contagem regressiva, carimbo de último acesso.

Acrescento três exclusões que a leitura do código sugeriu:

- **Não alinhar `next` em `packages/auth`.** O pacote declara `next: 15.1.3` como dependency enquanto o
  monorepo está em `16.0.0` (`packages/auth/package.json`). Está fora do raio desta tarefa — ver §7.4.
- **Não mexer no rate limit do proxy da `apps/api`** (`apps/api/proxy.ts:42-51`). As rotas de sessão vivem
  nos front-ends e o matcher do proxy da `apps/app` exclui `/api` (`apps/app/proxy.ts:108`). O limite da
  renovação é o próprio throttle — ver §6.2.
- **Não fazer o `sessionPOST` de login herdar o throttle.** Login precisa gravar sempre.

### 1.5 Apps impactados

| Alvo | O que muda |
|------|------------|
| `packages/auth` | Onde mora a feature: teto, throttle, rota de renovação, claim de origem, driver no provider |
| `apps/app` | Um arquivo de rota novo (re-export fino) + `.env.example` |
| `apps/web` | Idem |
| `packages/internationalization` | Um `apiError` + uma chave de UI, nos 3 idiomas |
| `packages/sdk` | Nenhum. A sessão é do cookie compartilhado |
| `apps/api` | Nenhum. Recebe credencial já resolvida (`apps/api/(shared)/lib/resolve-api-actor.ts:28-36`) |
| `docs` | `SETUP.md` (tabela de env), `AUTH-SSO.md` (vida útil da sessão) |

Área do painel: nenhuma — a sessão é transversal e vale nas duas. Modo de produto (`subscription` ×
`simple`): sem diferença, os dois usam o mesmo cookie. Sem dependência de assinatura. Sem serviço externo
novo.

### 1.6 Fontes

Spec lida por completo. Sem card do ClickUp, sem wiki, sem Figma, sem print. Nenhuma referência ficou
por ler.

---

## 2. Dados (Firestore)

**N/A.** Nada é persistido no Firestore. O estado da sessão vive no cookie e nas claims assinadas pelo
Firebase. Sem coleção nova, sem campo novo, sem índice, sem backfill, sem mudança em `firestore.rules`.

---

## 3. Contrato — `@repo/sdk`

**N/A.** O SDK não conhece a sessão. Nenhum DTO, nenhuma action, nenhum consumidor quebra.

---

## 4. API

### 4.1 `apps/api`

**N/A.** Nenhuma rota nova, nenhum guard alterado.

### 4.2 Rotas de sessão (`apps/app` / `apps/web`)

Rota nova: `POST /api/auth/session/refresh`, em ambos os apps, como re-export fino de
`sessionRefreshPOST` — mesmo padrão dos quatro arquivos que já existem
(`apps/app/app/api/auth/session/route.ts:1-14`).

Ordem de execução do handler, escolhida para que o caminho quente não gaste chamada ao provedor:

1. `isSameOriginRequest(request)` falso → 403 `AUTH_FORBIDDEN_ORIGIN`. Mesmo guard de CSRF do
   `sessionPOST` (`session-routes.ts:34`).
2. Corpo sem `idToken` string → 400 `AUTH_MISSING_TOKEN`. Reaproveita `extractIdToken`
   (`session-routes.ts:20-30`).
3. Sem cookie → 401 `AUTH_NO_SESSION`. Renovação exige sessão; estabelecer sessão é do `sessionPOST`.
4. `decodeSessionCookie(cookie)` — `verifySessionCookie(cookie, false)`, criptografia local, sem rede.
   Inválido/expirado → limpa o cookie e 401 `AUTH_NO_SESSION`.
5. Throttle: `shouldRefreshSession(decoded.iat)` falso → 200 `{ refreshed: false }`. Sai aqui sem
   nenhuma chamada ao Firebase.
6. `getSessionFromCookie(cookie)` — a verificação com `checkRevoked: true` que a spec exige (`:96-98`).
   Null → limpa o cookie e 401 `AUTH_NO_SESSION`.
7. `mintSessionCookie(idToken)`. Estouro do teto → limpa o cookie e 401 `AUTH_SESSION_EXPIRED`. ID token
   inválido → 401 `AUTH_INVALID_TOKEN` (sem limpar: o cookie ainda é válido, quem está errado é o token).
8. 200 `{ refreshed: true }`.

### 4.3 Erros

| `error.code` | Status | Quando | Já existe? |
|--------------|--------|--------|------------|
| `AUTH_FORBIDDEN_ORIGIN` | 403 | `Origin` cruzada na renovação | Sim |
| `AUTH_MISSING_TOKEN` | 400 | Corpo sem `idToken` | Sim |
| `AUTH_NO_SESSION` | 401 | Sem cookie, cookie inválido ou revogado | Sim |
| `AUTH_INVALID_TOKEN` | 401 | ID token recusado ao regravar | Sim |
| `AUTH_SESSION_EXPIRED` | 401 | Teto absoluto estourado | **Não** — entrada nova em `apiErrors` nos 3 idiomas |

Um código novo, de propósito. `AUTH_NO_SESSION` já cobre ausente e revogado, e o cliente trata os dois do
mesmo jeito. O teto precisa ser distinguível porque é a única recusa que produz mensagem na tela.

O teste de paridade (`packages/internationalization/__tests__/parity.test.ts:55-60`) falha se o código novo
não entrar nos três idiomas.

---

## 5. Front-end

### 5.1 Onde a mudança entra

Nenhuma página nova, nenhuma rota de UI, nenhuma tabela, nenhum formulário. A mudança de front é toda
dentro de `packages/auth/provider.tsx`, que `apps/app` e `apps/web` montam
(`apps/web/app/[locale]/layout.tsx:35`).

### 5.2 Driver da renovação

O listener de token já existe e já dispara de hora em hora (§1.1). Em vez de acrescentar um poller,
**aponto o que já dispara para a rota certa**:

- `applySignedInUser` passa a chamar `POST /api/auth/session/refresh`.
- Quando ela responde `AUTH_NO_SESSION` (cliente autenticado, cookie já expirado), cai no
  `syncSessionCookie(token)` de hoje, que estabelece a sessão pelo `sessionPOST`. Uma chamada extra só
  nesse caminho frio.
- `onAuthSuccess` (login explícito) continua chamando `syncSessionCookie` direto. Login grava sempre.
- `signOut` fica intacto.

Efeito colateral bom: o mint redundante que hoje acontece logo depois do login e logo depois do bootstrap
de SSO some, porque o throttle recusa.

Alternativa descartada: `setInterval` + `visibilitychange`. Acrescenta um timer, um guard de frequência do
lado do cliente e um caminho de disparo a mais, para cobrir uma janela que o `onIdTokenChanged` já cobre.

### 5.3 Estouro do teto

Quando a renovação responde 401 `AUTH_SESSION_EXPIRED`, o servidor já limpou o cookie. O cliente então:

1. `logout()` de `@repo/auth/client` — `signOut` local do Firebase, sem `DELETE /api/auth/session`
   (chamar o DELETE revogaria os refresh tokens, e o cookie já foi limpo).
2. `errorAlert(authProvider.session.expired)` com a chave nova.
3. `router.push('/{locale}/sign-in?redirect={pathname}')`.

O push é para rota não autenticada, e o cookie já não existe, então não há laço com o proxy — a
armadilha registrada em `apps/app/CLAUDE.md` vale para push em rota autenticada. `/{locale}/sign-in` é
caminho válido nos dois apps (`apps/app/app/[locale]/(unauthenticated)/sign-in`,
`apps/web/app/[locale]/sign-in`: o grupo de rota não entra na URL).

**Conferido, como a spec pediu (`:161-163`):** o destino sobrevive como caminho, não como URL
completa. `postAuthRedirectTarget` lê o parâmetro `redirect` e `apps/app/proxy.ts:199-201` zera a search
antes de redirecionar. Quem for derrubado em `/entities?search=foo` volta para `/entities`. Aceito no
corte; registrado nas perguntas em aberto.

### 5.4 Demais estados

Falha de rede, 403, 400 ou 500 na renovação: engolidos, sem alerta e sem deslogar
(`specs/session-refresh.md:99-100`). `{ refreshed: false }` é sucesso silencioso.

---

## 6. Autorização e segurança

### 6.1 O que a renovação não pode afrouxar

- **`checkRevoked` continua** (passo 6 da §4.2). Conta desabilitada, conta excluída e
  `DELETE /api/auth/session` interrompem a renovação, e o cookie é limpo em vez de ficar apontando para
  nada.
- **Guard de CSRF igual ao do `sessionPOST`.** A rota grava cookie; sem o `isSameOriginRequest` seria
  uma gravação disparável de outra origem.
- **ID token emitido antes da revogação sobrevive até uma hora.** Limite do provedor
  (`packages/auth/server.ts:147-152`). A renovação não piora e não resolve. `isMintedBeforeRevocation`
  não se aplica aqui porque quem manda é `verifySessionCookie(cookie, true)`.

### 6.2 Limite de frequência, sem Arcjet

As rotas de sessão estão fora do rate limit do proxy da `apps/api` (`apps/api/proxy.ts:42-51`) e fora do
proxy da `apps/app`, cujo matcher exclui `/api` (`apps/app/proxy.ts:108`). A spec registra isso como risco
(`:131-134`).

A resposta é a **ordem dos passos**, não um mecanismo novo. Um chamador que martele a rota com um cookie
válido para no passo 5 — criptografia local, sem rede, sem gravação. Quando passa do limiar, a renovação
regrava o cookie e o `iat` novo joga ele de volta para o passo 5. O resultado é, no máximo, uma operação
cara por `vida do cookie × 0.5` por sessão. Cookie ou origem inválidos param nos passos 1 a 4, também sem
rede.

Alternativa descartada: importar `checkRateLimit` de `@repo/security`
(`packages/security/index.ts:39-64`). Exige declarar `@repo/security` como dependency de `packages/auth`,
depende de `ARCJET_KEY` (que degrada para no-op sem a chave, `:42-44`) e limita por IP, o que é a
característica errada para uma rota por sessão.

### 6.3 Impersonação

Sem interação. A personificação vive em cookies próprios (`bp:panel-request-role`,
`bp:impersonate-firebase-uid`) e em headers do `apiClient`; o cookie de sessão continua sendo o do admin
autenticado. Renovar não troca de sujeito.

### 6.4 Superfície de dado

A resposta é `{ refreshed: boolean }` ou `{ error: { code } }`. Nenhum uid, e-mail, claim ou instante de
autenticação sai para o cliente.

---

## 7. Riscos e pontos de atenção para o `/develop`

### 7.1 A claim precisa sobreviver ao `createSessionCookie` — verificar antes de confiar

O desenho carrega o `auth_time` original pelo bootstrap de SSO como claim adicional no custom token
(`createCustomToken(uid, { sessionAuthTime })`, `packages/auth/server.ts:212-223`). Isso pressupõe que:

1. `signInWithCustomToken` coloca a claim adicional no ID token resultante; e
2. `createSessionCookie` preserva as claims do ID token no cookie.

A documentação do Firebase diz que o cookie de sessão carrega as mesmas claims do ID token, mas **não
verifiquei isso executando**. O `/develop` verifica com o emulador de Auth antes de seguir.

**Se não sobreviver**, o fallback já está decidido, não é pergunta: mantenha só a recusa em
`customTokenPOST` (bootstrap de SSO com o teto já estourado é recusado com 401 `AUTH_SESSION_EXPIRED`) e
registre no handoff que um bootstrap legítimo dentro da janela reinicia a contagem. O teto continua
existindo, com uma folga conhecida, em vez de virar um mecanismo que não funciona sem ninguém perceber.

`sessionAuthTime` não colide com claim reservada do Firebase (`auth_time`, `iat`, `exp`, `sub`,
`firebase`, `aud`, `iss` e as demais da lista).

### 7.2 O teto precisa ser imposto em `mintSessionCookie`, não na rota

Se ficar só na rota de renovação, o `provider.tsx` contorna sem querer: basta o `syncSessionCookie` cair
no `sessionPOST` (o que ele faz hoje a cada hora). O ponto de imposição é o ponto de gravação, e ele é
único no repositório (`session.ts:80-89`, com um chamador só — confirmado pela spec e pelo `grep`).

### 7.3 Não quebrar o contorno de assinatura do `getUserFromSessionCookie`

São seis chamadores em produção: `session-routes.ts:76,93`, `server.ts:288`, `apps/app/proxy.ts:180`,
`apps/api/(shared)/lib/resolve-api-actor.ts:28,36`. Além deles, quatro arquivos de teste que fazem
`vi.mock` do símbolo. O plano acrescenta `getSessionFromCookie` (devolve `{ user, decoded }`) e deixa
`getUserFromSessionCookie` como wrapper de uma linha. Nenhum chamador muda, nenhum mock quebra.

Isso também fecha o descarte que a spec aponta (`server.ts:257`, `specs/session-refresh.md:47-49`): as
claims deixam de ser jogadas fora, e quem precisa delas passa a ter por onde pedir.

### 7.4 `next` 15.1.3 em `packages/auth`, executado sob o 16

Medido nesta rodada: `packages/auth/package.json` declara `next: 15.1.3` como dependency, instala a
própria cópia em `packages/auth/node_modules/next` e typecheca contra os tipos do Next 15, enquanto os
apps rodam o 16. **Não alinhar a major** — está fora do raio da tarefa.

Avaliação do risco concreto para este plano: **baixo, e nomeado**. A única API do Next tocada é
`cookies()` de `next/headers`, já usada e já `await`ada (`session.ts:83,93,99`) — a forma assíncrona é a
mesma nas duas majors. As assinaturas novas (`sessionRefreshPOST(request: Request)`, respostas com
`Response.json`) são Web API global, não tipo do Next. Nenhum `NextRequest`/`NextResponse`, nenhum
`RouteContext`, nenhuma API de proxy.

Onde isso poderia morder e não morde: os arquivos de rota novos em `apps/app`/`apps/web` são typechecados
pelo workspace do app, com os tipos do Next 16, e são re-exports finos de uma função que recebe `Request`.

### 7.5 Compor as duas janelas

O cookie do Firebase vale no máximo 14 dias (`session.ts:23`) e o default do repo é 5
(`session.ts:24`). O teto de 30 dias é maior que qualquer cookie possível. A composição:

- O cookie vive `SESSION_COOKIE_MAX_AGE_DAYS` (default 5 dias).
- Passada metade dele, a próxima renovação regrava um cookie novo com a vida cheia.
- A renovação é recusada quando `agora - auth_time > SESSION_ABSOLUTE_MAX_AGE_DAYS`, e nesse momento o
  cookie é limpo.

Então a sessão sobrevive até 30 dias de uso continuado, em incrementos de 5 dias, e morre na hora em
que o teto é atingido — não até 30 + 5. Quem parar de usar por mais de 5 dias perde a sessão pela
expiração do cookie, como hoje.

---

## 8. Testes

Todos em `packages/auth/__tests__/`, ambiente `node` (`packages/auth/vitest.config.mts`), no padrão de
`serverSessionRevocation.test.ts` (`vi.hoisted` + `vi.mock` de `server-only`, `../keys`,
`firebase-admin/*`, `next/headers`). Nenhum precisa de processo externo: o objeto do teste é a lógica de
janela e o contrato dos handlers, não a infra.

### 8.1 `sessionAbsoluteCap.test.ts` — unit sobre `session.ts`

| Caso | Esperado |
|------|----------|
| `SESSION_ABSOLUTE_MAX_AGE_DAYS` ausente | 30 dias |
| `SESSION_ABSOLUTE_MAX_AGE_DAYS=""` | 30 dias (string vazia é ausência — política do `/cycle`) |
| `"abc"`, `"0"`, `"-3"` | 30 dias |
| `"400"` | grampeado em 90 dias |
| `"1"` com cookie de 5 dias | grampeado para 5 dias (piso = vida do cookie) |
| `resolveSessionOriginSeconds` com `sessionAuthTime` numérico | devolve `sessionAuthTime` |
| idem com `sessionAuthTime` string ou `NaN` | ignora, cai em `auth_time` |
| idem sem nenhum dos dois | `null` |
| `shouldRefreshSession` com `iat` de agora | `false` |
| `iat` além da metade da vida do cookie | `true` |
| `iat` exatamente no limiar | `true` (comparação `>=`, igual ao `isMintedBeforeRevocation` de `server.ts:162-165`) |
| `mintSessionCookie` com ID token de `auth_time` dentro do teto | grava; `cookieStore.set` chamado com as opções de `getSessionCookieOptions` |
| `mintSessionCookie` com `auth_time` além do teto | `{ ok: false, reason: "absolute-cap" }`, **sem** `cookieStore.set` |
| `mintSessionCookie` com ID token recusado | `{ ok: false, reason: "invalid-token" }` |

### 8.2 `sessionRefreshRoute.test.ts` — handler

| Caso | Esperado |
|------|----------|
| `Origin` cruzada | 403 `AUTH_FORBIDDEN_ORIGIN`, nenhuma chamada ao Firebase |
| Corpo não-JSON / sem `idToken` | 400 `AUTH_MISSING_TOKEN` |
| Sem cookie | 401 `AUTH_NO_SESSION` |
| Cookie que não verifica | 401 `AUTH_NO_SESSION` + cookie limpo |
| Cookie recém-emitido | 200 `{ refreshed: false }`, `verifySessionCookie` **nunca** chamado com `true`, `createSessionCookie` não chamado |
| Cookie passado do limiar, sessão válida | 200 `{ refreshed: true }`, `verifySessionCookie(cookie, true)` chamado, cookie regravado |
| Cookie passado do limiar, sessão revogada | 401 `AUTH_NO_SESSION` + cookie limpo, `createSessionCookie` não chamado |
| Cookie passado do limiar, teto estourado | 401 `AUTH_SESSION_EXPIRED` + cookie limpo |
| Teto estourado direto no `sessionPOST` | 401 `AUTH_SESSION_EXPIRED` + cookie limpo (o contorno da §7.2) |
| `customTokenPOST` dentro do teto | 200 com token; `createCustomToken` recebeu `{ sessionAuthTime: <origem> }` |
| `customTokenPOST` com teto estourado | 401 `AUTH_SESSION_EXPIRED`, `createCustomToken` não chamado |

### 8.3 Modo degradado (política do `/cycle`)

Sem `SESSION_ABSOLUTE_MAX_AGE_DAYS` no ambiente a app sobe, o build passa, a renovação funciona com 30
dias e nenhuma rota responde 500. Coberto pelos dois primeiros casos da §8.1 e pelo caminho feliz da §8.2.

### 8.4 Regressão a vigiar

`packages/auth/__tests__/serverSessionRevocation.test.ts` exercita `getUserFromSessionCookie`. Com o
wrapper da §7.3 ele tem de continuar passando sem edição — é a prova de que a assinatura não mudou.
`apps/app/__tests__/proxy.test.ts`, `securityHeaders.test.ts` e `securityPolicySources.test.ts` mockam o
mesmo símbolo e também não devem precisar de ajuste.

### 8.5 Gates

Linha de base medida nesta rodada: `pnpm check` 601 arquivos 0 erros ·
`pnpm turbo run lint typecheck test` 24/24 tasks · 1276 testes em 130 arquivos. O `/develop` roda a mesma
linha e compara.

---

## 9. Validação visual (`agent-browser`)

A feature quase não tem superfície visual. O que precisa de olho:

1. **Login normal, nas duas apps.** Sessão estabelecida, sem alerta espúrio, sem chamada extra visível na
   aba de rede. Regressão mais provável de todo o plano.
2. **Bootstrap de SSO.** Logar na `apps/app` (3000), abrir a `apps/web` (3001) e confirmar que a sessão é
   adotada sem redirect — o comportamento descrito em `docs/AUTH-SSO.md:23`.
3. **Estouro do teto.** Com `SESSION_ABSOLUTE_MAX_AGE_DAYS` baixo (a env aceita fração: `0.0007` ≈ um
   minuto) para provocar a recusa sem esperar 30 dias: alerta de sessão encerrada e ida para o sign-in com
   `?redirect=` apontando para a página de origem. Light, dark e mobile — é o único alerta novo.
4. **Logout ainda derruba os dois apps.** `DELETE /api/auth/session` revoga e a renovação não ressuscita a
   sessão encerrada (`specs/session-refresh.md:147`).

Screenshots de cada um. Comandos do `agent-browser` **em sequência** — chamadas concorrentes travam o
daemon e o screenshot sai da aba errada.

---

## 10. Pré-requisitos manuais de infra

**Um, e ele não bloqueia nada.**

- [ ] `SESSION_ABSOLUTE_MAX_AGE_DAYS` no ambiente de produção (Vercel), em `app` e `web`, **se** o fork
      quiser um teto diferente de 30 dias. Ausente, a feature funciona com o default.

Não há rules a publicar, índice a criar, webhook a cadastrar, serviço a ativar nem chave a provisionar.
A feature não fala com nenhum provedor além do Firebase Auth, que já está configurado.

**Para o `/test`:** nenhum critério desta feature depende de infra externa. Se algum critério não puder ser
verificado, não é por falta de provisionamento.

**Rollback**: reverter os commits basta. Nada é gravado em lugar nenhum; cookies existentes continuam
válidos até expirarem e passam a ser avaliados pelas regras novas na renovação seguinte.

**O que um fork precisa fazer para usar**: nada. A feature é ligada por default. Quem quiser desligar o
teto na prática põe `SESSION_ABSOLUTE_MAX_AGE_DAYS="90"`, o máximo do grampo. Não existe forma de
configurar sessão infinita — que é o ponto do grampo.

---

# Etapa 2 — Blueprint técnico

## B1. `packages/auth/session.ts`

```ts
/** Claim que carrega o instante da autenticação original através do bootstrap de SSO. */
export const SESSION_ORIGIN_CLAIM = "sessionAuthTime";

const DEFAULT_ABSOLUTE_MAX_AGE_DAYS = 30;
const MAX_ABSOLUTE_MAX_AGE_DAYS = 90;
const REFRESH_AFTER_FRACTION = 0.5;

/**
 * Teto absoluto em ms, de `SESSION_ABSOLUTE_MAX_AGE_DAYS`. O piso é a vida do cookie: um teto
 * menor que ela só produziria cookies válidos que a renovação recusa.
 */
export function getSessionAbsoluteMaxAgeMs(): number {
    // `||`, não `??`: `.env.example` publica a variável como `""`, e vazio é ausência.
    const days = Number(process.env.SESSION_ABSOLUTE_MAX_AGE_DAYS || undefined);
    const requested =
        Number.isFinite(days) && days > 0
            ? days * MS_PER_DAY
            : DEFAULT_ABSOLUTE_MAX_AGE_DAYS * MS_PER_DAY;
    return Math.min(
        Math.max(requested, getSessionExpiresMs()),
        MAX_ABSOLUTE_MAX_AGE_DAYS * MS_PER_DAY
    );
}

/** Instante da autenticação que originou a sessão, em segundos. */
export function resolveSessionOriginSeconds(
    claims: Record<string, unknown>
): number | null {
    const carried = claims[SESSION_ORIGIN_CLAIM];
    if (typeof carried === "number" && Number.isFinite(carried)) {
        return carried;
    }
    const authTime = claims.auth_time;
    return typeof authTime === "number" && Number.isFinite(authTime)
        ? authTime
        : null;
}

export function isWithinAbsoluteCap(originSeconds: number | null): boolean {
    if (originSeconds === null) {
        return true; // sem origem legível, o cookie ainda governa — não inventa recusa
    }
    return (
        Date.now() - originSeconds * MS_PER_SECOND < getSessionAbsoluteMaxAgeMs()
    );
}

/** Regravar antes do limiar é escrita de cookie e chamada ao provedor sem ganho. */
export function shouldRefreshSession(issuedAtSeconds: number): boolean {
    const age = Date.now() - issuedAtSeconds * MS_PER_SECOND;
    return age >= getSessionExpiresMs() * REFRESH_AFTER_FRACTION;
}

export type MintSessionResult =
    | { ok: true }
    | { ok: false; reason: "invalid-token" | "absolute-cap" };

export async function mintSessionCookie(
    idToken: string
): Promise<MintSessionResult> {
    const claims = await verifyIdTokenClaims(idToken);
    if (!claims) {
        return { ok: false, reason: "invalid-token" };
    }
    if (!isWithinAbsoluteCap(resolveSessionOriginSeconds(claims))) {
        return { ok: false, reason: "absolute-cap" };
    }

    const expiresMs = getSessionExpiresMs();
    const sessionCookie = await createSessionCookie(idToken, expiresMs);
    const cookieStore = await cookies();
    cookieStore.set(
        SESSION_COOKIE_NAME,
        sessionCookie,
        getSessionCookieOptions(Math.floor(expiresMs / MS_PER_SECOND))
    );
    return { ok: true };
}
```

`mintSessionCookie` deixa de lançar e passa a devolver resultado — é o padrão de união discriminada que a
borda da API já usa (`parseCreateX`/`parseUpdateX`). O único chamador de hoje é `sessionPOST`.

`verifyIdTokenClaims` custa criptografia local com as chaves públicas em cache; login não é caminho quente.

## B2. `packages/auth/server.ts`

```ts
/** Claims do ID token, ou null em qualquer motivo benigno de "sem sessão". */
export const verifyIdTokenClaims = async (
    idToken: string
): Promise<DecodedIdToken | null> => { /* verifyIdToken + benignIdTokenVerifyCodes */ };

/** Claims do cookie sem consultar o provedor: decide se vale a pena renovar. */
export const decodeSessionCookie = async (
    sessionCookie: string | null
): Promise<DecodedIdToken | null> => { /* verifySessionCookie(cookie, false) */ };

/**
 * Usuário + claims do cookie, verificado com `checkRevoked: true`.
 * `getUserFromSessionCookie` passa a ser o wrapper que devolve só o usuário.
 */
export const getSessionFromCookie = async (
    sessionCookie: string | null
): Promise<{ user: UserRecord; decoded: DecodedIdToken } | null> => { … };

export const getUserFromSessionCookie = async (sessionCookie: string | null) =>
    (await getSessionFromCookie(sessionCookie))?.user ?? null;
```

Os dois conjuntos de códigos benignos já existem (`server.ts:117-131`) e são reaproveitados como estão.

## B3. `packages/auth/session-routes.ts`

```ts
/** POST /api/auth/session/refresh — estende a sessão a partir de um cookie válido. */
export async function sessionRefreshPOST(request: Request): Promise<Response> {
    if (!isSameOriginRequest(request)) {
        return jsonError("AUTH_FORBIDDEN_ORIGIN", 403);
    }

    const idToken = extractIdToken(await readJson(request));
    if (!idToken) {
        return jsonError("AUTH_MISSING_TOKEN", 400);
    }

    const current = await readSessionCookie();
    if (!current) {
        return jsonError("AUTH_NO_SESSION", 401);
    }

    const claims = await decodeSessionCookie(current);
    if (!claims) {
        await clearSessionCookie();
        return jsonError("AUTH_NO_SESSION", 401);
    }

    if (!shouldRefreshSession(claims.iat)) {
        return Response.json({ refreshed: false });
    }

    // Só daqui para baixo custa chamada ao provedor.
    if (!(await getSessionFromCookie(current))) {
        await clearSessionCookie();
        return jsonError("AUTH_NO_SESSION", 401);
    }

    const minted = await mintSessionCookie(idToken);
    if (!minted.ok) {
        if (minted.reason === "absolute-cap") {
            await clearSessionCookie();
            return jsonError("AUTH_SESSION_EXPIRED", 401);
        }
        return jsonError("AUTH_INVALID_TOKEN", 401);
    }

    return Response.json({ refreshed: true });
}
```

Pseudo-diff do `sessionPOST` (`session-routes.ts:59-69`):

```diff
-    try {
-        await mintSessionCookie(idToken);
-    } catch {
-        return Response.json({ error: { code: "AUTH_INVALID_TOKEN" } }, { status: 401 });
-    }
+    const minted = await mintSessionCookie(idToken);
+    if (!minted.ok) {
+        if (minted.reason === "absolute-cap") {
+            await clearSessionCookie();
+            return jsonError("AUTH_SESSION_EXPIRED", 401);
+        }
+        return jsonError("AUTH_INVALID_TOKEN", 401);
+    }
```

Pseudo-diff do `customTokenPOST` (`session-routes.ts:91-102`) — é o que carrega a origem através do SSO:

```diff
-    const user = await getUserFromSessionCookie(sessionCookie);
-    if (!user) {
+    const session = await getSessionFromCookie(sessionCookie);
+    if (!session) {
         return jsonError("AUTH_NO_SESSION", 401);
     }
-    const token = await createCustomToken(user.uid);
+    const origin = resolveSessionOriginSeconds(session.decoded);
+    if (!isWithinAbsoluteCap(origin)) {
+        await clearSessionCookie();
+        return jsonError("AUTH_SESSION_EXPIRED", 401);
+    }
+    // signInWithCustomToken é autenticação nova e reescreve `auth_time`; sem carregar a
+    // origem, abrir o segundo app reiniciaria o teto da sessão.
+    const token = await createCustomToken(user.uid, origin === null ? undefined : { [SESSION_ORIGIN_CLAIM]: origin });
     return Response.json({ token });
```

## B4. Requisição e resposta

```http
POST /api/auth/session/refresh
Content-Type: application/json
Cookie: access-token=<session cookie>

{ "idToken": "eyJhbGciOi..." }
```

| Situação | Status | Corpo |
|----------|--------|-------|
| Renovado | 200 | `{ "refreshed": true }` |
| Ainda cedo | 200 | `{ "refreshed": false }` |
| Origem cruzada | 403 | `{ "error": { "code": "AUTH_FORBIDDEN_ORIGIN" } }` |
| Sem `idToken` | 400 | `{ "error": { "code": "AUTH_MISSING_TOKEN" } }` |
| Sem cookie / inválido / revogado | 401 | `{ "error": { "code": "AUTH_NO_SESSION" } }` |
| ID token recusado | 401 | `{ "error": { "code": "AUTH_INVALID_TOKEN" } }` |
| Teto estourado | 401 | `{ "error": { "code": "AUTH_SESSION_EXPIRED" } }` |

## B5. Arquivos de rota

`apps/app/app/api/auth/session/refresh/route.ts` e `apps/web/app/api/auth/session/refresh/route.ts`,
idênticos ao padrão de `apps/app/app/api/auth/session/route.ts:1-14`:

```ts
import { sessionRefreshPOST } from "@repo/auth/session-routes";

export function POST(request: Request) {
    return sessionRefreshPOST(request);
}
```

## B6. `packages/auth/provider.tsx`

```ts
type RefreshOutcome = "refreshed" | "skipped" | "no-session" | "expired" | "error";

const refreshSessionCookie = useCallback(
    async (idToken: string): Promise<RefreshOutcome> => { … },
    []
);

const handleSessionExpired = useCallback(async () => {
    await logout();
    errorAlert(authProvider.session.expired);
    const destination =
        typeof window !== "undefined" ? window.location.pathname : `/${locale}`;
    router.push(
        `/${locale}/sign-in?redirect=${encodeURIComponent(destination)}`
    );
}, [errorAlert, locale, router, authProvider]);
```

```diff
 const applySignedInUser = useCallback(async (firebaseUser: User) => {
     bootstrapAttemptedRef.current = true;
     try {
         const token = await firebaseUser.getIdToken();
         setAccessToken(token);
-        await syncSessionCookie(token);
+        const outcome = await refreshSessionCookie(token);
+        if (outcome === "no-session") {
+            await syncSessionCookie(token);
+        } else if (outcome === "expired") {
+            await handleSessionExpired();
+        }
     } catch {
         setAccessToken(null);
     }
-}, [syncSessionCookie]);
+}, [syncSessionCookie, refreshSessionCookie, handleSessionExpired]);
```

`onAuthSuccess` e `signOutMutation` ficam como estão.

## B7. i18n

`packages/internationalization/translations/packages/auth/index.ts`, dentro de `provider`, nos 3 idiomas:

```
provider.session.expired
  pt-br: "Sua sessão expirou. Entre novamente para continuar."
  en:    "Your session has expired. Sign in again to continue."
  es:    "Tu sesión ha expirado. Inicia sesión de nuevo para continuar."
```

`packages/internationalization/translations/packages/shared/utils.ts`, em `apiErrors`, ao lado de
`AUTH_NO_SESSION` (`:27`, `:109`, `:189`):

```
AUTH_SESSION_EXPIRED
  pt-br: "Sua sessão atingiu o tempo máximo. Entre novamente."
  en:    "Your session reached its maximum lifetime. Sign in again."
  es:    "Tu sesión alcanzó el tiempo máximo. Inicia sesión de nuevo."
```

## B8. Env e documentação

`apps/app/.env.example` (depois de `:36`) e `apps/web/.env.example` (depois de `:32`):

```bash
# Teto absoluto da sessão, em dias, contado da autenticação original: a renovação
# nunca estende além dele. Default 30, grampeado entre a vida do cookie e 90 dias.
SESSION_ABSOLUTE_MAX_AGE_DAYS=""
```

Sem entrada em `apps/*/env.ts`: `SESSION_COOKIE_DOMAIN` e `SESSION_COOKIE_MAX_AGE_DAYS` também são lidas
por `process.env` dentro do pacote (`session.ts:30,49`), e a variável nova segue o mesmo caminho.

`docs/SETUP.md` — uma linha na tabela "Modo de produto e sessão" (`:81-82`).
`docs/AUTH-SSO.md` — acrescentar a renovação e o teto ao parágrafo de vida útil (`:30`).

## B9. Ordem de implementação

1. `packages/auth/server.ts` — `verifyIdTokenClaims`, `decodeSessionCookie`, `getSessionFromCookie`,
   wrapper.
2. `packages/auth/session.ts` — teto, throttle, claim de origem, `mintSessionCookie` com resultado.
3. `packages/auth/session-routes.ts` — `sessionRefreshPOST`, `sessionPOST`, `customTokenPOST`.
4. `apps/app` + `apps/web` — arquivos de rota e `.env.example`.
5. `packages/auth/provider.tsx` — driver e tratamento do estouro.
6. `packages/internationalization` — `apiErrors` + chave de UI.
7. `docs/SETUP.md`, `docs/AUTH-SSO.md`.
8. Testes (§8), acompanhando o passo que cobrem.

A ordem canônica do repo é SDK → API → app/web → i18n. Aqui o SDK e a `apps/api` não entram, então a
cadeia começa em `packages/auth` — servidor antes de rota antes de cliente, que é a mesma lógica de
dependência.

## B10. Plano de commits sugerido

Proposta para o `/review`, que é quem decide:

1. `feat(auth): expose session cookie claims and id token claims`
2. `feat(auth): cap session renewal at an absolute lifetime from the original sign-in`
3. `feat(auth): add the throttled session refresh route`
4. `feat(auth): carry the original auth time through the cross-app custom token`
5. `feat(app): mount the session refresh route`
6. `feat(web): mount the session refresh route`
7. `feat(auth): renew the session cookie from the id token listener`
8. `feat(internationalization): add the expired session copy`
9. `docs: document the absolute session lifetime`
10. `docs(features): session-refresh`

---

# Critérios de aceite

Semente para o `/test`, que produz a versão final no formato §9.1 do guia.

- [ ] **A sessão em uso atravessa o prazo antigo de expiração**
  Com `SESSION_COOKIE_MAX_AGE_DAYS` curto e a aba aberta, o cookie é regravado depois de metade da vida e
  quem está usando não é derrubado no prazo antigo. Antes da mudança o cookie também era regravado, mas por
  acidente do listener de token e sem teto; agora a regravação passa pela rota nomeada e pelo throttle.

- [ ] **A renovação não dispara em toda navegação**
  Com o cookie recém-emitido, `POST /api/auth/session/refresh` responde 200 `{ refreshed: false }` sem
  chamar `verifySessionCookie(cookie, true)` nem `createSessionCookie`. Navegar por várias páginas não
  produz gravação de cookie nem chamada ao provedor.

- [ ] **O teto absoluto derruba quem está ativo**
  Com `SESSION_ABSOLUTE_MAX_AGE_DAYS` baixo o bastante para estourar durante o teste, a renovação responde
  401 `AUTH_SESSION_EXPIRED`, o cookie é limpo e a pessoa vai para o sign-in com `?redirect=` apontando
  para a página onde estava. O caminho é preservado; a query string da página de destino não.

- [ ] **O teto não é contornável pelo `sessionPOST`**
  Chamar `POST /api/auth/session` direto com um ID token cujo `auth_time` já passou do teto responde 401
  `AUTH_SESSION_EXPIRED` e limpa o cookie, em vez de gravar um cookie novo.

- [ ] **O bootstrap de SSO não reinicia o teto**
  Autenticar na `apps/app`, abrir a `apps/web` e conferir que o teto continua contando do login original —
  ou, se a claim não sobreviver ao `createSessionCookie` (§7.1), que o desvio está registrado no handoff e
  que o bootstrap com o teto já estourado é recusado com 401 `AUTH_SESSION_EXPIRED`.

- [ ] **A renovação respeita a revogação**
  Depois de `DELETE /api/auth/session` em um dos apps, a renovação no outro responde 401 `AUTH_NO_SESSION`
  e limpa o cookie, em vez de ressuscitar a sessão. Conta desabilitada pelo admin produz o mesmo resultado.

- [ ] **Falhar em renovar não desloga ninguém**
  Com a rota respondendo erro de rede, 403 ou 500, a navegação continua e nenhum alerta aparece. Só o 401
  `AUTH_SESSION_EXPIRED` produz mensagem e saída.

- [ ] **A rota rejeita origem cruzada e corpo inválido**
  `Origin` de outro host → 403 `AUTH_FORBIDDEN_ORIGIN` sem tocar no cookie. Corpo não-JSON ou sem `idToken`
  string → 400 `AUTH_MISSING_TOKEN`. Nenhum dos dois chama o Firebase.

- [ ] **Modo degradado sem a variável**
  Sem `SESSION_ABSOLUTE_MAX_AGE_DAYS` no ambiente, e com ela como `""`, a app sobe, o build passa, a
  renovação funciona com 30 dias e nenhuma rota responde 500.

- [ ] **Valores-limite da variável**
  `"0"`, `"-1"`, `"abc"` → 30 dias. `"400"` → 90 dias. `"1"` com cookie de 5 dias → 5 dias.

- [ ] **Login e SSO continuam funcionando**
  Login com e-mail e senha e login com Google nas duas apps; bootstrap de SSO ao abrir a segunda sem
  redirect; logout derrubando as duas. É o raio de regressão do plano.

- [ ] **A mensagem de sessão encerrada existe nos 3 idiomas**
  `packages.auth.provider.session.expired` e `apiErrors.AUTH_SESSION_EXPIRED` presentes em pt-br, en e es,
  com `pnpm --filter @repo/internationalization test` verde. O alerta é legível em light, dark e mobile.

---

# Perguntas em aberto

Rodada autônoma: todas já vêm decididas. Cada uma traz a alternativa descartada.

### As três da spec, adotadas como recomendado

1. **Teto absoluto padrão** → **30 dias**, configurável por `SESSION_ABSOLUTE_MAX_AGE_DAYS`, grampeado em
   `[vida do cookie, 90 dias]`. A spec já registra que o 30 é ponto de partida, não padrão de indústria
   (`specs/session-refresh.md:153-156`) — não inventei fonte para ele. O grampo de 90 é meu: a spec pede
   "grampeada num máximo" sem dizer qual, e 90 é o maior número que ainda deixa a sessão morrer dentro de
   um trimestre. Descartado: sem teto superior, porque um fork configuraria sessão eterna por descuido, que
   é o defeito que a spec manda evitar.

2. **Renovação silenciosa** → sim. Nenhum aviso quando dá certo, nem quando o throttle recusa. Só o estouro
   do teto fala com o usuário. Descartado: indicador de sessão estendida, que é ruído numa tela onde a
   pessoa está fazendo outra coisa.

3. **Estouro do teto** → login preservando o destino. O cliente faz `signOut` local, mostra a mensagem e
   empurra para `/{locale}/sign-in?redirect={pathname}`. **Conferido, não presumido:** o caminho sobrevive,
   a query string da página de destino não — `apps/app/proxy.ts:199-201` zera a search antes de redirecionar
   para o alvo. Aceito no corte; consertar isso é mexer no contrato de redirect do proxy, que é outra
   tarefa.

### Decididas pelo menor raio de impacto

4. **Onde impor o teto: na rota de renovação ou em `mintSessionCookie`?** → **em `mintSessionCookie`**.
   Só na rota, o teto é decorativo: o `provider.tsx` já chama `POST /api/auth/session` a cada refresh de
   token (`provider.tsx:146-158`) e passaria por cima. O ponto de gravação é único
   (`session.ts:80-89`), o que torna essa a imposição mais barata e a mais difícil de contornar.

5. **Carregar o `auth_time` original pelo bootstrap de SSO?** → **sim**, como claim adicional no custom
   token. Sem isso, abrir o segundo app reinicia a janela e o teto desliza junto com a sessão. Custa cerca
   de dez linhas. Descartado: só recusar o bootstrap quando o teto já estourou — fica como fallback
   documentado se a claim não sobreviver ao `createSessionCookie` (§7.1).

6. **Driver da renovação no cliente: poller próprio ou o listener que já existe?** → **o listener**.
   `onIdTokenChanged` já dispara de hora em hora e já chama o servidor; apontar isso para a rota de
   renovação é um diff menor que acrescentar `setInterval` + `visibilitychange` + guard de frequência do
   lado do cliente, e cobre a mesma janela. Descartado: poller, por acrescentar um caminho de disparo a
   mais no arquivo que `apps/app/CLAUDE.md` marca como o mais frágil do repo.

7. **Limite de frequência: Arcjet ou a ordem dos passos?** → **a ordem dos passos** (§6.2). Reusar
   `checkRateLimit` exigiria declarar `@repo/security` como dependency de `packages/auth`, dependeria de
   `ARCJET_KEY` (que degrada para no-op sem a chave) e limitaria por IP, que é a característica errada para
   uma rota por sessão. **Esta é a que eu levaria ao usuário se pudesse perguntar uma só**: a defesa por
   construção é suficiente contra abuso acidental, e não cobre um atacante com muitas sessões válidas.

8. **Fração do throttle: env ou constante?** → **constante**, `0.5`. Mais uma variável de ambiente para
   ajustar algo que ninguém vai ajustar. Descartado: `SESSION_REFRESH_AFTER_FRACTION` como env.

9. **Quantos códigos de erro novos?** → **um**, `AUTH_SESSION_EXPIRED`. `AUTH_NO_SESSION` já cobre ausente
   e revogado, e o cliente trata os dois igual. Descartado: um `AUTH_SESSION_REVOKED` separado, que
   acrescentaria três entradas de tradução sem mudar comportamento nenhum.

### Registrado, não decidido aqui

10. **`packages/auth` declara `next: 15.1.3` enquanto o monorepo está em `16.0.0`.** Fora do raio desta
    tarefa por instrução explícita. O risco para este plano foi avaliado e é baixo (§7.4): a única API do
    Next tocada é `cookies()`, já `await`ada e igual nas duas majors. Alinhar a major é decisão do usuário.
