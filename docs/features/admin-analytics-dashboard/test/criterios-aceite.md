# Critérios de Aceite (Checklist)

Feature `admin-analytics-dashboard`: métricas de atividade na home do admin.

Veredito ao fim de cada critério: ✅ aprovado, ❌ reprovado, 🔒 não verificável sem infra externa. O meio da
verificação vem entre parênteses.

- [x] **Só administrador alcança o agregado**
  A rota `GET /users/activity-summary` responde 200 com o DTO quando quem chama é admin, 403 com
  `ADMIN_FORBIDDEN` quando é usuário comum, e 401 com `AUTH_INVALID_TOKEN` quando não há token ou o token
  não vale. A checagem vive no guard `requireAdminApi`, no servidor, e não depende de a UI esconder a tela.
  Um método diferente de `GET` na mesma URL responde 405.
  ✅ (curl contra a API rodando, quatro chamadas)

- [x] **A URL estática não é confundida com a rota por id**
  `/users/activity-summary` resolve para o handler do agregado, e não para `/users/[id]` com id
  `"activity-summary"`. A resposta traz o DTO de contagens, não um 404 de usuário inexistente.
  ✅ (curl como admin; o corpo devolvido é o agregado)

- [x] **Admin personificando um comum não alcança a área admin**
  Com a personificação ativa, navegar para `/pt-br/admin` termina em `/pt-br`, a home comum. Nenhum
  cabeçalho, cartão ou rótulo de faixa do agregado aparece na tela do sujeito personificado, e o prefetch do
  servidor nem chega a ser disparado, porque está dentro do `if (!(await isImpersonating()))`.
  ✅ (browser: troca de painel, navegação e leitura da tela; teste `adminHomePrefetch.test.tsx`)

- [x] **Trocar de sujeito não deixa agregado velho em cache**
  Ao voltar da personificação para o painel de administração, o bloco de atividade reaparece com os números
  que a API responde naquele momento, e não com os que estavam na tela antes da troca. O `resetQueries()` da
  troca de sujeito varre o prefixo `users`, sob o qual a chave nova foi registrada.
  ✅ (browser: ida e volta da personificação, comparando os valores com a resposta da API)

- [x] **Usuário não autenticado vai para o login**
  Abrir `/pt-br/admin` sem sessão responde 307 para `/pt-br/sign-in?redirect=%2Fpt-br%2Fadmin`, preservando
  o destino. Nenhum dado do agregado é renderizado no caminho.
  ✅ (curl sem cookie de sessão)

- [x] **Usuário comum não vê a área admin nem o bloco de atividade**
  Um usuário comum que digita `/pt-br/admin` termina na home comum, sem a seção "Atividade" no documento.
  ✅ (browser, autenticado como usuário comum)

- [x] **Os dois cartões trazem os limiares que o servidor mandou**
  O `hint` do cartão de ativos traz 7 dias e 15 minutos; o de inativos traz 30 dias. Os três números vêm do
  campo `thresholds` do DTO e entram na copy por placeholder, então nenhum `{days}`, `{minutes}` ou
  `{count}` sobra na tela.
  ✅ (browser, com a rota respondendo de verdade: "Acessaram nos últimos 7 dias. O registro tem precisão de
  15 minutos." e "Sem acesso há mais de 30 dias. Não inclui quem nunca acessou.")

- [x] **As cinco faixas do gráfico batem com a resposta da API**
  Cada barra mostra a contagem da faixa correspondente, e as cinco somam o total de perfis não excluídos.
  Com 13 perfis na base, a API respondeu `2/3/2/4/2` e o gráfico desenhou as mesmas cinco alturas, na ordem
  do acesso mais recente para o mais antigo.
  ✅ (browser: comparação entre o corpo JSON da rota e os rótulos das barras)

- [x] **`never` é derivado do total e nunca fica negativo**
  A quinta faixa não tem consulta própria: é o total menos as quatro faixas carimbadas, com piso em zero.
  Perfil que nunca acessou não tem o campo `lastAccessAt` e por isso sai de qualquer consulta de intervalo.
  ✅ (`userActivitySummaryRepository.test.ts`; confirmado no browser, onde carimbar um perfil moveu a
  contagem de `never` de 2 para 1 e depois para 0)

- [x] **O aviso de perfis sem registro aparece e some na hora certa**
  Com `never > 0` o texto abaixo do gráfico traz a contagem real; com `never === 0` o parágrafo inteiro sai
  do documento, sem deixar frase truncada nem o número zero solto.
  ✅ (browser: "2 perfis ainda não têm registro de acesso…" com `never` igual a 2, e nenhum parágrafo com
  `never` igual a 0; também coberto por `userActivitySection.test.tsx`)

- [x] **O estado de estreia mostra `active` igual a 1 e o resto em "Nunca"**
  Numa base recém-semeada, em que ninguém além do admin acessou, o cartão de ativos marca 1, porque o guard
  carimba o próprio admin antes de a agregação rodar, e todos os demais perfis caem na faixa "Nunca". É o
  que todo fork com base existente vê no primeiro deploy.
  ✅ (browser e API logo após `pnpm seed`: `active` 1, `never` 2, total 3)

- [x] **A falha do agregado de atividade não derruba o resto da página**
  Quando a rota responde 503 com `SUMMARY_INDEX_MISSING`, a saudação, os três cartões antigos e o título da
  seção "Atividade" continuam na tela, e só o miolo do bloco é substituído pela mensagem traduzida. O
  prefetch do servidor engole a falha e o cliente refaz a busca, recebendo o 503.
  ✅ (browser, com a rota respondendo 503 tanto para o prefetch do servidor quanto para a busca do cliente:
  "Olá", "Usuários 13", "Administradores 1" e "Usuários comuns 12" permaneceram)

- [x] **A mensagem de indisponibilidade sai traduzida nos três idiomas**
  O `error.code` `SUMMARY_INDEX_MISSING` vira copy do dicionário, nunca um stack trace nem o texto genérico
  de erro inesperado.
  ✅ (browser: "O resumo está indisponível no momento. Tente de novo em instantes.", "The summary is
  unavailable right now. Try again shortly.", "El resumen no está disponible ahora. Inténtalo de nuevo en
  unos instantes.")

- [x] **A home comum não regrediu**
  O diff mexe em `queryKeys.ts` e no `CategoryBarChart`, os dois compartilhados pelas duas homes. A home
  comum continua com os dois cartões e o gráfico de tipos, sem a seção de atividade, que é exclusiva do
  admin. Com três categorias, o `interval={0}` não aperta nada: o pior caso é "Collaborator" em inglês a
  320 px, e ainda sobra folga.
  ✅ (browser, como usuário comum: "Entidades 4", "Ativas 3", gráfico com Franquia 2, Cliente 1,
  Colaborador 1. Os três rótulos aparecem a 375 px e a 320 px nos três idiomas, sem sobreposição nem corte)

- [x] **Os cinco rótulos do eixo X cabem em 375 px, nos três idiomas**
  As cinco categorias aparecem sem sobreposição e sem corte na largura de referência de mobile, e o eixo não
  esconde rótulo em silêncio: `interval={0}` obriga um tick por categoria, e os rótulos numéricos
  (`0-7d`, `8-30d`, `31-90d`, `+90d`) têm a mesma largura nos três idiomas. Só `never` continua palavra
  ("Nunca" / "Never" / "Nunca"), e a unidade passou para a descrição do gráfico.
  ✅ (browser, 375 px: os cinco ticks nos três idiomas, folga mínima de 14,8 px entre vizinhos, nada
  cortado. A 320 px também saem os cinco, com folga mínima de 3,8 px. Medições no `report.md`)

- [x] **As cinco barras continuam distinguíveis nos dois temas**
  Os tokens `--chart-1..5` trocam de valor entre claro e escuro, então as cinco cores precisam continuar
  separáveis nas duas paletas. No tema escuro saem azul, verde, laranja, roxo e vermelho; no claro, laranja
  avermelhado, verde-azulado, azul-petróleo, amarelo e laranja. Cada barra ainda carrega o próprio número
  impresso acima dela, o que sustenta a leitura de quem não separa dois tons vizinhos.
  ✅ (browser, nos dois temas, com os cinco valores computados de `fill` distintos em cada paleta. Remedido
  depois da troca de rótulos: os cinco `fill` do tema claro voltaram idênticos, então a mudança de copy não
  mexeu em cor)

- [x] **O gráfico se anuncia para leitor de tela**
  O contêiner do gráfico expõe `role="img"` e um rótulo acessível com o título da seção, já que o SVG não
  carrega texto próprio.
  ✅ (árvore de acessibilidade: `image "Último acesso por faixa"`)

- [x] **A copy da seção sai nos três idiomas**
  Título, descrição, rótulos dos cartões, título e descrição do gráfico, as cinco faixas e o aviso de perfis
  sem registro têm texto próprio em pt-br, en e es, sem chave faltando nem literal solto. As quatro faixas
  de intervalo são notação numérica e por isso saem com a mesma string nos três idiomas; quem carrega a
  unidade é a descrição do gráfico, que abre com "Dias desde o último acesso", "Days since the last sign-in"
  e "Días desde el último acceso".
  ✅ (browser nos três locales, com a copy nova; paridade de chaves por `parity.test.ts` e limite de
  comprimento por `chartAxisLabels.test.ts`)

- [x] **O gráfico não entra no pacote inicial da home**
  `recharts` é carregado por `next/dynamic` com `ssr: false` e um `Skeleton` no lugar enquanto não chega,
  para não pesar a primeira tela que o admin abre.
  ✅ por leitura do código e pelo comportamento observado, com o esqueleto aparecendo antes do gráfico. A
  medição no pacote em si continua fora do alcance desta etapa, como o `report.md` explica.

- [ ] **Degradação real por índice composto ausente**
  Em projeto Firebase real, sem o índice de `user` por `deletedAt` mais `lastAccessAt`, a consulta falha com
  `FAILED_PRECONDITION` e a rota traduz isso em 503 `SUMMARY_INDEX_MISSING`. O emulador serve a consulta com
  ou sem índice, e publicar índice em projeto real está fora do alcance desta etapa.
  🔒 (a resposta 503 e a tela degradada foram verificadas; o que não foi é o Firestore real recusar a
  consulta. Pré-requisito de infra, registrado na §1.7 do `PRE-PRODUCTION.md`)

- [ ] **Custo da agregação por abertura da home**
  O plano conta 8 agregações e nenhuma leitura de documento por abertura. As cinco contagens do agregado de
  atividade estão provadas em teste, e a resposta HTTP não carrega documento algum.
  🔒 (leitura faturada só se mede contra projeto real com billing; o emulador não a reporta)

- [x] **Duplo clique no botão de recarregar**
  Não se aplica: a seção de atividade não tem botão de recarregar nem qualquer ação que o usuário dispare. O
  único caminho de rede é a busca automática do hook.
  ✅ pela inexistência do controle, confirmada no código e na árvore de acessibilidade da tela
