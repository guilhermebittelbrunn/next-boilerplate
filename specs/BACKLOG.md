# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-14 (`/spec --sync`, pós-merge da PR #11) · anteriores: 2026-09-11 ·
> 2026-09-10 · 2026-09-09 (2 rodadas) · 2026-09-02 · 2026-09-01 (3 rodadas) · 2026-08-31 · **origem:**
> semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`file-upload-storage` fechou e foi arquivada.** A PR **#11** foi mergeada em `main` em
>    2026-09-14T23:53:32Z (merge commit `9154776`) e o CI passou nesse SHA (run `34910857483`, `success`).
>    Os **5 itens do corte** foram reconferidos **um a um no código**, com evidência em `arquivo:linha`
>    marcada na spec arquivada em
>    [`docs/features/file-upload-storage/spec.md`](../docs/features/file-upload-storage/spec.md).
> 2. **⚠️ O `STATE.md` da feature estava atrasado e não foi usado como veredito.** Suas etapas `review` e
>    `test` seguiam gravadas como `in-progress`/`blocked` — estado anterior ao merge. Foram reconciliadas
>    **depois** da verificação no código, não antes. É o caso exato para o qual a regra "verifique o
>    código, não o `status` gravado" existe.
> 3. **A cadeia de três níveis acabou, e o #1 mudou de dono.** `account-settings` perdeu o **último**
>    bloqueio (`depends_on` foi a `[]`) e **assume o #1** — é a única spec elegível que desbloqueia outras
>    duas (`account-security-mfa` e `data-rights-lgpd`). Pelo mesmo mérito estrutural que pôs
>    `file-upload-storage` no topo na rodada anterior.
> 4. **Dois achados que o pipeline da #11 registrou como "não corrigidos" foram, na verdade, corrigidos
>    pela própria PR.** O rótulo de campo inválido que ficava cinza no tema escuro e a validação de `photo`
>    que só existia no navegador **ambos caíram** — ver [Achados](#achados-da-varredura-que-não-viraram-spec).
>    Os artefatos de `review`/`test` foram escritos antes desses commits e não os conhecem.
> 5. **O gate instável é pior do que a documentação diz, e o arquivo culpado não é o que ela nomeia.**
>    Existem **dois** `securityPolicySources.test.ts` — `apps/app/` e `apps/web/` — e só o primeiro estava
>    documentado. Medido hoje: o da **`apps/web`** chegou a **3089 ms num único teste** contra o default de
>    5 s. Ver [Gates](#gates--medidos-nesta-auditoria).
> 6. **Deriva de referência em 11 das 13 specs**, contra 8/14 da rodada anterior — porque a #11 deslocou
>    linhas no meio de arquivos antigos (`packages/auth/server.ts` +14, `apps/app/proxy.ts` +4,
>    `docs/SETUP.md` +6, `CLAUDE.md` +7) em vez de só criar arquivos novos. **Três são inversões
>    semânticas**, não números errados: specs que hoje acusam de errado um documento que já foi corrigido.

## Contadores

Sobre as **13 specs que seguem em `specs/`**. Recontados do disco em 2026-09-14, lendo o frontmatter de
cada arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 12 |
| `approved` | 0 |
| `in-progress` | 0 |
| `done` (arquivadas) | 6 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 5 · `dx` 4 · `confianca` 4. **Por esforço:** P 0 · M 10 · G 3.
**Por valor:** alto 10 · médio 3 · baixo 0.

**Transições aplicadas nesta rodada: 1** — `file-upload-storage` `proposed` → `done` + arquivada. (O
frontmatter dizia `proposed` mesmo com a feature entregue: a spec nunca chegou a ser movida para
`in-progress`, o que é uma falha do fluxo anterior, não desta auditoria.) `in-progress` segue em **zero**:
não há feature em execução, e o backlog está pronto para o próximo `/analyze`.

## Gates — medidos nesta auditoria

Re-executados agora com `--force`, não copiados do `/test` nem da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **472 arquivos · 0 erros · 0 warnings** (`No fixes applied`, 516 ms) |
| `pnpm turbo run lint typecheck test --force` | ✅ **23 tasks, 23 successful, 0 cached** — **1 m 5,8 s** |
| `pnpm test` (raiz — é o que gateia o `turbo build`) | ✅ **9 workspaces · 74 arquivos · 750 testes** |

| workspace | arquivos | testes | Δ vs. 2026-09-11 |
|-----------|---------:|-------:|------------------|
| `api` | 25 | 268 | +3 arquivos · **+62** |
| `app` | 28 | 208 | +2 arquivos · **+20** |
| `@repo/email` | 7 | 137 | — |
| `@repo/security` | 3 | 31 | — |
| `@repo/auth` | 2 | 29 | **— (segundo ciclo sem um teste; ver achado)** |
| `web` | 4 | 27 | — |
| `@repo/internationalization` | 3 | 27 | — |
| `@repo/shared` | 1 | 15 | — |
| `@repo/payments` | 1 | 8 | — |
| **total** | **74** | **750** | **+5 arquivos · +82 testes** |

CI: **15 execuções listadas, todas `success`** (`gh run list`), incluindo a do merge da PR #11 no SHA
`9154776` (run `34910857483`, 1 m 31 s). **Nenhum commit do repo está fora de `main`**: `HEAD` da branch
`dubai` é `9154776`, igual a `origin/main`.

### 🔴 O gate instável: a documentação nomeia o arquivo errado, e a margem é menor que o registrado

Este achado é **novo** e substitui o que o `PRE-PRODUCTION.md:190-193` afirma hoje.

Existem **dois** arquivos chamados `securityPolicySources.test.ts` — `apps/app/__tests__/` e
`apps/web/__tests__/`. Toda a discussão anterior sobre flake tratou só do primeiro. Medições de hoje:

| arquivo | isolado (3 execuções) | sob contenção (gate completo) | pior caso isolado → contenção |
|---------|----------------------|-------------------------------|-------------------------------|
| `apps/app/__tests__/securityPolicySources.test.ts` | 616 · 632 · 914 ms | **3577 ms** (pior teste **2434 ms**) | ~4× |
| `apps/web/__tests__/securityPolicySources.test.ts` | 387 · 420 · 590 ms | **3491 ms** (pior teste **3089 ms**) | **~7×** |

O default do Vitest é **5 s**. O pior caso medido é **3089 ms — 62% do teto** — e numa segunda execução
independente do gate, no mesmo dia, o mesmo teste chegou a **4033 ms, 81% do teto**. Ou seja: a margem é
consideravelmente mais fina que os "216 ms × até 2203 ms" que o `PRE-PRODUCTION.md` registra, **e o arquivo
mais próximo de estourar não é o que ele nomeia**.

**Nenhuma das 9 configs de Vitest declara `testTimeout`** — remedido hoje: `grep testTimeout` nas 9 = **0**.
A causa estrutural segue: os dois arquivos reconstroem o grafo do proxy por caso. A #11 ainda acrescentou
**41 linhas** ao da `apps/web` (o bloco `describe("image sources follow the storage bucket")`).

> **Consequência prática:** o pré-requisito que o `PRE-PRODUCTION.md:190-193` impõe ao branch protection
> continua correto — mas está subdimensionado e aponta para um arquivo só. Ver
> [Contradições doc × código](#contradições-doc--código-medidas-nesta-rodada).

## Ordem recomendada

Respeita `depends_on` (medido do frontmatter nesta rodada) e prioriza o que **desbloqueia** e o que **fica
mais caro depois**.

| # | id | por que agora |
|---|----|---------------|
| 1 | [`account-settings`](account-settings.md) | **Herdou o topo pelo mesmo mérito estrutural que elegeu o #1 anterior: é a única elegível que desbloqueia outras duas.** Com `file-upload-storage` entregue e mergeada, `depends_on` foi a **`[]`** — as duas dependências caíram (`auth-recovery-verification` na #10, `file-upload-storage` na #11). Destrava `account-security-mfa` e `data-rights-lgpd`, e é a **última** spec da cadeia de três níveis que dominou as duas rodadas anteriores. **E o escopo encolheu duas vezes:** a troca de senha autenticada reaproveita `auth/password/reset/route.ts` (incl. `revokeUserSessions`), e o avatar agora **consome** peças prontas e deliberadamente genéricas — `POST /files`, `FileActions`, `useFileUpload`, `HookFormImageUpload`. A sidebar segue com **8** links apontando para `#` (`routes.tsx:44,48,52,56,67,71,75,79`) e **todas as 5** rotas de usuário seguem `requireAdminApi` (`users/route.ts:21,34`; `users/[id]/route.ts:15,33,75`): **ninguém consegue editar a si mesmo.** **0 de 6.** |
| 2 | [`observability-logging`](observability-logging.md) | Segurou o #2 e **ganhou evidência nova, mas de sinal misto — e a spec foi corrigida para dizer isso.** A #11 acrescentou **dois** pontos de log: `storage.ts:74` **segue** a convenção, e `entity-photo.ts:61` a segue **pela metade** (prefixo certo, mensagem livre, sem `chave=valor`). Placar medido hoje: **4 conformes · 2 semiconformes · 1 não-conforme**. A leitura honesta mudou: a convenção **se propaga** sem helper, mas **se degrada na borda** — assinar URL, revogar sessão —, que é exatamente onde ninguém relê. Isso é um argumento melhor que o anterior, porque é falsificável. `depends_on` vazio. |
| 3 | [`cookie-consent`](cookie-consent.md) | **A única spec do backlog com violação ativa, não com ausência de recurso:** `packages/analytics/provider.tsx:15` monta o Vercel Analytics **incondicionalmente** e `:16-17` monta o GA checando só a env — zero consentimento, sobre todo o app (`apps/app/app/layout.tsx:39`). `grep -rin consent` em `apps/` + `packages/` = **0 ocorrências**. **É a única das 13 que a PR #11 não tocou em nada** — 12 de 12 referências remedidas e exatas. `depends_on` vazio. |
| 4 | [`firebase-emulator-seed`](firebase-emulator-seed.md) | Oitava auditoria consecutiva com o mesmo veredito: `firebase.json` **sem bloco `emulators`**, `firebase-tools` não é dependência de ninguém, `grep -i emulator` = **0**. São **750 testes rodando a cada PR e nenhum toca o banco ou as rules** — e agora são **duas** rules files sem teste: `firestore.rules` (deny-all publicado e em vigor) e o **`storage.rules` novo**, que nunca foi exercitado **nem publicado**, porque o Cloud Storage nem está ativado. É o **gargalo único** de `e2e-testing`. |
| 5 | [`cursor-pagination`](cursor-pagination.md) | Todo fork herda "ler a coleção inteira": `base.repository.ts:36-49` faz `.get()` sem `limit`/`orderBy`/`startAfter`. Filtro e ordenação acontecem em memória nas subclasses. Depois de haver dados em produção, a correção quebra contrato do SDK. Cruza com a dívida do `update()` (achados), que precisa de `orderBy` estável em `createdAt`. |
| 6 | [`audit-log`](audit-log.md) | O painel **já tem impersonação** e nada registra quem entrou na conta de quem — o switch é 100% client-side (`panelStore.ts:76-90`, **sem chamada de API**). **A #11 alargou a lacuna:** `POST /files` é uma rota de **escrita** nova, que grava no bucket do fork e é cobrada como storage e egress, **sem trilha** — e o próprio repo a reconhece como sensível ao pô-la em `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:45`). Rate limit não é trilha. **0 de 5.** |
| 7 | [`billing-subscription`](billing-subscription.md) | Monetização é o maior valor bruto do backlog e continua em **0/6**: nenhuma rota sob `payments/` (o diretório não existe), `UserDTO` sem `subscription` nem `stripeCustomerId`, webhook com dois handlers `// TODO` e `:63` devolvendo o evento Stripe inteiro na resposta. ⚠️ **A doc descreve como pronto o que não existe** — dos 6 bullets de `docs/PAYMENTS.md:5-12`, só `:7` é verdadeiro. Corrigir a doc **independe** de implementar a spec. **Pré-requisito barato:** o 🔴 de `packages/payments/ai.ts:4-5` explode no primeiro fork que importar o pacote, e é esta spec que faria alguém importar. |
| 8 | [`onboarding-flow`](onboarding-flow.md) | Maior desequilíbrio valor/prevalência do painel (3/10 entregam) e é onde o usuário decide se fica. `grep -rin onboarding` = **1 ocorrência, e é um endereço de sandbox do Resend num fixture**. O gancho pós-cadastro já existe (`SignUpFormClient.tsx:105`) e o painel comum já aceita aviso de estado incompleto (`EmailNotVerifiedNotice`). **0 de 5.** |
| 9 | [`dashboard-home`](dashboard-home.md) | As duas homes do painel são **11 linhas** e o literal `"Home"` — e a chave de dicionário **já existe** e é usada em **8** breadcrumbs. É a primeira tela de todo fork. Spec mais "presa" do conjunto elegível (ver lotes). |
| 10 | [`data-rights-lgpd`](data-rights-lgpd.md) | 🔒 Bloqueada por `account-settings` — **agora a 1 nível, era 2**. Obrigação legal com prazo; fica mais cara a cada coleção nova. **A #11 tornou real um acoplamento que a spec tratava como hipotético:** a exclusão de conta agora precisa limpar objetos no bucket, e `deleteObjectQuietly` tem **um único** call site (a troca de foto) — apagar a conta hoje **deixa os objetos órfãos**. O único `DELETE` é admin-only e é soft delete. |
| 11 | [`e2e-testing`](e2e-testing.md) | 🔒 Bloqueada por #4, o único gargalo restante. Zero `playwright`/`cypress`/`axe`/`puppeteer` em **qualquer** `package.json`, e **nenhuma** das 9 configs declara cobertura. **O argumento do gate instável voltou a ficar forte** — não por flake reproduzido, mas porque a medição de hoje achou um **segundo** arquivo lento, mais próximo do teto que o documentado. |
| 12 | [`account-security-mfa`](account-security-mfa.md) | 🔒 Bloqueada por `account-settings` — **mas o item 1 do corte não deveria estar**, e segue subindo de gravidade sem uma linha ter sido escrita. `revokeUserSessions` é chamada pela redefinição de senha (`auth/password/reset/route.ts:49`) e a janela segue aberta (`packages/auth/server.ts:137` sem `checkRevoked`). A vítima redefine a senha e o ID token do atacante **continua válido por até uma hora**. Ver [Dependências](#dependências-e-bloqueios). |
| 13 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22 — a decisão, não só a implementação. As **duas contrapartidas de esforço P seguem não feitas**, agora há **vinte e três dias** — e o custo de uma delas **subiu** nesta rodada. Ver [a decisão que não pode esperar a fila](#a-decisão-que-não-pode-esperar-a-fila). |

### O que **não** foi escolhido para #1, e por quê

- **`observability-logging`** manteve o #2 e ficou perto de novo. Perdeu porque **não desbloqueia ninguém**:
  o custo de adiá-la é linear (mais uma variação de log por entrega — a #11 rendeu duas), enquanto o de
  adiar `account-settings` é uma cadeia de duas specs parada, uma delas com **prazo legal**.
- **`cookie-consent`** é a única com violação legal **em curso** (tags carregando sem base legal, hoje), e
  pela terceira rodada não foi ao topo: destrava zero specs, e a exposição real de um boilerplate sem
  usuários é baixa. **Se o primeiro fork for a público antes de #1 sair, esta ordem se inverte** — é a
  troca a fazer conscientemente, não por acidente.
- **`firebase-emulator-seed`** destrava **1** spec (`e2e-testing`, esforço G, valor médio) contra as 2 de
  `account-settings`, uma delas com obrigação legal. Segue em #4.
- **`audit-log`** ganhou argumento novo nesta rodada (`POST /files` sem trilha) e ainda assim não subiu:
  o que ela protege é um painel que **ainda não tem donos de conta**, e é `account-settings` que os cria.
  Fazê-la antes é auditar um sistema de contas que ninguém consegue administrar.

## Lotes paralelos

Para rodar o ciclo completo em 2–4 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-14** a
partir do `contends_on` de cada spec, pelo algoritmo escrito em
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Um lote **não** é uma
recomendação de prioridade — se você só vai rodar uma coisa, rode o #1 da ordem.

**Elegíveis nesta rodada: 9 de 13** — contra 8 de 14 na anterior. Ficaram de fora: `teams-organizations`
(`deferred`) e `account-security-mfa` + `data-rights-lgpd` + `e2e-testing` (`depends_on` não satisfeito).
**Nenhuma ficou de fora por "entregue mas não mergeada"** — a ressalva que barrou `file-upload-storage` na
rodada anterior caiu junto com o merge da #11.

| lote | specs | o que cada uma toca | por que não colidem |
|------|-------|---------------------|---------------------|
| **1** | `account-settings` · `observability-logging` · `cookie-consent` | rotas/paths do painel comum + `UserDTO` + `user.repository.ts` · instrumentação + proxy da API + webhook de pagamento · provedor de analytics + os dois `layout.tsx` + barril de UI | três territórios disjuntos: **slice `user` no app**, **borda da API** e **camada de apresentação/analytics**. Nenhum arquivo em comum |
| **2** | `firebase-emulator-seed` · `cursor-pagination` · `billing-subscription` | `firebase.json` + `package.json` da raiz + `packages/auth/server.ts` · `base.repository.ts` + `entity.repository.ts` + `table.tsx` + índices + ação `entity` do SDK · webhook + barril do SDK + `UserDTO` + `user.repository.ts` + `routes.tsx` | **infra local**, **slice `entity` paginado** e **slice `user` cobrado**. Repositórios diferentes, tipos diferentes |
| **3** | `audit-log` · `onboarding-flow` | `base.repository.ts` + `users/[id]` + índices + barril do SDK + `queryKeys.ts` · `apps/app/proxy.ts` + resolvedor pós-login + `user-merge.ts` + `UserDTO` | uma é **escrita de trilha na API**, a outra é **desvio de navegação no app**. Encostam no `user` por caminhos distintos (`users/[id]/route.ts` × `user-merge.ts`) |
| **4** | `dashboard-home` | as duas `page.tsx` de home + `queryKeys.ts` + índices | sozinha — ver abaixo |

### Por que cada spec ficou de fora do lote 1

Distinguir os dois motivos importa: colisão é **dado**, teto é **decisão**.

- **`billing-subscription` — colisão dupla, e a mais séria do backlog.** Não entra com `account-settings`:
  as duas alteram `packages/sdk/src/types/user/user.ts` **e** `apps/api/(shared)/repositories/user.repository.ts`
  **e** `apps/app/.../(common)/routes.tsx`. **Três arquivos**, todos no coração do slice `user`. Também não
  entra com `observability-logging`, que disputa com ela o
  `apps/api/app/(routes)/webhooks/payments/route.ts`.
- **`onboarding-flow` — colisão simples.** Não entra com `account-settings`: as duas alteram
  `packages/sdk/src/types/user/user.ts`. Uma acrescenta o estado de onboarding ao `UserDTO`, a outra os
  campos de perfil.
- **`firebase-emulator-seed`, `cursor-pagination`, `audit-log`, `dashboard-home` — sem colisão com o lote 1.**
  Qualquer uma delas caberia tecnicamente. Ficaram de fora **só pelo teto de 3**, que é escolha de custo de
  revisão, não impedimento técnico. Se você tiver fôlego para revisar 4 features amanhã, a de melhor
  posição na ordem é `firebase-emulator-seed`.

> **O #1 desta rodada é também uma das specs mais disputadas do backlog.** `account-settings` colide com
> `billing-subscription` em 3 arquivos e com `onboarding-flow` em 1 — as três mexem no mesmo `UserDTO`.
> Isso não muda a recomendação (ela segue sendo a #1 por desbloquear duas specs), mas **muda o plano de
> paralelismo**: enquanto ela estiver rodando, nenhuma outra spec do slice `user` pode rodar junto.

E o que separa os lotes 2, 3 e 4 entre si:

- **`audit-log` não entra com `cursor-pagination`:** as duas alteram
  `apps/api/(shared)/repositories/base.repository.ts` — uma para ensiná-lo a paginar, a outra para tornar a
  trilha somente-adição — **e** as duas alteram `firestore.indexes.json`. Duas colisões, não uma.
- **`dashboard-home` fica sozinha:** disputa `firestore.indexes.json` com `cursor-pagination` e `audit-log`,
  e `apps/app/shared/lib/queryKeys.ts` com `audit-log`. É a spec mais "presa" do conjunto elegível, apesar
  de não depender de ninguém — bom exemplo de que `depends_on: []` não significa "pode rodar a qualquer
  momento".

**Os dois arquivos mais disputados do repositório** são `firestore.indexes.json`, citado por 5 das 13 specs
(`audit-log`, `cursor-pagination`, `dashboard-home`, `data-rights-lgpd`, `teams-organizations`), e
`packages/sdk/src/types/user/user.ts`, citado por 3 (`account-settings`, `billing-subscription`,
`onboarding-flow`) — este último subiu de importância nesta rodada, porque o #1 passou a estar nele.

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

A medida desse erro foi remedida hoje, agora com a spec **entregue e mergeada** como amostra:
`file-upload-storage` declarava **6** arquivos em `contends_on` e a PR #11 alterou **32** arquivos
compartilhados (descontados testes, `docs/`, `specs/`, `.env.example` e i18n) — **12 deles no design
system**, mais `packages/shared/utils/helpers/httpStatus.ts` e `packages/auth/keys.ts`, nenhum dos quais
uma leitura da spec anteciparia.

Essa razão — 6 previstos para 32 alterados — é a régua honesta do campo: ele **não** tenta prever o raio de
impacto da spec, e falharia feio se tentasse. Ele mira nos arquivos de **alta disputa**, os que outra spec
do backlog também alteraria. Os 26 restantes não entram porque ninguém mais os disputa: mexer sozinho num
arquivo não é contenção.

**Corolário que esta rodada confirmou:** o `contends_on` de `firebase-emulator-seed` lista `firebase.json`,
`package.json` e `packages/auth/server.ts` — e a PR #11 **alterou os três**. A colisão prevista aconteceu de
verdade, com uma spec que nem estava rodando. Se dois workspaces do mesmo lote tocarem o mesmo arquivo por
acidente, **isso é achado de auditoria** — corrija o `contends_on` das duas specs na rodada seguinte, em vez
de tratar como azar.

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-14 |
|------|--------------|------------------------|
| [`account-settings`](account-settings.md) | — *(era `auth-recovery-verification`, `file-upload-storage`)* | 🔓 **totalmente desbloqueada** — as duas entregues e mergeadas (PR #10 `e4eddb9`, PR #11 `9154776`). É por isso que ela é o **#1** |
| [`account-security-mfa`](account-security-mfa.md) · [`data-rights-lgpd`](data-rights-lgpd.md) | `account-settings` | 🔒 bloqueadas — **a cadeia encurtou de 2 níveis para 1**. São as próximas a cair |
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | ✅ `ci-pipeline` entregue · 🔒 `firebase-emulator-seed` — **gargalo único** |
| [`audit-log`](audit-log.md) · [`cursor-pagination`](cursor-pagination.md) · [`firebase-emulator-seed`](firebase-emulator-seed.md) | `firestore-admin-access` | ✅ satisfeita (entregue em 2026-08-31) |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`billing-subscription`](billing-subscription.md) · [`cookie-consent`](cookie-consent.md) · [`dashboard-home`](dashboard-home.md) · [`observability-logging`](observability-logging.md) · [`onboarding-flow`](onboarding-flow.md) | — | ✅ sem dependência |

> **O grafo segue mais restritivo que a realidade técnica no mesmo ponto de sempre.** O item 1 do corte de
> `account-security-mfa` (fechar a janela de revogação: `packages/auth/server.ts:137` chama `verifyIdToken`
> **sem** `checkRevoked`, e `resolve-api-actor.ts:23-32` tenta o bearer **antes** do cookie em `:34`, que
> esse sim usa `verifySessionCookie(..., true)` em `server.ts:207-210`) **não depende de `account-settings`
> para nada** — é correção de guard, não tela de conta. Com a #10, o furo saiu do logout deliberado e entrou
> no fluxo de "minha conta foi comprometida". Continua preso 1 nível abaixo, quando poderia ser tarefa
> direta hoje. Ver o 🔴 em [Achados](#achados-da-varredura-que-não-viraram-spec).
>
> ⚠️ **Armadilha de leitura, encontrada nesta rodada:** a referência antiga `server.ts:193-196` foi
> deslocada pela #11 e caiu exatamente sobre um **comentário que menciona `checkRevoked: true`**. Uma
> conferência superficial dá "confere" e conclui que o furo foi fechado. **Não foi.** A chamada real está
> em `:207-210`, e o `verifyIdToken` sem revogação está em `:137`.

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | 🔒 `account-settings` |
| [`account-settings`](account-settings.md) | Área de conta e preferências do usuário | produto | alto | M | `proposed` | — ✅ |
| [`audit-log`](audit-log.md) | Trilha de auditoria de ações sensíveis | confianca | alto | M | `proposed` | ✅ `firestore-admin-access` |
| [`billing-subscription`](billing-subscription.md) | Assinatura Stripe de ponta a ponta | produto | alto | M | `proposed` | — |
| [`cookie-consent`](cookie-consent.md) | Consentimento de cookies e Consent Mode | confianca | alto | M | `proposed` | — |
| [`cursor-pagination`](cursor-pagination.md) | Paginação por cursor no BaseRepository e no SDK | dx | alto | M | `proposed` | ✅ `firestore-admin-access` |
| [`dashboard-home`](dashboard-home.md) | Home do painel com widgets | produto | médio | M | `proposed` | — |
| [`data-rights-lgpd`](data-rights-lgpd.md) | Direitos do titular: exportar dados e excluir conta | confianca | alto | G | `proposed` | 🔒 `account-settings` |
| [`e2e-testing`](e2e-testing.md) | Testes E2E e acessibilidade automatizada | dx | médio | G | `proposed` | ✅ `ci-pipeline` · 🔒 `firebase-emulator-seed` |
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
| `transactional-emails` | 2026-09-10 | [`docs/features/transactional-emails/spec.md`](../docs/features/transactional-emails/spec.md) — 6/6 do corte |
| `auth-recovery-verification` | 2026-09-11 | [`docs/features/auth-recovery-verification/spec.md`](../docs/features/auth-recovery-verification/spec.md) — 5/5 do corte, conferidos um a um |
| `file-upload-storage` | 2026-09-14 | [`docs/features/file-upload-storage/spec.md`](../docs/features/file-upload-storage/spec.md) — **5/5 do corte**, conferidos um a um no código (PR #11, `9154776`, CI verde). ⚠️ **6 critérios de aceite seguem "não verificados"** por o Cloud Storage não estar ativado — pendência de infra, não reprovação |

**Verificado nesta rodada:** `docs/features/` tem **8** pastas e **6** `spec.md` arquivados. Não houve
colisão no `git mv` (`docs/features/file-upload-storage/spec.md` não existia), e o `STATE.md` daquela
feature **já trazia** `spec: file-upload-storage` (`:5`) — não foi preciso acrescentar. Os frontmatters das
6 arquivadas estão coerentes (`status: done`, `feature: <slug>`) e **não há duplicata** em `specs/` para
nenhuma delas.

As **duas** features concluídas sem spec — `auth-panel-context` e `impersonation-read-only` — não constam
aqui, e é o correto: as duas são anteriores à semeadura do backlog (2026-08-21).

### ⚠️ O que a PR #11 entregou **além** do corte

Registrado porque quem ler o diff vai estranhar, e porque um lote paralelo precisa saber disso. Além dos 5
itens do corte, a PR trouxe: o comando **`/cycle`** e seu runner agendável (`launchd`), a política de ciclo,
e a **modelagem de `contends_on`** que gerou a seção de lotes deste arquivo. Nada disso está na spec.

**Isso não é deriva de implementação** — o corte foi entregue exatamente como especificado. É **escopo
adicional de tooling**, carona numa PR de produto. A leitura útil: o ciclo autônomo construiu, no mesmo
passe, a feature e o instrumento que o mede. Vale saber que uma PR rotulada "entity photo uploads" mudou
também o processo.

## Contradições doc × código, medidas nesta rodada

O modo de falha mais consistente deste repositório é **documentação que mente sobre estado implementado**,
e é o único que nenhum gate pega: `pnpm check`, `typecheck`, 750 testes e o CI não leem prosa.

| documento | afirma | realidade medida em 2026-09-14 | veredito |
|-----------|--------|-------------------------------|----------|
| `docs/PRE-PRODUCTION.md:19-52` (rules do Firestore) | "publicado e em vigor", medido 403 em 2026-09-11 e reconferido em 2026-09-14 | **confere.** O `deny-all` de `firestore.rules:32-33` está no disco e o documento separa corretamente o projeto de referência (fechado) do fork (nasce aberto) | ✅ **honesto** |
| `docs/PRE-PRODUCTION.md:101-167` (Cloud Storage) | serviço **não** ativado; sem as envs o app sobe, o build passa, `POST /files` responde 503 e o campo de upload some | **confere, e remedido:** `firebasestorage.googleapis.com/v0/b/next-boilerplate-576d0.firebasestorage.app/o` ⇒ **404** (idem `.appspot.com`). O comportamento degradado está no código (`storage.ts:23-24`, `files/route.ts:14-19`, `storageEnabled.ts:3-4`) | ✅ **honesto** — a pendência **está** escrita, com runbook, aviso de plano Blaze e de região |
| `docs/SECURITY.md` | postura de segurança | reconferido: as afirmações sobre rules publicadas e sobre a CSP batem com o código | ✅ **honesto** |
| `docs/PRE-PRODUCTION.md:190-193` (gate instável) | `apps/app/__tests__/securityPolicySources.test.ts` roda "216 ms isolado × até 2203 ms sob contenção" contra o default de 5 s | **desatualizado e incompleto.** São **dois** arquivos com esse nome; o da `apps/app` mede hoje 616–914 ms isolado × **2434 ms**, e o da **`apps/web`** — que o documento não conhece — mede 387–590 ms isolado × **3089 ms** (e **4033 ms** numa segunda execução do gate, **81% do teto**) | 🟡 **subdimensionado** — ver [Achados](#achados-da-varredura-que-não-viraram-spec) |
| `docs/PAYMENTS.md:5-12` | 6 bullets de "Estado atual (implementado)" | **5 dos 6 são falsos** — não há rotas `/payments/*`, nem `UserDTO.subscription`, nem `apiClient.payments.*`, nem tela de assinatura; os handlers são `// TODO` | 🔴 **mente na direção "existe o que não existe"** |
| `apps/api/.env.example:15-18` | `FIREBASE_STORAGE_BUCKET=""` mantém o upload "switched off" | **falso, e o próprio comentário se contradiz 2 linhas depois**: `:18` diz "Falls back to `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` when empty", e `apps/api/env.ts:40-43` faz exatamente isso | 🟡 **novo** — ver Achados |

**Correções aplicadas ao próprio backlog nesta rodada:** três specs citavam `docs/SECURITY.md:30-35` e
`docs/PRE-PRODUCTION.md:23-25` como prova de uma afirmação **falsa** — e a PR #11 reescreveu esses blocos,
de modo que as linhas hoje contêm a **correção**. Quem seguisse a referência lia o contrário do que a spec
afirmava. As três foram consertadas: `cursor-pagination` teve o parêntese acusatório **removido**,
`firebase-emulator-seed` passou a contar o episódio pelo **histórico** (commit `9154776`) em vez de por
`arquivo:linha`, e `account-settings` teve as afirmações sobre bucket e upload reescritas.

> **Nota de método, terceira rodada consecutiva:** todas essas contradições só apareceram por **medição
> direta** contra o código ou o provedor, nunca por leitura. Documentação que afirma estado deve trazer a
> medição e a data ao lado. `PRE-PRODUCTION.md` e `SECURITY.md` **adotaram** esse formato e é por isso que
> passaram limpo hoje; `PAYMENTS.md` não adotou e é o que segue mentindo.

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

Esta rodada encontrou deriva em **11 das 13 specs** — mais que as 8/14 da anterior, e por um motivo
identificável: a PR #11 **deslocou linhas no meio de arquivos antigos** em vez de só criar novos
(`packages/auth/server.ts` +14, `apps/app/proxy.ts` +4, `docs/SETUP.md` +6, `CLAUDE.md` +7,
`apps/api/proxy.ts` +5). **Nenhuma deriva é de implementação divergente**: o corte de `file-upload-storage`
foi entregue como especificado, e as 13 specs restantes descrevem corretamente o que falta.

**As 3 derivas de substância** (inversões semânticas — a spec acusa de errado um documento já corrigido)
estão descritas na seção anterior e **já foram corrigidas no disco**. Além delas, estas afirmações de
inventário morreram e foram atualizadas:

| id | o que a spec afirmava | realidade | ação |
|----|----------------------|-----------|------|
| [`account-settings`](account-settings.md) | não há wrapper RHF "de upload"; `firebase.json` só configura Firestore; o avatar "arrasta bucket e custo **que o repo hoje não tem**" | `image-upload-input.tsx` + `hookformImageUpload.tsx` existem (8.º `HookForm*`); `firebase.json:6-8` tem bloco `storage`; `storage.rules` na raiz; a env nos 3 pontos | ✅ reescrita: o avatar passou de *esperar* por `file-upload-storage` a **consumir** peças prontas; `depends_on` → `[]` |
| [`billing-subscription`](billing-subscription.md) | o SDK registra **4** actions (`client/index.ts:11-14`); a API tem **10** rotas | são **5** (`:12-16`, com `file` em `:16`) e **15** rotas | ✅ corrigida. "Nenhuma sob `payments/`" **segue verdadeira** |
| [`dashboard-home`](dashboard-home.md) | `shared/hooks/` tem exatamente **3** hooks; a API tem **10** rotas | são **5** hooks (`useFileUpload.ts` novo) e **15** rotas | ✅ corrigida — o piso do argumento subiu |
| [`e2e-testing`](e2e-testing.md) | **573 testes em 63 arquivos** | **750 em 74** (medido hoje) | ✅ corrigida, incl. o recorte por workspace. O que **não** mudou: 9 tasks, 9 configs, 0 `testTimeout`, 0 Playwright/Cypress/axe |
| [`data-rights-lgpd`](data-rights-lgpd.md) | o acoplamento com `file-upload-storage` é **futuro** | o futuro chegou: `entity.photo` guarda referência de bucket e `deleteObjectQuietly` tem **1** call site | ✅ reescrita de hipotético para real |
| [`teams-organizations`](teams-organizations.md) | o predicado de posse está copiado em **três** lugares | **quatro** — a #11 acrescentou posse codificada no **prefixo do caminho no bucket** (`storage.ts`, `isOwnedBy`) + `storage.rules` | ✅ corrigida. **O custo do retrofit subiu** — reforça o argumento da spec |
| [`observability-logging`](observability-logging.md) | inventário de 5 pontos de log | **7** — a #11 acrescentou `storage.ts:74` (conforme) e `entity-photo.ts:61` (semiconforme) | ✅ corrigida, com o placar honesto **4/2/1** |
| [`audit-log`](audit-log.md) · [`cookie-consent`](cookie-consent.md) | — | **0 referências quebradas** nas duas (20/20 e 12/12 exatas). `cookie-consent` é a única que a #11 não tocou em nada | ✅ remedidas, sem correção necessária |

As demais (`onboarding-flow` 8 refs, `account-security-mfa` 4, `firebase-emulator-seed` 7,
`cursor-pagination` 3) são deriva **de referência** — o argumento sobrevive, o endereço não. Todas
corrigidas nos arquivos.

**Nenhuma regressão detectada** nas capacidades das 6 specs arquivadas.

**Uma correção de medição, registrada para não voltar:** o `deleteObjectQuietly` aparece 16× num `grep`
ingênuo. **Um** é a definição (`storage.ts:70`), **um** é o call site de produção
(`entities/[id]/route.ts:90`) e os **14** restantes são mocks e asserções de teste. É **1** call site, não
16 — e é exatamente esse número que sustenta o achado dos objetos órfãos.

## A decisão que não pode esperar a fila

`teams-organizations` é a única spec cuja **decisão** custa mais que a implementação: retrofitar escopo por
organização é **reescrita, não refactor** (6/10 de prevalência, esforço G).

**Decidido em 2026-08-22:** `deferred` — adiar a implementação, **não** a decisão. O que torna o adiamento
honesto são duas contrapartidas de esforço P que **não dependem desta spec** e valem como tarefa direta no
`/analyze`:

1. escrever em `docs/ARCHITECTURE.md` se este core é **B2B ou B2C por padrão** — remedido hoje,
   `grep -ciE "b2b|b2c|organiza" docs/ARCHITECTURE.md` retorna **0**;
2. concentrar o predicado de posse num ponto único de escopo — remedido hoje: o predicado
   `row.userId !== ctx.subjectProfile.id` segue copiado **3 vezes** no mesmo arquivo
   (`apps/api/app/(routes)/entities/[id]/route.ts:24,40,102`) e agora há um **quarto** lugar onde a mesma
   ideia foi codificada de outro jeito — o prefixo do caminho no bucket (`storage.ts:35`, `isOwnedBy`),
   espelhado em `storage.rules`.

**Nenhuma das duas foi feita até 2026-09-14** — os juros correm há **vinte e três dias**, e nesta rodada
**subiram**: eram 3 lugares para retrofitar, agora são 4, e o quarto mora numa camada diferente (caminho de
objeto + regra de bucket), onde o retrofit não é um `find & replace`. O `depends_on` desta spec segue
satisfeito, o que não muda o `deferred` mas remove o último argumento técnico para adiar de novo.

## Achados da varredura que não viraram spec

Defeitos e inconsistências encontrados na descoberta e nos pipelines. **Não são funcionalidades** — são
correções pontuais, algumas de minutos. Viram tarefa direta no `/analyze`, sem passar por spec.

> **Auditoria de 2026-09-14.** Os achados da rodada anterior foram reconferidos **um a um** no código.
> **Placar: 2 corrigidos integralmente pela PR #11 · 1 parcialmente · o restante segue · 5 novos.**
> Padrão que se repete pela terceira rodada: **a PR #11 não tocou nenhum `package.json`**, então toda a
> família de dependências não declaradas e exports quebrados segue **intacta**.
>
> ⚠️ **Atenção a uma armadilha desta rodada:** os artefatos de `review` e `test` da #11 registram como
> "não corrigidos, fora de escopo" **dois achados que a própria PR corrigiu depois**. Aqueles documentos
> foram escritos antes dos commits de correção. Este backlog reflete o **código mergeado**, não eles.

### ✅ Corrigidos pela PR #11

| achado | onde | evidência |
|--------|------|-----------|
| ✅ **`photo` aceitava qualquer texto — validação de URL só existia no navegador.** Era violação direta da regra de ouro 4 | `apps/api/(shared)/validation/entity.schema.ts:19-30` | `photoReferenceSchema` agora tem `.refine()` que aceita **só** caminho de objeto do bucket ou URL com protocolo `http:`/`https:` — o que também fecha `javascript:alert(1)`, que `URL.canParse` deixava passar. Aplicado nos **dois** schemas (create `:49`, update `:60`) |
| ✅ **Rótulo de campo inválido não ficava vermelho no tema escuro**, em 4 componentes | `packages/design-system/components/ui/label.tsx:20-22` | O estado migrou para uma prop `invalid` que **não emite classe cinza nenhuma** — antes, `dark:text-gray-400` na base vencia o `text-destructive` que os chamadores passavam por `className`. Commit `fix(design-system): keep invalid field labels red in dark mode`. **Brinde**: o `error` do `Input` **nunca era desestruturado** (`input.tsx:12`) e vazava para o `<input>` como atributo desconhecido, sem nunca chegar ao label |

> 🟡 **Ressalva honesta sobre a segunda correção, não verificada visualmente por esta auditoria:** no tema
> escuro, `--destructive` vale `oklch(0.396 0.141 25.723)` (`globals.css:63`) — um vermelho **escuro**,
> sobre fundo escuro. O rótulo deixou de ser cinza, que era o defeito relatado; se o contraste resultante
> passa em WCAG AA é **outra pergunta**, e ela não foi medida. Existe um `--destructive-foreground` mais
> claro (`:64`) que talvez fosse a escolha certa para texto. Vale um olho na próxima tarefa de UI.

### ◐ Parcialmente corrigidos

| achado | onde | situação |
|--------|------|----------|
| ◐ **`.env.example` da API promete um desligamento que o código não entrega** — e o comentário **se contradiz dentro de si mesmo**. `:15-16` diz que sem a variável "the upload capability stays switched off"; `:18`, duas linhas abaixo, diz "Falls back to `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` when empty" | `apps/api/.env.example:15-18` · `apps/api/env.ts:40-43` | O fallback é real e deliberado (foi ele que resolveu o `skipValidation` matando a env em dev). O problema é que **as duas frases não podem ser verdadeiras ao mesmo tempo**: quem esvaziar `FIREBASE_STORAGE_BUCKET` achando que desliga a feature **não desliga**, se a pública estiver preenchida — que é o estado local de hoje. Correção de **uma frase**: dizer que desligar exige esvaziar **as duas** |

### 🆕 Novos nesta rodada

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **NOVO — trocar a foto apaga um objeto que outro registro ainda referencia.** Não há contagem de referência: `deleteObjectQuietly` tem **um** call site e **não consulta** outros registros antes de apagar | `apps/api/(shared)/lib/storage.ts:70` · `apps/api/app/(routes)/entities/[id]/route.ts:90` | **Limitação conhecida e aceita conscientemente** pelo `/review` da #11, com repro documentado: a UI não alcança o estado (não há como apontar dois registros ao mesmo objeto pela tela), o dano é miniatura quebrada, e a correção custaria consultar todos os registros a cada troca. O `/test` fez uma sonda executável e **a descartou de propósito** — um teste verde afirmando o comportamento errado viraria contrato. **Fica registrado como dívida, não como bug a corrigir agora.** Vira problema real quando `account-settings` (#1) permitir reusar o mesmo avatar |
| 🟡 **NOVO — apagar um registro deixa o objeto órfão no bucket.** O `DELETE` de `entities/[id]` chama `entityRepository.delete(id)` e **não toca no storage** | `apps/api/app/(routes)/entities/[id]/route.ts:97-112` | Simétrico ao anterior e mais fácil de alcançar: qualquer usuário que suba uma foto e apague o registro deixa o arquivo pago no bucket do fork. Agrava que o `delete` herdado é **soft delete** — o documento nem some, então nem uma varredura por "objetos sem dono" acharia. **Pertence ao corte de [`data-rights-lgpd`](data-rights-lgpd.md)**, que agora tem um motivo concreto a mais |
| 🔴 **NOVO — o gate instável tem um segundo arquivo, e ele é o pior.** Existem **dois** `securityPolicySources.test.ts` e a documentação só conhece o da `apps/app` | `apps/web/__tests__/securityPolicySources.test.ts` · `apps/app/__tests__/securityPolicySources.test.ts` · `docs/PRE-PRODUCTION.md:190-193` | Medido hoje: o da `apps/web` faz **387–590 ms isolado** e **3089 ms sob contenção** — e **4033 ms** numa segunda execução do gate no mesmo dia, **81% do default de 5 s**. O da `apps/app` faz 2434 ms (o doc registra 2203 ms). **Nenhuma das 9 configs declara `testTimeout`** (remedido: `grep` = 0). É pré-requisito formal do branch protection (`PRE-PRODUCTION.md:190-193`), e o documento **subdimensiona o risco e nomeia o arquivo errado**. Correção barata: declarar `testTimeout` nas 9 configs **antes** de ligar o gate obrigatório |
| 🟡 **NOVO — `POST /files` é escrita sensível sem trilha de auditoria.** Grava no bucket do fork e é cobrada como storage e egress | `apps/api/app/(routes)/files/route.ts` · `apps/api/proxy.ts:45` | O próprio repo **já a reconhece** como sensível ao pô-la em `RATE_LIMITED_PATHS` — mas rate limit protege de volume, não responde "quem subiu o quê". Entra no inventário de [`audit-log`](audit-log.md) (#6) |
| 🟡 **NOVO — a convenção de log se degrada na borda.** `entity-photo.ts:61` faz `console.warn("[storage] could not sign a read url for an entity photo")`: prefixo certo, mas **mensagem livre, sem `chave=valor`** e sem o identificador do registro | `apps/api/(shared)/lib/entity-photo.ts:61` | Achado por contagem, não por leitura: o inventário de logs passou de 5 para **7** pontos, e o placar honesto é **4 conformes · 2 semiconformes · 1 não-conforme**. Na mesma PR, `storage.ts:74` **segue** a convenção corretamente. A leitura que isso permite é melhor que a anterior: a convenção **se propaga** sem helper, mas **falha no caminho de erro** — e um log de falha de assinatura que não diz **qual** registro falhou é inútil para depurar. Argumento de [`observability-logging`](observability-logging.md) (#2) |

### 🔴 Segurança — seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **Revogar sessão não derruba o ID token — e a #10 pôs esse furo no caminho de "minha conta foi comprometida".** `verifyIdToken(token)` é chamado **sem** o argumento de revogação, e `resolve-api-actor.ts` tenta o bearer **antes** do cookie | `packages/auth/server.ts:137` · `apps/api/(shared)/lib/resolve-api-actor.ts:23-34` | A vítima troca a senha (`auth/password/reset/route.ts:49` chama `revokeUserSessions`) e **o ID token do atacante continua passando no guard da API por até uma hora**. É o item 1 do corte de `account-security-mfa`, e **não depende de `account-settings`**: pode ser tarefa direta hoje. ⚠️ **As referências mudaram de linha nesta rodada** (`:123`→`:137`, `:193-196`→`:207-210`) e a antiga caiu sobre um comentário que fala de `checkRevoked` — conferência superficial dá falso "corrigido" |
| 🔴 **`packages/payments/ai.ts:4-5`** tem o defeito gêmeo do que já foi corrigido no `index.ts`: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY \|\| "" })` em **escopo de módulo** | `packages/payments/ai.ts:4-5` | Não explode hoje **só porque nada importa `@repo/payments/ai`** — explodiria no primeiro fork que importasse, e `billing-subscription` (#7) é justamente o que faria alguém importar. Agrava: `packages/payments/package.json` não tem `exports`, então o subpath resolve por caminho de arquivo |
| 🔴 **`packages/security/index.ts:11` tem o mesmo defeito de escopo de módulo, num lugar muito pior.** `const arcjetKey = keys().ARCJET_KEY;` roda no **import**, e `@repo/security` é o **primeiro import do `apps/api/proxy.ts`** — o middleware, que roda em toda requisição | `packages/security/index.ts:11` · `packages/security/keys.ts:9-15` | `keys.ts` trata `""` como ausente, o que cobre o `.env.example`; mas exige `.startsWith("ajkey_")`, então uma `ARCJET_KEY` **presente e malformada** lança **dentro do grafo de módulos do middleware**: toda requisição falha, sem sinal no boot — e `instrumentation.ts:23-27`, que só checa presença, **não avisaria** |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo.** `register()` lança e **não há `process.exit` em nenhum lugar do arquivo** | `apps/api/instrumentation.ts:17-21` | Uma plataforma que só verifica se a porta responde veria o container **saudável** enquanto ele responde 500 a tudo. **Documentado** em `docs/PRE-PRODUCTION.md:97-99`, não corrigido |

### 🟡 Dependências, exports e código morto — **intactos** (a #11 não tocou nenhum `package.json`)

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 `apps/app/app/layout.tsx:3` importa `@repo/analytics` **sem** `apps/app/package.json` declarar a dependência — funciona por hoisting do pnpm. Falta também `@repo/email` | `apps/app/package.json:13-38` | Além do risco de resolução, **o turbo não invalida `app#*` quando `@repo/analytics` muda** — cache mentindo num gate que roda em toda PR |
| 🟡 `apps/app/env.ts:1` importa `@repo/email/keys` sem declarar `@repo/email` — mesma classe, consequência maior | `apps/app/env.ts:1` | O `keys.ts` do pacote **valida de fato no boot** dos 3 apps. `apps/web` e `apps/api` **declaram**; só a `app` não |
| 🟡 `packages/auth/package.json:12` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth/package.json:12` | Zero importadores, falha em silêncio hoje; o primeiro `import` quebra na resolução. **Oitava auditoria consecutiva** |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` dos três apps | `packages/auth/package.json:24` | Um pacote de **autenticação** — dono de middleware, cookie de sessão e código adjacente ao proxy — resolvendo uma major diferente do runtime que o consome |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | `@repo/email` e subpaths resolvem **só** pelo alias TS. Funciona hoje; quebra em qualquer consumidor que resolva por Node |
| 🟡 **`reloadCurrentUser` segue sem um único teste no pacote**, pelo **segundo** ciclo | `packages/auth/client.ts:191-202` | A suíte do `@repo/auth` continua em **2 arquivos / 29 testes**, idêntica a duas rodadas atrás. É exercitada só por **mock**, de outro workspace. Um refresh forçado de token é código de autenticação |
| 🟡 `chart.tsx` é código morto — `recharts` pesa no bundle sem uso | `packages/design-system/components/ui/chart.tsx` | `dashboard-home` (#9) é a spec que o resgataria |
| 🟡 **`input-otp.tsx` é código morto**, sem nenhum consumidor | `packages/design-system/components/ui/input-otp.tsx` | `account-security-mfa` (#12) é a spec que o usaria |
| 🟡 **Dependências de instrumentação instaladas e nunca importadas:** `import-in-the-middle`, `require-in-the-middle` | `apps/app/package.json:26,35` | São as dependências típicas de OTel/Sentry e dão **zero** importações. Hoje é peso morto — e **não** contam como evidência de observabilidade |
| 🟡 **`packages/internationalization/utils/cookies.ts` é inalcançável.** O `package.json` mapeia `"./utils" → "./utils.ts"` (o **arquivo**), então o diretório homônimo nunca é resolvido | `packages/internationalization/utils/cookies.ts` | Os ~33 importadores resolvem todos para o arquivo; o `cookies.ts` do diretório é **código morto** |
| 🟡 **`emailBrand.supportEmail` é configuração morta** — uma ocorrência, a própria definição | `packages/email/brand.ts:9` | Um fork vai editá-lo achando que muda alguma coisa |
| 🟡 **`isRateLimitEnforced()` é export morto** | `packages/security/index.ts:32` | O papel que cumpriria acabou coberto pelo aviso de boot, que lê `process.env.ARCJET_KEY` direto. Duas fontes de verdade, e a que tem nome não é a usada |
| 🟡 **`FormattedError.retryAfterSeconds` não tem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:13,20` | A cadeia inteira para levar a espera até a tela está pronta e **para no último metro**: o toast diz "aguarde um instante", sem o número que o servidor mandou. ⚠️ Cuidado com falso positivo ao remedir: há um `retryAfterSeconds` **homônimo de outro tipo** no rate limiter |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`update()` do `BaseRepository` reescreve o documento inteiro e corrompe o tipo de `createdAt`** | `apps/api/(shared)/repositories/base.repository.ts:102-117` | Depois do primeiro `PUT` o campo deixa de ser `Timestamp` e vira `String`: consulta por range/`orderBy` mistura tipos. **Cruza diretamente com `cursor-pagination` (#5)**. ⚠️ Preservado de propósito em `firestore-admin-access` (migração *contract-preserving*) |
| 🟡 `delete()` herdado por todo repositório é **soft delete** | `apps/api/(shared)/repositories/base.repository.ts:127-129` | O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. Bloqueia o item 3 de `data-rights-lgpd` — e agora também deixa objetos órfãos no bucket |
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:32,52-63` | Declara `Promise<UserDTO[]>` mas devolve o merge com o Firebase Auth. O N+1 do Admin SDK está em `:38-40` |
| 🟡 **`/auth/sign-in` e `/auth/sign-up` da api não têm consumidor e não seguem o contrato `{ error: { code } }`** — devolvem string crua; a primeira responde **500** para credencial inválida porque **não há `try/catch`** | `apps/api/app/(routes)/auth/sign-in/route.ts` · `sign-up/route.ts` | Viola a regra de ouro 3. **Reconferido: seguem órfãs.** Com `/files`, são **8 rotas limitadas, 2 das quais ninguém chama e respondem errado**. A decisão certa provavelmente é removê-las |
| 🟡 **Webhook da Stripe é casca**, e `:63` devolve `{ result: event }` — **ecoando o objeto Stripe inteiro na resposta HTTP** | `apps/api/app/(routes)/webhooks/payments/route.ts` | A assinatura **é** validada; nada é persistido, e não há dedupe por `event.id`. Escopo de `billing-subscription` |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento.** `skipValidation` descarta as chaves vindas de `extends`, e `env.STRIPE_WEBHOOK_SECRET` é `undefined` em `next dev` | `apps/api/env.ts:9,47` | `pnpm --filter api dev:with-stripe` **não pode funcionar**. A #11 mostrou o contorno ao redeclarar `FIREBASE_STORAGE_BUCKET` (`:26`) pelo mesmo motivo — mas **a causa raiz segue** |
| ◐ **`skipValidation` faz o t3-env descartar os `extends` — contornado 2× na `apps/api`, ainda aberto na `apps/web`** | `apps/web/env.ts:22,13-16` · `apps/api/env.ts:47` | Na `apps/web`, `skipValidation: true` é **incondicional** e `NEXT_PUBLIC_APP_URL` **não** está no bloco `client`, então o CTA "Ir para o painel" da landing cai no fallback. Pior que o bug: o bloco `client` tem **forma** de validação e não valida nada. **A #11 contornou o sintoma pela segunda vez em vez de tratar a causa** — é um padrão agora, não um acidente |
| 🟡 **Casamento exato de rota no rate limit deixa variações de fora** | `apps/api/proxy.ts:37-47` | Decisão consciente (`startsWith` limitaria `/auth/sign-in/google` duas vezes). **A lista cresceu de 7 para 8** com `/files`. A justificativa se sustenta; o custo de manutenção sobe a cada rota |
| ◐ **O bounce do proxy apaga a query string — corrigido só para as duas rotas de `oobCode`** | `apps/app/proxy.ts:175,186` | A isenção é **por path**, não por parâmetro: **qualquer outra query em rota pública continua sendo apagada** — `?redirect=`, UTM de campanha, `?plan=`. O próximo fluxo que carregar estado na URL redescobre o mesmo defeito |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta.** O cliente grava com TTL, mas na requisição seguinte os proxies fazem `cookieStore.set` **sem `maxAge`/`expires`** | `apps/app/proxy.ts` · `apps/web/proxy.ts:92,96` | O idioma escolhido **não sobrevive ao fechamento do navegador**. Bug de produto silencioso: ninguém reclama, todo mundo reescolhe o idioma |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`**; `isSameOriginRequest` **retorna `true` quando não há header `Origin`** | `packages/shared/utils/helpers/cookies.ts:13` · `packages/auth/session.ts:66-77` | ASVS 5.0 L1 (3.3.1) exige `Secure`. O helper hoje só grava `x-locale`, **não** o cookie de sessão. `api-hardening` adotou a mesma decisão na borda, mas com o porquê escrito e um limite explícito |
| ⚪ **`cors.ts` allow-lista um header que nenhum código do repo envia:** `x-locale` existe **só como cookie** | `apps/api/(shared)/lib/cors.ts:16` | Resíduo. **`x-role` NÃO é resíduo** e não deve ser removido junto |
| 🟡 **O papel do painel viaja em dois headers ao mesmo tempo** — o SDK escreve `REQUEST_ROLE` **e** um `x-role` cru, e lê de volta o cru; a API o usa como fallback | `packages/sdk/src/client/base.ts:45,53,95` · `auth-request-context.ts:100,119` | Dois nomes vivos para o mesmo fato, com o "legacy" sendo **escrito e lido de volta** em toda requisição autenticada — não é resíduo histórico, é duplicação ativa |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`"Pick a date"` literal no `DateInput`** — string de UI fora do dicionário, como valor **padrão** de prop | `packages/design-system/components/ui/date-input.tsx:50` | **Sobreviveu à #11**, que corrigiu o vizinho (o label em dark) e deixou este. Viola a regra de ouro 2 e aparece para todo fork que não passar `placeholder` — em qualquer idioma |
| 🟡 **Strings de UI soltas, fora do dicionário** — `"Switch language"` (`sr-only`), `"Início"`, `"Sair"`, os 8 títulos de `routes.tsx` | `LanguageSwitcher.tsx:79` · `PageBreadcrumb.tsx:28,30` · `ProfileDropdown.tsx:51` · `(common)/routes.tsx:43,47,51,55,66,70,74,78` | Agrava no `sr-only`: é **exatamente** o texto que só o leitor de tela recebe. Os 8 títulos convivem com 8 `url: "#"` — é o mesmo bloco de menu inacabado, e é o que `account-settings` (#1) vai preencher |
| 🟡 String `"Home"` literal nas duas home pages — **e a chave já existe e é usada em 8 outras telas** | `(common)/(pages)/page.tsx:7` · `(admin)/admin/(pages)/page.tsx:7` | Viola a regra de ouro 2 com a tradução pronta ao lado |
| 🟡 **`apps/app/next.config.ts:19` lista `www.google.com` em `images.domains`** sem uso e sem `remotePattern` correspondente; `domains` está **deprecado** no Next 16 | `apps/app/next.config.ts:19` | **A divergência cresceu nesta rodada:** `remotePatterns` agora tem **2** hosts (`lh3.googleusercontent.com`, `storage.googleapis.com`) e `domains` segue com um host que não está em nenhum dos dois lugares. Duas allowlists de imagem que discordam, e a sobrando é a que some quando a chave deprecada for removida |
| ⚪ **Um `useList*` que falha renderiza o estado vazio, não erro.** Um 429 na lista de entidades mostra "Nenhuma entidade cadastrada" | `…/entities/(hooks)/useListEntities.tsx:16` · `…/(home)/EntitiesListClient.tsx:23-28` | O hook **devolve** `error`; o componente nunca o lê. Lista que falhou fica indistinguível de lista vazia, e o usuário conclui que apagaram os dados dele. Vale para todo `useList*` no mesmo padrão |
| 🟡 **`setTimeout` sem cleanup** no `useEffect` do carrossel | `apps/web/…/(home)/components/cases-client.tsx:24-38` | Um timer é agendado a cada avanço e nenhum é cancelado na desmontagem. É a home da landing: o caminho mais percorrido do repo |
| 🟡 **`hydration mismatch` num `id` do Radix + "Select is changing from uncontrolled to controlled"** — dois mecanismos independentes | `PanelNavbarControls.tsx:29,243-245,278` · `Sidebar.tsx:99-157` | O `Collapsible` é montado pelos **dois** painéis, então o aviso aparece em **toda carga do painel** |
| ⚪ **A landing `/contact` acusa erros de hidratação** (`<a>` dentro de `<a>`) vindos do `NavigationMenu` | `apps/web/…/components/header/index.tsx:82-88` | Pré-existente, **só** no ramo `item.href`; os subitens estão corretos |
| 🟡 **`useHealthCheck` foge do padrão de hooks de dados do escopo** — `getApplicationHealthCheck` **não é exportado** | `apps/app/shared/hooks/useHealthCheck.ts:11,19` | O `apps/app/CLAUDE.md` exige que o hook exporte também a função imperativa no mesmo arquivo |
| 🟡 **`provider-error` não distingue três falhas diferentes** — cota estourada, domínio não verificado e chave revogada produzem o **mesmo** `reason` | `packages/email/index.ts:121-129` | Descartar o objeto de erro é **correto e deliberado** (carrega o endereço do destinatário, e há teste que reprova quem o logar). Mas ninguém distingue "acabou a cota" de "revogaram a chave" sem abrir o painel. **Pertence a [`observability-logging`](observability-logging.md)** (#2) |
| ◐ **`welcomeEmail` segue sem nenhum chamador de produção**, e o formulário de contato da landing continua maquete | `packages/email/templates/welcome.tsx` · `apps/web/…/contact/components/contact-form-client.tsx` | `actionLinkEmail` ganhou dois chamadores reais na #10; este não. O form de contato continua sem `<form>`, com botão sem `type="submit"` e campos que não casam com os parâmetros da action **que já existe e tem teste** |
| 🟡 **`turbo run` aborta na primeira falha** (`--continue=false` é o default) | `.github/workflows/ci.yml:39` | Comportamento correto, mas quem ler o log da PR verá tasks "não rodadas" e pode se confundir |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md),
> que um fork herda por escrito. Elas continuam **não resolvidas**, mas não dependem mais deste arquivo
> para existir. **Reconferido em 2026-09-14: o documento está honesto** — as afirmações que ele faz batem
> com o código, exceto a do gate instável (ver Contradições).

| # | pendência | onde vive | custo |
|---|-----------|-----------|-------|
| 1 | **Cloud Storage não está ativado** no projeto de referência — remedido hoje: `firebasestorage…/o` ⇒ **404**. É o que deixa **6 critérios de aceite da #11 como "não verificados"** (preview da imagem enviada, impersonação na tela, 403 sem assinatura, expiração da URL, remoção do objeto anterior contra bucket real, miniatura assinada). Exige plano **Blaze**, ou seja, cartão | `PRE-PRODUCTION.md:101-167` ✅ **documentado com runbook completo** | cartão + ~15 min |
| 2 | **`main` não tem branch protection.** `gh api …/branches/main/protection` → **404**, rulesets → `[]`. **Pré-requisito: declarar `testTimeout` nas 9 configs** — e o documento **subdimensiona** esse pré-requisito (ver Achados) | `PRE-PRODUCTION.md:183-193` | minutos |
| 3 | **O envio real de e-mail nunca foi provado.** Toda a validação da recuperação de senha foi feita com preview local e placeholder. Exige domínio com SPF/DKIM — passo de DNS, sem contorno | `PRE-PRODUCTION.md:70-81` | DNS + ~10 min |
| 4 | **Na `apps/web` a CSP é Report-Only**, não bloqueante. Decisão deliberada, política rodou com zero violações: virar a chave é barato | `PRE-PRODUCTION.md:195-201` | P |
| 5 | **Contas de QA acumuladas** no projeto Firebase de dev — as 8 conhecidas mais as **2 novas** da #11 (`qa-test-upload@` e `qa-test-upload-b@`). Sem PII real e sem senha em arquivo | `PRE-PRODUCTION.md:207-211` | P |
| 6 | **Branches mergeadas ainda vivas no remoto.** As PRs são mergeadas por squash e as branches ficam | `PRE-PRODUCTION.md:212` | P |
| 7 | **O login com Google nunca teve passe manual com conta real.** ⚠️ **A única que continua existindo só aqui.** O `/test` provou o mecanismo do COOP via `postMessage`, não o fluxo ponta a ponta. Modo de falha silencioso: o popup fecha e nada acontece | *(só neste arquivo)* | ~2 min |

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo — é isso que impede o backlog de
inchar a cada rodada. **Nenhuma ganhou argumento novo nesta rodada.**

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| Notificações in-app + preferências | 3/10 | Esforço G se feito à mão (feed, badge, fan-out, digest); a referência do ecossistema terceiriza num serviço pago com chave obrigatória. Reavaliar quando houver um caso de fan-out real. |
| Command palette (⌘K) | 2/10 | Aparece em templates de dashboard, não em kits de SaaS. Barato, mas valor estético — não é diferencial de MVP. |
| Metering / limites de uso / créditos | 2/10 | Muito hype por causa de AI SaaS, mas é DIY sobre a Meters API em quase todo kit. Só faz sentido depois de `billing-subscription`. |
| Feature flags | 2/10 | Dá para viver com variável de ambiente num MVP; flag sem data de remoção vira dívida permanente. Reavaliar após `observability-logging`. |
| Firebase App Check | — | Explicitamente fora do corte de `api-hardening`: atesta o cliente, mas exige configuração de projeto Firebase por fork. Reavaliar se aparecer abuso que o rate limit por IP não contenha. |
| Waitlist / captura de lead | 2/10 | Alto valor **só** na fase pré-lançamento — é decisão do fork, não do core. |
| **Consertar o formulário de contato da landing** | — | ⚠️ **Não é spec, é achado.** O formulário é maquete e a action que ele deveria chamar já existe, funciona e tem teste. Correção pontual de esforço P — vai direto ao `/analyze`. |
| Provedor de e-mail plugável (SES/Postmark) | — | Fora do corte de `transactional-emails`: "só quando algum fork pedir". A spec está arquivada, então reabrir exige spec nova. |
| Rastreio de abertura/clique em e-mail | — | Fora do corte de `transactional-emails`: arrasta discussão de privacidade sem valor para um MVP. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | ⚠️ **Novo aqui:** explicitamente fora do corte de `file-upload-storage`, agora **arquivada**. Reabrir exige spec nova. O `POST /files` ficou genérico de propósito — estender para múltiplos arquivos é acréscimo, não reescrita. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto **é** uma API. Webhook de saída bem-feito (HMAC, retry com backoff, DLQ) é esforço G. |
| Sessões e dispositivos gerenciáveis | 1/10 | Absorvido pelo corte de `account-security-mfa`. |
| Widget de feedback | 1/10 | Terceirizar é mais racional que manter no core. |
| Referral / afiliados | 0/10 | Nenhuma referência do painel entrega. O mercado resolve com produto de terceiro. |
| SSO enterprise · SCIM | 0/10 | Território de provedor especializado. Só entra com o primeiro contrato enterprise — e aí não é mais boilerplate. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | Estavam no "fora do corte" de `ci-pipeline` porque dependiam de um CI verde e estável. O CI está em `main` e verde em **15** execuções — mas a causa estrutural do gate instável **piorou de leitura** nesta rodada (dois arquivos, 81% do teto medido), e segue como pré-requisito formal do branch protection. **Argumento a favor de Renovate segue de pé:** as três actions do `ci.yml` miravam Node 20 e **nenhuma validação local pegou**. |
| Remote Cache do Turbo | prática 1 | É a única peça que arrasta conta e env, e o ganho só aparece com o CI estável. Entra quando doer, com medição — e como opt-in por variável ausente, no padrão do `ARCJET_KEY`. |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das **9** configs de Vitest declara cobertura: não há número para discutir. Medir primeiro, gatear depois, e só em pastas críticas. Relatório por workspace **não soma** — exige consolidação na raiz. Cruza com `e2e-testing`. |
| Changesets / versionamento | opcional-forte | Com pacotes `private: true` e forks que divergem, o valor seria só o changelog. Não paga o processo agora. |
| Storybook | não apareceu no painel | O `playground` já serve de catálogo vivo dos componentes. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork, não do core. |
