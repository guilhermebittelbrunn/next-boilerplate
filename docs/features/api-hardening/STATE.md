---
slug: api-hardening
title: "Endurecimento da borda da API: headers/CSP, rate limit e CORS"
task: -
spec: api-hardening
branch: api-hardening-flow
epic: -
updated: 2026-09-02 02:50
---

# Pipeline — Endurecimento da borda da API

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-02 01:14 | analyze/plan.md | Plano em 11 passos (P0–P10) na ordem `packages/security` → `packages/shared` → `apps/api` → `apps/app`/`apps/web` → i18n, com a **lista real de origens levantada do código** (não estimada) e **3 defaults do nosecone identificados como quebra de login** (COOP `same-origin` mata o `signInWithPopup`, COEP `require-corp` derruba o avatar do Google, `frameSrc 'none'` bloqueia o iframe `__/auth/iframe`). O dilema build×produção do `CORS_ORIGIN` foi resolvido sem repetir o efeito das `FIREBASE_ADMIN_*`: **var opcional no `env.ts` + gate de produção no `instrumentation.ts`**, que já existe e cujo docstring descreve exatamente esse padrão. **16 decisões tomadas por padrão** (Q1–Q16, uma marcada 🔴). Achados que mudam o desenho: `AUTH_FORBIDDEN_ORIGIN` **já existe nos 3 idiomas** com precedente pronto em `packages/auth/session-routes.ts:36` (zero i18n para CORS), e `apps/api/.env.example:14-15` **promete lista de origens que o código não implementa** (bug latente, não só lacuna) |
| develop | done    | 2026-09-02 01:52 | develop/handoff.md | **P0–P10 entregues na ordem do plano (`packages/security` → `packages/shared` → `apps/api` → `apps/app`/`apps/web` → i18n → docs), mais um desvio 🔴 que o plano não podia prever**: `ARCJET_KEY=""` — o valor que o próprio `.env.example` distribui — reprovava `z.string().startsWith("ajkey_")` e, assim que `apps/api` passou a declarar `@repo/security` (P4), **toda requisição virou 500**; corrigido com `z.preprocess` tratando string vazia como ausente (mesmo padrão de `@repo/analytics/keys`), + 5 testes. Outros dois desvios: o avatar `github.com/shadcn.png` **também estava no `GlobalSidebar`** (renderizado em toda página autenticada, logo violaria a CSP em **todas** as telas, não só no playground) e a `apps/web` **não enxergava `NEXT_PUBLIC_API_URL`** porque `skipValidation: true` faz o t3-env descartar os `extends` — bug pré-existente provado de forma independente (a landing já não renderiza o CTA do painel), contornado declarando a var localmente em vez de mexer no `skipValidation`. **Números: `pnpm check` 402 arquivos 0/0 · `turbo run lint typecheck test` 22/22 (era 21 — `@repo/security#test` é suíte nova) · +8 arquivos de teste, +73 testes** (security 0→31, api 118→145, app 135→146, web 15→19) · paridade i18n verde · `next build` da api **passa sem `CORS_ORIGIN`** (prova A/B do P4). **Validação visual com `agent-browser`: ZERO `Refused to …` em todas as telas** (landing, sign-in, sign-up, painel comum, CRUD completo de `entities` criar→editar→excluir, playground, tema light↔dark, 3 idiomas, mobile 390×844) e **V9 executado com chave Arcjet real: exatamente 20 requisições passam, da 21ª em diante 429 com `Retry-After: 12` + `AUTH_RATE_LIMITED`**, com CORS e CSP preservados e log sem PII. **Lacuna que permanece: login com Google (V1/V2) não foi exercitado** — sem conta Google no ambiente —, que é justamente o risco R1 (COOP mata o popup **em silêncio**); o header real foi conferido (`same-origin-allow-popups`, `apis.google.com`, `authDomain` em `frame-src`+`child-src`), mas isso não substitui o passe manual |
| review  | in-progress | 2026-09-02 02:20 | review/review.md | **Diff auditado contra o código, não contra o handoff; gates reconferidos e batendo** (`pnpm check` 402 arquivos 0/0 · `turbo run lint typecheck test` 22/22 · paridade i18n 2/11 · `pnpm --filter api build` **passa sem `CORS_ORIGIN` no ambiente**, prova A/B independente). **3 correções aplicadas, nenhuma muda contrato**: (1) 🟡 o `Retry-After` do 429 era **invisível ao JavaScript** — sem `Access-Control-Expose-Headers` o browser esconde de script cross-origin todo header fora da safelist CORS, então o `retryAfterSeconds` do P3 nascia sempre `null` no navegador; (2) 🟡 `Vary: Origin` faltava justamente na resposta **sem** `Origin` e no 403, as duas que não trazem permissão — cache compartilhado poderia replicá-las para um browser que mandou `Origin`; (3) 🟡 o `<Avatar>` sem filho **não renderiza nada** (o `bg-muted` vive no `AvatarFallback`, não no Root), deixando um buraco de 32px e o cabeçalho da sidebar desalinhado em toda página autenticada — reposto com fallback neutro, sem string nova e sem origem nova na CSP. **Desvio D2 auditado com rigor e aprovado**: o `z.preprocess` converte só string vazia/espaços em ausente; `"not-a-key"` continua lançando (há teste fixando), logo não existe caminho que transforme chave inválida em "sem proteção" — e o problema era **maior** do que o `/develop` registrou, porque `apps/app/env.ts` também estende `security()` sem `skipValidation`. Os 4 pontos de `secure()` não regrediram. **Validação visual foi além do `/develop**: o iframe `__/auth/iframe` do Firebase está no DOM carregado sem nenhuma recusa, `apis.google.com` carregou e o popup do Google navegou até `accounts.google.com`** — a *ida* do login está provada; falta a *volta* (é onde o COOP falharia, em silêncio). Zero `Refused to …` em todas as telas; CRUD de `entities` completo, light/dark/mobile/3 idiomas; CORS conferido por `curl` em 5 cenários (allowlist real, sem coringa, sem reflexão) e NO-OP do rate limit medido (25 POSTs, zero 429, aviso de boot uma vez). Causa raiz do D3 **confirmada no código do t3-env instalado** (`if (skip) return runtimeEnv` descarta os `extends`). **Branch `api-hardening-flow` mantida por instrução do usuário** (o padrão pediria `feat/api-hardening`); nada commitado, nada em stage — plano de 16 commits pronto para aprovação |
| test    | done    | 2026-09-02 03:05 | test/report.md · test/criterios-aceite.md | **31 critérios escritos a partir dos 4 "Sinais de pronto" + o corte de MVP de 5 itens: 30 PASS, 1 PARCIAL (renovação do ID token após 1h), 0 FALHA.** Gates reconferidos, não copiados: `pnpm check` **404 arquivos** 0/0 (era 402 — 2 arquivos de teste novos) · `turbo run lint typecheck test --force` **22/22, 0 cached** · `pnpm test` root verde · paridade i18n 2/11 · `next build` da api **passa sem `CORS_ORIGIN`**. **+2 arquivos / +17 testes** (52/405 → **54/421**): api 145→152, app 146→153, web 19→22 — cobrindo as 3 lacunas que o `/review` apontou (`Vary` no 403 e na resposta sem `Origin`, `Expose-Headers` no 429 do proxy, casamento exato de rota que deixa `/auth/sign-in/` de fora) mais `Allow-Credentials` ausente, log de `rate-limit` sem PII, colapso de `frame-src` em `'none'` sem authDomain, `connect-src` sem entrada vazia e o gate `startsWith("G-")` recusando um `UA-…`. **18 mutações aplicadas ao código de produção, 18 mortas** — incluindo **3 em runtime, com o app no ar**: COOP→`same-origin` mata `window.opener`; `img-src` sem `lh3` dispara `securitypolicyviolation`; API sem `Expose-Headers` esconde o `Retry-After` do script. **Os dois 🔴 do `/review` foram fechados**: (1) **a volta do login Google** — provada no mecanismo, não simulada: `window.opener !== null` no popup e um `postMessage` disparado **de dentro de `accounts.google.com`** chegou ao opener em `localhost:3000`, com contraprova de que sob `same-origin` o opener vira `null` **sem erro no console**; (2) **o avatar real do Google** — `lh3.googleusercontent.com` com `naturalWidth: 96, complete: true` no `ProfileDropdown` (que usa `<img>` cru, não o otimizador), em dev **e** no build de produção. Também fechados: **CSP de produção num browser** (`next build && next start` nos dois apps — sem `'unsafe-eval'`, 11 scripts inline executam, tema troca, API responde), **área admin + impersonação sob CSP bloqueante** (com `OPTIONS 204` + `GET 200` reais provando que os headers `x-request-*` estão em `Access-Control-Allow-Headers`), **boot gate de produção num processo real**, e o **toast do `AUTH_RATE_LIMITED` visto na tela nos 3 idiomas** com o `Retry-After: 12` lido por script cross-origin (`headersVisibleToScript: ["content-type","retry-after"]`). **13 telas × console limpo**, light+dark, desktop+390×844, pt-br/en/es — **zero `Refused to …`**; landing em Report-Only com **zero violações reportadas**. 19 prints em `test/e2e/` com PII borrada. **Bloqueado (2, nenhum regressão)**: login Google com conta real até a sessão iniciar (🔴, exige humano — roteiro M3, ~2 min) e renovação do ID token após ~1h (⚠️ quebra diferida — roteiro M4); ⚪ preview deploy da Vercel e 429 ao vivo com chave Arcjet (a chave está vazia neste ambiente; o `/develop` já mediu 20/21). **Achado novo**: o gate de `CORS_ORIGIN` **não derruba o processo** — o Next fica no ar respondendo 500 a tudo, então um health check que só faz ping na porta veria o container saudável. Conta de QA `qa-test-api-hardening@example.com` criada e **apagada** (auth + perfil); as 18 mutações **todas revertidas** (`git diff --stat` byte-a-byte idêntico); nada commitado, nada em stage |
| observe | done    | 2026-09-02 02:50 | observacao.md | Feature pronta para commit: API agora recusa origem não-autorizada, limita requisições de autenticação a 20/min por IP e retorna cabeçalhos de segurança em todos os apps. Exige `CORS_ORIGIN` em produção e passe manual de login com Google. |

## Notas

### Origem

- **Spec**: `specs/api-hardening.md` (`status: approved`, `value: alto`, `effort: M`, `audience: confianca`,
  `depends_on: []`, `updated: 2026-09-01`). Problema, evidência de mercado e corte de MVP são decisão de
  produto tomada — o plano responde só ao *como*. **Não editar a spec**: arquivá-la é do `/spec --sync`.
- Notas de pesquisa citadas: `specs/research/compliance-trust-baseline.md` (controles **13** headers/CSP e
  **16** anti-abuso; ASVS 5.0 L1 **3.4.1** HSTS e **3.4.2** CORS com allowlist) e
  `specs/research/engineering-baseline.md` (prática **9**, rate limiting: contador **precisa** ser externo).
- Rodou em **modo autônomo** — nenhuma pergunta feita ao usuário. Ver `## Perguntas em aberto (decididas
  por padrão)` no fim do `analyze/plan.md`.

### Reconferência das refs da spec

Todas as refs foram reabertas em 2026-09-02. Confirmadas: coringa em `apps/api/proxy.ts:15`, CSP desligada
em `packages/security/middleware.ts:14`, NO-OP sem `ARCJET_KEY` em `packages/security/index.ts:12-18`,
`securityMiddleware` sem nenhum consumidor, `apps/api` não declara `@repo/security`, Stripe 100%
server-side.

**Uma refutada**: `specs/api-hardening.md:99` afirma que a `apps/web` é a mais sensível a CSP por causa de
scripts de marketing/analytics. É o contrário — a `apps/web` **não monta** o `AnalyticsProvider` e não tem
nenhum script de terceiro; quem tem analytics é a `apps/app`. Não muda o corte. Spec não editada.

### Achados novos (para o `/spec --sync`, não corrigidos agora)

- 🔴 `apps/app/app/layout.tsx:3` importa `@repo/analytics` sem `apps/app/package.json` declarar — hoisting
  do pnpm, e o turbo não invalida `app#*` quando o pacote muda. Mesma classe do achado do `ci-pipeline`
  sobre a `apps/web`.
- 🟡 `apps/app/next.config.ts:19` lista `www.google.com` em `images.domains` sem uso e sem `remotePattern`;
  `domains` está deprecado no Next 16.
- 🟡 `/auth/sign-in` e `/auth/sign-up` da api **não têm consumidor nenhum** e não seguem o contrato
  `{ error: { code } }` (devolvem string crua em `sign-in/route.ts:12`, `sign-up/route.ts:26,40`).
- 🟡 Rate limit em `/api/auth/session` das front-ends ficou fora do corte.

### Limitação a declarar na entrega

🔴 **O limite de requisições não cobre o formulário de login.** O login por e-mail/senha das duas
front-ends usa `useAuth().signIn` → `packages/auth/client.ts` → `identitytoolkit.googleapis.com`
**direto do browser**, sem tocar a `apps/api`. O corte entrega limite na **superfície da API**
(`/auth/sign-in`, `/auth/sign-up`, `/auth/sign-in/google`) — sendo que as duas primeiras não têm consumidor
no repo, o que as torna mais suspeitas, não menos: são POST público sem guard que queimam a cota da
Identity Toolkit do fork. Detalhe em `analyze/plan.md` §1.4.

### Achados do `/develop` (para o `/spec --sync`)

- 🔴 **`packages/security/keys.ts` rejeitava `ARCJET_KEY=""`** — o valor que `apps/api/.env.example`,
  `apps/app/.env.example` e `apps/web/.env.example` distribuem. Corrigido nesta etapa; era uma armadilha
  dormente que só acordou quando a `apps/api` passou a importar o pacote.
- 🔴 **`apps/web/env.ts` usa `skipValidation: true`, e nesse modo o t3-env descarta os `extends`** — todos
  os `env.NEXT_PUBLIC_*` vindos de `@repo/next-config/keys` são `undefined` na web. Medido: a landing não
  renderiza nenhum link para `localhost:3000` apesar de `NEXT_PUBLIC_APP_URL` estar definida, ou seja o
  CTA "Ir para o painel" já cai no fallback hoje. **Não corrigido** (muda header/CTA/pricing da web
  inteira); contornado declarando localmente as 2 vars que a CSP precisa.
- 🟡 `apps/app/shared/components/ui/Sidebar.tsx` carregava `https://github.com/shadcn.png` em **toda**
  página autenticada — o plano só tinha mapeado a ocorrência do playground.
- 🟡 `/auth/sign-in` responde **500 com string crua** para credencial inválida (confirmado no V9: as 20
  primeiras requisições do teste de limite voltaram 500). Já estava no §14 do plano; segue de pé.

### Restrições de processo

- **Implementado no working tree; nenhuma branch criada, nada commitado nem em stage.** A branch atual é
  `api-hardening-flow` (não protegida). Quem nomeia e cria branch é o `revisor-codigo`.
- **Validação visual é obrigatória** (regra de ouro 11) e aqui é o gate real: CSP quebra em runtime e
  nenhum teste unitário prova que a tela não quebrou. Os 10 fluxos estão em `analyze/plan.md` §9.2 —
  atenção especial a V1/V2 (login com Google **até o redirect**, não parar no clique) e V7 (console sem
  nenhum `Refused to …`).
- **Setup de teste novo**: `packages/security` ganhou suíte no P0 (`vitest.config.mts` + script `test`) —
  3 arquivos, 31 testes, e `@repo/security#test` passou a contar no turbo (21 → 22 tasks).
- **Não adicionar `CORS_ORIGIN` ao `turbo.json`**: `lint`/`typecheck`/`test` têm `env: []` de propósito.

### Passe humano exigido antes do merge (do `/test`)

🔴 **Login com Google até a sessão iniciar**, em `apps/app` e `apps/web`. O canal de retorno está provado
(`window.opener` vivo e `postMessage` cross-origin entregue ao opener) e a quebra sob COOP `same-origin`
foi reproduzida, mas a entrega da credencial em si exige uma conta Google real — ~2 min. O modo de falha
é **silencioso**: o popup fecha e nada acontece, sem mensagem e sem log. Roteiro passo a passo em
`test/criterios-aceite.md` → **M3**.

⚠️ **Sessão viva por mais de 1h** (roteiro **M4**): `securetoken.googleapis.com` está na `connect-src`
emitida e em teste unitário, mas a renovação do ID token não foi exercitada. Se falhar, a sessão de todo
usuário morre uma hora após o login e nenhum smoke test pega.

### Achados do `/test` (para o `/spec --sync`)

- ⚠️ **O gate de `CORS_ORIGIN` não encerra o processo.** Com `NODE_ENV=production` e a variável ausente,
  o `register()` lança, o Next imprime `Failed to prepare server` e **fica no ar respondendo 500 a tudo**.
  O efeito pretendido é atingido (nada é servido), mas uma plataforma que só verifica se a porta responde
  veria o container saudável. Ou o health check passa a distinguir 5xx, ou o gate chama `process.exit(1)`.
- ⚪ **`useList*` que falha renderiza estado vazio, não erro.** Um 429 na listagem de entidades mostra
  "Nenhuma entidade cadastrada" — lista que falhou fica indistinguível de lista vazia. Pré-existente.
- ⚪ **`img-src` precisa de `lh3.googleusercontent.com` só por causa do `ProfileDropdown`** (`<img>` cru).
  A lista de admin serve a mesma foto por `/_next/image`, que é same-origin e já estaria em `'self'`.
- 🟡 **Limpeza de contas de QA pendente** (soma-se ao D-F do `/review`): a desta etapa
  (`qa-test-api-hardening@example.com`) **já foi apagada**; seguem pendentes
  `qa-api-hardening@example.com` (do `/develop`) e `review-api-hardening@example.com` (do `/review`) —
  Firebase Console → Authentication + o doc `user` no Firestore, depois do merge.
