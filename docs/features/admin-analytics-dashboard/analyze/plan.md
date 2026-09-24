# Métricas de atividade na home do admin

Plano da spec [`admin-analytics-dashboard`](../spec.md), no formato de
[`docs/feature-analysis-guide.md`](../../../feature-analysis-guide.md).

Analisado contra `HEAD` = `origin/main` = `e656331`, em 2026-09-19. Toda âncora `arquivo:linha` abaixo foi
conferida neste workspace.

---

## Etapa 1 — Análise

### 1. Contexto da tarefa

A home do admin conta cabeças e nada mais. Esta tarefa acrescenta a ela dois números de uso e um gráfico
de recência, agregados no servidor a partir do `lastAccessAt` que a PR #21 passou a carimbar.

**Objetivos**

- KPI de usuários ativos, com a definição visível na tela.
- KPI de usuários inativos, idem.
- Gráfico de distribuição de acesso, reaproveitando `CategoryBarChart`.
- Degradação traduzida quando o índice composto não estiver publicado.

**Fora de escopo** (herdado do corte da spec, secção "Fora do corte")

Visitas à `apps/web` (item c), billing, tempo real, export, comparação com período anterior, filtro de
intervalo, segmentação e detalhamento por usuário. Nada de métrica de plataforma (erro, latência), que é
de `observability-logging`.

**Corte de MVP.** A menor fatia vertical é uma rota de agregado nova sob `requireAdminApi`, um hook, e um
bloco na home do admin. Sem tela nova, sem rota de navegação nova, sem filtro. O gráfico usa o componente
que já existe.

| item | resposta |
|------|----------|
| Apps impactados | `apps/app`, `apps/api`, `packages/sdk`, `packages/internationalization` |
| Área do painel | admin (`(admin)/admin`), guard `requireAdminApi` |
| Modo de produto | indiferente. A home do admin existe nos dois modos e nada aqui lê `NEXT_PUBLIC_PRODUCT_MODE` |
| Assinatura/plano | N/A |
| Dependências externas | Firestore, já em uso. Nenhum provedor novo |
| Env nova | nenhuma |
| Genérico ou específico | específico do app. O único candidato a pacote é o gráfico, e ele já está em `@repo/design-system` |

**Dependência nova:** nenhuma. `recharts` entrou com a `dashboard-home` e é consumido por
`packages/design-system/components/ui/category-bar-chart.tsx:3`.

#### 1.1 Fontes, links e anexos

Fonte primária: a spec `specs/admin-analytics-dashboard.md`, remedida contra `main` em 2026-09-19.

Fonte secundária obrigatória: `docs/features/user-activity-tracking/spec.md`, porque o dado agregado aqui
nasce lá. Dois fatos daquela spec mandam no desenho desta:

1. A precisão do campo é de 15 minutos (`ACTIVITY_WINDOW_MINUTES` em
   `apps/api/(shared)/lib/activity-recorder.ts:12`).
2. Não houve backfill (`user-activity-tracking/spec.md:113-114`), então em base existente a maioria dos
   perfis não tem o campo.

Nenhum link inacessível. Sem Figma, sem print, sem card do ClickUp.

**Referências não lidas:** nenhuma.

---

### 2. Dados (Firestore)

#### 2.1 Coleção e documento

Coleção `user`, já existente. **Nenhum campo novo.** A tarefa só lê `lastAccessAt`
(`packages/sdk/src/types/user/user.ts:27`) e `deletedAt`.

O campo é gravado por `userRepository.touchLastAccess` (`user.repository.ts:37-42`) como `Date`, que o
driver persiste como `Timestamp`. `BaseRepository.create` (`base.repository.ts:147-168`) não o declara, e
por isso **o campo é ausente, não `null`, em perfil nunca carimbado**. Essa distinção decide a modelagem
das consultas abaixo.

#### 2.2 Consultas

São cinco agregações, todas via `countQuery` (`base.repository.ts:122-124`), nenhuma leitura de documento.

| # | nome | filtro | precisa de índice composto? |
|---|------|--------|------------------------------|
| 1 | `total` | `deletedAt == null` | não. Campo único, índice automático |
| 2 | `last7Days` | `deletedAt == null` + `lastAccessAt >= now-7d` | sim |
| 3 | `from8To30Days` | `deletedAt == null` + `now-30d <= lastAccessAt < now-7d` | sim |
| 4 | `from31To90Days` | `deletedAt == null` + `now-90d <= lastAccessAt < now-30d` | sim |
| 5 | `over90Days` | `deletedAt == null` + `epoch <= lastAccessAt < now-90d` | sim |

Os quatro baldes são mutuamente exclusivos e cobrem todo perfil carimbado. O quinto balde do gráfico,
`never`, é **derivado**: `total - (2+3+4+5)`, sem consulta.

**Por que o balde 5 tem piso em `new Date(0)` em vez de ser só `< now-90d`.** No Firestore, `null` ordena
antes de qualquer `Timestamp`, então um filtro aberto para baixo corre o risco de casar perfis com
`lastAccessAt: null` — valor que o `UserDTO` permite (`user.ts:27`) mesmo que nada no repositório o
escreva hoje. Delimitar os dois lados elimina a dúvida sem custo: uma consulta de intervalo continua
sendo uma agregação só.

**Perfis sem o campo saem de todos os quatro baldes**, porque o Firestore não indexa documento que não tem
o campo. É por isso que `never` é derivado do total, e não consultado.

**Índice composto novo.** Um só, e ele cobre os quatro baldes:

```json
{
  "collectionGroup": "user",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "deletedAt", "order": "ASCENDING" },
    { "fieldPath": "lastAccessAt", "order": "ASCENDING" }
  ]
}
```

Regras do Firestore (`firestore.rules`): sem mudança. A API acessa por Admin SDK e ignora as rules
(`docs/PRE-PRODUCTION.md:38`).

#### 2.3 Dados existentes

Documento antigo sem `lastAccessAt` continua válido e é contado no `total`. Ele cai no balde `never`.

**Nenhum backfill.** A spec de `user-activity-tracking` deixou isso fora do corte de propósito
(`spec.md:113-114`), e o efeito visível é o tema da secção 5.4 abaixo.

`never` pode dar negativo se um perfil for criado entre a contagem do total e a dos baldes, porque as
cinco agregações rodam em paralelo e não em transação. Clampar com `Math.max(0, ...)` no repositório.

---

### 3. Contrato `@repo/sdk`

DTO novo em `packages/sdk/src/types/user/user.ts`, ao lado do `UserSummaryDTO` (`:49-52`). Nenhum tipo
existente muda, então **nada quebra**: `grep` por `UserSummaryDTO` devolve o repositório
(`user.repository.ts:63`), a action (`actions/user/user/action.ts:34`) e o hook
(`useUserSummary.tsx:1`), todos intocados.

```ts
export type UserActivityBucket =
    | "last7Days"
    | "from8To30Days"
    | "from31To90Days"
    | "over90Days"
    | "never";

export type UserActivitySummaryDTO = {
    active: number;
    inactive: number;
    byRecency: Record<UserActivityBucket, number>;
    thresholds: {
        activeDays: number;
        inactiveDays: number;
        precisionMinutes: number;
    };
};
```

`active` é o balde `last7Days` e `inactive` é `from31To90Days + over90Days`. A duplicação é deliberada: a
definição de ativo e inativo é regra de negócio e mora no servidor, então o cliente lê o número em vez de
recalcular a partir dos baldes.

`thresholds` existe para a tela poder escrever a definição junto do número sem hardcodar 7, 30 e 15 no
dictionary. `precisionMinutes` vem de `ACTIVITY_WINDOW_MINUTES` (`activity-recorder.ts:12`), que é a folga
herdada do carimbo.

**O `total` não entra no DTO.** A home já tem o total no cartão de `GET /users/summary`, e os dois vêm de
requests distintos: publicar dois totais na mesma tela produziria divergência de um ou dois registros numa
base ativa, sem que nenhum dos dois estivesse errado. O total é usado dentro do repositório para derivar
`never` e para de existir ali.

Action em `packages/sdk/src/actions/user/user/action.ts`, ao lado de `summary()` (`:34-41`). Contexto
`admin`, como o resto da classe.

---

### 4. API (`apps/api`)

#### 4.1 Rota e guard

`GET /users/activity-summary`, arquivo `apps/api/app/(routes)/users/activity-summary/route.ts`.

Guard `requireAdminApi`, como `users/summary/route.ts:6`. Segmento estático convive com `users/[id]`, que
é o que `users/summary` já faz hoje.

**Rota vizinha, não extensão de `/users/summary`.** É a recomendação da spec, e o motivo aparece no
comportamento: o `summary()` atual roda três contagens que dependem só de índice de campo único mais o
composto `deletedAt + type`. Misturar nele consultas que dependem de um índice ainda não publicado faria a
home inteira mostrar erro quando só o bloco de atividade estivesse indisponível.

Nenhum header customizado novo, então `apps/api/proxy.ts` não muda.

#### 4.2 Validação na borda

N/A. Rota `GET` sem query param e sem body. Nada a validar com Zod.

#### 4.3 Persistência

Método novo em `UserRepository` (`apps/api/(shared)/repositories/user.repository.ts`), no molde de
`summary()` (`:63-74`): uma função `scoped()` e um `Promise.all` de `countQuery`.

As janelas saem de um módulo próprio, `apps/api/(shared)/lib/activity-windows.ts`, com os três limiares e
uma função pura que transforma um `Date` nos quatro intervalos. É o "único lugar" que a spec pede, e é
testável sem Firestore.

Mapper: nenhum. `UserRepository` não tem mapper hoje (`super(db, "user")`, `:13`) e o agregado devolve
números, não documento.

#### 4.4 Erros

| `error.code` | status | quando |
|--------------|--------|--------|
| `SUMMARY_INDEX_MISSING` | 503 | `isMissingIndexError(error)` verdadeiro, ou seja, índice composto não publicado |
| `AUTH_INVALID_TOKEN` | 401 | herdado do guard (`admin.ts:36-43`) |
| `ADMIN_FORBIDDEN` | 403 | herdado do guard (`admin.ts:47-54`) |

**Nenhum código novo, e portanto nenhuma entrada nova em `apiErrors`.** `SUMMARY_INDEX_MISSING` já existe
nos três idiomas (`translations/packages/shared/utils.ts:83`, `:164`, `:252`) e já é compartilhado por
duas rotas: `users/summary/route.ts:14` e `entities/summary/route.ts:16`. A mensagem em pt-br, "O resumo
está indisponível no momento. Tente de novo em instantes.", descreve o caso sem ajuste.

Contrato de resposta: `{ data: UserActivitySummaryDTO }` com 200.

---

### 5. Front-end (`apps/app`)

#### 5.1 Rotas e renderização

Nenhuma rota nova. A mudança é toda dentro de
`app/[locale]/(authenticated)/(admin)/admin/(pages)/`.

`page.tsx` já faz prefetch RSC de `queryKeys.users.summary()` dentro de
`if (!(await isImpersonating()))`. O segundo prefetch entra no mesmo bloco, em paralelo com o primeiro.
`prefetchQuery` não propaga erro, então um índice ausente deixa o cache vazio e o cliente refaz a busca e
recebe o 503, que é o caminho desejado.

Nada em `paths.ts`, `routes.tsx` ou `sidebar.tsx`.

#### 5.2 Dados

Chave nova em `apps/app/shared/lib/queryKeys.ts`, no grupo `users` (`:36-44`), ao lado de `summary()`
(`:42`):

```ts
activitySummary: () => [...queryKeys.users.all, "activitySummary"] as const,
```

Hook `useUserActivitySummary` em `(pages)/(hooks)/useUserActivitySummary.tsx`, cópia estrutural de
`useUserSummary.tsx` (função imperativa `fetchUserActivitySummary` no mesmo arquivo, `useAuthorizedQuery`,
mesmo formato de retorno).

Nenhuma mutation. Nenhum `invalidateQueries`.

#### 5.3 Componentes

O bloco de atividade é um componente próprio, não mais código dentro do `AdminHomeClient`. Assim o erro do
agregado de atividade fica contido nele e os três cartões antigos continuam na tela.

`UserRecencyChart` entra por `next/dynamic` com `ssr: false` e `Skeleton` de fallback, como
`CommonHomeClient.tsx:36-44` faz com `EntityTypeChart`. Sem isso, `recharts` cairia inteiro no chunk da
home do admin, que hoje não o importa.

Cartões via `MetricCard` (`shared/components/ui/MetricCard.tsx:11-17`), com `hint` preenchido — a spec põe
a definição no corte, e `hint` é onde ela cabe.

Erro via `handleClientError(new FormattedError(error, locale))` + `LoadErrorState`, como
`AdminHomeClient.tsx:24-26,72-74`.

#### 5.4 O estado de estreia

Numa base que já existia antes da PR #21, quase todo perfil cai no balde `never`. O gráfico mostra isso
por construção: uma barra "Nunca" enorme e quatro pequenas. Abaixo do gráfico entra uma linha de
orientação quando `byRecency.never > 0`, dizendo quantos perfis ainda não têm registro e que o registro
começa no próximo acesso de cada pessoa.

**O estado "nenhum acesso registrado" é inalcançável, e o plano não conta com ele.** `requireAdminApi`
chama `recordUserActivity(profile)` na linha `admin.ts:73`, antes do handler. O admin que abre a home
carimba a si mesmo antes de a agregação rodar, então `active >= 1` sempre. Um estado vazio condicionado a
"soma dos baldes igual a zero" nunca apareceria. A orientação fica pendurada em `never > 0`, que é a
condição que de fato ocorre.

#### 5.5 i18n e a11y

Chaves novas sob `apps.app.pages.admin.home.activity`, nos três idiomas, em
`packages/internationalization/translations/apps/app/pages/admin/home.ts`. Árvore completa no blueprint.

Os números 7, 30 e 15 vêm do DTO e entram nas strings por placeholder `{days}` / `{minutes}`, resolvido no
componente com `String.replace`. O padrão de placeholder `{chave}` já existe no dictionary
(`translations/packages/email/index.ts:13`). O helper `interpolate`
(`packages/email/interpolate.ts:4`) não serve aqui: importar `@repo/email` na `apps/app` arrastaria React
Email para o bundle do painel.

Rótulos do eixo X curtos, porque `CategoryBarChart` renderiza um tick por categoria sem rotação nem
`interval` (`category-bar-chart.tsx:48-56`) e são cinco categorias contra 375 px de largura. Sugestão
pt-br: "Até 7d", "8 a 30d", "31 a 90d", "+90d", "Nunca". O texto longo fica na `CardDescription`.

`CategoryBarChart` já recebe `aria-label` e `role="img"` (`:41-44`) pela prop `label`.

---

### 6. Autorização e segurança

- Guard `requireAdminApi` na rota, espelhando a restrição da área. A UI não é a única proteção.
- Camadas atravessadas: `apps/app/proxy.ts` (sessão) → `requireSession` → `requireAdmin` → guard da API.
- **Impersonação.** Um admin personificando um usuário comum não navega para `/admin`, e o prefetch RSC
  já está atrás de `if (!(await isImpersonating()))` (`page.tsx`). O agregado não tem `subjectProfile` e
  não é sensível ao sujeito personificado: ele conta a base inteira, o que é o comportamento certo para
  uma tela de admin.
- **Nenhum id vem do cliente.** A rota não aceita parâmetro.
- **PII.** O agregado devolve só contagens e limiares. Nenhum e-mail, nome, id ou instante individual
  atravessa a rede. Isso é mais estrito que a listagem de usuários, que já expõe o instante por pessoa
  (`UsersListClient.tsx:127`).
- Rate limit (Arcjet): sem ajuste. A rota é `GET` autenticado, no mesmo perfil de `users/summary`.

---

### 7. Testes (Vitest)

Nível mais barato que prova cada comportamento. Nenhum exige processo externo.

| arquivo | nível | o que prova |
|---------|-------|-------------|
| `apps/api/__tests__/activityWindows.test.ts` | unit puro | os quatro intervalos a partir de um `Date` fixo: limites fechados/abertos, ausência de buraco e de sobreposição entre baldes, piso em `new Date(0)` no balde mais antigo |
| `apps/api/__tests__/userActivitySummaryRepository.test.ts` | unit com Firestore falso | as cinco consultas montadas, no molde de `userRepositoryList.test.ts:11` (`vi.mock` de `@/(shared)/infra/database`): que `never` é derivado e clampado em 0, e que nenhuma leitura de documento acontece |
| `apps/api/__tests__/usersActivitySummaryRoute.test.ts` | rota | molde de `usersSummaryRoute.test.ts:16-27`: `vi.mock` de `resolveApiActor` e do repositório, guard real. Casos: admin recebe 200 com o DTO; não admin recebe 403 `ADMIN_FORBIDDEN`; sem token recebe 401; repositório lançando erro de índice recebe 503 `SUMMARY_INDEX_MISSING` |
| `apps/api/__tests__/firestoreIndexes.test.ts` | unit sobre arquivo | caso novo declarando o índice `user` + `deletedAt` + `lastAccessAt`. Pega a entrada apagada, não o índice não publicado, como o próprio arquivo avisa (`:22-25`) |
| `apps/app/__tests__/userActivitySection.test.tsx` | componente | molde de `adminHomeClient.test.tsx:20-27`: skeleton enquanto carrega; os dois cartões com valor e `hint` interpolado com 7/30/15; `LoadErrorState` com a mensagem traduzida de `SUMMARY_INDEX_MISSING`; a linha de orientação aparece com `never > 0` e some com `never === 0` |

Paridade de i18n: coberta automaticamente por
`packages/internationalization/__tests__/parity.test.ts`, sem teste novo.

**Nenhum teste contra emulador.** O objeto do teste aqui é a montagem da consulta e a derivação, não a
infra. O emulador serve consulta indexada ou não (`docs/PRE-PRODUCTION.md:169`), então subir ele não
provaria a única coisa que um teste de infra acrescentaria.

---

### 8. O que o `/test` vai ter de percorrer

Encomenda para o `analista-qa`. Executar com `agent-browser`, uma vez.

**Fluxo 1 — home do admin com dado.** Entrar como admin, abrir `/pt-br/admin`. Esperado: os três cartões
antigos intactos, mais o bloco de atividade com dois cartões e o gráfico de cinco barras. Conferir que o
`hint` de cada cartão traz os números 7, 30 e 15.

**Como produzir o estado:** `pnpm emulators` + `pnpm seed`, depois autenticar com duas ou três contas
distintas para gerar carimbos recentes.

**Fluxo 2 — estado de estreia.** Semear usuários com `pnpm seed` e **não** autenticar com eles. Esperado:
barra "Nunca" dominando o gráfico, cartão de ativos com 1 (o próprio admin, carimbado pelo guard) e a
linha de orientação abaixo do gráfico com a contagem correta. É o cenário que todo fork com base existente
vai ver no primeiro deploy.

**Fluxo 3 — degradação por índice ausente.** 🔒 **Não observável localmente.** O emulador serve a consulta
com ou sem índice, e não há projeto real disponível. A cobertura é o teste de rota (503 com
`SUMMARY_INDEX_MISSING`) mais o teste de componente (mensagem traduzida). Marcar como bloqueado por infra,
não reprovar. Conferir apenas que os três cartões antigos continuam renderizando quando só o bloco de
atividade mostra erro: isso o `/test` consegue observar forçando a falha do hook.

**Fluxo 4 — a home comum não regrediu.** Abrir `/pt-br` como usuário comum e conferir que
`CommonHomeClient` está igual. O diff toca `queryKeys.ts`, que as duas homes compartilham.

**Fluxo 5 — impersonação.** Admin personificando um comum não alcança `/admin`. Conferir que a troca de
contexto não deixa dado do agregado em cache (o `resetQueries()` na troca de sujeito já cobre, mas o
`queryKey` novo precisa cair sob o prefixo `users`, e cai).

**Combinações obrigatórias:** light + dark + mobile (375 px), nos três idiomas.

Dois pontos de atenção específicos do diff:

1. No tema escuro os tokens `--chart-1..5` trocam de valor (`globals.css:30-34` contra `:69-73`). As cinco
   barras precisam continuar distinguíveis nos dois temas.
2. Em 375 px, os cinco rótulos do eixo X não podem se sobrepor nem ser cortados. É a razão dos rótulos
   curtos, e é o único item do plano que só uma passada visual confirma.

---

### 9. Critérios de aceite

Gerados pelo `/test` no formato §9.1. Os casos que o plano encomenda: autorização (comum, admin, admin
personificando, não autenticado), base sem nenhum carimbo, base só com carimbos antigos, `never > 0` e
`never === 0`, índice ausente, duplo clique no botão de recarregar quando houver, e os três idiomas com
tema claro e escuro.

---

## Etapa 2 — Blueprint técnico

### 10.1 Contrato do SDK

`packages/sdk/src/types/user/user.ts`, depois do `UserSummaryDTO` (`:52`):

```ts
export type UserActivityBucket =
    | "last7Days"
    | "from8To30Days"
    | "from31To90Days"
    | "over90Days"
    | "never";

/**
 * Counted from `lastAccessAt`, which the API stamps once per activity window. Every number
 * here trails real use by up to `thresholds.precisionMinutes`. Profiles never stamped carry
 * no field at all and land in the `never` bucket, which is derived from the total instead of
 * queried.
 */
export type UserActivitySummaryDTO = {
    active: number;
    inactive: number;
    byRecency: Record<UserActivityBucket, number>;
    thresholds: {
        activeDays: number;
        inactiveDays: number;
        precisionMinutes: number;
    };
};
```

Action, em `packages/sdk/src/actions/user/user/action.ts`:

```ts
async activitySummary(): Promise<UserActivitySummaryDTO> {
    const { data } = await this.client.request<Response<UserActivitySummaryDTO>>({
        url: "/users/activity-summary",
        method: "GET",
    });

    return data.data;
}
```

Sem mudança em `packages/sdk/src/client/index.ts`: `UserActions` já está registrada (`:26`).

### 10.2 Janelas — `apps/api/(shared)/lib/activity-windows.ts`

```ts
const DAY_MS = 86_400_000;

export const ACTIVE_WINDOW_DAYS = 7;
export const INACTIVE_AFTER_DAYS = 30;
const STALE_WINDOW_DAYS = 90;

/** Lower bound of the oldest bucket. A timestamp floor keeps `null` out of the range. */
const TIMESTAMP_FLOOR = new Date(0);

export type ActivityRange = { from: Date; to: Date | null };

export function buildActivityRecencyRanges(now: Date): {
    last7Days: ActivityRange;
    from8To30Days: ActivityRange;
    from31To90Days: ActivityRange;
    over90Days: ActivityRange;
} {
    const at = (days: number) => new Date(now.getTime() - days * DAY_MS);

    return {
        last7Days: { from: at(ACTIVE_WINDOW_DAYS), to: null },
        from8To30Days: { from: at(INACTIVE_AFTER_DAYS), to: at(ACTIVE_WINDOW_DAYS) },
        from31To90Days: { from: at(STALE_WINDOW_DAYS), to: at(INACTIVE_AFTER_DAYS) },
        over90Days: { from: TIMESTAMP_FLOOR, to: at(STALE_WINDOW_DAYS) },
    };
}
```

### 10.3 Repositório

`apps/api/(shared)/repositories/user.repository.ts`, abaixo de `summary()` (`:74`):

```ts
async activitySummary(now = new Date()): Promise<UserActivitySummaryDTO> {
    const scoped = () =>
        this.db.collection(this.table).where("deletedAt", "==", null);

    const ranges = buildActivityRecencyRanges(now);
    const inRange = ({ from, to }: ActivityRange) => {
        const lower = scoped().where("lastAccessAt", ">=", from);
        return to ? lower.where("lastAccessAt", "<", to) : lower;
    };

    const [total, last7Days, from8To30Days, from31To90Days, over90Days] =
        await Promise.all([
            this.countQuery(scoped()),
            this.countQuery(inRange(ranges.last7Days)),
            this.countQuery(inRange(ranges.from8To30Days)),
            this.countQuery(inRange(ranges.from31To90Days)),
            this.countQuery(inRange(ranges.over90Days)),
        ]);

    const stamped = last7Days + from8To30Days + from31To90Days + over90Days;

    return {
        active: last7Days,
        inactive: from31To90Days + over90Days,
        byRecency: {
            last7Days,
            from8To30Days,
            from31To90Days,
            over90Days,
            // The counts are not transactional: a profile created between the total and the
            // bucket queries would otherwise drive this below zero.
            never: Math.max(0, total - stamped),
        },
        thresholds: {
            activeDays: ACTIVE_WINDOW_DAYS,
            inactiveDays: INACTIVE_AFTER_DAYS,
            precisionMinutes: ACTIVITY_WINDOW_MINUTES,
        },
    };
}
```

### 10.4 Rota

`apps/api/app/(routes)/users/activity-summary/route.ts`, cópia estrutural de `users/summary/route.ts`:

```ts
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { isMissingIndexError } from "@/(shared)/lib/pagination";
import { userRepository } from "@/(shared)/repositories/user.repository";
import { requireAdminApi } from "@/app/(guards)/admin";

export const GET = requireAdminApi(async () => {
    try {
        const summary = await userRepository.activitySummary();

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

Resposta de exemplo, 200:

```json
{
  "data": {
    "active": 12,
    "inactive": 41,
    "byRecency": {
      "last7Days": 12,
      "from8To30Days": 7,
      "from31To90Days": 23,
      "over90Days": 18,
      "never": 940
    },
    "thresholds": { "activeDays": 7, "inactiveDays": 30, "precisionMinutes": 15 }
  }
}
```

Resposta de exemplo, 503:

```json
{ "error": { "code": "SUMMARY_INDEX_MISSING" } }
```

| `error.code` | status |
|--------------|--------|
| `SUMMARY_INDEX_MISSING` | 503 |
| `ADMIN_FORBIDDEN` | 403 |
| `AUTH_INVALID_TOKEN` | 401 |

### 10.5 Índice

`firestore.indexes.json` passa de 6 para 7 entradas. A nova, na coleção `user`:

```json
{
  "collectionGroup": "user",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "deletedAt", "order": "ASCENDING" },
    { "fieldPath": "lastAccessAt", "order": "ASCENDING" }
  ]
}
```

### 10.6 Árvore de arquivos do front

```
apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/
  page.tsx                                   (editar: segundo prefetch)
  (hooks)/useUserActivitySummary.tsx         (novo)
  (components)/AdminHomeClient.tsx           (editar: renderiza a secção)
  (components)/UserActivitySection.tsx       (novo, "use client")
  (components)/UserRecencyChart.tsx          (novo, "use client", dynamic)
apps/app/shared/lib/queryKeys.ts             (editar: activitySummary)
```

Não há formulário nesta tarefa, então não há campo `HookForm*` a listar.

### 10.7 Chaves de i18n

Em `packages/internationalization/translations/apps/app/pages/admin/home.ts`, dentro de cada um dos três
idiomas, ao lado de `metrics` (`:5`):

```
activity
  title
  description
  metrics
    active     { label, hint }     hint usa {days} e {minutes}
    inactive   { label, hint }     hint usa {days}
  chart
    title
    description
  buckets
    last7Days
    from8To30Days
    from31To90Days
    over90Days
    never
  neverNotice                      usa {count}
```

Valores propostos para pt-br (en e es na mesma estrutura, escritos pelo `/develop` com a skill
`/i18n-sync`):

```ts
activity: {
    title: "Atividade",
    description: "Quem acessou o painel e há quanto tempo.",
    metrics: {
        active: {
            label: "Ativos",
            hint: "Acessaram nos últimos {days} dias. O registro tem precisão de {minutes} minutos.",
        },
        inactive: {
            label: "Inativos",
            hint: "Sem acesso há mais de {days} dias. Não inclui quem nunca acessou.",
        },
    },
    chart: {
        title: "Último acesso por faixa",
        description: "Cada perfil aparece em uma faixa só, a do acesso mais recente dele.",
    },
    buckets: {
        last7Days: "Até 7d",
        from8To30Days: "8 a 30d",
        from31To90Days: "31 a 90d",
        over90Days: "+90d",
        never: "Nunca",
    },
    neverNotice:
        "{count} perfis ainda não têm registro de acesso. O registro de cada pessoa começa no próximo acesso dela.",
},
```

Nada a acrescentar em `apiErrors`.

### 10.8 Pseudo-diffs dos arquivos existentes

`apps/app/shared/lib/queryKeys.ts`, no grupo `users` (`:42`):

```diff
         summary: () => [...queryKeys.users.all, "summary"] as const,
+        activitySummary: () =>
+            [...queryKeys.users.all, "activitySummary"] as const,
         detail: (id: string) => [...queryKeys.users.all, "detail", id] as const,
```

`(pages)/page.tsx`, dentro do `if (!(await isImpersonating()))`:

```diff
         if (client) {
-            await queryClient.prefetchQuery({
-                queryKey: queryKeys.users.summary(),
-                queryFn: () => client.user.summary(),
-            });
+            await Promise.all([
+                queryClient.prefetchQuery({
+                    queryKey: queryKeys.users.summary(),
+                    queryFn: () => client.user.summary(),
+                }),
+                queryClient.prefetchQuery({
+                    queryKey: queryKeys.users.activitySummary(),
+                    queryFn: () => client.user.activitySummary(),
+                }),
+            ]);
         }
```

`(components)/AdminHomeClient.tsx`, depois da grade de cartões (`:87`):

```diff
                     )}
+                    <UserActivitySection />
                 </div>
```

O `summaryLoadError` existente continua envolvendo só os três cartões antigos. A secção nova trata o
próprio erro, que é o que mantém metade da tela viva quando só o agregado de atividade cai.

`apps/api/(shared)/repositories/user.repository.ts`: acrescenta o import das janelas e de
`ACTIVITY_WINDOW_MINUTES`, mais o método de 10.3. Nada existente muda.

### 10.9 Ordem de implementação e commits

| # | escopo | conteúdo | mensagem |
|---|--------|----------|----------|
| 1 | `packages/sdk` | `UserActivitySummaryDTO`, `UserActivityBucket`, action | `feat(sdk): user activity summary contract` |
| 2 | `apps/api` | `activity-windows.ts`, `activitySummary()`, rota, `firestore.indexes.json`, testes de janela, repositório, rota e índice | `feat(api): aggregate user activity by recency` |
| 3 | `apps/app` | `queryKeys`, hook, `UserActivitySection`, `UserRecencyChart`, prefetch, teste de componente | `feat(app): activity metrics on the admin home` |
| 4 | `packages/internationalization` | chaves nos 3 idiomas | `feat(internationalization): admin home activity copy` |
| 5 | `docs` | secção §1.7 em `PRE-PRODUCTION.md` | `docs: register the user activity composite index` |
| 6 | `docs/features` | artefatos do fluxo | `docs(features): admin-analytics-dashboard` |

Quem cria a branch e propõe os commits é o `/review`.

### 10.10 Env e config

Nenhuma variável nova, em nenhum app.

---

## Custo da agregação

Número pedido explicitamente, porque "abrir a home não dispara leitura da coleção inteira" é sinal de
pronto na spec.

| rota | agregações | leituras de documento |
|------|-----------|------------------------|
| `GET /users/summary` (já existe) | 3 | 0 |
| `GET /users/activity-summary` (nova) | 5 | 0 |
| **total por abertura da home** | **8** | **0** |

São dois requests HTTP, um por hook, e dentro de cada rota as contagens rodam em `Promise.all`.

**Como o Firestore cobra.** `countQuery` usa `query.count().get()` (`base.repository.ts:122-124`), que é
faturado por entrada de índice varrida, não por documento, na proporção de uma leitura a cada 1000
entradas, com piso de uma leitura por consulta. Numa base abaixo de 1000 perfis, abrir a home custa **8
leituras**. Numa base de N perfis, o teto é aproximadamente `8 + 2N/1000`: a consulta de total varre N
entradas e os quatro baldes somados varrem no máximo N.

**Por que não 12 agregações.** A spec sugeria como exemplo uma granularidade semanal ao longo de 12
semanas. Ver a decisão 2 em "Perguntas em aberto": cinco faixas custam 4 consultas de intervalo em vez de
12, e é o que o componente de barras comporta.

---

## Pré-requisitos manuais de infra

Isto não é código. Nenhum gate local pega a falta, e o `/test` não deve reprovar por causa dela.

### Índice composto de `user` por instante de acesso

| coleção | campos | serve |
|---------|--------|-------|
| `user` | `deletedAt` + `lastAccessAt` | as quatro contagens por faixa de recência de `GET /users/activity-summary` |

```bash
npx -y firebase-tools@latest deploy --only firestore:indexes
```

**A fila de índices versionados e não publicados tem hoje 6 entradas, não 5.** Recontado em 2026-09-19
contra `firestore.indexes.json`, que declara exatamente 6, e contra `docs/PRE-PRODUCTION.md`: §1.1 (1),
§1.2 (1), §1.5 (3) e §1.6 (1). A spec cita cinco porque foi escrita com a contagem anterior à inclusão de
§1.6, em 2026-09-17. Este é o **sétimo**, e abre uma secção §1.7 nova.

**Comportamento sem o índice publicado:** `GET /users/activity-summary` responde
`503 SUMMARY_INDEX_MISSING`. O bloco de atividade da home mostra a mensagem traduzida; os três cartões
antigos, a saudação e a navegação continuam funcionando. Nenhuma resposta é 500.

**Por que nenhum gate pega:** o emulador serve a consulta com ou sem índice
(`docs/PRE-PRODUCTION.md:169`), e `apps/api/__tests__/firestoreIndexes.test.ts` lê o arquivo versionado,
o que pega a entrada apagada e não a não publicada.

**Para conferir depois de publicar:** `npx -y firebase-tools@latest firestore:indexes` lista a entrada de
`user` com `lastAccessAt`; na tela, os dois cartões e o gráfico mostram números em vez do alerta.

---

## Perguntas em aberto

Rodada autônoma. Decidi cada item e implementei a decisão no plano.

**1. Definição de ativo e de inativo.** Adotada a recomendação da spec: ativo = acessou nos últimos 7
dias; inativo = sem acesso há mais de 30. Os dois números ficam em `activity-windows.ts`, entram no DTO e
aparecem no `hint` de cada cartão junto da precisão de 15 minutos. Quem nunca acessou **não** entra em
"inativos": sem consultar `createdAt` não dá para saber se a conta tem mais de 30 dias, e chamar de
inativo alguém cadastrado ontem seria errado. O `hint` do cartão diz isso.

**2. Granularidade do gráfico.** A recomendação da spec tem duas partes. O princípio, "a mais grossa que
responde a pergunta", foi adotado. O exemplo, "semanal ao longo de 12 semanas", não foi, por dois motivos
que valem registro.

O primeiro é o dado: `lastAccessAt` é um instante que se sobrescreve, não uma série
(`user-activity-tracking/spec.md:106-107`). Alguém que acessa toda semana aparece numa faixa só, a mais
recente. Um gráfico rotulado "acessos por semana" sobre esse campo mostraria a distribuição de último
acesso com o nome errado. O que o dado sustenta é histograma de recência, e é isso que o plano entrega,
com o título e a descrição dizendo isso.

O segundo é o componente: `CategoryBarChart` desenha um tick por categoria, sem rotação e sem `interval`
(`category-bar-chart.tsx:48-56`). Doze rótulos em 375 px se sobrepõem.

Alternativa descartada: doze faixas semanais de recência, que seriam legítimas como dado, custariam 12
agregações em vez de 4 e pediriam um componente de série temporal novo, que a spec põe fora do corte.

**3. Rota vizinha ou mesmo agregado.** Adotada a recomendação da spec: rota vizinha,
`GET /users/activity-summary`. A alternativa, estender `UserSummaryDTO`, foi descartada porque faria os
três cartões de contagem degradarem junto quando só a consulta que depende de índice falhasse.

**4. Item c, visitas à `apps/web`.** Adotada a recomendação da spec: fora deste corte. Não está no plano e
nenhum arquivo da `apps/web` é tocado.

**5. Código de erro da degradação: reusar `SUMMARY_INDEX_MISSING` ou criar um próprio?**
A spec não decide. Adotei o reuso, pelo menor raio de impacto: a semântica é idêntica (agregado recusado
por índice ausente), o código já é compartilhado por duas rotas (`users/summary/route.ts:14`,
`entities/summary/route.ts:16`), a mensagem existente descreve o caso, e não entra chave nova em
`apiErrors`. Alternativa descartada: `ACTIVITY_SUMMARY_INDEX_MISSING`, que distinguiria os dois agregados
no log mas custaria três traduções novas sem mudar nada para quem lê a tela, já que os dois blocos
mostram erros separados de qualquer jeito.

**6. O total do agregado de atividade vai para o DTO?**
Não decidido pela spec. Adotei não expor: os dois totais viriam de requests distintos, e numa base ativa
poderiam divergir em um ou dois registros na mesma tela sem que nenhum estivesse errado. O total é usado
dentro do repositório para derivar `never` e para por ali. Alternativa descartada: publicar
`total` no DTO novo, que daria ao cliente a liberdade de recalcular as faixas e abriria a porta para dois
números diferentes com o mesmo rótulo.

---

## Riscos que o plano encontrou e a spec não registrava

1. **O campo não é série temporal.** Está detalhado na decisão 2. É o risco mais caro do conjunto, porque
   um gráfico com o rótulo errado é pior do que nenhum gráfico.
2. **O admin que abre a home se carimba antes de a agregação rodar** (`admin.ts:73`). "Zero acessos
   registrados" é um estado inalcançável, e `active` nunca é 0 numa home aberta por alguém. A orientação
   de estreia fica pendurada em `never > 0`.
3. **Filtro de desigualdade e `null`.** O balde mais antigo precisa de piso em `new Date(0)`, porque
   `null` ordena antes de `Timestamp` no Firestore e o `UserDTO` permite `lastAccessAt: null`
   (`user.ts:27`).
4. **Documento sem o campo sai de todos os baldes**, então `never` só pode ser derivado. E a derivação
   pode dar negativo, porque as cinco contagens não são transacionais. Daí o clamp.
5. **A fila de índices tem 6, não 5.** A spec herdou a contagem anterior a §1.6.
6. **Bundle da home do admin.** A tela não importa `recharts` hoje. Sem o `next/dynamic` de
   `CommonHomeClient.tsx:36-44`, a biblioteca cairia inteira no chunk da primeira tela que um admin abre.
7. **Contenção em `packages/sdk/src/types/user/user.ts`**, disputado com `billing-subscription` e
   `onboarding-flow`, que também acrescentam campo ao `UserDTO`
   (`user-activity-tracking/spec.md:154-156`). Esta tarefa só acrescenta tipos novos ao final do arquivo,
   sem tocar no `UserDTO`, o que reduz a chance de conflito a um conflito de contexto.
