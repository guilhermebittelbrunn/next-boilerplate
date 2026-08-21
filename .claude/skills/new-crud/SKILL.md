---
name: new-crud
description: Scaffolda um CRUD vertical completo de um recurso neste monorepo (next-forge fork), do contrato no SDK até a UI no app — SDK actions, rotas na apps/api, hooks de dados, página de lista + formulários de criar/editar e chaves de tradução nos 3 idiomas. Use quando o usuário pedir "criar um CRUD de X", "adicionar o recurso X de ponta a ponta", "uma tela de listagem + cadastro de X". Segue o padrão do recurso `entity`.
---

# CRUD vertical completo

Orquestra um recurso de ponta a ponta seguindo o **CRUD de referência `entity`**. Esta skill compõe [`/new-api-route`](../new-api-route/SKILL.md) (camada API) e [`/i18n-sync`](../i18n-sync/SKILL.md) (traduções). Antes de começar, leia [`apps/app/CLAUDE.md`](../../../apps/app/CLAUDE.md) e [`apps/api/CLAUDE.md`](../../../apps/api/CLAUDE.md) (auto-carregados pelo Claude por escopo).

## 0. Alinhe o recurso com o usuário
- Nome singular/plural (ex.: `product`/`products`) e coleção Firestore.
- Campos + tipos (refletem o DTO).
- Contexto: comum (`requireCommonPanelApi`) ou admin (`requireAdminApi`)? Tem posse por `userId`?
- Operações necessárias (list/create/get/update/delete) e se há coluna `enabled` (toggle).

> Antes de criar arquivos, **abra o recurso `entity`** e use como template em cada camada (caminhos abaixo). Replique a estrutura, troque nomes/campos.

## 1. Contrato no SDK (`packages/sdk`)
- **Tipos** em `packages/sdk/src/types`: `XDTO`, `CreateXRequest`, `UpdateXRequest`, enums (`XType`).
- **Action** em `packages/sdk/src/actions/<recurso>/action.ts` espelhando `actions/entity/action.ts`: `list`, `findById(id)`, `create(body)`, `update(id, body)` (retorna `{ id }`), `delete(id)`. Cada método usa `this.client.request<Response<...>>` e retorna `data.data`.
- **Registre** a action no `Client` (`packages/sdk/src/client/index.ts`): campo `x!: XActions;` + `this.x = new XActions(this)` no construtor.

## 2. Camada API (`apps/api`)
Siga [`/new-api-route`](../new-api-route/SKILL.md) na íntegra: validação Zod (`<recurso>.schema.ts`), mapper se houver normalização, repositório (`BaseRepository<XDTO>`), handlers em `(routes)/<plural>/route.ts` e `(routes)/<plural>/[id]/route.ts`, guards, `error.code`. Garanta os `apiErrors` correspondentes nos 3 idiomas.

## 3. Hooks de dados no app
Colocados em `apps/app/app/[locale]/(authenticated)/(<contexto>)/(pages)/<plural>/(hooks)/`. Espelhe os hooks de `entities`:
- **`useListX.tsx`**: exporta `LIST_X_QUERY_KEY`, `fetchXList()` (chama `apiClient.x.list()`) e `useListX()` (`useQuery`).
- **`useFindXById.tsx`**: exporta `FIND_X_BY_ID_QUERY_KEY`, `findXById(id)` (retorna `undefined` se faltar `id`) e `useFindXById(id)` com `enabled: !!id`.
- **`useXCrud.tsx`**: mutations `create`/`update`/`delete` (com `invalidateQueries` + `successAlert`/`errorAlert` via `useAlert` e `handleClientError`/`FormattedError`). Se houver `enabled`, `toggleXStatusMutation` que faz `PUT { enabled }` e atualiza **só** o cache com `setQueryData` (lista + por id), **sem** `invalidateQueries`.

## 4. UI no app
Sob `(pages)/<plural>/`:
- **Validação do form**: `(validations)/xFormSchema.ts` — schema Zod do formulário (com mensagens do dictionary quando fizer sentido) + `EntityFormValues`-equivalente.
- **Campos**: `(components)/XFormFields.tsx` usando `HookFormInput/Textarea/Select/Switch/DateInput/RadioGroup` de `@repo/design-system/components/form/hookform`, envoltos em `FormContainer` (1 col mobile / 2 col md+).
- **Lista**: `(pages)/(home)/page.tsx` com o `Table` do design system (`searchFields`, `onRefresh`, `refreshLoading`). Coluna `enabled` = `Switch` controlado disparando o toggle. Miniaturas via `ResponsiveImage`.
- **Criar/editar**: `(pages)/create/page.tsx` e `(pages)/edit/[id]/page.tsx` com `Container` (`contentOnly`, `loadError`), `FormContainer` e `Footer` **dentro** do `<form>`.
- **Rotas/paths**: registre em `(authenticated)/(<contexto>)/paths.ts` e `routes.tsx`.
- **Textos**: tudo via dictionary — ver passo 5.

## 5. Traduções
Use [`/i18n-sync`](../i18n-sync/SKILL.md): crie `translations/apps/app/pages/<contexto>/<recurso>.ts` (modelo: `common/entities.ts`) com `title`, `fields`, `messages`, `table`, etc. nos 3 idiomas; conecte no `index.ts`. Garanta os `apiErrors` do passo 2.

## 6. Fechamento
- Rode `pnpm check` e `pnpm --filter app typecheck` + `pnpm --filter api typecheck`.
- **Validação visual (obrigatória — é CRUD, toca UI)**: com a skill **`agent-browser`**, suba `pnpm --filter app dev` (+ `pnpm --filter api dev`) e percorra os fluxos de lista/criar/editar/excluir/toggle; tire screenshots e cheque layout, estados de erro/vazio, responsivo (mobile+desktop) e tema (light/dark).
- Considere chamar o agente **`code-reviewer`** sobre o diff para validar as convenções (ele também roda a validação visual).

## Mapa de arquivos do recurso de referência (`entity`)
```
packages/sdk/src/types/                                  # XDTO, CreateXRequest, UpdateXRequest
packages/sdk/src/actions/entity/action.ts                # action por recurso
packages/sdk/src/client/index.ts                         # registro no Client
apps/api/(shared)/validation/entity.schema.ts            # Zod + parseCreate/parseUpdate
apps/api/(shared)/mappers/entity.mapper.ts               # normalização (se preciso)
apps/api/(shared)/repositories/entity.repository.ts      # BaseRepository<DTO> (+ mapper)
apps/api/app/(routes)/entities/route.ts                  # GET list + POST
apps/api/app/(routes)/entities/[id]/route.ts             # GET/PUT/DELETE
apps/app/.../(common)/(pages)/entities/(hooks)/*         # useList / useFindById / useCrud
apps/app/.../(common)/(pages)/entities/(validations)/*   # form schema
apps/app/.../(common)/(pages)/entities/(components)/*    # FormFields
apps/app/.../(common)/(pages)/entities/(pages)/*         # home / create / edit
packages/internationalization/translations/apps/app/pages/common/entities.ts
packages/internationalization/translations/packages/shared/utils.ts   # apiErrors
```

## Checklist final
- [ ] Front chama a API **só** via `apiClient`/SDK; sem `fetch` cru nem URL hardcoded.
- [ ] Guards na API espelham a autorização; posse checada quando aplicável.
- [ ] Zero string de UI literal; chaves nos 3 idiomas; `apiErrors` cobertos.
- [ ] Hooks seguem `useListX`/`useFindXById`; toggle via `setQueryData`.
- [ ] Design system usado (HookForm*/Table/Footer/FormContainer/Container); sem primitivos duplicados.
- [ ] `pnpm check` + typechecks passam.
