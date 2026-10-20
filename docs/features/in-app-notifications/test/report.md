# Relatório do `/test`: central de notificações no app

Rodada autônoma do `/cycle`, 2026-10-20, no workspace `addis-ababa`, branch
`guilhermebittelbrunn/tarefa-demorada-valor` (não protegida, nada commitado; a branch da feature,
`feat/in-app-notifications`, nasce na hora dos commits). O QA rodou a suíte inteira, mediu a API com `curl`
contra os emuladores do Firebase e fez uma passada com `agent-browser` no painel comum, no admin e sob
impersonação. Não alterou código de produção. Editou dois arquivos de teste.

Resultado: 20 critérios, 17 aprovados, nenhum reprovado e 3 não verificados por dependerem do projeto real
ou da Stripe. Os 13 itens da lista "Verificar no `/test`" foram medidos: 11 confirmados e 2 não verificáveis
sem infra. Nenhum defeito bloqueante; quatro observações menores em "Achados".

## Gate do `review`

O `STATE.md` está com `review = in-progress` e `git log origin/main..HEAD` sai vazio. O `/review` montou o
plano de 16 commits e espera a aprovação do usuário, que no `/cycle` fica para o fim. O gate espera o commit;
nenhuma etapa foi pulada.

## Cobertura

Comandos rodados no workspace, com cache do turbo e sem `--force`. O `java` do `PATH` é o 17, então o
`JAVA_HOME` apontou para o `openjdk@21` do Homebrew antes de `pnpm test`.

| Comando | Resultado |
|---|---|
| `pnpm test` (raiz: `turbo test test:emulator`), última rodada | 15 de 15 tarefas, 13 do cache, 36 s |
| `api:test` | 112 arquivos, 1438 testes (eram 1436; +2 casos novos em `notificationsRoute.test.ts`) |
| `api:test:emulator` | 5 arquivos, 207 testes |
| `app:test` | 115 arquivos, 958 testes (eram 957; +1 em `useNotifications.test.tsx`) |
| `@repo/internationalization:test` (paridade pt-br/en/es + `apiErrors`) | 7 arquivos, 67 testes |
| `@repo/sdk:test` | 3 arquivos, 11 testes |
| `@repo/shared:test` | 5 arquivos, 56 testes |
| `web:test` · `@repo/auth` · `@repo/design-system` · `@repo/email` · `@repo/payments` · `@repo/security` · `@repo/analytics` · `@repo/next-config` · `e2e:test` | 169 · 132 · 171 · 205 · 22 · 45 · 34 · 32 · 16, todos passando |
| `pnpm turbo run typecheck --filter=app --filter=api` | 2 de 2 |
| `pnpm check` | 965 arquivos, sem erro |

### Testes criados ou editados

| Arquivo | Mudança | Por quê |
|---|---|---|
| `apps/api/__tests__/notificationsRoute.test.ts` | o `it.each` de id inválido passou a conferir `error.code` `NOTIFICATION_NOT_FOUND` e que `markRead` não roda, e ganhou os casos `.` e id acima de 1500 caracteres (constante `FIRESTORE_DOCUMENT_ID_MAX_LENGTH`) | fecha a lacuna "`[id]/read` com id inválido". O teste já existia antes da revisão (com `a/b`, `__reserved__` e `..`, conferindo só o 404 e que `findById` não roda); o `review.md` não o viu e listou a lacuna como aberta |
| `apps/app/__tests__/useNotifications.test.tsx` | caso "devolve zero sem avisar quando a contagem falha" | nenhum teste provava que o erro do contador não gera toast |

Nenhum teste da faixa cara. Nada foi afrouxado nem desativado.

## Decisões de custo de teste

| Módulo tocado | Decisão |
|---|---|
| rotas `notifications/*` | `notificationsRoute.test.ts` cobre lista, cursor, 503 de índice, contagem, marcar uma (404 inexistente, 404 de outro dono, idempotência, id inválido) e marcar todas, com repositório e guard mockados. `notificationsRouteImpersonation.test.ts` usa o guard real para o 403. Bastou endurecer um caso |
| `notification.repository.ts` | `notificationRepository.test.ts` contra um Firestore falso cobre `readAt: null`, `count` com `limit`, ALREADY_EXISTS e os lotes do "marcar todas". O comportamento real (contagem 13 do seed, três páginas sem repetir, 105 marcadas num pedido) foi medido contra o emulador nesta passada; um teste permanente no emulador repetiria isso sem provar regra de segurança nem índice, então não entrou |
| boas-vindas (`user-merge.ts`) | `welcomeNotification.test.ts`, `signUpProfile.test.ts` e `googleSignInProfile.test.ts` já provam a emissão, a chave, o admin sem aviso e a falha silenciosa. O primeiro login com Google foi medido ponta a ponta com o emulador de Auth (abaixo); sem teste novo |
| webhook (`subscription-notifications.ts`) | `subscriptionNotifications.test.ts` e `paymentsWebhookRoute.test.ts` cobrem a tabela de transições, `skipped` e a falha silenciosa. O evento real fica 🔒 |
| exportação e expurgo | `accountExportRoute.test.ts` e `accountErasure.test.ts` cobrem o bloco e a ordem dos passos; medidos de novo no emulador |
| hooks e componentes do sino | `useNotifications.test.tsx`, `notificationsBell.test.tsx` e `notificationCopy.test.ts`. O relógio do polling e a visibilidade da aba foram medidos no navegador; um teste com timers falsos testaria o `focusManager` do TanStack Query, não este código |
| `firestore.indexes.json` | `firestoreIndexes.test.ts` confere as duas entradas; publicar é infra |

## Verificar no `/test`

| # | Item do `review.md` | Veredito | O que foi medido |
|---|---|---|---|
| 1 | Boas-vindas no primeiro login com Google | confirmado | `POST /auth/sign-in/google` com um token de IdP aceito pelo emulador de Auth: 200, perfil `common` criado; `unread-count` → `{"count":1}`; lista com um item `welcome_<id do perfil>`, `readAt: null`, `expiresAt` 2027-01-18 para `createdAt` 2026-10-20 (90 dias). Segundo login com a mesma conta: 200 e contagem ainda 1 |
| 2 | Polling só com a aba visível | confirmado | Log da API com horário: com a aba visível, chamadas a `unread-count` às 00:59:24 e 01:01:24 (120 s). Aba escondida das 01:01:37 às 01:04:03 (146 s, eventos `visibilitychange` reais gravados na página): nenhuma chamada, a das 01:03:24 não saiu. Ao voltar: uma chamada às 01:04:03 |
| 3 | Contagem ao navegar | confirmado | Navegação 36 s depois da última leitura: 1 chamada. Duas navegações 8 s depois dessa: 0 chamadas. Nova navegação 36 s depois: 1 chamada |
| 4 | Lista desatualizada ao reabrir | medido (comportamento aceito no plano) | Lista lida às 00:59:13; notificação nova gravada às 00:59:18; badge subiu de 11 para 12 na navegação das 00:59:24. Reaberto às 00:59:29 (16 s depois da leitura): 10 itens, o primeiro ainda "Pagamento pendente", a nova ausente e nenhuma chamada à lista. Reaberto às 01:00:19 (66 s): nova chamada e "Assinatura cancelada" no topo. Janela medida: até 60 s com badge e lista divergentes |
| 5 | Badge e rótulo acessível | confirmado | user2 com 0: sem badge, rótulo "Notificações". user@: badge "13", rótulo "Notificações (não lidas: 13)"; en "Notifications (unread: 12)"; es "Notificaciones (sin leer: 12)". user2 com 105 não lidas: API devolve `{"count":100}`, badge "99+", rótulo "Notificações (não lidas: 99+)" |
| 6 | Popover em 375 px, light e dark | confirmado | Viewport 375: popover com 351 px (`left` 0, `right` 351), `scrollWidth` do documento 360 (sem rolagem horizontal). Lista com altura visível de 448 px e rolagem própria: 1170 px com 10 itens, 2292 com 20, 2918 com 26; rolar até o fim alcança o último item. Light: fundo `lab(100)`, título `lab(2.75)`, descrição `lab(46.6)`. Dark: fundo `lab(2.75)`, título `lab(98.3)`, descrição `lab(66.1)` |
| 7 | Destino e marcação; impersonação | confirmado | user@: link "Pagamento pendente" com `href` `/pt-br/account?tab=billing`; clicar navegou para a aba "Cobrança", `POST .../read` 200, badge 13 → 12, popover fechado. Admin personificando user@: "Marcar todas" e os 4 botões de item desabilitados, linha "Somente leitura enquanto você atua como este usuário."; clicar em "Assinatura cancelada" navegou para `/pt-br/account?tab=billing` com 0 `POST` e badge em 12 |
| 8 | "Carregar mais" até o fim | confirmado | Três pedidos (`limit=10`, depois com cursor duas vezes): 10, 20 e 25 itens; 25 `createdAt` distintos em ordem decrescente; 13 marcadores de não lida, igual à contagem; botão ausente na última página |
| 9 | Erros da lista e do "marcar todas" | confirmado, com outro instrumento | Em vez de derrubar o emulador, o QA reescreveu na página a URL do pedido para provocar uma recusa real da API. Lista: `GET /notifications?cursor=forced` → 400, popover com "A navegação expirou. Recarregue a lista. (Código do erro: <uuid>)" e "Tentar de novo"; desfeita a reescrita, "Tentar de novo" carregou 10 itens. "Marcar todas": pedido levado a uma rota que responde `404 NOTIFICATION_NOT_FOUND`; toast "Notificação não encontrada. (Código do erro: <uuid>)", badge de volta a 12 e 4 marcadores restaurados |
| 10 | `legacyTypeRemoved` com o texto genérico | confirmado | Item do seed exibido como "Nova notificação" / "Há uma atualização na sua conta." (en "New notification" / "There is an update on your account."; es "Nueva notificación" / "Hay una novedad en tu cuenta."), sem link |
| 11 | `%2F` no `[id]/read` | confirmado | `POST /notifications/a%2Fb/read` → 404 `{"error":{"code":"NOTIFICATION_NOT_FOUND"}}`; `__x__` → o mesmo. Agora também no teste de rota |
| 12 | 503 com índice faltando no projeto real | 🔒 não verificável | O emulador não cobra índice. Coberto por `notificationsRoute.test.ts` com erro `code: 9` |
| 13 | Webhook com evento real da Stripe | 🔒 não verificável | A API subiu sem chaves da Stripe. Coberto por `paymentsWebhookRoute.test.ts` e `subscriptionNotifications.test.ts` |

## Critérios de aceite

| # | Critério | Status | Meio |
|---|---|---|---|
| 1 | Boas-vindas na conta nova | ✅ | e2e (cadastro pela tela: badge 1, "Boas-vindas"); API + emulador (Google); unit (falha silenciosa, admin sem aviso, chave) |
| 2 | Texto no idioma de quem lê | ✅ | e2e (mesma notificação em pt-br e en pelo seletor; en e es por URL); unit `notificationCopy.test.ts` |
| 3 | Badge e rótulo acessível | ✅ | e2e (0, 13, 12, 99+ nos rótulos dos 3 idiomas); componente |
| 4 | Atualização do contador | ✅ | e2e com log da API (itens 2 e 3) |
| 5 | Erro do contador | ✅ | hook (teste novo). A manutenção do último número depois de uma falha posterior foi lida no código, não medida |
| 6 | Lista paginada | ✅ | e2e (item 8); `curl` (cursor forjado → 400 `PAGINATION_CURSOR_INVALID`; três páginas 10/10/5); estado vazio com user2 |
| 7 | Lista ao reabrir o popover | ✅ | e2e (item 4) |
| 8 | Erro ao carregar a lista | ✅ | e2e (item 9) |
| 9 | Marcar uma como lida | ✅ | e2e (duplo clique → 1 `POST`, badge 12 → 11, mantido após recarregar); rota (já lida devolve o `readAt` original) |
| 10 | Marcar todas como lidas | ✅ | e2e (user2 com 105: 1 `POST read-all` 200, badge some, contagem 0 na API, botão desabilitado, mantido após recarregar; falha com rollback no item 9) |
| 11 | Destino da notificação | ✅ | e2e (item 7; `href` `/es/account?tab=billing` em es) |
| 12 | Ownership | ✅ | `curl` (user2 marcando a de user@ → 404 `NOTIFICATION_NOT_FOUND`; user2 com contagem 0 e lista vazia; sem token → 401 `AUTH_INVALID_TOKEN`); rota |
| 13 | Id inválido em `[id]/read` | ✅ | `curl` (item 11); rota (5 casos) |
| 14 | Impersonação somente leitura | ✅ | e2e (item 7); `curl` com o token do admin personificando user@: leitura 200 com contagem 13, `POST [id]/read` e `POST read-all` → 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY`, contagem do dono ainda 13 |
| 15 | Sino só no painel comum | ✅ | e2e (`/pt-br/admin` sem botão de notificações, nenhuma chamada a `/notifications/*` no log); `curl` (admin sem impersonação → 403 `COMMON_PANEL_FORBIDDEN`) |
| 16 | Avisos de mudança da assinatura | 🔒 | exige evento real da Stripe; coberto por unit e rota com mock |
| 17 | Exportação e expurgo | ✅ | `curl` (`GET /account/export` de user@: 26 itens, `truncated: false`); exclusão de uma conta de QA: log `erasure-step step=notifications status=done count=1`, entre `sessions` e `profile` |
| 18 | Índice composto ausente | 🔒 | exige o projeto real; coberto por rota |
| 19 | Retenção de 90 dias | 🔒 | `expiresAt` = `createdAt` + 90 dias medido; a TTL apagando o documento exige o projeto real com faturamento |
| 20 | Tema e responsivo | ✅ | e2e (item 6, desktop em dark) |

Total: 17 ✅, 0 ❌, 3 🔒.

## Evidências e2e

A pasta `test/e2e/` é descartada pelo `.gitignore`; as imagens serviram para o QA olhar durante a passada e
o texto acima é a prova. Lista para referência: `01-popover-dark-desktop.png`, `02-stale-list-reopen.png`,
`03-mobile-light.png`, `04-mobile-dark.png`, `05-mobile-dark-end-of-list.png`, `06-list-error.png`,
`07-mark-all-error.png`, `08-admin-no-bell.png`, `09-impersonation.png`, `10-user2-empty.png`,
`11-badge-99plus.png`. Nenhuma tem dado de pessoa real; aparecem só as contas `@example.com` do seed.

## Achados

Nenhum ❌. As observações abaixo são de baixa severidade e ficam para decisão do `/review`; as correções
sugeridas são hipóteses, não medidas.

| sev. | arquivo:linha | observação | sugestão |
|---|---|---|---|
| 🟢 | `apps/app/shared/components/notifications/NotificationsBell.tsx:61-64` | Em 375 px o popover encosta na borda esquerda da tela (`left` 0) e fica com 9 px de folga à direita. Cabe, sem rolagem horizontal, mas sem margem simétrica | `collisionPadding` no `PopoverContent` (por exemplo, 12) |
| 🟢 | `apps/app/shared/components/notifications/NotificationsBell.tsx:50-57` | Com "99+", o badge tem 31 px sobre um botão de 36 px e cobre quase todo o ícone do sino | limitar a largura do badge ou deslocá-lo mais para fora do botão |
| 🟢 | `apps/app/shared/hooks/useUnreadNotificationsCount.ts:51` | O plano diz que o contador com erro fica sem badge. Isso vale para a primeira leitura; numa falha posterior o cache conserva o número anterior e o badge continua mostrando-o. Lido no código, não medido | aceitar e corrigir o texto do plano, ou esconder o badge quando `error` estiver presente |
| 🟢 | `apps/app/shared/hooks/useListNotifications.ts:16-27` | Item 4: até 60 s com o badge já atualizado e a lista ainda sem a notificação nova | é a decisão em aberto do `review.md`; o número para decidir é este |

Uma ocorrência isolada: depois de recarregar `/pt-br/playground` como user@, o console mostrou dois avisos de
hidratação por diferença de id do Radix (no `GlobalSidebar` e nos gatilhos de menu da `Navbar`). O QA tentou
reproduzir em seis carregamentos seguintes (user@ e user2, em `/pt-br`, `/pt-br/playground` e
`/pt-br/entities`) e o aviso não voltou. Fica registrado sem atribuição à feature.

## Lacunas de teste herdadas

| Lacuna | Origem | Veredito |
|---|---|---|
| Índice publicado e TTL só existem no projeto real | handoff, review | continua aberta; é infra, `PRE-PRODUCTION.md` §1.9 |
| Polling de 120 s e aba escondida sem teste de relógio | handoff, review | fechada aqui por medição no navegador (item 2). Teste permanente não criado: testaria o `focusManager` da biblioteca |
| Corrida entre dois eventos diferentes da Stripe para o mesmo perfil | handoff, review | continua aberta, aceita no plano (§4.8); fora do alcance sem Stripe |
| `[id]/read` com id inválido responde 404 sem tocar no repositório | review | fechada aqui: o teste já existia e foi endurecido (código do erro, sem gravação, dois casos novos) |
| Boas-vindas pelo primeiro login com Google ponta a ponta | review | fechada aqui: medida com o emulador de Auth (item 1); o teste de rota com mock já cobria a emissão |

As afirmações da seção "A verificar no `/test`" do `handoff.md` coincidem com os itens 2, 3, 5 a 10 acima e
foram medidas ali.

## Ambiente do e2e

Todas as portas estavam livres antes (3000, 3002, 8080, 9099, 9199, 4001, 4400, 4500, 9150); nada do usuário
foi reutilizado. O QA subiu, com o PID guardado:

- `pnpm emulators` (Auth, Firestore, Storage; projeto `demo-next-boilerplate`), com `JAVA_HOME` no JDK 21;
- `apps/api` em `next dev -p 3002` e `apps/app` em `next dev -p 3000`, com o ambiente montado pelo
  `buildStackEnv` da `apps/e2e` (o mesmo recorte do Playwright: emuladores, chaves do Firebase Admin e da
  Stripe vazias);
- um `tail -F` do log da API com horário, para contar chamadas.

O seed rodou com `node scripts/seed-emulator.mjs`. Um script temporário em `apps/api/scripts/` gravou
notificações extras no emulador e foi apagado. No fim o QA mandou `SIGINT` aos emuladores e `kill` aos demais
PIDs, e conferiu as nove portas vazias com `lsof`. O `pnpm test` final (com `test:emulator`) subiu e derrubou
os próprios emuladores; as portas seguiram vazias depois dele. Um screenshot salvo por engano na raiz do repo
foi apagado.

## Dados e contas de QA

Tudo viveu só nos emuladores e sumiu com eles. Nada foi criado no projeto Firebase real, então o
`PRE-PRODUCTION.md` não ganha conta nova.

- `qa-in-app-notifications-google@example.com`: conta Google no emulador de Auth, com perfil e uma `welcome`.
- `qa-in-app-notifications@example.com`: cadastrada pela tela e excluída pela própria exclusão de conta.
- 105 notificações `welcome` não lidas para user2 (`qa_cap_*`), depois marcadas como lidas; uma
  `subscriptionCanceled` para user@ (`qa_item4_000`); três notificações de user@ marcadas como lidas.

Senhas: as contas do seed usam a senha documentada em `docs/SETUP.md`; a da conta cadastrada foi gerada na
hora e descartada com o emulador. Nenhuma senha, token ou e-mail real está neste arquivo.

## Estado de dev alterado

Nenhum. Os dados ficaram no emulador, que foi derrubado. No working tree mudaram só os dois arquivos de
teste listados em "Testes criados ou editados", e o `.next` de `apps/app` e `apps/api` (ignorado pelo git)
recebeu o build de dev.
