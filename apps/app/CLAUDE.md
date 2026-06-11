# App Next (`apps/app`)

Regras de escopo para a aplicação do usuário (dashboard, cadastro, **admin** com impersonação). O Claude carrega este arquivo automaticamente ao trabalhar em `apps/app`. Veja também o [`CLAUDE.md`](../../CLAUDE.md) raiz e o [`AGENTS.md`](../../AGENTS.md) (padrões detalhados, incl. design system/RHF). Recurso de referência: `entity` (`app/[locale]/(authenticated)/(common)/(pages)/entities/`).

## Rotas e pastas

- App Router sob `app/[locale]/`. Respeitar grupos existentes: `(unauthenticated)`, `(authenticated)`, `(admin)`, etc.
- Colocation: `(hooks)`, `(validations)`, `(components)` ao lado da rota quando forem específicos da página.

## Dados e API

- Chamar a API **apenas** via `@repo/sdk` (`apiClient` de `@/shared/lib/client`). Nenhum `fetch`/axios cru nem URL hardcoded.
- Server Components por padrão; `"use client"` só onde há estado, browser APIs ou eventos.

## Hooks que chamam a API

- Listagens: prefixo **`useList`** + recurso no plural, ex.: `useListUsers`.
- Busca por identificador: prefixo **`useFind`** + recurso + **`By`** + parâmetro, ex.: `useFindUserById`. Para vários filtros, mantenha `useList…` com query params no `queryKey`.
- No cliente, use nomes de domínio genéricos (`id`, `userId`); **não** use termos de infraestrutura (`firestoreId`, `docId`) salvo em código exclusivo de infraestrutura da API.
- No **mesmo ficheiro** do hook, exporte sempre uma função imperativa (`fetchEntitiesList`, `findEntityById`, …) que chama o `apiClient`/SDK. Se faltarem parâmetros obrigatórios, essa função pode devolver `undefined`; o `useQuery` correspondente deve usar `enabled` coerente com esses parâmetros.
- Em CRUDs, mutations de **toggle de `enabled`** só atualizam cache (`setQueryData` na lista e na query por id, fazendo merge de `enabled` quando a API devolve só `{ id }`), **sem** `invalidateQueries`, salvo regra explícita do produto.

## Tabelas e listas

- Busca em memória sobre `dataSource` + botão de atualizar: use o **`Table`** do design system com `searchFields`, `onRefresh` e `refreshLoading` em vez de duplicar toolbar + `useMemo` filter em cada página.
- Para refresh isolado fora do `Table`, use **`TableRefreshButton`** (mesmo pacote que exporta `Table`).
- Listagens com foto: miniaturas via `ResponsiveImage` (`@repo/design-system/components/ui/responsive-image`).
- Coluna `enabled` em listas: renderize um `Switch` controlado que dispara a mutation de toggle (não só texto Sim/Não).

## Formulários com ações no rodapé

- Evite `form="…"` em botões fora do `<form>`. Use **`Footer`** (`shared/components/ui/Footer.tsx`) **dentro** do `<form>`: `showBack` (padrão `true`, `router.back()`), `onBack`/`backLabel` opcionais; primário é `type="submit"` se `onConfirm` ausente, senão `type="button"`. Props genéricas: `isLoading`, `disabled`.
- Layout de campos em grelha: **`FormContainer`** — 1 coluna no mobile, 2 no `md+`; filhos com `display: contents` para cada campo ocupar uma célula.
- Páginas de formulário: `Container` com **`contentOnly`** + painel `bg-muted/50`. Erro de carga: prop **`loadError`** (string) para renderizar **`LoadErrorState`** em vez do conteúdo principal.

## Campos compostos (design system + RHF)

- Use **`HookFormInput`**, **`HookFormTextarea`**, **`HookFormSelect`**, **`HookFormRadioGroup`**, **`HookFormDateInput`**, **`HookFormSwitch`** de `@repo/design-system/components/form/hookform` em vez de reinventar.
- **`RadioOption`**: importar de `@repo/design-system/components/ui/radio-group-input` ou do barrel `@repo/design-system/components/ui`.
- **Labels**: passar strings do dictionary na prop **`label`** quando houver rótulo visível; **`description`** no switch só quando precisar de texto extra (ex.: a11y com `sr-only`).
- **Erros**: os compostos do design system expõem **`error`** (string); o `HookForm*` liga isso à mensagem do resolver. Não reintroduzir `errorMessage`.
- Detalhe de implementação (Popover+Calendar no `DateInput`, `Switch` com label opcional, reexports em `index.ts`): **`AGENTS.md`** e [`packages/CLAUDE.md`](../../packages/CLAUDE.md).

## i18n e a11y

- **Não** use strings literais em JSX para mensagens de interface, placeholders, `aria-label`, confirmações, toasts ou títulos de coluna. Centralize em `@repo/internationalization` (mesmo padrão de chave em `pt-br`, `en`, `es`) — use a skill `/i18n-sync`.
- Resolver locale: prefira `getDictionary()` (client/server). Os helpers já aplicam fallback/default e cookie (`x-locale`).
- Ao guardar um objeto/fatia do dictionary em variável, use **nome descritivo** (`adminUsersForm`, `entitiesMessages`, …), **nunca** letras soltas como `t`/`d`.
- Para Zod, injete mensagens a partir do `dictionary` (ex.: `buildXxxSchema(dictionary)`), não texto fixo no schema compartilhado.
- Layouts responsivos: mobile primeiro, breakpoints consistentes com o design system.

## Erros e fluxo

- Evite `try`/`catch` vazios. Para mutations, use `mutate(data, { onSuccess, onError })` ou trate o erro explicitamente (log + fallback), alinhado ao `onError` do hook.
- Na página, passe o **payload completo** do formulário para a mutation quando o hook já fizer o mapeamento para a API (`mutate(values)`), evitando objeto intermediário redundante.
- Evite criar função nomeada de **uma linha** usada **uma única vez**; prefira callback inline quando o objetivo for só legibilidade.

## Autenticação / admin

- Guards no servidor (layouts/loaders) alinhados a `@repo/auth` / helpers em `lib/server`. Nunca confiar só em UI oculta para "área admin".
- **Impersonação**: ao mudar o utilizador visualizado em `PanelNavbarControls`, após `setImpersonatedUser` faça `window.location.reload()`.
- **Pós-login (admin vs comum)**: `AppDesignProvider` passa `resolveDefaultPostLoginPath`; Google/sign-up usam `resolveAppPostLoginPath` (ex.: admin → `/{locale}/admin` quando não há query `redirect`).

## Nomes de arquivos e estilo

- Módulos de feature em **camelCase** (ex.: `userFormFields.tsx`); componente React exportado em **PascalCase** (`UserFormFields`).
- Evite arquivos que só reexportam um único símbolo; importe do módulo concreto, salvo barrel já estabelecido do pacote.
- Preferir componentes de `@repo/design-system` antes de duplicar primitives. Tailwind: seguir padrão dos arquivos vizinhos.

## 404

- UI de rota não encontrada: **`NotFoundPage`** (RSC) + `app/not-found.tsx` e `app/[locale]/not-found.tsx`; textos em `apps.app.pages.common.notFound`; botão "início" com `href` resolvido no servidor (`resolveNotFoundHomePath`: comum → `/{locale}`, admin → `/{locale}/admin`).

## Validação visual

- Toda mudança de UI/fluxo deve ser validada com a skill **`agent-browser`** antes de concluir (ver regra de ouro 11 no `CLAUDE.md` raiz).
