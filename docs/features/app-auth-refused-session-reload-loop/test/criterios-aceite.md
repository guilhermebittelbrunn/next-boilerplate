# Critérios de Aceite (Checklist)

Laço de recarga com a sessão recusada no login e no cadastro da `apps/app`, e tela vazia no login da `apps/web`.
O status de cada item, com o meio de verificação e o número medido, está em [`report.md`](report.md).

- [x] **Login da app não recarrega em laço quando a gravação da sessão falha por rede**
  Com o `POST /api/auth/session` rejeitado antes de chegar ao servidor, o login por e-mail e senha mostra o alerta
  `packages.auth.provider.session.notEstablished` e devolve o formulário com o botão "Entrar" ativo. A URL continua em
  `/<locale>/sign-in` (com o `?redirect=` que já tinha), o cliente Firebase fica sem usuário e não há nenhuma carga de
  página nova nos 6 s seguintes ao clique. Antes da mudança eram 16 a 18 recargas em 5 s.

- [x] **Login da app não recarrega em laço com 403, 401 ou 5xx**
  Com a rota respondendo 403 `AUTH_FORBIDDEN_ORIGIN`, 401 `AUTH_INVALID_TOKEN` ou 500, o comportamento é o mesmo do
  critério anterior. O 403 é o caso de um proxy que reescreve `Host` ou de um cliente sem `Origin` nem
  `Sec-Fetch-Site: same-origin`; antes ele entrava em laço porque o freio só reconhecia 401.

- [x] **Cadastro da app não recarrega em laço quando a sessão é recusada**
  Criada a conta, se a gravação da sessão falha (rede, 403 ou 500), o cadastro mostra o alerta e volta ao formulário de
  cadastro, sem passar pelo login nem recarregar. A conta continua criada no Firebase: um novo envio com o mesmo e-mail
  recebe "Este e-mail já está em uso", traduzido.

- [x] **Sessão persistida sem cookie mostra o formulário numa carga só**
  Com o usuário restaurado pelo Firebase e sem o cookie `access-token`, abrir `/<locale>/sign-in` ou
  `/<locale>/sign-up` tenta gravar a sessão. Com qualquer resposta não-2xx ou falha de rede, o cliente é deslogado e o
  formulário aparece, sem alerta e sem recarga. Antes, o 401 `AUTH_INVALID_TOKEN` deixava o `FullScreenLoader` na tela
  para sempre. Com a gravação aceita, a tela navega para o painel com uma única recarga.

- [x] **Navegação pós-login só acontece com o cookie gravado**
  O hook dos formulários da app chama `window.location.replace` só quando o `POST` responde 2xx, e o provider só chama
  `router.push` depois de `syncSessionCookie` resolver. Nenhuma recusa resulta no alerta de sucesso
  (`packages.auth.provider.onSuccess`).

- [x] **Uma falha ao resolver o destino não vira "sessão não estabelecida"**
  Se `resolveDefaultPostLoginPath` lançar depois de o cookie ser gravado, o provider navega para `redirectPath()`
  (`/<locale>` por padrão) e não mostra o alerta de sessão recusada. O alerta de sucesso aparece normalmente.

- [x] **Caminho feliz igual ao anterior**
  Com a sessão aceita, login e cadastro da app navegam para o mesmo destino de antes (`?redirect=` seguro, depois
  admin ou comum por `resolveAppPostLoginPath`), com uma única recarga. O login da landing navega para `/<locale>`, e a
  sessão vale nas duas origens (SSO web e app, nos dois sentidos).

- [x] **Login da landing volta ao formulário depois da recusa**
  Na `apps/web`, com a sessão recusada, a pessoa vê o alerta e o formulário de login com o botão de enviar ativo. Antes,
  o `<main>` ficava vazio até recarregar. Depois de uma tentativa recusada, um login feito em outra aba leva esta aba
  para `/<locale>`, porque o `signInStartedHereRef` volta a `false` quando `user` some.

- [x] **Link por e-mail com sessão recusada**
  A conclusão do link mostra o alerta e a tela "Entrando…" com "Voltar para o login". O cliente fica deslogado, então
  voltar ao login mostra o formulário numa carga só, sem laço.

- [x] **Mensagem nos três idiomas, tema e celular**
  O alerta `notEstablished` aparece em pt-br, en e es com o texto do dicionário, legível em claro e escuro e a 375 px,
  por cima do formulário, e some sozinho em 3 s sem cobrir o botão de enviar de forma permanente.

- [x] **Duplo envio com a sessão recusada**
  Clicar duas vezes em "Entrar" com a sessão recusada não produz alerta de sucesso nem navegação. Enquanto o login está
  pendente, o formulário sai de cena (desabilitado e depois trocado pelo loader) e volta com o botão ativo depois da
  recusa.

- [x] **Corrida em que uma das gravações falha deixa o painel funcional ou o formulário, nunca um laço**
  No login novo, o provider grava a sessão duas vezes (`applySignedInUser` e `onAuthSuccess`) e o hook dos formulários
  fica parado enquanto o login está pendente. Se só a gravação do `onAuthSuccess` passa, a pessoa entra no painel por
  carga completa, continua logada depois de recarregar e vê os dados que dependem do token no cliente (contador de
  notificações, consultas de `useAuthorizedQuery`) sem recarregar. Se a do `onAuthSuccess` falha, vê o alerta e o
  formulário, numa carga só. O mesmo vale para o login por link de e-mail e pelo Google da app.

- [x] **Corrida inversa não gera laço**
  Se a gravação do hook passa e a do provider falha, o provider desloga e mostra o alerta, e a pessoa fica no formulário
  com um cookie válido. Recarregar a página leva ao painel, porque o proxy manda rota pública com cookie válido direto
  ao destino.
