# Plano: travas da organização (arquivamento do dono, rate limit do convite e falha do Auth no convite)

- **Slug:** `organization-guardrails`
- **Origem:** tarefa direta, sem spec. É a recomendação "A próxima: tarefa direta `organization-guardrails`" de
  `specs/BACKLOG.md:211-245`, que junta três achados da PR #57 registrados em `specs/BACKLOG.md:1350-1352`: D10 (o
  admin arquiva o dono de uma organização com membros), D11 (o rate limit de `/organization/invitations` conta a
  leitura da tabela) e o `500` sem `error.code` quando o Auth falha ao conferir o convidado. As opções adotadas são
  as que o `/review` da PR #57 deixou escritas em `docs/features/teams-organizations/review/review.md:166-171` (D2 e
  D3, ambas opção b) e que a auditoria do backlog confirmou nas linhas D10 e D11 (`specs/BACKLOG.md:361-362`).
- **Base:** `main` em `61a781e` (PR #57). Branch atual `guilhermebittelbrunn/cycle-command-v8`; este plano não cria
  nem nomeia branch.
- **Escopo:** `apps/api`, dois `error.code` novos em `apiErrors` (pt-br, en, es) e documentação (`docs/SECURITY.md`, `docs/INCIDENT-RESPONSE.md`, `docs/BACKUP.md`, mais âncoras deslocadas em
  `docs/ROPA.md` e `docs/SUBPROCESSORS.md`). Sem SDK, sem código em `apps/app` ou `apps/web`, sem variável de
  ambiente, sem infra.

## 0. Sumário do desenho

1. **D10, arquivamento do dono.** `DELETE /users/:id` (`apps/api/app/(routes)/users/[id]/route.ts:174-235`) passa a
   chamar `ownsOrganizationWithMembers(profile.id)` depois da recusa de autoarquivamento (`:186-188`) e antes de
   qualquer efeito (rótulo de auditoria, Stripe, Auth, soft delete). Se for `true`, responde
   `409 USERS_DELETE_ORGANIZATION_HAS_MEMBERS` e não toca em nada. O helper é o mesmo que a exclusão pelo titular já
   usa (`account/deletion/route.ts:43-48`, helper em `apps/api/(shared)/lib/organization-membership.ts:105-117`). O
   código é novo porque a cópia do código do titular fala com o dono ("A sua equipe ainda tem membros"), e aqui quem
   lê é o admin.
2. **D11, rate limit só no `POST` do convite.** `apps/api/proxy.ts` ganha um mapa de métodos por caminho
   (`/organization/invitations` → `["POST"]`) e a checagem passa a olhar o método da requisição quando o caminho está
   no mapa. Os outros 16 caminhos continuam valendo para qualquer método. A lista `RATE_LIMITED_PATHS` não muda e
   continua com 17 caminhos.
3. **O `500` do convite vira `503 ORGANIZATION_INVITATION_FAILED`.** A rota `POST /organization/invitations` envolve a
   chamada a `isMemberOfOrganization` (`organization/invitations/route.ts:72`) num `try/catch`, registra
   `[organization] invitation-member-check-failed` com `requestId` e o código do provedor, sem endereço, e responde
   com o código novo. Nada é gravado e nenhum e-mail sai. O helper (`organization-invitation.ts:67-92`) não muda. É o
   padrão de `account/email/route.ts:127-137`, que a recomendação aponta.

O `apps/app` não muda: as duas telas que podem receber os códigos novos já mostram qualquer `error.code` pelo
`apiErrors` (§5).

## 1. Contexto

### 1.1 Problema 1 (D10): o admin arquiva o dono de uma equipe com membros

O `DELETE /users/:id` confere só se o perfil existe (`users/[id]/route.ts:177-184`) e se não é a própria conta do
admin (`:186-188`). Em seguida cancela a assinatura viva (`:194-204`), desativa a conta e revoga as sessões
(`:207-218`) e marca `deletedAt` no perfil (`:220`). Nada olha a organização.

Quando o alvo é dono de uma organização com membros, o vínculo dele continua (`organizationMember` com
`role: "owner"`), então `isOrganizationActive` (`organization-invitation.ts:98-110`) segue respondendo `true`, e os
convites pendentes continuam aceitáveis. Os membros ficam numa organização que ninguém gerencia: não há
transferência de dono, e só o dono convida, revoga e remove (`{ role: "owner" }` nas rotas de
`organization/*`). A exclusão pelo próprio titular já recusa esse caso com `409 ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS`
antes de conferir a senha (`account/deletion/route.ts:41-48`). Essa é a ressalva do item 5 do corte de
`teams-organizations` (`specs/BACKLOG.md:21`, `:483`).

### 1.2 Problema 2 (D11): a leitura da tabela gasta a cota do convite

`isRateLimitedPath` compara só o caminho (`proxy.ts:80-82`), e `/organization/invitations` está na lista (`:75`). A
rota exporta `GET` (a tabela de convites pendentes, `organization/invitations/route.ts:26-45`) e `POST` (o convite, que
manda e-mail, `:47-149`). A tabela recarrega ao abrir a página e depois de cada convite e de cada revogação
(`review.md:34`). Com o orçamento de 20 pedidos por 60 s por IP, o dono que convida umas dez pessoas seguidas recebe
`429 AUTH_RATE_LIMITED`. O volume de e-mail já tem dois tetos no próprio domínio: 20 convites pendentes por
organização e 60 s entre reenvios para o mesmo endereço (`organization-invitation.ts:15-16`). O `docs/SECURITY.md:162`
diz hoje que "as três de convite valem para qualquer método".

### 1.3 Problema 3: falha do Auth ao conferir o convidado vira `500` sem código

`isMemberOfOrganization` relança todo erro de `getUserByEmail` que não seja `auth/user-not-found`
(`organization-invitation.ts:71-79`), e a rota o chama sem `try` (`organization/invitations/route.ts:72`). Nenhum
guard tem `catch` (conferido em `app/(guards)/admin.ts`, `common-panel.ts`, `organization.ts` e
`(shared)/lib/organization-members.ts`), então o erro sobe até o Next, que responde `500` sem corpo. O front cai no
texto genérico de `error.unexpected`. O teste atual fixa esse comportamento: espera `rejects.toThrow("unavailable")`
(`apps/api/__tests__/organizationInvitationsRoute.test.ts:331-343`). É contra a regra de ouro 3.

### 1.4 Objetivo e corte de MVP

O corte é a recomendação inteira, os três itens, porque são pequenos e independentes:

- D10: recusa no `DELETE` do admin, com código próprio e cópia para o admin.
- D11: método casado só para `/organization/invitations`.
- Item 3: `error.code` traduzível no lugar do `500` cru, só nessa rota.

**Fora de escopo:**

- **Bloquear** o dono pelo `PUT /users/:id` com `disabled: true` (`users/[id]/route.ts:146-155`). É reversível e é o
  que o `docs/INCIDENT-RESPONSE.md:51` manda fazer numa conta comprometida; recusar ali tiraria a ferramenta de
  contenção.
- **Promover** a admin o dono de uma organização com membros (`PUT` com `type: ADMIN`, `:137-139`). O perfil admin não
  entra no painel comum, então a organização também fica sem gestão. É o mesmo tipo de furo que o D10, mas não está na
  recomendação; vira achado no handoff para o backlog (§12, D7).
- Transferência de dono, organização "dormente" quando o dono é arquivado (opção c do D3) e qualquer tela nova no
  admin para mostrar a organização do usuário.
- Os outros `500` sem código que o `/review` da PR #57 disse existirem em outras rotas (`specs/BACKLOG.md:1352`). Só a
  rota de convite entra.
- E-mail pré-preenchido no cadastro vindo do convite, foto compartilhada apagada e eventos de auditoria de
  organização: cada um tem linha própria no backlog (`specs/BACKLOG.md:1353-1356`).

### 1.5 Apps impactados

| área | muda? | o quê |
|------|-------|-------|
| `apps/api` | sim | `users/[id]/route.ts`, `proxy.ts`, `organization/invitations/route.ts` e testes |
| `packages/internationalization` | sim | dois códigos em `apiErrors`, nos 3 idiomas (`translations/packages/shared/utils.ts`) |
| `packages/sdk` | não | nenhum DTO ou action muda; o corpo de erro já é `{ error: { code } }` |
| `apps/app` | não | os códigos chegam às telas pelo caminho genérico (§5) |
| `apps/web` | não | nenhuma chamada a essas rotas |
| `docs/*` | sim | `SECURITY.md`, `INCIDENT-RESPONSE.md`, `BACKUP.md`, `ROPA.md`, `SUBPROCESSORS.md` (§10.5) |

Área do painel: admin (D10) e comum, dono da equipe (D11 e item 3). Modo de produto: indiferente; as duas rotas valem
em `subscription` e em `simple`. Não depende de plano. Dependências externas: Firebase Auth (item 3) e Arcjet (D11,
que só limita com `ARCJET_KEY`). Nenhuma variável nova.

Feature flag: o D10 vale com `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED` ligada ou desligada, como a exclusão pelo
titular, porque membros podem existir de quando ela esteve ligada (`docs/PRE-PRODUCTION.md`, §16, "Desligar depois de
ter membros não desfaz a equipe"). D11 e item 3 só são alcançáveis com a flag ligada; desligada, a rota responde
`404 ORGANIZATION_MEMBERS_DISABLED` antes de autenticar (`organization-members.ts`).

## 2. Dados (Firestore)

N/A. Nenhuma coleção, campo ou índice novo. O D10 lê com o que já existe:
`organizationRepository.findOwnedBy` (consulta de um campo, `ownerUserId`, sem índice composto) e
`organizationMemberRepository.listByOrganization`, as mesmas duas leituras que a exclusão pelo titular já faz. Custo:
duas leituras a mais por arquivamento, que é ação rara de admin.

## 3. Contrato `@repo/sdk`

N/A. `apiClient.user.delete(id)` e `apiClient.organization.invite(...)` não mudam de assinatura. Os erros continuam no
formato `{ error: { code } }`, lido pelo `FormattedError`.

## 4. API

### 4.1 Rotas e guards

| rota | guard | muda |
|------|-------|------|
| `DELETE /users/:id` | `requireAdminApi` | recusa `409` para dono com membros |
| `POST /organization/invitations` | `whenOrganizationMembersEnabled(requireOrganizationApi(..., { role: "owner" }))` | `try/catch` na conferência do convidado |
| `GET /organization/invitations` | idem | não muda; só deixa de passar pelo rate limit |

### 4.2 Ordem dentro do `DELETE /users/:id`

1. `404 USERS_NOT_FOUND` (como hoje).
2. `403 USERS_SELF_LOCKOUT_FORBIDDEN` (como hoje). Fica antes porque não custa leitura e é recusa mais específica.
3. **Novo:** `409 USERS_DELETE_ORGANIZATION_HAS_MEMBERS` se `ownsOrganizationWithMembers(profile.id)`.
4. Rótulo de auditoria, Stripe, Auth, soft delete e evento (como hoje).

O passo 3 recebe `profile.id` (o id do documento `user`, igual ao `id` da rota), que é o `userId` gravado no vínculo.
É o mesmo argumento da exclusão pelo titular (`ctx.subjectProfile.id`). Passar o `reference_id` (uid) seria erro: o
helper compara com `member.userId`.

Se `ownsOrganizationWithMembers` lançar (Firestore indisponível), a rota responde `500` sem código, como a exclusão
pelo titular. Não trato aqui: é o mesmo comportamento das leituras do `userRepository.findById` na linha acima, e
nada foi alterado ainda nesse ponto.

### 4.3 Casamento por método no proxy

O mapa fica junto da lista e só declara exceções. Caminho na lista e fora do mapa conta qualquer método, como hoje.
`OPTIONS` já sai antes da checagem (`proxy.ts:157-164`), e `HEAD`, se o Next o servir a partir do `GET`, fica fora
porque não está no mapa. Os 429 seguem com o mesmo `AUTH_RATE_LIMITED` e `Retry-After`.

### 4.4 O `catch` do convite

O `catch` envolve só a chamada a `isMemberOfOrganization`. Ele pega também falha de Firestore dentro do helper
(`userRepository.findByReferenceId`, `findInOrganization`), o que está certo: em qualquer desses casos nada foi
gravado e o dono pode tentar de novo. Status `503`, e não `500` como em `account/email`, porque a causa é um provedor
indisponível e a recusa pede nova tentativa; é o que a rota vizinha `DELETE /users/:id` faz com falha do Auth
(`USERS_DELETE_AUTH_FAILED`, `users/[id]/route.ts:209-218`). O log usa `adminAuthErrorReason(error)`
(`apps/api/(shared)/lib/toolkit-error-codes.ts:97-102`), que devolve o código do Admin SDK ou o `name` do erro, nunca a
mensagem, que pode trazer o endereço.

O helper continua lançando. A rota é a única chamadora (`git grep isMemberOfOrganization` só acha a rota e os
testes), então trocar o helper por um resultado de três estados também seria possível; o `catch` na rota é a mudança
menor e é o padrão da rota de e-mail que a recomendação aponta.

### 4.5 Erros

| `error.code` | status | quando | novo? |
|--------------|--------|--------|-------|
| `USERS_DELETE_ORGANIZATION_HAS_MEMBERS` | 409 | admin arquiva dono de organização com outro membro | **sim** |
| `ORGANIZATION_INVITATION_FAILED` | 503 | `getUserByEmail` falha com código diferente de `auth/user-not-found`, ou a leitura do Firestore no helper falha | **sim** |
| `AUTH_RATE_LIMITED` | 429 | estouro do orçamento; agora só no `POST` de `/organization/invitations` | não |
| `USERS_NOT_FOUND`, `USERS_SELF_LOCKOUT_FORBIDDEN`, `USERS_DELETE_BILLING_FAILED`, `USERS_DELETE_AUTH_FAILED` | 404, 403, 503, 503 | como hoje | não |

Nomes: `USERS_DELETE_*` segue a família do arquivamento pelo admin (`apiErrors` já tem `USERS_DELETE_BILLING_FAILED` e
`USERS_DELETE_AUTH_FAILED`). `ORGANIZATION_INVITATION_FAILED` segue a família `ORGANIZATION_INVITATION_*`.

## 5. Front-end

Nenhum arquivo de `apps/app` ou `apps/web` muda.

- **Arquivar usuário (admin):** `deleteUserMutation` chama `apiClient.user.delete(id)` e, no erro, mostra
  `handleClientError(new FormattedError(error, locale))` (`apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(hooks)/useUserCrud.tsx:131-143`).
  O `FormattedError` procura `error.code` em `apiErrors` (`packages/shared/utils/helpers/formattedError.ts:60-80`).
  O teste `apps/app/__tests__/useUserCrudSelfLockout.test.tsx:111-125` já prova esse caminho para outro código do mesmo
  `DELETE`.
- **Convidar (dono):** `inviteMutation` usa o mesmo caminho
  (`apps/app/app/[locale]/(authenticated)/(common)/(pages)/organization/(hooks)/useOrganizationActions.tsx:24-41`).

A cópia nova aparece no alerta que já existe. Não há layout novo, então não há passada de `agent-browser` (§8).

## 6. Autorização e segurança

- D10 aperta uma regra de integridade no servidor; a UI não tem atalho para contornar. A recusa vem depois do
  `requireAdminApi`, então comum e não autenticado continuam recebendo o que recebem hoje (403/401).
- Personificação: N/A no `DELETE /users/:id`, que é rota de admin sem sujeito personificado. No `POST` do convite, o
  admin personificando continua recusado como somente leitura pelo guard antes de chegar ao `try` (coberto por
  `organizationInvitationsRoute.test.ts:392`).
- D11 afrouxa o limite só para a leitura. O `GET` exige sessão de dono (`{ role: "owner" }`), lê uma consulta do
  Firestore e não chama provedor. As rotas de organização que já ficam fora da lista (`specs/BACKLOG.md:660`) são do
  mesmo tipo.
- Item 3: o log não carrega o e-mail convidado nem a mensagem do erro, só o código do provedor e o `requestId`
  (`LogFieldValue` não aceita objeto, `packages/shared/utils/helpers/log.ts:23`). A resposta não diz se o endereço tem
  conta, como hoje.
- Efeito colateral do D10 que precisa ir para o `INCIDENT-RESPONSE.md`: numa conta comprometida de dono com membros,
  arquivar passa a ser recusado. A contenção continua possível pelo bloqueio (`PUT` com `disabled: true`), que não é
  recusado e revoga as sessões.

## 7. Testes

Tudo em teste de rota com `vi.mock`, no padrão dos arquivos que já cobrem essas rotas. Nenhum teste de emulador: o
helper `ownsOrganizationWithMembers` já tem três casos com repositório mockado
(`apps/api/__tests__/organizationMembership.test.ts:238-260`), a consulta é de um campo só, e o objeto desta tarefa é a
ordem das recusas na rota, não a infra.

### 7.1 `apps/api/__tests__/usersAdminArchiveAccess.test.ts` (existente)

Acrescentar `vi.mock("@/(shared)/lib/organization-membership", ...)` com `ownsOrganizationWithMembersMock`
(padrão `false` no `beforeEach`) e um `describe` novo:

- dono com membros: `409`, `code` `USERS_DELETE_ORGANIZATION_HAS_MEMBERS`; `getStripe`, `updateUser`,
  `revokeUserSessions`, `userRepository.delete` e `recordAuditEvent` não chamados; o helper chamado com o id do
  documento (`"p2"`), não com o uid.
- dono sozinho ou sem organização (`false`): segue para `204`, com a ordem `disable → revoke → delete` de hoje.
- própria conta: `403 USERS_SELF_LOCKOUT_FORBIDDEN` sem chamar o helper.
- perfil inexistente: `404` sem chamar o helper.

### 7.2 `usersAdminDeleteBilling.test.ts` e `usersAdminAuditTrail.test.ts` (existentes)

Precisam do mesmo `vi.mock` com `ownsOrganizationWithMembers: () => Promise.resolve(false)`. Sem ele, a rota importa o
módulo real, que importa os repositórios, que importam `infra/database.ts`, que chama `getFirestoreAdmin()` de um
`@repo/auth/server` mockado sem essa exportação: o arquivo inteiro falha no import. `mergedUserPayload.test.ts` já
mocka o módulo (`:25-27`) e só chama o `GET`; o `/develop` confirma rodando a suíte.

### 7.3 `apps/api/__tests__/organizationInvitationsRoute.test.ts` (existente)

- Reescrever o caso `:331-343`: `getUserByEmail` rejeita com `auth/internal-error` → `503`, `code`
  `ORGANIZATION_INVITATION_FAILED`, `issue` e `sendEmail` não chamados, `logEvent` chamado com
  `("organization", "invitation-member-check-failed", { requestId, reason: "auth/internal-error" })`, e nenhum campo do
  log contém o endereço convidado.
- Caso novo: `findInOrganization` rejeita (Firestore) → mesmo `503` e nada gravado.
- O caso `auth/user-not-found` → `201` já existe (o `beforeEach` usa esse código como padrão).

### 7.4 `apps/api/__tests__/proxyArcjetKey.test.ts` (existente)

Seguir o caso do catálogo (`:107-123`), com a cota estourada (`protect` negando):

- `GET /organization/invitations` passa (`x-middleware-next: 1`) e `protect` não é chamado.
- `POST /organization/invitations` recebe `429 AUTH_RATE_LIMITED`.
- Um caminho da lista sem exceção de método, lido por `GET`, continua limitado: `GET /account/export` → `429`. Isso
  prova que o mapa não afrouxou os outros caminhos.

### 7.5 i18n

`packages/internationalization/__tests__/parity.test.ts` cobre a paridade dos dois códigos novos nos 3 idiomas. Não
há teste que confira se todo código emitido pela API existe em `apiErrors`; a skill `/i18n-sync` e o `/review` fazem
essa conferência.

### 7.6 O que não ganha teste e por quê

- Teste de hook ou componente no `apps/app` para os códigos novos: o caminho é genérico e já tem teste
  (`useUserCrudSelfLockout.test.tsx`); um caso por código novo testaria o dicionário, que a paridade já cobre.
- `429` real com a Arcjet: exige `ARCJET_KEY` válida, fica 🔒 como nas PRs anteriores.

### 7.7 Suítes

`pnpm --filter api test`, `pnpm --filter @repo/internationalization test` e, no `/test`, `pnpm test` do root (inclui
`test:emulator`, que não muda, mas gateia o build).

## 8. O que o `/test` vai ter de percorrer

Diff sem layout novo: **sem `agent-browser`** (`.claude/cycle-policy.md`, §3.1). O `/test`:

1. Roda as suítes da §7.7 e lê os casos novos contra os critérios.
2. Opcional, se o seed do emulador tiver dono com membro ou se for barato criar um: `next start` da api + emulador e
   um `curl -X DELETE /users/<id do dono>` com credencial de admin, esperando `409` com o código. Mede o helper real
   contra o Firestore do emulador; a falta dessa medição não reprova, porque o helper já roda na exclusão pelo
   titular.
3. 🔒 sem infra: o `429` real da Arcjet no `POST` e o `GET` livre com cota estourada em ambiente com `ARCJET_KEY`
   (pendência 24 do backlog, `PRE-PRODUCTION.md` §8). A falha real do Firebase Auth também não se produz no emulador
   sem mock; o teste de rota é a prova.

Dados de QA, se o passo 2 rodar: e-mails `qa-organization-guardrails-owner@example.com` e
`qa-organization-guardrails-member@example.com`, listados no relatório para limpeza.

## 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Admin não arquiva dono de equipe com outros membros**
  `DELETE /users/:id` de um perfil que é dono de uma organização onde existe pelo menos um vínculo de outra pessoa
  responde `409` com `{ "error": { "code": "USERS_DELETE_ORGANIZATION_HAS_MEMBERS" } }`. Nada muda: a assinatura não é
  cancelada, a conta não é desativada, as sessões não são revogadas, o perfil não ganha `deletedAt` e nenhum evento
  `user.delete` é gravado. A regra vale com `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED` ligada ou desligada.

- [ ] **Dono sozinho e perfil sem organização continuam arquiváveis**
  Quando a organização do alvo só tem o próprio dono, ou quando o perfil não tem organização de casa, o arquivamento
  segue como antes: cancela a assinatura viva, desativa a conta, revoga as sessões, marca `deletedAt`, grava o evento e
  responde `204`. Uma pessoa que é só **membro** da organização de outra (e dona de uma organização de casa vazia)
  também é arquivável.

- [ ] **Ordem das recusas do arquivamento**
  Perfil inexistente responde `404 USERS_NOT_FOUND` e a própria conta do admin responde `403
  USERS_SELF_LOCKOUT_FORBIDDEN`, as duas sem consultar a organização. A consulta da organização vem antes de qualquer
  efeito (Stripe, Auth, Firestore, trilha). A checagem usa o id do documento do perfil, e não o uid do Firebase.

- [ ] **Bloquear o dono continua possível**
  `PUT /users/:id` com `disabled: true` num dono com membros segue funcionando como hoje (desativa e revoga sessões),
  sem a recusa nova. É o caminho de contenção numa conta comprometida, e o `docs/INCIDENT-RESPONSE.md` diz isso.

- [ ] **Mensagem do arquivamento recusado nos 3 idiomas**
  `apiErrors.USERS_DELETE_ORGANIZATION_HAS_MEMBERS` existe em pt-br, en e es, fala com o admin (terceira pessoa,
  "este usuário") e diz que nada foi arquivado e que os membros precisam sair ou ser removidos antes. O alerta da lista
  de usuários do admin mostra esse texto, pelo caminho do `FormattedError`, sem mudança no `apps/app`.

- [ ] **A tabela de convites não gasta a cota do rate limit**
  Com `ARCJET_KEY` válida e a cota do IP estourada, `GET /organization/invitations` passa pelo proxy sem consultar o
  limitador. `OPTIONS` continua respondendo `204` como antes. Sem `ARCJET_KEY`, nada muda (o limite é no-op).

- [ ] **O convite continua limitado**
  Com a cota estourada, `POST /organization/invitations` recebe `429 AUTH_RATE_LIMITED` com `Retry-After`. Os outros 16
  caminhos da lista continuam valendo para qualquer método; `GET /account/export` com a cota estourada também recebe
  `429`. A lista segue com 17 caminhos, e o `docs/SECURITY.md` diz que o de convite conta só o `POST`.

- [ ] **Falha do Auth ao conferir o convidado responde com código**
  Se `getUserByEmail` falhar com qualquer código diferente de `auth/user-not-found` (ex.: `auth/internal-error`), ou se a
  leitura do Firestore dentro da conferência falhar, `POST /organization/invitations` responde `503` com
  `{ "error": { "code": "ORGANIZATION_INVITATION_FAILED" } }`. Nenhum convite é gravado e nenhum e-mail sai. Repetir o
  pedido depois da falha funciona normalmente, sem cair no intervalo de 60 s, porque nada foi gravado.

- [ ] **Log da falha sem dado pessoal**
  A falha registra uma linha `[organization] invitation-member-check-failed` com `requestId` e `reason` (o código do
  Admin SDK, ou o `name` do erro). A linha não traz o endereço convidado, o e-mail do dono nem a mensagem do erro.

- [ ] **Mensagem do convite que falhou nos 3 idiomas**
  `apiErrors.ORGANIZATION_INVITATION_FAILED` existe em pt-br, en e es, diz que o convite não foi enviado e pede para
  tentar de novo. A tela da equipe mostra esse texto no alerta de erro do convite, sem mudança no `apps/app`.

- [ ] **Comportamento anterior preservado no convite**
  Endereço sem conta (`auth/user-not-found`) segue para `201`; endereço que já é membro segue com `409
  ORGANIZATION_INVITATION_ALREADY_MEMBER`; membro comum segue com `403 ORGANIZATION_FORBIDDEN`; admin personificando
  segue recusado como somente leitura; sem e-mail configurado segue `503 EMAIL_NOT_CONFIGURED` antes de ler o corpo.

- [ ] **Paridade de i18n e gates**
  `parity.test.ts` passa com os dois códigos novos. `pnpm check`, `typecheck` da `api` e `pnpm --filter api test` passam,
  incluindo os três arquivos de teste do `DELETE /users/:id` com o mock novo.

## 10. Blueprint técnico

### 10.1 `apps/api/app/(routes)/users/[id]/route.ts`

```diff
 import { isLiveSubscription } from "@/(shared)/lib/billing-state";
+import { ownsOrganizationWithMembers } from "@/(shared)/lib/organization-membership";
 import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
@@ DELETE
         if (isOwnAccount(profile, ctx)) {
             return selfLockoutRefusal();
         }
 
+        // Ownership cannot be handed over, so archiving the owner would leave the members
+        // in an organization nobody manages, still accepting its pending invitations.
+        if (await ownsOrganizationWithMembers(profile.id)) {
+            return Response.json(
+                { error: { code: "USERS_DELETE_ORGANIZATION_HAS_MEMBERS" } },
+                { status: HTTP_STATUS.CONFLICT }
+            );
+        }
+
         // Read while the account is still there: ...
```

O comentário é regra de negócio não evidente (§2 de `.claude/rules/code-comments.md`); o `/develop` pode cortá-lo se
o nome do helper bastar. A posição do `import` segue a ordenação do Biome (`pnpm fix`).

### 10.2 `apps/api/proxy.ts`

```diff
  * Organization invitations: `/organization/invitations` sends an email on every accepted
- * POST, `/invitations/preview` is public and answers whether a token is live, and
- * `/invitations/accept` is the step that consumes one. The pending ceiling and the resend
- * interval still hold without a budget here.
+ * POST, and only the POST counts: the owner's table reads the same path after every invite
+ * and revoke. `/invitations/preview` is public and answers whether a token is live, and
+ * `/invitations/accept` is the step that consumes one.
@@
 ];
 
-function isRateLimitedPath(pathname: string): boolean {
-    return RATE_LIMITED_PATHS.includes(pathname);
+/** Listed paths that count only these methods; every other listed path counts any method. */
+const RATE_LIMITED_METHODS = new Map<string, readonly string[]>([
+    ["/organization/invitations", ["POST"]],
+]);
+
+function isRateLimited(request: NextRequest): boolean {
+    const { pathname } = request.nextUrl;
+    if (!RATE_LIMITED_PATHS.includes(pathname)) {
+        return false;
+    }
+    const methods = RATE_LIMITED_METHODS.get(pathname);
+    return methods === undefined || methods.includes(request.method);
 }
@@ proxy()
-    if (isRateLimitedPath(request.nextUrl.pathname)) {
+    if (isRateLimited(request)) {
```

A frase "The pending ceiling and the resend interval still hold without a budget here" sai do comentário por falta de
espaço, não por ter ficado falsa; se o `/develop` conseguir manter as mesmas quatro linhas com ela, melhor, porque a
lista continua em `:60-78` e as âncoras `proxy.ts:60-78` de `ROPA.md:54`, `:94` e `SECURITY.md:162` não se mexem.

### 10.3 `apps/api/app/(routes)/organization/invitations/route.ts`

```diff
+import { adminAuthErrorReason } from "@/(shared)/lib/toolkit-error-codes";
@@ POST
             const { organizationId } = ctx.organization;
             const email = normalizeInvitationEmail(parsed.value.email);
 
-            if (await isMemberOfOrganization(email, organizationId)) {
+            let alreadyMember: boolean;
+            try {
+                alreadyMember = await isMemberOfOrganization(email, organizationId);
+            } catch (error) {
+                logEvent("organization", "invitation-member-check-failed", {
+                    requestId: requestIdFrom(req),
+                    reason: adminAuthErrorReason(error),
+                });
+                return Response.json(
+                    { error: { code: "ORGANIZATION_INVITATION_FAILED" } },
+                    { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
+                );
+            }
+
+            if (alreadyMember) {
                 return Response.json(
                     { error: { code: "ORGANIZATION_INVITATION_ALREADY_MEMBER" } },
```

### 10.4 i18n: `packages/internationalization/translations/packages/shared/utils.ts`

Inserir `USERS_DELETE_ORGANIZATION_HAS_MEMBERS` logo depois de `USERS_DELETE_AUTH_FAILED` e
`ORGANIZATION_INVITATION_FAILED` depois de `ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS`, nos três blocos.

| código | pt-br | en | es |
|--------|-------|----|----|
| `USERS_DELETE_ORGANIZATION_HAS_MEMBERS` | Este usuário é dono de uma equipe que ainda tem membros, então ele não foi arquivado. Os membros precisam sair ou ser removidos antes. | This user owns a team that still has members, so they were not archived. The members must leave or be removed first. | Este usuario es dueño de un equipo que todavía tiene miembros, así que no se archivó. Los miembros deben salir o ser quitados antes. |
| `ORGANIZATION_INVITATION_FAILED` | Não foi possível enviar o convite agora. Tente de novo em instantes. | We couldn't send the invitation right now. Try again in a moment. | No pudimos enviar la invitación ahora. Inténtalo de nuevo en unos instantes. |

"Equipe"/"team"/"equipo" segue a cópia que já existe (`ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS`,
`ORGANIZATION_FORBIDDEN`). Usar a skill `/i18n-sync`.

### 10.5 Documentação

Medir cada âncora com `grep -n` depois do código pronto; os números abaixo são os de hoje.

- `docs/SECURITY.md:162`: trocar "As três de convite valem para qualquer método" por algo como "Em
  `/organization/invitations` só o `POST` conta, porque a tabela de convites do dono lê o mesmo caminho a cada convite
  e revogação; a prévia e o aceite contam qualquer método". A contagem de 17 caminhos não muda. Atualizar
  `apps/api/proxy.ts:60-78` se a lista se deslocar.
- `docs/SECURITY.md:39`: acrescentar, sob `requireAdminApi`, que o `DELETE /users/:id` recusa com `409
  USERS_DELETE_ORGANIZATION_HAS_MEMBERS` o dono de organização com outros membros, como a exclusão pelo titular, e que
  o bloqueio (`PUT` com `disabled: true`) não tem essa recusa. Remedir `:45-47`, `:133-135`, `:186-188` (o `import`
  novo desloca tudo em uma linha).
- `docs/SECURITY.md:174`: `apps/api/proxy.ts:90` (o `logEvent` do bloqueio) se desloca.
- `docs/INCIDENT-RESPONSE.md:52`: uma frase na linha "O admin arquiva uma conta": dono com membros recebe `409
  USERS_DELETE_ORGANIZATION_HAS_MEMBERS`; para conter, use o bloqueio da linha anterior. Remedir `:174`, `:208`,
  `:220` nessa linha e `:112`, `:146-151`, `:153-155` na `:51`.
- `docs/INCIDENT-RESPONSE.md:66`, `docs/ROPA.md:69`, `:151`, `docs/SUBPROCESSORS.md:37`: `apps/api/proxy.ts:84-96`
  (`logBlocked`) se desloca.
- `docs/BACKUP.md:96`: `users/[id]/route.ts:220` (o soft delete) se desloca.
- `docs/PRE-PRODUCTION.md` §16 (`:724-726`): continua verdadeiro ("sem `ARCJET_KEY` ficam sem limite") e não muda.

`specs/` não é editado aqui: as âncoras de `specs/BACKLOG.md` e `specs/observability-logging.md` (incluindo a contagem
de `logEvent(`, que sobe de 48 para 49) são do `/spec --sync`.

### 10.6 Exemplos

```http
DELETE /users/p2
→ 409 { "error": { "code": "USERS_DELETE_ORGANIZATION_HAS_MEMBERS" } }

POST /organization/invitations   { "email": "pessoa@example.com", "locale": "pt-br" }
(getUserByEmail rejeita com auth/internal-error)
→ 503 { "error": { "code": "ORGANIZATION_INVITATION_FAILED" } }
log: [organization] invitation-member-check-failed requestId=<uuid> reason=auth/internal-error

GET /organization/invitations    (cota do IP estourada, ARCJET_KEY válida)
→ segue para a rota (200 com a lista)

POST /organization/invitations   (cota do IP estourada, ARCJET_KEY válida)
→ 429 { "error": { "code": "AUTH_RATE_LIMITED" } } + Retry-After
```

### 10.7 Ordem de implementação e de commit

Sem SDK. Ordem: API → i18n → docs.

1. `users/[id]/route.ts` + os três arquivos de teste do `DELETE` (§7.1, §7.2).
2. `proxy.ts` + `proxyArcjetKey.test.ts`.
3. `organization/invitations/route.ts` + `organizationInvitationsRoute.test.ts`.
4. `apiErrors` nos 3 idiomas.
5. Documentação (§10.5), com as âncoras medidas no código final.

Plano de commits sugerido ao `/review` (inglês, um assunto por commit):

1. `fix(api): refuse archiving an organization owner who still has members`
2. `fix(api): rate limit only the POST of organization invitations`
3. `fix(api): answer a translatable code when the invitee check fails`
4. `feat(internationalization): add organization guardrail error messages`
5. `docs: describe the owner archive refusal and the invitation rate limit`
6. `docs(features): organization-guardrails`

O índice tem um `git mv` da auditoria (`specs/teams-organizations.md` → `docs/features/teams-organizations/spec.md`)
e há arquivos modificados pela auditoria (`specs/*`, `docs/PRE-PRODUCTION.md`, `docs/SECURITY.md`) que não pertencem a
esta tarefa. Atenção: `docs/SECURITY.md` já tem mudança da auditoria no working tree; o `/review` precisa separar o que
é da auditoria do que é desta tarefa (`git add -p` ou commit da auditoria antes).

### 10.8 Env e configuração

Nenhuma variável nova, nenhuma mudança de `next.config`, rules ou índices.

## Pré-requisitos manuais de infra

**Nenhum.** O `429` real depende de `ARCJET_KEY`, que já é a pendência 24 do backlog e o item 8 do
`docs/PRE-PRODUCTION.md`; esta tarefa não acrescenta nada a ela.

## 11. Perguntas em aberto (decididas pela rodada autônoma)

1. **Reaproveitar `ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS` no D10?** Opções: reaproveitar o código do titular, ou
   código novo. **Adotada:** código novo, `USERS_DELETE_ORGANIZATION_HAS_MEMBERS`. Porquê: a cópia existente fala com o
   dono ("A sua equipe ainda tem membros. Remova-os antes de excluir a conta."), e no admin quem lê é outra pessoa,
   que não exclui conta, arquiva. A lógica (`ownsOrganizationWithMembers`) é reaproveitada.
2. **Status e código do item 3?** Opções: `500 ACCOUNT_UPDATE_FAILED` (o padrão citado de `account/email`), `500` com
   código novo, ou `503` com código novo. **Adotada:** `503 ORGANIZATION_INVITATION_FAILED`. Porquê: o código de conta
   não descreve um convite, e `503` é o que o repo já usa para falha do Auth numa ação de admin
   (`USERS_DELETE_AUTH_FAILED`) e para dependência ausente na própria rota (`EMAIL_NOT_CONFIGURED`).
3. **`catch` na rota ou helper com três estados?** **Adotada:** `catch` na rota, helper intacto. É o padrão apontado
   pela recomendação e a mudança menor.
4. **Recusar também o bloqueio e a promoção a admin do dono?** **Adotada:** não. Bloquear é a ferramenta de contenção
   de incidente e é reversível; a promoção fica como achado novo (§12, D7). Se você quiser fechar a promoção também, é
   uma linha a mais no `PUT` com o mesmo helper e o mesmo código.
5. **Com a flag de membros desligada e membros sobrando, o arquivamento fica recusado sem que ninguém consiga remover
   os membros pelo produto.** **Adotada:** aceitar. É o mesmo comportamento da exclusão pelo titular, e o
   `PRE-PRODUCTION.md` §16 já manda remover os membros antes de desligar. Alternativa descartada: ignorar a regra com a
   flag desligada, o que reabriria o D10 para quem desligou depois de ter equipe.

## 12. Decisões tomadas sem perguntar

| id | decisão | alternativa descartada | porquê |
|----|---------|------------------------|--------|
| D1 | D10 opção (b): recusar | (a) aceitar com nota no `PRE-PRODUCTION.md`; (c) organização dormente | recomendação do backlog (`specs/BACKLOG.md:361`), que reviu a recomendação (a) do `review.md:169-171` |
| D2 | D11 opção (b): só o `POST` conta | (a) manter qualquer método | `review.md:166-168` e `specs/BACKLOG.md:362` |
| D3 | mapa de exceções por método, lista intacta | trocar a lista por objetos `{ path, methods }` | não reescreve os 17 itens nem desloca a lista; uma entrada |
| D4 | recusa do D10 depois do autoarquivamento | antes | o autoarquivamento é recusa mais específica e sem leitura |
| D5 | testes do D10 no `usersAdminArchiveAccess.test.ts` | arquivo novo | o arquivo já espiona Auth, Stripe e soft delete, que é o que o caso "nada foi tocado" precisa |
| D6 | sem teste de emulador | caso em `*.emulator.test.ts` | o helper já tem teste; a consulta é de um campo; a infra não é o objeto (§7) |
| D7 | promoção do dono a admin fica como achado no handoff | corrigir junto | fora da recomendação; mudança mínima (`cycle-policy` §3) |
| D8 | slug `organization-guardrails` | outro | nome dado pela recomendação |

## 13. Riscos e hipóteses a medir

- **R1. Import do módulo de organização nos testes do `DELETE`.** Se faltar o `vi.mock` em algum arquivo que importa a
  rota, ele quebra no import (§7.2). O `/develop` roda a suíte inteira da `api`, não só os arquivos novos.
- **R2. `HEAD` no proxy.** Se o Next tratar `HEAD /organization/invitations`, ele não conta, porque não está no mapa.
  Não é risco de custo (só lê), mas o `/test` pode confirmar com um `curl -I` se subir a API.
- **R3. Âncoras de documento.** O `import` novo e o mapa no proxy deslocam linhas citadas em cinco documentos (§10.5).
  O `/review` confere com `grep -n`.
- **R4. `docs/SECURITY.md` já modificado pela auditoria.** Misturar as duas mudanças num commit cruza assuntos; o
  `/review` decide a separação antes do primeiro commit.
