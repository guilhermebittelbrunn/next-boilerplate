# Critérios de aceite: "Excluir" do menu de ações funciona pelo teclado

Os nove primeiros critérios vêm da §10 do plano. O 10 e o 11 saíram da revisão e do handoff. O status de
cada um, com o meio usado para medir, está em [`report.md`](report.md). `[x]` é aprovado; `[ ]` com
"Status: reprovado" falhou na medição.

# Critérios de Aceite (Checklist)

- [x] **Enter em "Excluir" abre a confirmação**
  Com o menu de ações aberto pelo teclado e o foco em "Excluir", Enter fecha o menu e abre a confirmação com
  o título e a descrição do idioma ativo. `onDelete` não é chamado nesse momento. O mesmo vale para o rótulo
  customizado "Arquivar" da lista de usuários do admin, que abre "Arquivar usuário" com a descrição dele.
  Status: aprovado (jsdom, browser em pt-br, en e es, entidades e admin).

- [x] **O foco entra na confirmação e não ativa nada sozinho**
  Ao abrir, o foco vai para o botão "Não" depois da animação. O Enter que abriu a confirmação não a fecha nem
  a confirma: ela continua aberta até a próxima ação do usuário. O foco não fica no `body` nem volta para o
  `<li>` escondido do menu, mesmo quando o `raf` atrasado do `rc-dropdown` dispara.
  Status: aprovado (browser, medido 275 ms e 700 ms depois do Enter).

- [x] **Esc fecha e devolve o foco ao gatilho**
  Com a confirmação aberta e o foco dentro dela, Esc fecha sem chamar `onDelete` e devolve o foco ao "⋮" da
  mesma linha. Com o menu aberto, antes de escolher o item, Esc fecha o menu e devolve o foco ao "⋮", como já
  acontecia antes da mudança.
  Status: aprovado (jsdom e browser, nos dois casos).

- [x] **"Não" cancela e "Sim" exclui uma única vez**
  "Não" fecha sem chamar `onDelete` e devolve o foco ao "⋮". "Sim" chama `onDelete` uma vez, fecha a
  confirmação e devolve o foco ao "⋮". Na lista de entidades a linha some depois da mutação, e o foco cai no
  `body` porque o gatilho saiu do DOM. Esse último ponto está fora do corte e já consta como achado no plano.
  Status: aprovado (jsdom e browser, com um `DELETE /entities/:id` 204 no log da API).

- [x] **O mouse continua funcionando**
  Clicar no "⋮" e em "Excluir" abre a mesma confirmação, agora ancorada no "⋮". Clicar fora fecha sem excluir
  e sem puxar o foco de volta: o foco fica onde o usuário clicou. Clicar no "⋮" com a confirmação aberta
  fecha a confirmação e abre o menu. O E2E `entityCrud.spec.ts` (clique em "Excluir", clique em "Sim")
  continua passando.
  Status: aprovado (jsdom, browser e Playwright E2E).

- [x] **"Editar" e itens customizados não abrem a confirmação**
  Enter ou clique em "Editar" chama `onEdit` e nenhuma confirmação aparece. O mesmo vale para os itens de
  `items`, como o "Approve" do playground, que continuam chamando o próprio `onClick` pelo teclado e pelo
  mouse.
  Status: aprovado (jsdom e browser no playground).

- [x] **Sem `onDelete`, não há como excluir**
  Quando o call site não passa `onDelete` (impersonação na lista de entidades, linha do próprio admin na
  lista de usuários), o menu não tem o item de excluir e nenhuma interação abre a confirmação. A API continua
  sendo a proteção real.
  Status: aprovado (jsdom). Os call sites não mudaram neste diff.

- [x] **O gatilho anuncia o menu**
  O "⋮" tem `aria-haspopup="menu"`. `aria-expanded` vale `"false"` com o menu fechado, `"true"` com o menu
  aberto e volta a `"false"` quando o menu fecha por item, por Esc ou porque a confirmação abriu. O
  `aria-label` traduzido ("Mais ações", "More actions", "Más acciones") não muda.
  Status: aprovado (jsdom e browser).

- [x] **Layout, tema e idioma**
  O "⋮" mantém a posição na célula da tabela. A confirmação aparece inteira em desktop e a 390 px, nos temas
  claro e escuro, com o texto em pt-br, en e es, abaixo do "⋮" e com a seta apontando para ele. Quando falta
  espaço embaixo (última linha perto da borda inferior), ela abre para cima. O contorno de foco dos botões da
  confirmação é visível nos dois temas, ou a ausência é registrada como herdada dos seed tokens do antd.
  Status: aprovado na rodada 2, depois da troca para `placement="bottom"`. Na rodada 1 a confirmação saía
  49 px pela esquerda a 390 px (D1). Agora ela fica entre x 0 e 390 (pt-br) ou 9 e 389 (es), nas listas de
  entidades e de usuários do admin, nos dois temas. O contorno de foco no escuro (1,31:1) segue registrado
  como herdado do antd.

- [x] **Um `onDelete` assíncrono segura o "Sim" até resolver**
  Quando `onDelete` devolve uma promise, o "Sim" mostra carregamento e a confirmação continua aberta até a
  promise resolver; só então ela fecha. `onDelete` é chamado uma vez. Com `onDelete` síncrono (os
  consumidores atuais usam `.mutate()`), a confirmação fecha na hora.
  Status: aprovado (jsdom, com prova por mutação).

- [x] **Teclado em sequência não deixa o foco preso**
  Abrir o menu, descer até "Excluir" e confirmar três vezes seguidas na mesma linha, alternando Esc e "Não",
  sempre termina com o foco em "Não" e depois no "⋮". Ao reabrir, o menu põe o foco no último item ativo
  ("Excluir"), comportamento do `rc-menu` que o diff não tocou.
  Status: aprovado (browser, 3 ciclos por combinação de tema e idioma).
