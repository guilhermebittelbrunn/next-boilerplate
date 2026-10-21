# Revisão: frescor e borda do sino de notificações

Escopo: só o working tree (`git diff` mais os arquivos não rastreados), em cima dos seis commits da PR #53 que já
foram revisados. São dois assuntos: o código da feature em `apps/app` e a auditoria incremental do `specs/BACKLOG.md`.
Revisão por leitura e gates estáticos. Não subi app, não abri browser e não rodei a suíte.

## Branch

- Nome: `guilhermebittelbrunn/cycle-command-v6`, reutilizada. Rastreia `origin/guilhermebittelbrunn/cycle-command-v6`
  e tem seis commits sobre `main` (`250bc47` a `6048311`), já pushados na PR #53.
- Regex do padrão `<project>/<type>/<title>`: **reprovada** (`BRANCH INVALIDA: guilhermebittelbrunn/cycle-command-v6`).
- O que foi feito: nada. A branch já tem remoto e commits de outra tarefa, e o usuário pediu este `/cycle` nesta mesma
  branch. Não criei nem renomeei branch. O caso está registrado como E11 em `specs/BACKLOG.md` e não é reapresentado
  como bloqueio.

## Revisão: `apps/app` (sino de notificações) e `specs/BACKLOG.md`

Nada bloqueante. Nenhuma correção aplicada: os achados abaixo são riscos residuais pequenos, documentados, e nenhum
justifica mexer no desenho.

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `apps/app/shared/hooks/useListNotifications.ts:60-67`: corrida no `fetchNextPage` embrulhado. O wrapper lê a marca
  antes do `await` e só a devolve se ela já existia. Se a resposta da contagem que muda o número chegar enquanto a
  página seguinte está em voo, a marca é posta durante o pedido, o `setData` da página a apaga (`successState`, abaixo)
  e o wrapper não a recoloca, porque `listWasStale` era `false`. Efeito: a reabertura dentro de 60 s mostra a lista sem
  a novidade, que é o comportamento de antes da tarefa. A janela é a duração de um `GET /notifications` e só abre com o
  popover aberto, num polling de 120 s ou numa navegação. Aceito sem correção. Se um dia valer fechar, o caminho é o
  `markNotificationsListStale` reaplicar a marca quando a query da lista estiver em `fetching`, esperando o
  `query.promise` dela.
- `apps/app/shared/hooks/useListNotifications.ts:15-19`: a disciplina "quem escreve na lista devolve a marca" vale só
  enquanto todo escritor passar por `writeList` ou pelo wrapper. Hoje são todos: `rg` encontra escrita em
  `queryKeys.notifications.list()` só em `useNotificationActions.ts:63` (dentro de `writeList`) e nos testes. Uma
  mutação nova na lista (apagar notificação, por exemplo) que use `setQueryData` direto perde a marca sem aviso. O
  JSDoc dos helpers diz isso, e é o único lugar onde a regra está escrita.
- `apps/app/shared/hooks/useUnreadNotificationsCount.ts:30-38` com `useNotificationActions.ts:126`: com a contagem em
  erro, "marcar como lida" não desconta o número guardado (correto, é o item 2b). Quando a contagem volta a responder,
  `known` ainda é o número de antes da falha, o servidor responde com o número já descontado e a lista é marcada como
  velha sem precisar. Custo: uma releitura a mais na próxima abertura, só depois de uma falha da contagem. Aceito.
- `apps/app/shared/components/notifications/NotificationsList.tsx:46`: `canMarkAll = unreadCount > 0 ||
  hasUnreadLoaded`. Com a contagem em erro, `unreadCount` agora é 0, então "marcar todas" fica desabilitado quando as
  páginas carregadas estão todas lidas, mesmo que o servidor tenha não lidas além delas. Antes, o número velho
  habilitava o botão. Não mudei: com a contagem em erro o cliente não sabe se há não lidas, e o botão volta assim que a
  contagem responde. Vai para a lista do `/test` como observação.
- `apps/app/__tests__/useNotifications.test.tsx:62-63`: `LIST_STALE_MS` copia o `STALE_TIME_MS` do `QueryProvider.tsx:6`,
  que não é exportado. Se o `staleTime` global mudar, o teste "reabrir sem contagem nova não relê" continua passando com
  o valor antigo. O handoff já registra. Fica aberta.

### ✅ OK

- **Leitura do desvio, conferida na fonte** de `@tanstack/query-core@5.90.20`
  (`node_modules/.pnpm/@tanstack+query-core@5.90.20/node_modules/@tanstack/query-core/build/modern/query.js`):
  - `setData` despacha `success` (`:60-69`), e `successState` grava `isInvalidated: false` (`:402-408`). O
    `setQueryData` passa por ali, e o fim de qualquer fetch também (`:280`, `this.setData(data)`), inclusive o de
    `fetchNextPage`. O handoff está certo: toda escrita bem-sucedida apaga a marca.
  - O `fetchNextPage` do observer não lança (`queryObserver.js:183-185`, `promise.catch(noop)` sem `throwOnError`).
    Numa página que falha, o reducer de `error` grava `isInvalidated: true` (`query.js:355-369`), então o wrapper
    recolocar a marca depois de uma falha é inofensivo.
  - Cancelamento com `revert` (`:247-253`) devolve o estado do início do fetch. Em `useNotificationActions.ts:72-91`, o
    `cancelQueries` roda antes de `writeList` ler a marca, então uma releitura da lista cancelada por um "marcar como
    lida" volta com a marca e a escrita a preserva.
  - `invalidateQueries` com `refetchType: "none"` não dispara leitura, e `refetchOnWindowFocus: false` é global
    (`QueryProvider.tsx:23`). Com o popover aberto e a lista marcada, nada relê até a próxima abertura, como diz o JSDoc
    de `useListNotifications.ts:15-19`.
  - A reabertura relê: o Radix desmonta o conteúdo fechado, o observer novo passa por `shouldFetchOnMount`
    (`queryObserver.js:447-455`) e `isStaleByTime` devolve `true` para query invalidada (`query.js:120-122`).
- **Caminho mais simples, avaliado e descartado.** Guardar a marca fora do estado da query (um flag por `QueryClient`
  lido num `refetchOnMount` em função) tira a disciplina dos escritores e fecha a corrida do `fetchNextPage`, mas traz
  estado de módulo, o GC de 5 min para quem o guardar no cache e a reescrita de seis testes. Apagar a lista
  (`removeQueries`) quando a contagem muda só funciona com o popover fechado e troca a lista velha por skeleton. Nenhuma
  das duas é claramente melhor que o desenho atual, que está correto por leitura e coberto por teste em todos os
  escritores de hoje. Mantido.
- **Decisão em aberto do handoff (onde moram os helpers): ficam em `useListNotifications.ts`.** Os dois operam sobre a
  chave e o estado da query que esse arquivo define, ao lado do par `useListNotifications`/`fetchNotificationsList`.
  `shared/lib` guarda módulos sem lógica de `QueryClient` (`client`, `queryKeys`, `pagination`), e mover não mudaria
  comportamento.
- **Itens 2a e 2b.** `useUnreadNotificationsCount.ts:63` devolve 0 com `isError`, que segue `true` enquanto a releitura
  depois do erro está em voo (com dado no cache, o `fetchState` não volta a `pending`, `query.js:391-401`). O
  `aria-label` cai no texto sem número quando `count` é 0 (`NotificationsBell.tsx:31-37`). `snapshotCache` lê o status
  depois do `cancelQueries` (`useNotificationActions.ts:78-80`), e as duas escritas na contagem (`:126`, `:157`) e o
  rollback (`:101`) dependem de `previousCount`. Com a contagem em `success`, o comportamento é o de antes.
- **Item 1.** A comparação fica dentro do `queryFn` (`useUnreadNotificationsCount.ts:29-40`), onde as escritas
  otimistas não chegam. Depois do `resetQueries` da impersonação, `known` é `undefined` e nada é marcado.
- **Item 3.** `collisionPadding={POPOVER_EDGE_GAP_PX}` (12) em `NotificationsBell.tsx:66`, com o `PopoverContent`
  repassando as props ao Radix (`packages/design-system/components/ui/popover.tsx:19-35`). `align="end"` e a largura não
  mudaram.
- **Regra de ouro 8.** `useListNotifications` e `fetchNotificationsList` seguem no mesmo arquivo, sem mudança na função
  imperativa. Não há toggle de `enabled` aqui. As ações seguem otimistas via `setQueryData`; o único
  `invalidateQueries` novo usa `refetchType: "none"` e só devolve uma marca que já existia, sem leitura.
- **Comentários.** Três, todos sobre comportamento da biblioteca que o código não mostra (`useListNotifications.ts:15-19`,
  `useNotificationActions.ts:76-77`, `useUnreadNotificationsCount.ts:34-35`). Nenhum cita plano, etapa ou artefato do
  fluxo. Os dois JSDoc novos no teste explicam constante e helper.
- **Contrato.** Nenhum DTO, action, rota, `error.code` ou chave de i18n mudou. Paridade de i18n não se aplica.
- **`specs/BACKLOG.md`.** A passada incremental é coerente com o estado da branch: `origin/main` em `3a118c6`, PR #53
  aberta, 0 transições, placar 0 fechados, 2 corrigidos aguardando merge, 2 novos, 1 ampliado, 138 abertos. As âncoras
  novas (`#a-próxima-tarefa-direta-no-sino-de-notificações`, `#pr-aberta-não-mergeada-53`,
  `#-achados-da-pr-53-2026-10-20-aberta`) batem com os cabeçalhos, e nada aponta mais para a âncora antiga da borda da
  API. A recomendação do backlog fala em reler "uma página"; o `/analyze` escolheu invalidar, o que relê as páginas
  carregadas (R3 do plano). É texto de recomendação anterior ao plano e não precisa de ajuste.
- **Segredo.** Varri `docs/features/notifications-bell-freshness/` e o diff do backlog: só aparecem as contas fictícias
  do seed (`user@example.com`, `user2@example.com`, `admin@example.com`) e a frase de que a senha fica no `SETUP.md`.
  Nenhuma senha, token ou e-mail real.

### 👁 Verificar no `/test`

A lista "A verificar no `/test`" do handoff, item a item, com o veredito desta revisão. Nenhum foi medido aqui.

- **F1, a lista acompanha o badge.** A leitura confirma o mecanismo (`useUnreadNotificationsCount.ts:36-38` marca,
  a reabertura relê). Falta medir. Repro: plano §8, F1. Esperado: badge 14 e 1 `GET /notifications` no log da API na
  reabertura, com a nova no topo.
- **F2 e F3, sem leitura a mais.** A leitura confirma: resposta igual ao cache não marca, e o otimista mantém os dois em
  acordo. Falta medir. Repro: plano §8, F2 e F3. Esperado: 0 `GET /notifications` depois da primeira abertura.
- **O caso do desvio.** A leitura da fonte confirma que a marca some sem o wrapper e volta com ele; os testes de hook
  cobrem os três escritores. Falta medir no app. Repro: `user@`, abrir o popover, gravar uma notificação nova (plano §8),
  esperar a contagem mudar com o popover aberto (polling de 120 s ou navegação depois de 30 s), marcar uma como lida ou
  clicar em "carregar mais", fechar e reabrir antes de 60 s. Esperado: 1 `GET /notifications` na reabertura e a nova
  no topo. Esta é a afirmação que sustenta o corte do item 1; priorize.
- **F4 a F6, badge na falha da contagem.** A leitura confirma `count` 0 com `isError`, o `aria-label` sem número e a
  ausência de toast (o hook não chama `errorAlert`). Falta medir. Repro: plano §8, `network route
  "**/notifications/unread-count" --abort`. Esperado: badge some depois da segunda falha, volta com o número do servidor
  depois do `unroute`, e "marcar como lida" com a contagem em erro não o traz de volta.
- **F6, observação nova.** No mesmo arranjo do F6, com todas as notificações carregadas já lidas, anotar se "marcar
  todas" fica desabilitado (`NotificationsList.tsx:46`). Esperado por leitura: desabilitado até a contagem responder.
  Registrar, não é critério de falha.
- **F7 e F8, popover.** Não se confirma lendo código: jsdom não tem layout. Repro: plano §8, F7 e F8, medindo
  `getBoundingClientRect()` de `[data-slot=popover-content]` contra `document.documentElement.clientWidth`. Esperado: 12
  px de cada lado a 375 px com scrollbar sobreposta, sem rolagem horizontal; registrar os números do modo de scrollbar
  clássica (R1); em 1280 px, alinhado à direita do sino como antes.

## Correções aplicadas

Nenhuma. Nada no diff pedia correção clara, e a alternativa de desenho avaliada acima não é melhor o bastante para
trocar código já testado.

## Raio de impacto

- `useListNotifications.ts` exporta `isNotificationsListStale` e `markNotificationsListStale`. Consumidores:
  `useUnreadNotificationsCount.ts:6` e `useNotificationActions.ts:15-18`.
- O `fetchNextPage` devolvido pelo hook virou função própria, sem argumentos e nova a cada render. Único consumidor:
  `NotificationsList.tsx:115`, que chama sem argumento num `onClick` inline e ignora o retorno.
- `useUnreadNotificationsCount` devolve 0 com a contagem em erro. Consumidores: `NotificationsBell.tsx:29` (badge e
  `aria-label`) e, pela prop `unreadCount`, `NotificationsList.tsx:46` (`canMarkAll`).
- `notificationsBell.test.tsx:23-36` mocka os três hooks e não enxerga a mudança.
- Nada em `packages/*`, `apps/api` ou `apps/web`.

## Lacunas de teste

Veredito para as que o handoff listou, mais as novas:

| lacuna | veredito |
|---|---|
| R2 do plano: contagem travada em 100 não marca a lista | fora de escopo, aceita no plano |
| R4 do plano: corrida entre o `queryFn` da contagem e uma mutação | continua aberta, aceita no plano, sem medição |
| `list.refetch()` limpa a marca | não é lacuna: a releitura deixa a lista em dia |
| T5 acoplado ao `staleTime` de 60 s por cópia | continua aberta (🟢 acima) |
| Corrida do `fetchNextPage` com a resposta da contagem | nova, aberta e aceita (🟢 acima). Teste de hook exigiria controlar a ordem de duas promessas; não vale o custo |
| Releitura extra depois de "marcar como lida" com a contagem em erro | nova, aberta e aceita (🟢 acima) |
| `collisionPadding` sem teste | não é lacuna de unidade: só o `/test` mede layout |

## Decisões em aberto

Nenhuma para o usuário. As duas que o fluxo trouxe foram decididas aqui:

- Onde moram os helpers: ficam em `useListNotifications.ts` (razão em ✅).
- Trocar o desenho do desvio: não (razão em ✅).

## Gates estáticos

| Gate | Comando | Resultado |
|---|---|---|
| Lint/format | `pnpm check` | exit 0, `Checked 965 files`, sem correção aplicada |
| Typecheck | `pnpm --filter app typecheck` | exit 0 |
| Paridade de i18n | não se aplica | nenhuma chave nova |
| Vitest | não rodei | nenhum arquivo editado nesta revisão; o handoff registra `32 passed (32)` nos dois arquivos de notificação e `968 passed` na `app` |

Sem `--force`.

## Plano de commits

Em cima dos seis commits da PR #53, na mesma branch, por pedido do usuário. Antes do primeiro, `git diff --cached
--stat` tem de sair vazio. Depois de cada um, conferir `git show --stat --oneline HEAD` contra a lista.

1. `fix(app): keep the notifications list and badge in step with the server`
   - `apps/app/shared/hooks/useListNotifications.ts`
   - `apps/app/shared/hooks/useUnreadNotificationsCount.ts`
   - `apps/app/shared/hooks/useNotificationActions.ts`
   - `apps/app/__tests__/useNotifications.test.tsx`

   Corpo: a lista passa a ser relida na abertura seguinte quando o servidor muda a contagem, e o badge some com a
   contagem em erro. Os dois assuntos dividem os mesmos três arquivos, então separar exigiria `git add -p`.
2. `fix(app): keep the notifications popover off the screen edges`
   - `apps/app/shared/components/notifications/NotificationsBell.tsx`
3. `docs(specs): sync the backlog with PR #53 open and recommend the bell task`
   - `specs/BACKLOG.md`
4. `docs(features): notifications-bell-freshness`
   - `docs/features/notifications-bell-freshness/STATE.md`
   - `docs/features/notifications-bell-freshness/analyze/plan.md`
   - `docs/features/notifications-bell-freshness/develop/handoff.md`
   - `docs/features/notifications-bell-freshness/review/review.md`

Título de PR, se esta tarefa sair em PR própria: `fix(app): keep the notifications bell fresh and off the screen
edges`. Como entra na PR #53, o título dela pode precisar mencionar as duas tarefas; decisão do usuário no push.

Commits realizados: _(preenchido pelo orquestrador)_
