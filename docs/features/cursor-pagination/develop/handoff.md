# Handoff do `/develop` — paginação por cursor

- **Plano**: [`analyze/plan.md`](../analyze/plan.md)
- **Rodada**: `/cycle` autônomo, sem acompanhamento humano durante a execução.
- **Working tree**: nada commitado, nenhuma branch criada.

---

## Blueprint → arquivos

### B1. Contrato do SDK

| Arquivo | O que mudou |
|---------|-------------|
| `packages/sdk/src/types/pagination/pagination.ts` | novo: `PageDTO<T>` e `PageQuery` |
| `packages/sdk/src/types/pagination/index.ts` | novo: barril do diretório |
| `packages/sdk/src/types/index.ts` | reexporta `./pagination` |
| `packages/sdk/src/actions/entity/action.ts` | `list(query?: PageQuery): Promise<PageDTO<EntityDTO>>`, com `limit`/`cursor` em `params` |

`EntityDTO` não mudou. A action continua registrada no `Client` como já estava, então `src/client/index.ts`
não foi tocado.

### B3/B4. Persistência

| Arquivo | O que mudou |
|---------|-------------|
| `apps/api/(shared)/repositories/base.repository.ts` | `paginate` protegido, tipos `PageRequest`/`RepositoryPage`, classe `PaginationCursorError`, helper `toDTO`, correção do `update` |
| `apps/api/(shared)/repositories/entity.repository.ts` | `listByUserId(userId, page)` delega ao `paginate` com os dois `where`; o `sort` em memória saiu |

O `update` deixou de reler o documento. `findAll` ficou com o mesmo comportamento e ganhou a linha de
aviso de que lê a coleção inteira; a duplicação de mapeamento entre ele e o `paginate` virou o helper
`toDTO`.

### B5. Borda HTTP

| Arquivo | O que mudou |
|---------|-------------|
| `apps/api/(shared)/lib/pagination.ts` | novo: `encodeCursor`, `decodeCursor`, `isMissingIndexError` |
| `apps/api/(shared)/validation/pagination.schema.ts` | novo: `parseListQuery`, `PAGE_SIZE_DEFAULT` (20), `PAGE_SIZE_MAX` (100) |
| `apps/api/app/(routes)/entities/route.ts` | `GET` valida a query, responde envelope e traduz as duas falhas em `error.code` |
| `firestore.indexes.json` | entrada composta de `entity` (`userId` ASC, `deletedAt` ASC, `createdAt` DESC) |
| `apps/api/scripts/backfill-instants.mjs` | novo: dry-run por padrão, escreve só com `--apply` |

### B6. Front

| Arquivo | O que mudou |
|---------|-------------|
| `packages/design-system/components/ui/table.tsx` | props `onLoadMore`, `hasMore`, `loadMoreLoading`, `loadMoreLabel` |
| `apps/app/shared/lib/pagination.ts` | novo: `ENTITIES_PAGE_SIZE = 20` |
| `apps/app/shared/hooks/useAuthorizedInfiniteQuery.ts` | novo: espelha o gate de token do `useAuthorizedQuery` |
| `.../entities/(hooks)/useListEntities.tsx` | infinite query, devolve o array achatado mais `fetchNextPage`/`hasNextPage`/`isFetchingNextPage` |
| `.../entities/(hooks)/useEntityCrud.tsx` | toggle otimista e rollback percorrem `pages[].items[]` |
| `.../entities/(pages)/(home)/page.tsx` | `prefetchInfiniteQuery` com a mesma `queryKey` |
| `.../entities/(pages)/(home)/EntitiesListClient.tsx` | botão de carregar mais, `pagination={false}`, `loadError` no `Container` |

`Table` sem `onLoadMore` renderiza igual ao de antes.

### i18n

`translations/components/ui/table.ts` ganhou `loadMore`; `translations/packages/shared/utils.ts` ganhou
`PAGINATION_CURSOR_INVALID` e `PAGINATION_INDEX_MISSING`. Os três nos três idiomas, conferido pelo teste
de paridade.

### Testes

Novos: `apps/api/__tests__/paginationQuery.test.ts`, `entitiesRouteList.test.ts`,
`firestoreIndexes.test.ts`, `apps/app/__tests__/useListEntities.test.tsx`.
Atualizados: `baseRepository.test.ts` (fake de Firestore estendido), `entitiesRouteImpersonation.test.ts`,
`entityPhotoReference.test.ts`, `useEntityCrud.test.tsx`, `entitiesListReadOnly.test.tsx`.

---

## Contrato e raio de impacto

`entity.list()` deixou de devolver `EntityDTO[]`. Quem consome, e já está ajustado:

- `apps/app/.../entities/(hooks)/useListEntities.tsx`
- `apps/app/.../entities/(pages)/(home)/page.tsx` (prefetch RSC)

`entityRepository.listByUserId` mudou de assinatura e de retorno; o único chamador de produção é
`apps/api/app/(routes)/entities/route.ts`. Uma varredura por `entity.list(` e `listByUserId` no
repositório não achou mais nada fora dos testes.

`user.list()`, `account`, `file` e `application` não foram tocados. `user.repository.list()` continua em
cima do `findAll()`.

---

## Códigos de erro novos

| `error.code` | Status | Quando |
|--------------|--------|--------|
| `PAGINATION_CURSOR_INVALID` | 400 | cursor indecodificável, de outra versão, com id ilegal, ou cujo documento âncora não existe |
| `PAGINATION_INDEX_MISSING` | 503 | o Firestore recusou a consulta por falta do índice composto |

Os dois têm entrada em `apiErrors` para `pt-br`, `en` e `es`.

---

## Desvios do plano

Quatro, todos por defeito encontrado no caminho ou por ajuste que o plano não previu.

**1. O cursor valida o formato do id do documento, não só o JSON.** O plano descrevia `decodeCursor` como
"`null` quando inválido" sem dizer o que conta como inválido. Um payload bem formado carregando
`{"v":1,"id":"a/b"}` passaria pela decodificação e chegaria em `doc("a/b")`, que o driver do Firestore
rejeita lançando exceção: o resultado seria 500 em vez do 400 que o plano pede. `decodeCursor` agora
recusa id vazio, com barra, `.`/`..`, no formato reservado `__…__` ou acima de 1500 bytes.

**2. Query param vazio conta como ausente.** `?limit=` chega como string vazia, que o `z.coerce.number()`
converte para `0` e o `min(1)` reprova com `VALIDATION_FAILED`. O mesmo `?cursor=` cairia em
`VALIDATION_FAILED` em vez de `PAGINATION_CURSOR_INVALID`. Ambos são normalizados para ausente antes do
schema.

**3. Falha de schema no campo `cursor` responde `PAGINATION_CURSOR_INVALID`.** O plano punha `cursor` no
mesmo objeto Zod que `limit`, e nesse desenho um cursor acima de 512 caracteres sairia como
`VALIDATION_FAILED`. O `parseListQuery` olha o `path` da issue e escolhe o código.

**4. O `Container` recebe a mensagem do erro da API, não uma copy fixa.** O plano só mostrava
`loadError={listLoadError}` sem dizer de onde vem a string. `EntitiesListClient` monta com
`handleClientError(new FormattedError(listError, locale))`, que é o caminho que faz a copy de
`PAGINATION_INDEX_MISSING` chegar à tela. Com uma mensagem genérica os dois códigos novos nunca seriam
lidos por ninguém.

Fora isso, o `paginate` e o `findAll` passaram a compartilhar um helper `toDTO` em vez de repetir o mesmo
bloco de mapeamento. Comportamento idêntico nos dois.

---

## Validação

Todos os comandos rodados a partir de
`/Users/guilhermebittelbrunn/conductor/workspaces/next-boilerplate/mbabane`.

| Comando | Resultado |
|---------|-----------|
| `pnpm check` | limpo, 554 arquivos |
| `pnpm turbo run lint typecheck test` | 24 de 24 tasks |
| `pnpm --filter api test` | 38 arquivos, 407 testes |
| `pnpm --filter app test` | 42 arquivos, 302 testes |
| `pnpm --filter @repo/internationalization test` | 3 arquivos, 27 testes (paridade inclusa) |
| `pnpm --filter api build` | passou |
| `pnpm --filter app build` | passou |

Zero dependência nova, zero variável de ambiente nova, zero serviço novo.

---

## Validação visual

O emulador do Firebase **não sobe nesta máquina**: `firebase-tools` recusa com "no longer supports Java
version before 21" e o único JDK instalado é o Zulu 17.0.13. Não há credencial de dev registrada para
entrar no projeto Firebase real, e criar conta nova num projeto real numa rodada sem acompanhamento não
valeria o rastro. A lista `/entities` fica atrás do guard de sessão, então o fluxo autenticado não foi
percorrido.

O que foi percorrido: uma página temporária pública renderizando o `Table` real, com o dicionário real e o
tema real, para exercitar a mudança do design system. A app foi servida em `localhost:3005` porque a 3000
está ocupada por um app Electron de outro workspace, que ficou intacto. A página temporária foi apagada e
o servidor derrubado; a ausência da rota está confirmada no manifesto do `pnpm --filter app build`.

Verificado na tela:

- botão "Carregar mais" centralizado abaixo da tabela, com a copy vinda de `components.table.loadMore`;
- troca de locale troca o rótulo: `pt-br` "Carregar mais", `en` "Load more", `es` "Cargar más";
- light e dark, em desktop (1280x800) e mobile (390x844), com a tabela antd acompanhando o tema;
- estado de carregamento: o botão fica `disabled` (lido no DOM), o que cobre o clique duplo;
- a segunda página é **anexada** ao fim da lista, não substitui a primeira, e o botão some quando acaba.

Screenshots em `develop/screenshots/`: `table-light-desktop-page1.png`, `table-light-desktop-page2.png`,
`table-light-desktop-loadmore-loading.png`, `table-dark-desktop-page1.png`, `table-dark-mobile-page1.png`.

**Não verificado na tela**, porque depende do backend:

- a lista de `/entities` servida pela API, com cursor real do Firestore;
- o toggle de `enabled` numa linha vinda da segunda página (o risco que o plano destacou). Coberto por
  teste em `apps/app/__tests__/useEntityCrud.test.tsx`, que semeia duas páginas no cache e alterna uma
  linha da segunda, mas ninguém viu acontecer no navegador;
- o `LoadErrorState` com a copy de `PAGINATION_INDEX_MISSING`;
- o estado vazio e o comportamento da busca sobre páginas parciais.

`ENTITIES_PAGE_SIZE` **não foi alterado** em momento nenhum: como o fluxo real não rodou, não houve motivo
para baixá-lo para 2, e portanto não há reversão a conferir. O valor no diff é 20.

---

## Pendências de infra

Registradas em [`docs/PRE-PRODUCTION.md`](../../../PRE-PRODUCTION.md), seções 1.1 e 1.2: publicar o índice
composto de `entity` e rodar o backfill de instantes em base que já tem dado. Nenhuma das duas é
satisfazível pelo `/develop`.

Enquanto o índice não estiver publicado, `GET /entities` responde `503 PAGINATION_INDEX_MISSING`. Esse
caminho está coberto por teste de rota (`entitiesRouteList.test.ts`), mas contra um erro fabricado: um
Firestore de verdade recusando a consulta nunca foi observado.

---

## Achados que não entraram

**O botão perde o nome acessível enquanto carrega.** O `Button` do design system troca o rótulo por um
spinner quando recebe `loading`, e nesse estado o elemento fica sem texto e sem `aria-label` (medido:
`textContent` vazio, `aria-label` nulo). Vale para o botão novo e para o `TableRefreshButton`, que já
existia, então o defeito é do `Button` e não desta entrega. Fora do escopo aqui.

**A busca da tabela passa a cobrir só as páginas carregadas.** É a limitação que a spec declarou fora do
corte. Continua sem aviso na interface.

**Nenhuma conta ou dado de QA foi criado** nesta etapa, em provedor nenhum.

---

## Lacunas para o `/test`

1. Percorrer `/entities` com o emulador de pé (exige JDK 21) e conferir o caso de empate que o seed já
   produz: quatro entidades de `user@example.com` com um `createdAt` único devem sair em 4 ids distintos
   com `limit=2`.
2. Toggle de `enabled` numa linha da segunda página, no navegador.
3. Cursor de outro dono: autenticado como `user@example.com`, usar cursor obtido na lista de
   `user2@example.com` e conferir que nenhum registro alheio volta.
4. `update()` preservando `Timestamp` contra um Firestore real, lendo o documento cru.
5. `LoadErrorState` com a copy de `PAGINATION_INDEX_MISSING`, que só aparece em projeto real sem o índice
   publicado.
