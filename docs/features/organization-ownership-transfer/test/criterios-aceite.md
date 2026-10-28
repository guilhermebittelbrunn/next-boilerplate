# Critérios de aceite: transferir a propriedade da organização

Checklist da §12 do plano, conferido em duas rodadas do `/test` (2026-10-28). A segunda rodada mediu a correção do
teclado no `ActionsMenu`. Cada critério traz no fim a linha
**Status**, com o resultado e o instrumento. Legenda: ✅ medido e correto, ❌ falha, 🔒 ninguém verifica sem infra
externa. Quando só parte de um critério ficou 🔒, ele foi dividido em dois. O relatório com os números e o roteiro
está em [`report.md`](report.md).

# Critérios de Aceite (Checklist)

- [x] **O dono transfere a propriedade a um membro**
  Na tabela da equipe, o dono abre o menu da linha de um membro com perfil vivo, escolhe "Tornar dono" e confirma. A
  API responde `200 { data: { ownerUserId } }`; `organization.ownerUserId` passa a ser o membro, o vínculo dele vira
  `owner` e o do antigo dono vira `member`, numa transação só. A tela mostra o toast com o nome, o dono novo com o selo
  "Dono", o antigo como "Membro", e deixa de mostrar o formulário de convite e a tabela de convites para quem
  transferiu; no lugar aparece "Sair da equipe".
  **Status:** ✅ pela tela nos três idiomas (pt-br escuro desktop, en claro desktop, es escuro 375 px), conferido no
  emulador depois de cada transferência; teste de rota, emulador e `pnpm e2e` passando.

- [x] **Só o dono transfere, e nunca sob personificação**
  Um membro que chama `POST /organization/members/<id>/ownership` recebe `403 ORGANIZATION_FORBIDDEN`; sem sessão,
  `401 AUTH_INVALID_TOKEN`; um admin personificando o dono recebe `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY` e nada
  muda no banco. Na tela, o item "Tornar dono" não aparece para o membro nem para o admin personificando.
  **Status:** ✅. Membro (403) e sem sessão (401) medidos contra a API rodando; a tela do membro não tem coluna de
  ações. A personificação foi medida pelo teste de rota e pelo de componente, que rodaram e passaram; a passada de
  browser não personificou.

- [x] **Alvo inválido é recusado com código traduzido**
  Transferir para si mesmo responde `400 ORGANIZATION_OWNERSHIP_TARGET_SELF` sem abrir transação. Um id inexistente,
  de pessoa de outra organização, ou de alguém que saiu ou foi removido no meio responde
  `404 ORGANIZATION_MEMBER_NOT_FOUND`, então manipular o id na URL não revela se a pessoa existe. Um id com `/`
  codificado também responde 404, nunca 500. Perfil arquivado responde `409 ORGANIZATION_OWNERSHIP_TARGET_ARCHIVED`. As
  mensagens existem em pt-br, en e es, e nenhum documento é escrito.
  **Status:** ✅. Os quatro casos medidos contra a API (`400`, `404` com id inexistente, `404` com o perfil de
  `user2@example.com`, `404` com `a%2Fb`); o `409` saiu pela tela com o toast traduzido; paridade de i18n passando.

- [x] **Perfil arquivado não é oferecido como dono**
  A linha de um membro arquivado (nome "Sem nome", e-mail "Conta indisponível") mostra só "Remover da equipe", nunca
  "Tornar dono", e a linha do dono não tem menu. O DTO de membros traz `archived: true` para esse vínculo.
  **Status:** ✅ pela tela depois de recarregar: o menu da linha arquivada lista só "Remover da equipe".

- [x] **Transferências simultâneas terminam com exatamente um dono**
  Duas transferências do mesmo dono para pessoas diferentes, disparadas juntas, deixam um vínculo `owner` na
  organização, igual a `ownerUserId`; a segunda recebe `403 ORGANIZATION_FORBIDDEN`. Transferência correndo com a
  remoção, a saída ou o aceite de convite do alvo em outra equipe também termina com um dono só. Duplo clique na
  confirmação manda um pedido: o diálogo fecha no primeiro clique e as ações somem enquanto o pedido corre. A aba que
  perdeu continua mostrando as ações de dono até recarregar; é tela defasada, a API recusa certo.
  **Status:** ✅. Duas abas pela tela: a segunda mostrou o toast "Só o dono da equipe pode fazer isso." e o emulador
  ficou com um dono só. As corridas com remoção e aceite ficam com o emulador (passando). A tela defasada foi
  confirmada, como o review previa.

- [x] **O antigo dono ganha as saídas**
  Depois da transferência, o antigo dono sai da equipe (`204`), é removido pelo dono novo (`204`), exclui a própria
  conta sem `409 ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS` e aceita convite de outra equipe sem
  `409 ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS`. Ao sair, ganha uma organização nova e vazia; os registros que criou
  ficam com a equipe. A exclusão da conta dele não apaga nada da equipe.
  **Status:** ✅. Saída pela tela (organização nova com 0 registros; a equipe manteve os 4). Exclusão pela tela de um
  antigo dono que era membro: a conta sumiu do Auth e a equipe ficou com o dono novo e os 4 registros. O aceite em
  outra equipe ficou com o emulador e o teste de rota, que passaram.

- [x] **O dono novo age como dono**
  O dono novo vê o formulário de convite e a tabela de convites, revoga e remove pessoas, e pode transferir de volta.
  O dono novo não sai da equipe nem é removido enquanto for dono (`409 ORGANIZATION_OWNER_CANNOT_LEAVE`).
  **Status:** ✅. Pela tela, o dono novo viu o formulário de convite, removeu o membro arquivado e devolveu a
  propriedade. Contra a API, saída e autorremoção do dono responderam `409 ORGANIZATION_OWNER_CANNOT_LEAVE`.

- [ ] **O dono novo envia convite por e-mail**
  O dono novo convida uma pessoa nova e o e-mail chega com o link.
  **Status:** 🔒. Sem provedor de e-mail, a API responde `503 EMAIL_NOT_CONFIGURED` antes de gravar o convite. A
  emissão fica coberta pelo teste de rota `organizationInvitationsRoute.test.ts`, que passou.

- [x] **Dono de duas organizações**
  O dono novo, que pode ser dono também da própria casa dormente, continua recusado para excluir a conta enquanto a
  equipe tiver membro vivo, e o arquivamento pelo admin também recusa (`409 USERS_DELETE_ORGANIZATION_HAS_MEMBERS`).
  Quando ele exclui a conta sem membros vivos, as duas organizações saem com registros, fotos, vínculos e convites.
  **Status:** ✅. As duas recusas saíram pela tela com o dono novo de uma equipe com membro vivo (arquivamento em
  pt-br, exclusão em en). O caso de duas organizações possuídas fica com o unit e o emulador, que passaram; a conta de
  QA usada aqui não tinha casa dormente.

- [x] **As recusas que continuam valendo indicam a transferência**
  As mensagens de `ORGANIZATION_OWNER_CANNOT_LEAVE`, `ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS`,
  `ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS` e `USERS_DELETE_ORGANIZATION_HAS_MEMBERS` citam a transferência como
  saída nos três idiomas, e nenhuma diz mais que a única saída é remover todos.
  **Status:** ✅. Duas apareceram na tela (`USERS_DELETE_…` em pt-br, `ACCOUNT_DELETION_…` em en); as doze strings
  foram lidas no dicionário e todas citam a transferência.

- [x] **Organização com dono arquivado não recebe ninguém**
  Com o dono arquivado pelo admin, a prévia e o aceite de um convite pendente dela respondem
  `400 ORGANIZATION_INVITATION_INVALID`, deslogado e logado, e nenhum vínculo é criado.
  **Status:** ✅. Tela "Este convite não vale mais" logado (pt-br) e "This invitation is no longer valid" deslogado
  (en); prévia e aceite medidos contra a API (`400`), e o vínculo do convidado não mudou.

- [x] **O aceite conta só membro vivo**
  O dono cujo único outro membro foi arquivado aceita convite de outra equipe e sai dela; o vínculo do arquivado não
  bloqueia. Com um membro vivo, a recusa continua `409 ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS`.
  **Status:** ✅ pelo emulador (`organizationInvitation.emulator.test.ts`, passando). Não percorrido pela tela.

- [x] **Ações da equipe aparecem na trilha**
  Transferência, convite aceito, membro removido e saída gravam um evento cada, com o rótulo traduzido na tela de
  auditoria do admin. Filtrar pelo antigo dono mostra as transferências e a saída; filtrar pelo dono novo mostra a
  transferência e o aceite. Recusas não gravam evento.
  **Status:** ✅. Os quatro rótulos apareceram nos três idiomas; os filtros pelo antigo dono e pelo dono novo
  mostraram exatamente os eventos esperados; as recusas desta passada não deixaram evento.

- [ ] **O convite enviado aparece na trilha sem o e-mail do convidado**
  Enviar ou reenviar convite grava `organization.invitation.send` com o rótulo "Convite para a equipe enviado" /
  "Team invitation sent" / "Invitación al equipo enviada", sem guardar o e-mail de quem foi convidado.
  **Status:** 🔒 na tela. O evento só é gravado depois de o convite ser emitido, e a emissão exige provedor de
  e-mail. A gravação com `targetLabel: null` está provada pelo teste de rota e os rótulos existem nos três idiomas.

- [x] **Fork B2C não muda**
  Com `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED` vazia, `POST /organization/members/<id>/ownership` responde
  `404 ORGANIZATION_MEMBERS_DISABLED` antes de autenticar, a página da equipe continua 404 e o menu não mostra
  "Equipe".
  **Status:** ✅. API e app reiniciadas com a flag vazia: `404 ORGANIZATION_MEMBERS_DISABLED` sem sessão e com
  sessão, `/pt-br/organization` mostrou "Página não encontrada" e o menu lateral listou só Playground, Entidades e
  Configurações.

- [x] **A suíte E2E cobre o fluxo da equipe**
  `pnpm e2e` sobe a pilha com a flag ligada e percorre convite gravado no emulador, aceite pela conta convidada,
  transferência e saída do antigo dono, sem quebrar os specs existentes.
  **Status:** ✅ local: 23 de 23 em 1,6 min. O job `e2e` da PR roda depois do push.

- [x] **Tema e responsivo**
  O item do menu, o diálogo de confirmação e o toast ficam legíveis em light e dark, desktop e 375 px, sem rolagem
  horizontal da página.
  **Status:** ✅. Contraste medido: título do diálogo 19,8:1 (claro) e 18,97:1 (escuro); descrição 5,04:1 e 7,66:1;
  "Hacer dueño" no menu escuro 14,5:1. A 375 px o diálogo ocupa 343 px e a página não rola na horizontal.

- [x] **O diálogo funciona pelo teclado e devolve o foco**
  Abrir "Tornar dono" pelo teclado (Enter no item do menu) mostra o diálogo com foco em "Cancelar"; Enter em
  "Transferir" transfere uma vez; Esc ou os botões fecham e devolvem o foco ao título "Membros". A correção vale para
  todos os menus de ação, então editar, excluir, remover membro, reenviar e revogar convite e o menu de usuários do
  admin continuam funcionando pelo teclado e pelo mouse.
  **Status:** ✅ na rodada 2. Na rodada 1 falhou: o diálogo abria e fechava no mesmo Enter. Depois da correção em
  `action-menu.tsx`, Tab até "Mais ações", Enter e Enter deixam o diálogo aberto com foco em "Cancelar" e nenhum pedido
  à API; Esc devolve o foco ao `h2` "Membros"; Tab até "Transferir" e Enter fazem exatamente uma chamada a
  `/organization/members/<id>/ownership`. Sem regressão nos outros cinco menus, pelo teclado e pelo mouse.
