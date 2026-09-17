# Plano: home do painel com widgets

Origem: `specs/dashboard-home.md`. A spec decide o *o quê* e o *por quê*; este documento decide o *como*.
Todas as âncoras de código foram lidas no checkout `la-paz`, HEAD `f08a84f`, em 2026-09-17.

---

## Etapa 1: análise

### 1. Contexto da tarefa

**Resumo.** Preencher as duas home pages do painel (comum e admin) com widgets de resumo alimentados por
contagem agregada no servidor, exercitando o `chart.tsx` do design-system pela primeira vez.

**Estado atual.** As duas páginas são o mesmo componente de 11 linhas: `<Header page="Home" /> +
<Container />`, sem conteúdo. `apps/app/app/[locale]/(authenticated)/(common)/(pages)/page.tsx:7` e
`apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/page.tsx:7` carregam a string literal
`"Home"`, a única tela do painel que não passa o título pelo dictionary.

**Objetivos.**

1. A home comum mostra saudação, dois cartões numéricos sobre as entidades do usuário e um gráfico de
   distribuição por tipo.
2. A home admin mostra três cartões numéricos sobre a base de usuários.
3. Os números vêm de `count()` do Firestore sob os guards existentes, nunca de contar o tamanho de uma
   lista trazida inteira.
4. O literal `"Home"` sai das duas páginas e é substituído pela chave que já existe.
5. Vazio, carregando e erro tratados nos widgets; todo texto nos três idiomas.

**Fora de escopo** (herdado da spec, sem re-litígio): widgets configuráveis ou arrastáveis; série
temporal, comparação com período anterior, filtro de data; métricas de receita (dependem de
`billing-subscription`); métricas de plataforma como erro e latência (pertencem a `observability-logging`);
contador materializado ou agregação incremental.

**Corte de MVP.** Duas rotas de agregação, duas homes preenchidas, um gráfico. O gráfico fica só na home
comum: a spec pede "um dos blocos é um gráfico", não um por painel, e o admin já entrega valor com três
números.

**Apps impactados.** `packages/sdk` (contrato), `apps/api` (duas rotas), `apps/app` (duas homes, um
componente compartilhado, dois hooks), `packages/internationalization` (dois arquivos de página mais um
código de erro). `apps/web` não é tocada. `packages/design-system` não é tocada: o `chart.tsx` já existe
e o cartão de métrica fica no app, conforme a recomendação da spec.

**Área do painel.** Ambas. Guard diferente por rota.

**Modo de produto.** No modo `simple` o painel é admin-only e o usuário comum opera na `apps/web`
(`packages/next-config/product-mode.ts:5-9`). A home comum continua existindo e funcionando, mas deixa de
ser a tela mais visitada, o que reduz o peso do risco de bundle do `recharts` nesse modo. Nada muda no
código por modo.

**Assinatura/plano.** Sem dependência.

**Dependências externas e env.** Nenhuma env nova, nenhum serviço novo. O `recharts` `^2.15.4` já está em
`packages/design-system/package.json:31`. Há índices do Firestore a publicar, ver seção 12.

**Genérico ou específico.** Específico do app. O cartão de métrica fica em
`apps/app/shared/components/ui/`, ao lado de `Container`, `Header` e `LoadErrorState`. Promover ao
design-system fica para quando aparecer um segundo consumidor.

#### 1.1 Fontes

A spec é a fonte única. Não há link externo, print, Figma nem card. Nenhuma referência ficou por ler.

---

### 2. Dados (Firestore)

#### 2.1 Coleções

Nenhuma coleção nova, nenhum campo novo, nenhum backfill. A feature só lê `entity` e `user`, que já
existem.

| Coleção | Campos lidos | Origem |
|---------|--------------|--------|
| `entity` | `userId`, `deletedAt`, `enabled`, `type` | `apps/api/(shared)/repositories/entity.repository.ts:12` |
| `user` | `deletedAt`, `type` | `apps/api/(shared)/repositories/user.repository.ts:12` |

Ownership em `entity` é `userId`, que guarda o **id do documento de perfil da coleção `user`**, não o UID
do Firebase Auth (`firestore.rules:39-43`, gravado em `apps/api/app/(routes)/entities/route.ts:79` a
partir de `ctx.subjectProfile.id`). Soft delete é `deletedAt`, filtrado com `== null`
(`base.repository.ts:67`, `entity.repository.ts:23`).

#### 2.2 Consultas

O `BaseRepository` não tem hoje nenhum caminho de contagem: `findAll()` (`base.repository.ts:64-73`) lê a
coleção inteira e `paginate()` (`:80-116`) é `protected` e devolve documentos. Não existe uma única
ocorrência de `.count(` ou `aggregate` em `apps/` ou `packages/`.

O Admin SDK instalado suporta agregação: `firebase-admin@13.6.0` traz
`@google-cloud/firestore@7.11.6`, cujo `Query.count()` está tipado em `types/firestore.d.ts:2015`
(`AggregateField.count()` em `:2584`). Uma aggregation query cobra por batch de índice varrido, não por
documento devolvido, então contar 5 mil entidades custa uma fração do que custa lê-las.

Consultas da feature, todas com igualdade e sem `orderBy`:

| # | Coleção | Filtro | Índice |
|---|---------|--------|--------|
| 1 | `entity` | `userId == X`, `deletedAt == null` | já existe |
| 2 | `entity` | `userId == X`, `deletedAt == null`, `enabled == true` | **novo** |
| 3 | `entity` | `userId == X`, `deletedAt == null`, `type == <T>` (x3) | **novo** |
| 4 | `user` | `deletedAt == null` | campo único, automático |
| 5 | `user` | `deletedAt == null`, `type == <T>` (x2) | **novo** |

A consulta 1 é servida pelo índice que já está declarado, `entity (userId ASC, deletedAt ASC, createdAt
DESC)` em `firestore.indexes.json:4-11`, porque `(userId, deletedAt)` é prefixo dele. As consultas 2, 3 e
5 exigem três índices compostos novos, listados na seção 12.

Por visita, a home comum dispara 5 aggregation queries em paralelo e a admin dispara 3. O total de
entidades é contado por query própria em vez de somar as três contagens por tipo, porque
`entity.mapper.ts:18` faz `type: record.type as EntityType` sem default: um documento gravado fora da API,
sem `type`, sairia de todas as três contagens e derrubaria o total. O preço dessa escolha é que a soma das
barras do gráfico pode ficar abaixo do número do cartão quando existir documento assim. A UI não tenta
reconciliar e não inventa uma categoria "outros".

As regras do Firestore não mudam: o acesso continua todo pelo Admin SDK, e `firestore.rules:32-34` nega
tudo para o cliente.

#### 2.3 Divergência conhecida na contagem de usuários

`userRepository.list()` (`user.repository.ts:32-43`) chama `findAll()` e depois casa cada perfil com o
Firebase Auth, descartando quem perdeu a conta de Auth (`:52-63`). A contagem por agregação não faz esse
casamento, porque fazê-lo exigiria ler todos os perfis, que é exatamente o que a agregação evita.

Consequência: se houver perfil órfão, o cartão "usuários" da home admin mostra um número maior do que a
quantidade de linhas em `/admin/users`. O `/test` deve tratar isso como comportamento esperado e
documentado, não como defeito.

---

### 3. Contrato `@repo/sdk`

Nenhum recurso novo. Os dois resumos entram como método nas actions que já existem, o que faz o
acoplamento virar estrutura: apagar `EntityActions` num fork leva o `summary` junto.

Tipos novos em `packages/sdk/src/types/entity/entity.ts` e `packages/sdk/src/types/user/user.ts`:

```ts
// entity.ts
export type EntitySummaryDTO = {
    total: number;
    enabled: number;
    byType: Record<EntityType, number>;
};

// user.ts
export type UserSummaryDTO = {
    total: number;
    byType: Record<UserType, number>;
};
```

Ambos saem pelo barrel `packages/sdk/src/types/index.ts` sem edição, porque `./entity` e `./user` já estão
exportados lá (`:4` e `:7`).

Actions novas, uma por classe existente:

```ts
// EntityActions
async summary(): Promise<EntitySummaryDTO>   // GET /entities/summary

// UserActions
async summary(): Promise<UserSummaryDTO>     // GET /users/summary
```

Contexto: `entity.summary()` é chamada no contexto `common`, `user.summary()` no `admin`. O SDK não segrega
actions por contexto (`packages/sdk/src/client/index.ts:15-33`); quem separa é o guard da rota.

`packages/sdk/src/client/index.ts` não muda: não há classe de action nova para registrar.

**Quem quebra:** ninguém. Os dois tipos e os dois métodos são adições.

---

### 4. API (`apps/api`)

#### 4.1 Rotas e guards

| Método | Path | Arquivo | Guard |
|--------|------|---------|-------|
| GET | `/entities/summary` | `apps/api/app/(routes)/entities/summary/route.ts` | `requireCommonPanelApi` |
| GET | `/users/summary` | `apps/api/app/(routes)/users/summary/route.ts` | `requireAdminApi` |

As rotas ficam **dentro** das pastas dos recursos que resumem. É a mitigação de "home é exemplo removível"
que a spec pede: apagar `entities/` num fork apaga a rota do resumo comum no mesmo gesto, em vez de deixar
uma rota `/dashboard/...` órfã apontando para uma coleção que não existe mais.

O custo dessa escolha é que `summary` passa a competir com o segmento dinâmico `[id]` que já existe em
`entities/[id]/route.ts` e `users/[id]/route.ts`. O App Router resolve segmento estático antes de
dinâmico, então `GET /entities/summary` cai no handler novo e não no de `[id]`. Isso não é verificável por
teste unitário de rota, que importa o módulo direto sem passar pelo roteador. Vai para a validação
executável (seção 8).

Nenhum header customizado novo, então `apps/api/proxy.ts` não muda.

#### 4.2 Validação na borda

Nenhuma. As duas rotas não têm body nem query param. Não há schema Zod novo, nem `parseCreateX`, nem
`parseRequestJson`.

#### 4.3 Persistência

`BaseRepository` ganha um único método `protected`:

```ts
protected async countQuery(query: Query): Promise<number> {
    const snapshot = await query.count().get();
    return snapshot.data().count;
}
```

`EntityRepository` ganha `summaryByUserId(userId)`; `UserRepository` ganha `summary()`. Ambos montam as
queries com `this.db.collection(this.table)`, que já é acessível porque `db` e `table` são `protected
readonly` (`base.repository.ts:44-45`), e disparam tudo em `Promise.all`.

Nenhum mapper novo: a agregação devolve número, não documento, e não há `Timestamp` para normalizar.

#### 4.4 Erros

Um código novo, compartilhado pelas duas rotas:

| `error.code` | Status | Quando |
|--------------|--------|--------|
| `SUMMARY_INDEX_MISSING` | 503 | `isMissingIndexError(error)` reconhece a recusa do Firestore por falta de índice composto |

O helper `isMissingIndexError` já existe em `apps/api/(shared)/lib/pagination.ts:59-77` e é reusado como
está. O código existente `PAGINATION_INDEX_MISSING` não serve aqui porque essas rotas não paginam, e
renomeá-lo quebraria tradução de rota alheia.

Qualquer outro erro é relançado e vira 500, como em `audit-events/route.ts:45`.

`SUMMARY_INDEX_MISSING` exige entrada em `apiErrors` nos três idiomas
(`packages/internationalization/translations/packages/shared/utils.ts`, blocos que abrem em `:7`, `:88` e
`:165`), sem o que `packages/internationalization/__tests__/parity.test.ts` falha.

Contrato de resposta: `{ data: <SummaryDTO> }` com 200, no envelope `Response<T>` de
`packages/sdk/src/client/type.ts`.

---

### 5. Front-end (`apps/app`)

#### 5.1 Rotas e renderização

As duas `page.tsx` de home viram Server Components `async` com prefetch RSC, espelhando
`admin/(pages)/users/(pages)/(home)/page.tsx:21`: `QueryClient` + `prefetchQuery` + `HydrationBoundary`,
tudo dentro de `if (!(await isImpersonating()))`, com o client vindo de `getServerApiClient("common")` ou
`("admin")`.

Cada uma renderiza um client component que carrega o `Header` com `page={routes.root.label}` e sem
breadcrumbs, porque a home é a raiz da trilha. É esse trecho que elimina o literal `"Home"`. O padrão de
`Header` dentro do client é o de `EntitiesListClient.tsx:130-140`.

`loading.tsx` novo em cada uma, com `Skeleton` nas formas dos cartões e do gráfico, no molde de
`audit/(pages)/(home)/loading.tsx`.

Sem entrada nova em `paths.ts`, `routes.tsx` ou `sidebar.tsx`: as duas rotas já existem e já estão na
trilha (`(common)/paths.ts:12` e `(admin)/admin/paths.ts:12`).

#### 5.2 Dados

`queryKeys.ts` ganha uma chave dentro de cada grupo existente, não um grupo `dashboard` novo. Assim o
acoplamento fica explícito e a invalidação por prefixo continua coerente com o resto do arquivo.

Hooks novos, cada um com a função de fetch no mesmo arquivo, no padrão de `useListEntities.tsx`:

| Hook | Arquivo | Base |
|------|---------|------|
| `useEntitySummary` + `fetchEntitySummary` | `(common)/(pages)/(hooks)/useEntitySummary.tsx` | `useAuthorizedQuery` |
| `useUserSummary` + `fetchUserSummary` | `(admin)/admin/(pages)/(hooks)/useUserSummary.tsx` | `useAuthorizedQuery` |

`useAuthorizedQuery` é obrigatório, não `useQuery`: o aviso em `useAuthorizedQuery.ts:18-19` registra que
uma requisição disparada antes do bearer token volta 401 e o React Query cacheia a falha.

**Invalidação do resumo.** `useEntityCrud` hoje invalida `queryKeys.entities.list()`, não
`queryKeys.entities.all` (`useEntityCrud.tsx:59-61`, `:84-86`, `:159-161`), então uma chave `summary`
irmã não seria revalidada sozinha: o usuário criaria uma entidade, voltaria para a home e veria o número
velho. As quatro mutations precisam de tratamento, e não o mesmo tratamento:

- `create`, `update` e `delete` ganham um `invalidateQueries({ queryKey: queryKeys.entities.summary() })`
  no `onSuccess`. O `update` entra porque pode mudar `type`, que muda o gráfico.
- `toggleEntityStatus` muda `enabled`, que alimenta um dos cartões, mas a regra de ouro 8 proíbe
  `invalidateQueries` em toggle. Ele ajusta o resumo por `setQueryData`, somando ou subtraindo 1 em
  `enabled`, e devolve o valor anterior no contexto para o rollback do `onError`, ao lado dos dois
  snapshots que já guarda (`useEntityCrud.tsx:129`).

O erro segue o padrão `handleClientError(new FormattedError(error, locale))`, o que dispensa chave de
tradução própria para falha de carga: o texto vem de `apiErrors`.

#### 5.3 Componentes

**`MetricCard`**, novo em `apps/app/shared/components/ui/MetricCard.tsx`. Fica aqui, e não em
`packages/design-system`, seguindo a recomendação da spec, e fica em `shared/` porque os dois painéis o
usam. Composto de `Card`/`CardHeader`/`CardTitle`/`CardContent`
(`packages/design-system/components/ui/card.tsx:83`) mais `Skeleton` para o estado de carga. Props:
`label`, `value`, `hint`, `loading`, `icon`.

**`EntityTypeChart`**, novo, client, isolado num arquivo só seu por causa do `recharts`. Usa
`ChartContainer` + `ChartTooltip` + `ChartTooltipContent` (`chart.tsx:384`) com um `BarChart` de três
barras. `ChartConfig` mapeia cada tipo para um token de cor por tema
(`chart.tsx:13-21`, `THEMES` em `:11`), que é o que faz o gráfico responder a light e dark.

**Carregamento do `recharts`.** O `EntityTypeChart` entra por `next/dynamic` com `ssr: false` e um
`Skeleton` como `loading`, declarado dentro do client component da home. O motivo é o risco que a spec
registra: `recharts` não faz tree-shaking significativo e entra praticamente inteiro no chunk da rota, que
aqui é a tela mais visitada do painel. Com o `dynamic`, os cartões numéricos pintam sem esperar pelo
gráfico. O `dynamic` fica no client e não na `page.tsx` porque `ssr: false` não é permitido em Server
Component no App Router.

Rótulos das três barras reusam `dictionary.apps.app.pages.common.entities.list.typeLabels`, que já existe
e já é consumido em `EntitiesListClient.tsx:48-55`. Reusar reforça o acoplamento ao slice `entity` em vez
de duplicar copy.

#### 5.4 Estados

| Estado | Home comum | Home admin |
|--------|-----------|------------|
| Carregando | `Skeleton` no `loading.tsx` da rota, depois `loading` no `MetricCard` e no `dynamic` do gráfico | igual, sem gráfico |
| Vazio | `total === 0`: bloco `Empty` (`packages/design-system/components/ui/empty.tsx:96`) com título, descrição e botão para criar a primeira entidade. Os cartões e o gráfico não aparecem | `total === 0` não ocorre na prática (há ao menos o admin logado); os cartões mostram os números como estão |
| Erro | `LoadErrorState` inline, mantendo a saudação visível, no molde de `AuditListClient.tsx:83-107` | igual |

O estado vazio da home comum é o que cumpre o sinal de pronto "um usuário sem nenhum registro vê estado
vazio com orientação, não zeros soltos nem esqueleto eterno".

#### 5.5 i18n e a11y

Dois arquivos de tradução novos, ambos no formato de `admin/auditTrail.ts` (três locales no mesmo arquivo,
um export nomeado): `common/home.ts` e `admin/home.ts`, registrados em `common/index.ts` e
`admin/index.ts`. Árvore completa na Etapa 2.

A saudação concatena a chave com o nome do usuário no JSX (`` `${home.greeting}, ${firstName}` ``). O
dictionary do repo não tem mecanismo de interpolação, e inventar um sai do escopo. O texto continua vindo
do dicionário; só a vírgula é literal. As três línguas põem o nome depois da saudação, então a ordem
funciona nas três.

Fonte do nome: `useAuth()` de `@repo/auth/provider`, com `useMyAccount()` como fonte preferida na home
comum, exatamente como `ProfileDropdown.tsx:33-35` faz (o comentário ali explica por quê: o user do
Firebase mantém um displayName velho até o token renovar). Na home admin só o `useAuth()`, porque
`GET /account` é guardada por `requireCommonPanelApi` (`apps/api/app/(routes)/account/route.ts:19`) e um
admin que não está personificando recebe 403 `COMMON_PANEL_FORBIDDEN`.

Nenhuma string de UI solta: rótulo de cartão, título e descrição do gráfico, texto de vazio e `aria-label`
saem todos do dictionary.

---

### 6. Autorização e segurança

- `GET /entities/summary` é guardada por `requireCommonPanelApi` e conta somente onde
  `userId == ctx.subjectProfile.id`. Não há id vindo do cliente, então não há superfície de ownership a
  forjar: o escopo é derivado do contexto autenticado.
- `GET /users/summary` é guardada por `requireAdminApi`. Um usuário comum recebe 403 `ADMIN_FORBIDDEN`
  (`apps/api/app/(guards)/admin.ts:46-53`); sem token, 401 `AUTH_INVALID_TOKEN` (`:35-41`).
- **Impersonação.** Ambas são GET, então passam por `assertReadOnlyWhileImpersonating`, cujo `SAFE_METHODS`
  inclui GET (`apps/api/(shared)/lib/impersonation-read-only.ts:5`). Um admin personificando abre a home
  comum e vê os números **do usuário personificado**, porque `common-panel.ts:72-74` resolve
  `subjectProfile` a partir de `requestUserId`. É o comportamento correto. O prefetch RSC é pulado nesse
  caso, pelo mesmo motivo já documentado em `panelSnapshot.ts:40-46`.
- Nenhum dado sensível entra nos DTOs: os dois carregam só números.
- Regras do Firestore e rate limit não mudam.

---

### 7. Testes

Todos no nível mais barato que prova o comportamento. Nenhum exige emulador nem app de pé.

| Arquivo | Nível | O que prova |
|---------|-------|-------------|
| `apps/api/__tests__/entitiesSummaryRoute.test.ts` | rota, `vi.mock` do repo e das dependências do guard | envelope `{ data }` com 200; 401 sem token; 403 para perfil admin; `isMissingIndexError` vira 503 `SUMMARY_INDEX_MISSING`; erro alheio relançado; `Object.keys(handlers)` só tem `GET` |
| `apps/api/__tests__/usersSummaryRoute.test.ts` | rota | o mesmo sob `requireAdminApi`; 403 `ADMIN_FORBIDDEN` para usuário comum |
| `apps/api/__tests__/entityRepositorySummary.test.ts` | repositório, contra o `fakeDb` | cada uma das 5 queries leva os `where` certos; o total vem de query própria e não da soma dos tipos |
| `apps/api/__tests__/firestoreIndexes.test.ts` | edição | os três índices novos estão declarados |
| `apps/app/__tests__/useEntitySummary.test.tsx` | hook, `renderHook` + `QueryClientProvider` | a queryKey é `entities.summary()`; o cache recebe o DTO |
| `apps/app/__tests__/useEntityCrud.test.tsx` | edição | `create`/`update`/`delete` invalidam o resumo; o toggle ajusta `enabled` por `setQueryData` e faz rollback no erro |

**Ajuste obrigatório no `fakeDb`.** `apps/api/__tests__/baseRepository.test.ts:29+` reimplementa o
Firestore em memória e não conhece `count()`. O `/develop` precisa acrescentá-lo ao fake antes que
qualquer teste de agregação rode. O fake também só aceita o operador `==` (`:49-57`), o que basta: todas
as queries da feature usam igualdade.

**Por que nenhum teste de emulador.** O emulador serve qualquer consulta, indexada ou não, como registra o
comentário em `firestoreIndexes.test.ts:22-25`. Um teste de agregação contra o emulador provaria que
`count()` devolve um número, que a tipagem já garante, e não provaria o que importa, que é a declaração do
índice. Esse papel fica com `firestoreIndexes.test.ts`, que é determinístico e roda em milissegundos.

---

### 8. Validação visual

Obrigatória (regra de ouro 11). Subir `pnpm --filter app dev` e percorrer com `agent-browser`, **em
sequência**, nunca em paralelo.

1. Home comum com entidades: cartões, gráfico renderizado, saudação com o nome.
2. Home comum com usuário sem nenhuma entidade: bloco vazio com orientação, sem zeros soltos.
3. Home comum com a API derrubada: `LoadErrorState` inline, saudação ainda visível.
4. Home admin: os três cartões.
5. Gráfico em tema claro e em tema escuro, conferindo que as cores vêm dos tokens e não do default do
   recharts.
6. Largura de celular nas duas homes: cartões empilham, gráfico não estoura a viewport.
7. Admin personificando um comum: a home comum mostra os números do personificado.
8. Navegar para `/entities/summary` e `/users/summary` no browser autenticado, confirmando que a rota
   estática vence a dinâmica e a resposta não é `ENTITY_NOT_FOUND`.
9. Criar uma entidade e voltar para a home: o total sobe sem recarregar a página.

Screenshot de cada um dos estados 1, 2, 3, 4 e 6.

---

### 9. Critérios de aceite

Ficam para o `/test`, no formato §9.1. O material está nas seções 6, 7 e 8, mais a lista de infra da
seção 12, que delimita o que não pode ser reprovado sem índice publicado.

---

## Etapa 2: blueprint técnico

### 10.1 Contrato do SDK

```ts
// packages/sdk/src/types/entity/entity.ts  (acrescentar ao fim)
export type EntitySummaryDTO = {
    total: number;
    enabled: number;
    byType: Record<EntityType, number>;
};

// packages/sdk/src/types/user/user.ts  (acrescentar ao fim)
export type UserSummaryDTO = {
    total: number;
    byType: Record<UserType, number>;
};
```

```ts
// packages/sdk/src/actions/entity/action.ts  (acrescentar à classe)
async summary(): Promise<EntitySummaryDTO> {
    const { data } = await this.client.request<Response<EntitySummaryDTO>>({
        url: "/entities/summary",
        method: "GET",
    });

    return data.data;
}
```

```ts
// packages/sdk/src/actions/user/user/action.ts  (acrescentar à classe)
async summary(): Promise<UserSummaryDTO> {
    const { data } = await this.client.request<Response<UserSummaryDTO>>({
        url: "/users/summary",
        method: "GET",
    });

    return data.data;
}
```

### 10.2 Resposta de exemplo

```json
// GET /entities/summary  ->  200
{
  "data": {
    "total": 42,
    "enabled": 37,
    "byType": { "franchise": 12, "customer": 25, "collaborator": 5 }
  }
}
```

```json
// GET /users/summary  ->  200
{
  "data": {
    "total": 128,
    "byType": { "admin": 3, "common": 125 }
  }
}
```

```json
// qualquer uma das duas, sem o índice publicado  ->  503
{ "error": { "code": "SUMMARY_INDEX_MISSING" } }
```

### 10.3 Tabela de erros

| `error.code` | Status | Origem |
|--------------|--------|--------|
| `AUTH_INVALID_TOKEN` | 401 | guard, já existe |
| `COMMON_PANEL_FORBIDDEN` | 403 | `requireCommonPanelApi`, já existe |
| `ADMIN_FORBIDDEN` | 403 | `requireAdminApi`, já existe |
| `SUMMARY_INDEX_MISSING` | 503 | **novo**, das duas rotas |

### 10.4 Persistência

```ts
// apps/api/(shared)/repositories/base.repository.ts
protected async countQuery(query: Query): Promise<number> {
    const snapshot = await query.count().get();
    return snapshot.data().count;
}
```

```ts
// apps/api/(shared)/repositories/entity.repository.ts
async summaryByUserId(userId: string): Promise<EntitySummaryDTO> {
    const scoped = () =>
        this.db
            .collection(this.table)
            .where("userId", "==", userId)
            .where("deletedAt", "==", null);

    const [total, enabled, franchise, customer, collaborator] = await Promise.all([
        this.countQuery(scoped()),
        this.countQuery(scoped().where("enabled", "==", true)),
        this.countQuery(scoped().where("type", "==", EntityType.FRANCHISE)),
        this.countQuery(scoped().where("type", "==", EntityType.CUSTOMER)),
        this.countQuery(scoped().where("type", "==", EntityType.COLLABORATOR)),
    ]);

    return {
        total,
        enabled,
        byType: { franchise, customer, collaborator },
    };
}
```

```ts
// apps/api/(shared)/repositories/user.repository.ts
async summary(): Promise<UserSummaryDTO> {
    const scoped = () =>
        this.db.collection(this.table).where("deletedAt", "==", null);

    const [total, admin, common] = await Promise.all([
        this.countQuery(scoped()),
        this.countQuery(scoped().where("type", "==", UserType.ADMIN)),
        this.countQuery(scoped().where("type", "==", UserType.COMMON)),
    ]);

    return { total, byType: { admin, common } };
}
```

### 10.5 Esqueleto do handler

```ts
// apps/api/app/(routes)/entities/summary/route.ts
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { isMissingIndexError } from "@/(shared)/lib/pagination";
import { entityRepository } from "@/(shared)/repositories/entity.repository";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

export const GET = requireCommonPanelApi(async (_req, ctx) => {
    try {
        const summary = await entityRepository.summaryByUserId(
            ctx.subjectProfile.id
        );

        return Response.json({ data: summary });
    } catch (error) {
        if (isMissingIndexError(error)) {
            return Response.json(
                { error: { code: "SUMMARY_INDEX_MISSING" } },
                { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
            );
        }
        throw error;
    }
});
```

`users/summary/route.ts` é o mesmo esqueleto com `requireAdminApi`, `userRepository.summary()` e sem uso
de `ctx`, como em `audit-events/route.ts:9`.

### 10.6 Índices do Firestore

Três entradas novas em `firestore.indexes.json`, ao lado das três que já existem (`:4-27`):

```json
{
  "collectionGroup": "entity",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId",    "order": "ASCENDING" },
    { "fieldPath": "deletedAt", "order": "ASCENDING" },
    { "fieldPath": "enabled",   "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "entity",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId",    "order": "ASCENDING" },
    { "fieldPath": "deletedAt", "order": "ASCENDING" },
    { "fieldPath": "type",      "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "user",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "deletedAt", "order": "ASCENDING" },
    { "fieldPath": "type",      "order": "ASCENDING" }
  ]
}
```

Cada um também entra em `apps/api/__tests__/firestoreIndexes.test.ts`, ou a declaração não fica coberta.

### 10.7 Árvore de arquivos do front

```
apps/app/shared/components/ui/
    MetricCard.tsx                                  novo

apps/app/app/[locale]/(authenticated)/(common)/(pages)/
    page.tsx                                        editado: async + prefetch + HydrationBoundary
    loading.tsx                                     novo
    (components)/CommonHomeClient.tsx               novo, "use client"
    (components)/EntityTypeChart.tsx                novo, "use client", isola o recharts
    (hooks)/useEntitySummary.tsx                    novo

apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/
    page.tsx                                        editado
    loading.tsx                                     novo
    (components)/AdminHomeClient.tsx                novo, "use client"
    (hooks)/useUserSummary.tsx                      novo

apps/app/shared/lib/queryKeys.ts                    editado
apps/app/.../entities/(hooks)/useEntityCrud.tsx     editado
```

`(components)` e `(hooks)` ficam como irmãos diretos do `page.tsx` porque a home é a raiz do grupo e não
tem pasta de recurso própria. Um route group sem `page.tsx` dentro não gera rota, então não há conflito
com o `page.tsx` ao lado.

### 10.8 Pseudo-diffs

```diff
  // apps/app/shared/lib/queryKeys.ts
  entities: {
      all: ["entities"] as const,
      list: () => [...queryKeys.entities.all, "list"] as const,
+     summary: () => [...queryKeys.entities.all, "summary"] as const,
      detail: (id: string) => [...queryKeys.entities.all, "detail", id] as const,
  },
  users: {
      all: ["users"] as const,
      list: (type?: string) => [...queryKeys.users.all, "list", type ?? "all"] as const,
+     summary: () => [...queryKeys.users.all, "summary"] as const,
      detail: (id: string) => [...queryKeys.users.all, "detail", id] as const,
  },
```

```diff
  // apps/app/.../(common)/(pages)/page.tsx
- import { Container } from "@/shared/components/ui/Container";
- import { Header } from "@/shared/components/ui/Header";
-
- export default function CommonHome() {
-     return (
-         <>
-             <Header page="Home" />
-             <Container />
-         </>
-     );
- }
+ import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
+ import { getServerApiClient } from "@/lib/server/apiServerClient";
+ import { isImpersonating } from "@/lib/server/panelSnapshot";
+ import { queryKeys } from "@/shared/lib/queryKeys";
+ import { CommonHomeClient } from "./(components)/CommonHomeClient";
+
+ export default async function CommonHome() {
+     const queryClient = new QueryClient();
+
+     if (!(await isImpersonating())) {
+         const client = await getServerApiClient("common");
+         if (client) {
+             await queryClient.prefetchQuery({
+                 queryKey: queryKeys.entities.summary(),
+                 queryFn: () => client.entity.summary(),
+             });
+         }
+     }
+
+     return (
+         <HydrationBoundary state={dehydrate(queryClient)}>
+             <CommonHomeClient />
+         </HydrationBoundary>
+     );
+ }
```

```diff
  // apps/app/.../entities/(hooks)/useEntityCrud.tsx  (create, update e delete)
      onSuccess: async () => {
          await queryClient.invalidateQueries({
              queryKey: queryKeys.entities.list(),
          });
+         await queryClient.invalidateQueries({
+             queryKey: queryKeys.entities.summary(),
+         });
          successAlert(messages.created);
      },
```

```diff
  // apps/app/.../entities/(hooks)/useEntityCrud.tsx  (toggle, sem invalidateQueries)
  type ToggleEntityStatusContext = {
      previousList?: EntityListPages;
      previousDetail?: EntityDTO;
+     previousSummary?: EntitySummaryDTO;
  };

  // dentro do onMutate, depois dos dois setQueryData que já existem:
+ const previousSummary = queryClient.getQueryData<EntitySummaryDTO>(
+     queryKeys.entities.summary()
+ );
+ queryClient.setQueryData<EntitySummaryDTO>(
+     queryKeys.entities.summary(),
+     (old) =>
+         old && {
+             ...old,
+             enabled: old.enabled + (input.enabled ? 1 : -1),
+         }
+ );
```

```diff
  // apps/app/.../(components)/CommonHomeClient.tsx  (carregamento do gráfico)
+ const EntityTypeChart = dynamic(
+     () => import("./EntityTypeChart").then((mod) => mod.EntityTypeChart),
+     {
+         ssr: false,
+         loading: () => <Skeleton className="h-64 w-full rounded-xl" />,
+     }
+ );
```

### 10.9 Chaves de i18n

Arquivo novo `translations/apps/app/pages/common/home.ts`, export `commonHomePageTranslations`, três
locales com a mesma árvore:

```
greeting
subtitle
metrics.total.label
metrics.total.hint
metrics.enabled.label
metrics.enabled.hint
chart.title
chart.description
chart.empty
empty.title
empty.description
empty.action
```

Arquivo novo `translations/apps/app/pages/admin/home.ts`, export `adminHomePageTranslations`:

```
greeting
subtitle
metrics.total.label
metrics.total.hint
metrics.admins.label
metrics.admins.hint
metrics.common.label
metrics.common.hint
```

Registro, seguindo exatamente o que a PR #18 fez com `auditTrail`:

- `translations/apps/app/pages/common/index.ts`: um `import` e a linha `home: commonHomePageTranslations[<locale>]`
  nos três blocos (o arquivo hoje tem os blocos em `:7`, `:13` e `:19`).
- `translations/apps/app/pages/admin/index.ts`: o mesmo para `adminHomePageTranslations`.

Mais o código de erro em `translations/packages/shared/utils.ts`, nos três blocos `apiErrors`:

```
SUMMARY_INDEX_MISSING: "O resumo está indisponível no momento. Tente de novo em instantes."
```

Rótulos das barras do gráfico não geram chave: reusam
`apps.app.pages.common.entities.list.typeLabels`.

### 10.10 Ordem de implementação e commits

Um commit por app ou pacote, na ordem de dependência.

| # | Escopo | Mensagem sugerida |
|---|--------|-------------------|
| 1 | `packages/sdk` | `feat(sdk): summary contract for entity and user` |
| 2 | `apps/api` | `feat(api): count aggregation on the base repository` |
| 3 | `apps/api` | `feat(api): entity and user summary routes` |
| 4 | raiz | `chore(api): declare summary composite indexes` |
| 5 | `apps/app` | `feat(app): metric card and dashboard summary hooks` |
| 6 | `apps/app` | `feat(app): fill the common and admin panel home` |
| 7 | `packages/internationalization` | `feat(internationalization): dashboard home copy and summary error` |
| 8 | `docs/features` | `docs(features): dashboard-home` |

Quem cria e nomeia a branch é o `revisor-codigo`, no `/review`. O `/analyze` e o `/develop` não commitam.

### 10.11 Env nova

Nenhuma. Nada a configurar em `.env` de fork.

---

## 11. Riscos para o `/develop`

1. **O `fakeDb` dos testes não tem `count()`.** `apps/api/__tests__/baseRepository.test.ts:29+` precisa
   ganhar o método antes que qualquer teste de agregação passe.
2. **`summary` versus `[id]`.** As duas rotas ficam ao lado de um segmento dinâmico. O comportamento do
   App Router resolve a favor do estático, mas isso só se observa com o app de pé; teste unitário de rota
   não exercita o roteador.
3. **A soma das barras pode ser menor que o total.** Documento de `entity` sem `type` fica fora das três
   contagens por tipo. A UI não reconcilia e não cria categoria "outros".
4. **Cartão de usuários versus lista de usuários.** Os números podem divergir quando existe perfil órfão
   de Auth, pelo motivo da seção 2.3.
5. **Grau de liberdade previsto.** Se o ajuste otimista do toggle em `useEntityCrud` sair caro demais, o
   fallback é cortar o cartão "ativas". Isso remove junto o índice `entity (userId, deletedAt, enabled)` e
   a mudança no toggle, e deixa a home comum com um cartão e o gráfico. Registrar no `handoff.md` se
   acontecer.
6. **`ssr: false` no lugar certo.** O `next/dynamic` tem que ficar no client component, não na `page.tsx`.

---

## 12. Pré-requisitos manuais de infra

O `/develop` não consegue satisfazer nada desta lista. Um critério de aceite que dependa dela e seja
verificado num ambiente sem esses passos é **não verificado**, nem aprovado nem reprovado.

| Item | Quem faz | Sem isso |
|------|----------|----------|
| Publicar os três índices compostos: `firebase deploy --only firestore:indexes` | manual, em cada ambiente com Firestore real | As duas rotas respondem 503 `SUMMARY_INDEX_MISSING` até o índice terminar de construir |
| Aguardar a construção do índice | Firestore, minutos a horas conforme o volume | O 503 persiste mesmo depois do deploy |

Nenhuma variável de ambiente nova, nenhum serviço a ativar, nenhum webhook a cadastrar.

**Armadilha para o `/test`.** O emulador do Firestore serve consulta sem índice, como registra o
comentário em `apps/api/__tests__/firestoreIndexes.test.ts:22-25`. A feature vai funcionar localmente sem
que ninguém publique nada, e quebrar em produção. É por isso que a declaração em `firestore.indexes.json`
é coberta por teste próprio em vez de ser verificada rodando.

**Rollback.** Reverter os commits basta. Nenhum dado é gravado, nenhum documento fica órfão. Os índices
podem ficar publicados sem custo relevante.

**O que um fork precisa ajustar.** Se apagar o slice `entity`, apagar junto: a rota
`entities/summary/route.ts` (some com a pasta), `summaryByUserId`, `EntitySummaryDTO`, `entity.summary()`
no SDK, `queryKeys.entities.summary`, o hook, o gráfico, o arquivo `common/home.ts` e os dois índices de
`entity`. O acoplamento foi desenhado para que essa lista seja óbvia pela estrutura de diretórios.

---

## Perguntas em aberto

Rodada autônoma: todas foram decididas e implementadas no plano. Ficam registradas para revisão.

**1. Widgets sobre `entity` ou métricas neutras da conta?**
Opções: exemplos sobre `entity`; métricas neutras (data de cadastro, plano, atividade).
**Adotada:** exemplos sobre `entity`, que é a recomendação escrita na spec.

**2. Cartão de métrica no design-system ou local no app?**
Opções: `packages/design-system`; `apps/app`.
**Adotada:** local, em `apps/app/shared/components/ui/MetricCard.tsx`, que é a recomendação da spec.
Fica em `shared/` e não dentro de um dos painéis porque os dois o usam.

**3. Onde ficam as rotas de resumo?**
Opções: `/dashboard/summary` e `/dashboard/admin-summary`, um recurso `dashboard` novo no SDK;
`/entities/summary` e `/users/summary`, métodos nas actions existentes.
**Adotada:** a segunda. A spec pede que apagar `entity` num fork não quebre a home de forma obscura, e
pôr a rota dentro da pasta do recurso faz o acoplamento virar estrutura de diretório em vez de comentário.
O preço é a convivência com o segmento `[id]`, tratada no risco 2.

**4. Como o `recharts` entra na tela mais visitada do painel?**
Opções: import direto; `next/dynamic` com `ssr: false`; desenhar o gráfico sem recharts.
**Adotada:** `next/dynamic` com `ssr: false`. O import direto contraria o risco que a própria spec
registra. Desenhar à mão contraria o corte de MVP, que pede o primeiro uso do `chart.tsx`.

**5. O total de entidades é query própria ou soma das contagens por tipo?**
Opções: somar os três tipos (4 queries no total); query própria para o total (5 queries).
**Adotada:** query própria. Custa uma aggregation query a mais por visita, e evita que um documento sem
`type` derrube silenciosamente o número principal.

**6. O que fazer com o toggle de `enabled`, que muda um cartão mas não pode invalidar?**
Opções: invalidar mesmo assim; ajustar por `setQueryData`; cortar o cartão "ativas".
**Adotada:** ajustar por `setQueryData` com rollback, que é o que a regra de ouro 8 manda. O corte do
cartão fica como fallback documentado (risco 5).

**7. De onde vem o nome na saudação?**
Opções: `GET /account`; `useAuth()` do Firebase; os dois.
**Adotada:** os dois na home comum, com `useMyAccount()` preferido e `useAuth()` de reserva, copiando
`ProfileDropdown.tsx:33-35`. Na home admin, só `useAuth()`, porque `GET /account` responde 403 para admin
que não está personificando.

**8. Cabe reescrever `useEntityCrud` para invalidar `queryKeys.entities.all`?**
Opções: trocar as invalidações por `all`; acrescentar a invalidação de `summary` linha a linha.
**Adotada:** acrescentar linha a linha. Trocar por `all` invalidaria o detalhe de todas as entidades e
mexe em comportamento que já funciona, fora do que esta tarefa pede.
