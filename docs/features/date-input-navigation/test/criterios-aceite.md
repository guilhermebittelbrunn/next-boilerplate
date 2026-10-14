# Critérios de Aceite (Checklist)

Feature: seletores de data levam à data certa. Os critérios partem da §10 do `analyze/plan.md`, com os
casos-limite que o `/test` acrescentou e duas correções de texto (rótulo da `/contact` e personificação). O
status medido de cada um, e por qual meio, está em `test/report.md`.

- [x] **Calendário abre no mês da data selecionada**
  Em qualquer `DateInput` com valor, abrir o calendário mostra o mês desse valor: a entidade do seed com
  `1990-04-17` abre em abril de 1990 em `/entities/edit/<id>`, com o dia 17 marcado. Sem valor, com `null` vindo
  da API ou com valor fora do formato `yyyy-MM-dd` (por exemplo `17/04/1990`), o calendário abre no mês atual.
  Escolher outra data, fechar e reabrir mostra o mês da nova data, inclusive quando a reabertura acontece
  durante a animação de saída do popover. Navegar para outro mês sem escolher dia e fechar não muda nada: a
  próxima abertura volta ao mês do valor.

- [x] **Seletor de mês e ano no nascimento de `entity`**
  O campo "Data de nascimento" de `/entities/create` e `/entities/edit/<id>` mostra um seletor de mês e outro
  de ano, com nomes acessíveis no idioma da URL: "Escolha o mês"/"Escolha o ano", "Choose the Month"/"Choose
  the Year", "Elegir el mes"/"Elegir el año". Com `1990-04-17` os seletores mostram `abr`/`1990` em pt-br,
  `Apr`/`1990` em en e `abr`/`1990` em es. Os meses vão de `jan` a `dez` (pt-br), `Jan` a `Dec` (en) e `ene` a
  `dic` (es).

- [x] **Intervalo padrão do seletor de ano**
  Sem `startMonth`/`endMonth`, o seletor de ano tem 101 opções, de 1926 a 2026 (cem anos para trás até o fim do
  ano corrente). Com o seletor em dezembro de 2026, o botão "Ir para o próximo mês" fica desabilitado. Com o
  campo vazio, os seletores começam no mês e no ano atuais (`out`/`2026` em 14/10/2026).

- [x] **Intervalo configurável**
  Um `DateInput` com `captionLayout="dropdown"`, `startMonth` e `endMonth` limita o seletor de ano a esse
  intervalo (de 2020 a 2030 no teste de componente). Nenhuma tela do repositório passa essas duas props hoje,
  então o critério só se prova no nível de componente.

- [x] **Quem não pede o seletor fica como está**
  Os campos "De" e "Até" de `/admin/audit` continuam com navegação mês a mês, sem `<select>` e sem limite: o
  botão de próximo mês segue habilitado depois de dezembro de 2026. Eles ganham só a abertura no mês da data
  escolhida: "De" em 10/09/2026 reabre em setembro de 2026. "Aplicar" continua montando a consulta com
  `from`/`to` em `yyyy-MM-dd`, e um período sem eventos mostra "Nenhum evento registrado.".

- [x] **Valor gravado inalterado**
  Escolher um dia pelos seletores de mês e ano grava `yyyy-MM-dd` no formulário, e a API de `entity` devolve o
  `birthdate` no mesmo formato no `GET /entities/<id>` depois de salvar. Nenhum schema, rota ou documento muda.

- [x] **Personificação continua sem gravar**
  Sob personificação, o botão de salvar de `/entities/create` e `/entities/edit/<id>` continua bloqueado e a
  tela explica o motivo. O campo de data em si nunca foi desabilitado nesse modo: o formulário não repassa
  `disabled` aos campos, e o bloqueio está no envio. Esta entrega não muda esse comportamento.

- [x] **`/contact` sem erro de hidratação**
  Com o servidor da web em `TZ=Pacific/Kiritimati` (já no dia seguinte) e o navegador em `America/Sao_Paulo`, a
  `/contact` carrega sem erro #418 e sem erro de console nos três idiomas. O HTML do servidor não depende do
  relógio, porque o campo começa vazio.

- [x] **`/contact` começa vazia, com o placeholder do idioma**
  O campo de data abre com "Escolha uma data", "Pick a date" ou "Elige una fecha", em vez de pré-selecionar o
  dia de hoje. A data escolhida aparece por extenso no idioma ("12 de agosto de 2026" em es) e o calendário
  reabre no mês dela.

- [x] **Rótulo "Data" ligado ao botão do calendário**
  O rótulo "Data"/"Date"/"Fecha" aponta para o botão (`for="date"`/`id="date"`), e o nome acessível do botão é
  o texto do rótulo. Clicar no rótulo abre o calendário, porque o clique no `<label>` vira clique no botão; o
  foco vai para o primeiro controle do popover ("Ir al mes anterior") e volta ao botão quando o calendário
  fecha com `Escape`. O código da página não usa mais `initialFocus`.

- [x] **Tema e responsivo**
  Claro, escuro, 1280 px e 390 px sem estouro horizontal causado pelo campo ou pelo popover. Em 390 px o
  popover fica entre x=32 e x=282 (app) e x=36 e x=286 (web), os dois `<select>` cabem dentro dele nos três
  idiomas, e o botão de data da `/contact` tem a mesma largura e altura dos inputs vizinhos.

- [ ] **Lista nativa do `<select>` legível no escuro**
  No tema escuro, o `<select>` do seletor tem `color-scheme: dark`, texto claro e fundo escuro, e as opções
  herdam o texto claro com fundo transparente. A lista que o navegador abre ao clicar é desenhada pelo sistema
  operacional, fora do DOM, e um navegador headless não a renderiza. Fica não verificado até alguém abrir a
  lista num navegador com janela, no macOS e no Windows.

- [x] **Regressão**
  `pnpm check`, os `typecheck` do design system, da app e da web, e as suítes desses workspaces passam, assim
  como o `pnpm test` da raiz (que inclui o `test:emulator` da API).
