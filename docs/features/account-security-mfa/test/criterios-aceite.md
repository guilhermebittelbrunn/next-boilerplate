# Critérios de Aceite (Checklist)

Base: seção 10 do `analyze/plan.md`, mais os itens da lista "Verificar no `/test`" do `review/review.md`.
Separei do critério de layout o contraste da mensagem de erro no dark, porque a medida deu resultados
diferentes para os dois. Também acrescentei critérios próprios para duplo clique, CORS, autorização da
criação pelo admin e falha do login depois da conta criada. O que só infraestrutura externa comprova ficou
no fim, em critérios separados. O status de cada item e o meio de prova estão em `test/report.md`.

Legenda do status: ✅ verificado e correto · ❌ falha · 🔒 sem como verificar sem infraestrutura externa.

- [x] **Cadastro na `apps/app` recusa senha com menos de 8 caracteres e cria a conta com 8** ✅
  Com 7 caracteres (inclusive 7 espaços, que a API recusa com o mesmo código), o formulário mostra "A senha
  deve ter pelo menos 8 caracteres" no idioma da rota, nos dois campos de senha, e nenhuma requisição sai
  para a API. Com senhas diferentes aparece "As senhas não coincidem". Com exatamente 8 caracteres,
  `POST /auth/sign-up` responde 201, o login acontece em seguida, o cookie de sessão é criado, a pessoa cai
  em `/{locale}/onboarding` no passo 1 de 2 e o app chama `POST /auth/email-verification/send`.

- [x] **Duplo clique no cadastro não cria duas contas nem dispara dois logins** ✅
  Os botões "Cadastrar" e "Continuar com Google" da `apps/app` ficam desabilitados desde o envio até o fim
  do login que vem depois da criação, sem nenhum instante habilitado entre as duas etapas. Na `apps/web`, o
  botão de envio fica desabilitado enquanto a criação ou o login estão pendentes. Um duplo clique real no
  navegador gera um único `POST /auth/sign-up`. Se duas requisições chegarem à API com o mesmo e-mail, a
  segunda recebe `400 USERS_AUTH_EMAIL_ALREADY_IN_USE` e nenhuma conta duplicada nasce.

- [x] **Cadastro na `apps/web` recusa senha curta com mensagens no idioma da rota** ✅
  As mensagens de e-mail inválido, senha curta e senhas diferentes vêm do dicionário e mudam em `/en/sign-up`
  e `/es/sign-up`. Erro da API aparece por toast traduzido, e e-mail repetido mostra "Este correo ya está en
  uso." em `/es`. Com 8 caracteres a conta é criada, a pessoa entra na web já autenticada e, pelo "Go to
  panel", chega ao onboarding da `apps/app`. A web não pede e-mail de verificação.

- [x] **O cadastro passa pela API e o caminho direto ao Firebase saiu do código** ✅
  O cadastro bem-sucedido gera `POST /auth/sign-up` com `201 { "data": { "created": true } }`, seguido do
  login por e-mail e senha. `createUserWithEmailAndPassword` não aparece em `apps` nem em `packages`, e
  `useAuth()` não expõe mais `signUp`. O perfil no Firestore nasce na própria rota, com `type = "common"` e
  `onboarding.step = "profile"`.

- [x] **A API recusa senha nova curta em todas as rotas que definem senha** ✅
  `POST /auth/sign-up`, `POST /auth/password/reset`, `POST /account/password` e `POST /users` respondem
  `400 { "error": { "code": "AUTH_PASSWORD_TOO_SHORT" } }` para senha nova de 7 caracteres, mesmo com o
  front contornado. Na redefinição, o `oobCode` continua válido depois da recusa. Senha acima de 1024
  caracteres responde `400 VALIDATION_FAILED`, e exatamente 1024 é aceita no cadastro. E-mail inválido e
  JSON quebrado respondem `400 VALIDATION_FAILED`.

- [x] **Quem já tem senha de 6 caracteres continua usando a conta** ✅
  O login da `apps/app` e o da `apps/web` aceitam senha de 6. A troca de senha aceita a senha atual de 6, e
  a exclusão de conta aceita a confirmação com 6. Senha atual de 5 mostra "A senha deve ter ao menos 6
  caracteres." e, na API, responde `VALIDATION_FAILED`, nunca a mensagem de 8.

- [x] **Troca de senha distingue senha atual de senha nova** ✅
  Na aba de segurança da conta, a senha atual usa a mensagem de mínimo 6 e a nova usa "A nova senha deve ter
  ao menos 8 caracteres.", "The new password must have at least 8 characters." e "La nueva contraseña debe
  tener al menos 8 caracteres.". Senhas diferentes mostram "As senhas não conferem.". Com a atual de 6 e a
  nova de 8, a troca responde 200, mostra "Senha alterada. Entre novamente para continuar." e leva ao login.

- [x] **Redefinição e criação pelo admin seguem a política** ✅
  A tela de redefinição recusa 7 caracteres sem chamar a API e aceita 8 (`POST /auth/password/reset` 200,
  tela "Senha alterada"). O formulário de criação de usuário do admin recusa 7 com "A senha deve ter pelo
  menos 8 caracteres." sem chamar a API e cria com 8 (`POST /users` 201, volta para a lista).

- [x] **Criação de usuário continua restrita ao admin** ✅
  `POST /users` sem credencial responde `401 AUTH_INVALID_TOKEN`, e com um perfil comum responde
  `403 ADMIN_FORBIDDEN`, antes da validação da senha. A política de senha não abre nenhum caminho novo para
  quem não é admin.

- [x] **Erros da API chegam traduzidos** ✅
  `AUTH_PASSWORD_TOO_SHORT` tem copy nos 3 idiomas em `apiErrors` e chega traduzido pelo
  `handleClientError`. E-mail repetido no cadastro mostra "Este e-mail já está em uso." na app e o
  equivalente em espanhol na web, por toast. Falha do Admin SDK fora do mapa responde
  `500 USERS_AUTH_SIGN_UP_FAILED`, sem stack trace, e o log registra `requestId` e `reason`, sem e-mail.

- [x] **Colar senha e usar gerenciador de senhas continuam funcionando** ✅
  Nenhum campo de senha tocado (cadastro da app e da web, troca de senha) cancela o evento de colar. Não há
  CAPTCHA nem regra de composição: uma senha de 8 letras minúsculas é aceita em todos os fluxos.

- [x] **Uma fonte só para a regra** ✅
  Nenhuma declaração `MIN_PASSWORD_LENGTH =` sobrou em `apps` ou `packages`. `PASSWORD_MIN_LENGTH`,
  `PASSWORD_MAX_LENGTH` e `EXISTING_PASSWORD_MIN_LENGTH` são declaradas só em
  `packages/shared/utils/helpers/passwordPolicy.ts`, e o teste de copy falha se a constante mudar sem a
  mensagem acompanhar.

- [x] **CORS da `apps/web` para a rota de cadastro** ✅
  O preflight de `http://localhost:3001` para `POST http://localhost:3002/auth/sign-up` responde 204 com
  `access-control-allow-origin: http://localhost:3001`. Origem fora da lista recebe 204 sem cabeçalho de
  permissão. O cadastro real pela web lê a resposta 201 da API e segue para o login.

- [x] **Falha no login logo depois da criação deixa a pessoa com um caminho pelo login** ✅
  Se o login falha depois do 201, a pessoa vê o toast do erro (com a rede cortada, "Erro de conexão.
  Verifique sua internet."), continua na tela de cadastro e o botão volta a ficar habilitado. Reenviar o
  formulário responde "Este e-mail já está em uso.", e a conta criada entra normalmente pelo login. O
  comportamento segue a opção (a) registrada no `review/review.md`.

- [x] **Layout da mensagem de erro em light, dark e 375 px** ✅
  A mensagem de erro inline no cadastro (app e web) e na troca de senha quebra linha dentro do card a
  375 px nos 3 idiomas, sem rolagem horizontal (`scrollWidth` 360 para 375 de viewport). Em light, a cor do
  erro tem contraste de 4,76:1 sobre o fundo branco.

- [ ] **Mensagem de erro legível no dark** ❌
  No dark, o texto do erro usa `--destructive` e fica com contraste de 1,97:1 sobre o fundo, abaixo dos
  4,5:1 do WCAG AA. O defeito é anterior a esta fatia, não vem do diff e já está no `specs/BACKLOG.md`
  (linha 396), então não bloqueia a entrega.

- [x] **Sem regressão no restante do fluxo de entrada** ✅
  Logout leva ao login, e rota protegida volta a redirecionar para `/sign-in`. O onboarding e o pedido do
  e-mail de verificação seguem funcionando. `pnpm test` passa, e o E2E `apps/e2e/tests/signUp.spec.ts`
  continua verde com `demo1234`. O login com Google não foi percorrido no navegador; o código dele não
  mudou nesta fatia.

- [ ] **O REST direto do Identity Toolkit recusa senha curta** 🔒
  Com a chave pública, o endpoint REST de cadastro do Firebase ainda aceita 6 ou 7 caracteres (o próprio
  emulador criou as contas antigas assim). Fechar esse caminho exige a password policy do Identity
  Platform, declarada em `docs/PRE-PRODUCTION.md`. É caminho residual esperado, não defeito da entrega.

- [ ] **Limite de requisições do cadastro no Arcjet** 🔒
  Sem `ARCJET_KEY`, `checkRateLimit` não limita nada e o cadastro fica sem trava de volume. O limite real de
  20 requisições por 60 s por IP só pode ser observado com uma chave Arcjet.

- [ ] **E-mail de verificação entregue de fato** 🔒
  O app pede o envio, mas sem `RESEND_TOKEN` a API responde `503 EMAIL_NOT_CONFIGURED`. A entrega exige
  Resend configurado com remetente verificado.
