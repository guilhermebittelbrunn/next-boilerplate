# Handoff — `/develop` de `account-settings`

> Documento escrito incrementalmente durante a implementação. Ordem do slice:
> `packages/sdk` → `apps/api` → `apps/app` → `packages/internationalization`.

## 1. Entregue por unidade

### U1 — `packages/sdk` · tipos (blueprint §12.1 / §12.2)

- `packages/sdk/src/types/user/user.ts` — **aditivo**: `UserPreferences` + `phone?`, `avatar?`,
  `preferences?` em `UserDTO`. `UserWithAuthDTO`, `AdminCreateUserRequest` e `AdminUpdateUserRequest`
  intocados (contenção com `billing-subscription`).
- `packages/sdk/src/types/account/account.ts` (novo) — `AccountDTO`, `UpdateAccountRequest`,
  `ChangePasswordRequest`, `AccountConfirmation`.
- `packages/sdk/src/types/account/index.ts` (novo) + registro em `packages/sdk/src/types/index.ts`.

### U2 — `packages/sdk` · action (§12.3)

- `packages/sdk/src/actions/account/action.ts` (novo) — `me()`, `update()`, `changePassword()`,
  `revokeSessions()`.
- `packages/sdk/src/client/index.ts` — campo `account!: AccountActions` + `new AccountActions(this)`.

### U3 — `apps/api` · validação (§13.4)

- `apps/api/(shared)/validation/account.schema.ts` (novo) — `updateAccountSchema` (`.strict()`),
  `changePasswordSchema` (`.strict()`), `parseUpdateAccount`, `parseChangePassword`.

### U4 — `apps/api` · `GET`/`PUT /account` (§13.3, §13.5)

- `apps/api/(shared)/lib/account-avatar.ts` (novo) — `resolvePreferences`, `withAvatarUrl`.
  Reusa `isAbsoluteHttpUrl` de `entity-photo.ts` e `signReadUrl`/`isStorageConfigured` de `storage.ts`.
- `apps/api/app/(routes)/account/route.ts` (novo) — `GET` + `PUT` sob `requireCommonPanelApi`.

### U5 — `apps/api` · senha e sessões (§13.3)

- `apps/api/app/(routes)/account/password/route.ts` (novo).
- `apps/api/app/(routes)/account/sessions/revoke/route.ts` (novo).
- `apps/api/(shared)/lib/toolkit-error-codes.ts` — **aditivo**: `mapPasswordCheckMessageToCode`.

## 2. Desvios do plano

### 🔴 D1 — `mapIdentityToolkitMessageToCode` não aceita fallback (plano §13.3 estava errado)

O plano manda chamar `mapIdentityToolkitMessageToCode(error.message, "ACCOUNT_CURRENT_PASSWORD_INVALID")`,
mas a função existente tem **aridade 1** (`toolkit-error-codes.ts:6`) e o fallback dela é
`USERS_AUTH_SIGN_UP_FAILED` — o código do plano não compila, e se compilasse devolveria um erro de
cadastro numa troca de senha. Corrigido com um export novo e aditivo,
`mapPasswordCheckMessageToCode(message, fallback)`, que trata `TOO_MANY_*` (429) e `WEAK_PASSWORD` e
colapsa o resto no fallback do chamador. Nenhuma função existente foi alterada.

### 🟡 D2 — `ACCOUNT_NOTHING_TO_UPDATE` fora do `.refine()`

O plano põe `.refine((v) => Object.keys(v).length > 0)` **dentro** do schema; isso faria corpo vazio cair
em `VALIDATION_FAILED`, não em `ACCOUNT_NOTHING_TO_UPDATE`. A checagem foi movida para
`parseUpdateAccount`, como em `parseAdminUpdateUserInput` (`user-admin.schema.ts:38-51`). O código de erro
que o plano pede é o que sai.
Extra: `{ "preferences": {} }` também conta como "nada a atualizar" (senão gravaria um patch vazio).

### 🟡 D3 — `ACCOUNT_UPDATE_FAILED` é emitido de fato

O plano lista o código como "reservado". Ele é emitido pelos `catch` da escrita em Firestore/Auth no
`PUT /account` e da troca de senha — é o que impede um 500 com stack trace.
`ACCOUNT_SESSIONS_REVOKE_FAILED` continua **não emitido** (`revokeUserSessions` engole o erro), mas foi
traduzido nos 3 idiomas porque o contrato do plano o declara.

### U6 — `apps/app` · hooks e query keys (§14.2, §14.3)

- `apps/app/shared/lib/queryKeys.ts` — bloco `account` (aditivo).
- `apps/app/shared/hooks/useMyAccount.ts` (novo) — `fetchMyAccount` + `useMyAccount` (`useAuthorizedQuery`).
- `apps/app/.../account/(hooks)/useAccountMutations.tsx` (novo) — `updateProfile`, `updatePreferences`,
  `changePassword`, `revokeSessions`; `useAlert` + `FormattedError`/`handleClientError`.

### U7 — `apps/app` · página com abas (§14.1, §14.4, §14.5)

- `(validations)/accountFormSchema.ts` — `buildAccountProfileSchema`, `buildAccountPasswordSchema`,
  `buildAccountPreferencesSchema` (factories com dictionary).
- `(components)/AccountProfileForm.tsx`, `AccountSecurityForm.tsx`, `AccountPreferencesForm.tsx`,
  `AccountBillingPlaceholder.tsx`, `AccountTabs.tsx`.
- `(pages)/(home)/page.tsx` (RSC com prefetch + `HydrationBoundary`), `AccountClient.tsx`, `loading.tsx`.

### U8 — `apps/app` · navegação (§14.6)

- `(common)/paths.ts` — bloco `account` (aditivo, no fim).
- `(common)/routes.tsx` — grupo **Documentation removido**; grupo **Settings** com 4 itens apontando para
  `/account?tab=…`; títulos vindos do dictionary. `Team` e `Limits` removidos.
- `shared/components/ui/ProfileDropdown.tsx` — item "Minha conta", `useMyAccount()` com fallback para
  `useAuth()`, "Sair" traduzido (dívida existente quitada).

### U9 — `apps/app` · preferências entre dispositivos (§8, §14.7)

- `apps/app/app/layout.tsx` — lê `x-theme` e emite a classe no `<html>` + `defaultTheme`.
- `apps/app/shared/providers/AppDesignProvider.tsx` — repassa `defaultTheme`.
- `apps/app/shared/lib/postLoginNavigation.ts` — projeta `x-theme`/`x-locale` a partir de
  `preferences` e leva o pós-login para o locale preferido.

### U10 — `packages/internationalization` (§15)

- `translations/apps/app/pages/common/account.ts` (novo) + registro nas 3 entradas do `index.ts`.
- `translations/apps/app/pages/common/routes/index.ts` — `platform.settingsItems` ×3 idiomas.
- `translations/apps/app/shared/index.ts` (novo, `profileDropdown`) + registro em `apps/app/index.ts`.
- `translations/packages/shared/utils.ts` — os **6** `apiErrors` novos nos 3 idiomas.

### U11 — testes

- `apps/api/__tests__/accountSchema.test.ts` (8), `accountAvatar.test.ts` (5), `accountRoute.test.ts` (7).
- `apps/app/__tests__/accountFormSchema.test.ts` (7).

## 3. Desvios adicionais

### 🔴 D4 — `AlertDialogAction`/`AlertDialogCancel` produziam `<button>` dentro de `<button>`

`packages/design-system/components/ui/alert-dialog.tsx:152-186` envolvia o primitivo Radix (que já é um
`button`) num `<Button>`. O console do navegador acusou `<button> cannot contain a nested <button>` e o DOM
confirmou 2 ocorrências. **Esta entrega é a primeira consumidora do `AlertDialog` no repo** (nenhum outro
arquivo importa `AlertDialogAction`), então o defeito estava dormente. Corrigido com `asChild` nos dois.
Verificado no browser depois: `document.querySelectorAll('button button').length === 0` e o diálogo
renderiza igual. Raio de impacto: zero consumidores além deste.

### 🟡 D5 — `useMyAccount` mora em `shared/hooks/`, não em `(hooks)/` da página

O plano coloca o hook em `account/(hooks)/useMyAccount.tsx`, mas o `ProfileDropdown`
(`shared/components/ui/`) precisa dele. Um import de `shared/` para dentro de
`app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/…` seria um caminho com parênteses e
colchetes, frágil e invertido. Fica em `apps/app/shared/hooks/useMyAccount.ts`, ao lado de
`useFileUpload.ts`. O par `fetchMyAccount` + `useMyAccount` no mesmo arquivo (regra de ouro 8) foi mantido.

### 🟡 D6 — a aba é estado de cliente, sincronizada pelo History API

Implementei primeiro como o plano sugere (`router.replace(?tab=…)`) e **medi no browser**: cada clique de
aba disparava um round-trip RSC (3–8 s em dev) para re-renderizar uma página cujos dados não mudaram.
Agora `AccountTabs` usa `useState` inicializado pelo `searchParams` e sincroniza a URL com
`window.history.replaceState`. Deep link continua funcionando (validado com `?tab=billing` e
`?tab=security` em carga fria). **Tradeoff**: voltar/avançar no histórico não troca mais a aba.

### 🟡 D7 — projeção de preferências não vem de `POST /auth/sign-in`

O plano assume que a `apps/app` consome `POST /auth/sign-in` e recebe o `user`. Não é o caso: o
`SignInForm` usa o client SDK do Firebase (`useAuth().signIn`) e o papel pós-login vem de
`apiClient.authApi.me()` dentro de `resolveDefaultPostLoginForApp`. A projeção foi colocada **nessa
chamada já existente** (`/auth/me` devolve o merged user, logo inclui `preferences`) — zero requisição
extra, e cobre e-mail/senha e Google.

### 🟡 D8 — `messages.passwordChangedSignOut` não existe

O plano previa `passwordChanged` **e** `passwordChangedSignOut`. Ficou só `passwordChanged`, com a frase
completa ("Senha alterada. Entre novamente para continuar."). Chave não usada é peso morto.

### 🟢 D9 — pequenos acréscimos

- `revokeSessions` também faz `signOut` no cliente: o Firebase não revoga seletivamente, então a sessão
  atual cai junto; ficar numa sessão morta só falharia na próxima request.
- `security.description`, `security.cancel`, `security.signOutEverywhereAction`,
  `preferences.description` e `profile.validation.avatarReference` são chaves a mais que o §15.2 não
  listava, exigidas pelos textos que a tela realmente mostra.

## 4. O que foi validado visualmente (e como)

Servidores `pnpm --filter api dev` (3002) + `pnpm --filter app dev` (3000), sessão real
(`qa-test-upload@example.com`), `agent-browser` em sequência estrita.
Screenshots em `docs/features/account-settings/develop/screenshots/`.

| # | Critério §20 | Resultado | Evidência |
|---|---|---|---|
| 1 | 4 abas, claro+escuro, desktop+mobile | ✅ | `01`, `04`, `06`, `08`, `09`, `12` (390×844), `13` |
| 2 | Editar nome → cabeçalho atualiza **sem reload** | ✅ | `02` (antes: "qa-test-upload") → `03` (depois: "Ana"/"An"), sem navegação |
| 3 | Sidebar sem nenhum `href="#"` | ✅ | DOM: `["/es/playground","/es/entities","/es/account?tab=profile","…security","…preferences","…billing","/es"]` · `10` |
| 4 | Trocar idioma para `es` → recarrega em espanhol + `x-locale` | ✅ | `07`/`08`; URL virou `/es/account?tab=preferences`; cookie `x-locale` presente |
| 5 | Trocar tema persiste | ✅ | cookie `x-theme` gravado; `curl -H "Cookie: x-theme=dark"` ⇒ `<html class="… dark">`, `light` ⇒ `… light` |
| 6 | Senha atual errada → toast traduzido, sem stack trace | ✅ | `05` ("A senha atual está incorreta."); API respondeu **400**, não 500 |
| 7 | Storage desligado → 503 traduzido, resto intacto | ✅ | `11` (upload real de PNG ⇒ `POST /files 503`, mensagem traduzida no campo; nome/telefone/abas intactos) |
| 8 | Sob impersonação → `Footer` desabilitado + aviso | ⚠️ **não validado visualmente** | ver abaixo |

Também validado fora da lista: diálogo "sair de todos os dispositivos" (`14`), menu do avatar com
"Minha conta" → `/en/account` e "Sair" traduzidos, lendo nome/e-mail do `useMyAccount` (`15`), e
deep link `?tab=billing` em carga fria (`09`).

### O que NÃO foi validado, e por quê

- **Impersonação (critério 8)** — *não é falha de código, é custo de setup*: exigiria uma conta admin e o
  seletor de impersonação. A recusa de escrita está coberta por teste automatizado
  (`accountRoute.test.ts` → `PUT` sob impersonação responde **403**, `userRepository.update` não é
  chamado) e o `disabled={isImpersonating}` está nos 3 `Footer` + no botão de revogar. **A UI em si não
  foi vista nesse estado.**
- **Caminho feliz do avatar** — *pré-requisito de infra*: o Cloud Storage está desativado no projeto
  `next-boilerplate-576d0`. Só o **modo degradado** foi exercido. Nunca vi um avatar assinado renderizar;
  `withAvatarUrl` retornando `avatarUrl` não-nulo está coberto só por teste unitário.
- **Preferência entre dispositivos de verdade** — validei os dois lados (cookie escrito no sign-in via
  `/auth/me`; servidor lê o cookie e emite a classe/locale), **mas não fiz um segundo sign-in em um
  perfil de navegador limpo**. A cadeia foi verificada por partes, não ponta a ponta.
- **Produção** — `pnpm turbo run build` passa (exit 0, `/account`, `/account/password`,
  `/account/sessions/revoke` e `/[locale]/account` registradas), mas os fluxos foram percorridos no
  **dev server**. As latências observadas (3–8 s por navegação) são do dev, não medidas em produção.

## 5. Achados que NÃO corrigi

1. **`apps/app/.../entities/create` gera `Failed to fetch RSC payload` no console** ao prefetch durante
   reinício do servidor — ruído pré-existente da árvore de entidades, alheio a esta entrega.
2. **`mapIdentityToolkitMessageToCode` tem fallback `USERS_AUTH_SIGN_UP_FAILED`** mesmo sendo usada em
   contexto de login (`auth/sign-in`). Não toquei; criei função separada (D1).
3. **Um admin no painel comum sem impersonar** faz `GET /account` responder 403
   (`COMMON_PANEL_FORBIDDEN`): a página mostra o estado de erro de carga e o `ProfileDropdown` cai no
   fallback do `useAuth()`. É o comportamento correto (a área é comum), mas não há copy dedicada.
4. **`BaseRepository.update` continua sem mapper** — o `PUT /account` contorna construindo o patch do
   zero, mas o próximo recurso pode cair na mesma armadilha.

## 6. Gates (números reais)

| Gate | Comando | Resultado |
|---|---|---|
| Lint/format | `pnpm check` | ✅ `Checked 497 files … No fixes applied` (0 erros) |
| CI completo | `pnpm turbo run lint typecheck test` | ✅ **23 tasks successful, 23 total** |
| Testes API | `pnpm --filter api test` | ✅ **28 arquivos / 288 testes** (eram 27/281 → +20 testes novos) |
| Testes app | `pnpm --filter app test` | ✅ **29 arquivos / 215 testes** (+7 novos) |
| Paridade i18n | `pnpm --filter @repo/internationalization test` | ✅ **3 arquivos / 27 testes**, `parity.test.ts` verde |
| Build produção | `pnpm turbo run build --filter=app --filter=api` | ✅ exit 0, 10 tasks |

Nenhum teste foi desativado ou afrouxado.

## 7. Lacunas de teste para o `/test`

- `POST /account/password`: mapeamento `TOO_MANY_ATTEMPTS` ⇒ `USERS_AUTH_RATE_LIMITED` (429) e
  `ACCOUNT_PASSWORD_UNSUPPORTED` (conta sem e-mail) não têm teste de rota.
- `POST /account/sessions/revoke`: sem teste.
- `PUT /account`: remoção do objeto anterior (`deleteObjectQuietly`) e o caso "avatar não mudou" não são
  exercitados.
- `apps/app`: nenhum teste de componente para `AccountProfileForm`/`AccountSecurityForm` (o §11 do plano
  pedia); só os schemas estão cobertos.
- `ProfileDropdown`: fallback `useMyAccount` → `useAuth` quando a query falha.
- `postLoginNavigation`: projeção de cookie a partir de `preferences` (inclusive valor inválido ignorado).
