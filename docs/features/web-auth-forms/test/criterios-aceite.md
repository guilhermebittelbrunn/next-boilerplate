# Critérios de Aceite (Checklist)

Formulários de login e cadastro da landing (`apps/web`). Status medido no `/test` de 2026-10-21:
✅ verificado e correto · ❌ falha · 🔒 depende de infra externa. Os detalhes de cada medição estão em
[`report.md`](report.md).

- [x] ✅ **Login pela tela da landing leva à home do idioma**
  Em `/pt-br/sign-in`, `/en/sign-in` e `/es/sign-in`, sem sessão, entrar com e-mail e senha válidos leva a
  `/pt-br`, `/en` e `/es`, com o header mostrando o link do painel e o botão de sair no idioma da URL. O botão do
  Google faz o mesmo caminho pelo popup do emulador. Senha errada mostra o toast traduzido ("Senha incorreta." em
  pt-br) e mantém a pessoa em `/<locale>/sign-in`.

- [x] ✅ **Visitante já autenticado não vê página vazia no login**
  Com sessão ativa, abrir `/<locale>/sign-in` direto na barra leva a `/<locale>` nos três idiomas. O caso inclui
  quem entrou só pela app (`:3000`) e depois abre o login da landing: a sessão chega pelo cookie compartilhado e
  pelo bootstrap por custom token, e o formulário manda para `/<locale>` do mesmo jeito. Um `?redirect=` na URL
  nesse caso é ignorado e o destino continua `/<locale>`, como o plano decidiu.

- [x] ✅ **O destino em `?redirect=` continua valendo depois do login**
  Sem sessão, entrar a partir de `/pt-br/sign-in?redirect=%2Fpt-br%2Fcontact` leva a `/pt-br/contact` em todas as
  tentativas, com e-mail e senha e com o Google. O efeito novo do formulário não pode trocar a URL antes de o
  provider ler o `?redirect=`: o histórico do navegador registra uma única navegação, direto para o destino. Um
  `?redirect=` inseguro (`//evil.com`) ou sem idioma (`/contact`) cai em `/<locale>`, como já fazia.

- [x] ✅ **Fim de sessão leva ao login com a origem e volta para ela**
  Quando a renovação do cookie responde `401 AUTH_SESSION_REVOKED` numa página interna, o provider desloga e leva
  a `/<locale>/sign-in?redirect=<origem>` com o formulário visível. O efeito do login não pode navegar nesse
  intervalo. Ao entrar de novo, a pessoa volta para a página de origem, e não para a home.

- [x] ✅ **Cadastro da landing pede o e-mail de verificação**
  Criar conta por e-mail e senha gera um `POST /auth/email-verification/send` depois do login automático, com
  `Authorization: Bearer` contendo o ID token da conta recém-criada e o `locale` da URL no corpo
  (`{"locale":"pt-br"}`, `{"locale":"en"}`, `{"locale":"es"}`). O cadastro com Google não faz esse pedido, porque o
  provedor já atesta o endereço.

- [x] ✅ **Falha no pedido de verificação não estraga o cadastro**
  Sem Resend, a API responde `503` com `EMAIL_NOT_CONFIGURED`, e a pessoa termina em `/<locale>` logada, só com o
  toast de sucesso do login, sem toast de erro e sem erro novo no console. Qualquer outra rejeição do pedido
  (`EMAIL_SEND_FAILED`, `401 AUTH_INVALID_TOKEN`, falha de rede) ou do `getIdToken` cai no mesmo descarte
  silencioso, porque a conta já existe nesse ponto.

- [x] ✅ **Erro na criação da conta continua como antes**
  E-mail já em uso devolve `400 USERS_AUTH_EMAIL_ALREADY_IN_USE`, mostra a mensagem traduzida do `error.code`
  ("Este e-mail já está em uso.") e não faz login nem pede verificação. Duplo clique no botão de criar conta gera
  uma única chamada a `POST /auth/sign-up`, porque o botão fica desabilitado enquanto a criação ou o login estão
  pendentes.

- [x] ✅ **Validação só pelo Zod, traduzida**
  Nos dois formulários e nos três idiomas, enviar `abc`, `qa@example` ou campo vazio no e-mail mostra a mensagem do
  dicionário no idioma da URL ("Email inválido", "Invalid email", "Email no válido"), sem o balão nativo do
  navegador e sem chamada à API. Senha curta mostra o mínimo de cada formulário: 6 caracteres no login, 8 no
  cadastro.

- [x] ✅ **Cartão com recuo lateral no celular e centralizado em telas largas**
  A 375 px, nos temas claro e escuro, os cartões de login e cadastro ficam a 16 px de cada borda, sem rolagem
  horizontal. A partir de 768 px o cartão continua centralizado com 448 px de largura (`max-w-md`), também nos dois
  temas.

- [x] ✅ **Gates**
  `pnpm check`, `pnpm --filter web typecheck` e `pnpm test` da raiz passam. Nenhum `console` cru novo em
  `apps/web`, e o console do navegador não mostra erro novo nos fluxos acima.

- [ ] 🔒 **Entrega real do e-mail de verificação**
  Com `RESEND_TOKEN`, `RESEND_FROM`, `NEXT_PUBLIC_APP_URL` e `FIREBASE_WEB_API_KEY` configurados na `apps/api`, a
  conta criada na landing recebe o e-mail de verificação no idioma do cadastro e o link confirma o endereço. Sem
  essa infra, a prova possível é o pedido e o `503` do critério anterior.
