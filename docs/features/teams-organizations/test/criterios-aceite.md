# Critérios de Aceite (Checklist)

Organizações, membros e convites. Os critérios vêm do §10 do `analyze/plan.md`, com o texto ajustado ao que o
`/develop` e o `/review` entregaram, mais quatro critérios de infraestrutura que o §9.4 do plano já marcava como não
observáveis sem serviço externo. A caixa marcada indica critério aprovado nesta rodada. Cada item termina com o
status (✅ aprovado, ❌ reprovado, 🔒 não verificado) e a evidência; o detalhe de cada medição está no
`test/report.md`.

Resultado: 27 critérios, 23 ✅, 0 ❌, 4 🔒 (depois da remedição da rodada 2 do `/review`; antes dela, 22 ✅ e 1 ❌).

- [x] **Toda conta comum nova nasce com uma organização em que é dona**
  O cadastro por e-mail e o primeiro contato pelo Google gravam um documento `organization` com `ownerUserId` igual ao
  id do perfil e um `organizationMember/{profileId}` com `role: "owner"`. Se essa gravação falhar no cadastro, a conta
  continua criada e o primeiro pedido a uma rota escopada cria a organização. Perfil criado pelo admin ganha a
  organização no primeiro pedido.
  ✅ Cadastro de `qa-teams-organizations@example.com` pela tela gravou organização e vínculo de dono na hora; o
  `signUp.spec.ts` do `pnpm e2e` passou. Google, falha no cadastro e perfil sem vínculo: `signUpProfile.test.ts`,
  `googleSignInProfile.test.ts` e `organizationMembership.test.ts`.

- [x] **Quem já existia é migrado no primeiro pedido, sem script**
  Um perfil sem vínculo e com `entity` sem `organizationId` recebe organização e vínculo, e todos os seus registros,
  inclusive os apagados, ganham o `organizationId` sem mudança de `updatedAt`. Uma segunda passada não altera nada.
  Pedidos simultâneos no primeiro contato terminam com uma só organização.
  ✅ Os 4 registros do seed de `user@example.com` ganharam o `organizationId` no primeiro pedido, com `updatedAt`
  igual antes e depois e `legacyClaimPending: false`; `/pt-br/entities` listou os 4. Corrida, registro apagado e
  segunda passada: `organizationScope.emulator.test.ts`.

- [x] **Registro de outra organização responde 404, inclusive chamando a API direto**
  `GET`, `PUT` e `DELETE /entities/:id` com o id de um registro de outra organização, de um registro apagado ou de um
  registro ainda sem carimbo respondem `404 ENTITY_NOT_FOUND`, nunca 403 nem lista vazia disfarçada. A listagem e o
  resumo da home só contam registros da organização do sujeito.
  ✅ Os três métodos com o token de `user@example.com` no registro de `user2@example.com`, antes e depois do carimbo,
  responderam `404 ENTITY_NOT_FOUND`; o `PUT` não alterou o registro; `organizationId`/`userId` no corpo de um
  `POST` foram ignorados. Lista e resumo só com a organização do chamador. Registro apagado:
  `organizationScope.emulator.test.ts`.

- [x] **Membros da mesma organização compartilham os registros**
  Um registro criado pelo membro aparece para o dono e vice-versa. Qualquer membro edita e apaga registro de outro
  autor. O campo `userId` do registro guarda quem criou e não decide acesso. Editar sem mexer na foto de um registro
  de outro autor salva normalmente.
  ✅ Pela tela: o membro viu os registros do dono, criou "QA Registro do Membro" e o dono passou a vê-lo; o membro
  editou a descrição de um registro do dono com foto (`PUT` `200`, `photo` e `userId` intactos, sem
  `ENTITY_PHOTO_INVALID`). Exclusão de registro de outro autor: `entitiesRouteOrganizationScope.test.ts`.

- [x] **Fotos de `entity` pertencem à organização; o avatar continua da pessoa**
  O upload pelo formulário de `entity` grava em `uploads/org-<organizationId>/`; o do avatar continua em
  `uploads/<profileId>/`. Anexar a um registro um objeto do prefixo pessoal de alguém responde
  `400 ENTITY_PHOTO_INVALID`. Trocar a foto apaga a anterior quando ela é da organização. `?scope=` com valor
  desconhecido responde `400 VALIDATION_FAILED`.
  ✅ `POST /files?scope=organization` gravou `uploads/org-<id>/<uuid>.png`, no documento e no Storage emulado; o
  avatar, por `POST /files` sem `scope`, caiu em `uploads/<id do perfil>/`. Prefixo pessoal, troca e `scope`
  inválido: `fileUploadRoute.test.ts` e `entitiesRouteOrganizationScope.test.ts`.

- [x] **Sob personificação vale a organização do personificado, em modo leitura**
  O admin personificando vê os registros, os membros e os convites da organização do usuário, nunca os de outra.
  Qualquer escrita, aceite de convite inclusive, responde `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`. Personificar
  quem ainda não tinha organização cria a dela e migra os registros.
  ✅ Personificando o dono, a página da equipe mostrou membros, convites e o aviso "Modo somente leitura", com
  "Enviar convite" desabilitado e sem menu de ações; personificando o membro, "Sair da equipe" desabilitado.
  `POST /entities` e `POST /invitations/accept` personificados: `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`.
  Personificar `user2` sem vínculo criou organização e vínculo e só carimbou os 2 registros dele.

- [x] **Papel na organização e papel de plataforma não se misturam**
  Um dono comum chamando rota de admin recebe `403 ADMIN_FORBIDDEN`. Um admin sem personificar não alcança as rotas de
  organização (`403 COMMON_PANEL_FORBIDDEN`) e não aceita convite. Um membro chamando rota só do dono recebe
  `403 ORGANIZATION_FORBIDDEN`.
  ✅ Medido direto na API: dono em `GET /users` → `403 ADMIN_FORBIDDEN`; admin em `GET /organization`,
  `GET /entities` e `POST /invitations/accept` → `403 COMMON_PANEL_FORBIDDEN`; membro em convites e remoção →
  `403 ORGANIZATION_FORBIDDEN`.

- [x] **Fork B2C não vê organização**
  Com `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED` vazia ou ausente, a app e a API sobem, o build passa, não há item
  "Equipe", nenhuma página mostra "organização", "organization" ou "organización" (nem "equipe", "team", "equipo")
  nos três idiomas, `/organization` e `/invite` respondem 404, e as rotas `/organization/*` e `/invitations/*`
  respondem `404 ORGANIZATION_MEMBERS_DISABLED`, nunca 500. Só `"true"` liga, sem diferenciar maiúsculas.
  ✅ As 9 rotas responderam `404 ORGANIZATION_MEMBERS_DISABLED` com e sem credencial, o menu não tem "Equipe", o
  texto visível de 13 telas nos três idiomas não tem as palavras e o build passou. Na primeira medição, o 404 de
  `/invite` levava "Convite para a equipe" no título (defeito D-1); o `/review` corrigiu na rodada 2, e a remedição
  no build de produção mostrou, em `/pt-br`, `/en` e `/es/invite` (com e sem token), status 404 e título,
  `og:title`, `apple-mobile-web-app-title` e `description` do 404 ("Página não encontrada | next-boilerplate",
  "Page not found | next-boilerplate", "Página no encontrada | next-boilerplate"), sem nenhuma ocorrência de equipe,
  team, equipo, convite, invitation, invitación ou organiza no payload. Com a flag `"true"` num segundo build, o
  título do convite voltou nos três idiomas.

- [x] **O dono convida por e-mail**
  Com a flag ligada, o dono informa um e-mail válido e recebe confirmação. O convite aparece em "Convites pendentes"
  com data de expiração 7 dias à frente. E-mail vazio, inválido ou só com espaços é barrado no formulário e responde
  `400 VALIDATION_FAILED` na API. Um membro não vê o formulário e, direto na API, recebe `403 ORGANIZATION_FORBIDDEN`.
  ✅ Convite para `qa-teams-organizations+1@example.com` apareceu na lista com "Enviado em" 23/10 00:45 e "Expira em"
  30/10 00:45; "Informe o e-mail." e "Informe um e-mail válido." barraram o envio sem pedido; o membro não viu o
  formulário e recebeu `403` na API. O toast "Convite enviado." depende de entrega real (critério 24); o ramo está
  em `useOrganization.test.tsx`. `400` da API: `organizationInvitationsRoute.test.ts`.

- [x] **Sem e-mail configurado o convite degrada com código**
  Sem Resend ou sem `NEXT_PUBLIC_APP_URL`, convidar responde `503 EMAIL_NOT_CONFIGURED` e nada é gravado. Com o
  provedor recusando, o convite é gravado, a resposta é 201 com `delivery: "failed"` e a tela avisa que o e-mail não
  saiu e que dá para reenviar.
  ✅ Sem Resend: `503` e "O envio de e-mails não está configurado. Fale com o suporte.", zero documentos. Com token de
  placeholder: `201`, "O convite foi criado, mas o e-mail não saiu. Tente reenviar em instantes." e o convite na
  lista. Sem `NEXT_PUBLIC_APP_URL`: matriz da rota (unit).

- [x] **O token nunca fica guardado nem é devolvido**
  O documento guarda só `tokenHash`, o `sha256` do token do link. Nenhuma resposta da API, nenhum DTO e nenhuma linha
  de log carrega o token ou o e-mail do convidado.
  ✅ O documento tem `tokenHash` e nenhum campo de token; a lista devolve 7 campos sem `tokenHash`; o log da API não
  tinha nenhuma ocorrência do endereço convidado depois da falha de entrega. Hash igual ao `sha256` do token do
  link e resposta do `POST` sem token: `organizationInvitationsRoute.test.ts`.

- [x] **Reenvio idempotente, com teto e intervalo**
  Convidar de novo o mesmo endereço reaproveita o convite, gera token novo, invalida o anterior e renova a validade.
  Antes de 60 s responde `429 ORGANIZATION_INVITATION_RECENTLY_SENT`. Com 20 pendentes, um endereço novo responde
  `409 ORGANIZATION_INVITATION_LIMIT_REACHED`. Convidar quem já é membro, o próprio dono inclusive, responde
  `409 ORGANIZATION_INVITATION_ALREADY_MEMBER`. Duas requisições simultâneas para o mesmo endereço deixam um
  documento.
  ✅ "Reenviar" logo depois do envio: `429` e "Um convite acabou de ser enviado para este e-mail. Aguarde um minuto
  para reenviar."; convidar o membro e o próprio dono: `409 ORGANIZATION_INVITATION_ALREADY_MEMBER`. Documento único
  sob concorrência: `organizationInvitation.emulator.test.ts`. Teto de 20 e troca do token: rota com mock e leitura
  do `issue` (o `set` substitui o `tokenHash`); não medi o token antigo parando de valer depois de um reenvio real.

- [x] **Revogar invalida o link**
  Revogar tira o convite da lista e apaga o documento. Abrir o link depois mostra convite inválido
  (`400 ORGANIZATION_INVITATION_INVALID`). Revogar id de outra organização ou convite aceito responde
  `404 ORGANIZATION_INVITATION_NOT_FOUND`.
  ✅ "Revogar" → "Sim": `204`, "Convite revogado.", "Nenhum convite pendente." e zero documentos. Prévia de um token
  revogado: `400 ORGANIZATION_INVITATION_INVALID`. Revogar de novo, revogar convite aceito e revogar por outra
  organização: `404 ORGANIZATION_INVITATION_NOT_FOUND`.

- [x] **A página do convite funciona deslogado e logado**
  Deslogado, mostra quem convidou e o e-mail convidado, com "Entrar" e "Criar conta" que voltam ao mesmo convite
  depois. Logado, não é mandado para a home e mantém o token. Sem token, com token desconhecido ou expirado, mostra o
  cartão correspondente, sem botão de aceitar.
  ✅ Deslogado: "user@example.com convidou qa-teams-organizations@example.com para a equipe.", validade e os dois
  links com `redirect=/pt-br/invite?token=…`; o cadastro voltou ao convite. Logado, ficou em `/invite` com o token.
  Vencido: "Este convite expirou"; desconhecido, vazio e malformado: "Este convite não vale mais"; nenhum com
  "Aceitar convite".

- [x] **Aceitar exige o e-mail do convite e vale uma vez**
  Conta com outro e-mail recebe `403 ORGANIZATION_INVITATION_EMAIL_MISMATCH` e a opção de entrar com outra conta.
  Convite vencido responde `400 ORGANIZATION_INVITATION_EXPIRED`. Clique duplo envia um pedido e, se dois chegarem,
  os dois respondem sucesso para a mesma pessoa. Outra pessoa com o mesmo token recebe `INVALID`.
  ✅ `user2@example.com` viu o aviso de e-mail diferente e "Entrar com outra conta", que levou ao login com o
  `redirect` do convite; na API, `403 ORGANIZATION_INVITATION_EMAIL_MISMATCH`. Duplo clique em "Aceitar convite": um
  `POST`. O membro reaceitando o token usado: `200`. Três aceites simultâneos e outra pessoa: emulador.

- [x] **E-mail já cadastrado não cria conta duplicada**
  O convidado que já tem conta entra com ela e aceita; quem não tem se cadastra pelo fluxo normal e aceita em
  seguida. Em nenhum dos dois caminhos surge uma segunda conta ou um segundo perfil para o mesmo e-mail.
  ✅ A conta de QA foi criada uma vez pelo cadastro normal e depois aceitou mais dois convites com a mesma conta, sem
  novo perfil. Nenhuma rota nova chama `createUser` (varredura do `/review`).

- [x] **Aceitar troca de organização sem perder a anterior**
  Depois do aceite, a pessoa vê os registros da organização nova e deixa de ver os da sua organização anterior, que
  ficam guardados nela. A página avisa disso antes do clique. Ao sair ou ser removida, ela volta à organização
  anterior com os registros. Dono de organização com outros membros não aceita
  (`409 ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS`), e convite de uma organização cujo dono foi para outra responde
  `INVALID`.
  ✅ O aviso "Ao aceitar, você passa a ver os registros desta equipe…" aparece antes do botão; depois do aceite,
  "QA Registro de Casa" sumiu da lista e voltou depois da saída; depois da remoção, a mesma organização de casa
  voltou. Dono com membros e organização dormente: `organizationInvitation.emulator.test.ts` e
  `invitationsRoutes.test.ts`.

- [x] **Lista de membros**
  Qualquer membro vê nome, e-mail, papel e data de entrada de todos, com busca por nome e e-mail e botão de atualizar.
  Só o dono vê "Remover", e nunca na própria linha. Perfil arquivado aparece sem nome e e-mail, sem quebrar a lista.
  ✅ Dono e membro viram as duas linhas com "Nome", "E-mail", "Papel" e "Entrou em", busca e "Atualizar"; só o dono
  teve menu, e não na linha dele; a busca filtrou a tabela de convites e mostrou o texto de vazio. Perfil arquivado:
  `organizationTeamPage.test.tsx` e `organizationMembersRoute.test.ts`.

- [x] **A organização nunca fica sem dono**
  O dono não tem "Sair". Direto na API, sair ou remover a si mesmo responde `409 ORGANIZATION_OWNER_CANNOT_LEAVE`.
  Remover o dono por id também responde 409. Excluir a conta com membros responde
  `409 ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS` antes de pedir a senha e sem apagar nada.
  ✅ A página do dono não tem a seção "Sair da equipe". `POST /organization/leave` e
  `DELETE /organization/members/<dono>`: `409 ORGANIZATION_OWNER_CANNOT_LEAVE`. Exclusão de conta do dono com uma
  senha errada: "A sua equipe ainda tem membros. Remova-os antes de excluir a conta." (`409`), perfil intacto.

- [x] **Remover e sair cortam o acesso no pedido seguinte**
  O membro removido, no próximo pedido, recebe 404 nos registros da organização e passa a ver a própria organização.
  Remover id de fora da organização responde `404 ORGANIZATION_MEMBER_NOT_FOUND`. O membro que sai pela UI volta à
  organização de casa, e a tela troca de dados sem recarregar.
  ✅ Depois da remoção (`204`), `404 ENTITY_NOT_FOUND` no registro do dono e `viewerRole: "owner"` na organização de
  casa. Id de outra organização e id inexistente: `404 ORGANIZATION_MEMBER_NOT_FOUND`. Saída pela tela: `204`, "Você
  saiu da equipe." e a visão de dono, sem recarregar a janela.

- [x] **Exclusão e exportação do titular separam pessoa e organização**
  Dono sozinho que exclui a conta leva a organização inteira: registros, fotos, vínculos e convites. Membro que exclui
  a conta leva só os dados pessoais e a organização de casa, e os registros que criou na organização de outro ficam
  lá. A exportação traz os registros que o titular criou, em qualquer organização, e o `membership` atual.
  ✅ O membro excluiu a conta (`200`): perfil, organização de casa e o registro de casa sumiram; "QA Registro do
  Membro" ficou com o dono; o convite para o endereço dele foi apagado. A exportação do dono trouxe `membership` e só
  os 5 registros dele. Dono sozinho: `accountErasure.test.ts` e `accountErasureStorage.emulator.test.ts`.

- [x] **Erros traduzidos nos três idiomas**
  Os 13 códigos novos aparecem como texto em pt-br, en e es, sem código cru nem stack, nos toasts e cartões da página
  da equipe, da página de aceite e da exclusão de conta.
  ✅ Paridade 67/67 no `pnpm test`. Na tela: quatro códigos em pt-br, `ORGANIZATION_INVITATION_ALREADY_MEMBER` em en
  ("This person is already part of the team.") e em es ("Esta persona ya forma parte del equipo."), sempre com o id
  do pedido e nenhum código cru.

- [x] **Tema e responsivo**
  A página da equipe e a página de aceite funcionam em light, dark e mobile. As tabelas antd seguem o tema, e os
  formulários e diálogos têm foco visível e rótulo acessível.
  ✅ Contraste do cabeçalho da tabela 14,50:1 no dark e 18,16:1 no light; célula 17,01:1 e 18,97:1; selo de
  expirado 6,00:1 e 4,77:1. A 375 px, nada rola na horizontal e as tabelas rolam no próprio contêiner. Anel de foco
  de 3 px no botão de envio. Campos com rótulo ("E-mail", "Senha atual").

- [ ] **Entrega real do e-mail de convite**
  Com Resend configurado e domínio verificado, o convidado recebe o e-mail com o link
  `<NEXT_PUBLIC_APP_URL>/<idioma>/invite?token=…` no idioma de quem convidou.
  🔒 Não há Resend nesta rodada. A tentativa de envio foi registrada no idioma certo
  (`[email] failed template=action-link reason=provider-error locale=pt-br`), e o template renderiza nos três
  idiomas em `templates.test.tsx`.

- [ ] **Limite por IP nas rotas de convite**
  Com `ARCJET_KEY`, emitir, pré-visualizar e aceitar convites contam no limite de 20 pedidos por 60 s por IP e
  respondem `429` ao estourar.
  🔒 Sem a chave. A lista de caminhos limitados está em `corsOrigin.test.ts`.

- [ ] **Índices compostos publicados antes do deploy**
  Num projeto real, os três índices de `entity` por `organizationId` estão prontos antes da API nova; sem eles, a
  lista e a home respondem `503` com código, nunca 500.
  🔒 Depende do projeto real. A declaração dos índices está em `firestoreIndexes.test.ts`.

- [ ] **Expiração automática dos convites (TTL)**
  Com a política de TTL em `organizationInvitation.expiresAt`, convites vencidos somem sozinhos.
  🔒 Exige configuração no projeto real. Sem ela, o vencido continua inútil: a prévia respondeu
  `400 ORGANIZATION_INVITATION_EXPIRED` e a lista mostrou o selo "Expirado".
