# Plano: retorno da busca da `Table` e foco depois do menu mobile da landing

- **Tarefa:** direta, sem spec. Rodada do `/cycle` na branch `feat/design-system-refresh` (não mergeada).
- **Origem dos achados:**
  - Busca da `Table`: `docs/features/design-refresh-polish/test/report.md:155-156` e
    `docs/features/design-refresh-followups/test/report.md`. A tabela de entidades mostra "Nenhuma entidade
    cadastrada." depois de uma busca sem resultado, com outras entidades fora do filtro.
  - Foco do menu mobile: `specs/reference/AUDIT.md:390` e `:1294` ("seguem abertos o clique fora e o foco no
    `body` depois de seguir um link"). O clique fora já foi resolvido nesta branch
    (`apps/web/app/[locale]/components/header/index.tsx:95-101`) e está coberto em
    `apps/web/__tests__/headerMobileMenu.test.tsx:193-254`. Falta o foco.
- **Pré-requisito de infra:** nenhum. Sem env nova, sem índice, sem regra, sem rota de API.

## 1. Contexto

### 1.1 O problema

**Busca da `Table`.** O texto de vazio escolhido em `packages/design-system/components/ui/table.tsx:178-183`
tem dois casos: com busca ativa e páginas pendentes (`hasMore`), a tabela diz que nada foi achado no que já
carregou (`searchPendingPages`); em qualquer outro caso, mostra o `locale.emptyText` do chamador. O segundo
caso mente quando há busca: "Nenhuma entidade cadastrada." aparece com entidades cadastradas que só não
batem com o termo. Quem lê acha que perdeu os dados. O leitor de tela não recebe nenhum aviso de quantos
resultados a busca trouxe, e o campo não tem um jeito acessível de ser limpo: o "x" nativo do
`type="search"` só existe no Chrome e no Safari e fica fora da ordem de Tab.

Dois testes congelam o comportamento errado e terão a expectativa trocada (ver §7):
`packages/design-system/__tests__/tablePagination.test.tsx:312` ("mostra o texto de vazio quando a busca
não encontra nada") e `apps/app/__tests__/tableLoadMore.test.tsx:62` ("mantém o texto de vazio do chamador
quando não há mais páginas para carregar").

**Menu mobile da landing.** Os links do painel chamam `closeMenu` (`header/index.tsx:282`, `:318`). O painel
desmonta, o link focado sai do DOM e o foco cai no `body`. O Next 16.4.6 não move o foco na navegação do
App Router: o próprio código diz "This handler intentionally leaves focus untouched; resetting focus on
navigation is deferred" (`apps/web/node_modules/next/dist/client/components/layout-router.js:153-154`). Na
home, "Início" nem muda a rota, então quem usa teclado fica sem foco visível e recomeça do topo
(`AUDIT.md:1294`).

### 1.2 Objetivos

1. Com busca ativa, sem resultado e com registros fora do filtro, a tabela diz **"Nenhum resultado para
   “<termo>”."**, distinto do vazio real, e oferece **"Limpar busca"**. O botão limpa o campo e devolve o
   foco a ele.
2. O campo de busca ganha um botão de limpar próprio, dentro do campo, visível só com texto.
3. O leitor de tela ouve a contagem de resultados quando a digitação para, e não a cada tecla.
4. No menu mobile da landing, seguir um link interno leva o foco ao `main#main-content`, o mesmo alvo do
   skip link (`header/index.tsx:117-122`, `apps/web/app/[locale]/layout.tsx:49-53`).

### 1.3 Corte de MVP e fora de escopo

Dentro do corte: os quatro objetivos acima, na `Table` do design system e no `Header` da web, sem mudar
nenhum consumidor.

Fora de escopo:

- Escape para limpar a busca. O Chrome e o Safari já limpam `type="search"` no Esc e disparam `input`, o que
  passa pelo `onChange`. O Firefox não; fica como está.
- Contagem visível na tela. O pedido é o anúncio; a contagem visível muda a hierarquia de todas as listas e
  pede decisão de design.
- Busca no servidor. O filtro continua em memória sobre as linhas carregadas (`table.tsx:151-164`).
- Foco depois do "Ir para o painel" (`header/index.tsx:291-297`): é navegação de página inteira, o
  navegador reinicia o foco.
- Os outros achados de foco do `AUDIT.md` (diálogos, botão de enviar).

### 1.4 Apps e modo de produto

| Onde | O que muda |
|------|-----------|
| `packages/design-system` | `table.tsx` |
| `packages/internationalization` | `translations/components/ui/table.ts` (4 chaves × 3 idiomas) |
| `apps/web` | `header/index.tsx`, `layout.tsx`, `shared/lib/layout.ts` |
| `apps/app` | nenhum arquivo de produção; só o teste `tableLoadMore.test.tsx` |
| `apps/api`, `packages/sdk` | nada |

Modo `subscription` × `simple`: indiferente. Área comum e admin recebem o mesmo comportamento, porque a
`Table` é compartilhada.

**Consumidores da `Table` com `searchFields`** (`grep searchFields apps`): são 6 arquivos, não 7, e nenhum
muda.

| Arquivo | `hasMore` |
|---------|-----------|
| `apps/app/.../entities/(pages)/(home)/EntitiesListClient.tsx:197` | sim (`:189`) |
| `apps/app/.../admin/(pages)/audit/(pages)/(home)/AuditListClient.tsx:162` | sim (`:153`) |
| `apps/app/.../admin/(pages)/users/(pages)/(home)/UsersListClient.tsx:236` | não |
| `apps/app/.../organization/(components)/OrganizationMembersTable.tsx:150` | não |
| `apps/app/.../organization/(components)/OrganizationInvitationsTable.tsx:115` | não |
| `apps/app/.../playground/page.tsx:1219` | não |

## 2 a 4. Dados, contrato e API

N/A. Nenhum campo, coleção, DTO, action, rota ou `error.code` novo.

## 5. Front-end

### 5.1 `Table`: qual estado de vazio aparece

Termos usados abaixo: `searchTerm = search.trim()`; `isSearching = searchFields?.length > 0 && searchTerm !== ""`;
`hasRecords = (dataSource?.length ?? 0) > 0`.

| Situação | Texto | Ícone | "Limpar busca" |
|----------|-------|-------|----------------|
| `isSearching` e `hasMore` | `searchPendingPages` (já existe) | `SearchXIcon` | sim |
| `isSearching`, sem `hasMore`, `hasRecords` | `searchNoResults` com `{term}` | `SearchXIcon` | sim |
| `isSearching` e lista vazia, sem `hasMore` | `locale.emptyText` do chamador | `InboxIcon` | não |
| sem busca | `locale.emptyText` do chamador | `InboxIcon` | não |

A terceira linha mantém o texto do chamador porque ali ele é verdadeiro: não há nada cadastrado, e o texto
do chamador pode trazer a primeira ação da tela (`docs/DESIGN.md`, "Estados que toda tela com dados tem").
A primeira linha só ganha o botão; o texto atual continua certo.

O termo exibido é o `searchTerm` (sem espaços nas pontas), inserido com `.replace("{term}", …)` como texto
React, sem HTML. Termo longo quebra com `break-words` dentro do `max-w-sm` que já existe (`table.tsx:301`).

**"Limpar busca" no vazio.** `Button` `variant="outline"` `size="sm"` abaixo do texto. No clique:
`setSearch("")`, `setPage(1)` e foco no campo por ref. O foco precisa ir explicitamente: o botão sai do DOM
assim que as linhas voltam.

### 5.2 `Table`: botão de limpar dentro do campo

- `Button` `variant="ghost"` `size="icon-xs"` (`button.tsx:30-31`, 24×24 px, o mínimo da WCAG 2.5.8),
  `aria-label={tableCopy.clearSearch}`, `XIcon`, posicionado à direita dentro do campo.
- Renderizado só com `search !== ""`. Na ordem de Tab fica entre o campo e o "Atualizar".
- O clique faz o mesmo que o botão do vazio: limpa, volta à página 1 e foca o campo.
- O "x" nativo do WebKit some com `[&::-webkit-search-cancel-button]:appearance-none` no `input`, para não
  aparecerem dois. O `type="search"` fica (papel `searchbox`, que os testes já usam).
- O `input` passa de `pr-3` para `pr-9`, para o texto não correr por baixo do botão.
- O `data-slot="table-search"` continua no `input`. O `ActionsMenu` procura esse seletor para devolver o
  foco à busca quando a única linha é excluída (`action-menu.tsx:42`, `:86`).

### 5.3 `Table`: anúncio da contagem

- Uma região `sr-only` com `role="status"` e `aria-atomic="true"`, **sempre montada** quando há
  `searchFields`. Região viva montada junto com o texto costuma não ser lida; o texto muda dentro dela.
- Debounce de **500 ms** (`SEARCH_ANNOUNCE_DELAY_MS`): um `useEffect` sobre `search` grava
  `announcedSearch` depois do intervalo e limpa o timer a cada tecla. A região só tem texto quando
  `isSearching && announcedSearch === search`. Enquanto a pessoa digita, a região fica vazia; quando ela
  para, ouve um anúncio só.
- O conteúdo:
  - 0 linhas com `hasMore`: `searchPendingPages`;
  - 0 linhas sem `hasMore`: `searchNoResults` com o termo;
  - 1 linha: `searchResultsOne`;
  - n linhas: `searchResults` com `{count}` = `filteredRows.length` (todas as filtradas, não só a página
    visível).
- Sem busca, a região fica vazia. Limpar a busca não gera anúncio: as linhas voltando já são o retorno, e
  o foco vai ao campo.
- Se as linhas carregadas mudarem com o termo parado (o "Carregar mais"), a contagem nova é anunciada. Isso
  é o esperado: o número mudou.

O singular e o plural seguem o padrão do repo de chave irmã com sufixo `One` (`neverNotice` /
`neverNoticeOne` em `translations/apps/app/pages/admin/home.ts:44-47`, usado em
`UserActivitySection.tsx:120`).

### 5.4 Menu mobile da landing

Um handler único para os links do painel, chamado no `onClick` dos itens de `navigationItems`
(`header/index.tsx:277-287`) e do "Entrar" (`:310-321`):

- **Clique simples em link interno** (botão 0, sem Ctrl, Meta, Shift ou Alt; o Enter do teclado chega assim):
  fecha o menu e chama `document.getElementById(MAIN_CONTENT_ID)?.focus({ preventScroll: true })`. O `main`
  vive no layout raiz de `[locale]` e não desmonta na navegação, então o foco sobrevive à troca de página.
  O `preventScroll` deixa a rolagem por conta do Next. Na home, "Início" leva o foco ao `main` também.
- **Link externo (documentação, `target="_blank"`) ou clique com modificador** (abre outra aba): fecha o
  menu e devolve o foco ao botão do menu, como o Escape já faz (`:87-91`). A página atual não muda, e o
  botão é o último ponto de referência que continua na tela.
- **"Sair"** (`:299-307`): mesmo defeito, o botão some com o painel. Passa a devolver o foco ao botão do
  menu. Uma linha, no mesmo arquivo (D7).

O `main` tem `tabIndex={-1}` e `outline-none` (`layout.tsx:49-53`), então não aparece anel de foco; o
próximo Tab vai ao primeiro controle do conteúdo. É o mesmo comportamento do skip link. O anúncio da
página nova continua com o route announcer do Next.

Para o id não virar três literais soltos, `MAIN_CONTENT_ID = "main-content"` vai para
`apps/web/shared/lib/layout.ts`, ao lado de `pageContainer`, e é usado no `layout.tsx` (`id`) e no header
(`href` do skip link e o `getElementById`).

### 5.5 i18n

Quatro chaves novas em `components.table`, nos três idiomas (§10.3). O `parity.test.ts` do pacote cobre a
paridade. A web não ganha chave.

### 5.6 Direção visual

A superfície é de operar. O que vence o estado de busca vazia é a frase com o termo; o botão é secundário
(`outline`, `sm`). O `SearchXIcon` no lugar do `InboxIcon` diferencia "a busca não achou" de "não há nada"
antes da leitura. Nenhum token novo. ThinkUI e Uizze não foram consultados (sem chave nesta rodada).

## 6. Autorização e segurança

N/A para guard e ownership. O termo de busca é renderizado como texto React; nenhum `dangerouslySetInnerHTML`.
Impersonação não muda nada: a `Table` não decide permissão.

## 7. Testes

Todos no nível de componente (Vitest + jsdom + Testing Library), nos arquivos que já existem. Nenhum precisa
de emulador nem de app de pé.

**`packages/design-system/__tests__/tablePagination.test.tsx`** (onde vivem os casos de busca da `Table`):

1. Troca de expectativa em `:312`: busca sem resultado com 25 registros mostra
   `searchNoResults` com o termo e **não** mostra `EMPTY_TEXT`. É a correção do defeito; a expectativa
   antiga congelava o texto falso.
2. Busca ativa com `dataSource: []` mantém `EMPTY_TEXT` e não mostra "Limpar busca".
3. "Limpar busca" do vazio: as linhas voltam, o campo fica vazio, `document.activeElement` é o `searchbox`.
4. Botão de limpar do campo: ausente com o campo vazio; presente com texto; clicar limpa e foca o campo.
5. Anúncio com `vi.useFakeTimers()`: depois de digitar, antes de 500 ms a região `status` está vazia; depois
   de `advanceTimersByTime(500)` dentro de `act`, diz `searchResults` com a contagem certa. Duas mudanças
   com 200 ms de intervalo geram um texto só, o do termo final.
6. Anúncio singular (`searchResultsOne`) e de zero (`searchNoResults`).

**`apps/app/__tests__/tableLoadMore.test.tsx`:**

7. Troca de expectativa em `:62`: sem `hasMore`, a busca sem resultado mostra `searchNoResults`, não
   `CALLER_EMPTY_TEXT`. Mesmo motivo do item 1.
8. Com `hasMore`, o vazio da busca mostra `searchPendingPages` **e** o "Limpar busca".

**`packages/design-system/__tests__/actionMenu.test.tsx:507-521`** ("moves focus to the table search when
the only row is deleted") tem de continuar verde sem mudança. É a prova de que o `data-slot` não saiu do
`input`.

**`apps/web/__tests__/headerMobileMenu.test.tsx`** (`renderHeader` passa a renderizar um
`<main id="main-content" tabIndex={-1} />` ao lado do `Header`):

9. Clicar em "Contato" no painel deixa `document.activeElement` no `main`.
10. Clicar em "Início" faz o mesmo (o caso da home, `AUDIT.md:1294`).
11. Clicar em "Entrar" no painel faz o mesmo.
12. Com `NEXT_PUBLIC_DOCS_URL`, clicar em "Documentação" devolve o foco ao botão do menu.
13. Clique com `ctrlKey` em "Contato" devolve o foco ao botão do menu, não ao `main`.
14. "Sair" devolve o foco ao botão do menu. Pede trocar o mock fixo de `@repo/auth/provider` (`:26-32`) por
    um `vi.hoisted` com `user` configurável, no padrão do `envMock` do mesmo arquivo.

O caso do Escape (`:319-336`) segue verde sem mudança.

Comandos: `pnpm --filter @repo/design-system test`, `pnpm --filter app test`, `pnpm --filter web test`,
`pnpm --filter @repo/internationalization test`.

## 8. O que o `/test` percorre

Uma passada, light e dark, 390 px e 1440 px, nos três idiomas.

**Painel (`apps/app`, emulador com seed, usuário comum):**

| # | Fluxo | Como produzir | Esperado |
|---|-------|---------------|----------|
| F1 | Busca sem resultado | `/pt-br/entities` com 2+ entidades; buscar `zzz-sem-match` | "Nenhum resultado para “zzz-sem-match”.", `SearchX`, botão "Limpar busca"; "Nenhuma entidade cadastrada." ausente |
| F2 | Limpar pelo vazio | a partir de F1, Tab até "Limpar busca", Enter | linhas de volta, campo vazio, foco no campo com anel visível |
| F3 | Limpar pelo campo | digitar algo; Tab do campo | o próximo foco é o "x" (nome "Limpar busca"); Enter limpa e devolve o foco; com o campo vazio o "x" não existe; um "x" só no Chrome |
| F4 | Anúncio | digitar um termo com várias letras; ler `[role=status]` dentro da tabela e contar mutações com `MutationObserver` | texto vazio enquanto digita; depois de ~500 ms, "N resultados"; uma mutação com texto por pausa, não uma por tecla |
| F5 | Excluir o único resultado (repro do relatório) | buscar o nome de uma entidade única, excluir pelo teclado | estado F1 com o termo; foco no campo de busca (comportamento de `design-refresh-polish` preservado) |
| F6 | Páginas pendentes | mais de 20 entidades (`ENTITIES_PAGE_SIZE`, `apps/app/shared/lib/pagination.ts:5`); buscar termo de uma entidade que não carregou | texto `searchPendingPages` e o botão "Limpar busca" |
| F7 | Vazio real | usuário de QA sem entidades; com e sem termo na busca | "Nenhuma entidade cadastrada.", `Inbox`, sem "Limpar busca" |
| F8 | Excesso | termo de 200 caracteres sem espaço, a 390 px | a frase quebra dentro da célula, sem rolagem horizontal da página |
| F9 | Outro consumidor | `/pt-br/admin/users` como admin, busca sem resultado | mesmo estado de F1 com o termo |

**Landing (`apps/web`, 390 px, teclado):**

| # | Fluxo | Esperado |
|---|-------|----------|
| W1 | Abrir o menu, Tab até "Contato", Enter | na `/contact`, `document.activeElement` é `main#main-content`; o próximo Tab vai ao primeiro controle do conteúdo, não ao skip link |
| W2 | Na home, "Início" pelo menu | foco no `main`, não no `body` |
| W3 | "Entrar" pelo menu | foco no `main` da página de login |
| W4 | "Documentação" (precisa de `NEXT_PUBLIC_DOCS_URL` no `.env.local` da web) | aba nova; na aba de origem, foco no botão do menu. Sem a variável, o link não existe e o fluxo fica 🔒 |
| W5 | Toque com o mouse em "Preços" | navega; nenhum anel de foco aparece no `main` |
| W6 | "Sair" pelo menu, logado na landing | foco no botão do menu |

Sem infra externa: tudo roda com o emulador e os servidores locais que o `/test` já sobe.

## 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Busca sem resultado não diz que a lista está vazia**
  Com registros carregados e uma busca que não casa com nenhum, a tabela mostra "Nenhum resultado para
  “<termo>”." com o termo sem espaços nas pontas, e o `emptyText` do chamador não aparece. Vale para as 6
  telas com `searchFields`, sem mudança em nenhuma delas. Termo só com espaços não conta como busca.

- [ ] **Vazio real continua com o texto do chamador**
  Com `dataSource` vazio, com ou sem termo digitado e sem `hasMore`, aparece o `locale.emptyText` do
  chamador com o ícone de caixa de entrada e sem botão de limpar. Esse texto é verdadeiro ali e pode levar a
  primeira ação da tela.

- [ ] **Busca com páginas pendentes mantém o aviso e ganha a ação de limpar**
  Com `hasMore` e busca sem resultado, o texto continua o `searchPendingPages`, agora com o botão "Limpar
  busca". O "Carregar mais" continua abaixo da tabela.

- [ ] **"Limpar busca" no estado vazio limpa e devolve o foco**
  O clique ou o Enter no botão esvazia o campo, volta à página 1 e põe o foco no campo de busca. Com o mouse
  ou o teclado, o foco nunca termina no `body`.

- [ ] **Botão de limpar dentro do campo**
  Com texto no campo, um botão com nome acessível "Limpar busca" (nos três idiomas) aparece à direita, na
  ordem de Tab logo depois do campo, e faz o mesmo que o botão do vazio. Com o campo vazio ele não existe.
  No Chrome e no Safari só um "x" aparece.

- [ ] **Contagem anunciada sem ruído**
  Uma região `role="status"` anuncia "N resultados", "1 resultado" ou o texto de nenhum resultado 500 ms
  depois da última tecla. Digitação contínua não gera um anúncio por tecla. Sem busca, a região fica vazia.

- [ ] **Excluir o único resultado da busca**
  Depois de excluir pelo teclado a única linha filtrada, a tabela mostra o estado de nenhum resultado com o
  termo, e o foco vai ao campo de busca, como já fazia.

- [ ] **Termo longo não quebra o layout**
  Um termo de 200 caracteres sem espaço quebra dentro da célula a 390 px, sem rolagem horizontal da página,
  em claro e escuro.

- [ ] **Link interno do menu mobile leva o foco ao conteúdo**
  Seguir "Início", "Preços", "Contato" ou "Entrar" pelo menu mobile, com clique simples ou Enter, deixa o
  foco no `main#main-content`. Na home, "Início" faz o mesmo, mesmo sem mudar a rota. Nenhum anel de foco
  aparece no `main`.

- [ ] **Link externo, clique com modificador e "Sair" devolvem o foco ao botão do menu**
  "Documentação" (aba nova), Ctrl/Cmd+clique num link interno e "Sair" fecham o menu e põem o foco no botão
  do menu. O Escape continua fazendo o mesmo.

- [ ] **Copy nos três idiomas**
  As quatro chaves novas existem em pt-br, en e es com a mesma estrutura, e o teste de paridade passa.

## 10. Blueprint técnico

### 10.1 `packages/design-system/components/ui/table.tsx` (pseudo-diff)

```tsx
import { ..., SearchXIcon, XIcon } from "lucide-react";
import { ..., useEffect, useRef } from "react";

const SEARCH_ANNOUNCE_DELAY_MS = 500;

// dentro de Table
const searchInputRef = useRef<HTMLInputElement>(null);
const [announcedSearch, setAnnouncedSearch] = useState("");

useEffect(() => {
  const timer = setTimeout(() => setAnnouncedSearch(search), SEARCH_ANNOUNCE_DELAY_MS);
  return () => clearTimeout(timer);
}, [search]);

const clearSearch = () => {
  setSearch("");
  setPage(1);
  searchInputRef.current?.focus();
};

const searchTerm = search.trim();
const isSearching = Boolean(searchFields?.length && searchTerm);
const searchMissesPendingPages = isSearching && Boolean(hasMore);
const searchFoundNothing =
  isSearching && filteredRows.length === 0 && (dataSource?.length ?? 0) > 0;
const noResultsText = tableCopy.searchNoResults.replace("{term}", searchTerm);

let searchEmptyText: string | null = null;
if (searchMissesPendingPages) searchEmptyText = tableCopy.searchPendingPages;
else if (searchFoundNothing) searchEmptyText = noResultsText;

function resultAnnouncement() {
  if (!isSearching || announcedSearch !== search) return "";
  if (filteredRows.length === 0)
    return searchMissesPendingPages ? tableCopy.searchPendingPages : noResultsText;
  if (filteredRows.length === 1) return tableCopy.searchResultsOne;
  return tableCopy.searchResults.replace("{count}", String(filteredRows.length));
}
```

```tsx
// campo de busca
<input
  className="... pr-9 pl-9 ... [&::-webkit-search-cancel-button]:appearance-none"
  data-slot="table-search"
  ref={searchInputRef}
  ...
/>
{search ? (
  <Button
    aria-label={tableCopy.clearSearch}
    className="-translate-y-1/2 absolute top-1/2 right-1.5"
    onClick={clearSearch}
    size="icon-xs"
    type="button"
    variant="ghost"
  >
    <XIcon aria-hidden="true" />
  </Button>
) : null}
```

```tsx
// célula de vazio
<span className="...">
  {searchEmptyText
    ? <SearchXIcon aria-hidden="true" className="size-5" />
    : <InboxIcon aria-hidden="true" className="size-5" />}
</span>
<p className="max-w-sm break-words text-muted-foreground text-sm">
  {searchEmptyText ?? locale?.emptyText}
</p>
{searchEmptyText ? (
  <Button onClick={clearSearch} size="sm" type="button" variant="outline">
    {tableCopy.clearSearch}
  </Button>
) : null}
```

```tsx
// região viva, irmã do container da tabela, montada sempre que há searchFields
{searchFields?.length ? (
  <p aria-atomic="true" className="sr-only" role="status">
    {resultAnnouncement()}
  </p>
) : null}
```

A variável `emptyText` (`table.tsx:181-183`) é substituída por `searchEmptyText ?? locale?.emptyText`. O
comentário de `:175-177` continua valendo para o caso `hasMore` e fica junto de `searchMissesPendingPages`.
Nenhuma prop nova; a interface `TableProps` não muda.

### 10.2 `apps/web` (pseudo-diff)

```ts
// apps/web/shared/lib/layout.ts
export const pageContainer = "mx-auto w-full max-w-6xl px-4 sm:px-6";
export const MAIN_CONTENT_ID = "main-content";
```

```tsx
// apps/web/app/[locale]/layout.tsx
<main className="outline-none" id={MAIN_CONTENT_ID} tabIndex={-1}>
```

```tsx
// apps/web/app/[locale]/components/header/index.tsx
import type { MouseEvent } from "react";
import { MAIN_CONTENT_ID, pageContainer } from "@/shared/lib/layout";

const isPlainActivation = (event: MouseEvent) =>
  event.button === 0 &&
  !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);

// dentro de Header
const returnFocusToMenuButton = () => menuButtonRef.current?.focus();

const followPanelLink =
  (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    closeMenu();
    if (isPlainActivation(event) && !isExternal(href)) {
      document.getElementById(MAIN_CONTENT_ID)?.focus({ preventScroll: true });
      return;
    }
    returnFocusToMenuButton();
  };

<a href={`#${MAIN_CONTENT_ID}`}>…skip link…</a>
// itens do painel e "Entrar"
<Link onClick={followPanelLink(item.href)} … />
<Link onClick={followPanelLink(`/${locale}/sign-in`)} … />
// "Sair"
onClick={() => { closeMenu(); returnFocusToMenuButton(); signOutOfLanding(); }}
```

Os links da barra cheia (`:162-182`) não mudam: não ficam dentro de um painel que desmonta.

### 10.3 i18n: `packages/internationalization/translations/components/ui/table.ts`

| Chave | pt-br | en | es |
|-------|-------|----|----|
| `searchNoResults` | `Nenhum resultado para “{term}”.` | `No results for “{term}”.` | `Sin resultados para “{term}”.` |
| `clearSearch` | `Limpar busca` | `Clear search` | `Limpiar búsqueda` |
| `searchResults` | `{count} resultados` | `{count} results` | `{count} resultados` |
| `searchResultsOne` | `1 resultado` | `1 result` | `1 resultado` |

### 10.4 Ordem de implementação e commits

Sem SDK nem API. Ordem: design-system → web → i18n → artefatos.

1. `feat(design-system): tell an empty search apart from an empty list in Table`: `table.tsx` (estado de
   vazio da busca, botão de limpar no vazio e no campo, região viva) e
   `__tests__/tablePagination.test.tsx`.
2. `test(app): expect the no-results state when a search misses loaded rows`:
   `apps/app/__tests__/tableLoadMore.test.tsx`.
3. `fix(web): move focus to the main content after following a mobile menu link`: `shared/lib/layout.ts`,
   `app/[locale]/layout.tsx`, `header/index.tsx`, `__tests__/headerMobileMenu.test.tsx`.
4. `feat(internationalization): add table search feedback copy`: `translations/components/ui/table.ts`.
5. `docs(features): table-search-feedback`.

O commit 1 depende das chaves do 4 para o typecheck. Se o `/review` preferir cada commit compilando
sozinho, o 4 sobe para antes do 1; a regra do repo põe i18n no fim, e é ela que o plano segue.

### 10.5 Env e config

Nenhuma.

## Perguntas em aberto (todas com a opção adotada)

- **D1. Lista vazia com termo digitado.** Adotado: mostrar o `emptyText` do chamador, não "nenhum
  resultado". Com nada cadastrado, o texto do chamador é o verdadeiro e pode carregar a primeira ação.
- **D2. Quando anunciar.** Adotado: debounce de 500 ms, anunciando a contagem de todas as linhas filtradas.
  Evita um anúncio por tecla e cabe numa pausa normal de digitação. Alternativa descartada: anunciar só no
  blur, que não ajuda quem digita e espera.
- **D3. Contagem visível.** Adotado: só para leitor de tela, como pedido. A contagem visível mexe na
  hierarquia de 6 telas e pede decisão de design.
- **D4. Escape limpa a busca.** Adotado: não tratar. O Chrome e o Safari já limpam nativamente; o Firefox
  fica como está. Menor raio.
- **D5. Aspas na copy.** Adotado: “” nos três idiomas, por consistência. O espanhol aceita «» também; a
  troca é de uma linha se o fork preferir.
- **D6. Link externo e clique com modificador no menu.** Adotado: foco no botão do menu, como o Escape. O
  `main` não faz sentido quando a página atual não muda.
- **D7. "Sair" no menu mobile.** Adotado: incluir, devolvendo o foco ao botão do menu. É o mesmo defeito
  (o controle some com o painel), no mesmo arquivo, e a `cycle-policy` §3 manda corrigir defeito achado no
  caminho.
- **D8. Testes que congelavam o texto falso.** Adotado: trocar a expectativa de
  `tablePagination.test.tsx:312` e `tableLoadMore.test.tsx:62`. A mudança de comportamento é a correção, e
  o teste novo exige mais (o texto certo e a ausência do errado), não menos.
- **D9. Número de consumidores.** A tarefa citava 7 telas com `searchFields`; o código tem 6 arquivos (§1.4).
  Nenhum muda.
