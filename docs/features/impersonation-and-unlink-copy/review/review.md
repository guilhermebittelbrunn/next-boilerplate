# Revisão: copy do desvincular e menu do perfil sob personificação

Revisão feita em rodada autônoma do `/cycle`, sem perguntas ao usuário. Escopo: só os 8 arquivos da §10.1 do
plano. O resto do working tree pertence a `audit-log-levels` e `notification-read-race`, que já foram
revisadas, e ficou de fora.

## Branch

- `feat/audit-log-levels`, reutilizada. O usuário pediu que todas as tarefas da madrugada fiquem nela; não
  criei nem troquei branch.
- O regex de validação passou: `branch OK: feat/audit-log-levels`. O nome sem `project` é a forma aceita para
  branch que cruza vários apps, e esta cruza (`api`, `app`, `internationalization`).
- O nome descreve outra tarefa (`audit-log-levels`). Isso foi escolha do usuário e fica registrado aqui, sem
  decisão em aberto.

## Revisão: 8 arquivos (`apps/app` e `packages/internationalization`)

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `docs/features/impersonation-and-unlink-copy/analyze/plan.md` §9, critério 3: diz que os outros erros
  aparecem "com o código do erro". Conferi em `packages/shared/utils/helpers/handleClientError.ts:4-12`: o
  sufixo é `(${requestIdLabel}: ${requestId})`, e o `requestId` vem do header `x-request-id`
  (`formattedError.ts:24`). O `error.code` nunca entra no texto. O critério está errado e o desvio do handoff
  procede: leia "com o código do pedido". Também vale para o critério 1 ("sem o sufixo"): a igualdade estrita
  do teste prova isso com o `requestId` presente na resposta simulada. O código de produção não muda.

### 🟢 Sugestão / nit

- `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useSignInMethodMutations.tsx:72-78`:
  o desvio olhava só o `error.code`, mas o `unlinkMutation` também desvincula o Google, e a mensagem começa
  com "Senha removida". Hoje a API só devolve `AUTH_SESSIONS_NOT_REVOKED` no caminho da senha (o Google sai com
  `204` antes da revogação, `apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts:108-110`), então não
  havia bug visível. **Corrigido**: o `onError` agora recebe o `providerId` e exige
  `providerId === PASSWORD_PROVIDER_ID`. Se a API passar a revogar sessões no desvincular do Google, o toast
  volta a ser a copy genérica de `apiErrors`, que não fala de senha.

### ✅ OK

- Rótulo do botão: a copy nova cita `account.security.signOutEverywhere`, e é esse o texto do `Button` que abre
  o diálogo (`AccountSecurityForm.tsx:146`). `signOutEverywhereAction` ("Encerrar sessões") é o botão de
  confirmação dentro do diálogo, então apontar para o rótulo de fora está certo. Os 3 idiomas batem palavra
  por palavra com `account.ts:92`, `:363` e `:636`.
- O botão está na mesma tela: `AccountSignInMethodsPanel` e o bloco de sair de todos só aparecem juntos
  (`passwordOnly` falso, `AccountSecurityForm.tsx:79-81` e `:127`), e só fora da área admin
  (`AccountTabs.tsx:102`).
- Copy nos 3 idiomas: o tom segue `passwordUnlinked` e `apiErrors.AUTH_SESSIONS_NOT_REVOKED`, nenhuma versão
  manda entrar de novo, e o espanhol usa "Usa" (tú), como o resto do arquivo.
- `apiErrors.AUTH_SESSIONS_NOT_REVOKED` (`translations/packages/shared/utils.ts`) não está no diff. Os outros
  quatro fluxos continuam com a copy de hoje.
- Autorização: o desvincular sob personificação é barrado na API com `403 AUTH_REQUEST_IMPERSONATION_FORBIDDEN`
  (`[id]/route.ts:61-66`), atrás de `requireCommonPanelApi`. A UI também desabilita (`AccountSignInMethodsPanel.tsx:53`),
  mas não é a única barreira. O `ProfileDropdown` só deixa de mostrar dado e não decide permissão.
- `ProfileDropdown` fora do provider: os únicos lugares que o renderizam são `Navbar.tsx` e a página
  `playground`. O `Navbar` só aparece em `(common)/layout.tsx` e `(admin)/admin/layout.tsx`, e tudo isso fica
  sob `app/[locale]/`, cujo `clientLayout.tsx:25` monta o `AuthRequestPanelProvider`. O `app/not-found.tsx`
  da raiz não usa o `Navbar`. Nos testes, `focusNotObscuredScrollPadding`, `adminAccountNavigation` e
  `panelLayoutTitle` mockam o componente ou o `Navbar`; os quatro testes que renderizam o componente de
  verdade ganharam o mock do contexto.
- `isImpersonating` vem do snapshot semeado pelo servidor (`AuthRequestPanelContext.tsx:200`, `panelState.ts:99`),
  então não há render inicial com `false` que mostre o admin antes de hidratar.
- Comentário em `ProfileDropdown.tsx:42-44` explica a regra (sob personificação o usuário do Firebase é o
  admin) sem citar artefato do fluxo. Nenhum comentário novo no hook.
- Testes: mocks com `vi.hoisted` + `vi.mock` antes do `await import`, imports explícitos de `vitest`, sem
  `toBeInTheDocument`. O caso novo de `ACCOUNT_UPDATE_FAILED` cobre o "outros erros não mudam".

### 👁 Verificar no `/test`

- **Janela da troca de sujeito.** A afirmação de maior risco: ao começar a personificar, o menu nunca mostra o
  admin. Em jsdom só foi provado com `account` indefinido. No browser, a dúvida é a ordem entre o store virar
  `isImpersonating: true` e o `resetQueries` descartar o `/account/me` do admin: se o `account` antigo
  sobreviver um render com `isImpersonating` já verdadeiro, o menu mostra o admin vindo da própria conta, e
  não do Firebase. Repro: emulador, admin com nome e foto, personificar conta criada só com e-mail e senha,
  abrir o menu logo após a troca e de novo depois que `/account/me` responder; com rede lenta (throttling)
  para alargar a janela.
- **Sair da personificação.** O menu volta a mostrar o admin, sem ficar vazio. Mesmo repro, clicando em sair.
- **Toast do desvincular nos 3 idiomas.** Interceptar `DELETE /account/sign-in-methods/password` com o
  `agent-browser` e devolver `500 {"error":{"code":"AUTH_SESSIONS_NOT_REVOKED"}}`: o toast é a mensagem nova,
  sem "(Código do erro: …)", a pessoa segue logada na aba Segurança e a lista de métodos é recarregada.
- **Desvincular o Google com o mesmo código forçado.** Mesma interceptação em
  `DELETE /account/sign-in-methods/google.com`: o toast deve ser a copy de `apiErrors`, não a frase sobre
  senha. É o que a correção desta revisão garante.
- Light, dark e mobile (390 px) do menu sob personificação; no mobile o nome do gatilho some
  (`hidden md:inline`), então confira avatar e menu aberto.

## Lacunas de teste

- Desvincular o Google com `AUTH_SESSIONS_NOT_REVOKED`, apontada no handoff: **continua aberta**. Antes era
  só "a API não devolve isso"; depois da correção, existe um ramo no front que vale cobrir com um caso no
  `accountSignInMethodsSessionsNotRevoked.test.tsx` (desvincular o Google, rejeitar com esse código, esperar
  a copy de `apiErrors` com o `requestId`).
- Caso de outro erro só em pt-br, apontada no handoff: **fora de escopo**. A copy vem de `apiErrors`, e a
  paridade dela já tem teste no pacote de i18n.

## Decisões em aberto

Nenhuma.

## Gates

| gate | resultado |
|------|-----------|
| `pnpm check` | 1167 arquivos, "No fixes applied" |
| `pnpm turbo run typecheck --filter app --filter @repo/internationalization` | 2/2 ok (i18n do cache) |
| paridade de i18n | não remedida: não mexi em tradução. Número do handoff: 67 testes, 7 arquivos |
| `accountSignInMethodsSessionsNotRevoked.test.tsx` | 4/4, rodado só para conferir que a correção não quebrou o teste existente; a suíte é do `/test` |

Nenhum gate com `--force`.

## Segredo nos artefatos

Varri `docs/features/impersonation-and-unlink-copy/` atrás de senha, token, chave e e-mail. Os únicos e-mails
estão nos testes (`alvo@example.com`, `token@example.com`), domínio reservado. Nada a remover.

## Rodada 2: saudação do início sob personificação

### Defeito

O `/test` mediu no browser que, personificando uma conta sem nome, a saudação do início mostra o primeiro
nome do admin ("Olá, Adminqa", "Hello, Adminqa", "Hola, Adminqa"). É o mesmo defeito do menu do perfil, em
outro componente, e já existia antes desta tarefa. Origem:
`apps/app/app/[locale]/(authenticated)/(common)/(pages)/(components)/CommonHomeClient.tsx:61`, com
`account?.displayName ?? user?.displayName`, em que `user` é o usuário do Firebase, ou seja, o admin.

### Varredura

Procurei em `apps/app` (fora de `__tests__`) os leitores de `useAuth()` e os acessos a `user.displayName`,
`user.photoURL` e `user.email`:

| arquivo | o que lê | roda sob personificação? | veredito |
|---------|----------|--------------------------|----------|
| `shared/components/ui/ProfileDropdown.tsx` | nome, e-mail e foto do Firebase como fallback | sim | já corrigido nesta tarefa |
| `(common)/(pages)/(components)/CommonHomeClient.tsx:61` | nome do Firebase como fallback | sim | **o defeito** |
| `shared/components/ui/EmailNotVerifiedNotice.tsx:28` | `user.emailVerified` | sim | já sai cedo com `isImpersonating` |
| `(admin)/admin/(pages)/(components)/AdminHomeClient.tsx:31` | nome do Firebase | não: é o início do painel admin, onde o sujeito é o próprio admin | correto |
| `AccountSecurityForm`, `AccountPasswordSetForm`, `AccountSignInMethodsPanel`, `useAccountDataRights` | só `signOut` | n/a | sem dado de exibição |
| `AuditFilters.tsx:63-64`, `users/(pages)/edit/[id]/page.tsx:58-59`, `PanelNavbarControls.tsx:89-90` | `user` é um DTO da API, não o Firebase | n/a | falso positivo |
| telas de `(unauthenticated)` e `useSignedInRedirect` | sessão própria | não | fora |

São 2 pontos com o remendo, não 3. Pela política, segui o padrão do `ProfileDropdown` em vez de criar um
hook compartilhado.

### Correção

`CommonHomeClient.tsx:61-64`: `fallbackUser = isImpersonating ? null : user`, e o `displayName` cai em
`fallbackUser`. O componente já lia `isImpersonating` (`:51`) para desabilitar o botão de criar, então não
entrou hook novo. Um comentário de uma linha explica por que o usuário do Firebase não serve sob
personificação.

Personificando uma conta sem nome, a saudação fica só "Olá", sem vírgula, como já acontece para quem não tem
nome. Com nome, aparece o da conta personificada.

### Medição

| o quê | resultado |
|-------|-----------|
| `apps/app/__tests__/commonHomeClient.test.tsx`, 3 casos novos (conta sem nome, conta carregando, conta com nome) | 13/13 |
| mutação `isImpersonating ? null : user` → `isImpersonating ? user : user` | 2 de 13 caem ("…without a name" e "…account loads", os dois com `expected 'Olá, Bruno' to be 'Olá'`); o caso "com nome" não cai, como esperado |
| restauração | cópia no scratchpad da sessão, `cmp` igual ao original; nenhum `.bak` no repo |
| `pnpm check` | 1167 arquivos, "No fixes applied" |
| `pnpm turbo run typecheck --filter app` | 1/1 ok, sem cache (o arquivo mudou), sem `--force` |

A primeira tentativa de rodar a mutação abortou com `Timeout starting forks runner` (máquina carregada, nenhum
teste executado). Repeti com `--pool=threads` e foi essa execução que gerou os números acima.

### Verificar no `/test`

- Personificar a conta sem nome: o `h1` do início mostra "Olá" / "Hello" / "Hola", sem o nome do admin.
  Personificar uma conta com nome: aparece o primeiro nome dela. Sair da personificação: volta o nome do admin.
- Com `GET /account` atrasado (como na rodada 1), o início não mostra o nome do admin na janela de carga.

## Plano de commits

Entra depois dos commits de `audit-log-levels` e `notification-read-race`. O índice já tem dois `git mv` de
specs que não pertencem a esta tarefa; eles não podem ir em nenhum dos commits abaixo.

1. `fix(app): point the unlink-password session warning at the sign-out-everywhere button`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useSignInMethodMutations.tsx`
   - `apps/app/__tests__/accountSignInMethodsSessionsNotRevoked.test.tsx`
2. `fix(app): hide the admin's name, e-mail and photo in the profile menu while impersonating`
   - `apps/app/shared/components/ui/ProfileDropdown.tsx`
   - `apps/app/__tests__/profileDropdownAccount.test.tsx`
   - `apps/app/__tests__/profileDropdownAvatarEmpty.test.tsx`
   - `apps/app/__tests__/profileDropdownCookieConsent.test.tsx`
   - `apps/app/__tests__/profileDropdownHelpLink.test.tsx`
3. `fix(app): greet the impersonated account instead of the admin on the home page`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/(components)/CommonHomeClient.tsx`
   - `apps/app/__tests__/commonHomeClient.test.tsx`
4. `feat(internationalization): add the unlink-password sessions-not-revoked message`
   - `packages/internationalization/translations/apps/app/pages/common/account.ts`
5. `docs(features): impersonation-and-unlink-copy`
   - `docs/features/impersonation-and-unlink-copy/`

O commit 1 usa a chave criada no commit 4, então o typecheck só fecha com os quatro. Se o histórico precisar
compilar commit a commit, troque a ordem e ponha o 4 primeiro. O commit 3 não depende de nenhum outro.

Título de PR sugerido: `fix(app): unlink-password session copy and admin data shown while impersonating`.

### Commits realizados

(preenchido pelo orquestrador)
