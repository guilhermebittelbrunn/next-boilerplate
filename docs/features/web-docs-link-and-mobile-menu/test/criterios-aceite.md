# Critérios de Aceite (Checklist)

Feature: link de documentação no header e no footer da web, e menu mobile que fecha ao seguir um link. Os
critérios partem da §10 do `analyze/plan.md`, com os casos-limite da lista "Verificar no `/test`" do
`review/review.md`. O status medido de cada um, e por qual meio, está em `test/report.md`.

- [x] **Link de documentação aparece quando a variável está preenchida**
  Com `NEXT_PUBLIC_DOCS_URL=https://docs.example.com` no build, o header (barra cheia e painel do menu) e o footer
  mostram o link com o texto do dicionário: "Documentação" em pt-br, "Documentation" em en e "Documentación" em es.
  O `href` é exatamente o valor da variável. Vale para visitante e para usuário logado, no tema claro e no escuro.

- [x] **Variável vazia ou ausente equivale a não ter o link**
  Com `NEXT_PUBLIC_DOCS_URL=""` (a forma do `.env.example`) o build passa, a web sobe e nenhuma superfície mostra o
  link: o HTML servido nos três idiomas não contém a URL, o header tem três itens à esquerda e o footer não tem o
  item. Sem a variável, o comportamento é o mesmo, porque o `env.ts` converte a string vazia em ausência.

- [x] **O teste do env lê o `env.ts` real e reprova no código anterior**
  O `docsUrlEnv.test.tsx` importa o `env.ts` da web sem mock. Rodado contra o `env.ts` e o header de `HEAD`, os seis
  casos com a variável preenchida falham e os dois de modo degradado passam.

- [x] **Seguir um link do painel fecha o menu**
  A 390 e 768 px (e a 1024 px com o link ligado, onde o menu também aparece), nos três idiomas e nos dois temas,
  abrir o menu e seguir "Contato", o subitem "Preços" ou "Início" estando na home deixa a página com
  `aria-expanded="false"` no botão e o painel fora do DOM. No caso de "Início" a rota não muda e o painel fecha do
  mesmo jeito. Pelo teclado (Tab até o link do painel e Enter) o resultado é o mesmo. O `headerMobileMenu.test.tsx`
  reprova no código anterior nos casos que dependem do `onClick`.

- [x] **Com o link, o header cabe e a marca fica no centro**
  Com a variável preenchida, em 1024, 1279, 1280 e 1440 px, nos três idiomas, visitante e logado, claro e escuro,
  `scrollWidth` é igual a `clientWidth`. A partir de 1280 px aparece a barra cheia com quatro itens à esquerda e a
  marca a 0 px do centro; de 1024 a 1279 px aparece o botão do menu e todos os itens continuam alcançáveis por ele.
  A medição vale com barra de rolagem que ocupa espaço (15 px) e sem ela.

- [x] **Sem o link, nada muda em relação à PR #45**
  Com a variável vazia, as 36 combinações (1024, 1280 e 1440 px; três idiomas; visitante e logado; claro e escuro)
  mantêm a barra cheia a partir de 1024 px, três itens à esquerda, a marca a 0 px do centro e nenhuma rolagem
  lateral. Os itens da direita são os mesmos: idioma, tema e os dois botões de conta.

- [x] **Abaixo de 1024 px muda só o fechamento do menu**
  A 390 px o visitante vê "Cadastrar" e o menu, e o logado só o menu; a 768 px aparecem idioma, tema, os dois
  botões de conta e o menu. Não há rolagem lateral. É a mesma lista da PR #45.

- [x] **Documentação abre em aba nova nas três superfícies**
  Na barra cheia, no painel do menu e no footer, o link tem `target="_blank"` e `rel="noopener noreferrer"`, nos
  três idiomas. Clicar abre uma aba nova com a URL da documentação; quando o clique vem do painel, a aba original
  fica com o menu fechado.

- [x] **Header sem violação de acessibilidade**
  axe-core (WCAG 2.0, 2.1 e 2.2 A/AA, mais best-practice) no `header` com o link ligado, a 1280 px e a 390 px com o
  menu fechado e aberto, em es e pt-br, claro e escuro: zero violações e zero itens incompletos.

- [x] **Gates verdes**
  `pnpm --filter web test`, `pnpm test` da raiz (inclui `test:emulator`) e o typecheck e `pnpm check` medidos pelo
  `/review` passam. A validação de runtime foi feita em `next build` + `next start`, com a variável preenchida e
  vazia.

- [ ] **Foco depois de seguir "Início" estando na home** (informativo, fora do corte)
  Seguir "Início" no painel estando na home fecha o menu, mas o foco vai para o `body`, e quem usa teclado perde a
  posição. O plano não pediu gestão de foco; o item entra no mesmo achado de backlog do D6 (Escape, clique fora,
  `aria-controls`). Não reprova a entrega.
