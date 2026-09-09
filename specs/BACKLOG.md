# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-09 (`/spec --sync`, pós-merge da PR #8) · anteriores: 2026-09-02 ·
> 2026-09-01 (3 rodadas) · 2026-08-31 · **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`api-hardening` fechada e arquivada** em
>    [`docs/features/api-hardening/spec.md`](../docs/features/api-hardening/spec.md). Os 5 itens do corte e
>    os 4 sinais de pronto foram reconferidos **no código mergeado** (`920ef6c`) — a resolução dos
>    conflitos da PR não comeu nada. O backlog saiu de 17 para **16 specs**.
> 2. **Um 🔴 falso removido dos achados.** O "perfil duplicado a cada login com Google" **não reproduz**:
>    foi corrigido por `3089d71` em 2026-08-31 e ainda assim sobreviveu a duas auditorias. Detalhe em
>    [Achados](#achados-da-varredura-que-não-viraram-spec).
> 3. **As 16 specs foram remedidas contra o código.** Nenhuma avançou desde 2026-09-02 — todas seguem com
>    o corte de MVP em zero, salvo os dois parciais já registrados nas próprias specs.
> 4. **Índice enxugado.** A narrativa sobre a reconciliação de duas auditorias paralelas e sobre "por que
>    `api-hardening` ainda não foi arquivada" descrevia um estado transitório que acabou; saiu. O que era
>    registro vivo — pendências sem dono, decisões tomadas, lacunas de corte — foi preservado e
>    consolidado em [Pendências vivas sem dono](#pendências-vivas-sem-dono).

## Contadores

Sobre as **16 specs que seguem em `specs/`**. Recontados do disco em 2026-09-09, lendo o frontmatter de
cada arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 14 |
| `approved` | 0 |
| `in-progress` | 1 |
| `done` (arquivadas) | 3 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 8 · `dx` 4 · `confianca` 4. **Por esforço:** P 0 · M 13 · G 3.

**`transactional-emails` foi aprovada em 2026-09-09** e é a única na fila — o pipeline saiu do ocioso e
entrou nela.

## Gates — medidos nesta auditoria

Re-executados com `--force`, não copiados do `/test` nem da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | **404 arquivos · 0 erros · 0 warnings** (`No fixes applied`) |
| `pnpm turbo run lint typecheck test --force` | **22 tasks, 22 successful, 0 cached** (1 `//#lint` + 13 `typecheck` + 8 `test`) |
| `pnpm turbo run test --force` | **8 workspaces · 54 arquivos · 421 testes**, todos verdes |

| workspace | arquivos | testes |
|-----------|---------:|-------:|
| `app` | 23 | 153 |
| `api` | 19 | 152 |
| `@repo/security` | 3 | 31 |
| `@repo/auth` | 2 | 29 |
| `web` | 3 | 22 |
| `@repo/shared` | 1 | 15 |
| `@repo/internationalization` | 2 | 11 |
| `@repo/payments` | 1 | 8 |
| **total** | **54** | **421** |

CI em `main`: **7 execuções, todas `success`** (`gh run list`), a última no merge da PR #8.

## Ordem recomendada

Respeita `depends_on` (medido do frontmatter nesta rodada) e prioriza o que **desbloqueia** e o que **fica
mais caro depois**.

| # | id | por que agora |
|---|----|---------------|
| 1 | [`transactional-emails`](transactional-emails.md) | **Raiz da cadeia bloqueada mais profunda do backlog.** Abre `auth-recovery-verification` diretamente e é pré-requisito de `account-settings` → {`account-security-mfa`, `data-rights-lgpd`} — 4 specs ativas a jusante (+ `teams-organizations`, `deferred`). **Precisão medida:** sozinha ela destrava **1** spec; as outras 3 exigem também `file-upload-storage` (#3), porque `account-settings` depende das duas. Estado reconferido: `packages/email/index.ts` tem 4 linhas e exporta só `resend`; `packages/email/templates/` tem **um** arquivo (`contact.tsx`), com copy em inglês literal no JSX (`:27,31,34`) e assunto literal (`:32`); não existe ramo de e-mail em `packages/internationalization/translations/`. |
| 2 | [`auth-recovery-verification`](auth-recovery-verification.md) | Commodity absoluta e ausente: `sendPasswordResetEmail`, `sendEmailVerification` e `updatePassword` dão **zero** ocorrências em `apps/` + `packages/`. Um fork não vai a produção sem "esqueci minha senha" — hoje o único caminho é resetar à mão no console do Firebase. `emailVerified` é copiado no mapper (`apps/api/(shared)/mappers/user.mapper.ts:8`) e **nenhum consumidor decide nada com ele**. |
| 3 | [`file-upload-storage`](file-upload-storage.md) | **Subiu de #7.** Deixou de ser "desbloqueia avatar" e passou a ser **co-requisito de `account-settings`** — sem ela a cadeia de #1 trava no segundo nível. `firebase.json` não tem bloco `storage`; `packages/design-system/components/form/hookform/` tem 7 componentes e nenhum de arquivo. Nota: a CSP agora nomeia origens de imagem explicitamente, então storage novo exige entrada na política. |
| 4 | [`firebase-emulator-seed`](firebase-emulator-seed.md) | Quarta auditoria consecutiva com o mesmo veredito: `firebase.json` tem **só** `firestore.rules` + `firestore.indexes.json`, **sem bloco `emulators`**; `firebase-tools` não é dependência de ninguém. São **421 testes rodando a cada PR e nenhum toca o banco ou as rules** — a única prova de que o `deny-all` funciona segue sendo um `curl` manual. É o **gargalo único** de `e2e-testing`. |
| 5 | [`cursor-pagination`](cursor-pagination.md) | Todo fork herda "ler a coleção inteira": `base.repository.ts:36-49` faz `.get()` sem `limit`/`orderBy`/`startAfter`; filtro e ordenação acontecem em memória. Depois de haver dados em produção, a correção quebra contrato do SDK. Cruza com a dívida do `update()` (achados), que precisa de `orderBy` estável em `createdAt`. |
| 6 | [`audit-log`](audit-log.md) | O painel **já tem impersonação** e nada registra quem entrou na conta de quem — o switch é 100% client-side (`apps/app/shared/stores/panelStore.ts:76-90`). A mutação sob impersonação já foi bloqueada; o **registro** não existe. |
| 7 | [`cookie-consent`](cookie-consent.md) | **A única spec do backlog com violação ativa, não com ausência de recurso:** `packages/analytics/provider.tsx:15` monta o Vercel Analytics **incondicionalmente** e `:16-18` monta o GA checando só a env — zero consentimento, sobre todo o app (`apps/app/app/layout.tsx:39-46`). `depends_on` vazio. |
| 8 | [`observability-logging`](observability-logging.md) | Sem logger estruturado e sem coleta de erro: zero `sentry`/`opentelemetry` no repo; os três `global-error.tsx` não reportam nada. **1 dos 6 itens já está entregue por tabela** (o código morto de analytics de servidor foi removido). `api-hardening` deixou o primeiro log deliberado (`apps/api/proxy.ts:41-49`) — existe um formato a padronizar, e o "log estruturado sobre os bloqueios" saiu de lá explicitamente apontando para cá. |
| 9 | [`billing-subscription`](billing-subscription.md) | Monetização é o maior valor bruto do backlog e continua em zero: nenhuma rota sob `payments/`, `UserDTO` sem `subscription`, webhook com dois handlers `// TODO`. ⚠️ **A doc descreve como pronto o que não existe** (ver achados) — corrigir a doc independe de implementar a spec. **Pré-requisito barato:** o 🔴 de `packages/payments/ai.ts` explode no primeiro fork que importar o pacote, e é esta spec que faria alguém importar. |
| 10 | [`account-settings`](account-settings.md) | 🔒 Bloqueada por #1 e #3. A sidebar tem 4 links de Settings apontando para `#` (`routes.tsx:63-83`) e **todas** as rotas de usuário são `requireAdminApi`: ninguém consegue editar a si mesmo. |
| 11 | [`onboarding-flow`](onboarding-flow.md) | Maior desequilíbrio valor/prevalência do painel (3/10 entregam) e é onde o usuário decide se fica. `grep onboarding|onboarded|profileComplete` = **0 ocorrências**. |
| 12 | [`dashboard-home`](dashboard-home.md) | As duas homes do painel são 11 linhas e o literal `"Home"` (`(common)/(pages)/page.tsx:7` e `(admin)/admin/(pages)/page.tsx:7`) — e a chave de dicionário **já existe** e não é usada (`translations/apps/app/pages/common/routes/index.ts:3,17,31`). É a primeira tela de todo fork. |
| 13 | [`data-rights-lgpd`](data-rights-lgpd.md) | 🔒 Bloqueada por `account-settings` (2 níveis abaixo de #1). Obrigação legal com prazo; fica mais cara a cada coleção nova. O único `DELETE` é admin-only e é soft delete — o e-mail continua ocupado no Firebase Auth. |
| 14 | [`e2e-testing`](e2e-testing.md) | 🔒 Bloqueada por #4, o único gargalo restante. Zero `playwright`/`cypress`/`axe` no repo. |
| 15 | [`account-security-mfa`](account-security-mfa.md) | 🔒 Bloqueada por `account-settings` — **mas o item 1 do corte não deveria estar** (ver [Dependências](#dependências-e-bloqueios)). Prevalência baixa (MFA 3/10, sessões 1/10). |

### O que **não** foi escolhido para #1, e por quê

- **`cookie-consent`** é a única com violação legal **em curso** (tags carregando sem base legal, hoje), e
  ainda assim não foi ao topo: destrava zero specs, e a exposição real de um boilerplate sem usuários é
  baixa. Se o primeiro fork for a público antes de #1 sair, esta ordem se inverte — é a troca a fazer
  conscientemente, não por acidente.
- **`firebase-emulator-seed`** foi o concorrente real e perdeu por margem estreita: destrava **1** spec
  (`e2e-testing`, esforço G, valor médio) contra a cadeia de 4 de `transactional-emails`. É
  infraestrutura de teste — retorno diferido, valor crescente. Ficou em #4.
- **`billing-subscription`** tem o maior valor bruto e mesmo assim ficou em #9: arrasta o 🔴 do
  `packages/payments/ai.ts`, um webhook que é casca e uma documentação que mente — três pendências que
  **não são a spec** e que encareceriam a tarefa antes de ela começar.

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-09 |
|------|--------------|------------------------|
| [`auth-recovery-verification`](auth-recovery-verification.md) · [`teams-organizations`](teams-organizations.md) | `transactional-emails` | 🔒 bloqueada — é o que põe `transactional-emails` em #1 |
| [`account-settings`](account-settings.md) | `auth-recovery-verification`, `file-upload-storage` | 🔒 bloqueada pelas **duas**; é por isso que `file-upload-storage` subiu para #3 |
| [`account-security-mfa`](account-security-mfa.md) · [`data-rights-lgpd`](data-rights-lgpd.md) | `account-settings` | 🔒 bloqueadas em cadeia (2 níveis abaixo de #1) |
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | ✅ `ci-pipeline` entregue · 🔒 `firebase-emulator-seed` — **gargalo único** |
| [`audit-log`](audit-log.md) · [`cursor-pagination`](cursor-pagination.md) · [`firebase-emulator-seed`](firebase-emulator-seed.md) | `firestore-admin-access` | ✅ satisfeita (entregue em 2026-08-31) |
| [`billing-subscription`](billing-subscription.md) · [`cookie-consent`](cookie-consent.md) · [`dashboard-home`](dashboard-home.md) · [`file-upload-storage`](file-upload-storage.md) · [`observability-logging`](observability-logging.md) · [`onboarding-flow`](onboarding-flow.md) · [`transactional-emails`](transactional-emails.md) | — | ✅ sem dependência |

> **O grafo está mais restritivo que a realidade técnica em um ponto.** O item 1 do corte de
> `account-security-mfa` — fechar a janela de revogação (`packages/auth/server.ts:123` chama
> `verifyIdToken` **sem** `checkRevoked`) — **não depende de `account-settings` para nada**: é uma
> correção de guard, não uma tela de conta. O `depends_on` da spec o mantém preso 2 níveis abaixo de #1,
> quando ele poderia ser tarefa direta hoje. A própria spec (`:146-148`) já recomenda desacoplá-lo. Ver o
> 🔴 correspondente em [Achados](#achados-da-varredura-que-não-viraram-spec).

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | 🔒 `account-settings` |
| [`account-settings`](account-settings.md) | Área de conta e preferências do usuário | produto | alto | M | `proposed` | 🔒 `auth-recovery-verification`, `file-upload-storage` |
| [`audit-log`](audit-log.md) | Trilha de auditoria de ações sensíveis | confianca | alto | M | `proposed` | ✅ `firestore-admin-access` |
| [`auth-recovery-verification`](auth-recovery-verification.md) | Recuperação de senha e verificação de e-mail | produto | alto | M | `proposed` | 🔒 `transactional-emails` |
| [`billing-subscription`](billing-subscription.md) | Assinatura Stripe de ponta a ponta | produto | alto | M | `proposed` | — |
| [`cookie-consent`](cookie-consent.md) | Consentimento de cookies e Consent Mode | confianca | alto | M | `proposed` | — |
| [`cursor-pagination`](cursor-pagination.md) | Paginação por cursor no BaseRepository e no SDK | dx | alto | M | `proposed` | ✅ `firestore-admin-access` |
| [`dashboard-home`](dashboard-home.md) | Home do painel com widgets | produto | médio | M | `proposed` | — |
| [`data-rights-lgpd`](data-rights-lgpd.md) | Direitos do titular: exportar dados e excluir conta | confianca | alto | G | `proposed` | 🔒 `account-settings` |
| [`e2e-testing`](e2e-testing.md) | Testes E2E e acessibilidade automatizada | dx | médio | G | `proposed` | ✅ `ci-pipeline` · 🔒 `firebase-emulator-seed` |
| [`file-upload-storage`](file-upload-storage.md) | Upload de arquivos e storage | produto | alto | M | `proposed` | — |
| [`firebase-emulator-seed`](firebase-emulator-seed.md) | Emulador do Firebase, seed e primeiro admin | dx | alto | M | `proposed` | ✅ `firestore-admin-access` |
| [`observability-logging`](observability-logging.md) | Observabilidade: erros, tracing e logs estruturados | dx | alto | M | `proposed` | — |
| [`onboarding-flow`](onboarding-flow.md) | Onboarding pós-cadastro | produto | alto | M | `proposed` | — |
| [`teams-organizations`](teams-organizations.md) | Organizações, membros e convites | produto | alto | G | `deferred` | 🔒 `transactional-emails` |
| [`transactional-emails`](transactional-emails.md) | E-mails transacionais traduzidos | produto | alto | M | **`in-progress`** | — |

## Entregues

Specs concluídas e **arquivadas** junto da feature que as implementou.

| id | entregue em | spec arquivada |
|----|-------------|----------------|
| `firestore-admin-access` | 2026-08-31 | [`docs/features/firestore-admin-access/spec.md`](../docs/features/firestore-admin-access/spec.md) |
| `ci-pipeline` | 2026-09-01 | [`docs/features/ci-pipeline/spec.md`](../docs/features/ci-pipeline/spec.md) — ⚠️ fechada com 1 item do corte em aberto |
| `api-hardening` | 2026-09-09 | [`docs/features/api-hardening/spec.md`](../docs/features/api-hardening/spec.md) — 5/5 do corte entregues; 5 pontos em aberto registrados na spec |

As **duas** features concluídas sem spec — `auth-panel-context` e `impersonation-read-only` — não constam
aqui: o `spec: -` no `STATE.md` das duas está correto, não é vínculo faltando.
*(`docs/features/` tem 5 pastas e **3** `spec.md` arquivados.)*

## Pendências vivas sem dono

Itens que **não são código a escrever numa spec** e que somem do radar se não ficarem escritos. Nenhum tem
dono. Specs arquivadas não são reconciliadas por `/spec --sync` futuro — este é o registro.

| # | pendência | origem | custo |
|---|-----------|--------|-------|
| 1 | **`main` não tem branch protection.** O CI **sinaliza e não bloqueia**: uma PR vermelha pode ser mergeada, e a PR #5 foi mergeada sem gate. Reconferido em 2026-09-09: `gh api …/branches/main/protection` → **404 `"Branch not protected"`**, `gh api …/rulesets` → **`[]`** — as duas portas de bloqueio do GitHub, as duas fechadas. Ligar exigindo o check `verify` (`docs/SETUP.md:122-133`) resolve **também** o item 2 do corte de [`e2e-testing`](e2e-testing.md), que herda a mesma pendência | `ci-pipeline` (arquivada) | minutos |
| 2 | **O login com Google nunca teve passe manual com conta real.** O `/test` provou o mecanismo do COOP via `postMessage`, não o fluxo ponta a ponta. Modo de falha silencioso: o popup fecha e nada acontece, sem mensagem e sem log | `api-hardening` (arquivada) | ~2 min |
| 3 | **Na `apps/web` a CSP é Report-Only** (`apps/web/proxy.ts:36,68-74`), não bloqueante — o item 1 do corte de `api-hardening` diz "com CSP ativa", então a landing cumpre metade. Foi decisão deliberada da spec, e a política rodou com **zero violações reportadas**: virar a chave é barato | `api-hardening` (arquivada) | P |
| 4 | **Contas de QA acumuladas** no projeto Firebase de dev (`next-boilerplate-576d0`) por quatro pipelines: `qa-admin@`, `qa-common@`, `qa-review-common@`, `qa-ci-admin@`, `qa-review-ci@`, `qa-common-ci@`, `qa-api-hardening@`, `review-api-hardening@` (todas `example.com`). Sem PII real e sem senha em arquivo. Limpar em Authentication + o doc `user` no Firestore | 4 pipelines | P |
| 5 | **Branches mergeadas ainda vivas no remoto:** `api-hardening-flow` (PR #8), `ci/feat/github-actions-pipeline` (#5), `ci/chore/bump-actions-to-node24` (#7), `specs-feature-planner-agent` (#2), `api/fix/impersonation-read-only` (#3), `feat/initial-files`. As PRs são mergeadas por squash e as branches ficam | higiene | P |

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

| id | o que a spec afirmava | o que o código mostra | ação |
|----|----------------------|------------------------|------|
| [`e2e-testing`](e2e-testing.md) **(nova, 2026-09-09)** | `:35-38` — "7 tasks de teste / 331 testes", medido em 2026-09-01 | **8 tasks / 421 testes** — `api-hardening` acrescentou a oitava config (`@repo/security`, 31 testes) e levou a `apps/web` de 15 para 22 | **texto corrigido na spec.** A spec estava desatualizada; a implementação não desviou. **O argumento não muda** — a lacuna nunca foi o número de testes unitários, e sim que nada exercita um fluxo de ponta a ponta |
| [`onboarding-flow`](onboarding-flow.md) **(nova, 2026-09-09)** | cita o helper `ensureDefaultUserProfile` | O nome real é `createDefaultUserProfile` (`apps/api/(shared)/lib/user-merge.ts:47`) desde `3089d71` | deriva **de nomenclatura**, não de comportamento. Não muda o corte; anotada aqui em vez de editar a spec, porque o parágrafo que a cita segue correto no mérito |
| [`api-hardening`](../docs/features/api-hardening/spec.md) | `:99` — a `apps/web` "é a mais sensível a CSP por causa de scripts de marketing/analytics" | É o contrário: o `AnalyticsProvider` tem **um único** consumidor (`apps/app/app/layout.tsx:3,39`); a landing não carrega script de terceiro nenhum | corrigido em 2026-09-02, antes do arquivamento. A conclusão prática sobreviveu invertida: a landing entrou em Report-Only não por ter scripts, mas por ser onde um fork **vai** bolar tag de marketing |
| [`billing-subscription`](billing-subscription.md) | refs do cliente `stripe` em escopo de módulo | `getStripe()` em `packages/payments/index.ts:14-24`, devolvendo `null` sem chave | refs corrigidas + consequência para a spec: toda rota de pagamento precisa tratar o `null` |
| [`observability-logging`](observability-logging.md) | `packages/analytics/server.ts` quebrado; `instrumentation-client.ts:1` só um comentário | os **dois arquivos foram apagados** | achado resolvido e **1 item do corte marcado como entregue por tabela** |

**Nenhuma regressão detectada.** As capacidades das 3 specs arquivadas foram reconferidas:
`firestore.rules` intacto e zero import `firebase/*` na `apps/api`; `.github/workflows/ci.yml` no ar com 7
execuções verdes; a borda da API com CSP, allowlist e rate limit nos arquivos citados na spec arquivada.

## A decisão que não pode esperar a fila

`teams-organizations` é a única spec cuja **decisão** custa mais que a implementação: retrofitar escopo por
organização é **reescrita, não refactor** (6/10 de prevalência, esforço G, "a decisão mais cara de
postergar").

**Decidido em 2026-08-22:** `deferred` — adiar a implementação, **não** a decisão. O que torna o adiamento
honesto são duas contrapartidas de esforço P que **não dependem desta spec** e valem como tarefa direta no
`/analyze`:

1. escrever em `docs/ARCHITECTURE.md` se este core é **B2B ou B2C por padrão** — medido hoje,
   `grep -niE "b2b|b2c|organiza" docs/ARCHITECTURE.md` retorna **0 resultados**;
2. concentrar o predicado de posse num ponto único de escopo — `row.userId !== ctx.subjectProfile.id`
   segue copiado **3 vezes no mesmo arquivo** (`apps/api/app/(routes)/entities/[id]/route.ts:16,32,65`),
   inalterado desde 2026-08-22.

**Nenhuma das duas foi feita até 2026-09-09** — os juros correm há dezoito dias, enquanto o backlog seguiu
acrescentando recursos escopados por usuário.

## Achados da varredura que não viraram spec

Defeitos e inconsistências encontrados na descoberta e nos pipelines. **Não são funcionalidades** — são
correções pontuais, algumas de minutos. Viram tarefa direta no `/analyze`, sem passar por spec.

> **Auditoria de 2026-09-09.** **1 achado removido por não reproduzir** — e o modo como ele sobreviveu
> importa mais que o achado. O 🔴 "**perfil duplicado a cada login com Google**" afirmava que
> `ensureDefaultUserProfile` era chamado incondicionalmente em `sign-in/google/route.ts:19`. **Isso foi
> verdade até `3089d71` (`firestore-admin-access`, mergeada em 2026-08-31)**, que removeu a chamada e
> renomeou o helper. A rota hoje tem 32 linhas e chama **só** `getMergedUserByUid` (`:16`), que checa
> `findByReferenceId` antes de criar (`user-merge.ts:19-23`). O achado foi então **recopiado como live
> pelas auditorias de 2026-09-01 e 2026-09-02**, com refs a um arquivo que já não existia naquela forma.
> É exatamente o apodrecimento que a `/spec-audit` existe para pegar, e desta vez ele estava na própria
> lista de achados. **4 achados novos** vindos desta rodada. Os demais foram reconferidos e seguem de pé.

Os primeiros são de **segurança** e foram confirmados diretamente no código.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **Revogar sessão não derruba o ID token.** `verifyIdToken(token)` é chamado **sem o argumento de revogação** (`packages/auth/server.ts:123`), e `resolve-api-actor.ts:26-29` tenta o bearer ID token **antes** do cookie — que, esse sim, usa `verifySessionCookie(..., true)` (`:193`) | `packages/auth/server.ts` · `apps/api/(shared)/lib/resolve-api-actor.ts` | Depois de revogar as sessões, um ID token já emitido continua passando no guard da API até expirar (1 hora). A base está metade correta — e é a metade errada que vem primeiro. **É o item 1 do corte de `account-security-mfa`, e não depende de `account-settings`**: pode ser tarefa direta hoje. |
| 🔴 **`packages/payments/ai.ts:4-5`** tem o defeito gêmeo do que já foi corrigido no `index.ts`: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY \|\| "" })` em **escopo de módulo** | `packages/payments/ai.ts` | O mesmo padrão no `index.ts` deixava `api#build` vermelho e foi corrigido com `getStripe()` (`index.ts:14-24`). O `ai.ts` não explode hoje **só porque nada importa `@repo/payments/ai`** — explodiria no primeiro fork que importasse, e `billing-subscription` é justamente o que faria alguém importar. |
| 🔴 **`apps/app/app/layout.tsx:3` importa `@repo/analytics` sem `apps/app/package.json` declarar** a dependência — funciona por hoisting do pnpm | `apps/app/app/layout.tsx:3` · `apps/app/package.json` | Além do risco de resolução, **o turbo não invalida `app#*` quando `@repo/analytics` muda** — cache mentindo num gate que roda em toda PR. |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo.** Com `NODE_ENV=production` e a variável ausente, `register()` lança (`apps/api/instrumentation.ts:17-21`), o Next imprime `Failed to prepare server` e **fica no ar respondendo 500 a tudo** | `apps/api/instrumentation.ts:17-21` | O efeito pretendido é atingido — nada é servido —, mas uma plataforma que só verifica se a porta responde veria o container **saudável**: um deploy quebrado passaria por bem-sucedido. Ou o health check distingue 5xx, ou o gate chama `process.exit(1)`. Registrado também na spec arquivada de `api-hardening`. |
| 🟡 **`skipValidation: true` faz o t3-env descartar os `extends`**, então o bloco `client` da `apps/web` parece validar e não valida. Causa raiz no pacote instalado: `@t3-oss/env-core/dist/src-Bb3GbGAa.js:36-37` devolve o `runtimeEnv` **antes** de montar o schema e mesclar os `extends` | `apps/web/env.ts:23,12-16` | Causa raiz de 3 sintomas, 1 contornado: (a) a CSP não enxergava a URL da API — contornado declarando as vars localmente; (b) o CTA "Ir para o painel" da landing **já cai no fallback hoje**, porque `NEXT_PUBLIC_APP_URL` vem via `extends` e chega `undefined`; (c) `secure()` na `apps/web` lê `ARCJET_KEY` pelo mesmo caminho. Pior que o bug: o bloco `client` tem **forma** de validação e não valida nada. Contornado, não corrigido. |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento.** `apps/api/env.ts:30` usa `skipValidation: process.env.NODE_ENV === "development"`; nesse modo o t3-env descarta as chaves vindas de `extends` (`:9`), e `env.STRIPE_WEBHOOK_SECRET` é `undefined` em `next dev` | `apps/api/env.ts:9,30` | Mesma causa raiz do anterior — os dois deveriam ser corrigidos juntos. O guard cai sempre no ramo `"Not configured"`, então `pnpm --filter api dev:with-stripe` **não pode funcionar**. |
| 🟡 **Webhook da Stripe é casca.** Roteia só `checkout.session.completed` (`:50`) e `subscription_schedule.canceled` (`:54`); os dois handlers (`:8`, `:18`) são stubs `// TODO` que checam `data.customer` e retornam sem persistir nada | `apps/api/app/(routes)/webhooks/payments/route.ts` | A assinatura **é** validada (`:43`); nada é persistido. Escopo de `billing-subscription`. **Novo nesta rodada:** `:63` devolve `{ result: event }`, ecoando o objeto Stripe inteiro na resposta. |
| 🟡 **`FormattedError.retryAfterSeconds` não tem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:13,20` | Toda a cadeia para levar a espera até a tela está pronta — `Retry-After` no 429, `Access-Control-Expose-Headers` para o script poder lê-lo, o parse do delta-seconds — e **para no último metro**: o toast diz "aguarde um instante", sem o número que o servidor mandou. |
| 🟡 **`isRateLimitEnforced()` é export morto.** `packages/security/index.ts:32` exporta o predicado e **ninguém** o chama fora dos testes | `packages/security/index.ts:32` | O papel que ele cumpriria acabou coberto pelo aviso de boot (`instrumentation.ts:23-27`), que lê `process.env.ARCJET_KEY` direto. Duas fontes de verdade para o mesmo fato, e a que tem nome não é a usada. |
| ⚪ **Um `useList*` que falha renderiza o estado vazio, não erro.** Um 429 na lista de entidades mostra "Nenhuma entidade cadastrada" | `apps/app/…/entities/(hooks)/useListEntities.tsx:11,16` · `…/(home)/EntitiesListClient.tsx:145-148` | O hook **devolve** `error` (`:16`); o componente só passa `locale={{ emptyText }}` à `Table` e **nunca lê** `error`. Lista que falhou fica indistinguível de lista vazia, e o usuário conclui que apagaram os dados dele. Vale para todo `useList*` no mesmo padrão. |
| 🟡 **`update()` do `BaseRepository` reescreve o documento inteiro e corrompe o tipo de `createdAt`.** `:102-117` lê via `findById()` (que passa pelo mapper e devolve `createdAt` **serializado como string ISO**), faz spread e grava tudo de volta | `apps/api/(shared)/repositories/base.repository.ts:102-117` | ⚠️ **Preservado de propósito** em `firestore-admin-access` (migração *contract-preserving*). Depois do primeiro `PUT` o campo deixa de ser `Timestamp` e vira `String`: consulta por range/`orderBy` mistura tipos. **Cruza diretamente com `cursor-pagination` (#5)**, que precisa de `orderBy` estável. |
| 🟡 **`userRepository.list()` mente no tipo de retorno**: declara `Promise<UserDTO[]>` (`:32`) mas devolve o merge com o Firebase Auth, que é `UserWithAuthDTO` (cast em `:56`) | `apps/api/(shared)/repositories/user.repository.ts:32,52-63` | O SDK **já declara o tipo certo**, então a mentira está só no repositório — e obrigou o teste a fazer cast para ler o campo. |
| 🟡 `delete()` herdado por todo repositório é **soft delete**: grava `deletedAt` e nada mais | `apps/api/(shared)/repositories/base.repository.ts:127-129` | O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. Bloqueia o item 3 de `data-rights-lgpd`. |
| ⚠️ **Documentação descreve como implementado um fluxo de pagamentos que não existe**: rotas `/payments/*`, `UserDTO.subscription`, `userRepository.updateSubscriptionByReferenceId`, `apiClient.payments.*`, tela "Minha assinatura" e eventos de webhook que o código não roteia | `docs/PAYMENTS.md:5-12` (`docs/SECURITY.md` diz o **oposto**, e está certo) | Pior classe de erro de documentação: mente com aparência de autoridade. Dos **6 itens** de "Estado atual (implementado)", só o **primeiro** é verdadeiro — reconferido nesta rodada, item a item. Corrigir a doc **independe** de implementar a spec. |
| 🟡 `packages/auth/package.json:12` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth/package.json:12` | Export quebrado. **Quarta auditoria consecutiva**; o arquivo continua não existindo no disco. |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` dos três apps | `packages/auth/package.json:24` | Origem do aviso `deprecated next@15.5.2` no `pnpm install`. Um pacote de **autenticação** resolvendo uma major diferente do runtime que o consome é risco desproporcional ao esforço de alinhar. |
| 🟡 `chart.tsx` é código morto — `recharts` pesa no bundle sem uso | `packages/design-system/components/ui/chart.tsx` | 11 KB no disco e `grep ui/chart` em `apps` + `packages` retorna **zero** importadores. `dashboard-home` (#12) é a spec que o resgataria. |
| 🟡 **NOVO — `input-otp.tsx` é código morto**, sem nenhum consumidor | `packages/design-system/components/ui/input-otp.tsx` | Mesma classe do `chart.tsx`. `account-security-mfa` é a spec que o usaria. |
| 🟡 **NOVO — dependências de instrumentação instaladas e nunca importadas:** `import-in-the-middle@^2.0.0` (`:26`) e `require-in-the-middle@7.5.2` (`:35`) | `apps/app/package.json:26,35` | São as dependências típicas de OTel/Sentry e dão **zero** importações no repo. Hoje é peso morto — e **não** contam como evidência de observabilidade. |
| 🟡 `photo` é `z.string().trim().max(...)` — qualquer texto passa, não é URL validada, nos **dois** schemas (create `:23`, update `:34`). O front **valida** como URL, a API não | `apps/api/(shared)/validation/entity.schema.ts:23,34` | Validação que só existe no navegador é o anti-padrão que a regra de ouro 4 proíbe. **Consequência nova:** com `img-src` sendo uma allowlist explícita, uma `photo` de host arbitrário é bloqueada pela CSP em runtime — a falha saiu do banco e chegou à tela. |
| 🟡 **Strings de UI soltas, fora do dicionário** — `"Switch language"` (`sr-only`) nos dois language switchers, `"Início"` + `href="/painel"` no breadcrumb, `"Sair"` no ProfileDropdown, os 8 títulos de `routes.tsx` | `apps/app/shared/components/ui/LanguageSwitcher.tsx:79` · `apps/web/…/language-switcher.tsx:68` · `PageBreadcrumb.tsx:28,30` · `ProfileDropdown.tsx:47` · `(common)/routes.tsx:39-83` | Viola a regra de ouro 2. Agrava no `sr-only`: é **exatamente** o texto que só o leitor de tela recebe, e fica sem tradução para quem mais depende dele. |
| 🟡 String `"Home"` literal fora do dicionário nas duas home pages — **e a chave já existe** (`translations/apps/app/pages/common/routes/index.ts:3,17,31`) | `apps/app/…/(common)/(pages)/page.tsx:7` · `…/(admin)/admin/(pages)/page.tsx:7` | Viola a regra de ouro 2 com a tradução pronta ao lado. |
| 🟡 **`setTimeout` sem cleanup** no `useEffect` do carrossel: `:24-38` agenda o avanço e não devolve função de limpeza, com `[api, current]` nas dependências | `apps/web/…/(home)/components/cases-client.tsx:29` | Um timer é agendado a cada avanço e nenhum é cancelado na desmontagem, chamando `setCurrent` em componente morto. É a home da landing: o caminho mais percorrido do repo. |
| 🟡 **`hydration mismatch` num `id` do Radix + "Select is changing from uncontrolled to controlled"** | `apps/app/shared/components/ui/PanelNavbarControls.tsx` · `Sidebar.tsx:96-154` | O `Collapsible` do `GlobalSidebar` é montado pelos **dois** painéis, então o aviso aparece em **toda carga do painel**, sem interação. Contradiz a regra do escopo de resolver no servidor todo estado de UI persistido no browser. |
| 🟡 **`/auth/sign-in` e `/auth/sign-up` da api não têm consumidor nenhum e não seguem o contrato `{ error: { code } }`** — devolvem string crua (`sign-in/route.ts:12`, `sign-up/route.ts:26,40`); a primeira responde **500** para credencial inválida | `apps/api/app/(routes)/auth/sign-in/route.ts` · `sign-up/route.ts` | Viola a regra de ouro 3. `api-hardening` pôs rate limit nessas duas rotas — protegeu endpoints que **ninguém chama e que respondem errado**. A decisão certa provavelmente é removê-las, não consertá-las; enquanto existem, são POST público sem guard queimando cota da Identity Toolkit. |
| 🟡 **`turbo run` aborta na primeira falha** (`--continue=false` é o default), então uma PR com dois tipos de defeito mostra só o primeiro | `.github/workflows/ci.yml:39` | É o comportamento correto, mas quem ler o log da PR verá "3 suítes não rodaram" e pode se confundir. `--continue` resolveria, ao custo de o comando do CI divergir do local — daí ser achado, e não correção óbvia. |
| 🟡 **`apps/app/next.config.ts:19` lista `www.google.com` em `images.domains`** sem uso e sem `remotePattern` correspondente; `domains` está **deprecado** no Next 16 | `apps/app/next.config.ts:19` | Origem sem uso numa lista de hosts confiáveis de imagem é superfície gratuita — e agora **divergente** da CSP, que nomeia só `lh3.googleusercontent.com`. Duas allowlists de imagem que discordam. |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`**; `isSameOriginRequest` **retorna `true` quando não há header `Origin`** | `packages/shared/utils/helpers/cookies.ts:13` · `packages/auth/session.ts:66-70` | ASVS 5.0 L1 (3.3.1) exige `Secure`. O helper hoje só grava `x-locale`, **não** o cookie de sessão. Sobre o segundo: `api-hardening` adotou **a mesma** decisão na borda, mas com o porquê escrito e um limite explícito (`cors.ts:42-52`); o de `session.ts` continua sem. |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta.** O cliente grava com `expires`, mas na requisição seguinte os proxies fazem `cookieStore.set("x-locale", …)` **sem `maxAge`**, rebaixando-o a cookie de sessão | `apps/web/proxy.ts` · `apps/app/proxy.ts` · `packages/shared/utils/helpers/cookies.ts` | O idioma escolhido **não sobrevive ao fechamento do navegador**. Bug de produto silencioso: ninguém reclama, todo mundo reescolhe o idioma. |
| 🟡 **Casamento exato de rota no rate limit deixa variações de fora.** `RATE_LIMITED_PATHS.includes(pathname)` não pega `/auth/sign-in/` (barra final) nem futuras `/auth/sign-in/*` | `apps/api/proxy.ts:31-39` | Decisão consciente do `/review`: `startsWith` limitaria `/auth/sign-in/google` duas vezes. Há teste fixando o comportamento. Revisitar quando entrar a 4ª rota pública. |
| 🟡 `useHealthCheck` usa `useQuery` direto (`:29`), contra a convenção do escopo | `apps/app/shared/hooks/useHealthCheck.ts` | Viola `apps/app/CLAUDE.md`. |

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo — é isso que impede o backlog de
inchar a cada rodada.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| Notificações in-app + preferências | 3/10 | Esforço G se feito à mão (feed, badge, fan-out, digest); a referência do ecossistema terceiriza num serviço pago com chave obrigatória. Reavaliar quando houver um caso de fan-out real. |
| Command palette (⌘K) | 2/10 | Aparece em templates de dashboard, não em kits de SaaS. Barato, mas valor estético — não é diferencial de MVP. |
| Metering / limites de uso / créditos | 2/10 | Muito hype por causa de AI SaaS, mas é DIY sobre a Meters API em quase todo kit. Só faz sentido depois de `billing-subscription`. "Rate limit por usuário/plano" era explicitamente "fora do corte" de `api-hardening`, e o ponto de extensão existe (`checkRateLimit` decide em vez de lançar) — o custo de plugar caiu, o valor não subiu. |
| Feature flags | 2/10 | Dá para viver com variável de ambiente num MVP; flag sem data de remoção vira dívida permanente. Reavaliar após `observability-logging`. |
| Firebase App Check | — | A outra metade do controle 16 da nota de conformidade, e **explicitamente fora do corte** de `api-hardening`: atesta o cliente, mas exige configuração de projeto Firebase por fork. Reavaliar se aparecer abuso que o rate limit por IP não contenha. |
| Waitlist / captura de lead | 2/10 | Alto valor **só** na fase pré-lançamento — é decisão do fork, não do core. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto **é** uma API. Webhook de saída bem-feito (HMAC, retry com backoff, DLQ) é esforço G. |
| Sessões e dispositivos gerenciáveis | 1/10 | Absorvido pelo corte de `account-security-mfa`. |
| Widget de feedback | 1/10 | Terceirizar é mais racional que manter no core. |
| Referral / afiliados | 0/10 | Nenhuma referência do painel entrega. A pesquisa classifica como discurso de blog; o mercado resolve com produto de terceiro. |
| SSO enterprise · SCIM | 0/10 | Território de provedor especializado. Só entra com o primeiro contrato enterprise — e aí não é mais boilerplate. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | Estavam no "fora do corte" de `ci-pipeline` porque dependiam de um CI verde e estável. **A condição chegou:** o CI está em `main` e verde em 7 execuções — falta só a branch protection. **Argumento a favor de Renovate:** as três actions do `ci.yml` miravam Node 20 (removido em 2026-09-23) e **nenhuma validação local pegou, nem o `act`** — só apareceu quando o workflow rodou na plataforma, e a correção veio à mão pela PR #7. Um bot teria aberto essa PR meses antes. Nota para a prática 14: os três `vercel.json` já trazem `ignoreCommand`, o que muda o desenho do preview por PR. |
| Remote Cache do Turbo | prática 1 | É a única peça que arrasta conta e env, e o ganho só aparece com o CI estável. Entra quando doer, com medição — e como opt-in por variável ausente, no padrão do `ARCJET_KEY`. |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das **8** configs de Vitest declara cobertura: não há número para discutir. Medir primeiro, gatear depois, e só em pastas críticas. Relatório por workspace **não soma** — exige consolidação na raiz. Cruza com `e2e-testing`, que traz a medição no corte. |
| Changesets / versionamento | opcional-forte | Com pacotes `private: true` e forks que divergem, o valor seria só o changelog. Não paga o processo agora. |
| Storybook | não apareceu no painel | O `playground` já serve de catálogo vivo dos componentes. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork, não do core. |
