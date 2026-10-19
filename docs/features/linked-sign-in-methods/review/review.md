# Revisão: métodos de login vinculados

- **Rodada:** autônoma (`/cycle`), etapa `/review`, em 2026-10-19.
- **Escopo:** o diff inteiro contra `origin/main` (`dd31a95`), lido arquivo a arquivo, com o
  [`develop/handoff.md`](../develop/handoff.md) como ponto de partida e o checklist de
  [`docs/review-checklist.md`](../../../review-checklist.md).
- **Não executei o produto.** Nenhum app servido, nenhum browser, nenhuma suíte de testes. O que a leitura
  não confirma está em "Verificar no `/test`".

## Branch

| campo | valor |
|-------|-------|
| nome | `feat/linked-sign-in-methods` |
| como | criada com `git switch -c` a partir de `guilhermebittelbrunn/cycle-v2`, com o working tree intacto |
| base | `dd31a95` (igual a `origin/main`; a branch anterior não tinha commit próprio nem upstream) |
| validação do nome | `branch OK: feat/linked-sign-in-methods` no regex do Passo 3 do `/review` |

A branch anterior (`guilhermebittelbrunn/cycle-v2`) não passa no regex. Como ela não tem remoto e não tem
commit além de `origin/main`, criei a nova a partir dela e não renomeei a antiga, que é a branch do
workspace do Conductor. O `project` foi omitido porque o diff toca dois apps (`api`, `app`) e três pacotes.

## Revisão

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `packages/internationalization/translations/apps/app/pages/common/account.ts:95,347,603`: o aviso do
  diálogo de desvincular a senha (`unlinkDialog.passwordWarning`) dizia que trocar o e-mail volta a exigir o
  canal de privacidade. Não exige: sem senha, a troca de e-mail é recusada e a própria tela manda definir
  uma senha (`emailChange.unsupported`). O canal de privacidade só vale para a exclusão. **Corrigido** nos
  três idiomas.
- `apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts:85-95`: se a segunda chamada ao Firebase
  (a que devolve o e-mail) falhar, a senha já saiu, a conta fica sem `email` e com `emailVerified: false`,
  nenhuma sessão é revogada e a rota responde `500 ACCOUNT_UPDATE_FAILED`, cuja copy diz "Tente de novo".
  Tentar de novo não resolve: a senha já não está no `providerData`, e a rota responde `404`. O único
  caminho de volta é "Definir senha", que usa o e-mail do provedor quando a conta não tem endereço
  (`password/set/route.ts:36-38`). Se o e-mail da conta era outro que não o do Google, a conta passa a
  usar o do Google, e o `emailVerified` continua `false`. Nada registra o `uid` afetado, e as rotas da API
  não têm log hoje. **Não corrigido**: ver "Decisões em aberto". O contrato está fixado em
  `apps/api/__tests__/accountSignInMethodsRoute.test.ts:252`.

### 🟢 Sugestão / nit

- `docs/FORKING.md:178-184`: o parágrafo novo tinha uma linha de mais de 160 colunas no meio de um texto
  quebrado a 110. **Corrigido** (só quebra de linha, o texto é o mesmo).
- `apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts:44`: a regra "o último método nunca sai" é
  conferida contra o `UserRecord` lido no começo da requisição. Dois `DELETE` concorrentes, um por
  provedor, numa conta com dois métodos passam os dois pela checagem e deixam a conta sem método. Na mesma
  aba o painel impede (`isMutating` em `AccountSignInMethodsPanel.tsx:53`); exige duas abas ou chamada
  direta, e só prejudica o próprio titular. O Admin SDK não oferece pré-condição no `updateUser`. Fica
  registrado.
- `apps/api/(shared)/lib/recent-google-sign-in.ts:29`: `ageSeconds >= 0` não tolera diferença de relógio.
  O `auth_time` vem do Google; um servidor com o relógio alguns segundos atrás recusaria uma prova válida
  com `ACCOUNT_REAUTH_INVALID`. Não mexi: o risco depende do relógio do host e o teste
  `recentGoogleSignIn.test.ts:105` fixa a recusa de `auth_time` no futuro de propósito.
- `AccountPasswordSetForm.tsx:62`: o título era um `<span>`, enquanto o painel vizinho usa `<h3>`
  (`AccountSignInMethodsPanel.tsx:113`). Corrigido na rodada 1.
- `apps/api/app/(routes)/account/sign-in-methods/linked/route.ts`: o titular pode gravar o evento de
  vínculo quantas vezes quiser para um provedor que já está vinculado. O ruído fica só na trilha da
  própria conta.
- `password/set/route.ts:40`: `ACCOUNT_PASSWORD_UNSUPPORTED` responde quando nem a conta nem os provedores
  têm e-mail, e a copy ("Entre pelo provedor de acesso original") foi escrita para a troca de senha. O caso
  só existe para conta sem e-mail nenhum, que o produto não cria.

### ✅ OK

- As três rotas usam `requireCommonPanelApi`, validam o corpo com Zod `.strict()` via `parseRequestJson`,
  respondem `{ error: { code } }` e seguem o contrato: `POST` com `{ data }`, `DELETE` com `204` sem corpo.
  A recusa de personificação repete o padrão de `account/email` e `account/deletion`. Na prática quem
  responde é o guard, com `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`, antes do handler.
- Os quatro `error.code` novos têm entrada em `apiErrors` nos três idiomas e estão no
  `accountApiErrorCopy.test.ts`. Os cinco códigos `auth/*` novos chegam à tela pelo
  `FormattedError` (`packages/shared/utils/helpers/formattedError.ts:164`), que lê
  `packages.auth.provider.firebase.error`.
- A prova de posse confere `uid`, `sign_in_provider === "google.com"` e `auth_time` até 300 s; o token da
  sessão cunhado por custom token tem provedor `custom` e é recusado. A ordem em `password/set` (validar,
  conferir senha existente, conferir a prova, gravar, revogar, auditar) segue `account/password/route.ts`.
- `ctx.user` vem de `getUser` a cada requisição (`resolve-api-actor.ts`), então `linked` lê o
  `providerData` atualizado depois do `linkWithPopup`.
- SDK: as três ações ficam em `AccountActions`, que já está registrada no `Client`; o erro propaga cru.
  `AuditAction` ganhou três valores e o `Record<AuditAction, string>` da trilha tem os três rótulos nos três
  idiomas.
- `lacksPasswordProvider` mudou de lugar sem mudar de comportamento: conta carregando responde `false`
  antes e depois (`apps/app/shared/lib/signInMethods.ts:7-23`). Nenhum outro arquivo importava a versão
  antiga.
- No painel, ações desabilitadas durante a personificação e durante qualquer mutação; o formulário de
  definir senha valida antes de abrir o popup e segura o segundo envio com `useRef`.
- Nenhum comentário cita o fluxo; os que existem explicam restrição do Firebase.
- `docs/SECURITY.md`: as contagens novas batem com o código. Medi `find "apps/api/app/(routes)" -name
  route.ts | wc -l` = `40`, sem guard = `14` (10 de `/auth`, 2 de `/health`, `webhooks/payments`,
  `payments/catalog`), e `account/*` = `13`.
- Corte de MVP da spec: os seis itens têm código correspondente. Divergências da spec, todas já
  registradas pelo plano ou pelo handoff: definir senha encerra **todas** as sessões, inclusive a atual
  (a D5 da spec fala em "as outras"); desvincular a senha também encerra todas (desvio 1 do handoff);
  desvincular roda no servidor, e não no cliente como a tabela de impacto da spec sugeria.

## Desvio do handoff: desvincular a senha em duas chamadas

Conferi por leitura o que dava para conferir em
`apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts`:

- a ordem é desvincular, gravar a trilha, devolver `email` e `emailVerified` lidos **antes** do desvínculo
  e só então chamar `revokeUserSessions`. O teste da rota confere essa ordem pelo `invocationCallOrder`;
- desvincular o Google retorna antes do bloco da senha e não revoga nada;
- conta sem `email` pula a devolução e revoga mesmo assim;
- `revokeUserSessions` engole o próprio erro (`packages/auth/server.ts:330-336`), então uma falha ali não
  vira `500` depois de a operação ter dado certo. Nesse caso a revogação feita pelo próprio Firebase ao
  regravar o e-mail continua valendo, segundo a medição do handoff;
- no cliente, `useSignInMethodMutations.tsx:66-85` não chama `reloadCurrentUser` para a senha (o token já
  foi revogado) e o painel chama `signOut` só no sucesso. No erro, a lista é recarregada e a sessão fica.

O que a leitura não alcança, e vai para o `/test`: que o Firebase de fato apaga o e-mail no desvínculo,
que a devolução de fato revoga, e que a tela chega ao login sem alerta de erro. São afirmações medidas
pelo `/develop` com scripts que não ficaram no repo.

Entre a primeira e a segunda chamada a conta passa alguns milissegundos sem e-mail. Uma requisição
concorrente que leia `ctx.user.email` nesse intervalo recebe `null`. Não vejo consequência além de uma
resposta de erro pontual.

## Correções aplicadas

| arquivo | mudança |
|---------|---------|
| `packages/internationalization/translations/apps/app/pages/common/account.ts` | `unlinkDialog.passwordWarning` em pt-br, en e es: a troca de e-mail fica indisponível até definir senha; o canal de privacidade vale só para a exclusão |
| `docs/FORKING.md` | quebra de linha do parágrafo sobre "User account linking", sem mudar o texto |

O novo texto em pt-br: "E-mail e senha deixam de abrir esta conta, e todas as sessões são encerradas,
inclusive esta. Até você definir uma senha de novo, não dá para trocar o e-mail, e a exclusão da conta
passa pelo canal de privacidade." O teste do painel compara com o valor do dicionário, e não com um
literal, então continua válido.

## Raio de impacto

- `packages/sdk`: só acréscimos (`AuditAction` com três valores, dois tipos, três métodos). Quem itera
  `AuditAction` é o mapa de rótulos da trilha, que ganhou as três chaves; nenhum `switch` exaustivo fora
  dele.
- `packages/auth/client.ts`: dois exports novos. Os dois mocks de `firebase/auth` nos testes do pacote
  ganharam `linkWithPopup` e `reauthenticateWithPopup`. Não há outro `vi.mock("firebase/auth")` no repo
  além desses e do teste novo.
- `apps/api/(shared)/lib/auth-providers.ts`: `hasPasswordProvider` mantém a assinatura; passou a usar
  `hasProvider`.
- `apps/app`: `AccountSecurityForm` recebe `account` (único chamador: `AccountTabs.tsx:86`).
  `lacksPasswordProvider` saiu de `AccountEmailChangeDialog.tsx` para `shared/lib/signInMethods.ts`, e os
  três consumidores foram atualizados.
- i18n: chaves novas e quatro textos alterados (`emailChange.unsupported`, `unsupportedDescription` da
  exclusão, nos três idiomas, e o aviso corrigido aqui). Os textos alterados agora apontam para a aba
  Segurança.

## Verificar no `/test`

Começar por aqui. Cada item é uma afirmação do handoff que a leitura não confirma.

1. **Desvincular a senha leva ao login, sem alerta de erro.** Repro: conta com senha vincula o Google, abre
   Segurança, "Desvincular" em "E-mail e senha", confirma. Esperado: alerta "Senha removida. Entre de novo
   para continuar." e ida ao login. Entrar pelo Google abre a mesma conta; a aba Perfil mostra o e-mail e
   o aviso de e-mail não verificado **não** aparece (prova de que `email` e `emailVerified` voltaram).
2. **A devolução do e-mail revoga as outras sessões.** Repro: mesma conta aberta em duas abas anônimas
   separadas (duas sessões); desvincular a senha numa; a outra cai no login na próxima chamada à API.
3. **Definir senha depois de desvincular a senha.** Repro: após o item 1, entrar pelo Google, "Definir
   senha" com senha válida, confirmar no popup. Esperado: sai da conta; login com e-mail e a senha nova
   abre a mesma conta. Medido no Admin SDK pelo `/develop`, ainda não pelo produto.
4. **Desvincular e vincular o Google de novo sem recarregar a página** (prova do `reloadCurrentUser`).
5. **`auth/credential-already-in-use` traduzido** nos três idiomas, ao vincular um Google que já é de
   outra conta.
6. **`auth/user-mismatch` traduzido** ao escolher outro Google no popup de "Definir senha".
7. **Clique duplo** em "Confirmar com o Google e definir senha" abre um popup só.
8. **curl contra a API:** `POST /account/password/set` com o token da sessão comum → `400
   ACCOUNT_REAUTH_INVALID`; numa conta com senha → `409 ACCOUNT_PASSWORD_ALREADY_SET`;
   `DELETE /account/sign-in-methods/google.com` numa conta só Google → `409 ACCOUNT_SIGN_IN_METHOD_LAST`;
   `DELETE /account/sign-in-methods/GOOGLE.COM` → `404 ACCOUNT_SIGN_IN_METHOD_NOT_FOUND`.
9. **Personificação:** lista visível, botões desabilitados; as três rotas chamadas direto respondem `403`
   (o código esperado é `AUTH_REQUEST_IMPERSONATION_READ_ONLY`, do guard).
10. **Copy corrigida nesta etapa:** o diálogo de desvincular a senha nos três idiomas.
11. Light, dark e 375 px na seção nova, no diálogo e no formulário de definir senha; rótulos
    `account.password.set`, `account.signInMethod.link` e `account.signInMethod.unlink` em `/admin/audit`
    nos três idiomas.
12. **Falha da devolução do e-mail** (🟡 acima): sem injeção de falha não dá para reproduzir pelo produto.
    O contrato da rota está no teste unitário; o que acontece na tela nesse caso fica 🔒 se não houver como
    medir.

## Lacunas de teste

| lacuna | veredito |
|--------|----------|
| Nenhum teste automatizado contra o emulador de Auth (decisão 7 do plano); a medição do `/develop` não ficou no repo | continua aberta. O §6 do checklist aceita emulador quando o objeto é emissão ou revogação de sessão do Firebase Auth, que é o caso do desvínculo da senha. Cabe ao `/test` decidir se vale um `*.emulator.test.ts` |
| `reloadCurrentUser()` falha depois de desvincular o Google com sucesso e a tela mostra erro | continua aberta, sem teste e sem correção |
| `AccountPasswordSetForm` com o popup real de reautenticação | continua aberta, só o `/test` cobre |
| Recuperação depois de a devolução do e-mail falhar (nova) | aberta, depende da decisão abaixo |

## Decisões em aberto

1. **Falha na devolução do e-mail ao desvincular a senha.** Hoje a conta fica sem e-mail, sem revogação, e
   o usuário vê "Tente de novo", que não funciona. Opções: (a) manter e registrar como limite conhecido;
   (b) tentar a devolução uma segunda vez antes de responder `500`; (c) gravar o `uid` em log para
   correção manual, o que depende da spec `observability-logging`. **Recomendação:** (a) nesta entrega,
   com o item ligado à `observability-logging`, porque a falha exige o Auth cair entre duas chamadas
   seguidas e a tela já oferece um caminho de volta ("Definir senha").
2. **Desvincular a senha encerra a sessão atual** (desvio 1 do handoff, herdado). Mantido: é o mesmo
   comportamento da troca e da definição de senha, e a alternativa deixa a conta sem e-mail entre o
   desvínculo e uma nova senha.

## Gates

| gate | comando | resultado |
|------|---------|-----------|
| lint/format | `pnpm check` | `Checked 916 files`, nenhuma correção |
| paridade i18n | `pnpm --filter @repo/internationalization test` | `67 passed (7 arquivos)` |
| typecheck | `pnpm turbo run typecheck --filter=@repo/internationalization --filter=app` | `2 successful, 2 total` |
| typecheck e testes de `api`, `@repo/auth`, `@repo/sdk` | não remedidos (nada mudou neles nesta etapa) | do handoff: typecheck `5/5`, api `1280 passed`, app `906 passed`, auth `132 passed`, sdk `10 passed` |

Sem `--force`.

## Varredura de segredo

`docs/features/linked-sign-in-methods/` e `docs/features/pricing-page-catalog/spec.md`: nenhuma senha,
token, chave ou e-mail real. O único endereço citado é `user@example.com` (conta do seed).

## Plano de commits

Índice vazio antes do primeiro commit (`git diff --cached --stat` sem saída). Ordem de dependência; cada
bloco é um `git add` dos arquivos listados.

1. `feat(sdk): add sign-in method account actions and audit actions`
   - `packages/sdk/src/types/audit/audit.ts`
   - `packages/sdk/src/types/account/account.ts`
   - `packages/sdk/src/actions/account/action.ts`
2. `feat(auth): link and reauthenticate a Google account from the client`
   - `packages/auth/client.ts`
   - `packages/auth/__tests__/googleAccountLinking.test.ts`
   - `packages/auth/__tests__/clientEmulator.test.ts`
   - `packages/auth/__tests__/firebaseClient.test.ts`
3. `feat(api): verify a recent Google sign-in from an ID token`
   - `apps/api/(shared)/lib/auth-providers.ts`
   - `apps/api/(shared)/lib/recent-google-sign-in.ts`
   - `apps/api/__tests__/recentGoogleSignIn.test.ts`
4. `feat(api): set the first password on a Google-only account`
   - `apps/api/(shared)/validation/account.schema.ts` (leva também os schemas de método de login, usados no
     commit 5; separar exigiria `git add -p`)
   - `apps/api/app/(routes)/account/password/set/route.ts`
   - `apps/api/__tests__/accountPasswordSetRoute.test.ts`
5. `feat(api): record linked sign-in methods and unlink them on the server`
   - `apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts`
   - `apps/api/app/(routes)/account/sign-in-methods/linked/route.ts`
   - `apps/api/__tests__/accountSignInMethodsRoute.test.ts`
6. `refactor(app): share the sign-in method checks across the account tabs`
   - `apps/app/shared/lib/signInMethods.ts`
   - `apps/app/__tests__/signInMethods.test.ts`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountEmailChangeDialog.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPrivacyPanel.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx`
7. `feat(app): sign-in methods panel and first password form in the security tab`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useSignInMethodMutations.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSignInMethodsPanel.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPasswordSetForm.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountTabs.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(validations)/accountFormSchema.ts`
   - `apps/app/__tests__/accountSignInMethodsPanel.test.tsx`
   - `apps/app/__tests__/useSignInMethodMutations.test.tsx`
   - `apps/app/__tests__/accountSecurityForm.test.tsx`
   - `apps/app/__tests__/accountApiErrorCopy.test.ts`
8. `feat(internationalization): sign-in methods copy, error codes and audit labels`
   - `packages/internationalization/translations/apps/app/pages/common/account.ts`
   - `packages/internationalization/translations/apps/app/pages/admin/auditTrail.ts`
   - `packages/internationalization/translations/packages/auth/index.ts`
   - `packages/internationalization/translations/packages/shared/utils.ts`
9. `docs: document sign-in method linking and fix the api route count`
   - `docs/SECURITY.md`
   - `docs/FORKING.md`
   - `docs/PRE-PRODUCTION.md`
10. `docs(specs): sync the backlog and archive pricing-page-catalog`
    - `specs/BACKLOG.md`
    - `specs/account-security-mfa.md`
    - `specs/contact-support-channel.md`
    - `specs/magic-link-sign-in.md`
    - `specs/observability-logging.md`
    - `specs/one-time-purchase.md`
    - `specs/research/saas-starter-feature-benchmark.md`
    - `specs/social-sign-in-providers.md`
    - `specs/pricing-page-catalog.md` (removido; `git add -A` no caminho)
    - `docs/features/pricing-page-catalog/spec.md` (novo; mesmo arquivo da spec, com status `done`)
11. `docs(features): linked-sign-in-methods`
    - `docs/features/linked-sign-in-methods/STATE.md`
    - `docs/features/linked-sign-in-methods/analyze/plan.md`
    - `docs/features/linked-sign-in-methods/develop/handoff.md`
    - `docs/features/linked-sign-in-methods/review/review.md`
    - `docs/features/linked-sign-in-methods/test/criterios-aceite.md`
    - `docs/features/linked-sign-in-methods/test/report.md`

O commit 7 usa chaves do dicionário que só entram no commit 8. A ordem é a da regra do repo; o
typecheck da `app` só fecha a partir do commit 8.

Título de PR sugerido: `feat: linked sign-in methods in the account security tab`.

## Rodada 1 do `/test` para o `/review` (2026-10-19)

### Defeito trazido pelo `/test`

Conta com senha e Google. Com a consulta `accounts:lookup` do Firebase falhando no navegador, desvincular o
Google fazia o `DELETE` responder `204` e a lista mostrar "Não vinculado", mas a tela exibia "Erro de
conexão. Verifique sua internet.". A causa estava em `useSignInMethodMutations.tsx`: o `mutationFn` do
desvínculo chamava `reloadCurrentUser()` depois da API, e a falha do reload derrubava a mutação inteira para
`onError`. É a lacuna que o handoff já listava ("se `reloadCurrentUser()` falhar…").

### O que o reload fazia, lido no SDK

O plano justificava o reload assim: sem ele, o `linkWithPopup` recusaria localmente com
`auth/provider-already-linked` enquanto o cache do Firebase no navegador ainda listasse o Google. Li o
código do `@firebase/auth` 1.10.8, a única versão instalada
(`node_modules/.pnpm/@firebase+auth@1.10.8_@firebase+app@0.13.2/.../dist/esm2017/index-35c79a8a.js`):

- `linkWithPopup` (linha 9537) cria um `PopupOperation` e, no retorno do popup, chama `_link` (linhas
  9387-9388 e 9308), que não confere o status de vínculo. A checagem local `_assertLinkedStatus(false, …)`
  existe só em `linkWithRedirect` (9908), `linkWithCredential` (5855) e no vínculo de telefone (8847). Em
  nenhum bundle do pacote o corpo de `linkWithPopup` chama essa checagem.
- O reload também não limparia o cache: `_reloadWithoutSaving` (linha 1487) junta a lista antiga com a nova
  por `mergeProviderData` (1537), que mantém todo provedor antigo ausente da resposta. Um provedor
  desvinculado no servidor continua na lista local depois do `reload`.

Ou seja, o reload não fazia o que o comentário dizia, e o motivo que o justificava não existe no
`linkWithPopup`. Quem decide se o Google pode ser vinculado de novo é o servidor do Firebase, que já não tem
o vínculo.

### Correção

A sugestão do QA (tratar o reload como melhor esforço) foi **alterada**: em vez de engolir a falha, o
reload saiu do desvínculo. Manter uma chamada que não tem efeito sobre o que pretende consertar é código
morto com aparência de correção.

| arquivo | mudança |
|---------|---------|
| `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useSignInMethodMutations.tsx:1,59-62` | sai o import de `reloadCurrentUser`; o `mutationFn` do desvínculo é só a chamada à API, e o comentário perdeu a justificativa errada |
| `apps/app/__tests__/useSignInMethodMutations.test.tsx` | caso novo: reload do Firebase rejeitando com `auth/network-request-failed`, API com `204` → mutação em sucesso, alerta de sucesso, nenhum alerta de erro |
| `apps/app/__tests__/accountSignInMethodsPanel.test.tsx:247,268,272` | o desvínculo do Google não chama mais `reloadCurrentUser`; os nomes dos dois testes foram ajustados |
| `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPasswordSetForm.tsx:62` | título "Definir senha" passou de `<span>` para `<h3>`, como o painel vizinho (nit de acessibilidade do relatório do QA e desta revisão) |

Medição: `vitest run` em `useSignInMethodMutations.test.tsx`, `accountSignInMethodsPanel.test.tsx` e
`accountSecurityForm.test.tsx` → `3 passed`, `40 passed`. O caso novo passa porque o reload não é mais
chamado; com o código anterior ele cairia em `onError`, que é o defeito medido pelo QA.

O relink sem reload não dá para provar em teste unitário (o `linkWithPopup` está mockado). Vai para a lista
abaixo.

### Gates da rodada

| gate | resultado |
|------|-----------|
| `pnpm check` | `Checked 917 files`, nenhum erro (o `<h3>` precisou de `biome check --write` para caber numa linha) |
| `pnpm --filter app typecheck` | sai com código 0 |
| testes dos arquivos tocados | `3 passed (3)`, `40 passed (40)` |

### Verificar no `/test` (itens novos)

1. **Vincular de novo logo depois de desvincular, sem recarregar a página.** Repro: conta com senha e
   Google, desvincular o Google, clicar em "Vincular conta Google" na mesma página e escolher a mesma
   identidade no popup. Esperado: "Conta Google vinculada." e a lista com os dois métodos, sem
   `auth/provider-already-linked`. Esse item derruba ou confirma a leitura do SDK acima.
2. **O defeito da rodada fechou.** Repro do QA: `accounts:lookup` falhando e desvínculo do Google. Esperado:
   "Método de login removido." e nenhum alerta de erro.
3. O título "Definir senha" aparece como heading de nível 3 na árvore de acessibilidade, com a mesma
   aparência de antes.

### Lacunas

| lacuna | veredito |
|--------|----------|
| `reloadCurrentUser()` falha depois de desvincular o Google e a tela mostra erro | **fechada nesta rodada**: o reload saiu do fluxo, e o teste do hook fixa o sucesso |
| As demais da seção "Lacunas de teste" acima | sem mudança nesta rodada |

Índice conferido depois das edições: `git diff --cached --stat` sem saída. O relatório do QA
(`test/report.md`, `test/criterios-aceite.md`) foi varrido: só endereços `@example.com` e nenhuma senha
literal. Os dois arquivos entram no commit 11.

## Commits realizados

(preenchido pelo orquestrador depois dos commits)
