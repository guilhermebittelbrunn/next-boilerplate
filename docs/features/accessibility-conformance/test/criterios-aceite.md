# Critérios de Aceite (Checklist)

Marcação: `[x]` aprovado com medição própria do `/test`; `[ ]` reprovado ou não verificado, com o motivo no
parágrafo. O status item a item, com o meio de verificação, está em [`report.md`](report.md).

- [x] **Allowlist vazia e suíte verde**
  `apps/e2e/a11y/allowlist.ts` exporta `A11Y_ALLOWLIST = []` e `pnpm e2e` passa em claro e escuro em todas as
  rotas cobertas. Nenhuma violação `critical`/`serious` aparece e o relatório não traz anotação
  `a11y-stale-exception`. Isso também confirma que a exceção antiga de `web:/pt-br/sign-up` estava sem alvo.
  O `aria-describedby` que aponta para o id inexistente `-form-item-description` sai como `incomplete`
  (`aria-valid-attr-value`), não como violação.

- [x] **Campo com erro anuncia a mensagem**
  Em todo `HookForm*` com erro de validação, o elemento focável tem `aria-invalid="true"` e um
  `aria-describedby` que referencia o parágrafo com o texto do erro. Sem erro, o atributo volta a `false` e a
  referência à mensagem some, sem recarregar a página. No submit, o foco vai para o primeiro campo inválido.
  Vale para texto, senha, select, textarea, radio, data, upload e switch; no browser o `/test` mediu texto e
  senha no `apps/app` (login, criar entidade, criar usuário) e na `apps/web` (cadastro com senha curta).
  `Select` e `DateInput` não chegam a um estado de erro pela UI atual, porque todo formulário do repo dá valor
  padrão ao `Select` e a data só entra pelo calendário; esses dois ficam provados pelo teste de componente.

- [x] **Erro local do upload também é anunciado**
  Ao escolher um arquivo acima de 4 MB ou de tipo recusado, o `input[type=file]` passa a `aria-invalid="true"`
  e referencia a mensagem local ("A imagem excede 4 MB.") no `aria-describedby`, junto da dica. Ao escolher
  um arquivo válido depois, a referência ao erro some e o atributo volta a `false`.

- [x] **Campo de senha rotulado e botão de alternar com nome**
  O `input` de senha é achado pelo rótulo visível ("Senha", "Password", "Contraseña"), não mais só pelo
  atributo `name`. O botão ao lado anuncia "Mostrar senha" e, depois de acionado, "Ocultar senha", com
  "Show password"/"Hide password" e "Mostrar contraseña"/"Ocultar contraseña". Vale para os dois campos
  quando há confirmação de senha.

- [x] **Botão em carregamento mantém o nome**
  Durante o envio, o botão continua com o nome do rótulo traduzido, publica `aria-busy="true"` e fica
  desabilitado; o spinner tem `aria-hidden="true"` e não entra na árvore de acessibilidade. Duplo clique
  durante o carregamento não dispara um segundo envio, porque o botão já está `disabled` na primeira
  mutação do DOM. O mesmo comportamento no checkout de assinatura depende de chave de teste da Stripe e não
  foi percorrido.

- [x] **Gatilho do menu de ações é um botão focável**
  Na lista de entidades e na de usuários, Tab alcança o gatilho de cada linha, que é um `<button
  type="button">`, mostra anel de foco de 3 px e tem nome "Mais ações"/"More actions"/"Más acciones". Enter
  abre o menu e o foco entra no primeiro item; as setas andam entre os itens e voltam ao início; Esc fecha e
  devolve o foco ao gatilho. Abrir com o mouse também move o foco para o primeiro item, sem anel visível e
  sem rolar a página. Enter em "Editar" navega para a edição.

- [x] **Switch de linha nomeia o registro**
  O `Switch` de cada linha diz a qual registro se refere: "Entidade ativa: <nome>" e "Usuário ativo: <nome
  ou e-mail>", com as traduções. Usuário sem nome de exibição cai no e-mail. Sob personificação, o switch de
  entidade continua nomeado e fica desabilitado.

- [x] **Seletor de ambiente com nome**
  No navbar do admin, em desktop e dentro do menu mobile, o seletor de ambiente tem nome
  "Ambiente"/"Environment"/"Entorno". O seletor de usuário personificado continua nomeado ("Selecione o
  usuário").

- [x] **Título traduzido no painel**
  Toda página do painel comum tem `<title>` "Painel do usuário | <marca>" e toda página do admin
  "Administração | <marca>", com "User dashboard"/"Administration" em `/en` e "Panel de
  usuario"/"Administración" em `/es`. Inclui as páginas `"use client"` (criar entidade, criar e editar
  usuário). Segmento de idioma inválido cai no pt-br; a marca vem de `NEXT_PUBLIC_APP_NAME` quando definida.

- [x] **Contraste do erro no escuro**
  A mensagem de erro de formulário no tema escuro fica com razão igual ou maior que 4,5:1 contra o fundo em
  que é pintada, medida no estilo computado. Medido: 6,15:1 no painel do formulário do `apps/app` e 6,85:1 na
  `apps/web`.

- [x] **Item "Excluir" do menu de ações em repouso e em hover**
  Em repouso, o texto e o ícone do item ficam iguais ou maiores que 4,5:1 contra o popover nos dois temas, e
  em hover ficam legíveis sobre o fundo vermelho. Na rodada 1 o hover reprovou: uma regra do `globals.css`
  pintava texto e ícone com o mesmo vermelho do fundo (1:1). Depois da correção, a rodada 2 mediu, nas listas
  de entidades e de usuários: repouso 4,77:1 no claro e 6,85:1 no escuro; hover com texto e ícone em
  `--background` sobre `--destructive`, 4,77:1 no claro e 6,85:1 no escuro. "Editar" continua em
  `--foreground`. O item com foco de teclado no claro fica em 4,38:1 (vermelho sobre `--accent`), par já
  registrado como fora do corte.

- [x] **Botão destrutivo no escuro**
  O botão "Excluir minha conta" (`AccountPrivacyPanel`) no escuro mantém texto branco legível sobre
  `bg-destructive/60`: 6,43:1 medido, em repouso e com o cursor em cima. No claro, 4,77:1.

- [x] **Iniciais do avatar e cards da landing no claro**
  As iniciais do avatar do navbar e os textos `muted` dos cards de recursos, depoimentos e CTA da landing
  ficam iguais ou maiores que 4,5:1 no tema claro: 4,62:1 medido no pior caso. O escuro não piora (5,86:1 no
  pior texto `muted` da landing).

- [x] **Avatar com imagem sem `image-alt`**
  Com avatar enviado, o axe numa página autenticada não acusa `image-alt`: a imagem do navbar tem `alt=""`
  e o gatilho do menu mantém o nome "Abrir menu do perfil". A pré-visualização do formulário continua com
  texto alternativo próprio.

- [x] **CTAs da web são links simples**
  Hero, CTA, FAQ e preços renderizam um `<a>` com aparência de botão, sem `<button>` em volta e sem
  interativo aninhado. Os links levam aos mesmos destinos de antes, inclusive o `NEXT_PUBLIC_APP_URL` quando
  definido. O seletor de data do contato tem um único botão focável. O link "voltar ao início" da página 404
  segue o mesmo padrão, com `px-6` no tamanho `lg`.

- [x] **Design system tem testes que pegam regressão**
  `pnpm --filter @repo/design-system test` roda e passa. Reverter um conserto (tirar o `aria-label` do
  gatilho, tirar o `sr-only` do `Button`) faz pelo menos um teste falhar; o `/test` fez as duas mutações e
  reverteu. Os testes não enxergam o `globals.css`, e por isso o defeito do hover do "Excluir" passou por eles.

- [x] **Gates do CI**
  `pnpm test` da raiz passa com `@repo/design-system#test` e `api#test:emulator` na execução, typecheck dos
  apps afetados passa e a paridade de i18n fica verde nos 3 idiomas.

- [x] **Sem regressão visual**
  Claro, escuro e mobile nas telas percorridas: os CTAs da web mantêm aparência de botão, o gatilho do menu
  mantém o ícone e o tamanho, e o carregamento do botão não fica mais largo nem mais estreito do que antes
  do diff. Na rodada 1 o hover do "Excluir" foi a regressão; a rodada 2 confirmou a correção. O botão
  "Salvar" do formulário de entidade encolhe de 74 px para 48 px durante o carregamento, mas isso já
  acontecia antes, porque o botão sempre trocou o conteúdo pelo spinner, e o `sr-only` não muda a largura.
  Fica como achado de backlog.

## Roteiro de teste manual

Pré-requisito: `pnpm emulators` com JDK 21, `pnpm seed`, e `api`, `app` e `web` apontando para o emulador.
Contas do seed: `user@example.com` (comum) e `admin@example.com` (admin); a senha está em `docs/SETUP.md`.

1. `/pt-br/sign-in`, clique em "Entrar" com os campos vazios. Esperado: foco no e-mail; e-mail e senha com
   `aria-invalid="true"` e a mensagem no `aria-describedby`.
2. Preencha um e-mail válido e saia do campo. Esperado: `aria-invalid="false"` e a mensagem sai do
   `aria-describedby`.
3. Clique no olho da senha. Esperado: o nome muda de "Mostrar senha" para "Ocultar senha".
4. Entre como usuário comum. Durante o envio, o botão fica com `aria-busy="true"`, desabilitado e com o nome
   "Entrar".
5. `/pt-br/entities`: Tab até "Mais ações" da primeira linha. Esperado: anel de foco visível.
6. Enter. Esperado: menu aberto com foco em "Editar". Seta para baixo: foco em "Excluir". Esc: menu fecha e
   o foco volta ao gatilho.
7. Abra o menu com o mouse e passe o cursor sobre "Excluir", no claro e no escuro. Esperado: texto e
   lixeira legíveis sobre o vermelho.
8. `/pt-br/entities/create`, "Salvar" vazio. Esperado: "Informe o nome." ligado ao campo Nome; no escuro, a
   mensagem legível.
9. Escolha uma imagem acima de 4 MB na Foto. Esperado: "A imagem excede 4 MB." ligada ao campo; depois uma
   imagem válida remove a referência.
10. `/pt-br/account`, envie um avatar e salve. Esperado: navbar com a foto, gatilho "Abrir menu do perfil".
11. Troque para `/en` e `/es` em cada rota acima e confira o título da aba.
12. Como admin, `/pt-br/admin/users`: switches "Usuário ativo: …"; seletor "Ambiente"; troque para "Painel
    do usuário" e confira os switches de entidade nomeados e desabilitados.
13. Em 390 × 844, abra o menu de ambiente do navbar. Esperado: "Ambiente" e "Selecione o usuário".
14. `apps/web`: `/pt-br`, `/pt-br/pricing`, `/pt-br/contact` e `/pt-br/sign-up` com senha curta. Esperado:
    CTAs como links sem botão em volta, um só botão no seletor de data, erro de senha ligado ao campo.
