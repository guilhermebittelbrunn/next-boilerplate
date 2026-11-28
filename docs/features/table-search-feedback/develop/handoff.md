# Handoff do develop: retorno da busca da `Table` e foco depois do menu mobile da landing

Plano: `analyze/plan.md`. Branch `feat/design-system-refresh`, nada commitado. Sem SDK, API, rota ou
`error.code` novo.

## Desvios do plano

Três correções e um ajuste pequeno. Nenhum reabre decisão D1 a D9.

1. **Quebra do termo longo: `wrap-anywhere` no lugar de `break-words` (§5.1).** Dentro de uma célula de
   tabela com layout automático, `overflow-wrap: break-word` não reduz a largura mínima do conteúdo, então
   um termo de 200 caracteres sem espaço alargaria a coluna e a tabela rolaria na horizontal dentro do
   cartão. `overflow-wrap: anywhere` entra no cálculo da largura mínima. A utilidade existe no Tailwind
   4.1.16 instalado (`grep '"wrap-anywhere"' packages/design-system/node_modules/tailwindcss/dist/lib.js`
   encontra a string). Não medi no navegador: fica para o F8 do `/test`.
2. **O anúncio respeita a pausa também ao voltar a um termo já anunciado (§5.3).** No pseudo-código do
   plano, `announcedSearch` guardava o último termo assentado. Quem digitava "registro 2", esperava, digitava
   "5" e apagava ouvia o anúncio na hora, sem os 500 ms, porque o termo voltava a ser igual ao guardado. O
   mesmo acontecia ao limpar e redigitar o termo. Agora toda mudança do campo zera o termo assentado
   (`updateSearch` chama `setSettledSearch("")`). Teste "volta a esperar a pausa quando a pessoa retorna a
   um termo já anunciado"; a mutação M1 abaixo prova que ele pega o defeito.
3. **O timer só existe quando a tabela tem busca.** O efeito sai cedo sem `searchFields`, e a região
   `role="status"` não monta. Assim as tabelas sem busca não ganham timer nem região viva. Teste "não monta
   a região de anúncio numa tabela sem busca".
4. **Posição do botão de limpar do campo: `top-1.5 right-1.5`**, em vez de `top-1/2 -translate-y-1/2`. O
   campo tem 36 px e o botão 24 px, então 6 px centram sem `translate`, que dividiria o elemento com a escala
   do `pressable`.

## Blueprint para arquivos

| Item do plano | Arquivos |
|---------------|----------|
| §5.1 a §5.3, §10.1: estado de busca sem resultado, "Limpar busca" no vazio e no campo, região viva com debounce | `packages/design-system/components/ui/table.tsx` |
| §5.4, §10.2: `MAIN_CONTENT_ID` e foco depois do menu mobile | `apps/web/shared/lib/layout.ts`, `apps/web/app/[locale]/layout.tsx`, `apps/web/app/[locale]/components/header/index.tsx` |
| §5.5, §10.3: 4 chaves × 3 idiomas | `packages/internationalization/translations/components/ui/table.ts` |
| §7, testes 1 a 6 | `packages/design-system/__tests__/tablePagination.test.tsx` |
| §7, testes 7 e 8 | `apps/app/__tests__/tableLoadMore.test.tsx` |
| §7, testes 9 a 14 | `apps/web/__tests__/headerMobileMenu.test.tsx` |

`actionMenu.test.tsx` não mudou e passou (25 testes, `npx vitest run __tests__/actionMenu.test.tsx` no
design-system). O `data-slot="table-search"` continua no `input`.

## Contrato

`TableProps` não mudou: nenhuma prop nova, nenhuma removida. Os 6 consumidores com `searchFields` (§1.4 do
plano) não foram tocados e passam a mostrar o estado novo sem mudança. `MAIN_CONTENT_ID` é export novo de
`apps/web/shared/lib/layout.ts`, usado no layout raiz de `[locale]` e no header.

## i18n

Chaves novas em `components.table`: `searchNoResults`, `clearSearch`, `searchResults` e
`searchResultsOne`, nos três idiomas, com os textos do §10.3 do plano. Nenhum `apiErrors` novo.
`pnpm --filter @repo/internationalization test`: 7 arquivos, 67 testes, verde (paridade incluída).

## Validação

| Gate | Comando | Resultado |
|------|---------|-----------|
| Typecheck e testes | `pnpm turbo run typecheck test --filter=@repo/design-system --filter=app --filter=web --filter=@repo/internationalization` | 15 tarefas OK (3 do cache), saída 0 |
| Testes design-system | idem, e depois `npx vitest run` no pacote com o teste do "Carregar mais" | 14 arquivos, 229 testes |
| Testes app | idem | 159 arquivos, 1427 testes |
| Testes web | idem | 36 arquivos, 336 testes |
| Testes i18n | idem | 7 arquivos, 67 testes |
| Lint | `pnpm check` | 1182 arquivos, 0 erro, saída 0 |
| Formatação dos tocados | `npx biome check --write <arquivos>` | aplicado |

Sem `--force`. Não subi app nem browser: nada me bloqueou, e o comportamento de foco e de texto ficou coberto
por teste de componente.

### Prova de mutação

Cada mutação foi aplicada sozinha, a suíte do arquivo rodou e o arquivo voltou do backup (`diff -q` vazio).

| # | Mutação | Teste que falhou |
|---|---------|------------------|
| M1 | `updateSearch` sem `setSettledSearch("")` | volta a esperar a pausa quando a pessoa retorna a um termo já anunciado |
| M2 | efeito sem `clearTimeout` | cancela o anúncio pendente quando a tabela desmonta |
| M3 | ramo `searchFoundNothing` desligado | diz que a busca não achou o termo…; o botão do vazio devolve as linhas… |
| M4 | `clearSearch` sem foco no campo | os dois testes de limpar (vazio e campo) |
| M5 | contagem com `visibleRows` em vez de `filteredRows` | anuncia a contagem de todas as linhas filtradas (25 com página de 10) |
| W1 | link interno sem foco no `main` | os 4 casos de `it.each` (Contato, Início, Preços, Entrar) |
| W2 | ignora tecla modificadora | devolve o foco ao botão do menu num Ctrl+clique |
| W3 | "Sair" sem devolver o foco | devolve o foco ao botão do menu ao sair pelo painel |

## Gate de design (`docs/DESIGN.md` §5)

1. **Específico.** É peça do design system, compartilhada pelos forks; a frase com o termo buscado é o que
   prende a tela ao contexto. Instrumento: leitura do código.
2. **Evidência.** ThinkUI e Uizze não foram consultados nesta rodada (sem chave), como o plano já registrava.
3. **Estados.** Vazio real, vazio de busca, vazio com páginas pendentes e carregando estão cobertos por teste
   de componente (`tablePagination.test.tsx`, `tableLoadMore.test.tsx`). Excesso (termo de 200 caracteres)
   não foi renderizado: a verificar no `/test` (F8).
4. **Conteúdo.** Nenhum texto de exemplo no markup; todo texto vem do dicionário. Instrumento: diff.
5. **Hierarquia.** Vence a frase com o termo; o botão é `outline` `sm`. O `SearchXIcon` troca o `InboxIcon`
   só nos estados de busca. Se um estranho apontaria o mesmo elemento só se confirma renderizando.
6. **Limites.** Nada foi renderizado em navegador. Contraste, anel de foco, um só "x" no Chrome e no Safari
   e a quebra do termo longo ficam para o `/test`.

Regras de movimento: sem `transition-all`; os botões novos são `Button` do design system (têm `pressable` e
`focus-visible:ring-[3px]`); nada novo anima. O `main` mantém `outline-none` com `tabIndex={-1}`, como o
skip link já fazia.

## A verificar no `/test`

- **F1, F2, F3, F6, F7, F9** do plano: o estado e o foco estão provados em jsdom; falta a renderização real
  em claro e escuro, 390 px e 1440 px, nos três idiomas.
- **F3, um "x" só.** `[&::-webkit-search-cancel-button]:appearance-none` está no `input`, mas só o Chrome
  e o Safari dizem se o "x" nativo sumiu. Repro: digitar no campo e contar os "x" visíveis.
- **F4, anúncio.** O debounce está provado com timer falso. No navegador: `MutationObserver` no
  `[role=status][aria-atomic=true]` da tabela, digitar 8 letras seguidas e contar as mutações com texto
  (esperado: uma, depois de cerca de 500 ms).
- **F5.** Excluir pelo teclado a única linha filtrada: o foco vai ao campo e o estado mostra o termo. O
  `actionMenu.test.tsx` cobre o foco só para a busca vazia.
- **F8, termo longo.** 200 caracteres sem espaço a 390 px: a frase quebra dentro da célula, sem rolagem
  horizontal da tabela nem da página (desvio 1).
- **W1 a W6.** O foco no `main` e no botão do menu está provado em jsdom, com o `Link` do Next trocado por
  `<a>`. Falta confirmar com o App Router de verdade que nada move o foco depois da navegação, e que o
  próximo Tab sai do `main` para o primeiro controle do conteúdo. W5: nenhum anel de foco no `main` depois
  de um toque.

## Lacunas de teste conhecidas

O caso do "Carregar mais" com o termo parado tem teste ("anuncia a contagem nova quando mais linhas chegam
com o termo parado": 4 linhas, depois 25, sem nova pausa).

- Os testes do header usam `next/link` mockado como `<a>`. A ordem real é a do `Link` do Next (o `onClick`
  do chamador roda antes da navegação, `next/dist/client/app-dir/link.js:297-306`), mas o comportamento
  depois da troca de rota só aparece com o app de pé.

## Decisões em aberto

Nenhuma.
