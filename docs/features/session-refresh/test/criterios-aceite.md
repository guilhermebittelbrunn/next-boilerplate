# Critérios de Aceite (Checklist)

Escopo: renovação deslizante da sessão com teto absoluto (`packages/auth`, rotas de sessão da `apps/app` e
da `apps/web`, copy nos três idiomas). O status de cada item está em [`report.md`](report.md).

- [ ] **A sessão em uso atravessa o prazo antigo de expiração**
  Com a aba aberta e alguém navegando, o cookie é regravado depois de metade da vida configurada e a
  sessão continua válida além do instante em que o cookie original expiraria. O cookie novo carrega um
  `iat` novo e preserva o instante da autenticação original, de modo que o teto absoluto não desliza
  junto. Quem parou de usar não ganha nada: sem requisição, não há renovação.

- [ ] **A renovação não dispara em toda navegação**
  Com um cookie recém-emitido, `POST /api/auth/session/refresh` responde 200 `{"refreshed": false}` sem
  chamar `verifySessionCookie(cookie, true)` nem `createSessionCookie`. Navegar entre páginas não produz
  gravação de cookie nem chamada ao provedor. O limiar é metade da vida do cookie, então uma sessão de
  cinco dias renova, no máximo, uma vez a cada 2,5 dias.

- [ ] **O teto absoluto derruba quem está ativo**
  Passado o prazo contado da autenticação original, a renovação responde 401
  `{"error":{"code":"AUTH_SESSION_EXPIRED"}}`, limpa o cookie (`Set-Cookie` com `Max-Age=0`) e o cliente
  leva a pessoa para `/{locale}/sign-in?redirect={caminho onde estava}`. O caminho da página é preservado;
  a query string dela não, porque o proxy a descarta antes de redirecionar. A recusa vale mesmo para quem
  está no meio de uma navegação.

- [ ] **A janela conta da autenticação original, não da última renovação**
  Uma sessão que renovou com sucesso no meio do caminho é recusada assim que o teto estoura, e não
  ganha um novo prazo a partir da renovação. Sem isso a renovação produz sessão eterna, que é o defeito
  que o teto existe para evitar.

- [ ] **O teto não é contornável pelo `POST /api/auth/session`**
  Chamar a rota de login com um ID token cujo `auth_time` já passou do teto responde 401
  `AUTH_SESSION_EXPIRED` e limpa o cookie, em vez de gravar um cookie novo. O teto é imposto dentro de
  `mintSessionCookie`, que é o único ponto de gravação do cookie no repositório, e por isso nenhum
  chamador passa por cima dele.

- [ ] **A recusa definitiva não deixa a tela de login inalcançável**
  Quem volta depois do teto estourado chega sem cookie: a renovação responde `AUTH_NO_SESSION`, o cliente
  tenta gravar o cookie e recebe 401 `AUTH_SESSION_EXPIRED`. Nesse ponto o provider desloga o usuário do
  Firebase no cliente e o formulário de login renderiza. O que não pode acontecer: navegar assim mesmo,
  porque o proxy devolve a navegação para o sign-in e o resultado é laço infinito com spinner permanente e
  formulário inacessível.

- [ ] **A retomada do destino depois do estouro**
  Depois de autenticar de novo, a pessoa volta para a página onde estava, e não para a home. Vale tanto
  para quem foi interrompido navegando quanto para quem voltou depois de abandonar a sessão, já que nos
  dois casos o destino original está no `?redirect=` posto pelo proxy. Quando a recusa chega com a tela de
  login já aberta, o destino herdado da URL prevalece sobre o caminho atual. Destino de outra origem é
  descartado pelo mesmo guard de open-redirect que o login já usava, e nesse caso a navegação vai para o
  sign-in sem query.

- [ ] **O bootstrap de SSO não reinicia o teto**
  Autenticar em um dos front-ends e abrir o outro adota a sessão pelo custom token, e o teto continua
  contando do login original. `signInWithCustomToken` reescreve o `auth_time`, então o instante original
  viaja na claim `sessionAuthTime`. Com o teto já estourado, `POST /api/auth/custom-token` recusa com 401
  `AUTH_SESSION_EXPIRED` e limpa o cookie em vez de emitir o token.

- [ ] **A renovação respeita a revogação**
  Depois de `DELETE /api/auth/session`, de conta desabilitada ou de conta excluída, a renovação passa por
  `verifySessionCookie(cookie, true)`, recusa com 401 `AUTH_NO_SESSION` e limpa o cookie em vez de
  ressuscitar a sessão. O cookie morto não fica no navegador apontando para nada.

- [ ] **Falhar em renovar não desloga ninguém**
  Erro de rede, 403 ou 500 na rota de renovação deixam a navegação seguir, sem alerta e sem saída da
  sessão. Só 401 `AUTH_SESSION_EXPIRED` produz mensagem e logout; 401 `AUTH_NO_SESSION` faz o cliente cair
  na gravação do cookie, que é o caminho normal do primeiro login.

- [ ] **A rota recusa origem cruzada e corpo inválido**
  `Origin` de outro host responde 403 `AUTH_FORBIDDEN_ORIGIN`; corpo que não é JSON ou sem `idToken`
  string responde 400 `AUTH_MISSING_TOKEN`. Os dois saem antes de qualquer chamada ao Firebase e sem tocar
  no cookie.

- [ ] **ID token recusado não derruba uma sessão válida**
  Chamar a renovação com um `idToken` inválido depois do limiar responde 401 `AUTH_INVALID_TOKEN` e
  **mantém** o cookie. Quem está errado é o token do corpo, não a sessão: limpar o cookie aqui
  transformaria um erro do cliente em logout.

- [ ] **Sem cookie, a renovação não estabelece sessão**
  Requisição sem o cookie `access-token` responde 401 `AUTH_NO_SESSION` sem chamar o provedor. Estabelecer
  sessão é papel do `POST /api/auth/session`; a renovação só desliza uma sessão que já existe.

- [ ] **Modo degradado sem a variável de ambiente**
  Sem `SESSION_ABSOLUTE_MAX_AGE_DAYS` no ambiente, e com ela como `""`, a aplicação sobe, o build passa e a
  renovação funciona com o padrão de 30 dias. Nenhuma rota responde 500 por causa da variável ausente.

- [ ] **Valores-limite da variável de ambiente**
  `"0"`, `"-1"` e `"abc"` caem no padrão de 30 dias. `"400"` é grampeado em 90 dias. `"1"` com cookie de 5
  dias vira 5 dias, porque o piso do teto é a vida do cookie: um teto menor que ela só produziria cookies
  que a renovação seguinte recusa. Fração de dia acima da vida do cookie é aceita como está.

- [ ] **Dois disparos concorrentes produzem um aviso só**
  Duas chamadas simultâneas do listener de token recebendo a mesma recusa mostram um único alerta e fazem
  uma única navegação para o sign-in. Sem isso, o StrictMode em desenvolvimento e duas abas em produção
  duplicam o toast.

- [ ] **A autorização não muda**
  Usuário comum, admin, admin personificando e não autenticado continuam vendo o que viam antes. A sessão
  é transversal ao painel: os guards do servidor, o proxy e a resolução de papel não mudam de
  comportamento por causa da renovação. Rota autenticada acessada sem sessão continua indo para o sign-in.

- [ ] **A posse dos recursos continua valendo**
  Abrir, editar ou excluir um registro de outro usuário continua respondendo 404. A renovação não toca em
  guard nem em repositório, então a checagem de posse na `apps/api` segue idêntica.

- [ ] **O modo de produto não altera o comportamento**
  `subscription` e `simple` usam o mesmo cookie compartilhado e a mesma rota de renovação. Nenhum caminho
  da feature ramifica por modo, e um fork que não use assinatura não precisa configurar nada.

- [ ] **A mensagem de sessão encerrada existe nos três idiomas**
  `packages.auth.provider.session.expired` e `apiErrors.AUTH_SESSION_EXPIRED` estão em pt-br, en e es, com
  o teste de paridade verde. O alerta mostrado ao usuário vem do dictionary, não de string solta em JSX, e
  nenhum stack trace vira copy.

- [ ] **O alerta e a tela de login são legíveis em light, dark e mobile**
  O toast de sessão expirada e o formulário de login ficam legíveis nos dois temas e em viewport de
  celular, sem corte de texto nem quebra de layout.

- [ ] **Login, SSO e logout continuam funcionando**
  Login com e-mail e senha, login com Google, adoção da sessão ao abrir o segundo front-end e logout
  encerrando os dois. É o raio de regressão da mudança: a renovação entrou no mesmo arquivo que faz o
  login funcionar.
