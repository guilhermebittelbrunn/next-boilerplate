# Plano: laço de recarga com a sessão recusada (login e cadastro da app)

- **Slug:** `app-auth-refused-session-reload-loop`
- **Origem:** tarefa direta, sem spec. Fecha o 🟡 "Com a sessão recusada, o login e o cadastro da app recarregam a
  página em laço" (`specs/BACKLOG.md`, seção "Achados da tarefa `app-auth-forms` (PR #60)") e o que sobrou do 🟢 "No
  login da landing, `signInStartedHereRef` não volta a `false`" e do 🟢 "A web monta dois `AuthProvider` aninhados".
- **Branch:** `feat/delivery-security-hardening` (não é desta etapa trocar nem criar branch).
- **Rodada:** `/cycle` autônomo. As decisões estão em "Decisões adotadas", cada uma com a alternativa descartada.

---

## Etapa 1: análise

### 1. Contexto

Quando o Firebase aceita a credencial mas o servidor do front-end não grava o cookie de sessão
(`POST /api/auth/session` responde não-2xx ou a requisição nem chega), o login e o cadastro da `apps/app` entram em
laço de recarga. O `/test` de `app-auth-forms` mediu, com `--abort` na rota: alerta traduzido de 221 a 258 ms depois
do clique, primeira recarga de 398 a 454 ms depois, 16 a 18 recargas em 5 s no login e 20 cargas em 7 s no cadastro.
A pessoa não consegue ler a mensagem.

#### 1.1 Causa raiz

São dois defeitos que se somam.

**(a) O provider deixa o cliente Firebase logado depois da recusa.** `onAuthSuccess`
(`packages/auth/provider.tsx:353-365`) chama `syncSessionCookie` (`:161-183`), que lança
`SessionCookieRejectedError` com qualquer resposta não-2xx (`:171-176`). O `catch` (`:360-364`) só mostra
`session.notEstablished`. Não desloga, então `user` continua preenchido no contexto. Como `onAuthSuccess` não relança,
as três mutações (`:367-384`) terminam em sucesso. O `catch` também engole uma falha de `resolvePostLoginPath`, que roda
depois do toast de sucesso (`:358-359`).

**(b) O efeito "já autenticado" dos formulários da app trata usuário no Firebase como prova de sessão.**
- `SignInForm.tsx:91-125`: com `user` preenchido, regrava a sessão e navega com `window.location.replace` (recarga
  completa). O único freio é `status === 401` (`:110-112`).
- `SignUpFormClient.tsx:80-108`: a mesma cópia do efeito, sem freio nenhum. Ignora a resposta do `POST`.
- Enquanto há `user`, os dois só renderizam `FullScreenLoader` (`SignInForm.tsx:127-129`,
  `SignUpFormClient.tsx:147-149`). É por isso que o alerta some atrás do loader.

**O laço.** Sem cookie, o proxy da app manda qualquer rota protegida de volta para
`/<locale>/sign-in?redirect=…` (`apps/app/proxy.ts:262-268`). A página recarrega, o Firebase restaura o usuário do
IndexedDB, o provider repõe `user`, o efeito tenta gravar de novo, falha, navega, e o proxy devolve outra vez.

#### 1.2 Repro exato

1. `apps/app` de pé com Firebase (ou emulador). Conta comum qualquer.
2. Forçar a recusa de `POST /api/auth/session`. Instrumento sugerido para o `/test`: `--init-script` que embrulha
   `window.fetch` e, para `/api/auth/session` com `method: "POST"`, rejeita (simula rede) ou devolve
   `new Response('{"error":{"code":"AUTH_FORBIDDEN_ORIGIN"}}', { status: 403 })`. O `network route` do
   `agent-browser` 0.27.0 não intercepta nada; a memória do projeto registra isso.
3. Em `/pt-br/sign-in`, entrar com e-mail e senha.
4. Hoje: toast por ~200 ms, recargas sucessivas em `/pt-br/sign-in?redirect=…`. No cadastro, o mesmo passando pelo
   login.

#### 1.3 Cada forma de recusa, hoje

O `POST /api/auth/session` passa por `sessionPOST` (`packages/auth/session-routes.ts:92-117`).

| recusa | onde nasce | login da app hoje | cadastro da app hoje |
|--------|-----------|-------------------|----------------------|
| rede / abort / 5xx | infra | **laço** | **laço** |
| 403 `AUTH_FORBIDDEN_ORIGIN` | `refuseForeignOrigin` (`session-routes.ts:51-55`) + `isSameOriginRequest` (`session.ts:79-90`) | **laço** (o freio é só 401) | **laço** |
| 400 `AUTH_MISSING_TOKEN` | `:101-104` | **laço** | **laço** |
| 401 `AUTH_SESSION_EXPIRED` / `AUTH_SESSION_REVOKED` | `mintFailureResponse` (`:81-89`) / `refuseRevokedSession` (`:62-79`) | para; o provider desloga por `applySignedInUser` → `handleSessionEnded` (`provider.tsx:298-309`, `:252-270`) | corrida entre o logout do provider e a navegação do efeito |
| 401 `AUTH_INVALID_TOKEN` | `mintFailureResponse` (`:88`), inclusive quando `createSessionCookie` falha para conta desativada com ID token ainda em cache | **loader eterno**: o efeito para, mas ninguém desloga (`sessionEndReasonFor` só reconhece expirada e revogada, `provider.tsx:66-71`) | **laço** |

Conta desativada no Firebase Auth recusa já no `signIn` (`auth/user-disabled`), que vai para o `onError` da mutação e
não chega à gravação da sessão. Ela só entra na tabela acima quando o navegador já tinha o usuário restaurado e o ID
token em cache (até uma hora): aí a gravação responde 401 `AUTH_INVALID_TOKEN` e o login fica no loader eterno.

#### 1.4 A fatia 2 cria um caminho novo?

Sim, estreito. Antes da fatia 2, `isSameOriginRequest` aceitava requisição sem `Origin`. Agora exige `Origin` do
mesmo host ou `Sec-Fetch-Site: same-origin` (`session.ts:79-83`; diff ainda não commitado). Navegador atual manda
`Origin` em `POST` de mesma origem, então o caso novo pega cliente que tira o cabeçalho (extensão de privacidade,
navegador antigo sem `Sec-Fetch-Site`).

O caminho que importa mais já existia: proxy reverso na frente do front-end que reescreve `Host` sem preservar o
original. `new URL(origin).host === host` (`session.ts:86`) falha em toda requisição, todo login recebe 403, e a
recusa é determinística. Hoje isso vira laço permanente na app, porque o freio do login só olha 401. Depois desta
tarefa vira toast traduzido e formulário de volta.

#### 1.5 O que sobrou do achado da web

- **Dois `AuthProvider` aninhados:** fechado pela tarefa `e2e-org-ownership-flake-and-web-api-url`, que tirou o
  provider de dentro do `DesignSystemProvider` em `apps/web/app/[locale]/layout.tsx` (hoje `:39-52` monta só o
  `DesignSystemProvider`). Não mexer.
- **Dois `POST /api/auth/session` por login na app** (parte "Ampliado em 2026-10-22" do mesmo achado): continua
  aberto, fora de escopo. Vem do `onAuthSuccess` mais o observador do token (`provider.tsx:330-347`) e, na app, mais o
  efeito do formulário. Esta tarefa não acrescenta nenhuma chamada: o hook novo substitui as duas cópias do efeito.
- **Tela vazia do `signInStartedHereRef`** (`apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx`): o
  ref nasce `false` (`:31`), vira `true` no envio e no Google (`:83`, `:137`) e nunca volta. Com usuário, o componente
  devolve `null` (`:62-64`) e o efeito não navega com o ref em `true` (`:56-60`). Com o logout no provider, a recusa
  zera `user` e o formulário volta, o que fecha o sintoma medido em 2026-10-28. O ref preso continua errado num caso
  restante: depois de uma tentativa recusada, um login feito em outra aba propaga o usuário para esta, que devolve
  `null` sem navegar. A correção é zerar o ref quando `user` some.

#### 1.6 Objetivos

1. Recusa da gravação do cookie, de qualquer tipo, nunca recarrega a página em laço no login nem no cadastro da app.
2. A pessoa vê a mensagem traduzida e o formulário de volta, pronta para tentar de novo.
3. Navegação pós-login só acontece com o cookie gravado.
4. Na landing, recusa no login volta ao formulário e o `signInStartedHereRef` não fica preso.

#### 1.7 Fora de escopo

- Os dois ou três `POST /api/auth/session` por login (ver 1.5).
- O cadastro da landing (`apps/web/.../sign-up-form-client.tsx`): tem mudança não commitada da fatia 3 e não entra em
  laço (navega para a home pública da landing, que o proxy não devolve).
- A checagem de origem atrás de proxy que reescreve `Host` (`x-forwarded-host`). É contrato da fatia 2; ver
  "Perguntas em aberto".
- O login com Google da app (`googleSignInApi.ts:46-53`) já desloga na recusa. Os dois textos em inglês dele
  (`:62`, `:76`) são outro item do backlog.
- `applySignedInUser` deslogar em toda recusa. Em rota protegida o cookie existe (o proxy garante), então um soluço
  de rede derrubaria a sessão sem ganho. Fica como está.

#### 1.8 Corte de MVP

Provider desloga quando a gravação falha; um hook único da app para o "já autenticado", que só navega com resposta
2xx e desloga com qualquer outra; o ref da landing zera quando `user` some; testes de hook e componente. Sem string
nova, sem dependência nova, sem env nova.

#### 1.9 Apps e modo de produto

- `packages/auth` (provider), `apps/app` (login, cadastro, comentário do link por e-mail), `apps/web` (login).
- Área: telas não autenticadas. Igual em `subscription` e `simple`. Não depende de plano.

### 2. Dados (Firestore)

N/A. Nenhuma coleção, campo ou consulta.

### 3. Contrato `@repo/sdk`

N/A. As chamadas a `/api/auth/session` são para a rota Next do próprio front-end, não para a API. O `fetch` direto já
é o padrão dessas rotas (`provider.tsx:165`, `googleSignInApi.ts:80`, os dois formulários).

`AuthContextType` (`provider.tsx:35-48`) não muda. Decidido de propósito: os testes que mockam `useAuth` devolvem
objetos parciais, e um campo novo no contexto obrigaria a mexer em todos.

### 4. API

N/A. Nenhuma rota da `apps/api` muda. As rotas de sessão (`packages/auth/session-routes.ts`) também não: a recusa
continua com os mesmos códigos e status; o que muda é como o cliente reage.

| `error.code` | status | quem emite | reação do cliente depois desta tarefa |
|--------------|--------|-----------|---------------------------------------|
| `AUTH_FORBIDDEN_ORIGIN` | 403 | `refuseForeignOrigin` | logout + formulário (+ toast `notEstablished` no login novo) |
| `AUTH_MISSING_TOKEN` | 400 | `readIdToken` | idem |
| `AUTH_INVALID_TOKEN` | 401 | `mintFailureResponse` | idem |
| `AUTH_SESSION_EXPIRED` | 401 | `mintFailureResponse` | idem; o provider mostra também o aviso de expiração, como hoje |
| `AUTH_SESSION_REVOKED` | 401 | `refuseRevokedSession` | idem; aviso de sessão encerrada, como hoje |
| (sem resposta) | - | rede | logout + formulário (+ toast no login novo) |

Nenhum código novo em `apiErrors`.

### 5. Front-end

#### 5.1 Provider (`packages/auth/provider.tsx`)

`onAuthSuccess` passa a ter três passos separados:

1. Estabelecer a sessão (`getIdToken` → `setAccessToken` → `syncSessionCookie`). Falhou: `setAccessToken(null)`,
   `logout()` (com `.catch` para não mascarar), alerta `session.notEstablished`, retorna. Sem navegar.
2. Toast de sucesso.
3. Navegar com `resolvePostLoginPath(token)`, caindo em `redirectPath()` se ele lançar. Fora do `try` da sessão, para
   que uma falha aqui não vire "sessão não estabelecida" com o cookie já gravado.

`onAuthSuccess` continua sem relançar: as três mutações seguem terminando em sucesso. O link por e-mail
(`EmailLinkCompletion.tsx:165-178`) depende disso.

Efeito colateral, verificado na leitura: o `logout` dispara o observador (`:331-345`) com `null`, que chama
`adoptSharedSession` (`:316-328`). Como `applySignedInUser` já marcou `bootstrapAttemptedRef` (`:286`), o bootstrap
de SSO não roda de novo. Não tenta adotar um cookie compartilhado depois da recusa.

#### 5.2 Hook novo da app (`apps/app/shared/hooks/useSignedInRedirect.ts`)

Substitui as duas cópias do efeito. Regra: **só navega com o cookie gravado (resposta 2xx); qualquer outra resposta,
falha de rede ou falha de `getIdToken` desloga o cliente Firebase e fica na tela.** Com `user` zerado, o formulário
volta. O hook não mostra alerta: no login novo, o do provider já aparece; no caso de sessão persistida, o formulário é
o próximo passo certo, e expiração e revogação já têm aviso próprio vindo do provider.

O nome do arquivo segue a regra 9 (camelCase em módulo de feature) e mora em `shared/hooks/` porque serve duas
rotas. Não chama a API, então a regra "hook que chama a API exporta função imperativa" não se aplica.

#### 5.3 Formulários da app

- `SignInForm.tsx`: tira o efeito (`:88-125`), o import de `HTTP_STATUS` (`:17`) e de `useEffect` (`:22`, se não
  sobrar uso); chama `useSignedInRedirect()`. O retorno do loader (`:127-129`) fica.
- `SignUpFormClient.tsx`: tira o efeito (`:80-108`) e o `useEffect` do import (`:23`); chama
  `useSignedInRedirect()`. O loader (`:145-149`) fica.
- `EmailLinkCompletion.tsx:165-167`: só o comentário muda, porque passa a mentir ("the sign-in screen retries that
  session"). Depois desta tarefa, a recusa desloga e a saída é entrar de novo pelo login. Renderização igual.

#### 5.4 Login da landing (`apps/web/.../sign-in-form-client.tsx`)

No efeito de `:56-60`, quando `user` é `null`, zera `signInStartedHereRef`. Uma recusa (que agora desloga) encerra a
tentativa; um usuário que apareça depois, por outra aba, cai no "já autenticado" e vai para a home.

#### 5.5 Estados

| estado | login app | cadastro app | login landing |
|--------|-----------|--------------|---------------|
| sessão gravada | navega (como hoje) | navega (como hoje) | provider navega (como hoje) |
| recusa no login novo | toast `notEstablished` + formulário | toast + formulário (conta já criada; ver risco R2) | toast + formulário |
| recusa com sessão persistida | formulário, sem toast (expirada/revogada: aviso do provider) | idem | N/A (a landing manda para a home pública) |
| `user` carregando | loader | loader | formulário oculto |

#### 5.6 i18n

Nenhuma chave nova. `packages.auth.provider.session.notEstablished` já existe nos três idiomas
(`packages/internationalization/translations/packages/auth/index.ts:9`, `:49`, `:92`).

### 6. Autorização e segurança

- A proteção continua no servidor: o proxy da app exige cookie válido (`proxy.ts:262-268`). A mudança é só no cliente
  e fecha para o lado seguro: sem cookie, desloga.
- Nada muda nas rotas de sessão, na checagem de origem ou na consulta à `SessionAuthority`.
- Impersonação: N/A (telas não autenticadas; a impersonação acontece depois do login de um admin).
- O `logout` do Firebase é local (`client.ts:211-214`). Não chama `DELETE /api/auth/session`, então não encerra
  sessão nenhuma na API. Correto: não havia cookie para encerrar.

### 7. Testes

Todos em Vitest com mocks. Nenhum precisa de emulador nem app de pé: o objeto é a reação do cliente a uma resposta,
não a infra.

| id | arquivo | nível | o que prova |
|----|---------|-------|-------------|
| T1 | `apps/app/__tests__/useSignedInRedirect.test.tsx` (novo) | hook (`renderHook`) com `vi.mock` de `@repo/auth/provider`, `@repo/auth/client` (`logout`), `@/shared/lib/postLoginNavigation`, `fetch` e `window.location` | 200 → `replace(path)` sem `logout`; 401, 403, 400, 500 e `fetch` rejeitado → sem `replace`, sem `resolveAppPostLoginPath`, `logout` uma vez; `getIdToken` rejeitado → `logout`; `loading` ou `user` nulo → nem `fetch`; desmontar antes da resposta → nem `replace` nem `logout` |
| T2 | `apps/app/__tests__/signInPersistedSessionRedirect.test.tsx` → renomear para `authFormsPersistedSessionRedirect.test.tsx` (`git mv`) | componente | `describe.each` sobre `SignInForm` e `SignUpFormClient`: 401 e 403 e rede → sem `replace`, `logout` chamado; 200 → `replace`. É o teste de regressão do laço nos dois formulários (hoje só o login tem teste, e só do 401). Precisa ganhar `vi.mock("@repo/auth/client")` |
| T3 | `apps/app/__tests__/authProviderSessionNotEstablished.test.tsx` (estender) | componente (provider real) | na recusa (500 e rede, já existentes, mais 403 `AUTH_FORBIDDEN_ORIGIN`), `logout` é chamado e `accessToken` vira `null`; no sucesso, `logout` não é chamado; `resolveDefaultPostLoginPath` que lança → `push(redirectPath)`, sem alerta de erro e com o toast de sucesso. O mock de `logout` já existe (`:22`) |
| T4 | `apps/web/__tests__/signInFormRedirect.test.tsx` (estender) | componente | envio → `user` aparece (não navega) → `user` some → `user` aparece de novo → `push("/en")`. Prova que o ref zera |

Rodar: `pnpm --filter app test`, `pnpm --filter web test`, `pnpm --filter @repo/auth test` (o provider não tem teste
no pacote; os testes dele moram na app).

Teste E2E não entra. O que o `/test` mede no navegador (abaixo) cobre o laço real, e um Playwright com bloqueio de
rota repetiria isso sem provar nada que T1 e T2 não provem.

### 8. O que o `/test` vai percorrer

Instrumento de recusa: `--init-script` embrulhando `window.fetch` (ver 1.2). Para contar recargas, o mesmo script
incrementa um contador em `sessionStorage` a cada carga.

| fluxo | como produzir | esperado |
|-------|---------------|----------|
| F1 login app, rede recusada | script rejeita `POST /api/auth/session` | toast `notEstablished`, formulário visível, contador de cargas parado em 1 por 5 s, URL parada |
| F2 login app, 403 | script devolve 403 `AUTH_FORBIDDEN_ORIGIN` | igual a F1 |
| F3 cadastro app, rede recusada | conta nova `qa-refused-session-<n>@example.com` | toast, formulário de cadastro de volta, sem laço |
| F4 sessão persistida sem cookie | entrar normal, apagar o cookie `access-token`, recarregar `/pt-br/sign-in` com o script ativo | formulário aparece, sem laço e sem toast |
| F5 caminho feliz | sem script | login e cadastro navegam como antes; um `replace` |
| F6 login landing, rede recusada | script na `:3001` | toast e formulário de volta (antes: `<main>` vazio) |
| F7 link por e-mail com recusa | só se o provedor de e-mail estiver configurado; senão 🔒 | toast, tela "Entrando…" com "Voltar ao login", e o login mostra o formulário |

Combinações: F1 nos três idiomas (copy do toast); F1 e F6 em claro, escuro e 375 px (o toast e o formulário em cima
dele). O resto num idioma só.

### 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Login da app não recarrega em laço quando a gravação da sessão falha por rede**
  Com o `POST /api/auth/session` rejeitado antes de chegar ao servidor, o login por e-mail e senha mostra o toast
  `packages.auth.provider.session.notEstablished` e devolve o formulário. A URL fica em `/<locale>/sign-in` (com o
  `?redirect=` que já tinha) e não há nenhuma carga de página nova nos 5 s seguintes ao clique. Antes da mudança
  eram 16 a 18 recargas nesse intervalo.

- [ ] **Login da app não recarrega em laço com 403 `AUTH_FORBIDDEN_ORIGIN`**
  Com a rota respondendo 403 e corpo `{ "error": { "code": "AUTH_FORBIDDEN_ORIGIN" } }`, o comportamento é o mesmo do
  critério anterior. É o caso de um proxy que reescreve `Host` ou de um cliente sem `Origin` nem
  `Sec-Fetch-Site: same-origin`. Hoje ele entra em laço porque o freio só reconhece 401.

- [ ] **Cadastro da app não recarrega em laço quando a sessão é recusada**
  Criada a conta, se a gravação da sessão falha (rede, 403, 400, 401 ou 5xx), o cadastro mostra o toast e volta ao
  formulário de cadastro, sem passar pelo login nem recarregar. A conta continua criada no Firebase. Uma nova
  tentativa com o mesmo e-mail recebe o erro de e-mail em uso, já traduzido hoje.

- [ ] **Sessão persistida sem cookie não prende a tela no loader**
  Com o usuário restaurado pelo Firebase e o cookie ausente, abrir `/<locale>/sign-in` tenta gravar a sessão uma vez.
  Se a resposta for 401 `AUTH_INVALID_TOKEN` (ou qualquer não-2xx), o cliente é deslogado e o formulário aparece, sem
  toast. Hoje essa resposta deixa o `FullScreenLoader` na tela para sempre. Expirada (`AUTH_SESSION_EXPIRED`) e
  revogada (`AUTH_SESSION_REVOKED`) continuam com o aviso próprio do provider.

- [ ] **Navegação pós-login só acontece com o cookie gravado**
  O hook dos formulários da app chama `window.location.replace` só quando o `POST` responde 2xx, e o provider só
  chama `router.push` depois de `syncSessionCookie` resolver. Nenhuma recusa resulta em toast de sucesso
  (`packages.auth.provider.onSuccess`).

- [ ] **Uma falha ao resolver o destino não vira "sessão não estabelecida"**
  Se `resolveDefaultPostLoginPath` lançar depois de o cookie ser gravado, o provider navega para `redirectPath()`
  (`/<locale>` por padrão) e não mostra o alerta de sessão recusada. O toast de sucesso aparece normalmente.

- [ ] **Caminho feliz igual ao anterior**
  Com a sessão aceita, login e cadastro da app navegam para o mesmo destino de antes (`?redirect=` seguro, depois
  admin × comum por `resolveAppPostLoginPath`), com um único `replace`. O login por Google da app não muda.

- [ ] **Login da landing volta ao formulário depois da recusa**
  Na `apps/web`, com a sessão recusada, a pessoa vê o toast e o formulário de login, com o botão de enviar ativo.
  Antes, o `<main>` ficava vazio até recarregar. O `signInStartedHereRef` volta a `false` quando `user` some, então
  um login feito depois em outra aba leva esta para `/<locale>`.

- [ ] **Link por e-mail com sessão recusada**
  A conclusão do link mostra o toast e a tela "Entrando…" com "Voltar ao login", como hoje. A diferença é que o
  cliente foi deslogado: voltar ao login mostra o formulário em vez de outro laço. Sem provedor de e-mail
  configurado, este critério fica 🔒.

- [ ] **Mensagem nos três idiomas, tema e celular**
  O toast `notEstablished` aparece em pt-br, en e es com o texto do dicionário, legível em claro e escuro e a 375 px,
  por cima do formulário e sem cobrir o botão de enviar de forma permanente.

- [ ] **Duplo envio**
  Clicar duas vezes em "Entrar" com a sessão recusada não produz dois toasts de sucesso nem navegação. O botão fica
  desabilitado durante `signIn.isPending` (comportamento atual) e, depois da recusa, volta ativo.

---

## Etapa 2: blueprint técnico

### 10.1 Contrato

Nenhum contrato de SDK ou API muda. A interface nova é o hook:

```ts
// apps/app/shared/hooks/useSignedInRedirect.ts
export function useSignedInRedirect(): void;
```

### 10.2 Pseudo-diff: `packages/auth/provider.tsx`

```diff
-    const onAuthSuccess = async (credential: UserCredential) => {
-        try {
-            const token = await credential.user.getIdToken();
-            setAccessToken(token);
-            await syncSessionCookie(token);
-            successAlert(dictionary.packages.auth.provider.onSuccess);
-            router.push(await resolvePostLoginPath(token));
-        } catch {
-            errorAlert(
-                dictionary.packages.auth.provider.session.notEstablished
-            );
-        }
-    };
+    const establishSession = async (
+        credential: UserCredential
+    ): Promise<string | null> => {
+        try {
+            const token = await credential.user.getIdToken();
+            setAccessToken(token);
+            await syncSessionCookie(token);
+            return token;
+        } catch {
+            setAccessToken(null);
+            await logout().catch(() => null);
+            return null;
+        }
+    };
+
+    const onAuthSuccess = async (credential: UserCredential) => {
+        const token = await establishSession(credential);
+        if (!token) {
+            errorAlert(
+                dictionary.packages.auth.provider.session.notEstablished
+            );
+            return;
+        }
+        successAlert(dictionary.packages.auth.provider.onSuccess);
+        const destination = await resolvePostLoginPath(token).catch(
+            redirectPath
+        );
+        router.push(destination);
+    };
```

O comentário de `:349-352` continua valendo. Se o `desenvolvedor` achar que o porquê do logout não é evidente, uma
linha no `catch` ("sem cookie, o proxy devolve qualquer destino para o login; o cliente logado faria as telas
navegarem em círculo") é a exceção permitida pela regra de comentários. Sem citar artefato do fluxo.

### 10.3 Arquivo novo: `apps/app/shared/hooks/useSignedInRedirect.ts`

```ts
"use client";

import { logout } from "@repo/auth/client";
import useAuth from "@repo/auth/provider";
import { getDictionary } from "@repo/internationalization/client";
import { useEffect } from "react";
import { resolveAppPostLoginPath } from "@/shared/lib/postLoginNavigation";

async function writeSessionCookie(idToken: string): Promise<boolean> {
    const response = await fetch("/api/auth/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
    }).catch(() => null);
    return response?.ok === true;
}

export function useSignedInRedirect(): void {
    const { user, loading } = useAuth();
    const { locale } = getDictionary();

    useEffect(() => {
        if (loading || !user) {
            return;
        }
        let cancelled = false;
        (async () => {
            const token = await user.getIdToken().catch(() => null);
            const established = token ? await writeSessionCookie(token) : false;
            if (cancelled) {
                return;
            }
            if (!(token && established)) {
                await logout().catch(() => null);
                return;
            }
            const path = await resolveAppPostLoginPath({
                idToken: token,
                locale,
                fallbackPath: `/${locale}`,
            });
            if (!cancelled) {
                window.location.replace(path);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user, loading, locale]);
}
```

O comentário que hoje explica o efeito (`SignInForm.tsx:88-90` e `:107-109`) vira, no máximo, um JSDoc curto no hook
com o porquê: o proxy devolve ao login qualquer destino sem cookie, então navegar sem ele recarrega esta mesma tela.
O `desenvolvedor` decide se cabe; a regra de comentários pede o mínimo.

### 10.4 Pseudo-diff: formulários da app

```diff
 // SignInForm.tsx
-import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
-import { useEffect, useMemo } from "react";
+import { useMemo } from "react";
+import { useSignedInRedirect } from "@/shared/hooks/useSignedInRedirect";
 ...
-    const { signIn, user, loading: authLoading } = useAuth();
+    const { signIn, user, loading: authLoading } = useAuth();
+    useSignedInRedirect();
 ...
-    // Already authenticated ... (todo o useEffect de :88-125)
```

```diff
 // SignUpFormClient.tsx
-import { useEffect, useMemo } from "react";
+import { useMemo } from "react";
+import { useSignedInRedirect } from "@/shared/hooks/useSignedInRedirect";
 ...
+    useSignedInRedirect();
-    useEffect(() => { ... }, [user, authLoading, locale]);   // :80-108
```

```diff
 // EmailLinkCompletion.tsx:165-167 (só o comentário)
-    // A resolved attempt has spent the code, so offering the form again would only earn a
-    // refusal. The provider reports a session it could not store as an alert and stays
-    // put; the sign-in screen retries that session, which makes it the way out.
+    // A resolved attempt has spent the code, so offering the form again would only earn a
+    // refusal. A session the provider could not store is reported as an alert and signed
+    // out, so going back to sign-in is the way out.
```

### 10.5 Pseudo-diff: `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx`

```diff
     useEffect(() => {
+        if (!user) {
+            signInStartedHereRef.current = false;
+            return;
+        }
-        if (!authLoading && user && !signInStartedHereRef.current) {
+        if (!(authLoading || signInStartedHereRef.current)) {
             router.push(`/${locale}`);
         }
     }, [user, authLoading, router, locale]);
```

Cuidado na implementação: o ref vira `true` no envio com `user` já `null`. Como `user` não muda nesse momento, o
efeito não roda e não zera o ref antes da hora. Ele só zera numa transição real para `null` (a recusa) ou no mount.

### 10.6 Testes (esqueleto de T1)

```ts
const { authState, logoutMock, postLoginPathMock, replaceMock } = vi.hoisted(...);
vi.mock("@repo/auth/provider", () => ({ default: () => authState }));
vi.mock("@repo/auth/client", () => ({ logout: logoutMock }));
vi.mock("@/shared/lib/postLoginNavigation", () => ({ resolveAppPostLoginPath: postLoginPathMock }));
// fetch via vi.stubGlobal; window.location com replace mockado, como em signInPersistedSessionRedirect.test.tsx:95-98

it.each([401, 403, 400, 500])("desloga e fica na tela quando a gravação responde %i", ...);
it("desloga e fica na tela quando a requisição nem chega", ...);   // fetch rejeitado
it("desloga quando o ID token não sai", ...);                     // getIdToken rejeitado
it("navega com o cookie gravado e não desloga", ...);             // 200
it("não faz nada enquanto carrega ou sem usuário", ...);
it("não navega nem desloga depois de desmontado", ...);           // unmount antes de resolver o fetch
```

`getDictionary` de `@repo/internationalization/client` lê o locale da rota; envolver o `renderHook` no
`LocaleProvider` com `next/navigation` mockado (como em `authProviderSessionNotEstablished.test.tsx:41-48`), ou mockar
`getDictionary` direto.

### 10.7 Árvore de arquivos

```
packages/auth/provider.tsx                                                       (editar)
apps/app/shared/hooks/useSignedInRedirect.ts                                     (novo)
apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx        (editar)
apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx  (editar)
apps/app/app/[locale]/(unauthenticated)/sign-in/email-link/components/EmailLinkCompletion.tsx (só comentário)
apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx                 (editar)
apps/app/__tests__/useSignedInRedirect.test.tsx                                  (novo)
apps/app/__tests__/signInPersistedSessionRedirect.test.tsx → authFormsPersistedSessionRedirect.test.tsx (git mv + estender)
apps/app/__tests__/authProviderSessionNotEstablished.test.tsx                    (estender)
apps/web/__tests__/signInFormRedirect.test.tsx                                   (estender)
specs/BACKLOG.md                                                                 (não editar aqui; é do /spec --sync)
```

### 10.8 Sobreposição com mudanças não commitadas desta rodada

Conferido com `git status --short` em 2026-11-24 02:18: **nenhum** dos arquivos acima tem mudança não commitada de
outra feature. Os vizinhos que têm, e que esta tarefa não toca:

- `packages/auth/session.ts`, `session-routes.ts`, `server.ts` (fatia 2): só leitura, para a tabela de 1.3.
- `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx` (fatia 3): fora de escopo por isso (1.7).
- `apps/web/app/[locale]/layout.tsx` (`e2e-org-ownership-flake-and-web-api-url`): só leitura, para 1.5.
- `docs/AUTH-SSO.md` (fatia 2): não editar. Ele não descreve o caminho `notEstablished`, então nada nele passa a
  mentir.
- `apps/app/__tests__/panelState.test.ts` e `proxy.test.ts`: outros testes da mesma pasta, sem relação.

### 10.9 Ordem de implementação e commits

Sem SDK, API nem i18n. O `/review` dá o veredito final sobre o plano de commits.

1. `fix(auth): sign the client out when the session cookie is refused after sign-in`: `packages/auth/provider.tsx` +
   T3 (o teste mora em `apps/app/__tests__`; se o `/review` preferir um commit por pasta, ele vai junto do commit 2).
2. `fix(app): navigate from the auth screens only once the session cookie is written`: hook novo, os dois
   formulários, o comentário do link por e-mail, T1 e T2.
3. `fix(web): reset the sign-in attempt flag when the user signs out`: login da landing + T4.
4. `docs(features): app-auth-refused-session-reload-loop`: esta pasta, por último.

### 10.10 Env e configuração

Nenhuma env nova.

---

## Pré-requisitos manuais de infra

Nenhum para esta tarefa.

Observação para a etapa de entrega (`/deliver`): um proxy reverso na frente da `apps/app` ou da `apps/web` que não
preserve o cabeçalho `Host` faz `isSameOriginRequest` (`packages/auth/session.ts:79-90`) recusar todo login com 403.
Depois desta tarefa a pessoa vê "não foi possível estabelecer a sessão" em vez do laço, mas continua sem entrar. Na
Vercel o `Host` chega preservado; o risco é de fork com proxy próprio. Ver a pergunta Q4.

---

## Riscos

- **R1. Corrida entre o efeito do formulário e o `onAuthSuccess`.** No login novo, os dois gravam a sessão ao mesmo
  tempo. Se o efeito falhar e o provider tiver sucesso (só com instabilidade entre duas requisições quase
  simultâneas), o efeito desloga e o provider navega com o cookie gravado. Na rota protegida, o provider faz o
  bootstrap pelo cookie (`adoptSharedSession`) e a pessoa entra. Em `/<locale>/sign-in` com `?redirect=`, o proxy
  manda direto ao destino (`proxy.ts:270-286`). Não há laço; no pior caso, um bootstrap a mais.
- **R2. Cadastro com conta criada e sessão recusada.** O formulário de cadastro volta, mas a conta existe. Reenviar dá
  "e-mail em uso", já traduzido. Aceito: o caminho é ir para o login, cujo link está na mesma tela.
- **R3. Logout em soluço de rede na sessão persistida.** Quem chega ao login com usuário restaurado e sem cookie, e
  pega uma falha transitória, precisa digitar a senha de novo. Aceito: falha para o lado seguro, e esse caminho já
  terminava no login.

## Decisões adotadas

| # | decisão | escada | alternativa descartada e por quê |
|---|---------|--------|----------------------------------|
| D1 | Deslogar o cliente Firebase na recusa, no provider e no hook | padrão do repo: `googleSignInApi.ts:46-53` já faz isso | **`onAuthSuccess` lançar** (a "função que lança" do `/review` da PR #56): mudaria a semântica das três mutações, quebraria o `isSuccess` de que `EmailLinkCompletion` depende e geraria um segundo toast pelo `onError`, com a mensagem crua de `SessionCookieRejectedError` em inglês |
| D2 | Hook único na app no lugar das duas cópias do efeito | corrigir na raiz (`cycle-policy` §3): as cópias divergiram, e é por isso que o cadastro perdeu o freio | **Só acrescentar `!ok` nos dois efeitos:** sem logout, o formulário continua escondido pelo loader enquanto há `user` (é o loader eterno do 401 `AUTH_INVALID_TOKEN` de hoje) |
| D3 | Corrigir provider **e** formulários | menor raio que fecha o defeito | **Só o provider:** o laço da sessão persistida (403 determinístico, `AUTH_INVALID_TOKEN`) não passa pelo `onAuthSuccess`, e no login novo o fim do laço dependeria de o logout ganhar a corrida da navegação |
| D4 | O hook não mostra alerta próprio | menor raio; sem string nova | **Alerta no hook:** dois toasts no login novo (o do provider e o do hook); no caso persistido, o formulário já comunica o próximo passo |
| D5 | Navegação fora do `try` do `onAuthSuccess`, com fallback para `redirectPath()` | achado do backlog, mesma passada | **Deixar como está:** uma falha do resolvedor depois do toast de sucesso mostraria "sessão não estabelecida" com o cookie gravado |
| D6 | Zerar `signInStartedHereRef` quando `user` some | fecha o título do achado com 3 linhas | **Só o logout do provider:** fecha o sintoma medido, mas deixa o ref preso no caso de login em outra aba |
| D7 | Não editar `docs/AUTH-SSO.md` | menor raio; o arquivo tem diff não commitado da fatia 2 | Acrescentar um parágrafo sobre a recusa: o doc não descreve esse caminho hoje, então nada passa a mentir, e editar misturaria hunks de duas tarefas no mesmo arquivo |
| D8 | `AuthContextType` sem campo novo (o hook importa `logout` de `@repo/auth/client`) | menor raio | **Expor `signOutLocally` no contexto:** todos os mocks parciais de `useAuth` teriam de mudar |

## Perguntas em aberto

Nenhuma bloqueia. Cada uma tem a resposta adotada.

- **Q1. Na recusa, deslogar ou só mostrar o formulário mantendo o cliente logado?** Adotado: deslogar (D1). Segue o
  precedente do Google da app, e o cliente logado sem cookie é exatamente o estado que gera o laço.
- **Q2. No cadastro, depois da recusa, voltar ao formulário de cadastro ou mandar ao login?** Adotado: voltar ao
  cadastro com o toast (R2), sem string nova. Alternativa, se você preferir: redirecionar para
  `/<locale>/sign-in?redirect=…` na recusa do cadastro. Fica para você porque muda o fluxo visível.
- **Q3. Mostrar algo quando a sessão persistida é recusada em silêncio?** Adotado: não (D4). O formulário aparece, e
  expiração e revogação já têm aviso próprio.
- **Q4. A checagem de origem da fatia 2 deve aceitar `X-Forwarded-Host` atrás de proxy?** Fora desta tarefa, que só
  impede o laço. Adotado: não mexer; a observação está em "Pré-requisitos manuais de infra". Aceitar o cabeçalho
  pede lista de proxies confiáveis, ou abre a checagem para qualquer cliente que o forje. É decisão da fatia 2.
- **Q5. Os dois ou três `POST /api/auth/session` por login na app.** Continua aberto no backlog. Adotado: fora de
  escopo; esta tarefa não acrescenta chamada nenhuma.

## Veredito dos achados de origem

| achado | veredito |
|--------|----------|
| 🟡 laço de recarga no login e no cadastro da app | **fechado aqui** |
| 🟢 `signInStartedHereRef` não volta a `false` / tela vazia na landing | **fechado aqui** (logout no provider + ref zerado) |
| 🟢 dois `AuthProvider` aninhados na web | **fechado** por `e2e-org-ownership-flake-and-web-api-url` (não commitado nesta rodada) |
| 🟢 parte "Ampliado": dois `POST` por login na app | **continua aberto**, fora de escopo |
| 🟢 `catch` de `onAuthSuccess` engolindo falha de `resolvePostLoginPath` | **fechado aqui** (D5) |
| lacuna "O teste do provider só dispara o login por senha" | **continua aberta**: T3 cobre a recusa pelo `signIn`; as três mutações compartilham `onAuthSuccess` |
| loader eterno com 401 `AUTH_INVALID_TOKEN` (novo, achado nesta análise) | **fechado aqui** pelo hook |
