# Critérios de Aceite (Checklist)

Medidos no `/test` de 2026-10-19 contra o emulador do Firebase (Auth, Firestore e Storage, projeto
`demo-next-boilerplate`), com `api` e `app` em `next dev`. Cada critério termina com o status e o meio
de verificação. Legenda: ✅ verificado e correto, ❌ falha, 🔒 depende de infra externa e ninguém
consegue verificar no emulador. O detalhe de cada medição está em [`report.md`](report.md). A rodada 2, no mesmo dia,
remediu o que o revisor mudou depois da rodada 1; o placar não mudou.

- [x] **A aba Segurança lista os métodos de login**
  A seção "Métodos de login" aparece no topo da aba Segurança, com uma linha para "E-mail e senha" e
  outra para "Google", cada uma marcada como "Vinculado" ou "Não vinculado" a partir do `providerData` de
  `GET /account`. A linha do Google vinculado mostra o e-mail da conta Google. Os textos existem em pt-br,
  en e es ("Métodos de login", "Sign-in methods", "Métodos de inicio de sesión"), e a seção respeita
  light, dark e 375 px sem rolagem lateral (`scrollWidth` igual a `clientWidth` nas duas larguras
  medidas). Conta carregando não lista nada.
  Status: ✅ e2e (3 idiomas, light, dark, 375 px) + componente (`accountSignInMethodsPanel.test.tsx`).

- [x] **Conta só Google não vê o formulário de troca de senha**
  Uma conta cujo `providerData` só tem `google.com` não vê "Senha atual" nem o botão "Alterar senha".
  No lugar aparece "Definir senha", com "Nova senha", "Confirmar nova senha" e o aviso de que o Google
  vai pedir confirmação e de que todas as sessões serão encerradas. Uma conta com senha vê só o
  formulário de troca, como antes. Nas abas Perfil e Privacidade, a conta só Google vê avisos que
  mandam definir a senha na aba Segurança.
  Status: ✅ e2e (pt-br, en, es) + componente (`accountSecurityForm.test.tsx`).

- [x] **Definir senha exige o popup do Google e segue a política**
  Senha com menos de 8 caracteres mostra "A nova senha deve ter ao menos 8 caracteres." e confirmação
  diferente mostra "As senhas não conferem."; nos dois casos o popup não abre. Senha válida abre o popup
  de reautenticação. Fechar o popup não mostra alerta e não chama `POST /account/password/set`.
  Confirmado o Google, a API grava a senha, a tela mostra "Senha definida. Entre de novo para
  continuar." e leva ao login, porque todas as sessões foram encerradas. Clique duplo no botão abre um
  popup só. Escolher outra conta Google no popup mostra a tradução de `auth/user-mismatch`, e popup
  bloqueado mostra a de `auth/popup-blocked`.
  Status: ✅ e2e (popup do IdP falso do emulador) + hook (`useSignInMethodMutations.test.tsx`, criado
  nesta etapa) + componente.
  Rodada 2: o título "Definir senha" aparece como heading de nível 3 na árvore de acessibilidade, com
  o mesmo visual em light, dark, 1280 px e 375 px.

- [x] **A API só aceita prova recente de posse do Google**
  `POST /account/password/set` responde `400 ACCOUNT_REAUTH_INVALID` quando o `reauthIdToken` é de
  outro `uid`, foi emitido pelo bootstrap entre apps (provedor `custom`), não verifica, foi emitido por
  login com senha ou tem `auth_time` com mais de 300 s. Token ausente responde `400 VALIDATION_FAILED`
  (o plano dizia `ACCOUNT_REAUTH_INVALID`; o código e o teste da rota fixam `VALIDATION_FAILED`, e os
  dois são 400). Nenhum desses casos grava senha nem encerra sessão: depois das recusas a conta seguiu
  com `providerData` `[google.com]` e o token de quem chamou continuou respondendo 200.
  Status: ✅ curl contra o emulador (custom, outro uid, token inválido, ausente) + unit
  (`recentGoogleSignIn.test.ts`: senha, 301 s, `auth_time` ausente ou no futuro). O caso de 300 s não
  se mede no emulador, que zera o `auth_time` ao renovar o token.

- [x] **Definir senha numa conta que já tem é recusado**
  `POST /account/password/set` numa conta com provedor `password` responde
  `409 ACCOUNT_PASSWORD_ALREADY_SET` e não altera a senha. Senha curta responde
  `400 AUTH_PASSWORD_TOO_SHORT`; campo extra no corpo (`uid`) responde `400 VALIDATION_FAILED`. As
  mensagens dos códigos novos aparecem traduzidas nos três idiomas e diferentes da genérica.
  Status: ✅ curl + unit (`accountApiErrorCopy.test.ts`) + hook (copy de `ACCOUNT_REAUTH_INVALID` e
  `ACCOUNT_PASSWORD_ALREADY_SET` no alerta).

- [x] **Depois de definir senha, os fluxos da conta funcionam**
  A conta que definiu senha entra com e-mail e senha no mesmo `uid`, vê o formulário de troca de senha,
  o botão "Excluir minha conta" na aba Privacidade (sem o aviso do canal de privacidade) e o botão
  "Trocar e-mail" no Perfil. Excluir a conta com a senha nova conclui a exclusão: a conta some do
  emulador e a tela volta ao login.
  Status: ✅ e2e.

- [x] **Conta com senha vincula o Google**
  "Vincular conta Google" abre o popup; ao confirmar, a lista mostra o Google vinculado com o e-mail
  dele sem recarregar a página, e aparece "Conta Google vinculada.". Num navegador novo, entrar pelo
  Google com a mesma conta Google abre a conta `user@example.com`. Fechar o popup não mostra alerta e
  não registra vínculo.
  Status: ✅ e2e (vínculo e login pelo Google) + componente (popup fechado).

- [x] **Google que já pertence a outra conta é recusado sem mudar nada**
  Vincular um Google que já está ligado a outra conta mostra "Esta conta Google já está vinculada a
  outra conta.", "This Google account is already linked to another account." e "Esta cuenta de Google
  ya está vinculada a otra cuenta.", e a lista continua com o Google "Não vinculado". Popup bloqueado
  mostra "O navegador bloqueou a janela de login. Permita pop-ups e tente de novo.".
  Status: ✅ e2e (3 idiomas; popup bloqueado simulado com `window.open` devolvendo `null`) + componente.

- [x] **Desvincular quando sobra outro método**
  Com senha e Google vinculados, "Desvincular" abre um diálogo de confirmação. O do Google avisa que
  entrar com ele depois pode não abrir esta conta e que é preciso vincular de novo por esta tela. O da
  senha avisa que e-mail e senha deixam de abrir a conta, que todas as sessões são encerradas
  (inclusive a atual), que a troca de e-mail fica indisponível até definir uma senha e que a exclusão
  passa pelo canal de privacidade. Confirmado, `DELETE /account/sign-in-methods/<id>` responde 204 e a
  lista se ajusta. Desvincular o Google mantém a sessão e permite vincular de novo na mesma página.
  Desvincular a senha mostra "Senha removida. Entre de novo para continuar.", leva ao login sem alerta
  de erro, derruba as outras sessões e preserva o e-mail e o `emailVerified` da conta.
  Status: ✅ e2e (3 idiomas nos diálogos; duas sessões) + curl (revogação e e-mail) + rota e
  componente.
  Rodada 2: com o `reloadCurrentUser()` fora do desvínculo, revincular a mesma identidade Google
  (mesmo `sub`) na mesma página, com o cache do Firebase ainda listando `google.com`, mostrou "Conta
  Google vinculada." e os dois métodos, sem `auth/provider-already-linked`. Com o `accounts:lookup`
  falhando, desvincular o Google mostra só "Método de login removido.". Status mantido: ✅ e2e.

- [x] **O último método nunca sai**
  Com um método só, o botão "Desvincular" fica desabilitado e a linha diz "É o único método de login da
  conta e não pode ser removido.". A API recusa do mesmo jeito: `DELETE` do único provedor responde
  `409 ACCOUNT_SIGN_IN_METHOD_LAST`; um id que não está vinculado (`password` numa conta só Google), em
  caixa diferente (`GOOGLE.COM`) ou inválido (`a/b`) responde `404 ACCOUNT_SIGN_IN_METHOD_NOT_FOUND`.
  Durante qualquer ação da seção, os outros botões ficam desabilitados.
  Status: ✅ e2e + curl + componente ("bloqueia as outras ações enquanto um desvínculo roda").

- [x] **Registrar vínculo só confirma o que existe**
  `POST /account/sign-in-methods/linked` com um provedor que o Firebase não lista na conta responde
  `404 ACCOUNT_SIGN_IN_METHOD_NOT_FOUND` e não grava evento; corpo com id fora do formato
  (`Google.com`) responde `400 VALIDATION_FAILED`. Com o provedor presente responde 200 e grava um
  evento.
  Status: ✅ curl + e2e (evento na trilha após o vínculo) + rota.

- [x] **A trilha de auditoria registra as três mudanças**
  Definir senha grava `account.password.set` com o e-mail como autor e alvo, sem campos alterados.
  Vincular grava `account.signInMethod.link` e desvincular grava `account.signInMethod.unlink`, ambos
  com o `providerId` (`google.com` ou `password`) em "Campos alterados". Em `/admin/audit` os rótulos
  aparecem como "Senha definida", "Método de login vinculado", "Método de login removido" (pt-br),
  "Password set", "Sign-in method linked", "Sign-in method removed" (en) e "Contraseña definida",
  "Método de inicio de sesión vinculado", "Método de inicio de sesión quitado" (es). A exportação de
  dados do titular (`GET /account/export`) inclui os eventos.
  Status: ✅ e2e + curl.

- [x] **Personificação não altera métodos de login**
  Um admin personificando o usuário vê a lista de métodos, mas os botões da seção ficam desabilitados,
  inclusive numa conta com dois métodos, e o botão de definir senha também. Chamadas diretas às três
  rotas (e ao `DELETE` dos dois provedores) sob personificação respondem
  `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`. O `providerData` da conta não muda.
  Status: ✅ e2e + curl com os cabeçalhos `x-*` de personificação.

- [ ] **Projeto sem Google configurado degrada sem quebrar**
  Com o provedor Google desligado ou o domínio fora da lista, a lista aparece e desvincular funciona.
  Vincular e definir senha mostram a mensagem traduzida do Firebase (`auth/operation-not-allowed`,
  `auth/unauthorized-domain`) e nenhuma rota responde 500. No emulador o provedor está sempre ligado.
  Status: 🔒 depende de projeto Firebase real. A tradução dos dois códigos tem teste de componente.

- [ ] **Projeto real: popup do Google e "uma conta por e-mail"**
  O popup do Google de verdade abre num domínio autorizado (produção ou preview), e o vínculo respeita a
  configuração "User account linking" do projeto, inclusive o Google como provedor confiável que
  sobrescreve uma senha não verificada.
  Status: 🔒 depende de projeto Firebase real e do pré-requisito manual descrito no `docs/FORKING.md`.

- [ ] **A conta não fica sem e-mail se a devolução do endereço falhar**
  Se a segunda chamada ao Firebase (a que devolve o e-mail depois de desvincular a senha) falhar, a
  rota responde `500 ACCOUNT_UPDATE_FAILED` e registra o desvínculo. A tela, nesse caso, mostra a copy
  genérica, e a recuperação passa por "Definir senha".
  Status: 🔒 sem injeção de falha no Admin SDK não dá para reproduzir pelo produto. O contrato da rota
  está em `accountSignInMethodsRoute.test.ts` ("registra o desvínculo da senha mesmo quando a devolução
  do e-mail falha"); a decisão de produto continua aberta no `review/review.md`.
