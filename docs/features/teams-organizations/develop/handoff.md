# Handoff do `/develop`: organizações, membros e convites

Rodada autônoma do `/cycle`, 2026-10-22, sobre `9c793c6`. Implementei as duas fases do plano (`analyze/plan.md`). A
fase A passou nos gates sozinha antes de a fase B começar. Nada foi commitado; a branch atual é a do workspace.

## Desvios do plano

Os dois primeiros não são escolha de gosto: seguir o plano à risca quebrava um invariante do próprio plano ou um teste
existente.

1. **⚠️ A chave da fase B não mora no guard da fase A.** O blueprint (§10.2) põe `membersFeature` e
   `isOrganizationMembersEnabled()` dentro de `requireOrganizationApi`, mas lista o helper da chave como arquivo da
   fase B (§10.10). Isso contradiz o §1.5 ("nenhum arquivo da fase A depende de código da fase B"). Um guard separado
   na pasta `(guards)` também não serve: `apps/api/__tests__/impersonationReadOnly.test.ts` exige que todo
   `export function require*Api` dali chame o helper de somente leitura ou delegue a `requireCommonPanelApi` /
   `requireAdminApi`, e eu não afrouxo teste. Saída adotada: `whenOrganizationMembersEnabled(route)` em
   `apps/api/(shared)/lib/organization-members.ts` embrulha a rota inteira, guard incluído. Consequência de
   comportamento: com a chave desligada, toda rota de `/organization/*` e `/invitations/*` responde
   `404 ORGANIZATION_MEMBERS_DISABLED` **antes de autenticar**, para qualquer chamador, sem tocar no carimbo de
   atividade nem no resolvedor. O plano previa a chave depois da autenticação e do plano. Instrumento:
   `organizationMembersRoute.test.ts`, `organizationInvitationsRoute.test.ts` e `invitationsRoutes.test.ts` conferem
   que `resolveApiActor` não é chamado; smoke com `curl` na API buildada (seção "Validação").
2. **⚠️ `requireOrganizationApi` compõe sobre `requireCommonPanelApi`, não sobre `requirePlanApi`.** Composto sobre
   `requirePlanApi`, como o plano manda, o mesmo `impersonationReadOnly.test.ts` falhou (1 caso: "organization.ts
   calls the helper or delegates every wrapper to a base guard", medido com `vitest run`). A checagem de plano foi
   extraída para `refusePlanRequirement` em `app/(guards)/plan.ts`, que o `requirePlanApi` passa a usar também, sem
   mudança de comportamento (`planGuard.test.ts` verde). Efeito colateral: nenhuma rota usa mais `requirePlanApi`; o
   `POST /entities` passa o requisito por `requireOrganizationApi(handler, { plan })`.
3. **A opção `role: "owner"` e a tradução de `ORGANIZATION_FORBIDDEN` foram para a fase A.** O papel é checado no
   guard da fase A (o plano dizia que a opção "entra em uso na fase B"), então o código que ele pode emitir vai junto.
4. **O expurgo apaga todo convite endereçado ao titular, em qualquer estado** (`purgeByEmail`). O plano dizia
   "convites pendentes". Convite aceito ou vencido também guarda o endereço, e a exclusão de conta é o direito de
   apagar esse dado.
5. **`findInOrganization` de `entity` recusa `organizationId` vazio.** O mapper transforma o campo ausente em `""`, e
   comparar duas strings vazias entregaria um registro não carimbado a quem chegasse com escopo vazio. O guard nunca
   passa vazio; a recusa é defesa.
6. **A retrocarga só roda para vínculo de dono.** Um membro nunca puxa os registros antigos dele para a organização de
   outra pessoa, mesmo que algum dia um vínculo de membro nasça com `legacyClaimPending: true`.
7. Menores: `GET /organization` responde `404 ORGANIZATION_MEMBER_NOT_FOUND` se o documento da organização sumir
   (estado corrompido, o plano não previa); o corpo do convite é `.strict()` (campo extra, como `role`, vira
   `400 VALIDATION_FAILED`); `listOpenByOrganization` virou `listPendingByOrganization` e devolve os não aceitos,
   vencidos inclusive, porque a tela mostra "Expirado"; prévia e aceite ficaram num arquivo de teste só
   (`invitationsRoutes.test.ts`); o repositório de convite repete os nomes `organization` e `organizationMember`
   como constantes, porque a transação lê por referência de documento; o e-mail do convite usa o nome da marca no
   título quando o dono não tem e-mail no Auth.
8. Documentação que estava errada antes desta entrega e foi corrigida ao passar por ela: `docs/SECURITY.md` dizia 45
   arquivos de rota e 13 caminhos com rate limit (eram 47 e 14 antes daqui; agora são 55 e 17, medidos com `find` e
   `awk` sobre `apps/api/proxy.ts:60-78`), e `docs/INCIDENT-RESPONSE.md` não listava o escopo de log
   `notifications`.

## Fronteira entre as fases

Uma cópia do estado da fase A, tirada quando os gates dela passaram, ficou fora do repositório (o orquestrador tem o
caminho). Ela não inclui os itens 3 do desvio, que foram para a fase A depois.

**Só fase A** (arquivos inteiros):

- `packages/sdk`: `types/organization/organization.ts`, `types/index.ts`, `types/entity/entity.ts`,
  `types/account/account.ts`, `types/file/file.ts`, `actions/file/action.ts`.
- `packages/shared/utils/helpers/log.ts`.
- `apps/api`, novos: `app/(guards)/organization.ts`, `(shared)/lib/organization-membership.ts`,
  `(shared)/repositories/organization.repository.ts`, `(shared)/repositories/organization-member.repository.ts`,
  `(shared)/mappers/organization-member.mapper.ts`; testes `organizationGuard.test.ts`,
  `organizationMembership.test.ts`, `entitiesRouteOrganizationScope.test.ts`, `organizationScope.emulator.test.ts`.
- `apps/api`, alterados: `app/(guards)/plan.ts`, `app/(routes)/entities/route.ts`, `entities/[id]/route.ts`,
  `entities/summary/route.ts`, `files/route.ts`, `(shared)/lib/account-export.ts`, `entity-photo.ts`, `storage.ts`,
  `user-merge.ts`, `(shared)/mappers/entity.mapper.ts`, `(shared)/repositories/entity.repository.ts`,
  `(shared)/validation/file.schema.ts`, `scripts/seed-emulator.mjs`, `CLAUDE.md`; testes `accountExportRoute`,
  `baseRepository`, `entitiesRouteImpersonation`, `entitiesRouteList`, `entitiesRoutePlanGate`,
  `entitiesSummaryRoute`, `entityPhotoReference`, `fileUploadRoute`, `firestoreIndexes`, `googleSignInProfile`,
  `mergedUserPayload`, `signUpProfile`, `storageEmulatorIsolation`, `userMergeArchivedProfile`, `usersRoute`,
  `welcomeNotification`.
- `apps/app`: `shared/hooks/useFileUpload.ts`, `entities/(pages)/create/page.tsx`,
  `entities/(pages)/edit/[id]/EditEntityClient.tsx`, `__tests__/useFileUpload.test.ts`.
- Raiz: `firestore.indexes.json`, `firestore.rules`.
- `.claude/`: `agents/desenvolvedor.md`, `skills/new-api-route/SKILL.md`, `skills/new-crud/SKILL.md`,
  `skills/write-tests/SKILL.md`. `docs/`: `BACKUP.md`, `INCIDENT-RESPONSE.md`, `feature-analysis-guide.md`,
  `review-checklist.md`.

**Só fase B** (arquivos inteiros):

- `packages/sdk`: `types/organization/members.ts`, `actions/organization/action.ts`, `client/index.ts`,
  `__tests__/organizationAction.test.ts`.
- `packages/email/__tests__/templates.test.tsx`.
- `apps/api`, novos: `(shared)/lib/organization-members.ts`, `organization-invitation.ts`,
  `organization-member-profiles.ts`, `(shared)/repositories/organization-invitation.repository.ts`,
  `(shared)/mappers/organization-invitation.mapper.ts`, `(shared)/validation/organization.schema.ts`, as 8 rotas em
  `app/(routes)/organization/` e `app/(routes)/invitations/`; testes `organizationMembersEnabled.test.ts`,
  `organizationInvitationsRoute.test.ts`, `invitationsRoutes.test.ts`, `organizationMembersRoute.test.ts`,
  `organizationInvitation.emulator.test.ts`.
- `apps/api`, alterados: `env.ts`, `.env.example`, `proxy.ts`, `__tests__/corsOrigin.test.ts`.
- `apps/app`: `env.ts`, `.env.example`, `proxy.ts`, `shared/lib/queryKeys.ts`,
  `shared/lib/organizationMembersEnabled.ts`, `(common)/paths.ts`, `(common)/routes.tsx`, a pasta
  `(common)/(pages)/organization/` inteira, a pasta `(unauthenticated)/invite/` inteira; testes `commonNavRoutes`,
  `proxy`, `organizationMembersEnabled`, `organizationPagesSwitch`, `useOrganization`, `inviteMemberFormSchema`,
  `invitationAcceptance`.
- `packages/internationalization`: `apps/app/pages/common/organization.ts`, `apps/app/pages/invitation/index.ts`,
  `apps/app/pages/common/index.ts`, `apps/app/pages/index.ts`, `apps/app/pages/common/routes/index.ts`,
  `packages/email/index.ts`.

**Arquivos com trecho das duas fases** (pedem `git add -p`):

| Arquivo | Fase A | Fase B |
|---|---|---|
| `packages/sdk/src/types/organization/index.ts` | `export * from "./organization"` | `export * from "./members"` |
| `apps/api/(shared)/lib/account-erasure.ts` | passo `organization`, prefixo da organização, `eraseEntities` | import do repositório de convites, campo `email` do input, `purgeByEmail` e `purgeByOrganization` de convites |
| `apps/api/app/(routes)/account/deletion/route.ts` | import e bloco do 409 | a linha `email,` no `runAccountErasure` |
| `apps/api/__tests__/accountErasure.test.ts` | mocks de organização e casos do passo novo | mock do repositório de convites, `email` no `INPUT` e os dois casos de convite |
| `apps/api/__tests__/accountErasureStorage.emulator.test.ts` | mocks de organização e prefixos | mock de convites e `email: null` |
| `apps/api/__tests__/accountDeletionRoute.test.ts` | casos do 409 | `email: OWNER_EMAIL` na asserção do primeiro caso |
| `packages/internationalization/translations/packages/shared/utils.ts` | `ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS` e `ORGANIZATION_FORBIDDEN`, logo depois de `ACCOUNT_DELETION_BILLING_FAILED` | os 11 códigos depois de `NOTIFICATIONS_INDEX_MISSING` |
| `docs/ARCHITECTURE.md`, `ROPA.md`, `PRE-PRODUCTION.md`, `SUBPROCESSORS.md`, `SECURITY.md`, `FORKING.md` | seção de escopo, registro 11, §1.1/§1.5/§1.8/§1.10 e declaração de exclusão, coleções de organização, quatro guards | parágrafo de membros, linhas de convite, §16, convites e Resend, contagens de rota e rate limit, variável e "Ligar membros e convites" |

Nos docs a separação é trabalhosa: em `SECURITY.md` o mesmo parágrafo do `requireOrganizationApi` tem as duas
fases. Commitar a documentação de uma vez, depois da fase B, é mais simples.

## Blueprint → arquivos

| Item | Arquivos |
|---|---|
| §10.1 contrato | `packages/sdk/src/types/organization/*`, `types/entity/entity.ts` (`organizationId`), `types/account/account.ts` (`membership`), `types/file/file.ts` (`UploadScope`), `actions/file/action.ts` (`?scope=`), `actions/organization/action.ts`, `client/index.ts` (`organization`) |
| §10.2 guard e resolução | `app/(guards)/organization.ts`, `(shared)/lib/organization-membership.ts`, `app/(guards)/plan.ts` (`refusePlanRequirement`) |
| §10.3 repositórios e mappers | `organization.repository.ts` (sem mapper), `organization-member.repository.ts` + mapper, `organization-invitation.repository.ts` + mapper, `entity.repository.ts` (`inOrganization`, `findInOrganization`, `listByOrganization`, `summaryByOrganization`, `purgeByOrganization`, `claimUnscopedByUserId`, `purgeUnscopedByUserId`; saíram `listByUserId`, `summaryByUserId`, `purgeAllByUserId`) |
| §10.4 rotas | `entities/*`, `files`, `organization/*` ×6, `invitations/preview`, `invitations/accept` |
| §10.5 pseudo-diffs | rotas de `entity`, `entity-photo.ts` (`isAttachablePhoto`, `isReplaceablePhoto`), `storage.ts` (`organizationOwnerSegment`), `user-merge.ts`, `account/deletion`, `account-erasure.ts`, `account-export.ts`, os dois `proxy.ts`, `firestore.indexes.json` |
| §10.6 front | ver "Só fase B" e `useFileUpload` |
| §10.7 i18n | 13 códigos em `apiErrors` (39 entradas, `grep -c`), `common/organization.ts`, `invitation/index.ts`, `routes.platform.organization`, `email.actionLink.actions.organizationInvitation` |
| §10.8 docs | os sete lugares do predicado antigo (`grep -rn "row.userId !=="` agora só acha o caso da pessoa, explicado como tal), mais `ARCHITECTURE`, `ROPA`, `PRE-PRODUCTION`, `BACKUP`, `SUBPROCESSORS`, `FORKING`, `firestore.rules`, `.env.example` ×2, seed |

Risco 1 do §13 conferido: `grep -n 'where("userId"' apps/api/(shared)/repositories/entity.repository.ts` acha duas
linhas, a exportação por autor e a consulta da retrocarga/expurgo de não carimbados.

## Contrato e quem consome

- `EntityDTO.organizationId` (novo, obrigatório): API (mapper, rotas) e app (tipos). Nenhum fixture da app quebrou
  (`pnpm --filter app typecheck` verde sem mexer em teste).
- `AccountDataExportDTO.membership`: só a exportação. `format.version` continua 1.
- `FileActions.upload(file, { scope })`: `useFileUpload`; os formulários de `entity` passam `"organization"`, o avatar
  não passa nada.
- `OrganizationActions` (novo): página da equipe e página de aceite.

## Códigos de erro novos

`ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS` e `ORGANIZATION_FORBIDDEN` (fase A); `ORGANIZATION_MEMBERS_DISABLED`,
`ORGANIZATION_MEMBER_NOT_FOUND`, `ORGANIZATION_OWNER_CANNOT_LEAVE`, `ORGANIZATION_INVITATION_NOT_FOUND`,
`ORGANIZATION_INVITATION_ALREADY_MEMBER`, `ORGANIZATION_INVITATION_LIMIT_REACHED`,
`ORGANIZATION_INVITATION_RECENTLY_SENT`, `ORGANIZATION_INVITATION_INVALID`, `ORGANIZATION_INVITATION_EXPIRED`,
`ORGANIZATION_INVITATION_EMAIL_MISMATCH`, `ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS` (fase B). Os 13 estão em
`apiErrors` nos três idiomas; a paridade passa (`pnpm --filter @repo/internationalization test`: 7 arquivos, 67
testes).

## Validação

| Comando | Resultado |
|---|---|
| `pnpm check` | 1045 arquivos, nenhum erro |
| `pnpm turbo run lint typecheck test` | 29 de 29 tarefas verdes |
| `pnpm --filter api test` | 121 arquivos, 1630 testes (antes desta entrega: 114 e 1500) |
| `pnpm --filter app test` | 126 arquivos, 1083 testes |
| `pnpm --filter @repo/sdk test` | 4 arquivos, 14 testes |
| `pnpm --filter @repo/email test` | 7 arquivos, 208 testes |
| `pnpm --filter api test:emulator` (JDK 21) | 7 arquivos, 264 testes; o teste de rules descobriu as três coleções novas (225 casos) |
| fase A sozinha, antes da fase B | `pnpm turbo run typecheck test` em api, app, sdk, i18n, shared e web: 18 de 18; emulador 6 arquivos, 243 testes |
| `pnpm --filter app build` e `pnpm --filter api build`, com a variável ausente do `.env` local | os dois terminam com código 0; as rotas novas aparecem na saída do build |

Smoke de modo degradado, na API buildada (`next start -p 3092`, `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED=""`):
`curl` em `GET /organization`, `GET /organization/members`, `DELETE /organization/members/abc`,
`POST /organization/leave`, `GET` e `POST /organization/invitations`, `DELETE /organization/invitations/abc`,
`POST /invitations/preview` e `POST /invitations/accept` respondeu `404 {"error":{"code":"ORGANIZATION_MEMBERS_DISABLED"}}`
nos nove; `GET /entities` sem credencial respondeu `401 AUTH_INVALID_TOKEN`. Na app buildada (`next start -p 3090`),
`/pt-br/invite`, `/pt-br/invite?token=abc` e `/en/invite` responderam 404, e `/pt-br/organization` deslogado
respondeu 307 para o login, como qualquer rota autenticada.

Medido no emulador (`organizationScope.emulator.test.ts`, `organizationInvitation.emulator.test.ts`): 8 primeiros
pedidos simultâneos gravam 1 organização; a retrocarga carimba o registro ativo e o apagado, não muda `updatedAt`,
não toca no registro carimbado em outra organização nem no de outra pessoa, e a segunda passada não grava nada;
lista, resumo e leitura por id não cruzam duas organizações; 3 aceites simultâneos do mesmo token terminam com 1
aceito e os outros dois como "já aceito" (mesma pessoa) ou "inválido" (outra); dois convites simultâneos para o mesmo
endereço deixam 1 documento; convite de organização dormente é recusado; dono com membros não aceita; e-mail
diferente é recusado.

## A verificar no `/test`

Nada abaixo foi medido por mim; são os fluxos do §9.2 do plano, com o que ficou mais incerto.

- F1: `user@example.com` do seed entra e vê os dois registros, e no emulador eles ganham `organizationId` com
  `updatedAt` intacto. O emulador provou a retrocarga pelo repositório, não pela tela.
- F4: upload pelo formulário de `entity` cai em `uploads/org-<id>/` e o do avatar em `uploads/<profileId>/`. Só a
  rota foi testada, com o storage mockado.
- F6: com a variável vazia, nenhum "Equipe" nem "organiza…"/"organization"/"organización" nas páginas, nos três
  idiomas. Medi só os 404 das duas páginas e das rotas.
- F9: cadastro a partir do convite (`/sign-up?redirect=/pt-br/invite?token=…`) volta ao convite depois do onboarding.
  Não medido (risco 15 do plano).
- "Entrar com outra conta" na página de aceite: o `signOut` do provider já faz um `push` próprio e eu faço outro para
  o login com `redirect`. Qual dos dois vence não foi medido.
- Chave ligada só na `app`: a página da equipe deve mostrar o texto de `ORGANIZATION_MEMBERS_DISABLED` como erro de
  carga.
- Personificação na página da equipe: tudo visível, botões desabilitados, aviso de somente leitura.
- Tabelas antd da página da equipe em light, dark e mobile.
- F15: dono com membro tenta excluir a conta e vê a mensagem do 409.

## Lacunas de teste conhecidas

- Os quatro componentes da página da equipe (`OrganizationMembersTable`, `OrganizationInvitationsTable`,
  `InviteMemberForm`, `LeaveOrganizationButton`) não são renderizados em teste; hooks, schema e página de aceite são.
- O prefetch RSC da página da equipe não tem teste.
- `describeOrganizationMembers` com mais de 100 membros (o `getUsers` em lotes) não tem caso.
- O teto de 20 convites e o intervalo de 60 s só têm teste de rota com o repositório mockado; o emulador cobre a
  unicidade do documento, não esses dois limites.
- `isMemberOfOrganization` com erro do Auth diferente de `user-not-found` sobe como 500; não há caso.
- Nenhuma spec E2E nova (decisão P18 do plano). As specs existentes não rodaram nesta etapa; a seed não mudou de forma.

## Pendências e decisões em aberto

- As pendências de infraestrutura estão em `docs/PRE-PRODUCTION.md`: §1.10 (índices de `entity` por organização antes
  do deploy, remoção dos índices antigos depois) e §16 (variável nas duas apps, Resend, `ARCJET_KEY`, TTL de convite).
- As 21 perguntas do plano continuam com a opção que o plano adotou. Duas mudaram de forma por causa dos desvios 1 e 2:
  a chave é lida antes da autenticação, e nenhuma rota usa mais `requirePlanApi`.

## Processos

Os dois `firebase emulators:exec` do `test:emulator` subiram e derrubaram Firestore e Storage sozinhos; as portas
8080, 9199, 4001, 4400, 4500 e 9150 estavam livres antes e depois (`lsof -ti`). Subi `next start` da API na 3092 e da
app na 3090, matei os dois pelo PID guardado e conferi as portas livres. Nada ficou rodando.
