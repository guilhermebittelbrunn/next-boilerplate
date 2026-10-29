# Critérios de Aceite (Checklist)

Marcado `[x]` o que o `/test` mediu e passou. `[ ]` é critério que falhou ou ficou sem verificação; o motivo e a
medição de cada item estão em `test/report.md`. Estado depois da rodada 2: os dois critérios reprovados na rodada 1
(Google da app e largura em telas largas) passaram na remedição.

- [x] **Sessão recusada no login por senha mostra alerta no idioma da tela**
  Com o `POST /api/auth/session` da app bloqueado, entrar por e-mail e senha em `/pt-br/sign-in`, `/en/sign-in` e
  `/es/sign-in` mostra o alerta de erro com a frase de `packages.auth.provider.session.notEstablished` do idioma da
  URL. "Could not establish session" não aparece em nenhum dos três, o toast de sucesso não aparece e o cookie
  `access-token` não é gravado. Depois do alerta a tela entra no laço conhecido (loader, navegação, volta ao login),
  que está fora do corte; tirado o bloqueio, o laço termina e a pessoa chega ao destino.

- [x] **A landing mostra o mesmo alerta traduzido**
  O login da landing (`:3001/<locale>/sign-in`) usa o mesmo `AuthProvider`. Com `:3001/api/auth/session` bloqueado,
  o alerta sai na frase do idioma da URL. A página que fica depois do alerta é a mesma de antes (corpo vazio, só
  cabeçalho e rodapé), achado conhecido que não reprova a entrega.

- [x] **Sessão recusada no Google da app mostra a mesma frase**
  No login e no cadastro, quando a gravação da sessão falha depois do popup do Google, o alerta mostra a frase
  traduzida em vez de "Could not persist session", o usuário do Firebase client é deslogado e o formulário volta.
  Vale para as duas formas de falha: resposta HTTP de erro do `POST /api/auth/session` e requisição que não chega a
  ter resposta (rede caída, bloqueio). Uma recarga da página depois da falha mostra o formulário, sem loader.

- [x] **Link por e-mail com sessão recusada continua com saída**
  Ao concluir o link com o e-mail guardado e a sessão bloqueada, o alerta sai traduzido e a tela fica em "Entrando…"
  com o link "Voltar para o login", sem recarregar em laço. Desbloqueada a rota, o clique em "Voltar para o login"
  grava a sessão (`access-token`) e leva ao destino do idioma.

- [x] **Validação só pelo Zod nos seis formulários**
  No login, no cadastro, no "Esqueci minha senha", na redefinição, no pedido de link e na conclusão do link sem
  e-mail guardado, enviar `abc`, `qa@example` ou campo vazio mostra a mensagem do dicionário no idioma da URL, com
  `aria-invalid="true"` no campo e sem o balão nativo do navegador. Senha curta e confirmação diferente no cadastro e
  na redefinição mostram as mensagens de antes. O `<form>` das seis telas tem `noValidate`.

- [x] **Cartão com recuo lateral a 375 px**
  A 375 px, em claro e em escuro, o cartão das telas de autenticação fica a pelo menos 16 px de cada borda, sem
  rolagem horizontal (`scrollWidth` igual à largura da janela). O login, que já tinha folga de 39 px, não perde nada.
  Vale para login, cadastro, "Esqueci minha senha", redefinição, pedido de link e verificação de e-mail.

- [x] **Largura do cartão em telas largas igual à de antes**
  A partir de 640 px o contêiner externo fica sem padding horizontal, como antes do diff, e o cartão das telas do
  `AuthCard` ocupa os 400 px da coluna. Login e cadastro mantêm a largura do próprio conteúdo, a mesma de antes. Entre
  376 e 639 px o recuo de 16 px continua, e o cartão fica 32 px mais estreito que a coluna, sem rolagem horizontal.

- [x] **Conta desativada lê uma frase completa em inglês**
  Uma conta desativada no Firebase Auth que tenta entrar em `/en/sign-in` vê "This account has been disabled.". Em
  pt-br e es as frases continuam "Esta conta foi desativada." e "Esta cuenta ha sido desactivada.". A pessoa continua
  na tela de login, sem cookie de sessão.

- [x] **Login normal sem regressão**
  Sem bloqueio, o login por senha leva ao mesmo destino de antes, incluindo o `?redirect=` seguro, com o toast de
  sucesso no idioma da URL e o cookie `access-token` gravado. O login com link por e-mail também conclui e grava a
  sessão.

- [x] **Cadastro com a sessão recusada mostra o alerta traduzido**
  Criar conta em `/en/sign-up` com a sessão bloqueada mostra o alerta em inglês da chave nova. O que vem depois (laço
  de recarga a partir do login) é o achado do cadastro registrado na revisão e não reprova o corte; desbloqueada a
  rota, a conta nova chega ao onboarding.

- [x] **Gates**
  `pnpm test` da raiz (com `test:emulator`), a paridade de i18n, o typecheck da `app` e o `pnpm check` dos arquivos
  de teste alterados passam.
