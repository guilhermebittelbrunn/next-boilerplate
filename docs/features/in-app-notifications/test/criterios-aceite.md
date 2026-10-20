# Critérios de Aceite (Checklist)

Central de notificações no app. A base é o rascunho da §10 do `analyze/plan.md`, com o contador e a lista
separados em critérios próprios e quatro acréscimos desta etapa: erro do contador, erro da lista, frescor da
lista ao reabrir e id inválido em `[id]/read`. O status de cada item e o meio que o provou estão em
[`report.md`](report.md). Marcado `[x]` = aprovado; `[ ]` = não verificado por exigir infra externa.

- [x] **Boas-vindas na conta nova**
  Uma conta criada pela tela de cadastro ou pelo primeiro login com Google recebe uma notificação `welcome`
  não lida, com id `welcome_<id do perfil>` e `expiresAt` 90 dias depois da criação. A contagem dessa conta
  começa em 1. Um segundo login com a mesma conta não cria outra: o id é determinístico e a gravação repetida
  vira "duplicate". Perfil de admin não recebe boas-vindas. Se a gravação do aviso falhar, o cadastro segue:
  o perfil volta e só o nome do erro vai para o log, sem desfazer a conta no Firebase Auth.

- [x] **Texto no idioma de quem lê**
  Título e corpo saem do dicionário do idioma da URL; o documento guarda só tipo e parâmetros. Trocar o idioma
  pelo seletor muda o texto da mesma notificação (pt-br "Boas-vindas", en "Welcome", es "Bienvenida") e a
  data segue o formato do idioma. Um tipo que o app não conhece, como o `legacyTypeRemoved` do seed, aparece
  com o texto genérico ("Nova notificação" / "Há uma atualização na sua conta.") e não quebra a lista.

- [x] **Badge e rótulo acessível do sino**
  Com zero não lidas não há badge, e o `aria-label` do botão é só "Notificações" (en "Notifications", es
  "Notificaciones"). Com não lidas, o badge mostra o número exato até 99 e "99+" a partir de 100, que é o teto
  da contagem na API. O rótulo acessível traz a contagem na forma sem concordância: "Notificações (não lidas:
  13)", "Notifications (unread: 12)", "Notificaciones (sin leer: 12)", e "99+" quando passa do teto.

- [x] **Atualização do contador**
  Com a aba visível, a contagem se refaz a cada 120 s. Com a aba escondida, nenhuma chamada a
  `/notifications/unread-count` sai, mesmo depois de passar um ciclo inteiro; ao voltar para a aba, sai uma
  chamada. Ao navegar entre páginas do painel, a contagem se refaz só se tiver mais de 30 s; duas navegações
  dentro dessa janela não geram chamada.

- [x] **Erro do contador**
  Se a primeira leitura da contagem falhar, o sino fica sem badge e nenhum toast aparece: uma consulta
  periódica que avisasse a cada dois minutos incomodaria mais do que o número ausente. Uma falha depois de uma
  leitura bem-sucedida mantém o último número no badge, porque o cache conserva o dado anterior.

- [x] **Lista paginada**
  O popover lê a lista só quando abre. Ela vem da mais recente para a mais antiga, 10 por vez, e "Carregar
  mais" traz a página seguinte sem repetir nem pular item; na última página o botão some. Com as 25 do seed:
  três páginas (10, 10, 5), 25 itens distintos. Cursor forjado na URL da API responde
  `400 PAGINATION_CURSOR_INVALID`. Sem notificações, o popover mostra "Nenhuma notificação" e "Avisos sobre a
  sua conta aparecem aqui.", com "Marcar todas como lidas" desabilitado.

- [x] **Lista ao reabrir o popover**
  A lista herda o `staleTime` global de 60 s. Se uma notificação nova chega e o badge sobe, reabrir o popover
  antes de 60 s da última leitura mostra a lista anterior, sem a nova e sem nova chamada à API; depois de 60 s,
  abrir refaz e a nova aparece no topo. O comportamento é o que o plano aceitou; a decisão de reduzir essa
  janela continua aberta.

- [x] **Erro ao carregar a lista**
  Quando a API recusa a lista, o popover mostra o texto traduzido do `error.code` (por exemplo, "A navegação
  expirou. Recarregue a lista." para `PAGINATION_CURSOR_INVALID`) com o código de rastreio da requisição e o
  botão "Tentar de novo", que refaz a leitura. O resto do painel continua navegável.

- [x] **Marcar uma como lida**
  O botão de cada item não lido desconta 1 do contador na hora, tira o marcador do item e persiste depois de
  recarregar. Duplo clique gera uma única escrita. Uma notificação já lida responde 200 com o mesmo `readAt`,
  sem regravar. Se a API recusar, o estado volta e aparece o erro traduzido.

- [x] **Marcar todas como lidas**
  Zera o contador, tira o marcador dos itens carregados e desabilita o botão. Os itens que ainda não foram
  carregados chegam lidos do servidor: com 105 não lidas, a contagem vai a 0 e continua 0 depois de
  recarregar. Se a API falhar, o badge e os marcadores voltam ao estado anterior e um toast mostra o erro
  traduzido.

- [x] **Destino da notificação**
  Avisos de assinatura são links para a aba de cobrança no idioma atual (`/pt-br/account?tab=billing`,
  `/es/account?tab=billing`). Clicar numa não lida navega, marca como lida e fecha o popover. Boas-vindas e
  tipo desconhecido não têm destino e não são links.

- [x] **Ownership**
  Marcar a notificação de outra pessoa responde `404 NOTIFICATION_NOT_FOUND` sem gravar. Lista, contagem e
  "marcar todas" filtram pelo perfil resolvido no servidor; nenhuma rota aceita dono vindo do cliente. Uma
  conta sem notificações vê contagem 0 e lista vazia, mesmo com outra conta tendo 25. Sem autenticação, a rota
  responde `401 AUTH_INVALID_TOKEN`.

- [x] **Id inválido em `[id]/read`**
  Um id que o Firestore recusaria como caminho (com `/`, inclusive codificado como `%2F`, reservado no formato
  `__x__`, `.`, `..` ou acima de 1500 caracteres) responde `404 NOTIFICATION_NOT_FOUND` sem consultar o
  repositório, em vez de 500.

- [x] **Impersonação somente leitura**
  O admin personificando um usuário vê o sino com a contagem e a lista daquele usuário. "Marcar todas" e o
  botão de cada item ficam desabilitados, com a linha "Somente leitura enquanto você atua como este usuário.".
  Clicar num aviso com destino navega e fecha sem marcar. Uma escrita forçada na API responde
  `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY` nas duas rotas, e a contagem do usuário não muda.

- [x] **Sino só no painel comum**
  Em `/admin` não há sino e nenhuma chamada a `/notifications/*` sai. O admin fora da impersonação que chama a
  API de notificações recebe `403 COMMON_PANEL_FORBIDDEN`.

- [ ] **Avisos de mudança da assinatura**
  Um evento aplicado da Stripe que leva a assinatura a `past_due`/`unpaid`, a `canceled` ou de volta a ativa
  cria a notificação do dono, e só dele, uma vez por evento (o `event.id` entra no id do documento). Evento
  ignorado (`skipped`) não cria nada, e falha ao gravar o aviso não muda o 200 do webhook. Sem Stripe
  configurada, só as boas-vindas aparecem.

- [x] **Exportação e expurgo**
  A exportação de dados do titular traz `notifications.items` com todos os campos do documento e
  `truncated: false`. A exclusão da conta apaga as notificações num passo próprio, `notifications`, entre
  `sessions` e `profile`, registrado no log da exclusão com a contagem apagada.

- [ ] **Índice composto ausente**
  Sem o índice publicado, a lista responde `503 PAGINATION_INDEX_MISSING`, e contagem e "marcar todas"
  respondem `503 NOTIFICATIONS_INDEX_MISSING`, nunca 500. Outro erro do Firestore sobe sem ser mascarado de
  índice. O painel continua navegável e o contador some sem toast.

- [ ] **Retenção de 90 dias**
  Cada notificação nasce com `expiresAt` 90 dias depois de `createdAt`. Com a política de TTL ligada em
  `notification.expiresAt`, o Firestore apaga o documento vencido; sem ela, o documento fica até a exclusão
  da conta, e a lista e a contagem seguem funcionando.

- [x] **Tema e responsivo**
  O popover segue o tema: fundo claro com texto escuro no light, fundo escuro com texto claro no dark, ícone
  de nível colorido (alerta em amarelo, cancelamento em vermelho). Em 375 px ele ocupa 351 px de largura, cabe
  na tela sem rolagem horizontal e rola por dentro com 10, 20 e 25 itens até o último.
