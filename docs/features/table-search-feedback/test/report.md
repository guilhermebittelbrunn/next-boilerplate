# Relatório de QA: retorno da busca da `Table` e foco depois do menu mobile da landing

Branch `feat/design-system-refresh` (não protegida). Nada commitado nesta etapa. Escopo: o working tree descrito no
`review/review.md` e um caso de teste em `packages/design-system/__tests__/actionMenu.test.tsx`.

Resultado: todos os critérios passam, nenhum defeito de produção, `test = done`. Um teste deixado pela tentativa
anterior deste `/test` falhava de forma intermitente e foi corrigido (ver "Teste corrigido").

## Tentativa anterior interrompida

Uma primeira rodada deste `/test` caiu no meio por erro de autenticação da API, antes de gravar relatório. Ela
deixou duas coisas:

- o caso "moves focus to the table search and names the term when the only filtered row is deleted" em
  `actionMenu.test.tsx`, que fecha a lacuna F5 do review;
- oito screenshots em `test/e2e/`, que o `.gitignore` descarta. Apaguei todos e refiz as medições do zero; nada
  deste relatório vem deles.

Os processos que ela subiu já tinham sido derrubados, e as portas estavam livres no início desta rodada.

## Teste corrigido

O caso herdado falhou na primeira execução da suíte do design-system desta rodada (231/232):
`getByText("Nenhum resultado para “Alfa”.")` encontrou dois elementos, o parágrafo do vazio e a região
`role="status"`. O fluxo de exclusão usa timers reais; quando ele leva mais de 500 ms (máquina carregada), o
anúncio da busca assenta e repete o texto. O defeito é do teste, não do produto: a região de anúncio dizer o mesmo
texto é o comportamento previsto.

Correção, só no arquivo de teste: a busca do texto passou a ser feita dentro da tabela,
`within(screen.getByRole("table")).getByText(...)`, o que exclui a região de anúncio (irmã do contêiner da
tabela). Depois disso o arquivo passou 3 vezes seguidas (26/26) e a suíte inteira do pacote passou duas vezes
(232/232), uma delas dentro do `pnpm test` do root.

## Verificar no `/test` (lista do `review.md`)

| # | Item | Veredito | O que foi medido |
|---|------|----------|------------------|
| 1 | F4, anúncio uma vez por pausa, e o `aria-live` do paginador | Confirmado | `/pt-br/entities`, `MutationObserver` na região `p[role=status][aria-atomic=true]` e listener de `input` no campo. "Lote QA 0" digitado em 9 teclas (de 1407 a 1753 ms): uma única mutação com texto, "9 resultados", aos 2282 ms, 529 ms depois da última tecla. Em `/pt-br/admin/users` com 23 contas: "qa-table-bulk-1" em 15 teclas (356 a 911 ms) deu uma mutação, "10 resultados", aos 1478 ms (567 ms depois). O paginador mudou uma vez na primeira tecla ("Página 1 de 3" para "Página 1 de 2") e desmontou na última (resultado numa página só, `hideOnSinglePage`). Ele muda quando o número de páginas muda, não a cada tecla. A tabela de entidades não tem paginador (usa "Carregar mais"). |
| 2 | Silêncio durante a carga (correção da revisão) | Confirmado em jsdom; 🔒 no navegador | Em jsdom, dois casos de `tablePagination.test.tsx` ("fica em silêncio enquanto o esqueleto aparece…" e "não diz que a busca não achou nada enquanto um refresh sem linhas filtradas carrega"). Tirar `\|\| showSkeleton` de `resultAnnouncement` derruba os dois; o arquivo voltou do backup com `diff -q` vazio. No navegador o estado não se reproduziu na tela de entidades: a lista chega junto com a página, o `loading` da `Table` é o `isLoading` do React Query (falso num refresh), e segurar a requisição pelo CDP (`Fetch.requestPaused`) não interceptou nada. Nas amostras a cada 100 ms durante o carregamento, a região nunca disse "nenhum resultado" com esqueleto na tela. |
| 3 | F3, um "x" só e botão centrado | Confirmado | Chrome: a folha gerada contém `::-webkit-search-cancel-button { appearance: none; }` para a classe do `input`, e a captura mostra um "x" só. Botão de 24 × 24 px, 6 px de folga em cima, embaixo e à direita, num campo de 36 px com `padding-right` de 36 px (o texto não corre por baixo). Tab a partir do campo foca o botão "Limpar busca" com `:focus-visible` e anel de 3 px; Enter limpa o campo e devolve o foco a ele. Contraste do ícone sobre o fundo do campo: 6,02:1 no claro, 7,32:1 no escuro. Safari não foi testado. |
| 4 | F5, excluir o único resultado | Confirmado | Busca "Retired Unit" (1 linha, anúncio "1 resultado"). Foco no gatilho "Mais ações", Enter, seta para baixo até "Excluir", Enter, Tab até "Sim", Enter. Depois do toast "Entidade removida com sucesso.": célula "Nenhum resultado para “Retired Unit”." com "Limpar busca", campo com o termo mantido, foco no `input[data-slot=table-search]` com `:focus-visible`, anúncio igual ao texto da célula. |
| 5 | F8, termo longo | Confirmado | 200 vezes "a" a 390 px: parágrafo de 326 px de largura e 120 px de altura dentro de uma célula de 358 px, `overflow-wrap: anywhere`. Contêiner da tabela com `scrollWidth` igual ao `clientWidth` (358), página com 390 = 390. Mesmos números no claro e no escuro. |
| 6 | W1 a W6, foco no menu mobile com o `Link` real | Confirmado | Landing a 390 px, servidor `next dev`. W1: Tab até "Menu", Enter, Tab até "Contato", Enter; ao fim da navegação `/pt-br/contact` tem `document.activeElement` = `MAIN#main-content`. O próximo Tab foi ao link "Início" do rodapé, porque a página de contato sem Resend não tem controle dentro do `main`; não foi ao "Pular para o conteúdo". W2: "Início" na home deixa o foco no `main`, rota igual. W3: "Entrar" leva a `/pt-br/sign-in` com o foco no `main`; o próximo Tab vai ao campo de e-mail, dentro do `main`. W4: com `NEXT_PUBLIC_DOCS_URL` apontando para um endereço de exemplo (só no ambiente do processo), Enter em "Documentação" abriu outra aba; na aba de origem o foco ficou no botão "Menu", `aria-expanded="false"`. Cmd+Enter em "Contato" abriu outra aba e deixou o foco no botão "Menu" na origem. W5: clique do mouse em "Preços" levou a `/pt-br/pricing` com o foco no `main`, `:focus-visible` falso, `outline-style: none` e `box-shadow: none`; a captura não mostra anel. W6: logado pela sessão do painel (cookie compartilhado em `localhost`), Enter em "Sair" fechou o painel, deslogou (o header voltou a mostrar "Cadastrar") e deixou o foco no botão "Menu" com `:focus-visible`. Escape com o painel aberto também devolveu o foco ao botão. |
| 7 | F1, F2, F6, F7 e F9 em claro e escuro, 390 e 1440 px, 3 idiomas | Confirmado | Ver "Evidências e2e". |

## Evidências e2e

Painel em `/pt-br/entities` com `user@example.com` do seed e 22 entidades a mais ("Lote QA 01" a "Lote QA 22"),
26 no total, 20 por carga.

- **F6 (páginas pendentes), escuro, 1440 px.** Busca "zzz-sem-match" com "Carregar mais" visível: ícone
  `search-x`, texto "Nada encontrado no que já foi carregado. Carregue mais para continuar a busca.", botão
  "Limpar busca" e, abaixo da tabela, "Carregar mais". O anúncio leu o mesmo texto, uma vez.
- **F1 (sem resultado), escuro, 1440 px.** Depois de carregar as 26 entidades (sem "Carregar mais"), busca
  "  zzz-sem-match  ": célula "Nenhum resultado para “zzz-sem-match”." com "Limpar busca", ícone `search-x`. O texto
  "Nenhuma entidade cadastrada." não está na página. Contraste do texto: 7,32:1 no escuro, 6,02:1 no claro.
- **F2 (limpar pelo vazio), teclado.** Do campo: Tab foca o "x", Tab foca "Atualizar", Tab foca o "Limpar busca"
  da célula, com anel de 3 px. Enter: campo vazio, 26 linhas, foco no campo com `:focus-visible`, anúncio vazio.
  O mesmo botão clicado com o mouse (em `/es`) também deixou o campo vazio e o foco nele.
- **F7 (vazio real).** Conta `qa-table-search@example.com` criada no emulador, sem entidades. Sem termo e com
  "abc": "Nenhuma entidade cadastrada.", ícone `inbox`, nenhum botão na célula. Com "abc", o anúncio diz "Nenhum
  resultado para “abc”." (decisão em aberto 1 do review).
- **F9 (outro consumidor).** `/pt-br/admin/users` como `admin@example.com`, 4 contas: busca "zzz-sem-match" mostra
  "Nenhum resultado para “zzz-sem-match”.", ícone `search-x`, "Limpar busca", e o anúncio com o mesmo texto.
- **Idiomas.** `/en/entities` e `/es/entities`, depois de carregar tudo: "Lote QA 2" anuncia "3 results" /
  "3 resultados", "Lote QA 22" anuncia "1 result" / "1 resultado", "Lote QA 22zz" mostra "No results for “Lote QA
  22zz”." / "Sin resultados para “Lote QA 22zz”." com o botão "Clear search" / "Limpiar búsqueda"; o "x" do campo
  tem `aria-label` "Clear search" / "Limpiar búsqueda". Em `/es` a 390 px no claro, sem rolagem horizontal
  (`scrollWidth` 390).
- **Temas.** Claro e escuro trocados por `prefers-color-scheme` no navegador. F5 foi feito no claro, F8 nos dois.

O que vence a tela de busca sem resultado (pergunta 5 do gate de design): a frase com o termo entre aspas. O
botão "Limpar busca" é `outline` e pequeno, e o ícone `SearchX` separa "a busca não achou" do vazio real antes
da leitura. Nada novo anima; os botões novos usam o `pressable` do `Button`.

Capturas de apoio em `test/e2e/` (descartadas pelo `.gitignore`; a prova é o texto acima):
`01-f6-paginas-pendentes-claro-1440.png` (o tema real dela é o escuro), `02-f3-foco-no-x.png`,
`03-f1-sem-resultado-escuro-1440.png`, `04-f2-foco-limpar-vazio.png`, `05-f5-excluiu-unico-claro.png`,
`06-f8-termo-longo-escuro-390.png`, `07-f8-termo-longo-claro-390.png`, `08-f1-es-claro-390.png`,
`09-f9-admin-users.png`, `10-w1-contato-proximo-tab.png`, `11-w5-precos-toque.png`. Nenhuma tem dado de pessoa
real; as contas são do seed ou `qa-*@example.com` do emulador.

## Cobertura

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter @repo/design-system test` (primeira execução, caso herdado intacto) | 231/232, 1 falha em `actionMenu.test.tsx` (ver "Teste corrigido") |
| `npx vitest run __tests__/actionMenu.test.tsx` em `packages/design-system`, 3 vezes, depois da correção | 26/26 nas três |
| `pnpm --filter @repo/design-system test` depois da correção | 14 arquivos, 232/232 |
| `pnpm --filter @repo/internationalization test` | 7 arquivos, 67/67 (paridade incluída) |
| `pnpm --filter web test` | 36 arquivos, 336/336 |
| `pnpm --filter app test` | 159 arquivos, 1427/1427 |
| `pnpm turbo run typecheck --filter=@repo/design-system --filter=app --filter=web` | 3/3 (2 do cache) |
| `pnpm test` (root, JDK 21 via `JAVA_HOME`, sem `--force`, depois da correção) | 15/15 tasks (9 do cache). design-system 232, app 1427, web 336, api 1984, api `test:emulator` 284, auth 219, email 209, i18n 67, shared 78, security 65, analytics 41, next-config 39, payments 19, sdk 15, e2e (vitest) 41 |
| `npx biome check packages/design-system/__tests__/actionMenu.test.tsx` | sem correção |
| Mutação: `\|\| showSkeleton` removido de `resultAnnouncement` em `table.tsx` | 2 falhas esperadas em `tablePagination.test.tsx`; arquivo restaurado do backup |

`pnpm check` não foi remedido: o `/review` mediu 1182 arquivos sem erro, e esta etapa só mexeu num arquivo de
teste, conferido com o Biome acima.

`pnpm e2e` não rodou. Nenhum spec de `apps/e2e` passa pela busca da tabela nem pelo menu mobile da landing:
`grep -rniE "search|busca|menuButton|mobileMenu"` em `apps/e2e/tests` e `apps/e2e/support` só encontra
`searchParams` em `accountSettings.spec.ts`, e `landing.spec.ts` não usa o botão "Menu".

## Decisões de custo de teste

Nenhum teste da faixa cara. O diff não tem rota de API, consulta ao Firestore, regra de segurança nem sessão.

- `packages/design-system/components/ui/table.tsx`: `tablePagination.test.tsx` (32 casos, com estados de vazio,
  limpar, anúncio com timer falso e esqueleto) e `actionMenu.test.tsx` cobrem em jsdom. Não criei caso novo além
  do ajuste do herdado.
- `apps/app/__tests__/tableLoadMore.test.tsx`: cobre o caso com `hasMore` no consumidor real. Sem caso novo.
- `apps/web/app/[locale]/components/header/index.tsx`: `headerMobileMenu.test.tsx` cobre o foco com `<a>` no lugar
  do `Link`. O comportamento com o App Router de verdade só aparece com o app de pé e foi medido no navegador (W1 a
  W6), não em teste.
- `packages/internationalization/translations/components/ui/table.ts`: o teste de paridade já cobre.

## Lacunas

| Lacuna | Origem | Veredito |
|--------|--------|----------|
| Região vazia durante o esqueleto sem teste | `review.md` (nova) | Fechada. Os dois casos já estavam no working tree quando esta rodada começou, e a mutação em `resultAnnouncement` derruba os dois. No navegador o estado não se reproduziu (item 2 da tabela). |
| Comportamento do header depois da navegação real do App Router | `handoff.md` e `review.md` | Fechada no navegador (W1 a W6). Continua sem teste automatizado, porque não cabe em teste de componente. |
| F5, foco no campo depois de excluir a única linha com busca ativa | `plan.md` e `review.md` | Fechada pelo caso herdado de `actionMenu.test.tsx`, agora estável, e medida no navegador. |
| Anúncio do vazio real com termo diz "Nenhum resultado" enquanto a tela mostra o texto do chamador | `review.md`, decisão em aberto 1 | Fora de escopo deste `/test`: é decisão de produto, e o comportamento atual foi medido (F7). |
| Um "x" só no Safari | `handoff.md` | Aberta. Só o Chrome foi medido. |

## Observações fora do escopo

- **Ctrl+Enter num link do menu, no macOS.** O `Link` do Next trata `ctrlKey` como clique modificado e não faz a
  navegação do lado do cliente; o Chrome do macOS não abre aba nova com Ctrl, então a página recarrega inteira na
  mesma aba e o foco volta ao `body`. Cmd+Enter, o atalho de aba nova no macOS, funciona como o esperado. No Windows
  e no Linux o atalho de aba nova é o Ctrl. Não é defeito do diff.
- **"Carregar mais" pelo `agent-browser click`.** Dois cliques do `agent-browser` no botão não dispararam a
  requisição da página seguinte; `element.click()` disparou (`GET /entities?limit=20&cursor=…`, 26 linhas). Os
  outros botões da tabela responderam ao clique da ferramenta. O botão está fora do diff e não investiguei a causa.

## Ambiente do e2e

Todas as portas (3000 a 3003, 9099, 8080, 9199, 4001, 4400, 4500, 9150) estavam livres no início. Subi, por PID:

- `pnpm emulators` (auth, firestore e storage, projeto `demo-next-boilerplate`, JDK 21);
- `next dev` da `api` (3002), do `app` (3000) e da `web` (3001), com o ambiente montado a partir do `.env.example`
  de cada app e do bloco do emulador, no mesmo formato do `buildStackEnv` da suíte E2E. Não existe `.env` local.

Dados criados no emulador: o seed padrão, 22 entidades "Lote QA NN" para `user@example.com`, a conta
`qa-table-search@example.com` sem entidades e 19 contas `qa-table-bulk-NN@example.com`. Tudo morreu com o emulador.
A senha das contas é a do seed, documentada em `docs/SETUP.md`. Nenhuma conta foi criada em projeto Firebase real,
então `docs/PRE-PRODUCTION.md` não muda.

No fim, matei os PIDs dos servidores e mandei SIGINT ao `firebase-tools` para os emuladores encerrarem. As 11
portas voltaram a sair vazias no `lsof`, e o `pgrep` não encontrou `agent-browser`, `Chrome for Testing` nem
`next dev`. As sessões do `agent-browser` foram fechadas com `close --all`.

## Estado de dev alterado

Nenhum fora do emulador. No repositório, só o ajuste em `packages/design-system/__tests__/actionMenu.test.tsx` e os
arquivos desta pasta.

## Para o plano de commits

O `actionMenu.test.tsx` não está no plano de commits do `review.md`. Ele pertence ao commit do design-system
(`feat(design-system): tell an empty search apart from an empty list in Table`), junto de `table.tsx` e
`tablePagination.test.tsx`. Os dois arquivos novos desta etapa entram no commit `docs(features): table-search-feedback`.
