---
id: cursor-pagination
title: Paginação por cursor no BaseRepository e no SDK
status: done
value: alto
effort: M
audience: dx
area: [apps/api, packages/sdk, apps/app, packages/design-system]
mode: ambos
depends_on: [firestore-admin-access]
contends_on: [apps/api/(shared)/repositories/base.repository.ts, apps/api/(shared)/repositories/entity.repository.ts, packages/design-system/components/ui/table.tsx, firestore.indexes.json, packages/sdk/src/actions/entity/action.ts]
feature: cursor-pagination
updated: 2026-09-16
---

> **Entregue.** PR **#17**, merge commit `c36e084` em `main` (2026-09-17T02:35:23Z), CI `success` nesse SHA.
> Os cinco itens do corte foram reabertos um a um no código pelo `/spec --sync` — a evidência está em cada
> item da seção "Proposta". Arquivada aqui pelo mesmo comando.
>
> A seção "O que já existe no repo" descreve o repositório **antes** da entrega e continua como estava: é o
> diagnóstico que sustentou a spec, e reescrevê-la em tempo presente apagaria o argumento. As âncoras
> `arquivo.ts:linha` dela apontam para o código anterior à PR #17 — não confira contra o `HEAD` atual. As
> âncoras válidas hoje estão na seção "Proposta".

# Paginação por cursor no BaseRepository e no SDK

## Problema

Toda listagem deste boilerplate lê a coleção inteira do Firestore, transporta tudo pela API e joga o array
completo na tabela, que então pagina no navegador. Com dezenas de registros ninguém percebe; com milhares,
o fork paga leitura por documento a cada abertura de tela e a página trava. Como todo fork nasce copiando
o slice `entity`, **o problema é herdado por construção** — não é escolha, é o único caminho que existe.
E corrigir depois de haver dados em produção muda contrato do SDK, DTO, hooks e índices ao mesmo tempo.

## O que já existe no repo

- `apps/api/(shared)/repositories/base.repository.ts:36-49` — `findAll()` monta a query só com
  `where("deletedAt", "==", null)`: **sem `limit`, sem `orderBy`, sem cursor e sem contagem**. É a base de
  toda listagem, e nenhum dos métodos do `BaseRepository<DTO>` (22-134) aceita parâmetro de consulta.
- ✅ **Achado adicional resolvido em 2026-08-31** (`firestore-admin-access`): `findAll()` **ignorava o
  `rowMapper`** enquanto `findById()` o aplicava, e as duas rotas de leitura produziam formatos diferentes.
  Hoje `findAll()` aplica o mapper (`:44-46`), como `findById()` (`:60-64`). A reconciliação de formato
  saiu do escopo desta spec.
- `apps/api/(shared)/repositories/entity.repository.ts:11-32` — `listByUserId` filtra `deletedAt` em
  memória (`:20-22`, com o descarte em `:25`) e ordena por `createdAt` em memória (`:27-30`).
- `apps/api/(shared)/repositories/user.repository.ts:32-43` — `list({type})` chama `findAll()` e filtra por
  tipo em memória (34-36); depois faz **uma chamada ao Admin SDK por usuário** (38-40, 52-63).
- `packages/sdk/src/actions/entity/action.ts:15-22` e
  `packages/sdk/src/actions/user/user/action.ts:21-31` — `list()` devolve array cru, **sem envelope**: não
  há onde caber cursor ou `hasMore` sem quebrar o contrato.
- `apps/app/.../entities/(hooks)/useListEntities.tsx:10-17` — query única, sem parâmetros; é o padrão
  `useListX`/`fetchXList` que todo fork copia.
- `packages/design-system/components/ui/table.tsx:11-22` — `TableProps` deriva de `AntdTableProps` por
  `Omit<…, "columns" | "dataSource">` (`:12`), e `pagination` não aparece uma única vez no arquivo: o que a
  tela exibe é a **paginação client-side padrão do antd**, sobre o array inteiro. *(A redação anterior dizia
  "estende"; o mecanismo é `Omit`, e a conclusão não muda.)*
- `firestore.indexes.json:2-11` — deixou de ser vazio em 2026-08-31: versiona **um** índice composto, o de
  `findByReferenceId`. O arquivo e o caminho de deploy agora existem (`docs/SETUP.md:190-200`, com o
  comando de deploy em `:197`), o que **remove o obstáculo** — mas qualquer consulta composta nova
  continua exigindo a entrada correspondente, ou falha em produção sem aviso. ✅ **Verificado em
  2026-09-11:** o `deploy` já rodou — a leitura REST direta com a chave pública responde **403**, ou seja
  as rules (e os índices publicados junto, pelo mesmo comando) estão em vigor. Reconferido em
  **2026-09-14**, agora com `docs/SECURITY.md` e `docs/PRE-PRODUCTION.md` de acordo. Para esta spec é boa notícia: o
  caminho de publicação não é hipotético, já foi percorrido — o índice que a paginação por cursor exigir
  entra pelo mesmo comando já exercitado.
- `docs/feature-analysis-guide.md:83-90` (seção 2.2) — o repo **já reconhece a lacuna por escrito**: "o
  `BaseRepository` não tem paginação, `orderBy` nem filtros compostos… é uma decisão de arquitetura a
  registrar, não algo a improvisar no handler". Esta spec é essa decisão.
- **Lacuna:** não existe paginação em nenhuma camada — nem no repositório, nem no contrato, nem na UI.

## Evidência de mercado

- Nota: [`research/engineering-baseline.md`](research/engineering-baseline.md)
- **Prática 11 (paginação por cursor)** — *padrão de facto no Firestore* e uma das quatro práticas que a
  nota considera indispensáveis aqui, porque o `offset` do Firestore **cobra os documentos que pulou**.
- Armadilhas registradas na mesma prática, que a proposta precisa absorver: cursor exige **`orderBy`
  estável** (com desempate por `__name__`); filtro composto novo exige índice e **falha só em runtime**; e
  "ir para a página 7" **não existe** nesse modelo — a UI vira "carregar mais" ou próxima/anterior. Não é
  hype: é a forma que a documentação do próprio provedor prescreve para ler coleções grandes.

## Proposta — corte de MVP

Verificado item a item no código em 2026-09-16, depois do merge da PR #17 — não pelo `status` gravado.

- [x] O repositório base lê uma "página" de uma coleção — tamanho pedido pelo chamador, ordenação estável,
      ponto de retomada opaco — com filtro e ordenação **no Firestore**, não em memória.
      — `base.repository.ts:80-116`: `paginate()` ordena por `createdAt desc` e desempata por
      `FieldPath.documentId()` (`:84-86`), retoma de um snapshot do documento âncora (`:89-98`) e busca uma
      linha extra para saber se há próxima página (`:101-105`).
- [x] As listagens da API respondem em **envelope** (itens + cursor da próxima página) em vez de array cru,
      com teto de tamanho aplicado no servidor mesmo quando o cliente pede mais.
      — `entities/route.ts:30-37` devolve `{ items, nextCursor }`; `pagination.schema.ts:49-52` limita o
      tamanho a `PAGE_SIZE_MAX = 100` (`:6`) em vez de recusar o pedido, e `:41`/`:62` respondem
      `PAGINATION_CURSOR_INVALID` para cursor malformado.
- [x] O SDK expõe o envelope como contrato tipado e o slice `entity` é migrado inteiro (repositório → rota
      → SDK → hook → tela), virando o template que os forks copiam.
      — `packages/sdk/src/types/pagination/pagination.ts:1-10` (`PageDTO`/`PageQuery`),
      `actions/entity/action.ts:17-30`, `entity.repository.ts:15-26`, `useListEntities.tsx:14-40` sobre
      `useAuthorizedInfiniteQuery` e `EntitiesListClient.tsx:152-161`.
- [x] A tabela do design system opera em modo servidor (carregar mais / próxima-anterior) sem perder busca
      e refresh.
      — `table.tsx:22-26` (props `onLoadMore`/`hasMore`/`loadMoreLoading`) e `:159-171` (o botão). A busca
      por `searchFields` continua funcionando e `:112-118` troca o texto de lista vazia quando o termo não
      apareceu nas páginas já carregadas, em vez de afirmar que não existe registro.
- [x] Os índices compostos exigidos por essas consultas passam a viver versionados no repositório.
      — `firestore.indexes.json:3-11`: `entity` com `userId` + `deletedAt` + `createdAt desc`, que é
      exatamente a consulta de `listByUserId`. `isMissingIndexError` (`(shared)/lib/pagination.ts:59-77`)
      degrada a falta de índice para `PAGINATION_INDEX_MISSING` em vez de 500.

Os dois códigos de erro novos estão nos três idiomas em
`translations/packages/shared/utils.ts:77-80` (pt-br), `:154-157` (en) e `:238-241` (es); os rótulos da
tabela, em `translations/components/ui/table.ts`.

### O que a entrega decidiu, das perguntas em aberto

- **Cursor opaco**, como recomendado: `encodeCursor`/`decodeCursor` (`(shared)/lib/pagination.ts:29-53`)
  embrulham o id do documento em base64url com um campo de versão.
- **Só `entity` foi migrado**, como recomendado. `user.repository.ts:32-43` continua lendo a coleção
  inteira e pagando o N+1 do Admin SDK.
- **`findAll()` foi mantido**, com o aviso no lugar do nome: o docblock em `base.repository.ts:63` manda
  preferir `paginate` para qualquer coleção que o usuário faça crescer.

### Entregue fora do corte

`update()` deixou de reler o documento e reescrevê-lo inteiro (`base.repository.ts:169-186`). O
round-trip pelo mapper gravava `createdAt` como string ISO, e o Firestore ordena por tipo antes de valor —
um único `PUT` bastava para quebrar qualquer ordenação sobre esse campo. Era um achado aberto no backlog e
virou pré-requisito do cursor. Junto veio `apps/api/scripts/backfill-instants.mjs`, para as bases que já
gravaram instantes como string.

### Fora do corte

- Busca textual no servidor: o `searchFields` da tabela filtra no cliente e passaria a filtrar só a página
  atual. Precisa de decisão própria (prefixo no Firestore × serviço de busca) — spec futura.
- Contagem total de registros: no Firestore custa uma agregação à parte; "carregar mais" não precisa dela.
- Migrar a listagem de usuários: carrega o N+1 do Admin SDK (`user.repository.ts:38-40` + `:52-63`), que
  merece tratamento separado. Filtros compostos arbitrários na API — cada um exige índice; entram por
  demanda.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | **Breaking change** no contrato de `list()` dos recursos migrados: array cru → envelope paginado. |
| `apps/api` | `BaseRepository` ganha leitura paginada; rotas de listagem passam a aceitar e devolver cursor, com teto de tamanho no servidor. |
| `apps/app` | Hooks `useListX` e a tela de `entities` passam a paginar; padrão novo a ser copiado pelos forks. |
| `apps/web` | N/A. |
| `packages/*` | `design-system`: `Table` com paginação controlada pelo servidor. `internationalization`: rótulos de "carregar mais"/vazio nos 3 idiomas. |
| Infra/env | Índices compostos versionados em `firestore.indexes.json`, que já tem **um** índice composto desde 2026-08-31 e nenhum de paginação. Nenhum serviço novo, nenhuma env nova, nenhum custo. |

## Riscos e trade-offs

- **Quebra de contrato do SDK.** Forks que já consomem `list()` precisam se adaptar — argumento a favor de
  fazer isso **agora**, com um recurso de exemplo e não dez.
- **Índice que falha só em runtime** (prática 11): passa em desenvolvimento com poucos dados e quebra em
  produção. Sem exercitar as consultas contra o emulador (`firebase-emulator-seed`), o risco sobrevive.
- **Ordenação instável corrompe a navegação**: sem desempate determinístico, registros criados no mesmo
  instante somem ou repetem entre páginas — bug que só aparece com volume.
- ✅ **Dependência de `firestore-admin-access` satisfeita em 2026-08-31.** O risco que a criava — paginar
  sobre o client SDK e reescrever tudo na migração — não existe mais: `BaseRepository` já roda no
  `firebase-admin/firestore` (`base.repository.ts:3`) e é sobre essa API que o cursor será escrito
  (`.startAfter()`/`.limit()`, não `startAfter(...)` de `firebase/firestore`). **Esta spec está
  desbloqueada.**
- **Custo herdado por todo fork:** paginar é mais código que `findAll()` e a UI perde "pular para a página
  N" — mas nenhum serviço, env ou custo em dinheiro. Mitigação: o padrão vem pronto no slice `entity`.

## Sinais de pronto

- Uma coleção com milhares de documentos abre a tela lendo apenas uma página; navegar adiante lê outra.
- A resposta da API não cresce com o tamanho da coleção, mesmo que o cliente peça um tamanho absurdo.
- Percorrer todas as páginas de uma lista com registros de mesmo instante de criação não repete nem
  perde nenhum registro.
- Toda consulta usada pelo slice de referência tem índice declarado no repositório antes do deploy.

## Perguntas em aberto

- Cursor opaco ou identificador do último documento exposto? — **recomendação:** opaco, para mudar a
  ordenação depois sem quebrar clientes.
- Migrar `entity` e `user` no mesmo corte? — **recomendação:** só `entity`; o N+1 de `user` contaminaria
  a avaliação do padrão.
- Manter `findAll()` para listas pequenas ou removê-lo? — **recomendação:** manter, com nome que declare
  o risco, para que ler tudo seja escolha consciente.
