# Plano — Trilha de auditoria de ações sensíveis

- **Spec de origem**: [`specs/audit-log.md`](../spec.md)
- **Slug**: `audit-log`
- **Guia seguido**: [`docs/feature-analysis-guide.md`](../../../feature-analysis-guide.md) (seções 1 a 10)
- **Base**: branch `provo`, `HEAD` = `c36e084` (PR #17, paginação por cursor)
- **Rodada**: `/cycle` autônomo. Toda ambiguidade foi decidida sem perguntar e está registrada em
  "Perguntas em aberto", com a opção adotada e a descartada.

---

# Etapa 1 — Análise

## 1. Contexto

A `apps/api` tem 18 handlers de escrita e nenhum deles grava evento. Um admin pode excluir um usuário
(`apps/api/app/(routes)/users/[id]/route.ts:75`, resposta 204 sem corpo), alterar o perfil e a credencial
de Auth de qualquer pessoa (`:33`) e entrar na conta de qualquer usuário comum
(`apps/app/shared/stores/panelStore.ts:76-90`). Nada disso deixa rastro consultável.

O que existe hoje é log de processo, não trilha. `logEvent`
(`packages/shared/utils/helpers/log.ts:50-56`) escreve uma linha no stdout com escopo tipado, e o
`onRequestError` está plugado (`apps/api/instrumentation.ts:36`). Isso serve para depurar um incidente em
andamento. Não responde "quem alterou esta conta em março", porque a linha morre com a janela de retenção
do provedor, que o `docs/PRE-PRODUCTION.md:361-363` registra como desconhecida.

**Em uma frase**: persistir os eventos sensíveis numa coleção somente-adição do Firestore e expor a
consulta na área admin, reusando a paginação por cursor entregue na PR #17.

### 1.1 O que a PR #17 já resolveu e esta tarefa consome

A trilha cresce monotonicamente e é a primeira coleção do repo desenhada para isso. Listar tudo em memória
(`BaseRepository.findAll()`) seria inviável em poucos meses. O caminho paginado já está pronto e é o motivo
de a spec ter subido para o topo do backlog agora:

| Peça | Onde | Uso aqui |
|------|------|----------|
| `paginate(query, { limit, cursorId })` | `base.repository.ts:80-116` | o repositório da trilha monta a query filtrada e delega |
| Envelope `{ data: { items, nextCursor } }` | `entities/route.ts:30-37` | mesma forma na rota da trilha |
| `parseListQuery(req)`, `PAGE_SIZE_MAX=100` | `pagination.schema.ts:5-6,24` | reusado, com os filtros por cima |
| `PageDTO<T>` / `PageQuery` | `packages/sdk/src/types/pagination/pagination.ts` | contrato da action nova |
| `useAuthorizedInfiniteQuery` | `apps/app/shared/hooks/useAuthorizedInfiniteQuery.ts:17-38` | hook da tela |
| `Table` com `onLoadMore`/`hasMore` | `packages/design-system/components/ui/table.tsx:22-26,159-171` | a tabela da trilha |
| `PAGINATION_CURSOR_INVALID`, `PAGINATION_INDEX_MISSING` | `translations/packages/shared/utils.ts` | já traduzidos nos 3 idiomas |

### 1.2 Corte de MVP

O corte da spec, item a item, e como cada um é atendido:

| Item do corte da spec | Como entra |
|---|---|
| Evento persistido para início/fim de impersonação | **Janela de sessão** gravada pelo servidor no guard, não marcos disparados pelo cliente. Ver §4.1 e a decisão D2. |
| Evento para exclusão de usuário e alteração de perfil por admin | `recordAuditEvent` chamado nos handlers de `users/[id]` PUT e DELETE |
| Cada evento identifica ator, sujeito, ação, alvo e momento | Campos `actorUserId`/`actorUid`/`actorLabel`, `onBehalfOfUserId`, `action`, `targetType`/`targetUserId`/`targetLabel`, `createdAt` |
| Consultável na admin, filtrável por período e usuário, nos 3 idiomas | Tela `/admin/audit` com cursor + filtros; dicionário novo em `pages/admin/auditTrail.ts` |
| Somente-adição: nenhuma rota edita ou apaga evento | Só `GET` exposto; `update`/`delete` do repositório lançam; `firestore.rules` já nega tudo ao cliente |
| Prazo do log de acesso escrito no checklist de fork | Edição de `docs/PRE-PRODUCTION.md:361-363` com o prazo e a fonte |

Duas ações entram além da lista literal: `POST /account/sessions/revoke` e `POST /account/password`. A
spec dedica as linhas 53-66 a elas e chama a revogação de sessão de "caso de escola" da trilha. O custo
marginal é uma chamada por handler, sobre um helper que já existe para os outros eventos. Decisão D4.

### 1.3 Fora de escopo

- **Exportar a trilha e expurgo automático.** Fora do corte na spec, porque o prazo é decisão de cada
  fork. Vira pré-requisito manual (§10.2).
- **Alerta em tempo real** sobre ação sensível. Depende de `observability-logging`.
- **Auditar toda escrita de qualquer recurso.** A spec recusa: "começa caro, envelhece mal e gera ruído".
  Nenhum evento é gravado para `entities` ou `files`.
- **Bloquear mutação sob impersonação.** Já entregue em `docs/features/impersonation-read-only/`.
  `impersonation-read-only.ts:19-31` recusa todo método não seguro, chamado pelos dois guards
  (`admin.ts:62`, `common-panel.ts:62`).
- **Retenção configurável por env e campo `expiresAt`.** Seria meio caminho para o expurgo automático,
  que está fora. Decisão D7.
- **Instrumentar as 8 rotas de `auth/*` e o webhook de pagamentos.** São `export async function POST` sem
  contexto de identidade resolvido; instrumentar cada uma é uma tarefa própria. Registrado como achado.

### 1.4 Apps impactados

| Alvo | O que muda |
|------|-----------|
| `packages/sdk` | tipos `AuditEventDTO`/`AuditAction`/`AuditEventListQuery`, action `audit.list`, registro no `Client` |
| `apps/api` | coleção `auditEvent`, repositório, mapper, schema de filtros, rota `GET /audit-events`, helper de gravação, chamada em 4 handlers, instrumentação no guard comum |
| `apps/app` | tela `/admin/audit` (página, filtros, hook), `queryKeys`, `paths.ts`, `routes.tsx` |
| `packages/internationalization` | `pages/admin/auditTrail.ts` + agregador + chave de rota. Nenhum `apiErrors` novo |
| `packages/shared` | escopo `"audit"` no union `LogScope` (`log.ts:5-13`) |
| `apps/web` | N/A |
| Infra | um índice composto novo em `firestore.indexes.json` + publicação no console |

**Área do painel**: admin (`(admin)/admin/(pages)/`). A leitura usa `requireAdminApi`.

**Modo de produto**: indiferente. A trilha não depende de `NEXT_PUBLIC_PRODUCT_MODE` nem de plano ativo. No
modo `simple` o painel é admin-only e a tela continua no mesmo lugar.

**Genérico ou específico**: específico do app. A coleção, a rota e a tela ficam em `apps/*`. A única coisa
que sobe para `packages/*` é o escopo de log e o contrato do SDK, que é a fachada por definição.

### 1.5 Fontes

A spec `specs/audit-log.md`, lida por completo. Nenhum link externo, card do ClickUp, Figma ou print. As
fontes normativas que a spec cita (Marco Civil art. 15, Res. CD/ANPD 15/2024, Decreto 8.771 art. 13 §2º)
vêm das notas em `specs/research/` e são usadas aqui só para redigir o passo do `PRE-PRODUCTION.md`.

**Referências não lidas**: nenhuma.

---

## 2. Dados (Firestore)

### 2.1 Coleção e documento

Coleção nova: **`auditEvent`**, no singular, como `"entity"` (`entity.repository.ts:12`) e `"user"`
(`user.repository.ts:12`). A rota é plural (`/audit-events`), seguindo a convenção do repo.

| Campo | Tipo | Default | `null`? | Por quê |
|---|---|---|---|---|
| `action` | `AuditAction` (string union) | obrigatório | não | o que aconteceu |
| `actorUserId` | `string` | obrigatório | não | doc id Firestore do perfil de quem agiu |
| `actorUid` | `string` | obrigatório | não | uid do Firebase Auth do ator, para correlacionar com o Auth |
| `actorLabel` | `string` | `null` | sim | e-mail ou nome no momento do evento. Desnormalizado para a trilha sobreviver à exclusão do ator |
| `onBehalfOfUserId` | `string` | `null` | sim | em nome de quem o ator agiu. Preenchido em `impersonation.session`, `null` no resto |
| `targetType` | `"user" \| "account" \| "session"` | obrigatório | não | natureza do alvo |
| `targetUserId` | `string` | `null` | sim | doc id do usuário afetado |
| `targetLabel` | `string` | `null` | sim | e-mail/nome do alvo no momento do evento, pelo mesmo motivo de `actorLabel` |
| `changedFields` | `string[]` | `[]` | não | **nomes** dos campos alterados, nunca os valores. Responde "o que mudou" sem duplicar dado pessoal |
| `involvedUserIds` | `string[]` | obrigatório | não | `[actorUserId, targetUserId, onBehalfOfUserId]` sem duplicata e sem `null`. É o campo que o filtro por usuário consulta com `array-contains` |
| `requestId` | `string` | `null` | sim | correlaciona com a linha do `logEvent`. `requestIdFrom(req)` de `@repo/shared/utils/helpers/request-id` |
| `windowEndsAt` | `string` (ISO) | `null` | sim | fim da janela de sessão de impersonação. `null` nas demais ações |

`createdAt`, `updatedAt` e `deletedAt` vêm do `BaseRepository.create()` (`base.repository.ts:139-144`) e
não entram no `CreateRequest`.

Nomes que ficaram de fora e por quê:

- **`ip` / `userAgent`**: o Decreto 8.771/2016 art. 13 §2º manda reter a menor quantidade possível de dado
  pessoal. O registro de acesso por IP é obrigação de infra (retenção de bucket), não da trilha de
  produto, e a spec separa as duas coisas explicitamente. Extrair IP atrás do proxy da Vercel também é
  frágil. Decisão D6.
- **`isImpersonating`**: seria sempre `false` fora de `impersonation.session`, porque
  `impersonation-read-only.ts:19-31` já recusa toda escrita sob impersonação. Redundante com a própria
  ação.
- **Valores antigo e novo dos campos alterados**: dobraria o dado pessoal guardado sem responder pergunta
  nova no MVP. `changedFields` basta para "o que foi mexido".

### 2.2 Ownership e soft delete

A trilha não tem dono: é dado da plataforma, lido só por admin. Não há `userId` de ownership nem filtro
por `ctx.subjectProfile.id`, porque nenhuma rota comum a lê.

`deletedAt` existe porque o `BaseRepository` o grava, e **nunca muda de valor**. `delete()`
(`base.repository.ts:196-198`) é soft delete via `update()`, e `AuditEventRepository` sobrescreve os dois
para lançar. Consequência prática: a query da trilha **não filtra `deletedAt == null`**, ao contrário de
`entityRepository.listByUserId`. Filtrar um campo que é sempre `null` custaria uma coluna a mais em cada
índice composto sem excluir documento nenhum. Isso é um desvio consciente do padrão do repo, justificado
pela imutabilidade da coleção.

### 2.3 Consultas

Três combinações, todas ordenadas por `createdAt desc` (o `paginate` também desempata por
`FieldPath.documentId()` desc, `base.repository.ts:84-85`):

| Consulta | Cláusulas | Índice |
|---|---|---|
| Tudo | `orderBy createdAt desc` | automático de campo único |
| Por período | `where createdAt >= from`, `where createdAt <= to`, `orderBy createdAt desc` | automático (range e ordenação no mesmo campo) |
| Por usuário, com ou sem período | `where involvedUserIds array-contains userId` + as cláusulas de período | **composto, precisa ser declarado e publicado** |

Índice novo em `firestore.indexes.json`:

```json
{
  "collectionGroup": "auditEvent",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "involvedUserIds", "arrayConfig": "CONTAINS" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

Esse recorte foi escolhido para que a falta do índice degrade bem: sem ele publicado, a listagem e o filtro
de período continuam funcionando, e só o filtro por usuário responde `PAGINATION_INDEX_MISSING` 503, com a
mensagem que já existe nos 3 idiomas. Detalhe em §10.1.

`firestore.rules` não precisa de mudança. O arquivo nega tudo em `match /{document=**}` (`:32-34`) e todo
acesso passa pelo Admin SDK na API, que ignora as rules. Uma coleção nova já nasce fechada para o cliente.

### 2.4 Dados existentes

Coleção nova, zero documento. Sem backfill, sem compatibilidade retroativa a manter. Um fork que atualize
o boilerplate depois desta entrega passa a gravar eventos a partir da atualização; o histórico anterior não
existe e não há como reconstruí-lo.

---

## 3. Contrato — `@repo/sdk`

### 3.1 Tipos novos

`packages/sdk/src/types/audit/audit.ts`:

```ts
/** biome-ignore-all lint/style/noEnum: stable string union for API */
export enum AuditAction {
    IMPERSONATION_SESSION = "impersonation.session",
    USER_UPDATE = "user.update",
    USER_DELETE = "user.delete",
    ACCOUNT_SESSIONS_REVOKE = "account.sessions.revoke",
    ACCOUNT_PASSWORD_CHANGE = "account.password.change",
}

export enum AuditTargetType {
    USER = "user",
    ACCOUNT = "account",
    SESSION = "session",
}

export type AuditEventDTO = {
    id: string;
    action: AuditAction;
    actorUserId: string;
    actorUid: string;
    actorLabel: string | null;
    onBehalfOfUserId: string | null;
    targetType: AuditTargetType;
    targetUserId: string | null;
    targetLabel: string | null;
    changedFields: string[];
    involvedUserIds: string[];
    requestId: string | null;
    windowEndsAt: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
};

export type AuditEventListQuery = {
    /** Doc id do perfil. Casa contra ator, alvo ou sujeito do evento. */
    userId?: string;
    /** `YYYY-MM-DD`, inclusivo, interpretado em UTC. */
    from?: string;
    /** `YYYY-MM-DD`, inclusivo até o fim do dia, em UTC. */
    to?: string;
};
```

Timestamps são `string` ISO, como em `EntityDTO`. `UserDTO` usa `Date` (`types/user/user.ts:16-18`) e é a
exceção do repo, não o padrão a copiar.

Barrel `packages/sdk/src/types/index.ts` ganha `export * from "./audit";` em ordem alfabética, antes de
`./entity`.

### 3.2 Action

`packages/sdk/src/actions/audit/action.ts`, só leitura:

```ts
async list(
    query?: PageQuery & AuditEventListQuery
): Promise<PageDTO<AuditEventDTO>>
```

Registrada em `packages/sdk/src/client/index.ts` como `audit!: AuditActions;` e
`this.audit = new AuditActions(this);`. O contexto efetivo é **admin**, garantido pelo `requireAdminApi` na
API. O SDK não chama `ensureIsAdminContext()` porque nenhuma action existente o faz
(`actions/user/user/action.ts` também não) e adotar a prática só nesta seria inconsistência nova.

### 3.3 Quem quebra

Ninguém. Tipo novo, action nova, nenhuma assinatura existente muda. A busca por `AuditEventDTO`,
`auditEvent` e `audit-events` no repositório não retorna nada hoje.

---

## 4. API (`apps/api`)

### 4.1 Onde o evento é gravado

Duas origens, com motivos diferentes.

**(a) Ações de escrita: chamada explícita no handler.** Quatro pontos:

| Handler | Ação gravada | Alvo |
|---|---|---|
| `users/[id]/route.ts` PUT (`:33`) | `user.update` | o usuário editado |
| `users/[id]/route.ts` DELETE (`:75`) | `user.delete` | o usuário excluído |
| `account/sessions/revoke/route.ts` POST (`:4`) | `account.sessions.revoke` | a própria conta |
| `account/password/route.ts` POST (`:15`) | `account.password.change` | a própria conta |

A alternativa era instrumentar dentro dos guards, que já veem método, identidade e requisição. Foi
descartada: o guard cobriria os 10 handlers guarded de uma vez, e "auditar toda escrita" está fora do corte
por decisão da spec. Restringir por allowlist de path no guard seria casar rota por regex, frágil e menos
legível que quatro chamadas explícitas. A chamada explícita também é a única que conhece o alvo semântico
(o id e o rótulo do usuário afetado) e os campos alterados. O preço é que uma rota sensível futura pode
esquecer a linha; fica como achado, não como escopo.

Para `user.delete`, o handler precisa gravar o evento **com o rótulo do alvo lido antes do delete**, senão
o registro que deveria sobreviver à exclusão nasce sem identificar quem foi excluído.

**(b) Impersonação: gravada pelo servidor, no guard comum.** `common-panel.ts` é o único guard que resolve
os dois perfis, `actorProfile` (`:42`) e `subjectProfile` (`:70`), e onde `resolved.data.isImpersonating`
(`auth-request-context.ts:141`) é verdadeiro. A instrumentação entra ali, logo antes de chamar o handler.

O problema é a granularidade: sob impersonação, **toda** requisição passa por esse ponto, incluindo os GETs
da tela. Gravar um evento por requisição é o ruído que a spec recusa. A solução é um documento com **id
determinístico por janela**:

```
imp_<actorUid>_<subjectUid>_<floor(now / 15min)>
```

gravado com `docRef(id).create()`, que falha com `ALREADY_EXISTS` quando o documento já existe. O
resultado é no máximo um evento por par (ator, sujeito) a cada 15 minutos, append-only por construção, sem
transação e sem estado externo. Um cache em memória do processo evita o round-trip nas requisições
seguintes da mesma janela: só a primeira paga uma escrita.

O que isso entrega e o que não entrega: a trilha passa a responder "o admin X operou na conta de Y entre
14:00 e 14:15", de forma que o admin não consegue evitar, porque a gravação acontece no servidor a partir
dos headers que ele precisa mandar para a impersonação funcionar. Não entrega um marco de "saiu às 14:07".

O desenho alternativo era um endpoint de marco (`POST` com `{ subjectUserId, phase }`) disparado pelo
painel em `useAuthRequestPanel` (`AuthRequestPanelContext.tsx:206-247`). Foi descartado por três motivos
concretos, e a decisão está em D2:

1. A spec proíbe: "Recurso novo de **leitura** da trilha; nenhuma escrita exposta ao cliente".
2. Não funciona na troca de alvo. Ao trocar de usuário personificado, o `apiClient` está em contexto comum
   antes e depois da troca, e `assertReadOnlyWhileImpersonating` (`impersonation-read-only.ts:19-31`)
   recusa o `POST` nos dois momentos. Só a entrada e a saída teriam janela de contexto admin puro.
3. Não é confiável. Fechar a aba não emite marco de fim, e uma trilha que o suspeito pode deixar de
   escrever não é trilha.

### 4.2 Rota de leitura

`GET /audit-events`, guard `requireAdminApi`. Um único arquivo, `apps/api/app/(routes)/audit-events/route.ts`.
Nenhum `POST`, `PUT`, `PATCH` ou `DELETE` é exportado: é assim que "somente-adição" fica verdadeiro no
nível da rota.

Validação em `apps/api/(shared)/validation/audit.schema.ts`, com `parseAuditListQuery(req)` na mesma
assinatura de união discriminada dos demais (`entity.schema.ts:72`), reusando `parseListQuery` para
`limit`/`cursor` e validando por cima:

- `userId`: string não vazia, opcional.
- `from` / `to`: `YYYY-MM-DD`, opcionais, `.refine(from <= to)`.
- `from` vira `Date` no início do dia UTC; `to`, no fim do dia UTC.

Falha de qualquer um cai em `VALIDATION_FAILED` 400, o código genérico que o repo já usa para erro de Zod.

### 4.3 Persistência

`AuditEventRepository extends BaseRepository<AuditEventDTO>`, `super(db, "auditEvent", auditEventMapper)`.
Métodos:

| Método | O que faz |
|---|---|
| `append(data)` | `super.create(data)`, id automático |
| `appendOnce(id, data)` | `doc(id).create(...)`, devolve `false` em `ALREADY_EXISTS` e relança o resto |
| `listPage(filters, page)` | monta a query com os `where` e delega ao `paginate` herdado |
| `update` / `updateBulk` / `delete` / `deleteBulk` | sobrescritos, lançam `AuditEventImmutableError` |

Mapper em `apps/api/(shared)/mappers/audit-event.mapper.ts`, estendendo `Mapper<AuditEventFirestoreRow,
AuditEventDTO>` no molde de `entity.mapper.ts`: `normalizeFirestoreInstant` em `createdAt`/`updatedAt`,
`deletedAt` preservando `null`, arrays com `?? []`, strings opcionais com `?? null`. `toPersistence` com
allowlist explícita, sem os três timestamps, como em `entity.mapper.ts:36-45`.

### 4.4 Falhar ao gravar

A spec chama isso de "a decisão de projeto mais delicada aqui". A gravação é **fail-open**:
`recordAuditEvent` nunca propaga exceção, e em falha escreve `logEvent("audit", "write-failed", { action,
actorUserId, requestId, reason })`.

O motivo é que toda ação auditada aqui já produziu efeito quando a trilha seria escrita, e metade delas
escreve fora do Firestore. `users/[id]` PUT altera `userRepository` e o Firebase Auth
(`users/[id]/route.ts:55,67`); `account/sessions/revoke` só toca o Auth. Devolver 500 depois de revogar as
sessões de alguém não desfaz a revogação: entrega um erro para o usuário sobre uma operação que aconteceu.
Escrita em transação com a ação principal também não é possível, porque o Firestore não transaciona com o
Auth.

O evento não se perde em silêncio: a linha do `logEvent` fica no stdout do provedor com o `requestId` que
já correlaciona com o resto da requisição. É um degrau abaixo do Firestore, não o nada.

Isso exige acrescentar `"audit"` ao union `LogScope` (`packages/shared/utils/helpers/log.ts:5-13`). A
assinatura de `logEvent` recusa objeto de propósito (`:15-19`), então o motivo da falha entra como
`error.name`, nunca a mensagem, que pode carregar caminho de documento.

### 4.5 Erros

**Nenhum `error.code` novo.** Os três reusados:

| Código | Status | Quando |
|---|---|---|
| `ADMIN_FORBIDDEN` | 403 | quem chama não é admin (`admin.ts:44`) |
| `AUTH_INVALID_TOKEN` | 401 | sem token válido (`admin.ts:31-40`) |
| `VALIDATION_FAILED` | 400 | filtro malformado, `from > to`, `limit` não numérico |
| `PAGINATION_CURSOR_INVALID` | 400 | `PaginationCursorError`, cursor cuja âncora sumiu |
| `PAGINATION_INDEX_MISSING` | 503 | `isMissingIndexError`, índice composto não publicado |

Todos já têm entrada em `apiErrors` nos 3 idiomas. `packages/internationalization/__tests__/parity.test.ts`
não é afetado por esta parte.

O `catch` da rota copia o de `entities/route.ts:38-52`, inclusive o `throw error` final para o que não for
um desses dois: engolir erro desconhecido esconderia falha de infra atrás de uma lista vazia.

---

## 5. Front-end (`apps/app`)

### 5.1 Rota e renderização

Árvore nova, espelhando `admin/(pages)/users/`:

```
apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/audit/
  (pages)/(home)/page.tsx            RSC, prefetch
  (pages)/(home)/loading.tsx         Skeleton + TableSkeleton
  (pages)/(home)/AuditListClient.tsx "use client", colunas + Table + filtros
  (components)/AuditFilters.tsx      FormProvider + 2 DateInput + Select de usuário
  (hooks)/useListAuditEvents.tsx     fetchAuditEventsList + useListAuditEvents
  (validations)/auditFiltersSchema.ts buildAuditFiltersSchema(dictionary)
```

`page.tsx` faz `prefetchInfiniteQuery` com `getServerApiClient("admin")` dentro de
`if (!(await isImpersonating()))`, no molde de `users/(pages)/(home)/page.tsx:12-28`. O guard é redundante
com o redirect do `admin/layout.tsx:28-30`, e fica por consistência com as outras páginas admin.

Entradas de navegação: `admin/paths.ts` ganha o bloco `audit.list` e `admin/routes.tsx` ganha o segundo
item de `SIDEBAR_ELEMENTS` (`:18-32`, hoje com um único item), com ícone `ScrollTextIcon` do `lucide-react`
e a dependência acrescentada no array do `useMemo`, que lista dependência a dependência.

### 5.2 Dados

`queryKeys.auditEvents` em `apps/app/shared/lib/queryKeys.ts`, com os filtros dentro da chave. Sem isso o
cache mistura períodos, que é o mesmo motivo pelo qual `users.list(type)` já carrega o `type` na chave
(`queryKeys.ts:25-27`).

`AUDIT_EVENTS_PAGE_SIZE = 20` em `apps/app/shared/lib/pagination.ts`, ao lado de `ENTITIES_PAGE_SIZE`, para
o Server Component prefetchar com o mesmo tamanho sem importar o client do browser.

O hook usa `useAuthorizedInfiniteQuery`, nunca `useInfiniteQuery` direto. Erro de carga vai para
`handleClientError(new FormattedError(listError, locale))` e entra no `loadError` do `Container`, como em
`EntitiesListClient.tsx:43-45,152`.

### 5.3 Filtros

Três campos, aplicados por botão e não a cada tecla (cada aplicação é uma query nova ao Firestore):

| Campo | Componente | Origem dos dados |
|---|---|---|
| `from` | `HookFormDateInput` | livre, `YYYY-MM-DD` |
| `to` | `HookFormDateInput` | livre, `YYYY-MM-DD` |
| `userId` | `HookFormSelect` | `useListUsers()` (`shared/hooks/useListUsers.ts:37`), já disponível na admin |

Não existe filtro de período em nenhuma tela do repo hoje, e o `DateInput`
(`packages/design-system/components/ui/date-input.tsx:24-36`) é single-date com `placeholder` hardcoded
`"Pick a date"` (`:50`). Dois campos separados resolvem sem tocar no design system; o `placeholder`
traduzido é passado por prop. Estender o `Calendar` para `mode="range"` seria mudança no pacote
compartilhado por uma tela só.

Os filtros ficam dentro de `FormProvider` com `useForm` + `zodResolver`, como qualquer formulário do repo,
mesmo sem submit para a API: é o que faz os `HookForm*` funcionarem (`hookformDateInput.tsx:37` usa
`useFormContext()`).

### 5.4 Tabela

`Table` em modo cursor, no molde de `EntitiesListClient.tsx:155-168`: `pagination={false}`, `hasMore`,
`onLoadMore`, `loadMoreLoading`, `onRefresh`, `refreshLoading`, `rowKey`, `locale.emptyText`.

Colunas: momento (`formatDisplayDateTime`, `shared/lib/formatDisplayDateTime.ts:20-28`), ação (rótulo
traduzido via `actionLabels[action]`), ator (`actorLabel`), alvo (`targetLabel`), campos alterados
(`changedFields` unidos por vírgula, vazio vira travessão).

`searchFields` recebe `["actorLabel", "targetLabel"]`. Ele filtra em memória sobre as linhas já carregadas
(`table.tsx:83-103`) e só alcança campo de primeiro nível, o que estes dois são. O componente já avisa
quando a busca não achou e ainda há páginas (`searchMissesPendingPages`, `:112-118`), copy que existe em
`translations/components/ui/table.ts`.

### 5.5 Estados

Carregando inicial (skeleton do `loading.tsx`), vazio (`locale.emptyText`), erro de carga (`loadError` no
`Container`), carregando mais (`loadMoreLoading`), filtro sem resultado (o mesmo `emptyText`), e o 503 de
índice ausente, que chega como `PAGINATION_INDEX_MISSING` traduzido pelo `FormattedError`.

---

## 6. i18n

Arquivo novo `packages/internationalization/translations/apps/app/pages/admin/auditTrail.ts`, exportando
`adminAuditTrailPageTranslations` com as três chaves de locale lado a lado, no molde de `admin/users.ts`.

```
apps.app.pages.admin.auditTrail
├── list
│   ├── empty
│   ├── searchPlaceholder
│   ├── noChangedFields
│   ├── columns { createdAt, action, actor, target, changedFields }
│   └── actionLabels
│       ├── "impersonation.session"
│       ├── "user.update"
│       ├── "user.delete"
│       ├── "account.sessions.revoke"
│       └── "account.password.change"
├── filters { title, userLabel, userPlaceholder, userAll, fromLabel, toLabel, datePlaceholder, apply, clear }
└── messages { loadError }
```

Agregação: `pages/admin/index.ts` ganha `auditTrail: adminAuditTrailPageTranslations[<locale>]` nos três
blocos. `pages/admin/routes/index.ts` ganha `platform.audit: { list: ... }` nos três, para a sidebar e o
breadcrumb. `pages/index.ts`, `apps/app/index.ts` e `global.ts` não mudam.

`apiErrors` não muda, porque nenhum código novo foi criado (§4.5). O teste de paridade
(`__tests__/parity.test.ts:31`) compara `en` e `es` contra `pt-br` nas duas direções e cobre as chaves
novas automaticamente.

Rótulo de ação com ponto na chave (`"user.delete"`) exige aspas no objeto. A alternativa era camelCase
(`userDelete`) com um mapa de conversão; usar a string da API como chave elimina o mapa e faz a falta de
tradução de uma ação nova falhar no typecheck.

---

## 7. Autorização e segurança

- **Leitura**: `requireAdminApi` (`admin.ts:27`). Responde 403 `ADMIN_FORBIDDEN` quando
  `profile.type !== UserType.ADMIN` (`:44`). Usuário comum não tem caminho para a trilha: a rota é
  admin-only e a tela vive sob `(admin)/admin/`, cujo layout chama `requireAdmin(locale)` (`layout.tsx:24`).
- **Escrita**: nenhuma rota escreve. Os eventos nascem de código servidor (`recordAuditEvent` nos handlers
  e no guard). O cliente não tem verbo para criar, editar ou apagar evento.
- **Impersonação**: o layout admin redireciona para fora quando `isImpersonating` (`layout.tsx:28-30`),
  então a tela não abre sob impersonação. Pela API, um admin impersonando **consegue** ler a trilha, porque
  `GET` é método seguro e passa pelo `assertReadOnlyWhileImpersonating`. Aceito: `requireAdminApi` já exige
  que o ator seja admin, e é o mesmo admin nos dois casos.
- **PII na trilha**: `actorLabel` e `targetLabel` guardam e-mail ou nome de exibição. É dado pessoal, e é o
  motivo de a trilha ser admin-only. `changedFields` guarda nome de campo, nunca valor, para não duplicar
  o dado alterado dentro do registro de que ele foi alterado.
- **Nenhum id vindo do corpo é confiado**: `actorUserId` e `actorUid` vêm de `ctx.user` e do perfil
  resolvido pelo guard, jamais do payload. `userId` do filtro é só um critério de busca sobre dados que o
  admin já pode ver por inteiro.
- **Rate limit**: `/audit-events` não entra em `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:50`). É leitura
  autenticada admin-only, no mesmo patamar de `/users`.
- **CORS**: nenhum header customizado novo, nada a acrescentar em `allowHeaders`.

---

## 8. Testes

Todos unitários, nenhum exige emulador ou app servindo.

| Arquivo | Nível | O que prova |
|---|---|---|
| `apps/api/__tests__/auditListQuerySchema.test.ts` | schema | `from > to` reprova, data malformada reprova, `YYYY-MM-DD` vira início/fim de dia UTC, `limit` clampado no teto |
| `apps/api/__tests__/auditEventMapper.test.ts` | mapper | `Timestamp` vira ISO, `deletedAt` preserva `null`, campos ausentes viram `null`/`[]` |
| `apps/api/__tests__/auditEventRepository.test.ts` | repositório | `update`/`delete`/`updateBulk`/`deleteBulk` lançam; `appendOnce` devolve `false` em `ALREADY_EXISTS` e relança outro erro |
| `apps/api/__tests__/auditEventsRoute.test.ts` | rota | `vi.mock` do repositório e do guard: caminho feliz com envelope `{ data: { items, nextCursor } }`, 400 em cursor inválido, 503 em índice ausente, 400 em filtro inválido, 403 sem admin |
| `apps/api/__tests__/auditRecorder.test.ts` | helper | `recordAuditEvent` não propaga exceção quando o repositório rejeita e chama `logEvent("audit", "write-failed", …)`; monta `involvedUserIds` sem duplicata e sem `null` |
| `apps/api/__tests__/usersAdminAuditTrail.test.ts` | rota | DELETE `/users/[id]` grava `user.delete` com `targetLabel` preenchido, e devolve 204 mesmo quando a gravação falha |
| `apps/api/__tests__/impersonationSessionDedupe.test.ts` | helper | duas chamadas na mesma janela produzem a mesma chave e uma escrita só; janelas diferentes produzem chaves diferentes |
| `apps/api/__tests__/firestoreIndexes.test.ts` | estático (estender) | o índice de `auditEvent` está declarado no arquivo |
| `apps/app/__tests__/useListAuditEvents.test.tsx` | hook | `renderHook` + `QueryClientProvider` com `@/shared/lib/client` mockado: filtros diferentes geram chaves diferentes, o cursor da segunda página é o `nextCursor` da primeira |
| `apps/app/__tests__/auditFiltersSchema.test.ts` | schema | `buildAuditFiltersSchema(dictionary)` reprova `from > to` com a mensagem do dicionário |

O teste de índice merece a linha: o emulador do Firestore serve qualquer query, indexada ou não, então
nenhum outro teste percebe uma declaração faltando. O comentário em `firestoreIndexes.test.ts:18-21` já
registra isso, e o arquivo existe exatamente para cobrir esse buraco de forma estática.

Nenhum teste de emulador é planejado. O que o emulador provaria aqui (ordenação, cursor, serialização de
`Timestamp`) já foi provado na PR #17 sobre o mesmo `paginate`, e o que ele **não** prova é justamente o
índice.

---

## 9. Validação visual (`agent-browser`)

Comandos em sequência, nunca concorrentes: chamadas paralelas travam o daemon e os screenshots saem da aba
errada.

Fluxos, com screenshot de cada um:

1. `/admin/audit` com a trilha vazia (estado inicial de um projeto limpo).
2. Personificar um usuário pelo seletor do navbar, navegar, voltar para o painel admin e abrir a trilha:
   o evento `impersonation.session` aparece com ator, alvo e momento.
3. Excluir um usuário na `/admin/users` e conferir que o evento `user.delete` aparece com o rótulo do
   usuário excluído, que já não existe na listagem de usuários.
4. Filtrar por período sem resultado (estado vazio com filtro ativo).
5. Filtrar por usuário (com o índice publicado, a lista filtra; sem ele, o alerta traduzido de
   `PAGINATION_INDEX_MISSING`).
6. "Carregar mais" com mais de 20 eventos.

Cada um em light, dark e mobile. O `Table` é antd e precisa de conferência de tema explícita.

---

## 10. Pré-requisitos manuais de infra

O `/develop` não consegue satisfazer nenhum destes, e o `/test` não deve reprovar a entrega por causa
deles. Cada um traz o modo degradado, que é comportamento projetado e testável.

### 10.1 Publicar o índice composto de `auditEvent`

- **O que fazer**: `firebase deploy --only firestore:indexes` no projeto do fork, ou criar pelo link que o
  próprio erro do Firestore devolve no console.
- **Sem ele**: a tela abre, a listagem funciona e o filtro de período funciona. Só o filtro **por usuário**
  falha, com `PAGINATION_INDEX_MISSING` 503 e a mensagem já traduzida ("A listagem está indisponível no
  momento. Tente de novo em instantes."). Nunca 500, nunca tela branca.
- **Como verificar**: `firebase firestore:indexes` lista o índice de `auditEvent`; na tela, escolher um
  usuário no filtro e ver a lista responder em vez do alerta.
- **Por que nenhum gate local pega**: o emulador serve qualquer query, indexada ou não. `pnpm turbo run
  lint typecheck test` passa com o índice faltando. A única defesa automatizada é o teste estático sobre
  `firestore.indexes.json`, que prova que a declaração existe no arquivo, não que foi publicada.

### 10.2 Decidir e aplicar a retenção da coleção `auditEvent`

- **O que fazer**: decidir o prazo com finalidade declarada e configurar o expurgo no projeto do fork. Sem
  campo `expiresAt` no documento (fora do corte, §1.3), a TTL policy nativa do Firestore não se aplica, e o
  expurgo é manual ou por job do fork.
- **Sem ele**: a coleção cresce sem limite. Não quebra nada, e cada documento é pequeno, mas o custo de
  armazenamento é herdado por todo fork.
- **Como verificar**: contagem de documentos em `auditEvent` no console do Firestore.
- **Aviso normativo**: a spec é explícita em que não existe prazo legal para trilha de auditoria de
  negócio no Brasil. O Decreto 8.771/2016 art. 13 §2º aponta no sentido contrário, mandando reter a menor
  quantidade possível e excluir tão logo atingida a finalidade. "A lei exige 6 meses" é generalização falsa
  e não deve entrar em código, doc nem mensagem de commit.

### 10.3 Configurar a retenção do log de acesso da plataforma

Isto é o item `[~]` do corte. O passo já existe em `docs/PRE-PRODUCTION.md:361-363`, sem prazo, dizendo que
o número precisa ser lido no painel do provedor.

- **O que esta entrega faz**: escrever o prazo e a fonte naquele passo. Provedor de aplicações pessoa
  jurídica com fins econômicos deve guardar registros de acesso a aplicações por 6 meses (Marco Civil,
  Lei 12.965/2014, art. 15). Registro de acesso é data e hora de uso a partir de um IP (art. 5º, VIII), e
  desde o Decreto 12.975/2026 o IP guardado deve incluir a porta lógica de origem. O texto precisa separar
  isso da trilha de ações: são coisas diferentes com o mesmo nome, e o art. 13 (1 ano) é de registro de
  conexão, obrigação de ISP.
- **O que o fork faz**: conferir e ajustar a retenção no painel do provedor. No GCP, o bucket `_Default`
  retém 30 dias, insuficiente para os 6 meses.
- **Sem ele**: nada quebra na aplicação. É exposição normativa do fork, não defeito de código.

---

# Etapa 2 — Blueprint técnico

## B1. Contrato do SDK

`packages/sdk/src/actions/audit/action.ts`:

```ts
import type { Client } from "../../client/index";
import type { Response } from "../../client/type";
import type {
    AuditEventDTO,
    AuditEventListQuery,
    PageDTO,
    PageQuery,
} from "../../types";

export default class AuditActions {
    // biome-ignore lint/style/noParameterProperties: SDK client pattern
    constructor(private readonly client: Client) {
        this.client = client;
    }

    async list(
        query?: PageQuery & AuditEventListQuery
    ): Promise<PageDTO<AuditEventDTO>> {
        const { data } = await this.client.request<
            Response<PageDTO<AuditEventDTO>>
        >({
            url: "/audit-events",
            method: "GET",
            params: {
                ...(query?.limit ? { limit: query.limit } : {}),
                ...(query?.cursor ? { cursor: query.cursor } : {}),
                ...(query?.userId ? { userId: query.userId } : {}),
                ...(query?.from ? { from: query.from } : {}),
                ...(query?.to ? { to: query.to } : {}),
            },
        });

        return data.data;
    }
}
```

O spread condicional é o mesmo de `EntityActions.list` (`actions/entity/action.ts:23-26`): parâmetro vazio
cai fora da query string em vez de virar `?cursor=null`.

## B2. Requisição e resposta de exemplo

```
GET /audit-events?limit=20&userId=4Qx1&from=2026-09-01&to=2026-09-16
Authorization: Bearer <id-token do admin>
x-user-id: <uid do admin>
x-request-user-id: <uid do admin>
x-user-role: admin
x-request-role: admin
```

```json
{
  "data": {
    "items": [
      {
        "id": "imp_ABC123_XYZ789_1789012",
        "action": "impersonation.session",
        "actorUserId": "4Qx1",
        "actorUid": "ABC123",
        "actorLabel": "admin@example.com",
        "onBehalfOfUserId": "9Kp7",
        "targetType": "user",
        "targetUserId": "9Kp7",
        "targetLabel": "cliente@example.com",
        "changedFields": [],
        "involvedUserIds": ["4Qx1", "9Kp7"],
        "requestId": "6f0c1d2e-...",
        "windowEndsAt": "2026-09-16T14:15:00.000Z",
        "createdAt": "2026-09-16T14:00:03.117Z",
        "updatedAt": "2026-09-16T14:00:03.117Z",
        "deletedAt": null
      },
      {
        "id": "Q2m8vT1a",
        "action": "user.delete",
        "actorUserId": "4Qx1",
        "actorUid": "ABC123",
        "actorLabel": "admin@example.com",
        "onBehalfOfUserId": null,
        "targetType": "user",
        "targetUserId": "7Lw3",
        "targetLabel": "removido@example.com",
        "changedFields": [],
        "involvedUserIds": ["4Qx1", "7Lw3"],
        "requestId": "1a9b8c7d-...",
        "windowEndsAt": null,
        "createdAt": "2026-09-15T18:22:41.004Z",
        "updatedAt": "2026-09-15T18:22:41.004Z",
        "deletedAt": null
      }
    ],
    "nextCursor": "eyJ2IjoxLCJpZCI6IlEybTh2VDFhIn0"
  }
}
```

Tabela `error.code` → status:

| Situação | `error.code` | Status | Novo? |
|---|---|---|---|
| Sem token válido | `AUTH_INVALID_TOKEN` | 401 | não |
| Quem chama não é admin | `ADMIN_FORBIDDEN` | 403 | não |
| `from > to`, data malformada, `limit` inválido | `VALIDATION_FAILED` | 400 | não |
| Âncora do cursor não existe mais | `PAGINATION_CURSOR_INVALID` | 400 | não |
| Índice composto não publicado | `PAGINATION_INDEX_MISSING` | 503 | não |

## B3. Documento no Firestore

```
auditEvent/{id}
  action            string
  actorUserId       string
  actorUid          string
  actorLabel        string | null
  onBehalfOfUserId  string | null
  targetType        string
  targetUserId      string | null
  targetLabel       string | null
  changedFields     string[]
  involvedUserIds   string[]
  requestId         string | null
  windowEndsAt      Timestamp | null
  createdAt         Timestamp
  updatedAt         Timestamp
  deletedAt         null      (nunca muda)
```

O `{id}` é gerado pelo Firestore nos eventos de escrita e determinístico nos de impersonação
(`imp_<actorUid>_<subjectUid>_<bucket>`), que é o que dá o dedupe.

## B4. Repositório

`apps/api/(shared)/repositories/audit-event.repository.ts`:

```ts
const ALREADY_EXISTS = 6;

export class AuditEventImmutableError extends Error {
    constructor() {
        super("Audit events are append-only");
        this.name = "AuditEventImmutableError";
    }
}

export type AuditEventFilters = {
    userId?: string;
    from?: Date;
    to?: Date;
};

class AuditEventRepository extends BaseRepository<AuditEventDTO> {
    constructor() {
        super(db, "auditEvent", auditEventMapper);
    }

    append(data: CreateRequest<AuditEventDTO>): Promise<AuditEventDTO> {
        return super.create(data);
    }

    async appendOnce(
        id: string,
        data: CreateRequest<AuditEventDTO>
    ): Promise<boolean> {
        try {
            await this.db
                .collection(this.table)
                .doc(id)
                .create({
                    ...data,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                });
            return true;
        } catch (error) {
            if ((error as { code?: number }).code === ALREADY_EXISTS) {
                return false;
            }
            throw error;
        }
    }

    listPage(
        filters: AuditEventFilters,
        page: PageRequest
    ): Promise<RepositoryPage<AuditEventDTO>> {
        let query: Query = this.db.collection(this.table);

        if (filters.userId) {
            query = query.where(
                "involvedUserIds",
                "array-contains",
                filters.userId
            );
        }
        if (filters.from) {
            query = query.where("createdAt", ">=", filters.from);
        }
        if (filters.to) {
            query = query.where("createdAt", "<=", filters.to);
        }

        return this.paginate(query, page);
    }

    update(): Promise<string> {
        throw new AuditEventImmutableError();
    }

    updateBulk(): Promise<string[]> {
        throw new AuditEventImmutableError();
    }

    delete(): Promise<void> {
        throw new AuditEventImmutableError();
    }

    deleteBulk(): Promise<void> {
        throw new AuditEventImmutableError();
    }
}

export const auditEventRepository = new AuditEventRepository();
```

Sem filtro de `deletedAt`, pelo motivo de §2.2. `paginate` é `protected` na base e acessível aqui, como em
`entity.repository.ts:18`.

## B5. Helper de gravação

`apps/api/(shared)/lib/audit-recorder.ts`:

```ts
const IMPERSONATION_WINDOW_MS = 15 * 60 * 1000;
const DEDUPE_CACHE_MAX = 500;

const recentWindows = new Map<string, number>();

function buildInvolvedUserIds(input: AuditEventInput): string[] {
    return Array.from(
        new Set(
            [
                input.actorUserId,
                input.targetUserId,
                input.onBehalfOfUserId,
            ].filter((id): id is string => Boolean(id))
        )
    );
}

export async function recordAuditEvent(
    input: AuditEventInput
): Promise<void> {
    try {
        await auditEventRepository.append({
            ...input,
            changedFields: input.changedFields ?? [],
            involvedUserIds: buildInvolvedUserIds(input),
            windowEndsAt: null,
        });
    } catch (error) {
        logEvent("audit", "write-failed", {
            action: input.action,
            actorUserId: input.actorUserId,
            requestId: input.requestId,
            reason: error instanceof Error ? error.name : "unknown",
        });
    }
}

export async function recordImpersonationSession(
    input: ImpersonationSessionInput
): Promise<void> {
    const startedAtMs =
        Math.floor(Date.now() / IMPERSONATION_WINDOW_MS) *
        IMPERSONATION_WINDOW_MS;
    const key = `imp_${input.actorUid}_${input.subjectUid}_${startedAtMs}`;

    if (recentWindows.has(key)) {
        return;
    }

    try {
        await auditEventRepository.appendOnce(key, {
            action: AuditAction.IMPERSONATION_SESSION,
            /* … ator, alvo, rótulos … */
            windowEndsAt: new Date(startedAtMs + IMPERSONATION_WINDOW_MS),
        });
        rememberWindow(key);
    } catch (error) {
        logEvent("audit", "impersonation-write-failed", {
            actorUid: input.actorUid,
            requestId: input.requestId,
            reason: error instanceof Error ? error.name : "unknown",
        });
    }
}
```

`rememberWindow` mantém o `Map` abaixo de `DEDUPE_CACHE_MAX`, descartando as chaves mais antigas. O cache
é do processo: em serverless ele esquenta e esfria, e o pior caso é uma tentativa de `create()` a mais que
falha com `ALREADY_EXISTS`. A corretude não depende dele, só o custo.

`windowEndsAt` é gravado como `Date` e o mapper o normaliza para ISO na leitura, igual aos outros
instantes.

## B6. Rota

`apps/api/app/(routes)/audit-events/route.ts`:

```ts
export const GET = requireAdminApi(async (req) => {
    const parsed = parseAuditListQuery(req);
    if (!parsed.ok) {
        return parsed.response;
    }

    const { limit, cursorId, userId, from, to } = parsed.value;

    try {
        const page = await auditEventRepository.listPage(
            { userId, from, to },
            { limit, cursorId }
        );

        return Response.json({
            data: {
                items: page.items,
                nextCursor: page.nextCursorId
                    ? encodeCursor(page.nextCursorId)
                    : null,
            },
        });
    } catch (error) {
        if (error instanceof PaginationCursorError) {
            return Response.json(
                { error: { code: "PAGINATION_CURSOR_INVALID" } },
                { status: HTTP_STATUS.BAD_REQUEST }
            );
        }
        if (isMissingIndexError(error)) {
            return Response.json(
                { error: { code: "PAGINATION_INDEX_MISSING" } },
                { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
            );
        }
        throw error;
    }
});
```

Nenhum outro verbo é exportado neste arquivo.

## B7. Pseudo-diffs dos arquivos existentes

**`packages/shared/utils/helpers/log.ts:5-13`**

```diff
 export type LogScope =
     | "account"
+    | "audit"
     | "auth"
     | "auth-action-link"
```

**`apps/api/app/(guards)/common-panel.ts`** — depois de resolver `subjectProfile` (`:70-78`) e antes de
chamar o handler:

```diff
+        if (resolved.data.isImpersonating) {
+            await recordImpersonationSession({
+                actorUserId: actorProfile.id,
+                actorUid: userRecord.uid,
+                actorLabel: userRecord.email ?? null,
+                subjectUid: resolved.data.requestUserId,
+                subjectUserId: subjectProfile.id,
+                subjectLabel:
+                    subjectProfile.email ?? subjectProfile.name ?? null,
+                requestId: requestIdFrom(req),
+            });
+        }
+
         return handler(req, enrichedContext);
```

**`apps/api/app/(routes)/users/[id]/route.ts`** — DELETE (`:75-91`), com o rótulo lido antes da exclusão:

```diff
         const profile = await userRepository.findById(id);
         if (!profile) { /* 404 USERS_NOT_FOUND */ }
+        const targetLabel = profile.email ?? profile.name ?? null;

         await userRepository.delete(id);
+
+        await recordAuditEvent({
+            action: AuditAction.USER_DELETE,
+            actorUserId: /* perfil do ator resolvido pelo guard */,
+            actorUid: ctx.user.uid,
+            actorLabel: ctx.user.email ?? null,
+            targetType: AuditTargetType.USER,
+            targetUserId: id,
+            targetLabel,
+            requestId: requestIdFrom(req),
+        });
+
         return new Response(null, { status: 204 });
```

O PUT (`:33-73`) segue a mesma forma, com `action: USER_UPDATE` e `changedFields` montado a partir das
chaves do patch validado mais as chaves do `authUpdate`, que é o que captura `displayName`/`disabled` indo
para o Firebase Auth (`:67`) sem passar por repositório nenhum.

**⚠️ `AdminAuthContext` não tem o perfil do ator.** `admin.ts:12-15` expõe `user: UserRecord` e
`authRequest`, mas o `profile` resolvido em `:42` fica dentro do guard. Para gravar `actorUserId` (doc id
Firestore) nos handlers de `users/[id]`, o guard precisa acrescentar `actorProfile: UserDTO` ao
`enrichedContext` (`:70-78`), no mesmo formato que `common-panel.ts` já faz com `subjectProfile`
(`:12-17`). É a única mudança de contrato de guard nesta tarefa, é aditiva e não quebra handler existente.

**`apps/api/app/(routes)/account/sessions/revoke/route.ts`** — hoje tem 8 linhas:

```diff
         await revokeUserSessions(ctx.user.uid);
+
+        await recordAuditEvent({
+            action: AuditAction.ACCOUNT_SESSIONS_REVOKE,
+            actorUserId: ctx.subjectProfile.id,
+            actorUid: ctx.user.uid,
+            actorLabel: ctx.user.email ?? null,
+            targetType: AuditTargetType.SESSION,
+            targetUserId: ctx.subjectProfile.id,
+            targetLabel: ctx.user.email ?? null,
+            requestId: requestIdFrom(req),
+        });
+
         return Response.json({ data: { confirmed: true } });
```

`account/password/route.ts` recebe a mesma chamada, com `ACCOUNT_PASSWORD_CHANGE` e
`targetType: ACCOUNT`, depois do `revokeUserSessions` de `:63`. Nenhuma senha, hash ou credencial entra no
evento.

**`firestore.indexes.json`** — o terceiro índice do arquivo:

```diff
         { "fieldPath": "reference_id", "order": "ASCENDING" },
         { "fieldPath": "deletedAt", "order": "ASCENDING" }
       ]
+    },
+    {
+      "collectionGroup": "auditEvent",
+      "queryScope": "COLLECTION",
+      "fields": [
+        { "fieldPath": "involvedUserIds", "arrayConfig": "CONTAINS" },
+        { "fieldPath": "createdAt", "order": "DESCENDING" }
+      ]
     }
```

**`apps/app/shared/lib/queryKeys.ts`**

```diff
+    auditEvents: {
+        all: ["auditEvents"] as const,
+        // Os filtros entram na chave porque a API resolve cada combinação como uma
+        // consulta diferente; sem isso o cache mistura períodos.
+        list: (filters?: { userId?: string; from?: string; to?: string }) =>
+            [
+                ...queryKeys.auditEvents.all,
+                "list",
+                filters?.userId ?? "all",
+                filters?.from ?? "",
+                filters?.to ?? "",
+            ] as const,
+    },
     entities: {
```

**`apps/app/.../admin/routes.tsx:18-32`** — segundo item do `SIDEBAR_ELEMENTS`, com a dependência
acrescentada no array do `useMemo`, que lista dependência a dependência.

**`docs/PRE-PRODUCTION.md:361-363`** — reescrever o passo com o prazo e a fonte, conforme §10.3.

## B8. Ordem de implementação

1. `packages/shared`: escopo `"audit"` no `LogScope`.
2. `packages/sdk`: tipos, barrel, action, registro no `Client`.
3. `apps/api`: mapper, repositório, schema de filtros, rota `GET /audit-events`.
4. `apps/api`: helper `audit-recorder`, `actorProfile` no `AdminAuthContext`, chamadas nos 4 handlers,
   instrumentação no guard comum.
5. `firestore.indexes.json` + teste estático do índice.
6. `apps/app`: `queryKeys`, `pagination`, hook, filtros, tela, navegação.
7. `packages/internationalization`: dicionário novo, agregador, chave de rota.
8. `docs/PRE-PRODUCTION.md`: prazo do log de acesso.

O contrato do SDK vem antes da API porque a API importa `AuditEventDTO` de `@repo/sdk/src/types`, como
`entity.repository.ts:1` já faz.

## B9. Plano de commits sugerido

Um por app ou pacote, pulverizado por funcionalidade. Quem cria a branch e commita é o `/review`.

| # | Mensagem | Conteúdo |
|---|---|---|
| 1 | `feat(shared): audit log scope for structured logging` | `log.ts` + teste |
| 2 | `feat(sdk): audit event contract and read action` | tipos, barrel, action, `Client` |
| 3 | `feat(api): append-only audit event repository and mapper` | repositório, mapper, testes dos dois |
| 4 | `feat(api): admin audit event listing endpoint` | schema de filtros, rota, testes |
| 5 | `feat(api): record sensitive actions in the audit trail` | `audit-recorder`, `actorProfile` no guard admin, chamadas nos 4 handlers, testes |
| 6 | `feat(api): record impersonation sessions from the common panel guard` | instrumentação do guard comum, dedupe, teste |
| 7 | `chore(api): declare the audit event composite index` | `firestore.indexes.json` + teste estático |
| 8 | `feat(app): admin audit trail screen with cursor paging and filters` | `queryKeys`, `pagination`, hook, filtros, tela, testes |
| 9 | `feat(app): audit trail entry in the admin sidebar` | `paths.ts`, `routes.tsx` |
| 10 | `feat(internationalization): audit trail copy in the three locales` | dicionário, agregador, rota |
| 11 | `docs: access log retention window for forks` | `PRE-PRODUCTION.md` |
| 12 | `docs(features): audit-log` | `docs/features/audit-log/` |

---

# Critérios de aceite (Checklist)

- [ ] **Um admin excluindo um usuário deixa registro que sobrevive à exclusão**
  Ao chamar `DELETE /users/:id` como admin, um documento com `action: "user.delete"` é criado em
  `auditEvent` com `actorUserId`/`actorUid`/`actorLabel` do admin e `targetUserId`/`targetLabel` do
  excluído. O `targetLabel` é lido **antes** do soft delete, então o evento continua identificando quem
  foi excluído mesmo depois que o perfil sai da listagem. A resposta continua 204 sem corpo.

- [ ] **Alteração de perfil por admin registra quais campos mudaram, e só os nomes**
  `PUT /users/:id` grava `action: "user.update"` com `changedFields` contendo os nomes dos campos do
  patch, incluindo os que vão para o Firebase Auth (`displayName`, `disabled`) e não passam pelo
  repositório. Nenhum valor antigo ou novo é gravado. Um PUT que não altera nada é rejeitado antes pelo
  `.refine` do schema (`USERS_NOTHING_TO_UPDATE`) e não gera evento.

- [ ] **Impersonação gera um evento por janela, não um por requisição**
  Um admin que entre na conta de um usuário comum e navegue por várias telas gera **um** documento
  `impersonation.session` para aquela janela de 15 minutos, com `onBehalfOfUserId` e `targetUserId`
  preenchidos e `windowEndsAt` no fim da janela. Vinte requisições na mesma janela continuam produzindo um
  único documento, porque o id é determinístico e `doc().create()` falha com `ALREADY_EXISTS`. Passados os
  15 minutos com o admin ainda personificando, um segundo documento é criado.

- [ ] **Trocar o usuário personificado gera um evento novo**
  Com o admin já personificando A e trocando para B pelo seletor do navbar, a próxima requisição produz um
  documento `impersonation.session` distinto, porque a chave de dedupe inclui o uid do sujeito. O evento de
  A não é alterado.

- [ ] **Revogação de sessão e troca de senha aparecem na trilha**
  `POST /account/sessions/revoke` grava `account.sessions.revoke` e `POST /account/password` grava
  `account.password.change`, ambos com o ator igual ao alvo. Nenhuma senha, hash ou token entra no
  documento. A resposta de sucesso das duas rotas não muda.

- [ ] **A gravação da trilha nunca derruba a ação principal**
  Com o Firestore recusando a escrita da trilha (repositório mockado rejeitando), `DELETE /users/:id`
  continua respondendo 204 e o usuário continua excluído. A falha vira uma linha
  `[audit] write-failed action=… requestId=…` no stdout, com `reason` derivado de `error.name` e nunca da
  mensagem do erro.

- [ ] **Nenhum caminho da aplicação edita ou apaga um evento gravado**
  A rota `/audit-events` exporta apenas `GET`: `POST`, `PUT`, `PATCH` e `DELETE` respondem 405 do próprio
  Next. Chamar `update`, `updateBulk`, `delete` ou `deleteBulk` no `AuditEventRepository` lança
  `AuditEventImmutableError`. As `firestore.rules` continuam negando leitura e escrita direta do cliente
  em qualquer coleção.

- [ ] **A trilha é admin-only, na API e não só na UI**
  `GET /audit-events` com token de usuário comum responde 403 `ADMIN_FORBIDDEN`; sem token, 401
  `AUTH_INVALID_TOKEN`. Digitar `/pt-br/admin/audit` na barra de endereços como usuário comum não abre a
  tela: o layout admin chama `requireAdmin(locale)`. Um admin personificando é redirecionado para fora de
  `/admin` pelo layout.

- [ ] **A listagem pagina por cursor e não carrega a coleção inteira**
  Com mais de 20 eventos, a primeira resposta traz 20 itens e um `nextCursor` não nulo; "Carregar mais"
  busca a página seguinte e acrescenta as linhas sem duplicar as anteriores. A ordenação é `createdAt`
  decrescente, com desempate estável por id, então dois eventos com o mesmo instante não se repetem nem
  somem entre páginas.

- [ ] **Cursor expirado responde 400 e não 500**
  Passar um cursor cuja âncora já não existe devolve `PAGINATION_CURSOR_INVALID` 400 e a tela mostra "A
  navegação expirou. Recarregue a lista." Um cursor corrompido ou não decodificável também cai em 400, sem
  vazar stack trace.

- [ ] **Filtro de período inclui os dois extremos**
  Filtrar de `2026-09-01` a `2026-09-16` traz eventos criados em qualquer momento do dia 1 e em qualquer
  momento do dia 16, porque `from` é convertido para o início do dia UTC e `to` para o fim. `from`
  posterior a `to` responde `VALIDATION_FAILED` 400 e o formulário mostra a mensagem do dicionário antes
  mesmo de chamar a API. Data malformada (`2026-13-45`) também cai em 400.

- [ ] **Filtro por usuário casa ator, alvo e sujeito**
  Escolher um usuário no filtro devolve tanto os eventos em que ele agiu quanto aqueles em que ele foi o
  alvo ou o sujeito da impersonação, porque a consulta usa `array-contains` sobre `involvedUserIds`.
  Combinar usuário e período aplica as duas restrições. Uma combinação sem resultado mostra o estado
  vazio, não um erro.

- [ ] **Sem o índice composto publicado, a tela degrada e não quebra**
  Com o índice ausente no projeto Firebase, a listagem sem filtro de usuário funciona normalmente, e o
  filtro por usuário responde `PAGINATION_INDEX_MISSING` 503, exibido como "A listagem está indisponível no
  momento. Tente de novo em instantes." nos três idiomas. A aplicação sobe, o build passa e nenhuma
  resposta é 500. O emulador não reproduz esse cenário: ele serve qualquer query.

- [ ] **O índice está declarado no repositório**
  `firestore.indexes.json` contém a entrada de `auditEvent` com `involvedUserIds` em `CONTAINS` e
  `createdAt` em `DESCENDING`, e o teste estático de `apps/api/__tests__/firestoreIndexes.test.ts` falha se
  alguém remover a declaração.

- [ ] **Cada filtro tem seu próprio cache**
  Trocar o período ou o usuário no filtro busca dados novos em vez de mostrar o resultado anterior, porque
  os filtros entram na `queryKey`. Voltar ao filtro anterior reaproveita o cache. Clicar "Aplicar" duas
  vezes seguidas com os mesmos valores não dispara duas requisições.

- [ ] **Nenhuma string de UI aparece solta**
  Títulos de coluna, rótulos de ação, placeholders dos campos de data, rótulos do filtro, botões, estado
  vazio e mensagem de erro vêm de `apps.app.pages.admin.auditTrail`. O teste de paridade do
  `@repo/internationalization` passa nos três idiomas, e trocar o locale troca todo o texto da tela,
  incluindo os rótulos das cinco ações.

- [ ] **A tela respeita tema e viewport**
  A trilha renderiza corretamente em light, dark e mobile, com screenshots dos estados normal, vazio,
  filtro sem resultado e erro. A tabela é antd e precisa ser conferida explicitamente no tema escuro.

- [ ] **Nenhum contrato existente quebrou**
  `apiClient.entity.list()`, `apiClient.user.list()` e as demais actions continuam com a mesma assinatura.
  `pnpm turbo run lint typecheck test` passa em todas as tasks, e `pnpm check` não aponta correção.

---

# Perguntas em aberto

Nenhuma bloqueia a implementação. Cada uma traz a opção adotada nesta rodada.

**D1. Auditar leituras ou só escritas e impersonação?**
Opções: só escritas + impersonação · toda leitura também.
**Adotado: só escritas + impersonação**, que é a recomendação da própria spec. Auditar leitura multiplica
volume e custo sem responder pergunta nova, já que o admin pode ler tudo por definição do papel.

**D2. Como registrar início e fim de impersonação?**
Opções: (a) janela de sessão gravada pelo servidor no guard, com dedupe por id determinístico; (b)
endpoint de marco `start`/`end` chamado pelo painel.
**Adotado: (a).** A spec proíbe escrita exposta ao cliente, e (b) não funciona na troca de alvo, porque
`assertReadOnlyWhileImpersonating` recusa o `POST` enquanto o contexto de impersonação está ativo. Além
disso, (b) depende de o cliente cooperar, e o cliente aqui é o próprio suspeito. O preço de (a) é não ter
um instante exato de saída: a trilha registra janelas de 15 minutos de atividade, com `windowEndsAt`.
**Se o instante exato de saída for requisito**, é (b) com uma exceção explícita no guard read-only, e vale
uma tarefa própria.

**D3. Janela de 15 minutos é a granularidade certa?**
Opções: 5, 15 ou 60 minutos.
**Adotado: 15 minutos**, como constante nomeada no código, não env. Em uma sessão de suporte de uma hora
são 4 documentos, o suficiente para reconstituir o período sem virar um evento por clique. Mudar depois é
trocar uma constante, e os eventos já gravados permanecem válidos.

**D4. Incluir `account.sessions.revoke` e `account.password.change`?**
Opções: só o corte literal (impersonação + exclusão + alteração de perfil por admin) · incluir as duas.
**Adotado: incluir.** A spec dedica as linhas 53-66 a elas e chama a revogação de "caso de escola". O custo
é uma chamada por handler sobre um helper que já existe. `POST /users` (criação de usuário pelo admin)
ficou de fora por não estar no corte.

**D5. Instrumentar no guard ou nos handlers?**
Opções: allowlist de path no guard · chamada explícita em cada handler sensível.
**Adotado: chamada explícita.** O guard cobriria tudo de uma vez, mas "auditar toda escrita" está fora do
corte, e restringir por path viraria regex frágil. A chamada explícita é a única que conhece o id e o
rótulo do alvo. Risco aceito: uma rota sensível futura pode esquecer a linha.

**D6. Gravar IP e user agent no evento?**
Opções: gravar · não gravar.
**Adotado: não gravar.** O Decreto 8.771/2016 art. 13 §2º manda reter o mínimo, o registro de acesso por IP
é obrigação de infra (retenção de bucket) e não da trilha de produto, e extrair IP atrás do proxy da Vercel
é frágil. `requestId` fica, e correlaciona com o log estruturado sem ser dado pessoal.

**D7. Campo `expiresAt` para habilitar a TTL policy do Firestore?**
Opções: gravar o campo agora e deixar o fork só ligar a policy no console · não gravar.
**Adotado: não gravar.** "Expurgo automático" está em "Fora do corte" na spec, e o prazo é decisão de cada
fork. Sem o campo, o expurgo é manual, e isso está registrado em §10.2. O campo custaria pouco e vale como
primeira tarefa depois desta, se a decisão de prazo for tomada.

**D8. Flag de env para desligar a trilha em um fork?**
Opções: `AUDIT_LOG_ENABLED` no padrão "presença da variável liga" · sem flag.
**Adotado: sem flag.** A spec não pede, e a trilha é a contrapartida da impersonação: um fork que a desligue
fica exatamente no estado que a spec descreve como problema. O repo também não tem nenhuma flag booleana
hoje (as capacidades opcionais usam presença de variável de configuração, como `FIREBASE_STORAGE_BUCKET`).
Um fork que queira desligar remove as chamadas, que estão em cinco lugares nomeados.

**D9. Fuso horário do filtro de período.**
Opções: UTC · o fuso do navegador, que já chega em `ctx.authRequest.userTimezone`.
**Adotado: UTC.** O comentário em `auth-request-context.ts:18` diz que `userTimezone` é para formatação e
nunca para autorização, e converter janela de data por fuso no servidor é fonte conhecida de erro de um
dia. A coluna de momento na tela é formatada no fuso local pelo `Intl`, então o usuário vê hora local e
filtra por dia UTC. **Se a diferença incomodar**, o ajuste é converter os extremos usando
`userTimezone` no schema, e é local.

**D10. O sinal de pronto da spec está desatualizado.**
A spec diz: "Um admin entra no contexto de um usuário, **altera algo** e sai: os três momentos aparecem na
trilha." Alterar algo sob impersonação já não é possível desde `impersonation-read-only`: os dois guards
recusam todo método não seguro. O sinal verificável hoje é "entra, **lê**, e sai". Não muda o escopo,
muda o roteiro de teste, e está refletido nos critérios de aceite.
