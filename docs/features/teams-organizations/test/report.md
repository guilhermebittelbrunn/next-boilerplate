# Relatório de QA: organizações, membros e convites

Rodada autônoma do `/cycle`, de 2026-10-22 a 2026-10-23, sobre o working tree de `9c793c6`. Branch
`guilhermebittelbrunn/tarefa-maior-/cycle`: não é protegida, e o nome fora do padrão é a decisão D1 do `review.md`.
Nada foi para o índice e nada foi commitado. Esta etapa não alterou código de produção.

Gravei este arquivo em partes, conforme as medições saíam. A sessão caiu uma vez no começo da passada de browser.
O que medi antes da queda está registrado com o valor que vi na hora; os processos daquela parte caíram junto com a
sessão e subi tudo de novo depois.

Resumo: 27 critérios, 23 ✅, 0 ❌, 4 🔒, depois da remedição da rodada 2 do `/review`. A primeira passada achou um
defeito de produção (D-1): com a flag desligada, o 404 de `/invite` mostrava "Convite para a equipe" no título da aba.
O `/review` corrigiu, e a remedição no build de produção confirmou a correção (seção "Remedição após a rodada 2 do
`/review`", no fim). Dos 13 itens de "Verificar no `/test`", 12 estão confirmados (o item 6 depois da remedição) e um
ficou 🔒 (rate limit sem `ARCJET_KEY`). A linha `test` do `STATE.md` fica `done`.

## Cobertura automatizada

| Comando | Resultado |
|---------|-----------|
| `pnpm test` (raiz, JDK 21, 1ª execução) | **falhou**: em `app#test`, 1 caso de 1083 (`organizationPagesSwitch.test.tsx`, `answer 404 for ""`) estourou os 20 s do `testTimeout`. O turbo abortou e o `api:test:emulator` saiu com SIGINT no meio |
| `vitest run __tests__/organizationPagesSwitch.test.tsx` (app, sozinho, antes da correção) | 4/4, o primeiro caso em 3,4 s |
| o mesmo arquivo depois da correção | 4/4, o primeiro caso em 251 ms |
| `pnpm turbo run typecheck --filter=api --filter=app` | 2/2, sem cache (havia arquivo de teste novo) |
| `pnpm exec biome check --write` nos 7 arquivos de teste que toquei | sem achado no fim (formatação e dois números mágicos corrigidos) |
| `pnpm test` (raiz, JDK 21, 2ª execução, já com os testes novos) | **15/15 tasks**, 12 do cache. `app` 1092 (127 arquivos), `api` 1634 (122), `api` `test:emulator` 265 (7), `web` 207 (26), `e2e` (vitest) 16 (2), `@repo/email` 208, `@repo/design-system` 171, `@repo/auth` 136, `@repo/internationalization` 67 (7), `@repo/shared` 56, `@repo/security` 45, `@repo/analytics` 34, `@repo/next-config` 32, `@repo/payments` 22, `@repo/sdk` 14. Zero falha em 3999 testes |
| `pnpm e2e` (Playwright, JDK 21) | **22/22** em 2,2 min: setup (4), `a11yDark` (9), `entityCrud`, `landing`, `panelSwitch` (2), `signIn` (4), `signUp`. Portas 3000-3002, 8080, 9099, 9199 e 4001 livres antes e depois |

Nenhum gate rodou com `--force`. Não remedi o `pnpm check` da raiz: o `/review` mediu 1045 arquivos, e esta etapa só
mexeu em arquivo de teste, que conferi com o Biome isolado. A paridade de i18n (67/67) roda dentro do `pnpm test`.
Nenhum arquivo do working tree mudou depois da 2ª execução (conferido pelo `mtime`), então os números valem para o
estado entregue.

### A falha da primeira execução

O caso `answer 404 for ""` faz `vi.resetModules()` e importa `invite/page.tsx` e `organization/page.tsx` dentro do
corpo do teste. As duas páginas puxam `InvitationAcceptance` e `OrganizationClient`, com o design system e o antd
inteiros, e esse tempo de importação conta no `testTimeout`. Sozinho, o caso leva 3,4 s; com a suíte inteira em
paralelo (126 arquivos de jsdom, a API e o emulador), passou de 20 s.

O teste não renderiza nenhum dos dois componentes: confere o `notFound()` e as props que a página entrega. Mockei os
dois módulos de cliente no próprio arquivo de teste, sem mexer em asserção nem no timeout, e o caso caiu para 251 ms.
Foi correção de arquivo de teste, não defeito de produção.

### Testes criados

| Arquivo | Nível | Caso | Motivo |
|---------|-------|------|--------|
| `apps/api/__tests__/organizationMembersRoute.test.ts` | rota com mock | `answers 404 when the member moved to another organization before the removal ran` | lacuna nova do `review.md`: `remove` devolvendo `false` → `404 ORGANIZATION_MEMBER_NOT_FOUND` não tinha caso |
| `apps/api/__tests__/organizationInvitationsRoute.test.ts` | rota com mock | `stores and sends nothing when Auth fails for a reason other than a missing account` | lacuna herdada de `isMemberOfOrganization`: um erro do Auth diferente de `auth/user-not-found` sobe, e o caso prova que nada é gravado nem enviado |
| `apps/api/__tests__/organizationMemberProfiles.test.ts` (novo) | unit | 150 membros → `getUsers` chamado com 100 e depois 50, todos com e-mail; sem conta para consultar, o Auth não é chamado | lacuna herdada: `describeOrganizationMembers` com mais de 100 membros |
| `apps/api/__tests__/organizationScope.emulator.test.ts` | **emulador de Firestore** | `leaves a membership that points at another organization and sends a removed member back home` | ver "Decisões de custo" |
| `apps/app/__tests__/invitationAcceptance.test.tsx` | componente | `keeps the accepted invitation on screen instead of asking again for the spent token` | lacuna nova do `review.md`: o mock da prévia sempre respondia sucesso. Agora a segunda chamada responde `ORGANIZATION_INVITATION_INVALID`, e o caso confere uma chamada só e nenhum cartão inválido |
| `apps/app/__tests__/organizationTeamPage.test.tsx` (novo) | componente | 8 casos: dono (formulário, convites, "Remover da equipe" fora da própria linha, expirado, reenviar, revogar, validação do e-mail, perfil arquivado), membro (sem coluna de ações, "Sair da equipe" atrás de confirmação, erro de carga traduzido), personificação (tudo visível, ações desligadas) | lacuna herdada: os quatro componentes da página da equipe não eram renderizados em teste |
| `apps/app/__tests__/organizationPagesSwitch.test.tsx` | ajuste | mock dos dois componentes de cliente | correção da falha por timeout |

Para provar que o caso do cartão piscando mede a correção 2 do `review.md`, troquei o `resetQueries({ predicate })`
de `InvitationAcceptance.tsx:214` por `resetQueries()` sem filtro: o caso novo falhou e os outros 7 passaram. O
arquivo de produção voltou ao original, conferido com `cmp` e com `grep` do predicado.

### Decisões de custo de teste

Criei um único teste da faixa cara, e como caso a mais num arquivo de emulador que o `test:emulator` já sobe:
`organizationScope.emulator.test.ts`, remoção de vínculo. Ele prova duas coisas que o repositório mockado não
reproduz. A primeira é a transação de `organizationMemberRepository.remove`: ela devolve `false` e não apaga nada
quando o vínculo aponta para outra organização. A segunda é que, depois do `delete`, o `create()` do resolvedor
regrava o vínculo de dono na organização de casa, com o mesmo id e sem criar uma segunda organização. Se a remoção
virasse `deletedAt`, o `create()` falharia para sempre, e só o Firestore real mostra isso.

| Módulo tocado | Teste novo? | O que já cobria |
|---------------|-------------|-----------------|
| rotas de `entity` (escopo) | não | `entitiesRouteOrganizationScope.test.ts` e os cinco testes de rota ajustados; isolamento real em `organizationScope.emulator.test.ts` |
| guard `requireOrganizationApi` | não | `organizationGuard.test.ts`, `impersonationReadOnly.test.ts` |
| resolvedor e retrocarga | não | `organizationMembership.test.ts` (unit) e `organizationScope.emulator.test.ts` (corrida, retrocarga, `updatedAt`) |
| convites (emissão, aceite, prévia) | sim, 1 caso de rota | `organizationInvitationsRoute.test.ts`, `invitationsRoutes.test.ts`, `organizationInvitation.emulator.test.ts` |
| teto de 20 convites e intervalo de 60 s | não | os dois limites saem da transação de `issue`. A rota cobre o mapeamento com mock e o emulador cobre a transação (unicidade). Um caso de emulador com 21 convites repetiria a mesma transação sem caminho novo, então a lacuna fica aceita |
| membros, remoção e saída | sim, 1 caso de rota e 1 de emulador | `organizationMembersRoute.test.ts` |
| upload com `scope` | não | `fileUploadRoute.test.ts`, `storageEmulatorIsolation.test.ts` |
| exclusão e exportação | não | `accountErasure.test.ts`, `accountDeletionRoute.test.ts`, `accountExportRoute.test.ts`, `accountErasureStorage.emulator.test.ts` |
| página da equipe | sim, 8 casos | nada antes |
| página de aceite | sim, 1 caso | `invitationAcceptance.test.tsx` (7 casos) |
| prefetch RSC da página da equipe | não | continua sem teste |

## Verificar no `/test`

Primeira parte, medida antes da queda da sessão, com a flag vazia na `api` e na `app`, emulador semeado do zero e
`curl` com o ID token do emulador (`POST accounts:signInWithPassword` no Auth emulado):

- **Item 1, isolamento.** Com o token de `user@example.com`: `GET`, `PUT` (corpo válido e também com
  `organizationId`/`userId` no corpo) e `DELETE /entities/<id de user2>` responderam
  `404 {"error":{"code":"ENTITY_NOT_FOUND"}}`, nas duas situações: com o registro de `user2` ainda sem carimbo e
  depois de carimbado na organização de `user2`. `GET /entities?limit=50` devolveu só os 4 registros de `user`
  (uma organização), `GET /entities/summary` devolveu `total: 4, enabled: 3, franchise: 2, customer: 1,
  collaborator: 1`, e o token de `user2` recebeu 404 no "Acme Franchise" de `user`. Um `POST /entities` com
  `organizationId` e `userId` de `user2` no corpo gravou o registro com a organização e o perfil de `user` (apaguei o
  registro em seguida, `204`). Na segunda parte repeti o `PUT` com corpo válido no registro de `user2`: `404` de
  novo, e o documento continuou com o nome "Other Owner Shop" e o mesmo `updatedAt`.
- **Item 2, retrocarga.** Antes de qualquer pedido, os 4 registros de `user` não tinham `organizationId`, com
  `updatedAt` de 16:17:35.125Z. Depois do primeiro pedido, os 4 tinham o `organizationId` da organização nova, o
  `updatedAt` continuava 16:17:35.125Z e o vínculo de dono estava com `legacyClaimPending: false`. A tela de
  `/pt-br/entities` listou "Acme Franchise", "Retired Unit", "Joana Ribeiro" e "Marcos Pereira".
- **Item 10, segunda metade (personificar quem não tem organização).** `user2` ainda não tinha vínculo. O admin, com
  `x-request-role: common` e `x-request-user-id` de `user2`, fez `GET /entities`: vieram "Alex Moreira" e "Other
  Owner Shop", já carimbados. Diferença no Firestore antes e depois do pedido: organização nova, vínculo novo de
  `user2` (dono, `legacyClaimPending: false`), os 2 registros de `user2` carimbados com `updatedAt` intacto. Fora
  isso, só o que qualquer pedido personificado já gravava antes desta entrega: o `auditEvent` da sessão de
  personificação, o documento `session` do token do admin e o `lastAccess` do perfil do admin. O perfil de `user2`
  não mudou. Um `POST /entities` personificado respondeu `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`.
- **Item 6, modo degradado (parte da API).** As 9 rotas da fase B (`GET /organization`, `GET /organization/members`,
  `DELETE /organization/members/abc`, `POST /organization/leave`, `GET` e `POST /organization/invitations`,
  `DELETE /organization/invitations/abc`, `POST /invitations/preview`, `POST /invitations/accept`) responderam
  `404 {"error":{"code":"ORGANIZATION_MEMBERS_DISABLED"}}` sem credencial e com o token de `user`.
- **Item 6, modo degradado (parte da tela).** Varri o `innerText` e os atributos `aria-label`, `title` e
  `placeholder` de `/<idioma>`, `/entities`, `/entities/create`, as cinco abas de `/account`, `/playground`,
  `/organization` e `/invite?token=abc`, nos três idiomas, procurando `equipe`, `team`, `equipo` e `organiza`. Nenhuma
  ocorrência no texto visível vindo desta entrega. O menu lateral mostra "Playground", "Entidades" e "Configurações" (Geral,
  Segurança, Preferências, Cobrança). `/<idioma>/invite` responde 404 nos três idiomas; `/<idioma>/organization`
  logado mostra "Página não encontrada" e deslogado redireciona para o login, como qualquer rota autenticada. Duas
  ressalvas:
  - O `/playground` mostra "Team plan" e "organizados por seção". As duas strings já estavam lá antes desta entrega
    (`git grep`), fora do diff.
  - **O título da aba do 404 de `/invite` vaza a cópia da equipe.** Com a flag vazia, o 404 de `/pt-br/invite`
    entrega `title` "Convite para a equipe | next-boilerplate", `description` "Aceite o convite para entrar na
    equipe" e o mesmo texto em `og:title` e `apple-mobile-web-app-title`; em `/en/invite`, "Team invitation"; em
    `/es/invite`, "Invitación al equipo". Medido no `next dev`; a confirmação no build está logo abaixo.
- **Confirmação do título no build.** Com `pnpm --filter app exec next build` (flag vazia, env do emulador) e
  `next start -p 3090`, `/pt-br/invite?token=abc` respondeu 404 com a página "Página não encontrada", e a aba do
  navegador ficou com o título "Convite para a equipe | next-boilerplate"; `/es/invite` ficou com "Invitación al
  equipo | next-boilerplate". O RSC do 404 traz o mesmo texto em `og:title`, `apple-mobile-web-app-title` e
  `description`. É defeito de produção, descrito em "Defeitos".

Segunda parte, depois da queda da sessão. Emulador semeado de novo do zero; `api` e `app` em `next dev` com o
ambiente do e2e (`.env.example` mais o bloco do emulador, `.env` local ignorado):

- **Item 9, flag ligada só na `app`.** `api` com a flag vazia, `app` com `"true"`. O menu lateral passou a mostrar
  "Equipe". Em `/pt-br/organization`, a área de conteúdo mostrou "Equipes não estão disponíveis neste ambiente.
  (Código do erro: <id do pedido>)", 1,78 s depois de abrir a página (já compilada), com dois `GET /organization`
  respondendo `404`: o pedido e a única nova tentativa do `QueryProvider` (`retry: 1`). Nenhum 500, nenhum código cru.
- **F8, sem Resend.** `api` com a flag ligada e `RESEND_*` vazios. Como dono, o formulário barrou o envio vazio com
  "Informe o e-mail." e `nao-e-email` com "Informe um e-mail válido.", sem nenhum `POST`. Um endereço válido gerou
  `POST /organization/invitations` → `503`, o toast "O envio de e-mails não está configurado. Fale com o suporte.
  (Código do erro: …)" e nenhum documento em `organizationInvitation`.
- **F7 e F16 (envio).** `api` com `RESEND_FROM`/`RESEND_TOKEN` de placeholder (`re_…`), que o provedor recusa.
  Duplo clique em "Enviar convite" para `qa-teams-organizations+1@example.com` gerou **um** `POST` (`201`), o aviso
  "O convite foi criado, mas o e-mail não saiu. Tente reenviar em instantes.", o campo limpo e a linha em
  "Convites pendentes" com "Enviado em" 23/10 00:45 e "Expira em" 30/10 00:45 (7 dias). O log da API registrou
  `[email] failed template=action-link reason=provider-error locale=pt-br` e
  `[organization] invitation-delivery-failed requestId=…`; o log inteiro da API tinha 0 ocorrências de
  `qa-teams-organizations`. "Reenviar" no menu da linha, logo depois, gerou `429` e o toast "Um convite acabou de
  ser enviado para este e-mail. Aguarde um minuto para reenviar. (Código do erro: …)". O documento gravado tem
  `tokenHash` e nenhum campo de token; o `GET /organization/invitations` devolve `id`, `email`, `role`, `status`,
  `expiresAt`, `lastSentAt` e `createdAt`, sem `tokenHash`. "Revogar" abriu a confirmação "Revogar este convite?"
  com "Não" e "Sim"; "Sim" gerou `DELETE` → `204`, o toast "Convite revogado.", a lista com "Nenhum convite
  pendente." e zero documentos na coleção.
- **Item 7 (F9), cadastro a partir do convite.** Convite semeado para `qa-teams-organizations@example.com` com token
  conhecido (hash calculado como em `organization-invitation.ts`). Deslogado, `/pt-br/invite?token=…` mostrou
  "Convite para a equipe", "user@example.com convidou qa-teams-organizations@example.com para a equipe.", "O convite
  vale até 30 de out. de 2026, 00:47." e os botões "Entrar" e "Criar conta", os dois com
  `redirect=/pt-br/invite?token=…`. O cadastro por "Criar conta" (o campo de e-mail não vem preenchido) gravou a
  organização de casa e o vínculo de dono da conta nova, deixou o onboarding pendente (`step: profile`) e voltou
  **direto ao convite, sem passar pelo onboarding**. O aceite funcionou, e o `push` para `/pt-br/organization` foi
  desviado pelo proxy para `/pt-br/onboarding?redirect=%2Fpt-br%2Forganization`; concluído o onboarding (nome e
  idioma), a pessoa chegou a `/pt-br/organization`. A ordem é outra (aceite antes do onboarding, não depois), mas o
  convite é aceito e o onboarding é feito, então não conto como defeito.
- **Item 3, aceite (correção 2).** Com um `MutationObserver` instalado na página antes do clique, procurando "Este
  convite não vale mais" e "expirou" no `innerText`: duplo clique em "Aceitar convite" gerou **um**
  `POST /invitations/accept` (`200`), nenhum novo `POST /invitations/preview`, e o observador terminou vazio até a
  página da equipe. Lá, o membro viu "Membros" com duas linhas ("Sem nome / user@example.com / Dono" e "QA Membro /
  qa-teams-organizations@example.com / Membro"), a seção "Sair da equipe" e nenhum formulário de convite, tabela de
  convites ou coluna "Ações".

- **Item 3, registros depois do aceite.** Em `/pt-br/entities`, o membro viu os 6 registros da organização do dono
  ("QA Foto Organização", "Joana Ribeiro", "Acme Franchise", "Retired Unit", "Marcos Pereira" e, depois, o dele).
  O membro criou "QA Registro do Membro": o documento ficou com o `organizationId` do dono e o `userId` do membro, e
  o dono passou a ver o registro na lista dele.
- **Item 5 (F4), upload.** Como dono, a foto do formulário de `entity` foi enviada por
  `POST /files?scope=organization` (`201`), e o registro "QA Foto Organização" ficou com
  `photo: uploads/org-<id da organização>/<uuid>.png`; no Storage emulado o objeto está no mesmo caminho. O avatar,
  pela aba "Geral" da conta, foi por `POST /files` sem `scope` (`201`) e caiu em `uploads/<id do perfil do dono>/`.
- **F10, edição pelo membro.** O membro abriu `/pt-br/entities/edit/<id de "QA Foto Organização">` (registro do dono,
  com foto), mudou só a descrição e salvou: `PUT /entities/<id>` → `200`, toast "Entidade atualizada com sucesso.",
  descrição "Editado pelo membro", `photo` igual e `userId` ainda o do dono. Nenhum `ENTITY_PHOTO_INVALID`.
- **F11, outro e-mail.** `user2@example.com` logado abriu um convite para `qa-teams-organizations+2@example.com`:
  continuou em `/pt-br/invite?token=…` (não foi mandado para a home), viu "Você está conectado como
  user2@example.com." e "Este convite foi enviado para qa-teams-organizations+2@example.com. Entre com essa conta
  para aceitar.", com o botão "Entrar com outra conta" e sem "Aceitar convite". Direto na API, o aceite com o token de
  `user2` respondeu `403 ORGANIZATION_INVITATION_EMAIL_MISMATCH`.
- **Item 8, "Entrar com outra conta".** Com `history.pushState` e `replaceState` instrumentados antes do clique, o
  clique registrou **um** `push`, para `/pt-br/sign-in?redirect=%2Fpt-br%2Finvite%3Ftoken%3D…`, e a página final foi o
  login com esse `redirect`. O `push` do provider não chegou ao histórico; o que fica é o do componente, com o
  convite preservado.
- **F12, tokens recusados.** Token semeado com `expiresAt` no passado: cartão "Este convite expirou" / "Peça um
  convite novo a quem convidou você." (`400 ORGANIZATION_INVITATION_EXPIRED` na prévia). Token bem formado e
  desconhecido, `token=` vazio e `token=abc`: cartão "Este convite não vale mais" (`400 ORGANIZATION_INVITATION_INVALID`
  ou `400 VALIDATION_FAILED` na prévia). Nenhum dos quatro mostra "Aceitar convite". Depois de revogar um convite
  semeado pela API (`204`), a prévia do mesmo token respondeu `400 ORGANIZATION_INVITATION_INVALID`; revogar de novo,
  `404 ORGANIZATION_INVITATION_NOT_FOUND`; `user2` tentando revogar um convite da organização de `user`, também
  `404 ORGANIZATION_INVITATION_NOT_FOUND`; e o dono revogando o convite já aceito, `404` com o mesmo código.
- **Papéis, direto na API.** Membro em `GET` e `POST /organization/invitations` e em
  `DELETE /organization/members/<dono>`: `403 ORGANIZATION_FORBIDDEN`; o mesmo membro em `GET /organization`:
  `200` com `viewerRole: "member"`. Dono em `GET /users` (rota de admin): `403 ADMIN_FORBIDDEN`. Admin sem
  personificar em `GET /organization`, `GET /entities` e `POST /invitations/accept`: `403 COMMON_PANEL_FORBIDDEN`.
  Dono convidando o membro (com maiúsculas no endereço) e a si mesmo: `409 ORGANIZATION_INVITATION_ALREADY_MEMBER`.
  Dono em `POST /organization/leave` e em `DELETE /organization/members/<ele mesmo>`:
  `409 ORGANIZATION_OWNER_CANNOT_LEAVE`. Dono removendo `user2` (outra organização) ou um id inexistente:
  `404 ORGANIZATION_MEMBER_NOT_FOUND`. O membro aceitando de novo o token que já usou: `200` com a mesma organização.
- **Item 11 (F15), exclusão do dono com membro.** Na aba "Privacidade", "Excluir minha conta" com uma senha errada
  qualquer gerou `POST /account/deletion` → `409` e a mensagem "A sua equipe ainda tem membros. Remova-os antes de
  excluir a conta. (Código do erro: …)". A senha errada não virou "senha incorreta", ou seja, a recusa vem antes da
  conferência da senha. O perfil do dono continuou sem `deletedAt`.
- **Item 10, personificação na página da equipe.** O admin trocou para "Painel do usuário" e escolheu
  `user@example.com` (dono). `/pt-br/organization` mostrou "Modo somente leitura", "Ações de criação, edição e
  exclusão ficam bloqueadas enquanto você atua como outro usuário." e "Atuando como: user@example.com", os dois
  membros, o convite vencido com o selo "Expirado", "Enviar convite" desabilitado e nenhum menu de ações nas linhas.
  Personificando o membro, "Sair da equipe" aparece desabilitado.

- **Item 4, remoção e saída (correção 1).** O dono abriu o menu da linha do membro (a linha dele não tem menu),
  "Remover da equipe", a confirmação "Remover este membro?" e "Sim": `DELETE /organization/members/<id>` → `204` e o
  toast "Membro removido da equipe.". No pedido seguinte, com o token do ex-membro, `GET /entities/<registro do dono>`
  respondeu `404 ENTITY_NOT_FOUND`, `GET /organization` devolveu a organização de casa criada no cadastro (mesmo id)
  com `viewerRole: "owner"`, e `GET /entities` veio vazio. O registro que ele criou na equipe ficou lá, com o
  `organizationId` do dono. Para a saída pela tela, criei "QA Registro de Casa" na organização de casa, aceitei um
  convite novo (o registro de casa sumiu da lista e os da equipe apareceram) e, numa janela marcada com uma variável
  global, cliquei em "Sair da equipe" e "Sair" na confirmação ("Sair da equipe?" / "Para voltar, você vai precisar
  de um convite novo do dono."): `POST /organization/leave` → `204`, o toast "Você saiu da equipe.", os `GET` de
  organização, membros e convites refeitos, a página virou a visão de dono (formulário de convite, uma linha "Dono")
  e a variável continuou na janela, ou seja, sem recarregar. Em "Entidades", só "QA Registro de Casa". Como a API
  rodou contra o emulador de Firestore, a transação nova do `remove` rodou de verdade nos dois caminhos.
- **F15, segunda metade.** De volta à equipe, o membro excluiu a própria conta pela aba "Privacidade", com a senha:
  `POST /account/deletion` → `200` e redirecionamento para `/pt-br/sign-in?redirect=%2Fpt-br`. Depois: o perfil e a
  organização de casa sumiram, "QA Registro de Casa" sumiu com ela, "QA Registro do Membro" continuou na organização
  do dono (com o `userId` do perfil apagado), o convite endereçado ao membro foi apagado e o dono ficou com um vínculo
  só. A exportação do dono (`GET /account/export`) trouxe `membership` (`organizationId`, `role: "owner"`,
  `joinedAt`) e, em `records.entities`, só os 5 registros que ele criou, sem o do membro.
- **Item 12, tabelas em light, dark e mobile.** Contraste medido com `getComputedStyle`, cores convertidas por canvas e
  fundo composto pelas camadas: dark, cabeçalho da tabela 14,50:1 (texto 250,250,250 sobre 38,38,38), célula
  17,01:1, texto secundário 6,87:1, selo "Expired" 6,00:1; light, cabeçalho 18,16:1, célula 18,97:1, texto
  secundário 4,83:1, selo "Expirado" 4,77:1. As tabelas antd seguem o tema nos dois. A 375 px a página não rola na
  horizontal (`scrollWidth` 360 com viewport 375); as duas tabelas rolam dentro do próprio contêiner (largura útil
  296, conteúdo 741 e 650). O foco por teclado no botão "Enviar convite" mostra o anel de 3 px (`:focus-visible`).
  Percorri a página da equipe em pt-br light desktop e mobile, en dark desktop e es dark mobile, e a página do convite
  em pt-br light desktop e mobile, en dark desktop (deslogado), en dark mobile (logado) e es dark mobile.
- **Item 13, rate limit.** 🔒. Rodei sem `ARCJET_KEY`, como o e2e; o `429` por IP não é observável assim. A lista de
  caminhos está coberta em `corsOrigin.test.ts`.
- **Erros traduzidos, amostra na tela.** pt-br: `EMAIL_NOT_CONFIGURED`, `ORGANIZATION_INVITATION_RECENTLY_SENT`,
  `ORGANIZATION_MEMBERS_DISABLED`, `ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS`. en: `ORGANIZATION_INVITATION_ALREADY_MEMBER`
  ("This person is already part of the team. (Error code: …)"). es: o mesmo código ("Esta persona ya forma parte del
  equipo. (Código del error: …)"). Nenhum código cru, nenhum stack. Os 13 códigos têm as três entradas
  (paridade 67/67).

## Resumo da lista "Verificar no `/test`"

| # | Item | Veredito |
|---|------|----------|
| 1 | Isolamento entre organizações pela API | **confirmado**: `404 ENTITY_NOT_FOUND` em `GET`/`PUT`/`DELETE`, com o registro alheio sem carimbo e carimbado; lista e resumo só da organização |
| 2 | Retrocarga do seed | **confirmado**: 4 registros carimbados, `updatedAt` 16:17:35.125Z antes e depois, `legacyClaimPending` limpo |
| 3 | Aceite sem cartão inválido | **confirmado**: 1 `POST` no duplo clique, nenhuma prévia refeita, observador vazio; equipe e registros da organização nova na tela |
| 4 | Remoção e saída voltam para casa | **confirmado**, com a transação contra o emulador de Firestore |
| 5 | Foto em `uploads/org-<id>/`, avatar em `uploads/<profileId>/` | **confirmado** no documento e no Storage emulado |
| 6 | F6, nada de equipe com a flag vazia | **derrubado na primeira passada, confirmado na remedição**: rotas `404 ORGANIZATION_MEMBERS_DISABLED` e texto das páginas limpos; o título do 404 de `/invite` vazava a cópia da equipe (D-1) e, depois da rodada 2, mostra "Página não encontrada" nos três idiomas, no build |
| 7 | F9, cadastro a partir do convite | **confirmado com ressalva**: o cadastro volta ao convite antes do onboarding, e o onboarding acontece depois do aceite, a caminho da equipe |
| 8 | "Entrar com outra conta" | **confirmado**: um `push` só no histórico, para o login com `redirect` do convite |
| 9 | Flag só na `app` | **confirmado**: texto traduzido de `ORGANIZATION_MEMBERS_DISABLED` em 1,78 s, 2 pedidos |
| 10 | Personificação na página da equipe | **confirmado**: tudo visível, ações desligadas, aviso de somente leitura; `GET` personificado cria organização e vínculo e só carimba os registros |
| 11 | F15, `409` antes da senha | **confirmado**: senha errada recebe a mensagem do `409`, nada apagado |
| 12 | Tabelas light, dark e mobile | **confirmado**, contrastes acima |
| 13 | Rate limit com `ARCJET_KEY` | 🔒 sem a chave |

## Critérios de aceite, item a item

O texto de cada critério e a evidência completa estão em `test/criterios-aceite.md`.

| # | Critério | Status | Meio |
|---|----------|--------|------|
| 1 | Toda conta comum nova nasce com uma organização em que é dona | ✅ | e2e (tela e `signUp.spec.ts`) + unit |
| 2 | Quem já existia é migrado no primeiro pedido | ✅ | API + leitura do emulador + teste de emulador |
| 3 | Registro de outra organização responde 404 | ✅ | API direto + emulador |
| 4 | Membros compartilham os registros | ✅ | e2e + rota |
| 5 | Fotos da organização, avatar da pessoa | ✅ | e2e + Storage emulado + rota |
| 6 | Personificação na organização do personificado, só leitura | ✅ | e2e + API direto |
| 7 | Papel na organização × papel de plataforma | ✅ | API direto |
| 8 | Fork B2C não vê organização | ✅ | API direto + e2e + build (D-1 corrigido e remedido) |
| 9 | O dono convida por e-mail | ✅ | e2e + hook + rota |
| 10 | Sem e-mail configurado degrada com código | ✅ | e2e + rota |
| 11 | O token nunca fica guardado nem é devolvido | ✅ | emulador + API + log + rota |
| 12 | Reenvio idempotente, com teto e intervalo | ✅ | e2e (429, 409) + emulador + rota (teto) |
| 13 | Revogar invalida o link | ✅ | e2e + API direto |
| 14 | Página do convite deslogado e logado | ✅ | e2e |
| 15 | Aceitar exige o e-mail do convite e vale uma vez | ✅ | e2e + API + emulador |
| 16 | E-mail já cadastrado não cria conta duplicada | ✅ | e2e + leitura do código |
| 17 | Aceitar troca de organização sem perder a anterior | ✅ | e2e + emulador + rota |
| 18 | Lista de membros | ✅ | e2e + componente |
| 19 | A organização nunca fica sem dono | ✅ | e2e + API direto |
| 20 | Remover e sair cortam o acesso no pedido seguinte | ✅ | e2e + API direto + emulador |
| 21 | Exclusão e exportação separam pessoa e organização | ✅ | e2e + API + unit + emulador |
| 22 | Erros traduzidos nos três idiomas | ✅ | paridade + e2e (amostra nos três idiomas) |
| 23 | Tema e responsivo | ✅ | e2e (contraste medido, 375 px, foco) |
| 24 | Entrega real do e-mail de convite | 🔒 | precisa de Resend com domínio |
| 25 | Limite por IP nas rotas de convite | 🔒 | precisa de `ARCJET_KEY` |
| 26 | Índices compostos publicados antes do deploy | 🔒 | precisa do projeto real |
| 27 | TTL dos convites | 🔒 | precisa do projeto real |

## Cross-check

Conferido nesta rodada: comum (dono e membro) × admin personificando × não autenticado; flag vazia × ligada nas duas
apps × ligada só na `app`; light × dark; desktop × 375 px; pt-br × en × es. Ficou de fora o modo `simple`
(`NEXT_PUBLIC_PRODUCT_MODE`), porque o diff não toca na escolha de painel, e a `apps/web`, que não consome
`EntityDTO` nem as telas novas.

## Defeitos

### D-1. O 404 de `/invite` com a flag desligada mostrava a cópia da equipe no título (corrigido na rodada 2)

Estado: corrigido pelo `/review` na rodada 2 e remedido no build de produção (ver o fim do arquivo). O registro abaixo
é o da primeira passada.

- Onde: `apps/app/app/[locale]/(unauthenticated)/invite/page.tsx:20-26`. O `generateMetadata` monta os metadados de
  `dictionary.apps.app.pages.invitation.meta` sem conferir `isOrganizationMembersEnabled()`; só a página chama
  `notFound()`, e o Next aplica os metadados da rota ao 404.
- Repro: `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED` vazia na `app`. `pnpm --filter app exec next build` e
  `next start`. Abrir `/pt-br/invite` (com ou sem `token`). Resposta `404`, corpo "Página não encontrada / O endereço
  que você acessou não existe ou foi movido.", e `document.title` = "Convite para a equipe | next-boilerplate". Em
  `/en/invite`, "Team invitation | next-boilerplate"; em `/es/invite`, "Invitación al equipo | next-boilerplate". O
  payload também leva `description` "Aceite o convite para entrar na equipe", `og:title` e
  `apple-mobile-web-app-title` com o mesmo título. Igual no `next dev`.
- Efeito: um fork B2C mostra "equipe" na aba e na prévia de link de quem abrir `/invite`, contra o critério "Fork
  B2C não vê organização" e o F6 do plano.
- Correção sugerida (hipótese para o `/review`): no `generateMetadata`, com a flag desligada, não usar a cópia do
  convite (devolver os metadados neutros do 404 ou chamar `notFound()` antes); e um caso em
  `organizationPagesSwitch.test.tsx` para o `generateMetadata` com a flag vazia.
- `/organization` não tem o problema: a página não define `generateMetadata`, e o título ficou "Painel do usuário".

## Observações (🟢, não bloqueiam)

- No formulário de convite, o rodapé (`Footer` com `className="static border-t-0 bg-transparent"`) aparecia como uma
  faixa de outra cor em volta de "Enviar convite": branca sobre o cartão cinza no light e quase preta no dark. O
  `/review` corrigiu na rodada 2, e a remedição confirmou que a faixa sumiu.
- "Criar conta" a partir do convite abre o cadastro com o campo de e-mail vazio; a pessoa digita o endereço do convite.
- Contas sem nome de exibição aparecem como "Sem nome" na lista de membros (o dono do seed é assim).

## Lacunas herdadas

| Lacuna (origem) | Veredito |
|-----------------|----------|
| quatro componentes da página da equipe sem teste de render (handoff, review) | **fechada**: `organizationTeamPage.test.tsx`, 8 casos |
| prefetch RSC da página da equipe sem teste (handoff, review) | **continua aberta**. Não medi a hidratação em separado; a página abriu com os dados em todas as passadas |
| `describeOrganizationMembers` com mais de 100 membros (handoff, review) | **fechada**: `organizationMemberProfiles.test.ts` |
| teto de 20 convites e intervalo de 60 s só com mock (handoff, review) | **meio fechada**: o intervalo de 60 s foi medido no browser contra o emulador (`429` no reenvio). O teto de 20 continua só com mock, como lacuna aceita (ver "Decisões de custo") |
| `isMemberOfOrganization` com erro do Auth diferente de `user-not-found` (handoff, review) | **fechada** quanto ao efeito: o caso novo prova que nada é gravado nem enviado. O pedido continua terminando em 500 sem `error.code`, o mesmo de outras rotas quando o Admin SDK falha |
| nenhuma spec E2E nova, decisão P18 (handoff, review) | **fora de escopo**: spec da fase B exige outra pilha com a flag ligada. O `pnpm e2e` cobre a fase A com a flag vazia (22/22) |
| `remove` devolvendo `false` → `404` sem caso (review) | **fechada**: caso de rota e caso de emulador |
| teste do aceite não pegaria o cartão inválido piscando (review) | **fechada**: caso de componente com prova por mutação e medição no browser |

## Ambiente do e2e

Tudo subido por mim, neste checkout, com as portas conferidas livres antes (`lsof -ti tcp:<porta>`). Nada do
usuário estava de pé, então não reutilizei nenhum serviço.

| Processo | Como | Fim |
|----------|------|-----|
| `pnpm test` e `pnpm e2e` | o próprio comando sobe e derruba emulador e servidores | portas livres depois |
| emulador (`pnpm emulators`, JDK 21: Auth 9099, Firestore 8080, Storage 9199, UI 4001) | duas vezes (antes e depois da queda da sessão) | `SIGINT` pelo PID; 9099, 8080, 9199, 4001, 4400 e 4500 livres |
| `api` em `next dev -p 3002` | três vezes, com a flag vazia, ligada sem Resend e ligada com Resend de placeholder | `TERM` pelo PID da árvore |
| `app` em `next dev -p 3000` | com a flag vazia e depois ligada | `TERM` pelo PID da árvore |
| `app` em `next start -p 3090` | build de produção com a flag vazia, só para confirmar o D-1 | `TERM` pelo PID |

Conferência final: 3000, 3001, 3002, 3003, 3090, 4000, 4001, 4400, 4500, 8080, 8085, 9099, 9150 e 9199 livres, e
nenhuma sessão do `agent-browser` aberta. O harness temporário (gerador de ambiente, semeador de convite com o hash de
`organization-invitation.ts`, leitor do Firestore, tokens e senha da conta de QA) ficou em `/tmp/qa-teams` e foi
apagado. Os prints estão em `test/e2e/` (14 arquivos), que o `.gitignore` descarta.

O build da `app` gravou em `apps/app/.next/`, que já existia e é ignorado pelo git.

## Dados de QA e estado de dev

Tudo foi criado nos emuladores, que pararam sem exportar dados: nada sobrou e nada foi para projeto Firebase real.
Por isso nenhuma conta entra em `docs/PRE-PRODUCTION.md`.

- Conta `qa-teams-organizations@example.com`, criada pela tela de cadastro e excluída por ela mesma no F15. A senha
  ficou só no harness apagado; não gravei em `.claude/dev-credentials.local.md` porque a conta não existe mais.
- Convites para `qa-teams-organizations+1@example.com` (pela tela, revogado), `qa-teams-organizations@example.com`
  (semeado quatro vezes, apagado com a conta), `+2` (semeado, revogado), `+3` (semeado vencido) e `+4` (semeado).
- Registros "QA Foto Organização", "QA Registro do Membro", "QA Registro de Casa" (apagado com a conta) e
  "QA scope probe" (apagado na hora); uma foto e um avatar no Storage emulado.
- As contas do seed (`admin@example.com`, `user@example.com`, `user2@example.com`) usaram a senha pública do seed,
  que só existe nos emuladores.

## Remedição após a rodada 2 do `/review`

2026-10-23. O `/review` corrigiu o D-1 em `invite/page.tsx` (com a flag desligada, o `generateMetadata` devolve o título
e a descrição de `common.notFound`) e a faixa do rodapé em `InviteMemberForm.tsx` (`backdrop-blur-none
supports-backdrop-filter:bg-transparent` no `className` do `Footer`). Remedi só esses dois pontos.

### D-1 no build de produção

Instrumento: `pnpm --filter app exec next build` com o ambiente do e2e e a flag vazia, `next start -p 3090`, `curl` em
`/<idioma>/invite?token=abc` e `/<idioma>/invite`. O Next 16 entrega os metadados no payload RSC do corpo, não num
`<title>` do `<head>` (o mesmo vale para um user agent de robô), e é desse payload que o navegador tira o título da aba.
Li os quatro campos dali.

| Idioma | Status | `title` e `og:title` e `apple-mobile-web-app-title` | `description` |
|--------|--------|------------------------------------------------------|---------------|
| pt-br | 404 | "Página não encontrada \| next-boilerplate" | "O endereço que você acessou não existe ou foi movido." |
| en | 404 | "Page not found \| next-boilerplate" | "The address you opened does not exist or has been moved." |
| es | 404 | "Página no encontrada \| next-boilerplate" | "La dirección que abriste no existe o se ha movido." |

Com e sem `token`, o resultado foi o mesmo. A busca por equipe, team, equipo, convite, invitation, invitación e
organiza deu zero ocorrências nos quatro campos e no payload inteiro, nos três idiomas.

A flag é `NEXT_PUBLIC_*`, embutida no build, então o caso ligado pediu um segundo build (com `"true"`), servido com
`next start -p 3000`. Ali `/<idioma>/invite?token=abc` respondeu 200, com "Convite para a equipe | next-boilerplate" /
"Aceite o convite para entrar na equipe", "Team invitation | next-boilerplate" / "Accept the invitation to join the
team" e "Invitación al equipo | next-boilerplate" / "Acepta la invitación para unirte al equipo". O D-1 está
corrigido, e o critério "Fork B2C não vê organização" passa a ✅.

`vitest run` de `organizationPagesSwitch.test.tsx` e `organizationTeamPage.test.tsx`: 2 arquivos, 19 testes (11 e 8),
verdes.

### Faixa do rodapé do formulário de convite

Instrumento: o build com a flag ligada em `next start -p 3000`, a `api` em `next dev -p 3002` com a flag ligada,
emulador semeado, `user@example.com` (dono) em `/pt-br/organization` no `agent-browser`. Para o rodapé (o elemento do
`Footer` dentro do `<form>`), li o fundo próprio, o `backdrop-filter` e o fundo efetivo composto pelas camadas,
comparado com o do cartão; e o contraste do botão "Enviar convite".

| Tema e largura | Fundo do rodapé | `backdrop-filter` | Fundo efetivo × cartão | Botão (texto × fundo) |
|----------------|-----------------|-------------------|------------------------|------------------------|
| light, 1366 px | transparente | `none` | 250,250,250 = 250,250,250 | 17,18:1 |
| dark, 1366 px | transparente | `none` | 24,24,24 = 24,24,24 | 17,18:1 |
| dark, 375 px | transparente | `none` | 24,24,24 = 24,24,24 | 17,18:1 |
| light, 375 px | transparente | `none` | 250,250,250 = 250,250,250 | 17,18:1 |

A faixa sumiu nos quatro casos: o rodapé tem o mesmo fundo do cartão e o botão fica à direita (borda direita em
1319 px no desktop e 328 px a 375 px, sem rolagem horizontal). Conferido também nos prints, que não mostram mais a
faixa branca no light nem a quase preta no dark.

Uma diferença que vi de passagem, fora do diff: no dark, a linha vazia "Nenhum convite pendente." da tabela de
convites tem fundo mais escuro que o cartão. É o placeholder do `Table` compartilhado, com o texto legível.

### Ambiente da remedição

Portas conferidas livres antes. Subi e derrubei pelo PID da árvore: `next start` da `app` na 3090 (flag vazia) e na
3000 (flag ligada), `api` em `next dev` na 3002 e o emulador (`SIGINT` no processo do firebase-tools). Os dois builds
gravaram em `apps/app/.next/`, que o git ignora; o último build ficou com a flag ligada. No fim, 3000-3003, 3090, 4000,
4001, 4400, 4500, 8080, 8085, 9099, 9150 e 9199 livres, nenhuma sessão do `agent-browser` aberta, e o harness em
`/tmp/qa-r2` apagado. Nenhum dado novo fora do seed do emulador, que parou sem exportar. Prints 15 a 18 em
`test/e2e/`, descartados pelo `.gitignore`.
