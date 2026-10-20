# Plano: central de notificações no app

- **Spec:** [`specs/in-app-notifications.md`](../../../../specs/in-app-notifications.md), corte de MVP inteiro.
- **Status da spec:** segue `proposed`. Entrou no ciclo por instrução direta do usuário (focar numa tarefa maior
  nesta rodada). A auditoria de 2026-10-19 já a recomendava como #1 do backlog (`specs/BACKLOG.md:261`) e a D6
  (2026-10-16) decidiu que o core terá o recurso com este corte. Aprovar a spec continua sendo decisão do usuário
  (`.claude/cycle-policy.md` §1); este plano não muda o `status`, só preenche `feature: in-app-notifications`.
- **Rodada:** autônoma (`/cycle`), 2026-10-20, HEAD `9b37e02`. Ninguém foi consultado. Cada decisão não trivial
  está em "Perguntas em aberto", com a opção adotada, a descartada e o motivo.
- **Branch:** nenhuma. Quem cria é o `/review`.

## Resumo

Uma coleção nova, `notification`, guarda um documento por aviso, com dono (`userId`), tipo, parâmetros, `readAt`
e `expiresAt` (90 dias). O texto nunca é gravado: a app resolve título e corpo no dicionário do idioma de quem lê,
a partir do tipo e dos parâmetros, como já faz com os `apiErrors`.

A API ganha quatro rotas sob `requireCommonPanelApi`: listar (paginada por cursor, como `entity`), contar não
lidas, marcar uma e marcar todas. As duas escritas são `POST`, então o guard já as recusa sob impersonação com
`403 AUTH_REQUEST_IMPERSONATION_READ_ONLY` (`impersonation-read-only.ts:19-31`). O ponto único de emissão é
`emitNotification()` em `apps/api/(shared)/lib/notifications.ts`, com id determinístico para que reentrega e
corrida não dupliquem aviso. Dois produtores usam esse ponto: as boas-vindas, em `createDefaultUserProfile`
(`user-merge.ts:72-81`), e a mudança de status da assinatura, no webhook (`webhooks/payments/route.ts:83-110`).

Na app, um sino entra na `Navbar` só do painel comum, com o número de não lidas atualizado a cada 2 minutos com a
aba visível, ao voltar para a aba e ao navegar. O sino abre um popover com a lista, "marcar todas", "carregar
mais" e estado vazio. Sob impersonação o admin vê tudo e os botões de marcar ficam desabilitados.

As notificações entram na exportação de dados do titular e saem num passo próprio do expurgo. Nenhuma
dependência nova, nenhuma variável de ambiente nova, nenhum componente novo no design system.

## Fontes lidas

| Fonte | O que dela entra no plano |
|---|---|
| `specs/in-app-notifications.md` | corte de MVP, fora do corte, retenção de 90 dias recomendada, dois produtores |
| `specs/BACKLOG.md:254-298`, `:370-405` | recomendação #1, `contends_on`, lote 1 com `magic-link-sign-in` (conjuntos disjuntos), o que decidir aqui |
| `.claude/cycle-policy.md` | escada de decisão, modo degradado obrigatório, pré-requisito de infra não reprova |
| `docs/feature-analysis-guide.md` | roteiro das seções abaixo |
| Slice `entity` (API, SDK, app, i18n) | forma de rota, repositório, mapper, hooks, pagination por cursor |
| `docs/PRE-PRODUCTION.md` §1.1-1.8, §12 passo 6 | como os índices e a TTL de `paymentEvent` são documentados |
| Docs do Firestore (via Firebase Developer Knowledge, lidos em 2026-10-20) | cobrança de `count()`, cota gratuita, comportamento da TTL, index merging (detalhe na §2.3) |

---

# Etapa 1: análise

## 1. Contexto

### 1.1 O que é

Um lugar no painel onde o produto avisa o usuário de algo que mudou na conta enquanto ele não olhava, com posse,
idioma e retenção resolvidos no core. O core traz dois avisos próprios; o valor está em cada fork ganhar onde
pendurar os dele.

### 1.2 Objetivos (o corte de MVP da spec)

1. Sino na barra do painel comum com o número de não lidas, atualizado ao navegar e em intervalo curto.
2. Lista no popover, mais recentes primeiro, paginada, com marcar uma, marcar todas e estado vazio. Uma notificação
   pode levar à tela relacionada.
3. A notificação guarda tipo e parâmetros. O texto sai do dicionário no idioma de quem lê.
4. Ponto único de emissão no servidor, só para o dono, e dois produtores: boas-vindas na criação da conta e mudança
   de status da assinatura (pagamento pendente, cancelada, reativada).
5. Entram na exportação, saem no expurgo e expiram depois de um prazo.
6. Sob impersonação, o admin vê o sino do usuário e não consegue marcar nada como lido.

### 1.3 Fora do escopo (mantido da spec)

Tempo real, preferências por tipo ou canal, e-mail e push, aviso do admin para todos (broadcast), notificações para
o painel admin, agrupamento e resumo diário. Também fica fora: apagar uma notificação pela UI (ela some por TTL ou
pelo expurgo da conta) e prefetch RSC do sino (ver §5.1).

### 1.4 Apps, área e modo

| Item | Resposta |
|---|---|
| Apps | `packages/sdk`, `apps/api`, `apps/app`, `packages/internationalization`. `apps/web`: N/A. `packages/design-system`: só consumo (`Popover`, `Badge`, `Empty`, `Item`, `ScrollArea`, `Button`), nenhum arquivo alterado |
| Área do painel | comum. O sino entra pelo layout `(common)` (`(common)/layout.tsx:61`). O layout admin (`admin/layout.tsx:50`) usa a mesma `Navbar` e não ganha sino. O admin personificando cai no layout comum, então vê o sino do usuário |
| Modo de produto | os dois. Em `simple`, o painel comum continua acessível ao usuário comum (medido em 2026-09-25, `docs/AUTH-SSO.md:99-106`), então o sino funciona; o produtor de assinatura simplesmente não dispara, porque não chega evento da Stripe |
| Assinatura/plano | não depende. O sino não passa por `requirePlanApi` |
| Dependências externas | Firestore. Stripe só para o segundo produtor. Nenhuma variável nova |
| Genérico × específico | genérico: tudo em `apps/*`, só o contrato em `packages/sdk` e o texto em `packages/internationalization`, como `entity` |

## 2. Dados (Firestore)

### 2.1 Coleção `notification`

Nome no singular, como `entity`, `session` e `paymentEvent`.

| Campo | Tipo | Default | `null`? | Por quê |
|---|---|---|---|---|
| `userId` | string | (obrigatório) | não | id do documento de perfil (`user`), não o uid do Auth, igual a `entity.userId` (`entity.repository.ts:23`). É o filtro de dono |
| `type` | string | (obrigatório) | não | chave do texto no dicionário. Valores do core em §10.1 |
| `params` | map de `string \| number \| boolean \| null` | `{}` | não | entra na interpolação do texto. Nunca texto pronto |
| `readAt` | timestamp | `null` | sim | `null` = não lida. **Tem de ser gravado como `null`**: medido no emulador nesta rodada, um documento sem o campo não casa com `where("readAt", "==", null)` (contagem 0). O mesmo efeito já está documentado para `deletedAt` em `apps/api/scripts/seed-emulator.mjs:124-126` |
| `expiresAt` | timestamp | `createdAt + 90 dias` | não | campo da política de TTL, como `paymentEvent` (`payment-event.repository.ts:5-6`, `:43-45`) |
| `createdAt`, `updatedAt` | timestamp | instante da emissão | não | ordenação da lista; `updatedAt` muda ao marcar como lida |
| `deletedAt` | `null` | `null` | sim | gravado só para manter a forma de `BaseRepository` (`findById` em `base.repository.ts:148-151` lê o campo). Notificação não tem soft delete |

Nome alternativo considerado para `readAt`: `read: boolean`. Ficou `readAt` porque guarda o instante (útil na
exportação) e o `null` já é a convenção do repo para "ainda não aconteceu" (`revokedAt` em `session.mapper.ts:22`).

Id do documento: determinístico, `<type>_<dedupeKey>` (ex.: `welcome_<profileId>`,
`subscriptionPaymentPending_<eventId>`). Escrito com `doc(id).create()`, que falha com código gRPC 6 se o id já
existe (medido no emulador: `create dup error code: 6`), e o repositório trata isso como "já emitida", igual a
`paymentEventRepository.markProcessed` (`payment-event.repository.ts:34-53`). Sem `dedupeKey`, cai no id
automático do Firestore (`add`). Os ids passam no `isUsableDocumentId` do cursor (`pagination.ts:18-27`): não têm
`/` nem a forma `__x__`.

### 2.2 Consultas

| # | Uso | Consulta | Índice |
|---|---|---|---|
| Q1 | lista paginada | `userId == X`, `orderBy createdAt desc`, `orderBy __name__ desc`, `startAfter`, `limit` (o `paginate` de `base.repository.ts:96-132`) | **composto novo** `notification (userId ASC, createdAt DESC)` |
| Q2 | contar não lidas | `userId == X`, `readAt == null`, `limit(100)`, `count()` (`countQuery` de `base.repository.ts:138-141`) | **composto novo** `notification (userId ASC, readAt ASC)` |
| Q3 | marcar todas | mesma forma de Q2, sem `count`, `limit(500)` por lote | o mesmo de Q2 |
| Q4 | exportação | `userId == X`, `limit(5001)` | campo único, automático |
| Q5 | expurgo | `userId == X`, `limit(500)` por lote (`purgeAll`, `base.repository.ts:243-261`) | campo único, automático |
| Q6 | marcar uma | `doc(id).get()` + `update` | nenhum |

Sem filtro por `deletedAt` (não há soft delete), e sem filtro por `expiresAt`. A doc do Firestore diz que um
documento vencido "continua aparecendo nas consultas até a TTL de fato apagá-lo", tipicamente em até 24 horas
(`documents/firebase.google.com/docs/firestore/ttl`). Um dia a mais sobre 90 não justifica um filtro de
intervalo, que mudaria o índice de Q1 e passaria a cobrar entradas de índice lidas.

O limite do `BaseRepository` (sem paginação, filtro em memória) não pesa aqui: Q1 usa o `paginate` protegido que
a PR #17 trouxe, e nada filtra em memória.

### 2.3 Medições desta rodada

Emulador de Firestore isolado (porta 8095, projeto `demo-notif-measure`, JDK 21 de
`/opt/homebrew/opt/openjdk@21`), subido e derrubado por este passo, portas conferidas livres depois. Script com o
`firebase-admin` da `apps/api`.

| Medição | Resultado |
|---|---|
| `count()` com `userId == A` + `readAt == null` (6 não lidas de 9) | `6` |
| a mesma com `.limit(3).count()` | `3`: o teto funciona na agregação |
| contagem do outro dono | `1`, sem vazamento entre donos |
| Q1 em duas páginas, com dois documentos no mesmo `createdAt` | página 1 `[n_0, n_1, n_2, tie_a]`, página 2 `[n_3 … n_6]`: sem repetição nem salto, o desempate por id funciona |
| `create()` num id existente | erro com `code: 6` (ALREADY_EXISTS) |
| consulta sem índice (`expiresAt >` + `orderBy createdAt`) | servida (9 documentos): **o emulador não cobra índice composto**, como `firestoreIndexes.test.ts:22-25` já registra |
| marcar todas em lote | não lidas de A foram a `0`; as de B ficaram em `1` |
| documento sem o campo `readAt` | **não** conta em `readAt == null` (0) |

Consequências para o desenho: o emulador prova a semântica, nunca o índice. O índice fica provado só pelo
`firestoreIndexes.test.ts` (o arquivo versionado) e pelo deploy, como os sete anteriores. E `readAt: null`
explícito é requisito de correção, não estilo: o teste do repositório cobra isso.

**Q2 exige índice composto?** A doc do Firestore diz que consultas só com igualdade podem ser servidas por index
merging, sem índice composto (`documents/firebase.google.com/docs/firestore/query-data/index-overview`, "Use
index merging"). Mesmo assim o plano declara `(userId, readAt)`, por dois motivos: o repo já adota essa postura
para as contagens da home (`docs/PRE-PRODUCTION.md` §1.5, `firestore.indexes.json:12-29`), e a agregação cobra
uma leitura por lote de até 1000 entradas de índice lidas (`.../firestore/pricing`, "Aggregation queries"). Com o
índice composto, as entradas lidas são só as não lidas do dono; com merge, o custo depende do formato dos dados.

### 2.4 Custo do contador e intervalo escolhido

Cada consulta ao contador custa, medido no código:

| Leitura | Onde | Leituras |
|---|---|---|
| sessão por id | `trackSession` → `sessionRepository.findByUidAndKey` (`session-tracker.ts`, chamado de `resolve-api-actor.ts:70-74`) | 1 |
| perfil do ator | `requireCommonPanelApi` → `findByReferenceId` (`common-panel.ts:45-47`) | 1 |
| perfil do sujeito | `common-panel.ts:73-75` (mesmo uid fora da impersonação) | 1 |
| `count()` | Q2, até 1000 entradas de índice = 1 leitura, mínimo de 1 mesmo com zero | 1 |
| **total** | | **4 leituras** |

Escritas do guard (`touchSeen`, `recordUserActivity`) acontecem no máximo uma vez por janela de 15 minutos
(`activity-windows.ts:8`), com ou sem sino. O guard custa 3 das 4 leituras; o `count()` é o menor pedaço.

Cota gratuita: 50.000 leituras por dia (`documents/firebase.google.com/docs/firestore/quotas`).

| Intervalo | Leituras por usuário por hora de aba aberta | Horas de aba aberta que cabem na cota diária só com o sino |
|---|---|---|
| 30 s | 480 | ~104 |
| 60 s | 240 | ~208 |
| **120 s (adotado)** | **120** | **~416** |
| 300 s | 48 | ~1040 |

**Adotado: 120 s**, com três travas que cortam leitura sem perder atualidade:

- `refetchIntervalInBackground: false` (o padrão do React Query): aba escondida não consulta;
- `refetchOnWindowFocus: true` só neste hook (o `QueryProvider` desliga globalmente, `QueryProvider.tsx:23`): ao
  voltar para a aba, o número se atualiza na hora;
- ao mudar de rota, refaz se o dado tiver mais de 30 s (`staleTime`). É o "atualizado ao navegar" da spec.

O intervalo vive numa constante (`NOTIFICATIONS_POLL_INTERVAL_MS` em `apps/app/shared/lib/pagination.ts`, ao lado
dos tamanhos de página) para o fork ajustar. Alternativas descartadas estão na pergunta 2.

## 3. Contrato `@repo/sdk`

Recurso novo, `notification`, contexto `common`. Forma completa em §10.1.

| Método | HTTP | Retorno |
|---|---|---|
| `list(query?: PageQuery)` | `GET /notifications` | `PageDTO<NotificationDTO>` |
| `unreadCount()` | `GET /notifications/unread-count` | `NotificationUnreadCountDTO` |
| `markRead(id)` | `POST /notifications/{id}/read` | `{ id: string; readAt: string }` |
| `markAllRead()` | `POST /notifications/read-all` | `{ updated: number }` |

Sem `CreateRequest`: ninguém cria notificação pela API. A emissão é interna ao servidor.

Mudanças em tipos existentes: `AccountDataExportDTO` (`packages/sdk/src/types/account/account.ts:97-106`) ganha
`notifications: { items: NotificationDTO[]; truncated: boolean }`. É aditivo: o único consumidor no front é o
download do JSON (`downloadJsonFile`), que não lê campos. `format.version` continua `1`, como quando `sessions`
entrou no mesmo tipo.

Registro: `packages/sdk/src/client/index.ts` ganha `notification!: NotificationActions` (o "barril do SDK" do
`contends_on`) e `packages/sdk/src/types/index.ts` ganha `export * from "./notification"`.

## 4. API (`apps/api`)

### 4.1 Rotas

| Método e path | Arquivo | Guard | Resposta |
|---|---|---|---|
| `GET /notifications?limit&cursor` | `app/(routes)/notifications/route.ts` | `requireCommonPanelApi` | `200 { data: { items, nextCursor } }` |
| `GET /notifications/unread-count` | `app/(routes)/notifications/unread-count/route.ts` | `requireCommonPanelApi` | `200 { data: { count } }` |
| `POST /notifications/[id]/read` | `app/(routes)/notifications/[id]/read/route.ts` | `requireCommonPanelApi<RouteIdParamsContext>` | `200 { data: { id, readAt } }` |
| `POST /notifications/read-all` | `app/(routes)/notifications/read-all/route.ts` | `requireCommonPanelApi` | `200 { data: { updated } }` |

`read-all` e `unread-count` são segmentos estáticos irmãos de `[id]`, e `[id]` só responde em `/[id]/read`, então
não há colisão de rota.

`POST` para as duas ações, e não `PATCH`/`PUT`: o repo já usa `POST` para ações sem corpo
(`account/sessions/revoke`, `revoke-others`), e o `PUT` de `entity` é edição de campos pelo cliente, que aqui não
existe. Nenhuma das duas lê corpo, então `parseRequestJson` não entra.

Página: `parseListQuery` (`pagination.schema.ts:24-67`), padrão 20, teto 100. A app pede 10.

### 4.2 Ownership

`[id]/read`: `findById(id)`; se não existe ou `row.userId !== ctx.subjectProfile.id`, `404 NOTIFICATION_NOT_FOUND`
(404 e não 403, para não vazar existência, como `entities/[id]/route.ts:24-29`). Já lida: responde 200 com o
`readAt` original, sem regravar (idempotente; duplo clique não muda o instante). As outras três rotas filtram por
`ctx.subjectProfile.id` na consulta e não recebem id do cliente.

### 4.3 Validação

Não há corpo. O id vem do path por `resolveIdFromContext`. Um id com `/` não chega ao handler (o roteador separa o
segmento); um id inexistente vira 404 pelo `findById`. Nenhum schema Zod novo além do `parseListQuery` existente.

### 4.4 Persistência

- `apps/api/(shared)/repositories/notification.repository.ts`, estendendo `BaseRepository<NotificationDTO>` com o
  mapper no `super(db, "notification", notificationMapper)`. Métodos em §10.4.
- `apps/api/(shared)/mappers/notification.mapper.ts`: normaliza instantes com `normalizeFirestoreInstant`, mantém
  `type` como string (tipo desconhecido não quebra a leitura), filtra `params` para valores primitivos e
  `toPersistence` com whitelist.
- `apps/api/(shared)/lib/notifications.ts`: o ponto único de emissão (`emitNotification`,
  `emitNotificationQuietly`) e o prazo (`NOTIFICATION_RETENTION_DAYS = 90`).
- `apps/api/(shared)/lib/subscription-notifications.ts`: função pura que decide qual aviso (se algum) uma mudança
  de assinatura gera.

### 4.5 Códigos de erro

| `error.code` | Status | Quando | Novo? |
|---|---|---|---|
| `NOTIFICATION_NOT_FOUND` | 404 | `[id]/read` com id inexistente ou de outro dono | **novo** |
| `NOTIFICATIONS_INDEX_MISSING` | 503 | `unread-count` e `read-all` com o índice `(userId, readAt)` não publicado | **novo** |
| `PAGINATION_INDEX_MISSING` | 503 | lista com o índice `(userId, createdAt)` não publicado | existente |
| `PAGINATION_CURSOR_INVALID` | 400 | cursor forjado ou apontando para documento apagado | existente |
| `VALIDATION_FAILED` | 400 | `limit` inválido | existente |
| `AUTH_REQUEST_IMPERSONATION_READ_ONLY` | 403 | `POST` sob impersonação (pelo guard) | existente |
| `AUTH_INVALID_TOKEN` / `COMMON_PANEL_FORBIDDEN` | 401 / 403 | guard | existentes |

Os dois novos entram em `apiErrors` nos três idiomas (`translations/packages/shared/utils.ts`). O teste de paridade
falha sem isso. `NOTIFICATIONS_INDEX_MISSING` em vez de reaproveitar `SUMMARY_INDEX_MISSING` ("O resumo está
indisponível") porque o texto aparece no toast do "marcar todas" e falaria de outra coisa.

### 4.6 Ponto único de emissão

```ts
emitNotification<T extends NotificationType>({ userId, type, params, dedupeKey? })
    : Promise<"created" | "duplicate">
emitNotificationQuietly(input): Promise<void>   // nunca lança; loga `notifications` / `emit-failed`
```

Só o servidor chama. Grava `readAt: null`, `expiresAt = createdAt + 90 dias`, `deletedAt: null`. O tipo de
`params` é amarrado ao `type` por `NotificationParamsByType` no SDK, então o TypeScript recusa parâmetro errado
no produtor.

### 4.7 Produtor 1: boas-vindas

`createDefaultUserProfile` (`user-merge.ts:72-81`) é o único caminho de criação de perfil por autosserviço: o
cadastro por senha chama direto (`auth/sign-up/route.ts:55`) e o primeiro login por Google passa por
`findOrCreateProfile` (`user-merge.ts:54-70`). Depois do `userRepository.create`, se o perfil criado for
`UserType.COMMON`, chama `emitNotificationQuietly({ userId: created.id, type: "welcome", params: {}, dedupeKey:
created.id })` e devolve o perfil.

Quieto de propósito: o cadastro trata qualquer exceção de `createDefaultUserProfile` como falha do perfil e apaga
a conta (`sign-up/route.ts:54-71`). Um aviso que não gravou não pode derrubar um cadastro que deu certo.

O perfil criado pelo admin em `POST /users` (`users/route.ts:74-77`) usa `userRepository.create` direto e **não**
recebe boas-vindas neste corte (pergunta 6).

### 4.8 Produtor 2: mudança de status da assinatura

Em `reconcileSubscription` (`webhooks/payments/route.ts:83-110`), o perfil já vem lido por
`findSubscriptionOwner` antes da transação, com o `subscription` gravado até então. Depois de
`applySubscriptionState` responder `"applied"`, o handler chama
`subscriptionNotificationFor(profile.subscription, state)` e, se vier um tipo, `emitNotificationQuietly({ userId:
profile.id, type, params: {}, dedupeKey: event.id })`. `"skipped"` e `"missing"` não emitem.

Regras da função pura (o anterior só conta se for a mesma assinatura; assinatura nova trata o anterior como
ausente):

| Tipo | Quando |
|---|---|
| `subscriptionPaymentPending` | o novo status é `past_due` ou `unpaid`, e o anterior não era nenhum dos dois |
| `subscriptionCanceled` | o novo status é `canceled`, havia um anterior da mesma assinatura e ele não era `canceled` |
| `subscriptionReactivated` | havia anterior; o novo é `active` ou `trialing`; e o anterior era `past_due`/`unpaid` **ou** tinha `cancelAtPeriodEnd: true` e o novo tem `false` |
| nenhum | qualquer outro caso, inclusive a primeira assinatura ativa (o checkout já confirma na aba de cobrança) e o cancelamento agendado (pergunta 4) |

Também quieto, e aqui o motivo é mais forte: se a emissão lançasse e o webhook respondesse 500, a Stripe
reentregaria o evento, `decideSubscriptionWrite` aplicaria de novo (mesmo `lastEventAt`, `billing-state.ts:227`),
mas `profile.subscription` já seria o estado novo, a função pura não veria transição e o aviso se perderia do
mesmo jeito. Responder 500 só geraria retrabalho na Stripe sem recuperar nada. A corrida entre duas entregas de
eventos diferentes para o mesmo perfil pode, no pior caso, emitir dois avisos de tipos diferentes; o mesmo evento
nunca emite duas vezes, pelo id.

### 4.9 Exportação e expurgo

- `account-export.ts:133-146`: o `Promise.all` ganha `notificationRepository.findAllByUserId(profile.id,
  EXPORT_MAX_RECORDS)`, e o retorno ganha `notifications: { items, truncated }`. Itens inteiros (são do próprio
  titular; nenhum campo fala de terceiro).
- `account-erasure.ts`: `ErasureStepName` ganha `"notifications"` (`:17-24`), `STEPS_AFTER_BILLING` ganha a
  entrada depois de `"sessions"` (`:101-108`), e `eraseData` ganha
  `runStep("notifications", () => notificationRepository.purgeAllByUserId(profileId))` na mesma posição
  (`:115-131`). Falha não interrompe os passos seguintes, como os demais. A rota de exclusão
  (`account/deletion/route.ts:75-100`) só olha `billing` e `authAccount`, então não muda.

## 5. Front (`apps/app`)

### 5.1 Onde entra

- `Navbar.tsx` ganha uma prop opcional `notifications?: ReactNode`, renderizada antes do `LanguageSwitcher`. O
  layout `(common)/layout.tsx:61` passa `<NotificationsBell />`; o admin (`admin/layout.tsx:50`) não passa nada e
  fica como está. A decisão de onde o sino aparece fica no servidor, no layout, e não depende de estado do cliente.
- Sem prefetch RSC: o sino está no layout, que envolve todas as páginas, e prefetch ali somaria uma consulta a
  toda navegação de servidor. A contagem chega no cliente com um `Badge` ausente até lá, sem layout shift (o botão
  tem tamanho fixo).
- Nada em `paths.ts`, `routes.tsx` nem `sidebar.tsx`: não há página nova.

### 5.2 Dados

`queryKeys.notifications`:

```ts
notifications: {
    all: ["notifications"] as const,
    list: () => [...queryKeys.notifications.all, "list"] as const,
    unreadCount: () => [...queryKeys.notifications.all, "unreadCount"] as const,
},
```

| Arquivo | Exporta | Detalhe |
|---|---|---|
| `shared/hooks/useListNotifications.ts` | `fetchNotificationsList`, `useListNotifications({ enabled })` | `useAuthorizedInfiniteQuery`, página `NOTIFICATIONS_PAGE_SIZE = 10`, `enabled` = popover aberto (não lê a lista sem o usuário pedir) |
| `shared/hooks/useUnreadNotificationsCount.ts` | `fetchUnreadNotificationsCount`, `useUnreadNotificationsCount()` | `useAuthorizedQuery`, `refetchInterval: NOTIFICATIONS_POLL_INTERVAL_MS`, `refetchOnWindowFocus: true`, `staleTime: 30_000`, refaz ao mudar `usePathname()` se estiver velho |
| `shared/hooks/useNotificationActions.ts` | `useNotificationActions()` → `markRead`, `markAllRead` | otimista, ver abaixo |

Mutations otimistas, sem `invalidateQueries`, porque o servidor não muda nada além do que o cliente já sabe:

- `markRead(id)`: `onMutate` grava `readAt` agora no item da lista em cache e desconta 1 do contador (piso 0);
  `onError` desfaz e mostra `errorAlert(handleClientError(new FormattedError(error, locale)))`; `onSuccess` troca
  o `readAt` pelo da resposta.
- `markAllRead()`: `onMutate` marca todos os itens em cache e zera o contador; `onError` desfaz e alerta;
  `onSuccess` não faz nada além disso. Itens que ainda não foram carregados chegam já lidos do servidor.

Ao trocar de sujeito (impersonação), o `resetQueries()` de `AuthRequestPanelContext` já descarta o cache de todo
o painel; o sino não precisa de tratamento próprio.

### 5.3 Componentes

| Arquivo | Papel |
|---|---|
| `shared/components/notifications/NotificationsBell.tsx` | `"use client"`. `Popover` + `PopoverTrigger` (botão redondo com o mesmo `className` dos vizinhos da `Navbar`, `Navbar.tsx:10-12`), `BellIcon` do `lucide-react`, `Badge` com o número quando `count > 0`, `99+` quando `count >= 100` |
| `shared/components/notifications/NotificationsList.tsx` | conteúdo do popover: cabeçalho com título e "Marcar todas como lidas", lista (`ScrollArea` + `ItemGroup`), "Carregar mais", estado vazio (`Empty`), erro de carga com "Tentar de novo", aviso de somente leitura sob impersonação |
| `shared/components/notifications/NotificationItem.tsx` | um `Item`: ícone por nível, título, corpo, data (`useFormatDisplayDateTime`), marcador de não lida e botão "Marcar como lida". Com destino, o item é um `Link` que marca como lida (se não lida e fora da impersonação) e fecha o popover |
| `shared/lib/notifications.ts` | registro por tipo (nível e destino) e `describeNotification(copy, notification)`, que resolve título e corpo com interpolação `{param}`; tipo desconhecido cai no texto `fallback` |

Largura do popover: `w-[min(24rem,calc(100vw-1.5rem))]`, alinhado à direita (`align="end"`), lista com altura
máxima e rolagem própria, para o mobile de 375 px.

Estados:

| Estado | Como aparece |
|---|---|
| contador carregando ou com erro | sem badge; o erro do contador **não** gera toast (consulta periódica que alerta a cada 2 minutos seria pior que o número ausente) |
| lista carregando | 3 linhas de `Skeleton` |
| lista vazia | `Empty` com título e descrição do dicionário |
| lista com erro | texto traduzido do `error.code` + botão "Tentar de novo" (`refetch`) |
| "carregar mais" em andamento | botão com `isLoading`, desabilitado |
| marcar em andamento | o botão do item e o "marcar todas" ficam desabilitados enquanto `isPending` (sem duplo envio) |
| impersonação | botões de marcar desabilitados + linha curta `readOnlyHint`; clicar num item com destino navega sem marcar |

Acessibilidade: o botão do sino tem `aria-label` do dicionário com a contagem (`"Notificações, {count} não
lidas"`, e `"Notificações"` com zero). O marcador de não lida tem texto `sr-only`. O ícone por nível é
`aria-hidden`.

### 5.4 Registro por tipo (app)

| Tipo | Nível | Destino |
|---|---|---|
| `welcome` | info | nenhum |
| `subscriptionPaymentPending` | warning | `/{locale}/account?tab=billing` (`paths.ts:54-56`) |
| `subscriptionCanceled` | error | `/{locale}/account?tab=billing` |
| `subscriptionReactivated` | info | `/{locale}/account?tab=billing` |
| desconhecido | info | nenhum, texto `fallback` |

O destino é derivado do tipo (e dos parâmetros, para o fork) no cliente, com `withLocalePath`. O documento não
guarda URL, o que elimina open redirect e mantém o documento neutro de idioma. No modo `simple` a aba de cobrança
não existe (`AccountTabs.tsx:32`); não há aviso de assinatura nesse modo, porque não chega evento da Stripe.

## 6. i18n

Leaf nova `translations/apps/app/shared/notifications.ts`, ligada em `appSharedTranslations`
(`translations/apps/app/shared/index.ts`), lida como `dictionary.apps.app.shared.notifications`. Árvore em §10.8.
Mais os dois códigos em `apiErrors`. Rodar `/i18n-sync`.

## 7. Autorização e segurança

| Camada | Regra |
|---|---|
| `apps/app/proxy.ts` / `requireSession` | inalterados; o sino só existe dentro do layout autenticado |
| layout `(common)` | só ele monta o sino |
| guard da API | `requireCommonPanelApi` nas quatro rotas; admin fora da impersonação recebe `403 COMMON_PANEL_FORBIDDEN` (`common-panel.ts:77-82`) |
| ownership | consultas filtradas por `ctx.subjectProfile.id`; `[id]/read` responde 404 para id alheio |
| impersonação | leitura liberada (o admin vê o sino do usuário); escrita recusada pelo guard com `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`, já testado em `impersonationReadOnly.test.ts`. A UI desabilita os botões, mas a proteção é a da API |
| emissão | só servidor; nenhuma rota cria notificação; o `userId` vem do perfil resolvido no servidor (`created.id`, `profile.id`), nunca de entrada do cliente |
| Firestore rules | inalteradas. O `deny-all` (`firestore.rules:32-34`) cobre a coleção nova, e a API usa Admin SDK |
| PII | o documento guarda só id do perfil, tipo e parâmetros. Os tipos do core têm `params: {}`. Fork que puser dado pessoal em parâmetro herda a exportação e o expurgo prontos |
| rate limit | as rotas são autenticadas e ficam fora da lista do `apps/api/proxy.ts`, como as de `entity` |

## 8. Testes (Vitest)

Todos no nível unitário ou de rota com `vi.mock`. Nenhum teste novo contra o emulador: a semântica que só o
Firestore real provaria (campo ausente × `null`, `count` com `limit`, desempate do cursor, ALREADY_EXISTS) foi
medida nesta rodada e fica protegida pelo teste do repositório contra o `fakeDb` de `baseRepository.test.ts`, que
já implementa `count`, `limit`, `orderBy` e `startAfter` (`:149-182`). O índice, que é o que o emulador não
prova, fica com `firestoreIndexes.test.ts`.

| # | Arquivo | Nível | Prova |
|---|---|---|---|
| 1 | `apps/api/__tests__/notificationMapper.test.ts` | unit | `Timestamp` → ISO; `readAt`/`expiresAt` `null`; `params` sem valores não primitivos; tipo desconhecido preservado; whitelist do `toPersistence` |
| 2 | `apps/api/__tests__/notificationRepository.test.ts` | repositório contra `fakeDb` | `emitOnce` grava `readAt: null`, `expiresAt = +90 dias`, `deletedAt: null`; id determinístico; código 6 vira `"duplicate"`; `countUnreadByUserId` usa `limit(100)`; `markAllReadByUserId` percorre lotes e para; `purgeAllByUserId` e `findAllByUserId` só tocam o dono |
| 3 | `apps/api/__tests__/notificationsRoute.test.ts` | rota, repo e guard mockados | lista (200, `nextCursor` codificado, 400 cursor, 503 `PAGINATION_INDEX_MISSING`); contagem (200, 503 `NOTIFICATIONS_INDEX_MISSING`); `[id]/read` (200, 404 inexistente, 404 de outro dono, já lida devolve o `readAt` original sem `update`); `read-all` (200 `{ updated }`, 503) |
| 4 | `apps/api/__tests__/notificationsRouteImpersonation.test.ts` | rota com o guard real, como `entitiesRouteImpersonation.test.ts` | personificando: `GET` lista 200 com o dono = sujeito; `POST [id]/read` e `POST read-all` 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY` sem tocar o repositório |
| 5 | `apps/api/__tests__/subscriptionNotifications.test.ts` | unit | a tabela de §4.8, linha a linha, incluindo assinatura nova, `created` ativo e cancelamento agendado (nenhum) |
| 6 | `apps/api/__tests__/paymentsWebhookRoute.test.ts` (edição) | rota | `applied` com transição emite para o dono com `dedupeKey: event.id`; `skipped` não emite; falha da emissão não muda o 200 |
| 7 | `apps/api/__tests__/welcomeNotification.test.ts` | unit, `user-merge` com repo mockado | perfil comum emite `welcome` com `dedupeKey` = id do perfil; falha da emissão é logada e o perfil volta |
| 8 | `apps/api/__tests__/accountExportRoute.test.ts` (edição) | rota | bloco `notifications` com itens e `truncated` |
| 9 | `apps/api/__tests__/accountErasure.test.ts` (edição) | unit | ordem dos passos com `notifications` depois de `sessions`; falha nele não interrompe `profile` e `authAccount` |
| 10 | `apps/api/__tests__/firestoreIndexes.test.ts` (edição) | estático | os dois índices novos declarados |
| 11 | `apps/app/__tests__/notificationCopy.test.ts` | unit | `describeNotification` nos 3 idiomas com o dicionário real; interpolação `{param}`; tipo desconhecido → `fallback`; destino com prefixo de locale |
| 12 | `apps/app/__tests__/useNotifications.test.tsx` | hook | chaves; lista só com `enabled`; `markRead` otimista + rollback; `markAllRead` zera o contador; nenhum `invalidateQueries` |
| 13 | `apps/app/__tests__/notificationsBell.test.tsx` | componente | badge ausente em 0, `99+` em 100; `aria-label` com contagem; vazio; impersonação desabilita os botões e mostra o aviso |

**Mocks a acrescentar em testes existentes.** Todo teste que mocka `@repo/auth/server` e importa, direta ou
indiretamente, um módulo que passe a importar `notification.repository` quebra no import, porque
`infra/database.ts` chama `getFirestoreAdmin()`. Acrescentar `vi.mock("@/(shared)/lib/notifications", …)` em:
`signUpProfile.test.ts`, `googleSignInProfile.test.ts`, `userMergeArchivedProfile.test.ts`,
`paymentsWebhookRoute.test.ts`, e `vi.mock("@/(shared)/repositories/notification.repository", …)` em
`accountErasure.test.ts` e `accountExportRoute.test.ts`. O `/develop` roda a suíte inteira da `api` para pegar os
que este levantamento não viu.

## 9. O que o `/test` vai percorrer

### 9.1 Dado de QA

O seed (`apps/api/scripts/seed-emulator.mjs`) ganha `NOTIFICATIONS_BY_OWNER`, gravado direto no Firestore como
o resto do seed:

- `user@example.com`: 25 notificações, para a paginação de 10 em 10. Entre elas: uma `welcome` lida, uma
  `subscriptionPaymentPending` não lida, uma `subscriptionCanceled`, uma `subscriptionReactivated` e uma de tipo
  `legacyTypeRemoved` (cobre o `fallback`). As demais `welcome` com ids distintos, metade lidas.
- `user2@example.com`: nenhuma, para o estado vazio. A ownership se prova com o id de uma notificação de `user`
  usado pela sessão de `user2`.

### 9.2 Fluxos

| # | Fluxo | Resultado esperado |
|---|---|---|
| F1 | criar conta nova pela tela de cadastro (emulador de Auth), passar o onboarding | sino com `1`; a notificação de boas-vindas no idioma da URL; trocar o idioma muda o texto da mesma notificação |
| F2 | `user@`: abrir o sino, "Marcar como lida" num item | contador desce 1; item perde o marcador; recarregar mantém |
| F3 | `user@`: "Carregar mais" até o fim | 25 itens, sem repetição, o botão some na última página |
| F4 | `user@`: clicar em "Pagamento pendente" | navega para `/{locale}/account?tab=billing`, o item fica lido, o popover fecha |
| F5 | `user@`: "Marcar todas como lidas" | contador some; recarregar mantém; o botão fica desabilitado |
| F6 | `user2@`: abrir o sino | estado vazio, sem badge |
| F7 | `user2@`: `POST /notifications/<id de user@>/read` com o token de `user2` | `404 NOTIFICATION_NOT_FOUND` |
| F8 | `admin@` personificando `user@` | sino visível com o contador de `user@`; botões de marcar desabilitados com o aviso; `POST` forçado responde `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`; nada muda no Firestore |
| F9 | `admin@` fora da impersonação, em `/admin` | sem sino |
| F10 | aba escondida por mais de 2 minutos (painel de rede) | nenhuma chamada a `unread-count` enquanto escondida; uma ao voltar |
| F11 | exportar dados de `user@` | o JSON traz `notifications.items` (25) e `truncated: false` |
| F12 | excluir uma conta de QA criada em F1 | a coleção `notification` não tem mais documentos daquele `userId` (REST do emulador) |

Combinações: light, dark e mobile (375 px) para o popover aberto com itens, vazio e sob impersonação; os 3 idiomas
para títulos, corpos, `aria-label` e data.

### 9.3 Não observável sem infra externa (vira 🔒, não ❌)

- o índice composto publicado e a ausência de `503` em produção;
- a política de TTL apagando um documento vencido;
- o evento real da Stripe chegando ao webhook (pendência 23); o produtor de assinatura fica provado pelo teste 6.

## 10. Critérios de aceite (rascunho; o `/test` formaliza no §9.1 do guia)

- [ ] **Boas-vindas na conta nova.** Uma conta criada pelo cadastro ou pelo primeiro login com Google tem uma
  notificação `welcome` não lida, e só uma, mesmo se a criação do perfil for chamada duas vezes. Uma falha ao
  gravar o aviso não desfaz o cadastro.
- [ ] **Texto no idioma de quem lê.** Título e corpo vêm do dicionário do idioma da URL; trocar de idioma muda o
  texto da mesma notificação. Tipo desconhecido mostra o texto genérico, sem quebrar a lista.
- [ ] **Contador.** Mostra o número de não lidas, some com zero e mostra `99+` a partir de 100. Atualiza a cada 2
  minutos com a aba visível, ao voltar para a aba e ao navegar. Erro do contador esconde o número sem toast.
- [ ] **Lista paginada.** Mais recentes primeiro, 10 por vez, sem repetir nem pular item entre páginas. Cursor
  forjado responde `400 PAGINATION_CURSOR_INVALID`.
- [ ] **Marcar uma.** Desconta 1 do contador na hora e persiste depois de recarregar. Notificação já lida responde
  200 com o mesmo `readAt`. Duplo clique não gera duas escritas visíveis.
- [ ] **Marcar todas.** Zera o contador e marca os itens carregados; os não carregados chegam lidos. Falha volta
  o estado anterior e mostra o erro traduzido.
- [ ] **Ownership.** Marcar uma notificação de outro usuário responde `404 NOTIFICATION_NOT_FOUND`; listar e contar
  nunca trazem dado de outro dono.
- [ ] **Impersonação.** O admin personificando vê o sino e a lista do usuário. Marcar uma ou todas responde
  `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY` e a UI deixa os botões desabilitados com o aviso. Fora da
  impersonação o admin não vê sino.
- [ ] **Assinatura.** Um evento aplicado que leva a assinatura a `past_due`/`unpaid`, a `canceled`, ou de volta a
  ativa (pagamento recuperado ou cancelamento desfeito) cria a notificação do dono, e só dele, uma vez por evento.
  Evento ignorado (`skipped`) não cria nada; falha ao gravar o aviso não muda a resposta do webhook.
- [ ] **Destino.** Avisos de assinatura levam à aba de cobrança no idioma atual; boas-vindas não têm destino.
- [ ] **Exportação e expurgo.** A exportação traz as notificações do titular com `truncated`; a exclusão da conta
  apaga todas, num passo próprio registrado no log da exclusão.
- [ ] **Modo degradado.** Sem índice publicado, lista responde `503 PAGINATION_INDEX_MISSING` e contagem/marcar
  todas `503 NOTIFICATIONS_INDEX_MISSING`, nunca 500; o painel continua navegável. Sem Stripe, só as boas-vindas
  aparecem.
- [ ] **Tema e responsivo.** O popover respeita light e dark e cabe em 375 px sem rolagem horizontal.

## 11. Modo degradado

| Situação | Comportamento |
|---|---|
| Sem Stripe (`getStripe()` nulo) ou modo `simple` | o webhook já responde `503 PAYMENTS_NOT_CONFIGURED` (`route.ts:258-263`); nenhum aviso de assinatura nasce. Só boas-vindas |
| Índice `(userId, createdAt)` não publicado | `GET /notifications` → `503 PAGINATION_INDEX_MISSING` (mesmo `isMissingIndexError` de `entities/route.ts:47-52`); o popover mostra o erro traduzido e o resto do painel segue |
| Índice `(userId, readAt)` não publicado | `unread-count` e `read-all` → `503 NOTIFICATIONS_INDEX_MISSING`. O contador some sem toast; "marcar todas" mostra o erro. Se o index merging do Firestore servir a consulta, nada falha (ver §2.3) |
| TTL não ligada (inclui todo projeto no plano Spark: a doc lista "TTL deletes" entre o que não tem uso gratuito, `.../firestore/quotas`) | os documentos ficam até a exclusão da conta. Nada quebra: a lista é paginada e a contagem é limitada a 100. A retenção prometida (90 dias) só vale com a política ligada, e o `ROPA.md` diz isso |
| Firestore fora | as quatro rotas falham como qualquer rota autenticada (o guard lê o perfil antes). A emissão quieta loga e segue |

## 12. Pré-requisitos manuais de infra (não reprovam a entrega)

Viram entradas no `docs/PRE-PRODUCTION.md` (o `/develop` escreve; o ciclo não publica nada):

1. **Publicar os dois índices compostos** de `notification`, pelo comando de sempre
   (`npx -y firebase-tools@latest deploy --only firestore:indexes`). Nova subseção §1.9 e a contagem da §1.8 passa
   de sete para nove entradas.
2. **Ligar a política de TTL** em `notification.expiresAt`:
   `gcloud firestore fields ttls update expiresAt --collection-group=notification --enable-ttl --project=<project-id>`.
   Exige faturamento ativo (Blaze). Sem ela, a retenção não é aplicada (§11).
3. **Rules:** nada a fazer. O `deny-all` já cobre a coleção.
4. **Backup:** a política de TTL não vai no backup agendado (`docs/BACKUP.md:46`); quem restaura reaplica a de
  `notification` junto com a de `paymentEvent` (uma linha no `BACKUP.md`).

## 13. Pós-entrega e fork

- Rollback: reverter os commits. Os documentos de `notification` ficam órfãos e inofensivos (nenhuma leitura sem
  a rota); a TTL os apaga em 90 dias, ou o expurgo da conta.
- Como um fork acrescenta um tipo: subseção nova em `docs/FORKING.md` §10 ("Onde entra o código do produto"), que
  é onde o fork procura o que estender. Conteúdo em §10.9.

---

# Etapa 2: blueprint técnico

## 10.1 Contrato (`packages/sdk`)

`packages/sdk/src/types/notification/notification.ts`:

```ts
export const NOTIFICATION_TYPES = [
    "welcome",
    "subscriptionPaymentPending",
    "subscriptionCanceled",
    "subscriptionReactivated",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationParamValue = string | number | boolean | null;

/** Each type declares the values its copy interpolates. Text never travels in a notification. */
export type NotificationParamsByType = {
    welcome: Record<string, never>;
    subscriptionPaymentPending: Record<string, never>;
    subscriptionCanceled: Record<string, never>;
    subscriptionReactivated: Record<string, never>;
};

/** The API counts up to this many unread notifications; the badge shows `99+` from here on. */
export const NOTIFICATION_UNREAD_COUNT_CAP = 100;

export type NotificationDTO = {
    id: string;
    userId: string;
    /** A type this build does not know still reads, so the client can fall back to generic copy. */
    type: string;
    params: Record<string, NotificationParamValue>;
    readAt: string | null;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
};

export type NotificationUnreadCountDTO = { count: number };

export type MarkNotificationReadResponse = { id: string; readAt: string };

export type MarkAllNotificationsReadResponse = { updated: number };
```

`packages/sdk/src/types/notification/index.ts` reexporta; `types/index.ts` ganha `export * from "./notification"`.

`packages/sdk/src/actions/notification/action.ts`:

```ts
export default class NotificationActions {
    constructor(private readonly client: Client) { this.client = client; }

    async list(query?: PageQuery): Promise<PageDTO<NotificationDTO>>      // GET /notifications
    async unreadCount(): Promise<NotificationUnreadCountDTO>              // GET /notifications/unread-count
    async markRead(id: string): Promise<MarkNotificationReadResponse>     // POST /notifications/${id}/read
    async markAllRead(): Promise<MarkAllNotificationsReadResponse>        // POST /notifications/read-all
}
```

`client/index.ts`:

```diff
+import NotificationActions from "../actions/notification/action";
 ...
     contact!: ContactActions;
+    notification!: NotificationActions;
 ...
         this.contact = new ContactActions(this);
+        this.notification = new NotificationActions(this);
```

`types/account/account.ts`:

```diff
 export type AccountDataExportDTO = {
     ...
     sessions: { items: AccountDataExportSession[]; truncated: boolean };
+    notifications: { items: NotificationDTO[]; truncated: boolean };
 };
```

## 10.2 Rotas: exemplos

`GET /notifications?limit=2`

```json
{
  "data": {
    "items": [
      {
        "id": "subscriptionPaymentPending_evt_1Q2w3E",
        "userId": "u9KxPq",
        "type": "subscriptionPaymentPending",
        "params": {},
        "readAt": null,
        "expiresAt": "2027-01-18T12:00:00.000Z",
        "createdAt": "2026-10-20T12:00:00.000Z",
        "updatedAt": "2026-10-20T12:00:00.000Z",
        "deletedAt": null
      },
      {
        "id": "welcome_u9KxPq",
        "userId": "u9KxPq",
        "type": "welcome",
        "params": {},
        "readAt": "2026-10-19T08:31:00.000Z",
        "expiresAt": "2027-01-17T08:30:00.000Z",
        "createdAt": "2026-10-19T08:30:00.000Z",
        "updatedAt": "2026-10-19T08:31:00.000Z",
        "deletedAt": null
      }
    ],
    "nextCursor": "eyJ2IjoxLCJpZCI6IndlbGNvbWVfdTlLeFBxIn0"
  }
}
```

`GET /notifications/unread-count` → `200 { "data": { "count": 1 } }`

`POST /notifications/welcome_u9KxPq/read` → `200 { "data": { "id": "welcome_u9KxPq", "readAt": "2026-10-19T08:31:00.000Z" } }`

`POST /notifications/read-all` → `200 { "data": { "updated": 3 } }`

Erro: `404 { "error": { "code": "NOTIFICATION_NOT_FOUND" } }`.

Esqueleto de `[id]/read/route.ts`:

```ts
export const POST = requireCommonPanelApi<RouteIdParamsContext>(
    async (_req, ctx) => {
        const id = await resolveIdFromContext(ctx);
        const row = await notificationRepository.findById(id);

        if (!row || row.userId !== ctx.subjectProfile.id) {
            return Response.json(
                { error: { code: "NOTIFICATION_NOT_FOUND" } },
                { status: HTTP_STATUS.NOT_FOUND }
            );
        }

        const readAt = row.readAt ?? (await notificationRepository.markRead(id));

        return Response.json({ data: { id, readAt } });
    }
);
```

`unread-count/route.ts` e `read-all/route.ts` seguem `entities/summary/route.ts:6-22`: `try` em volta do
repositório, `isMissingIndexError` → `503 NOTIFICATIONS_INDEX_MISSING`, o resto relança. `route.ts` (lista) é
cópia do `GET` de `entities/route.ts:20-55` sem as URLs de foto.

## 10.3 Forma do documento

```text
notification/subscriptionPaymentPending_evt_1Q2w3E
  userId:    "u9KxPq"
  type:      "subscriptionPaymentPending"
  params:    {}
  readAt:    null
  expiresAt: Timestamp(2027-01-18T12:00:00Z)
  createdAt: Timestamp(2026-10-20T12:00:00Z)
  updatedAt: Timestamp(2026-10-20T12:00:00Z)
  deletedAt: null
```

## 10.4 Repositório, mapper e emissão

`notification.repository.ts`:

```ts
const UNREAD_BATCH_SIZE = 500;            // Firestore refuses a batch with more than 500 writes
const MARK_ALL_MAX_PASSES = 20;           // bounds the loop at 10k notifications per click

class NotificationRepository extends BaseRepository<NotificationDTO> {
    constructor() { super(db, "notification", notificationMapper); }

    private unreadQuery(userId: string): Query      // userId == X, readAt == null

    listByUserId(userId, page): Promise<RepositoryPage<NotificationDTO>>   // paginate(where userId)
    countUnreadByUserId(userId): Promise<number>     // countQuery(unreadQuery.limit(NOTIFICATION_UNREAD_COUNT_CAP))
    markRead(id): Promise<string>                    // update readAt/updatedAt = now; devolve ISO
    markAllReadByUserId(userId): Promise<number>     // lotes de 500 sobre unreadQuery, até 20 passadas
    emitOnce(record: NotificationRecordInput, id: string | null): Promise<"created" | "duplicate">
    findAllByUserId(userId, limit): Promise<{ items; truncated }>   // forma de entity.repository.ts:34-56
    purgeAllByUserId(userId): Promise<number>        // purgeAll(where userId)
}
export const notificationRepository = new NotificationRepository();
```

`markRead` usa `this.db.collection(...).doc(id).update({ readAt, updatedAt })` direto, e não `BaseRepository.update`,
para devolver o mesmo instante gravado nos dois campos. `markAllReadByUserId` relê a consulta a cada lote, como
`purgeAll` (`base.repository.ts:238-261`), e devolve quantos marcou; se esgotar as passadas, devolve o que fez
(a próxima chamada continua), sem lançar.

`notification.mapper.ts`, no molde de `entity.mapper.ts`:

```ts
toDTO(row) => ({
    id,
    userId: String(record.userId ?? ""),
    type: String(record.type ?? ""),
    params: primitiveParams(record.params),       // descarta objetos, arrays e undefined
    readAt: instantOrNull(record.readAt),
    expiresAt: instantOrNull(record.expiresAt),
    createdAt: normalizeFirestoreInstant(record.createdAt),
    updatedAt: normalizeFirestoreInstant(record.updatedAt),
    deletedAt: instantOrNull(record.deletedAt),
})
toPersistence: whitelist ["userId", "type", "params", "readAt", "expiresAt"]
```

`lib/notifications.ts`:

```ts
export const NOTIFICATION_RETENTION_DAYS = 90;

export type EmitNotificationInput<T extends NotificationType> = {
    userId: string;
    type: T;
    params: NotificationParamsByType[T];
    /** Same key, same notification: a retried producer cannot notify twice. */
    dedupeKey?: string;
};

export async function emitNotification<T extends NotificationType>(
    input: EmitNotificationInput<T>,
    now: Date = new Date()
): Promise<"created" | "duplicate">

export async function emitNotificationQuietly<T extends NotificationType>(
    input: EmitNotificationInput<T>
): Promise<void>   // catch → logEvent("notifications", "emit-failed", { type, reason: error.name })
```

O log leva só `type` e o nome do erro, nunca `userId` nem a mensagem do Firestore, como `account-erasure.ts:37-41`.

`lib/subscription-notifications.ts`:

```ts
const PAYMENT_PENDING: readonly SubscriptionStatus[] = ["past_due", "unpaid"];
const ACTIVE: readonly SubscriptionStatus[] = ["active", "trialing"];

export function subscriptionNotificationFor(
    stored: unknown,               // profile.subscription, cru do Firestore
    next: SubscriptionState
): NotificationType | null
```

## 10.5 Pseudo-diffs de código existente (API)

`user-merge.ts`:

```diff
-export function createDefaultUserProfile(uid: string, dto?: Partial<UserDTO>) {
+export async function createDefaultUserProfile(uid: string, dto?: Partial<UserDTO>) {
     const defaultProps = { ... };
-    return userRepository.create({ ...defaultProps });
+    const created = await userRepository.create({ ...defaultProps });
+    if (created.type === UserType.COMMON) {
+        await emitNotificationQuietly({ userId: created.id, type: "welcome", params: {}, dedupeKey: created.id });
+    }
+    return created;
 }
```

`webhooks/payments/route.ts`, dentro de `reconcileSubscription`:

```diff
     if (profile) {
         const result = await userRepository.applySubscriptionState(profile.id, state, event.type);
         logEvent(...);
+        const notificationType =
+            result === "applied" ? subscriptionNotificationFor(profile.subscription, state) : null;
+        if (notificationType) {
+            await emitNotificationQuietly({ userId: profile.id, type: notificationType, params: {}, dedupeKey: event.id });
+        }
     } else {
```

`account-export.ts` e `account-erasure.ts`: como em §4.9.

`firestore.indexes.json`, duas entradas:

```json
{ "collectionGroup": "notification", "queryScope": "COLLECTION",
  "fields": [ { "fieldPath": "userId", "order": "ASCENDING" },
              { "fieldPath": "createdAt", "order": "DESCENDING" } ] },
{ "collectionGroup": "notification", "queryScope": "COLLECTION",
  "fields": [ { "fieldPath": "userId", "order": "ASCENDING" },
              { "fieldPath": "readAt", "order": "ASCENDING" } ] }
```

`apps/api/scripts/seed-emulator.mjs`: `NOTIFICATIONS_BY_OWNER` e uma função `createNotifications(db, profileId,
list)` chamada no `main`, com `readAt: null` explícito e `expiresAt` em +90 dias (§9.1).

## 10.6 Front (`apps/app`)

```text
apps/app/shared/
  components/notifications/
    NotificationsBell.tsx
    NotificationsList.tsx
    NotificationItem.tsx
  hooks/
    useListNotifications.ts
    useUnreadNotificationsCount.ts
    useNotificationActions.ts
  lib/
    notifications.ts          (registro por tipo + describeNotification)
    pagination.ts             (+ NOTIFICATIONS_PAGE_SIZE = 10, NOTIFICATIONS_POLL_INTERVAL_MS = 120_000)
    queryKeys.ts              (+ notifications)
  components/ui/Navbar.tsx    (+ prop notifications)
apps/app/app/[locale]/(authenticated)/(common)/layout.tsx   (+ <Navbar notifications={<NotificationsBell />} />)
```

Sem formulário: nenhum campo `HookForm*`, nenhum `Table`.

`Navbar.tsx`:

```diff
-export default function Navbar() {
+type NavbarProps = { notifications?: ReactNode };
+
+export default function Navbar({ notifications }: NavbarProps) {
 ...
             <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
+                {notifications}
                 <LanguageSwitcher icon triggerProps={iconButtonProps} />
```

`shared/lib/notifications.ts`:

```ts
export type NotificationLevel = "info" | "warning" | "error";

type NotificationPresentation = {
    level: NotificationLevel;
    href?: (params: NotificationDTO["params"]) => string;   // caminho sem locale
};

export const notificationPresentation: Record<NotificationType, NotificationPresentation> = {
    welcome: { level: "info" },
    subscriptionPaymentPending: { level: "warning", href: () => "/account?tab=billing" },
    subscriptionCanceled: { level: "error", href: () => "/account?tab=billing" },
    subscriptionReactivated: { level: "info", href: () => "/account?tab=billing" },
};

export function describeNotification(copy, notification): { title: string; body: string }
export function notificationHref(locale, notification): string | null
```

## 10.7 Árvore de componentes do popover

```text
Popover
  PopoverTrigger  → Button (ícone BellIcon, aria-label com a contagem) + Badge
  PopoverContent (align="end")
    cabeçalho: título "Notificações" · Button "Marcar todas como lidas"
    [impersonação] linha readOnlyHint
    ScrollArea
      ItemGroup → NotificationItem × n
      | Empty (vazio) | Skeleton × 3 (carregando) | erro + "Tentar de novo"
    Button "Carregar mais" (hasNextPage)
```

## 10.8 i18n (forma das chaves; o `/develop` escreve o texto final nos três idiomas)

`dictionary.apps.app.shared.notifications`:

```ts
{
    title: "Notificações",
    triggerLabel: "Notificações",
    triggerLabelUnread: "Notificações, {count} não lidas",
    markAllRead: "Marcar todas como lidas",
    markRead: "Marcar como lida",
    unread: "Não lida",
    loadMore: "Carregar mais",
    retry: "Tentar de novo",
    emptyTitle: "Nenhuma notificação",
    emptyDescription: "Avisos sobre a sua conta aparecem aqui.",
    readOnlyHint: "Somente leitura enquanto você atua como este usuário.",
    types: {
        welcome: { title: "Boas-vindas", body: "A sua conta está pronta. ..." },
        subscriptionPaymentPending: { title: "Pagamento pendente", body: "O último pagamento não foi aprovado. ..." },
        subscriptionCanceled: { title: "Assinatura cancelada", body: "..." },
        subscriptionReactivated: { title: "Assinatura ativa de novo", body: "..." },
    },
    fallback: { title: "Nova notificação", body: "Há uma atualização na sua conta." },
}
```

`types` tem exatamente as chaves de `NOTIFICATION_TYPES`. O teste 11 cobra isso, e a paridade cobra os três
idiomas. `apiErrors`: `NOTIFICATION_NOT_FOUND`, `NOTIFICATIONS_INDEX_MISSING`.

## 10.9 Documentação

| Arquivo | Mudança |
|---|---|
| `docs/FORKING.md` §10 | subseção "Avisar o usuário: um tipo de notificação novo": (1) acrescentar o tipo em `NOTIFICATION_TYPES` e os parâmetros em `NotificationParamsByType`; (2) título e corpo nos três idiomas em `translations/apps/app/shared/notifications.ts`, com `{param}`; (3) nível e destino em `notificationPresentation`; (4) chamar `emitNotificationQuietly` (ou `emitNotification`, se a falha deve parar o produtor) com um `dedupeKey` estável; (5) parâmetro com dado pessoal entra na exportação e sai no expurgo sem trabalho extra. Uma linha nova no mapa da §12 |
| `docs/PRE-PRODUCTION.md` | §1.9 (índices de `notification`), contagem da §1.8 para nove, e a TTL de `notification.expiresAt` com o comando e o aviso de que exige faturamento |
| `docs/ROPA.md` §1 | a coleção `notification` entre os dados pessoais (tipo e instantes, sem texto), período de 90 dias com TTL ou até a exclusão da conta, e o caminho no código |
| `docs/PAYMENTS.md` | uma linha na seção do webhook: mudanças de status aplicadas viram notificação do dono |
| `docs/BACKUP.md:46` | a TTL de `notification` ao lado da de `paymentEvent` |

## 10.10 Env

Nenhuma variável nova. Nada a configurar na Vercel.

## 10.11 Ordem de implementação e commits

Um commit por pacote ou app, na ordem de dependência. Testes no commit da funcionalidade que cobrem.

| # | Commit (sugestão) | Arquivos |
|---|---|---|
| 1 | `feat(sdk): notification contract and actions` | `types/notification/*`, `types/index.ts`, `actions/notification/action.ts`, `client/index.ts` |
| 2 | `feat(sdk): notifications in the account data export` | `types/account/account.ts` |
| 3 | `feat(api): notification collection with owner-scoped routes` | mapper, repositório, `lib/notifications.ts`, quatro rotas, `firestore.indexes.json`, testes 1-4 e 10 |
| 4 | `feat(api): welcome notification on profile creation` | `user-merge.ts`, teste 7, mocks em `signUpProfile`/`googleSignInProfile`/`userMergeArchivedProfile` |
| 5 | `feat(api): notify subscription status changes from the webhook` | `subscription-notifications.ts`, webhook, testes 5-6 |
| 6 | `feat(api): include notifications in data export and erasure` | `account-export.ts`, `account-erasure.ts`, testes 8-9 |
| 7 | `chore(api): seed notifications in the emulator` | `scripts/seed-emulator.mjs` |
| 8 | `feat(app): notification hooks and copy resolution` | `queryKeys.ts`, `pagination.ts`, três hooks, `lib/notifications.ts`, testes 11-12 |
| 9 | `feat(app): notification bell in the common panel navbar` | três componentes, `Navbar.tsx`, `(common)/layout.tsx`, teste 13 |
| 10 | `feat(internationalization): notification copy and error codes` | leaf nova, `shared/index.ts`, `apiErrors` |
| 11 | `docs: notifications in forking, pre-production, ROPA, payments and backup` | §10.9 |
| 12 | `docs(features): in-app-notifications` | `docs/features/in-app-notifications/` |

Ordem de implementação para o `/develop`: SDK → API (repositório e rotas primeiro, produtores depois) → i18n antes
da app, para os componentes já nascerem com chave (o commit de i18n continua por último no plano) → app → docs.

## 10.12 `contends_on` real

A spec declara cinco arquivos; todos entram. Fora deles, este plano toca: `apps/api/(shared)/lib/user-merge.ts`,
`packages/sdk/src/types/index.ts` e `types/account/account.ts`, a folha de `apiErrors`, `Navbar.tsx`,
`(common)/layout.tsx`, `queryKeys.ts`, `shared/lib/pagination.ts`, `seed-emulator.mjs`, seis testes existentes da
`api` e cinco documentos. Contra `magic-link-sign-in` (o outro do lote 1, `contends_on` em `packages/auth/client.ts`,
`SignInForm.tsx`, `auth-action-links.ts`, `apps/api/proxy.ts`), nenhum arquivo em comum, a menos que aquela spec
mexa em `user-merge.ts` para criar perfil no primeiro login por link (vale conferir no plano dela).

---

# Perguntas em aberto

Cada uma já tem a opção adotada nesta rodada. Revertê-las depois custa pouco, salvo onde indicado.

1. **Retenção.** Por quanto tempo uma notificação fica guardada?
   Opções: 30 dias (como `paymentEvent`); 90 dias; até ser lida + N dias; sem prazo.
   **Adotada: 90 dias por TTL em `expiresAt`, lida ou não**, como a spec recomenda. "Até ser lida + N" exigiria
   regravar `expiresAt` ao marcar, o que soma escrita a toda leitura. A TTL exige faturamento ativo; sem ela, fica
   até a exclusão da conta (§11). Mudar o prazo é uma constante.

2. **Intervalo e forma do contador.** Como contar sem multiplicar a cota?
   Opções: (a) `count()` a cada 60 s; (b) `count()` a cada 120 s, só com a aba visível, ao focar e ao navegar se
   velho; (c) contador desnormalizado no perfil, que o guard já lê; (d) tempo real por `onSnapshot`.
   **Adotada: (b)**, 4 leituras por consulta, cerca de 120 por hora de aba aberta (§2.4). (a) dobra o custo para
   um ganho de 1 minuto. (c) economizaria só a leitura do `count()` (1 de 4, porque o guard é 3) ao preço de
   `increment` em cada emissão e leitura e de deriva entre o contador e os documentos. (d) está fora do corte e
   exigiria abrir regra de leitura no cliente.

3. **O que fazer se a emissão falhar no webhook.**
   Opções: responder 500 para a Stripe reentregar; engolir e logar.
   **Adotada: engolir e logar** (`emitNotificationQuietly`). A reentrega não recupera o aviso, porque o estado da
   assinatura já foi aplicado e a transição deixa de existir na segunda passada (§4.8).

4. **Cancelamento agendado.** Quando o usuário cancela no portal, a Stripe mantém `active` com
   `cancelAtPeriodEnd: true` até o fim do período. Isso gera aviso?
   Opções: sim, como "cancelamento agendado" (um quinto tipo); não.
   **Adotada: não.** Foi o próprio usuário quem fez, e a aba de cobrança já mostra "Termina em {data}"
   (`AccountBillingPanel.tsx:122-124`). O aviso "cancelada" sai quando a assinatura de fato termina
   (`canceled`), e "reativada" cobre desfazer o agendamento. Acrescentar o tipo depois é uma linha na função pura
   e três chaves de texto.

5. **Parâmetros nos tipos do core.** Os quatro tipos do core têm `params: {}`. Deveriam levar o nome do plano ou
   a data de fim?
   **Adotada: sem parâmetros.** O nome do plano exigiria ler o `planLabel` (ou chamar a Stripe) dentro do webhook,
   e a data já aparece na própria notificação e na aba de cobrança. A interpolação existe e é testada (teste 11
   com um tipo de fixture), e a documentação do fork mostra o uso.

6. **Perfil criado pelo admin em `POST /users`** recebe boas-vindas?
   Opções: sim, emitindo também em `users/route.ts`; não.
   **Adotada: não**, por menor raio: a rota do admin fica intacta, e a spec fala de "criação da conta" no sentido
   de autosserviço. Se quiser, é uma chamada de `emitNotificationQuietly` depois de `users/route.ts:74-77`.

7. **Destino gravado no documento ou derivado do tipo?**
   **Adotada: derivado do tipo no cliente** (§5.4). Gravar URL abriria espaço para open redirect se um fork
   emitisse com dado de entrada, e prenderia o documento a uma rota que pode mudar. O fork que precisa de destino
   por instância usa `params` (ex.: `reportId`) e monta o caminho no registro.

8. **Nível (info, aviso, erro) gravado ou derivado?**
   **Adotada: derivado do tipo**, no mesmo registro do destino. Um tipo com dois níveis vira dois tipos.

9. **A spec segue `proposed`.** O plano foi feito por instrução direta do usuário nesta rodada, com a D6 já
   tomada. Mover a spec para `approved` (e depois `in-progress`) é decisão sua; o plano não depende disso, mas o
   `/spec --sync` vai encontrar uma feature em andamento com a spec ainda `proposed`.
