# Handoff do develop: central de notificações no app

- **Plano:** [`analyze/plan.md`](../analyze/plan.md). Rodada autônoma (`/cycle`), 2026-10-20.
- **Branch:** nenhuma criada, nada commitado. Tudo está no working tree.
- **Estado:** corte de MVP inteiro implementado. Nenhum bloqueio de código. As pendências são de infra
  (índices e TTL), registradas no `docs/PRE-PRODUCTION.md` §1.9.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---|---|
| Contrato SDK (§10.1) | novos: `packages/sdk/src/types/notification/{notification,index}.ts`, `packages/sdk/src/actions/notification/action.ts`. Alterados: `packages/sdk/src/types/index.ts`, `packages/sdk/src/client/index.ts` (`notification!: NotificationActions`), `packages/sdk/src/types/account/account.ts` (`notifications` no `AccountDataExportDTO`) |
| Mapper, repositório e emissão (§10.4) | novos: `apps/api/(shared)/mappers/notification.mapper.ts`, `apps/api/(shared)/repositories/notification.repository.ts`, `apps/api/(shared)/lib/notifications.ts`, `apps/api/(shared)/lib/subscription-notifications.ts` |
| Quatro rotas (§4.1) | novos: `apps/api/app/(routes)/notifications/route.ts`, `.../unread-count/route.ts`, `.../read-all/route.ts`, `.../[id]/read/route.ts` |
| Produtor boas-vindas (§4.7) | `apps/api/(shared)/lib/user-merge.ts` (`createDefaultUserProfile` agora é `async` e emite `welcome` para perfil `COMMON`) |
| Produtor assinatura (§4.8) | `apps/api/app/(routes)/webhooks/payments/route.ts` (`reconcileSubscription`) |
| Exportação e expurgo (§4.9) | `apps/api/(shared)/lib/account-export.ts`, `apps/api/(shared)/lib/account-erasure.ts` (passo `notifications` entre `sessions` e `profile`) |
| Índices (§10.5) | `firestore.indexes.json` (duas entradas de `notification`) |
| Seed (§9.1) | `apps/api/scripts/seed-emulator.mjs` (`NOTIFICATIONS_BY_OWNER`: 25 para `user@`, nenhuma para `user2@`) |
| Front: dados (§5.2) | `apps/app/shared/lib/queryKeys.ts`, `apps/app/shared/lib/pagination.ts` (`NOTIFICATIONS_PAGE_SIZE = 10`, `NOTIFICATIONS_POLL_INTERVAL_MS = 120_000`), novos `apps/app/shared/hooks/{useListNotifications,useUnreadNotificationsCount,useNotificationActions}.ts`, `apps/app/shared/lib/notifications.ts` |
| Front: componentes (§5.3) | novos `apps/app/shared/components/notifications/{NotificationsBell,NotificationsList,NotificationItem}.tsx`. Alterados: `apps/app/shared/components/ui/Navbar.tsx` (prop `notifications`), `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx` |
| i18n (§10.8) | nova folha `packages/internationalization/translations/apps/app/shared/notifications.ts`, ligada em `.../apps/app/shared/index.ts`; `apiErrors` em `.../packages/shared/utils.ts` |
| Docs (§10.9) | `docs/FORKING.md` (§10 "Avisar o usuário" + linha no mapa da §12), `docs/PRE-PRODUCTION.md` (§1.8 e §1.9 nova), `docs/ROPA.md` (registro 10 novo), `docs/PAYMENTS.md`, `docs/BACKUP.md`, `docs/SUBPROCESSORS.md` |

## Contrato e raio de impacto

- `NotificationDTO`, `NotificationUnreadCountDTO`, `MarkNotificationReadResponse`,
  `MarkAllNotificationsReadResponse`, `NOTIFICATION_TYPES`, `NotificationParamsByType`,
  `NOTIFICATION_UNREAD_COUNT_CAP`. Consumidores: as rotas e o repositório da `api`, os hooks e componentes do
  sino na `app`.
- `apiClient.notification` com `list`, `unreadCount`, `markRead`, `markAllRead`.
- `AccountDataExportDTO.notifications` (aditivo). O único consumidor no front é o download do JSON, que não
  lê campos; `format.version` segue `1`.
- `createDefaultUserProfile` passou de `function` que devolvia a promessa do `create` para `async function`
  com retorno `Promise<UserDTO>`. Os dois chamadores (`auth/sign-up/route.ts` e `findOrCreateProfile`) já
  faziam `await`.

## Códigos de erro novos

`NOTIFICATION_NOT_FOUND` (404) e `NOTIFICATIONS_INDEX_MISSING` (503), nos três idiomas de `apiErrors`.
Paridade: `pnpm --filter @repo/internationalization test` → 7 arquivos, 67 testes passando.

## Desvios do plano

1. **O plano supunha que um id com `/` não chega ao handler (§4.3). Não é verdade para `%2F`.** No smoke,
   `POST /notifications/a%2Fb/read` respondeu `{"error":{"code":"NOTIFICATION_NOT_FOUND"}}` com 404, um
   corpo que só o handler produz (o 404 do roteador do Next não tem `error.code`). Sem proteção, esse id
   chegaria ao `doc(id)` e o driver do Firestore lançaria, o que daria 500. Exportei `isUsableDocumentId` de
   `apps/api/(shared)/lib/pagination.ts` (antes privado, usado pelo cursor) e a rota `[id]/read` responde
   404 a qualquer id que o Firestore recusaria como caminho. A mesma lacuna existe em
   `entities/[id]/route.ts`; não mexi lá (fora do escopo, fica como achado).
2. **Escopo de log novo em `packages/shared`.** `LogScope` é uma lista fechada e não tinha onde encaixar
   `notifications/emit-failed`. Acrescentei `"notifications"` em `packages/shared/utils/helpers/log.ts`. Uma
   linha num pacote fora do plano.
3. **Dois testes existentes a mais que o plano mapeou.** Além dos seis previstos, `mergedUserPayload.test.ts`
   e `usersRoute.test.ts` quebraram no import pelo mesmo motivo (mock de `@repo/auth/server` sem
   `getFirestoreAdmin`). Os oito ganharam mock de `@/(shared)/lib/notifications` ou do repositório. Nenhum
   teste foi desativado ou afrouxado: os de expurgo passaram a esperar o passo `notifications` na ordem, que
   é o comportamento novo.
4. **Sem `ScrollArea` no popover.** A lista rola num `div` com `max-h-[min(28rem,60vh)] overflow-y-auto`. O
   `ScrollArea` do design system põe o viewport com `size-full`, e com só `max-height` no root não há altura
   definida para ele preencher. Não medi o comportamento do `ScrollArea`; a escolha foi por não depender
   dele.
5. **O `Button` do design system usa `loading`, não `isLoading`** como o plano escreveu. Usei `loading`.
6. **A lista não monta com o popover fechado.** O `PopoverContent` do Radix só renderiza aberto, então o
   hook da lista nem é chamado antes do primeiro clique. O `enabled` coerente continua no hook.
7. **ROPA:** o plano pedia a coleção dentro do registro 1. Ficou como registro próprio (10, "Notificações no
   painel"), e o `[FORK]` passou a 11. Nenhum outro documento apontava para o número antigo
   (`grep "ROPA.md#10"` vazio).
8. **Correções de documentação encontradas no caminho.** `docs/BACKUP.md:46` apontava para "item 12, passo
   5" para a TTL de `paymentEvent`; no `PRE-PRODUCTION.md` é o passo 6. A declaração de exclusão de conta no
   `PRE-PRODUCTION.md` falava em "seis passos" e "quatro apagam"; com `sessions` (de antes) e
   `notifications` (agora) são oito e seis. `docs/SUBPROCESSORS.md` ganhou a coleção `notification` na linha
   do Firestore.

## Afirmações com instrumento

Smoke contra os emuladores (Auth + Firestore, projeto `demo-next-boilerplate`, JDK 21) com a `apps/api` em
`next dev` na 3002, env montado a partir do `.env.example` com as chaves do Firebase Admin zeradas (o mesmo
recorte do `apps/e2e/support/stackEnv.ts`). Seed rodado com `node scripts/seed-emulator.mjs`; tokens do
emulador de Auth; chamadas com `curl`. Portas conferidas livres antes; tudo o que subi foi derrubado e as
portas 3002, 8080, 9099, 9199, 4001, 4400, 4500 e 9150 conferidas livres no fim.

| Afirmação | Instrumento → resultado |
|---|---|
| seed grava 25 para `user@` e 0 para `user2@` | saída do seed: `25 notifications` / `0 notifications` |
| contagem de não lidas do seed | `GET /notifications/unread-count` (user@) → `{"count":13}` 200 |
| paginação de 10 sem repetir nem pular | três páginas com `limit=10` → 25 ids, 25 únicos, último `nextCursor` `null` |
| cursor forjado | `GET /notifications?cursor=abc` → 400 `PAGINATION_CURSOR_INVALID` |
| ownership | `POST /notifications/<id de user@>/read` com o token de `user2@` → 404 `NOTIFICATION_NOT_FOUND` |
| estado vazio do outro dono | `user2@`: contagem `{"count":0}`, lista `{"items":[],"nextCursor":null}` |
| impersonação lê e não escreve | admin personificando `user@`: contagem 13 (200); `POST [id]/read` e `POST read-all` → 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY` |
| admin fora da impersonação | `GET /notifications/unread-count` com `x-request-role: admin` → 403 `COMMON_PANEL_FORBIDDEN` |
| marcar uma é idempotente | duas chamadas seguidas devolvem o mesmo `readAt` (`2026-10-20T03:33:02.047Z`); contagem 13 → 12 |
| marcar todas | `POST /notifications/read-all` → `{"updated":12}`; contagem → 0 |
| boas-vindas no cadastro | `POST /auth/sign-up` (conta nova) → 201; contagem 1; lista com um `welcome` não lido |
| expurgo apaga as notificações | `POST /account/deletion` → 200; log `erasure-step step=notifications status=done count=1`; `runQuery` no REST do emulador por `userId` → 0 documentos |
| exportação | `GET /account/export` (user@) → `notifications.items` com 25 e `truncated: false` |
| 503 com índice faltando, nunca 500 | `notificationsRoute.test.ts`: erro `code: 9` + "requires an index" → 503 `PAGINATION_INDEX_MISSING` na lista e `NOTIFICATIONS_INDEX_MISSING` em contagem e marcar todas. O emulador não cobra índice, então o caminho real só aparece contra o projeto |
| sem Stripe, só boas-vindas | o webhook já responde 503 `PAYMENTS_NOT_CONFIGURED` sem chaves (código existente, não alterado); o produtor de assinatura só roda depois de `applySubscriptionState`. A API do smoke subiu com `STRIPE set: False` |
| falha ao gravar o aviso não muda o webhook | `paymentsWebhookRoute.test.ts`: `emitOnce` rejeitando → 200, evento marcado, log `[notifications] emit-failed type=subscriptionPaymentPending reason=TypeError` |
| falha ao gravar o aviso não desfaz o cadastro | `welcomeNotification.test.ts`: `emitOnce` rejeitando → perfil devolvido, log só com o nome do erro |
| `readAt: null` explícito é o que faz contar | `notificationRepository.test.ts`: documento sem o campo → contagem 0 |

## A verificar no `/test`

Nada abaixo foi medido nesta etapa. Não subi a `apps/app`, não abri browser.

- O sino aparece na `Navbar` do painel comum e não aparece em `/admin` (F9). Repro: login como `admin@`,
  abrir `/pt-br/admin`.
- Badge: some com 0, mostra o número e `99+` a partir de 100. Só os testes de componente cobrem isso, com
  hooks mockados.
- Popover em 375 px sem rolagem horizontal, em light e dark; a rolagem interna da lista funciona com 10, 20
  e 25 itens (desvio 4).
- Os três idiomas: título, corpo, `aria-label` do sino e a data formatada; trocar o idioma muda o texto da
  mesma notificação (F1).
- Clicar em "Pagamento pendente" navega para `/{locale}/account?tab=billing`, marca como lida e fecha o
  popover (F4). Sob impersonação, navega sem marcar.
- "Carregar mais" até a terceira página e o botão sumindo na última (F3).
- Aba escondida por mais de 2 minutos não chama `unread-count`; voltar para a aba chama uma vez (F10).
  Instrumento sugerido: painel de rede ou contagem no log do `next dev` da `api`.
- Ao navegar entre páginas, a contagem se refaz só se tiver mais de 30 s (o hook usa `refetchQueries` com
  `stale: true`). Coberto no `useNotifications.test.tsx`, não no browser.
- O erro da lista mostra o texto traduzido do `error.code` e o botão "Tentar de novo". Repro: derrubar o
  emulador com o popover fechado e abri-lo.
- Toast de erro do "marcar todas" com o estado restaurado. Repro: forçar 503 (sem emulador) e clicar.
- O tipo `legacyTypeRemoved` do seed aparece com o texto genérico.

## Pendências de infra (não reprovam)

Registradas no `docs/PRE-PRODUCTION.md` §1.9, sem nada provisionado:

- publicar os dois índices de `notification` (`deploy --only firestore:indexes`);
- ligar a TTL em `notification.expiresAt` (exige faturamento ativo). Sem ela, os documentos ficam até a
  exclusão da conta;
- a TTL de `notification` entra na lista de reaplicação depois de restaurar backup (`docs/BACKUP.md`).

A §1.8 marca as duas entradas novas como "não medido": a medição de publicação é de 2026-09-23 e não rodei
nada contra o projeto real.

## Decisões em aberto

As nove perguntas do plano seguem com a opção adotada lá; nada nesta etapa mudou a resposta delas. Uma
nova:

- **Ids inválidos em `entities/[id]`.** O mesmo `%2F` que chegou ao handler de notificações deve chegar ao
  de `entity` e virar 500 no `doc(id)`. Não medi nem corrigi, por estar fora do escopo. Vale um achado no
  backlog ou uma correção pequena no `/review`.

## Validação (gates)

| Gate | Comando | Resultado |
|---|---|---|
| lint/format | `pnpm check` | 965 arquivos, sem erro |
| typecheck | `pnpm turbo run typecheck --filter=api --filter=app --filter=@repo/sdk --filter=@repo/internationalization` | 4 de 4 tasks ok (`@repo/shared` não tem task de typecheck) |
| testes `api` | `pnpm turbo run test --filter=api` | 112 arquivos, 1436 testes passando |
| testes `app` | `pnpm turbo run test --filter=app` | 115 arquivos, 957 testes passando |
| paridade i18n | `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes passando |
| demais pacotes | mesma linha do turbo com `--filter=@repo/sdk --filter=@repo/shared` | sdk 11, shared 56, todos passando |

`test:emulator` não rodou: nenhum teste novo usa emulador, e nada em rules ou storage mudou.

## Testes novos e editados

Novos na `api`: `notificationMapper.test.ts`, `notificationRepository.test.ts` (fake de Firestore próprio,
com `count` que respeita `limit`, `create` com ALREADY_EXISTS e `batch.update`), `notificationsRoute.test.ts`,
`notificationsRouteImpersonation.test.ts` (guard real), `subscriptionNotifications.test.ts`,
`welcomeNotification.test.ts`. Editados: `firestoreIndexes`, `accountErasure`, `accountExportRoute`,
`paymentsWebhookRoute` (cinco casos novos), `signUpProfile` e `googleSignInProfile` (asserção de emissão),
`userMergeArchivedProfile`, `mergedUserPayload`, `usersRoute` (só mock).

Novos na `app`: `notificationCopy.test.ts` (dicionário real nos três idiomas), `useNotifications.test.tsx`
(chaves, `enabled`, opções do polling, refetch ao navegar, otimismo com rollback, nenhum
`invalidateQueries`), `notificationsBell.test.tsx`.

## Lacunas de teste conhecidas

- O índice publicado e a TTL só existem contra o projeto real.
- Nenhum teste prova o polling de 120 s em tempo real nem o comportamento com a aba escondida: o teste lê as
  opções do observer (`refetchInterval`, `refetchIntervalInBackground: false`, `refetchOnWindowFocus: true`),
  não o relógio.
- A corrida entre dois eventos diferentes da Stripe para o mesmo perfil pode emitir dois avisos de tipos
  diferentes (aceito no plano, §4.8). Sem teste.
