# Revisão: telas de autenticação da app

Revisão do diff da `app-auth-forms` contra `docs/review-checklist.md`, feita por leitura de código. Nenhum processo
subiu, nenhuma suíte rodou e nenhum arquivo de código foi alterado nesta etapa.

## Branch

- **Resolvida:** `fix/app-auth-forms`, criada nesta etapa com `git switch -c` a partir do HEAD de
  `guilhermebittelbrunn/cycle-command-v9` (`277da43`, igual a `origin/main`).
- **Por que outra branch:** `guilhermebittelbrunn/cycle-command-v9` reprova no regex do `/review` (o prefixo
  `guilhermebittelbrunn/` não é projeto e `cycle-command-v9` não é tipo). Ela não tem commit além de `origin/main` nem
  upstream, então daria para renomear. Preferi criar outra: a branch antiga é a do workspace do Conductor, e renomeá-la
  pode desligar o workspace dela.
- **Nome:** o diff toca `apps/app`, `packages/auth` e `packages/internationalization`. Com app e pacotes juntos, o
  projeto fica de fora (`fix/<title>`), como em `fix/auth-forms-and-global-error-theme`. O tipo é `fix`: tradução de
  alerta, validação nativa desligada e recuo lateral.
- **Regex:** `branch OK: fix/app-auth-forms`.
- **Working tree e índice:** `git status --short` e `git diff --cached --stat` deram a mesma saída antes e depois da
  troca. O índice continua só com o rename de `specs/organization-ownership-transfer.md`.

## Achados

| sev. | arquivo:linha | problema | ação |
|---|---|---|---|
| 🟡 | `apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx:83-117` | Com a sessão recusada, o Firebase client fica com usuário. O login troca o formulário pelo loader, grava a sessão de novo e, se a resposta não for 401 (rede caída, 500), navega para o destino; o proxy devolve para o login e a página recarrega em laço. Já era assim antes do diff, e o plano tirou do corte (D1, D3). | Nenhuma. O achado continua aberto em `specs/BACKLOG.md:1331`. Entra no "Verificar no `/test`" porque o F1 vai cair nele. |
| 🟡 | `apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx:72-100` | O mesmo laço a partir do cadastro, e aqui sem nem o freio do 401 que o login tem (`SignInForm.tsx:102`): o efeito navega com qualquer resposta. Não está no plano nem no BACKLOG. | Nenhuma, fora do corte. Registrado aqui para o `/spec --sync` juntar ao achado de `BACKLOG.md:1331`. |
| 🟢 | `packages/auth/provider.tsx:353-365` | O `catch` de `onAuthSuccess` também pega uma falha de `resolvePostLoginPath`, que roda depois do toast de sucesso. Se ela lançasse, a tela mostraria o sucesso e logo depois "não foi possível iniciar sua sessão". Pela leitura, hoje ela não lança: na `apps/app`, `resolveDefaultPostLoginForApp` passa por `applyAccountPreferences`, que engole o erro da API (`apps/app/shared/lib/postLoginNavigation.ts:63-77`), e o resto é `setCookie` e `postAuthRedirectTarget`, sem rede; a `apps/web` não passa `resolveDefaultPostLoginPath` (`apps/web/app/[locale]/layout.tsx:37`). | Nenhuma. Tirar a navegação do `try` mudaria o desfecho da mutação (o `onSuccess` que lança vira erro no TanStack Query), e isso é a metade D1 que ficou fora. |
| ✅ | `packages/auth/provider.tsx:360-364` | O alerta lê `dictionary.packages.auth.provider.session.notEstablished` do `useDictionary()` do provider, o mesmo que `handleSessionEnded` já usa. `FormattedError` e `handleClientError` continuam em uso nos `onError` das mutações (`:369`, `:376`, `:388`). As três mutações de login apontam para o mesmo `onAuthSuccess` (`:371`, `:378`, `:383`). | |
| ✅ | `apps/app/shared/lib/googleSignInApi.ts:73-78` | O `Error` lançado chega ao `onError` do `SignInForm` e do `SignUpFormClient` como `handleClientError(new FormattedError(error, locale))`. Um `Error` sem `code` e sem resposta axios sai pela `message` (`packages/shared/utils/helpers/formattedError.ts:52-53`), então a frase traduzida aparece sem troca. `getDictionary()` no navegador lê o locale que o `LocaleProvider` renderizou por último, que é o da URL (`packages/internationalization/client.ts:40-45`, `:51-55`). O `catch` que desloga o client não mudou. | |
| ✅ | os seis `<form>` de `(unauthenticated)` | `noValidate` presente em `SignInForm.tsx:138`, `SignUpFormClient.tsx:156`, `ForgotPasswordForm.tsx:79`, `ResetPasswordForm.tsx:99`, `EmailLinkRequestForm.tsx:101` e `EmailLinkCompletion.tsx:203`. Um `grep '<form'` na pasta acha só esses seis. | |
| ✅ | `AuthCard.tsx:11`, `SignInForm.tsx:124`, `SignUpFormClient.tsx:142` | `px-4 py-20 md:px-2` nos três contêineres externos, com a mesma marcação. As outras telas que usam o `AuthCard` (convite, verificação e troca de e-mail) herdam o recuo. | |
| ✅ | `packages/internationalization/translations/packages/auth/index.ts` | `session.notEstablished` nos três idiomas, na mesma posição; o en de `auth/user-disabled` agora equivale ao pt-br (`:18`) e ao es (`:102`). Nenhuma outra ocorrência de "User disabled.", "Could not establish session" ou "Could not persist session" em `apps/` e `packages/`. | |
| ✅ | testes | T1 e T3 seguem o padrão de mock do repositório (`vi.hoisted` + `vi.mock` antes do `await import`; o mock de `packages/auth/node_modules/next/navigation.js` repete o de `authProviderLanguageSwitch.test.tsx` e `sessionExpiredSignOut.test.tsx`). O comentário do T1 sobre a cópia própria do Next em `packages/auth` explica um motivo que não aparece no código, então está dentro das exceções. Nenhum comentário novo no código de produção. | |

Nada bloqueante. `/code-review` (esforço baixo) não achou bug de execução; os dois pontos que levantou (imports talvez
órfãos no provider e o locale de `getDictionary()` no Google) foram conferidos acima e estão corretos.

## Correções aplicadas

Nenhuma. O diff não tinha defeito corrigível dentro do corte, e os dois 🟡 são o comportamento que o plano deixou fora
de propósito.

## Raio de impacto

- `packages/auth/provider.tsx` é montado pela `apps/app` (`AppDesignProvider`) e pela `apps/web` (`[locale]/layout.tsx`).
  O alerta traduzido vale para o login por senha e Google da landing sem mudança de código lá. Nenhum tipo exportado
  mudou.
- A chave `packages.auth.provider.session.notEstablished` é lida em dois lugares: o provider e o `googleSignInApi` da
  app. É folha nova, sem renomear nada.
- `auth/user-disabled` en é lida por `FormattedError.firebaseAuthMessage` em qualquer app que trate erro do Firebase
  Auth. Só muda a frase.
- Sem SDK, API, `error.code`, rota, Firestore ou env.

## Verificar no `/test`

A leitura confirma o texto que vai ao `errorAlert` e o atributo no `<form>`. O que a tela mostra fica para medição.

1. **F1a, alerta traduzido no login por senha da app** (maior risco, é o centro do corte). Bloquear o URL exato
   `http://localhost:3000/api/auth/session` com `--abort` e entrar em `/pt-br`, `/en` e `/es/sign-in`. Ler o alerta logo
   depois do envio: em seguida a tela vira loader e entra no laço do 🟡 acima (navega, o proxy devolve, recarrega).
   Tirar o bloqueio encerra o laço; se ele seguir depois do desbloqueio, é defeito novo. Anotar quantos recarregamentos
   houve durante o bloqueio.
2. **F1b, landing.** O mesmo em `:3001/<locale>/sign-in`. Esperado pelo plano (§1.6): alerta traduzido e página em
   branco, que é achado conhecido e não reprova a entrega.
3. **F1c, Google da app.** Com o bloqueio, a frase traduzida no lugar de "Could not persist session". Se o popup do
   emulador não abrir, fica 🔒 e o T2 é a prova.
4. **F1d, link por e-mail.** Com o e-mail guardado: "Entrando…" com "Voltar para o login" e o alerta traduzido.
5. **Cadastro com a sessão recusada** (fora do handoff). Criar conta em `/en/sign-up` com o bloqueio ativo e registrar
   o que acontece depois do alerta. A leitura prevê o laço do segundo 🟡. Serve para o achado, não reprova o corte.
6. **F2, sem regressão.** Sem bloqueio, o login por senha leva ao destino de antes com o toast de sucesso no idioma da
   URL. O caminho de sucesso não mudou no código, então qualquer diferença aqui é regressão.
7. **F3, `noValidate`.** Nas seis telas, enviar `abc`, `qa@example` e vazio: mensagem do Zod no idioma, sem balão
   nativo.
8. **F4, recuo.** A 375 px, 16 px ou mais de cada lado do cartão em login, cadastro, "Esqueci minha senha", pedido de
   link e verificação de e-mail, em claro e escuro, sem rolagem horizontal. A 1280 px, largura do cartão igual à de
   antes, com no máximo 4 px a menos de cada lado. O plano afirma que em `lg` o pai já tem `p-8`; a leitura não
   confirmou.
9. **F5, conta desativada em en.** Excluir a conta de QA pelo admin (`users/[id]/route.ts:216` chama
   `revokeAccountAccess`, que grava `disabled: true` em `account-access.ts:13`) e entrar em `/en/sign-in`. Esperado:
   "This account has been disabled.". Confirmar que o emulador devolve `auth/user-disabled` e não
   `auth/invalid-credential`.

## Lacunas de teste

| lacuna (do handoff) | veredito |
|---|---|
| Recuo lateral sem teste de unidade | continua aberta, por decisão do plano (§7). O item 8 acima mede. |
| `auth/user-disabled` en sem teste de copy | continua aberta. Teste que repete a string do dicionário não provaria nada além da paridade; o item 9 mede na tela. |
| Alerta traduzido na `apps/web` sem teste próprio | continua aberta. O provider é o mesmo módulo; o item 2 mede. |
| T1 só dispara o login por senha | continua aberta. A leitura confirma que as três mutações usam o mesmo `onAuthSuccess` (`provider.tsx:371`, `:378`, `:383`), então o risco de divergência é baixo. |

## Decisões em aberto

Nenhuma nova. O laço do login com a sessão recusada (D1, D3) segue como achado em `specs/BACKLOG.md:1331`; o laço do
cadastro vai junto no próximo `/spec --sync`.

## Gates

Esta etapa não mudou código, então os números são os do `develop/handoff.md`, sem nova medição:

| comando | resultado (handoff) |
|---|---|
| `pnpm check` | 1057 arquivos, sem erro |
| `pnpm --filter @repo/auth typecheck` | sem erro |
| `pnpm --filter app typecheck` | sem erro |
| `pnpm --filter web typecheck` | sem erro |
| `pnpm --filter @repo/internationalization test` | 67 testes passando, paridade incluída |

## Rodada 2: correções depois do `/test`

O `/test` reprovou dois critérios (`test/report.md`, defeitos 1 e 2). Os dois foram corrigidos aqui. A revisão da
rodada 1 tinha marcado o Google como ✅ olhando só a resposta HTTP de erro e não viu o caminho sem resposta; o recuo
ficou no "Verificar no `/test`" sem que eu conferisse a largura da coluna. As duas falhas passaram pela leitura.

### Defeito 1: "Failed to fetch" no Google da app

`apps/app/shared/lib/googleSignInApi.ts:66-78`. Quando o `POST /api/auth/session` não recebe resposta, o `fetch`
rejeita com `TypeError` antes do `if (!sessionRes.ok)`, e o `FormattedError` devolve a `message` do navegador. O
defeito é anterior ao diff, mas o critério F1c mede justamente esse caminho.

Correção: `.catch(() => null)` no `fetch` e `if (!sessionRes?.ok)`, com a mesma frase de `session.notEstablished`. É o
padrão que o efeito de reautenticação do `SignInForm` já usa (`SignInForm.tsx:95`). O `catch` de
`signInWithGoogleViaApi` continua deslogando o client, porque o erro lançado é o mesmo.

Prova: caso novo em `apps/app/__tests__/googleSignInApi.test.ts`, com o `fetch` rejeitando `TypeError("Failed to
fetch")` em en. Ele confere a frase traduzida, o `signOut` do client e que o header de autorização não foi gravado.

| momento | comando | resultado |
|---|---|---|
| sem a correção | `pnpm exec vitest run __tests__/googleSignInApi.test.ts` (em `apps/app`) | 1 falha, 6 passando: esperava "Your session could not be started. Try signing in again.", recebeu "Failed to fetch" |
| com a correção | o mesmo | 7 passando |

### Defeito 2: o cartão perdia 16 px a partir de 768 px

`md:px-2` em `AuthCard.tsx:11`, `SignInForm.tsx:124` e `SignUpFormClient.tsx:142`. A coluna da app tem
`max-w-[400px]` (`apps/app/app/[locale]/(unauthenticated)/layout.tsx:36`), então o padding saía da largura do cartão:
400 para 384 px. O plano tratou `md:px-2` como 4 px de cada lado, mas a classe vale 8 px.

Correção: `px-4 sm:px-0` nos três contêineres, e não o `md:px-0` sugerido pelo QA. Abaixo de 640 px os dois são
iguais. Entre 640 e 767 px a coluna de 400 px já fica centrada com 120 px ou mais de folga de cada lado, então o
`px-4` ali só estreitaria o cartão para 368 px sem necessidade; com `sm:px-0` ele volta aos 400 px de antes do diff
já em 640 px.

Por leitura, a 375 px nada muda em relação ao que o QA mediu: `sm:` só vale a partir de 640 px, então o `px-4` (16 px)
continua aplicado. O Tailwind 4 não põe padding no `container` do layout (não há customização em
`packages/design-system/styles/globals.css`), e é por isso que o recuo vem só do `px-4`. Os 16/16 px do "Esqueci", do
pedido de link e da verificação e os 39/39 do login devem se repetir. A partir de 640 px o contêiner fica sem padding
horizontal, como antes do diff, e o cartão ocupa os 400 px da coluna.

### Teste do QA encaixado

`apps/app/__tests__/apiErrorCopy.test.ts` ganhou do `/test` um caso para `auth/user-disabled` nos três idiomas. Fica
num commit `test(app)` próprio logo depois do commit de i18n: o arquivo é da `apps/app`, e juntar com
`packages/internationalization` misturaria app e pacote.

### Gates da rodada 2

| comando | resultado |
|---|---|
| `pnpm check` | 1057 arquivos, sem erro |
| `pnpm --filter app typecheck` | sem erro |
| `pnpm exec vitest run` (em `apps/app`) em `googleSignInApi`, `apiErrorCopy`, `signInEnterResubmit`, `signUpFormSubmitLock`, `authFormsNoValidate`, `emailLinkRequestForm` e `emailLinkCompletion` | 7 arquivos, 52 testes passando |

`@repo/auth`, `web` e a paridade de i18n não foram remedidos: nada nesses escopos mudou nesta rodada.

### O `/test` precisa remedir

1. **F1c com `--abort`.** `agent-browser network route "http://localhost:3000/api/auth/session" --abort`,
   `/en/sign-in`, "Continue with Google". Esperado: "Your session could not be started. Try signing in again." e o
   formulário de volta (client deslogado ao recarregar). Repetir em es ou pt-br por amostra.
2. **F4 nas larguras.** A 375 px, 16 px ou mais de cada lado nas telas medidas antes, em claro e escuro, sem rolagem
   horizontal. A 640, 768 e 1280 px, cartão com 400 px. Entre 376 e 639 px o cartão fica 32 px mais estreito que a
   coluna, que é o recuo pedido.

## Plano de commits

Antes do primeiro commit, `git diff --cached --stat` mostra só o rename da spec arquivada. Ele pertence ao commit 1, que
vem primeiro por isso e porque a auditoria aconteceu antes da feature. A ordem de código põe a i18n antes do provider e
do Google (D6 do plano): os dois leem a chave nova, e com a i18n por último os commits intermediários não compilariam.

Desvio do plano: o T1 sai num commit `test(app)` próprio em vez de ir junto com o provider. Separar é por arquivo, sem
`git add -p`, então a exceção de commit misto não se aplica, e a regra de não misturar app com pacote vence.

1. `docs(specs): archive the delivered ownership transfer spec and refresh backlog anchors`
   - `specs/organization-ownership-transfer.md` (remoção, já no índice)
   - `docs/features/organization-ownership-transfer/spec.md` (rename no índice; as edições de conteúdo precisam de
     `git add`)
   - `specs/BACKLOG.md`
   - `specs/account-security-mfa.md`
   - `specs/observability-logging.md`
2. `docs: refresh code anchors in the security, backup and incident docs`
   - `docs/SECURITY.md`, `docs/PRE-PRODUCTION.md`, `docs/SUBPROCESSORS.md`, `docs/INCIDENT-RESPONSE.md`,
     `docs/BACKUP.md`

   Saíram da mesma auditoria, mas são documentação do repositório, não backlog: âncoras `arquivo:linha` que a PR #59
   deslocou e a contagem de rotas (55 para 56). Conferi por amostra `audit.ts:40-42`, `account-erasure.ts:199` e `:274`,
   `deletion/route.ts:66` e as 56 rotas; batem.
3. `fix(internationalization): add the refused-session copy and reword the disabled-account message`
   - `packages/internationalization/translations/packages/auth/index.ts`
4. `test(app): check the disabled-account copy in every locale`
   - `apps/app/__tests__/apiErrorCopy.test.ts`
5. `fix(auth): show the refused-session alert in the screen language`
   - `packages/auth/provider.tsx`
6. `test(app): cover the translated refused-session alert of the auth provider`
   - `apps/app/__tests__/authProviderSessionNotEstablished.test.tsx`
7. `fix(app): translate the Google sign-in error when the session is not established`
   - `apps/app/shared/lib/googleSignInApi.ts`
   - `apps/app/__tests__/googleSignInApi.test.ts`

   Cobre a resposta de erro e a requisição sem resposta (rodada 2).
8. `fix(app): pad the shared auth card on small screens`
   - `apps/app/app/[locale]/(unauthenticated)/components/AuthCard.tsx`
9. `fix(app): leave validation to zod in the password reset and email link forms`
   - `apps/app/app/[locale]/(unauthenticated)/forgot-password/components/ForgotPasswordForm.tsx`
   - `apps/app/app/[locale]/(unauthenticated)/reset-password/components/ResetPasswordForm.tsx`
   - `apps/app/app/[locale]/(unauthenticated)/sign-in/email-link/components/EmailLinkRequestForm.tsx`
   - `apps/app/app/[locale]/(unauthenticated)/sign-in/email-link/components/EmailLinkCompletion.tsx`
   - `apps/app/__tests__/authFormsNoValidate.test.tsx`
   - `apps/app/__tests__/emailLinkRequestForm.test.tsx`
   - `apps/app/__tests__/emailLinkCompletion.test.tsx`
10. `fix(app): leave validation to zod and pad the sign-in and sign-up screens`
   - `apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx`
   - `apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx`
   - `apps/app/__tests__/signInEnterResubmit.test.tsx`
   - `apps/app/__tests__/signUpFormSubmitLock.test.tsx`

   Commit misto aceito: os dois componentes têm o `noValidate` e o recuo no mesmo arquivo, e separar exigiria
   `git add -p`. O corpo da mensagem deve dizer isso.
11. `docs(features): app-auth-forms`
    - `docs/features/app-auth-forms/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`, `review/review.md`,
      `test/criterios-aceite.md`, `test/report.md`; `test/e2e/` fica de fora pelo `.gitignore:300`)

Varredura de segredo em `docs/features/app-auth-forms/`, repetida na rodada 2 com os artefatos do `/test`: sem senha,
token ou chave. Os e-mails são todos fictícios: `qa-app-auth-forms@example.com`, `qa-app-auth-forms-google@example.com`
e `user@example.com`.

Título de PR sugerido: `fix: translate the refused-session alert and tidy the app auth forms`.

### Commits realizados

(preenchido pelo orquestrador)
