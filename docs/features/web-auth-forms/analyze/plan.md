# Plano: formulários de login e cadastro da landing

Tarefa direta, sem spec. É a recomendação da auditoria pós-PR #54 em `specs/BACKLOG.md:263-301`, slug sugerido ali
(`:269`). Rodada autônoma do `/cycle`: as decisões que dependeriam do usuário estão na §11, cada uma com a opção
adotada.

Âncoras conferidas em 2026-10-21 contra o working tree (branch `guilhermebittelbrunn/cycle-v4`, HEAD `af763bb`).
Nenhum arquivo de código citado tem mudança local; só `specs/` está modificado, pela auditoria.

## 1. Contexto

### 1.1 Resumo

Os dois formulários de autenticação da `apps/web` têm quatro defeitos pequenos, todos com conserto já escrito em
outro ponto do repositório:

1. Quem abre `/<locale>/sign-in` já autenticado vê uma página vazia. O componente devolve `null` e não navega
   (`apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx:47-49`). O cadastro ao lado manda para
   `/${locale}` num `useEffect` (`sign-up-form-client.tsx:53-57`).
2. O cadastro da landing não pede o e-mail de verificação. A app pede logo depois do login e engole a falha
   (`apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx:109-117`, ligado em `:125`). A
   landing só chama `signIn.mutate(credentials)` (`sign-up-form-client.tsx:39`).
3. A 375 px o cartão encosta na borda: o contêiner tem `py-20` e nenhum recuo horizontal
   (`sign-in-form-client.tsx:52`, `sign-up-form-client.tsx:74`). Header e footer da web usam `px-4 md:px-2`
   (`apps/web/app/[locale]/components/header/index.tsx:106`, `footer.tsx:56`).
4. Sem `noValidate`, o balão nativo do navegador aparece antes da mensagem traduzida do Zod nos dois `<form>`
   (`sign-in-form-client.tsx:64`, `sign-up-form-client.tsx:86`), porque os campos têm `type="email"` (`:80`, `:97`).
   O formulário de contato da web já usa `noValidate` (`contact-form-client.tsx:103`).

### 1.2 O que o login da landing já faz depois de entrar

O achado do BACKLOG diz que o login "não leva a lugar nenhum depois de entrar". Lendo o provider, o caso do login
feito na própria tela já navega; o que fica sem destino é o visitante que chega à tela já autenticado.

- `signIn` e `signInWithGoogle` são mutações do `AuthProvider` com `onSuccess: onAuthSuccess`
  (`packages/auth/provider.tsx:365-377`). `onAuthSuccess` grava o cookie de sessão e faz
  `router.push(await resolvePostLoginPath(token))` (`:346-363`).
- `resolvePostLoginPath` usa o `?redirect=` da URL quando houver e for seguro (`postAuthRedirectTarget`,
  `packages/auth/redirect.ts:18-44`); sem ele, cai em `redirectPath()`, que é `/${locale}` (`provider.tsx:136-152`).
- A web monta dois `AuthProvider` aninhados (`apps/web/app/[locale]/layout.tsx:36-37`: o do `DesignSystemProvider`,
  `packages/design-system/index.tsx:25-31`, e um segundo sem props). O `useAuth()` dos formulários lê o mais
  interno, cujo `redirectPath()` também dá `/${locale}`. O destino é o mesmo nos dois.

Então o login pela tela já vai para `/${locale}` (ou para o `?redirect=`). O que falta é o caso de quem chega com
usuário: sessão do Firebase já presente na origem, ou o bootstrap de SSO por custom token (`docs/AUTH-SSO.md:23`),
que é o caminho de quem entrou na app e abre a landing. Nos dois, a tela fica vazia.

### 1.3 Por que não copiar o `useEffect` do cadastro ao pé da letra

O `useEffect` do cadastro dispara assim que `user` aparece, inclusive no meio de um login que acabou de acontecer na
tela. No login da landing isso concorre com o provider num caso real:

- Quando a sessão acaba (renovação recusada), o provider da web leva a pessoa para
  `/${locale}/sign-in?redirect=<onde ela estava>` (`provider.tsx:245-263`).
- Ao entrar de novo, `setUser` acontece no `onIdTokenChanged`, antes de `onAuthSuccess` terminar o `POST
  /api/auth/session`. `resolvePostLoginPath` só lê `window.location.search` depois desse `await`
  (`provider.tsx:138-144`, `:349-352`).
- Um `useEffect` que fizesse `router.push(\`/${locale}\`)` ao ver `user` trocaria a URL antes dessa leitura, e o
  `?redirect=` se perderia. A pessoa voltaria para a home em vez de voltar para onde estava.

O desenho adotado (D1, §11) navega só quando o formulário **não** foi enviado nesta montagem: um `useRef` marcado no
envio por e-mail e no clique do Google. Login feito na tela continua com o provider; visitante que chega autenticado
vai para `/${locale}`. São três linhas a mais que a cópia literal e não mexem no provider.

O cadastro tem a mesma corrida em tese, mas ninguém leva para o cadastro da web com `?redirect=`: o único link com
`redirect` da web aponta para o cadastro da **app** (`apps/web/shared/lib/pricingCta.ts:31`), e o fim de sessão manda
para o login, não para o cadastro. O cadastro fica como está nesse ponto (§1.6).

### 1.4 O pedido do e-mail de verificação

A app faz assim (`SignUpFormClient.tsx:109-126`): `createAccount.onSuccess` chama `signIn.mutate(credentials, {
onSuccess: requestVerificationEmail })`; `requestVerificationEmail` pega o ID token da credencial, grava no
`apiClient` e chama `apiClient.authApi.sendEmailVerification({ locale })`, engolindo qualquer erro.

Na landing a ordem dos eventos é a mesma e funciona pelo mesmo motivo:

- O `onSuccess` das opções da mutação (`onAuthSuccess`) é aguardado antes de o estado virar `success`
  (`@tanstack/query-core@5.90.20`, `mutation.js:123`). Só então o `onSuccess` passado no `mutate` roda
  (`mutationObserver.js:77-93`). O pedido sai depois de o cookie de sessão estar gravado.
- O `onSuccess` do `mutate` só roda se o observer ainda tiver ouvinte (`mutationObserver.js:77`). O observer é o do
  `AuthProvider`, montado no layout de `[locale]`, e não o do formulário. A navegação para `/${locale}` desmonta o
  formulário, mas não o provider, e o pedido sai do mesmo jeito.
- `apiClient` da web é um singleton com `project: "web"` (`apps/web/shared/lib/client.ts:3-7`). O `ClientLayout`
  também grava o token quando `user` muda (`apps/web/app/[locale]/clientLayout.tsx:14-22`), mas isso roda num
  `useEffect` e não dá garantia de ordem. Por isso o pedido grava o token antes, como a app.

A rota `POST /auth/email-verification/send` (`apps/api/app/(routes)/auth/email-verification/send/route.ts:14-83`)
responde:

| situação | resposta |
|---|---|
| sem credencial | `401 AUTH_INVALID_TOKEN` (`:17-23`) |
| sem Resend ou sem `NEXT_PUBLIC_APP_URL` na API (`canSendAuthActionLink`, `auth-action-links.ts:21-23`) | `503 EMAIL_NOT_CONFIGURED` (`:25-30`) |
| conta já verificada ou sem e-mail | `200 { data: { requested: true } }` (`:32-34`) |
| provedor recusa gerar o link ou a entrega falha | `503 EMAIL_SEND_FAILED` (`:55-60`, `:75-80`) |
| enviado | `200 { data: { requested: true } }` (`:82`) |

Qualquer falha aqui acontece com a conta já criada e a pessoa já logada. O cadastro tem de terminar como terminou
antes: sem toast de erro, na home. É o modo degradado da `.claude/cycle-policy.md` §3 ("Toda feature opt-in precisa
de modo degradado testado"). Quem usa o modo `subscription` encontra no painel o aviso com o botão de reenviar
(`apps/app/shared/hooks/useEmailVerification.ts:17-22`).

O BACKLOG pede para não acrescentar `console` cru (`specs/BACKLOG.md:278-279`; a contagem está em
`specs/observability-logging.md:91`). O pedido descarta a falha com `.catch(() => null)`, a forma que o repositório já
usa para isso (`SignUpFormClient.tsx:84`, `useEmailVerification.ts:34`).

O cadastro com Google não pede verificação, como na app: o provedor já atesta o endereço (comentário em
`SignUpFormClient.tsx:102-108`).

### 1.5 Objetivos, fora de escopo e corte

Objetivos:

- O1. Visitante autenticado que abre o login da landing vai para `/${locale}`, sem quebrar o retorno pelo
  `?redirect=` que o provider já faz.
- O2. Cadastro por e-mail e senha na landing pede o e-mail de verificação, e falha desse pedido não vira erro.
- O3. Os dois cartões têm recuo lateral a 375 px.
- O4. A validação dos dois formulários aparece só pelo Zod, traduzida, sem o balão nativo.

Fora do corte (do BACKLOG, `specs/BACKLOG.md:296-298`, e do pedido desta rodada):

- link "esqueci a senha" no login da landing;
- seções da home coladas na borda a 375 px;
- **suporte novo** ao `?redirect=` depois do login. Este plano só garante que o comportamento que o provider já tem
  não regride (§1.3).

Também fora: aviso na landing de que o e-mail foi enviado (pediria chave de tradução nova; o BACKLOG mede o corte
sem chave nova, `:267`), e qualquer mudança no `AuthProvider`.

Corte de MVP: os quatro itens, dois arquivos de componente e testes. Tamanho P.

### 1.6 Achados adjacentes (não entram, vão para o `/spec --sync`)

- A web monta dois `AuthProvider` aninhados (`layout.tsx:36-37`). Cada um assina `onIdTokenChanged`, grava o cookie
  e tenta o bootstrap por conta própria. Não muda o destino desta tarefa, mas duplica as chamadas a
  `/api/auth/session`.
- A corrida do §1.3 existe em tese no cadastro da web, se algum dia alguém linkar para ele com `?redirect=`.

### 1.7 Apps, área, modo de produto

- Só `apps/web`. Sem SDK, API, i18n, env ou pacote.
- Área: páginas públicas da landing (`/[locale]/sign-in`, `/[locale]/sign-up`). Sem painel, sem admin.
- Modo de produto: indiferente. O destino é `/${locale}` nos dois modos, como hoje no provider. Em `subscription` o
  header logado já oferece o link "Ir para o painel" (`header/index.tsx:60-66`).
- Sem dependência de assinatura ou plano.

## 2. Dados (Firestore)

N/A. Nenhuma coleção, campo ou consulta nova.

## 3. Contrato `@repo/sdk`

Nada muda. A landing passa a usar uma action que já existe:

```ts
// packages/sdk/src/actions/auth/action.ts:44-46, :144-156
export type EmailVerificationSendBody = { locale?: string };
async sendEmailVerification(body?: EmailVerificationSendBody): Promise<AuthActionRequested>
```

## 4. API

N/A. A rota `POST /auth/email-verification/send` já existe e já atende chamadas com `Authorization: Bearer`
(`resolveApiActor`, `route.ts:17`). A origem `http://localhost:3001` está na lista de desenvolvimento do CORS
(`apps/api/(shared)/lib/cors.ts:9`); em produção vem de `CORS_ORIGIN` (`docs/PRE-PRODUCTION.md` §5), que a landing já
precisa para o cadastro. Os códigos `EMAIL_NOT_CONFIGURED` e `EMAIL_SEND_FAILED` já têm entrada em `apiErrors` nos
três idiomas (`packages/internationalization/translations/packages/shared/utils.ts:113-115`, `:260-262`, `:414-416`),
mas esta tarefa não os mostra.

## 5. Front-end (`apps/web`)

### 5.1 `sign-in-form-client.tsx`

- `useRouter` de `next/navigation` e `useEffect`/`useRef` de `react`.
- `submittedRef = useRef(false)`, marcado no envio do formulário e no clique do Google.
- `useEffect`: com `!authLoading && user && !submittedRef.current`, `router.push(\`/${locale}\`)`. Mesmo método e
  destino do cadastro (`sign-up-form-client.tsx:53-57`).
- `px-4 md:px-2` no contêiner externo (`:52`).
- `noValidate` no `<form>` (`:64`).
- O `return null` com usuário (`:47-49`) continua: a navegação vem do efeito.

### 5.2 `sign-up-form-client.tsx`

- `requestVerificationEmail(credential: UserCredential)`: token com `.catch(() => null)`; sem token, sai; com token,
  `apiClient.setAuthorizationHeader(token)` e `sendEmailVerification({ locale }).catch(() => null)`.
- `createAccount.onSuccess` passa a `signIn.mutate(credentials, { onSuccess: requestVerificationEmail })`.
- `px-4 md:px-2` no contêiner externo (`:74`) e `noValidate` no `<form>` (`:86`).
- O comentário de duas linhas em `:67-68` fica como está (fora da tarefa).

### 5.3 Estados

| estado | login | cadastro |
|---|---|---|
| sem sessão | formulário | formulário |
| `authLoading` | formulário (como hoje) | formulário (como hoje) |
| chega autenticado | `null` e navega para `/${locale}` | `null` e navega (já fazia) |
| acabou de entrar pela tela | provider navega (`/${locale}` ou `?redirect=`) | efeito e provider navegam para `/${locale}`; pedido de verificação sai depois |
| verificação recusada (503/401/rede) | n/a | nada visível; continua logado na home |

### 5.4 i18n e a11y

Nenhuma chave nova. As mensagens que passam a aparecer no lugar do balão nativo já existem em
`apps.web.pages.signIn.validation` e `apps.web.pages.signUp.validation`, e os schemas já as usam
(`sign-in/validations/signInSchema.ts:7-16`, `sign-up/validations/signUp.ts:7-24`). Com `noValidate`, o leitor de tela
passa a anunciar a mensagem do `FormMessage` em vez do balão do navegador; o `HookFormInput` já liga a mensagem ao
campo (padrão do contato, `contact-form-client.tsx:103`).

## 6. Autorização e segurança

- O pedido de verificação vai com o ID token da própria pessoa. A API usa o ator real e nunca o personificado
  (`route.ts:15-17`), então impersonação não se aplica aqui.
- Nenhuma URL nova, nenhum `fetch` cru: tudo pelo `apiClient` do SDK (regra de ouro 1).
- O efeito do login navega para um caminho fixo montado do `locale`; não lê query string, então não abre redirect.
- `noValidate` não tira validação nenhuma do servidor: a API valida e-mail e senha no cadastro, e o Firebase no login.

## 7. Testes (Vitest)

Todos de componente, sem emulador e sem app de pé. Ficam em `apps/web/__tests__/`. A suíte é `node` por padrão e
aceita jsdom por arquivo para interação de Client Component (`apps/web/CLAUDE.md:28-35`).

| # | Arquivo | Nível | O que prova |
|---|---|---|---|
| T1 | `signInFormRedirect.test.tsx` (novo, `// @vitest-environment jsdom`) | componente | Com `useAuth` mockado por estado mutável (molde: `headerMobileMenu.test.tsx`), `next/navigation` com `push` espiado: (a) `user` presente e `loading: false` chama `push("/en")`; (b) `user: null` não chama; (c) `loading: true` com `user` não chama; (d) preencher e-mail e senha válidos, enviar (`signIn.mutate` chamado), depois `rerender` com `user` presente: `push` não é chamado pelo formulário; (e) o mesmo depois do clique em Google. (f) `container.querySelector("form")?.noValidate` é `true` |
| T2 | `signUpFormApi.test.tsx` (editado) | componente | O mock de `@/shared/lib/client` ganha `setAuthorizationHeader` e `authApi.sendEmailVerification`. O caso "signs in with the same credentials" passa a conferir `toHaveBeenCalledWith(CREDENTIALS, expect.objectContaining({ onSuccess: expect.any(Function) }))`: o contrato mudou, a credencial continua conferida por igualdade. Casos novos: (a) o `onSuccess` do `mutate` com credencial falsa (`getIdToken` resolvendo `"fresh-id-token"`) grava o token e chama `sendEmailVerification({ locale: "en" })`; (b) com `sendEmailVerification` rejeitando um `AxiosError` 503 `EMAIL_NOT_CONFIGURED`, a promessa resolve, `errorAlert` não é chamado e `console.error` não é chamado (`vi.spyOn`); (c) com `getIdToken` rejeitando, `sendEmailVerification` não é chamado e a promessa resolve |
| T3 | `signUpFormSubmitLock.test.tsx` (editado) | marcação | O HTML de `renderToString` tem `<form` com `novalidate`. O mock do client não precisa mudar: o render não chama o pedido |

Sem teste para o `px-4`: largura e recuo são da passada de navegador (`apps/web/CLAUDE.md:30-35`).

Comandos: `pnpm --filter web test`, `pnpm --filter web typecheck`, `pnpm check`; `pnpm test` da raiz no `/test`.

## 8. O que o `/test` vai percorrer

Ambiente: `pnpm emulators` (JDK 21) + `pnpm seed`, e `api`, `app` e `web` de pé apontando para o emulador, sem
`RESEND_TOKEN`. Conta de QA de `.claude/dev-credentials.local.md` ou criada no próprio fluxo F4, com e-mail fictício
(`@example.com`). Nenhuma senha vai para o `report.md`.

- **F1. Login pela tela.** `/<locale>/sign-in` sem sessão, entrar com e-mail e senha: termina em `/<locale>`, header
  logado. Nos três idiomas.
- **F2. Chega autenticado.** Com a sessão do F1, abrir `/<locale>/sign-in` direto na barra: vai para `/<locale>` sem
  página vazia. Repetir abrindo o login da web depois de entrar só pela app (`:3000`), que exercita o bootstrap de
  SSO (`docs/AUTH-SSO.md:119-121`).
- **F3. `?redirect=` preservado.** Sem sessão, abrir `/pt-br/sign-in?redirect=%2Fpt-br%2Fcontact` e entrar: termina em
  `/pt-br/contact`, não em `/pt-br`. É a prova de que o efeito novo não concorre com o provider (§1.3). Rodar umas três
  vezes, porque é corrida.
- **F4. Cadastro com modo degradado.** `/<locale>/sign-up` com e-mail novo: conta criada, termina em `/<locale>`
  logado, sem toast de erro. Na aba de rede (ou no log da API), um `POST /auth/email-verification/send` com
  `Authorization` e corpo `{"locale":"<locale>"}`, respondendo `503` `EMAIL_NOT_CONFIGURED`. Nenhum erro novo no
  console do navegador. Pelo menos um idioma completo; nos outros dois basta conferir o `locale` do corpo.
- **F5. `noValidate`.** Nos dois formulários, digitar `abc` no e-mail e enviar: aparece a mensagem do Zod no idioma da
  URL, sem balão nativo. Conferir também `qa@example` (passa no navegador, o Zod recusa) e campo vazio.
- **F6. 375 px.** Login e cadastro em claro e escuro: medir a distância do cartão até as bordas (esperado: 16 px de
  cada lado, `px-4`). A 768 px ou mais, o cartão continua centralizado e com `max-w-md`.

O que não dá para observar aqui, e vira 🔒: a chegada do e-mail de verificação na caixa de entrada e o clique no
link (§13).

## 9. Critérios de aceite (rascunho; o `/test` gera a versão final)

# Critérios de Aceite (Checklist)

- [ ] **Login pela tela da landing leva à home do idioma**
  Em `/pt-br/sign-in`, `/en/sign-in` e `/es/sign-in`, sem sessão, entrar com e-mail e senha válidos leva a
  `/pt-br`, `/en` e `/es`, com o header mostrando o usuário logado. O mesmo vale para o botão do Google, quando o
  emulador permitir. Senha errada continua mostrando o erro traduzido e deixa a pessoa na tela de login.

- [ ] **Visitante já autenticado não vê página vazia no login**
  Com sessão ativa, abrir `/<locale>/sign-in` leva a `/<locale>`. Antes, a tela ficava em branco abaixo do header. O
  caso inclui quem entrou só pela app e abre a landing, em que a sessão chega pelo cookie compartilhado e o bootstrap
  por custom token.

- [ ] **O destino em `?redirect=` continua valendo depois do login**
  Sem sessão, entrar a partir de `/pt-br/sign-in?redirect=%2Fpt-br%2Fcontact` leva a `/pt-br/contact`. O efeito novo
  do formulário não pode trocar a URL antes de o provider ler o `?redirect=`, em nenhuma das tentativas. Um
  `?redirect=` inseguro (`//evil.com`, caminho sem idioma) continua caindo em `/<locale>`, como já fazia.

- [ ] **Cadastro da landing pede o e-mail de verificação**
  Criar conta por e-mail e senha na landing gera um `POST /auth/email-verification/send` com o ID token da conta
  nova e o `locale` da URL no corpo, depois do login automático. O cadastro com Google não faz esse pedido, porque o
  provedor já atesta o endereço.

- [ ] **Falha no pedido de verificação não estraga o cadastro**
  Sem Resend, a API responde `503` com `EMAIL_NOT_CONFIGURED`, e a pessoa termina em `/<locale>` logada, sem toast
  de erro e sem erro novo no console. O mesmo vale para `EMAIL_SEND_FAILED`, `401 AUTH_INVALID_TOKEN` e falha de
  rede: a conta já existe nesse ponto e o pedido é descartado em silêncio.

- [ ] **Erro na criação da conta continua como antes**
  E-mail já em uso ou senha curta recusada pela API mostram a mensagem traduzida do `error.code` e não fazem login
  nem pedem verificação. Duplo clique no botão de criar conta não gera duas contas nem dois pedidos (o botão segue
  desabilitado enquanto a criação ou o login estão pendentes).

- [ ] **Validação só pelo Zod, traduzida**
  Nos dois formulários, enviar `abc`, `qa@example` ou campo vazio no e-mail mostra a mensagem do dicionário no idioma
  da URL, sem o balão nativo do navegador. Senha curta mostra a mensagem de mínimo de cada formulário (6 no login, 8
  no cadastro).

- [ ] **Cartão com recuo lateral a 375 px**
  A 375 px, nos temas claro e escuro, os cartões de login e cadastro ficam a 16 px de cada borda da tela, sem rolagem
  horizontal. Em telas largas o cartão continua centralizado com a largura máxima de antes.

- [ ] **Gates**
  `pnpm check`, `pnpm --filter web typecheck` e `pnpm test` da raiz passam. Nenhum `console` cru novo em
  `apps/web`.

## 10. Blueprint técnico

### 10.1 Contrato, rota, persistência, env

Nada novo. SDK, API, Firestore, i18n e env ficam intactos. Exemplo do pedido que a landing passa a fazer:

```http
POST /auth/email-verification/send
Authorization: Bearer <id token da conta recém-criada>
Content-Type: application/json

{ "locale": "en" }
```

```json
// sem Resend
{ "error": { "code": "EMAIL_NOT_CONFIGURED" } }   // 503
// com Resend
{ "data": { "requested": true } }                 // 200
```

### 10.2 Arquivos afetados

```
apps/web/
  app/[locale]/sign-in/components/sign-in-form-client.tsx   (editado)
  app/[locale]/sign-up/components/sign-up-form-client.tsx   (editado)
  __tests__/signInFormRedirect.test.tsx                     (novo)
  __tests__/signUpFormApi.test.tsx                          (editado)
  __tests__/signUpFormSubmitLock.test.tsx                   (editado)
```

### 10.3 Pseudo-diffs

`sign-in-form-client.tsx`:

```diff
 import Link from "next/link";
-import { useMemo } from "react";
+import { useRouter } from "next/navigation";
+import { useEffect, useMemo, useRef } from "react";

 export const SignInFormClient = () => {
+    const router = useRouter();
     const { dictionary, locale } = getDictionary();
     const { signIn, signInWithGoogle, user, loading: authLoading } = useAuth();
+    const submittedRef = useRef(false);
 ...
+    // A sign-in started on this screen is navigated by the auth provider, which honours
+    // `?redirect=`; only a visitor who arrives already signed in is sent home from here.
+    useEffect(() => {
+        if (!authLoading && user && !submittedRef.current) {
+            router.push(`/${locale}`);
+        }
+    }, [user, authLoading, router, locale]);
 ...
-        <div className="flex min-h-[calc(100vh-20rem)] items-center justify-center py-20">
+        <div className="flex min-h-[calc(100vh-20rem)] items-center justify-center px-4 py-20 md:px-2">
 ...
                     <form
                         className="space-y-4"
-                        onSubmit={form.handleSubmit((data) =>
-                            signIn.mutate(
+                        noValidate
+                        onSubmit={form.handleSubmit((data) => {
+                            submittedRef.current = true;
+                            signIn.mutate(
                                 { ...data },
                                 { onSuccess: handleSuccessSignIn }
-                            )
-                        )}
+                            );
+                        })}
                     >
 ...
-                    onClick={() =>
-                        signInWithGoogle.mutate(undefined, {
+                    onClick={() => {
+                        submittedRef.current = true;
+                        signInWithGoogle.mutate(undefined, {
                             onSuccess: handleSuccessSignIn,
-                        })
-                    }
+                        });
+                    }}
```

O comentário acima do efeito é a exceção legítima da `.claude/rules/code-comments.md` §2 (ordem de eventos não
evidente entre o efeito e o provider). Se o `/develop` achar um nome que dispense o comentário, melhor.

`sign-up-form-client.tsx`:

```diff
 import { useMutation } from "@tanstack/react-query";
+import type { UserCredential } from "firebase/auth";
 import Link from "next/link";
 ...
     const { signIn, signInWithGoogle, loading: authLoading, user } = useAuth();

+    // The account already exists when this runs, so a refused or failed request (no
+    // e-mail provider configured answers 503) must not turn the sign-up into an error.
+    const requestVerificationEmail = async (credential: UserCredential) => {
+        const accessToken = await credential.user
+            .getIdToken()
+            .catch(() => null);
+        if (!accessToken) {
+            return;
+        }
+        apiClient.setAuthorizationHeader(accessToken);
+        await apiClient.authApi
+            .sendEmailVerification({ locale })
+            .catch(() => null);
+    };
+
     const createAccount = useMutation({
         mutationFn: (credentials: SignUpRequest) =>
             apiClient.authApi.signUp(credentials),
         onError: (error) =>
             errorAlert(handleClientError(new FormattedError(error, locale))),
-        onSuccess: (_created, credentials) => signIn.mutate(credentials),
+        onSuccess: (_created, credentials) =>
+            signIn.mutate(credentials, { onSuccess: requestVerificationEmail }),
     });
 ...
-        <div className="flex min-h-[calc(100vh-20rem)] items-center justify-center py-20">
+        <div className="flex min-h-[calc(100vh-20rem)] items-center justify-center px-4 py-20 md:px-2">
 ...
                     <form
                         className="space-y-4"
+                        noValidate
                         onSubmit={form.handleSubmit(onSubmit)}
                     >
```

A ordem das classes Tailwind fica a cargo do `pnpm fix`. `firebase/auth` já é
importado como tipo no login da web (`sign-in-form-client.tsx:12`), então não há dependência nova.

`signUpFormApi.test.tsx` (trecho):

```diff
 vi.mock("@/shared/lib/client", () => ({
     apiClient: {
-        authApi: { signUp: (...args: unknown[]) => signUpApiMock(...args) },
+        setAuthorizationHeader: (...args: unknown[]) =>
+            setAuthorizationHeaderMock(...args),
+        authApi: {
+            signUp: (...args: unknown[]) => signUpApiMock(...args),
+            sendEmailVerification: (...args: unknown[]) =>
+                sendEmailVerificationMock(...args),
+        },
     },
 }));
 ...
-        expect(signInMutateMock).toHaveBeenCalledWith(CREDENTIALS);
+        expect(signInMutateMock).toHaveBeenCalledWith(
+            CREDENTIALS,
+            expect.objectContaining({ onSuccess: expect.any(Function) })
+        );
```

Os casos novos seguem o molde de `apps/app/__tests__/signUpFormApi.test.tsx:146-168`: pegar `options` de
`signInMutateMock.mock.calls[0]` e chamar `options.onSuccess({ user: { getIdToken } })`.

### 10.4 Ordem de implementação e plano de commits sugerido

Só `apps/web`; não há SDK, API nem i18n. A branch e o plano final são do `revisor-codigo`.

1. `fix(web): send an already signed-in visitor home from the landing sign-in`: `sign-in-form-client.tsx` (efeito +
   `submittedRef`), `__tests__/signInFormRedirect.test.tsx` (casos a-e).
2. `feat(web): request the verification e-mail after a landing sign-up`: `sign-up-form-client.tsx`
   (`requestVerificationEmail`), `__tests__/signUpFormApi.test.tsx`.
3. `fix(web): pad the auth cards on small screens and leave validation to the form`: `px-4 md:px-2` e `noValidate`
   nos dois arquivos, caso (f) de T1 e `__tests__/signUpFormSubmitLock.test.tsx`.
4. `docs(features): web-auth-forms`.

Os commits 1 e 3 tocam o mesmo arquivo; se o `revisor-codigo` preferir não fatiar hunks, junta 1 e 3 do login e 2 e 3
do cadastro.

### 10.5 Env e configuração

Nenhuma. Um fork sem Resend continua com o cadastro funcionando; com Resend, passa a receber o e-mail de
verificação também quando a conta nasce na landing.

## 11. Perguntas em aberto (decididas sem perguntar)

| # | Pergunta | Opções | Adotada | Por quê |
|---|---|---|---|---|
| D1 | Como o login navega quem já está autenticado? | (a) copiar o `useEffect` do cadastro como está; (b) `useEffect` que só navega se o formulário não foi enviado nesta montagem (`useRef`); (c) mudar o provider | **(b)** | (a) é o que o BACKLOG sugere, mas concorre com o provider e perde o `?redirect=` do fim de sessão (§1.3). (c) mexe em `packages/auth`, que serve as duas apps. (b) segue o padrão do cadastro no destino e no método e acrescenta três linhas no mesmo arquivo. Descartada: checar `signIn.isIdle`, porque o observer vive no provider e guarda `success` entre navegações, e a segunda visita ao login ficaria em branco |
| D2 | Destino de quem já está autenticado | (a) `/${locale}` da landing; (b) o painel (`NEXT_PUBLIC_APP_URL`) no modo `subscription` | **(a)** | É o que o cadastro faz (`sign-up-form-client.tsx:55`) e o `redirectPath()` do provider (`provider.tsx:136`). (b) acrescenta navegação entre apps e dependência de env; o header logado já oferece o link do painel em `subscription` (`header/index.tsx:60-66`) |
| D3 | `router.push` ou `router.replace` no efeito do login | push × replace | **push** | Mesmo método do cadastro (`:55`). `replace` evitaria voltar ao login vazio pelo botão "voltar", mas o efeito navega de novo de qualquer jeito |
| D4 | O que fazer com a falha do pedido de verificação | (a) descartar com `.catch(() => null)`; (b) `console.error` como a app; (c) avisar a pessoa | **(a)** | O BACKLOG proíbe `console` cru novo (`:278-279`). (c) pede chave nova e o corte é sem chave. A conta já existe; quem usa o painel tem o botão de reenviar |
| D5 | Aplicar a proteção do D1 também no cadastro? | sim × não | **não** | Nenhum caminho leva ao cadastro da web com `?redirect=` hoje (§1.3). Fica como achado adjacente (§1.6) |
| D6 | Teste do efeito do login com jsdom ou só `renderToString`? | jsdom × SSR | **jsdom no próprio arquivo** | Efeito não roda em `renderToString`. O `apps/web/CLAUDE.md:33-35` permite jsdom por arquivo para interação de Client Component, com `headerMobileMenu.test.tsx` de molde |

## 12. Riscos a medir

- **R1. A corrida do F3.** O guard do D1 resolve no código, mas a ordem real (`setUser`, efeito, `POST
  /api/auth/session`, leitura do `?redirect=`) só se mede no navegador. Se o F3 falhar, o problema é do efeito, não do
  provider.
- **R2. Teste existente editado.** O T2 muda a asserção de `signInMutateMock` porque a chamada ganhou um segundo
  argumento. A credencial continua conferida por igualdade; o `/review` deve ler isso como mudança de contrato, não
  como afrouxamento.
- **R3. Dois `AuthProvider`.** O formulário lê o provider interno. Se alguém remover um dos dois (§1.6), o observer do
  `signIn` continua no layout e o pedido de verificação continua saindo, mas vale reler o §1.4.

## 13. Pré-requisitos manuais de infra

O `/develop` não precisa de nenhum. O `/test` roda tudo com o emulador local, exceto a entrega real, que fica 🔒:

- `RESEND_TOKEN` e `RESEND_FROM` com domínio verificado (SPF e DKIM) na `apps/api` (`docs/PRE-PRODUCTION.md` §3).
- `NEXT_PUBLIC_APP_URL` na `apps/api` apontando para a `apps/app` real, que é a base do link do e-mail
  (`docs/PRE-PRODUCTION.md` §4). Sem ela a rota também responde `503 EMAIL_NOT_CONFIGURED`.
- `FIREBASE_WEB_API_KEY` na `apps/api`, para a confirmação do link (`docs/PRE-PRODUCTION.md` §4).

Com esses três ausentes, o critério "Cadastro da landing pede o e-mail de verificação" se prova pelo pedido e pelo
`503`, e a chegada à caixa de entrada fica 🔒, somada à pendência 13 do BACKLOG (`specs/BACKLOG.md:1960`).
