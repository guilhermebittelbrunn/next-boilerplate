# Critérios de Aceite (Checklist)

Feature `app-form-layout-centered`. As telas de criar/editar usuário (admin), criar/editar entidade e a conta
passam a usar a coluna estreita centralizada, com o painel do formulário na altura dos campos. Não há rota,
contrato, `error.code` nem chave de tradução nova: os critérios são de layout, foco e regressão. O status de
cada item, com o meio de verificação, está em `test/report.md`.

- [ ] **Coluna estreita centralizada em monitor largo**
  A 1920×1080 e a 1280×800, criar usuário, editar usuário, criar entidade, editar entidade e conta mostram a
  coluna de no máximo 896 px no centro da área de conteúdo (a área à direita da sidebar), com as margens
  esquerda e direita iguais, diferença de no máximo 1 px. O `h1` do `PageHeader` começa na borda interna da
  coluna (padding de 16 px), não na borda da área de conteúdo. A barra do breadcrumb continua com a largura
  cheia, como nas outras telas. Com a sidebar recolhida a área cresce, e a coluna continua no centro dela.

- [ ] **Painel do formulário na altura dos campos**
  Nas quatro telas de criar/editar, a partir de 768 px de largura, o painel `bg-muted/50` termina logo depois
  do último campo, mais o padding de 16 px, sem faixa cinza vazia abaixo dele. A barra de ações (Voltar e
  Salvar/Criar) fica 16 px abaixo do painel e tem a largura da coluna. Quando o formulário cabe na janela, o
  espaço abaixo da barra mostra a cor de fundo da página, não a do painel. Com o `ImpersonationReadOnlyNotice`
  visível (admin personificando), o painel cresce só a altura do aviso.

- [ ] **Barra fixa em formulário longo**
  Quando o formulário é mais alto que a janela (celular a 390×844, ou editar entidade com descrição de 30
  linhas a 1280×720), a barra fica grudada no rodapé da viewport enquanto a página rola, com
  `getBoundingClientRect().bottom` igual a `innerHeight`, e continua publicando `data-sticky-action-bar`. Ao
  rolar até o fim, a barra volta a ficar logo abaixo do painel. Navegando com Tab e Shift+Tab por todos os
  campos, nenhum controle focado fica atrás da barra nem do `Navbar`.

- [ ] **Conta sem blocos esticados**
  Nas abas Perfil, Preferências, Segurança, Privacidade e Cobrança, o último bloco termina na altura do próprio
  conteúdo e não sobra área vazia criada por `flex-1`. A aba Cobrança usa a mesma coluna centralizada, tanto
  com o placeholder (Stripe desligada, `enabled: false` em `/payments/plans`) quanto com os cards de plano
  (Stripe ligada). Os botões de cada bloco continuam inline (`Footer sticky={false}`), sem barra fixa. Trocar
  de aba pelo seletor nativo (abaixo de 1024 px) ou pela lista lateral não move a coluna na horizontal.

- [ ] **Esqueleto sem salto horizontal**
  Ao navegar para criar usuário, editar usuário, criar entidade, editar entidade e conta, o `loading.tsx`
  aparece com a coluna na mesma posição e com a mesma largura da tela carregada: diferença de 0 px no `left` e
  na largura da coluna. O título do esqueleto ocupa o lugar do `h1`. Criar entidade atrás do `PlanGate` (modo
  `subscription` sem plano) mostra o esqueleto do gate dentro da mesma coluna.

- [ ] **Listas e dashboards inalterados**
  Lista de usuários, lista de entidades (com e sem itens), auditoria, home comum, admin home e organização
  continuam com a largura cheia da área de conteúdo e sem `mx-auto` nem `max-w-4xl` no corpo. No celular, a
  lista vazia mantém o painel com no mínimo metade da altura da tela, como antes.

- [ ] **Mobile preserva o painel mínimo e o erro de carga**
  A 390×844 e a 375×812, as telas de formulário ocupam a largura toda (a centralização não muda nada) e o
  painel continua com pelo menos 50vh. Abrir editar entidade ou editar usuário com um id inexistente mostra o
  `LoadErrorState` dentro do painel, com a mesma aparência de antes, sem ficar espremido; o botão Voltar
  continua disponível.

- [ ] **Temas e idiomas**
  Em claro e escuro, o painel, a barra (`bg-background/95` com blur) e o fundo mantêm o contraste atual. Em
  pt-br, en e es, os rótulos da barra cabem numa linha a 390 px e nenhum texto novo aparece, porque nenhuma
  chave de tradução mudou.

- [ ] **Autorização inalterada**
  Usuário comum que abre `/admin/users/create` ou `/admin/users/edit/<id>` continua barrado como antes. A
  mudança de layout não altera guard, rota nem dado carregado. Admin personificando vê os formulários em
  modo somente leitura, com o aviso dentro do painel.

- [ ] **Rede de regressão do E2E**
  O terceiro caso de `focusNotObscured.spec.ts` ("arrow keys keep the focused genre option clear of the
  action bar") passa em execuções repetidas depois da correção do clique antes da hidratação, sem ser
  desativado e sem trocar a navegação pela lista por URL direta. Os dois primeiros casos continuam passando a
  375×812, inclusive a asserção de que algum campo começa abaixo da barra com a página no topo. A suíte
  `pnpm e2e` inteira passa.
