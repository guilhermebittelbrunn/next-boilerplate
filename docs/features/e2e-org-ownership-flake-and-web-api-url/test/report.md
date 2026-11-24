# Relatório do `/test`: E2E instável de `organizationOwnership` e a `web` sem `NEXT_PUBLIC_API_URL`

Rodou dentro do `/cycle`, sem perguntas. Branch `feat/delivery-security-hardening` (não é protegida; não troquei
nem criei branch). O gate anterior está fechado: `review = done` no `STATE.md` e nenhum commit da rodada existe
ainda. Nada foi commitado.

O working tree também carrega as fatias 2 e 3 de `delivery-security-review`. O `pnpm e2e` inteiro desta etapa
roda sobre as três mudanças juntas e serve de rede de regressão da rodada inteira.

## Placar

| status | quantos |
|--------|---------|
| ✅ aprovado | 13 critérios |
| ❌ reprovado | 0 |
| 🔒 não verificado | 1 parte de critério (login pelo Google na landing) |

Nenhum defeito desta tarefa. Duas observações de comportamento que já existiam antes dela estão em
"Achados para o backlog".

## Cobertura e comandos

| gate | comando | resultado |
|------|---------|-----------|
| Vitest do e2e | `pnpm --filter e2e test` | 3 arquivos, 38 testes, verdes (`stackEnv.test.ts` com 9) |
| typecheck do e2e | `pnpm --filter e2e typecheck` | sem erro |
| Vitest da web | `pnpm --filter web test` | 313 testes antes do teste novo; 35 arquivos e 314 testes depois dele, verdes |
| typecheck da web | `pnpm --filter web typecheck` | sem erro (com o teste novo) |
| lint/format | `pnpm check` | `Checked 1122 files`, nenhum ajuste (com o teste novo) |
| suíte da raiz | `pnpm test` (JDK 21 exportado, sem `--force`) | `Tasks: 15 successful, 15 total`, 47,9 s. `app` 1277, `api` 1825, `api:test:emulator` 274, `web` 313, `e2e` 38, `auth` 201, `email` 209, `design-system` 172, demais pacotes verdes. Repetido depois do teste novo: 15/15, `web` 314 |
| i18n | não rodado | nenhuma chave nova no diff |
| E2E inteiro, pilha fria | `rm -rf apps/{app,web,api}/.next/dev` e `pnpm e2e` | **42 passed (5,3 min)**, 0 failed, 0 flaky. O `retries` local é 0, então "flaky" não tem como aparecer: toda reprovação contaria |
| estabilidade e trace | `playwright test tests/organizationOwnership.spec.ts --project=chromium --repeat-each=10 --retries=0 --trace on` | **14 passed (4,6 min)**: 4 de setup e 10 de `organizationOwnership`, entre 13,7 s e 24,9 s cada |
| detecção do defeito (V5) | `support/stackEnv.ts` com a linha da `web` trocada por `return {};`, `playwright test tests/crossAppSignOut.spec.ts --project=chromium --retries=0` | os 2 testes reprovaram em `getByText('Esta sessão foi encerrada. Entre novamente para continuar.')`: `element(s) not found`. Linha restaurada; `cmp` contra a cópia de antes confere |
| medição da landing | harness Playwright temporário (ver itens 1 a 3), 1 passada com o layout antigo e 2 com o atual | números abaixo |

O `pnpm e2e` frio é também a execução com pilha fria do item 6: apaguei o cache de desenvolvimento do Next
(`.next/dev`) dos três apps antes, como num checkout limpo do CI. O `organizationOwnership` levou 37,8 s nela e
passou. Nenhuma quebra por tempo apareceu.

### Teste criado

`apps/web/__tests__/rootLayoutAuthProvider.test.tsx` (faixa barata, `renderToString` em ambiente `node`, a mesma
exceção que o `CLAUDE.md` da `web` abre para Server Component). Ele chama o `RootLayout`, renderiza a árvore de
dentro do `<body>` com o `DesignSystemProvider` real e um `AuthProvider` falso que conta montagens, e espera
exatamente uma. Com o layout antigo copiado de volta por alguns segundos, o teste reprovou com
`expected 2 to be 1`; com o atual, passa. Ele fecha a lacuna "nenhum teste de unidade fixa um `AuthProvider` só
na `web`".

## Decisões de custo de teste

| módulo tocado | decisão |
|---------------|---------|
| `apps/web/app/[locale]/layout.tsx` | teste de unidade novo, descrito acima. Nenhum E2E novo: a contagem de montagens não precisa de servidor de pé |
| `apps/e2e/support/stackEnv.ts` | o `stackEnv.test.ts` existente já fixa os dois valores da `web`; nada acrescentado |
| `apps/e2e/tests/organizationOwnership.spec.ts` e `crossAppSignOut.spec.ts` | são a própria faixa cara (pilha montada, cookie entre portas). Nenhum teste novo; executei os que existem |
| itens 1 a 3 (contagem de chamadas e toasts na landing) | medidos com harness temporário, depois apagado. Não virou spec permanente: o login com senha pela landing faz 2 `POST /api/auth/session` por causa de um caso aberto do backlog, e fixar 2 num spec travaria o defeito em vez de expô-lo |

## Verificar no `/test` (lista do `review.md`)

| # | item | veredito |
|---|------|----------|
| 1 | Login pela landing com um provider só: toast único, destino certo, um `POST /api/auth/session` | **Confirmado em parte.** Toast "Login realizado com sucesso!" uma vez e destino `http://localhost:3001/pt-br`, nas 2 passadas. Mas saem **2** `POST /api/auth/session`, não 1. Sequência medida: `custom-token` (401, carga deslogada), `session/refresh` (401, ainda sem sessão), `session` (200), `session` (200). Com um provider, o `refresh` 401 faz o observador do token chamar `syncSessionCookie`, e o `onAuthSuccess` faz a outra gravação: é o par do caso aberto do backlog, não um segundo provider. Com o layout antigo eram 3 `POST /api/auth/session`, 2 `custom-token` e 2 `refresh`. Google: 🔒 (abaixo) |
| 2 | Carga da landing com sessão vinda da app: uma `custom-token`, no máximo uma `session/refresh` | **Confirmado.** Primeira carga: 1 `custom-token` e 1 `session/refresh`, nenhum `POST /api/auth/session`, nas 2 passadas. No `reload` seguinte, só 1 `session/refresh`. Com o layout antigo: 2 `custom-token` e 4 `refresh` na primeira carga, 2 `refresh` no `reload`. O log do servidor do `pnpm e2e` frio mostra o mesmo par (`[web] POST /api/auth/custom-token 200` e `[web] POST /api/auth/session/refresh 200`) no segundo teste do `crossAppSignOut` |
| 3 | Senha errada na landing mostra o toast uma vez | **Confirmado.** Um toast, texto "Senha incorreta.", a URL continua `http://localhost:3001/pt-br/sign-in`, nenhuma chamada de sessão além do `custom-token` da carga. O layout antigo também mostrava um só: o `onError` da mutação vive só no provider que o formulário usa, então o toast de erro nunca dobrou |
| 4 | No trace, a `GET /organization/invitations` termina antes do `axe.runPartial` | **Confirmado nas 10 repetições.** Script sobre os 10 `trace.zip`, contexto do convidado, tempos contados a partir do `reload`: uma única `GET /organization/invitations` por carga, sempre 200, começando entre 1076 ms e 4455 ms e terminando entre 1261 ms e 5360 ms. O primeiro `axe.runPartial` veio de 338 ms a 607 ms depois do fim da resposta. A variação no início da busca, de até 4,4 s depois do `reload`, explica por que a espera só de opacidade passava cedo |
| 5 | `pnpm e2e` inteiro uma vez | **Confirmado.** 42 passed, inclusive `entityCrud`, `panelSwitch`, `a11yDark`, `accountSettings`, `signIn`, `signUp` e `landing` depois dos testes novos, nos projetos `chromium` e `mobile` |
| 6 | Estabilidade com pilha fria | **Confirmado.** Pilha fria (`.next/dev` apagado): `organizationOwnership` passou em 37,8 s. Pilha quente: 10 de 10 com `--retries=0` |

## Critérios de aceite com status

Texto completo de cada critério em [`criterios-aceite.md`](criterios-aceite.md).

| critério | status | meio | evidência |
|----------|--------|------|-----------|
| O axe da página da equipe só roda com a tabela de convites estável | ✅ | E2E + trace | item 4 acima; `playwright.config.ts` e `support/a11y.ts` sem diff (`git diff --quiet`), regra e allowlist intactas |
| O spec da equipe passa repetido sem reprovação por contraste | ✅ | E2E | `--repeat-each=10 --retries=0`: 10/10 |
| A landing da suíte fala com a API | ✅ | unidade + E2E | `stackEnv.test.ts` verde; `landing.spec.ts:11` (CTA abre o cadastro da landing) verde em `chromium` e `mobile` |
| Sair na landing encerra a sessão na app | ✅ | E2E | `crossAppSignOut.spec.ts:31` verde no `pnpm e2e` frio (13,7 s) |
| Sair na app encerra a sessão na landing | ✅ | E2E | `crossAppSignOut.spec.ts:59` verde no `pnpm e2e` frio (11,1 s), com o aviso em locator estrito |
| Os dois testes novos detectam o defeito que cobrem | ✅ | E2E com reversão temporária | V5 na tabela de comandos |
| A landing monta um AuthProvider só | ✅ | unidade + E2E | teste novo (1 montagem; 2 com o layout antigo); nenhum erro de `useAuth` no `pnpm e2e` nem no harness |
| Login com senha pela landing: um toast e o destino certo | ✅ (Google 🔒) | harness E2E | item 1. A contagem de 2 `POST /api/auth/session` ficou registrada e atribuída ao par `onAuthSuccess` + observador |
| Carga da landing com sessão vinda da app | ✅ | harness E2E + log do servidor | item 2 |
| Senha errada na landing: um toast de erro | ✅ | harness E2E | item 3 |
| A landing renderiza igual depois da remoção do provider | ✅ | captura antes × depois | seção "Evidência visual" |
| A sessão do seed usada pelos outros specs continua viva | ✅ | E2E | `pnpm e2e` 42/42 |
| Gates estáticos, suíte e documentação | ✅ | gates | tabela de comandos; `docs/SETUP.md` cita a saída entre apps (conferido pelo `/review`, sem mudança desde então) |

🔒 **Login pelo Google na landing.** O emulador de Auth abre um popup próprio para o Google, e nem os specs nem o
harness dirigem esse popup. Pelo código, o botão do Google usa a mesma `onAuthSuccess` e o mesmo observador da
senha, então a contagem esperada é a mesma do item 1. Não medi.

## Evidência visual

Home da landing, deslogada, pt-br, capturada com o layout antigo (dois providers) e com o atual, em light desktop
(1280 px), dark desktop (1280 px) e light mobile (390 px, toque).

- Sem máscara, o light desktop diferiu em 869 pixels, todos dentro do carrossel de logotipos ("Empresas que confiam
  em nós"). Esse carrossel avança sozinho por `setTimeout` em `cases-client.tsx`, então a posição dos logotipos
  muda entre duas capturas, e `animations: "disabled"` não o congela.
- Com os carrosséis mascarados (`[data-slot="carousel"]`, o de logotipos e o de depoimentos), as três capturas
  depois da mudança têm o mesmo SHA-1 das de antes, e o comparador do Playwright passou nas duas repetições.
- O que aparece nas capturas: header com "Início", "Produto", "Contato", seletor "Português", alternador de tema,
  "Entrar" e "Cadastrar"; hero "Início" com os botões "Entrar" e "Cadastrar"; seções "Recursos poderosos",
  "Números que impressionam" (1,000 e 500), "Perguntas frequentes", "Pronto para começar?" e rodapé. No escuro, o
  fundo é quase preto e o texto claro; no mobile, o header mostra só "Cadastrar" e o botão de menu.

Por que não fiz a matriz completa (3 idiomas × light/dark × mobile/desktop dirigindo o app): a mudança de produto
tira um provider de contexto que não renderiza nada nem lê copy. Se o pixel não muda num idioma, nos outros dois
também não muda por causa dele. O `a11yDark.spec.ts` e o `landing.spec.ts` do `pnpm e2e` cobriram o resto da
landing no escuro e no projeto `mobile`.

Capturas em `test/e2e/` (`before-*.png`, `after-*.png`). O `.gitignore` descarta essa pasta; o texto acima é a
evidência que fica.

## Ambiente do e2e

- Portas 3000 a 3003, 4001, 4400, 4500, 8080, 9099 e 9199 livres antes de cada execução. Ninguém mais usava as
  portas; nada do usuário foi reutilizado.
- Não subi servidor por conta própria. O Playwright subiu e derrubou o próprio stack (emuladores, `api`, `app`,
  `web`) em cada uma das 7 execuções: `pnpm e2e`, repetição com trace, harness com o layout antigo (2 vezes, a
  segunda só para refazer as capturas com máscara), harness com o layout atual (2 vezes, a segunda com
  `--repeat-each=2`) e V5. O `pnpm test` subiu e derrubou os emuladores do `test:emulator`.
- No fim, `lsof -nP -iTCP:<porta> -sTCP:LISTEN` voltou vazio em todas as portas, e `ps` não mostrou `next dev`,
  `firebase` nem `playwright` deste workspace.
- Os `apps/api/AGENTS.md`, `apps/app/AGENTS.md` e `apps/web/AGENTS.md` não rastreados, que o `next dev` grava,
  foram apagados.
- Harness removido: `apps/e2e/qa-tmp/` e `apps/e2e/qa-tmp.config.ts`. As reversões temporárias de
  `apps/web/app/[locale]/layout.tsx` e `apps/e2e/support/stackEnv.ts` foram desfeitas; o SHA-1 do layout e o `cmp`
  do `stackEnv.ts` conferem com as cópias de antes.

## Dados de QA e estado de dev

Tudo rodou nos emuladores, com o projeto demo; nenhum projeto Firebase real foi tocado e nenhuma conta foi criada
fora dele. Contas usadas: `user@example.com`, `admin@example.com` e `user2@example.com` (públicas do seed), as
`e2e-team-<timestamp>@example.com` que o `organizationOwnership` cria a cada execução e as que o `signUp.spec`
cria. Todas morreram com o emulador. Não criei `qa-e2e-flake@example.com`, porque não houve passada fora do
emulador. Nenhuma senha está neste arquivo; a do seed é pública e fica em `apps/e2e/support/seedAccounts.ts`.

## Lacunas herdadas

| lacuna | veredito |
|--------|----------|
| Nenhum teste de unidade fixa um `AuthProvider` só na `web` (handoff e review) | **fechada aqui**: `rootLayoutAuthProvider.test.tsx` |
| V4, ordem no trace (handoff) | **fechada aqui**: item 4 |
| V2, `pnpm e2e` inteiro (handoff) | **fechada aqui**: 42/42 |
| Login pela landing sem spec (handoff) | **medida aqui**, sem spec permanente (ver decisões de custo). Google continua 🔒 |
| Toast duplo em outras mensagens da landing (handoff) | **fechada aqui** para a senha errada. Nas outras mensagens, continua aberta sem medição, mas o `errorAlert`/`successAlert` das mutações só existe no provider que o formulário usa |
| Quebras por tempo sob `next dev` frio do mesmo spec | **fora de escopo** (backlog). Nesta rodada não apareceram |

## Achados para o backlog

Nenhum dos dois vem desta tarefa nem das fatias 2 e 3; os dois moram em `packages/auth/provider.tsx`.

- 🟡 **Login com senha pela landing faz 2 `POST /api/auth/session` com um provider só.** Medido acima: o
  observador do token recebe 401 no `session/refresh` e grava o cookie, e o `onAuthSuccess` grava de novo. É o caso
  aberto do backlog (`specs/BACKLOG.md`, a linha que o `review.md` cita como `:1353`). Correção sugerida, como
  hipótese: no `applySignedInUser`, não chamar `syncSessionCookie` enquanto um `onAuthSuccess` estiver em
  andamento (um ref ligado no início da mutação), ou deixar só o observador gravar o cookie e o `onAuthSuccess`
  aguardar essa gravação.
- 🟢 **Login com senha pela app faz 3 `POST /api/auth/session`.** Visto no log do servidor do setup em todas as
  execuções (`[app] POST /api/auth/session 200` três vezes, depois de `custom-token` 401 e `refresh` 401). A app
  monta um provider só; o backlog fala em 2 por conclusão do link de e-mail. Não investiguei a terceira chamada,
  que fica como ampliação do mesmo caso.

## Regressão da rodada

O `pnpm e2e` inteiro passou com as fatias 2 e 3 no working tree. As mudanças delas que o navegador atravessa
(checagem de `Origin` nas rotas de sessão, recusa de escrita por cookie sem `Origin` na API, `sessionDELETE` com a
requisição) não reprovaram nenhum fluxo: login, cadastro com onboarding, CRUD, troca de painel, saída entre apps e
convite de equipe ficaram verdes.

O log do `next dev` mostra `Error: The destination stream errored while writing data` na `app` e
`Error: aborted` (`ECONNRESET`) na `api` quando o teste navega antes de a página anterior terminar de transmitir.
Nenhum teste reprovou por isso. Pela forma das mensagens, é o servidor de desenvolvimento registrando uma resposta
que o navegador cancelou; não investiguei além disso.
