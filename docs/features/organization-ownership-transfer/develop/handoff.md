# Handoff do /develop: transferir a propriedade da organização

Plano: [`analyze/plan.md`](../analyze/plan.md). Rodada autônoma do `/cycle`, 2026-10-28. Nenhum commit, nenhuma
branch. O working tree também tem as mudanças da auditoria em `specs/`, que não são desta tarefa.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| §4 contrato | `packages/sdk/src/types/organization/members.ts` (`archived` no DTO, `TransferOrganizationOwnershipResponse`), `packages/sdk/src/actions/organization/action.ts` (`transferOwnership`), `packages/sdk/src/types/audit/audit.ts` (5 ações, `AuditTargetType.ORGANIZATION`), `packages/sdk/__tests__/organizationAction.test.ts` |
| §2 e §5.4 posse em lista | `apps/api/(shared)/repositories/organization.repository.ts` (`listOwnedBy` por `createTime` ascendente; `findOwnedBy` devolve o primeiro), `apps/api/(shared)/lib/organization-membership.ts` (`ownsOrganizationWithMembers` lê a lista), `apps/api/(shared)/lib/account-erasure.ts` (`memoizedOwned`, expurgo de cada organização possuída) |
| §5.1 rota | `apps/api/app/(routes)/organization/members/[id]/ownership/route.ts` |
| §5.2 e §5.3 transação e `remove` | `apps/api/(shared)/repositories/organization-member.repository.ts` (`transferOwnership`, `remove` devolvendo `"removed" \| "not-member" \| "owner"`) |
| §5.3 chamadores de `remove` | `organization/leave/route.ts`, `organization/members/[id]/route.ts`, `account-erasure.ts` |
| §5.5 dono arquivado e membro vivo | `apps/api/(shared)/lib/organization-invitation.ts` (`isOrganizationActive`), `apps/api/(shared)/repositories/organization-invitation.repository.ts` (`isOrganizationOpen`, `refuseCurrentMembership`) |
| §5.6 trilha | rota de transferência, `organization/members/[id]/route.ts`, `organization/leave/route.ts`, `organization/invitations/route.ts` (só em `issued`), `invitations/accept/route.ts` (só em `accepted`) |
| §5.7 DTO | `apps/api/(shared)/lib/organization-member-profiles.ts` |
| §5.4 comentários sem "não há transferência" | `organization-membership.ts`, `organization/members/[id]/route.ts`, `organization-invitation.repository.ts`, `account/deletion/route.ts`, e o comentário de `apps/api/__tests__/accountDeletionRoute.test.ts` |
| §6 front | `(components)/OrganizationMembersTable.tsx`, `(components)/TransferOwnershipDialog.tsx` (novo), `(hooks)/useOrganizationActions.tsx`, sob `apps/app/app/[locale]/(authenticated)/(common)/(pages)/organization/` |
| §7 i18n | `translations/apps/app/pages/common/organization.ts`, `translations/apps/app/pages/admin/auditTrail.ts`, `translations/packages/shared/utils.ts` |
| §10 E2E | `apps/e2e/support/stackEnv.ts`, `apps/e2e/support/firestoreEmulator.ts` (novo), `apps/e2e/tests/organizationOwnership.spec.ts` (novo), `apps/e2e/tests/global.setup.ts`, `apps/e2e/__tests__/stackEnv.test.ts` |
| §15 docs | `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/PRE-PRODUCTION.md`, `docs/ROPA.md`, `docs/SETUP.md`, `docs/INCIDENT-RESPONSE.md`, `docs/FORKING.md` |

## Contrato e raio de impacto

- `OrganizationMemberDTO.archived: boolean` é obrigatório. Produtor único: `describeOrganizationMembers`.
  Consumidor: `OrganizationMembersTable.tsx` (esconde "Tornar dono" quando `true`). Fixtures de
  `organizationTeamPage.test.tsx` ganharam o campo.
- `organization.transferOwnership(userId)` → `POST /organization/members/<id codificado>/ownership`, devolve
  `{ ownerUserId }`. Consumidor: `transferOwnershipMutation`.
- Cinco valores de `AuditAction` e `AuditTargetType.ORGANIZATION`. Consumidor: `actionLabels` da trilha do admin,
  com rótulo nos três idiomas.
- `organizationMemberRepository.remove` mudou de `boolean` para `RemoveMembershipOutcome`. Chamadores, achados com
  `grep -rn "\.remove(" apps/api`: as duas rotas de membros, o expurgo e `organizationScope.emulator.test.ts`. Os
  quatro foram atualizados.

## Códigos de erro

- Novos: `ORGANIZATION_OWNERSHIP_TARGET_SELF` (400) e `ORGANIZATION_OWNERSHIP_TARGET_ARCHIVED` (409), em `apiErrors`
  nos três idiomas.
- Reescritos para citar a transferência, nos três idiomas: `ORGANIZATION_OWNER_CANNOT_LEAVE`,
  `ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS`, `ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS`,
  `USERS_DELETE_ORGANIZATION_HAS_MEMBERS`.
- Paridade: `pnpm --filter @repo/internationalization test` → 7 arquivos, 67 testes passando.

## Desvios em relação ao plano

Nenhuma decisão do plano estava errada. Os desvios abaixo completam o que ele não previu:

1. **Id inutilizável na rota de transferência responde 404.** A rota confere `isUsableDocumentId` antes da
   transação e responde `404 ORGANIZATION_MEMBER_NOT_FOUND`. Sem isso, um `%2F` no id faz o driver do Firestore
   lançar ao montar o caminho, e a resposta seria 500. É a mesma guarda de `notifications/[id]/read`. Coberto por
   teste de rota (`a/b`, `__reserved__`, `..`).
2. **O diálogo recebe `open` separado de `member`.** O plano previa só `member | null`. Com isso o nome sumiria do
   texto durante a animação de fechamento; a tabela guarda o último alvo e controla `open` à parte.
3. **Mais dois arquivos de teste ajustados**: `organizationScope.emulator.test.ts` (chamava `remove` e esperava
   `true`/`false`; agora espera `"removed"`/`"not-member"`, mesmo sentido) e o comentário de
   `accountDeletionRoute.test.ts`, que dizia que a propriedade não podia ser passada adiante.
4. **`docs/FORKING.md` também mudou.** Não estava na §15, mas dizia "não há transferência de propriedade"
   (`grep -rni "não há transfer" docs` achou a linha).
5. **O E2E completa o onboarding da conta convidada.** O plano não citava esse passo; sem ele a conta nova fica na
   tela de onboarding. O nome digitado ali ("E2E Team Member") é o que o toast da transferência mostra.
6. **No emulador, as asserções do helper `join` viraram `throw`.** O Biome recusa `expect` fora de `it`
   (`lint/suspicious/noMisplacedAssertion`); o efeito é o mesmo: o teste falha se o aceite não der `accepted`.

## Riscos do plano tratados

- **Casos existentes de `organizationInvitation.emulator.test.ts`.** O `homeOf` passou a gravar `user/{profileId}`
  vivo antes de resolver a casa, para dono e membros, e o `afterAll` apaga esses documentos. Nenhuma asserção mudou.
  Dois casos novos: dono arquivado → `invalid` e nenhum vínculo criado; dono cujo único outro membro foi arquivado
  aceita convite de outra equipe e passa para ela.
- **Mudança de retorno de `remove`.** Todos os chamadores atualizados (lista acima); typecheck da `api` limpo.
- **Flag ligada na pilha E2E inteira.** `pnpm e2e` local: 23 de 23 specs passando, incluindo os seis que já
  existiam (a11y no escuro, CRUD de `entity`, landing, troca de painel, login, cadastro).
- **Retrocarga pendente do antigo dono (§18).** Confirmado por leitura: `claimLegacyRecordsQuietly` sai cedo quando
  o papel não é `owner` (`organization-membership.ts:23`), e a transferência não mexe em `legacyClaimPending`. Se o
  antigo dono tinha a retrocarga pendente, ela para enquanto ele for membro. Continua como risco aceito; não há teste
  para esse caso.

## Validação (medida nesta rodada)

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter @repo/sdk test` | 4 arquivos, 15 testes passando |
| `pnpm --filter api test` | 124 arquivos, 1679 testes passando |
| `pnpm --filter api test:emulator` (JDK 21 via `/opt/homebrew/opt/openjdk@21`) | 8 arquivos, 274 testes passando; rodado de novo depois da última edição dos testes de emulador |
| `pnpm --filter app test` | 127 arquivos, 1106 testes passando |
| `pnpm --filter e2e test` | 2 arquivos, 17 testes passando |
| `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes passando |
| `pnpm --filter <api\|app\|e2e\|@repo/sdk> typecheck` | sem erro nos quatro |
| `pnpm check` | 1054 arquivos, nenhum erro |
| `pnpm turbo run lint typecheck test` | 29 de 29 tarefas, 13 do cache |
| `pnpm e2e` (pilha inteira, flag ligada) | 23 passando em 2,0 min; `organizationOwnership.spec.ts` em 15,5 s |

Depois do `pnpm e2e` e dos dois `test:emulator`, as portas 3000, 3001, 3002, 8080, 9099 e 9199 ficaram livres
(`lsof -ti tcp:<porta>` vazio). Nenhum screenshot foi guardado. Os dados criados existem só no emulador: o seed do
E2E apaga tudo a cada execução e os testes de emulador apagam o que gravam.

O que o `organizationOwnership.spec.ts` mediu, em `pt-br` e desktop claro: a conta `user2@example.com` (seed) é
dona sozinha; o convite gravado no emulador aparece em "Convites pendentes"; a conta nova aceita e aparece como
"Membro"; o dono escolhe "Tornar dono" no menu da linha e confirma "Transferir"; o toast "E2E Team Member agora é
dono da equipe." aparece; as linhas trocam de selo; o formulário de convite some e "Sair da equipe" aparece; o
antigo dono sai e fica dono sozinho de uma organização nova; o dono novo vê o formulário de convite; o axe não acha
violação `serious` ou `critical` em `/pt-br/organization`.

## A verificar no `/test`

- **Tema e responsivo.** Item "Tornar dono" no `Dropdown` do antd e o `AlertDialog` em light, dark e 375 px. Repro:
  dono com um membro, abrir o menu da linha.
- **Foco.** O plano diz que o diálogo abre com foco em "Cancelar" (padrão do Radix com `AlertDialogCancel`, não
  medido) e que, ao fechar por Esc ou pelos botões, o foco vai para o título "Membros" (`h2` com `tabIndex={-1}`).
  Repro: abrir pelo teclado, Esc, ver `document.activeElement`.
- **Copy nos três idiomas.** Diálogo, toast, as quatro recusas reescritas e os cinco rótulos da trilha, em en e es.
  A paridade só garante que as chaves existem.
- **Duas abas transferindo para pessoas diferentes** pela tela: a segunda deve mostrar o toast de
  `ORGANIZATION_FORBIDDEN`. A transação foi medida no emulador (teste "ends two simultaneous transfers with exactly
  one owner"); a tela, não.
- **Alvo arquivado pela tela**: arquivar o membro pelo admin com a tabela da equipe já aberta e confirmar a
  transferência; esperado toast de `ORGANIZATION_OWNERSHIP_TARGET_ARCHIVED`. Depois de recarregar, a linha não deve
  ter "Tornar dono".
- **Trilha do admin.** Filtrar pelo antigo dono (transferência e saída) e pelo dono novo (transferência e aceite).
  Os testes de rota provam as chamadas a `recordAuditEvent`; a gravação e a listagem não foram percorridas.
- **Convite de dono arquivado (F6)**, deslogado e logado: `400 ORGANIZATION_INVITATION_INVALID`, tela "Este convite
  não vale mais". Medido em teste de rota (prévia) e no emulador (aceite), não na tela.
- **Fork B2C (F8)**: com a flag vazia, `POST /organization/members/<id>/ownership` responde
  `404 ORGANIZATION_MEMBERS_DISABLED` (medido em teste de rota). A tela não foi aberta assim.
- **Exclusão de conta do antigo dono (F2)** e arquivamento do dono novo com membros vivos: cobertos por unit e
  emulador, não percorridos.

## Lacunas de teste conhecidas

- O E2E não emite o convite pela tela nem entrega e-mail (a suíte não tem Resend); a emissão fica com
  `organizationInvitationsRoute.test.ts`.
- O E2E roda só em `pt-br`, desktop e tema claro.
- Não há teste da retrocarga pendente do antigo dono (risco aceito acima).
- A corrida entre o arquivamento pelo admin e a transferência continua fora de transação (§18 do plano).

## Decisões em aberto

- **Aviso do convite para quem já transferiu.** `invitation.previousOrganizationNotice` diz "Os registros que você
  tinha ficam guardados e voltam se você sair da equipe". Para um antigo dono que transferiu a equipe isso não é
  verdade: ele não tem casa, e ao sair ganha uma organização vazia. O plano só mandava ajustar `leave.description`,
  então esta copy não mudou. Fica para decidir se entra nesta entrega.
