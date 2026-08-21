# Critérios de Aceite (Checklist)

Derivados de [`docs/AUTH-PANEL.md`](../../../AUTH-PANEL.md) (fonte da verdade da regra de negócio).
Status por item: **PASS** · **FALHOU** · **não coberto**, sempre com o meio de verificação
(unit / hook / rota / e2e / manual).

## Papéis e roteamento

- [x] **Login de admin cai na área administrativa** — **PASS** (e2e `01`)
  Autenticar com um perfil `type: admin` deve terminar em `/{locale}/admin`, não em `/{locale}`. O papel
  é lido do documento `user` do Firestore, nunca do token, então o destino não pode depender de claim.
  Verificado ao vivo: o login terminou em `/pt-br/admin` com a sidebar administrativa (item "Usuários")
  e o seletor de ambiente em "Administração".

- [x] **Usuário comum nunca vê controle de painel** — **PASS** (unit `panelState.test.ts`,
  `panelNavbarControls.test.tsx`)
  Para `profileKind: common`, `shouldRenderPanelControls` retorna `false` e o componente devolve `null`:
  nem o seletor de ambiente nem o de usuário existem no DOM. Qualquer painel/alvo gravado à força é
  normalizado de volta para comum sem alvo. **Não validado por e2e** — faltou credencial de usuário comum
  (só a de admin foi fornecida).

- [x] **Admin no painel comum sem alvo degrada para admin** — **PASS** (unit `panelState.test.ts`,
  `panelSnapshot.test.ts`)
  Painel comum sem alvo não é impersonação: a API rejeitaria toda request com
  `AUTH_REQUEST_IMPERSONATION_REQUIRED`, então `normalizePanelSnapshot` degrada o estado para o painel
  admin em vez de deixar o usuário numa área que não funciona. O layout comum então redireciona para
  `/{locale}/admin`.

- [x] **Admin impersonando é afastado da área administrativa** — **PASS** (e2e `05`)
  Entrar no painel comum a partir de `/{locale}/admin/users` deve mover o usuário para a área comum,
  espelhando no front o que `requireAdminApi` faz no servidor. Verificado ao vivo: a URL saiu de
  `/pt-br/admin/users` e chegou em `/pt-br` no mesmo gesto de troca, sem flash de conteúdo admin.

- [x] **Voltar ao painel admin limpa o alvo** — **PASS** (e2e `11`, unit `panelState.test.ts`)
  Escolher "Administração" deve apagar o cookie `bp:impersonate-firebase-uid` e esconder o seletor de
  usuários. Verificado ao vivo: após a troca só sobrou `bp:panel-request-role=admin`, o segundo combobox
  desapareceu e a URL virou `/pt-br/admin`.

## Cadeia de gates (proxy → layouts → API)

- [x] **Proxy é default-deny** — **PASS** (unit `proxy.test.ts`, 12 casos)
  Toda rota exige sessão, exceto `/sign-in` e `/sign-up`: uma rota autenticada nova já nasce protegida,
  sem allowlist para lembrar. Coberto inclusive o caso de uma rota inexistente/nova
  (`/pt-br/brand-new-feature` → `sign-in`), que é a razão de ser do default-deny.

- [x] **Deep link é preservado na ida e honrado na volta** — **PASS** (unit `proxy.test.ts`)
  Anônimo em `/pt-br/entities/create` vai para `/pt-br/sign-in?redirect=%2Fpt-br%2Fentities%2Fcreate`; já
  autenticado numa rota pública com `?redirect=` volta exatamente para o destino guardado. Sem o parâmetro
  cai em `/{locale}`.

- [x] **`?redirect=` não vira open redirect** — **PASS** (unit `proxy.test.ts`,
  `postAuthRedirectTarget.test.ts`)
  Destino absoluto (`https://evil.example.com`), protocol-relative (`//evil.example.com`) e path sem
  locale são descartados em favor de `/{locale}`. É controle de segurança: o valor vem da query string,
  logo é entrada não confiável.

- [x] **Asset estático não é redirecionado para o sign-in** — **PASS** (unit `proxy.test.ts`)
  Caminho terminado em extensão de arquivo (`/logo.png`, `/pt-br/brand/icon.svg`, `/sw.js`) passa direto,
  **sem** nem consultar a sessão — senão qualquer arquivo de `public/` viraria um 307 para o login.

- [x] **Prefixo de rota pública não vaza acesso** — **PASS** (unit `proxy.test.ts`)
  `/pt-br/sign-in/recover` é público (é subrota de uma pública), mas `/pt-br/sign-in-internal` **não** é —
  o casamento é por segmento, não por `startsWith` solto. Sem isso bastaria nomear uma rota
  `sign-in-algo` para furar o gate.

- [x] **Path sem locale recebe o locale default** — **PASS** (unit `proxy.test.ts`)
  `/entities` redireciona para `/pt-br/entities` e o cookie `x-locale` grava o locale efetivamente
  servido, não o pedido.

- [x] **Guards de servidor redirecionam por papel** — **PASS** (unit `serverGuards.test.ts`)
  `requireSession` manda anônimo para `sign-in`; `requireAdmin` manda comum para `/{locale}`, inclusive
  quando a sessão existe mas **não** tem `type` reconhecido (least-privilege: sessão sem tipo não é
  admin).

## Autorização na API

- [x] **`GET /users` ignora o `?type=` do cliente em painel comum** — **PASS** (rota
  `usersRoute.test.ts`)
  Com `requestRole === common` a listagem é forçada a `type=common` **mesmo** quando a query string pede
  `?type=admin`: o escopo vem do contexto da request, não de confiança no cliente. Perfil admin nunca
  vaza para um acesso em contexto comum. Em painel admin o `?type=` é respeitado, e um valor não
  reconhecido (`?type=superuser`) é ignorado em vez de virar filtro inválido.

- [x] **Admin impersonando não escreve na área admin** — **PASS** (guard `adminGuard.test.ts`)
  `requireAdminApi` rejeita `requestRole === common` em métodos mutantes (`POST`/`PUT`/`PATCH`/`DELETE`)
  com `AUTH_REQUEST_PANEL_FORBIDDEN` + 403, e libera os seguros (`GET`/`HEAD`/`OPTIONS`). A leitura fica
  aberta de propósito: o próprio seletor de impersonação é alimentado por `GET /users`, e fechá-la
  trancaria o admin no primeiro usuário acessado.

- [x] **Rota admin recusa não-admin e anônimo** — **PASS** (guard `adminGuard.test.ts`, rota
  `usersRoute.test.ts`)
  Perfil comum recebe `ADMIN_FORBIDDEN` (403) e chamador sem token válido recebe `AUTH_INVALID_TOKEN`
  (401) — nos dois casos o handler não é executado e o repositório não é consultado.

- [x] **Os 7 códigos de erro de contexto são exercitados** — **PASS** (`authRequestContext.test.ts`, 15
  casos)
  `AUTH_REQUEST_USER_ID_MISMATCH`, `AUTH_REQUEST_USER_ROLE_MISMATCH`, `AUTH_REQUEST_PANEL_FORBIDDEN`,
  `AUTH_REQUEST_IMPERSONATION_FORBIDDEN`, `AUTH_REQUEST_ADMIN_TARGET_INVALID`,
  `AUTH_REQUEST_IMPERSONATION_REQUIRED` e `AUTH_REQUEST_IMPERSONATION_TARGET_INVALID`, mais os caminhos
  felizes. `x-user-id` ≠ uid do token é o cross-check anti-spoofing e continua obrigatório.

- [x] **Copy dos erros existe nos 3 idiomas** — **PASS** (`@repo/internationalization` paridade, 2 testes)
  Todo `error.code` de auth tem texto em pt-br/en/es em `apiErrors`; o teste de paridade falha se faltar
  qualquer chave em qualquer idioma.

## Listagem de usuários (o que alimenta o seletor)

- [x] **Perfil órfão é omitido, falha transitória é propagada** — **PASS**
  (`userRepositoryList.test.ts`)
  Perfil cujo usuário do Firebase Auth foi apagado por fora (`auth/user-not-found`) é omitido da listagem
  em vez de derrubar a resposta inteira. Qualquer outro erro do Admin SDK (rate-limit, `internal-error`)
  **sobe**: numa tela de gestão de usuários, esconder registros em silêncio é pior que falhar
  visivelmente.

- [x] **`queryKey` descreve o escopo que a API devolve** — **PASS** (`useListUsers.test.tsx`)
  Em painel comum a listagem é forçada a `common`, então a chave também é `list("common")` — senão uma
  tela da área comum cacharia uma lista escopada por impersonação sob a chave de admin. Mutações
  invalidam o prefixo `queryKeys.users.all`, porque mudar o `type` move o usuário entre escopos.

- [x] **Seletor lista vários usuários comuns, não só o atual** — **PASS** (e2e `06`)
  O bug relatado era o seletor mostrar apenas o usuário corrente. Verificado ao vivo: 4 usuários comuns
  listados, com campo de busca, e **nenhum** admin entre as opções (os 2 admins que aparecem na tela de
  gestão não estão no seletor).

## Estado de painel (cookie manda, localStorage espelha)

- [x] **Cookie é a autoridade e o snapshot do servidor sempre vence** — **PASS** (`panelState.test.ts`,
  `panelSnapshot.test.ts`, `panelStore.test.ts`)
  Server Components leem `bp:panel-request-role` / `bp:impersonate-firebase-uid`; o localStorage só
  guarda o rótulo de exibição que o cookie não carrega. A cada carga o espelho é reescrito a partir do
  snapshot, nunca o contrário. Nenhum dos dois concede acesso — são preferência, e o alvo é revalidado no
  servidor a cada request.

- [x] **Cookie de painel nunca é mais curto que a sessão** — **PASS** (`panelState.test.ts`)
  `PANEL_COOKIE_MAX_AGE_SECONDS` = 14 dias, com `samesite` e o `max-age=0` no delete cobertos por teste.
  Um cookie mais curto expulsaria o admin da área comum silenciosamente antes do fim da sessão.

- [x] **Visibilidade dos controles não depende de estado assíncrono** — **PASS** (`panelState.test.ts` —
  "panel control visibility (server snapshot only)")
  É o teste de regressão do bug original: com o store semeado pelo snapshot, a função pura de
  visibilidade já responde "mostrar controles" **antes** de qualquer round-trip. Não há `/auth/me` no
  cliente — era exatamente ele que fazia os controles desaparecerem no meio do reload.

- [x] **Store é por request, nunca singleton de módulo** — **PASS** (`authRequestPanel.test.tsx`,
  `panelStore.test.ts`)
  `createPanelStore(snapshot)` roda num `useState` do provider e o acesso é por context. Um singleton
  seria lido enquanto o servidor renderiza, e dois visitantes concorrentes no mesmo processo Node
  poderiam receber HTML com o painel um do outro.

- [x] **Controles seguem visíveis ao trocar de usuário** — **PASS** (e2e `10`)
  Era o ponto exato onde os controles sumiam. Verificado ao vivo: ao passar do 1º para o 2º usuário
  comum, os dois comboboxes permaneceram na tela, o seletor de ambiente continuou em "Painel do usuário"
  e o cookie de alvo trocou de uid.

- [x] **Sem alvo possível, o seletor de ambiente fica desabilitado** — **PASS** (unit
  `panelNavbarControls.test.tsx`) · ⚠️ ver defeito D2
  Trocar para o painel comum sem nenhum usuário comum disponível é impossível, então o controle é
  desabilitado em vez de o clique virar no-op silencioso. A regra está correta e testada; **em runtime**
  ela está sendo disparada por um motivo errado (lista falhando com 401) — ver `report.md` D2.

- [x] **Troca de contexto usa `router.refresh()`** — **PASS** (`panelNavbarControls.test.tsx`,
  `authRequestPanel.test.tsx`)
  Os cookies já estão atualizados, então só os Server Components precisam re-rodar: o bundle, o cache do
  React Query e o estado de UI sobrevivem. `window.location.reload()` não deve aparecer no caminho.

- [x] **Escolher um alvo é a intenção de entrar no painel comum** — **PASS** (`panelState.test.ts`)
  As duas coisas mudam juntas, senão a normalização descartaria o alvo recém-escolhido. Foi um bug real
  pego por teste durante a implementação.

- [x] **Trocar de sujeito descarta o cache de queries** — **PASS** (unit `authRequestPanel.test.tsx`) ·
  **não coberto por e2e** — ver defeito D1
  Todo dado em cache pertence ao sujeito ativo quando foi buscado; sem `queryClient.clear()` as linhas do
  usuário anterior ficam na tela até um refresh manual. O comportamento está coberto no nível do provider,
  mas **não pôde ser observado ao vivo**: com o `POST /entities` retornando 403 não foi possível criar o
  dado do usuário A para vê-lo desaparecer no usuário B.

- [x] **Logout limpa painel, cookies e cache** — **PASS** (`panelState.test.ts`,
  `postAuthRedirectTarget.test.ts`)
  `resetPanel()` apaga os dois cookies e o localStorage, e o `signOut` chama `queryClient.clear()` para o
  cache não vazar para o próximo usuário na mesma aba.

## Contrato de headers (SDK → API)

- [x] **Derivação dos headers cobre os 3 estados** — **PASS** (`deriveAuthRequestProps.test.ts`)
  Comum (`userId == requestUserId`, ambos `common`), admin no painel admin (ambos `admin`) e admin
  impersonando (`requestUserId` = uid do alvo, `userRole: admin`, `requestRole: common`). Inclui
  `impersonatedUid: ""` (falsy → trata como painel admin) e `profileKind: null`.

- [x] **Timezone é validada e nunca decide acesso** — **PASS** (`authRequestTimeZone.test.ts`,
  `authRequestContext.test.ts`)
  Zona IANA válida passa; inexistente (`Mars/Olympus_Mons`), acentuada (`America/São_Paulo`), vazia,
  `null` e `undefined` viram `null` no contexto — sem rejeitar a request. `resolveBrowserTimeZone`
  devolve `undefined` quando a plataforma não resolve, em vez de lançar.

- [x] **Header novo entra no CORS** — **PASS** (verificado ao vivo no `/review`)
  `x-user-timezone` aparece em `access-control-allow-headers` no preflight, porque o proxy da API itera
  `Object.values(AUTH_REQUEST_HEADER)`.

- [ ] **Os headers de contexto chegam à API em toda request do painel** — **FALHOU** (e2e — defeito D1)
  É a garantia central da feature: nenhuma query pode sair antes dos headers, senão a API resolve o
  **ator** em vez do **sujeito**. Em runtime os `x-*` são aplicados no render e **apagados em seguida**
  por um efeito irmão, e as requests seguem com apenas `Authorization`. Consequência observada:
  `GET`/`POST /entities` respondem 403 `COMMON_PANEL_FORBIDDEN` enquanto o admin impersona. Causa raiz e
  correção sugerida no `report.md`.

## Interface

- [x] **Sidebar persiste fechada entre navegações, sem piscar** — **PASS** (e2e `02`, `03`; unit
  `sidebarState.test.ts`, `sidebarPersistence.test.tsx`)
  O estado vem de cookie resolvido no **servidor** (`resolveSidebarDefaultOpen` → `defaultOpen`), não de
  `localStorage` lido dentro de um `useState` de componente cliente — que roda no SSR, renderiza o
  default e provoca mismatch de hidratação + "pisca". Verificado ao vivo: fechei a sidebar
  (`sidebar_state=false`), naveguei por um link e ela continuou recolhida, **sem nenhum aviso de
  hidratação no console**.

- [x] **Nome longo é truncado com `...` e revelado no hover** — **PASS** (e2e `06`)
  Verificado com dado real: das 4 opções, 2 têm `scrollWidth > clientWidth` (truncam de fato) e **todas**
  carregam `title` com o texto completo. Visível no print: `desenvolvimento@comanda10…`. O trigger tem
  largura fixa, então um nome longo não estica mais a navbar.

- [x] **Tema light e dark** — **PASS** (e2e `01`/`05`/`12`/`13`/`17`)
  Painel admin, painel comum, seletores e a tabela de usuários renderizam corretamente nos dois temas —
  incluindo o `Table`, que precisa de atenção por não ser theme-aware por padrão: cabeçalho, linhas e
  toggles ficam legíveis no dark.

- [x] **Responsivo mobile** — **PASS** (e2e `15`/`16`/`17`/`18`)
  Em 390×844 os dois selects colapsam num único `DropdownMenu` ("Ambiente" + "Selecione o usuário"), sem
  overflow horizontal na navbar, em light e dark. A sidebar abre como overlay com a navegação do painel
  ativo.

- [ ] **Falha de API é comunicada ao usuário** — **FALHOU** (e2e — defeito D3)
  Um 403 na listagem é renderizado como "Nenhuma entidade cadastrada." e um 403 no submit do formulário
  não produz toast, mensagem nem estado de erro — o usuário conclui que não há dados / que salvou. Erro
  de API tem de virar copy traduzida via `error.code`, nunca um estado vazio silencioso.

- [ ] **Console limpo em runtime** — **FALHOU** (e2e — defeito D4)
  Sem avisos de hidratação (o bug relatado), mas aparece
  `Select is changing from uncontrolled to controlled` em toda carga com impersonação ativa. Causa raiz
  no `report.md`.

## Cenários não cobertos nesta rodada

- [ ] **Login de usuário comum e comum tentando `/admin`** — **não coberto** (falta credencial)
  Só a credencial de admin foi fornecida. O redirecionamento comum→`/{locale}` está coberto por unit
  (`serverGuards.test.ts`), mas não foi percorrido no browser.

- [ ] **Duas abas com painéis diferentes** — **não coberto**
  O `useState` inicializador roda uma vez por mount; se outra aba trocar o painel, uma navegação
  client-side pode renderizar conteúdo do servidor com o alvo novo e store com o antigo. Apontado no
  review como risco conhecido.

- [ ] **Logout e novo login na mesma aba** — **não coberto** (e2e)
  `queryClient.clear()` no `signOut` está coberto por unit, mas a sequência completa na mesma aba não foi
  percorrida no browser.

- [ ] **Modo de produto (`subscription` × `simple`)** — **não aplicável**
  A feature não toca `getProductMode()`/`isSubscriptionMode()`.
