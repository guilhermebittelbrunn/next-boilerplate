# Relatório de QA: frescor e borda do sino de notificações

Branch `guilhermebittelbrunn/cycle-command-v6` (não protegida). Escopo: o diff de `apps/app` (três hooks, o
`NotificationsBell` e o teste de hook). Não há mudança em SDK, API, i18n ou design system.

Resultado: todos os critérios aprovados. Nenhum defeito de produção. Nenhum teste novo foi criado (razão em
"Decisões de custo de teste").

## Cobertura automatizada

| Comando | Resultado |
|---|---|
| `pnpm --filter app test` | 115 arquivos, 968 testes, todos passando (28 s) |
| `pnpm --filter app typecheck` | exit 0 |
| `pnpm test` (raiz, `turbo test test:emulator`, com `JAVA_HOME` no JDK 21) | 15 tasks com sucesso, 13 vindas do cache; exit 0 |

Contagem por workspace no `pnpm test` da raiz: `app` 968, `api` 1455, `api:test:emulator` 207, `web` 169,
`@repo/email` 205, `@repo/design-system` 171, `@repo/auth` 132, `@repo/internationalization` 67,
`@repo/shared` 56, `@repo/security` 45, `@repo/analytics` 34, `@repo/next-config` 32, `@repo/payments` 22,
`@repo/sdk` 11, `e2e` 2 arquivos. Sem `--force`: só a `app` mudou, e o cache dela saiu como `miss`, como
esperado.

`pnpm check` não foi rodado de novo: o `/review` mediu exit 0 e esta etapa não editou nenhum arquivo de
código. A paridade de i18n não se aplica (nenhuma chave nova); a suíte de `@repo/internationalization` passou
dentro do `pnpm test` da raiz.

Os 10 testes de hook do `/develop` em `apps/app/__tests__/useNotifications.test.tsx` cobrem T1 a T7 do plano
e os três escritores da lista que o desvio protege (marcar como lida, marcar todas, carregar mais).

## Decisões de custo de teste

- `useUnreadNotificationsCount.ts`, `useListNotifications.ts`, `useNotificationActions.ts`: nenhum teste novo.
  O objeto é a lógica de cache do React Query, e o teste de hook com `QueryClient` próprio já prova cada
  caminho, incluindo os três escritores. A passada no browser confirmou os mesmos caminhos no app.
- `NotificationsBell.tsx` (`collisionPadding`): nenhum teste novo. Jsdom não tem layout, e um teste que lê a
  prop só detectaria mudança. A prova é a medição de `getBoundingClientRect` abaixo.
- Nenhum teste da faixa cara. Nada no diff toca consulta, índice ou regra do Firestore.

## Verificar no `/test` (lista do `review.md`)

| Item | Veredito | O que foi medido |
|---|---|---|
| F1, a lista acompanha o badge | confirmado | Lista lida às 16:00:43 com badge 14. Notificação nova gravada. Navegação às 16:01:04 fez `GET /notifications/unread-count` e o badge foi a 15. Reabertura às 16:01:07 (24 s depois da leitura da lista, dentro dos 60 s): 1 `GET /notifications?limit=10` às 16:01:07 e a notificação das 16:00 no topo |
| F2 e F3, sem leitura a mais | confirmado | F2: três aberturas (15:57:51, 15:57:58, 15:58:12) e uma navegação às 15:58:09 que releu a contagem com o mesmo 13; 1 `GET /notifications` no total, o da primeira abertura. F3: marcar uma como lida baixou o badge de 15 para 14 na hora; a contagem relida às 16:01:50 confirmou 14; reabertura às 16:01:53 com 0 `GET /notifications` |
| O caso do desvio (prioridade) | confirmado nos dois escritores | Marcar como lida: popover aberto às 16:03:30 (lista lida), notificação gravada com o popover aberto, polling às 16:03:50 levou o badge de 14 a 16 sem mexer na lista aberta (topo continuou 16:02). Marcar a primeira como lida (badge 15), fechar e reabrir às 16:04:02, 32 s depois da leitura e 3 s depois da escrita: 1 `GET /notifications` às 16:04:02 e a notificação das 16:03 no topo. Carregar mais: lista lida às 16:10:29, notificação gravada, volta à aba às 16:10:36 levou o badge de 16 a 18 sem mexer na lista; "Carregar mais" às 16:10:50 (`GET ...&cursor=...`); fechar e reabrir: 2 `GET` às 16:11:03 (página 1 e página 2, como o R3 do plano prevê) e a notificação das 16:10 no topo |
| F4 a F6, badge na falha da contagem | confirmado | F4: com a contagem bloqueada, navegação às 16:12:00 gerou duas requisições abortadas (tentativa e `retry`); logo depois da navegação o badge ainda mostrava 18 e, 3 s depois, sumiu; `aria-label` "Notificações"; nenhum toast. F5: sem o bloqueio, navegação às 16:13:18; contagem respondeu 200 e o badge voltou com 17, o número do servidor (era 18 antes da falha, e uma foi marcada com a contagem em erro). F6: com a contagem em erro, marcar como lida (`POST /notifications/qa_bell_7/read` 200) deixou o badge ausente; com o `POST` bloqueado, apareceu o toast "Um erro inesperado aconteceu", o item voltou a não lido e o badge seguiu ausente |
| F6, observação sobre "marcar todas" | não reproduzido | Com a contagem em erro, as páginas carregadas tinham não lidas, então o botão estava habilitado (`disabled=false`). O arranjo "todas as carregadas já lidas" não foi montado; fica como leitura do `/review` |
| F7 e F8, popover | confirmado | Ver "Medidas do popover" |

## Medidas do popover

Medido com `getBoundingClientRect` do `[data-radix-popper-content-wrapper]` e `offsetWidth` do
`[data-slot=popover-content]` (o retângulo do conteúdo inclui o `scale` da animação de entrada), contra
`document.documentElement.clientWidth`.

| Arranjo | `innerWidth` / `clientWidth` | largura | esquerda | direita | folga à direita | rolagem horizontal |
|---|---|---|---|---|---|---|
| 375 px, scrollbar oculta, light, pt-br, `user@` | 375 / 375 | 351 | 12 | 363 | 12 | não (`scrollWidth` 375) |
| 375 px, scrollbar oculta, dark, pt-br, `user@` | 375 / 375 | 351 | 12 | 363 | 12 | não |
| 375 px, scrollbar oculta, dark, en, `user@` | 375 / 375 | 351 | 12 | 363 | 12 | não |
| 375 px, scrollbar oculta, light, es, `user@` | 375 / 375 | 351 | 12 | 363 | 12 | não |
| 375 px, scrollbar oculta, light, pt-br, `user2@` (vazio) | 375 / 375 | 351 | 12 | 363 | 12 | não |
| 375 px, scrollbar oculta, light, pt-br, `admin@` personificando `user@` | 375 / 375 | 351 | 12 | 363 | 12 | não |
| iPhone 15 emulado (scrollbar sobreposta real), light, pt-br | 393 / 393 | 369 | 12 | 381 | 12 | não |
| 375 px, scrollbar clássica (R1), light, pt-br | 375 / 360 | 351 | 12 | 363 | -3 em relação ao `clientWidth`, 12 em relação à janela | não (`scrollWidth` 360) |
| 1280 px, light, pt-br | 1280 / 1280 | 384 | 692 | 1076 | 204 | não |

- O R1 do plano se confirmou ao pixel: com scrollbar clássica o popover avança 3 px sobre a scrollbar de 15 px
  e fica a 12 px das duas bordas da janela. Não gera rolagem. Aceito como o plano previa; celulares usam
  scrollbar sobreposta.
- O `agent-browser` não tem dispositivo de 375 px (lista: iPhone 15/16/16 Pro/17, iPad, iPad Pro, Pixel 9,
  Galaxy S25), e `set viewport` desliga a emulação móvel. Por isso a scrollbar sobreposta a 375 px foi
  simulada com `html { scrollbar-width: none }` injetado na página; a emulação real de celular foi medida no
  iPhone 15 (393 px).
- Em 1280 px a borda direita do popover (1076) coincide com a do sino (1075,5), `data-side="bottom"`,
  `data-align="end"`: o padding não o deslocou.
- Dark: fundo `lab(2.75 0 0)` e título `lab(98.26 0 0)`, contraste alto. Rótulos lidos no popover: pt-br
  "Notificações | Marcar todas como lidas | Marcar como lida", en "Notifications | Mark all as read | Mark as
  read", es "Notificaciones | Marcar todas como leídas | Marcar como leída". Rótulo do sino: "Notificações (não
  lidas: 16)", "Notifications (unread: 16)", "Notificaciones (sin leer: 16)". Vazio: "Nenhuma notificação |
  Avisos sobre a sua conta aparecem aqui." Impersonação: "Somente leitura enquanto você atua como este
  usuário.", com "Marcar todas como lidas" e "Marcar como lida" desabilitados.

## Critérios de aceite

| # | Critério | Status | Meio |
|---|---|---|---|
| 1 | A lista mostra a notificação que o badge já contou | PASS | hook (T3, T5 e os três escritores) e e2e (F1, desvio com marcar como lida e com carregar mais, lista parada com o popover aberto) |
| 2 | Sem notificação nova, abrir o popover não lê mais do que antes | PASS | hook (T4) e e2e (F2, F3) |
| 3 | Sem badge depois de uma falha da contagem | PASS | hook (T1, T2) e e2e (F4, F5) |
| 4 | Marcar como lida com a contagem em erro não ressuscita o número antigo | PASS | hook (T6, T7) e e2e (F6 com sucesso e com recusa). "Marcar todas" com a contagem em erro só pelo hook (T7) |
| 5 | Popover afastado das bordas no celular | PASS | e2e (tabela acima) |
| 6 | Nada mais muda | PASS | e2e (polling de 120 s: 15:54:51 e 15:56:51; releitura ao navegar com a contagem velha; releitura ao voltar à aba), teste do sino (`99+`), `pnpm --filter app test` e `pnpm test` da raiz |

## Achados novos

Nenhum é defeito de produção. Os três primeiros são do ambiente de teste e mudam como o próximo `/test` deve
repetir os fluxos.

- **O glob do plano não casa.** `network route "**/notifications/unread-count" --abort` não interceptou nada
  neste `agent-browser`: um `fetch` e um XHR de sonda passaram e voltaram 401. A URL exata
  (`http://localhost:3002/notifications/unread-count`) funcionou. O primeiro F4 falhou por isso e foi refeito.
- **A página headless se declara oculta.** `document.visibilityState` ficou `hidden` depois de alguns minutos e
  depois de cada carga. Com isso o polling da contagem parou (o React Query só faz polling com a aba visível),
  a animação de saída do Radix congelou (o conteúdo fechado fica no DOM com `data-state="closed"`, e a lista
  continua montada entre fechar e reabrir) e o `click` do `agent-browser` demorou cerca de 5 s para chegar à
  página. Medido dentro da página, a abertura dispara o `GET /notifications` em 19 ms. Para os fluxos que
  dependem de foco, a página recebeu `visibilityState = "visible"` e um evento `visibilitychange`, o que
  equivale a voltar para a aba.
- **A porta 3000 estava ocupada por outro projeto do usuário** (um `electron-forge` de outro workspace). Não
  foi tocada; o app subiu em 3010 e a API aceitou essa origem pelo `CORS_ORIGIN`.
- **A releitura extra depois de uma falha da contagem (🟢 do review) acontece.** Contagem em erro com 17 no
  cache, uma marcada como lida, contagem recuperada às 16:16:50 com 16: a lista ficou marcada como velha e a
  reabertura fez 1 `GET /notifications` às 16:17:01. É o custo que o review aceitou.
- O console de dev registrou um aviso de hidratação ("A tree hydrated but some attributes of the server
  rendered HTML didn't match"). Apareceu numa sessão com emulação de iPhone e tema trocado por `localStorage`;
  o diff não muda markup renderizado no servidor (o conteúdo do popover só existe aberto). Não investigado.

## Lacunas herdadas

| Lacuna | Veredito |
|---|---|
| R2: contagem travada em 100 não marca a lista | fora de escopo, aceita no plano |
| R4: corrida entre o `queryFn` da contagem e uma mutação | continua aberta, sem medição; janela de milissegundos |
| `list.refetch()` limpa a marca | não é lacuna |
| T5 acoplado ao `staleTime` de 60 s por cópia | continua aberta. Fechar exige exportar `STALE_TIME_MS` do `QueryProvider.tsx`, que é código de produção |
| Corrida do `fetchNextPage` com a resposta da contagem | continua aberta, não medida. A passada mediu o caso sem corrida (contagem antes do clique) |
| Releitura extra depois de marcar como lida com a contagem em erro | fechada como medição: confirmada, 1 leitura a mais, aceita |
| `collisionPadding` sem teste | fechada pela medição no browser |
| `canMarkAll` com a contagem em erro | continua aberta como observação; arranjo não montado |

## Ambiente do e2e

- Emuladores: `pnpm emulators` (Auth, Firestore, Storage, projeto `demo-next-boilerplate`) com `JAVA_HOME` no
  `openjdk@21`; seed com `node scripts/seed-emulator.mjs`.
- `apps/api` em `next dev -p 3002` e `apps/app` em `next dev -p 3010`, com o ambiente montado pelo
  `buildStackEnv` da `apps/e2e` (emuladores, chaves do Firebase Admin vazias, `CORS_ORIGIN` com a origem
  3010), carregado no processo sem editar `.env`. Os `.env` locais são da era Clerk e não foram usados.
- Log da API com horário em `/tmp`, para contar as chamadas. Contas do seed: `user@example.com`,
  `user2@example.com`, `admin@example.com`; a senha está no `docs/SETUP.md`.
- Nada do usuário foi reutilizado. No fim: `agent-browser close`, `kill` nos PIDs da API e do app, `SIGINT` no
  processo do Firebase. As portas 3002, 3010, 4001, 4400, 4500, 8080, 9099, 9150 e 9199 ficaram vazias. O
  `pnpm test` da raiz subiu e derrubou os próprios emuladores e as portas seguiram vazias. Os scripts
  auxiliares ficaram em `/tmp`, fora do repo, e foram apagados.
- Screenshots em `test/e2e/` (descartados pelo `.gitignore`): `01` desktop aberto, `02` F1, `03` desvio,
  `04` F4, `05` e `06` F6, `07` 1280 px, `08` a `15` 375 px nos arranjos da tabela. O texto acima é a prova.

## Dados de QA e estado de dev

Tudo viveu no emulador e sumiu com ele. Nenhuma conta foi criada e nada foi gravado no projeto Firebase real,
então o `docs/PRE-PRODUCTION.md` não muda.

- Sete notificações `subscriptionCanceled` para `user@example.com`, ids `qa_bell_1` a `qa_bell_7`, gravadas pela
  API REST do emulador.
- Marcadas como lidas durante os fluxos: `qa_bell_2`, `qa_bell_3`, `qa_bell_6`, `qa_bell_7`.

No working tree, esta etapa só criou `test/criterios-aceite.md`, `test/report.md` e os prints de `test/e2e/`,
e atualizou o `STATE.md`. O `report.md` foi gravado por heredoc porque a ferramenta `Write` recusou o arquivo.
Nenhuma senha, token ou e-mail real está neste arquivo.
