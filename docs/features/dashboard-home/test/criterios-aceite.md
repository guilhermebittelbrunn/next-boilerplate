# Critérios de Aceite (Checklist)

Feature: home do painel com widgets (`dashboard-home`). Base: seções 6, 7, 8 e 12 do `analyze/plan.md`.

Legenda de status, usada no fim de cada parágrafo: ✅ aprovado (verificado e correto), ❌ reprovado
(falha observada), 🔒 não verificado (depende de infraestrutura que ninguém provisionou nesta rodada).
Um 🔒 não é defeito e não bloqueia a entrega.

## Dados e cálculo

- [x] **O total de entidades vem de consulta própria, não da soma dos tipos**
  A home comum mostra em "Entidades" o número devolvido por `GET /entities/summary` no campo `total`, que
  o repositório obtém com uma agregação separada sobre `userId + deletedAt == null`. Um documento gravado
  sem `type` entra nesse total e fica fora das três contagens por tipo, então a soma das barras pode ser
  menor que o total; a tela não tenta reconciliar os dois números nem cria categoria "outros". Verificado
  no browser com a conta `user@example.com` (4 registros, barras 2/1/1) e com um documento sem `type`
  gravado direto no emulador (total 1, nenhuma barra). ✅

- [x] **O cartão "Ativas" conta só registros com `enabled == true`**
  A contagem de ativas sai de uma agregação com o filtro `enabled == true` somado ao escopo do usuário, e
  não de uma filtragem em memória. No seed, `user@example.com` começa com 4 registros e 3 ativos; depois
  de ligar o registro desativado pela lista, a home passa a mostrar 4 e 4. ✅

- [x] **A home admin conta perfis, separando administradores de comuns**
  `GET /users/summary` devolve `total` e `byType` com as contagens de `admin` e `common` sobre perfis não
  excluídos. Os três cartões mostraram 3, 1 e 2 contra o seed, que cria exatamente um admin e dois comuns.
  A listagem `/admin/users` exibiu as mesmas 3 linhas nesse ambiente. ✅

- [x] **O cartão "Usuários" pode passar o número de linhas de `/admin/users`**
  A contagem vem do Firestore; a listagem descarta perfil cujo usuário de Auth foi apagado por fora. Com
  perfil órfão, o cartão mostra um número maior que a quantidade de linhas. É comportamento documentado no
  DTO, não defeito. No ambiente de teste não existia perfil órfão, então os dois números coincidiram e a
  divergência ficou sem reprodução no browser; o comportamento do repositório tem teste unitário. ✅

## Autorização

- [x] **`GET /entities/summary` só conta o sujeito autenticado**
  A rota é guardada por `requireCommonPanelApi` e conta por `ctx.subjectProfile.id`. Nenhum identificador
  vem do request, então não há ownership a forjar. Requisição sem token responde 401 `AUTH_INVALID_TOKEN`
  e o repositório não é tocado. Coberto por `entitiesSummaryRoute.test.ts`. ✅

- [x] **Admin que não está personificando não acessa o resumo do painel comum**
  Quando um admin pede `/entities/summary` sem indicar sujeito, o guard recusa antes do repositório com
  403 `AUTH_REQUEST_IMPERSONATION_REQUIRED`. O plano previa `COMMON_PANEL_FORBIDDEN`; o guard recusa antes
  disso, e o teste assere o código que a rota devolve de fato. O log da API registrou 13 respostas 403
  nesse cenário durante a rodada no browser. ✅

- [x] **`GET /users/summary` exige perfil admin**
  A rota é guardada por `requireAdminApi`. Perfil comum recebe 403 `ADMIN_FORBIDDEN` e requisição sem
  token recebe 401 `AUTH_INVALID_TOKEN`, em ambos os casos sem consultar o repositório. Coberto por
  `usersSummaryRoute.test.ts`. ✅

- [x] **Admin personificando vê os números do usuário personificado**
  As duas rotas são GET, então passam por `assertReadOnlyWhileImpersonating`. Com o painel do usuário
  selecionado e `user2@example.com` escolhido, a home comum mostrou 2 e 2, que são os números do
  personificado, não os do admin; trocando para `user@example.com`, passou a mostrar 4 e 4. O prefetch RSC
  é pulado nesse caso, então o resumo chega por requisição do cliente. ✅

- [x] **Nenhuma das duas rotas aceita escrita**
  Cada arquivo de rota exporta apenas `GET`, e os dois testes de rota verificam isso lendo as chaves do
  módulo. Sem `POST`, `PATCH` ou `DELETE`, não existe caminho para um chamador gravar uma contagem. ✅

## Estados da tela

- [x] **Enquanto os números não chegam, a tela mostra esqueleto e não zeros**
  Nas duas homes, o estado de carga renderiza `Skeleton` no lugar do valor. Zero é um número legítimo, e
  imprimi-lo antes da resposta faria o usuário ler um dado errado por alguns instantes. Os testes de
  componente conferem que nenhum "0" aparece durante a carga e que a home admin desenha exatamente três
  esqueletos. ✅

- [x] **Usuário sem nenhum registro vê orientação, não cartões zerados**
  Com `total == 0`, a home comum troca cartões e gráfico por um bloco com título, descrição e o botão
  "Cadastrar entidade". Verificado no browser depois de excluir os dois registros de `user2@example.com`
  pela própria lista. ✅

- [x] **O botão do estado vazio fica desabilitado em personificação**
  Personificação é somente leitura, então o botão que leva ao cadastro aparece desabilitado quando o admin
  está agindo como outro usuário. Coberto por teste de componente. ✅

- [x] **Total maior que zero com todos os tipos zerados mostra aviso, não gráfico vazio**
  Quando as três contagens por tipo dão zero e ainda assim existe registro, a tela substitui o gráfico pela
  frase "Ainda não há dados para o gráfico." em vez de desenhar três colunas de altura zero. Verificado no
  browser gravando um documento de `entity` sem `type` direto no emulador: a home mostrou 1 e 1 nos cartões
  e o aviso no lugar do gráfico. ✅

- [x] **Falha no resumo mostra a mensagem traduzida e preserva a saudação**
  O erro é convertido por `FormattedError` + `handleClientError` e renderizado dentro de `LoadErrorState`,
  sem derrubar a saudação nem deixar esqueleto eterno. Com a resposta 503 `SUMMARY_INDEX_MISSING`, as duas
  homes mostram "O resumo está indisponível no momento. Tente de novo em instantes.". Verificado por teste
  de componente nas duas telas, partindo de um erro axios que carrega esse `error.code`. ✅

- [x] **A saudação não deixa vírgula solta quando a conta não tem nome**
  A home comum usa `displayName` de `GET /account` e cai para o do Firebase; a home admin usa só o do
  Firebase, porque `GET /account` responde 403 para admin que não personifica. Sem nome, o texto fica só
  "Olá", sem a vírgula. As contas do seed não têm `displayName`, e as duas telas mostraram "Olá" no
  browser. ✅

## Gráfico

- [x] **As barras usam os tokens de tema, não a paleta padrão do recharts**
  Cada barra recebe `fill: var(--color-<categoria>)`, e o `ChartContainer` publica essas variáveis
  apontando para `--chart-1`, `--chart-2` e `--chart-3`, com bloco separado para `.dark`. No claro as
  barras saíram laranja, verde azulado e azul escuro; no escuro, azul, verde e laranja. O teste de
  componente prende as duas pontas: o `fill` de cada barra e o conteúdo do bloco de estilo. ✅

- [x] **Os rótulos do eixo saem do dicionário**
  O eixo formata cada categoria pelo `label` do `ChartConfig`, que vem de
  `pages.common.entities.list.typeLabels`. Em português as colunas aparecem como Franquia, Cliente e
  Colaborador. Categoria desconhecida cai para o próprio identificador, em vez de rótulo vazio. ✅

- [x] **O gráfico tem descrição para quem não enxerga as colunas**
  O SVG não carrega texto próprio, então o contêiner recebe `role="img"` e `aria-label` com o título do
  cartão. Conferido no teste de componente e no snapshot de acessibilidade do browser, que mostra
  `image "Entidades por tipo"`. ✅

## Rotas e cache

- [x] **O segmento `summary` vence o `[id]` vizinho**
  As duas rotas ficam ao lado de um segmento dinâmico. Se o roteador resolvesse a favor do dinâmico, a
  resposta seria `ENTITY_NOT_FOUND`. O log da API registrou 27 respostas 200 em `GET /entities/summary` e
  16 em `GET /users/summary`, e nenhum `ENTITY_NOT_FOUND`. ✅

- [x] **O toggle de `enabled` move o cartão "Ativas" sem refazer a consulta**
  A mutation de toggle ajusta o resumo no cache com `setQueryData` e desfaz o ajuste quando a requisição
  falha, sem `invalidateQueries`. Ligando um registro na lista e voltando para a home, o cartão passou de
  3 para 4 sem recarregar a página. Coberto também por teste de hook, que lê o cache direto. ✅

- [x] **Criar, editar e excluir invalidam o resumo**
  As três mutations invalidam `queryKeys.entities.summary()`, então a home não fica com total velho depois
  de uma alteração na lista. Coberto por teste de hook. ✅

- [x] **O prefetch RSC escreve na mesma chave que o hook lê**
  As duas páginas fazem prefetch no servidor com a mesma `queryKey` do hook do cliente, dentro da condição
  que pula o prefetch em personificação. Numa carga limpa o navegador não chega a pedir o resumo. Coberto
  por teste de hook, que confere a chave no cache. ✅

## Tema, responsivo e idiomas

- [x] **As duas homes funcionam em tema claro e escuro**
  Cartões, gráfico e estado vazio foram vistos nos dois temas, com as barras trocando de paleta junto com
  o tema. ✅

- [x] **Os cartões empilham em largura de celular**
  Em 390x844, os dois cartões da home comum e os três da admin empilham em coluna, e o gráfico cabe na
  viewport sem estourar a largura. ✅

- [x] **Todo texto novo existe nos três idiomas**
  As duas páginas novas e o código `SUMMARY_INDEX_MISSING` estão em `pt-br`, `en` e `es` com a mesma
  estrutura. O teste de paridade do pacote de internacionalização passa, e a home admin foi vista em
  inglês ("A summary of the user base.") e espanhol ("Un resumen de la base de usuarios."). ✅

## Infraestrutura

- [ ] **Com os três índices compostos publicados, as rotas respondem 200 contra Firestore real**
  As agregações precisam dos índices `entity (userId, deletedAt, enabled)`, `entity (userId, deletedAt,
  type)` e `user (deletedAt, type)`. Ninguém publicou esses índices em ambiente algum, e o emulador serve
  consulta sem índice, então a feature funciona localmente sem que isso seja provado. A declaração em
  `firestore.indexes.json` tem teste próprio, mas esse teste confere texto, não comportamento. Depende de
  `firebase deploy --only firestore:indexes` e do tempo de construção do índice, conforme a seção 12 do
  plano. 🔒

- [ ] **Sem os índices, as rotas devolvem 503 `SUMMARY_INDEX_MISSING` de verdade**
  `isMissingIndexError` reconhece a recusa do Firestore e as rotas traduzem isso em 503 com esse código.
  A cadeia está provada por partes: teste de rota para o par status + código, teste de paridade para a
  cópia nos três idiomas e teste de componente para a mensagem na tela. O que continua sem prova é o
  Firestore real recusando a agregação por índice ausente, porque o emulador não recusa e nenhum ambiente
  com Firestore real foi usado. 🔒

## Roteiro de teste manual

Pré-requisitos: emuladores do Firebase de pé (`pnpm emulators`, que exige JDK 21 ou superior), `pnpm seed`
e os apps `api` e `app` rodando. Senha de todas as contas do seed: `demo1234`.

1. Entrar como `user@example.com` e abrir a home. Esperado: "Entidades" 4, "Ativas" 3, gráfico com
   Franquia 2, Cliente 1, Colaborador 1.
2. Trocar o tema para claro e para escuro. Esperado: as barras mudam de paleta junto com o tema.
3. Reduzir a janela para 390 de largura. Esperado: os cartões empilham e o gráfico cabe na tela.
4. Abrir "Entidades", ligar o registro desativado e voltar para a home pelo breadcrumb. Esperado: "Ativas"
   sobe para 4 sem recarregar a página.
5. Excluir todos os registros e voltar para a home. Esperado: bloco "Nada por aqui ainda" com o botão
   "Cadastrar entidade", sem cartões nem gráfico.
6. Sair e entrar como `admin@example.com`. Esperado: a home admin com Usuários 3, Administradores 1 e
   Usuários comuns 2.
7. Comparar com `/admin/users`. Esperado: 3 linhas, o mesmo número do cartão, desde que não exista perfil
   sem conta de Auth.
8. No seletor de painel, escolher "Painel do usuário" e depois `user2@example.com`. Esperado: a home comum
   com os números do personificado, e o botão de cadastro desabilitado quando a lista dele estiver vazia.
9. Trocar o idioma para inglês e espanhol nas duas homes. Esperado: rótulos, dicas e saudação traduzidos,
   sem texto em português sobrando.
