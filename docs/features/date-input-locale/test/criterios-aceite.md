# Critérios de Aceite (Checklist)

Feature: `DateInput` e `Calendar` no idioma ativo. Partem da §10 do `analyze/plan.md`, com os casos-limite
que o `/test` acrescentou. O status medido de cada um está em `test/report.md`.

- [x] **Placeholder do campo de data no idioma da página**
  Em `/entities/create`, sem valor, o botão do campo "Data de nascimento" mostra "Escolha uma data" em pt-br,
  "Pick a date" em en e "Elige una fecha" em es. Uma entidade com `birthdate: null` aberta em
  `/entities/edit/<id>` mostra o mesmo placeholder. Quando o chamador passa `placeholder`, como os filtros
  "Desde"/"Hasta" de `/admin/audit`, o texto do chamador vale; um placeholder vazio passado de propósito
  continua vazio. Hoje o texto do chamador na auditoria é igual ao default, então a precedência só se prova
  no teste de componente.

- [x] **Data escolhida por extenso no idioma da URL**
  Com valor `2026-10-13`, o botão mostra "13 de outubro de 2026", "October 13th, 2026" e
  "13 de octubre de 2026". O mesmo vale para a data carregada em `/entities/edit/<id>` (ex.: `1990-04-17`
  vira "17 de abril de 1990" / "April 17th, 1990") e para a escolhida nos filtros de auditoria. Valor
  ausente, `null` ou fora do formato `yyyy-MM-dd` mostra o placeholder.

- [x] **Calendário no idioma ativo**
  Ao abrir o calendário, a legenda do mês, o cabeçalho dos dias da semana, o nome acessível de cada dia e os
  botões de mês anterior e próximo saem no idioma da URL ("Ir para o mês anterior", "Go to the Previous
  Month", "Ir al mes anterior"). Em es a semana começa na segunda-feira, pelo locale do date-fns; em pt-br e
  en, no domingo. Mês e dia em pt-br e es saem em minúscula, que é a grafia do date-fns. Com `captionLayout`
  de dropdown, os meses saem no idioma da URL e não no do navegador.

- [x] **Troca de idioma sem recarregar**
  Trocar o idioma pelo seletor da navbar atualiza o placeholder, a data formatada e o calendário sem
  recarregar o documento. Vale com o popover fechado e com ele aberto no momento do clique: no segundo caso o
  popover fecha na troca e, reaberto, já vem no idioma novo. Um `locale` passado explicitamente ao `Calendar`
  continua vencendo o idioma da URL.

- [x] **Valor gravado inalterado**
  Escolher um dia continua gravando `yyyy-MM-dd` em qualquer idioma. A API de `entity` recebe no `PUT`/`POST`
  e devolve no `GET` o `birthdate` nesse formato, e o filtro da auditoria envia `from`/`to` também como
  `yyyy-MM-dd`. Nenhum schema, rota, documento ou `error.code` muda.

- [x] **Página de contato da landing**
  Em `/contact` da `apps/web`, o botão de data (que nasce com a data de hoje) e o calendário seguem o idioma
  da URL nos três idiomas, tanto no HTML do servidor quanto depois da hidratação. A troca pelo seletor da web
  também atualiza os dois sem recarregar.

- [x] **Tema, responsivo e hidratação**
  Em claro, escuro e 390 px, o popover do calendário cabe na tela com a legenda mais longa ("septiembre 2026",
  "setembro 2026") sem estouro horizontal. Carregar direto pela URL `/entities/edit/<id>`,
  `/entities/create`, `/admin/audit` e `/contact` nos três idiomas não gera erro de hidratação. O mismatch
  conhecido da `/contact` quando o dia do servidor difere do dia do navegador é anterior a esta tarefa e
  está registrado à parte.

- [x] **Regressão e paridade**
  A paridade de i18n passa com a folha nova `components.dateInput` nos três idiomas. A suíte do design
  system, da `apps/app`, da `apps/web` e o `pnpm test` da raiz passam sem afrouxar teste. Sob personificação o
  formulário de `entity` segue em modo leitura (coberto por `entityFormsReadOnly.test.tsx`).
