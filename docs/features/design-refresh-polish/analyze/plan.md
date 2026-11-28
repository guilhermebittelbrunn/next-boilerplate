# Plano: acabamento final da branch de design

Tarefa direta (sem spec), na branch `feat/design-system-refresh`, que ainda não foi mergeada. Fecha os quatro
achados pequenos que sobraram da rodada anterior:

- `docs/features/design-refresh-followups/test/report.md:109-111` (seletor de tamanho que some e foco no `body`
  depois de excluir);
- `specs/reference/AUDIT.md`, nas linhas da tabela de achados que tratam do foco depois de excluir, do
  `MetricStrip` com quatro itens e da ausência de `themeColor`.

Sem API, sem SDK, sem Firestore, sem i18n novo, sem variável de ambiente. Pré-requisito de infra: nenhum.

## Etapa 1: análise

### 1. Contexto

| # | Achado | Onde | Quem sente |
|---|--------|------|------------|
| A | Depois de excluir uma linha pelo `ActionsMenu`, o foco cai no `body` | `packages/design-system/components/ui/action-menu.tsx`, consumido em `EntitiesListClient.tsx:145`, `UsersListClient.tsx:180`, `OrganizationInvitationsTable.tsx:71`, `OrganizationMembersTable.tsx:93` | quem navega por teclado ou leitor de tela recomeça do topo da página |
| B | Nenhum layout define `themeColor` | `apps/app/app/layout.tsx`, `apps/web/app/[locale]/layout.tsx` (nenhum dos dois exporta `viewport`) | a barra do navegador móvel fica na cor padrão, destoando do fundo off-white e do escuro azulado |
| C | `MetricStrip` com 4 ou mais itens cai no layout de 3 colunas | `apps/app/shared/components/ui/MetricStrip.tsx:18-22`, `:37` | o quarto item vai para uma linha nova, com divisória errada. Nenhuma tela usa 4 hoje (os consumidores têm 2, 2 e 3 itens), então o defeito chega no primeiro fork que acrescentar uma métrica |
| D | `Table` com `hideOnSinglePage`: escolher 20 linhas quando tudo cabe numa página esconde o paginador inteiro, seletor incluído | `packages/design-system/components/ui/table.tsx:185-188` | o admin em `/admin/users` (`UsersListClient.tsx:231-232`) só volta a 10 recarregando a rota |

**Objetivo**: corrigir os quatro sem mudar contrato público além de dois atributos `data-slot` novos.

**Fora de escopo**

- Sincronizar o `theme-color` com o tema escolhido dentro do app (ver B e a pergunta 1).
- Reescrever o `MetricStrip` com outra técnica de divisória para os layouts de 2 e 3 itens, que funcionam.
- Mudar o `hideOnSinglePage` quando `showSizeChanger` está desligado.
- Gerenciar foco depois de excluir fora de uma `Table` (o `ActionsMenu` solto, como no playground, mantém o
  comportamento de hoje).

**Corte de MVP**: os quatro itens, cada um na menor mudança que resolve. Tudo é genérico e mora onde já morava
(`design-system` para A, B e D; `apps/app/shared` para C).

**Apps impactados**: `packages/design-system` (A, B, D), `apps/app` (B, C e a demonstração no playground),
`apps/web` (B). Área do painel: comum e admin, porque o `ActionsMenu` e a `Table` aparecem nas duas. Modo de
produto, assinatura e impersonação não mudam nada aqui. Sob impersonação, `EntitiesListClient.tsx:147-149`
já tira o `onDelete`, então o fluxo de A nem aparece.

### 1.1 Fontes

Lidas: o relatório do último `/test` e o `AUDIT.md` citados acima, `docs/DESIGN.md` §4 e §5, o código dos
arquivos citados e o código-fonte do `@radix-ui/react-focus-scope@1.3.1` instalado. Não há link externo nem
referência não lida.

### 2. Dados (Firestore)

N/A.

### 3. Contrato `@repo/sdk`

N/A.

### 4. API

N/A.

### 5. Front

#### A. Foco depois de excluir

**Por que o foco se perde.** Os quatro consumidores chamam `mutation.mutate(id)` sem esperar
(`EntitiesListClient.tsx:149`, `UsersListClient.tsx:190`). O `confirmDelete` (`action-menu.tsx:78-89`)
fecha o diálogo logo, e o `onCloseAutoFocus` do diálogo (`action-menu.tsx:155-158`) devolve o foco ao
gatilho. Quando o refetch da lista chega (`useEntityCrud.tsx:191-201`), a linha sai do DOM com o gatilho
focado dentro, e o navegador manda o foco para o `body`. Se o refetch chegar antes do fim da animação de
saída do diálogo, o `ActionsMenu` inteiro desmonta com o foco ainda dentro do diálogo. O `FocusScope` do Radix
dispara o `onCloseAutoFocus` num `setTimeout(0)` depois do desmonte
(`react-focus-scope/dist/index.mjs:105-118`), quando `triggerRef.current` já é `null`, e o foco também cai no
`body`.

**Para onde o foco vai.** WCAG 2.4.3 (ordem de foco) pede que o foco siga para um ponto que preserve o
sentido da navegação. O padrão usado em listas com exclusão é ir para o item que ocupou o lugar do excluído,
ou para o anterior quando o excluído era o último. Decisão adotada:

1. o gatilho de ações da linha que agora ocupa a posição da excluída (a "próxima");
2. sem ela, o gatilho da linha anterior mais próxima;
3. sem nenhuma linha com gatilho, o campo de busca da mesma `Table` (`data-slot="table-search"`,
   `table.tsx:212`), que continua montado quando a lista esvazia;
4. sem busca, nada muda: o foco fica onde o navegador deixar, como hoje.

Linha sem `ActionsMenu` (o dono em `OrganizationMembersTable.tsx:92`) é pulada na busca pelo vizinho. Se a
linha não sair do DOM (arquivar usuário mantém a linha), o gatilho continua conectado e o comportamento atual
vale: foco no próprio gatilho (`actionMenu.test.tsx:188`).

**Onde corrigir.** No `ActionsMenu`, que é dono do gatilho e da confirmação. Os quatro consumidores herdam a
correção sem mudar uma linha. A `Table` só ganha `data-slot="table-root"` no `div` raiz (`table.tsx:192`)
para o menu achar as linhas e a busca da mesma tabela.

**Mecanismo** (detalhe no blueprint):

- `data-slot="actions-menu-trigger"` no `button` do gatilho (`action-menu.tsx:96-105`).
- Um `useLayoutEffect` sem dependências cuja limpeza roda no desmonte. No React, a limpeza de layout de uma
  subárvore apagada roda antes de o nó sair do DOM, então dá para ler a posição da linha. Ali o menu verifica
  se o foco estava nele: `document.activeElement` é o gatilho ou está dentro do conteúdo do diálogo
  (`AlertDialogContent` ganha `ref`). Se estava, guarda a raiz da tabela (`closest('[data-slot="table-root"]')`)
  e o índice da linha entre os `[data-slot="table-row"]` dela.
- O foco efetivo vai num `setTimeout(0)`. Enquanto o diálogo existe, a armadilha de foco do Radix devolveria
  qualquer foco dado de fora; a limpeza dela é passiva e roda antes do timeout. Na hora do timeout, a busca
  pelo alvo é refeita no DOM atual da raiz: o índice guardado aponta para a linha que entrou no lugar, o que
  também cobre a troca de página da paginação.
- O `onCloseAutoFocus` do diálogo continua como está (`preventDefault` e foco no gatilho se existir). Com o
  gatilho desmontado, o `triggerRef.current?.focus()` não faz nada e o foco do timeout prevalece.

#### B. `themeColor`

Next 16.4.6 (`apps/app/package.json:29`, `apps/web/package.json:29`): `themeColor` sai do `metadata` e vai
para o export `viewport` do layout. Nenhum dos dois layouts exporta `viewport` hoje; o Next mantém o padrão
(`width=device-width, initial-scale=1`) e acrescenta o que o export declarar.

Cores, convertidas do `--background` de `packages/design-system/styles/globals.css` pela mesma conversão
OKLab → sRGB do `themeContrast.test.ts:24-85`:

| Tema | Token | Hex |
|------|-------|-----|
| claro | `oklch(0.985 0.002 264)` (`globals.css:15`) | `#f9fafb` |
| escuro | `oklch(0.165 0.009 264)` (`globals.css:68`) | `#0c0e12` |

O claro confere com o `backgroundColor` que `packages/email/brand.ts` já espelha em hex.

**Onde declarar.** Uma constante só em `packages/design-system/lib/themeColor.ts`, consumida pelos dois
layouts, no mesmo lugar de `lib/fonts.ts` (que os dois layouts já importam). O hex é um espelho do token,
então o `themeContrast.test.ts` ganha um caso que converte o `--background` dos dois temas e compara com a
constante: quem trocar a marca num fork e esquecer o hex vê o teste falhar, não a barra do navegador.

**Limite aceito.** O `media` segue o tema do sistema operacional. No app, quem escolheu "escuro" com o sistema
em claro vê a barra clara; o `next-themes` não mexe no `theme-color`. Ver pergunta 1.

#### C. `MetricStrip` com 4 ou mais itens

O mapa só tem 1, 2 e 3 (`MetricStrip.tsx:18-22`) e cai no de 3 para qualquer outro número (`:37`). A
divisória por `divide-x`/`divide-y` não serve para grade que quebra linha: ela põe borda à esquerda no
primeiro item da segunda linha.

Decisão: uma entrada para "4 ou mais", que é o fallback novo. Duas colunas no celular, quatro a partir de
`lg`, com a borda por posição em vez de `divide-*`:

- borda à esquerda em quem não começa linha: `nth-child(2n)` nas duas larguras, mais `nth-child(4n+3)` em
  `lg`;
- borda em cima em quem não está na primeira linha: `nth-child(n+3)` no celular; em `lg`, zera nos itens 3 e 4
  e mantém de 5 em diante.

O ponto de quebra é `lg`, não `sm` como no layout de 3: o painel tem a barra lateral a partir de `md`, e
quatro células entre 640 e 1023 px ficariam estreitas para um número de nove dígitos em `text-3xl` (§4 de
`DESIGN.md`, estado "Excesso"). A cor da borda vem do `* { @apply border-border }` de `globals.css`.

Como nenhuma tela usa quatro itens, o `/test` não teria onde ver. O playground
(`playground/page.tsx`), que já demonstra o `ActionsMenu` (`:1364`) com rótulos de exemplo, ganha uma
variante "MetricStrip" com quatro itens de rótulo genérico ("Métrica 1"…"Métrica 4"), seguindo a prática de
rótulo literal que a página já usa.

#### D. Seletor de tamanho que some

Hoje: `showPager = … && !(hideOnSinglePage && pageCount === 1)` (`table.tsx:185-188`), e `pageCount` usa o
tamanho escolhido. Com 15 linhas e 20 por página, `pageCount` vira 1 e o paginador some com o seletor.

Decisão: com `showSizeChanger` ligado, o paginador só some quando o total cabe numa página **no menor tamanho
oferecido**, ou seja, quando trocar de tamanho não muda nada. Sem `showSizeChanger`, a regra continua a de
hoje.

| Situação (`hideOnSinglePage` ligado) | Hoje | Depois |
|---|---|---|
| 15 linhas, opções 10/20/50, escolheu 20 | some tudo | "Página 1 de 1" e seletor em 20 |
| 8 linhas, opções 10/20/50 | some | some |
| 15 linhas, sem `showSizeChanger`, `pageSize` 20 | some | some |
| busca reduz 15 para 6 linhas, tamanho 10 | some | some (volta quando a busca é limpa) |

A alternativa "manter visível depois que o usuário mexeu no seletor" pede estado novo e muda conforme o
histórico da sessão. A regra adotada é derivada só de props e dados.

### 5.4 i18n e a11y

Nenhuma chave nova. A11y é o objeto de A (WCAG 2.4.3); D devolve um controle que hoje fica inalcançável.

### 6. Autorização e segurança

N/A. Nenhum dado nem permissão muda.

### 7. Testes

| Nível | Arquivo | O que prova |
|-------|---------|-------------|
| componente (jsdom) | `packages/design-system/__tests__/actionMenu.test.tsx` | Harness com uma `Table` real de 3 linhas, cada uma com `ActionsMenu`, e `onDelete` que tira a linha do estado. (1) excluir a do meio pelo teclado deixa o foco no gatilho da linha que subiu; (2) excluir a última deixa o foco no gatilho da anterior; (3) excluir a única com `searchFields` deixa o foco na busca; (4) remoção atrasada, depois de o diálogo fechar e o foco voltar ao gatilho, também cai na próxima linha; (5) `onDelete` que não remove a linha mantém o foco no gatilho (o caso de `:188` já cobre, segue verde); (6) `ActionsMenu` fora de `Table` mantém o comportamento de hoje (os casos existentes) |
| componente (jsdom) | `packages/design-system/__tests__/tablePagination.test.tsx` | 15 linhas com `hideOnSinglePage` e `showSizeChanger`: escolher 20 mantém "Página 1 de 1" e o seletor; 8 linhas esconde o paginador; o caso de `:201` (sem `showSizeChanger`) continua escondendo |
| unidade | `packages/design-system/__tests__/themeContrast.test.ts` | o hex da constante `themeColor` é o `--background` convertido de `:root` e de `.dark` |
| componente (jsdom) | `apps/app/__tests__/metricStrip.test.tsx` | com 4 itens, a `dl` tem `lg:grid-cols-4` e não tem `sm:grid-cols-3`; com 3, mantém o layout de hoje |
| unidade | `apps/web/__tests__/rootLayoutAuthProvider.test.tsx` (caso novo) e `apps/app/__tests__/rootViewport.test.ts` (novo) | o `viewport` exportado pelo layout é a constante `themeColor`. Na web, o arquivo existente já mocka tudo o que o layout importa (`:9-49`), então basta um `it` lendo o export. No app não há precedente; se mockar o layout (`cookies`, sessão, providers) passar de umas dez linhas, o teste do app fica de fora e a verificação vai para o `/test` |
| e2e (Playwright, já roda no CI) | `apps/e2e/tests/entityCrud.spec.ts:76-83` | uma asserção a mais: depois de excluir a entidade editada, o gatilho de ações da linha semeada está focado. O jsdom não reproduz a ordem real entre o fechamento animado do diálogo e o refetch do React Query; o e2e reproduz |

Nada exige emulador além do que o e2e já usa.

### 8. O que o `/test` percorre

Uma passada, claro e escuro, 390 px e 1440 px (1024 px para C), três idiomas onde houver texto.

| Fluxo | Como produzir | O que medir |
|-------|---------------|-------------|
| A1. Excluir pelo teclado no meio da lista | `/entities` com 3+ entidades do seed ou criadas como `qa-polish-*`; Tab até o gatilho da 2ª, Enter, "Excluir", Enter no confirmar | `document.activeElement` é o gatilho da linha que subiu e casa com `:focus-visible`; o anel aparece |
| A2. Excluir a última e a única | mesma tela | última → gatilho da anterior; única → campo de busca |
| A3. Arquivar usuário em `/admin/users` | conta admin do seed | a linha continua, o foco volta ao gatilho dela |
| A4. Excluir com o mouse | `/entities` | foco na próxima linha sem anel visível (`:focus-visible` falso) |
| B. `theme-color` | `/pt-br` na web e `/` no app | duas `meta[name=theme-color]`, `media` claro com `#f9fafb` e escuro com `#0c0e12`; o `viewport` continua `width=device-width, initial-scale=1` |
| C. `MetricStrip` de 4 | playground do app | 390 px: 2×2, divisória vertical entre colunas e horizontal entre linhas, sem borda solta na borda do cartão; 1024 e 1440 px: 1×4 sem borda em cima |
| C'. Telas que usam 2 e 3 itens | home comum e home admin | sem mudança visual |
| D. Seletor em `/admin/users` | 15 usuários no emulador (mesmo estado do relatório anterior) | escolher 20 mostra as 15 linhas, "Página 1 de 1" e o seletor; voltar para 10 sem recarregar |

Não observável sem dispositivo real: a cor da barra do navegador móvel. O `/test` mede a `meta` no DOM e marca
a barra como não verificada.

### 9. Critérios de aceite (rascunho para o `/test`)

1. Excluir uma linha do meio pelo teclado deixa o foco no gatilho da linha seguinte.
2. Excluir a última linha leva o foco ao gatilho da anterior; excluir a única leva à busca.
3. Exclusão que não remove a linha (arquivar) mantém o foco no próprio gatilho.
4. Cancelar ou Escape na confirmação continuam devolvendo o foco ao gatilho.
5. Os dois apps publicam `theme-color` para claro e escuro com o hex do `--background`.
6. `MetricStrip` de 4 itens: 2×2 no celular, 1×4 em `lg`, divisórias só entre células.
7. `MetricStrip` de 1, 2 e 3 itens sem mudança.
8. Com `showSizeChanger`, o paginador só some quando o total cabe no menor tamanho oferecido.
9. Sem `showSizeChanger`, `hideOnSinglePage` se comporta como hoje.

## Etapa 2: blueprint

### Arquivos

```
packages/design-system/
  components/ui/action-menu.tsx        A: data-slot no gatilho, ref no diálogo, efeito de desmonte
  components/ui/table.tsx              A: data-slot="table-root"; D: regra do showPager
  lib/themeColor.ts                    B: novo
  __tests__/actionMenu.test.tsx        A
  __tests__/tablePagination.test.tsx   D
  __tests__/themeContrast.test.ts      B
apps/app/
  app/layout.tsx                       B: export viewport
  shared/components/ui/MetricStrip.tsx C
  app/[locale]/(authenticated)/(common)/(pages)/playground/page.tsx   C: variante de 4 itens
  __tests__/metricStrip.test.tsx       C
  __tests__/rootViewport.test.ts       B (se viável)
apps/web/
  app/[locale]/layout.tsx              B: export viewport
  __tests__/rootLayoutAuthProvider.test.tsx   B: caso novo
apps/e2e/tests/entityCrud.spec.ts      A: asserção de foco
```

### A. `action-menu.tsx` (pseudo-diff)

```tsx
import { useLayoutEffect, useRef, useState } from "react";

const TABLE_ROOT = '[data-slot="table-root"]';
const TABLE_ROW = '[data-slot="table-row"]';
const ROW_ACTIONS_TRIGGER = '[data-slot="actions-menu-trigger"]';
const TABLE_SEARCH = '[data-slot="table-search"]';

function focusRowActionNear(tableRoot: Element, rowIndex: number) {
    if (!tableRoot.isConnected) return;
    const rows = Array.from(tableRoot.querySelectorAll(TABLE_ROW));
    const triggerAt = (index: number) =>
        rows[index]?.querySelector<HTMLElement>(ROW_ACTIONS_TRIGGER) ?? null;
    for (let index = rowIndex; index < rows.length; index++) {
        const trigger = triggerAt(index);
        if (trigger) return trigger.focus();
    }
    for (let index = Math.min(rowIndex, rows.length) - 1; index >= 0; index--) {
        const trigger = triggerAt(index);
        if (trigger) return trigger.focus();
    }
    tableRoot.querySelector<HTMLElement>(TABLE_SEARCH)?.focus();
}

// dentro do componente
const confirmContentRef = useRef<HTMLDivElement>(null);

useLayoutEffect(() => {
    const trigger = triggerRef.current;
    return () => {
        const focused = document.activeElement;
        const focusWasHere =
            focused === trigger ||
            Boolean(focused && confirmContentRef.current?.contains(focused));
        const row = trigger?.closest(TABLE_ROW);
        const tableRoot = row?.closest(TABLE_ROOT);
        if (!(focusWasHere && row && tableRoot)) return;
        const rowIndex = Array.from(tableRoot.querySelectorAll(TABLE_ROW)).indexOf(row);
        setTimeout(() => focusRowActionNear(tableRoot, rowIndex), 0);
    };
}, []);

// gatilho
<button data-slot="actions-menu-trigger" … ref={triggerRef} …>

// diálogo
<AlertDialogContent ref={confirmContentRef} onCloseAutoFocus={…igual…} size="sm">
```

Pontos de atenção para o `desenvolvedor`:

- O comentário do porquê (limpeza de layout lê o DOM antes da remoção; o timeout espera a armadilha de foco
  do diálogo sair) é um dos dois casos legítimos de `code-comments.md` §2. Uma a três linhas, sem citar este
  plano.
- Confirmar no teste (4) que, com o diálogo ainda aberto no desmonte, o `onCloseAutoFocus` do Radix (que roda
  depois do nosso timeout) não rouba o foco. Pela leitura de `react-focus-scope/dist/index.mjs:109-117`, o
  `preventDefault` do nosso handler impede o foco padrão. Se o teste mostrar o contrário, trocar o
  `setTimeout` por um que rode depois do do Radix (por exemplo, `requestAnimationFrame` seguido do timeout) e
  registrar o desvio no handoff.
- Conferir se `AlertDialogContent` (`components/ui/alert-dialog.tsx`) repassa `ref`; no React 19, `ref` é
  prop comum.
- Se a limpeza também roda ao fechar o StrictMode em dev (montar, desmontar, montar), `focusWasHere` é falso
  nesse momento e nada acontece.

### A. `table.tsx`

```diff
-    <div className={cn("flex w-full flex-col gap-3", className)}>
+    <div className={cn("flex w-full flex-col gap-3", className)} data-slot="table-root">
```

### D. `table.tsx`

```diff
+  const pageSizeOptions = pageConfig?.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS;
+  // Com o seletor de tamanho, o paginador só sai quando trocar de tamanho não muda nada.
+  const singlePageThreshold = pageConfig?.showSizeChanger
+    ? Math.min(configuredPageSize, ...pageSizeOptions)
+    : pageSize;
   const showPager =
     pageConfig !== null &&
     filteredRows.length > 0 &&
-    !(pageConfig.hideOnSinglePage && pageCount === 1);
+    !(pageConfig.hideOnSinglePage && filteredRows.length <= singlePageThreshold);
```

O `map` das opções em `table.tsx:352` passa a usar `pageSizeOptions`. O comentário acima é opcional: se o
nome da variável bastar, fica sem ele.

### B. `lib/themeColor.ts`

```ts
export const themeColor = [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0e12" },
];
```

Sem importar tipo do `next` (o pacote não depende dele); o formato casa com `Viewport["themeColor"]`. Nos
layouts:

```tsx
import type { Viewport } from "next";
import { themeColor } from "@repo/design-system/lib/themeColor";

export const viewport: Viewport = { themeColor };
```

`themeContrast.test.ts`: acrescentar a codificação gama de sRGB e o hex ao `oklchToLinearRgb` existente e
comparar `--background` de `light` e `dark` com a `color` da entrada de cada `media`.

### C. `MetricStrip.tsx`

```diff
 const LAYOUT_BY_COUNT: Record<number, string> = {
     1: "grid-cols-1",
     2: "grid-cols-2 divide-x",
     3: "grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0",
 };
+
+const WRAPPING_LAYOUT =
+    "grid-cols-2 [&>:nth-child(2n)]:border-l [&>:nth-child(n+3)]:border-t lg:grid-cols-4 lg:[&>:nth-child(4n+3)]:border-l lg:[&>:nth-child(-n+4)]:border-t-0";
 …
-                LAYOUT_BY_COUNT[items.length] ?? LAYOUT_BY_COUNT[3],
+                LAYOUT_BY_COUNT[items.length] ?? WRAPPING_LAYOUT,
```

Com 5 ou mais itens em `lg`, o 5º começa a segunda linha: tem borda em cima e não tem à esquerda, que é o
esperado. A precedência de `lg:[&>:nth-child(-n+4)]:border-t-0` sobre `[&>:nth-child(n+3)]:border-t` depende
de a variante de mídia sair depois no CSS gerado (mesma especificidade); o `/test` confirma no navegador.

### Ordem de implementação e commits

Sem SDK, API nem i18n. Um commit por pacote ou app:

1. `fix(design-system): move focus to the neighbouring row after a row delete` (`action-menu.tsx`, `table.tsx`
   no `data-slot`, `actionMenu.test.tsx`)
2. `fix(design-system): keep the page size selector while a smaller size still paginates` (`table.tsx` na regra,
   `tablePagination.test.tsx`)
3. `feat(design-system): export the theme colour mirrored from --background` (`lib/themeColor.ts`,
   `themeContrast.test.ts`)
4. `feat(app): publish theme-color` e `fix(app): lay out four or more metrics in a wrapping grid` (layout,
   `MetricStrip.tsx`, playground, testes)
5. `feat(web): publish theme-color` (layout, teste)
6. `test(e2e): assert focus lands on the next row after deleting an entity`
7. `docs(features): design-refresh-polish`

Os commits 1 e 2 tocam `table.tsx` em linhas diferentes; se o `git add -p` complicar, junte os dois e diga
isso na mensagem.

### Env e config

Nenhuma. Um fork que trocar a marca precisa atualizar o hex em `lib/themeColor.ts`, e o teste de contraste
avisa se esquecer. Vale acrescentar uma linha no passo 5 de `docs/DESIGN.md` §6, ao lado de
`packages/email/brand.ts`.

## Perguntas em aberto

Todas com a opção adotada. Nenhuma bloqueia.

1. **`theme-color` segue o sistema ou o tema escolhido?** Adotado: segue o sistema (`media`). O app conhece a
   preferência no servidor (`resolvePreferredTheme`, `apps/app/app/layout.tsx:32-37`) e poderia usar
   `generateViewport`, mas trocar o tema sem recarregar deixaria a `meta` velha até o próximo carregamento, e a
   web guarda o tema só no `localStorage`. Sincronizar de verdade pede um componente cliente que reescreva a
   `meta` quando o tema muda. Fica para quando alguém pedir.
2. **Foco quando a lista esvazia e a tabela não tem busca.** Adotado: não move (comportamento de hoje). A
   alternativa seria tornar o contêiner da tabela focável com `tabIndex={-1}`, o que muda a `Table` para todos
   e acrescenta uma parada de foco que ninguém pediu.
3. **Ponto de quebra do `MetricStrip` de 4.** Adotado: `lg`, por causa da barra lateral a partir de `md`. Se um
   fork usar o `MetricStrip` numa página sem barra lateral, `sm` caberia; não há esse caso hoje.
4. **Demonstração no playground com rótulos literais.** Adotado: sim, como a variante do `ActionsMenu` já faz
   (`playground/page.tsx:1364-1380`). Sem ela, o `/test` não tem tela com quatro métricas para percorrer.
5. **Regra do `hideOnSinglePage`.** Adotado: esconder só quando o total cabe no menor tamanho oferecido. A
   alternativa (manter visível depois de o usuário mexer no seletor) exige estado e varia com a sessão.
