# Critérios de Aceite (Checklist) — Endurecimento da borda da API

> Derivados dos **4 "Sinais de pronto"** (`specs/api-hardening.md:126-133`) e do **corte de MVP de 5
> itens** (`:76-83`). Cada critério nomeia o `error.code` esperado, o cabeçalho medido e o estado-limite.
> Data: 2026-09-02. O status por item está em [`report.md`](report.md).

---

## A. Origem (Sinal de pronto 1 · MVP 2)

- [ ] **A1 — Uma origem fora da allowlist é recusada com código estável**
  Uma requisição com `Origin` que não consta em `CORS_ORIGIN` recebe **403** com corpo
  `{"error":{"code":"AUTH_FORBIDDEN_ORIGIN"}}` e **sem** `Access-Control-Allow-Origin` — o browser barra
  a leitura mesmo que o corpo chegue. A recusa acontece **antes** de gastar chamada de rate limit e antes
  de qualquer guard, porque decidir quem pode ler é mais barato que decidir quem é. O 403 traz
  `Vary: Origin` e os cabeçalhos de segurança, como qualquer outra resposta.

- [ ] **A2 — O coringa não aparece em nenhuma resposta, em nenhuma configuração**
  `Access-Control-Allow-Origin: *` não é emitido nem quando `CORS_ORIGIN` está vazia: fora de produção o
  fallback é a lista fixa `http://localhost:3000,http://localhost:3001`, ainda uma allowlist. A origem só
  é ecoada **depois** de `allowedOrigins.includes(origin)` — não existe reflexão incondicional. Em
  produção com a variável ausente a lista é **vazia**, e nenhuma origem de browser é aceita.

- [ ] **A3 — Requisição sem `Origin` passa, e não recebe permissão nenhuma**
  Chamada servidor→servidor (curl, cron, webhook) não tem `Origin` e o CORS não tem o que dizer sobre
  ela: passa adiante para os guards, **sem** nenhum cabeçalho `Access-Control-*`. Ainda assim a resposta
  leva `Vary: Origin`, para que um cache compartilhado nunca replique uma resposta sem permissão a um
  browser que enviou `Origin` — o caso em que a resposta chega e é bloqueada, com aparência de bug do app.

- [ ] **A4 — Preflight permitido responde 204 com o contrato completo; recusado responde sem permissão**
  `OPTIONS` de origem permitida devolve **204** com `Allow-Methods` (incluindo `PATCH`), `Allow-Headers`
  (incluindo os headers de contexto de auth `x-request-user-id`, `x-request-role`, `x-user-*`, `x-role`,
  `x-locale`), `Expose-Headers` e `Max-Age: 86400`. `OPTIONS` de origem recusada também devolve 204, mas
  **sem** `Access-Control-Allow-Origin` — a ausência é a recusa, e o browser não deixa a requisição real
  sair. Os headers de impersonação estarem na lista é o que mantém o painel admin personificado
  funcionando cross-origin.

- [ ] **A5 — `Access-Control-Allow-Credentials` nunca é enviado**
  O SDK autentica por bearer token, não por cookie: não existe `withCredentials` em `packages/sdk`.
  Emitir `Allow-Credentials` junto de uma origem ecoada é o par que transforma allowlist em superfície de
  CSRF, então o cabeçalho deve continuar **ausente** em toda resposta.

- [ ] **A6 — A lista aceita várias origens separadas por vírgula, com espaçamento tolerado**
  `CORS_ORIGIN="http://a , http://b , "` resolve para `["http://a","http://b"]`: `split(",")` + `trim` +
  descarte de vazios. Isto fecha o bug latente em que o `.env.example` prometia uma lista e o código
  jogava a string inteira dentro de `Access-Control-Allow-Origin`, que por especificação aceita **uma**
  origem — quebrando o CORS das duas.

- [ ] **A7 — Produção não sobe sem allowlist; o build não passa a exigi-la**
  Com `NODE_ENV=production` e `CORS_ORIGIN` ausente, o `register()` do `instrumentation.ts` lança
  `CORS_ORIGIN is required in production: set the comma-separated list of origins allowed to call this
  API.` e a API não serve requisição alguma. Fora de produção sobe com o fallback de localhost. E
  `pnpm --filter api build` **passa sem a variável no ambiente** — a var é `z.string().optional()` no
  `env.ts` de propósito, porque `env.ts` é validado eagerly e importado por route handlers; exigir ali
  faria todo build, em qualquer ambiente, pedir um valor de produção.

---

## B. Limite de requisições (Sinal de pronto 2 e 4 · MVP 3 e 4)

- [ ] **B1 — Estourar o limite devolve 429 com o código e a espera**
  Além de 20 requisições por 60 s por endereço de origem numa rota pública de auth, a resposta é **429**
  com `{"error":{"code":"AUTH_RATE_LIMITED"}}` e o cabeçalho `Retry-After` em delta-seconds. A resposta
  preserva CORS e CSP: um 429 que perde o `Access-Control-Allow-Origin` viraria erro de rede no cliente,
  escondendo a causa real.

- [ ] **B2 — O `Retry-After` chega ao JavaScript do cliente, não só à aba de rede**
  A resposta traz `Access-Control-Expose-Headers: Retry-After`. Sem isso o browser esconde o cabeçalho de
  todo script cross-origin (ele não está na safelist de resposta do CORS) e `FormattedError.retryAfterSeconds`
  nasce sempre `null` no navegador — a feature entregue quebrada, com o defeito só aparecendo quando
  alguém tentasse escrever "tente de novo em N segundos" na tela. Um `Retry-After` em formato HTTP-date
  (não delta-seconds) resolve para `null` sem lançar.

- [ ] **B3 — Uma recusa que não é de orçamento não inventa uma espera**
  Bloqueio por bot ou por decisão genérica devolve 429 **sem** `Retry-After` (`retryAfterSeconds: null`),
  porque não há janela a comunicar. O cliente precisa tolerar a ausência do cabeçalho sem quebrar.

- [ ] **B4 — Só as rotas públicas de auth são contadas, e por caminho exato**
  Entram no orçamento `/auth/sign-in`, `/auth/sign-up` e `/auth/sign-in/google`. Ficam **fora**
  `/auth/me` (autenticada, caminho quente), `/health` e **`/webhooks/payments`** (a Stripe reenvia
  agressivamente; limitar custaria mais do que protege). O casamento é por pathname **exato**: uma
  vizinha como `/auth/sign-in/` (barra final) ou uma futura `/auth/sign-in/apple` fica sem limite até ser
  listada — trade-off deliberado, porque `startsWith` cobraria `/auth/sign-in/google` duas vezes.

- [ ] **B5 — Sem a chave do serviço externo, o fork sobe, funciona e diz que o limite está desligado**
  Sem `ARCJET_KEY` o app sobe, **nenhuma** requisição é bloqueada e `checkRateLimit` retorna
  `{ allowed: true, enforced: false }` **antes de tocar a rede** — o cliente Arcjet nem é construído.
  **Não existe fallback em memória**: em serverless um contador local não limita nada e mente para quem lê
  o código. O aviso `[security] rate limiting is DISABLED (no ARCJET_KEY)…` é impresso no boot
  **exatamente uma vez**, e não aparece quando há chave.

- [ ] **B6 — `ARCJET_KEY` vazia vale como ausente, mas uma chave inválida continua reprovando**
  `ARCJET_KEY=""` — o valor que os três `.env.example` distribuem — é tratado como não configurada. Isto
  é obrigatório: sem o tratamento, a `apps/api` responde **500 em toda requisição** (`Invalid string:
  must start with "ajkey_"`) num fork que só copiou o `.env.example`. Já `"not-a-key"` **continua
  lançando** — não existe caminho em que uma chave malformada se degrade silenciosamente em "sem
  proteção".

- [ ] **B7 — A mensagem chega traduzida na tela nos três idiomas, não como erro cru**
  Uma resposta 429 com `AUTH_RATE_LIMITED` renderiza, via `apiErrors` + `FormattedError`:
  pt-br "Muitas tentativas em pouco tempo. Aguarde um instante e tente de novo." · en "Too many attempts
  in a short time. Wait a moment and try again." · es "Demasiados intentos en poco tiempo. Espere un
  momento e inténtelo de nuevo." Nunca o fallback genérico "Um erro inesperado aconteceu", nunca stack
  trace. A copy é **distinta** de `USERS_AUTH_RATE_LIMITED` (o limite do próprio Firebase): mesmo
  sintoma, camada e remédio diferentes.

- [ ] **B8 — Limitação declarada: o formulário de login não passa pela API**
  O login por e-mail/senha das duas front-ends vai do browser direto para
  `identitytoolkit.googleapis.com` e **nunca toca a `apps/api`**. O que está entregue é limite na
  **superfície da API**, e as duas rotas mais expostas (`/auth/sign-in`, `/auth/sign-up`) não têm
  consumidor no repositório. O critério é que isso esteja **documentado na entrega**, não que esteja
  resolvido.

---

## C. Cabeçalhos e CSP (Sinal de pronto 3 · MVP 1)

- [ ] **C1 — As respostas dos três apps trazem cabeçalhos de segurança com CSP ativa**
  `apps/app` e `apps/api` emitem `Content-Security-Policy` (bloqueante); `apps/web` emite
  `Content-Security-Policy-Report-Only`, para descobrir as origens reais de marketing sem derrubar a
  landing. Os três emitem `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` e
  `Strict-Transport-Security: max-age=31536000; includeSubDomains` (≥ 1 ano, ASVS 3.4.1). Os cabeçalhos
  são aplicados também nas **respostas de redirect** (locale, sign-in) e nas **recusas** (403, 429) — não
  só nas páginas servidas com sucesso.

- [ ] **C2 — O login com Google sobrevive à política: script, iframe e popup**
  `script-src` libera `https://apis.google.com` (a ponte `gapi`), `frame-src` **e** `child-src` liberam
  `https://<NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN>` (o iframe `__/auth/iframe`), e
  `Cross-Origin-Opener-Policy: same-origin-allow-popups` mantém o `window.opener` do popup vivo. O modo
  de falha do COOP é **silencioso** — o popup abre, o usuário autentica, o popup fecha e nada acontece —,
  então o critério exige que a **volta** da credencial (o `postMessage` do popup para o opener) esteja
  provada, não só a ida. `child-src` espelha `frame-src` porque navegadores antigos o usam como fallback.

- [ ] **C3 — Sem auth domain configurado, `frame-src` fecha em `'none'` em vez de abrir**
  Se um fork esquecer `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `frame-src` e `child-src` colapsam em
  `'none'` — diretiva vazia é inválida, e o valor de fallback tem de ser o restritivo, nunca `'self'`.
  Não é modo de falha novo (sem authDomain o Firebase já não faz popup), mas a política não deve ser o
  que **parece** funcionar. Do mesmo modo, `NEXT_PUBLIC_API_URL` ausente não pode injetar entrada vazia
  em `connect-src`.

- [ ] **C4 — COEP desligado, para o avatar do Google não cair**
  `Cross-Origin-Embedder-Policy` deve estar **ausente**: o default `require-corp` do nosecone recusa
  subrecurso cross-origin que não envia CORP, e `lh3.googleusercontent.com` não envia. Na `apps/api`,
  `Cross-Origin-Resource-Policy: cross-origin` — a API existe **para** ser lida por outra origem, e o
  controle de acesso ali é a allowlist de CORS + os guards, não este cabeçalho.

- [ ] **C5 — O avatar real do Google carrega sob a política**
  Uma foto de perfil vinda de `https://lh3.googleusercontent.com` renderiza de fato (`naturalWidth > 0`,
  `complete: true`) no `ProfileDropdown`, que usa `<AvatarImage>` — um `<img>` cru, **sem** passar pelo
  otimizador do Next. É este caminho que exige a origem em `img-src`; a lista de admin serve a mesma foto
  por `/_next/image`, que é same-origin e já estaria coberta por `'self'`.

- [ ] **C6 — A `connect-src` cobre o ciclo de vida inteiro da sessão, não só o login**
  Além da URL da API, `connect-src` nomeia `https://identitytoolkit.googleapis.com` (login/cadastro) e
  `https://securetoken.googleapis.com` (**renovação do ID token, ~1 h depois**). Faltar o segundo produz
  quebra **diferida**: a sessão morre uma hora após o login e nenhum smoke test pega.

- [ ] **C7 — Analytics entra na política só quando está configurado, e só no formato certo**
  As origens `googletagmanager.com` / `google-analytics.com` / `region1.google-analytics.com` só aparecem
  quando `NEXT_PUBLIC_GA_MEASUREMENT_ID` começa com `G-`. Um id no formato antigo (`UA-…`) **não** deve
  ampliar a política — o gate é idêntico ao `preprocess` de `packages/analytics/keys.ts`. A `apps/web`
  não monta `AnalyticsProvider` e por isso não lista nenhuma dessas origens nem o host do avatar.

- [ ] **C8 — A política de produção não é a de desenvolvimento**
  `'unsafe-eval'` (que o Next precisa para compilar com hot reload) e `https://va.vercel-scripts.com`
  entram **apenas** quando `NODE_ENV=development`. Um `next build && next start` tem de renderizar,
  hidratar e navegar sem eles — é o cenário que todo fork vai usar em produção, e o único em que a
  `script-src` real é exercitada.

- [ ] **C9 — Nenhuma tela quebra por causa da política**
  Zero `Refused to …` / `Content Security Policy` no console em **todas** as telas: landing, sign-in,
  sign-up, home do painel comum, home do admin, `/admin/users`, lista e formulário de entidades,
  playground, e durante troca de tema e de idioma. Verificado em **claro e escuro**, em **desktop e
  mobile 390×844**, e nos **3 idiomas**. O script anti-flash inline do `next-themes`, o bootstrap do App
  Router e o CSS-in-JS do antd dependem de `'unsafe-inline'` sem nonce — dívida assumida e documentada em
  `docs/SECURITY.md`, que diz explicitamente que o bloqueio de XSS por `script-src` é **parcial**.

- [ ] **C10 — A `apps/web` em Report-Only não reporta violação nenhuma**
  A política da landing é emitida como `-Report-Only` de propósito, mas **zero violações reportadas** —
  ou seja, ela já está calibrada para ser promovida a bloqueante sem quebrar a página. Se houvesse
  violação, o cabeçalho estaria escondendo um problema em vez de revelando um.

- [ ] **C11 — A API não serve nada que não precise servir**
  A CSP da API é `default-src 'none'` com `connect-src 'none'`, `frame-ancestors 'none'`,
  `form-action 'none'`; só `script-src`/`style-src` `'self' 'unsafe-inline'` e `img-src 'self' data:`,
  o mínimo para a página de erro do Next renderizar em vez de uma aba branca.

- [ ] **C12 — Nenhum atalho para desligar a CSP fica à mão**
  `noseconeOptions` e `noseconeOptionsWithToolbar` foram **removidos** de `packages/security/middleware.ts`.
  Eles carregavam literalmente `contentSecurityPolicy: false`: num boilerplate feito para ser forkado,
  mantê-los seria deixar disponível um valor que desliga a feature que este trabalho entrega. É remoção
  de export público de pacote (zero consumidores) e precisa constar na descrição da PR.

---

## D. Observabilidade do bloqueio (MVP 5)

- [ ] **D1 — Todo pedido bloqueado deixa rastro, em uma linha, sem dado pessoal**
  Recusa de origem e recusa por limite logam
  `[security] blocked reason=<origin|rate-limit|bot|denied> path=<pathname> method=<METHOD>` — prefixo
  estável, grepável, **sem IP, e-mail, corpo, token ou cabeçalho**. Bloquear não é motivo para começar a
  retinir dado pessoal, e um log que vaza credencial é pior que log nenhum.

- [ ] **D2 — O estado do limitador é consultável sem chamar a rede**
  `isRateLimitEnforced()` diz se existe orçamento sendo contado ou se o limitador é no-op, para
  diagnóstico de quem opera o fork. O aviso de boot cobre o caso mais comum (fork sem chave); esta função
  cobre o programático.

---

## E. Cross-check por ambiente

- [ ] **E1 — `apps/app` × `apps/web`**
  Política bloqueante na app, `-Report-Only` na web. A web emite a mesma política **menos** analytics e
  host de avatar. Os dois apps são exercitados no browser.

- [ ] **E2 — Painel comum × admin × admin personificando**
  Nenhuma das três mudanças distingue sujeito (allowlist e limite são pré-autenticação; cabeçalhos são
  por resposta), mas a **impersonação** depende dos headers `x-request-*` estarem em
  `Access-Control-Allow-Headers`: um esquecimento ali derruba o preflight e o painel personificado inteiro.
  Os três contextos abrem sob a CSP nova, com o aviso "Modo somente leitura" e a lista carregada da API.

- [ ] **E3 — Desenvolvimento × produção**
  Dev: allowlist de localhost por fallback, `'unsafe-eval'` na política, limitador no-op sem chave.
  Produção: allowlist obrigatória no boot, política sem eval, e recusa de qualquer origem não listada —
  **incluindo os preview deploys da Vercel**, cujo domínio efêmero precisa entrar na variável
  (documentado em `docs/SETUP.md`).

- [ ] **E4 — Claro × escuro × mobile × 3 idiomas**
  A CSP quebra em runtime, e o `Table` do antd escreve estilo inline. Cada combinação precisa de um passe
  de console próprio: light e dark, desktop e 390×844, pt-br / en / es.

---

## Roteiro de teste manual

> Pré-requisitos: `pnpm --filter api dev` (3002), `pnpm --filter app dev` (3000),
> `pnpm --filter web dev` (3001). Conta de dev própria. `curl` disponível.
> ⛔ Não versione credencial em `docs/` — se quiser reuso entre rodadas, coloque em
> `.claude/dev-credentials.local.md` (gitignored).

### M1 — Origem (A1–A6) · ~3 min, só `curl`

| # | Entrada | Resultado esperado |
|---|---|---|
| 1 | `curl -i -H "Origin: http://localhost:3000" localhost:3002/health` | 200 · `access-control-allow-origin: http://localhost:3000` · `access-control-expose-headers: Retry-After` · `vary: Origin` |
| 2 | `curl -i localhost:3002/health` (sem `Origin`) | 200 · **nenhum** `access-control-allow-origin` · `vary: Origin` presente |
| 3 | `curl -i -H "Origin: https://evil.example" localhost:3002/health` | **403** · `{"error":{"code":"AUTH_FORBIDDEN_ORIGIN"}}` · **sem** `access-control-allow-origin` · `Vary: Origin` |
| 4 | `curl -i -X OPTIONS -H "Origin: http://localhost:3001" -H "Access-Control-Request-Method: POST" localhost:3002/entities` | **204** · `Allow-Methods` com `PATCH` · `Allow-Headers` com `x-request-user-id` · `Max-Age: 86400` |
| 5 | `curl -i -X OPTIONS -H "Origin: https://evil.example" ... localhost:3002/entities` | 204 · **sem** `access-control-allow-origin` |
| 6 | Em qualquer resposta acima, procure `access-control-allow-credentials` | **Nunca** presente |
| 7 | Suba a api com `CORS_ORIGIN=" http://a , http://b , "` e repita o passo 1 com `Origin: http://b` | Ecoa `http://b`; espaçamento e vírgula solta toleradas |

### M2 — Boot em produção (A7) · ~4 min

1. `pnpm --filter api build` **sem** `CORS_ORIGIN` no ambiente → build conclui, exit 0, zero menção à
   variável no log. *(Se o build passar a exigi-la, o critério falhou.)*
2. `PORT=3012 CORS_ORIGIN= NODE_ENV=production pnpm --filter api start` → o log traz
   `An error occurred while loading instrumentation hook: CORS_ORIGIN is required in production…`
   e **toda** requisição responde 500. ⚠️ Observe: o processo **não termina**, ele fica servindo 500 —
   um health check que só faz ping na porta consideraria o container saudável.
3. Repita com `CORS_ORIGIN="http://localhost:3010"` → sobe normal; `Origin: http://localhost:3010`
   é ecoado, `Origin: http://localhost:3000` recebe 403.

### M3 — Login com Google, **a volta** (C2) 🔴 o item que só um humano fecha

1. Abra `http://localhost:3000/pt-br/sign-in`, abra o DevTools na aba Console **e** na aba Network.
2. Clique em **Continuar com Google** e faça login numa **conta Google real**.
3. **Observe qual dos dois acontece**:
   - ✅ o popup fecha **e a sessão inicia** — a página navega para o painel;
   - ❌ o popup fecha **e nada acontece** — a página continua no sign-in, sem erro visível. Este é o
     modo de falha do COOP, e é **silencioso**: não há mensagem, não há log. Se acontecer, o
     `Cross-Origin-Opener-Policy` da resposta é a primeira coisa a checar
     (`same-origin-allow-popups`, não `same-origin`).
4. Ainda logado, abra o menu de perfil no canto superior direito → a **foto do Google** deve aparecer.
   No Console, `document.querySelector('[data-slot=avatar] img').naturalWidth` deve ser `> 0` (critério
   C5). Se o console tiver `Refused to load the image`, `img-src` perdeu `lh3.googleusercontent.com`.
5. Repita 1–3 em `http://localhost:3001` (`apps/web`).

### M4 — Sessão viva por mais de uma hora (C6) 🔴 quebra diferida

1. Faça login e **deixe a aba aberta por mais de 60 minutos** (ou force o refresh do ID token).
2. Depois disso, navegue para uma tela que chama a API (ex.: Entidades) e recarregue.
3. Esperado: continua autenticado, a lista carrega, e o Console **não** tem
   `Refused to connect to 'https://securetoken.googleapis.com/…'`. Se tiver, a `connect-src` perdeu a
   origem e a sessão morre uma hora após o login — em produção, para todos os usuários.

### M5 — Limite real com chave Arcjet (B1–B3, B7) · exige `ARCJET_KEY` válida

1. Ponha uma chave `ajkey_…` em `apps/api/.env` e suba a api.
2. `for i in $(seq 1 25); do curl -s -o /dev/null -w "%{http_code} " -X POST -H "Origin: http://localhost:3000" -H "Content-Type: application/json" -d '{}' localhost:3002/auth/sign-in/google; done`
3. Esperado: as **20 primeiras** passam, da **21ª** em diante **429**. Confira num `curl -i` da 21ª:
   `retry-after: <N>`, `{"error":{"code":"AUTH_RATE_LIMITED"}}`, `access-control-allow-origin` preservado,
   `access-control-expose-headers: Retry-After`, CSP presente.
4. No log da api: `[security] blocked reason=rate-limit path=/auth/sign-in/google method=POST` —
   **sem IP, e-mail, corpo ou token** (critério D1).
5. Repita o passo 2 apontando para `/webhooks/payments` e `/auth/me` → **nenhum 429** (critério B4).
6. Remova a chave, reinicie e repita o passo 2 → **zero 429**, e o aviso
   `[security] rate limiting is DISABLED (no ARCJET_KEY)…` **uma única vez** no boot (critério B5).

### M6 — Passe de console (C9) · repita em cada combinação

Para cada tela — landing, sign-in, sign-up, home comum, home admin, `/admin/users`, lista de entidades,
formulário de criar, formulário de editar, playground — e para cada combinação de **tema** (claro/escuro),
**viewport** (desktop / 390×844) e **idioma** (pt-br / en / es):

1. Abra a tela com o Console aberto e filtrado por `Refused`.
2. Esperado: **zero** ocorrências. Na `apps/web` (Report-Only) o cabeçalho é
   `content-security-policy-report-only` e também deve haver **zero** violações reportadas.
3. Troque o tema **na própria tela** (o script anti-flash inline é o mais frágil) e confira que a tabela
   do antd acompanha o tema.

### M7 — Preview deploy da Vercel (E3) · ⚪ só em ambiente hospedado

1. Abra um preview deploy da `apps/app` cujo domínio efêmero **não** esteja em `CORS_ORIGIN`.
2. Esperado: as chamadas à API falham com **403 `AUTH_FORBIDDEN_ORIGIN`** — é a falha correta, e aparece
   no dia 1 do fork. Adicione o domínio à variável e confirme que volta a funcionar.
