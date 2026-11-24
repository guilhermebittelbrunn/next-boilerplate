# Revisão: foco escondido pela barra fixa nos formulários de página inteira

## Branch

`feat/delivery-security-hardening`, reutilizada. É a branch da rodada do `/cycle`, criada e validada no começo dela.
Regex do padrão: `branch OK` (forma sem `project`, aceita para mudança em vários apps). Nada foi renomeado nem
criado.

## Revisão

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/e2e/tests/focusNotObscured.spec.ts`: o primeiro teste (Tab e Shift+Tab pelo formulário de criar) não tinha
  pré-condição. Se o formulário encolher a ponto de todos os campos caberem acima da barra, ele passa sem reproduzir
  nada. Os outros dois testes já conferiam a pré-condição antes de agir. **Corrigido**: o helper
  `fieldsStartingUnderActionBar` (`:70`) conta os controles fora das barras cujo topo começa abaixo da barra de
  ações, com a página no topo, e o teste exige pelo menos um (`:106-109`). Não rodei o E2E: sobe o stack, e isso é do
  `/test` (ver "Verificar no `/test`").

### 🟢 Sugestão / nit

- `apps/app/__tests__/focusNotObscuredScrollPadding.test.tsx:47-51`: o JSDoc estava em português, e os comentários
  de código do repo são em inglês. **Corrigido** (tradução, mesmo conteúdo).
- A barra do `Container` e o `PageFormFooter` usam `flex-wrap`. Se os rótulos quebrarem em duas linhas a 375 px
  (es é o idioma mais longo), a barra passa de 80 px e o foco volta a ficar parcialmente coberto. O handoff já lista
  como não medido; fica no "Verificar no `/test`".
- Desvio 3 do handoff (`textarea` longo com o cursor no fim, topo da caixa sob o `Navbar`): é comportamento do
  Chromium, que rola até o cursor e não até a caixa. O SC 2.4.11 no nível mínimo continua atendido, porque o cursor
  aparece. Não muda com `scroll-padding`. Fica registrado, sem correção.

### ✅ OK

- Correção na raiz, num lugar só: as duas classes ficam no `<html>` do root layout da `apps/app`
  (`apps/app/app/layout.tsx:71`), e cada barra publica um atributo (`Footer.tsx:55`, `Container.tsx:100`,
  `PageFormFooter.tsx:33`, `Navbar.tsx:22`). Nenhuma página foi tocada. São os únicos `sticky` do app fora do
  design system (conferido com `grep`).
- Degradação: o `has-[...]` vira uma regra própria com `:has()`. Navegador sem `:has()` descarta só essa regra e
  fica com o comportamento anterior, sem `scroll-padding`. Nada quebra.
- Não vaza: a `web` tem outro root layout e não recebe nada. No app, a folga só existe enquanto o atributo estiver
  no documento. Lista sem barra, blocos da conta (`Footer sticky={false}`, que não publica o atributo) e telas sem
  `Navbar` (login, cadastro) ficam no padrão. Como o `<html>` persiste entre navegações do App Router, o `:has()` é
  reavaliado ao vivo quando a barra entra ou sai.
- O comentário no layout (`:69-70`) explica o porquê dos 80 px e não cita o fluxo. É a exceção de "comportamento do
  navegador não evidente".
- T1 não passa no vazio: o primeiro caso exige os dois tamanhos `20` na fonte do layout, e os casos de atributo usam
  o seletor que a regex extraiu do próprio layout. Sem as classes, o caso 1 falha e os positivos falham (medido pelo
  `/develop`: 5 de 7 vermelhos). Renomear o atributo de um lado só derruba os positivos.
- T2 tem pré-condição nos três testes (com a correção acima), roda no projeto `chromium` (que não tem `testMatch` e
  pega todos os specs) e só lê a entidade do seed.
- `apps/app/CLAUDE.md`: a linha nova fica na seção "Formulários com ações no rodapé" e descreve a regra, com os
  testes que a guardam.
- Sem i18n, SDK, API ou env.

### 👁 Verificar no `/test`

- **Rodar `focusNotObscured.spec.ts`** com a pré-condição nova do primeiro teste. Esperado: 3/3 verdes. Se a
  pré-condição reprovar, a contagem de controles abaixo da barra com a página no topo é o número a registrar.
- **Admin (criar e editar usuário) e onboarding (dois passos)**, a 390×844 e 1280×720: Tab do primeiro campo até a
  barra e Shift+Tab de volta, medindo `getBoundingClientRect` do `document.activeElement` contra
  `[data-sticky-action-bar]` e `[data-panel-navbar]`. O E2E só cobre entidade a 375×812.
- **`scroll-padding` padrão onde não há barra**: `getComputedStyle(document.documentElement).scrollPaddingBottom` na
  lista de entidades e nos blocos da conta, e `scrollPaddingTop` no login. Repetir depois de sair de um formulário
  por navegação do App Router, sem recarregar. Esperado: `auto` nos casos sem a barra correspondente.
- **Barra numa linha a 375 px** nos três idiomas, claro e escuro: altura da barra de ações em 69 px. Acima de 80 px,
  o foco volta a ficar coberto.
- Teclado virtual, Safari e Firefox: continuam fora do alcance aqui.

## Correções aplicadas

- `apps/e2e/tests/focusNotObscured.spec.ts`: helper `fieldsStartingUnderActionBar` e a pré-condição no primeiro
  teste.
- `apps/app/__tests__/focusNotObscuredScrollPadding.test.tsx`: JSDoc traduzido para o inglês.

## Raio de impacto

- `Footer`, `Container`, `PageFormFooter` e `Navbar` ganham um atributo `data-*` vazio, sem mudança de API.
  Consumidores: todas as telas do painel, sem efeito visual.
- O `<html>` do app ganha `scroll-padding` condicional. Afeta qualquer rolagem até um alvo no documento (foco,
  âncora, `scrollIntoView`), sempre para o lado de não esconder o alvo atrás de uma barra.

## Lacunas de teste

| lacuna (origem) | veredito |
|-----------------|----------|
| E2E não cobre admin nem onboarding e não roda em `en`/`es` (handoff) | continua aberta; vai para o `/test` |
| T1 não mede a altura da barra; barra acima de 80 px só aparece no E2E e só nas telas dele (handoff) | continua aberta |
| Primeiro teste do E2E sem pré-condição (achado aqui) | fechada aqui |

## Decisões em aberto

Nenhuma.

## Gates

| gate | comando | resultado |
|------|---------|-----------|
| lint | `pnpm check` | 1127 arquivos, sem erro |
| typecheck | `pnpm turbo run typecheck --filter=app --filter=e2e` (sem `--force`) | 2/2 sem erro |
| T1 | `npx vitest run __tests__/focusNotObscuredScrollPadding.test.tsx` (em `apps/app`) | 7/7 |
| T2 | não rodado aqui (sobe o stack) | é do `/test` |

## Plano de commits combinado da rodada

Este plano substitui os anteriores. Os `review.md` das fatias 2 e 3 de `delivery-security-review`, de
`e2e-org-ownership-flake-and-web-api-url` e de `app-auth-refused-session-reload-loop` apontam para cá. Os 100
caminhos do `git status` aparecem uma vez cada (conferido com `comm` contra a lista do plano).

Antes do primeiro: `git diff --cached --stat` tem de sair vazio (saiu vazio nesta revisão). Depois de cada um:
`git show --stat --oneline HEAD` contra a lista. Marcação: `[2]` fatia 2, `[3]` fatia 3, `[E]` tarefa do E2E, `[R]`
sessão recusada (`app-auth-refused-session-reload-loop`), `[F]` esta tarefa.

1. `docs(specs): refresh backlog anchors and statuses after PR #73`
   `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/admin-own-account.md`,
   `specs/delivery-product-quality.md`, `specs/delivery-security-review.md`, `specs/social-sign-in-providers.md`
2. `[2]` `feat(shared): mark preference cookies Secure on HTTPS pages`
   `packages/shared/utils/helpers/cookies.ts`, `packages/shared/__tests__/cookies.test.ts`
3. `[2]` `fix(auth): log Firebase failures by error code instead of the raw error`
   `packages/auth/server.ts`, `packages/auth/__tests__/serverErrorLogging.test.ts`,
   `packages/auth/__tests__/serverSessionRevocation.test.ts`
4. `[2]` `feat(auth): require origin proof on every session route and cap the idToken`
   `packages/auth/session.ts`, `packages/auth/session-routes.ts`, `packages/auth/__tests__/sessionOrigin.test.ts`,
   `packages/auth/__tests__/sessionRoutesAuthority.test.ts`, `packages/auth/__tests__/sessionRefreshRoute.test.ts`
5. `[3]` `refactor(auth): remove the unused legacy sign-in component`
   `packages/auth/components/sign-in.tsx` (exclusão; `git add` no caminho apagado registra a remoção),
   `packages/auth/package.json`
6. `[R]` `fix(auth): sign out on a refused session cookie and add full-page post-login navigation`
   Corpo da mensagem: "Both changes live in provider.tsx and split only with git add -p. A refused session cookie
   now signs the Firebase client out instead of leaving it signed in, and the optional postLoginNavigation prop
   lets an app reach the destination with a full page load once the cookie is written."
   `packages/auth/provider.tsx`
7. `[R]` `feat(design-system): pass postLoginNavigation through to the AuthProvider`
   `packages/design-system/index.tsx`
8. `[3]` `feat(email): refuse loading the email entry point outside the server`
   `packages/email/index.ts`, `packages/email/__tests__/serverOnly.test.ts`,
   `packages/email/__tests__/credentials.test.ts`, `packages/email/__tests__/logPrivacy.test.ts`,
   `packages/email/__tests__/sendEmail.test.ts`
9. `[2]` `feat(api): refuse cookie-carried writes that arrive without Origin`
   `apps/api/(shared)/lib/cookie-write-origin.ts`, `apps/api/proxy.ts`, `apps/api/(shared)/lib/cors.ts`,
   `apps/api/__tests__/cookieWriteOrigin.test.ts`, `apps/api/__tests__/corsOrigin.test.ts`
10. `[2]` `feat(api): exit the process when the production boot fails`
    `apps/api/instrumentation.ts`, `apps/api/instrumentation-node.ts`, `apps/api/__tests__/corsOriginBoot.test.ts`,
    `apps/api/__tests__/instrumentation.test.ts`
11. `[2]` `fix(api): cap the admin-created user email at 320 characters`
    `apps/api/(shared)/validation/user-admin.schema.ts`, `apps/api/__tests__/usersRoute.test.ts`
12. `[3]` `refactor(api): extract the capped body reader from the JSON parser`
    `apps/api/(shared)/lib/read-capped-body.ts`, `apps/api/(shared)/lib/parse-request-json.ts`
13. `[3]` `feat(api): strip image metadata and cap chunked uploads while reading`
    `apps/api/(shared)/lib/image-metadata.ts`, `apps/api/(shared)/validation/file.schema.ts`,
    `apps/api/__tests__/imageMetadata.test.ts`, `apps/api/__tests__/uploadedImageValidation.test.ts`
14. `[3]` `feat(api): accept external photo and avatar URLs only from allowed hosts`
    `apps/api/(shared)/lib/entity-photo.ts`, `apps/api/app/(routes)/account/route.ts`,
    `apps/api/app/(routes)/entities/[id]/route.ts`, `apps/api/__tests__/entityPhotoReference.test.ts`,
    `apps/api/__tests__/accountAvatar.test.ts`, `apps/api/__tests__/accountRoute.test.ts`
15. `[2]` `fix(app): pass the request to sessionDELETE`
    `apps/app/app/api/auth/session/route.ts`
16. `[2]` `feat(app): give x-locale a 180-day max-age and Secure cookies on HTTPS`
    `apps/app/proxy.ts`, `apps/app/shared/lib/panelState.ts`, `apps/app/__tests__/proxy.test.ts`,
    `apps/app/__tests__/panelState.test.ts`
17. `[R]` `fix(app): navigate from the auth screens only once the session cookie is written`
    Corpo da mensagem: "The Google sign-in of both forms also moves from router.push to a full page load; it shares
    the form files with the redirect hook."
    `apps/app/shared/hooks/useSignedInRedirect.ts`,
    `apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx`,
    `apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx`,
    `apps/app/app/[locale]/(unauthenticated)/sign-in/email-link/components/EmailLinkCompletion.tsx`,
    `apps/app/__tests__/useSignedInRedirect.test.tsx`,
    `apps/app/__tests__/signInPersistedSessionRedirect.test.tsx` (apagado) e
    `apps/app/__tests__/authFormsPersistedSessionRedirect.test.tsx` (novo): `git add` nos dois caminhos, para o git
    registrar o rename
18. `[R]` `fix(app): load the panel as a full page after sign-in`
    `apps/app/shared/providers/AppDesignProvider.tsx`, `apps/app/shared/lib/googleSignInApi.ts`,
    `apps/app/__tests__/postLoginFullPageNavigation.test.tsx`
19. `[R]` `test(app): cover the provider sign-out when the session cookie is refused`
    `apps/app/__tests__/authProviderSessionNotEstablished.test.tsx`
20. `[F]` `fix(app): keep focused fields clear of the sticky bars`
    `apps/app/app/layout.tsx`, `apps/app/shared/components/ui/Footer.tsx`,
    `apps/app/shared/components/ui/Container.tsx`, `apps/app/shared/components/ui/PageFormFooter.tsx`,
    `apps/app/shared/components/ui/Navbar.tsx`, `apps/app/__tests__/focusNotObscuredScrollPadding.test.tsx`
21. `[R]+[F]` `docs(claude): record the post-login and sticky bar focus rules in the app guide`
    Corpo da mensagem: "apps/app/CLAUDE.md carries one rule from each of the two previous fixes: full-page
    navigation after sign-in, and the data attributes that keep focused fields clear of the sticky bars. Both go in
    one commit so the file needs no git add -p."
    `apps/app/CLAUDE.md`
22. `[2]` `fix(web): pass the request to sessionDELETE`
    `apps/web/app/api/auth/session/route.ts`
23. `[2]` `feat(web): give x-locale a 180-day max-age and Secure on HTTPS`
    `apps/web/proxy.ts`, `apps/web/__tests__/proxyLocale.test.ts`
24. `[3]` `fix(web): lock both sign-up buttons while any submission is pending`
    `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx`,
    `apps/web/__tests__/signUpFormSubmitLock.test.tsx`
25. `[E]` `fix(web): mount a single AuthProvider on the landing`
    `apps/web/app/[locale]/layout.tsx`, `apps/web/__tests__/rootLayoutAuthProvider.test.tsx`
26. `[R]` `fix(web): reset the sign-in attempt flag when the user signs out`
    `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx`,
    `apps/web/__tests__/signInFormRedirect.test.tsx`
27. `[E]` `test(e2e): wait for the invitations fetch before scanning the team page`
    `apps/e2e/tests/organizationOwnership.spec.ts`
28. `[E]` `test(e2e): give the landing the API URL and cover sign-out across apps`
    `apps/e2e/support/stackEnv.ts`, `apps/e2e/__tests__/stackEnv.test.ts`, `apps/e2e/tests/crossAppSignOut.spec.ts`,
    `apps/e2e/tests/global.setup.ts`
29. `[F]` `test(e2e): check that keyboard focus stays clear of the sticky bars on the entity forms`
    `apps/e2e/tests/focusNotObscured.spec.ts`
30. `[2]+[3]+[E]` `docs: describe origin checks, boot exit, upload metadata, photo hosts and cross-app sign-out`
    Corpo da mensagem: "Covers the documentation of the whole round in one commit: SECURITY.md,
    01-security-review.md, PRE-PRODUCTION.md and SETUP.md carry hunks from more than one change, and splitting
    them would need git add -p."
    `docs/AUTH-SSO.md`, `docs/BACKUP.md`, `docs/INCIDENT-RESPONSE.md`, `docs/PRE-PRODUCTION.md`, `docs/ROPA.md`,
    `docs/SECURITY.md`, `docs/SETUP.md`, `docs/SUBPROCESSORS.md`, `docs/delivery/01-security-review.md`
31. `docs(features): delivery-security-review-slice-2`
    `docs/features/delivery-security-review-slice-2/`
32. `docs(features): delivery-security-review-slice-3`
    `docs/features/delivery-security-review-slice-3/`
33. `docs(features): e2e-org-ownership-flake-and-web-api-url`
    `docs/features/e2e-org-ownership-flake-and-web-api-url/`
34. `docs(features): app-auth-refused-session-reload-loop`
    `docs/features/app-auth-refused-session-reload-loop/`
35. `docs(features): app-footer-focus-not-obscured`
    `docs/features/app-footer-focus-not-obscured/`

Notas de ordem:

- Entre o commit 4 e os commits 15 e 22, o typecheck do `app` e da `web` quebra (assinatura nova de
  `sessionDELETE`). O estado final é consistente.
- O commit 7 depende do 6 (o tipo `AuthProviderProps["postLoginNavigation"]`), e o 18 depende do 7 (a prop do
  `DesignSystemProvider`).
- O commit 13 depende do 12 (`file.schema.ts` importa `readCappedBody`).
- O commit 28 vem depois do 25: o segundo teste de `crossAppSignOut.spec.ts` reprova em strict mode com dois
  `AuthProvider` na landing.
- O commit 29 vem depois do 20: o spec procura os atributos `data-sticky-action-bar` e `data-panel-navbar`.
- O commit 19 testa o provider do commit 6, mas mora em `apps/app/__tests__` (o pacote não tem teste do provider).
  Fica num commit próprio da `app` para não misturar pacote e app.
- Os commits 6 e 17 juntam duas mudanças por arquivo, e o 21 junta as regras de duas tarefas no mesmo arquivo.
  Separar exigiria `git add -p`; o motivo vai no corpo de cada mensagem.
- `docs/SETUP.md` entra no commit 30: os dois hunks de cima são da fatia 2 e o de baixo (lista de fluxos da seção
  "Testes E2E") é da tarefa do E2E. Isolar exigiria `git add -p`, que a política dispensa registrando o motivo na
  mensagem.

Varredura de segredo nas cinco pastas de `docs/features/`: nenhuma senha, chave, token real ou e-mail de pessoa. Os
`user@example.com` são contas públicas do seed; as contas de QA citadas são `qa-…@example.com`, e os relatórios
dizem que a senha delas não foi gravada. A pasta desta tarefa não cita conta nenhuma.

Título de PR sugerido: `feat: delivery security review part 1 slices 2 and 3, E2E fixes, the refused-session loop
and focus under sticky bars`.

Commits realizados: _(preenchido pelo orquestrador)_
