# Plano — Paginação por cursor no `BaseRepository` e no SDK

- **Spec de origem**: [`specs/cursor-pagination.md`](../../../../specs/cursor-pagination.md)
- **Slug**: `cursor-pagination`
- **Guia seguido**: [`docs/feature-analysis-guide.md`](../../../feature-analysis-guide.md) (seções 1 a 10)
- **Rodada**: `/cycle` autônomo — as ambiguidades foram decididas e estão registradas em
  "Perguntas em aberto", com a opção adotada.

---

# Etapa 1 — Análise

## 1. Contexto

Toda listagem do boilerplate lê a coleção inteira do Firestore. `BaseRepository.findAll()`
(`apps/api/(shared)/repositories/base.repository.ts:36-49`) monta a query apenas com
`where("deletedAt", "==", null)` e chama `.get()`: nenhum `limit`, nenhum `orderBy`, nenhum cursor.
`EntityRepository.listByUserId` (`entity.repository.ts:11-32`) filtra `deletedAt` em memória (`:20-22`)
e ordena por `createdAt` em memória (`:27-31`). A rota entrega o array inteiro
(`apps/api/app/(routes)/entities/route.ts:16-17`), o SDK devolve `EntityDTO[]` sem envelope
(`packages/sdk/src/actions/entity/action.ts:15-22`) e a tabela pagina no navegador sobre o array
completo (`EntitiesListClient.tsx:151-155`).

Como todo fork nasce copiando o slice `entity`, o custo de leitura por documento é herdado por
construção. Corrigir depois que houver dado em produção significa mudar DTO, contrato do SDK, hooks,
cache do React Query e índices ao mesmo tempo.

**Em uma frase**: fazer o slice `entity` ler uma página por vez, do Firestore até a tela, e deixar esse
caminho como o template que os forks copiam.

### 1.1 Corte de MVP

A menor fatia vertical que entrega valor observável:

1. `BaseRepository` ganha um método de leitura paginada com ordenação estável e cursor opaco.
2. `EntityRepository.listByUserId` passa a filtrar e ordenar **no Firestore**, não em memória.
3. `GET /entities` aceita `limit` e `cursor` e responde em envelope, com teto de tamanho no servidor.
4. O SDK expõe o envelope tipado; `entity.list()` deixa de devolver array cru.
5. O hook e a tela de `entities` paginam com "carregar mais"; o `Table` do design system ganha o botão.
6. O índice composto exigido pela consulta nova entra em `firestore.indexes.json`.
7. **`BaseRepository.update()` para de corromper `createdAt`** — sem isso a ordenação por `createdAt`
   não é confiável (detalhe em §2.3).

### 1.2 Fora de escopo

Herdado da spec (`specs/cursor-pagination.md:84-91`):

- Busca textual no servidor. O `searchFields` do `Table` continua filtrando em memória, agora só sobre as
  páginas já carregadas — limitação conhecida, registrada em "Perguntas em aberto".
- Contagem total de registros.
- Migrar a listagem de usuários (`user.repository.ts:32-43`) — carrega o N+1 do Admin SDK.
- Filtros compostos arbitrários na API.

Decidido neste plano, além da spec:

- `findAll()` **não é renomeado nem removido**. É usado por `user.repository.ts:33` e por três testes
  (`apps/api/__tests__/baseRepository.test.ts:229-266`, `userRepositoryList.test.ts:54`); renomear é raio
  de impacto sem ganho funcional. Ganha um comentário de uma linha declarando que lê a coleção inteira.
- Nenhuma mudança em `packages/sdk/src/actions/user/user/action.ts` nem em `useListUsers`.

### 1.3 Apps impactados

| Alvo | Impacto |
|------|---------|
| `packages/sdk` | Tipo `PageDTO<T>`/`PageQuery` novo; **breaking change** em `entity.list()`. |
| `apps/api` | `BaseRepository.paginate` + correção do `update`; rota `GET /entities`; validação de query; 2 `error.code` novos; script de backfill. |
| `apps/app` | `useAuthorizedInfiniteQuery`, `useListEntities`, prefetch RSC, `useEntityCrud` (cache), `EntitiesListClient`. |
| `apps/web` | N/A. |
| `packages/design-system` | `Table` com "carregar mais" controlado pelo servidor. |
| `packages/internationalization` | `components.table.loadMore` + 2 chaves em `apiErrors`, nos 3 idiomas. |
| Infra | Um índice composto em `firestore.indexes.json` + publicação. Nenhuma env nova, nenhum serviço novo. |

Área do painel: **comum** (`(common)`), guard `requireCommonPanelApi`. Modo de produto: indiferente —
`subscription` e `simple` compartilham a mesma listagem. Não depende de assinatura nem de plano.

Sobre `.claude/cycle-policy.md:47` ("escopo em `apps/*`, não em `packages/*`"): a regra existe para não
enfiar domínio de um produto nos pacotes. O que entra aqui — envelope de paginação no SDK, botão de
carregar mais no `Table`, dois rótulos no dicionário — é genérico, está no `area` da spec
(`specs/cursor-pagination.md:8`) e faz parte do corte de MVP dela (`:78-81`).

### 1.4 Fontes e referências

A spec é a fonte de requisitos e foi lida por completo. Nenhum link externo, Figma, print ou card.
Nota de mercado citada pela spec: `specs/research/engineering-baseline.md` (prática 11).
Seção "Referências não lidas": vazia.

---

## 2. Dados (Firestore)

### 2.1 Coleção e documento

Coleção `entity`, sem campo novo. A forma do documento não muda: `userId`, `name`, `description`,
`type`, `photo`, `genre`, `birthdate`, `enabled`, `createdAt`, `updatedAt`, `deletedAt` — como o
`create()` estampa em `base.repository.ts:71-92` e o seed reproduz em
`apps/api/scripts/seed-emulator.mjs:132-145`.

O que muda é **o tipo gravado** em `createdAt`: hoje um documento pode carregar `Timestamp` ou `string`,
dependendo de já ter passado por um `PUT`. Ver §2.3.

### 2.2 Consultas

Consulta nova, a que substitui `listByUserId`:

```
collection("entity")
  .where("userId", "==", <profileId>)
  .where("deletedAt", "==", null)
  .orderBy("createdAt", "desc")
  .orderBy(FieldPath.documentId(), "desc")
  .startAfter(<snapshot do último documento da página anterior>)   // só a partir da 2ª página
  .limit(<tamanho> + 1)
```

Três pontos que decidem o desenho:

- **Desempate obrigatório.** O seed grava as entidades de um mesmo dono com um único
  `const now = new Date()` fora do laço (`seed-emulator.mjs:132-145`), então quatro registros
  compartilham o instante exato. Sem o `orderBy` por `documentId`, `startAfter` sobre `createdAt`
  repetido pula ou repete registros. O desempate `desc` acompanha a direção de `createdAt`, que é o que
  o Firestore usa como cauda implícita do índice — por isso a entrada em `firestore.indexes.json`
  não precisa declarar `__name__`.
- **Filtro `deletedAt` migra para o Firestore.** Deixa de ser o descarte em memória de
  `entity.repository.ts:20-25`. Consequência: documento **sem** o campo `deletedAt` deixa de aparecer —
  o Firestore não casa campo ausente contra `null`, comportamento que o próprio fake de teste já
  documenta (`apps/api/__tests__/baseRepository.test.ts:35-37`). Tratado no backfill (§2.3).
- **Índice composto exigido.** `where` em dois campos + `orderBy` num terceiro. Entrada a acrescentar:

```json
{
  "collectionGroup": "entity",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "deletedAt", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

O arquivo já versiona um índice composto (`firestore.indexes.json:3-10`, o de `findByReferenceId`) e o
caminho de publicação já foi percorrido (`docs/SETUP.md:190-200`).

⚠️ **O emulador do Firestore não cobra índice composto** — ele serve qualquer consulta. Rodar a feature
contra `pnpm emulators` prova ordenação, cursor e desempate, mas **não** prova que a entrada existe. Por
isso o plano inclui um teste estático que lê `firestore.indexes.json` e confere a entrada (§7), e por
isso o modo degradado (§4.4) existe.

Regras do Firestore (`firestore.rules`) não mudam: continuam `deny-all`, e a API acessa via Admin SDK.

### 2.3 Dados existentes — o `update()` corrompe `createdAt`

`BaseRepository.update()` (`base.repository.ts:102-117`) monta o patch assim:

```ts
const currentData = await this.findById(data.id);
const updated = { ...currentData, ...data, updatedAt: new Date() };
```

`findById()` devolve o DTO **já passado pelo mapper** (`:60-64`), e o mapper normaliza instantes com
`normalizeFirestoreInstant` (`entity.mapper.ts:23-29`), cuja assinatura devolve `string`
(`packages/shared/utils/helpers/normalizeFirestoreInstant.ts:5`). No primeiro `PUT`, portanto, o
`createdAt` é reescrito no Firestore como **string ISO**, não como `Timestamp`. O mesmo vale para o
`delete()`, que é um `update` (`base.repository.ts:127-129`).

Isso hoje passa despercebido porque a ordenação acontece em memória sobre o DTO já normalizado
(`entity.repository.ts:27-31`), onde string e Timestamp viram o mesmo `new Date(...)`. Com `orderBy` no
Firestore não passa: o Firestore ordena **por tipo antes de por valor**, então uma coleção com documentos
mistos produz uma ordem que não é cronológica, e `startAfter` sobre ela pula ou repete registros.

Não dá para planejar cursor estável sem consertar isso. Entra no corte, em duas partes:

**Parte 1 — a raiz.** `update()` deixa de reler o documento. `docRef.update()` já é merge parcial, então
o `findById` + spread era redundante além de danoso:

```ts
async update(data: UpdateRequest<DTO>): Promise<string> {
    const { id, ...fields } = data;
    await this.db.collection(this.table).doc(id).update({
        ...(fields as DocumentData),
        updatedAt: new Date(),
    });
    return id;
}
```

Comportamento preservado: documento inexistente continua rejeitado (hoje pelo `docRef.update` em `:114`,
depois pelo mesmo `docRef.update`); campos não enviados continuam intactos (era o merge do Firestore que
garantia isso, não o spread). Some uma leitura por escrita.

**Parte 2 — o que já está gravado.** Um fork com dados em produção tem documentos com `createdAt` em
string. Script novo `apps/api/scripts/backfill-instants.mjs`:

- recebe `--collection=<nome>` (repetível) e roda em **dry-run por padrão**; só escreve com `--apply`;
- converte `createdAt`/`updatedAt`/`deletedAt` de string ISO para `Timestamp`;
- estampa `deletedAt: null` onde o campo está ausente (o outro modo de o documento sumir da consulta
  nova, §2.2);
- é idempotente: documento já correto não é tocado, então rodar duas vezes não muda nada;
- imprime o `projectId` alvo antes de escrever.

Diferente do `seed-emulator.mjs`, **não** carrega a trava de `emulatorTarget.mjs:26-45` — o alvo legítimo
dele é justamente um projeto real. É pré-requisito manual de infra (§10), não algo que o `/develop`
satisfaz.

**Alternativas descartadas** (registradas em "Perguntas em aberto"): coerção na leitura não resolve, já
que o problema é a ordenação dentro do Firestore, antes de qualquer leitura nossa; ordenar por
`__name__` puro é imune ao tipo mas o id automático do Firestore é aleatório, não cronológico — a lista
de referência deixaria de vir da mais recente para a mais antiga.

---

## 3. Contrato — `@repo/sdk`

### 3.1 Tipos novos

Arquivo novo `packages/sdk/src/types/pagination/pagination.ts` (+ `index.ts` do diretório, + reexport em
`packages/sdk/src/types/index.ts`, seguindo o formato de `types/entity/`):

```ts
export type PageDTO<T> = {
    items: T[];
    /** Opaco: repasse como veio. `null` quando não há página seguinte. */
    nextCursor: string | null;
};

export type PageQuery = {
    limit?: number;
    cursor?: string | null;
};
```

Sem `hasMore`: `nextCursor !== null` já responde isso, e o `getNextPageParam` do React Query lê o cursor
direto. Um booleano redundante pode divergir do cursor.

`EntityDTO` não muda.

### 3.2 Action

```ts
async list(query?: PageQuery): Promise<PageDTO<EntityDTO>>
```

A action continua no contexto `common`, registrada no `Client` como já está.

### 3.3 Quem quebra

Todos os consumidores de `entity.list()`, enumerados:

| Arquivo | Linha | O que quebra | Ação |
|---------|-------|--------------|------|
| `apps/app/.../entities/(hooks)/useListEntities.tsx` | `:6-17` | `fetchEntitiesList()` sem parâmetro, `useAuthorizedQuery` retorna `EntityDTO[]` | vira infinite query |
| `apps/app/.../entities/(pages)/(home)/page.tsx` | `:19-23` | `prefetchQuery` com `client.entity.list()` | vira `prefetchInfiniteQuery` |
| `apps/app/.../entities/(pages)/(home)/EntitiesListClient.tsx` | `:23-28`, `:146-160` | `dataSource={entities ?? []}` | consome o array achatado + botão de carregar mais |
| `apps/app/.../entities/(hooks)/useEntityCrud.tsx` | `:104-119`, `:128-133` | `getQueryData<EntityDTO[]>` / `setQueryData<EntityDTO[]>` no toggle otimista e no rollback | passa a operar sobre `InfiniteData<PageDTO<EntityDTO>>` |
| `apps/app/__tests__/useEntityCrud.test.tsx` | — | asserção sobre a forma do cache | atualizar |
| `apps/app/__tests__/entitiesListReadOnly.test.tsx` | — | mock de `useListEntities` | atualizar o retorno mockado |
| `apps/api/app/(routes)/entities/route.ts` | `:15-18` | `listByUserId` devolvia array | envelope |
| `apps/api/__tests__/entitiesRouteImpersonation.test.ts` | `:173`, `:192` | `listByUserIdMock` resolvia array; asserção `toHaveBeenCalledWith(TARGET_PROFILE.id)` | atualizar |
| `apps/api/__tests__/entityPhotoReference.test.ts` | `:275-320` | `listByUserIdMock.mockResolvedValue([...])` + leitura de `body.data` como array | atualizar |
| `apps/api/__tests__/baseRepository.test.ts` | `:332-355` | `listByUserId` devolvia array | atualizar |

`user.list()`, `account`, `file` e `application` não são tocados.

---

## 4. API (`apps/api`)

### 4.1 Rota e guard

`GET /entities` — guard `requireCommonPanelApi`, inalterado. Query string nova: `limit` e `cursor`,
ambos opcionais. Nenhum header novo, então `apps/api/proxy.ts` não muda. `POST /entities` e
`/entities/[id]` não mudam.

Ownership continua vindo de `ctx.subjectProfile.id`: o `userId` da consulta nunca vem do cliente.

### 4.2 Validação na borda

Arquivo novo `apps/api/(shared)/validation/pagination.schema.ts`, no formato de união discriminada de
`entity.schema.ts:72-102`:

```ts
const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;
const CURSOR_MAX = 512;

const listQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).optional(),
    cursor: z.string().min(1).max(CURSOR_MAX).optional(),
});

export function parseListQuery(req: Request):
    | { ok: true; value: { limit: number; cursorId: string | null } }
    | { ok: false; response: Response };
```

Regras:

- `limit` ausente → `PAGE_SIZE_DEFAULT`.
- `limit` acima de `PAGE_SIZE_MAX` → **clampado** para o teto, sem erro. É o que a spec pede
  (`specs/cursor-pagination.md:76-77`): a resposta não cresce nem quando o cliente pede um absurdo.
- `limit` inválido (`0`, negativo, fracionário, não numérico) → `400 VALIDATION_FAILED`. Clampar valor
  inválido esconderia erro de integração; clampar valor grande é a regra de negócio.
- `cursor` presente e indecodificável → `400 PAGINATION_CURSOR_INVALID`.

O cursor é opaco na borda e id cru dentro do repositório. Helper novo
`apps/api/(shared)/lib/pagination.ts`:

```ts
export const encodeCursor = (id: string): string =>
    Buffer.from(JSON.stringify({ v: 1, id })).toString("base64url");

export const decodeCursor = (raw: string): string | null => { /* null quando inválido */ };

export const isMissingIndexError = (error: unknown): boolean => /* FAILED_PRECONDITION + "requires an index" */;
```

A versão `v: 1` no payload existe para trocar a ordenação depois sem quebrar cliente.

### 4.3 Persistência

`BaseRepository` ganha um helper protegido e mantém tudo o mais:

```ts
export type RepositoryPage<DTO> = { items: DTO[]; nextCursorId: string | null };

protected async paginate(
    query: Query,
    { limit, cursorId }: { limit: number; cursorId: string | null }
): Promise<RepositoryPage<DTO>>
```

O que ele faz: aplica `orderBy("createdAt", "desc")` + `orderBy(FieldPath.documentId(), "desc")`;
quando há `cursorId`, lê o documento âncora (`doc(cursorId).get()`) e aplica `startAfter(snapshot)`;
busca `limit + 1`; devolve os primeiros `limit` mapeados e o id do último como `nextCursorId` quando
sobrou registro.

**Por que ancorar num snapshot e não nos valores do cursor.** `startAfter(timestamp, id)` exigiria
serializar o `createdAt` no cursor, e o `Timestamp` do Firestore tem precisão de nanossegundo que não
sobrevive a um round-trip por ISO string. Registros criados no mesmo milissegundo voltariam a repetir ou
sumir — exatamente o bug que o desempate existe para matar. O custo é uma leitura de documento por
página a partir da segunda, contra a coleção inteira que se lia antes.

Âncora inexistente (id forjado ou documento removido em definitivo) → lança `PaginationCursorError`,
exportado do mesmo módulo, que a rota traduz em `400 PAGINATION_CURSOR_INVALID`. Documento
soft-deleted continua servindo de âncora: ele existe e seus valores de ordenação são válidos.

`EntityRepository.listByUserId(userId, page)` passa a montar a query com os dois `where` e delegar ao
`paginate`. O `sort` em memória de `:27-31` sai.

`findAll()` fica como está.

### 4.4 Erros

| `error.code` | Status | Quando |
|--------------|--------|--------|
| `VALIDATION_FAILED` | 400 | `limit` inválido (já existe em `apiErrors`) |
| `PAGINATION_CURSOR_INVALID` | 400 | cursor indecodificável ou âncora inexistente |
| `PAGINATION_INDEX_MISSING` | 503 | o Firestore recusou a consulta por falta de índice |

Os dois códigos novos exigem entrada em `apiErrors` nos 3 idiomas
(`packages/internationalization/translations/packages/shared/utils.ts`) — sem isso o teste de paridade
(`packages/internationalization/__tests__/parity.test.ts`) falha.

**Modo degradado — índice não publicado.** É o cenário em que um fork faz deploy do código antes de
publicar o índice. Sem tratamento, o Admin SDK lança `FAILED_PRECONDITION` e a rota devolve 500. Com o
`isMissingIndexError` no `catch` da rota, ela devolve `503 { error: { code: "PAGINATION_INDEX_MISSING" } }`,
o app renderiza `LoadErrorState` com a mensagem traduzida (via `loadError` do `Container`,
`apps/app/shared/components/ui/Container.tsx:14`) e o resto do painel continua funcionando. A app sobe,
o build passa, ninguém vê stack trace.

Contrato de resposta de sucesso: `200 { data: { items: [...], nextCursor: string | null } }`.

---

## 5. Front-end (`apps/app`)

### 5.1 Rotas e renderização

Nenhuma rota nova. `entities/(pages)/(home)/page.tsx` continua RSC com prefetch, agora
`prefetchInfiniteQuery`, e continua dentro do `if (!(await isImpersonating()))` (`:16`). A `queryKey`
permanece `queryKeys.entities.list()` — a chave não muda, o **formato do cache** muda
(`InfiniteData<PageDTO<EntityDTO>>`). `loading.tsx` não muda.

### 5.2 Dados

Hook novo `apps/app/shared/hooks/useAuthorizedInfiniteQuery.ts`, espelhando
`useAuthorizedQuery.ts:21-35`: mesma porta `sdkAuthorized` do `panelStore`, sobre `useInfiniteQuery`. A
razão documentada em `useAuthorizedQuery.ts:11-20` (401 cacheado antes de o token chegar) vale igual
para a infinite query, então usar `useInfiniteQuery` direto reintroduziria o bug.

`useListEntities` passa a devolver o array achatado em `data` (para a tabela não mudar de contrato) mais
`fetchNextPage`, `hasNextPage` e `isFetchingNextPage`. `fetchEntitiesList` mantém o nome exigido por
`apps/app/CLAUDE.md` e ganha o parâmetro de página.

`ENTITIES_PAGE_SIZE = 20` vive em `apps/app/shared/lib/pagination.ts` — módulo sem dependência de
cliente, para o RSC `page.tsx` poder importar sem arrastar o `apiClient`.

`useEntityCrud`: `create`/`update`/`delete` continuam com `invalidateQueries` (o React Query refaz a
primeira página e descarta as seguintes, que é o comportamento correto depois de uma escrita). O toggle
otimista de `enabled` continua sem `invalidateQueries`, como manda `apps/app/CLAUDE.md`, mas passa a
percorrer `pages[].items[]`.

### 5.3 Tabela

`packages/design-system/components/ui/table.tsx` ganha quatro props opcionais — `onLoadMore`,
`hasMore`, `loadMoreLoading`, `loadMoreLabel` — e renderiza um `Button` centralizado abaixo do
`AntdTable` quando `onLoadMore && hasMore`. Nada mais muda: `searchFields`, `onRefresh` e o `Omit` de
`AntdTableProps` (`:11-22`) ficam como estão. Componentes que não passam `onLoadMore` renderizam igual
a hoje.

`EntitiesListClient` passa `pagination={false}` no lugar do bloco `:151-155` e liga o botão ao
`fetchNextPage`. Duas paginações sobrepostas (a do antd sobre o acumulado e a do servidor) confundiriam
mais do que ajudam.

A busca (`searchFields={["name", "description"]}`, `:158`) continua filtrando em memória, agora sobre as
páginas carregadas. É a limitação que a spec declarou fora do corte (`specs/cursor-pagination.md:86-87`).

### 5.4 Estados

- Carga inicial: `loading.tsx` + `Container loading`.
- Erro de carga (inclusive índice ausente): `Container loadError` → `LoadErrorState`.
- Vazio: `locale.emptyText` do `Table`, como hoje.
- Carregando a página seguinte: `loadMoreLoading` no botão (`isFetchingNextPage`).
- Fim da lista: o botão some (`hasMore` falso).

---

## 6. i18n

Árvore nova, mesma estrutura em `pt-br` / `en` / `es`:

| Chave | pt-br | en | es |
|-------|-------|----|----|
| `components.table.loadMore` | Carregar mais | Load more | Cargar más |
| `apiErrors.PAGINATION_CURSOR_INVALID` | A navegação expirou. Recarregue a lista. | This page reference expired. Reload the list. | La navegación expiró. Vuelve a cargar la lista. |
| `apiErrors.PAGINATION_INDEX_MISSING` | A listagem está indisponível no momento. Tente de novo em instantes. | The listing is unavailable right now. Try again shortly. | El listado no está disponible ahora. Inténtalo de nuevo en unos instantes. |

Arquivos: `packages/internationalization/translations/components/ui/table.ts` (hoje com
`searchPlaceholder` e `refresh`) e `translations/packages/shared/utils.ts`. Use a skill `/i18n-sync`.

A copy de `PAGINATION_INDEX_MISSING` fala em indisponibilidade, não em índice: é pendência de
configuração do operador, e a mensagem que o usuário final lê não precisa expor a causa.

---

## 7. Autorização e segurança

- Guard e ownership não mudam. `userId` vem de `ctx.subjectProfile.id`
  (`apps/api/app/(routes)/entities/route.ts:16`), nunca do cliente.
- **O cursor não é credencial.** Ele carrega um id de documento, e o `startAfter` acontece **dentro** de
  uma query que já tem `where("userId", "==", ctx.subjectProfile.id)`. Um cursor de outro usuário serve
  de âncora de ordenação, mas a página devolvida continua filtrada pelo dono autenticado — não vaza
  registro alheio. O que ele revela é a existência de um id, que já é público para quem o inventou.
- **Impersonação**: o prefetch RSC continua pulado quando `isImpersonating()` (`page.tsx:16`) e o
  cliente refaz com os headers certos. O caminho paginado não muda nada aí. A tela em modo somente
  leitura (`ImpersonationReadOnlyNotice`, `entitiesListReadOnly.test.tsx`) segue igual: carregar mais é
  leitura.
- Nenhum dado sensível novo em DTO, log ou erro.
- `firestore.rules` e rate limit (Arcjet) não mudam.

---

## 8. Testes

Cada linha diz o nível e o que ele prova.

| # | Arquivo | Nível | O que prova |
|---|---------|-------|-------------|
| 1 | `apps/api/__tests__/paginationQuery.test.ts` (novo) | unit | `parseListQuery`: default 20, clamp acima de 100, rejeição de `0`/`-1`/`1.5`/`"abc"` com `VALIDATION_FAILED`, round-trip `encodeCursor`/`decodeCursor`, cursor malformado → `PAGINATION_CURSOR_INVALID` |
| 2 | `apps/api/__tests__/baseRepository.test.ts` (estender) | unit | `paginate`: busca `limit+1`, devolve `limit`, `nextCursorId` é o id do último item; última página devolve `nextCursor` nulo; âncora inexistente lança `PaginationCursorError` |
| 3 | `apps/api/__tests__/baseRepository.test.ts` (estender) | unit (regressão) | `update()` **não** reescreve `createdAt`: semear com `Timestamp`, atualizar `name`, ler o documento cru e conferir que `createdAt` continua `Timestamp` |
| 4 | `apps/api/__tests__/entitiesRouteList.test.ts` (novo) | rota, com `vi.mock` do repositório e do guard | envelope na resposta, `listByUserId` recebe `{ limit, cursorId }`, `limit` absurdo chega clampado, erro de índice vira `503 PAGINATION_INDEX_MISSING`, cursor inválido vira `400 PAGINATION_CURSOR_INVALID` |
| 5 | `apps/api/__tests__/firestoreIndexes.test.ts` (novo) | estático | `firestore.indexes.json` declara a entrada de `entity` com `userId` + `deletedAt` + `createdAt DESC`. É o único gate automatizado do índice, porque **o emulador não cobra índice composto** |
| 6 | `apps/app/__tests__/useListEntities.test.tsx` (novo) | hook | `fetchNextPage` acumula a segunda página, o array achatado traz as duas sem duplicar id, `hasNextPage` fica falso quando `nextCursor` é nulo |
| 7 | `apps/app/__tests__/useEntityCrud.test.tsx` (atualizar) | hook | toggle otimista atravessa `pages[].items[]` e o rollback restaura o cache |
| 8 | `apps/app/__tests__/entitiesListReadOnly.test.tsx` (atualizar) | componente | o mock do hook acompanha o retorno novo; a tela continua somente leitura sob impersonação |
| 9 | `apps/api/__tests__/entityPhotoReference.test.ts`, `entitiesRouteImpersonation.test.ts` (atualizar) | rota | mesma cobertura de antes, contra o envelope |
| 10 | `packages/internationalization/__tests__/parity.test.ts` | paridade | roda sozinho assim que as chaves entram nos 3 idiomas |

**Trabalho de infra de teste**: o fake de Firestore em `baseRepository.test.ts:16-102` só implementa
`where` e `get` (`makeQuery`, `:40-54`). Precisa ganhar `orderBy`, `limit` e `startAfter(snapshot)` para
os testes 2 e 3. É o item mais demorado da bateria e vale contar no esforço.

**Sem teste automatizado contra o emulador.** Dois motivos: (a) o emulador não valida índice composto,
que é justamente o risco maior; (b) o repo não tem harness de teste com processo externo, e um teste que
se auto-pula quando o emulador está fora fica verde provando nada — `.claude/cycle-policy.md:84-87` pede
o oposto disso. A semântica que o fake não reproduz (ordem por tipo, `startAfter` real) é verificada no
roteiro manual do `/test`, descrito abaixo.

**Roteiro manual de verificação** (para o `/test`, com `pnpm emulators` + `pnpm seed`): o seed grava as
quatro entidades de `user@example.com` com um **único** `createdAt` (`seed-emulator.mjs:132-145`), o que
já é o caso adversarial de empate. Percorrer a lista com `limit=2` deve devolver 4 ids distintos em duas
páginas, sem repetir nem perder.

---

## 9. Validação visual (`agent-browser`)

Obrigatória — regra de ouro 11. Comandos em sequência, nunca concorrentes.

- `/pt-br/entities` com o emulador semeado: lista renderizada, tema light e dark, viewport mobile e
  desktop.
- Botão "Carregar mais": visível com página seguinte, em estado de carregamento, e ausente no fim da
  lista. Para enxergá-lo com só 4 registros semeados, baixe `ENTITIES_PAGE_SIZE` para `2` durante a
  sessão e **reverta antes de terminar**.
- Toggle de `enabled` numa linha da segunda página: a mudança tem que persistir depois do
  `fetchNextPage` (é o caminho que o cache `InfiniteData` pode quebrar).
- Estado vazio (entrar com `admin@example.com`, que não tem entidade).
- Estado de erro de carga: derrubar a API e conferir o `LoadErrorState` em vez de tela em branco.
- Busca com texto que só casa na primeira página, para registrar o comportamento conhecido.

---

## 10. Pré-requisitos manuais de infra

O `/develop` não consegue satisfazer nenhum destes, e o `/test` não deve reprovar a entrega por causa
deles (`.claude/cycle-policy.md:88`). Vão para `docs/PRE-PRODUCTION.md`.

1. **Publicar o índice composto de `entity`.**
   ```bash
   npx -y firebase-tools@latest deploy --only firestore:indexes
   ```
   Alvo: projeto de referência **e** cada fork. Enquanto não rodar, `GET /entities` responde
   `503 PAGINATION_INDEX_MISSING` e a lista mostra o estado de erro. A construção do índice leva alguns
   minutos em coleção grande; até terminar a consulta continua recusada.

2. **Rodar o backfill de instantes em base que já tem dado.** Só quem já tem documentos gravados:
   ```bash
   node apps/api/scripts/backfill-instants.mjs --collection=entity           # dry-run
   node apps/api/scripts/backfill-instants.mjs --collection=entity --apply
   ```
   Sem isso, documentos que passaram por um `PUT` antes desta entrega têm `createdAt` em string e caem
   fora da ordem cronológica. O projeto de referência roda no emulador, cujo estado morre a cada
   reinício — lá é dispensável.

3. **Nada de env nova, nada de serviço novo, nada de custo novo.** Nenhuma variável entra no
   `.env.example`, nenhuma dependência entra no `package.json`.

---

# Etapa 2 — Blueprint técnico

## B1. Contrato do SDK

`packages/sdk/src/types/pagination/pagination.ts` (novo):

```ts
export type PageDTO<T> = {
    items: T[];
    nextCursor: string | null;
};

export type PageQuery = {
    limit?: number;
    cursor?: string | null;
};
```

`packages/sdk/src/actions/entity/action.ts`:

```diff
-    async list(): Promise<EntityDTO[]> {
-        const { data } = await this.client.request<Response<EntityDTO[]>>({
-            url: "/entities",
-            method: "GET",
-        });
-
-        return data.data;
-    }
+    async list(query?: PageQuery): Promise<PageDTO<EntityDTO>> {
+        const { data } = await this.client.request<
+            Response<PageDTO<EntityDTO>>
+        >({
+            url: "/entities",
+            method: "GET",
+            params: {
+                ...(query?.limit ? { limit: query.limit } : {}),
+                ...(query?.cursor ? { cursor: query.cursor } : {}),
+            },
+        });
+
+        return data.data;
+    }
```

## B2. Requisição e resposta de exemplo

```
GET /entities?limit=2
```

```json
{
  "data": {
    "items": [
      { "id": "doc-4", "userId": "profile-1", "name": "Retired Unit",  "type": "franchise", "photo": null, "photoUrl": null, "genre": null, "birthdate": null, "enabled": false, "createdAt": "2026-09-16T18:00:00.000Z", "updatedAt": "2026-09-16T18:00:00.000Z", "deletedAt": null, "description": "Kept for history, switched off" },
      { "id": "doc-3", "userId": "profile-1", "name": "Marcos Pereira", "type": "collaborator", "photo": null, "photoUrl": null, "genre": "male", "birthdate": "1985-11-02", "enabled": true, "createdAt": "2026-09-16T18:00:00.000Z", "updatedAt": "2026-09-16T18:00:00.000Z", "deletedAt": null, "description": "" }
    ],
    "nextCursor": "eyJ2IjoxLCJpZCI6ImRvYy0zIn0"
  }
}
```

```
GET /entities?limit=2&cursor=eyJ2IjoxLCJpZCI6ImRvYy0zIn0
```

```json
{ "data": { "items": [ /* doc-2, doc-1 */ ], "nextCursor": null } }
```

| Erro | Status | Corpo |
|------|--------|-------|
| `limit=0` | 400 | `{ "error": { "code": "VALIDATION_FAILED" } }` |
| `cursor=lixo` | 400 | `{ "error": { "code": "PAGINATION_CURSOR_INVALID" } }` |
| índice não publicado | 503 | `{ "error": { "code": "PAGINATION_INDEX_MISSING" } }` |

## B3. `BaseRepository`

```diff
-import type { DocumentData, Firestore } from "firebase-admin/firestore";
+import {
+    type DocumentData,
+    FieldPath,
+    type Firestore,
+    type Query,
+} from "firebase-admin/firestore";

+export type RepositoryPage<DTO> = { items: DTO[]; nextCursorId: string | null };
+
+export class PaginationCursorError extends Error {}
+
 export class BaseRepository<DTO> {
+    protected async paginate(
+        query: Query,
+        { limit, cursorId }: { limit: number; cursorId: string | null }
+    ): Promise<RepositoryPage<DTO>> {
+        let ordered = query
+            .orderBy("createdAt", "desc")
+            .orderBy(FieldPath.documentId(), "desc");
+
+        if (cursorId) {
+            const anchor = await this.db
+                .collection(this.table)
+                .doc(cursorId)
+                .get();
+            if (!anchor.exists) {
+                throw new PaginationCursorError(cursorId);
+            }
+            ordered = ordered.startAfter(anchor);
+        }
+
+        const snapshot = await ordered.limit(limit + 1).get();
+        const hasMore = snapshot.docs.length > limit;
+        const page = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;
+
+        const items = page.map((docSnap) => {
+            const raw = docSnap.data() as Record<string, unknown>;
+            if (this.rowMapper) {
+                return this.rowMapper.toDTO(this.toEntity(docSnap.id, raw));
+            }
+            return { id: docSnap.id, ...(raw as DTO) };
+        });
+
+        return {
+            items,
+            nextCursorId: hasMore ? (page.at(-1)?.id ?? null) : null,
+        };
+    }

     async update(data: UpdateRequest<DTO>): Promise<string> {
-        const docRef = this.db.collection(this.table).doc(data.id);
-        const currentData = await this.findById(data.id);
-
-        const updated = {
-            ...currentData,
-            ...data,
-            updatedAt: new Date(),
-        } as DocumentData;
-
-        const { id, ...dataToUpdate } = updated;
-
-        await docRef.update(dataToUpdate);
-
-        return id;
+        const { id, ...fields } = data;
+
+        await this.db
+            .collection(this.table)
+            .doc(id)
+            .update({ ...(fields as DocumentData), updatedAt: new Date() });
+
+        return id;
     }
```

## B4. `EntityRepository`

```diff
-    async listByUserId(userId: string): Promise<EntityDTO[]> {
-        const snapshot = await this.db
-            .collection(this.table)
-            .where("userId", "==", userId)
-            .get();
-
-        const rows = snapshot.docs
-            .map((docSnap) => { /* filtro de deletedAt em memória */ })
-            .filter((row): row is EntityDTO => row != null);
-
-        return [...rows].sort((a, b) => { /* ordena em memória */ });
-    }
+    async listByUserId(
+        userId: string,
+        page: { limit: number; cursorId: string | null }
+    ): Promise<RepositoryPage<EntityDTO>> {
+        return this.paginate(
+            this.db
+                .collection(this.table)
+                .where("userId", "==", userId)
+                .where("deletedAt", "==", null),
+            page
+        );
+    }
```

## B5. Rota

```diff
 export const GET = requireCommonPanelApi(async (req, ctx) => {
-    const list = await entityRepository.listByUserId(ctx.subjectProfile.id);
-    return Response.json({ data: await withPhotoUrls(list) });
+    const parsedQuery = parseListQuery(req);
+    if (!parsedQuery.ok) {
+        return parsedQuery.response;
+    }
+
+    try {
+        const page = await entityRepository.listByUserId(
+            ctx.subjectProfile.id,
+            parsedQuery.value
+        );
+
+        return Response.json({
+            data: {
+                items: await withPhotoUrls(page.items),
+                nextCursor: page.nextCursorId
+                    ? encodeCursor(page.nextCursorId)
+                    : null,
+            },
+        });
+    } catch (error) {
+        if (error instanceof PaginationCursorError) {
+            return Response.json(
+                { error: { code: "PAGINATION_CURSOR_INVALID" } },
+                { status: HTTP_STATUS.BAD_REQUEST }
+            );
+        }
+        if (isMissingIndexError(error)) {
+            return Response.json(
+                { error: { code: "PAGINATION_INDEX_MISSING" } },
+                { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
+            );
+        }
+        throw error;
+    }
 });
```

`withPhotoUrls` (`apps/api/(shared)/lib/entity-photo.ts`) não muda: passa a assinar uma página de URLs
em vez da coleção inteira.

## B6. Front — árvore de arquivos

```
apps/app/
  shared/lib/pagination.ts                       (novo)  ENTITIES_PAGE_SIZE
  shared/hooks/useAuthorizedInfiniteQuery.ts     (novo)
  app/[locale]/(authenticated)/(common)/(pages)/entities/
    (hooks)/useListEntities.tsx                  (reescrito)
    (hooks)/useEntityCrud.tsx                    (cache do toggle)
    (pages)/(home)/page.tsx                      (prefetchInfiniteQuery)
    (pages)/(home)/EntitiesListClient.tsx        (carregar mais + loadError)
  __tests__/useListEntities.test.tsx             (novo)
  __tests__/useEntityCrud.test.tsx               (atualizar)
  __tests__/entitiesListReadOnly.test.tsx        (atualizar)

packages/design-system/components/ui/table.tsx   (4 props novas)
```

`useListEntities.tsx`:

```ts
export function fetchEntitiesList(query: PageQuery) {
    return apiClient.entity.list(query);
}

export const useListEntities = () => {
    const query = useAuthorizedInfiniteQuery({
        queryKey: queryKeys.entities.list(),
        queryFn: ({ pageParam }) =>
            fetchEntitiesList({
                limit: ENTITIES_PAGE_SIZE,
                cursor: pageParam,
            }),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

    const data = useMemo(
        () => query.data?.pages.flatMap((page) => page.items) ?? [],
        [query.data]
    );

    return {
        data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
        isFetching: query.isFetching,
        fetchNextPage: query.fetchNextPage,
        hasNextPage: query.hasNextPage,
        isFetchingNextPage: query.isFetchingNextPage,
    };
};
```

`page.tsx`:

```diff
-            await queryClient.prefetchQuery({
-                queryKey: queryKeys.entities.list(),
-                queryFn: () => client.entity.list(),
-            });
+            await queryClient.prefetchInfiniteQuery({
+                queryKey: queryKeys.entities.list(),
+                queryFn: () =>
+                    client.entity.list({ limit: ENTITIES_PAGE_SIZE }),
+                initialPageParam: null as string | null,
+            });
```

`useEntityCrud.tsx` — toggle otimista:

```diff
-            queryClient.setQueryData<EntityDTO[]>(
-                queryKeys.entities.list(),
-                (old) =>
-                    old?.map((row) =>
-                        row.id === input.id
-                            ? { ...row, enabled: input.enabled }
-                            : row
-                    )
-            );
+            queryClient.setQueryData<InfiniteData<PageDTO<EntityDTO>>>(
+                queryKeys.entities.list(),
+                (old) =>
+                    old && {
+                        ...old,
+                        pages: old.pages.map((page) => ({
+                            ...page,
+                            items: page.items.map((row) =>
+                                row.id === input.id
+                                    ? { ...row, enabled: input.enabled }
+                                    : row
+                            ),
+                        })),
+                    }
+            );
```

O `getQueryData` do `onMutate` e o `setQueryData` do rollback (`useEntityCrud.tsx:104-106`, `:128-133`)
mudam de tipo junto; o conteúdo do rollback continua sendo o snapshot anterior inteiro.

`EntitiesListClient.tsx`:

```diff
-            <Container loading={isLoading}>
+            <Container loading={isLoading} loadError={listLoadError}>
                 …
                     <Table<EntityDTO>
                         columns={columns}
-                        dataSource={entities ?? []}
+                        dataSource={entities}
+                        hasMore={hasNextPage}
                         locale={{ emptyText: entitiesList.empty }}
+                        loadMoreLoading={isFetchingNextPage}
+                        onLoadMore={() => fetchNextPage()}
                         onRefresh={() => refetch()}
-                        pagination={{
-                            pageSize: 10,
-                            showSizeChanger: true,
-                            hideOnSinglePage: true,
-                        }}
+                        pagination={false}
```

`table.tsx`:

```diff
   onRefresh?: () => void;
   refreshLoading?: boolean;
   refreshLabel?: string;
+  /** Server-driven paging: renders a button under the table while more pages exist. */
+  onLoadMore?: () => void;
+  hasMore?: boolean;
+  loadMoreLoading?: boolean;
+  loadMoreLabel?: string;
 }
…
       />
+      {onLoadMore && hasMore ? (
+        <div className="flex justify-center">
+          <Button
+            loading={loadMoreLoading}
+            onClick={onLoadMore}
+            type="button"
+            variant="outline"
+          >
+            {loadMoreLabel ?? tableCopy.loadMore}
+          </Button>
+        </div>
+      ) : null}
```

## B7. Ordem de implementação

1. `packages/sdk` — tipos `PageDTO`/`PageQuery`, `entity.list(query)`.
2. `apps/api` — `pagination.ts` (helper), `pagination.schema.ts`, `BaseRepository.paginate` + correção
   do `update`, `EntityRepository.listByUserId`, rota `GET /entities`, `firestore.indexes.json`,
   `backfill-instants.mjs`.
3. `apps/app` + `packages/design-system` — `Table`, hook infinito, `useListEntities`, `page.tsx`,
   `useEntityCrud`, `EntitiesListClient`.
4. `packages/internationalization` — `loadMore` + 2 `apiErrors`, nos 3 idiomas.
5. Testes de cada camada, junto do commit da camada.

Entre 1 e 2 o repo fica com typecheck quebrado no `apps/app` — é inerente a mudança de contrato e some
no passo 3. Vale rodar `pnpm turbo run lint typecheck test` só ao final dos quatro.

## B8. Plano de commits sugerido

O `revisor-codigo` decide o corte final; a ordem de dependência é esta.

| # | Mensagem | Arquivos |
|---|----------|----------|
| 1 | `feat(sdk): paginated list envelope` | `packages/sdk/src/types/pagination/*`, `types/index.ts`, `actions/entity/action.ts` |
| 2 | `fix(api): stop rewriting createdAt on update` | `base.repository.ts` (só o `update`), `__tests__/baseRepository.test.ts` |
| 3 | `feat(api): cursor pagination in the base repository` | `base.repository.ts` (`paginate`), `(shared)/lib/pagination.ts`, `(shared)/validation/pagination.schema.ts`, `entity.repository.ts`, testes |
| 4 | `feat(api): paginate the entities listing` | `app/(routes)/entities/route.ts`, `firestore.indexes.json`, `__tests__/entitiesRouteList.test.ts`, `__tests__/firestoreIndexes.test.ts`, testes atualizados |
| 5 | `chore(api): backfill script for string instants` | `apps/api/scripts/backfill-instants.mjs` |
| 6 | `feat(design-system): load more button in the table` | `packages/design-system/components/ui/table.tsx` |
| 7 | `feat(app): paginate the entities list` | `shared/lib/pagination.ts`, `shared/hooks/useAuthorizedInfiniteQuery.ts`, `entities/(hooks)/*`, `(pages)/(home)/*`, testes |
| 8 | `feat(internationalization): pagination copy and api errors` | `translations/components/ui/table.ts`, `translations/packages/shared/utils.ts` |
| 9 | `docs: pagination pre-production steps` | `docs/PRE-PRODUCTION.md` |
| 10 | `docs(features): cursor-pagination` | `docs/features/cursor-pagination/` |

---

# Critérios de aceite

Formato §9.1 do guia. Todos verificáveis sem conta em provedor — emulador local basta, exceto os dois
marcados como pendência de infra.

- [ ] **A listagem lê só uma página do Firestore**
  `GET /entities?limit=2` devolve exatamente 2 itens em `data.items` mais um `nextCursor` não nulo,
  independentemente de a coleção ter 4 ou 4.000 documentos. A consulta emitida carrega `limit(3)` — o
  tamanho pedido mais um, que é como o servidor descobre se há página seguinte sem contar a coleção. O
  documento extra nunca aparece na resposta.

- [ ] **O teto de tamanho é do servidor**
  `GET /entities?limit=99999` responde 200 com no máximo 100 itens. O cliente não consegue fazer a
  resposta crescer com o tamanho da coleção. Já `limit=0`, `limit=-1`, `limit=1.5` e `limit=abc`
  respondem `400 { error: { code: "VALIDATION_FAILED" } }` — valor grande demais é clampado, valor
  inválido é recusado, e a diferença é intencional.

- [ ] **Percorrer todas as páginas não repete nem perde registro, mesmo com `createdAt` idêntico**
  O seed grava as quatro entidades de `user@example.com` com um único instante
  (`seed-emulator.mjs:132-145`). Paginar com `limit=2` devolve 4 ids distintos em duas páginas e
  `nextCursor` nulo na segunda. Sem o desempate por `documentId` este caso repete ou pula registros, que
  é o bug que só aparece com volume.

- [ ] **O cursor é opaco e o cliente só o repassa**
  O valor de `nextCursor` é base64url e nenhum código do `apps/app` o interpreta: o hook entrega ao
  `getNextPageParam` e ao `queryFn` sem parsear. Enviar um cursor forjado, truncado ou apontando para um
  documento que não existe responde `400 { error: { code: "PAGINATION_CURSOR_INVALID" } }`, nunca 500 e
  nunca uma página de outro dono.

- [ ] **Cursor não fura ownership**
  Autenticado como `user@example.com`, usar um cursor obtido na lista de `user2@example.com` não devolve
  nenhum registro do outro dono: a query mantém `where("userId", "==", ctx.subjectProfile.id)` e o
  `startAfter` só desloca a ordenação. A resposta ou vem vazia, ou traz só registros do chamador.

- [ ] **`update()` preserva o tipo de `createdAt`**
  Editar uma entidade pelo painel e depois ler o documento cru no Firestore mostra `createdAt` ainda
  como `Timestamp`, não como string ISO. Repetir a edição três vezes não muda isso. Antes desta entrega,
  o primeiro `PUT` reescrevia o campo como string (`base.repository.ts:102-117` + `entity.mapper.ts:23`),
  o que desalinhava a ordenação do Firestore, que compara tipo antes de valor.

- [ ] **O soft delete continua funcionando e some da lista**
  Excluir uma entidade a remove da listagem paginada, porque o filtro `deletedAt == null` agora roda no
  Firestore e não mais em memória. Documento excluído continua servindo de âncora de cursor sem erro —
  ele existe, só não é devolvido.

- [ ] **A tela carrega mais sob demanda**
  Com página maior que o conteúdo, a tabela não mostra botão nenhum. Com página menor, o botão
  "Carregar mais" aparece sob a tabela, exibe estado de carregamento durante a busca, acrescenta a
  página seguinte ao fim da lista e desaparece quando `nextCursor` volta nulo. Clicar duas vezes em
  seguida não duplica linha: o botão fica desabilitado enquanto `isFetchingNextPage`.

- [ ] **O toggle de `enabled` funciona em qualquer página carregada**
  Alternar o `Switch` de uma linha vinda da segunda página atualiza a UI na hora e persiste depois de um
  refresh. O cache agora é `InfiniteData`, então a escrita otimista percorre `pages[].items[]`; se o
  servidor recusar, o rollback restaura o estado anterior de todas as páginas e o alerta de erro aparece.

- [ ] **Índice ausente degrada, não explode**
  Com o índice composto não publicado, `GET /entities` responde
  `503 { error: { code: "PAGINATION_INDEX_MISSING" } }` — nunca 500, nunca stack trace. A tela renderiza
  `LoadErrorState` com a mensagem traduzida, o resto do painel continua navegável e a app sobe
  normalmente. *(Verificação depende de projeto Firebase real; no emulador a consulta é servida sem
  índice, então este critério fica **não verificado** numa rodada só de emulador.)*

- [ ] **A entrada de índice está declarada no repositório**
  `firestore.indexes.json` contém a entrada de `entity` com `userId ASC`, `deletedAt ASC` e
  `createdAt DESC`, e um teste falha se ela sumir. Esse teste existe porque o emulador do Firestore não
  cobra índice composto — sem ele, o esquecimento só apareceria em produção.

- [ ] **Os dois códigos de erro têm copy nos três idiomas**
  `PAGINATION_CURSOR_INVALID` e `PAGINATION_INDEX_MISSING` aparecem em `apiErrors` para `pt-br`, `en` e
  `es`, e `pnpm --filter @repo/internationalization test` passa. Nenhuma das duas mensagens expõe termo
  de infraestrutura para o usuário final.

- [ ] **Nada de string de UI solta**
  O rótulo "Carregar mais" vem de `components.table.loadMore` nos três idiomas. Trocar o locale troca o
  texto do botão.

- [ ] **Tema e responsivo**
  A lista, o botão de carregar mais e o estado de erro renderizam corretamente em light e dark, no
  mobile e no desktop. O `Table` é antd: confira que o botão herda o tema do design system e não destoa
  da barra de busca/atualizar.

- [ ] **A listagem de usuários não regride**
  `user.repository.list()` continua usando `findAll()` e `apiClient.user.list()` continua devolvendo
  array cru. A área admin de usuários funciona igual a antes — está declarada fora do corte.

- [ ] **Os três gates passam**
  `pnpm turbo run lint typecheck test` limpo, que é a linha que o CI roda.

---

# Perguntas em aberto

Rodada autônoma: cada item já foi decidido e o plano implementa a opção adotada.

1. **Cursor opaco ou id do último documento exposto?**
   Opções: (a) opaco, base64url de `{v,id}`; (b) o id cru como query param.
   **Adotado: (a)**, seguindo a recomendação da spec (`:130-131`). O `v: 1` no payload permite trocar a
   ordenação depois sem quebrar cliente que já tem cursor em mãos.

2. **O cursor carrega os valores de ordenação ou só um id resolvido em snapshot?**
   Opções: (a) só o id, com `doc(id).get()` antes do `startAfter`; (b) `createdAt` + `id` serializados,
   sem leitura extra.
   **Adotado: (a).** O `Timestamp` do Firestore tem precisão de nanossegundo que não sobrevive a ISO
   string, e registros do mesmo milissegundo voltariam a repetir ou sumir. (b) economiza uma leitura de
   documento por página e reintroduz a classe de bug que o desempate existe para matar.

3. **O envelope leva `hasMore`?**
   Opções: (a) só `items` + `nextCursor`; (b) incluir `hasMore` redundante.
   **Adotado: (a).** `nextCursor !== null` responde a mesma pergunta, o `getNextPageParam` do React Query
   lê o cursor direto, e um booleano paralelo pode divergir. A spec cita `hasMore` no diagnóstico
   (`:41`), não no corte de MVP (`:76-77`).

4. **Migrar `entity` e `user` no mesmo corte?**
   **Adotado: só `entity`**, conforme a spec (`:132-133`). O N+1 do Admin SDK em
   `user.repository.ts:38-40` contaminaria a avaliação do padrão.

5. **Manter, renomear ou remover `findAll()`?**
   Opções: (a) manter como está, com um comentário declarando que lê tudo; (b) renomear para
   `findAllUnbounded()`; (c) remover.
   **Adotado: (a).** A spec recomenda manter com nome que declare o risco (`:134-135`), mas renomear
   toca `user.repository.ts:33` e três testes sem mudar comportamento. O comentário entrega o aviso pelo
   mesmo preço. (c) está fora de questão: `user` depende dele.

6. **O que fazer com documentos que já têm `createdAt` em string?**
   Opções: (a) corrigir o `update()` na raiz + script de backfill idempotente; (b) coagir na leitura;
   (c) ordenar por `__name__`, imune a tipo.
   **Adotado: (a).** (b) não resolve — a ordenação acontece dentro do Firestore, antes de qualquer
   leitura nossa. (c) funcionaria, mas o id automático do Firestore é aleatório, e a lista de referência
   deixaria de vir da mais recente para a mais antiga.

7. **Teste automatizado contra o emulador?**
   Opções: (a) nenhum, com roteiro manual no `/test`; (b) um teste que se pula quando o emulador está
   fora.
   **Adotado: (a).** O emulador não cobra índice composto, então ele não prova o risco principal; e um
   teste que se auto-pula fica verde provando nada, contra `.claude/cycle-policy.md:84-87`. O índice vira
   teste estático sobre `firestore.indexes.json`; a semântica real vira roteiro manual.

8. **A busca da tabela passa a mentir sobre o total?**
   Com paginação servidor, `searchFields` filtra só as páginas carregadas — buscar um registro da página
   5 estando na 1 não acha nada. Opções: (a) aceitar e documentar; (b) copy de aviso nova na tabela;
   (c) busca no servidor.
   **Adotado: (a).** (c) é explicitamente "fora do corte" da spec (`:86-87`) e exige decisão própria
   (prefixo no Firestore × serviço de busca). (b) acrescenta copy nos 3 idiomas para mitigar meio caminho.
   Fica registrado como o principal candidato a spec seguinte.

9. **Tamanho de página padrão e teto.**
   **Adotado: 20 e 100**, sem env. A spec não fixa número; 20 preenche uma tela sem scroll infinito e
   100 limita a resposta a um tamanho previsível. Vira constante no código, não configuração — o fork
   que quiser outro valor muda uma linha.

10. **O `Table` do design system pode mudar, dado o `.claude/cycle-policy.md:47`?**
    **Adotado: sim.** A regra existe para não colocar domínio de um produto em `packages/*`; quatro props
    opcionais de paginação são genéricas, estão no `area` da spec (`:8`) e no corte de MVP dela (`:80-81`).
    Componentes que não passam `onLoadMore` renderizam idêntico ao de hoje.

---

# Referências não lidas

Nenhuma.
