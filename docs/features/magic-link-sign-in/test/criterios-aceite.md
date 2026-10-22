# Critérios de Aceite (Checklist)

Entrar com link enviado por e-mail. Os critérios vêm da §9 do `analyze/plan.md`, com o texto ajustado ao que
o `/develop` e o `/review` implementaram. A caixa marcada indica critério verificado nesta rodada; o status de
cada item, com o meio de verificação e o valor medido, está no `test/report.md`.

- [x] **Recurso desligado por padrão**
  Com `EMAIL_LINK_SIGN_IN_ENABLED` ausente, vazia, `"false"` ou qualquer valor diferente de `"true"` (sem
  diferenciar maiúsculas e com espaços aparados), a API sobe, o build passa e a tela de login da `apps/app` fica
  igual à de antes, sem o link "Receber link de acesso por e-mail". `GET /auth/sign-in/email-link` responde
  `200 { data: { enabled: false } }` e `POST /auth/sign-in/email-link/request` responde `404` com
  `AUTH_EMAIL_LINK_DISABLED` sem ler o corpo, mesmo quando o corpo não é JSON. Quem abre
  `/<locale>/sign-in/email-link` direto vê o cartão "Entrar por link não está disponível" com "Voltar para o login".

- [x] **Ligado sem e-mail configurado, a opção não aparece**
  Com a flag em `"true"` e `RESEND_TOKEN`/`RESEND_FROM` ou `NEXT_PUBLIC_APP_URL` ausentes na API, o GET responde
  `enabled: false` e a tela de login continua sem o link. O POST chamado direto responde
  `503 EMAIL_NOT_CONFIGURED`, com a mensagem traduzida nos 3 idiomas. Nenhum caminho responde 500.

- [x] **Ligado e configurado, a tela de login oferece o link**
  Com a flag em `"true"` e o e-mail configurado, o link aparece no rodapé do cartão de login nos 3 idiomas
  ("Receber link de acesso por e-mail", "Get a sign-in link by email", "Recibir un enlace de acceso por correo") e
  leva a `/<locale>/sign-in/email-link`. Enquanto a disponibilidade carrega, ou se a consulta falhar, o link não
  aparece e o formulário de senha continua no lugar.

- [x] **Pedido responde igual exista ou não a conta**
  Para e-mail de conta elegível, sem conta, de conta só Google, de conta com e-mail não confirmado e de conta
  desativada, o POST responde `200 { data: { requested: true } }` com o mesmo corpo, e a tela mostra o mesmo painel
  "Confira seu e-mail". Só a conta elegível e a desativada geram link e tentativa de envio. A recusa da conta
  inelegível aparece no log como `[auth-action-link] refused kind=sign-in code=not-eligible`, sem o endereço.

- [x] **E-mail no idioma escolhido com o texto `confirmAccess`**
  O e-mail usa o template de link de ação com o slug `confirmAccess` no idioma da tela em que o pedido foi feito.
  O botão aponta para `<NEXT_PUBLIC_APP_URL>/<locale>/sign-in/email-link?oobCode=<código>`, nunca para o handler do
  Firebase. Locale ausente cai no padrão do fork; locale fora do enum é recusado com `400 VALIDATION_FAILED`, como
  na recuperação de senha. A entrega real pelo Resend depende de conta configurada.

- [x] **Validação na borda**
  E-mail vazio, só com espaços, sem `@` ou acima de 320 caracteres é recusado no formulário com a mensagem do
  dicionário ("Email inválido") e, se enviado direto à API, com `400 VALIDATION_FAILED`. Corpo que não é JSON segue o
  tratamento de `parseRequestJson`. Campo extra no corpo, como uma URL de retorno, é ignorado: a URL do link sai
  sempre de `NEXT_PUBLIC_APP_URL`, no servidor.

- [ ] **Rate limit no pedido**
  Com `ARCJET_KEY` configurada, o POST conta no limite por IP das rotas de entrada e responde
  `429 AUTH_RATE_LIMITED` com `Retry-After` ao estourar. O GET de disponibilidade não conta no limite. Sem a chave, o
  comportamento é o da recuperação de senha: sem limite e com aviso no boot.

- [x] **Mesmo navegador entra direto**
  Ao abrir o link no navegador em que o pedido foi feito, a página conclui o login sem pedir nada e navega para a
  home do idioma, para `/<locale>/admin` quando a conta é admin, ou para `/<locale>/onboarding` quando o onboarding
  está pendente. O cookie `access-token` é emitido como no login por senha, o `lastAccessAt` do perfil é
  carimbado e o e-mail guardado no `localStorage` (`email-link-sign-in:email`) é apagado depois do sucesso.

- [x] **Outro navegador pede o e-mail**
  Sem o e-mail guardado, a página não chama o Firebase ao carregar e mostra "Confirme seu e-mail". Com o e-mail
  certo, entra. Com um e-mail diferente, mostra "Este link foi pedido para outro e-mail." no campo e deixa tentar de
  novo, porque o código não é gasto. Um leitor de link que só baixa a página (um `GET` sem JavaScript) não consome
  o acesso.

- [x] **Link usado ou expirado**
  Reabrir um link já usado mostra o cartão "Este link não vale mais"; um link expirado mostra o cartão de link
  expirado. Os dois oferecem "Pedir outro link", que leva ao formulário de pedido do mesmo idioma. Um `oobCode`
  vazio, repetido ou inventado também cai no cartão de link inválido. Nenhum desses estados dispara alerta
  duplicado.

- [x] **Conta desativada não entra**
  Uma conta desativada recebe o link, mas ao concluir a página mostra "Não foi possível entrar" com "Esta conta foi
  desativada." (es: "Esta cuenta ha sido desactivada."), sem cookie e sem navegar para o painel. Em inglês o texto
  herdado do dicionário é "User disabled.", fora do escopo desta entrega.

- [x] **Conta sem senha nunca é criada pelo link**
  Conta que só entra pelo Google e conta com e-mail não confirmado não recebem link. Depois do pedido, o
  `providerData` delas continua igual, e a aba Segurança, a exclusão de conta e a troca de e-mail se comportam como
  antes. A conta com senha e e-mail confirmado que entra pelo link continua com a senha, entra por senha em seguida
  e vê o formulário de troca de senha com o campo "senha atual".

- [x] **Sessão já aberta**
  Quem já tem sessão e abre o link é levado pelo proxy à home do idioma, sem trocar de conta e sem a página chamar
  o Firebase. Como a conclusão só roda no cliente, o código continua utilizável depois do logout, até expirar.

- [x] **Submit repetido**
  Clicar várias vezes em "Enviar link" ou em "Entrar" na confirmação do e-mail dispara uma requisição só enquanto a
  primeira está em andamento; o botão fica em estado de carregamento.

- [ ] **Falha de provedor nunca vira 500**
  Se a geração do link falhar no projeto real (provedor de link desligado, domínio não autorizado) ou o Resend
  recusar o envio, a resposta continua `200 { requested: true }` e a API registra um log sem endereço. Concluir um
  link com o provedor desligado mostra "Operação não permitida." traduzido.

- [x] **Sessão recusada depois do link aceito**
  Se o Firebase aceita o código mas a gravação da sessão (`POST /api/auth/session`) falha, a página não reabre o
  formulário (o código já foi gasto): mostra o alerta de erro, o loader "Entrando…" e o link "Voltar para o login",
  tanto com o e-mail guardado quanto com o digitado. O login, ao abrir, grava a sessão de novo e leva ao painel.

- [x] **Paridade de i18n e copy**
  Toda string nova (link da tela de login, título e textos do pedido, painel "enviado", "indisponível", pedido de
  e-mail, cartões de erro, "Pedir outro link", `AUTH_EMAIL_LINK_DISABLED`) existe em pt-br, en e es, e o teste de
  paridade passa. Nenhuma string fica solta em JSX.

- [x] **Tema e responsivo**
  A tela de login com o link, o formulário de pedido, o painel "enviado", o pedido de e-mail, o erro de e-mail
  diferente, os cartões de erro e o loader "Entrando…" ficam legíveis em light e dark, em desktop (1280 px) e
  mobile (375 px), nos 3 idiomas, com os tokens do design system.

## Roteiro de teste manual

Ambiente: emuladores (`pnpm emulators` com JDK 21, depois `pnpm seed`), `apps/api` com
`EMAIL_LINK_SIGN_IN_ENABLED="true"`, `RESEND_TOKEN="re_placeholder"`, `RESEND_FROM="qa@example.com"` e o bloco do
emulador nas variáveis de processo, sem tocar no `.env`. O código do link sai de
`GET http://127.0.0.1:9099/emulator/v1/projects/demo-next-boilerplate/oobCodes` (`requestType: "EMAIL_SIGNIN"`).

1. Flag desligada: abrir `/pt-br/sign-in` → sem "Receber link de acesso por e-mail". Abrir
   `/pt-br/sign-in/email-link` → "Entrar por link não está disponível".
2. Flag ligada: `/pt-br/sign-in` → o link aparece entre "Esqueci minha senha" e "Cadastrar". Clicar → formulário
   "Entrar com link por e-mail".
3. Digitar `qa@x` e enviar → "Email inválido" no campo; nenhuma requisição à API.
4. Digitar `user@example.com` e dar duplo clique em "Enviar link" → painel "Confira seu e-mail"; uma única
   requisição; um código novo no emulador.
5. `curl` no link `/pt-br/sign-in/email-link?oobCode=<código>` → 200; o código continua listado no emulador.
6. Abrir o link no mesmo navegador → cai em `/pt-br`; cookie `access-token` presente; `lastAccessAt` do perfil
   atualizado; chave `email-link-sign-in:email` some do `localStorage`.
7. Com a sessão aberta, abrir o link de novo → o proxy leva a `/pt-br`.
8. Em navegador limpo, abrir o mesmo link → "Confirme seu e-mail"; digitar `user@example.com` → "Este link não
   vale mais", com "Pedir outro link".
9. Pedir um link novo para `user@example.com` (curl), abrir em navegador limpo, digitar `user2@example.com` →
   "Este link foi pedido para outro e-mail."; o código continua no emulador; digitar `user@example.com` → entra.
10. Repetir o passo 9 bloqueando `POST /api/auth/session` no devtools → alerta de erro, loader "Entrando…" e
    "Voltar para o login". Desbloquear e clicar no link → entra.
11. Pedir com `admin@example.com` e abrir o link → `/pt-br/admin`.
12. Conta recém-cadastrada e confirmada (onboarding pendente) pede em `/en` → o link leva a `/en/onboarding`.
13. Pedir com conta só Google, com conta não confirmada e com e-mail sem conta → mesmo painel, nenhum código no
    emulador, `providerData` igual antes e depois.
14. Pedir em `/es` com uma conta confirmada, desativá-la, abrir o link → "No se pudo iniciar sesión" / "Esta cuenta
    ha sido desactivada.", sem cookie.
15. Abrir `/<locale>/sign-in/email-link?oobCode=` e `?oobCode=inventado` → cartão de link inválido nos 3 idiomas.
16. Repetir as telas acima em light, dark e 375 px de largura.

Fica de fora sem infra externa: entrega real pelo Resend, rate limit com `ARCJET_KEY` real, provedor de link
desligado ou domínio não autorizado no console do Firebase, expiração real do link e leitor de link de provedor
de e-mail corporativo.
