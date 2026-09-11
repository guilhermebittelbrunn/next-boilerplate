---
slug: auth-recovery-verification
title: Recuperação de senha e verificação de e-mail
task: -
spec: auth-recovery-verification
branch: feat/auth-recovery-verification
epic: -
updated: 2026-09-10 02:40
---

# Pipeline — Recuperação de senha e verificação de e-mail

| etapa   | status  | quando           | artefato              | resumo (1 linha) |
|---------|---------|------------------|-----------------------|------------------|
| analyze | done    | 2026-09-10 00:43 | analyze/plan.md       | Plano em **11 commits** (`shared` → `sdk` → `api` ×3 + rate limit → `app` proxy + 2 telas → `internationalization` → docs) para 4 rotas novas sob `auth/`, 4 métodos em `AuthActions`, 3 páginas em `(unauthenticated)`, 1 banner no painel comum, 2 slugs de e-mail e 6 `error.code` — com **12 decisões registradas** e **3 achados que mudam o desenho e não estavam na spec**: 🔴 **o sign-up do app não passa pela API** (`packages/auth/client.ts:127` chama o Firebase direto; `POST /auth/sign-up` tem **zero chamador**, grep confirmado), então o gatilho de verificação **tem** de ser chamada explícita do cliente — e isso entrega a decisão de produto 2 (só senha, não Google) por construção; 🔴 **o bounce do `apps/app/proxy.ts:150-164` destrói o `oobCode`** (`:161` faz `search = ""`), ou seja um usuário logado que clique no link do e-mail perde o código em silêncio — precisa de isenção, não só de entrada em `PUBLIC_PATHS`; 🟡 **`revokeUserSessions` só funciona porque `verifySessionCookie` já roda com `checkRevoked: true`** (`packages/auth/server.ts:193-196`, usado em `apps/app/proxy.ts:141` e `resolve-api-actor.ts:28,36`) — é o mecanismo verificável do item 3 do corte. **A tensão central da spec (`:89`) resolvida**: o `not-configured` **propaga sem tocar em `packages/email`**, e o conflito com a anti-enumeração se dissolve porque `canSendAuthActionLink()` é a **primeira instrução** do handler — a resposta `EMAIL_NOT_CONFIGURED` passa a ser função *só* da configuração do fork, nunca do input, então não pode revelar existência de conta. **N/A explícito e justificado**: Firestore por completo (coleção, campo, índice, regra, backfill — `emailVerified` vive no Auth), `apps/web`, `packages/email`, `packages/auth/client.ts`, `queryKeys`, prefetch RSC, `loading.tsx`, `paths.ts`, `Container`/`FormContainer`/`Footer`/`Table`. **8 perguntas em aberto**, nenhuma bloqueante, todas com recomendação adotada |
| develop | done    | 2026-09-10 01:30 | develop/handoff.md    | Slice inteiro implementado na ordem `shared` → `sdk` → `api` → `app` → `internationalization`: 4 rotas sob `auth/` (as 4 em `RATE_LIMITED_PATHS`), 4 ações em `AuthActions`, 3 páginas em `(unauthenticated)`, banner no painel comum, 2 slugs de e-mail, 6 `apiErrors` nos 3 idiomas. **`pnpm turbo run lint typecheck test` verde (23/23)** e roteiro **V1–V13 validado no browser contra o Firebase real** — V2 provado com screenshots de **SHA1 idêntico** (anti-enumeração byte a byte) e V5/V6 com ciclo completo (senha nova + sessão revogada). **3 defeitos reais corrigidos, 2 deles fatais e não previstos**: 🔴 conta inexistente devolvia **500** porque o Firebase reporta `auth/internal-error`, não `auth/user-not-found` — o endpoint *era* um oráculo de enumeração (agora resolve a conta com `getUserByEmail` antes); 🔴 `skipValidation` faz o `createEnv` **descartar tudo que vem por `extends`**, então `env.NEXT_PUBLIC_APP_URL` era **sempre** `undefined` em dev e todo pedido de reset respondia 503 (feature morta localmente em qualquer fork) — corrigido declarando a var no `apps/api/env.ts`; 🟡 o banner sobrevivia à confirmação porque `User.emailVerified` vem do registro da conta e não do ID token — `reloadCurrentUser()` (`reload` + refresh) em `packages/auth/client.ts`, único desvio de D-5, com o `.catch()` que impede uma confirmação bem-sucedida de virar tela de erro. Desvios menores: `AuthCard` compartilhado (7 estados de card), `resendFailed` removida (chave morta), V9 coberto por teste de componente em vez de browser. **Pendências**: envio real pelo Resend nunca exercitado (placeholder local), V9 por browser, 429 real sem `ARCJET_KEY`; contas de QA do projeto de dev tiveram senha e `emailVerified` alterados |
| review  | done    | 2026-09-10 02:40 | review/review.md      | Branch **criada**: `feat/auth-recovery-verification` (de `400f290` = `origin/main`; sem `<project>` porque o diff cruza `apps/api` **e** `apps/app`). **Nada bloqueante em aberto** e corte de MVP entregue nos 5 itens. **Os 3 defeitos do `desenvolvedor` reconferidos e realmente corrigidos**, 2 deles com medição própria: anti-enumeração é **byte-idêntica** (status + corpo + 22 headers via `cmp`/`diff`, e screenshot de SHA1 igual reproduzido de forma independente), e a causa do `skipValidation` foi confirmada **na fonte** (`env-core:36` retorna `runtimeEnv` antes de montar os `extends`) — a correção é **segura**: não pode quebrar `next dev` (skip retorna antes de validar) nem o build (var `optional()`). **7 achados novos, 2 corrigidos nesta etapa**: ✅ **beco sem saída no reenvio** (D-C) — o estrangulamento do Firebase respondia `AUTH_EMAIL_VERIFICATION_FAILED` 400, cuja copy manda "peça um novo link" a quem acabou de apertar "Reenviar"; agora responde **`EMAIL_SEND_FAILED` 503**, **reusando** código existente em vez de inventar (a copy "não foi possível **enviar** … tente em instantes" já era a certa, e `AUTH_EMAIL_VERIFICATION_FAILED` passa a viver só no *confirm*, onde casa) — **zero chave nova de i18n**, `toolkit-error-codes.ts` intocado (verifiquei que `auth/internal-error` é do Admin SDK e nunca alcança `mapOobActionMessageToCode`), e a rota pública **não** foi tocada; ✅ 🔴 **descoberto ao reproduzir o D-C**: `useAlert` passava `theme: "system"` (preferência crua do `next-themes`) ao `react-toastify`, que não conhece esse tema e mantinha o texto branco default sobre o `bg-background` branco — **contraste 1:1, todo toast ilegível em light mode**, ou seja os 6 `error.code` novos **não chegavam ao usuário** no tema padrão; corrigido com `resolvedTheme` (medido: `rgb(255,255,255)`→`rgb(117,117,117)` sobre branco, ~4,6:1 AA), sem regressão na variante de sucesso. ✅ **oráculo de enumeração por tempo fechado (D-A)**: o handoff só provava a resposta, mas o relógio entregava a mesma informação — conhecido 1127–1265 ms × desconhecido 288–295 ms, faixas **disjuntas**; `buildAuthActionLink` + `sendEmail` foram para um `after()` (Next 16) e a resposta sai antes de qualquer consulta de conta, mantendo `EMAIL_NOT_CONFIGURED` **síncrono e primeiro** (ele é função só da configuração do fork) e sem tocar na rota autenticada de reenvio; **remedido** em 10 pares alternados com isolamento: faixas agora **sobrepostas** e o sinal **inverte de rodada para rodada** (mediana do desconhecido 31,4 ms *acima* da do conhecido, 13,3 ms) — um oráculo não muda de sinal; trabalho diferido segue acontecendo (21 eventos), **zero endereço no log**, falha no caminho assíncrono não derruba nada; ✅ **idioma atrasado uma navegação** no escopo não-autenticado: `getDictionary()` do servidor lê **só o cookie `x-locale`**, escrito depois do render, então `/en` mostrava o painel de depoimento em pt-br e `/es` em en (o `h1` escapava por vir do helper client, que lê `useParams()`) — trocado por `getTranslations(resolveLocale(params.locale))` em **6 Server Components** (layout + os 5 `generateMetadata`, que tinham o mesmo atraso no `<title>`). **Ainda abertas (3)**: 🟡 **causa-raiz do `extends` segue ativa** e já quebra `env.STRIPE_WEBHOOK_SECRET` em dev (webhook da Stripe local não processa evento); 🟡 corrida entre o envio de verificação e o `window.location.replace` pós-cadastro; 🟢 1,2 MB de screenshots versionados. **9 correções aplicadas** (D-A, idioma, D-C, contraste dos toasts, **3 senhas de QA em texto puro** removidas do handoff, `as string` eliminado, optional chaining, 2 comentários que mentiam). Rate limit: as 4 rotas conferidas **literal** contra o path real, e barra final **não** é bypass (308 do Next cai no path contado). Isenção do `oobCode`: **mínima e não abre nada** — 8 combinações no browser, incl. sessão anônima isolada. Zero string solta, zero referência ao fluxo em comentário. Corrigi também o handoff, que errava ao dizer que `packages/auth` não tem suíte Vitest (tem, e o teste de `reloadCurrentUser` é barato). `pnpm check` limpo (456 arquivos); **`turbo run lint typecheck test` 23/23, 2 passes depois das correções** (`securityPolicySources` nunca falhou em 6 passes, mas confirma-se lento: ~2,0–2,2 s / 1,1–1,4 s contra timeout default de 5 s); paridade i18n 27 ✅. `authPasswordReset.test.ts` 16→**24** (incl. *"resolves nothing about the account before answering"*, que trava o oráculo no nível determinístico) e `authEmailVerification.test.ts` 13→**14**. Validação visual **feita em 3 rodadas** (light+dark+mobile, pt-br+en+es, cadastro real ponta a ponta, estrangulamento do Firebase **reproduzido de propósito** para provar o D-C na tela, e as 5 telas × 3 idiomas sempre **chegando de outro idioma** — o defeito de locale é invisível num carregamento único). **Plano de 16 commits** proposto, com os três assuntos separados — fix do design system (#13), fix de locale (#14) e sync do backlog (#16) — todos **depois** do código da feature e derrubáveis sem rebase. **Commits e push pendentes de aprovação do usuário** |
| test    | done    | 2026-09-10 02:33 | test/report.md        | **Corte de MVP provado nos 5 itens**, com o item 5 saindo de "nominalmente entregue" para **medido**: reproduzi a condição exata do defeito de contraste (preferência `"system"` — o default de um fork novo — + SO em light, confirmado no DOM: `themePref: "system"`, `htmlClass: ["light"]`, `bodyBg: lab(100 0 0)`) e provei a correção em **4,61:1 (AA)** contra os **1:1** de antes, além de **18,73:1** em dark, nos **3 idiomas**. **+26 testes** em 4 arquivos (2 novos): `alertTheme.test.ts` (**11**) é o guarda que o `/review` pediu e é **guarda real** — contra o `useAlert.ts` de `HEAD` **8 dos 11 falham**; `useEmailVerification.test.tsx` (**7**) cobre um hook que não tinha **nenhum** teste, incluindo o caso que o defeito 3.3 exigia (falha ao reler a sessão **não** transforma confirmação bem-sucedida em erro) e a cadeia `error.code` → `FormattedError` → alerta; `authPasswordReset` +5 e `authEmailVerification` +3 fecham código gasto, limites de `oobCode` (2048/2049) e senha (6/1024/1025) recusados **antes** do provedor, e que a revogação mira a conta do `oobCode` e **não** um `email` injetado no corpo. **Gates verdes**: `pnpm check` 456/0, `pnpm turbo run lint typecheck test --force` **23/23 com 0 cached**, `pnpm test` 9/9, paridade i18n 27. **`securityPolicySources` nunca falhou**, e a fragilidade ficou explicada: **216–618 ms isolado × 1824–2203 ms na suíte** (3–8× por contenção) contra `testTimeout` default de 5 s que nenhuma das 9 configs declara — recomendo declarar. **Anti-enumeração reproduzida de forma independente**: corpo `cmp` byte-idêntico, **20 headers sem diferença**, log sem endereço, e os screenshots do painel com **SHA1 `ac21e722…` — o mesmo hash que o `/develop` mediu**. **D-A confirmado com medição própria** (conhecido 548–716 ms × desconhecido 278–288 ms, zero sobreposição) e registrado como **resíduo honesto**, não item fechado — e é **pior** que a minha amostra: o Firebase estava estrangulando os links, então o lado conhecido nem executou `sendEmail`. Repetição de submit **fechada empiricamente**: 3 cliques na tela de pedido → **1** requisição; 2 cliques no reenvio em voo → **1**. **23 screenshots** em `test/e2e/` cobrindo light/dark × desktop/mobile (390×844 sem overflow) × pt-br/en/es, com cadastro real pela UI, `Table` antd respeitando o tema em dark, e o toast de D-C mostrando a copy corrigida ("não foi possível **enviar** … tente em instantes") legível em light. **1 defeito novo achado, fora do diff**: 🟡 o painel de depoimento de `(unauthenticated)/layout.tsx` renderiza sempre o idioma da navegação **anterior** (`/en` mostra pt-br, `/es` mostra en) — Server Component lendo o cookie `x-locale` que é escrito depois do render; **pré-existente**, confirmado em `/en/sign-in` e `/es/sign-up`; a copy da feature está correta nos 3 idiomas. **Fronteiras NÃO aprovadas**: ⛔ entrega real de e-mail (exige SPF/DKIM), 429 real (`ARCJET_KEY` vazia), revogação cruzando para `apps/web`. `apps/api/.env` **restaurado byte-idêntico** (SHA conferido); contas de QA existentes **não alteradas**, só 1 conta descartável criada pela UI |
| observe | pending | -                | -                     | - (opcional)     |

## Notas

### Origem

- **Spec**: `specs/auth-recovery-verification.md` — **#1 da fila** do `specs/BACKLOG.md`
  (`value: alto`, `effort: M`, `audience: produto`, `mode: ambos`, `depends_on: [transactional-emails]`).
  Frontmatter atualizado nesta etapa para `status: in-progress` + `feature: auth-recovery-verification`.
  **A spec continua em `specs/`** durante o desenvolvimento — movê-la para
  `docs/features/auth-recovery-verification/spec.md` é do `/spec --sync`.
- **Dependência satisfeita**: `transactional-emails` mergeada em `main` (PR #9, commit `400f290`,
  CI verde nesse SHA). A base de e-mail está disponível.
- Nota de pesquisa citada pela spec: `specs/research/saas-starter-feature-benchmark.md` — prevalência
  **10/10**, o **único** item do painel com prevalência total, classificado como **bloqueador**.
- Nenhum card, wiki, Figma ou print. **Referências não lidas: nenhuma.**

### Decisões de produto recebidas do usuário (não re-litigar)

O usuário pediu loop sem interrupção e resolveu as 4 perguntas em aberto da spec (`:101-105`) adotando a
recomendação da própria spec:

1. **Anti-enumeração: sim.** O pedido de redefinição responde sempre a mesma coisa. → D-2 do plano.
2. **Verificação só no cadastro por senha**, não no primeiro login Google. → D-1 (sai por construção).
3. **Verificação ligada por padrão**, com o **bloqueio de acesso do não verificado DESLIGADO**. → nenhum
   guard, proxy ou layout passa a checar `emailVerified`.
4. **`not-configured`: PROPAGAR o `reason`, sem tocar na base de e-mail.** → D-4, resolvido sem violar (1).

### Reconferência das refs da spec (2026-09-10)

Todas reabertas e **confirmadas**: `firebase-identity-toolkit.ts` (`getWebApiKey:26`,
`parseToolkitResponse:36`, `identitySignUp:45`, `identitySignInWithPassword:62`,
`identitySignInWithGoogleIdToken:111`, `IdentityToolkitError:16`), `toolkit-error-codes.ts:5-20`
(5 casos, único chamador `users/route.ts:58` — **nenhuma rota de auth o usa**), `apps/api/proxy.ts:31-35`
+ `isRateLimitedPath:37-39` (`Array.includes`, match exato), `packages/auth/server.ts:212`
(`revokeUserSessions`, usado em `session-routes.ts:79`), `packages/sdk/src/types/user/user.ts:33`
(`emailVerified` órfão), `packages/email/index.ts:75,88,99-102`, `templates/action-link.tsx:11-12`
(`ActionSlug` genérico), `translations/packages/email/index.ts:21` (1 slug hoje: `confirmAccess`),
`translations/packages/shared/utils.ts:30-35,74-78,116-121` (`USERS_AUTH_*` nos 3 idiomas),
`apps/app/.../SignInForm.tsx:186-196` (rodapé só com "criar conta"), `auth/sign-up/route.ts:10-53`
(cria identidade + perfil e retorna sem e-mail nenhum). Grep de
`sendPasswordResetEmail|sendEmailVerification|updatePassword|confirmPasswordReset|oobCode`
em `apps/` + `packages/`: **zero ocorrências**.

**Uma precisão sobre a spec**, que não muda o corte e por isso **não** foi editada: a spec (`:31`)
descreve `auth/sign-up/route.ts` como se fosse o caminho do cadastro. Ele **não é** — a rota não tem
chamador, e o cadastro do app vai direto ao Firebase pelo client SDK. Isso desloca o gatilho da
verificação (D-1), sem mexer no que a spec pede.

### Achados para o `/spec --sync` (registrados, não corrigidos aqui)

- 🟡 **As 3 rotas de auth pré-existentes são dívida real**: `sign-in/route.ts:5,7` não valida body nem
  captura erro (senha errada é **500**, não 401); nenhuma das 3 usa `parseRequestJson` ou Zod; nenhuma usa
  `mapIdentityToolkitMessageToCode`; e os erros saem em **3 dialetos** — `{error:"str"}`
  (`sign-in:12`, `sign-up:26,40`, `google:28`), `{message:"str"}` (`me/route.ts`) e `{error:{code}}`
  (guards/proxy/schemas). Só o terceiro é traduzível. → Q5 do plano; vale spec própria.
- 🟡 **`sign-in/page.tsx:9` e `sign-up/page.tsx:9` leem `dictionary.apps.web.pages.*`** para a metadata
  enquanto os forms leem `dictionary.apps.app.pages.*`. As páginas novas usam o nó `app`,
  consistentemente; a inconsistência antiga fica.
- 🟡 **`auth/sign-in/google/route.ts:7,12` aceita `requestUri` do cliente sem allowlist**, com default
  hardcoded `http://localhost:3000`. Independente desta spec.
- ⚪ **`apps/api/env.ts:30` tem `skipValidation` em `development`**, então em dev o
  `env.NEXT_PUBLIC_APP_URL` pode vir `undefined` mesmo com `.env` preenchido. `canSendAuthActionLink()`
  cobre (responde `EMAIL_NOT_CONFIGURED`), mas anotado para não se perseguir fantasma no `/develop`.
- ⚪ `packages/email/package.json` sem `main`/`exports` (achado herdado do `transactional-emails`):
  `@repo/email` resolve só pelo alias TS. Esta é a **primeira** importação a partir da `apps/api`.

### Herança de risco (spec `:48-50`)

Esta é a **primeira feature a chamar `actionLinkEmail` por um caminho alcançável pela UI**.
`welcomeEmail` e `actionLinkEmail` têm zero chamador de produção, e a `apps/api` declara `@repo/email`
(`package.json:22`, `env.ts:2`) **sem nunca ter enviado nada**. Orçar descoberta de defeito de integração
da base de e-mail: primeiro envio real da API, primeiro `sendEmail` num handler de rota, primeiro consumo
do `SendResult` por quem chama. O item **V13** do roteiro visual (`/forgot-password` com
`RESEND_TOKEN=""` mostrando `EMAIL_NOT_CONFIGURED` em vez de sucesso falso) existe exatamente para isso.

### Restrições de processo

- **Nada implementado.** Nenhum arquivo em `apps/` ou `packages/` foi tocado nesta etapa.
- **Nenhuma branch criada, nada commitado.** A branch atual é `spec-sync-then-next-task` (não protegida)
  e carrega o sync do backlog **não commitado** — intocado. Quem nomeia e cria branch é o
  `revisor-codigo`.
- **`RATE_LIMITED_PATHS` não é automático** (`apps/api/proxy.ts:37-39`, match exato). As **4** strings
  novas têm de entrar literalmente, senão o endpoint de reset é gerador gratuito de e-mail na conta do
  fork. Commit 6 do plano, com extensão de `corsOrigin.test.ts:266-268`.
- **`PUBLIC_PATHS` é default-deny** (`apps/app/proxy.ts:53-58,143-148`) e é a **única** referência no
  repo. Sem a edição, as 3 páginas novas redirecionam para o sign-in.
- **Paridade i18n sai de graça**: `parity.test.ts:15-22` varre `globalTranslations` recursivamente, sem
  lista fixa de ramos. Os 3 nós novos e os 2 slugs de e-mail são cobertos sem uma linha de teste. Rodar
  `/i18n-sync`.
- **`HTTP_STATUS` ganha uma linha** (`SERVICE_UNAVAILABLE: 503`) — não tem 503 hoje
  (`packages/shared/utils/helpers/httpStatus.ts:1-13`), e `not-configured` não é 400 nem 500.
- **Validação visual é obrigatória** (regra de ouro 11): roteiro **V1–V13** na §8 do plano, incluindo a
  prova lado a lado da anti-enumeração (V2), a revogação de sessão cruzando apps (V6), a impersonação
  (V9) e os 2 slugs novos no preview da 3003 (V12). `agent-browser` **em sequência**.
- **Não adicionar nada ao `turbo.json`**: `lint`/`typecheck`/`test` têm `env: []` de propósito.

### Ordem de commit (do plano, §10.15)

`shared` (503) → `sdk` (4 actions) → `api` (links de ação → rotas de senha → rotas de verificação →
rate limit) → `app` (proxy → telas de senha → verificação/banner) → `internationalization`
(3 nós + 2 slugs + 6 `apiErrors`) → `docs(features)`. Um commit por app/pacote, testes junto da
funcionalidade que cobrem. **Implementar o i18n primeiro** (é a fonte dos tipos de copy) e commitá-lo
por último, com `git add` por caminho.

### O que o fork precisa configurar (pós-entrega)

Nenhuma variável **nova**; três deixam de ser opcionais de fato: `RESEND_FROM`/`RESEND_TOKEN` (com
**domínio verificado, SPF + DKIM** — passo de DNS, sem contorno), `FIREBASE_WEB_API_KEY` e
`NEXT_PUBLIC_APP_URL` apontando para o host real da `apps/app` (é a base do link do e-mail). Mais
`ARCJET_KEY`: sem ela o limitador é **no-op silencioso** (`packages/security/index.ts:42-44`) e o pedido
de reset fica ilimitado. **Nenhum passo no console do Firebase** — é o ponto do D-7.
