# Critérios de Aceite (Checklist)

Escopo: `apps/app/shared/lib/googleSignInApi.ts`. A tela é de usuário não autenticado, então os cortes de
autorização, ownership, impersonação e modo de produto não se aplicam. O comportamento é o mesmo nos modos
`subscription` e `simple`.

- [x] **Popup do Google sem ID token mostra a copy traduzida**
  Quando `GoogleAuthProvider.credentialFromResult` não traz `idToken`, `signInWithGoogleViaApi` rejeita com o
  texto de `packages.auth.provider.session.notEstablished` no idioma ativo (pt-br, en e es) e não chama
  `authApi.signInWithGoogle`. O usuário do Firebase criado pelo popup é deslogado com um `signOut` só.

- [x] **Resposta da API sem `session.idToken` mostra a copy traduzida**
  Quando `authApi.signInWithGoogle` resolve sem `session.idToken`, a função rejeita com a mesma copy nos três
  idiomas, não chama `POST /api/auth/session` e não define o header de autorização. O `signOut` do cliente
  acontece uma vez, e uma falha dentro dele não troca o erro que sobe.

- [x] **O idioma da copy segue a URL, não só o cookie**
  Com o `LocaleProvider` renderizado no segmento `[locale]` da URL (pt-br ou es) e o cookie `x-locale` em
  outro idioma (en), os dois ramos acima rejeitam com a copy do idioma da URL. O cookie só decide quando
  nenhum provider renderizou.

- [x] **Nenhum texto fixo em inglês sobra no arquivo**
  `googleSignInApi.ts` não contém mais `"Google sign-in did not return an ID token"` nem
  `"Invalid response from auth API"`; todo `throw` do arquivo usa o dictionary. Os comportamentos já testados
  (evento de conta nova antes da troca, recusa da API relançada intacta, falha do popup sem `signOut`) seguem
  passando sem alteração nos testes existentes.

- [ ] **O alerta de `SignInForm` e `SignUpFormClient` exibe a copy traduzida**
  Os dois formulários passam o erro por `errorAlert(handleClientError(new FormattedError(error, locale)))`,
  e `FormattedError.formatMessage` devolve `error.message` de um `Error` simples. Nenhum teste de componente
  mede isso para estes ramos, e eles não se reproduzem pela UI sem adulterar a resposta do Google ou da API.
  A afirmação se apoia na leitura do código.
