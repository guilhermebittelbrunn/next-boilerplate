# API (`apps/api`)

Regras de escopo para a API Next — rotas, validação, auth na borda. O Claude carrega este arquivo automaticamente ao trabalhar em `apps/api`. Veja também o [`CLAUDE.md`](../../CLAUDE.md) raiz (regras de ouro) e o [`AGENTS.md`](../../AGENTS.md) (padrões detalhados). Recurso de referência: `entity` (`app/(routes)/entities/`).

## Rotas

- Handlers em `app/(routes)/...`. Um arquivo por responsabilidade HTTP clara (REST-ish).
- Validar input na borda (Zod); responder com códigos HTTP corretos e corpos consistentes.

## Camadas

- **Guards** (`app/(guards)`): auth/session antes da lógica (`requireCommonPanelApi`, `requireAdminApi`). Para rota `[id]`, parametrize com `RouteIdParamsContext`.
- **Repositórios / adapters** (`(shared)/repositories`): isolam persistência; contratos alinhados ao `@repo/sdk` na borda. Entrada/saída "crua" do Firestore ainda pode exigir normalização mínima (ex.: `Timestamp` → ISO); evite camadas DTO redundantes (`findDtoById`) quando a rota já valida posse.
- **Mappers** (`(shared)/mappers`): use quando DTO de API ≠ modelo interno; para recursos simples prefira um helper pequeno no repositório em vez de ficheiros só para isso.

## Helpers HTTP compartilhados (`(shared)/lib`)

- `parseRequestJson(req)` — body JSON com resposta 400 padronizada em falha de parse.
- `omitUndefined(partial)` — PATCH que não sobrescreve campos omitidos pelo cliente (remove entradas `undefined` antes do `update`).
- `resolveIdFromContext` + tipo `RouteIdParamsContext` (`resolve-route-id.ts`) — rotas dinâmicas `[id]` com `params` síncrono ou `Promise`.

## Mappers e repositórios Firestore

- Mappers em `(shared)/mappers/`: interface `MapperInterface<Entity, DTO>`, classe base `Mapper<Entity, DTO>` (sem camada domain), `AllOptional` via `@repo/shared/utils`. Reutilize `stringIfExists` e `normalizeFirestoreInstant`.
- Repositório por recurso: classe `<Recurso>Mapper` + instância exportada; repositório estende `BaseRepository<DTO>` passando o mapper no `super` (3.º arg). Repositórios sem normalização (ex.: `user`) mantêm só `super(db, tabela)`.
- `POST` após `create`: pode devolver diretamente o DTO retornado pelo repositório.
- `PUT` opcional: resposta mínima `{ data: { id } }` quando não for necessário devolver o registo completo.

## Segurança e i18n

- Repetir checagens de permissão mesmo que o front já restrinja rotas. Cheque posse quando aplicável (ex.: `row.userId !== ctx.subjectProfile.id` → 404).
- Respostas de erro para o cliente expõem um **`error.code`** estável (ex.: `ENTITY_NOT_FOUND`, `VALIDATION_FAILED`), nunca stack trace nem mensagens internas como copy principal.
- Ao adicionar um código de erro novo, adicione a mesma chave nos três idiomas em `translations/packages/shared/utils.ts` (`apiErrors`) — use a skill `/i18n-sync`.

## Compartilhamento

- Código usado só pela API fica em `(shared)/...` ou em pacote `@repo/*` se for útil a outros apps.
- **Não importar componentes React de `apps/app` na API.**
