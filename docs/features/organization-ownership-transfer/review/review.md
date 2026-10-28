# Revisão: transferir a propriedade da organização

Rodada autônoma do `/cycle`, 2026-10-28. Escopo: o diff da feature (sdk, api, app, i18n, e2e, docs) mais os arquivos
novos não rastreados. A auditoria do backlog em `specs/` entra no plano de commits como assunto separado e não foi
revisada como código. Nenhum commit, nenhum push, nenhuma branch criada ou renomeada nesta rodada.

## Branch

| Item | Valor |
|------|-------|
| Atual | `guilhermebittelbrunn/cycle-value-task`, sem upstream |
| Regex do Passo 3 do `/review` na atual | **inválida** (prefixo `guilhermebittelbrunn/` não é projeto; falta `<type>`) |
| Proposta | `feat/organization-ownership-transfer` |
| Regex na proposta | **passou** |
| Base | a branch atual, que está em `c0c06f2` (topo de `main`) com o trabalho no working tree |
| Ação | só proposta. A ordem desta rodada foi não criar nem renomear: o Conductor pede que a branch atual não seja renomeada sem pedido do usuário. Quem aprova os commits cria a branch com `git switch -c feat/organization-ownership-transfer` antes do primeiro `git add` |

O nome omite o `<project>` porque a feature cruza dois apps (`api`, `app`) além de `sdk`, `internationalization` e
`e2e`. É a forma que `.claude/rules/git-commits.md` prevê para vários apps e a que a E11 do `BACKLOG.md` recomenda.

## Achados

Na primeira passada não achei nada bloqueante. O `/test` (rodada 1) achou um, que esta revisão deixou passar e que
foi corrigido na segunda passada, logo abaixo.

### 🔴 Bloqueante

- `packages/design-system/components/ui/action-menu.tsx` com
  `apps/app/.../organization/(components)/TransferOwnershipDialog.tsx:51,64`: **"Tornar dono" não funcionava pelo
  teclado.** Achado pelo `/test`, não por esta revisão: no item 6 da lista "Verificar no `/test`" eu tinha pedido para medir o foco, mas não
  vi o defeito lendo o código. O rc-menu executa o item no `keydown` do Enter (`rc-menu/es/MenuItem.js:139`, só
  `KeyCode.ENTER`). O `onClick` do item abre o `AlertDialog`, o Radix põe o foco em "Cancelar" ainda dentro desse
  `keydown`, e o navegador entrega o `keypress` e o clique de ativação do mesmo Enter ao botão que agora tem o foco.
  O diálogo abre e fecha no mesmo toque, sem pedido à API. **Corrigido na raiz**, no `ActionsMenu` (ver "Correções
  aplicadas"). Medição antes da correção, em teste de componente com o `ActionsMenu` e o diálogo reais: logo depois do
  `keydown`, `document.activeElement` era o botão "Cancelar" e o `alertdialog` estava montado; depois do clique de
  ativação, o diálogo tinha sumido.

### 🟡 Atenção

- `packages/internationalization/translations/apps/app/pages/invitation/index.ts:20,49,78`: `previousOrganizationNotice`
  prometia que "os registros que você tinha ficam guardados e voltam se você sair da equipe". Para quem transferiu a
  própria equipe isso deixou de ser verdade: ele não tem organização de casa e, ao sair, ganha uma nova e vazia
  (`joinHomeOrganization` sem `findOwnedBy`). O defeito nasceu com esta feature. **Corrigido aqui**, decisão abaixo.

### 🟢 Sugestão / nit

- `rc-menu/es/MenuItem.js:139` (dependência do antd, usada por todo `ActionsMenu` do repo): o item de menu só aciona
  com Enter. Espaço não faz nada, embora o padrão ARIA de menu peça os dois. Confirmado lendo o código do rc-menu. Vale
  para todos os menus de ação (entidades, usuários do admin, convites, membros), não só para esta feature. Fica fora
  de escopo e vai para o backlog como achado do `ActionsMenu`.

- `apps/app/.../organization/(hooks)/useOrganizationActions.tsx:73-96`: no erro da transferência nada é invalidado.
  Se outra aba já transferiu, o toast de `ORGANIZATION_FORBIDDEN` aparece e a tabela continua mostrando as ações de
  dono até recarregar. A API recusa certo; é só tela defasada. Não corrigido: não é regressão (a remoção de membro faz
  o mesmo) e entra na lista do `/test`.
- `apps/api/(shared)/repositories/organization.repository.ts:24-37` com `organization-membership.ts:47-64` (`joinHomeOrganization`):
  quem é dono de duas organizações, aceita convite de uma terceira e depois sai volta para a **mais antiga**. A outra
  (a recebida por transferência) fica dormente, com os registros fora do alcance da tela até a exclusão da conta,
  que a apaga. É a decisão 6 do plano, tomada de propósito; registro como risco para o backlog, não como defeito.
- `apps/api/app/(routes)/organization/members/[id]/route.ts:33-62`: a autoridade do ator (dono) vem do guard, lida
  antes da transação de `remove`. Um dono que acabou de transferir pode, numa janela de milissegundos, ainda remover
  um membro. O `remove` recusa remover o dono novo, então a invariante "um dono" se mantém. A janela já existia antes
  desta feature; agora tem um caminho a mais para acontecer.
- `useOrganizationActions.tsx:89` usa `replace("{name}")` e `TransferOwnershipDialog.tsx:57` usa `replaceAll`. O
  `done` tem um só `{name}`, então não muda nada hoje.

### ✅ OK

- **Transação** (`organization-member.repository.ts:168-226`): as quatro leituras (`organization`, vínculo do ator,
  vínculo do alvo, perfil do alvo) saem num `tx.getAll` antes das três escritas. Dentro dela são reconferidos: a
  organização viva, `ownerUserId` igual ao ator, o vínculo do ator vivo nesta organização com papel `owner`, o vínculo
  do alvo vivo nesta organização e o perfil do alvo vivo. Recusa na ordem autoridade → alvo, então quem deixou de ser
  dono não descobre nada sobre o alvo.
- **Corridas, lidas no código**: duas transferências do mesmo dono leem o mesmo documento de organização e o mesmo
  vínculo do ator, e a segunda vira `forbidden`. Transferência contra `remove(alvo)`: os dois leem o vínculo do alvo;
  se o `remove` vence, a transferência vê `not-member`; se a transferência vence, o `remove` vê `role: owner` e
  devolve `"owner"` (`organization-member.repository.ts:142-160`). Transferência contra o aceite de convite do alvo em
  outra equipe: os dois leem o vínculo do alvo; se o aceite vence, `not-member`; se a transferência vence,
  `refuseCurrentMembership` vê o alvo como dono com o antigo dono vivo e devolve `owner-has-members`. Transferência
  contra `leave` do ator: o guard já barra dono em `leave`, e o `remove` dentro da transação barra quem virou dono no
  meio. Nenhum desses caminhos deixa organização sem dono ou com dois donos. O emulador cobre as três primeiras
  (`organizationOwnershipTransfer.emulator.test.ts:181,202,225`).
- **Arquivamento do alvo pelo admin** fica fora da transação (`DELETE /users/:id` confere `ownsOrganizationWithMembers`
  antes de gravar). É o risco aceito na §18 do plano e está descrito em `docs/SECURITY.md`. Como a transação lê o
  perfil do alvo, o arquivamento gravado antes dela é visto e recusado com `target-archived`.
- **Posse em lista**: `listOwnedBy` filtra soft delete em memória e ordena por `createTime`; `findOwnedBy` devolve a
  primeira. `ownsOrganizationWithMembers` (`organization-membership.ts:108-132`) junta os membros de todas as
  organizações possuídas, tira o próprio titular e só conta perfil vivo.
- **Expurgo** (`account-erasure.ts:70-172`): apaga registros, fotos, vínculos, convites e documento de **cada**
  organização possuída. O vínculo atual só sai pelo `remove` quando aponta para uma organização que não é do titular.
  O antigo dono (dono de nenhuma) perde só o vínculo, e os registros da equipe que ele passou adiante ficam com ela.
  Como a rota de exclusão recusa dono com membro vivo em qualquer organização possuída, nada apagado pertence a outra
  pessoa viva. Os membros arquivados de uma organização possuída saem com ela, como já era antes.
- **Guard e autorização**: a rota nova é `whenOrganizationMembersEnabled(requireOrganizationApi<RouteIdParamsContext>(…,
  { role: "owner" }))`. Membro recebe 403, admin personificando recebe recusa de escrita, sem sessão 401
  (`organizationOwnershipRoute.test.ts:244-278`). A UI esconde o item, mas a API não confia nisso.
- **Flag vazia**: `isOrganizationMembersEnabled` só liga com `"true"`; `apps/api/env.ts:62-63` converte `""` em
  `undefined`. Sem a flag, a rota responde `404 ORGANIZATION_MEMBERS_DISABLED` antes do guard
  (`organizationOwnershipRoute.test.ts:279`, com `""`, `"false"` e `undefined`).
- **Id inutilizável** (`a/b`, `__reserved__`, `..`) responde 404 antes de montar o caminho no Firestore.
- **Contrato**: resposta `{ data: { ownerUserId } }` 200; erros por código; `ORGANIZATION_OWNERSHIP_TARGET_SELF` e
  `ORGANIZATION_OWNERSHIP_TARGET_ARCHIVED` estão em `apiErrors` nos três idiomas.
- **SDK**: `transferOwnership` codifica o id, devolve `data.data` e deixa o erro propagar cru.
- **App**: chamada só via `apiClient`; erro com `handleClientError(new FormattedError(error, locale))`; ações somem
  durante a mutação (sem duplo envio); depois do sucesso o detalhe da organização é refeito antes, e as queries de
  convites são removidas antes de alguém pedi-las como membro.
- **i18n**: nenhuma string solta no JSX novo; `aria-hidden` no ícone; chaves novas nos três idiomas.
- **Comentários**: nenhum cita artefato do fluxo, etapa ou ID. O único "spec" que aparece
  (`organizationOwnership.spec.ts:20`) é o arquivo Playwright.
- **Testes não afrouxados**: comparei as linhas removidas dos 11 arquivos de teste alterados. As trocas são
  `findOwnedBy` → `listOwnedBy` nos mocks, `true`/`false` → `"removed"`/`"not-member"` no retorno de `remove`, e
  `recordAuditEvent: vi.fn()` → mock observável. A única asserção removida
  (`organizationMembersRoute.test.ts:246-251`) voltou mais forte, com `archived: true`. O emulador de convites passou a
  semear o perfil vivo antes, sem mudar asserção.
- **Spec × entrega**: o corte de MVP de `specs/organization-ownership-transfer.md` foi entregue. Os três desvios
  (convite gravado no emulador no E2E, dono de duas organizações, rótulo do convite sem e-mail) estão na §1.1 do
  plano e são correção da spec, não deriva.

## Correções aplicadas

| Arquivo | O que mudou |
|---------|-------------|
| `packages/internationalization/translations/apps/app/pages/invitation/index.ts:20,49,78` | `previousOrganizationNotice` reescrito em pt-br, en e es |
| `packages/design-system/components/ui/action-menu.tsx:142-149` | `onClick` no nível do menu chama `preventDefault()` quando o item foi acionado por `keydown`; o navegador deixa de entregar o `keypress` e o clique de ativação ao elemento que o item focou |
| `packages/design-system/__tests__/actionMenu.test.tsx` | caso novo: o `keydown` de Enter que executa um item volta cancelado e o item roda uma vez |
| `apps/app/__tests__/organizationTransferKeyboard.test.tsx` (novo) | reproduz a sequência do navegador com o `ActionsMenu` real e o `TransferOwnershipDialog` real |

### Correção do teclado

Onde corrigir: o defeito é do `ActionsMenu`, não do diálogo. Qualquer item que abra algo focável (diálogo, popover,
campo) recebe o mesmo Enter. O `ActionsMenu` já contornava isso para a própria confirmação de exclusão
(`afterOpenChange` foca "Cancelar" só depois da animação), mas os itens de `items` ficavam sem proteção. Cancelar o
`keydown` que executou o item protege todos os itens de uma vez, e nenhum consumidor precisa replicar contorno.

Descartadas:

- `onOpenAutoFocus` com `preventDefault` no `TransferOwnershipDialog` (como `AccountEmailChangeDialog.tsx:101`):
  conserta só este diálogo e deixa a armadilha para o próximo item de menu que abrir alguma coisa.
- Adiar a abertura com `setTimeout`: replica no consumidor um contorno que pertence ao componente compartilhado, e
  depende da ordem de tarefas do navegador.

Prova:

| Teste | Sem a correção | Com a correção |
|-------|----------------|----------------|
| `apps/app/__tests__/organizationTransferKeyboard.test.tsx` (2 casos: diálogo fica aberto com foco em "Cancelar"; Enter no item e Enter em "Transferir" chamam a mutação uma vez) | 2 falham (`Unable to find role="alertdialog"`) | 2 passam |
| `packages/design-system/__tests__/actionMenu.test.tsx`, caso "cancels the Enter keydown that runs an item…" | falha | passa (20 de 20 no arquivo) |

Medi o "sem a correção" voltando `action-menu.tsx` ao `HEAD` e rodando de novo; depois restaurei a correção.

O repo não tem `@testing-library/user-event`, e a política do ciclo não deixa adicionar dependência. Por isso o teste
simula o Enter do navegador com `fireEvent`: `keydown` no item; se ninguém o cancelou, `keypress` e o clique de
ativação no elemento que tem o foco depois dos handlers (só botão e link têm essa ativação); por fim `keyup`. É a
ordem que o navegador segue, e o helper está comentado no próprio teste. O teste não prova o comportamento num
navegador real: isso volta ao `/test` (item 6 abaixo).

Antes (pt-br): "Ao aceitar, você passa a ver os registros desta equipe. Os registros que você tinha ficam guardados e
voltam se você sair da equipe."

Depois (pt-br): "Ao aceitar, você passa a ver os registros desta equipe, e os registros da equipe em que você está
hoje ficam com ela. Se sair desta equipe, você volta para a sua conta, com os registros que ela tinha. Se você já
passou a propriedade da sua equipe a outra pessoa, volta para uma conta nova, vazia."

O `en` e o `es` dizem o mesmo. O teste `apps/app/__tests__/invitationAcceptance.test.tsx:203` lê a chave do
dicionário, então continua valendo (8 de 8 passando depois da troca).

### Decisão da copy

- **Adotada**: reescrever a frase nos três idiomas para ser verdadeira nos dois casos (quem tem casa e quem transferiu
  a própria equipe). Raio: uma chave, um arquivo, nenhum código.
- **Descartada**: condicionar o aviso a "tem casa dormente". A prévia (`GET /invitations/preview`) é pública, por
  token, e não sabe quem está logado; o aceite logado não tem endpoint que responda isso. Condicionar exigiria campo
  novo no contrato do SDK, consulta nova na API e ramo novo na tela, para um aviso de uma linha.

## Raio de impacto

| Contrato | Consumidores |
|----------|--------------|
| `OrganizationMemberDTO.archived` (obrigatório) | produtor `describeOrganizationMembers`; consumidor `OrganizationMembersTable.tsx`; fixtures de `organizationTeamPage.test.tsx` |
| `organization.transferOwnership(userId)` | `transferOwnershipMutation` |
| 5 valores de `AuditAction`, `AuditTargetType.ORGANIZATION` | `actionLabels` da trilha do admin (3 idiomas), `audit-event.mapper.ts` (cast, sem lista fechada), exportação da conta |
| `organizationMemberRepository.remove` → `RemoveMembershipOutcome` | `leave/route.ts`, `members/[id]/route.ts`, `account-erasure.ts`, `organizationScope.emulator.test.ts` |
| `organizationRepository.listOwnedBy` (novo) e `findOwnedBy` (agora a primeira da lista) | `ownsOrganizationWithMembers`, `account-erasure.ts`, `joinHomeOrganization` |
| copy de 4 `apiErrors` reescritos e de `previousOrganizationNotice` | telas de equipe, exclusão de conta, arquivamento pelo admin, convite |

Nenhum consumidor em `apps/web`.

## Verificar no `/test`

Nada abaixo foi medido nesta revisão. As que sustentam o corte vêm primeiro.

1. **Transferência pela tela, ponta a ponta, nos três idiomas.** Repro: dono com um membro vivo, menu da linha →
   "Tornar dono" → diálogo com o nome → "Transferir". Esperado: toast `transfer.done` com o nome, selos trocados,
   formulário de convite some, "Sair da equipe" aparece. O E2E mediu isso só em pt-br, desktop claro.
2. **Antigo dono sai e cai numa organização vazia.** Repro: depois do item 1, o antigo dono clica "Sair da equipe".
   Esperado: ele vira dono sozinho de uma equipe sem registros; a equipe antiga continua com os registros e com o dono
   novo.
3. **Copy nova do convite** (`previousOrganizationNotice`) nos três idiomas, em 375 px, sem quebra feia. Repro:
   antigo dono do item 2 abre um convite de outra equipe logado.
4. **Exclusão de conta do antigo dono e do dono novo.** Repro: antigo dono (membro) exclui a conta → só o vínculo
   sai, a equipe fica intacta. Dono novo com membro vivo tenta excluir → `409 ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS`
   com a copy nova. Coberto por unit e emulador, não pela tela.
5. **Tema e responsivo.** Item "Tornar dono" (Dropdown antd, ícone de coroa) e `AlertDialog` em light, dark e 375 px.
6. **Teclado, depois da correção do `ActionsMenu`.** Repro: em `/pt-br/organization`, como dono, Tab até "Mais ações"
   da linha do membro → Enter (menu abre, foco em "Tornar dono") → Enter. Esperado: o diálogo **fica aberto** com o
   foco em "Cancelar" e nenhum pedido à API. Depois: Tab até "Transferir" → Enter transfere uma vez; numa segunda
   tentativa, Esc fecha e o foco vai para o `h2` "Membros". Repetir o Enter nos outros menus de ação (editar e excluir
   em entidades, reenviar convite) para confirmar que nada regrediu: editar navega, reenviar dispara uma vez, excluir
   abre a confirmação com foco em "Cancelar".
7. **Duas abas transferindo para pessoas diferentes.** Repro: duas abas do dono, transferir para B numa e para C na
   outra. Esperado: a segunda mostra o toast de `ORGANIZATION_FORBIDDEN`. Anotar se a tabela segue mostrando ações de
   dono até recarregar (nit 🟢 acima).
8. **Alvo arquivado com a tabela aberta.** Repro: arquivar o membro pelo admin, sem recarregar a tela da equipe,
   transferir. Esperado: toast de `ORGANIZATION_OWNERSHIP_TARGET_ARCHIVED`; depois de recarregar a linha não tem
   "Tornar dono".
9. **Trilha do admin.** Filtrar pelo antigo dono (transferência, saída) e pelo dono novo (transferência, aceite,
   remoção). Conferir os cinco rótulos nos três idiomas e que o convite enviado não mostra o e-mail do convidado.
10. **Convite de organização com dono arquivado**, deslogado e logado. Esperado: tela "Este convite não vale mais"
    (`400 ORGANIZATION_INVITATION_INVALID`).
11. **Fork B2C.** Com `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED=""` nas duas apps: a tela da equipe não oferece
    "Tornar dono" e `POST /organization/members/<id>/ownership` responde `404 ORGANIZATION_MEMBERS_DISABLED`.
12. **Arquivamento pelo admin do dono novo com membros vivos.** Esperado: `409 USERS_DELETE_ORGANIZATION_HAS_MEMBERS`
    com a copy nova.

## Lacunas de teste

| Lacuna (do handoff) | Veredito |
|---------------------|----------|
| E2E não emite convite pela tela nem entrega e-mail | continua aberta; a emissão fica com `organizationInvitationsRoute.test.ts` |
| E2E só em pt-br, desktop, claro | continua aberta; itens 1, 3 e 5 da lista acima |
| Sem teste da retrocarga pendente do antigo dono | continua aberta (risco aceito no plano) |
| Corrida entre arquivamento pelo admin e transferência fora de transação | fora de escopo (risco aceito, §18 do plano) |

Lacuna nova: nenhum teste cobre a tela depois de `ORGANIZATION_FORBIDDEN` na transferência (nit 🟢). Fica para o
`/test` medir e decidir se vale teste.

## Decisões em aberto

Nenhuma desta revisão. A copy do convite foi decidida e implementada (acima). A criação da branch proposta depende da
aprovação dos commits.

## Gates (medidos nesta rodada, sem `--force`)

| Comando | Resultado |
|---------|-----------|
| `pnpm check` | 1054 arquivos, nenhuma correção |
| `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes passando |
| `pnpm --filter @repo/sdk typecheck` | sem erro |
| `pnpm --filter api typecheck` | sem erro |
| `pnpm --filter app typecheck` | sem erro |
| `pnpm --filter e2e typecheck` | sem erro |
| `pnpm --filter @repo/internationalization typecheck` | sem erro |
| `pnpm --filter app exec vitest run __tests__/invitationAcceptance.test.tsx` | 8 de 8, depois da troca da copy |

Segunda passada, depois da correção do teclado:

| Comando | Resultado |
|---------|-----------|
| `pnpm check` | 1055 arquivos, nenhuma correção |
| `pnpm --filter app typecheck` | sem erro |
| `pnpm --filter @repo/design-system typecheck` | sem erro |
| `pnpm --filter @repo/design-system test` | 14 arquivos, 172 testes passando |
| `pnpm --filter app exec vitest run` nos 7 arquivos que usam o `ActionsMenu` ou a tela da equipe (`organizationTransferKeyboard`, `organizationTeamPage`, `useOrganization`, `invitationAcceptance`, `entitiesListReadOnly`, `usersListArchiveLabels`, `usersListLastAccess`) | 7 arquivos, 59 testes passando |

Os números de teste das suítes inteiras (`api` 1679, `app` 1106, `test:emulator` 274, `pnpm e2e` 23) são do handoff;
não remedi na primeira passada, quando a minha única mudança era uma string de dicionário. A correção do teclado toca o
`ActionsMenu`, usado em cinco telas; rodei a suíte do `design-system` inteira e os arquivos da `app` que o exercitam,
não a suíte da `app` inteira, que fica com o `/test`.

## Plano de commits

Antes do primeiro: `git switch -c feat/organization-ownership-transfer` e `git diff --cached --stat` vazio.

**Typecheck entre commits.** O commit 1 deixa `OrganizationMemberDTO.archived` obrigatório e cinco `AuditAction`
novos; a `api` só volta a compilar no commit 3, e a `app` no commit 10 (rótulos da trilha). Mantido assim: juntar SDK
e API num commit quebraria a regra de um commit por pacote, e o CI roda no topo da PR. O commit 3 deixa
`account-erasure.ts` usando o retorno de `remove` como booleano até o commit 4 (compila, porque a string é truthy, mas
`"owner"` contaria como removido); ninguém faz deploy de commit intermediário.

| # | Mensagem | Arquivos |
|---|----------|----------|
| 1 | `feat(sdk): organization ownership transfer contract and team audit actions` | `packages/sdk/src/types/organization/members.ts`, `packages/sdk/src/types/audit/audit.ts`, `packages/sdk/src/actions/organization/action.ts`, `packages/sdk/__tests__/organizationAction.test.ts` |
| 2 | `feat(api): read every organization a profile owns in the owner exit rule` | `apps/api/(shared)/repositories/organization.repository.ts`, `apps/api/(shared)/lib/organization-membership.ts`, `apps/api/app/(routes)/account/deletion/route.ts`, `apps/api/__tests__/organizationMembership.test.ts`, `apps/api/__tests__/organizationOwnerExitArchivedMember.test.ts`, `apps/api/__tests__/accountDeletionRoute.test.ts` |
| 3 | `feat(api): transfer organization ownership and refuse removing the owner` | `apps/api/(shared)/repositories/organization-member.repository.ts`, `apps/api/app/(routes)/organization/members/[id]/ownership/route.ts`, `apps/api/(shared)/lib/organization-member-profiles.ts`, `apps/api/app/(routes)/organization/members/[id]/route.ts`, `apps/api/app/(routes)/organization/leave/route.ts`, `apps/api/__tests__/organizationOwnershipRoute.test.ts`, `apps/api/__tests__/organizationOwnershipTransfer.emulator.test.ts`, `apps/api/__tests__/organizationMembersRoute.test.ts`, `apps/api/__tests__/organizationScope.emulator.test.ts` |
| 4 | `feat(api): erase every organization the account owns` | `apps/api/(shared)/lib/account-erasure.ts`, `apps/api/__tests__/accountErasure.test.ts`, `apps/api/__tests__/accountErasureStorage.emulator.test.ts` |
| 5 | `feat(api): refuse invitations into an organization whose owner was archived` | `apps/api/(shared)/lib/organization-invitation.ts`, `apps/api/(shared)/repositories/organization-invitation.repository.ts`, `apps/api/__tests__/organizationInvitation.emulator.test.ts` |
| 6 | `feat(api): record team invitation events in the audit trail` | `apps/api/app/(routes)/organization/invitations/route.ts`, `apps/api/app/(routes)/invitations/accept/route.ts`, `apps/api/__tests__/organizationInvitationsRoute.test.ts`, `apps/api/__tests__/invitationsRoutes.test.ts` |
| 7 | `fix(design-system): cancel the Enter keydown that runs an action menu item` | `packages/design-system/components/ui/action-menu.tsx`, `packages/design-system/__tests__/actionMenu.test.tsx` |
| 8 | `feat(app): ownership transfer mutation for the team page` | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/organization/(hooks)/useOrganizationActions.tsx`, `apps/app/__tests__/useOrganization.test.tsx` |
| 9 | `feat(app): make owner action and confirmation dialog in the members table` | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/organization/(components)/OrganizationMembersTable.tsx`, `apps/app/app/[locale]/(authenticated)/(common)/(pages)/organization/(components)/TransferOwnershipDialog.tsx`, `apps/app/__tests__/organizationTeamPage.test.tsx`, `apps/app/__tests__/organizationTransferKeyboard.test.tsx` |
| 10 | `feat(internationalization): ownership transfer copy, team audit labels and error codes` | `packages/internationalization/translations/apps/app/pages/common/organization.ts`, `packages/internationalization/translations/apps/app/pages/admin/auditTrail.ts`, `packages/internationalization/translations/packages/shared/utils.ts` |
| 11 | `fix(internationalization): keep the invitation notice true for a previous owner` | `packages/internationalization/translations/apps/app/pages/invitation/index.ts` |
| 12 | `test(e2e): drive the team ownership transfer with members turned on` | `apps/e2e/support/stackEnv.ts`, `apps/e2e/__tests__/stackEnv.test.ts`, `apps/e2e/support/firestoreEmulator.ts`, `apps/e2e/tests/global.setup.ts`, `apps/e2e/tests/organizationOwnership.spec.ts` |
| 13 | `docs: describe organization ownership transfer` | `docs/ARCHITECTURE.md`, `docs/FORKING.md`, `docs/INCIDENT-RESPONSE.md`, `docs/PRE-PRODUCTION.md`, `docs/ROPA.md`, `docs/SECURITY.md`, `docs/SETUP.md` |
| 14 | `docs(specs): backlog audit and organization ownership transfer spec` | `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/observability-logging.md`, `specs/research/saas-starter-feature-benchmark.md`, `specs/organization-ownership-transfer.md` |
| 15 | `docs(features): organization-ownership-transfer` | `docs/features/organization-ownership-transfer/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`, `review/review.md`, `test/criterios-aceite.md`, `test/report.md`; `test/e2e/` é descartado pelo `.gitignore`) |

Commits misturados, com o motivo: o 3 leva as gravações na trilha de remoção e saída, porque estão nas mesmas linhas
de `members/[id]/route.ts` e `leave/route.ts` que tratam o retorno novo de `remove`; separar exigiria `git add -p`. O
6 leva em `invitationsRoutes.test.ts` também o caso da prévia com dono arquivado (que depende do commit 5).

O commit 7 vem antes dos commits da `app` porque o teste de teclado do commit 9 depende dele. O
`organizationTransferKeyboard.test.tsx` entra no 9, com a tabela e o diálogo que ele cobre.

Varredura do commit 15: só endereços `@example.com` de seed e QA (também em `test/report.md` e
`test/criterios-aceite.md`), e a senha citada pelo nome da constante (`SEED_PASSWORD`), sem o valor. Nada a remover.

Título de PR sugerido: `feat: organization ownership transfer`.

Commits realizados, na branch `guilhermebittelbrunn/cycle-value-task`: `d30ab8a`, `2154432`, `35a6ff7`, `23fd72a`,
`b78d1a7`, `93a44e6`, `76d49db`, `eb8bfb5`, `96d1e71`, `3812662`, `c33e1ea`, `30d8b2f`, `2b0055b`, `ccbd674` e o
commit 15, com os artefatos desta pasta.
