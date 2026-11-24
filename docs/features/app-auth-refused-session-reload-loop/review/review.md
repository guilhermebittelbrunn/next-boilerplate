# Revisão: laço de recarga com a sessão recusada

## Branch

`feat/delivery-security-hardening`, reutilizada. A branch foi criada e validada no começo desta rodada do `/cycle`,
e esta tarefa entra nela junto com as outras três. Regex do padrão: `branch OK` (forma sem `project`, aceita para
mudança em vários apps). Nada foi renomeado nem criado.

## Revisão

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/app/shared/hooks/useSignedInRedirect.ts:50-57`: a corrida R1 que o handoff levantou é real, e é regressão
  desta tarefa. No login novo, o hook e o `onAuthSuccess` do provider gravam a sessão quase juntos. Se o `POST` do
  hook falha e o do provider passa, o hook chamava `logout()`. O observador do provider recebe `null`, e
  `adoptSharedSession` (`packages/auth/provider.tsx:316-328`) não refaz o bootstrap, porque `applySignedInUser` já
  marcou `bootstrapAttemptedRef` (`:286`). O provider então faz `router.push` client-side, que não remonta nada, e o
  painel abre com cookie mas sem usuário no cliente Firebase e com `accessToken` nulo, até a pessoa recarregar. O
  mesmo vale para o Google da app: o popup loga o cliente, o hook dispara, e `signInWithGoogleViaApi` grava o próprio
  cookie depois e navega com `router.push`. Antes desta tarefa o efeito antigo nunca deslogava: o login seguia com
  `window.location.replace` em qualquer resposta que não fosse 401, e o cadastro ignorava a resposta. Os dois
  terminavam numa carga completa com o cookie que o provider gravou. **Corrigido** (ver "Correções aplicadas").

### 🟢 Sugestão / nit

- `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx:54-66`: o efeito novo que zera o ref entrou
  entre o comentário e o efeito de navegação que ele descreve. **Corrigido**: o comentário voltou para cima do
  efeito de navegação.
- Corrida inversa (o hook grava o cookie e o provider recebe a recusa): o `logout` do provider zera `user`, o efeito
  do hook é limpo e o `replace` não acontece. A pessoa fica no formulário com o toast `notEstablished` e um cookie
  válido; reenviar ou recarregar resolve, porque o proxy manda rota pública com cookie válido direto ao destino
  (`apps/app/proxy.ts:270-288`). Não há laço. Fica registrado, sem correção.
- `SignInForm.tsx:81-87,112` e o login da landing (`sign-in-form-client.tsx:46-52,92`): o `onSuccess` do `mutate`
  roda mesmo quando o provider recusou a sessão e deslogou, e escreve o header `Authorization` do `apiClient` com o
  token do usuário que acabou de sair. É anterior a esta tarefa e não causa laço; na app ainda contraria a regra de
  que só o `AuthRequestPanelProvider` escreve esses headers. Fora de escopo, candidato ao backlog.
- Login novo com a sessão revogada pela API: o provider mostra `notEstablished` (pelo `onAuthSuccess`) e o aviso de
  sessão revogada (por `applySignedInUser` → `handleSessionEnded`), e `logout` roda duas vezes. Os dois avisos já
  apareciam antes; o segundo `logout` não tem efeito. Fora de escopo.

### ✅ OK

- `packages/auth/provider.tsx:353-382`: `establishSession` desloga e zera o token na recusa; `onAuthSuccess` não
  relança, então as três mutações terminam em sucesso e o `isSuccess` lido em `EmailLinkCompletion.tsx:168` não
  muda. A navegação ficou fora do `try` e cai em `redirectPath()` se o resolvedor lançar (`:379-381`). O `logout` do
  Firebase é local, não chama `DELETE /api/auth/session` e não encerra sessão na API.
- Fluxos que não podem quebrar, conferidos por leitura:
  - Google da landing: passa por `onAuthSuccess`; na recusa desloga e o formulário volta, com o ref zerado.
  - Google da app: não passa pelo provider, e `googleSignInApi.ts:48-53` já deslogava na recusa.
  - Link por e-mail: o `isSuccess` continua verdadeiro na recusa, e a tela "Entrando…" com "Voltar ao login" não
    muda.
  - SSO web↔app: com cookie válido, o proxy não deixa a tela de login renderizar (`proxy.ts:270-288`), então o hook
    só roda sem cookie ou com cookie inválido.
  - Personificação do admin: acontece depois do login, fora destas telas, e nada do contexto de painel foi tocado.
  - Expiração e revogação: `applySignedInUser` e `handleSessionEnded` não mudaram e seguem mostrando o aviso
    próprio.
- Nenhuma navegação client-side para rota autenticada saiu do hook: ele só navega com `window.location.replace`
  depois de resposta 2xx, e o proxy decide no servidor. O provider só chama `router.push` com o cookie gravado.
- Hook em `shared/hooks/`, nome em camelCase, usado pelas duas rotas. Não chama a API pelo SDK (o `fetch` é para a
  rota Next do próprio front-end, o mesmo padrão de `provider.tsx:165` e `googleSignInApi.ts:80`), então a regra
  de função imperativa no mesmo arquivo não se aplica.
- Nenhuma string de UI nova; o alerta reaproveita `packages.auth.provider.session.notEstablished`, que existe nos
  três idiomas.
- `AuthContextType` sem campo novo; `packages/auth` não importa de `apps/*`.
- Comentários: os três que entraram (`provider.tsx:363-364`, o JSDoc do hook e o da corrida no hook) explicam o
  porquê e não citam o fluxo.
- Testes T1 a T4 conferidos por leitura; a prova do handoff de que eles pegam o defeito bate com o que os casos
  afirmam.

### 👁 Verificar no `/test`

- **R1 depois da correção.** O hook não desloga mais enquanto houver mutação em andamento no `QueryClient`, mas
  sobra uma janela: depois de o provider chamar `router.push` (a mutação termina) e antes de o formulário desmontar.
  Na leitura ela é estreita, porque o provider ainda espera `resolvePostLoginPath` (uma chamada a `/auth/me`) depois
  do próprio `POST`. Repro: `--init-script` que embrulha `window.fetch` e rejeita só o segundo
  `POST /api/auth/session` da página (contador no script), login por senha em `/pt-br/sign-in`. Esperado: o painel
  carrega com dados (sem skeleton parado) e, depois de recarregar, continua logado. Repetir com o Google da app, se
  houver conta de teste.
- **F1 a F7 do plano**, com o contador de cargas em `sessionStorage`. O fim do laço só foi provado com mock (T1 e T2).
- **Sessão persistida (F4) com o hook agora lendo `isMutating()`**: sem mutação na tela, o hook tem de deslogar e
  mostrar o formulário. Esperado: formulário em menos de 1 s, uma carga só.
- **Duplo envio com recusa**: o botão depende de `signIn.isPending`, que não mudou.

## Correções aplicadas

- `apps/app/shared/hooks/useSignedInRedirect.ts`: na recusa, o hook só chama `logout()` quando
  `queryClient.isMutating() === 0`. Com um login desta tela em andamento (`signIn` do provider, `googleSignIn` do
  formulário), quem decide é esse login: ele grava o próprio cookie e desloga se falhar. Um comentário de três
  linhas explica a corrida. A gravação do cookie foi para o helper `establishSession(user)`, porque a complexidade
  cognitiva do efeito passou do limite do Biome (17 de 15).

  ```ts
  if (!token) {
      if (queryClient.isMutating() === 0) {
          await logout().catch(() => null);
      }
      return;
  }
  ```

- `apps/app/__tests__/useSignedInRedirect.test.tsx`: o `renderHook` passou a montar um `QueryClientProvider`
  (helper `renderRedirect`) e ganhou o caso "deixa o logout para o login que ainda está em andamento nesta tela".
  Sem a correção, esse caso falha e os outros dez passam.
- `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx`: o comentário voltou para cima do efeito de
  navegação.

## Raio de impacto

- `packages/auth/provider.tsx` é usado pela `apps/app` e pela `apps/web`. O contrato (`AuthContextType`, as três
  mutações terminando em sucesso) não mudou. Comportamento novo nos dois apps: recusa da gravação desloga o cliente.
- `useSignedInRedirect` tem dois consumidores: `SignInForm` e `SignUpFormClient`. Ele agora exige
  `QueryClientProvider` acima, que os dois formulários já exigiam por causa do `useMutation`. Os seis arquivos de
  teste que renderizam esses formulários montam o provider (conferido).

## Lacunas de teste

| lacuna | veredito |
|--------|----------|
| O provider só tem teste pelo `signIn` por senha (Google e link por e-mail compartilham `onAuthSuccess`) | continua aberta |
| Nenhum teste monta o hook e o provider juntos (R1) | fechada em parte: o caso novo de T1 prova que o hook não desloga com mutação pendente; a interação real fica para o `/test` |
| Corrida inversa (hook grava e provider recusa) | aberta, sem teste; registrada como 🟢 |

## Decisões em aberto

Nenhuma. A correção de R1 foi adotada sem pergunta: é regressão desta tarefa, cabe em quatro linhas e não muda o
contrato do `useAuth`.

## Gates

| gate | comando | resultado |
|------|---------|-----------|
| lint | `pnpm check` | 1124 arquivos, sem erro |
| typecheck | `pnpm turbo run typecheck --filter=app --filter=web --filter=@repo/auth` | 3/3 sem erro |
| testes alterados | `vitest run` em `useSignedInRedirect`, `authFormsPersistedSessionRedirect`, `authProviderSessionNotEstablished` e nos cinco testes de formulário da app; `signInFormRedirect` na web | 54 + 7 testes passando |
| i18n | não rodado: nenhuma chave mudou | - |

## Rodada 2

### Defeito medido pelo `/test`

Em `build && start`, o laço acabou: uma carga em todos os casos de recusa. A corrida R1 continuou em parte. Com só o
`POST /api/auth/session` do hook rejeitado, a pessoa entrava no painel com cookie e com os dados renderizados no
servidor, mas o cliente ficava parado: em 6 s a API só recebia `GET /auth/me`, sem `GET /notifications/unread-count`
nem `GET /account`, até recarregar. Quem navegava era o `router.push` do provider. O `AuthRequestPanelProvider` do
layout raiz guarda o store criado na tela de login, sem sessão, e uma navegação client-side não o recria, então
`sdkAuthorized` não liga e todo `useAuthorizedQuery` fica esperando. Antes desta tarefa o `window.location.replace`
do formulário escondia isso. O QA mediu o mesmo estado em todo login por link de e-mail, sem recusa nenhuma, e esse
defeito é anterior a esta tarefa.

### Correção

Na raiz, como o orquestrador decidiu (alternativa (a)):

- `packages/auth/provider.tsx:124-129,136,388-392`: prop opcional `postLoginNavigation?: "client" | "full-page"`,
  com padrão `client`. Com `full-page`, o `onAuthSuccess` navega com `window.location.replace(destination)` em vez de
  `router.push`. Vale para as três mutações (senha, Google, link por e-mail).
- `packages/design-system/index.tsx`: o `DesignSystemProvider` repassa a prop ao `AuthProvider`.
- `apps/app/shared/providers/AppDesignProvider.tsx:34`: a app liga `postLoginNavigation="full-page"`. A `web` não
  passa a prop e continua com `router.push`.
- `SignInForm.tsx:63` e `SignUpFormClient.tsx:64`: o Google da app (que não passa pelo provider) também navega com
  `window.location.replace`. Sem isso, a variante de R1 com Google continuaria abrindo o painel parado. O
  `useRouter` saiu dos dois formulários.
- `apps/app/shared/hooks/useSignedInRedirect.ts:41-46`: a guarda da rodada 1 ficou mais simples e foi para o começo
  do efeito. Com uma mutação em andamento no `QueryClient`, o hook não grava a sessão nem navega; quem faz isso é o
  login da tela. Na rodada 1 o hook gravava em paralelo e só pulava o `logout` na falha. Agora a corrida R1 não
  existe, o login novo faz um `POST /api/auth/session` a menos, e o `replace` do hook não dobra mais a navegação de
  página inteira do provider. O caso que a guarda cobria (não deslogar um usuário que o login está levando ao painel)
  continua coberto.
- `apps/app/shared/lib/googleSignInApi.ts:39-40`: o comentário dizia que a carga completa vinha do sinal do popup,
  o que deixou de ser verdade. Agora diz que ela vem logo depois da troca bem-sucedida.
- `apps/app/CLAUDE.md:84`: regra nova, "pós-login é carga completa, nunca `router.push`", com o porquê. Sem ela, a
  regra vizinha ("troca de contexto usa `router.refresh()`") convida alguém a voltar para a navegação client-side.

Conferido por leitura:

- Não reabre laço com o proxy. As três navegações completas (provider, Google dos formulários, hook) só acontecem
  depois de um `POST` com resposta 2xx. O proxy recebe o cookie e decide o destino no servidor
  (`apps/app/proxy.ts:270-288`).
- Não dobra a navegação. Durante um login, o hook fica parado; com sessão persistida não há mutação, e só o hook
  navega.
- Link por e-mail: o `isSuccess` continua verdadeiro (o teste novo confere), e com a sessão recusada nada navega.
- A `web` não muda: sem a prop, o teste do padrão confirma `router.push`.

Nada foi revertido.

### Testes

- `apps/app/__tests__/postLoginFullPageNavigation.test.tsx` (novo, 6 casos): `full-page` faz `replace` e não
  `push`; o link por e-mail chega ao `replace` com `isSuccess`; recusa não navega e desloga; sem a prop continua o
  `push`; o `AppDesignProvider` passa `full-page`. O sexto caso monta o provider real com o hook: o login dispara o
  observador com o usuário, o hook não faz o `POST` relativo, ninguém desloga e há um `replace` só. Sem a guarda do
  hook, esse caso falha. Sem o ramo `full-page` do provider, três casos falham.
- `apps/app/__tests__/useSignedInRedirect.test.tsx`: o caso da rodada 1 virou "deixa a gravação e a navegação para o
  login que está em andamento nesta tela" (com mutação pendente, nenhum `fetch`, `logout` ou `replace`).

### Gates da rodada 2

| gate | resultado |
|------|-----------|
| `pnpm check` | 1125 arquivos, sem erro |
| typecheck `app`, `web`, `@repo/auth`, `@repo/design-system` (turbo, sem `--force`) | 4/4 sem erro |
| testes alterados e vizinhos da app (12 arquivos do fluxo de auth, `emailLinkCompletion`, `googleSignInApi`) | 79 + 19 + 11 passando |
| `signInFormRedirect` e `rootLayoutAuthProvider` na web | 8 passando |

### O que o `/test` deve remedir

- **R1**, rejeitando só o 2º `POST /api/auth/session` da aba. Agora o login novo faz dois `POST` (o de
  `applySignedInUser` e o de `onAuthSuccess`) e o hook não grava. Esperado: carga completa para `/pt-br`, e dentro de
  1 s saem `GET /notifications/unread-count` e `GET /account`, com o contador do sino aparecendo. Repetir rejeitando o
  1º `POST`. Se cair justo no de `onAuthSuccess`, o esperado é o toast `notEstablished` e o formulário, sem laço.
- **Link por e-mail sem recusa**: o painel abre por carga completa, com o sino carregando e
  `GET /notifications/unread-count` em menos de 1 s.
- **Google da app** (se houver conta de teste): o mesmo painel completo.
- **F1 a F6 sem regressão de cargas**: recusa continua em 1 carga; caminho feliz numa carga completa só, sem dois
  documentos para o destino. Contar os `POST /api/auth/session` do login por senha: devem ser dois.

## Plano de commits combinado da rodada

Recomposto com 35 commits quando a tarefa `app-footer-focus-not-obscured` entrou na rodada. O plano em vigor está em
[`../../app-footer-focus-not-obscured/review/review.md`](../../app-footer-focus-not-obscured/review/review.md). Os
commits desta tarefa mantêm mensagens e números (6, 7, 17, 18, 19, 26 e 34), com uma diferença: o
`apps/app/CLAUDE.md` saiu do commit 18 e foi para o commit 21 (`docs(claude)`), junto com a regra da tarefa das
barras fixas, para o arquivo não precisar de `git add -p`.
