# Revisão: retorno da busca da `Table` e foco depois do menu mobile da landing

Escopo: o working tree inteiro da branch, que tem um assunto só (esta feature). Oito arquivos de código e
teste modificados e a pasta `docs/features/table-search-feedback/` não rastreada. Nada no índice
(`git diff --cached --stat` vazio).

## Branch

- Nome: `feat/design-system-refresh`, reutilizada. Já existe no remoto (`origin/feat/design-system-refresh`)
  e tem 63 commits à frente de `origin/main`. A feature nasceu nela e o `STATE.md` aponta para ela.
- Validação do nome pela regex do `/review`: `branch OK: feat/design-system-refresh`. Sem `project` porque
  a branch cruza apps e pacotes, que é a forma sem prefixo aceita.
- Nada renomeado, nenhuma branch criada.

## Revisão — table-search-feedback

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `packages/design-system/components/ui/table.tsx:233`: a região `role="status"` anunciava "Nenhum
  resultado para “termo”." enquanto a tabela mostrava o esqueleto. Acontece quando a pessoa digita durante
  a primeira carga (`dataSource` ainda vazio) ou quando um refresh deixa zero linhas filtradas com
  `loading`. O leitor de tela ouvia "nenhum resultado" ao mesmo tempo que a outra região dizia
  "Carregando…". **Corrigido**: a região fica vazia enquanto `showSkeleton` é verdadeiro. Quando a carga
  termina, o termo já assentado faz a contagem ser anunciada.

### 🟢 Sugestão / nit

- `packages/design-system/components/ui/table.tsx:236-239`: com a lista vazia de verdade e um termo
  digitado, a tela mostra o `locale.emptyText` do chamador (decisão D1 do plano) e a região anuncia "Nenhum
  resultado para “termo”.". As duas frases são verdadeiras, mas diferem. Não dá para anunciar o
  `emptyText`, porque ele é `ReactNode` e pode trazer botão. Ficou como está; ver "Decisões em aberto".
- `packages/design-system/components/ui/table.tsx:464`: o `aria-live="polite"` do paginador ("Página 1
  de N") já existia e muda a cada tecla quando a busca altera o número de páginas. Isso compete com o
  anúncio com debounce desta feature. Fora do escopo (mexe no paginador); entra na lista do `/test`.

### ✅ OK

- `TableProps` não mudou: nenhuma prop nova ou removida no diff. Os 6 consumidores com `searchFields`
  (`grep -rl searchFields apps`) não estão no diff, como o handoff diz.
- `data-slot="table-search"` continua no `input` (`table.tsx:284`), o seletor que o `ActionsMenu` usa
  (`action-menu.tsx:42`).
- O timer do anúncio é limpo no desmonte e a cada mudança de `search` (`table.tsx:180-189`); sem
  `searchFields` o efeito sai cedo e a região não monta (`table.tsx:434`).
- Os quatro desvios do handoff batem com o código. `wrap-anywhere` existe no Tailwind 4.1.16 instalado
  (`grep '"wrap-anywhere"'` no `lib.js` encontra 1 ocorrência) e o design-system escaneia os próprios
  `.tsx` (`styles/globals.css:3`). `updateSearch` zera o termo assentado (`table.tsx:193`). O botão do
  campo tem 24 px (`icon-xs` = `size-6`, `button.tsx:30-31`) num campo de 36 px (`h-9`), então
  `top-1.5` o centra.
- O "Limpar busca" do vazio e o do campo chamam `clearSearch`, que foca o `input` antes de o botão sair do
  DOM.
- Termo de busca entra como texto React (`String.replace` em copy do dicionário); nenhum
  `dangerouslySetInnerHTML`.
- `apps/web/app/[locale]/components/header/index.tsx:87-88`: o comentário explica uma restrição da
  biblioteca (o App Router não move o foco), sem citar o fluxo. Conferi no Next 16.4.6 instalado:
  `layout-router.js:153` diz que o handler deixa o foco intocado.
- `MAIN_CONTENT_ID` substitui os três literais (`layout.ts:2`, `layout.tsx:52`, `header/index.tsx:138`);
  `grep main-content` fora de testes só encontra a constante.
- O `type MouseEvent` importado do React no header não colide com uso do `MouseEvent` do DOM no arquivo.
- i18n: 4 chaves em `components.table` nos 3 idiomas, mesma estrutura, sem string solta em JSX. Os
  botões novos usam o `Button` do design system (`pressable`, `focus-visible:ring-[3px]`); nenhum
  `transition-all`.
- Testes: imports explícitos de `vitest`, sem `toBeInTheDocument`, mock de `@repo/auth/provider` com
  `vi.hoisted` no padrão do `envMock`. A expectativa trocada em `tablePagination.test.tsx` e
  `tableLoadMore.test.tsx` exige o texto certo e a ausência do errado (D8).
- O gate de 6 perguntas do `DESIGN.md` está respondido no handoff.
- Nenhuma suíte E2E (`apps/e2e`) usa a busca da tabela nem o foco do menu da landing.

### 👁 Verificar no `/test`

- **F4, anúncio uma vez por pausa.** O debounce só foi provado com timer falso. Repro: `MutationObserver`
  no `[role=status][aria-atomic=true]` da tabela de entidades, digitar 8 letras seguidas, contar mutações
  com texto (esperado: uma, cerca de 500 ms depois da última tecla). Observar também o `span[aria-live]`
  do paginador: se ele muda a cada tecla, registrar quantas vezes.
- **Silêncio durante a carga** (correção desta revisão). Repro: recarregar `/pt-br/entities`, digitar um
  termo antes de a lista chegar. Esperado: a região de busca fica vazia enquanto o esqueleto aparece e diz
  a contagem quando as linhas chegam.
- **F3, um "x" só.** `[&::-webkit-search-cancel-button]:appearance-none` está no `input`; só o Chrome e o
  Safari confirmam. Repro: digitar no campo e contar os "x" visíveis; conferir o botão centrado no campo
  em claro e escuro.
- **F5, excluir o único resultado.** O `actionMenu.test.tsx` cobre o foco só com a busca vazia. Repro:
  buscar o nome de uma entidade única, excluir pelo teclado; esperado: estado de nenhum resultado com o
  termo e foco no campo.
- **F8, termo longo.** `wrap-anywhere` em célula de tabela com layout automático não foi renderizado.
  Repro: 200 caracteres sem espaço a 390 px; esperado: a frase quebra dentro da célula, sem rolagem
  horizontal da tabela nem da página.
- **W1 a W6, foco no menu mobile.** Os testes trocam o `Link` do Next por `<a>`. Repro: a 390 px, abrir o
  menu, Tab até "Contato", Enter; ler `document.activeElement` depois da navegação (esperado:
  `main#main-content`) e apertar Tab (esperado: primeiro controle do conteúdo). Repetir "Início" na home,
  "Entrar", Ctrl+clique (foco no botão do menu), "Documentação" com `NEXT_PUBLIC_DOCS_URL` e "Sair".
  W5: tocar com o mouse em "Preços" e confirmar que nenhum anel aparece no `main`.
- F1, F2, F6, F7 e F9 do plano, em claro e escuro, 390 px e 1440 px, nos três idiomas.

## Correções aplicadas

| Arquivo | O que mudou |
|---------|-------------|
| `packages/design-system/components/ui/table.tsx:230-235` | `showSkeleton` subiu para antes de `resultAnnouncement`, que passa a devolver `""` enquanto o esqueleto aparece |

Antes:

```tsx
const resultAnnouncement = () => {
  if (!isSearching || settledSearch !== search) {
    return "";
  }
```

Depois:

```tsx
const showSkeleton = Boolean(loading) && filteredRows.length === 0;

const resultAnnouncement = () => {
  if (!isSearching || settledSearch !== search || showSkeleton) {
    return "";
  }
```

## Raio de impacto

- `@repo/design-system` `Table`: as 6 telas com `searchFields` ganham o estado novo sem mudança de código.
  `EntitiesListClient.tsx` e `AuditListClient.tsx` usam `hasMore` e passam a mostrar "Limpar busca" junto
  do `searchPendingPages`. `UsersListClient.tsx`, `OrganizationMembersTable.tsx`,
  `OrganizationInvitationsTable.tsx` e `playground/page.tsx` passam a mostrar "Nenhum resultado para
  “termo”." no lugar do `emptyText` quando a busca não acha nada. Tabelas sem `searchFields` não mudam:
  sem timer e sem região nova.
- `apps/web`: `MAIN_CONTENT_ID` é export novo de `shared/lib/layout.ts`, usado no layout de `[locale]` e
  no header. A barra cheia do header não mudou.
- `@repo/internationalization`: só chaves novas, nenhuma renomeada.

## Lacunas de teste

- **Nova, aberta:** nenhum teste cobre a região vazia durante o esqueleto (correção desta revisão).
  Caso sugerido em `tablePagination.test.tsx`: `loading` com `dataSource: []`, termo digitado e 500 ms
  passados; região vazia; depois `rerender` sem `loading` e com linhas, região com a contagem.
- **Do handoff, aberta:** o comportamento do header depois da navegação real do App Router só aparece com
  o app de pé (W1 a W6). Não cabe em teste de componente.
- **Do plano (F5), aberta:** foco no campo depois de excluir a única linha com busca ativa; o teste de
  `actionMenu` cobre só a busca vazia.

## Decisões em aberto

1. **Anúncio do vazio real com termo.** Hoje a região diz "Nenhum resultado para “termo”." enquanto a tela
   mostra o `emptyText` do chamador. Recomendação: manter. As duas frases são verdadeiras e o `emptyText`
   é `ReactNode`, que não cabe numa região `role="status"`.
2. **Commit intermediário com teste vermelho.** Entre o commit do design-system e o do teste da `app`, o
   `tableLoadMore.test.tsx` antigo falha (compila, mas a expectativa é a velha). Recomendação: manter os
   commits separados, um por workspace como manda a regra, e em sequência; a cabeça da PR fica verde.
   Alternativa: levar `apps/app/__tests__/tableLoadMore.test.tsx` para dentro do commit do design-system.

## Gates estáticos

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint | `pnpm check` | 1182 arquivos, nenhuma correção, saída 0 |
| Typecheck | `pnpm turbo run typecheck --filter=@repo/design-system --filter=app --filter=web` | 3 tarefas OK (1 do cache), depois da correção |
| Paridade de i18n | `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes, verde |

Sem `--force`. A suíte Vitest dos workspaces não foi rodada aqui (é do `/test`); os números do handoff
são de antes da correção em `table.tsx:233`.

Varredura de segredo em `docs/features/table-search-feedback/`: a única ocorrência de "token" é "Nenhum
token novo" (`analyze/plan.md:185`, token de design). Nenhuma senha, chave ou e-mail.

## Plano de commits

Ordem escolhida para cada commit compilar sozinho: as chaves de i18n sobem antes do design-system, que
as lê.

1. `feat(internationalization): add table search feedback copy`
   - `packages/internationalization/translations/components/ui/table.ts`
2. `feat(design-system): tell an empty search apart from an empty list in Table`
   - `packages/design-system/components/ui/table.tsx`
   - `packages/design-system/__tests__/tablePagination.test.tsx`
3. `test(app): expect the no-results state when a search misses loaded rows`
   - `apps/app/__tests__/tableLoadMore.test.tsx`
4. `fix(web): move focus to the main content after following a mobile menu link`
   - `apps/web/shared/lib/layout.ts`
   - `apps/web/app/[locale]/layout.tsx`
   - `apps/web/app/[locale]/components/header/index.tsx`
   - `apps/web/__tests__/headerMobileMenu.test.tsx`
5. `docs(features): table-search-feedback`
   - `docs/features/table-search-feedback/STATE.md`
   - `docs/features/table-search-feedback/analyze/plan.md`
   - `docs/features/table-search-feedback/develop/handoff.md`
   - `docs/features/table-search-feedback/review/review.md`

Título de PR sugerido, se a branch ainda não tiver PR: `feat: tell an empty table search apart and keep
focus after the mobile menu`.

Commits realizados:

<!-- preenchido pelo /review depois de commitar -->
