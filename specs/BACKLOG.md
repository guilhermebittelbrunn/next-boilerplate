# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-11 (`/spec --sync`, pós-merge da PR #10) · anteriores: 2026-09-10 ·
> 2026-09-09 (2 rodadas) · 2026-09-02 · 2026-09-01 (3 rodadas) · 2026-08-31 · **origem:** semeadura
> inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`auth-recovery-verification` fechou e foi arquivada.** A PR **#10** foi mergeada em `main` em
>    2026-09-11T03:10:59Z (merge commit `e4eddb9`) e o CI passou nesse SHA (run `34557471571`, `success`).
>    Os **5 itens do corte** foram reconferidos **um a um no código**, não no `STATE.md` — as evidências
>    estão marcadas no corte da spec arquivada em
>    [`docs/features/auth-recovery-verification/spec.md`](../docs/features/auth-recovery-verification/spec.md).
> 2. **A cadeia de dependências andou um nível.** `account-settings` deixou de ter **dois** bloqueios e
>    passou a ter **um** (`file-upload-storage`), que por isso **assume o #1**. `account-security-mfa` e
>    `data-rights-lgpd` encurtaram junto.
> 3. **A contradição sobre as rules do Firestore foi levantada e MEDIDA na mesma rodada — e o resultado
>    inverte quem estava errado.** A auditoria encontrou a spec arquivada `firestore-admin-access`
>    afirmando que as rules foram **publicadas**, contra `docs/SECURITY.md:30-35` e
>    `docs/PRE-PRODUCTION.md:23-25` afirmando que **nunca foram** e que a base está aberta. O desempate foi
>    executado em 2026-09-11: **HTTP 403**. **As rules estão publicadas, a base não está aberta, e a spec
>    arquivada estava certa.** O achado não sumiu — **mudou de categoria**: deixou de ser risco de exposição
>    de dados e virou **documentação de segurança que mente sobre a própria postura**, o que induz um fork
>    a trabalho inútil e perigoso. ✅ **Corrigido em 2026-09-14** — os dois documentos foram reescritos após
>    reconferência independente. Ver [Achados](#achados-da-varredura-que-não-viraram-spec).
> 4. **A previsão do `observability-logging` se cumpriu em uma única PR.** A spec dizia "promover a
>    convenção antes que uma terceira entrega invente a quarta variação"; a #10 inventou a quarta **e** a
>    quinta, no fluxo de redefinição de senha. É a spec que mais ganhou argumento novo nesta rodada.
> 5. **Os 40 achados foram reconferidos um a um: 37 seguem, 2 foram parcialmente corrigidos pela PR #10,
>    1 integralmente. 4 achados novos.** A PR #10 **não tocou nenhum `package.json`**, então toda a
>    família de dependências não declaradas segue intacta.
> 6. **Deriva de referência em 8 das 14 specs**, bem menos que as 14/15 da rodada anterior — porque a PR
>    #10 concentrou-se em arquivos novos. Uma é de **substância** (a afirmação de que as rules estavam
>    publicadas, herdada da spec arquivada e propagada para `firebase-emulator-seed`).

## Contadores

Sobre as **14 specs que seguem em `specs/`**. Recontados do disco em 2026-09-11, lendo o frontmatter de
cada arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 13 |
| `approved` | 0 |
| `in-progress` | 0 |
| `done` (arquivadas) | 5 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 6 · `dx` 4 · `confianca` 4. **Por esforço:** P 0 · M 11 · G 3.
**Por valor:** alto 11 · médio 3 · baixo 0.

**Transições aplicadas nesta rodada: 1** — `auth-recovery-verification` `in-progress` → `done` +
arquivada. `in-progress` volta a **zero**: não há feature em execução, e o backlog está pronto para o
próximo `/analyze`.

## Gates — medidos nesta auditoria

Re-executados agora com `--force`, não copiados do `/test` nem da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **456 arquivos · 0 erros · 0 warnings** (`No fixes applied`, 216 ms) |
| `pnpm turbo run lint typecheck test --force` (1ª) | ✅ **23 tasks, 23 successful, 0 cached** — 23,7 s |
| `pnpm turbo run lint typecheck test --force` (2ª) | ✅ **23/23** — 26,0 s |
| `pnpm turbo run lint typecheck test --force` (3ª) | ✅ **23/23** — 24,8 s |
| `pnpm test` (raiz — é o que gateia o `turbo build`) | ✅ **9 workspaces · 69 arquivos · 668 testes** |

O gate instável **não reproduziu pela segunda rodada consecutiva** (3 execuções verdes, somadas às 3 da
rodada anterior e às 6 do `/review`+`/test` da feature). A causa estrutural continua **inalterada e agora
está escrita onde importa**: `apps/app/__tests__/securityPolicySources.test.ts` reconstrói o grafo do
proxy por caso, e **nenhuma das 9 configs de Vitest declara `testTimeout`** (medido de novo:
`grep testTimeout` nas 9 = 0). A novidade é que `docs/PRE-PRODUCTION.md:111-114` passou a **condicionar o
branch protection** a declarar esse timeout antes — a pendência ganhou um pré-requisito explícito, em vez
de uma nota solta neste arquivo.

| workspace | arquivos | testes | Δ vs. 2026-09-10 |
|-----------|---------:|-------:|------------------|
| `api` | 22 | 206 | +3 arquivos · **+54** |
| `app` | 26 | 188 | +3 arquivos · **+35** |
| `@repo/email` | 7 | 137 | +6 |
| `@repo/security` | 3 | 31 | — |
| `@repo/auth` | 2 | 29 | **— (ver achado)** |
| `web` | 4 | 27 | — |
| `@repo/internationalization` | 3 | 27 | — |
| `@repo/shared` | 1 | 15 | — |
| `@repo/payments` | 1 | 8 | — |
| **total** | **69** | **668** | **+6 arquivos · +95 testes** |

⚠️ **O `@repo/auth` não ganhou um único teste**, embora a PR #10 tenha acrescentado `reloadCurrentUser`
ao pacote (`packages/auth/client.ts:191-202`). O próprio `/review` da feature registrou que o teste "é
barato" — e ele não foi escrito. A função só é exercitada por **mock**, de outro workspace
(`apps/app/__tests__/useEmailVerification.test.tsx`).

CI: **12 execuções listadas, todas `success`** (`gh run list`), incluindo a do merge da PR #10 no SHA
`e4eddb9`. **Nenhum commit do repo está fora de `main`**: `HEAD` da branch `spec-sync-backlog-loop` é
`e4eddb9`, igual a `origin/main`.

## Ordem recomendada

Respeita `depends_on` (medido do frontmatter nesta rodada) e prioriza o que **desbloqueia** e o que **fica
mais caro depois**.

> ✅ **A ressalva que abria esta seção foi executada e caiu.** A rodada começou mandando conferir, antes de
> qualquer spec, se as rules do Firestore estavam publicadas. A conferência foi feita em 2026-09-11 e
> devolveu **403**: as rules **estão** publicadas e a base **não** está aberta. Não há nada entre você e o
> `/analyze`. O que sobrou daquele achado é um problema de **documentação**, não de segurança — e não
> bloqueia a fila.

| # | id | por que agora |
|---|----|---------------|
| 1 | [`file-upload-storage`](file-upload-storage.md) | **Herdou o topo por mérito estrutural, não por eliminação.** Com `auth-recovery-verification` entregue, é o **único bloqueio restante** de `account-settings` — que por sua vez bloqueia `account-security-mfa` e `data-rights-lgpd`. É a mesma cadeia de três níveis que colocou o #1 anterior no topo, e agora ela depende só desta spec. **0 de 5 itens**, remedido hoje: `firebase.json` segue com **6 linhas** e sem bloco `storage`; `grep -i BUCKET` nos `keys.ts`/`env.ts` = **0**; `grep -E "getStorage\|@aws-sdk\|S3Client\|uploadthing"` em `apps`+`packages` = **0**; `packages/design-system/components/form/hookform/` segue com **7 campos e nenhum de arquivo** (`hookformDateInput`, `Input`, `InputPassword`, `RadioGroup`, `Select`, `Switch`, `Textarea`). Prevalência 7/10, `depends_on` vazio. |
| 2 | [`observability-logging`](observability-logging.md) | **Subiu de #6 para #2 — a única spec cujo argumento ficou materialmente mais forte nesta rodada.** A spec previa que "uma terceira entrega inventaria a quarta variação" de log; a PR #10 inventou **a quarta e a quinta**, e no pior lugar: `auth/password/reset-request/route.ts:41` loga com prefixo mas **passa o objeto de erro**, e `auth/password/reset/route.ts:51` loga **sem prefixo e com o objeto de erro** — ambos no fluxo de redefinição de senha, onde o erro tem a maior chance de carregar endereço de e-mail. Isso é a mesma prática que o `@repo/email` **reprova com teste** uma camada abaixo (`logPrivacy.test.ts`). Deixou de ser higiene e virou privacidade. A convenção boa existe em `apps/api/proxy.ts:47-55` e `packages/email/index.ts:39-47` — falta só promovê-la a helper. `depends_on` vazio. |
| 3 | [`cookie-consent`](cookie-consent.md) | **A única spec do backlog com violação ativa, não com ausência de recurso:** `packages/analytics/provider.tsx:15` monta o Vercel Analytics **incondicionalmente** e `:16-17` monta o GA checando só a env — zero consentimento, sobre todo o app (`apps/app/app/layout.tsx:39-46`). `grep -rin consent` em `apps/` + `packages/` = **0 ocorrências**, remedido hoje. `depends_on` vazio. |
| 4 | [`firebase-emulator-seed`](firebase-emulator-seed.md) | Sétima auditoria consecutiva com o mesmo veredito: `firebase.json` **sem bloco `emulators`**, `firebase-tools` não é dependência de ninguém, `grep -i emulator` em código/config/CI = **0**. São **668 testes rodando a cada PR e nenhum toca o banco ou as rules** — `firestore.rules:33` é um deny-all **publicado e em vigor** (medido: 403 em 2026-09-11) que nenhum teste jamais exercitou. **O episódio das rules desta rodada dá a ela um argumento novo:** por onze dias dois documentos de segurança afirmaram que essas regras não estavam valendo, e **nada no repositório foi capaz de desmentir isso** — a conferência exigiu um `curl` manual contra o projeto real. Um teste de rules no emulador é exatamente o que transforma essa pergunta em resposta automática. É o **gargalo único** de `e2e-testing`. |
| 5 | [`cursor-pagination`](cursor-pagination.md) | Todo fork herda "ler a coleção inteira": `base.repository.ts:36-49` faz `.get()` (`:37-40`) sem `limit`/`orderBy`/`startAfter` — reconferido hoje: **0 ocorrências** dessas cláusulas no arquivo. Filtro e ordenação acontecem em memória nas subclasses (`entity.repository.ts:25,27`). Depois de haver dados em produção, a correção quebra contrato do SDK. Cruza com a dívida do `update()` (achados), que precisa de `orderBy` estável em `createdAt`. |
| 6 | [`audit-log`](audit-log.md) | O painel **já tem impersonação** e nada registra quem entrou na conta de quem — o switch é 100% client-side (`apps/app/shared/stores/panelStore.ts:76-90`: cookies em `:87` + espelho no localStorage em `:88`, **sem chamada de API**; `grep "apiClient\|fetch(\|axios"` no arquivo = **0**). A mutação sob impersonação já foi bloqueada (`impersonation-read-only.ts:19-31`); o **registro** não existe (`grep auditLog` em código = **0**, remedido hoje). `users/[id]/route.ts:75-91` faz soft delete e devolve 204 sem gerar evento. **0 de 5.** |
| 7 | [`billing-subscription`](billing-subscription.md) | Monetização é o maior valor bruto do backlog e continua em **0/6**: nenhuma rota sob `payments/` (o diretório não existe), `UserDTO:7-14` sem `subscription` nem `stripeCustomerId`, webhook com dois handlers `// TODO` (`:11`, `:21`) e `:63` devolvendo o evento Stripe inteiro na resposta. ⚠️ **A doc descreve como pronto o que não existe** — reconferido item a item hoje: dos 6 bullets de `docs/PAYMENTS.md:5-12`, só `:7` é verdadeiro; `grep updateSubscriptionByReferenceId` = **0**. Corrigir a doc **independe** de implementar a spec. **Pré-requisito barato:** o 🔴 de `packages/payments/ai.ts:4-5` explode no primeiro fork que importar o pacote, e é esta spec que faria alguém importar. |
| 8 | [`account-settings`](account-settings.md) | 🔓 **Desbloqueou pela metade:** `auth-recovery-verification` está entregue; resta `file-upload-storage` (#1). **E o escopo encolheu** — a troca de senha autenticada reaproveita o mecanismo já pronto em `auth/password/reset/route.ts` (incl. `revokeUserSessions:49`), e há UI reusável (`(unauthenticated)/components/AuthCard.tsx`, `reset-password/validations/resetPasswordSchema.ts`). A sidebar segue com **8** links apontando para `#` (`routes.tsx:44,48,52,56,67,71,75,79`), e **todas as 5** rotas de usuário seguem `requireAdminApi` (`users/route.ts:21,34`; `users/[id]/route.ts:15,33,75`): **ninguém consegue editar a si mesmo.** **0 de 6.** |
| 9 | [`onboarding-flow`](onboarding-flow.md) | Maior desequilíbrio valor/prevalência do painel (3/10 entregam) e é onde o usuário decide se fica. `grep -rin onboarding` em `apps/`+`packages/` = **1 ocorrência, e é um endereço de sandbox do Resend num fixture**. **Ficou mais barata nesta rodada:** a PR #10 pôs um gancho pós-cadastro exatamente onde o desvio entraria (`SignUpFormClient.tsx:105`, dentro do `useEffect:64-92`) e provou que o painel comum aceita aviso de estado incompleto (`EmailNotVerifiedNotice`, montado em `(common)/layout.tsx:41`). **0 de 5.** |
| 10 | [`dashboard-home`](dashboard-home.md) | As duas homes do painel são **11 linhas** e o literal `"Home"` (`(common)/(pages)/page.tsx:7` e `(admin)/admin/(pages)/page.tsx:7` — reconferido: os dois arquivos são idênticos exceto o nome do componente, e ambos renderizam um `Container` vazio) — e a chave de dicionário **já existe** e é usada em **8** breadcrumbs. É a primeira tela de todo fork. |
| 11 | [`data-rights-lgpd`](data-rights-lgpd.md) | 🔒 Bloqueada por `account-settings` (2 níveis abaixo, era 3). Obrigação legal com prazo; fica mais cara a cada coleção nova. O único `DELETE` é admin-only (`users/[id]/route.ts:75`) e é soft delete (`base.repository.ts:127-129`) — o e-mail continua ocupado no Firebase Auth. `grep -niE "encarregado\|DPO\|privacy@"` = **0**. |
| 12 | [`e2e-testing`](e2e-testing.md) | 🔒 Bloqueada por #4, o único gargalo restante. Zero `playwright`/`cypress`/`axe`/`puppeteer` em **qualquer** `package.json` (remedido hoje: 0 arquivos), e **nenhuma** das 9 configs de Vitest declara cobertura (`grep coverage` = 0). O argumento do gate instável segue enfraquecido — 6 execuções verdes consecutivas. |
| 13 | [`account-security-mfa`](account-security-mfa.md) | 🔒 Bloqueada por `account-settings` — **mas o item 1 do corte não deveria estar**, e nesta rodada ele **subiu de gravidade sem uma linha ter sido escrita**: `revokeUserSessions` passou a ser chamada pela redefinição de senha (`auth/password/reset/route.ts:49`), e a janela segue aberta (`packages/auth/server.ts:123` sem `checkRevoked`). A vítima redefine a senha e o ID token do atacante **continua válido por até uma hora**. Ver [Dependências](#dependências-e-bloqueios). |
| 14 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22 — a decisão, não só a implementação. As **duas contrapartidas de esforço P seguem não feitas**, agora há **vinte dias**. Ver [a decisão que não pode esperar a fila](#a-decisão-que-não-pode-esperar-a-fila). |

### O que **não** foi escolhido para #1, e por quê

- **`observability-logging`** foi a que mais subiu (de #6 para #2) e chegou perto do topo: é a única cujo
  argumento a realidade **confirmou** entre uma auditoria e outra. Perdeu porque **não desbloqueia
  ninguém** — o custo de adiá-la é linear (mais uma variação de log por entrega), enquanto o de adiar
  `file-upload-storage` é uma cadeia de três specs parada.
- **`cookie-consent`** é a única com violação legal **em curso** (tags carregando sem base legal, hoje), e
  de novo não foi ao topo: destrava zero specs, e a exposição real de um boilerplate sem usuários é baixa.
  **Se o primeiro fork for a público antes de #1 sair, esta ordem se inverte** — é a troca a fazer
  conscientemente, não por acidente.
- **`firebase-emulator-seed`** ganhou argumento novo (o achado das rules), mas destrava **1** spec
  (`e2e-testing`, esforço G, valor médio) contra a cadeia de #1. Ficou em #4, um degrau acima de antes.
- **`account-settings`** não pode ser #1 mesmo tendo desbloqueado pela metade: `file-upload-storage`
  continua sendo `depends_on` dela. Fazê-la antes significa entregá-la sem avatar — o que a própria spec
  autoriza como plano B, mas é decisão do usuário, não do `/spec`.

## Lotes paralelos

Para rodar o ciclo completo em 2–4 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-14** a
partir do `contends_on` de cada spec, pelo algoritmo escrito em
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Um lote **não** é uma
recomendação de prioridade — se você só vai rodar uma coisa, rode o #1 da ordem.

**Elegíveis nesta rodada: 8 de 14.** Ficaram de fora: `teams-organizations` (`deferred`),
`account-settings` + `account-security-mfa` + `data-rights-lgpd` + `e2e-testing` (`depends_on` não
satisfeito) e `file-upload-storage` — esta última por um motivo que merece nome: **está entregue mas não
mergeada.** Os commits vivem na branch `spec-sync-backlog-loop`, com `HEAD` à frente de `origin/main`, e
por isso ela conta como **`in-progress`** para efeito de elegibilidade. O código dela não está em `main`:
quem ramificar hoje ramifica de uma base que não a contém — e é exatamente por isso que `account-settings`,
que depende dela, segue bloqueada.

| lote | specs | o que cada uma toca | por que não colidem |
|------|-------|---------------------|---------------------|
| **1** | `observability-logging` · `cookie-consent` · `firebase-emulator-seed` | instrumentação + proxy da API + webhook de pagamento · provedor de analytics + os dois `layout.tsx` + barril de UI · `firebase.json` + `package.json` da raiz + `packages/auth/server.ts` | três territórios disjuntos: **API**, **camada de apresentação/analytics** e **infra local**. Nenhum arquivo em comum |
| **2** | `cursor-pagination` · `billing-subscription` | `base.repository.ts` + `entity.repository.ts` + `table.tsx` + `firestore.indexes.json` + ação `entity` do SDK · webhook + barril do SDK + `UserDTO` + `user.repository.ts` + `routes.tsx` | uma mexe no **slice `entity`** e na leitura paginada, a outra no **slice `user`** e na cobrança. Repositórios diferentes, tipos diferentes |
| **3** | `audit-log` · `onboarding-flow` | `base.repository.ts` + `users/[id]` + índices + barril do SDK + `queryKeys.ts` · `apps/app/proxy.ts` + resolvedor pós-login + `user-merge.ts` + `UserDTO` | uma é **escrita de trilha na API**, a outra é **desvio de navegação no app**. Encostam no `user` por caminhos distintos (`users/[id]/route.ts` × `user-merge.ts`) |
| **4** | `dashboard-home` | as duas `page.tsx` de home + `queryKeys.ts` + índices | sozinha — ver abaixo |

### Por que cada spec ficou de fora do lote 1

Distinguir os dois motivos importa: colisão é **dado**, teto é **decisão**.

- **`billing-subscription` — colisão real.** Não entra com `observability-logging`: as duas alteram
  `apps/api/app/(routes)/webhooks/payments/route.ts`. Uma troca os dois handlers `// TODO` por persistência
  e dedupe; a outra troca o `console.error` de lá por log estruturado com request id. É o mesmo punhado de
  linhas, no mesmo arquivo, e o conflito seria no fluxo que mexe com dinheiro.
- **`cursor-pagination`, `audit-log`, `onboarding-flow`, `dashboard-home` — sem colisão com o lote 1.**
  Qualquer uma delas caberia tecnicamente. Ficaram de fora **só pelo teto de 3**, que é escolha de custo de
  revisão, não impedimento técnico. Se você tiver fôlego para revisar 4 features amanhã, promova uma destas
  ao lote 1 — a de melhor posição na ordem recomendada é `cursor-pagination`.

E o que separa os lotes 2, 3 e 4 entre si:

- **`audit-log` não entra com `cursor-pagination`:** as duas alteram
  `apps/api/(shared)/repositories/base.repository.ts` — uma para ensiná-lo a paginar, a outra para tornar a
  trilha somente-adição — **e** as duas alteram `firestore.indexes.json`. Duas colisões, não uma.
- **`onboarding-flow` não entra com `billing-subscription`:** as duas alteram
  `packages/sdk/src/types/user/user.ts`. Uma acrescenta `subscription`/`stripeCustomerId` ao `UserDTO`, a
  outra acrescenta o estado de onboarding. Mesmo tipo, mesmo arquivo.
- **`dashboard-home` fica sozinha:** disputa `firestore.indexes.json` com `cursor-pagination` e `audit-log`,
  e `apps/app/shared/lib/queryKeys.ts` com `audit-log`. É a spec mais "presa" do conjunto elegível, apesar
  de não depender de ninguém — bom exemplo de que `depends_on: []` não significa "pode rodar a qualquer
  momento".

**O arquivo mais disputado do repositório é `firestore.indexes.json`**, citado por 5 das 14 specs
(`audit-log`, `cursor-pagination`, `dashboard-home`, `data-rights-lgpd`, `teams-organizations`). Todo
recurso que consulta por período, dono ou escopo precisa de um índice composto, e todos moram no mesmo
arquivo. Vale saber disso antes de planejar qualquer noite de execução paralela.

### Nota de processo — a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo e o arquivo que existe
para dizer a verdade sobre o repositório vira o pior conflito da noite. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por **processo**, não
por dado — ver [`README.md`](README.md#depends_on--contends_on).

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma *previsão* feita lendo o corte
de MVP, e uma previsão erra: duas features ainda podem brigar num arquivo que nenhuma das duas antecipou —
um helper que as duas resolvem extrair, um teste que as duas tocam, um barril que ninguém lembrou.

A medida desse erro está disponível, foi medida hoje, e não é pequena: **`file-upload-storage`, já
entregue, modificou 32 arquivos compartilhados** (contados em `origin/main..HEAD`, descontados testes,
`docs/`, `specs/`, `.env.example` e i18n) — **12 deles no design system**, mais
`packages/shared/utils/helpers/httpStatus.ts` e `packages/auth/keys.ts`, nenhum dos quais uma leitura da
spec anteciparia. O `contends_on` dela lista **6**.

Essa razão — 6 previstos para 32 alterados — é a régua honesta do campo: ele **não** tenta prever o raio de
impacto da spec, e falharia feio se tentasse. Ele mira nos arquivos de **alta disputa**, os que outra spec
do backlog também alteraria. Os 26 restantes não entram porque ninguém mais os disputa: mexer sozinho num
arquivo não é contenção.

Corolário prático: se dois workspaces do mesmo lote tocarem o mesmo arquivo por acidente, **isso é achado
de auditoria** — corrija o `contends_on` das duas specs na rodada seguinte, em vez de tratar como azar.

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-11 |
|------|--------------|------------------------|
| [`account-settings`](account-settings.md) | `auth-recovery-verification`, `file-upload-storage` | 🔓 **uma das duas caiu** — `auth-recovery-verification` entregue e mergeada (PR #10, `e4eddb9`). Resta `file-upload-storage`, e é por isso que ela é o **#1** |
| [`account-security-mfa`](account-security-mfa.md) · [`data-rights-lgpd`](data-rights-lgpd.md) | `account-settings` | 🔒 bloqueadas em cadeia — **a cadeia encurtou de 3 para 2 níveis** |
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | ✅ `ci-pipeline` entregue · 🔒 `firebase-emulator-seed` — **gargalo único** |
| [`audit-log`](audit-log.md) · [`cursor-pagination`](cursor-pagination.md) · [`firebase-emulator-seed`](firebase-emulator-seed.md) | `firestore-admin-access` | ✅ satisfeita (entregue em 2026-08-31) — e o item 4 do corte foi **reconfirmado por medição** em 2026-09-11 (403) |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`billing-subscription`](billing-subscription.md) · [`cookie-consent`](cookie-consent.md) · [`dashboard-home`](dashboard-home.md) · [`file-upload-storage`](file-upload-storage.md) · [`observability-logging`](observability-logging.md) · [`onboarding-flow`](onboarding-flow.md) | — | ✅ sem dependência |

> **O grafo segue mais restritivo que a realidade técnica no mesmo ponto de sempre — e agora custa mais
> caro.** O item 1 do corte de `account-security-mfa` (fechar a janela de revogação:
> `packages/auth/server.ts:123` chama `verifyIdToken` **sem** `checkRevoked`, e
> `resolve-api-actor.ts:23-32` tenta o bearer **antes** do cookie em `:34`, que esse sim usa
> `verifySessionCookie(..., true)` em `server.ts:193-196`) **não depende de `account-settings` para
> nada** — é correção de guard, não tela de conta. A novidade desta rodada: a PR #10 ligou
> `revokeUserSessions` à **redefinição de senha** (`auth/password/reset/route.ts:49`), então o furo saiu
> do logout deliberado e entrou no fluxo de "minha conta foi comprometida". Continua preso 2 níveis
> abaixo, quando poderia ser tarefa direta hoje. Ver o 🔴 em
> [Achados](#achados-da-varredura-que-não-viraram-spec).

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | 🔒 `account-settings` |
| [`account-settings`](account-settings.md) | Área de conta e preferências do usuário | produto | alto | M | `proposed` | ✅ `auth-recovery-verification` · 🔒 `file-upload-storage` |
| [`audit-log`](audit-log.md) | Trilha de auditoria de ações sensíveis | confianca | alto | M | `proposed` | ✅ `firestore-admin-access` |
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
| [`teams-organizations`](teams-organizations.md) | Organizações, membros e convites | produto | alto | G | `deferred` | ✅ `transactional-emails` |

## Entregues

Specs concluídas e **arquivadas** junto da feature que as implementou.

| id | entregue em | spec arquivada |
|----|-------------|----------------|
| `firestore-admin-access` | 2026-08-31 | [`docs/features/firestore-admin-access/spec.md`](../docs/features/firestore-admin-access/spec.md) — 5/5; **item 4 contestado e reconfirmado** por medição em 2026-09-11 (403) |
| `ci-pipeline` | 2026-09-01 | [`docs/features/ci-pipeline/spec.md`](../docs/features/ci-pipeline/spec.md) — ⚠️ fechada com 1 item do corte em aberto |
| `api-hardening` | 2026-09-09 | [`docs/features/api-hardening/spec.md`](../docs/features/api-hardening/spec.md) — 5/5 do corte entregues |
| `transactional-emails` | 2026-09-10 | [`docs/features/transactional-emails/spec.md`](../docs/features/transactional-emails/spec.md) — 6/6 do corte; a base **ganhou consumidor real** nesta rodada (ver achados) |
| `auth-recovery-verification` | 2026-09-11 | [`docs/features/auth-recovery-verification/spec.md`](../docs/features/auth-recovery-verification/spec.md) — 5/5 do corte, conferidos um a um |

**Verificado nesta rodada:** `docs/features/` tem **7** pastas e **5** `spec.md` arquivados. Não houve
colisão de arquivo no `git mv` (`docs/features/auth-recovery-verification/spec.md` não existia), e o
`STATE.md` daquela feature **já trazia** `spec: auth-recovery-verification` (`:5`) — não foi preciso
acrescentar. Os frontmatters das 5 arquivadas estão coerentes (`status: done`, `feature: <slug>`) e **não
há duplicata** em `specs/` para nenhuma delas.

As **duas** features concluídas sem spec — `auth-panel-context` e `impersonation-read-only` — não constam
aqui, e é o correto: as duas são anteriores à semeadura do backlog (2026-08-21).
`impersonation-read-only/STATE.md:5` tem `spec: -`, e `auth-panel-context/STATE.md` **não tem o campo
`spec:` de forma alguma**. Nenhuma spec viva casa com o escopo das duas, então não é vínculo faltando —
mas o campo podia ser preenchido com `-` por consistência.

## Pendências vivas sem dono

> 🎉 **Esta seção encolheu de propósito, e é a melhor notícia da rodada.** A PR #10 criou
> [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md) (144 linhas), que dá **casa versionada** a 5 das 6
> pendências que viviam só aqui. Elas continuam **não resolvidas**, mas deixaram de depender deste arquivo
> para existir — e um fork agora as herda por escrito. O propósito da seção era "não sumir do radar"; para
> essas, o propósito foi cumprido melhor em outro lugar.

| # | pendência | onde vive agora | custo |
|---|-----------|-----------------|-------|
| 1 | ✅ **RESOLVIDA em 2026-09-14.** Os dois documentos afirmavam falsamente que a base do Firestore estava aberta; ambos foram reescritos para "publicadas e em vigor", ancorados na medição de **403** (2026-09-11) e numa **reconferência independente em 2026-09-14** — as rules publicadas foram lidas direto do projeto e batem com o arquivo versionado. Cada bloco ganhou um aviso explícito de que a versão anterior mentia (para quem leu a antiga não republicar por engano) e a ressalva de que **um fork não herda isso**: em outro projeto, a base nasce aberta e o `deploy` é obrigatório. O runbook virou procedimento de **ambiente novo**, não dívida | ~~`SECURITY.md:30-35`~~ · ~~`PRE-PRODUCTION.md:21-25`~~ | — |
| 2 | **`main` não tem branch protection.** Reconferido em 2026-09-11: `gh api …/branches/main/protection` → **404 `"Branch not protected"`**, `gh api …/rulesets` → **`[]`**. **Ganhou um pré-requisito explícito**: declarar `testTimeout` nas 9 configs de Vitest antes de tornar o check obrigatório | `PRE-PRODUCTION.md:183-193` | minutos |
| 3 | **O envio real de e-mail nunca foi provado.** Segue valendo depois da PR #10: toda a validação da recuperação de senha foi feita com preview local e placeholder. Exige domínio com SPF/DKIM — passo de DNS, sem contorno | `PRE-PRODUCTION.md:70-81` | DNS + ~10 min |
| 4 | **Na `apps/web` a CSP é Report-Only**, não bloqueante. Decisão deliberada da spec, política rodou com zero violações: virar a chave é barato | `PRE-PRODUCTION.md:195-201` | P |
| 5 | **Contas de QA acumuladas** no projeto Firebase de dev (`next-boilerplate-576d0`) — as 8 conhecidas mais as descartáveis criadas pelo pipeline da PR #10. Sem PII real e sem senha em arquivo | `PRE-PRODUCTION.md:207-211` | P |
| 6 | **Branches mergeadas ainda vivas no remoto — agora 8.** Medido hoje: o remoto tem **9** heads, **8 delas mortas** (`feat/auth-recovery-verification` juntou-se a `email/feat/transactional-emails`, `api-hardening-flow`, `ci/feat/github-actions-pipeline`, `ci/chore/bump-actions-to-node24`, `specs-feature-planner-agent`, `api/fix/impersonation-read-only`, `feat/initial-files`), para **zero** de trabalho em curso | `PRE-PRODUCTION.md:212` | P |
| 7 | **O login com Google nunca teve passe manual com conta real.** ⚠️ **A única que NÃO foi absorvida** pelo `PRE-PRODUCTION.md` e continua existindo só aqui. O `/test` provou o mecanismo do COOP via `postMessage`, não o fluxo ponta a ponta. Modo de falha silencioso: o popup fecha e nada acontece | *(só neste arquivo)* | ~2 min |

### O padrão que vale nomear: **três documentos mentem sobre estado implementado, nas duas direções**

Não é coincidência nem descuido isolado — é o modo de falha mais consistente deste repositório, e o único
que **nenhum gate pega**. `pnpm check`, `typecheck`, 668 testes e o CI não leem prosa.

| documento | afirma | realidade medida | direção do erro |
|-----------|--------|------------------|-----------------|
| `docs/PAYMENTS.md:5-12` | 6 bullets de "Estado atual (implementado)" | **5 dos 6 são falsos** — não há rotas `/payments/*`, nem `UserDTO.subscription`, nem `apiClient.payments.*`, nem tela de assinatura; os handlers são `// TODO` | diz que **existe** o que não existe |
| ~~`docs/SECURITY.md:30-35`~~ | "as rules **NÃO** estão publicadas … 200 com dados reais" | **403** (2026-09-11) — publicadas e em vigor | ✅ **corrigido em 2026-09-14** |
| ~~`docs/PRE-PRODUCTION.md:21-25`~~ | "a base está aberta … **nunca foi publicado**", como bloqueador #1 | idem | ✅ **corrigido em 2026-09-14** |

As duas direções custam caro, de formas diferentes: a primeira faz alguém **confiar** numa funcionalidade
inexistente; a segunda faz alguém **refazer** trabalho pronto — e, no caso das rules, com um procedimento
que o próprio documento adverte ser perigoso na ordem errada. Ambas corrompem a única fonte que um fork lê
antes de subir para produção.

Nota de método para as próximas rodadas: **as três só foram pegas por medição direta contra o código ou o
provedor**, nunca por leitura. Documentação que afirma estado deve trazer a medição e a data ao lado — foi
exatamente o que faltou nos três casos, e é o formato adotado daqui em diante neste arquivo.

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

Esta rodada encontrou deriva em **8 das 14 specs** — bem menos que as 14/15 da anterior, e por um motivo
identificável: a PR #10 criou **arquivos novos** em vez de deslocar linhas em arquivos antigos (35 dos 77
arquivos são adições). **Nenhuma deriva é de implementação divergente**: as 14 specs descrevem
corretamente o que falta.

Dois casos são de **substância** e têm a mesma origem — a afirmação sobre as rules estarem publicadas.
**Ambos resolvidos por medição dentro desta própria rodada**, e as duas specs já estão corrigidas no
disco:

| id | o que a spec afirmava | o que a medição mostrou | ação |
|----|----------------------|--------------------------|------|
| [`firebase-emulator-seed`](firebase-emulator-seed.md) | `firestore.rules:32-34` é "negação total, **publicada em 2026-08-31**" — afirmação copiada da spec arquivada `firestore-admin-access` | `docs/SECURITY.md:30-35`, escrito **no mesmo commit** (`3089d71`) que fechou aquela feature, dizia o oposto ("**NÃO estão publicadas** … medido: **200 com dados reais**"), e `docs/PRE-PRODUCTION.md:23-25` repetia. **Medido em 2026-09-11: HTTP 403.** A spec estava **certa**; os dois documentos é que estão errados | ✅ **spec corrigida.** Volta a afirmar a publicação, agora ancorada na **medição de 2026-09-11**, não na spec arquivada. Registro honesto do caminho: ela chegou a ser editada no meio desta rodada sob a premissa errada (ganhou um bloco "não afirmar até alguém desempatar") e a edição foi **desfeita** quando o 403 saiu. O argumento ficou **melhor** do que era: o valor do emulador não é descobrir se as rules valem — é que **por onze dias dois documentos afirmaram o contrário e nada no repositório conseguiu desmentir**; a resposta exigiu `curl` manual contra o projeto real |
| [`cursor-pagination`](cursor-pagination.md) | *(mesma origem)* ressalva de que "o caminho de deploy existe" não garantia que o `deploy` tivesse rodado | O `deploy` **rodou** — 403 medido em 2026-09-11; os índices sobem pelo mesmo comando das rules | ✅ **spec corrigida**, com o sinal invertido: a ressalva virou confirmação. O caminho de publicação **não é hipotético**, já foi percorrido, então o índice que a paginação por cursor exigir entra por um comando já exercitado |

As demais são de **referência** — o argumento sobrevive, o endereço não. Todas corrigidas nos arquivos:

| id | correções aplicadas |
|----|---------------------|
| [`observability-logging`](observability-logging.md) | `apps/api/proxy.ts:41-49` → **`:47-55`**; `packages/email/index.ts:39-49` → **`:39-47`**. E **acrescentado o argumento novo**: as duas variações de log que a PR #10 introduziu (`auth/password/reset-request/route.ts:41` e `auth/password/reset/route.ts:51`) |
| [`onboarding-flow`](onboarding-flow.md) | `SignUpFormClient.tsx:36-49` → **`:38-51`**; `resolveAppPostLoginPath` `:42` → **`:44`**; `router.push` `:47` → **`:49`**; `window.location.replace` `:84` → **`:86`**; `useEffect` `:62-90` → **`:64-92`**; `isPublicPath` `:61` → **`:79-80`**. E a afirmação "`PUBLIC_PATHS` é só `/sign-in` e `/sign-up`" ficou **falsa**: são **5** entradas (`:59-63`), mais o conceito novo de rota isenta do bounce (`OOB_ACTION_PATHS:71`, `isOobActionPath:83-85`, usado em `:171`, porque `:182` apaga a query) |
| [`firebase-emulator-seed`](firebase-emulator-seed.md) | além da substância acima: `docs/SETUP.md:170-180` → **`:172-191`**, "modo de produção" `:174` → **`:176`**, deploy em **`:179`**, seção "Primeiro admin" `:191` → **`:193`** |
| [`cursor-pagination`](cursor-pagination.md) | `docs/SETUP.md:170-189` → **`:172-191`**, comando de deploy `:177` → **`:179`** *(a correção de substância desta spec está na tabela acima)*. Os refs de `user.repository.ts` (`:32-43`, `34-36`, `38-40`, `52-63`) e `base.repository.ts` foram remedidos e estão **exatos** |
| [`account-settings`](account-settings.md) | nenhuma linha errada — todos os refs remedidos batem (`users/route.ts:21,34`; `users/[id]/route.ts:15,33,75`; `paths.ts:10-36`; `LanguageSwitcher.tsx:50`). **Acrescentada** a seção do desbloqueio parcial e do escopo que encolheu |
| [`account-security-mfa`](account-security-mfa.md) | refs remedidos e **exatos** (`server.ts:123`, `:193-196`, `resolve-api-actor.ts:23-34`). **Acrescentado** o bloco de escalada de gravidade e o precedente de `reloadCurrentUser` |
| [`audit-log`](audit-log.md) · [`cookie-consent`](cookie-consent.md) · [`dashboard-home`](dashboard-home.md) · [`data-rights-lgpd`](data-rights-lgpd.md) · [`e2e-testing`](e2e-testing.md) · [`file-upload-storage`](file-upload-storage.md) · [`billing-subscription`](billing-subscription.md) · [`teams-organizations`](teams-organizations.md) | **remedidas e sem correção necessária.** A PR #10 não tocou os arquivos que elas citam. Os números que importam foram reconferidos exatos: 8 `url: "#"`, 0 hits de `consent`, 0 de `getStorage\|@aws-sdk\|S3Client\|uploadthing`, 0 de `auditLog` em código, 7 campos `hookform*`, 9 configs de Vitest, 4 arquivos de teste na `web`, 3 cópias do predicado de posse |

**Nenhuma regressão detectada** nas capacidades das 5 specs arquivadas. A única que chegou a ser
contestada — o item 4 de `firestore-admin-access` — foi **medida e confirmada** (403 em 2026-09-11).

**Uma correção de medição minha, registrada para não voltar:** contei `grep -rn "userId !== ctx.subjectProfile.id" apps/api | wc -l`
→ **4** e quase escrevi que a duplicação do predicado de posse tinha crescido. A quarta ocorrência é
`apps/api/CLAUDE.md:31` — **documentação**, não código. São **3** cópias, em
`entities/[id]/route.ts:16,32,65`, exatamente como a rodada anterior registrou.

## A decisão que não pode esperar a fila

`teams-organizations` é a única spec cuja **decisão** custa mais que a implementação: retrofitar escopo por
organização é **reescrita, não refactor** (6/10 de prevalência, esforço G).

**Decidido em 2026-08-22:** `deferred` — adiar a implementação, **não** a decisão. O que torna o adiamento
honesto são duas contrapartidas de esforço P que **não dependem desta spec** e valem como tarefa direta no
`/analyze`:

1. escrever em `docs/ARCHITECTURE.md` se este core é **B2B ou B2C por padrão** — medido de novo hoje,
   `grep -ciE "b2b|b2c|organiza" docs/ARCHITECTURE.md` retorna **0**;
2. concentrar o predicado de posse num ponto único de escopo — `row.userId !== ctx.subjectProfile.id`
   segue copiado **3 vezes no mesmo arquivo** (`apps/api/app/(routes)/entities/[id]/route.ts:16,32,65`),
   inalterado desde 2026-08-22.

**Nenhuma das duas foi feita até 2026-09-11** — os juros correm há **vinte dias**, enquanto o backlog
seguiu acrescentando recursos escopados por usuário (a PR #10 acrescentou 4 rotas de auth, todas
individuais). O `depends_on` desta spec segue satisfeito, o que não muda o `deferred` mas remove o último
argumento técnico para adiar de novo.

## Achados da varredura que não viraram spec

Defeitos e inconsistências encontrados na descoberta e nos pipelines. **Não são funcionalidades** — são
correções pontuais, algumas de minutos. Viram tarefa direta no `/analyze`, sem passar por spec.

> **Auditoria de 2026-09-11.** As **40 linhas** da rodada anterior foram reconferidas **uma a uma** no
> código: **37 seguem descrevendo um defeito real**, **1 foi corrigido** e **2 foram parcialmente
> corrigidos** pela PR #10 (marcados ✅ e ◐). **4 achados novos** (marcados NOVO). Um deles nasceu 🔴 —
> a suspeita de que a base do Firestore estivesse aberta — e **foi rebaixado a 🟡 na mesma rodada**, depois
> que a medição (403) mostrou que o problema era a documentação, não a postura de segurança. Vale notar o
> padrão: a PR #10 **não tocou nenhum `package.json`**, então toda a família de dependências não
> declaradas e exports quebrados segue intacta.

Os primeiros são de **segurança** e foram confirmados diretamente no código.

| achado | onde | por que importa |
|--------|------|-----------------|
| ✅ **RESOLVIDO em 2026-09-14** *(era 🟡 NOVO)* — **dois documentos de segurança afirmavam que a base do Firestore estava aberta, e isso era FALSO. Medido.** `docs/SECURITY.md:30-35` dizia "**ESTADO ATUAL: as rules do arquivo NÃO estão publicadas** … medido: a leitura direta via REST devolve **200 com dados reais**", e `docs/PRE-PRODUCTION.md:23-25` repete ("**nunca foi publicado**", "**a base está aberta**"), abrindo com isso a lista de **bloqueadores** de produção. A spec arquivada de `firestore-admin-access` afirmava o contrário, e **é ela que está certa** | `docs/SECURITY.md:30-35` · `docs/PRE-PRODUCTION.md:19-41` (esp. `:21-25`) | **Medição de desempate, 2026-09-11:** `curl -s -o /dev/null -w '%{http_code}' "https://firestore.googleapis.com/v1/projects/next-boilerplate-576d0/databases/(default)/documents/entity?key=<NEXT_PUBLIC_FIREBASE_API_KEY>"` → **`403`**. As rules **estão publicadas** e a negação está em vigor; o `deny-all` de `firestore.rules:32-34` é real. **A gravidade não é exposição de dados — é decisão errada induzida por documentação.** Um fork que ler o `SECURITY.md` vai (a) gastar tempo numa pendência que não existe, ou (b) **republicar rules achando que está corrigindo uma falha**, e o próprio `PRE-PRODUCTION.md:39-41` adverte que a ordem errada de publicação/rollback "reexpõe a base inteira". Ou seja: o doc cria exatamente o incidente que diz prevenir. Agrava que o `PRE-PRODUCTION.md` classifica isso como **pendência #1 de segurança** de um fork — a primeira coisa que alguém lê, e é falsa. **Correção:** reescrever os dois blocos para "publicadas, verificado em 2026-09-11 (403)", mantendo o runbook de `deploy` como procedimento para **ambiente novo**, não como dívida em aberto. *(Registrado com data e comando para a próxima rodada não remedir.)* **✅ Correção aplicada em 2026-09-14**, com reconferência independente no mesmo dia (rules publicadas lidas direto do projeto, idênticas ao arquivo versionado). Os dois blocos agora afirmam "publicadas e em vigor", carregam um aviso de que a versão anterior mentia — para que quem leu a antiga não republique por engano — e separam explicitamente o **projeto de referência** (fechado) do **fork** (nasce aberto, `deploy` obrigatório). |
| 🔴 **Revogar sessão não derruba o ID token — e a PR #10 pôs esse furo no caminho de "minha conta foi comprometida".** `verifyIdToken(token)` é chamado **sem o argumento de revogação** (`packages/auth/server.ts:123`), e `resolve-api-actor.ts` tenta o bearer ID token em `:24` **antes** do cookie em `:34` — que, esse sim, usa `verifySessionCookie(..., true)` (`server.ts:193-196`) | `packages/auth/server.ts:123` · `apps/api/(shared)/lib/resolve-api-actor.ts:23-34` | **Gravidade subiu nesta rodada sem uma linha ter mudado.** Antes, `revokeUserSessions` só era chamada pelo logout global (`session-routes.ts:79`). Agora também pela **redefinição de senha** (`auth/password/reset/route.ts:49`): a vítima troca a senha e **o ID token do atacante continua passando no guard da API por até uma hora**. É o item 1 do corte de `account-security-mfa`, e **não depende de `account-settings`**: pode ser tarefa direta hoje. |
| 🔴 **`packages/payments/ai.ts:4-5`** tem o defeito gêmeo do que já foi corrigido no `index.ts`: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY \|\| "" })` em **escopo de módulo** | `packages/payments/ai.ts:4-5` | O mesmo padrão no `index.ts` deixava `api#build` vermelho e foi corrigido com `getStripe()` (`index.ts:14-24`). O `ai.ts` não explode hoje **só porque nada importa `@repo/payments/ai`** (zero importadores, remedido) — explodiria no primeiro fork que importasse, e `billing-subscription` é justamente o que faria alguém importar. Agrava: `packages/payments/package.json` não tem `exports`, então o subpath resolve por caminho de arquivo. |
| 🔴 **`packages/security/index.ts:11` tem o mesmo defeito de escopo de módulo, e num lugar muito pior.** `const arcjetKey = keys().ARCJET_KEY;` roda no **import**, e `@repo/security` é o **primeiro import do `apps/api/proxy.ts:1`** — ou seja, do middleware, que roda em toda requisição (`matcher: "/:path*"`, `:124`) | `packages/security/index.ts:11` · `packages/security/keys.ts:9-15` | `keys.ts` trata `""` como ausente (`z.preprocess`), o que cobre o caso do `.env.example`; mas exige `.startsWith("ajkey_")` (`:15`), então uma `ARCJET_KEY` **presente e malformada** lança **dentro do grafo de módulos do middleware**: toda requisição falha, sem sinal no boot — e `instrumentation.ts:23-27`, que só checa presença, **não avisaria**. Efeito secundário: a chave é capturada uma vez e congelada pelo tempo de vida do processo. |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo.** Com `NODE_ENV=production` e a variável ausente, `register()` lança (`apps/api/instrumentation.ts:17-21`) — e **não há `process.exit` em nenhum lugar do arquivo** (31 linhas; os únicos `process.exit` da `apps/api` estão em `scripts/`) | `apps/api/instrumentation.ts:17-21` | Uma plataforma que só verifica se a porta responde veria o container **saudável** enquanto ele responde 500 a tudo. **Agora está documentado** em `docs/PRE-PRODUCTION.md:86-88`, com a mesma recomendação (health check que distinga 5xx, ou `process.exit(1)`) — mas não corrigido. |
| 🟡 **`apps/app/app/layout.tsx:3` importa `@repo/analytics` sem `apps/app/package.json` declarar** a dependência — funciona por hoisting do pnpm. Bloco `dependencies` em `:13-38`: não há `@repo/analytics` **nem `@repo/email`** | `apps/app/app/layout.tsx:3` · `apps/app/package.json:13-38` | Além do risco de resolução, **o turbo não invalida `app#*` quando `@repo/analytics` muda** — cache mentindo num gate que roda em toda PR. **A PR #10 não tocou nenhum `package.json`**, então segue idêntico. |
| 🟡 **`apps/app/env.ts:1` importa `@repo/email/keys` sem `apps/app/package.json` declarar `@repo/email`** — mesma classe, consequência maior | `apps/app/env.ts:1` · `apps/app/package.json:13-38` | O `keys.ts` do pacote não tem `skipValidation` e **valida de fato no boot** dos 3 apps. Uma dependência não declarada está no caminho de inicialização da `apps/app`. `apps/web` (`package.json:18`) e `apps/api` (`:22`) **declaram**; só a `app` não. |
| ◐ **A base de e-mail deixou de ser inalcançável — pela metade.** `actionLinkEmail` **ganhou dois chamadores de produção reais** na PR #10: `auth/email-verification/send/route.ts:63` e `auth/password/reset-request/route.ts:33`. Mas `welcomeEmail` **segue sem nenhum** (únicos hits: `preview-data.ts:3` e 2 testes), e o formulário de contato da landing continua maquete | `packages/email/templates/action-link.tsx:60` · `templates/welcome.tsx:49` · `apps/web/…/contact/components/contact-form-client.tsx` | O risco que a spec anterior mandou orçar — "esta é a primeira feature a exercitar a base por caminho alcançável" — **se materializou e foi absorvido**: a PR #10 achou e corrigiu 3 defeitos de integração. O que resta é menor: `welcomeEmail` é código morto e o form de contato continua sem `<form>`, com botão sem `type="submit"` (`:139`) e campos que não casam com os parâmetros da action. |
| 🟡 **`provider-error` não distingue três falhas diferentes.** Cota estourada, domínio não verificado e chave revogada produzem o **mesmo** `reason` e a **mesma** linha de log | `packages/email/index.ts:121-129` | Descartar o objeto de erro é **correto e deliberado** (ele carrega o endereço do destinatário, comentário em `:127`, e há teste que reprova quem o logar). Mas ninguém distingue "acabou a cota" de "revogaram a chave" sem abrir o painel do provedor. **Pertence a [`observability-logging`](observability-logging.md)**, agora em #2. |
| 🟡 **NOVO — a convenção de log do repo foi violada pela primeira entrega a usá-la, e no pior fluxo.** `auth/password/reset-request/route.ts:41` faz `console.error("[auth-reset-request] delivery failed", error)` (prefixo ok, mas mensagem livre **e objeto de erro**); `auth/password/reset/route.ts:51` faz `console.error("Could not revoke sessions after password reset", error)` (**sem prefixo, sem `chave=valor`, com objeto de erro**). Na mesma PR, `auth-action-links.ts:25` **segue** a convenção corretamente | `apps/api/app/(routes)/auth/password/reset-request/route.ts:41` · `auth/password/reset/route.ts:51` | Passar o objeto de erro é **exatamente** o que o `@repo/email` reprova com teste dedicado (`logPrivacy.test.ts`) uma camada abaixo — e estes dois estão no fluxo de redefinição de senha, onde o erro tem a maior chance de carregar endereço de e-mail. Prova empírica de que **convenção sem helper não se propaga**. É o argumento que levou `observability-logging` a #2. |
| 🟡 **NOVO — `reloadCurrentUser` entrou no `@repo/auth` sem um único teste no pacote.** A PR #10 acrescentou a função (`packages/auth/client.ts:191-202`, faz `reload(user)` + `getIdToken(true)`), e a suíte do pacote continua com **2 arquivos / 29 testes** — idêntica à rodada anterior | `packages/auth/client.ts:191-202` · `packages/auth/__tests__/` | É exercitada só por **mock**, de outro workspace (`apps/app/__tests__/useEmailVerification.test.tsx`). O próprio `/review` da feature registrou que o teste "é barato" e corrigiu o handoff que dizia não haver suíte no pacote — e mesmo assim o teste não foi escrito. Um refresh forçado de token é código de autenticação: merece teste no pacote que o exporta. |
| 🟡 **NOVO — `packages/internationalization/utils/cookies.ts` é inalcançável, não só ruidoso.** O `package.json` mapeia `"./utils" → "./utils.ts"` (o **arquivo**), então o diretório homônimo nunca é resolvido pelo subpath; o arquivo tem **0 importadores** | `packages/internationalization/utils/cookies.ts` · `packages/internationalization/utils.ts` | Refina o achado anterior, que tratava isso só como log sujo do preview da 3003 (`Could not find index file for directory…`). É pior: os ~33 importadores de `@repo/internationalization/utils` resolvem todos para o **arquivo**, e o `cookies.ts` do diretório é **código morto**. Limpeza: apagar, ou criar `utils/index.ts` e migrar. |
| 🟡 **`emailBrand.supportEmail` é configuração morta.** `grep supportEmail` em `apps` + `packages` devolve **uma** ocorrência: a própria definição | `packages/email/brand.ts:9` | Um fork vai editá-lo achando que muda alguma coisa. Ou vira rodapé de suporte nos templates, ou sai. |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** — as chaves são só `name, version, private, scripts, dependencies, devDependencies` | `packages/email/package.json` | `@repo/email`, `@repo/email/keys` e `@repo/email/templates/*` resolvem **só** pelo alias TS. Funciona hoje; quebra em qualquer consumidor que resolva por Node. **A PR #10 acrescentou dois importadores novos a partir da `apps/api`**, então a dívida rendeu juros sem ser paga. |
| ◐ **`skipValidation` faz o t3-env descartar os `extends` — corrigido na `apps/api`, ainda aberto na `apps/web`.** Causa raiz reconferida no pacote instalado: `@t3-oss/env-core/dist/src-Bb3GbGAa.js:36-37` retorna `runtimeEnv` **antes** de montar o schema e mesclar os `extends` | `apps/web/env.ts:22,8,13-16` · `apps/api/env.ts:37` | A PR #10 **contornou na API** declarando `NEXT_PUBLIC_APP_URL` diretamente (`apps/api/env.ts:28` no bloco `client`, `:35` no `runtimeEnv`) — era o defeito que fazia todo pedido de reset responder 503 em dev. **A causa raiz não foi tocada.** Na `apps/web`, `skipValidation: true` é **incondicional** (`:22`) e `NEXT_PUBLIC_APP_URL` **não** está no bloco `client` (`:13-16`), então o CTA "Ir para o painel" da landing continua caindo no fallback. Pior que o bug: o bloco `client` tem **forma** de validação e não valida nada. |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento.** `apps/api/env.ts:37` usa `skipValidation: process.env.NODE_ENV === "development"`; nesse modo o t3-env descarta as chaves vindas de `extends` (`:9`), e `env.STRIPE_WEBHOOK_SECRET` é `undefined` em `next dev` | `apps/api/env.ts:9,37` | Mesma causa raiz do anterior — e agora **assimétrica**: a PR #10 resolveu o sintoma de `NEXT_PUBLIC_APP_URL` declarando-a à mão, mas `STRIPE_WEBHOOK_SECRET` continua vindo por `extends`. O guard cai sempre no ramo `"Not configured"`, então `pnpm --filter api dev:with-stripe` **não pode funcionar**. |
| 🟡 **Webhook da Stripe é casca.** Roteia só `checkout.session.completed` (`:50`) e `subscription_schedule.canceled` (`:54`); os dois handlers (`:8-16`, `:18-25`) são stubs `// TODO` (`:11`, `:21`) cujo corpo faz apenas `if (!data.customer) return;` | `apps/api/app/(routes)/webhooks/payments/route.ts` | A assinatura **é** validada (`:43`); nada é persistido, e não há dedupe por `event.id`. Escopo de `billing-subscription`. `:63` devolve `{ result: event, ok: true }`, **ecoando o objeto Stripe inteiro na resposta HTTP** — vazamento gratuito de payload. |
| 🟡 **`FormattedError.retryAfterSeconds` não tem consumidor** fora dos testes (`apiErrorCopy.test.ts:145,150,153,156`) | `packages/shared/utils/helpers/formattedError.ts:13,20` | Toda a cadeia para levar a espera até a tela está pronta — `Retry-After` no 429, `Access-Control-Expose-Headers`, o parse do delta-seconds — e **para no último metro**: o toast diz "aguarde um instante", sem o número que o servidor mandou. ⚠️ Cuidado com falso positivo ao remedir: `apps/api/proxy.ts:83,89,90,115` e `packages/security/index.ts:28,70,77` usam um `retryAfterSeconds` **homônimo de outro tipo** (o `decision` do rate limiter). |
| 🟡 **`isRateLimitEnforced()` é export morto.** `packages/security/index.ts:32` exporta o predicado e **ninguém** o chama fora de `rateLimit.test.ts:96,98,121,128` | `packages/security/index.ts:32` | O papel que ele cumpriria acabou coberto pelo aviso de boot (`instrumentation.ts:23-27`), que lê `process.env.ARCJET_KEY` direto. Duas fontes de verdade para o mesmo fato, e a que tem nome não é a usada. |
| ⚪ **Um `useList*` que falha renderiza o estado vazio, não erro.** Um 429 na lista de entidades mostra "Nenhuma entidade cadastrada" | `…/entities/(hooks)/useListEntities.tsx:11,16` · `…/(home)/EntitiesListClient.tsx:23-28,142` | O hook **devolve** `error` (`:16`); o componente desestrutura só `data, isLoading, refetch, isFetching` (`:23-28`) e **nunca lê** `error` — o único tratamento visual é `loading={isLoading}` (`:142`). Lista que falhou fica indistinguível de lista vazia, e o usuário conclui que apagaram os dados dele. Vale para todo `useList*` no mesmo padrão. |
| 🟡 **`update()` do `BaseRepository` reescreve o documento inteiro e corrompe o tipo de `createdAt`.** `:102-117` lê via `findById()` em `:104` (que passa pelo mapper e devolve `createdAt` **serializado como string ISO**), faz spread e grava tudo de volta em `:114` | `apps/api/(shared)/repositories/base.repository.ts:102-117` | ⚠️ **Preservado de propósito** em `firestore-admin-access` (migração *contract-preserving*). Depois do primeiro `PUT` o campo deixa de ser `Timestamp` e vira `String`: consulta por range/`orderBy` mistura tipos. **Cruza diretamente com `cursor-pagination` (#5)**, que precisa de `orderBy` estável. |
| 🟡 **`userRepository.list()` mente no tipo de retorno**: declara `Promise<UserDTO[]>` (`:32`) mas devolve o merge com o Firebase Auth, que é `UserWithAuthDTO` (cast em `:56`) | `apps/api/(shared)/repositories/user.repository.ts:32,52-63` | O SDK **já declara o tipo certo**, então a mentira está só no repositório — e obrigou o teste a fazer cast para ler o campo. O N+1 do Admin SDK está em `:38-40` (`Promise.all` sobre `mergeWithAuthUser`, um `getUser` por usuário em `:55`). |
| 🟡 `delete()` herdado por todo repositório é **soft delete**: grava `deletedAt` e nada mais (`:127-129`; `deleteBulk` em `:131-133` faz N chamadas, não batch) | `apps/api/(shared)/repositories/base.repository.ts:127-129` | O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. Bloqueia o item 3 de `data-rights-lgpd`. |
| 🟡 **Documentação descreve como implementado um fluxo de pagamentos que não existe** | `docs/PAYMENTS.md:5-12` | Mente com aparência de autoridade. **Um dos três documentos do [padrão nomeado acima](#o-padrão-que-vale-nomear-três-documentos-mentem-sobre-estado-implementado-nas-duas-direções)** — este erra na direção "diz que existe o que não existe"; `SECURITY.md` e `PRE-PRODUCTION.md` erram na direção oposta. **Reconferido item a item nesta rodada — dos 6 bullets de "Estado atual (implementado)", só `:7` é verdadeiro.** São falsos: `:8` (3 rotas `/payments/*` — o diretório não existe — e eventos `customer.subscription.updated\|deleted`, quando o código roteia `subscription_schedule.canceled`), `:9` (`UserDTO.subscription` e `updateSubscriptionByReferenceId`, zero hits), `:10` (`apiClient.payments.*`, zero hits), `:11` (tela "Minha assinatura") e `:12` (idempotência de handlers que são `// TODO`). Corrigir a doc **independe** de implementar a spec. |
| 🟡 `packages/auth/package.json:12` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth/package.json:12` | Export quebrado — `client-ui.tsx` não está no disco (confirmado no `ls` do pacote). Zero importadores, então falha em silêncio hoje; o primeiro `import "@repo/auth/client-ui"` quebra na resolução. **Sétima auditoria consecutiva.** |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` dos três apps | `packages/auth/package.json:24` · `apps/app/package.json:28` | Origem do aviso `deprecated next@15.5.2` no `pnpm install`. Um pacote de **autenticação** — dono de middleware, cookie de sessão e código adjacente ao proxy — resolvendo uma major diferente do runtime que o consome é risco desproporcional ao esforço de alinhar. |
| 🟡 `chart.tsx` é código morto — `recharts` pesa no bundle sem uso | `packages/design-system/components/ui/chart.tsx` | Exportado no barrel (`components/ui/index.ts:8`), `recharts` declarado em `package.json:31`, e a única outra ocorrência é a **string** `"chart"` numa lista de nomes no playground (`page.tsx:130`) — não é import nem render. `dashboard-home` (#10) é a spec que o resgataria. |
| 🟡 **`input-otp.tsx` é código morto**, sem nenhum consumidor | `packages/design-system/components/ui/input-otp.tsx` | Mesma classe do `chart.tsx`: exportado em `index.ts:27`, dep em `package.json:21`, e a única outra ocorrência é a **string** `"input-otp"` em `playground/page.tsx:145`. `account-security-mfa` é a spec que o usaria. |
| 🟡 **Dependências de instrumentação instaladas e nunca importadas:** `import-in-the-middle@^2.0.0` (`:26`) e `require-in-the-middle@7.5.2` (`:35`) | `apps/app/package.json:26,35` | São as dependências típicas de OTel/Sentry e dão **zero** importações em todo `apps`+`packages`. Hoje é peso morto — e **não** contam como evidência de observabilidade. |
| 🟡 `photo` é `z.string().trim().max(PHOTO_URL_MAX)` — qualquer texto passa, não é URL validada, nos **dois** schemas (create `:23`, update `:34`; o limite de 2048 vem de `:7`). O front **valida** como URL (`entityFormSchema.ts:48-59`), a API não | `apps/api/(shared)/validation/entity.schema.ts:7,23,34` | Validação que só existe no navegador é o anti-padrão que a regra de ouro 4 proíbe. **Consequência:** com `img-src` sendo uma allowlist explícita, uma `photo` de host arbitrário é bloqueada pela CSP em runtime — a falha saiu do banco e chegou à tela. |
| 🟡 **Strings de UI soltas, fora do dicionário** — `"Switch language"` (`sr-only`) nos dois language switchers, `"Início"` + `href="/painel"` no breadcrumb, `"Sair"` no ProfileDropdown, os 8 títulos de `routes.tsx` | `LanguageSwitcher.tsx:79` · `apps/web/…/language-switcher.tsx:68` · `PageBreadcrumb.tsx:28,30` · `ProfileDropdown.tsx:51` · `(common)/routes.tsx:43,47,51,55,66,70,74,78` | Viola a regra de ouro 2. Agrava no `sr-only`: é **exatamente** o texto que só o leitor de tela recebe. Os 8 títulos convivem com 8 `url: "#"` (`:44,48,52,56,67,71,75,79`) — é o mesmo bloco de menu inacabado. **Contraste interno:** os itens de topo do mesmo arquivo (`:24,31,38,61`) **já usam** o dicionário, e `(admin)/admin/routes.tsx` tem **zero** `url: "#"`. |
| 🟡 String `"Home"` literal fora do dicionário nas duas home pages — **e a chave já existe e é usada em 8 outras telas** | `apps/app/…/(common)/(pages)/page.tsx:7` · `…/(admin)/admin/(pages)/page.tsx:7` | Viola a regra de ouro 2 com a tradução pronta ao lado. Os dois arquivos têm **11 linhas** e são idênticos exceto o nome do componente. |
| 🟡 **`setTimeout` sem cleanup** no `useEffect` do carrossel: `:24-38` agenda o avanço em `:29-37` e não devolve função de limpeza, com `[api, current]` nas dependências (`:38`) | `apps/web/…/(home)/components/cases-client.tsx:24-38` | Um timer é agendado a cada avanço e nenhum é cancelado na desmontagem, chamando `setCurrent` em componente morto. É a home da landing: o caminho mais percorrido do repo. |
| 🟡 **`hydration mismatch` num `id` do Radix + "Select is changing from uncontrolled to controlled"** — dois mecanismos independentes | `PanelNavbarControls.tsx:29,243-245,278` · `Sidebar.tsx:99-157` | (a) `useIsMobile()` (`:29`, import em `:13`) começa `undefined` e só resolve no `useEffect`, enquanto a subárvore ramifica em `isMobile`; (b) `value={impersonatedFirebaseUid ?? undefined}` num `Select` preenchido por efeito pós-mount é o `undefined→string` do aviso do Radix. **Precisão nova:** são **duas** ocorrências do `value`, não uma — `:243-245` (ramo mobile) e `:278` (desktop); o Select está duplicado entre os dois ramos. O `Collapsible` de `Sidebar.tsx:99` é montado pelos **dois** painéis, então o aviso aparece em **toda carga do painel**. |
| ⚪ **A landing `/contact` acusa erros de hidratação** (`<a>` dentro de `<a>`) vindos do `NavigationMenu` do header: `:82` abre `<NavigationMenuLink>`, `:83` um `<Button>` e `:84` um `<Link>` do Next — aninhando `<a> > <button> > <a>` | `apps/web/…/components/header/index.tsx:82-88` | Pré-existente. **Precisão nova:** o bug é **só** no ramo `item.href`; os subitens (`:126-141`) estão corretos, com `href` direto no `NavigationMenuLink`. A contagem "5" exige rodar a página; nesta rodada só o caminho de código foi reconferido. |
| 🟡 **`/auth/sign-in` e `/auth/sign-up` da api não têm consumidor nenhum e não seguem o contrato `{ error: { code } }`** — devolvem string crua (`sign-in/route.ts:12`, `sign-up/route.ts:26,39-42`); a primeira responde **500** para credencial inválida porque **não há `try/catch`** em volta de `identitySignInWithPassword` (`:7`), nem em `req.json()` (`:5`) | `apps/api/app/(routes)/auth/sign-in/route.ts` · `sign-up/route.ts` | Viola a regra de ouro 3. **Reconferido hoje: seguem órfãs.** O SDK expõe `/auth/me`, `/auth/sign-in/google` e as **4 rotas novas** da PR #10 — nunca `/auth/sign-in` nem `/auth/sign-up`; os apps logam pelo Firebase client. `api-hardening` pôs rate limit nelas e a PR #10 as manteve na lista (`proxy.ts:34-35`): **7 rotas limitadas, 2 das quais ninguém chama e respondem errado**. A decisão certa provavelmente é removê-las. |
| 🟡 **`turbo run` aborta na primeira falha** (`--continue=false` é o default), então uma PR com dois tipos de defeito mostra só o primeiro | `.github/workflows/ci.yml:39` | Comportamento correto, mas quem ler o log da PR verá tasks "não rodadas" e pode se confundir. |
| 🟡 **`apps/app/next.config.ts:19` lista `www.google.com` em `images.domains`** sem uso e sem `remotePattern` correspondente (`:20-25` nomeia só `lh3.googleusercontent.com`, em `:22-24`); `domains` está **deprecado** no Next 16 | `apps/app/next.config.ts:19` | Origem sem uso numa lista de hosts confiáveis de imagem é superfície gratuita — e **divergente** da CSP, que nomeia só `lh3.googleusercontent.com`. Duas allowlists de imagem que discordam, e a sobrando é a que some quando a chave deprecada for removida. |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`** (`:13`); `isSameOriginRequest` **retorna `true` quando não há header `Origin`** (`:68-70`) | `packages/shared/utils/helpers/cookies.ts:13` · `packages/auth/session.ts:66-77` | ASVS 5.0 L1 (3.3.1) exige `Secure`. O helper hoje só grava `x-locale`, **não** o cookie de sessão. Sobre o segundo: `api-hardening` adotou **a mesma** decisão na borda, mas com o porquê escrito e um limite explícito (`cors.ts:42-52`); o de `session.ts` continua sem. |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta.** O cliente grava com TTL (`LanguageSwitcher.tsx:50`, `web/…/language-switcher.tsx:44`), mas na requisição seguinte os proxies fazem `cookieStore.set("x-locale", …)` **sem `maxAge`/`expires`** | `apps/app/proxy.ts:151,155` · `apps/web/proxy.ts:92,96` | O idioma escolhido **não sobrevive ao fechamento do navegador**, porque é rebaixado a cookie de sessão. Bug de produto silencioso: ninguém reclama, todo mundo reescolhe o idioma. *(refs da `apps/app` deslocadas pela PR #10: eram `:130,134`)* |
| ◐ **O bounce do proxy apaga a query string — corrigido só para as duas rotas de `oobCode`.** `apps/app/proxy.ts:182` faz `redirectUrl.search = ""` ao mandar visitante autenticado para casa | `apps/app/proxy.ts:171,182` · `OOB_ACTION_PATHS:71` · `isOobActionPath:83-85` | A PR #10 acrescentou a isenção **por path**, não por parâmetro: `:171` pula o bounce quando a rota é `/reset-password` ou `/verify-email`. Resolve o caso que a quebrava, mas **qualquer outra query em rota pública continua sendo apagada** — `?redirect=`, UTM de campanha, `?plan=`. O próximo fluxo que carregar estado na URL vai redescobrir o mesmo defeito. |
| 🟡 **Casamento exato de rota no rate limit deixa variações de fora.** `RATE_LIMITED_PATHS.includes(pathname)` (`:43-44`) não pega barra final nem subcaminhos | `apps/api/proxy.ts:33-44` | Decisão consciente do `/review`: `startsWith` limitaria `/auth/sign-in/google` duas vezes. **A lista cresceu de 3 para 7** na PR #10 (`:34-40`), e o `/review` da feature conferiu as 4 novas literalmente contra o path real, incluindo o 308 do Next para barra final. A justificativa se sustenta; o custo de manutenção sobe a cada rota. |
| ⚪ **`cors.ts` allow-lista um header que nenhum código do repo envia:** `x-locale` (`:16`) existe **só como cookie**, nunca como header de requisição | `apps/api/(shared)/lib/cors.ts:16` | Resíduo. **`x-role` (`:15`) NÃO é resíduo** e não deve ser removido junto: o SDK o envia (`packages/sdk/src/client/base.ts:53`) e a API o lê (`auth-request-context.ts:100`). O `ALLOWED_HEADERS` (`:12-18`) ainda espalha `...Object.values(AUTH_REQUEST_HEADER)` em `:17`, então o esquema novo e o legado convivem. |
| 🟡 **O papel do painel viaja em dois headers ao mesmo tempo.** O SDK põe `AUTH_REQUEST_HEADER.REQUEST_ROLE` (`base.ts:45`) **e** um `"x-role"` cru (`:53`), remove em `:61`, e o getter `requestRole` (`:93-98`) lê de volta o **cru** (`:95`); a API lê o segundo como `legacyXRole` (`auth-request-context.ts:100`), usando-o como fallback em `:119` | `packages/sdk/src/client/base.ts:45,53,61,95` · `apps/api/(shared)/lib/auth-request-context.ts:100,119` | Dois nomes vivos para o mesmo fato, com o "legacy" sendo **escrito e lido de volta** em toda requisição autenticada — não é resíduo histórico, é duplicação ativa. A limpeza é conjunta com o achado do `cors.ts`: se `x-role` sair do SDK, o `:16` do CORS e o fallback `:119` saem com ele. |
| 🟡 **`useHealthCheck` foge do padrão de hooks de dados do escopo.** `getApplicationHealthCheck` (`:11`) **não é exportado** — o único export do arquivo é `useHealthCheck` (`:19`) | `apps/app/shared/hooks/useHealthCheck.ts:11,19` | O `apps/app/CLAUDE.md` exige que o hook exporte também a função imperativa no mesmo arquivo. *(O `useQuery` direto em `:29` **não** viola a regra do `useAuthorizedQuery`: `health/route.ts` é um `GET` público sem guard.)* |

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo — é isso que impede o backlog de
inchar a cada rodada. **Nenhuma ganhou argumento novo nesta rodada**; as duas linhas abaixo mudaram só de
grau.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| Notificações in-app + preferências | 3/10 | Esforço G se feito à mão (feed, badge, fan-out, digest); a referência do ecossistema terceiriza num serviço pago com chave obrigatória. Reavaliar quando houver um caso de fan-out real. |
| Command palette (⌘K) | 2/10 | Aparece em templates de dashboard, não em kits de SaaS. Barato, mas valor estético — não é diferencial de MVP. |
| Metering / limites de uso / créditos | 2/10 | Muito hype por causa de AI SaaS, mas é DIY sobre a Meters API em quase todo kit. Só faz sentido depois de `billing-subscription`. O ponto de extensão existe (`checkRateLimit` decide em vez de lançar) — o custo de plugar caiu, o valor não subiu. |
| Feature flags | 2/10 | Dá para viver com variável de ambiente num MVP; flag sem data de remoção vira dívida permanente. Reavaliar após `observability-logging` — que subiu para #2, então esta reavaliação pode chegar antes do esperado. |
| Firebase App Check | — | A outra metade do controle 16 da nota de conformidade, e **explicitamente fora do corte** de `api-hardening`: atesta o cliente, mas exige configuração de projeto Firebase por fork. Reavaliar se aparecer abuso que o rate limit por IP não contenha. |
| Waitlist / captura de lead | 2/10 | Alto valor **só** na fase pré-lançamento — é decisão do fork, não do core. |
| **Consertar o formulário de contato da landing** | — | ⚠️ **Não é spec, é achado.** O formulário é maquete e a action que ele deveria chamar já existe, funciona e tem teste. Correção pontual de esforço P — vai direto ao `/analyze`. |
| Provedor de e-mail plugável (SES/Postmark) | — | Explicitamente fora do corte de `transactional-emails`: "só quando algum fork pedir". Nada mudou — e a spec está arquivada, então reabrir exige spec nova. |
| Rastreio de abertura/clique em e-mail | — | Fora do corte de `transactional-emails`: arrasta discussão de privacidade sem valor para um MVP. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto **é** uma API. Webhook de saída bem-feito (HMAC, retry com backoff, DLQ) é esforço G. |
| Sessões e dispositivos gerenciáveis | 1/10 | Absorvido pelo corte de `account-security-mfa`. |
| Widget de feedback | 1/10 | Terceirizar é mais racional que manter no core. |
| Referral / afiliados | 0/10 | Nenhuma referência do painel entrega. A pesquisa classifica como discurso de blog; o mercado resolve com produto de terceiro. |
| SSO enterprise · SCIM | 0/10 | Território de provedor especializado. Só entra com o primeiro contrato enterprise — e aí não é mais boilerplate. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | Estavam no "fora do corte" de `ci-pipeline` porque dependiam de um CI verde e estável. **A condição amadureceu mais**: o CI está em `main`, verde em **12** execuções, e o teste instável não reproduziu em **6** execuções forçadas entre duas rodadas — mas a causa estrutural (nenhum `testTimeout` em 9 configs) segue, e agora `docs/PRE-PRODUCTION.md:111-114` a transformou em pré-requisito formal do branch protection. **Argumento a favor de Renovate segue de pé:** as três actions do `ci.yml` miravam Node 20 e **nenhuma validação local pegou**. |
| Remote Cache do Turbo | prática 1 | É a única peça que arrasta conta e env, e o ganho só aparece com o CI estável. Entra quando doer, com medição — e como opt-in por variável ausente, no padrão do `ARCJET_KEY`. |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das **9** configs de Vitest declara cobertura (remedido hoje: `grep coverage` = 0): não há número para discutir. Medir primeiro, gatear depois, e só em pastas críticas. Relatório por workspace **não soma** — exige consolidação na raiz. Cruza com `e2e-testing`, que traz a medição no corte. |
| Changesets / versionamento | opcional-forte | Com pacotes `private: true` e forks que divergem, o valor seria só o changelog. Não paga o processo agora. |
| Storybook | não apareceu no painel | O `playground` já serve de catálogo vivo dos componentes. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork, não do core. |
