# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue**. Spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última rodada:** 2026-09-30 (`/spec --sync`, dentro de um `/cycle` autônomo, pós-merge da PR #33) ·
> **anteriores:** 2026-09-29 (PR #32) · 2026-09-29 (PR #31) · 2026-09-28 (PR #30) · 2026-09-27 (PR #29) · 2026-09-26 (`/spec` de descoberta, pedida pelo usuário) · 2026-09-26
> (PR #28) · 2026-09-25 (PRs #26 e #27) · 2026-09-25 (PR #25) · 2026-09-24 (PR #24) · 2026-09-23 (PR #23) ·
> 2026-09-23 (PR #22) · 2026-09-19 (PR #21) · 2026-09-17 (PR #20) · 2026-09-17 (PR #19) · 2026-09-17 (PR #18) ·
> 2026-09-16 (PR #17) · 2026-09-16 (PR #16) · 2026-09-16 (PR #15) · 2026-09-16 (PRs #13 e #14) · 2026-09-15 ·
> 2026-09-14 · 2026-09-11 · 2026-09-10 · 2026-09-09 (2 rodadas) · 2026-09-02 · 2026-09-01 (3 rodadas) ·
> 2026-08-31 · **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`account-email-change` foi entregue e arquivada** em
>    [`docs/features/account-email-change/spec.md`](../docs/features/account-email-change/spec.md). Os cinco
>    itens do corte foram conferidos no código, e a PR #33 (`f377c84`) está em `main` com CI verde no SHA de
>    merge, `e2e` incluído. É a quarta spec entregue depois de passar por `approved`. Quatro derivas, nenhuma
>    de comportamento. Detalhe em [Entrega confirmada](#entrega-confirmada-account-email-change-pr-33).
> 2. **Nenhum achado aberto fechou com a entrega, e seis novos entraram**, vindos do `/review` e do `/test` da
>    PR #33. O mais relevante é o diálogo de exclusão de conta, que não leva o foco para dentro ao abrir
>    (WCAG 2.4.3), o mesmo defeito que o `/test` achou e o `/review` corrigiu no diálogo novo.
> 3. **Gates remedidos com `--force`**: 28/28 tasks, 806 arquivos no `pnpm check`, 2452 testes em 226
>    arquivos, mais `api#test:emulator` com JDK 21 (170 em 4). Passou de primeira. O teste instável de
>    `useListAuditEvents` não apareceu em seis execuções; o acumulado fica em 2 falhas em 24.
> 4. **`docs/PRE-PRODUCTION.md` §9 ficou defasado de novo.** A PR #33 corrigiu os números da rodada anterior
>    para os do `3e5ec4c` e, com o próprio diff, os deixou velhos. Está em
>    [Contradições](#contradições-doc--código-medidas-nesta-rodada).
> 5. **`compliance-docs-kit` passou a `in-progress`** no complemento desta rodada: o pipeline dela terminou
>    (`analyze` a `test` em `done` no `docs/features/compliance-docs-kit/STATE.md`), mas os documentos estão só
>    no working tree deste workspace, sem commit, sem branch própria e sem PR. Vira `done` quando a PR entrar
>    em `main` com CI verde.
> 6. **Lotes recalculados**: uma spec elegível, `plan-entitlements`, que segue `proposed`. O lote 1 tem só
>    ela, e não há lote 2.
> 7. **Recomendação de #1:** `compliance-docs-kit` foi a recomendada e já está em execução. A próxima da fila é
>    `plan-entitlements`, que depende de você aprová-la.
> 8. **Dois achados novos vindos da entrega de `compliance-docs-kit`:** conta desativada pelo admin segue com o
>    ID token aceito pela API por até 1 hora (🔴, medido contra o Firebase de desenvolvimento) e a
>    `review-checklist.md` não cobra atualizar `SUBPROCESSORS.md` e `ROPA.md` (🟢).

## Contadores

Sobre as **5 specs que seguem em `specs/`**. Recontados do disco em 2026-09-30, lendo o frontmatter de cada
arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 1 |
| `approved` | 0 |
| `in-progress` | 3 |
| `done` (arquivadas) | 24 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `confianca` 2 (2 `in-progress`) · `dx` 1 (`in-progress`) · `produto` 2
(1 `proposed`, 1 `deferred`). **Por esforço:** P 1 · M 3 · G 1. **Por valor:** alto 2 · médio 3 · baixo 0.

**Transições aplicadas: 2.** A primeira, `account-email-change` `approved → done`, com o corte inteiro confirmado no
código e a PR #33 em `main`. A spec foi editada (frontmatter, evidência por item, derivas, links) e movida
com `git mv` para `docs/features/account-email-change/spec.md`. O índice estava vazio antes do movimento;
agora tem só o rename com o conteúdo editado da spec. As demais edições desta rodada estão no working tree,
fora do índice. Nada foi commitado. A segunda, no complemento da rodada, é `compliance-docs-kit`
`approved → in-progress`, com `feature: compliance-docs-kit`: pipeline concluído, entrega sem PR.

> **A fila elegível tem uma spec**, `plan-entitlements`, ainda `proposed`. Ficam fora `compliance-docs-kit`
> (`in-progress`, entregue sem PR), `account-security-mfa` e `observability-logging` (`in-progress`; a
> segunda estacionada em E1) e `teams-organizations` (`deferred`, E2). Nenhuma spec `dx` está na fila: a única que resta está estacionada.

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

## Entrega confirmada: `account-email-change` (PR #33)

A PR #33 entrou em `main` como `f377c84` ("feat: account email change with link confirmation") em 2026-09-29
às 16:23 UTC, da branch `feat/account-email-change`. Os quatro checks passaram antes do merge (`gh pr view
33 --json statusCheckRollup`) e a execução de merge também: `gh run 36597344374`, `success` em `changes`,
`verify`, `coverage` e `e2e`. O `verify` levou 3 min 19 s e o `e2e`, 4 min 6 s. A PR levou junto a auditoria
anterior (o arquivamento de `accessibility-conformance` e o `BACKLOG.md`, commit `3994654`).

A auditoria conferiu os cinco itens do corte no código:

| item do corte | o que o código mostra |
|---------------|-----------------------|
| 1. Pedido na aba de perfil, com senha atual; "em breve" some | botão e diálogo em `AccountProfileForm.tsx:115-128`, `:167-171`; campos `newEmail` e `currentPassword` em `AccountEmailChangeDialog.tsx:135-146`; SDK `requestEmailChange` (`actions/account/action.ts:55-67`); `POST /account/email` sob `requireCommonPanelApi` (`account/email/route.ts:67`), senha conferida pelo Identity Toolkit (`:37-54`, `:117-123`); `git grep "em breve"` só acha a cobrança e o teste que afirma a ausência |
| 2. Nada muda antes do link | `buildEmailChangeLink` (`auth-action-links.ts:114-140`) com `generateVerifyAndChangeEmailLink`; modo `verifyAndChangeEmail` na página (`verify-email/page.tsx:8`, `:35`); a confirmação confere o tipo do código antes de aplicar (`auth/email-change/confirm/route.ts:47-57`) |
| 3. Aviso ao endereço antigo, com canal para contestar | template `email-change-notice.tsx`, enviado antes do link, e o link não sai se o aviso falha (`account/email/route.ts:147-155`); o canal é a linha de suporte do rodapé (`packages/email/components/layout.tsx:98-104`), condicionada a `NEXT_PUBLIC_APP_SUPPORT_EMAIL` e declarada no `PRE-PRODUCTION.md` §3 |
| 4. Sessões encerradas, perfil com o endereço novo, trilha | `revokeUserSessions` em `confirm/route.ts:79`; evento `account.email.change` em `:91-101` (`audit.ts:8`, rótulos em `auditTrail.ts:20`, `:57`, `:94`); o perfil lê o e-mail do Auth (`user.repository.ts:328`) |
| 5. Erros traduzidos nos 3 idiomas; "já em uso" sem revelar além do cadastro | `ACCOUNT_CURRENT_PASSWORD_INVALID`, `USERS_AUTH_EMAIL_ALREADY_IN_USE` (o mesmo do cadastro), `ACCOUNT_EMAIL_UNCHANGED`, `ACCOUNT_EMAIL_CHANGE_REAUTH_UNSUPPORTED` nos três blocos de `translations/packages/shared/utils.ts`; o "já em uso" só sai depois da senha conferida (`account/email/route.ts:117-141`) |

**Veredito:** 5/5. A spec passou a `done` e foi arquivada. O `/test` fechou com 16 ✅, 0 ❌ e 1 🔒 (a entrega
real do aviso pela Resend, pendência 13). A rodada 1 do `/test` achou o foco fora do diálogo ao abrir; o
`/review` corrigiu com `onOpenAutoFocus` e a rodada 2 remediu nos 3 idiomas, em 1280 e 375 px.

**Registro da feature:** o `docs/features/account-email-change/STATE.md` traz `spec: account-email-change` e
`branch: feat/account-email-change`, e desta vez a linha `review` da tabela está `done`. A seção de notas do
mesmo arquivo ainda diz que a etapa `review` "segue `in-progress`", então o arquivo se contradiz. O nome da
branch segue fora do padrão `<project>/<type>/<title>` pela quinta PR seguida. Os dois pontos estão em E11.

## Entrega parcial confirmada: fatia 1 de `account-security-mfa` (PR #29)

A PR #29 entrou em `main` como `597f641` ("feat: password policy and API sign-up") em 2026-09-26 às 17:07
UTC, da branch `feat/account-security-password-policy`. Os quatro checks passaram antes do merge (`gh pr view
29`) e a execução de merge também: `gh run 36257926749`, `success` em `changes`, `verify`, `coverage` e `e2e`.

A auditoria de 2026-09-27 conferiu o item 4 do corte no código, um ponto por vez:

| o que a fatia prometia | o que o código mostra |
|------------------------|-----------------------|
| regra de senha num lugar só | `packages/shared/utils/helpers/passwordPolicy.ts:2-10`: `PASSWORD_MIN_LENGTH = 8`, `PASSWORD_MAX_LENGTH = 1024`, `EXISTING_PASSWORD_MIN_LENGTH = 6` |
| as 11 cópias de `MIN_PASSWORD_LENGTH = 6` somem | `git grep "MIN_PASSWORD_LENGTH ="` em `apps/` e `packages/`: **0**. Os oito schemas de formulário (seis na `apps/app`, dois na `apps/web`) importam as constantes |
| a borda da API recusa senha curta | `apps/api/(shared)/validation/password.schema.ts:10-18` e `:29-33` (`400 AUTH_PASSWORD_TOO_SHORT`), aplicado no cadastro e na redefinição (`auth.schema.ts:23`, `:28`, `:82-83`), na troca (`account.schema.ts:47-48`, `:136-137`) e na criação pelo admin (`users/route.ts:48-49`); código traduzido nos 3 idiomas (`translations/packages/shared/utils.ts:73`, `:192`, `:311`); âncoras remedidas em 2026-09-30, depois da PR #33 |
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

Executados em 2026-09-30, com `--force`, neste workspace, com o `HEAD` em `f377c84` e o working tree limpo.
Não copiados do `/test` nem da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **806 arquivos · 0 erros** (`No fixes applied`, 502 ms) |
| `pnpm turbo run lint typecheck test --force` | ✅ **28/28 tasks · 0 em cache · 54,5 s**, na primeira execução |
| `pnpm turbo run test:emulator --force`, com o JDK 21 de `/opt/homebrew/opt/openjdk@21` no `PATH` | ✅ **14/14 tasks · 42,7 s**; `api#test:emulator` **170 testes em 4 arquivos**. Ao fim, nenhuma porta de emulador ficou ouvindo |
| `vitest run` da `apps/app`, 4 execuções seguidas | 4 passagens, 756 testes cada, nenhum erro não tratado |

**O teste instável de `useListAuditEvents` não apareceu nesta rodada** (0 em 6 execuções da suíte da
`apps/app`, contando as duas do turbo). O acumulado é 2 falhas em 24, todas em 2026-09-28. O arquivo não muda
desde a PR #18 e o CI segue verde; o achado continua aberto.

| workspace | arquivos | testes | Δ vs. 2026-09-29 (PR #32) |
|-----------|---------:|-------:|---------------------------|
| `api` | 78 | 1022 | **+3 arquivos · +73** |
| `app` | 91 | 756 | **+3 arquivos · +54** |
| `@repo/email` | 7 | 202 | **+29** |
| `@repo/auth` | 9 | 107 | — |
| `web` | 13 | 82 | — |
| `@repo/internationalization` | 6 | 59 | — |
| `@repo/design-system` | 6 | 45 | — |
| `@repo/shared` | 4 | 44 | — |
| `@repo/analytics` | 2 | 34 | — |
| `@repo/next-config` | 1 | 32 | — |
| `@repo/security` | 3 | 31 | — |
| `@repo/payments` | 4 | 22 | — |
| `e2e` | 2 | 16 | — (testes unitários da suíte; os de navegador rodam no `pnpm e2e`) |
| **total** | **226** | **2452** | **+6 arquivos · +156 testes** |
| `api#test:emulator` (fora da linha acima) | 4 | 170 | — |

O total **não** bate com o `docs/PRE-PRODUCTION.md` §9, que registra 2296 testes em 220 arquivos, medidos no
`3e5ec4c` (ver [Contradições](#contradições-doc--código-medidas-nesta-rodada)).

CI: a execução de merge da **#33** (`f377c84`, `gh run 36597344374`) terminou em **`success`** em `changes`,
`verify`, `coverage` e `e2e`. As treze últimas execuções de merge na `main` (`e656331` a `f377c84`) estão
verdes.

Branch protection segue **não ligado**, remedido hoje: `gh api repos/:owner/:repo/branches/main/protection`
→ **404** ("Branch not protected"), `rulesets` → **`[]`**. O repositório tem **33** PRs, nenhuma aberta.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter nesta rodada) e prioriza valor × esforço × custo de adiar.
**Nenhuma spec está bloqueada por dependência.** A ordem de 2 a 6 foi escolhida pelo usuário em 2026-09-26;
com `brand-config`, `storage-emulator-rules-tests`, `accessibility-conformance` e `account-email-change`
entregues, cada uma subiu quatro posições.

> **Critério de execução, sem exceção:** o que uma rodada autônoma consegue provar. O `/cycle` não
> provisiona infraestrutura, então spec cujos critérios dependem de conta em provedor volta com metade dos
> critérios "não verificados".

| # | id | por que agora |
|---|----|---------------|
| 1 | [`compliance-docs-kit`](compliance-docs-kit.md) | `confianca`, médio, **P**, `in-progress` desde 2026-09-30. Pipeline concluído neste workspace (18 ✅, 0 ❌, 2 🔒 no `/test`), aguardando commit e PR. **Fora do conjunto elegível** até ser mergeada |
| 2 | [`plan-entitlements`](plan-entitlements.md) | `proposed`, por decisão do usuário. Prevalência baixa (2/10) e metade dos critérios só se prova com conta Stripe |
| 3 | [`account-security-mfa`](account-security-mfa.md), **fatia 2** (sessões) | `in-progress` desde 2026-09-27, com a fatia 1 entregue pela PR #29. **Fora do conjunto elegível** enquanto estiver `in-progress`. A fatia 2 exige identificar sessões, que o Firebase não oferece pronto |
| 4 | [`observability-logging`](observability-logging.md) | `in-progress`, 5 dos 6 itens. **Fora do conjunto elegível.** Estacionada (E1) |
| 5 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22. Estacionada (E2) |

**Recomendação para o próximo `/analyze`: `plan-entitlements`, se você aprová-la.** `compliance-docs-kit`, a
recomendada da rodada, já foi executada e só espera a PR. `plan-entitlements` é a única elegível, não
depende de nada e não disputa arquivo com a entrega pendente. Ela segue `proposed` porque você a manteve
assim em 2026-09-26; o `/cycle` não aprova spec. Sem aprovação, a rodada seguinte cabe numa tarefa direta:
a primeira da fila é o bearer de conta desativada (🔴 novo, correção de uma linha em `server.ts:181-184`).

### O que **não** foi escolhido para #1, e por quê

- **`plan-entitlements`** só não é #1 incondicional porque está `proposed`: o usuário a manteve assim em
  2026-09-26, e metade dos critérios fica 🔒 sem conta Stripe.
- **O "Excluir" do menu de ações pelo teclado** (WCAG 2.1.1) segue a tarefa direta P mais urgente da lista
  de achados de UI. Cabe ao lado de qualquer spec.
- **O foco do diálogo de exclusão de conta** (achado novo desta rodada, WCAG 2.4.3) é tarefa direta P, com a
  correção já conhecida: a mesma `onOpenAutoFocus` que a PR #33 pôs no diálogo de troca de e-mail.
- **Os achados pequenos de segurança** (`packages/security/index.ts:11` lendo a chave no import; o webhook
  respondendo 500 para assinatura inválida; rotas de `payments/*` e quatro de `/account` fora do rate
  limit) seguem como tarefas diretas P. Há dois 🔴 abertos: o bearer de conta desativada, novo, e o do
  `packages/security`.
- **O teste instável de `useListAuditEvents`** é tarefa direta P, 2 falhas em 24 execuções locais.
- **O `getDictionary()` do servidor lendo o cookie** continua tarefa direta M, não spec.

## Lotes paralelos

Para rodar o ciclo completo em 2–3 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-30**, depois
da reconciliação dos status, a partir do `contends_on` de cada spec, lido do disco, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Se você só vai rodar uma
coisa, rode o #1 da ordem.

**Elegíveis agora: 1 de 5.** Fora ficam `compliance-docs-kit`, `account-security-mfa` e
`observability-logging` (`in-progress`) e `teams-organizations` (`deferred`). A elegível não tem `depends_on`
pendente.

| lote | specs | o que toca (`contends_on`) | por que não colide |
|------|-------|----------------------------|--------------------|
| **1** | `plan-entitlements` | `webhooks/payments/route.ts`, `billing-state.ts`, `packages/sdk/src/types/payments/payments.ts` | lote de uma spec só |

**Quem ficou fora do lote 1, nominalmente:** ninguém entre as elegíveis. Não há lote 2. **Mudança desta
rodada:** `account-email-change` saiu do lote 1 ao ser entregue e `compliance-docs-kit` saiu ao passar a
`in-progress`. Ela não disputa arquivo com `plan-entitlements` (`contends_on` vazio), então as duas PRs podem
correr juntas.

### Onde os lotes podem colidir mesmo disjuntos

- **`compliance-docs-kit` (entrega pendente) e `plan-entitlements`**: a primeira alterou
  `docs/PRE-PRODUCTION.md` (item 14 e mais três trechos) e `docs/FORKING.md`, que nenhuma das duas declara.
  Se `plan-entitlements` mexer no §12 do `PRE-PRODUCTION.md`, o conflito é de texto e se resolve no merge.
- **`plan-entitlements` e o SDK**: acrescenta tipos em `types/payments/payments.ts`. Se mexer no índice de
  ações do cliente (`packages/sdk/src/client/index.ts`), que não declara, o conflito é com
  `teams-organizations`, que está fora da fila.
- Quase toda spec de código acrescenta códigos em `translations/packages/shared/utils.ts` (`apiErrors`). O
  conflito é aditivo e se resolve no merge.
- **Gate local:** `pnpm test` roda também `test:emulator` e exige JDK 21 no `PATH`. Nesta máquina o `java`
  padrão é o 17 e o 21 está em `/opt/homebrew/opt/openjdk@21/bin` (medido em 2026-09-30).
  `pnpm turbo run test` continua sem Java.

### Nota de processo: a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por processo, não por
dado (ver [`README.md`](README.md#depends_on--contends_on)).

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma previsão feita lendo o corte
de MVP. `admin-billing-insights` declarou **5** arquivos e tocou **4**, e tocou sem declarar arquivos vizinhos
na mesma camada. `brand-config` declarou 5 e a PR #30 alterou os 5 e mais 17 arquivos de código e tradução
fora da lista. `storage-emulator-rules-tests` declarou 5 e a PR #31 alterou os 5, mais 12 fora da lista.
`accessibility-conformance` declarou 5 e a PR #32 alterou 4 deles (o `form.tsx` ficou intacto), mais 31
arquivos de código, tradução e configuração fora da lista, sem contar testes e documentos (os oito `HookForm*`, `select/index.tsx`,
`date-input.tsx`, `antd-app.tsx`, os dois layouts do painel, quatro seções da web). Nenhuma outra spec
declarava esses arquivos, então a previsão errou para menos sem custo, de novo.
`account-email-change` declarou 4 e a PR #33 alterou 3 deles (o `action-link.tsx` ficou intacto), mais 26
arquivos de código e tradução fora da lista, sem contar testes e documentos.

## Precisam de decisão

**Nenhuma pergunta nova nesta rodada.** Os pontos que poderiam virar pergunta foram resolvidos assim:

- **As decisões do §12 e do §13 do plano de `account-email-change`** saíram com a opção adotada, e o merge as
  levou. A única pergunta da spec (encerrar as sessões depois da troca) foi respondida pelo código: sim.
- **O CI no SHA de merge** foi medido, não perguntado: verde nos quatro jobs.
- **A frase do aviso ao endereço antigo** ("troque sua senha agora e fale com o suporte") virou achado de
  copy, com a leitura do `/review`, em vez de pergunta.
- **`plan-entitlements` (Stripe Entitlements ou mapa local?)** segue em "Perguntas em aberto" da própria spec,
  pela §5.1 da `cycle-policy`; o `/cycle` adota a recomendação escrita lá se você não disser nada.
- **As duas perguntas de `compliance-docs-kit`** (idioma dos documentos, `security.txt` no corte) saíram
  com a recomendação da spec na entrega: português, sem `security.txt`.
- **Commit e PR de `compliance-docs-kit`** são decisão sua pelo `/review`, como sempre; não entram aqui como
  pergunta.
- **O `STATE.md` que se contradiz e o nome de branch fora do padrão** voltaram na PR #33. Estão em E11 e não
  são reapresentados.

## Decisões estacionadas (§5.1)


Recomendações que apareceram em duas rodadas ou mais com a mesma resposta. Pela
[§5.1 da `cycle-policy`](../.claude/cycle-policy.md), elas **param de ser reapresentadas** até você mexer.
Cada uma tem dono e endereço.

| # | questão | dono | onde mora a decisão | recomendação registrada |
|---|---------|------|---------------------|-------------------------|
| E1 | `observability-logging` fecha como entregue, com o coletor virando spec P própria? (12 rodadas) | você | `docs/PRE-PRODUCTION.md` §11 (o coletor) | fechar e abrir spec P do coletor |
| E2 | `teams-organizations` continua `deferred`? (14 rodadas sem as contrapartidas P) | você | este arquivo, [Achados](#-repositório-rotas-e-proxy) (predicado de posse) | status de sua escolha; as contrapartidas já são achados com arquivo e linha |
| E3 | Ligar branch protection na `main` | você, no painel do GitHub | `docs/PRE-PRODUCTION.md` §9 | ligar, exigindo `verify` e `e2e`; não há pré-requisito técnico. É o que falta para o item 2 de [`e2e-testing`](../docs/features/e2e-testing/spec.md), arquivada com esse ⚠️. Remedido em 2026-09-30, pós-PR #33: 404, `[]`, 33 PRs |
| E4 | O gate `approved` não é usado (**oito** specs entregues sem passar por `approved`, incluindo `admin-billing-insights` e `e2e-testing`; a fatia 1 de `account-security-mfa` saiu da mesma forma, pela PR #29, com a spec em `proposed`). **Em 2026-09-26 o usuário aprovou cinco specs de uma vez, o primeiro uso do gate; `brand-config` (PR #30), `storage-emulator-rules-tests` (PR #31), `accessibility-conformance` (PR #32) e `account-email-change` (PR #33) são as quatro entregues depois de passar por ele** | você | `specs/README.md` (ciclo de vida) | remover `approved` do ciclo de vida ou fazer o `/cycle` recusar spec não aprovada; a auditoria recomenda a primeira |
| E5 | Prazo de retenção da coleção `auditEvent` | você | `docs/PRE-PRODUCTION.md` §1.3 | decidir um prazo padrão sem invocar o art. 15 do Marco Civil |
| E6 | Teto absoluto da sessão ultrapassável por até meia vida de cookie | — | `docs/PRE-PRODUCTION.md`, seção "Declaração — por quanto tempo uma sessão pode ser renovada" | manter o comportamento; o número está escrito onde o fork lê |
| E7 | Busca da tabela enxerga só as páginas carregadas | quem sentir a dor | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | abrir spec quando houver caso de uso |
| E8 | Como medir visitas à `apps/web` | quem pedir | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | o contador próprio é a única saída sem conta nem variável obrigatória |
| E9 | O deep link das abas da conta (`?tab=`) não acompanha a barra lateral (3 rodadas) | você | [Achados](#-ui-i18n-e-front-end), linha de `AccountTabs.tsx` | derivar a aba do `?tab=` a cada navegação, aceitando um `router.replace`; a escolha contrária está comentada no código (`AccountTabs.tsx:55-57`), por isso precisa da sua palavra |
| E10 | O que o modo `simple` deve fazer (a documentação descreve um redirecionamento que não existe) | você | este arquivo, achado A1 em [Achados](#-achados-abertos-reconferidos-ou-herdados) | **o usuário decidiu ignorar o modo por ora (2026-09-25)**. Não reapresentar até ele mexer; a nota de medição do `docs/AUTH-SSO.md` fica como está |
| E11 | O registro da feature não acompanha o merge, e a branch sai fora do padrão (PRs #29 a #33) | você | `.claude/rules/git-commits.md` e `.claude/skills/spec-audit/SKILL.md` §4.1 | o `STATE.md` de `account-security-mfa` segue com `review: in-progress` e o de `brand-config` com `branch: -`, ambos já mergeados, de `feat/account-security-password-policy` e `feat/brand-config`. Na PR #31 o `STATE.md` acompanhou o merge (`review: done`, branch gravada), mas a branch saiu de novo como `feat/<slug>`. Na PR #32 as duas coisas voltaram: `feat/accessibility-conformance` e `review: in-progress` no `STATE.md` depois do merge. Na PR #33 a tabela do `STATE.md` acompanhou (`review: done`, branch gravada), mas as notas do mesmo arquivo dizem que a etapa segue `in-progress`, e a branch saiu como `feat/account-email-change`. Recomendação: a regra aceitar `feat/<slug>` para feature que cruza vários apps (como já aceita para épico), e a auditoria, ao confirmar o merge, gravar no `STATE.md` a linha `review` como `done` com o SHA e a branch |

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
  arquivo movido e confirme zero mortos."* A rodada de 2026-09-25 fez isso à mão pela quinta vez, e as de
  2026-09-28, das duas de 2026-09-29 e a de 2026-09-30 repetiram (nesta, dois links na spec movida).

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-30 |
|------|--------------|------------------------|
| [`account-security-mfa`](account-security-mfa.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`). A spec está `in-progress`, com a fatia 1 em `main` |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`observability-logging`](observability-logging.md) | — | ✅ sem dependência |
| [`compliance-docs-kit`](compliance-docs-kit.md) | — | ✅ sem dependência. A spec está `in-progress`, entregue sem PR |
| [`plan-entitlements`](plan-entitlements.md) | — | ✅ sem dependência. Usa o estado de assinatura de `billing-subscription`, arquivada |

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`compliance-docs-kit`](compliance-docs-kit.md) | Modelos de conformidade: RoPA, incidente, subprocessadores e backup | confianca | médio | P | `in-progress` (entregue sem PR) | — |
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
| `admin-billing-insights` | 2026-09-25 | [`docs/features/admin-billing-insights/spec.md`](../docs/features/admin-billing-insights/spec.md) — **5/5 do corte** (PR #27, `0659ede`). 18 ✅, 4 🔒 e 1 ❌ anterior à entrega (hidratação em `/en` e `/es`). ⚠️ **Duas derivas** contra o bloco de reescopo, sem efeito na tela, aceitas pelo usuário; o endpoint da Stripe de cada fork precisa ganhar `invoice.paid` (`PRE-PRODUCTION.md:454-455`) |
| `e2e-testing` | 2026-09-25 | [`docs/features/e2e-testing/spec.md`](../docs/features/e2e-testing/spec.md) — **4/5 do corte e 1 parcial** (PR #26, `c71755e`). ⚠️ O item 2 roda em toda PR mas **não bloqueia o merge** até o branch protection ser ligado (E3). O `STATE.md` segue com `test: blocked` pelo D3, corrigido na própria PR; o job `e2e` passou nas quatro execuções seguintes |
| `brand-config` | 2026-09-28 | [`docs/features/brand-config/spec.md`](../docs/features/brand-config/spec.md) — **5/5 do corte** (PR #30, `e07252a`), 14 ✅, 0 ❌ e 1 🔒 no `/test` (nome não ASCII na Resend). Primeira spec entregue depois de passar por `approved`. ⚠️ Marca, logo e ícones por fork são passo manual (`PRE-PRODUCTION.md` §13) |
| `storage-emulator-rules-tests` | 2026-09-28 | [`docs/features/storage-emulator-rules-tests/spec.md`](../docs/features/storage-emulator-rules-tests/spec.md) — **5/5 do corte** (PR #31, `2c285de`), 18 ✅, 0 ❌ e 1 🔒 no `/test`; o 🔒 (`verify` no GitHub) passou no merge, com 170 testes contra emulador. Segunda spec entregue depois de passar por `approved`. ⚠️ Deriva no item 5: o `build` não roda os testes contra emulador. Publicar `storage.rules` e ativar o bucket seguem passo manual (`PRE-PRODUCTION.md` §6) |
| `accessibility-conformance` | 2026-09-29 | [`docs/features/accessibility-conformance/spec.md`](../docs/features/accessibility-conformance/spec.md) — **6/6 do corte** (PR #32, `3e5ec4c`), allowlist do axe vazia e `e2e` 22/22 no merge. Terceira spec entregue depois de passar por `approved`. ⚠️ Duas derivas de letra (título por área, `aria-invalid="false"` sem erro); checkout em carregamento e leitor de tela real seguem 🔒. O diff introduziu e corrigiu antes do merge o "Excluir" ilegível no hover |
| `account-email-change` | 2026-09-29 | [`docs/features/account-email-change/spec.md`](../docs/features/account-email-change/spec.md) — **5/5 do corte** (PR #33, `f377c84`), 16 ✅, 0 ❌ e 1 🔒 no `/test` (entrega real do aviso pela Resend). Quarta spec entregue depois de passar por `approved`. ⚠️ Quatro derivas sem efeito no comportamento; o diff introduziu e corrigiu antes do merge dois defeitos de foco no diálogo novo. Resend, `FIREBASE_WEB_API_KEY` e o e-mail de suporte são passo manual por fork (`PRE-PRODUCTION.md` §3, §4 e §13) |

**Verificado na auditoria de 2026-09-30 (pós-PR #33):** `docs/features/` tem **29** pastas e **24** `spec.md`
arquivados. As cinco pastas sem `spec.md` são `account-security-mfa` e `observability-logging` (specs
`in-progress` em `specs/`), `auth-panel-context` e `impersonation-read-only` (as duas anteriores à semeadura) e
`i18n-hydration-admin-delete-billing` (tarefa direta, sem spec). Não houve colisão de arquivamento:
`docs/features/account-email-change/spec.md` não existia antes do `git mv`. Os dois links relativos da spec
movida foram reescritos para o caminho novo e conferidos no disco.

### O que a PR #27 entregou **além** do corte (registrado em 2026-09-25)

1. **O webhook parou de ecoar o evento Stripe** na resposta de sucesso: `route.ts:242` devolve só
   `{ ok: true }`.
2. **A checagem de `ALREADY_EXISTS` do Firestore virou helper compartilhado** (`isAlreadyExistsError`,
   `apps/api/(shared)/infra/firestore-errors.ts:4`), usado pelos repositórios de fatura e de ativação.
3. **Aviso de endpoint incompleto.** Com assinatura vigente e nenhuma fatura paga registrada, a seção avisa
   que falta `invoice.paid` no endpoint (`BillingInsightsSection.tsx:76-83`), em vez de mostrar receita
   zero sem explicação.
4. **A declaração do expurgo ganhou as duas coleções novas** (`docs/PRE-PRODUCTION.md:733`, âncora remedida
   em 2026-09-30, já com o item 14 da entrega de `compliance-docs-kit`): ficam depois da exclusão, porque guardam só ids da Stripe, valor, moeda e datas.

## Contradições doc × código, medidas nesta rodada

Nenhum gate lê prosa. Pela [`cycle-policy` §4](../.claude/cycle-policy.md), afirmação barata de medir num
doc é medida ao passar por ela. Nesta rodada foram medidos os documentos que a PR #33 alterou
(`docs/SECURITY.md`, `docs/PAYMENTS.md`, `docs/PRE-PRODUCTION.md`). A auditoria não edita `docs/`; o que está
defasado fica registrado aqui.

| documento | afirma | realidade medida em 2026-09-30 | veredito |
|-----------|--------|-------------------------------|----------|
| `docs/PRE-PRODUCTION.md:609-617` (§9, gate) | medição no `3e5ec4c`: 28/28 tasks, 792 arquivos, 2296 testes em 220 arquivos | no `f377c84`: 28/28 tasks, **806** arquivos, **2452** em **226**; `test:emulator` 170 em 4; 13 configs com `testTimeout` | ⚠️ **defasado de novo**: a PR #33 corrigiu a contradição da rodada anterior com os números do `3e5ec4c`, e o próprio diff os envelheceu. O parágrafo diz de qual SHA é a medição, então não mente; só está velho. Correção de documento, P |
| `docs/SECURITY.md:15-17` (guards) | **32** arquivos de rota, **20** com guard, **12** nus, 9 em `/auth/*` | `find apps/api/app/(routes) -name route.ts`: 32; 20 com guard; 12 nus, 9 em `/auth/*`, os dois `health` e o webhook | ✅ **honesto**, atualizado pela PR #33 |
| `docs/SECURITY.md:151-153` (rate limit) | 12 caminhos em `apps/api/proxy.ts:45-58`; quatro das sete rotas de `/account` de fora | a lista tem 12 entradas nessas linhas; de fora ficam `PUT /account`, `/account/password`, `/account/sessions/revoke` e `/account/onboarding` | ✅ **honesto** |
| `docs/SECURITY.md:11` (troca de e-mail) | quem aplica o código direto no Identity Toolkit troca o e-mail sem revogação nem evento | a revogação e o evento só existem em `auth/email-change/confirm/route.ts:79`, `:91-101` | ✅ **honesto**; limite declarado |
| `docs/PAYMENTS.md:167` (troca de e-mail e Stripe) | a troca muda só o endereço do Firebase Auth; o `customer` da Stripe fica com o antigo | `git grep "customers.update"` em `apps/api` e `packages/payments`: 0 | ✅ **honesto** |
| `docs/features/account-email-change/STATE.md` | tabela: `review` `done`; notas: "a etapa `review` segue `in-progress`" | PR #33 mergeada com CI verde | ⚠️ **contradição interna**, estacionada em E11 |
| `docs/FORKING.md:432` (link) | aponta para `../README.md#crud-de-referência` | a PR #33 não tocou nos dois arquivos | ⚠️ **link provavelmente morto**, veredito da rodada anterior mantido |
| `docs/features/e2e-testing/STATE.md` (`/test`) | `blocked` pelo D3 | o job `e2e` passou em todas as execuções seguintes, inclusive o merge da #33 | ⚠️ **defasado**, fica como está por decisão do usuário |
| `docs/features/accessibility-conformance/STATE.md`, `account-security-mfa/STATE.md` e `brand-config/STATE.md` | `review: in-progress` / `branch: -` | PRs #29, #30 e #32 mergeadas | ⚠️ **defasados**, estacionados em E11 |
| `docs/AUTH-SSO.md:66-71` e a pendência do modo `simple` no `PRE-PRODUCTION.md` | redirecionamento do comum para a web no `simple` | não remedido; estacionado (E10) | ⚠️ nota de medição anterior segue no lugar |

Os documentos que a rodada anterior mediu e que a PR #33 não tocou (`docs/SETUP.md`, `AGENTS.md`,
`packages/CLAUDE.md`, `docs/ARCHITECTURE.md`, `apps/app/CLAUDE.md`, `README.md`) mantêm o veredito de lá.

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

**Deriva de implementação em `account-email-change`: quatro, nenhuma de comportamento.** A spec arquivada
ganhou a tabela correspondente.

| ponto | especificado | implementado | leitura |
|-------|--------------|--------------|---------|
| sinal de pronto "com a Resend desligada, a UI explica" | a UI diz que a troca está indisponível | a rota responde `503 EMAIL_NOT_CONFIGURED` antes de ler o corpo (`account/email/route.ts:77-82`) e o diálogo mostra o toast traduzido ao enviar; o botão continua visível | a spec não dizia quando a UI avisa; o `/test` mediu o toast nos 3 idiomas |
| risco "o pedido novo invalida o anterior" | o `/analyze` decide | sem estado nosso: o primeiro link aplicado invalida os outros no Identity Toolkit | a spec deixou em aberto; decisão P5 do plano |
| escopo | a rota nova | também a conferência do tipo de código em `/auth/email-verification/confirm` (`:43-48`) e as duas rotas novas na lista de rate limit (`apps/api/proxy.ts:53`, `:57`) | defeito achado no caminho pelo `/review`; sem ele um link de troca aberto sem `mode` mudaria o e-mail sem revogar as sessões |
| `contends_on` | 4 arquivos | 3 alterados; `packages/email/templates/action-link.tsx` intacto, porque a ação nova é uma chave do dicionário; mais 26 arquivos de código e tradução fora da lista, sem contar testes | a previsão errou para menos sem custo, como nas entregas anteriores |

**Erro próprio da rodada, registrado:** o diff introduziu dois defeitos de foco no diálogo novo. O `/review`
pegou o de fechar (o foco caía no `<body>`) e o `/test` pegou o de abrir (o foco ficava fora do diálogo); os
dois foram corrigidos antes do merge. O segundo escapou da revisão porque ela leu o `onCloseAutoFocus` do
Radix e não o `onOpenAutoFocus`.

**Deriva de pipeline:** o nome da branch, `feat/account-email-change`, não segue `<project>/<type>/<title>`,
como nas PRs #29 a #32, e o `STATE.md` se contradiz entre a tabela e as notas (E11).

### Âncoras deslocadas, corrigidas nesta rodada

Todas por arquivos que a PR #33 alterou (`git diff --name-only 3e5ec4c f377c84`). Cada uma foi lida no disco.

| onde | citado | real hoje | causa |
|------|--------|-----------|-------|
| `account-security-mfa.md` e este arquivo | `actions/account/action.ts:98` | **`:113`** | `requestEmailChange` acima |
| idem | `account.schema.ts:46-47` · `:125-126` | **`:47-48`** · **`:136-137`** | um import a mais e o `changeEmailSchema` novo |
| idem | `translations/packages/shared/utils.ts:73`, `:187`, `:300` | `:73`, **`:192`**, **`:311`** | os códigos novos de troca de e-mail |
| `observability-logging.md` | `apps/api/proxy.ts:67`, `:122`, `:161`, `:75-76` | **`:70`**, **`:125`**, **`:164`**, **`:78-79`** | três linhas a mais na lista de rate limit |
| `compliance-docs-kit.md` | `docs/PRE-PRODUCTION.md:522` | **`:533`** | os parágrafos da troca de e-mail no §3 e no §4, e uma linha da entrega de `compliance-docs-kit` |
| este arquivo, achados | `apps/api/proxy.ts:44-55` · `:45-46` · `:106` | **`:45-58`** · **`:47`** · **`:109`** | idem ao `proxy.ts` acima |
| idem | `docs/SECURITY.md:150-152` · `:154` · `:158` | **`:151-153`** · **`:155`** · **`:159`** | o parágrafo da troca de e-mail no topo |
| idem | `docs/PRE-PRODUCTION.md:445-446` · `:556-566` · `:564-566` · `:678-690` · `:706` | **`:454-455`** · **`:567-577`** · **`:575-577`** · **`:690-701`** · **`:733`** | os parágrafos novos do §3, §4 e §12 da PR #33, mais o item 14 e três trechos da entrega de `compliance-docs-kit`, ainda no working tree |
| a spec arquivada | `research/*.md` e `account-security-mfa.md` (relativos a `specs/`) | `../../../specs/research/*.md` · `../../../specs/account-security-mfa.md` | o movimento para `docs/features/`; os dois links conferidos no disco |

A contagem de `logEvent(` fora de testes em `observability-logging` subiu de 31 para **33** (as duas novas são
do escopo `account`); o `console` cru segue em 19 linhas de 12 arquivos. O `analyze/plan.md` e o
`review/review.md` da feature citam `specs/account-email-change.md` como texto, não como link; ficam como
estão, porque a auditoria só escreve em `docs/features/` para arquivar a spec.

### O que a auditoria **não** encontrou

A PR #33 não apagou código de produção; o gate completo passa. Nenhuma spec `done` perdeu código. Nenhuma
feature em `docs/features/*/STATE.md` deveria ter `spec:` e não tem: o `STATE.md` de `account-email-change`
já traz `spec: account-email-change`. Nenhuma entrega parcial órfã: as cinco specs que seguem em `specs/`
foram conferidas por `grep` (entitlements, segundo fator, documentos de conformidade, organizações e
coletor de erro) e nenhuma ganhou código por tabela. A PR #33 não alterou `firestore.rules`,
`firestore.indexes.json`, `storage.rules`, `.env.example`, `keys.ts` nem `env.ts`.

## Achados: correções pontuais, não specs

Coisas que não merecem spec própria, mas que são correções pontuais. Viram tarefa direta no `/analyze`.

> **Auditoria de 2026-09-30 (pós-PR #33).** A rodada anterior fechou com 74 linhas abertas; o número não foi
> recontado linha a linha nesta rodada. As que ficam em arquivos que a PR #33 não alterou (`git diff
> --name-only 3e5ec4c f377c84`) seguem iguais, porque o arquivo é o mesmo byte a byte; as que ficam em arquivos
> alterados (`apps/api/proxy.ts`, `docs/SECURITY.md`, `docs/PRE-PRODUCTION.md`, `account.schema.ts`,
> `translations/packages/shared/utils.ts`) foram reabertas no disco. **Placar: 0 fechados pela entrega · 5
> linhas com âncora deslocada (corrigidas na linha) · 2 descrições atualizadas (a contagem de rotas nuas e a de
> rotas de `/account` fora do rate limit) · 1 ampliado (o `<html lang>` atrasado) · 8 novos (6 da PR #33 e 2 da entrega de `compliance-docs-kit`, no
> complemento da rodada) · 82 abertos.** As
> lacunas de teste herdadas da entrega têm veredito próprio, na seção da rodada de `account-email-change`.

### ✅ Fechados na auditoria de 2026-09-29 (PR #32)

| achado | onde estava | como fechou |
|--------|-------------|-------------|
| 🟡 **Sete grupos de violação passavam pela allowlist da suíte E2E** | `apps/e2e/a11y/allowlist.ts` (antes da PR #32) | A allowlist é `[]` (`allowlist.ts:20`) e o `e2e` do merge passou 22/22. Toggle de senha, `Link` dentro de `Button` na web (hero, CTA, FAQ, preços), contraste de `muted` sobre `muted`, `<title>` do painel, `Select` do navbar e `Switch` das linhas corrigidos no componente ou no call site |
| 🟡 **Os `HookForm*` publicavam `aria-invalid="false"` com o erro visível** | `packages/design-system/components/form/hookform/` (antes da PR #32) | Os oito usam `FormField` + `FormControl`, e os compostos repassam `aria-describedby`. Teste: `hookformAria.test.tsx` |
| 🟡 **`--destructive` do escuro com 1,97:1 como texto** | `packages/design-system/styles/globals.css:63` (antes da PR #32) | Token no valor do upstream (`:63`) e override do `Dropdown` no antd (`antd-app.tsx:75-78`). O `/test` mediu o texto de erro e o "Excluir" em repouso e hover nos dois temas. Teste: `themeContrast.test.ts` |
| 🟡 **`Button` com `loading` perdia o nome acessível** | `packages/design-system/components/ui/button.tsx:72-73` (antes da PR #32) | O texto fica em `sr-only` e o spinner sai da árvore (`button.tsx:63-84`). Teste: `button.test.tsx`. O checkout em carregamento segue 🔒 sem Stripe de teste |
| 🟡 **O gatilho do `ActionsMenu` era um `<div>` sem papel nem nome** | `packages/design-system/components/ui/action-menu.tsx:103-110` (antes da PR #32) | É um `<button>` com `aria-label` do dicionário (`action-menu.tsx:104-113`); a suíte E2E passou a clicar por papel e nome (`entityCrud.spec.ts`) |
| 🟡 **O `ActionsMenu` não tinha teste do próprio componente** | `apps/app/__tests__/usersListArchiveLabels.test.tsx:37` (só mock) | `packages/design-system/__tests__/actionMenu.test.tsx` renderiza o componente real (4 testes) |
| 🟡 **Iniciais do avatar abaixo do AA no claro** | `ui/avatar.tsx` · `Sidebar.tsx` | `--muted-foreground` do claro em `oklch(0.54 0 0)` (`globals.css:21`); o `/test` mediu no estilo computado |
| 🟡 **Avatar do menu de perfil sem `alt`** | `apps/app/shared/components/ui/ProfileDropdown.tsx:45` | `<AvatarImage alt="" src={avatarSrc} />`; o `/test` rodou o axe com avatar enviado, sem `image-alt` |
| ◐ **O formulário de contato da `apps/web` falhava a hidratação** (`button` dentro de `button`) | `apps/web/app/[locale]/contact/components/contact-form-client.tsx:79-80` | `PopoverTrigger asChild` (`:79`) tira o aninhamento. **Fechado só por leitura:** o `Minified React error #418` em `next build && next start` não foi remedido, e a rota `/contact` não está na suíte E2E |

**Fechado pela metade:** "`packages/shared` sem `typecheck`; `@repo/design-system` sem `test`". O design system
ganhou a task (`package.json:7`); o `packages/shared` segue sem `typecheck`. A linha continua na seção de
dependências.

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

Reconferidos em 2026-09-30, pós-PR #33. A PR #33 alterou o arquivo de uma linha desta tabela (`apps/api/proxy.ts`,
na das rotas de `payments/`), e a âncora foi corrigida; o achado continua aberto. Os demais arquivos não
mudaram.

| achado | onde | por que importa |
|--------|------|-----------------|
| ⚠️ **O modo `simple` não restringe o painel comum** (A1) | `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx` (não lê o modo) · `packages/next-config/product-mode.ts:12-23` (sem `commonUserUsesPanel`) · `docs/AUTH-SSO.md:66-71` | O documento descreve um redirecionamento que não existe, e uma pendência do `PRE-PRODUCTION.md` partia dele. Hoje o `simple` só esconde a cobrança. Estacionado (E10): o usuário decidiu ignorar o modo por ora |
| 🟡 **As rotas de `payments/` que chamam a Stripe estão fora do rate limit** | `apps/api/proxy.ts:45-58` | Cada chamada vai à Stripe: o catálogo lista preços, o checkout cria cliente (com chave de idempotência) e sessão, o portal cria sessão. As três exigem sessão, então o abuso depende de conta válida, mas um cliente em loop consome a cota de API da Stripe do fork. `docs/SECURITY.md:151-153` não as lista entre as que ficam de fora (âncoras remedidas em 2026-09-30) |
| 🟡 **`findByStripeCustomerId` devolve o documento cru, sem mapper** | `apps/api/(shared)/repositories/user.repository.ts:67-78` | `{ ...(live.data() as UserDTO), id }` entrega `Timestamp` onde o tipo promete `Date`. Hoje o webhook só lê `id` e `stripeCustomerId`, então não quebra nada. Com o A2 fechado, o perfil arquivado já não tem assinatura viva quando o webhook deixa de achá-lo; quebra no primeiro chamador que ler uma data. Contraria a regra de ouro 5 (normalizar no mapper) |
| 🟡 **`.env.example` da `apps/app` e da `apps/web` publicam `STRIPE_*`, que nenhum dos dois lê** (A3) | `apps/app/.env.example:26-27` · `apps/web/.env.example:5-6` | Quem configura o fork põe a chave secreta em dois apps que não precisam dela. Só a `apps/api` lê (`PRE-PRODUCTION.md` §12 já diz isso) |
| 🟡 **O webhook responde 500 para assinatura inválida** (A4) | `webhooks/payments/route.ts:222-224` → `failure()` em `:187-191` | A Stripe reentrega por até três dias um evento que nunca vai validar. Um 400 encerra as tentativas. `api-hardening` está arquivada, então é tarefa direta |
| 🟡 **O deep link do onboarding perde a query string** | `apps/app/proxy.ts:222` | O proxy grava só o `pathname`. Afeta link de listagem filtrada ou paginada aberto antes do onboarding. Saiu de "Precisam de decisão" pela §5.1: tarefa direta P, gravar `pathname + search` e um caso a mais em `proxy.test.ts` |
| 🟡 **O `getDictionary()` do servidor lê o cookie `x-locale`, não a URL** (fusão, em 2026-09-26, dos achados de `<html lang>` e das páginas da web) | `packages/internationalization/server.ts:18-20` · `apps/app/app/layout.tsx:48`, `:73` · `apps/web/app/[locale]/layout.tsx:23`, `:30` · `apps/web/proxy.ts:107-111` · ex.: `apps/web/app/[locale]/pricing/page.tsx`, `(home)/components/hero.tsx` | O `<html lang>` das duas apps sai do cookie: `/en/sign-in` com `x-locale=pt-br` sai com `lang="pt-br"` (O4 do `/test` da PR #24). Na `apps/web`, o proxy grava o cookie na mesma resposta, então a primeira visita a `/en` sem cookie renderiza os Server Components em pt-br e os componentes client em inglês (medido pelo `/test` da PR #28, que corrigiu só o lado client). Atinge as ~20 páginas e componentes da web que chamam `getDictionary()` sem argumento; leitor de tela pronuncia a página no idioma errado. Era a pergunta 3 da seção 14 do plano de `i18n-hydration-admin-delete-billing`. Tarefa M |
| 🟡 **Lacunas de teste do arquivamento pelo admin** (nova, PR #28) | `apps/api/app/(routes)/users/[id]/route.ts:157-169` · `apps/api/__tests__/usersAdminDeleteBilling.test.ts` | Não há teste para o cancelamento que passa seguido do soft delete que falha (Firestore fora) nem para o duplo clique no "Sim" do diálogo. O `/review` da PR descreveu por leitura o primeiro caso como recuperável: a assinatura já cancelada conta como cancelada na tentativa seguinte (`(shared)/lib/billing.ts:162-173`) |

### 🆕 Achados da entrega `e2e-testing`

Registrados pelo `/review` da suíte E2E. Eram três: a allowlist e o gatilho do `ActionsMenu` fecharam com a PR
#32 e estão na lista de fechados. O CTA do hero segue aberto.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O CTA primário do hero diz "Entrar" e leva a `/contact`** | `apps/web/app/[locale]/(home)/components/hero.tsx:28-42` (destino em `:36`) · o mesmo par no bloco final (`cta.tsx:29`, `:33`) | Texto e destino não combinam. A suíte E2E não afirma esse comportamento, para não transformar o defeito em contrato. Reconferido em 2026-09-29: a PR #32 trocou o `Button` por `Link` com `buttonVariants` e manteve rótulo e destino |

### 🆕 Achados da fatia 1 de `account-security-mfa` (PR #29)

Vindos do plano, do `/review` e do `/test` da fatia, conferidos no código em 2026-09-27. Nenhum bloqueia a
entrega; os três ficaram fora dela por decisão registrada.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Reenviar o cadastro depois de conta criada e login falho responde `USERS_AUTH_EMAIL_ALREADY_IN_USE`** | `apps/app/.../sign-up/components/SignUpFormClient.tsx:112-119` · `apps/web/.../sign-up/components/sign-up-form-client.tsx:34-40` | A criação e o login são duas chamadas. Se a primeira passa e a segunda falha (rede, 429, cookie de sessão), a pessoa reenvia, recebe "e-mail já cadastrado" e precisa ir ao login por conta própria. O `/review` deixou como está porque a correção muda o fluxo; a alternativa registrada é tentar o `signIn` quando o reenvio receber esse código logo depois de um 201 na mesma tela |
| 🟡 **`create-dev-admin.mjs` não aplica a política de senha** | `apps/api/scripts/create-dev-admin.mjs:36-46` | O script cria administrador com qualquer senha que o Firebase aceite (6 ou mais). Fora da fatia por decisão do plano (P4): o script roda em Node puro e repetir a constante criaria a 12ª cópia. Afeta só quem opera o fork |
| 🟡 **Sem `ARCJET_KEY`, nada limita a criação de contas em massa** | `apps/api/proxy.ts:47` (`/auth/sign-up` na lista) · `docs/PRE-PRODUCTION.md:575-577` · `docs/SECURITY.md:159` (âncoras remedidas em 2026-09-30) | A rota cria a conta pelo Admin SDK, que não passa pelo limite do Firebase de 100 contas por hora por IP. A rota está na lista de rate limit, mas o limite é no-op sem a chave. Está escrito nos dois documentos; o critério 19 do `/test` ficou 🔒 |

### 🔴 Segurança: seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **`packages/security/index.ts:11`** lê `keys().ARCJET_KEY` no **import**, e `@repo/security` é o primeiro import do middleware da `apps/api` | `packages/security/index.ts:11` | Reconferido. Uma `ARCJET_KEY` presente e malformada lança dentro do grafo de módulos do middleware: toda requisição falha, sem sinal no boot |
| 🔴 **Conta desativada pelo admin segue com o ID token aceito pela API até ele expirar** (novo, 2026-09-30, da entrega de `compliance-docs-kit`) | `apps/api/app/(routes)/users/[id]/route.ts:117-122` (só `updateUser`, sem revogar) · `packages/auth/server.ts:180-184` (`verifyIdToken` sem `checkRevoked`; confere a marca de revogação, não `user.disabled`) · `apps/api/(shared)/lib/resolve-api-actor.ts:24` | Desativar é o mecanismo de banimento do core, e na API ele leva até 1 hora para valer: `resolveApiActor` devolve o usuário com `disabled=true` para o bearer emitido antes. Medido pelo `/test` de `compliance-docs-kit` contra o projeto Firebase de desenvolvimento (`docs/features/compliance-docs-kit/test/report.md:20`, `:51-53`). O cookie de sessão não tem o problema (`server.ts:298-301`, `checkRevoked: true`). O `getUser` já roda em `server.ts:181`, então recusar `user.disabled` ali não custa chamada a mais; revogar os refresh tokens no `PUT` é a outra metade. **O teste da correção não pode ser no emulador:** `firebase-admin@13.6.0`, `lib/auth/base-auth.js:119`, confere `disabled` sozinho quando `checkRevoked \|\| isEmulator`. Tem de ser teste de unidade ou de rota com `getAuthInstance` mockado. Ligado a [`account-security-mfa`](account-security-mfa.md), cujo `contends_on` cobre os dois arquivos; o status dela não muda. Tarefa direta P |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo** | `apps/api/instrumentation.ts:40-44` | Reconferido: `throw` em `:40-44` (a âncora desceu 20 linhas com o aviso de cobrança da PR #25), zero `process.exit`. `/health/ready` detecta parte das falhas, não esta |
| ⚠️ **Quatro das sete rotas de `/account` seguem fora do rate limit**, entre elas a troca de senha | `apps/api/proxy.ts:45-58` | Recontado em 2026-09-30: a PR #33 criou `POST /account/email` já na lista (`:57`). Ficam fora o `PUT /account`, `/account/password`, `/account/sessions/revoke` e `/account/onboarding`. A PR #25 acrescentou `POST /payments/checkout` e `POST /payments/portal`, também fora; cada checkout pode criar uma sessão na Stripe |
| ⚠️ **Superfície não-guardada da API: 12 de 32** arquivos de rota exportam handler nu, 9 deles `/auth/*` | `apps/api/app/(routes)/auth/**` | Recontado em 2026-09-30: 32 arquivos, 20 com guard. A PR #33 acrescentou `account/email` (com guard) e `auth/email-change/confirm` (nua, como as outras confirmações por link, e na lista de rate limit). Os 12 nus: 9 em `/auth/*`, os dois `health` e o webhook de pagamento. `docs/SECURITY.md:15-17` traz os mesmos números |
| 🟡 **O endpoint de renovação de sessão está fora do rate limit e aceita requisição sem `Origin`** | `packages/auth/session-routes.ts:87` · `packages/auth/session.ts:78-81` | Reconferido. A parte documental está fechada (`docs/SECURITY.md:155`, âncora remedida em 2026-09-30); o comportamento segue |

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
| 🟡 **`FormattedError.retryAfterSeconds` sem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:14,23` | Reconferido. O homônimo de outro tipo em `apps/api/proxy.ts:109` (âncora remedida em 2026-09-30) segue sem relação |
| 🟡 **`reloadCurrentUser` sem teste próprio** | `packages/auth/client.ts:214` | Reconferido em 2026-09-27 (a âncora subiu dez linhas com a saída do `signUp` na PR #29): só `useEmailVerification.test.tsx`, que a mocka |
| 🟡 **`packages/shared` tem `test` e não tem `typecheck`** | `packages/shared/package.json:11` (só `test`) | Metade fechada pela PR #32: o `@repo/design-system` ganhou a task de `test` (`packages/design-system/package.json:7`, 45 testes). Falta o `typecheck` do `packages/shared`, adiado desde a primeira auditoria |
| 🟡 **`welcomeEmail` sem chamador de produção**; o formulário de contato da landing segue maquete | `packages/email/templates/welcome.tsx:50` | Reconferido: 4 ocorrências, 3 em teste. O canal de privacidade da `apps/web` cai nesse formulário quando `NEXT_PUBLIC_PRIVACY_CONTACT` está vazia (`privacyContact.ts:17-18`), então o fallback do canal aponta para uma maquete |
| 🟡 **`useListAuditEvents.test.tsx` deixa trabalho do React pendente depois do teardown** (novo, 2026-09-28) | `apps/app/__tests__/useListAuditEvents.test.tsx:55-70` (um `QueryClient` por teste, sem `clear()` nem `unmount` ao fim) | A suíte da `apps/app` falhou em 2 de 6 execuções locais em 2026-09-28 com `ReferenceError: window is not defined`, que o Vitest atribui a este arquivo: os testes passam e o erro não tratado reprova a task. Na auditoria pós-PR #31 passou nas 6 execuções (688 testes cada) na pós-PR #32 também (6 de 6, 702 testes cada) e na pós-PR #33 também (6 de 6, 756 testes cada), então o acumulado é 2 falhas em 24. O arquivo não muda desde a PR #18. O CI passou nas execuções de merge das PRs #29 a #33. Correção provável, não testada: limpar o `QueryClient` e desmontar o hook no `afterEach`. Tarefa direta P |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:138` | Declara `Promise<UserDTO[]>`, devolve o merge com o Auth e descarta linhas em silêncio (`:148`). N+1 do Admin SDK. Décima rodada aberto; âncoras desceram de novo com os agregados de cobrança da PR #27 |
| 🟡 **`userRepository` tem cinco métodos com semântica própria de "quantos usuários existem"** | `user.repository.ts:122` · `:134` · `:138` · `:157` · `:175` | `touchLastAccess`, `purgeProfile`, `list`, `summary` e `activitySummary`. O cartão de total pode mostrar mais do que a tabela lista, e nada na tela explica |
| 🟡 **O predicado de posse foi copiado de novo** | `apps/api/(shared)/repositories/entity.repository.ts:23,40,64,72` · `entities/summary/route.ts:9` | Quatro cópias de `where("userId", "==", userId)` no mesmo arquivo. É a contrapartida P de [`teams-organizations`](teams-organizations.md) |
| 🟡 **`/auth/sign-in` da api não tem consumidor e não segue o contrato de erro** | `apps/api/app/(routes)/auth/sign-in/route.ts:12` | Reconferido: zero `try`, `:12` devolve string crua (`"User not found"`). Viola a regra de ouro 3. O `sign-up` ganhou chamador indireto de `createDefaultUserProfile` na PR #24 e tem `try` |
| ◐ **`skipValidation` incondicional na `apps/web`** | `apps/web/env.ts:33` | Reconferido. A metade do `NEXT_PUBLIC_APP_URL` fechou com a PR #25 |
| ◐ **O bounce do proxy apaga a query string**, corrigido só para as rotas de `oobCode` | `apps/app/proxy.ts:196-210` | Reconferido: `redirectUrl.search = ""` em `:208` (âncoras desceram quatro linhas com a CSP do emulador de Storage da PR #31). Mesma família do achado novo do deep link do onboarding |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta** | `apps/app/proxy.ts:177,181` | Reconferido em 2026-09-29: `cookieStore.set` sem `maxAge` |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem `Secure`** por padrão | `packages/shared/utils/helpers/cookies.ts:28,30` | Reconferido. ASVS 5.0 L1 (3.3.1). Décima rodada aberto |
| ⚪ **`cors.ts` allow-lista `x-locale`, que só existe como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Reconferido. `x-role` (`:16`) **não** é resíduo |
| 🟡 **O papel do painel viaja em dois headers** | `packages/sdk/src/client/base.ts:45,53,61,95` | Reconferido nas quatro âncoras |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O header logado da `apps/web` rola na horizontal no desktop** | `apps/web/app/[locale]/components/header/index.tsx` (grupo de ações à direita) | A 1280 px o "Sign Out" termina em x=1270 e a página rola 5 px; a 1024 px rola 29 px. Os números são os mesmos no `HEAD` anterior à correção do header, então o defeito é antigo. Medido em 2026-09-25 pelo `/test` da PR #28, já com o header corrigido. Não remedido nesta auditoria, que não sobe browser |
| 🟡 **O deep link das abas da conta não acompanha a navegação** | `AccountTabs.tsx:51-53` (estado lido uma vez) · `:55-62` (`history.replaceState`) | Reconferido. A barra lateral muda a URL e a aba fica onde estava. Estacionado (E9) |
| 🟡 **`"Pick a date"` literal no `DateInput`** | `packages/design-system/components/ui/date-input.tsx:51` | Reconferido em 2026-09-29; a âncora desceu uma linha com o `aria-describedby` da PR #32. Sobreviveu às PRs #11 a #32 |
| 🟡 **O `DateInput` formata sempre em inglês** | `date-input.tsx:86` | Reconferido em 2026-09-29: `format(selected, "PPP")` sem `locale` |
| 🟡 **Strings de UI soltas**: `"Switch language"` nos dois apps, `"Toggle theme"` e `"Toggle Sidebar"` no design-system e `"Início"` no breadcrumb | `apps/app/shared/components/ui/LanguageSwitcher.tsx:79` · `apps/web/app/[locale]/components/header/language-switcher.tsx:68` · `packages/design-system/components/ui/mode-toggle.tsx:39` · `ui/sidebar.tsx:299`, `:311`, `:314` · `PageBreadcrumb.tsx:30` | Reconferido em 2026-09-26. Os dois do design-system entraram nesta rodada, vistos pelo `/test` da PR #28 nos 3 idiomas. O breadcrumb ainda crava `href="/painel"` em `:28`. **Ampliado em 2026-09-29** com o levantamento do plano de `accessibility-conformance` (§12.2): também `"Light"`/`"Dark"`/`"System"` em `mode-toggle.tsx:14-18`, `"Close"` em `dialog.tsx:75` e `sheet.tsx:79`, e os rótulos em inglês de `pagination.tsx:74,91,114`, `breadcrumb.tsx:101`, `carousel.tsx:209,239` e o `"Loading"` de `spinner.tsx:9`, usado avulso em `Container.tsx:28` e `FullScreenLoader.tsx:17` |
| 🟡 **A mensagem de erro padrão está cravada em pt-br num pacote** | `packages/shared/utils/helpers/handleClientError.ts:19` | Reconferido, literal |
| 🟡 **`signInSchema.ts` da `apps/web` crava as mensagens em pt-br** | `apps/web/app/[locale]/sign-in/validations/signInSchema.ts:5`, `:10` | Remedido em 2026-09-26: a PR #29 trocou o número pela constante `EXISTING_PASSWORD_MIN_LENGTH`, mas `"Email inválido"` (`:5`) e `"A senha deve ter pelo menos 6 caracteres"` (`:10`) seguem literais. O cadastro da web foi traduzido na mesma PR; o login não |
| 🟡 **O filtro por usuário da trilha não alcança evento de usuário excluído** | `admin/(pages)/audit/(components)/AuditFilters.tsx:40` | Reconferido. A exclusão de conta apaga o perfil e anonimiza os rótulos, então esses eventos ficam sem entrada no `select` |
| 🟡 **`resolveUserAuditLabel` engole a falha sem log** | `apps/api/(shared)/lib/audit-label.ts:14-16` | Reconferido |
| 🟡 **`images.domains` deprecado com `www.google.com` sem uso** | `apps/app/next.config.ts:19` | Reconferido, literal |
| 🟡 **`setTimeout` sem cleanup no carrossel da landing** | `apps/web/app/[locale]/(home)/components/cases-client.tsx:29` | Reconferido: nenhum `clearTimeout` |
| 🟡 **`useHealthCheck` não exporta a função imperativa** | `apps/app/shared/hooks/useHealthCheck.ts:19` | Reconferido: um único `export` |
| 🟡 **`provider-error` não distingue as falhas do provedor de e-mail** | `packages/email/index.ts:121-131` | Reconferido em 2026-09-28. Descartar o objeto de erro é deliberado |
| 🟡 **O rodapé da `apps/web` depende de `data-cookie-banner` sem teste** | `apps/web/app/[locale]/components/footer.tsx:56` | Reconferido |
| 🟡 **`turbo run` aborta na primeira falha no CI** | `.github/workflows/ci.yml:53` | Reconferido em 2026-09-29, sem `--continue`; a linha agora roda também `test:emulator` |

### 🆕 Achados do inventário da descoberta (2026-09-26)

Vistos pelos quatro inventários paralelos desta rodada. Nenhum vira spec.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **A `apps/web` não tem `not-found` nem `error`, e o `global-error` pode estar inerte** | `apps/web/app/[locale]/global-error.tsx` · `apps/web/app/` (sem `layout.tsx`, `not-found.tsx` nem `error.tsx`) | Rota inexistente na landing cai no 404 padrão do Next, sem tradução nem marca. O Next só reconhece `global-error` na raiz de `app/`, e a web não tem root layout ali; **não medido** se o arquivo em `[locale]` chega a ser usado. A `apps/app` tem `not-found.tsx` e `global-error.tsx` na raiz, mas nenhum `error.tsx` de segmento |
| 🟡 **O `package.json` da raiz ainda é o do next-forge** | `package.json:2-5` · `:42` | Reconferido em 2026-09-28: a PR #30 não tocou no arquivo; o `FORKING.md` ("Resíduos do projeto de origem") descreve a limpeza que cada fork faz à mão. `"name": "next-forge"` e um `bin` para `dist/index.js`, gerado de `scripts/index.ts`, que não existe. `engines.node` diz `>=18` e o `.nvmrc`, `22.12.0`. Todo fork herda os três |
| 🟢 **Link do `FORKING.md` para o CRUD de referência provavelmente morto** (novo, 2026-09-28) | `docs/FORKING.md:432` · `README.md:306` | O link usa `#crud-de-referência`; o título é `### 🧬 CRUD de referência`, e o GitHub transforma o emoji num hífen inicial (`#-crud-de-referência`). Não medido na página renderizada. Correção: trocar a âncora ou tirar o emoji do título |

### 🆕 Achados do `/test` de `brand-config` (2026-09-27)

Medidos pelo `analista-qa` com o nome padrão da marca, em `build && start`, e reconferidos no código em 2026-09-28. A inicial do avatar abaixo do AA fechou com a PR #32. Nenhum bloqueia a entrega; o detalhe e o repro estão em [`docs/features/brand-config/test/report.md`](../docs/features/brand-config/test/report.md).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O `/favicon.ico` da `apps/web` devolve o HTML da home** | `apps/web/app/` (sem ícone na raiz) · `apps/web/proxy.ts:57` (matcher) | Resposta 200 com `text/html`; o `/icon.png` responde 307 para `/pt-br/icon.png`. Já existia antes da entrega. **Descrição corrigida em 2026-09-28:** o matcher do proxy já exclui `favicon.ico` (`:57`), então o pedido não passa pelo proxy e cai no segmento `[locale]` com `favicon.ico` no lugar do idioma. Correção provável, não testada: servir o arquivo na raiz de `apps/web/app/`, que hoje não tem root layout |
| 🟡 **O header deslogado da `apps/web` passa da largura a 1024 px** | `apps/web/app/[locale]/components/header/index.tsx` | 6 px em pt-br e 49 px em es, com o nome padrão. Complementa o achado do header logado acima, que media 29 px a 1024 px |
| 🟢 **Nome de marca com 30 caracteres quebra em duas linhas na barra lateral** | `apps/app/shared/components/ui/Sidebar.tsx` | O critério de 30 caracteres da spec só valia para o header da web. Decidir truncar ou aceitar a quebra |

O atraso de idioma numa navegação (cookie `x-locale` lido no servidor) é o mesmo achado do `getDictionary()` do servidor, já registrado neste arquivo.

### 🆕 Achados da rodada de `storage-emulator-rules-tests` (2026-09-28)

Vindos do plano e do `/test` da spec, entregue pela PR #31. Eram dois; o `alt` do avatar do menu de perfil
fechou com a PR #32 e está na lista de fechados. O outro segue aberto.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Nada impede um `*_EMULATOR_HOST` em produção** | `packages/auth/emulator.ts:27-32`, `:44` · `apps/app/env.ts:25` · `apps/app/shared/lib/storageEnabled.ts:6` | Nenhuma checagem de boot recusa um host de emulador configurado por engano, e isso vale também para o `FIREBASE_STORAGE_EMULATOR_HOST` e o `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST` novos. Se só a variante `NEXT_PUBLIC_` for copiada para a Vercel, o app mostra o seletor de arquivo e põe `http://<host>` no `img-src` da CSP; o upload falha com `error.code` e nada vaza. É o risco R-5 do plano da spec, deixado fora do corte |

**Lacunas de teste herdadas do `/review` e do `/test` da entrega, com o veredito da auditoria pós-PR #31 (a PR #32
não tocou nesses arquivos):**

| lacuna | veredito 2026-09-29 | motivo |
|--------|---------------------|--------|
| O `playwright.config.ts` espera só a porta do Auth, e o caminho em que o Playwright sobe o `pnpm emulators` com o Storage não rodou no `/test` | **fechada** | a execução de merge (`gh run 36491617313`, job `e2e`) subiu `firebase emulators:start --only auth,firestore,storage` pelo Playwright, com o Storage em `127.0.0.1:9199`, e passou 22/22 |
| O `docs/SETUP.md` não tem número para o tempo do `verify` | **fechada como medição**, o documento continua sem o número | 2 min 56 s na PR e 3 min 13 s no merge, as duas com o cache dos JARs vazio. Falta o tempo com cache quente, que a próxima PR mede |
| O `emulator-tests.mjs` não repassa sinal ao filho, e um Ctrl-C poderia deixar Java órfão | **fechada** pelo `/test` | item 4 da lista "Verificar no `/test`": sem Java órfão depois do SIGINT |
| Nenhum teste da `apps/app` renderiza o seletor com só o host de emulador | **continua aberta**, fora do corte | cobertura atual: `storageEnabled.test.ts` e `securityPolicySources.test.ts` |
| O `signReadUrl` emulado não codifica o `path` | **continua aberta, condicional** | só vira defeito se o `STORAGE_OBJECT_PATH_RE` (`apps/api/(shared)/lib/storage.ts:26-27`) afrouxar |
| O `listAll` das rules do Storage só é testado na raiz `uploads` | **continua aberta**, risco baixo | uma mutação `allow list` em `/uploads/{uid}/{file}` passou pela suíte; não foi medido se ela abre de fato a listagem de `uploads/<uid>/` |
| Objeto que não abre sem assinatura e expiração da URL V4 | **fora de escopo** | exige bucket real (`docs/PRE-PRODUCTION.md` §6, pendência 11) |

### 🆕 Achados da entrega `accessibility-conformance` (2026-09-29)

Vindos do §12.2 do plano, do handoff, do `/review` e do `/test` da spec, entregue pela PR #32 e arquivada nesta
rodada. Todos são anteriores ao diff ou ficaram fora do corte por decisão registrada; nenhum bloqueou a entrega.
Reconferidos no código em 2026-09-29.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **"Excluir" do menu de ações não funciona pelo teclado** | `packages/design-system/components/ui/action-menu.tsx:85-94` (o `Popconfirm` embrulha só o rótulo) | Com o foco em "Excluir", Enter fecha o menu sem abrir a confirmação e o foco cai no `body` (medido pelo `/test`). O defeito já existia; a PR #32 o expôs ao tornar o gatilho alcançável por Tab. WCAG 2.1.1. Tarefa direta P, a mais urgente desta lista |
| 🟡 **O gatilho do menu de ações não publica `aria-haspopup` nem `aria-expanded`** | `action-menu.tsx:104-113` | O antd não põe os atributos no filho do `Dropdown`. Leitor de tela não anuncia que o botão abre um menu |
| 🟡 **`--destructive` do claro abaixo de 4,5:1 sobre `--accent` e `--muted`** | `packages/design-system/styles/globals.css:24` | 4,38:1 no "Excluir" com foco de teclado (fundo `--accent`, medido pelo `/test`) e 4,37:1 como texto de erro dentro de card `muted` (calculado no plano). Não aparece nas rotas que a suíte cobre |
| 🟡 **Seed tokens do antd passados como variável CSS viram `#000000`** | `packages/design-system/providers/antd-app.tsx:17-21`, `:36-38` | `colorPrimary`, `colorSuccess`, `colorWarning`, `colorInfo`, `colorLink` e o `colorError` global passam pelo algoritmo de paleta do antd, que não lê variável CSS. Componente antd que pinte com eles sai preto nos dois temas (o ícone do `Popconfirm` já sai). Só o `Dropdown` foi corrigido, por override de componente (`:75-78`) |
| 🟡 **Os tokens `Menu.dangerItem*` não alcançam o `Dropdown`** | `antd-app.tsx:66-70` | Configuração que não tem efeito onde o `danger` aparece no repo |
| 🟡 **`<title>` igual em todas as páginas de cada área do painel** | `(common)/layout.tsx:23-30` · `(admin)/admin/layout.tsx:22-29` | Satisfaz o axe, mas o WCAG 2.4.2 pede título que descreva a página. Os rótulos por rota já existem em `common/routes` e `admin/routes`. Quatro das onze páginas são `"use client"` e precisariam de `layout.tsx` de segmento |
| 🟡 **A página 404 da `apps/app` sai com `document.title` vazio** | `apps/app/app/not-found.tsx:3-5` | Fica fora dos layouts do painel, que são os que ganharam `generateMetadata` |
| 🟡 **O `RadioGroup` não tem nome de grupo** | `packages/design-system/components/ui/radio-group-input.tsx:43` (`Label` sem `htmlFor`) · `form/hookform/hookformRadioGroup.tsx` | O grupo de gênero recebe como nome o texto das opções juntas ("Não informarMasculinoFemininoOutro"). Falta `aria-labelledby` |
| 🟡 **O botão do menu mobile da web não tem nome** | `apps/web/app/[locale]/components/header/index.tsx:261` | `Button` só com ícone (`Menu`/`X`), sem `aria-label`, a 390 px |
| 🟡 **`Button` em carregamento encolhe para a largura do spinner** | `packages/design-system/components/ui/button.tsx:73-77` | 74 → 48 px no "Salvar", medido pelo `/test`. Já acontecia antes da PR #32 |
| 🟡 **`disabled={loading}` vem antes do spread das props** | `button.tsx:69-71` | Um `disabled={false}` explícito do chamador desfaz a trava de carregamento. Já documentado em `sharedFooterPendingState.test.tsx:35-37` |
| 🟡 **`HookFormInputPassword` ignora o `placeholder` do chamador** | `form/hookform/hookformInputPassword.tsx:83` | O valor `"••••••••"` é fixo |
| 🟡 **A dica do `TextareaInput` não entra no `aria-describedby`** | `packages/design-system/components/ui/textarea-input.tsx:42-43` | O `<p>` do `hint` não tem id |
| 🟢 **No formulário de contato, `<Label htmlFor="date">` aponta para um id que não existe** | `apps/web/app/[locale]/contact/components/contact-form-client.tsx:72` | O rótulo não se liga ao botão de data. O formulário é maquete (ver `welcomeEmail`) |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-09-29 | motivo |
|--------|---------------------|--------|
| `Select` mobile do navbar sem asserção de nome | **fechada** pelo `/test` | cenário novo em `panelNavbarControls.test.tsx` |
| `generateMetadata` dos layouts sem teste | **fechada** pelo `/test` | `panelLayoutTitle.test.ts`, 8 casos |
| `NotFoundPage` sem teste de componente | **fechada** pelo `/test` | `notFoundPageHomeLink.test.tsx` |
| Cor dos filhos do item `danger` sem teste | **fechada** pelo `/review` | caso novo em `actionMenu.test.tsx:95`, que duas mutações derrubam |
| Links da web (hero, CTA, FAQ, preços) sem teste de componente | **continua aberta**, risco baixo | a regra `nested-interactive` do axe na suíte E2E barra a regressão nas rotas cobertas |
| Botão de checkout em carregamento | **fora de escopo** | exige chave de teste da Stripe (pendência 23) |
| Campo com erro lido por leitor de tela de verdade | **continua aberto** | o `/test` conferiu atributos na árvore de acessibilidade; nenhum NVDA ou VoiceOver rodou. Não cabe em rodada autônoma |
| Hidratação do contato em `next build && next start` | **continua aberta** | ver o achado fechado por leitura acima |

### 🆕 Achados da entrega `account-email-change` (2026-09-30)

Vindos do `/review`, do handoff e do `/test` da spec, entregue pela PR #33 e arquivada nesta rodada. Nenhum
bloqueou a entrega. Reconferidos no código em 2026-09-30.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O diálogo de exclusão de conta não leva o foco para dentro ao abrir** | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPrivacyPanel.tsx:137` (`AlertDialogContent` sem `AlertDialogCancel` e sem `onOpenAutoFocus`) | O `AlertDialogContent` do Radix foca o `cancelRef`, que só o `AlertDialogCancel` preenche; o rodapé é o `Footer` do app, então o foco fica no botão "Excluir minha conta", fora do diálogo (medido pelo `/test` nas duas rodadas). WCAG 2.4.3. A correção conhecida é a do diálogo de troca de e-mail. São 2 call sites nesse molde, abaixo do limite de 3 da `cycle-policy` §3 para corrigir no design system. Tarefa direta P |
| 🟡 **`lacksPasswordProvider` duplica `requiresPrivacyChannel`** | `AccountEmailChangeDialog.tsx:29`, `:36-46` · `AccountPrivacyPanel.tsx:29`, `:40-48` | A mesma checagem de provedor `password` e a mesma constante `PASSWORD_PROVIDER_ID` em dois arquivos da aba de conta. O plano da feature já previa (§15) |
| 🟢 **A confirmação da troca mostra o mesmo cartão de erro para qualquer código** | `apps/app/app/[locale]/(unauthenticated)/verify-email/components/ConfirmEmailChangeResult.tsx:53-62` | Um `429 AUTH_RATE_LIMITED` diz que o link pode ter expirado, embora o código não tenha sido gasto e recarregar resolva. Espelha o `VerifyEmailResult` por decisão do plano (§5.2) |
| 🟢 **O aviso ao endereço antigo sugere que trocar a senha resolve** | `packages/internationalization/translations/packages/email/index.ts:58`, `:126`, `:193` | "Troque sua senha agora e fale com o suporte": trocar a senha não invalida um link já emitido; quem reverte é o suporte. A frase não mente, mas a ordem engana. Decisão de copy |
| 🟢 **Endereço que o Zod aceita e o Admin SDK recusa vira 500** | `apps/api/(shared)/lib/auth-action-links.ts:122-129` · `account/email/route.ts:127-137` | Se `getUserByEmail` responder `auth/invalid-email`, o erro sobe e a rota devolve `500 ACCOUNT_UPDATE_FAILED`, com `error.code` e sem stack. Raro, não vaza nada |
| 🟢 **Código de troca aplicado direto no Identity Toolkit pula a revogação e a trilha** | `auth/email-change/confirm/route.ts:79`, `:91-101` · `docs/SECURITY.md:11` | Quem tem o link e a chave web pública aplica o código sem passar pela rota. O e-mail muda, as sessões antigas não caem pela revogação explícita e o evento não é gravado. Declarado no documento; fora do corte |

**Ampliado:** o achado do `getDictionary()` do servidor lendo o cookie ganhou a medição do `/test` da PR #33:
na `apps/app`, o `<html lang>` fica uma navegação atrasado ao trocar de idioma pela URL (`/en/verify-email`
aberto logo depois de `/es/account` saiu com `lang="es"`), porque o proxy grava o cookie na resposta
(`apps/app/proxy.ts:181`) e o layout lê o da requisição (`apps/app/app/layout.tsx:73`).

**Lacunas de teste herdadas da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-09-30 | motivo |
|--------|---------------------|--------|
| Retorno do foco ao fechar o diálogo sem teste | **fechada** pelo `/test` | 3 casos em `accountEmailChangeDialog.test.tsx`; a mutação sem `onCloseAutoFocus` derruba os 3 |
| Foco ao abrir o diálogo sem teste | **fechada** pelo `/review` na rodada 2 | caso novo no mesmo arquivo; a mutação sem `onOpenAutoFocus` derruba 4 |
| Rota de verificação aceitando código de troca | **fechada** pelo `/review` | 5 casos em `authEmailVerification.test.ts`, conferido no navegador pelo `/test` |
| Confirmação contra o emulador de Auth sem teste automatizado | **continua aberta**, fora do corte | o `test:emulator` sobe Firestore e Storage, não o Auth (decisão D13 do plano); o `/test` mediu à mão |
| Comportamento do Firebase de produção (conferir sem gastar, link pendente que perde a validade, gerador que recusa endereço em uso) | **fora de escopo** | exige projeto real; declarado no `PRE-PRODUCTION.md` §3 |
| Entrega real dos dois e-mails | **fora de escopo**, 🔒 | pendência 13 |

### 🆕 Achados da entrega `compliance-docs-kit` (2026-09-30)

Vindos do plano, do `/review` e do `/test` da spec, cujo pipeline terminou neste workspace e ainda não tem PR.
O 🔴 da conta desativada está na tabela de segurança acima.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **A `review-checklist.md` não cobra atualizar `SUBPROCESSORS.md` e `ROPA.md` quando entra integração nova** | `docs/review-checklist.md:37-58` (§0, transversal, sem item sobre provedor novo) · `docs/SUBPROCESSORS.md` · `docs/ROPA.md` (novos, no working tree) | A lista de subprocessadores e o registro de operações descrevem as integrações que o código tem hoje. Sem um item no checklist, o primeiro provedor novo entra no código e fica fora dos dois documentos. Apareceu no plano (`analyze/plan.md:751`) e no `/review` (`review/review.md:129`) da entrega; pela §5.1 da `cycle-policy` vira achado em vez de voltar ao relatório. Correção de documento, P, que cabe depois do merge dos dois arquivos |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md).
> Na auditoria pós-PR #33 foram remedidas as linhas 6, 8 e 16. As outras mantêm o veredito anterior com
> motivo: exigem console de provedor, ou dependem de arquivos que a PR #33 não tocou (`firestore.indexes.json`,
> `firestore.rules`, `storage.rules`, `.env.example`, `keys.ts` e `env.ts` ficaram fora do diff). A PR #33 não
> criou índice nem variável de ambiente; acrescentou um 🔒 à 13 (o aviso ao endereço antigo) e passou a
> depender da 26 para o canal de contestação da troca de e-mail.

| # | pendência | onde vive | veredito 2026-09-30 |
|---|-----------|-----------|---------------------|
| 1 | 🔴 Publicar os três índices dos resumos da home (`GET /entities/summary` e `/users/summary` respondem 503 sem eles) | `PRE-PRODUCTION.md` §1.5 | **continua aberto**; não remedido nesta rodada, nada no repositório mudou |
| 2 | 🔴 Publicar o índice das faixas de recência (`user`: `deletedAt` + `lastAccessAt`) | `PRE-PRODUCTION.md` §1.7 | **continua aberto**; idem |
| 3 | 🔴 Publicar o índice da trilha de auditoria (filtro por usuário responde 503) | `PRE-PRODUCTION.md` §1.2 | **continua aberto**; idem |
| 4 | 🔴 Publicar o índice da listagem paginada de `entity` | `PRE-PRODUCTION.md` §1.1 | **continua aberto**. São **seis** índices sem publicação; o comando é um só |
| 5 | Retenção da coleção `auditEvent` | `PRE-PRODUCTION.md` §1.3 | **continua aberto**, estacionado (E5) |
| 6 | ⚠️ `main` sem branch protection | `PRE-PRODUCTION.md` §9 | **continua aberto**, remedido em 2026-09-30 pós-PR #33 (404, `[]`, 33 PRs); estacionado (E3). É o que falta para o item 2 de `e2e-testing`, arquivada com esse ⚠️ |
| 7 | Backfill de instantes em base que já tem dado | `PRE-PRODUCTION.md` §1.4 | **continua aberto**; não é mensurável daqui |
| 8 | Ninguém vigia a trilha de erro (nenhum coletor) | `PRE-PRODUCTION.md` §11 | **continua aberto**, remedido em 2026-09-30 pós-PR #33: `grep` por `@sentry`/`@logtail`/`@axiomhq`/`betterstack` nos `package.json` versionados devolve 0; estacionado (E1) |
| 9 | Health check da plataforma não aponta para `/health/ready` | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: configuração de plataforma |
| 10 | `SESSION_COOKIE_DOMAIN` em subdomínios distintos | `PRE-PRODUCTION.md` §7 | **continua aberto** (configuração de deploy) |
| 11 | Cloud Storage não ativado (plano Blaze) | `PRE-PRODUCTION.md` §6 | **continua aberto** em produção. Desde a PR #31, upload, avatar e o passo `storage` do expurgo rodam e têm teste sob o emulador; contra bucket real seguem sem prova o objeto que não abre sem assinatura e a expiração da URL V4 |
| 12 | Revogação de sessão nunca provada ponta a ponta | *(só neste arquivo)* | **continua aberto** (exige projeto Firebase real) |
| 13 | Envio real de e-mail nunca provado | `PRE-PRODUCTION.md` §3 | **continua aberto** (exige domínio com SPF/DKIM). O `/test` da PR #24 viu o envio do e-mail de verificação falhar sob o emulador, com `RESEND_TOKEN` vazio, como esperado. O `/test` da PR #29 deixou 🔒 o e-mail de verificação depois do cadastro pela API (critério 20). O `/test` de `brand-config` deixou 🔒 o nome da marca com acento na caixa de entrada. O `/test` da PR #33 deixou 🔒 a entrega do aviso ao endereço antigo e do link ao novo; sem Resend o pedido responde `503 EMAIL_NOT_CONFIGURED`, medido nos 3 idiomas |
| 14 | CSP Report-Only na `apps/web` | `PRE-PRODUCTION.md` §10 | **continua aberto**, deliberado |
| 15 | Contas de QA acumuladas no projeto de desenvolvimento | `PRE-PRODUCTION.md` | **continua aberto, não recontado**: exige o console do Firebase. O `/test` da PR #24 criou 7 contas só no emulador, que as descarta |
| 16 | Branches mergeadas vivas no remoto | `PRE-PRODUCTION.md` | **continua aberto**, remedido em 2026-09-30 pós-PR #33: `git ls-remote --heads origin` devolve 32, ou seja, 31 além de `main` (eram 30; a `feat/account-email-change` ficou viva depois do merge) |
| 17 | Login com Google sem passe manual com conta real | *(só neste arquivo)* | **continua aberto**. O `/test` da PR #24 também não percorreu o Google no emulador; o nome do Google como valor inicial do passo 1 ficou fechado só por leitura |
| 18 | `storage.rules` nunca publicado (o teste veio com a PR #31) | `PRE-PRODUCTION.md` §6 e `:54-58` | **metade fechada** pela PR #31: `storage.rules` e `firestore.rules` têm teste contra emulador no `verify` (20 e 145 testes; entrega em [`storage-emulator-rules-tests`](../docs/features/storage-emulator-rules-tests/spec.md)). **Continua aberto** publicar no projeto real, que depende da 11 |
| 19 | Conferir a retenção de log da plataforma | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: painel do provedor |
| 20 | Reabertura do consentimento no `ProfileDropdown` nunca vista num browser | *(só neste arquivo)* | **continua aberto** |
| 21 | No modo `simple` o titular não alcança a aba de privacidade | `PRE-PRODUCTION.md`, seção "Pendência — no modo `simple`…" | **premissa falsa, medida**: o `simple` não restringe o painel comum, então o titular alcança a aba. **Fechada pelo usuário em 2026-09-25.** A nota de correção fica no documento. Volta se o `simple` passar a restringir o painel comum (E10) |
| 22 | `NEXT_PUBLIC_PRIVACY_CONTACT` precisa ser definida por fork | `PRE-PRODUCTION.md` §7 (checklist) | **continua aberto**. Vazia, o canal cai no formulário de contato, que é maquete |
| 23 | Stripe por fork: catálogo recorrente, Customer Portal, endpoint de webhook na versão `2025-09-30.clover` com **cinco** eventos (a PR #27 acrescentou `invoice.paid`, `PRE-PRODUCTION.md:454-455`), chaves na `apps/api`, TTL opcional de `paymentEvent`; e a decisão sobre checar assinatura duplicada na Stripe antes do release | `PRE-PRODUCTION.md` §12 | **continua aberto**. A PR #33 acrescentou ao §12 habilitar a edição do e-mail no Customer Portal, porque a troca de e-mail não atualiza o `customer`. Cinco critérios de `billing-subscription`, quatro de `admin-billing-insights` o cancelamento real no arquivamento pelo admin (PR #28) e o botão de checkout em carregamento (PR #32) seguem 🔒 até uma conta real existir. `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` seguem vazias nos `.env` locais |
| 24 | 🆕 `ARCJET_KEY` por fork: sem ela o rate limit é no-op, e o cadastro pela API passa a depender dela (a rota usa o Admin SDK, fora do limite do Firebase por IP) | `PRE-PRODUCTION.md` §8 (`:567-577`) | **aberto**, entrou com a PR #29. Critério 19 do `/test` da fatia 1 🔒 |
| 25 | 🆕 Fechar o cadastro pelo REST do Identity Toolkit com a chave pública, que ainda aceita senha de 6 ou 7 (Identity Platform: password policy em `ENFORCE` ou cadastro pelo cliente desligado) | `PRE-PRODUCTION.md`, "Declaração — o que a política de senha não alcança" | **opcional, declarado**: o upgrade tem custo ou teto (3.000 DAU no Spark). Critério 18 do `/test` da fatia 1 🔒 |
| 26 | 🆕 Marca por fork: `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_LOGO_URL` e `NEXT_PUBLIC_APP_SUPPORT_EMAIL` nos projetos `app`, `web` e `api`, logo numa URL `https` pública, ícones do produto no lugar dos padrões | `PRE-PRODUCTION.md` §13 (`:690-701`) | **aberto**, entrou com a PR #30. Sem ela, o produto sobe com o nome `next-boilerplate`; não bloqueia nada. Desde a PR #33, sem `NEXT_PUBLIC_APP_SUPPORT_EMAIL` o aviso de troca de e-mail sai sem a linha de suporte, que é o canal para contestar (`PRE-PRODUCTION.md` §3) |

A 21 foi fechada pelo usuário em 2026-09-25. A 18 fechou pela metade em 2026-09-29. A 23 cresceu com as PRs #27, #28, #32 e #33; a 24 e a 25 vieram da PR #29; a 26, da PR #30, e ganhou peso com a #33. A 13 ganhou um 🔒 com a #33.

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo.

> **Em 2026-09-26, cinco linhas saíram daqui** porque viraram spec ou foram absorvidas:
> gate por plano → [`plan-entitlements`](plan-entitlements.md) (o bloqueio em `past_due`, trial, cupom,
> reembolso e faturas em UI própria voltaram como linha própria abaixo); RoPA, incidente, DPA e transferência
> internacional → [`compliance-docs-kit`](compliance-docs-kit.md); troca de e-mail →
> [`account-email-change`](../docs/features/account-email-change/spec.md), entregue em 2026-09-29; emulador de Storage e testes de rules →
> [`storage-emulator-rules-tests`](../docs/features/storage-emulator-rules-tests/spec.md), entregue em 2026-09-28 ("promover admin pela UI" saiu porque já
> existe: campo de tipo no formulário de edição de usuário, `users/[id]/route.ts:108-109`); task de teste do
> design system → [`accessibility-conformance`](../docs/features/accessibility-conformance/spec.md), entregue em 2026-09-29.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| **Bloqueio em `past_due` · trial, cupom, reembolso e faturas em UI própria · nome do plano traduzido** | — | Fora do corte de [`billing-subscription`](../docs/features/billing-subscription/spec.md) e de [`plan-entitlements`](plan-entitlements.md). O Customer Portal cobre trial, cupom, reembolso e faturas; o bloqueio por situação é decisão de produto de cada fork. |
| 🆕 **Jobs agendados (Vercel Cron) para expurgo e retenção** | — | Avaliado em 2026-09-26. Não há job concreto que o core precise rodar: o expurgo da trilha depende do prazo de retenção (E5) e o TTL de `paymentEvent` já é nativo do Firestore. Infra sem consumidor vira código morto. Reabrir quando E5 for decidida. |
| 🆕 **Exportar tabelas do admin em CSV** | não medido | Avaliado em 2026-09-26. Nenhuma tabela exporta hoje e nenhuma referência do painel foi verificada. Sem prevalência, é decisão de fork. |
| 🆕 **Aceite de termos e privacidade registrado no cadastro** | não medido | Avaliado em 2026-09-26. O aviso de privacidade é dever de informação (LGPD art. 9º), não consentimento; aceite de termos é decisão contratual de cada fork. Um link para os dois documentos junto ao botão de cadastro é achado P, não spec. |
| 🆕 **Avisos de segurança por e-mail (senha trocada, sessões encerradas, login novo)** | — | Avaliado em 2026-09-26. É o requisito 6.3.7 da ASVS 5.0.0, **nível 3** (6.3.5, login suspeito, também é nível 3). O aviso ao endereço antigo entrou em [`account-email-change`](../docs/features/account-email-change/spec.md), entregue pela PR #33, por ser barato; o resto espera pedido. |
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
| **Detector de teste instável no CI** | — | O primeiro caso foi consertado na PR #22. Em 2026-09-28 apareceu um segundo, de causa diferente, só local (`useListAuditEvents.test.tsx`, 2 falhas em 24 execuções somando as rodadas de 2026-09-29 e 2026-09-30; ver achados), e o CI passou. O critério de reabertura era um segundo *flake* **no CI**; este ainda não conta. Consertar o teste é tarefa direta P. |
| Provedor de e-mail plugável · rastreio de abertura/clique | — | Fora do corte de `transactional-emails`. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Fora do corte de `file-upload-storage`. |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | Fora do corte de `observability-logging`. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto é uma API. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional. |
| SSO enterprise · SCIM | 0/10 | Só entra com o primeiro contrato enterprise. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | O pré-requisito (CI verde e estável) vale nas 13 últimas execuções de merge na `main`, de `e656331` a `f377c84` (`gh run list`, remedido em 2026-09-30). Reavaliar junto com o branch protection (E3). |
| Remote Cache do Turbo | prática 1 | Arrasta conta e env; entra quando doer, como opt-in. |
| Limiar de cobertura que bloqueia merge | prática 5 | A cobertura já é medida e consolidada (`pnpm coverage`, job `coverage` do CI), pela PR #26. O limiar ficou fora do corte de [`e2e-testing`](../docs/features/e2e-testing/spec.md); reavaliar depois de algumas medições. |
| Changesets / versionamento · Storybook | — | Pacotes `private: true`; o `playground` serve de catálogo. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork. |
