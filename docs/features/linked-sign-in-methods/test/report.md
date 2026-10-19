# Relatório do `/test`: métodos de login vinculados

- **Rodada:** autônoma (`/cycle`), etapa `/test`, em 2026-10-19.
- **Branch:** `feat/linked-sign-in-methods` (não protegida). Nada commitado; o teste novo fica no working
  tree para o `/review` levar ao commit 7 do plano.
- **Escopo:** o diff inteiro, começando pela lista "Verificar no `/test`" do
  [`review/review.md`](../review/review.md). Critérios com status por item em
  [`criterios-aceite.md`](criterios-aceite.md).
- **Resultado:** 13 critérios ✅, nenhum ❌, 3 🔒. Um defeito de baixa severidade medido na rodada 1
  (seção "Defeitos"); o revisor mudou o hook e a rodada 2 mediu o defeito fechado (seção "Rodada 2").

## Testes executados

| comando | resultado |
|---------|-----------|
| `pnpm turbo run typecheck test --filter=api --filter=app --filter=@repo/auth --filter=@repo/sdk --filter=@repo/internationalization` | `17 successful, 17 total` (9 do cache). api `1280 passed (100)`, app `906 passed (109)`, `@repo/auth` `132 passed (11)`, `@repo/sdk` `10 passed (2)`, `@repo/internationalization` `67 passed (7)` |
| `pnpm --filter app exec vitest run __tests__/useSignInMethodMutations.test.tsx` | `7 passed` (teste novo) |
| `pnpm check` | `Checked 917 files`, sem erro |
| `pnpm --filter app typecheck` | sem erro |
| `pnpm test` (raiz, com `JAVA_HOME` no JDK 21) | `15 successful, 15 total` (11 do cache). app `913 passed (110)`, api `1280 passed (100)`, `api:test:emulator` `186 passed (4)`, web `131 passed (20)`, e2e `16 passed (2)`, os pacotes sem mudança |

Sem `--force`. O `test:emulator` reaproveitou os emuladores que subi para o e2e.

**Teste criado:** `apps/app/__tests__/useSignInMethodMutations.test.tsx`, 7 casos, nível de hook
(`renderHook` + `QueryClientProvider`, com `@repo/auth/client`, `apiClient`, `useAlert` e
`next/navigation` mockados e o `FormattedError` real). Cobre a mutation de definir senha, que até aqui só
era exercitada pelo componente com o hook mockado: reautentica antes de chamar a API e manda o token novo
e a senha; popup fechado (`auth/popup-closed-by-user`, `auth/cancelled-popup-request`) não chama a API
nem abre alerta; `auth/user-mismatch` e `auth/popup-blocked` viram a copy traduzida;
`ACCOUNT_REAUTH_INVALID` e `ACCOUNT_PASSWORD_ALREADY_SET` vindos da API viram a copy de `apiErrors`.
Conferi que o teste pega regressão: trocando o token mandado à API por um literal, 1 caso falha;
desligando o `isPopupDismissed`, 2 casos falham. O hook voltou ao original depois de cada troca (`cmp`
contra a cópia).

## Decisões de custo de teste

| módulo | decisão |
|--------|---------|
| `account/password/set` | sem teste novo. `accountPasswordSetRoute.test.ts` já cobre os códigos e a ordem das checagens com o guard e o Admin SDK mockados |
| `account/sign-in-methods/[id]` e `linked` | sem teste novo. `accountSignInMethodsRoute.test.ts` cobre 204, 409, 404, 403, 500 e a ordem desvincular, devolver e-mail, revogar |
| `recent-google-sign-in.ts` | sem teste novo. `recentGoogleSignIn.test.ts` cobre a janela de 300 s, `custom`, `password` e outro `uid` |
| `useSignInMethodMutations` | teste novo de hook (acima), na faixa barata |
| `packages/auth/client.ts` | sem teste novo. `googleAccountLinking.test.ts` cobre `linkGoogle` e `reauthenticateWithGoogle` |
| Contrato com o emulador de Auth | **nenhum teste da faixa cara criado.** O comportamento de infra que a rota supõe (o Firebase apaga o e-mail ao desvincular a senha, e devolver o e-mail revoga os tokens) justificaria um `*.emulator.test.ts`. Só que a suíte `test:emulator` sobe apenas Firestore e Storage, e o guard dela exige esses dois hosts (`scripts/emulator-tests.mjs`, `__tests__/emulatorGuard.emulator-setup.ts`). Incluir o Auth muda o runner, o guard e o job do CI: é mudança de infraestrutura de teste, não um arquivo de teste. Medi o comportamento à mão nesta rodada (seção "Medições na API") e deixo como follow-up |

## Verificar no `/test`

| # | item | veredito |
|---|------|----------|
| 1 | Desvincular a senha leva ao login sem alerta de erro | **confirmado.** Alerta "Senha removida. Entre de novo para continuar.", depois `/pt-br/sign-in?redirect=%2Fpt-br`, sem alerta de erro. Entrando pelo Google, a mesma conta abre; o Perfil mostra `qa-linked-google@example.com` e o aviso "Confirme seu e-mail" não aparece. No emulador, o e-mail é o mesmo e `emailVerified` é `true` |
| 2 | A devolução do e-mail revoga as outras sessões | **confirmado.** Segunda sessão (outro navegador) aberta com e-mail e senha; depois do desvínculo na primeira, a navegação seguinte da segunda caiu em `/pt-br/sign-in?redirect=...`. Na API, um ID token emitido 4 s antes do desvínculo passou de 200 para `401 AUTH_INVALID_TOKEN` |
| 3 | Definir senha depois de desvincular a senha | **confirmado** pelo produto: "Senha definida. Entre de novo para continuar.", o login com a senha nova abre a mesma conta, e o `providerData` volta a `[google.com, password]` |
| 4 | Desvincular e vincular o Google de novo sem recarregar | **confirmado.** "Método de login removido.", depois "Conta Google vinculada." na mesma página, com o e-mail do Google na linha |
| 5 | `auth/credential-already-in-use` traduzido | **confirmado** nos três idiomas (textos no critério 8), com a lista mantendo "Não vinculado" |
| 6 | `auth/user-mismatch` traduzido | **confirmado** nos três idiomas: "Escolha a mesma conta Google vinculada a esta conta.", "Choose the same Google account linked to this account.", "Elige la misma cuenta de Google vinculada a esta cuenta." |
| 7 | Clique duplo abre um popup só | **confirmado.** `dblclick` no botão abriu uma aba de popup (`authType=reauthViaPopup`) |
| 8 | curl contra a API | **confirmado.** `400 ACCOUNT_REAUTH_INVALID` (token `custom`, de outro `uid`, inválido), `409 ACCOUNT_PASSWORD_ALREADY_SET`, `409 ACCOUNT_SIGN_IN_METHOD_LAST`, `404 ACCOUNT_SIGN_IN_METHOD_NOT_FOUND` para `GOOGLE.COM`. Sem credencial, as três rotas respondem `401 AUTH_INVALID_TOKEN` |
| 9 | Personificação | **confirmado.** Lista visível e botões desabilitados (na conta só Google e na conta com dois métodos). As três rotas respondem `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`, e o `providerData` não muda |
| 10 | Copy corrigida do diálogo da senha | **confirmado** nos três idiomas, com o texto do `review.md` |
| 11 | Light, dark, 375 px e rótulos da trilha | **confirmado.** Detalhe em "Evidências e2e" |
| 12 | Falha da devolução do e-mail | **🔒 não verificável** pelo produto sem injetar falha no Admin SDK. O contrato da rota tem teste unitário |

## Medições na API (emulador, curl)

Conta `qa-api-google@example.com`, criada só com Google pelo `signInWithIdp` do emulador:

- `DELETE /account/sign-in-methods/google.com` → `409 ACCOUNT_SIGN_IN_METHOD_LAST`. `.../GOOGLE.COM`,
  `.../password` e `.../a%2Fb` → `404 ACCOUNT_SIGN_IN_METHOD_NOT_FOUND`.
- `POST /account/password/set`: `reauthIdToken` de `custom` → 400 `ACCOUNT_REAUTH_INVALID`; de outro uid
  → 400 `ACCOUNT_REAUTH_INVALID`; `"abc"` → 400 `ACCOUNT_REAUTH_INVALID`; sem o campo → 400
  `VALIDATION_FAILED`; senha `short` → 400 `AUTH_PASSWORD_TOO_SHORT`; campo `uid` extra → 400
  `VALIDATION_FAILED`. Depois disso o `providerData` seguia `[google.com]` e o token de quem chamou
  respondia 200.
- `POST /account/sign-in-methods/linked` com `password` → 404; com `Google.com` → 400 `VALIDATION_FAILED`.
- Caminho feliz: `password/set` com prova Google recente → 200; um token anterior passou a 401; o login
  por senha devolve token com `sign_in_provider: password` e `providerData` `[google.com, password]`.
- Desvincular o Google com um token de 4 s antes: 204, e o token continuou valendo (o desvínculo do
  Google não revoga). Desvincular a senha: 204, o token passou a 401, e a conta ficou com e-mail e
  `emailVerified: true`.
- `auth_time` acima de 300 s não se mede no emulador: ao renovar o token pelo `securetoken`, o emulador
  devolveu um `auth_time` novo (igual ao do último login da conta). No Firebase real a renovação mantém
  o `auth_time` original. A recusa de 301 s fica com `recentGoogleSignIn.test.ts`. Essa tentativa acabou
  definindo a senha da conta `qa-api-google@example.com`, que só existe no emulador.

Ao medir a revogação, um primeiro lote rodou tudo dentro do mesmo segundo, e os tokens emitidos naquele
segundo continuaram válidos: a revogação do Firebase tem granularidade de segundo
(`tokensValidAfterTime`). Repeti com 2 s de folga, e os números acima são dessa repetição.

## Evidências e2e

Medido com `agent-browser`, uma sessão de navegador por papel, sempre em sequência.

- **Conta só Google (pt-br, 1280 px, light):** "E-mail e senha · Não vinculado"; "Google · Vinculado ·
  qa-linked-google@example.com · É o único método de login da conta e não pode ser removido.", com o
  botão "Desvincular Google" desabilitado; formulário "Definir senha" com o botão "Confirmar com o Google
  e definir senha"; sem "Senha atual". Perfil: "Esta conta entra pelo Google e não tem senha. Defina uma
  senha na aba Segurança para trocar o e-mail."
- **Mesma tela em en e es:** "Sign-in methods", "Not linked", "This is the account's only sign-in method
  and cannot be removed.", "Set a password", "Confirm with Google and set password"; "Métodos de inicio
  de sesión", "No vinculado", "Definir contraseña", "Confirmar con Google y definir contraseña". Em es, o
  Perfil e a Privacidade apontam para "la pestaña Seguridad".
- **Conta com dois métodos, dark, 1280 px:** título com cor `lab(98.26 0 0)`, descrição e e-mail com
  `lab(66.128 0 0)`, sobre fundo `lab(2.75 0 0)`; badge "Vinculado" com fundo `lab(15.2 0 0)` e texto
  `lab(98.26 0 0)`. Tudo legível, sem elemento claro sobrando no dark.
- **375 px:** em dark (dois métodos) e em light e dark (só Google, es), `scrollWidth` igual a
  `clientWidth` (360/360 com barra de rolagem, 375/375 sem ela). Os botões "Desvincular" vão para baixo
  do rótulo, e o diálogo de desvincular ocupa a largura com os botões empilhados. O rodapé fixo do
  formulário não cobre o campo "Confirmar nova senha" (campo de 388 a 424 px, botão de 457 a 493 px). No
  print de página inteira o rodapé aparece sobre o campo, mas é efeito da captura.
- **`/admin/audit` (admin):** linhas como "Método de login removido | user@example.com | user@example.com
  | google.com", "Senha definida | qa-linked-google@example.com | ... | —" e "Método de login removido |
  ... | password". Rótulos em en e es no critério 12.
- **Popup do IdP falso do emulador:** o botão "Sign in with Google.com" do formulário "Add new account"
  não submete quando o `agent-browser` clica nele. Contornei com `requestSubmit()` no formulário. Escolher
  uma conta já listada funciona por clique.
- **Acessibilidade:** o título "Definir senha" é um `<span>` (`AccountPasswordSetForm.tsx:62`), enquanto
  "Métodos de login" é um `h3`. A árvore de acessibilidade lista o primeiro como texto e o segundo como
  heading. Fica como o nit do `review.md`; o formulário de troca de senha vizinho também não tem heading. Na rodada 2
  o título virou `h3` (seção "Rodada 2").

Prints em `test/e2e/` (`01` a `13`), que o `.gitignore` descarta. Só mostram contas `@example.com`.

## Defeitos

### 🟢 Erro de conexão depois de desvincular o Google com sucesso

Fechado na rodada 2: o revisor tirou o `reloadCurrentUser()` do desvínculo, e o repro abaixo passou a
mostrar só o sucesso. O texto a seguir descreve a medição da rodada 1.

- **Repro:** conta com senha e Google, aba Segurança. Simular a rede caindo na chamada `accounts:lookup`
  do Firebase (no teste, `window.fetch` trocado por uma versão que rejeita essa URL). "Desvincular" no
  Google, confirmar.
- **Observado:** `DELETE /account/sign-in-methods/google.com` → 204; a lista mostra "Google · Não
  vinculado" (o `onError` recarrega a conta); o alerta diz "Erro de conexão. Verifique sua internet.". A
  operação deu certo e a tela anuncia erro.
- **Onde:** `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useSignInMethodMutations.tsx:66-85`.
  `reloadCurrentUser()` roda dentro do `mutationFn`, então a falha dele vira falha da mutation.
- **Correção sugerida (hipótese, não medida):** tratar o reload como melhor esforço, fora do caminho de
  erro da mutation, e mostrar o sucesso quando o `DELETE` respondeu 204. Antes de adotar, medir se um
  vínculo logo depois ainda funciona com o cache do Firebase desatualizado. Nesta rodada, com a rede
  "caída" só no `accounts:lookup`, o popup de vínculo abriu e o vínculo gravou, mas também mostrou o erro
  de conexão, porque o próprio `linkWithPopup` consulta o mesmo endpoint.
- **Severidade:** baixa. Exige a rede cair entre as duas chamadas, e a lista exibida fica correta.

Nenhum defeito apareceu no fluxo normal, então não houve o que repetir em `build && start`.

## Lacunas herdadas

| lacuna (handoff/review) | veredito |
|-------------------------|----------|
| Nenhum teste automatizado contra o emulador de Auth | **continua aberta.** Medido à mão nesta rodada; o teste automatizado exige estender o `test:emulator` ao Auth (ver "Decisões de custo de teste") |
| `reloadCurrentUser()` falha depois de desvincular o Google e a tela mostra erro | **fechada na rodada 2.** O revisor tirou o `reloadCurrentUser()` do desvínculo, e o repro da seção "Defeitos" passou a mostrar só o sucesso (seção "Rodada 2") |
| `AccountPasswordSetForm` com o popup real de reautenticação | **fechada aqui** com o popup do emulador (sucesso, `auth/user-mismatch`, popup fechado, popup bloqueado e clique duplo) e o teste de hook novo. O popup do Google de verdade continua 🔒 |
| Recuperação depois de a devolução do e-mail falhar | **continua aberta** (🔒 pelo produto; depende da decisão 1 do `review.md`) |

## Ambiente do e2e

- As portas 3000, 3002, 8080, 9099, 9199, 4001, 4400, 4500 e 9150 estavam livres no início. Nada do
  usuário foi reaproveitado.
- Subi `pnpm emulators` (JDK 21 via `JAVA_HOME`), `pnpm seed`, `next dev -p 3002` (api) e
  `next dev -p 3000` (app). Montei o ambiente dos dois servidores a partir do `.env.example`, com as
  credenciais do Firebase vazias e o bloco do emulador forçado, como faz o
  `apps/e2e/support/stackEnv.ts`, porque o `.env` local aponta para um projeto real.
- No fim matei os PIDs que subi e os filhos deles (`next-server`, `firebase-tools`, o Java do
  Firestore). `lsof -sTCP:LISTEN` voltou vazio em 3002, 8080, 9099, 9199, 4001, 4400, 4500 e 9150. A
  porta 3000 passou a ser ouvida por um processo de outro workspace (`comanda10/krakow-v1`), iniciado às
  09:47, que não é desta rodada; não mexi nele.
- Apaguei os scripts temporários de token (`/tmp/qa-lsim`) e fechei os três navegadores do
  `agent-browser`.

## Estado de dev alterado

Tudo no emulador, que guarda em memória e já foi encerrado. Nenhum dado foi criado em projeto Firebase
real, e nenhuma conta entrou no `docs/PRE-PRODUCTION.md`.

- Contas criadas no emulador: `qa-api-google@example.com` (só Google, depois com senha),
  `qa-linked-google@example.com` (criada pelo popup e excluída pelo fluxo de exclusão de conta) e uma
  conta sem e-mail, criada por engano por um custom token de teste.
- Identidade Google falsa `qa-linked-link@example.com` vinculada a `user@example.com`.
- As senhas das contas de QA existiram só no emulador e não estão registradas aqui. As contas do seed usam
  a senha documentada no `docs/SETUP.md`.

## Cross-check

- Comum, admin e personificação: medidos. Não autenticado: 401 nas três rotas.
- `apps/web`: fora do diff.
- `subscription` × `simple`: a feature não depende do modo de produto.
- Mobile e desktop, light e dark, pt-br, en e es: medidos (seção "Evidências e2e").

## Rodada 2

Depois da rodada 1, o revisor mudou três coisas sem executar o produto: tirou o `reloadCurrentUser()` do
desvínculo do Google (`useSignInMethodMutations.tsx:59-62`), trocou o título "Definir senha" de `<span>`
para `<h3>` (`AccountPasswordSetForm.tsx:62`) e mexeu nos testes (`useSignInMethodMutations.test.tsx`
ganhou um caso, `accountSignInMethodsPanel.test.tsx` foi ajustado). A justificativa dele para tirar o
reload, lida no `@firebase/auth` 1.10.8, é que o `linkWithPopup` não confere o vínculo no cliente e que
o reload não limparia o provedor removido do cache. Tratei isso como hipótese e medi só o que mudou.

### O que medi

| # | item | veredito e instrumento |
|---|------|------------------------|
| 1 | Revincular o Google na mesma página, sem recarregar | **✅ confirmado.** `user@example.com` vinculou a identidade falsa `qa-linked-r2@example.com` pelo popup do emulador (`rawId` `0643741078539098027410702363951600975368`). Desvinculou ("Método de login removido."). Nesse ponto o cache do Firebase no navegador (`firebaseLocalStorageDb`) ainda listava `["password","google.com"]`, que é a condição em que o reload faria diferença. "Vincular conta Google" abriu o popup, e concluí com a **mesma** identidade (mesmo `sub`) chamando o `finishWithUser` do widget do emulador. Resultado: "Conta Google vinculada.", lista com "E-mail e senha · Vinculado" e "Google · Vinculado · qa-linked-r2@example.com", nenhum alerta de erro e nenhum `auth/provider-already-linked`. No emulador, a conta voltou a ter `password` e `google.com` com o mesmo `rawId` |
| 2 | O defeito da rodada 1 fechou | **✅ confirmado.** Mesmo repro: `window.fetch` trocado para rejeitar `accounts:lookup`, depois "Desvincular" no Google. `DELETE /account/sign-in-methods/google.com` → 204, alerta "Método de login removido.", nenhum alerta de erro, lista com "Google · Não vinculado". O contador do patch ficou em 0: o desvínculo não chama mais o `accounts:lookup` |
| 3 | "Definir senha" como heading | **✅ confirmado.** A árvore de acessibilidade mostra `heading "Definir senha" [level=3]`, ao lado de `heading "Métodos de login" [level=3]`. O visual não mudou: 14 px, peso 500, 20 px de altura, nenhum espaço até a descrição, cor `lab(98.26 0 0)` no dark e `lab(2.75 0 0)` no light (fundo `lab(100 0 0)`). Sem rolagem lateral em 1280 px (1265/1265) nem em 375 px (360/360), em light e dark |

Prints de apoio em `test/e2e/r2-01` a `r2-03` (descartados pelo `.gitignore`).

### Testes

| comando | resultado |
|---------|-----------|
| `pnpm --filter app test` | `914 passed (110)` |
| `pnpm test` (raiz, JDK 21) | `15 successful, 15 total` (13 do cache). app `914 passed (110)`, api `1280 passed (100)`, `api:test:emulator` `186 passed (4)`, web `131 passed (20)`, e2e `16 passed (2)` |

Sem `--force`.

### Ambiente

- A porta 3000 estava ocupada por um processo de outro workspace (`comanda10/krakow-v1`). Não mexi nele
  e subi a app em `next dev -p 3100`, com `NEXT_PUBLIC_APP_URL` e o `CORS_ORIGIN` da API apontando para
  a 3100 (o preflight respondeu `access-control-allow-origin: http://localhost:3100`).
- As demais portas estavam livres. Subi `pnpm emulators` (JDK 21), `pnpm seed`, a api em 3002 e a app em
  3100. No fim matei esses PIDs e os filhos (`next-server` das duas portas, `firebase-tools`), e
  `lsof -sTCP:LISTEN` voltou vazio em 3002, 3100, 8080, 9099, 9199, 4001, 4400, 4500 e 9150. A 3000
  seguiu com o processo do outro workspace.
- Apaguei os arquivos temporários de ambiente (`/tmp/qa-lsim2`) e fechei os dois navegadores do
  `agent-browser`.

### Dados de QA desta rodada

Só no emulador, já encerrado: a identidade Google falsa `qa-linked-r2@example.com`, vinculada a
`user@example.com`, e a conta só Google `qa-linked-r2-google@example.com`, criada pelo popup. Nenhuma
conta em projeto real.

### Placar depois da rodada 2

13 critérios ✅, nenhum ❌, 3 🔒 (os mesmos da rodada 1). Nenhum defeito novo.
