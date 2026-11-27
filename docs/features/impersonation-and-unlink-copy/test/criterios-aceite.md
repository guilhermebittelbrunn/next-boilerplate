# Critérios de Aceite (Checklist)

Partem da §9 do `analyze/plan.md`, com duas correções: o critério 3 do plano falava em "código do erro", mas
o sufixo que o `handleClientError` acrescenta é o `requestId` (header `x-request-id`), então aqui se lê
"código do pedido"; e o desvio do desvincular passou a exigir o `providerId` da senha, por isso o Google tem
critério próprio. Status de cada item no `test/report.md`.

- [ ] **Desvincular a senha com sessões não encerradas mostra a mensagem própria**
  Na aba Segurança, desvincular "E-mail e senha" quando a API responde `500 AUTH_SESSIONS_NOT_REVOKED`
  mostra um único toast de erro com `account.messages.passwordUnlinkedSessionsNotRevoked` no idioma da
  pessoa (pt-br, en, es), sem o sufixo "(Código do erro: …)". A pessoa continua logada na mesma aba, a conta
  é buscada de novo (`GET /account`) e nenhum toast de sucesso aparece.

- [ ] **A mensagem não manda entrar de novo e aponta o botão da tela**
  O texto nos três idiomas não contém "Entre de novo", "Sign in again" nem "Vuelve a entrar", e cita entre
  aspas o rótulo exato do botão da mesma aba: "Sair de todos os dispositivos", "Sign out everywhere" e
  "Cerrar sesión en todos los dispositivos".

- [ ] **Desvincular o Google com o mesmo código mostra a copy genérica**
  Desvincular o Google quando a API responde `500 AUTH_SESSIONS_NOT_REVOKED` mostra a copy de
  `apiErrors.AUTH_SESSIONS_NOT_REVOKED` seguida de "(Código do erro: <requestId>)", nunca a frase que começa
  com "Senha removida".

- [ ] **Outros erros do desvincular não mudam**
  Desvincular a senha com `500 ACCOUNT_UPDATE_FAILED` continua mostrando a copy de `apiErrors` pelo
  `handleClientError`, com o código do pedido no fim.

- [ ] **A copy de `apiErrors.AUTH_SESSIONS_NOT_REVOKED` fica como está**
  `packages/internationalization/translations/packages/shared/utils.ts` não aparece no diff. Redefinição de
  senha, confirmação de troca de e-mail, troca e definição de senha seguem com a mesma mensagem.

- [ ] **Personificando conta sem nome, o menu não mostra o nome do admin**
  Admin com nome no Firebase personificando conta com `displayName` nulo: o gatilho mostra o prefixo do
  e-mail da conta personificada, e o menu aberto mostra só o e-mail dela. Com a conta personificada tendo
  nome, aparece o nome dela.

- [ ] **Personificando conta sem avatar, o menu não mostra a foto do admin**
  Admin com foto no Firebase personificando conta com `avatarUrl` nulo: o avatar mostra só as iniciais da
  conta personificada, sem `<img>` com a foto do admin.

- [ ] **Na troca de sujeito, nada do admin aparece enquanto a conta carrega**
  Entre escolher o usuário a personificar e a resposta de `GET /account`, o gatilho e o menu ficam sem nome,
  sem e-mail e sem foto. Com a resposta atrasada de propósito, nenhum render intermediário mostra o admin.
  Quando a conta responde, os dados dela aparecem sem recarregar.

- [ ] **Personificando, a saudação do início não usa o nome do admin**
  Admin com nome no Firebase personificando conta sem `displayName`: o título do início fica só "Olá",
  "Hello" ou "Hola", sem vírgula. Com a conta personificada tendo nome, aparece o primeiro nome dela. Entre a
  troca de sujeito e a resposta de `GET /account`, o título nunca mostra o nome do admin. Ao sair da
  personificação, o início do painel admin volta a cumprimentar o admin pelo nome.

- [ ] **Sair da personificação devolve o admin ao menu**
  Voltar para "Administração" mostra nome e foto do admin no gatilho, sem passar por um estado vazio.

- [ ] **Fora da personificação o fallback continua**
  Pessoa comum ou admin no próprio painel: antes de `GET /account` responder, o menu mostra nome, e-mail e
  foto do usuário do Firebase. Os testes de `profileDropdownAccount.test.tsx` passam sem mudar asserção.

- [ ] **Autorização do desvincular sob personificação**
  Admin personificando não consegue desvincular método de login: a UI desabilita e a API responde
  `403 AUTH_REQUEST_IMPERSONATION_FORBIDDEN`. Nada disso muda com esta tarefa.

- [ ] **Tema, responsivo e idioma**
  Menu do perfil sob personificação e toast do desvincular legíveis em light, dark e mobile (390 px), nos três
  idiomas. No mobile o nome do gatilho some (`hidden md:inline`) e ficam o avatar com iniciais e o menu
  aberto.

## Roteiro manual

1. Emulador + `pnpm seed`. Dê ao `admin@example.com` um nome e uma foto no Auth emulator. Crie
   `qa-impersonation-copy@example.com` por `POST /auth/sign-up`, só com e-mail e senha.
2. Entre como admin. Em "Ambiente", escolha "Painel do usuário" e, em "Selecione o usuário", a conta de QA.
   Abra o menu do perfil logo em seguida e de novo depois que a conta carregar. Esperado: primeiro vazio,
   depois as iniciais "qa", o prefixo "qa-impersonation-copy" e o e-mail; nunca o nome ou a foto do admin.
3. Volte para "Administração". Esperado: nome e foto do admin no gatilho.
4. Vincule um Google falso à conta de QA no emulador, entre com ela e conclua o onboarding. Em Minha conta →
   Segurança, force `500 {"error":{"code":"AUTH_SESSIONS_NOT_REVOKED"}}` no `DELETE` de
   `/account/sign-in-methods/password` e confirme "Desvincular". Esperado: a mensagem nova, sem código do
   pedido, a pessoa segue na aba.
5. Repita o passo 4 em `/account/sign-in-methods/google.com`. Esperado: a copy de `apiErrors` com
   "(Código do erro: …)".
6. Repita 2, 4 e 5 em en e es, em light, dark e 390 px.
7. Ainda personificando a conta de QA sem nome, confira o título do início: "Olá", "Hello" ou "Hola". Dê um
   nome à conta no emulador e recarregue: o título passa a usar o primeiro nome dela.
