# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue**. Spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última rodada:** 2026-09-28 (`/spec --sync`, dentro de um `/cycle` autônomo, pós-merge da PR #30) ·
> **anteriores:** 2026-09-27 (PR #29) · 2026-09-26 (`/spec` de descoberta, pedida pelo usuário) · 2026-09-26
> (PR #28) · 2026-09-25 (PRs #26 e #27) · 2026-09-25 (PR #25) · 2026-09-24 (PR #24) · 2026-09-23 (PR #23) ·
> 2026-09-23 (PR #22) · 2026-09-19 (PR #21) · 2026-09-17 (PR #20) · 2026-09-17 (PR #19) · 2026-09-17 (PR #18) ·
> 2026-09-16 (PR #17) · 2026-09-16 (PR #16) · 2026-09-16 (PR #15) · 2026-09-16 (PRs #13 e #14) · 2026-09-15 ·
> 2026-09-14 · 2026-09-11 · 2026-09-10 · 2026-09-09 (2 rodadas) · 2026-09-02 · 2026-09-01 (3 rodadas) ·
> 2026-08-31 · **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`brand-config` foi entregue e arquivada** em
>    [`docs/features/brand-config/spec.md`](../docs/features/brand-config/spec.md). Os cinco itens do corte foram
>    conferidos no código, e a PR #30 (`e07252a`) está em `main` com CI verde no SHA de merge. É a primeira spec
>    entregue que passou pelo gate `approved`. Detalhe em [Entrega confirmada](#entrega-confirmada-brand-config-pr-30).
> 2. **Quatro achados fechados pela entrega**: o `/favicon.ico` do app, o `emailBrand.supportEmail` morto, o
>    `NEXT_PUBLIC_APP_NAME` lido sem declaração e o "Acme"/"company name". Duas linhas do `docs/SETUP.md` deixaram
>    de estar defasadas. A pergunta do depoimento de exemplo saiu de "Precisam de decisão": a entrega adotou a
>    recomendação.
> 3. **Gates remedidos com `--force`**: 27/27 tasks (a task `@repo/next-config#test` é nova), 772 arquivos no
>    `pnpm check`, 2208 testes em 209 arquivos. **A primeira execução falhou** por um erro não tratado em
>    `useListAuditEvents.test.tsx`, que não mudou desde a PR #18. Em seis execuções da suíte da `apps/app`, duas
>    falharam. Virou achado; ver [Gates](#gates-medidos-nesta-auditoria).
> 4. **Âncoras corrigidas** em duas specs (`observability-logging`, `teams-organizations`) e em oito achados, todas
>    deslocadas por arquivos que a PR #30 alterou.
> 5. **Lotes recalculados**: cinco specs elegíveis. O lote 1 passa a ser `storage-emulator-rules-tests`,
>    `accessibility-conformance` e `account-email-change`.
> 6. **Recomendação de #1:** `storage-emulator-rules-tests`, que já era a #2 escolhida pelo usuário.

## Contadores

Sobre as **8 specs que seguem em `specs/`**. Recontados do disco em 2026-09-28, lendo o frontmatter de cada
arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 1 |
| `approved` | 4 |
| `in-progress` | 2 |
| `done` (arquivadas) | 21 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `confianca` 3 (2 `approved`, 1 `in-progress`) · `dx` 2 (1 `approved`, 1 `in-progress`) ·
`produto` 3 (1 `approved`, 1 `proposed`, 1 `deferred`). **Por esforço:** P 1 · M 6 · G 1. **Por valor:**
alto 4 · médio 4 · baixo 0.

**Transições aplicadas: 1**, `brand-config` `in-progress → done`, com o corte inteiro confirmado no código e a
PR #30 em `main`. A spec foi movida com `git mv` para `docs/features/brand-config/spec.md`. O movimento está
no índice do git e ainda não foi commitado.

> **A fila elegível tem cinco specs**, quatro delas aprovadas. Ficam fora `account-security-mfa` e
> `observability-logging` (`in-progress`; a segunda estacionada em E1) e `teams-organizations` (`deferred`,
> E2).

## Tarefas diretas entregues (sem spec)

Correções que vieram de achados deste arquivo, sem spec própria. Ficam registradas aqui porque a pasta
`docs/features/<slug>/` delas não tem `spec.md`.

| feature | PR | achados fechados |
|---------|----|------------------|
| [`i18n-hydration-admin-delete-billing`](../docs/features/i18n-hydration-admin-delete-billing/STATE.md) | #28, `295c8de`, 2026-09-26 | hidratação do dicionário client em `/en` e `/es`; A2 (arquivamento pelo admin sem cancelar a assinatura) |

### O que foi conferido no código

| achado | veredito | evidência |
|--------|----------|-----------|
| Componente client renderizava em pt-br no servidor em `/en` e `/es` e a hidratação falhava | **fechado** | `getDictionary()` do client lê o locale do `LocaleProvider` (`packages/internationalization/client.ts:40-45`, `:47-57`), alimentado pelo segmento `[locale]` via `useParams()`; o provider está montado nos root layouts (`apps/app/app/layout.tsx:77`, `apps/web/app/[locale]/layout.tsx:34`). Os 63 call sites não mudaram. `AuthProvider` passou a `useDictionary()` (`packages/auth/provider.tsx:12`) para acompanhar a troca de idioma. Testes novos: `localeProvider.test.ts` e `authProviderLanguageSwitch.test.tsx` |
| A2: o soft delete pelo admin não cancelava a assinatura | **fechado** | `DELETE /users/[id]` chama `cancelLiveSubscription` antes do soft delete (`apps/api/app/(routes)/users/[id]/route.ts:157`) e responde 503 `USERS_DELETE_BILLING_FAILED` quando a cobrança falha (`:158-167`), com o código traduzido nos 3 idiomas (`translations/packages/shared/utils.ts`). Teste novo: `usersAdminDeleteBilling.test.ts` |

A PR também corrigiu, além do escopo, o aninhamento de `a > button > a` e `button > a` no header da
`apps/web` (`header/index.tsx`, teste `headerInteractiveNesting.test.tsx`). O mesmo padrão `Button > Link`
segue no hero, no CTA, no FAQ e na página de preços; o achado da allowlist de acessibilidade foi atualizado.

**O que continua aberto, vindo desta entrega:**

- O `getDictionary()` **do servidor** ainda lê o cookie `x-locale`, não a URL. Na primeira visita a `/en` sem
  cookie, a `apps/web` sai com Server Components em pt-br e componentes client em inglês, e as duas apps
  saem com `<html lang="pt-br">`. Era a pergunta 3 da seção 14 do plano da feature. Os dois achados antigos
  sobre isso viraram um só, na seção de UI.
- Lacunas de teste que o `/test` deixou abertas: cancelamento que passa seguido de soft delete que falha
  (Firestore fora) e duplo clique no "Sim" do arquivamento. O cancelamento real numa conta Stripe segue 🔒.
- O `STATE.md` da feature traz `spec: none (achados BACKLOG.md:430 e :502)`. As linhas citadas eram do
  arquivo anterior a esta rodada; o `STATE.md` fica como está, porque a auditoria só escreve em
  `docs/features/` para arquivar spec.

## Entrega confirmada: `brand-config` (PR #30)

A PR #30 entrou em `main` como `e07252a` ("feat: brand config in one place and a fork guide") em 2026-09-28 às
13:51 UTC, da branch `feat/brand-config`. Os quatro checks passaram antes do merge (`gh pr view 30`) e a
execução de merge também: `gh run 36431584408`, `success` em `changes`, `verify`, `coverage` e `e2e`. A PR foi
um squash que levou junto a descoberta e a auditoria de 2026-09-26 e 2026-09-27 (as seis specs novas e o
`BACKLOG.md`).

A auditoria de 2026-09-28 conferiu os cinco itens do corte no código:

| item do corte | o que o código mostra |
|---------------|-----------------------|
| 1. fonte única | `getBrand()` em `packages/next-config/brand.ts:51-60`, variáveis declaradas em `packages/next-config/keys.ts:45-47`; 14 arquivos de produção leem dali (12 por `getBrand()`, os dois proxies por `getBrandLogoOrigin()`), entre eles `Sidebar.tsx:68`, `(unauthenticated)/layout.tsx:16`, `header/index.tsx:37`, `packages/seo/metadata.ts:39` e `packages/email/components/layout.tsx:39` |
| 2. nenhum "Acme" de marca | `git grep -i "acme\|company name"` em `apps/` e `packages/`, fora de `__tests__`: 3 linhas, o seed (duas) e o comentário de `packages/email/keys.ts:22`, exatamente o que o sinal de pronto admitia |
| 3. favicon do app | `apps/app/app/favicon.ico`, `icon.png`, `apple-icon.png`; `/favicon.ico` `200 image/x-icon` medido pelo `/test` em `next start`; teste `appIcons.test.ts` |
| 4. roteiro de fork | `docs/FORKING.md`, 12 passos numerados; `docs/SETUP.md:87-99` e `README.md` apontam para ele |
| 5. modo degradado | todo campo de `getBrand()` tem padrão; os três `.env.example` publicam as variáveis vazias (`apps/app/.env.example:76-78`, `apps/web/.env.example:58-60`, `apps/api/.env.example:83-85`) e o CI passa assim |

**Veredito:** 5/5. A spec passou a `done` e foi arquivada. O `/test` fechou com 14 ✅, 0 ❌ e 1 🔒 (nome não
ASCII na caixa de entrada da Resend). O que a entrega fez além do corte (logo na CSP, nome da marca no
remetente, item 13 do `PRE-PRODUCTION.md`) está registrado na spec arquivada.

**Deriva de pipeline, pela segunda PR seguida:** o `docs/features/brand-config/STATE.md` diz `branch: -` e "16
commits aguardam aprovação", mas a PR saiu como um squash da branch `feat/brand-config`. O nome da branch, como
o da PR #29, não segue o padrão `<project>/<type>/<title>` de `.claude/rules/git-commits.md`. Pela §5.1 da
`cycle-policy`, a segunda aparição sai do relatório: virou a linha E11 de [Decisões estacionadas](#decisões-estacionadas-51).
A auditoria não reescreve o `STATE.md`.

## Entrega parcial confirmada: fatia 1 de `account-security-mfa` (PR #29)

A PR #29 entrou em `main` como `597f641` ("feat: password policy and API sign-up") em 2026-09-26 às 17:07
UTC, da branch `feat/account-security-password-policy`. Os quatro checks passaram antes do merge (`gh pr view
29`) e a execução de merge também: `gh run 36257926749`, `success` em `changes`, `verify`, `coverage` e `e2e`.

A auditoria de 2026-09-27 conferiu o item 4 do corte no código, um ponto por vez:

| o que a fatia prometia | o que o código mostra |
|------------------------|-----------------------|
| regra de senha num lugar só | `packages/shared/utils/helpers/passwordPolicy.ts:2-10`: `PASSWORD_MIN_LENGTH = 8`, `PASSWORD_MAX_LENGTH = 1024`, `EXISTING_PASSWORD_MIN_LENGTH = 6` |
| as 11 cópias de `MIN_PASSWORD_LENGTH = 6` somem | `git grep "MIN_PASSWORD_LENGTH ="` em `apps/` e `packages/`: **0**. Os oito schemas de formulário (seis na `apps/app`, dois na `apps/web`) importam as constantes |
| a borda da API recusa senha curta | `apps/api/(shared)/validation/password.schema.ts:10-18` e `:29-33` (`400 AUTH_PASSWORD_TOO_SHORT`), aplicado no cadastro e na redefinição (`auth.schema.ts:23`, `:28`, `:82-83`), na troca (`account.schema.ts:46-47`, `:125-126`) e na criação pelo admin (`users/route.ts:48-49`); código traduzido nos 3 idiomas (`translations/packages/shared/utils.ts:73`, `:187`, `:300`) |
| cadastro passa pela API | `apiClient.authApi.signUp` em `SignUpFormClient.tsx:114` e `sign-up-form-client.tsx:36`; rota `auth/sign-up/route.ts:19-77` cria a conta pelo Admin SDK; `git grep createUserWithEmailAndPassword` em `apps/` e `packages/`: **0**; `packages/auth/components/sign-up.tsx` apagado |
| login e senha atual seguem aceitando 6 | `signInSchema.ts` das duas front-ends e `existingPasswordSchema` usam `EXISTING_PASSWORD_MIN_LENGTH` |
| segundo fator e sessões ficam para depois | `git grep -niw` por `multiFactor`, `TOTP` e `passkey`: **0** |

**Veredito:** item 4 entregue. A spec passou a `in-progress` com `feature: account-security-mfa` e **não** foi
arquivada, porque os itens 2, 3 (resíduo), 5 e 6 seguem abertos. O estado das fatias ficou escrito na própria
spec.

**O que a fatia deixou de fora, por decisão do plano:** a checagem contra as senhas mais comuns (ASVS 6.2.4,
P2); o REST direto do Identity Toolkit com a chave pública, que ainda aceita 6 ou 7 caracteres (declaração em
`docs/PRE-PRODUCTION.md`, seção "o que a política de senha não alcança"); e o `create-dev-admin.mjs`, que não
aplica a regra (P4). O `/test` fechou com 16 ✅, 1 ❌ anterior à fatia (contraste do `--destructive` no dark) e 3
🔒 (Identity Platform, Arcjet e entrega de e-mail).

**Deriva de pipeline:** o `docs/features/account-security-mfa/STATE.md` segue com `review: in-progress` e
`branch: -`, com a nota de que os commits aguardavam aprovação. O merge saiu mesmo assim, então o `STATE.md`
não reflete o histórico. A auditoria só escreve em `docs/features/` para arquivar spec e deixa o arquivo como
está; o caso está estacionado em E11 de [Decisões estacionadas](#decisões-estacionadas-51). O nome da
branch mergeada também não segue o padrão `<project>/<type>/<title>` de `.claude/rules/git-commits.md`.

## Gates medidos nesta auditoria

Executados em 2026-09-28, com `--force`, neste workspace, com o `HEAD` em `e07252a` e o working tree limpo
fora de `specs/`. Não copiados do `/test` nem da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **772 arquivos · 0 erros** (`No fixes applied`, 561 ms) |
| `pnpm turbo run lint typecheck test --force`, 1ª execução | ❌ **26/27 tasks · 45,0 s**. Falhou `app#test`: os 679 testes passaram, mas o Vitest pegou um erro não tratado (`ReferenceError: window is not defined`, vindo do agendador do React depois do teardown do ambiente) originado em `__tests__/useListAuditEvents.test.tsx` |
| a mesma linha, 2ª execução | ✅ **27/27 tasks · 0 em cache · 39,8 s** |
| `vitest run` da `apps/app`, 4 execuções seguidas | 1 falha (o mesmo erro, no mesmo arquivo) e 3 passagens |

**A suíte da `apps/app` falhou em 2 de 6 execuções locais.** O arquivo não muda desde a PR #18 (`f08a84f`) e o
CI passou nas execuções de merge das PRs #29 e #30, então não há sinal de que a entrega tenha causado isso. O
achado está em [Achados](#-dependências-exports-e-código-morto). Os números abaixo são da 2ª execução.

| workspace | arquivos | testes | Δ vs. 2026-09-27 (PR #29) |
|-----------|---------:|-------:|---------------------------|
| `api` | 74 | 935 | — |
| `app` | 85 | 679 | **+3 arquivos · +23** |
| `@repo/email` | 7 | 173 | **+36** |
| `@repo/auth` | 8 | 101 | — |
| `web` | 13 | 82 | **+1 arquivo · +20** |
| `@repo/internationalization` | 6 | 59 | — |
| `@repo/shared` | 4 | 44 | — |
| `@repo/analytics` | 2 | 34 | — |
| `@repo/next-config` | 1 | 32 | **novo** (task `test` criada pela PR #30) |
| `@repo/security` | 3 | 31 | — |
| `@repo/payments` | 4 | 22 | — |
| `e2e` | 2 | 16 | — (testes unitários da suíte; os de navegador rodam no `pnpm e2e`) |
| **total** | **209** | **2208** | **+5 arquivos · +111 testes** |

O total bate com o que o `/test` de `brand-config` registrou (2208 testes).

CI: a execução de merge da **#30** (`e07252a`, `gh run 36431584408`) terminou em **`success`** em `changes`,
`verify`, `coverage` e `e2e`, e a PR passou nos mesmos quatro antes do merge. As oito últimas execuções de
merge na `main` (`ab11a5b` a `e07252a`) estão verdes.

Branch protection segue **não ligado**, remedido hoje: `gh api repos/:owner/:repo/branches/main/protection`
→ **404** ("Branch not protected"), `rulesets` → **`[]`**. O repositório tem **30** PRs, nenhuma aberta.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter nesta rodada) e prioriza valor × esforço × custo de adiar.
**Nenhuma spec está bloqueada por dependência.** A ordem de 2 a 6 foi escolhida pelo usuário em 2026-09-26;
com `brand-config` entregue, cada uma subiu uma posição.

> **Critério de execução, sem exceção:** o que uma rodada autônoma consegue provar. O `/cycle` não
> provisiona infraestrutura, então spec cujos critérios dependem de conta em provedor volta com metade dos
> critérios "não verificados".

| # | id | por que agora |
|---|----|---------------|
| 1 | [`storage-emulator-rules-tests`](storage-emulator-rules-tests.md) | `dx`, alto, M, `approved`. Paga a dívida de prova de `file-upload-storage`, do avatar de `account-settings` e do passo `storage` do expurgo, e a dívida cresce a cada feature de arquivo. Sai inteira sob emulador, sem conta em provedor. Com os testes de rules no `pnpm test`, o `/analyze` tem de resolver emulador e JDK no gate `test`, no job `verify` e no `pnpm build`: nesta máquina o `java` do `PATH` é o 17 e o 21 exigido pelos emuladores está em `/opt/homebrew/opt/openjdk@21` (medido em 2026-09-28) |
| 2 | [`accessibility-conformance`](accessibility-conformance.md) | `confianca`, alto, M, `approved`. Obrigação legal (LBI art. 63) e defeitos que todo fork herda em todo formulário; a allowlist do axe dá o critério de pronto. O `/test` de `brand-config` mediu a inicial do avatar da barra lateral em 4,3:1, caso que o corte já cobre |
| 3 | [`account-email-change`](account-email-change.md) | `produto`, médio, M, `approved`. A UI publica "em breve" em todo fork. Senha atual como confirmação, sem sincronizar a Stripe (decidido). Só o envio real pela Resend fica 🔒 |
| 4 | [`compliance-docs-kit`](compliance-docs-kit.md) | `confianca`, médio, **P**, `approved`. Só documento, `contends_on` vazio: cabe ao lado de qualquer outra |
| 5 | [`plan-entitlements`](plan-entitlements.md) | `proposed`, por decisão do usuário. Prevalência baixa (2/10) e metade dos critérios só se prova com conta Stripe |
| 6 | [`account-security-mfa`](account-security-mfa.md), **fatia 2** (sessões) | `in-progress` desde 2026-09-27, com a fatia 1 entregue pela PR #29. **Fora do conjunto elegível** enquanto estiver `in-progress`. A fatia 2 exige identificar sessões, que o Firebase não oferece pronto |
| 7 | [`observability-logging`](observability-logging.md) | `in-progress`, 5 dos 6 itens. **Fora do conjunto elegível.** Estacionada (E1) |
| 8 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22. Estacionada (E2) |

**Recomendação para o próximo `/analyze`: `storage-emulator-rules-tests`.** Está `approved`, não depende de
nada, é a primeira da ordem que o usuário definiu e não disputa arquivo com as outras duas do lote 1. O risco de
adiar é concreto: cada feature nova de arquivo herda critérios "não verificados" e o passo `storage` do expurgo
segue sem prova.

### O que **não** foi escolhido para #1, e por quê

- **`accessibility-conformance`** fica em #2 pela ordem do usuário. Sobe se o critério passar a ser risco legal.
  Cabe no mesmo lote que a #1.
- **`account-email-change`** é valor médio e depende de envio real pela Resend para o último critério.
- **Os achados pequenos de segurança** (`packages/security/index.ts:11` lendo a chave no import; o webhook
  respondendo 500 para assinatura inválida; rotas de `payments/*` e `/account` fora do rate limit) seguem
  como tarefas diretas P que cabem ao lado de qualquer spec. A primeira da lista é a do `packages/security`,
  único 🔴 aberto.
- **O teste instável de `useListAuditEvents`** é tarefa direta P, medida nesta rodada, e cabe ao lado de
  qualquer spec.
- **O `getDictionary()` do servidor lendo o cookie** continua tarefa direta M, não spec.

## Lotes paralelos

Para rodar o ciclo completo em 2–3 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-28**, depois
da reconciliação dos status, a partir do `contends_on` de cada spec, lido do disco, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Se você só vai rodar uma
coisa, rode o #1 da ordem.

**Elegíveis agora: 5 de 8.** Fora ficam `account-security-mfa` e `observability-logging` (`in-progress`) e
`teams-organizations` (`deferred`). Nenhuma das cinco tem `depends_on` pendente.

| lote | specs | o que toca (`contends_on`) | por que não colide |
|------|-------|----------------------------|--------------------|
| **1** | `storage-emulator-rules-tests` · `accessibility-conformance` · `account-email-change` | `firebase.json`, `package.json` da raiz, `turbo.json`, `apps/api/(shared)/lib/storage.ts`, `.github/workflows/ci.yml` · `ui/form.tsx`, `ui/button.tsx`, `styles/globals.css`, `packages/design-system/package.json`, `apps/e2e/a11y/allowlist.ts` · `auth-action-links.ts`, `templates/action-link.tsx`, `actions/account/action.ts`, `AccountProfileForm.tsx` | os três conjuntos são disjuntos; o teto de 3 fecha o lote |
| **2** | `compliance-docs-kit` · `plan-entitlements` | nada · `webhooks/payments/route.ts`, `billing-state.ts`, `packages/sdk/src/types/payments/payments.ts` | disjuntos; `compliance-docs-kit` só escreve em `docs/` |

**Quem ficou fora do lote 1, nominalmente:** `compliance-docs-kit` e `plan-entitlements` ficaram fora **sem
colisão**, barradas só pelo teto de 3. Nenhuma das cinco disputa arquivo com outra. `compliance-docs-kit` não tem
arquivo de código em disputa; se um workspace ficar ocioso, ela entra em qualquer lote sem risco. **Mudança
desta rodada:** `brand-config` saiu do lote 1 ao ser entregue, e `account-email-change` subiu do lote 2 para o
lugar dela.

### Onde os lotes podem colidir mesmo disjuntos

- **`storage-emulator-rules-tests` e `accessibility-conformance`**, as duas no lote 1, mexem na suíte E2E: uma
  no boot dos emuladores (pelo script da raiz), a outra na allowlist. Os arquivos são diferentes; o risco é de
  uma PR quebrar o job `e2e` da outra por tempo de boot ou por uma rota que muda de título. E, com os testes de
  rules no `pnpm test`, a PR de storage muda o job `verify`, que a PR de acessibilidade também precisa passar.
- **`account-email-change` e `accessibility-conformance`**, agora juntas no lote 1, tocam formulários da conta. A
  primeira muda o `AccountProfileForm.tsx`; a segunda muda os `HookForm*` que ele usa. Arquivos diferentes, sem
  conflito de linha, mas os testes do formulário de perfil podem mudar de expectativa no merge (o
  `aria-invalid` passa a aparecer). Quem mergear por último roda a suíte da `apps/app` de novo.
- **`account-email-change` e `storage-emulator-rules-tests`**: o e-mail de troca não usa Storage. Sem risco
  previsto.
- Quase todas acrescentam códigos em `translations/packages/shared/utils.ts` (`apiErrors`). O conflito é
  aditivo e se resolve no merge.

### Nota de processo: a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por processo, não por
dado (ver [`README.md`](README.md#depends_on--contends_on)).

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma previsão feita lendo o corte
de MVP. `admin-billing-insights` declarou **5** arquivos e tocou **4**, e tocou sem declarar arquivos vizinhos
na mesma camada. `brand-config` declarou 5 e a PR #30 alterou os 5, mais 17 arquivos de código e tradução fora da lista (sem contar testes, ícones, `.env.example` e manifestos)
(entre eles os dois `proxy.ts`, o header e o footer da web e três templates de e-mail); nenhuma outra spec
declarava esses arquivos, então a previsão errou para menos sem custo desta vez.

## Precisam de decisão

**Nenhuma pergunta nova nesta rodada.** O que estava aqui saiu por um destes caminhos:

- **Depoimento de exemplo de `brand-config`:** resolvido pela entrega, que adotou a recomendação. O depoimento
  saiu do painel e as chaves `layout` de `signIn` e `signUp` saíram do dicionário (teste
  `authLayoutBrand.test.tsx:47`).
- **`accessibility-conformance` (zerar a allowlist?) e `plan-entitlements` (Stripe Entitlements ou mapa
  local?):** apareceram em duas rodadas com a mesma recomendação. Pela §5.1 da `cycle-policy`, deixam de ser
  reapresentadas aqui e moram em "Perguntas em aberto" de cada spec; o `/cycle` adota a recomendação escrita lá
  se você não disser nada.
- **`STATE.md` de `account-security-mfa` parado em `review: in-progress` depois do merge:** segunda aparição.
  Juntou-se ao caso igual de `brand-config` na linha E11 de [Decisões estacionadas](#decisões-estacionadas-51).

## Decisões estacionadas (§5.1)


Recomendações que apareceram em duas rodadas ou mais com a mesma resposta. Pela
[§5.1 da `cycle-policy`](../.claude/cycle-policy.md), elas **param de ser reapresentadas** até você mexer.
Cada uma tem dono e endereço.

| # | questão | dono | onde mora a decisão | recomendação registrada |
|---|---------|------|---------------------|-------------------------|
| E1 | `observability-logging` fecha como entregue, com o coletor virando spec P própria? (12 rodadas) | você | `docs/PRE-PRODUCTION.md` §11 (o coletor) | fechar e abrir spec P do coletor |
| E2 | `teams-organizations` continua `deferred`? (14 rodadas sem as contrapartidas P) | você | este arquivo, [Achados](#-repositório-rotas-e-proxy) (predicado de posse) | status de sua escolha; as contrapartidas já são achados com arquivo e linha |
| E3 | Ligar branch protection na `main` | você, no painel do GitHub | `docs/PRE-PRODUCTION.md` §9 | ligar, exigindo `verify` e `e2e`; não há pré-requisito técnico. É o que falta para o item 2 de [`e2e-testing`](../docs/features/e2e-testing/spec.md), arquivada com esse ⚠️. Remedido em 2026-09-28: 404, `[]`, 30 PRs |
| E4 | O gate `approved` não é usado (**oito** specs entregues sem passar por `approved`, incluindo `admin-billing-insights` e `e2e-testing`; a fatia 1 de `account-security-mfa` saiu da mesma forma, pela PR #29, com a spec em `proposed`). **Em 2026-09-26 o usuário aprovou cinco specs de uma vez, o primeiro uso do gate; `brand-config` (PR #30) é a primeira entregue depois de passar por ele** | você | `specs/README.md` (ciclo de vida) | remover `approved` do ciclo de vida ou fazer o `/cycle` recusar spec não aprovada; a auditoria recomenda a primeira |
| E5 | Prazo de retenção da coleção `auditEvent` | você | `docs/PRE-PRODUCTION.md` §1.3 | decidir um prazo padrão sem invocar o art. 15 do Marco Civil |
| E6 | Teto absoluto da sessão ultrapassável por até meia vida de cookie | — | `docs/PRE-PRODUCTION.md`, seção "Declaração — por quanto tempo uma sessão pode ser renovada" | manter o comportamento; o número está escrito onde o fork lê |
| E7 | Busca da tabela enxerga só as páginas carregadas | quem sentir a dor | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | abrir spec quando houver caso de uso |
| E8 | Como medir visitas à `apps/web` | quem pedir | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | o contador próprio é a única saída sem conta nem variável obrigatória |
| E9 | O deep link das abas da conta (`?tab=`) não acompanha a barra lateral (3 rodadas) | você | [Achados](#-ui-i18n-e-front-end), linha de `AccountTabs.tsx` | derivar a aba do `?tab=` a cada navegação, aceitando um `router.replace`; a escolha contrária está comentada no código (`AccountTabs.tsx:55-57`), por isso precisa da sua palavra |
| E10 | O que o modo `simple` deve fazer (a documentação descreve um redirecionamento que não existe) | você | este arquivo, achado A1 em [Achados](#-achados-abertos-reconferidos-ou-herdados) | **o usuário decidiu ignorar o modo por ora (2026-09-25)**. Não reapresentar até ele mexer; a nota de medição do `docs/AUTH-SSO.md` fica como está |
| E11 | O registro da feature não acompanha o merge, e a branch sai fora do padrão (PRs #29 e #30) | você | `.claude/rules/git-commits.md` e `.claude/skills/spec-audit/SKILL.md` §4.1 | o `STATE.md` de `account-security-mfa` segue com `review: in-progress` e o de `brand-config` com `branch: -`, ambos já mergeados, de `feat/account-security-password-policy` e `feat/brand-config`. Recomendação: a regra aceitar `feat/<slug>` para feature que cruza vários apps (como já aceita para épico), e a auditoria, ao confirmar o merge, gravar no `STATE.md` a linha `review` como `done` com o SHA e a branch |

**Duas recomendações repetidas são decisões técnicas e deveriam virar linha de política.** A auditoria
não edita `.claude/`, então elas ficam aqui como texto pronto para você colar:

- Em `.claude/cycle-policy.md` §2: *"Spec cujo corte a auditoria contestou em duas rodadas não entra em
  `/analyze` sem um bloco 'Reescopo que o `/analyze` deve aplicar' na própria spec. Se o bloco não existir,
  o `/cycle` escolhe a próxima."* Caso medido: `onboarding-flow` ficou seis rodadas presa pelo corte
  contestado, ganhou o bloco numa rodada e foi entregue na seguinte, 5/5. Em 2026-09-26 a auditoria
  escreveu o bloco em `account-security-mfa`, então a linha não barra a próxima execução; continua valendo
  para a próxima spec contestada.
- Em `.claude/skills/spec-audit/SKILL.md` §4.1, antes do passo 5: *"Reescreva os links relativos de saída
  da spec para o caminho novo: `research/*.md` vira `../../../specs/research/*.md`, spec viva vira
  `../../../specs/<id>.md`, spec arquivada vira `../<slug>/spec.md`. Rode o verificador de links no
  arquivo movido e confirme zero mortos."* A rodada de 2026-09-25 fez isso à mão pela quinta vez; esta
  não arquivou nada.

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-28 |
|------|--------------|------------------------|
| [`account-security-mfa`](account-security-mfa.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`). A spec está `in-progress`, com a fatia 1 em `main` |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`observability-logging`](observability-logging.md) | — | ✅ sem dependência |
| [`storage-emulator-rules-tests`](storage-emulator-rules-tests.md) | — | ✅ sem dependência |
| [`accessibility-conformance`](accessibility-conformance.md) | — | ✅ sem dependência |
| [`account-email-change`](account-email-change.md) | — | ✅ sem dependência. Usa o envio de e-mail de `transactional-emails` e a conta de `account-settings`, ambas arquivadas |
| [`compliance-docs-kit`](compliance-docs-kit.md) | — | ✅ sem dependência |
| [`plan-entitlements`](plan-entitlements.md) | — | ✅ sem dependência. Usa o estado de assinatura de `billing-subscription`, arquivada |

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`storage-emulator-rules-tests`](storage-emulator-rules-tests.md) | Emulador de Cloud Storage e testes das security rules | dx | alto | M | `approved` | — |
| [`accessibility-conformance`](accessibility-conformance.md) | Acessibilidade: allowlist do axe zerada e testes no design system | confianca | alto | M | `approved` | — |
| [`account-email-change`](account-email-change.md) | Troca de e-mail do titular | produto | médio | M | `approved` | — |
| [`compliance-docs-kit`](compliance-docs-kit.md) | Modelos de conformidade: RoPA, incidente, subprocessadores e backup | confianca | médio | P | `approved` | — |
| [`plan-entitlements`](plan-entitlements.md) | Acesso por plano espelhado na API | produto | médio | M | `proposed` | — |
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `in-progress` (fatia 1 entregue, PR #29) | ✅ `account-settings` |
| [`observability-logging`](observability-logging.md) | Observabilidade: erros, tracing e logs estruturados | dx | alto | M | `in-progress` | — |
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
| `file-upload-storage` | 2026-09-14 | [`docs/features/file-upload-storage/spec.md`](../docs/features/file-upload-storage/spec.md) — 5/5 do corte (PR #11, `9154776`). ⚠️ 6 critérios "não verificados" por o Cloud Storage não estar ativado |
| `account-settings` | 2026-09-15 | [`docs/features/account-settings/spec.md`](../docs/features/account-settings/spec.md) — 6/6 do corte (PR #12, `a4df5ed`). ⚠️ O caminho feliz do **avatar** segue não verificado contra infra real |
| `firebase-emulator-seed` | 2026-09-15 | [`docs/features/firebase-emulator-seed/spec.md`](../docs/features/firebase-emulator-seed/spec.md) — 5/5 do corte (PR #13, `8107f3f`) |
| `cookie-consent` | 2026-09-16 | [`docs/features/cookie-consent/spec.md`](../docs/features/cookie-consent/spec.md) — 6/6 do corte (PR #16, `7c8ff7c`). ⚠️ Reabertura da escolha na `apps/app` só existe depois do login |
| `cursor-pagination` | 2026-09-16 | [`docs/features/cursor-pagination/spec.md`](../docs/features/cursor-pagination/spec.md) — 5/5 do corte (PR #17, `c36e084`). ⚠️ O índice composto novo **precisa ser publicado** |
| `audit-log` | 2026-09-17 | [`docs/features/audit-log/spec.md`](../docs/features/audit-log/spec.md) — 5/5 do corte (PR #18, `f08a84f`). ⚠️ **Três desvios registrados**; o índice composto de `auditEvent` **precisa ser publicado**. A imutabilidade da trilha ganhou uma exceção nomeada na PR #23 (`anonymizeUserLabels`) |
| `dashboard-home` | 2026-09-17 | [`docs/features/dashboard-home/spec.md`](../docs/features/dashboard-home/spec.md) — 5/5 do corte (PR #19, `bfc4d8f`). ⚠️ **Três índices compostos** precisam ser publicados |
| `session-refresh` | 2026-09-17 | [`docs/features/session-refresh/spec.md`](../docs/features/session-refresh/spec.md) — 6/6 do corte (PR #20, `cc93229`). ⚠️ A **revogação ponta a ponta segue 🔒 não verificada** |
| `user-activity-tracking` | 2026-09-19 | [`docs/features/user-activity-tracking/spec.md`](../docs/features/user-activity-tracking/spec.md) — 5/6 do corte (PR #21, `e656331`). ✅ O item 4 parcial foi pago pela entrega de `data-rights-lgpd` |
| `admin-analytics-dashboard` | 2026-09-23 | [`docs/features/admin-analytics-dashboard/spec.md`](../docs/features/admin-analytics-dashboard/spec.md) — 5/5 do corte (PR #22, `03498ae`). Gráfico entregue como histograma de recência |
| `data-rights-lgpd` | 2026-09-23 | [`docs/features/data-rights-lgpd/spec.md`](../docs/features/data-rights-lgpd/spec.md) — **5/5 do corte** (PR #23, `ab11a5b`), item 3 dividido: arquivos sem prova contra bucket real, assinatura transferida para `billing-subscription` e paga pela PR #25. **Quatro derivas registradas** |
| `onboarding-flow` | 2026-09-24 | [`docs/features/onboarding-flow/spec.md`](../docs/features/onboarding-flow/spec.md) — **5/5 do corte** (PR #24, `d52c4f0`), 20/20 critérios sob o emulador. Deriva no item 3: o deep link volta sem a query string |
| `billing-subscription` | 2026-09-25 | [`docs/features/billing-subscription/spec.md`](../docs/features/billing-subscription/spec.md) — **6/6 do corte** (PR #25, `a1f87d0`), mais o passo `billing` do expurgo herdado de `data-rights-lgpd`. 19 ✅ e 5 🔒 no `/test` (só conta Stripe real prova). ⚠️ Catálogo, portal, endpoint de webhook e chaves são passo manual por fork (`PRE-PRODUCTION.md` §12) |
| `admin-billing-insights` | 2026-09-25 | [`docs/features/admin-billing-insights/spec.md`](../docs/features/admin-billing-insights/spec.md) — **5/5 do corte** (PR #27, `0659ede`). 18 ✅, 4 🔒 e 1 ❌ anterior à entrega (hidratação em `/en` e `/es`). ⚠️ **Duas derivas** contra o bloco de reescopo, sem efeito na tela, aceitas pelo usuário; o endpoint da Stripe de cada fork precisa ganhar `invoice.paid` (`PRE-PRODUCTION.md:446-447`) |
| `e2e-testing` | 2026-09-25 | [`docs/features/e2e-testing/spec.md`](../docs/features/e2e-testing/spec.md) — **4/5 do corte e 1 parcial** (PR #26, `c71755e`). ⚠️ O item 2 roda em toda PR mas **não bloqueia o merge** até o branch protection ser ligado (E3). O `STATE.md` segue com `test: blocked` pelo D3, corrigido na própria PR; o job `e2e` passou nas quatro execuções seguintes |
| `brand-config` | 2026-09-28 | [`docs/features/brand-config/spec.md`](../docs/features/brand-config/spec.md) — **5/5 do corte** (PR #30, `e07252a`), 14 ✅, 0 ❌ e 1 🔒 no `/test` (nome não ASCII na Resend). Primeira spec entregue depois de passar por `approved`. ⚠️ Marca, logo e ícones por fork são passo manual (`PRE-PRODUCTION.md` §13) |

**Verificado na auditoria de 2026-09-28:** `docs/features/` tem **26** pastas e **21** `spec.md` arquivados. As
cinco pastas sem `spec.md` são `account-security-mfa` e `observability-logging` (specs `in-progress` em `specs/`),
`auth-panel-context` e `impersonation-read-only` (as duas anteriores à semeadura) e
`i18n-hydration-admin-delete-billing` (tarefa direta, sem spec). Não houve colisão de arquivamento:
`docs/features/brand-config/spec.md` não existia antes do `git mv`. O link do `analyze/plan.md` da feature para
a spec foi apontado para o arquivo novo.

### O que a PR #27 entregou **além** do corte (registrado em 2026-09-25)

1. **O webhook parou de ecoar o evento Stripe** na resposta de sucesso: `route.ts:242` devolve só
   `{ ok: true }`.
2. **A checagem de `ALREADY_EXISTS` do Firestore virou helper compartilhado** (`isAlreadyExistsError`,
   `apps/api/(shared)/infra/firestore-errors.ts:4`), usado pelos repositórios de fatura e de ativação.
3. **Aviso de endpoint incompleto.** Com assinatura vigente e nenhuma fatura paga registrada, a seção avisa
   que falta `invoice.paid` no endpoint (`BillingInsightsSection.tsx:76-83`), em vez de mostrar receita
   zero sem explicação.
4. **A declaração do expurgo ganhou as duas coleções novas** (`docs/PRE-PRODUCTION.md:696`, âncora remedida
   em 2026-09-26): ficam depois da exclusão, porque guardam só ids da Stripe, valor, moeda e datas.

## Contradições doc × código, medidas nesta rodada

Nenhum gate lê prosa. Pela [`cycle-policy` §4](../.claude/cycle-policy.md), afirmação barata de medir num
doc é medida ao passar por ela. Nesta rodada foram medidos os documentos que a PR #30 criou ou alterou
(`docs/FORKING.md`, `docs/SETUP.md`, `docs/PRE-PRODUCTION.md`) e os que a rodada anterior deixou com veredito
pendente. A auditoria não edita `docs/`; o que está defasado fica registrado aqui.

| documento | afirma | realidade medida em 2026-09-28 | veredito |
|-----------|--------|-------------------------------|----------|
| `docs/PRE-PRODUCTION.md:603-613` (§9, gate) | 26/26 tasks em 53,4 s, 755 arquivos, 1990 testes em 196 arquivos em 11 tasks de teste, "remedido em 2026-09-25" com `HEAD` em `0659ede` | **27/27** tasks, **772** arquivos, **2208** testes em **209** arquivos, **12** tasks de teste | ⚠️ **defasado** por duas PRs. A PR #30 editou a linha da tabela sobre `testTimeout` (`:605`, que confere: 12 de 12 configs) e deixou os números do gate como estavam |
| `docs/PRE-PRODUCTION.md:680-692` (§13, marca, novo) | três variáveis nos projetos `app`, `web` e `api`; a web não serve arquivo solto; sem as variáveis, `next-boilerplate` aparece | confere com os três `.env.example`, com `brand.ts:14` e com a ausência de `apps/web/public/` | ✅ **honesto na estreia** |
| `docs/SETUP.md:87-99` (marca e SEO) | variáveis opcionais em `@repo/next-config`, lidas por `app`, `web` e `api` | confere com `packages/next-config/keys.ts:45-50` e com os leitores de `getBrand()` | ✅ **fechado**; a linha antiga dizia "apenas `apps/web`" |
| `docs/SETUP.md:435` (pendências de higiene) | os `.env.example` já não trazem chaves do upstream; o resíduo está na raiz | `package.json`, `tsup.config.ts`, `.autorc` e `CHANGELOG.md` existem na raiz | ✅ **fechado**; a linha antiga (`:424`) dizia o contrário |
| `docs/FORKING.md:121` (logo) | a web não tem `public/` e o proxy redireciona caminho sem idioma | `apps/web/public` não existe; `/icon.png` → 307 medido pelo `/test` | ✅ **honesto** |
| `docs/FORKING.md:432` (link) | aponta para `../README.md#crud-de-referência` | o título no `README.md:305` é `### 🧬 CRUD de referência`; pela regra de âncora do GitHub, o emoji vira um hífen inicial e a âncora gerada é `#-crud-de-referência` | ⚠️ **link provavelmente morto**; não medido na página renderizada |
| `docs/SECURITY.md:14-16` (guards) | **30** arquivos de rota, **19** com guard, **11** nus | a PR #30 não criou rota | ✅ **honesto**, não remedido |
| `docs/PAYMENTS.md`, `docs/ARCHITECTURE.md`, `AGENTS.md`, `apps/app/CLAUDE.md` | arquivamento pelo admin; locale no client e no servidor | a PR #30 não tocou nesses arquivos nem no código descrito | ✅ **honesto**, veredito de 2026-09-27 mantido |
| `docs/features/e2e-testing/STATE.md` (`/test`) | `blocked` pelo D3 | o job `e2e` passou em todas as execuções seguintes, inclusive o merge da #30 | ⚠️ **defasado**, fica como está por decisão do usuário |
| `docs/features/account-security-mfa/STATE.md` (`review`) e `docs/features/brand-config/STATE.md` (`branch`) | `in-progress` / `-`, commits aguardando aprovação | PRs #29 e #30 mergeadas com CI verde | ⚠️ **defasados**, estacionados em E11 |
| `docs/AUTH-SSO.md:66-71` e a pendência do modo `simple` no `PRE-PRODUCTION.md` | redirecionamento do comum para a web no `simple` | não remedido; estacionado (E10) | ⚠️ nota de medição anterior segue no lugar |

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

**Deriva de implementação em `brand-config`: nenhuma que contrarie a spec.** Os cinco itens saíram como
escritos, e a fonte única ficou onde a recomendação da spec pedia (módulo em pacote compartilhado, lendo env,
com padrão neutro). Três pontos divergem da letra sem contrariá-la:

| ponto | especificado | implementado | leitura |
|-------|--------------|--------------|---------|
| sinal de pronto do `grep` | "Acme" só no seed e no comentário de `keys.ts` | idem, **fora de `__tests__`**: fixtures de entidade e testes de credencial da Resend usam o nome como dado | a spec estava imprecisa; o `STATE.md` da feature registra o ajuste |
| e-mail de suporte | lido por app, web, e-mails e metadados | só os e-mails o mostram (`packages/email/components/layout.tsx:98-104`); app e web declaram a variável por simetria | leitura aceitável do item 1, que pedia a fonte, não uma tela de suporte |
| capacidade extra | — | origem do logo no `img-src` da CSP, nome da marca no remetente, chaves `layout` do `signUp` removidas junto com as do `signIn` | a implementação foi além, sem cortar nada |

**Deriva de pipeline:** os `STATE.md` de `account-security-mfa` e `brand-config` não acompanharam o merge, e as
duas branches saíram fora do padrão. Estacionado em E11.

### Âncoras deslocadas, corrigidas nesta rodada

Todas por arquivos que a PR #30 alterou (`git diff --name-only 597f641 e07252a`). Cada uma foi lida no disco.

| onde | citado | real hoje | causa |
|------|--------|-----------|-------|
| [`observability-logging`](observability-logging.md) | `packages/email/index.ts:39-49` (`logEmail`) · `:120-130` (`provider-error`) | **`:40-50`** · **`:121-131`** | import de `sender.ts` na PR #30 |
| [`teams-organizations`](teams-organizations.md) | `(home)/page.tsx:3`, `:35` · `action-link.tsx:12` (`ActionSlug`) | **`:4`**, **`:32`** · **`:13`** | PR #30 |
| este arquivo, achados | `apps/app/proxy.ts:215` · `:190-203` e `:201` · `:170,174` | **`:218`** · **`:193-206`** e **`:204`** · **`:173,177`** | três linhas novas da CSP do logo |
| idem | `apps/web/proxy.ts:104-108` | **`:107-111`** | idem |
| idem | `packages/email/index.ts:120-130` · `welcome.tsx:49` | **`:121-131`** · **`:50`** | PR #30 |
| idem | `docs/PRE-PRODUCTION.md:696` (coleções que ficam depois do expurgo) | **`:708`** | item 13 novo no `PRE-PRODUCTION.md` |

Conferidas e sem deslocamento, apesar de o arquivo ter mudado: `apps/api/.env.example:34-35`,
`apps/app/.env.example:23-24`, `apps/web/.env.example:5-6`, `footer.tsx:56` e as linhas do `PRE-PRODUCTION.md`
antes do item 13 (`:52`, `:446-447`, `:522`, `:557-567`, `:660`). As outras seis specs não citam linha de arquivo
alterado pela PR #30. Os contadores de `observability-logging` foram recontados e não mudaram: 31 linhas de
`logEvent(` e 19 de `console` cru fora de testes.

### O que a auditoria **não** encontrou

A PR #30 não apagou código de produção além das chaves de dicionário sem leitor; o gate completo passa. Nenhuma
spec `done` perdeu código. Nenhuma feature em `docs/features/*/STATE.md` deveria ter `spec:` e não tem: o
`STATE.md` de `brand-config` já traz `spec: brand-config`. Nenhuma entrega parcial órfã.

## Achados: correções pontuais, não specs

Coisas que não merecem spec própria, mas que são correções pontuais. Viram tarefa direta no `/analyze`.

> **Auditoria de 2026-09-28 (pós-PR #30).** Entraram na rodada 71 linhas abertas (as 64 da rodada anterior, as
> 4 do `/test` de `brand-config` e três que a contagem anterior tinha deixado de fora). As que ficam em
> arquivos que a PR #30 não alterou (`git diff --name-only 597f641 e07252a`) seguem iguais, porque o arquivo é
> o mesmo byte a byte; as que ficam em arquivos alterados foram reabertas no disco com `sed -n`. **Placar: 4
> fechados pela entrega · 8 âncoras deslocadas (corrigidas na linha) · 2 descrições corrigidas (o `/favicon.ico`
> da web e o avatar, que passou a apontar para a spec) · 2 novos (o teste instável e um link do
> `FORKING.md`) · 69 abertos.**

### ✅ Fechados nas auditorias de 2026-09-26 (PR #28) e 2026-09-28 (PR #30)

| achado | onde estava | como fechou |
|--------|-------------|-------------|
| ⚠️ **Soft delete de usuário pelo admin não cancelava a assinatura** (A2) | `apps/api/app/(routes)/users/[id]/route.ts:117` (antes da PR #28) | A PR #28 cancela a assinatura viva antes do soft delete (`route.ts:157`) e recusa com 503 `USERS_DELETE_BILLING_FAILED` quando não consegue (`:158-167`). Teste: `usersAdminDeleteBilling.test.ts` |
| 🟡 **Componente client renderizava em pt-br no servidor em `/en` e `/es`**, e a hidratação falhava | `packages/internationalization/utils/cookies.ts:2-4` · `client.ts:8` (antes da PR #28) | A PR #28 pôs o `LocaleProvider` nos root layouts e fez o `getDictionary()` do client ler o segmento `[locale]` (`client.ts:40-57`). O cookie ficou só como fallback de árvore sem provider. Teste: `localeProvider.test.ts` |
| ◐ **`Link` dentro de `Button` na web**, parte do header | `apps/web/app/[locale]/components/header/index.tsx` | A PR #28 tirou os quatro `<a>` de dentro de `<button>` e o `a > button > a` do header (teste `headerInteractiveNesting.test.tsx`). Hero, CTA, FAQ e preços seguem com o padrão; o achado da allowlist continua aberto |
| 🟡 **`/favicon.ico` não existia na `apps/app` e caía no segmento `[locale]`** | `apps/app/app/` (antes da PR #30) | A PR #30 pôs `favicon.ico`, `icon.png` e `apple-icon.png` na raiz de `apps/app/app/`; o `/test` mediu `200 image/x-icon` em `next start`. Teste: `appIcons.test.ts` |
| 🟡 **`emailBrand.supportEmail` era configuração morta** | `packages/email/brand.ts:9` (antes da PR #30) | O contato de suporte saiu de `emailBrand` e virou `getBrand().supportEmail`, lido pelo rodapé dos e-mails (`packages/email/components/layout.tsx:98-104`) |
| 🟡 **`NEXT_PUBLIC_APP_NAME` era lida sem estar declarada** | `packages/seo/metadata.ts:14` · `apps/web/shared/lib/seo.ts:18` (antes da PR #30) | Declarada em `packages/next-config/keys.ts:45`, que os três `env.ts` estendem (`apps/app/env.ts:8`, `apps/web/env.ts:8`, `apps/api/env.ts:9`), junto com logo e suporte (`:46-47`) |
| 🟡 **O "Acme" e o "company name" que um fork esquecia** | `packages/email/brand.ts:7` · `Sidebar.tsx:79` (antes da PR #30) | Os dois leem `getBrand().name` (`Sidebar.tsx:68`, `:88`; `packages/email/components/layout.tsx:39`). `git grep -i "acme\|company name"` fora de testes: só o seed e um comentário |

### ⚠️ Achados abertos, reconferidos ou herdados

Reconferidos em 2026-09-28. Dos arquivos abaixo, a PR #30 alterou só o `apps/app/proxy.ts` e o
`apps/web/proxy.ts`; as âncoras deles foram corrigidas na linha.

| achado | onde | por que importa |
|--------|------|-----------------|
| ⚠️ **O modo `simple` não restringe o painel comum** (A1) | `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx` (não lê o modo) · `packages/next-config/product-mode.ts:12-23` (sem `commonUserUsesPanel`) · `docs/AUTH-SSO.md:66-71` | O documento descreve um redirecionamento que não existe, e uma pendência do `PRE-PRODUCTION.md` partia dele. Hoje o `simple` só esconde a cobrança. Estacionado (E10): o usuário decidiu ignorar o modo por ora |
| 🟡 **As rotas de `payments/` que chamam a Stripe estão fora do rate limit** | `apps/api/proxy.ts:44-55` | Cada chamada vai à Stripe: o catálogo lista preços, o checkout cria cliente (com chave de idempotência) e sessão, o portal cria sessão. As três exigem sessão, então o abuso depende de conta válida, mas um cliente em loop consome a cota de API da Stripe do fork. `docs/SECURITY.md:147-149` não as lista entre as que ficam de fora |
| 🟡 **`findByStripeCustomerId` devolve o documento cru, sem mapper** | `apps/api/(shared)/repositories/user.repository.ts:67-78` | `{ ...(live.data() as UserDTO), id }` entrega `Timestamp` onde o tipo promete `Date`. Hoje o webhook só lê `id` e `stripeCustomerId`, então não quebra nada. Com o A2 fechado, o perfil arquivado já não tem assinatura viva quando o webhook deixa de achá-lo; quebra no primeiro chamador que ler uma data. Contraria a regra de ouro 5 (normalizar no mapper) |
| 🟡 **`.env.example` da `apps/app` e da `apps/web` publicam `STRIPE_*`, que nenhum dos dois lê** (A3) | `apps/app/.env.example:23-24` · `apps/web/.env.example:5-6` | Quem configura o fork põe a chave secreta em dois apps que não precisam dela. Só a `apps/api` lê (`PRE-PRODUCTION.md` §12 já diz isso) |
| 🟡 **O webhook responde 500 para assinatura inválida** (A4) | `webhooks/payments/route.ts:222-224` → `failure()` em `:187-191` | A Stripe reentrega por até três dias um evento que nunca vai validar. Um 400 encerra as tentativas. `api-hardening` está arquivada, então é tarefa direta |
| 🟡 **O deep link do onboarding perde a query string** | `apps/app/proxy.ts:218` | O proxy grava só o `pathname`. Afeta link de listagem filtrada ou paginada aberto antes do onboarding. Saiu de "Precisam de decisão" pela §5.1: tarefa direta P, gravar `pathname + search` e um caso a mais em `proxy.test.ts` |
| 🟡 **Os `HookForm*` publicam `aria-invalid="false"` com a mensagem de erro visível** (→ spec [`accessibility-conformance`](accessibility-conformance.md)) | `packages/design-system/components/ui/form.tsx:109-123` · `packages/design-system/components/form/hookform/` | O `HookFormInput` usa `<Controller>` direto, sem o `FormField` que põe o nome do campo no contexto; o `useFormField` não acha o erro e o `aria-describedby` sai sem o id da mensagem. Achado pelo `/review` da PR #24 (O3). **Corrigido em 2026-09-27:** vale para sete dos oito componentes da pasta, em duas formas. `hookformInput`, `hookformInputPassword` e `hookformSelect` usam `FormControl` e saem com `aria-invalid="false"`; `hookformDateInput`, `hookformImageUpload`, `hookformRadioGroup` e `hookformTextarea` não usam e saem sem `aria-invalid`; o `hookformSwitch` usa `FormField` e está certo. Atinge todo formulário do repositório; leitor de tela não anuncia o erro. Terceiro caso do design-system sem task de teste; cruza com [`e2e-testing`](../docs/features/e2e-testing/spec.md), cujo item 3 é acessibilidade automatizada, e o axe não pega o caso porque o atributo está presente |
| 🟡 **`--destructive` do dark tem contraste 1,97:1 como texto** (→ spec [`accessibility-conformance`](accessibility-conformance.md)) | `packages/design-system/styles/globals.css:63` · usos como texto em `ui/form.tsx:156`, `ui/field.tsx:227`, `ui/label.tsx:21`, `form/hookform/*` | Toda mensagem de erro de formulário e o `pastDueHint` da aba billing ficam abaixo dos 4,5:1 do AA no dark (medido pelo `/test` de `billing-subscription` e recalculado em oklch → sRGB: 1,97:1 sobre `--background`). Clarear o token talvez não resolva sozinho: ele chega ao antd como `colorError` (`antd-app.tsx:20`), e se o estilo padrão do antd pinta o hover do item `danger` com esse fundo e texto branco, ficar ≥4,5:1 como texto (L ≈ 0,60) derruba o branco sobre ele para 4,41:1. **Corrigido em 2026-09-27:** o código do repo só usa o token como texto do item `danger` (`antd-app.tsx:66-68`, fundo `--color-accent` em `:69-70`); o fundo sólido, se existir, vem do antd e precisa ser medido. Caminho provável: mapear o `--destructive-foreground` do dark (`:64`, 5,18:1) no `@theme` e usá-lo como cor de texto de erro. Achado pelo `/review` de `billing-subscription` |
| 🟡 **`Button` com `loading` perde o nome acessível** (→ spec [`accessibility-conformance`](accessibility-conformance.md)) | `packages/design-system/components/ui/button.tsx:72-73` · `ui/spinner.tsx:8-9` | O `loading` troca o conteúdo pelo `Spinner`, cujo `aria-label="Loading"` é literal em inglês; no browser o botão ficou com nome `""` durante o redirect do checkout (`/test` de `billing-subscription`, item 11). Vale para todo botão com `loading` (`AccountPrivacyPanel`, painel de billing, formulários). Corrigir no componente, mantendo o texto do botão acessível enquanto o spinner aparece |
| 🟡 **O `getDictionary()` do servidor lê o cookie `x-locale`, não a URL** (fusão, em 2026-09-26, dos achados de `<html lang>` e das páginas da web) | `packages/internationalization/server.ts:18-20` · `apps/app/app/layout.tsx:48`, `:73` · `apps/web/app/[locale]/layout.tsx:23`, `:30` · `apps/web/proxy.ts:107-111` · ex.: `apps/web/app/[locale]/pricing/page.tsx`, `(home)/components/hero.tsx` | O `<html lang>` das duas apps sai do cookie: `/en/sign-in` com `x-locale=pt-br` sai com `lang="pt-br"` (O4 do `/test` da PR #24). Na `apps/web`, o proxy grava o cookie na mesma resposta, então a primeira visita a `/en` sem cookie renderiza os Server Components em pt-br e os componentes client em inglês (medido pelo `/test` da PR #28, que corrigiu só o lado client). Atinge as ~20 páginas e componentes da web que chamam `getDictionary()` sem argumento; leitor de tela pronuncia a página no idioma errado. Era a pergunta 3 da seção 14 do plano de `i18n-hydration-admin-delete-billing`. Tarefa M |
| 🟡 **Lacunas de teste do arquivamento pelo admin** (nova, PR #28) | `apps/api/app/(routes)/users/[id]/route.ts:157-169` · `apps/api/__tests__/usersAdminDeleteBilling.test.ts` | Não há teste para o cancelamento que passa seguido do soft delete que falha (Firestore fora) nem para o duplo clique no "Sim" do diálogo. O `/review` da PR descreveu por leitura o primeiro caso como recuperável: a assinatura já cancelada conta como cancelada na tentativa seguinte (`(shared)/lib/billing.ts:162-173`) |

### 🆕 Achados da entrega `e2e-testing`

Registrados pelo `/review` da suíte E2E, fora do placar da auditoria acima. Nenhum foi corrigido na entrega,
que não muda código de produto.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Sete grupos de violação de acessibilidade passam pela allowlist da suíte E2E** (→ spec [`accessibility-conformance`](accessibility-conformance.md)) | `apps/e2e/a11y/allowlist.ts` · `packages/design-system/components/form/hookform/hookformInputPassword.tsx:77-86` · `apps/app/shared/components/ui/PanelNavbarControls.tsx:262-272` · `apps/web/app/[locale]/(home)/components/hero.tsx:27-52` · `cta.tsx:23-43` · `faq.tsx:36-47` · `pricing/page.tsx:85-96`, `:127-134`, `:165-176` | O axe reprova `critical`/`serious`, e a allowlist tolera o que a primeira execução mediu: botão de mostrar senha só com ícone, `Link` dentro de `Button` na web, `text-muted-foreground` sobre `bg-muted` no tema claro (cards da landing e iniciais do avatar), páginas do painel sem `<title>`, `Select` sem nome no navbar e no filtro de usuários, e `Switch` de linha sem nome nas tabelas. Corrigido o componente, a exceção sai no mesmo PR; a anotação `a11y-stale-exception` avisa quando ela deixa de casar. As exceções `[data-slot="select-trigger"]` e `[data-slot="switch"]` valem para qualquer instância na rota, então um `Select` novo sem nome nas telas do admin passa sem aviso até elas saírem. **Atualizado em 2026-09-26:** a PR #28 consertou o header da web, então a exceção `WEB_BUTTON_WRAPPING_LINK` na rota `web:/pt-br/sign-up` (`allowlist.ts:88-91`) provavelmente ficou sem alvo, e o `reason` (`:32`) ainda cita o header. Não medido: a anotação `a11y-stale-exception` vai para o relatório do Playwright, não para o log do CI |
| 🟡 **O gatilho do `ActionsMenu` é um `<div>` sem papel nem nome** (→ spec [`accessibility-conformance`](accessibility-conformance.md)) | `packages/design-system/components/ui/action-menu.tsx:103-110` | Não recebe foco pelo teclado, e o axe não o enxerga porque não é controle. A suíte E2E clica no `svg` da última célula da linha por falta de outro seletor |
| 🟡 **O CTA primário do hero diz "Entrar" e leva a `/contact`** | `apps/web/app/[locale]/(home)/components/hero.tsx:33-34` | Texto e destino não combinam. A suíte E2E não afirma esse comportamento, para não transformar o defeito em contrato |

### 🆕 Achados da fatia 1 de `account-security-mfa` (PR #29)

Vindos do plano, do `/review` e do `/test` da fatia, conferidos no código em 2026-09-27. Nenhum bloqueia a
entrega; os três ficaram fora dela por decisão registrada.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Reenviar o cadastro depois de conta criada e login falho responde `USERS_AUTH_EMAIL_ALREADY_IN_USE`** | `apps/app/.../sign-up/components/SignUpFormClient.tsx:112-119` · `apps/web/.../sign-up/components/sign-up-form-client.tsx:34-40` | A criação e o login são duas chamadas. Se a primeira passa e a segunda falha (rede, 429, cookie de sessão), a pessoa reenvia, recebe "e-mail já cadastrado" e precisa ir ao login por conta própria. O `/review` deixou como está porque a correção muda o fluxo; a alternativa registrada é tentar o `signIn` quando o reenvio receber esse código logo depois de um 201 na mesma tela |
| 🟡 **`create-dev-admin.mjs` não aplica a política de senha** | `apps/api/scripts/create-dev-admin.mjs:36-46` | O script cria administrador com qualquer senha que o Firebase aceite (6 ou mais). Fora da fatia por decisão do plano (P4): o script roda em Node puro e repetir a constante criaria a 12ª cópia. Afeta só quem opera o fork |
| 🟡 **Sem `ARCJET_KEY`, nada limita a criação de contas em massa** | `apps/api/proxy.ts:45-46` (`/auth/sign-up` na lista) · `docs/PRE-PRODUCTION.md:565-567` · `docs/SECURITY.md:155` | A rota cria a conta pelo Admin SDK, que não passa pelo limite do Firebase de 100 contas por hora por IP. A rota está na lista de rate limit, mas o limite é no-op sem a chave. Está escrito nos dois documentos; o critério 19 do `/test` ficou 🔒 |

### 🔴 Segurança: seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **`packages/security/index.ts:11`** lê `keys().ARCJET_KEY` no **import**, e `@repo/security` é o primeiro import do middleware da `apps/api` | `packages/security/index.ts:11` | Reconferido. Uma `ARCJET_KEY` presente e malformada lança dentro do grafo de módulos do middleware: toda requisição falha, sem sinal no boot |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo** | `apps/api/instrumentation.ts:40-44` | Reconferido: `throw` em `:40-44` (a âncora desceu 20 linhas com o aviso de cobrança da PR #25), zero `process.exit`. `/health/ready` detecta parte das falhas, não esta |
| ⚠️ **Quatro das seis rotas de `/account` seguem fora do rate limit**, entre elas a troca de senha | `apps/api/proxy.ts:44-55` | Recontado em 2026-09-25: ficam fora o `PUT /account`, `/account/password`, `/account/sessions/revoke` e `/account/onboarding`. A PR #25 acrescentou `POST /payments/checkout` e `POST /payments/portal`, também fora; cada checkout pode criar uma sessão na Stripe |
| ⚠️ **Superfície não-guardada da API: 11 de 30** arquivos de rota exportam handler nu, 8 deles `/auth/*` | `apps/api/app/(routes)/auth/**` | Recontado em 2026-09-26: 30 arquivos, 19 com guard (a contagem anterior, 29 e 18, era de antes de `payments/summary`). Os 11 nus: 8 em `/auth/*`, os dois `health` e o webhook de pagamento. As quatro rotas de `payments/*` nasceram com guard |
| 🟡 **O endpoint de renovação de sessão está fora do rate limit e aceita requisição sem `Origin`** | `packages/auth/session-routes.ts:87` · `packages/auth/session.ts:78-81` | Reconferido. A parte documental está fechada (`docs/SECURITY.md:151`); o comportamento segue |

### 🟡 Dependências, exports e código morto

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Dependência importada sem ser declarada**: `apps/app/env.ts:1` importa `@repo/email/keys` sem `@repo/email` no `package.json`; `apps/web` importa `@repo/auth` em **8 arquivos** sem declará-lo | `apps/app/package.json` · `apps/web/package.json` | Reconferido, os dois `grep` no `package.json` devolvem 0. Funciona por hoisting; o turbo não invalida `web#*` quando `@repo/auth` muda |
| 🟡 `packages/auth/package.json:13` exporta `./client-ui` para arquivo **inexistente** | `packages/auth/package.json:13` | Reconferido: `client-ui.tsx` não existe. **Vigésima primeira auditoria consecutiva** |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` do resto | `packages/auth/package.json:24` | Reconferido em 2026-09-27; a âncora subiu uma linha porque a PR #29 tirou o export `./components/sign-up` |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | Reconferido: 0 |
| 🟡 **`input-otp.tsx` é código morto** | `packages/design-system/components/ui/input-otp.tsx` | Reconferido: só ele, o barril, o `package.json` do pacote e o `playground`. `account-security-mfa` (fatia 3, segundo fator) é quem o usaria |
| 🟡 **`import-in-the-middle` e `require-in-the-middle` instalados e nunca importados** | `apps/app/package.json:27,36` | Reconferido: 0 importadores |
| 🟡 **`packages/internationalization` tem dois defeitos de `exports`** | `packages/internationalization/package.json:5-12` | Reconferido em 2026-09-26, depois da PR #28 mexer no arquivo: falta `"./utils/*"`, e `"."` (`:6`) aponta para `index.ts`, que não existe |
| 🟡 **`isRateLimitEnforced()` é export morto** | `packages/security/index.ts:32` | Reconferido: 4 referências, todas em `__tests__/rateLimit.test.ts` |
| 🟡 **`FormattedError.retryAfterSeconds` sem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:14,23` | Reconferido. O homônimo de outro tipo em `apps/api/proxy.ts:106` segue sem relação |
| 🟡 **`reloadCurrentUser` sem teste próprio** | `packages/auth/client.ts:214` | Reconferido em 2026-09-27 (a âncora subiu dez linhas com a saída do `signUp` na PR #29): só `useEmailVerification.test.tsx`, que a mocka |
| 🟡 **`packages/shared` tem `test` e não tem `typecheck`; `@repo/design-system` tem `typecheck` e não tem `test`** (metade do design system → spec [`accessibility-conformance`](accessibility-conformance.md)) | `packages/shared/package.json` · `packages/design-system/package.json` | Reconferido. O lado do design-system ganhou o terceiro caso nesta rodada (achado novo do `aria-invalid`) |
| 🟡 **`welcomeEmail` sem chamador de produção**; o formulário de contato da landing segue maquete | `packages/email/templates/welcome.tsx:50` | Reconferido: 4 ocorrências, 3 em teste. O canal de privacidade da `apps/web` cai nesse formulário quando `NEXT_PUBLIC_PRIVACY_CONTACT` está vazia (`privacyContact.ts:17-18`), então o fallback do canal aponta para uma maquete |
| 🟡 **O `ActionsMenu` ganhou prop nova sem teste do próprio componente** | `packages/design-system/components/ui/action-menu.tsx` · `apps/app/__tests__/usersListArchiveLabels.test.tsx:37` | Reconferido. O único teste substitui o componente por mock |
| 🟡 **`useListAuditEvents.test.tsx` deixa trabalho do React pendente depois do teardown** (novo, 2026-09-28) | `apps/app/__tests__/useListAuditEvents.test.tsx:55-70` (um `QueryClient` por teste, sem `clear()` nem `unmount` ao fim) | A suíte da `apps/app` falhou em 2 de 6 execuções locais com `ReferenceError: window is not defined`, que o Vitest atribui a este arquivo: os 679 testes passam e o erro não tratado reprova a task. O arquivo não muda desde a PR #18. O CI passou nas execuções de merge das PRs #29 e #30, então a frequência lá não foi medida. Correção provável, não testada: limpar o `QueryClient` e desmontar o hook no `afterEach`. Tarefa direta P |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:138` | Declara `Promise<UserDTO[]>`, devolve o merge com o Auth e descarta linhas em silêncio (`:148`). N+1 do Admin SDK. Décima rodada aberto; âncoras desceram de novo com os agregados de cobrança da PR #27 |
| 🟡 **`userRepository` tem cinco métodos com semântica própria de "quantos usuários existem"** | `user.repository.ts:122` · `:134` · `:138` · `:157` · `:175` | `touchLastAccess`, `purgeProfile`, `list`, `summary` e `activitySummary`. O cartão de total pode mostrar mais do que a tabela lista, e nada na tela explica |
| 🟡 **O predicado de posse foi copiado de novo** | `apps/api/(shared)/repositories/entity.repository.ts:23,40,64,72` · `entities/summary/route.ts:9` | Quatro cópias de `where("userId", "==", userId)` no mesmo arquivo. É a contrapartida P de [`teams-organizations`](teams-organizations.md) |
| 🟡 **`/auth/sign-in` da api não tem consumidor e não segue o contrato de erro** | `apps/api/app/(routes)/auth/sign-in/route.ts:12` | Reconferido: zero `try`, `:12` devolve string crua (`"User not found"`). Viola a regra de ouro 3. O `sign-up` ganhou chamador indireto de `createDefaultUserProfile` na PR #24 e tem `try` |
| ◐ **`skipValidation` incondicional na `apps/web`** | `apps/web/env.ts:33` | Reconferido. A metade do `NEXT_PUBLIC_APP_URL` fechou com a PR #25 |
| ◐ **O bounce do proxy apaga a query string**, corrigido só para as rotas de `oobCode` | `apps/app/proxy.ts:193-206` | Reconferido: `redirectUrl.search = ""` em `:204` (âncoras desceram três linhas com a CSP do logo da PR #30). Mesma família do achado novo do deep link do onboarding |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta** | `apps/app/proxy.ts:173,177` | Reconferido em 2026-09-28: `cookieStore.set` sem `maxAge` |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem `Secure`** por padrão | `packages/shared/utils/helpers/cookies.ts:28,30` | Reconferido. ASVS 5.0 L1 (3.3.1). Décima rodada aberto |
| ⚪ **`cors.ts` allow-lista `x-locale`, que só existe como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Reconferido. `x-role` (`:16`) **não** é resíduo |
| 🟡 **O papel do painel viaja em dois headers** | `packages/sdk/src/client/base.ts:45,53,61,95` | Reconferido nas quatro âncoras |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O formulário de contato da `apps/web` falha a hidratação** | `apps/web/app/[locale]/contact/components/contact-form-client.tsx:79-80` | O `PopoverTrigger` renderiza um `<button>` com outro `<button>` dentro. Em `next build && next start`, `/en/contact` e `/es/contact` dão `Minified React error #418` a cada carga. Achado em 2026-09-25 pelo `/test` de `i18n-hydration-admin-delete-billing`; o arquivo não muda desde 2026-09-09. Correção provável: `PopoverTrigger asChild`, ou as classes de `buttonVariants` direto no trigger, no mesmo molde do header |
| 🟡 **O header logado da `apps/web` rola na horizontal no desktop** | `apps/web/app/[locale]/components/header/index.tsx` (grupo de ações à direita) | A 1280 px o "Sign Out" termina em x=1270 e a página rola 5 px; a 1024 px rola 29 px. Os números são os mesmos no `HEAD` anterior à correção do header, então o defeito é antigo. Medido em 2026-09-25 pelo `/test` da PR #28, já com o header corrigido. Não remedido nesta auditoria, que não sobe browser |
| 🟡 **O deep link das abas da conta não acompanha a navegação** | `AccountTabs.tsx:51-53` (estado lido uma vez) · `:55-62` (`history.replaceState`) | Reconferido. A barra lateral muda a URL e a aba fica onde estava. Estacionado (E9) |
| 🟡 **`"Pick a date"` literal no `DateInput`** | `packages/design-system/components/ui/date-input.tsx:50` | Reconferido. Sobreviveu às PRs #11 a #28 |
| 🟡 **O `DateInput` formata sempre em inglês** | `date-input.tsx:83` | Reconferido: `format(selected, "PPP")` sem `locale` |
| 🟡 **Strings de UI soltas**: `"Switch language"` nos dois apps, `"Toggle theme"` e `"Toggle Sidebar"` no design-system e `"Início"` no breadcrumb | `apps/app/shared/components/ui/LanguageSwitcher.tsx:79` · `apps/web/app/[locale]/components/header/language-switcher.tsx:68` · `packages/design-system/components/ui/mode-toggle.tsx:39` · `ui/sidebar.tsx:299`, `:311`, `:314` · `PageBreadcrumb.tsx:30` | Reconferido em 2026-09-26. Os dois do design-system entraram nesta rodada, vistos pelo `/test` da PR #28 nos 3 idiomas. O breadcrumb ainda crava `href="/painel"` em `:28` |
| 🟡 **A mensagem de erro padrão está cravada em pt-br num pacote** | `packages/shared/utils/helpers/handleClientError.ts:19` | Reconferido, literal |
| 🟡 **`signInSchema.ts` da `apps/web` crava as mensagens em pt-br** | `apps/web/app/[locale]/sign-in/validations/signInSchema.ts:5`, `:10` | Remedido em 2026-09-26: a PR #29 trocou o número pela constante `EXISTING_PASSWORD_MIN_LENGTH`, mas `"Email inválido"` (`:5`) e `"A senha deve ter pelo menos 6 caracteres"` (`:10`) seguem literais. O cadastro da web foi traduzido na mesma PR; o login não |
| 🟡 **O filtro por usuário da trilha não alcança evento de usuário excluído** | `admin/(pages)/audit/(components)/AuditFilters.tsx:40` | Reconferido. A exclusão de conta apaga o perfil e anonimiza os rótulos, então esses eventos ficam sem entrada no `select` |
| 🟡 **`resolveUserAuditLabel` engole a falha sem log** | `apps/api/(shared)/lib/audit-label.ts:14-16` | Reconferido |
| 🟡 **`images.domains` deprecado com `www.google.com` sem uso** | `apps/app/next.config.ts:19` | Reconferido, literal |
| 🟡 **`setTimeout` sem cleanup no carrossel da landing** | `apps/web/app/[locale]/(home)/components/cases-client.tsx:29` | Reconferido: nenhum `clearTimeout` |
| 🟡 **`useHealthCheck` não exporta a função imperativa** | `apps/app/shared/hooks/useHealthCheck.ts:19` | Reconferido: um único `export` |
| 🟡 **`provider-error` não distingue as falhas do provedor de e-mail** | `packages/email/index.ts:121-131` | Reconferido em 2026-09-28. Descartar o objeto de erro é deliberado |
| 🟡 **O rodapé da `apps/web` depende de `data-cookie-banner` sem teste** | `apps/web/app/[locale]/components/footer.tsx:56` | Reconferido |
| 🟡 **`turbo run` aborta na primeira falha no CI** | `.github/workflows/ci.yml:39` | Reconferido, sem `--continue` |

### 🆕 Achados do inventário da descoberta (2026-09-26)

Vistos pelos quatro inventários paralelos desta rodada. Nenhum vira spec.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **A `apps/web` não tem `not-found` nem `error`, e o `global-error` pode estar inerte** | `apps/web/app/[locale]/global-error.tsx` · `apps/web/app/` (sem `layout.tsx`, `not-found.tsx` nem `error.tsx`) | Rota inexistente na landing cai no 404 padrão do Next, sem tradução nem marca. O Next só reconhece `global-error` na raiz de `app/`, e a web não tem root layout ali; **não medido** se o arquivo em `[locale]` chega a ser usado. A `apps/app` tem `not-found.tsx` e `global-error.tsx` na raiz, mas nenhum `error.tsx` de segmento |
| 🟡 **O `package.json` da raiz ainda é o do next-forge** | `package.json:2-5` · `:42` | Reconferido em 2026-09-28: a PR #30 não tocou no arquivo; o `FORKING.md` ("Resíduos do projeto de origem") descreve a limpeza que cada fork faz à mão. `"name": "next-forge"` e um `bin` para `dist/index.js`, gerado de `scripts/index.ts`, que não existe. `engines.node` diz `>=18` e o `.nvmrc`, `22.12.0`. Todo fork herda os três |
| 🟢 **Link do `FORKING.md` para o CRUD de referência provavelmente morto** (novo, 2026-09-28) | `docs/FORKING.md:432` · `README.md:305` | O link usa `#crud-de-referência`; o título é `### 🧬 CRUD de referência`, e o GitHub transforma o emoji num hífen inicial (`#-crud-de-referência`). Não medido na página renderizada. Correção: trocar a âncora ou tirar o emoji do título |

### 🆕 Achados do `/test` de `brand-config` (2026-09-27)

Medidos pelo `analista-qa` com o nome padrão da marca, em `build && start`, e reconferidos no código em 2026-09-28. Nenhum bloqueia a entrega; o detalhe e o repro estão em [`docs/features/brand-config/test/report.md`](../docs/features/brand-config/test/report.md).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O `/favicon.ico` da `apps/web` devolve o HTML da home** | `apps/web/app/` (sem ícone na raiz) · `apps/web/proxy.ts:57` (matcher) | Resposta 200 com `text/html`; o `/icon.png` responde 307 para `/pt-br/icon.png`. Já existia antes da entrega. **Descrição corrigida em 2026-09-28:** o matcher do proxy já exclui `favicon.ico` (`:57`), então o pedido não passa pelo proxy e cai no segmento `[locale]` com `favicon.ico` no lugar do idioma. Correção provável, não testada: servir o arquivo na raiz de `apps/web/app/`, que hoje não tem root layout |
| 🟡 **O header deslogado da `apps/web` passa da largura a 1024 px** | `apps/web/app/[locale]/components/header/index.tsx` | 6 px em pt-br e 49 px em es, com o nome padrão. Complementa o achado do header logado acima, que media 29 px a 1024 px |
| 🟡 **A inicial do avatar da barra lateral fica abaixo do contraste AA no tema claro** (→ spec [`accessibility-conformance`](accessibility-conformance.md)) | `packages/design-system/components/ui/avatar.tsx` (estilo padrão do `AvatarFallback`) · `apps/app/shared/components/ui/Sidebar.tsx` | 4,3:1 contra os 4,5:1 exigidos para texto. Coberto pelo item de contraste do corte de [`accessibility-conformance`](accessibility-conformance.md), que já cita as iniciais do avatar |
| 🟢 **Nome de marca com 30 caracteres quebra em duas linhas na barra lateral** | `apps/app/shared/components/ui/Sidebar.tsx` | O critério de 30 caracteres da spec só valia para o header da web. Decidir truncar ou aceitar a quebra |

O atraso de idioma numa navegação (cookie `x-locale` lido no servidor) é o mesmo achado do `getDictionary()` do servidor, já registrado neste arquivo.

### 🆕 Achados da rodada de `storage-emulator-rules-tests` (2026-09-28)

Vindos do plano e do `/test` da spec, que segue `in-progress`. Ficam fora do placar da auditoria acima, que foi
fechado antes deles. Nenhum bloqueia a entrega.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O avatar do menu de perfil sai sem `alt`** (→ spec [`accessibility-conformance`](accessibility-conformance.md)) | `apps/app/shared/components/ui/ProfileDropdown.tsx:45` | `<AvatarImage src={avatarSrc} />` não tem `alt`. Quando o usuário tem avatar, o axe acusa `image-alt` (serious) em toda página autenticada. Medido pelo `analista-qa`: login, avatar enviado e axe em `/pt-br/account`. A linha vem de `a4df5ed` (PR #12). A suíte E2E não pega o caso porque o usuário do seed não tem avatar. Correção provável: `alt=""`, porque o gatilho do menu já tem `aria-label` (`:42`), no mesmo molde de `(unauthenticated)/layout.tsx:24`. Tarefa direta P |
| 🟢 **Nada impede um `*_EMULATOR_HOST` em produção** | `packages/auth/emulator.ts:27-32`, `:44` · `apps/app/env.ts:25` · `apps/app/shared/lib/storageEnabled.ts:6` | Nenhuma checagem de boot recusa um host de emulador configurado por engano, e isso vale também para o `FIREBASE_STORAGE_EMULATOR_HOST` e o `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST` novos. Se só a variante `NEXT_PUBLIC_` for copiada para a Vercel, o app mostra o seletor de arquivo e põe `http://<host>` no `img-src` da CSP; o upload falha com `error.code` e nada vaza. É o risco R-5 do plano da spec, deixado fora do corte |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md).
> Em 2026-09-28 foram remedidas as linhas 6, 8, 13 e 16, e entrou uma nova (26), vinda da PR #30. As outras
> mantêm o veredito anterior com motivo: exigem console de provedor, ou dependem de arquivos que a PR #30 não
> tocou (`firestore.indexes.json`, `firestore.rules`, `storage.rules` e `firebase.json` ficaram fora do diff). A
> PR #30 não criou índice. Criou três variáveis, todas opcionais e com padrão.

| # | pendência | onde vive | veredito 2026-09-28 |
|---|-----------|-----------|---------------------|
| 1 | 🔴 Publicar os três índices dos resumos da home (`GET /entities/summary` e `/users/summary` respondem 503 sem eles) | `PRE-PRODUCTION.md` §1.5 | **continua aberto**; não remedido nesta rodada, nada no repositório mudou |
| 2 | 🔴 Publicar o índice das faixas de recência (`user`: `deletedAt` + `lastAccessAt`) | `PRE-PRODUCTION.md` §1.7 | **continua aberto**; idem |
| 3 | 🔴 Publicar o índice da trilha de auditoria (filtro por usuário responde 503) | `PRE-PRODUCTION.md` §1.2 | **continua aberto**; idem |
| 4 | 🔴 Publicar o índice da listagem paginada de `entity` | `PRE-PRODUCTION.md` §1.1 | **continua aberto**. São **seis** índices sem publicação; o comando é um só |
| 5 | Retenção da coleção `auditEvent` | `PRE-PRODUCTION.md` §1.3 | **continua aberto**, estacionado (E5) |
| 6 | ⚠️ `main` sem branch protection | `PRE-PRODUCTION.md` §9 | **continua aberto**, remedido em 2026-09-28 (404, `[]`, 30 PRs); estacionado (E3). É o que falta para o item 2 de `e2e-testing`, arquivada com esse ⚠️ |
| 7 | Backfill de instantes em base que já tem dado | `PRE-PRODUCTION.md` §1.4 | **continua aberto**; não é mensurável daqui |
| 8 | Ninguém vigia a trilha de erro (nenhum coletor) | `PRE-PRODUCTION.md` §11 | **continua aberto**, remedido em 2026-09-28: `grep` por `@sentry`/`@logtail`/`@axiomhq`/`betterstack` nos `package.json` versionados devolve 0; estacionado (E1) |
| 9 | Health check da plataforma não aponta para `/health/ready` | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: configuração de plataforma |
| 10 | `SESSION_COOKIE_DOMAIN` em subdomínios distintos | `PRE-PRODUCTION.md` §7 | **continua aberto** (configuração de deploy) |
| 11 | Cloud Storage não ativado (plano Blaze) | `PRE-PRODUCTION.md` §6 | **continua aberto**. Trava também o passo `storage` do expurgo de conta |
| 12 | Revogação de sessão nunca provada ponta a ponta | *(só neste arquivo)* | **continua aberto** (exige projeto Firebase real) |
| 13 | Envio real de e-mail nunca provado | `PRE-PRODUCTION.md` §3 | **continua aberto** (exige domínio com SPF/DKIM). O `/test` da PR #24 viu o envio do e-mail de verificação falhar sob o emulador, com `RESEND_TOKEN` vazio, como esperado. O `/test` da PR #29 deixou 🔒 o e-mail de verificação depois do cadastro pela API (critério 20). O `/test` de `brand-config` deixou 🔒 o nome da marca com acento na caixa de entrada |
| 14 | CSP Report-Only na `apps/web` | `PRE-PRODUCTION.md` §10 | **continua aberto**, deliberado |
| 15 | Contas de QA acumuladas no projeto de desenvolvimento | `PRE-PRODUCTION.md` | **continua aberto, não recontado**: exige o console do Firebase. O `/test` da PR #24 criou 7 contas só no emulador, que as descarta |
| 16 | Branches mergeadas vivas no remoto | `PRE-PRODUCTION.md` | **continua aberto**, remedido em 2026-09-28: `git ls-remote --heads origin` devolve 29, ou seja, 28 além de `main` (eram 27; a `feat/brand-config` ficou viva depois do merge) |
| 17 | Login com Google sem passe manual com conta real | *(só neste arquivo)* | **continua aberto**. O `/test` da PR #24 também não percorreu o Google no emulador; o nome do Google como valor inicial do passo 1 ficou fechado só por leitura |
| 18 | `storage.rules` nunca publicado nem testado | `PRE-PRODUCTION.md` | **continua aberto**; a publicação depende da 11. O teste ganhou dono em 2026-09-26: [`storage-emulator-rules-tests`](storage-emulator-rules-tests.md) |
| 19 | Conferir a retenção de log da plataforma | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: painel do provedor |
| 20 | Reabertura do consentimento no `ProfileDropdown` nunca vista num browser | *(só neste arquivo)* | **continua aberto** |
| 21 | No modo `simple` o titular não alcança a aba de privacidade | `PRE-PRODUCTION.md`, seção "Pendência — no modo `simple`…" | **premissa falsa, medida**: o `simple` não restringe o painel comum, então o titular alcança a aba. **Fechada pelo usuário em 2026-09-25.** A nota de correção fica no documento. Volta se o `simple` passar a restringir o painel comum (E10) |
| 22 | `NEXT_PUBLIC_PRIVACY_CONTACT` precisa ser definida por fork | `PRE-PRODUCTION.md` §7 (checklist) | **continua aberto**. Vazia, o canal cai no formulário de contato, que é maquete |
| 23 | Stripe por fork: catálogo recorrente, Customer Portal, endpoint de webhook na versão `2025-09-30.clover` com **cinco** eventos (a PR #27 acrescentou `invoice.paid`, `PRE-PRODUCTION.md:446-447`), chaves na `apps/api`, TTL opcional de `paymentEvent`; e a decisão sobre checar assinatura duplicada na Stripe antes do release | `PRE-PRODUCTION.md` §12 | **continua aberto**. Cinco critérios de `billing-subscription`, quatro de `admin-billing-insights` e o cancelamento real no arquivamento pelo admin (PR #28) seguem 🔒 até uma conta real existir. `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` seguem vazias nos `.env` locais |
| 24 | 🆕 `ARCJET_KEY` por fork: sem ela o rate limit é no-op, e o cadastro pela API passa a depender dela (a rota usa o Admin SDK, fora do limite do Firebase por IP) | `PRE-PRODUCTION.md` §8 (`:557-567`) | **aberto**, entrou com a PR #29. Critério 19 do `/test` da fatia 1 🔒 |
| 25 | 🆕 Fechar o cadastro pelo REST do Identity Toolkit com a chave pública, que ainda aceita senha de 6 ou 7 (Identity Platform: password policy em `ENFORCE` ou cadastro pelo cliente desligado) | `PRE-PRODUCTION.md`, "Declaração — o que a política de senha não alcança" | **opcional, declarado**: o upgrade tem custo ou teto (3.000 DAU no Spark). Critério 18 do `/test` da fatia 1 🔒 |
| 26 | 🆕 Marca por fork: `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_LOGO_URL` e `NEXT_PUBLIC_APP_SUPPORT_EMAIL` nos projetos `app`, `web` e `api`, logo numa URL `https` pública, ícones do produto no lugar dos padrões | `PRE-PRODUCTION.md` §13 (`:680-692`) | **aberto**, entrou com a PR #30. Sem ela, o produto sobe com o nome `next-boilerplate`; não bloqueia nada |

A 21 foi fechada pelo usuário em 2026-09-25. A 23 cresceu com as PRs #27 e #28; a 24 e a 25 vieram da PR #29; a 26, da PR #30.

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo.

> **Em 2026-09-26, cinco linhas saíram daqui** porque viraram spec ou foram absorvidas:
> gate por plano → [`plan-entitlements`](plan-entitlements.md) (o bloqueio em `past_due`, trial, cupom,
> reembolso e faturas em UI própria voltaram como linha própria abaixo); RoPA, incidente, DPA e transferência
> internacional → [`compliance-docs-kit`](compliance-docs-kit.md); troca de e-mail →
> [`account-email-change`](account-email-change.md); emulador de Storage e testes de rules →
> [`storage-emulator-rules-tests`](storage-emulator-rules-tests.md) ("promover admin pela UI" saiu porque já
> existe: campo de tipo no formulário de edição de usuário, `users/[id]/route.ts:108-109`); task de teste do
> design system → [`accessibility-conformance`](accessibility-conformance.md).

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| **Bloqueio em `past_due` · trial, cupom, reembolso e faturas em UI própria · nome do plano traduzido** | — | Fora do corte de [`billing-subscription`](../docs/features/billing-subscription/spec.md) e de [`plan-entitlements`](plan-entitlements.md). O Customer Portal cobre trial, cupom, reembolso e faturas; o bloqueio por situação é decisão de produto de cada fork. |
| 🆕 **Jobs agendados (Vercel Cron) para expurgo e retenção** | — | Avaliado em 2026-09-26. Não há job concreto que o core precise rodar: o expurgo da trilha depende do prazo de retenção (E5) e o TTL de `paymentEvent` já é nativo do Firestore. Infra sem consumidor vira código morto. Reabrir quando E5 for decidida. |
| 🆕 **Exportar tabelas do admin em CSV** | não medido | Avaliado em 2026-09-26. Nenhuma tabela exporta hoje e nenhuma referência do painel foi verificada. Sem prevalência, é decisão de fork. |
| 🆕 **Aceite de termos e privacidade registrado no cadastro** | não medido | Avaliado em 2026-09-26. O aviso de privacidade é dever de informação (LGPD art. 9º), não consentimento; aceite de termos é decisão contratual de cada fork. Um link para os dois documentos junto ao botão de cadastro é achado P, não spec. |
| 🆕 **Avisos de segurança por e-mail (senha trocada, sessões encerradas, login novo)** | — | Avaliado em 2026-09-26. É o requisito 6.3.7 da ASVS 5.0.0, **nível 3** (6.3.5, login suspeito, também é nível 3). O aviso ao endereço antigo entrou em [`account-email-change`](account-email-change.md) por ser barato; o resto espera pedido. |
| 🆕 **OpenAPI / documentação da API gerada** | — | Avaliado em 2026-09-26. O SDK é o contrato e a única porta para a API (regra de ouro 1); um segundo contrato gerado envelhece junto. Vale só se o produto for uma API, como as API keys. |
| 🆕 **Banir usuário pelo admin** | 4/10 (admin) | Já existe como desativar: `disabled` no `PUT /users/[id]` (`user-admin.schema.ts:21`, `users/[id]/route.ts:117-121`) e o switch da listagem (`UsersListClient.tsx:102-119`). |
| 🆕 **CLI de criação de fork** | 1 de 4 verificados (next-forge) | Fora do corte de [`brand-config`](../docs/features/brand-config/spec.md), entregue em 2026-09-28 com o roteiro escrito (`docs/FORKING.md`). O script só vale depois que o roteiro se mostrar estável em forks reais. |
| 🆕 **`/.well-known/security.txt` e política de divulgação de vulnerabilidade** | não medido | Fora do corte de [`compliance-docs-kit`](compliance-docs-kit.md). É código na web, e o campo `Expires` do RFC 9116 exige manutenção. |
| **Coletor de erro gerenciado (Sentry, Better Stack, Axiom)** | prática 6 | A costura existe e está vazia: `onRequestError` nos três apps, sem ninguém do outro lado. Estacionado (E1). |
| **Passos de onboarding condicionais por papel ou plano · checklist de ativação · tour interativo** | — | Fora do corte de [`onboarding-flow`](../docs/features/onboarding-flow/spec.md), arquivada. Dependem de haver produto, e cada fork tem o seu. O fork acrescenta um passo editando `ONBOARDING_STEPS`. |
| **Coleta de dados de domínio no onboarding (empresa, cargo, segmento)** | — | Fora do mesmo corte. Não é genérico; é código do fork. |
| **Onboarding para a conta criada pelo admin** | — | Decisão D3 da entrega: o admin já informa o nome, e a mesma rota cria admins. O perfil sem o campo conta como concluído. |
| **Demais direitos do art. 18 com fluxo próprio · painel de pedidos de titular · exportação assíncrona** | — | Fora do corte de [`data-rights-lgpd`](../docs/features/data-rights-lgpd/spec.md), arquivada. O canal de privacidade cobre os demais pedidos por ora. |
| **Exclusão de conta sem senha (conta só Google)** | — | Fora da entrega: reautenticar conta federada exige outro fluxo. Pertence à iteração de "sessão recente" de [`account-security-mfa`](account-security-mfa.md). |
| **Histórico de acessos · IP, user-agent, dispositivo e geolocalização · presença em tempo real** | — | Fora do corte de [`user-activity-tracking`](../docs/features/user-activity-tracking/spec.md). IP mudaria a natureza jurídica do dado (Marco Civil art. 5º, VIII). |
| **Série temporal de acessos na home do admin** | — | `lastAccessAt` guarda um instante por perfil; série temporal exigiria a coleção de eventos que `user-activity-tracking` descartou. |
| **Backfill retroativo do último acesso** | — | Fora do corte, e a tela diz quando o registro de cada pessoa começa. |
| **Ordenação da coluna de último acesso pelo servidor** | — | O índice por `lastAccessAt` existe declarado (não publicado). Reavaliar quando a fila drenar. |
| **Tela de sessões e dispositivos ativos** | 1/10 | Pertence a [`account-security-mfa`](account-security-mfa.md), fatia 2. |
| **Rotação de refresh token com detecção de reuso** | — | O refresh token é do Firebase. |
| **"Continuar conectado" · reautenticação para operação sensível · aviso de inatividade** | — | Fora do corte de `session-refresh`. A exclusão de conta já nasceu com reautenticação própria; o contrato geral fica com `account-security-mfa`. |
| **Rate limit próprio para as rotas de sessão** | — | Virou achado de segurança; o mecanismo existe e não alcança os front-ends. |
| **Widgets configuráveis na home · comparação com período anterior · exportar métricas · tempo real** | — | Fora dos cortes de `dashboard-home` e `admin-analytics-dashboard`. |
| **Contador materializado / agregação incremental** | — | A home do admin faz oito agregações por carregamento. Medir quando alguma coleção crescer. |
| **Exportar a trilha de auditoria · expurgo automático** | — | Dependem do prazo de retenção (E5). |
| **Alerta em tempo real sobre ação sensível** | — | Depende de haver coletor (E1). |
| **Auditar toda escrita de qualquer recurso** | — | Começa caro e gera ruído. |
| **Busca textual no servidor** | — | Fora do corte de `cursor-pagination`. Estacionado (E7). |
| **Medir visitas à `apps/web`** | — | Nenhuma das três saídas teve preço ou prevalência levantados. Estacionado (E8). |
| **Contagem total de registros na listagem** | — | O `countQuery` (`base.repository.ts:138`) é a peça que faltava. Reavaliar quando alguém pedir. |
| **Registro auditável de consentimento no servidor** | — | Fora do corte de `cookie-consent`. A escolha vai no arquivo de exportação, lida do cookie do navegador (`useAccountDataRights.tsx:23-36`); prova no servidor segue inexistente. |
| **CMP certificada · TCF do IAB · geolocalização do visitante** | — | Arrastam serviço pago para todo fork. |
| Notificações in-app + preferências | 3/10 | Esforço G à mão; a referência terceiriza num serviço pago. |
| Command palette (⌘K) | 2/10 | Valor estético. |
| Metering / limites de uso / créditos | 2/10 | Só faz sentido depois de `billing-subscription`. |
| Feature flags | 2/10 | Variável de ambiente basta num MVP; `ONBOARDING_ENABLED` é o exemplo mais recente. |
| Firebase App Check | — | Exige configuração de projeto por fork. |
| Waitlist / captura de lead | 2/10 | Decisão do fork. |
| **Consertar o formulário de contato da landing** | — | Não é spec, é achado. É o fallback do canal de privacidade. |
| **Migrar a listagem de usuários para o cursor** | — | O N+1 de `userRepository.list()` vem primeiro. |
| **Detector de teste instável no CI** | — | O primeiro caso foi consertado na PR #22. Em 2026-09-28 apareceu um segundo, de causa diferente, só local (`useListAuditEvents.test.tsx`, 2 de 6 execuções; ver achados), e o CI passou. O critério de reabertura era um segundo *flake* **no CI**; este ainda não conta. Consertar o teste é tarefa direta P. |
| Provedor de e-mail plugável · rastreio de abertura/clique | — | Fora do corte de `transactional-emails`. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Fora do corte de `file-upload-storage`. |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | Fora do corte de `observability-logging`. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto é uma API. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional. |
| SSO enterprise · SCIM | 0/10 | Só entra com o primeiro contrato enterprise. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | O pré-requisito (CI verde e estável) vale nas 12 últimas execuções de merge na `main` (`gh run list`, 2026-09-24). Reavaliar junto com o branch protection (E3). |
| Remote Cache do Turbo | prática 1 | Arrasta conta e env; entra quando doer, como opt-in. |
| Limiar de cobertura que bloqueia merge | prática 5 | A cobertura já é medida e consolidada (`pnpm coverage`, job `coverage` do CI), pela PR #26. O limiar ficou fora do corte de [`e2e-testing`](../docs/features/e2e-testing/spec.md); reavaliar depois de algumas medições. |
| Changesets / versionamento · Storybook | — | Pacotes `private: true`; o `playground` serve de catálogo. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork. |
