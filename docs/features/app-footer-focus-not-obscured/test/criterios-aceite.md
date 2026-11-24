# Critérios de Aceite (Checklist)

Foco escondido pela barra de ações fixa e pelo `Navbar` nos formulários de página inteira da `apps/app`. O status
de cada item, com o meio de verificação e o número medido, está em [`report.md`](report.md).

- [x] **O rádio focado por seta não fica atrás da barra de ações**
  Em editar entidade, com a página no topo, focar o rádio marcado de "Gênero" e apertar seta para baixo até a
  última opção. A cada opção, o rádio focado fica inteiro acima da borda superior da barra de ações, e a página rola
  sozinha quando preciso. Sem a correção, "Feminino" termina em 748 px com a barra começando em 743 px (375×812).

- [x] **Nenhum campo focado por Tab fica atrás da barra de ações**
  Em criar e editar entidade, criar e editar usuário (admin) e nos dois passos do onboarding, Tab do primeiro campo
  até o botão primário deixa cada controle focado inteiro acima da barra. Os botões que moram na própria barra
  (voltar, pular, salvar, concluir) ficam fora da conta. Vale a 375×812, 390×844 e 1280×720.

- [x] **Nenhum campo focado por Shift+Tab fica atrás do Navbar**
  Nas mesmas telas, Shift+Tab a partir do botão primário até o primeiro campo deixa cada controle focado inteiro
  abaixo da borda inferior do `Navbar` (64 px). Quando o campo está na tela mas por baixo do `Navbar`, a página rola
  para mostrá-lo. No onboarding, que não tem `Navbar`, o critério não se aplica e o `scroll-padding-top` do
  documento fica em `auto`.

- [x] **Telas sem barra fixa não ganham folga de rolagem**
  Na lista de entidades, na lista de usuários do admin, na home do painel e nos blocos da conta (`sticky={false}`),
  o `scroll-padding-bottom` calculado do `html` fica em `auto`. No login e no cadastro, sem `Navbar`, o
  `scroll-padding-top` também. A folga existe só enquanto a barra estiver no documento e some ao sair do formulário
  por navegação do App Router, sem recarregar a página.

- [x] **A barra de ações não muda de aparência nem de comportamento**
  Em claro e escuro, nos três idiomas, a barra mantém 69 px de altura e uma linha só a 375 px, com a mesma borda,
  fundo translúcido e posição `sticky`. Salvar e voltar continuam funcionando, e o botão fica desabilitado quando a
  página passa `disabled` (impersonação) e durante o envio. A impersonação em si não foi dirigida no navegador
  nesta rodada (ver `report.md`).

- [x] **Renomear o atributo de um lado só quebra um teste**
  O teste de componente reprova se o seletor `has-[[data-…]]` do `html` e o atributo publicado pelas barras
  (`Footer` fixo, barra do `Container`, `PageFormFooter`, `Navbar`) deixarem de combinar, e se o `Footer` com
  `sticky={false}` passar a publicar o atributo.

- [x] **O E2E falha sem a correção**
  O spec `focusNotObscured` passa com a correção e reprova nos três testes com as duas classes do `html` removidas.
  Ele roda no projeto `chromium` sem mudar a config do Playwright.

## Fora do alcance desta verificação

- Teclado virtual de iOS Safari e Chrome Android: o Chromium headless não abre teclado. Não verificado.
- Safari e Firefox de verdade: o `agent-browser` e o Playwright rodam Chromium. Não verificado.
