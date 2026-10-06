# Relatório de QA: "Excluir" do menu de ações funciona pelo teclado

Branch: `design-system/fix/action-menu-keyboard-delete` (não protegida). Escopo medido:
`packages/design-system/components/ui/action-menu.tsx` e os três consumidores em `apps/app` (lista de
entidades, lista de usuários do admin e playground).

Veredito: **aprovado na rodada 2**. O teclado funciona como o plano pediu em todos os fluxos medidos. Na rodada
1 a confirmação saía da tela a 390 px (D1); o `/review` trocou o placement para `bottom` e a rodada 2 (§12)
mediu a confirmação inteira na viewport em todos os casos. As seções 1 a 11 descrevem a rodada 1.

## 1. Defeito

### D1. A 390 px a confirmação sai 49 px pela esquerda da tela

Repro:

1. Viewport 390 × 844, qualquer tema, `/pt-br/entities` com o usuário comum (ou `/pt-br/admin/users` com o
   admin).
2. Rolar a tabela até a coluna "Ações" (o wrapper rola sozinho quando o "⋮" recebe foco ou toque).
3. Tocar no "⋮" de uma linha e em "Excluir" (ou "Arquivar").

Medido com `getBoundingClientRect` do `.ant-popover` visível:

| Tela | Tema | Idioma | Popover, x (left → right) | Cabe em 390 px? |
|------|------|--------|---------------------------|-----------------|
| Entidades | claro | pt-br | -49 → 341 | não |
| Entidades | claro | es | -49 → 331 | não |
| Entidades | escuro | pt-br | -49 → 341 | não |
| Entidades | escuro | es | -49 → 331 | não |
| Usuários (admin), "Arquivar" | claro | pt-br | -49 → 341 | não |
| Entidades, código de `main` | claro | pt-br | 0 → 390 | sim |

O título aparece cortado como "cluir registro" e a descrição perde as primeiras letras de cada linha. Os
botões "Não" e "Sim" ficam visíveis, então dá para cancelar ou confirmar, mas o texto que explica a ação
destrutiva não é legível.

Causa provável: o `Popconfirm` agora usa `placement="bottomRight"` ancorado no "⋮". O painel se alinha pela
direita do gatilho (x 341) e tem cerca de 390 px de largura, e o deslocamento horizontal que o antd aplica
nesse placement não alcança a borda. Em `main` ele usava o placement padrão (`top`) ancorado no item do menu,
e o antd o empurrou até x 0. Correção sugerida para o `/review`, a medir depois: limitar a largura do painel à
viewport (por exemplo `maxWidth: "calc(100vw - 32px)"` no estilo raiz do `Popconfirm`) ou trocar para um
placement que o antd consiga deslocar até caber. Não corrigi: é código de produção.

Como medi `main`: troquei temporariamente o `action-menu.tsx` pelo `git show HEAD:` do arquivo com o dev
server de pé, rodei a mesma sonda e restaurei o arquivo. `diff` contra a cópia de segurança confirmou o
arquivo idêntico ao da branch.

## 2. Testes

### Comandos

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter @repo/design-system test` (antes das minhas mudanças) | 6 arquivos, 54 testes, todos passando |
| `pnpm --filter @repo/design-system test` (final) | 6 arquivos, 60 testes, todos passando; `actionMenu.test.tsx` com 19 |
| `NODE_ENV=test npx vitest run __tests__/actionMenu.test.tsx` em `packages/design-system`, 3 vezes depois dos casos novos | 18/18 nas 3; 19/19 depois do último caso |
| `pnpm test` na raiz, com `JAVA_HOME=/opt/homebrew/opt/openjdk@21` | 15/15 tasks, 9 do cache, 48,2 s. `app` 101 arquivos/818 testes, `api` 93/1205, `api:test:emulator` 4/186, `web` 13/82, `@repo/design-system` 6/59, `@repo/internationalization` 6/59, `@repo/auth` 10/127, `@repo/email` 7/202, demais pacotes verdes |
| Testes de `apps/app` que mockam o `ActionsMenu` (dentro do `app:test` acima) | `usersListArchiveLabels` 13, `entitiesListReadOnly` 3, `usersListLastAccess` 9: todos passando |
| `pnpm --filter @repo/design-system typecheck` | exit 0 |
| `pnpm check` | 856 arquivos, nenhuma correção |
| `npx playwright test tests/entityCrud.spec.ts` em `apps/e2e` | 5 passando (4 de setup + o spec), 1,0 min |

O `pnpm test` da raiz rodou antes do último caso novo (sem `onDelete`). Depois dele rodei só a suíte do
pacote, o único workspace que o arquivo afeta. A paridade de i18n não rodou de novo porque nenhuma chave mudou
(o cache do turbo reproduziu 6/59). Sem `--force`: não houve motivo para suspeitar do cache.

### Testes criados

Seis casos novos em `packages/design-system/__tests__/actionMenu.test.tsx`, todos de componente em jsdom (a
faixa barata):

| Caso | O que prova |
|------|-------------|
| `keeps the confirm button loading until an async onDelete resolves` | "Sim" mostra o ícone de carregamento e a confirmação segue aberta até a promise resolver |
| `runs a custom item's handler without opening the confirmation` | Enter e clique num item de `items` chamam o `onClick` dele e não abrem a confirmação |
| `closes the confirmation on a click outside without deleting` | `mousedown` fora fecha sem chamar `onDelete` |
| `closes the confirmation and reopens the menu when the trigger is clicked` | Clique no "⋮" com a confirmação aberta fecha a confirmação e põe `aria-expanded="true"` |
| `closes the open menu on Escape and returns focus to the trigger` | Esc com o menu aberto devolve o foco ao "⋮" e volta `aria-expanded` a `"false"` |
| `offers no delete item and no confirmation without onDelete` | Sem `onDelete` não há item de excluir e "Editar" não abre confirmação |

Prova por mutação, aplicada no componente e revertida em seguida (o `diff` contra a cópia confirmou a
restauração):

| Mutação | Casos novos que caíram |
|---------|------------------------|
| M5: `return onDelete?.()` vira `onDelete?.()` | o do `onDelete` assíncrono |
| M6: `onOpenChange` do `Popconfirm` ignora o `false` | assíncrono, clique fora e clique no "⋮" (3) |
| M7: itens de `items` também abrem a confirmação | o do item customizado |

O caso do Esc com o menu aberto protege um comportamento do `rc-dropdown` que já existia; não tentei uma
mutação para ele.

### Decisões de custo

- `action-menu.tsx`: tudo coberto em jsdom. Nenhum teste da faixa cara, porque o componente não fala com
  Firestore, regra ou sessão.
- O E2E `entityCrud.spec.ts` já existia e cobre o clique em "Excluir" e "Sim". Rodei, não acrescentei nada.
- O que o jsdom não prova (Enter real, animação, `raf`, layout, contraste) ficou para o browser, abaixo.

## 3. Critérios de aceite

Checklist completo em [`criterios-aceite.md`](criterios-aceite.md).

| # | Critério | Status | Meio |
|---|----------|--------|------|
| 1 | Enter em "Excluir" abre a confirmação | ✅ aprovado | jsdom, browser (entidades e admin, 3 idiomas) |
| 2 | O foco entra na confirmação e não ativa nada sozinho | ✅ aprovado | browser |
| 3 | Esc fecha e devolve o foco ao gatilho | ✅ aprovado | jsdom, browser |
| 4 | "Não" cancela e "Sim" exclui uma única vez | ✅ aprovado | jsdom, browser |
| 5 | O mouse continua funcionando | ✅ aprovado | jsdom, browser, E2E |
| 6 | "Editar" e itens customizados não abrem a confirmação | ✅ aprovado | jsdom, browser (playground) |
| 7 | Sem `onDelete`, não há como excluir | ✅ aprovado | jsdom |
| 8 | O gatilho anuncia o menu | ✅ aprovado | jsdom, browser |
| 9 | Layout, tema e idioma | ✅ aprovado na rodada 2 (❌ na rodada 1, D1) | browser (Playwright, §12) |
| 10 | Um `onDelete` assíncrono segura o "Sim" até resolver | ✅ aprovado | jsdom |
| 11 | Teclado em sequência não deixa o foco preso | ✅ aprovado | browser |

## 4. Lista "Verificar no `/test`" do `review.md`

1. **Enter abre e o foco termina em "Não"**: confirmado. Gravei uma linha do tempo na página (listeners em
   `keydown`, `focusin`, `click` e nas classes do painel). O `keydown Enter` no `<li>` "Excluir" chegou em
   7925 ms, o painel entrou em `ant-zoom-big-appear` e o `focusin` em "Não" veio em 8200 ms, 275 ms depois,
   sem nenhum `click` em "Não". `document.activeElement.textContent` lido 700 ms depois do Enter: "Não" em
   pt-br, "No" em en e es, com o painel visível.
2. **Foco preso no `<li>` escondido**: confirmado que não acontece no ritmo normal. Depois do Enter em
   "Excluir", nenhum `focusin` volta a um `<li>` até a medição seguinte (700 ms). O `focusin` do `raf` do
   `rc-dropdown` acontece entre 74 e 90 ms depois de abrir o menu, sempre antes da seta. Um Enter em "Excluir"
   menos de 3 frames depois de abrir o menu não é reproduzível pelo teclado: até o foco entrar no menu, a seta
   cai no "⋮" e não chega ao item.
3. **Esc, "Não" e "Sim" devolvem o foco ao "⋮" da mesma linha**: confirmado. Esc e "Não" deixaram o
   `activeElement` com `aria-label` "Mais ações" na linha "QA action-menu teclado" e, no Playwright, na linha
   "Acme Franchise", nos 3 idiomas e nos 2 temas. Com "Sim", o `focusin` vai ao "⋮" (24293 ms), a linha sai do
   DOM com a exclusão e o foco termina no `body`, como o plano previa.
4. **Mouse**: confirmado. A seta do painel fica no centro do "⋮" (x 1344 nos dois) e a borda direita do
   painel coincide com a do gatilho (1364). Clique na busca com a confirmação aberta: o painel fecha, o foco
   fica no `<input>` da busca e nenhuma linha some. Clique no "⋮" com a confirmação aberta: o painel fecha, o
   menu abre e `aria-expanded` vira `"true"`. E2E `entityCrud.spec.ts` verde.
5. **Esc com o menu aberto**: confirmado. Foco no "⋮", `aria-expanded="false"`, menu com
   `ant-dropdown-hidden`. Medido em entidades (pt-br, en, es, claro e escuro) e no playground.
6. **Layout**: derrubado em parte. Em desktop (1440 px) o centro do "⋮" coincide com o da célula (x 1344 nos
   dois; y 283 contra 284) e a linha tem 73 px antes e depois. A caixa do botão encolheu de 97 × 40 (medido no
   código de `main`) para 40 × 40: o ícone fica no mesmo lugar, mas a área de clique e de hover diminui e o
   anel de foco fica redondo. O plano previa isso (§5.1). A 390 px a confirmação sai da tela (D1).
7. **Contorno de foco em "Não" e "Sim"**: claro aprovado; escuro com contraste baixo, herdado. No claro o
   anel é `solid 3px rgb(38,38,38)` com offset 1 px sobre o fundo branco do painel: 15,13:1. No escuro o anel
   é o mesmo `rgb(38,38,38)` sobre o fundo `rgb(10,10,10)` do painel: 1,31:1. O estilo vem dos tokens do antd
   (`AntdAppProvider`), vale para todo botão antd no tema escuro, e o diff não o tocou. O critério 9 aceita
   registrar a ausência como herdada, e ela vai como achado (O1).
8. **`aria-expanded` no browser**: confirmado. Vale `"false"` com o menu fechado, `"true"` com o menu
   aberto, e `"false"` com a confirmação aberta e depois de Esc no menu ou na confirmação. O fechamento do menu
   por clique fora não foi medido isoladamente.

## 5. Lacunas herdadas

| Lacuna (origem) | Veredito |
|-----------------|----------|
| Clique fora e clique no "⋮" com a confirmação aberta (handoff) | fechada aqui: 2 casos jsdom + browser |
| `aria-expanded` voltando a `false` por Esc ou clique fora (handoff) | Esc fechada aqui (jsdom + browser). Clique fora com o menu aberto continua aberta como teste; o código desse caminho é do `rc-dropdown` e não mudou |
| Itens customizados não abrem a confirmação (handoff) | fechada aqui: jsdom + playground |
| Anúncio de leitor de tela (handoff) | fora de escopo: não há instrumento no repo |
| `onDelete` com promise mantém o "Sim" carregando (review) | fechada aqui: jsdom, mutação M5 |

## 6. Achados fora do diff (para o `/spec --sync`)

- **O1.** No tema escuro, o anel de foco dos botões antd tem 1,31:1 contra o fundo do painel, e o ícone de
  alerta da confirmação é `rgb(0,0,0)` sobre `rgb(10,10,10)`, 1,06:1, praticamente invisível. Os dois vêm dos
  tokens do antd. O "Sim" primário também fica preto sobre quase preto.
- **O2.** Ao reabrir o menu, o foco cai no último item ativo ("Excluir") em vez do primeiro. Medido nos
  ciclos 2 e 3 de cada combinação. É o `rc-menu` guardando o `activeKey`; o diff não mexeu nisso, mas agora
  que "Excluir" responde ao teclado ele é o primeiro item focado na reabertura. A confirmação ainda protege.
- **O3.** Escolher um item que não navega (o "Approve" do playground) deixa o foco no `body`, pelo teclado e
  pelo mouse. É comportamento do `rc-dropdown`, num caminho que o diff não tocou. Não medi em `main`.
- **O4.** Na sonda do Playwright, `document.documentElement.lang` mostrou o idioma anterior depois de uma
  navegação completa (`/en/entities` com `lang="pt-br"`, `/es/entities` com `lang="en"`). É uma medição só,
  fora do escopo; vale conferir.

## 7. Evidência e2e

O que vale é o texto acima. Os prints em `test/e2e/` são descartados pelo `.gitignore`. Os de apoio:
`01-menu-aberto-teclado.png`, `02-confirmacao-teclado-dark.png`, `03-foco-nao-dark.png`,
`04-foco-sim-dark.png`, `07-confirmacao-mouse-dark.png`, `08-menu-light.png`,
`pw-{dark,light}-*-confirmacao.png`, `pw-mobile-*-confirmacao.png` (D1),
`pw-main-mobile-light-confirmacao.png` (o mesmo cenário em `main`), `pw-admin-*.png` e
`pw-playground-*.png`. Nenhum mostra dado de pessoa real, só as contas e entidades do seed do emulador.

### Problema da ferramenta durante a passada

O `agent-browser` 0.27.0 falhou de dois jeitos, e descartei as medições feitas nessas janelas:

- O `document.visibilityState` da aba alternava para `hidden`, o que para o `requestAnimationFrame`. Com isso
  as animações do antd ficavam presas em `enter-active` com `opacity: 0`. `agent-browser tab t1` devolvia a
  aba a `visible`.
- Em três sessões, logo depois do segundo Enter em "Excluir" da sessão, o Chrome passou a receber uma
  enxurrada de eventos de teclado confiáveis (`isTrusted`), com `key: "Unidentified"` e `code` alternando
  entre `KeyW` e `Minus`, cerca de 5 por milissegundo, e cliques confiáveis repetidos no elemento focado. Isso
  ligou e desligou o switch "Ativo" de linhas do seed dezenas de vezes e, numa sessão, derrubou o login. A
  página não consegue gerar evento confiável, então o problema está na ferramenta ou no Chrome que ela
  controla.

Para não depender disso, repeti toda a matriz com o Playwright 1.63 do `apps/e2e`, num script descartável fora
do repo: 3 ciclos de teclado por combinação (escuro em pt-br, en e es; claro em pt-br), playground nos dois
temas, admin em desktop nos 3 idiomas e nos 2 temas, e mobile 390 px nos dois temas. Nenhuma rodada teve
evento `Unidentified` nem clique espúrio. As medições do `agent-browser` que ficaram no relatório são as de
janelas sem enxurrada (contador de `Unidentified` em 0 e aba `visible`).

## 8. Ambiente do e2e

| Serviço | Origem | Encerramento |
|---------|--------|--------------|
| Emuladores, api, app e web do E2E | o próprio Playwright (`webServer`) | ele derrubou tudo ao terminar; portas conferidas livres |
| Emuladores (auth, firestore, storage), `pnpm emulators` com JDK 21 | subi eu (PID 50157) | SIGINT no `pnpm` e no `firebase-tools` filho (50177) |
| `apps/api` `next dev -p 3002` com o ambiente de emulador do `buildStackEnv("api")` | subi eu (PID 50504) | `kill` no PID |
| `apps/app` `next dev -p 3000` com `buildStackEnv("app")` | subi eu (PID 50506) | `kill` no PID |

Nenhum serviço do usuário estava de pé: as portas 3000, 3001, 3002, 3003, 8080, 9099 e 4001 estavam livres
no início. No fim, `lsof` saiu vazio para 3000, 3001, 3002, 3003, 8080, 9099, 9199, 4001, 4400 e 4500, e
nenhum dos PIDs acima existe mais. As sessões do `agent-browser` foram fechadas (`close --all`).

## 9. Dados e contas de QA

- Nenhuma conta criada. Usei as contas do seed do emulador (`user@example.com` e `admin@example.com`, projeto
  `demo-next-boilerplate`); a senha delas é a que o `docs/SETUP.md` documenta para o emulador.
- Criei a entidade "QA action-menu teclado" com `user@example.com` e a excluí pelo teclado ("Sim").
- A enxurrada de eventos do `agent-browser` alternou o campo "Ativo" das entidades "QA action-menu teclado" e
  "Marcos Pereira" (84 `PUT` no log da API).
- Tudo isso viveu no emulador, que sobe sem `--import` nem `--export-on-exit`, e sumiu quando ele parou.
  Nenhum projeto Firebase real foi tocado; nada a registrar no `docs/PRE-PRODUCTION.md`.

## 10. Cross-check

- `apps/app` é o único app que usa o `ActionsMenu`; `apps/web` não foi afetado.
- Comum × admin: medido nos dois (entidades e usuários). Impersonação e a linha do próprio admin ficam
  cobertas pelo caso jsdom sem `onDelete`, e os call sites não mudaram.
- `subscription` × `simple`: o componente não depende do modo.
- Claro × escuro, desktop × 390 px, pt-br × en × es: medidos, com as exceções de D1 e O1.

## 11. Estado do pipeline

A etapa `review` está `in-progress` no `STATE.md` e não há commit da feature
(`git log origin/main..HEAD` vazio). Numa rodada do `/cycle` isso é esperado, porque os commits dependem da
aprovação do usuário. Na rodada 1 marquei `test` como `blocked` por causa do D1; na rodada 2 passou a `done`.

## 12. Rodada 2: medição da correção do D1

O `/review` trocou `placement="bottomRight"` por `placement="bottom"` em `action-menu.tsx:94` (causa e leitura
do antd em `review/review.md`, "Rodada 2"). Medi só o que essa troca afeta. Os gates do pacote (60/60,
typecheck, `pnpm check`) já tinham rodado no `/review` com o arquivo atual e não os repeti.

Instrumento: Playwright 1.63 do `apps/e2e`, em script descartável fora do repo. Não usei o `agent-browser`
porque ele se mostrou instável nesta máquina na rodada 1 (aba alternando para `hidden` e enxurrada de eventos
de teclado confiáveis, §7).

### Mobile 390 × 844, toque no "⋮" e no item destrutivo, cancelando em seguida

`getBoundingClientRect()` do `.ant-popover` visível e do "⋮" da linha:

| Tela | Tema | Idioma | Placement | Popover x (left → right) | Popover y | "⋮" x / y | Seta (centro x) | Título |
|------|------|--------|-----------|--------------------------|-----------|-----------|-----------------|--------|
| Entidades | claro | pt-br | `bottom` | 0 → 390 | 582 → 708 | 301 a 341 / 530 a 570 | 321 | "Excluir registro", inteiro |
| Entidades | claro | es | `bottom` | 9 → 389 | 582 → 686 | 291 a 331 / 530 a 570 | 310 | "Eliminar registro", inteiro |
| Usuários (admin), "Arquivar" | claro | pt-br | `bottom` | 0 → 390 | 363 → 511 | 301 a 341 / 311 a 351 | 321 | "Arquivar usuário", inteiro |
| Entidades | escuro | pt-br | `bottom` | 0 → 390 | 582 → 708 | 301 a 341 / 530 a 570 | 321 | "Excluir registro", inteiro |
| Entidades | escuro | es | `bottom` | 9 → 389 | 582 → 686 | 291 a 331 / 530 a 570 | 310 | "Eliminar registro", inteiro |
| Usuários (admin), "Arquivar" | escuro | pt-br | `bottom` | 0 → 390 | 363 → 511 | 301 a 341 / 311 a 351 | 321 | "Arquivar usuário", inteiro |

Nos seis casos: `left >= 0` e `right <= 390`, o topo do painel fica 12 px abaixo do "⋮", o centro da seta cai
dentro do retângulo do botão, e o título e a descrição ficam inteiros na viewport (sem estouro de
`scrollWidth`). Cancelar não removeu linha (4 entidades e 3 usuários antes e depois). Os números batem com a
previsão do `/review` (0 → 390 em pt-br, cerca de 10 → 390 em es).

### Desktop 1280 × 800

Lista de entidades, tema claro, pt-br, clique no "⋮" da linha "Acme Franchise" e em "Excluir": placement
`bottom`, popover x 871 → 1279 e y 534 → 638, "⋮" em x 1173 a 1213 e y 482 a 522, seta em x 1192 (dentro do
"⋮"), painel inteiro na viewport.

### Última linha sem espaço embaixo

A última linha visível era "Acme Franchise", com o fundo em y 539. Com a viewport em 1280 × 800 havia espaço
e o painel abriu embaixo (como acima). Reduzi a viewport para 1280 × 579 (fundo da linha + 40 px): o painel
virou para `top`, ficou em y 366 → 470, acima do "⋮" (topo em 482), com a seta em x 1192 dentro do botão e o
painel inteiro na viewport.

### Regressão

| Verificação | Resultado |
|-------------|-----------|
| `npx playwright test tests/entityCrud.spec.ts` em `apps/e2e` | 5 passando (4 de setup + o spec), 1,5 min |
| Teclado mínimo, pt-br, desktop: Tab do switch até o "⋮", Enter, seta até "Excluir", Enter, Esc | foco no "⋮" "Mais ações" com `aria-expanded="false"`; depois do Enter em "Excluir" o foco ficou em "Não" com placement `bottom` e seta no "⋮"; depois do Esc o foco voltou ao "⋮" da linha "Acme Franchise", painel fechado; nenhum evento `Unidentified`; 4 linhas |

### Veredito

- D1: corrigido. Os seis casos de 390 px ficam dentro da viewport, contra x -49 na rodada 1.
- Critério 9: aprovado. O contorno de foco no escuro (1,31:1) continua registrado como herdado do antd
  (achado O1).
- Os demais critérios não dependem do placement; o fluxo de teclado e o E2E confirmaram que nada regrediu.

### Ambiente e dados da rodada 2

- O Playwright do E2E subiu e derrubou o próprio stack.
- Para a sonda, subi os emuladores (`pnpm emulators` com JDK 21), a `apps/api` em 3002 e a `apps/app` em 3000,
  com o ambiente de emulador do `buildStackEnv`, depois de conferir que todas as portas estavam livres.
  Derrubei os três pelos PIDs que guardei (SIGINT no `pnpm` e no `firebase-tools` filho, `kill` nos dois
  `next dev`). No fim, `lsof` saiu vazio em 3000, 3001, 3002, 3003, 8080, 9099, 9199, 4001, 4400 e 4500.
- Dados: só as contas do seed do emulador (`user@example.com`, `admin@example.com`). Nenhuma exclusão nem
  arquivamento (todas as confirmações foram canceladas); o emulador foi descartado ao parar. Nenhuma conta
  criada.
- Prints de apoio, descartados pelo `.gitignore`: `r2-mobile-{light,dark}-{pt-br,es}-entities.png`,
  `r2-mobile-{light,dark}-admin.png`, `r2-desktop-1280.png` e `r2-desktop-last-row-flip.png`.
