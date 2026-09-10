# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-09 (`/spec --sync`, 2ª rodada do dia, pós-entrega de
> `transactional-emails`) · anteriores: 2026-09-09 (1ª) · 2026-09-02 · 2026-09-01 (3 rodadas) ·
> 2026-08-31 · **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`transactional-emails` teve os 6 itens do corte confirmados no código — e mesmo assim
>    NÃO foi arquivada.** Os 13 commits estão pushados em `email/feat/transactional-emails`, **sem PR** e
>    **ausentes de `origin/main`**. O precedente de `api-hardening` (2026-09-02) foi mantido e reforçado.
>    Argumento completo em [A decisão desta rodada](#a-decisão-desta-rodada-transactional-emails-fica-in-progress).
> 2. **🔴 Descoberto: o arquivamento de `api-hardening` também não chegou em `main`.** O commit `5cda4d5`
>    da auditoria anterior vive **só nesta branch** — em `origin/main`, `specs/api-hardening.md` ainda
>    existe e `docs/features/api-hardening/spec.md` não. Duas auditorias de backlog estão penduradas numa
>    branch não mergeada. Ver [Pendências vivas sem dono](#pendências-vivas-sem-dono) #1.
> 3. **🔴 Achado novo: a suíte tem falha intermitente.** `pnpm turbo run lint typecheck test --force`
>    **falhou** numa de duas execuções desta auditoria (`app#test`, timeout de 5000 ms). Detalhe em
>    [Gates](#gates--medidos-nesta-auditoria) e em [Achados](#achados-da-varredura-que-não-viraram-spec).
> 4. **As 15 outras specs foram remedidas contra o código: nenhuma avançou.** Os `status` do frontmatter
>    estão todos honestos. O que **derivou** foi a **prosa** — 6 specs corrigidas, sendo
>    `auth-recovery-verification` a mais afetada, porque a dependência dela mudou de figura.
> 5. **4 achados novos** vindos da entrega de e-mail, todos já registrados abaixo. Nenhuma spec nova foi
>    criada (exige sua aprovação).

## A decisão desta rodada: `transactional-emails` fica `in-progress`

**Os 6 itens do corte estão implementados.** Reconferidos um a um no código, não no `STATE.md` nem no
`review.md` — a tabela de evidência está na própria spec
([`transactional-emails.md`](transactional-emails.md), seção "Estado da auditoria").

**E mesmo assim ela não foi arquivada.** O `README.md:115` define `done` como "entregue e **confirmada no
código**"; neste repo, "o código" significou `main`. Foi essa a régua aplicada a `api-hardening` em
2026-09-02 — 17 commits pushados, PR aberta, decisão registrada de **manter `in-progress`** — e ela só foi
arquivada hoje, depois do merge de `920ef6c`. Não há motivo novo para afrouxá-la; há três para apertá-la:

| | `api-hardening` (2026-09-02) | `transactional-emails` (agora) |
|---|---|---|
| commits pushados | ✅ 17 | ✅ 13 |
| **PR aberta** | ✅ #8 | ❌ **nenhuma** (`gh pr list --head …` vazio) |
| **validado pelo CI** | ✅ run `34307174985`, verde | ❌ **nunca rodou** |
| mergeado em `main` | ❌ | ❌ |
| **decisão** | `in-progress` | **`in-progress`** |

O terceiro item é o argumento que não existia no precedente: `.github/workflows/ci.yml:3-5` dispara
**apenas** em `pull_request` e em `push` para `main`. Sem PR, `gh run list --branch email/feat/transactional-emails`
volta **vazio** — estes 13 commits nunca foram vistos pela plataforma. A única prova de verde é local, de
uma máquina só, e **uma das minhas duas execuções do gate foi vermelha**.

Há ainda um argumento estrutural, e é o mais desconfortável: **arquivar agora colocaria o arquivamento na
mesma branch não mergeada.** Sabemos que esse risco é real porque ele já se concretizou — o arquivamento
de `api-hardening` está exatamente nessa situação (item 2 do resumo acima).

**O que falta, exatamente, para ela virar `done`:** abrir a PR, o CI passar, mergear em `main`. Nada de
código. A próxima rodada de `--sync` não precisa reabrir esta discussão — só conferir o merge.

## Contadores

Sobre as **16 specs que seguem em `specs/`**. Recontados do disco em 2026-09-09 (2ª rodada), lendo o
frontmatter de cada arquivo.

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

**Transições aplicadas nesta rodada: nenhuma.** É o resultado correto — a única spec candidata a mudar de
status é `transactional-emails`, e a mudança depende de um merge que não aconteceu.

## Gates — medidos nesta auditoria

Re-executados com `--force`, não copiados do `/test` nem da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | **430 arquivos · 0 erros · 0 warnings** (`No fixes applied`) |
| `pnpm turbo run lint typecheck test --force` (1ª execução) | ❌ **FALHOU** — `20 successful, 23 total`, `Failed: app#test` |
| `pnpm turbo run lint typecheck test --force` (2ª execução) | ✅ **23 tasks, 23 successful, 0 cached** |
| `pnpm test` (raiz — é o que gateia o `turbo build`) | ✅ **9 workspaces · 63 arquivos · 573 testes** |

⚠️ **A primeira execução falhou, e isso não é ruído.** `apps/app/__tests__/securityPolicySources.test.ts:92`
estourou o `testTimeout` padrão de 5000 ms. Isolado, o arquivo passou **3 de 3** vezes. A causa é
estrutural e reproduzível sob carga: cada caso chama `vi.resetModules()` e reimporta `@/proxy` inteiro
(`:60-61`), e `apps/app/vitest.config.mts` **não declara `testTimeout`**. O arquivo é **pré-existente em
`main`** (entrou por `920ef6c`, `api-hardening`) — não é regressão desta entrega, mas é o **primeiro gate
instável do repo**, e ele cruza com a pendência #2 abaixo: ligar branch protection com um teste que falha
sozinho bloqueia merges ao acaso.

| workspace | arquivos | testes |
|-----------|---------:|-------:|
| `app` | 23 | 153 |
| `api` | 19 | 152 |
| `@repo/email` | 7 | 131 |
| `@repo/security` | 3 | 31 |
| `@repo/auth` | 2 | 29 |
| `web` | 4 | 27 |
| `@repo/internationalization` | 3 | 27 |
| `@repo/shared` | 1 | 15 |
| `@repo/payments` | 1 | 8 |
| **total** | **63** | **573** |

Eram **421 testes em 8 workspaces** na rodada anterior. A nona task (`@repo/email`) e o crescimento de
`web` (22 → 27) e `internationalization` (11 → 27) vêm todos de `transactional-emails`.

CI em `main`: **8 execuções, todas `success`** (`gh run list`), a última no merge da PR #8. **Nenhuma**
delas cobre os 13 commits desta branch.

## Ordem recomendada

Respeita `depends_on` (medido do frontmatter nesta rodada) e prioriza o que **desbloqueia** e o que **fica
mais caro depois**.

> **Antes de qualquer spec: abrir a PR de `email/feat/transactional-emails` e mergear.** Não é item de
> backlog, é o que destrava tudo abaixo — e o que devolve a `main` duas auditorias de backlog que hoje
> vivem só nesta branch.

| # | id | por que agora |
|---|----|---------------|
| 1 | [`auth-recovery-verification`](auth-recovery-verification.md) | **Subiu de #2: a dependência foi construída.** Commodity de prevalência **10/10** e a única do painel classificada como bloqueador — `sendPasswordResetEmail`, `sendEmailVerification`, `updatePassword`, `confirmPasswordReset` e `oobCode` seguem dando **zero** ocorrências em `apps/` + `packages/`, e `auth/sign-up/route.ts:10-53` cria a conta sem disparar e-mail nenhum. **O escopo encolheu e a spec foi corrigida para dizer isso:** `action-link.tsx:11-12` já é genérico por slug de dicionário, então o trabalho de template são **2 slugs × 3 idiomas**, não dois componentes. ⚠️ **Só pode começar depois do merge** — a base que ela consome não está em `main`. E ela herda um conflito de desenho a resolver no `/analyze` (a base **nunca lança**; "esqueci a senha" falhando em silêncio é perder a conta). |
| 2 | [`file-upload-storage`](file-upload-storage.md) | **A alternativa que não depende do merge.** `depends_on` vazio, e é **co-requisito de `account-settings`** junto com #1 — sem ela a cadeia trava no segundo nível. `firebase.json` continua com 6 linhas e **sem bloco `storage`**; nenhum dos 7 `keys.ts` declara bucket; `packages/design-system/components/form/hookform/` segue com 7 campos e nenhum de arquivo. Se o merge demorar, **esta é a #1 de fato**. |
| 3 | [`firebase-emulator-seed`](firebase-emulator-seed.md) | Quinta auditoria consecutiva com o mesmo veredito: `firebase.json` **sem bloco `emulators`**, `firebase-tools` não é dependência de ninguém, `grep -i emulator` em código/config/CI = **0**. São agora **573 testes rodando a cada PR e nenhum toca o banco ou as rules**. É o **gargalo único** de `e2e-testing`. O único item meio-feito (`apps/api/scripts/create-dev-admin.mjs`) exige credencial real e não tem tratamento de emulador. |
| 4 | [`cookie-consent`](cookie-consent.md) | **A única spec do backlog com violação ativa, não com ausência de recurso:** `packages/analytics/provider.tsx:15` monta o Vercel Analytics **incondicionalmente** e `:16-18` monta o GA checando só a env — zero consentimento, sobre todo o app (`apps/app/app/layout.tsx:39-46`). `grep -i consent` no repo = **0**. `depends_on` vazio. |
| 5 | [`cursor-pagination`](cursor-pagination.md) | Todo fork herda "ler a coleção inteira": `base.repository.ts:36-49` faz `.get()` sem `limit`/`orderBy`/`startAfter`; filtro (`:25`) e ordenação (`:27`) acontecem em memória. Depois de haver dados em produção, a correção quebra contrato do SDK. Cruza com a dívida do `update()` (achados), que precisa de `orderBy` estável em `createdAt`. |
| 6 | [`observability-logging`](observability-logging.md) | **O argumento mudou de "inventar" para "padronizar antes que seja tarde".** Duas entregas convergiram sozinhas no mesmo formato de log (`apps/api/proxy.ts:41-49` e `packages/email/index.ts:39-49`: linha única, prefixo, `chave=valor`, sem PII) — há uma convenção emergente a promover a helper antes que a terceira entrega invente a quarta variação. E já existe o primeiro custo medido de não ter: `index.ts:120-130` colapsa cota, domínio e chave revogada num único `provider-error`. **1 dos 6 itens já entregue por tabela.** |
| 7 | [`audit-log`](audit-log.md) | O painel **já tem impersonação** e nada registra quem entrou na conta de quem — o switch é 100% client-side (`apps/app/shared/stores/panelStore.ts:76-90`). A mutação sob impersonação já foi bloqueada; o **registro** não existe (`grep auditLog` = 0). |
| 8 | [`billing-subscription`](billing-subscription.md) | Monetização é o maior valor bruto do backlog e continua em **0/6**: nenhuma rota sob `payments/`, `UserDTO` sem `subscription`, webhook com dois handlers `// TODO` que o próprio arquivo admite na linha 1. ⚠️ **A doc descreve como pronto o que não existe** (ver achados) — corrigir a doc independe de implementar a spec. **Pré-requisito barato:** o 🔴 de `packages/payments/ai.ts` explode no primeiro fork que importar o pacote, e é esta spec que faria alguém importar. |
| 9 | [`account-settings`](account-settings.md) | 🔒 Bloqueada por #1 e #2. A sidebar tem 4 links de Settings apontando para `#` (`routes.tsx:65-81`) e **todas** as rotas de usuário são `requireAdminApi`: ninguém consegue editar a si mesmo. |
| 10 | [`onboarding-flow`](onboarding-flow.md) | Maior desequilíbrio valor/prevalência do painel (3/10 entregam) e é onde o usuário decide se fica. `grep -i onboarding` = **1 ocorrência, e é um endereço de sandbox do Resend num teste**. |
| 11 | [`dashboard-home`](dashboard-home.md) | As duas homes do painel são 11 linhas e o literal `"Home"` (`(common)/(pages)/page.tsx:7` e `(admin)/admin/(pages)/page.tsx:7`) — e a chave de dicionário **já existe** e não é usada (`translations/apps/app/pages/common/routes/index.ts:3,17,31`). É a primeira tela de todo fork. |
| 12 | [`data-rights-lgpd`](data-rights-lgpd.md) | 🔒 Bloqueada por `account-settings` (2 níveis abaixo). Obrigação legal com prazo; fica mais cara a cada coleção nova. O único `DELETE` é admin-only e é soft delete — o e-mail continua ocupado no Firebase Auth. |
| 13 | [`e2e-testing`](e2e-testing.md) | 🔒 Bloqueada por #3, o único gargalo restante. Zero `playwright`/`cypress`/`axe` no repo. **Argumento novo:** o gate de merge já é instável (ver Gates) — a spec ganhou uma razão que não tinha. |
| 14 | [`account-security-mfa`](account-security-mfa.md) | 🔒 Bloqueada por `account-settings` — **mas o item 1 do corte não deveria estar** (ver [Dependências](#dependências-e-bloqueios)). Prevalência baixa (MFA 3/10, sessões 1/10). |

### O que **não** foi escolhido para #1, e por quê

- **`file-upload-storage`** foi o concorrente mais próximo e perdeu por **uma condição, não por mérito**:
  ela não depende de merge nenhum. Se a PR de `transactional-emails` não for aberta nos próximos dias,
  esta troca deve acontecer — está em #2 justamente para ser fácil de promover.
- **`cookie-consent`** é a única com violação legal **em curso** (tags carregando sem base legal, hoje), e
  ainda assim não foi ao topo: destrava zero specs, e a exposição real de um boilerplate sem usuários é
  baixa. Se o primeiro fork for a público antes de #1 sair, esta ordem se inverte — é a troca a fazer
  conscientemente, não por acidente.
- **`firebase-emulator-seed`** destrava **1** spec (`e2e-testing`, esforço G, valor médio) contra a cadeia
  de `auth-recovery-verification` → `account-settings` → {`account-security-mfa`, `data-rights-lgpd`}. É
  infraestrutura de teste — retorno diferido, valor crescente. Ficou em #3.

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-09 (2ª rodada) |
|------|--------------|------------------------------------|
| [`auth-recovery-verification`](auth-recovery-verification.md) · [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ⚠️ **satisfeita no código, não em `main`** — a base existe (`packages/email/index.ts:88`, templates, ramo i18n) mas vive numa branch não mergeada |
| [`account-settings`](account-settings.md) | `auth-recovery-verification`, `file-upload-storage` | 🔒 bloqueada pelas **duas**; é por isso que `file-upload-storage` está em #2 |
| [`account-security-mfa`](account-security-mfa.md) · [`data-rights-lgpd`](data-rights-lgpd.md) | `account-settings` | 🔒 bloqueadas em cadeia |
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | ✅ `ci-pipeline` entregue · 🔒 `firebase-emulator-seed` — **gargalo único** |
| [`audit-log`](audit-log.md) · [`cursor-pagination`](cursor-pagination.md) · [`firebase-emulator-seed`](firebase-emulator-seed.md) | `firestore-admin-access` | ✅ satisfeita (entregue em 2026-08-31) |
| [`billing-subscription`](billing-subscription.md) · [`cookie-consent`](cookie-consent.md) · [`dashboard-home`](dashboard-home.md) · [`file-upload-storage`](file-upload-storage.md) · [`observability-logging`](observability-logging.md) · [`onboarding-flow`](onboarding-flow.md) · [`transactional-emails`](transactional-emails.md) | — | ✅ sem dependência |

> **O grafo está mais restritivo que a realidade técnica em um ponto.** O item 1 do corte de
> `account-security-mfa` — fechar a janela de revogação (`packages/auth/server.ts:123` chama
> `verifyIdToken` **sem** `checkRevoked`) — **não depende de `account-settings` para nada**: é uma
> correção de guard, não uma tela de conta. Reconferido nesta rodada: a linha continua idêntica. O
> `depends_on` da spec o mantém preso 2 níveis abaixo, quando poderia ser tarefa direta hoje. A própria
> spec já recomenda desacoplá-lo. Ver o 🔴 correspondente em [Achados](#achados-da-varredura-que-não-viraram-spec).

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | 🔒 `account-settings` |
| [`account-settings`](account-settings.md) | Área de conta e preferências do usuário | produto | alto | M | `proposed` | 🔒 `auth-recovery-verification`, `file-upload-storage` |
| [`audit-log`](audit-log.md) | Trilha de auditoria de ações sensíveis | confianca | alto | M | `proposed` | ✅ `firestore-admin-access` |
| [`auth-recovery-verification`](auth-recovery-verification.md) | Recuperação de senha e verificação de e-mail | produto | alto | M | `proposed` | ⚠️ `transactional-emails` (feita, não mergeada) |
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
| [`teams-organizations`](teams-organizations.md) | Organizações, membros e convites | produto | alto | G | `deferred` | ⚠️ `transactional-emails` (feita, não mergeada) |
| [`transactional-emails`](transactional-emails.md) | E-mails transacionais traduzidos | produto | alto | M | **`in-progress`** | — |

## Entregues

Specs concluídas e **arquivadas** junto da feature que as implementou.

| id | entregue em | spec arquivada |
|----|-------------|----------------|
| `firestore-admin-access` | 2026-08-31 | [`docs/features/firestore-admin-access/spec.md`](../docs/features/firestore-admin-access/spec.md) |
| `ci-pipeline` | 2026-09-01 | [`docs/features/ci-pipeline/spec.md`](../docs/features/ci-pipeline/spec.md) — ⚠️ fechada com 1 item do corte em aberto |
| `api-hardening` | 2026-09-09 | [`docs/features/api-hardening/spec.md`](../docs/features/api-hardening/spec.md) — 5/5 do corte entregues; ⚠️ **o arquivamento em si ainda não está em `main`** (pendência #1) |

Reconferido nesta rodada: o frontmatter da spec arquivada de `api-hardening` está coerente (`status: done`,
`feature: api-hardening`) e **não há duplicata** em `specs/`.

As **duas** features concluídas sem spec — `auth-panel-context` e `impersonation-read-only` — não constam
aqui, e é o correto: as duas são anteriores à semeadura do backlog (2026-08-21). Precisão que a rodada
anterior errou: `impersonation-read-only/STATE.md:5` tem `spec: -`, mas
`auth-panel-context/STATE.md` **não tem o campo `spec:` de forma alguma**. Nenhuma spec viva casa com o
escopo das duas, então não é vínculo faltando — mas o campo podia ser preenchido com `-` por consistência.
*(`docs/features/` tem 6 pastas e **3** `spec.md` arquivados.)*

## Pendências vivas sem dono

Itens que **não são código a escrever numa spec** e que somem do radar se não ficarem escritos. Nenhum tem
dono. Specs arquivadas não são reconciliadas por `/spec --sync` futuro — este é o registro.

| # | pendência | origem | custo |
|---|-----------|--------|-------|
| 1 | 🔴 **NOVO — duas auditorias de backlog estão penduradas numa branch não mergeada.** O commit `5cda4d5` (arquivamento de `api-hardening` + reescrita do índice) e todo o trabalho desta rodada vivem **só** em `email/feat/transactional-emails`. Medido: `git branch -r --contains 5cda4d5` devolve **apenas** essa branch, e `git ls-tree origin/main -- specs/` ainda lista **`specs/api-hardening.md`**. Se a branch for abandonada ou rebaseada, os dois arquivamentos evaporam e a próxima auditoria reabre tudo | esta rodada | **abrir a PR** |
| 2 | **`main` não tem branch protection.** O CI **sinaliza e não bloqueia**: uma PR vermelha pode ser mergeada, e a PR #5 foi mergeada sem gate. Reconferido em 2026-09-09 (2ª): `gh api …/branches/main/protection` → **404 `"Branch not protected"`**, `gh api …/rulesets` → **`[]`**. Ligar exigindo o check `verify` resolve **também** o item 2 do corte de [`e2e-testing`](e2e-testing.md). ⚠️ **Mas não ligue antes de resolver o achado do teste instável** — gate obrigatório + teste que falha sozinho = merge bloqueado ao acaso | `ci-pipeline` (arquivada) | minutos |
| 3 | **O login com Google nunca teve passe manual com conta real.** O `/test` provou o mecanismo do COOP via `postMessage`, não o fluxo ponta a ponta. Modo de falha silencioso: o popup fecha e nada acontece, sem mensagem e sem log | `api-hardening` (arquivada) | ~2 min |
| 4 | **O envio real de e-mail nunca foi provado.** Toda a validação de `transactional-emails` foi feita no preview da 3003 e em teste; **nenhuma mensagem saiu de verdade**, porque isso exige domínio com SPF/DKIM — passo manual de DNS, sem contorno. O roteiro M1–M4 está nos critérios de aceite da feature | `transactional-emails` | DNS + ~10 min |
| 5 | **Na `apps/web` a CSP é Report-Only** (`apps/web/proxy.ts:36,68-74`), não bloqueante — o item 1 do corte de `api-hardening` diz "com CSP ativa", então a landing cumpre metade. Foi decisão deliberada da spec, e a política rodou com **zero violações reportadas**: virar a chave é barato | `api-hardening` (arquivada) | P |
| 6 | **Contas de QA acumuladas** no projeto Firebase de dev (`next-boilerplate-576d0`) por cinco pipelines: `qa-admin@`, `qa-common@`, `qa-review-common@`, `qa-ci-admin@`, `qa-review-ci@`, `qa-common-ci@`, `qa-api-hardening@`, `review-api-hardening@` (todas `example.com`). Sem PII real e sem senha em arquivo. Limpar em Authentication + o doc `user` no Firestore | 5 pipelines | P |
| 7 | **Branches mergeadas ainda vivas no remoto:** `api-hardening-flow` (PR #8), `ci/feat/github-actions-pipeline` (#5), `ci/chore/bump-actions-to-node24` (#7), `specs-feature-planner-agent` (#2), `api/fix/impersonation-read-only` (#3), `feat/initial-files`. São **8 branches** no remoto para **1** de trabalho real. As PRs são mergeadas por squash e as branches ficam | higiene | P |

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

Esta rodada encontrou deriva em **6 specs**, toda ela de **prosa desatualizada**, nenhuma de implementação
divergente. Todas corrigidas nos arquivos.

| id | o que a spec afirmava | o que o código mostra | ação |
|----|----------------------|------------------------|------|
| [`auth-recovery-verification`](auth-recovery-verification.md) **(nova, a mais relevante)** | `:64` — "`email` fornece os dois templates"; `:69` — as credenciais são opcionais e "precisa falhar de forma visível, não silenciosa"; `:31` — refs de `packages/auth/client.ts` em `119/127/137/145/155/182` | `action-link.tsx:11-12` já é **genérico por slug de dicionário** ("um fork acrescenta uma ação sem tocar em template"), então faltam **2 slugs × 3 idiomas**, não 2 componentes. A base decidiu o **oposto** de "falhar visível": `index.ts:99-102` devolve `not-configured` e só avisa no log, **nunca lança**. As refs reais são `109/117/127/135/145/172` | **spec corrigida nos 3 pontos.** O conflito "falhar visível × nunca lançar" virou ⚠️ explícito para o `/analyze` decidir, com recomendação (propagar o `reason`, sem mexer na base) |
| [`observability-logging`](observability-logging.md) **(nova)** | `:20-21` — "o que existe são chamadas soltas a `console` … sem identificador"; `:28-31` — o `register()` "só resolve a instância do Firestore"; `:37-40` — inventário de `console` com linhas `:66`/`:72` | Duas entregas convergiram num formato **deliberado** — `apps/api/proxy.ts:41-49` e `packages/email/index.ts:39-49` (linha única, prefixo, `chave=valor`, sem PII), o segundo com teste que reprova quem logar o objeto de erro. O `register()` hoje também derruba o boot sem `CORS_ORIGIN` (`:17-21`) e avisa sobre rate limit (`:23-27`). As linhas do webhook são `:59`/`:65` | **spec corrigida.** O enquadramento mudou de "introduzir log estruturado" para "**promover a convenção que já emergiu**". Acrescentado o primeiro custo medido: `provider-error` indistinguível |
| [`e2e-testing`](e2e-testing.md) **(3ª correção do mesmo parágrafo)** | `:35-38` — "8 tasks de teste / 421 testes", medido na rodada anterior | **9 tasks / 573 testes em 63 arquivos** — `transactional-emails` acrescentou a nona config (`@repo/email`, 131 testes) | **texto corrigido** com números medidos por mim. Acrescentado o **argumento novo** do gate instável. **O argumento da spec não muda** — a lacuna nunca foi o número de testes unitários |
| [`dashboard-home`](dashboard-home.md) **(nova)** | `:28-31` — "Doze linhas", `<Container><></></Container>` e um `biome-ignore` para o fragmento inútil | O arquivo tem **11 linhas**, é `<Container />` e **não há `biome-ignore`**; o literal `"Home"` está em `:7`, não `:8` | **spec corrigida.** A página segue vazia — o argumento não muda |
| [`audit-log`](audit-log.md) | `:50-53` — webhook em `:66,72`; `register()` em `:8-15` que "só resolve a instância do Firestore" | `:59,65`; `register()` em `:12-31`, com gate de `CORS_ORIGIN` e aviso de rate limit | refs corrigidas |
| [`cookie-consent`](cookie-consent.md) · [`cursor-pagination`](cursor-pagination.md) | `removeCookie` em `cookies.ts:38`; filtro/ordenação de `entity.repository.ts` em `20-23`/`28-32` | `:31`; `:25`/`:27` | refs corrigidas |
| [`onboarding-flow`](onboarding-flow.md) | cita o helper `ensureDefaultUserProfile` | O nome real é `createDefaultUserProfile` (`apps/api/(shared)/lib/user-merge.ts:47`) desde `3089d71` | deriva **de nomenclatura**, não de comportamento. Mantida aqui em vez de editar a spec, porque o parágrafo segue correto no mérito |

**Nenhuma regressão detectada.** As capacidades das 3 specs arquivadas foram reconferidas: `firestore.rules`
intacto e zero import `firebase/*` na `apps/api`; `.github/workflows/ci.yml` no ar com 8 execuções verdes;
a borda da API com CSP, allowlist e rate limit nos arquivos citados na spec arquivada.

## A decisão que não pode esperar a fila

`teams-organizations` é a única spec cuja **decisão** custa mais que a implementação: retrofitar escopo por
organização é **reescrita, não refactor** (6/10 de prevalência, esforço G, "a decisão mais cara de
postergar").

**Decidido em 2026-08-22:** `deferred` — adiar a implementação, **não** a decisão. O que torna o adiamento
honesto são duas contrapartidas de esforço P que **não dependem desta spec** e valem como tarefa direta no
`/analyze`:

1. escrever em `docs/ARCHITECTURE.md` se este core é **B2B ou B2C por padrão** — medido de novo hoje,
   `grep -niE "b2b|b2c|organiza" docs/ARCHITECTURE.md` retorna **0 resultados**;
2. concentrar o predicado de posse num ponto único de escopo — `row.userId !== ctx.subjectProfile.id`
   segue copiado **3 vezes no mesmo arquivo** (`apps/api/app/(routes)/entities/[id]/route.ts:16,32,65`),
   inalterado desde 2026-08-22.

**Nenhuma das duas foi feita até 2026-09-09** — os juros correm há dezoito dias, enquanto o backlog seguiu
acrescentando recursos escopados por usuário. Nota: `transactional-emails` **satisfez** o `depends_on`
desta spec no código (convite por e-mail agora tem base), o que não muda o `deferred` mas remove um
argumento para adiar de novo.

## Achados da varredura que não viraram spec

Defeitos e inconsistências encontrados na descoberta e nos pipelines. **Não são funcionalidades** — são
correções pontuais, algumas de minutos. Viram tarefa direta no `/analyze`, sem passar por spec.

> **Auditoria de 2026-09-09 (2ª rodada).** **5 achados novos**, quatro vindos da entrega de e-mail e um do
> próprio gate. Os demais foram reconferidos no código e seguem de pé. Nenhum foi removido nesta rodada.

Os primeiros são de **segurança** e foram confirmados diretamente no código.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **Revogar sessão não derruba o ID token.** `verifyIdToken(token)` é chamado **sem o argumento de revogação** (`packages/auth/server.ts:123`), e `resolve-api-actor.ts:26-29` tenta o bearer ID token **antes** do cookie — que, esse sim, usa `verifySessionCookie(..., true)` (`:193`) | `packages/auth/server.ts` · `apps/api/(shared)/lib/resolve-api-actor.ts` | Depois de revogar as sessões, um ID token já emitido continua passando no guard da API até expirar (1 hora). A base está metade correta — e é a metade errada que vem primeiro. **É o item 1 do corte de `account-security-mfa`, e não depende de `account-settings`**: pode ser tarefa direta hoje. |
| 🔴 **`packages/payments/ai.ts:4-5`** tem o defeito gêmeo do que já foi corrigido no `index.ts`: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY \|\| "" })` em **escopo de módulo** | `packages/payments/ai.ts` | O mesmo padrão no `index.ts` deixava `api#build` vermelho e foi corrigido com `getStripe()` (`index.ts:14-24`). O `ai.ts` não explode hoje **só porque nada importa `@repo/payments/ai`** — explodiria no primeiro fork que importasse, e `billing-subscription` é justamente o que faria alguém importar. |
| 🔴 **NOVO — a suíte tem falha intermitente e o CI vai bater nela.** `apps/app/__tests__/securityPolicySources.test.ts:92` estourou o `testTimeout` padrão de 5000 ms em **1 de 2** execuções de `pnpm turbo run lint typecheck test --force`; isolado, passou 3/3 | `apps/app/__tests__/securityPolicySources.test.ts:60-61` · `apps/app/vitest.config.mts` | Cada caso faz `vi.resetModules()` + `await import("@/proxy")`, reconstruindo o grafo inteiro do proxy, e a config **não declara `testTimeout`**. Pré-existente em `main` (entrou por `920ef6c`). Correção provável: `testTimeout` explícito na config, ou importar o proxy uma vez por `describe`. **Bloqueia a pendência #2** — ligar branch protection com este teste no gate reprova PRs ao acaso, e o runner do GitHub é mais lento que a máquina local. |
| 🔴 **`apps/app/app/layout.tsx:3` importa `@repo/analytics` sem `apps/app/package.json` declarar** a dependência — funciona por hoisting do pnpm | `apps/app/app/layout.tsx:3` · `apps/app/package.json` | Além do risco de resolução, **o turbo não invalida `app#*` quando `@repo/analytics` muda** — cache mentindo num gate que roda em toda PR. |
| 🔴 **`apps/app/env.ts:1` importa `@repo/email/keys` sem `apps/app/package.json` declarar `@repo/email`** — mesma classe do achado acima, e agora com consequência maior | `apps/app/env.ts:1` · `apps/app/package.json:15-22` | Pré-existente em `main`, mas **`transactional-emails` elevou a aposta**: o `keys.ts` do pacote perdeu o `skipValidation` e passou a **validar de fato no boot** dos 3 apps. Uma dependência não declarada agora está no caminho de inicialização da `apps/app`. `apps/web` e `apps/api` **declaram** o pacote; só a `app` não. |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo.** Com `NODE_ENV=production` e a variável ausente, `register()` lança (`apps/api/instrumentation.ts:17-21`), o Next imprime `Failed to prepare server` e **fica no ar respondendo 500 a tudo** | `apps/api/instrumentation.ts:17-21` | O efeito pretendido é atingido — nada é servido —, mas uma plataforma que só verifica se a porta responde veria o container **saudável**: um deploy quebrado passaria por bem-sucedido. Ou o health check distingue 5xx, ou o gate chama `process.exit(1)`. |
| 🟡 **NOVO — toda a base de e-mail é inalcançável pela UI.** `welcomeEmail` e `actionLinkEmail` não têm chamador de produção; o `contact` tem um (`apps/web/…/contact/actions/contact.tsx:16`) que por sua vez **não tem chamador nenhum** | `apps/web/…/contact/components/contact-form-client.tsx` · `…/contact/actions/contact.tsx` | O formulário da landing é maquete: **sem `<form>`**, botão sem `onClick` nem `type="submit"`, e campos (`date`, `firstname`, `lastname`, `resume`) que não correspondem aos parâmetros `(name, email, message)` da action. Bug de produto **pré-existente**, mas o efeito é que 131 testes novos exercitam código que nenhum usuário alcança. Foi decisão deliberada (a spec pede a base, não a feature) — **fica registrado para não virar surpresa** quando `auth-recovery-verification` for a primeira a chamar de verdade. |
| 🟡 **NOVO — `provider-error` não distingue três falhas diferentes.** Cota estourada, domínio não verificado e chave revogada produzem o **mesmo** `reason` e a **mesma** linha de log | `packages/email/index.ts:120-130` | Descartar o objeto de erro é **correto e deliberado** — ele carrega o endereço do destinatário (`:127`), e há teste que reprova quem o logar. Mas ninguém distingue "acabou a cota" de "revogaram a chave" sem abrir o painel do provedor. **Pertence a [`observability-logging`](observability-logging.md)**, onde já foi registrado como o primeiro custo medido da falta de log estruturado. |
| 🟡 **NOVO — `emailBrand.supportEmail` é configuração morta.** `grep supportEmail` em `apps` + `packages` devolve **uma** ocorrência: a própria definição | `packages/email/brand.ts:9` | Um fork vai editá-lo achando que muda alguma coisa. Ou vira rodapé de suporte nos templates, ou sai. |
| 🟡 **NOVO — `utils.ts` e `utils/` convivem no `@repo/internationalization`** e o caminhador do React Email resolve o diretório | `packages/internationalization/utils.ts` · `packages/internationalization/utils/cookies.ts` | O preview da 3003 imprime em loop `Could not find index file for directory at …/internationalization/utils`. **Nada quebra** (o `exports` map aponta o arquivo e os 9 previews renderizam), mas o log fica sujo — e é o tipo de ruído que faz alguém ignorar um erro real ao lado. Limpeza: `utils/index.ts` ou renomear `utils/cookies.ts`. |
| 🟡 **NOVO — `packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | `@repo/email`, `@repo/email/keys` e `@repo/email/templates/contact` resolvem **só** pelo alias TS `@repo/*` → `../../packages/*`. Funciona hoje; quebra em qualquer consumidor que resolva por Node. Dívida real, deliberadamente não corrigida na entrega (risco de quebrar imports por ganho zero). |
| 🟡 **`skipValidation: true` faz o t3-env descartar os `extends`**, então o bloco `client` da `apps/web` parece validar e não valida. Causa raiz no pacote instalado: `@t3-oss/env-core/dist/src-Bb3GbGAa.js:36-37` devolve o `runtimeEnv` **antes** de montar o schema e mesclar os `extends` | `apps/web/env.ts:22`, `:8`, `:13-16` | Causa raiz de vários sintomas. **Reconferido nesta rodada e ainda aberto** — `transactional-emails` **contornou** (as chaves de e-mail passaram a ser lidas dentro do `@repo/email` via `keys()`, não pelo `env`) e **não corrigiu**; o comentário em `:10-12` hoje **documenta o contorno**. O raio continua sendo header/CTA/pricing da landing inteira: o CTA "Ir para o painel" cai no fallback porque `NEXT_PUBLIC_APP_URL` vem por `extends` e chega `undefined`. Pior que o bug: o bloco `client` tem **forma** de validação e não valida nada. |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento.** `apps/api/env.ts:30` usa `skipValidation: process.env.NODE_ENV === "development"`; nesse modo o t3-env descarta as chaves vindas de `extends`, e `env.STRIPE_WEBHOOK_SECRET` é `undefined` em `next dev` | `apps/api/env.ts:9,30` | Mesma causa raiz do anterior — os dois deveriam ser corrigidos juntos. O guard cai sempre no ramo `"Not configured"`, então `pnpm --filter api dev:with-stripe` **não pode funcionar**. |
| 🟡 **Webhook da Stripe é casca.** Roteia só `checkout.session.completed` (`:50`) e `subscription_schedule.canceled` (`:54`); os dois handlers (`:8`, `:18`) são stubs `// TODO` — o próprio arquivo admite na linha 1 (`biome-ignore-all … os handlers de evento são stubs`) | `apps/api/app/(routes)/webhooks/payments/route.ts` | A assinatura **é** validada (`:43`); nada é persistido. Escopo de `billing-subscription`. `:63` devolve `{ result: event }`, ecoando o objeto Stripe inteiro na resposta. |
| 🟡 **`FormattedError.retryAfterSeconds` não tem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:13,20` | Toda a cadeia para levar a espera até a tela está pronta — `Retry-After` no 429, `Access-Control-Expose-Headers` para o script poder lê-lo, o parse do delta-seconds — e **para no último metro**: o toast diz "aguarde um instante", sem o número que o servidor mandou. |
| 🟡 **`isRateLimitEnforced()` é export morto.** `packages/security/index.ts:32` exporta o predicado e **ninguém** o chama fora dos testes | `packages/security/index.ts:32` | O papel que ele cumpriria acabou coberto pelo aviso de boot (`instrumentation.ts:23-27`), que lê `process.env.ARCJET_KEY` direto. Duas fontes de verdade para o mesmo fato, e a que tem nome não é a usada. |
| ⚪ **Um `useList*` que falha renderiza o estado vazio, não erro.** Um 429 na lista de entidades mostra "Nenhuma entidade cadastrada" | `apps/app/…/entities/(hooks)/useListEntities.tsx:11,16` · `…/(home)/EntitiesListClient.tsx:145-148` | O hook **devolve** `error` (`:16`); o componente só passa `locale={{ emptyText }}` à `Table` e **nunca lê** `error`. Lista que falhou fica indistinguível de lista vazia, e o usuário conclui que apagaram os dados dele. Vale para todo `useList*` no mesmo padrão. |
| 🟡 **`update()` do `BaseRepository` reescreve o documento inteiro e corrompe o tipo de `createdAt`.** `:102-117` lê via `findById()` (que passa pelo mapper e devolve `createdAt` **serializado como string ISO**), faz spread e grava tudo de volta | `apps/api/(shared)/repositories/base.repository.ts:102-117` | ⚠️ **Preservado de propósito** em `firestore-admin-access` (migração *contract-preserving*). Depois do primeiro `PUT` o campo deixa de ser `Timestamp` e vira `String`: consulta por range/`orderBy` mistura tipos. **Cruza diretamente com `cursor-pagination` (#5)**, que precisa de `orderBy` estável. |
| 🟡 **`userRepository.list()` mente no tipo de retorno**: declara `Promise<UserDTO[]>` (`:32`) mas devolve o merge com o Firebase Auth, que é `UserWithAuthDTO` (cast em `:56`) | `apps/api/(shared)/repositories/user.repository.ts:32,52-63` | O SDK **já declara o tipo certo**, então a mentira está só no repositório — e obrigou o teste a fazer cast para ler o campo. |
| 🟡 `delete()` herdado por todo repositório é **soft delete**: grava `deletedAt` e nada mais | `apps/api/(shared)/repositories/base.repository.ts:127-129` | O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. Bloqueia o item 3 de `data-rights-lgpd`. |
| ⚠️ **Documentação descreve como implementado um fluxo de pagamentos que não existe**: rotas `/payments/*`, `UserDTO.subscription`, `userRepository.updateSubscriptionByReferenceId`, `apiClient.payments.*`, tela "Minha assinatura" e eventos de webhook que o código não roteia | `docs/PAYMENTS.md:5-12` (`docs/SECURITY.md` diz o **oposto**, e está certo) | Pior classe de erro de documentação: mente com aparência de autoridade. Dos **6 itens** de "Estado atual (implementado)", só o **primeiro** é verdadeiro — reconferido item a item nesta rodada, **ainda não corrigido**. Corrigir a doc **independe** de implementar a spec. |
| 🟡 `packages/auth/package.json:12` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth/package.json:12` | Export quebrado. **Quinta auditoria consecutiva**; o arquivo continua não existindo no disco. |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` dos três apps | `packages/auth/package.json:24` | Origem do aviso `deprecated next@15.5.2` no `pnpm install`. Um pacote de **autenticação** resolvendo uma major diferente do runtime que o consome é risco desproporcional ao esforço de alinhar. |
| 🟡 `chart.tsx` é código morto — `recharts` pesa no bundle sem uso | `packages/design-system/components/ui/chart.tsx` | 11 KB no disco, exportado no barrel (`components/ui/index.ts:8`) e `grep ChartContainer\|recharts` em `apps` retorna **zero**. `dashboard-home` (#11) é a spec que o resgataria. |
| 🟡 **`input-otp.tsx` é código morto**, sem nenhum consumidor | `packages/design-system/components/ui/input-otp.tsx` | Mesma classe do `chart.tsx`. `account-security-mfa` é a spec que o usaria. |
| 🟡 **Dependências de instrumentação instaladas e nunca importadas:** `import-in-the-middle@^2.0.0` (`:26`) e `require-in-the-middle@7.5.2` (`:35`) | `apps/app/package.json:26,35` | São as dependências típicas de OTel/Sentry e dão **zero** importações no repo. Hoje é peso morto — e **não** contam como evidência de observabilidade. |
| 🟡 `photo` é `z.string().trim().max(...)` — qualquer texto passa, não é URL validada, nos **dois** schemas (create `:23`, update `:34`). O front **valida** como URL, a API não | `apps/api/(shared)/validation/entity.schema.ts:23,34` | Validação que só existe no navegador é o anti-padrão que a regra de ouro 4 proíbe. **Consequência:** com `img-src` sendo uma allowlist explícita, uma `photo` de host arbitrário é bloqueada pela CSP em runtime — a falha saiu do banco e chegou à tela. |
| 🟡 **Strings de UI soltas, fora do dicionário** — `"Switch language"` (`sr-only`) nos dois language switchers, `"Início"` + `href="/painel"` no breadcrumb, `"Sair"` no ProfileDropdown (`:51`), os 8 títulos de `routes.tsx` | `apps/app/shared/components/ui/LanguageSwitcher.tsx:79` · `apps/web/…/language-switcher.tsx:68` · `PageBreadcrumb.tsx:28,30` · `ProfileDropdown.tsx:51` · `(common)/routes.tsx:37-81` | Viola a regra de ouro 2. Agrava no `sr-only`: é **exatamente** o texto que só o leitor de tela recebe, e fica sem tradução para quem mais depende dele. |
| 🟡 String `"Home"` literal fora do dicionário nas duas home pages — **e a chave já existe** (`translations/apps/app/pages/common/routes/index.ts:3,17,31`) | `apps/app/…/(common)/(pages)/page.tsx:7` · `…/(admin)/admin/(pages)/page.tsx:7` | Viola a regra de ouro 2 com a tradução pronta ao lado. |
| 🟡 **`setTimeout` sem cleanup** no `useEffect` do carrossel: `:24-38` agenda o avanço e não devolve função de limpeza, com `[api, current]` nas dependências | `apps/web/…/(home)/components/cases-client.tsx:29` | Um timer é agendado a cada avanço e nenhum é cancelado na desmontagem, chamando `setCurrent` em componente morto. É a home da landing: o caminho mais percorrido do repo. |
| 🟡 **`hydration mismatch` num `id` do Radix + "Select is changing from uncontrolled to controlled"** | `apps/app/shared/components/ui/PanelNavbarControls.tsx` · `Sidebar.tsx:96-154` | O `Collapsible` do `GlobalSidebar` é montado pelos **dois** painéis, então o aviso aparece em **toda carga do painel**, sem interação. Contradiz a regra do escopo de resolver no servidor todo estado de UI persistido no browser. |
| ⚪ **A landing `/contact` acusa 5 erros de hidratação** (`<a>` dentro de `<a>`) vindos do `NavigationMenu` do header | `apps/web` — header/`NavigationMenu` | Pré-existente e independente da entrega de e-mail, mas apareceu na validação visual dela. |
| 🟡 **`/auth/sign-in` e `/auth/sign-up` da api não têm consumidor nenhum e não seguem o contrato `{ error: { code } }`** — devolvem string crua (`sign-in/route.ts:12`, `sign-up/route.ts:26,40`); a primeira responde **500** para credencial inválida | `apps/api/app/(routes)/auth/sign-in/route.ts` · `sign-up/route.ts` | Viola a regra de ouro 3. `api-hardening` pôs rate limit nessas duas rotas — protegeu endpoints que **ninguém chama e que respondem errado**. A decisão certa provavelmente é removê-las, não consertá-las; enquanto existem, são POST público sem guard queimando cota da Identity Toolkit. |
| 🟡 **`turbo run` aborta na primeira falha** (`--continue=false` é o default), então uma PR com dois tipos de defeito mostra só o primeiro | `.github/workflows/ci.yml:39` | Confirmado na prática nesta rodada: quando `app#test` falhou, `api:test` e `app:typecheck` foram abortados e o log disse `20 successful, 23 total`. É o comportamento correto, mas quem ler o log da PR verá tasks "não rodadas" e pode se confundir. |
| 🟡 **`apps/app/next.config.ts:19` lista `www.google.com` em `images.domains`** sem uso e sem `remotePattern` correspondente; `domains` está **deprecado** no Next 16 | `apps/app/next.config.ts:19` | Origem sem uso numa lista de hosts confiáveis de imagem é superfície gratuita — e **divergente** da CSP, que nomeia só `lh3.googleusercontent.com`. Duas allowlists de imagem que discordam. |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`**; `isSameOriginRequest` **retorna `true` quando não há header `Origin`** | `packages/shared/utils/helpers/cookies.ts:13` · `packages/auth/session.ts:66-70` | ASVS 5.0 L1 (3.3.1) exige `Secure`. O helper hoje só grava `x-locale`, **não** o cookie de sessão. Sobre o segundo: `api-hardening` adotou **a mesma** decisão na borda, mas com o porquê escrito e um limite explícito (`cors.ts:42-52`); o de `session.ts` continua sem. |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta.** O cliente grava com `expires`, mas na requisição seguinte os proxies fazem `cookieStore.set("x-locale", …)` **sem `maxAge`**, rebaixando-o a cookie de sessão | `apps/web/proxy.ts` · `apps/app/proxy.ts` · `packages/shared/utils/helpers/cookies.ts` | O idioma escolhido **não sobrevive ao fechamento do navegador**. Bug de produto silencioso: ninguém reclama, todo mundo reescolhe o idioma. |
| 🟡 **Casamento exato de rota no rate limit deixa variações de fora.** `RATE_LIMITED_PATHS.includes(pathname)` não pega `/auth/sign-in/` (barra final) nem futuras `/auth/sign-in/*` | `apps/api/proxy.ts:31-39` | Decisão consciente do `/review`: `startsWith` limitaria `/auth/sign-in/google` duas vezes. Há teste fixando o comportamento. Revisitar quando entrar a 4ª rota pública. |
| ⚪ `apps/api/(shared)/lib/cors.ts` allow-lista um header `"n"` que nenhum código do repo envia nem lê (o cookie de locale é `x-locale`) | `apps/api/(shared)/lib/cors.ts` | Resíduo. |
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
| **Consertar o formulário de contato da landing** | — | ⚠️ **Não é spec, é achado** (está na tabela acima). O formulário é maquete e a action que ele deveria chamar já existe e funciona. É correção pontual de esforço P, não funcionalidade nova — vai direto ao `/analyze`. Registrado aqui porque a entrega de `transactional-emails` o deixou a um passo de funcionar, e é fácil confundir com escopo de spec. |
| Provedor de e-mail plugável (SES/Postmark) | — | Explicitamente fora do corte de `transactional-emails`: "só quando algum fork pedir". Nada mudou. |
| Rastreio de abertura/clique em e-mail | — | Fora do corte de `transactional-emails`: arrasta discussão de privacidade sem valor para um MVP. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto **é** uma API. Webhook de saída bem-feito (HMAC, retry com backoff, DLQ) é esforço G. |
| Sessões e dispositivos gerenciáveis | 1/10 | Absorvido pelo corte de `account-security-mfa`. |
| Widget de feedback | 1/10 | Terceirizar é mais racional que manter no core. |
| Referral / afiliados | 0/10 | Nenhuma referência do painel entrega. A pesquisa classifica como discurso de blog; o mercado resolve com produto de terceiro. |
| SSO enterprise · SCIM | 0/10 | Território de provedor especializado. Só entra com o primeiro contrato enterprise — e aí não é mais boilerplate. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | Estavam no "fora do corte" de `ci-pipeline` porque dependiam de um CI verde e estável. **A condição chegou pela metade:** o CI está em `main` e verde em 8 execuções, mas descobrimos nesta rodada que ele tem **teste instável** — "estável" ainda não é verdade. **Argumento a favor de Renovate:** as três actions do `ci.yml` miravam Node 20 (removido em 2026-09-23) e **nenhuma validação local pegou, nem o `act`** — só apareceu quando o workflow rodou na plataforma. Um bot teria aberto essa PR meses antes. |
| Remote Cache do Turbo | prática 1 | É a única peça que arrasta conta e env, e o ganho só aparece com o CI estável. Entra quando doer, com medição — e como opt-in por variável ausente, no padrão do `ARCJET_KEY`. |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das **9** configs de Vitest declara cobertura: não há número para discutir. Medir primeiro, gatear depois, e só em pastas críticas. Relatório por workspace **não soma** — exige consolidação na raiz. Cruza com `e2e-testing`, que traz a medição no corte. |
| Changesets / versionamento | opcional-forte | Com pacotes `private: true` e forks que divergem, o valor seria só o changelog. Não paga o processo agora. |
| Storybook | não apareceu no painel | O `playground` já serve de catálogo vivo dos componentes. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork, não do core. |
