# Critérios de Aceite (Checklist)

Escopo: o intervalo `6943ce9..HEAD` da branch `feat/design-system-refresh` (troca de antd e react-toastify por HTML
semântico, Radix e Sonner; tokens novos; shell do painel; telas do app; landing; paleta dos e-mails). O diff não
cria rota de API, guard nem `error.code`, então os critérios de autorização conferem que nada mudou, não que algo
novo funciona. O status de cada item e o meio de verificação estão em `report.md`.

- [ ] **Tabela pagina no cliente com dez linhas por padrão**
  Com mais linhas do que o tamanho da página, a `Table` mostra dez linhas, o texto "Página X de Y" e os botões de
  página anterior e seguinte, com o anterior desabilitado na primeira página e o seguinte desabilitado na última. A
  última página mostra só o resto das linhas. Com `pagination={false}` todas as linhas aparecem e não há paginador.

- [ ] **Seletor de tamanho de página volta para a primeira página**
  Com `showSizeChanger` (lista de usuários do admin), o seletor oferece 10, 20 e 50 linhas. Trocar o tamanho leva à
  página 1 e recalcula o total de páginas. Sem `showSizeChanger` o seletor não aparece.

- [ ] **`hideOnSinglePage` esconde o paginador quando tudo cabe numa página**
  Com `hideOnSinglePage` e uma página só, nenhum controle de paginação aparece. Sem a opção, o paginador continua
  visível com "Página 1 de 1". Lista vazia nunca mostra paginador.

- [ ] **Busca filtra em memória e volta para a página 1**
  O campo de busca tem rótulo acessível ("Buscar na lista") e filtra sem diferenciar maiúsculas pelos campos de
  `searchFields`. Digitar em qualquer página leva o paginador à página 1. Busca sem resultado mostra o texto de vazio
  do chamador; com páginas ainda não carregadas do servidor (`hasMore`), mostra o aviso de que a busca não alcançou o
  que falta carregar, em vez de dizer que não há registros.

- [ ] **Tabela mostra esqueleto, vazio e recarga sem pular**
  Carregando sem linhas, a tabela mostra cinco linhas de esqueleto, `aria-busy="true"` e o anúncio "Carregando…" em
  `role="status"`. Carregando com linhas já na tela, as linhas ficam (com opacidade reduzida) e o esqueleto não volta.
  Sem linhas, aparece o ícone com o texto de vazio do chamador.

- [ ] **Tabela larga rola dentro do cartão, não a página**
  Em 390 px, listas de entidades, usuários, auditoria e sessões rolam na horizontal dentro do próprio contêiner, e o
  documento não ganha rolagem lateral. Em 1440 px, nenhuma ação por linha fica escondida atrás de rolagem horizontal
  na coluna estreita da conta.

- [ ] **`ActionsMenu` abre e exclui pelo mouse**
  O gatilho "Mais ações" abre um menu com "Editar" e "Excluir". "Excluir" abre o `AlertDialog` de confirmação sem
  excluir nada. "Sim" exclui a linha, fecha o diálogo e mostra o toast de sucesso; "Não" fecha sem excluir.

- [ ] **`ActionsMenu` funciona só pelo teclado e devolve o foco**
  Tab chega ao gatilho com foco visível; Enter abre o menu com foco em "Editar"; seta para baixo vai a "Excluir";
  Enter abre a confirmação com o foco em "Não" e a linha continua na tabela. Esc fecha a confirmação e o foco volta ao
  gatilho da mesma linha. Durante uma exclusão assíncrona, o botão de confirmar fica ocupado, "Não" fica desabilitado
  e Esc não fecha o diálogo.

- [ ] **Transferência de posse da equipe pelo teclado**
  O dono abre as ações de um membro pelo teclado e transfere a posse com a confirmação focada no cancelar, sem
  depender de clique. O fluxo completo (convite, aceite, transferência e saída do antigo dono) continua passando.

- [ ] **Toasts pelo Sonner nos dois temas e sem cobrir a ação primária**
  Todo `useAlert()` aparece pelo Sonner no canto inferior direito, com botão de fechar e tema que acompanha o claro e
  o escuro, com contraste AA no texto. Um toast de erro na tela de um formulário com `Footer` fixo não pode cobrir o
  botão "Salvar" nem o "Voltar" (nem em 1440 px nem em 390 px), porque o usuário precisa tentar de novo, e o botão de
  fechar do toast continua clicável. Com barra fixa na tela, a pilha fica 96 px acima da borda inferior; sem barra,
  volta aos 24 px padrão.

- [ ] **Formulários de página inteira em `FormSurface` com `Footer` fixo**
  Criar e editar entidade mostram os campos num cartão (`FormSurface`), agrupados em seções com `h2`, e a barra fixa
  com "Voltar" e "Salvar". Enviar vazio foca o campo "Nome" e mostra "Informe o nome.". Salvar com sucesso volta à
  lista com o toast de sucesso.

- [ ] **Campo focado pelo teclado não fica atrás das barras fixas**
  Percorrer o formulário de entidade com Tab e Shift+Tab, inclusive com uma descrição longa, nunca deixa o campo
  focado sob o `Navbar` nem sob a barra de ações (`data-sticky-action-bar`). As setas no grupo de gênero mantêm a opção
  focada visível. É o contrato do `scroll-padding` de 80 px e da suíte `focusNotObscured.spec.ts`.

- [ ] **`MetricStrip` formata número pelo locale e aguenta sete dígitos**
  Os indicadores das homes comum e admin usam `Intl.NumberFormat` do locale da rota: "1.234.567" em pt-br e es,
  "1,234,567" em en. Carregando, os números viram esqueleto e a lista fica `aria-busy`. Em 390 px, um número de sete
  dígitos cabe na célula, inclusive na faixa de duas colunas, sem rolagem lateral.

- [ ] **`LoadErrorState` oferece "Tentar de novo"**
  Um erro de carga mostra a mensagem em `role="alert"`. Com `onRetry`, aparece o botão "Tentar de novo", que chama a
  nova busca; com `retrying`, o botão fica desabilitado e não chama de novo. Sem `onRetry`, não há botão.

- [ ] **`RecordAvatar` mostra foto ou iniciais**
  Com `src`, o avatar mostra a imagem com o nome como texto alternativo. Sem foto, mostra até duas iniciais em
  maiúscula (primeiro e último nome), ignora sufixos como "Jr." e "III", usa a parte local do e-mail quando o nome é
  um e-mail e fica oculto do leitor de tela, já que o nome está na célula ao lado.

- [ ] **Conta com abas e sessões em `Table variant="flush"`**
  A aba Segurança lista as sessões numa tabela com anel de 1 px dentro do cartão, sem segunda superfície. A sessão
  atual tem o selo "Esta sessão" e nenhuma ação; as outras têm "Encerrar" visível sem rolar.

- [ ] **Admin: home, usuários e auditoria**
  A home admin mostra os indicadores no `MetricStrip`. A lista de usuários tem busca por nome ou e-mail, alternância
  de ativo e paginação de dez com seletor de tamanho. A auditoria rola na horizontal dentro da tabela em 390 px.

- [ ] **Onboarding em 390 px com o `Footer` não fixo**
  Os dois passos ("Passo 1 de 2" e "Passo 2 de 2") cabem em 390 px sem rolagem lateral, com as ações dentro do
  cartão, sem barra fixa desenhada no meio da tela. Concluir leva ao painel.

- [ ] **Telas de autenticação com painel de marca**
  Entrar e cadastrar têm o formulário à esquerda e o painel de marca à direita em telas largas, legível no claro e no
  escuro. A ordem de Tab no login é e-mail, senha, mostrar senha, "Esqueci minha senha", "Entrar", Google,
  "Cadastrar". Com o banner de cookies aberto, a coluna do formulário ganha espaço no fim para nenhum controle ficar
  atrás do banner. Os ícones tonais do `AuthCard` têm contraste de objeto gráfico (3:1) nos dois temas.

- [ ] **Landing sem prova social inventada**
  A home da web mostra hero, passos, o que o fork herda, qualidade, FAQ e CTA. O recorte do painel usa "Entidade 1"
  a "Entidade 4" (e "Entity", "Entidad"), com a legenda de dados ilustrativos. Não há depoimento, case nem número de
  uso. Pricing não marca plano como recomendado.

- [ ] **Header da landing: skip link, menu móvel e faixa intermediária**
  O primeiro Tab mostra "Pular para o conteúdo"; Enter leva o foco ao `main`. Em 390 px o botão "Menu" abre o painel
  com links, sessão, idioma e tema; Esc fecha e devolve o foco ao botão. Entre 768 e 1023 px, idioma, tema e
  entrar/sair ficam na barra e o menu mostra só os links.

- [ ] **Contraste AA nos tons sólidos e translúcidos**
  Texto em token sólido passa de 4,5:1 nos dois temas (teste `themeContrast`). Os tons translúcidos também: botão
  destrutivo no escuro (`dark:bg-destructive/15`), `Badge` `success`, `warning` e `destructive` sobre cartão branco,
  fundo off-white e linha da tabela, nos dois temas, com texto de 12 px.

- [ ] **`prefers-reduced-motion`**
  Com a preferência ligada, menus e popovers entram só com opacidade (sem escala nem deslocamento) e o `pressable`
  não encolhe no clique. Sem a preferência, o menu entra de escala próxima de 0,96 com opacidade, em menos de 300 ms.

- [ ] **Três idiomas sem chave faltando**
  Painel e landing renderizam em pt-br, en e es sem texto em outro idioma nem "undefined". O teste de paridade cobre
  as chaves novas (`components.table.*`, `components.button.retry`, `apps.web.layout.skipToContent` e as da home da
  web).

- [ ] **Autorização inalterada**
  O diff não toca guard, proxy nem headers. Comum continua barrado em `/admin`; admin troca de painel e volta; o admin
  personificando continua em leitura (avisos de somente leitura e ações desabilitadas nas listas e formulários).

- [ ] **Sem antd nem react-toastify no bundle**
  Nenhum `package.json` declara as duas bibliotecas, nenhum import sobrou e nenhum layout monta `ToastContainer`. O
  `Toaster` do Sonner é montado uma vez no `DesignSystemProvider`.

- [ ] **E-mails com a paleta nova**
  O preview do `apps/email` mostra o botão primário em `#2559bf` com texto branco e o fundo `#f9fafb`, iguais ao
  `packages/email/brand.ts`.

- [ ] **Desempenho da landing (pendência sem linha de base)**
  O LCP móvel do Lighthouse na home da web fica comparável ao das outras páginas da landing, e a entrada do hero (de
  opacidade 0,01) não atrasa o maior elemento pintado. Este critério só fecha com uma medição do `main` nas mesmas
  condições (build de produção, cinco rodadas, mediana), que ainda não existe; até lá ele fica aberto como pendência,
  sem contar como aprovado nem como reprovado.
