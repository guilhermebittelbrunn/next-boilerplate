# Glossário

Vocabulário recorrente deste boilerplate — os termos que aparecem no código, nos `CLAUDE.md` e nas
conversas com a IA. Para a visão de sistema, veja [`ARCHITECTURE.md`](ARCHITECTURE.md).

Este repo é um **boilerplate**: não tem domínio de negócio próprio. Os termos abaixo são de
**infraestrutura**; o vocabulário de produto nasce em cada fork (documente-o aqui, substituindo os
exemplos de `entity`).

## Camadas e contratos

- **Slice vertical** — a unidade de trabalho: uma feature atravessando `packages/sdk` (contrato) →
  `apps/api` (rota) → `apps/app`/`apps/web` (UI) → `packages/internationalization` (textos). É também a
  ordem de implementação e de commit.
- **`entity`** — o **recurso de referência**, um CRUD completo que existe só para servir de molde. Todo
  recurso novo espelha esse slice. Num fork real, `entity` é substituído ou removido.
- **DTO** — o tipo exposto pela API e consumido pelo front, declarado em `packages/sdk/src/types/`.
  É **o contrato**: mudar um DTO afeta API e todos os apps.
- **Entity (persistência)** — o documento como está gravado no Firestore, mais o `id`. **Não** existe
  camada de domínio: `Entity` é o documento; `DTO` é o contrato. A tradução entre os dois é o mapper.
- **Mapper** — classe em `apps/api/(shared)/mappers/` que estende `Mapper<Entity, DTO>`: `toDTO` normaliza
  (`Timestamp` → ISO, string opcional → `null`) e `toPersistence` filtra as chaves graváveis. Exporta
  **uma instância** (ex.: `entityMapper`).
- **`BaseRepository<DTO>`** — CRUD genérico sobre uma coleção do Firestore. Estampa
  `createdAt`/`updatedAt`/`deletedAt`, faz **soft delete** e aceita o mapper como 3º argumento do `super`.
  ⚠️ Não tem paginação, `orderBy` nem filtros compostos — filtro/ordenação hoje é feito em memória no
  método do repositório.
- **Action (SDK)** — `export default class XActions` em `packages/sdk/src/actions/<recurso>/action.ts`, com
  um método por operação. Precisa ser **registrada no `Client`** para virar `apiClient.<recurso>`.
- **`apiClient`** — a instância do `Client` do SDK usada pelo front (`apps/app/shared/lib/client.ts`). É a
  **única porta** do front para a API.
- **`error.code`** — código estável em `SCREAMING_SNAKE` que a API devolve em `{ error: { code } }`. O front
  traduz via `apiErrors` + `FormattedError`. Todo código novo precisa de entrada nos **3 idiomas**.

## Autenticação e contexto

> Regra de negócio completa: [`AUTH-PANEL.md`](AUTH-PANEL.md).

- **Guard** — wrapper de handler em `apps/api/app/(guards)/` que autentica e autoriza **antes** da lógica.
  Retorna uma `Response` de erro em vez de lançar exceção.
  - **`requireCommonPanelApi`** — usuário comum; injeta `ctx.subjectProfile`; é ciente de impersonação.
  - **`requireAdminApi`** — só admin; **não** tem `subjectProfile`.
- **Actor × subject** — o **actor** é quem está autenticado (o dono do token); o **subject**
  (`ctx.subjectProfile`) é o usuário **em contexto**. São diferentes quando um admin está personificando.
  Toda regra de ownership usa o **subject**.
- **Impersonação** — admin operando a área comum "no lugar de" um usuário. O SDK envia headers de contexto
  (`x-user-id`, `x-request-user-id`, `x-user-role`, `x-request-role`) e o guard resolve o `subjectProfile`.
  No front, trocar o usuário exige `window.location.reload()`; leituras RSC são puladas quando
  `isImpersonating()`.
- **Ownership** — regra de que um recurso pertence a um usuário (campo `userId` no documento). Violação
  responde **404**, não 403 — para não vazar a existência do recurso.
- **Session cookie × ID token** — o front autentica chamadas do SDK com `Authorization: Bearer <ID token>`;
  o Next (proxy, RSC, rotas de sessão) usa o **cookie `access-token`**, que guarda um *session cookie* do
  Firebase. A API aceita os dois. Ver [`AUTH-SSO.md`](AUTH-SSO.md).
- **Contexto do SDK** — `common` | `admin`: define quais headers de papel o cliente envia.
- **Painel comum × painel admin** — os dois grupos de rota autenticadas de `apps/app`:
  `(common)` (URL `/{locale}/…`) e `(admin)/admin` (URL `/{locale}/admin/…`).
- **`requireSession` / `requireAdmin`** — guardas server-side de `apps/app/lib/server/`, que redirecionam
  antes de renderizar. **Espelham** — não substituem — os guards da API.

## Produto e configuração

- **Modo de produto** (`NEXT_PUBLIC_PRODUCT_MODE`) — `subscription` (usuário comum opera no painel;
  assinatura Stripe) ou `simple` (usuário comum opera na web; painel é admin-only). Dirige roteamento e
  navegação nos dois apps. Ver [`AUTH-SSO.md`](AUTH-SSO.md).
- **Fork** — um MVP gerado a partir deste boilerplate. A regra mestra existe por causa deles: **genérico no
  pacote, específico no app**.
- **`proxy.ts`** — o middleware do Next (renomeado no Next 16). Em `apps/app` resolve locale e sessão; em
  `apps/api` faz o CORS (header customizado novo precisa entrar no `allowHeaders`).

## Front-end

- **Grupos de rota** — pastas entre parênteses que **não** entram na URL:
  `(authenticated)`/`(unauthenticated)` (guarda), `(common)`/`(admin)` (área), `(pages)` (isola os
  `page.tsx` de `paths.ts`/`routes.tsx`/`sidebar.tsx`), e `(hooks)`/`(components)`/`(validations)`
  (colocação por rota).
- **Prefetch RSC** — o Server Component pré-carrega a query (`prefetchQuery` + `HydrationBoundary`) usando
  a **mesma `queryKey`** do hook client, para a hidratação casar.
- **`queryKeys`** — fábrica central de chaves do React Query (`apps/app/shared/lib/queryKeys.ts`), usada
  tanto no prefetch quanto nos hooks.
- **Toggle otimista** — mutation de `enabled` que atualiza o cache com `setQueryData` (lista + detalhe) e
  faz rollback no erro, **sem** `invalidateQueries`.
- **`HookForm*`** — os componentes de `packages/design-system/components/form/hookform/` que ligam os
  primitivos ao React Hook Form. A prop de erro é **`error`**, nunca `errorMessage`.
- **`Container` / `FormContainer` / `Footer`** — o casco de página/formulário. ⚠️ Ficam em
  **`apps/app/shared/components/ui/`**, não no design system.
- **`Table`** — o wrapper de tabela do design system (antd por baixo), com `searchFields` (busca em
  memória), `onRefresh` e `refreshLoading`. Por ser antd, **valide o tema light/dark** ao mexer nele.
- **Folha de dicionário** — arquivo de tradução com as **3 chaves de idioma** (`pt-br`, `en`, `es`) e a
  mesma estrutura em cada, que sobe por `index.ts` até `translations/global.ts`. O teste de paridade
  garante que nenhuma chave falte.
- **Schema factory** — `buildXFormSchema(dictionary)`: o schema Zod é construído a partir do dicionário,
  para que as mensagens de validação também sejam traduzidas.

## Fluxo de trabalho

- **Spec** — a ficha de uma funcionalidade **candidata**, em `specs/<id>.md`: problema, evidência de
  mercado, corte de MVP e riscos. Responde **o quê** e **por quê**; o **como** é do `analyze/plan.md`. Uma
  spec não contém pseudo-diff nem nome de arquivo a criar. Ver [`specs/README.md`](../specs/README.md).
- **Arquivar uma spec** — tirá-la de `specs/` e guardá-la junto da feature que a implementou, quando o
  `/spec --sync` confirma a entrega **no código**. É o que mantém `specs/` significando "o que falta".
  Regra e exceções: [`specs/README.md`](../specs/README.md).
- **Backlog** — `specs/BACKLOG.md`, o índice priorizado das specs. É a **fonte da ordem**; o arquivo da
  spec é a fonte do conteúdo.
- **Nota de pesquisa** — `specs/research/<topico>.md`: o levantamento de mercado com fontes, `collected` e
  `revalidate_after`. As specs **citam** a nota em vez de recopiar os argumentos.
- **Prevalência** — quantas referências de um painel declarado entregam um recurso por padrão ("7 de 11").
  É o dado que sustenta "isso é padrão de mercado"; impressão não é.
- **Deriva** — quando o corte de MVP de uma spec foi implementado, mas **diferente** do especificado.
  Detectada pelo `/spec --sync`; significa que ou a spec estava errada, ou a implementação desviou.
- **`STATE.md`** — índice + gate do pipeline de uma tarefa, em `docs/features/<slug>/`. Quando a tarefa
  nasceu de uma spec, o frontmatter traz `spec: <id>`. Ver [`TASK-PIPELINE.md`](TASK-PIPELINE.md).
- **Handoff** — o resumo conciso que uma etapa deixa para a próxima (`develop/handoff.md`,
  `review/review.md`), para que ela não precise reler o plano e o diff inteiros.
- **Validação visual** — subir o app e percorrer o fluxo com a skill `agent-browser`, conferindo
  light/dark/mobile. É **bloqueante** em front-end (regra de ouro 11).
- **Branch protegida** — `main`, `master`, `production`, `production-backup`. Nunca recebem commit direto.
