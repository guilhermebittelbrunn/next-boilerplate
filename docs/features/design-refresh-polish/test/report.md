# Relatório de QA: acabamento final da branch de design

Branch `feat/design-system-refresh` (não protegida, nada commitado nesta etapa). Escopo: o working tree descrito no
`review/review.md`, mais um caso de teste novo em `packages/design-system/__tests__/actionMenu.test.tsx`.

Resultado final (volta 2): todos os critérios passam e `test = done`. Na volta 1 o `MetricStrip` de 4 itens quebrava
o número longo no meio em 390 e 1024 px (❌); o revisor corrigiu e a volta 2, no fim deste arquivo, mediu a correção.
As seções abaixo de "Defeito encontrado" até "Fora do escopo" são o registro da volta 1.

## Defeito encontrado

### ❌ O valor longo do `MetricStrip` de 4 itens quebra no meio do número (volta 1, corrigido na volta 2)

- **Onde:** `apps/app/shared/components/ui/MetricStrip.tsx`, layout `WRAPPING_LAYOUT` (4 ou mais itens), combinado
  com `[overflow-wrap:anywhere]` no `<dd>` (classe anterior a esta tarefa, de `2f7e83b`).
- **Repro:** `/pt-br/playground`, seção `#metric-strip`, com o valor `123.456.789` na célula 3.
  - 390 px: célula de 159 px, o `<dd>` (24 px, `text-2xl`) quebra em duas linhas de 110 e 29 px de largura. Na tela
    aparece "123.456.7" e "89".
  - 1024 px (barra lateral aberta, `dl` de 647 px): célula de 162 px, o `<dd>` (30 px, `sm:text-3xl`) quebra em
    duas linhas de 120 e 54 px. Na tela aparece "123.456." e "789".
  - 1440 px: célula de 266 px, uma linha só. Passa.
- **Causa medida:** o texto inteiro precisa de cerca de 139 px a 24 px e de cerca de 174 px a 30 px. A área útil da
  célula fica perto de 121 px nas duas larguras que falham. Antes do diff, 4 itens caíam no layout de 3 itens
  (`grid-cols-1` no celular, 3 colunas a partir de `sm`), com células largas o bastante para o número.
- **Impacto:** nenhuma tela de produto usa 4 ou mais itens hoje (só o playground). Um fork que monte uma faixa de 4
  indicadores com valor de nove dígitos herda a quebra.
- **Correção sugerida (decisão do `/develop`):** reduzir o tamanho do valor no layout de 4+ itens, ou só passar a 2
  colunas a partir de uma largura em que o número caiba, ou trocar a quebra livre por quebra apenas nos separadores
  de milhar. O critério "o valor longo cabe na célula sem quebrar no meio do número" volta a ser medido depois.

O grid em si está correto: 2×2 com as divisórias certas em 390 px e 1×4 sem borda em cima em 1024 e 1440 px.

## Verificar no `/test` (lista do `review.md`)

| # | Item | Veredito | O que foi medido |
|---|------|----------|------------------|
| 1 | Foco depois de excluir pelo teclado | Confirmado | `/pt-br/entities`, 10 entidades. 2ª linha ("QA Polish 5"): o foco foi para o gatilho de "QA Polish 6", índice 1, `:focus-visible` verdadeiro. Última linha ("Joana Ribeiro", índice 8): foco no gatilho de "Retired Unit", índice 7. Única linha depois da busca "Acme": foco no `input[data-slot="table-search"]`, valor "Acme" mantido, `:focus-visible` verdadeiro. Sonda de `focusin` + `MutationObserver`: nenhum foco caiu sob `[aria-hidden="true"]` ou `[inert]`, e nenhum `aria-hidden` foi aplicado sobre o elemento focado. O console do `agent-browser` não traz o aviso "Blocked aria-hidden", mas também não o trouxe quando provoquei a condição de propósito, então a prova é a sonda, não o console. |
| 2 | E2e com repetição | Confirmado | `entityCrud.spec.ts --repeat-each=5`: 10 de 10 verdes (5 no projeto `chromium`, 5 no `mobile`). Com o `queueMicrotask(() => focusRowActionsNear(position))` trocado por nada, o mesmo teste falha em `toBeFocused` ("Received: inactive"), então a asserção mede o comportamento novo. A janela descrita no 🟡 do review não apareceu em nenhuma das 10 execuções nem na suíte completa. |
| 3 | Mesmo fluxo com o mouse | Confirmado | Clique no gatilho da 2ª linha, "Excluir", "Sim": foco no gatilho de "QA Polish 3" (a linha que subiu), `:focus-visible` falso. |
| 4 | Arquivar em `/admin/users`, cancelar e Escape | Derrubado em parte | A premissa "a linha continua" não vale: arquivar tira o usuário da listagem, e a descrição da confirmação diz isso. Arquivar `qa-polish-02` (índice 1) levou o foco ao gatilho de `user2@example.com`, que subiu para o índice 1, com `:focus-visible` verdadeiro. Cancelar ("Não", foco inicial do diálogo) e Escape devolveram o foco ao gatilho da mesma linha, com 10 linhas na tela. O caso "a linha sobrevive à exclusão" só tem caminho no teste de componente. |
| 5 | "Editar" pelo menu | Confirmado | Enter no gatilho, Enter em "Editar": navegou para `/pt-br/entities/edit/<id>`. Sequência de `focusin`: conteúdo do menu, item "Editar", gatilho (o menu fechando). Depois disso, nenhum `focusin`; o `document.activeElement` da tela de edição é o `body`. Nenhum erro no console. |
| 6 | `theme-color` | Confirmado | `app` (`/pt-br`, `/en`) e `web` (`/pt-br`, `/en`, `/es`): duas metas, `(prefers-color-scheme: light)` → `#f9fafb` e `(prefers-color-scheme: dark)` → `#0c0e12`. Viewport `width=device-width, initial-scale=1` em todas. Fundo do `body` convertido por canvas: `#f9fafb` no claro e `#0c0e12` no escuro, nos dois apps. A cor da barra do navegador móvel fica 🔒 (sem aparelho). |
| 7 | `MetricStrip` no playground | Derrubado em parte | Grid correto (ver abaixo). O valor de nove dígitos não vaza, mas quebra no meio do número em 390 e 1024 px. Ver "Defeito encontrado". Homes sem mudança. |
| 8 | Paginador com 15 usuários | Confirmado | 3 contas do seed + 12 `qa-polish-NN@example.com` no emulador. 10 por página: 10 linhas, "Página 1 de 2". Escolher 20: 15 linhas, "Página 1 de 1", seletor visível. Voltar para 10: 10 linhas, "Página 1 de 2". `performance.timeOrigin` igual nas três leituras, então não houve recarga. Repetido em `/es/admin/users`, escuro, 390 px, com 14 usuários (depois de arquivar um): mesmo comportamento, rótulo "Filas por página", sem rolagem horizontal. |

## Cobertura

| Comando | Resultado |
|---------|-----------|
| `pnpm turbo run test typecheck --filter=@repo/design-system --filter=app --filter=web --filter=e2e` | 16/16 tasks (11 do cache). design-system 215, app 1421, web 329, e2e (vitest) 41; typecheck dos quatro verde |
| `NODE_ENV=test npx vitest run __tests__/actionMenu.test.tsx` (em `packages/design-system`, depois do caso novo) | 25/25 |
| `pnpm --filter e2e exec playwright test tests/entityCrud.spec.ts --repeat-each=5` (JDK 21) | 14 passed (4 de setup + 10 do teste), 2,7 min |
| O mesmo arquivo com o movimento de foco removido do `action-menu.tsx`, só `--project=chromium` | 1 falha esperada em `toBeFocused`; arquivo restaurado em seguida (`git diff --stat` igual ao de antes) |
| `pnpm e2e` (suíte completa, JDK 21) | 45 passed, 3,4 min |
| `pnpm test` (root, JDK 21, sem `--force`) | 15/15 tasks (9 do cache). design-system 216, app 1421, web 329, api 1984, api `test:emulator` 284, auth 219, email 209, i18n 67, analytics 41, sdk 15, e2e 41 |
| `pnpm turbo run typecheck --filter=@repo/design-system` (depois do caso novo) | 1/1 |
| `pnpm check` | `Checked 1182 files in 658ms. No fixes applied.` |

Paridade de i18n: o diff não toca `packages/internationalization` nem cria `error.code`; ela rodou dentro do
`pnpm test` (67 verdes).

### Teste criado

`packages/design-system/__tests__/actionMenu.test.tsx`: "leaves focus on the next screen when the whole table
unmounts with focus on a row trigger". Renderiza a tabela com o foco no gatilho de uma linha e troca a tabela
inteira por um formulário com `autoFocus`, como faz o "Editar". Confere que a tabela sumiu e que o foco ficou no
campo do formulário. Limite: no jsdom, `focus()` num nó desconectado não faz nada, então o caso também passa sem o
`isConnected` de `focusRowActionsNear`. Ele protege o contrato (o `ActionsMenu` não rouba o foco da tela seguinte),
não aquela linha específica.

### Decisões de custo de teste

| Módulo tocado | Decisão |
|---------------|---------|
| `action-menu.tsx` | Caso novo em jsdom (faixa barata). O e2e de foco já existia no diff; foi só executado e mutado, sem cenário novo. |
| `table.tsx` (regra do paginador, `data-slot`) | `tablePagination.test.tsx` do develop já cobre 15 linhas com 20 por página, 8 linhas e o caso sem seletor. Nada criado. |
| `lib/themeColor.ts` e os dois layouts | `themeContrast.test.ts`, `rootViewport.test.ts` e `rootLayoutAuthProvider.test.tsx` cobrem. Nada criado. |
| `MetricStrip.tsx` | `metricStrip.test.tsx` cobre as classes. Ele não pega a quebra do número, que só se mede com layout real; o defeito saiu da passada de browser. Nada criado na faixa cara. |

Nenhum teste da faixa cara foi criado.

## Critérios de aceite

| Critério | Status | Meio |
|----------|--------|------|
| Excluir uma linha do meio pelo teclado leva o foco ao gatilho da linha seguinte | ✅ | browser (claro e escuro, pt-br e en) + componente + e2e |
| Excluir a última linha leva o foco à anterior, e excluir a única leva à busca | ✅ | browser + componente |
| Excluir com o mouse move o foco sem mostrar o anel | ✅ | browser |
| Arquivar um usuário em `/admin/users` segue a mesma regra de foco | ✅ | browser |
| Exclusão que não remove a linha mantém o foco no próprio gatilho | ✅ | componente ("keeps focus on the trigger when the row survives the delete" e o caso de `onDelete` que rejeita). Sem caminho no browser: nenhum consumidor mantém a linha depois de uma exclusão bem-sucedida, e a falha da API não foi provocada |
| Cancelar ou Escape na confirmação devolvem o foco ao gatilho | ✅ | browser (entidades e usuários) + componente |
| "Editar" pelo menu não deixa foco preso nem roubado | ✅ | browser + componente novo |
| Os dois apps publicam `theme-color` para claro e escuro | ✅ | browser (DOM) + unidade. Barra do navegador 🔒 sem aparelho |
| O hex do `theme-color` acompanha o token `--background` | ✅ | unidade (`themeContrast.test.ts`) + browser (fundo do `body` igual ao hex) |
| `MetricStrip` de 4 itens: 2×2 no celular e 1×4 a partir de `lg` | ✅ | browser (bordas medidas célula a célula, claro e escuro) + componente |
| O valor longo cabe na célula sem quebrar no meio do número | ✅ (volta 2) | browser: uma linha em 390, 1024, 1280 e 1440 px; ❌ na volta 1. Ver "Volta 2" |
| `MetricStrip` de 1, 2 e 3 itens sem mudança | ✅ | browser (home comum com 2; home admin com 3 e 2; classes iguais às de `HEAD`, colunas 1/3 e 2 em 390 e 1440 px) + componente |
| Com `showSizeChanger`, o paginador só some quando o total cabe no menor tamanho | ✅ | browser (pt-br claro desktop, es escuro 390 px) + componente. Rótulo em inglês conferido no dicionário, não na tela |
| Sem `showSizeChanger`, `hideOnSinglePage` se comporta como antes | ✅ | componente |
| O e2e de CRUD confere o foco e não é intermitente | ✅ | 10/10 repetidas + suíte completa + mutação |

## Evidências e2e

O que se viu na tela, além das medidas da tabela acima:

- O anel de foco aparece no gatilho da linha vizinha nos dois temas. No escuro ele é discreto (`ring-ring/40`, estilo
  anterior a esta tarefa).
- O toast de sucesso sai traduzido: "Entidade removida com sucesso." e "Entity removed successfully.".
- Os textos do diálogo em inglês: "Delete record", "Once deleted, this record cannot be recovered.", "No", "Yes".
- `MetricStrip` em 390 px, claro e escuro: célula 2 com `border-left` 1 px, células 3 e 4 com `border-top` 1 px,
  célula 4 com as duas, célula 1 sem borda. Em 1024 e 1440 px: células 2, 3 e 4 com `border-left`, nenhuma com
  `border-top`. Em espanhol o valor 1284 sai sem separador de milhar, que é a formatação padrão de `Intl` para
  números de quatro dígitos em `es`.
- Elemento que vence cada tela: na lista de entidades, o título "Entidades" e o botão "Novo"; no playground, o número
  em `text-3xl` de cada célula; em `/admin/users`, a tabela.

Prints em `docs/features/design-refresh-polish/test/e2e/` (descartados pelo `.gitignore`):
`01-confirmar-exclusao.png`, `02-foco-vizinha-teclado.png`, `03-unica-linha-foco-busca.png`,
`04-metric-strip-{390,1024,1440}-claro.png`, `05-metric-strip-1024-zoom.png`, `06-metric-strip-390.png`,
`07-usuarios-20-por-pagina.png`, `08-en-foco-vizinha-claro.png`, `09-es-usuarios-20-escuro-390.png`,
`10-metric-strip-390-escuro.png` (este não enquadrou a seção; as medidas no texto valem por ele). Todos com contas
`@example.com` do emulador.

## Ambiente do e2e

- Portas 3000-3003, 9099, 8080, 9199, 4001, 4400, 4500 e 9150 livres antes de começar. Nada do usuário foi
  reutilizado.
- O Playwright subiu e derrubou o próprio ambiente nas três execuções do e2e.
- Para a passada de browser, subi `pnpm emulators` e `next dev` de `api` (3002), `app` (3000) e `web` (3001) com o
  mesmo ambiente que o `buildStackEnv` do `apps/e2e` monta (emulador, projeto `demo-next-boilerplate`, sem `.env`
  local). Rodei o seed e acrescentei 12 contas `qa-polish-NN@example.com` e 6 entidades "QA Polish N" para
  `user@example.com`, tudo no emulador.
- No fim, matei os quatro PIDs que subi (emulador com SIGINT) e fechei as duas sessões do `agent-browser`. Todas as
  portas acima voltaram a responder vazio no `lsof -ti`.

## Estado de dev alterado

Nenhum. Contas e entidades de QA ficaram só no emulador, que descarta o estado ao encerrar. Nenhuma conta foi criada
em projeto Firebase real; `docs/PRE-PRODUCTION.md` não muda. A senha das contas do seed é a pública do emulador,
documentada no `docs/SETUP.md`, e não está neste arquivo.

## Lacunas

| Lacuna (origem) | Veredito |
|-----------------|----------|
| Janela entre a desmontagem do conteúdo do diálogo e o `setTimeout(0)` do Radix (handoff e review) | Continua aberta, sem efeito medido: 10 execuções repetidas, a suíte completa e 6 exclusões manuais no browser caíram todas no caminho certo. Provocar a janela de propósito exigiria atrasar o refetch para dentro de um tick específico. |
| Remoção da linha durante a animação de saída do diálogo (handoff e review) | Continua aberta pelo mesmo motivo. Nas medições do browser, a sequência de `focusin` mostra o gatilho da linha excluída recebendo o foco de volta e, em seguida, o gatilho vizinho, que é o caminho da "remoção atrasada" coberto pelo teste de componente. |
| `ActionsMenu` fora de `Table` (handoff) | Fechada no review; os casos existentes continuam verdes. |
| Desmontar a `Table` inteira com foco no gatilho (review) | Fechada com o caso novo em jsdom, com o limite descrito em "Teste criado", e medida no browser pelo item 5. |
| Cor da barra do navegador móvel (plano) | Fora de alcance sem aparelho. 🔒 |
| Exclusão que falha no browser | Aberta. Coberta só pelo teste de componente; a falha da API não foi provocada nesta passada. |

## Fora do escopo, para registro

- Depois de excluir o único resultado de uma busca, a tabela de entidades mostra "Nenhuma entidade cadastrada.",
  embora existam outras entidades fora do filtro. O texto vem do `emptyText` da página e é anterior a esta tarefa.
- O `STATE.md` está com `review = in-progress` e nenhum commit da tarefa existe ainda (`git log` termina em
  `526b382`). O gate do `/review` continua aberto.

## Volta 2: valor longo do `MetricStrip`

O revisor trocou, só no layout de 4 ou mais itens, a tipografia do valor para `whitespace-nowrap text-xl xl:text-2xl`
(sem `[overflow-wrap:anywhere]`) e o espaçamento da célula para `px-4`. Os layouts de 1 a 3 itens não mudaram. Medi de
novo no mesmo ambiente: emulador com seed e `api`/`app` de pé, conta `user@example.com` do seed, tema claro.

### Valor de nove dígitos no playground

`/pt-br/playground`, seção `#metric-strip`, célula 3 com `123.456.789`. "Linhas" é o `getClientRects().length` de um
`Range` sobre o texto do `<dd>`. A folga é a área útil da célula (largura menos o `padding`) menos a largura do texto.

| Largura | Barra lateral | Fonte | Célula | Área útil | Texto | Folga | Linhas | `scrollWidth <= clientWidth` (célula) |
|---------|---------------|-------|--------|-----------|-------|-------|--------|----------------------------------------|
| 390 px | menu móvel (fechado) | 20 px | 159 px | 127 px | 116 px | 11 px | 1 | 159 <= 159 |
| 1024 px | aberta (256 px) | 20 px | 161 px | 129 px | 116 px | 13 px | 1 | 161 <= 161 |
| 1280 px | aberta (256 px) | 24 px | 225 px | 193 px | 139,2 px | 53,8 px | 1 | 225 <= 225 |
| 1440 px | aberta (256 px) | 24 px | 265 px | 233 px | 139,2 px | 93,8 px | 1 | 265 <= 265 |

As outras três células (1.284, 37, 0) também ficam numa linha, com folga maior. O grid continua 2×2 em 390 px e 1×4
de 1024 px em diante, com `padding` de 16 px em todas as células. A estimativa do revisor (cerca de 116 px a 20 px e
uns 10 px de folga) bate com a medida.

### Larguras abaixo de 390 px (fora do contrato)

O `docs/DESIGN.md` fixa a passada em 390 e 1440 px. Medi também abaixo disso, para registrar o limite que o revisor
já tinha declarado (com `whitespace-nowrap`, o número não quebra e pode transbordar):

- 360 px: célula de 144 px, área útil de 112 px, texto de 116 px. O número invade 4 px do `padding` direito, mas a
  célula não transborda (`scrollWidth` 144 = `clientWidth` 144) e ainda sobram 12 px até a divisória.
- 320 px: célula de 124 px, área útil de 92 px. A célula transborda (`scrollWidth` 132 > `clientWidth` 124) e o "9"
  final cruza a divisória e encosta no "0" da célula 4.

Nenhuma tela de produto usa 4 itens. Fica como observação para o fork que montar uma faixa de 4 indicadores com
números longos e quiser suportar 320 px; não bloqueia.

### Homes sem mudança

| Tela | Largura | Colunas | `padding` da célula | Fonte do valor | Quebra do valor |
|------|---------|---------|---------------------|----------------|-----------------|
| Home comum (2 itens) | 390 px | 2 | 20 px | 24 px | `[overflow-wrap:anywhere]`, uma linha |
| Home comum (2 itens) | 1440 px | 2 | 20 px | 30 px | `[overflow-wrap:anywhere]`, uma linha |
| Home admin (3 itens) | 390 px | 1 | 20 px | 24 px | `[overflow-wrap:anywhere]`, uma linha |
| Home admin (3 itens) | 1440 px | 3 | 20 px | 30 px | `[overflow-wrap:anywhere]`, uma linha |
| Home admin (2 itens) | 390 / 1440 px | 2 | 20 px | 24 / 30 px | `[overflow-wrap:anywhere]`, uma linha |

Classes do `<dl>` iguais às da volta 1 e às do `HEAD` (`grid-cols-2 divide-x` e
`grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0`). Nenhum `<dd>` das homes tem `whitespace-nowrap`.

### Suítes

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter app test` | 159 arquivos, 1427/1427 |
| `pnpm test` (root, JDK 21, sem `--force`) | 15/15 tasks (13 do cache). app 1427, api 1984, api `test:emulator` 284, design-system 216, web 329, auth 219, email 209, i18n 67, os demais verdes |

O e2e não foi rodado de novo: a volta 2 mexe só no `MetricStrip`, que nenhum spec do `apps/e2e` exercita.

### Ambiente da volta 2

Portas 3000-3003, 9099, 8080, 9199, 4001, 4400, 4500 e 9150 livres antes. Subi `pnpm emulators` e o `next dev` de
`api` (3002) e `app` (3000), com o mesmo ambiente do `buildStackEnv`. No fim, matei os três PIDs (emulador com
SIGINT), fechei as sessões do `agent-browser` e as portas voltaram a sair vazias no `lsof -ti`. Prints de apoio em
`test/e2e/v2-metric-strip-{320,390,1024,1280,1440}.png`, descartados pelo `.gitignore`.

### Veredito

O ❌ da volta 1 está fechado: o número fica numa linha e dentro da célula nas larguras do contrato (390 e 1440 px) e
nas intermediárias pedidas (1024 e 1280 px, com a barra lateral aberta), e as homes não mudaram. `test = done`.

