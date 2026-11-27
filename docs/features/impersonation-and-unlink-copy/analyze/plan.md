# Plano: copy do desvincular com sessões não encerradas e o menu do perfil sob personificação

Tarefa direta, sem spec. Origem: `specs/reference/AUDIT.md:348-349` ("Tarefas diretas candidatas") e os dois
achados que ela linka (`:1937` e `:1940`, reconfirmados como abertos em `:1973` e `:1976`). Plano feito em
rodada autônoma do `/cycle`: as decisões foram tomadas sem perguntar e estão na §12, cada uma com a
alternativa descartada.

Os dois itens procedem. O item 1 procede com o escopo corrigido (ver §1.1): o problema é a copy que o
**desvincular a senha** mostra, não a copy de `apiErrors.AUTH_SESSIONS_NOT_REVOKED` em si, que continua certa
nos outros quatro fluxos que a usam. O item 2 procede e é um pouco maior que o achado: além do nome, o
e-mail e a foto também caem no usuário do Firebase, que é o admin.

---

## 1. Contexto

### 1.1 Item 1: a mensagem depois de desvincular a senha

Quem desvincula a senha na aba Segurança e a API não consegue revogar as sessões recebe
`500 { error: { code: "AUTH_SESSIONS_NOT_REVOKED" } }` (`apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts:136-141`,
`apps/api/(shared)/lib/session-revocation.ts:38-45`). A tela trata o erro sem deslogar: o `onError` do
desvincular recarrega a conta e mostra o toast com a copy de `apiErrors`
(`apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useSignInMethodMutations.tsx:71-74`),
e o `signOut` só roda no `onSuccess` (`.../account/(components)/AccountSignInMethodsPanel.tsx:76-83`). O
teste `apps/app/__tests__/accountSignInMethodsSessionsNotRevoked.test.tsx:137-147` fixa exatamente isso:
`signOut` não é chamado e o toast é `apiErrors.AUTH_SESSIONS_NOT_REVOKED`.

A copy atual (`packages/internationalization/translations/packages/shared/utils.ts:60`, `:246`, `:434`):

> A alteração foi salva, mas não conseguimos encerrar as outras sessões desta conta. Entre de novo e use
> "Sair de todos os dispositivos" em Segurança.

No desvincular, a pessoa continua na aba Segurança, logada, com o botão "Sair de todos os dispositivos" na
mesma tela (`AccountSecurityForm.tsx` renderiza o `AccountSignInMethodsPanel` e o bloco de sair de todos).
"Entre de novo" manda fazer algo que ela não precisa fazer.

O mesmo código sai de outras quatro rotas. Conferi cada uma para decidir se a copy compartilhada muda:

| rota | onde a pessoa está quando lê | "Entre de novo" está certo? |
|------|------------------------------|-----------------------------|
| `POST /auth/password/reset` (`reset/route.ts:57`) | tela pública de redefinição, sem sessão; o card de sucesso leva ao login (`ResetPasswordForm.tsx:23`) | sim |
| `POST /auth/email-change/confirm` (`confirm/route.ts:86`) | tela pública de confirmação, com link "Ir para o login" (`ConfirmEmailChangeResult.tsx:68-86`) | sim |
| `POST /account/password` (`password/route.ts:84`) | aba Segurança, sem `signOut` no erro (`AccountSecurityForm.tsx:68-76`) | na prática sim: no emulador a própria troca de senha derrubou a sessão, a requisição seguinte voltou `401` e recarregar levou ao login (`docs/features/delivery-security-review/test/report.md:116-119`) |
| `POST /account/password/set` (`password/set/route.ts:92`) | aba Segurança, sem `signOut` no erro (`AccountPasswordSetForm.tsx:48-53`) | provavelmente, pelo mesmo motivo da troca (gravar senha nova); não medido |
| `DELETE /account/sign-in-methods/password` (`[id]/route.ts:140`) | aba Segurança, a tela recarrega a conta e mantém a pessoa logada | **não** |

Conclusão: a copy de `apiErrors` serve a quatro fluxos e fica como está. O desvincular ganha uma mensagem
própria, escolhida no front quando o código é `AUTH_SESSIONS_NOT_REVOKED`. É o mesmo padrão que as telas de
redefinição e de confirmação de e-mail já usam para tratar esse código à parte (`apiErrorCodeOf` de
`apps/app/shared/lib/apiErrorCode.ts:2`).

Se o Firebase encerra ou não a sessão ao devolver o e-mail depois do desvincular segue sem medição
(`docs/features/auth-revocation-failure/analyze/plan.md:170`). A mensagem nova não depende disso: ela manda
usar o botão que está na tela, o que vale nos dois casos. Se a sessão já tiver caído, a próxima requisição
volta `401` e o SDK leva ao login sozinho.

### 1.2 Item 2: o menu do perfil durante a personificação

`apps/app/shared/components/ui/ProfileDropdown.tsx:42-44`:

```ts
const displayName = account?.displayName ?? user?.displayName ?? null;
const email = account?.email ?? user?.email ?? null;
const avatarSrc = account?.avatarUrl || user?.photoURL || null;
```

`account` vem de `useMyAccount()` (`GET /account/me`, que responde pela pessoa personificada) e `user` vem de
`useAuth()`, o usuário do Firebase, que é sempre o admin. Personificando alguém sem `displayName`, o menu
mostra o nome do admin (`:42`). O achado da auditoria para aí, mas as linhas `:43-44` têm o mesmo defeito:
personificando alguém sem avatar, o menu mostra a foto do admin (`||` cai no `photoURL`), e enquanto
`/account/me` carrega aparecem nome e e-mail do admin. Os três vêm do mesmo fallback e entram no mesmo
conserto.

Fora da personificação o fallback continua útil: ele cobre o instante antes de `/account/me` responder,
como fixa o teste `apps/app/__tests__/profileDropdownAccount.test.tsx:60-64` ("cai no usuário do Firebase
enquanto a conta não carregou").

### 1.3 Objetivo e corte de MVP

- Desvincular a senha com revogação recusada mostra uma mensagem que não manda entrar de novo e aponta o
  botão da própria tela.
- Sob personificação, o menu do perfil nunca mostra nome, e-mail ou foto do admin. Sem dado da conta
  personificada, mostra vazio (iniciais vazias, sem nome no gatilho) até `/account/me` responder.

### 1.4 Fora de escopo

- Mudar a copy de `apiErrors.AUTH_SESSIONS_NOT_REVOKED` (serve aos outros quatro fluxos).
- Tratar à parte o `AUTH_SESSIONS_NOT_REVOKED` da troca e da definição de senha (fica registrado na §11).
- Usar o `impersonatedLabel` do painel como nome provisório no menu (D4).
- Esconder o `DropdownMenuLabel` vazio quando a conta não tem nome (`ProfileDropdown.tsx:65`). Já acontece
  hoje para quem não tem nome fora da personificação; não é regressão desta tarefa.
- API, SDK, env, Firestore: nada muda.

### 1.5 Apps impactados e área

`apps/app` (painel comum, aba Segurança da conta; menu do perfil nos dois painéis) e
`packages/internationalization`. Independe do modo de produto e de plano. O painel admin usa o mesmo
`ProfileDropdown` (`apps/app/app/[locale]/(authenticated)/(admin)/admin/layout.tsx:52`), mas ali não há
personificação, então o comportamento não muda.

## 2. Dados (Firestore)

N/A.

## 3. Contrato `@repo/sdk`

N/A. Nenhum tipo novo; `AccountDTO.displayName`, `email` e `avatarUrl` já existem
(`packages/sdk/src/types/account/account.ts:11-23`).

## 4. API

N/A. Nenhum código de erro novo. `AUTH_SESSIONS_NOT_REVOKED` continua saindo das mesmas cinco rotas com 500.

## 5. Front

### 5.1 Desvincular

`useSignInMethodMutations.tsx`, `onError` do `unlinkMutation` (`:71-74`): depois do `refreshAccount()`, se
`apiErrorCodeOf(error) === "AUTH_SESSIONS_NOT_REVOKED"`, chama `errorAlert(accountMessages.passwordUnlinkedSessionsNotRevoked)`
e retorna; senão segue o `alertUnlessDismissed(error)` de hoje. O `refreshAccount()` continua antes, porque
a senha foi desvinculada de fato e a lista de métodos precisa refletir isso.

A mensagem sai sem o sufixo "(Código do erro: …)" que o `handleClientError` acrescenta. É o mesmo tratamento
do `successAlert(accountMessages.passwordUnlinked)` ao lado, e o código não ajuda a pessoa aqui: ela tem a
ação para resolver na mesma tela.

`setPasswordMutation` e `linkGoogleMutation` não mudam.

### 5.2 Menu do perfil

`ProfileDropdown.tsx`: ler `isImpersonating` de `useAuthRequestPanel()`
(`apps/app/shared/providers/AuthRequestPanelContext.tsx:170`), o mesmo hook que `AccountSignInMethodsPanel`,
`AccountSecurityForm` e as telas de organização usam. Sob personificação, o fallback vira `null`:

```ts
const { isImpersonating } = useAuthRequestPanel();
const fallbackUser = isImpersonating ? null : user;
const displayName = account?.displayName ?? fallbackUser?.displayName ?? null;
const email = account?.email ?? fallbackUser?.email ?? null;
const avatarSrc = account?.avatarUrl || fallbackUser?.photoURL || null;
```

O comentário das linhas `:40-41` continua verdadeiro e ganha meia frase sobre o porquê do corte sob
personificação (regra de negócio não evidente: o usuário do Firebase é o admin). Exemplo:

```ts
// The Firebase client user is the fallback, not the source: it does not know the
// avatar reference and keeps a stale display name until the token refreshes. While
// impersonating it is the admin, so it is never shown.
```

O `ProfileDropdown` é sempre montado dentro do `AuthRequestPanelProvider` (`apps/app/app/[locale]/clientLayout.tsx`),
inclusive na tela de playground, então o hook não quebra em produção. Nos testes ele quebra sem provider
(`apps/app/shared/stores/panelStore.ts:113-115`), e por isso os quatro testes do componente ganham um mock
(§7).

## 6. i18n

Uma chave nova em `apps.app.pages.common.account.messages`, nos três idiomas, ao lado de `passwordUnlinked`
(`packages/internationalization/translations/apps/app/pages/common/account.ts:265`, `:534`, `:809`). O rótulo
do botão é escrito por extenso, como já faz a copy de `apiErrors` (`utils.ts:60`), e bate com
`account.security.signOutEverywhere` (`account.ts:92`, `:361`, `:632`).

| idioma | `passwordUnlinkedSessionsNotRevoked` |
|--------|--------------------------------------|
| pt-br | `Senha removida, mas não conseguimos encerrar as outras sessões desta conta. Use "Sair de todos os dispositivos" nesta página para encerrá-las.` |
| en | `Password removed, but we could not end the other sessions of this account. Use "Sign out everywhere" on this page to end them.` |
| es | `Contraseña quitada, pero no pudimos cerrar las otras sesiones de esta cuenta. Usa "Cerrar sesión en todos los dispositivos" en esta página para cerrarlas.` |

O começo repete o verbo de `passwordUnlinked` em cada idioma ("Senha removida", "Password removed",
"Contraseña quitada") e o resto segue o tom de `AUTH_SESSIONS_NOT_REVOKED`. Nenhuma chave de `apiErrors` muda.

## 7. Testes

Todos no nível de componente ou hook, com `vi.mock`. Nada exige emulador.

| arquivo | o que muda | prova |
|---------|------------|-------|
| `apps/app/__tests__/accountSignInMethodsSessionsNotRevoked.test.tsx` | a asserção de `:137-142` passa a esperar `globalTranslations[locale].apps.app.pages.common.account.messages.passwordUnlinkedSessionsNotRevoked` em vez de `apiErrors.AUTH_SESSIONS_NOT_REVOKED`; acrescentar que o texto não contém o sufixo de código. O resto (sem `signOut`, sem sucesso, `invalidateQueries` com `queryKeys.account.me()`) fica | a mensagem nova nos 3 idiomas e o comportamento de antes preservado |
| mesmo arquivo, caso novo | desvincular a senha com outro erro (`500 ACCOUNT_UPDATE_FAILED`) continua mostrando `handleClientError` da copy de `apiErrors` | o desvio é só para `AUTH_SESSIONS_NOT_REVOKED` |
| `apps/app/__tests__/profileDropdownAccount.test.tsx` | mock de `@/shared/providers/AuthRequestPanelContext` com `useAuthRequestPanel: () => useAuthRequestPanelMock()`, default `{ isImpersonating: false }`. Casos novos: (a) personificando, conta com `displayName: null` e sem `avatarUrl`, `user` do Firebase com nome e foto: nem o primeiro nome nem a foto do admin aparecem, e o gatilho mostra o prefixo do e-mail da conta; (b) personificando, `account` ainda `undefined`: nem nome nem e-mail do admin aparecem; (c) personificando, conta com nome: mostra o nome da conta | o defeito do achado e as duas variantes (foto e carregamento) |
| `apps/app/__tests__/profileDropdownAvatarEmpty.test.tsx`, `profileDropdownCookieConsent.test.tsx`, `profileDropdownHelpLink.test.tsx` | só o mock de `@/shared/providers/AuthRequestPanelContext` com `isImpersonating: false`, como faz `accountSignInMethodsSessionsNotRevoked.test.tsx:27-29` | os testes que já existem seguem rodando sem provider |

A paridade das chaves nos 3 idiomas já tem teste no pacote de i18n; a chave nova entra nele sem arquivo novo.

Prova por mutação para o `/test`: tirar o `isImpersonating ? null : user` e ver o caso (a) cair; tirar o
desvio no `onError` e ver o teste do desvincular cair nos 3 idiomas.

## 8. O que o `/test` vai percorrer

- **Menu do perfil personificando.** No painel admin, personificar uma conta comum sem nome e sem avatar
  (criar no emulador com e-mail e senha, sem preencher nome). Abrir o menu do perfil: o gatilho e o rótulo
  mostram dados da conta personificada (prefixo do e-mail no gatilho), nunca o nome nem a foto do admin.
  Personificar depois uma conta com nome: aparece o nome dela. Sair da personificação: o menu volta a
  mostrar o admin. Light, dark e mobile (no mobile o nome do gatilho some por `hidden md:inline`, então
  conferir avatar e o conteúdo do menu aberto). Três idiomas só no rótulo do gatilho (`triggerLabel`).
- **Desvincular a senha com revogação recusada.** 🔒 no browser: nem o emulador nem o projeto de dev deixam o
  Firebase recusar `revokeRefreshTokens` sem alterar código (`docs/features/auth-revocation-failure/analyze/plan.md:165-168`).
  Fica provado pelo teste de componente nos 3 idiomas. Se o `/test` quiser ver o toast, pode forçar a
  resposta com interceptação de rede do `agent-browser` em `DELETE /account/sign-in-methods/password`,
  devolvendo `500 {"error":{"code":"AUTH_SESSIONS_NOT_REVOKED"}}`; conferir o texto nos 3 idiomas e que a
  pessoa segue na aba Segurança, logada.
- Não há tabela antd nem formulário novo.

## 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Desvincular a senha com sessões não encerradas mostra a mensagem própria**
  Na aba Segurança, desvincular a senha quando a API responde `500 AUTH_SESSIONS_NOT_REVOKED` mostra o toast
  de erro `account.messages.passwordUnlinkedSessionsNotRevoked` no idioma da pessoa (pt-br, en, es), sem o
  sufixo "(Código do erro: …)". A pessoa continua logada na mesma tela, a lista de métodos é recarregada
  (`queryKeys.account.me()`) e nenhum toast de sucesso aparece.

- [ ] **A mensagem não manda entrar de novo e aponta o botão da tela**
  O texto nos três idiomas não contém "Entre de novo", "Sign in again" nem "Vuelve a entrar", e cita o
  rótulo exato do botão "Sair de todos os dispositivos" / "Sign out everywhere" / "Cerrar sesión en todos los
  dispositivos" que está na mesma aba. A pessoa consegue seguir a instrução sem sair da página.

- [ ] **Outros erros do desvincular não mudam**
  Desvincular a senha com `500 ACCOUNT_UPDATE_FAILED`, ou desvincular o Google com qualquer erro, continua
  mostrando a copy de `apiErrors` pelo `handleClientError`, com o código do erro. Fechar o popup do Google
  continua sem toast.

- [ ] **A copy de `apiErrors.AUTH_SESSIONS_NOT_REVOKED` fica como está**
  Redefinição de senha, confirmação de troca de e-mail, troca de senha e definição de senha seguem mostrando
  "A alteração foi salva, mas não conseguimos encerrar as outras sessões desta conta. Entre de novo…" nos
  três idiomas. `utils.ts:60`, `:246` e `:434` não aparecem no diff.

- [ ] **Personificando conta sem nome, o menu não mostra o nome do admin**
  Admin personificando uma conta com `displayName` nulo: o gatilho mostra o prefixo do e-mail da conta
  personificada e o rótulo do menu aberto fica sem nome; o nome do admin não aparece em lugar nenhum do
  menu. Com a conta personificada tendo nome, aparece o nome dela.

- [ ] **Personificando conta sem avatar, o menu não mostra a foto do admin**
  Admin com foto no Google personificando uma conta com `avatarUrl` nulo: o avatar mostra só as iniciais da
  conta personificada, sem `<img>` com a foto do admin.

- [ ] **Personificando, nada do admin aparece enquanto a conta carrega**
  Entre a troca de sujeito e a resposta de `/account/me`, o menu fica sem nome, sem e-mail e sem foto, em vez
  de mostrar os dados do admin. Quando a conta responde, os dados dela aparecem sem recarregar.

- [ ] **Fora da personificação o fallback continua**
  Pessoa comum ou admin no próprio painel: antes de `/account/me` responder, o menu mostra nome, e-mail e foto
  do usuário do Firebase, como hoje. Os testes existentes de `profileDropdownAccount.test.tsx` passam sem
  mudança de asserção.

- [ ] **Tema, responsivo e idioma**
  Menu do perfil sob personificação em light, dark e mobile (390 px), com o rótulo do gatilho nos três
  idiomas. Nenhuma mudança visual além do conteúdo exibido.

## 10. Blueprint técnico

### 10.1 Arquivos a tocar (lista fechada)

| # | arquivo | mudança |
|---|---------|---------|
| 1 | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useSignInMethodMutations.tsx` | desvio no `onError` do `unlinkMutation` + import de `apiErrorCodeOf` |
| 2 | `apps/app/shared/components/ui/ProfileDropdown.tsx` | `useAuthRequestPanel` + `fallbackUser` + meia frase no comentário |
| 3 | `apps/app/__tests__/accountSignInMethodsSessionsNotRevoked.test.tsx` | asserção nova + caso de outro erro |
| 4 | `apps/app/__tests__/profileDropdownAccount.test.tsx` | mock do contexto + 3 casos |
| 5 | `apps/app/__tests__/profileDropdownAvatarEmpty.test.tsx` | mock do contexto |
| 6 | `apps/app/__tests__/profileDropdownCookieConsent.test.tsx` | mock do contexto |
| 7 | `apps/app/__tests__/profileDropdownHelpLink.test.tsx` | mock do contexto |
| 8 | `packages/internationalization/translations/apps/app/pages/common/account.ts` | `passwordUnlinkedSessionsNotRevoked` nos 3 idiomas |

Nenhum desses arquivos aparece no `git status` atual (a feature `audit-log-levels` não commitada mexe em
outros), então não há conflito com o working tree.

### 10.2 Pseudo-diffs

`useSignInMethodMutations.tsx`:

```diff
+import { apiErrorCodeOf } from "@/shared/lib/apiErrorCode";
 ...
         onError: async (error) => {
             await refreshAccount();
+            if (apiErrorCodeOf(error) === "AUTH_SESSIONS_NOT_REVOKED") {
+                errorAlert(accountMessages.passwordUnlinkedSessionsNotRevoked);
+                return;
+            }
             alertUnlessDismissed(error);
         },
```

Só o desvincular da senha chama a revogação na API (`[id]/route.ts:108-110`), então o código não sai do
desvincular do Google e não é preciso conferir o `providerId`.

`ProfileDropdown.tsx`:

```diff
 import { useMyAccount } from "@/shared/hooks/useMyAccount";
 import { contactPageUrl } from "@/shared/lib/contactPageUrl";
 import { withLocalePath } from "@/shared/lib/localePath";
+import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
 ...
     const { user, signOut } = useAuth();
+    const { isImpersonating } = useAuthRequestPanel();
 ...
-    const displayName = account?.displayName ?? user?.displayName ?? null;
-    const email = account?.email ?? user?.email ?? null;
-    const avatarSrc = account?.avatarUrl || user?.photoURL || null;
+    const fallbackUser = isImpersonating ? null : user;
+    const displayName = account?.displayName ?? fallbackUser?.displayName ?? null;
+    const email = account?.email ?? fallbackUser?.email ?? null;
+    const avatarSrc = account?.avatarUrl || fallbackUser?.photoURL || null;
```

`account.ts` (as três posições):

```diff
             passwordUnlinked: "Senha removida. Entre de novo para continuar.",
+            passwordUnlinkedSessionsNotRevoked:
+                'Senha removida, mas não conseguimos encerrar as outras sessões desta conta. Use "Sair de todos os dispositivos" nesta página para encerrá-las.',
```

Mock dos testes (igual ao de `accountSignInMethodsSessionsNotRevoked.test.tsx:27-29`):

```ts
vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => ({ isImpersonating: false }),
}));
```

Em `profileDropdownAccount.test.tsx`, o mock usa um `vi.fn()` hoisted para os casos de personificação.

### 10.3 Ordem de implementação e commits

Sem SDK nem API. Sugestão para o `/review`:

1. `feat(app): keep the admin's profile out of the menu while impersonating` (itens 2, 4, 5, 6, 7)
2. `fix(app): point the unlink failure at sign out everywhere` (itens 1, 3)
3. `feat(internationalization): add the password unlink sessions-not-revoked copy` (item 8)
4. `docs(features): impersonation-and-unlink-copy`

Os testes do commit 2 leem a chave do commit 3; entre os dois o teste falha, e na ponta da branch passa. É a
ordem que `.claude/rules/git-commits.md` pede (app antes de i18n), como já aconteceu em
`docs/features/delivery-security-review/review/review.md:58-60`.

### 10.4 Env e infra

Nenhuma. Pré-requisitos manuais: nenhum.

## 11. Perguntas em aberto

Todas já vêm com a opção adotada; nenhuma bloqueia o `/develop`.

1. **A troca e a definição de senha também deveriam ter mensagem própria?** Ali o erro também chega sem
   `signOut` (`AccountSecurityForm.tsx:68-76`, `AccountPasswordSetForm.tsx:48-53`). Na troca, o emulador
   mostrou que a sessão cai sozinha e "Entre de novo" acaba certo; na definição, não medido.
   Recomendação adotada: ficam como estão; registrar como achado para o `/spec --sync` e só mexer se uma
   medição mostrar a pessoa logada depois do erro.
2. **O menu sob personificação deveria mostrar o rótulo do painel (`impersonatedLabel`) enquanto a conta
   carrega?** Recomendação adotada: não. O controle de personificação na navbar já mostra quem é o alvo, e o
   rótulo pode ser nulo depois de recarregar (`panelStore.ts:52-58`). Fica o vazio de alguns instantes.
3. **O sufixo "(Código do erro: …)" deveria continuar na mensagem do desvincular?** Recomendação adotada:
   não, pelo mesmo motivo do `successAlert` ao lado. O `requestId` segue no log da API
   (`session-revocation.ts:16-19`).

## 12. Decisões tomadas sem perguntar

| # | decisão | adotada | descartada | por quê |
|---|---------|---------|------------|---------|
| D1 | onde corrigir a copy do desvincular | mensagem própria no `onError` do desvincular, pela chave nova em `account.messages` | reescrever `apiErrors.AUTH_SESSIONS_NOT_REVOKED` para servir a todos | a copy atual está certa em quatro dos cinco fluxos; um texto neutro ficaria pior nas telas públicas, onde entrar de novo é o passo certo |
| D2 | código novo na API (`ACCOUNT_SESSIONS_NOT_REVOKED`) | não | código próprio para o desvincular, como `USERS_SESSIONS_NOT_REVOKED` | o leitor é a mesma pessoa dona da conta; muda só onde ela está. Tocar API, testes de rota e `apiErrors` aumenta o raio sem ganho. O front já trata esse código à parte em duas telas |
| D3 | escopo do item 2 | nome, e-mail e foto | só o nome, como diz o achado | os três vêm do mesmo fallback (`ProfileDropdown.tsx:42-44`) e a foto do admin engana tanto quanto o nome |
| D4 | o que mostrar sob personificação sem dado da conta | nada (`null`) | `impersonatedLabel` do painel | menos estado, e o alvo já aparece no controle da navbar |
| D5 | como saber que está personificando | `useAuthRequestPanel().isImpersonating` | `usePanelState` direto ou ler o cookie | é o padrão das telas da conta e da organização; os dois quebram sem provider do mesmo jeito |
| D6 | rótulo do botão na mensagem | escrito por extenso em cada idioma | interpolar `account.security.signOutEverywhere` | segue a copy de `apiErrors` vizinha, que também escreve o rótulo; interpolar exigiria `replace` no hook para uma frase só |
| D7 | o desvio checa `providerId`? | não | `providerId === PASSWORD_PROVIDER_ID && code === …` | a API só revoga no desvincular da senha (`[id]/route.ts:108-110`); a checagem a mais nunca muda o resultado |

## 13. Riscos

- **Teste quebrando por falta de provider.** Qualquer teste que renderize o `ProfileDropdown` de verdade sem
  mockar o contexto passa a falhar com "usePanelState must be used inside AuthRequestPanelProvider". Conferi:
  só os quatro arquivos da §7 renderizam o componente; `adminAccountNavigation.test.tsx:12` e
  `focusNotObscuredScrollPadding.test.tsx:34` já o mockam, e `panelLayoutTitle.test.ts:17` mocka o `Navbar`.
  O `/develop` roda a suíte da `app` inteira para confirmar.
- **Âncoras deslocadas.** A chave nova desloca as linhas de `account.ts` depois de `:265`, e o diff de
  `ProfileDropdown.tsx` desloca `:42-44`. As citações em `specs/reference/AUDIT.md` ficam com o
  `/spec --sync`.
- **Ordem de commits.** O commit 2 tem teste vermelho até o commit 3 (§10.3).
