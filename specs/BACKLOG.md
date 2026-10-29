# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue**. Spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última rodada:** 2026-10-28 (`/spec --sync`, pós-merge da PR #59, passo 1 de um `/cycle`; medições entre 17:50 e
> 18:40 BRT). **Anteriores:** a auditoria pós-PR #58 (2026-10-27), a pós-PR #57 (2026-10-23), com duas rodadas delta
> no mesmo dia, e, antes delas, mais de cinquenta rodadas desde a semeadura inicial de 2026-08-21. O detalhe de cada
> rodada está no histórico deste arquivo (`git log -- specs/BACKLOG.md`); a última versão com o texto da auditoria
> pós-PR #58 é a de `277da43`.
>
> **O que mudou nesta rodada (2026-10-28, pós-PR #59):**
> 1. **A PR #59 entrou em `main`** em 2026-10-28 às 17:07 UTC, no SHA `277da43`, a partir da branch
>    `guilhermebittelbrunn/cycle-value-task`, com 17 commits juntados pelo squash. A execução de merge do CI
>    (`gh run 40732626433`) passou nos quatro jobs, e o job `e2e` rodou o fluxo novo da equipe (23 de 23).
> 2. **Uma transição: `organization-ownership-transfer`, `proposed` → `done`.** Os cinco itens do corte foram conferidos
>    no código de `main`, e a spec foi arquivada em
>    [`docs/features/organization-ownership-transfer/spec.md`](../docs/features/organization-ownership-transfer/spec.md).
>    Ver [Entregas desta rodada](#entregas-desta-rodada-pr-59).
> 3. **Quatro achados fecharam e um foi reduzido** com a entrega: a trilha da equipe, os dois 🟢 do convite e a lacuna
>    🟡 de E2E da PR #57 fecharam; os três documentos da recusa ficaram com uma parte aberta. A revisão e o `/test`
>    deixaram dois 🟢 novos e cinco lacunas com veredito, em [Achados da PR #59](#-achados-da-pr-59-2026-10-28).
> 4. **A fila ficou sem spec elegível.** As quatro que seguem em `specs/` estão `deferred` ou `in-progress` sem feature
>    ativa, todas paradas por decisão sua (E1, E12 e o adiamento de 2026-10-16). A recomendação de #1 é uma tarefa
>    direta. Ver [A próxima](#a-próxima-tarefa-direta-app-auth-forms).
> 5. **Gates remedidos com `--force` e JDK 21:** 30/30 tasks em 2 min 57 s, 1055 arquivos no `pnpm check`, **3798**
>    testes em 339 arquivos (+39, todos da PR #59) e 274 contra o emulador (+9). Ver
>    [Gates](#gates-medidos-nesta-auditoria).
> 6. **Seis afirmações de documento corrigidas por medição:** a contagem de rotas do `docs/SECURITY.md` (56 arquivos,
>    38 com guard), que a PR não acompanhou, e quatro âncoras que ela deslocou. Ver
>    [Contradições doc × código](#contradições-doc--código).

## Contadores

Sobre as **4 specs que seguem em `specs/`**. Recontados do disco em 2026-10-28, pós-PR #59, lendo o frontmatter de
cada arquivo; os 33 `spec.md` arquivados em `docs/features/` têm todos `status: done`.

| status | qtd |
|--------|-----|
| `proposed` | 0 |
| `approved` | 0 |
| `in-progress` | 2 |
| `done` (arquivadas) | 33 |
| `deferred` | 2 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 2 (os dois `deferred`) · `confianca` 1 (`in-progress`) · `dx` 1 (`in-progress`).
**Por esforço:** P 0 · M 4 · G 0. **Por valor:** alto 1 · médio 3 · baixo 0.

**Transições aplicadas na auditoria pós-PR #59: 1.** `organization-ownership-transfer` foi de `proposed` para `done` e
saiu de `specs/` (conferência em [Entregas desta rodada](#entregas-desta-rodada-pr-59)). Para as quatro que seguem
aqui, a auditoria procurou no código de `main` a capacidade que falta (`git grep` por `GithubAuthProvider`,
`OAuthProvider`, `microsoft.com`, `mode: "payment"`, `multiFactor`, `TotpMultiFactor`, `passkey` e pelos SDKs de
coletor `@sentry`, `@logtail`, `@axiomhq` e `betterstack` em `apps/` e `packages/`, fora de testes: 0) e cruzou os 64
arquivos da PR com os 15 caminhos de `contends_on` delas: nenhum coincide. **Spec nova: 0.**

> **Elegíveis: 0 de 4.** `one-time-purchase` e `social-sign-in-providers` estão `deferred`, por decisão sua;
> `account-security-mfa` e `observability-logging` estão `in-progress` sem feature em andamento (E12 e E1).

## Entregas desta rodada (PR #59)

A PR #59 entrou em `main` em 2026-10-28 às 17:07:09 UTC, no SHA `277da43`, a partir da branch
`guilhermebittelbrunn/cycle-value-task`, fora do padrão `<project>/<type>/<title>`: o `/review` propôs
`feat/organization-ownership-transfer`, e a PR subiu da branch do workspace por instrução sua, como registra o
`STATE.md` da feature (E11). São 17 commits juntados pelo squash: cinco `feat(api)`, dois `feat(app)`, um `feat(sdk)`,
um `feat(internationalization)`, um `fix(internationalization)`, um `fix(design-system)`, três `test(e2e)`, um de
documentos, a auditoria pós-PR #58 (`docs(specs)`) e os artefatos (`docs(features)`). Os quatro jobs da execução de
merge (`gh run 40732626433`) terminaram em `success`: `changes`, `verify` (17:07 a 17:11 UTC), `coverage` (até 17:12)
e `e2e` (17:07 a 17:11). O log do `e2e` mostra 23 testes de navegador passando, entre eles
`organizationOwnership.spec.ts:68` (22,6 s).

`git diff --stat c0c06f2 277da43`: 64 arquivos, +5007 e −548. Fora de `docs/features` e `specs`, 53: 27 de código fora
de testes (uma rota nova, `organization/members/[id]/ownership/route.ts`, e um componente novo,
`TransferOwnershipDialog.tsx`), 19 de teste (quatro novos: `organizationOwnershipRoute.test.ts`,
`organizationOwnershipTransfer.emulator.test.ts`, `organizationTransferKeyboard.test.tsx` e o E2E
`organizationOwnership.spec.ts`) e sete documentos. Nenhuma variável nova, nenhum índice, nenhuma dependência.

**Corte de MVP, item a item, no código de `main`:**

| item | veredito | o que o código mostra |
|------|----------|-----------------------|
| 1. Transferir a propriedade | ✅ implementado | `POST /organization/members/[id]/ownership` (`ownership/route.ts:43-91`), atrás da variável e do guard de organização com `role: "owner"`; a troca é uma transação com quatro leituras antes das três escritas (`organization-member.repository.ts:168-225`); recusas `403 ORGANIZATION_FORBIDDEN`, `404 ORGANIZATION_MEMBER_NOT_FOUND`, `400 ORGANIZATION_OWNERSHIP_TARGET_SELF` e `409 ORGANIZATION_OWNERSHIP_TARGET_ARCHIVED`, com copy nos três idiomas (`translations/packages/shared/utils.ts:160-162`, `:340-342`, `:529-531`); "Tornar dono" com diálogo na tabela (`OrganizationMembersTable.tsx:112-119`); a corrida tem três testes contra o emulador (`organizationOwnershipTransfer.emulator.test.ts:181`, `:202`, `:225`) |
| 2. Saídas do antigo dono | ✅ implementado | o antigo dono vira membro; sai (`organization/leave/route.ts:20-30`), é removido (`members/[id]/route.ts:50-63`), exclui a conta e aceita outro convite. A regra "dono com membros" lê todas as organizações de que a pessoa é dona (`organization-membership.ts:108-132`, `organization.repository.ts:24-37`). As quatro recusas que continuam valendo citam a transferência (`utils.ts:37`, `:79`, `:164`, `:179` em pt-br, e as linhas equivalentes em en e es) |
| 3. Organização sem dono ativo | ✅ implementado | `isOrganizationActive` lê o perfil do dono (`organization-invitation.ts:99-115`) e a prévia o usa (`invitations/preview/route.ts:42`); o aceite faz a mesma conferência dentro da transação (`organization-invitation.repository.ts:231-252`) e conta só membro de perfil vivo (`:260-292`) |
| 4. Trilha de auditoria | ✅ implementado | cinco ações novas no enum (`packages/sdk/src/types/audit/audit.ts:16-20`), gravadas pela transferência (`ownership/route.ts:75`), pelo convite (`organization/invitations/route.ts:142`), pelo aceite (`invitations/accept/route.ts:71`), pela remoção (`members/[id]/route.ts:66`) e pela saída (`leave/route.ts:37`); rótulos nos três idiomas (`translations/apps/app/pages/admin/auditTrail.ts:28-34`, `:77-81`, `:126-132`). O convite enviado grava rótulo `null`, sem o e-mail do convidado (deriva, ver [Deriva](#deriva)) |
| 5. Rede no CI | ✅ implementado | `apps/e2e/tests/organizationOwnership.spec.ts:68` percorre convite, aceite e transferência com a variável ligada na pilha inteira (`apps/e2e/support/stackEnv.ts:37`); passou no job `e2e` do merge. O convite entra gravado no emulador, não por link (deriva) |

**Achados deste arquivo que a entrega fechou:**

| achado | veredito | evidência |
|--------|----------|-----------|
| 🟢 entrada, saída, remoção e convite sem evento na trilha (Achados da PR #57) | ✅ fechado | item 4 acima |
| 🟢 o aceite de convite contava o membro arquivado | ✅ fechado | `refuseCurrentMembership` lê os perfis na transação e conta só os vivos (`organization-invitation.repository.ts:260-292`), com teste de emulador |
| 🟢 convites pendentes de um dono arquivado continuavam aceitáveis | ✅ fechado | item 3 acima |
| 🟡 lacuna: membros e convites sem fluxo na suíte E2E (PR #57) | ✅ fechada, com ressalva | item 5; a emissão do convite pela tela e a entrega do e-mail seguem sem rede no CI (🔒, pendência 13) |
| 🟢 três documentos da recusa sem a exceção do perfil arquivado | ⚠️ reduzido | o `PRE-PRODUCTION.md:946-950` fala em "membro vivo" e cita a transferência; o `ROPA.md:193` e o `INCIDENT-RESPONSE.md:52` passaram a citar a transferência como saída, mas seguem sem dizer que perfil arquivado não conta |

**O pipeline da feature:** o `STATE.md` tem `analyze`, `develop`, `review` e `test` em `done`, `observe` pendente (é
opcional), `spec: organization-ownership-transfer` e a branch real. O `/test` fechou com 16 ✅, 0 ❌ e 2 🔒 de 18
critérios; o ❌ da rodada 1 ("Tornar dono" pelo teclado abria e fechava o diálogo no mesmo Enter) foi corrigido no
`ActionsMenu` pelo `/review` e medido na rodada 2. A auditoria procurou senha, token, chave e e-mail fora de
`@example.com` nos seis arquivos de pipeline da pasta e não achou. As quatro contas de QA (`qa-ownership-*@example.com` e a do
seed) viveram só no emulador, como o relatório registra.

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
| [`leftover-ui-strings`](../docs/features/leftover-ui-strings/STATE.md) | #54, `af763bb`, 2026-10-21 | 🟡 o login da landing validava em pt-br nos três idiomas; 🟡 a tela de erro global da app fixa em inglês, com `lang="en"` |
| [`web-global-error`](../docs/features/web-global-error/STATE.md) | #54, `af763bb`, 2026-10-21 | a parte do `global-error` do 🟡 da `apps/web` sem `not-found`, `error` e `global-error`: a landing mostrava a tela embutida do Next, em inglês e sem botão de tentar de novo |
| [`web-auth-forms`](../docs/features/web-auth-forms/STATE.md) | #55, `df381f4`, 2026-10-21 | duas das três partes do 🟡 do login e do cadastro da landing (o login que não levava a lugar nenhum e o cadastro sem e-mail de verificação); 🟢 o cartão encostado na borda a 375 px; 🟢 a falta de `noValidate` nos dois formulários |
| [`global-error-theme`](../docs/features/global-error-theme/STATE.md) | #55, `df381f4`, 2026-10-21 | 🟢 as telas de erro global das duas apps sem estilo e sem tema |
| [`app-sign-up-copy`](../docs/features/app-sign-up-copy/STATE.md) | #55, `df381f4`, 2026-10-21 | a metade da app do 🟡 da copy do cadastro, com o "¿" do login em es nas duas apps; de quebra, o `<head>` do login e do cadastro da app, que lia a folha da landing |
| [`organization-guardrails`](../docs/features/organization-guardrails/STATE.md) | #58, `c0c06f2`, 2026-10-27 | 🟡 D10 (o admin arquivava o dono de uma organização com membros); 🟡 D11 (o rate limit dos convites contava a leitura da tabela); 🟢 a falha do Auth na conferência do convidado virava `500` sem código. Tabela de conferência na versão deste arquivo em `277da43` |
| [`organization-archived-member`](../docs/features/organization-archived-member/STATE.md) | #58, `c0c06f2`, 2026-10-27 | 🟡 um perfil arquivado pelo admin contava como membro e travava a saída do dono |

As tabelas de conferência item a item de cada tarefa direta estão nas versões deste arquivo que o squash da PR
seguinte levou junto (de `02c31b5`, pós-PR #36, a `277da43`, pós-PR #58), e as pastas das features guardam o resto.

## Gates medidos nesta auditoria

Executados em 2026-10-28, entre 17:53 e 17:57 BRT, com `--force`, neste workspace, com o `HEAD` em `277da43` (igual a
`origin/main`) e o working tree limpo. Não copiados do `/test` nem da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **1055 arquivos · 0 erros** (`No fixes applied`). Eram 1048: a PR #59 criou sete arquivos |
| `pnpm turbo run lint typecheck test test:emulator --force`, com o JDK 21 de `/opt/homebrew/opt/openjdk@21` | ✅ **30/30 tasks · 0 em cache · 2 min 57 s**; `api#test:emulator` **274 testes em 8 arquivos**; zero `error TS` no log. Ao fim, nenhuma das portas de emulador (8080, 9099, 9199, 4000, 4400, 4500, 9150, 8085) ficou ouvindo |

O `pnpm` usado foi o 10.19.0 de `/opt/homebrew/bin` (script de Node, arm64), e o `node_modules` já tinha o binário
`@biomejs/cli-darwin-arm64`; o problema de plataforma da rodada anterior não se repetiu.

O log do `@repo/design-system` segue com uma ocorrência do aviso `In HTML, <button> cannot be a descendant of
<button>`, do `DialogFooter` com `showCloseButton` (achado aberto em [Achados da PR #43](#-achados-da-pr-43-2026-10-09)).

**Nenhum dos testes instáveis apareceu.** `useListAuditEvents` passou (suíte da `apps/app`, 1108 testes), e o
acumulado fica em 2 falhas em 59. O caso de Escape do `actionMenu.test.tsx` (hoje em `:447`) passou; o acumulado local
fica em 1 falha em 14.

| workspace | arquivos | testes | Δ vs. 2026-10-27 pós-PR #58 |
|-----------|---------:|-------:|-----------------------------|
| `api` | 124 | 1679 | **+27** testes, **+1** arquivo (`organizationOwnershipRoute`, e casos novos em `organizationMembersRoute`, `organizationMembership`, `accountErasure`, `invitationsRoutes`, `organizationInvitationsRoute`) |
| `app` | 128 | 1108 | **+9** testes, **+1** arquivo (`organizationTransferKeyboard`, e casos novos em `organizationTeamPage` e `useOrganization`) |
| `@repo/email` | 7 | 208 | — |
| `web` | 26 | 207 | — |
| `@repo/design-system` | 14 | 172 | **+1** (o Enter que não reabre o item, em `actionMenu.test.tsx`) |
| `@repo/auth` | 12 | 136 | — |
| `@repo/internationalization` | 7 | 67 | — (a paridade cobre os códigos novos sem caso novo) |
| `@repo/shared` | 5 | 56 | — |
| `@repo/security` | 3 | 45 | — |
| `@repo/analytics` | 2 | 34 | — |
| `@repo/next-config` | 1 | 32 | — |
| `@repo/payments` | 4 | 22 | — |
| `e2e` | 2 | 17 | **+1** (`stackEnv.test.ts`; os testes de navegador rodam no `pnpm e2e`) |
| `@repo/sdk` | 4 | 15 | **+1** (`organizationAction.test.ts`, a ação de transferir) |
| **total** | **339** | **3798** | **+39** testes e **+2** arquivos, todos da PR #59 |
| `api#test:emulator` (fora da linha acima) | 8 | 274 | **+9** testes, **+1** arquivo (`organizationOwnershipTransfer.emulator`) |

CI: a execução de merge da PR **#59** (`gh run 40732626433`, SHA `277da43`) terminou em **`success`** nos quatro jobs.
As 30 últimas execuções do CI na `main` (`gh run list --branch main --limit 30`) estão verdes.

Branch protection segue **não ligado**, remedido hoje depois do merge da PR #59:
`gh api repos/:owner/:repo/branches/main/protection` → **404** ("Branch not protected"), `rulesets` → **`[]`**. O
repositório tem **59** PRs, nenhuma aberta.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter em 2026-10-28, pós-PR #59) e prioriza valor × esforço × custo de
adiar. Nenhuma spec está bloqueada por dependência, e **nenhuma é elegível**: as duas `deferred` seguem paradas por
decisão sua, e as duas `in-progress` esperam provedor ou recurso pago.

> **Critério de execução, sem exceção:** o que uma rodada autônoma consegue provar. O `/cycle` não
> provisiona infraestrutura, então spec cujos critérios dependem de conta em provedor volta com metade dos
> critérios "não verificados".

| # | id | valor · esforço | situação |
|---|----|-----------------|----------|
| 1 | [`social-sign-in-providers`](social-sign-in-providers.md) | médio · M | `deferred` em 2026-10-16. 5/10. A dependência foi entregue pela PR #48; resta o outro motivo do adiamento, nenhum fork pediu GitHub ou Microsoft. O GitHub não prova sob o emulador |
| 2 | [`one-time-purchase`](one-time-purchase.md) | médio · M | `deferred` em 2026-10-16. 4/10. Toda prova real depende de conta Stripe (pendência 23) |
| 3 | [`account-security-mfa`](account-security-mfa.md), **fatia 3** (segundo fator) | médio · M | `in-progress`, 4 de 6 itens entregues (fatias 1 e 2, PRs #29 e #39). Nenhuma feature ativa e **fora do conjunto elegível** enquanto o status não mudar (E12). Exige ativar o Identity Platform, com preço não confirmado |
| 4 | [`observability-logging`](observability-logging.md) | alto · M | `in-progress`, 5 dos 6 itens. O que falta é o coletor, que exige conta num provedor. Estacionada (E1) |

### A próxima: tarefa direta `app-auth-forms`

**Recomendação decidida para a rodada de 2026-10-28 (pós-PR #59): a tarefa direta `app-auth-forms`** (nome sugerido;
o `/analyze` define o slug), que junta quatro achados abertos das telas de autenticação. A fila de specs não tem
candidata elegível, e nenhuma das quatro restantes anda sem uma decisão sua.

**O que ela fecha, reconferido em `main` (`277da43`):**

1. 🟢 **Sessão recusada depois do login, com alerta em inglês fixo.** Quando a gravação do cookie falha, o
   `onAuthSuccess` engole o erro e mostra "Could not establish session" em qualquer idioma
   (`packages/auth/provider.tsx:353-370`, o texto em `:364`). Vale para os três logins: senha, Google e link. Fere a
   regra de ouro 2. A correção que o `/review` da PR #56 recomendou: mensagem traduzida primeiro, depois separar o
   corpo de `onAuthSuccess` numa função que lança.
2. 🟢 **Os seis formulários de autenticação da app sem `noValidate`.** Com `type="email"`, o navegador mostra o balão
   nativo, no idioma dele, antes da mensagem do Zod. Nenhum arquivo de `apps/app/app/[locale]/(unauthenticated)/` tem
   `noValidate` hoje.
3. 🟢 **O `AuthCard` da app encosta nas bordas a 375 px** (`apps/app/app/[locale]/(unauthenticated)/components/AuthCard.tsx:11-12`).
4. 🟢 **`auth/user-disabled` em en diz "User disabled."** (`translations/packages/auth/index.ts:55`; pt-br e es dizem
   "Esta conta foi desativada.").

**Por que ela.** São as primeiras telas de todo fork. Três dos quatro defeitos foram medidos por `/test` anteriores,
e a landing corrigiu dois deles (o `noValidate` e a margem a 375 px) na PR #55, então a receita já existe no
repositório. A prova é inteira sob o emulador e no
navegador local, sem 🔒 previsível. Esforço P a M, em `packages/auth`, nos formulários de
`apps/app/app/[locale]/(unauthenticated)/` e em duas folhas de i18n; não toca a folha de `apiErrors` nem o subsistema
de organização. Dois arquivos da tarefa (`SignInForm.tsx` e `SignUpFormClient.tsx`) estão no `contends_on` de
`social-sign-in-providers`, que está `deferred`, então não há colisão hoje.

**Alternativas descartadas nesta rodada:**

| candidata | por que não é a #1 |
|-----------|--------------------|
| o resto do `docs/SECURITY.md` atrás da PR #56 | P, só documento, sem efeito para quem usa o produto. Pode rodar ao lado, sem colisão |
| uma descoberta nova (`/spec` sem argumento) | entrega specs para triar, não uma funcionalidade. É o caminho se você quiser outra entrega grande: a última descoberta ampla foi em 2026-10-16 |
| reabrir [`social-sign-in-providers`](social-sign-in-providers.md) | o mesmo motivo da rodada anterior: nenhum fork pediu GitHub ou Microsoft, e o GitHub não prova sob o emulador |
| [`one-time-purchase`](one-time-purchase.md) | toda prova real depende de conta Stripe (pendência 23), e a D9 segue sem resposta |
| o `500` sem `error.code` nas leituras de recusa | pede um padrão comum de leitura que falha, que mexe em várias rotas da API. Vale como tarefa própria, M |
| os dois 🟢 novos da PR #59 | valor baixo: a tabela defasada depois de `ORGANIZATION_FORBIDDEN` repete o comportamento da remoção de membro, e a organização dormente foi decisão do plano |
| o Espaço que não ativa item do menu de ações | P no design system, mas o defeito é do `rc-menu`, e a correção pede decidir se o `ActionsMenu` trata o teclado por conta própria |

**Registro das recomendações anteriores:** a pós-PR #58 recomendou `organization-ownership-transfer`, entregue pela PR
#59. A rodada delta 2 de 2026-10-23 recomendou parar até a pilha virar PR, e a rodada delta 1 e a pós-PR #57 recomendaram
as duas tarefas que a PR #58 levou. A pós-PR #56 recomendou `teams-organizations`, entregue pela PR #57.

### Tarefas diretas candidatas

Na ordem em que a auditoria as pegaria quando não houver spec para rodar. Os quatro achados das telas de
autenticação da app (sessão recusada com alerta em inglês, `noValidate`, `AuthCard` a 375 px e `auth/user-disabled` em
en) saíram desta lista nesta rodada: juntos, são a #1, em [A próxima](#a-próxima-tarefa-direta-app-auth-forms).

- **O resto do `docs/SECURITY.md` atrás da PR #56** (`docs/SECURITY.md:7`, `:162`): P, só documento. A PR #57
  corrigiu as contagens (55 rotas, 18 sem guard, 17 caminhos de rate limit); seguem de fora o login por link entre os
  métodos de entrada, a regra de quem recebe o link e a rota de disponibilidade fora da lista de propósito.
- **Copy do cadastro da landing** (`translations/apps/web/pages/signUp/index.ts` e `sign-up-form-client.tsx:98`,
  `:179`): P, a mesma troca de chaves que a PR #55 fez na app.
- **Dois `AuthProvider` aninhados na web e a tela vazia do `signInStartedHereRef`** (`apps/web/app/[locale]/layout.tsx:36-37`,
  `packages/design-system/index.tsx:27-33`, `sign-in-form-client.tsx`): P a M. Ampliado nesta rodada: o `/test` da PR
  #56 viu dois `POST /api/auth/session` também na app, que monta um provider só.
- **Link de "esqueci a senha" no login da landing** (`sign-in-form-client.tsx`): P.
- **Componente `@repo/auth/components/sign-in` morto e a chave `components.header.noAccount` sem consumidor**
  (`packages/auth/components/sign-in.tsx:125`, `packages/auth/package.json:17`,
  `translations/components/header/index.ts:15`, `:33`, `:51`): P, apagar os dois.
- **`markRead` contra documento apagado** (`notification.repository.ts:63-68`): P, só `apps/api`. Valor baixo.
- **`radix-ui: latest` no design system** (`packages/design-system/package.json:25`): P, fixar a versão que o lockfile
  tem hoje (`1.6.7`).
- **`start` com porta fixa na `web` e na `api`** (`apps/web/package.json:7`, `apps/api/package.json:9`): P, numa forma
  que respeite `PORT`.
- **Laço de redirecionamento da conta arquivada antes da correção** (`user-merge.ts:62-68`, `apps/app/proxy.ts:256-271`,
  `authSession.ts:34-39`): P a M, `apps/app`, e pede uma medição que o `/test` não conseguiu montar.
- **A `apps/web` com `RESEND_*` e `@repo/email` sem envio** (`apps/web/env.ts:1`, `.env.example:2-3`,
  `package.json:19`): P, só config da web.
- **`getMergedUserFromIdToken` sem chamador** (`user-merge.ts:33-49`): P, `apps/api`.
- **`typecheck` do `packages/shared` e o hash do `typecheck` no turbo** (`packages/shared/package.json:11`,
  `turbo.json:11-14`): P e medido, mas mexe no lockfile e no `turbo.json`, que toda tarefa usa.
- **CI em `ubuntu-latest` durante a migração para o Ubuntu 26** (`.github/workflows/ci.yml:21`, `:60`, `:84`, `:142`):
  P, fixar `ubuntu-24.04` ou aceitar a migração.
- **Guard de redirect: decodificação dupla e teste fora do pacote** (`packages/auth/redirect.ts:27`,
  `apps/app/__tests__/postAuthRedirectTarget.test.ts`): P.
- **A `apps/web` sem `not-found`, `error` e `favicon.ico`**: M, e criar um root layout na web mexe no mesmo lugar que
  o idioma do servidor usa (PR #41).
- **Aparelho encerrado com a tela aberta não sai sozinho** e **sessão expirada que perde a query**
  (`packages/auth/provider.tsx`): M.
- **Tela de erro global da `apps/api` com texto fixo** (`apps/api/app/global-error.tsx:19-22`): P, valor quase nulo.
- **Nome de marca longo no header a 1024 px**: decisão de produto (a marca sai do centro).

**Os demais candidatos não mudaram de motivo desde 2026-10-07 e não são mais reapresentados** (§5.1): o contraste
do seletor de tamanho da paginação, o `CommandDialog` em inglês, o 404 de arquivo inexistente (O1 da PR #41), as
rotas fora do rate limit, as âncoras de documento deslocadas, o código do erro em recusa esperada, o idioma das
preferências, o asterisco do `Label`, o foco que sai do botão de enviar e o `data-day`. O motivo de cada um está na
linha do achado, em [Achados](#achados-correções-pontuais-não-specs).

## Lotes paralelos

Recalculado em **2026-10-28**, na auditoria pós-PR #59, a partir do `contends_on` de cada spec, lido do disco, pelo
algoritmo de [`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3. Os 15 caminhos declarados pelas quatro specs são distintos entre si e existem no disco.

**Elegíveis agora: 0 de 4, então não há lote.**

**Quem ficou de fora, nominalmente:** `social-sign-in-providers` e `one-time-purchase` por estarem `deferred`, e
`account-security-mfa` e `observability-logging` por estarem `in-progress` sem feature ativa. Nenhuma ficou de fora por
colisão nem pelo teto de 3. Pelo `contends_on`, as quatro são disjuntas duas a duas. Fora do campo,
`social-sign-in-providers` e `account-security-mfa` convergem em `packages/auth`, e `social-sign-in-providers`
acrescentaria rota a `apps/api/proxy.ts`.

**A ordem recomendada e os lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a pena fazer*; o lote
diz *o que pode ser feito junto sem uma spec pisar na outra*. Se você só vai rodar uma coisa, rode o #1 da ordem, que
nesta rodada é a tarefa direta de [A próxima](#a-próxima-tarefa-direta-app-auth-forms).

**Tarefas diretas que podem ir ao lado da #1 sem colisão prevista:** o resto do `docs/SECURITY.md` (só documento), as
da `apps/web` (copy do cadastro da landing, link de "esqueci a senha") e as da `apps/api` fora de `packages/auth`. As
que tocam `packages/auth/provider.tsx` (a tela vazia do `signInStartedHereRef`, o aparelho encerrado) ficam para
depois dela.

**Lição da PR #59 para o campo:** a spec declarou quatro arquivos; a entrega tocou os quatro e mais 49 fora da lista
(contados fora de `docs/features` e `specs`). Desta vez todo arquivo declarado foi tocado; o erro para menos
continua. Os de convergência que ela não previu: `account-erasure.ts` (o expurgo passou a
ler a lista de organizações), `organization-membership.ts`, `organization.repository.ts`, a folha de `apiErrors`, o
`action-menu.tsx` do design system e sete documentos. **Lições anteriores:** `user-merge.ts` (toda spec que reage à
criação de conta), `log.ts` (toda spec que cria escopo de log), a folha de `apiErrors`, `parseRequestJson` e
`apps/api/proxy.ts` (toda rota nova), a exportação de dados (`account-export.ts` e o `AccountDataExportDTO`) e o enum
`AuditAction` com o mapa de rótulos da trilha. A PR #57 tocou 131 arquivos fora da lista, entre eles `plan.ts`,
`storage.ts`, `entity-photo.ts`, os dois `env.ts` e os dois `proxy.ts`.

### Nota de processo: a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por processo, não por
dado (ver [`README.md`](README.md#depends_on--contends_on)). As PRs #40 a #59 tocaram este arquivo só para levar a
auditoria anterior, feita num workspace só.

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma previsão feita lendo o corte de MVP, e o
histórico mostra que ela erra para menos quase sempre: entregas de spec tocaram de 2 a 131 arquivos fora da lista (o teto é a PR #57), e
as PRs #38 e #39, que rodaram em paralelo, dividiram seis arquivos sem declarar nenhum. Nenhuma rodada registrou
conflito de merge causado por esses erros.

## Precisam de decisão

Uma aberta, a D9, que espera a compra avulsa voltar da fila. A D13 saiu: `organization-ownership-transfer` foi ao
ciclo como estava, e a PR #59 a entregou com o corte de cinco itens e as três respostas recomendadas da spec (o admin
não transfere, o antigo dono fica como membro, a transferência não pede a senha de novo). As demais seguem em
[Decisões estacionadas](#decisões-estacionadas-51).

| # | pergunta | recomendação | por quê |
|---|----------|--------------|---------|
| D9 | Na compra avulsa, o estorno feito no painel da Stripe retira o acesso? | sim, quando a spec voltar da fila | sem isso, o acesso vitalício sobrevive ao dinheiro devolvido. A spec está `deferred` desde 2026-10-16, então a pergunta só volta junto dela |

Respondidas por você na triagem de 2026-10-16, todas pela recomendação: D3 (a triagem), D4 (o CTA de preços leva ao
cadastro da app), D5 (definir a primeira senha numa conta só Google encerra as outras sessões), D6 (a central de
notificações), D7 (o contato entrega em `NEXT_PUBLIC_APP_SUPPORT_EMAIL`) e D8 (o link mágico não cadastra, cumprida pela
PR #56). Cada uma está na seção "Decisões" da spec dela. **Respondidas pelo merge da PR #58 (2026-10-27):** D10 e D11,
pela opção (b), e D12, pela PR única. **Respondida pelo merge da PR #59 (2026-10-28):** D13, como recomendado.

Resolvidos sem pergunta na auditoria pós-PR #59, por medição:

- **O CI no SHA de merge da PR #59**: verde nos quatro jobs (`gh run 40732626433`; `verify` das 17:07 às 17:11 UTC,
  `e2e` até 17:11 UTC, com `organizationOwnership.spec.ts` entre os 23), e as 30 últimas execuções na `main` também.
- **Quando a PR #59 entrou em `main`**: 2026-10-28 às 17:07:09 UTC (`gh pr view 59`, campo `mergedAt`).
- **Se o corte inteiro entrou em `main`**: sim, 5 de 5, conferidos no código de `277da43` (tabela em
  [Entregas desta rodada](#entregas-desta-rodada-pr-59)).
- **Se a branch da PR #59 foi apagada no remoto**: não. `git ls-remote --heads origin` devolve 57 cabeças, 56 além de
  `main`, com `guilhermebittelbrunn/cycle-value-task` viva (pendência 16).
- **Se a PR #59 mudou a superfície da API**: uma rota nova, com guard, fora do rate limit (seis das nove rotas de
  organização ficam fora da lista). O `docs/SECURITY.md` não acompanhou a contagem de rotas (55 e 37); esta auditoria
  corrigiu para 56 e 38.
- **Se os artefatos da PR #59 vazaram credencial**: não; a auditoria procurou senha, token, chave e e-mail fora de
  `@example.com` nos seis arquivos de pipeline de `docs/features/organization-ownership-transfer/` e não achou.
- **Se os testes instáveis reapareceram**: não, numa execução (ver [Gates](#gates-medidos-nesta-auditoria)).

## Decisões estacionadas (§5.1)

Recomendações que apareceram em duas rodadas ou mais com a mesma resposta. Pela
[§5.1 da `cycle-policy`](../.claude/cycle-policy.md), elas **param de ser reapresentadas** até você mexer.
Cada uma tem dono e endereço. O histórico de cada célula está na versão deste arquivo em `9c793c6`. Nenhuma saiu na
rodada pós-PR #59; E3, E4, E11 e E14 ganharam a medição dela.

| # | questão | dono | onde mora a decisão | recomendação registrada |
|---|---------|------|---------------------|-------------------------|
| E1 | `observability-logging` fecha como entregue, com o coletor virando spec P própria? (16 rodadas) | você | `docs/PRE-PRODUCTION.md` §11 (o coletor) | fechar e abrir spec P do coletor. A E12 pede a mesma coisa para `account-security-mfa` |
| E3 | Ligar branch protection na `main` | você, no painel do GitHub | `docs/PRE-PRODUCTION.md` §9 | ligar, exigindo `verify` e `e2e`; não há pré-requisito técnico. É o que falta para o item 2 de [`e2e-testing`](../docs/features/e2e-testing/spec.md). Remedido em 2026-10-28, pós-PR #59: 404, `[]`, 59 PRs |
| E4 | O gate `approved` não é usado: das 33 specs entregues, as últimas a passar por ele foram as da triagem de 2026-10-16; `plan-entitlements`, `in-app-notifications`, `magic-link-sign-in` e `organization-ownership-transfer` entraram no ciclo ainda `proposed`, e `teams-organizations` entrou `deferred` e saiu `done` sem passar por `approved` | você | `specs/README.md` (ciclo de vida) | remover `approved` do ciclo de vida ou fazer o `/cycle` recusar spec não aprovada; a auditoria recomenda a primeira |
| E5 | Prazo de retenção da coleção `auditEvent` | você | `docs/PRE-PRODUCTION.md` §1.3 | decidir um prazo padrão sem invocar o art. 15 do Marco Civil |
| E6 | Teto absoluto da sessão ultrapassável por até meia vida de cookie | — | `docs/PRE-PRODUCTION.md`, seção "Declaração — por quanto tempo uma sessão pode ser renovada" | manter o comportamento; o número está escrito onde o fork lê |
| E7 | Busca da tabela enxerga só as páginas carregadas | quem sentir a dor | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | abrir spec quando houver caso de uso |
| E8 | Como medir visitas à `apps/web` | quem pedir | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | o contador próprio é a única saída sem conta nem variável obrigatória |
| E9 | O deep link das abas da conta (`?tab=`) não acompanha a barra lateral | você | [Achados](#-ui-i18n-e-front-end), linha de `AccountTabs.tsx` | derivar a aba do `?tab=` a cada navegação, aceitando um `router.replace`; a escolha contrária está comentada no código (`AccountTabs.tsx:55-57`) |
| E10 | O que o modo `simple` deve fazer (a documentação descreve um redirecionamento que não existe) | você | achado A1 em [Achados](#-achados-abertos-reconferidos-ou-herdados) | **o usuário decidiu ignorar o modo por ora (2026-09-25)**. Não reapresentar até ele mexer |
| E11 | O registro da feature não acompanha o merge, e a branch sai fora do padrão `<project>/<type>/<title>` | você | `.claude/rules/git-commits.md` e `.claude/skills/spec-audit/SKILL.md` §4.1 | **Atualizado em 2026-10-28, pós-PR #59:** a PR #59 saiu de `guilhermebittelbrunn/cycle-value-task`, **fora do padrão**; o `/review` propôs `feat/organization-ownership-transfer`, e a PR subiu da branch do workspace por instrução sua, como a nota do `STATE.md` registra. O `STATE.md` dela traz `review: done` e a branch real, que é o que esta linha pede. É a vigésima primeira PR (#37, #40 a #59) cujo squash leva a auditoria anterior junto. Seguem **25** `STATE.md` com `review: in-progress` depois do merge, entre 66 pastas. **Registro de 2026-10-27, pós-PR #58:** a PR #58 saiu de `api/fix/organization-guardrails`, a branch que o `/review` propôs, **dentro do padrão** `<project>/<type>/<title>`. Os dois `STATE.md` dela seguem com a branch marcada como "proposta" e `review: done`. Ela é a vigésima PR (#37, #40 a #58) cujo squash leva a auditoria anterior junto. Seguem **25** `STATE.md` com `review: in-progress` depois do merge, entre 65 pastas. O registro da PR #57 está na versão deste arquivo em `277da43`. Recomendação: a regra aceitar `fix/<slug>` e `feat/<slug>` para tarefa que cruza vários apps (como já aceita para épico), e a auditoria, ao confirmar o merge, gravar no `STATE.md` a linha `review` como `done` com o SHA e a branch |
| E12 | O destino da fatia 3 de `account-security-mfa` (segundo fator com códigos de recuperação, itens 5 e 6). Opções: **(a)** arquivar a spec como entregue em 4/6 e abrir uma spec `proposed` só do segundo fator; **(b)** voltar a spec para `proposed`, com as fatias entregues registradas nela; **(c)** manter `in-progress`; **(d)** marcar a fatia 3 como `deferred` dentro da spec | você | a spec [`account-security-mfa`](account-security-mfa.md) | **(a)**. Com `in-progress` e nenhuma feature ativa, a spec fica fora dos lotes para sempre. A pasta de destino ainda não tem `spec.md` (reconferido em 2026-10-22), então não há colisão |
| E13 | Ligar o bloqueio de bot da landing? Hoje ele nunca roda, nem com chave válida (achado do `skipValidation` da `apps/web`) | você | [Achados](#-repositório-rotas-e-proxy), linha do `skipValidation` | não ligar agora e declarar a decisão. Ligar é pôr `detectBot` e `shield` em modo `LIVE` para visitante anônimo em todo fork que já tem a chave; pede teste próprio. Os documentos em `main` já descrevem o comportamento atual (`docs/SUBPROCESSORS.md:40`, `docs/FORKING.md:327-328`) |
| E14 | Qual spec levar ao `/cycle`, já que nenhuma está `approved`? | você | [A próxima](#a-próxima-tarefa-direta-app-auth-forms) | **Rodada pós-PR #59 (2026-10-28):** a fila ficou de novo sem spec elegível, e as quatro restantes dependem de decisão sua (E1, E12 e os dois adiamentos de 2026-10-16). A recomendação do `/cycle` é a tarefa direta `app-auth-forms`. Para voltar a ter spec na fila: uma descoberta (`/spec` sem argumento), destravar a E1 ou a E12 (cada uma abre uma spec P de provedor), ou reabrir `social-sign-in-providers`. **Rodada pós-PR #58 (2026-10-27):** a recomendação foi `organization-ownership-transfer`, escrita a pedido de foco seu e entregue pela PR #59. As rodadas anteriores estão na versão deste arquivo em `277da43` |

**Duas recomendações repetidas são decisões técnicas e deveriam virar linha de política.** A auditoria
não edita `.claude/`, então elas ficam aqui como texto pronto para você colar:

- Em `.claude/cycle-policy.md` §2: *"Spec cujo corte a auditoria contestou em duas rodadas não entra em
  `/analyze` sem um bloco 'Reescopo que o `/analyze` deve aplicar' na própria spec. Se o bloco não existir,
  o `/cycle` escolhe a próxima."* Caso medido: `onboarding-flow` ficou seis rodadas presa pelo corte contestado,
  ganhou o bloco numa rodada e foi entregue na seguinte, 5/5.
- Em `.claude/skills/spec-audit/SKILL.md` §4.1, antes do passo 5: *"Reescreva os links relativos de saída
  da spec para o caminho novo: `research/*.md` vira `../../../specs/research/*.md`, spec viva vira
  `../../../specs/<id>.md`, spec arquivada vira `../<slug>/spec.md`. Corrija também os links de entrada em outras
  specs, vivas ou arquivadas. Rode um verificador de links no arquivo movido e confirme zero mortos."* A rodada pós-PR #57
  fez isso à mão de novo, no link de saída de `teams-organizations` e nos quatro de entrada em specs arquivadas, e a
  pós-PR #59 também, no link de saída de `organization-ownership-transfer` para a nota de pesquisa. O repositório não
  tem verificador de links; a auditoria usou um script descartável fora dele. O passo também não cobre o link de
  entrada do `analyze/plan.md` da feature, que morreu de novo (o nono, ver o achado).

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-10-28, pós-PR #59 |
|------|--------------|------------------------|
| [`social-sign-in-providers`](social-sign-in-providers.md) | `linked-sign-in-methods` | ✅ satisfeita (PR #48, `44b2b04`), arquivada em [`docs/features/linked-sign-in-methods/spec.md`](../docs/features/linked-sign-in-methods/spec.md). A spec segue `deferred` |
| [`one-time-purchase`](one-time-purchase.md) | — | ✅ sem dependência |
| [`account-security-mfa`](account-security-mfa.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`). A spec está `in-progress`, com as fatias 1 e 2 em `main` |
| [`observability-logging`](observability-logging.md) | — | ✅ sem dependência |

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`social-sign-in-providers`](social-sign-in-providers.md) | Login com GitHub e Microsoft, ligados por configuração | produto | médio | M | `deferred` | ✅ `linked-sign-in-methods` |
| [`one-time-purchase`](one-time-purchase.md) | Compra avulsa com acesso vitalício | produto | médio | M | `deferred` | — |
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `in-progress` (fatias 1 e 2 entregues, PRs #29 e #39) | ✅ `account-settings` |
| [`observability-logging`](observability-logging.md) | Observabilidade: erros, tracing e logs estruturados | dx | alto | M | `in-progress` | — |

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
| `onboarding-flow` | 2026-09-24 | [`docs/features/onboarding-flow/spec.md`](../docs/features/onboarding-flow/spec.md) — **5/5 do corte** (PR #24, `d52c4f0`), 20/20 critérios sob o emulador. Deriva no item 3, o deep link que voltava sem a query string: **fechada pela PR #47** (`apps/app/proxy.ts:285`, `:247`). O texto da spec arquivada (`spec.md:246`) descreve a deriva como aberta e não foi editado |
| `billing-subscription` | 2026-09-25 | [`docs/features/billing-subscription/spec.md`](../docs/features/billing-subscription/spec.md) — **6/6 do corte** (PR #25, `a1f87d0`), mais o passo `billing` do expurgo herdado de `data-rights-lgpd`. 19 ✅ e 5 🔒 no `/test` (só conta Stripe real prova). ⚠️ Catálogo, portal, endpoint de webhook e chaves são passo manual por fork (`PRE-PRODUCTION.md` §12) |
| `admin-billing-insights` | 2026-09-25 | [`docs/features/admin-billing-insights/spec.md`](../docs/features/admin-billing-insights/spec.md) — **5/5 do corte** (PR #27, `0659ede`). 18 ✅, 4 🔒 e 1 ❌ anterior à entrega (hidratação em `/en` e `/es`). ⚠️ **Duas derivas** contra o bloco de reescopo, sem efeito na tela, aceitas pelo usuário; o endpoint da Stripe de cada fork precisa ganhar `invoice.paid` (`PRE-PRODUCTION.md:542`, âncora remedida em 2026-10-20, pós-PR #52; era `:456`) |
| `e2e-testing` | 2026-09-25 | [`docs/features/e2e-testing/spec.md`](../docs/features/e2e-testing/spec.md) — **4/5 do corte e 1 parcial** (PR #26, `c71755e`). ⚠️ O item 2 roda em toda PR mas **não bloqueia o merge** até o branch protection ser ligado (E3). O `STATE.md` segue com `test: blocked` pelo D3, corrigido na própria PR; o job `e2e` passou nas quatro execuções seguintes |
| `brand-config` | 2026-09-28 | [`docs/features/brand-config/spec.md`](../docs/features/brand-config/spec.md) — **5/5 do corte** (PR #30, `e07252a`), 14 ✅, 0 ❌ e 1 🔒 no `/test` (nome não ASCII na Resend). Primeira spec entregue depois de passar por `approved`. ⚠️ Marca, logo e ícones por fork são passo manual (`PRE-PRODUCTION.md` §13) |
| `storage-emulator-rules-tests` | 2026-09-28 | [`docs/features/storage-emulator-rules-tests/spec.md`](../docs/features/storage-emulator-rules-tests/spec.md) — **5/5 do corte** (PR #31, `2c285de`), 18 ✅, 0 ❌ e 1 🔒 no `/test`; o 🔒 (`verify` no GitHub) passou no merge, com 170 testes contra emulador. Segunda spec entregue depois de passar por `approved`. ⚠️ Deriva no item 5: o `build` não roda os testes contra emulador. Publicar `storage.rules` e ativar o bucket seguem passo manual (`PRE-PRODUCTION.md` §6) |
| `accessibility-conformance` | 2026-09-29 | [`docs/features/accessibility-conformance/spec.md`](../docs/features/accessibility-conformance/spec.md) — **6/6 do corte** (PR #32, `3e5ec4c`), allowlist do axe vazia e `e2e` 22/22 no merge. Terceira spec entregue depois de passar por `approved`. ⚠️ Duas derivas de letra (título por área, `aria-invalid="false"` sem erro); checkout em carregamento e leitor de tela real seguem 🔒. O diff introduziu e corrigiu antes do merge o "Excluir" ilegível no hover |
| `account-email-change` | 2026-09-29 | [`docs/features/account-email-change/spec.md`](../docs/features/account-email-change/spec.md) — **5/5 do corte** (PR #33, `f377c84`), 16 ✅, 0 ❌ e 1 🔒 no `/test` (entrega real do aviso pela Resend). Quarta spec entregue depois de passar por `approved`. ⚠️ Quatro derivas sem efeito no comportamento; o diff introduziu e corrigiu antes do merge dois defeitos de foco no diálogo novo. Resend, `FIREBASE_WEB_API_KEY` e o e-mail de suporte são passo manual por fork (`PRE-PRODUCTION.md` §3, §4 e §13) |
| `compliance-docs-kit` | 2026-09-30 | [`docs/features/compliance-docs-kit/spec.md`](../docs/features/compliance-docs-kit/spec.md) — **6/6 do corte** (PR #34, `c7aa4d9`), 18 ✅, 0 ❌ e 2 🔒 no `/test` (backup no Blaze e conformidade jurídica). Quinta spec entregue depois de passar por `approved`. ⚠️ Cinco derivas sem efeito no conteúdo. Preencher os `[FORK]`, aceitar os DPAs e decidir o backup são passo manual por fork (`PRE-PRODUCTION.md` §14) |
| `plan-entitlements` | 2026-10-04 | [`docs/features/plan-entitlements/spec.md`](../docs/features/plan-entitlements/spec.md) — **5/5 do corte** (PR #38, `2ed0df2`), 15 ✅, 0 ❌ e 1 🔒 no `/test` (entrega real da Stripe). Entregue sem passar por `approved` (E4). Sem deriva. ⚠️ Recursos cadastrados no Dashboard da Stripe, o sexto evento no endpoint e o custo do Entitlements são passo manual por fork (`PRE-PRODUCTION.md` §12, a partir da `:506`, que era `:456` até a PR #52); a demo em `entity` fica desligada sem `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` |
| `pricing-page-catalog` | 2026-10-16 | [`docs/features/pricing-page-catalog/spec.md`](../docs/features/pricing-page-catalog/spec.md) — **5/5 do corte** (PR #47, `dd31a95`), 21 ✅, 0 ❌ e 3 🔒 no `/test` (catálogo, chamadas e checkout contra conta Stripe real). Sexta spec entregue depois de passar por `approved`. ⚠️ Quatro derivas sem efeito no que o corte pedia: rota nova `GET /payments/catalog`, cache de uma hora por instância, rota fora do rate limit de propósito, e quem tem sessão volta pelo bounce do proxy. Fechou a deriva do deep link de `onboarding-flow` e um open redirect em `packages/auth/redirect.ts`. Nenhum passo manual novo: o catálogo é o mesmo do `PRE-PRODUCTION.md` §12 |
| `linked-sign-in-methods` | 2026-10-19 | [`docs/features/linked-sign-in-methods/spec.md`](../docs/features/linked-sign-in-methods/spec.md) — **6/6 do corte** (PR #48, `44b2b04`), 13 ✅, 0 ❌ e 3 🔒 no `/test` (popup real do Google, "User account linking" e `auth/unauthorized-domain` num projeto Firebase real). Sétima spec entregue depois de passar por `approved`. ⚠️ Quatro derivas sem efeito no que o corte pedia: desvincular no servidor, desvincular a senha encerra todas as sessões, definir senha também encerra todas, e `provider.tsx` intacto. Escolher o "User account linking" do projeto e autorizar os domínios do popup são passo manual por fork (`FORKING.md` §4, passos 3 e 4; declaração em `PRE-PRODUCTION.md:1103`, a seção da declaração, remedida em 2026-10-28 pós-PR #59; era `:1100` desde a PR #57 e `:978-1001` antes) |
| `contact-support-channel` | 2026-10-19 | [`docs/features/contact-support-channel/spec.md`](../docs/features/contact-support-channel/spec.md) — **5/5 do corte** (PR #49, `4eeb07b`), 16 ✅, 0 ❌ e 4 🔒 no `/test` (entrega real pela Resend, confirmação vista no navegador, `429` com `ARCJET_KEY` e e-mail preenchido num domínio real). Oitava spec entregue depois de passar por `approved`. ⚠️ Quatro derivas sem efeito no que o corte pedia: sem Resend o aviso só aparece no envio, o ROPA já tinha a atividade, o item do menu depende de `NEXT_PUBLIC_WEB_URL` e só aparece no painel comum, e cerca de vinte arquivos fora do `contends_on`. Definir `NEXT_PUBLIC_APP_SUPPORT_EMAIL` na `api` e na `web` é passo manual por fork; sem ela o canal fica indisponível (`PRE-PRODUCTION.md` §13, `:902-905`, remedida em 2026-10-28 pós-PR #59; era `:900-903` desde a PR #57 e `:786-789` antes) |
| `in-app-notifications` | 2026-10-20 | [`docs/features/in-app-notifications/spec.md`](../docs/features/in-app-notifications/spec.md) — **6/6 do corte** (PR #52, `3a118c6`), 17 ✅, 0 ❌ e 3 🔒 no `/test` (evento real da Stripe, índice ausente num projeto real e a TTL apagando o documento). Entregue sem passar por `approved` (E4). ⚠️ Três derivas sem efeito no que o corte pedia: dois índices compostos em vez de um, boas-vindas só para perfil comum, e contagem com teto de 100 lida a cada 120 s. Publicar os dois índices de `notification` e ligar a TTL em `expiresAt` são passo manual por fork (`PRE-PRODUCTION.md` §1.9, `:253`); medido em 2026-10-20, os índices não estão publicados no projeto de referência |
| `magic-link-sign-in` | 2026-10-22 | [`docs/features/magic-link-sign-in/spec.md`](../docs/features/magic-link-sign-in/spec.md) — **6/6 do corte** (PR #56, `9c793c6`), 16 ✅, 0 ❌ e 2 🔒 no `/test` (`429` com `ARCJET_KEY` e o provedor de link desligado num projeto real). Entregue sem passar por `approved` (E4). ⚠️ Uma deriva de escopo: o link vai só para conta com senha e e-mail confirmado, e o item 6 ficou atendido por construção. Ligar a variável, ativar "Link de e-mail" no console e autorizar o domínio são passo manual por fork (`PRE-PRODUCTION.md` §15, `:675-707`); desligado por padrão |
| `teams-organizations` | 2026-10-23 | [`docs/features/teams-organizations/spec.md`](../docs/features/teams-organizations/spec.md) — **5/5 do corte** (PR #57, `61a781e`), 23 ✅, 0 ❌ e 4 🔒 no `/test` (rate limit com `ARCJET_KEY`, entrega real do convite, índices publicados e TTL dos convites). Entrou no ciclo `deferred`, por instrução de foco, e saiu sem passar por `approved` (E4). ⚠️ Item 5 com ressalva: o admin ainda arquiva um dono com membros (D10). Deriva: membros e convites atrás de `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED`, desligada por padrão. Publicar os três índices de `entity` por `organizationId` antes do deploy, a TTL de convites e a variável nas duas apps são passo manual por fork (`PRE-PRODUCTION.md` §1.10 e §16) |
| `organization-ownership-transfer` | 2026-10-28 | [`docs/features/organization-ownership-transfer/spec.md`](../docs/features/organization-ownership-transfer/spec.md) — **5/5 do corte** (PR #59, `277da43`), 16 ✅, 0 ❌ e 2 🔒 no `/test` (envio do convite e rótulo de convite enviado, sem provedor de e-mail). Entregue sem passar por `approved` (E4). ⚠️ Três derivas escritas na spec: o E2E grava o convite no emulador em vez de ler link, o dono novo fica com duas organizações (a saída e o expurgo leem a lista), e o convite enviado não grava o e-mail do convidado. A rodada 1 do `/test` reprovou "Tornar dono" pelo teclado; o `/review` corrigiu no `ActionsMenu`. Nenhum passo manual novo: valem o `PRE-PRODUCTION.md` §16 e as pendências 13, 24 e 30 |

**Verificado na auditoria de 2026-10-28 (pós-PR #59):** `docs/features/` tem **66** pastas e **33** `spec.md`
arquivados, todos com `status: done`. Um arquivamento nesta rodada, `organization-ownership-transfer`, por `git mv`
(o rename fica no índice até o commit), com o frontmatter atualizado antes do movimento e o link de saída para a nota
de pesquisa reescrito para `../../../specs/research/`. As 33 pastas sem `spec.md` são `account-security-mfa` e
`account-active-sessions` (fatias 1 e 2 da spec `in-progress`), `observability-logging` (spec `in-progress`),
`auth-panel-context` e `impersonation-read-only` (as duas anteriores à semeadura) e as vinte e oito tarefas diretas
listadas em [Tarefas diretas entregues](#tarefas-diretas-entregues-sem-spec). O verificador de links rodado nesta
auditoria, um script descartável fora do repositório, sobre `specs/*.md`, `specs/research/*.md` e os 33 `spec.md`
arquivados, acha os mesmos dois alvos mortos das rodadas anteriores: o placeholder `research/<topico>.md` do
`TEMPLATE.md` e a âncora interna da spec de `session-refresh`. Todas as âncoras internas deste arquivo resolvem.

## Contradições doc × código

Nenhum gate lê prosa. Pela [`cycle-policy` §4](../.claude/cycle-policy.md), afirmação barata de medir num doc é
medida ao passar por ela. Esta tabela guarda só o que segue defasado ou errado; as linhas ✅ das rodadas anteriores
estão na versão deste arquivo em `9c793c6`. Até a rodada pós-PR #56 a auditoria não editava `docs/` (só os `spec.md`
arquivados, para mover a spec entregue e consertar os links que o movimento quebra). Desde a pós-PR #57, a pedido do
`/cycle`, ela corrige nos documentos as afirmações baratas de medir que estão falsas.

A PR #59 alterou sete documentos fora de `docs/features` e `specs` (`ARCHITECTURE.md`, `FORKING.md`,
`INCIDENT-RESPONSE.md`, `PRE-PRODUCTION.md`, `ROPA.md`, `SECURITY.md` e `SETUP.md`). Os trechos novos descrevem a
transferência, a posse de várias organizações no expurgo, a trilha da equipe e o E2E com a variável ligada, e conferem
com o código, por leitura (por exemplo, `organization-membership.ts:102-132`, citado em `SECURITY.md:40`). O que não
acompanhou foi a contagem de rotas do `SECURITY.md` e quatro âncoras que a PR deslocou no código, todas corrigidas
abaixo. As correções da rodada pós-PR #57 estão na versão deste arquivo em `277da43`.

**Corrigido nesta rodada, nos documentos:**

| documento | antes | depois |
|-----------|-------|--------|
| `docs/SECURITY.md:17-19` | 55 arquivos de rota, 37 com guard, medidos em 2026-10-22 | 56 e 38, medidos em 2026-10-28; a rota de transferência tem guard, e os 18 nus não mudaram |
| `docs/SECURITY.md:32-33` | "trinta e sete" rotas de negócio, `organization/*` ×6 | "trinta e oito", `organization/*` ×7 |
| `docs/PRE-PRODUCTION.md:588` | `account-erasure.ts:188` | `:199`, o `cancelSubscriptionForErasure` |
| `docs/SUBPROCESSORS.md:35` (Stripe) | `account-erasure.ts:172`, que já era o `step: "billing"` e não a chamada | `:189`, o `getStripe()` |
| `docs/INCIDENT-RESPONSE.md:64` | as ações auditadas em `audit.ts:2-11` | `:2-21`, o enum inteiro (a PR #59 somou cinco ações) |
| `docs/BACKUP.md:89` | o alvo do evento em `audit.ts:29-31` | `:40-42` (`targetType`, `targetUserId` e `targetLabel`) |

| documento | afirma | realidade medida | veredito |
|-----------|--------|------------------|----------|
| `docs/PRE-PRODUCTION.md:675-707` (item 15, novo pela PR #56) | só `"true"` liga, sem diferenciar maiúsculas; sem Resend ou sem `NEXT_PUBLIC_APP_URL` a opção some e o pedido responde `503 EMAIL_NOT_CONFIGURED`; a recusa do provedor sai como `[auth-action-link] refused kind=sign-in code=…`; desligar a variável recusa pedidos novos com `404 AUTH_EMAIL_LINK_DISABLED` e deixa os links já enviados concluírem | `email-link-sign-in.ts:4-8`; `request/route.ts:48-60`; `auth-action-links.ts:38-40`, `:102-117`; a conclusão é só no cliente (`client.ts:154-164`) | ✅ **honesto**, por leitura |
| `docs/SETUP.md:118-122` (novo pela PR #56) | o código do link aparece em `GET http://127.0.0.1:9099/emulator/v1/projects/demo-next-boilerplate/oobCodes` | o projeto do emulador é `DEMO_PROJECT_ID` (`packages/auth/emulator.ts:16`); o `/test` da PR leu o código por essa rota | ✅ **honesto** |
| `docs/SECURITY.md:7` e `:162` | os métodos de login são "e-mail/senha ou Google"; a lista de rate limit e o que fica fora dela | o login por link existe desde a PR #56; a regra de quem recebe o link (conta com senha e e-mail confirmado) e a rota de disponibilidade fora do rate limit de propósito não aparecem | ⚠️ **reduzido pela PR #57**, que corrigiu as contagens (55, 37, 18, 12 e 17). Segue o resto da PR #56 |
| `docs/features/organization-ownership-transfer/analyze/plan.md:3`, `teams-organizations/analyze/plan.md:3`, `magic-link-sign-in/analyze/plan.md:3` e os planos de `plan-entitlements`, `pricing-page-catalog`, `linked-sign-in-methods`, `contact-support-channel` e `in-app-notifications` (este também em `review/review.md:6`) | link para `../../../../specs/<id>.md` | as oito specs foram movidas para `../spec.md` | ❌ **nove links mortos**, criados pelos arquivamentos; o de `organization-ownership-transfer`, por este. A auditoria não edita os artefatos; ver o achado |
| `docs/features/session-refresh/spec.md:20` (arquivada) | aponta para `#entrega-—-o-que-foi-conferido` | o título `## Entrega — o que foi conferido` (`:170`) publica `#entrega--o-que-foi-conferido` | ❌ **âncora morta**, desde 2026-09-17. Achado novo |
| os `STATE.md` das PRs #37 a #56 | `review: in-progress` depois do merge, branch "proposta" que não subiu, notas citando linhas antigas deste arquivo | 25 dos 66 `STATE.md` com `review: in-progress` (recontados em 2026-10-28); as linhas citadas são de versões que as rodadas seguintes reescreveram | ⚠️ **defasados**, estacionados em E11 |
| `docs/SUBPROCESSORS.md:33` | a coleção `user` é declarada em `user.repository.ts:42` | o `super(db, "user")` está em `:46` | ⚠️ **deslocada** |
| `docs/PRE-PRODUCTION.md:578` (§12) | o gate por status é o `requirePlanApi` com `{}` | nenhuma rota usa o `requirePlanApi`; a criação de `entity` passa por `requireOrganizationApi({ plan })`, com a mesma checagem (`refusePlanRequirement`) | ⚠️ **nome defasado** pela PR #57; o comportamento descrito vale. Achado novo |
| `docs/PRE-PRODUCTION.md:220`, `:241` | "Quais das sete entradas", "Uma de sete" | 9 entradas declaradas; o texto já registra a medição de 2026-09-23 e o número de hoje | ⚠️ **histórico**, deixado para não mudar a âncora do título |
| `docs/SUBPROCESSORS.md:40` | o `skipValidation` está em `apps/web/env.ts:33`; o bloqueio de bot em `apps/web/proxy.ts:68` | `apps/web/env.ts:36`; `apps/web/proxy.ts:67` e `:72`. O comportamento descrito segue verdadeiro (E13) | ⚠️ **deslocadas** |
| `docs/ROPA.md:69` e `:83` | `lastAccessAt` em `user.ts:54-59`; `stripeCustomerId` e assinatura em `user.ts:62-65` | hoje `:55-60` e `:63-66` | ⚠️ **deslocadas** |
| `docs/ROPA.md` e `docs/SUBPROCESSORS.md` (inventário do perfil) | o perfil guarda telefone, avatar, preferências, onboarding, `lastAccessAt`, `stripeCustomerId` e assinatura | o perfil guarda também `entitlements` desde a PR #38 (`packages/sdk/src/types/user/user.ts:67-68`) | ❌ **omissão**. Ver o achado em [compliance-docs-kit](#-achados-da-entrega-compliance-docs-kit-2026-09-30) |
| `docs/AUTH-SSO.md:105` | o link "Ir para o painel" depende do modo, em `header/index.tsx:38` | a checagem está em `:66`, e o link em `:250-264` | ⚠️ **deslocada**; o parágrafo pertence à nota do modo `simple` (E10) |
| `docs/AUTH-SSO.md:66-71` e a pendência do modo `simple` no `PRE-PRODUCTION.md` | redirecionamento do comum para a web no `simple` | não existe; estacionado (E10) | ⚠️ nota de medição anterior segue no lugar |
| `docs/RESEARCH-tanstack-vs-next.md:40` e `:85` | `LanguageSwitcher.tsx:3`; o webhook usa `headers()` em `route.ts:4,43-44` | `LanguageSwitcher.tsx:1`; import em `webhooks/payments/route.ts:7` e chamada em `:287` | ⚠️ **deslocadas**; o documento é nota de pesquisa e não muda desde a PR #39 |
| `docs/FORKING.md:453` (link) | aponta para `../README.md#crud-de-referência` | o README publica `#-crud-de-referência` (medido em 2026-09-30) | ❌ **link morto** |
| `.claude/skills/write-tests/SKILL.md:8` | todo `vitest.config.mts` usa `environment: "jsdom"` | 2 dos 14 configs usam `jsdom`; os outros 12, `node` | ❌ **não descreve o repositório** |
| `docs/features/i18n-hydration-admin-delete-billing/test/report.md:67` | na troca suave de `/en/entities` para `/es/entities`, `lang` "passou a `es`" | o `/test` da PR #41 mediu o contrário no código anterior à correção | ❌ **afirmação não reproduzida**; sem efeito hoje |
| `docs/features/pricing-page-catalog/analyze/plan.md:349` e `develop/handoff.md:113` | o preço em BRL sai "R$ 29,00 / mes" em `es` | o `Intl` formata "29,00 BRL / mes"; o código está certo | ⚠️ **expectativa errada no plano**, já registrada nos artefatos da feature |
| `docs/features/date-input-navigation/analyze/plan.md` §9 e §10 | clicar no rótulo "Data" foca o botão; sob personificação o nascimento fica desabilitado | o clique abre o calendário; a personificação bloqueia só o envio | ⚠️ **texto do plano não descreve o código**; o `/test` corrigiu os critérios |
| `docs/features/onboarding-flow/spec.md:246` e `accessibility-conformance/spec.md:53-54`, `:166` (arquivadas) | a deriva do deep link segue aberta; o `danger` do antd recebe `colorError` em `var(...)` | o deep link fechou na PR #47 (`apps/app/proxy.ts:285`); o `colorError` é hex desde a PR #42 (`antd-app.tsx:136`) | ⚠️ **histórico**: as specs descrevem a data da entrega. Sem regressão |

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec. Esta tabela guarda
as linhas das specs vivas e a da spec arquivada nesta rodada; as derivas das outras specs arquivadas estão escritas
nelas e na versão deste arquivo em `277da43` (a de `teams-organizations`, por exemplo).

| id | especificado | implementado | leitura |
|----|--------------|--------------|---------|
| `account-security-mfa` (item 2) | sessões ativas "com dispositivo/origem e último uso" | navegador, sistema e tipo de aparelho tirados do user-agent, instante do login e do último uso; sem IP; app e web no mesmo navegador contam como uma sessão | **a spec estava imprecisa**. Gravar IP mudaria a natureza jurídica do dado. Nota escrita no item |
| `account-security-mfa` (item 3) | encerrar uma sessão específica | a API e os front-ends recusam a sessão encerrada; o refresh token do aparelho segue válido no Firebase | **a spec estava errada sobre o provedor**: o Firebase só revoga a conta inteira. Declarado em `docs/AUTH-SSO.md:74-76` e no `PRE-PRODUCTION.md`. Nota escrita no item |
| `organization-ownership-transfer` (item 5) | o aceite pela conta convidada "lendo o link sem caixa de entrada, como a suíte já faz com o emulador" | o convite não passa pelo Firebase Auth, e nenhum arquivo de `apps/e2e` lia link de e-mail; o teste grava o convite com token conhecido direto no emulador (`apps/e2e/support/firestoreEmulator.ts`) e percorre o aceite pela tela | **a spec estava errada** sobre a suíte. A emissão pela tela fica com os testes de rota; a entrega real é 🔒 (pendência 13). Nota na spec arquivada |
| `organization-ownership-transfer` (item 1) | nada sobre quem fica dono de duas organizações | `listOwnedBy` (`organization.repository.ts:24-37`); a regra de saída e o expurgo leem a lista (`organization-membership.ts:108-132`, `account-erasure.ts:81`) | **a spec estava incompleta**: sem isso, o expurgo do antigo dono apagaria a equipe transferida. Decisão do `/analyze`, documentada pela própria PR no `ROPA.md` e no `PRE-PRODUCTION.md` |
| `organization-ownership-transfer` (item 4) | e-mail permitido "no campo de rótulo que a trilha já usa" | o evento de convite enviado grava rótulo `null` | **a implementação desviou, de propósito**: o expurgo limpa rótulos por id de perfil, e um convidado sem perfil nunca teria o endereço apagado. Sem efeito no filtro por usuário |
| `organization-ownership-transfer` (área) | `area:` sem `packages/design-system` | a correção do Enter no `ActionsMenu` (`action-menu.tsx`, +8 linhas) vale para todo menu de ações do repositório | **defeito achado no caminho e corrigido na raiz**, como pede a `cycle-policy` §3 |
| `organization-ownership-transfer` (`contends_on`) | quatro arquivos | os quatro tocados, e 49 fora da lista | o erro para menos continua. Ver [Lotes paralelos](#lotes-paralelos) |

**Deriva de pipeline da PR #59:** 17 commits juntados pelo squash, com a auditoria pós-PR #58 num commit `docs(specs)`
próprio, como pede a `cycle-policy` §6. A branch saiu fora do padrão (E11). O `/test` reprovou um critério na rodada 1
("Tornar dono" pelo teclado), o `/review` corrigiu na raiz numa segunda passada, com um teste que falha sem a correção,
e a rodada 2 do `/test` fechou com 16 ✅ e 2 🔒. A branch ficou viva no remoto (pendência 16). Os registros de pipeline
das PRs anteriores estão nas versões deste arquivo que o squash da PR seguinte levou junto, a última em `277da43`.

### Âncoras relidas em 2026-10-28, pós-PR #59

As specs vivas que citavam arquivo alterado pela PR #59 com número de linha foram corrigidas, com o número antigo entre
parênteses, contra `git show c0c06f2:<arquivo>`:

| spec | o que mudou |
|------|-------------|
| `observability-logging` | `account-erasure.ts:263` → `:274`; `organization/invitations/route.ts:80` → `:82` e `:147` → `:162`. `logEvent(` fora de testes segue em **49**, e o `console` cru, em 19 |
| `account-security-mfa` | folha de `apiErrors`: `:282` → `:285` e `:463` → `:469` (`AUTH_PASSWORD_TOO_SHORT` em en e es); `account/deletion/route.ts:65-82` → `:66-83` |
| `social-sign-in-providers` | nada: os arquivos citados não foram tocados, e `docs/FORKING.md:175` segue certo |
| `one-time-purchase` | nada: `docs/PRE-PRODUCTION.md:604-607` segue certo |

Nenhuma nota de `research/` cita arquivo da PR com número de linha. Os 15 caminhos de `contends_on` das quatro specs
existem; nenhum foi tocado pela PR #59.

### O que a auditoria **não** encontrou

Nenhuma spec `done` perdeu código. A PR #59 mexeu em peças de `teams-organizations` (saída, remoção, aceite e
expurgo), `audit-log` (o enum e a tela da trilha), `e2e-testing` (a pilha da suíte), `data-rights-lgpd` (o expurgo lê a
lista de organizações) e de duas tarefas diretas, `organization-guardrails` e `organization-archived-member` (a regra de
saída do dono). Todas seguem inteiras: o dono com membros vivos continua recusado ao sair, ser removido, excluir a
conta e ser arquivado (`leave/route.ts:20-30`, `members/[id]/route.ts:50-63`, `account/deletion/route.ts:44`,
`users/[id]/route.ts:191-196`); o perfil arquivado segue sem contar (`organization-membership.ts:128-131`); e o expurgo
segue apagando a organização de casa, agora junto das recebidas (`account-erasure.ts:81`, `:129`, `:162-168`). A suíte
inteira (3798 testes, mais 274 contra o emulador) e o job `e2e` da execução de merge passaram. `git grep` pelas
capacidades das quatro specs restantes, em `apps/` e `packages/`, fora de testes, em 2026-10-28: 0. Nenhuma entrega
parcial órfã além da fatia 3 de `account-security-mfa`, que é a E12.

## Achados: correções pontuais, não specs

Coisas que não merecem spec própria, mas que são correções pontuais. Viram tarefa direta no `/analyze`.

> **Auditoria de 2026-10-28 (pós-PR #59).** A PR #59 alterou 27 arquivos de código fora de testes e sete documentos,
> fora de `docs/features` e `specs`. As linhas desta seção que citam um deles foram relidas em `main`, com a âncora
> comparada contra `git show c0c06f2:<arquivo>` e, nos documentos, pelo conteúdo. **Placar: 3 fechados · 1 reduzido ·
> 2 novos, em [Achados da PR #59](#-achados-da-pr-59-2026-10-28) · 1 reconfirmado (o Espaço do menu de ações) · 164
> abertos** (🟡 56, 🟢 103, ⚠️ 4, ⚪ 1), pela contagem direta das linhas com marcador de severidade nas tabelas
> `| achado |` desta seção. Os fechados são a trilha de auditoria da organização e os dois 🟢 do convite; a lacuna 🟡
> de E2E da PR #57, que fica numa tabela de lacunas e não entra nessa contagem, também fechou. O reduzido é o dos
> documentos da recusa. A conferência está em [Entregas desta rodada](#entregas-desta-rodada-pr-59). Nove âncoras de
> código foram remedidas nas linhas que as citam (`account-erasure.ts`, `organization-membership.ts`,
> `organization/invitations/route.ts`, `invitations/accept/route.ts`, `account/deletion/route.ts`, `action-menu.tsx` e
> `actionMenu.test.tsx`).
>
> **Auditoria de 2026-10-27 (pós-PR #58).** A PR #58 alterou cinco arquivos de código e seis documentos fora de
> `docs/features` e `specs`. As linhas desta seção que citam um deles foram relidas em `main`, com a âncora comparada
> contra `git show 61a781e:<arquivo>` e, nos documentos, pelo conteúdo. Dez âncoras foram remedidas (`users/[id]/route.ts`,
> `apps/api/proxy.ts`, `organization/invitations/route.ts` e `docs/SECURITY.md`). **Placar: 4 fechados · 3 absorvidos
> pela spec nova (contados como abertos até a entrega) · 0 novos · 165 abertos** (🟡 56, 🟢 104, ⚠️ 4, ⚪ 1), pela
> contagem direta das linhas com marcador de severidade nas tabelas `| achado |` desta seção. Os fechados são D10, D11,
> o `500` do convite e o 🟡 do membro arquivado; a conferência está na versão deste arquivo em `277da43`, e as linhas
> saíram das tabelas. Os absorvidos por
> [`organization-ownership-transfer`](../docs/features/organization-ownership-transfer/spec.md) eram a trilha de auditoria da organização e os
> dois 🟢 do convite; a lacuna 🟡 de E2E da PR #57 também.
>
> **Auditoria de 2026-10-23 (pós-PR #57).** A PR #57 alterou 139 arquivos fora de `docs/features` e `specs`; toda linha
> desta seção que cita um deles foi relida em `main`, com a âncora comparada contra `git show 9c793c6:<arquivo>`. As
> demais seguem iguais, porque o arquivo citado é o mesmo byte a byte. **Placar: 1 fechado · 5 ampliados ou reduzidos
> (a superfície sem guard, as rotas fora do rate limit, o `docs/SECURITY.md` atrás da PR #56, os links mortos dos planos
> e as ações do SDK sem teste) · 9 novos, em [Achados da PR #57](#-achados-da-pr-57-2026-10-23) · 162 abertos**, pela
> contagem direta das linhas com marcador de severidade nas tabelas `| achado |` desta seção (🟡 58, 🟢 99, ⚠️ 4, ⚪ 1).
> Eram 154 antes desta rodada.
>
> **Rodada delta (2026-10-23, mesmo SHA):** 4 novos, em
> [Achados da tarefa `organization-guardrails`](#-achados-da-tarefa-organization-guardrails-pr-58-2026-10-23), e
> 0 fechados. **166 abertos** pela mesma contagem (🟡 59, 🟢 102, ⚠️ 4, ⚪ 1). Três deles (D10, D11 e o `500` do
> convite) estão **em andamento** em `organization-guardrails`, sem commit, e seguem contados como abertos até a PR
> dela entrar. A pendência 8 foi ampliada (`logEvent(`: 48 em `main`, 49 no working tree).
>
> **Rodada delta 2 (2026-10-23, mesmo SHA):** 3 novos, em
> [Achados da tarefa `organization-archived-member`](#-achados-da-tarefa-organization-archived-member-pr-58-2026-10-23),
> 1 ampliado (o `500` sem código numa leitura de recusa) e 0 fechados. **169 abertos** (🟡 59, 🟢 105, ⚠️ 4, ⚪ 1).
> Quatro estão em andamento, sem commit: D10, D11 e o `500` do convite (`organization-guardrails`) e o 🟡 do membro
> arquivado (`organization-archived-member`).
>
> **Fechado pela PR #57:** 🟡 *o predicado de posse foi copiado de novo* (`entity.repository.ts:23,40,64,72` em
> `9c793c6`). Hoje o filtro de escopo mora num helper só, `inOrganization` (`entity.repository.ts:40-44`), usado pela
> listagem (`:67`), pelo resumo (`:76`) e pelo expurgo (`:105`); os dois `where("userId")` que sobram (`:119`, a
> exportação do titular, e `:146`, a migração dos registros antigos) servem a outro propósito. Era a contrapartida P de
> `teams-organizations`.

### ⚠️ Achados abertos, reconferidos ou herdados

Reconferidos a cada auditoria desde 2026-10-04, a última em 2026-10-28, pós-PR #59, que não tocou nenhum dos arquivos citados. A PR #57 tocou `apps/api/proxy.ts` e o `docs/SECURITY.md`, citados na linha das rotas de `payments/`; as âncoras foram remedidas.

| achado | onde | por que importa |
|--------|------|-----------------|
| ⚠️ **O modo `simple` não restringe o painel comum** (A1) | `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx` (não lê o modo) · `packages/next-config/product-mode.ts:12-23` (sem `commonUserUsesPanel`) · `docs/AUTH-SSO.md:66-71` | O documento descreve um redirecionamento que não existe, e uma pendência do `PRE-PRODUCTION.md` partia dele. Hoje o `simple` só esconde a cobrança. Estacionado (E10): o usuário decidiu ignorar o modo por ora |
| 🟡 **As rotas de `payments/` que chamam a Stripe estão fora do rate limit** (ampliado em 2026-10-16, pós-PR #47) | `apps/api/proxy.ts:60-78` (era `:55-70` até a PR #57, `:53-67` até a PR #56, `:49-62` até a PR #49 e `:45-58` até a PR #47) | Cada chamada vai à Stripe: o catálogo da aba (`/payments/plans`) lista preços, o checkout cria cliente (com chave de idempotência) e sessão, o portal cria sessão. As três exigem sessão, então o abuso depende de conta válida, mas um cliente em loop consome a cota de API da Stripe do fork. **Ampliado:** a PR #47 acrescentou `GET /payments/catalog`, pública e também fora da lista, de propósito (`apps/api/proxy.ts:45-47`); ela responde do cache de uma hora e não alcança a Stripe a cada chamada, então não herda o problema, mas pode ser martelada ao custo de invocações de função. O `docs/SECURITY.md:162` (era `:158` até a PR #57 e `:157` até a PR #49) cita a rota nova e segue sem citar checkout, portal e `plans` |
| 🟡 **`findByStripeCustomerId` devolve o documento cru, sem mapper** (ampliado em 2026-10-04) | `apps/api/(shared)/repositories/user.repository.ts:87-98` (era `:71-82` até a PR #50) | `{ ...(live.data() as UserDTO), id }` entrega `Timestamp` onde o tipo promete `Date`. Hoje o webhook só lê `id` e `stripeCustomerId`, então não quebra nada. A PR #38 deu ao método um segundo chamador, `reconcileEntitlements` (`webhooks/payments/route.ts:156`), que também só lê o `id`. Com o A2 fechado, o perfil arquivado já não tem assinatura viva quando o webhook deixa de achá-lo; quebra no primeiro chamador que ler uma data. Contraria a regra de ouro 5 (normalizar no mapper) |
| 🟡 **`.env.example` da `apps/app` e da `apps/web` publicam `STRIPE_*`, que nenhum dos dois lê** (A3) | `apps/app/.env.example:26-27` · `apps/web/.env.example:5-6` | Quem configura o fork põe a chave secreta em dois apps que não precisam dela. Só a `apps/api` lê (`PRE-PRODUCTION.md` §12 já diz isso) |
| 🟡 **Lacunas de teste do arquivamento pelo admin** (nova, PR #28; ampliada em 2026-10-19, pós-PR #50) | `apps/api/app/(routes)/users/[id]/route.ts:202-228` (era `:194-220` até a PR #58 e `:192-204` antes) · `apps/api/__tests__/usersAdminDeleteBilling.test.ts` · `usersAdminArchiveAccess.test.ts` | Não há teste para o cancelamento que passa seguido do soft delete que falha (Firestore fora) nem para o duplo clique no "Sim" do diálogo. **Ampliada:** desde a PR #50 a desativação no Auth fica entre os dois passos; se o soft delete falhar depois dela, a conta fica desativada com o perfil vivo, e os sete casos de `usersAdminArchiveAccess.test.ts` não cobrem isso. Pela leitura é recuperável: a nova tentativa repete a desativação, que não tem efeito numa conta já desativada. O `/review` da PR descreveu por leitura o primeiro caso como recuperável: a assinatura já cancelada conta como cancelada na tentativa seguinte (`(shared)/lib/billing.ts:164`, âncora remedida em 2026-10-04) |

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
| 🟡 **Reenviar o cadastro depois de conta criada e login falho responde `USERS_AUTH_EMAIL_ALREADY_IN_USE`** | `apps/app/.../sign-up/components/SignUpFormClient.tsx:119-126` (era `:112-119` até a PR #47) · `apps/web/.../sign-up/components/sign-up-form-client.tsx:50-57` (era `:34-40` até a PR #55, que acrescentou o pedido de verificação no `onSuccess`) | A criação e o login são duas chamadas. Se a primeira passa e a segunda falha (rede, 429, cookie de sessão), a pessoa reenvia, recebe "e-mail já cadastrado" e precisa ir ao login por conta própria. O `/review` deixou como está porque a correção muda o fluxo; a alternativa registrada é tentar o `signIn` quando o reenvio receber esse código logo depois de um 201 na mesma tela |
| 🟡 **`create-dev-admin.mjs` não aplica a política de senha** | `apps/api/scripts/create-dev-admin.mjs:36-46` | O script cria administrador com qualquer senha que o Firebase aceite (6 ou mais). Fora da fatia por decisão do plano (P4): o script roda em Node puro e repetir a constante criaria a 12ª cópia. Afeta só quem opera o fork |
| 🟡 **Sem `ARCJET_KEY`, nada limita a criação de contas em massa** | `apps/api/proxy.ts:62` (`/auth/sign-up` na lista) · `docs/PRE-PRODUCTION.md:770-772` · `docs/SECURITY.md:173` (âncoras remedidas em 2026-10-23, depois da PR #57, que deslocou as três de `:57`, `:690-692` e `:169`) | A rota cria a conta pelo Admin SDK, que não passa pelo limite do Firebase de 100 contas por hora por IP. A rota está na lista de rate limit, mas o limite é no-op sem a chave. Está escrito nos dois documentos; o critério 19 do `/test` ficou 🔒 |

### Segurança: seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo** (ampliado em 2026-10-20, PR #53 aberta) | `apps/api/instrumentation.ts:63-67` · o comentário em `:47-57` | **Ampliado, agora medido:** o `/test` da PR #53 subiu `next start` sem `CORS_ORIGIN`. O processo não cai: segue ouvindo na porta e responde `500 Internal Server Error`, em texto e sem `error.code`, a toda requisição, inclusive `/health` e o preflight de `http://localhost:3000`, com `unhandledRejection` e "Failed to prepare server" no log. O comentário promete "a startup crash with a clear message instead of every request failing later", e acontece o contrário. O receio de servir sem allowlist não se confirma, porque nenhuma rota responde: a falha é fechada. A frase "`/health/ready` detecta parte das falhas, não esta" fica em dúvida, porque o `/health` respondeu 500; o `/health/ready` não foi medido. Corrigir pede escolher entre ajustar o comentário e encerrar o processo de fato. Reconferido em 2026-10-03, em `main`: `throw` em `:63-67`, zero `process.exit`. Nenhum 🔴 de código segue aberto nesta seção desde a PR #36 |
| ⚠️ **Dez das treze rotas de `/account` seguem fora do rate limit**, entre elas a troca e a definição de senha (ampliado em 2026-10-04 e em 2026-10-19, pós-PR #48; reduzido em 2026-10-19, pós-PR #51) | `apps/api/proxy.ts:60-78` (era `:55-70` até a PR #57, `:53-67` até a PR #56) · `docs/SECURITY.md:165` (remedida em 2026-10-27, pós-PR #58, por conteúdo: a frase "Dez das treze"; era `:164`, uma linha antes do parágrafo, `:160` até a PR #57 e `:159` até a PR #49) | **Ampliado em 2026-10-28, pós-PR #59:** a rota de transferência (`POST /organization/members/[id]/ownership`) nasceu fora da lista, e são seis das nove rotas de organização; ela só lê e grava no Firestore, numa transação, sem provedor externo. **Ampliado em 2026-10-23, pós-PR #57:** das oito rotas de organização, cinco ficaram fora da lista (`GET /organization`, `GET /organization/members`, `POST /organization/leave`, `DELETE /organization/members/[id]` e `DELETE /organization/invitations/[id]`); nenhuma chama provedor externo, e o `docs/SECURITY.md:165` não as cita. **Reduzido em 2026-10-19, pós-PR #51:** a PR corrigiu o documento, que agora diz "dez das treze", com as três rotas da PR #48; o comportamento não mudou. **Ampliado em 2026-10-19:** a PR #48 criou `/account/password/set`, `/account/sign-in-methods/linked` e `/account/sign-in-methods/[id]`, todas fora da lista, por escolha registrada no plano (nenhuma confere senha nem gasta cota do Identity Toolkit; a prova é um ID token verificado localmente). Naquela rodada o `docs/SECURITY.md:160` ainda dizia "sete das dez". Recontado em 2026-10-04: a PR #39 criou três rotas de sessões (`/account/sessions`, `/account/sessions/[id]`, `/account/sessions/revoke-others`), todas fora; as três só leem e gravam no Firestore, sem provedor externo. Ficam fora também o `PUT /account`, `/account/password`, `/account/sessions/revoke` e `/account/onboarding`. Naquela data o `docs/SECURITY.md` trazia a conta certa; ficou defasado entre a PR #48 e a PR #51. A PR #25 acrescentou `POST /payments/checkout` e `POST /payments/portal`, também fora; cada checkout pode criar uma sessão na Stripe |
| ⚠️ **Superfície não-guardada da API: 18 de 56** arquivos de rota exportam handler nu, 12 deles `/auth/*` (recontado em 2026-10-28, pós-PR #59) | `apps/api/app/(routes)/auth/**` · `apps/api/app/(routes)/payments/catalog/route.ts` · `apps/api/app/(routes)/contact/route.ts` · `apps/api/app/(routes)/invitations/preview/route.ts` | **Recontado em 2026-10-28, pós-PR #59:** 56 arquivos, 38 com guard; a rota nova de transferência tem guard, então os nus seguem 18. O `docs/SECURITY.md:17-19` dizia 55 e 37 e foi corrigido nesta auditoria. **Ampliado em 2026-10-23, pós-PR #57:** 55 arquivos, 37 com guard (`find "apps/api/app/(routes)" -name route.ts` e `grep -LE "require(CommonPanel\|Admin\|Plan\|Organization)Api"`; sem `Organization` no padrão o `grep` dá 28, porque dez rotas passaram para o guard novo). A PR #57 acrescentou `POST /invitations/preview`, nua por desenho: quem abre o convite ainda não tem sessão, o token é a prova, e a rota está na lista de rate limit. Os 18 nus: 12 em `/auth/*`, os dois `health`, o webhook de pagamento, o catálogo, o contato e a prévia do convite. Cada um tem motivo, e o `docs/SECURITY.md:17-24` traz a conta certa desde esta auditoria. A série anterior (37, 40, 41, 45 e 47 arquivos) está nas versões deste arquivo até `61a781e` |
| 🟡 **O endpoint de renovação de sessão está fora do rate limit e aceita requisição sem `Origin`** | `packages/auth/session-routes.ts:123`, `:127` · `packages/auth/session.ts:78-81` | Reconferido em 2026-10-04. A parte documental está fechada (`docs/SECURITY.md:169`, remedida em 2026-10-27, pós-PR #58; era `:168`, `:164` até a PR #57 e `:163` até a PR #49); o comportamento segue. Desde a PR #39 a rota também pergunta à API se a sessão foi encerrada noutro aparelho antes de renovar |

### 🟡 Dependências, exports e código morto

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Dependência importada sem ser declarada**: `apps/app/env.ts:1` importa `@repo/email/keys` sem `@repo/email` no `package.json`; `apps/web` importa `@repo/auth` em **8 arquivos** sem declará-lo | `apps/app/package.json` · `apps/web/package.json` | Reconferido, os dois `grep` no `package.json` devolvem 0. Funciona por hoisting; o turbo não invalida `web#*` quando `@repo/auth` muda |
| 🟡 `packages/auth/package.json:13` exporta `./client-ui` para arquivo **inexistente** | `packages/auth/package.json:13` | Reconferido em 2026-10-22, pós-PR #56: `client-ui.tsx` não existe, e o export segue em `:13` |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` do resto | `packages/auth/package.json:24` | Reconferido em 2026-09-27; a âncora subiu uma linha porque a PR #29 tirou o export `./components/sign-up` |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | Reconferido: 0 |
| 🟡 **`input-otp.tsx` é código morto** | `packages/design-system/components/ui/input-otp.tsx` | Reconferido: só ele, o barril, o `package.json` do pacote e o `playground`. `account-security-mfa` (fatia 3, segundo fator) é quem o usaria |
| 🟡 **`import-in-the-middle` e `require-in-the-middle` instalados e nunca importados** | `apps/app/package.json:27,36` | Reconferido: 0 importadores |
| 🟡 **`packages/internationalization` tem dois defeitos de `exports`** | `packages/internationalization/package.json:5-12` | Reconferido em 2026-09-26, depois da PR #28 mexer no arquivo: falta `"./utils/*"`, e `"."` (`:6`) aponta para `index.ts`, que não existe |
| 🟡 **`isRateLimitEnforced()` é export morto** | `packages/security/index.ts:30` | Reconferido em `main` em 2026-10-03: a PR #36 passou a função a ler a chave por chamada (`readArcjetKey()`), e ela segue sem chamador fora dos testes. As 9 referências estão em `__tests__/rateLimit.test.ts` |
| 🟡 **`FormattedError.retryAfterSeconds` sem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:14,23` | Reconferido. O homônimo de outro tipo em `apps/api/proxy.ts:139` (âncora remedida em 2026-10-27, depois da PR #58; era `:129`) segue sem relação |
| 🟡 **`reloadCurrentUser` sem teste próprio** | `packages/auth/client.ts:261` (era `:244` até a PR #56 e `:214` até a PR #48) | Reconferido em 2026-10-22: só testes que a mockam (`useEmailVerification.test.tsx` e, desde a PR #48, `accountSignInMethodsPanel.test.tsx` e `useSignInMethodMutations.test.tsx`, que conferem que ela **não** é chamada). O único chamador de produção segue sendo `useEmailVerification.ts:34` |
| 🟡 **`packages/shared` tem `test` e não tem `typecheck`** | `packages/shared/package.json:11` (só `test`) | Metade fechada pela PR #32: o `@repo/design-system` ganhou a task de `test` (`packages/design-system/package.json:7`, 45 testes). Falta o `typecheck` do `packages/shared`, adiado desde a primeira auditoria. **Medido em 2026-10-14:** `tsc --noEmit` sobre os 21 arquivos do pacote, com um `tsconfig` temporário fora do repositório, dá 0 erros neles e 2 `TS2580` em `packages/internationalization/utils.ts:22-23` (`process` sem `@types/node`, que o pacote não declara). A correção é o script, um `tsconfig.json` e o `@types/node` que os outros workspaces já usam. P. **Ampliado em 2026-10-16, pós-PR #47:** o pacote passou a guardar o formatador de preço (`formatPlanPrice.ts`), que a landing e a aba de cobrança usam; ele continua checado só pelo `typecheck` da `app` e da `web`, que o importam |
| 🟡 **`welcomeEmail` sem chamador de produção** (reduzido em 2026-10-19, pós-PR #49) | `packages/email/templates/welcome.tsx:50` | Reconferido em 2026-10-20, pós-PR #52: `git grep welcomeEmail` fora de testes acha só a definição. A PR #52 criou as boas-vindas como notificação no sino (`user-merge.ts:94-99`), sem o e-mail; mandar ou não o e-mail de boas-vindas segue decisão de produto. **Reduzido:** a outra metade da linha, o formulário de contato de fachada para onde o canal de privacidade caía, fechou com a PR #49; o formulário entrega na caixa de suporte ou diz que o canal está indisponível. A spec `in-app-notifications`, entregue pela PR #52, usou as boas-vindas como produtor de notificação, não de e-mail |
| 🟡 **`useListAuditEvents.test.tsx` deixa trabalho do React pendente depois do teardown** (novo, 2026-09-28) | `apps/app/__tests__/useListAuditEvents.test.tsx:55-70` (um `QueryClient` por teste, sem `clear()` nem `unmount` ao fim) | A suíte da `apps/app` falhou em 2 de 6 execuções locais em 2026-09-28 com `ReferenceError: window is not defined`, que o Vitest atribui a este arquivo: os testes passam e o erro não tratado reprova a task. Na auditoria pós-PR #31 passou nas 6 execuções (688 testes cada) na pós-PR #32 também (6 de 6, 702 testes cada) e na pós-PR #33 também (6 de 6, 756 testes cada), então o acumulado era 2 falhas em 24; com as execuções das rodadas pós-PR #34, #35, #36, #39, #40, #41, #42, #43, #44 (três, 841 testes cada), #45 e #46 (uma cada, 846 testes), #47 (uma, 861 testes), #48 (uma, 914 testes), #49 (uma, 919 testes), #50 (uma, 924 testes), #51 (uma, 924 testes), #52 (uma, 958 testes), #53 (uma, 968 testes), #54 (uma, 975 testes), #55 (uma, 1001 testes), #56 (uma, 1045 testes), #57 (uma, 1099 testes), #58 (uma, 1099 testes) e #59 (uma, 1108 testes), nenhuma com falha, é 2 em 59. O arquivo não muda desde a PR #18. O CI passou nas execuções de merge das PRs #29 a #59. Correção provável, não testada: limpar o `QueryClient` e desmontar o hook no `afterEach`. Tarefa direta P |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:187` (era `:171` até a PR #50) | Declara `Promise<UserDTO[]>`, devolve o merge com o Auth e descarta linhas em silêncio (`:197`). N+1 do Admin SDK. Décima primeira rodada aberto; âncoras desceram com os métodos de recursos da PR #38 (remedidas em 2026-10-04) |
| 🟡 **`userRepository` tem cinco métodos com semântica própria de "quantos usuários existem"** | `user.repository.ts:171` · `:183` · `:187` · `:206` · `:224` (eram `:155`, `:167`, `:171`, `:190` e `:208` até a PR #50) | `touchLastAccess`, `purgeProfile`, `list`, `summary` e `activitySummary`. O cartão de total pode mostrar mais do que a tabela lista, e nada na tela explica |
| 🟡 **`skipValidation` incondicional na `apps/web`, e por causa dele o bloqueio de bot da landing nunca roda** (ampliado em 2026-09-30) | `apps/web/env.ts:36` (âncora remedida em 2026-10-16; a PR #46 a deslocou de `:33`) · `apps/web/proxy.ts:67` (`if (!env.ARCJET_KEY) return;`) · `:72` (`secure()`), âncoras remedidas em 2026-10-07 pós-PR #41 | Com `skipValidation: true`, o `createEnv` do `@t3-oss/env-core@0.13.8` devolve só o `runtimeEnv` do próprio módulo e descarta o que veio de `extends` (`if (skip) return runtimeEnv;`, antes do merge). Como o `runtimeEnv` da web não declara `ARCJET_KEY`, `env.ARCJET_KEY` sai sempre `undefined`, mesmo com chave válida, e o `secure()` é pulado. Medido pelo `/test` de `arcjet-key-lazy-validation` com um probe de import: `ajkey_ok` dá `"ajkey_ok"` no `env.ts` da `apps/app` e `undefined` no da `apps/web`. A metade do `NEXT_PUBLIC_APP_URL` fechou com a PR #25, e a do `NEXT_PUBLIC_DOCS_URL`, com a PR #46, as duas declarando a variável no próprio `env.ts`. **§5.1:** o `skipValidation` já tinha voltado intacto em várias rodadas como "recomendação"; ele fica aqui como dívida técnica com `arquivo:linha`, e a parte que exige julgamento (ligar o bloqueio de bot) sai como a pergunta D8 e não é reapresentada depois. Tirar o `skipValidation` sem decidir a D8 liga o bloqueio por tabela, então as duas coisas andam juntas. P, depois da D8 |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta** | `apps/app/proxy.ts:235,239` (era `:230,234` até a PR #57 e `:214,218` até a PR #47) · `apps/web/proxy.ts:111,115` | Reconferido em 2026-10-07, pós-PR #41: `cookieStore.set` sem `maxAge` nas duas apps. A PR #41 manteve a gravação do cookie, que agora só serve à rota sem idioma na URL |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem `Secure`** por padrão | `packages/shared/utils/helpers/cookies.ts:28,30` | Reconferido. ASVS 5.0 L1 (3.3.1). Décima rodada aberto |
| ⚪ **`cors.ts` allow-lista `x-locale`, que só existe como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Reconferido. `x-role` (`:16`) **não** é resíduo |
| 🟡 **O papel do painel viaja em dois headers** | `packages/sdk/src/client/base.ts:45,53,61,95` | Reconferido nas quatro âncoras |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O deep link das abas da conta não acompanha a navegação** | `AccountTabs.tsx:51-53` (estado lido uma vez) · `:55-62` (`history.replaceState`) | Reconferido. A barra lateral muda a URL e a aba fica onde estava. Estacionado (E9) |
| 🟡 **A mensagem de erro padrão está cravada em pt-br num pacote** | `packages/shared/utils/helpers/handleClientError.ts:19` | Reconferido, literal |
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
| 🟡 **A `apps/web` não tem `not-found` nem `error`** (reescrito em 2026-10-21; **reduzido** em 2026-10-21, pós-PR #54) | `apps/web/app/` (sem `layout.tsx`, `not-found.tsx` nem `error.tsx`; o `global-error.tsx` está lá desde a PR #54) · `apps/web/app/[locale]/` (sem `error.tsx`) | Rota inexistente na landing cai no 404 padrão do Next, sem tradução nem marca, e um erro dentro de um segmento sobe direto para a tela de erro global. **Reduzido:** a parte do `global-error` fechou com a PR #54 (`web-global-error`, na lista de fechados): o arquivo foi para `apps/web/app/global-error.tsx:1-29`, o build passou a usá-lo sem exigir `app/layout.tsx`, e o `/test` mediu a tela da web em build de produção nos três idiomas. `not-found` e `error` seguem M, porque pedem decisão sobre o root layout da web (PR #41). A `apps/app` tem `not-found.tsx` e `global-error.tsx` na raiz, mas nenhum `error.tsx` de segmento |
| 🟡 **O `package.json` da raiz ainda é o do next-forge** | `package.json:2-5` · `:42` | Reconferido em 2026-09-28: a PR #30 não tocou no arquivo; o `FORKING.md` ("Resíduos do projeto de origem") descreve a limpeza que cada fork faz à mão. `"name": "next-forge"` e um `bin` para `dist/index.js`, gerado de `scripts/index.ts`, que não existe. `engines.node` diz `>=18` e o `.nvmrc`, `22.12.0`. Todo fork herda os três |
| 🟢 **Link do `FORKING.md` para o CRUD de referência está morto** (novo, 2026-09-28; medido em 2026-09-30) | `docs/FORKING.md:453` (era `:437`; deslocada pelas PRs #47 e #48) · `README.md:306` | O link usa `#crud-de-referência`; o título é `### 🧬 CRUD de referência`. Medido no README renderizado pelo GitHub (`gh api repos/:owner/:repo/readme` com `Accept: application/vnd.github.html`): o id publicado é `user-content--crud-de-referência`, e o próprio título aponta para `#-crud-de-referência`. Correção: trocar a âncora ou tirar o emoji do título |

### 🆕 Achados do `/test` de `brand-config` (2026-09-27)

Medidos pelo `analista-qa` com o nome padrão da marca, em `build && start`, e reconferidos no código em 2026-09-28. A inicial do avatar abaixo do AA fechou com a PR #32. Nenhum bloqueia a entrega; o detalhe e o repro estão em [`docs/features/brand-config/test/report.md`](../docs/features/brand-config/test/report.md).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O `/favicon.ico` da `apps/web` devolve o HTML da home** | `apps/web/app/` (sem ícone na raiz) · `apps/web/proxy.ts:61` (matcher, âncora remedida em 2026-10-07 pós-PR #41) | Resposta 200 com `text/html`; o `/icon.png` responde 307 para `/pt-br/icon.png`. Já existia antes da entrega. **Descrição corrigida em 2026-09-28:** o matcher do proxy já exclui `favicon.ico` (`:61`), então o pedido não passa pelo proxy e cai no segmento `[locale]` com `favicon.ico` no lugar do idioma. Correção provável, não testada: servir o arquivo na raiz de `apps/web/app/`, que hoje não tem root layout |
| 🟢 **Nome de marca com 30 caracteres quebra em duas linhas na barra lateral** | `apps/app/shared/components/ui/Sidebar.tsx` | O critério de 30 caracteres da spec só valia para o header da web. Decidir truncar ou aceitar a quebra |


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
| Links da web (hero, CTA, FAQ, preços) sem teste de componente | **continua aberta**, risco baixo | a regra `nested-interactive` do axe na suíte E2E barra a regressão nas rotas cobertas |
| Botão de checkout em carregamento | **fora de escopo** | exige chave de teste da Stripe (pendência 23) |
| Campo com erro lido por leitor de tela de verdade | **continua aberto** | o `/test` conferiu atributos na árvore de acessibilidade; nenhum NVDA ou VoiceOver rodou. Não cabe em rodada autônoma |

### 🆕 Achados da entrega `account-email-change` (2026-09-30)

Vindos do `/review`, do handoff e do `/test` da spec, entregue pela PR #33 e arquivada em 2026-09-30. Nenhum
bloqueou a entrega. Reconferidos no código em 2026-09-30. O do foco do diálogo de exclusão de conta fechou com a PR
#43 e está na lista de fechados daquela rodada.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Os dois diálogos da aba de conta repetem o mesmo tratamento de foco** (ampliado em 2026-10-13; **reduzido em 2026-10-19**, pós-PR #48) | `AccountPrivacyPanel.tsx:62-63`, `:69-71` · `AccountEmailChangeDialog.tsx:69-70`, `:91-92` | Era "`lacksPasswordProvider` duplica `requiresPrivacyChannel`". **Reduzido pela PR #48:** a checagem de provedor `password` virou uma função só (`apps/app/shared/lib/signInMethods.ts:22-23`), usada pela privacidade, pelo perfil e pela segurança. Segue duplicado o que a PR #43 acrescentou: o comentário do `onOpenAutoFocus`, palavra por palavra (`AccountPrivacyPanel.tsx:62-63`, `AccountEmailChangeDialog.tsx:69-70`), e o `onError` que devolve o foco à senha, com nome num arquivo (`focusPasswordAfterRefusal`, `AccountPrivacyPanel.tsx:69-71`) e inline no outro (`AccountEmailChangeDialog.tsx:91-92`). Se um terceiro diálogo puser o `Footer` dentro de um `AlertDialogContent`, a `cycle-policy` §3 manda corrigir no componente compartilhado |
| 🟢 **A confirmação da troca mostra o mesmo cartão de erro para qualquer código** | `apps/app/app/[locale]/(unauthenticated)/verify-email/components/ConfirmEmailChangeResult.tsx:53-62` | Um `429 AUTH_RATE_LIMITED` diz que o link pode ter expirado, embora o código não tenha sido gasto e recarregar resolva. Espelha o `VerifyEmailResult` por decisão do plano (§5.2) |
| 🟢 **O aviso ao endereço antigo sugere que trocar a senha resolve** | `packages/internationalization/translations/packages/email/index.ts:66`, `:142`, `:217` (eram `:58`, `:126`, `:193` até a PR #57) | "Troque sua senha agora e fale com o suporte": trocar a senha não invalida um link já emitido; quem reverte é o suporte. A frase não mente, mas a ordem engana. Decisão de copy |
| 🟢 **Endereço que o Zod aceita e o Admin SDK recusa vira 500** | `apps/api/(shared)/lib/auth-action-links.ts:162-169` (era `:122-129` até a PR #56) · `account/email/route.ts:127-137` | Se `getUserByEmail` responder `auth/invalid-email`, o erro sobe e a rota devolve `500 ACCOUNT_UPDATE_FAILED`, com `error.code` e sem stack. Raro, não vaza nada |
| 🟢 **Código de troca aplicado direto no Identity Toolkit pula a revogação e a trilha** | `auth/email-change/confirm/route.ts:79`, `:91-101` · `docs/SECURITY.md:13` (era `:12` até a PR #48) | Quem tem o link e a chave web pública aplica o código sem passar pela rota. O e-mail muda, as sessões antigas não caem pela revogação explícita e o evento não é gravado. Declarado no documento; fora do corte |


**Lacunas de teste herdadas da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-09-30 | motivo |
|--------|---------------------|--------|
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
| O build de `app`/`web` falhando com a chave errada, sem teste automatizado | **fora de escopo** | o build não roda no CI; `keys.test.ts` protege a causa (o schema estrito), e o `/test` mediu o build à mão |
| Chave válida contra a Arcjet real | **continua aberta**, 🔒 | exige credencial e IP de cliente; somada à pendência 24 |

### 🆕 Achados das PRs #37 a #39 (2026-10-04)

Vindos dos `/review` e `/test` das três entregas e da medição desta rodada, conferidos no código em `d92d21b`.
Nenhum bloqueou uma entrega.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Dois admins que desativam um ao outro ao mesmo tempo ficam os dois desativados** | `apps/api/app/(routes)/users/[id]/route.ts:134-136` (era `:133-135` até a PR #58 e `:131-133` até a PR #50; a recusa só compara alvo e ator) | Os dois pedidos passam pelo `requireAdminApi` antes de qualquer gravação. Num fork com dois admins, o painel pode ficar sem admin ativo. Fechar exige transação ou contagem de admins ativos. Registrado pelo `/review` da PR #37, que reescreveu `docs/SECURITY.md:39` (era `:36` até a PR #57 e `:35` até a PR #49) para não prometer o contrário |
| 🟢 **O `aria-describedby` dos `HookForm*` sem descrição aponta para um id que não existe** | `packages/design-system/components/ui/form.tsx:115-119` (o `FormControl` sempre põe o id da descrição) · `hookformSwitch.tsx` e `hookformSelect.tsx`, os dois únicos com prop `description` | Todo campo de formulário do repo sem `FormDescription` publica uma referência órfã, e quem acrescentar uma descrição precisa saber que ela só liga se renderizar o `FormDescription`. Medido pelo `/test` da PR #37 no select de tipo e corrigido só ali. Parente do achado da dica do `TextareaInput`, não o mesmo. P no design system |
| 🟢 **Aparelho encerrado com a tela aberta não sai sozinho** | o `401` da API vira só toast na `apps/app`; o aviso de sessão encerrada do `AuthProvider` (`packages/auth/provider.tsx`) só dispara na troca de token ou ao recarregar | As chamadas respondem `401 AUTH_INVALID_TOKEN` e a tela mostra "Sessão inválida ou expirada." com o id da requisição, mas a pessoa segue no painel até recarregar. Medido pelo `/test` da PR #39. Sugestão registrada lá: tratar o `401` da API como sinal para conferir a sessão |
| 🟢 **O expurgo apaga as sessões antes da conta no Firebase** | `apps/api/(shared)/lib/account-erasure.ts:229-239` (era `:218-228` até a PR #59, `:126-137` até a PR #57, que pôs o passo `organization` em `:212-214`, e `:123-129` até a PR #52, que pôs o passo `notifications` entre as sessões e o perfil) | Uma requisição com credencial ainda válida que chegue entre os dois passos recria o documento da sessão pelo `trackSession`, e ele sobra depois da exclusão. O documento não tem nome nem e-mail, mas é dado pessoal residual. Inverter a ordem fecha a janela e muda o relatório de exclusão e o `accountErasure.test.ts`. Do `/review` da PR #39 |
| 🟢 **`listByUid` lê todos os documentos de sessão da conta, sem limite** | `apps/api/(shared)/repositories/session.repository.ts:66-79` · `session-tracker.ts:43-54` | A coleção guarda um documento por login e não apaga os encerrados, de propósito (o `PRE-PRODUCTION.md` proíbe TTL nela). A lista e a checagem de "encerrar as outras" leem tudo a cada sessão nova. Para conta com muitos logins, cresce sem teto; hoje não pesa. Do `/review` da PR #39 |
| 🟢 **O link do plano para a spec morre a cada arquivamento** (ampliado em 2026-10-28, pós-PR #59) | `docs/features/organization-ownership-transfer/analyze/plan.md:3` · `docs/features/teams-organizations/analyze/plan.md:3` · `docs/features/plan-entitlements/analyze/plan.md:3` · `docs/features/pricing-page-catalog/analyze/plan.md:3` · `docs/features/linked-sign-in-methods/analyze/plan.md:3` · `docs/features/contact-support-channel/analyze/plan.md:3` · `docs/features/in-app-notifications/analyze/plan.md:3` e `review/review.md:6` · `docs/features/magic-link-sign-in/analyze/plan.md:3` | Os nove apontam para `../../../../specs/<id>.md`, e as oito specs foram movidas para `../spec.md` (a de `organization-ownership-transfer`, na auditoria pós-PR #59). A auditoria só escreve em `docs/features/` para arquivar spec e não corrige o plano. Os planos de `account-active-sessions` e `account-security-mfa` têm o mesmo link e vão quebrar quando a spec deles for arquivada. Correção de uma linha por plano, ou um passo novo na `spec-audit` §4.1 |
| 🟢 **Âncoras de documento deslocadas pelas PRs #37 a #39** (reduzido em 2026-10-07: a PR #41 corrigiu a do `PRE-PRODUCTION.md:414`; ampliado em 2026-10-14 com a do `RESEARCH-tanstack-vs-next.md:40`; em 2026-10-16, a PR #46 corrigiu as contagens do `SECURITY.md` e deslocou as do `skipValidation`, e esta auditoria mediu mais duas antigas; ampliado em 2026-10-19: a PR #48 acrescentou três ações ao enum de auditoria, e as âncoras do `INCIDENT-RESPONSE.md` e do `BACKUP.md` passaram a `audit.ts:2-16` e `:34-36`; reduzido em 2026-10-19, pós-PR #49: a frase do `ROPA.md` com as âncoras da web saiu, e a PR corrigiu as seis âncoras que ela mesma deslocou; reduzido em 2026-10-21, pós-PR #53: a PR corrigiu a âncora interna do `PRE-PRODUCTION.md:552` para `account-erasure.ts:99` e as duas do `SUBPROCESSORS.md:35`; reduzido em 2026-10-28, pós-PR #59: esta auditoria corrigiu as do `INCIDENT-RESPONSE.md:64` e do `BACKUP.md:89`, que a PR #59 tinha deslocado de novo, e a do `SUBPROCESSORS.md:35`) | `docs/SUBPROCESSORS.md:33` (`user.repository.ts:42`; o `super` está em `:46`) · `docs/ROPA.md:69`, `:83` · `docs/SUBPROCESSORS.md:40` (`apps/web/env.ts:33` e `apps/web/proxy.ts:68`; a do `docs/ROPA.md:108` saiu com a frase, na PR #49) · `docs/AUTH-SSO.md:105` · `docs/RESEARCH-tanstack-vs-next.md:85` · `docs/RESEARCH-tanstack-vs-next.md:40` (`LanguageSwitcher.tsx:3`, hoje `:1`) | Valores corretos em [Contradições](#contradições-doc--código). Metade veio do paralelo: as PRs #38 e #39 partiram do mesmo `e791d3a`, e cada uma editou documentos sem ver o deslocamento que a outra causava no código. Correção de texto, P |

**Lacunas de teste e 🔒 herdados das entregas, com veredito desta auditoria:**

| lacuna | veredito 2026-10-04 | motivo |
|--------|---------------------|--------|
| `PlanGate`: skeleton em light, dark e 375 px | **continua aberta** | não remedido na segunda rodada do `/test` de `plan-entitlements`; o componente é o `FormSkeleton` já usado em outras telas |
| Evento real de recursos da Stripe e paginação de `listActiveEntitlementKeys` | **fora de escopo**, 🔒 | exige conta Stripe (pendência 23) |
| `useAccountSessionMutations` com o axios real no caminho de erro (404 e 409 pela UI) | **continua aberta** | o sucesso passou pelo navegador; o erro só no teste com `apiClient` mockado |
| Latência da leitura de sessão em produção | **continua aberta**, 🔒 | medida só no emulador; somada à pendência 27 |
| Leitor de tela na recusa do próprio admin | **continua aberta**, 🔒 | o `/test` da PR #37 mediu atributos e Tab, sem leitor de tela |

### 🆕 Achados da PR #40 (2026-10-07)

Vindos do plano (§13.3) e do `/test` (§6, O1 a O4) da tarefa `action-menu-keyboard-delete`, conferidos no código e
nas bibliotecas instaladas em 2026-10-07. Todos são anteriores ao diff ou ficaram fora do corte por decisão do plano;
nenhum bloqueou a entrega. O O1 ampliou o achado dos seed tokens do antd e o O4, o do `getDictionary()` do
servidor, nas linhas deles.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Espaço não ativa item do menu de ações**, só Enter | `rc-menu` 9.16.1, `es/MenuItem.js:139` (só `KeyCode.ENTER`) · `packages/design-system/components/ui/action-menu.tsx:98-153` (era `:98-145` até a PR #59) | Vale para "Editar", "Excluir" e os itens customizados, e desde a PR #59 também para "Tornar dono". **Reconfirmado em 2026-10-28** pelo `/review` da PR #59, que o achou de novo lendo o `rc-menu`; a PR corrigiu o Enter que reabria o diálogo, não o Espaço. Quem usa Espaço para ativar o item fica sem resposta. É da biblioteca. O plano deixou como achado (§11, pergunta 4): corrigir só no "Excluir" deixaria o menu inconsistente, e corrigir em todos os itens é outra tarefa, P no design system |
| 🟢 **A confirmação de exclusão sai com `role="tooltip"` e não prende o foco** | `rc-tooltip` 6.4.0, `es/Popup.js:17` · `action-menu.tsx:71-96` | O leitor de tela anuncia uma dica, não um diálogo de confirmação destrutiva, e Tab sai do painel. O padrão para esse caso seria `alertdialog` com foco preso, o que exige trocar o `Popconfirm` por outro componente (decisão D3 do plano) |
| 🟢 **Depois de excluir, a linha some e o foco cai no `body`** | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/` (lista de entidades) · `Table` do `@repo/design-system` | O "Sim" devolve o foco ao gatilho, mas a mutação tira a linha da tabela, e o gatilho some com ela. Quem navega por teclado recomeça do topo da página. O plano atribuiu à `Table`, não ao menu |
| 🟢 **Ao reabrir o menu, o foco cai no último item ativo** | `rc-menu` (guarda o `activeKey`) · `action-menu.tsx:98-99` (`autoFocus`) | Medido pelo `/test` da PR #40 nos ciclos 2 e 3 de cada combinação (O2). Como "Excluir" agora responde ao teclado, ele vira o primeiro item focado na reabertura; a confirmação ainda protege |
| 🟢 **Item de menu que não navega deixa o foco no `body`** | `rc-dropdown`, no fechamento do menu · `action-menu.tsx:117-124` (itens customizados) | Medido pelo `/test` da PR #40 no "Approve" do `playground`, pelo teclado e pelo mouse (O3), num caminho que o diff não tocou. Não medido em `main` antes da PR. Afeta todo fork que acrescentar item que só dispara ação |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-07 | motivo |
|--------|---------------------|--------|
| `aria-expanded` voltando a `false` por clique fora com o menu aberto | **continua aberta** | sem teste; o caminho é do `rc-dropdown` e não mudou |
| Anúncio do menu e da confirmação por leitor de tela | **fora de escopo** | não há instrumento no repo; o `/test` leu os atributos |

### 🆕 Achados da PR #41 (2026-10-07)

Vindos do `/review` ("Achados para o backlog") e do `/test` (O1 e O3) da tarefa `server-locale-from-url`,
conferidos no código em `0a49a3b`. Todos existiam antes do diff; nenhum bloqueou a entrega. O O2 do `/test` (o
`<html lang>` parado na troca suave de idioma) foi corrigido dentro da própria PR e está na lista de fechados.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Arquivo inexistente de um segmento na app manda o anônimo para o login em vez do 404** (O1) | `apps/app/proxy.ts:215-217` (o caminho com extensão passa pelo proxy sem checar o idioma; era `:210-212` até a PR #57 e `:197-199` até a PR #47) · `apps/app/lib/server/authSession.ts:37` (`requireSession` redireciona para `/<segmento>/sign-in` com o segmento que veio na URL) · `apps/app/app/[locale]/` (sem `layout.tsx` que valide o segmento) | `/favicon-novo.png` responde 307 para `/favicon-novo.png/sign-in` e, depois de três redirecionamentos, cai em `/pt-br/sign-in?redirect=...` (medido pelo `/test` da PR #41 em build). O comentário de `isStaticAssetPath` (`apps/app/proxy.ts:132-138`) diz que esse ramo existe para não mandar visitante ao login. Com dois segmentos (`/x/y/nao-existe.txt`) o 404 sai certo. Correção provável, não testada: `notFound()` quando o segmento `[locale]` não está em `locales`. P |
| 🟢 **Redirecionamento sem fim com `NEXT_PUBLIC_DEFAULT_LOCALE` fora da lista** | `apps/app/proxy.ts:221`, `:231-234` (eram `:216` e `:226-229` até a PR #57, e `:203` e `:213` até a PR #47) · `apps/web/proxy.ts:99`, `:110` · `packages/internationalization/utils.ts:21-24` (`getDefaultLocale()` não valida) · `packages/next-config/keys.ts:27` (`z.string().optional()`) | Com `NEXT_PUBLIC_DEFAULT_LOCALE=pt-BR`, `/` vai para `/pt-BR/`, que não é idioma válido, e o proxy redireciona de novo sem fim. Erro de configuração do fork, não de quem usa o produto. O `getDictionary()` já cai em `pt-br` nesse caso (`resolveLocale`, `utils.ts:27-38`), então só o proxy fica preso. Correção provável: os proxies usarem `resolveLocale(getDefaultLocale())`, ou o schema da env aceitar só os três valores. P |
| 🟢 **`getDictionary` e `getTranslations` ficam expostas como Server Actions** (O3) | `packages/internationalization/server.ts:1` (`"use server"`) | O build registra as duas no manifesto de Server Actions, e qualquer `POST` com o id certo recebe o dicionário inteiro (o `/test` usou isso para medir o critério 3). O conteúdo é o texto público da UI, então o risco é baixo. Trocar a diretiva por `import "server-only"` muda o contrato do módulo e pede conferir os chamadores client. P |
| 🟢 **O `next start` da web registra `Cannot assign to read only property 'redirects'`** | `apps/web/next.config.ts:15` (provável: `nextConfig.redirects = redirects` grava no objeto `config` importado de `@repo/next-config`) | Visto pelo `/test` da PR #41 no log do build de produção, fora do diff. Causa e efeito **não investigados**: se a atribuição falha, o redirecionamento `/legal` → `/legal/privacy` de produção (`next.config.ts:7-13`) pode não existir. O primeiro passo é medir, em `next build && next start`, se `/legal` ainda redireciona para `/legal/privacy`. A auditoria não sobe app (`cycle-policy` §3.1). **Ampliado em 2026-10-14:** o `/test` da PR #45 viu a mesma mensagem ("Unexpected error occurred while checking config") ao subir a web em build, com a configuração padrão e com a extrema, e o servidor respondeu normalmente; o redirecionamento de `/legal` segue não medido. Nota de leitura: o `source` é `/legal` sem idioma, e `apps/web/app/[locale]/legal/` não tem `page.tsx` (só `privacy`, `terms` e `components`), então `/pt-br/legal` não é coberto por esse redirecionamento. **Visto de novo em 2026-10-15** pelo `/test` da PR #46, nos dois builds da web (com e sem `NEXT_PUBLIC_DOCS_URL`), com a página respondendo 200; o `/legal` segue não medido. Terceira aparição: pela §5.1 a próxima passa a ser medição, não registro |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-07 | motivo |
|--------|---------------------|--------|
| A ligação entre o header gravado pelo proxy e o `headers()` do Server Component, sem teste automatizado | **continua aberta**, comportamento medido | o `/test` mediu os itens 1 a 9 por `curl` e navegador em build de produção; um teste automatizado exigiria servidor de pé, que o plano recusou |
| Testes de proxy presos ao formato interno `x-middleware-request-*` do Next 16.0.0 | **continua aberta**, aceita | mesmo padrão dos testes de `x-app-path` que já estavam em `main`; um upgrade do Next quebra os dois juntos |
| Caso de `lang` no Playwright | **fora de escopo** | decisão do plano (pergunta 6) |

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
| Limpeza do diálogo de exclusão depois de uma exclusão bem-sucedida | **fora de escopo** | no sucesso a sessão termina e o app vai para o login; o diálogo não reabre |
| Anúncio do diálogo por leitor de tela | **continua aberta**, 🔒 | não há instrumento no repo |
| T1 sem o `SidebarRail` no celular | **continua aberta**, risco baixo | no celular a barra vira `Sheet`; o rótulo é o mesmo do caso de desktop |
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
| Troca de idioma pela navegação do App Router sem teste automatizado | **continua aberta**, comportamento medido | o jsdom não reproduz a troca de rota; o `/test` mediu pt-br → en → es → pt-br com um marcador em `window`. Mesma lacuna da PR #43 |
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
fechou com a PR #50, o da rota do Google, com a PR #51, e o da tela de erro global da app em inglês, com a PR #54, e os
três saíram também. Na
auditoria do mesmo dia, as âncoras dos oito foram conferidas (todas batem), o mecanismo do 500 do
`/auth/sign-in/google` foi medido, e o arquivamento pelo admin ganhou o fato da confirmação da tela. Os três que
restam na tabela seguem só lidos: medir exigiria subir app.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O login da landing não tem link de "esqueci a senha"** (**reduzido** em 2026-10-21, pós-PR #55) | `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx` (nenhum link para a recuperação) · a app tem o fluxo em `apps/app/app/[locale]/(unauthenticated)/forgot-password/` e `reset-password/`; a landing não tem rota de recuperação | Quem esqueceu a senha e chegou pela landing precisa saber que a recuperação mora na app. A linha nasceu maior: o login não levava a lugar nenhum depois de entrar e o cadastro não pedia o e-mail de verificação. As duas partes fecharam com a PR #55 (`web-auth-forms`, na lista de fechados). Não bloqueou [`pricing-page-catalog`](../docs/features/pricing-page-catalog/spec.md): pela D4, o CTA de preços leva ao cadastro da app. Foi também o motivo de [`magic-link-sign-in`](../docs/features/magic-link-sign-in/spec.md), entregue pela PR #56, deixar a landing fora do corte. P |
| 🟢 **O `playground` de componentes aparece no menu lateral do usuário final** | `apps/app/app/[locale]/(authenticated)/(common)/routes.tsx:27-33` | É vitrine de quem desenvolve; num fork em produção, o usuário vê uma página de componentes de exemplo. Esconder fora do desenvolvimento, ou tirar do menu, é decisão rápida |
| 🟢 **Os menus laterais não levam às homes** | `(common)/routes.tsx:26-82` (sem item "Início") · `admin/routes.tsx:18-33` (só usuários e auditoria, sem `/admin`) | A home do usuário e o painel do admin, entregues por `dashboard-home` e `admin-analytics-dashboard`, só se alcançam pelo breadcrumb ou pelo logo |

### 🆕 Achados da PR #47 (2026-10-16)

Vindos do plano (Riscos e "Achados para o backlog"), do `/review` (rodada 1) e do `/test` da spec
`pricing-page-catalog`, conferidos no código em `dd31a95`. Todos existiam antes do diff ou ficaram fora do corte por
decisão registrada; nenhum bloqueou a entrega.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **`postAuthRedirectTarget` decodifica o destino duas vezes** | `packages/auth/redirect.ts:27` (`decodeURIComponent` sobre um valor que o `searchParams.get` já decodificou) | Valores de query com `%26`, `%3D` ou `%25` perdem a codificação ao passar pelo guard, e um `%` malformado faz o destino cair no fallback. Os `priceId` da Stripe (`price_` e alfanuméricos) não são afetados. Do plano da PR #47; o `/test` o deixou fora de escopo. P |
| 🟢 **A sessão expirada leva ao login só com o caminho, sem a query** | `packages/auth/provider.tsx:87-97` (era `:80-90` até a PR #56; `expiredSessionOrigin` usa `window.location.pathname` quando não há `redirect`) | Quem estava numa listagem filtrada ou na aba de cobrança com `?plan=` volta para a página sem os filtros depois de entrar de novo. Fora do caminho do CTA de preços. Do plano da PR #47. P. Encostava em `provider.tsx`, que `linked-sign-in-methods` declarava no `contends_on`; a PR #48 não tocou o arquivo, e nenhuma spec da fila o declara mais |
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
| 🟢 **`test:emulator` não sobe o emulador de Auth, e dois fluxos dependem de comportamento do Auth medido à mão** (ampliado em 2026-10-19, pós-PR #51) | `apps/api/scripts/emulator-tests.mjs` e o guard da suíte (só Firestore e Storage) · `accountSignInMethodsRoute.test.ts` (Admin SDK mockado) | **Ampliado:** a PR #51 deixou de fora de novo (§1.5 do plano de `password-unlink-email-restore`), e o `/test` dela mediu à mão no emulador de Auth as premissas da nova tentativa; o `/test` do contrato do Google mediu o `USER_DISABLED` também à mão. A rota de desvínculo supõe que o Firebase apaga o e-mail ao tirar a senha e que devolver o e-mail revoga os tokens; a confirmação da troca de e-mail (PR #33) supõe o comportamento do código de ação. As duas medições foram feitas à mão no emulador e não ficaram no repositório; uma mudança de comportamento do Firebase passa pela suíte sem ninguém ver. Incluir o Auth muda o runner, o guard e o job do CI. M. Amplia a lacuna de `account-email-change`. **Ampliado em 2026-10-22:** a PR #56 deixou o Auth de fora de novo (D11 do plano), e o `/analyze` e o `/test` mediram à mão a conclusão do link, o código não gasto pelo e-mail errado e as contas inelegíveis; o emulador diverge da produção num ponto (mantém a senha da conta não confirmada), e só a documentação sustenta o comportamento real |
| 🟢 **O CI usa `ubuntu-latest` durante a migração do rótulo para o Ubuntu 26** | `.github/workflows/ci.yml:21`, `:60`, `:84`, `:142` | A execução de merge da PR #48 trouxe a anotação do GitHub: o rótulo passa a migrar para o Ubuntu 26 a partir de 2026-10-19 (<https://github.com/actions/runner-images/issues/14748>). Aquela execução ainda rodou em `ubuntu-24.04` (versão 20261012). Os jobs `verify` e `e2e` instalam JDK 21 e navegador do Playwright, que dependem da imagem; uma falha que apareça só depois da troca de imagem vai parecer culpa da PR da vez. P: fixar `ubuntu-24.04` ou acompanhar a próxima execução |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-19 | motivo |
|--------|---------------------|--------|
| Popup real do Google, "User account linking" do projeto e `auth/unauthorized-domain` | **fora de escopo**, 🔒 | exigem projeto Firebase real; somados à pendência 17 |
| Falha da devolução do e-mail pelo produto | **continua aberta**, 🔒 | não se reproduz sem injetar falha no Admin SDK. O achado fechou com a PR #51 (nova tentativa, revogação e log); a sequência no navegador depois do `500` ficou 🔒 também no `/test` dela |
| `auth_time` acima de 300 s | **continua aberta** | o emulador renova o `auth_time`; a recusa de 301 s está só em `recentGoogleSignIn.test.ts` |
| As três ações novas do SDK sem teste no `@repo/sdk` | **continua aberta**, risco baixo | `@repo/sdk` segue com 10 testes; as ações são exercitadas pelos testes da `apps/app` com o `apiClient` mockado |

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
| Trava do envio duplo sem passada de navegador | **continua aberta**, risco baixo | entrou na rodada 2 do `/review`, depois do `/test`; `contactFormPrefill.test.tsx` falha com a guarda antiga, e a suíte E2E não passa pela `/contact` |
| Texto de `EMAIL_SEND_FAILED` ("o e-mail") no formulário de mensagem | **fora de escopo** | decisão do plano (pergunta 3); um código próprio custa três linhas de tradução se a copy incomodar |

### 🆕 Achados da tarefa `admin-archive-access-revocation` (2026-10-19)

Vindos do `/review` e do `/test` da tarefa direta que fecha o arquivamento pelo admin sem tirar o acesso, conferidos
no working tree sobre `4eeb07b` e de novo em `main` (`4b0be90`) na auditoria pós-PR #50, que acrescentou a última
linha. Nenhum bloqueou a entrega. O do `USER_DISABLED` no `/auth/sign-in` saiu para a lista de fechados como "não
procede". O contrato de erro do `/auth/sign-in/google` com conta
desativada ampliou a linha da rota, que fechou com a PR #51 e está na lista de fechados.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Conta arquivada antes da correção entra em laço de redirecionamento se a desativação no primeiro contato falhar sempre** | `apps/api/(shared)/lib/user-merge.ts:62-68` (a falha do `revokeAccountAccess` só vai para o log; era `:60-66` até a PR #52) · `apps/app/proxy.ts:256-271` (sessão válida numa rota pública volta para a home) · `apps/app/lib/server/authSession.ts:34-39` (o 401 do `/auth/me` manda para o login) | Com a conta ainda habilitada no Auth, o proxy aceita o cookie, o layout recebe 401 e manda para `/sign-in`, e o proxy devolve para a home. Falha transitória se resolve na volta seguinte, que tenta desativar de novo; a persistente (o Admin SDK recusando o `updateUser`) prende a pessoa até o navegador cortar os redirecionamentos. Antes da tarefa esse caminho criava um perfil novo e não tinha laço. Saída provável: a app limpar o cookie quando o `/auth/me` responder 401 com sessão válida, o que fecha também o laço equivalente para qualquer outra falha do `/auth/me`. Não medido; o `/test` não tem como forçar a recusa persistente. P a M, `apps/app` |
| 🟢 **A primeira entrada por e-mail e senha de uma conta arquivada antes da correção volta ao formulário sem mensagem** | `packages/auth/provider.tsx:353-359` (era `:346-352` até a PR #56; `onAuthSuccess` grava o cookie e navega antes de o perfil ser consultado) · `apps/api/(shared)/lib/user-merge.ts:62-68` (a conta é desativada no `/auth/me` do layout) · `apps/app/lib/server/authSession.ts:34-39` | Medido pelo `/test`: a pessoa volta ao login sem aviso, porque o redirecionamento do servidor descarta o toast. A segunda tentativa mostra "Esta conta foi desativada.". Acontece uma vez por conta arquivada antes da correção, e é o comportamento que o plano da tarefa previu. P se alguém quiser a mensagem já na primeira vez |
| 🟢 **`actionMenu.test.tsx` "closes the open menu on Escape and returns focus to the trigger" falhou uma vez sob carga** | `packages/design-system/__tests__/actionMenu.test.tsx:447` (era `:419` até a PR #59) | No `pnpm test` da raiz, durante o `/test` desta tarefa, o caso levou 3711 ms e falhou com dois `next dev`, o Chrome do `agent-browser` e o build da app disputando a máquina. Passou nas três execuções seguintes do `/test`, na da auditoria pós-PR #50 (346 ms, com o arquivo inteiro em 14,3 s sob load 15,8), na da auditoria pós-PR #51, na da auditoria pós-PR #52 (arquivo inteiro em 21,8 s, sob load 24), nas das pós-PR #53, #54, #55 e #56 (o arquivo inteiro em 39,8 s, sob load perto de 33) na pós-PR #57 (load perto de 11), na pós-PR #58 e na pós-PR #59: 1 falha em 14. É o terceiro caso de teste instável registrado, de causa provavelmente diferente do `useListAuditEvents` (tempo, não teardown); não apareceu no CI. Ver [Detector de teste instável no CI](#lacunas-avaliadas-e-não-especificadas). P |
| 🟢 **`getMergedUserFromIdToken` não tem chamador** (novo, auditoria pós-PR #50) | `apps/api/(shared)/lib/user-merge.ts:33-49` (era `:31-47` até a PR #52; `git grep getMergedUserFromIdToken` fora de testes acha só a definição; o teste é `userMergeArchivedProfile.test.ts:180-190`) | O plano da PR #50 já registrava que a função não tinha chamador (§1.1) e mesmo assim a corrigiu e cobriu com teste, para os dois caminhos seguirem a mesma regra. É código morto mantido em par com `getMergedUserByUid`, com teste próprio que custa manutenção sem proteger caminho de produção. Apagar a função e o caso de teste, P, `apps/api` |

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
| Corrida entre dois eventos diferentes da Stripe | **continua aberta**, aceita | virou o achado acima |
| Evento real da Stripe | **fora de escopo**, 🔒 | pendência 23 |
| As quatro ações novas do SDK sem teste no `@repo/sdk` | **continua aberta**, risco baixo | `@repo/sdk` tem 14 testes desde a PR #57, nenhum para estas; as ações são exercitadas pelos testes da `apps/app` com o `apiClient` mockado. A PR #56 somou mais duas (ver a lacuna em [Achados da PR #56](#-achados-da-pr-56-2026-10-22)) |

### 🆕 Achados da PR #53 (2026-10-20): `api-edge-413-close-and-route-id`

Vindos do `/review` e do `/test` da tarefa `api-edge-413-close-and-route-id`, conferidos na branch (`6048311`) e de novo
em `main` (`d19e6fd`) nesta auditoria: `packages/auth/keys.ts` e `file.schema.ts` não mudaram. Nenhum foi aberto pelo
diff: os dois existiam antes dele. O terceiro
registro, o gate do `CORS_ORIGIN`, ampliou a linha que já existia em
[Segurança](#segurança-seguem-abertos-confirmados-no-código).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Com o conjunto parcial da conta de serviço em `""`, o `keys()` de `@repo/auth` lança uma mensagem que não ajuda** | `packages/auth/keys.ts:49-50` (e-mail e chave lidos sem `\|\| undefined`, ao contrário de `:54-61`) · checagem em `:65-70` | O `/review` da PR #53 abriu como 🟡, supondo que o `.env.example` derrubasse o build; o `/test` mediu com um teste descartável e derrubou: com os três `FIREBASE_ADMIN_*` vazios, `keys()` não lança. Só lança com o projeto preenchido e o e-mail ou a chave vazios, e aí a mensagem é "Invalid email address", enquanto o mesmo conjunto com as variáveis ausentes recebe "is required when any other FIREBASE_ADMIN_* variable is set". Trocar por `\|\| undefined` só melhora a mensagem. P |
| 🟢 **O `413` do `/files` sai sem `connection: close`** | `apps/api/(shared)/validation/file.schema.ts:60`, `:108-109` (recusa pelo `content-length` declarado) · `:125` (âncoras deslocadas uma linha pela PR #57) | Consistência com o `parseRequestJson` da PR #53. O `/test` não mediu defeito: 20 envios de 5 MiB com `content-length` deixaram 0 conexões abertas aos 2 s, porque o `curl` fecha sozinho, e em `chunked` a rota lê o corpo inteiro pelo `formData()` antes de recusar, então não sobra corpo preso no socket. Fica como nota para quem mexer no arquivo |

**Lacunas de teste e 🔒 herdados da PR #53, com veredito desta auditoria:**

| lacuna | veredito 2026-10-20 | motivo |
|--------|---------------------|--------|
| Sem teste de rota para id inválido em `entities/[id]` e `users/[id]` (D6 do plano) | **continua aberta**, por decisão do plano | as suítes de rota mockam o repositório; a guarda tem 8 casos em `baseRepository.test.ts` e o comportamento por HTTP foi medido pelo `/test` |
| Sem teste de emulador para a guarda (D7 do plano) | **continua aberta**, por decisão do plano | a guarda age antes de qualquer chamada ao Firestore, e o espião em `fakeDb.collection` já prova isso |
| `413` com `connection: close` na Vercel | **fora de escopo**, 🔒 | exige deploy; o comportamento foi medido em `next start` |

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

### 🆕 Achados da PR #54 (2026-10-21)

Vindos do plano (§1.4 e §1.5), do `/review` e do `/test` de `leftover-ui-strings`, registrados pela passada incremental
da tarde, e do `/test` de `web-global-error`, conferidos no código de `main` (`af763bb`) nesta auditoria. Nenhum foi aberto
pelo diff: os quatro existiam antes dele. O registro do `global-error` inerte da web fechou com a PR e está na lista de
fechados; a linha da `apps/web` sem `not-found` e `error` foi reduzida. **Pós-PR #55:** três dos quatro fecharam (as telas de
erro sem estilo nem tema, o cartão colado na borda e a falta de `noValidate`) e saíram desta tabela para a lista de
fechados. Sobra o `start` sem porta.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **O `start` da `web` e da `api` não fixa a porta, e as duas sobem na 3000 da `app`** (novo, 2026-10-21, pós-PR #54) | `apps/web/package.json:7` e `apps/api/package.json:9` (`"start": "next start"`) · o `dev` fixa as portas (`apps/web/package.json:5`, `-p 3001`; `apps/api/package.json:5`, `-p 3002`) | **Medido** pelo `/test` de `web-global-error`: `pnpm --filter web start` subiu na porta 3000, e o repro do `review/review.md` e do plano dizia 3001. Quem segue a receita de build de produção ao pé da letra põe a web no lugar da `app`, e o `/test` contornou com `pnpm exec next start -p 3001`. A `api` tem o mesmo script, lido no código. Não afeta a Vercel, que define a porta. **Reescrito em 2026-10-21 (terceira passada da noite):** a correção que esta linha propunha, `-p` no `start` como no `dev`, quebraria quem hospeda fora da Vercel. No CLI do Next 16, a opção é `-p, --port` com `.default(3000).env('PORT')` (`node_modules/next/dist/bin/next:108`, lido nesta passada), e pelo commander o valor passado na linha de comando vence a variável. Com `-p 3001` fixo, uma plataforma que injeta `PORT` (o Cloud Run, por exemplo) ficaria com o processo na porta errada. A correção precisa respeitar `PORT` quando ela existe e só cair em 3001 e 3002 sem ela. P, com essa decisão de forma |

**Lacunas de teste herdadas da PR #54, com veredito desta auditoria:**

| lacuna | veredito 2026-10-21 | motivo |
|--------|---------------------|--------|
| O T3 da app não clica no botão para conferir o `reset()` | **continua aberta**, P | o `/test` de `web-global-error` clicou no botão da web (o mesmo componente com outra chave) e viu o `reset()` refazer a árvore; o da app viu o handler ligado. Teste só para isso não se paga |
| O `reset()` não pede de novo ao servidor | **fora de escopo** | é o comportamento do Next: se a causa sumir no servidor, a pessoa precisa recarregar. Registrado no relatório de `web-global-error` |

### 🆕 Achados da tarefa `web-auth-forms` (PR #55)

Vindos do `/review` (os três 🟢) e da seção "Achados adjacentes" do `/test` de `web-auth-forms`, registrados pela passada
incremental da noite e conferidos no código do working tree. Nenhum foi aberto pelo diff: os quatro existiam antes dele,
e o do `signInStartedHereRef` tem o mesmo resultado visível que o código de `main`. A copy do cadastro foi medida pelo
`/test` só na landing; a passada conferiu por leitura que a `apps/app` tem as mesmas chaves e o mesmo texto. Antes de
registrar, a passada procurou cada um neste arquivo (`AuthProvider`, `noAccount`, `Regístrate`, `mockRestore`,
`signInStartedHere`): nenhum estava registrado.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O cadastro da landing pergunta "Não tem uma conta?" ao lado de "Entrar", e o subtítulo é o do login** (**reduzido** em 2026-10-21, pós-PR #55) | `translations/apps/web/pages/signUp/index.ts:20`, `:45`, `:70` (`noAccount`), lido em `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx:179`, ao lado do link `signUp.signIn` · subtítulo `enterWithYourAccount`: `web/pages/signUp/index.ts:16`, `:41`, `:66`, lido em `sign-up-form-client.tsx:98` | Quem está no cadastro da landing lê "Não tem uma conta? Entrar" / "Don't have an account? Sign In" / "¿No tienes una cuenta? Iniciar sesión", e o subtítulo "Entre com sua conta para continuar", igual ao login; em es, "Regístrate en tu cuenta para continuar". Medido pelo `/test` de `web-auth-forms` nos três idiomas. **Reduzido:** a metade da app e o "¿" do login em es nas duas apps fecharam com a PR #55 (`app-sign-up-copy`, na lista de fechados), com as chaves renomeadas para `alreadyHaveAccount` e `createYourAccount`. A landing repete a mesma troca no próprio namespace; desde o merge, o formulário não está em nenhum diff pendente. P |
| 🟢 **A web monta dois `AuthProvider` aninhados, e o login com Google faz dois `POST /api/auth/session`** | `apps/web/app/[locale]/layout.tsx:36-37` (o `DesignSystemProvider` e, dentro dele, outro `AuthProvider`) · `packages/design-system/index.tsx:17-35`, `:44-49` (o `DesignSystemProvider` já monta um, com `errorAlert` e `getRedirectPath`) · cada um assina o token em `packages/auth/provider.tsx:330-346` e grava o cookie em `:161-187` (eram `:323-339` e `:154-180` até a PR #56) | **Medido** pelo `/test` de `web-auth-forms`: dois `POST /api/auth/session` por login com Google na landing, um por provider. Pela leitura, cada provider também tenta o bootstrap de SSO por conta própria e pede a renovação do cookie a cada troca de token (`refreshSessionCookie`, `provider.tsx:220`), então essas chamadas também dobram. A `apps/app` monta um só (`AppDesignProvider` → `DesignSystemProvider`). Os formulários da landing leem o provider mais interno, e o pedido de verificação do cadastro depende do observer dele, que não desmonta na navegação (R3 do plano da tarefa). Tirar um dos dois pede medir sessão, SSO e o fim de sessão de novo. P a M. **Ampliado em 2026-10-22:** o `/test` da PR #56 viu dois `POST /api/auth/session` por conclusão do link também na `apps/app`, que monta um provider só; pela leitura, um vem do `onAuthSuccess` (`provider.tsx:357`) e o outro do observador do token (`:330-346`). Se for isso, parte da duplicação da landing tem a mesma causa e não some tirando um dos providers. Não medido para o login por senha nem pelo Google na app |
| 🟢 **No login da landing, `signInStartedHereRef` não volta a `false`, e a tela fica vazia se o Firebase aceita a credencial e o cookie de sessão é recusado** | `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx:28` (o ref), `:79` e `:133` (vira `true` no envio e no Google), `:52-56` (o efeito não navega com o ref em `true`), `:58-60` (com `user`, devolve `null`) · `packages/auth/provider.tsx:353-370` (era `:346-362` até a PR #56; `onAuthSuccess`: o `catch` em `:360` mostra o toast e não navega) | A pessoa vê o toast de erro e a área do formulário vazia, sem botão para tentar de novo, até recarregar. Em `main` o resultado é o mesmo, porque o componente devolve `null` com usuário em qualquer caso. Não medido: o caminho exige forçar a recusa do `POST /api/auth/session`. A correção natural mora no provider (deslogar quando o cookie falha) e vai junto da linha anterior. P |
| 🟢 **`consoleErrorSpy.mockRestore()` só roda quando as asserções passam** | `apps/web/__tests__/signUpFormApi.test.tsx:189` (o `spyOn`) e `:204` (o `mockRestore`, depois do `expect` de `:203`) | Se o `expect` falhar, o espião fica ligado para os testes seguintes do arquivo. Só afeta a suíte depois de um teste já vermelho. O arquivo entrou em `main` pela PR #55 sem a correção; o `/review` registrou e não corrigiu. P (um `afterEach` ou `try/finally`) |

**Lacunas de teste herdadas de `web-auth-forms`:** os vereditos estão na versão deste arquivo em `df381f4`, seção
"Executada no working tree, sem commit (`web-auth-forms`)"; o resumo, na seção "Entregas desta rodada (PR #55)" da versão em
`9c793c6`.

### 🆕 Achados da tarefa `global-error-theme` (PR #55)

Vindos do `/review` e do `/test` de `global-error-theme`, registrados pela terceira passada incremental da noite e
conferidos no código do working tree. Nenhum foi aberto pelo diff. O quadro claro é efeito da correção, mas o estado
anterior era pior (a tela inteira sem tema). Antes de registrar, a passada procurou cada um neste arquivo (`quadro claro`,
`apps/api/app/global-error`, `Oops`, `algo deu errado`): nenhum estava registrado. O `console.error` da mesma tela da API
já aparece em [`observability-logging`](observability-logging.md) (`:151`) e não ganhou linha aqui. O R4 do plano (cookie
`x-theme` sem `localStorage.theme`) ficou sem linha, com o motivo na versão deste arquivo em `df381f4`, seção "Executada no working tree, sem commit
(`global-error-theme`)". As duas tarefas entraram em `main` pela PR #55; as âncoras das linhas abaixo foram relidas em
`df381f4` e não mudaram.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Na tela de erro global, com tema escuro, aparecem 1 ou 2 quadros claros antes do escuro** | `apps/app/app/global-error.tsx:30` e `apps/web/app/global-error.tsx:30` (o `ThemeProvider` aplica a classe `dark` num efeito, depois do primeiro commit) · `docs/features/global-error-theme/test/report.md`, seção 6 | **Medido** pelo `/test`, com um script que grava, a cada `requestAnimationFrame`, a classe do `<html>` e o fundo do `<body>`, em 5 recargas por estado. No escuro pelo sistema, o quadro claro apareceu em 5 de 5 recargas nas duas apps; com a escolha salva escura, em 4 de 5 na app e 5 de 5 na web. A classe `dark` chegou entre 10 e 32 ms. O CSS já estava carregado, e o estado final estava certo em todas. Observação, não defeito: a tela só aparece quando o root layout quebra. A hipótese do relatório para eliminar o quadro, aplicar a classe no `<html>` durante o render com a mesma regra do `next-themes`, não foi testada. P |
| 🟢 **A tela de erro global da `apps/api` tem o texto fixo em pt-br** | `apps/api/app/global-error.tsx:19` (`lang="pt-BR"`), `:21` ("Oops, algo deu errado") e `:22` ("Tentar novamente"), sem passar pelo dicionário · `apps/api/app/layout.tsx:7-11`, o root layout de quatro linhas que ela substitui · nenhuma `page.tsx` em `apps/api/app` | Contraria a regra de ouro 2 na letra. Na prática, a API não tem página, e a tela só aparece se aquele layout quebrar, então ninguém a vê. Registrado pelo `/review` de `global-error-theme`, fora do diff. P: ou passar pelo dicionário, ou apagar a tela, se o build da API provar que ela é dispensável. Valor quase nulo |

### 🆕 Achados da PR #55 (2026-10-21)

Vindos do `/review` de `app-sign-up-copy` (o componente) e das lacunas do plano da mesma tarefa (a chave do header),
conferidos no código de `main` (`df381f4`) nesta auditoria. Nenhum foi aberto pelo diff. Antes de registrar, a auditoria
procurou cada um neste arquivo (`components/sign-in`, `header.noAccount`, `header/index.ts`): nenhum estava registrado.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **O componente `@repo/auth/components/sign-in` não tem importador e traz "Don't have an account?" fixo no JSX** | `packages/auth/components/sign-in.tsx:125` (a string) · `packages/auth/package.json:17` (o export) · `git grep` por `auth/components/sign-in` em `apps/` e `packages/`: 0 | Código morto exportado por um pacote de integração, com string de UI solta (regra de ouro 2). Ninguém vê, mas quem procurar "o formulário de login do pacote" acha um componente em inglês que não segue o design system nem o SDK. P: apagar o arquivo e o export |
| 🟢 **A chave `components.header.noAccount` não tem consumidor, e em es falta o "¿"** | `packages/internationalization/translations/components/header/index.ts:15`, `:33`, `:51` ("No tienes una cuenta? ") · `git grep "header.noAccount"` em `apps/` e `packages/`: 0 | Chave órfã com a mesma copy que a PR #55 corrigiu no login. Quem a reaproveitar herda o erro em es. Ficou fora de `app-sign-up-copy` por decisão do plano (D6). P: apagar a chave nos três idiomas, junto da linha acima |

### 🆕 Achados da PR #56 (2026-10-22)

Vindos do `/review` (os 🟢 e a decisão em aberto 1), das "Observações" e das lacunas do `/test` de
`magic-link-sign-in`, e da medição desta auditoria, conferidos no código de `main` (`9c793c6`). Nenhum bloqueou a
entrega. Antes de registrar, a auditoria procurou cada um neste arquivo (`Could not establish`, `User disabled`,
`noValidate`, `AuthCard`, `FullScreenLoader`, `redirect=`, `SECURITY.md:17`, `session-refresh/spec.md`,
`localStorage`): só o `noValidate` aparecia, na linha da landing já fechada. O balão nativo e o cartão sem margem
existem também no "Esqueci minha senha" da app, então são anteriores à feature; o loader e o `?redirect=` nasceram com
ela.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O `docs/SECURITY.md` não acompanhou a PR #56** (reduzido em 2026-10-23, pós-PR #57) | `docs/SECURITY.md:7` (métodos de login sem o link) · `:162` (a lista de rate limit e o que fica de fora) | **Reduzido:** a PR #57 corrigiu as contagens, que hoje batem com o código (55 rotas, 18 nus, 12 em `/auth/*`, 17 caminhos). Seguem de fora o login por link entre os métodos de entrada, a regra de quem recebe o link e a rota de disponibilidade, fora do rate limit de propósito (`apps/api/proxy.ts:34-36`, o comentário). P, só documento |
| 🟢 **Quando a sessão não é gravada depois do login, o provider engole a falha e o alerta sai em inglês fixo** | `packages/auth/provider.tsx:353-370` (`onAuthSuccess`: o `catch` em `:360` mostra o alerta e retorna) · `:364` (`new Error("Could not establish session")`) | A mutation termina em sucesso com a sessão recusada, para os três logins (senha, Google e link). A página do link ganhou uma saída na PR #56 (`EmailLinkCompletion.tsx:165-178`); o login por senha e o Google seguem sem. O texto passa pelo `FormattedError`, que devolve a `message` de um `Error` comum, e aparece em inglês em pt-br e es (medido pelo `/test`). A correção que o `/review` recomendou: uma mensagem traduzida primeiro, depois separar o corpo de `onAuthSuccess` numa função que lança. P a M |
| 🟢 **`auth/user-disabled` em en diz "User disabled."** | `packages/internationalization/translations/packages/auth/index.ts:55` (pt-br `:16` e es `:96` dizem "Esta conta foi desativada.") | A conta desativada que tenta o link, a senha ou o Google lê uma mensagem seca só em inglês. Copy, P |
| 🟢 **Os seis formulários de autenticação da app não têm `noValidate`** | `apps/app/app/[locale]/(unauthenticated)/`: `sign-in/components/SignInForm.tsx:136`, `sign-up/components/SignUpFormClient.tsx:154`, `forgot-password/components/ForgotPasswordForm.tsx:77`, `reset-password/components/ResetPasswordForm.tsx:97`, `sign-in/email-link/components/EmailLinkRequestForm.tsx:99`, `EmailLinkCompletion.tsx:201` | Com `type="email"`, o navegador mostra o balão nativo, no idioma dele, antes da mensagem do Zod (medido pelo `/test` no pedido de link e no "Esqueci minha senha"). A landing corrigiu o mesmo caso na PR #55. P, só `apps/app` |
| 🟢 **O `AuthCard` da app encosta nas bordas a 375 px** | `apps/app/app/[locale]/(unauthenticated)/components/AuthCard.tsx:11-12` (contêiner sem recuo lateral) | Medido pelo `/test` no pedido de link e no "Esqueci minha senha": o cartão vai de x = 0 a 375, enquanto o login fica com 39 px de cada lado. A landing resolveu com `px-4 md:px-2` na PR #55. P |
| 🟢 **Na conclusão do link, o texto "Entrando…" fica cerca de 280 px abaixo do spinner** | `apps/app/shared/components/ui/FullScreenLoader.tsx:13` (`min-h-[60vh]`) · `EmailLinkCompletion.tsx:168-193` | Medido pelo `/test`: a 375×812 o texto e o link de volta cabem na dobra, mas ficam longe do indicador. Cosmético. P |
| 🟢 **O link não leva o `?redirect=` da tela de login** | decisão D8 do plano · `EmailLinkRequestForm.tsx` e `emailLinkSignIn.ts` (o e-mail guarda só o código) | Quem chegou ao login por um deep link e escolheu o link por e-mail cai no destino padrão, não na página que pedia. O plano chamou de "melhoria pequena e isolada para depois": levar o destino sanitizado por `postAuthRedirectTarget`. P |
| 🟢 **O e-mail do pedido fica no `localStorage`, e o inventário de armazenamento do navegador só lista cookies** | `apps/app/shared/lib/emailLinkSignIn.ts:1`, `:7-13` (grava), `:24-30` (apaga só depois do sucesso) · `docs/PRE-PRODUCTION.md:495-504` e a seção "Cookies que usamos" | O endereço fica no navegador até o link ser usado, e a chave não aparece em nenhum inventário (o `bp:panel-state` do painel também não, `docs/AUTH-PANEL.md:78`). A gravação serve ao pedido que a pessoa fez; se o inventário deve cobrir armazenamento local é decisão de quem escreve a política de cada fork. Registro, P de texto |
| 🟢 **Âncora interna morta na spec arquivada de `session-refresh`** | `docs/features/session-refresh/spec.md:20` (`#entrega-—-o-que-foi-conferido`) · `:170` (o título) | O GitHub publica `#entrega--o-que-foi-conferido`, sem o travessão. Achado pelo verificador de links desta auditoria. Correção de um caractere |

**Ampliados na auditoria pós-PR #56, nas linhas deles:**

- **Os links mortos dos planos** ([Achados das PRs #37 a #39](#-achados-das-prs-37-a-39-2026-10-04)): o
  `analyze/plan.md:3` de `magic-link-sign-in` morreu com aquele arquivamento, o sétimo.
- **O `test:emulator` sem o Auth** ([Achados da PR #48](#-achados-da-pr-48-2026-10-19)): a PR #56 decidiu de novo não
  levar o Auth à suíte (D11 do plano), e o `/analyze` e o `/test` mediram à mão no emulador que o link de conta não
  confirmada mantém a senha, ao contrário da documentação de produção.
- **Os dois `POST /api/auth/session`** ([Achados da tarefa `web-auth-forms`](#-achados-da-tarefa-web-auth-forms-pr-55)):
  o `/test` da PR #56 viu dois por conclusão do link também na `apps/app`, que monta um provider só.

**Lacunas de teste e 🔒 herdados da PR #56, com veredito desta auditoria:**

| lacuna | veredito 2026-10-22 | motivo |
|--------|---------------------|--------|
| Nenhum teste monta o `AuthProvider` real com `signInWithEmailLink` | **continua aberta**, comportamento medido | o `/test` mediu cookie, `lastAccessAt`, destino do admin e onboarding no emulador; montar o provider com o Firebase mockado provaria só a linha `onSuccess: onAuthSuccess` |
| `429` real no pedido do link | **continua aberta**, 🔒 | exige `ARCJET_KEY`; somado à pendência 24. A lista está em `corsOrigin.test.ts` |
| Provedor de link desligado no console ou domínio não autorizado | **continua aberta**, 🔒 | exige projeto Firebase real; pendência 29 |
| Expiração real do link e leitor de link de e-mail corporativo | **continua aberta**, 🔒 | o emulador não expira o código; o `GET` do link antes de abrir não o gastou (medido), mas um leitor real não foi testado |
| A conta não confirmada perde a senha em produção ao concluir o link | **fora de escopo** | o filtro D1 impede que aconteça; a premissa vem da documentação do Firebase e diverge do emulador |
| As duas ações novas do SDK (`emailLinkSignInAvailability`, `requestEmailLinkSignIn`) sem teste no `@repo/sdk` | **continua aberta**, risco baixo | `@repo/sdk` tem 14 testes desde a PR #57, nenhum para estas; as ações são exercitadas pelos testes da `apps/app` com o `apiClient` mockado. Soma às quatro de notificação |

### 🆕 Achados da PR #57 (2026-10-23)

Vindos do `/review` (D2, D3 e o achado 13), das perguntas em aberto do plano e das observações e lacunas do `/test` de
`teams-organizations`, conferidos no código de `main` (`61a781e`) nesta auditoria. Nenhum bloqueou a entrega. Antes de
registrar, a auditoria procurou cada um neste arquivo e no `docs/PRE-PRODUCTION.md`: nenhum estava registrado. Os
pré-requisitos de infra da entrega (índices de `entity` por organização, TTL de convites, Resend, `ARCJET_KEY`, a
variável nas duas apps) já estão no `PRE-PRODUCTION.md` §1.10 e §16 e não se repetem aqui. **Na auditoria pós-PR #58
(2026-10-27)** saíram desta tabela as linhas de D10, D11 e do `500` do convite, fechadas pela PR #58 (conferência na
versão deste arquivo em `277da43`). **Na auditoria pós-PR #59 (2026-10-28)** saiu a linha da trilha de auditoria da
organização, fechada pela PR #59 (conferência em [Entregas desta rodada](#entregas-desta-rodada-pr-59)).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **O cadastro aberto a partir do convite não traz o e-mail preenchido** | `apps/app/app/[locale]/(unauthenticated)/sign-up/page.tsx:9`, `:26` (só lê `redirect`) | Quem é convidado digita o endereço de novo e pode errar, e o aceite exige o mesmo e-mail do convite. `SignUpFormClient.tsx` é do `contends_on` de `social-sign-in-providers`. P a M |
| 🟢 **Trocar a foto de um registro apaga o objeto mesmo que outro registro o use** | `apps/api/app/(routes)/entities/[id]/route.ts:89-103` | Com fotos na pasta da organização, um membro pode copiar a URL de outro registro; trocar a foto de um apaga a do outro. Corrigir pede contagem de referência. M |
| 🟢 **O aceite não exige e-mail verificado, e quem convida também não precisa ter** | `apps/api/app/(routes)/invitations/accept/route.ts:44-49` (o comentário declara; era `:41-46` até a PR #59) · `organization/invitations/route.ts:50-182` (nenhum `emailVerified`; era `:48-167` até a PR #59 e `:47-149` até a PR #58) | Um link encaminhado funciona para uma conta não verificada criada com o endereço convidado. Escolha do plano (Q12, Q13), escrita só no comentário; o `docs/SECURITY.md` não a cita. P de texto, ou decisão de produto |
| 🟢 **`requirePlanApi` ficou sem chamador** | `apps/api/app/(guards)/plan.ts:30` · o gate da criação de `entity` passa por `requireOrganizationApi({ plan })` | Guard exportado sem uso, e o `docs/PRE-PRODUCTION.md` §12 ainda o cita como o gate por status. O `docs/SECURITY.md:37` registra. P: apagar ou manter como exemplo, com o texto acompanhando |
| 🟢 **A nota do `STATE.md` da feature contradiz a tabela** | `docs/features/teams-organizations/STATE.md:43` ("a linha `review` continua `in-progress`") · a tabela, `:16`, diz `done` | Quem lê o histórico da feature encontra os dois. A auditoria não edita o `STATE.md` além do campo `spec:`. Soma à E11 |

**Ampliados nesta rodada, nas linhas deles:**

- **Os links mortos dos planos** ([Achados das PRs #37 a #39](#-achados-das-prs-37-a-39-2026-10-04)): o
  `analyze/plan.md:3` de `teams-organizations` morreu com este arquivamento, o oitavo.
- **O predicado de posse copiado**: fechado pela PR #57; a linha saiu da tabela de
  [Repositório, rotas e proxy](#-repositório-rotas-e-proxy) e o registro está no topo de [Achados](#achados-correções-pontuais-não-specs).
- **A superfície sem guard e as rotas fora do rate limit** ([Segurança](#segurança-seguem-abertos-confirmados-no-código)):
  18 de 55 arquivos nus, e cinco das oito rotas de organização fora da lista.

**Lacunas de teste e 🔒 herdados da PR #57, com veredito desta auditoria:**

| lacuna | veredito 2026-10-23 | motivo |
|--------|---------------------|--------|
| Membros e convites sem fluxo na suíte E2E | **fechada em 2026-10-28** pela PR #59, com ressalva | `apps/e2e/tests/organizationOwnership.spec.ts:68` percorre convite, aceite e transferência com a variável ligada na pilha inteira (`stackEnv.ts:37`) e passou no job `e2e` do merge. A emissão do convite pela tela e a entrega do e-mail seguem sem rede (🔒, em [Achados da PR #59](#-achados-da-pr-59-2026-10-28)) |
| O prefetch no servidor da página da equipe | **continua aberta**, risco baixo | `organization/page.tsx:18-35`; `organizationPagesSwitch.test.tsx` cobre só o 404 e as props |
| O teto de 20 convites pendentes contra o Firestore real | **continua aberta**, risco baixo | coberto com mock (`organizationInvitationsRoute.test.ts`); o teste de emulador define o teto e não o exercita |
| As ações do SDK de organização | **continua aberta**, risco baixo | `organizationAction.test.ts` tem 3 casos para 9 métodos; soma às ações de notificação e do link de acesso |
| Entrega real do convite, `429` com `ARCJET_KEY`, índices publicados e TTL | **continua aberta**, 🔒 | exigem Resend, chave, projeto real; pendências 13, 24, 1 a 4 e §16 do `PRE-PRODUCTION.md` |

### 🆕 Achados da tarefa `organization-guardrails` (PR #58, 2026-10-23)

Vindos do `/review` (o 🟡 e os dois 🟢) e das lacunas do `/test` da tarefa direta `organization-guardrails`, registrados
na rodada delta e reconferidos no código de `main` (`c0c06f2`) na auditoria pós-PR #58, que levou a tarefa. A linha do
🟡 do membro arquivado saiu: a tarefa `organization-archived-member`, na mesma PR, fechou o caso. Antes de registrar, a rodada procurou cada caso neste arquivo
(`ownsOrganizationWithMembers`, `listByOrganization`, `MEMBERS_ENABLED`, promoção, `500` sem código): só o `500` do
convite aparecia, e ele é outro caso, em andamento na própria tarefa.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Com `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED` desligada depois de haver membros, ninguém remove membro e o dono não sai** | `apps/api/(shared)/lib/organization-members.ts:21-28` (as rotas de membros respondem `404 ORGANIZATION_MEMBERS_DISABLED`) · `organization-membership.ts:108-132` (o helper não lê a variável; era `:105-117` até a PR #59) | O dono não remove ninguém, a exclusão da própria conta é recusada (já em `main`) e, com `organization-guardrails`, o admin também não o arquiva. Resta o bloqueio (`PUT` com `disabled: true`). O `docs/PRE-PRODUCTION.md` §16 já diz que desligar a variável não desfaz a equipe. Desde a PR #59 a transferência também responde `404` com a variável desligada, então ela não serve de saída nesse caso. Decisão de produto: abrir a remoção com a variável desligada ou só documentar o efeito. P |
| 🟢 **O admin promove a admin o dono de uma organização com membros sem recusa** | `apps/api/app/(routes)/users/[id]/route.ts:138-140` (grava `type` sem consultar vínculo; mesmas linhas em `main`) | O guard do painel comum recusa perfil que não é `COMMON` (`(guards)/common-panel.ts:77-80`), e o guard da organização compõe sobre ele; promovido, o dono perde as rotas da equipe, e a organização fica sem quem a gerencie, como no D10. Fora do escopo de `organization-guardrails`; o `/review` e o `/test` deixaram como lacuna aberta. Pede decisão (recusar a promoção ou aceitar que um admin siga dono). Desde a PR #58 o arquivo está em `main`, sem colisão. Desde a PR #59 ([`organization-ownership-transfer`](../docs/features/organization-ownership-transfer/spec.md)), o dono tem como entregar a equipe antes da promoção, mas o admin ainda promove sem recusa; a decisão continua sua e está no "Fora do corte" daquela spec. Reconferido em 2026-10-28: `users/[id]/route.ts` não foi tocado pela PR. P |
| 🟢 **Falha do Firestore numa leitura de recusa vira `500` sem `error.code`** | `apps/api/app/(routes)/users/[id]/route.ts:178` (`findById`) e `:191` (`ownsOrganizationWithMembers`), em `main` desde a PR #58 · `account/deletion/route.ts:44` (o helper; era `:43` até a PR #59) | Contraria a regra de ouro 3: o front mostra o erro genérico. O `/review` de `organization-guardrails` deixou como está porque é o mesmo comportamento das leituras vizinhas. Recebe também o resto do 🟢 do convite ("outras rotas fazem o mesmo"), que a PR #58 fechou. **Ampliado na rodada delta 2:** com `organization-archived-member`, o helper lê também um perfil por membro (`organization-membership.ts:128-130`, `Promise.all`; era `:123-125` até a PR #59), e a falha de qualquer leitura vira o mesmo `500`, antes de qualquer escrita nos dois consumidores (medido pelo teste de rota novo). **Ampliado em 2026-10-28, pós-PR #59:** antes das leituras por membro, o helper lê a lista de organizações de que a pessoa é dona (`listOwnedBy`, `organization-membership.ts:111`), e uma leitura por organização. A correção que vale é um padrão comum de leitura que falha, não um `try` por chamada. P a M |

### 🆕 Achados da tarefa `organization-archived-member` (PR #58, 2026-10-23)

Vindos da §12 do plano, do `/review` (os dois 🟢 e a decisão em aberto dos documentos) e das lacunas do `/test` da
tarefa direta `organization-archived-member`, registrados na rodada delta 2. A tarefa entrou em `main` pela PR #58;
as âncoras foram relidas em `c0c06f2`. Antes de registrar, a rodada procurou cada caso neste arquivo (`refuseCurrentMembership`,
`OWNER_HAS_MEMBERS`, `isOrganizationActive`, `ROPA.md:193`): o D10 cita convites aceitáveis de um dono arquivado com
membros, que é o caso que `organization-guardrails` passa a recusar; o dono arquivado sem membros vivos é outro, e
entrou como linha própria. **Na auditoria pós-PR #59 (2026-10-28)** saíram as duas linhas do convite (o aceite que
contava o membro arquivado e os convites de um dono arquivado), fechadas pela PR #59, e a dos documentos foi reduzida.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Dois documentos da recusa não dizem que perfil arquivado não conta** (reduzido em 2026-10-28, pós-PR #59) | `docs/ROPA.md:193` · `docs/INCIDENT-RESPONSE.md:52` | Falam do "dono que ainda tem membros" sem a exceção que o helper faz. Não ficam falsos. **Reduzido:** a PR #59 reescreveu os três trechos para citar a transferência como saída, e o `docs/PRE-PRODUCTION.md:946-950` passou a dizer "membro vivo"; os outros dois seguem sem a exceção. O `docs/SECURITY.md:40` já tinha sido ajustado. P, só texto |

### 🆕 Achados da PR #59 (2026-10-28)

Vindos do `/review` (os 🟢) e das lacunas do `/review` e do `/test` de `organization-ownership-transfer`, conferidos no
código de `main` (`277da43`) nesta auditoria. Nenhum bloqueou a entrega. Antes de registrar, a auditoria procurou cada
caso neste arquivo (`ORGANIZATION_FORBIDDEN`, `findOwnedBy`, `listOwnedBy`, `claimLegacyRecords`, `rc-menu`): só o
Espaço do menu de ações aparecia, e a linha dele, em [Achados da PR #40](#-achados-da-pr-40-2026-10-07), ganhou a
reconfirmação. Os pré-requisitos de infra de membros e convites seguem no `PRE-PRODUCTION.md` §16, sem passo novo.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Depois de uma recusa da transferência, a tabela da equipe segue com as ações de dono** | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/organization/(hooks)/useOrganizationActions.tsx:73-96` (o `onError` só mostra o alerta) | Se outra aba já transferiu, aparece o toast de `ORGANIZATION_FORBIDDEN` e a tabela continua oferecendo "Tornar dono" e "Remover da equipe" até recarregar. A API recusa certo; é tela defasada. A remoção de membro faz o mesmo, então não é regressão. Nenhum teste cobre a tela depois dessa recusa. P |
| 🟢 **A organização recebida por transferência fica dormente quando o dono entra noutra equipe e sai** | `apps/api/(shared)/repositories/organization.repository.ts:24-42` (`listOwnedBy` em ordem de criação; `findOwnedBy` devolve a mais antiga) · `organization-membership.ts:47-64` (`joinHomeOrganization`) | Quem é dono de duas organizações, aceita convite de uma terceira e depois sai volta para a mais antiga. A outra fica sem ninguém, com os registros fora do alcance da tela até a exclusão da conta, que a apaga. Foi a decisão 6 do plano, tomada de propósito; fica como risco, não defeito. Pede decisão só se um fork esbarrar nele |

**Lacunas de teste e 🔒 herdados da PR #59, com veredito desta auditoria:**

| lacuna | veredito 2026-10-28 | motivo |
|--------|---------------------|--------|
| A retrocarga pendente do antigo dono não tem teste (`claimLegacyRecordsQuietly` sai cedo quando a pessoa deixou de ser dona) | **continua aberta**, risco aceito no plano | só alcança o dono que transfere antes de a migração dos registros antigos terminar |
| A corrida entre o arquivamento pelo admin e a transferência, fora de transação | **fora de escopo**, risco aceito no plano | o arquivamento não roda numa transação com os vínculos; a transferência recusa alvo arquivado dentro da dela |
| A suíte E2E não emite o convite pela tela nem entrega e-mail | **continua aberta**, 🔒 | depende de Resend (pendência 13); a emissão fica com `organizationInvitationsRoute.test.ts` |
| A suíte E2E roda só em pt-br, desktop e tema claro | **continua aberta**, risco baixo | o `/test` percorreu en, es, escuro e 375 px à mão nesta entrega; ampliar a suíte é outra tarefa |
| O envio do convite e o rótulo "convite enviado" na trilha | **continua aberta**, 🔒 | sem provedor de e-mail a rota responde `503 EMAIL_NOT_CONFIGURED` antes de gravar; coberta por teste de rota. Soma à pendência 13 |

**Ampliados nesta rodada, nas linhas deles:**

- **Os links mortos dos planos** ([Achados das PRs #37 a #39](#-achados-das-prs-37-a-39-2026-10-04)): o
  `analyze/plan.md:3` de `organization-ownership-transfer` morreu com este arquivamento, o nono.
- **As rotas fora do rate limit e a superfície sem guard** ([Segurança](#segurança-seguem-abertos-confirmados-no-código)):
  seis das nove rotas de organização fora da lista; 18 de 56 arquivos nus.
- **O `500` sem `error.code` nas leituras de recusa** ([Achados da tarefa `organization-guardrails`](#-achados-da-tarefa-organization-guardrails-pr-58-2026-10-23)):
  o helper passou a ler também a lista de organizações do dono antes das leituras por membro.

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md).
> Na auditoria pós-PR #59 (2026-10-28) foram remedidas as linhas 6, 8, 13, 15, 16 e 30, e as âncoras do
> `PRE-PRODUCTION.md` nas linhas 24, 26 e 27, que a PR deslocou (+2 linhas no §16 e +1 no §11 da exclusão de conta). A
> PR não criou pendência nova nem mexeu em infra; somou casos às 13 e 30.
>
> Na auditoria pós-PR #58 (2026-10-27) foram remedidas as linhas 6, 8, 15 e 16; a PR não criou pendência nova nem
> mexeu em infra.
>
> Na auditoria pós-PR #57 (2026-10-23, 16:40 a 17:30 BRT) foram remedidas as linhas 1 a 4, 6, 8, 16 e 28; as âncoras
> do `PRE-PRODUCTION.md` nas linhas 15, 23, 24, 26 a 29 foram remedidas por conteúdo, porque a PR acrescentou o §1.10 e
> o §16. As outras mantêm o veredito anterior, com motivo: exigem console de provedor, ou dependem de arquivos que a
> PR #57 não tocou. A PR #57 criou a pendência 30 (membros e convites num projeto real) e somou um caso às 1 a 4, 8, 13
> e 24.

| # | pendência | onde vive | veredito (2026-10-23, pós-PR #57, nas linhas remedidas; datas anteriores nas demais) |
|---|-----------|-----------|---------------------|
| 1 | 🔴 Publicar os três índices dos resumos da home (`GET /entities/summary` e `/users/summary` respondem 503 sem eles) | `PRE-PRODUCTION.md` §1.5 | **continua aberto, medido de novo em 2026-10-23, pós-PR #57**: o `ListIndexes` do Firestore Admin em `next-boilerplate-576d0` (pelo MCP do Firebase, grupo `-`) devolve um único índice composto, o de `user` `reference_id` + `deletedAt`, `READY`. **Ampliado:** os dois índices de `entity` do resumo passaram a `organizationId` + `deletedAt` + (`enabled` ou `type`), e o §1.10 (`PRE-PRODUCTION.md:299-331`) pede publicá-los **antes** do deploy da API, senão a home responde 503 |
| 2 | 🔴 Publicar o índice das faixas de recência (`user`: `deletedAt` + `lastAccessAt`) | `PRE-PRODUCTION.md` §1.7 | **continua aberto, medido em 2026-10-23**; idem |
| 3 | 🔴 Publicar o índice da trilha de auditoria (filtro por usuário responde 503) | `PRE-PRODUCTION.md` §1.2 | **continua aberto, medido em 2026-10-23**; idem |
| 4 | 🔴 Publicar o índice da listagem paginada de `entity` | `PRE-PRODUCTION.md` §1.1 | **continua aberto, medido**: o `/test` da PR #35 recebeu `503 PAGINATION_INDEX_MISSING` em `GET /entities` contra o projeto de desenvolvimento (`test/report.md:85`), então o índice não está publicado nem lá; a medição de 2026-10-23 confirma. **Ampliado pela PR #57:** o índice passou a `organizationId` + `deletedAt` + `createdAt`, e o antigo por `userId` saiu do arquivo. Com os dois de `notification` (§1.9, PR #52), seguem **oito** índices sem publicação, de nove declarados; o comando é um só |
| 5 | Retenção da coleção `auditEvent` | `PRE-PRODUCTION.md` §1.3 | **continua aberto**, estacionado (E5) |
| 6 | ⚠️ `main` sem branch protection | `PRE-PRODUCTION.md` §9 | **continua aberto**, remedido em 2026-10-28 pós-PR #59 (404, `[]`, 59 PRs, nenhuma aberta); estacionado (E3). É o que falta para o item 2 de `e2e-testing`, arquivada com esse ⚠️ |
| 7 | Backfill de instantes em base que já tem dado | `PRE-PRODUCTION.md` §1.4 | **continua aberto**; não é mensurável daqui |
| 8 | Ninguém vigia a trilha de erro (nenhum coletor) | `PRE-PRODUCTION.md` §11 | **continua aberto**, remedido em 2026-10-28 pós-PR #59: `git grep` por `@sentry`, `@logtail`, `@axiomhq` e `betterstack` em `apps/` e `packages/` devolve 0, e `logEvent(` fora de testes segue em **49** (48 chamadas e a definição); a PR #59 não somou caso; estacionado (E1). A PR #58 somou um caso que só um coletor alcança: a falha na conferência do convidado sai como `[organization] invitation-member-check-failed` (`organization/invitations/route.ts:82`), e a tela mostra `503 ORGANIZATION_INVITATION_FAILED`. A PR #57 somou quatro casos que só um coletor alcança: o convite gravado cujo e-mail falhou (`[organization] invitation-delivery-failed`, `organization/invitations/route.ts:162`), a organização que não se cria no cadastro (`membership-create-failed`, `organization-membership.ts:96`) e a migração dos registros antigos que falha ou para no teto (`legacy-claim-failed` e `legacy-claim-unfinished`, `:41` e `:37`). A PR #56 somou dois casos: a entrega do link que falha depois da resposta sai só como `[auth] email-link-delivery-failed` (`auth/sign-in/email-link/request/route.ts:40`), e o provedor de link desligado num projeto real só aparece como `[auth-action-link] refused` no log, com a tela dizendo "Confira seu e-mail" (`PRE-PRODUCTION.md` §15). A PR #52 somou mais um caso: a notificação que não se grava sai só como `[notifications] emit-failed` no log (`(shared)/lib/notifications.ts:46`), e o produtor segue sem ela. A PR #51 trocou um caso por outro: o desvínculo da senha que falha no meio agora registra o `uid` no log (`password-unlink-email-restore-failed`, `account/sign-in-methods/[id]/route.ts:125`), mas a conta pode seguir sem e-mail, e só um coletor faz alguém ver a linha. A PR #50 acrescentou mais um caso que só um coletor alcança: a falha persistente da desativação no primeiro contato vai só para o log (`archived-account-lockout-failed`, `user-merge.ts:64`). A PR #48 tinha deixado o desvínculo da senha sem registro nenhum do `uid` (achado fechado pela PR #51) |
| 9 | Health check da plataforma não aponta para `/health/ready` | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: configuração de plataforma |
| 10 | `SESSION_COOKIE_DOMAIN` em subdomínios distintos | `PRE-PRODUCTION.md` §7 | **continua aberto** (configuração de deploy). Desde a PR #49 o e-mail preenchido em "Ajuda e contato" depende dele: a landing lê a sessão compartilhada, e o `/test` só mediu em `localhost` (🔒) |
| 11 | Cloud Storage não ativado (plano Blaze) | `PRE-PRODUCTION.md` §6 | **continua aberto** em produção. Desde a PR #31, upload, avatar e o passo `storage` do expurgo rodam e têm teste sob o emulador; contra bucket real seguem sem prova o objeto que não abre sem assinatura e a expiração da URL V4 |
| 12 | Revogação de sessão nunca provada ponta a ponta | *(só neste arquivo)* | **metade fechada**, reconhecido na auditoria pós-PR #34: o `/test` de `compliance-docs-kit` mediu em 2026-09-30, contra o projeto Firebase de desenvolvimento, que depois de `revokeRefreshTokens` o cookie emitido antes volta `null`, o bearer volta `null` em `resolveApiActor` e `createSessionCookie` com o token anterior lança `auth/id-token-expired` (`docs/features/compliance-docs-kit/test/report.md`, tabela "Resultado bruto"). É a prova que a ressalva de `session-refresh` pedia para a camada de verificação. **Continua aberto** só o percurso de navegador: sair numa app e ver a outra perder a sessão. O `/test` da PR #35 somou a medição da conta desativada (bearer recusado com e sem revogação, e depois da reativação) e também não subiu navegador |
| 13 | Envio real de e-mail nunca provado | `PRE-PRODUCTION.md` §3 | **continua aberto** (exige domínio com SPF/DKIM). O `/test` da PR #24 viu o envio do e-mail de verificação falhar sob o emulador, com `RESEND_TOKEN` vazio, como esperado. O `/test` da PR #29 deixou 🔒 o e-mail de verificação depois do cadastro pela API (critério 20). O `/test` de `brand-config` deixou 🔒 o nome da marca com acento na caixa de entrada. O `/test` da PR #33 deixou 🔒 a entrega do aviso ao endereço antigo e do link ao novo; sem Resend o pedido responde `503 EMAIL_NOT_CONFIGURED`, medido nos 3 idiomas. O `/test` da PR #49 deixou 🔒 a entrega do formulário de contato na caixa de suporte; sem Resend a rota responde `503 CONTACT_UNAVAILABLE`, e com token falso, `503 EMAIL_SEND_FAILED`, medidos nos 3 idiomas. O `/test` de `web-auth-forms` (PR #55) deixou 🔒 o e-mail de verificação pedido pelo cadastro da landing; sem Resend, `503 EMAIL_NOT_CONFIGURED` nos 3 idiomas. O `/test` da PR #56 deixou 🔒 a entrega do link de acesso; sem Resend, `503 EMAIL_NOT_CONFIGURED`, e com token falso o Resend recusou e a resposta seguiu `200`, sem endereço no log. O `/test` da PR #57 deixou 🔒 a entrega do convite; sem Resend, o `POST /organization/invitations` responde `503 EMAIL_NOT_CONFIGURED` antes de gravar (`organization/invitations/route.ts:55-60`, era `:53-58` até a PR #59), e o `PRE-PRODUCTION.md:752-753` registra que o ciclo com e-mail real nunca rodou. O `/test` da PR #59 deixou 🔒 o envio do convite pelo dono novo e o rótulo "convite enviado" na trilha, pelo mesmo motivo |
| 14 | CSP Report-Only na `apps/web` | `PRE-PRODUCTION.md` §10 | **continua aberto**, deliberado |
| 15 | Contas de QA acumuladas no projeto de desenvolvimento | `PRE-PRODUCTION.md` | **continua aberto, não recontado**: exige o console do Firebase. O `/test` da PR #35 criou e apagou a própria conta (`PRE-PRODUCTION.md:1153`, era `:1150` até a PR #59 e `:1062` até a PR #57). Pelos relatórios, todos os `/test` desde a PR #37 rodaram sob o emulador, com contas `@example.com` que morreram com o processo; o da PR #56 criou cinco `qa-magic-link-*@example.com` lá, e o da PR #57 rodou sob o emulador, que parou sem exportar (`STATE.md` da feature). Os dois `/test` da PR #58 não criaram dado de QA (os `STATE.md` registram "sem dado de QA"). O da PR #59 rodou sob o emulador, com três contas `qa-ownership-*@example.com` e a do seed, apagadas pelo próximo seed (`test/report.md` da feature). A lista de cada rodada está no relatório da feature e na versão deste arquivo em `9c793c6`. O console não foi aberto |
| 16 | Branches mergeadas vivas no remoto | `PRE-PRODUCTION.md` | **continua aberto**, remedido em 2026-10-28 pós-PR #59: `git ls-remote --heads origin` devolve 57, ou seja, 56 além de `main`, uma a mais que na rodada anterior. A branch da PR #59, `guilhermebittelbrunn/cycle-value-task`, ficou viva, como as das PRs #56 a #58 |
| 17 | Login com Google sem passe manual com conta real; desde a PR #48, também vincular e confirmar o Google num projeto real | *(só neste arquivo)*; o "User account linking" e os domínios autorizados estão no `FORKING.md` §4, passos 3 e 4 | **continua aberto, ampliado em 2026-10-19.** O `/test` da PR #24 não percorreu o Google no emulador; o da PR #48 percorreu, mas com o IdP falso do emulador. Ficaram 🔒 o popup real do Google, a escolha de "User account linking" do projeto (que muda o primeiro login com Google de uma conta com senha) e a mensagem de `auth/unauthorized-domain` num domínio fora da lista |
| 18 | `storage.rules` nunca publicado (o teste veio com a PR #31) | `PRE-PRODUCTION.md` §6 e `:54-58` | **metade fechada** pela PR #31: `storage.rules` e `firestore.rules` têm teste contra emulador no `verify` (20 e 145 testes; entrega em [`storage-emulator-rules-tests`](../docs/features/storage-emulator-rules-tests/spec.md)). **Continua aberto** publicar no projeto real, que depende da 11 |
| 19 | Conferir a retenção de log da plataforma | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: painel do provedor |
| 20 | Reabertura do consentimento no `ProfileDropdown` nunca vista num browser | *(só neste arquivo)* | **continua aberto** |
| 21 | No modo `simple` o titular não alcança a aba de privacidade | `PRE-PRODUCTION.md`, seção "Pendência — no modo `simple`…" | **premissa falsa, medida**: o `simple` não restringe o painel comum, então o titular alcança a aba. **Fechada pelo usuário em 2026-09-25.** A nota de correção fica no documento. Volta se o `simple` passar a restringir o painel comum (E10) |
| 22 | `NEXT_PUBLIC_PRIVACY_CONTACT` precisa ser definida por fork | `PRE-PRODUCTION.md` §7 (checklist) | **continua aberto, reduzido em 2026-10-19.** Vazia, o canal cai no formulário de contato, que desde a PR #49 entrega na caixa de `NEXT_PUBLIC_APP_SUPPORT_EMAIL` e mostra o canal como indisponível sem ela ou sem a Resend. Deixou de ser maquete, mas o fork ainda precisa definir uma das duas variáveis para o titular ter canal |
| 23 | Stripe por fork: catálogo recorrente, Customer Portal, endpoint de webhook na versão `2025-09-30.clover` com **seis** eventos (a PR #27 acrescentou `invoice.paid` e a PR #38, `entitlements.active_entitlement_summary.updated`, `PRE-PRODUCTION.md:542`, era `:456` até a PR #52), recursos cadastrados no Dashboard para o gate por recurso, conferir o custo do Entitlements, chaves na `apps/api`, TTL opcional de `paymentEvent`; e a decisão sobre checar assinatura duplicada na Stripe antes do release | `PRE-PRODUCTION.md` §12 | **continua aberto**. A PR #33 acrescentou ao §12 habilitar a edição do e-mail no Customer Portal, porque a troca de e-mail não atualiza o `customer`. Cinco critérios de `billing-subscription`, quatro de `admin-billing-insights` o cancelamento real no arquivamento pelo admin (PR #28) , o botão de checkout em carregamento (PR #32) a entrega real do evento de recursos (PR #38) e o catálogo, as chamadas e o checkout reais da `/pricing` (PR #47) e a segunda tentativa de arquivamento com assinatura viva (PR #50) e os três avisos de mudança da assinatura no sino (PR #52) seguem 🔒 até uma conta real existir. A PR #47 acrescentou ao §12 o parágrafo da página de preços (`PRE-PRODUCTION.md:562-567`, era `:526-531` até a PR #57), sem passo novo: o catálogo é o mesmo da aba de cobrança. `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` seguem vazias nos `.env` locais |
| 24 | 🆕 `ARCJET_KEY` por fork: sem ela o rate limit é no-op, e o cadastro pela API passa a depender dela (a rota usa o Admin SDK, fora do limite do Firebase por IP) | `PRE-PRODUCTION.md` §8 (`:761-779`, era `:759-777` até a PR #59 e `:679-697` até a PR #57) | **aberto**, entrou com a PR #29. Critério 19 do `/test` da fatia 1 🔒. Desde a PR #36, a chave precisa ter o prefixo `ajkey_`: sem ele, a API trata a chave como ausente e registra um erro no boot, e o build de `app` e `web` falha (`PRE-PRODUCTION.md:776-778`). A chave válida contra a Arcjet real segue 🔒 (`/test` da tarefa `arcjet-key-lazy-validation`). O `/test` da PR #46 deixou 🔒 o `429` do `/auth/sign-in`, pelo mesmo motivo (remedido em 2026-10-16). Desde a PR #49 a lista inclui `POST /contact`, e o §8 diz que, sem a chave, qualquer script enche a caixa de suporte e gasta a cota da Resend (`:769-770`); o `429` real da rota ficou 🔒. Desde a PR #51, sem a chave, nada limita quantos corpos acima do teto alguém manda às rotas públicas; até a PR #53 cada um prendia uma conexão por até cerca de 300 s, e desde ela o `413` fecha a conexão, então sobra o custo de cada invocação. Desde a PR #56 a lista inclui `POST /auth/sign-in/email-link/request`; sem a chave, o pedido de link manda e-mail sem teto, como a recuperação de senha, e o `429` real ficou 🔒. Desde a PR #57 a lista inclui `/organization/invitations`, `/invitations/preview` e `/invitations/accept` (17 caminhos, `apps/api/proxy.ts:60-78`); sem a chave sobram o teto de 20 convites pendentes e o intervalo de 60 s entre reenvios (`PRE-PRODUCTION.md:724-726`) |
| 25 | 🆕 Fechar o cadastro pelo REST do Identity Toolkit com a chave pública, que ainda aceita senha de 6 ou 7 (Identity Platform: password policy em `ENFORCE` ou cadastro pelo cliente desligado) | `PRE-PRODUCTION.md`, "Declaração — o que a política de senha não alcança" | **opcional, declarado**: o upgrade tem custo ou teto (3.000 DAU no Spark). Critério 18 do `/test` da fatia 1 🔒 |
| 26 | 🆕 Marca por fork: `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_LOGO_URL` e `NEXT_PUBLIC_APP_SUPPORT_EMAIL` nos projetos `app`, `web` e `api`, logo numa URL `https` pública, ícones do produto no lugar dos padrões | `PRE-PRODUCTION.md` §13 (`:893-906`, era `:891-904` até a PR #59 e `:811-824` até a PR #57) | **aberto**, entrou com a PR #30. Sem ela, o produto sobe com o nome `next-boilerplate`; não bloqueia nada. Desde a PR #33, sem `NEXT_PUBLIC_APP_SUPPORT_EMAIL` o aviso de troca de e-mail sai sem a linha de suporte, que é o canal para contestar (`PRE-PRODUCTION.md` §3). Desde a PR #49, sem ela o formulário de contato fica indisponível, e a variável precisa estar na `api` (o destino) e na `web` (decide se o formulário aparece) (`:902-905`) |
| 27 | 🆕 Custo e latência da leitura de sessão em cada requisição autenticada | *(só neste arquivo)*; a declaração de sessões do `PRE-PRODUCTION.md` (`:1015`, era `:1012` até a PR #59 e `:924` até a PR #57) fala da recusa, não do custo | **aberto**, entrou com a PR #39. Toda requisição autenticada lê o documento da sessão antes do guard (`session-tracker.ts:106-134`), além da leitura do perfil. No emulador, `GET /auth/session` p50 9,3 ms; em produção, latência e consumo da cota de leituras do Firestore não foram medidos (🔒 no `/test`) |
| 28 | 🆕 Política de TTL em `notification.expiresAt` (90 dias), e os dois índices compostos de `notification` | `PRE-PRODUCTION.md` §1.9 (`:253-298`) | **aberto**, entrou com a PR #52. Os índices foram medidos em 2026-10-20 e duas vezes em 2026-10-21 e não estão publicados no projeto de referência (somam às linhas 1 a 4). A TTL exige faturamento ativo no projeto; sem ela nada quebra, as notificações ficam até a exclusão da conta e o prazo de 90 dias do `ROPA.md` §10 deixa de valer. A auditoria não tem leitura da TTL pelas ferramentas que usa; conferir com `gcloud firestore fields ttls list`. Os critérios 18 e 19 do `/test` ficaram 🔒 |
| 29 | 🆕 Login por link num projeto real: provedor "E-mail/senha" com "Link de e-mail" ativo no console, domínio da app autorizado e `EMAIL_LINK_SIGN_IN_ENABLED="true"` na `apps/api`, só para o fork que liga o recurso | `PRE-PRODUCTION.md` §15 (`:675-707`) | **aberto**, entrou com a PR #56. Desligado por padrão, então não bloqueia quem não liga. O documento marca ⛔ "nunca foi provado de ponta a ponta fora do emulador": com o provedor desligado ou o domínio fora da lista, o pedido responde `200` e nenhum e-mail sai. Os critérios de falha do provedor e de `429` do `/test` ficaram 🔒. Depende das pendências 13 e 24 |
| 30 | 🆕 Membros e convites num projeto real: `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED="true"` na `api` e na `app`, a TTL opcional em `organizationInvitation.expiresAt`, e os três índices de `entity` por organização publicados antes do deploy da API | `PRE-PRODUCTION.md` §16 (`:709-753`, era `:709-751` até a PR #59) e §1.10 (`:299-331`) | **aberto**, entrou com a PR #57; remedido em 2026-10-28, pós-PR #59, que acrescentou ao §16 o passo da transferência ("Tornar dono") no roteiro de validação, sem passo novo de infra. Desligado por padrão, então membros e convites não bloqueiam quem não liga; os índices de `entity` valem para todo fork (pendências 1 e 4). O documento marca que o ciclo com e-mail real nunca rodou. Desligar a variável com membros não desfaz a equipe (`:744-746`). Os critérios de rate limit, entrega, índices e TTL do `/test` ficaram 🔒. Depende das pendências 13 e 24 |

A 21 foi fechada pelo usuário em 2026-09-25. A 18 fechou pela metade em 2026-09-29, e a 12 em 2026-09-30. Com a PR #56
entrou a 29, e com a PR #57, a 30; a PR #57 também somou casos às 1 a 4, 8, 13 e 24. O histórico de quem criou ou mudou cada linha está na versão
deste arquivo em `9c793c6`.

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
> existe: campo de tipo no formulário de edição de usuário, `users/[id]/route.ts:138-139`, que desde a PR #37 trava o tipo do próprio perfil); task de teste do
> design system → [`accessibility-conformance`](../docs/features/accessibility-conformance/spec.md), entregue em 2026-09-29.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| **Bloqueio em `past_due` · trial, cupom, reembolso e faturas em UI própria · nome do plano traduzido** | — | Fora do corte de [`billing-subscription`](../docs/features/billing-subscription/spec.md) e de [`plan-entitlements`](../docs/features/plan-entitlements/spec.md). O Customer Portal cobre trial, cupom, reembolso e faturas; o bloqueio por situação é decisão de produto de cada fork. |
| 🆕 2026-10-16 **App instalável (manifest de PWA) · push no navegador** | 0 de 4 páginas de features lidas mencionam | O Next.js gera o manifest nativamente e HTTPS basta para instalar (doc do Next, atualizada em 2026-07-30); os ícones já vêm de `brand-config`. Sem sinal de mercado, é decisão de fork e cabe numa tarefa P quando alguém pedir. Push exige chaves VAPID e coleção de inscrições, custo que todo fork herdaria. |
| 🆕 2026-10-16 **Aviso global do admin para todos os usuários · modo manutenção** | 0 de 4 páginas lidas mencionam | Sem prevalência. Com [`in-app-notifications`](../docs/features/in-app-notifications/spec.md) entregue pela PR #52, o aviso para todos vira extensão dela (está no "Fora do corte" de lá): um tipo novo e um produtor que grava para cada perfil, ou uma coleção de avisos sem dono, que a central de hoje não lê. |
| 🆕 2026-10-16 **Convite de usuário pelo admin, no lugar da senha definida pelo admin** | não medido nos starters | O plugin de admin do Better-Auth cria usuário com senha, como este repositório (`users/route.ts:63`); o Clerk tem convite de aplicação por e-mail. Convite com link e expiração é o mesmo mecanismo dos convites de [`teams-organizations`](../docs/features/teams-organizations/spec.md), entregue pela PR #57: o convite pelo admin, se vier, deve reaproveitar aquele (hash do token, validade, uso único) em vez de criar um segundo modelo. **Reavaliada em 2026-10-27, pós-PR #58,** como candidata à entrega maior pedida pelo usuário, e preterida por [`organization-ownership-transfer`](../docs/features/organization-ownership-transfer/spec.md), entregue pela PR #59: segue sem prevalência medida, e o admin já cria usuário com senha. |
| 🆕 2026-10-16 **Lixeira e restauração de registros** | não medido (starters não trazem CRUD de domínio) | O soft delete existe (`base.repository.ts:229-231`) e `findById` ignora registro apagado. Restaurar é decisão de produto de cada fork sobre o próprio recurso. |
| 🆕 2026-10-16 **Seleção múltipla e ações em massa nas listagens · exportar a listagem do usuário** | não medido | O `Table` repassa as props do Antd, então `rowSelection` já passa (`table.tsx:11-12`, `:157`), e o repositório base tem `deleteBulk` sem rota (`base.repository.ts:267`). Vira tarefa do fork quando a listagem dele pedir; a exportação do admin já está descartada acima. |
| 🆕 2026-10-16 **Aviso de pagamento pendente fora da aba de cobrança** | — | A aba já mostra o aviso (`AccountBillingPanel.tsx:146-150`). **Entregue pela PR #52** como produtor de [`in-app-notifications`](../docs/features/in-app-notifications/spec.md): o tipo `subscriptionPaymentPending` aparece no sino e leva à aba (`apps/app/shared/lib/notifications.ts:22-25`). A linha fica como registro; não há banner próprio. |
| 🆕 2026-10-16 **Exemplo de IA (chat, integração com LLM)** | 2 de 4 páginas lidas (Supastarter, Open SaaS) | Arrasta chave e custo por uso de um provedor pago para todo fork, e o caso de uso é do produto. Moda com vida útil incerta; fica com o fork. |
| 🆕 2026-10-22 **Link por e-mail para conta só Google ou com e-mail não confirmado** | — | Fora da entrega de [`magic-link-sign-in`](../docs/features/magic-link-sign-in/spec.md) (D1 e Q1 do plano): concluir o link tira a senha da conta não confirmada e acrescenta um provedor sem senha à conta só Google, e a área de conta passaria a pedir uma senha que não existe. Servir esse público pede um marcador no perfil e mudança em seis arquivos da área de conta, esforço M. Reabrir quando um fork medir que o público não confirmado pesa. |
| 🆕 2026-10-16 **Passkeys · código de acesso por e-mail (OTP)** | 2/10 (Makerkit com os dois desligados por padrão; Supastarter com passkeys) | Passkeys já estão fora do corte de [`account-security-mfa`](account-security-mfa.md). Suporte nativo no Firebase a nenhum dos dois foi confirmado nesta rodada; o login sem senha ficou com [`magic-link-sign-in`](../docs/features/magic-link-sign-in/spec.md), entregue pela PR #56. |
| 🆕 2026-10-16 **Preferências de fuso horário e de e-mail · descadastro (unsubscribe)** | não medido | O fuso já é detectado no navegador e vai em cookie (`DisplayTimeZoneProvider.tsx:37-51`). O core só manda e-mail transacional, que não pede descadastro; o fork que mandar e-mail de marketing traz o mecanismo junto. |
| 🆕 **Jobs agendados (Vercel Cron) para expurgo e retenção** | — | Avaliado em 2026-09-26. Não há job concreto que o core precise rodar: o expurgo da trilha depende do prazo de retenção (E5) e o TTL de `paymentEvent` já é nativo do Firestore. Infra sem consumidor vira código morto. Reabrir quando E5 for decidida. |
| 🆕 **Exportar tabelas do admin em CSV** | não medido | Avaliado em 2026-09-26. Nenhuma tabela exporta hoje e nenhuma referência do painel foi verificada. Sem prevalência, é decisão de fork. |
| 🆕 **Aceite de termos e privacidade registrado no cadastro** | não medido | Avaliado em 2026-09-26. O aviso de privacidade é dever de informação (LGPD art. 9º), não consentimento; aceite de termos é decisão contratual de cada fork. Um link para os dois documentos junto ao botão de cadastro é achado P, não spec. |
| 🆕 **Avisos de segurança por e-mail (senha trocada, sessões encerradas, login novo)** | — | Avaliado em 2026-09-26. É o requisito 6.3.7 da ASVS 5.0.0, **nível 3** (6.3.5, login suspeito, também é nível 3). O aviso ao endereço antigo entrou em [`account-email-change`](../docs/features/account-email-change/spec.md), entregue pela PR #33, por ser barato; o resto espera pedido. |
| 🆕 **OpenAPI / documentação da API gerada** | — | Avaliado em 2026-09-26. O SDK é o contrato e a única porta para a API (regra de ouro 1); um segundo contrato gerado envelhece junto. Vale só se o produto for uma API, como as API keys. |
| 🆕 **Banir usuário pelo admin** | 4/10 (admin) | Já existe como desativar: `disabled` no `PUT /users/[id]` (`user-admin.schema.ts:21`, `users/[id]/route.ts:147-156`) e o switch da listagem (`UsersListClient.tsx:111-139`). Desde a PR #35, desativar também corta o bearer e revoga as sessões na hora; desde a PR #37, o admin não desativa a si mesmo. |
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
| **Detector de teste instável no CI** | — | O primeiro caso foi consertado na PR #22. Em 2026-09-28 apareceu um segundo, de causa diferente, só local (`useListAuditEvents.test.tsx`, 2 falhas em 59 execuções locais até 2026-10-28, pós-PR #59; ver achados), e o CI passou. Em 2026-10-19 apareceu um terceiro, também só local e sob carga (`actionMenu.test.tsx:419`, 1 falha em 14 execuções até a auditoria pós-PR #59; ver achados da tarefa `admin-archive-access-revocation`). O critério de reabertura era um segundo *flake* **no CI**; este ainda não conta. Consertar o teste é tarefa direta P. |
| Provedor de e-mail plugável · rastreio de abertura/clique | — | Fora do corte de `transactional-emails`. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Fora do corte de `file-upload-storage`. |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | Fora do corte de `observability-logging`. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto é uma API. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional. |
| SSO enterprise · SCIM | 0/10 | Só entra com o primeiro contrato enterprise. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | O pré-requisito (CI verde e estável) vale nas 30 últimas execuções do CI na `main`, até `277da43` (`gh run list --branch main --limit 30`, todas `success`, remedido em 2026-10-28 pós-PR #59). Reavaliar junto com o branch protection (E3). |
| Remote Cache do Turbo | prática 1 | Arrasta conta e env; entra quando doer, como opt-in. |
| Limiar de cobertura que bloqueia merge | prática 5 | A cobertura já é medida e consolidada (`pnpm coverage`, job `coverage` do CI), pela PR #26. O limiar ficou fora do corte de [`e2e-testing`](../docs/features/e2e-testing/spec.md); reavaliar depois de algumas medições. |
| Changesets / versionamento · Storybook | — | Pacotes `private: true`; o `playground` serve de catálogo. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork. |
