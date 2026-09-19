# Checklist de revisão

**Fonte única** das invariantes que uma revisão de código verifica neste repositório. Lida pelo agent
`code-reviewer` (read-only) e pelo `revisor-codigo` (pipeline `/review`) — não duplique este conteúdo em
outro lugar; corrija aqui.

A fonte de verdade das convenções é o [`CLAUDE.md`](../CLAUDE.md) raiz + os `CLAUDE.md` aninhados
(`apps/api`, `apps/app`, `apps/web`, `packages`) + [`AGENTS.md`](../AGENTS.md). Este arquivo é o destilado
**acionável sobre um diff**.

Verifique **apenas o que o diff toca**. Cite sempre `arquivo:linha` e a regra violada.

## O que a máquina já cobre

Toda PR roda `pnpm turbo run lint typecheck test` no GitHub Actions
([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)). Estes três itens, portanto, **não precisam ser
reexecutados à mão numa revisão**, e um "está verde" só vale como resposta a eles:

| Coberto pelo CI | O que isso garante |
|---|---|
| `pnpm check` (Biome) | formatação, ordenação de imports/atributos, `console.log`, regras de lint |
| `typecheck` nos workspaces que declaram o script | erro de tipo em qualquer app ou pacote |
| `pnpm test` | as suítes Vitest, **inclusive a paridade pt-br/en/es** do `@repo/internationalization` |

A consequência prática é onde a revisão humana precisa se concentrar — e é o resto deste arquivo:
convenção de camada, autorização, ownership, escolha de `queryKey`, string de UI que existe nos 3 idiomas
mas está **errada**, e afirmação de comportamento que ninguém mediu. Nada disso um linter enxerga.

⚠️ **O `build` não está no CI**: `apps/api` exige as `FIREBASE_ADMIN_*` para buildar. Mudança que pode
quebrar o build (import em escopo de módulo que lê env, `next.config`, dependência nova) continua sendo
responsabilidade da revisão e do deploy da Vercel.

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
- [ ] ⚠️ Não use `app/(routes)/auth/*` como modelo — é legado (`req.json()` sem validação,
      `{ error: "string" }`). O modelo é `entities/`.

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
      de produto acoplada; **o erro propaga cru** — nunca embrulhe em `FormattedError` dentro do SDK: só a
      tela conhece o locale, e um erro pré-formatado chega ao `new FormattedError(error, locale)` do app
      como um objeto que ele não sabe ler, derrubando **todo** `error.code` no texto genérico.
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
- [ ] **Nível certo, custo mínimo**: o teste escolhido é o **mais barato que prova o comportamento**.
      Schema, mapper, helper, hook e rota com `vi.mock` do repositório e do guard cobrem praticamente
      tudo — inclusive validação de body, `error.code`, guard e ownership 404.
- [ ] Teste que exige **processo externo de pé** (emulador do Firebase em 9099/8080, app servindo) só
      quando o objeto do teste for a **própria infra**: consulta real que depende de índice ou de
      `orderBy` que o `BaseRepository` não faz, `firestore.rules`/`storage.rules`, serialização
      `Timestamp` ↔ ISO contra o documento real, emissão/revogação de sessão do Firebase Auth. Se existe
      um, o motivo está escrito — qual comportamento ele prova que o unitário não provaria.
- [ ] Sem teste redundante: rota/módulo que já tinha cobertura e cujo **contrato de infra não mudou** não
      ganha cenário novo só por precaução. Teste caro é custo em todo `pnpm test` e em toda PR.
- [ ] ⚠️ `turbo build` depende de `test` — teste quebrado bloqueia build. E o CI roda `test` em toda PR,
      então teste quebrado também bloqueia o merge.

## 7. Execução — quem roda o quê

**A revisão não executa o produto.** Ela lê código, confere invariantes e roda os gates estáticos. Rodar
teste — de unidade ou de ponta a ponta — é do `analista-qa` (`/test`), único dono do `agent-browser` e de
screenshot.

| etapa | executa | evidência que persiste |
|-------|---------|------------------------|
| `/develop` | smoke local, só para se desbloquear | nenhuma |
| `/review` | `pnpm check` · `typecheck` · paridade de i18n | nenhuma |
| `/test` | suíte Vitest **e** fluxo ponta a ponta com `agent-browser` | o **texto** do `test/report.md` |

O screenshot não é evidência que sobrevive: o `.gitignore` descarta `docs/features/**/screenshots/` e
`docs/features/**/test/e2e/` desde 2026-09-09. Ele serve para o agent olhar durante a execução. O que
prova comportamento depois é a descrição escrita — o valor medido, o rótulo exato, o status, o contraste.
Hoje **8 dos 17** `review.md` apontam para prints que já não existem em disco.

Por que assim, medido sobre as 17 features entregues: a validação visual do `/review` rendeu **4** achados,
e em **13 delas rendeu zero** — enquanto custava uma terceira passada pelo mesmo fluxo, uma conta de QA a
mais por rodada e screenshots que o `.gitignore` descarta de qualquer jeito. Os achados graves do `/review`
vieram de **remedir afirmação do handoff** com `curl`, cronômetro ou leitura do documento, não de olhar
imagem. Essa desconfiança continua obrigatória — só mudou de dono. Ver §7.1.

### 7.1 Afirmação da etapa anterior não se verifica sozinha

Em **15 das 17** features entregues o `develop/handoff.md` afirmou algo que a etapa seguinte derrubou, e
**7 dessas eram afirmações de validação visual** — o `/develop` tirou print, olhou e concluiu errado.

- [ ] **`/develop`**: não declare "validado" o que você não mediu. Afirmação de comportamento vai ao
      handoff com **o instrumento que a produziu** (comando, consulta, contagem). Sem instrumento, escreva
      "a verificar no `/test`".
- [ ] **`/review`**: toda afirmação de comportamento do handoff que você **não consegue confirmar lendo o
      código** vira item da lista **"Verificar no `/test`"**, com o repro sugerido. Você não executa —
      nomeia o que precisa ser executado.
- [ ] **`/test`**: começa por essa lista. Afirmação herdada é **hipótese**, não critério aprovado: ou o QA
      mede, ou o critério fica 🔒 não verificado.

### Portas: derrube só o que você subiu

Vale para quem sobe processo — na prática, o `analista-qa`. Agents e usuário disputam as mesmas portas —
**3000** `app` · **3001** `web` · **3002** `api` · **3003** `email` · **9099** Auth emulator · **8080**
Firestore emulator · **4001** UI do emulador. Processo pendurado no fim da validação quebra o próximo
`pnpm dev` do usuário, e o processo é do agent.

- [ ] **Checou a porta antes de subir**: `lsof -ti tcp:3000` (vazio = livre).
- [ ] **Porta ocupada → reutilizou e não derrubou.** O ambiente é do usuário; derrubá-lo no meio do
      trabalho dele é pior do que não rodar a validação. Registre o que foi reutilizado.
- [ ] **Porta livre → subiu em background guardando o PID** (`pnpm --filter api dev &` → `$!`) e **matou
      esses PIDs no final** (`kill <pid>`), confirmando com `lsof -ti tcp:<porta>` que voltou a sair vazio.
- [ ] **Teardown também quando dá errado** — validação que falhou ou foi abortada no meio derruba o que
      subiu do mesmo jeito, antes de escrever o relatório.
- [ ] ⛔ **Nunca `pkill -f node`, `pkill -f next` ou `killall node`.** Isso mata o editor, o dev server do
      usuário e os outros workspaces abertos na máquina. Mate por PID; `lsof -ti tcp:<porta> | xargs kill`
      só na porta que **você** abriu.

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

### 👁 Verificar no `/test`
- <afirmação do handoff que não dá para confirmar lendo o código> — repro sugerido: <como medir>
```

Se nada for bloqueante, diga claramente. **Não invente problemas**: só reporte o que conseguir confirmar
lendo o código.
