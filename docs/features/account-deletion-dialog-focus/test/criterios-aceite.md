# Critérios de Aceite (Checklist)

Status medido no `/test` de 2026-10-08: ✅ verificado e correto, ❌ falha, 🔒 não verificável sem infra
externa. O meio de cada verificação está no `test/report.md`.

- [x] **Abrir o diálogo leva o foco ao campo de senha** (✅)
  Na aba Privacidade, ativar "Excluir minha conta" pelo clique, pelo Enter ou pelo Espaço abre o diálogo com o
  foco no campo "Senha atual" (`input[name="currentPassword"]` dentro de `[role=alertdialog]`). O foco não fica
  no gatilho atrás do overlay nem no `body`. Vale nos três idiomas. Com a conta ainda carregando (`account`
  indefinido) o diálogo também aparece; esse estado só foi coberto no Vitest, porque no navegador ele dura
  menos que uma interação.

- [x] **O Tab fica preso no diálogo** (✅)
  Com o diálogo aberto, o Tab percorre o campo de senha, "Mostrar senha", "Cancelar" e "Excluir para sempre",
  nessa ordem, e volta ao campo depois do último. O Shift+Tab faz o caminho inverso. Nenhum elemento da página
  atrás do overlay recebe foco, em desktop (1280 px) e a 390 px.

- [x] **Esc e "Cancelar" devolvem o foco ao gatilho** (✅)
  Esc ou "Cancelar" (por clique, por Enter ou por Espaço) fecham o diálogo sem disparar a exclusão, e o foco
  volta ao botão "Excluir minha conta". O clique no overlay continua sem fechar o diálogo, como o Radix define
  para `alertdialog`. Nesse clique o foco sai do campo e vai para o `body`; o próximo Tab o traz de volta para
  dentro do diálogo. É comportamento do `FocusScope` do Radix, não desta mudança.

- [x] **Fechar o diálogo limpa a senha e os erros** (✅)
  Depois de digitar uma senha e cancelar, ou de ver a mensagem de campo obrigatório e fechar pelo Esc, abrir o
  diálogo de novo mostra o campo vazio, sem mensagem e com `aria-invalid="false"`. O botão de mostrar senha
  volta ao estado oculto ("Mostrar senha", campo `type="password"`). A senha não reaparece nem depois de uma
  recusa da API seguida de Esc.

- [x] **O fluxo de exclusão continua igual** (✅)
  A exclusão só sai com a senha preenchida. O envio com o campo vazio mostra "Informe a senha." e não faz
  requisição. Senha errada recebe `400` da API e mostra o alerta de `ACCOUNT_CURRENT_PASSWORD_INVALID` no idioma
  ativo ("A senha atual está incorreta.", "The current password is wrong.", "La contraseña actual es
  incorrecta."), com o diálogo aberto e nenhuma exclusão. A senha certa exclui a conta, responde `200` e leva ao
  login. Os dez casos antigos de `accountPrivacyPanel.test.tsx` passam sem alteração.

- [x] **Personificação e conta sem senha não mudam** (✅ personificação; conta só Google 🔒 no navegador, ✅ no Vitest)
  Durante a personificação o gatilho fica `disabled`, não recebe foco e o diálogo não abre por clique, Enter
  ou Espaço. Conta que só entra pelo Google vê o bloco do canal de privacidade, sem gatilho e sem diálogo; o
  emulador não tinha conta assim, então esse caso fica com o teste Vitest
  "aponta o canal de privacidade para a conta que só entra pelo Google".

- [x] **Teste que falha no código anterior** (✅)
  Com o `AccountPrivacyPanel.tsx` de `HEAD`, o arquivo de teste dá 6 falhas e 10 aprovações. Sem a linha do
  `onOpenAutoFocus`, também 6 e 10. Sem o `form.reset()`, caem só os 2 casos de limpeza (2 falhas, 14
  aprovações). Com o arquivo atual, 16 de 16 passam.

- [x] **Tema, idioma e largura** (✅)
  O diálogo aparece inteiro e legível em claro e escuro, em desktop e a 390 px (caixa de 16 a 374 px, sem
  rolagem horizontal), com os textos em pt-br, en e es. O anel de foco do campo de senha aparece nos dois temas
  como sombra de 3 px (`:focus-visible` verdadeiro).

- [x] **Gates verdes em build de produção** (✅, com ressalva na API)
  A suíte do app (832 de 832) e o `pnpm test` da raiz passam. O roteiro rodou com o app em `next build` +
  `next start` contra o emulador com o seed. A API rodou em `next dev`, porque o build de produção dela exige
  credencial do Firebase Admin e recusa o ambiente do emulador, limitação já registrada no
  `docs/PRE-PRODUCTION.md`. O diff não toca a API.

- [x] **Foco depois de uma recusa da API (observação, não reprova)**
  Depois de `ACCOUNT_CURRENT_PASSWORD_INVALID` o foco fica no próprio contêiner do diálogo
  (`[role=alertdialog]`, `tabindex="-1"`), dentro do diálogo, e não no campo de senha. O campo mantém a senha
  digitada. Para corrigir, o usuário precisa de um Tab. Vale também para o diálogo de troca de e-mail e fica
  como achado para o backlog.
