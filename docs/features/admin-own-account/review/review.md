# Revisão: área de conta para o admin

Rodada autônoma do `/cycle`. Nada commitado, nenhuma branch criada ou renomeada.

O working tree carrega duas features sem commit: `app-form-layout-centered` (revisada e testada, ver
`docs/features/app-form-layout-centered/review/review.md`) e esta. A revisão cobriu o diff desta feature e
conferiu que ela não desfaz nada da anterior: a remoção de `flex-1` nos três formulários da conta continua
no disco e nenhum teste desta feature depende dela.

## Branch

- Atual: `guilhermebittelbrunn/claude-cycle-full-pipeline`. **Reprova** no regex do Passo 3 de
  `.claude/commands/review.md` (prefixo `guilhermebittelbrunn` não é projeto e falta o `type`).
- Proposta: `feat/admin-account-and-centered-forms`. Passa no regex. Sem projeto porque o diff cobre
  `apps/api`, `apps/app`, `apps/e2e`, `packages/internationalization`, `docs/` e `specs/`.
- A branch atual não tem commit à frente de `origin/main` e não tem upstream, então o caminho da regra é
  renomear: `git branch -m feat/admin-account-and-centered-forms`. Não renomeei, por instrução do `/cycle`;
  quem executa é o `/review`, antes do primeiro commit.

## Revisão

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `docs/review-checklist.md:64` (§1): a lista de guards da fonte única não citava `requireOwnAccountApi`.
  Um revisor futuro marcaria o uso dele como erro, ou pior, não saberia que ele só cabe nas rotas de conta.
  **Corrigido**: o guard entrou na lista com a restrição de uso.

### 🟢 Sugestão / nit

- `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/AdminAccountClient.tsx:5`:
  import de `(admin)` para `(common)/(pages)/account/(components)/AccountTabs` (decisão D5 do plano). É o
  único import entre grupos de rota no app (`grep -rn 'from "@/app/\[locale\]' apps/app/app apps/app/shared`).
  Nenhuma regra do `apps/app/CLAUDE.md` ou do checklist proíbe, e mover a pasta inteira (componentes, hooks e
  validações) para `shared/` seria refatoração fora do escopo. Aceito como está. Se um terceiro consumidor
  aparecer, a pasta deve ir para `apps/app/shared/components/account/`.
- `apps/api/app/(routes)/files/route.ts:70`: o escopo agora é validado antes do guard, então um chamador sem
  token com `?scope=lixo` recebe 400 em vez de 401. Não vaza nada (o 400 não depende de quem chama) e é o que
  impede um escopo inválido de cair num guard. Sem ação.
- `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/page.tsx`: o
  `if (!(await isImpersonating()))` nunca é falso ali, porque o layout admin redireciona antes
  (`admin/layout.tsx:45`). Fica por coerência com o checklist §2 (prefetch sempre dentro desse `if`).

### ✅ OK

- **Guard `requireOwnAccountApi`** (`apps/api/app/(guards)/common-panel.ts:41-49`, `:156`). Aceita sujeito
  comum ou sujeito admin com `!isImpersonating && subject.reference_id === actorUid`. As camadas por baixo
  seguram os casos pedidos:
  - admin personificando não escreve: `assertReadOnlyWhileImpersonating` roda antes de resolver o sujeito
    (`common-panel.ts:85`), e o sujeito personificado é sempre comum;
  - admin não alcança outro admin: com papel admin e `x-request-user-id` de outro uid, o contexto recusa com
    `AUTH_REQUEST_ADMIN_TARGET_INVALID` (`auth-request-context.ts:63`); com papel comum mirando um admin,
    `AUTH_REQUEST_IMPERSONATION_TARGET_INVALID` (`:73`). Mesmo que chegasse ao guard, `reference_id ===
    actorUid` recusaria;
  - comum não muda de sujeito: `validateCommonProfile` exige `requestUserId === uid`.
- **Rotas que continuam fechadas ao admin**: sessões (`account/sessions/*`), `export`, `deletion`,
  `sign-in-methods/*`, `email` e `onboarding` seguem com `requireCommonPanelApi` (conferido por `grep` em
  `apps/api/app`). Só `account/route.ts`, `account/password`, `account/password/set` e o upload pessoal
  trocaram de guard.
- **Despacho por escopo em `POST /files`** (`files/route.ts:69-77`). `parseUploadScope` devolve `personal`
  só quando o parâmetro está ausente e 400 para qualquer valor fora da lista
  (`file.schema.ts:198-209`), então escopo inválido não chega a guard nenhum. `organization` vai para
  `requireOrganizationApi`, que continua montado sobre `requireCommonPanelApi` e recusa o admin. O upload
  pessoal grava em `uploads/<ctx.subjectProfile.id>` (`files/route.ts:58`), que para o admin é o próprio
  perfil. O `PUT /account` valida o avatar contra o mesmo `ownerId`, então o caminho bate.
- **`password/set` aberto ao admin** (`account/password/set/route.ts:21`, `:60`): a checagem ator == sujeito
  continua e o `isRecentGoogleSignIn` confere o token de reautenticação contra `ctx.user.uid`, o uid do
  ator. O admin só define senha na própria conta e só com prova recente do Google.
- `PUT /account` usa `updateAccountSchema` com `.strict()`: o admin não envia `id`, `uid`, `type` nem plano.
- Atividade: o admin passa a ser carimbado nas rotas de conta; `recordUserActivity` deduplica por janela e o
  guard admin já carimbava, então não há escrita a mais por request.
- Cache entre painéis: `useMyAccount` agora guarda a conta do admin em `account.me`, e a troca de contexto
  chama `queryClient.resetQueries()` (`AuthRequestPanelContext.tsx:192`), então a conta do admin não aparece
  na área comum ao personificar.
- Componentes da conta: as três props novas (`allowEmailChange`, `passwordOnly`, `accountPath`) têm default
  igual ao comportamento anterior, e `AccountTabs` só as liga com `area="admin"`. A conta comum não muda.
- Nenhum código de erro novo, SDK sem mudança, duas chaves novas nos 3 idiomas, nenhum comentário citando o
  fluxo.
- Corte da spec `specs/features/admin-own-account.md`: Perfil, Segurança (só senha) e Preferências, sem
  sessões nem métodos de login. Corresponde.

### 👁 Verificar no `/test`

Nada abaixo foi medido em runtime; o handoff também não mediu.

1. **(maior risco) API direta com o token do admin.** `GET /account/sessions` → 403
   `COMMON_PANEL_FORBIDDEN`; `PUT /account` com `x-request-role: common` e `x-request-user-id` de um usuário
   comum → 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY`; `PUT /account` com `x-request-role: admin` e
   `x-request-user-id` de outro admin → 403 `AUTH_REQUEST_ADMIN_TARGET_INVALID`; `POST /files?scope=organization`
   → 403; `POST /files?scope=xyz` → 400 `VALIDATION_FAILED`. Repro: `curl` com o ID token do admin do emulador.
2. **Upload de avatar do admin** grava em `uploads/<id do perfil do admin>/` e a imagem aparece depois de
   recarregar. Repro: emulador de Storage, `/admin/account?tab=profile`, trocar avatar, conferir o objeto.
3. **Regressão do comum**: upload de foto de registro de entidade (`scope=organization`) continua 201; avatar
   do comum continua funcionando; `/account` mostra troca de e-mail, sessões e métodos de login.
4. **`GET /account` no painel admin** passa a responder 200 (antes 403). Repro: aba de rede em qualquer
   página do admin, requisição do `useMyAccount`.
5. "Minha conta" no menu do avatar e no menu lateral leva a `/{locale}/admin/account?tab=profile`; a aba do
   navegador mostra "Minha conta | <marca>" nos 3 idiomas.
6. Três seções na lista lateral (1280 px) e no select (375 px); `?tab=billing` e `?tab=privacy` regravam
   para `?tab=profile`.
7. Segurança do admin abre sem requisição a `/account/sessions` nem a `/account/sign-in-methods/*`. Senha
   atual errada → `ACCOUNT_CURRENT_PASSWORD_INVALID`; senha certa → sessão encerrada e login com a nova.
8. Preferências: escuro + `en` → `/en/admin/account?tab=preferences`, mantido depois de recarregar.
9. Personificando: "Minha conta" vai para `/{locale}/account` com o aviso de só leitura;
   `/{locale}/admin/account` redireciona para `/{locale}`.
10. Suíte do app de novo: o handoff registrou instabilidade em `tableLoadMore.test.tsx` e
    `signInEmailLinkEntry.test.tsx` sob load average 18-22. Os dois arquivos não importam código desta feature.

## Correções aplicadas

- `docs/review-checklist.md` §1: `requireOwnAccountApi` na lista de guards, com a restrição de uso (rotas de
  `/account` que fazem sentido para o admin e upload pessoal).

## Raio de impacto

- Contrato HTTP: `GET`/`PUT /account`, `POST /account/password`, `POST /account/password/set` e `POST /files`
  sem `scope` passam a aceitar o admin sem personificação. Consumidores: a conta comum (`/account`), o
  `ProfileDropdown` (via `useMyAccount`, nos dois painéis) e o `useFileUpload` (avatar e foto de entidade).
- Componentes compartilhados da conta: `AccountTabs`, `AccountProfileForm`, `AccountSecurityForm`,
  `AccountPreferencesForm`, `accountTabRouting.ts`, `Navbar`, `ProfileDropdown`. Props novas opcionais, com o
  default de antes.
- SDK e design system intactos.

## Lacunas de teste

Vereditos sobre as três lacunas do handoff:

- `AdminAccountClient`/`page.tsx` sem teste de render: **continua aberta**. O encaixe (breadcrumb,
  `area="admin"`, prefetch com `getServerApiClient("admin")`) foi conferido lendo o código; o item 5 do
  `/test` cobre em runtime.
- `Navbar` repassando `accountPath` e o layout admin passando `/admin/account` sem teste próprio: **continua
  aberta**, baixo risco (repasse de prop). Item 5 do `/test`.
- Ausência de requisição a `/account/sessions` na área admin, só indireta: **continua aberta**. Item 7 do
  `/test`.

Nenhuma lacuna nova.

## Decisões em aberto

- **Nome da branch**: renomear a atual para `feat/admin-account-and-centered-forms` antes do primeiro commit
  (recomendado; a branch não tem remoto nem commit próprio).
- **Hunk compartilhado de `AccountSecurityForm.tsx`** (e, por extensão, os outros dois formulários):
  recomendo **commit misto**, sem `git add -p`. Os três formulários saem do commit 4 da feature anterior e
  entram inteiros no commit desta feature que liga as props, com a remoção de `flex-1` registrada no corpo da
  mensagem. Motivo: isolar exigiria `git add -p` com edição de hunk no `AccountSecurityForm` (o `s` não
  separa as linhas 80 e 81-83), e a política aceita misto nesse caso. Nenhum teste depende do `flex-1`, então
  o estado intermediário entre os dois commits continua verde.
- **Typecheck intermediário**: seguindo a ordem `api → app → internationalization`, os commits do app que
  leem `dictionary.apps.app.pages.admin.account` e `routes.platform.account` só passam no typecheck depois do
  commit de i18n. O PR inteiro passa. Se o usuário preferir cada commit verde, o i18n sobe para antes do app.

## Gates

| Comando | Resultado |
|---------|-----------|
| `pnpm check` | 1145 arquivos, sem erro |
| `pnpm --filter api typecheck` | sem erro |
| `pnpm --filter app typecheck` | sem erro |
| `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes, verde |
| Suítes Vitest | não rodadas aqui; números do handoff: api 1852/1852, app 1351/1351 com a instabilidade descrita no item 10 |

Varredura de segredo em `docs/features/admin-own-account/` e `docs/features/app-form-layout-centered/`: nenhuma
senha, token, chave ou e-mail real. Os screenshots de `app-form-layout-centered/test/e2e/` são ignorados pelo
`.gitignore` (`git check-ignore` confirma) e não entram no commit.

## Plano de commits

Plano combinado das duas features. Ordem: backlog, E2E, layout (feature anterior), API, app, i18n, docs,
artefatos. Antes do primeiro: `git diff --cached --stat` vazio.

1. `docs(specs): audit backlog against b7f9124`
   - `specs/BACKLOG.md`, `specs/reference/AUDIT.md`
   - `specs/features/account-security-mfa.md`, `specs/features/admin-own-account.md`,
     `specs/features/app-form-layout-centered.md`, `specs/features/signup-email-verification.md`,
     `specs/features/social-sign-in-providers.md`
   - `specs/reference/research/compliance-trust-baseline.md`, `specs/reference/research/object-storage-costs.md`,
     `specs/reference/research/saas-starter-feature-benchmark.md`
2. `test(e2e): retry action menu trigger until the row dropdown hydrates`
   - `apps/e2e/tests/focusNotObscured.spec.ts`
3. `feat(app): center the narrow page column`
   - `apps/app/shared/components/ui/pageLayout.ts`, `apps/app/__tests__/pageShell.test.tsx`
4. `feat(app): size full-page forms and account panels to their content`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/edit/[id]/EditEntityClient.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountBillingPanel.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPrivacyPanel.tsx`
5. `feat(app): add narrow loading skeletons to the create and edit form pages`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/loading.tsx`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/loading.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/loading.tsx`
   - `apps/app/__tests__/formLoadingSkeletons.test.tsx`
6. `docs(app): document centered narrow pages and content-height forms`
   - `apps/app/CLAUDE.md`
7. `feat(api): add requireOwnAccountApi guard for the caller's own account`
   - `apps/api/app/(guards)/common-panel.ts`
   - `apps/api/__tests__/ownAccountGuard.test.ts`, `apps/api/__tests__/impersonationReadOnly.test.ts`
8. `feat(api): open the own-account routes to the admin`
   - `apps/api/app/(routes)/account/route.ts`, `apps/api/app/(routes)/account/password/route.ts`,
     `apps/api/app/(routes)/account/password/set/route.ts`
   - `apps/api/__tests__/accountRoute.test.ts`, `apps/api/__tests__/accountPasswordRoute.test.ts`,
     `apps/api/__tests__/accountPasswordSetRoute.test.ts`, `apps/api/__tests__/accountSessionsRoute.test.ts`,
     `apps/api/__tests__/accountExportRoute.test.ts`, `apps/api/__tests__/accountDeletionRoute.test.ts`
9. `feat(api): route personal uploads through the own-account guard`
   - `apps/api/app/(routes)/files/route.ts`, `apps/api/__tests__/fileUploadRoute.test.ts`
10. `feat(app): let the account forms hide what the admin area does not offer` (misto; corpo da mensagem:
    "Also drops flex-1 from the three account forms so they size to their content.")
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm.tsx`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPreferencesForm.tsx`
    - `apps/app/__tests__/accountProfileFormEmail.test.tsx`, `apps/app/__tests__/accountSecurityForm.test.tsx`,
      `apps/app/__tests__/accountPreferencesForm.test.tsx`
11. `feat(app): add the admin section set to the account tabs`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/accountTabRouting.ts`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountTabs.tsx`
    - `apps/app/__tests__/accountTabRouting.test.ts`, `apps/app/__tests__/accountTabs.test.tsx`
12. `feat(app): add the admin account page`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/page.tsx`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/AdminAccountClient.tsx`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/loading.tsx`
    - `apps/app/shared/lib/panelTitles.ts`, `apps/app/__tests__/adminAccountPage.test.tsx`
13. `feat(app): point the admin navigation to the admin account`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/layout.tsx`,
      `apps/app/app/[locale]/(authenticated)/(admin)/admin/paths.ts`,
      `apps/app/app/[locale]/(authenticated)/(admin)/admin/routes.tsx`
    - `apps/app/shared/components/ui/Navbar.tsx`, `apps/app/shared/components/ui/ProfileDropdown.tsx`
    - `apps/app/__tests__/profileDropdownAccount.test.tsx`
14. `feat(internationalization): add the admin account copy`
    - `packages/internationalization/translations/apps/app/pages/admin/account.ts`
    - `packages/internationalization/translations/apps/app/pages/admin/index.ts`
    - `packages/internationalization/translations/apps/app/pages/admin/routes/index.ts`
15. `docs(api): list requireOwnAccountApi among the guards`
    - `apps/api/CLAUDE.md`
16. `docs: document the own-account guard in the auth panel and review checklist`
    - `docs/AUTH-PANEL.md`, `docs/review-checklist.md`
17. `docs(features): app-form-layout-centered`
    - `docs/features/app-form-layout-centered/` (os `.md`; os screenshots são ignorados)
18. `docs(features): admin-own-account`
    - `docs/features/admin-own-account/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
      `review/review.md`, mais o que o `/test` gravar)

Título de PR sugerido: `feat: admin own account area and centered form pages`.

Depois do último commit aprovado, o `/review` pergunta se deve rodar
`git push -u origin feat/admin-account-and-centered-forms`.

### Commits realizados

(preenchido pelo orquestrador)
