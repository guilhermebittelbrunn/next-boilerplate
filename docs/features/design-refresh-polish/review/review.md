# Revisão: acabamento final da branch de design

## Branch

`feat/design-system-refresh`, reutilizada. É a branch desta tarefa (o `STATE.md` aponta para ela) e já existe no
remoto (`origin/feat/design-system-refresh`, 0 commits locais à frente). Não foi renomeada nem recriada.

Validação do nome pelo regex do `revisor-codigo`: `branch OK: feat/design-system-refresh`. A forma sem `project`
vale para mudança que cruza apps, e o diff mexe em `packages/design-system`, `apps/app`, `apps/web` e `apps/e2e`.

## Escopo revisado

O working tree tem um assunto só, esta tarefa: 13 arquivos modificados, 2 novos de código
(`packages/design-system/lib/themeColor.ts`, `apps/app/__tests__/rootViewport.test.ts`) e a pasta
`docs/features/design-refresh-polish/`. Nada no índice (`git diff --cached --stat` vazio). Revisado contra
`docs/review-checklist.md` §0, §2, §3, §4, §5, §5.1, §6 e §7.1. A `/code-review` nativa (nível baixo) não
apontou nada.

## Volta 2: o valor longo do `MetricStrip` quebrava no meio

O `/test` devolveu um ❌ (`test/report.md`, "Defeito encontrado"): com 4 ou mais itens, o valor `123.456.789`
quebrava em duas linhas, "123.456.7" / "89" em 390 px e "123.456." / "789" em 1024 px com a barra lateral. A causa
medida pelo QA: o número precisa de cerca de 139 px a 24 px (`text-2xl`) e de 174 px a 30 px (`sm:text-3xl`), a
célula deixa cerca de 121 px úteis, e o `[overflow-wrap:anywhere]` do `<dd>` (anterior a esta tarefa) parte o
número onde der. A revisão da volta 1 conferiu as bordas da grade, mas não a largura do valor dentro da célula.

### O que mudou

Só `apps/app/shared/components/ui/MetricStrip.tsx` e o teste dele. O princípio é que número não quebra: é dado
comparável, em `tabular-nums`. Quando falta largura, o layout de 4 ou mais itens reduz a escala, e a quebra só
acontece entre células, pela grade.

- O valor no layout de 4 ou mais itens usa `whitespace-nowrap text-xl xl:text-2xl` (constante
  `WRAPPING_VALUE_TYPE`), sem o `[overflow-wrap:anywhere]`. A partir de `xl` (1280 px) as quatro células têm largura
  para os 24 px.
- A célula desse layout usa `px-4` em vez de `px-5`, para ganhar 8 px de área útil.
- Os layouts de 1, 2 e 3 itens (as homes) continuam com `text-2xl [overflow-wrap:anywhere] sm:text-3xl` e `px-5`,
  sem nenhuma mudança de classe.
- Um comentário de duas linhas diz por que o layout de 4+ troca tamanho por largura.

Conta que sustenta a escolha, estimada a partir das medidas do QA, com largura proporcional ao corpo da fonte:
`123.456.789` a 20 px ocupa cerca de 116 px (139 × 20 / 24). Com `px-4`, a área útil passa a ser cerca de 126 px na
célula de 159 px (390 px) e cerca de 129 px na de 162 px (1024 px). Sobram uns 10 px. É estimativa, não medida; o
`/test` remede.

Hierarquia: o valor a 20 px continua acima do rótulo em `text-sm` (14 px) e `font-medium`.

Limite que fica: com `whitespace-nowrap` e `min-w-0` na célula, um valor de dez dígitos ou mais em 390 px não cabe e
transborda para a célula vizinha, em vez de quebrar. Nenhuma tela usa 4 itens hoje, e a regra adotada é que número
não se parte.

### Teste

`apps/app/__tests__/metricStrip.test.tsx`, bloco "valor do MetricStrip", com o valor de nove dígitos:

- com 4, 5 e 8 itens, o `<dd>` do valor tem `whitespace-nowrap`, `text-xl`, `xl:text-2xl` e `tabular-nums`, não tem
  `[overflow-wrap:anywhere]`, `text-2xl` nem `sm:text-3xl`, e a célula tem `px-4`;
- com 1, 2 e 3 itens, o `<dd>` mantém `text-2xl`, `sm:text-3xl` e `[overflow-wrap:anywhere]`, sem
  `whitespace-nowrap`, e a célula mantém `px-5`.

O jsdom não mede largura, então o teste prova a estrutura que impede a quebra, não o encaixe em pixels. Com
`WRAPPING_VALUE_TYPE` apontado de volta para a escala antiga, os 3 casos de 4+ falham e os outros 13 passam
(conferido trocando a constante e restaurando o arquivo).

### Verificar no `/test` (volta 2)

1. `/pt-br/playground`, seção `#metric-strip`, valor `123.456.789` na célula 3. Em 390 px e em 1024 px com a barra
   lateral aberta: o número ocupa uma linha só (um `Range` sobre o texto do `<dd>` devolve
   `getClientRects().length === 1`) e a célula tem `scrollWidth <= clientWidth`. Medir também a folga real em px.
2. Mesma seção em 1280 px com a barra lateral aberta (primeira largura com `xl:text-2xl`): uma linha só, sem
   transbordar.
3. Home comum (2 itens) e home admin (3 itens) em 390 e 1440 px: tamanho do número e espaçamento iguais aos da
   volta 1.

## Revisão: design-refresh-polish

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/e2e/tests/entityCrud.spec.ts:76-98` — a asserção nova de foco nunca rodou, e existe uma janela em que ela
  falharia: a linha sair do DOM depois de o conteúdo do diálogo desmontar (fim da animação de saída) e antes do
  `setTimeout(0)` em que o `FocusScope` do Radix devolve o foco ao gatilho. Nesse intervalo o foco está no `body`,
  `findRowPosition` (`action-menu.tsx:46-63`) não reconhece o foco como dele e nada se move. O handoff já registra
  a janela como lacuna conhecida. O risco aqui é outro: se o refetch do emulador cair nela, o teste fica
  intermitente no CI. Não mexi no código; o `/test` mede com repetição (ver "Verificar no `/test`").

### 🟢 Sugestão / nit

Nenhuma.

### ✅ OK

**A. Foco depois de excluir (`packages/design-system/components/ui/action-menu.tsx`)**

- Leitura da posição na limpeza de layout (`:126-134`). No React 19.2.0, a remoção de uma subárvore roda a
  limpeza de layout de cada componente antes do `removeChild` do nó host mais alto, então a `<tr>` e o gatilho
  ainda estão no DOM e `document.activeElement` ainda é o gatilho ou um nó do diálogo. O `confirmContentRef`
  também continua preenchido, porque o React desliga o `ref` do filho só quando a travessia chega nele, depois da
  limpeza do `ActionsMenu`.
- Foco por `queueMicrotask` a partir da limpeza passiva (`:136-144`). Conferi em
  `react-dom-client.development.js` (19.2.0, `commitPassiveUnmountEffectsInsideOfDeletedTree_begin`, linha
  16248): na subárvore removida, a limpeza passiva roda do pai para os filhos, numa passada síncrona. As limpezas
  do Radix que estão abaixo do `ActionsMenu` rodam na mesma passada, antes do microtask: o `hideOthers` do
  `DialogContentModal` (`@radix-ui/react-dialog` 1.1.15, `dist/index.mjs:137`) e os ouvintes de `focusin` e
  `focusout` do `FocusScope` (`@radix-ui/react-focus-scope`, `dist/index.mjs:65`). Quando o microtask roda, a
  armadilha de foco e o `aria-hidden` já saíram. A afirmação 1 do handoff se confirma pela leitura; o aviso do
  console só se vê no navegador.
- O `onCloseAutoFocus` do diálogo (`:237-240`) não rouba o foco. O `FocusScope` dispara o evento num
  `setTimeout(0)` (`dist/index.mjs:89-93`), depois do microtask. O nosso handler chama `preventDefault`, então o
  handler padrão do Radix não roda, e `triggerRef.current` já é `null`, então o `focus()` do gatilho não faz nada.
- Vazamento: nenhum. Os dois efeitos têm dependência vazia e não registram ouvinte, timer nem observer. O
  microtask segura só `tableRoot` e um índice, e `focusRowActionsNear` (`:65-87`) sai cedo se a tabela foi
  desmontada (`isConnected`). Isso cobre a navegação pelo item "Editar" (`router.push`), em que o menu desmonta
  com o foco no gatilho junto com a tabela inteira. No ensaio do `StrictMode` (monta, desmonta, monta) nada está
  focado e `findRowPosition` devolve `null`.
- Contrato antigo intacto. Cancelar, Escape, exclusão que falha e item extra que não remove a linha (arquivar)
  não desmontam o `ActionsMenu`, então os dois efeitos novos nem rodam e o foco volta ao gatilho pelo mesmo
  `onCloseAutoFocus` de antes. Os casos "keeps focus on the trigger when the row survives the delete" e "returns
  focus to the row's own trigger on cancel" (`actionMenu.test.tsx`) cobrem isso com uma `Table` real.
- Os quatro consumidores (`EntitiesListClient.tsx:146-150`, `UsersListClient.tsx:187-191`,
  `OrganizationInvitationsTable.tsx:92-94`, `OrganizationMembersTable.tsx:124-126`) chamam `mutation.mutate` sem
  esperar e herdam o comportamento sem mudar código.
- Os dois comentários novos (`action-menu.tsx:123-125`, e o de `MetricStrip.tsx:24-25`) explicam o porquê de um
  código que não se lê sozinho, sem citar o fluxo. Atende `.claude/rules/code-comments.md` §2.

**B. `viewport` nos layouts**

- `apps/app/app/layout.tsx:26` e `apps/web/app/[locale]/layout.tsx:23` são os únicos `viewport` do repositório.
  Nenhum outro layout ou página exporta `viewport` ou `generateViewport`, e nenhum `metadata` ou
  `generateMetadata` (as páginas da web em `[locale]/*/page.tsx`) declara `themeColor` ou `viewport`. Não há
  conflito, e o Next mantém o `width=device-width, initial-scale=1` padrão.
- `packages/design-system/lib/themeColor.ts` não importa `next`, mora ao lado de `lib/fonts.ts` e é genérico. O
  teste em `themeContrast.test.ts` converte o `--background` dos dois temas e compara com o hex.

**C. `MetricStrip` (`apps/app/shared/components/ui/MetricStrip.tsx:26-27`, `:42`)**

- Conferi as bordas célula por célula. Abaixo de `lg`, com 4 itens: a 2 e a 4 ganham borda à esquerda, a 3 e a 4
  ganham borda em cima. A partir de `lg`: 2, 3 e 4 ganham borda à esquerda e nenhuma ganha borda em cima. Com 5 a
  8 itens em `lg`, a 5 abre a segunda linha com borda em cima e sem borda à esquerda. `max-lg:` e `lg:` geram
  media queries que não se sobrepõem, então a ordem do CSS não importa.
- O `tailwind-merge` do `cn` mantém as seis classes, porque cada uma tem um modificador diferente. O teste
  `metricStrip.test.tsx` confere isso depois do `cn`.
- A sombra solta no playground (`playground/page.tsx:820`, `shadow-[inset_0_0_0_1px_var(--border)]`) é o mesmo
  anel da `Table` `variant="flush"` (`table.tsx:248`), usado porque a `PlaygroundSection` já é um cartão. Tem
  precedente no design system e não fere §5.1.
- Rótulos literais no playground ("Métrica 1" a "Métrica 4"): a página inteira usa texto literal, e é vitrine de
  desenvolvimento, não tela de produto.

**D. Regra do paginador (`packages/design-system/components/ui/table.tsx:185-193`)**

- Sem `showSizeChanger`, `filteredRows.length <= pageSize` equivale ao `pageCount === 1` de antes, porque
  `showPager` já exige `filteredRows.length > 0`. Com `showSizeChanger`, o limite é o menor entre o `pageSize`
  configurado e as opções. A paginação é só no cliente, então `filteredRows.length` é o total.
- O único consumidor com as duas flags é `UsersListClient.tsx:231-232`.

**Transversal**

- Sem domínio de produto em `packages/*`, sem i18n novo, sem API, sem SDK, sem `console.log`.
- `docs/DESIGN.md` §6 passo 5 ganhou a linha sobre o hex do `themeColor`.

### 👁 Verificar no `/test`

Na ordem de prioridade. A primeira sustenta o corte da feature.

1. Foco depois de excluir pelo teclado, no Chrome. Repro: `/pt-br/entities` com as entidades do seed, Tab até o
   gatilho da 2ª linha, Enter, "Excluir", Enter no confirmar. Medir `document.activeElement` (deve ser o gatilho
   da linha que subiu) e `matches(':focus-visible')`. Repetir com a última linha (vai para a anterior) e, com uma
   busca que deixe uma linha só, com a única (vai para o campo de busca). Console sem "Blocked aria-hidden on an
   element because its descendant retained focus".
2. E2E da asserção nova, com repetição, por causa da janela descrita em 🟡:
   `pnpm e2e -- tests/entityCrud.spec.ts --repeat-each=5`. Uma falha em cinco já indica teste intermitente.
3. Mesmo fluxo com o mouse: o foco vai para a vizinha e `:focus-visible` é falso.
4. Arquivar em `/admin/users`: a linha continua e o foco volta ao gatilho dela. Cancelar e Escape na confirmação
   também devolvem o foco ao gatilho.
5. "Editar" pelo menu de uma linha em `/pt-br/entities`: na tela de edição, o foco não pula para nenhum elemento
   inesperado.
6. `theme-color`: `document.querySelectorAll('meta[name="theme-color"]')` em `/pt-br` (web) e em `/` (app) devolve
   duas entradas, `media` claro com `#f9fafb` e escuro com `#0c0e12`; a `meta[name=viewport]` continua
   `width=device-width, initial-scale=1`. A cor da barra fica como não verificada sem aparelho.
7. `MetricStrip` no playground `#metric-strip`: 390 px em 2×2 com divisória vertical entre colunas e horizontal
   entre linhas; 1024 e 1440 px em 1×4 sem borda em cima; o valor de nove dígitos cabe na célula. Home comum e
   home admin (2 e 3 itens) sem mudança.
8. Paginador em `/admin/users` com 15 usuários: escolher 20 mostra as 15 linhas, "Página 1 de 1" e o seletor;
   voltar para 10 sem recarregar.

## Correções aplicadas

- Volta 1: nenhuma.
- Volta 2: `apps/app/shared/components/ui/MetricStrip.tsx`, valor do layout de 4+ itens em uma linha só e numa
  escala menor, célula com `px-4`; `apps/app/__tests__/metricStrip.test.tsx`, 6 casos novos. Detalhe em "Volta 2".

## Raio de impacto

| Mudança | Consumidores |
|---------|--------------|
| `data-slot="actions-menu-trigger"` e foco novo no `ActionsMenu` | `EntitiesListClient`, `UsersListClient`, `OrganizationInvitationsTable`, `OrganizationMembersTable`, playground (fora de `Table`, comportamento antigo) |
| `data-slot="table-root"` e regra do `hideOnSinglePage` na `Table` | todas as tabelas dos apps; a regra nova só muda algo com `showSizeChanger` e `hideOnSinglePage` juntos, que hoje é só `UsersListClient.tsx:231-232` |
| `@repo/design-system/lib/themeColor` | `apps/app/app/layout.tsx`, `apps/web/app/[locale]/layout.tsx`, `themeContrast.test.ts` |
| `MetricStrip` com 4 ou mais itens | nenhuma tela de produto (as três usam 2, 2 e 3 itens); só o playground |

Nenhum DTO, action do SDK, rota, `error.code` nem chave de i18n mudou.

## Lacunas de teste

Veredito sobre as lacunas que o handoff listava:

- Janela entre a desmontagem do conteúdo do diálogo e o `setTimeout(0)` do Radix: continua aberta. Só existe no
  navegador; o item 2 do `/test` mede o efeito dela no e2e.
- Remoção da linha durante a animação de saída do diálogo: continua aberta, só no navegador (item 1 do `/test`).
- `ActionsMenu` fora de `Table`: fechada. Os casos que já existiam em `actionMenu.test.tsx` cobrem.

Lacuna nova:

- Desmontar a `Table` inteira com o foco no gatilho (o caminho do "Editar") não tem teste. O código está protegido
  por `isConnected` (`action-menu.tsx:66`). Um caso em jsdom que renderiza a tabela, foca um gatilho e chama
  `unmount()` fecharia a lacuna. Baixa prioridade.

## Decisões em aberto

Nenhuma.

## Artefatos da tarefa

Varri `docs/features/design-refresh-polish/` por senha, token, chave e e-mail, de novo na volta 2, já com
`test/report.md` e `test/criterios-aceite.md`. Os e-mails são `user@example.com`, `user2@example.com` e o padrão
`qa-polish-NN@example.com`, todos contas do emulador num domínio reservado para exemplo. "senha" aparece só na frase
que diz que a senha não está no arquivo (`test/report.md:137-138`), e "token" só como o token `--background`. Os
prints em `test/e2e/` são descartados pelo `.gitignore` (`docs/features/**/test/e2e/`, linha 302).

## Gates

| O quê | Comando | Resultado |
|-------|---------|-----------|
| Lint | `pnpm check` | `Checked 1182 files in 670ms. No fixes applied.` |
| Typecheck | `pnpm turbo run typecheck --filter=@repo/design-system --filter=app --filter=web --filter=e2e` | 4/4 (3 do cache) |
| Paridade i18n | não rodada | nenhuma chave tocada |
| Volta 2, testes do app | `pnpm --filter app test` | 159 arquivos, 1427 testes, todos verdes (eram 1421; +6 do bloco novo) |
| Volta 2, typecheck do app | `pnpm --filter app typecheck` | sem erro |
| Volta 2, lint | `pnpm check` | `Checked 1182 files in 725ms. No fixes applied.` |
| Testes | não rodados aqui (são do `/test`) | o handoff mediu design-system 215, app 1421, web 329 |

## Plano de commits

Ordem: design-system, app, web, e2e, docs, artefatos. O `table.tsx` vai inteiro num commit só (o `data-slot` da
raiz e a regra do paginador), antes do commit do foco, porque o foco depende do `data-slot="table-root"` e o
staging por hunk não está disponível no fluxo.

1. `fix(design-system): keep the page size selector while a smaller size still paginates`
   - `packages/design-system/components/ui/table.tsx`
   - `packages/design-system/__tests__/tablePagination.test.tsx`
2. `fix(design-system): move focus to the next row's actions after a row delete`
   - `packages/design-system/components/ui/action-menu.tsx`
   - `packages/design-system/__tests__/actionMenu.test.tsx` (inclui o caso que o `/test` acrescentou)
3. `feat(design-system): export the theme color mirrored from --background`
   - `packages/design-system/lib/themeColor.ts`
   - `packages/design-system/__tests__/themeContrast.test.ts`
4. `feat(app): publish theme-color in the root viewport`
   - `apps/app/app/layout.tsx`
   - `apps/app/__tests__/rootViewport.test.ts`
5. `fix(app): lay out four or more metrics in a wrapping grid that keeps each value on one line`
   - `apps/app/shared/components/ui/MetricStrip.tsx`
   - `apps/app/__tests__/metricStrip.test.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/playground/page.tsx`
6. `feat(web): publish theme-color in the root viewport`
   - `apps/web/app/[locale]/layout.tsx`
   - `apps/web/__tests__/rootLayoutAuthProvider.test.tsx`
7. `test(e2e): assert focus lands on the next row after deleting an entity`
   - `apps/e2e/tests/entityCrud.spec.ts`
8. `docs: mirror the theme-color hex when rebranding`
   - `docs/DESIGN.md`
9. `docs(features): design-refresh-polish`
   - `docs/features/design-refresh-polish/STATE.md`
   - `docs/features/design-refresh-polish/analyze/plan.md`
   - `docs/features/design-refresh-polish/develop/handoff.md`
   - `docs/features/design-refresh-polish/review/review.md`
   - `docs/features/design-refresh-polish/test/criterios-aceite.md`
   - `docs/features/design-refresh-polish/test/report.md`
   - os prints de `test/e2e/` ficam fora pelo `.gitignore`

A correção da volta 2 entra no commit 5, junto com o layout de 4+ itens que ela corrige.

Título de PR sugerido (se ainda não houver PR aberta para a branch):
`fix: focus after delete, theme-color, metric grid and page size selector`.

### Commits realizados

(preenchido pelo orquestrador)
