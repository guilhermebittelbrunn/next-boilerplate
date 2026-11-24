# Relatório de QA: laço de recarga com a sessão recusada

- **Branch:** `feat/delivery-security-hardening` (não protegida; nada commitado nem criado aqui).
- **Data:** 2026-11-24, 02:58 a 03:20.
- **Veredito final (rodada 2):** 13 de 13 critérios aprovados, `test = done`. A rodada 2, no fim deste arquivo, mediu
  a correção do R1 e o link por e-mail. O texto até a rodada 2 registra a rodada 1 como ela aconteceu.
- **Veredito da rodada 1:** o laço acabou. Nenhum caso de recusa produziu recarga: a carga ficou em 1 em todos os casos
  de recusa medidos no navegador (mais de 30). Um critério falhou em parte: na corrida R1, depois da correção do
  `/review`, o painel abria sem as consultas que dependem do token no cliente até a pessoa recarregar. É um defeito
  estreito, que esta tarefa reintroduziu num caminho que antes terminava em recarga completa. Por isso a rodada 1
  terminou em `test = blocked`, com a correção sugerida abaixo.

## Placar

| | total | ✅ | ❌ | 🔒 |
|---|---|---|---|---|
| Critérios de aceite | 13 | 12 | 1 (R1, parcial) | 0 |
| Itens de "Verificar no `/test`" | 4 | 3 confirmados | 1 derrubado em parte (R1) | 0 |

## Critérios de aceite, item a item

| # | critério ([`criterios-aceite.md`](criterios-aceite.md)) | status | meio |
|---|---------------------------------------------------------|--------|------|
| 1 | Login da app sem laço com falha de rede | ✅ | e2e (sonda, F1) + componente (T2) |
| 2 | Login da app sem laço com 403, 401 ou 5xx | ✅ | e2e (F2) + hook (T1) |
| 3 | Cadastro da app sem laço | ✅ | e2e (F3) + componente (T2) |
| 4 | Sessão persistida sem cookie mostra o formulário numa carga | ✅ | e2e (F4, login e cadastro) + componente (T2) |
| 5 | Navegação só com o cookie gravado | ✅ | e2e (nenhuma recusa gerou alerta de sucesso nem navegação) + hook/provider (T1, T3) |
| 6 | Falha ao resolver o destino não vira "sessão não estabelecida" | ✅ | componente (T3); sem caminho de produção para forçar no navegador |
| 7 | Caminho feliz igual ao anterior | ✅ | e2e (F5, landing, SSO nos dois sentidos) + Playwright `signIn`, `signUp`, `crossAppSignOut` |
| 8 | Landing volta ao formulário; ref zera | ✅ | e2e (F6 + outra aba) + componente (T4) |
| 9 | Link por e-mail com recusa | ✅ | e2e (F7, código pelo emulador) + componente (teste novo) |
| 10 | Três idiomas, tema e celular | ✅ | e2e (F1 em pt-br, en, es; claro, escuro, 375 px; F6 claro, escuro, 375 px) + componente (T3) |
| 11 | Duplo envio | ✅ | e2e (`dblclick` com recusa instantânea e com recusa de 1,5 s) |
| 12 | Corrida R1 deixa o painel funcional | ❌ parcial | e2e (R1); ver "Defeito" |
| 13 | Corrida inversa sem laço | ✅ | e2e |

## Cobertura automatizada

| comando | resultado |
|---------|-----------|
| `pnpm turbo run test --filter=app --filter=web --filter=@repo/auth` | app 141 arquivos / 1301 testes; web 35 / 315; `@repo/auth` 15 / 201 (cache); todos passando |
| `pnpm test` (raiz, com `JAVA_HOME` no JDK 21), antes dos testes novos | 15/15 tasks; inclui `api:test:emulator` 274 e `@repo/internationalization` 67; sem falha |
| `pnpm --filter app exec vitest run __tests__/authProviderSessionNotEstablished.test.tsx` | 12/12 (eram 10) |
| o mesmo arquivo com `packages/auth/provider.tsx` do `HEAD` (`-t "outros métodos"`), arquivo restaurado em seguida | os 2 testes novos falham, como deviam |
| `pnpm exec biome check` no arquivo de teste + `pnpm --filter app typecheck` | sem erro |
| `pnpm test` (raiz) depois dos testes novos | 15/15 tasks; app 1303, web 315, auth 201, api 1825, `api:test:emulator` 274, e2e 38, i18n 67 |
| `pnpm --filter e2e exec playwright test signIn signUp crossAppSignOut` | 16/16: 4 do setup, 7 chromium (`crossAppSignOut` 2, `signIn` 4, `signUp` 1), 5 mobile (`signIn` 4, `signUp` 1) |

A paridade de i18n não rodou à parte: nenhuma chave mudou, e o `@repo/internationalization:test` (67) entrou no
`pnpm test` da raiz. Nenhum `--force`: não houve motivo para desconfiar do cache.

### Testes criados

`apps/app/__tests__/authProviderSessionNotEstablished.test.tsx`, bloco novo "AuthProvider com a sessão recusada nos
outros métodos de login":

- login com Google com 403 `AUTH_FORBIDDEN_ORIGIN`: desloga uma vez, zera o token, mostra `notEstablished`, sem alerta
  de sucesso nem `push`;
- link por e-mail com falha de rede: o mesmo, e a mutação termina em `isSuccess === true` (é o que a tela
  "Entrando…" lê).

Os mocks de `signInWithGoogle` e `signInWithEmailLinkCode` passaram de `vi.fn()` solto para mocks que devolvem uma
credencial. Os dez testes que já existiam seguem iguais e passando.

### Decisões de custo de teste

| módulo tocado | decisão |
|---------------|---------|
| `packages/auth/provider.tsx` | faixa barata: dois casos de componente com o provider real e `fetch` mockado. Nenhum comportamento de infra em jogo. |
| `apps/app/shared/hooks/useSignedInRedirect.ts` | já coberto por `useSignedInRedirect.test.tsx` (11 casos) e `authFormsPersistedSessionRedirect.test.tsx` (10). Nada novo. |
| `SignInForm`, `SignUpFormClient`, `EmailLinkCompletion` | cobertos pelos mesmos arquivos e pelos cinco testes de formulário da app. Nada novo. |
| `apps/web/.../sign-in-form-client.tsx` | coberto por `signInFormRedirect.test.tsx` (7). Nada novo. |
| Corrida R1 | sem teste novo: o comportamento certo ainda não existe, e um teste vermelho quebraria o `turbo build`. O teste sugerido vai com a correção, abaixo. |

Nenhum teste da faixa cara: a sonda de navegador abaixo é descartável e ficou fora do repo.

## Verificar no `/test` (lista do `review.md`)

| item | veredito |
|------|----------|
| R1 depois da correção: rejeitar só o 2º `POST /api/auth/session`; o painel carrega com dados e continua logado depois de recarregar | **derrubado em parte.** Sem laço, o cliente continua logado (o hook não deslogou), o cookie existe, a URL é `/pt-br`, os dados que o servidor renderiza aparecem ("Entidades 4", "Ativas 3"), e depois de recarregar continua logado. O que falha: nos 6 s depois do login, a API só recebe `GET /auth/me`. Não saem `GET /notifications/unread-count` nem `GET /account`, e o contador "13" do sino não aparece. No caminho feliz os dois saem em menos de 1 s. Recarregar resolve. Detalhe em "Defeito". |
| F1 a F7 com o contador de cargas em `sessionStorage` | **confirmado.** Carga 1 em todos os casos de recusa (tabela abaixo). |
| F4 com o hook lendo `isMutating()`: sem mutação, deslogar e mostrar o formulário em menos de 1 s, numa carga | **confirmado.** Carga 1, formulário visível, nenhum usuário no IndexedDB do Firebase, sem alerta, para 401, 403 e rede, no login e no cadastro. |
| Duplo envio com recusa | **confirmado** para o critério (zero alerta de sucesso, zero navegação). Ver a observação sobre `dblclick` em "Achados fora de escopo". |

## Evidências no navegador

### Instrumento

- `app` e `web` em `next build` + `next start` (`NODE_ENV=production`) com o ambiente que `apps/e2e/support/stackEnv.ts`
  monta para o emulador. A `api` rodou em `next dev`: o build de produção dela exige credencial do Admin SDK
  (`FIREBASE_ADMIN_*`) e não aceita o emulador. Ela não é objeto desta tarefa.
- Emulador (`pnpm emulators`, projeto `demo-next-boilerplate`) com o seed de `apps/api/scripts/seed-emulator.mjs`.
- Um init script embrulha `window.fetch`. Para `POST /api/auth/session` ele rejeita (`TypeError`), devolve 403
  `AUTH_FORBIDDEN_ORIGIN`, 401 `AUTH_INVALID_TOKEN` ou 500, rejeita só a 2ª chamada, só a do hook ou só a do provider,
  ou rejeita depois de 1,5 s. Ele conta cargas, `POST`s e alertas (`.Toastify__toast`) em `sessionStorage`. As chamadas
  se distinguem pela URL: o provider usa `window.location.origin + "/api/auth/session"` e o hook usa o caminho relativo.
- A matriz rodou numa sonda Playwright descartável em `/tmp`, com o `@playwright/test` de `apps/e2e`, porque precisava
  de contexto limpo por caso e de leitura do IndexedDB. Um caso (cadastro em es com 403) rodou de novo pelo
  `agent-browser` 0.27.0 com `--init-script`, estritamente em sequência, com o mesmo resultado: carga 1, `POST`s
  `provider:403, hook:403, provider:403`, alerta "No se pudo iniciar tu sesión. Intenta iniciar sesión de nuevo.",
  formulário de cadastro na tela.
- Cada login faz três `POST /api/auth/session`, nesta ordem: `onAuthSuccess` do provider, o hook, e
  `applySignedInUser` do provider depois do refresh responder sem sessão. É o achado "dois ou três `POST` por login",
  que continua aberto no backlog. Por isso "rejeitar o 2º" é o mesmo que "rejeitar o do hook".

### Medições

"Cargas" é o total da aba desde a abertura: 1 significa nenhuma recarga depois do clique. Leitura feita 6 s depois do
clique. Na coluna de `POST`s, `p` é o provider e `h` é o hook.

| caso | cargas | `POST`s | alertas | estado final |
|------|--------|---------|---------|--------------|
| F1 login app, rede, pt-br | 1 | p:rejeita, h:rejeita, p:rejeita | 1 erro, 51 ms após o clique | formulário, botão ativo, sem usuário Firebase, sem cookie, `/pt-br/sign-in` |
| F1 en / es | 1 / 1 | igual | "Your session could not be started. Try signing in again." / "No se pudo iniciar tu sesión. Intenta iniciar sesión de nuevo." | igual |
| F1 claro, escuro, 375 px claro, 375 px escuro | 1 em todos | igual | 1 erro | igual |
| F1 com `?redirect=%2Fpt-br%2Fentities` | 1 | igual | 1 erro | URL preservada com o `?redirect=` |
| F2 login app 403 / 500 / 401 | 1 / 1 / 1 | três recusas | 1 erro (55 a 72 ms) | formulário, sem usuário, sem cookie |
| F3 cadastro app, rede / 403 / 500 | 1 / 1 / 1 | três recusas | 1 erro (383 / 89 / 114 ms) | formulário de cadastro, `/pt-br/sign-up` |
| F3 reenvio com o mesmo e-mail | 1 | nenhum | "Este e-mail já está em uso." | formulário de cadastro |
| F4 sessão persistida sem cookie, login: 401 / 403 / rede | 1 / 1 / 1 | p, h (duas recusas) | nenhum | formulário, sem usuário Firebase |
| F4 sessão persistida sem cookie, cadastro, 403 | 1 | p, h | nenhum | formulário de cadastro |
| F4 sessão persistida, gravação aceita | 2 | p, h (passam) | nenhum | `/pt-br/onboarding` com cookie: uma recarga, sem laço |
| F5 cadastro app sem recusa (cria `qa-reload-loop@example.com`) | 2 | três passam | "Login realizado com sucesso!" | `/pt-br/onboarding` |
| F5 login app sem recusa (`user@example.com`) | 2 | três passam | sucesso | `/pt-br`, "Entidades 4" |
| F6 landing, rede claro / 403 escuro / rede 375 px | 1 / 1 / 1 | p, p (duas recusas) | 1 erro | `<main>` com o formulário "Entrar", botão ativo, `/pt-br/sign-in` da `:3001` |
| F6 landing: recusa, depois login em outra aba | 1 | - | - | a aba da recusa mostrou o formulário; depois do login na segunda aba, foi sozinha para `/pt-br` |
| F7 link por e-mail, rede | 1 | p, p (recusas) | 1 erro | "Entrando…" e "Voltar para o login"; sem usuário Firebase; o link leva a `/pt-br/sign-in` com o formulário, ainda carga 1 |
| F7 link por e-mail sem recusa | 1 | p, p (passam) | sucesso | `/pt-br/onboarding` |
| Duplo envio, rede, `dblclick` + 3º clique | 1 | 9 (três tentativas) | 3 erros, 0 sucesso | formulário, sem navegação |
| Duplo envio, recusa de 1,5 s | 1 | 6 (duas tentativas, do `dblclick`) | 2 erros, 0 sucesso | formulário |
| Linha do tempo do botão, recusa de 1,5 s, um clique | - | - | - | ativo, desabilitado em 9 ms, sem botão (loader) em 24 ms, desabilitado em 1531 ms, ativo em 1542 ms |
| R1: rejeita só o 2º `POST` | 1 | p:passa, h:rejeita, p:passa | sucesso | `/pt-br`, cookie, usuário Firebase; ver o veredito de R1 |
| R1 com `?redirect=/pt-br/entities` | 1 | igual | sucesso | `/pt-br/entities` com as 4 linhas (renderizadas no servidor) |
| R1 no cadastro (rejeita o do hook) | 1 | igual | sucesso | `/pt-br/onboarding` |
| Corrida inversa (rejeita os do provider) | 1 | p:rejeita, h:passa, p:rejeita | 1 erro | formulário, sem usuário Firebase, **com** cookie; recarregar leva a `/pt-br` |
| SSO: login na landing, depois `/pt-br` da app | - | - | sucesso | painel da app com "Entidades 4" |
| SSO: login na app, depois `/pt-br/sign-in` da landing | - | - | - | a landing mandou para `/pt-br` |

Nenhum `pageerror` em nenhum caso.

### Visual (o que se viu nas capturas, que o `.gitignore` descarta)

- O alerta aparece no canto superior direito, por cima da coluna do formulário, sem cobrir o botão "Entrar" (desktop
  1280 px, app e landing). A 375 px ele ocupa a largura toda no topo, acima do título "Entrar", e o botão segue
  visível. Some em 3 s (`autoClose`).
- Contraste medido no corpo do alerta: no claro, texto `rgb(117,117,117)` sobre `rgb(255,255,255)`, 4,6:1 (passa no AA
  para texto normal, com pouca folga); no escuro, `rgb(255,255,255)` sobre `rgb(18,18,18)`, cerca de 18:1.
- No escuro da landing em desktop o alerta cobre o seletor de idioma do cabeçalho enquanto está na tela. É o
  posicionamento padrão do `useAlert`, anterior a esta tarefa.
- Capturas de apoio em `test/e2e/`: `01` a `06` (F1 nos três idiomas, claro, escuro e 375 px), `07` (F3), `08` a `10`
  (F6), `11` e `12` (F7), `13` e `14` (R1), `15` (cadastro em es pelo `agent-browser`). Só aparecem contas
  `@example.com`.

## Defeito: R1 abre o painel sem as consultas autenticadas do cliente

**Repro.** `app` em produção apontando para o emulador. Init script que rejeita só o 2º `POST /api/auth/session` da
aba. Login por senha em `/pt-br/sign-in` com `user@example.com`. Resultado: `/pt-br` com os dados renderizados no
servidor, mas sem o contador do sino e sem `GET /notifications/unread-count` nem `GET /account` em 6 s; só
`GET /auth/me`. Depois de recarregar, tudo aparece. Mutação pelo SDK nesse estado funciona (o toggle "Ativo" deu
`PUT /entities/<id>` 200 duas vezes), porque o `onSuccess` do `SignInForm` escreve o `Authorization` no `apiClient`.

**Causa provável (leitura e medição).** Com a correção do `/review`, o hook não desloga enquanto há mutação pendente,
mas também não navega. Quem navega é o provider, com `router.push`, que é client-side. O `AuthRequestPanelProvider`
fica no layout raiz (`apps/app/app/layout.tsx`) e cria o store uma vez, com o `initialPanel` da tela de login (sem
sessão, `actorUid` nulo). A navegação client-side não recria esse store, então `sdkAuthorized` não vira `true` e todo
`useAuthorizedQuery` fica parado. Antes desta tarefa, o efeito do formulário fazia `window.location.replace` mesmo com
o próprio `POST` falhando (qualquer status que não fosse 401), e a recarga completa semeava o painel pelo servidor.

**O mesmo estado já acontece em todo login por link de e-mail**, que só tem o `router.push` do provider. Medido sem
recusa nenhuma: `/pt-br` com "Entidades 4", sem o contador e só `GET /auth/me` em 6 s. Isso é anterior a esta tarefa
e fica como achado para o backlog.

**Correção sugerida (hipótese, não implementada).**

1. Na raiz, cobre R1 e o link por e-mail: na `apps/app`, a navegação pós-login do provider passa a ser completa
   (`window.location.assign`), por exemplo com uma prop opcional do `AuthProvider` para o modo de navegação, que a
   `AppDesignProvider` passa. Muda o contrato do pacote (prop nova, opcional); a landing segue com `router.push`.
2. Mínima, só R1: no `useSignedInRedirect`, quando o `POST` falha com mutação pendente, esperar o `MutationCache`
   esvaziar (`queryClient.getMutationCache().subscribe` até `isMutating() === 0`) e, se o componente ainda estiver
   montado e `user` existir, gravar a sessão de novo e fazer o `replace` com 2xx.

Teste sugerido junto com a correção, em `useSignedInRedirect.test.tsx`: "com o `POST` recusado e um login pendente,
navega com `replace` quando o login termina e a nova gravação responde 2xx".

## Achados fora de escopo

- **Duplo clique envia duas vezes.** Um `dblclick` nativo dispara dois envios antes de o React desabilitar o botão:
  duas tentativas e dois alertas de erro (três, com um terceiro clique depois que a recusa instantânea libera o
  botão). Nenhum sucesso e nenhuma navegação, então o critério passa. Com um clique só, o botão fica desabilitado em
  9 ms e o formulário sai de cena em 24 ms. O botão e o `signIn.isPending` não mudaram nesta tarefa.
- **Login por link de e-mail abre o painel sem as consultas autenticadas** até recarregar (ver "Defeito").
- **Três `POST /api/auth/session` por login na app** (dois na landing e no link por e-mail). Continua aberto no
  backlog, como o plano registrou.

## Lacunas herdadas

| lacuna (origem) | veredito |
|-----------------|----------|
| O provider só tinha teste pelo `signIn` por senha; Google e link por e-mail sem caso próprio (handoff, review) | **fechada aqui**: dois testes novos, que falham contra o provider do `HEAD` |
| Nenhum teste monta o hook e o provider juntos (R1) (handoff, review) | **continua aberta**. Medida no navegador; o teste de unidade fica para a correção do defeito |
| Corrida inversa sem teste (review) | **continua aberta** no automatizado; medida no navegador: sem laço, formulário com cookie válido, recarregar entra. O review aceitou o comportamento |
| F7 dependia de provedor de e-mail configurado (plano, handoff) | **fechada aqui**: o código do link saiu do endpoint `accounts:sendOobCode` do emulador de Auth, sem provedor de e-mail |
| Duplo envio com recusa (plano, handoff, review) | **fechada aqui**, com a observação do `dblclick` acima |

## Ambiente do e2e

- Portas livres no início (3000, 3001, 3002, 9099, 8080, 4001, 9199). Nada do usuário foi reutilizado.
- A suíte Playwright subiu e derrubou o próprio ambiente (`next dev` + emulador); portas livres ao fim.
- Para a sonda, subi o emulador (PID 12851), a `api` em `next dev` (13308), a `app` (13306) e a `web` (13310) em
  `next start`. Depois do `kill` nesses PIDs, sobraram os filhos `next-server` 13316, 13317 e 13333 e o `firebase.js`
  12873 com o Java 12922; matei esses PIDs. Ao fim, `lsof` vazio em 3000, 3001, 3002, 9099, 8080, 4001, 9199, 4400 e
  4500.
- Rebuildei `apps/app/.next` e `apps/web/.next` em produção contra o emulador. O `next dev` usa diretório próprio, mas
  quem for rodar `next start` com o `.env` local tem de rebuildar antes.
- Apaguei os `apps/api/AGENTS.md`, `apps/app/AGENTS.md` e `apps/web/AGENTS.md` não rastreados que o `next` escreveu.
- Os scripts da sonda ficaram em `/tmp/qa-reload/`, fora do repo. Nenhum harness no working tree.

## Estado de dev alterado e dados de QA

Tudo no emulador, que morreu com o processo. Nenhuma conta em projeto Firebase real, nada a acrescentar ao
`docs/PRE-PRODUCTION.md`.

- Contas criadas: `qa-reload-loop@example.com` (cadastro do F5, usada nos logins com recusa e no F7) e
  `qa-reload-loop-signup-1@example.com` a `qa-reload-loop-signup-5@example.com` (cadastros do F3, do R1 no cadastro e
  do `agent-browser`), além das contas `e2e-signup-<timestamp>@example.com` da suíte Playwright.
- A entidade "Retired Unit" de `user@example.com` foi alternada duas vezes e voltou ao estado do seed.
- A senha das contas de QA foi gerada na hora, só para o emulador, e não está em nenhum arquivo do repo. As contas do
  seed usam a senha pública documentada em `docs/SETUP.md`.

## Arquivos alterados nesta etapa

- `apps/app/__tests__/authProviderSessionNotEstablished.test.tsx` (dois testes e dois mocks novos).
- `docs/features/app-auth-refused-session-reload-loop/test/criterios-aceite.md` e este relatório.
- `docs/features/app-auth-refused-session-reload-loop/STATE.md`.

## Rodada 2

Data: 2026-11-24, 03:24 a 03:40. Mede a correção (a) que o `/review` aplicou na rodada 2: prop
`postLoginNavigation="full-page"` no `AuthProvider` da app, `window.location.replace` no Google dos formulários da
app, e o `useSignedInRedirect` parado enquanto há mutação de login pendente.

### Placar

| | total | ✅ | ❌ | 🔒 |
|---|---|---|---|---|
| Critérios de aceite | 13 | 13 | 0 | 0 |

O critério 12 (corrida R1) passou a ✅. O defeito anterior a esta tarefa, o painel parado depois do login por link de
e-mail, também deixou de acontecer.

### Testes

| comando | resultado |
|---------|-----------|
| `pnpm turbo run test --filter=app --filter=web --filter=@repo/auth --filter=@repo/design-system` (sem `--force`; cache miss nos quatro porque o código mudou) | app 142 arquivos / 1309 testes; web 35 / 315; `@repo/auth` 15 / 201; `@repo/design-system` 14 / 172; todos passando |
| `pnpm --filter e2e exec playwright test signIn signUp crossAppSignOut` | 16/16 (4 setup, 7 chromium, 5 mobile) |

O `pnpm test` da raiz não rodou de novo: os workspaces que a rodada 2 mexeu estão na linha acima, e o resto estava
verde na rodada 1. Não criei teste nesta rodada: o `postLoginFullPageNavigation.test.tsx` do `/review` cobre o
`replace` do provider, o link por e-mail com `isSuccess`, a recusa sem navegação, o padrão `push` da `web` e o hook
parado durante o login.

### Ambiente

`app` e `web` rebuildadas (`next build`, `NODE_ENV=production`) e servidas com `next start`, com o ambiente do
emulador de `apps/e2e/support/stackEnv.ts`. A `api` em `next dev`, pelo mesmo motivo da rodada 1. Emulador com o seed.
Mesmo instrumento: init script que embrulha `window.fetch` para `POST /api/auth/session` e conta cargas, `POST`s e
alertas em `sessionStorage`. Desta vez a sonda também registrou, por `page.on("request")`, as requisições de documento
da aba principal e as chamadas à `api`, com o tempo contado a partir da última carga.

### Medições

"Cargas" é o total da aba. "Documentos" lista as navegações de documento depois do clique; `/pt-br` seguido de
`/pt-br/onboarding` é um redirect do servidor dentro da mesma carga, não duas cargas. Os tempos de
`unread-count` e `account` contam da última carga da aba até a requisição sair.

| caso | cargas | documentos | `POST`s | alertas | estado final |
|------|--------|------------|---------|---------|--------------|
| Login app sem recusa (`user@example.com`) | 2 | `/pt-br` | 2, os dois passam | sucesso | painel; `unread-count` e `account` em 119 ms; sino com "13" |
| Login app sem recusa, `?redirect=/pt-br/entities` | 2 | `/pt-br/entities` | 2 | sucesso | lista; `unread-count` e `account` em 92 ms; sino com "13" |
| Cadastro app sem recusa (`qa-reload-loop@example.com`) | 2 | `/pt-br`, `/pt-br/onboarding` | 2 | sucesso | onboarding |
| **R1, rejeita o 2º `POST`** | 2 | `/pt-br` | 1º passa, 2º rejeitado | sucesso | painel por carga completa; `unread-count` e `account` em 95 ms; sino com "13"; recarregar mantém o login (`unread-count` em 55 ms) |
| **R1, rejeita o 1º `POST`** | 1 | nenhum | 1º rejeitado, 2º passa | `notEstablished` | formulário, sem usuário Firebase, com cookie válido; recarregar leva a `/pt-br` com o sino (`unread-count` em 146 ms) |
| R1 no cadastro, rejeita o 2º / o 1º | 2 / 1 | `/pt-br`, `/pt-br/onboarding` / nenhum | igual ao login | sucesso / `notEstablished` | onboarding / formulário de cadastro |
| **Link por e-mail sem recusa** (código do emulador, `user@example.com`) | 2 | `/pt-br` | 2 | sucesso | painel por carga completa; `unread-count` e `account` em 99 ms; sino com "13" |
| Link por e-mail, rede recusada | 1 | nenhum depois da tela do link | 2 rejeitados | `notEstablished` | "Entrando…" e "Voltar para o login", sem usuário Firebase |
| Google app no login, sem recusa (popup do emulador, conta nova `qa-reload-loop-google@example.com`) | 2 | `/pt-br`, `/pt-br/onboarding` | 2 | sucesso | onboarding por carga completa |
| Google app no cadastro, sem recusa (`qa-reload-loop-google-signup@example.com`) | 2 | `/pt-br`, `/pt-br/onboarding` | 2 | sucesso | onboarding por carga completa |
| Google app, rede recusada | 1 | nenhum | 2 rejeitados | `notEstablished` | formulário, sem usuário Firebase |
| Google app, rejeita o 2º `POST` | 1 | nenhum | 1º passa, 2º rejeitado | `notEstablished` | formulário, sem usuário Firebase, com cookie válido |
| F1 login app, rede | 1 | nenhum | 2 rejeitados | `notEstablished` | formulário, sem cookie |
| F2 login app, 403 / 401 | 1 / 1 | nenhum | 2 recusados | `notEstablished` | formulário |
| F3 cadastro app, rede / 403 | 1 / 1 | nenhum | 2 recusados | `notEstablished` | formulário de cadastro |
| F4 sessão persistida sem cookie: 401 / 403 / rede | 1 | só o `/pt-br/sign-in` aberto | provider e hook recusados | nenhum | formulário, sem usuário Firebase |
| F4 sessão persistida, gravação aceita | 2 | `/pt-br/sign-in`, `/pt-br`, `/pt-br/onboarding` | provider e hook passam | nenhum | onboarding; uma recarga só |
| F6 landing, rede | 1 | nenhum | 2 rejeitados | `notEstablished` | formulário |
| F6 landing sem recusa | 1 | nenhum (navegação client-side, como antes) | 2 | sucesso | `/pt-br` da landing |

O login por senha faz agora **dois** `POST /api/auth/session` (eram três na rodada 1): o de `applySignedInUser` e o
de `onAuthSuccess`. O hook não grava nada durante um login novo; na sessão persistida, sem mutação, gravam o provider
e o hook, como antes.

O Google das contas novas cai no onboarding, onde não há sino, então o contador não pôde ser conferido nesse caminho.
O que a medição prova é a carga completa: uma carga depois do clique, com o servidor decidindo o destino.

Nas duas variantes em que a gravação do provider passa e a outra falha (R1 com o 1º rejeitado, Google com o 2º
rejeitado), a pessoa fica no formulário com o alerta e um cookie válido. É a corrida inversa da rodada 1: sem laço, e
recarregar entra no painel. O `/review` aceitou esse comportamento.

### Vereditos

- **R1:** aprovado. Com a gravação do `onAuthSuccess` aceita, a pessoa chega ao painel por carga completa e as
  consultas autenticadas saem em menos de 120 ms. Com ela recusada, alerta e formulário numa carga só.
- **Link por e-mail:** aprovado. O painel abre por carga completa com o sino em 99 ms. Isso fecha também o defeito
  anterior a esta tarefa que a rodada 1 registrou.
- **Google da app:** carga completa medida no login e no cadastro; recusa sem laço.
- **F1 a F6:** sem regressão. Recusa em 1 carga; caminho feliz com uma carga completa só.

### Achados que continuam fora de escopo

- O `dblclick` nativo ainda envia duas vezes (rodada 1). Não medi de novo: o botão não mudou.
- `Could not request the verification email AxiosError: Request failed with status code 503` aparece no log do
  E2E de cadastro. É o modo degradado sem provedor de e-mail, anterior a esta tarefa, e o teste passa.

### Lacunas herdadas, depois da rodada 2

| lacuna | veredito |
|--------|----------|
| Nenhum teste monta o hook e o provider juntos (R1) | **fechada** pelo sexto caso de `postLoginFullPageNavigation.test.tsx` e medida no navegador |
| Corrida inversa sem teste automatizado | **continua aberta**, aceita pelo review; medida de novo no navegador, sem laço |
| Login por link de e-mail abre o painel sem as consultas autenticadas | **fechada** pela correção (a) |

### Portas e processos

Portas livres no início. Subi o emulador, a `api` (`next dev`), a `app` e a `web` (`next start`) com PIDs guardados.
No fim matei os quatro PIDs de topo e, em seguida, os filhos que seguravam porta, também pelo PID: três
`next-server`, o `firebase.js` e o Java do Firestore. A suíte Playwright subiu e derrubou o próprio ambiente depois
disso. `lsof` vazio em 3000, 3001, 3002, 9099, 8080, 4001, 9199, 4400 e 4500. Apaguei de novo os `apps/*/AGENTS.md`
não rastreados e removi a sonda de `/tmp`. Os `.next` de `app` e `web` ficaram com build de produção apontando para
o emulador.

### Dados de QA da rodada 2

No emulador, descartados com o processo: `qa-reload-loop@example.com`, `qa-reload-loop-signup-6@example.com` a
`qa-reload-loop-signup-9@example.com`, `qa-reload-loop-google@example.com`,
`qa-reload-loop-google-signup@example.com` e as contas `e2e-signup-<timestamp>@example.com` da suíte. A senha foi
gerada na hora e não está em nenhum arquivo do repo.
