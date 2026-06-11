---
name: new-api-route
description: Cria uma rota HTTP em apps/api seguindo o padrão do boilerplate (next-forge fork) — validação Zod na borda, guard de auth, repositório+mapper Firestore e error.code traduzível. Use quando o usuário pedir "criar/adicionar uma rota/endpoint na API", "expor um recurso na api", ou como passo da skill new-crud. Para o CRUD vertical completo (SDK + app + i18n) use /new-crud.
---

# Nova rota na API (`apps/api`)

Gera handlers HTTP em `apps/api` no padrão do repo. **Referência viva**: o recurso `entity` (`apps/api/app/(routes)/entities/`). Antes de codar, leia [`apps/api/CLAUDE.md`](../../../apps/api/CLAUDE.md) (auto-carregado pelo Claude ao trabalhar em `apps/api`).

## Entradas a confirmar com o usuário
- **Recurso** (singular + plural, ex.: `product` / `products`) e a **coleção** Firestore.
- **Operações**: list / create / get-by-id / update / delete (quais aplicam).
- **Contexto/guard**: comum (`requireCommonPanelApi`) ou admin (`requireAdminApi`). Há posse por `userId`?
- **Campos** do recurso e seus tipos (refletem o DTO no `@repo/sdk`).

## Passo a passo

### 1. DTO e tipos no SDK
Garanta que `XDTO`, `CreateXRequest`, `UpdateXRequest` existam em `packages/sdk/src/types` (e enums como `XType`). A API importa o DTO de `@repo/sdk/src/types` — o contrato nasce no SDK.

### 2. Validação (`apps/api/(shared)/validation/<recurso>.schema.ts`)
Espelhe `entity.schema.ts`:
- `createXSchema` (campos obrigatórios) e `updateXSchema` (tudo `.optional()` + `.refine(v => Object.keys(v).length > 0)`).
- Exporte `parseCreateX` / `parseUpdateX` que devolvem `{ ok: true, value } | { ok: false, response }`, respondendo `{ error: { code: "VALIDATION_FAILED" } }` com `HTTP_STATUS.BAD_REQUEST` em falha.

### 3. Mapper (`apps/api/(shared)/mappers/<recurso>.mapper.ts`)
Só se precisar normalizar (datas `Timestamp`→ISO, opcionais). Estenda `Mapper<XFirestoreRow, XDTO>`:
- `toDTO`: monta o DTO a partir do row; use `stringIfExists` e `normalizeFirestoreInstant` de `@repo/shared/utils`.
- `toPersistence`: copia só as chaves definidas (`AllOptional<XDTO>`).
- Exporte uma instância única (`xMapper`).
Recursos sem normalização podem dispensar mapper (ver `user.repository`).

### 4. Repositório (`apps/api/(shared)/repositories/<recurso>.repository.ts`)
Estenda `BaseRepository<XDTO>` e, **se houver mapper**, passe-o no `super`: `super(db, "<coleção>", xMapper)`. `BaseRepository` já dá `findById`/`create`/`update`/`delete` (soft delete via `deletedAt`). Adicione queries específicas (ex.: `listByUserId`) seguindo `entity.repository.ts`. Exporte instância única (`xRepository`).

### 5. Handlers
- **Coleção** — `apps/api/app/(routes)/<plural>/route.ts`: `GET` (list) + `POST` (create).
- **Item** — `apps/api/app/(routes)/<plural>/[id]/route.ts`: `GET`/`PUT`/`DELETE`.

Padrões obrigatórios (ver os dois arquivos de `entities`):
- Envolva cada handler no guard: `export const GET = requireCommonPanelApi(async (req, ctx) => {...})`. Para rota `[id]`, parametrize: `requireCommonPanelApi<RouteIdParamsContext>(...)` e `const id = await resolveIdFromContext(ctx)`.
- Body de POST/PUT via `parseRequestJson(req)` → cheque `.ok`; depois `parseCreateX`/`parseUpdateX`.
- PATCH parcial: `const patch = omitUndefined(parsed.value)` antes do `update`.
- **Posse**: quando o recurso pertence a um usuário, cheque `row.userId !== ctx.subjectProfile.id` → `{ error: { code: "X_NOT_FOUND" } }`, 404.
- Respostas: create → `Response.json({ data: created }, { status: 201 })`; get → `{ data: row }`; PUT fire-and-forget → `{ data: { id } }`; delete → `new Response(null, { status: 204 })`.
- Erros sempre como `{ error: { code: "X_..." } }` com status correto — nunca stack trace.

### 6. Códigos de erro → i18n
Todo `error.code` novo (ex.: `X_NOT_FOUND`, `X_CREATE_FAILED`) precisa de entrada em `apiErrors` nos 3 idiomas. Use a skill [`/i18n-sync`](../i18n-sync/SKILL.md) (arquivo `packages/internationalization/translations/packages/shared/utils.ts`).

## Checklist final
- [ ] Guard aplicado em todos os métodos; autorização não depende só da UI.
- [ ] Validação Zod na borda; `parseRequestJson`/`omitUndefined`/`resolveIdFromContext` usados.
- [ ] DTO no SDK e import de `@repo/sdk/src/types` na API.
- [ ] `error.code` traduzido nos 3 idiomas (`apiErrors`).
- [ ] Sem import de React/`apps/app` na API.
- [ ] `pnpm --filter api typecheck` e `pnpm check` passam.

> Lembre: o front consome esta rota **apenas** via `@repo/sdk` (action por recurso). Adicione/atualize a action correspondente — ver `/new-crud`.
