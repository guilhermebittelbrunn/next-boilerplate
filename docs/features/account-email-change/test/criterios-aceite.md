# Critérios de Aceite (Checklist)

Troca de e-mail do titular. Os itens marcados foram medidos no `/test` de 2026-09-29 (o do foco, na
segunda rodada, depois da correção); o status de cada um, o meio usado e o valor observado estão em
`report.md`. O item desmarcado depende de infra externa.

- [x] **Pedido de troca na aba Perfil**
  O titular de uma conta com senha vê o e-mail atual num campo desabilitado e, logo abaixo, o botão "Trocar e-mail" ("Change email", "Cambiar correo"). A frase "A troca de e-mail estará disponível em breve" não aparece em nenhum idioma. O diálogo pede o novo e-mail e a senha atual; com a Resend configurada, a API responde `200 { requested: true }`, o app mostra o toast de link enviado e fecha o diálogo. Confirmar o diálogo não dispara o "Salvar" do perfil, porque o diálogo fica fora do `<form>` do perfil.

- [x] **Nada muda antes do link**
  Depois do pedido, o e-mail da conta continua o antigo: o login com ele funciona e o Perfil mostra o antigo. A rota do pedido não chama `revokeUserSessions` nem grava evento de auditoria. Dois links pendentes para a mesma conta valem até um deles ser aplicado; o segundo passa a responder `400 AUTH_OOB_CODE_INVALID`, porque o endereço antigo já não existe, e o primeiro, repetido, responde o mesmo código.

- [ ] **Aviso ao endereço antigo**
  O endereço atual recebe o aviso `emailChangeNotice` com o novo endereço e a orientação de trocar a senha e falar com o suporte. O link só sai para o novo endereço depois que a Resend aceita o aviso; se o aviso falhar, a rota responde `503 EMAIL_SEND_FAILED` e o link não sai. Com `NEXT_PUBLIC_APP_SUPPORT_EMAIL` vazia, o aviso sai sem a linha de suporte. A ordem e os destinatários estão provados em teste de rota e o template em teste de render; a entrega real depende da Resend com domínio verificado.

- [x] **Confirmação troca o e-mail e encerra as sessões**
  Abrir `/{locale}/verify-email?mode=verifyAndChangeEmail&oobCode=...` confirma a troca: o login com o endereço novo funciona, com o antigo falha com `EMAIL_NOT_FOUND`, a conta fica com `emailVerified=true` e `tokensValidAfterTime` avança. Qualquer sessão aberta antes da troca, no mesmo navegador ou noutro, cai para `/sign-in?redirect=...` na navegação seguinte. A página mostra o cartão "E-mail alterado" com o link "Entrar" para `/{locale}/sign-in` e continua nele mesmo aberta no navegador da sessão antiga. O código é enviado uma única vez por montagem.

- [x] **Trilha de auditoria**
  Cada troca confirmada grava um evento `account.email.change` com `changedFields: ["email"]`, ator e alvo iguais ao perfil do titular, `actorLabel` com o endereço antigo e `targetLabel` com o novo. Troca recusada (link repetido, endereço tomado, código de outro tipo) não grava evento. A tela de auditoria do admin mostra "E-mail alterado pelo titular", "Email changed by the account holder" e "Correo cambiado por el titular". Se o perfil do Firestore não existir, a troca responde 200 e não grava evento.

- [x] **Senha atual errada**
  Senha errada responde `400 ACCOUNT_CURRENT_PASSWORD_INVALID`, com "A senha atual está incorreta." nos 3 idiomas; nenhum link é gerado e nenhum e-mail sai. O limite do Identity Toolkit responde `429 USERS_AUTH_RATE_LIMITED` e o do proxy `429 AUTH_RATE_LIMITED`. Senha com menos de 6 caracteres é barrada no diálogo ("A senha deve ter ao menos 6 caracteres.") e, forçada, responde `400 VALIDATION_FAILED`.

- [x] **Endereço já em uso**
  Um endereço que já tem conta responde `400 USERS_AUTH_EMAIL_ALREADY_IN_USE` ("Este e-mail já está em uso."), a mesma resposta que o cadastro anônimo já dá. Se outra conta tomar o endereço entre o pedido e o clique, a confirmação responde o mesmo código e o e-mail da conta não muda.

- [x] **Endereço igual ao atual**
  O diálogo recusa o endereço atual sem diferenciar maiúsculas ("O novo e-mail é igual ao atual."). Forçado na API, responde `400 ACCOUNT_EMAIL_UNCHANGED` antes de conferir a senha. Espaços nas pontas saem antes da comparação e do envio.

- [x] **Conta sem provedor de senha**
  Conta só Google vê, no lugar do botão, "Esta conta entra pelo Google e não tem senha para confirmar a troca de e-mail." Forçado, o pedido responde `400 ACCOUNT_EMAIL_CHANGE_REAUTH_UNSUPPORTED` sem chamar o Identity Toolkit. Conta sem e-mail responde `400 ACCOUNT_PASSWORD_UNSUPPORTED`. Enquanto a conta carrega, o botão aparece desabilitado.

- [x] **Modo degradado sem Resend**
  Sem `RESEND_TOKEN`/`RESEND_FROM` ou sem `NEXT_PUBLIC_APP_URL` na API, a app sobe e o pedido responde `503 EMAIL_NOT_CONFIGURED` antes de ler o corpo e sem gastar cota do toolkit. A UI mostra "O envio de e-mails não está configurado. Fale com o suporte." ("Email delivery is not configured. Contact support.", "El envío de correos no está configurado. Contacta al soporte.") e mantém o diálogo aberto com os valores preenchidos. Sem sessão, a mesma rota responde `401 AUTH_INVALID_TOKEN`, nunca o 503.

- [x] **Códigos de ação inválidos na confirmação**
  Link sem código mostra "Link inválido". Código expirado responde `400 AUTH_OOB_CODE_EXPIRED`; código já usado ou adulterado, `400 AUTH_OOB_CODE_INVALID`. Código de verificação de e-mail ou de redefinição de senha enviado à rota de troca é recusado com `AUTH_OOB_CODE_INVALID` sem ser gasto: o mesmo código continua válido na rota dele. Corpo sem `oobCode` responde `400 VALIDATION_FAILED`. A página mostra o cartão "Não foi possível trocar o e-mail" com o link para o painel.

- [x] **Rota de verificação recusa código de troca**
  Um link de troca aberto sem `mode` (`/{locale}/verify-email?oobCode=...`) cai na verificação comum, que recusa o código com `400 AUTH_OOB_CODE_INVALID`: o cartão diz "Não foi possível confirmar" e o e-mail da conta não muda. O mesmo código, aberto depois com `mode=verifyAndChangeEmail`, ainda troca o e-mail. A verificação comum com código de `generateEmailVerificationLink` segue respondendo 200 com o cartão "E-mail confirmado".

- [x] **Impersonação e perfis**
  Admin personificando vê o botão "Trocar e-mail" desabilitado e, forçando `POST /account/email` com os headers que o SDK manda, recebe `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`. Sem sessão, `401 AUTH_INVALID_TOKEN`; perfil admin no painel comum, `403 COMMON_PANEL_FORBIDDEN`. Corpo com `uid` ou `id` responde `400 VALIDATION_FAILED`.

- [x] **Duplo clique e cancelamento**
  Durante o envio, o botão de confirmar fica em carregamento e não aceita outro clique, então sai uma única requisição. Cancelar fecha o diálogo e limpa os campos; reabrir mostra o formulário vazio. Um segundo pedido depois do primeiro é aceito e gera outro par de e-mails.

- [x] **Foco do teclado no diálogo**
  Ao abrir o diálogo pelo botão "Trocar e-mail", o foco vai para o campo "Novo e-mail", dentro do diálogo, e o Tab seguinte leva a "Senha atual". Ao fechar por Esc, por "Cancelar" ou depois do pedido aceito, o foco volta ao botão "Trocar e-mail", e não ao `<body>`. Quando a API recusa o pedido (por exemplo `503 EMAIL_NOT_CONFIGURED`), o diálogo continua aberto com os valores preenchidos. O diálogo de exclusão da aba Privacidade não entra neste critério: ele ainda deixa o foco no botão que o abriu e está registrado como achado à parte.

- [x] **Tema, responsivo e idiomas**
  A aba Perfil com o diálogo aberto e a página de confirmação, nos estados de sucesso, erro e link sem código, ficam legíveis em light, dark e 375 px, nos 3 idiomas, sem rolagem horizontal e sem texto fora do dicionário. O axe (WCAG 2.0/2.1 A e AA) não aponta violação em nenhuma dessas telas.

- [x] **Stripe documentada**
  `docs/PAYMENTS.md` diz que o `customer` da Stripe mantém o e-mail do primeiro checkout depois da troca, porque nada no código o atualiza, e que o titular muda o endereço de cobrança pelo Customer Portal quando o portal permite editar os dados do cliente.
