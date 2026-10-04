# Plano: o admin não consegue se trancar fora do painel

Tarefa direta, sem spec. Origem: a recomendação #1 da auditoria em `specs/BACKLOG.md` (`:248-284`), o achado
🟢 "O admin pode desativar, arquivar ou rebaixar a própria conta" (`:860`) e a decisão D9 (`:365`), que manda
cobrir as três operações. Plano feito em rodada autônoma do `/cycle`: as decisões tomadas sem perguntar estão
na §12, cada uma com a alternativa descartada, e a §11 traz as perguntas já com a opção adotada.

Todas as referências `arquivo:linha` foram conferidas neste checkout em 2026-10-04.

## 0. Sumário do desenho

- A API recusa com `403 USERS_SELF_LOCKOUT_FORBIDDEN` as três operações em que o admin age sobre a própria
  conta e perde o painel: `PUT /users/:id` com `disabled: true`, `PUT /users/:id` com um `type` diferente de
  `ADMIN`, e `DELETE /users/:id`. A recusa acontece antes de qualquer escrita, inclusive antes do cancelamento
  de assinatura do `DELETE`.
- "Própria conta" é o perfil cujo `reference_id` é o uid de quem chama (`ctx.user.uid`), e não o perfil cujo
  `id` é `ctx.actorProfile.id` (§12, D2).
- O `PUT` idempotente para si mesmo passa: `disabled: false`, `type: ADMIN` e edição só de nome. O formulário
  de edição sempre manda `type` (`useUserCrud.tsx:56-63`), então recusar qualquer `type` quebraria a troca do
  próprio nome.
- A listagem desabilita o switch de status e tira "Arquivar" do menu na linha do próprio admin. O formulário de
  edição desabilita o select de tipo quando o usuário editado é o próprio admin, com uma linha de explicação.
- Um código novo em `apiErrors` e duas chaves de UI, nos 3 idiomas. Sem SDK, sem Firestore, sem variável de
  ambiente, sem infra.

## 1. Contexto

### 1.1 Problema

Nada no `PUT` nem no `DELETE` compara o alvo com quem chama:

- `PUT` (`apps/api/app/(routes)/users/[id]/route.ts:87-143`) busca o perfil pelo `id` (`:89`), valida o corpo
  (`:98-106`), grava o `type` no Firestore (`:108-110`), manda `displayName`/`disabled` ao Firebase Auth
  (`:113-122`) e, com `disabled: true`, revoga as sessões (`:124-126`).
- `DELETE` (`:145-188`) busca o perfil (`:148`), cancela a assinatura viva (`:161-171`) e marca `deletedAt`
  (`:173`).

O efeito de cada operação sobre o próprio admin, lido no código:

| Operação sobre si | O que acontece | Evidência |
|-------------------|----------------|-----------|
| `disabled: true` | O Firebase Auth desativa a conta e as sessões são revogadas na mesma requisição. O bearer cai em `getCurrentUser` na requisição seguinte e o cookie cai na conferência de revogação. | `route.ts:117-126`, `docs/INCIDENT-RESPONSE.md:51` (medido em 2026-09-30 com conta comum) |
| `type: COMMON` | O guard seguinte exige `profile.type === ADMIN` e responde `403 ADMIN_FORBIDDEN`. | `apps/api/app/(guards)/admin.ts:45-54` |
| `DELETE` | O perfil some de `findByReferenceId`, que filtra `deletedAt == null`, e o guard responde `403 ADMIN_FORBIDDEN`. No login seguinte, `getMergedUserByUid` não acha perfil e cria um novo com `type: COMMON`. O admin vira usuário comum. | `user.repository.ts:45-50`, `admin.ts:47`, `user-merge.ts:20-24`, `:48-56`, `auth/sign-in/route.ts:9`, `auth/me/route.ts:15` |

O efeito do arquivamento foi lido, não medido; o achado do BACKLOG dizia que não tinha sido medido (`:860`).
A leitura mostra que ele é o pior dos três, porque o perfil novo é comum e a volta exige mexer no Firestore.

Num fork com um admin só, nenhum dos três tem volta pelo painel: a saída é o console do Firebase. A PR #35
tornou o corte da desativação imediato.

### 1.2 Objetivo e corte

- A API recusa as três operações sobre a própria conta, com `error.code` traduzido nos 3 idiomas.
- A listagem e o formulário deixam de oferecer esses controles na linha do próprio admin.
- Edições inofensivas sobre si mesmo continuam funcionando (nome, `type: ADMIN`, `disabled: false`).

Uma consequência que sai de graça: como nenhum admin consegue se remover, o painel nunca zera os admins ativos.
Quem rebaixa, desativa ou arquiva outro admin continua admin, e o último que sobrar é sempre o próprio ator.
Isso só vale pelo painel; o console do Firebase e o Firestore direto continuam fora do alcance da API.

Fora do corte:

- Regra de "último admin" ou de hierarquia entre admins. Um admin continua podendo rebaixar, desativar ou
  arquivar outro admin; não há perda de acesso ao painel nesse caso, porque o ator segue admin.
- Recuperação de quem já se trancou. A saída continua sendo o console do Firebase ou o seed do emulador.
- Auditar a tentativa recusada (§12, D6).
- Atualizar `specs/BACKLOG.md`. Fechar o achado é do `/spec --sync` (§12, D8).
- `POST /users` (criação) não tem alvo pré-existente e não entra.

### 1.3 Apps impactados

| Área | Impacto |
|------|---------|
| `apps/api` | `PUT` e `DELETE` de `users/[id]/route.ts` |
| `apps/app` | `UsersListClient.tsx`, `UserFormFields.tsx`, `edit/[id]/page.tsx` |
| `packages/internationalization` | 1 código em `apiErrors` + 2 chaves em `admin/users.ts`, nos 3 idiomas |
| `packages/sdk` | nenhum |
| `apps/web` | nenhum |
| docs | `docs/SECURITY.md:29` (uma linha), âncoras deslocadas em 4 documentos (§13.6) |

Área do painel: só admin (`(admin)/admin`). Modo de produto (`subscription` × `simple`): indiferente, porque o
painel admin existe nos dois. Assinatura: o `DELETE` sobre si é recusado antes de `cancelLiveSubscription`
(`route.ts:161`), então a assinatura do próprio admin, se houver, não é tocada.

### 1.4 Fontes

Sem links externos. As fontes são o BACKLOG (`:248-284`, `:365`, `:860`) e o plano da tarefa anterior, que
registrou o achado como D7 (`docs/features/disabled-account-revocation/analyze/plan.md:308`).

## 2. Dados (Firestore)

N/A. Nenhum campo, índice ou regra muda. A comparação usa `reference_id`, que todo perfil tem
(`packages/sdk/src/types/user/user.ts:47`).

## 3. Contrato `@repo/sdk`

N/A. Corpo e resposta do `PUT` e do `DELETE` não mudam; só aparece uma resposta de erro nova. O
`AdminUpdateUserRequest` (`packages/sdk/src/types/user/user.ts:75-80`) fica como está.

## 4. API

### 4.1 Guard e quem é o ator

O guard continua `requireAdminApi`. Ele resolve o uid pelo token (`admin.ts:34`, `resolveApiActor`) e o perfil
do ator por esse uid (`admin.ts:45`). Esse uid é sempre o do admin real:

- O admin guard não tem `subjectProfile`; o contexto expõe `user`, `authRequest` e `actorProfile`
  (`admin.ts:13-18`).
- Sob impersonação, toda escrita é recusada antes do handler com `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`
  (`admin.ts:65-71`, `impersonation-read-only.ts:19-30`). O `PUT` e o `DELETE` nunca rodam personificando.

Então "o ator" é `ctx.user.uid`, sem ambiguidade (§11, P2).

### 4.2 Predicado

Dois helpers privados no próprio `route.ts`, no molde de `changedFieldsOf` (`:32-36`):

- `isOwnAccount(profile, ctx)`: `profile.reference_id === ctx.user.uid`.
- `locksOutOfPanel(patch)`: `patch.disabled === true || (patch.type !== undefined && patch.type !== UserType.ADMIN)`.

Por que `reference_id` e não `profile.id === ctx.actorProfile.id`: `disabled` e as sessões vivem na conta do
Firebase Auth, e o `PUT` aplica a mudança em `profile.reference_id` (`route.ts:121`, `:125`). Se houver dois
perfis vivos com o mesmo uid, `findByReferenceId` devolve o primeiro (`user.repository.ts:52-59`), e desativar
pelo segundo trancaria o admin do mesmo jeito. Comparar o uid cobre esse caso; comparar o `id` não cobre.

Por que `type !== UserType.ADMIN` e não "qualquer `type`": o formulário de edição manda `type` em toda gravação
(`useUserCrud.tsx:56-63`), inclusive quando o admin só troca o próprio nome. `type: ADMIN` sobre si é
idempotente e passa.

### 4.3 Ordem no `PUT`

Depois da validação e antes de qualquer escrita:

1. `findById` → `404 USERS_NOT_FOUND` (inalterado, `:89-96`)
2. `parseRequestJson` → `400` (inalterado, `:98-101`)
3. `parseAdminUpdateUserInput` → `400 VALIDATION_FAILED` / `400 USERS_NOTHING_TO_UPDATE` (inalterado, `:103-106`)
4. **novo:** `isOwnAccount && locksOutOfPanel` → `403 USERS_SELF_LOCKOUT_FORBIDDEN`
5. `userRepository.update` do `type` (`:108-110`) e o resto como hoje.

A recusa é do pedido inteiro. `{ "displayName": "Ana", "disabled": true }` sobre si não grava o nome; a
alternativa de aplicar o que é seguro e recusar o resto deixaria uma resposta de erro com escrita parcial.

### 4.4 Ordem no `DELETE`

1. `findById` → `404` (inalterado, `:148-155`)
2. **novo:** `isOwnAccount` → `403 USERS_SELF_LOCKOUT_FORBIDDEN`
3. `resolveUserAuditLabel`, `cancelLiveSubscription`, `delete`, auditoria (inalterados).

A recusa vem antes de `resolveUserAuditLabel` (`:159`, uma ida ao Firebase Auth) e antes de
`cancelLiveSubscription` (`:161`). Recusar depois do cancelamento cancelaria a assinatura do admin sem arquivar
nada.

### 4.5 Erros

| Situação | Status | `error.code` |
|----------|--------|--------------|
| `PUT` sobre si com `disabled: true` | 403 | `USERS_SELF_LOCKOUT_FORBIDDEN` |
| `PUT` sobre si com `type` diferente de `ADMIN` | 403 | `USERS_SELF_LOCKOUT_FORBIDDEN` |
| `PUT` sobre si misturando um dos dois acima com outro campo | 403 | `USERS_SELF_LOCKOUT_FORBIDDEN` (nada gravado) |
| `DELETE` sobre si | 403 | `USERS_SELF_LOCKOUT_FORBIDDEN` |
| `PUT` sobre si com `disabled: false`, `type: ADMIN` ou só `displayName` | 200 | corpo inalterado |
| `PUT`/`DELETE` sobre outro admin | 200 / 204 | inalterado |
| Perfil inexistente | 404 | `USERS_NOT_FOUND` (vem antes da recusa) |
| Corpo vazio ou inválido sobre si | 400 | `USERS_NOTHING_TO_UPDATE` / `VALIDATION_FAILED` (vem antes da recusa) |

O SDK só trata `401` de forma especial (`packages/sdk/src/client/base.ts:85`), então o `403` chega ao
`onError` da mutation e vira toast pelo `apiErrors`, sem deslogar ninguém.

Código novo exige entrada em `apiErrors` nos 3 idiomas
(`packages/internationalization/translations/packages/shared/utils.ts`, ao lado de
`USERS_DELETE_BILLING_FAILED` em `:31`, `:150`, `:268`).

## 5. Front-end

### 5.1 Como a UI sabe quem é o admin logado

`useAuth()` de `@repo/auth/provider` devolve o `User` do Firebase client, com `uid`
(`packages/auth/provider.tsx:35`, `packages/auth/types.ts:41`). É o que a home do admin já usa, porque
`GET /account` fica atrás do guard do painel comum e responde 403 ao admin
(`(admin)/admin/(pages)/(components)/AdminHomeClient.tsx:19-21`). A linha da listagem e o usuário editado são
`UserWithAuthDTO`, com `uid` (`packages/sdk/src/types/user/user.ts:92-93`).

Comparação: `record.uid === signedInUser?.uid`. Enquanto `useAuth` ainda não resolveu, `signedInUser` é `null`
e os controles aparecem como para qualquer outra linha. A API recusa de qualquer jeito (§11, P4).

Sob impersonação, a página da listagem não faz prefetch e a listagem vem restrita a usuários comuns
(`(pages)/(home)/page.tsx:14-17`), então a linha do próprio admin nem aparece. E a API recusa escrita ali.
Nada a tratar na UI.

### 5.2 Listagem (`users/(pages)/(home)/UsersListClient.tsx`)

- Switch de status (`:104-127`): na linha do próprio admin, `disabled` e `title` com a nova chave
  `list.selfStatusLocked`. O `title` explicativo segue o precedente do mesmo arquivo (`:52`, último acesso
  aproximado). O switch continua mostrando "ativo", porque a conta está ativa.
- Menu de ações (`:141-152`): na linha do próprio admin, `onDelete` fica `undefined`. O `ActionsMenu` só
  monta o item de exclusão quando recebe `onDelete` (`packages/design-system/components/ui/action-menu.tsx:75-100`),
  então "Arquivar" some e "Editar" fica.

### 5.3 Formulário (`users/(components)/UserFormFields.tsx` + `users/(pages)/edit/[id]/page.tsx`)

- `UserFormFields` ganha a prop `lockType?: boolean`. Com ela, o `HookFormSelect` de tipo (`:65-72`) recebe
  `disabled` e aparece embaixo um parágrafo `text-muted-foreground text-sm` com a nova chave
  `form.typeSelfLocked`. O `HookFormSelect` não tem prop de descrição (`hookformSelect.tsx:20-35`), daí o
  parágrafo.
- `EditUserPage` calcula `isOwnAccount = user.uid === signedInUser?.uid` e passa `lockType={isOwnAccount}`.
  Renomeie o retorno de `useAuth` (`signedInUser`), porque `user` já é o dado de `useFindUserById` (`:32`).
- O valor do campo continua indo no submit: o `disabled` do `HookFormSelect` vai para o componente visual
  (`hookformSelect.tsx:87`), não para o registro do RHF. O `PUT` sai com `type: ADMIN`, que passa (§4.2).
- `CreateUserPage` não muda (`mode="create"`, sem `lockType`).

### 5.4 Estados

| Estado | Como aparece |
|--------|--------------|
| Linha do próprio admin | switch desabilitado com `title`, menu só com "Editar" |
| Linha de outro admin ou de comum | igual a hoje |
| Edição do próprio perfil | select de tipo desabilitado + linha de explicação; nome editável; salvar funciona |
| Recusa da API (aba antiga, corrida) | toast com o texto de `USERS_SELF_LOCKOUT_FORBIDDEN`; o switch volta pelo rollback do `onError` (`useUserCrud.tsx:114-128`) |

## 6. i18n

`packages/internationalization/translations/packages/shared/utils.ts` (`apiErrors`):

| chave | pt-br | en | es |
|-------|-------|----|----|
| `USERS_SELF_LOCKOUT_FORBIDDEN` | Você não pode desativar, arquivar nem tirar o acesso de administrador da sua própria conta. | You can't disable, archive or remove admin access from your own account. | No puedes desactivar, archivar ni quitar el acceso de administrador de tu propia cuenta. |

`packages/internationalization/translations/apps/app/pages/admin/users.ts`:

| chave | pt-br | en | es |
|-------|-------|----|----|
| `list.selfStatusLocked` | Você não pode desativar a sua própria conta. | You can't disable your own account. | No puedes desactivar tu propia cuenta. |
| `form.typeSelfLocked` | Você não pode tirar o seu próprio acesso de administrador. | You can't remove your own admin access. | No puedes quitar tu propio acceso de administrador. |

Use a skill `/i18n-sync`. O teste de paridade (`packages/internationalization/__tests__/parity.test.ts`) cobre a
presença nos 3 idiomas.

## 7. Autorização e segurança

- A regra entra no handler da rota, que é a única porta das três operações. A UI só esconde; a API recusa.
- Impersonação: o ator é o admin real (§4.1). O guard já recusa escrita personificando, antes do handler.
- Nenhum outro caminho deixa o admin se trancar pela API: a exclusão de conta do titular fica em `/account`,
  atrás de `requireCommonPanelApi`, que responde 403 ao admin
  (`AdminHomeClient.tsx:19-21`); personificando, é somente leitura.
- Nenhum dado sensível novo em resposta ou log. A recusa não loga nem audita (§12, D6).
- `docs/SECURITY.md:29` ganha uma linha abaixo de `requireAdminApi` dizendo que `PUT` e `DELETE /users/:id`
  recusam com `403 USERS_SELF_LOCKOUT_FORBIDDEN` desativar, rebaixar ou arquivar a própria conta.

## 8. Testes

| Arquivo | Nível | O que prova |
|---------|-------|-------------|
| `apps/api/__tests__/usersAdminAuditTrail.test.ts` (novo `describe`) | rota, com `resolveApiActor`, repositório, `@repo/auth/server` e auditoria mockados como já estão (`:39-64`) | os casos da tabela abaixo |
| `apps/app/__tests__/usersListArchiveLabels.test.tsx` (novo `describe` + mock de `useAuth`) | componente, com `Table` e `ActionsMenu` mockados como já estão (`:36-74`) | linha própria: switch desabilitado com o `title` traduzido e `ActionsMenu` sem `onDelete`; outra linha: switch habilitado e `onDelete` presente; com `useAuth` sem usuário, nenhuma linha é tratada como própria |
| `apps/app/__tests__/userFormFieldsTypeLock.test.tsx` (novo) | componente, `UserFormFields` dentro de um `Form` do RHF | com `lockType`, o select de tipo está desabilitado e o texto de `form.typeSelfLocked` aparece; sem `lockType`, habilitado e sem o texto |

Casos da rota (perfil alvo com `reference_id === ADMIN_UID`, que o arquivo já define em `:79-88`):

1. `PUT { disabled: true }` sobre si → 403 com o código; `updateUser`, `update`, `revokeUserSessions` e
   `recordAuditEvent` não chamados.
2. `PUT { type: COMMON }` sobre si → 403; `update` não chamado.
3. `PUT { displayName, disabled: true }` sobre si → 403; nada gravado.
4. `PUT { type: ADMIN, displayName }` sobre si → 200 (o caso do formulário).
5. `PUT { disabled: false }` sobre si → 200; `PUT { displayName }` sobre si → 200.
6. `DELETE` sobre si → 403; `delete`, `resolveUserAuditLabel` e `recordAuditEvent` não chamados.
7. Perfil com outro `id` mas o mesmo `reference_id` do ator → 403 no `PUT` com `disabled: true` e no `DELETE`
   (prova que a comparação é pelo uid).
8. Outro admin (uid diferente, `type: ADMIN`) → `PUT { disabled: true }` 200 e `DELETE` 204 (prova que o
   predicado não é "alvo é admin").
9. Sobre si, corpo vazio → `400 USERS_NOTHING_TO_UPDATE`; perfil inexistente → 404 (a ordem da §4.3 se mantém).

O cancelamento de assinatura no `DELETE` sobre si não precisa de caso próprio aqui: `usersAdminDeleteBilling.test.ts`
já cobre o cancelamento, e o caso 6 prova que o handler sai antes de `:159`. Se o `desenvolvedor` quiser a prova
direta, um caso nesse arquivo com assinatura viva e alvo próprio confere que `cancelSubscriptionForErasure`
não roda.

Ajuste nos testes existentes: `UsersListClient` passa a importar `@repo/auth/provider`. Os dois arquivos que
renderizam a listagem (`usersListArchiveLabels.test.tsx`, `usersListLastAccess.test.tsx`) precisam do
`vi.mock("@repo/auth/provider", () => ({ default: () => authMock() }))` no molde de
`apps/app/__tests__/adminHomeClient.test.tsx:15`, com `authMock` devolvendo `{ user: null }` por padrão. Os
casos atuais seguem iguais.

Prova de mutação para o `/test`: remover a checagem no `PUT` derruba 1-3; no `DELETE`, derruba 6; trocar a
comparação para `profile.id === ctx.actorProfile.id` derruba 7; trocar `type !== ADMIN` por
`type !== undefined` derruba 4.

Nenhum teste de emulador: o objeto é uma comparação no handler, e o mock prova isso.

## 9. O que o `/test` vai percorrer

Há UI no diff, então há uma passada de `agent-browser`, no emulador com o seed (`pnpm seed`, que cria o primeiro
admin; `docs/features/firebase-emulator-seed/`). Precisa de um admin logado e de pelo menos um outro usuário
na listagem, que o seed já cria.

1. `/admin/users`: na linha do admin logado, switch desabilitado e `title` com o texto novo; o menu da linha
   só tem "Editar". Na linha de outro usuário, switch habilitado e "Arquivar" presente.
2. Editar o próprio perfil: select de tipo desabilitado, linha de explicação visível; trocar o nome e salvar
   dá o toast de sucesso, e o tipo segue "Administrador" na listagem.
3. Editar outro usuário: select habilitado, sem a linha de explicação.
4. Recusa da API: com o bearer do admin logado, `PUT /users/<próprio id>` com `{"disabled":true}` e
   `DELETE /users/<próprio id>` → `403 {"error":{"code":"USERS_SELF_LOCKOUT_FORBIDDEN"}}`, e o admin continua
   entrando no painel depois. O toast dessa recusa não é alcançável pela UI (os controles somem); o texto é
   coberto pelo teste de paridade.
5. Combinações: light, dark e mobile nos passos 1 e 2; os 3 idiomas nos textos novos (`title`, linha de
   explicação).

Nada fica 🔒 por infra externa.

## 10. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **O admin não consegue desativar a própria conta pela API**
  `PUT /users/:id` com `disabled: true`, quando o perfil alvo tem o mesmo uid do admin que chama, responde
  `403 { error: { code: "USERS_SELF_LOCKOUT_FORBIDDEN" } }`. Nada é gravado: o Firebase Auth não recebe
  `updateUser`, as sessões não são revogadas e nenhum evento de auditoria é registrado. Depois da recusa o admin
  segue com acesso ao painel na requisição seguinte.

- [ ] **O admin não consegue rebaixar o próprio tipo**
  `PUT /users/:id` sobre a própria conta com `type: "COMMON"` responde 403 com o mesmo código, e o documento
  `user` não muda. Se o corpo misturar o rebaixamento ou a desativação com `displayName`, o pedido inteiro é
  recusado e o nome também não muda.

- [ ] **O admin não consegue arquivar a própria conta**
  `DELETE /users/:id` sobre a própria conta responde 403 com o mesmo código. O perfil não recebe `deletedAt`, a
  assinatura do admin, se existir, não é cancelada, e nada vai para a trilha de auditoria. Sem essa recusa, o
  login seguinte criaria um perfil comum novo para o mesmo uid.

- [ ] **Edições inofensivas sobre si continuam funcionando**
  `PUT` sobre a própria conta com `type: "ADMIN"` e `displayName`, só com `displayName`, ou com
  `disabled: false` responde 200 com o usuário mesclado, como antes. O formulário de edição manda `type` em
  toda gravação, então trocar o próprio nome pela tela funciona e o tipo segue administrador.

- [ ] **A regra vale para a conta, não para o documento**
  Um perfil com `id` diferente do perfil do ator, mas com o mesmo `reference_id` (uid), é tratado como a
  própria conta: desativar e arquivar por ele também são recusados com 403.

- [ ] **Agir sobre outro admin continua permitido**
  Desativar, rebaixar ou arquivar outro admin (uid diferente) segue respondendo 200 ou 204, como hoje. O
  painel não ganha regra de último admin; quem age continua admin.

- [ ] **A ordem das respostas de erro se mantém**
  Perfil inexistente responde `404 USERS_NOT_FOUND` antes de qualquer checagem sobre si. Corpo vazio sobre a
  própria conta responde `400 USERS_NOTHING_TO_UPDATE` e corpo inválido `400 VALIDATION_FAILED`, não 403.
  Personificando, o guard já responde `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY` antes do handler.

- [ ] **A listagem não oferece os controles na linha do próprio admin**
  Em `/admin/users`, a linha do admin logado mostra o switch de status desabilitado, com a explicação no
  `title` ("Você não pode desativar a sua própria conta.", "You can't disable your own account.", "No puedes
  desactivar tu propia cuenta."), e o menu de ações só com "Editar". As demais linhas, inclusive de outros
  admins, ficam como hoje. Enquanto o usuário logado ainda não foi resolvido, nenhuma linha é tratada como
  própria e a API é a proteção.

- [ ] **O formulário não deixa o admin trocar o próprio tipo**
  Na edição do próprio perfil, o select de tipo aparece desabilitado com "Administrador" e uma linha de
  explicação nos 3 idiomas. O campo de nome segue editável e salvar dá o toast de sucesso. Na edição de outro
  usuário, o select fica habilitado e a linha não aparece. A criação de usuário não muda.

- [ ] **O erro tem texto nos 3 idiomas**
  `USERS_SELF_LOCKOUT_FORBIDDEN` existe em `apiErrors` em pt-br, en e es, e o teste de paridade passa. Se a
  recusa chegar à tela (aba antiga, corrida), o toast mostra o texto traduzido e o switch volta ao estado
  anterior pelo rollback da mutation otimista.

- [ ] **Tema e responsivo**
  O switch desabilitado e a linha de explicação do formulário ficam legíveis em light e dark, e no mobile o
  menu da linha própria continua abrindo só com "Editar".

## 11. Perguntas em aberto

Cada uma já vem com a opção adotada. Nada aqui bloqueia o `/develop`.

**P1. Cobrir só a desativação ou as três operações? (D9 do BACKLOG)**
Opções: (a) as três: desativar, rebaixar e arquivar; (b) só desativar, que é o que o achado original nomeava.
**Adotada: (a)**, pela recomendação do BACKLOG (`:365`). As três tiram o admin do painel, o predicado é o mesmo
e o código de erro é um só. A (b) foi descartada porque deixaria as outras duas como achado da próxima rodada,
e o arquivamento é o pior caso: o login seguinte recria o perfil como comum (`user-merge.ts:20-24`).

**P2. Sob impersonação, o "ator" é o admin real ou o personificado?**
**Adotada: o admin real (`ctx.user.uid`).** O admin guard não resolve sujeito (`admin.ts:13-18`) e recusa toda
escrita personificando antes do handler (`admin.ts:65-71`). Não há caso a decidir; registro para quem ler o
código depois.

**P3. `PUT` idempotente sobre si (`disabled: false`, `type: ADMIN`) deve passar?**
Opções: (a) passa; (b) recusar qualquer `disabled`/`type` sobre si.
**Adotada: (a).** O formulário de edição manda `type` em toda gravação (`useUserCrud.tsx:56-63`); com (b), o
admin não conseguiria trocar o próprio nome.

**P4. O que a UI mostra antes de saber quem está logado?**
Opções: (a) trata a linha como de qualquer outro usuário até `useAuth` resolver; (b) desabilita os controles de
todas as linhas enquanto carrega.
**Adotada: (a).** A janela é curta, a API recusa de qualquer jeito, e (b) faria todas as linhas piscarem
desabilitadas a cada carga.

**P5. Esconder ou desabilitar o switch da linha própria?**
Opções: (a) switch desabilitado com `title`; (b) trocar o switch por texto ("Ativo").
**Adotada: (a).** Mantém a coluna igual em todas as linhas e diz por que o controle não responde. A chave
`list.statusLabels.active` existe e serviria para (b), se você preferir.

## 12. Decisões tomadas sem perguntar

| # | Decisão | Alternativa descartada | Por quê |
|---|---------|------------------------|---------|
| D1 | Um código só, `USERS_SELF_LOCKOUT_FORBIDDEN`, para as três operações | Três códigos (`USERS_CANNOT_DISABLE_SELF`, `..._DEMOTE_SELF`, `..._ARCHIVE_SELF`) | O BACKLOG diz que o código pode ser um só (`:365`). A UI esconde os controles, então o texto só aparece em corrida ou chamada direta; três códigos seriam 9 traduções para um caso raro. Prefixo `USERS_` como os vizinhos; sufixo `_FORBIDDEN` como os outros 403 (`ADMIN_FORBIDDEN`, `ACCOUNT_EXPORT_IMPERSONATION_FORBIDDEN`) |
| D2 | Comparar `profile.reference_id` com `ctx.user.uid` | Comparar `id` com `ctx.actorProfile.id`, como o BACKLOG descreve | `disabled` e as sessões são da conta do Firebase Auth (`route.ts:121`, `:125`). Um segundo perfil vivo com o mesmo uid trancaria o admin pelo mesmo caminho, e só a comparação por uid o pega |
| D3 | Status 403 | 409 ou 422 | É uma regra sobre quem pode agir sobre quem, a mesma família de `ADMIN_FORBIDDEN`. O SDK só trata 401 de forma especial (`base.ts:85`), então o 403 não desloga |
| D4 | Rebaixar = `type` presente e diferente de `ADMIN` | Recusar qualquer `type` no corpo | O formulário sempre manda `type` (P3). Comparar com `ADMIN`, e não com o tipo atual do perfil, continua certo se um fork acrescentar tipos |
| D5 | Recusar o pedido inteiro quando uma parte tranca | Aplicar o que é seguro e recusar o resto | Resposta de erro com escrita parcial confunde quem chama e a trilha de auditoria |
| D6 | Não auditar nem logar a recusa | Gravar evento de tentativa | A trilha registra mudanças que aconteceram; nenhuma outra recusa da rota (404, 400) é auditada (`usersAdminAuditTrail.test.ts`, casos "records nothing") |
| D7 | Helpers privados no `route.ts` | Arquivo em `(shared)/lib/` | Só esta rota usa. Mesmo molde de `changedFieldsOf` (`:32-36`) |
| D8 | Não editar `specs/BACKLOG.md` | Fechar o achado no mesmo diff | Fechar achado é do `/spec --sync`, que audita o código. O `BACKLOG.md` já está modificado neste working tree pela auditoria |
| D9 | Testes da rota no `usersAdminAuditTrail.test.ts`; da listagem no `usersListArchiveLabels.test.tsx` | Arquivos novos | Os dois já têm o mock completo (~100 e ~80 linhas). Mesmo critério da D5 da tarefa anterior |
| D10 | Uma linha em `docs/SECURITY.md` | Não documentar | O BACKLOG prevê a linha (`:320-321`), e é onde quem cria rota admin lê sobre os guards |

## 13. Blueprint técnico

### 13.1 `apps/api/app/(routes)/users/[id]/route.ts`

```diff
 import {
     AuditAction,
     AuditTargetType,
     type UserDTO,
+    UserType,
 } from "@repo/sdk/src/types";
 ...
-import { requireAdminApi } from "@/app/(guards)/admin";
+import { type AdminAuthContext, requireAdminApi } from "@/app/(guards)/admin";
 ...
+function isOwnAccount(profile: UserDTO, ctx: AdminAuthContext): boolean {
+    return profile.reference_id === ctx.user.uid;
+}
+
+function locksOutOfPanel(patch: AdminUpdateUserInput): boolean {
+    return (
+        patch.disabled === true ||
+        (patch.type !== undefined && patch.type !== UserType.ADMIN)
+    );
+}
+
+function selfLockoutRefusal(): Response {
+    return Response.json(
+        { error: { code: "USERS_SELF_LOCKOUT_FORBIDDEN" } },
+        { status: HTTP_STATUS.FORBIDDEN }
+    );
+}

 export const PUT = requireAdminApi<RouteIdParamsContext>(async (req, ctx) => {
     ...
     const parsed = parseAdminUpdateUserInput(parsedBody.value);
     if (!parsed.ok) {
         return parsed.response;
     }
+
+    if (isOwnAccount(profile, ctx) && locksOutOfPanel(parsed.value)) {
+        return selfLockoutRefusal();
+    }

     if (parsed.value.type !== undefined) {
 ...
 export const DELETE = requireAdminApi<RouteIdParamsContext>(
     async (req, ctx) => {
         ...
         if (!profile) {
             return Response.json(/* USERS_NOT_FOUND */);
         }
+
+        if (isOwnAccount(profile, ctx)) {
+            return selfLockoutRefusal();
+        }

         const targetLabel = await resolveUserAuditLabel(profile.reference_id);
```

Os nomes dos helpers dizem o porquê; não precisa de comentário. Se o `desenvolvedor` achar que a comparação
por uid não é óbvia, cabe uma linha autocontida em `isOwnAccount`: a desativação e as sessões pertencem à conta
do Firebase Auth, e dois perfis podem apontar para ela. Sem citar tarefa nem plano.

Exemplo:

```json
// PUT /users/p1   (p1.reference_id === uid do admin logado)
{ "disabled": true }
// 403
{ "error": { "code": "USERS_SELF_LOCKOUT_FORBIDDEN" } }

// PUT /users/p1
{ "type": "ADMIN", "displayName": "Ana" }
// 200
{ "data": { "id": "p1", "type": "ADMIN", "displayName": "Ana", "...": "..." } }
```

### 13.2 `UsersListClient.tsx`

```diff
+import useAuth from "@repo/auth/provider";
 ...
 export function UsersListClient() {
     ...
+    const { user: signedInUser } = useAuth();
+    const isOwnRow = (record: UserWithAuthDTO) =>
+        Boolean(signedInUser) && record.uid === signedInUser?.uid;
 ...
                     <Switch
                         aria-label={...}
                         checked={!value}
                         disabled={
-                            toggleUserStatusMutation.isPending &&
-                            toggleUserStatusMutation.variables?.id === record.id
+                            isOwnRow(record) ||
+                            (toggleUserStatusMutation.isPending &&
+                                toggleUserStatusMutation.variables?.id === record.id)
                         }
+                        title={isOwnRow(record) ? adminUsersList.selfStatusLocked : undefined}
 ...
                 <ActionsMenu
                     deleteLabels={...}
-                    onDelete={() => deleteUserMutation.mutate(record.id)}
+                    onDelete={
+                        isOwnRow(record)
+                            ? undefined
+                            : () => deleteUserMutation.mutate(record.id)
+                    }
```

Se o `title` no `Switch` não chegar ao DOM (é um Radix `button`, deve chegar), envolva o switch num `span` com o
`title`.

### 13.3 `UserFormFields.tsx` e `edit/[id]/page.tsx`

```diff
 type UserFormFieldsProps = {
     mode: "create" | "update";
+    lockType?: boolean;
 };

-export function UserFormFields({ mode }: UserFormFieldsProps) {
+export function UserFormFields({ mode, lockType = false }: UserFormFieldsProps) {
 ...
                 <HookFormSelect
+                    disabled={lockType}
                     label={adminUsers.form.type}
                     ...
                 />
+                {lockType ? (
+                    <p className="mt-1 text-muted-foreground text-sm">
+                        {adminUsers.form.typeSelfLocked}
+                    </p>
+                ) : null}
```

```diff
+import useAuth from "@repo/auth/provider";
 ...
     const { data: user, isLoading, isError } = useFindUserById(id);
+    const { user: signedInUser } = useAuth();
+    const isOwnAccount = Boolean(user && signedInUser && user.uid === signedInUser.uid);
 ...
-                                    <UserFormFields mode="update" />
+                                    <UserFormFields lockType={isOwnAccount} mode="update" />
```

### 13.4 i18n

Chaves e textos na §6. Árvore:

```
apiErrors.USERS_SELF_LOCKOUT_FORBIDDEN           (pt-br, en, es)
apps.app.pages.admin.users.list.selfStatusLocked (pt-br, en, es)
apps.app.pages.admin.users.form.typeSelfLocked   (pt-br, en, es)
```

### 13.5 Testes (esqueleto)

```ts
// apps/api/__tests__/usersAdminAuditTrail.test.ts
describe("PUT/DELETE /users/[id] refuse to lock the admin out of their own account", () => {
    it("refuses to disable the caller's own account and writes nothing", ...);
    it("refuses to demote the caller's own type", ...);
    it("refuses the whole patch when one field would lock the caller out", ...);
    it("lets the caller save their own name with type ADMIN", ...);
    it("lets the caller send disabled: false or a name alone", ...);
    it("refuses to archive the caller's own account before touching billing", ...);
    it("matches the account by uid, not by profile id", ...);
    it("still lets an admin disable and archive another admin", ...);
    it("answers 404 and 400 before the self check", ...);
});

// apps/app/__tests__/usersListArchiveLabels.test.tsx
// vi.mock("@repo/auth/provider", () => ({ default: () => authMock() }))
describe("the signed-in admin's own row", () => {
    it("disables the status switch and explains why", ...);
    it("offers no archive action on the own row", ...);
    it("keeps both controls on other rows, other admins included", ...);
    it("treats no row as own while the signed-in user is unknown", ...);
});

// apps/app/__tests__/userFormFieldsTypeLock.test.tsx
describe("UserFormFields type lock", () => {
    it("disables the type select and shows the hint when locked", ...);
    it("leaves the select enabled with no hint by default", ...);
});
```

### 13.6 Documentos

- `docs/SECURITY.md:29`: sub-item abaixo de `requireAdminApi` com a recusa (D10).
- Âncoras de `users/[id]/route.ts` que o diff desloca: `docs/INCIDENT-RESPONSE.md:51` (`:87`, `:117-122`,
  `:124-126`), `docs/BACKUP.md:94` (`:173`), `specs/observability-logging.md:65` (`:163`) e
  `specs/account-security-mfa.md:301` (`:120-126`). Confira cada uma contra o arquivo final. O `BACKLOG.md`
  fica com o `/spec --sync` (D8).

### 13.7 Ordem de implementação e de commit

Sem SDK. Plano de commits sugerido ao `revisor-codigo`:

1. `fix(api): refuse admin actions that would lock the caller out`: `users/[id]/route.ts` +
   `apps/api/__tests__/usersAdminAuditTrail.test.ts`.
2. `fix(app): hide self-lockout controls on the admin's own user`: `UsersListClient.tsx`,
   `UserFormFields.tsx`, `edit/[id]/page.tsx` + `usersListArchiveLabels.test.tsx`,
   `usersListLastAccess.test.tsx`, `userFormFieldsTypeLock.test.tsx`.
3. `feat(internationalization): self-lockout error and admin users hints`: `shared/utils.ts` (`apiErrors`) +
   `apps/app/pages/admin/users.ts`.
4. `docs: admin self-lockout refusal and shifted route anchors`: `docs/SECURITY.md`,
   `docs/INCIDENT-RESPONSE.md`, `docs/BACKUP.md`.
5. `docs(specs): shifted users route anchors`: `specs/observability-logging.md`,
   `specs/account-security-mfa.md`.
6. `docs(features): admin-self-lockout-guard`: por último.

O commit 2 referencia chaves que só entram no 3; o typecheck intermediário do commit 2 falha sozinho. É a
ordem que `.claude/rules/git-commits.md` manda; se o `revisor-codigo` preferir commits que compilam sozinhos,
junte 2 e 3 ou inverta, e registre.

### 13.8 Env e infra

Nenhuma variável nova. **Pré-requisitos manuais de infra: nenhum.** Nada a registrar em
`docs/PRE-PRODUCTION.md`. O `/test` roda no emulador com o seed, sem conta externa.

Rollback: reverter os commits. Não há dado gravado pela mudança.
