# Critérios de Aceite (Checklist)

Status medido no `/test` de 2026-10-09, com a `apps/app` e a `apps/web` em `next build` + `next start` e os
emuladores com `pnpm seed`: ✅ verificado e correto, ❌ falha, 🔒 não verificável nesta rodada (o motivo vem no
texto). O meio de cada verificação e os valores lidos estão no `test/report.md`.

- [x] **Controles do cabeçalho falam o idioma da página** (✅)
  Na `apps/app` (painel comum e admin) e na `apps/web`, o gatilho do tema, os itens do menu de tema, o seletor
  de idioma e o botão da barra lateral têm nome acessível no idioma da URL: "Alternar tema", "Claro/Escuro/
  Sistema", "Trocar idioma", "Alternar barra lateral" em pt-br; "Toggle theme", "Light/Dark/System", "Switch
  language", "Toggle sidebar" em en; "Cambiar tema", "Claro/Oscuro/Sistema", "Cambiar idioma", "Alternar barra
  lateral" em es. Trocar o idioma pelo seletor, sem recarregar a página, atualiza todos esses nomes na mesma
  navegação, nas duas apps. Os nomes dos idiomas no menu continuam no próprio idioma ("Português", "English",
  "Español"). Na `apps/web` a 390 px o cabeçalho não mostra o seletor de idioma nem o de tema (o menu mobile
  só tem os links); isso já era assim antes desta mudança e os nomes traduzidos continuam no DOM.

- [x] **Diálogos, carregamento e navegação sem inglês solto** (✅, com partes 🔒 no navegador)
  O `Sheet` da barra lateral mobile tem nome "Barra lateral"/"Sidebar"/"Barra lateral", descrição traduzida e
  botão "Fechar"/"Close"/"Cerrar". O `role="status"` dos spinners diz "Carregando"/"Loading"/"Cargando" e o
  `nav` do breadcrumb do cabeçalho se chama "Trilha de navegação"/"Breadcrumb"/"Ruta de navegación". O diálogo
  de preferências de cookies não abre neste ambiente (o consentimento exige um ID do Google Analytics, vazio no
  emulador), e a `Pagination` e as setas do carrossel do design system não têm consumidor na tela; esses três
  ficam 🔒 no navegador e cobertos pelo `componentCopy.test.tsx` nos 3 idiomas. Um `aria-label` passado pelo
  chamador ao `Spinner` continua valendo (Vitest).

- [x] **Breadcrumb de página leva para a home do idioma atual** (✅)
  O `PageBreadcrumb` mostra "Início"/"Home"/"Inicio" e o link aponta para `/pt-br`, `/en` e `/es`. Clicar nele
  no `/playground` leva à home do painel comum ("Olá"), sem 404. O link para `/painel`, que não existia, sumiu.

- [x] **Paginação do antd no idioma da página** (✅)
  Na `/admin/users`, com 12 usuários, o seletor de tamanho mostra "10 / página" em pt-br e es e "10 / page" em
  en. Os títulos dos botões ficam "Página anterior"/"Próxima página", "Previous Page"/"Next Page" e "Página
  anterior"/"Página siguiente". A troca de idioma pelo seletor, sem recarregar, troca o texto. Em escuro a
  1280 px e em claro a 390 px a paginação cabe na largura (sem rolagem horizontal da página); a 390 px o antd
  esconde o seletor de tamanho por conta própria, como antes.

- [x] **Foco volta à senha depois de uma recusa na exclusão de conta** (✅)
  Com senha errada (`400 ACCOUNT_CURRENT_PASSWORD_INVALID`), o alerta traduzido aparece, o diálogo fica aberto,
  o foco vai para `input[name="currentPassword"]` e o texto inteiro fica selecionado (`selectionStart` 0,
  `selectionEnd` igual ao tamanho). Digitar uma tecla substitui a senha. Vale enviando por Enter e clicando em
  "Excluir para sempre", nos 3 idiomas, em claro e escuro, a 1280 px e a 390 px. Outras recusas (rate limit,
  500) seguem a mesma linha de código, que não lê o `error.code`; foram cobertas só no Vitest. O sucesso
  (sessão encerrada e ida ao login) não foi refeito no navegador nesta rodada e continua coberto no Vitest.

- [x] **Foco volta à senha depois de uma recusa na troca de e-mail** (✅ para `503`; 🔒 para os demais códigos)
  Com o `503 EMAIL_NOT_CONFIGURED` do ambiente local, o diálogo fica aberto com o foco no campo de senha e o
  texto selecionado, por Enter e pelo botão "Enviar link", em pt-br, es e en. `ACCOUNT_CURRENT_PASSWORD_INVALID`
  e `USERS_AUTH_EMAIL_ALREADY_IN_USE` (P2 do plano) só chegam com o Resend configurado; ficam 🔒 no navegador e
  cobertos pelo T6, já que o `onError` não olha o código. O sucesso, que fecha o diálogo e devolve o foco ao
  botão "Trocar e-mail", também depende do Resend e fica 🔒.

- [x] **Campo de senha da exclusão completo** (✅)
  O campo tem `autocomplete="current-password"`, mostra o asterisco no rótulo ("Senha atual *", "Contraseña
  actual *") e publica `aria-required="true"`. Enviar vazio mostra "Informe a senha.", marca
  `aria-invalid="true"`, mantém o foco no campo e não chama a API.

- [x] **Personificação continua bloqueando os dois diálogos** (✅)
  Com o admin personificando um usuário comum, "Trocar e-mail", "Excluir minha conta" e "Baixar meus dados"
  ficam `disabled`, e o clique não abre nenhum diálogo.

- [x] **Regressão do foco ao abrir o diálogo de exclusão** (✅)
  Abrir por Enter ou Espaço leva o foco ao campo. O Tab percorre "Mostrar senha", "Cancelar", "Excluir para
  sempre" e volta ao campo, sem sair do diálogo. Esc e "Cancelar" fecham e devolvem o foco a "Excluir minha
  conta", e reabrir mostra o campo vazio.

- [x] **Paridade e regressão** (✅)
  A paridade de i18n passa (2/2). Os 18 casos de `accountPrivacyPanel.test.tsx` (16 antigos e 2 novos)
  passam, a suíte da `apps/app` fecha em 841/841 e o `pnpm test` da raiz em 15/15 tarefas, sem nenhum teste
  afrouxado ou desativado.
