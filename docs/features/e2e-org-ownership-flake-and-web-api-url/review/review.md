# Revisão: E2E instável de `organizationOwnership` e a `web` sem `NEXT_PUBLIC_API_URL`

Rodou dentro do `/cycle`, sem perguntas. Fontes: [`analyze/plan.md`](../analyze/plan.md),
[`develop/handoff.md`](../develop/handoff.md) e o diff desta tarefa, que está no mesmo working tree das fatias 2 e 3
de `delivery-security-review`. Nada foi commitado.

## Branch

- **`feat/delivery-security-hardening`**, a mesma da rodada, criada pelo `/review` da fatia 2. Não troquei nem
  criei outra. Regex do `/review`: `branch OK: feat/delivery-security-hardening`.

## Revisão

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `apps/web/app/[locale]/layout.tsx` é uma correção de produto fora do plano, que dizia que nenhum código de produto
  mudava. O desvio está registrado no handoff com medição (duas assinaturas de `onIdTokenChanged`, chamadas de
  sessão dobradas, toast duplicado) e vai num commit `fix(web)` próprio. Concordo com a escolha: trocar a asserção
  por `.first()` esconderia o defeito.
- Nenhum teste de unidade fixa que a `web` monta um `AuthProvider` só. A cobertura é indireta, pelo strict mode do
  `getByText(sessionEndedNotice)` em `crossAppSignOut.spec.ts`. Lacuna registrada, sem correção.

### ✅ OK

- **O teste não foi afrouxado.** `apps/e2e/playwright.config.ts` e `apps/e2e/support/a11y.ts` não mudaram
  (`retries: isCi ? 1 : 0`, `failOnFlakyTests: isCi`). A chamada a `expectAccessible` no spec continua com as
  mesmas opções; nenhuma regra do axe nem item de allowlist entrou. As duas esperas de opacidade continuam, e
  ganharam `toBeEnabled()` antes.
- **A espera nova ataca a causa do plano** (`plan.md` §1.2). A tabela de convites não é pré-carregada no servidor,
  e `useAuthorizedQuery` (`apps/app/shared/hooks/useAuthorizedQuery.ts:29-34`) segura a busca até o SDK ter o
  token. Antes disso a consulta fica ociosa, com o botão habilitado e opacidade 1, igual ao estado "já buscou".
  Por isso a espera de opacidade sozinha passava cedo. O `waitForResponse` da `GET /organization/invitations` é
  registrado **antes** do `reload` (`organizationOwnership.spec.ts:165-170`), então não perde uma resposta rápida,
  e o `expect(...ok())` vem antes das esperas de opacidade. Depois da resposta, `toBeEnabled` e
  `toHaveCSS("opacity", "1")` cobrem a transição de volta. A tabela de membros não refaz a busca no cliente (o
  plano mediu no trace: nenhuma `GET /organization/members` depois do `reload`).
- **Remoção do `AuthProvider` interno da `web`**, por leitura:
  - o `DesignSystemProvider` (`packages/design-system/index.tsx:37-51`) monta `AuthProviderWithAlerts`, que monta
    o mesmo `AuthProvider` de `@repo/auth/provider`, envolvendo `TooltipProvider` e os filhos. Header, rodapé,
    `ClientLayout` e as páginas continuam dentro dele;
  - props: o externo passa `getRedirectPath = /${getDictionary().locale}`; o interno não passava nada e caía em
    `/${locale}` do `useDictionary()` (`packages/auth/provider.tsx:143`). As duas leituras vêm do mesmo
    `LocaleProvider`. O `onError` do externo não é lido pelo `AuthProvider` (a desestruturação em
    `provider.tsx:126-130` não o inclui). `resolveDefaultPostLoginPath` fica `undefined` nos dois, porque a `web`
    não passa essa prop ao `DesignSystemProvider`;
  - o `AuthProvider` não recebe autoridade de sessão nem URL por prop; os dois leem o mesmo módulo. Os refs de
    proteção (`bootstrapAttemptedRef`, `sessionEndHandledRef`) são por instância, e era justamente a segunda
    instância que dobrava as chamadas;
  - os cinco consumidores de `useAuth` na `web` (`clientLayout.tsx`, `header/index.tsx`, `sign-in-form-client.tsx`,
    `sign-up-form-client.tsx`, `contact-form-client.tsx`) pegavam o contexto mais interno e agora pegam o externo,
    com o mesmo tipo. O `signInStartedHereRef` é um ref local do formulário de login
    (`sign-in-form-client.tsx:31`), não do provider, e não muda;
  - a `apps/app` não tem o padrão: nenhum `<AuthProvider>` fora do `DesignSystemProvider` (`rg AuthProvider` em
    `apps/app` só acha `GoogleAuthProvider`);
  - `<ClientLayout> {children} </ClientLayout>` em uma linha equivale ao `{" "}{children}{" "}` de antes, que o
    formatador reescreveu.
- **`NEXT_PUBLIC_API_URL` na `web` do E2E** (`apps/e2e/support/stackEnv.ts:85-87`): só a pilha do E2E muda; nenhum
  fork precisa configurar nada. O comentário explica por que `NEXT_PUBLIC_APP_URL` fica vazia. `stackEnv.test.ts`
  fixa os dois valores.
- **Spec novo** (`crossAppSignOut.spec.ts`): contexto novo por teste, fechado no `finally`; espera o `DELETE
  /api/auth/session` com `ok()` antes de seguir; o locator do "Entrar" é restrito ao `banner` com `exact: true`.
  Só roda no projeto `chromium` (o `mobile` filtra por `CRITICAL_FLOWS`). Usa a conta pública do seed.
- **Interação com a fatia 2**: os `fetch` de sessão do navegador mandam `Origin`, então a checagem nova das rotas de
  sessão não afeta o spec. Isso já está na lista do `/test` da fatia 2.
- **Comentários**: os dois novos explicam porquê e não citam o fluxo.
- **Achado do backlog** "Dois `AuthProvider` aninhados na web e a tela vazia do `signInStartedHereRef`"
  (`specs/BACKLOG.md:319`, detalhe em `:1353` e `:1354`):
  - **fecha** a parte dos dois providers na landing: a assinatura dupla do token, o bootstrap de SSO, a renovação
    do cookie e o `POST /api/auth/session` em dobro por provider, além do toast repetido;
  - **continua aberta** a ampliação de 2026-10-22 da linha `:1353`: dois `POST /api/auth/session` por conclusão do
    link na `apps/app`, que monta um provider só. Pela leitura, um vem do `onAuthSuccess` e outro do observador do
    token, e essa duplicação não some tirando um provider;
  - **continua aberta** a linha `:1354`, a tela vazia do `signInStartedHereRef` quando o cookie é recusado, e o laço
    de recarga com a sessão recusada (linha 4 da fila, `:287`). Os dois moram em `packages/auth/provider.tsx` e nos
    formulários, que esta tarefa não toca.

  Atualizar o `BACKLOG.md` é do `/spec --sync`; o arquivo está modificado pela auditoria e não foi tocado aqui.

### 👁 Verificar no `/test`

1. **Login pela landing com um provider só.** Entrar em `/pt-br/sign-in` da `web` com a conta comum do seed, por
   senha: toast de sucesso uma vez, destino certo, e no painel de rede **um** `POST /api/auth/session`. Repetir com
   o Google, se houver como no emulador; se aparecerem dois, conferir se é o par `onAuthSuccess` + observador (caso
   aberto do backlog) e não um segundo provider.
2. **Carga da landing com sessão vinda da app**: uma `POST /api/auth/custom-token` e no máximo uma
   `POST /api/auth/session/refresh` por carga (o handoff viu isso no log do servidor de uma execução com trace).
3. **Toast de erro na landing**: senha errada no login da `web` mostra o toast uma vez. Inferido pelo código.
4. **Ordem no trace** (V4 do plano): `organizationOwnership.spec.ts` com `--trace on`; no contexto do convidado, a
   `GET /organization/invitations` termina antes do `axe.runPartial`.
5. **Suíte E2E inteira** (V2): `pnpm e2e` uma vez, para confirmar que os testes novos não derrubam a sessão do seed
   usada por `entityCrud`, `panelSwitch` e os outros.
6. **Estabilidade**: o `--repeat-each=6` do handoff rodou com a pilha aquecida. Se der, uma execução com a pilha
   fria; quebra por tempo sob `next dev` frio é o achado já conhecido e não reprova.

## Correções aplicadas

Nenhuma. Nada que a leitura apontou pedia mudança.

## Raio de impacto

- `apps/web`: um `AuthProvider` em vez de dois. Mesmos consumidores, mesmo contexto, mesmas props efetivas.
- `apps/e2e`: a `web` da pilha passa a receber `NEXT_PUBLIC_API_URL`, o que liga o fim de sessão pela API na
  landing durante o E2E. Nenhum DTO, action, rota, `error.code` ou chave de i18n muda.

## Lacunas de teste

| lacuna (do handoff) | veredito |
|---------------------|----------|
| Nenhum teste de unidade fixa um `AuthProvider` só na `web` | continua aberta; cobertura indireta pelo strict mode do spec novo |
| Quebras por tempo sob `next dev` frio do mesmo spec | fora de escopo (backlog, linha 1648) |

## Decisões em aberto

Nenhuma.

## Gates

| gate | comando | resultado |
|------|---------|-----------|
| lint/format | `pnpm check` | `Checked 1121 files in 612ms. No fixes applied.` |
| typecheck | `pnpm turbo run typecheck --filter=e2e --filter=web` | `Tasks: 2 successful, 2 total` |
| i18n | não rodado | nenhuma chave nova |
| suíte | não rodada | é do `/test`; nada foi alterado aqui |

## Plano de commits combinado da rodada

> **Substituído.** Outras tarefas entraram na rodada e o plano foi recomposto com 35 commits em
> `docs/features/app-footer-focus-not-obscured/review/review.md`. Execute aquele; este fica como histórico. A
> recomposição leva `apps/web/__tests__/rootLayoutAuthProvider.test.tsx` para o commit
> `fix(web): mount a single AuthProvider on the landing`, como o `/test` desta tarefa pediu.

Fatia 2 e fatia 3 de `delivery-security-review` mais esta tarefa. Os `review.md` das duas fatias apontam para cá.
Mais tarefas diretas podem entrar; se entrarem, o plano é recomposto de novo.

Antes do primeiro: `git diff --cached --stat` tem de sair vazio. Depois de cada um: `git show --stat --oneline HEAD`
contra a lista. Marcação: `[2]` fatia 2, `[3]` fatia 3, `[E]` esta tarefa.

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
6. `[3]` `feat(email): refuse loading the email entry point outside the server`
   `packages/email/index.ts`, `packages/email/__tests__/serverOnly.test.ts`,
   `packages/email/__tests__/credentials.test.ts`, `packages/email/__tests__/logPrivacy.test.ts`,
   `packages/email/__tests__/sendEmail.test.ts`
7. `[2]` `feat(api): refuse cookie-carried writes that arrive without Origin`
   `apps/api/(shared)/lib/cookie-write-origin.ts`, `apps/api/proxy.ts`, `apps/api/(shared)/lib/cors.ts`,
   `apps/api/__tests__/cookieWriteOrigin.test.ts`, `apps/api/__tests__/corsOrigin.test.ts`
8. `[2]` `feat(api): exit the process when the production boot fails`
   `apps/api/instrumentation.ts`, `apps/api/instrumentation-node.ts`, `apps/api/__tests__/corsOriginBoot.test.ts`,
   `apps/api/__tests__/instrumentation.test.ts`
9. `[2]` `fix(api): cap the admin-created user email at 320 characters`
   `apps/api/(shared)/validation/user-admin.schema.ts`, `apps/api/__tests__/usersRoute.test.ts`
10. `[3]` `refactor(api): extract the capped body reader from the JSON parser`
    `apps/api/(shared)/lib/read-capped-body.ts`, `apps/api/(shared)/lib/parse-request-json.ts`
11. `[3]` `feat(api): strip image metadata and cap chunked uploads while reading`
    `apps/api/(shared)/lib/image-metadata.ts`, `apps/api/(shared)/validation/file.schema.ts`,
    `apps/api/__tests__/imageMetadata.test.ts`, `apps/api/__tests__/uploadedImageValidation.test.ts`
12. `[3]` `feat(api): accept external photo and avatar URLs only from allowed hosts`
    `apps/api/(shared)/lib/entity-photo.ts`, `apps/api/app/(routes)/account/route.ts`,
    `apps/api/app/(routes)/entities/[id]/route.ts`, `apps/api/__tests__/entityPhotoReference.test.ts`,
    `apps/api/__tests__/accountAvatar.test.ts`, `apps/api/__tests__/accountRoute.test.ts`
13. `[2]` `fix(app): pass the request to sessionDELETE`
    `apps/app/app/api/auth/session/route.ts`
14. `[2]` `feat(app): give x-locale a 180-day max-age and Secure cookies on HTTPS`
    `apps/app/proxy.ts`, `apps/app/shared/lib/panelState.ts`, `apps/app/__tests__/proxy.test.ts`,
    `apps/app/__tests__/panelState.test.ts`
15. `[2]` `fix(web): pass the request to sessionDELETE`
    `apps/web/app/api/auth/session/route.ts`
16. `[2]` `feat(web): give x-locale a 180-day max-age and Secure on HTTPS`
    `apps/web/proxy.ts`, `apps/web/__tests__/proxyLocale.test.ts`
17. `[3]` `fix(web): lock both sign-up buttons while any submission is pending`
    `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx`,
    `apps/web/__tests__/signUpFormSubmitLock.test.tsx`
18. `[E]` `fix(web): mount a single AuthProvider on the landing`
    `apps/web/app/[locale]/layout.tsx`
19. `[E]` `test(e2e): wait for the invitations fetch before scanning the team page`
    `apps/e2e/tests/organizationOwnership.spec.ts`
20. `[E]` `test(e2e): give the landing the API URL and cover sign-out across apps`
    `apps/e2e/support/stackEnv.ts`, `apps/e2e/__tests__/stackEnv.test.ts`, `apps/e2e/tests/crossAppSignOut.spec.ts`,
    `apps/e2e/tests/global.setup.ts`
21. `[2]+[3]+[E]` `docs: describe origin checks, boot exit, upload metadata, photo hosts and cross-app sign-out`
    Corpo da mensagem: "Covers the documentation of the whole round in one commit: SECURITY.md,
    01-security-review.md, PRE-PRODUCTION.md and SETUP.md carry hunks from more than one change, and splitting
    them would need git add -p."
    `docs/AUTH-SSO.md`, `docs/BACKUP.md`, `docs/INCIDENT-RESPONSE.md`, `docs/PRE-PRODUCTION.md`, `docs/ROPA.md`,
    `docs/SECURITY.md`, `docs/SETUP.md`, `docs/SUBPROCESSORS.md`, `docs/delivery/01-security-review.md`
22. `docs(features): delivery-security-review-slice-2`
    `docs/features/delivery-security-review-slice-2/`
23. `docs(features): delivery-security-review-slice-3`
    `docs/features/delivery-security-review-slice-3/`
24. `docs(features): e2e-org-ownership-flake-and-web-api-url`
    `docs/features/e2e-org-ownership-flake-and-web-api-url/`

Notas de ordem:

- Entre o commit 4 e os commits 13 e 15, o typecheck do `app` e da `web` quebra (assinatura nova de
  `sessionDELETE`). O estado final é consistente.
- O commit 11 depende do 10 (`file.schema.ts` importa `readCappedBody`).
- O commit 20 vem depois do 18: o segundo teste de `crossAppSignOut.spec.ts` reprova em strict mode com dois
  `AuthProvider` na landing.
- `docs/SETUP.md` entra no commit 21: os dois hunks de cima são da fatia 2 e o de baixo (lista de fluxos da seção
  "Testes E2E") é desta tarefa. Isolar exigiria `git add -p`, que a política dispensa registrando o motivo na
  mensagem.

Varredura de segredo nas três pastas de `docs/features/`: nenhuma senha, chave, token real ou e-mail de pessoa. Os
`user@example.com` são contas públicas do seed.

Título de PR sugerido: `feat: delivery security review part 1 slices 2 and 3, plus E2E fixes`, a ajustar se mais
tarefas entrarem.

Commits realizados: _(preenchido pelo orquestrador)_
