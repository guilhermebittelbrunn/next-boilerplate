# Plano: área de conta para o admin (perfil, senha e preferências)

- **Spec:** [`specs/features/admin-own-account.md`](../../../../specs/features/admin-own-account.md) (`approved`, valor médio, esforço M)
- **Modo:** rodada autônoma do `/cycle`. Nenhuma pergunta feita; as decisões estão em "Perguntas em aberto (decididas por padrão)".
- **Apps impactados:** `apps/api`, `apps/app`, `packages/internationalization`, mais `docs/AUTH-PANEL.md` e uma linha do `apps/api/CLAUDE.md`. `packages/sdk` não muda.
- **Base:** o estado atual do disco, que já carrega a feature `app-form-layout-centered` sem commit. Os arquivos que as duas compartilham estão listados na §10.9.

## 1. Contexto, objetivo e corte

### 1.1 Problema (confirmado no código)

- "Minha conta" aponta para `/account` em qualquer painel (`apps/app/shared/components/ui/ProfileDropdown.tsx:65`).
- O layout comum devolve o admin que não está personificando para `/{locale}/admin`
  (`apps/app/app/[locale]/(authenticated)/(common)/layout.tsx:49-54`). A spec manda manter isso.
- O menu do admin tem só Usuários e Auditoria (`apps/app/app/[locale]/(authenticated)/(admin)/admin/routes.tsx:19-33`).
- Na API, `GET`/`PUT /account` (`apps/api/app/(routes)/account/route.ts:111`, `:121`), `POST /account/password`
  (`account/password/route.ts:22`) e `POST /account/password/set` (`account/password/set/route.ts:20`) passam por
  `requireCommonPanelApi`, que recusa com `403 COMMON_PANEL_FORBIDDEN` quando o sujeito não é `COMMON`
  (`apps/api/app/(guards)/common-panel.ts:77-82`).
- Lacuna que a spec não cita: o avatar sobe por `POST /files` (`AccountProfileForm.tsx:39` → `useFileUpload.ts:32`
  → `packages/sdk/src/actions/file/action.ts:28`), e essa rota usa `requireOrganizationApi`
  (`apps/api/app/(routes)/files/route.ts:17`), que é composto sobre o guard do painel comum
  (`apps/api/app/(guards)/organization.ts:50`). Sem mexer nela, o admin teria a tela de avatar e o upload
  recusado.

### 1.2 Objetivo

O admin abre "Minha conta" e cai numa área de conta dentro do painel admin, com Perfil, Segurança e Preferências.
Ele troca nome, telefone, avatar, senha (com a senha atual) e tema/idioma, e a API aceita isso só sobre a conta
dele.

### 1.3 Corte de MVP (da spec, sem alteração)

1. "Minha conta" leva o admin para `/{locale}/admin/account`, no mesmo layout de configurações da conta comum, e
   o menu do admin ganha a entrada.
2. Perfil: nome de exibição, telefone e avatar, com as mesmas regras da conta comum.
3. Senha: troca pedindo a senha atual, com a mesma política (`parseChangePassword`).
4. Preferências: tema e idioma salvos no perfil e aplicados no painel admin.
5. API: o admin só edita a própria conta por essas rotas; personificar um comum continua levando à conta comum.

### 1.4 Fora de escopo (da spec)

- Exportar dados e excluir a própria conta (`/account/export`, `/account/deletion`): continuam só no painel comum.
- Sessões ativas, métodos de login e troca de e-mail (`/account/sessions*`, `/account/sign-in-methods/*`,
  `/account/email`): continuam com `requireCommonPanelApi` e a UI do admin não mostra esses blocos.
- Cobrança e MFA.
- Onboarding (`/account/onboarding`): não se aplica ao admin e fica como está.

### 1.5 Classificação

- **Área do painel:** admin (tela nova) e comum (componentes compartilhados recebem props com default igual ao
  comportamento atual).
- **Modo de produto:** igual em `subscription` e `simple`. A lista de seções do admin não tem cobrança, então
  `isSubscriptionMode()` (`accountTabRouting.ts:15-17`) não interfere nela.
- **Plano/assinatura:** não depende.
- **Env nova, dependência nova, serviço pago:** nenhum.
- **Genérico × específico:** tudo em `apps/*`; nada entra em `packages/*` além das chaves de i18n.

### 1.6 Pré-requisitos manuais de infra

Nenhum. Não há índice, regra do Firestore, regra do Storage, env ou webhook novo. O avatar do admin cai em
`uploads/<id do perfil do admin>/…`, o mesmo formato do usuário comum (`files/route.ts:36-40`), e o bucket só é
acessado pela API (`storage.rules:7`).

## 2. Dados (Firestore)

N/A para forma de documento. O admin já tem documento em `user` com `type: "admin"`; `phone`, `avatar` e
`preferences` são os mesmos campos que o `PUT /account` grava para o comum (`account/route.ts:144-152`). Documento
de admin sem `preferences` lê os defaults de `resolvePreferences` (`apps/api/(shared)/lib/account-avatar.ts`), que
já trata ausência. Sem backfill, sem índice, sem consulta nova. `getMergedUserByFirestoreDocId` não filtra por tipo
(`apps/api/(shared)/lib/user-merge.ts`), então lê o admin como lê o comum.

## 3. Contrato `@repo/sdk`

Nenhuma mudança. A área do admin usa as actions que já existem: `account.me`, `account.update`,
`account.changePassword`, `account.setPassword` (`packages/sdk/src/actions/account/action.ts`) e `file.upload`
(`packages/sdk/src/actions/file/action.ts`). O contexto do cliente no painel admin é `admin`
(`packages/sdk/src/client/index.ts`, `changeToAdminContext`), e os headers `x-*` resultantes são aceitos pelo guard
novo (§4.1).

## 4. API

### 4.1 Guard: `requireOwnAccountApi` (novo, em `common-panel.ts`)

Hoje o `requireCommonPanelApi` faz, em ordem: ator → perfil do ator → `resolveAuthRequestContext` → recusa de
escrita sob personificação → perfil do sujeito → exige `COMMON` → registra atividade e sessão de personificação →
handler (`common-panel.ts:36-114`). A única diferença do guard novo é a regra de quem pode ser sujeito.

Proposta: extrair o corpo para uma função interna `buildSubjectGuard(acceptsSubject)` no mesmo arquivo e exportar
dois guards:

- `requireCommonPanelApi`: aceita sujeito `COMMON`. Comportamento idêntico ao atual.
- `requireOwnAccountApi`: aceita sujeito `COMMON` (titular ou personificado, como hoje) **ou** sujeito `ADMIN` que
  é o próprio ator (`subject.reference_id === userRecord.uid` e `!isImpersonating`). Qualquer outro caso responde
  `403 COMMON_PANEL_FORBIDDEN`.

O contexto entregue ao handler é o mesmo `CommonPanelAuthContext` (`user`, `authRequest`, `subjectProfile`), então
os handlers das rotas não mudam de corpo, só de guard.

Por que isso não abre brecha (cada passo já existe e continua antes da regra nova):

| Cenário | O que barra | Onde |
|---------|-------------|------|
| Admin tenta agir sobre outro admin com `x-request-role: admin` | `AUTH_REQUEST_ADMIN_TARGET_INVALID` | `auth-request-context.ts:61-64` |
| Admin aponta `x-request-user-id` para outro admin com papel comum | `AUTH_REQUEST_IMPERSONATION_TARGET_INVALID` | `auth-request-context.ts:71-74` |
| Comum tenta personificar | `AUTH_REQUEST_IMPERSONATION_FORBIDDEN` | `auth-request-context.ts:50-52` |
| Admin personificando faz `PUT`/`POST` (trocar senha, avatar, preferências do personificado) | `AUTH_REQUEST_IMPERSONATION_READ_ONLY` | `impersonation-read-only.ts:23-30`, chamado antes do sujeito |
| Id no body | ignorado: o dono vem de `ctx.subjectProfile.id` e `ctx.user.uid` | `account/route.ts:133`, `password/route.ts:58` |
| Sujeito `ADMIN` diferente do ator (não deveria ocorrer depois dos passos acima) | checagem explícita no guard novo, `403 COMMON_PANEL_FORBIDDEN` | guard novo |

O admin personificando continua lendo a conta do personificado (`GET /account` com sujeito `COMMON`), e o guard
segue gravando a sessão de personificação (`common-panel.ts:92-101`). Isso cobre o item 5 do corte.

`requireCommonPanelApi` não afrouxa: todas as rotas que ficam com ele (organização, entidades, notificações,
sessões, export, deleção, e-mail, métodos de login, onboarding) continuam recusando o admin sem personificação.
O teste `commonPanelGuard.test.ts:154` ("refuses an admin who drops the impersonation headers") trava isso.

### 4.2 Rotas que trocam de guard

| Rota | Antes | Depois | Observação |
|------|-------|--------|------------|
| `GET /account` (`account/route.ts:111`) | `requireCommonPanelApi` | `requireOwnAccountApi` | corpo inalterado |
| `PUT /account` (`account/route.ts:121`) | `requireCommonPanelApi` | `requireOwnAccountApi` | corpo inalterado |
| `POST /account/password` (`password/route.ts:22`) | `requireCommonPanelApi` | `requireOwnAccountApi` | corpo inalterado; usa `ctx.user`, que para o admin sem personificação é ele mesmo |
| `POST /account/password/set` (`password/set/route.ts:20`) | `requireCommonPanelApi` | `requireOwnAccountApi` | corpo inalterado; já recusa quando `subjectProfile.reference_id !== ctx.user.uid` (`:21-26`). Ver decisão D3 |
| `POST /files` (`files/route.ts:17`) | `requireOrganizationApi` | escopo `personal` → `requireOwnAccountApi`; escopo `organization` → `requireOrganizationApi` | ver §4.3 |

### 4.3 `POST /files`: separar por escopo

O avatar sobe sem `scope`, que vale `personal` (`file.schema.ts:198-204`), e só a foto de registro usa
`organization`. A rota passa a ler o escopo primeiro e despachar para um de dois handlers guardados, que
compartilham a gravação:

```ts
async function storeUpload(req: NextRequest, ownerSegment: string): Promise<Response> {
    if (!isStorageConfigured()) { /* 503 STORAGE_NOT_CONFIGURED, como hoje */ }
    const parsed = await parseUploadedImage(req);
    if (!parsed.ok) return parsed.response;
    // putObject + signReadUrl + 201 / 503 UPLOAD_FAILED, como hoje (files/route.ts:35-58)
}

const uploadPersonal = requireOwnAccountApi((req, ctx) =>
    storeUpload(req, ctx.subjectProfile.id)
);

const uploadForOrganization = requireOrganizationApi((req, ctx) =>
    storeUpload(req, organizationOwnerSegment(ctx.organization.organizationId))
);

export const POST = (req: NextRequest) => {
    const scope = parseUploadScope(req);
    if (!scope.ok) return scope.response;
    return scope.value === "organization" ? uploadForOrganization(req) : uploadPersonal(req);
};
```

Mudanças de comportamento, todas pequenas e registradas:

- Escopo inválido passa a responder `400 VALIDATION_FAILED` antes da autenticação (hoje vem depois do guard e do
  teste de bucket). O teste `fileUploadRoute.test.ts:216` já espera 400 sem ler o corpo, então continua valendo.
  Responder 400 antes de 401 não vaza nada: o parâmetro é público.
- O upload pessoal do usuário comum deixa de resolver a organização (`resolveOrganizationMembership`). O caminho do
  arquivo nunca dependeu dela (`files/route.ts:36-39`).
- Admin com `?scope=organization` recebe `403 COMMON_PANEL_FORBIDDEN`, como hoje.

### 4.4 Validação

Sem schema novo. `parseUpdateAccount`, `parseChangePassword` e `parseSetPassword`
(`apps/api/(shared)/validation/account.schema.ts`) já são a política da conta comum, e o admin passa pelas mesmas.

### 4.5 Erros

Nenhum código novo. A recusa do guard novo reaproveita `COMMON_PANEL_FORBIDDEN`, cuja mensagem já é genérica
("Esta ação não está disponível para o seu perfil.", `translations/packages/shared/utils.ts:113-114`, com en e es).

| `error.code` | Status | Quando, nesta feature |
|--------------|--------|------------------------|
| `AUTH_INVALID_TOKEN` | 401 | sem credencial |
| `COMMON_PANEL_FORBIDDEN` | 403 | sem perfil, ou sujeito admin que não é o ator; admin em rota que ficou no painel comum |
| `AUTH_REQUEST_IMPERSONATION_READ_ONLY` | 403 | escrita durante personificação |
| `AUTH_REQUEST_ADMIN_TARGET_INVALID` | 403 | admin apontando para outro admin |
| `ACCOUNT_CURRENT_PASSWORD_INVALID` | 400/401 conforme `statusForAuthErrorCode` | senha atual errada (já existe) |
| `ACCOUNT_AVATAR_INVALID` | 400 | avatar fora do prefixo do admin ou de host não permitido (já existe) |

## 5. Front (`apps/app`)

### 5.1 Rota nova

`apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/`, no padrão da auditoria
(`admin/(pages)/audit/(pages)/(home)/page.tsx`):

- `page.tsx`: Server Component, `generateMetadata = panelPageMetadata("/admin/account")`, prefetch de
  `queryKeys.account.me()` com `getServerApiClient("admin")` dentro de `if (!(await isImpersonating()))`, e
  `HydrationBoundary` em volta do cliente.
- `AdminAccountClient.tsx`: cópia enxuta do `AccountClient.tsx` comum (`account/(pages)/(home)/AccountClient.tsx`)
  com breadcrumb de `ADMIN_ROUTES(...).root`, `Container width="narrow" contentOnly`, `PageHeader` com o título e o
  subtítulo da conta comum, e `<AccountTabs account={account} area="admin" />` dentro de `Suspense`.
- `loading.tsx`: `PageSkeleton description width="narrow"` com três itens de navegação em vez de cinco. A coluna
  estreita centralizada vem do `PAGE_NARROW_CLASS` que a feature anterior ajustou (`pageLayout.ts:3`), sem nada a
  fazer aqui.

O layout admin já exige admin (`requireAdmin`) e manda para `/{locale}` quem está personificando
(`admin/layout.tsx:41-47`), então a tela nunca abre sob personificação.

### 5.2 Componentes da conta comum reaproveitados

Todas as props novas têm default igual ao comportamento atual, então a tela comum não muda.

| Arquivo | Mudança |
|---------|---------|
| `account/(components)/accountTabRouting.ts` | `adminAccountTabValues = ["profile", "security", "preferences"]`; `resolveAccountTab(raw, allowed = accountTabValues)` |
| `account/(components)/AccountTabs.tsx` | prop `area?: "common" \| "admin"` (default `"common"`). Com `"admin"`: lista `adminAccountTabValues`; descrição da seção Segurança vem de `admin.account.sections.security`; passa `allowEmailChange={false}` ao perfil, `passwordOnly` à segurança e `accountPath="/admin/account"` às preferências |
| `account/(components)/AccountProfileForm.tsx` | prop `allowEmailChange?: boolean` (default `true`). Com `false`, o bloco de e-mail mostra o endereço só leitura, sem botão de troca nem o texto `emailChange.unsupported`, e o `AccountEmailChangeDialog` não é montado |
| `account/(components)/AccountSecurityForm.tsx` | prop `passwordOnly?: boolean` (default `false`). Com `true`, não monta `AccountSignInMethodsPanel`, `AccountSessionsPanel` nem o bloco "Sair de todos os dispositivos". O `AccountSessionsPanel` consulta `/account/sessions` ao montar, que recusa o admin; por isso ele não pode ficar só escondido |
| `account/(components)/AccountPreferencesForm.tsx` | prop `accountPath?: string` (default `"/account"`), usada no `router.push(withLocalePath(values.locale, \`${accountPath}?tab=preferences\`))` que hoje fixa `/account` (`AccountPreferencesForm.tsx:94-99`) |

A importação cruza grupos de rota: o admin importa de
`@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountTabs`. Ver decisão D5.

O tema e o idioma valem no painel admin depois de salvar pelo mesmo mecanismo da conta comum: o formulário grava os
cookies `x-locale` e o do tema antes de navegar (`AccountPreferencesForm.tsx:87-93`), e o login projeta as
preferências salvas em qualquer painel (`apps/app/shared/lib/postLoginNavigation.ts:59-73`, que manda o admin para
`/{preferredLocale}/admin`, `:92-93`).

### 5.3 Navegação

- `admin/paths.ts`: `account: { label: admin.routes.platform.account, url: buildPath("/admin/account") }`.
- `admin/routes.tsx`: terceiro item do menu, ícone `UserIcon` do `lucide-react` (já usado no `ProfileDropdown`).
- `shared/lib/panelTitles.ts`: `"/admin/account": (dictionary) => dictionary.apps.app.pages.admin.routes.platform.account`.
- "Minha conta": `ProfileDropdown` ganha a prop `accountPath = "/account"`; `Navbar` repassa uma prop `accountPath`
  opcional; o layout admin renderiza `<Navbar accountPath="/admin/account" />` (`admin/layout.tsx:52`). O layout
  comum não muda, então quem personifica continua indo para `/account`. Ver decisão D4.

### 5.4 Dados

Sem `queryKey` nova: `queryKeys.account.me()` (`apps/app/shared/lib/queryKeys.ts:14`) e o `useMyAccount` existente.
A troca de painel já descarta o cache (`AuthRequestPanelContext.tsx:186-195`), então a conta do admin e a do
personificado não se misturam. Efeito colateral bom: no painel admin o `useMyAccount` do `ProfileDropdown` deixa de
receber 403 e passa a mostrar o nome e o avatar salvos.

## 6. i18n

Chaves novas, mesma estrutura nos três idiomas:

```
apps.app.pages.admin.routes.platform.account      (translations/apps/app/pages/admin/routes/index.ts)
apps.app.pages.admin.account.sections.security    (translations/apps/app/pages/admin/account.ts, registrado em admin/index.ts)
```

| Chave | pt-br | en | es |
|-------|-------|----|----|
| `routes.platform.account` | Minha conta | My account | Mi cuenta |
| `account.sections.security` | A senha que você usa para entrar no painel. | The password you use to sign in to the panel. | La contraseña que usas para entrar al panel. |

O resto do texto vem do dicionário da conta comum (`translations/apps/app/pages/common/account.ts`). Sem
`apiErrors` novo. A paridade fica com o teste `packages/internationalization/__tests__/parity.test.ts`.

## 7. Autorização e segurança

- A regra entra na API (guard, §4.1). A UI só espelha: o layout admin exige admin e expulsa personificação, e os
  blocos fora do corte não são montados.
- Personificação: o admin personificando não vê a área do admin; vê a conta do personificado no painel comum, só
  leitura (`ImpersonationReadOnlyNotice` em `AccountTabs.tsx:130`), e a API recusa toda escrita.
- Senha: `POST /account/password` confirma a senha atual com `identitySignInWithPassword(ctx.user.email, …)` e
  troca a de `ctx.user.uid` (`password/route.ts:33-60`). Para o admin sem personificação, `ctx.user` é o próprio
  admin. Sob personificação a rota nunca chega ao handler.
- A troca de senha revoga todas as sessões da conta (`password/route.ts:68-70`) e o formulário faz `signOut`
  (`AccountSecurityForm.tsx:65-73`). Vale igual para o admin.
- Auditoria: `ACCOUNT_PASSWORD_CHANGE` passa a aparecer também com o admin como ator e alvo
  (`password/route.ts:72-81`). Nada a mudar no registro.
- Nenhum dado sensível novo em DTO ou log. Rate limit e regras do Firestore sem ajuste.

## 8. Testes

Todos unitários (Vitest, `vi.mock` do repositório, do resolvedor de ator e dos provedores). Nenhum precisa de
emulador: o objeto é a decisão do guard e do handler, não o Firestore nem o Storage.

| # | Arquivo | Nível | O que prova |
|---|---------|-------|-------------|
| T1 | `apps/api/__tests__/ownAccountGuard.test.ts` (novo, no molde de `commonPanelGuard.test.ts`) | guard | comum titular passa com o próprio perfil; admin sem personificação passa com `subjectProfile` = o próprio admin; admin personificando lê (`GET`) com sujeito comum e grava a sessão de personificação; admin personificando com `PUT`/`POST` recebe `AUTH_REQUEST_IMPERSONATION_READ_ONLY`; admin apontando para outro admin recebe `AUTH_REQUEST_ADMIN_TARGET_INVALID` ou `AUTH_REQUEST_IMPERSONATION_TARGET_INVALID`; sem perfil recebe `COMMON_PANEL_FORBIDDEN`; sem credencial, 401 |
| T2 | `apps/api/__tests__/accountRoute.test.ts` | rota | admin lê a própria conta; `PUT` do admin grava em `id` do perfil dele e chama `updateUser` com o uid dele, ignorando um id no body |
| T3 | `apps/api/__tests__/accountPasswordRoute.test.ts` | rota | admin troca a própria senha (senha atual conferida contra o e-mail dele, `updateUser` no uid dele, sessões revogadas); o caso de personificação existente (`:255`) continua 403 |
| T4 | `apps/api/__tests__/accountPasswordSetRoute.test.ts` | rota | admin sem provedor de senha define a senha; o caso de personificação existente (`:315`) continua 403 |
| T5 | `apps/api/__tests__/fileUploadRoute.test.ts` | rota | admin sobe avatar sem escopo e o objeto cai em `uploads/<id do admin>/`; admin com `?scope=organization` recebe `COMMON_PANEL_FORBIDDEN` sem gravar; os casos existentes seguem verdes |
| T6 | `apps/api/__tests__/accountSessionsRoute.test.ts` | rota | regressão: admin sem personificação em `GET /account/sessions` continua 403 `COMMON_PANEL_FORBIDDEN` (rota fora do corte) |
| T7 | `apps/app/__tests__/accountTabRouting.test.ts` | unit | `resolveAccountTab` com a lista do admin manda `billing`, `privacy` e valor inválido para `profile` |
| T8 | `apps/app/__tests__/accountTabs.test.tsx` | componente | `area="admin"` mostra três seções na lista e no select, e a descrição de Segurança do admin |
| T9 | `apps/app/__tests__/accountSecurityForm.test.tsx` | componente | `passwordOnly` não renderiza métodos de login, sessões nem "Sair de todos os dispositivos", e mantém a troca de senha |
| T10 | `apps/app/__tests__/accountProfileFormEmail.test.tsx` (novo) | componente | `allowEmailChange={false}` mostra o e-mail sem o botão de troca; o default mantém o botão |
| T11 | `apps/app/__tests__/accountPreferencesForm.test.tsx` | componente | com `accountPath="/admin/account"`, salvar navega para `/{locale}/admin/account?tab=preferences` |
| T12 | `apps/app/__tests__/profileDropdownAccount.test.tsx` | componente | `accountPath` muda o `href` de "Minha conta"; sem a prop continua `/account` |
| T13 | `apps/app/__tests__/panelTitles.test.ts` | unit | `/admin/account` tem título nos três idiomas |
| T14 | `apps/app/__tests__/adminAccountPage.test.tsx` (novo) | componente | o `loading.tsx` do admin usa a coluna estreita centralizada (`max-w-4xl` + `mx-auto`). Fica num arquivo próprio para não tocar `formLoadingSkeletons.test.tsx`, que é da feature anterior e ainda não tem commit |

Comandos: `pnpm --filter api test`, `pnpm --filter app test`, `pnpm --filter @repo/internationalization test`.

## 9. O que o `/test` vai percorrer

Contas: o admin e o usuário comum do seed do emulador (`pnpm --filter e2e` / `firebase-emulator-seed`). Conta de QA
nova, se precisar, com e-mail `qa-admin-own-account@example.com`, listada no relatório para limpeza. Nenhuma senha
vai para arquivo.

Fluxos:

1. **Admin abre a conta.** Login como admin → `/{locale}/admin` → avatar → "Minha conta" → URL
   `/{locale}/admin/account?tab=profile`, sem redirecionar para a home. O menu lateral mostra "Minha conta" e leva
   ao mesmo lugar.
2. **Seções do admin.** Lista lateral (1280 px) e select (375 px) com Perfil, Segurança e Preferências, sem
   Cobrança nem Privacidade. `?tab=billing` e `?tab=privacy` caem em Perfil.
3. **Perfil.** Trocar nome e telefone, salvar, recarregar: persistiu, e o nome no menu do avatar mudou. Subir um
   avatar (com bucket do emulador ligado), salvar, recarregar: a imagem aparece no formulário e no menu. O bloco de
   e-mail não tem botão de troca.
4. **Senha.** Senha atual errada → toast traduzido de `ACCOUNT_CURRENT_PASSWORD_INVALID`. Confirmação diferente →
   erro de formulário sem requisição. Senha certa → sucesso, sessão encerrada, login com a senha nova funciona.
   A seção não mostra métodos de login, sessões nem "Sair de todos os dispositivos".
5. **Preferências.** Trocar para escuro e para `en`, salvar: a URL vira `/en/admin/account?tab=preferences`, o
   painel fica escuro e em inglês, e continua assim depois de recarregar.
6. **Personificação.** Como admin, personificar um comum → "Minha conta" leva a `/{locale}/account` com os dados
   do personificado, aviso de só leitura e botões desabilitados. Digitar `/{locale}/admin/account` na barra manda
   para `/{locale}`.
7. **Usuário comum, sem mudança.** Login como comum → "Minha conta" → `/account` com as cinco (ou quatro, em
   `simple`) seções de antes; troca de e-mail, sessões e métodos de login presentes. `/admin/account` redireciona
   como qualquer rota admin.
8. **API direta (curl ou console).** Com o token do admin: `GET /account/sessions` → 403 `COMMON_PANEL_FORBIDDEN`;
   `PUT /account` com headers de personificação → 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY`; `PUT /account` com
   `x-request-user-id` de outro admin → 403.

Combinações: claro e escuro, 375 px e 1280 px, pt-br/en/es nos fluxos 1, 2, 3 e 5. Os fluxos 4, 6, 7 e 8 em um
idioma bastam.

Não observável sem infra externa: upload de avatar contra bucket real (no emulador é observável) e e-mail de troca
de senha (não existe).

## 10. Blueprint técnico

### 10.1 Contrato

Sem mudança no SDK. Assinaturas usadas:

```ts
apiClient.account.me(): Promise<AccountDTO>
apiClient.account.update(body: UpdateAccountRequest): Promise<AccountDTO>
apiClient.account.changePassword(body: ChangePasswordRequest): Promise<AccountConfirmation>
apiClient.account.setPassword(body: SetPasswordRequest): Promise<AccountConfirmation>
apiClient.file.upload(file: File, options?: UploadFileOptions): Promise<UploadedFileDTO>
```

### 10.2 Guard

```ts
// apps/api/app/(guards)/common-panel.ts
type SubjectCheck = (args: {
    subject: UserDTO;
    actorUid: string;
    isImpersonating: boolean;
}) => boolean;

function buildSubjectGuard(acceptsSubject: SubjectCheck) {
    return function guard<TRouteContext extends RouteContext = undefined>(
        handler: CommonPanelHandler<TRouteContext>
    ) {
        return async (req: NextRequest, routeContext?: TRouteContext) => {
            // corpo atual de requireCommonPanelApi (linhas 36-113), com a linha 77 trocada por:
            // if (!subjectProfile || !acceptsSubject({ subject: subjectProfile, actorUid: userRecord.uid,
            //     isImpersonating: resolved.data.isImpersonating })) → 403 COMMON_PANEL_FORBIDDEN
        };
    };
}

export const requireCommonPanelApi = buildSubjectGuard(
    ({ subject }) => subject.type === UserType.COMMON
);

export const requireOwnAccountApi = buildSubjectGuard(
    ({ subject, actorUid, isImpersonating }) =>
        subject.type === UserType.COMMON ||
        (subject.type === UserType.ADMIN && !isImpersonating && subject.reference_id === actorUid)
);
```

Pontos de atenção:

- O genérico `<TRouteContext>` precisa continuar funcionando nos chamadores que usam
  `requireCommonPanelApi<RouteIdParamsContext>` (`account/sessions/[id]/route.ts:28`,
  `sign-in-methods/[id]/route.ts:55`) e no `requireOrganizationApi` (`organization.ts:50`). Se a fábrica atrapalhar
  a inferência, o `desenvolvedor` mantém `requireCommonPanelApi` como função nomeada que delega para a fábrica.
- O comentário do porquê do `recordUserActivity(actorProfile)` (`common-panel.ts:85-87`) e o da sessão de
  personificação (`:89-90`) acompanham o corpo movido, sem texto novo.
- O comentário do tipo `subjectProfile` (`common-panel.ts:18`) passa a dizer "perfil Firestore do sujeito em
  contexto (titular, personificado ou o próprio admin nas rotas de conta)".

### 10.3 Exemplos

`PUT /account` como admin, sem personificação (headers do painel admin: `x-user-role: admin`,
`x-request-role: admin`, `x-request-user-id` = uid do admin):

```json
{ "displayName": "Ana Admin", "phone": "+55 11 90000-0000", "avatar": "uploads/<admin-profile-id>/3f2c.webp",
  "preferences": { "theme": "dark", "locale": "en" } }
```

Resposta 200:

```json
{ "data": { "id": "<admin-profile-id>", "type": "admin", "displayName": "Ana Admin", "phone": "+55 11 90000-0000",
  "avatar": "uploads/<admin-profile-id>/3f2c.webp", "avatarUrl": "https://…signed…",
  "preferences": { "theme": "dark", "locale": "en" }, "planAccess": { "…": "…" } } }
```

`PUT /account` do mesmo admin com `x-request-role: common` e `x-request-user-id` de um comum:
`403 { "error": { "code": "AUTH_REQUEST_IMPERSONATION_READ_ONLY" } }`.

`GET /account/sessions` como admin sem personificação: `403 { "error": { "code": "COMMON_PANEL_FORBIDDEN" } }`.

### 10.4 Persistência

Sem mudança: `userRepository.update({ id: ownerId, ...patch })` (`account/route.ts:90`) e
`getAuthInstance().updateUser(uid, …)`.

### 10.5 Árvore de arquivos do front

```
apps/app/app/[locale]/(authenticated)/(admin)/admin/
  layout.tsx                                   (editar: <Navbar accountPath="/admin/account" />)
  paths.ts                                     (editar: account)
  routes.tsx                                   (editar: item "Minha conta")
  (pages)/account/(pages)/(home)/
    page.tsx                                   (novo)
    AdminAccountClient.tsx                     (novo)
    loading.tsx                                (novo)
apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/
  accountTabRouting.ts                         (editar)
  AccountTabs.tsx                              (editar)
  AccountProfileForm.tsx                       (editar, compartilhado com a feature anterior)
  AccountSecurityForm.tsx                      (editar, compartilhado com a feature anterior)
  AccountPreferencesForm.tsx                   (editar, compartilhado com a feature anterior)
apps/app/shared/components/ui/
  Navbar.tsx                                   (editar: prop accountPath)
  ProfileDropdown.tsx                          (editar: prop accountPath)
apps/app/shared/lib/panelTitles.ts             (editar)
```

Campos dos formulários: os mesmos da conta comum (`HookFormInput` para nome e telefone, `HookFormImageUpload` ou
`HookFormInput type="url"` para avatar conforme `isStorageEnabled()`, `HookFormInputPassword` para as senhas,
`HookFormRadioGroup` e `HookFormSelect` para tema e idioma).

### 10.6 Pseudo-diffs

```diff
// AccountTabs.tsx
 type AccountTabsProps = {
     account: AccountDTO | undefined;
+    area?: "common" | "admin";
 };
-export function AccountTabs({ account }: AccountTabsProps) {
+export function AccountTabs({ account, area = "common" }: AccountTabsProps) {
+    const isAdminArea = area === "admin";
+    const tabValues = isAdminArea ? adminAccountTabValues : accountTabValues;
+    const sectionDescriptions = isAdminArea
+        ? { ...accountCopy.sections, ...dictionary.apps.app.pages.admin.account.sections }
+        : accountCopy.sections;
-    const activeTab = resolveAccountTab(requestedTab);
+    const activeTab = resolveAccountTab(requestedTab, tabValues);
     ...
-        profile: <AccountProfileForm account={account} />,
-        security: <AccountSecurityForm account={account} />,
-        preferences: <AccountPreferencesForm account={account} />,
+        profile: <AccountProfileForm account={account} allowEmailChange={!isAdminArea} />,
+        security: <AccountSecurityForm account={account} passwordOnly={isAdminArea} />,
+        preferences: (
+            <AccountPreferencesForm
+                account={account}
+                accountPath={isAdminArea ? "/admin/account" : "/account"}
+            />
+        ),
     ...
-                {accountTabValues.map((value) => (
+                {tabValues.map((value) => (
```

O mapa `sectionContent` continua com as cinco chaves; só os valores de `tabValues` viram `TabsContent`. Criar o
elemento JSX de `billing` e `privacy` não monta o componente, então os hooks deles (planos, export) não rodam no
admin. O teste T8 confirma que nenhuma requisição dessas seções sai.

```diff
// AccountSecurityForm.tsx (o wrapper sem flex-1 da feature anterior fica como está)
-export function AccountSecurityForm({ account }: AccountSecurityFormProps) {
+export function AccountSecurityForm({ account, passwordOnly = false }: AccountSecurityFormProps) {
     ...
         <div className="flex w-full flex-col gap-6">
-            <AccountSignInMethodsPanel account={account} />
+            {passwordOnly ? null : <AccountSignInMethodsPanel account={account} />}
             {lacksPasswordProvider(account) ? <AccountPasswordSetForm /> : (...)}
-            <AccountSessionsPanel />
-            <SettingsSection ...signOutEverywhere...>
+            {passwordOnly ? null : (
+                <>
+                    <AccountSessionsPanel />
+                    <SettingsSection ...signOutEverywhere...>...</SettingsSection>
+                </>
+            )}
```

```diff
// AccountProfileForm.tsx (o <form> sem flex-1 da feature anterior fica como está)
-export function AccountProfileForm({ account }: AccountProfileFormProps) {
+export function AccountProfileForm({ account, allowEmailChange = true }: AccountProfileFormProps) {
     ...
-                    {canChangeEmail ? (<Button …/>) : (<p …unsupported…/>)}
+                    {allowEmailChange && (canChangeEmail ? (<Button …/>) : (<p …unsupported…/>))}
     ...
-            <AccountEmailChangeDialog … />
+            {allowEmailChange && <AccountEmailChangeDialog … />}
```

```diff
// AccountPreferencesForm.tsx (o <form> sem flex-1 da feature anterior fica como está)
 type AccountPreferencesFormProps = {
     account: AccountDTO | undefined;
+    accountPath?: string;
 };
-                    router.push(withLocalePath(values.locale, "/account?tab=preferences"));
+                    router.push(withLocalePath(values.locale, `${accountPath}?tab=preferences`));
```

```diff
// ProfileDropdown.tsx
-export default function ProfileDropdown() {
+export default function ProfileDropdown({ accountPath = "/account" }: { accountPath?: string }) {
-                        <Link href={withLocalePath(locale, "/account")}>
+                        <Link href={withLocalePath(locale, accountPath)}>
```

```diff
// account/route.ts, password/route.ts, password/set/route.ts
-import { requireCommonPanelApi } from "@/app/(guards)/common-panel";
+import { requireOwnAccountApi } from "@/app/(guards)/common-panel";
-export const GET = requireCommonPanelApi(async (_req, ctx) => {
+export const GET = requireOwnAccountApi(async (_req, ctx) => {
```

### 10.7 Documentação

- `docs/AUTH-PANEL.md`: na seção dos guards e na tabela de códigos (`:207-213`), descrever o
  `requireOwnAccountApi`, as quatro rotas de conta e o upload pessoal que o usam, e a regra "sujeito comum ou o
  próprio admin, nunca outro admin, escrita só sem personificação". Manter explícito que `requireCommonPanelApi`
  continua recusando o admin.
- `apps/api/CLAUDE.md`, seção "Camadas", lista de guards: acrescentar `requireOwnAccountApi` (conta da própria
  pessoa, aceita admin sem personificação).

### 10.8 Ordem de implementação e commits

1. `apps/api`: guard (`common-panel.ts`) + T1 → `feat(api): add own-account guard for common users and admins`.
2. `apps/api`: troca de guard nas rotas de conta + T2, T3, T4, T6 → `feat(api): let admins edit their own account`.
3. `apps/api`: `POST /files` por escopo + T5 → `feat(api): route personal uploads through the own-account guard`.
4. `apps/app`: props nos componentes da conta + T7–T11 → `feat(app): make account sections configurable per panel`.
   Esses arquivos carregam também as mudanças da feature anterior (§10.9).
5. `apps/app`: rota admin, menu, título, `Navbar`/`ProfileDropdown` + T12–T14 → `feat(app): add account area to the admin panel`.
6. `packages/internationalization`: chaves novas → `feat(internationalization): add admin account labels`.
7. `docs`: `AUTH-PANEL.md` e `apps/api/CLAUDE.md` → `docs: document the own-account guard`.
8. `docs(features): admin-own-account`.

Env nova: nenhuma. O fork não precisa configurar nada.

### 10.9 Arquivos compartilhados com `app-form-layout-centered` (sem commit no working tree)

Mudam nas duas features; o plano de commits precisa separar com `git add -p` ou commitar a feature anterior antes:

| Arquivo | Mudança da feature anterior | Mudança desta |
|---------|-----------------------------|----------------|
| `account/(components)/AccountProfileForm.tsx` | `<form>` sem `flex-1` (linha 83) | prop `allowEmailChange` |
| `account/(components)/AccountSecurityForm.tsx` | wrapper sem `flex-1` (linha 76) | prop `passwordOnly` |
| `account/(components)/AccountPreferencesForm.tsx` | `<form>` sem `flex-1` (linha 113) | prop `accountPath` |

Arquivos desta feature que leem algo da anterior sem editá-lo: `pageLayout.ts` (`PAGE_NARROW_CLASS` com
`mx-auto`) e o `PageSkeleton`, usados pelo `loading.tsx` novo. `formLoadingSkeletons.test.tsx` (não rastreado, da
anterior) não é tocado: o teste do esqueleto do admin fica em `adminAccountPage.test.tsx`. `AccountBillingPanel.tsx`
e `AccountPrivacyPanel.tsx` não são tocados.

## 11. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **"Minha conta" leva o admin para a área de conta do painel admin**
  Logado como admin sem personificação, o item "Minha conta" do menu do avatar aponta para `/{locale}/admin/account` e abre a tela sem redirecionar para `/{locale}/admin`. O menu lateral do admin tem a entrada "Minha conta" (My account, Mi cuenta) que leva ao mesmo endereço, e a aba do navegador mostra o título da página com a marca.

- [ ] **A área do admin tem só Perfil, Segurança e Preferências**
  A navegação lateral (desktop) e o select (mobile) listam exatamente três seções, nos modos `subscription` e `simple`. Abrir `?tab=billing`, `?tab=privacy`, `?tab=xyz` ou sem `tab` cai em Perfil e regrava a URL para `?tab=profile`, preservando outros parâmetros, como na conta comum.

- [ ] **O admin edita nome e telefone e o valor persiste**
  Salvar nome e telefone mostra o toast de perfil atualizado, e depois de recarregar os campos trazem os valores novos e o menu do avatar mostra o primeiro nome novo. Nome vazio ou só com espaços é barrado pelo formulário com a mensagem traduzida, sem requisição. Telefone vazio grava `null`.

- [ ] **O admin troca o avatar com as mesmas regras da conta comum**
  Com bucket configurado, o upload grava o objeto em `uploads/<id do perfil do admin>/` e o `PUT /account` aceita a referência; depois de recarregar a imagem aparece no formulário e no menu do avatar. Uma referência de outro prefixo ou de host fora da lista permitida responde `400 ACCOUNT_AVATAR_INVALID` com a mensagem traduzida. Sem bucket, o campo vira URL com a dica, como na conta comum, e o upload responde `503 STORAGE_NOT_CONFIGURED`.

- [ ] **O admin não troca o e-mail pela área dele**
  O bloco de e-mail mostra o endereço só leitura, sem o botão de troca e sem o texto de "não suportado". A rota `POST /account/email` continua recusando o admin sem personificação com `403 COMMON_PANEL_FORBIDDEN`.

- [ ] **O admin troca a própria senha pedindo a senha atual**
  A seção Segurança mostra só o formulário de senha (senha atual, nova, confirmação). Senha atual errada responde `ACCOUNT_CURRENT_PASSWORD_INVALID` com toast traduzido nos três idiomas e nada muda; confirmação diferente ou senha fora da política é barrada antes da requisição. Com tudo certo, a senha muda, todas as sessões da conta são encerradas, o navegador sai, e o login com a senha nova funciona. Clique duplo no salvar não envia duas trocas, porque o botão fica em carregamento.

- [ ] **Admin sem senha (só Google) define uma senha**
  Para um admin cuja conta não tem o provedor de senha, a seção Segurança mostra o formulário de definir senha no lugar da troca. A definição exige o reauth do Google e passa pelas mesmas recusas da conta comum (`ACCOUNT_REAUTH_INVALID`, `ACCOUNT_PASSWORD_ALREADY_SET`).

- [ ] **A área do admin não mostra sessões, métodos de login nem "Sair de todos os dispositivos"**
  Nenhum desses blocos é montado, e o navegador não faz requisição a `/account/sessions` nem a `/account/sign-in-methods/*` ao abrir a seção. As rotas continuam recusando o admin com `403 COMMON_PANEL_FORBIDDEN`.

- [ ] **Tema e idioma salvos valem no painel admin**
  Trocar para tema escuro e idioma `en` e salvar mostra o toast, navega para `/en/admin/account?tab=preferences` e aplica o tema e o idioma. Depois de recarregar, e depois de sair e entrar de novo, o admin cai em `/en/admin` com tema escuro.

- [ ] **A API aceita o admin só sobre a própria conta**
  Com o token de um admin, `GET`/`PUT /account`, `POST /account/password` e `POST /account/password/set` operam só sobre o perfil e o uid dele; um id no body é ignorado. Apontar `x-request-user-id` para outro admin responde `403 AUTH_REQUEST_ADMIN_TARGET_INVALID` (papel admin) ou `403 AUTH_REQUEST_IMPERSONATION_TARGET_INVALID` (papel comum), e nada é gravado.

- [ ] **Personificar continua levando à conta comum, só leitura**
  Como admin personificando um comum, "Minha conta" leva a `/{locale}/account` com os dados do personificado, o aviso de só leitura e os botões desabilitados. Qualquer escrita nas rotas de conta (`PUT /account`, `POST /account/password`, `POST /files`) responde `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY` sem gravar, e digitar `/{locale}/admin/account` manda para `/{locale}`.

- [ ] **O painel comum continua fechado ao admin**
  Admin sem personificação que digita `/{locale}/account` continua sendo levado para `/{locale}/admin`. Nas rotas da API que seguem no painel comum (entidades, organização, notificações, sessões, export, deleção, e-mail, métodos de login, onboarding, upload com `?scope=organization`), o admin sem personificação continua recebendo `403 COMMON_PANEL_FORBIDDEN`.

- [ ] **O usuário comum não percebe mudança**
  O comum continua em `/{locale}/account` com as mesmas seções de antes (cinco em `subscription`, quatro em `simple`), troca de e-mail, métodos de login, sessões, "Sair de todos os dispositivos", exportar e excluir conta. O upload de avatar e de foto de registro continua funcionando, e salvar preferências navega para `/{locale}/account?tab=preferences`.

- [ ] **Sem credencial a API responde 401**
  Sem token, as rotas de conta e o upload pessoal respondem `401 AUTH_INVALID_TOKEN`. Um escopo de upload inválido responde `400 VALIDATION_FAILED` antes de ler o corpo, com ou sem credencial.

- [ ] **Texto traduzido, tema e responsivo**
  Nenhum texto novo fica fora de `@repo/internationalization`, e as chaves novas existem em pt-br, en e es (teste de paridade verde). A área do admin é legível em claro e escuro, a 375 px (select de seção, sem rolagem horizontal) e a 1280 px (lista lateral, coluna estreita centralizada), e o esqueleto de carregamento ocupa a mesma coluna.

## Perguntas em aberto (decididas por padrão)

**D1. Reaproveitar as rotas `/account` ou criar rotas próprias do admin?**
Opções: (a) guard novo nas rotas existentes; (b) rotas `/admin/account*` com `requireAdminApi`.
Adotada: (a), como a spec recomenda. Evita duplicar validação, regra de avatar e política de senha. A §4.1 mostra
que o acesso das rotas do painel comum não aumenta, porque o guard novo só entra em quatro rotas de conta e no
upload pessoal.

**D2. Sessões ativas entram?**
Adotada: não, como a spec recomenda. Entram com a fatia 3 de `account-security-mfa`.

**D3. `POST /account/password/set` entra no guard novo?**
Opções: (a) entra; (b) fica no painel comum e a seção Segurança do admin sem senha fica vazia.
Adotada: (a). Um comum promovido a admin pode ter entrado só pelo Google, e sem isso ele não teria como pôr senha.
A rota já recusa quando o sujeito não é o ator (`password/set/route.ts:21-26`) e exige reauth recente do Google,
então o risco é o mesmo da conta comum. Se preferir manter métodos de login totalmente fora, a alternativa é (b),
com um texto explicando que a conta entra só pelo Google.

**D4. Como "Minha conta" escolhe o destino?**
Opções: (a) prop `accountPath` passada pelo layout admin via `Navbar`; (b) `ProfileDropdown` lê o painel do
`useAuthRequestPanel()`.
Adotada: (a). O layout admin só renderiza sem personificação (`admin/layout.tsx:45-47`), então a decisão fica no
servidor, sem depender do estado do cliente, e os testes atuais do `ProfileDropdown` não precisam mockar o provedor
do painel.

**D5. Importar os componentes da conta comum do grupo `(admin)` ou mover para `shared/`?**
Opções: (a) importar de `(common)/(pages)/account/(components)` com o alias `@/app/...`; (b) mover para
`apps/app/shared/components/account/`.
Adotada: (a). Mover arrastaria três arquivos que carregam mudanças sem commit da feature anterior e espalharia o
diff por todos os imports da conta comum. Não há precedente de import entre grupos no app, então isso fica como
dívida pequena: se um terceiro consumidor aparecer, mover para `shared/`.

**D6. Código de erro novo para a recusa do guard novo?**
Adotada: não. `COMMON_PANEL_FORBIDDEN` já tem copy genérica nos três idiomas e só aparece em caso que a UI não
produz (perfil sumido no meio da requisição).

**D7. `POST /files`: um guard só ou despacho por escopo?**
Opções: (a) despachar por escopo (pessoal → guard de conta, organização → guard de organização); (b) rota nova
`/account/avatar`.
Adotada: (a). Não muda o SDK nem o `useFileUpload`, e mantém um único caminho de gravação. A ordem de recusa muda
só para escopo inválido (400 antes de 401), registrada na §4.3.

**D8. Descrição da seção Segurança no admin**
A descrição comum fala de métodos de login e sessões abertas, que o admin não tem aqui. Adotada: chave própria
`admin.account.sections.security`. Perfil e Preferências reaproveitam as descrições comuns, que servem para os dois.

## Referências não lidas

Nenhuma. A spec não aponta link externo além da nota `specs/reference/research/settings-page-patterns.md`, que trata
do formato da página de configurações e não muda o corte.
