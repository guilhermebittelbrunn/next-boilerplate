# Plano: telas de autenticação da app

Tarefa direta, sem spec. É a recomendação "A próxima" da auditoria pós-PR #59 (`specs/BACKLOG.md:211-238`), que junta
quatro achados abertos das telas de autenticação. Rodada autônoma do `/cycle`: as decisões que dependeriam do usuário
estão na §11, cada uma com a opção adotada.

Âncoras conferidas em 2026-10-28 contra o working tree (branch `guilhermebittelbrunn/cycle-command-v9`, HEAD
`277da43`). Nenhum arquivo de código citado tem mudança local; o `git status` só mostra `docs/*` e `specs/*`, da
auditoria.

## 1. Contexto

### 1.1 Resumo

Quatro defeitos pequenos nas primeiras telas de todo fork, três deles medidos por `/test` anteriores:

1. **Sessão recusada com alerta em inglês fixo.** Quando o `POST /api/auth/session` falha depois de o Firebase aceitar
   o login, o `onAuthSuccess` do provider mostra "Could not establish session" em qualquer idioma
   (`packages/auth/provider.tsx:353-370`, o texto em `:364`). O texto passa por `FormattedError`, que devolve a
   `message` de um `Error` comum (`packages/shared/utils/helpers/formattedError.ts:52-54`). Medido pelo `/test` de
   `magic-link-sign-in` (`docs/features/magic-link-sign-in/test/report.md:105-107`).
2. **Seis formulários sem `noValidate`.** Com `type="email"`, o navegador mostra o balão nativo, no idioma dele, antes
   da mensagem do Zod. Os seis `<form>` de `apps/app/app/[locale]/(unauthenticated)/`: `sign-in/components/SignInForm.tsx:136`,
   `sign-up/components/SignUpFormClient.tsx:154`, `forgot-password/components/ForgotPasswordForm.tsx:77`,
   `reset-password/components/ResetPasswordForm.tsx:97`, `sign-in/email-link/components/EmailLinkRequestForm.tsx:99` e
   `sign-in/email-link/components/EmailLinkCompletion.tsx:201`. Nenhum arquivo da pasta tem `noValidate` hoje.
3. **`AuthCard` sem recuo lateral a 375 px.** O contêiner externo tem `py-20` e nada na horizontal
   (`apps/app/app/[locale]/(unauthenticated)/components/AuthCard.tsx:11`). O `/test` de `magic-link-sign-in` mediu o
   cartão de x = 0 a 375 no pedido de link e no "Esqueci minha senha".
4. **`auth/user-disabled` em en diz "User disabled."** (`packages/internationalization/translations/packages/auth/index.ts:55`).
   O pt-br diz "Esta conta foi desativada." (`:16`) e o es diz "Esta cuenta ha sido desactivada." (`:96`).

### 1.2 Âncoras que mudaram em relação ao BACKLOG

- **O es do item 4 já está em espanhol.** O BACKLOG diz que pt-br e es dizem "Esta conta foi desativada.", mas o es
  é "Esta cuenta ha sido desactivada." (`index.ts:96`), como o `/review` da PR #56 já tinha registrado
  (`docs/features/magic-link-sign-in/review/review.md:45-47`). Só o en muda.
- **O Google da app não passa pelo `onAuthSuccess`.** O BACKLOG diz que o item 1 vale para senha, Google e link. Na
  app, o Google usa `signInWithGoogleViaApi` (`SignInForm.tsx:45-58`, `SignUpFormClient.tsx:46-59`), que grava o cookie
  por conta própria e lança outro texto fixo em inglês, "Could not persist session"
  (`apps/app/shared/lib/googleSignInApi.ts:72-74`). O `onError` dos dois formulários passa esse erro por
  `FormattedError`, que devolve a `message` crua. É o mesmo defeito no mesmo login, em outro arquivo. Na landing, o
  Google usa a mutação do provider e cai no `onAuthSuccess`. O plano cobre os dois caminhos (D2).
- **A âncora do `AuthCard`** é `:11` (contêiner externo) e `:12` (o cartão). O BACKLOG cita `:11-12`; confere.

### 1.3 Por que não transformar o `onAuthSuccess` numa função que lança

A recomendação do `/review` da PR #56 tinha dois passos: mensagem traduzida primeiro, depois separar o corpo de
`onAuthSuccess` numa função que lança. Fazer o segundo passo agora muda o contrato das três mutações do provider
(`provider.tsx:372-389`) para cinco telas:

- Hoje a sessão recusada termina a mutação em `success`. A conclusão do link depende disso de propósito: com
  `isSuccess`, mostra o loader com o link "Voltar para o login", porque o código do e-mail já foi gasto e a tela de
  login refaz a sessão (`EmailLinkCompletion.tsx:165-178`, comentário em `:165-167`). Com a mutação em erro, a tela
  cairia em `failure === "other"` (`:152-163`) e pediria outra copy e outro teste.
- O `onSuccess` passado no `mutate` deixaria de rodar: `handleSuccessSignIn` da app (`SignInForm.tsx:72-78`),
  `requestVerificationEmail` do cadastro (`SignUpFormClient.tsx:125`) e os equivalentes da landing.
- As mutações `signIn` e `signInWithGoogle` passariam a alertar pelo `onError` (`provider.tsx:374-375`, `:381-382`),
  com a `message` do erro lançado, o que pede a mesma tradução de qualquer jeito.

Isso sai do corte. Este plano faz o primeiro passo (o alerta traduzido) e registra o segundo na §11 (D1) e nos
achados adjacentes (§1.6).

### 1.4 Objetivos, fora de escopo e corte

Objetivos:

- O1. A sessão recusada depois do login mostra um alerta no idioma da tela, nos três logins da app (senha, Google,
  link) e nos dois da landing (senha, Google).
- O2. Os seis formulários de autenticação da app validam só pelo Zod, sem o balão nativo.
- O3. O cartão das telas de autenticação da app tem recuo lateral a 375 px.
- O4. A conta desativada lê em en uma frase equivalente à do pt-br e do es.

Fora do corte:

- tornar a mutação um erro quando a sessão é recusada (§1.3, D1);
- tirar o Firebase client do ar quando a sessão é recusada no login por senha, como o Google da app já faz
  (`googleSignInApi.ts:31-38`). Hoje a tela de login vê `user` e entra no próprio efeito de redirecionamento
  (`SignInForm.tsx:83-117`), o que vira laço se o servidor seguir recusando (D3);
- os outros dois textos fixos em inglês de `googleSignInApi.ts` (`:47` e `:61`), que só aparecem com resposta
  malformada do Firebase ou da API (achado, §1.6);
- o texto "Entrando…" longe do spinner (`FullScreenLoader.tsx:13`) e o `?redirect=` no link por e-mail, outros dois
  achados da mesma tabela do BACKLOG;
- a copy do cadastro da landing, os dois `AuthProvider` aninhados da web e o link de "esqueci a senha" da landing, que
  estão em "Tarefas diretas candidatas".

Corte de MVP: os quatro itens, uma chave de tradução nova, uma frase corrigida, nove arquivos de código e testes.
Tamanho P.

### 1.5 Apps, área, modo de produto

- `packages/auth` (o provider), `apps/app` (formulários, `AuthCard`, `googleSignInApi`) e
  `packages/internationalization` (uma folha). Sem SDK, API, Firestore ou env.
- A `apps/web` muda de comportamento sem mudar de código: o login e o cadastro da landing usam o mesmo provider
  (`apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx`), então o alerta traduzido vale lá também. Os
  formulários da landing já têm `noValidate` e `px-4 md:px-2` desde a PR #55 (`sign-in-form-client.tsx:63`, `:77`;
  `sign-up-form-client.tsx:91`, `:105`).
- Área: páginas públicas (`(unauthenticated)`). Sem painel, sem admin, sem impersonação.
- Modo de produto: indiferente. As telas são as mesmas em `subscription` e `simple`.
- Sem dependência de assinatura ou plano.

### 1.6 Achados adjacentes (não entram, vão para o `/spec --sync`)

- **Sessão recusada sem saída no login por senha da app.** Depois do alerta, o Firebase client continua com usuário.
  O `SignInForm` troca o formulário pelo loader e tenta gravar a sessão de novo (`SignInForm.tsx:83-117`); se a
  resposta não for 401, segue para o destino, o proxy devolve para o login e o ciclo recomeça. O Google da app já
  resolve isso deslogando o client (`googleSignInApi.ts:31-38`). É a metade "função que lança" da recomendação do
  `/review` da PR #56, e o achado do BACKLOG (`specs/BACKLOG.md:1331`) continua aberto nessa parte.
- **Mais dois textos fixos em inglês no Google da app**: "Google sign-in did not return an ID token"
  (`googleSignInApi.ts:47`) e "Invalid response from auth API" (`:61`). Só aparecem com resposta malformada. P.
- **Login da landing em branco depois da sessão recusada.** O formulário da web devolve `null` com usuário presente e
  só navega quando o login não começou na tela (`sign-in-form-client.tsx`, `signInStartedHereRef`), então a pessoa vê
  o alerta e uma página vazia. Vizinho do achado "tela vazia do `signInStartedHereRef`" que o BACKLOG já lista.

## 2. Dados (Firestore)

N/A. Nenhuma coleção, campo ou consulta.

## 3. Contrato `@repo/sdk`

N/A. Nada muda.

## 4. API

N/A. Nenhuma rota muda e nenhum `error.code` novo. As respostas de `POST /api/auth/session`
(`packages/auth/session-routes.ts:90-115`) continuam as mesmas; o provider só troca o texto que mostra quando elas
falham. O plano não mapeia cada código (`AUTH_SESSION_REVOKED`, `AUTH_SESSION_EXPIRED`, `AUTH_INVALID_TOKEN`,
`AUTH_FORBIDDEN_ORIGIN`, `AUTH_MISSING_TOKEN`) para uma copy própria: logo depois de um login, todos significam "a
sessão não foi gravada, entre de novo", e falha de rede não tem código nenhum (D4).

## 5. Front-end

### 5.1 `packages/auth/provider.tsx`

No `catch` de `onAuthSuccess` (`:360-369`), o alerta passa a ler a chave nova do dicionário que o provider já tem em
mãos (`useDictionary()`, `:141`), sem passar por `FormattedError`:

```ts
} catch {
    errorAlert(dictionary.packages.auth.provider.session.notEstablished);
}
```

`FormattedError` e `handleClientError` continuam importados: os `onError` das mutações usam os dois (`:375`, `:382`,
`:394`). O `dictionary` é relido a cada render, então a troca de idioma sem remontar continua valendo, como o
`authProviderLanguageSwitch.test.tsx` já prova para o `onSuccess`.

### 5.2 `apps/app/shared/lib/googleSignInApi.ts`

O erro de `:73` passa a carregar a mesma frase, lida do dicionário do idioma ativo:

```ts
throw new Error(
    getDictionary().dictionary.packages.auth.provider.session.notEstablished
);
```

`getDictionary()` fora de render é suportado: no navegador, ele lê o idioma que o `LocaleProvider` renderizou por
último (`packages/internationalization/client.ts:35-45`, o comentário diz que isso "also reaches callbacks that run
outside render"). O repositório já lança erro com texto traduzido do mesmo jeito em `apps/app/shared/hooks/useFileUpload.ts:22`,
`:34-36`. Os dois `onError` dos formulários continuam iguais e mostram a `message` (`formattedError.ts:52-54`). O
`catch` de `:35-38` continua deslogando o client antes de relançar.

### 5.3 Formulários (`noValidate`)

`noValidate` no `<form>` dos seis arquivos do §1.1, como a landing fez (`sign-in-form-client.tsx:77`). O
`reset-password` não tem campo de e-mail, mas entra pelo mesmo motivo de consistência e porque o BACKLOG lista os
seis. Nenhuma mensagem nova: os schemas já trazem as mensagens do dicionário (`signInSchema.ts`, `signUpSchema.ts`,
`forgotPasswordSchema.ts`, `resetPasswordSchema.ts`, `emailLinkSchema.ts`).

### 5.4 Recuo lateral

`px-4 md:px-2` no contêiner externo, a mesma classe da landing (`sign-in-form-client.tsx:63`), em três lugares com a
mesma marcação:

- `AuthCard.tsx:11`, que atende o "Esqueci minha senha", a redefinição, o pedido e a conclusão do link, o convite e a
  verificação de e-mail;
- `SignInForm.tsx:124` e `SignUpFormClient.tsx:142`, que repetem o mesmo contêiner sem usar o `AuthCard`.

O login mediu 39 px de cada lado a 375 px (`specs/BACKLOG.md:1334`), mas essa folga vem da largura do conteúdo: o
layout centraliza a coluna pelo conteúdo (`(unauthenticated)/layout.tsx:19`, `:36`), e um texto mais longo ou uma
tela mais estreita encosta o cartão na borda do mesmo jeito. O `px-4` garante 16 px mínimos sem mexer na folga atual
(D5).

### 5.5 Estados

| estado | antes | depois |
|---|---|---|
| sessão recusada no login por senha ou link (app e web) | alerta "Could not establish session" | alerta na chave `session.notEstablished` do idioma da URL |
| sessão recusada no Google da app | alerta "Could not persist session" | mesma frase traduzida; o client continua sendo deslogado |
| e-mail `abc` ou vazio enviado | balão nativo do navegador | mensagem do Zod abaixo do campo |
| 375 px | cartão de x = 0 a 375 nas telas do `AuthCard` | 16 px de cada lado, no mínimo |
| conta desativada em en | "User disabled." | "This account has been disabled." |

### 5.6 i18n e a11y

Uma chave nova, `packages.auth.provider.session.notEstablished`, nos três idiomas, e uma frase corrigida
(`firebase.error["auth/user-disabled"]` em en). Ambas na folha `translations/packages/auth/index.ts`. Nenhuma chave em
`apiErrors`. A chave fica dentro de `session`, ao lado de `expired` e `revoked`; o acesso `session[reason]`
(`provider.tsx:260`) é tipado por `SessionEndReason` e não é afetado.

Com `noValidate`, o leitor de tela anuncia a mensagem do `FormMessage`, que o `HookFormInput` liga ao campo, em vez do
balão do navegador.

## 6. Autorização e segurança

- Nenhuma regra muda. O `noValidate` só desliga a validação do navegador; o Zod continua no cliente e o servidor
  continua validando (a API no cadastro e na redefinição, o Firebase no login).
- O alerta novo não expõe o `error.code` nem o status da recusa. Hoje também não expunha.
- Impersonação: N/A, telas públicas.

## 7. Testes (Vitest)

Todos de unidade ou de componente, sem emulador e sem app de pé. Ficam em `apps/app/__tests__/` (jsdom por padrão,
`apps/app/vitest.config.mts`), porque é lá que o provider já é testado montado.

| # | Arquivo | Nível | O que prova |
|---|---|---|---|
| T1 | `authProviderSessionNotEstablished.test.tsx` (novo) | componente | Molde: `authProviderLanguageSwitch.test.tsx` (mocks de `@repo/auth/client`, `useAlert`, `next/navigation` e da cópia de Next de `packages/auth/node_modules`). Com `params.locale` em cada um dos três idiomas (`it.each`), `signIn.mutateAsync` resolvendo uma credencial e o `fetch` do `POST /api/auth/session` respondendo 500: `errorAlert` recebe `copyFor(locale).session.notEstablished`, `successAlert` não é chamado e `push` não é chamado. Um caso com o `fetch` rejeitando (rede abortada) dá o mesmo resultado. Um caso de troca de idioma sem remontar (pt-br → es) mostra a frase em es |
| T2 | `googleSignInApi.test.ts` (editado) | unidade | O caso de `:109-117` passa a esperar a frase traduzida em vez de "Could not persist session". Para provar o idioma, o teste grava o cookie `x-locale` (lido por `fallbackLocale`, `client.ts:31-33`) com `en` e com `es` e confere a frase de cada um; o resto do caso (client deslogado, sem `setAuthorizationHeader`) não muda |
| T3 | `authFormsNoValidate.test.tsx` (novo) | componente | `ForgotPasswordForm` e `ResetPasswordForm` (com `oobCode="qa-code"`) renderizados com `QueryClientProvider`, `useAlert` e `@/shared/lib/client` mockados: `container.querySelector("form")?.noValidate` é `true` |
| T4 | `signInEnterResubmit.test.tsx`, `signUpFormSubmitLock.test.tsx`, `emailLinkRequestForm.test.tsx`, `emailLinkCompletion.test.tsx` (editados) | componente | Uma asserção de `noValidate === true` no `<form>` que cada arquivo já renderiza. Evita montar de novo os mocks de `useAuth` e de disponibilidade do link |

Sem teste para o `px-4`: largura e recuo são da passada de navegador, como na PR #55
(`docs/features/web-auth-forms/analyze/plan.md` §7). Sem teste de copy para o `auth/user-disabled`: a paridade de chaves
já é coberta por `packages/internationalization/__tests__/parity.test.ts`, e o texto é lido no navegador (F5).

Comandos: `pnpm --filter app test`, `pnpm --filter @repo/auth typecheck`, `pnpm --filter app typecheck`,
`pnpm --filter web typecheck`, `pnpm check`; `pnpm test` da raiz no `/test`.

## 8. O que o `/test` vai percorrer

Ambiente: `pnpm emulators` (JDK 21) + seed, `api` e `app` de pé contra o emulador, e `web` para o F1b. Para o pedido de
link, `EMAIL_LINK_SIGN_IN_ENABLED="true"` como variável de processo da `api`; o código sai do endpoint `oobCodes` do
emulador, como no `/test` de `magic-link-sign-in` (`report.md:61`, `:144-147`). Conta de QA com e-mail fictício
(`qa-app-auth-forms@example.com`); nenhuma senha vai para o `report.md`.

**Como forçar a sessão recusada:** `agent-browser network route "http://localhost:3000/api/auth/session" --abort`
(na web, porta 3001). Só o URL exato intercepta; o glob `**/api/auth/session` não pegou no `/test` anterior
(`magic-link-sign-in/test/report.md:100-103`). O bloqueio não pega `/api/auth/session/refresh`, que é outro URL. Leia o
alerta logo depois de enviar: no login por senha, a tela troca o formulário pelo loader e tenta a sessão de novo
(§1.6), então tire o bloqueio antes de seguir.

- **F1. Alerta traduzido.** Com o bloqueio ativo, nos três idiomas da app (`/pt-br`, `/en`, `/es`):
  - a. login por senha em `/<locale>/sign-in`: o alerta mostra a frase de `session.notEstablished` do idioma, sem
    "Could not establish session";
  - b. o mesmo no login da landing (`:3001/pt-br/sign-in`), em um idioma basta;
  - c. Google da app, se o popup do emulador funcionar no `agent-browser`: a frase traduzida, sem "Could not persist
    session". Se o popup não abrir, vira 🔒 e o T2 fica como prova;
  - d. link por e-mail com o e-mail guardado: a tela fica em "Entrando…" com "Voltar para o login", e o alerta sai
    traduzido. Comportamento da tela igual ao de antes.
- **F2. Sem regressão do login normal.** Sem bloqueio, entrar por senha leva ao destino de antes, com o toast de
  sucesso no idioma da URL.
- **F3. `noValidate`.** Nas seis telas (login, cadastro, "Esqueci minha senha", redefinição com `?oobCode=qa-code`,
  pedido de link, conclusão do link com `?oobCode=qa-code` e sem e-mail guardado), enviar `abc`, `qa@example` e campo
  vazio: aparece a mensagem do Zod no idioma da URL, sem balão nativo. `document.querySelector("form").noValidate`
  deve dar `true` em todas. Um idioma completo e os outros dois por amostragem.
- **F4. 375 px.** Login, cadastro, "Esqueci minha senha", pedido de link e verificação de e-mail, em claro e escuro:
  medir `getBoundingClientRect()` do cartão. Esperado: 16 px ou mais de cada borda, sem rolagem horizontal. O login
  deve manter a folga que já tinha (39 px medidos antes). A 1280 px, o cartão continua na coluna da direita com a
  largura de antes, menos 4 px de cada lado no máximo (`md:px-2`; em `lg` o pai já tem `p-8`).
- **F5. Conta desativada em en.** Excluir a conta de QA pelo painel admin (a exclusão chama `revokeAccountAccess`, que
  grava `disabled: true` no Auth, `apps/api/(shared)/lib/account-access.ts:11-21`) e tentar o login por senha em
  `/en/sign-in`: o alerta diz "This account has been disabled.". Em `/pt-br` e `/es`, as frases de antes.

O que não dá para observar aqui: nada exige infra externa. O F1c pode virar 🔒 se o popup do Google do emulador não
abrir no `agent-browser`.

## 9. Critérios de aceite (rascunho; o `/test` gera a versão final)

# Critérios de Aceite (Checklist)

- [ ] **Sessão recusada no login por senha mostra alerta no idioma da tela**
  Com o `POST /api/auth/session` bloqueado, entrar por e-mail e senha em `/pt-br/sign-in`, `/en/sign-in` e
  `/es/sign-in` mostra a frase de `packages.auth.provider.session.notEstablished` de cada idioma. O texto "Could not
  establish session" não aparece em nenhum dos três. O toast de sucesso não aparece e a pessoa não é levada ao painel
  enquanto a sessão não for gravada.

- [ ] **A landing mostra o mesmo alerta traduzido**
  O login da landing usa o mesmo provider, então o bloqueio de `:3001/api/auth/session` produz a mesma frase no idioma
  da URL. A tela que fica depois do alerta é a mesma de antes (achado registrado, fora do corte).

- [ ] **Sessão recusada no Google da app mostra a mesma frase**
  Com a gravação da sessão bloqueada, o login com Google na tela de login e na de cadastro mostra a frase traduzida em
  vez de "Could not persist session". O usuário do popup continua sendo deslogado, como antes, e o formulário volta a
  aparecer. Se o popup do emulador não abrir no navegador, o critério fica como não verificado no navegador e o teste
  de unidade é a prova.

- [ ] **Link por e-mail com sessão recusada continua com saída**
  Ao concluir o link com a sessão bloqueada, o alerta sai traduzido e a tela mostra "Entrando…" com o link "Voltar
  para o login", como antes. Desbloqueada a rota, o clique em "Voltar para o login" grava a sessão e leva ao destino.

- [ ] **Validação só pelo Zod nos seis formulários**
  No login, no cadastro, no "Esqueci minha senha", na redefinição, no pedido de link e na conclusão do link, enviar
  `abc`, `qa@example` ou campo vazio mostra a mensagem do dicionário no idioma da URL, sem o balão nativo do navegador.
  Senha curta e confirmação diferente no cadastro e na redefinição mostram as mensagens de antes. O `<form>` das seis
  telas tem `noValidate`.

- [ ] **Cartão com recuo lateral a 375 px**
  A 375 px, em claro e em escuro, o cartão das telas de autenticação fica a pelo menos 16 px de cada borda, sem
  rolagem horizontal. O login, que já tinha folga, não perde nada. Em telas largas o cartão continua na coluna da
  direita com a largura máxima de antes.

- [ ] **Conta desativada lê uma frase completa em inglês**
  Uma conta desativada que tenta entrar em `/en/sign-in` vê "This account has been disabled.". Em pt-br e es as frases
  continuam "Esta conta foi desativada." e "Esta cuenta ha sido desactivada.".

- [ ] **Login normal sem regressão**
  Sem bloqueio, o login por senha, Google e link leva ao mesmo destino de antes (incluindo o `?redirect=` seguro), com o
  toast de sucesso no idioma da URL.

- [ ] **Gates**
  `pnpm check`, o typecheck de `@repo/auth`, `app` e `web`, a paridade de i18n e o `pnpm test` da raiz passam.

## 10. Blueprint técnico

### 10.1 Contrato, rota, persistência, env

Nada novo. SDK, API, Firestore e env ficam como estão.

### 10.2 i18n

```ts
// packages/internationalization/translations/packages/auth/index.ts
"pt-br": { provider: { session: {
    expired: "…", revoked: "…",
    notEstablished: "Não foi possível iniciar sua sessão. Tente entrar novamente.",
} } }
en: { provider: {
    session: { expired: "…", revoked: "…",
        notEstablished: "Your session could not be started. Try signing in again.",
    },
    firebase: { error: { "auth/user-disabled": "This account has been disabled.", /* … */ } },
} }
es: { provider: { session: {
    expired: "…", revoked: "…",
    notEstablished: "No se pudo iniciar tu sesión. Intenta iniciar sesión de nuevo.",
} } }
```

### 10.3 Arquivos afetados

```
packages/internationalization/translations/packages/auth/index.ts            (editado)
packages/auth/provider.tsx                                                   (editado)
apps/app/shared/lib/googleSignInApi.ts                                       (editado)
apps/app/app/[locale]/(unauthenticated)/
  components/AuthCard.tsx                                                    (editado)
  sign-in/components/SignInForm.tsx                                          (editado)
  sign-up/components/SignUpFormClient.tsx                                    (editado)
  forgot-password/components/ForgotPasswordForm.tsx                          (editado)
  reset-password/components/ResetPasswordForm.tsx                            (editado)
  sign-in/email-link/components/EmailLinkRequestForm.tsx                     (editado)
  sign-in/email-link/components/EmailLinkCompletion.tsx                      (editado)
apps/app/__tests__/
  authProviderSessionNotEstablished.test.tsx                                 (novo)
  authFormsNoValidate.test.tsx                                               (novo)
  googleSignInApi.test.ts                                                    (editado)
  signInEnterResubmit.test.tsx                                               (editado)
  signUpFormSubmitLock.test.tsx                                              (editado)
  emailLinkRequestForm.test.tsx                                              (editado)
  emailLinkCompletion.test.tsx                                               (editado)
```

### 10.4 Pseudo-diffs

`packages/auth/provider.tsx`:

```diff
         } catch {
-            errorAlert(
-                handleClientError(
-                    new FormattedError(
-                        new Error("Could not establish session"),
-                        locale
-                    )
-                )
-            );
+            errorAlert(dictionary.packages.auth.provider.session.notEstablished);
         }
```

`apps/app/shared/lib/googleSignInApi.ts`:

```diff
 import { getAuthClient } from "@repo/auth/client";
+import { getDictionary } from "@repo/internationalization/client";
 ...
     if (!sessionRes.ok) {
-        throw new Error("Could not persist session");
+        throw new Error(
+            getDictionary().dictionary.packages.auth.provider.session
+                .notEstablished
+        );
     }
```

`AuthCard.tsx`, `SignInForm.tsx`, `SignUpFormClient.tsx` (contêiner externo):

```diff
-        <div className="flex min-h-[calc(100vh-20rem)] items-center justify-center py-20">
+        <div className="flex min-h-[calc(100vh-20rem)] items-center justify-center px-4 py-20 md:px-2">
```

Os seis formulários:

```diff
                 <form
                     className="space-y-4"
+                    noValidate
                     onSubmit={form.handleSubmit(...)}
                 >
```

`translations/packages/auth/index.ts`: a chave `session.notEstablished` nos três idiomas (§10.2) e, em en:

```diff
-                    "auth/user-disabled": "User disabled.",
+                    "auth/user-disabled": "This account has been disabled.",
```

Nenhum comentário novo no código: as mudanças se explicam pelo nome da chave e pelo atributo.

### 10.5 Ordem de implementação e commits

A regra do repositório ordena `sdk → api → app/web → i18n`, mas aqui o código lê uma chave nova, e o typecheck do
provider falha sem ela. A ordem que compila em cada commit é i18n primeiro (D6):

1. `fix(internationalization): translate the refused-session alert and the disabled-account message`:
   `translations/packages/auth/index.ts`.
2. `fix(auth): show the refused-session alert in the screen language`: `packages/auth/provider.tsx` +
   `apps/app/__tests__/authProviderSessionNotEstablished.test.tsx`. Commit misto (pacote + teste da app), porque o
   provider só é testado montado na `apps/app`; registrar o porquê na mensagem.
3. `fix(app): translate the refused-session error of the Google sign-in`: `googleSignInApi.ts` + `googleSignInApi.test.ts`.
4. `fix(app): validate the auth forms with zod only and pad the auth card on small screens`: os seis formulários, o
   `AuthCard` e os testes T3 e T4. `SignInForm.tsx` e `SignUpFormClient.tsx` recebem as duas mudanças; separar em dois
   commits exigiria `git add -p`, e a política aceita o commit misto nesse caso.
5. `docs(features): app-auth-forms`, por último.

Os arquivos modificados pela auditoria (`docs/*.md`, `specs/*`, o `git mv` da spec arquivada) não pertencem a esta
tarefa. Antes do primeiro commit, `git diff --cached --stat` tem de sair vazio (o rename da spec já está no índice).

### 10.6 Env e pré-requisitos manuais de infra

Nenhum. Nenhuma variável nova, nenhuma conta em provedor e nenhuma pendência para o `docs/PRE-PRODUCTION.md`. O
`EMAIL_LINK_SIGN_IN_ENABLED="true"` do §8 é variável de processo do ambiente local de QA, não configuração de fork.

## 11. Decisões tomadas sem perguntar

| # | Pergunta | Opções | Adotada | Por quê |
|---|---|---|---|---|
| D1 | Separar o corpo de `onAuthSuccess` numa função que lança? | (a) só traduzir o alerta; (b) lançar e deixar a mutação terminar em erro | (a) | A recomendação do BACKLOG põe a tradução primeiro. (b) muda o contrato de três mutações usadas por cinco telas, e a conclusão do link depende do `isSuccess` de propósito (§1.3). Vira achado (§1.6) |
| D2 | Incluir o "Could not persist session" do Google da app? | (a) sim, mesma chave; (b) só o provider, como o BACKLOG cita | (a) | O BACKLOG diz que o defeito vale para o Google, e na app o Google passa por `googleSignInApi.ts:73`, não pelo provider. Sem isso, o `/test` do Google mede o mesmo inglês. Custo: uma linha e um teste editado |
| D3 | Deslogar o Firebase client quando a sessão é recusada no login por senha? | (a) não; (b) sim, como o Google da app | (a) | Muda o fluxo de recuperação do link, que hoje usa a sessão do client para refazer o cookie na tela de login. É a mesma decisão de D1 vista de outro ângulo. Fica no achado |
| D4 | Uma frase só ou uma por `error.code` da recusa? | (a) uma frase; (b) mapear cada código | (a) | Logo depois do login, todos os códigos pedem a mesma ação (entrar de novo), e a falha de rede não tem código. Menor raio |
| D5 | Recuo lateral só no `AuthCard` ou também no login e no cadastro? | (a) os três contêineres; (b) só o `AuthCard`; (c) migrar login e cadastro para o `AuthCard` | (a) | A marcação é idêntica nos três, a landing aplicou a receita nos dois formulários dela, e a folga atual do login vem da largura do conteúdo, não de um recuo. (c) é refatoração fora do corte |
| D6 | Ordem dos commits | (a) i18n primeiro; (b) a ordem padrão, i18n por último | (a) | O provider e o `googleSignInApi` leem a chave nova; com (b) os commits 2 e 3 não compilam sozinhos |
| D7 | Corrigir o es do `auth/user-disabled`? | (a) não; (b) sim | (a) | O es já está em espanhol ("Esta cuenta ha sido desactivada.", `index.ts:96`); o BACKLOG errou a citação |

## 12. Referências não lidas

Nenhuma. Tarefa direta, sem card, wiki, print ou Figma.
