# Critérios de Aceite (Checklist)

Marcados com `[x]` os critérios que o `/test` mediu nesta rodada. Os dois que dependem de infra externa
(Arcjet real e falha real do Firebase Auth) ficam sem marca e aparecem como 🔒 no `report.md`, com o meio de cada
verificação.

- [x] **Admin não arquiva dono de equipe com outros membros**
  `DELETE /users/:id` de um perfil que é dono de uma organização onde existe pelo menos um vínculo de outra pessoa
  responde `409` com `{ "error": { "code": "USERS_DELETE_ORGANIZATION_HAS_MEMBERS" } }`. Nada muda: a assinatura não é
  cancelada, a conta não é desativada, as sessões não são revogadas, o perfil não ganha `deletedAt` e nenhum evento
  `user.delete` é gravado. A rota e o helper não leem `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED`, então a regra vale com
  a variável ligada ou desligada. Um vínculo de membro cujo perfil foi arquivado ainda conta como membro (o vínculo
  continua sem `deletedAt`); esse comportamento é conhecido e está registrado como achado para o backlog.

- [x] **Dono sozinho e perfil sem organização continuam arquiváveis**
  Quando a organização do alvo só tem o próprio dono, ou quando o perfil não tem organização de casa, o arquivamento
  segue como antes: cancela a assinatura viva, desativa a conta, revoga as sessões, marca `deletedAt`, grava o evento e
  responde `204`, na ordem `disable → revoke → delete`. Quem é só membro da organização de outra pessoa (e dono de uma
  organização de casa sem ninguém além dele) também é arquivável, porque o helper só olha a organização de casa.

- [x] **Ordem das recusas do arquivamento**
  Perfil inexistente responde `404 USERS_NOT_FOUND` e a própria conta do admin responde
  `403 USERS_SELF_LOCKOUT_FORBIDDEN`, as duas sem consultar a organização. A consulta da organização acontece antes de
  qualquer efeito (Stripe, Auth, Firestore, trilha de auditoria). A checagem usa o id do documento do perfil, e não o
  uid do Firebase: `ownerUserId` e o id do vínculo guardam o id do documento.

- [x] **Bloquear o dono continua possível**
  `PUT /users/:id` com `disabled: true` num dono com membros segue desativando a conta e revogando as sessões, sem a
  recusa nova. É o caminho de contenção numa conta comprometida, descrito em `docs/INCIDENT-RESPONSE.md`. Promover a
  admin o dono de uma organização com membros continua permitido e está fora deste corte.

- [x] **Mensagem do arquivamento recusado nos 3 idiomas**
  `apiErrors.USERS_DELETE_ORGANIZATION_HAS_MEMBERS` existe em pt-br, en e es, fala com o admin em terceira pessoa
  ("este usuário") e diz que nada foi arquivado e que os membros precisam sair ou ser removidos antes. O alerta da
  lista de usuários do admin chega a esse texto pelo `FormattedError`, sem mudança no `apps/app`; código ausente do
  dicionário cairia na mensagem genérica, por isso a paridade é o que protege o texto.

- [x] **A tabela de convites não gasta a cota do rate limit**
  Com `ARCJET_KEY` válida e a cota do IP estourada, `GET /organization/invitations` passa pelo proxy sem consultar o
  limitador. `OPTIONS` continua respondendo `204` antes do limitador, e `HEAD` também não conta, porque o mapa de
  exceção só aceita `POST`. Sem `ARCJET_KEY`, o limite é no-op e nada muda.

- [x] **O convite continua limitado**
  Com a cota estourada, `POST /organization/invitations` recebe `429 AUTH_RATE_LIMITED` com `Retry-After`. Os outros 16
  caminhos da lista continuam contando qualquer método: `GET /account/export` com a cota estourada também recebe `429`.
  A lista segue com 17 caminhos, e o `docs/SECURITY.md` diz que o de convite conta só o `POST`.

- [x] **Falha do Auth ao conferir o convidado responde com código**
  Se `getUserByEmail` falhar com qualquer código diferente de `auth/user-not-found` (por exemplo
  `auth/internal-error`), ou se a leitura do Firestore dentro da conferência falhar, `POST /organization/invitations`
  responde `503` com `{ "error": { "code": "ORGANIZATION_INVITATION_FAILED" } }`. Nenhum convite é gravado e nenhum
  e-mail sai. Como nada foi gravado, repetir o pedido depois da falha não cai no intervalo de reenvio de 60 s.

- [x] **Log da falha sem dado pessoal**
  A falha registra uma linha `[organization] invitation-member-check-failed` com `requestId` e `reason` (o código do
  Admin SDK, ou o `name` do erro quando não há código). A linha não traz o endereço convidado, o e-mail do dono nem a
  mensagem do erro, mesmo quando a mensagem contém o endereço.

- [x] **Mensagem do convite que falhou nos 3 idiomas**
  `apiErrors.ORGANIZATION_INVITATION_FAILED` existe em pt-br, en e es, diz que o convite não foi enviado e pede para
  tentar de novo em instantes. A tela da equipe mostra esse texto no alerta de erro do convite pelo `FormattedError`,
  sem mudança no `apps/app`.

- [x] **Comportamento anterior preservado no convite**
  Endereço sem conta (`auth/user-not-found`) segue para `201`; endereço que já é membro segue com
  `409 ORGANIZATION_INVITATION_ALREADY_MEMBER`; membro comum segue com `403 ORGANIZATION_FORBIDDEN`; admin personificando
  segue recusado como somente leitura; sem e-mail configurado segue `503 EMAIL_NOT_CONFIGURED` antes de ler o corpo.
  Reenvio dentro do intervalo segue `429` e o teto de pendentes segue `409`.

- [x] **Paridade de i18n e gates**
  `parity.test.ts` passa com os dois códigos novos nos três idiomas. `typecheck` da `api`, `pnpm --filter api test` e o
  `pnpm test` da raiz (que inclui `test:emulator`) passam, incluindo os três arquivos de teste do `DELETE /users/:id`
  com o mock novo do módulo de organização.

- [ ] **Rate limit real da Arcjet no convite**
  Num ambiente com `ARCJET_KEY` válida, depois de estourar a cota do IP, `POST /organization/invitations` recebe `429`
  e `GET /organization/invitations` continua respondendo `200`. Depende de chave real da Arcjet, pendência que já está
  no `docs/PRE-PRODUCTION.md`; o teste do proxy prova a lógica com o limitador mockado.

- [ ] **Falha real do Firebase Auth no convite**
  Uma indisponibilidade real do Firebase Auth durante a conferência do convidado produz o mesmo `503
  ORGANIZATION_INVITATION_FAILED` sem gravar convite. O emulador não produz esse tipo de falha sem mock, então o teste de
  rota é a única prova disponível.
