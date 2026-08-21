# Guia de análise e entrega de tarefas

Roteiro de **tech lead** para analisar, planejar e revisar uma tarefa neste boilerplate. É o checklist
que o `planejador-tarefa` (`/analyze`) preenche e que o `analista-qa` (`/test`) usa para derivar critérios
de aceite.

> **Como usar**
>
> - Marque itens não aplicáveis como `N/A` — a maioria das tarefas usa uma fração do guia.
> - **Toda afirmação precisa de evidência no código** (cite `arquivo.ts:linha`). Antes de propor
>   estrutura nova, procure o helper/padrão que já existe.
> - O recurso **`entity`** é o slice de referência de ponta a ponta — leia-o antes de desenhar qualquer
>   coisa nova (caminhos na seção 0).
> - A saída de cada etapa é **Markdown estruturado** (tabelas, listas, títulos), salvo em
>   `docs/features/<slug>/` — ver [`TASK-PIPELINE.md`](TASK-PIPELINE.md).

---

## 0. Onde olhar primeiro (slice de referência `entity`)

| Camada | Caminho |
|--------|---------|
| Tipos/contrato | `packages/sdk/src/types/entity/entity.ts` |
| Action do SDK | `packages/sdk/src/actions/entity/action.ts` (registrada em `packages/sdk/src/client/index.ts`) |
| Rota da API | `apps/api/app/(routes)/entities/route.ts` + `entities/[id]/route.ts` |
| Guard | `apps/api/app/(guards)/common-panel.ts` (`requireCommonPanelApi`) |
| Validação | `apps/api/(shared)/validation/entity.schema.ts` |
| Repositório | `apps/api/(shared)/repositories/entity.repository.ts` (+ `base.repository.ts`) |
| Mapper | `apps/api/(shared)/mappers/entity.mapper.ts` |
| UI + hooks | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/` |
| i18n | `packages/internationalization/translations/apps/app/pages/common/entities.ts` |
| Testes | `apps/app/__tests__/entityFormSchema.test.ts`, `apps/app/__tests__/useEntityCrud.test.tsx` |

Regras por escopo (auto-carregadas): `apps/api/CLAUDE.md`, `apps/app/CLAUDE.md`, `apps/web/CLAUDE.md`,
`packages/CLAUDE.md`. Convenções detalhadas (design system/RHF): [`AGENTS.md`](../AGENTS.md).

---

## 1. Contexto da tarefa

- [ ] Resumo objetivo da feature/tarefa em uma frase.
- [ ] Objetivos explícitos e o que **não** está no escopo.
- [ ] **Corte de MVP**: qual é a menor fatia vertical que entrega valor observável? O que fica para
      depois? (Este repo existe para gerar MVPs — resista a construir o caso geral.)
- [ ] Apps impactados: `apps/app` (painel) · `apps/web` (landing) · `apps/api` · `packages/*`.
- [ ] **Área do painel**: comum (`(common)`), admin (`(admin)/admin`) ou ambas? Muda o guard e o layout.
- [ ] **Modo de produto**: o comportamento difere entre `NEXT_PUBLIC_PRODUCT_MODE=subscription` e
      `simple`? (No `simple`, o usuário comum opera na `apps/web` e o painel é admin-only — ver
      [`AUTH-SSO.md`](AUTH-SSO.md).)
- [ ] Depende de assinatura/plano ativo? Ver [`PAYMENTS.md`](PAYMENTS.md).
- [ ] Dependências externas (Firebase, Stripe, Resend, Arcjet) e vars de env novas.
- [ ] É **genérico** (cabe em `packages/*`) ou **específico do produto** (fica em `apps/*`)? A regra
      mestra do repo é *genérico no pacote, específico no app*.

### 1.1 Fontes, links e anexos

- [ ] A tarefa aponta para doc/wiki, Figma, print, PR ou planilha? **Siga e leia todo link acessível**
      antes de analisar — costuma ser a fonte real de requisitos.
- [ ] Prints/imagens definem **quais informações aparecem e onde** (layout/posições), **não** o tema
      visual (o tema vem dos tokens do design system).
- [ ] Links inacessíveis (Figma com senha, auth) → registre como **"referência não lida"** e peça
      export/print; nunca infira o conteúdo.
- [ ] Em épicos, leia também o material que cobre o **épico inteiro**, não só a subtarefa.

---

## 2. Dados (Firestore)

Não há migrations nem schema declarado: a "modelagem" é o **DTO do SDK** + o que o mapper normaliza.
Mudança de forma de documento é retrocompatível por natureza — o risco está nos documentos **antigos**.

### 2.1 Coleção e documento

- [ ] Coleção nova ou existente? Nome no **singular** (`"entity"`, `"user"`), embora a rota seja plural.
- [ ] Para cada campo novo: nome (dê **≥2 opções** quando não for óbvio), tipo, valor default,
      `null` permitido? e a justificativa.
- [ ] **Escopo/ownership**: o documento carrega `userId` (ou equivalente) para o filtro por dono?
      Toda leitura de recurso do usuário comum filtra por `ctx.subjectProfile.id`.
- [ ] Campos herdados do `BaseRepository`: `createdAt`, `updatedAt`, `deletedAt` são estampados
      automaticamente no `create` — **não** os declare no `CreateRequest`.
- [ ] **Soft delete** é o padrão (`deletedAt`); `delete()` do `BaseRepository` nunca remove de fato.

### 2.2 Consultas

- [ ] Que consultas a feature exige (filtro, ordenação, busca, paginação)?
- [ ] ⚠️ O `BaseRepository` **não tem paginação, `orderBy` nem filtros compostos**. Filtro/ordenação
      hoje é feito **em memória** no método do repositório (ex.: `entityRepository.listByUserId` filtra
      `deletedAt` e ordena por `createdAt` em memória). Se o volume esperado torna isso inviável,
      isso é uma **decisão de arquitetura a registrar** (índice composto + `query`/`limit`/`startAfter`),
      não algo a improvisar no handler.
- [ ] Consulta nova precisa de **índice composto** no Firestore? (`where` + `orderBy` em campos
      diferentes exige.) Registre o índice a criar.
- [ ] Regras de segurança do Firestore precisam mudar? Ver [`SECURITY.md`](SECURITY.md).

### 2.3 Dados existentes

- [ ] Documentos já gravados ficam válidos com o campo novo ausente? O mapper trata a ausência
      (`?? null`, `?? true`, `stringIfExists`)?
- [ ] Precisa de script de backfill? Quem roda, quando, e é idempotente?
- [ ] **Tarefa de "ajustar algo que já existe"**: mapeie **cada campo/elemento exigido à sua origem de
      dado real** — já existe no DTO? precisa de campo novo? precisa de tela de configuração/upload que
      ainda não existe? Nunca conclua "é só refatorar" sem checar a infraestrutura de suporte.

---

## 3. Contrato — `@repo/sdk`

O SDK é a **única porta** do front para a API; o tipo dele é o contrato. Sempre comece por aqui.

- [ ] `DTO` novo/alterado em `packages/sdk/src/types/<recurso>/`: campos, `createdAt/updatedAt: string`
      (ISO), `deletedAt: string | null`.
- [ ] `CreateXRequest` / `UpdateXRequest` — o que é obrigatório em cada um.
- [ ] Action em `packages/sdk/src/actions/<recurso>/action.ts`: métodos, path, retorno
      (`list` → `DTO[]`, `findById` → `DTO`, `create` → `DTO`, `update` → `{ id }`, `delete` → `void`).
- [ ] Registrada no `Client` (`packages/sdk/src/client/index.ts`) e o **contexto** correto
      (`common` | `admin`).
- [ ] Mudança de contrato **quebra** consumidor existente (`apps/app`, `apps/web`)? Liste os usos
      (`rg` pelo nome do tipo/método) e o plano de atualização — a ordem de commit é
      SDK → API → app.

---

## 4. API (`apps/api`)

Uma rota = um arquivo `app/(routes)/<recurso>/route.ts` (e `[id]/route.ts`). Handler é
**`export const GET = guard(async (req, ctx) => …)`**, nunca `export async function GET`.

### 4.1 Rota e guard

- [ ] Método(s) e path (sem prefixo `/api` — os grupos `(routes)`/`(guards)` não entram na URL).
- [ ] **Guard**: `requireCommonPanelApi` (usuário comum; expõe `ctx.subjectProfile`, ciente de
      impersonação) ou `requireAdminApi` (só admin; **não** tem `subjectProfile`).
- [ ] Rota `[id]`: genérico do guard (`requireCommonPanelApi<RouteIdParamsContext>`) +
      `resolveIdFromContext(ctx)`.
- [ ] **Ownership**: recurso do usuário comum precisa de
      `if (!row || row.userId !== ctx.subjectProfile.id) → 404` **em todos** os handlers que tocam o id
      (404, não 403 — não vaze existência).
- [ ] Header customizado novo? Então adicione em `allowHeaders` do CORS em `apps/api/proxy.ts`.

### 4.2 Validação na borda (Zod)

- [ ] Schema em `apps/api/(shared)/validation/<recurso>.schema.ts`; magic numbers extraídos em consts.
- [ ] `parseCreateX` / `parseUpdateX` com a assinatura de união discriminada
      (`{ ok: true; value } | { ok: false; response }`).
- [ ] `updateXSchema` tem `.refine(v => Object.keys(v).length > 0)` (rejeita PATCH vazio).
- [ ] Body lido com `parseRequestJson(req)`; patch montado com `omitUndefined`.
- [ ] Defaults de campo opcional (`?? null`, `?? true`) aplicados **no handler**, não no repositório.

### 4.3 Persistência

- [ ] Repositório estende `BaseRepository<DTO>`; mapper passado como **3º argumento do `super`**
      (`super(db, "entity", entityMapper)`). Recurso simples pode dispensar mapper (`super(db, "user")`).
- [ ] Mapper em `(shared)/mappers/<recurso>.mapper.ts` estendendo `Mapper<Entity, DTO>`:
      `toDTO` normaliza (`normalizeFirestoreInstant` para datas, `stringIfExists` para strings
      opcionais) e `toPersistence` usa **whitelist** de chaves. Exporte **uma instância**
      (`export const entityMapper = new ...`).
- [ ] Normalização vive no mapper, **nunca** no handler.

### 4.4 Erros

- [ ] Toda resposta de erro é `{ error: { code: "SCREAMING_SNAKE" } }` + status de `HTTP_STATUS`.
      Nunca stack trace, nunca mensagem interna como copy.
- [ ] Liste os **códigos novos** e o status de cada um.
- [ ] ⚠️ **Todo código novo exige entrada em `apiErrors` nos 3 idiomas**
      (`packages/internationalization/translations/packages/shared/utils.ts`) — o teste de paridade
      (`packages/internationalization/__tests__/parity.test.ts`) falha sem isso. Use `/i18n-sync`.
- [ ] Contrato de resposta: `list`/`get` → `{ data }` 200 · `create` → `{ data }` 201 ·
      `update` → `{ data: { id } }` 200 · `delete` → sem body, 204.

---

## 5. Front-end (`apps/app` / `apps/web`)

### 5.1 Rotas e renderização

- [ ] Onde a rota entra na árvore `app/[locale]/…` e em qual grupo
      (`(common)/(pages)/…` vs `(admin)/admin/(pages)/…`).
- [ ] **Server Component por padrão**; `"use client"` só com estado/eventos/browser API.
- [ ] Página de lista/detalhe faz **prefetch RSC** (`QueryClient` + `prefetchQuery` +
      `HydrationBoundary`) com a **mesma `queryKey`** do hook client — e envolvido em
      `if (!(await isImpersonating()))`.
- [ ] `loading.tsx` com `TableSkeleton`/`FormSkeleton`.
- [ ] Entradas no `paths.ts` / `routes.tsx` / `sidebar.tsx` do grupo.

### 5.2 Dados

- [ ] Chave em `apps/app/shared/lib/queryKeys.ts` (`all` / `list()` / `detail(id)`).
- [ ] Hook de lista: `useListX` + `fetchXList` **no mesmo arquivo**.
- [ ] Hook por id: `useFindXById` + `findXById` no mesmo arquivo; a função retorna `undefined` quando
      falta o parâmetro e o `useQuery` tem `enabled: Boolean(id)` coerente.
- [ ] Mutations em `useXCrud`: `create`/`update`/`delete` → `invalidateQueries`;
      **toggle de `enabled` → otimista com `setQueryData` (lista + detalhe) e rollback no `onError`,
      sem `invalidateQueries`**.
- [ ] Erro sempre via `handleClientError(new FormattedError(error, locale))` + `errorAlert`.
- [ ] Zero `fetch`/axios cru e zero URL de API hardcoded — só `apiClient`.

### 5.3 Formulários e listas

- [ ] Schema em `(validations)/<recurso>FormSchema.ts` como **factory** `buildXFormSchema(dictionary)`
      (mensagens do Zod vêm do dicionário) + tipo de valores.
- [ ] `useForm` com `zodResolver`, `defaultValues` completo; edição faz `form.reset(...)` quando o dado
      chega.
- [ ] Campos via `HookFormInput/Textarea/Select/Switch/DateInput/RadioGroup` dentro de
      `FormContainer`; `Footer` **dentro** do `<form>`; `Container` com `contentOnly` e `loadError`.
- [ ] Sentinela para "sem valor" em select/radio (padrão `entityGenreUnset = "__none__"`), mapeada para
      `null` na mutation.
- [ ] Lista via `Table` do design system com `searchFields`, `onRefresh`, `refreshLoading`,
      `locale.emptyText`, `rowKey`; coluna `enabled` é um `Switch` controlado; foto via
      `ResponsiveImage`; ações via `ActionsMenu`.
- [ ] Estados: loading inicial (skeleton), submit com `isPending` (bloqueia duplo clique), vazio, erro.

### 5.4 i18n e a11y

- [ ] **Zero string de UI em JSX** — label, placeholder, `aria-label`, toast, título de coluna, texto
      de confirmação, `emptyText`, mensagem de Zod.
- [ ] Chave nova existe nos **3 idiomas** (`pt-br`, `en`, `es`) com a mesma estrutura; use `/i18n-sync`.
- [ ] Variável do dicionário com nome descritivo (`entitiesList`, `entityMessages`) — **nunca** `t`/`d`.
- [ ] Locale via `getDictionary()` (client/server) ou `getDictionaryForLocale(locale)` quando a rota já
      dá o `[locale]`.

---

## 6. Autorização e segurança

- [ ] **Autorização espelhada no servidor.** UI oculta nunca é a única proteção: todo endpoint tem guard
      + checagem de ownership.
- [ ] Camadas server-side envolvidas: `apps/app/proxy.ts` (redirect de sessão) → `requireSession` →
      `requireAdmin` → guard da API. Diga em qual(is) a regra entra.
- [ ] **Impersonação**: a feature funciona quando um admin está personificando um usuário comum? Leituras
      RSC precisam do `isImpersonating()`; troca de usuário faz `window.location.reload()`.
- [ ] Nenhum id vindo do body é confiado sem checar vínculo com o contexto autenticado.
- [ ] Dado sensível (token, segredo, PII) não vaza em DTO, log ou mensagem de erro.
- [ ] Regras do Firestore e rate limit (Arcjet) precisam de ajuste? Ver [`SECURITY.md`](SECURITY.md).

---

## 7. Testes (Vitest)

- [ ] **Unit** do que é lógica pura: schema Zod (`buildXFormSchema` com o dicionário real), mapper,
      helper de derivação.
- [ ] **Hooks** com `renderHook` + `QueryClientProvider`, mockando `@/shared/lib/client`,
      `@repo/design-system/hooks/useAlert` e `@repo/internationalization/client` via
      `vi.hoisted` + `vi.mock`; asserção lendo o cache (`queryClient.getQueryData`).
- [ ] **Rota da API** com `vi.mock` do repositório **e do guard** (substituindo por um passthrough que
      injeta `ctx.subjectProfile`), seguido de `await import(...)` da rota.
- [ ] Cenários: caminho feliz + **cada** caminho de erro (validação, não encontrado, sem permissão,
      ownership de outro usuário).
- [ ] Localização: `apps/<app>/__tests__/<assunto>.test.ts(x)` (pasta plana, não colocado).
- [ ] Use a skill `/write-tests`. Comandos: `pnpm --filter <app> test`, `pnpm test` (todos).

---

## 8. Validação visual (obrigatória em front-end)

Regra de ouro 11 do repo: **front-end não está pronto sem validação visual.**

- [ ] Fluxos a percorrer com a skill `agent-browser` (suba `pnpm --filter app dev` / `--filter web dev`).
- [ ] Conferir em **light + dark + mobile** (o `Table` é antd: cheque que respeita o tema).
- [ ] Screenshots de: estado normal, vazio, erro, formulário inválido, submit em andamento.
- [ ] Rodar os comandos do `agent-browser` **em sequência** (chamadas concorrentes travam o daemon e os
      screenshots saem da aba errada).

---

## 9. Critérios de aceite

Monte um quadro com casos explícitos, cobrindo:

- [ ] Autorização: usuário comum × admin × admin personificando × não autenticado.
- [ ] Ownership: tentar acessar/editar/excluir recurso de **outro** usuário (esperado: 404).
- [ ] Modo de produto (`subscription` × `simple`), quando relevante.
- [ ] Valores-limite: mínimo/máximo de tamanho, `0`, negativo, string vazia, campo só com espaços,
      data inválida, campo opcional ausente × `null` × preenchido.
- [ ] Filtros/busca combinados e resultado vazio; manipulação de URL/query param para acessar dado alheio.
- [ ] Duplo clique / submit repetido / cancelar durante requisição.
- [ ] Comportamento **anterior × posterior** à mudança.
- [ ] Erros esperados com o `error.code` exato e a mensagem traduzida nos 3 idiomas.
- [ ] Tema (light/dark) e responsivo (mobile/desktop).

### 9.1 Formato obrigatório de entrega

Sempre que a IA gerar os critérios de aceite, o output **deve** estar neste formato:

```markdown
# Critérios de Aceite (Checklist)

- [ ] **Título do Critério**
  Descrição detalhada do comportamento esperado (pelo menos 2 frases). Inclua regras de negócio,
  estados especiais, `error.code` esperado e referência a fluxos alternativos.

- [ ] **...**
```

Regras adicionais:
- A lista contém *todos* os critérios relevantes levantados na análise, sem limite máximo.
- Cada critério tem um parágrafo explicativo abaixo do título, com ênfase em cenários-limite, estados
  nulos, erros esperados, múltiplos cliques, mudança de URL e manipulação de filtro.
- Casos específicos (valor `null`, lista vazia, permissão negada, arredondamento) são detalhados
  explicitamente dentro do texto do critério.

---

## 10. Blueprint técnico (Etapa 2)

Depois da análise, produza exemplos concretos para aprovação **antes** de implementar:

- [ ] **Contrato**: o `DTO` + `Create/UpdateRequest` escritos, e a assinatura da action do SDK.
- [ ] **Rota**: método/path, guard, esqueleto do handler, payload de exemplo e resposta de exemplo
      (JSON), tabela `error.code` → status.
- [ ] **Persistência**: forma do documento no Firestore, métodos do repositório e o que o mapper
      normaliza.
- [ ] **Front**: árvore de arquivos a criar (página, `(hooks)`, `(components)`, `(validations)`),
      `queryKeys` e a lista de campos do formulário com o componente `HookForm*` de cada um.
- [ ] **i18n**: a árvore de chaves novas (mesma estrutura nos 3 idiomas) + códigos em `apiErrors`.
- [ ] **Adaptação de código existente**: arquivos afetados, pseudo-diffs, pontos de atenção.
- [ ] **Ordem de implementação/commit**: SDK → API → app/web → i18n.
- [ ] **Env/config nova** e o que cada fork precisa configurar.

> **Objetivo:** um mini blueprint validado antes de codar — reduz retrabalho e alinha decisões.

---

## 11. Revisão pós-implementação (Etapa 3)

Compare o entregue com a análise e o blueprint. O checklist operacional de revisão (o que o
`revisor-codigo` e o `code-reviewer` aplicam) é [`review-checklist.md`](review-checklist.md).

- [ ] Cada item do blueprint foi entregue? Divergências registradas e justificadas?
- [ ] Cada critério de aceite foi verificado — por unit, integração, e2e ou manual? Anexe evidência.
- [ ] `pnpm check` e `pnpm --filter <app> typecheck` limpos no escopo.
- [ ] Paridade de i18n nos 3 idiomas (`pnpm --filter @repo/internationalization test`).
- [ ] Validação visual feita (screenshots), light/dark/mobile.
- [ ] Melhorias detectadas durante a revisão documentadas (mesmo que fiquem fora de escopo).

---

## 12. Pós-entrega

- [ ] Vars de env a configurar em produção (Vercel) e segredos (Firebase/Stripe/Resend).
- [ ] Índices do Firestore e regras de segurança a publicar.
- [ ] Webhook a cadastrar no provedor (Stripe) e o que valida que ele chegou.
- [ ] Plano de rollback (é só reverter o commit? há dado gravado que fica órfão?).
- [ ] O que um **fork** deste boilerplate precisa ajustar para usar a feature.
