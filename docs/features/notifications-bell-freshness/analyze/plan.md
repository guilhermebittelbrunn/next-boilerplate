# Plano: frescor e borda do sino de notificações

Tarefa direta, sem spec. Junta três achados 🟢 da PR #52 (`in-app-notifications`) que a auditoria pós-PR #52
recomendou como próxima tarefa (`specs/BACKLOG.md:284-316`). Rodada autônoma do `/cycle`: as decisões que
dependeriam do usuário estão na §11, cada uma com a opção adotada.

Âncoras conferidas em 2026-10-20 contra o working tree (nenhum dos arquivos mudou desde `3a118c6`, o squash da
PR #52).

## 1. Contexto

### 1.1 Resumo

O sino do painel comum mostra um número e uma lista que podem discordar entre si, e o popover encosta na borda
da tela no celular. Esta tarefa faz a lista acompanhar o número sem custo de leitura quando nada mudou, faz o
badge sumir quando a contagem falha (o que o plano original já pedia) e dá folga ao popover nas bordas.

### 1.2 Os três achados

| # | Achado | Evidência | Origem |
|---|---|---|---|
| 1 | Lista atrás do badge | `useListNotifications.ts:15-27` não define `staleTime` e herda 60 s de `QueryProvider.tsx:6`. O `/test` da PR #52 mediu badge em 12 e a lista reaberta 16 s depois sem a notificação nova, e nenhuma chamada à lista até 66 s (`docs/features/in-app-notifications/test/report.md:65`) | `review.md:29`, `:103-105` da feature |
| 2 | Badge com número antigo depois de falha | `useUnreadNotificationsCount.ts:51` devolve `query.data?.count ?? 0`. O plano original diz "contador carregando ou com erro: sem badge" (`docs/features/in-app-notifications/analyze/plan.md:391`) | lido no código; confirmado na fonte do React Query (§1.4) |
| 3 | Popover encostado na borda a 375 px | `NotificationsBell.tsx:61-64` não passa `collisionPadding`; `PopoverContent` repassa as props ao Radix (`packages/design-system/components/ui/popover.tsx:19-35`). Medido: `left` 0, 9 px de folga à direita (`report.md:67`, `:118`) | `/test` da PR #52 |

### 1.3 Objetivos, fora de escopo e corte

- **Objetivo 1.** Ao abrir o popover, a lista mostra a notificação que o badge já contou. Sem notificação nova,
  abrir o popover não gera leitura a mais do que gera hoje.
- **Objetivo 2.** Se a última leitura da contagem falhou, não há badge, como na primeira leitura. Quando a
  contagem volta a responder, o badge volta com o número novo.
- **Objetivo 3.** A 375 px o popover fica afastado das duas bordas.
- **Fora de escopo.** O tamanho do badge `99+` sobre o ícone (`NotificationsBell.tsx:50-57`), que é escolha
  visual do usuário (`specs/BACKLOG.md:315`). A atualização ao vivo da lista com o popover aberto (§11, P4). O
  `markRead` contra documento apagado e os eventos concorrentes da Stripe, que são `apps/api`.
- **Corte de MVP.** Os três itens, só na `apps/app`. Nada de SDK, API, i18n, env ou design system.

### 1.4 Leitura do React Query (item 2), conferida na fonte

Versão instalada: `@tanstack/query-core@5.90.20` (`apps/app/package.json:25`).

- Na falha, o reducer faz `{ ...state, error, status: "error", ... }`
  (`node_modules/.pnpm/@tanstack+query-core@5.90.20/.../build/modern/query.js:355-369`). O `...state` preserva
  `data`, então `query.data?.count` continua com o último número que deu certo. É o defeito.
- O observer expõe `isRefetchError: isError && hasData` (`queryObserver.js:334`), o caso exato do achado.
- Enquanto refaz depois de um erro e já existe dado, `fetchState` não volta a `pending` (`query.js:391-401`):
  `status` segue `"error"` até a próxima resposta boa. O badge fica oculto durante a nova tentativa e reaparece
  quando ela dá certo.
- `retry: 1` é global (`QueryProvider.tsx:8`, `:22`): a contagem só entra em erro depois de duas falhas
  seguidas. Durante a primeira tentativa de novo, o número antigo ainda aparece, por cerca de 1 s.
- **`setQueryData` limpa o erro.** `setData` despacha `success` (`query.js:60-69`), e `successState` grava
  `status: "success"` e `error: null`. Por isso só trocar a linha 51 não fecha o achado: o "marcar como lida"
  otimista (`useNotificationActions.ts:104-109`) e o rollback (`:77-82`) gravam no cache da contagem e trazem
  de volta o número velho (§5.2, item 2b).

### 1.5 Apps, área, modo de produto

- Apps: só `apps/app`. `apps/api`, `apps/web`, `packages/*`: N/A.
- Área: painel comum. O sino é montado em `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx:62`, e só ali.
- Modo de produto: N/A. O painel comum só existe no modo `subscription`; o comportamento não muda por modo.
- Assinatura/plano: N/A.
- Dependência externa nova: nenhuma. Variável de ambiente nova: nenhuma.

## 2. Dados (Firestore)

N/A. Nenhuma coleção, campo, consulta ou índice muda. As consultas continuam as mesmas duas da PR #52
(`userId + createdAt` para a lista, `userId + readAt` para a contagem), e o que muda é **quando** o cliente as
chama.

Custo de leitura, que é o critério de escolha do item 1:

| Situação | Hoje | Depois |
|---|---|---|
| Abrir o popover sem notificação nova, lista com menos de 60 s | 0 leituras da lista | 0 |
| Abrir o popover sem notificação nova, lista com mais de 60 s | 1 releitura das páginas carregadas | igual (o `staleTime` global fica) |
| Abrir depois de a contagem do servidor mudar, lista com menos de 60 s | 0 leituras, lista desatualizada | 1 releitura das páginas carregadas (10 documentos por página, `pagination.ts:9`) |
| Polling da contagem | a cada 120 s com a aba visível (`pagination.ts:16`) | igual |

## 3. Contrato `@repo/sdk`

N/A. Nenhum tipo ou action muda.

## 4. API

N/A. Nenhuma rota, guard ou `error.code` novo. `apiErrors` não muda.

## 5. Front-end (`apps/app`)

### 5.1 Rotas

N/A. Nenhuma rota, prefetch ou `queryKey` novo. As chaves continuam `["notifications","list"]` e
`["notifications","unreadCount"]` (`apps/app/shared/lib/queryKeys.ts:37-42`).

### 5.2 Dados

**Item 1: a lista fica velha quando o servidor muda a contagem.**

A comparação acontece dentro do `queryFn` da contagem, em `useUnreadNotificationsCount.ts:26-33`: antes de
pedir, lê o número que o cache tem; com a resposta, se o número do servidor for diferente, marca a lista como
velha com `invalidateQueries({ queryKey: list(), refetchType: "none" })`. Nada é lido nesse momento. Na próxima
abertura do popover, o `NotificationsList` monta de novo (o Radix desmonta o conteúdo fechado, e por isso o
teste `notificationsBell.test.tsx:127-134` vê a lista só depois de abrir), o observer encontra a query
invalidada e relê.

Por que dentro do `queryFn` e não num `useEffect` sobre `query.data`: o efeito também dispara com as escritas
otimistas do "marcar como lida" (`useNotificationActions.ts:104-109`, `:139-142`), que já mantêm lista e
contagem em acordo. Elas não passam pelo `queryFn`. Dentro dele, a comparação só enxerga uma resposta do
servidor que discorda do que o cliente acredita: notificação nova, ou outra aba que marcou como lida.

`useListNotifications` e `fetchNotificationsList` não mudam (regra de ouro 8). `fetchUnreadNotificationsCount`
continua sendo a função imperativa pura do arquivo; a comparação fica no `queryFn` do hook.

**Item 2: sem badge depois de falha.**

- 2a. `useUnreadNotificationsCount.ts:51`: `count: query.isError ? 0 : (query.data?.count ?? 0)`. O `error`
  devolvido na linha 53 fica como está.
- 2b. `useNotificationActions.ts`: a contagem só é escrita no cache se ela estava em `success` no momento do
  snapshot. `snapshotCache` (`:53-65`) passa a guardar `previousCount` apenas quando
  `queryClient.getQueryState(unreadCount())?.status === "success"`. O `onMutate` do `markRead` (`:104`) e do
  `markAllRead` (`:139-142`) só mexem na contagem quando `snapshot.previousCount` existe, e o `restoreCache`
  (`:77-82`) já só restaura quando ele existe. Com a contagem em erro, marcar como lida não traz o número velho
  de volta, nem no sucesso nem no rollback. O próximo polling ou a próxima navegação depois de 30 s refaz a
  contagem.

Comportamento com a contagem em `success` (o caso de todos os testes atuais, que semeiam com `setQueryData`):
idêntico ao de hoje.

### 5.3 Componentes

**Item 3.** `NotificationsBell.tsx:61-64` ganha `collisionPadding={12}`. O valor casa com a largura já
existente, `w-[min(24rem,calc(100vw-1.5rem))]` (`:63`): 1,5 rem são 24 px, 12 de cada lado. O `align="end"`
fica.

Por que no call site: `PopoverContent` tem dois usos no repo, este e `packages/design-system/components/ui/date-input.tsx:98`.
Abaixo dos três da política (`.claude/cycle-policy.md` §3), e o do `DateInput` não foi medido com o defeito.

Mecânica no Radix (`@radix-ui/react-popper@1.3.7`, via `radix-ui@1.6.7`): `collisionPadding` vira o `padding`
dos middlewares `shift`, `flip` e `size` do Floating UI (`react-popper/dist/index.mjs:102`, `:117-147`). O
padrão é 0, o que explica o `left: 0` medido. O sino fica à esquerda de idioma, tema e perfil
(`apps/app/shared/components/ui/Navbar.tsx:25-30`), então com `align="end"` o popover de 351 px sairia pela
esquerda, e o `shift` o empurra até a borda mais o padding.

### 5.4 i18n e a11y

N/A. Nenhuma string nova. O `aria-label` do sino já cai em `triggerLabel` quando `count` é 0
(`NotificationsBell.tsx:29-35`), então com a contagem em erro o rótulo acessível também para de anunciar o
número antigo.

## 6. Autorização e segurança

N/A para guard e posse: nada muda na API. Impersonação: o `resetQueries()` do `AuthRequestPanelContext`
descarta o cache ao trocar de sujeito (`docs/features/in-app-notifications/analyze/plan.md:372-373`). A
comparação do item 1 vê `known` como `undefined` depois do reset e não invalida nada. Sob impersonação o
popover segue só leitura, e o item 2b não é alcançável ali porque os botões de marcar estão desabilitados
(`NotificationsList.tsx:106`, `:134`).

## 7. Testes

Nível: hook com `renderHook` + `QueryClientProvider`, no arquivo que já existe. Nada de emulador: o objeto do
teste é a lógica de cache, não a consulta nem o índice.

| # | Arquivo | Teste (nome sugerido) | Prova |
|---|---|---|---|
| T1 | `apps/app/__tests__/useNotifications.test.tsx` | "esconde o número quando uma releitura falha depois de um sucesso" | contagem 2, depois `mockRejectedValue` + `refetchQueries` da chave: `result.current.count` vai a 0, `error` preenchido, `errorAlertMock` sem chamada |
| T2 | idem | "volta a mostrar o número quando a contagem se recupera" | depois do T1, `mockResolvedValue({ count: 3 })` + refetch: `count` 3 |
| T3 | idem | "marca a lista como velha quando o servidor muda a contagem" | lista semeada, contagem 2 e depois 3: `getQueryState(list()).isInvalidated` true e `listMock` sem chamada |
| T4 | idem | "não mexe na lista quando o servidor confirma o número do cache" | contagem 2, `setQueryData({ count: 1 })` (como faz o otimista), servidor responde 1: `isInvalidated` false |
| T5 | idem | "reabrir sem contagem nova não relê; com contagem nova relê uma vez" | `useListNotifications({ enabled: true })` montado sobre lista recém-semeada: `listMock` 0 vezes; desmonta, a contagem muda, monta de novo: `listMock` 1 vez com `{ limit: 10, cursor: null }` |
| T6 | idem | "com a contagem em erro, marcar como lida não traz o número de volta" | contagem em erro com dado antigo; `markRead` resolvido e outro rejeitado: `getQueryState(unreadCount()).status` continua `"error"` nos dois |
| T7 | idem | "com a contagem em erro, marcar todas não grava zero por cima do erro" | mesmo arranjo, `markAllRead`: status continua `"error"` |

O teste que existe em `useNotifications.test.tsx:214-224` ("devolve zero sem avisar quando a contagem falha")
cobre só a primeira leitura e continua valendo. Os cinco testes de `useNotificationActions` (`:227-315`)
semeiam a contagem com `setQueryData`, que deixa a query em `success`, e devem passar sem mudança: isso prova
que o 2b não alterou o caminho normal.

`apps/app/__tests__/notificationsBell.test.tsx`: sem teste novo. O hook está mockado ali (`:23-25`), e o item 3
é uma prop repassada ao Radix; em jsdom não há layout para medir, e um teste que lê a prop seria só detector de
mudança. Quem prova o item 3 é a passada do `/test`.

Comando: `pnpm --filter app test`. Base de comparação: `app` 958 testes depois da PR #52
(`specs/BACKLOG.md:233`); esperado 965.

## 8. O que o `/test` vai percorrer

Uma passada de `agent-browser` (regra de ouro 11), com emulador. Os índices de `notification` não estão
publicados no projeto real (`docs/PRE-PRODUCTION.md` §1.9, `:251-255`), então o projeto real não serve.

**Ambiente.** `pnpm emulators` (JDK 21), `pnpm seed`, `apps/api` em 3002 e `apps/app` em 3000 com o bloco de
emulador nos `.env` (`docs/SETUP.md`, "Estado que o `pnpm seed` cria"). Contas do seed: `user@example.com`
(25 notificações, 13 não lidas, `apps/api/scripts/seed-emulator.mjs:93-111`), `user2@example.com` (nenhuma),
`admin@example.com`. A senha está no `SETUP.md` e não entra no relatório. Um `tail -F` do log da API com
horário, para contar `GET /notifications` e `GET /notifications/unread-count`.

**Gravar uma notificação nova sem arquivo temporário.** A API REST do emulador do Firestore aceita
`Authorization: Bearer owner`. Copie a forma de um documento de `user@` (GET em
`http://127.0.0.1:8080/v1/projects/demo-next-boilerplate/databases/(default)/documents/notification`) e crie
outro com `type: "subscriptionCanceled"`, `readAt: null`, `createdAt` agora e id `qa_bell_<n>`. Se preferir
script, apague no fim (cycle-policy §8).

**Forçar a falha da contagem.** `agent-browser network route "**/notifications/unread-count" --abort`, e
`network unroute` para voltar.

| Fluxo | Passos | Esperado |
|---|---|---|
| F1 lista acompanha o badge | `user@`: abrir o sino (badge 13), fechar. Gravar uma notificação nova. Esperar 30 s e navegar para outra página do painel (dispara a contagem, `useUnreadNotificationsCount.ts:35-48`). Reabrir antes de 60 s da leitura da lista | badge 14; ao reabrir, 1 `GET /notifications` no log e a nova no topo. Hoje: 0 chamadas e a nova ausente (`report.md:65`) |
| F2 sem notificação nova, sem leitura a mais | abrir e fechar o popover 3 vezes em menos de 60 s, com uma navegação depois de 30 s entre elas | 1 `GET /notifications` (o da primeira abertura) e nenhuma depois |
| F3 marcar como lida não força releitura | marcar uma como lida no popover, fechar, esperar 30 s, navegar (contagem confirma o número), reabrir antes de 60 s | badge desconta 1 na hora; 0 `GET /notifications` na reabertura |
| F4 badge some na falha | com o badge visível, `network route ... --abort`; esperar 30 s e navegar | badge some depois da segunda falha (retry 1); `aria-label` do botão sem número; nenhum toast |
| F5 badge volta | `network unroute`; esperar 30 s e navegar | badge volta com o número do servidor |
| F6 marcar com a contagem em erro | repetir F4; abrir o popover e marcar uma como lida | badge continua ausente (não volta com o número antigo menos 1) |
| F7 popover a 375 px | emulação de celular (`set device`, scrollbar sobreposta) e também `set viewport 375 812` (scrollbar clássica). Medir `getBoundingClientRect()` do `[data-slot=popover-content]` contra `document.documentElement.clientWidth` | celular: `left` 12 e 12 px à direita; nos dois modos, `scrollWidth` do documento igual a `clientWidth` (sem rolagem horizontal). Registrar os números do modo de scrollbar clássica (R1) |
| F8 desktop | 1280 px, abrir o sino | popover alinhado à direita do sino como antes (o padding não deve deslocá-lo quando há espaço) |

**Combinações.** F7 em light e dark, com itens (`user@`), vazio (`user2@`) e sob impersonação (`admin@`
personificando `user@`), em pt-br; en e es a 375 px num tema cada. F1 a F6 em pt-br, desktop, light: a lógica
não varia por idioma ou tema.

**Não verificável sem infra externa.** Nada: tudo roda no emulador.

## 9. Critérios de aceite (rascunho; o `/test` gera a versão final)

# Critérios de Aceite (Checklist)

- [ ] **A lista mostra a notificação que o badge já contou**
  Depois que a contagem do servidor muda (notificação nova, ou outra aba marcou como lida), a próxima abertura
  do popover relê a lista e mostra o estado do servidor, mesmo dentro dos 60 s do `staleTime` global. A
  releitura acontece na abertura, não no momento em que a contagem muda. Com o popover já aberto quando a
  contagem muda, a lista aberta não pula; a releitura fica para a próxima abertura.

- [ ] **Sem notificação nova, abrir o popover não lê mais do que hoje**
  Abrir e fechar o popover várias vezes sem a contagem do servidor mudar não gera `GET /notifications` além do
  que o `staleTime` de 60 s já gerava. Marcar como lida ou marcar todas não conta como mudança: a contagem do
  servidor confirma o que o cache otimista já mostrava e a lista não é relida por isso.

- [ ] **Sem badge depois de uma falha da contagem**
  Quando a releitura da contagem falha duas vezes seguidas (o `retry: 1` global), o badge some e o `aria-label`
  do sino volta para o texto sem número, como na primeira leitura com erro. Nenhum toast aparece. Quando a
  contagem volta a responder, o badge reaparece com o número novo, nunca com o anterior à falha.

- [ ] **Marcar como lida com a contagem em erro não ressuscita o número antigo**
  Com a contagem em erro, marcar uma como lida ou marcar todas não grava número no badge, com a API aceitando
  ou recusando o pedido. No caso de recusa, o rollback da lista acontece como hoje e o toast de erro aparece,
  mas o badge continua ausente. Com a contagem em dia, o comportamento otimista é o de antes: desconta 1 ou
  zera na hora, e restaura na falha.

- [ ] **Popover afastado das bordas no celular**
  A 375 px com scrollbar sobreposta, o popover fica a 12 px da borda esquerda e a 12 px da direita, sem rolagem
  horizontal no documento. Vale em light e dark, com itens, vazio e sob impersonação, nos três idiomas. Em
  desktop o popover continua alinhado à direita do sino.

- [ ] **Nada mais muda**
  Polling a cada 120 s com a aba visível, releitura ao voltar para a aba e ao navegar com o número com mais de
  30 s seguem iguais. `99+` continua com o mesmo tamanho e posição. A suíte da `apps/app` passa inteira, com os
  testes antigos do sino e das ações sem alteração.

## 10. Blueprint técnico

### 10.1 Contrato, rota, persistência, i18n, env

N/A nos cinco. Nenhum arquivo fora de `apps/app`.

### 10.2 Arquivos afetados

```
apps/app/shared/hooks/useUnreadNotificationsCount.ts     itens 1 e 2a
apps/app/shared/hooks/useNotificationActions.ts          item 2b
apps/app/shared/components/notifications/NotificationsBell.tsx   item 3
apps/app/__tests__/useNotifications.test.tsx             T1 a T7
```

### 10.3 Pseudo-diffs

`useUnreadNotificationsCount.ts`:

```ts
 const query = useAuthorizedQuery({
     queryKey: queryKeys.notifications.unreadCount(),
-    queryFn: fetchUnreadNotificationsCount,
+    queryFn: async () => {
+        const known = queryClient.getQueryData<NotificationUnreadCountDTO>(
+            queryKeys.notifications.unreadCount()
+        );
+        const latest = await fetchUnreadNotificationsCount();
+        if (known && known.count !== latest.count) {
+            queryClient.invalidateQueries({
+                queryKey: queryKeys.notifications.list(),
+                refetchType: "none",
+            });
+        }
+        return latest;
+    },
     staleTime: UNREAD_COUNT_STALE_MS,
     ...
 });
 ...
 return {
-    count: query.data?.count ?? 0,
+    count: query.isError ? 0 : (query.data?.count ?? 0),
     isLoading: query.isLoading,
     error: query.error,
 };
```

Um comentário curto no `queryFn` é aceitável (exceção 2 de `.claude/rules/code-comments.md`): o motivo de
comparar com o cache, e não reagir a toda mudança de `data`, não é óbvio lendo o código. Algo como "The
optimistic mark-as-read already keeps list and count in step; only a server answer that disagrees means the
list moved." Sem citar plano nem etapa.

`useNotificationActions.ts`:

```ts
 const snapshotCache = async (): Promise<NotificationCacheSnapshot> => {
     await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });
+    const countIsCurrent =
+        queryClient.getQueryState(queryKeys.notifications.unreadCount())
+            ?.status === "success";
     return {
         previousList: ...,
-        previousCount: queryClient.getQueryData<NotificationUnreadCountDTO>(...),
+        previousCount: countIsCurrent
+            ? queryClient.getQueryData<NotificationUnreadCountDTO>(...)
+            : undefined,
     };
 };

 // markRead.onMutate
-if (wasUnread) {
+if (wasUnread && snapshot.previousCount) {
     queryClient.setQueryData(... count - 1 ...);
 }

 // markAllRead.onMutate
-queryClient.setQueryData(queryKeys.notifications.unreadCount(), { count: 0 });
+if (snapshot.previousCount) {
+    queryClient.setQueryData(queryKeys.notifications.unreadCount(), { count: 0 });
+}
```

O `getQueryState` vem depois do `cancelQueries`, que com `revert` devolve a query ao estado anterior à leitura
cancelada. O JSDoc de `useNotificationActions` (`:43-47`) continua correto.

`NotificationsBell.tsx`:

```tsx
+const POPOVER_EDGE_GAP_PX = 12;
 ...
 <PopoverContent
     align="end"
     className="w-[min(24rem,calc(100vw-1.5rem))] p-0"
+    collisionPadding={POPOVER_EDGE_GAP_PX}
 >
```

### 10.4 Ordem de implementação e plano de commits sugerido

Tudo é `apps/app`. O `revisor-codigo` define branch e commits; a sugestão:

1. `fix(app): keep the notifications list and badge in step with the server`: `useUnreadNotificationsCount.ts`,
   `useNotificationActions.ts` e `useNotifications.test.tsx`. Os itens 1 e 2a tocam o mesmo arquivo, e
   separá-los exigiria `git add -p`; a política aceita o commit conjunto (cycle-policy §6).
2. `fix(app): keep the notifications popover off the screen edges`: `NotificationsBell.tsx`.
3. `docs(features): notifications-bell-freshness`, por último.

O working tree já traz o `specs/BACKLOG.md` modificado pela auditoria, que não é desta tarefa e vai num commit
`docs(specs)` próprio. Antes do primeiro commit, `git diff --cached --stat` tem de sair vazio
(`.claude/rules/git-commits.md`, "confira o índice").

### 10.5 Env e configuração

Nenhuma variável nova. Nada que um fork precise configurar.

## 11. Perguntas em aberto (decididas sem perguntar)

| # | Pergunta | Opções | Adotada | Por quê |
|---|---|---|---|---|
| P1 | Como fazer a lista acompanhar o badge? | (a) invalidar a lista quando uma resposta do servidor muda a contagem, sem refetch imediato; (b) `staleTime: 0` na lista; (c) `refetchOnMount: "always"`; (d) refetch ao abrir comparando com uma contagem guardada na última leitura da lista (proposta do backlog) | (a) | (b) e (c) releem todas as páginas carregadas a cada abertura, mesmo sem nada novo. (d) dispara em falso depois de marcar como lida, porque o otimista muda a contagem sem o servidor ter mudado nada. (a) dá zero leitura extra sem mudança e só passa pelo `queryFn`, onde as escritas otimistas não chegam |
| P2 | Corrigir também o caminho do "marcar como lida" que traz o número velho de volta (2b)? | (a) sim, guardando a contagem só quando ela está em `success`; (b) só trocar a linha 51 e registrar o resto como risco | (a) | É o mesmo defeito por outra porta (`setQueryData` limpa o erro, §1.4), e o plano original diz "com erro, sem badge" sem exceção. Custa quatro linhas e dois testes. cycle-policy §3: defeito encontrado no caminho, corrija |
| P3 | Valor do `collisionPadding`? | 8, 12, 16 | 12 | Casa com a largura existente (`100vw - 1.5rem`, 12 px por lado) e com a sugestão do `/test` da PR #52 (`report.md:118`) |
| P4 | Com o popover aberto, a lista atualiza ao vivo quando a contagem muda? | (a) não, `refetchType: "none"`; (b) sim, `refetchType: "active"` | (a) | A lista não pula enquanto a pessoa lê, e não há corrida entre o refetch e uma mutação otimista em andamento. Abrir de novo mostra o estado novo |

## 12. Riscos a medir

| # | Risco | Como medir |
|---|---|---|
| R1 | Com scrollbar clássica a 375 px, `clientWidth` é 360 (o `/test` da PR #52 mediu `scrollWidth` 360). A largura do popover usa `100vw` (351 px), maior que 360 menos 24. O `shift` coloca o `left` em 12 e a borda direita fica em 363, 3 px sobre a scrollbar. Não gera rolagem (o Radix usa `position: fixed`), mas fica assimétrico. Celulares usam scrollbar sobreposta, onde a conta fecha em 12/12 | F7 nos dois modos. Se o modo clássico incomodar, a saída é trocar `100vw` por `var(--radix-popover-content-available-width)` na largura, mas só depois de medir, porque o Floating UI calcula essa largura de outro jeito com `align="end"` |
| R2 | Com 100 ou mais não lidas, a contagem para em 100 (`NOTIFICATION_UNREAD_COUNT_CAP`) e notificação nova não muda o número. A lista volta a depender dos 60 s | Aceito. Documentar no handoff; não precisa de medição |
| R3 | Invalidar uma query infinita relê todas as páginas carregadas, não só a primeira. Quem carregou 3 páginas paga 3 leituras na próxima abertura depois de uma mudança | Aceito: é o mesmo custo de hoje depois de 60 s. F1 conta as chamadas no log |
| R4 | Corrida: o `queryFn` lê `known`, uma mutação começa, o `cancelQueries` descarta a resposta da contagem, mas o `queryFn` termina e pode invalidar a lista se a escrita do servidor chegou antes da leitura. Efeito: uma releitura a mais na próxima abertura | Aceito; janela de milissegundos a cada 120 s. Sem medição |
| R5 | `next dev` em vez de `next start` no `/test` | O comportamento é de cache no cliente; `next dev` basta. Se algo divergir, conferir em `build && start` (cycle-policy §4) |

## 13. Pré-requisitos manuais de infra

Nenhum. Nada a provisionar, publicar ou configurar, e nenhuma entrada nova em `docs/PRE-PRODUCTION.md`. O
`/test` usa o emulador porque os índices de `notification` não estão publicados no projeto de referência
(§1.9), e essa pendência já existe e não é desta tarefa.
