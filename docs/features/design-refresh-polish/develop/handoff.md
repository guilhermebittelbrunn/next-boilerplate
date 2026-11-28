# Handoff do develop: acabamento final da branch de design

Branch `feat/design-system-refresh`, nada commitado. Sem SDK, API, Firestore, i18n novo nem variável de
ambiente.

## Desvios do plano

1. **(A) O foco não vai num `setTimeout(0)` disparado da limpeza de layout.** A posição da linha continua
   sendo lida na limpeza do `useLayoutEffect`, que ainda enxerga a linha no DOM. O foco agora sai da
   limpeza de um `useEffect` (passiva), por `queueMicrotask`. No desmonte, o React roda a limpeza passiva
   do pai antes da dos filhos e faz tudo isso num bloco síncrono. O microtask enfileirado ali roda,
   portanto, depois de o diálogo do Radix soltar a armadilha de foco e o `aria-hidden` que ele põe no
   resto da página. A ordem é garantida pelo React, sem corrida entre o `setTimeout` e o agendador
   (que roda as limpezas passivas num `MessageChannel` quando a atualização não é síncrona, caso do
   refetch do React Query). Um comentário de três linhas no `action-menu.tsx` explica o porquê.
   Limite do que foi medido: essa ordem vem da leitura do código do React e do Radix. No jsdom, focar de
   forma síncrona na limpeza passiva também passa nos 24 testes, então os testes provam o destino do foco,
   não a necessidade do microtask; o efeito do `aria-hidden` só aparece no navegador (ver "A verificar").
2. **(C) As divisórias do `MetricStrip` de 4+ itens só somam, nenhuma anula outra.** O plano zerava a
   borda de cima dos itens 3 e 4 em `lg` com `lg:[&>:nth-child(-n+4)]:border-t-0` e dependia da ordem do
   CSS gerado. Troquei por `max-lg:[&>:nth-child(n+3)]:border-t` + `lg:[&>:nth-child(n+5)]:border-t`, em
   media queries que não se sobrepõem. Compilei as seis classes com o `tailwindcss` 4 do repo (script
   descartável no scratchpad): cada uma gera uma regra, e as de `max-lg` e `lg` ficam em
   `@media (width < 64rem)` e `@media (width >= 64rem)`.
3. **(C) O playground ganhou uma seção própria `MetricStrip`** no grupo "Shell do painel" (âncora
   `#metric-strip`), ao lado de `LoadErrorState`, e não uma variante dentro de "Sobreposições". O
   `MetricStrip` mora em `apps/app/shared`, como os outros componentes daquele grupo.
4. **(e2e) A asserção não fixa a linha semeada.** O seed (`apps/api/scripts/seed-emulator.mjs:36-60`)
   cria várias entidades para `user@example.com`, e a lista não garante em que posição a editada fica. O
   teste guarda o índice da linha antes de excluir e confere o foco no gatilho da linha que ocupa esse
   índice depois (ou da anterior, se a excluída era a última).

## Blueprint → arquivos

| Item | Arquivos |
|------|----------|
| A. Foco depois de excluir | `packages/design-system/components/ui/action-menu.tsx` (`data-slot="actions-menu-trigger"`, `ref` no `AlertDialogContent`, `findRowPosition`, `focusRowActionsNear`, os dois efeitos de desmonte), `packages/design-system/components/ui/table.tsx` (`data-slot="table-root"`) |
| B. `themeColor` | `packages/design-system/lib/themeColor.ts` (novo), `apps/app/app/layout.tsx`, `apps/web/app/[locale]/layout.tsx` (`export const viewport: Viewport = { themeColor }`), `docs/DESIGN.md` §6 passo 5 |
| C. `MetricStrip` 4+ | `apps/app/shared/components/ui/MetricStrip.tsx` (`WRAPPING_LAYOUT` como fallback), `apps/app/app/[locale]/(authenticated)/(common)/(pages)/playground/page.tsx` (seção `#metric-strip`, 4 itens) |
| D. Seletor de tamanho | `packages/design-system/components/ui/table.tsx` (`singlePageLimit`; `pageSizeOptions` extraído e usado também no `map` do seletor) |
| Testes | `packages/design-system/__tests__/actionMenu.test.tsx`, `tablePagination.test.tsx`, `themeContrast.test.ts`; `apps/app/__tests__/metricStrip.test.tsx`, `apps/app/__tests__/rootViewport.test.ts` (novo); `apps/web/__tests__/rootLayoutAuthProvider.test.tsx`; `apps/e2e/tests/entityCrud.spec.ts` |

## Contrato

Nenhum DTO nem action mudou. O contrato público do design system ganha:

- `data-slot="actions-menu-trigger"` no gatilho do `ActionsMenu` e `data-slot="table-root"` na raiz da
  `Table`. Os quatro consumidores (`EntitiesListClient`, `UsersListClient`, `OrganizationInvitationsTable`,
  `OrganizationMembersTable`) herdam o foco novo sem mudar código.
- `@repo/design-system/lib/themeColor` (export `themeColor`), consumido pelos dois layouts raiz.
- Regra nova do `hideOnSinglePage` quando `showSizeChanger` está ligado: o paginador só some quando o total
  cabe no menor entre o `pageSize` configurado e as `pageSizeOptions`. O único consumidor com as duas
  flags é `UsersListClient.tsx:231-232`.

## Códigos de erro novos

Nenhum. Nenhuma chave de i18n nova (o playground usa rótulos literais, como o resto da página).

## Gate de design (`docs/DESIGN.md` §5)

1. **Específico.** Não se aplica: são correções em componentes genéricos do core, sem tela nova.
2. **Evidência.** Passo pulado (nenhuma referência ThinkUI/Uizze consultada). A regra de foco segue WCAG
   2.4.3, citada no plano.
3. **Estados.** Excesso: o playground tem um valor de nove dígitos com dica longa na célula 3. Vazio e
   carregando não mudaram. Nada foi visto renderizado; fica para o `/test`.
4. **Conteúdo.** O playground usa "Métrica 1" a "Métrica 4", rótulos de exemplo de propósito, como a
   demonstração do `ActionsMenu` na mesma página.
5. **Hierarquia.** Não muda: o número em `text-3xl` continua vencendo o rótulo.
6. **Limites.** Nenhuma tela foi renderizada neste develop (nem smoke). Cor da barra do navegador móvel
   só se vê em aparelho real.

## Validação (medida)

| O quê | Comando | Resultado |
|-------|---------|-----------|
| Testes do `ActionsMenu` | `NODE_ENV=test npx vitest run __tests__/actionMenu.test.tsx` (em `packages/design-system`) | 24/24 |
| Os testes novos de A provam a correção | mesmo comando com o `queueMicrotask(...)` trocado por nada | 5 falham (vizinha seguinte, anterior, pula linha sem menu, busca, remoção atrasada) |
| O caminho "diálogo ainda aberto no desmonte" é exercido | mesmo comando sem o ramo `confirmContent?.contains(focused)` | 4 falham; o caso de remoção atrasada (foco no gatilho) segue verde |
| O `onCloseAutoFocus` do Radix não rouba o foco | os casos de A esperam um `setTimeout(0)` (o mesmo prazo do `FocusScope`) antes de conferir `document.activeElement` | 24/24 verdes |
| D | `NODE_ENV=test npx vitest run __tests__/tablePagination.test.tsx` | 17/17; com o `table.tsx` antigo (stash temporário), 1 falha: o caso dos 15 linhas com 20 por página |
| B, hex contra o token | `NODE_ENV=test npx vitest run __tests__/themeContrast.test.ts` | 54/54; trocando `#0c0e12` por `#0c0e13`, falha com `Expected "#0c0e12"` |
| C | `NODE_ENV=test npx vitest run __tests__/metricStrip.test.tsx` (em `apps/app`) | 10/10; com o fallback antigo (`LAYOUT_BY_COUNT[3]`), 3 falham |
| `viewport` dos layouts | `rootViewport.test.ts` (app, 2 mocks: `server-only` e `fonts`) e caso novo em `rootLayoutAuthProvider.test.tsx` (web) | 1/1 e 2/2 |
| Suítes | `pnpm turbo run test --filter=@repo/design-system --filter=app --filter=web` | design-system 215, web 329, app 1421, todos verdes (11 tasks com dependências) |
| Typecheck | `pnpm turbo run typecheck --filter=@repo/design-system --filter=app --filter=web --filter=e2e` | 4/4 |
| Lint | `npx biome check --write <arquivos>` e `pnpm check` | `Checked 1182 files ... No fixes applied`, zero erro |
| Paridade i18n | não rodada | nenhuma chave tocada |

O e2e não foi executado (fica com o `/test`); só compila (typecheck do `e2e` acima).

## A verificar no `/test`

- **A no navegador.** O jsdom não tem animação nem o `aria-hidden` real do Chrome. Repro: `/pt-br/entities`
  com as entidades do seed, Tab até o gatilho da 2ª linha, Enter, "Excluir", Enter no confirmar. Medir
  `document.activeElement` (gatilho da linha que subiu) e `:focus-visible`. Repetir com a última (vai para a
  anterior) e, numa busca que deixe uma linha só, com a única (vai para o campo de busca). Abrir o console:
  não deve aparecer o aviso "Blocked aria-hidden on an element because its descendant retained focus".
- **A com o mouse.** Mesmo fluxo clicando: o foco vai para a linha vizinha e `:focus-visible` deve ser
  falso.
- **A, arquivar em `/admin/users`.** A linha continua e o foco volta ao gatilho dela.
- **E2e `entityCrud.spec.ts`.** Rodar `pnpm e2e`. A asserção nova (`toBeFocused` no gatilho da vizinha)
  nunca rodou.
- **B.** `document.querySelectorAll('meta[name="theme-color"]')` em `/pt-br` (web) e `/` (app): duas
  entradas, `media` claro `#f9fafb` e escuro `#0c0e12`; a `meta[name=viewport]` continua
  `width=device-width, initial-scale=1`. A cor da barra fica como não verificada sem aparelho.
- **C.** Playground `#metric-strip`: 390 px em 2×2, com divisória vertical entre as colunas e horizontal
  entre as linhas; 1024 e 1440 px em 1×4, sem borda em cima. O valor de nove dígitos cabe na célula. Home
  comum e home admin (2 e 3 itens) sem mudança.
- **D.** `/admin/users` com 15 usuários: escolher 20 mostra as 15 linhas, "Página 1 de 1" e o seletor;
  voltar para 10 sem recarregar.

## Lacunas conhecidas

- Uma janela curta fica sem cobertura: a linha sai do DOM depois que o conteúdo do diálogo desmontou mas
  antes do `setTimeout(0)` em que o Radix devolve o foco ao gatilho. Nesse intervalo o foco está no `body`,
  o menu não reconhece que era dele e o foco fica no `body`, como antes. Exige o refetch chegar dentro de
  um único tick, depois da animação de saída.
- O teste de A cobre a remoção síncrona (diálogo aberto) e a atrasada (gatilho focado). A remoção durante
  a animação de saída só existe no navegador.
- `ActionsMenu` fora de uma `Table` mantém o comportamento antigo, coberto pelos casos já existentes.
