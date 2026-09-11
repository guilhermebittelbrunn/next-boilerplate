# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-10 (`/spec --sync`, pós-merge da PR #9) · anteriores: 2026-09-09 (2
> rodadas) · 2026-09-02 · 2026-09-01 (3 rodadas) · 2026-08-31 · **origem:** semeadura inicial
> (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`transactional-emails` fechou e foi arquivada.** A PR **#9** foi mergeada em `main` em
>    2026-09-10T02:58:16Z (merge commit `400f290`) e o CI passou nesse SHA. As três condições que a rodada
>    anterior cobrava — PR, CI verde na plataforma, merge — estão satisfeitas, e os 6 itens do corte foram
>    reconferidos **um a um no código**, não no `STATE.md`. Spec em
>    [`docs/features/transactional-emails/spec.md`](../docs/features/transactional-emails/spec.md).
> 2. **A pendência do arquivamento pendurado morreu.** `specs/api-hardening.md` **não** existe mais em
>    `origin/main` e `docs/features/api-hardening/spec.md` **existe** — a PR #9 levou os commits de
>    auditoria junto. As duas auditorias que viviam só numa branch chegaram em `main`.
> 3. **Duas dependências saíram de ⚠️ para ✅.** `auth-recovery-verification` e `teams-organizations`
>    dependiam de `transactional-emails`; a base agora está em `main`. Com isso
>    **`auth-recovery-verification` assume o #1 sem ressalva** — a condição que a segurava caiu.
> 4. **O gate instável não reproduziu.** `pnpm turbo run lint typecheck test --force` rodou **3 vezes,
>    23/23 nas três**. A causa estrutural continua intacta, então o achado **desce de 🔴 para 🟡** em vez
>    de sair: virou observação única não-reproduzida. Ver [Gates](#gates--medidos-nesta-auditoria).
> 5. **As 15 specs restantes foram remedidas: nenhuma avançou, nenhum `status` mentia.** O que derivou foi
>    **prosa e referência** — **14 das 15** tinham pelo menos uma `arquivo.ts:linha` errada, e 3 tinham
>    erro de **substância** (função com nome inexistente, dois fluxos atribuídos ao contrário, escopo
>    inflado). Todas corrigidas. Ver [Deriva](#deriva).
> 6. **Os 40 achados foram reconferidos um a um: 40 seguem de pé, 0 foram corrigidos.** Dois estavam
>    **substantivamente errados** e foram reescritos (o header inexistente no CORS, a regra citada no
>    `useHealthCheck`). **2 achados novos**; um terceiro candidato foi **descartado por erro de medição
>    meu** — está registrado para não voltar.

## Contadores

Sobre as **15 specs que seguem em `specs/`**. Recontados do disco em 2026-09-10, lendo o frontmatter de
cada arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 14 |
| `approved` | 0 |
| `in-progress` | 0 |
| `done` (arquivadas) | 4 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 7 · `dx` 4 · `confianca` 4. **Por esforço:** P 0 · M 12 · G 3.
**Por valor:** alto 12 · médio 3 · baixo 0.

**Transições aplicadas nesta rodada: 1** — `transactional-emails` `in-progress` → `done` + arquivada.
`in-progress` voltou a **zero**: não há feature em execução, e o backlog está pronto para o próximo
`/analyze`.

## Gates — medidos nesta auditoria

Re-executados agora com `--force`, não copiados do `/test` nem da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **430 arquivos · 0 erros · 0 warnings** (`No fixes applied`, 179 ms) |
| `pnpm turbo run lint typecheck test --force` (1ª) | ✅ **23 tasks, 23 successful, 0 cached** — 29,2 s |
| `pnpm turbo run lint typecheck test --force` (2ª) | ✅ **23/23** — 29,5 s |
| `pnpm turbo run lint typecheck test --force` (3ª) | ✅ **23/23** — 29,7 s |
| `pnpm test` (raiz — é o que gateia o `turbo build`) | ✅ **9 workspaces · 63 arquivos · 573 testes** |

⚠️ **A falha intermitente da rodada anterior não reproduziu — e isso não a absolve.** Rodei o gate
completo **3 vezes** justamente porque a rodada anterior mediu 1 falha em 2 execuções; as três passaram.
A causa estrutural, porém, foi reconferida e **está inalterada**:
`apps/app/__tests__/securityPolicySources.test.ts` chama `vi.resetModules()` e reimporta `@/proxy`
inteiro a cada caso (`:60-61`), e **nenhuma das 9 configs de Vitest do repo declara `testTimeout`** — o
padrão de 5000 ms segue valendo para um caso que reconstrói o grafo do proxy. Leitura honesta: **uma
observação única, não um gate vermelho permanente**. O risco para a pendência de branch protection cai,
mas não desaparece — o runner do GitHub é mais lento que a máquina local, e 3 execuções verdes não provam
ausência de flake.

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

Números idênticos à rodada anterior — nenhuma linha de produção mudou desde o merge, o que é exatamente o
esperado numa auditoria. CI: **10 execuções, todas `success`** (`gh run list`), incluindo a do merge da
PR #9 no SHA `400f290`. **Nenhum commit do repo está fora de `main` hoje**: `HEAD` da branch `thebes`
é `400f290`, igual a `origin/main`.

## Ordem recomendada

Respeita `depends_on` (medido do frontmatter nesta rodada) e prioriza o que **desbloqueia** e o que **fica
mais caro depois**.

> **A ressalva que abria esta seção saiu.** Na rodada anterior o topo da fila vinha precedido de "antes de
> qualquer spec, abrir a PR e mergear". Feito. Não há mais nada entre você e o `/analyze`.

| # | id | por que agora |
|---|----|---------------|
| 1 | [`auth-recovery-verification`](auth-recovery-verification.md) | **Agora sem ressalva: a dependência está em `main`.** Commodity de prevalência **10/10** e a única do painel classificada como bloqueador — `sendPasswordResetEmail`, `sendEmailVerification`, `updatePassword`, `confirmPasswordReset` e `oobCode` seguem dando **zero** ocorrências em `apps/` + `packages/`, e `auth/sign-up/route.ts:10-53` cria a conta sem disparar e-mail nenhum. **0 de 5 itens do corte.** O escopo é menor do que parece: `action-link.tsx:12` já é genérico por slug de dicionário, então template são **2 slugs × 3 idiomas**, não dois componentes. Herda **dois** pontos a decidir no `/analyze`: a base **nunca lança** (devolve `{sent:false,reason}` em `index.ts:101,108,122,129`), e "esqueci a senha" falhando em silêncio é perder a conta; e uma rota `/auth/reset` nova **não** ganha rate limit até entrar em `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:31-35`, casamento exato em `:37-39`). |
| 2 | [`file-upload-storage`](file-upload-storage.md) | **Co-requisito de `account-settings`** junto com #1 — sem ela a cadeia trava no segundo nível. **0 de 5.** `firebase.json` continua com **6 linhas** e sem bloco `storage`; nenhum dos **7** `keys.ts` declara bucket (`grep -i BUCKET` = 0); `packages/design-system/components/form/hookform/` segue com **7 campos e nenhum de arquivo**; `grep -E "getStorage\|@aws-sdk\|S3Client\|uploadthing"` = 0. Perdeu o #1 por mérito, não por condição: o argumento "é a que não depende de merge" **expirou** com o merge. |
| 3 | [`firebase-emulator-seed`](firebase-emulator-seed.md) | Sexta auditoria consecutiva com o mesmo veredito: `firebase.json` **sem bloco `emulators`**, `firebase-tools` não é dependência de ninguém, `grep -i emulator` em código/config/CI = **0**. São **573 testes rodando a cada PR e nenhum toca o banco ou as rules** — `firestore.rules:33` é um deny-all que **nenhum teste jamais exercitou**, e o CI roda sem segredo nenhum, então nada nele pode alcançar um banco. É o **gargalo único** de `e2e-testing`. O item meio-feito (`apps/api/scripts/create-dev-admin.mjs`, exposto em `apps/api/package.json:13`) exige credencial real: `readServiceAccount():31-46` cobra `FIREBASE_ADMIN_*` e não há **nenhum** tratamento de `FIRESTORE_EMULATOR_HOST` no repo. |
| 4 | [`cookie-consent`](cookie-consent.md) | **A única spec do backlog com violação ativa, não com ausência de recurso:** `packages/analytics/provider.tsx:15` monta o Vercel Analytics **incondicionalmente** e `:16-17` monta o GA checando só a env — zero consentimento, sobre todo o app (`apps/app/app/layout.tsx:39-46`). `grep -rin consent` em `apps/` + `packages/` = **0 ocorrências, zero arquivos**. `depends_on` vazio. |
| 5 | [`cursor-pagination`](cursor-pagination.md) | Todo fork herda "ler a coleção inteira": `base.repository.ts:36-49` faz `.get()` (`:40`) sem `limit`/`orderBy`/`startAfter` — e o repo inteiro (`apps/api` + `packages/sdk`) tem **1** ocorrência dessas cláusulas, num script de bootstrap. Filtro e ordenação acontecem em memória nas subclasses (`entity.repository.ts:25,27-31`). Depois de haver dados em produção, a correção quebra contrato do SDK. Cruza com a dívida do `update()` (achados), que precisa de `orderBy` estável em `createdAt`. |
| 6 | [`observability-logging`](observability-logging.md) | **"Padronizar antes que seja tarde", não "inventar".** Duas entregas convergiram sozinhas no mesmo formato de log — `apps/api/proxy.ts:41-49` e `packages/email/index.ts:39-49`, ambos linha única, prefixo, `chave=valor`, sem PII, o segundo com teste que reprova quem logar o objeto de erro. Há uma convenção emergente a promover a helper antes que a terceira entrega invente a quarta variação. Primeiro custo já medido: `index.ts:121,128` colapsa cota, domínio e chave revogada num único `provider-error`. **1 dos 6 itens já entregue por tabela** (o `packages/analytics/server.ts` morto saiu). |
| 7 | [`audit-log`](audit-log.md) | O painel **já tem impersonação** e nada registra quem entrou na conta de quem — o switch é 100% client-side (`apps/app/shared/stores/panelStore.ts:76-90`: cookies + espelho no localStorage, **sem chamada de API**). A mutação sob impersonação já foi bloqueada (`impersonation-read-only.ts:19-31`); o **registro** não existe (`grep auditLog` = **0 em todo o repo**). `users/[id]/route.ts:75-91` faz soft delete e devolve 204 sem gerar evento. **0 de 5.** |
| 8 | [`billing-subscription`](billing-subscription.md) | Monetização é o maior valor bruto do backlog e continua em **0/6**: nenhuma rota sob `payments/` (o diretório não existe; são exatamente 10 `route.ts`), `UserDTO:7-14` sem `subscription` nem `stripeCustomerId`, webhook com dois handlers `// TODO` (`:11`, `:21`) que o próprio arquivo admite na linha 1, e os CTAs de preço da landing apontando para a raiz do app (`pricing/page.tsx:75-79,118-122`). ⚠️ **A doc descreve como pronto o que não existe** — 5 dos 6 itens de `docs/PAYMENTS.md:5-12` são falsos, reconferidos item a item; corrigir a doc **independe** de implementar a spec. **Pré-requisito barato:** o 🔴 de `packages/payments/ai.ts:4-5` explode no primeiro fork que importar o pacote, e é esta spec que faria alguém importar. |
| 9 | [`account-settings`](account-settings.md) | 🔒 Bloqueada por #1 e #2. A sidebar tem **8** links apontando para `#` (`routes.tsx:44,48,52,56,67,71,75,79`), 4 deles de Settings, e **todas as 5** rotas de usuário são `requireAdminApi` (`users/route.ts:21,34`; `users/[id]/route.ts:15,33,75`): **ninguém consegue editar a si mesmo**. Tema e idioma existem, mas presos ao browser — nenhum DTO tem campo de preferência. **0 de 6.** |
| 10 | [`onboarding-flow`](onboarding-flow.md) | Maior desequilíbrio valor/prevalência do painel (3/10 entregam) e é onde o usuário decide se fica. `grep -rin onboarding` em `apps/` + `packages/` = **1 ocorrência, e é um endereço de sandbox do Resend num fixture de teste**. **0 de 5.** |
| 11 | [`dashboard-home`](dashboard-home.md) | As duas homes do painel são **11 linhas** e o literal `"Home"` (`(common)/(pages)/page.tsx:7` e `(admin)/admin/(pages)/page.tsx:7`) — e a chave de dicionário **já existe** (`translations/apps/app/pages/common/routes/index.ts:3,17,31`). Precisão nova desta rodada: **a chave não é morta** — é usada em **todo** breadcrumb do painel, em 8 telas; a única página que não a usa é justamente a home. É a primeira tela de todo fork. |
| 12 | [`data-rights-lgpd`](data-rights-lgpd.md) | 🔒 Bloqueada por `account-settings` (2 níveis abaixo). Obrigação legal com prazo; fica mais cara a cada coleção nova. O único `DELETE` é admin-only (`users/[id]/route.ts:75`) e é soft delete (`base.repository.ts:127-129`) — o e-mail continua ocupado no Firebase Auth. `grep -niE "encarregado\|DPO\|privacy@"` em `apps/`+`packages/`+`docs/` = **0**. |
| 13 | [`e2e-testing`](e2e-testing.md) | 🔒 Bloqueada por #3, o único gargalo restante. Zero `playwright`/`cypress`/`axe`/`puppeteer` em **qualquer** `package.json`, e **nenhuma** das 9 configs de Vitest declara cobertura. **O argumento novo da rodada anterior enfraqueceu**: o gate instável não reproduziu em 3 execuções, então a spec volta a valer pelo mérito original, não pela urgência. |
| 14 | [`account-security-mfa`](account-security-mfa.md) | 🔒 Bloqueada por `account-settings` — **mas o item 1 do corte não deveria estar** (ver [Dependências](#dependências-e-bloqueios)). Prevalência baixa (MFA 3/10, sessões 1/10), e todo logout ainda é global (`session-routes.ts:79`). |

### O que **não** foi escolhido para #1, e por quê

- **`file-upload-storage`** perdeu de novo, e agora **por mérito**: na rodada anterior ela era a
  alternativa "que não depende de merge nenhum", e essa vantagem expirou. Sem a condição, `auth-recovery`
  ganha por prevalência (10/10 contra 7/10) e por desbloquear uma cadeia de três níveis.
- **`cookie-consent`** é a única com violação legal **em curso** (tags carregando sem base legal, hoje), e
  ainda assim não foi ao topo: destrava zero specs, e a exposição real de um boilerplate sem usuários é
  baixa. Se o primeiro fork for a público antes de #1 sair, esta ordem se inverte — é a troca a fazer
  conscientemente, não por acidente.
- **`firebase-emulator-seed`** destrava **1** spec (`e2e-testing`, esforço G, valor médio) contra a cadeia
  de `auth-recovery-verification` → `account-settings` → {`account-security-mfa`, `data-rights-lgpd`}. É
  infraestrutura de teste — retorno diferido, valor crescente. Ficou em #3.

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-10 |
|------|--------------|------------------------|
| [`auth-recovery-verification`](auth-recovery-verification.md) · [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ **satisfeita** — entregue e mergeada em `main` (PR #9, `400f290`). Era ⚠️ na rodada anterior |
| [`account-settings`](account-settings.md) | `auth-recovery-verification`, `file-upload-storage` | 🔒 bloqueada pelas **duas**; é por isso que `file-upload-storage` está em #2 |
| [`account-security-mfa`](account-security-mfa.md) · [`data-rights-lgpd`](data-rights-lgpd.md) | `account-settings` | 🔒 bloqueadas em cadeia |
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | ✅ `ci-pipeline` entregue · 🔒 `firebase-emulator-seed` — **gargalo único** |
| [`audit-log`](audit-log.md) · [`cursor-pagination`](cursor-pagination.md) · [`firebase-emulator-seed`](firebase-emulator-seed.md) | `firestore-admin-access` | ✅ satisfeita (entregue em 2026-08-31) |
| [`billing-subscription`](billing-subscription.md) · [`cookie-consent`](cookie-consent.md) · [`dashboard-home`](dashboard-home.md) · [`file-upload-storage`](file-upload-storage.md) · [`observability-logging`](observability-logging.md) · [`onboarding-flow`](onboarding-flow.md) | — | ✅ sem dependência |

> **O grafo segue mais restritivo que a realidade técnica em um ponto.** O item 1 do corte de
> `account-security-mfa` — fechar a janela de revogação (`packages/auth/server.ts:123` chama
> `verifyIdToken` **sem** `checkRevoked`, e `resolve-api-actor.ts` tenta o bearer em `:24` **antes** do
> cookie em `:34`, que esse sim usa `verifySessionCookie(..., true)`) — **não depende de
> `account-settings` para nada**: é uma correção de guard, não uma tela de conta. Reconferido nesta
> rodada: a linha continua idêntica. O `depends_on` da spec o mantém preso 2 níveis abaixo, quando
> poderia ser tarefa direta hoje. A própria spec já recomenda desacoplá-lo. Ver o 🔴 correspondente em
> [Achados](#achados-da-varredura-que-não-viraram-spec).

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | 🔒 `account-settings` |
| [`account-settings`](account-settings.md) | Área de conta e preferências do usuário | produto | alto | M | `proposed` | 🔒 `auth-recovery-verification`, `file-upload-storage` |
| [`audit-log`](audit-log.md) | Trilha de auditoria de ações sensíveis | confianca | alto | M | `proposed` | ✅ `firestore-admin-access` |
| [`auth-recovery-verification`](auth-recovery-verification.md) | Recuperação de senha e verificação de e-mail | produto | alto | M | `proposed` | ✅ `transactional-emails` |
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
| `firestore-admin-access` | 2026-08-31 | [`docs/features/firestore-admin-access/spec.md`](../docs/features/firestore-admin-access/spec.md) |
| `ci-pipeline` | 2026-09-01 | [`docs/features/ci-pipeline/spec.md`](../docs/features/ci-pipeline/spec.md) — ⚠️ fechada com 1 item do corte em aberto |
| `api-hardening` | 2026-09-09 | [`docs/features/api-hardening/spec.md`](../docs/features/api-hardening/spec.md) — 5/5 do corte entregues |
| `transactional-emails` | 2026-09-10 | [`docs/features/transactional-emails/spec.md`](../docs/features/transactional-emails/spec.md) — 6/6 do corte; ⚠️ base **sem consumidor alcançável** (ver achados) |

**Reconferido nesta rodada e agora resolvido:** o arquivamento de `api-hardening` chegou em `main`.
`git ls-tree origin/main -- specs/api-hardening.md` volta **vazio** e
`docs/features/api-hardening/spec.md` **está** em `origin/main`. Os frontmatters das 4 specs arquivadas
estão coerentes (`status: done`, `feature: <slug>`) e **não há duplicata** em `specs/` para nenhuma delas.
O `STATE.md` de `transactional-emails` já traz `spec: transactional-emails` — não foi preciso acrescentar.

As **duas** features concluídas sem spec — `auth-panel-context` e `impersonation-read-only` — não constam
aqui, e é o correto: as duas são anteriores à semeadura do backlog (2026-08-21).
`impersonation-read-only/STATE.md:5` tem `spec: -`, e `auth-panel-context/STATE.md` **não tem o campo
`spec:` de forma alguma**. Nenhuma spec viva casa com o escopo das duas, então não é vínculo faltando —
mas o campo podia ser preenchido com `-` por consistência.
*(`docs/features/` tem 6 pastas e **4** `spec.md` arquivados.)*

## Pendências vivas sem dono

Itens que **não são código a escrever numa spec** e que somem do radar se não ficarem escritos. Nenhum tem
dono. Specs arquivadas não são reconciliadas por `/spec --sync` futuro — este é o registro.

> **A pendência #1 da rodada anterior saiu**: as duas auditorias de backlog que viviam numa branch não
> mergeada chegaram em `main` pela PR #9. Foi a única resolvida; as demais foram reconferidas e seguem.

| # | pendência | origem | custo |
|---|-----------|--------|-------|
| 1 | **`main` não tem branch protection.** O CI **sinaliza e não bloqueia**: uma PR vermelha pode ser mergeada, e a PR #5 foi mergeada sem gate. Reconferido em 2026-09-10: `gh api …/branches/main/protection` → **404 `"Branch not protected"`**, `gh api …/rulesets` → **`[]`**. Ligar exigindo o check resolve **também** o item 2 do corte de [`e2e-testing`](e2e-testing.md). O bloqueio que a rodada anterior colocou aqui **afrouxou** — o teste instável não reproduziu em 3 execuções —, mas a causa estrutural segue e o runner do GitHub é mais lento que a máquina local: ligue e observe, não ligue e esqueça | `ci-pipeline` (arquivada) | minutos |
| 2 | **O login com Google nunca teve passe manual com conta real.** O `/test` provou o mecanismo do COOP via `postMessage`, não o fluxo ponta a ponta. Modo de falha silencioso: o popup fecha e nada acontece, sem mensagem e sem log | `api-hardening` (arquivada) | ~2 min |
| 3 | **O envio real de e-mail nunca foi provado.** Toda a validação de `transactional-emails` foi feita no preview da 3003 e em teste; **nenhuma mensagem saiu de verdade**, porque isso exige domínio com SPF/DKIM — passo manual de DNS, sem contorno. O roteiro M1–M4 está nos critérios de aceite da feature | `transactional-emails` (arquivada) | DNS + ~10 min |
| 4 | **Na `apps/web` a CSP é Report-Only** (`apps/web/proxy.ts:36,68-74`), não bloqueante — o item 1 do corte de `api-hardening` diz "com CSP ativa", então a landing cumpre metade. Foi decisão deliberada da spec, e a política rodou com **zero violações reportadas**: virar a chave é barato | `api-hardening` (arquivada) | P |
| 5 | **Contas de QA acumuladas** no projeto Firebase de dev (`next-boilerplate-576d0`) por cinco pipelines: `qa-admin@`, `qa-common@`, `qa-review-common@`, `qa-ci-admin@`, `qa-review-ci@`, `qa-common-ci@`, `qa-api-hardening@`, `review-api-hardening@` (todas `example.com`). Sem PII real e sem senha em arquivo. Limpar em Authentication + o doc `user` no Firestore | 5 pipelines | P |
| 6 | **Branches mergeadas ainda vivas no remoto — agora 7.** `email/feat/transactional-emails` (PR #9) juntou-se a `api-hardening-flow` (#8), `ci/feat/github-actions-pipeline` (#5), `ci/chore/bump-actions-to-node24` (#7), `specs-feature-planner-agent` (#2), `api/fix/impersonation-read-only` (#3) e `feat/initial-files`. São **8 branches** no remoto, **7 delas mortas**, para **zero** de trabalho em curso. As PRs são mergeadas por squash e as branches ficam | higiene | P |

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

Esta rodada encontrou deriva em **14 das 15 specs** — a maior varredura de deriva até hoje, e o resultado
de remedir **toda** referência em vez de amostrar. **Nenhuma é de implementação divergente**: as 15 specs
descrevem corretamente o que falta. O que apodreceu foi o **endereço** do que falta. Todas corrigidas nos
arquivos.

Três casos são de **substância**, não de número — e esses são os que enganariam quem fosse implementar:

| id | o que a spec afirmava | o que o código mostra | ação |
|----|----------------------|------------------------|------|
| [`onboarding-flow`](onboarding-flow.md) **(o pior da rodada)** | o helper de perfil é **`ensureDefaultUserProfile`**, "chamado nos três caminhos de entrada (`:22`, `:41`, `google/route.ts:19`)"; e atribui o `router.push` ao cadastro por e-mail e o `window.location.replace` ao Google | **`ensureDefaultUserProfile` não existe em lugar nenhum do repo.** O nome real é `createDefaultUserProfile` (`user-merge.ts:47`), com **2** call sites diretos (`:22`, `:41`), ambos internos ao próprio arquivo; a rota do Google chega lá **indiretamente**, via `getMergedUserByUid` em `:16` (`:19` é `return Response.json({`). E os **dois fluxos estão trocados**: `SignUpFormClient.tsx:36-49` é o do **Google** (`router.push` em `:47`), enquanto o `window.location.replace` de `:84` está no `useEffect` (`:62-90`) do cadastro por **e-mail/senha** | **spec corrigida nos 4 pontos.** Uma spec que manda procurar um símbolo inexistente e descreve os fluxos ao contrário custa a primeira hora de quem pegar a tarefa |
| [`teams-organizations`](teams-organizations.md) | a tabela de impacto (`:112`) pede um "template de convite" no `packages/email` | `action-link.tsx:12` é **genérico por slug de dicionário** (`ActionSlug`), então convite é **slug × 3 idiomas**, não componente novo. É exatamente a correção que `auth-recovery-verification` já recebeu na rodada anterior, e que ninguém propagou para esta | **escopo corrigido.** Mesma classe de erro em duas specs: a entrega de e-mail encolheu o trabalho de todas as suas dependentes, não só da primeira |
| [`auth-recovery-verification`](auth-recovery-verification.md) | `:35-36` — a base existe mas os commits "ainda não [foram] mergeados em `main`"; e `packages/security/index.ts:12` "hoje só aplica shield e detecção de bot" | **Mergeada** (PR #9, `400f290`). E o `@repo/security` faz **muito mais** desde `api-hardening`: `checkRateLimit` em `:39` com janela deslizante de 20 req/60 s, no-op em `:43-45` quando falta a chave — a spec descrevia o pacote **antes** de uma entrega inteira | **spec corrigida e desbloqueada.** Acrescentado o requisito concreto que faltava: rota `/auth/reset` nova **não** ganha rate limit até entrar em `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:31-35`) |

As demais são de **referência** — o argumento sobrevive, o endereço não:

| id | correções aplicadas |
|----|---------------------|
| [`cursor-pagination`](cursor-pagination.md) | `BaseRepository` `22-135` → **`22-134`**; `entity.repository.ts:12-33` → **`:11-32`**; `useListEntities.tsx:11-17` → **`:10-17`**; `docs/SETUP.md:127-139` → **`:170-189`** (`:127-139` é o runbook de branch protection, seção errada); o N+1 em `user.repository.ts:42-46` → **`:38-40` + `:52-63`**, que a própria spec já dizia certo 6 linhas antes |
| [`firebase-emulator-seed`](firebase-emulator-seed.md) | `docs/SETUP.md:111-114` → **`:170-180`** (`"modo de produção"` em `:174`) — e a afirmação "não menciona emulador, seed **nem primeiro admin**" ficou **meio obsoleta**: o `SETUP.md` **ganhou** uma seção "Primeiro admin" em `:191`; `apps/api/package.json:11` → **`:13`**; `packages/security/index.ts:16-18` → **`:42-44`** |
| [`observability-logging`](observability-logging.md) | `health/route.ts:3-4` → o arquivo tem **2 linhas**, handler em `:1-2`; `packages/security/index.ts:16-18` → **`:42-44`**, corrigido nas **duas** citações |
| [`account-security-mfa`](account-security-mfa.md) | `provider.tsx:244` → **`:238-239`**; `session.ts:39`/`:41` eram a **declaração de tipo**, os valores são atribuídos em **`:51-53`**; `packages/security/index.ts:16` → **`:43-45`** |
| [`account-settings`](account-settings.md) | `LanguageSwitcher.tsx:37` → a escrita do cookie é **`:50`**; `common-panel.ts:28` → **`:29`**; `paths.ts:10-35` → **`:10-36`** |
| [`cookie-consent`](cookie-consent.md) | `packages/security/index.ts:16` → **`:42-44`**; e `internationalization/utils/cookies.ts:1` estava rotulado como "cookie de idioma" — é um `getCookie` **genérico**, o `"x-locale"` é lido em `client.ts:8` e `server.ts:20` |
| [`file-upload-storage`](file-upload-storage.md) | `formattedError.ts:83` → **`:115`**; `entity.mapper.ts:22` → **linha e direção erradas**: `photo` está em **`:19`** (`toDTO`, leitura), e a escrita é `toPersistence` (`:32-52`, chave em `:41`); `firestore.rules:30` → **`:33`**; acrescentada a duplicata idêntica do schema em `:34`; e o "fallback quando `src` é vazio" (`responsive-image.tsx:27`) era **exagero** — a função `return <></>`, não renderiza nada |
| [`data-rights-lgpd`](data-rights-lgpd.md) | `base.repository.ts:133` → **`:127-129`** (`:131-133` é o `deleteBulk`); aviso de placeholder legal `:27` → **`:28`** |
| [`billing-subscription`](billing-subscription.md) | `common-panel.ts:28` → **`:29`**; `user.repository.ts:11-14` → construtor em **`:11-13`**. Todo o resto reconferido **exato**, inclusive as 6 linhas da tabela de divergência do `docs/PAYMENTS.md` |
| [`audit-log`](audit-log.md) | "varrer `audit` retorna apenas **três** comentários" → são **5 hits** hoje: os 3 comentários (linhas corretas) mais `userProfileSerialization.test.ts:49,53`, que exercitam um campo `audit: { lastSeenAt }` num fixture. Só em teste — a trilha continua não existindo |
| [`e2e-testing`](e2e-testing.md) | `CLAUDE.md:60` → a regra 11 é **`:70`**; "mais 4 em `review/`" → **5**; a `apps/web` não tem 1 arquivo de teste e sim **4**; e o **argumento do gate instável foi suavizado** para refletir 3 execuções verdes. Os números que importam — **9 tasks / 573 testes / 63 arquivos** e o split por workspace — foram reconferidos **exatos** |
| [`dashboard-home`](dashboard-home.md) | a única spec quase limpa: `page.tsx:5` → o literal está em **`:7`**. Precisão que **muda** o argumento a favor: a chave `home` do dicionário **não é morta** — é usada em 8 breadcrumbs; a home é a única tela que a ignora |
| [`teams-organizations`](teams-organizations.md) | além do escopo acima: `entity.repository.ts:12` → método em **`:11`**, `where` em **`:14`**; `firestore.rules:30` → **`:32-34`**; `firestore.rules:37` → **`:39-40`** |

**Nenhuma regressão detectada.** As capacidades das 4 specs arquivadas foram reconferidas: `firestore.rules`
intacto e zero import `firebase/*` na `apps/api`; `.github/workflows/ci.yml` no ar com 10 execuções verdes;
a borda da API com CSP, allowlist e rate limit nos arquivos citados na spec arquivada; e a base de e-mail
com os 7 arquivos de teste e o ramo i18n presentes em `origin/main`.

**Um padrão vale nomear:** `packages/security/index.ts:16` foi citado como "o padrão de opt-in/no-op do
repo" por **quatro** specs diferentes, e estava errado nas quatro — o no-op real é `:42-44`. Uma
referência ruim se propaga por cópia entre specs. Vale conferir a origem antes de reusar um `arquivo:linha`
de outra spec.

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
   inalterado desde 2026-08-22, e a varredura repo-wide confirma que são exatamente 3.

**Nenhuma das duas foi feita até 2026-09-10** — os juros correm há **dezenove dias**, enquanto o backlog
seguiu acrescentando recursos escopados por usuário. Nota: o `depends_on` desta spec **está satisfeito** em
`main` desde hoje (convite por e-mail tem base, e é mais barato do que a spec dizia — slug, não template),
o que não muda o `deferred` mas remove o último argumento técnico para adiar de novo.

## Achados da varredura que não viraram spec

Defeitos e inconsistências encontrados na descoberta e nos pipelines. **Não são funcionalidades** — são
correções pontuais, algumas de minutos. Viram tarefa direta no `/analyze`, sem passar por spec.

> **Auditoria de 2026-09-10.** As **40 linhas** da rodada anterior foram reconferidas **uma a uma** no
> código: **40 seguem descrevendo um defeito real, 0 foram corrigidas.** Seis tinham referência
> desatualizada e foram acertadas; **duas estavam substantivamente erradas** e foram reescritas (marcadas
> ✏️). **2 achados novos** (marcados NOVO). Um terceiro candidato foi **descartado** — ver a nota ao fim
> da seção.

Os primeiros são de **segurança** e foram confirmados diretamente no código.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **Revogar sessão não derruba o ID token.** `verifyIdToken(token)` é chamado **sem o argumento de revogação** (`packages/auth/server.ts:123`), e `resolve-api-actor.ts` tenta o bearer ID token em `:24` (retorna em `:26`) **antes** do cookie em `:34` — que, esse sim, usa `verifySessionCookie(..., true)` (`:193`, com o `true` em `:195`) | `packages/auth/server.ts:123` · `apps/api/(shared)/lib/resolve-api-actor.ts:23-34` | Depois de revogar as sessões, um ID token já emitido continua passando no guard da API até expirar (1 hora). A base está metade correta — e é a metade errada que vem primeiro. **É o item 1 do corte de `account-security-mfa`, e não depende de `account-settings`**: pode ser tarefa direta hoje. |
| 🔴 **`packages/payments/ai.ts:4-5`** tem o defeito gêmeo do que já foi corrigido no `index.ts`: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY \|\| "" })` em **escopo de módulo** | `packages/payments/ai.ts:4-5` | O mesmo padrão no `index.ts` deixava `api#build` vermelho e foi corrigido com `getStripe()` (`index.ts:14-24`). O `ai.ts` não explode hoje **só porque nada importa `@repo/payments/ai`** (zero importadores, medido) — explodiria no primeiro fork que importasse, e `billing-subscription` é justamente o que faria alguém importar. Agrava: `packages/payments/package.json` não tem `exports`, então o subpath resolve por caminho de arquivo. |
| 🔴 **NOVO — `packages/security/index.ts:11` tem o mesmo defeito de escopo de módulo, e num lugar muito pior.** `const arcjetKey = keys().ARCJET_KEY;` roda no **import**, e `@repo/security` é o **primeiro import do `apps/api/proxy.ts:1`** — ou seja, do middleware | `packages/security/index.ts:11` · `packages/security/keys.ts:9-15` | `keys.ts` trata `""` como ausente (`z.preprocess`), o que cobre o caso do `.env.example`; mas exige `.startsWith("ajkey_")`, então uma `ARCJET_KEY` **presente e malformada** lança **dentro do grafo de módulos do middleware**: toda requisição falha, sem sinal no boot — e `instrumentation.ts:23-27`, que só checa presença, **não avisaria**. Efeito secundário: a chave é capturada uma vez e congelada pelo tempo de vida do processo. |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo.** Com `NODE_ENV=production` e a variável ausente, `register()` lança (`apps/api/instrumentation.ts:17-21`) — e **não há `process.exit` em nenhum lugar do arquivo**; o Next imprime `Failed to prepare server` e **fica no ar respondendo 500 a tudo** | `apps/api/instrumentation.ts:17-21` | O efeito pretendido é atingido — nada é servido —, mas uma plataforma que só verifica se a porta responde veria o container **saudável**: um deploy quebrado passaria por bem-sucedido. Ou o health check distingue 5xx, ou o gate chama `process.exit(1)`. |
| 🟡 **`apps/app/app/layout.tsx:3` importa `@repo/analytics` sem `apps/app/package.json` declarar** a dependência — funciona por hoisting do pnpm. Reconferida a lista inteira de deps (`:13-38`): não há `@repo/analytics` **nem `@repo/email`** | `apps/app/app/layout.tsx:3` · `apps/app/package.json:13-38` | Além do risco de resolução, **o turbo não invalida `app#*` quando `@repo/analytics` muda** — cache mentindo num gate que roda em toda PR. |
| 🟡 ✏️ **`apps/app/env.ts:1` importa `@repo/email/keys` sem `apps/app/package.json` declarar `@repo/email`** — mesma classe do achado acima, e com consequência maior | `apps/app/env.ts:1` · `apps/app/package.json:13-38` *(ref corrigida: era `:15-22`)* | `transactional-emails` **elevou a aposta**: o `keys.ts` do pacote não tem `skipValidation` e **valida de fato no boot** dos 3 apps. Uma dependência não declarada está no caminho de inicialização da `apps/app`. `apps/web` (`package.json:18`) e `apps/api` (`:22`) **declaram** o pacote; só a `app` não. |
| 🟡 **Toda a base de e-mail é inalcançável pela UI.** `welcomeEmail` e `actionLinkEmail` não têm chamador de produção; o `contact` tem um (`apps/web/…/contact/actions/contact.tsx:16`) cujo único chamador é um **teste** (`contactAction.test.ts:26`) | `apps/web/…/contact/components/contact-form-client.tsx` · `…/contact/actions/contact.tsx:16` | O formulário da landing é maquete: **sem elemento `<form>`**, botão em `:139` sem `onClick` nem `type="submit"`, e campos (`date:72`, `firstname:112`, `lastname:121`, `resume:130`) que não correspondem aos parâmetros `(name, email, message)` da action. Bug de produto **pré-existente**, mas o efeito é que 131 testes exercitam código que nenhum usuário alcança. Decisão deliberada (a spec pedia a base, não a feature) — **fica registrado para não virar surpresa** quando `auth-recovery-verification` for a primeira a chamar de verdade. |
| 🟡 **`provider-error` não distingue três falhas diferentes.** Cota estourada, domínio não verificado e chave revogada produzem o **mesmo** `reason` e a **mesma** linha de log (`:121-122` no ramo de erro, `:127-129` no catch) | `packages/email/index.ts:121-129` | Descartar o objeto de erro é **correto e deliberado** — ele carrega o endereço do destinatário (comentário em `:127`), e há teste que reprova quem o logar. Mas ninguém distingue "acabou a cota" de "revogaram a chave" sem abrir o painel do provedor. **Pertence a [`observability-logging`](observability-logging.md)**, onde já está registrado como o primeiro custo medido da falta de log estruturado. |
| 🟡 **`emailBrand.supportEmail` é configuração morta.** `grep supportEmail` em `apps` + `packages` devolve **uma** ocorrência: a própria definição | `packages/email/brand.ts:9` | Um fork vai editá-lo achando que muda alguma coisa. Ou vira rodapé de suporte nos templates, ou sai. |
| 🟡 **`utils.ts` e `utils/` convivem no `@repo/internationalization`** e o caminhador do React Email resolve o diretório. Confirmado que não existe `utils/index.ts` | `packages/internationalization/utils.ts` · `packages/internationalization/utils/cookies.ts` | O preview da 3003 imprime em loop `Could not find index file for directory at …/internationalization/utils`. **Nada quebra** (o `exports` map aponta o arquivo e os 9 previews renderizam), mas o log fica sujo — e é o tipo de ruído que faz alguém ignorar um erro real ao lado. Limpeza: `utils/index.ts` ou renomear `utils/cookies.ts`. |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** — as chaves são só `name, version, private, scripts, dependencies, devDependencies` | `packages/email/package.json` | `@repo/email`, `@repo/email/keys` e `@repo/email/templates/contact` resolvem **só** pelo alias TS `@repo/*` → `../../packages/*`, nos 4 pontos de import. Funciona hoje; quebra em qualquer consumidor que resolva por Node. Dívida real, deliberadamente não corrigida na entrega (risco de quebrar imports por ganho zero). |
| 🟡 **`skipValidation: true` faz o t3-env descartar os `extends`**, então o bloco `client` da `apps/web` parece validar e não valida. Causa raiz reconferida no pacote instalado: `@t3-oss/env-core/dist/src-Bb3GbGAa.js:36-37` é literalmente `const skip = !!opts.skipValidation;` / `if (skip) return runtimeEnv;` — retorna **antes** de montar o schema (`:42`) e mesclar os `extends` | `apps/web/env.ts:22`, `:8`, `:13-16` | Causa raiz de vários sintomas. **Ainda aberto** — `transactional-emails` **contornou** (as chaves de e-mail passaram a ser lidas dentro do `@repo/email` via `keys()`, não pelo `env`) e **não corrigiu**; o comentário em `:10-12` hoje **documenta o contorno**. O raio continua sendo header/CTA/pricing da landing: `NEXT_PUBLIC_APP_URL` não está no bloco `client` da web e chega `undefined`, então o CTA "Ir para o painel" cai no fallback. Pior que o bug: o bloco `client` tem **forma** de validação e não valida nada. |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento.** `apps/api/env.ts:30` usa `skipValidation: process.env.NODE_ENV === "development"`; nesse modo o t3-env descarta as chaves vindas de `extends` (`:9`), e `env.STRIPE_WEBHOOK_SECRET` é `undefined` em `next dev` | `apps/api/env.ts:9,30` | Mesma causa raiz do anterior — os dois deveriam ser corrigidos juntos. O guard cai sempre no ramo `"Not configured"`, então `pnpm --filter api dev:with-stripe` **não pode funcionar**. |
| 🟡 **Webhook da Stripe é casca.** Roteia só `checkout.session.completed` (`:50`) e `subscription_schedule.canceled` (`:54`); os dois handlers (`:8-16`, `:18-25`) são stubs `// TODO` (`:11`, `:21`) cujo corpo faz apenas `if (!data.customer) return;` — o próprio arquivo admite na linha 1 | `apps/api/app/(routes)/webhooks/payments/route.ts` | A assinatura **é** validada (`:43`); nada é persistido, e não há dedupe por `event.id`. Escopo de `billing-subscription`. `:63` devolve `{ result: event, ok: true }`, ecoando o objeto Stripe inteiro na resposta. |
| 🟡 **`FormattedError.retryAfterSeconds` não tem consumidor** fora dos testes (`apiErrorCopy.test.ts:145,150,153,156`) | `packages/shared/utils/helpers/formattedError.ts:13,20,90-102` | Toda a cadeia para levar a espera até a tela está pronta — `Retry-After` no 429, `Access-Control-Expose-Headers` para o script poder lê-lo, o parse do delta-seconds — e **para no último metro**: o toast diz "aguarde um instante", sem o número que o servidor mandou. |
| 🟡 **`isRateLimitEnforced()` é export morto.** `packages/security/index.ts:32` exporta o predicado e **ninguém** o chama fora de `rateLimit.test.ts` | `packages/security/index.ts:32` | O papel que ele cumpriria acabou coberto pelo aviso de boot (`instrumentation.ts:23-27`), que lê `process.env.ARCJET_KEY` direto. Duas fontes de verdade para o mesmo fato, e a que tem nome não é a usada. |
| ⚪ **Um `useList*` que falha renderiza o estado vazio, não erro.** Um 429 na lista de entidades mostra "Nenhuma entidade cadastrada" | `apps/app/…/entities/(hooks)/useListEntities.tsx:11,16` · `…/(home)/EntitiesListClient.tsx:145-159` | O hook **devolve** `error` (`:16`); `grep -n error` no componente devolve **zero linhas** — ele só passa `locale={{ emptyText }}` (`:148`) à `Table` e **nunca lê** `error`. Lista que falhou fica indistinguível de lista vazia, e o usuário conclui que apagaram os dados dele. Vale para todo `useList*` no mesmo padrão. |
| 🟡 **`update()` do `BaseRepository` reescreve o documento inteiro e corrompe o tipo de `createdAt`.** `:102-117` lê via `findById()` em `:104` (que passa pelo mapper e devolve `createdAt` **serializado como string ISO**), faz spread em `:106-110` e grava tudo de volta em `:114` | `apps/api/(shared)/repositories/base.repository.ts:102-117` | ⚠️ **Preservado de propósito** em `firestore-admin-access` (migração *contract-preserving*). Depois do primeiro `PUT` o campo deixa de ser `Timestamp` e vira `String`: consulta por range/`orderBy` mistura tipos. **Cruza diretamente com `cursor-pagination` (#5)**, que precisa de `orderBy` estável. |
| 🟡 **`userRepository.list()` mente no tipo de retorno**: declara `Promise<UserDTO[]>` (`:32`) mas devolve o merge com o Firebase Auth, que é `UserWithAuthDTO` (cast em `:56`) | `apps/api/(shared)/repositories/user.repository.ts:32,52-63` | O SDK **já declara o tipo certo**, então a mentira está só no repositório — e obrigou o teste a fazer cast para ler o campo. |
| 🟡 `delete()` herdado por todo repositório é **soft delete**: grava `deletedAt` e nada mais | `apps/api/(shared)/repositories/base.repository.ts:127-129` | O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. Bloqueia o item 3 de `data-rights-lgpd`. |
| 🟡 **Documentação descreve como implementado um fluxo de pagamentos que não existe** | `docs/PAYMENTS.md:5-12` (`docs/SECURITY.md` diz o **oposto**, e está certo) | Pior classe de erro de documentação: mente com aparência de autoridade. **Reconferido item a item nesta rodada — dos 6 bullets de "Estado atual (implementado)", só `:7` é verdadeiro.** São falsos: `:8` (3 rotas `/payments/*` — o diretório não existe — e eventos `customer.subscription.updated\|deleted`, quando o código roteia `subscription_schedule.canceled`), `:9` (`UserDTO.subscription` e `updateSubscriptionByReferenceId`, zero hits no repo), `:10` (`apiClient.payments.*`, zero hits em `packages/sdk/src`), `:11` (tela "Minha assinatura") e `:12` (descreve idempotência de handlers que são `// TODO`). Corrigir a doc **independe** de implementar a spec. |
| 🟡 `packages/auth/package.json:12` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth/package.json:12` | Export quebrado — `client-ui.tsx` não está no disco. Zero importadores, então falha em silêncio hoje; o primeiro `import "@repo/auth/client-ui"` quebra na resolução. **Sexta auditoria consecutiva.** |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` dos três apps (e de `next-config`, `internationalization`, `seo`) | `packages/auth/package.json:24` | Origem do aviso `deprecated next@15.5.2` no `pnpm install`. Um pacote de **autenticação** — dono de middleware, cookie de sessão e código adjacente ao proxy — resolvendo uma major diferente do runtime que o consome é risco desproporcional ao esforço de alinhar. |
| 🟡 `chart.tsx` é código morto — `recharts` pesa no bundle sem uso | `packages/design-system/components/ui/chart.tsx` | 11 KB no disco, exportado no barrel (`components/ui/index.ts:8`), `recharts` declarado em `package.json:31`, e `grep ChartContainer\|ChartConfig\|recharts` em `apps`+`packages` (fora do próprio arquivo) retorna **zero**. `dashboard-home` (#11) é a spec que o resgataria. |
| 🟡 **`input-otp.tsx` é código morto**, sem nenhum consumidor | `packages/design-system/components/ui/input-otp.tsx` | Mesma classe do `chart.tsx`: exportado em `index.ts:27`, dep em `package.json:21`, e a única outra ocorrência é a **string** `"input-otp"` numa lista de nomes em `playground/page.tsx:145` — não é import nem render. `account-security-mfa` é a spec que o usaria. |
| 🟡 **Dependências de instrumentação instaladas e nunca importadas:** `import-in-the-middle@^2.0.0` (`:26`) e `require-in-the-middle@7.5.2` (`:35`) | `apps/app/package.json:26,35` | São as dependências típicas de OTel/Sentry e dão **zero** importações em todo `apps`+`packages`. Hoje é peso morto — e **não** contam como evidência de observabilidade. |
| 🟡 `photo` é `z.string().trim().max(PHOTO_URL_MAX)` — qualquer texto passa, não é URL validada, nos **dois** schemas (create `:23`, update `:34`; o limite de 2048 vem de `:7`). O front **valida** como URL, a API não | `apps/api/(shared)/validation/entity.schema.ts:7,23,34` | Validação que só existe no navegador é o anti-padrão que a regra de ouro 4 proíbe. **Consequência:** com `img-src` sendo uma allowlist explícita, uma `photo` de host arbitrário é bloqueada pela CSP em runtime — a falha saiu do banco e chegou à tela. |
| 🟡 ✏️ **Strings de UI soltas, fora do dicionário** — `"Switch language"` (`sr-only`) nos dois language switchers, `"Início"` + `href="/painel"` no breadcrumb, `"Sair"` no ProfileDropdown, os 8 títulos de `routes.tsx` | `LanguageSwitcher.tsx:79` · `apps/web/…/language-switcher.tsx:68` · `PageBreadcrumb.tsx:28,30` · `ProfileDropdown.tsx:51` · `(common)/routes.tsx:43,47,51,55,66,70,74,78` *(ref corrigida: era `:37-81`)* | Viola a regra de ouro 2. Agrava no `sr-only`: é **exatamente** o texto que só o leitor de tela recebe, e fica sem tradução para quem mais depende dele. Os 8 títulos convivem com 8 `url: "#"` (`:44,48,52,56,67,71,75,79`) — é o mesmo bloco de menu inacabado. |
| 🟡 String `"Home"` literal fora do dicionário nas duas home pages — **e a chave já existe e é usada em 8 outras telas** (`translations/apps/app/pages/common/routes/index.ts:3,17,31`, consumida via `(common)/paths.ts:12`) | `apps/app/…/(common)/(pages)/page.tsx:7` · `…/(admin)/admin/(pages)/page.tsx:7` | Viola a regra de ouro 2 com a tradução pronta ao lado — e comprovadamente funcionando em todo breadcrumb do painel. |
| 🟡 **`setTimeout` sem cleanup** no `useEffect` do carrossel: `:24-38` agenda o avanço em `:29` e não devolve função de limpeza, com `[api, current]` nas dependências (`:38`) | `apps/web/…/(home)/components/cases-client.tsx:24-38` | Um timer é agendado a cada avanço e nenhum é cancelado na desmontagem, chamando `setCurrent` em componente morto. É a home da landing: o caminho mais percorrido do repo. |
| 🟡 ✏️ **`hydration mismatch` num `id` do Radix + "Select is changing from uncontrolled to controlled"** — inspeção desta rodada isolou **dois** mecanismos independentes | `PanelNavbarControls.tsx:29,278` · `Sidebar.tsx:99-157` *(ref corrigida: era `:96-154`)* | (a) `useIsMobile()` (`:29`) começa `undefined` e só resolve no `useEffect`, enquanto `:175` ramifica a subárvore inteira em `isMobile` — SSR e primeira renderização divergem; (b) `value={impersonatedFirebaseUid ?? undefined}` (`:278`) num `Select` que um efeito pós-mount (`:157-169`) preenche via `setImpersonatedUser` é exatamente o `undefined→string` do aviso do Radix. O `Collapsible` de `Sidebar.tsx:99` é montado pelos **dois** painéis, então o aviso aparece em **toda carga do painel**, sem interação. Contradiz a regra do escopo de resolver no servidor todo estado de UI persistido no browser. |
| ⚪ **A landing `/contact` acusa 5 erros de hidratação** (`<a>` dentro de `<a>`) vindos do `NavigationMenu` do header — mecanismo confirmado no código: `header/index.tsx:82-88` põe um `<Link>` do Next dentro de `<NavigationMenuLink>`, que o Radix renderiza como `<a>` | `apps/web/…/components/header/index.tsx:82-88` | Pré-existente e independente da entrega de e-mail, mas apareceu na validação visual dela. A contagem "5" exige rodar a página; nesta rodada só o caminho de código foi reconferido. |
| 🟡 **`/auth/sign-in` e `/auth/sign-up` da api não têm consumidor nenhum e não seguem o contrato `{ error: { code } }`** — devolvem string crua (`sign-in/route.ts:12`, `sign-up/route.ts:26,40`); a primeira responde **500** para credencial inválida, e nesta rodada ficou claro **por quê**: não há `try/catch` em volta de `identitySignInWithPassword` (`:7`), que lança `IdentityToolkitError` | `apps/api/app/(routes)/auth/sign-in/route.ts` · `sign-up/route.ts` | Viola a regra de ouro 3. `api-hardening` pôs rate limit nessas duas rotas — protegeu endpoints que **ninguém chama e que respondem errado**. A decisão certa provavelmente é removê-las, não consertá-las; enquanto existem, são POST público sem guard queimando cota da Identity Toolkit. |
| 🟡 **`turbo run` aborta na primeira falha** (`--continue=false` é o default), então uma PR com dois tipos de defeito mostra só o primeiro | `.github/workflows/ci.yml:39` | Foi confirmado na prática na rodada anterior: quando `app#test` falhou, `api:test` e `app:typecheck` foram abortados e o log disse `20 successful, 23 total`. É o comportamento correto, mas quem ler o log da PR verá tasks "não rodadas" e pode se confundir. |
| 🟡 **`apps/app/next.config.ts:19` lista `www.google.com` em `images.domains`** sem uso e sem `remotePattern` correspondente (`:20-25` nomeia só `lh3.googleusercontent.com`); `domains` está **deprecado** no Next 16 | `apps/app/next.config.ts:19` | Origem sem uso numa lista de hosts confiáveis de imagem é superfície gratuita — e **divergente** da CSP, que nomeia só `lh3.googleusercontent.com`. Duas allowlists de imagem que discordam. |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`** (`:13`); `isSameOriginRequest` **retorna `true` quando não há header `Origin`** (`:68-70`) | `packages/shared/utils/helpers/cookies.ts:13` · `packages/auth/session.ts:66-70` | ASVS 5.0 L1 (3.3.1) exige `Secure`. O helper hoje só grava `x-locale`, **não** o cookie de sessão. Sobre o segundo: `api-hardening` adotou **a mesma** decisão na borda, mas com o porquê escrito e um limite explícito (`cors.ts:42-52`); o de `session.ts` continua sem — e `grep -i csrf` no repo devolve **1** hit, que é o comentário de `session.ts:62`. |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta.** O cliente grava com TTL (`LanguageSwitcher.tsx:50`, `web/…/language-switcher.tsx:44`), mas na requisição seguinte os proxies fazem `cookieStore.set("x-locale", …)` **sem `maxAge`/`expires`** | `apps/app/proxy.ts:130,134` · `apps/web/proxy.ts:92,96` · `packages/shared/utils/helpers/cookies.ts` | O idioma escolhido **não sobrevive ao fechamento do navegador**, porque é rebaixado a cookie de sessão. Bug de produto silencioso: ninguém reclama, todo mundo reescolhe o idioma. |
| 🟡 **Casamento exato de rota no rate limit deixa variações de fora.** `RATE_LIMITED_PATHS.includes(pathname)` (`:37-39`) não pega `/auth/sign-in/` (barra final) nem futuras `/auth/sign-in/*` | `apps/api/proxy.ts:31-39` | Decisão consciente do `/review`: `startsWith` limitaria `/auth/sign-in/google` duas vezes — e essa justificativa **se sustenta**, porque a rota existe de fato (`auth/sign-in/google/route.ts`). Há teste fixando o comportamento. Revisitar quando entrar a 4ª rota pública. |
| ⚪ ✏️ **`cors.ts` allow-lista um header que nenhum código do repo envia** — e o nome registrado até hoje estava **errado**: não existe header `"n"` no arquivo. O inútil é **`x-locale` (`:16`)** | `apps/api/(shared)/lib/cors.ts:16` | Medido nesta rodada: `x-locale` existe **só como cookie** (lido em `internationalization/client.ts:8` e `server.ts:20`, escrito pelos proxies e pelos switchers) — **nunca** como header de requisição. Resíduo. **`x-role` (`:15`) NÃO é resíduo** e não deve ser removido junto: o SDK o envia (`packages/sdk/src/client/base.ts:53`) e a API o lê (`auth-request-context.ts:100`). |
| 🟡 **NOVO — o papel do painel viaja em dois headers ao mesmo tempo.** O SDK põe `AUTH_REQUEST_HEADER.REQUEST_ROLE` (`base.ts:45-46`) **e** um `"x-role"` cru (`:53`), e a API lê o segundo como `legacyXRole` (`auth-request-context.ts:100`), usando-o como fallback em `:119` | `packages/sdk/src/client/base.ts:53,61,95` · `apps/api/(shared)/lib/auth-request-context.ts:100,119` | Dois nomes vivos para o mesmo fato, com o "legacy" sendo **escrito em toda requisição autenticada** — não é resíduo histórico, é duplicação ativa. Mesma classe do achado do `cors.ts` e a limpeza natural é conjunta: se `x-role` sair do SDK, o `:16` do CORS e o fallback `:119` saem com ele. |
| 🟡 ✏️ **`useHealthCheck` foge do padrão de hooks de dados do escopo** — mas **não** pela regra registrada até agora | `apps/app/shared/hooks/useHealthCheck.ts:11,29` | Correção desta rodada: o `useQuery` direto em `:29` **não** viola a regra do `useAuthorizedQuery`, porque `health/route.ts` é um `GET` público de 2 linhas, sem guard. A violação real é outra e é do `apps/app/CLAUDE.md`: `getApplicationHealthCheck` (`:11`) **não é exportado**, e o escopo exige que o hook exporte também a função imperativa no mesmo arquivo. |

> **Um candidato a achado foi descartado por erro de medição, e fica registrado para não voltar:** a
> hipótese de que `apps/api/proxy.ts:34` limitaria uma rota inexistente (`/auth/sign-in/google`) veio de um
> `ls` **não recursivo**. A rota existe: `apps/api/app/(routes)/auth/sign-in/google/route.ts`, aninhada
> dentro de `sign-in/`. São 4 rotas em `auth/`, não 3 — e a justificativa registrada para recusar
> `startsWith` no rate limit continua válida.

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
| **Consertar o formulário de contato da landing** | — | ⚠️ **Não é spec, é achado** (está na tabela acima). O formulário é maquete e a action que ele deveria chamar já existe, funciona e tem teste. É correção pontual de esforço P, não funcionalidade nova — vai direto ao `/analyze`. Registrado aqui porque a entrega de `transactional-emails` o deixou a um passo de funcionar, e é fácil confundir com escopo de spec. |
| Provedor de e-mail plugável (SES/Postmark) | — | Explicitamente fora do corte de `transactional-emails`: "só quando algum fork pedir". Nada mudou — e a spec agora está arquivada, então reabrir exige spec nova. |
| Rastreio de abertura/clique em e-mail | — | Fora do corte de `transactional-emails`: arrasta discussão de privacidade sem valor para um MVP. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto **é** uma API. Webhook de saída bem-feito (HMAC, retry com backoff, DLQ) é esforço G. |
| Sessões e dispositivos gerenciáveis | 1/10 | Absorvido pelo corte de `account-security-mfa`. |
| Widget de feedback | 1/10 | Terceirizar é mais racional que manter no core. |
| Referral / afiliados | 0/10 | Nenhuma referência do painel entrega. A pesquisa classifica como discurso de blog; o mercado resolve com produto de terceiro. |
| SSO enterprise · SCIM | 0/10 | Território de provedor especializado. Só entra com o primeiro contrato enterprise — e aí não é mais boilerplate. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | Estavam no "fora do corte" de `ci-pipeline` porque dependiam de um CI verde e estável. **A condição está mais perto do que na rodada anterior:** o CI está em `main`, verde em **10** execuções, e o teste instável **não reproduziu em 3 execuções forçadas** — mas a causa estrutural (nenhum `testTimeout` declarado em 9 configs) segue, então "estável" ainda é afirmação sem prova. **Argumento a favor de Renovate:** as três actions do `ci.yml` miravam Node 20 (removido em 2026-09-23) e **nenhuma validação local pegou, nem o `act`** — só apareceu quando o workflow rodou na plataforma. Um bot teria aberto essa PR meses antes. |
| Remote Cache do Turbo | prática 1 | É a única peça que arrasta conta e env, e o ganho só aparece com o CI estável. Entra quando doer, com medição — e como opt-in por variável ausente, no padrão do `ARCJET_KEY`. |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das **9** configs de Vitest declara cobertura: não há número para discutir. Medir primeiro, gatear depois, e só em pastas críticas. Relatório por workspace **não soma** — exige consolidação na raiz. Cruza com `e2e-testing`, que traz a medição no corte. |
| Changesets / versionamento | opcional-forte | Com pacotes `private: true` e forks que divergem, o valor seria só o changelog. Não paga o processo agora. |
| Storybook | não apareceu no painel | O `playground` já serve de catálogo vivo dos componentes. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork, não do core. |
