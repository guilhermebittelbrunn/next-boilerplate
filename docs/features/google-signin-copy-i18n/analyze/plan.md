# Plano: textos fixos em inglês no login com Google da app

> Tarefa direta, sem spec. Origem: achado do `specs/reference/AUDIT.md` (linha 348, "Os dois textos fixos em
> inglês de `googleSignInApi.ts` (`:61`, `:75`): P, valor baixo", e a linha da tabela em `:1595`).

## 1. Contexto

`apps/app/shared/lib/googleSignInApi.ts` troca o resultado do popup do Google por uma sessão da API. Dois
ramos de falha lançam `Error` com texto fixo em inglês:

| Linha | Condição | Texto atual |
|-------|----------|-------------|
| `googleSignInApi.ts:61` | `GoogleAuthProvider.credentialFromResult(result)` sem `idToken` | `"Google sign-in did not return an ID token"` |
| `googleSignInApi.ts:75` | `apiClient.authApi.signInWithGoogle` respondeu 2xx sem `session.idToken` | `"Invalid response from auth API"` |

Os números de linha batem com o AUDIT (`:61`, `:75`). O arquivo e o teste dele
(`apps/app/__tests__/googleSignInApi.test.ts`) **não têm alteração no working tree**: o `git diff` dos dois sai
vazio, então as outras tarefas em andamento não tocam neles.

### Os textos chegam à UI? Sim.

1. Os dois chamadores capturam o erro e mostram o resultado num alerta:
   `SignInForm.tsx:55` e `SignUpFormClient.tsx:56` fazem
   `errorAlert(handleClientError(new FormattedError(error, locale)))`.
2. `FormattedError.formatMessage` (`packages/shared/utils/helpers/formattedError.ts:27-57`) tenta, em ordem,
   `error.code` da API (só para `AxiosError` com `response`), código do Firebase Auth e, por último,
   `if (error instanceof Error) return error.message` (`:52-54`). Um `Error` simples cai nesse último ramo.
3. `handleClientError` (`handleClientError.ts:14-17`) devolve `error.message` sem tradução.

Resultado: o usuário em pt-br ou es vê a frase em inglês no alerta. É a regra de ouro 2 (texto de UI fora do
dictionary). A tarefa procede. O valor é baixo porque os dois ramos só disparam com resposta malformada do
Google ou da API, o que não acontece em uso normal.

### Padrão vigente para este caso

O próprio arquivo já resolve o terceiro ramo de falha do mesmo fluxo (`googleSignInApi.ts:86-91`): quando o
`POST /api/auth/session` falha, ele lança `new Error(getDictionary().dictionary.packages.auth.provider.session.notEstablished)`.
`getDictionary()` de `@repo/internationalization/client` lê o locale do cookie `x-locale`, e o teste
existente prova isso nos três idiomas (`googleSignInApi.test.ts`, bloco `it.each` da linha 120 e o caso de rede logo
abaixo).

O caminho de `error.code` + `apiErrors` (regra de ouro 3) não se aplica: nenhum dos dois ramos é uma resposta
de erro da API. O `:61` acontece antes de chamar a API e o `:75` é uma resposta 2xx com corpo inesperado. Os
erros do Firebase Auth (`auth/popup-closed-by-user`, `auth/popup-blocked`, ...) já são traduzidos por
`firebaseAuthMessage` a partir de `packages.auth.provider.firebase.error`
(`translations/packages/auth/index.ts`), e o popup cancelado ou bloqueado lança antes de chegar a estes
ramos, então fica como está.

### Objetivo e corte

- Trocar os dois textos fixos pela mesma chave do ramo vizinho: `packages.auth.provider.session.notEstablished`
  ("Não foi possível iniciar sua sessão. Tente entrar novamente." / "Your session could not be started. Try
  signing in again." / es equivalente). Do ponto de vista do usuário, os três ramos são a mesma falha: o login
  com Google não virou sessão, e a ação certa é tentar de novo.
- **Sem chave nova**, então sem i18n a sincronizar. Decisão registrada em "Perguntas em aberto".
- Fora de escopo: mudar o `FormattedError` para esconder `error.message` de `Error` genérico (afetaria todos os
  chamadores do repo) e qualquer mudança na landing (`apps/web`), que tem fluxo próprio.

### Apps impactados

Só `apps/app` (um arquivo de produção e um de teste). Sem SDK, API, dados, env, autorização ou impersonação:
a tela é de usuário não autenticado. Vale nos dois modos de produto.

## 2 a 6. Dados, SDK, API, front, segurança

N/A. Nenhuma rota, DTO, coleção, chave ou guard muda. O comportamento existente se mantém: os dois ramos
continuam dentro de `exchangeForApiSession`, então o `catch` de `signInWithGoogleViaApi`
(`googleSignInApi.ts:47-52`) segue chamando `signOut(auth)` antes de relançar.

## 7. Testes

Nível: unit, no arquivo que já existe (`apps/app/__tests__/googleSignInApi.test.ts`), com os mocks que ele
já tem (`credentialFromResultMock`, `signInWithGoogleMock`, `signOutMock`, cookie `x-locale`). Hoje nenhum dos
dois ramos tem teste (o grep pelos textos só encontra o arquivo de produção).

| Caso | Arranjo | Esperado |
|------|---------|----------|
| Popup sem ID token, por idioma (`it.each(["pt-br","en","es"])`) | `credentialFromResultMock.mockReturnValue(null)` e cookie `x-locale` no idioma | rejeita com `getDictionaryForLocale(locale)...session.notEstablished`; `signInWithGoogleMock` não é chamado; `signOutMock` chamado uma vez |
| API sem `session.idToken`, por idioma | `signInWithGoogleMock.mockResolvedValue({ session: {}, user: null })` | rejeita com a mesma copy traduzida; `fetchMock` (rota de sessão) não é chamado; `signOutMock` chamado uma vez |

Nenhum teste com emulador: a infra não é o objeto.

## 8. O que o `/test` vai percorrer

**Não precisa abrir browser.** Os dois ramos só disparam com resposta malformada. O emulador de Auth tem o
fluxo de Google falso, mas ele devolve credencial com `idToken`, e a API local devolve `session.idToken`;
forçar qualquer um dos ramos exigiria adulterar código ou interceptar a rede, e o que se veria é o mesmo
alerta que o ramo vizinho (`notEstablished`) já mostra hoje. Popup cancelado ou bloqueado é outro caminho
(código `auth/*`, já traduzido) e não muda. O `/test` roda a suíte Vitest da `apps/app` e o `pnpm test` da raiz.

## 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Popup do Google sem ID token mostra copy traduzida**
  Quando `GoogleAuthProvider.credentialFromResult` não traz `idToken`, `signInWithGoogleViaApi` rejeita com o
  texto de `packages.auth.provider.session.notEstablished` no idioma do cookie `x-locale` (pt-br, en e es),
  sem chamar `authApi.signInWithGoogle`. O usuário do Firebase criado pelo popup é deslogado (`signOut`
  chamado uma vez), como já acontece nos outros ramos de falha da troca.

- [ ] **Resposta da API sem `session.idToken` mostra copy traduzida**
  Quando `authApi.signInWithGoogle` resolve sem `session.idToken`, a função rejeita com a mesma copy traduzida
  nos três idiomas, não chama `POST /api/auth/session` e não define o header de autorização. O `signOut` do
  cliente acontece uma vez, e uma falha dentro dele não troca o erro que sobe.

- [ ] **Nenhum texto fixo em inglês sobra no arquivo**
  `googleSignInApi.ts` não contém mais `"Google sign-in did not return an ID token"` nem
  `"Invalid response from auth API"`; todo `throw` do arquivo usa o dictionary. Os demais comportamentos
  testados (evento de conta nova antes da troca, recusa da API relançada intacta, falha do popup sem
  `signOut`) seguem passando sem alteração nos testes existentes.

## 10. Blueprint

Pseudo-diff de `apps/app/shared/lib/googleSignInApi.ts`:

```diff
+function sessionNotEstablishedError(): Error {
+    return new Error(
+        getDictionary().dictionary.packages.auth.provider.session.notEstablished
+    );
+}
+
 async function exchangeForApiSession(
     result: UserCredential
 ): Promise<GoogleApiSignInResult> {
     const cred = GoogleAuthProvider.credentialFromResult(result);
     const googleIdToken = cred?.idToken;
     if (!googleIdToken) {
-        throw new Error("Google sign-in did not return an ID token");
+        throw sessionNotEstablishedError();
     }
 ...
     if (!session?.idToken) {
-        throw new Error("Invalid response from auth API");
+        throw sessionNotEstablishedError();
     }
 ...
     if (!sessionRes?.ok) {
-        throw new Error(
-            getDictionary().dictionary.packages.auth.provider.session
-                .notEstablished
-        );
+        throw sessionNotEstablishedError();
     }
```

O helper é opcional: com três usos idênticos no mesmo arquivo ele evita repetir o caminho do dictionary. Se o
`desenvolvedor` preferir repetir a expressão inline, também serve.

- i18n: nenhuma chave nova.
- Env/config: nenhuma.
- Ordem de commit: um commit `fix(app): translate google sign-in failure copy`, com código e teste juntos;
  depois `docs(features): google-signin-copy-i18n`.
- Pós-entrega: o `/spec --sync` remove a linha do AUDIT (`:348` e a linha da tabela em `:1595`).

## Perguntas em aberto

1. **Reusar `session.notEstablished` ou criar chave própria** (ex.: `packages.auth.provider.google.notCompleted`)?
   Recomendação: reusar. A ação do usuário é a mesma nos três ramos, o arquivo já usa essa chave e o teste dela
   já existe. Uma chave própria só se justifica se o produto quiser diferenciar "o Google falhou" de "a sessão
   não abriu" no texto.
