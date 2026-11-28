# Critérios de Aceite (Checklist)

Escopo: o retorno da busca da `Table` do design system (estado de busca sem resultado, "Limpar busca" no vazio e
no campo, contagem anunciada com pausa de 500 ms) e o foco depois do menu mobile da landing. O diff não tem rota
de API, guard, `error.code` nem dado novo, então autorização, posse de recurso, impersonação e modo de produto não
mudam e não entram como critério. A `Table` é a mesma na área comum e na admin. Todos os itens abaixo passaram; o
meio de verificação de cada um está no `report.md`.

- [x] **Busca sem resultado não diz que a lista está vazia**
  Com registros carregados, sem páginas pendentes e uma busca que não casa com nenhum, a tabela mostra "Nenhum
  resultado para “<termo>”." com o ícone `SearchX` e o botão "Limpar busca", e o `emptyText` do chamador
  ("Nenhuma entidade cadastrada.") não aparece. O termo aparece sem os espaços das pontas: digitar
  "  zzz-sem-match  " mostra “zzz-sem-match”. Um termo só com espaços não conta como busca. Vale para as 6 telas
  com `searchFields` sem mudança em nenhuma delas; entidades e `/admin/users` foram percorridas no navegador.

- [x] **Vazio real continua com o texto do chamador**
  Com `dataSource` vazio e sem `hasMore`, aparece o `locale.emptyText` do chamador com o ícone de caixa de entrada
  e sem botão de limpar, com ou sem termo digitado. Nesse caso a região de anúncio diz "Nenhum resultado para
  “<termo>”." enquanto a tela mostra o texto do chamador; as duas frases são verdadeiras e a diferença é a decisão
  em aberto 1 do `review.md`.

- [x] **Busca com páginas pendentes mantém o aviso e ganha a ação de limpar**
  Com `hasMore` e busca sem resultado no que já carregou, o texto continua "Nada encontrado no que já foi
  carregado. Carregue mais para continuar a busca.", agora com o ícone `SearchX` e o botão "Limpar busca". O
  "Carregar mais" continua abaixo da tabela, e a região de anúncio lê o mesmo texto de páginas pendentes.

- [x] **"Limpar busca" no estado vazio limpa e devolve o foco**
  Clique ou Enter no botão esvaziam o campo, voltam à página 1 e põem o foco no campo de busca, com as linhas de
  volta. Pelo teclado o campo fica com `:focus-visible` e anel; o foco nunca termina no `body`. Limpar não gera
  anúncio: a região de status fica vazia.

- [x] **Botão de limpar dentro do campo**
  Com texto no campo, um botão de 24 × 24 px com nome acessível "Limpar busca" ("Clear search", "Limpiar
  búsqueda") aparece à direita, centrado no campo de 36 px, e é o próximo elemento na ordem de Tab depois do
  campo. Enter nele faz o mesmo que o botão do vazio. Com o campo vazio ele não existe. No Chrome só um "x"
  aparece, e o texto do campo não corre por baixo do botão.

- [x] **Contagem anunciada sem ruído**
  Uma região `role="status"` com `aria-atomic="true"` diz "N resultados", "1 resultado" ou o texto de nenhum
  resultado cerca de 500 ms depois da última tecla. Digitação contínua gera uma única mudança com texto, não uma por
  tecla. Sem busca, a região fica vazia. Enquanto o esqueleto da tabela aparece, a região também fica vazia e só
  anuncia a contagem quando as linhas chegam. O paginador ("Página 1 de N", `aria-live="polite"`) muda só quando o
  número de páginas muda, não a cada tecla.

- [x] **Excluir o único resultado da busca**
  Depois de excluir pelo teclado a única linha filtrada (Tab até "Mais ações", Enter, "Excluir", "Sim"), a tabela
  mostra o estado de nenhum resultado com o termo, o campo mantém o termo e o foco vai ao campo de busca com
  `:focus-visible`.

- [x] **Termo longo não quebra o layout**
  Um termo de 200 caracteres sem espaço quebra dentro da célula a 390 px, sem rolagem horizontal da tabela nem da
  página, em claro e escuro.

- [x] **Link interno do menu mobile leva o foco ao conteúdo**
  Seguir "Início", "Preços", "Contato" ou "Entrar" pelo menu mobile, com Enter ou clique simples, deixa o foco no
  `main#main-content` depois da navegação do App Router. Na home, "Início" faz o mesmo sem mudar a rota. O próximo
  Tab vai ao primeiro controle depois do início do `main` (o campo de e-mail no login), e não ao "Pular para o
  conteúdo". Nenhum anel de foco aparece no `main`, nem com teclado nem com toque.

- [x] **Link externo, link com modificador e "Sair" devolvem o foco ao botão do menu**
  "Documentação" abre outra aba e, na aba de origem, o foco fica no botão "Menu" com o painel fechado. Cmd+Enter
  (macOS) num link interno abre outra aba e deixa o foco no botão do menu. "Sair" fecha o painel, encerra a sessão
  e põe o foco no botão do menu. O Escape continua fazendo o mesmo.

- [x] **Copy nos três idiomas**
  As quatro chaves novas (`searchNoResults`, `clearSearch`, `searchResults`, `searchResultsOne`) existem em pt-br,
  en e es com a mesma estrutura, aparecem traduzidas na tela e no anúncio, e o teste de paridade passa.
