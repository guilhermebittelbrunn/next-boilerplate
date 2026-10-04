# Handoff do `/develop`: o admin não consegue se trancar fora do painel

Implementação do plano em `analyze/plan.md`, em rodada autônoma do `/cycle`. Sem SDK, sem Firestore, sem env,
sem infra. Nada commitado e nenhuma branch criada.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| §13.1 API: recusa no `PUT` e no `DELETE` | `apps/api/app/(routes)/users/[id]/route.ts` (helpers `isOwnAccount` em `:43-45`, `locksOutOfPanel`, `selfLockoutRefusal`; checagem no `PUT` em `:131-133`, no `DELETE` em `:184-186`) |
| §13.2 Listagem | `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/(home)/UsersListClient.tsx` |
| §13.3 Formulário | `.../users/(components)/UserFormFields.tsx` (prop `lockType`), `.../users/(pages)/edit/[id]/page.tsx` (`isOwnAccount` via `useAuth`) |
| §13.4 i18n | `packages/internationalization/translations/packages/shared/utils.ts` (`apiErrors.USERS_SELF_LOCKOUT_FORBIDDEN`), `packages/internationalization/translations/apps/app/pages/admin/users.ts` (`list.selfStatusLocked`, `form.typeSelfLocked`) |
| §13.5 Testes | `apps/api/__tests__/usersAdminAuditTrail.test.ts` (novo `describe`, 11 casos), `apps/api/__tests__/usersAdminDeleteBilling.test.ts` (1 caso), `apps/app/__tests__/usersListArchiveLabels.test.tsx` (mock de `useAuth` + novo `describe`, 6 casos), `apps/app/__tests__/usersListLastAccess.test.tsx` (só o mock de `useAuth`), `apps/app/__tests__/userFormFieldsTypeLock.test.tsx` (novo, 2 casos) |
| §13.6 Documentos | `docs/SECURITY.md` (sub-item sob `requireAdminApi`), âncoras em `docs/INCIDENT-RESPONSE.md`, `docs/BACKUP.md`, `docs/SUBPROCESSORS.md`, `specs/observability-logging.md`, `specs/account-security-mfa.md`, `specs/plan-entitlements.md` |

## Contrato

Nenhum DTO nem action do SDK mudou. O `PUT` e o `DELETE /users/:id` ganharam uma resposta de erro nova
(`403 USERS_SELF_LOCKOUT_FORBIDDEN`). Quem consome: `useUserCrud` (`updateUserMutation`,
`toggleUserStatusMutation`, `deleteUserMutation`), que já leva o erro para o toast via `apiErrors`.

## Códigos de erro novos

`USERS_SELF_LOCKOUT_FORBIDDEN` (403), com entrada em `apiErrors` em pt-br, en e es. Paridade conferida pelo
teste `packages/internationalization/__tests__/parity.test.ts` (números em Validação).

## Desvios do plano

1. **Três âncoras deslocadas que o §13.6 não listava.** O plano citava quatro documentos; o diff desloca
   mais três referências, e eu corrigi todas:
   - `docs/SUBPROCESSORS.md:35`: `users/[id]/route.ts:53` passou a `:76` (`getStripe()`).
   - `specs/plan-entitlements.md:36`: `users/[id]/route.ts:49` passou a `:72` (`isLiveSubscription`).
   - `specs/account-security-mfa.md:222`: as âncoras de `AUTH_PASSWORD_TOO_SHORT` em
     `translations/packages/shared/utils.ts` (`:73`, `:192`, `:311`) passaram a `:75`, `:196`, `:317`, porque
     a chave nova entra antes delas em cada idioma.
   As quatro do plano ficaram assim: `INCIDENT-RESPONSE.md:51` (`:87` → `:110`, `:117-122` → `:144-149`,
   `:124-126` → `:151-153`), `BACKUP.md:94` (`:173` → `:204`), `observability-logging.md:65` (`:163` → `:194`),
   `account-security-mfa.md:301` (`:120-126` → `:147-153`). Cada linha nova foi conferida com `sed -n` no
   arquivo final. O `specs/BACKLOG.md` cita várias âncoras da rota e ficou intocado, como manda a D8.
2. **Um caso a mais em `usersAdminDeleteBilling.test.ts`.** O plano deixava opcional. Entrou porque é a prova
   direta do critério "a assinatura do admin não é cancelada": alvo próprio com assinatura `active` → 403,
   sem chamar `getStripe` nem `subscriptions.cancel`.
3. **Comentário em `isOwnAccount`.** O plano deixava a critério do desenvolvedor. Entrou com duas linhas
   sobre a regra (a desativação e as sessões são da conta do Firebase Auth, e mais de um perfil pode apontar
   para ela), sem citar tarefa nem plano.
4. **Nos testes da rota, os helpers devolvem valores em vez de chamar `expect`.** O Biome
   (`lint/suspicious/noMisplacedAssertion`) recusa `expect` fora do `it`, então `outcomeOf(response)` e
   `writesMade()` devolvem dados e o `it` faz a asserção.

Nenhuma decisão do plano se mostrou errada.

## Decisões em aberto

Nenhuma nova. As perguntas P1 a P5 do plano seguem com a opção adotada.

## Validação

| O quê | Comando | Resultado |
|-------|---------|-----------|
| Testes da rota | `pnpm --filter api exec vitest run __tests__/usersAdminAuditTrail.test.ts __tests__/usersAdminDeleteBilling.test.ts` | 42 passaram (29 + 13) |
| Mutação da rota (cópia em `/tmp`, restaurada e conferida com `diff`) | mesmo comando, uma mutação por rodada | sem a checagem do `PUT`: 4 falham; sem a do `DELETE`: 3; comparando `profile.id === ctx.actorProfile.id`: 1 (o caso por uid); trocando por `type !== undefined`: 1 (o caso de salvar o próprio nome) |
| Testes do app | `pnpm --filter app exec vitest run __tests__/userFormFieldsTypeLock.test.tsx __tests__/usersListArchiveLabels.test.tsx` | 15 passaram |
| Mutação do app | mesmo comando | switch sem `isOwnRow`: 3 falham; `onDelete` sempre presente: 1; select nunca desabilitado: 1; usuário nulo tratado como dono: 1 |
| Suítes completas | `pnpm turbo run test --filter=api --filter=app --filter=@repo/internationalization` | api 1048/79 arquivos, app 764/92, internationalization 59/6; 11 tasks ok |
| Typecheck | `pnpm turbo run typecheck --filter=api --filter=app --filter=@repo/internationalization` | 3 tasks ok |
| Lint | `pnpm check` | 808 arquivos, sem erro |

Não subi app, não usei `agent-browser` e não tirei screenshot.

## A verificar no `/test`

Nada abaixo foi medido aqui.

- **API de verdade, com o seed do emulador.** Com o bearer do admin logado: `PUT /users/<próprio id>` com
  `{"disabled":true}`, com `{"type":"COMMON"}` e `DELETE /users/<próprio id>` respondem
  `403 {"error":{"code":"USERS_SELF_LOCKOUT_FORBIDDEN"}}`, e o admin segue entrando no painel depois.
  `PUT` com `{"type":"ADMIN","displayName":"..."}` responde 200.
- **Tooltip do switch desabilitado.** O `title` chega ao `button` do Radix (o teste de componente lê o
  atributo no DOM do jsdom). Se o navegador mostra o tooltip ao passar o mouse num `button` desabilitado
  (`disabled:cursor-not-allowed`), ninguém conferiu. Se não mostrar, a saída é envolver o switch num
  `span` com o `title`.
- **Leitor de tela.** Um `button` desabilitado não recebe foco, então quem navega por teclado não ouve o
  `title`. Vale conferir se isso basta para a linha própria.
- **Página de edição.** O cálculo `isOwnAccount` em `edit/[id]/page.tsx` não tem teste de unidade; o teste
  cobre só `UserFormFields` com e sem `lockType`. Repro: editar o próprio perfil (select desabilitado, linha
  de explicação visível, salvar o nome dá toast de sucesso e o tipo segue "Administrador") e editar outro
  usuário (select habilitado, sem a linha).
- **Submit com o select desabilitado.** A leitura de `hookformSelect.tsx` diz que o `disabled` vai só para o
  componente visual e o valor `ADMIN` segue no submit. Não medi; o passo acima prova.
- **Axe no dark.** `apps/e2e/tests/a11yDark.spec.ts` varre `/admin/users`. O switch desabilitado usa
  `disabled:opacity-50`; o axe costuma ignorar contraste de controle desabilitado, mas a suíte E2E não rodou
  aqui (`pnpm e2e`).
- Light, dark e mobile nos passos de listagem e edição, e os 3 idiomas no `title` e na linha de explicação.

## Lacunas de teste conhecidas

- `edit/[id]/page.tsx`: comparação de uid entre `useFindUserById` e `useAuth` sem teste de componente.
- O toast de `USERS_SELF_LOCKOUT_FORBIDDEN` e o rollback do switch não têm teste próprio; a UI esconde os
  controles, então o caminho só aparece em corrida ou aba antiga.
