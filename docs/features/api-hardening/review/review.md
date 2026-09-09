# Review — Endurecimento da borda da API

> Data: 2026-09-02. Diff auditado contra o código, não contra o `handoff.md`.
> Modo autônomo: nenhuma pergunta feita. O que exigia decisão está em **Decisões em aberto**.
> **Nada commitado, nada em stage.** As correções abaixo estão no working tree, visíveis no `git diff`.

---

## 1. Branch

| | |
|---|---|
| **Branch usada** | `api-hardening-flow` — **reutilizada**, não criada |
| **Base** | branch do workspace do Conductor; não é protegida |
| **Criei branch?** | **Não.** O usuário instruiu explicitamente manter esta |
| **Nome que o padrão do repo pediria** | `feat/api-hardening` — o diff cobre `packages/security`, `packages/shared`, `apps/api`, `apps/app`, `apps/web` e `packages/internationalization`; por `.claude/rules/git-commits.md`, vários apps num escopo único → **omite-se o `project`** |
| **Título de PR sugerido** | `feat: harden the API edge with security headers, CORS allowlist and rate limiting` |

---

## 2. Achados

| Sev | Arquivo:linha | Problema | Ação |
|-----|---------------|----------|------|
| 🟡 | `apps/api/(shared)/lib/cors.ts:66` | O `Retry-After` do 429 **nunca chega ao JavaScript**. O browser esconde de scripts cross-origin todo header fora da safelist CORS, e `Retry-After` não está nela — sem `Access-Control-Expose-Headers` o campo `FormattedError.retryAfterSeconds` (todo o P3) nasce sempre `null` no navegador | **Corrigido** |
| 🟡 | `apps/api/(shared)/lib/cors.ts:62` + `apps/api/proxy.ts:94` | `Vary: Origin` só era emitido quando havia origem permitida. A resposta sem `Origin` (que **não** traz `Access-Control-Allow-Origin`) e a recusa 403 saíam sem `Vary`, então um cache compartilhado pode servi-las a um browser que mandou `Origin` — e a resposta chega sem permissão, bloqueada | **Corrigido** |
| 🟡 | `apps/app/shared/components/ui/Sidebar.tsx:72` | Ao remover o `<AvatarImage>`, sobrou `<Avatar className="h-8 w-8" />` **sem filho**. O `AvatarPrimitive.Root` do design system não tem fundo (o `bg-muted` vive no `AvatarFallback`), então o slot virou um **buraco invisível** de 32px em toda página autenticada, desalinhando o cabeçalho da sidebar em relação ao menu | **Corrigido** |
| ⚪ | `apps/api/proxy.ts:47` | `RATE_LIMITED_PATHS.includes(pathname)` é comparação exata: `/auth/sign-in/` (barra final) e uma futura `/auth/sign-in/apple` ficam fora do limite sem editar a lista. Risco baixo — o Next redireciona 308 a barra final preservando o método, e a requisição volta pelo caminho limitado | Registrado. Ver decisões em aberto |
| ⚪ | `apps/app/proxy.ts:50` | Se um fork esquecer `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `frame-src` colapsa em `'none'` e o login com Google quebra. Não é modo de falha novo (sem authDomain o Firebase já não faz popup), mas o diagnóstico fica mais difícil | Registrado; `docs/SECURITY.md` já nomeia a variável |
| ⚪ | `packages/security/index.ts:46` | `checkRateLimit` constrói um cliente Arcjet **por requisição**. É o mesmo padrão do `secure()` que já existia, então não é regressão | Registrado |
| ⚪ | `apps/web/env.ts:22` (pré-existente) | Com `skipValidation: true`, `env.ARCJET_KEY` é sempre `undefined` na web — o `secure()` de `apps/web/proxy.ts:53` **já era código morto antes deste diff**. Mesma raiz do desvio D3 | Não corrigido. Ver decisões em aberto |
| ⚪ | `apps/web` e `apps/app` (pré-existente) | Console traz erros de aninhamento de DOM do React (`<button>` dentro de `<button>`, gatilho de dropdown) em telas que este diff não toca | Fora de escopo |

**Nenhum 🔴.** O desvio D2 (`ARCJET_KEY=""`) foi auditado com rigor e está **correto** — detalhe em §4.

---

## 3. Correções aplicadas

Três arquivos de produção + um arquivo de teste. Nenhuma muda contrato público.

### `apps/api/(shared)/lib/cors.ts`

1. **`Access-Control-Expose-Headers: Retry-After`** nas respostas com origem permitida. Sem isso o
   `retryAfterSeconds` que o P3 adicionou ao `FormattedError` é inalcançável pelo cliente — a feature
   estaria entregue quebrada, e o defeito só apareceria quando alguém tentasse escrever
   "tente de novo em N segundos" na tela.
2. **`Vary: Origin` também quando não há origem para responder** (`buildCorsHeaders(null)` passou de `{}`
   para `{ Vary: "Origin" }`).

### `apps/api/proxy.ts`

A recusa de origem passa por `withCors(..., null)`, para que o **403 também carregue `Vary: Origin`** —
antes ela era a única resposta sem o cabeçalho.

```diff
-        return withSecurityHeaders(refuseOrigin(request));
+        return withSecurityHeaders(withCors(refuseOrigin(request), null));
```

### `apps/app/shared/components/ui/Sidebar.tsx`

O `<Avatar>` ganhou `<AvatarFallback />`, que traz o `bg-muted` do design system. O slot volta a ocupar
espaço com um círculo neutro em vez de um vazio, restaurando o alinhamento do cabeçalho. **Sem string
nova** (nada de i18n) e **sem origem nova na CSP** — a decisão de pôr um logo ali fica para o produto.

### `apps/api/__tests__/corsOrigin.test.ts`

Duas asserções acompanham o contrato que mudei: `buildCorsHeaders(null)` agora é `{ Vary: "Origin" }`, e
uma nova fixa o `Access-Control-Expose-Headers`. `api` foi de 145 → **146 testes**.

---

## 4. Auditoria dos pontos de risco

### 4.1 CSP — os 3 defaults do nosecone (medido no header real e no browser)

| Default que quebra o login | Correção no código | Prova empírica |
|---|---|---|
| COOP `same-origin` mata `signInWithPopup` | `crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }` | ✅ **Popup aberto e navegado até `accounts.google.com/v3/signin/identifier`**, com `redirect_uri=https://<authDomain>/__/auth/handler`. O opener não perdeu a referência |
| COEP `require-corp` derruba o avatar do Google | `crossOriginEmbedderPolicy: false` | ✅ Header `cross-origin-embedder-policy` **ausente** na resposta real |
| `frame-src 'none'` bloqueia o iframe `__/auth/iframe` | `frameSrc: [https://<authDomain>]` + `childSrc` espelhado | ✅ **O iframe `https://<authDomain>/__/auth/iframe` está no DOM da página de sign-in, carregado, com zero violação no console** |

Scripts de terceiro efetivamente carregados na página de login, sem nenhuma recusa:
`apis.google.com/js/api.js`, o bundle `gapi_iframes` e `va.vercel-scripts.com/v1/script.debug.js`
(só em desenvolvimento). Isso valida a `script-src` inteira, incluindo o ramo condicional do Vercel.

**Isto vai além do que o `/develop` conseguiu provar.** O que continua sem prova é só a **volta**: a
credencial saindo do popup e completando a sessão no opener. Ver §6.

Política emitida (medida em `curl`, não estimada), `apps/app`, desenvolvimento:

```
default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'self'; frame-ancestors 'none';
manifest-src 'self'; media-src 'self'; worker-src 'self' blob:; font-src 'self';
script-src 'self' 'unsafe-inline' https://apis.google.com 'unsafe-eval' https://va.vercel-scripts.com;
style-src 'self' 'unsafe-inline';
connect-src 'self' http://localhost:3002 https://identitytoolkit.googleapis.com https://securetoken.googleapis.com;
img-src 'self' data: blob: https://lh3.googleusercontent.com;
frame-src https://<authDomain>; child-src https://<authDomain>;
```

`apps/web` emite a mesma política **menos** analytics e avatar, como `-Report-Only`. `apps/api` emite
`default-src 'none'` com `cross-origin-resource-policy: cross-origin` e HSTS de um ano.

⚠️ `script-src` mantém `'unsafe-inline'` sem nonce — está **documentado com honestidade** em
`docs/SECURITY.md`, que diz explicitamente que o bloqueio de XSS por `script-src` é parcial. Concordo com
o corte: fiar nonce no script anti-flash do `next-themes`, no bootstrap do App Router e no `gtag` é tarefa
própria, e a política entrega valor real pelas outras diretivas.

### 4.2 CORS — medido com `curl` contra a API rodando

| Cenário | Resultado |
|---|---|
| `Origin: http://localhost:3000` (na lista) | `access-control-allow-origin: http://localhost:3000` + `vary: Origin` + `access-control-expose-headers: Retry-After` |
| **Sem** header `Origin` | Passa; **nenhum** cabeçalho de permissão; `vary: Origin` (após correção) |
| `Origin: https://evil.example` | `403 {"error":{"code":"AUTH_FORBIDDEN_ORIGIN"}}`, **sem** `Access-Control-Allow-Origin`, com `Vary: Origin` (após correção) |
| Preflight permitido | `204` com `Allow-Methods`/`Allow-Headers`/`Expose-Headers`/`Max-Age` |
| Preflight recusado | `204` **sem** `Access-Control-Allow-Origin` — o browser barra |

É allowlist de verdade: a origem só é ecoada **depois** de `allowedOrigins.includes(origin)`; não há
reflexão incondicional e **não existe `*` em lugar nenhum** (o coringa antigo em `proxy.ts:15` sumiu).
`.env.example` e código agora concordam: a var é lista separada por vírgula, `parseAllowedOrigins` faz
`split(",")` com `trim`, e o texto do exemplo diz que não há coringa.

`Access-Control-Allow-Credentials` continua ausente — correto: o SDK autentica por bearer token, não há
`withCredentials` em `packages/sdk`.

### 4.3 `CORS_ORIGIN` no env tipado — o build **não** passou a exigir a variável

`apps/api/.env` **não tem** `CORS_ORIGIN` (grep: 0 ocorrências) e a variável não estava no ambiente.

```
pnpm --filter api build  →  ✅ 13 rotas geradas, exit 0, zero menção a CORS_ORIGIN
```

Prova A/B confirmada de forma independente. O gate de produção vive no `instrumentation.ts`
(5 testes) e não no `env.ts`, exatamente como o plano queria.

### 4.4 Rate limit — NO-OP verificado ao vivo

Sem `ARCJET_KEY` no ambiente:

- **25 POSTs seguidos em `/auth/sign-in` → zero 429.** O app sobe e funciona.
- Aviso de boot impresso **uma única vez**: `[security] rate limiting is DISABLED (no ARCJET_KEY)…`
- **Nenhum fallback em memória.** `checkRateLimit` retorna antes de qualquer rede quando não há chave, e o
  teste `never reaches the network` fixa isso asserindo que o cliente Arcjet nem é construído. Correto:
  contador em memória em serverless não limita nada e mente para quem lê o código.
- `/webhooks/payments` **não** está em `RATE_LIMITED_PATHS` — confirmado no código, no teste
  (`leaves authenticated and webhook traffic alone`) e na lista de rotas do build. `/auth/me` e `/health`
  também ficam de fora.
- O 429 devolve `{"error":{"code":"AUTH_RATE_LIMITED"}}` + `Retry-After`, preserva CORS e CSP, e loga
  uma linha sem IP, e-mail, body ou token. O 429 vivo (com chave real) foi exercitado pelo `/develop`;
  aqui está coberto por unidade.

### 4.5 🔴 O desvio mais sério — `packages/security/keys.ts`

**Auditado com rigor. A correção está certa e não desliga a proteção em silêncio.**

```ts
const optionalArcjetKey = z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const key = value.trim();
    return key === "" ? undefined : key;
}, z.string().startsWith("ajkey_").optional());
```

O `preprocess` converte **apenas** string vazia ou só-espaços em `undefined`. Qualquer outro valor segue
para `z.string().startsWith("ajkey_")` e, se não conformar, **lança**. O teste
`still refuses a value that is not an Arcjet key` fixa exatamente isso: `"not-a-key"` continua reprovando.
Não há caminho em que uma chave inválida vire "sem chave".

O diagnóstico do `/develop` está correto e é **mais grave do que ele registrou**: `apps/app/env.ts` também
faz `extends: [security()]` **sem** `skipValidation`, então `ARCJET_KEY=""` — o valor que os três
`.env.example` distribuem — reprovava o schema na `apps/app` igualmente. A armadilha estava dormente só
porque a `apps/api` ainda não importava o pacote.

Os 3 consumidores vivos de `secure()` — nenhum regrediu:

| Consumidor | Antes | Depois |
|---|---|---|
| `apps/app/proxy.ts:91` | gated em `env.ARCJET_KEY`; quebrava no boot com `.env.example` copiado | funciona; sem chave, `secure()` é no-op |
| `(admin)/admin/layout.tsx:20` e `(common)/layout.tsx:19` | chamam `secure()` direto; ele já retornava cedo sem chave | idênticos |
| `apps/web/proxy.ts:53` | gated em `env.ARCJET_KEY`, que é **sempre `undefined`** por causa do `skipValidation` — código morto | idem, **sem mudança** |

`secure()` não foi tocado. ✅

### 4.6 Remoção de `noseconeOptions` / `noseconeOptionsWithToolbar`

`rg` no repositório inteiro: **zero consumidores em código**; as únicas ocorrências são prosa em
`specs/`, `docs/features/` e no próprio `middleware.ts` (que reexporta `securityMiddleware`, mantido).

**Concordo com remover em vez de depreciar.** O valor removido carregava literalmente
`contentSecurityPolicy: false`; mantê-lo num boilerplate feito para ser forkado seria deixar à mão um
atalho que **desliga a feature que este diff entrega**. Mas é remoção de export público de pacote — deve
aparecer na descrição da PR. Ver decisões em aberto.

### 4.7 `apps/web/env.ts` e `apps/app/env.ts`

Fui ao código do t3-env instalado (`@t3-oss/env-core@0.13.8`) em vez de aceitar a explicação do handoff:

```js
const skip = !!opts.skipValidation;
if (skip) return runtimeEnv;   // ← retorna antes de montar `extendedObj`
```

**Confirmado**: com `skipValidation: true` os `extends` são descartados por completo. O desvio D3 é fato,
não hipótese — e explica também o `ARCJET_KEY` morto da web e o CTA "Ir para o painel" que não aparece na
landing (verifiquei no browser: a landing não renderiza link para `:3000`).

O contorno (declarar as vars localmente no `runtimeEnv`) **funciona** e foi o escopo certo para esta task.
Mas ele **mascara a causa** de um jeito que morde: `apps/web/env.ts` agora tem um bloco `client` com
schemas Zod que **nunca são executados** — parece validação e não é. Um fork que adicionar uma terceira
variável ali vai supor que ela está validada. Ver decisões em aberto.

Em `apps/app/env.ts` a situação é diferente e está **correta**: não há `skipValidation`, e as duas vars
declaradas não vêm de nenhum `keys()` estendido (o auth domain é lido cru em `packages/auth/client.ts`; o
GA id vive em `@repo/analytics/keys`, que a `apps/app` ainda não estende). O gate `startsWith("G-")` do
proxy é **idêntico** ao `preprocess` de `packages/analytics/keys.ts` — consistente.

### 4.8 Comentários

`rg` por `plan.md`, `handoff.md`, `review.md`, `STATE.md`, `docs/features`, IDs de processo e narração de
autoria em `apps/` e `packages/`: **zero ocorrências**. Os comentários que existem explicam **porquê**
(o `'unsafe-inline'` sem nonce, o COOP e o popup, o `Retry-After` só em delta-seconds, a razão de o
`CORS_ORIGIN` ser opcional no env) e são autocontidos. Em conformidade com `.claude/rules/code-comments.md`.

### 4.9 i18n

`AUTH_RATE_LIMITED` nos 3 idiomas, copy coerente ("aguarde e tente de novo", não "erro inesperado"), e
distinta de `USERS_AUTH_RATE_LIMITED` (o limite do Firebase) — há teste fixando a diferença.
`AUTH_FORBIDDEN_ORIGIN` foi reusado, já existia nos 3 idiomas. Paridade verde. **Nenhuma string solta**
introduzida — o literal `"company name"` da sidebar é anterior a esta task.

### 4.10 `specs/api-hardening.md`

Diff = **exatamente 3 linhas de frontmatter** (`status`, `feature`, `updated`). **O corpo da spec não foi
tocado.** ✅

---

## 5. Raio de impacto

| Mudança de contrato | Consumidores |
|---|---|
| `packages/security/middleware.ts` — 4 exports novos, 2 removidos | `apps/api/proxy.ts`, `apps/app/proxy.ts`, `apps/web/proxy.ts`. Os removidos: **0** |
| `packages/security/keys.ts` — `ARCJET_KEY=""` passa a valer como ausente | `apps/api`, `apps/app`, `apps/web` (todos via `env.ts`) e os 4 pontos de `secure()`. Efeito: destrava, não trava |
| `packages/security/index.ts` — `checkRateLimit`, `isRateLimitEnforced` (aditivo) | só `apps/api/proxy.ts`. `secure()` intocado |
| `packages/shared` — `FormattedError.retryAfterSeconds` (aditivo) | toda tela que constrói `FormattedError`; **nenhuma consome ainda** |
| `apps/api` — CORS deixa de ser coringa | qualquer origem fora da lista passa a receber 403. **Preview deploys da Vercel serão recusados** até a origem efêmera entrar na var — documentado em `docs/SETUP.md`, não testado |
| `packages/sdk` | **sem mudança** |

---

## 6. Validação visual

Ferramenta: `agent-browser`, comandos **estritamente em sequência**. Apps subidos em 3000/3001/3002.
Conta usada: **`review-api-hardening@example.com`**, criada pelo fluxo real de sign-up (ver limpeza em §9).
Screenshots em `docs/features/api-hardening/review/screenshots/`.

### O que ficou provado

| # | Fluxo | Resultado |
|---|---|---|
| V1 | Landing da `apps/web`, desktop e mobile 390×844 | ✅ renderiza; CSP em `-Report-Only`; **nenhuma violação reportada** |
| V2 | Sign-up real na `apps/app` sob CSP bloqueante | ✅ conta criada, sessão estabelecida, redirect para o painel |
| V3 | CRUD de `entities` completo: lista vazia → criar → lista com registro → excluir → volta a vazio | ✅ prova `connect-src` + CORS + preflight de ponta a ponta |
| V4 | Sidebar (a mudança que corrigi) | ✅ placeholder neutro alinhado, em **light, dark e no drawer mobile** |
| V5 | `ProfileDropdown` | ✅ abre; renderiza iniciais (conta e-mail/senha não tem `photoURL`) |
| V6 | Avatar do playground | ✅ `naturalWidth: 150`, `complete: true` — o data URI carrega de verdade |
| V7 | Tema light ↔ dark; idiomas pt-br e es | ✅ o script anti-flash inline e os estilos do antd sobrevivem à política |
| V8 | Mobile 390×844 (app e web) | ✅ |
| V9 | **Console em todas as telas** | ✅ **zero `Refused to …` / `Content Security Policy`** — contado tela a tela |
| V10 | **Login com Google, ida** | ✅ **iframe `__/auth/iframe` no DOM sem recusa; `apis.google.com` carregado; popup navegou até `accounts.google.com`** |
| V11 | CORS por `curl` (5 cenários) e NO-OP do rate limit (25 POSTs) | ✅ §4.2 e §4.4 |

### O que a validação **NÃO** provou

1. 🔴 **A volta do login com Google** — a credencial saindo do popup e completando a sessão no opener.
   Provei que a ida funciona (o que o `/develop` não tinha), mas o modo de falha do COOP é **silencioso**
   e mora justamente no retorno. **Continua exigindo um passe manual com conta Google real antes do merge.**
2. 🔴 **Carregamento real de `lh3.googleusercontent.com`** — depende de uma conta com `photoURL`.
3. 🟡 **CSP de produção num browser** — `'unsafe-eval'` só entra em desenvolvimento, então a `script-src`
   de produção só foi exercitada em teste unitário.
4. 🟡 **Renovação do ID token via `securetoken.googleapis.com`** — a origem está na `connect-src` emitida,
   mas a sessão não foi mantida por uma hora.
5. 🟡 **Área admin e impersonação sob CSP** — só o painel comum foi aberto.
6. 🟡 **429 real na tela** — o toast traduzido de `AUTH_RATE_LIMITED` nunca foi visto por olho humano;
   exige chave Arcjet.

---

## 7. Lacunas de teste (para o `/test` — apontadas, não escritas)

1. 🔴 **Login com Google até o redirect completar**, em `apps/app` **e** `apps/web`. Não aceitar
   "o popup abriu" como aprovação — a ida já está provada; o que falta é a **volta**.
2. 🔴 **`lh3.googleusercontent.com` carregando de fato** no `ProfileDropdown` e na lista de admin.
3. 🟡 **`next build && next start` nos 3 apps** e repetição do passe de console — é o cenário dos forks,
   e é onde `'unsafe-eval'` some da política.
4. 🟡 **Área admin (`/admin/users`) e modo impersonado** sob CSP bloqueante.
5. 🟡 **Sessão viva por mais de 1h** (ou refresh forçado do ID token) para exercitar `securetoken`.
6. 🟡 **`/auth/sign-in/google` levada ao limite** — o 429 foi exercitado em `/auth/sign-in`, e é
   `/auth/sign-in/google` que tem consumidor real (`googleSignInApi.ts`).
7. 🟡 **Toast traduzido do `AUTH_RATE_LIMITED` na tela**, nos 3 idiomas.
8. 🟡 **`retryAfterSeconds` chegando ao cliente** ponta a ponta, agora que o
   `Access-Control-Expose-Headers` existe — nenhum teste cobre a leitura cross-origin de verdade.
9. 🟡 **Boot real em produção sem `CORS_ORIGIN`** (`NODE_ENV=production next start`) — hoje só unitário.
10. ⚪ **Preview deploy da Vercel** com domínio efêmero fora da allowlist.

---

## 8. Decisões em aberto (com recomendação)

| # | Questão | Recomendação |
|---|---|---|
| D-A | **Branch.** O padrão do repo pediria `feat/api-hardening`; ficamos em `api-hardening-flow` por instrução explícita | **Manter `api-hardening-flow`.** Registrado aqui para constar |
| D-B | **`noseconeOptions`/`noseconeOptionsWithToolbar` removidos** — 0 consumidores, mas é export público de pacote num boilerplate feito para forkar | **Manter a remoção** e citá-la na descrição da PR como breaking change. Depreciar seria deixar à mão um valor que desliga a CSP |
| D-C | **`skipValidation: true` em `apps/web/env.ts`** — a causa raiz de 3 sintomas (CSP sem a URL da API, CTA do painel morto, `secure()` morto). O contorno resolveu 1 e deixa um bloco `client` que parece validar e não valida | **Tarefa própria, logo depois desta.** Todas as vars são `.optional()`, então remover o `skipValidation` deve passar — mas muda header, CTA e pricing da landing e precisa de passe visual próprio. Enquanto isso, um comentário no `env.ts` já avisa |
| D-D | **Cabeçalho da sidebar.** Deixei um círculo neutro; o slot pede um logo de produto | **Backlog de produto.** Pôr um logo exige asset + provavelmente uma origem nova na CSP — não é decisão de review |
| D-E | **Casamento exato de rota no rate limit.** `/auth/sign-in/` e futuras `/auth/sign-in/*` ficam de fora | **Deixar como está por ora** (a lista é curta e explícita, e `startsWith` limitaria `/auth/sign-in/google` duas vezes). Revisitar quando entrar a 4ª rota pública |
| D-F | **Contas de QA no Firebase de desenvolvimento**: `qa-api-hardening@example.com` (do `/develop`) e `review-api-hardening@example.com` (desta etapa) | **Apagar as duas** no Firebase Console → Authentication + o doc `user` no Firestore, depois do merge. Nenhuma entidade de teste ficou: o CRUD terminou com a lista vazia |
| D-G | **`pnpm-lock.yaml` no plano de commits.** O lock cobre `nosecone` (pacote) e `@repo/security` (api), que caem em blocos diferentes | Proposto no **bloco 1**; assim os blocos 1–5 são instaláveis e testáveis. O preço é que os blocos 1–5 não ficam individualmente `--frozen-lockfile` limpos — irrelevante, já que o CI roda na ponta da PR |

---

## 9. Gates — números reais (reconferidos, não copiados)

| Comando | Resultado |
|---|---|
| `pnpm check` | **402 arquivos · 0 erros · 0 warnings** ✅ (confere com o handoff) |
| `pnpm turbo run lint typecheck test` | **22/22 tasks** ✅ (confere) |
| `pnpm --filter @repo/internationalization test` | **2 arquivos / 11 testes** ✅ (paridade dos 3 idiomas) |
| `pnpm --filter api build` **sem `CORS_ORIGIN`** | ✅ exit 0, 13 rotas, zero menção à variável |

Testes por workspace, **depois** das minhas correções:

| Workspace | Arquivos | Testes |
|---|---|---|
| `@repo/security` | 3 | 31 |
| `api` | 19 | **146** (145 + 1 asserção que fixa o `Expose-Headers`) |
| `app` | 22 | 146 |
| `web` | 2 | 19 |
| `@repo/auth` | 2 | 29 |
| `@repo/shared` | 1 | 15 |
| `@repo/internationalization` | 2 | 11 |
| `@repo/payments` | 1 | 8 |
| **Total** | **52** | **405** |

O `+73 testes / +8 arquivos` do handoff bate: security +31, api +27, app +11, web +4. Com a minha
asserção, **+74**.

---

## 10. Plano de commits proposto

⛔ **Nada foi commitado.** Ordem: `packages/*` → `apps/api` → `apps/app`/`apps/web` →
`packages/internationalization` → docs. Um commit por aplicação/pacote, pulverizado por funcionalidade.

| # | Mensagem | Arquivos |
|---|----------|----------|
| 1 | `chore(security): run the package tests in the pipeline` | `packages/security/vitest.config.mts`, `packages/security/package.json`, `pnpm-lock.yaml` |
| 2 | `fix(security): treat an empty ARCJET_KEY as no key at all` | `packages/security/keys.ts`, `packages/security/__tests__/keys.test.ts` |
| 3 | `feat(security): build content security policies for the browser apps and the API` | `packages/security/middleware.ts`, `packages/security/__tests__/csp.test.ts` |
| 4 | `feat(security): decide rate limits without throwing` | `packages/security/index.ts`, `packages/security/__tests__/rateLimit.test.ts` |
| 5 | `feat(shared): read the wait a rate limited response asks for` | `packages/shared/utils/helpers/formattedError.ts` |
| 6 | `feat(api): restrict cross-origin access to an allowlist` | `apps/api/(shared)/lib/cors.ts`, `apps/api/env.ts`, `apps/api/package.json`, `apps/api/.env.example`, `apps/api/__tests__/corsOriginEnv.test.ts` |
| 7 | `feat(api): check the origin, the request budget and the headers at the edge` | `apps/api/proxy.ts`, `apps/api/__tests__/corsOrigin.test.ts` |
| 8 | `feat(api): refuse to start in production without an origin allowlist` | `apps/api/instrumentation.ts`, `apps/api/__tests__/corsOriginBoot.test.ts` |
| 9 | `feat(app): serve a blocking content security policy` | `apps/app/proxy.ts`, `apps/app/env.ts`, `apps/app/__tests__/securityHeaders.test.ts` |
| 10 | `fix(app): stop loading sample avatars from an outside host` | `apps/app/shared/components/ui/Sidebar.tsx`, `apps/app/app/[locale]/(authenticated)/(common)/(pages)/playground/page.tsx` |
| 11 | `feat(web): report content security policy violations on the landing` | `apps/web/proxy.ts`, `apps/web/env.ts`, `apps/web/__tests__/securityHeaders.test.ts` |
| 12 | `feat(internationalization): translate the rate limit refusal` | `packages/internationalization/translations/packages/shared/utils.ts` |
| 13 | `test(app): freeze the rate limit copy and the wait it carries` | `apps/app/__tests__/apiErrorCopy.test.ts` |
| 14 | `docs: describe the HTTP edge controls and the origin allowlist` | `docs/SECURITY.md`, `docs/SETUP.md` |
| 15 | `chore(specs): mark the API hardening spec as in progress` | `specs/api-hardening.md` |
| 16 | `docs(features): api-hardening` | `docs/features/api-hardening/` |

**Segredos**: nada sensível em `docs/features/api-hardening/`. Os screenshots mostram só e-mails
sintéticos (`qa-…`/`review-…@example.com`), senhas mascaradas e dados de teste; as chaves do Firebase que
aparecem em prosa são `NEXT_PUBLIC_*`, públicas por desenho.

**Commits realizados**: _(em branco — o orquestrador preenche depois de commitar)_

Depois do último commit aprovado, o `/review` deve **perguntar** se sincroniza com
`git push -u origin api-hardening-flow`.
