# Orientação para agentes (IA e contribuidores)

Este repositório é um **boilerplate full stack** em monorepo (`pnpm` + `turbo`). Forks devem manter o mesmo padrão arquitetural; evite regras de negócio ou domínio único dentro de pacotes compartilhados.

## Onde vive cada coisa

| Área | Caminho | Papel |
|------|---------|--------|
| App Next (UI, rotas, marketing/admin) | `apps/app/` | Consome `@repo/sdk`, `@repo/design-system`, `@repo/internationalization`, `@repo/auth`. |
| API Next (rotas HTTP) | `apps/api/` | Orquestração HTTP, validação na borda, uso de pacotes `@repo/*`. |
| Cliente HTTP e tipos de API | `packages/sdk/` | Única porta de chamada à API a partir do front. |
| UI compartilhada e tema | `packages/design-system/` | Componentes genéricos; sem fluxo de negócio de produto. |
| Traduções | `packages/internationalization/` | Chaves estáveis; textos de exemplo neutros. |
| Auth, e-mail, pagamentos, etc. | `packages/auth`, `packages/email`, `packages/payments`, … | Integrações reutilizáveis; configuráveis por env. |

## Princípios (resumo)

1. **Genérico no pacote, específico no app** — domínio do produto fica em `apps/*` ou em um pacote claramente nomeado ao domínio, não misturado em `@repo/sdk` / design-system.
2. **SDK como fachada** — o front não chama `fetch`/axios direto para a API da aplicação; usa ações/funções do `@repo/sdk`.
3. **i18n em dois lados** — mensagens de API alinhadas a locale quando fizer sentido; UI sempre via pacote de internacionalização.
4. **Responsivo e tema** — layout e componentes base devem funcionar em mobile e desktop; dark mode via design system / tokens existentes.

## Convenções de implementação

- **Locale no app**: para resolver locale atual, prefira `getDictionary()` (client/server) ou `getDictionaryForLocale(...)` quando a rota já fornece `[locale]`. Esses helpers já aplicam fallback/default e cookie (`x-locale`) automaticamente.
- **Nomenclatura de arquivos**: componentes React em **TitleCase** (ex.: `PanelNavbarControls.tsx`); hooks em **camelCase** (ex.: `useListUsers.ts`).

## Regras Cursor

Detalhes acionáveis estão em `.cursor/rules/*.mdc` (regras por glob + uma regra núcleo com `alwaysApply`).

Ao implementar uma feature nova: leia a regra do escopo (`next-app`, `api-app`, `monorepo-packages`) e a regra núcleo `boilerplate-core`. Para **inputs compostos, `Switch`, `DateInput` e `HookForm*`**, use também a secção **Design system — inputs e formulários (RHF)** neste ficheiro e as subsecções de `@repo/design-system` em `monorepo-packages.mdc`.

Para textos de interface e erros de API: `.cursor/rules/i18n-user-facing.mdc`.

Para nomenclatura (hooks `useList` / `useFind…By…`), tabela com busca/refetch, `Footer` / `FormContainer` / `Container.loadError` e 404 (`NotFoundPage`): `.cursor/rules/naming-and-crud-patterns.mdc`.

## Padrões API e app (CRUD, cache, auth)

### API (`apps/api`)

- **JSON do body**: use `parseRequestJson` em `apps/api/(shared)/lib/parse-request-json.ts` em POST/PUT em vez de repetir `try { await req.json() }`.
- **PATCH parcial**: use `omitUndefined` em `apps/api/(shared)/lib/omit-undefined.ts` para montar o objeto de atualização a partir do body validado (remove chaves com valor `undefined` e preserva campos não enviados pelo front).
- **Mappers Firestore → DTO**: quando não der para evitar normalização (ex.: `Timestamp` → ISO), crie `apps/api/(shared)/mappers/<recurso>.mapper.ts` com uma classe que estende `Mapper<Entity, DTO>` (`MapperInterface` + `Mapper` em `apps/api/(shared)/mappers/`). Não há camada “domain”: `Entity` é o documento persistido com `id`; `DTO` é o tipo do `@repo/sdk`. Implemente `toDTO` e `toPersistence` (parcial com `AllOptional` de `@repo/shared/utils`). Reutilize `stringIfExists` e `normalizeFirestoreInstant` de `@repo/shared/utils` para strings opcionais e datas. Exporte uma instância única (ex.: `entityMapper`).
- **Repositórios com mapper**: estenda `BaseRepository<DTO>` e passe o mapper como 3.º argumento do `super` (`super(db, "entity", entityMapper)`). `UserRepository` e outros sem mapper continuam com `super(db, "tabela")` apenas. Com mapper, `create` e `findById` devolvem o DTO já normalizado.
- **Params `[id]`**: use `resolveIdFromContext` de `apps/api/(shared)/lib/resolve-route-id.ts` e tipagem `RouteIdParamsContext` nos handlers; passe o genérico do guard (`requireAdminApi<RouteIdParamsContext>`, `requireCommonPanelApi<RouteIdParamsContext>`).
- **PUT**: quando o contrato for “fire-and-forget” no servidor, responda só `{ data: { id } }` para o cliente refetch se precisar do registo completo (evita segunda leitura na API).

### App (`apps/app`)

- **Datas na UI**: `formatDisplayDateTime` em `apps/app/shared/lib/formatDisplayDateTime.ts` — locale vem de `getDictionary()`; o instante continua no fuso do navegador.
- **Hooks de dados**: no mesmo ficheiro, exporte uma função que chama o SDK (ex.: `findEntityById`, `fetchEntitiesList`) com validação de parâmetros (`undefined` quando faltam inputs) e o hook `useQuery` com `enabled` coerente com esses parâmetros.
- **Mutations de toggle de estado**: em CRUDs com coluna `enabled`, exponha `toggleEntityStatusMutation` que faz `PUT` só com `enabled`, **sem** `invalidateQueries`; quando a API devolver só `{ id }`, atualize o cache com `queryClient.setQueryData` (merge de `enabled` na lista e na query por id).
- **Listagens com foto**: use `ResponsiveImage` de `@repo/design-system/components/ui/responsive-image` para miniaturas em tabelas.
- **Coluna `enabled` em listas**: renderize um `Switch` controlado que dispara a mutation de toggle (não só texto Sim/Não).
- **Impersonação admin**: ao mudar o utilizador visualizado em `PanelNavbarControls`, após `setImpersonatedUser` faça `window.location.reload()` para garantir que todos os dados e pedidos em curso usam o novo contexto.
- **Pós-login (admin vs comum)**: `AppDesignProvider` passa `resolveDefaultPostLoginPath` ao design system; Google/sign-up usam `resolveAppPostLoginPath` para alinhar com a mesma regra (ex.: admin → `/{locale}/admin` quando não há query `redirect`).
- **Campos de formulário complexos**: ver a secção **Design system — inputs e formulários (RHF)** mais abaixo neste ficheiro.

## Design system — inputs e formulários (RHF)

Pacote: `packages/design-system/`. Caminho base: `packages/design-system/components/ui/` (primitivos) e `packages/design-system/components/form/hookform/` (ligações ao React Hook Form).

### Nomes e simplicidade

- **Sem prefixo `Labeled`**: os compostos genéricos chamam-se `TextareaInput`, `RadioGroupInput`, `DateInput`. O texto simples continua no `Input` (`components/ui/input.tsx`).
- **`RadioGroupInput`** exporta o tipo auxiliar **`RadioOption`** (`{ value: string; label: string }`) no mesmo ficheiro (`radio-group-input.tsx`).

### Label e erros (padrão alinhado ao `Input`)

- **`label` opcional** em `TextareaInput`, `RadioGroupInput`, `DateInput`: só renderizar o componente `Label` quando `label` estiver definido, com `htmlFor={id}` quando o controlo expuser `id` (como em `Input`).
- **Prop de erro**: usar **`error`** (string opcional) nos compostos acima, **não** `errorMessage`, para alinhar com `Input` (`error`).

### Data (`DateInput`)

- **`DateInput`** (`date-input.tsx`): calendário com **`Popover`** (Radix) + **`Calendar`** (react-day-picker) e botão de gatilho; valor controlado em string **`YYYY-MM-DD`**. Evitar `<input type="date">` nativo para manter UX e estilo consistentes com o resto do design system.
- **`HookFormDateInput`** repassa `value` / `onChange` / `onBlur` / `ref` ao `DateInput` (o `onChange` recebe a string da data, não evento de `<input>`).

### Switch

- **`Switch`** (`switch.tsx`): prop opcional **`label`** (conteúdo ao lado do toggle), com associação **`htmlFor` / `id`** estável (`useId`).
- **`HookFormSwitch`**: não duplicar `Switch` nem usar `switchSlot` / linhas antigas tipo “row”. Usar **`FormLabel`** (opcional) + **`FormControl`** + um único **`Switch`**, com **`FormDescription`** / **`FormMessage`** quando fizer sentido (ex.: `description` com classe `sr-only` para a11y). O `Slot` do `FormControl` deve continuar a envolver **apenas** o controlo switch (sem wrapper extra que roube o `id` do item do formulário).

### Novos componentes em `components/ui`

- Sempre **reexportar** componentes e tipos novos em **`packages/design-system/components/ui/index.ts`** para consumo via barrel (`@repo/design-system/components/ui`).

### Variantes `HookForm*`

- Nome **`HookForm` +** nome do controlo (`HookFormTextarea`, `HookFormRadioGroup`, `HookFormDateInput`, `HookFormSwitch`, …).
- **Props**: `Omit<PropsDoComponenteBase, chavesGeridasPeloRHF | "error" | …>` conforme o caso; fundir com `control?`, `name`, `hidden?`, etc.; repassar **`{...rest}`** ao componente base.
- **`hidden`**: quando `true`, o componente pode devolver fragmento vazio (`<></>`) sem registar campo visível (padrão já usado nos hookforms).
