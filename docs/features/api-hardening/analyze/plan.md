# Análise + Blueprint — Endurecimento da borda da API

> Origem: `specs/api-hardening.md` (`status: approved`, `effort: M`, `depends_on: []`).
> O problema, a evidência de mercado e o corte de MVP são **decisão de produto já tomada**.
> Este documento responde ao **como**. Notas de pesquisa: `specs/research/compliance-trust-baseline.md`
> (controles 13 e 16, ASVS 5.0 L1 3.4.1/3.4.2) e `specs/research/engineering-baseline.md` (prática 9).
> Data: 2026-09-02. Branch em uso: `api-hardening-flow`.

---

## 0. Reconferência das referências da spec (escrita em 2026-09-01)

Cada ref da spec foi reaberta. **Cinco divergências materiais** — três a favor, duas contra.

| Ref da spec | Estado real em 2026-09-02 | Veredito |
|---|---|---|
| `apps/api/proxy.ts:14-19` — só CORS, coringa default | ✅ Confere. `proxy.ts:15` `process.env.CORS_ORIGIN ?? "*"` | ok |
| `apps/api/env.ts:12-16` — 3 `FIREBASE_ADMIN_*` obrigatórias | ✅ Confere (`env.ts:12-16`), `skipValidation` em dev (`:23`) | ok |
| `packages/security/index.ts:12-18` — NO-OP sem `ARCJET_KEY` | ✅ Confere. `isRateLimit()` tratado em `:44` mas **nenhuma regra registrada** | ok |
| `packages/security/middleware.ts:14` — CSP desligada | ✅ Confere. `securityMiddleware`/`noseconeOptions` **sem nenhum consumidor** | ok |
| `apps/api` não declara `@repo/security` | ✅ Confere (`apps/api/package.json:17-31`) | ok |
| `apps/api/app/(routes)/auth/sign-in/route.ts:4` — POST sem guard | ✅ Confere. **Mas ver §1.4** | ⚠️ |
| Spec `:99` — "`apps/web` é a mais sensível a CSP por causa de scripts de marketing/analytics" | 🔴 **FALSO.** `apps/web` **não monta `AnalyticsProvider`** (`apps/web/app/[locale]/layout.tsx:1-43`) e nem declara `@repo/analytics`. Zero `<Script>`, zero iframe, zero gtag. É a app **mais limpa** das três. Quem tem analytics é a `apps/app` (`apps/app/app/layout.tsx:3,39-46`) | 🔴 inverte a premissa |
| Spec `:105-108` — Stripe só server-side | ✅ Confere. Zero `loadStripe`/`@stripe/stripe-js`/`js.stripe.com` no repo | ok |
| `docs/SETUP.md:48` — única doc de `CORS_ORIGIN` | ⚠️ É `docs/SETUP.md:57` hoje, e existe **também** `apps/api/.env.example:14-16` | ver §1.5 |

### Três achados novos que mudam o desenho

1. **🔴 `AUTH_FORBIDDEN_ORIGIN` já existe nos 3 idiomas** (`translations/packages/shared/utils.ts:25,67,107`)
   e já é emitido por `packages/auth/session-routes.ts:36`, com o helper de allowlist de origem em
   `packages/auth/session.ts:66-77`. **Existe precedente pronto** — o CORS da API não inventa contrato,
   copia o que a `@repo/auth` já faz. Zero i18n para a parte de origem.
2. **🔴 `apps/api/instrumentation.ts` existe** e o docstring dele descreve **exatamente** o padrão que
   resolve o dilema build×produção do `CORS_ORIGIN`: *"`env.ts` cannot cover this: it skips validation in
   development and is only evaluated by the modules that import it."* Ver §4.2 — é o que permite falhar em
   produção **sem** repetir o efeito das `FIREBASE_ADMIN_*` no `pnpm build`.
3. **🔴 `apps/api/.env.example:14-15` promete o que o código não faz.** O comentário diz
   *"Comma-separated list of origins allowed to call the API"*, mas `proxy.ts:15` joga a string inteira
   dentro de `Access-Control-Allow-Origin` — que **não aceita lista** por especificação. Hoje, um fork que
   siga o próprio `.env.example` e escreva duas origens quebra o CORS **das duas**. É um bug latente, não
   só uma lacuna.

---

## 1. Contexto da tarefa

### 1.1 Resumo

Ligar os três controles de borda que já estão pagos e desligados no repositório — cabeçalhos de segurança
com CSP, allowlist de origem no lugar do coringa, e limite de requisições nas rotas públicas de auth —
mantendo o padrão de **opt-in por variável ausente** que o repo já usa.

### 1.2 Apps impactados

| Alvo | Impacto |
|---|---|
| `packages/security` | Deixa de ser pacote parcialmente morto: ganha o builder de CSP e o limitador estruturado |
| `apps/api` | Passa a declarar `@repo/security`; proxy ganha cabeçalhos + allowlist de origem + rate limit; `env.ts` ganha `CORS_ORIGIN`; `instrumentation.ts` ganha o gate de produção |
| `apps/app` | Cabeçalhos + CSP bloqueante no proxy. É a app com **mais** superfície de CSP (analytics + avatar do Google + playground) |
| `apps/web` | Cabeçalhos + CSP **somente-relatório** |
| `packages/internationalization` | 1 código de erro novo × 3 idiomas |
| `packages/shared` | `FormattedError` passa a expor `retryAfterSeconds` (aditivo) |
| `packages/sdk` | **Nenhuma mudança.** Ver §5 — o caminho de erro já funciona |

- **Área do painel**: N/A (não é feature de painel). O sign-in é `(unauthenticated)`.
- **Modo de produto** (`subscription` × `simple`): N/A no comportamento; **relevante na config** — no modo
  `simple` o usuário opera na `apps/web`, logo `CORS_ORIGIN` precisa conter a origem da web também.
- **Assinatura/plano**: N/A.
- **Impersonação**: N/A — nenhuma das três mudanças distingue sujeito. A allowlist de origem e o rate
  limit são pré-autenticação; os cabeçalhos são por resposta. Um admin personificando não muda nada.
- **Genérico × específico**: a **política** é genérica (`packages/security`); a **lista de origens** é
  específica de cada app e vem de env. Respeita "genérico no pacote, específico no app".

### 1.3 Corte de MVP (5 itens da spec, `:76-83`) — e o que fica de fora

| # | Item do corte | Entregue como |
|---|---|---|
| 1 | 3 apps com cabeçalhos + CSP ativa | `applySecurityHeaders()` nos 3 proxies; CSP bloqueante em `app`/`api`, `Report-Only` em `web` |
| 2 | Origem sem coringa, via env tipado, falha cedo em produção | `CORS_ORIGIN` **opcional** em `env.ts` + gate de produção em `instrumentation.ts` |
| 3 | Rotas públicas de auth com 429 + indicação de espera | `slidingWindow` do Arcjet no proxy da api + `Retry-After` |
| 4 | Limite opt-in: sem a chave, o app sobe e funciona | NO-OP explícito + aviso único no boot |
| 5 | Pedido bloqueado é observável, não some em silêncio | `console.warn` estruturado sem PII + cabeçalhos de resposta |

**Fora do corte** (além do que a spec já lista em `:87-90`), decidido nesta análise:

- **Nonce na CSP** para eliminar `'unsafe-inline'` de `script-src`. Ver §3.3 — exige fiação em 3 pontos
  (`packages/analytics/provider.tsx:17`, `packages/design-system/providers/theme.tsx:8-14`, e o nonce do
  próprio Next). É a maior dívida deixada e está registrada com os pontos exatos.
- **Contagem regressiva na UI** ("tente de novo em 42 s"). O `Retry-After` é a *indicação* exigida pela
  spec (`:79-80`) e é protocolo; a contagem visível é UI e exige interpolação nova nos 3 idiomas.
- **Rate limit nas rotas `/api/auth/session` da `apps/app`/`apps/web`.** São rotas de front-end, não da
  api, e o corte da spec fala em "rotas públicas de autenticação" da API. Registrado como follow-up.
- **`Permissions-Policy`** — o nosecone não o emite por padrão e escolher a lista de features é decisão
  própria. Fora.

### 1.4 🔴 A verdade incômoda: o login não passa pela API

O corte 3 diz "as rotas públicas de autenticação ganham limite". Levantei quem as chama:

| Rota da API | Consumidor real no repo |
|---|---|
| `POST /auth/sign-in` | **nenhum** |
| `POST /auth/sign-up` | **nenhum** |
| `POST /auth/sign-in/google` | `apps/app` → `apps/app/shared/lib/googleSignInApi.ts:36` → `packages/sdk/src/actions/auth/action.ts:49` |

O login por e-mail/senha das **duas** front-ends usa `useAuth().signIn`
(`apps/app/.../SignInForm.tsx:35,125` e `apps/web/.../sign-in-form-client.tsx:24,64`), que resolve em
`packages/auth/provider.tsx:217-218` → `packages/auth/client.ts` → **`identitytoolkit.googleapis.com`
direto do browser**. Essa requisição nunca toca a `apps/api`.

**Consequência a declarar sem rodeios:** limitar `/auth/sign-in` na API **não protege o formulário de
login**. Quem protege esse caminho hoje é a proteção nativa do Firebase (já mapeada em
`apps/api/(shared)/lib/toolkit-error-codes.ts:16-18` → `USERS_AUTH_RATE_LIMITED`).

**Isso não invalida o corte — reforça-o.** `/auth/sign-in` e `/auth/sign-up` são POST público, sem guard,
sem limite e **sem nenhum consumidor legítimo**: qualquer tráfego ali é, por definição, suspeito, e elas
chamam a Identity Toolkit com a chave do projeto (`firebase-identity-toolkit.ts:63-75`), ou seja, quem
abusar delas **queima a cota do fork**. E `/auth/sign-in/google` tem consumidor real. O que muda é a
**promessa**: entregamos limite na superfície da API, não no formulário. Isso vai nos critérios de aceite
e na observação final.

### 1.5 Fontes e referências

Sem ClickUp, sem Figma, sem print. Fontes: a spec, as duas notas de pesquisa, e o código.
**Nenhuma referência não lida.**

---

## 2. Dados (Firestore)

**N/A em toda a seção 2.** Nenhuma coleção, nenhum campo, nenhuma consulta, nenhum índice, nenhum
backfill, nenhuma mudança em `firestore.rules`. A feature é inteiramente de borda HTTP. O contador do
rate limit vive na infraestrutura do Arcjet, não no Firestore — e é exatamente por isso que a nota de
engenharia (prática 9) exige contador externo: `Map` em memória em serverless não limita nada.

---

## 3. Cabeçalhos e CSP

### 3.1 Onde ligar: `nosecone()`, não `createMiddleware()`

`@nosecone/next` exporta duas coisas úteis (`node_modules/@nosecone/next/index.d.ts:58,75`):

```ts
export declare function createMiddleware(options?: Options): () => Promise<Response>;
export declare function nosecone(options?: Options): Headers;   // reexport do core
```

`createMiddleware` devolve um middleware **sem parâmetro de request** que produz a resposta inteira. Os
três proxies já são donos da resposta e têm lógica própria — redirect de locale
(`apps/app/proxy.ts:82-84`), sessão (`:96-117`), CORS (`apps/api/proxy.ts:23-31`). Encaixar
`createMiddleware` exigiria reescrever os três.

**Decisão: usar `nosecone(options): Headers` e mesclar** no `NextResponse` que cada proxy já constrói.
Isso convive com o `secure()` do Arcjet sem tocá-lo: `secure()` decide *se* a requisição passa,
`applySecurityHeaders()` decora a resposta que passou. São passos ortogonais na mesma função.

O helper novo mora em `packages/security/middleware.ts` (genérico) e cada app passa a sua própria lista
de origens (específico).

### 3.2 🔴 Três defaults do nosecone que QUEBRAM este repo

Rodei `nosecone.defaults` e cruzei com o que o repo carrega. **Aplicar `defaults` cru derruba o login.**

| Default do nosecone | O que quebra | Correção obrigatória |
|---|---|---|
| `crossOriginOpenerPolicy: "same-origin"` | 🔴 **Mata o `signInWithPopup` do Firebase.** COOP `same-origin` corta a relação `window.opener`, e o popup do Google não consegue devolver o resultado ao abridor. Atinge `packages/auth/client.ts:117-121` **e** `apps/app/shared/lib/googleSignInApi.ts:24` | `"same-origin-allow-popups"` |
| `crossOriginEmbedderPolicy: "require-corp"` | 🔴 Exige CORP em **todo** subrecurso cross-origin. Derruba o avatar do Google em `apps/app/shared/components/ui/ProfileDropdown.tsx:28` (`<AvatarImage>` do Radix, `<img>` cru que **não** passa pelo otimizador do Next) e o iframe do Firebase | desligar (`false`) |
| `frameSrc: ["'none'"]` | 🔴 Bloqueia o iframe oculto `__/auth/iframe` que o popup resolver do Firebase monta no `authDomain` | `https://<NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN>` |

Também: `connectSrc: ["'self'"]` bloquearia **todas** as chamadas do SDK (axios para `NEXT_PUBLIC_API_URL`)
e o Firebase; `fontSrc: ["'self'"]` está correto (Geist é `next/font/local`, self-hospedado —
`packages/design-system/lib/fonts.ts:2-3`, `node_modules/geist/dist/font.js:1`).

### 3.3 `script-src` e o `'unsafe-inline'` — a dívida assumida

Três inline scripts irredutíveis hoje, todos sem nonce:

| Origem do inline | Evidência | Aceita nonce? |
|---|---|---|
| `next-themes` (script anti-flash) | `packages/design-system/providers/theme.tsx:8-14` | sim, mas o wrapper **não passa** |
| Bootstrap de hidratação do App Router (`self.__next_f.push`) | inerente ao Next 16 | via nonce do middleware |
| `gtag` init (só `apps/app`, só com `NEXT_PUBLIC_GA_MEASUREMENT_ID`) | `packages/analytics/provider.tsx:16-18` | sim, prop existe, **não é passada** |

**Decisão: MVP entrega `script-src` com `'unsafe-inline'`, e isso é declarado como limitação, não
escondido.** O ganho real da CSP nesta entrega vem das *outras* diretivas — `frame-ancestors 'none'`
(clickjacking), `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`, e a allowlist de
`connect-src`/`img-src`/`frame-src`. O bloqueio de XSS por `script-src` fica parcial até a fiação de nonce
(follow-up, com os 3 pontos exatos acima).

`style-src 'unsafe-inline'` é **irremovível** neste repo por 4 razões independentes: antd v5 CSS-in-JS
(`packages/design-system/providers/antd-app.tsx:12`), `disableTransitionOnChange` do next-themes
(`theme.tsx:11`), `<style dangerouslySetInnerHTML>` em `packages/design-system/components/ui/chart.tsx:85`
e o `sonner`. Não é dívida — é o preço da stack.

`packages/seo/json-ld.tsx:17-24` **não** afeta a CSP: `type="application/ld+json"` não é executável.

### 3.4 A lista real de origens, por app

Levantada do código, não estimada. `[opt]` = condicional a env var.

#### `apps/app` (CSP **bloqueante**)

| Diretiva | Origens | Evidência |
|---|---|---|
| `script-src` | `'self'` `'unsafe-inline'` `https://apis.google.com` · `[opt]` `https://www.googletagmanager.com` · `[dev]` `https://va.vercel-scripts.com` | gapi do popup Firebase; GA em `packages/analytics/provider.tsx:16-18`; Vercel Analytics em `:15` (em prod serve de `/_vercel/insights/script.js`, mesma origem) |
| `connect-src` | `'self'` · `NEXT_PUBLIC_API_URL` · `https://identitytoolkit.googleapis.com` · `https://securetoken.googleapis.com` · `[opt]` `https://www.googletagmanager.com https://*.google-analytics.com https://region1.google-analytics.com` | SDK em `apps/app/shared/lib/client.ts:4` → `packages/sdk/src/client/base.ts:28`; refresh de ID token em `packages/auth/provider.tsx:176` |
| `img-src` | `'self'` `data:` `blob:` `https://lh3.googleusercontent.com` · `[opt]` GA | `ProfileDropdown.tsx:28` (`<img>` cru); já em `apps/app/next.config.ts:19,23` |
| `style-src` | `'self'` `'unsafe-inline'` | §3.3 |
| `font-src` | `'self'` | Geist local |
| `frame-src` | `https://<NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN>` | iframe `__/auth/iframe` |
| `frame-ancestors` | `'none'` | anti-clickjacking |

⚠️ `apps/app/.../playground/page.tsx:985` usa `https://github.com/shadcn.png` num `<AvatarImage>`. É rota
autenticada real. **Decisão: remover o `src` hardcoded do playground** em vez de liberar `github.com` na
CSP de produção de todo fork — é 1 linha e o playground é vitrine interna.

⚠️ `apps/app/next.config.ts:19` lista `www.google.com` em `images.domains` **sem uso encontrado e sem
`remotePattern` correspondente**; `domains` está deprecado no Next 16. Não entra na CSP.

#### `apps/web` (CSP **`Report-Only`**)

Muito menor — a premissa da spec estava invertida. Sem analytics, sem scripts de terceiros.

| Diretiva | Origens |
|---|---|
| `script-src` | `'self'` `'unsafe-inline'` `https://apis.google.com` |
| `connect-src` | `'self'` · `NEXT_PUBLIC_API_URL` · `https://identitytoolkit.googleapis.com` · `https://securetoken.googleapis.com` |
| `img-src` | `'self'` `data:` `blob:` |
| `style-src` / `font-src` | `'self'` `'unsafe-inline'` / `'self'` |
| `frame-src` | `https://<NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN>` |
| `frame-ancestors` | `'none'` |

#### `apps/api` (CSP **bloqueante**, restritiva)

Responde JSON. O único HTML é `apps/api/app/layout.tsx:7-11` e o `global-error.tsx`.
`default-src 'none'`, `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`
(para a página de erro do Next não virar tela branca), `img-src 'self' data:`,
`connect-src 'none'`, `frame-ancestors 'none'`, `form-action 'none'`, `base-uri 'none'`.

### 3.5 O que quebra se a lista estiver errada

Falha de CSP é **silenciosa para o usuário e barulhenta no console**. Modos concretos:

| Origem faltando | Sintoma |
|---|---|
| `apis.google.com` em `script-src` | Botão "entrar com Google" não faz nada; console: `Refused to load the script` |
| `<authDomain>` em `frame-src` | Popup do Google abre e **nunca fecha**; o resultado nunca volta |
| COOP `same-origin` mantido | Popup fecha mas o app **não recebe** a credencial — o mais traiçoeiro, porque parece que funcionou |
| `NEXT_PUBLIC_API_URL` em `connect-src` | **Todas** as telas de dado ficam vazias/erro; nenhum request sai |
| `identitytoolkit`/`securetoken` | Login por senha falha; e a sessão morre em ~1h quando o refresh é bloqueado — **quebra diferida**, não aparece no smoke test |
| `lh3.googleusercontent.com` em `img-src` | Avatar quebrado no dropdown (cosmético) |

As duas de **quebra diferida** (COOP e `securetoken`) são o motivo de a validação visual precisar
exercitar login com Google **até o redirect** e não parar no clique.

---

## 4. CORS

### 4.1 Desenho

Espelha `packages/auth/session.ts:66-77`, que já resolve o mesmo problema para as rotas de sessão.

1. `CORS_ORIGIN` vira **lista separada por vírgula** (como o `.env.example:14-15` já promete), parseada
   uma vez em módulo.
2. Requisição **sem header `Origin`** → permitida, e **nenhum** header CORS é emitido. É o caso do
   servidor chamando o servidor (`apps/app/lib/server/apiServerClient.ts:24`) e de qualquer cliente
   não-browser. Mesma regra de `session.ts:68-70`.
3. `Origin` presente **e** na allowlist → ecoa **aquela** origem em `Access-Control-Allow-Origin`
   + `Vary: Origin`.
4. `Origin` presente e **fora** da allowlist → **403** com `{ error: { code: "AUTH_FORBIDDEN_ORIGIN" } }`
   no request real; no **preflight**, `204 sem` `Access-Control-Allow-Origin` (o browser bloqueia, e não
   há corpo útil num preflight).
5. **O coringa some.** Nem como default, nem como valor configurável.

> **Sobre "nunca refletir `Origin`"** (ASVS 5.0 L1 3.4.2, citado em `compliance-trust-baseline.md:214`):
> o anti-padrão é refletir **incondicionalmente**. Refletir *depois* de conferir a allowlist é a
> implementação canônica de allowlist com múltiplas origens — `Access-Control-Allow-Origin` não aceita
> lista, então ou se ecoa o membro validado, ou só se suporta uma origem. `Vary: Origin` é obrigatório
> para não envenenar cache.

### 4.2 🔴 Falhar em produção **sem** exigir a variável no build

Restrição levantada pela spec (`:37-40`): `apps/api/env.ts` é importado por
`app/(routes)/webhooks/payments/route.ts:6` e o `createEnv` valida **eagerly** — declarar `CORS_ORIGIN`
como `z.string().min(1)` faria `pnpm --filter api build` passar a exigi-la em qualquer ambiente, repetindo
o efeito das `FIREBASE_ADMIN_*`.

**Decisão: declarar `CORS_ORIGIN` como `z.string().optional()` no env tipado e mover a exigência para o
boot em `apps/api/instrumentation.ts`.**

Por que isso é o lugar certo, e não um remendo — o docstring **já existente** em `instrumentation.ts`
descreve literalmente este padrão:

> *"Resolving the instance here turns it into a startup crash with a clear message instead of every
> request failing later. `env.ts` cannot cover this: it skips validation in development and is only
> evaluated by the modules that import it."*

Propriedades da escolha:

| Momento | Comportamento |
|---|---|
| `pnpm build` | ✅ Não exige nada de novo. `register()` **não** roda no build |
| `next dev` sem a var | ✅ Sobe, com default de desenvolvimento (§4.3) e aviso no console |
| `next start` com `NODE_ENV=production` sem a var | 🔴 **Crash no boot** com mensagem clara |
| `next start` em produção com a var | ✅ Sobe |

Ganho colateral: o gate roda **uma vez no boot**, não em toda requisição, e vale para o processo inteiro
— inclusive para rotas que não importam `env.ts`.

### 4.3 O fork em `localhost` no dia 1

Sem tratamento, fechar o CORS quebra todo fork recém-clonado — o pior primeiro contato possível.

**Decisão:** fora de produção (`NODE_ENV !== "production"`), quando `CORS_ORIGIN` está ausente, a
allowlist assume as origens de desenvolvimento conhecidas do próprio repo:
`http://localhost:3000` (app) e `http://localhost:3001` (web) — os valores que `apps/api/.env.example:31-32`
já documenta. Não é coringa: é uma allowlist curta, explícita e **inaplicável em produção**.

`apps/api/.env.example:16` passa de `CORS_ORIGIN=""` para
`CORS_ORIGIN="http://localhost:3000,http://localhost:3001"`, tornando o formato de lista óbvio.

---

## 5. Rate limit

### 5.1 Onde entra

**No `apps/api/proxy.ts`, filtrado por pathname** — não por rota.

| Alternativa | Por que não |
|---|---|
| Wrapper por rota (`withRateLimit(POST)`) | Duplica em 3 arquivos e some no 4º que alguém criar. Rotas de auth não têm guard onde pendurar |
| Middleware separado | O Next só admite um proxy por app |

O proxy da api já roda em todas as rotas (`proxy.ts:34-36`) e roda em Node (o comentário em
`apps/app/proxy.ts:25` confirma: *"Proxy always runs on Node"*), que é o que o `@arcjet/next` exige.

Caminhos limitados: `/auth/sign-in`, `/auth/sign-up`, `/auth/sign-in/google`.
**Fora**: `/auth/me` (tem guard e é hot path autenticado), `/webhooks/payments` (a Stripe faz retry
agressivo e um 429 nosso viraria cobrança/plano perdido — limitar webhook é tiro no pé),
`/health` (é o que o monitor bate).

### 5.2 A regra

`slidingWindow({ mode: "LIVE", interval: "60s", max: 20 })`, caracterizado por `ip.src`.
Disponível na versão instalada — `@arcjet/next` faz `export * from "arcjet"`
(`node_modules/@arcjet/next/index.d.ts:4`) e `slidingWindow` está em
`node_modules/arcjet/index.d.ts:797`.

`slidingWindow` (não `fixedWindow`) porque é o que a nota de engenharia indica
(`engineering-baseline.md:63`) e não tem o efeito de borda do `fixedWindow`, onde 2× o limite passa na
virada da janela.

**20/min por IP é deliberadamente permissivo** — a spec (`:115`) manda começar assim: *"limite mal
calibrado bloqueia usuário legítimo atrás de NAT/IP compartilhado: começar permissivo e apertar é mais
barato que o contrário."* Um humano tentando logar faz 3–5 tentativas por minuto no pior caso; 20 dá
folga para escritório atrás de NAT e ainda derruba força bruta (que quer milhares).

### 5.3 Uma função nova, `secure()` intacto

`secure()` (`packages/security/index.ts:12-50`) **não serve** aqui: ele comunica falha lançando
`new Error("Rate limit exceeded")` (`:45`) — uma string, sem código estável e **sem o tempo de reset**.
Não dá para montar `Retry-After` a partir dele. E ele tem 3 consumidores vivos (`apps/app/proxy.ts:48`,
`apps/web/proxy.ts:25`, os dois layouts autenticados) que não podem quebrar.

**Decisão: adicionar `checkRateLimit()` ao lado, com retorno estruturado.** Não é duplicação — é o mesmo
motor com um contrato de retorno que serve à borda HTTP.

`ArcjetRateLimitReason` expõe `reset: number` ("Time in seconds until reset",
`node_modules/@arcjet/protocol/index.d.ts:208-210`), que vira o `Retry-After` diretamente.

### 5.4 NO-OP explícito sem `ARCJET_KEY`

Três camadas, para que "desligado" nunca seja confundido com "protegido":

1. `checkRateLimit()` devolve `{ allowed: true, enforced: false }` sem tocar a rede.
2. `instrumentation.ts` emite **um** aviso no boot: o limite está desligado e como ligar.
3. Nunca há fallback em memória. A spec (`:113-114`) é categórica, e a nota de engenharia também
   (`engineering-baseline.md:62`): *"`Map` em memória não limita nada"*.

---

## 6. Contrato de erro até a tela

### 6.1 O `error.code` novo

**`AUTH_RATE_LIMITED`** → `429` (`HTTP_STATUS.TOO_MANY_REQUESTS` já existe,
`packages/shared/utils/helpers/httpStatus.ts`).

Por que **não** reusar `USERS_AUTH_RATE_LIMITED`: aquele código é emitido por
`apps/api/(shared)/lib/toolkit-error-codes.ts:17` para o limite **do Firebase**, atingido em outra camada,
com outra remediação e outro dono. Conflatá-los mataria a distinção justamente onde ela importa
(observabilidade: "quem me barrou?"). Custa 3 linhas de i18n.

`AUTH_FORBIDDEN_ORIGIN` → `403`: **já existe nos 3 idiomas**. Zero trabalho.

### 6.2 O SDK **não muda** — e por quê

O caminho já funciona. `FormattedError.apiResponseMessage`
(`packages/shared/utils/helpers/formattedError.ts:53-81`) lê `data.error.code` e resolve em `apiErrors`
para qualquer status. O interceptor em `packages/sdk/src/client/base.ts:85` só trata 401 de forma
especial (dispara o callback de sessão) — e é isso que se quer: **429 não deve deslogar ninguém**.

O que a spec pede em `:96` ("tratar 429 como caso próprio, não erro genérico") é a **indicação de espera**,
que hoje se perde. Entrega mínima e aditiva: `FormattedError` passa a expor
`retryAfterSeconds: number | null`, lido do header `Retry-After` da resposta. Campo novo, nada quebra.

> Isto mora em `packages/shared`, não em `packages/sdk`: `FormattedError` é de lá
> (`packages/shared/utils/helpers/formattedError.ts`) e o SDK só o reexporta.

### 6.3 A tela de login

`apps/app/.../SignInForm.tsx:39-40` já faz
`errorAlert(handleClientError(new FormattedError(error, locale)))` no `onError` do Google sign-in.
Com o código mapeado em `apiErrors`, **a mensagem traduzida aparece sozinha** — o sinal de pronto da spec
(`:130-131`, "a tela mostra mensagem traduzida nos três idiomas — não um erro cru") é satisfeito sem tocar
o componente.

**Decisão: não mexer no `SignInForm.tsx`.** É a mudança mínima da regra de ouro 10, e o estado "muitas
tentativas" é exatamente o alerta traduzido. A contagem regressiva ficou fora do corte (§1.3).

⚠️ O login **por senha** não passa pela API (§1.4), então esse caminho continua exibindo a mensagem do
Firebase — já traduzida via `packages/auth`. Não é regressão; é o estado atual, agora documentado.

### 6.4 i18n

Uma chave, três idiomas, no fim do bloco `apiErrors` de cada um
(`translations/packages/shared/utils.ts`, após `ENTITY_CREATE_FAILED` nas linhas 42 / 81 / 124):

| Idioma | Valor |
|---|---|
| `pt-br` | `"Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo."` |
| `en` | `"Too many attempts in a short time. Wait a moment and try again."` |
| `es` | `"Demasiados intentos en poco tiempo. Espere un momento e inténtelo de nuevo."` |

`packages/internationalization/__tests__/parity.test.ts:55` falha automaticamente se faltar em algum
idioma. Usar `/i18n-sync`.

---

## 7. Observabilidade mínima

Log estruturado é de `observability-logging`, **fora do corte** (spec `:89`). O mínimo honesto que atende
ao item 5 sem invadir aquela spec:

1. **No bloqueio**, um `console.warn` de linha única, prefixo estável e **sem PII**:
   `[security] blocked reason=rate-limit path=/auth/sign-in method=POST`.
   Reasons: `rate-limit` · `bot` · `origin`.
   ⛔ **Nunca** logar IP, e-mail, body, token ou header de auth. IP é dado pessoal sob LGPD, e
   `compliance-trust-baseline.md:167` é explícito sobre reter o mínimo.
2. **No boot** (`instrumentation.ts`), um aviso único quando `ARCJET_KEY` falta.
3. **A resposta é o próprio sinal**: `429` + `Retry-After` (rate limit) e `403` + `AUTH_FORBIDDEN_ORIGIN`
   (origem) são observáveis em qualquer painel de logs de plataforma sem instrumentação nenhuma.

Quando `observability-logging` chegar, o ponto 1 é o único a migrar — um `console.warn`, um lugar.

---

## 8. Autorização e segurança

- **Nada é enfraquecido.** Os guards (`requireCommonPanelApi`, `requireAdminApi`) e a checagem de
  ownership continuam intocados. Esta feature adiciona uma camada **antes** deles.
- **Ordem no proxy da api importa**: origem → rate limit → resposta → cabeçalhos. Recusar por origem antes
  de gastar chamada ao Arcjet evita queimar cota com tráfego que já ia ser rejeitado.
- **Impersonação**: N/A (§1.2).
- **Nenhum dado sensível novo** em DTO, log ou mensagem. `AUTH_RATE_LIMITED` e `AUTH_FORBIDDEN_ORIGIN` são
  genéricos por construção e não revelam se o e-mail existe.
- **Regras do Firestore**: sem mudança.
- **ASVS 5.0 L1 atendidos** por esta entrega: **3.4.1** (`Strict-Transport-Security` em todas as respostas,
  `max-age` ≥ 1 ano — o default do nosecone é `31536000` com `includeSubDomains`) e **3.4.2** (CORS com
  allowlist, sem reflexão incondicional).

---

## 9. Testes e validação visual

### 9.1 O que Vitest prova

O CI roda `pnpm turbo run lint typecheck test` (`.github/workflows/ci.yml:38`), e `build` depende de
`test` (`turbo.json:17`) — teste quebrado bloqueia build.

| # | Alvo | Onde | Casos |
|---|---|---|---|
| T1 | `CORS_ORIGIN` no env tipado | `apps/api/__tests__/corsOriginEnv.test.ts` | ausente → `undefined` sem lançar (**prova que o build não passou a exigir**); presente → parseada |
| T2 | Decisão de origem | `apps/api/__tests__/corsOrigin.test.ts` | sem `Origin` → permite, sem headers CORS · na lista → ecoa + `Vary` · fora → 403 `AUTH_FORBIDDEN_ORIGIN` · preflight permitido → 204 com headers · preflight negado → 204 **sem** ACAO · **coringa nunca aparece** · lista com espaços/vírgula final |
| T3 | Gate de produção | `apps/api/__tests__/corsOriginBoot.test.ts` | `NODE_ENV=production` sem a var → `register()` rejeita · com a var → resolve · dev sem a var → resolve com default localhost |
| T4 | Builder de CSP | `packages/security/__tests__/csp.test.ts` | `apis.google.com` em `script-src` · `authDomain` em `frame-src` · `NEXT_PUBLIC_API_URL` em `connect-src` · **COOP é `same-origin-allow-popups`** · **COEP desligado** · `frame-ancestors 'none'` · web emite `Content-Security-Policy-Report-Only`, app emite `Content-Security-Policy` · GA só com a env |
| T5 | NO-OP sem chave | `packages/security/__tests__/rateLimit.test.ts` | sem `ARCJET_KEY` → `{ allowed: true, enforced: false }` e **zero chamada de rede** (mock do `arcjet` não invocado) |
| T6 | Mapeamento do erro | `apps/app/__tests__/apiErrorCopy.test.ts` (já existe, testa os 3 idiomas em `:42-52`) | `AUTH_RATE_LIMITED` resolve copy nos 3 idiomas; `retryAfterSeconds` lido do header |
| T7 | Paridade i18n | `packages/internationalization/__tests__/parity.test.ts:55` | automático, sem editar |

**Setup novo necessário**: `packages/security` não tem suíte hoje. Precisa de `vitest.config.mts`
(copiar o de `packages/auth`, environment `node`) + `"test": "NODE_ENV=test vitest run"` no
`package.json`. Os outros `packages/*` com teste não declaram `vitest` localmente (hoist do pnpm) — seguir
o padrão. `apps/api` já tem 16 arquivos de teste e o padrão exato para env está em
`apps/api/__tests__/serviceAccountEnv.test.ts` (`vi.resetModules()` + `await import("@/env")`).

### 9.2 O que só o browser prova (`agent-browser`, obrigatório — regra de ouro 11)

CSP é **runtime puro**: nenhum teste unitário prova que a política não quebra a tela.

| # | Fluxo | Por que só no browser |
|---|---|---|
| V1 | Login com Google no `apps/app`, **até o redirect completar** | Prova COOP + `frame-src` + `apis.google.com`. Parar no clique não prova nada (§3.5) |
| V2 | Login com Google no `apps/web` | Mesmo, com CSP `Report-Only` |
| V3 | CRUD de `entities` (lista, criar, editar, excluir) | Prova `connect-src` com `NEXT_PUBLIC_API_URL` |
| V4 | Avatar no `ProfileDropdown` | `img-src lh3.googleusercontent.com` |
| V5 | Troca de tema light↔dark | `next-themes` injeta script **e** style inline |
| V6 | Troca de idioma + mobile 390×844 | Regressão geral |
| V7 | **Console limpo**: zero `Refused to …` em todas as telas | É o sintoma exclusivo de CSP |
| V8 | Aba Network: `Content-Security-Policy` presente em `app`/`api`, `-Report-Only` em `web`; nenhum `Access-Control-Allow-Origin: *` | Prova direta dos sinais de pronto |
| V9 | 21 POSTs em `/auth/sign-in` → 429 com `Retry-After` | Só com `ARCJET_KEY` configurada |
| V10 | `curl -H "Origin: https://evil.example"` → 403 `AUTH_FORBIDDEN_ORIGIN` | — |

Rodar os comandos do `agent-browser` **em sequência** (chamadas concorrentes travam o daemon).

### 9.3 Critérios de aceite

Ficam para o `/test` gerar no formato §9.1 do guia. Os insumos estão em §9.1/§9.2 e nos sinais de pronto
da spec (`:128-133`), com a ressalva do §1.4 (o formulário de senha não é coberto).

---

## 10. Blueprint técnico

### 10.1 `packages/security/middleware.ts` — o builder de CSP

```ts
import { defaults, type Options } from "@nosecone/next";
import { nosecone } from "nosecone";

export { createMiddleware as securityMiddleware } from "@nosecone/next";

export type SecurityHeadersInput = {
    /** Origens extras por diretiva, levantadas do env de cada app. */
    scriptSrc?: string[];
    connectSrc?: string[];
    imgSrc?: string[];
    frameSrc?: string[];
    /** `true` emite Content-Security-Policy-Report-Only em vez do bloqueante. */
    reportOnly?: boolean;
};

/**
 * O popup de login do Firebase depende de `window.opener`, que a política
 * `same-origin` corta; e `require-corp` exigiria CORP no avatar servido pelo
 * Google. Ambos derrubam o login, então a base do nosecone é ajustada aqui.
 */
const browserAppBase = {
    ...defaults,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginEmbedderPolicy: false,
} satisfies Options;

export function buildBrowserAppOptions(input: SecurityHeadersInput): Options { /* … */ }
export function buildApiOptions(): Options { /* … */ }

export function applySecurityHeaders<T extends Response>(
    response: T,
    options: Options,
    reportOnly = false
): T {
    const headers = nosecone(options);
    for (const [key, value] of headers.entries()) {
        const name =
            reportOnly && key === "content-security-policy"
                ? "content-security-policy-report-only"
                : key;
        response.headers.set(name, value);
    }
    return response;
}
```

### 10.2 `packages/security/index.ts` — limitador estruturado (aditivo)

```ts
import arcjet, { slidingWindow, request } from "@arcjet/next";
import { keys } from "./keys";

export type RateLimitResult =
    | { allowed: true; enforced: boolean }
    | { allowed: false; reason: "rate-limit" | "bot" | "denied"; retryAfterSeconds: number | null };

const RATE_LIMIT_INTERVAL = "60s";
const RATE_LIMIT_MAX = 20;

export const isRateLimitEnforced = (): boolean => Boolean(keys().ARCJET_KEY);

export const checkRateLimit = async (sourceRequest?: Request): Promise<RateLimitResult> => {
    const arcjetKey = keys().ARCJET_KEY;
    if (!arcjetKey) {
        return { allowed: true, enforced: false };
    }

    const aj = arcjet({
        key: arcjetKey,
        characteristics: ["ip.src"],
        rules: [slidingWindow({ mode: "LIVE", interval: RATE_LIMIT_INTERVAL, max: RATE_LIMIT_MAX })],
    });

    const decision = await aj.protect(sourceRequest ?? (await request()));
    if (!decision.isDenied()) {
        return { allowed: true, enforced: true };
    }

    const reason = decision.reason;
    return {
        allowed: false,
        reason: reason.isRateLimit() ? "rate-limit" : reason.isBot() ? "bot" : "denied",
        retryAfterSeconds: reason.isRateLimit() ? reason.reset : null,
    };
};
```

`secure()` (`index.ts:12-50`) fica **intocado** — 3 consumidores vivos.

### 10.3 `apps/api/env.ts` — opcional, de propósito

```diff
     server: {
         FIREBASE_ADMIN_PROJECT_ID: z.string().min(1),
         FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email(),
         FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1),
+        // Lista separada por vírgula. Opcional aqui de propósito: `createEnv`
+        // valida eagerly e o webhook importa este módulo, então torná-la
+        // obrigatória faria o build passar a exigi-la em qualquer ambiente.
+        // A exigência de produção é aplicada no boot, em `instrumentation.ts`.
+        CORS_ORIGIN: z.string().optional(),
     },
     client: {},
     runtimeEnv: {
         …
+        CORS_ORIGIN: process.env.CORS_ORIGIN,
     },
```

### 10.4 `apps/api/(shared)/lib/cors.ts` — novo

```ts
const DEV_ORIGINS = ["http://localhost:3000", "http://localhost:3001"];

export function parseAllowedOrigins(raw: string | undefined): string[] {
    return (raw ?? "").split(",").map((o) => o.trim()).filter(Boolean);
}

export function resolveAllowedOrigins(raw: string | undefined, isProduction: boolean): string[] {
    const configured = parseAllowedOrigins(raw);
    if (configured.length > 0) {
        return configured;
    }
    return isProduction ? [] : DEV_ORIGINS;
}

/** Sem header `Origin` é chamada servidor-a-servidor, não sujeita a CORS. */
export function isOriginAllowed(origin: string | null, allowed: string[]): boolean {
    return origin === null || allowed.includes(origin);
}
```

### 10.5 `apps/api/proxy.ts` — reescrita

```ts
export function proxy(request: NextRequest) {
    const origin = request.headers.get("origin");

    if (!isOriginAllowed(origin, allowedOrigins)) {
        logBlocked("origin", request);
        return request.method === "OPTIONS"
            ? new NextResponse(null, { status: 204 })          // sem ACAO: o browser barra
            : NextResponse.json(
                  { error: { code: "AUTH_FORBIDDEN_ORIGIN" } },
                  { status: HTTP_STATUS.FORBIDDEN }
              );
    }

    if (request.method === "OPTIONS") {
        return withSecurityHeaders(
            new NextResponse(null, { status: 204, headers: corsHeadersFor(origin) })
        );
    }

    if (isRateLimitedPath(request.nextUrl.pathname)) {
        const decision = await checkRateLimit(request);
        if (!decision.allowed) {
            logBlocked(decision.reason, request);
            const response = NextResponse.json(
                { error: { code: "AUTH_RATE_LIMITED" } },
                { status: HTTP_STATUS.TOO_MANY_REQUESTS }
            );
            if (decision.retryAfterSeconds !== null) {
                response.headers.set("Retry-After", String(decision.retryAfterSeconds));
            }
            return withSecurityHeaders(applyCors(response, origin));
        }
    }

    return withSecurityHeaders(applyCors(NextResponse.next(), origin));
}
```

> ⚠️ `proxy` passa a ser `async` (o `checkRateLimit` é assíncrono). O Next aceita proxy assíncrono — é o
> que `apps/app/proxy.ts:63` e `apps/web/proxy.ts:40` já fazem.

### 10.6 `apps/api/instrumentation.ts` — gate de produção + aviso

```diff
 export const register = async () => {
     if (process.env.NEXT_RUNTIME !== "nodejs") {
         return;
     }
+
+    if (process.env.NODE_ENV === "production" && !process.env.CORS_ORIGIN) {
+        throw new Error(
+            "CORS_ORIGIN is required in production: set the comma-separated list of " +
+                "origins allowed to call this API."
+        );
+    }
+
+    if (!process.env.ARCJET_KEY) {
+        console.warn(
+            "[security] rate limiting is DISABLED (no ARCJET_KEY). " +
+                "Public auth routes accept unlimited requests."
+        );
+    }
+
     const { getFirestoreAdmin } = await import("@repo/auth/server");
     getFirestoreAdmin();
 };
```

### 10.7 Tabela `error.code` → status

| `error.code` | Status | Quando | i18n |
|---|---|---|---|
| `AUTH_FORBIDDEN_ORIGIN` | 403 | `Origin` presente e fora da allowlist | ✅ **já existe** (`utils.ts:25,67,107`) |
| `AUTH_RATE_LIMITED` | 429 | Limite estourado em rota pública de auth | 🆕 3 idiomas |

Resposta de exemplo (429):

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 43
Content-Type: application/json
Access-Control-Allow-Origin: http://localhost:3000
Vary: Origin
Content-Security-Policy: default-src 'none'; …

{ "error": { "code": "AUTH_RATE_LIMITED" } }
```

### 10.8 Env nova / alterada

| Var | App | Obrigatória? | Default |
|---|---|---|---|
| `CORS_ORIGIN` | `api` | Opcional no env tipado; **exigida no boot em produção** | dev: `localhost:3000,3001`; prod: **nenhum** (crash) |
| `ARCJET_KEY` | `api` (nova consumidora), `app`, `web` | Opcional (já era) | ausente → limite desligado, com aviso |

Docs a atualizar: `docs/SETUP.md:57` (formato de lista + obrigatória em produção),
`apps/api/.env.example:14-16`, `docs/SECURITY.md`.
⚠️ `turbo.json` tem `env: []` em `lint`/`typecheck`/`test` — **não adicionar** `CORS_ORIGIN` lá; as tasks
são herméticas de propósito e T1–T3 escrevem em `process.env` in-process.

---

## 11. Ordem de implementação

Camada do repo: `packages/*` → `apps/api` → `apps/app`/`apps/web` → i18n.

| # | Passo | Arquivos | "Pronto" verificável |
|---|---|---|---|
| **P0** | Suíte no `packages/security` | `packages/security/vitest.config.mts` (novo), `package.json` (script `test`) | `pnpm --filter @repo/security test` roda (0 testes, exit 0) |
| **P1** | Builder de CSP + `applySecurityHeaders` | `packages/security/middleware.ts`, `packages/security/__tests__/csp.test.ts` | T4 verde: COOP `same-origin-allow-popups`, COEP off, `frame-ancestors 'none'`, Report-Only comuta |
| **P2** | `checkRateLimit` estruturado | `packages/security/index.ts`, `__tests__/rateLimit.test.ts` | T5 verde; `secret()`… `secure()` intocado e seus 3 consumidores compilam |
| **P3** | `retryAfterSeconds` no `FormattedError` | `packages/shared/utils/helpers/formattedError.ts` | `pnpm --filter @repo/shared test` verde; campo é `null` quando não há header |
| **P4** | `apps/api` declara `@repo/security`; `CORS_ORIGIN` no env; helper de origem | `apps/api/package.json`, `apps/api/env.ts`, `apps/api/(shared)/lib/cors.ts`, `__tests__/corsOriginEnv.test.ts` | T1 verde; **`pnpm --filter api build` continua sem exigir `CORS_ORIGIN`** (prova A/B) |
| **P5** | Proxy da api: origem → rate limit → cabeçalhos | `apps/api/proxy.ts`, `__tests__/corsOrigin.test.ts` | T2 verde; `curl` sem `Origin` passa; `Origin` alheia → 403; coringa nunca aparece |
| **P6** | Gate de produção + aviso de NO-OP no boot | `apps/api/instrumentation.ts`, `__tests__/corsOriginBoot.test.ts` | T3 verde; `NODE_ENV=production next start` sem a var falha no boot com mensagem clara |
| **P7** | CSP bloqueante na `apps/app` + limpeza do playground | `apps/app/proxy.ts`, `apps/app/.../playground/page.tsx:985` | V1, V3, V4, V5, V7, V8 — console sem `Refused to` |
| **P8** | CSP `Report-Only` na `apps/web` | `apps/web/proxy.ts` | V2, V7, V8 — header `-Report-Only` presente |
| **P9** | i18n `AUTH_RATE_LIMITED` × 3 + teste de copy | `translations/packages/shared/utils.ts` (3 pontos), `apps/app/__tests__/apiErrorCopy.test.ts` | T6, T7 verdes (`/i18n-sync`) |
| **P10** | Documentação | `docs/SETUP.md:57`, `apps/api/.env.example:14-16`, `docs/SECURITY.md` | Formato de lista e a exigência de produção documentados |

**Gate final**: `pnpm turbo run lint typecheck test` (o comando exato do CI) + `pnpm check`.

**Commits** (padrão `type(project)`, em inglês, um por app/pacote, na ordem de dependência):
`feat(security)` P0–P2 · `feat(shared)` P3 · `feat(api)` P4–P6 · `feat(app)` P7 · `feat(web)` P8 ·
`feat(internationalization)` P9 · `docs` P10 · `docs(features): api-hardening` por último.
Branch e commit são do `revisor-codigo` — **nada é commitado aqui**.

---

## 12. Riscos

| # | Risco | Detecção no `/develop` |
|---|---|---|
| R1 | 🔴 **COOP mata o login com Google.** O modo mais traiçoeiro: o popup abre, o usuário autentica, o popup fecha — e o app não recebe nada | V1/V2 **até o redirect**. Nunca parar no clique |
| R2 | 🔴 **`securetoken.googleapis.com` faltando em `connect-src`** — quebra **diferida**: o smoke test passa e a sessão morre ~1h depois, quando o refresh de ID token é bloqueado | Conferir a diretiva literal no header (V8), não só "logou" |
| R3 | 🟡 CSP bloqueante na `apps/app` quebra uma tela não visitada | V7 em **todas** as telas + `Report-Only` na web como rede |
| R4 | 🟡 `apps/api` não declara `@repo/security` hoje → o turbo não invalida `api#*` ao mudar o pacote (gêmeo do achado do `ci-pipeline` sobre `apps/web`) | P4 corrige na primeira linha |
| R5 | 🟡 CORS fechado derruba integração que funcionava por acidente. É a falha correta, mas aparece no dia 1 | Default de dev (§4.3) + `.env.example` explícito |
| R6 | 🟡 `proxy` da api vira `async` — muda a assinatura exportada | `pnpm --filter api typecheck` |
| R7 | 🟡 Rate limit derruba usuário legítimo atrás de NAT | 20/min é permissivo de propósito; `Retry-After` deixa o remédio claro |
| R8 | 🟡 `'unsafe-inline'` em `script-src` limita o valor anti-XSS | Assumido e documentado (§3.3), com os 3 pontos de nonce mapeados |
| R9 | 🟡 Sem branch protection ligada, o gate do CI **sinaliza mas não bloqueia** (ressalva da spec `:124`) | Fora da entrega; ação humana |

---

## 13. Pós-entrega

- **Vercel (produção)**: `CORS_ORIGIN` **obrigatória** no projeto da `api` — sem ela o serviço não sobe.
  `ARCJET_KEY` opcional nos três; sem ela, o limite fica desligado (com aviso no boot).
- **Preview deploys**: o domínio efêmero `*.vercel.app` **não** estará em `CORS_ORIGIN` e o CORS vai
  recusar — é a mesma classe de armadilha que `engineering-baseline.md:94-95` descreve para os
  *Authorized domains* do Firebase. Documentar em `docs/SETUP.md`.
- **Firestore**: nenhum índice, nenhuma regra.
- **Rollback**: reverter os commits basta. Zero dado gravado, zero migração, nada órfão.
- **O que um fork precisa fazer**: (1) definir `CORS_ORIGIN` antes do primeiro deploy; (2) opcionalmente
  criar chave no Arcjet; (3) **acrescentar à CSP todo domínio de terceiro que introduzir** — é o custo
  herdado que a spec (`:105`) antecipa, e o primeiro candidato é `js.stripe.com` quando
  `billing-subscription` levar o checkout ao browser (`script-src https://js.stripe.com`,
  `frame-src https://js.stripe.com https://hooks.stripe.com`, `connect-src https://api.stripe.com`).

---

## 14. Achados para o `/spec --sync` (não corrigidos aqui)

- 🔴 **`specs/api-hardening.md:99` está errada**: a `apps/web` é a app **menos** exposta a CSP, não a mais.
  Quem tem analytics é a `apps/app`.
- 🔴 **`apps/app/app/layout.tsx:3` importa `@repo/analytics` sem `apps/app/package.json` declarar** —
  funciona por hoisting do pnpm, e o turbo não invalida `app#*` quando o pacote muda. Mesma classe do
  achado do `ci-pipeline` sobre a `apps/web`.
- 🟡 `apps/app/next.config.ts:19` lista `www.google.com` em `images.domains` sem uso e sem
  `remotePattern`; `domains` está deprecado no Next 16.
- 🟡 As rotas `/auth/sign-in` e `/auth/sign-up` da api **não têm nenhum consumidor** e não seguem o
  contrato `{ error: { code } }` do repo — devolvem string crua (`sign-in/route.ts:12`,
  `sign-up/route.ts:26,40`). Candidatas a alinhar ou remover.
- 🟡 Rate limit em `/api/auth/session` das front-ends (troca de ID token por cookie) ficou fora do corte.

---

## Perguntas em aberto (decididas por padrão)

Modo autônomo: nada foi perguntado. Todas as ambiguidades foram decididas abaixo. As três primeiras são as
recomendações que a **própria spec** já registra (`:137-143`).

| # | Pergunta | Decisão tomada | Alternativa descartada | Por quê | Custo de reverter |
|---|---|---|---|---|---|
| Q1 | Contador do rate limit: Arcjet ou Upstash? | **Arcjet** com `slidingWindow`, `ip.src` | Upstash Redis + `@upstash/ratelimit` | Já instalado (`packages/security/package.json:11`), chave já opcional, segue o opt-in de `index.ts:12-18`. Upstash adicionaria dependência, env e conta a todo fork | **Baixo** — `checkRateLimit()` isola o motor num arquivo; trocar não toca o proxy |
| Q2 | CSP bloqueante ou somente-relatório? | **`Report-Only` na `web`; bloqueante em `app` e `api`** | Tudo bloqueante, ou tudo Report-Only | Recomendação da spec. Ironia registrada: a análise mostrou que a `web` é a **mais limpa** — mantida assim mesmo, como rede de segurança para o que a landing venha a carregar | **Trivial** — um booleano por app |
| Q3 | `CORS_ORIGIN` ausente em produção: falhar ou cair para a origem do app? | **Falhar**, mas **no boot** (`instrumentation.ts`), não no env tipado | (a) default silencioso; (b) `z.string().min(1)` em `env.ts` | Falhar é a recomendação da spec — o default silencioso é o que produziu o coringa. Mas (b) faria o `pnpm build` exigir a var em **qualquer** ambiente, repetindo o efeito das `FIREBASE_ADMIN_*` que a spec `:37-40` alerta. `instrumentation.ts` já existe **para exatamente este padrão**, e o docstring dele o descreve | **Baixo** — 4 linhas num arquivo |
| Q4 | `script-src` com `'unsafe-inline'` ou nonce? | **`'unsafe-inline'` no MVP**, nonce como follow-up com os 3 pontos mapeados | Nonce agora | next-themes, o bootstrap do App Router e o gtag são todos inline sem nonce fiado. Fiar nonce toca `packages/design-system`, `packages/analytics` e o middleware dos 2 apps — é uma tarefa própria. As outras diretivas já entregam valor real | **Médio** — o follow-up é a fiação, não a reversão |
| Q5 | 🔴 Reusar `USERS_AUTH_RATE_LIMITED` ou criar `AUTH_RATE_LIMITED`? | **Criar `AUTH_RATE_LIMITED`** | Reusar | São camadas diferentes: `USERS_AUTH_RATE_LIMITED` é o limite **do Firebase** (`toolkit-error-codes.ts:17`); o novo é o **da nossa borda**. Conflatar mata a distinção onde ela mais importa. Marcado 🔴 por ser **contrato público**: um fork que já mapeie códigos vê uma chave nova. É aditivo (nada existente muda), logo não-quebrante | **Baixo**, mas é adição de contrato — vale o olhar do usuário |
| Q6 | Onde entra o rate limit: proxy da api ou wrapper por rota? | **Proxy, filtrado por pathname** | Wrapper por rota | Um lugar; as rotas de auth não têm guard onde pendurar; o wrapper some na 4ª rota que alguém criar | **Baixo** |
| Q7 | Qual limite inicial? | **20 req / 60 s por IP**, `slidingWindow` | 5/min, ou `fixedWindow` | A spec (`:115`) manda começar permissivo. Humano faz 3–5 tentativas/min; 20 acomoda NAT e ainda derruba força bruta. `slidingWindow` é o que a nota de engenharia indica e não tem o efeito de borda do `fixedWindow` | **Trivial** — 2 constantes |
| Q8 | O corte cobre o formulário de login? | **Não, e isso é declarado.** O limite cobre a superfície da API | Fingir que cobre | Levantamento §1.4: o login por senha das duas apps vai direto ao `identitytoolkit` pelo browser e nunca toca a api. Entregar sem dizer isso seria vender proteção inexistente | **N/A** — é honestidade, não código |
| Q9 | Mexer no `SignInForm.tsx` para o estado "muitas tentativas"? | **Não.** O `errorAlert` existente (`:39-40`) já mostra a copy traduzida assim que o código entra em `apiErrors` | Componente de cooldown com contagem | Regra de ouro 10 (mudança mínima). O sinal de pronto da spec pede "mensagem traduzida, não erro cru" — atendido | **Trivial** |
| Q10 | `Retry-After` (protocolo) ou contagem regressiva na UI? | **`Retry-After` + `retryAfterSeconds` no `FormattedError`**; contagem visível fora do corte | Contagem na tela | A "indicação de quando tentar de novo" da spec (`:79`) é o header. A contagem exige interpolação nova nos 3 idiomas e é UI, não borda | **Baixo** — o dado já chega à tela |
| Q11 | CORS multi-origem ecoando `Origin`? | **Sim, após checar a allowlist**, com `Vary: Origin` | Uma origem só | `apps/api/.env.example:14-15` **já promete** lista, e o código atual quebra silenciosamente com duas origens. ASVS 3.4.2 proíbe reflexão **incondicional** — pós-allowlist é a implementação canônica | **Baixo** |
| Q12 | Requisição sem header `Origin`: permitir? | **Permitir**, sem emitir headers CORS | Bloquear | Espelha `packages/auth/session.ts:68-70`. É o caso servidor-a-servidor (`apps/app/lib/server/apiServerClient.ts:24`, prefetch RSC) — bloquear derrubaria o próprio app. CORS é controle de browser; não substitui guard | **Baixo** |
| Q13 | Limitar `/webhooks/payments`? | **Não** | Limitar tudo | A Stripe faz retry agressivo; um 429 nosso viraria plano/cobrança perdidos. `/health` também fora (é o que o monitor bate) | **Trivial** |
| Q14 | Observabilidade mínima do bloqueio? | **`console.warn` de 1 linha, sem PII** + aviso único no boot + os próprios status/headers | Log estruturado | Log estruturado é de `observability-logging` (spec `:89`). IP é dado pessoal sob LGPD; `compliance-trust-baseline.md:167` manda reter o mínimo | **Trivial** — 1 lugar para migrar |
| Q15 | O `src` do GitHub no playground? | **Remover** (`apps/app/.../playground/page.tsx:985`) | Liberar `github.com` na CSP | 1 linha, contra liberar um domínio externo na política de produção de todo fork por causa de uma vitrine interna | **Trivial** |
| Q16 | `secure()` vira o limitador ou nasce função nova? | **Função nova, `secure()` intocado** | Refatorar `secure()` | `secure()` comunica falha lançando `Error` com string (`index.ts:45`) — sem código, sem tempo de reset. E tem 3 consumidores vivos | **Baixo** |
