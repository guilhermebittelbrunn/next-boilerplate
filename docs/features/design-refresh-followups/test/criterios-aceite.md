# Critérios de Aceite (Checklist)

Escopo: as quatro correções de acabamento da branch `feat/design-system-refresh` (tema do `Toaster`, rejeição no
`ActionsMenu`, `pageSize` da `Table`, clique fora no menu mobile da landing). Não há rota de API, guard, `error.code`
nem chave de tradução nova, então autorização, posse de recurso e modo de produto ficam iguais e não entram como
critério. O status de cada item e o meio de verificação estão em `report.md`.

- [ ] **Tema forçado vence a preferência salva no toast**
  Quando uma página força o tema pelo `ThemeProvider` (`forcedTheme`), o `Toaster` usa esse tema, nos dois sentidos:
  forçado escuro com preferência clara sai escuro, e forçado claro com preferência escura sai claro. Sem tema
  forçado, o toast segue o `resolvedTheme` como antes. Sem nenhum tema resolvido (primeiro render), o toast cai em
  claro. Um `forcedTheme="system"` também cai em claro, porque o Sonner só estiliza `light` e `dark`; nenhum app força
  tema hoje, então esse caso não tem caminho na UI.

- [ ] **Toast de sucesso sai no tema da página**
  No app, sem tema forçado, o toast de "Entidade removida com sucesso." usa o tema atual: `data-sonner-theme="light"`
  com fundo claro no tema claro e `"dark"` com fundo escuro no tema escuro. A troca de tema pelo seletor do topo vale
  para o próximo toast sem recarregar a página.

- [ ] **`onDelete` que rejeita não deixa rejeição solta**
  Quando o `onDelete` devolve uma promise rejeitada, o `ActionsMenu` captura o erro, sai do estado ocupado
  (`aria-busy` deixa de ser `true`), fecha o diálogo de confirmação e devolve o foco ao gatilho. Nenhum
  `unhandledrejection` dispara. Mostrar o erro é responsabilidade do chamador (os consumidores atuais usam o `onError`
  da mutation); o diálogo não fica aberto para nova tentativa.

- [ ] **`onDelete` síncrono que lança erro se comporta como o que rejeita**
  Um `onDelete` que lança exceção dentro da própria chamada, sem promise, recebe o mesmo tratamento: diálogo fechado,
  foco no gatilho, botão fora do estado ocupado e nenhum `unhandledrejection`. O `onDelete` é chamado uma vez só.

- [ ] **Exclusão bem-sucedida continua como antes**
  `onDelete` síncrono que não lança e `onDelete` assíncrono que resolve se comportam como antes da correção: o botão
  "Sim" fica ocupado enquanto a promise não resolve, Cancelar e Escape não fecham o diálogo durante a exclusão, e ao
  terminar o diálogo fecha. No app, excluir uma entidade pelo menu "Mais ações" remove a linha da lista e mostra o
  toast de sucesso, em claro e em escuro.

- [ ] **Mudar `pagination.pageSize` aplica o novo tamanho e volta à página 1**
  Quando o chamador troca o valor de `pagination.pageSize`, a `Table` passa a mostrar o novo número de linhas,
  recalcula o total de páginas e volta para a página 1, mesmo que o usuário estivesse em outra página. A primeira
  linha visível passa a ser a primeira do conjunto.

- [ ] **Re-render com a mesma prop preserva a escolha do seletor**
  Se o usuário escolheu outro tamanho no seletor "Linhas por página" e a tabela re-renderiza com o mesmo
  `pagination.pageSize` (refetch, novo objeto de `pagination`, nova `dataSource`), a escolha do usuário continua
  valendo. No admin, escolher 20 e clicar em "Atualizar" mantém as 20 linhas.

- [ ] **Tabela de usuários do admin abre com dez linhas por página**
  Em `/admin/users`, com mais de dez usuários, a tabela mostra dez linhas, "Página 1 de N" e o seletor com o valor
  10 (opções 10, 20 e 50). A última página mostra só o resto. `pagination={false}` em outras tabelas continua
  mostrando todas as linhas sem paginador.

- [ ] **Clique ou toque fora fecha o menu mobile**
  Com o menu mobile da landing aberto (abaixo de `lg`, ou de `xl` quando há link de documentação), um clique de
  mouse ou um toque em qualquer ponto fora da área do botão e do painel fecha o painel, e o botão volta a
  `aria-expanded="false"`. O fechamento acontece no `pointerdown`, inclusive para toque: começar a arrastar o dedo
  sobre o conteúdo abaixo do painel fecha o menu no primeiro contato, e a página rola normalmente. O foco não volta
  ao botão, porque a pessoa escolheu outro alvo.

- [ ] **Toque ou clique dentro do painel não fecha**
  Tocar ou clicar num link do painel, numa área vazia do próprio painel ou no botão do menu não aciona o fechamento
  por clique fora. O botão continua alternando o painel sem fechar e reabrir no mesmo toque, também depois de fechar
  e reabrir pelo próprio botão. Arrastar o dedo começando dentro do painel rola a página e mantém o menu aberto.

- [ ] **Seletor de idioma dentro do painel troca a rota**
  Abrir o seletor de idioma do painel e escolher outro idioma navega para a rota do idioma (`/pt-br` para `/en` ou
  `/es`) e troca o texto da página. O item do idioma é renderizado num portal fora do painel; o clique nele conta como
  dentro, então o painel não desmonta o seletor antes da escolha.

- [ ] **Seletor de tema dentro do painel troca o tema sem fechar o painel**
  Abrir o seletor de tema do painel e escolher Escuro (ou Claro) aplica o tema na hora, com a classe `dark` no
  `<html>` e o valor salvo em `localStorage`, e o painel continua aberto depois da escolha.

- [ ] **Seletor aberto e toque fora fecham juntos, sem nada preso**
  Com o seletor de idioma aberto dentro do painel, um toque ou clique fora de tudo fecha o dropdown e o painel no mesmo
  gesto. Enquanto o dropdown modal está aberto o `body` fica com `pointer-events: none`; depois do toque fora ele
  volta a `auto` e o próximo toque no botão do menu reabre o painel normalmente.

- [ ] **Escape fecha o menu e devolve o foco ao botão**
  Com o painel aberto e o foco num link dele, Escape fecha o painel e devolve o foco ao botão do menu, com anel de
  foco visível. Outras teclas não fecham.

- [ ] **Barra cheia em 1024 px sem link de documentação**
  Sem `NEXT_PUBLIC_DOCS_URL`, a partir de 1024 px a barra cheia aparece (Início, Preços, Contato) e o botão do menu
  some. Em 1023 px o botão volta e os links da barra somem. Em 1440 px, claro e escuro, nos três idiomas, o header não
  tem rolagem horizontal.

- [ ] **Textos nos três idiomas**
  Rótulo do botão do menu ("Menu", "Menu", "Menú"), links do painel, nomes dos seletores ("Trocar idioma"/"Switch
  language", "Alternar tema"/"Toggle theme") e opções de tema ("Claro/Escuro/Sistema", "Light/Dark/System",
  "Claro/Oscuro/Sistema") aparecem no idioma da rota. Nenhuma chave nova foi criada; a paridade pt-br/en/es continua
  passando.
