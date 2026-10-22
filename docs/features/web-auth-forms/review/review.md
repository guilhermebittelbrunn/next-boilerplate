# Revisão: formulários de login e cadastro da landing

Escopo: o diff de `apps/web` (dois `*-form-client.tsx`, um teste novo e dois editados) mais a auditoria do backlog
que está no mesmo working tree (`specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/observability-logging.md`).
A auditoria é outro assunto e vai em commit próprio. Esta revisão só leu código e rodou os gates estáticos; não subiu
app, não usou navegador e não rodou a suíte.

## Branch

- Antes: `guilhermebittelbrunn/cycle-v4`, no mesmo SHA de `main` (`af763bb`), sem upstream e sem commit próprio. O
  nome não passa no regex do padrão (`guilhermebittelbrunn` não é projeto).
- Criada `web/fix/auth-forms` com `git switch -c` a partir do HEAD atual (`af763bb`). O working tree foi junto, sem
  commit. A branch antiga ficou como estava.
- Regex do `.claude/commands/review.md`: `branch OK: web/fix/auth-forms`.
- O tipo é `fix` porque a tarefa fecha dois achados 🟡 do BACKLOG (login sem destino e cadastro sem pedido de
  verificação). Os commits de `docs(specs)` e `docs(features)` vão na mesma branch, como nas rodadas anteriores.

## Revisão: `apps/web` (login e cadastro da landing)

### 🔴 Bloqueante

Nada bloqueante.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx:79` e `:133`: `signInStartedHereRef` fica `true`
  depois de uma tentativa que deu errado e nunca volta a `false`. O caso que importa é o login aceito pelo Firebase
  com o cookie de sessão recusado: `onAuthSuccess` cai no `catch` (`packages/auth/provider.tsx:353-362`), mostra o
  toast e não navega. Com `user` presente o formulário devolve `null` (`sign-in-form-client.tsx:58-60`) e o efeito
  não navega por causa do ref, então a tela fica vazia. É o mesmo resultado de antes da mudança, não é regressão.
  Não corrigi: mexer nisso muda o comportamento do erro de sessão, que está fora do corte. Fica como achado adjacente
  para o `/spec --sync`.
- `sign-in-form-client.tsx:52-56`: quem chega autenticado vai para `/${locale}` mesmo que a URL tenha `?redirect=`.
  Pela leitura, nenhum caminho da web leva a isso hoje (o único que escreve `?redirect=` no login é o
  `handleSessionEnded`, que desloga antes; ver a seção do fim de sessão abaixo). Suporte ao `?redirect=` nesse caso
  está fora do corte do plano (§1.5).
- `apps/web/__tests__/signUpFormApi.test.tsx:189-204`: o `consoleErrorSpy.mockRestore()` só roda quando as asserções
  passam. Só afeta a suíte depois de um teste já vermelho; não mexi.

### ✅ OK

- Mudança mínima: só os dois formulários e testes. SDK, API, i18n, env e `packages/*` intactos. Nenhum símbolo
  público mudou, então o raio de impacto fica nos dois componentes.
- O cadastro chama `apiClient.authApi.sendEmailVerification({ locale })`, action que já existe
  (`packages/sdk/src/actions/auth/action.ts:143-155`). Nenhuma URL nem `fetch` cru.
- Falha do pedido de verificação não vira erro: `getIdToken` e o pedido têm `.catch(() => null)`
  (`sign-up-form-client.tsx:37-48`). Nenhum `console` novo no diff.
- Ordem do pedido de verificação confirmada no `@tanstack/query-core@5.90.20` instalado: `mutation.js` aguarda o
  `onSuccess` da mutação (o `onAuthSuccess` do provider, que grava o cookie) antes de despachar `success`, e só então o
  `MutationObserver` chama o `onSuccess` passado no `mutate`, se o observer tiver ouvinte (`mutationObserver.js:77`).
  O observer é o do `AuthProvider` do layout de `[locale]` (`apps/web/app/[locale]/layout.tsx:37`), que não desmonta
  quando a navegação tira o formulário da tela.
- `noValidate` nos dois `<form>` (`sign-in-form-client.tsx:77`, `sign-up-form-client.tsx:105`). A validação do
  servidor não muda: a API valida o cadastro e o Firebase valida o login.
- `px-4 md:px-2` nos dois contêineres, o mesmo recuo do header e do footer da web.
- Os dois comentários novos explicam o porquê e não citam o fluxo (`sign-in-form-client.tsx:50-51`,
  `sign-up-form-client.tsx:35-36`).
- Destino `/${locale}` coerente com o `redirectPath()` do provider e com o efeito do cadastro. No modo `subscription`
  o header logado já oferece o link do painel (D2 do plano).
- O teste novo usa jsdom no próprio arquivo, como permite `apps/web/CLAUDE.md` (molde `headerMobileMenu.test.tsx`).
  Mocks nas bordas (`@repo/auth/provider`, `@/shared/lib/client`, `next/navigation`, `next/link`), `vi.hoisted` antes
  do `await import`, imports explícitos de `vitest`. O e-mail de teste é `qa-web-auth-forms@example.com`.
- A asserção editada em `signUpFormApi.test.tsx:164-167` (R2 do plano) continua conferindo a credencial por
  igualdade; o segundo argumento é o contrato novo, não afrouxamento.

### Fim de sessão: confirmado por leitura

Risco levantado no handoff: o provider faz `logout()` e depois `router.push` para `/<locale>/sign-in?redirect=…`; se o
formulário montasse com `user` ainda presente, o efeito do login navegaria para `/<locale>` e o `?redirect=` se
perderia.

A leitura derruba o risco:

1. `handleSessionEnded` faz `await logout()` antes do `router.push` (`packages/auth/provider.tsx:251` e `:256`).
2. `logout` é `signOut(auth)` (`packages/auth/client.ts:189-192`). No `@firebase/auth@1.10.8` instalado, `signOut`
   termina em `_updateCurrentUser(null)`, que dentro da fila faz `directlySetCurrentUser(null)` e
   `notifyAuthListeners()` (`dist/esm2017/index-35c79a8a.js:2861-2888`). O aviso ao ouvinte de `onIdTokenChanged` sai
   num microtask enfileirado nessa hora (`@firebase/util`, `ObserverProxy.sendOne`, `index.esm2017.js:1929`), antes de
   a promessa do `signOut` resolver. Então o `setUser(null)` do provider (`provider.tsx:325`) roda antes de o
   `await logout()` retomar e, portanto, antes do `router.push`.
3. O `router.push` do App Router é uma transição e ainda depende do payload da rota de login. O `setUser(null)`, que é
   uma atualização comum e veio antes, entra no render antes da página de login montar.
4. Quando o fim de sessão é detectado no carregamento, `loading` continua `true` até `applySignedInUser` terminar
   (`provider.tsx:328-329`), e esse término já vem depois do `logout`. Não há intervalo com `user` presente e
   `loading: false`.
5. Os dois `AuthProvider` da web assinam o mesmo `auth`, então o `logout` de qualquer um zera o `user` dos dois.

Conclusão: o formulário monta com `user: null` depois do fim de sessão, e o efeito não navega. O F3 (login a partir de
`?redirect=`) continua sendo a medição principal do `/test`, porque ali a ordem entre `setUser`, o efeito e o
`onAuthSuccess` depende do navegador.

### 👁 Verificar no `/test`

Em ordem de risco:

1. **F3, `?redirect=` preservado depois do login pela tela.** É o que sustenta o desenho com o ref. Repro: sem sessão,
   abrir `/pt-br/sign-in?redirect=%2Fpt-br%2Fcontact`, entrar com e-mail e senha, conferir que a URL final é
   `/pt-br/contact`. Repetir três vezes, e uma vez com o botão do Google. O teste de componente mocka o `useAuth` e não
   prova a ordem real.
2. **F4, cadastro sem Resend.** Repro: API sem `RESEND_TOKEN`, cadastrar `qa-web-auth-forms-<n>@example.com` pela
   landing; no log da API, `POST /auth/email-verification/send` com `Authorization: Bearer` e corpo
   `{"locale":"<locale>"}`, resposta `503 EMAIL_NOT_CONFIGURED`; a pessoa termina em `/<locale>` logada, sem toast de
   erro e sem erro novo no console.
3. **F2, quem chega autenticado.** Repro: logado, abrir `/<locale>/sign-in` direto na barra; termina em `/<locale>`.
   Repetir depois de entrar só pela app e abrir a landing (bootstrap de SSO por custom token), que é o caso em que o
   `user` aparece com `loading` ainda `true`.
4. **Fim de sessão (confirmado por leitura acima, medir se for barato).** Repro: logado numa página interna da
   landing, revogar a sessão (ou expirar o cookie) e provocar a renovação; conferir que cai em
   `/<locale>/sign-in?redirect=…` com o formulário visível e que, depois de entrar de novo, volta à página de origem.
5. **F5, mensagens do Zod sem o balão nativo.** Nos dois formulários e nos três idiomas: `abc`, `qa@example`, vazio.
   O T1 cobre só `abc` no login em `en`; o cadastro só tem a prova do atributo no HTML.
6. **F6, recuo a 375 px.** 16 px de cada lado nos dois cartões, claro e escuro, e cartão centralizado com `max-w-md` a
   768 px ou mais.

## Correções aplicadas

Nenhuma. O diff passou nos gates e não encontrei defeito com correção clara dentro do corte. Os três 🟢 acima ficaram
registrados sem edição.

## Raio de impacto

Nenhum contrato mudou (DTO, action do SDK, rota, `error.code`, chave de i18n, prop do design system). Consumidores
afetados: só os dois formulários da `apps/web`. O `AuthProvider` não foi tocado.

## Lacunas de teste

Veredito para cada lacuna que o handoff listava:

| lacuna | veredito |
|---|---|
| Nenhum teste prova a ordem entre o efeito do login e o `onAuthSuccess` do provider real | continua aberta. É o F3 do `/test`; um teste unitário com o provider real exigiria mockar Firebase e router juntos e não provaria a ordem do navegador |
| O cadastro não tem teste em jsdom da mensagem do Zod com `noValidate` | continua aberta. O `/test` cobre no F5 |
| `px-4 md:px-2` sem teste | fora de escopo de teste unitário, como o plano previa. F6 do `/test` |

Lacuna nova: nenhuma.

## Decisões em aberto

Nenhuma bloqueia o commit.

- Achado adjacente para o `/spec --sync`: tela vazia no login da landing quando o Firebase aceita a credencial e o
  cookie de sessão é recusado (`sign-in-form-client.tsx:58-60` com `provider.tsx:353-362`). Recomendação: tratar junto
  dos dois `AuthProvider` aninhados (§1.6 do plano), porque a correção natural mora no provider.

## Gates

| gate | comando | resultado |
|---|---|---|
| Lint | `pnpm check` (com cache) | `Checked 970 files in 405ms. No fixes applied.` |
| Typecheck | `pnpm --filter web typecheck` (com `pipefail`) | exit 0 |
| Paridade de i18n | não rodado | nenhuma chave tocada |
| Testes | não rodado aqui | é do `/test`; o handoff registra `web` 199/199 |

## Varredura de segredo

`docs/features/web-auth-forms/` (plano, handoff, `STATE.md`, esta revisão) e os três arquivos de `specs/`: nenhuma
senha, token ou chave. Os únicos e-mails são de `example.com` (`qa-…@example.com`).

## Plano de commits

Na ordem. Branch `web/fix/auth-forms`.

Substituído pelo plano unificado em `docs/features/global-error-theme/review/review.md`, na branch
`fix/auth-forms-and-global-error-theme`. Os commits abaixo continuam lá, na mesma ordem.

1. `fix(web): send signed-in visitors home from the sign-in form`
   - `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx`
   - `apps/web/__tests__/signInFormRedirect.test.tsx`
   - O arquivo também leva o `noValidate` e o `px-4 md:px-2` do login; separar exigiria `git add -p`. O corpo da
     mensagem diz isso.
2. `fix(web): request the verification e-mail after a landing sign-up`
   - `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx`
   - `apps/web/__tests__/signUpFormApi.test.tsx`
   - `apps/web/__tests__/signUpFormSubmitLock.test.tsx`
   - Mesmo caso: o arquivo leva o `noValidate` e o recuo do cadastro, e o `signUpFormSubmitLock` cobre o `noValidate`.
3. `docs(specs): reconcile the backlog after PR #54`
   - `specs/BACKLOG.md`
   - `specs/account-security-mfa.md`
   - `specs/observability-logging.md`
4. `docs(features): web-auth-forms`
   - `docs/features/web-auth-forms/` (inteira: `STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
     `review/review.md`)

Título de PR sugerido: `fix(web): landing sign-in and sign-up forms`.

### Commits realizados

(preenchido pelo orquestrador depois de commitar)
