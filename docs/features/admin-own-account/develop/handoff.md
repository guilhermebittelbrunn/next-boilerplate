# Handoff do develop: área de conta para o admin

Plano: `analyze/plan.md`. Rodada autônoma do `/cycle`. Nada commitado, nenhuma branch criada.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| §4.1 / §10.2 guard `requireOwnAccountApi` | `apps/api/app/(guards)/common-panel.ts` |
| §4.2 rotas de conta trocam de guard | `apps/api/app/(routes)/account/route.ts`, `account/password/route.ts`, `account/password/set/route.ts` (só o import e o nome do guard) |
| §4.3 `POST /files` por escopo | `apps/api/app/(routes)/files/route.ts` |
| §5.1 rota admin | `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/page.tsx`, `AdminAccountClient.tsx`, `loading.tsx` (novos) |
| §5.2 props nos componentes da conta | `account/(components)/accountTabRouting.ts`, `AccountTabs.tsx`, `AccountProfileForm.tsx`, `AccountSecurityForm.tsx`, `AccountPreferencesForm.tsx` |
| §5.3 navegação | `admin/layout.tsx`, `admin/paths.ts`, `admin/routes.tsx`, `apps/app/shared/components/ui/Navbar.tsx`, `ProfileDropdown.tsx`, `apps/app/shared/lib/panelTitles.ts` |
| §6 i18n | `packages/internationalization/translations/apps/app/pages/admin/account.ts` (novo), `admin/index.ts`, `admin/routes/index.ts` |
| §10.7 docs | `docs/AUTH-PANEL.md` (§3, tabela da §7 e lista de testes da §9), `apps/api/CLAUDE.md` (lista de guards) |
| §8 testes | ver "Testes" abaixo |

## Contrato

O SDK não mudou. A área do admin usa `account.me`, `account.update`, `account.changePassword`, `account.setPassword` e `file.upload`, que já existiam.

Mudou o conjunto de quem as rotas aceitam. `GET`/`PUT /account`, `POST /account/password`, `POST /account/password/set` e o `POST /files` pessoal passam a aceitar o admin sem personificação, sobre a própria conta. Quem consome essas rotas: a conta comum (`/account`), o `ProfileDropdown` (via `useMyAccount`) e o `useFileUpload` (avatar e foto de registro de entidade).

## Códigos de erro

Nenhum código novo. A recusa do guard novo reaproveita `COMMON_PANEL_FORBIDDEN`, que já tem texto nos três idiomas.

## Desvios em relação ao plano

1. O guard não virou fábrica exportada como `const`. O plano previa `export const requireCommonPanelApi = buildSubjectGuard(...)` e já indicava o fallback para o caso de a inferência do genérico atrapalhar. Usei o fallback direto: uma função interna `guardSubject(acceptsSubject, handler)` e dois `export function` genéricos (`requireCommonPanelApi` e `requireOwnAccountApi`) que delegam para ela. O motivo é o `plan.ts`, que faz `Parameters<typeof requireCommonPanelApi<TRouteContext>>[0]` (expressão de instanciação) e depende de `requireCommonPanelApi` continuar sendo uma função genérica declarada. Com isso nenhum chamador mudou. `pnpm --filter api typecheck` passou sem erro.
2. Testes além do T1 a T14: regressão do admin em `POST /account/sessions/revoke` (`accountPasswordRoute.test.ts`), `POST /account/sessions/revoke-others` (`accountSessionsRoute.test.ts`), `GET /account/export` (`accountExportRoute.test.ts`) e `POST /account/deletion` (`accountDeletionRoute.test.ts`), e a simetria da recusa de escrita sob personificação entre `requireCommonPanelApi` e `requireOwnAccountApi` (`impersonationReadOnly.test.ts`).
3. Em `accountPreferencesForm.test.tsx`, o mock de `useRouter` passou a usar um `pushMock` içado para o T11 conseguir ler a navegação. O teste existente segue igual.

Nenhum ponto do plano estava errado.

### Os dois riscos que o plano marcou

- **Inferência do genérico**: tratado no desvio 1.
- **Upload pessoal sem resolver organização**: o plano está certo. Por leitura, `resolveOrganizationMembership` (`apps/api/(shared)/lib/organization-membership.ts`) tem dois efeitos colaterais: cria o vínculo com a organização "home" no primeiro contato e reivindica entidades legadas. As duas coisas continuam acontecendo na primeira chamada de qualquer rota com `requireOrganizationApi` (entidades, organização, upload com `scope=organization`), então nada dependia do avatar para isso. O caminho do objeto pessoal é `uploads/<id do perfil>/…` e não usa a organização (`files/route.ts`). `organizationOwnerSegment` só aparece em `files/route.ts`, `account-erasure.ts` e `entity-photo.ts`, sempre no escopo de organização (`grep -rn organizationOwnerSegment apps/api`). Não existe quota de armazenamento no código (`grep -rni quota apps/api` só encontra códigos de erro do Identity Toolkit). O `storage.rules` nega tudo a cliente e a API usa conta de serviço, então as regras não mudam nada aqui. O caso pessoal antigo também não tinha `plan` no `requireOrganizationApi`, então nenhuma checagem de plano se perdeu. Dois testes travam o comportamento novo: `fileUploadRoute.test.ts` ("keeps a personal upload of a common user out of the organization" e "stores the avatar under the admin's own prefix" esperam `resolveOrganizationMembership` não chamado).

## Arquivos compartilhados com `app-form-layout-centered` (para o plano de commits)

Os três arquivos carregam mudanças das duas features. Linhas abaixo são do arquivo atual no disco (`git diff -U0`).

| Arquivo | Hunks desta feature | Hunk da feature anterior |
|---------|---------------------|--------------------------|
| `account/(components)/AccountProfileForm.tsx` | 32 (prop no tipo), 35-38 (assinatura com `allowEmailChange = true`), 166 (`allowEmailChange && canChangeEmail`), 177-178 e 182 (texto `unsupported` só com `allowEmailChange`), 185-192 (diálogo montado só com `allowEmailChange`) | 87 (`<form>` sem `flex-1`) |
| `account/(components)/AccountSecurityForm.tsx` | 39 (prop no tipo), 42-45 (assinatura com `passwordOnly = false`), 81-83 (`AccountSignInMethodsPanel` condicional), 129-185 (sessões e "Sair de todos" dentro de `passwordOnly ? null : (<>…</>)`, com reindentação) | 80 (wrapper sem `flex-1`) |
| `account/(components)/AccountPreferencesForm.tsx` | 42 (prop no tipo), 47 (`accountPath = "/account"`), 99 (`` `${accountPath}?tab=preferences` ``) | 115 (`<form>` sem `flex-1`) |

Atenção ao `AccountSecurityForm.tsx`: a linha 80 (anterior) e as 81-83 (desta) caem no mesmo hunk do `git diff`. O `git add -p` não separa com `s`; precisa de `e` (editar o hunk) ou de commitar a feature anterior primeiro. Os outros dois arquivos têm hunks separados.

Arquivos que só esta feature toca, mesmo estando perto da anterior: `AccountTabs.tsx`, `accountTabRouting.ts`, os testes `accountTabs.test.tsx`, `accountTabRouting.test.ts`, `accountSecurityForm.test.tsx`, `accountPreferencesForm.test.tsx`, `profileDropdownAccount.test.tsx` e os novos `accountProfileFormEmail.test.tsx` e `adminAccountPage.test.tsx`. Não toquei `formLoadingSkeletons.test.tsx`, `pageLayout.ts`, `AccountBillingPanel.tsx`, `AccountPrivacyPanel.tsx`, `pageShell.test.tsx`, `apps/app/CLAUDE.md`, as páginas de usuário/entidade nem `specs/`.

## Testes

Novos ou ampliados, todos Vitest com `vi.mock` (nenhum precisa de emulador):

- T1 `apps/api/__tests__/ownAccountGuard.test.ts` (novo, 9 casos)
- T2 `accountRoute.test.ts` (+4: admin lê, admin grava no próprio perfil e no próprio uid, id no body ignorado, alvo outro admin → `AUTH_REQUEST_ADMIN_TARGET_INVALID` sem gravar)
- T3 `accountPasswordRoute.test.ts` (+3: admin troca a própria senha, personificando → `AUTH_REQUEST_IMPERSONATION_READ_ONLY` sem conferir senha, admin em `sessions/revoke` → `COMMON_PANEL_FORBIDDEN`)
- T4 `accountPasswordSetRoute.test.ts` (+2)
- T5 `fileUploadRoute.test.ts` (+4: avatar do admin em `uploads/<id do admin>/`, admin com `scope=organization` → 403 sem gravar, escopo inválido → 400 antes de autenticar, upload pessoal do comum sem resolver organização)
- T6 `accountSessionsRoute.test.ts` (+2), mais `accountExportRoute.test.ts` (+1), `accountDeletionRoute.test.ts` (+1), `impersonationReadOnly.test.ts` (+1)
- T7 `apps/app/__tests__/accountTabRouting.test.ts` (+7)
- T8 `accountTabs.test.tsx` (+10)
- T9 `accountSecurityForm.test.tsx` (+3)
- T10 `accountProfileFormEmail.test.tsx` (novo, 3)
- T11 `accountPreferencesForm.test.tsx` (+2)
- T12 `profileDropdownAccount.test.tsx` (+2)
- T13 coberto pelo `panelTitles.test.ts` existente, que descobre toda `page.tsx` do painel e exige título nos três idiomas; passou com a rota nova
- T14 `adminAccountPage.test.tsx` (novo, 2)

## Validação

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter api test` | 130 arquivos, 1852 testes, todos verdes |
| `pnpm --filter app test` | 1.ª execução: 1351/1351 verdes, mas o vitest saiu com código 1 por um erro não tratado vindo de `tableLoadMore.test.tsx` (jsdom `_location` depois do teardown). 2.ª execução: 1 falha em `signInEmailLinkEntry.test.tsx` (não achou o link). Os dois arquivos passam isolados (`npx vitest run __tests__/signInEmailLinkEntry.test.tsx __tests__/tableLoadMore.test.tsx` → 9/9). A máquina estava com load average 18-22 (`uptime`) e a suíte levou 226 s. Nenhum dos dois arquivos importa código desta feature. Tratei como instabilidade sob carga; o `/test` deve rodar a suíte de novo |
| `pnpm --filter api typecheck` | sem erro |
| `pnpm --filter app typecheck` | sem erro |
| `pnpm check` | 1145 arquivos, sem erro |
| `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes, paridade verde |

Não rodei smoke local no navegador nem no `curl`: a API e o app não subiram nesta rodada.

## A verificar no `/test`

Nada de comportamento em runtime foi medido; tudo abaixo vem só dos testes unitários.

- "Minha conta" no menu do avatar do admin leva a `/{locale}/admin/account?tab=profile` sem redirecionar. Repro: login admin, abrir o avatar, clicar.
- O menu lateral do admin mostra "Minha conta" com o ícone de usuário e a aba do navegador mostra "Minha conta | <marca>".
- Lista lateral (1280 px) e select (375 px) com três seções; `?tab=billing` e `?tab=privacy` regravam para `?tab=profile`.
- Perfil: salvar nome e telefone persiste depois de recarregar; o primeiro nome muda no avatar. Upload de avatar com o bucket do emulador grava em `uploads/<id do perfil do admin>/` e a imagem aparece depois de recarregar.
- O bloco de e-mail do admin não tem botão nem texto de "não suportado".
- Segurança: só o formulário de senha; a aba de rede não mostra requisição a `/account/sessions` nem a `/account/sign-in-methods/*` ao abrir a seção. Senha atual errada → toast de `ACCOUNT_CURRENT_PASSWORD_INVALID`; senha certa → sessão encerrada e login com a senha nova.
- Preferências: escuro + `en` → URL `/en/admin/account?tab=preferences`, tema e idioma aplicados, e mantidos depois de recarregar e de sair e entrar.
- Personificação: "Minha conta" vai para `/{locale}/account` com aviso de só leitura; `/{locale}/admin/account` manda para `/{locale}`.
- Usuário comum: `/account` com as seções de antes, troca de e-mail, sessões e métodos de login presentes; salvar preferências volta para `/{locale}/account?tab=preferences`; upload de foto de registro de entidade (`scope=organization`) continua funcionando.
- API direta com o token do admin: `GET /account/sessions` → 403 `COMMON_PANEL_FORBIDDEN`; `PUT /account` com headers de personificação → 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY`; `PUT /account` com `x-request-user-id` de outro admin → 403.
- O `useMyAccount` do `ProfileDropdown` no painel admin deixa de receber 403 (antes recebia, por causa do guard comum). Repro: aba de rede no painel admin, requisição `GET /account` → 200.

## Lacunas de teste conhecidas

- Nenhum teste renderiza `AdminAccountClient` nem `page.tsx` da rota admin; o encaixe (breadcrumb, `area="admin"`, prefetch com `getServerApiClient("admin")`) só foi conferido lendo o código e no typecheck.
- `Navbar` repassando `accountPath` e o layout admin passando `"/admin/account"` não têm teste próprio; o T12 cobre só o `ProfileDropdown`.
- A ausência de requisição a `/account/sessions` na área do admin está coberta só indiretamente (o T9 prova que o `AccountSessionsPanel` não monta).

## Decisões em aberto

Nenhuma nova. As oito decisões do plano (D1 a D8) foram seguidas como estão. A D5 (import do grupo `(common)` dentro do `(admin)`) ficou como o plano previu e aparece em `AdminAccountClient.tsx`.
