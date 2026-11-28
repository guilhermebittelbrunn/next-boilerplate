# Critérios de Aceite (Checklist)

Escopo: as quatro correções de acabamento da branch `feat/design-system-refresh` (foco depois de excluir uma linha
no `ActionsMenu`, `theme-color` nos dois apps, `MetricStrip` com 4 ou mais itens e a regra do seletor de tamanho da
`Table`). O diff não tem rota de API, guard, `error.code` nem chave de tradução nova, então autorização, posse de
recurso e modo de produto ficam iguais e não entram como critério. Todos os itens passaram na
volta 2 do `/test`; o status de cada um e o meio de verificação estão em `report.md`.

- [x] **Excluir uma linha do meio pelo teclado leva o foco ao gatilho da linha seguinte**
  Numa `Table` com `ActionsMenu` por linha, a pessoa chega ao gatilho "Mais ações" com Tab, abre o menu com Enter,
  escolhe "Excluir" e confirma com Enter. Quando a linha sai da lista, o foco vai para o gatilho da linha que subiu
  para o lugar dela, com `:focus-visible` ativo e o anel visível nos temas claro e escuro. Uma linha vizinha sem
  menu é pulada. Nenhum ancestral do elemento focado fica com `aria-hidden="true"` ou `inert` no momento do foco, e
  o console não mostra "Blocked aria-hidden on an element because its descendant retained focus".

- [x] **Excluir a última linha leva o foco à anterior, e excluir a única leva à busca**
  Se a linha excluída era a última da lista, o foco vai para o gatilho da linha anterior. Se era a única (por
  exemplo, depois de uma busca que deixou um resultado só), o foco vai para o campo de busca da tabela, que mantém o
  termo digitado. Sem campo de busca e sem linhas, o foco fica no `body`, como antes da mudança.

- [x] **Excluir com o mouse move o foco sem mostrar o anel**
  O mesmo fluxo feito com cliques leva o foco ao gatilho da linha vizinha, mas `:focus-visible` fica falso e o anel
  não aparece. Quem usa mouse não vê um contorno surgir do nada; quem passa a usar Tab logo depois continua dali.

- [x] **Arquivar um usuário em `/admin/users` segue a mesma regra de foco**
  Arquivar tira o usuário da listagem (a própria descrição da confirmação diz isso), então o foco vai para o gatilho
  da linha que subiu, como numa exclusão. A linha do próprio admin não tem "Arquivar" no menu.

- [x] **Exclusão que não remove a linha mantém o foco no próprio gatilho**
  Quando o `onDelete` termina e a linha continua na lista (exclusão que falha ou ação que não remove o registro), o
  diálogo fecha e o foco volta ao gatilho daquela linha, como antes da mudança. O `ActionsMenu` usado fora de uma
  `Table` mantém o comportamento antigo.

- [x] **Cancelar ou Escape na confirmação devolvem o foco ao gatilho**
  Com o diálogo aberto, o foco inicial está em "Não". Enter em "Não" ou a tecla Escape fecham o diálogo sem excluir,
  a linha continua na lista e o foco volta ao gatilho da mesma linha, com `:focus-visible` ativo.

- [x] **"Editar" pelo menu não deixa foco preso nem roubado**
  Escolher "Editar" no menu de uma linha navega para a tela de edição. A tabela inteira desmonta com o foco no
  gatilho, e nada do `ActionsMenu` move o foco depois disso: a tela de edição abre com o foco onde ela mesma o
  coloca, sem pular para um elemento inesperado e sem erro no console.

- [x] **Os dois apps publicam `theme-color` para claro e escuro**
  Em qualquer rota do `app` e da `web`, nos três idiomas, o `<head>` tem duas `meta[name="theme-color"]`: uma com
  `media="(prefers-color-scheme: light)"` e `content="#f9fafb"`, outra com `media="(prefers-color-scheme: dark)"` e
  `content="#0c0e12"`. Os dois hex são iguais à cor de fundo do `body` em cada tema. A `meta[name="viewport"]`
  continua `width=device-width, initial-scale=1`. O `media` segue o tema do sistema operacional, não o seletor de
  tema do app (limite aceito no plano). A cor da barra do navegador só se confirma em aparelho real.

- [x] **O hex do `theme-color` acompanha o token `--background`**
  O teste de contraste converte o `--background` de `:root` e de `.dark` para hex e compara com a constante
  `themeColor`. Quem trocar a marca num fork e esquecer o hex vê o teste falhar.

- [x] **`MetricStrip` de 4 itens: 2×2 no celular e 1×4 a partir de `lg`, com divisórias só entre células**
  A 390 px a grade tem 2 colunas e 2 linhas, com divisória vertical entre as colunas e horizontal entre as linhas, e
  nenhuma borda solta no contorno do cartão. A 1024 e a 1440 px a grade tem 4 colunas numa linha só, com divisória
  vertical entre as células e nenhuma borda em cima. Com 5 a 8 itens em `lg`, a segunda linha ganha borda em cima.
  Vale nos temas claro e escuro.

- [x] **O valor longo cabe na célula do `MetricStrip` de 4 itens sem quebrar no meio do número**
  O valor de nove dígitos do playground (`123.456.789`) fica numa linha só e dentro da célula em 390, 1024, 1280 e
  1440 px, com a barra lateral aberta a partir de 1024 px. No layout de 4 ou mais itens o número nunca quebra: quando
  falta largura, a fonte diminui (20 px abaixo de 1280 px, 24 px a partir daí), e a quebra acontece só entre células.
  Um número partido em duas linhas ("123.456.7" e "89") se lê como dois números e não atende ao critério. Abaixo de
  390 px, fora da largura mínima do contrato, um número desse tamanho pode passar da célula (em 320 px ele cruza a
  divisória); os layouts de 1 a 3 itens mantêm a quebra livre de antes.

- [x] **`MetricStrip` de 1, 2 e 3 itens sem mudança**
  As telas de produto que usam o componente (home comum com 2 itens, home admin com 3 e 2 itens) mantêm as mesmas
  classes de layout e o mesmo número de colunas de antes, no celular e no desktop.

- [x] **Com `showSizeChanger`, o paginador só some quando o total cabe no menor tamanho oferecido**
  Em `/admin/users` com 15 usuários e 10 por página, o paginador mostra "Página 1 de 2". Escolher 20 mostra as 15
  linhas, "Página 1 de 1" e o seletor de tamanho, que continua lá para voltar. Voltar para 10 mostra 10 linhas e
  "Página 1 de 2" sem recarregar a página. Com total menor ou igual ao menor tamanho (8 linhas e opções 10/20/50),
  o paginador some. Os rótulos aparecem traduzidos nos três idiomas ("Linhas por página", "Filas por página",
  "Rows per page").

- [x] **Sem `showSizeChanger`, `hideOnSinglePage` se comporta como antes**
  Numa tabela com `hideOnSinglePage` e sem seletor de tamanho, o paginador some quando há uma página só e aparece
  quando há mais de uma, exatamente como antes da mudança.

- [x] **O e2e de CRUD de entidade confere o foco depois de excluir e não é intermitente**
  `apps/e2e/tests/entityCrud.spec.ts` verifica que, depois de excluir a entidade editada, o gatilho da linha que
  ocupou o índice dela (ou da anterior, se era a última) está focado. O teste passa em execuções repetidas nos dois
  projetos (desktop e mobile) e falha quando o movimento de foco é removido do `ActionsMenu`.
