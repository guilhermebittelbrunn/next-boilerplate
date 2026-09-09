# Handoff — Endurecimento da borda da API

> Origem: `analyze/plan.md` (11 passos, P0–P10). Data: 2026-09-02.
> Branch em uso: `api-hardening-flow`. **Nada commitado, nada em stage** — tudo no working tree.
> Rodou em **modo autônomo**: nenhuma pergunta ao usuário. Ver `## Pendências e decisões da implementação`.

---

## 1. Blueprint → arquivos (P0–P10)

| # | Passo do plano | Arquivos | Estado |
|---|---|---|---|
| **P0** | Suíte no `packages/security` | `packages/security/vitest.config.mts` (novo), `packages/security/package.json` (script `test` + dep `nosecone`) | ✅ Entra no turbo como `@repo/security#test` (21 → **22** tasks executadas) |
| **P1** | Builder de CSP + `applySecurityHeaders` | `packages/security/middleware.ts` (reescrito), `packages/security/__tests__/csp.test.ts` (novo, 18 testes) | ✅ |
| **P2** | `checkRateLimit` estruturado | `packages/security/index.ts` (aditivo), `packages/security/__tests__/rateLimit.test.ts` (novo, 8 testes) | ✅ `secure()` **intocado**; 3 consumidores compilam |
| **P3** | `retryAfterSeconds` no `FormattedError` | `packages/shared/utils/helpers/formattedError.ts` | ✅ Coberto em `apps/app/__tests__/apiErrorCopy.test.ts` |
| **P4** | `apps/api` declara `@repo/security`; `CORS_ORIGIN` no env; helper de origem | `apps/api/package.json`, `apps/api/env.ts`, `apps/api/(shared)/lib/cors.ts` (novo), `apps/api/__tests__/corsOriginEnv.test.ts` (novo) | ✅ **Prova A/B feita**: `next build` da api passa **sem** `CORS_ORIGIN` no ambiente |
| **P5** | Proxy da api: origem → rate limit → cabeçalhos | `apps/api/proxy.ts` (reescrito), `apps/api/__tests__/corsOrigin.test.ts` (novo, 20 testes) | ✅ `proxy` virou `async`; coringa eliminado |
| **P6** | Gate de produção + aviso de NO-OP no boot | `apps/api/instrumentation.ts`, `apps/api/__tests__/corsOriginBoot.test.ts` (novo, 5 testes) | ✅ |
| **P7** | CSP bloqueante na `apps/app` + limpeza do playground | `apps/app/proxy.ts`, `apps/app/env.ts`, `apps/app/.../playground/page.tsx`, `apps/app/shared/components/ui/Sidebar.tsx`, `apps/app/__tests__/securityHeaders.test.ts` (novo, 7 testes) | ✅ **Desvio D1** abaixo (Sidebar) |
| **P8** | CSP `Report-Only` na `apps/web` | `apps/web/proxy.ts`, `apps/web/env.ts`, `apps/web/__tests__/securityHeaders.test.ts` (novo, 4 testes) | ✅ **Desvio D3** abaixo (`skipValidation`) |
| **P9** | i18n `AUTH_RATE_LIMITED` × 3 + teste de copy | `packages/internationalization/translations/packages/shared/utils.ts`, `apps/app/__tests__/apiErrorCopy.test.ts` | ✅ |
| **P10** | Documentação | `docs/SETUP.md`, `docs/SECURITY.md`, `apps/api/.env.example` | ✅ |
| — | **Fora do plano** (achado em runtime) | `packages/security/keys.ts`, `packages/security/__tests__/keys.test.ts` (novo, 5 testes) | 🔴 **Desvio D2** — sem isso a API **não sobe** |

### Arquivos novos (10)

```
packages/security/vitest.config.mts
packages/security/__tests__/csp.test.ts
packages/security/__tests__/rateLimit.test.ts
packages/security/__tests__/keys.test.ts
apps/api/(shared)/lib/cors.ts
apps/api/__tests__/corsOrigin.test.ts
apps/api/__tests__/corsOriginBoot.test.ts
apps/api/__tests__/corsOriginEnv.test.ts
apps/app/__tests__/securityHeaders.test.ts
apps/web/__tests__/securityHeaders.test.ts
```

### Arquivos alterados (20)

`packages/security/{index,keys,middleware}.ts` · `packages/security/package.json` ·
`packages/shared/utils/helpers/formattedError.ts` ·
`packages/internationalization/translations/packages/shared/utils.ts` ·
`apps/api/{env,instrumentation,proxy}.ts` · `apps/api/package.json` · `apps/api/.env.example` ·
`apps/app/{env,proxy}.ts` · `apps/app/shared/components/ui/Sidebar.tsx` ·
`apps/app/app/[locale]/(authenticated)/(common)/(pages)/playground/page.tsx` ·
`apps/app/__tests__/apiErrorCopy.test.ts` · `apps/web/{env,proxy}.ts` ·
`docs/SETUP.md` · `docs/SECURITY.md` · `pnpm-lock.yaml`

> `specs/api-hardening.md` aparece modificado no working tree — mudança do `/analyze` (`status: approved` → `in-progress`), **não desta etapa**.

---

## 2. Contrato

### Superfície pública nova (`@repo/security`)

| Export | Onde | Consumidores |
|---|---|---|
| `buildBrowserAppOptions(input)` | `middleware.ts` | `apps/app/proxy.ts`, `apps/web/proxy.ts` |
| `buildApiOptions()` | `middleware.ts` | `apps/api/proxy.ts` |
| `applySecurityHeaders(response, options, reportOnly?)` | `middleware.ts` | os 3 proxies |
| `SecurityHeadersInput` (tipo) | `middleware.ts` | os 3 proxies |
| `checkRateLimit(request?)` → `RateLimitResult` | `index.ts` | `apps/api/proxy.ts` |
| `isRateLimitEnforced()` | `index.ts` | nenhum ainda (diagnóstico) |
| `RateLimitResult`, `RateLimitBlockReason` (tipos) | `index.ts` | `apps/api/proxy.ts` |

**Removidos** de `packages/security/middleware.ts`: `noseconeOptions` e `noseconeOptionsWithToolbar`
(**zero consumidores** — confirmado por grep). `securityMiddleware` foi mantido.
`secure()` (`index.ts`) **não foi tocado**: seus 3 consumidores vivos (`apps/app/proxy.ts`,
`apps/web/proxy.ts`, os 2 layouts autenticados) seguem iguais.

### `packages/shared` (aditivo)

`FormattedError` ganha `retryAfterSeconds: number | null`, lido do header `Retry-After`
(só a forma delta-seconds; HTTP-date → `null`). **Nada existente muda.** Impacto: qualquer tela que já
constrói `FormattedError` passa a ter o campo disponível — nenhuma consome ainda (Q10).

### `packages/sdk`

**Nenhuma mudança**, como previsto no plano §6.2.

### Env

| Var | App | Mudança |
|---|---|---|
| `CORS_ORIGIN` | `api` | **Nova** no env tipado, `z.string().optional()`. Exigida **no boot** em produção |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `app`, `web` | Passou a ser **declarada no env tipado** de cada app (antes só `process.env` cru em `packages/auth/client.ts`) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `app` | Declarada no env tipado da app (a CSP só libera GA quando começa com `G-`) |
| `NEXT_PUBLIC_API_URL` | `web` | Declarada localmente — ver **Desvio D3** |
| `ARCJET_KEY` | todos | Sem mudança de contrato; **passa a aceitar string vazia como ausente** (Desvio D2) |

---

## 3. Códigos de erro

| `error.code` | Status | Quando | i18n |
|---|---|---|---|
| `AUTH_RATE_LIMITED` | 429 | Limite estourado em rota pública de auth da API | 🆕 **pt-br / en / es** adicionados em `translations/packages/shared/utils.ts` |
| `AUTH_FORBIDDEN_ORIGIN` | 403 | `Origin` presente e fora da allowlist | ✅ Já existia nos 3 idiomas — reusado, zero i18n novo |

Paridade confirmada: `pnpm --filter @repo/internationalization test` → **2 arquivos / 11 testes, verde**.
Copy dos 3 idiomas congelada em `apps/app/__tests__/apiErrorCopy.test.ts`, incluindo a asserção de que
`AUTH_RATE_LIMITED` **não** colide com `USERS_AUTH_RATE_LIMITED` (o limite do Firebase).

---

## 4. Desvios do plano

### 🔴 D2 — `ARCJET_KEY=""` derrubava a API (fora do plano, obrigatório)

**Sintoma medido**: com o P4–P5 aplicados, `pnpm --filter api dev` subia e **toda requisição
retornava 500**: `Invalid environment variables: ARCJET_KEY — Invalid string: must start with "ajkey_"`.

**Causa**: `packages/security/keys.ts` validava `z.string().startsWith("ajkey_").optional()`. Uma string
**vazia** é uma string, não `undefined` — e `apps/api/.env.example` (e o `.env` real) **declaram
`ARCJET_KEY=""`** justamente porque a chave é opcional. Até agora `apps/api` não importava o pacote, então
a armadilha estava dormente; o P4 a acordou. **Qualquer fork que copie o `.env.example` cairia nela.**

**Correção**: `z.preprocess` que trata string vazia/só-espaços como ausente (mesmo padrão já usado em
`packages/analytics/keys.ts`). 5 testes novos em `packages/security/__tests__/keys.test.ts`.
Afeta também `apps/app` e `apps/web`, que importam o mesmo `keys()` — para melhor.

**Alternativa descartada**: mudar só o `.env.example` para não declarar a var. Descartada porque não
protege quem já tem `.env` com a linha vazia, e a documentação diz "opcional".

### 🟡 D1 — o avatar do GitHub também estava no `Sidebar`, não só no playground

O plano (Q15) mandou remover `https://github.com/shadcn.png` de
`playground/page.tsx:985`. Levantei que o **mesmo `src` está em
`apps/app/shared/components/ui/Sidebar.tsx:73`** — `GlobalSidebar`, renderizado em **toda** página
autenticada (comum e admin). Com CSP bloqueante isso produziria `Refused to load the image` em **todas as
telas**, quebrando o critério V7 do plano.

**Feito**: removido dos dois.
- `Sidebar.tsx`: o `<AvatarImage>` saiu; o `<Avatar>` fica vazio ao lado do texto placeholder
  "company name" (que já era literal antes desta task).
- `playground/page.tsx`: trocado por um **data URI SVG inline** (`SAMPLE_AVATAR`), não por remoção — a
  variante se chama "Image and fallback" e precisa de uma imagem que carregue de verdade. `data:` já está
  em `img-src`. **Verificado no browser**: `naturalWidth: 150`, `complete: true`.

### 🟡 D3 — `apps/web` não enxergava `NEXT_PUBLIC_API_URL` (bug pré-existente)

Ao conferir o header emitido, o `connect-src` da `apps/web` **não continha a URL da API**, embora
`apps/web/.env` a defina. Causa: `apps/web/env.ts` tem `skipValidation: true`, e nesse modo o t3-env
**não mescla os `extends`** — `env.NEXT_PUBLIC_*` vindos de `@repo/next-config/keys` são todos
`undefined` na web.

**Prova independente**: a landing **não renderiza nenhum link para `localhost:3000`**, apesar de
`NEXT_PUBLIC_APP_URL` estar definida — ou seja, o CTA "Ir para o painel" do header já cai no fallback
hoje, silenciosamente. **Não é regressão desta task.**

**Feito (escopo mínimo)**: declarei `NEXT_PUBLIC_API_URL` no bloco `client`/`runtimeEnv` **do próprio**
`apps/web/env.ts`, como já fiz com o auth domain. A CSP ficou correta sem mexer no comportamento do resto
da landing. **Não corrigi o `skipValidation`** — isso muda header/CTA/pricing da web inteira e é tarefa
própria. Registrado para o `/spec --sync`.

### 🟡 D4 — três adições à política além do que o plano listou

1. **`child-src` espelha `frame-src`.** O default do nosecone traz `childSrc: ['none']`; navegadores
   antigos usam `child-src` como fallback de `frame-src`, e deixá-lo em `'none'` arriscaria o iframe do
   Firebase. Custo zero.
2. **`worker-src 'self' blob:`.** Next/Turbopack cria workers a partir de `blob:`.
3. **API com `Cross-Origin-Resource-Policy: cross-origin` e COEP desligado.** O default do nosecone é
   `same-origin`; a API existe **para** ser lida por outra origem, e o controle de acesso ali é a
   allowlist de CORS + os guards. Evita uma classe de falha sutil sem enfraquecer nada relevante.

### 🟢 D5 — `apps/api` não ganhou `CORS_ORIGIN` no `.env`

O `.env.example` passou a trazer `CORS_ORIGIN="http://localhost:3000,http://localhost:3001"`, mas **não
editei `apps/api/.env`** (arquivo local, não versionado). Foi de propósito: manter o `.env` sem a var
serviu de **prova A/B** de que o default de desenvolvimento funciona e de que o `next build` não passou a
exigi-la.

---

## 5. Validação — números reais

### Gates

| Comando | Resultado |
|---|---|
| `pnpm check` | **402 arquivos, 0 erros, 0 warnings** |
| `pnpm turbo run lint typecheck test` | **22/22 tasks OK** (antes: 21 — `@repo/security#test` é nova) |
| `pnpm --filter @repo/internationalization test` | 2 arquivos / **11 testes** verdes (paridade dos 3 idiomas) |
| `cd apps/api && pnpm exec next build` | ✅ **sem `CORS_ORIGIN` no ambiente** — prova A/B do P4 |

### Testes por workspace (antes → depois)

| Workspace | Arquivos | Testes | Δ |
|---|---|---|---|
| `@repo/security` | 0 → **3** | 0 → **31** | +31 (suíte inexistente antes) |
| `api` | 16 → **19** | 118 → **145** | +27 |
| `app` | 21 → **22** | 135 → **146** | +11 |
| `web` | 1 → **2** | 15 → **19** | +4 |
| `@repo/shared` | 1 | 15 | 0 |
| `@repo/internationalization` | 2 | 11 | 0 |
| `@repo/auth` · `@repo/payments` | 2 · 1 | 29 · 8 | 0 |

**Total: +8 arquivos de teste, +73 testes.**

### Cobertura T1–T7 do plano

| # | Alvo | Onde | Estado |
|---|---|---|---|
| T1 | `CORS_ORIGIN` opcional no env | `apps/api/__tests__/corsOriginEnv.test.ts` | ✅ 2 |
| T2 | Decisão de origem + proxy | `apps/api/__tests__/corsOrigin.test.ts` | ✅ 20 |
| T3 | Gate de produção no boot | `apps/api/__tests__/corsOriginBoot.test.ts` | ✅ 5 |
| T4 | Builder de CSP | `packages/security/__tests__/csp.test.ts` | ✅ 18 |
| T5 | NO-OP sem `ARCJET_KEY` | `packages/security/__tests__/rateLimit.test.ts` | ✅ 8 |
| T6 | Copy do erro + `retryAfterSeconds` | `apps/app/__tests__/apiErrorCopy.test.ts` | ✅ +4 |
| T7 | Paridade i18n | `packages/internationalization/__tests__/parity.test.ts` | ✅ automático |
| — | Fiação real do header por app | `apps/app`/`apps/web` `__tests__/securityHeaders.test.ts` | ✅ +11 (extra) |
| — | `ARCJET_KEY` vazia | `packages/security/__tests__/keys.test.ts` | ✅ 5 (extra, D2) |

---

## 6. Validação visual — o que foi provado

Ferramenta: `agent-browser 0.27.0`, comandos rodados **estritamente em sequência**.
Apps subidos: `api` (3002), `app` (3000), `web` (3001). Conta de teste: **`qa-api-hardening@example.com`**
(criada pelo próprio fluxo de sign-up; ver pendência P3 abaixo).
Screenshots: `docs/features/api-hardening/develop/screenshots/`.

### Console: **zero `Refused to …` em todas as telas**

Contagem de `Refused to|Content Security Policy` no console após cada navegação: **0**, sempre —
landing da web, sign-in da app, sign-up, home do painel comum, lista de entidades, formulário de criar,
formulário de editar, playground, troca de tema, troca de idioma, mobile.
Na `apps/web` (Report-Only) **nenhuma violação foi reportada** — a política já está calibrada para
promover a bloqueante quando se quiser.

### Fluxos percorridos (mapa V1–V10 do plano §9.2)

| # | Fluxo | Resultado |
|---|---|---|
| V1 | Login com Google na `apps/app` **até o redirect** | ⚠️ **NÃO EXECUTADO** — não há conta Google disponível neste ambiente. Ver "o que não foi provado" |
| V2 | Login com Google na `apps/web` | ⚠️ **NÃO EXECUTADO** — mesmo motivo |
| V3 | CRUD de `entities` | ✅ **completo**: lista vazia → criar → lista com o registro → abrir edição por id → excluir → volta ao estado vazio. Prova `connect-src` + CORS de ponta a ponta |
| V4 | Avatar no `ProfileDropdown` | ⚠️ **parcial** — o dropdown abre e renderiza o fallback de iniciais (conta de e-mail/senha não tem `photoURL`). A origem `lh3.googleusercontent.com` **está** no `img-src` emitido (verificado no header), mas nenhuma imagem do Google foi carregada de fato |
| V5 | Troca de tema light ↔ dark | ✅ Ambos os temas; **o `Table` do antd respeita o tema**. Prova o script inline do `next-themes` + os estilos inline |
| V6 | Troca de idioma + mobile 390×844 | ✅ pt-br → es → en; mobile 390×844 na lista de entidades e na landing |
| V7 | Console limpo | ✅ **0 violações em todas as telas** |
| V8 | Cabeçalhos na resposta | ✅ `Content-Security-Policy` em `app` e `api`, `-Report-Only` em `web`; **nenhum `Access-Control-Allow-Origin: *`** em lugar nenhum |
| V9 | 21 POSTs em `/auth/sign-in` → 429 + `Retry-After` | ✅ **executado com `ARCJET_KEY` real**: exatamente **20 passaram, da 21ª em diante 429**, com `retry-after: 12`, `{"error":{"code":"AUTH_RATE_LIMITED"}}`, `Access-Control-Allow-Origin` preservado e CSP aplicada. Log: `[security] blocked reason=rate-limit path=/auth/sign-in method=POST` (sem IP/PII) |
| V10 | `curl -H "Origin: https://evil.example"` → 403 | ✅ `403` + `{"error":{"code":"AUTH_FORBIDDEN_ORIGIN"}}`, **sem** `Access-Control-Allow-Origin` |

### Verificações extras de borda (curl, medidas)

- **Sem header `Origin`** → `200`, **nenhum** cabeçalho de CORS emitido (caso servidor→servidor).
- **Origem na allowlist** → ecoa aquela origem + `Vary: Origin`.
- **Preflight permitido** → `204` com `Allow-Methods`/`Allow-Headers`/`Max-Age`.
- **Preflight recusado** → `204` **sem** `Access-Control-Allow-Origin` (o browser barra).
- **Boot sem `ARCJET_KEY`** → `[security] rate limiting is DISABLED (no ARCJET_KEY)…` exatamente **uma vez**.
- **Boot com `ARCJET_KEY`** → aviso **não** aparece.

### Política efetivamente emitida (medida, não estimada)

`apps/app` (bloqueante), em desenvolvimento:

```
default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'self';
frame-ancestors 'none'; manifest-src 'self'; media-src 'self'; worker-src 'self' blob:;
font-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com 'unsafe-eval'
  https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline';
connect-src 'self' http://localhost:3002 https://identitytoolkit.googleapis.com
  https://securetoken.googleapis.com; img-src 'self' data: blob: https://lh3.googleusercontent.com;
frame-src https://<authDomain>; child-src https://<authDomain>;
cross-origin-opener-policy: same-origin-allow-popups
(cross-origin-embedder-policy: ausente)
```

`apps/api` (bloqueante): `default-src 'none'; … connect-src 'none'; frame-ancestors 'none';
form-action 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data:`, com `cross-origin-resource-policy: cross-origin` e
`strict-transport-security: max-age=31536000; includeSubDomains` (ASVS 3.4.1 ✅).

`apps/web`: idêntica à da app **menos** analytics/avatar, emitida como
`content-security-policy-report-only`.

### ⚠️ O que a validação visual **NÃO** provou

1. **Login com Google (V1/V2) — o risco R1 do plano permanece sem prova empírica.** Não há conta Google
   utilizável neste ambiente. O que **está** verificado: `apis.google.com` em `script-src`, o `authDomain`
   em `frame-src` **e** em `child-src`, e `Cross-Origin-Opener-Policy: same-origin-allow-popups` no header
   real (não só no teste unitário). O modo de falha do COOP é **silencioso** (o popup fecha e nada
   acontece), então **isto precisa de um passe manual antes do merge** — está na lista de lacunas.
2. **Carregamento real de `lh3.googleusercontent.com` (V4)** — só provável com login Google.
3. **Comportamento em produção**: `'unsafe-eval'` só entra em desenvolvimento, então a `script-src` de
   produção **não foi exercitada num browser** (só no teste unitário, que cobre os dois modos).
4. **Renovação do ID token via `securetoken.googleapis.com` (risco R2, quebra diferida ~1h)** — a origem
   está na `connect-src` emitida, mas a sessão não foi mantida por uma hora.

---

## 7. Pendências e decisões da implementação

| # | Ponto | Decisão tomada | Alternativa | Custo de reverter |
|---|---|---|---|---|
| P1 | `ARCJET_KEY` vazia quebrava a API | Tratar string vazia como ausente em `packages/security/keys.ts` | Só documentar / mudar o `.env.example` | **Trivial** — 8 linhas em 1 arquivo. Mas sem isso a API **não sobe** num fork padrão |
| P2 | Avatar do GitHub no `Sidebar` | Remover o `<AvatarImage>`; `<Avatar>` fica vazio | Liberar `github.com` na CSP; ou pôr um placeholder próprio | **Trivial**. ⚠️ **Efeito visual**: o cabeçalho da sidebar hoje mostra só o texto "company name". Cabe ao review decidir se quer um placeholder ali |
| P3 | Conta de QA criada | `qa-api-hardening@example.com` criada no projeto Firebase de desenvolvimento pelo fluxo real de sign-up | Não validar o painel | **Baixo** — apagar em Firebase Console → Authentication + doc `user` no Firestore. **A entidade de teste criada já foi excluída pela UI** |
| P4 | `skipValidation` da `apps/web` | Declarar as 2 vars que a CSP precisa localmente; **não** corrigir a causa | Remover `skipValidation` | **Baixo** para o que fiz. A correção real é tarefa própria (muda header/CTA/pricing da web) |
| P5 | `apps/app` importa `@repo/analytics` sem declarar | **Não corrigido** (o plano §14 mandou deixar para o `/spec --sync`). Por isso li `NEXT_PUBLIC_GA_MEASUREMENT_ID` do env tipado da própria app em vez de `extends: [analytics()]` | Declarar a dependência agora | **Trivial** — 1 linha no `package.json` + trocar por `extends` |
| P6 | `noseconeOptions`/`noseconeOptionsWithToolbar` | **Removidos** (0 consumidores; contradiziam a feature ao trazer `contentSecurityPolicy: false`) | Manter como exports mortos | **Trivial**, mas é remoção de export público de pacote — vale o olhar do review |
| P7 | Rate limit por pathname exato | `RATE_LIMITED_PATHS.includes(pathname)` — sem prefixo, sem regex | `startsWith` | **Trivial**. ⚠️ Uma rota `/auth/sign-in/apple` futura **não** seria limitada sem editar a lista |
| P8 | `Vary` duplicado | Emitimos `Vary: Origin`; o Next acrescenta o dele numa **segunda linha** de header. É válido em HTTP (a semântica é a união) e foi verificado na resposta real | Concatenar manualmente | **Trivial** |

---

## 8. Lacunas de teste conhecidas (para o `/test`)

1. 🔴 **Login com Google, ponta a ponta, até o redirect completar** — em `apps/app` **e** `apps/web`.
   É o risco R1 e o único caminho que nenhum teste automatizado alcança. Falha **silenciosa**: o popup
   abre, o usuário autentica, o popup fecha e o app não recebe nada. **Não aceitar "cliquei e abriu"
   como aprovação.**
2. 🔴 **Sessão viva por mais de 1h** (ou forçar o refresh do ID token) para provar
   `securetoken.googleapis.com` — risco R2, quebra diferida que nenhum smoke test pega.
3. 🟡 **CSP de produção num browser** (`NODE_ENV=production`, sem `'unsafe-eval'`): rodar
   `next build && next start` nos 3 apps e repetir o passe de console. É o cenário que os forks vão usar.
4. 🟡 **Área admin + impersonação sob CSP** — validei só o painel comum. As telas de admin
   (`/admin/users`) e o modo impersonado não foram abertos no browser.
5. 🟡 **Boot real em produção sem `CORS_ORIGIN`** (`NODE_ENV=production next start`) — coberto por
   teste unitário do `register()`, não por um processo de verdade.
6. 🟡 **`/auth/sign-in/google` sob rate limit** — exercitei o 429 em `/auth/sign-in`; a rota que tem
   consumidor real (`googleSignInApi.ts`) não foi levada ao limite.
7. 🟡 **Toast/alerta traduzido do `AUTH_RATE_LIMITED` na tela** — a copy está congelada nos 3 idiomas por
   teste unitário, mas ninguém viu a mensagem aparecer no `SignInForm` (exigiria estourar o limite pelo
   browser, com chave Arcjet).
8. 🟡 **Preview deploy da Vercel**: o domínio efêmero não estará em `CORS_ORIGIN` e o CORS vai recusar.
   Documentado em `docs/SETUP.md`, não testado.

---

## 9. Limitação a repetir na entrega (do plano §1.4)

🔴 **O limite de requisições não cobre o formulário de login.** O login por e-mail/senha das duas
front-ends vai do browser direto para `identitytoolkit.googleapis.com` e **nunca toca a `apps/api`**.
O que foi entregue é limite na **superfície da API** — e as duas rotas mais expostas (`/auth/sign-in`,
`/auth/sign-up`) **não têm nenhum consumidor no repo**, o que as torna mais suspeitas, não menos: são
POST público sem guard que queimam a cota da Identity Toolkit do fork.
