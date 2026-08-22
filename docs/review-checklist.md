# Checklist de revisão

**Fonte única** das invariantes que uma revisão de código verifica neste repositório. Lida pelo agent
`code-reviewer` (read-only) e pelo `revisor-codigo` (pipeline `/review`) — não duplique este conteúdo em
outro lugar; corrija aqui.

A fonte de verdade das convenções é o [`CLAUDE.md`](../CLAUDE.md) raiz + os `CLAUDE.md` aninhados
(`apps/api`, `apps/app`, `apps/web`, `packages`) + [`AGENTS.md`](../AGENTS.md). Este arquivo é o destilado
**acionável sobre um diff**.

Verifique **apenas o que o diff toca**. Cite sempre `arquivo:linha` e a regra violada.

---

## 0. Transversal

- [ ] Domínio específico de produto **não** vazou para `packages/*` (exceção: pacotes de integração
      `auth`, `email`, `payments`). Genérico no pacote, específico no app.
- [ ] Pacote não importa de `apps/*`; sem ciclo entre pacotes.
- [ ] Nenhuma URL de API hardcoded fora do SDK / env tipado.
- [ ] **Mudança mínima**: nada refatorado fora do escopo da tarefa.
- [ ] Identificadores em inglês; nomes descritivos. Componente React em PascalCase, hook em camelCase.
- [ ] `console.log` não entra (Biome trata como erro; `warn`/`error`/`info` são permitidos).
- [ ] Comentários conforme [`.claude/rules/code-comments.md`](../.claude/rules/code-comments.md): sem
      comentário óbvio/decorativo, sem código morto comentado, e **nenhuma referência ao fluxo de agents**
      (`docs/features/**`, `plan.md`, `handoff.md`, `review.md`, ID de card, "pedido no review"). Achou?
      Remova ou reescreva com a regra autocontida.
- [ ] `pnpm check` limpo no escopo (config é **`biome.jsonc`**; 4 espaços, 80 colunas).
      `packages/design-system/components/{ui,lib,hooks}` são **excluídos** do Biome — 2 espaços lá, e não
      "corrija" indentação nesses caminhos.
- [ ] Import momentaneamente sem uso: o hook de format (`biome check --write`) **apaga** imports não
      usados entre edições. Adicione o uso antes (ou junto) do import.
- [ ] Se a tarefa nasceu de uma spec (`spec: <id>` no `STATE.md`): o que foi implementado **corresponde ao
      corte de MVP** de `specs/<id>.md`. Divergência não é erro, mas tem de ser **registrada** no
      `review.md` — ou a spec estava errada, ou a implementação desviou. Fechar a spec é do `/spec --sync`.

## 1. `apps/api`

- [ ] Handler é `export const GET = guard(async (req, ctx) => …)` — **nunca** `export async function GET`.
- [ ] Protegido por guard: `requireCommonPanelApi` (comum, expõe `ctx.subjectProfile`) ou
      `requireAdminApi` (admin, **sem** `subjectProfile`). Autorização repetida no servidor — UI oculta
      não é proteção.
- [ ] Rota `[id]`: genérico no guard (`requireCommonPanelApi<RouteIdParamsContext>`) +
      `resolveIdFromContext(ctx)`.
- [ ] **Ownership**: recurso de usuário comum verifica
      `if (!row || row.userId !== ctx.subjectProfile.id) → 404` em **todos** os handlers que recebem id
      (404, não 403 — não vaze existência). Nenhum id do body é confiado sem checar o vínculo.
- [ ] Input validado na borda com Zod: `parseCreateX`/`parseUpdateX` retornando
      `{ ok: true; value } | { ok: false; response }`; body via `parseRequestJson`; patch via
      `omitUndefined`; `updateXSchema` tem `.refine` que rejeita objeto vazio.
- [ ] Magic numbers do schema extraídos em consts (regra do Biome).
- [ ] Erro é sempre `{ error: { code: "SCREAMING_SNAKE" } }` + status (prefira `HTTP_STATUS`).
      Nunca stack trace nem mensagem interna como copy.
- [ ] **Código de erro novo tem entrada em `apiErrors` nos 3 idiomas**
      (`packages/internationalization/translations/packages/shared/utils.ts`) — senão o teste de paridade
      quebra.
- [ ] Contrato de resposta: `list`/`get` → `{ data }` 200 · `create` → `{ data }` 201 ·
      `update` → `{ data: { id } }` 200 · `delete` → sem body 204.
- [ ] Persistência via repositório que estende `BaseRepository<DTO>`, mapper como **3º argumento do
      `super`** (`super(db, "entity", entityMapper)`). Normalização (`Timestamp`→ISO,
      `normalizeFirestoreInstant`, `stringIfExists`) fica **no mapper**, não no handler.
- [ ] Mapper exporta **uma instância** (`export const entityMapper = new …`); `toPersistence` usa
      whitelist de chaves.
- [ ] Defaults de campo opcional (`?? null`, `?? true`) aplicados no handler.
- [ ] Header customizado novo foi adicionado em `allowHeaders` do CORS em `apps/api/proxy.ts`.
- [ ] Não importa componente React de `apps/app`.
- [ ] ⚠️ Não use `app/(routes)/auth/*` nem `(guards)/auth.ts` como modelo — são legados
      (`req.json()` sem validação, `{ error: "string" }`). O modelo é `entities/`.

## 2. `apps/app`

- [ ] Chamada à API **só** via `apiClient` (`@/shared/lib/client`) / `@repo/sdk`. Zero `fetch`/axios cru.
- [ ] Server Component por padrão; `"use client"` só com estado/eventos/browser API.
- [ ] Prefetch RSC usa a **mesma `queryKey`** do hook client (de `shared/lib/queryKeys.ts`) e está
      envolvido em `if (!(await isImpersonating()))`.
- [ ] No servidor, **não** reutiliza o `apiClient` singleton — usa `getServerApiClient` (uma instância por
      request), senão headers de auth vazam entre requests concorrentes.
- [ ] Hooks: `useListX` + `fetchXList` no mesmo arquivo; `useFindXById` + `findXById` no mesmo arquivo,
      a função retorna `undefined` sem parâmetro e o `useQuery` tem `enabled` coerente.
- [ ] Toggle de `enabled`: atualização **otimista via `setQueryData`** (lista + detalhe) com rollback no
      `onError` — **sem** `invalidateQueries`. Create/update/delete usam `invalidateQueries`.
- [ ] Erro tratado com `handleClientError(new FormattedError(error, locale))` + `errorAlert`. Sem
      `try/catch` vazio; mutations tratam `onSuccess`/`onError`.
- [ ] Formulário: schema factory `buildXFormSchema(dictionary)` + `zodResolver`; campos via
      `HookFormInput/Textarea/Select/Switch/DateInput/RadioGroup` (de
      `@repo/design-system/components/form/hookform`); prop de erro é **`error`**, nunca `errorMessage`.
- [ ] Layout do formulário: `FormContainer` + `Footer` **dentro** do `<form>` + `Container`
      (`contentOnly`, `loadError`) — os três vêm de `apps/app/shared/components/ui/`.
- [ ] Lista: `Table` do design system com `searchFields`, `onRefresh`, `refreshLoading`, `rowKey`,
      `locale.emptyText`; coluna `enabled` é `Switch` controlado (não texto Sim/Não); miniatura via
      `ResponsiveImage`; ações via `ActionsMenu`.
- [ ] Estados cobertos: loading (skeleton), submit com `isPending` (bloqueia duplo clique), vazio, erro.
- [ ] Impersonação: troca de contexto faz `router.refresh()`, **nunca** `window.location.reload()`; o
      estado de painel vem do snapshot do servidor (`initialPanel`), não de descoberta por rede no cliente
      — ver [`AUTH-PANEL.md`](AUTH-PANEL.md).
- [ ] Nome de arquivo de módulo de feature em camelCase; componente exportado em PascalCase.

## 3. `apps/web`

- [ ] Landing continua Server Component / estática onde possível; sem `"use client"` desnecessário.
- [ ] Metadata/SEO (canonical, hreflang, JSON-LD) coerente com o padrão existente.
- [ ] Roteamento respeita `NEXT_PUBLIC_PRODUCT_MODE` (no `simple` o comum opera na web; no
      `subscription` é redirecionado ao painel) — ver [`AUTH-SSO.md`](AUTH-SSO.md).

## 4. `packages/*`

- [ ] `@repo/sdk`: `export default class XActions` recebendo o `Client`; chamadas via
      `this.client.request<Response<T>>({...})` retornando `data.data`; tipos exportados do mesmo módulo
      ou de `src/types/<recurso>/`; **action registrada no `Client`** (`src/client/index.ts`); sem string
      de produto acoplada; erro propaga (o app mapeia para toast/i18n).
- [ ] `@repo/design-system`: presentacional — **sem fetch, sem sessão**. Componente/tipo novo em
      `components/ui/*` reexportado em `components/ui/index.ts`. `HookForm*` = `Omit<...>` das props
      geridas pelo RHF + `{...rest}` repassado ao componente base; `HookFormSwitch` tem **um único**
      `Switch` dentro do `FormControl`.
- [ ] `@repo/internationalization`: chave existe nos **3 idiomas** com a mesma estrutura; valores neutros;
      não importa rota do Next.
- [ ] Pacote novo: `"private": true`, estende `@repo/typescript-config`.

## 5. i18n

- [ ] **Zero string de UI literal em JSX**: label, placeholder, `aria-label`, toast, título de coluna,
      texto de confirmação, `emptyText`, mensagem de Zod.
- [ ] Chave nova nos 3 idiomas (`pt-br`, `en`, `es`) com estrutura idêntica — rode
      `pnpm --filter @repo/internationalization test` (teste de paridade determinístico).
- [ ] Variável do dicionário com nome descritivo (`entitiesList`, `entityMessages`) — **nunca** `t`/`d`.
- [ ] Locale via `getDictionary()` ou `getDictionaryForLocale(locale)` quando a rota já dá o `[locale]`.

## 6. Testes

- [ ] Lógica nova tem teste: schema (com o dicionário real), mapper, helper puro, hook, rota.
- [ ] Localização `apps/<app>/__tests__/<assunto>.test.ts(x)`; imports explícitos de `vitest`
      (`globals` não está ligado); sem `toBeInTheDocument` (não há jest-dom no setup).
- [ ] Mock nas **bordas**: `@/shared/lib/client`, `@repo/auth/server`, `firebase/*`,
      `@repo/design-system/hooks/useAlert`, `@repo/internationalization/client` — com
      `vi.hoisted` + `vi.mock` **antes** do `await import(...)`.
- [ ] Rota da API: mocka repositório **e** guard (passthrough injetando `ctx.subjectProfile`).
- [ ] Cobre caminho feliz **e** cada caminho de erro (validação, não encontrado, sem permissão,
      ownership de terceiro).
- [ ] ⚠️ `turbo build` depende de `test` — teste quebrado bloqueia build.

## 7. Validação visual (bloqueante em front-end)

Diff que toca `apps/app`, `apps/web` ou `packages/design-system` **não está revisado** sem isto
(regra de ouro 11):

- [ ] App no ar (`pnpm --filter app dev` / `--filter web dev`) e fluxos do diff percorridos de fato com a
      skill `agent-browser` — navegar, preencher, submeter, **observar o resultado**. "Compilou e serviu"
      não é validação.
- [ ] Conferido em **light + dark + mobile** (o `Table` é antd: confirme que respeita o tema).
- [ ] Screenshots do estado normal, vazio, erro e submit em andamento.
- [ ] Comandos do `agent-browser` rodados **em sequência** — chamadas concorrentes travam o daemon e os
      screenshots saem da aba errada.
- [ ] Se o `agent-browser` não estiver disponível, **sinalize explicitamente** que a validação visual não
      foi feita — não trate como aprovada.

## 8. Formato do relatório

```
## Revisão — <escopo>

### 🔴 Bloqueante
- arquivo:linha — <problema> (regra: <qual>). Sugestão: <correção>

### 🟡 Atenção
- ...

### 🟢 Sugestão / nit
- ...

### ✅ OK
- <o que está conforme as convenções>

### 👁 Validação visual
- <fluxos percorridos + screenshots, ou o motivo de não ter sido possível>
```

Se nada for bloqueante, diga claramente. **Não invente problemas**: só reporte o que conseguir confirmar
lendo o código.
