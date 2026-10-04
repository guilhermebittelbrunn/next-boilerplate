# Revisão: o admin não consegue se trancar fora do painel

Revisão do diff do `/develop` em rodada autônoma do `/cycle`. Li o código, rodei os gates estáticos e corrigi
dois pontos. Não subi app, não usei browser e não rodei suíte de teste. Nada foi commitado.

## Branch

- Nome: `fix/admin-self-lockout-guard`, criada com `git switch -c` a partir de
  `guilhermebittelbrunn/full-pipeline-cycle`, no HEAD `e791d3a` (o mesmo de `origin/main`). O working tree
  veio junto e o índice estava vazio.
- Regex do padrão: `branch OK: fix/admin-self-lockout-guard`.
- Sem `project` no nome porque o diff toca `apps/api`, `apps/app` e `packages/internationalization`. Com
  vários apps, `git-commits.md` manda omitir o prefixo.
- A branch anterior não passava no regex. Ela não tinha upstream nem commit à frente de `origin/main`, então
  o procedimento permitia `git branch -m`. Preferi `git switch -c` porque o workspace é do Conductor, que
  rastreia a branch pelo nome. A anterior continua existindo no mesmo commit e pode ser apagada com
  `git branch -d guilhermebittelbrunn/full-pipeline-cycle`.

## Revisão

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `docs/SECURITY.md:30`: a linha nova dizia "Assim o painel nunca zera os admins ativos". A leitura não
  sustenta isso. Se dois admins desativam um ao outro em pedidos simultâneos, os dois passam pelo
  `requireAdminApi` antes de qualquer gravação e os dois ficam desativados. Reescrevi a frase: nenhum admin
  tira o próprio acesso pelo painel, mas isso não garante que sobre um admin ativo. O plano repete a mesma
  afirmação (`analyze/plan.md:58`); deixei como está, porque o plano registra a intenção daquele momento.

### 🟢 Sugestão / nit

- `UsersListClient.tsx:29-30` (corrigido): `isOwnRow` fazia `signedInUser !== null && record.uid === signedInUser.uid`.
  O contexto padrão de `useAuth` é `{}` (`packages/auth/provider.tsx:43` cria com `{} as AuthContextType`, e
  o `if (!context)` em `:395` nunca dispara), então fora do provider `user` é `undefined` e o `.uid` lança.
  Em produção o `AuthProvider` vem do `DesignSystemProvider` (`packages/design-system/index.tsx:27`) e o caso
  não acontece. Troquei por `record.uid === signedInUser?.uid`, que é o que o plano descreve (§5.1) e não
  depende de o valor ser exatamente `null`. Para `null` o resultado é o mesmo de antes.
- `UserFormFields.tsx:78-82`: o parágrafo de explicação não estava ligado ao select por `aria-describedby`.
  Na primeira passada ficou sem ação e foi para a lista do `/test`, que confirmou o problema. Corrigido na
  rodada 1 (seção abaixo).
- `route.ts:184-186`: o `DELETE` recusa também arquivar um segundo perfil que aponte para o uid de quem
  chama, mesmo que não seja o perfil que o guard usa. É mais estrito que o necessário, mas é intencional
  (D2 do plano) e o teste "matches the account by uid, not by profile id" fixa esse comportamento. Sem ação.
- `edit/[id]/page.tsx:35-38`: enquanto o `useAuth` carrega, o select de tipo do próprio perfil aparece
  habilitado por um instante. A API recusa o rebaixamento do mesmo jeito; é a opção P4 do plano. Sem ação.

### ✅ OK

- `route.ts`: handlers continuam `export const X = requireAdminApi(...)`. A recusa do `PUT` (`:131-133`) vem
  depois do 404 e das duas validações de corpo e antes de qualquer escrita. A do `DELETE` (`:184-186`) vem
  antes de `resolveUserAuditLabel` e de `cancelLiveSubscription`, então a assinatura do admin não é tocada.
- `locksOutOfPanel` (`:47-52`) deixa passar `disabled: false` e `type: ADMIN`, que o formulário de edição
  manda em toda gravação (`useUserCrud.tsx:56-63`).
- O erro segue `{ error: { code } }` com `HTTP_STATUS.FORBIDDEN`, e `USERS_SELF_LOCKOUT_FORBIDDEN` existe em
  `apiErrors` nos 3 idiomas (`translations/packages/shared/utils.ts:33`, `:154`, `:274`).
- O comentário em `isOwnAccount` (`:39-42`) explica uma regra que o código não mostra e não cita o fluxo.
- Front: nenhuma string solta; o dicionário fica em `adminUsersList` e `adminUsers`; `useAuth` é o mesmo
  hook que `AdminHomeClient.tsx:21` já usa. Nenhuma chamada nova à API.
- `HookFormSelect` repassa `disabled` só ao componente visual (`hookformSelect.tsx:90`), então o `type`
  continua no submit e o `PUT` sai com `ADMIN`. Confirmado por leitura; a medição fica com o `/test`.
- Testes: mocks nas bordas com `vi.hoisted`, `expect` dentro dos `it`, sem `toBeInTheDocument`.
- Âncoras: conferi as 14 que o diff alterou em `docs/` e `specs/` contra os arquivos finais. Todas batem:
  `route.ts:43-45`, `:72`, `:76`, `:110`, `:131-133`, `:144-149`, `:147-153`, `:151-153`, `:184-186`,
  `:194`, `:204` e `shared/utils.ts:75`, `:196`, `:317`.

## Correções aplicadas

| Arquivo | O que mudou |
|---------|-------------|
| `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/(home)/UsersListClient.tsx:29-30` | `isOwnRow` passa a comparar `record.uid === signedInUser?.uid` |
| `docs/SECURITY.md:30` | a frase "o painel nunca zera os admins ativos" virou a ressalva da corrida entre dois admins |
| `packages/design-system/components/form/hookform/hookformSelect.tsx` | rodada 1: prop opcional `description`, renderizada como `FormDescription` dentro do `FormItem` |
| `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(components)/UserFormFields.tsx` | rodada 1: o `<p>` solto saiu; a explicação vai pela prop `description` do select |
| `apps/app/__tests__/userFormFieldsTypeLock.test.tsx` | rodada 1: caso novo que segue o `aria-describedby` do select até um elemento com o texto da explicação |

## Raio de impacto

- `PUT` e `DELETE /users/:id` ganharam uma resposta `403 USERS_SELF_LOCKOUT_FORBIDDEN`. O único consumidor é
  `useUserCrud` (`updateUserMutation`, `toggleUserStatusMutation`, `deleteUserMutation`), que já leva o
  código ao toast pelo `apiErrors`. O SDK só trata 401 de forma especial, então o 403 não desloga.
- Nenhum DTO nem action do SDK mudou.
- `UserFormFields` ganhou a prop opcional `lockType`. A página de criação não passa a prop e fica igual.
- `HookFormSelect` ganhou a prop opcional `description` (rodada 1). Sem a prop, o componente renderiza o
  mesmo DOM de antes, então os outros consumidores do repo não mudam.
- `UsersListClient` e a página de edição passam a depender do `AuthProvider`. Os três testes que renderizam
  esses componentes já mockam `@repo/auth/provider` ou não precisam dele. Outro teste da API importa a rota
  (`apps/api/__tests__/mergedUserPayload.test.ts`); o handoff registra a suíte da API inteira verde.
- `apps/e2e/tests/a11yDark.spec.ts:92` varre `/admin/users`, agora com um switch desabilitado na linha do
  admin logado.

## Verificar no `/test`

Nada abaixo foi medido nesta etapa.

1. API contra o emulador, com o bearer do admin do seed: `PUT /users/<próprio id>` com `{"disabled":true}`,
   com `{"type":"COMMON"}` e `DELETE /users/<próprio id>` respondem
   `403 {"error":{"code":"USERS_SELF_LOCKOUT_FORBIDDEN"}}`, e o admin continua entrando no painel depois.
   `PUT` com `{"type":"ADMIN","displayName":"..."}` responde 200. A ordem das checagens está confirmada por
   leitura; falta a resposta real.
2. Edição do próprio perfil: select de tipo desabilitado, linha de explicação visível, salvar só o nome dá
   toast de sucesso e o tipo continua "Administrador". Editar outro usuário: select habilitado, sem a linha.
   O cálculo de `isOwnAccount` na página não tem teste de unidade, e este é o passo que prova que o `type`
   segue no submit.
3. Listagem: na linha do admin logado o switch aparece desabilitado e o menu só tem "Editar"; nas outras
   linhas, inclusive de outro admin, nada muda.
4. Tooltip do switch desabilitado: passar o mouse e ver se o navegador mostra o `title`. Se não mostrar, a
   saída é envolver o switch num `span` com o `title`.
5. Teclado e leitor de tela: o `button` desabilitado não recebe foco, então o `title` não é anunciado, e o
   parágrafo do formulário não está em `aria-describedby`. Registrar o que o leitor anuncia.
6. Axe no dark em `/admin/users` (`apps/e2e/tests/a11yDark.spec.ts`) com o switch em `disabled:opacity-50`.
7. A correção de `isOwnRow` desta revisão: rodar `apps/app/__tests__/usersListArchiveLabels.test.tsx`,
   principalmente "treats no row as own while the signed-in user is unknown".
8. Light, dark e mobile nos passos 2 e 3, e os 3 idiomas no `title` do switch e na linha de explicação.

## Lacunas de teste

| Lacuna | Veredito |
|--------|----------|
| `edit/[id]/page.tsx`: comparação de uid entre `useFindUserById` e `useAuth` sem teste de componente (handoff) | continua aberta na primeira passada; o `/test` fechou com `editUserPageOwnAccount.test.tsx` |
| Toast de `USERS_SELF_LOCKOUT_FORBIDDEN` e rollback do switch sem teste próprio (handoff) | continua aberta na primeira passada, prioridade baixa; o `/test` fechou com `useUserCrudSelfLockout.test.tsx` |
| `isOwnRow` com `useAuth` fora do provider (`user` indefinido) | fechada aqui pela correção; o caso não tem teste e não precisa, porque o provider é montado na raiz |
| `aria-describedby` do select de tipo apontando para id inexistente (`/test`) | fechada na rodada 1, com o caso novo em `userFormFieldsTypeLock.test.tsx` e prova de mutação |

## Decisões em aberto

1. A corrida entre dois admins que desativam um ao outro ao mesmo tempo continua possível. Recomendação:
   não mexer no código agora (fechar exigiria transação ou contagem de admins ativos, fora do corte) e
   registrar como achado 🟢 no `specs/BACKLOG.md` no próximo `/spec --sync`.
2. As âncoras de `users/[id]/route.ts` e de `UsersListClient.tsx` citadas em `specs/BACKLOG.md` (por exemplo
   `:87-143`, `:145-188`, `UsersListClient.tsx:102-125`) ficaram deslocadas por este diff. A D8 do plano
   deixa isso para o `/spec --sync`, que também vai fechar o achado de `:860`. Recomendação: manter.

## Rodada 1: volta do `/test`

O `/test` fechou com 11 ✅, 1 🔒 e nenhum ❌, e apontou um 🟡 nesta feature: no formulário de edição de si,
o select de tipo tem `aria-describedby` apontando para `<id>-form-item-description`, que não existe na
página, e o parágrafo de explicação fica solto. O leitor de tela não tem como saber por que o campo está
travado.

O id órfão vem do design system e afeta todo campo do repo, não só este. O `FormControl`
(`packages/design-system/components/ui/form.tsx:115-119`) sempre põe o id da descrição no
`aria-describedby`, e o elemento com esse id só existe quando alguém renderiza `FormDescription`. O
`HookFormSelect` nunca renderizava. Entre os `HookForm*`, só o `HookFormSwitch` tem prop `description`
(`hookformSwitch.tsx:27`, `:71-75`). Não corrigi o caso geral, que fica fora da tarefa. Ele vira achado 🟢
para o `/spec --sync` registrar no `BACKLOG.md`: o `aria-describedby` dos `HookForm*` sem descrição aponta
para um id inexistente (`form.tsx:115-119`). O achado vizinho "A dica do `TextareaInput` não entra no
`aria-describedby`" (`BACKLOG.md:797`) é parente, mas não o mesmo.

A correção ligou só a linha nova ao campo:

- `hookformSelect.tsx` ganhou `description?: string`, renderizada como `<FormDescription>` entre o
  `FormControl` e o `FormMessage` (`:115-117`). Segue o mesmo molde do `HookFormSwitch`. O `FormDescription`
  usa o id que o `aria-describedby` já referencia, então a ligação sai sem id próprio.
- `UserFormFields.tsx` passa `description={lockType ? adminUsers.form.typeSelfLocked : undefined}` e o `<p>`
  solto saiu. O `FormItem` já tem `gap-2`, então o `mt-1` deixou de ser necessário.

A hipótese do QA era essa mesma, e eu medi antes de aceitar:

| Medição | Resultado |
|---------|-----------|
| Caso novo em `userFormFieldsTypeLock.test.tsx`: lê o `aria-describedby` do combobox, resolve cada id com `document.getElementById` e espera achar o texto da explicação | 3 de 3 passam |
| Mutação: volta o `<p>` solto e tira a `description` | o caso novo falha (1 de 3), os outros dois passam; arquivo restaurado e conferido com `git diff` |
| `editUserPageOwnAccount.test.tsx` e `usersListArchiveLabels.test.tsx` (testes do `/test` e da listagem) | 17 de 17 passam |
| Testes que já usavam o `HookFormSelect`: `packages/design-system/__tests__/hookformAria.test.tsx` e `apps/app/__tests__/hookFormSelectValue.test.tsx` | 24 de 24 e 2 de 2 |

Rodei só esses arquivos, não a suíte. O que o leitor de tela anuncia continua 🔒, porque nenhuma etapa teve
leitor de tela.

## Gates

| Gate | Resultado |
|------|-----------|
| `pnpm check` | 808 arquivos na primeira passada; 810 na rodada 1, depois dos testes novos do `/test`; sem erro |
| `pnpm turbo run typecheck --filter=app --filter=@repo/design-system` | 2 tasks ok (rodada 1) |
| typecheck `api` e `@repo/internationalization` | ok no handoff; esta revisão não tocou nesses workspaces |
| Paridade de i18n | 59 testes em 6 arquivos no handoff; esta revisão não tocou em tradução |

## Plano de commits

A ordem de `git-commits.md` põe `packages/internationalization` por último, mas os commits do app usam
`list.selfStatusLocked` e `form.typeSelfLocked`, que só existem no commit de i18n. Com i18n no fim, o
typecheck do app falharia nos commits intermediários. Pus i18n antes do app: a regra ordena por dependência,
e aqui o app depende das chaves. O commit da API não depende de i18n (o código de erro é uma string e o
teste de paridade não lê a API). A prop nova do `HookFormSelect` entra num commit próprio do
`design-system`, antes do app, pelo mesmo motivo. Os dois testes que o `/test` criou acompanham a
funcionalidade que cobrem: `useUserCrudSelfLockout.test.tsx` (toast e rollback do switch) vai com a listagem,
e `editUserPageOwnAccount.test.tsx` vai com o formulário.

1. `fix(api): refuse admin actions that would lock the caller out`
   - `apps/api/app/(routes)/users/[id]/route.ts`
   - `apps/api/__tests__/usersAdminAuditTrail.test.ts`
   - `apps/api/__tests__/usersAdminDeleteBilling.test.ts`
2. `feat(design-system): add a description to HookFormSelect`
   - `packages/design-system/components/form/hookform/hookformSelect.tsx`
3. `feat(internationalization): add self-lockout error and admin users hints`
   - `packages/internationalization/translations/packages/shared/utils.ts`
   - `packages/internationalization/translations/apps/app/pages/admin/users.ts`
4. `fix(app): lock the status switch and archive action on the admin's own row`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/(home)/UsersListClient.tsx`
   - `apps/app/__tests__/usersListArchiveLabels.test.tsx`
   - `apps/app/__tests__/usersListLastAccess.test.tsx`
   - `apps/app/__tests__/useUserCrudSelfLockout.test.tsx`
5. `fix(app): lock the user type select when editing your own account`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(components)/UserFormFields.tsx`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/page.tsx`
   - `apps/app/__tests__/userFormFieldsTypeLock.test.tsx`
   - `apps/app/__tests__/editUserPageOwnAccount.test.tsx`
6. `docs: document admin self-lockout refusal and shifted users route anchors`
   - `docs/SECURITY.md`
   - `docs/INCIDENT-RESPONSE.md`
   - `docs/BACKUP.md`
   - `docs/SUBPROCESSORS.md`
7. `docs(specs): sync backlog after PR #36`
   - `specs/BACKLOG.md`
8. `docs(specs): shift users route and translation anchors`
   - `specs/account-security-mfa.md`
   - `specs/observability-logging.md`
   - `specs/plan-entitlements.md`
9. `docs(features): admin-self-lockout-guard`
   - `docs/features/admin-self-lockout-guard/`

Varri `docs/features/admin-self-lockout-guard/` por senha, token, chave e e-mail real, inclusive o `test/`
da rodada 1: nada encontrado. O único e-mail é `qa-admin-self-lockout@example.com`, de domínio reservado.

Título de PR sugerido: `fix: admins can no longer lock themselves out of the panel`.

Commits realizados: _(preenchido pelo orquestrador)_
