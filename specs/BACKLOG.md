# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue**. Spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última rodada:** 2026-10-21 (`/spec --sync` incremental, sem PR nova em `main` e com a tarefa `leftover-ui-strings`
> sem commit no working tree, passo 1 do segundo `/cycle` do dia) · **anteriores:** 2026-10-21 (`/spec --sync`, pós-merge
> da PR #53, passo 1 de um `/cycle`; medições entre 10:03 e 10:20 BRT) · 2026-10-20 (`/spec --sync` incremental, com a PR #53 aberta) · 2026-10-20 (`/spec --sync`, pós-merge da PR #52) · 2026-10-19 (`/spec --sync`, pós-merge da PR #51) · 2026-10-19 (`/spec --sync`, pós-merge da PR #50) · 2026-10-19 (`/spec --sync`, pós-merge da PR #49) · 2026-10-19 (`/spec --sync`, pós-merge da PR #48) · 2026-10-16 (`/spec --sync`, pós-merge da PR #47) · 2026-10-16 (`/spec --sync`, pós-merge da PR #46) · 2026-10-16 (`/spec` de
> descoberta, foco em `produto`, pedida pelo usuário) · 2026-10-14 (`/spec --sync`, pós-merge da PR #45) · 2026-10-14 (PR #44, três passadas) · 2026-10-13 (PR #43) · 2026-10-08 (PR #42) · 2026-10-07 (PR #41) · 2026-10-07 (PR #40) · 2026-10-04 (PRs #37, #38 e #39) · 2026-10-03 (PR #36) ·
> 2026-09-30 (PR #35) · 2026-09-30 (PR #34) · 2026-09-30 (PR #33) · 2026-09-29 (PR #32) · 2026-09-29 (PR #31) · 2026-09-28 (PR #30) · 2026-09-27 (PR #29) · 2026-09-26 (`/spec` de descoberta, pedida pelo usuário) · 2026-09-26
> (PR #28) · 2026-09-25 (PRs #26 e #27) · 2026-09-25 (PR #25) · 2026-09-24 (PR #24) · 2026-09-23 (PR #23) ·
> 2026-09-23 (PR #22) · 2026-09-19 (PR #21) · 2026-09-17 (PR #20) · 2026-09-17 (PR #19) · 2026-09-17 (PR #18) ·
> 2026-09-16 (PR #17) · 2026-09-16 (PR #16) · 2026-09-16 (PR #15) · 2026-09-16 (PRs #13 e #14) · 2026-09-15 ·
> 2026-09-14 · 2026-09-11 · 2026-09-10 · 2026-09-09 (2 rodadas) · 2026-09-02 · 2026-09-01 (3 rodadas) ·
> 2026-08-31 · **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta passada incremental (2026-10-21, segundo `/cycle` do dia):**
> 1. **Nenhuma spec mudou de status.** `origin/main` segue em `d19e6fd`, o mesmo SHA da auditoria pós-PR #53 da manhã,
>    nenhuma PR nova foi aberta, e os frontmatters das seis specs em `specs/` são os mesmos daquela rodada
>    (`git diff d19e6fd -- specs/` só mostra este arquivo). Contadores e lotes não mudam.
> 2. **A tarefa recomendada pela auditoria da manhã foi executada no working tree e está sem commit.**
>    [`leftover-ui-strings`](../docs/features/leftover-ui-strings/STATE.md) chegou a `test: done` (9/9 critérios), mas
>    não está em `main` nem numa PR, então não conta como entregue. Ver
>    [Executada no working tree](#executada-no-working-tree-sem-commit-leftover-ui-strings).
> 3. **Achados: 0 fechados, 2 corrigidos no working tree aguardando merge, 3 novos, 1 reescrito, 139 abertos**
>    (136 + 3). Os dois corrigidos são os da recomendação da manhã (a validação do login da landing em pt-br e a tela de
>    erro global da app em inglês) e só saem da conta de abertos depois do merge. Os três novos vêm da tarefa: a tela de
>    erro global da app sem estilo nem tema, o cartão do login da landing colado na borda a 375 px e o login da landing
>    sem `noValidate`. O reescrito é o do `global-error` da web, que deixou de ser "não medido": medido no build de produção, o
>    arquivo entra no bundle, mas nunca é renderizado. Ver
>    [Achados da tarefa `leftover-ui-strings`](#-achados-da-tarefa-leftover-ui-strings-2026-10-21-working-tree).
> 4. **Gates não remedidos.** `main` não mudou, então valem os números da auditoria da manhã (30/30 tasks, 965 arquivos,
>    3383 testes, 207 contra o emulador), pela [`cycle-policy` §4](../.claude/cycle-policy.md). O `/test` da tarefa mediu o
>    working tree: `web` com 184 testes (+15 sobre `main`), `app` com 975 (+7) e `pnpm test` da raiz com 15/15 tasks.
> 5. **A recomendação de #1 é outra tarefa direta: tornar efetivo o `global-error` da landing**, que hoje mostra a tela
>    embutida do Next, em inglês e sem botão de tentar de novo. Toca só `apps/web` e não tem arquivo em comum com o diff
>    sem commit. Ver [A próxima](#a-próxima-tarefa-direta-na-tela-de-erro-global-da-landing). Ela já está em andamento no
>    working tree, como [`web-global-error`](../docs/features/web-global-error/STATE.md) (`analyze: done` às 14:47).
>
> **O que mudou na rodada anterior (2026-10-21, pós-PR #53):**
> 1. **A PR #53 entrou em `main` levando duas tarefas diretas.** O merge (`d19e6fd`) foi às 13:02 UTC de 2026-10-21, e
>    a execução de merge do CI (`gh run 39604516025`) passou nos quatro jobs. Além de
>    [`api-edge-413-close-and-route-id`](../docs/features/api-edge-413-close-and-route-id/STATE.md), a branch
>    `guilhermebittelbrunn/cycle-command-v6` recebeu depois a tarefa do sino recomendada pela passada incremental,
>    [`notifications-bell-freshness`](../docs/features/notifications-bell-freshness/STATE.md): dez commits, juntados num
>    só pelo squash. Conferência item a item em [Entregas desta rodada](#entregas-desta-rodada-pr-53).
> 2. **Nenhuma spec mudou de status.** As duas entregas não tinham spec, os seis frontmatters seguem iguais e o código das
>    seis specs vivas não foi tocado pela PR (nenhum arquivo do diff aparece num `contends_on`). Contadores e lotes não
>    mudam.
> 3. **Gates remedidos com `--force` e JDK 21:** 30/30 tasks em 1 min 30 s, 965 arquivos no `pnpm check`, **3383** testes
>    em 308 arquivos (+27, todos da PR #53: `api` +17, `app` +10) e **207** contra o emulador. Ver [Gates](#gates-medidos-nesta-auditoria).
> 4. **Achados: 5 fechados, 3 novos, 1 reduzido, 136 abertos** (138, menos 5, mais 3). Fecharam os dois 🟡 da borda da API e os três
>    🟢 do sino. Os novos vêm do `/review` e do `/test` do sino, todos 🟢. O reduzido é o das âncoras de documento: a PR
>    corrigiu duas. Ver [Achados](#achados-correções-pontuais-não-specs).
> 5. **Âncoras corrigidas neste arquivo.** A PR #53 deslocou `base.repository.ts` (+4 linhas a partir do `findById`),
>    `parse-request-json.ts`, `NotificationsBell.tsx` e o `docs/SECURITY.md` (+4 depois da `:175`). Nenhuma spec viva nem
>    nota de `research/` cita esses arquivos com número de linha.
> 6. **A recomendação de #1 é outra tarefa direta: as strings de UI soltas que sobram fora do dicionário** (o login da
>    landing e a tela de erro global da app), regra de ouro 2, P. Foi executada no mesmo dia, no working tree. Ver
   [Executada no working tree](#executada-no-working-tree-sem-commit-leftover-ui-strings).
>
> **Rodadas anteriores:** a passada incremental de 2026-10-20, com a PR #53 aberta, não teve transição e recomendou a
> tarefa do sino, que entrou na mesma PR. A auditoria pós-PR #52 arquivou `in-app-notifications` (6/6) e recomendou a
> borda da API; o detalhe das duas está na versão deste arquivo em `d19e6fd`. Pós-PR #51, três tarefas diretas
> (`google-sign-in-error-contract`, `password-unlink-email-restore` e `request-body-size-limit`) e gates em 3252 testes,
> tabelas na versão em `3a118c6`; pós-PR #50, a tarefa direta `admin-archive-access-revocation` (3/3), tabelas em
> `9b37e02`; pós-PR #49, `contact-support-channel` arquivada (5/5), tabelas em `4b0be90`; pós-PR #48,
> `linked-sign-in-methods` arquivada (6/6), tabelas em `4eeb07b`. Na descoberta de 2026-10-16 entraram sete specs, e na
> triagem do mesmo dia (D3) você aprovou três, já entregues, manteve duas em `proposed` (uma delas,
> `in-app-notifications`, entregue pela PR #52) e adiou duas.

## Contadores

Sobre as **6 specs que seguem em `specs/`**. Recontados do disco em 2026-10-21, pós-PR #53, lendo o frontmatter de
cada arquivo; os 30 `spec.md` arquivados em `docs/features/` têm todos `status: done`.

| status | qtd |
|--------|-----|
| `proposed` | 1 |
| `approved` | 0 |
| `in-progress` | 2 |
| `done` (arquivadas) | 30 |
| `deferred` | 3 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 4 (1 `proposed`, 3 `deferred`) · `confianca` 1 (`in-progress`) · `dx` 1 (`in-progress`).
**Por esforço:** P 0 · M 5 · G 1. **Por valor:** alto 2 · médio 4 · baixo 0.

**Transições aplicadas nesta rodada (pós-PR #53): 0.** As duas tarefas da PR #53 não tinham spec. Para cada spec viva,
a auditoria procurou no código de `main` a capacidade que falta (`git grep` por `sendSignInLinkToEmail`,
`isSignInWithEmailLink`, `GithubAuthProvider`, `microsoft.com`, `mode: "payment"`, `multiFactor`, `TOTP`, `passkey`,
`organizationId`, `membership` e pelos SDKs de coletor em `apps/` e `packages/`: 0 fora do `input-otp.tsx`) e conferiu que
nenhum dos 15 arquivos de código e documento que a PR alterou fora de `docs/features` e `specs` está num `contends_on`.

> **Elegíveis: 1 de 6**, `magic-link-sign-in` (`proposed`), e nenhuma `approved`. Fora ficam `one-time-purchase`,
> `social-sign-in-providers` e `teams-organizations` (`deferred`, por decisão sua) e `account-security-mfa` e
> `observability-logging` (`in-progress` sem feature em andamento).

**Passada incremental de 2026-10-21 (segundo `/cycle`): 0 transições.** `origin/main` não mudou desde a auditoria da
manhã, e nenhum arquivo de spec foi tocado. A tarefa no working tree não tem spec.

**Registro das rodadas anteriores:** passada incremental de 2026-10-20 (PR #53 aberta), pós-PR #51 e pós-PR #50,
nenhuma transição; pós-PR #52, uma, `in-app-notifications`, de `proposed` para `done`, com o `git mv` no commit `357346d`,
que entrou em `main` pela PR #53; pós-PR #49, uma, `contact-support-channel`, de `approved` para `done`.

## Tarefas diretas entregues (sem spec)

Correções que vieram de achados deste arquivo, sem spec própria. Ficam registradas aqui porque a pasta
`docs/features/<slug>/` delas não tem `spec.md`.

| feature | PR | achados fechados |
|---------|----|------------------|
| [`i18n-hydration-admin-delete-billing`](../docs/features/i18n-hydration-admin-delete-billing/STATE.md) | #28, `295c8de`, 2026-09-26 | hidratação do dicionário client em `/en` e `/es`; A2 (arquivamento pelo admin sem cancelar a assinatura) |
| [`disabled-account-revocation`](../docs/features/disabled-account-revocation/STATE.md) | #35, `1936369`, 2026-09-30 | 🔴 conta desativada pelo admin com o ID token aceito pela API por até 1 hora |
| [`arcjet-key-lazy-validation`](../docs/features/arcjet-key-lazy-validation/STATE.md) | #36, `e791d3a`, 2026-09-30 | 🔴 `ARCJET_KEY` malformada lida no import de `packages/security`, que fazia a API responder 500 a toda requisição |
| [`admin-self-lockout-guard`](../docs/features/admin-self-lockout-guard/STATE.md) | #37, `02c31b5`, 2026-10-04 | 🟢 o admin podia desativar, arquivar ou rebaixar a própria conta e perder o painel; D9 |
| [`action-menu-keyboard-delete`](../docs/features/action-menu-keyboard-delete/STATE.md) | #40, `5f4a8e9`, 2026-10-07 | 🟡 "Excluir" do menu de ações não funcionava pelo teclado (WCAG 2.1.1); 🟡 o gatilho do menu não publicava `aria-haspopup` nem `aria-expanded` |
| [`server-locale-from-url`](../docs/features/server-locale-from-url/STATE.md) | #41, `0a49a3b`, 2026-10-07 | 🟡 o `getDictionary()` do servidor lia o cookie `x-locale`, não a URL: primeira visita a `/en` e `/es` da web com Server Components em pt-br, e `<html lang>` das duas apps uma navegação atrasado (WCAG 3.1.1) |
| [`antd-theme-seed-colors`](../docs/features/antd-theme-seed-colors/STATE.md) | #42, `dbcac2a`, 2026-10-07 | 🟡 as cores-semente do antd, passadas como variável CSS, viravam `#000000`: ícone e "Sim" da confirmação de exclusão do `ActionsMenu` a 1,06:1 e anel de foco dos componentes antd a 1,31:1 no tema escuro (WCAG 1.4.11) |
| [`account-deletion-dialog-focus`](../docs/features/account-deletion-dialog-focus/STATE.md) | #43, `7fb2fe9`, 2026-10-09 | 🟡 o diálogo de exclusão de conta não levava o foco para dentro ao abrir (WCAG 2.4.3); de quebra, a senha digitada e a mensagem de validação voltavam ao reabrir depois de "Cancelar" |
| [`ui-strings-and-password-focus`](../docs/features/ui-strings-and-password-focus/STATE.md) | #43, `7fb2fe9`, 2026-10-09 | 🟡 strings de UI soltas no design system, nos dois seletores de idioma e no breadcrumb (regra de ouro 2); 🟡 a paginação do antd em inglês nos três idiomas; e, sem linha prévia neste arquivo, o foco perdido depois de uma recusa da API nos dois diálogos de conta e o campo de senha da exclusão sem `autoComplete` nem `required` |
| [`date-input-locale`](../docs/features/date-input-locale/STATE.md) | #44, `fa7041b`, 2026-10-14 | 🟡 "Pick a date" cravado no `DateInput`; 🟡 a data escolhida, o calendário e o seletor de mês em inglês em qualquer idioma; e, sem linha prévia neste arquivo, a data do formulário de contato da web também em inglês |
| [`date-input-navigation`](../docs/features/date-input-navigation/STATE.md) | #45, `eb47e80`, 2026-10-14 | 🟡 o calendário abria no mês atual, e o nascimento de `entity` só navegava mês a mês; 🟡 a hidratação da `/contact` com fuso diferente; 🟢 o `initialFocus` obsoleto; 🟢 o caso de teste preso a outubro de 2026; 🟢 o `<Label htmlFor="date">` sem alvo na `/contact` |
| [`form-field-focus-and-names`](../docs/features/form-field-focus-and-names/STATE.md) | #45, `eb47e80`, 2026-10-14 | 🟡 o campo de senha (e o de texto) desabilitado no envio, com perda de foco; 🟡 o `placeholder` do chamador ignorado; 🟡 o grupo de rádio sem nome; 🟡 o `Button` que encolhia no carregamento; 🟡 o `disabled` antes do spread |
| [`web-header-reflow-and-menu-name`](../docs/features/web-header-reflow-and-menu-name/STATE.md) | #45, `eb47e80`, 2026-10-14 | 🟡 o botão do menu mobile da web sem nome; 🟡 o header logado rolando de lado a 1024 e 1280 px; 🟡 o header deslogado passando da largura a 1024 px e, em es, a 1280 px |
| [`web-docs-link-and-mobile-menu`](../docs/features/web-docs-link-and-mobile-menu/STATE.md) | #46, `c8577b7`, 2026-10-16 | 🟡 o link de documentação da web que nunca aparecia, no header nem no footer; 🟢 o menu mobile da web que continuava aberto depois de seguir um link. Tabela de conferência na versão deste arquivo em `dd31a95` |
| [`api-auth-webhook-error-codes`](../docs/features/api-auth-webhook-error-codes/STATE.md) | #46, `c8577b7`, 2026-10-16 | 🟡 A4 (o webhook respondia 500 para assinatura recusada); 🟡 `/auth/sign-in` sem validação, com 500 e string crua; 🟡 `GET /auth/me` com `{ message }` sem `error.code`. Tabela de conferência na versão deste arquivo em `dd31a95` |
| [`admin-archive-access-revocation`](../docs/features/admin-archive-access-revocation/STATE.md) | #50, `4b0be90`, 2026-10-19 | 🟡 o usuário arquivado pelo admin entrava de novo com um perfil novo, e a sessão aberta seguia valendo; de quebra, `POST /auth/sign-in/google` deixou de responder 200 com `user: null` e uma sessão válida. Tabela de conferência na versão deste arquivo em `9b37e02` |
| [`google-sign-in-error-contract`](../docs/features/google-sign-in-error-contract/STATE.md) | #51, `9b37e02`, 2026-10-19 | 🟡 `POST /auth/sign-in/google` lia o corpo sem validação (500 com corpo vazio) e devolvia a mensagem crua do provedor em 401 |
| [`password-unlink-email-restore`](../docs/features/password-unlink-email-restore/STATE.md) | #51, `9b37e02`, 2026-10-19 | 🟡 se a devolução do e-mail falhasse depois de desvincular a senha, a conta ficava sem e-mail, sem revogação e sem registro do `uid` |
| [`request-body-size-limit`](../docs/features/request-body-size-limit/STATE.md) | #51, `9b37e02`, 2026-10-19 | 🟢 as rotas públicas liam o corpo inteiro antes de o Zod recusar tamanho; de quebra, a conta das rotas de `/account` fora do rate limit no `docs/SECURITY.md:160` |
| [`api-edge-413-close-and-route-id`](../docs/features/api-edge-413-close-and-route-id/STATE.md) | #53, `d19e6fd`, 2026-10-21 | 🟡 a conexão que ficava aberta depois do `413` do teto de corpo (PR #51); 🟡 o id com `%2F` que chegava ao `findById` de `entities/[id]` e `users/[id]` (PR #52); de quebra, a omissão do `docs/SECURITY.md` sobre o `413` e três âncoras de documento deslocadas pela PR #52 |
| [`notifications-bell-freshness`](../docs/features/notifications-bell-freshness/STATE.md) | #53, `d19e6fd`, 2026-10-21 | 🟢 a lista do sino atrás do badge por até 60 s; 🟢 o badge que conservava o número depois de uma falha da contagem; 🟢 o popover encostado na borda a 375 px |

As tabelas de conferência item a item das PRs #28, #35 e #36 ficaram na versão deste arquivo em `02c31b5` (a PR
#37 levou a auditoria pós-PR #36 junto); as das PRs #37, #38 e #39, na versão em `5f4a8e9` (a PR #40 levou a
auditoria pós-PR #39 junto); a da PR #40, na versão em `0a49a3b` (a PR #41 levou a auditoria pós-PR #40 junto); a
da PR #41, na versão em `dbcac2a` (a PR #42 levou a auditoria pós-PR #41 junto); a da PR #42, na versão em
`7fb2fe9` (a PR #43 levou a auditoria pós-PR #42 junto); as duas da PR #43, na versão em `fa7041b` (a PR #44 levou
a auditoria pós-PR #43 junto); a da PR #44 e a leitura das duas primeiras tarefas no working tree, na versão em
`eb47e80` (a PR #45 levou a auditoria pós-PR #44 junto); as três da PR #45, na versão em `c8577b7` (a PR #46 levou a
auditoria pós-PR #45 junto); as duas da PR #46, na versão em `dd31a95` (a PR #47 levou a auditoria pós-PR #46 junto).
A conferência da PR #47 (`pricing-page-catalog`, que tinha spec) ficou na versão em `44b2b04` (a PR #48 levou a
auditoria pós-PR #47 junto), e a da PR #48 (`linked-sign-in-methods`), na versão em `4eeb07b` (a PR #49 levou a
auditoria pós-PR #48 junto), a da PR #49 (`contact-support-channel`), na versão em `4b0be90` (a PR #50 levou a
auditoria pós-PR #49 junto), e a da PR #50 (`admin-archive-access-revocation`), na versão em `9b37e02` (a PR #51 levou a
auditoria pós-PR #50 junto), e as três da PR #51 (`google-sign-in-error-contract`, `password-unlink-email-restore` e
`request-body-size-limit`), na versão em `3a118c6` (a PR #52 levou a auditoria pós-PR #51 junto). A conferência da PR #52
(`in-app-notifications`, que tinha spec) ficou na versão em `d19e6fd` (a PR #53 levou a auditoria pós-PR #52 e a passada
incremental junto). As quinze versões estão em `main`, e as pastas das features guardam o resto. As duas tarefas da PR
#53 têm a conferência abaixo.

## Executada no working tree, sem commit (`leftover-ui-strings`)

A tarefa direta recomendada pela auditoria da manhã, [`leftover-ui-strings`](../docs/features/leftover-ui-strings/STATE.md),
passou pelas quatro etapas neste workspace e está **sem commit**: o `STATE.md` registra `analyze`, `develop`, `review` e
`test` como `done` (10:19 a 10:38), e o `/review` deixou um plano de seis commits sem executar nenhum. A branch é
`guilhermebittelbrunn/cycle-command-v7`, sem upstream e sem commit à frente de `origin/main`; o `/review` reprovou o nome no
regex e propôs `fix/leftover-ui-strings` (o caso da E11). **Não está entregue:** o código não está em `main` nem numa PR, e
os dois achados que ela corrige seguem contados como abertos até o merge.

`git status --short`, fora de `docs/features` e `specs`: seis arquivos alterados e três novos. Na `apps/web`,
`signInSchema.ts` e `sign-in-form-client.tsx`, com o teste novo `apps/web/__tests__/signInSchema.test.ts`; na `apps/app`,
`global-error.tsx`, o teste novo `globalErrorLocale.test.tsx` e uma linha a mais em `passwordPolicyCopy.test.ts`; no
dicionário, o bloco `validation` em `translations/apps/web/pages/signIn/index.ts` e a folha nova
`translations/apps/app/pages/common/globalError.ts`, ligada em `common/index.ts`. Nenhuma dependência, variável,
`error.code` ou rota nova.

| achado | o que a tarefa faz | onde, no working tree | estado |
|--------|--------------------|-----------------------|--------|
| 🟡 o login da landing valida em pt-br nos três idiomas | o schema vira `buildSignInSchema(dictionary)`, como o cadastro da landing e o login da app, e o formulário o monta com `useMemo` | `apps/web/app/[locale]/sign-in/validations/signInSchema.ts:7-16`; `sign-in-form-client.tsx:29`; chaves `apps.web.pages.signIn.validation` nos três idiomas | corrigido no working tree, aguardando merge. O `/test` mediu as mensagens em `/pt-br`, `/en` e `/es` do `/sign-in`, com o formulário vazio e com `qa@example` + `12345`, em claro, escuro e 375 px |
| 🟡 a tela de erro global da app fixa em inglês | o `global-error` lê o idioma com `getDictionary()` (último `LocaleProvider` renderizado ou o cookie `x-locale` do proxy) e publica `lang={locale}` | `apps/app/app/global-error.tsx:13-27`; folha `translations/apps/app/pages/common/globalError.ts:1-14` | corrigido no working tree, aguardando merge. O `/test` forçou um `throw` no root layout em `next build && start` e mediu título, botão e `lang` em en, es e pt-br; o `throw` foi removido |

**Veredito do `/test`:** 9 de 9 critérios ✅, nenhum defeito, nenhum teste novo além dos três do `/develop` (T1 com 15
casos, T2 com uma entrada, T3 com 4 casos). Gates do working tree, medidos pelo `/review` e pelo `/test`: `pnpm check` com
968 arquivos e nenhuma correção, typecheck de `web`, `app` e `@repo/internationalization` sem erro, `web` com 184 testes,
`app` com 975 e `pnpm test` da raiz com 15/15 tasks (inclui o `test:emulator`, 207). Nenhuma conta ou dado de QA criado.

**Lacunas herdadas, com veredito desta passada:**

| lacuna | veredito 2026-10-21 | motivo |
|--------|---------------------|--------|
| Sem teste de componente do `sign-in-form-client.tsx` | **fechada** pelo `/test` | a passada de navegador nos três idiomas mediu a ligação entre schema, formulário e mensagem |
| O T3 não clica no botão para conferir o `reset()` | **continua aberta**, P | o `onClick` não mudou no diff e o `/test` viu o handler ligado no navegador; teste só para isso não se paga |
| `noValidate` no login da landing, `global-error` inerte da web e tela de erro da app sem `styles.css` | **viraram linhas** nesta passada | ver [Achados da tarefa `leftover-ui-strings`](#-achados-da-tarefa-leftover-ui-strings-2026-10-21-working-tree) |

A próxima auditoria depois do merge confere o SHA e o CI e move os dois achados para fechados. Se o usuário juntar esta
tarefa e a recomendada abaixo numa PR só, as duas aparecem lá juntas.

## Entregas desta rodada (PR #53)

A PR #53 (`fix(api): close the connection on 413 and answer 404 for unusable route ids`) entrou em `main` em 2026-10-21 às
13:02 UTC, no SHA `d19e6fd`, com os quatro checks verdes na PR (`gh pr view 53`) e na execução de merge, `gh run
39604516025`: `success` em `changes`, `verify` (4 min 21 s), `coverage` e `e2e` (4 min 19 s), na imagem `ubuntu-24.04`
(versão 20261018.339.1). A auditoria conferiu as duas com `gh`. A branch `guilhermebittelbrunn/cycle-command-v6` tinha dez
commits: os seis da borda da API (com a auditoria pós-PR #52 e o arquivamento de `in-app-notifications`), dois de código
do sino, a passada incremental do `BACKLOG.md` e os artefatos do sino. O squash juntou tudo num só, e o título da PR só
fala da primeira tarefa.

`git diff --stat 3a118c6 d19e6fd`, fora de `docs/features` e `specs`: 15 arquivos. Na `apps/api`,
`parse-request-json.ts`, `pagination.ts` e `base.repository.ts`, com três arquivos de teste; na `apps/app`, três hooks
(`useListNotifications.ts`, `useUnreadNotificationsCount.ts` e `useNotificationActions.ts`), o `NotificationsBell.tsx` e
`useNotifications.test.tsx`; e quatro documentos (`docs/SECURITY.md`, `docs/PRE-PRODUCTION.md`, `docs/SUBPROCESSORS.md`
e `AGENTS.md`). Nenhuma dependência, variável, `error.code` ou chave de tradução nova.

### `api-edge-413-close-and-route-id` (PR #53, tarefa direta)

| item | veredito | o que o código de `main` mostra |
|------|----------|----------------------------------|
| 🟡 conexão aberta depois do `413` do teto de corpo (PR #51) | ✅ fechado | as duas recusas por tamanho passam por `refuseTooLarge()`, que responde com `connection: close` (`apps/api/(shared)/lib/parse-request-json.ts:21-22`, chamadas em `:57` e `:66`). O `/test` mediu em `next start`: 0 conexões abertas aos 60 s depois de 50 envios em `chunked`, contra 40 sem o header |
| 🟡 id com `%2F` nas rotas `[id]` (PR #52) | ✅ fechado | `BaseRepository.findById` devolve `null` para o id que `isUsableDocumentId` recusa (`apps/api/(shared)/repositories/base.repository.ts:145-147`), e as rotas já tratavam `null` como 404. O limite do id é 1 500 bytes UTF-8 (`apps/api/(shared)/lib/pagination.ts:3`, `:18-27`). O `/test` mediu 24/24 ids inválidos com 404 `ENTITY_NOT_FOUND`/`USERS_NOT_FOUND` |
| omissão do `docs/SECURITY.md` sobre o `413` (Contradições) | ✅ fechada | `docs/SECURITY.md:176-178` descreve o `connection: close` e o custo medido para o `fetch` do Node (10 de 240 escritas com `ECONNRESET` ou `EPIPE`) |
| três âncoras de documento deslocadas pela PR #52 | ✅ fechadas | `docs/SECURITY.md:17-31` (45 arquivos de rota, 30 com guard), `docs/SUBPROCESSORS.md:35` (`route.ts:216` e `account-erasure.ts:89`) e `docs/PRE-PRODUCTION.md:552` (`account-erasure.ts:99`), conferidas contra o código nesta auditoria |
| regra no `AGENTS.md` | ✅ honesta | `AGENTS.md:46` descreve o `null` do `findById` para id inutilizável, como o código faz |

**Veredito:** entregue. O `/test` fechou com 12 ✅, 0 ❌ e 1 🔒 (o comportamento na Vercel). Testes novos: 47 casos em
`baseRepository.test.ts` (8 da guarda), 13 em `paginationQuery.test.ts` e 16 em `parseRequestJson.test.ts`, contando os
que já existiam; a suíte da `api` foi de 1438 para 1455.

### `notifications-bell-freshness` (PR #53, tarefa direta)

| item | veredito | o que o código de `main` mostra |
|------|----------|----------------------------------|
| 🟢 a lista do sino atrás do badge por até 60 s | ✅ fechado | o `queryFn` da contagem compara a resposta com o número guardado e, se discordam, marca a lista como velha sem relê-la (`useUnreadNotificationsCount.ts:29-40`, marca em `:36-38`); a reabertura relê. Quem escreve na lista devolve a marca (`useListNotifications.ts:20-32`, `:60-67`; `useNotificationActions.ts:57-69`). O `/test` mediu 1 `GET /notifications` na reabertura depois de a contagem mudar e 0 sem notificação nova |
| 🟢 o badge conservava o número depois de uma falha da contagem | ✅ fechado | `useUnreadNotificationsCount.ts:63` devolve 0 com `isError`, e "marcar como lida" não grava na contagem em erro (`useNotificationActions.ts:76-90`). Medido: o badge some na falha e volta com o número do servidor |
| 🟢 o popover encostado na borda a 375 px | ✅ fechado | `collisionPadding={POPOVER_EDGE_GAP_PX}` (12) em `NotificationsBell.tsx:66`, constante em `:17`. Medido: 12 px de cada lado a 375 px nos três idiomas, claro e escuro, vazio e sob personificação |

**Veredito:** entregue, 6 de 6 critérios aprovados, nenhum defeito. O `/develop` acrescentou 10 testes de hook
(`useNotifications.test.tsx`), e a suíte da `app` foi de 958 para 968. Desvio registrado no handoff: toda escrita na
lista apaga a marca de velha no React Query 5.90.20, então os escritores passaram a devolvê-la. O `/review` conferiu a
leitura na fonte do `query-core` e aceitou cinco 🟢; os que sobram viraram linhas em
[Achados da tarefa `notifications-bell-freshness`](#-achados-da-tarefa-notifications-bell-freshness-pr-53).

**Contra a recomendação da passada incremental:** ela pedia reler a lista ao abrir "só quando a contagem mudou", com
uma página. O `/analyze` escolheu invalidar, o que relê as páginas já carregadas (R3 do plano). O item 2 ganhou uma
parte que a recomendação não previa: "marcar como lida" deixou de gravar na contagem em erro, porque o `setQueryData`
limpa o erro e traria o número de volta. O `99+` sobre o ícone ficou de fora, como a recomendação pedia.

## Gates medidos nesta auditoria

Executados em 2026-10-21, entre 10:04 e 10:06 BRT, com `--force`, neste workspace, com o `HEAD` em `d19e6fd` (igual a
`origin/main`) e o working tree limpo. Não copiados do `/test` nem da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` (a task `//#lint` da linha abaixo) | ✅ **965 arquivos · 0 erros** (`No fixes applied`). Mesmo número da rodada anterior: a PR #53 não criou arquivo de código |
| `pnpm turbo run lint typecheck test test:emulator --force`, com o JDK 21 de `/opt/homebrew/opt/openjdk@21` no `PATH` (21.0.12.1) | ✅ **30/30 tasks · 0 em cache · 1 min 30 s**; `api#test:emulator` **207 testes em 5 arquivos**; zero `error TS` no log. Ao fim, nenhuma das portas de emulador (8080, 9099, 9199, 4000, 4400, 4500, 9150, 8085) ficou ouvindo |

**Ambiente, registrado porque mudou o primeiro resultado.** A primeira tentativa falhou em 8 s: o `pnpm` do `PATH` deste
workspace era o binário x86_64 de `~/.local/bin`, e o `node_modules` só tinha os binários nativos `darwin-x64` (Biome,
Rollup, turbo), enquanto o `node` é arm64 (`Cannot find module @rollup/rollup-darwin-arm64`). Um `pnpm install
--frozen-lockfile` com o `pnpm` de `/opt/homebrew/bin` acrescentou os 14 pacotes nativos `darwin-arm64`, sem mexer no
lockfile nem em arquivo rastreado (`git status` limpo), e a segunda tentativa, com esse `pnpm` no `PATH`, é a da tabela.
Não é defeito do repositório; quem montar o workspace com o `pnpm` x86_64 num Mac arm64 vai bater no mesmo erro. O load
average foi de 6,5 no início a 26,0 no fim.

O log do `@repo/design-system` segue trazendo uma ocorrência do aviso `In HTML, <button> cannot be a descendant of
<button>`, do caso do `DialogFooter` com `showCloseButton` (achado aberto em
[Achados da PR #43](#-achados-da-pr-43-2026-10-09)).

**Nenhum dos testes instáveis apareceu.** `useListAuditEvents` passou (suíte da `apps/app`, 968 testes), e o acumulado
fica em 2 falhas em 53. O arquivo `actionMenu.test.tsx` passou inteiro; o acumulado local do caso de Escape fica em 1
falha em 8.

| workspace | arquivos | testes | Δ vs. 2026-10-20 pós-PR #52 |
|-----------|---------:|-------:|-----------------------------|
| `api` | 112 | 1455 | **+17** testes, nenhum arquivo novo (`baseRepository`, `paginationQuery` e `parseRequestJson`) |
| `app` | 115 | 968 | **+10** testes, nenhum arquivo novo (`useNotifications`) |
| `@repo/email` | 7 | 205 | — |
| `@repo/design-system` | 14 | 171 | — |
| `web` | 22 | 169 | — |
| `@repo/auth` | 11 | 132 | — |
| `@repo/internationalization` | 7 | 67 | — |
| `@repo/shared` | 5 | 56 | — |
| `@repo/security` | 3 | 45 | — |
| `@repo/analytics` | 2 | 34 | — |
| `@repo/next-config` | 1 | 32 | — |
| `@repo/payments` | 4 | 22 | — |
| `e2e` | 2 | 16 | — (testes unitários da suíte; os de navegador rodam no `pnpm e2e`) |
| `@repo/sdk` | 3 | 11 | — (as quatro ações de notificação do SDK seguem sem teste no pacote) |
| **total** | **308** | **3383** | **+27** testes, todos da PR #53 |
| `api#test:emulator` (fora da linha acima) | 5 | 207 | — |

Os números batem com os dois `/test` da PR (`api` 1455 no da borda da API, `app` 968 no do sino, emulador 207 nos dois).

O `docs/PRE-PRODUCTION.md` §9 (`:664`) segue com a medição de 2026-09-30 (29/29 tasks, 806 arquivos, 2485 testes em 227,
170 contra emulador). O parágrafo data os números e manda remedir antes de citar, então está honesto; só ficou para trás.

CI: a execução de merge da PR **#53** (`gh run 39604516025`, SHA `d19e6fd`) terminou em **`success`** nos quatro jobs.
As 30 últimas execuções do CI na `main` (`gh run list --branch main --limit 30`) estão verdes. O job `verify` rodou na
imagem `ubuntu-24.04` (versão 20261018.339.1), pelo rótulo `ubuntu-latest`; a migração para o Ubuntu 26 ainda não chegou
a ele (achado aberto em [Achados da PR #48](#-achados-da-pr-48-2026-10-19)).

Branch protection segue **não ligado**, remedido hoje depois do merge da PR #53:
`gh api repos/:owner/:repo/branches/main/protection` → **404** ("Branch not protected"), `rulesets` → **`[]`**. O
repositório tem **53** PRs, nenhuma aberta.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter em 2026-10-21, pós-PR #53) e prioriza valor × esforço × custo de
adiar. Nenhuma spec está bloqueada por dependência. **Nenhuma está `approved`:** a primeira da tabela precisa da sua
aprovação antes de o `/cycle` levá-la ao `/analyze`. `one-time-purchase` e `social-sign-in-providers` ficaram
`deferred` na triagem de 2026-10-16, e as três specs antigas seguem paradas por decisão sua.

> **Critério de execução, sem exceção:** o que uma rodada autônoma consegue provar. O `/cycle` não
> provisiona infraestrutura, então spec cujos critérios dependem de conta em provedor volta com metade dos
> critérios "não verificados".

| # | id | valor · esforço | situação |
|---|----|-----------------|----------|
| 1 | [`magic-link-sign-in`](magic-link-sign-in.md) | médio · M | `proposed`. **Exige sua aprovação.** 5/10, gratuito no Firebase, desligado por padrão. Antes de desenhar, o `/analyze` mede no emulador como o link por e-mail aparece no `providerData` (nota na spec); o caminho principal (receber o link) fica 🔒 sem a Resend |
| 2 | [`social-sign-in-providers`](social-sign-in-providers.md) | médio · M | `deferred` em 2026-10-16. 5/10. A dependência foi entregue pela PR #48; resta o outro motivo do adiamento, nenhum fork pediu GitHub ou Microsoft |
| 3 | [`one-time-purchase`](one-time-purchase.md) | médio · M | `deferred` em 2026-10-16. 4/10. Toca todo o núcleo de cobrança e não tem consumidor no core; volta quando um fork precisar vender avulso |
| 4 | [`account-security-mfa`](account-security-mfa.md), **fatia 3** (segundo fator) | médio · M | `in-progress`, 4 de 6 itens entregues (fatias 1 e 2, PRs #29 e #39). Nenhuma feature ativa e **fora do conjunto elegível** enquanto o status não mudar (E12). Metade dos critérios ficaria 🔒 numa rodada autônoma |
| 5 | [`observability-logging`](observability-logging.md) | alto · M | `in-progress`, 5 dos 6 itens. O que falta é o coletor, que exige conta num provedor. Estacionada (E1) |
| 6 | [`teams-organizations`](teams-organizations.md) | alto · G | `deferred` desde 2026-08-22. Estacionada (E2) |

### A próxima: tarefa direta na tela de erro global da landing

**Recomendação decidida para este `/cycle` (passada incremental de 2026-10-21):** sem spec `approved`, o ciclo segue com
uma tarefa direta que faz a landing usar a tela de erro global que ela já tem. Corte P, só `apps/web`, sem variável, sem
dependência, sem `error.code` e sem chave de tradução nova. **Nenhum arquivo em comum com o diff sem commit de
`leftover-ui-strings`**, então os commits das duas ficam separáveis. **Em andamento** no working tree como
[`web-global-error`](../docs/features/web-global-error/STATE.md): `analyze: done` às 14:47; as etapas seguintes não
estavam registradas no `STATE.md` quando esta passada foi escrita. Sem commit.

**O defeito, medido no build.** A web guarda a tela de erro em `apps/web/app/[locale]/global-error.tsx:1-32`, e a raiz
`apps/web/app/` só tem `[locale]`, `api`, `page.tsx`, `robots.ts` e `sitemap.ts`. O Next 16.0.0
builda com Turbopack (`next/dist/lib/bundler.js:73-76`; o log abre com `Next.js 16.0.0 (Turbopack)`), então o
`next-app-loader` do webpack, que a primeira versão deste parágrafo citava, não roda. O `/analyze` de `web-global-error`
mediu no `.next` de `pnpm --filter web build` (`docs/features/web-global-error/analyze/plan.md` §1.2): hoje o arquivo de
`[locale]` entra no bundle só como chave do segmento, e o `GlobalError` da entrada é o embutido (`E=a.i(41224)`). Em produção ele nunca é renderizado. Com o
arquivo em `app/global-error.tsx`, numa sonda temporária, o build passa, gera `/_global-error` sem exigir
`app/layout.tsx`, e o `GlobalError` passa a ser o da web (`E=a.i(66039)`). Quem visita a landing quando o root layout quebra vê o
`builtin/global-error.js:52-58` do Next: "Application error: a server-side exception has occurred while loading" seguido do
nome do host (ou "client-side", conforme o caso), em inglês nos três idiomas, sem `lang`, sem marca e sem botão de tentar de novo. O texto traduzido já
existe (`dictionary.apps.web.pages.error`), e o proxy da web grava o cookie `x-locale` em toda página
(`apps/web/proxy.ts:111`, `:115`), que é de onde o `getDictionary()` do cliente lê o idioma quando não há
`LocaleProvider` montado.

- **Escopo.** Levar o arquivo para `apps/web/app/global-error.tsx` (com `git mv`, para manter o histórico) e alinhá-lo à
  versão que a app ganhou no working tree: `lang={locale}` sem o fallback `|| "pt-br"`, que é inútil porque o
  `getDictionary()` sempre devolve um dos três idiomas. O `/analyze` decidiu tirar o `console.error` de desenvolvimento, como na app.
  Um teste de componente novo, `apps/web/__tests__/globalErrorLocale.test.tsx`, no molde do T3 da app (render por cookie
  nos três idiomas e sem cookie).
- **Arquivos tocados.** `apps/web/app/[locale]/global-error.tsx` → `apps/web/app/global-error.tsx` e o teste novo. Nenhum
  dos nove do diff sem commit. O dicionário não muda.
- **Pré-requisitos de infra:** nenhum.
- **Como provar.** O teste de componente cobre o idioma. O caminho real repete a receita que o `/test` de
  `leftover-ui-strings` usou na app: um `throw` temporário em `apps/web/app/[locale]/layout.tsx`, `pnpm --filter web build
  && start`, visitas a `/pt-br`, `/en` e `/es`, conferindo `<h1>`, botão e `lang`, e o `throw` removido antes de
  terminar. Vale medir antes da mudança também, para registrar a tela embutida como linha de base. O build com o
  arquivo na raiz já foi medido pelo `/analyze` (passa e gera `/_global-error`); o `/test` repete a medida na versão final.
- **O que não entra.** O estilo e o tema da tela de erro (o achado novo da app vale igual para a web): corrigir nas duas
  de uma vez toca `apps/app/app/global-error.tsx`, que está no diff sem commit, então fica para depois do merge. O
  `not-found` e o `error` de segmento da web também ficam fora; pedem decisão sobre o root layout, que é M.
- **Por que venceu.** É o único candidato sem arquivo em comum com o diff que corrige algo que a pessoa vê, e a prova
  local completa já foi montada uma vez hoje. O achado está aberto desde 2026-09-26 como "não medido", e a tarefa da
  manhã o mediu por leitura da fonte.

**Alternativas descartadas nesta rodada:**

| candidata | por que não é a #1 |
|-----------|--------------------|
| 🟢 `markRead` que acha o documento apagado e responde 500 (`notification.repository.ts:63-68`, âncora remedida, era `:63-67`; `notifications/[id]/read/route.ts:24-30`) | P, só `apps/api`, sem arquivo em comum, prova por unitário. A janela é de milissegundos entre o `findById` e o `update`. Valor baixo; segunda da fila |
| 🟡 `radix-ui: latest` no design system (`packages/design-system/package.json:25`; o lockfile resolve `1.6.7`, `pnpm-lock.yaml:538-540`) | P, sem arquivo em comum, com risco medido (a próxima resolução sobe para 1.8.1). Não muda nada para quem usa o produto e mexe no lockfile. Terceira |
| 🟡 tela de erro global da app sem estilo nem tema (achado novo) | toca `apps/app/app/global-error.tsx`, que está no diff sem commit. Volta depois do merge, junto da web |
| 🟢 cartão do login da landing colado na borda a 375 px e login sem `noValidate` (achados novos) | os dois tocam `sign-in-form-client.tsx`, que está no diff sem commit. Voltam depois do merge, como uma tarefa só |
| 🟢 dois eventos concorrentes da Stripe gerando dois avisos (`webhooks/payments/route.ts:92-111`) | mexe no núcleo de cobrança e só se prova com corrida simulada. Corte M para um efeito raro |
| ⚠️ gate do `CORS_ORIGIN` que não derruba o processo (`apps/api/instrumentation.ts:47-57`, `:63-67`) | decisão sua entre ajustar o comentário e encerrar o processo |
| 🟢 `99+` sobre o ícone (`NotificationsBell.tsx:52-60`) | escolha visual |

**Registro das recomendações anteriores:** a auditoria pós-PR #53, na manhã de 2026-10-21, recomendou as strings de UI
soltas que sobravam (o login da landing e a tela de erro global da app), executada no working tree e sem commit
([Executada no working tree](#executada-no-working-tree-sem-commit-leftover-ui-strings)). A passada incremental de
2026-10-20 recomendou o frescor e a borda do sino, e a auditoria pós-PR #52, a borda da API; as duas entraram pela PR #53
([Entregas desta rodada](#entregas-desta-rodada-pr-53)).

### Se você aprovar `magic-link-sign-in`

Ela passa à frente da tarefa direta recomendada e roda sozinha no lote 1. O valor é médio por M, no baixo do M: uma rota de
pedido, a conclusão no cliente, duas telas e o texto `confirmAccess`, que já existe. Riscos que seguem valendo:

- **Quanto se prova sem infra externa:** a conclusão do login sim, com o link gerado pelo Admin SDK direto no emulador
  de Auth, como o `/test` de `account-email-change` fez com os links de ação. Receber o link no e-mail, não: sem
  Resend a rota responde `EMAIL_NOT_CONFIGURED` e, pela própria spec, a opção nem aparece na tela. Ficam 🔒 a entrega
  (pendência 13), o `429` real (pendência 24), o domínio autorizado num projeto real e o leitor de link de e-mail
  corporativo.
- **Risco de reescopo:** se o link por e-mail entrar como provedor `password` (a documentação do `EmailAuthProvider`
  sugere que sim; não medido), a conta que só entra por link veria "trocar senha", e a exclusão e a troca de e-mail
  pediriam uma senha que não existe. Isso puxa a aba Segurança e os dois diálogos de conta para o corte.

### Sem aprovação: o que mais o ciclo pode atacar

- **Nenhuma spec `in-progress` serve.** `account-security-mfa` (fatia 3) e `observability-logging` dependem de ativar
  recurso ou abrir conta num provedor (E12 e E1). A auditoria não recomenda.

### Tarefas diretas candidatas

Na ordem em que a auditoria as pegaria quando não houver spec aprovada.

- **Tela de erro global efetiva na landing** (`apps/web/app/[locale]/global-error.tsx`, que o Next nunca renderiza): a
  recomendada. P, só `apps/web`, com o `throw` temporário em build de produção no `/test`.
- **`markRead` contra documento apagado** (`notification.repository.ts:63-68`): P, só `apps/api`, prova por unitário.
  Valor baixo.
- **`radix-ui: latest` no design system** (`packages/design-system/package.json:25`): P, fixar a versão que o lockfile
  tem hoje (`1.6.7`).
- **Depois do merge de `leftover-ui-strings`: estilo e tema das duas telas de erro global** (`apps/app/app/global-error.tsx`
  e o arquivo da web, já na raiz): P a M, porque cada app guarda o `styles.css` num lugar (`apps/app/app/layout.tsx:2`,
  `apps/web/app/[locale]/layout.tsx:1`) e, na app, o tema vem do root layout que a tela de erro substitui (a classe no
  `<html>`, `apps/app/app/layout.tsx:66-72`, e o `AppDesignProvider`, `:86`). Hoje toca um arquivo do diff sem commit.
- **Depois do merge de `leftover-ui-strings`: o login e o cadastro da landing a 375 px e sem `noValidate`**
  (`sign-in-form-client.tsx`, `sign-up-form-client.tsx`): P, só `apps/web`. Hoje toca um arquivo do diff sem commit.
- **Laço de redirecionamento da conta arquivada antes da correção** (`user-merge.ts:61-67`, `apps/app/proxy.ts:251-266`,
  `authSession.ts:34-39`): P a M, `apps/app`, e pede uma medição que o `/test` não conseguiu montar. Achado da PR #50.
- **A `apps/web` com `RESEND_*` e `@repo/email` sem envio** (`apps/web/env.ts:1`, `.env.example:2-3`,
  `package.json:19`): P, só config da web.
- **`getMergedUserFromIdToken` sem chamador** (`user-merge.ts:32-48`): P, `apps/api`.
- **`typecheck` do `packages/shared` e o hash do `typecheck` no turbo** (`packages/shared/package.json:11`,
  `turbo.json:11-14`): P e medido, mas é ferramenta de quem mantém o repositório, mexe no lockfile (o
  `@types/node`) e no `turbo.json`, que toda tarefa usa.
- **CI em `ubuntu-latest` durante a migração para o Ubuntu 26** (`.github/workflows/ci.yml:21`, `:60`, `:84`,
  `:142`): P, fixar `ubuntu-24.04` ou aceitar a migração. A execução de merge da PR #53 ainda rodou em `ubuntu-24.04`.
- **Guard de redirect: decodificação dupla e teste fora do pacote** (`packages/auth/redirect.ts:27`,
  `apps/app/__tests__/postAuthRedirectTarget.test.ts`): P, só `packages/auth` e um teste movido.
- **A `apps/web` sem `not-found`, `error` e `favicon.ico`** (raiz de `apps/web/app/` sem layout): M, e criar um root
  layout na web mexe no mesmo lugar que o idioma do servidor usa (PR #41). O `global-error` saiu deste item: não precisa
  de root layout e virou a recomendada.
- **Aparelho encerrado com a tela aberta não sai sozinho** e **sessão expirada que perde a query**
  (`packages/auth/provider.tsx`): M. Nenhuma spec da fila declara o arquivo.
- **Nome de marca longo no header a 1024 px**: decisão de produto (a marca sai do centro).
- **Fatia 3 de `account-security-mfa` e coletor de `observability-logging`**: dependem de ativar recurso ou abrir
  conta num provedor (E12 e E1).

Nesta passada saíram da lista as strings soltas, executadas no working tree, e entraram a tela de erro global da landing
(recomendada) e os dois pares de achados novos que esperam o merge de `leftover-ui-strings`. Na auditoria pós-PR #53 da
manhã tinha saído o frescor e a borda do sino, e o `radix-ui: latest` tinha subido para o terceiro lugar.

**Os demais candidatos não mudaram de motivo desde 2026-10-07 e não são mais reapresentados** (§5.1): o contraste
do seletor de tamanho da paginação, o `CommandDialog` em inglês, o 404 de arquivo inexistente (O1 da PR #41), as
rotas fora do rate limit, as âncoras de documento deslocadas, o código do erro em recusa esperada, o idioma das
preferências, o asterisco do `Label`, o foco que sai do botão de enviar e o `data-day`. O motivo de cada um está na
linha do achado, em [Achados](#achados-correções-pontuais-não-specs).

## Lotes paralelos

Para rodar o ciclo completo em 2 ou 3 workspaces do Conductor ao mesmo tempo. Recalculado em **2026-10-21**, na
auditoria pós-PR #53, e conferido sem mudança na passada incremental da tarde, a partir do `contends_on` de cada spec, lido do disco, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3. Os 24 caminhos declarados pelas seis specs (22 distintos) existem no disco. **O lote não muda:**
nenhum status mudou, e nenhum dos 15 arquivos que a PR #53 alterou fora de `docs/features` e `specs` aparece no
`contends_on` de alguma spec (`git diff --name-only 3a118c6 d19e6fd` contra os seis frontmatters: 0). A PR #53 mudou
`base.repository.ts`, que o `specs/README.md` usa como exemplo de arquivo de convergência; nenhuma spec viva o declara.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Se você só vai rodar uma
coisa, rode o #1 da ordem.

**Elegíveis agora: 1 de 6**, `magic-link-sign-in`. **O lote 1 só fica executável depois da sua aprovação** (E14); até
lá, o `/cycle` não tem spec para pegar e roda a tarefa direta recomendada.

| lote | specs | o que toca (`contends_on`) | por que não colide |
|------|-------|----------------------------|--------------------|
| 1 | `magic-link-sign-in` | `packages/auth/client.ts`, `SignInForm.tsx`, `auth-action-links.ts` e `apps/api/proxy.ts` | spec única no lote |

Por que cada spec ficou fora do lote 1, nominalmente:

- **Nenhuma elegível ficou de fora.** O lote tem uma, porque só uma é elegível; não é o teto nem colisão que limita.
- A tarefa direta recomendada (a tela de erro global da landing) não entra em lote, porque não é spec. Ela move
  `apps/web/app/[locale]/global-error.tsx` para a raiz de `apps/web/app/` e cria um teste na `apps/web`. Nenhum dos dois
  está no `contends_on` de `magic-link-sign-in`, que deixa a `apps/web` fora do corte (`magic-link-sign-in.md:89`): rodaria
  em paralelo ao lote 1 sem colisão prevista. Também não divide arquivo com `leftover-ui-strings`, executada no working
  tree e sem commit, que toca o login da landing, o `global-error.tsx` da app e o dicionário.
- **`social-sign-in-providers`** (`deferred`, fora dos lotes) colide com `magic-link-sign-in` em `client.ts` e
  `SignInForm.tsx`.
- **`one-time-purchase`** (`deferred`, fora dos lotes) não colide com `magic-link-sign-in`.
- **`teams-organizations`** (`deferred`, fora dos lotes) não colide com `magic-link-sign-in` nem com a tarefa
  recomendada.

Contra as specs antigas: nenhum arquivo de `magic-link-sign-in` está no `contends_on` de `account-security-mfa`
(`server.ts`, `session.ts` e `session-routes.ts` em `packages/auth`, e `resolve-api-actor.ts`) nem no de
`observability-logging` (`requestErrorReporter.ts`).

**Lição da PR #53 para o campo:** as duas tarefas diretas não declararam `contends_on`. A da API ficou na
`apps/api` e em documentos, e a do sino tocou os três hooks e o componente que o plano listava; o desvio do handoff
mudou onde os helpers moram, não quais arquivos mudam. **Lição da PR #52:** a spec declarou cinco arquivos e a entrega tocou os cinco, mais cerca de 55 fora da
lista. Os de convergência que ela não previu: `user-merge.ts` (toda spec que reage à criação de conta), a folha de
`apiErrors`, `log.ts` (toda spec que cria escopo de log) e o seed do emulador. **Lição da PR #51, que segue valendo:**
um helper que toda rota importa (`parseRequestJson`) é ponto de convergência como `apps/api/proxy.ts` e a folha de
`apiErrors`. **Lição da PR #48:** além de `account-export.ts`, o enum `AuditAction`
(`packages/sdk/src/types/audit/audit.ts`) e o mapa de rótulos da trilha
(`translations/apps/app/pages/admin/auditTrail.ts`) são ponto de convergência de toda spec que grava evento novo de
auditoria.

### Registro das rodadas anteriores

Pós-PR #52 e na passada incremental, o lote 1 era `magic-link-sign-in` sozinha e não rodou, por falta de aprovação;
rodaram as duas tarefas diretas da PR #53, que tocaram 15 arquivos fora de `docs/features` e `specs`, nenhum no
`contends_on` de spec viva. Pós-PR #51, o lote 1 tinha `in-app-notifications` e `magic-link-sign-in`; rodou só a primeira, sozinha, por instrução
sua, ainda `proposed`, e virou a PR #52. Pós-PR #50, o lote 1 tinha as mesmas duas specs, com `magic-link-sign-in` em
primeiro, e não rodou, por falta de aprovação; rodaram as três tarefas diretas da PR #51, que tocaram 11 arquivos fora
de `docs/features` e `specs`, nenhum no `contends_on` de spec viva. Pós-PR #49, o lote 1 era o mesmo e também não rodou; rodou a tarefa direta do arquivamento,
que tocou `users/[id]/route.ts`, `user-merge.ts`, `user.repository.ts`, a rota do Google, `googleSignInApi.ts` e cinco
documentos, nenhum no `contends_on` de spec viva. Pós-PR #48, o lote 1 era `contact-support-channel` sozinha; a PR #49
acertou os quatro arquivos previstos e tocou outros cerca de vinte, metade documentos. Pós-PR #47, o lote 1 era
`linked-sign-in-methods` e `contact-support-channel`; só a primeira rodou, e a PR #48 tocou dois dos três previstos e
cerca de vinte fora da lista. O detalhe está nas versões deste arquivo em `4b0be90`, `4eeb07b` e `44b2b04`.

### Registro da rodada pós-PR #46 (2026-10-16)

O lote 1 era `pricing-page-catalog`, `linked-sign-in-methods` e `in-app-notifications`; o lote 2,
`contact-support-channel`; o lote 3, `magic-link-sign-in`. Só `pricing-page-catalog` rodou, sozinha. Ela declarava
sete arquivos e tocou cinco; fora da lista, tocou os formulários e as páginas de login e cadastro da app, que
`magic-link-sign-in` e `social-sign-in-providers` declaram.

### Onde os lotes colidiram de fato (PRs #38 e #39)

Na auditoria de 2026-10-03, `plan-entitlements` era o lote 1 sozinho. Na prática, o `/cycle` rodou `plan-entitlements` e a
fatia 2 de `account-security-mfa` em paralelo, as duas a partir de `e791d3a`, embora a segunda estivesse
`in-progress` e, pelo algoritmo, fora do conjunto elegível. As duas mergearam em sequência, com CI verde, e
tocaram os mesmos seis arquivos, nenhum deles no `contends_on` das duas:

- `apps/api/(shared)/lib/account-export.ts` e `apps/api/__tests__/accountExportRoute.test.ts`: as duas
  acrescentaram campos à exportação de dados do titular;
- `packages/sdk/src/types/account/account.ts`: as duas mexeram no `AccountDTO` e no `AccountDataExportDTO`;
- `apps/api/.env.example` e `docs/PRE-PRODUCTION.md`: as duas acrescentaram texto;
- `translations/packages/shared/utils.ts`: excluído do `contends_on` por regra, e de fato aditivo.

`plan-entitlements` declarou 3 arquivos e tocou 2 (`webhooks/payments/route.ts` e `billing-state.ts`; o tipo
novo foi para um arquivo próprio, `plan-access.ts`, e `payments.ts` ficou intacto). `account-security-mfa`
declarou 4 e a fatia 2 tocou 3 (`session.ts` ficou intacto). **Lição para o campo:** a exportação de dados
(`account-export.ts` e o `AccountDataExportDTO`) é ponto de convergência de toda spec que grava dado pessoal novo,
e deve entrar no `contends_on` de qualquer spec assim. O efeito colateral do paralelo apareceu nos documentos, não
no código: ver as âncoras deslocadas em [Contradições](#contradições-doc--código-medidas-nesta-rodada).

### Nota de processo: a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por processo, não por
dado (ver [`README.md`](README.md#depends_on--contends_on)). As PRs #38 e #39 seguiram a nota: nenhuma das duas
tocou o `BACKLOG.md`. As PRs #40 a #53 tocaram, mas só para levar a auditoria anterior (na #53, duas: a pós-PR #52 e a passada
incremental), feita num workspace só.

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma previsão feita lendo o corte de
MVP, e o histórico mostra que ela erra para menos: `admin-billing-insights` declarou 5 arquivos e tocou 4;
`brand-config`, `storage-emulator-rules-tests`, `accessibility-conformance` e `account-email-change` tocaram de
12 a 31 arquivos de código fora da lista; as PRs #38 e #39, acima, dividiram seis arquivos sem declarar nenhum;
a tarefa direta da PR #41 tocou quatro dos cinco previstos e mais quatro fora. A da PR #42 acertou os dois arquivos
de código, a primeira da PR #43 acertou os dois previstos, a da PR #44 tocou os dois previstos e mais dois arquivos
de código fora da lista, e as três da PR #45 tocaram tudo o que previam e mais quatro arquivos de código fora da lista
(`hookformInput.tsx`, `useSubmitEnterGuard.ts` e os dois footers da `apps/app`). As duas da PR #46 erraram para mais e
para menos ao mesmo tempo: a da web previu o `footer.tsx`, que não precisou mudar, e não previu o `package.json` da web;
a da API não previu o `auth.schema.ts`. A da PR #47 errou nos dois sentidos também: dois dos sete arquivos ficaram
intactos, e os formulários de login e cadastro da app, que outras duas specs declaram, entraram sem previsão. A da
PR #48 declarou três, tocou dois e mais cerca de vinte fora da lista, quase todos na aba de conta e nos dicionários. A
da PR #49 acertou os quatro previstos e tocou outros cerca de vinte, metade deles documentos. A tarefa direta da PR #50
não declarou `contends_on`, e o plano dizia "nenhum arquivo" em `apps/app`; a PR acabou mudando `googleSignInApi.ts`.
As três da PR #51 também não declararam, e a PR ficou dentro do que os planos diziam: 11 arquivos, todos na
`apps/api` ou em documento, sem `apps/app`, `apps/web` nem `packages/*`. A spec da PR #52 declarou cinco arquivos e tocou
os cinco, mais cerca de 55 fora da lista (`user-merge.ts`, a `Navbar`, o layout comum, a folha de `apiErrors`, `log.ts`,
o seed e seis documentos). As duas tarefas da PR #53 não declararam e ficaram onde os planos diziam. Nenhuma rodada
registrou conflito de merge causado por esses erros.

## Precisam de decisão

Uma aberta: a D9, que espera a compra avulsa voltar da fila. As decisões que se repetem, inclusive a E14 (qual spec
aprovar), seguem em [Decisões estacionadas](#decisões-estacionadas-51), com a mesma recomendação, e não são
reapresentadas nesta rodada.

| # | pergunta | recomendação | por quê |
|---|----------|--------------|---------|
| D9 | Na compra avulsa, o estorno feito no painel da Stripe retira o acesso? | sim, quando a spec voltar da fila | sem isso, o acesso vitalício sobrevive ao dinheiro devolvido. A spec está `deferred` desde 2026-10-16, então a pergunta só volta junto dela |

Respondidas por você na triagem de 2026-10-16, todas pela recomendação. Cada uma está registrada na seção
"Decisões" da spec: D3 (a triagem), D4 (o CTA de preços leva ao cadastro da app, cumprido pela PR #47 em
`pricingCta.ts:30-31`), D5 (definir a primeira senha numa conta só Google encerra as outras sessões), D6 (o core terá
central de notificações, com o corte da spec, cumprida pela PR #52), D7 (o contato entrega em
`NEXT_PUBLIC_APP_SUPPORT_EMAIL`) e D8 (o link mágico não cadastra no MVP). D1 e D2 fecharam com a PR #46.

Resolvidos sem pergunta na auditoria pós-PR #53, por medição:

- **O CI no SHA de merge da PR #53**: verde nos quatro jobs (`gh run 39604516025`, concluída às 13:06 UTC), e as 30 últimas
  execuções na `main` também, conferido com `gh run view` e `gh run list` por esta auditoria.
- **Se a tarefa do sino entrou em `main` junto com a da API**: sim. A PR #53 tem dez commits, os quatro últimos do sino
  (`gh pr view 53 --json commits`), e o código está em `d19e6fd` (ver [Entregas desta rodada](#entregas-desta-rodada-pr-53)).
  O `STATE.md` do sino registra `review: done` e `test: done`, e o da API, também.
- **Se a PR #53 mudou a superfície da API**: não. Seguem 45 arquivos de rota e 15 sem guard (`find` e `grep -LE`), como o
  `docs/SECURITY.md:17-31`, agora em `main`, diz.
- **Se os índices do projeto de referência mudaram**: não. O `ListIndexes` do Firestore Admin em `next-boilerplate-576d0`,
  pelo MCP do Firebase, devolve o mesmo índice composto único (`user`: `reference_id` + `deletedAt`, `READY`).
- **Se a branch da PR #53 foi apagada no remoto**: não; `guilhermebittelbrunn/cycle-command-v6` segue em
  `git ls-remote` (pendência 16).
- **Se os testes instáveis reapareceram**: não, numa execução (ver [Gates](#gates-medidos-nesta-auditoria)).

Resolvidos sem pergunta na passada incremental de 2026-10-21 (segundo `/cycle`), por medição: se algo entrou em `main`
desde a manhã (não, `origin/main` segue em `d19e6fd`), se o `global-error` da web é renderizado (não, medido no build
Turbopack pelo `/analyze` de `web-global-error`) e se a tarefa recomendada divide arquivo com o diff sem commit (não, conferido contra
`git status --short`).

Resolvidos sem pergunta na passada incremental de 2026-10-20 (PR #53 aberta): se a PR estava pronta para merge (sim,
quatro checks verdes), se algo tinha entrado em `main` (não), se o `docs/SECURITY.md` ainda dizia 41 e 26 rotas (só em
`main`, até o merge) e se a tarefa do sino colidia com a PR ou com spec (não). A lista da auditoria pós-PR #52 está na versão deste
arquivo em `d19e6fd`.

## Decisões estacionadas (§5.1)

Recomendações que apareceram em duas rodadas ou mais com a mesma resposta. Pela
[§5.1 da `cycle-policy`](../.claude/cycle-policy.md), elas **param de ser reapresentadas** até você mexer.
Cada uma tem dono e endereço.

| # | questão | dono | onde mora a decisão | recomendação registrada |
|---|---------|------|---------------------|-------------------------|
| E1 | `observability-logging` fecha como entregue, com o coletor virando spec P própria? (14 rodadas) | você | `docs/PRE-PRODUCTION.md` §11 (o coletor) | fechar e abrir spec P do coletor. A E12 pede a mesma coisa para `account-security-mfa` |
| E2 | `teams-organizations` continua `deferred`? (16 rodadas sem as contrapartidas P) | você | este arquivo, [Achados](#-repositório-rotas-e-proxy) (predicado de posse) | status de sua escolha; as contrapartidas já são achados com arquivo e linha |
| E3 | Ligar branch protection na `main` | você, no painel do GitHub | `docs/PRE-PRODUCTION.md` §9 | ligar, exigindo `verify` e `e2e`; não há pré-requisito técnico. É o que falta para o item 2 de [`e2e-testing`](../docs/features/e2e-testing/spec.md), arquivada com esse ⚠️. Remedido em 2026-10-21, pós-PR #53: 404, `[]`, 53 PRs |
| E4 | O gate `approved` não é usado. Em 2026-09-26 você aprovou cinco specs de uma vez, e as cinco foram entregues depois de passar por ele (PRs #30 a #34). `plan-entitlements` foi a nona entregue sem passar por `approved`: você a manteve `proposed` em 2026-09-26, e o `/analyze` de uma rodada do `/cycle` a levou direto a `in-progress`. `in-app-notifications` foi a décima: entrou no `/cycle` pós-PR #51 ainda `proposed`, por instrução direta sua, e foi entregue pela PR #52 | você | `specs/README.md` (ciclo de vida) | remover `approved` do ciclo de vida ou fazer o `/cycle` recusar spec não aprovada; a auditoria recomenda a primeira |
| E5 | Prazo de retenção da coleção `auditEvent` | você | `docs/PRE-PRODUCTION.md` §1.3 | decidir um prazo padrão sem invocar o art. 15 do Marco Civil |
| E6 | Teto absoluto da sessão ultrapassável por até meia vida de cookie | — | `docs/PRE-PRODUCTION.md`, seção "Declaração — por quanto tempo uma sessão pode ser renovada" | manter o comportamento; o número está escrito onde o fork lê |
| E7 | Busca da tabela enxerga só as páginas carregadas | quem sentir a dor | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | abrir spec quando houver caso de uso |
| E8 | Como medir visitas à `apps/web` | quem pedir | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | o contador próprio é a única saída sem conta nem variável obrigatória |
| E9 | O deep link das abas da conta (`?tab=`) não acompanha a barra lateral (3 rodadas) | você | [Achados](#-ui-i18n-e-front-end), linha de `AccountTabs.tsx` | derivar a aba do `?tab=` a cada navegação, aceitando um `router.replace`; a escolha contrária está comentada no código (`AccountTabs.tsx:55-57`), por isso precisa da sua palavra. O `PlanGate` da PR #38 leva a `/account?tab=billing` e funciona porque a aba é lida ao montar |
| E10 | O que o modo `simple` deve fazer (a documentação descreve um redirecionamento que não existe) | você | este arquivo, achado A1 em [Achados](#-achados-abertos-reconferidos-ou-herdados) | **o usuário decidiu ignorar o modo por ora (2026-09-25)**. Não reapresentar até ele mexer; a nota de medição do `docs/AUTH-SSO.md` fica como está |
| E11 | O registro da feature não acompanha o merge, e a branch sai fora do padrão `<project>/<type>/<title>` | você | `.claude/rules/git-commits.md` e `.claude/skills/spec-audit/SKILL.md` §4.1 | **Passada incremental de 2026-10-21:** `leftover-ui-strings` está sem commit na `guilhermebittelbrunn/cycle-command-v7`, que o `/review` reprovou no regex, propondo `fix/leftover-ui-strings` (o diff cruza `apps/web`, `apps/app` e um pacote); a decisão do renome segue com você. **Atualizado em 2026-10-21, pós-PR #53:** a PR #53 saiu da branch `guilhermebittelbrunn/cycle-command-v6`, fora do padrão, que o `/review` das duas tarefas reprovou no regex e manteve por pedido do usuário (o da API propôs `api/fix/edge-413-close-and-route-id`). É a décima quinta PR (#37, #40 a #53) cujo squash leva a auditoria anterior junto, e a primeira a levar duas tarefas em sequência na mesma branch, com o título só da primeira. Os dois `STATE.md` registram `review: done` e `test: done`; o do sino diz que o `review: done` foi marcado antes dos commits, a pedido do orquestrador. A contagem de `STATE.md` com `review: in-progress` depois do merge fica em **22**, agora entre 56 (recontada nesta rodada). **Registro anterior, pós-PR #52:** a PR #52 saiu da branch `feat/in-app-notifications`, sem `<project>`, porque o diff cruza `apps/api`, `apps/app` e três pacotes; o `/review` a criou e registrou o motivo no `review/review.md`. É a décima quarta PR (#37, #40 a #52) cujo squash leva a auditoria anterior junto. O `STATE.md` registra `review: done`, `test: done` e o nome da branch que subiu, então a contagem de `STATE.md` com `review: in-progress` depois do merge fica em **22**, agora entre 54 (recontada nesta rodada, lendo a coluna de status da linha `review` de cada um). **Registro anterior, pós-PR #51:** a PR #51 saiu da branch `guilhermebittelbrunn/cycle-command-v5`, que os três `STATE.md` chamam de fora do padrão, com o nome `api/fix/google-sign-in-unlink-restore-body-cap` proposto pelo `/review` (passa no regex) e "renomear só com aprovação do usuário"; a renomeação não aconteceu. É a décima terceira PR (#37, #40 a #51) cujo squash leva a auditoria anterior junto. Os três `STATE.md` ficaram com `review: in-progress`, e o de `request-body-size-limit` também com `test: blocked`, embora a PR tenha sido mergeada; a contagem de `STATE.md` com `review: in-progress` depois do merge sobe para **22**, agora entre 53 (recontada nesta rodada, lendo a coluna de status da linha `review` de cada um). **Registro anterior, pós-PR #50:** a PR #50 saiu da branch `guilhermebittelbrunn/cycle-v3`, que o próprio `STATE.md` chama de inválida, propondo `fix/admin-archive-access-revocation`; a renomeação não aconteceu. É a décima segunda PR (#37, #40 a #50) cujo squash leva a auditoria anterior junto, de novo com um arquivamento (`contact-support-channel`). O `STATE.md` ficou com `review: in-progress`, então a contagem de `STATE.md` com `review: in-progress` depois do merge sobe para **19**, agora entre 50 (recontada nesta rodada, lendo a coluna de status da linha `review` de cada um). **Registro anterior, pós-PR #49:** branch `feat/contact-support-channel`, sem `<project>`; `STATE.md` com `review: in-progress`; 18 entre 49. **Registro anterior, pós-PR #48:** a PR #48 saiu da branch `feat/linked-sign-in-methods`, sem `<project>`, porque o diff cruza `apps/api`, `apps/app` e três pacotes; o `/review` a criou a partir de `guilhermebittelbrunn/cycle-v2` e validou o nome no regex do comando. É a décima PR (#37, #40 a #48) cujo squash leva a auditoria anterior junto, e desta vez também o arquivamento de `pricing-page-catalog`. O `STATE.md` registra `review: done`, `test: done` e o nome da branch que subiu, então a contagem de `STATE.md` com `review: in-progress` depois do merge fica em **17**, agora entre 48. **Registro anterior, pós-PR #47:** a PR #47 saiu da branch `feat/pricing-page-catalog`, sem `<project>`, porque o diff cruza `apps/api`, `apps/web`, `apps/app` e quatro pacotes. É a nona PR (#37, #40 a #47) cujo squash leva a auditoria anterior junto, e desta vez também as sete specs da descoberta. Ponto positivo: o `STATE.md` registra `review: done`, `test: done` e o nome da branch que de fato subiu. A contagem de `STATE.md` com `review: in-progress` depois do merge fica em **17**, agora entre 47. **Registro anterior, pós-PR #46:** a PR #46 saiu da branch `guilhermebittelbrunn/cycle-2-features-implement`, que o `/review` das duas tarefas reprovou na regex e recomendou renomear para `fix/web-docs-link-and-api-error-codes`; a renomeação não aconteceu. É a oitava PR (#37, #40 a #46) cujo squash leva a auditoria anterior junto. Os dois `STATE.md` da PR (`web-docs-link-and-mobile-menu` e `api-auth-webhook-error-codes`) ficaram com `review: in-progress`, então a contagem subiu de 15 para **17**, entre 46 (recontada nesta rodada, lendo a linha `review` de cada um). **Registro anterior, pós-PR #45:** a PR #45 saiu como `fix/date-pickers-form-fields-and-header`, sem `<project>`, porque o diff cruza `packages/design-system`, `apps/app`, `apps/web` e `packages/internationalization`. É a sétima PR (#37, #40 a #45) cujo squash leva a auditoria anterior junto. Ponto positivo: os três `STATE.md` da PR (`date-input-navigation`, `form-field-focus-and-names` e `web-header-reflow-and-menu-name`) registram `review: done` e o nome da branch que de fato subiu; a contagem de `STATE.md` com `review: in-progress` depois do merge segue em 15, agora entre 44. **Registro anterior, pós-PR #44:** a PR #44 saiu como `fix/date-input-locale`, sem `<project>`, porque o diff cruza `packages/internationalization`, `packages/design-system` e `apps/web` (o `/review` dela citou esta linha como precedente). É a sexta PR (#37, #40, #41, #42, #43 e #44) cujo squash leva a auditoria anterior junto; na branch, a auditoria tinha commit `docs(specs)` próprio, como a regra pede. Das PRs #29 a #44, só a #36, a #40 e a #42 seguiram o padrão de branch; as três tocam código de um pacote só. **Contagem corrigida nesta rodada:** a auditoria anterior dizia que seis `STATE.md` seguiam com `review: in-progress` depois do merge. Lendo a linha `review` de todos os 41 `STATE.md` em `fa7041b`, são **15**: `api-hardening`, `cursor-pagination`, `audit-log`, `user-activity-tracking`, `onboarding-flow`, `accessibility-conformance`, `account-security-mfa`, `observability-logging`, `plan-entitlements`, `account-active-sessions`, `server-locale-from-url`, `antd-theme-seed-colors`, `account-deletion-dialog-focus`, `ui-strings-and-password-focus` e `date-input-locale`, todas com PR mergeada e CI verde (`observability-logging` com a parte entregue). As outras rodadas contavam só as features recentes. Os 26 restantes têm `review: done`; `e2e-testing` tem `test: blocked`, por decisão sua. A auditoria não os edita, porque a `spec-audit` só a autoriza a acrescentar `spec:` ao arquivar. Recomendação: a regra aceitar `fix/<slug>` e `feat/<slug>` para tarefa que cruza vários apps (como já aceita para épico), e a auditoria, ao confirmar o merge, gravar no `STATE.md` a linha `review` como `done` com o SHA e a branch |
| E12 | O destino da fatia 3 de `account-security-mfa` (segundo fator com códigos de recuperação, itens 5 e 6). Era a D10, aberta em 2026-10-04; estacionada em 2026-10-07, na segunda aparição. Opções: **(a)** arquivar a spec como entregue em 4/6, em `docs/features/account-security-mfa/spec.md`, e abrir uma spec `proposed` só do segundo fator; **(b)** voltar a spec para `proposed`, com as fatias entregues registradas nela, para que entre nos lotes; **(c)** manter `in-progress`; **(d)** marcar a fatia 3 como `deferred` dentro da spec | você | a spec [`account-security-mfa`](account-security-mfa.md) | **(a)**. Com `in-progress` e nenhuma feature ativa, a spec fica fora dos lotes para sempre, e o status afirma um trabalho que ninguém está fazendo. (a) segue o padrão recomendado na E1, deixa a evidência das fatias 1 e 2 junto da feature e abre uma spec pequena sobre o que falta: prevalência de 3/10, preço no GCIP não confirmado, ativação do recurso no projeto Firebase. A pasta de destino tem o mesmo nome do `id` e ainda não tem `spec.md` (reconferido em 2026-10-21, pós-PR #53), então não há colisão. (b) é a saída de menor esforço se você quiser manter o histórico num arquivo só |
| E13 | Ligar o bloqueio de bot da landing? Hoje ele nunca roda, nem com chave válida (achado do `skipValidation` da `apps/web`). Era a D8, aberta em 2026-09-30; estacionada em 2026-10-07, na quarta aparição | você | este arquivo, [Achados](#-repositório-rotas-e-proxy), linha do `skipValidation` | não ligar agora e declarar a decisão. Ligar é pôr `detectBot` e `shield` em modo `LIVE` para visitante anônimo em todo fork que já tem a chave; pede teste próprio (falso positivo de crawler, preview de link) e não cabe numa correção de configuração. Os documentos em `main` já descrevem o comportamento atual (`docs/SUBPROCESSORS.md:40` e `docs/FORKING.md:327-328`, no §7.3; a frase do `docs/ROPA.md:108` saiu com a PR #49, porque o envio do contato deixou de passar pela landing). Tirar o `skipValidation` sem esta decisão liga o bloqueio por tabela |
| E14 | Qual spec aprovar, já que nenhuma está `approved`? Era a D10, aberta em 2026-10-19 pós-PR #49; estacionada na segunda aparição, pós-PR #50. **Recomendação mudada em 2026-10-20, pós-PR #52**, e por isso reapresentada: a spec que ela recomendava, `in-app-notifications`, foi entregue | você | este arquivo, [A próxima](#a-próxima-tarefa-direta-na-tela-de-erro-global-da-landing) | a única elegível é `magic-link-sign-in` (5/10, sem custo, caminho principal 🔒 sem a Resend). Aprovar depois da medição do `providerData` no emulador, que o `/analyze` faz antes de desenhar e que pode puxar a aba Segurança para o corte. Enquanto não houver aprovação, o `/cycle` roda tarefa direta: a borda da API e o sino entraram pela PR #53, a das strings soltas foi executada no working tree em 2026-10-21, e a recomendada agora é a tela de erro global da landing. Sem recomendação nova, não é reapresentada (§5.1), nem nas passadas incrementais de 2026-10-20 e de 2026-10-21. Se nenhuma das specs `deferred` voltar, a fila de specs fica com uma só, e a próxima descoberta (`/spec` sem argumento) é o caminho para repor |

**Duas recomendações repetidas são decisões técnicas e deveriam virar linha de política.** A auditoria
não edita `.claude/`, então elas ficam aqui como texto pronto para você colar:

- Em `.claude/cycle-policy.md` §2: *"Spec cujo corte a auditoria contestou em duas rodadas não entra em
  `/analyze` sem um bloco 'Reescopo que o `/analyze` deve aplicar' na própria spec. Se o bloco não existir,
  o `/cycle` escolhe a próxima."* Caso medido: `onboarding-flow` ficou seis rodadas presa pelo corte
  contestado, ganhou o bloco numa rodada e foi entregue na seguinte, 5/5. O bloco de `account-security-mfa`,
  escrito em 2026-09-26, levou às fatias 1 e 2.
- Em `.claude/skills/spec-audit/SKILL.md` §4.1, antes do passo 5: *"Reescreva os links relativos de saída
  da spec para o caminho novo: `research/*.md` vira `../../../specs/research/*.md`, spec viva vira
  `../../../specs/<id>.md`, spec arquivada vira `../<slug>/spec.md`. Rode o verificador de links no
  arquivo movido e confirme zero mortos."* A rodada de `plan-entitlements` fez isso à mão nos dois links de saída, e esta
  fez de novo nos três de `pricing-page-catalog` (a nota de pesquisa, `contact-support-channel` e `onboarding-flow`) e
  nos quatro de `linked-sign-in-methods` (a nota de pesquisa, `social-sign-in-providers`, `account-security-mfa` e
  `magic-link-sign-in`). O mesmo passo não cobre o link de entrada que o `analyze/plan.md` da feature tem para
  `specs/<id>.md` e que morre com o movimento: aconteceu de novo na rodada pós-PR #48, com
  `docs/features/linked-sign-in-methods/analyze/plan.md:3`, o terceiro (ver o achado).

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-10-21, pós-PR #53 |
|------|--------------|------------------------|
| [`magic-link-sign-in`](magic-link-sign-in.md) | — | ✅ sem dependência |
| [`social-sign-in-providers`](social-sign-in-providers.md) | `linked-sign-in-methods` | ✅ satisfeita (PR #48, `44b2b04`), arquivada em [`docs/features/linked-sign-in-methods/spec.md`](../docs/features/linked-sign-in-methods/spec.md). A spec segue `deferred` |
| [`one-time-purchase`](one-time-purchase.md) | — | ✅ sem dependência |
| [`account-security-mfa`](account-security-mfa.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`). A spec está `in-progress`, com as fatias 1 e 2 em `main` |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`observability-logging`](observability-logging.md) | — | ✅ sem dependência |

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`magic-link-sign-in`](magic-link-sign-in.md) | Entrar com link enviado por e-mail | produto | médio | M | `proposed` | — |
| [`social-sign-in-providers`](social-sign-in-providers.md) | Login com GitHub e Microsoft, ligados por configuração | produto | médio | M | `deferred` | ✅ `linked-sign-in-methods` |
| [`one-time-purchase`](one-time-purchase.md) | Compra avulsa com acesso vitalício | produto | médio | M | `deferred` | — |
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `in-progress` (fatias 1 e 2 entregues, PRs #29 e #39) | ✅ `account-settings` |
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
| `onboarding-flow` | 2026-09-24 | [`docs/features/onboarding-flow/spec.md`](../docs/features/onboarding-flow/spec.md) — **5/5 do corte** (PR #24, `d52c4f0`), 20/20 critérios sob o emulador. Deriva no item 3, o deep link que voltava sem a query string: **fechada pela PR #47** (`apps/app/proxy.ts:280`, `:247`). O texto da spec arquivada (`spec.md:246`) descreve a deriva como aberta e não foi editado |
| `billing-subscription` | 2026-09-25 | [`docs/features/billing-subscription/spec.md`](../docs/features/billing-subscription/spec.md) — **6/6 do corte** (PR #25, `a1f87d0`), mais o passo `billing` do expurgo herdado de `data-rights-lgpd`. 19 ✅ e 5 🔒 no `/test` (só conta Stripe real prova). ⚠️ Catálogo, portal, endpoint de webhook e chaves são passo manual por fork (`PRE-PRODUCTION.md` §12) |
| `admin-billing-insights` | 2026-09-25 | [`docs/features/admin-billing-insights/spec.md`](../docs/features/admin-billing-insights/spec.md) — **5/5 do corte** (PR #27, `0659ede`). 18 ✅, 4 🔒 e 1 ❌ anterior à entrega (hidratação em `/en` e `/es`). ⚠️ **Duas derivas** contra o bloco de reescopo, sem efeito na tela, aceitas pelo usuário; o endpoint da Stripe de cada fork precisa ganhar `invoice.paid` (`PRE-PRODUCTION.md:506`, âncora remedida em 2026-10-20, pós-PR #52; era `:456`) |
| `e2e-testing` | 2026-09-25 | [`docs/features/e2e-testing/spec.md`](../docs/features/e2e-testing/spec.md) — **4/5 do corte e 1 parcial** (PR #26, `c71755e`). ⚠️ O item 2 roda em toda PR mas **não bloqueia o merge** até o branch protection ser ligado (E3). O `STATE.md` segue com `test: blocked` pelo D3, corrigido na própria PR; o job `e2e` passou nas quatro execuções seguintes |
| `brand-config` | 2026-09-28 | [`docs/features/brand-config/spec.md`](../docs/features/brand-config/spec.md) — **5/5 do corte** (PR #30, `e07252a`), 14 ✅, 0 ❌ e 1 🔒 no `/test` (nome não ASCII na Resend). Primeira spec entregue depois de passar por `approved`. ⚠️ Marca, logo e ícones por fork são passo manual (`PRE-PRODUCTION.md` §13) |
| `storage-emulator-rules-tests` | 2026-09-28 | [`docs/features/storage-emulator-rules-tests/spec.md`](../docs/features/storage-emulator-rules-tests/spec.md) — **5/5 do corte** (PR #31, `2c285de`), 18 ✅, 0 ❌ e 1 🔒 no `/test`; o 🔒 (`verify` no GitHub) passou no merge, com 170 testes contra emulador. Segunda spec entregue depois de passar por `approved`. ⚠️ Deriva no item 5: o `build` não roda os testes contra emulador. Publicar `storage.rules` e ativar o bucket seguem passo manual (`PRE-PRODUCTION.md` §6) |
| `accessibility-conformance` | 2026-09-29 | [`docs/features/accessibility-conformance/spec.md`](../docs/features/accessibility-conformance/spec.md) — **6/6 do corte** (PR #32, `3e5ec4c`), allowlist do axe vazia e `e2e` 22/22 no merge. Terceira spec entregue depois de passar por `approved`. ⚠️ Duas derivas de letra (título por área, `aria-invalid="false"` sem erro); checkout em carregamento e leitor de tela real seguem 🔒. O diff introduziu e corrigiu antes do merge o "Excluir" ilegível no hover |
| `account-email-change` | 2026-09-29 | [`docs/features/account-email-change/spec.md`](../docs/features/account-email-change/spec.md) — **5/5 do corte** (PR #33, `f377c84`), 16 ✅, 0 ❌ e 1 🔒 no `/test` (entrega real do aviso pela Resend). Quarta spec entregue depois de passar por `approved`. ⚠️ Quatro derivas sem efeito no comportamento; o diff introduziu e corrigiu antes do merge dois defeitos de foco no diálogo novo. Resend, `FIREBASE_WEB_API_KEY` e o e-mail de suporte são passo manual por fork (`PRE-PRODUCTION.md` §3, §4 e §13) |
| `compliance-docs-kit` | 2026-09-30 | [`docs/features/compliance-docs-kit/spec.md`](../docs/features/compliance-docs-kit/spec.md) — **6/6 do corte** (PR #34, `c7aa4d9`), 18 ✅, 0 ❌ e 2 🔒 no `/test` (backup no Blaze e conformidade jurídica). Quinta spec entregue depois de passar por `approved`. ⚠️ Cinco derivas sem efeito no conteúdo. Preencher os `[FORK]`, aceitar os DPAs e decidir o backup são passo manual por fork (`PRE-PRODUCTION.md` §14) |
| `plan-entitlements` | 2026-10-04 | [`docs/features/plan-entitlements/spec.md`](../docs/features/plan-entitlements/spec.md) — **5/5 do corte** (PR #38, `2ed0df2`), 15 ✅, 0 ❌ e 1 🔒 no `/test` (entrega real da Stripe). Entregue sem passar por `approved` (E4). Sem deriva. ⚠️ Recursos cadastrados no Dashboard da Stripe, o sexto evento no endpoint e o custo do Entitlements são passo manual por fork (`PRE-PRODUCTION.md` §12, a partir da `:506`, que era `:456` até a PR #52); a demo em `entity` fica desligada sem `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` |
| `pricing-page-catalog` | 2026-10-16 | [`docs/features/pricing-page-catalog/spec.md`](../docs/features/pricing-page-catalog/spec.md) — **5/5 do corte** (PR #47, `dd31a95`), 21 ✅, 0 ❌ e 3 🔒 no `/test` (catálogo, chamadas e checkout contra conta Stripe real). Sexta spec entregue depois de passar por `approved`. ⚠️ Quatro derivas sem efeito no que o corte pedia: rota nova `GET /payments/catalog`, cache de uma hora por instância, rota fora do rate limit de propósito, e quem tem sessão volta pelo bounce do proxy. Fechou a deriva do deep link de `onboarding-flow` e um open redirect em `packages/auth/redirect.ts`. Nenhum passo manual novo: o catálogo é o mesmo do `PRE-PRODUCTION.md` §12 |
| `linked-sign-in-methods` | 2026-10-19 | [`docs/features/linked-sign-in-methods/spec.md`](../docs/features/linked-sign-in-methods/spec.md) — **6/6 do corte** (PR #48, `44b2b04`), 13 ✅, 0 ❌ e 3 🔒 no `/test` (popup real do Google, "User account linking" e `auth/unauthorized-domain` num projeto Firebase real). Sétima spec entregue depois de passar por `approved`. ⚠️ Quatro derivas sem efeito no que o corte pedia: desvincular no servidor, desvincular a senha encerra todas as sessões, definir senha também encerra todas, e `provider.tsx` intacto. Escolher o "User account linking" do projeto e autorizar os domínios do popup são passo manual por fork (`FORKING.md` §4, passos 3 e 4; declaração em `PRE-PRODUCTION.md:978-1001`, era `:919-942` até a PR #49 e `:926-949` até a PR #52) |
| `contact-support-channel` | 2026-10-19 | [`docs/features/contact-support-channel/spec.md`](../docs/features/contact-support-channel/spec.md) — **5/5 do corte** (PR #49, `4eeb07b`), 16 ✅, 0 ❌ e 4 🔒 no `/test` (entrega real pela Resend, confirmação vista no navegador, `429` com `ARCJET_KEY` e e-mail preenchido num domínio real). Oitava spec entregue depois de passar por `approved`. ⚠️ Quatro derivas sem efeito no que o corte pedia: sem Resend o aviso só aparece no envio, o ROPA já tinha a atividade, o item do menu depende de `NEXT_PUBLIC_WEB_URL` e só aparece no painel comum, e cerca de vinte arquivos fora do `contends_on`. Definir `NEXT_PUBLIC_APP_SUPPORT_EMAIL` na `api` e na `web` é passo manual por fork; sem ela o canal fica indisponível (`PRE-PRODUCTION.md` §13, `:786-789`, era `:736-739` até a PR #52) |
| `in-app-notifications` | 2026-10-20 | [`docs/features/in-app-notifications/spec.md`](../docs/features/in-app-notifications/spec.md) — **6/6 do corte** (PR #52, `3a118c6`), 17 ✅, 0 ❌ e 3 🔒 no `/test` (evento real da Stripe, índice ausente num projeto real e a TTL apagando o documento). Entregue sem passar por `approved` (E4). ⚠️ Três derivas sem efeito no que o corte pedia: dois índices compostos em vez de um, boas-vindas só para perfil comum, e contagem com teto de 100 lida a cada 120 s. Publicar os dois índices de `notification` e ligar a TTL em `expiresAt` são passo manual por fork (`PRE-PRODUCTION.md` §1.9, `:251`); medido em 2026-10-20, os índices não estão publicados no projeto de referência |

**Verificado na auditoria de 2026-10-21 (pós-PR #53):** `docs/features/` tem **56** pastas e **30** `spec.md`
arquivados, todos com `status: done`. Nenhum arquivamento nesta rodada. As 26 pastas sem `spec.md` são
`account-security-mfa` e `account-active-sessions` (fatias 1 e 2 da spec `in-progress` em `specs/`),
`observability-logging` (spec `in-progress`), `auth-panel-context` e `impersonation-read-only` (as duas anteriores à
semeadura) e as vinte e uma tarefas diretas listadas em [Tarefas diretas entregues](#tarefas-diretas-entregues-sem-spec).
Os dois links de entrada de `in-app-notifications` que morreram com o arquivamento da rodada pós-PR #52
(`analyze/plan.md:3` e `review/review.md:6`) seguem mortos em `main`; ver o achado dos links mortos.

### O que a PR #27 entregou **além** do corte (registrado em 2026-09-25)

1. **O webhook parou de ecoar o evento Stripe** na resposta de sucesso: `route.ts:315` devolve só
   `{ ok: true }` (âncora remedida em 2026-10-16, quando a PR #46 a deslocou de `:242`, e em 2026-10-20, quando a PR #52 a deslocou
   de `:298`).
2. **A checagem de `ALREADY_EXISTS` do Firestore virou helper compartilhado** (`isAlreadyExistsError`,
   `apps/api/(shared)/infra/firestore-errors.ts:4`), usado pelos repositórios de fatura e de ativação.
3. **Aviso de endpoint incompleto.** Com assinatura vigente e nenhuma fatura paga registrada, a seção avisa
   que falta `invoice.paid` no endpoint (`BillingInsightsSection.tsx:76-83`), em vez de mostrar receita
   zero sem explicação.
4. **A declaração do expurgo ganhou as duas coleções novas** (`docs/PRE-PRODUCTION.md:824`, relida em `main` em
   2026-10-20, depois da PR #52; era `:772` até a PR #52, `:766` até a PR #49 e `:759` até a PR #47): ficam depois da exclusão, porque guardam só ids da Stripe, valor, moeda e datas.

## Contradições doc × código, medidas nesta rodada

Nenhum gate lê prosa. Pela [`cycle-policy` §4](../.claude/cycle-policy.md), afirmação barata de medir num
doc é medida ao passar por ela. A PR #53 alterou quatro documentos fora de `docs/features/` e `specs/`
(`docs/SECURITY.md`, `docs/PRE-PRODUCTION.md`, `docs/SUBPROCESSORS.md` e `AGENTS.md`). Esta auditoria releu as linhas
alteradas contra o código de `main`: o inventário de guards (45 e 15, recontados), as âncoras do webhook e do expurgo
(`route.ts:216`, `account-erasure.ts:89` e `:99`), os dois parágrafos novos do `413` e a regra do `findById` no
`AGENTS.md:46`. O `PRE-PRODUCTION.md` e o `SUBPROCESSORS.md` trocaram uma linha cada, sem mudar a contagem; o
`SECURITY.md` ganhou quatro linhas depois da `:175`, e as âncoras deste arquivo para ele foram remedidas. A auditoria não
edita `docs/`; o que está defasado fica registrado aqui. A conferência dos documentos da PR #52 está na versão deste
arquivo em `d19e6fd`.

| documento | afirma | realidade medida | veredito |
|-----------|--------|------------------|----------|
| `AGENTS.md:46` (mudado pela PR #53) | `findById` devolve `null` para id com `/`, reservado (`__x__`), `.`/`..` ou acima de 1 500 bytes UTF-8, e a rota responde o seu 404 | `base.repository.ts:145-147`; `pagination.ts:3`, `:18-27` | ✅ **honesto** |
| `docs/features/notifications-bell-freshness/STATE.md:23` e `analyze/plan.md:4`, `:34`, `:182`; `docs/features/api-edge-413-close-and-route-id/STATE.md` e `analyze/plan.md:4-6` | citam `specs/BACKLOG.md:284-316`, `:315`, `:233`, `:230-249`, `:1698` e `:1721` | as linhas são das versões pós-PR #52 e incremental deste arquivo, que esta rodada reescreveu; o `branch` dos dois `STATE.md` registra `guilhermebittelbrunn/cycle-command-v6`, que de fato subiu (o da API ainda como "proposta" de outro nome) | ⚠️ **defasados**, estacionados em E11 |
| `docs/SECURITY.md:17-36` (inventário de guards) | 41 arquivos de rota, 26 com guard, 15 nus, "medido em 2026-10-19" | recontado em 2026-10-20, pós-PR #52: `find "apps/api/app/(routes)" -name route.ts` dá **45**, `grep -LE "require(CommonPanel\|Admin\|Plan)Api"` dá os mesmos **15**; as quatro rotas novas de `notifications/` usam `requireCommonPanelApi` | ✅ **corrigido pela PR #53**, em `main` desde `d19e6fd` (45 arquivos, 30 com guard, `notifications/*` ×4 na lista das guardadas); recontado em 2026-10-21: 45 e 15. A PR #52 tinha mexido em seis documentos e não neste |
| `docs/PRE-PRODUCTION.md` §1.8 (`:219-250`) | dos nove índices declarados, um publicado no projeto de referência em 2026-09-23; os dois de `notification` "não medido (entrada posterior)" | medido em 2026-10-20 pelo `ListIndexes` do Firestore Admin em `next-boilerplate-576d0`: um índice composto, `user` `reference_id` + `deletedAt`, `READY` | ✅ **honesto**: o documento dizia para contar os dois como pendentes, e estão. A data da medição no documento segue a de 2026-09-23 |
| `docs/SUBPROCESSORS.md:35` (linha da Stripe) | o webhook chama a Stripe em `webhooks/payments/route.ts:199`; o expurgo, em `account-erasure.ts:85` | o `customer.subscription.created` desceu para `:216` (a PR #52 acrescentou dois imports e o produtor de notificações acima); o `getStripe()` do expurgo está em `:89` (era `:87`, e o documento já citava `:85`) | ✅ **corrigidas pela PR #53**, em `main` desde `d19e6fd`: `:216` e `:89`, conferidas no código nesta auditoria. A PR #52 tinha editado a `:33` do mesmo documento e não esta |
| `docs/PRE-PRODUCTION.md:552` (era `:502` até a PR #52) | o expurgo cancela a assinatura em `account-erasure.ts:95` | a chamada de `cancelSubscriptionForErasure` está em `:99` (era `:97`) | ✅ **corrigida pela PR #53**, em `main` desde `d19e6fd`: `:99`, conferida no código. Tinha descido quatro linhas, duas pela PR #39 e duas pela PR #52 |
| `docs/features/in-app-notifications/analyze/plan.md:3` e `review/review.md:6` | link para `../../../../specs/in-app-notifications.md` | a spec foi movida nesta rodada para `../spec.md` | ❌ **links mortos, criados por este arquivamento**, o quinto e o sexto. A auditoria não edita os artefatos; ver o achado |
| `docs/SECURITY.md:172-182` (subseção "Tamanho do corpo", nova pela PR #51; era `:172-179` até a PR #53) | o helper recusa acima de 100 KiB com `413`, em duas camadas, solta o stream sem cancelá-lo e não limita o que a plataforma recebe | `parse-request-json.ts:3-5`, `:19-22`, `:24-44`, `:50-67`; 22 handlers usam o helper; o webhook lê com `request.text()` (`webhooks/payments/route.ts:269`) e o `/files` passa por `parseUploadedImage` | ⚠️ **omissão**: não diz que, depois do `413` da camada do stream, a conexão fica aberta até o `requestTimeout` do Node (D2 do `/test`, medido em `next start`). A mensagem do commit da PR diz; o documento que o fork lê, não. ✅ **Corrigida pela PR #53**, em `main` desde `d19e6fd`: `docs/SECURITY.md:176-178` descreve o `connection: close` e o custo medido para o `fetch` do Node, e o código faz o que o texto diz (`parse-request-json.ts:21-22`) |
| `docs/SECURITY.md:12` (métodos de login; mudado pela PR #51) | a devolução do e-mail é tentada de novo uma vez; na falha, revoga, responde `500 ACCOUNT_UPDATE_FAILED` e registra `password-unlink-email-restore-failed` sem o endereço | `account/sign-in-methods/[id]/route.ts:20`, `:35-49`, `:122`, `:124-134` | ✅ **honesto**, por leitura |
| `apps/api/CLAUDE.md:18` (mudado pela PR #51) | `parseRequestJson` responde `VALIDATION_FAILED` com 400 em falha de parse e 413 acima de 100 KiB | `parse-request-json.ts:5`, `:55-71` (era `:50-67` até a PR #53, que acrescentou o `refuseTooLarge`) | ✅ **honesto**; o 413 agora também fecha a conexão, e o documento não diz, sem ficar falso |
| `docs/features/google-sign-in-error-contract/STATE.md`, `password-unlink-email-restore/STATE.md` e `request-body-size-limit/STATE.md` | `review: in-progress` nos três; `test: blocked` no terceiro; o campo `branch` propõe `api/fix/google-sign-in-unlink-restore-body-cap`; as notas citam `specs/BACKLOG.md:1496`, `:246-266`, `:1535`, `:285-287`, `:1562` e `:292-293` | PR #51 mergeada com CI verde, da branch `guilhermebittelbrunn/cycle-command-v5`; as linhas são da versão pós-PR #50 deste arquivo, que esta rodada reescreveu | ⚠️ **defasados**, estacionados em E11. O `test: blocked` registra o D2, que entrou em `main` como achado |
| `docs/SECURITY.md:17-36` (inventário de guards; era `:17-35` até a PR #49) | 41 arquivos de rota, 26 com guard, 15 nus, com a linha de `/contact` na tabela | recontado em 2026-10-19, pós-PR #50: `find "apps/api/app/(routes)" -name route.ts` dá **41**, `grep -LE "require(CommonPanel\|Admin\|Plan)Api"` dá **15** (10 de `/auth`, 2 de `/health`, o webhook, o catálogo e o contato), e `account/` tem 13 arquivos de rota | ✅ **corrigido pelo `/review` da PR #49** no mesmo diff que criou a rota |
| `docs/SECURITY.md:158` (era `:157` até a PR #49) | 13 caminhos em `apps/api/proxy.ts:53-67`, com `/contact`; `/payments/catalog` fica fora, protegido pelo cache de uma hora | a lista em `apps/api/proxy.ts:53-67` tem 13 caminhos, `/contact` em `:66`; os comentários em `:43-49` dão o motivo do catálogo e do contato; o cache em `plan-catalog-cache.ts:19-37` | ✅ **honesto**. As outras rotas de `payments/` seguem fora da lista sem menção (achado aberto) |
| `docs/ROPA.md` §5 (`:99-113`, formulário de contato) | envia só com a caixa de suporte e a Resend; destino fixo no servidor; 20 por minuto por IP com `ARCJET_KEY`; a rota não registra nome, e-mail nem mensagem | `contact/route.ts:15-18`, `:31-37`; `apps/api/proxy.ts:66`; a rota não chama `logEvent`, e o `logEmail` grava só template, motivo e idioma (`packages/email/index.ts:41-51`) | ✅ **honesto**, novo pela PR #49 |
| `docs/PRE-PRODUCTION.md:320-321`, `:653-654`, `:786-789`, `:865-866` (novos pela PR #49; eram `:270-271`, `:603-604`, `:736-739` e `:813-814` até a PR #52) | sem Resend, `503 CONTACT_UNAVAILABLE`; sem `ARCJET_KEY`, `/contact` enche a caixa e gasta a cota; sem a caixa de suporte, o formulário fica indisponível; o canal de privacidade vazio cai no formulário, que entrega na caixa | `route.ts:15-18`; `apps/api/proxy.ts:66`; `page.tsx:17`; `privacyContact.ts:17-19` | ✅ **honesto**, por leitura |
| `docs/features/admin-archive-access-revocation/STATE.md` | `review: in-progress`; `branch:` "proposta; atual guilhermebittelbrunn/cycle-v3, inválida"; a nota diz "sem mudança em `apps/app`" | PR #50 mergeada com CI verde, da branch `guilhermebittelbrunn/cycle-v3`; o diff mudou `apps/app/shared/lib/googleSignInApi.ts` na rodada 2 do `/review` | ⚠️ **defasado**, estacionado em E11. A tabela de etapas registra a mudança na `apps/app`; só a nota ficou para trás |
| `docs/features/contact-support-channel/analyze/plan.md:3` | link para `../../../../specs/contact-support-channel.md` | a spec foi movida na rodada pós-PR #49 para `../spec.md` | ❌ **link morto, criado por aquele arquivamento**, o quarto. A auditoria não edita o plano; ver o achado |
| `docs/SECURITY.md:12` e `docs/PRE-PRODUCTION.md:978-1001` (métodos de login, novos pela PR #48; eram `:919-942` até a PR #49 e `:926-949` até a PR #52) | definir senha exige ID token Google de até 5 minutos e recusa o token `custom`; desvincular a senha faz o Firebase apagar o e-mail, a rota devolve e revoga; desvincular o Google não revoga; o vínculo pelo SDK fora do produto não passa pela API | `recent-google-sign-in.ts:13-30`; `account/sign-in-methods/[id]/route.ts:104-137` (era `:76-100` até a PR #51); `packages/auth/client.ts:170` (o vínculo no navegador); a medição do apagamento do e-mail está no `develop/handoff.md` e no `test/report.md` da feature, feita no emulador | ✅ **honesto**, por leitura do código. A frase sobre o Firebase apagar o e-mail é medição do emulador, não do Firebase de produção, e o texto diz isso |
| `docs/PRE-PRODUCTION.md:465` (era `:414` até a PR #49 e `:415` até a PR #52) | o cookie `x-locale` é gravado em `apps/app/proxy.ts:230,234` | os dois `cookieStore.set("x-locale", …)` estão em `:230` e `:234` | ✅ **corrigido pela PR #47** no mesmo diff que deslocou o código |
| `docs/features/linked-sign-in-methods/analyze/plan.md:3` | link para `../../../../specs/linked-sign-in-methods.md` | a spec foi movida na rodada pós-PR #48 para `../spec.md` | ❌ **link morto**, criado pelo arquivamento da rodada pós-PR #48, o terceiro depois dos de `plan-entitlements` e `pricing-page-catalog`. A auditoria não edita o plano; ver o achado |
| `docs/features/pricing-page-catalog/analyze/plan.md:3` | link para `../../../../specs/pricing-page-catalog.md` | a spec foi movida em 2026-10-16 para `../spec.md` | ❌ **link morto**, criado por aquele arquivamento. Segue igual |
| `docs/features/pricing-page-catalog/analyze/plan.md:349` e `develop/handoff.md:113` | o preço em BRL sai "R$ 29,00 / mes" em `es` | o `Intl` (CLDR) formata "29,00 BRL / mes", como a aba da app; o `/test` mediu | ⚠️ **expectativa errada no plano**, já registrada no `review/review.md` e no `test/report.md`; o código está certo |
| `docs/features/onboarding-flow/spec.md:246` (arquivada) | a deriva do item 3 segue aberta: o proxy grava só o `pathname` | desde a PR #47 o `x-app-path` leva `pathname` e query (`apps/app/proxy.ts:280`) | ⚠️ **histórico**: a spec descreve a data da entrega. A tabela [Entregues](#entregues) registra o fechamento |
| os oito documentos (âncoras de código) | 127 `arquivo:linha` com caminho único no repositório | em 2026-10-04, todos existem e cabem no arquivo. As que apontam para código alterado pelas PRs foram lidas uma a uma; as deslocadas estão nas linhas seguintes | ✅ **honesto** na existência |
| `docs/SECURITY.md:160` (era `:159` até a PR #49) | dez das treze rotas de `/account` fora do rate limit ("contadas em 2026-10-19"), com as três de métodos de login e a definição de senha | `apps/api/proxy.ts:53-67`: a lista tem `/account/export`, `/account/deletion` e `/account/email`; `account/` tem **13** arquivos de rota | ✅ **corrigido pela PR #51** (era ❌, defasado pela PR #48, que dizia "sete das dez"). O comportamento segue no achado das rotas de `/account` |
| `docs/ARCHITECTURE.md:64`, `AGENTS.md:25`, `apps/app/CLAUDE.md:47`, `.claude/skills/i18n-sync/SKILL.md:14` | no servidor, o idioma vem do segmento da URL, repassado pelos proxies no header `x-request-locale`; sem header válido, cookie e depois padrão; fora do `matcher` o header chega como o navegador mandou | `server.ts:31-34`, `apps/web/proxy.ts:133`, `apps/app/proxy.ts:281` (era `:264` até a PR #47; os documentos não citam a linha); o `matcher` da app exclui `api` e `_next/*` (`apps/app/proxy.ts:122`) | ✅ **honesto**, por leitura |
| `docs/features/i18n-hydration-admin-delete-billing/test/report.md:67` | na troca suave de `/en/entities` para `/es/entities`, `document.documentElement.lang` "passou a `es`" | o `/test` da PR #41 mediu o contrário no código anterior à correção (`5f4a8e9`), em build: `lang` ficou `"en"` até recarregar. O root layout da app fica acima de `[locale]` e não renderiza de novo; quem atualiza o atributo hoje é o `DocumentLangSync` | ❌ **afirmação não reproduzida**; o modo da medição antiga (dev ou build) não está registrado. Sem efeito hoje, porque o comportamento correto passou a existir |
| `docs/PRE-PRODUCTION.md:467` (era `:416` até a PR #49 e `:417` até a PR #52) | o cookie `sidebar_state` é declarado em `sidebar.tsx:29` | o `SIDEBAR_COOKIE_NAME` está em `packages/design-system/components/ui/sidebar.tsx:29` | ✅ **corrigida pela PR #44** (era ⚠️, deslocada pela PR #43) |
| `docs/RESEARCH-tanstack-vs-next.md:40` | o `"use client"` do seletor de idioma da app está em `LanguageSwitcher.tsx:3` | está em `apps/app/shared/components/ui/LanguageSwitcher.tsx:1`; o documento não muda desde a PR #39 | ⚠️ **deslocada**, medida pela primeira vez em 2026-10-14 |
| `docs/FORKING.md:374` (era `:366` até a PR #48) e `docs/SETUP.md:72` | `NEXT_PUBLIC_DOCS_URL` liga o link "Documentação" no header e no footer da web, só na web | o `env` da web declara a variável (`apps/web/env.ts:24`, `:34`), e o header e o footer a leem (`header/index.tsx:91-100`, `footer.tsx:28-35`); o `/test` da PR #46 mediu nos dois, em build | ✅ **corrigido pela PR #46** (era ❌). O `SETUP.md` perdeu o `app`. A variável segue preenchida em `apps/app/.env.example:74` e `apps/api/.env.example:87`, sem consumidor (achado aberto) |
| `docs/AUTH-SSO.md:105` | o link "Ir para o painel" do header da web depende do modo, em `header/index.tsx:38` | a PR #46 deslocou o arquivo de novo: a checagem do modo está em `:66` (`isSubscriptionMode() && panelUrl`), e o link em `:250-264`; `:38` hoje é o meio da constante `FULL_BAR_FROM` | ⚠️ **deslocada**, remedida em 2026-10-16. O parágrafo pertence à nota do modo `simple` (E10) |
| `specs/BACKLOG.md` (auditoria pós-PR #45, achado A4 e recomendação #2) | um `400` no webhook encerra as reentregas da Stripe | a documentação da Stripe trata `4xx` como falha, como `5xx`, e reentrega por até três dias em produção ([docs.stripe.com/webhooks](https://docs.stripe.com/webhooks), seções "Corrigir códigos de status HTTP" e "Novas tentativas automáticas", relida em 2026-10-16). O `/analyze` de `api-auth-webhook-error-codes` pegou o erro; o código (`webhooks/payments/route.ts:265-270`, era `:248-253` até a PR #52) e o `docs/PAYMENTS.md:99-107` dizem a coisa certa | ❌ **erro da auditoria pós-PR #45**, corrigido na auditoria pós-PR #46. O `400` continua certo por outro motivo: a requisição é recusada, não é falha do servidor |
| `docs/SUBPROCESSORS.md:40` (o `docs/ROPA.md:108` saiu com a PR #49) | o `skipValidation` está em `apps/web/env.ts:33`; o bloqueio de bot é chamado em `apps/web/proxy.ts:68` | `skipValidation: true` em `apps/web/env.ts:36`; `if (!env.ARCJET_KEY)` em `apps/web/proxy.ts:67` e `secure(` em `:72`. A PR #49 corrigiu a âncora do proxy da API na mesma linha (`:156`) e deixou as duas da web. A frase do ROPA §5 sobre o bloqueio de bot saiu, porque o envio do contato deixou de passar pela landing | ⚠️ **deslocadas**, reduzido em 2026-10-19 (era também o ROPA). O comportamento descrito segue verdadeiro (E13) |
| `.claude/skills/write-tests/SKILL.md:8` | todo `vitest.config.mts` usa `environment: "jsdom"` | 2 dos 14 configs de workspace usam `jsdom` (`apps/app` e `packages/design-system`); os outros 12, `node`. A web testa em `node` e liga `jsdom` por arquivo (`apps/web/CLAUDE.md:28-35`, desde a PR #46) | ❌ **não descreve o repositório**. Registrado pelo `/review` de `web-docs-link-and-mobile-menu`; medido em 2026-10-16, pós-PR #46 |
| `docs/RESEARCH-tanstack-vs-next.md:85` | o webhook usa `headers()` em `route.ts:4,43-44` | o import está em `webhooks/payments/route.ts:7` e a chamada em `:287` (era `:270` até a PR #52) | ⚠️ **deslocada**, medida pela primeira vez em 2026-10-16, pós-PR #46; o documento é nota de pesquisa e não muda desde a PR #39 |
| `docs/features/web-docs-link-and-mobile-menu/STATE.md` e `docs/features/api-auth-webhook-error-codes/STATE.md` | `review: in-progress`; as notas citam `specs/BACKLOG.md:240-280`, `:1263` e `:286-328` | PR #46 mergeada com CI verde, da branch que o campo `branch` registra; as linhas são da versão pós-PR #45 deste arquivo, que esta rodada reescreveu | ⚠️ **defasados**, estacionados em E11 |
| `docs/features/date-input-navigation/analyze/plan.md` §9 e §10 (em `main` desde a PR #45) | clicar no rótulo "Data" foca o botão; sob personificação o campo de nascimento continua desabilitado | o clique no `<label for="date">` abre o calendário (medido pelo `/test`); `EntityFormFields.tsx` não passa `disabled` aos campos, e a personificação bloqueia só o envio | ⚠️ **texto do plano não descreve o código**; o código está certo e o `/test` corrigiu os dois textos em `test/criterios-aceite.md`, que entrou em `main` junto |
| `docs/features/date-input-navigation/STATE.md`, `form-field-focus-and-names/STATE.md` e `web-header-reflow-and-menu-name/STATE.md` | `review: done`; o campo `branch` diz "a renomear a partir de guilhermebittelbrunn/cycle-command-v4"; as notas citam `specs/BACKLOG.md:231-278`, `:281-330` e `:323-358` | PR #45 mergeada com CI verde, da branch `fix/date-pickers-form-fields-and-header`, que o campo acerta; as linhas são da versão pós-PR #44 deste arquivo, que esta rodada reescreveu | ⚠️ **defasado** só nas linhas citadas, estacionado em E11 |
| `docs/features/date-input-locale/STATE.md` | `review: in-progress`; notas citam `specs/BACKLOG.md:230-272` (a recomendação) | PR #44 mergeada com CI verde, da branch `fix/date-input-locale`, que o campo `branch` acerta; as linhas são da versão pós-PR #43 deste arquivo, que esta rodada reescreveu | ⚠️ **defasado**, estacionado em E11 |
| `docs/features/account-deletion-dialog-focus/STATE.md` e `docs/features/ui-strings-and-password-focus/STATE.md` | `review: in-progress`; `branch:` "proposta, a criar"; notas citam `specs/BACKLOG.md:183-213`, `:793`, `:695` e `:942` | PR #43 mergeada com CI verde, da branch `fix/ui-labels-and-account-dialog-focus`; as linhas são da versão pós-PR #42 deste arquivo | ⚠️ **defasados**, estacionados em E11 |
| `docs/features/antd-theme-seed-colors/STATE.md` | `review: in-progress`; notas citam `specs/BACKLOG.md:185-219` e `:737` | PR #42 mergeada com CI verde; as linhas eram da versão anterior à rodada pós-PR #42 | ⚠️ **defasado**, estacionado em E11 |
| `docs/features/accessibility-conformance/spec.md:53-54`, `:166` (arquivada) | o `danger` do antd recebe o `colorError` em `var(...)` (`antd-app.tsx:20`) e o `Dropdown` tem override de `colorError` por componente (`antd-app.tsx:75-78`); `--destructive` do escuro em `globals.css:63` | desde a PR #42, o `colorError` é o hex do `--destructive` por tema (hoje `antd-app.tsx:136`, depois dos imports da PR #43), o override saiu (o `Dropdown` em `:103-105` só guarda o `colorTextLightSolid`) e o token escuro está em `globals.css:64`. A cor do item `danger` não mudou (`actionMenu.test.tsx:80-105`, `antdTheme.test.tsx:251`) | ⚠️ **histórico**: a spec descreve o mecanismo da data da entrega. Não é regressão; a capacidade segue coberta por teste |
| `docs/features/server-locale-from-url/STATE.md` | `review: in-progress`; notas citam `specs/BACKLOG.md:177-210` e `:547` | PR #41 mergeada com CI verde; as linhas eram da versão anterior à rodada pós-PR #41 | ⚠️ **defasado**, estacionado em E11 |
| `docs/SUBPROCESSORS.md:33` | a coleção `user` é declarada em `user.repository.ts:42` | `:42` é o fim de um bloco; o `super(db, "user")` está em `:46`, empurrado pela PR #38. A mesma linha cita `session.repository.ts:49`, que confere | ⚠️ **deslocada** pela PR vizinha |
| `docs/ROPA.md:69` e `:83` | `lastAccessAt` em `user.ts:54-59`; `stripeCustomerId` e assinatura em `user.ts:62-65` | o import de `EntitlementsState` (PR #38) empurrou o arquivo uma linha: hoje `:55-60` e `:63-66`. A PR #39 editou a linha `:69` sem ver o deslocamento, porque partiu de `e791d3a` | ⚠️ **deslocadas** pela PR vizinha |
| `docs/INCIDENT-RESPONSE.md:64` (era `:63` até a PR #50) e `docs/BACKUP.md:88` | as ações auditadas em `audit.ts:2-11`; o alvo em `audit.ts:29-31` | a PR #39 acrescentou duas ações ao enum e a PR #48, mais três: hoje `:2-16` e `:34-36` | ⚠️ **deslocadas** pelas PRs #39 e #48 (remedido em 2026-10-19, pós-PR #50) |
| `docs/ROPA.md` e `docs/SUBPROCESSORS.md` (inventário do perfil) | o perfil guarda telefone, avatar, preferências, onboarding, `lastAccessAt`, `stripeCustomerId` e assinatura | o perfil guarda também `entitlements`, a lista de recursos pagos gravada pelo webhook desde a PR #38 (`packages/sdk/src/types/user/user.ts:67-68`) | ❌ **omissão**. Ver o achado novo em [compliance-docs-kit](#-achados-da-entrega-compliance-docs-kit-2026-09-30) |
| `docs/PRE-PRODUCTION.md` §9 (gate) | 29/29 tasks, 806 arquivos, 2485 testes em 227, 170 contra emulador, 13 configs, medidos em 2026-09-30 | em 2026-10-20, pós-PR #52: 30/30, 965, 3356 em 308, 207, 14 configs. A seção mudou de `:603` para `:610`, com a PR #49 para `:614` e, com a PR #52, para `:664` | ✅ **honesto**, datado; o parágrafo manda remedir antes de citar |
| `docs/PRE-PRODUCTION.md:891-911` (era `:832-852` até a PR #49 e `:839-859` até a PR #52) e `docs/AUTH-SSO.md:74-76` (sessões) | o "Sair" encerra só o navegador atual; encerrar uma sessão corta a API e o cookie, não o refresh token no Firebase; Firestore e Storage negam todo cliente | `session-routes.ts:174-183`; `resolve-api-actor.ts:57-79`; `firestore.rules:32-34` e `storage.rules` negam tudo | ✅ **honesto**, por leitura |
| `docs/PAYMENTS.md:28`, `:44`, `:148`, `:238-251` (acesso por plano) | `requirePlanApi`, `PlanGate`, o sexto evento e a demo desligada | conferem com `plan.ts`, `plan-access.ts`, `PlanGate.tsx` e `webhooks/payments/route.ts:236` (era `:219` até a PR #52) | ✅ **honesto**. As linhas eram `:27`, `:42`, `:114` e `:195-208` até a PR #47, que acrescentou ao documento a seção do catálogo público, e a última era `:229-242` até a PR #52, que acrescentou o parágrafo das notificações |
| `docs/features/plan-entitlements/analyze/plan.md:3` | link para `../../../../specs/plan-entitlements.md` | a spec foi movida em 2026-10-04 para `../spec.md` | ❌ **link morto, criado por aquele arquivamento**. A auditoria não edita o plano; ver o achado novo |
| `docs/features/plan-entitlements/STATE.md` e `docs/features/account-active-sessions/STATE.md` | `review: in-progress` | PRs #38 e #39 mergeadas com CI verde; reconferido em 2026-10-07, os dois seguem assim | ⚠️ **defasados**, estacionados em E11 |
| `docs/features/admin-self-lockout-guard/STATE.md` (notas) | cita `specs/BACKLOG.md:248-284`, `:860` e `:365` | as linhas eram da versão anterior à auditoria de 2026-10-04 | ⚠️ **defasado**, mesmo caso das tarefas anteriores |
| `docs/features/action-menu-keyboard-delete/STATE.md` (notas) | cita `specs/BACKLOG.md:185-195` (a recomendação) e `:625-626` (os achados) | as linhas eram da versão de 2026-10-04; nesta, a recomendação é outra e os dois achados saíram para a lista de fechados | ⚠️ **defasado**, mesmo caso. A nota do mesmo arquivo sobre o `git mv` de `specs/plan-entitlements.md` no índice perdeu o objeto: o rename foi no commit da PR #40 |
| `docs/FORKING.md:447` (link; era `:439` até a PR #48) | aponta para `../README.md#crud-de-referência` | o README renderizado pelo GitHub publica o id `user-content--crud-de-referência`, com `href="#-crud-de-referência"` (medido em 2026-09-30) | ❌ **link morto**; as PRs #47 e #48 mexeram no documento e não no link |
| `docs/features/accessibility-conformance/STATE.md`, `account-security-mfa/STATE.md`, `brand-config/STATE.md`, `account-email-change/STATE.md`, `compliance-docs-kit/STATE.md`, `e2e-testing/STATE.md`, `disabled-account-revocation/STATE.md`, `arcjet-key-lazy-validation/STATE.md` | as defasagens de etapa, branch ou linha registradas nas rodadas anteriores | não mudaram | ⚠️ **defasados**, estacionados em E11 ou mantidos por decisão do usuário (`e2e-testing`) |
| `docs/AUTH-SSO.md:66-71` e a pendência do modo `simple` no `PRE-PRODUCTION.md` | redirecionamento do comum para a web no `simple` | não remedido; estacionado (E10) | ⚠️ nota de medição anterior segue no lugar |

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

| id | especificado | implementado | leitura |
|----|--------------|--------------|---------|
| `account-security-mfa` (item 2) | sessões ativas "com dispositivo/origem e último uso" | navegador, sistema e tipo de aparelho tirados do user-agent, instante do login e do último uso; sem IP; app e web no mesmo navegador contam como uma sessão | **a spec estava imprecisa**. Gravar IP mudaria a natureza jurídica do dado, como a lacuna de `user-activity-tracking` já registrava. Nota escrita no item |
| `account-security-mfa` (item 3) | encerrar uma sessão específica | a API e os front-ends recusam a sessão encerrada; o refresh token do aparelho segue válido no Firebase | **a spec estava errada sobre o provedor**: o Firebase só revoga a conta inteira. A limitação está declarada em `docs/AUTH-SSO.md:74-76` e no `PRE-PRODUCTION.md`. Nota escrita no item |
| `plan-entitlements` | o corte inteiro | o corte inteiro; a pergunta "Entitlements ou mapa local" foi decidida pela recomendação da spec | **sem deriva**. A variável da demo usa o prefixo `NEXT_PUBLIC_` também na API, para ter um nome só nos dois apps; é escolha do plano, não desvio |
| `pricing-page-catalog` (item 2) | leitura pública pela API; a spec previa abrir `payments/plans/route.ts` e mexer em `billing.ts` | rota nova `GET /payments/catalog`, sem guard, com cache em memória; a rota da aba e o `billing.ts` ficaram intactos | **a spec estava imprecisa** sobre o lugar; o resultado pedido é o mesmo. Nota na spec arquivada |
| `pricing-page-catalog` (sinal de pronto 4) | "duas visitas seguidas não geram duas chamadas à Stripe" | vale por instância do servidor: em serverless, N instâncias quentes fazem até N chamadas por hora | **a spec não distinguia** cache global de cache por processo. O plano registrou o limite; a medição em produção ficou 🔒 |
| `pricing-page-catalog` (item 2) | entra no rate limit "se o `/analyze` achar necessário" | fica fora, de propósito: o servidor da landing pede em nome de todo visitante, de um endereço só (`apps/api/proxy.ts:43-45`) | **escolha que a spec delegou**, registrada no código e no `docs/SECURITY.md:158` (era `:155` até a PR #48 e `:157` até a PR #49). O inventário de guards do mesmo documento só acompanhou na PR #48 |
| `pricing-page-catalog` (item 3) | quem já está logado vai direto para a aba | o CTA é o mesmo para todos (`sign-up?redirect=`), e o proxy devolve quem tem sessão ao destino (`apps/app/proxy.ts:265`) | **sem efeito no resultado**: o destino final é a aba com o plano em destaque. O `/test` mediu os dois caminhos |
| `linked-sign-in-methods` (impacto por camada) | vincular e desvincular "no cliente" | desvincular roda no servidor (`account/sign-in-methods/[id]/route.ts`, Admin SDK `providersToUnlink`); só o vínculo acontece no navegador | **a spec estava imprecisa**: a regra do último método precisa valer na API (regra de ouro 4). Nota na spec arquivada |
| `linked-sign-in-methods` (item 4) | desvincular um método | desvincular a senha encerra todas as sessões, inclusive a atual (`[id]/route.ts:80-100`); desvincular o Google não encerra | **a spec não previa o efeito do provedor**: o Firebase apaga o e-mail ao tirar a senha, e a devolução do e-mail revoga os tokens (medido no emulador pelo `/develop` e pelo `/test`). A tela avisa no diálogo e sai da conta |
| `linked-sign-in-methods` (D5) | definir a primeira senha encerra "as outras sessões" | encerra todas, inclusive a atual (`account/password/set/route.ts:74`) | **a decisão estava imprecisa**: ela citava a troca de senha, que já encerra todas, e o Firebase não revoga de forma seletiva |
| `linked-sign-in-methods` (`contends_on`) | `client.ts`, `provider.tsx`, `AccountSecurityForm.tsx` | `provider.tsx` intacto; cerca de vinte arquivos fora da lista | **previsão errada nos dois sentidos**, como nas rodadas anteriores. Ver [Lotes paralelos](#lotes-paralelos) |
| `contact-support-channel` (item 3) | sem e-mail configurado ou sem caixa de suporte, o formulário diz que o canal está indisponível | sem caixa, aviso antes de digitar (`page.tsx:17`); sem Resend, `503 CONTACT_UNAVAILABLE` e alerta traduzido no envio, com os campos preservados (`route.ts:15-18`) | **escolha do plano** (pergunta 2): a landing só saberia se a API tem Resend com uma rota pública nova. Nos dois casos o formulário não finge ter enviado |
| `contact-support-channel` (impacto, ROPA) | o `docs/ROPA.md` ganha a atividade "contato" | a atividade já existia (§5); a entrega corrigiu o conteúdo | **a spec estava imprecisa**. Nota na spec arquivada |
| `contact-support-channel` (item 4) | o menu do perfil ganha "Ajuda e contato" | o item só aparece com `NEXT_PUBLIC_WEB_URL` (`contactPageUrl.ts:4-7`) e só no painel comum; o admin fora da personificação não o vê | **a spec não tratava** a app sem a URL da landing nem o admin; o plano decidiu (pergunta 10) |
| `contact-support-channel` (`contends_on`) | os quatro arquivos | os quatro e cerca de vinte fora da lista, metade documentos | **previsão certa no que declarou e curta no resto**, como nas rodadas anteriores. Ver [Lotes paralelos](#lotes-paralelos) |
| `in-app-notifications` (impacto, infra) | "índice composto novo (dono + data)" | dois índices: dono + `createdAt` para a lista e dono + `readAt` para a contagem e o "marcar todas" (`firestore.indexes.json:62-77`) | **a spec estava imprecisa**: a contagem de não lidas pede o segundo. Nota na spec arquivada |
| `in-app-notifications` (item 4) | boas-vindas "na criação da conta" | só para perfil comum (`user-merge.ts:90`); o admin criado pela mesma rotina não recebe | **a spec não tratava o caso**: o sino só existe no painel comum |
| `in-app-notifications` (item 1) | contador "em intervalo curto" | 120 s, só com a aba visível, e teto de 100 na contagem (`99+` no badge) | **escolha que a spec delegou** ao `/analyze`, para limitar as leituras do Firestore |
| `in-app-notifications` (`contends_on`) | os cinco arquivos | os cinco e cerca de 55 fora da lista, entre eles `user-merge.ts`, `log.ts` (fora da área declarada) e seis documentos | **previsão certa no que declarou e curta no resto**, como nas rodadas anteriores. Ver [Lotes paralelos](#lotes-paralelos) |

**Rodada pós-PR #53 (2026-10-21):** nenhuma linha nova na tabela. A PR #53 não mexeu no corte de nenhuma spec viva nem
deslocou âncora que elas citem com número de linha (`grep` pelos 15 arquivos nos seis arquivos de spec e nas quatro
notas de `research/`: só menções sem linha, ao `PRE-PRODUCTION.md` e ao `parseRequestJson`, que seguem verdadeiras;
`one-time-purchase.md:38` cita `docs/PRE-PRODUCTION.md:568-571`, que a PR não deslocou).

As três primeiras linhas seguem como em 2026-10-04, as quatro de `pricing-page-catalog`, como em 2026-10-16, e as de
`linked-sign-in-methods` e `contact-support-channel`, como nas rodadas pós-PR #48 e pós-PR #49. As quatro de
`in-app-notifications` são desta rodada; nenhuma piora o que o corte pedia. A PR #52 não mexeu no corte de nenhuma spec
viva; deslocou âncoras de `observability-logging` (`log.ts`, o webhook, `user-merge.ts`, a exportação, o expurgo e a
contagem de `logEvent(`, de 42 para 43, com o escopo novo `notifications`), de `one-time-purchase` (`PAYMENTS.md`,
`PRE-PRODUCTION.md` e o webhook) e de `account-security-mfa` (a folha de `apiErrors`), remedidas nas três com o número
antigo entre parênteses.

**Registro da rodada pós-PR #51.** A PR #51 não mexeu no
corte de nenhuma spec viva; deslocou âncoras de `account-security-mfa` (`auth.schema.ts`), de `observability-logging`
(a contagem de `logEvent(`, de 41 para 42) e de `social-sign-in-providers` (a rota do Google e a de desvínculo),
remedidas nas três com o número antigo entre parênteses. Em `social-sign-in-providers` a descrição da rota do Google
foi reescrita, porque deixou de ser verdade: a rota já valida o corpo e responde por `error.code`.

**Registro da rodada pós-PR #50.** A PR #50 deslocou âncoras de `account-security-mfa` (`users/[id]/route.ts` e a folha
de `apiErrors`), de `observability-logging` (`users/[id]/route.ts` e a contagem de `logEvent(`, de 39 para 41) e de
`social-sign-in-providers` (a rota do Google e `googleSignInApi.ts`), remedidas naquela rodada.

As três tarefas diretas da PR #51 não tinham corte de spec. Contra as recomendações da auditoria pós-PR #50:

- `google-sign-in-error-contract` entregou o que a recomendação pedia, sem código novo em `apiErrors`, com a regra do
  `/auth/sign-in` (um código só para toda recusa do provedor). Foi além em dois pontos: o `/review` restringiu o
  `requestUri` a `http` e `https`, porque o `z.url()` livre aceitava `javascript:` e `localhost:3000` sem esquema, e o
  `/test` acrescentou um teste com o toolkit real.
- `password-unlink-email-restore` entregou a "correção mínima" da recomendação (tentar de novo antes de responder) e
  mais duas coisas que o plano pôs no corte: revogar as sessões também na falha e registrar o `uid` num `logEvent`. O
  registro alcança o stdout; quem vigia é o coletor que falta (E1).
- `request-body-size-limit` entregou o teto transversal que a recomendação descrevia ("P a M, transversal na
  `apps/api`") e, de quebra, a conta do `docs/SECURITY.md:160`, que era outra candidata da lista. Abriu o D2, que a
  recomendação não previa.

**Registro da rodada pós-PR #49.** A PR #49 deslocou âncoras de `observability-logging`,
`account-security-mfa`, `magic-link-sign-in`, `social-sign-in-providers` e `one-time-purchase`, remedidas naquela
rodada.

**Registro da rodada pós-PR #48.** A PR #48 não mexeu no corte
das duas specs `in-progress`; deslocou âncoras de `account-security-mfa` (`AccountSecurityForm.tsx`, a ação de conta do
SDK, `packages/auth/client.ts`, `account.schema.ts` e a folha de `apiErrors`), remedidas na spec, que ganhou também a
definição da primeira senha na lista de lugares onde vale a política de senha e uma nota sobre a prova de login
recente. Também deslocou âncoras de `packages/auth/client.ts` em `magic-link-sign-in` e `social-sign-in-providers`,
remedidas com o número antigo entre parênteses.

**Registro da rodada pós-PR #47.** A PR #47 não mexeu no corte das duas specs `in-progress`; deslocou âncoras de
`observability-logging` (`apps/api/proxy.ts`, quatro linhas de comentário acima da lista de rate limit) e de
`account-security-mfa` (`SignUpFormClient.tsx`), remedidas nas duas. Também deslocou âncoras de quatro specs vivas que
não estavam no lote (`contact-support-channel`, `magic-link-sign-in`, `social-sign-in-providers` e
`one-time-purchase`), todas remedidas com o número antigo entre parênteses.

**Registro da rodada pós-PR #46.** A PR #46 mexeu em `apps/api`, mas fora do corte das duas specs
`in-progress`: deslocou âncoras que elas citam (o webhook em `observability-logging`, o `auth.schema.ts` e a folha de
`apiErrors` em `account-security-mfa`), sem mudar o comportamento descrito. As âncoras foram remedidas nas duas specs.
As sete specs novas foram escritas sobre o `c8577b7`, depois do merge; das âncoras delas, esta auditoria corrigiu três
em `pricing-page-catalog` e duas em `one-time-purchase`.

**Deriva de texto em `pricing-page-catalog`, a spec estava errada:** o problema e os sinais de pronto falavam de
"R$ 40" nos três idiomas; o dicionário tem "R$ 40" em pt-br e "$40" em en e es
(`translations/apps/web/pages/pricing/index.ts:10`, `:55`, `:101`). Corrigido na spec, com uma linha de nota.

As duas tarefas diretas da PR #46 não tinham corte de spec. Contra as recomendações da auditoria pós-PR #45:

- `web-docs-link-and-mobile-menu` entregou os seis itens. Foi além em dois pontos: os links de documentação abrem em
  aba nova nas três superfícies, e a web ganhou `jsdom` e `@testing-library/*` como devDependencies, só para o teste
  do menu, com o ambiente global da suíte mantido em `node`. É dependência nova de teste; a `cycle-policy` §2 pede
  que dependência nova passe pelo relatório, e ela passou pelo `/review`, que conferiu o lockfile com rede. Ficaram
  fora, com motivo no plano, o Escape e o clique fora no menu (D6) e a variável sem consumidor nos `.env.example` da
  `app` e da `api` (D5).
- `api-auth-webhook-error-codes` entregou os seis itens, com a deriva de letra registrada na conferência (falha de
  infraestrutura no login segue 500 sem corpo, D5 do plano). Foi além em três pontos: o 500 do handler do webhook
  ganhou código próprio, o inventário de guards do `docs/SECURITY.md` foi recontado, e o `docs/PRE-PRODUCTION.md:568`
  deixou de prometer 500 para o webhook sem assinatura. O plano corrigiu a premissa desta auditoria sobre a Stripe.

Nenhum desvio piora o que as recomendações pediam.

As três tarefas diretas da PR #45 também não tinham corte de spec. Contra as recomendações das três passadas de
2026-10-14:

- `date-input-navigation` entregou os seis itens e trocou os três remendos previstos para a `/contact` pelo próprio
  `DateInput`, o que tirou a data de hoje pré-selecionada (o teste SSR da página foi reescrito por isso). Ficaram
  fora, com motivo no plano, o `data-day` e limitar o nascimento a datas passadas (regra de produto).
- `form-field-focus-and-names` entregou os seis itens e foi além em dois pontos: o mesmo `readOnly` no
  `HookFormInput` comum, que tinha o mesmo defeito, e os dois footers da `apps/app` sem o contorno do `disabled`,
  porque o `Button` passou a travar sozinho (correção na raiz, `cycle-policy` §3). O `useSubmitEnterGuard` corrigiu o
  Enter repetido que a própria troca para `readOnly` abriu, medido e corrigido antes do merge.
- `web-header-reflow-and-menu-name` entregou os seis itens com a troca de grade, sem mexer em breakpoint. O
  `lg:truncate` da marca entrou e saiu dentro da PR, porque o `/test` mediu que ele não agia; a marca longa a
  1024 px virou achado.

Nenhum desvio piora o que as recomendações pediam.

A tarefa direta da PR #44 também não tinha corte de spec. Contra a recomendação da auditoria pós-PR #43, entregou
os seis itens do critério de pronto e mais duas coisas: a data do formulário de contato da web no idioma da página
(pergunta P1 do plano, adotada, com um teste novo do `/test`) e o `calendarLocales` num módulo próprio, sem
`"use client"`, porque o `/review` viu que a web passaria a importar um mapa de dados de dentro de um módulo de
componente client. A recomendação previa `contends_on` de dois arquivos; a tarefa tocou os dois e mais o formulário
de contato e o módulo novo. Ficaram fora, com motivo registrado no plano (§1.3): tirar o `datePlaceholder` da trilha,
expor `locale` como prop do `DateInput` e capitalizar mês e dia da semana em pt-br e es. O `/review` registrou, sem
corrigir, que um `locale={undefined}` explícito do chamador faz o `Calendar` voltar ao `enUS`, porque o `{...props}`
vem depois (`calendar.tsx:200-202`); nenhum consumidor faz isso. Nenhum desvio piora o que a recomendação pedia.

As duas tarefas diretas da PR #43 também não tinham corte de spec. `account-deletion-dialog-focus`, contra a
recomendação da auditoria pós-PR #42, entregou os cinco itens do critério de pronto e mais uma coisa: o
`form.reset()` ao fechar o diálogo, porque o plano mediu a senha e o erro sobrevivendo ao "Cancelar" (pergunta 2
da §11 do plano, adotada). O `contends_on` proposto acertou os dois arquivos. `ui-strings-and-password-focus` não
teve recomendação: o plano montou o corte a partir de três achados deste arquivo e de um do `/test` da tarefa
anterior, e acrescentou por conta própria seis textos dos mesmos arquivos que o achado não listava (título e
descrição da barra lateral no celular, o "Close" do `DialogFooter`, o nome e os textos visíveis da `Pagination`, o
nome do `Breadcrumb`). Deixou de fora, com motivo registrado, o `DateInput` e o `CommandDialog`. A recomendação
anterior dizia que as strings soltas eram tarefa M com chance de colidir com outra do design system; saiu como uma
tarefa só, sem colisão, no mesmo PR da outra. Nenhum desvio piora o que os achados pediam.

A tarefa direta da PR #42 também não tinha corte de spec. Contra a recomendação da auditoria pós-PR #41, entregou
os cinco itens do critério de pronto e mais três coisas: o token `--warning` no `globals.css`, que a recomendação
previa só "se preciso"; o `forcedTheme` respeitado pelo provider, acrescentado pelo `/review`; e três casos Vitest
do `/test`. O plano reescreveu a letra do critério 1 ("cada semente igual ao hex do tema", em vez de "nenhum token
derivado `#000000`"), porque o `colorPrimaryActive` do claro sai `#000000` como derivação legítima de `#171717`.
Os tokens `Menu.dangerItem*` ficaram fora, como a recomendação previa. Nenhum desvio piora o que ela pedia.

A tarefa direta da PR #41 também não tinha corte de spec. Contra a recomendação da auditoria pós-PR #40, entregou
os cinco itens do critério de pronto e mais duas coisas: a `NotFoundPage` da app passou a usar o `getDictionary()`
em vez de uma cópia local da leitura do cookie, e o `/review` acrescentou o `DocumentLangSync` depois que o `/test`
mediu o `<html lang>` parado na troca suave de idioma (O2). A recomendação previa os dois layouts raiz no
`contends_on`; o da web ficou intacto, porque ele já fica abaixo de `[locale]`. A contagem de "27 chamadores" da
recomendação estava inflada: 27 arquivos importam o módulo do servidor, e 19 chamam `getDictionary()` hoje (16
na web, 3 na app, com a `NotFoundPage`); os outros usam `getTranslations` com o idioma dos `params`. Nenhum desvio
piora o que a recomendação pedia.

A tarefa direta da PR #40 também não tinha corte de spec. Contra a recomendação da auditoria de 2026-10-04,
entregou o Enter em "Excluir" e, no mesmo arquivo, o `aria-haspopup` e o `aria-expanded` do gatilho, que era outro
achado. O `/review` acrescentou o `return onDelete?.()`, para o `onDelete` assíncrono manter o "Sim" carregando, e
trocou o `placement` da confirmação para `bottom` depois que o `/test` a mediu saindo da tela a 390 px. O plano
previa e o `/test` mediu o gatilho com área de clique menor. Nenhum dos desvios piora o que a recomendação pedia.

A tarefa direta da PR #37 não tinha corte de spec. Contra a recomendação da auditoria de 2026-10-03, entregou as três
operações e a UI, e acrescentou duas coisas: o `DELETE` recusa também um segundo perfil que aponte para o mesmo
uid de quem chama (decisão D2 do plano da tarefa, fixada em teste), e o `HookFormSelect` ganhou a prop
`description`.

**Deriva de pipeline da PR #53:** dez commits na branch, um por assunto, juntados num só pelo squash. Duas tarefas
diretas em sequência na mesma branch, sem arquivo de código compartilhado (a da API na `apps/api`, a do sino na
`apps/app`), e o título da PR fala só da primeira; quem lê o histórico de `main` não vê o sino na linha do commit, só no
corpo. A branch `guilhermebittelbrunn/cycle-command-v6` não segue `<project>/<type>/<title>`; o `/review` da API propôs
`api/fix/edge-413-close-and-route-id`, e a renomeação não aconteceu (E11). Ela ficou viva no remoto depois do merge
(pendência 16). Os dois `STATE.md` registram `review: done` e `test: done`; o do sino diz que o `review: done` foi
marcado antes de os commits existirem, a pedido do orquestrador. O `test/report.md` do sino foi gravado por heredoc,
porque a ferramenta `Write` recusou o arquivo, como nas PRs #46 e #52. O `/test` do sino subiu a app na porta 3010,
porque a 3000 estava ocupada por outro projeto.

**Deriva de pipeline da PR #52:** 16 commits planejados pelo `/review`, um por assunto, juntados num só pelo squash,
com a auditoria pós-PR #51 como o 13º. A spec entrou no ciclo `proposed` (E4). A branch `feat/in-app-notifications` não
segue `<project>/<type>/<title>`, porque o diff cruza dois apps e três pacotes (E11), e ficou viva no remoto depois do
merge (pendência 16). Desta vez o `STATE.md` registrou `review: done` e `test: done` antes do merge, com o nome da branch
que subiu. O `test/report.md` foi gravado pelo orquestrador com o texto do `analista-qa`, porque a ferramenta do
subagent recusou a escrita, como na PR #46; o próprio `STATE.md` registra isso.

**Deriva de pipeline da PR #51:** 8 commits planejados pelo `/review`, um por assunto, juntados num só pelo squash.
Três tarefas diretas na mesma PR, sem arquivo de código compartilhado entre elas (o `docs/SECURITY.md` recebeu as
duas, em linhas diferentes). A branch `guilhermebittelbrunn/cycle-command-v5` não segue `<project>/<type>/<title>`; o
`/review` propôs `api/fix/google-sign-in-unlink-restore-body-cap`, que passa no regex, e a renomeação não aconteceu
(E11). Ela ficou viva no remoto depois do merge (pendência 16). Os três `STATE.md` ficaram com `review: in-progress`, e o
de `request-body-size-limit`, com `test: blocked`: o `/test` pediu decisão sobre o D2, a PR foi mergeada sem a correção, e
o motivo ficou na mensagem do commit, não no `STATE.md`. A rodada 2 do `/review` de `request-body-size-limit` mudou o helper depois do primeiro
`/test` (o D1), e o `/test` mediu de novo no servidor real.

**Deriva de pipeline da PR #50:** 7 commits planejados pelo `/review`, um por assunto, juntados num só pelo squash. A
branch `guilhermebittelbrunn/cycle-v3` não segue `<project>/<type>/<title>`; o `/review` propôs
`fix/admin-archive-access-revocation` e a renomeação não aconteceu (E11). Ela ficou viva no remoto depois do merge
(pendência 16), e o `STATE.md` ficou com `review: in-progress`. A rodada 2 do `/review` mudou `apps/app`, que o plano
deixava fora, para corrigir o login com Google preso que o `/test` achou, e o `/test` mediu de novo depois. O primeiro
`pnpm test` da raiz no `/test` falhou num teste de tempo do design system, sob carga, e passou nas três execuções
seguintes; o relatório registra.

**Deriva de pipeline da PR #49:** 12 commits planejados pelo `/review`, um por assunto, juntados num só pelo squash.
O `/review` registrou dois desvios de ordem (decisão 1 do `review/review.md`): as traduções aditivas entraram num commit
de i18n antes da web e da app, e a tradução da página de contato foi junto do commit da web, porque nenhuma ordem com a
i18n por último deixava todos os commits compiláveis. A branch `feat/contact-support-channel` não segue
`<project>/<type>/<title>`, porque o diff cruza três apps e cinco pacotes (E11), e ficou viva no remoto depois do
merge (pendência 16). O `STATE.md` ficou com `review: in-progress`. A rodada 2 do `/review` mudou
`contact-form-client.tsx` depois do `/test` (a trava do envio duplo) e mediu a mudança só por teste de componente. O
`/test` subiu a app na porta 3100, porque a 3000 estava ocupada por um processo de outro projeto.

**Deriva de pipeline da PR #48:** 11 commits planejados pelo `/review`, um por assunto, juntados num só pelo squash.
A branch `feat/linked-sign-in-methods` foi criada a partir de `guilhermebittelbrunn/cycle-v2` e não segue
`<project>/<type>/<title>`, porque o diff cruza dois apps e três pacotes (E11); ficou viva no remoto depois do merge
(pendência 16). O `STATE.md` registrou `review: done` e `test: done` antes do merge, com o nome certo da branch. O
`/develop` foi retomado depois de uma interrupção, e o handoff registra o que veio da execução interrompida (o `email`
junto da senha em `password/set`). O `/test` rodou duas vezes: a primeira achou um alerta de erro depois de um
desvínculo bem-sucedido, o `/review` tirou o `reloadCurrentUser()` do desvínculo e a segunda mediu o defeito fechado.
O `/test` subiu a app na porta 3100 porque a 3000 estava ocupada por outro workspace.

**Deriva de pipeline da PR #47:** 18 commits na branch, um por assunto, juntados num só pelo squash. A branch
`feat/pricing-page-catalog` foi criada a partir de `guilhermebittelbrunn/spec-discussion` e não segue
`<project>/<type>/<title>`, porque o diff cruza três apps e quatro pacotes (E11); ficou viva no remoto depois do merge
(pendência 16). O `STATE.md` registrou `review: done` e `test: done` antes do merge, com o nome certo da branch. Dois
desvios de processo registrados pela própria feature: o dicionário da landing e a página nova ficaram em commits
separados, aceitando um commit vermelho no meio (D3 do `review/review.md`), e o formatador de preço foi movido com
`mv`, então o histórico da branch registra adição e remoção em commits diferentes. O `/review` corrigiu uma regressão
de layout que o `/test` encontrou (cards da `/pricing` colados na borda) e um open redirect que já existia em `main`.

**Deriva de pipeline da PR #46:** 12 commits na branch, um por assunto, juntados num só pelo squash. Duas tarefas
diretas no mesmo PR, sem arquivo de código compartilhado entre elas. A branch
`guilhermebittelbrunn/cycle-2-features-implement` não segue `<project>/<type>/<title>`; o `/review` recomendou
renomear e a renomeação não aconteceu (E11). Ela ficou viva no remoto depois do merge (pendência 16). Os dois
`STATE.md` registram `review: in-progress`. Os dois `test/report.md` foram gravados pelo orquestrador do `/cycle` com o
texto do `analista-qa`, porque a harness bloqueou a escrita do subagent; o próprio relatório registra isso.

**Deriva de pipeline da PR #45:** 16 commits na branch, um por assunto, juntados num só pelo squash. Três tarefas
diretas no mesmo PR, sem arquivo de código compartilhado entre elas. A branch `fix/date-pickers-form-fields-and-header`
não segue `<project>/<type>/<title>`, porque o diff cruza quatro workspaces (E11), e ficou viva no remoto depois do
merge (pendência 16). Os três `STATE.md` registraram `review: done` antes do merge.

**Deriva de pipeline da PR #44:** seis commits na branch, um por assunto (a auditoria pós-PR #43, a âncora do
`PRE-PRODUCTION.md`, a i18n, o design system, a web e os artefatos), juntados num só pelo squash. A branch
`fix/date-input-locale` não segue `<project>/<type>/<title>`, porque o diff cruza três workspaces (E11), e ficou viva
no remoto depois do merge (pendência 16). O `STATE.md` registrou cinco commits propostos; o sexto, da âncora, entrou
como commit `docs` separado, como a `cycle-policy` §6 pede.

**Deriva de pipeline da PR #43:** onze commits na branch, um por assunto (i18n primeiro, para cada commit ficar
verde), juntados num só pelo squash. Duas tarefas diretas no mesmo PR, porque as duas mexiam no
`AccountPrivacyPanel.tsx` e no teste dele. A branch `fix/ui-labels-and-account-dialog-focus` não segue
`<project>/<type>/<title>`, porque o diff cruza quatro workspaces (E11), e ficou viva no remoto depois do merge
(pendência 16).

**Deriva de pipeline da PR #42:** três commits na branch, um por assunto, juntados num só pelo squash; a branch
`design-system/fix/antd-theme-seed-colors` segue o padrão e ficou viva no remoto depois do merge (pendência 16).

**Deriva de pipeline da PR #41:** nove commits na branch, um por assunto, juntados num só pelo squash; a branch
`fix/server-locale-from-url` ficou viva no remoto depois do merge (pendência 16) e não segue
`<project>/<type>/<title>` (E11).

**Deriva de pipeline da PR #40:** a PR saiu com três commits na branch (a correção, a auditoria do backlog e os
artefatos), como a regra de granularidade pede, e o squash do merge juntou os três num só em `main`. A separação
por assunto vale na branch e no PR, não no histórico da `main`. A branch `design-system/fix/action-menu-keyboard-delete`
segue o padrão e ficou viva no remoto depois do merge (pendência 16).

**Deriva de pipeline das PRs #37 a #39:** as duas features com spec rodaram em paralelo, embora a fatia 2 pertencesse a uma spec
`in-progress`, que o algoritmo de lotes exclui (ver [Lotes paralelos](#lotes-paralelos)). As três branches ficaram
vivas no remoto depois do merge (pendência 16) e nenhuma segue `<project>/<type>/<title>` (E11).

### Âncoras relidas

**Em 2026-10-21, pós-PR #53:** nenhuma spec viva nem nota de `research/` cita arquivo alterado pela PR #53 com número
de linha, então nenhuma âncora de spec mudou. Neste arquivo, as âncoras de arquivos que a PR deslocou foram remedidas
contra `git show 3a118c6:<arquivo>`: `base.repository.ts` (`countQuery` `:138` → `:139`; o `delete` com `deletedAt`,
citado como `:225-227`, hoje `:229-231`; `deleteBulk`, citado como `:190`, hoje `:267`; as duas últimas já estavam
erradas antes da PR, que só somou quatro linhas), `parse-request-json.ts` (o ramo sem stream `:55-58` → `:60-63`; o
helper `:50-67` → `:55-71`), `NotificationsBell.tsx` (o badge `:50-57` → `:52-60`) e `docs/SECURITY.md` (a subseção
"Tamanho do corpo" `:172-179` → `:172-182`). `docs/PRE-PRODUCTION.md`, `docs/SUBPROCESSORS.md` e `AGENTS.md` não mudaram
de contagem até a linha alterada, e as âncoras deste arquivo para eles valem.

**Em 2026-10-20, pós-PR #52:** três specs vivas citavam arquivo alterado pela PR #52, e as âncoras foram corrigidas
nelas, com o número antigo entre parênteses: `observability-logging` (`log.ts:51-57` → `:52-58`, a união de escopos
`:5-14` → `:5-15`, com dez valores, `:21` → `:22`, `:27-29` → `:28-30`, `:56` → `:57`; `webhooks/payments/route.ts:279,291`
→ `:296,308` e `:181` → `:198`; `user-merge.ts:62` → `:63`; `account-export.ts:120` → `:121`; `account-erasure.ts:165`
→ `:171` e `:37-40` → `:39-42`; e a contagem de `logEvent(`, de 42 para 43), `one-time-purchase` (`PAYMENTS.md:199-200`
→ `:208-209`, `PRE-PRODUCTION.md:518-521` → `:568-571`, `webhooks/payments/route.ts:194-232` → `:211-249`) e
`account-security-mfa` (`translations/packages/shared/utils.ts:245`, `:393` → `:248`, `:399`; `:56` e `:98` não
mudaram). `magic-link-sign-in`, `social-sign-in-providers` e `teams-organizations` não citam arquivo da PR com número de
linha (`docs/FORKING.md:175`, de `social-sign-in-providers`, fica antes do texto novo). Nenhuma nota de `research/` cita
arquivo da PR com número de linha. Neste arquivo, as âncoras do webhook (+17 linhas a partir do produtor de
notificações), de `user-merge.ts` (+1 até a criação do perfil), de `account-erasure.ts`, de `log.ts` e do
`PRE-PRODUCTION.md` (+50 entre a `:251` e a `:812`, +52 depois) foram remedidas linha a linha contra
`git show 9b37e02:<arquivo>`.

**Em 2026-10-19, pós-PR #51:** três specs vivas citavam arquivo alterado pela PR #51, e as âncoras foram corrigidas
nelas, com o número antigo entre parênteses: `account-security-mfa` (`auth.schema.ts:24`, `:29`, `:89-90` → `:27`,
`:32`, `:101-102`; a citação de `auth.schema.ts:6` fica dentro de uma tabela histórica da spec, sobre as cópias de
`MIN_PASSWORD_LENGTH`, e não foi mexida), `observability-logging` (a contagem de `logEvent(`, de 41 para 42, com o
evento novo) e `social-sign-in-providers` (`auth/sign-in/google/route.ts:10-40` → `:16-64`, com a descrição reescrita, e
`account/sign-in-methods/[id]/route.ts:36-42` → `:64-70`). `magic-link-sign-in` e `in-app-notifications` não citam
arquivo da PR (`grep` pelos seis arquivos de código e pelos dois documentos: 0). Nenhuma nota de `research/` cita
arquivo da PR. Neste arquivo, as âncoras da rota de desvínculo (+28 linhas antes da checagem do provedor), de
`auth.schema.ts` e do `docs/SECURITY.md` (+8 linhas depois da `:171`) foram remedidas linha a linha contra
`git show 4b0be90:<arquivo>`.

**Em 2026-10-19, pós-PR #50:** três specs vivas citavam arquivo alterado pela PR #50, e as âncoras foram corrigidas
nelas, com o número antigo entre parênteses: `account-security-mfa` (`users/[id]/route.ts:151-153` → `:153-155`;
`translations/packages/shared/utils.ts:54`, `:96`, `:241`, `:387` → `:56`, `:98`, `:245`, `:393`),
`observability-logging` (`users/[id]/route.ts:194` → `:196`, e a contagem de `logEvent(` de 39 para 41) e
`social-sign-in-providers` (`googleSignInApi.ts:17-36` → `:21-79`; `auth/sign-in/google/route.ts:9-30` → `:10-40`). A
âncora `docs/PAYMENTS.md:199-200` de `one-time-purchase` foi conferida e não mudou. Nenhuma nota de `research/` cita
arquivo da PR com número de linha. Neste arquivo, as âncoras de `user.repository.ts` (+16 linhas, o
`hasArchivedProfile`), `users/[id]/route.ts` (+2 linhas até o cancelamento, +16 depois do passo novo do `DELETE`) e `docs/INCIDENT-RESPONSE.md` (uma linha
depois da `:51`) foram remedidas linha a linha contra `git show 4eeb07b:<arquivo>`.

**Em 2026-10-19, pós-PR #49:** cinco specs vivas citavam arquivo alterado pela PR #49, e as âncoras foram corrigidas
nelas, com o número antigo entre parênteses: `magic-link-sign-in` e `social-sign-in-providers` (`apps/api/proxy.ts:49-62`
→ `:53-67`), `observability-logging` (`proxy.ts:74`, `:129`, `:168`, `:82-83` → `:79`, `:134`, `:173`, `:87-88`;
`packages/email/index.ts:40-50` e `:121-131` → `:41-51` e `:122-132`), `account-security-mfa`
(`translations/packages/shared/utils.ts:239` e `:383` → `:241` e `:387`; `:54` e `:96` não mudaram) e
`one-time-purchase` (`docs/PRE-PRODUCTION.md:517-520` → `:518-521`). A âncora `docs/FORKING.md:175` de
`social-sign-in-providers` foi conferida e não mudou: a PR trocou duas linhas do documento sem mudar a contagem. Nenhuma
nota de `research/` cita arquivo da PR com número de linha. Neste arquivo, as âncoras de `apps/api/proxy.ts` (quatro
linhas de comentário antes da lista e uma na lista), `packages/email/index.ts` (um import), `docs/SECURITY.md` (uma
linha depois da `:27`), `docs/ROPA.md` (duas depois da `:101`) e `docs/PRE-PRODUCTION.md` (uma, três, duas e uma depois
das `:270`, `:601`, `:732` e `:807`) foram remedidas linha a linha contra `git show 44b2b04:<arquivo>`.

**Em 2026-10-19, pós-PR #48:** três specs vivas citavam arquivo alterado pela PR #48, e as âncoras foram corrigidas
nelas, com o número antigo entre parênteses: `account-security-mfa` (`AccountSecurityForm.tsx:140` → `:154` e `:105` →
`:119`; `action.ts:127`, `:138`, `:146` → `:163`, `:174`, `:182`; `packages/auth/client.ts:214-225` → `:244-255`;
`account.schema.ts:47-48`, `:136-137` → `:49-50`, `:154-155`; `translations/packages/shared/utils.ts:46`, `:88`, `:223`,
`:359` → `:54`, `:96`, `:239`, `:383`), `magic-link-sign-in` (`client.ts:142-155` → `:144-157`) e
`social-sign-in-providers` (`client.ts:150-155` → `:152-157`). As âncoras que não mudaram foram conferidas também:
`account.schema.ts:8`, `accountFormSchema.ts:9`, `deletion/route.ts:55-72` e `docs/FORKING.md:175`. Nenhuma nota de
`research/` cita arquivo da PR. Neste arquivo, as âncoras de `docs/SECURITY.md` (+2 linhas antes do rate limit),
`docs/FORKING.md` (+8 depois da `:176`), `docs/PRE-PRODUCTION.md` (+25 depois da `:918`), `audit.ts`,
`AccountEmailChangeDialog.tsx`, `AccountPrivacyPanel.tsx` e `packages/auth/client.ts` foram remedidas linha a linha
contra `git show dd31a95:<arquivo>`.

**Em 2026-10-16, pós-PR #47:** seis specs vivas citavam arquivo alterado pela PR #47, e as âncoras foram corrigidas
nelas, com o número antigo entre parênteses: `contact-support-channel` (`pricing/page.tsx:176` → `:73-76` e o card
novo; `apps/api/proxy.ts:45-58` → `:49-62`), `magic-link-sign-in` e `social-sign-in-providers` (a mesma lista de rate
limit; em `social-sign-in-providers`, o botão do Google em `SignInForm.tsx:181-191` → `:187-197`),
`observability-logging` (`apps/api/proxy.ts:70`, `:125`, `:164`, `:78-79` → `:74`, `:129`, `:168`, `:82-83`, e a
contagem de `logEvent(` de 37 para 39), `account-security-mfa` (`SignUpFormClient.tsx:114` → `:121`) e
`one-time-purchase` (`docs/PAYMENTS.md:165-166` → `:199-200`, `docs/PRE-PRODUCTION.md:513-516` → `:517-520`, e o
link para a spec arquivada). A nota [`saas-starter-feature-benchmark`](research/saas-starter-feature-benchmark.md)
ganhou uma linha datada: a linha do next-forge descreve a página herdada, que a PR #47 substituiu. Neste arquivo, as
âncoras de `apps/app/proxy.ts`, `apps/api/proxy.ts`, `SignUpFormClient.tsx`, `docs/PAYMENTS.md`,
`docs/PRE-PRODUCTION.md`, `docs/FORKING.md` e `apps/api/.env.example` foram remedidas linha a linha contra
`git show c8577b7:<arquivo>`.

**Em 2026-10-16, pós-PR #46:** duas specs vivas citavam arquivo alterado pela PR #46, e as âncoras foram corrigidas
nelas: `observability-logging` (as falhas do webhook, de `:272` e `:284` para `:279` e `:291`) e `account-security-mfa`
(`auth.schema.ts`, de `:23`, `:28` e `:82-83` para `:24`, `:29` e `:89-90`; a folha de `apiErrors`, de `:45`, `:85`,
`:217` e `:349` para `:46`, `:88`, `:223` e `:359`). As citações de `webhooks/payments/route.ts:194-232` em
`in-app-notifications` e `one-time-purchase` foram escritas depois do merge e conferem. Nenhuma nota de `research/`
cita arquivo da PR (`grep` pelos sete arquivos de código: 0). Neste arquivo, as âncoras dos achados abertos em arquivos
da PR foram remedidas: o header da web (a marca longa, `:236`, `:39`, `:231-233`), o `skipValidation`
(`apps/web/env.ts:36`) e a resposta de sucesso do webhook (`:298`). Uma âncora de spec ficou para trás sem relação
com a PR: `one-time-purchase` citava `docs/PRE-PRODUCTION.md:510-514` e `checkout/route.ts:38-46`, hoje `:513-516` e
`:39-46`.

**Em 2026-10-14, pós-PR #45:** nenhuma spec viva nem nota de `research/` cita arquivo alterado pela PR #45 (`grep`
por `header`, `button.tsx`, `date-input`, `radio-group`, `hookformInput`, `Footer.tsx` e `contact-form` nos três
arquivos de spec e nas quatro notas de `research/`: só menções a header HTTP, sem relação). Neste arquivo, as linhas
abertas que citavam arquivo da PR com a marca "no working tree" passaram a valer para `main` sem mudar de número
(`button.tsx:72`, `hookformInputPassword.tsx:66-72`, `useSubmitEnterGuard.ts`); as dos achados fechados saíram com
eles. O `aria-describedby` do `DateInput` de `accessibility-conformance` desceu de `date-input.tsx:72` para `:76`, com
as props novas do seletor de mês.

**Em 2026-10-14, pós-PR #44:** nenhuma spec viva nem nota de `research/` cita arquivo alterado pela PR #44 (`grep`
por `date-input`, `calendar.tsx`, `calendar-locales`, `contact-form-client` e `components/index.ts` nos três arquivos
de spec e nas quatro notas de `research/`: 0). Neste arquivo, a única linha aberta que citava arquivo deslocado pela
PR é a do `<Label htmlFor="date">` do formulário de contato: `contact-form-client.tsx:72` → `:73`, com o import novo
do `calendarLocales`. As duas linhas do `DateInput` e do `Calendar` em inglês saíram com os achados fechados, e as
âncoras da recomendação anterior (`date-input.tsx:51`, `:86`, `:93`, `calendar.tsx:188-189`, `:193`) saíram com ela.
`date-input.tsx:72` segue com o `aria-describedby` de `accessibility-conformance`.

**Em 2026-10-13, pós-PR #43:** nenhuma spec viva nem nota de `research/` cita arquivo alterado pela PR #43 (`grep`
pelos 14 componentes, pelos testes alterados e por `translations/components` nos três arquivos de spec e nas notas
de `research/`: 0; a única menção ao design system é `input-otp.tsx`, que a PR não tocou). Neste arquivo foram
relidas e corrigidas as âncoras de arquivos que a PR deslocou: `antd-app.tsx` (seis linhas de import no topo e mais
oito do `antdLocales` e do `useDictionary()`: tokens `Menu.dangerItem*` `:91-95` → `:97-101`, `colorError` `:130` →
`:136`, primário `:127` → `:133`, aliases `:51` → `:57`); `AccountEmailChangeDialog.tsx` (o `onOpenAutoFocus` citado
na recomendação anterior em `:115-117` está hoje em `:121`, e o campo de senha em `:147-152`);
`sharedFooterPendingState.test.tsx` (`:35-37` → `:38-40`). As linhas que citavam o `AccountPrivacyPanel.tsx:137` e os
arquivos das strings soltas saíram com os achados fechados. `AccountPrivacyPanel.tsx:29` e `:40-48`
(`requiresPrivacyChannel`) e `AccountEmailChangeDialog.tsx:29` e `:36-46` (`lacksPasswordProvider`) não mudaram.

**Em 2026-10-07, pós-PR #42:** nenhuma spec viva nem nota de `research/` cita `antd-app.tsx`, `globals.css` ou
`actionMenu.test.tsx` (`grep`: só `input-otp.tsx` em `account-security-mfa`, que a PR #42 não tocou). Neste
arquivo foram relidas e corrigidas as âncoras de arquivos que a PR deslocou: `antd-app.tsx` (tokens
`Menu.dangerItem*` `:66-70` → `:91-95`) e `actionMenu.test.tsx` (`:103` → `:107`, `:300` → `:304`, `:345` → `:349`,
`:380` → `:384`, `:400` → `:404`, `:415` → `:419`, com as três linhas do import novo). O `--destructive` do claro
segue em `globals.css:24`; o token novo entrou depois dele.

**Em 2026-10-07, pós-PR #41:** nenhuma spec viva cita arquivo alterado pela PR #41 (`grep` por `proxy.ts`,
`layout.tsx`, `internationalization/server`, `NotFoundPage`, `pricing/page` e pelos documentos alterados nos três
arquivos de spec e nas notas de `research/`: só `apps/api/proxy.ts`, que não mudou, e a menção a
`docs/ARCHITECTURE.md` de `teams-organizations`, que continua verdadeira, porque a linha alterada fala de
idioma). Neste arquivo, as âncoras dos achados abertos em arquivos que a PR #41 deslocou foram relidas e
corrigidas: `apps/app/proxy.ts` (deep link do onboarding `:244` → `:263`, redirecionamento ao sign-in `:211` →
`:230`, bounce `:214-232` → `:233-251`, `:229` → `:248` e `:216-217` → `:235-236`, cookie `:195,199` →
`:214,218`); `apps/web/proxy.ts` (matcher `:57` → `:61`, guarda do `ARCJET_KEY` `:63` → `:67`, `secure()` `:68` →
`:72`); `apps/app/app/layout.tsx` (`:48`, `:73` → `:49`, `:74`).

**Em 2026-10-07, pós-PR #40:** nenhuma das três specs vivas cita `action-menu.tsx` nem `actionMenu.test.tsx`
(`grep` nos quatro arquivos de spec e nas notas de `research/`: 0), então nenhuma âncora de spec mudou. Neste
arquivo, as âncoras dos dois achados fechados saíram com eles, e a da lacuna de teste da cor do item `danger`
foi corrigida de `actionMenu.test.tsx:95` para `:103`.

**Em 2026-10-04:** as PRs #37 a #39 alteraram arquivos citados pelas três specs vivas. Cada âncora em arquivo
alterado foi relida no `d92d21b` e corrigida na spec, com a data:

| spec | o que mudou |
|------|-------------|
| `account-security-mfa` | `server.ts` (revogação, checagem do bearer, cookie, `checkRevoked` agora em duas linhas de comentário), `session-routes.ts` (logout local, `sessionPOST`, renovação), `action.ts`, `AccountSecurityForm.tsx`, os códigos de senha no dicionário e `users/[id]/route.ts:151-153`; o primeiro bullet de "O que já existe" foi reescrito porque o logout deixou de ser global |
| `observability-logging` | contagem de `logEvent(` fora de testes de 33 para **37** (uma do webhook de recursos, três do rastreio de sessões); falhas do webhook em `:272` e `:284`; `account-export.ts:120`, `account-erasure.ts:165` e `:37-40`; as sete chamadas de `console` de `packages/auth/server.ts`. Nenhuma das PRs acrescentou `console` cru |
| `teams-organizations` | `user.ts:5`, `:64`, `:66`; `account/route.ts:49`, `:162`; `entities/route.ts:28`, `:73`, `:81`; nota sobre os três filtros por `uid` da coleção `session`, que não contam como posse por grupo |

### O que a auditoria **não** encontrou

Nenhuma spec `done` perdeu código. A PR #53 mexeu em peças de duas specs arquivadas, e as duas seguem inteiras:
`cursor-pagination` (o `isUsableDocumentId` ganhou o limite de 1 500 bytes UTF-8 e segue recusando o cursor forjado,
`pagination.ts:18-27`, com +2 casos de `decodeCursor` em `paginationQuery.test.ts`) e `in-app-notifications` (o sino
segue com o polling de 120 s só com a aba visível, `useUnreadNotificationsCount.ts:41-44`, o teto de 100 e o `99+`, que o
critério 6 do `/test` do sino mediu de novo; a lista, a marcação e a personificação seguem nos testes de hook). O
`findById` do repositório base, que todo recurso usa, só recusa antes id que o Firestore não aceitaria como caminho. A
suíte inteira (3383 testes) e o job `e2e` da execução de merge passaram. `git grep` por `multiFactor`, `TOTP`,
`passkey`, `organizationId`, `membership` e pelos SDKs de coletor (`@sentry`, `@logtail`, `@axiomhq`, `betterstack`) em
`apps/` e `packages/`, em 2026-10-21 pós-PR #53: 0 (fora o `inputOTPContext` do `input-otp.tsx`). `logEvent(` fora de
testes: 43. O `input-otp.tsx` segue sem uso fora do barril e do `playground`. Os 24 caminhos de `contends_on` das seis
specs existem no disco.

**Registro da rodada pós-PR #52.** A PR #52 mexeu em peças de quatro specs arquivadas (`data-rights-lgpd`,
`billing-subscription`, `plan-entitlements` e `onboarding-flow`), e todas seguiam inteiras; o detalhe está na versão
deste arquivo em `d19e6fd`.

**Registro da rodada pós-PR #51.** A PR #51 mexeu em peças de uma spec arquivada e de duas tarefas diretas, e no helper
que 22 handlers usam, e tudo seguia inteiro; o detalhe está na versão deste arquivo em `3a118c6`.

**Registro da rodada pós-PR #50.** A PR #50 mexeu em peças de quatro specs arquivadas e de duas tarefas diretas, e
todas seguiam inteiras; o detalhe está na versão deste arquivo em `9b37e02`.

**Registro das rodadas pós-PR #46 a pós-PR #49.** Nenhuma spec `done` perdeu código em nenhuma delas; o detalhe de
cada uma, com as specs arquivadas conferidas e as contagens, está nas versões deste arquivo em `4b0be90`, `4eeb07b`,
`44b2b04` e `dd31a95`.

**Registro das rodadas anteriores.** A PR #45 mexeu no `Button`, no `DateInput`, nos campos `HookForm*` de texto e
senha e no `RadioGroupInput`, que `accessibility-conformance`, `audit-log` e `data-rights-lgpd` usam, e as três seguem
inteiras: o botão do `DateInput` mantém `aria-invalid` e `aria-describedby` (`date-input.tsx:76-77`), os filtros da
trilha ganharam teste com o `DateInput` real (`auditFiltersDateInput.test.tsx`), os casos antigos de
`accountPrivacyPanel.test.tsx` seguem verdes nesta auditoria, e o job `e2e` da execução de merge, com o axe e a
allowlist vazia, passou. Nenhuma feature nova deveria ter `spec:` e não tem: as três gravam `spec: none`. A PR #44 mexeu no `DateInput`, que duas specs arquivadas usam, e as duas seguem
inteiras: `accessibility-conformance` (o botão do `DateInput` mantém `aria-invalid` e `aria-describedby`,
`date-input.tsx:72-73`, e o job `e2e` da execução de merge, com o axe, passou) e `audit-log` (os filtros de período
passam o `placeholder` do chamador e gravam `yyyy-MM-dd`; o `/test` disparou `GET /audit-events` com `from` e `to`
e recebeu 200). A PR #43 tinha mexido em peças de três specs arquivadas, e as três seguiam inteiras:
`data-rights-lgpd` (a exclusão de conta pede a senha, recusa campo vazio e bloqueia a personificação, com os dez
casos antigos de `accountPrivacyPanel.test.tsx` verdes), `account-email-change` (o diálogo segue com
`onOpenAutoFocus` e `onCloseAutoFocus`, `AccountEmailChangeDialog.tsx:91-101`, `:120-121`, e os casos de foco do
teste dele verdes) e `accessibility-conformance` (o job `e2e` da execução de merge, com o axe, passou; os nomes
acessíveis só trocaram de texto fixo para o dicionário). Nenhuma feature em `docs/features/*/STATE.md` deveria ter
`spec:` e não tem: `date-input-locale` é tarefa direta e grava `spec: none`. Nenhuma entrega parcial órfã além da
fatia 3 de `account-security-mfa`, que é a E12. `git grep` por `multiFactor`, `TOTP`, `passkey`, `organizationId`,
`membership` e pelos SDKs de coletor (`@sentry`, `@logtail`, `@axiomhq`, `betterstack`) em `apps/` e `packages/`, em
2026-10-14 pós-PR #45: 0 (as únicas ocorrências sem distinguir maiúsculas são `InputOTP*`, do `input-otp.tsx`).
`logEvent(` fora de testes segue em 37, como `observability-logging` registra. O `input-otp.tsx` segue sem uso fora
do barril e do `playground`. Os dez arquivos de `contends_on` das três specs existem no disco.

## Achados: correções pontuais, não specs

Coisas que não merecem spec própria, mas que são correções pontuais. Viram tarefa direta no `/analyze`.

> **Passada incremental de 2026-10-21 (segundo `/cycle`).** `main` não mudou, então nenhuma linha fecha. A tarefa
> `leftover-ui-strings`, sem commit, corrige duas linhas, marcadas "corrigido no working tree, aguardando merge" e ainda
> contadas como abertas. O `/test` e o plano dela deixaram quatro registros: três viraram linhas novas, em
> [Achados da tarefa `leftover-ui-strings`](#-achados-da-tarefa-leftover-ui-strings-2026-10-21-working-tree), e o quarto
> reescreveu a linha do `global-error` da web, que deixou de ser "não medido". Cada âncora foi relida no working tree.
> **Placar: 0 fechados · 2 corrigidos no working tree, aguardando merge · 3 novos · 1 reescrito · 139 abertos (136 + 3).**
>
> **Auditoria de 2026-10-21 (pós-PR #53).** A passada incremental de 2026-10-20 fechou com 138 linhas abertas. A PR #53
> alterou 15 arquivos fora de `docs/features` e `specs` (`git diff --stat 3a118c6 d19e6fd`); toda linha que cita um deles
> foi relida em `main`, com a âncora comparada contra `git show 3a118c6:<arquivo>`. As demais seguem iguais, porque o
> arquivo citado é o mesmo byte a byte (a PR não tocou `apps/web`, `packages/*`, `turbo.json`, `firestore.rules` nem
> `.github/workflows`). O `/review` e o `/test` do sino pediram registros; viraram três linhas novas, em
> [Achados da tarefa `notifications-bell-freshness`](#-achados-da-tarefa-notifications-bell-freshness-pr-53). O aviso de
> hidratação que o `/test` do sino viu uma vez, numa sessão com emulação de iPhone e tema trocado à mão, não foi
> investigado nem reproduzido e não virou linha, como o caso parecido da PR #52. **Placar: 5 fechados (os dois 🟡 da
> borda da API e os três 🟢 do sino) · 3 novos (a marca de lista velha que depende de quem escreve, o "marcar todas" com a
> contagem em erro e o popover sobre a scrollbar clássica) · 1 reduzido (as âncoras de documento deslocadas, com duas
> corrigidas pela PR) · 136 abertos, pela soma (138, menos 5, mais 3).** A tabela de fechados da PR #52 (nenhum) e o
> placar da passada incremental ficaram na versão deste arquivo em `d19e6fd`; a da PR #51, em `3a118c6`; a da PR #50, em
> `9b37e02`; a da PR #49, em `4b0be90`; a da PR #48, em `4eeb07b`; a da PR #47, em `44b2b04`; a da PR #46, em `dd31a95`;
> a da PR #45, em `c8577b7`; a da PR #44, em `eb47e80`; a da PR #43, em `fa7041b`; a da PR #42, em `7fb2fe9`; a da PR
> #41, em `dbcac2a`; a da PR #40, em `0a49a3b`; a de 2026-10-04, em `5f4a8e9`; as de 2026-09-26 a 2026-10-03, em
> `02c31b5`.

### ✅ Fechado na auditoria de 2026-10-21 (PR #53)

| achado | aberto em | fechado por | evidência em `main` (`d19e6fd`) |
|--------|-----------|-------------|----------------------------------|
| 🟡 depois do `413` do teto de corpo, a conexão ficava aberta até o `requestTimeout` do Node | PR #51 (D2 de `request-body-size-limit`) | `api-edge-413-close-and-route-id` | `parse-request-json.ts:21-22`, `:57`, `:66`; medido em `next start` pelo `/test`: 0 conexões abertas aos 60 s, contra 40 sem o header |
| 🟡 um id com `%2F` chegava ao `findById` de `entities/[id]` e `users/[id]`, e a resposta seria 500 | PR #52 | `api-edge-413-close-and-route-id` | `base.repository.ts:145-147`; `pagination.ts:3`, `:18-27`; medido: 24/24 ids inválidos com 404 |
| 🟢 a lista do sino herdava 60 s de `staleTime` e ficava atrás do badge | PR #52 | `notifications-bell-freshness` | `useUnreadNotificationsCount.ts:36-38`; `useListNotifications.ts:20-32`, `:60-67`; medido: 1 `GET /notifications` na reabertura depois de a contagem mudar |
| 🟢 a 375 px, o popover do sino encostava na borda esquerda | PR #52 | `notifications-bell-freshness` | `NotificationsBell.tsx:17`, `:66`; medido: 12 px de cada lado nos três idiomas |
| 🟢 depois de uma falha da contagem, o badge conservava o último número | PR #52 | `notifications-bell-freshness` | `useUnreadNotificationsCount.ts:63`; `useNotificationActions.ts:76-90`; medido: o badge some na falha e volta com o número do servidor |

### ⚠️ Achados abertos, reconferidos ou herdados

Reconferidos em 2026-10-04, pós-PR #39, de novo em 2026-10-07, pós-PR #40, pós-PR #41 e pós-PR #42, em 2026-10-13, pós-PR #43, em 2026-10-14, pós-PR #44 e pós-PR #45, em 2026-10-16, pós-PR #46 e pós-PR #47, em 2026-10-19, pós-PR #48, pós-PR #49, pós-PR #50 e pós-PR #51, em 2026-10-20, pós-PR #52, e em 2026-10-21, pós-PR #53, nas linhas de maior severidade (ver o placar acima). A PR #53 não tocou nenhum arquivo desta tabela.

| achado | onde | por que importa |
|--------|------|-----------------|
| ⚠️ **O modo `simple` não restringe o painel comum** (A1) | `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx` (não lê o modo) · `packages/next-config/product-mode.ts:12-23` (sem `commonUserUsesPanel`) · `docs/AUTH-SSO.md:66-71` | O documento descreve um redirecionamento que não existe, e uma pendência do `PRE-PRODUCTION.md` partia dele. Hoje o `simple` só esconde a cobrança. Estacionado (E10): o usuário decidiu ignorar o modo por ora |
| 🟡 **As rotas de `payments/` que chamam a Stripe estão fora do rate limit** (ampliado em 2026-10-16, pós-PR #47) | `apps/api/proxy.ts:53-67` (era `:49-62` até a PR #49 e `:45-58` até a PR #47) | Cada chamada vai à Stripe: o catálogo da aba (`/payments/plans`) lista preços, o checkout cria cliente (com chave de idempotência) e sessão, o portal cria sessão. As três exigem sessão, então o abuso depende de conta válida, mas um cliente em loop consome a cota de API da Stripe do fork. **Ampliado:** a PR #47 acrescentou `GET /payments/catalog`, pública e também fora da lista, de propósito (`apps/api/proxy.ts:43-45`); ela responde do cache de uma hora e não alcança a Stripe a cada chamada, então não herda o problema, mas pode ser martelada ao custo de invocações de função. O `docs/SECURITY.md:158` (era `:157` até a PR #49) cita a rota nova e segue sem citar checkout, portal e `plans` |
| 🟡 **`findByStripeCustomerId` devolve o documento cru, sem mapper** (ampliado em 2026-10-04) | `apps/api/(shared)/repositories/user.repository.ts:87-98` (era `:71-82` até a PR #50) | `{ ...(live.data() as UserDTO), id }` entrega `Timestamp` onde o tipo promete `Date`. Hoje o webhook só lê `id` e `stripeCustomerId`, então não quebra nada. A PR #38 deu ao método um segundo chamador, `reconcileEntitlements` (`webhooks/payments/route.ts:156`), que também só lê o `id`. Com o A2 fechado, o perfil arquivado já não tem assinatura viva quando o webhook deixa de achá-lo; quebra no primeiro chamador que ler uma data. Contraria a regra de ouro 5 (normalizar no mapper) |
| 🟡 **`.env.example` da `apps/app` e da `apps/web` publicam `STRIPE_*`, que nenhum dos dois lê** (A3) | `apps/app/.env.example:26-27` · `apps/web/.env.example:5-6` | Quem configura o fork põe a chave secreta em dois apps que não precisam dela. Só a `apps/api` lê (`PRE-PRODUCTION.md` §12 já diz isso) |
| 🟡 **Lacunas de teste do arquivamento pelo admin** (nova, PR #28; ampliada em 2026-10-19, pós-PR #50) | `apps/api/app/(routes)/users/[id]/route.ts:194-220` (era `:192-204`) · `apps/api/__tests__/usersAdminDeleteBilling.test.ts` · `usersAdminArchiveAccess.test.ts` | Não há teste para o cancelamento que passa seguido do soft delete que falha (Firestore fora) nem para o duplo clique no "Sim" do diálogo. **Ampliada:** desde a PR #50 a desativação no Auth fica entre os dois passos; se o soft delete falhar depois dela, a conta fica desativada com o perfil vivo, e os sete casos de `usersAdminArchiveAccess.test.ts` não cobrem isso. Pela leitura é recuperável: a nova tentativa repete a desativação, que não tem efeito numa conta já desativada. O `/review` da PR descreveu por leitura o primeiro caso como recuperável: a assinatura já cancelada conta como cancelada na tentativa seguinte (`(shared)/lib/billing.ts:164`, âncora remedida em 2026-10-04) |

### 🆕 Achados da entrega `e2e-testing`

Registrados pelo `/review` da suíte E2E. Eram três: a allowlist e o gatilho do `ActionsMenu` fecharam com a PR
#32 e estão na lista de fechados. O CTA do hero segue aberto.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O CTA primário do hero diz "Entrar" e leva a `/contact`** | `apps/web/app/[locale]/(home)/components/hero.tsx:28-42` (destino em `:36`) · o mesmo par no bloco final (`cta.tsx:29`, `:33`) | Texto e destino não combinam. A suíte E2E não afirma esse comportamento, para não transformar o defeito em contrato. Reconferido em 2026-09-29: a PR #32 trocou o `Button` por `Link` com `buttonVariants` e manteve rótulo e destino. **Medido de novo pelo `/test` da PR #49 (2026-10-19):** o link chega ao formulário de contato, que agora entrega, e o rótulo segue `cta.primaryCta` ("Entrar", "Sign In", "Iniciar sesión"); destinos em `hero.tsx:36` e `cta.tsx:29` |

### 🆕 Achados da fatia 1 de `account-security-mfa` (PR #29)

Vindos do plano, do `/review` e do `/test` da fatia, conferidos no código em 2026-09-27. Nenhum bloqueia a
entrega; os três ficaram fora dela por decisão registrada.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Reenviar o cadastro depois de conta criada e login falho responde `USERS_AUTH_EMAIL_ALREADY_IN_USE`** | `apps/app/.../sign-up/components/SignUpFormClient.tsx:119-126` (era `:112-119` até a PR #47) · `apps/web/.../sign-up/components/sign-up-form-client.tsx:34-40` | A criação e o login são duas chamadas. Se a primeira passa e a segunda falha (rede, 429, cookie de sessão), a pessoa reenvia, recebe "e-mail já cadastrado" e precisa ir ao login por conta própria. O `/review` deixou como está porque a correção muda o fluxo; a alternativa registrada é tentar o `signIn` quando o reenvio receber esse código logo depois de um 201 na mesma tela |
| 🟡 **`create-dev-admin.mjs` não aplica a política de senha** | `apps/api/scripts/create-dev-admin.mjs:36-46` | O script cria administrador com qualquer senha que o Firebase aceite (6 ou mais). Fora da fatia por decisão do plano (P4): o script roda em Node puro e repetir a constante criaria a 12ª cópia. Afeta só quem opera o fork |
| 🟡 **Sem `ARCJET_KEY`, nada limita a criação de contas em massa** | `apps/api/proxy.ts:55` (`/auth/sign-up` na lista) · `docs/PRE-PRODUCTION.md:656-658` · `docs/SECURITY.md:169` (âncoras remedidas em 2026-10-20, depois da PR #52, que deslocou a do `PRE-PRODUCTION.md` de `:606-608`; em 2026-10-19, depois da PR #49, que deslocou as três de `:51`, `:602-604` e `:168`; antes, em 2026-10-04, 2026-10-16 e 2026-10-19, pós-PR #48) | A rota cria a conta pelo Admin SDK, que não passa pelo limite do Firebase de 100 contas por hora por IP. A rota está na lista de rate limit, mas o limite é no-op sem a chave. Está escrito nos dois documentos; o critério 19 do `/test` ficou 🔒 |

### Segurança: seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo** (ampliado em 2026-10-20, PR #53 aberta) | `apps/api/instrumentation.ts:63-67` · o comentário em `:47-57` | **Ampliado, agora medido:** o `/test` da PR #53 subiu `next start` sem `CORS_ORIGIN`. O processo não cai: segue ouvindo na porta e responde `500 Internal Server Error`, em texto e sem `error.code`, a toda requisição, inclusive `/health` e o preflight de `http://localhost:3000`, com `unhandledRejection` e "Failed to prepare server" no log. O comentário promete "a startup crash with a clear message instead of every request failing later", e acontece o contrário. O receio de servir sem allowlist não se confirma, porque nenhuma rota responde: a falha é fechada. A frase "`/health/ready` detecta parte das falhas, não esta" fica em dúvida, porque o `/health` respondeu 500; o `/health/ready` não foi medido. Corrigir pede escolher entre ajustar o comentário e encerrar o processo de fato. Reconferido em 2026-10-03, em `main`: `throw` em `:63-67`, zero `process.exit`. Nenhum 🔴 de código segue aberto nesta seção desde a PR #36 |
| ⚠️ **Dez das treze rotas de `/account` seguem fora do rate limit**, entre elas a troca e a definição de senha (ampliado em 2026-10-04 e em 2026-10-19, pós-PR #48; reduzido em 2026-10-19, pós-PR #51) | `apps/api/proxy.ts:53-67` · `docs/SECURITY.md:160` (era `:159` até a PR #49) | **Reduzido em 2026-10-19, pós-PR #51:** a PR corrigiu o documento, que agora diz "dez das treze", com as três rotas da PR #48; o comportamento não mudou. **Ampliado em 2026-10-19:** a PR #48 criou `/account/password/set`, `/account/sign-in-methods/linked` e `/account/sign-in-methods/[id]`, todas fora da lista, por escolha registrada no plano (nenhuma confere senha nem gasta cota do Identity Toolkit; a prova é um ID token verificado localmente). Naquela rodada o `docs/SECURITY.md:160` ainda dizia "sete das dez". Recontado em 2026-10-04: a PR #39 criou três rotas de sessões (`/account/sessions`, `/account/sessions/[id]`, `/account/sessions/revoke-others`), todas fora; as três só leem e gravam no Firestore, sem provedor externo. Ficam fora também o `PUT /account`, `/account/password`, `/account/sessions/revoke` e `/account/onboarding`. Naquela data o `docs/SECURITY.md` trazia a conta certa; ficou defasado entre a PR #48 e a PR #51. A PR #25 acrescentou `POST /payments/checkout` e `POST /payments/portal`, também fora; cada checkout pode criar uma sessão na Stripe |
| ⚠️ **Superfície não-guardada da API: 15 de 41** arquivos de rota exportam handler nu, 10 deles `/auth/*` (ampliado em 2026-10-16, pós-PR #47, e em 2026-10-19, pós-PR #49) | `apps/api/app/(routes)/auth/**` · `apps/api/app/(routes)/payments/catalog/route.ts` · `apps/api/app/(routes)/contact/route.ts` | **Ampliado em 2026-10-19, pós-PR #49:** 41 arquivos, 26 com guard. A PR #49 acrescentou `POST /contact`, nua de propósito: recebe quem ainda não tem conta, o destino é fixo no servidor, o corpo passa por Zod e a rota está na lista de rate limit. Em 2026-10-19, pós-PR #48: 40 arquivos, 26 com guard; as três rotas novas da PR #48 usam `requireCommonPanelApi`. Em 2026-10-16, pós-PR #47: 37 arquivos, 23 com guard. A PR #47 acrescentou `payments/catalog`, nua de propósito: a landing a lê para quem ainda não tem conta, e ela só devolve o catálogo público. A PR #39 tinha acrescentado `auth/session` (nua: resolve a credencial por conta própria, para que o admin que personifica encerre a sessão dele, e responde `401` com `error.code`) e três rotas de sessões com guard; a PR #38, o guard composto `requirePlanApi`. Os 15 nus: 10 em `/auth/*`, os dois `health`, o webhook de pagamento, o catálogo e o contato. O `docs/SECURITY.md:17-36` diz 41 e 15 desde a PR #49 |
| 🟡 **O endpoint de renovação de sessão está fora do rate limit e aceita requisição sem `Origin`** | `packages/auth/session-routes.ts:123`, `:127` · `packages/auth/session.ts:78-81` | Reconferido em 2026-10-04. A parte documental está fechada (`docs/SECURITY.md:164`, era `:163` até a PR #49); o comportamento segue. Desde a PR #39 a rota também pergunta à API se a sessão foi encerrada noutro aparelho antes de renovar |

### 🟡 Dependências, exports e código morto

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Dependência importada sem ser declarada**: `apps/app/env.ts:1` importa `@repo/email/keys` sem `@repo/email` no `package.json`; `apps/web` importa `@repo/auth` em **8 arquivos** sem declará-lo | `apps/app/package.json` · `apps/web/package.json` | Reconferido, os dois `grep` no `package.json` devolvem 0. Funciona por hoisting; o turbo não invalida `web#*` quando `@repo/auth` muda |
| 🟡 `packages/auth/package.json:13` exporta `./client-ui` para arquivo **inexistente** | `packages/auth/package.json:13` | Reconferido: `client-ui.tsx` não existe. **Vigésima sétima auditoria consecutiva** (2026-10-21, pós-PR #53) |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` do resto | `packages/auth/package.json:24` | Reconferido em 2026-09-27; a âncora subiu uma linha porque a PR #29 tirou o export `./components/sign-up` |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | Reconferido: 0 |
| 🟡 **`input-otp.tsx` é código morto** | `packages/design-system/components/ui/input-otp.tsx` | Reconferido: só ele, o barril, o `package.json` do pacote e o `playground`. `account-security-mfa` (fatia 3, segundo fator) é quem o usaria |
| 🟡 **`import-in-the-middle` e `require-in-the-middle` instalados e nunca importados** | `apps/app/package.json:27,36` | Reconferido: 0 importadores |
| 🟡 **`packages/internationalization` tem dois defeitos de `exports`** | `packages/internationalization/package.json:5-12` | Reconferido em 2026-09-26, depois da PR #28 mexer no arquivo: falta `"./utils/*"`, e `"."` (`:6`) aponta para `index.ts`, que não existe |
| 🟡 **`isRateLimitEnforced()` é export morto** | `packages/security/index.ts:30` | Reconferido em `main` em 2026-10-03: a PR #36 passou a função a ler a chave por chamada (`readArcjetKey()`), e ela segue sem chamador fora dos testes. As 9 referências estão em `__tests__/rateLimit.test.ts` |
| 🟡 **`FormattedError.retryAfterSeconds` sem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:14,23` | Reconferido. O homônimo de outro tipo em `apps/api/proxy.ts:118` (âncora remedida em 2026-09-30, em 2026-10-16, depois da PR #47, e em 2026-10-19, depois da PR #49) segue sem relação |
| 🟡 **`reloadCurrentUser` sem teste próprio** | `packages/auth/client.ts:244` (era `:214` até a PR #48) | Reconferido em 2026-10-19: só testes que a mockam (`useEmailVerification.test.tsx` e, desde a PR #48, `accountSignInMethodsPanel.test.tsx` e `useSignInMethodMutations.test.tsx`, que conferem que ela **não** é chamada). O único chamador de produção segue sendo `useEmailVerification.ts:34` |
| 🟡 **`packages/shared` tem `test` e não tem `typecheck`** | `packages/shared/package.json:11` (só `test`) | Metade fechada pela PR #32: o `@repo/design-system` ganhou a task de `test` (`packages/design-system/package.json:7`, 45 testes). Falta o `typecheck` do `packages/shared`, adiado desde a primeira auditoria. **Medido em 2026-10-14:** `tsc --noEmit` sobre os 21 arquivos do pacote, com um `tsconfig` temporário fora do repositório, dá 0 erros neles e 2 `TS2580` em `packages/internationalization/utils.ts:22-23` (`process` sem `@types/node`, que o pacote não declara). A correção é o script, um `tsconfig.json` e o `@types/node` que os outros workspaces já usam. P. **Ampliado em 2026-10-16, pós-PR #47:** o pacote passou a guardar o formatador de preço (`formatPlanPrice.ts`), que a landing e a aba de cobrança usam; ele continua checado só pelo `typecheck` da `app` e da `web`, que o importam |
| 🟡 **`welcomeEmail` sem chamador de produção** (reduzido em 2026-10-19, pós-PR #49) | `packages/email/templates/welcome.tsx:50` | Reconferido em 2026-10-20, pós-PR #52: `git grep welcomeEmail` fora de testes acha só a definição. A PR #52 criou as boas-vindas como notificação no sino (`user-merge.ts:91-96`), sem o e-mail; mandar ou não o e-mail de boas-vindas segue decisão de produto. **Reduzido:** a outra metade da linha, o formulário de contato de fachada para onde o canal de privacidade caía, fechou com a PR #49; o formulário entrega na caixa de suporte ou diz que o canal está indisponível. A spec `in-app-notifications`, entregue pela PR #52, usou as boas-vindas como produtor de notificação, não de e-mail |
| 🟡 **`useListAuditEvents.test.tsx` deixa trabalho do React pendente depois do teardown** (novo, 2026-09-28) | `apps/app/__tests__/useListAuditEvents.test.tsx:55-70` (um `QueryClient` por teste, sem `clear()` nem `unmount` ao fim) | A suíte da `apps/app` falhou em 2 de 6 execuções locais em 2026-09-28 com `ReferenceError: window is not defined`, que o Vitest atribui a este arquivo: os testes passam e o erro não tratado reprova a task. Na auditoria pós-PR #31 passou nas 6 execuções (688 testes cada) na pós-PR #32 também (6 de 6, 702 testes cada) e na pós-PR #33 também (6 de 6, 756 testes cada), então o acumulado era 2 falhas em 24; com as execuções das rodadas pós-PR #34, #35, #36, #39, #40, #41, #42, #43, #44 (três, 841 testes cada), #45 e #46 (uma cada, 846 testes), #47 (uma, 861 testes), #48 (uma, 914 testes), #49 (uma, 919 testes), #50 (uma, 924 testes), #51 (uma, 924 testes), #52 (uma, 958 testes) e #53 (uma, 968 testes), nenhuma com falha, é 2 em 53. O arquivo não muda desde a PR #18. O CI passou nas execuções de merge das PRs #29 a #53. Correção provável, não testada: limpar o `QueryClient` e desmontar o hook no `afterEach`. Tarefa direta P |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:187` (era `:171` até a PR #50) | Declara `Promise<UserDTO[]>`, devolve o merge com o Auth e descarta linhas em silêncio (`:197`). N+1 do Admin SDK. Décima primeira rodada aberto; âncoras desceram com os métodos de recursos da PR #38 (remedidas em 2026-10-04) |
| 🟡 **`userRepository` tem cinco métodos com semântica própria de "quantos usuários existem"** | `user.repository.ts:171` · `:183` · `:187` · `:206` · `:224` (eram `:155`, `:167`, `:171`, `:190` e `:208` até a PR #50) | `touchLastAccess`, `purgeProfile`, `list`, `summary` e `activitySummary`. O cartão de total pode mostrar mais do que a tabela lista, e nada na tela explica |
| 🟡 **O predicado de posse foi copiado de novo** | `apps/api/(shared)/repositories/entity.repository.ts:23,40,64,72` · `entities/summary/route.ts:9` | Quatro cópias de `where("userId", "==", userId)` no mesmo arquivo. É a contrapartida P de [`teams-organizations`](teams-organizations.md) |
| 🟡 **`skipValidation` incondicional na `apps/web`, e por causa dele o bloqueio de bot da landing nunca roda** (ampliado em 2026-09-30) | `apps/web/env.ts:36` (âncora remedida em 2026-10-16; a PR #46 a deslocou de `:33`) · `apps/web/proxy.ts:67` (`if (!env.ARCJET_KEY) return;`) · `:72` (`secure()`), âncoras remedidas em 2026-10-07 pós-PR #41 | Com `skipValidation: true`, o `createEnv` do `@t3-oss/env-core@0.13.8` devolve só o `runtimeEnv` do próprio módulo e descarta o que veio de `extends` (`if (skip) return runtimeEnv;`, antes do merge). Como o `runtimeEnv` da web não declara `ARCJET_KEY`, `env.ARCJET_KEY` sai sempre `undefined`, mesmo com chave válida, e o `secure()` é pulado. Medido pelo `/test` de `arcjet-key-lazy-validation` com um probe de import: `ajkey_ok` dá `"ajkey_ok"` no `env.ts` da `apps/app` e `undefined` no da `apps/web`. A metade do `NEXT_PUBLIC_APP_URL` fechou com a PR #25, e a do `NEXT_PUBLIC_DOCS_URL`, com a PR #46, as duas declarando a variável no próprio `env.ts`. **§5.1:** o `skipValidation` já tinha voltado intacto em várias rodadas como "recomendação"; ele fica aqui como dívida técnica com `arquivo:linha`, e a parte que exige julgamento (ligar o bloqueio de bot) sai como a pergunta D8 e não é reapresentada depois. Tirar o `skipValidation` sem decidir a D8 liga o bloqueio por tabela, então as duas coisas andam juntas. P, depois da D8 |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta** | `apps/app/proxy.ts:230,234` (era `:214,218` até a PR #47) · `apps/web/proxy.ts:111,115` | Reconferido em 2026-10-07, pós-PR #41: `cookieStore.set` sem `maxAge` nas duas apps. A PR #41 manteve a gravação do cookie, que agora só serve à rota sem idioma na URL |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem `Secure`** por padrão | `packages/shared/utils/helpers/cookies.ts:28,30` | Reconferido. ASVS 5.0 L1 (3.3.1). Décima rodada aberto |
| ⚪ **`cors.ts` allow-lista `x-locale`, que só existe como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Reconferido. `x-role` (`:16`) **não** é resíduo |
| 🟡 **O papel do painel viaja em dois headers** | `packages/sdk/src/client/base.ts:45,53,61,95` | Reconferido nas quatro âncoras |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O deep link das abas da conta não acompanha a navegação** | `AccountTabs.tsx:51-53` (estado lido uma vez) · `:55-62` (`history.replaceState`) | Reconferido. A barra lateral muda a URL e a aba fica onde estava. Estacionado (E9) |
| 🟡 **A mensagem de erro padrão está cravada em pt-br num pacote** | `packages/shared/utils/helpers/handleClientError.ts:19` | Reconferido, literal |
| 🟡 **`signInSchema.ts` da `apps/web` crava as mensagens em pt-br** | `apps/web/app/[locale]/sign-in/validations/signInSchema.ts:5`, `:10` | Remedido em 2026-09-26: a PR #29 trocou o número pela constante `EXISTING_PASSWORD_MIN_LENGTH`, mas `"Email inválido"` (`:5`) e `"A senha deve ter pelo menos 6 caracteres"` (`:10`) seguem literais. O cadastro da web foi traduzido na mesma PR; o login não. **Corrigido no working tree, aguardando merge** (`leftover-ui-strings`, 2026-10-21): `buildSignInSchema(dictionary)` em `signInSchema.ts:7-16`, medido nos três idiomas pelo `/test` |
| 🟡 **O filtro por usuário da trilha não alcança evento de usuário excluído** | `admin/(pages)/audit/(components)/AuditFilters.tsx:40` | Reconferido. A exclusão de conta apaga o perfil e anonimiza os rótulos, então esses eventos ficam sem entrada no `select` |
| 🟡 **`resolveUserAuditLabel` engole a falha sem log** | `apps/api/(shared)/lib/audit-label.ts:14-16` | Reconferido |
| 🟡 **`images.domains` deprecado com `www.google.com` sem uso** | `apps/app/next.config.ts:19` | Reconferido, literal |
| 🟡 **`setTimeout` sem cleanup no carrossel da landing** | `apps/web/app/[locale]/(home)/components/cases-client.tsx:29` | Reconferido: nenhum `clearTimeout` |
| 🟡 **`useHealthCheck` não exporta a função imperativa** | `apps/app/shared/hooks/useHealthCheck.ts:19` | Reconferido: um único `export` |
| 🟡 **`provider-error` não distingue as falhas do provedor de e-mail** | `packages/email/index.ts:122-132` (era `:121-131` até a PR #49) | Reconferido em 2026-09-28. Descartar o objeto de erro é deliberado |
| 🟡 **O rodapé da `apps/web` depende de `data-cookie-banner` sem teste** | `apps/web/app/[locale]/components/footer.tsx:56` | Reconferido |
| 🟡 **`turbo run` aborta na primeira falha no CI** | `.github/workflows/ci.yml:53` | Reconferido em 2026-09-29, sem `--continue`; a linha agora roda também `test:emulator` |

### 🆕 Achados do inventário da descoberta (2026-09-26)

Vistos pelos quatro inventários paralelos desta rodada. Nenhum vira spec.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **A `apps/web` não tem `not-found` nem `error`, e o `global-error` é inerte** (reescrito em 2026-10-21) | `apps/web/app/[locale]/global-error.tsx:1-32` · `apps/web/app/` (sem `layout.tsx`, `not-found.tsx`, `error.tsx` nem `global-error.tsx`) · `next/dist/lib/bundler.js:73-76` (Turbopack por padrão no Next 16.0.0) · `docs/features/web-global-error/analyze/plan.md` §1.2 | Rota inexistente na landing cai no 404 padrão do Next, sem tradução nem marca. **Medido no build de produção.** O plano de `leftover-ui-strings` (§1.4) concluiu pela leitura do `next-app-loader` do webpack, mas o Next 16.0.0 builda com Turbopack e esse loader não roda. O `/analyze` de `web-global-error` mediu no `.next` de `pnpm --filter web build`: o arquivo de `[locale]` entra no bundle só como chave do segmento, e o `GlobalError` da entrada é o embutido (`E=a.i(41224)`); com o arquivo em `app/global-error.tsx`, o build passa, gera `/_global-error` sem exigir `app/layout.tsx`, e o `GlobalError` passa a ser o da web (`E=a.i(66039)`). O arquivo em `[locale]` nunca é renderizado, e a landing mostra o `builtin/global-error.js:52-58`, em inglês, sem `lang` e sem botão de tentar de novo. Não medido em navegador. A parte do `global-error` não precisa de root layout e é a tarefa recomendada, em andamento como `web-global-error` ([A próxima](#a-próxima-tarefa-direta-na-tela-de-erro-global-da-landing)); `not-found` e `error` seguem M. A `apps/app` tem `not-found.tsx` e `global-error.tsx` na raiz, mas nenhum `error.tsx` de segmento |
| 🟡 **O `package.json` da raiz ainda é o do next-forge** | `package.json:2-5` · `:42` | Reconferido em 2026-09-28: a PR #30 não tocou no arquivo; o `FORKING.md` ("Resíduos do projeto de origem") descreve a limpeza que cada fork faz à mão. `"name": "next-forge"` e um `bin` para `dist/index.js`, gerado de `scripts/index.ts`, que não existe. `engines.node` diz `>=18` e o `.nvmrc`, `22.12.0`. Todo fork herda os três |
| 🟢 **Link do `FORKING.md` para o CRUD de referência está morto** (novo, 2026-09-28; medido em 2026-09-30) | `docs/FORKING.md:447` (era `:437`; deslocada pelas PRs #47 e #48) · `README.md:306` | O link usa `#crud-de-referência`; o título é `### 🧬 CRUD de referência`. Medido no README renderizado pelo GitHub (`gh api repos/:owner/:repo/readme` com `Accept: application/vnd.github.html`): o id publicado é `user-content--crud-de-referência`, e o próprio título aponta para `#-crud-de-referência`. Correção: trocar a âncora ou tirar o emoji do título |

### 🆕 Achados do `/test` de `brand-config` (2026-09-27)

Medidos pelo `analista-qa` com o nome padrão da marca, em `build && start`, e reconferidos no código em 2026-09-28. A inicial do avatar abaixo do AA fechou com a PR #32. Nenhum bloqueia a entrega; o detalhe e o repro estão em [`docs/features/brand-config/test/report.md`](../docs/features/brand-config/test/report.md).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O `/favicon.ico` da `apps/web` devolve o HTML da home** | `apps/web/app/` (sem ícone na raiz) · `apps/web/proxy.ts:61` (matcher, âncora remedida em 2026-10-07 pós-PR #41) | Resposta 200 com `text/html`; o `/icon.png` responde 307 para `/pt-br/icon.png`. Já existia antes da entrega. **Descrição corrigida em 2026-09-28:** o matcher do proxy já exclui `favicon.ico` (`:61`), então o pedido não passa pelo proxy e cai no segmento `[locale]` com `favicon.ico` no lugar do idioma. Correção provável, não testada: servir o arquivo na raiz de `apps/web/app/`, que hoje não tem root layout |
| 🟢 **Nome de marca com 30 caracteres quebra em duas linhas na barra lateral** | `apps/app/shared/components/ui/Sidebar.tsx` | O critério de 30 caracteres da spec só valia para o header da web. Decidir truncar ou aceitar a quebra |

O atraso de idioma numa navegação (cookie `x-locale` lido no servidor) era o mesmo achado do `getDictionary()` do servidor, fechado pela PR #41.

### 🆕 Achados da rodada de `storage-emulator-rules-tests` (2026-09-28)

Vindos do plano e do `/test` da spec, entregue pela PR #31. Eram dois; o `alt` do avatar do menu de perfil
fechou com a PR #32 e está na lista de fechados. O outro segue aberto.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Nada impede um `*_EMULATOR_HOST` em produção** | `packages/auth/emulator.ts:27-32`, `:44` · `apps/app/env.ts:27` · `apps/app/shared/lib/storageEnabled.ts:6` | Nenhuma checagem de boot recusa um host de emulador configurado por engano, e isso vale também para o `FIREBASE_STORAGE_EMULATOR_HOST` e o `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST` novos. Se só a variante `NEXT_PUBLIC_` for copiada para a Vercel, o app mostra o seletor de arquivo e põe `http://<host>` no `img-src` da CSP; o upload falha com `error.code` e nada vaza. É o risco R-5 do plano da spec, deixado fora do corte |

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

Vindos do §12.2 do plano, do handoff, do `/review` e do `/test` da spec, entregue pela PR #32 e arquivada em
2026-09-29. Todos são anteriores ao diff ou ficaram fora do corte por decisão registrada; nenhum bloqueou a entrega.
Reconferidos no código em 2026-09-29. Os dois do `ActionsMenu` (Enter em "Excluir" e o gatilho sem
`aria-haspopup`) fecharam com a PR #40; a lista de fechados daquela rodada está na versão deste arquivo em `0a49a3b`.
O dos seed tokens do antd fechou com a PR #42. O grupo de rádio sem nome, o menu mobile da web sem nome, o `Button` que
encolhia, o `disabled` antes do spread, o `placeholder` ignorado e o rótulo da data da `/contact` fecharam com a PR #45
e estão na lista de fechados daquela rodada.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`--destructive` do claro abaixo de 4,5:1 sobre `--accent` e `--muted`** | `packages/design-system/styles/globals.css:24` | 4,38:1 no "Excluir" com foco de teclado (fundo `--accent`, medido pelo `/test`) e 4,37:1 como texto de erro dentro de card `muted` (calculado no plano). Não aparece nas rotas que a suíte cobre. **Remedido pelo `/test` da PR #42** (O1): no foco por seta, o item "Excluir" fica `#e7000b` sobre `#f5f5f5`, 4,38:1, igual no código anterior; a PR #42 não mudou o `--destructive` |
| 🟡 **Os tokens `Menu.dangerItem*` não alcançam o `Dropdown`** | `packages/design-system/providers/antd-app.tsx:97-101` (âncora remedida em 2026-10-13, pós-PR #43; era `:91-95` e, antes da PR #42, `:66-70`) | Configuração que não tem efeito onde o `danger` aparece no repo. Reconferido depois da PR #43: o item `danger` é pintado pelo `colorError` global, em hex (`:136`), e os testes esperam esse hex (`actionMenu.test.tsx:101-104`), não os tokens do `Menu`. A PR #42 não os resolveu, como a recomendação previa |
| 🟡 **`<title>` igual em todas as páginas de cada área do painel** | `(common)/layout.tsx:24-31` (era `:23-30` até a PR #52) · `(admin)/admin/layout.tsx:22-29` | Satisfaz o axe, mas o WCAG 2.4.2 pede título que descreva a página. Os rótulos por rota já existem em `common/routes` e `admin/routes`. Quatro das onze páginas são `"use client"` e precisariam de `layout.tsx` de segmento |
| 🟡 **A página 404 da `apps/app` sai com `document.title` vazio** | `apps/app/app/not-found.tsx:3-5` | Fica fora dos layouts do painel, que são os que ganharam `generateMetadata` |
| 🟡 **A dica do `TextareaInput` não entra no `aria-describedby`** | `packages/design-system/components/ui/textarea-input.tsx:42-43` | O `<p>` do `hint` não tem id |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-09-29 | motivo |
|--------|---------------------|--------|
| `Select` mobile do navbar sem asserção de nome | **fechada** pelo `/test` | cenário novo em `panelNavbarControls.test.tsx` |
| `generateMetadata` dos layouts sem teste | **fechada** pelo `/test` | `panelLayoutTitle.test.ts`, 8 casos |
| `NotFoundPage` sem teste de componente | **fechada** pelo `/test` | `notFoundPageHomeLink.test.tsx` |
| Cor dos filhos do item `danger` sem teste | **fechada** pelo `/review` | caso novo em `actionMenu.test.tsx:107` (âncora remedida em 2026-10-07, pós-PR #42; era `:95` antes da PR #40 e `:103` antes da PR #42), que duas mutações derrubam |
| Links da web (hero, CTA, FAQ, preços) sem teste de componente | **continua aberta**, risco baixo | a regra `nested-interactive` do axe na suíte E2E barra a regressão nas rotas cobertas |
| Botão de checkout em carregamento | **fora de escopo** | exige chave de teste da Stripe (pendência 23) |
| Campo com erro lido por leitor de tela de verdade | **continua aberto** | o `/test` conferiu atributos na árvore de acessibilidade; nenhum NVDA ou VoiceOver rodou. Não cabe em rodada autônoma |
| Hidratação do contato em `next build && next start` | **fechada** pela PR #45 | o `/test` de `date-input-navigation` mediu zero erros em build, com fusos diferentes no servidor e no navegador |

### 🆕 Achados da entrega `account-email-change` (2026-09-30)

Vindos do `/review`, do handoff e do `/test` da spec, entregue pela PR #33 e arquivada em 2026-09-30. Nenhum
bloqueou a entrega. Reconferidos no código em 2026-09-30. O do foco do diálogo de exclusão de conta fechou com a PR
#43 e está na lista de fechados daquela rodada.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Os dois diálogos da aba de conta repetem o mesmo tratamento de foco** (ampliado em 2026-10-13; **reduzido em 2026-10-19**, pós-PR #48) | `AccountPrivacyPanel.tsx:62-63`, `:69-71` · `AccountEmailChangeDialog.tsx:69-70`, `:91-92` | Era "`lacksPasswordProvider` duplica `requiresPrivacyChannel`". **Reduzido pela PR #48:** a checagem de provedor `password` virou uma função só (`apps/app/shared/lib/signInMethods.ts:22-23`), usada pela privacidade, pelo perfil e pela segurança. Segue duplicado o que a PR #43 acrescentou: o comentário do `onOpenAutoFocus`, palavra por palavra (`AccountPrivacyPanel.tsx:62-63`, `AccountEmailChangeDialog.tsx:69-70`), e o `onError` que devolve o foco à senha, com nome num arquivo (`focusPasswordAfterRefusal`, `AccountPrivacyPanel.tsx:69-71`) e inline no outro (`AccountEmailChangeDialog.tsx:91-92`). Se um terceiro diálogo puser o `Footer` dentro de um `AlertDialogContent`, a `cycle-policy` §3 manda corrigir no componente compartilhado |
| 🟢 **A confirmação da troca mostra o mesmo cartão de erro para qualquer código** | `apps/app/app/[locale]/(unauthenticated)/verify-email/components/ConfirmEmailChangeResult.tsx:53-62` | Um `429 AUTH_RATE_LIMITED` diz que o link pode ter expirado, embora o código não tenha sido gasto e recarregar resolva. Espelha o `VerifyEmailResult` por decisão do plano (§5.2) |
| 🟢 **O aviso ao endereço antigo sugere que trocar a senha resolve** | `packages/internationalization/translations/packages/email/index.ts:58`, `:126`, `:193` | "Troque sua senha agora e fale com o suporte": trocar a senha não invalida um link já emitido; quem reverte é o suporte. A frase não mente, mas a ordem engana. Decisão de copy |
| 🟢 **Endereço que o Zod aceita e o Admin SDK recusa vira 500** | `apps/api/(shared)/lib/auth-action-links.ts:122-129` · `account/email/route.ts:127-137` | Se `getUserByEmail` responder `auth/invalid-email`, o erro sobe e a rota devolve `500 ACCOUNT_UPDATE_FAILED`, com `error.code` e sem stack. Raro, não vaza nada |
| 🟢 **Código de troca aplicado direto no Identity Toolkit pula a revogação e a trilha** | `auth/email-change/confirm/route.ts:79`, `:91-101` · `docs/SECURITY.md:13` (era `:12` até a PR #48) | Quem tem o link e a chave web pública aplica o código sem passar pela rota. O e-mail muda, as sessões antigas não caem pela revogação explícita e o evento não é gravado. Declarado no documento; fora do corte |

**Ampliado e depois fechado:** o achado do `getDictionary()` do servidor lendo o cookie ganhou a medição do
`/test` da PR #33 (na `apps/app`, o `<html lang>` ficava uma navegação atrasado ao trocar de idioma pela URL) e
fechou com a PR #41 (ver a lista de fechados).

**Lacunas de teste herdadas da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-09-30 | motivo |
|--------|---------------------|--------|
| Retorno do foco ao fechar o diálogo sem teste | **fechada** pelo `/test` | 3 casos em `accountEmailChangeDialog.test.tsx`; a mutação sem `onCloseAutoFocus` derruba os 3 |
| Foco ao abrir o diálogo sem teste | **fechada** pelo `/review` na rodada 2 | caso novo no mesmo arquivo; a mutação sem `onOpenAutoFocus` derruba 4 |
| Rota de verificação aceitando código de troca | **fechada** pelo `/review` | 5 casos em `authEmailVerification.test.ts`, conferido no navegador pelo `/test` |
| Confirmação contra o emulador de Auth sem teste automatizado | **continua aberta**, fora do corte; **ampliada em 2026-10-19** | o `test:emulator` sobe Firestore e Storage, não o Auth (decisão D13 do plano); o `/test` mediu à mão. A PR #48 repetiu o caso, e virou achado em [Achados da PR #48](#-achados-da-pr-48-2026-10-19) |
| Comportamento do Firebase de produção (conferir sem gastar, link pendente que perde a validade, gerador que recusa endereço em uso) | **fora de escopo** | exige projeto real; declarado no `PRE-PRODUCTION.md` §3 |
| Entrega real dos dois e-mails | **fora de escopo**, 🔒 | pendência 13 |

### 🆕 Achados da entrega `compliance-docs-kit` (2026-09-30)

Vindos do plano, do `/review` e do `/test` da spec, entregue pela PR #34 e arquivada em 2026-09-30. O 🔴 da conta
desativada fechou com a PR #35 e está na lista de fechados.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **A `review-checklist.md` não cobra atualizar `SUBPROCESSORS.md` e `ROPA.md` quando entra integração nova** | `docs/review-checklist.md:37-58` (§0, transversal, sem item sobre provedor novo) · `docs/SUBPROCESSORS.md` · `docs/ROPA.md` (em `main` desde a PR #34) | A lista de subprocessadores e o registro de operações descrevem as integrações que o código tem hoje. Sem um item no checklist, o primeiro provedor novo entra no código e fica fora dos dois documentos. Apareceu no plano (`analyze/plan.md:751`) e no `/review` (`review/review.md:129`) da entrega; pela §5.1 da `cycle-policy` vira achado em vez de voltar ao relatório. Correção de documento, P. O pré-requisito (os dois arquivos em `main`) caiu com a PR #34; reconferido em 2026-09-30, `grep` por `SUBPROCESSORS` e `ROPA` na `review-checklist.md`: 0 |
| 🟡 **`ROPA.md` e `SUBPROCESSORS.md` não citam o campo `entitlements` do perfil** (novo, 2026-10-04) | `docs/ROPA.md:83` (operação de cobrança) · `docs/SUBPROCESSORS.md:33` (linha do Firestore) · `packages/sdk/src/types/user/user.ts:67-68` | A PR #38 passou a gravar no perfil a lista de recursos que a pessoa paga, vinda da Stripe pelo webhook. A exportação de dados já inclui o campo (`AccountDataExportDTO` herda o `AccountDTO`), mas os dois inventários listam o perfil sem ele. É o primeiro caso concreto do achado acima: dado novo entrou e os documentos não acompanharam. Correção de texto, P |

### 🆕 Lacunas da tarefa `disabled-account-revocation` (2026-09-30)

O achado desta tarefa (o admin que se desativava, ampliado para arquivar e rebaixar) fechou com a PR #37 e está
na lista de fechados.

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-09-30 | motivo |
|--------|---------------------|--------|
| `resolveApiActor` sem teste ponta a ponta com conta desativada | **fechada por medição**, sem teste persistente | o `/test` rodou a cadeia sem mock contra o projeto de desenvolvimento; `resolve-api-actor.ts` segue sem arquivo de teste próprio |
| `revokeUserSessions` lançando dentro do `PUT` | **fora de escopo** | a função engole a falha (`server.ts:326-328`) e a rota nunca vê o erro; o `catch` sem teste é anterior à tarefa |
| Pessoa desativada com o app aberto cai no sign-in com a mensagem certa, nos 3 idiomas | **continua aberta**, 🔒 | sem passada de navegador, por custo: o diff não toca UI e o 401 é o mesmo que a revogação de sessão já produzia |
| Admin desativado como alvo (critério 1 medido só com conta comum) | **continua aberta**, risco baixo | mesmo caminho de código; o `/test` não desativou a conta de QA de admin, que é compartilhada entre rodadas. Desde a PR #37 o admin não desativa a si mesmo, mas desativa outro admin |

### 🆕 Achados da tarefa `arcjet-key-lazy-validation` (2026-10-03)

Vindos do `/review` da tarefa, entregue pela PR #36, e reconferidos no `e791d3a`. Nenhum bloqueou a entrega.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **A regra "aparar e tratar vazio como ausente" existe em duas cópias** | `packages/security/keys.ts:35-41` (o `preprocess` do schema estrito) · `:8-17` (`trimmedString` e `arcjetKeyState`) | O schema do build e o leitor de runtime decidem cada um, por conta própria, o que é chave válida. Se uma cópia mudar, o build de `app`/`web` e a API passam a discordar. O `/review` não aplicou porque o schema estrito ficou fora do escopo por decisão do plano. P |
| 🟢 **Os `.env.example` de `app` e `web` não avisam que uma chave sem `ajkey_` derruba o build** | `apps/app/.env.example:29-30` · `apps/web/.env.example:8-9` | O comentário diz só que, sem a chave, o pacote vira no-op. O `.env.example` da `apps/api` foi atualizado pela PR #36; os outros dois ficaram fora do diff. Quem cola a chave errada descobre no deploy, que falha em "Collecting page data". Correção de texto, P |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-03 | motivo |
|--------|---------------------|--------|
| O proxy da API com o `@repo/security` real e a chave malformada | **fechada** pelo `/test` | `apps/api/__tests__/proxyArcjetKey.test.ts:70-82` (era `:60-72` até a PR #47); a mutação com o `index.ts` antigo derruba o caso |
| O build de `app`/`web` falhando com a chave errada, sem teste automatizado | **fora de escopo** | o build não roda no CI; `keys.test.ts` protege a causa (o schema estrito), e o `/test` mediu o build à mão |
| Chave válida contra a Arcjet real | **continua aberta**, 🔒 | exige credencial e IP de cliente; somada à pendência 24 |

### 🆕 Achados das PRs #37 a #39 (2026-10-04)

Vindos dos `/review` e `/test` das três entregas e da medição desta rodada, conferidos no código em `d92d21b`.
Nenhum bloqueou uma entrega.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Dois admins que desativam um ao outro ao mesmo tempo ficam os dois desativados** | `apps/api/app/(routes)/users/[id]/route.ts:133-135` (era `:131-133` até a PR #50; a recusa só compara alvo e ator) | Os dois pedidos passam pelo `requireAdminApi` antes de qualquer gravação. Num fork com dois admins, o painel pode ficar sem admin ativo. Fechar exige transação ou contagem de admins ativos. Registrado pelo `/review` da PR #37, que reescreveu `docs/SECURITY.md:36` (era `:35` até a PR #49) para não prometer o contrário |
| 🟢 **O `aria-describedby` dos `HookForm*` sem descrição aponta para um id que não existe** | `packages/design-system/components/ui/form.tsx:115-119` (o `FormControl` sempre põe o id da descrição) · `hookformSwitch.tsx` e `hookformSelect.tsx`, os dois únicos com prop `description` | Todo campo de formulário do repo sem `FormDescription` publica uma referência órfã, e quem acrescentar uma descrição precisa saber que ela só liga se renderizar o `FormDescription`. Medido pelo `/test` da PR #37 no select de tipo e corrigido só ali. Parente do achado da dica do `TextareaInput`, não o mesmo. P no design system |
| 🟢 **Aparelho encerrado com a tela aberta não sai sozinho** | o `401` da API vira só toast na `apps/app`; o aviso de sessão encerrada do `AuthProvider` (`packages/auth/provider.tsx`) só dispara na troca de token ou ao recarregar | As chamadas respondem `401 AUTH_INVALID_TOKEN` e a tela mostra "Sessão inválida ou expirada." com o id da requisição, mas a pessoa segue no painel até recarregar. Medido pelo `/test` da PR #39. Sugestão registrada lá: tratar o `401` da API como sinal para conferir a sessão |
| 🟢 **O expurgo apaga as sessões antes da conta no Firebase** | `apps/api/(shared)/lib/account-erasure.ts:126-137` (era `:123-129` até a PR #52, que pôs o passo `notifications` entre as sessões e o perfil) | Uma requisição com credencial ainda válida que chegue entre os dois passos recria o documento da sessão pelo `trackSession`, e ele sobra depois da exclusão. O documento não tem nome nem e-mail, mas é dado pessoal residual. Inverter a ordem fecha a janela e muda o relatório de exclusão e o `accountErasure.test.ts`. Do `/review` da PR #39 |
| 🟢 **`listByUid` lê todos os documentos de sessão da conta, sem limite** | `apps/api/(shared)/repositories/session.repository.ts:66-79` · `session-tracker.ts:43-54` | A coleção guarda um documento por login e não apaga os encerrados, de propósito (o `PRE-PRODUCTION.md` proíbe TTL nela). A lista e a checagem de "encerrar as outras" leem tudo a cada sessão nova. Para conta com muitos logins, cresce sem teto; hoje não pesa. Do `/review` da PR #39 |
| 🟢 **O link do plano de `plan-entitlements` para a spec morreu com o arquivamento** (ampliado em 2026-10-16, pós-PR #47, em 2026-10-19, pós-PR #48 e pós-PR #49, e em 2026-10-20, pós-PR #52) | `docs/features/plan-entitlements/analyze/plan.md:3` · `docs/features/pricing-page-catalog/analyze/plan.md:3` · `docs/features/linked-sign-in-methods/analyze/plan.md:3` · `docs/features/contact-support-channel/analyze/plan.md:3` · `docs/features/in-app-notifications/analyze/plan.md:3` e `review/review.md:6` | Os seis apontam para `../../../../specs/<id>.md`, e as cinco specs foram movidas para `../spec.md` (a de `in-app-notifications`, nesta rodada, com dois links: o do plano e o do relatório de revisão). A auditoria só escreve em `docs/features/` para arquivar spec e não corrige o plano. Os planos de `account-active-sessions` e `account-security-mfa` têm o mesmo link e vão quebrar quando a spec deles for arquivada. Correção de uma linha por plano, ou um passo novo na `spec-audit` §4.1 |
| 🟢 **Âncoras de documento deslocadas pelas PRs #37 a #39** (reduzido em 2026-10-07: a PR #41 corrigiu a do `PRE-PRODUCTION.md:414`; ampliado em 2026-10-14 com a do `RESEARCH-tanstack-vs-next.md:40`; em 2026-10-16, a PR #46 corrigiu as contagens do `SECURITY.md` e deslocou as do `skipValidation`, e esta auditoria mediu mais duas antigas; ampliado em 2026-10-19: a PR #48 acrescentou três ações ao enum de auditoria, e as âncoras do `INCIDENT-RESPONSE.md` e do `BACKUP.md` passaram a `audit.ts:2-16` e `:34-36`; reduzido em 2026-10-19, pós-PR #49: a frase do `ROPA.md` com as âncoras da web saiu, e a PR corrigiu as seis âncoras que ela mesma deslocou; reduzido em 2026-10-21, pós-PR #53: a PR corrigiu a âncora interna do `PRE-PRODUCTION.md:552` para `account-erasure.ts:99` e as duas do `SUBPROCESSORS.md:35`) | `docs/SUBPROCESSORS.md:33` (`user.repository.ts:42`; o `super` está em `:46`) · `docs/ROPA.md:69`, `:83` · `docs/INCIDENT-RESPONSE.md:64` (era `:63` até a PR #50) · `docs/BACKUP.md:88` · `docs/SUBPROCESSORS.md:40` (`apps/web/env.ts:33` e `apps/web/proxy.ts:68`; a do `docs/ROPA.md:108` saiu com a frase, na PR #49) · `docs/AUTH-SSO.md:105` · `docs/RESEARCH-tanstack-vs-next.md:85` · `docs/RESEARCH-tanstack-vs-next.md:40` (`LanguageSwitcher.tsx:3`, hoje `:1`) | Valores corretos em [Contradições](#contradições-doc--código-medidas-nesta-rodada). Metade veio do paralelo: as PRs #38 e #39 partiram do mesmo `e791d3a`, e cada uma editou documentos sem ver o deslocamento que a outra causava no código. Correção de texto, P |

**Lacunas de teste e 🔒 herdados das entregas, com veredito desta auditoria:**

| lacuna | veredito 2026-10-04 | motivo |
|--------|---------------------|--------|
| `PlanGate`: skeleton em light, dark e 375 px | **continua aberta** | não remedido na segunda rodada do `/test` de `plan-entitlements`; o componente é o `FormSkeleton` já usado em outras telas |
| Evento real de recursos da Stripe e paginação de `listActiveEntitlementKeys` | **fora de escopo**, 🔒 | exige conta Stripe (pendência 23) |
| `useAccountSessionMutations` com o axios real no caminho de erro (404 e 409 pela UI) | **continua aberta** | o sucesso passou pelo navegador; o erro só no teste com `apiClient` mockado |
| Repositório de sessões contra Firestore real | **fechada por medição**, sem teste permanente | o `/test` da PR #39 conferiu lista, leitura, revogação com `merge` e exportação contra o emulador |
| Latência da leitura de sessão em produção | **continua aberta**, 🔒 | medida só no emulador; somada à pendência 27 |
| Leitor de tela na recusa do próprio admin | **continua aberta**, 🔒 | o `/test` da PR #37 mediu atributos e Tab, sem leitor de tela |

### 🆕 Achados da PR #40 (2026-10-07)

Vindos do plano (§13.3) e do `/test` (§6, O1 a O4) da tarefa `action-menu-keyboard-delete`, conferidos no código e
nas bibliotecas instaladas em 2026-10-07. Todos são anteriores ao diff ou ficaram fora do corte por decisão do plano;
nenhum bloqueou a entrega. O O1 ampliou o achado dos seed tokens do antd e o O4, o do `getDictionary()` do
servidor, nas linhas deles.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Espaço não ativa item do menu de ações**, só Enter | `rc-menu` 9.16.1, `es/MenuItem.js:139` (só `KeyCode.ENTER`) · `packages/design-system/components/ui/action-menu.tsx:98-145` | Vale para "Editar", "Excluir" e os itens customizados. Quem usa Espaço para ativar o item fica sem resposta. É da biblioteca. O plano deixou como achado (§11, pergunta 4): corrigir só no "Excluir" deixaria o menu inconsistente, e corrigir em todos os itens é outra tarefa, P no design system |
| 🟢 **A confirmação de exclusão sai com `role="tooltip"` e não prende o foco** | `rc-tooltip` 6.4.0, `es/Popup.js:17` · `action-menu.tsx:71-96` | O leitor de tela anuncia uma dica, não um diálogo de confirmação destrutiva, e Tab sai do painel. O padrão para esse caso seria `alertdialog` com foco preso, o que exige trocar o `Popconfirm` por outro componente (decisão D3 do plano) |
| 🟢 **Depois de excluir, a linha some e o foco cai no `body`** | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/` (lista de entidades) · `Table` do `@repo/design-system` | O "Sim" devolve o foco ao gatilho, mas a mutação tira a linha da tabela, e o gatilho some com ela. Quem navega por teclado recomeça do topo da página. O plano atribuiu à `Table`, não ao menu |
| 🟢 **Ao reabrir o menu, o foco cai no último item ativo** | `rc-menu` (guarda o `activeKey`) · `action-menu.tsx:98-99` (`autoFocus`) | Medido pelo `/test` da PR #40 nos ciclos 2 e 3 de cada combinação (O2). Como "Excluir" agora responde ao teclado, ele vira o primeiro item focado na reabertura; a confirmação ainda protege |
| 🟢 **Item de menu que não navega deixa o foco no `body`** | `rc-dropdown`, no fechamento do menu · `action-menu.tsx:117-124` (itens customizados) | Medido pelo `/test` da PR #40 no "Approve" do `playground`, pelo teclado e pelo mouse (O3), num caminho que o diff não tocou. Não medido em `main` antes da PR. Afeta todo fork que acrescentar item que só dispara ação |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-07 | motivo |
|--------|---------------------|--------|
| Clique fora e clique no "⋮" com a confirmação aberta | **fechada** pelo `/test` | dois casos jsdom (`actionMenu.test.tsx:384`, `:404`; âncoras remedidas pós-PR #42) e medição no navegador |
| `aria-expanded` voltando a `false` pelo Esc | **fechada** pelo `/test` | `actionMenu.test.tsx:419` e medição no navegador |
| `aria-expanded` voltando a `false` por clique fora com o menu aberto | **continua aberta** | sem teste; o caminho é do `rc-dropdown` e não mudou |
| Itens customizados não abrem a confirmação | **fechada** pelo `/test` | `actionMenu.test.tsx:349` e o `playground` |
| `onDelete` com promise mantém o "Sim" carregando | **fechada** pelo `/test` | `actionMenu.test.tsx:304`; a mutação sem o `return` derruba o caso |
| Anúncio do menu e da confirmação por leitor de tela | **fora de escopo** | não há instrumento no repo; o `/test` leu os atributos |

### 🆕 Achados da PR #41 (2026-10-07)

Vindos do `/review` ("Achados para o backlog") e do `/test` (O1 e O3) da tarefa `server-locale-from-url`,
conferidos no código em `0a49a3b`. Todos existiam antes do diff; nenhum bloqueou a entrega. O O2 do `/test` (o
`<html lang>` parado na troca suave de idioma) foi corrigido dentro da própria PR e está na lista de fechados.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Arquivo inexistente de um segmento na app manda o anônimo para o login em vez do 404** (O1) | `apps/app/proxy.ts:210-212` (o caminho com extensão passa pelo proxy sem checar o idioma; era `:197-199` até a PR #47) · `apps/app/lib/server/authSession.ts:37` (`requireSession` redireciona para `/<segmento>/sign-in` com o segmento que veio na URL) · `apps/app/app/[locale]/` (sem `layout.tsx` que valide o segmento) | `/favicon-novo.png` responde 307 para `/favicon-novo.png/sign-in` e, depois de três redirecionamentos, cai em `/pt-br/sign-in?redirect=...` (medido pelo `/test` da PR #41 em build). O comentário de `isStaticAssetPath` (`apps/app/proxy.ts:127-133`) diz que esse ramo existe para não mandar visitante ao login. Com dois segmentos (`/x/y/nao-existe.txt`) o 404 sai certo. Correção provável, não testada: `notFound()` quando o segmento `[locale]` não está em `locales`. P |
| 🟢 **Redirecionamento sem fim com `NEXT_PUBLIC_DEFAULT_LOCALE` fora da lista** | `apps/app/proxy.ts:216`, `:226-229` (eram `:203` e `:213` até a PR #47) · `apps/web/proxy.ts:99`, `:110` · `packages/internationalization/utils.ts:21-24` (`getDefaultLocale()` não valida) · `packages/next-config/keys.ts:27` (`z.string().optional()`) | Com `NEXT_PUBLIC_DEFAULT_LOCALE=pt-BR`, `/` vai para `/pt-BR/`, que não é idioma válido, e o proxy redireciona de novo sem fim. Erro de configuração do fork, não de quem usa o produto. O `getDictionary()` já cai em `pt-br` nesse caso (`resolveLocale`, `utils.ts:27-38`), então só o proxy fica preso. Correção provável: os proxies usarem `resolveLocale(getDefaultLocale())`, ou o schema da env aceitar só os três valores. P |
| 🟢 **`getDictionary` e `getTranslations` ficam expostas como Server Actions** (O3) | `packages/internationalization/server.ts:1` (`"use server"`) | O build registra as duas no manifesto de Server Actions, e qualquer `POST` com o id certo recebe o dicionário inteiro (o `/test` usou isso para medir o critério 3). O conteúdo é o texto público da UI, então o risco é baixo. Trocar a diretiva por `import "server-only"` muda o contrato do módulo e pede conferir os chamadores client. P |
| 🟢 **O `next start` da web registra `Cannot assign to read only property 'redirects'`** | `apps/web/next.config.ts:15` (provável: `nextConfig.redirects = redirects` grava no objeto `config` importado de `@repo/next-config`) | Visto pelo `/test` da PR #41 no log do build de produção, fora do diff. Causa e efeito **não investigados**: se a atribuição falha, o redirecionamento `/legal` → `/legal/privacy` de produção (`next.config.ts:7-13`) pode não existir. O primeiro passo é medir, em `next build && next start`, se `/legal` ainda redireciona para `/legal/privacy`. A auditoria não sobe app (`cycle-policy` §3.1). **Ampliado em 2026-10-14:** o `/test` da PR #45 viu a mesma mensagem ("Unexpected error occurred while checking config") ao subir a web em build, com a configuração padrão e com a extrema, e o servidor respondeu normalmente; o redirecionamento de `/legal` segue não medido. Nota de leitura: o `source` é `/legal` sem idioma, e `apps/web/app/[locale]/legal/` não tem `page.tsx` (só `privacy`, `terms` e `components`), então `/pt-br/legal` não é coberto por esse redirecionamento. **Visto de novo em 2026-10-15** pelo `/test` da PR #46, nos dois builds da web (com e sem `NEXT_PUBLIC_DOCS_URL`), com a página respondendo 200; o `/legal` segue não medido. Terceira aparição: pela §5.1 a próxima passa a ser medição, não registro |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-07 | motivo |
|--------|---------------------|--------|
| A ligação entre o header gravado pelo proxy e o `headers()` do Server Component, sem teste automatizado | **continua aberta**, comportamento medido | o `/test` mediu os itens 1 a 9 por `curl` e navegador em build de produção; um teste automatizado exigiria servidor de pé, que o plano recusou |
| Testes de proxy presos ao formato interno `x-middleware-request-*` do Next 16.0.0 | **continua aberta**, aceita | mesmo padrão dos testes de `x-app-path` que já estavam em `main`; um upgrade do Next quebra os dois juntos |
| Caso de `lang` no Playwright | **fora de escopo** | decisão do plano (pergunta 6) |
| Montagem do `DocumentLangSync` no root layout sem teste unitário | **fechada por medição**, sem teste permanente | o componente tem 3 casos em `documentLangSync.test.tsx`; a montagem foi medida pelo `/test` na rodada 2 (`en` → `es` → `pt-br`, e o 404 raiz mantendo o `lang` do servidor) |

### 🆕 Achados da PR #42 (2026-10-07)

Vindos do plano (§13.4), do `/review` e do `/test` (O1 a O5) da tarefa `antd-theme-seed-colors`, conferidos no
código em `dbcac2a`. Todos existiam antes do diff ou ficaram fora dele por decisão do plano; nenhum bloqueou a
entrega. O O1 (`--destructive` a 4,38:1 no foco do "Excluir") e o O4 (seletor de tema em inglês) ampliaram achados
que já estavam abertos, nas linhas deles; o O4 fechou com eles na PR #43. O O3 (paginação do antd em inglês) também
fechou com a PR #43 e saiu desta tabela. O O5 não é defeito: o spinner que o plano queria medir é do `Button` do
design system, não do antd.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O hash do `typecheck` no turbo ignora os pacotes internos** | `turbo.json:11-14` (`"dependsOn": []`) | O `/review` da PR #42 mediu com `pnpm turbo run typecheck --filter=app --dry=json`, com o diff do design-system no working tree: `dependencies: []`, 289 inputs, nenhum de `packages/design-system`, cache `HIT`. Uma mudança de tipo em `packages/*` pode sair verde em `pnpm turbo run lint typecheck test` no terminal e vermelha no CI, que não guarda cache do turbo. Quem roda `pnpm --filter <app> typecheck` não é afetado, e a auditoria roda com `--force`. Correção provável, não testada: `"dependsOn": ["^typecheck"]` ou o padrão de tarefa `transit` da documentação do turbo. P |
| 🟡 **O item selecionado do seletor de tamanho da paginação fica a 2,74:1 no claro** | `antd-app.tsx:133` (âncora remedida em 2026-10-13, pós-PR #43; era `:127`; o primário neutro deriva `colorPrimaryBg` e `controlItemBgActive` cinza médio) · `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/(home)/UsersListClient.tsx:195` (`showSizeChanger: true`, a única tabela do repo com ele) | Medido pelo `/test` da PR #42 em build: texto `#0a0a0a` sobre `#575757` no claro (2,74:1) e `#fafafa` sobre `#595959` no escuro (6,71:1). Antes da PR, com o primário em `#404040`, o claro media cerca de 1,9:1, então melhorou sem chegar a 4,5:1. Afeta só o admin, na `/admin/users`. P no design system |
| 🟢 **`useAlert` escolhe o tema do toast pelo `resolvedTheme` sem `forcedTheme`** | `packages/design-system/hooks/useAlert.ts:12`, `:22` | Mesmo padrão que o `/review` da PR #42 corrigiu no provider do antd: no `next-themes` 0.4.6, o `resolvedTheme` ignora o tema forçado. Uma página com `forcedTheme` mostraria o toast no tema salvo pelo usuário. Nenhum app passa `forcedTheme` hoje. P |
| 🟢 **Os aliases `controlOutline`, `colorErrorOutline` e `colorWarningOutline` do antd saem sem sentido** | `antd-app.tsx:57` (`colorBgContainer` em `var(...)`; âncora remedida em 2026-10-13, era `:51`) · `antd/theme/util/alias.js` (`getAlphaColor` sobre o fundo) | O antd calcula esses aliases misturando cor com o `colorBgContainer`, que é variável CSS. Pintam o foco de `Input` e `Select` do antd; no repo, só o seletor de tamanho da paginação os usa. Registrado pelo plano (§13.4), não medido no navegador |
| 🟢 **`--success` do escuro fica a 3,69:1 sobre o fundo** | `packages/design-system/styles/globals.css:66` | Calculado no plano da PR #42 (`colorSuccess` `#007a55`, 5,36:1 no claro). Abaixo de 4,5:1 para texto, acima de 3:1 para componente. Nenhum app usa o token como cor de texto hoje (`git grep` por `text-success`: 0), então o defeito é latente |
| 🟢 **O comentário das regras `.ant-table` no `globals.css` ficou impreciso** | `packages/design-system/styles/globals.css:291-294` | Diz que o hover da linha fica escuro "sem um ConfigProvider sincronizado com o next-themes". Desde a PR #42 o provider segue o tema; as regras continuam necessárias porque o fundo vem de `colorFillSecondary` em `var(...)`, mas o motivo escrito mudou. Correção de texto, P |
| 🟢 **A confirmação de exclusão do `ActionsMenu` começa em x = −15 a 390 px** (O2) | `packages/design-system/components/ui/action-menu.tsx:94` (`placement="bottom"`) | Medido pelo `/test` da PR #42: a margem interna esquerda do painel fica fora da tela; o texto começa em x = 18 e os botões cabem, então nada fica ilegível. O `HEAD` anterior não foi medido em mobile. A PR #40 trocou o `placement` para `bottom` justamente para o painel não sair da tela; resta o recuo |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-07 | motivo |
|--------|---------------------|--------|
| Contraste real no navegador (passos 1 a 4 da §9 do plano) | **fechada** pelo `/test` | medido em `next build && next start` contra o build do `HEAD` anterior, critérios 5 a 9 |
| Troca de tema em tempo de execução sem Vitest | **fechada** pelo `/test` | `antdTheme.test.tsx:223` e medição no navegador (um único `data-token-hash` de tema depois de cada troca) |
| Item `danger` no escuro no nível do CSS injetado | **fechada** pelo `/test` | `antdTheme.test.tsx:251` |
| `forcedTheme` sem teste (criada pela correção do `/review`) | **fechada** pelo `/test` | `antdTheme.test.tsx:208` |
| Indicador de carregamento da `Table` do antd | **fora de escopo** | nenhum fluxo passa `loading` à `Table`; o token `colorPrimary` cobre o caso se um fork passar |

### 🆕 Achados da PR #43 (2026-10-09)

Vindos dos planos, do handoff, dos `/review` e dos `/test` das tarefas `account-deletion-dialog-focus` e
`ui-strings-and-password-focus`, conferidos no código em `7fb2fe9`. Todos existiam antes do diff ou ficaram fora do
corte por decisão do plano; nenhum bloqueou a entrega. O menu mobile da web sem nome, que o plano da segunda listou
na §13.3, já tinha linha neste arquivo e não conta como novo. O `HookFormInputPassword` que perdia o foco no envio fechou
com a PR #45 e está na lista de fechados daquela rodada.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **`CommandDialog` com título e descrição padrão em inglês** | `packages/design-system/components/ui/command.tsx:31-32` (`"Command Palette"`, `"Search for a command to run..."`) | Lidos pelo leitor de tela quando o diálogo abre. Sem consumidor no repo hoje; o fork que adotar o componente herda o inglês. Fora do corte da PR #43 por isso. P, no molde dos oito componentes da PR |
| 🟢 **`DialogFooter` com `showCloseButton` põe um `<button>` dentro de outro** | `packages/design-system/components/ui/dialog.tsx:117-121` (`DialogPrimitive.Close` sem `asChild` em volta do `Button`) | HTML inválido e erro de hidratação no primeiro consumidor. Sem consumidor hoje (`git grep showCloseButton -- apps`: 0). Medido nesta auditoria: o caso `componentCopy.test.tsx` "nomeia os dois botões de fechar do Dialog" imprime `In HTML, <button> cannot be a descendant of <button>` no stderr do `@repo/design-system`. Defeito do shadcn, anterior à PR #43. P |
| 🟢 **Clique no overlay de um `AlertDialog` manda o foco para o `body`** | `@radix-ui/react-focus-scope` 1.1.16, `dist/index.mjs:49-50` (ignora `focusout` com `relatedTarget` nulo) · todo `AlertDialog` do repo | O diálogo não fecha, mas o foco sai dele; o Tab seguinte volta. Medido pelo `/test` de `account-deletion-dialog-focus` e anterior à mudança. É da biblioteca; fica registrado para quem auditar acessibilidade |
| 🟢 **O diálogo de troca de e-mail devolve o foco à senha também quando o erro é do e-mail** | `<account>/AccountEmailChangeDialog.tsx:91-92` (era `:111-112` até a PR #48) | Em `USERS_AUTH_EMAIL_ALREADY_IN_USE`, o campo errado é o novo e-mail, e o foco vai para a senha. O `onError` não lê o código porque o `FormattedError` não o expõe (pergunta P2 do plano, opção (a) adotada). Mudar exige expor `code` no `FormattedError` |

**Lacunas de teste e 🔒 herdados das entregas, com veredito desta auditoria:**

| lacuna | veredito 2026-10-13 | motivo |
|--------|---------------------|--------|
| Abertura do diálogo de exclusão por Enter e Espaço sem Vitest | **fechada no navegador**, sem teste | o gatilho é um `<button>`, e Enter e Espaço geram o mesmo `click`; o `/test` mediu os dois |
| Limpeza do diálogo de exclusão depois de uma exclusão bem-sucedida | **fora de escopo** | no sucesso a sessão termina e o app vai para o login; o diálogo não reabre |
| Conta só Google no navegador | **fechada** pelo `/test` da PR #48 (2026-10-19) | o `/test` criou contas só Google pelo popup do IdP falso do emulador e viu a aba Privacidade e o Perfil dessas contas nos três idiomas, apontando para a aba Segurança; uma delas definiu senha e foi excluída pelo fluxo da aba Privacidade |
| Anúncio do diálogo por leitor de tela | **continua aberta**, 🔒 | não há instrumento no repo |
| Recusa que chega antes de o campo voltar a habilitado | **fechada** pela PR #45, por leitura | o campo de senha não fica mais desabilitado no envio (`readOnly`, `hookformInputPassword.tsx:83`), então o `focus()` do `onError` sempre alcança o campo |
| T1 sem o `SidebarRail` no celular | **continua aberta**, risco baixo | no celular a barra vira `Sheet`; o rótulo é o mesmo do caso de desktop |
| Troca de idioma sem recarregar nos componentes com `getDictionary()` sem Vitest | **fechada no navegador**, sem teste | o `/test` mediu pt-br → en → es → pt-br no painel comum, no admin e na landing; o jsdom não reproduz a troca de rota do App Router |
| T6 com um código de recusa só | **continua aberta**, aceitável | o `onError` não lê o código, então outro código percorre a mesma linha |
| Recusa `ACCOUNT_CURRENT_PASSWORD_INVALID` e sucesso no diálogo de e-mail | **continua aberta**, 🔒 | exige a Resend (pendência 13) |
| Diálogo de preferências de cookies | **continua aberta**, 🔒 | o consentimento só aparece com um ID do Google Analytics; o rótulo "Fechar" do `Dialog` está no Vitest |
| `Pagination` do design system no navegador | **fora de escopo** | o componente não tem consumidor; o texto está no `componentCopy.test.tsx` |
| Seletores de idioma e de tema da web a 390 px | **fora de escopo** | o cabeçalho esconde os dois nessa largura; o botão do menu mobile ganhou nome na PR #45 |

### 🆕 Achados da PR #44 (2026-10-14)

Vindos do plano (§13.3), do `/review` e do `/test` (§"Achados para o backlog") da tarefa `date-input-locale`,
conferidos no código em `fa7041b`. Todos existiam antes do diff; nenhum bloqueou a entrega. O estouro do header da
web em es a 1280 px ampliou o achado do header deslogado. Fecharam com a PR #45, e estão na lista de fechados desta
rodada: o calendário que abria no mês atual, a hidratação da `/contact`, o `initialFocus` e o caso preso a outubro.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **O `Calendar` grava `data-day` com `toLocaleDateString()` do navegador** | `packages/design-system/components/ui/calendar.tsx:229` | O atributo segue o idioma e o formato do navegador, não o da página. Invisível hoje: nenhum teste nem CSS do repo o lê (`git grep data-day` fora do componente: 0). Vira defeito se alguém passar a depender dele. Do plano da PR #44 (§13.3). P |
| 🟢 **A 390 px, o campo de nascimento fica atrás do rodapé fixo de `/entities/edit`** (novo, 2026-10-14) | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/` (formulário de edição) · `Footer` de `apps/app/shared/components/ui/` | Medido pelo `/test` de `date-input-navigation` em build: sem rolar, o clique no botão "Data de nascimento" cai no rodapé (Voltar/Salvar). Rolando, o campo aparece e funciona. O relatório trata como o layout de sempre da tela; não medido no `HEAD` nem em outros formulários com o mesmo rodapé. P, e pede medição antes de correção |
| 🟢 **Clicar no botão de enviar tira o foco do botão, e no login ele fica no `body` depois da recusa** (novo, 2026-10-14, 3ª passada, do plano de `form-field-focus-and-names`) | `packages/design-system/components/ui/button.tsx:72` (`loading` liga `disabled`) | O botão focado fica `disabled` durante o pedido, e o navegador tira o foco dele. Nos dois diálogos de conta, o `onError` devolve o foco à senha; no login, não. Lido no código; **não medido** no navegador para o clique (o `/test` mediu o Enter no campo, que passou a manter o foco). Resolver pede `aria-disabled` no lugar de `disabled` no `Button`, que muda a semântica de todo botão do repositório. Os outros seis `HookForm*` que ainda ligam `disabled` no envio (`hookformTextarea.tsx:58`, `hookformSelect.tsx:90`, `hookformSwitch.tsx:65`, `hookformDateInput.tsx:54`, `hookformImageUpload.tsx:57`, `hookformRadioGroup.tsx:57`) não enviam o formulário com Enter, então só perderiam o foco por este caminho |
| 🟢 **O asterisco de obrigatório do `Label` do design system entra no nome acessível, e a cor dele não existe** (novo, 2026-10-14, 3ª passada) | `packages/design-system/components/ui/label.tsx:27` (`<span className="text-error-500">*</span>`, sem `aria-hidden`) | Um campo `required` que usa este `Label` (`DateInput`, `TextareaInput`, `RadioGroupInput`, `ImageUploadInput`) teria o nome "Gênero *". O `FormLabel` dos `HookFormInput*` já esconde o asterisco com `aria-hidden` (`hookformInputPassword.tsx:66-72`). `git grep error-500` em `apps` e `packages`, fora do `label.tsx`: 0, então a classe não gera cor e o asterisco sai na cor do rótulo. Latente: nenhum consumidor passa `required` a esses quatro componentes hoje. Do plano de `form-field-focus-and-names` (§1.3). P |
| 🟢 **O `RadioGroupInput` recebe `required` e não repassa ao Radix** (novo, 2026-10-14, 3ª passada) | `packages/design-system/components/ui/radio-group-input.tsx` (`required` só vai ao `Label`) | O grupo não publica `aria-required`. Repassar ao Radix marca também os `input` ocultos com `required`, o que liga a validação nativa do navegador dentro do `<form>`, por isso o plano deixou de fora. Latente: nenhum grupo de rádio do repositório é obrigatório. P |
| 🟢 **O `useSubmitEnterGuard` depende de o React Query entregar o estado por `setTimeout(0)`** (novo, 2026-10-14, 3ª passada; risco, não defeito) | `packages/design-system/components/form/hookform/useSubmitEnterGuard.ts` | O hook barra o Enter enquanto o `isSubmitting` está ligado e por um `setTimeout(0)` depois, até o botão do formulário receber o `isPending` da mutação. A janela fecha porque o React Query notifica o estado nesse mesmo tempo. Um fork que troque o scheduler do React Query (`notifyManager.setScheduler`) ou dispare a mutação de outro jeito reabre a janela, e dois Enter a 2 a 5 ms voltam a mandar dois pedidos, como o `/test` mediu antes da correção. Os testes `hookformEnterResubmit.test.tsx` e `signInEnterResubmit.test.tsx` cobrem o comportamento atual. Registrado para quem mexer no React Query |
| 🟢 **Os alertas de erro mostram "(Código do erro: <uuid>)" também em recusa esperada** (novo, 2026-10-14, 3ª passada) | `packages/shared/utils/helpers/handleClientError.ts:4-11` (anexa o `requestId` a toda resposta da API) · `formattedError.ts:112-121` | Visto pelo `/test` de `form-field-focus-and-names` nos diálogos de conta: "A senha atual está incorreta. (Código do erro: …)". O código existe para a pessoa citá-lo ao suporte (PR #15, `observability-logging`), e o `panelErrorRequestId.test.tsx:115` o exige num 404. Escolher quais recusas escondem o código (só 4xx de validação? todo 4xx?) é decisão de copy e de suporte, não técnica. Fica como achado até essa decisão |
| 🟢 **Salvar as preferências em `/es` leva para `/pt-br`, porque o formulário começa com o idioma da conta** (novo, 2026-10-14, 3ª passada) | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPreferencesForm.tsx:65` (o campo começa com `account.preferences.locale`) · `:89-99` (grava o cookie e navega para o idioma salvo) | Medido pelo `/test` com a conta do seed, que guarda português: quem lê a tela em espanhol e salva o tema volta para o português. É o comportamento previsto da preferência de idioma, mas surpreende quem chegou pela URL. Se o campo deve começar com o idioma da URL é decisão de produto; fica como achado |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-14 | motivo |
|--------|---------------------|--------|
| Nenhum teste renderizava o `ContactFormClient` | **fechada** pelo `/test` | `apps/web/__tests__/contactFormDateLocale.test.tsx`, 3 casos com SSR em `node`; com o arquivo anterior, 2 de 3 reprovam |
| Troca de idioma pela navegação do App Router sem teste automatizado | **continua aberta**, comportamento medido | o jsdom não reproduz a troca de rota; o `/test` mediu pt-br → en → es → pt-br com um marcador em `window`. Mesma lacuna da PR #43 |
| `captionLayout="dropdown"` sem consumidor no produto | **fechada** pela PR #45 (2026-10-14) | o nascimento de `entity` é o primeiro consumidor (`EntityFormFields.tsx:155`), medido no navegador nos três idiomas |
| Precedência do `placeholder` do chamador no navegador | **continua aberta**, aceitável | os textos da trilha são iguais ao padrão, então a tela não distingue; o caso `:124` cobre |
| `DateInput` sob personificação | **fora de escopo** | o diff não mexeu no `disabled`; `entityFormsReadOnly.test.tsx` cobre |
| `locale={undefined}` explícito do chamador volta o `Calendar` ao `enUS` | **fora de escopo** | registrado pelo `/review` para quem ler a API (`calendar.tsx:200-202`); nenhum consumidor faz isso |

### 🆕 Achados da PR #45 (2026-10-14)

Vindos do `/test` ("Achados fora do diff" e "Menu ao navegar") e da rodada 2 do `/review` da tarefa
`web-header-reflow-and-menu-name`, conferidos no código em `eb47e80`. Eram três; o link de documentação que não
aparecia e o menu que ficava aberto fecharam com a PR #46 e estão na lista de fechados daquela rodada (versão em `dd31a95`). Sobra o que restou
do estouro do header depois da correção. O erro de `redirects` no `next start` da web, que o mesmo `/test` viu de
novo, ampliou a linha que já existia, em [Achados da PR #41](#-achados-da-pr-41-2026-10-07).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Com marca de 30 caracteres, o header da web ainda rola de lado a 1024 px** | `apps/web/app/[locale]/components/header/index.tsx:236` (grupo da direita com `w-full`) · `:39` (grade da barra a partir de `lg`; `:45`, a partir de `xl`) · `:231-233` (nome da marca), âncoras remedidas em 2026-10-16 depois da PR #46 | Medido pelo `/test` da PR #45 com `NEXT_PUBLIC_APP_NAME` de 30 caracteres: +34 px em es visitante, +26 em es logado, +11 em en logado e +4 em pt-br logado; a 1280 e 1440 px, sem rolagem. A grade antiga dava +49 e 1304 no mesmo caso, então a PR melhorou sem zerar. Causa provável, por leitura do `/review`: o `w-full` zera a contribuição mínima do grupo da direita na trilha `1fr`, e a coluna do meio nunca encolhe. Correção candidata, não medida: `lg:w-auto` ou `lg:min-w-max` no grupo e `lg:truncate` no nome, com a marca podendo sair do centro, que é decisão de produto. Desde a PR #46, com o link de documentação ligado a barra cheia só aparece a partir de 1280 px, então a 1024 px o caso só vale sem o link; a marca longa não foi medida de novo |

**Lacunas de teste e 🔒 herdados das entregas, com veredito desta auditoria:**

| lacuna | veredito 2026-10-14 | motivo |
|--------|---------------------|--------|
| Layout e rolagem do header sem teste automatizado | **continua aberta**, comportamento medido | o jsdom não calcula layout (decisão D6 do plano); o `/test` da PR #45 mediu 36 combinações em build, e o da PR #46, 48 com o link de documentação e as mesmas 36 sem ele |
| Evento de toque real no botão do menu | **continua aberta** | o `agent-browser` gera só mouse; o botão usa `onClick`, que o toque também dispara |
| Lista nativa do `<select>` do seletor de ano no tema escuro | **continua aberta**, 🔒 | o navegador headless não desenha a lista nativa (`/test` de `date-input-navigation`) |
| Sonda de novembro do `dateInputLocale.test.tsx` contra o código antigo | **fora de escopo** | o código antigo saiu de `main`; o caso passa hoje porque o calendário abre no mês do valor |

### 🆕 Achados da PR #46 (2026-10-16)

Vindos dos planos, dos `/review` e dos `/test` das tarefas `web-docs-link-and-mobile-menu` e
`api-auth-webhook-error-codes`, conferidos no código em `c8577b7`. Todos ficaram fora do corte por decisão
registrada ou existiam antes do diff; nenhum bloqueou a entrega.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O design system declara `radix-ui: latest`** | `packages/design-system/package.json:25` | Medido pelo `/review` da tarefa da web: qualquer `pnpm install` que precise resolver de novo (bastou acrescentar três devDependencies na web) sobe o `radix-ui` de 1.6.7 para 1.8.1 no lockfile, com cerca de 1.380 linhas de diff sem relação com a tarefa. A PR #46 evitou isso editando o lockfile à mão, conferido com `--frozen-lockfile`. A próxima tarefa que instalar algo traz a atualização junto, sem ninguém ter pedido. P: fixar a versão que o lockfile tem hoje |
| 🟢 **Sem `FIREBASE_WEB_API_KEY` fora do emulador, as rotas que conferem senha respondem como se a senha estivesse errada** (ampliado em 2026-10-19, pós-PR #51) | `apps/api/(shared)/lib/firebase-identity-toolkit.ts:40-51` (lança `IdentityToolkitError` quando a chave falta) · `auth/sign-in/route.ts:31-43` · `account/password/route.ts:40` · `auth/sign-in/google/route.ts:33-45` | O erro de configuração cai no mesmo mapeamento da credencial recusada e vira `400 AUTH_INVALID_CREDENTIALS` no login pela API (antes da PR #46 era 500), e o código equivalente nas rotas de conta. Quem configura o fork vê "senha incorreta" e não a chave faltando. Registrado pelo plano e pelo `/review` da tarefa da API. **Ampliado:** desde a PR #51 a rota do Google também responde assim (antes era 401 com a mensagem do provedor), e `authSignInGoogleToolkit.test.ts:62` fixa esse comportamento como contrato, sem citar a variável na resposta. Separar a falta de chave pede um código novo e decisão sobre o que a resposta pública pode dizer |
| 🟢 **O menu mobile da web não fecha com Escape nem com clique fora, não tem `aria-controls`, e o foco cai no `body` ao seguir um link** | `apps/web/app/[locale]/components/header/index.tsx:305-372` (o menu) · `:332`, `:359` (os links do painel) | D6 do plano, fora do corte. O `/test` mediu o foco: seguir "Início" estando na home deixa quem usa teclado sem foco visível, porque o link sai do DOM com o painel e a rota não muda. Nas outras rotas, é o comportamento comum do App Router. P, no mesmo arquivo |
| 🟢 **A 390 px, o painel do menu mobile deixa duas faixas da página à mostra** | `header/index.tsx:324` (`container absolute top-20 right-0 w-full`) | Medido pelo `/test` da PR #46: o painel vai de x = 16 a x = 359 numa janela de 375 px úteis, e o texto da página aparece nas faixas laterais de 16 px com o menu aberto. A classe não mudou no diff. P |
| 🟢 **`NEXT_PUBLIC_DOCS_URL` preenchida em dois `.env.example` que não a leem** | `apps/app/.env.example:74` · `apps/api/.env.example:87` (era `:86` até a PR #47) | D5 do plano da tarefa da web. Só a web lê a variável (`apps/web/env.ts:24`), e o `docs/SETUP.md:72` já diz isso. Quem copia o exemplo da app ou da API acha que a variável faz algo ali. Correção de texto, P |
| 🟢 **Header e footer da web decidem "link externo" de jeitos diferentes** | `apps/web/app/[locale]/components/footer.tsx:84-92`, `:109-121` (`includes("http")`) · `header/index.tsx:52` (`startsWith("http")`) | Para os valores reais (`/<locale>/...` e a URL da documentação) o resultado é o mesmo. Um caminho interno com "http" no meio abriria em aba nova só no footer. Registrado pelo `/review`; o footer não estava no diff |

O `/test` da tarefa da web também mediu, com a barra de rolagem clássica, `scrollWidth` 376 contra `clientWidth` 375
em `/<locale>/pricing` a 390 px, sem elemento passando da borda por mais de 0,5 px: arredondamento de subpixel, sem
linha própria. O da API viu o `console.error` com stack ao verificar o token de uma conta apagada
(`packages/auth/server.ts:194`), já contado entre os `console` crus de `observability-logging`.

**Lacunas de teste e 🔒 herdados das entregas, com veredito desta auditoria:**

| lacuna | veredito 2026-10-16 | motivo |
|--------|---------------------|--------|
| Largura e layout do header sem teste automatizado | **continua aberta**, por desenho | medido no navegador (48, 36 e 24 combinações); o `apps/web/CLAUDE.md` reserva layout ao `agent-browser` |
| `headerMobileMenu.test.tsx` só em pt-br | **fora de escopo** | no navegador, o fechamento foi medido nos três idiomas |
| `IdentityToolkitError` de chave ausente sem teste | **reduzida** em 2026-10-19, pós-PR #51 | a rota do Google ganhou o caso (`authSignInGoogleToolkit.test.ts:62`); o `/auth/sign-in` e as rotas de conta seguem sem. Ver o achado acima |
| `429` do Arcjet no `/auth/sign-in` | **continua aberta**, 🔒 | exige `ARCJET_KEY` válida; somado à pendência 24 |

### 🆕 Achados do inventário da descoberta (2026-10-16)

Vindos do inventário da descoberta de 2026-10-16, lidos no código de `c8577b7` (pós-PR #46) e **não medidos**: a
rodada não subiu app nem rodou teste. Três tinham spec que os resolve (o da aba Segurança fechou com a PR #48, o do formulário
de contato com a PR #49, e os dois saíram da tabela); dos outros cinco, tarefa direta, o do arquivamento pelo admin
fechou com a PR #50 e o da rota do Google, com a PR #51, e os dois saíram também. Na
auditoria do mesmo dia, as âncoras dos oito foram conferidas (todas batem), o mecanismo do 500 do
`/auth/sign-in/google` foi medido, e o arquivamento pelo admin ganhou o fato da confirmação da tela. Os quatro que
restam na tabela seguem só lidos: medir exigiria subir app.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O login da landing não leva a lugar nenhum depois de entrar, e o cadastro da landing não envia verificação** | `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx:44-46` (com usuário, o componente devolve `null`) · o mesmo arquivo não tem link de "esqueci a senha" · `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx:34-40` (não chama `sendEmailVerification`; a app chama em `SignUpFormClient.tsx:113`, que era `:106` até a PR #47) | Quem entra pela landing vê a área do formulário sumir sem destino. A conta criada pela landing nasce sem o e-mail de verificação que a conta criada pela app recebe. Não bloqueou [`pricing-page-catalog`](../docs/features/pricing-page-catalog/spec.md), entregue pela PR #47: pela D4, o CTA de preços leva ao cadastro da app |
| 🟡 **A tela de erro global da app é fixa em inglês** | `apps/app/app/global-error.tsx:13-16` em `main` (`lang="en"`, "Oops, something went wrong", "Try again") | Regra de ouro 2. A web tem a linha equivalente em [Achados do inventário de 2026-09-26](#-achados-do-inventário-da-descoberta-2026-09-26). **Corrigido no working tree, aguardando merge** (`leftover-ui-strings`, 2026-10-21): `getDictionary()` e `lang={locale}` em `global-error.tsx:13-27`, medido pelo `/test` em build de produção nos três idiomas |
| 🟢 **O `playground` de componentes aparece no menu lateral do usuário final** | `apps/app/app/[locale]/(authenticated)/(common)/routes.tsx:21-27` | É vitrine de quem desenvolve; num fork em produção, o usuário vê uma página de componentes de exemplo. Esconder fora do desenvolvimento, ou tirar do menu, é decisão rápida |
| 🟢 **Os menus laterais não levam às homes** | `(common)/routes.tsx:20-65` (sem item "Início") · `admin/routes.tsx:18-33` (só usuários e auditoria, sem `/admin`) | A home do usuário e o painel do admin, entregues por `dashboard-home` e `admin-analytics-dashboard`, só se alcançam pelo breadcrumb ou pelo logo |

### 🆕 Achados da PR #47 (2026-10-16)

Vindos do plano (Riscos e "Achados para o backlog"), do `/review` (rodada 1) e do `/test` da spec
`pricing-page-catalog`, conferidos no código em `dd31a95`. Todos existiam antes do diff ou ficaram fora do corte por
decisão registrada; nenhum bloqueou a entrega.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **`postAuthRedirectTarget` decodifica o destino duas vezes** | `packages/auth/redirect.ts:27` (`decodeURIComponent` sobre um valor que o `searchParams.get` já decodificou) | Valores de query com `%26`, `%3D` ou `%25` perdem a codificação ao passar pelo guard, e um `%` malformado faz o destino cair no fallback. Os `priceId` da Stripe (`price_` e alfanuméricos) não são afetados. Do plano da PR #47; o `/test` o deixou fora de escopo. P |
| 🟢 **A sessão expirada leva ao login só com o caminho, sem a query** | `packages/auth/provider.tsx:80-90` (`expiredSessionOrigin` usa `window.location.pathname` quando não há `redirect`) | Quem estava numa listagem filtrada ou na aba de cobrança com `?plan=` volta para a página sem os filtros depois de entrar de novo. Fora do caminho do CTA de preços. Do plano da PR #47. P. Encostava em `provider.tsx`, que `linked-sign-in-methods` declarava no `contends_on`; a PR #48 não tocou o arquivo, e nenhuma spec da fila o declara mais |
| 🟢 **O guard de redirect é testado fora do próprio pacote** | `apps/app/__tests__/postAuthRedirectTarget.test.ts` testa `packages/auth/redirect.ts` | `pnpm --filter @repo/auth test` não exercita o guard que acabou de ganhar a checagem contra open redirect; só a suíte da `apps/app` pega uma regressão nele. Mover o arquivo para `packages/auth/__tests__/` resolve. Do `/review` da PR #47 (D8). P |
| 🟢 **As abas da conta se sobrepõem em en a 1280 px, e a lista rola de lado a 375 px** | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountTabs.tsx:71-77` (`TabsList`) | Medido pelo `/test` da PR #47: "Security" e "Preferences" ficam colados e "Preferences" passa por baixo de "Billing". O arquivo não estava no diff. Não medido em pt-br e es nem em outras larguras. P, e pede medição antes de correção |
| 🟢 **As seções da home da web colam na borda lateral no celular** (ampliado em 2026-10-19, pós-PR #49) | `apps/web/app/[locale]/(home)/components/` (`hero.tsx`, `features.tsx`, `stats.tsx`, `cases-client.tsx`, `testimonials-client.tsx`, `faq.tsx` e `cta.tsx`, com `container mx-auto` sem padding) · `apps/web/app/[locale]/contact/components/contact-form-client.tsx:144` | Medido pelo `/test` da PR #47: sete containers começam em x = 0 a 375 px. A correção na raiz seria um padding no `container`, mas o header e o footer já compensam por fora e teriam de mudar junto; a `/pricing` resolveu com o recuo no wrapper (`px-4 md:px-2`). Do `/review` da PR #47. P a M. **Ampliado em 2026-10-19:** o `/test` da PR #49 mediu o cartão do formulário de contato encostado nas bordas a 375 px, sem rolagem horizontal; a página usa o mesmo `container mx-auto` sem padding |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-16 | motivo |
|--------|---------------------|--------|
| Proxy da app testado com `URL`, não com o `NextURL` do Next | **continua aberta** | a relativização do `Location` ganhou asserção (`proxy.test.ts`), e a resposta real foi medida em `next dev` e `next start`; o tipo `NextURL` segue fora do teste |
| Cache do catálogo por instância em serverless | **continua aberta**, 🔒 | critério 23 do `/test`; exige deploy com mais de uma instância |
| Catálogo, chamadas e checkout contra uma conta Stripe real | **fora de escopo**, 🔒 | pendência 23 |
| Layout da `/pricing` sem teste automatizado | **continua aberta**, por desenho | o `apps/web/CLAUDE.md` reserva layout ao `agent-browser`; o `/test` mediu o recuo em 375, 768 e 1280 px, claro e escuro |
| Páginas de login e cadastro repassando o `redirect` | **fechada** pelo `/test` | `apps/app/__tests__/authPagesRedirect.test.tsx`, 6 casos |
| Casos de `..` no guard de redirect | **fechada** pelo `/test` | +4 casos em `postAuthRedirectTarget.test.ts` e +1 em `proxy.test.ts`, os dois derrubados pelo guard antigo |

### 🆕 Achados da PR #48 (2026-10-19)

Vindos do plano (Riscos), do handoff, do `/review` e do `/test` da spec `linked-sign-in-methods`, e da execução de
merge do CI, conferidos no código em `44b2b04`. Os quatro primeiros ficaram fora do corte por decisão registrada;
nenhum bloqueou a entrega. O do desvínculo da senha que deixava a conta sem e-mail fechou com a PR #51 e está na lista
de fechados.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Dois desvínculos simultâneos podem tirar o último método** | `account/sign-in-methods/[id]/route.ts:72` (era `:44` até a PR #51; a regra lê o `UserRecord` do início da requisição) | Numa conta com dois métodos, dois `DELETE` concorrentes, um por provedor, passam os dois pela checagem. Na mesma aba o painel impede (`AccountSignInMethodsPanel.tsx:53-54`); exige duas abas ou chamada direta, e só prejudica o próprio titular. O Admin SDK não oferece pré-condição no `updateUser`. Do plano e do `/review` |
| 🟢 **A prova de login recente não tolera diferença de relógio** | `apps/api/(shared)/lib/recent-google-sign-in.ts:28-29` (`ageSeconds >= 0`) | O `auth_time` vem do Firebase; um servidor com o relógio alguns segundos atrás recusaria uma prova válida com `ACCOUNT_REAUTH_INVALID`. O teste `recentGoogleSignIn.test.ts:105` fixa a recusa de `auth_time` no futuro de propósito. A janela de 300 s também não se mede no emulador, que renova o `auth_time` ao renovar o token (medido pelo `/test`) |
| 🟢 **O evento de vínculo pode faltar ou se repetir** | `account/sign-in-methods/linked/route.ts:37-56` · `useSignInMethodMutations.tsx:42-57` | O vínculo acontece no navegador e a API só grava o evento depois. Se a chamada de registro falhar, o vínculo existe e a trilha não o mostra; repetir a chamada, ou chamá-la direto com o provedor já vinculado, grava o evento outra vez. O ruído fica na trilha da própria conta. Do plano e do `/review` |
| 🟢 **`test:emulator` não sobe o emulador de Auth, e dois fluxos dependem de comportamento do Auth medido à mão** (ampliado em 2026-10-19, pós-PR #51) | `apps/api/scripts/emulator-tests.mjs` e o guard da suíte (só Firestore e Storage) · `accountSignInMethodsRoute.test.ts` (Admin SDK mockado) | **Ampliado:** a PR #51 deixou de fora de novo (§1.5 do plano de `password-unlink-email-restore`), e o `/test` dela mediu à mão no emulador de Auth as premissas da nova tentativa; o `/test` do contrato do Google mediu o `USER_DISABLED` também à mão. A rota de desvínculo supõe que o Firebase apaga o e-mail ao tirar a senha e que devolver o e-mail revoga os tokens; a confirmação da troca de e-mail (PR #33) supõe o comportamento do código de ação. As duas medições foram feitas à mão no emulador e não ficaram no repositório; uma mudança de comportamento do Firebase passa pela suíte sem ninguém ver. Incluir o Auth muda o runner, o guard e o job do CI. M. Amplia a lacuna de `account-email-change` |
| 🟢 **O CI usa `ubuntu-latest` durante a migração do rótulo para o Ubuntu 26** | `.github/workflows/ci.yml:21`, `:60`, `:84`, `:142` | A execução de merge da PR #48 trouxe a anotação do GitHub: o rótulo passa a migrar para o Ubuntu 26 a partir de 2026-10-19 (<https://github.com/actions/runner-images/issues/14748>). Aquela execução ainda rodou em `ubuntu-24.04` (versão 20261012). Os jobs `verify` e `e2e` instalam JDK 21 e navegador do Playwright, que dependem da imagem; uma falha que apareça só depois da troca de imagem vai parecer culpa da PR da vez. P: fixar `ubuntu-24.04` ou acompanhar a próxima execução |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-19 | motivo |
|--------|---------------------|--------|
| Popup real do Google, "User account linking" do projeto e `auth/unauthorized-domain` | **fora de escopo**, 🔒 | exigem projeto Firebase real; somados à pendência 17 |
| Falha da devolução do e-mail pelo produto | **continua aberta**, 🔒 | não se reproduz sem injetar falha no Admin SDK. O achado fechou com a PR #51 (nova tentativa, revogação e log); a sequência no navegador depois do `500` ficou 🔒 também no `/test` dela |
| `auth_time` acima de 300 s | **continua aberta** | o emulador renova o `auth_time`; a recusa de 301 s está só em `recentGoogleSignIn.test.ts` |
| As três ações novas do SDK sem teste no `@repo/sdk` | **continua aberta**, risco baixo | `@repo/sdk` segue com 10 testes; as ações são exercitadas pelos testes da `apps/app` com o `apiClient` mockado |
| `reloadCurrentUser()` que mostrava erro depois de desvincular o Google | **fechada** pelo `/review` e pelo `/test` da PR #48 | o reload saiu do desvínculo; `useSignInMethodMutations.test.tsx` fixa o sucesso e o `/test` mediu o repro fechado |

### 🆕 Achados da PR #49 (2026-10-19)

Vindos do plano ("Achados adjacentes"), do `/review` (rodadas 1 e 2) e do `/test` da spec `contact-support-channel`,
conferidos no código em `4eeb07b`. Todos existiam antes do diff ou ficaram fora do corte por decisão registrada;
nenhum bloqueou a entrega. O das rotas públicas que liam o corpo inteiro fechou com a PR #51 e está na lista de
fechados. O cartão encostado na borda a 375 px ampliou a linha das seções da home, em
[Achados da PR #47](#-achados-da-pr-47-2026-10-16); o CTA do hero, que o `/test` mediu de novo, já tinha linha em
[Achados da entrega `e2e-testing`](#-achados-da-entrega-e2e-testing).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **A `apps/web` ainda declara `RESEND_*` e depende de `@repo/email`, sem enviar nada** | `apps/web/env.ts:1` (importa `@repo/email/keys`) · `apps/web/.env.example:2-3` · `apps/web/package.json:19` | Desde a PR #49 o envio do contato passa pela API, e o único uso do pacote na web é o `env.ts`. Quem configura o fork põe a chave da Resend num projeto que não a usa, como o achado A3 registra para a Stripe. P, só configuração da web |
| 🟢 **A página de contato mostra "Next Boilerplate" fixo no título e promete resposta em 24 horas** | `translations/apps/web/pages/contact/contact.ts:4`, `:49`, `:94` (`meta.title`, que também é o `<h1>`, `contact-form-client.tsx:149-151`) · `:11`, `:56`, `:101` (o benefício) | O título não lê a marca de `getBrand()`, e a resposta em 24 horas é um compromisso que o core não cumpre sozinho. Copy, P. Do plano da PR #49 |
| 🟢 **O `Textarea` do design system cresce sem limite de altura** | `packages/design-system/components/ui/textarea.tsx:11` (`field-sizing-content` sem `max-h`) | Medido pelo `/test` da PR #49: com 5000 caracteres, a caixa de mensagem chega a 2798 px e empurra o botão de enviar para fora da tela. Vale para todo `HookFormTextarea` e `TextareaInput`. P no design system |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-19 | motivo |
|--------|---------------------|--------|
| Entrega real pela Resend | **fora de escopo**, 🔒 | exige domínio verificado; somada à pendência 13 |
| `429` real em `/contact` com `ARCJET_KEY` | **continua aberta**, 🔒 | somada à pendência 24; a lista e o `429` estão em `corsOrigin.test.ts` |
| Confirmação de envio vista no navegador | **continua aberta**, 🔒 | depende de envio aceito, que exige Resend; o bloco usa as mesmas classes do aviso de indisponível, cujo contraste foi medido |
| E-mail preenchido com `SESSION_COOKIE_DOMAIN` num domínio real | **continua aberta**, 🔒 | somada à pendência 10; medido só em `localhost` |
| Item do menu ausente sem `NEXT_PUBLIC_WEB_URL`, no navegador | **fechada** por teste unitário | `profileDropdownHelpLink.test.tsx` renderiza o componente real sem a variável |
| Trava do envio duplo sem passada de navegador | **continua aberta**, risco baixo | entrou na rodada 2 do `/review`, depois do `/test`; `contactFormPrefill.test.tsx` falha com a guarda antiga, e a suíte E2E não passa pela `/contact` |
| Texto de `EMAIL_SEND_FAILED` ("o e-mail") no formulário de mensagem | **fora de escopo** | decisão do plano (pergunta 3); um código próprio custa três linhas de tradução se a copy incomodar |
| `page.tsx` escolhendo `available` e e-mail acima de 320 caracteres | **fechadas** pelo `/test` | `contactPageAvailability.test.tsx` (6 casos) e 3 casos em `contactFormSchema.test.ts`, que reprovam sem a correção |

### 🆕 Achados da tarefa `admin-archive-access-revocation` (2026-10-19)

Vindos do `/review` e do `/test` da tarefa direta que fecha o arquivamento pelo admin sem tirar o acesso, conferidos
no working tree sobre `4eeb07b` e de novo em `main` (`4b0be90`) na auditoria pós-PR #50, que acrescentou a última
linha. Nenhum bloqueou a entrega. O do `USER_DISABLED` no `/auth/sign-in` saiu para a lista de fechados como "não
procede". O contrato de erro do `/auth/sign-in/google` com conta
desativada ampliou a linha da rota, que fechou com a PR #51 e está na lista de fechados.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Conta arquivada antes da correção entra em laço de redirecionamento se a desativação no primeiro contato falhar sempre** | `apps/api/(shared)/lib/user-merge.ts:61-67` (a falha do `revokeAccountAccess` só vai para o log; era `:60-66` até a PR #52) · `apps/app/proxy.ts:251-266` (sessão válida numa rota pública volta para a home) · `apps/app/lib/server/authSession.ts:34-39` (o 401 do `/auth/me` manda para o login) | Com a conta ainda habilitada no Auth, o proxy aceita o cookie, o layout recebe 401 e manda para `/sign-in`, e o proxy devolve para a home. Falha transitória se resolve na volta seguinte, que tenta desativar de novo; a persistente (o Admin SDK recusando o `updateUser`) prende a pessoa até o navegador cortar os redirecionamentos. Antes da tarefa esse caminho criava um perfil novo e não tinha laço. Saída provável: a app limpar o cookie quando o `/auth/me` responder 401 com sessão válida, o que fecha também o laço equivalente para qualquer outra falha do `/auth/me`. Não medido; o `/test` não tem como forçar a recusa persistente. P a M, `apps/app` |
| 🟢 **A primeira entrada por e-mail e senha de uma conta arquivada antes da correção volta ao formulário sem mensagem** | `packages/auth/provider.tsx:346-352` (`onAuthSuccess` grava o cookie e navega antes de o perfil ser consultado) · `apps/api/(shared)/lib/user-merge.ts:61-67` (a conta é desativada no `/auth/me` do layout) · `apps/app/lib/server/authSession.ts:34-39` | Medido pelo `/test`: a pessoa volta ao login sem aviso, porque o redirecionamento do servidor descarta o toast. A segunda tentativa mostra "Esta conta foi desativada.". Acontece uma vez por conta arquivada antes da correção, e é o comportamento que o plano da tarefa previu. P se alguém quiser a mensagem já na primeira vez |
| 🟢 **`actionMenu.test.tsx` "closes the open menu on Escape and returns focus to the trigger" falhou uma vez sob carga** | `packages/design-system/__tests__/actionMenu.test.tsx:419` | No `pnpm test` da raiz, durante o `/test` desta tarefa, o caso levou 3711 ms e falhou com dois `next dev`, o Chrome do `agent-browser` e o build da app disputando a máquina. Passou nas três execuções seguintes do `/test`, na da auditoria pós-PR #50 (346 ms, com o arquivo inteiro em 14,3 s sob load 15,8), na da auditoria pós-PR #51, na da auditoria pós-PR #52 (arquivo inteiro em 21,8 s, sob load 24) e na da pós-PR #53: 1 falha em 8. É o terceiro caso de teste instável registrado, de causa provavelmente diferente do `useListAuditEvents` (tempo, não teardown); não apareceu no CI. Ver [Detector de teste instável no CI](#lacunas-avaliadas-e-não-especificadas). P |
| 🟢 **`getMergedUserFromIdToken` não tem chamador** (novo, auditoria pós-PR #50) | `apps/api/(shared)/lib/user-merge.ts:32-48` (era `:31-47` até a PR #52; `git grep getMergedUserFromIdToken` fora de testes acha só a definição; o teste é `userMergeArchivedProfile.test.ts:170-180`) | O plano da PR #50 já registrava que a função não tinha chamador (§1.1) e mesmo assim a corrigiu e cobriu com teste, para os dois caminhos seguirem a mesma regra. É código morto mantido em par com `getMergedUserByUid`, com teste próprio que custa manutenção sem proteger caminho de produção. Apagar a função e o caso de teste, P, `apps/api` |

### 🆕 Achados da PR #51 (2026-10-19)

Vindos dos `/review` e dos `/test` das tarefas `google-sign-in-error-contract`, `password-unlink-email-restore` e
`request-body-size-limit`, conferidos no código em `9b37e02`. Eram três: o primeiro, a conexão aberta depois do `413`,
foi aberto pela própria PR e fechou com a PR #53 (lista de fechados); os outros dois existiam antes do diff. O quarto registro pedido, o `console.error` de
`revokeUserSessions` (`packages/auth/server.ts:334`), já é um dos sete de `packages/auth/server.ts` que
[`observability-logging`](observability-logging.md) lista, e não ganhou linha própria. O `AUTH_INVALID_CREDENTIALS` com
a copy "E-mail ou senha incorretos." num fluxo do Google também não: é a pergunta P1 do plano, adotada com o custo
declarado, e pela tela o caminho quase não é alcançável.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **13 arquivos de teste da `api` usam dublê de `Request` sem `body`, e esses testes nunca passam pelo teto** | ex.: `apps/api/__tests__/accountRoute.test.ts:85-97` · `parse-request-json.ts:60-63` (sem stream, o helper delega ao `req.json()`; era `:55-58` até a PR #53) | Em produção não muda nada: um `Request` real com corpo sempre tem `body`. Mas um teste de rota desses arquivos não consegue provar o `413`, e o ramo `req.json()` do helper existe só por causa deles (desvio 1 do handoff, para não quebrar 95 testes). Migrar os dublês para `new Request(...)` quando alguém tocar o arquivo. Do `/review` de `request-body-size-limit`; a contagem é dele, não refeita nesta auditoria |
| 🟢 **A criação de usuário pelo admin aceita `email` sem limite de tamanho** | `apps/api/(shared)/validation/user-admin.schema.ts:8` (`z.string().email()`, sem `.max()`) | Os outros schemas usam `EMAIL_MAX = 320` (`auth.schema.ts:11`). O teto de 100 KiB do corpo limita o estrago, e a rota exige admin. Correção de uma linha. Do `/review` de `request-body-size-limit` |

**Lacunas de teste e 🔒 herdados das entregas, com veredito desta auditoria:**

| lacuna | veredito 2026-10-19 | motivo |
|--------|---------------------|--------|
| Tetos da plataforma (Vercel acima de 4,5 MB, truncamento do Next em 10 MiB) | **fora de escopo**, 🔒 | CA12 do `/test`; comportamento da plataforma, que o diff não muda |
| Revogação que falha dentro do desvínculo da senha | **continua aberta**, 🔒 | `revokeUserSessions` engole o erro (`packages/auth/server.ts:334`), então a rota nunca o vê; o `/test` leu o código |
| Sequência no navegador depois do `500` do desvínculo | **continua aberta**, 🔒 | exige injetar falha no Admin SDK; o efeito esperado (sair da conta pelo `401` seguinte) está no §1.3 do plano |
| Esquemas recusados do `requestUri` (`javascript:`, `ftp:`, sem esquema) | **fechada** pelo `/test` | +4 casos em `authSignInGoogleRoute.test.ts` |
| Comportamento do Auth medido à mão (apagar o e-mail ao tirar a senha, `USER_DISABLED` no `signInWithIdp`) | **continua aberta** | é o achado do `test:emulator` sem o Auth, em [Achados da PR #48](#-achados-da-pr-48-2026-10-19), ampliado nesta rodada |

### 🆕 Achados da PR #52 (2026-10-20)

Vindos do `/review` e do `/test` da spec `in-app-notifications`, conferidos no código em `3a118c6`. Eram sete; o id com
`%2F` nas rotas `[id]` (que existia antes do diff) e os três do sino (a lista com 60 s de `staleTime`, o popover na borda
e o badge depois de uma falha) fecharam com a PR #53 e estão na lista de fechados. Os três que sobram nasceram com o diff
e ficaram fora por decisão registrada. Nenhum bloqueou a entrega. O `/test` viu
uma vez dois avisos de hidratação por id do Radix no `/pt-br/playground` e não reproduziu em seis carregamentos seguintes;
sem repro, não virou linha.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **`markRead` pode achar o documento apagado e responder 500** | `apps/api/(shared)/repositories/notification.repository.ts:63-67` (`update`, que lança `NOT_FOUND`) · `notifications/[id]/read/route.ts:24-30` | Entre o `findById` da rota e a escrita, a TTL ou o expurgo podem apagar o documento. A janela é de milissegundos. Do `/review` |
| 🟢 **Dois eventos diferentes e concorrentes da Stripe podem gerar dois avisos de tipos diferentes** | `apps/api/app/(routes)/webhooks/payments/route.ts:94`, `:108-110` (o estado anterior vem de fora da transação de `applySubscriptionState`) | A reentrega do mesmo evento não duplica (o `event.id` está no id do documento); dois eventos distintos para o mesmo perfil, ao mesmo tempo, podem. Aceito no plano (§4.8). Do `/review` |
| 🟢 **Com `99+`, o badge cobre quase todo o ícone do sino** | `NotificationsBell.tsx:52-60` (era `:50-57` até a PR #53) | 31 px de badge sobre um botão de 36 px. Medido pelo `/test` com 105 não lidas. P |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-20 | motivo |
|--------|---------------------|--------|
| Índices publicados e TTL só existem no projeto real | **continua aberta**, 🔒 | os índices foram medidos nesta rodada (não publicados no projeto de referência); a TTL não tem leitura pelas ferramentas da auditoria. Pendências 1 e 28 |
| Polling de 120 s e aba escondida sem teste de relógio | **fechada por medição**, sem teste permanente | o `/test` contou as chamadas no log da API ao navegar e ao esperar (itens 2 e 3) |
| Corrida entre dois eventos diferentes da Stripe | **continua aberta**, aceita | virou o achado acima |
| `[id]/read` com id inválido sem teste | **fechada** pelo `/test` | `notificationsRoute.test.ts:300-323`, cinco casos (barra, reservado, `.`, `..` e acima do limite) |
| Boas-vindas pelo primeiro login com Google, ponta a ponta | **fechada por medição** | o `/test` entrou com um token do IdP do emulador: perfil criado, contagem 1, `expiresAt` 90 dias depois; o segundo login não repetiu |
| Evento real da Stripe | **fora de escopo**, 🔒 | pendência 23 |
| As quatro ações novas do SDK sem teste no `@repo/sdk` | **continua aberta**, risco baixo | `@repo/sdk` segue com 11 testes; as ações são exercitadas pelos testes da `apps/app` com o `apiClient` mockado |

### 🆕 Achados da PR #53 (2026-10-20): `api-edge-413-close-and-route-id`

Vindos do `/review` e do `/test` da tarefa `api-edge-413-close-and-route-id`, conferidos na branch (`6048311`) e de novo
em `main` (`d19e6fd`) nesta auditoria: `packages/auth/keys.ts` e `file.schema.ts` não mudaram. Nenhum foi aberto pelo
diff: os dois existiam antes dele. O terceiro
registro, o gate do `CORS_ORIGIN`, ampliou a linha que já existia em
[Segurança](#segurança-seguem-abertos-confirmados-no-código).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Com o conjunto parcial da conta de serviço em `""`, o `keys()` de `@repo/auth` lança uma mensagem que não ajuda** | `packages/auth/keys.ts:49-50` (e-mail e chave lidos sem `\|\| undefined`, ao contrário de `:54-61`) · checagem em `:65-70` | O `/review` da PR #53 abriu como 🟡, supondo que o `.env.example` derrubasse o build; o `/test` mediu com um teste descartável e derrubou: com os três `FIREBASE_ADMIN_*` vazios, `keys()` não lança. Só lança com o projeto preenchido e o e-mail ou a chave vazios, e aí a mensagem é "Invalid email address", enquanto o mesmo conjunto com as variáveis ausentes recebe "is required when any other FIREBASE_ADMIN_* variable is set". Trocar por `\|\| undefined` só melhora a mensagem. P |
| 🟢 **O `413` do `/files` sai sem `connection: close`** | `apps/api/(shared)/validation/file.schema.ts:59`, `:107-108` (recusa pelo `content-length` declarado) · `:124` | Consistência com o `parseRequestJson` da PR #53. O `/test` não mediu defeito: 20 envios de 5 MiB com `content-length` deixaram 0 conexões abertas aos 2 s, porque o `curl` fecha sozinho, e em `chunked` a rota lê o corpo inteiro pelo `formData()` antes de recusar, então não sobra corpo preso no socket. Fica como nota para quem mexer no arquivo |

**Lacunas de teste e 🔒 herdados da PR #53, com veredito desta auditoria:**

| lacuna | veredito 2026-10-20 | motivo |
|--------|---------------------|--------|
| Sem teste de rota para id inválido em `entities/[id]` e `users/[id]` (D6 do plano) | **continua aberta**, por decisão do plano | as suítes de rota mockam o repositório; a guarda tem 8 casos em `baseRepository.test.ts` e o comportamento por HTTP foi medido pelo `/test` |
| Sem teste de emulador para a guarda (D7 do plano) | **continua aberta**, por decisão do plano | a guarda age antes de qualquer chamada ao Firestore, e o espião em `fakeDb.collection` já prova isso |
| `413` com `connection: close` na Vercel | **fora de escopo**, 🔒 | exige deploy; o comportamento foi medido em `next start` |
| `fetch` do Node sem `ECONNRESET` (R1) | **fechada** pelo `/test` | 10 de 240 tentativas falharam na escrita; custo aceito no plano e registrado em `docs/SECURITY.md:178` |

### 🆕 Achados da tarefa `notifications-bell-freshness` (PR #53)

Vindos do `/review` (cinco 🟢 aceitos sem correção) e do `/test` da tarefa, conferidos no código de `main` (`d19e6fd`).
Nenhum é defeito de produção nem bloqueou a entrega. Dois dos cinco 🟢 do `/review` viraram lacuna de teste, abaixo
(o `LIST_STALE_MS` copiado e a releitura extra depois de uma falha, que o `/test` mediu e fechou como custo aceito).
Os três registros de ambiente do `/test` (o glob do `network route` que não casa, a página headless que se declara
oculta e a porta 3000 ocupada) mudam como o próximo `/test` repete os fluxos e ficam no relatório da feature.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **A marca de "lista velha" depende de todo escritor devolvê-la, e o `fetchNextPage` tem uma corrida** | `apps/app/shared/hooks/useListNotifications.ts:15-19` (a regra, só no JSDoc) · `:60-67` (o wrapper lê a marca antes do `await`) · `useNotificationActions.ts:57-69` (`writeList`) | No React Query 5.90.20 toda escrita bem-sucedida na lista apaga a marca de invalidada. Hoje todos os escritores passam por `writeList` ou pelo wrapper; uma mutação nova que use `setQueryData` direto (apagar notificação, por exemplo) perde a marca sem aviso. E se a contagem mudar enquanto uma página está em voo, a marca posta durante o pedido some e o wrapper não a recoloca: a reabertura dentro de 60 s mostra a lista sem a novidade, o comportamento de antes da tarefa. A janela é a de um `GET /notifications` com o popover aberto. Aceito no `/review`, não medido. P se alguém quiser fechar (o `/review` descreve o caminho) |
| 🟢 **Com a contagem em erro, "marcar todas" fica desabilitado se as páginas carregadas estiverem todas lidas** | `apps/app/shared/components/notifications/NotificationsList.tsx:46` (`canMarkAll = unreadCount > 0 \|\| hasUnreadLoaded`) · `:134` | Desde a PR #53 a contagem em erro vale 0, então o botão depende só do que está carregado, mesmo com não lidas além da página. Antes, o número velho habilitava o botão. Volta quando a contagem responde. Lido pelo `/review`; o `/test` não montou o arranjo (as páginas carregadas tinham não lidas). Observação, sem correção proposta |
| 🟢 **A 375 px com scrollbar clássica, o popover do sino avança 3 px sobre a barra** | `apps/app/shared/components/notifications/NotificationsBell.tsx:65` (largura `min(24rem, calc(100vw - 1.5rem))`) · `:66` (`collisionPadding` de 12) | Medido pelo `/test`: com a barra de rolagem clássica de 15 px, o popover fica a 12 px da janela e a −3 px do `clientWidth`; com a barra sobreposta (celular real, iPhone 15 emulado), 12 px dos dois lados. Sem rolagem horizontal. O `100vw` conta a largura da barra. Era o R1 do plano. Cosmético, só em desktop estreito |

**Lacunas de teste e 🔒 herdados da tarefa, com veredito desta auditoria:**

| lacuna | veredito 2026-10-21 | motivo |
|--------|---------------------|--------|
| `LIST_STALE_MS` do teste copia o `staleTime` de 60 s do `QueryProvider.tsx:6`, que não é exportado | **continua aberta** | se o `staleTime` global mudar, o caso "reabrir sem contagem nova não relê" segue passando com o valor antigo (`useNotifications.test.tsx:62-63`). Fechar exige exportar a constante de produção |
| Corrida entre o `queryFn` da contagem e uma mutação (R4 do plano) | **continua aberta**, não medida | janela de milissegundos |
| Contagem travada em 100 não marca a lista (R2 do plano) | **fora de escopo** | aceita no plano: acima do teto, o servidor e o cache concordam em 100 |
| Releitura extra depois de "marcar como lida" com a contagem em erro | **fechada por medição** | o `/test` mediu 1 leitura a mais na reabertura seguinte, o custo que o `/review` aceitou |
| `collisionPadding` sem teste automatizado | **fechada por medição** | o jsdom não tem layout; o `/test` mediu a posição em oito arranjos, a 375 e a 393 px |

### 🆕 Achados da tarefa `leftover-ui-strings` (2026-10-21, working tree)

Vindos do plano (§1.4 e §1.5), do `/review` e do `/test` da tarefa, que está sem commit. Os três abaixo são anteriores
ao diff: nenhum foi aberto por ele. As âncoras citam `main` (`d19e6fd`) e, quando o arquivo está no diff, também a linha
no working tree. O quarto registro reescreveu a linha do `global-error` da web, em
[Achados do inventário de 2026-09-26](#-achados-do-inventário-da-descoberta-2026-09-26).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **A tela de erro global da app sai sem estilo e sem tema** | `apps/app/app/global-error.tsx:1-6` (não importa `styles.css`) · `apps/app/app/layout.tsx:2` (quem importa) · `:66-72` e `:86` (classe de tema no `<html>` e `AppDesignProvider`, que a tela de erro substitui) | **Medido** pelo `/test` de `leftover-ui-strings` em `next build && start`, com `throw` temporário no root layout: fonte serifada padrão, botão nativo, fundo transparente e texto preto mesmo com `prefers-color-scheme: dark`. A web tem o mesmo arquivo sem `styles.css` (`apps/web/app/[locale]/global-error.tsx:1-6`), hoje inerte. Corrigir nas duas depois do merge da tarefa, porque o arquivo da app está no diff sem commit |
| 🟢 **No login da landing a 375 px, o cartão encosta na borda da tela** | `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx:49-50` em `main` (`:52-53` no working tree): o contêiner tem `py-20` e nenhum padding horizontal, e o cartão é `w-full max-w-md ... border p-8` | **Medido** pelo `/test`: a 375 px, cartão de x 0 a 360 (viewport menos a barra de rolagem), com as mensagens dentro dele, de x 33 a 327, e sem rolagem lateral. O cadastro da landing usa as mesmas classes (`sign-up-form-client.tsx:74-75`); lá não foi medido. Anterior à tarefa |
| 🟢 **O login da landing não tem `noValidate`, e o balão nativo aparece antes do Zod** | `sign-in-form-client.tsx:61-68` em `main` (`:64-72` no working tree), sem `noValidate` · `:77` (`:80` no working tree), `type="email"` · mesmo caso no cadastro, `sign-up-form-client.tsx:86`, `:97` · o contato já usa `noValidate` (`contact-form-client.tsx:103`) | Com um valor sem `@`, o navegador mostra a própria mensagem, no idioma do navegador e não no da URL, e a mensagem traduzida do Zod não chega a aparecer. Lido no código, é o comportamento padrão do HTML para `type="email"`; o `/test` evitou esse valor de propósito e não o mediu. Pôr `noValidate` muda comportamento além da tradução, por isso ficou fora da tarefa |

**Lacunas de teste herdadas de `leftover-ui-strings`, com veredito desta passada:** ver a tabela em
[Executada no working tree](#executada-no-working-tree-sem-commit-leftover-ui-strings). Uma fechada pelo `/test` e uma
aberta (o T3 não clica no botão para conferir o `reset()`, P).

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md).
> Na auditoria pós-PR #53 (2026-10-21) foram remedidas as linhas 1 a 4, 6, 8, 15, 16 e 28. As outras mantêm o
> veredito anterior, com motivo: exigem console de provedor, ou dependem de arquivos que a PR #53 não tocou. A PR #53
> não criou pendência: nenhuma variável, índice, regra ou passo manual novo.

| # | pendência | onde vive | veredito (2026-10-21, pós-PR #53, nas linhas remedidas; datas anteriores nas demais) |
|---|-----------|-----------|---------------------|
| 1 | 🔴 Publicar os três índices dos resumos da home (`GET /entities/summary` e `/users/summary` respondem 503 sem eles) | `PRE-PRODUCTION.md` §1.5 | **continua aberto, medido em 2026-10-21**: o `ListIndexes` do Firestore Admin em `next-boilerplate-576d0` (pelo MCP do Firebase) devolve um único índice composto, o de `user` `reference_id` + `deletedAt`, `READY`; os três dos resumos não estão lá. Mesmo resultado de 2026-10-20 |
| 2 | 🔴 Publicar o índice das faixas de recência (`user`: `deletedAt` + `lastAccessAt`) | `PRE-PRODUCTION.md` §1.7 | **continua aberto, medido em 2026-10-21**; idem |
| 3 | 🔴 Publicar o índice da trilha de auditoria (filtro por usuário responde 503) | `PRE-PRODUCTION.md` §1.2 | **continua aberto, medido em 2026-10-21**; idem |
| 4 | 🔴 Publicar o índice da listagem paginada de `entity` | `PRE-PRODUCTION.md` §1.1 | **continua aberto, medido**: o `/test` da PR #35 recebeu `503 PAGINATION_INDEX_MISSING` em `GET /entities` contra o projeto de desenvolvimento (`test/report.md:85`), então o índice não está publicado nem lá; a medição de 2026-10-21 confirma. Com os dois de `notification` (§1.9, PR #52), são **oito** índices sem publicação; o comando é um só |
| 5 | Retenção da coleção `auditEvent` | `PRE-PRODUCTION.md` §1.3 | **continua aberto**, estacionado (E5) |
| 6 | ⚠️ `main` sem branch protection | `PRE-PRODUCTION.md` §9 | **continua aberto**, remedido em 2026-10-21 pós-PR #53 (404, `[]`, 53 PRs, nenhuma aberta); estacionado (E3). É o que falta para o item 2 de `e2e-testing`, arquivada com esse ⚠️ |
| 7 | Backfill de instantes em base que já tem dado | `PRE-PRODUCTION.md` §1.4 | **continua aberto**; não é mensurável daqui |
| 8 | Ninguém vigia a trilha de erro (nenhum coletor) | `PRE-PRODUCTION.md` §11 | **continua aberto**, remedido em 2026-10-21 pós-PR #53: `git grep` por `@sentry`, `@logtail`, `@axiomhq` e `betterstack` em `apps/` e `packages/` devolve 0; estacionado (E1). A PR #53 não somou caso novo. A PR #52 somou mais um caso: a notificação que não se grava sai só como `[notifications] emit-failed` no log (`(shared)/lib/notifications.ts:46`), e o produtor segue sem ela. A PR #51 trocou um caso por outro: o desvínculo da senha que falha no meio agora registra o `uid` no log (`password-unlink-email-restore-failed`, `account/sign-in-methods/[id]/route.ts:125`), mas a conta pode seguir sem e-mail, e só um coletor faz alguém ver a linha. A PR #50 acrescentou mais um caso que só um coletor alcança: a falha persistente da desativação no primeiro contato vai só para o log (`archived-account-lockout-failed`, `user-merge.ts:62`). A PR #48 tinha deixado o desvínculo da senha sem registro nenhum do `uid` (achado fechado pela PR #51) |
| 9 | Health check da plataforma não aponta para `/health/ready` | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: configuração de plataforma |
| 10 | `SESSION_COOKIE_DOMAIN` em subdomínios distintos | `PRE-PRODUCTION.md` §7 | **continua aberto** (configuração de deploy). Desde a PR #49 o e-mail preenchido em "Ajuda e contato" depende dele: a landing lê a sessão compartilhada, e o `/test` só mediu em `localhost` (🔒) |
| 11 | Cloud Storage não ativado (plano Blaze) | `PRE-PRODUCTION.md` §6 | **continua aberto** em produção. Desde a PR #31, upload, avatar e o passo `storage` do expurgo rodam e têm teste sob o emulador; contra bucket real seguem sem prova o objeto que não abre sem assinatura e a expiração da URL V4 |
| 12 | Revogação de sessão nunca provada ponta a ponta | *(só neste arquivo)* | **metade fechada**, reconhecido na auditoria pós-PR #34: o `/test` de `compliance-docs-kit` mediu em 2026-09-30, contra o projeto Firebase de desenvolvimento, que depois de `revokeRefreshTokens` o cookie emitido antes volta `null`, o bearer volta `null` em `resolveApiActor` e `createSessionCookie` com o token anterior lança `auth/id-token-expired` (`docs/features/compliance-docs-kit/test/report.md`, tabela "Resultado bruto"). É a prova que a ressalva de `session-refresh` pedia para a camada de verificação. **Continua aberto** só o percurso de navegador: sair numa app e ver a outra perder a sessão. O `/test` da PR #35 somou a medição da conta desativada (bearer recusado com e sem revogação, e depois da reativação) e também não subiu navegador |
| 13 | Envio real de e-mail nunca provado | `PRE-PRODUCTION.md` §3 | **continua aberto** (exige domínio com SPF/DKIM). O `/test` da PR #24 viu o envio do e-mail de verificação falhar sob o emulador, com `RESEND_TOKEN` vazio, como esperado. O `/test` da PR #29 deixou 🔒 o e-mail de verificação depois do cadastro pela API (critério 20). O `/test` de `brand-config` deixou 🔒 o nome da marca com acento na caixa de entrada. O `/test` da PR #33 deixou 🔒 a entrega do aviso ao endereço antigo e do link ao novo; sem Resend o pedido responde `503 EMAIL_NOT_CONFIGURED`, medido nos 3 idiomas. O `/test` da PR #49 deixou 🔒 a entrega do formulário de contato na caixa de suporte; sem Resend a rota responde `503 CONTACT_UNAVAILABLE`, e com token falso, `503 EMAIL_SEND_FAILED`, medidos nos 3 idiomas |
| 14 | CSP Report-Only na `apps/web` | `PRE-PRODUCTION.md` §10 | **continua aberto**, deliberado |
| 15 | Contas de QA acumuladas no projeto de desenvolvimento | `PRE-PRODUCTION.md` | **continua aberto, não recontado**: exige o console do Firebase. O `/test` da PR #35 criou e apagou a própria conta (`PRE-PRODUCTION.md:1028`, era `:969` até a PR #49 e `:976` até a PR #52). Pelos relatórios, os `/test` das PRs #37 a #39 e #41 a #44 rodaram sob o emulador (os da #43 criaram contas `@example.com`, entre elas nove `qa-ui-strings-NN@example.com`, que existiram só no emulador; o da #44 não criou conta, usou as duas do seed e criou a entidade `qa-date-input-locale-01`, também só no emulador; os três da #45 rodaram sob o emulador, com as contas do seed e a conta que o `signUp.spec.ts` do `pnpm e2e` cria e descarta); o `/test` da PR #46 também rodou sob o emulador, com as contas do seed e uma conta `qa-api-error-codes@example.com` criada, desativada e apagada lá; o da PR #47 também, com as contas do seed e `qa-pricing-catalog@example.com`, que morreu com o processo do emulador; os dois do `/test` da PR #48 também, com contas `qa-linked-*@example.com` e `qa-api-google@example.com` e identidades Google falsas do IdP do emulador, todas mortas com o processo; o da PR #49 também, só com as contas do seed e nenhuma conta nova; os dois do `/test` da PR #50 também, com dezessete contas `qa-archive-*@example.com`, sete delas Google do IdP falso, todas mortas com o processo; os três da PR #51 também: os do Google e do desvínculo mediram as premissas do Firebase no emulador de Auth, e o do teto de corpo não chegou ao Firebase; o da PR #52 também, com as contas do seed, `qa-in-app-notifications-google@example.com` no emulador de Auth e `qa-in-app-notifications@example.com`, cadastrada pela tela e apagada pela exclusão de conta; os dois da PR #53 também: o da borda da API mediu em `next start` contra o emulador, e o do sino usou as contas do seed e sete notificações `qa_bell_1` a `qa_bell_7`, todas mortas com o processo); o console não foi aberto |
| 16 | Branches mergeadas vivas no remoto | `PRE-PRODUCTION.md` | **continua aberto**, remedido em 2026-10-21 pós-PR #53: `git ls-remote --heads origin` devolve 52, ou seja, 51 além de `main` (eram 50; `guilhermebittelbrunn/cycle-command-v6` ficou viva depois do merge, como as das PRs #37 a #52) |
| 17 | Login com Google sem passe manual com conta real; desde a PR #48, também vincular e confirmar o Google num projeto real | *(só neste arquivo)*; o "User account linking" e os domínios autorizados estão no `FORKING.md` §4, passos 3 e 4 | **continua aberto, ampliado em 2026-10-19.** O `/test` da PR #24 não percorreu o Google no emulador; o da PR #48 percorreu, mas com o IdP falso do emulador. Ficaram 🔒 o popup real do Google, a escolha de "User account linking" do projeto (que muda o primeiro login com Google de uma conta com senha) e a mensagem de `auth/unauthorized-domain` num domínio fora da lista |
| 18 | `storage.rules` nunca publicado (o teste veio com a PR #31) | `PRE-PRODUCTION.md` §6 e `:54-58` | **metade fechada** pela PR #31: `storage.rules` e `firestore.rules` têm teste contra emulador no `verify` (20 e 145 testes; entrega em [`storage-emulator-rules-tests`](../docs/features/storage-emulator-rules-tests/spec.md)). **Continua aberto** publicar no projeto real, que depende da 11 |
| 19 | Conferir a retenção de log da plataforma | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: painel do provedor |
| 20 | Reabertura do consentimento no `ProfileDropdown` nunca vista num browser | *(só neste arquivo)* | **continua aberto** |
| 21 | No modo `simple` o titular não alcança a aba de privacidade | `PRE-PRODUCTION.md`, seção "Pendência — no modo `simple`…" | **premissa falsa, medida**: o `simple` não restringe o painel comum, então o titular alcança a aba. **Fechada pelo usuário em 2026-09-25.** A nota de correção fica no documento. Volta se o `simple` passar a restringir o painel comum (E10) |
| 22 | `NEXT_PUBLIC_PRIVACY_CONTACT` precisa ser definida por fork | `PRE-PRODUCTION.md` §7 (checklist) | **continua aberto, reduzido em 2026-10-19.** Vazia, o canal cai no formulário de contato, que desde a PR #49 entrega na caixa de `NEXT_PUBLIC_APP_SUPPORT_EMAIL` e mostra o canal como indisponível sem ela ou sem a Resend. Deixou de ser maquete, mas o fork ainda precisa definir uma das duas variáveis para o titular ter canal |
| 23 | Stripe por fork: catálogo recorrente, Customer Portal, endpoint de webhook na versão `2025-09-30.clover` com **seis** eventos (a PR #27 acrescentou `invoice.paid` e a PR #38, `entitlements.active_entitlement_summary.updated`, `PRE-PRODUCTION.md:506`, era `:456` até a PR #52), recursos cadastrados no Dashboard para o gate por recurso, conferir o custo do Entitlements, chaves na `apps/api`, TTL opcional de `paymentEvent`; e a decisão sobre checar assinatura duplicada na Stripe antes do release | `PRE-PRODUCTION.md` §12 | **continua aberto**. A PR #33 acrescentou ao §12 habilitar a edição do e-mail no Customer Portal, porque a troca de e-mail não atualiza o `customer`. Cinco critérios de `billing-subscription`, quatro de `admin-billing-insights` o cancelamento real no arquivamento pelo admin (PR #28) , o botão de checkout em carregamento (PR #32) a entrega real do evento de recursos (PR #38) e o catálogo, as chamadas e o checkout reais da `/pricing` (PR #47) e a segunda tentativa de arquivamento com assinatura viva (PR #50) e os três avisos de mudança da assinatura no sino (PR #52) seguem 🔒 até uma conta real existir. A PR #47 acrescentou ao §12 o parágrafo da página de preços (`PRE-PRODUCTION.md:526-531`, era `:476-481` até a PR #52), sem passo novo: o catálogo é o mesmo da aba de cobrança. `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` seguem vazias nos `.env` locais |
| 24 | 🆕 `ARCJET_KEY` por fork: sem ela o rate limit é no-op, e o cadastro pela API passa a depender dela (a rota usa o Admin SDK, fora do limite do Firebase por IP) | `PRE-PRODUCTION.md` §8 (`:645-663`, era `:594-609` até a PR #49 e `:595-613` até a PR #52) | **aberto**, entrou com a PR #29. Critério 19 do `/test` da fatia 1 🔒. Desde a PR #36, a chave precisa ter o prefixo `ajkey_`: sem ele, a API trata a chave como ausente e registra um erro no boot, e o build de `app` e `web` falha (`PRE-PRODUCTION.md:660-662`). A chave válida contra a Arcjet real segue 🔒 (`/test` da tarefa `arcjet-key-lazy-validation`). O `/test` da PR #46 deixou 🔒 o `429` do `/auth/sign-in`, pelo mesmo motivo (remedido em 2026-10-16). Desde a PR #49 a lista inclui `POST /contact`, e o §8 diz que, sem a chave, qualquer script enche a caixa de suporte e gasta a cota da Resend (`:653-654`); o `429` real da rota ficou 🔒. Desde a PR #51, sem a chave, nada limita quantos corpos acima do teto alguém manda às rotas públicas; até a PR #53 cada um prendia uma conexão por até cerca de 300 s, e desde ela o `413` fecha a conexão, então sobra o custo de cada invocação |
| 25 | 🆕 Fechar o cadastro pelo REST do Identity Toolkit com a chave pública, que ainda aceita senha de 6 ou 7 (Identity Platform: password policy em `ENFORCE` ou cadastro pelo cliente desligado) | `PRE-PRODUCTION.md`, "Declaração — o que a política de senha não alcança" | **opcional, declarado**: o upgrade tem custo ou teto (3.000 DAU no Spark). Critério 18 do `/test` da fatia 1 🔒 |
| 26 | 🆕 Marca por fork: `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_LOGO_URL` e `NEXT_PUBLIC_APP_SUPPORT_EMAIL` nos projetos `app`, `web` e `api`, logo numa URL `https` pública, ícones do produto no lugar dos padrões | `PRE-PRODUCTION.md` §13 (`:777-790`, era `:723-734` até a PR #49 e `:727-740` até a PR #52) | **aberto**, entrou com a PR #30. Sem ela, o produto sobe com o nome `next-boilerplate`; não bloqueia nada. Desde a PR #33, sem `NEXT_PUBLIC_APP_SUPPORT_EMAIL` o aviso de troca de e-mail sai sem a linha de suporte, que é o canal para contestar (`PRE-PRODUCTION.md` §3). Desde a PR #49, sem ela o formulário de contato fica indisponível, e a variável precisa estar na `api` (o destino) e na `web` (decide se o formulário aparece) (`:786-789`) |
| 27 | 🆕 Custo e latência da leitura de sessão em cada requisição autenticada | *(só neste arquivo)*; a declaração de sessões do `PRE-PRODUCTION.md` (`:890`, era `:831` até a PR #49 e `:838` até a PR #52) fala da recusa, não do custo | **aberto**, entrou com a PR #39. Toda requisição autenticada lê o documento da sessão antes do guard (`session-tracker.ts:106-134`), além da leitura do perfil. No emulador, `GET /auth/session` p50 9,3 ms; em produção, latência e consumo da cota de leituras do Firestore não foram medidos (🔒 no `/test`) |
| 28 | 🆕 Política de TTL em `notification.expiresAt` (90 dias), e os dois índices compostos de `notification` | `PRE-PRODUCTION.md` §1.9 (`:251-296`) | **aberto**, entrou com a PR #52. Os índices foram medidos em 2026-10-20 e de novo em 2026-10-21 e não estão publicados no projeto de referência (somam às linhas 1 a 4). A TTL exige faturamento ativo no projeto; sem ela nada quebra, as notificações ficam até a exclusão da conta e o prazo de 90 dias do `ROPA.md` §10 deixa de valer. A auditoria não tem leitura da TTL pelas ferramentas que usa; conferir com `gcloud firestore fields ttls list`. Os critérios 18 e 19 do `/test` ficaram 🔒 |

A 21 foi fechada pelo usuário em 2026-09-25. A 18 fechou pela metade em 2026-09-29, e a 12 em 2026-09-30. A 4 foi medida no projeto de desenvolvimento em 2026-09-30. A 23 cresceu com as PRs #27, #28, #32, #33, #38 e #47; a 24 e a 25 vieram da PR #29; a 26, da PR #30, e ganhou peso com a #33. A 13 ganhou um 🔒 com a #33, e a 24, um com a #36. A 27 veio da PR #39. A 17 cresceu com a PR #48. A 22 diminuiu com a PR #49, e a 10, a 13, a 24 e a 26 ganharam um caso cada. A 8 e a 23 ganharam um caso cada com a PR #50. Com a PR #51, a 8 trocou um caso por outro e a 24 ganhou um. Com a PR #52, as linhas 1 a 4 passaram a oito índices, a 8 e a 23 ganharam um caso cada, e entrou a 28. A PR #53 não mudou nenhuma.

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo.

> **Em 2026-10-16, duas linhas saíram daqui** porque a descoberta as reabriu com argumento novo, escrito no topo de
> cada spec: "Notificações in-app + preferências" (3/10, "Esforço G à mão; a referência terceiriza num serviço
> pago") virou [`in-app-notifications`](../docs/features/in-app-notifications/spec.md), entregue pela PR #52, com 4/10 remedido e corte sem preferências nem
> tempo real; "Consertar o formulário de contato da landing" ("Não é spec, é achado") virou
> [`contact-support-channel`](../docs/features/contact-support-channel/spec.md), entregue pela PR #49, com 2 de 4 starters verificados e dois consumidores
> novos no core. Entraram nove linhas novas, marcadas com a data.
>
> **Em 2026-10-04, a linha "Tela de sessões e dispositivos ativos" saiu daqui**: virou a fatia 2 de
> [`account-security-mfa`](account-security-mfa.md), entregue pela PR #39.
>
> **Em 2026-09-26, cinco linhas saíram daqui** porque viraram spec ou foram absorvidas:
> gate por plano → [`plan-entitlements`](../docs/features/plan-entitlements/spec.md), entregue em 2026-10-04 (o bloqueio em `past_due`, trial, cupom,
> reembolso e faturas em UI própria voltaram como linha própria abaixo); RoPA, incidente, DPA e transferência
> internacional → [`compliance-docs-kit`](../docs/features/compliance-docs-kit/spec.md), entregue em 2026-09-30; troca de e-mail →
> [`account-email-change`](../docs/features/account-email-change/spec.md), entregue em 2026-09-29; emulador de Storage e testes de rules →
> [`storage-emulator-rules-tests`](../docs/features/storage-emulator-rules-tests/spec.md), entregue em 2026-09-28 ("promover admin pela UI" saiu porque já
> existe: campo de tipo no formulário de edição de usuário, `users/[id]/route.ts:137-138`, que desde a PR #37 trava o tipo do próprio perfil); task de teste do
> design system → [`accessibility-conformance`](../docs/features/accessibility-conformance/spec.md), entregue em 2026-09-29.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| **Bloqueio em `past_due` · trial, cupom, reembolso e faturas em UI própria · nome do plano traduzido** | — | Fora do corte de [`billing-subscription`](../docs/features/billing-subscription/spec.md) e de [`plan-entitlements`](../docs/features/plan-entitlements/spec.md). O Customer Portal cobre trial, cupom, reembolso e faturas; o bloqueio por situação é decisão de produto de cada fork. |
| 🆕 2026-10-16 **App instalável (manifest de PWA) · push no navegador** | 0 de 4 páginas de features lidas mencionam | O Next.js gera o manifest nativamente e HTTPS basta para instalar (doc do Next, atualizada em 2026-07-30); os ícones já vêm de `brand-config`. Sem sinal de mercado, é decisão de fork e cabe numa tarefa P quando alguém pedir. Push exige chaves VAPID e coleção de inscrições, custo que todo fork herdaria. |
| 🆕 2026-10-16 **Aviso global do admin para todos os usuários · modo manutenção** | 0 de 4 páginas lidas mencionam | Sem prevalência. Com [`in-app-notifications`](../docs/features/in-app-notifications/spec.md) entregue pela PR #52, o aviso para todos vira extensão dela (está no "Fora do corte" de lá): um tipo novo e um produtor que grava para cada perfil, ou uma coleção de avisos sem dono, que a central de hoje não lê. |
| 🆕 2026-10-16 **Convite de usuário pelo admin, no lugar da senha definida pelo admin** | não medido nos starters | O plugin de admin do Better-Auth cria usuário com senha, como este repositório (`users/route.ts:63`); o Clerk tem convite de aplicação por e-mail. Convite com link e expiração é o mesmo mecanismo dos convites de [`teams-organizations`](teams-organizations.md), `deferred`; desenhar agora um convite sem organização arrisca dois modelos. |
| 🆕 2026-10-16 **Lixeira e restauração de registros** | não medido (starters não trazem CRUD de domínio) | O soft delete existe (`base.repository.ts:229-231`) e `findById` ignora registro apagado. Restaurar é decisão de produto de cada fork sobre o próprio recurso. |
| 🆕 2026-10-16 **Seleção múltipla e ações em massa nas listagens · exportar a listagem do usuário** | não medido | O `Table` repassa as props do Antd, então `rowSelection` já passa (`table.tsx:11-12`, `:157`), e o repositório base tem `deleteBulk` sem rota (`base.repository.ts:267`). Vira tarefa do fork quando a listagem dele pedir; a exportação do admin já está descartada acima. |
| 🆕 2026-10-16 **Aviso de pagamento pendente fora da aba de cobrança** | — | A aba já mostra o aviso (`AccountBillingPanel.tsx:146-150`). **Entregue pela PR #52** como produtor de [`in-app-notifications`](../docs/features/in-app-notifications/spec.md): o tipo `subscriptionPaymentPending` aparece no sino e leva à aba (`apps/app/shared/lib/notifications.ts:22-25`). A linha fica como registro; não há banner próprio. |
| 🆕 2026-10-16 **Exemplo de IA (chat, integração com LLM)** | 2 de 4 páginas lidas (Supastarter, Open SaaS) | Arrasta chave e custo por uso de um provedor pago para todo fork, e o caso de uso é do produto. Moda com vida útil incerta; fica com o fork. |
| 🆕 2026-10-16 **Passkeys · código de acesso por e-mail (OTP)** | 2/10 (Makerkit com os dois desligados por padrão; Supastarter com passkeys) | Passkeys já estão fora do corte de [`account-security-mfa`](account-security-mfa.md). Suporte nativo no Firebase a nenhum dos dois foi confirmado nesta rodada; o login sem senha fica com [`magic-link-sign-in`](magic-link-sign-in.md). |
| 🆕 2026-10-16 **Preferências de fuso horário e de e-mail · descadastro (unsubscribe)** | não medido | O fuso já é detectado no navegador e vai em cookie (`DisplayTimeZoneProvider.tsx:37-51`). O core só manda e-mail transacional, que não pede descadastro; o fork que mandar e-mail de marketing traz o mecanismo junto. |
| 🆕 **Jobs agendados (Vercel Cron) para expurgo e retenção** | — | Avaliado em 2026-09-26. Não há job concreto que o core precise rodar: o expurgo da trilha depende do prazo de retenção (E5) e o TTL de `paymentEvent` já é nativo do Firestore. Infra sem consumidor vira código morto. Reabrir quando E5 for decidida. |
| 🆕 **Exportar tabelas do admin em CSV** | não medido | Avaliado em 2026-09-26. Nenhuma tabela exporta hoje e nenhuma referência do painel foi verificada. Sem prevalência, é decisão de fork. |
| 🆕 **Aceite de termos e privacidade registrado no cadastro** | não medido | Avaliado em 2026-09-26. O aviso de privacidade é dever de informação (LGPD art. 9º), não consentimento; aceite de termos é decisão contratual de cada fork. Um link para os dois documentos junto ao botão de cadastro é achado P, não spec. |
| 🆕 **Avisos de segurança por e-mail (senha trocada, sessões encerradas, login novo)** | — | Avaliado em 2026-09-26. É o requisito 6.3.7 da ASVS 5.0.0, **nível 3** (6.3.5, login suspeito, também é nível 3). O aviso ao endereço antigo entrou em [`account-email-change`](../docs/features/account-email-change/spec.md), entregue pela PR #33, por ser barato; o resto espera pedido. |
| 🆕 **OpenAPI / documentação da API gerada** | — | Avaliado em 2026-09-26. O SDK é o contrato e a única porta para a API (regra de ouro 1); um segundo contrato gerado envelhece junto. Vale só se o produto for uma API, como as API keys. |
| 🆕 **Banir usuário pelo admin** | 4/10 (admin) | Já existe como desativar: `disabled` no `PUT /users/[id]` (`user-admin.schema.ts:21`, `users/[id]/route.ts:146-155`) e o switch da listagem (`UsersListClient.tsx:111-139`). Desde a PR #35, desativar também corta o bearer e revoga as sessões na hora; desde a PR #37, o admin não desativa a si mesmo. |
| 🆕 **CLI de criação de fork** | 1 de 4 verificados (next-forge) | Fora do corte de [`brand-config`](../docs/features/brand-config/spec.md), entregue em 2026-09-28 com o roteiro escrito (`docs/FORKING.md`). O script só vale depois que o roteiro se mostrar estável em forks reais. |
| 🆕 **`/.well-known/security.txt` e política de divulgação de vulnerabilidade** | não medido | Fora do corte de [`compliance-docs-kit`](../docs/features/compliance-docs-kit/spec.md), entregue em 2026-09-30 sem ele. É código na web, e o campo `Expires` do RFC 9116 exige manutenção. |
| **Coletor de erro gerenciado (Sentry, Better Stack, Axiom)** | prática 6 | A costura existe e está vazia: `onRequestError` nos três apps, sem ninguém do outro lado. Estacionado (E1). |
| **Passos de onboarding condicionais por papel ou plano · checklist de ativação · tour interativo** | — | Fora do corte de [`onboarding-flow`](../docs/features/onboarding-flow/spec.md), arquivada. Dependem de haver produto, e cada fork tem o seu. O fork acrescenta um passo editando `ONBOARDING_STEPS`. |
| **Coleta de dados de domínio no onboarding (empresa, cargo, segmento)** | — | Fora do mesmo corte. Não é genérico; é código do fork. |
| **Onboarding para a conta criada pelo admin** | — | Decisão D3 da entrega: o admin já informa o nome, e a mesma rota cria admins. O perfil sem o campo conta como concluído. |
| **Demais direitos do art. 18 com fluxo próprio · painel de pedidos de titular · exportação assíncrona** | — | Fora do corte de [`data-rights-lgpd`](../docs/features/data-rights-lgpd/spec.md), arquivada. O canal de privacidade cobre os demais pedidos por ora. |
| **Exclusão de conta sem senha (conta só Google)** | — | Fora da entrega: reautenticar conta federada exige outro fluxo. Pertence à iteração de "sessão recente" de [`account-security-mfa`](account-security-mfa.md). Desde a PR #48 a conta só Google tem um caminho, definir uma senha na aba Segurança, e o repositório tem uma prova de login Google recente (`recent-google-sign-in.ts:13-30`) que essa iteração pode reaproveitar. |
| **Histórico de acessos · IP, user-agent, dispositivo e geolocalização · presença em tempo real** | — | Fora do corte de [`user-activity-tracking`](../docs/features/user-activity-tracking/spec.md). IP mudaria a natureza jurídica do dado (Marco Civil art. 5º, VIII). |
| **Série temporal de acessos na home do admin** | — | `lastAccessAt` guarda um instante por perfil; série temporal exigiria a coleção de eventos que `user-activity-tracking` descartou. |
| **Backfill retroativo do último acesso** | — | Fora do corte, e a tela diz quando o registro de cada pessoa começa. |
| **Ordenação da coluna de último acesso pelo servidor** | — | O índice por `lastAccessAt` existe declarado (não publicado). Reavaliar quando a fila drenar. |
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
| **Contagem total de registros na listagem** | — | O `countQuery` (`base.repository.ts:139`) é a peça que faltava. Reavaliar quando alguém pedir. |
| **Registro auditável de consentimento no servidor** | — | Fora do corte de `cookie-consent`. A escolha vai no arquivo de exportação, lida do cookie do navegador (`useAccountDataRights.tsx:23-36`); prova no servidor segue inexistente. |
| **CMP certificada · TCF do IAB · geolocalização do visitante** | — | Arrastam serviço pago para todo fork. |
| Command palette (⌘K) | 2/10 | Valor estético. |
| Metering / limites de uso / créditos | 2/10 | Fora do corte de `plan-entitlements`, entregue em 2026-10-04 com o gate por status e por recurso, sem contagem de uso. |
| Feature flags | 2/10 | Variável de ambiente basta num MVP; `ONBOARDING_ENABLED` é o exemplo mais recente. |
| Firebase App Check | — | Exige configuração de projeto por fork. |
| Waitlist / captura de lead | 2/10 | Decisão do fork. |
| **Migrar a listagem de usuários para o cursor** | — | O N+1 de `userRepository.list()` vem primeiro. |
| **Detector de teste instável no CI** | — | O primeiro caso foi consertado na PR #22. Em 2026-09-28 apareceu um segundo, de causa diferente, só local (`useListAuditEvents.test.tsx`, 2 falhas em 53 execuções locais até 2026-10-21, pós-PR #53; ver achados), e o CI passou. Em 2026-10-19 apareceu um terceiro, também só local e sob carga (`actionMenu.test.tsx:419`, 1 falha em 8 execuções até a auditoria pós-PR #53; ver achados da tarefa `admin-archive-access-revocation`). O critério de reabertura era um segundo *flake* **no CI**; este ainda não conta. Consertar o teste é tarefa direta P. |
| Provedor de e-mail plugável · rastreio de abertura/clique | — | Fora do corte de `transactional-emails`. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Fora do corte de `file-upload-storage`. |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | Fora do corte de `observability-logging`. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto é uma API. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional. |
| SSO enterprise · SCIM | 0/10 | Só entra com o primeiro contrato enterprise. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | O pré-requisito (CI verde e estável) vale nas 30 últimas execuções do CI na `main`, até `d19e6fd` (`gh run list --branch main --limit 30`, todas `success`, remedido em 2026-10-21 pós-PR #53). Reavaliar junto com o branch protection (E3). |
| Remote Cache do Turbo | prática 1 | Arrasta conta e env; entra quando doer, como opt-in. |
| Limiar de cobertura que bloqueia merge | prática 5 | A cobertura já é medida e consolidada (`pnpm coverage`, job `coverage` do CI), pela PR #26. O limiar ficou fora do corte de [`e2e-testing`](../docs/features/e2e-testing/spec.md); reavaliar depois de algumas medições. |
| Changesets / versionamento · Storybook | — | Pacotes `private: true`; o `playground` serve de catálogo. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork. |
