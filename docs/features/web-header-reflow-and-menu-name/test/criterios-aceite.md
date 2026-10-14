# Critérios de Aceite (Checklist)

Feature: o header da web cabe na janela e o botão do menu tem nome. Os critérios partem da §10 do
`analyze/plan.md`, com os casos-limite que o `/test` acrescentou. O status medido de cada um, e por qual meio, está
em `test/report.md`.

- [x] **Botão do menu com nome e estado**
  O botão que abre o menu do header da web se chama "Menu" em pt-br e en e "Menú" em es, vindo do dicionário, e
  anuncia `aria-expanded="false"` fechado e `aria-expanded="true"` aberto. Clicar ou apertar Enter alterna o menu e
  o atributo junto, e o foco fica no botão. O nome não muda com o estado; quem informa aberto ou fechado é o
  `aria-expanded`. O botão só aparece abaixo de 1024 px.

- [x] **Sem rolagem lateral de 1024 a 1440 px**
  Em 1024, 1280 e 1440 px, visitante e logado, em pt-br, en e es, claro e escuro, com a configuração padrão do
  repositório (`NEXT_PUBLIC_APP_URL` ligado para o link "Ir para o painel"),
  `document.documentElement.scrollWidth` é igual a `clientWidth`. Inclui os casos que estouravam: es visitante a
  1280 (1304), es e pt-br visitante a 1024 (+49 e +6) e logado a 1024 e 1280.

- [x] **Marca centralizada e nada removido**
  Nas mesmas larguras, o centro do bloco da marca fica a menos de 2 px do centro da janela, e o header mostra os
  mesmos sete itens que mostrava antes em cada largura: três links de navegação, o seletor de idioma, o botão de
  tema e os dois botões de conta (entrar e cadastrar, ou ir para o painel e sair). Nenhum item muda de visibilidade
  e nenhum vai para o menu.

- [x] **Abaixo de 1024 px nada muda**
  A 768 px o header mostra idioma, tema, os dois botões de conta e o menu; a 390 px, só o botão de cadastro (para
  visitante) e o menu. Não há rolagem lateral, e o nome da marca aparece inteiro, sem reticências, sem encostar no
  item seguinte.

- [ ] **Configuração extrema sem rolagem** (informativo, não reprova a entrega)
  Com um nome de marca de 30 caracteres, a 1024 px a página ainda rola de lado (es visitante +34 px, es logado
  +26, en logado +11, pt-br logado +4), e o nome sai inteiro, sem reticências: o `lg:truncate` não chega a agir. A
  1280 e a 1440 px não há rolagem. O link de documentação não pôde entrar na medição: com `NEXT_PUBLIC_DOCS_URL`
  definido no build, o header continua sem o link, por um defeito anterior a esta entrega no `apps/web/env.ts`.

- [x] **Tema, testes e gates**
  Claro e escuro dão os mesmos números de layout. Os testes da web (`headerMenuButton.test.tsx` novo e
  `brandSurfaces.test.tsx` ajustado), a paridade de i18n e o `pnpm test` da raiz passam. A suíte E2E (`pnpm e2e`)
  passa com a `A11Y_ALLOWLIST` vazia, e o axe rodado no header a 390 px (menu aberto e fechado, claro e escuro) e a
  1280 px não aponta nenhuma violação.
