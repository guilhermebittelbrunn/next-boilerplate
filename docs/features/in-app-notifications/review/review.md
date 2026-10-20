# Revisão: central de notificações no app

- **Escopo:** o diff inteiro do working tree (SDK, `packages/shared`, `apps/api`, `apps/app`, i18n, docs e a
  auditoria do backlog), lido contra o [`docs/review-checklist.md`](../../../review-checklist.md) e o
  [`develop/handoff.md`](../develop/handoff.md). Rodada autônoma do `/cycle`, 2026-10-20.
- **Spec:** [`specs/in-app-notifications.md`](../../../../specs/in-app-notifications.md). O que foi implementado
  bate com os seis itens do corte de MVP. Nada de "Fora do corte" entrou (sem tempo real, sem preferências, sem
  broadcast, sem sino no painel admin).

## Branch

| campo | valor |
|---|---|
| nome | `feat/in-app-notifications` |
| como | criada com `git checkout -b` a partir de `guilhermebittelbrunn/tarefa-demorada-valor` na hora dos commits (o workspace do Conductor mantém o nome da branch atual) |
| base | `main` em `9b37e02` |
| por que criar e não renomear | a branch atual não tem commit próprio (`git log origin/main..HEAD` vazio) nem upstream, então renomear bastaria; mas o workspace do Conductor não deve ter a branch atual renomeada, por isso a branch nova sai dela com `checkout -b` |
| por que sem `<project>` | o diff cruza `apps/api`, `apps/app` e três pacotes; a regra manda omitir o projeto quando a tarefa cruza apps, como nas PRs #44, #45, #47 e #48 (E11 do backlog) |
| regex do `/review` | `branch OK: feat/in-app-notifications` |

Nada foi commitado nem enviado ao remoto.

## Achados

| sev. | arquivo:linha | problema | ação |
|---|---|---|---|
| 🟡 | `apps/api/app/(routes)/entities/[id]/route.ts:21-22`, `:37-38`, `:99-100`; `apps/api/app/(routes)/users/[id]/route.ts:113-114`, `:176-177` | Um id com `%2F` chega ao handler (o `/develop` mediu isso na rota de notificações) e vai direto para `findById`, que chama `doc(id)`. O driver do Firestore lança com caminho inválido, e a resposta seria 500. `account/sessions/[id]` e `account/sign-in-methods/[id]` validam o id antes e não têm o problema. | Não corrigido: fora do escopo (mudanças mínimas). O lugar natural da correção é `resolveIdFromContext` (`apps/api/(shared)/lib/resolve-route-id.ts:8-13`) com o `isUsableDocumentId` que esta entrega exportou. Fica como achado para o backlog. |
| 🟢 | `packages/internationalization/translations/apps/app/shared/notifications.ts:5` | O `aria-label` do sino com não lidas era "Notificações, {count} não lidas", que lê "1 não lidas" com uma notificação. | Corrigido nos três idiomas para a forma sem concordância: "Notificações (não lidas: {count})", "Notifications (unread: {count})", "Notificaciones (sin leer: {count})". |
| 🟢 | `apps/app/shared/hooks/useListNotifications.ts:16-27` com `apps/app/shared/providers/QueryProvider.tsx:6` | A lista herda o `staleTime` global de 60 s. Se a contagem sobe pelo polling e a pessoa reabre o popover dentro desses 60 s, o badge mostra a nova e a lista ainda não. Depois de 60 s, abrir refaz. | Não corrigido: muda o custo de leitura por abertura. Vai em "Decisões em aberto" e na lista do `/test`. |
| 🟢 | `apps/api/(shared)/repositories/notification.repository.ts:63-67` | `markRead` usa `update`, que lança `NOT_FOUND` se o documento sumir entre o `findById` da rota e a escrita (TTL ou expurgo no mesmo instante). Daria 500. Janela de milissegundos. | Registrado, sem mudança. |
| 🟢 | `apps/api/app/(routes)/webhooks/payments/route.ts:92`, `:108-110` | O estado anterior da assinatura vem do `findSubscriptionOwner`, lido fora da transação de `applySubscriptionState`. Dois eventos diferentes e concorrentes para o mesmo perfil podem gerar dois avisos de tipos diferentes. | Registrado. O plano já aceitou isso (§4.8); o `event.id` no id do documento impede a duplicata da reentrega do mesmo evento. |
| ✅ | `apps/api/app/(routes)/notifications/[id]/read/route.ts:24-27` | Posse: `!row \|\| row.userId !== ctx.subjectProfile.id` responde 404 `NOTIFICATION_NOT_FOUND`. Lista, contagem e "marcar todas" filtram por `ctx.subjectProfile.id` (`notifications/route.ts:15-18`, `unread-count/route.ts:8-10`, `read-all/route.ts:8-10`). Nenhuma rota aceita id de dono vindo do cliente. | |
| ✅ | `apps/api/app/(guards)/common-panel.ts:65-71`, `apps/api/(shared)/lib/impersonation-read-only.ts:5`, `:23` | Impersonação somente leitura: as duas rotas de escrita são `POST`, e o guard recusa tudo fora de `GET`/`HEAD`/`OPTIONS` com 403 antes do handler. A UI espelha: botões desabilitados e link sem marcar (`NotificationsList.tsx:106`, `:134`; `NotificationItem.tsx:68-73`, `:120`). | |
| ✅ | `apps/api/(shared)/repositories/notification.repository.ts:105-114`, `apps/api/scripts/seed-emulator.mjs` (`createNotifications`) | `readAt: null` gravado de forma explícita na emissão e no seed. O único caminho de criação é `emitOnce`. | |
| ✅ | `notifications/route.ts:35-40`, `unread-count/route.ts:14-19`, `read-all/route.ts:14-19` | Sem índice, 503 com `PAGINATION_INDEX_MISSING` ou `NOTIFICATIONS_INDEX_MISSING`; outro erro sobe sem ser mascarado. Os dois códigos novos estão em `apiErrors` nos três idiomas. | |
| ✅ | `apps/api/(shared)/lib/account-export.ts:146-149`, `:172-175`; `account-erasure.ts:129-131` | Exportação traz as notificações com `truncated`; o expurgo tem passo próprio `notifications` antes de `profile`, por `profileId`. | |
| ✅ | `apps/api/app/(routes)/webhooks/payments/route.ts:106-119` | A emissão só roda com `result === "applied"`, é silenciosa (`emitNotificationQuietly` captura e loga só o nome do erro) e usa `event.id` como chave. A reconciliação e a marcação do evento não dependem dela. | |
| ✅ | `apps/api/(shared)/lib/user-merge.ts:70`, `apps/api/app/(routes)/auth/sign-up/route.ts:55` | `createDefaultUserProfile` virou `async`. Os dois chamadores aguardam: o cadastro com `await`, e `findOrCreateProfile` devolve a promessa dentro de uma função `async`, que o chamador aguarda. A emissão silenciosa não dispara o rollback da conta no cadastro. | |
| ✅ | `apps/app/shared/hooks/*Notification*.ts` | `useListNotifications` com `enabled` do popover; contagem com `refetchIntervalInBackground: false` e `refetchOnWindowFocus: true`; marcar uma e todas são otimistas com snapshot e rollback no `onError`, sem `invalidateQueries`. Os dois hooks passam pelos wrappers autorizados. A troca de sujeito já faz `resetQueries` (`AuthRequestPanelContext.tsx:192`), então a chave sem id de sujeito não mistura usuários. | |
| ✅ | componentes e dicionário | Nenhuma string de UI solta. `aria-label` no sino e no botão de marcar; ícones com `aria-hidden`; ponto de não lida com `sr-only`. Paridade conferida pelo teste do pacote. | |
| ✅ | código novo e testes | Nenhum comentário cita plano, etapa, revisão ou card. Os comentários que existem explicam restrição do Firestore ou da Stripe. | |
| ✅ | `packages/shared/utils/helpers/log.ts:11` | `"notifications"` no `LogScope`: uma linha num pacote fora do plano, necessária porque a lista é fechada. Aceito. | |

Nada bloqueante.

## Correções aplicadas

- `packages/internationalization/translations/apps/app/shared/notifications.ts:5`, `:40`, `:75`: o
  `triggerLabelUnread` deixou de depender de concordância de número. O teste `notificationsBell.test.tsx` monta o
  rótulo a partir do dicionário e seguiu passando.

## Raio de impacto

- `@repo/sdk`: tipos e `apiClient.notification` novos, consumidos só pela `apps/api` e pelos hooks do sino.
  `AccountDataExportDTO.notifications` é aditivo; o único consumidor no front baixa o JSON sem ler campos.
- `isUsableDocumentId` passou a ser exportado de `apps/api/(shared)/lib/pagination.ts`; o comportamento do cursor
  não mudou.
- `createDefaultUserProfile` mudou a assinatura para `async` com o mesmo retorno; dois chamadores, ambos
  conferidos.
- `Navbar` ganhou a prop opcional `notifications`. Só o layout comum a passa; o painel admin segue sem sino.
- `firestore.indexes.json` ganhou duas entradas, pendentes de publicação (`PRE-PRODUCTION.md` §1.9).

## Verificar no `/test`

O que segue não dá para confirmar lendo código. A primeira linha é a de maior risco.

1. **Boas-vindas no primeiro login com Google.** O `/develop` mediu o cadastro por senha, não o caminho
   `findOrCreateProfile`. Repro: conta nova pelo Google no emulador, abrir o painel e ver uma `welcome` não lida e
   contagem 1.
2. **Polling só com a aba visível.** Os testes leem as opções do observer, não o relógio. Repro: aba escondida por
   mais de 2 min sem chamadas a `/notifications/unread-count` no log da `api`; voltar à aba gera uma chamada.
3. **Contagem ao navegar.** Refaz só se tiver mais de 30 s. Repro: navegar duas vezes em menos de 30 s (uma
   chamada no máximo) e de novo depois de 30 s (uma chamada).
4. **Lista desatualizada ao reabrir.** Repro: abrir e fechar o popover, emitir uma notificação nova para o dono
   (seed ou webhook), esperar o badge subir e reabrir em menos de 60 s. Registrar se a nova aparece.
5. **Badge e rótulo acessível:** sem badge com 0, número exato até 99, `99+` a partir de 100, e o `aria-label`
   novo nos três idiomas.
6. **Popover em 375 px**, light e dark, sem rolagem horizontal; rolagem interna com 10, 20 e 25 itens.
7. **Destino e marcação:** clicar em "Pagamento pendente" vai para `/{locale}/account?tab=billing`, marca como lida e
   fecha. Sob impersonação, navega sem marcar, e "marcar todas" e o botão de cada item ficam desabilitados.
8. **"Carregar mais"** até a terceira página com o seed de 25, e o botão some na última.
9. **Erros:** lista com o texto traduzido do `error.code` e "Tentar de novo" (derrubar o emulador e abrir o
   popover); "marcar todas" com toast e estado restaurado quando a API falha.
10. **`legacyTypeRemoved`** do seed aparece com o texto genérico.
11. **`%2F` no `[id]/read`:** `POST /notifications/a%2Fb/read` responde 404 `NOTIFICATION_NOT_FOUND`, não 500. O
    `/develop` mediu com `curl`; não há teste unitário.
12. **503 com índice faltando contra o projeto real:** o emulador não cobra índice. Fica 🔒 sem projeto real.
13. **Webhook com evento real da Stripe** (`past_due` simulado pela CLI): exige chaves de teste. Sem elas, 🔒; o
    caminho está coberto por teste com mock.

## Lacunas de teste

| lacuna | veredito |
|---|---|
| Índice publicado e TTL só existem no projeto real (handoff) | continua aberta; é infra, `PRE-PRODUCTION.md` §1.9 |
| Polling de 120 s e aba escondida sem teste de relógio (handoff) | continua aberta; item 2 da lista acima |
| Corrida entre dois eventos diferentes da Stripe para o mesmo perfil (handoff) | continua aberta, aceita no plano |
| `[id]/read` com id inválido responde 404 sem tocar no repositório (`notifications/[id]/read/route.ts:20-22`) | nova, aberta; cabe um caso em `notificationsRoute.test.ts` |
| Boas-vindas pelo primeiro login com Google ponta a ponta | nova, aberta; `googleSignInProfile.test.ts` cobre com mock, o item 1 mede |

## Decisões em aberto

- **Frescor da lista ao reabrir o popover.** Recomendação: deixar como está e decidir com o número do item 4 do
  `/test`. Se a diferença incomodar, `staleTime: 0` no `useListNotifications` refaz ao abrir, ao custo de uma
  leitura por página carregada a cada abertura.
- **Id inválido em `entities/[id]` e `users/[id]`.** Recomendação: achado no backlog com a correção em
  `resolveIdFromContext`, numa tarefa própria.

## Gates

| gate | comando | resultado |
|---|---|---|
| lint/format | `pnpm check` | 965 arquivos, sem erro |
| typecheck | `pnpm turbo run typecheck --filter=api --filter=app --filter=@repo/sdk --filter=@repo/internationalization` | 4 de 4 (3 do cache) |
| paridade i18n | `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes |
| testes da correção | `pnpm --filter app exec vitest run __tests__/notificationsBell.test.tsx __tests__/notificationCopy.test.ts` | 2 arquivos, 22 testes |

As suítes inteiras de `api` (1436) e `app` (957) não foram rodadas de novo: a correção só tocou uma string, e os
dois arquivos que leem essa chave rodaram acima. Os números são os do handoff.

## Varredura de segredo nos artefatos

`rg` por senha, token, chave e e-mail em `docs/features/in-app-notifications/`: só aparecem as contas do seed
(`user@example.com`, `user2@example.com`), o nome do código `AUTH_INVALID_TOKEN` e um cursor de exemplo em base64
(`{"v":1,"id":"welcome_u9KxPq"}`). Nada a remover.

## Plano de commits

Ordem de dependência, um assunto por commit. Mensagens finais em inglês.

1. `feat(sdk): add notifications contract and client actions`
   - `packages/sdk/src/types/notification/notification.ts`
   - `packages/sdk/src/types/notification/index.ts`
   - `packages/sdk/src/actions/notification/action.ts`
   - `packages/sdk/src/types/index.ts`
   - `packages/sdk/src/client/index.ts`
2. `feat(sdk): include notifications in the account data export type`
   - `packages/sdk/src/types/account/account.ts`
3. `feat(shared): add notifications log scope`
   - `packages/shared/utils/helpers/log.ts`
4. `feat(api): store and emit notifications once per key`
   - `apps/api/(shared)/mappers/notification.mapper.ts`
   - `apps/api/(shared)/repositories/notification.repository.ts`
   - `apps/api/(shared)/lib/notifications.ts`
   - `firestore.indexes.json`
   - `apps/api/__tests__/notificationMapper.test.ts`
   - `apps/api/__tests__/notificationRepository.test.ts`
   - `apps/api/__tests__/firestoreIndexes.test.ts`
5. `feat(api): add notification list, unread count and mark-read routes`
   - `apps/api/app/(routes)/notifications/route.ts`
   - `apps/api/app/(routes)/notifications/unread-count/route.ts`
   - `apps/api/app/(routes)/notifications/read-all/route.ts`
   - `apps/api/app/(routes)/notifications/[id]/read/route.ts`
   - `apps/api/(shared)/lib/pagination.ts`
   - `apps/api/__tests__/notificationsRoute.test.ts`
   - `apps/api/__tests__/notificationsRouteImpersonation.test.ts`
6. `feat(api): send a welcome notification when a profile is created`
   - `apps/api/(shared)/lib/user-merge.ts`
   - `apps/api/__tests__/welcomeNotification.test.ts`
   - `apps/api/__tests__/signUpProfile.test.ts`
   - `apps/api/__tests__/googleSignInProfile.test.ts`
   - `apps/api/__tests__/userMergeArchivedProfile.test.ts`
   - `apps/api/__tests__/mergedUserPayload.test.ts`
   - `apps/api/__tests__/usersRoute.test.ts`
7. `feat(api): notify subscription status changes from the payments webhook`
   - `apps/api/(shared)/lib/subscription-notifications.ts`
   - `apps/api/app/(routes)/webhooks/payments/route.ts`
   - `apps/api/__tests__/subscriptionNotifications.test.ts`
   - `apps/api/__tests__/paymentsWebhookRoute.test.ts`
8. `feat(api): include notifications in account export and erasure`
   - `apps/api/(shared)/lib/account-export.ts`
   - `apps/api/(shared)/lib/account-erasure.ts`
   - `apps/api/__tests__/accountExportRoute.test.ts`
   - `apps/api/__tests__/accountErasure.test.ts`
9. `chore(api): seed notifications in the emulator`
   - `apps/api/scripts/seed-emulator.mjs`
10. `feat(app): add notification data hooks`
    - `apps/app/shared/lib/queryKeys.ts`
    - `apps/app/shared/lib/pagination.ts`
    - `apps/app/shared/hooks/useListNotifications.ts`
    - `apps/app/shared/hooks/useUnreadNotificationsCount.ts`
    - `apps/app/shared/hooks/useNotificationActions.ts`
    - `apps/app/__tests__/useNotifications.test.tsx`
11. `feat(app): add the notifications bell to the common panel navbar`
    - `apps/app/shared/lib/notifications.ts`
    - `apps/app/shared/components/notifications/NotificationsBell.tsx`
    - `apps/app/shared/components/notifications/NotificationsList.tsx`
    - `apps/app/shared/components/notifications/NotificationItem.tsx`
    - `apps/app/shared/components/ui/Navbar.tsx`
    - `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx`
    - `apps/app/__tests__/notificationsBell.test.tsx`
    - `apps/app/__tests__/notificationCopy.test.ts`
12. `feat(internationalization): add notifications copy and error codes`
    - `packages/internationalization/translations/apps/app/shared/notifications.ts`
    - `packages/internationalization/translations/apps/app/shared/index.ts`
    - `packages/internationalization/translations/packages/shared/utils.ts`
13. `docs(specs): backlog audit after PR #51`
    - `specs/BACKLOG.md`
    - `specs/social-sign-in-providers.md`
    - `specs/account-security-mfa.md`
    - `specs/observability-logging.md`
    - `specs/in-app-notifications.md`
14. `docs: document notification types for forks, payments, privacy records and subprocessors`
    - `docs/FORKING.md`
    - `docs/PAYMENTS.md`
    - `docs/ROPA.md`
    - `docs/SUBPROCESSORS.md`
15. `docs: notification indexes and TTL, plus erasure step count and TTL step reference fixes`
    - `docs/PRE-PRODUCTION.md`
    - `docs/BACKUP.md`
    - Commit misto de propósito: nos dois arquivos, a correção (passo 6 da TTL de `paymentEvent`, oito passos de
      expurgo) está na mesma linha ou parágrafo do texto novo de notificações, e separar exigiria `git add -p`.
16. `docs(features): in-app-notifications`
    - `docs/features/in-app-notifications/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`, `review/review.md`)

Os commits 10 e 11 dependem das chaves do commit 12; o typecheck só fecha no commit 12. É a ordem que a regra pede.

Título de PR sugerido: `feat: in-app notifications center`.

### Commits realizados

(preenchido pelo `/review` depois de commitar)
