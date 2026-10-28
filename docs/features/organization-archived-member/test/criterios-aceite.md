# Critérios de Aceite (Checklist)

Os oito critérios foram medidos nesta rodada, todos por teste Vitest (helper ou rota, com mocks de repositório) ou
por leitura do diff. Nenhum depende de infra externa. O meio de cada um está no `report.md`.

- [x] **Dono cujo único outro membro está arquivado não é bloqueado**
  Com a organização de casa contendo o dono e um vínculo cujo perfil tem `deletedAt` preenchido,
  `ownsOrganizationWithMembers(dono)` responde `false`. `POST /account/deletion` não responde mais
  `409 ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS`: segue para a conferência de senha e, com a senha certa, para
  `runAccountErasure`. `DELETE /users/:id` não responde mais `409 USERS_DELETE_ORGANIZATION_HAS_MEMBERS`: cancela a
  assinatura viva, revoga o acesso, grava `deletedAt` no perfil do dono e responde `204`, nessa ordem. O perfil do
  membro arquivado é lido uma vez, por id.

- [x] **Um membro ativo continua bloqueando, mesmo ao lado de um arquivado**
  Com um vínculo de perfil arquivado e outro de perfil vivo, o helper responde `true` e as duas rotas mantêm o `409`
  com o mesmo `error.code` de antes. Na exclusão pela própria pessoa a senha não chega a ser conferida. No arquivamento
  pelo admin a Stripe não é consultada e nada é revogado nem gravado. O membro vivo sozinho também bloqueia, como antes.

- [x] **Vínculo sem perfil no Firestore não conta**
  Um vínculo cujo documento em `user` não existe (sobra de uma exclusão interrompida, ou perfil apagado fora da app)
  recebe o mesmo tratamento do arquivado. O `findById` do repositório base devolve `null` tanto para documento
  inexistente quanto para `deletedAt` preenchido, e o helper só conta perfil não nulo. Não há conta a proteger nesse
  caso, então o dono pode sair.

- [x] **O perfil do dono nunca é lido, e o dono sozinho não gera leitura de perfil**
  O helper descarta o vínculo do próprio dono pelo `userId` antes de ler perfis. Com o dono sozinho na organização, a
  resposta é `false` e `userRepository.findById` não é chamado. Com outros membros, só os ids deles são lidos, nunca o
  do dono.

- [x] **Sem organização de casa, nada muda**
  Um perfil que não é dono de organização (membro da organização de outra pessoa, ou sem vínculo nenhum) recebe `false`
  sem consulta a vínculos nem a perfis. É o comportamento anterior, sem alteração.

- [x] **Falha ao ler um perfil não libera a exclusão**
  Se `userRepository.findById` rejeitar para um membro, o helper rejeita com o mesmo erro e a rota que o chamou não
  executa nenhum efeito. Na exclusão pela própria pessoa, a senha não é conferida, `runAccountErasure` não roda e nada
  vai para a trilha de auditoria. No arquivamento pelo admin, a Stripe não é consultada, o acesso não é revogado, o
  perfil não ganha `deletedAt` e nenhum evento é gravado. A resposta HTTP continua o `500` sem `error.code`, achado já
  registrado no backlog. Uma falha de leitura nunca é tratada como membro arquivado.

- [x] **A tabela da equipe continua mostrando o membro arquivado**
  `GET /organization/members` e `describeOrganizationMembers` não mudam. O vínculo arquivado continua listado com nome e
  e-mail vazios, e o dono ainda pode removê-lo com `DELETE /organization/members/:id`. Nenhum dos dois arquivos aparece
  no diff, e `organizationMemberProfiles.test.ts` e `organizationMembersRoute.test.ts` passam sem edição.

- [x] **Nenhuma rota, contrato ou tradução muda**
  O código da tarefa se limita a `organization-membership.ts` e aos testes. A assinatura do helper continua
  `(profileId: string) => Promise<boolean>`, sem DTO, action do SDK, `error.code` ou chave de i18n novos. Nenhum arquivo
  da tarefa `organization-guardrails` foi editado, e a suíte da `apps/api` passa inteira com o import novo de
  `user.repository` no helper.
