# Plano: organizações, membros e convites

- **Spec:** [`specs/teams-organizations.md`](../../../../specs/teams-organizations.md), corte de MVP inteiro (os cinco itens),
  em duas fases que seguem o fatiamento da própria spec (`:146-162`).
- **Status da spec:** segue `deferred`. Entrou no ciclo por instrução direta do usuário ("uma tarefa maior"), como a
  auditoria pós-PR #56 recomendou (`specs/BACKLOG.md:220-232`, E2 e E14 em `:400`, `:436`, `:448`). Tirar de `deferred`
  continua sendo decisão do usuário (`.claude/cycle-policy.md` §1); este plano só preenche `feature: teams-organizations`
  no frontmatter.
- **Rodada:** autônoma (`/cycle`), 2026-10-22, HEAD `9c793c6`. Ninguém foi consultado. Cada decisão não trivial está em
  "Perguntas em aberto", com a opção adotada, a descartada e o motivo.
- **Branch:** nenhuma. Quem cria é o `/review`.

## Resumo

O corte entra em duas fases. A fase A precisa estar correta, testável e commitável sozinha. A fase B depende dela.

**Fase A: a chave de escopo.** Três coleções novas, de nome singular como as outras: `organization`, `organizationMember` e,
na fase B, `organizationInvitation`. O vínculo de pertencimento tem como id o próprio id do perfil
(`organizationMember/{profileId}`), o que deixa "um usuário, uma organização" garantido pela estrutura. A criação usa
`create()` num lote atômico, e a corrida não duplica organização (medido: 8 pedidos simultâneos, 1 organização gravada).
Toda conta comum ganha uma organização em que é dona: no cadastro (`createDefaultUserProfile`) e, para quem já existe,
no primeiro pedido depois do deploy. Nesse primeiro contato, os `entity` antigos da pessoa recebem o `organizationId`
(retrocarga preguiçosa, idempotente, sem script manual).

O `entity` passa a pertencer à organização: um campo novo, `organizationId`, é a chave de escopo, e o `userId` passa a
dizer só quem criou. O predicado mora num lugar só, o repositório (`inOrganization`, `findInOrganization`), e os handlers
recebem o escopo de um guard novo, `requireOrganizationApi`, composto sobre `requirePlanApi` e `requireCommonPanelApi`.
Esse guard resolve a organização do sujeito (o personificado, sob personificação) e expõe `ctx.organization`, com o papel
dono ou membro, sem consultar o `UserType` global. As fotos de `entity` passam a ser objetos da organização
(`uploads/org-<organizationId>/…`), e o avatar continua da pessoa. O expurgo e a exportação do titular passam a
distinguir o que é da pessoa do que é da organização. O `docs/ARCHITECTURE.md` declara o core como B2C na interface e
B2B no modelo de dados.

**Fase B: membros e convites.** Ligada por `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED="true"` na `api` e na `app`;
vazia ou ausente, o fork B2C não vê nada novo e as rotas respondem `404 ORGANIZATION_MEMBERS_DISABLED`. O dono convida por
e-mail. O e-mail usa o template de link de ação que já existe, com um slug novo no dicionário, sem template novo. O
convite guarda só o hash do token, expira em 7 dias, vale uma vez e tem no máximo um documento por organização e
endereço, o que torna o reenvio idempotente. O aceite fica na `app`, numa página pública (`/invite?token=…`) que pede
login ou cadastro e exige que o e-mail da conta seja o do convite. Quem já tem conta aceita com ela, e nenhuma conta é
criada pelo convite. A página da equipe lista membros e convites pendentes. O dono remove membros, o membro sai, e o
dono nunca sai nem é removido, então a organização nunca fica sem dono.

Nenhuma dependência nova. Uma variável de ambiente nova (a da fase B). Três índices compostos novos em `entity`.

## Fontes lidas

| Fonte | O que dela entra no plano |
|---|---|
| `specs/teams-organizations.md` | corte de MVP, fatiamento em duas fatias, os 16 sítios de posse (`:38-46`), recomendações (organização implícita, um usuário = uma organização, aceite no `app`, 404 e não 403) |
| `specs/BACKLOG.md:20-37`, `:202-232`, `:345-370`, `:392-448` | por que a spec veio a este ciclo, E2/E14, pendências 13 (Resend) e 24 (`ARCJET_KEY`) |
| `.claude/cycle-policy.md` | escada de decisão, modo degradado testado, "string vazia é ausência", pré-requisito de infra não reprova |
| `docs/feature-analysis-guide.md` | roteiro das seções abaixo e formato §9.1 |
| `docs/ARCHITECTURE.md`, `AGENTS.md`, `CLAUDE.md` aninhados | convenções de guard, repositório + mapper, hooks, `HookForm*`, `Table` |
| slice `entity` (API, SDK, app, i18n) | forma das rotas, repositório paginado por cursor, mapper, hooks, upload de foto |
| `docs/features/in-app-notifications/analyze/plan.md` e o código produzido | coleção nova com helper privado de escopo (`byOwner`, `notification.repository.ts:37-39`), id determinístico com `create()` (`:101-130`), formato deste plano |
| `docs/features/magic-link-sign-in/analyze/plan.md` e o código produzido | e-mail de link de ação, `canSendAuthActionLink`, `503 EMAIL_NOT_CONFIGURED`, `404` para recurso desligado, lista de limite de taxa no proxy, `/test` lendo o código sem caixa de entrada |
| `docs/ROPA.md`, `docs/PRE-PRODUCTION.md`, `docs/SECURITY.md`, `docs/AUTH-SSO.md` | o que muda nos registros do titular, onde vão os pré-requisitos, guards documentados, o que o modo `simple` faz de fato |

## Medições desta rodada

**Emulador de Firestore isolado** (porta 8096, projeto `demo-teams-measure`, JDK 21 de `/opt/homebrew/opt/openjdk@21`,
`firebase-admin` 13.6.0 da `apps/api`). O script ficou em `/tmp`, fora do repositório. O emulador foi derrubado no fim, e
as portas 8096, 4400, 4500 e 9150 foram conferidas livres.

| Medição | Resultado |
|---|---|
| 8 pedidos simultâneos de "criar organização + vínculo" num lote com `create()` nos dois documentos | 1 `created`, 7 recusados com código gRPC 6 (`ALREADY_EXISTS`); 1 id de organização distinto; **1** documento `organization` gravado, nenhum órfão |
| `where("organizationId", "==", null)` sobre 4 documentos sem o campo | **0**: campo ausente não casa com `== null`, então a retrocarga filtra em memória |
| retrocarga: 3 documentos do usuário A sem `organizationId` (1 com `deletedAt`) | os 3 carimbados; segunda passada encontra **0** |
| consulta no formato do `paginate` (`organizationId ==`, `deletedAt == null`, `createdAt desc`, id desc) | organização A: `[e5, e2, e1]` (o `e5` foi criado por um membro de A); organização B: `[e4]`; o apagado `e3` fica fora; nada vaza entre as duas |
| `count()` com `organizationId ==`, `deletedAt == null`, `enabled == true` | `3` em A |
| `where("userId", "==", membro)` (forma da exportação por autor) | `1`: o registro que o membro criou em A |
| 3 transações simultâneas aceitando o mesmo token (C, D, C de novo), com `tx.get(query)` por `tokenHash` | `accepted`, `already-accepted-by-same`, `used`; membros de A ao fim: o dono e C; o convite registra C |
| `acceptedAt == null` sobre campo gravado como `null` explícito | casa: nenhum pendente depois do aceite |

O emulador não exige índice composto (o próprio repositório registra isso em `apps/api/__tests__/firestoreIndexes.test.ts:23-26`).
Quem prova a declaração dos índices novos é o teste estático, e o índice construído no projeto real fica 🔒.

**Recontagem dos sítios de posse** em `9c793c6` (`git grep` em `apps/api`, fora de testes): os mesmos 16 da spec.
`entity.repository.ts:23,40,64,72`; `entities/[id]/route.ts:24,40,67,86,102`; `entities/route.ts:28,73,81`;
`entities/summary/route.ts:9`; `account/route.ts:49,162` (via `ownerId` de `:127`); `files/route.ts:27`.

---

# Etapa 1: análise

## 1. Contexto

### 1.1 O que é

Toda conta comum passa a pertencer a uma organização. O `entity`, recurso de exemplo do core, deixa de ser de uma pessoa
e passa a ser da organização. Forks B2B ganham convites e lista de membros. Forks B2C não veem nada disso.

### 1.2 Objetivos, por fase

| Item do corte (spec `:135-144`) | Fase | Como fica atendido |
|---|---|---|
| 1. Todo usuário pertence a uma organização, criada no cadastro, invisível para o B2C | A | `createDefaultUserProfile` cria; o guard cria para quem já existe, no primeiro pedido; nenhuma tela nova com a flag desligada |
| 2. O escopo de `entity` passa a ser a organização, com isolamento no servidor | A | `organizationId` no documento; predicado só no repositório; 404 para registro de outra organização |
| 3. Dois papéis (dono, membro) independentes do `UserType`, num guard próprio | A | `requireOrganizationApi` com `ctx.organization.role`; a opção `role: "owner"` entra em uso na fase B |
| (contrapartida da spec, `:23-25`) declarar B2B/B2C em `docs/ARCHITECTURE.md` | A | seção nova "Escopo de dados: organização" |
| 4. Convidar por e-mail, aceitar, listar membros; convite expirável; e-mail já cadastrado | B | `organizationInvitation` com hash do token, 7 dias, uso único; aceite exige o e-mail do convite e usa a conta existente |
| 5. Remover membro sem deixar a organização sem dono | B | o dono não sai, não é removido e não exclui a conta enquanto houver membros |

### 1.3 Fora do escopo (mantido da spec, `:164-173`)

Trocador de organização e várias organizações por usuário; RBAC granular; cobrança por organização ou assento;
transferência de propriedade, domínios verificados, SSO e SCIM; registro de quem fez o quê dentro da organização
(pertence a `audit-log`); escopar notificações, sessões, avatar e preferências, que continuam da pessoa. Também fica fora
nome da organização e tela para editá-lo: a spec não pede, e o convite identifica quem convidou pelo e-mail.

### 1.4 Apps, área e modo

- **Impactados:** `packages/sdk`, `apps/api`, `apps/app`, `packages/internationalization`, `packages/email` (só via
  dicionário), `packages/shared` (um `LogScope`). `apps/web` não muda: o aceite vive no `app`, como a spec recomenda.
- **Área:** painel comum (`(common)`) e uma página pública em `(unauthenticated)`. O painel admin não ganha tela (§7.4).
- **Modo de produto:** igual em `subscription` e `simple`. Medido em 2026-09-25 (`docs/AUTH-SSO.md:99-107`): no `simple`
  o comum continua entrando no painel, e o modo só esconde a cobrança. A página da equipe aparece nos dois modos quando
  a flag está ligada.
- **Plano:** o gate de `POST /entities` continua lendo o plano do sujeito, de quem cria (§4.6).
- **Dependências externas:** Firestore (três índices), Resend para a entrega real do convite (pendência 13), Arcjet para
  o limite de taxa real (pendência 24).
- **Genérico × específico:** o modelo de organização vive em `apps/api` e `apps/app`; o SDK só ganha tipos e a action,
  como todo recurso.

### 1.5 Por que duas fases e o que cada uma entrega sozinha

A fase A muda o modelo de dados de um recurso em produção. Se ela sair sozinha, o fork B2C não percebe nada, o fork em
produção migra no primeiro acesso de cada usuário, e o próximo recurso já nasce escopado por organização. A fase B só
acrescenta: coleção, rotas atrás de uma flag, duas telas. Se ela não convergir nesta rodada, a fase A continua
commitável sem ela, porque nenhum arquivo da fase A depende de código da fase B.

## 2. Dados (Firestore)

### 2.1 Coleções e documentos

**`organization`** (fase A), id automático:

| Campo | Tipo | Default | Por quê |
|---|---|---|---|
| `ownerUserId` | string | id do perfil de quem criou | o dono; também acha a organização "de casa" de alguém (§2.3) |
| `createdAt`, `updatedAt`, `deletedAt` | carimbos do `BaseRepository` | | padrão do repo |

Sem nome, por enquanto (§1.3). Alternativa de id determinístico (o id do perfil) descartada: um handler que usasse
`ctx.subjectProfile.id` no lugar do `organizationId` passaria em todo teste com o dono e só erraria com membros.

**`organizationMember`** (fase A), id **= id do perfil**:

| Campo | Tipo | Default | Por quê |
|---|---|---|---|
| `organizationId` | string | | a organização atual da pessoa |
| `userId` | string | o próprio id | consulta e mapper sem depender do id do documento |
| `role` | `"owner"` \| `"member"` | `"owner"` na organização de casa | papel dentro da organização, separado do `UserType` |
| `joinedAt` | Timestamp | agora | lista de membros |
| `legacyClaimPending` | boolean | `true` quando o vínculo de dono nasce pelo resolvedor | dispara a retrocarga até ela terminar (§2.3) |
| `createdAt`, `updatedAt`, `deletedAt` | carimbos | `deletedAt: null` | padrão; o vínculo removido é **apagado**, não marcado (§4.9) |

O id igual ao do perfil faz duas coisas. A primeira é a leitura por id no guard, sem consulta. A segunda é deixar o
`create()` recusar a duplicata, o que resolve a corrida medida acima. O preço: várias organizações por usuário exigiriam
re-chavear a coleção, e isso está fora do corte.

**`organizationInvitation`** (fase B), id **= `sha256(organizationId + ":" + email normalizado)` em hex**:

| Campo | Tipo | Default | Por quê |
|---|---|---|---|
| `organizationId` | string | | escopo |
| `email` | string | `trim().toLowerCase()` | destinatário; casa com o e-mail da conta no aceite |
| `role` | `"member"` | | o convite nunca concede dono |
| `tokenHash` | string | `sha256(token)` hex | o token nunca é gravado |
| `invitedByUserId` | string | id do perfil do dono | |
| `inviterEmail` | string \| null | e-mail do dono no Auth | mostrado na prévia e no e-mail, sem consulta ao Auth na rota pública |
| `expiresAt` | Timestamp | agora + 7 dias | expiração; candidato à TTL |
| `lastSentAt` | Timestamp | agora | intervalo mínimo entre reenvios |
| `acceptedAt` | Timestamp \| null | `null` **explícito** | `== null` só casa com null gravado (medido) |
| `acceptedByUserId` | string \| null | `null` | aceite repetido pela mesma pessoa responde sucesso |
| `createdAt`, `updatedAt`, `deletedAt` | carimbos | | |

O id determinístico garante um documento por organização e endereço. Convidar de novo reaproveita o documento
(reenvio), e duas requisições simultâneas não criam dois convites para o mesmo endereço.

**`entity`** (fase A), campo novo:

| Campo | Tipo | Default | `null`? | Por quê |
|---|---|---|---|---|
| `organizationId` | string | `ctx.organization.organizationId` na criação | não; ausente só em documento anterior à retrocarga | a chave de escopo |
| `userId` (existente) | string | inalterado | | passa a significar **quem criou**; não decide mais acesso |

Nomes considerados para a chave: `organizationId` (adotado, simétrico a `userId`) e `orgId` (mais curto, mas abrevia
onde o resto do repo não abrevia).

### 2.2 Consultas e índices

| Consulta | Forma | Índice |
|---|---|---|
| lista paginada de `entity` | `organizationId ==`, `deletedAt == null`, `createdAt desc`, id desc | **composto novo** `(organizationId, deletedAt, createdAt DESC)` |
| resumo da home | `count()` com `organizationId ==`, `deletedAt == null` e `enabled ==` / `type ==` | **dois compostos novos** `(organizationId, deletedAt, enabled)` e `(organizationId, deletedAt, type)` |
| `findInOrganization` | leitura por id + comparação | nenhum |
| exportação por autor | `userId ==` | campo único (automático) |
| retrocarga e expurgo de não carimbados | `userId ==` com projeção `select("organizationId")`, sem ordenação | campo único |
| expurgo da organização | `organizationId ==` | campo único |
| vínculo da pessoa | leitura por id | nenhum |
| organização de casa | `organization` com `ownerUserId ==`, `deletedAt` filtrado em memória | campo único |
| membros da organização | `organizationMember` com `organizationId ==` | campo único |
| convites da organização | `organizationInvitation` com `organizationId ==`, estado filtrado em memória | campo único |
| convite pelo token | `organizationInvitation` com `tokenHash ==` | campo único |
| convites endereçados ao titular (expurgo) | `organizationInvitation` com `email ==` | campo único |

Duas igualdades na mesma consulta, neste repo, ganham índice composto ou filtro em memória
(`user.repository.ts:82-98`). Os conjuntos pequenos (organização de casa, membros, convites) ficam com o filtro em
memória e não pedem índice.

Os três índices compostos de `entity` por `userId` (`firestore.indexes.json:3-29`) deixam de ter consulta. O plano os
**substitui** no arquivo pelos de `organizationId`. O índice publicado só sai do projeto quando alguém confirma a remoção
no `firebase deploy`, então removê-lo do arquivo não derruba nada de imediato (§12).

### 2.3 Retrocarga: quem já existe

O fork em produção tem perfis sem vínculo e `entity` sem `organizationId`. Nada disso exige script nem janela de
manutenção. A resolução do guard (§4.3) faz a migração de cada pessoa no primeiro pedido dela a uma rota escopada:

1. Lê `organizationMember/{profileId}`. Existe, segue.
2. Não existe: procura a organização de casa (`ownerUserId == profileId`). Achou, recria o vínculo de dono nela. Não
   achou, cria organização nova e vínculo num lote com `create()` nos dois. Perdeu a corrida (`ALREADY_EXISTS`), relê o
   vínculo que a outra requisição gravou.
3. Todo vínculo de dono criado aqui nasce com `legacyClaimPending: true`. Enquanto estiver `true`, o resolvedor lê os
   `entity` com `userId == profileId` numa consulta só, com projeção `select("organizationId")` e sem ordenação, para
   não depender de índice composto. Carimba `organizationId` só nos que não têm o campo, em lotes de 500 gravações, sem
   mexer em `updatedAt` (migração não é edição), e então grava `false`.
4. Falha na retrocarga não derruba o pedido: registra `[organization] legacy-claim-failed`, a flag fica `true` e o
   próximo pedido tenta de novo. A operação é idempotente (medido: segunda passada encontra 0).

Limites: até 100 lotes por pedido (50 mil registros); acima disso, registra `legacy-claim-unfinished` e continua no
próximo pedido. Quem nunca volta ao produto fica com os registros sem carimbo. Eles não aparecem para ninguém, porque
nenhuma consulta escopada os alcança, e o expurgo da pessoa os apaga mesmo assim (§4.7). Paginar por id com `startAfter`
seria mais leve em memória, mas `where` + `orderBy` por id não foi medido contra um projeto real, e um índice faltando
deixaria a retrocarga falhando em silêncio para sempre.

O cadastro novo também passa pelo passo 3: a consulta volta vazia e a flag cai. São uma leitura e uma escrita a mais, uma
vez por conta, para manter um caminho só.

### 2.4 Dados existentes e seed

- O mapper trata a ausência: `organizationId: String(record.organizationId ?? "")`. Um id vazio nunca casa com o escopo do
  guard, então o documento sem carimbo devolve 404 a todos.
- O seed do emulador (`apps/api/scripts/seed-emulator.mjs:156-170`) continua gravando `entity` **sem** `organizationId`, de
  propósito: o primeiro login de `user@example.com` exercita a retrocarga, que é o caminho dos forks em produção. Muda
  só o comentário ao lado do `userId`, que hoje o chama de dono.
- Os registros de `user2@example.com` (`:71-72`) continuam servindo ao teste de 404: sem carimbo, ou carimbados na
  organização de `user2`, nunca aparecem para `user`.

## 3. Contrato `@repo/sdk`

**Fase A**

- `EntityDTO` ganha `organizationId: string`; o comentário de `userId` passa a dizer "quem criou"
  (`packages/sdk/src/types/entity/entity.ts:8-28`). Aditivo; quebra só fixtures de teste que montam `EntityDTO` inteiro
  (o `typecheck` aponta).
- Tipo novo `packages/sdk/src/types/organization/organization.ts`: `ORGANIZATION_ROLES`, `OrganizationRole`,
  `OrganizationMembershipDTO`.
- `AccountDataExportDTO` ganha `membership: OrganizationMembershipDTO | null` (`account.ts:98-108`). Aditivo; o
  `format.version` fica `1`.
- `FileActions.upload` aceita `scope?: UploadScope` (`"personal" | "organization"`), enviado como query `?scope=`
  (`packages/sdk/src/actions/file/action.ts:7-40`). Sem `scope`, comportamento atual.

**Fase B**

- Tipos de membros, convites, prévia e respostas no mesmo arquivo (blueprint §10.1).
- `OrganizationActions` em `packages/sdk/src/actions/organization/action.ts`, registrada como `organization` no `Client`
  (`packages/sdk/src/client/index.ts:16-40`).

## 4. API (`apps/api`)

### 4.1 O ponto único de escopo: os 16 sítios, antes e depois

| Sítio hoje | Depois |
|---|---|
| `entity.repository.ts:23,40,64,72` (quatro `where("userId")`) | um helper privado `inOrganization(organizationId)` usado por `listByOrganization`, `summaryByOrganization` e `purgeByOrganization`. `findAllByUserId` fica, com o sentido novo de "o que a pessoa criou" (exportação). `listByUserId`, `summaryByUserId` e `purgeAllByUserId` **somem**, para nada poder chamar o formato antigo |
| `entities/[id]/route.ts:24,40,102` (`row.userId !==`) | `entityRepository.findInOrganization(id, organizationId)`, que devolve `null` para registro de outra organização; o handler só responde 404 ao `null` |
| `entities/[id]/route.ts:67,86` e `entities/route.ts:73` (posse do objeto) | `isAttachablePhoto(photo, organizationId)` e `isReplaceablePhoto(...)` em `entity-photo.ts` (§4.5) |
| `entities/route.ts:28` e `summary/route.ts:9` (chave de escopo) | `ctx.organization.organizationId` passado ao repositório |
| `entities/route.ts:81` (gravação do dono) | grava `organizationId` (escopo) e `userId` (autor) |
| `account/route.ts:49,162` (avatar) | **inalterado**: o avatar é da pessoa |
| `files/route.ts:27` (caminho do objeto) | prefixo da pessoa por padrão; o da organização com `?scope=organization` (§4.5) |

O predicado de organização (`where("organizationId", "==", …)` e a comparação do `findInOrganization`) passa a existir
num arquivo só. Os handlers repassam o escopo que o guard resolveu, sem repetir a regra.

### 4.2 Guard: `requireOrganizationApi`

Arquivo novo `apps/api/app/(guards)/organization.ts`, composto sobre `requirePlanApi` (`plan.ts:21-32`), que por sua vez
compõe `requireCommonPanelApi`. A ordem fica:

1. `requireCommonPanelApi`: token, perfil do ator, contexto de personificação, **recusa de escrita sob personificação**
   (`common-panel.ts:65-71`), sujeito comum (`:73-82`).
2. Gate de plano, só quando a rota passa `plan` (hoje, só `POST /entities`).
3. Flag da fase B, só quando a rota pede (`membersFeature: true`): desligada, `404 ORGANIZATION_MEMBERS_DISABLED`.
   Nenhuma rota passa `plan` e `membersFeature` juntos.
4. `resolveOrganizationMembership(ctx.subjectProfile.id)` (§4.3).
5. Papel, só quando a rota pede `role: "owner"`: membro recebe `403 ORGANIZATION_FORBIDDEN`.
6. Handler com `ctx.organization = { organizationId, role }`.

Duas exportações: `requireOrganizationApi(handler, { plan? })`, usada pelo `entity` e por `/files`, e
`requireOrganizationMembersApi(handler, { role? })`, que liga `membersFeature`, usada pelas rotas de `/organization/*`.
`requirePlanApi` continua em uso, agora por dentro do guard novo.

O guard nunca lê `UserType` para decidir papel. Quem é admin de plataforma não passa do passo 1 sem personificar
(`COMMON_PANEL_FORBIDDEN`), e o papel de dono não atravessa `requireAdminApi`, que só aceita perfil `ADMIN`
(`admin.ts:47`).

### 4.3 Resolução da organização

`apps/api/(shared)/lib/organization-membership.ts`:

- `resolveOrganizationMembership(profileId)`: os passos de §2.3; devolve `{ organizationId, role, joinedAt }`.
- `ensureOrganizationMembershipQuietly(profileId)`: o mesmo, engolindo e registrando a falha; chamado por
  `createDefaultUserProfile` (`user-merge.ts:77-100`) para perfis `COMMON`, ao lado das boas-vindas (`:90-97`). Falha no
  cadastro não desfaz a conta, porque o guard cria no primeiro pedido.
- Perfil criado pelo admin (`users/route.ts:73-77`) não passa por `createDefaultUserProfile`. O guard cria a organização
  no primeiro pedido, e a rota do admin fica intacta.

**Sob personificação** a resolução é a do personificado, como a spec pede (`:207-208`). Se ele ainda não tiver vínculo,
o `GET` do admin cria a organização e roda a retrocarga. É escrita de sistema, não de autoria. O guard do painel comum já
grava sob personificação em `GET` (`recordUserActivity` em `common-panel.ts:87`, sessão de personificação em `:91-100`),
e o resultado é o mesmo que o usuário teria no próximo login. Recusar deixaria o suporte vendo uma lista vazia para quem
tem registros.

### 4.4 `entity`

- `GET /entities`, `GET /entities/summary`, `GET|PUT|DELETE /entities/:id`: `requireOrganizationApi`, escopo pelo
  repositório. Registro de outra organização, apagado ou sem carimbo: `404 ENTITY_NOT_FOUND`, igual a hoje.
- `POST /entities`: `requireOrganizationApi(handler, { plan: entityPlanRequirement })`; grava `organizationId` e
  `userId` (autor).
- Membro edita e apaga registro de qualquer autor da mesma organização: dois papéis bastam, e permissão por registro é
  RBAC granular, fora do corte.
- **Armadilha que o plano fecha:** o formulário de edição reenvia a foto atual em todo `PUT`
  (`EditEntityClient.tsx:66`, `useEntityCrud.tsx:80`). Com a regra de hoje, um membro editando o registro de outro autor
  receberia `ENTITY_PHOTO_INVALID` sem ter tocado na foto. O `PUT` aceita sem checagem o valor igual ao já gravado
  (`patch.photo === existing.photo`).

### 4.5 Fotos no bucket

O caminho de hoje é `uploads/<profileId>/<uuid>.<ext>` (`storage.ts:26-27`, `:46-47`), para avatar e foto de `entity`. A
leitura assina qualquer caminho bem formado, sem conferir dono (`entity-photo.ts:52`). Então o membro B **já veria** a
foto que A enviou: o problema está na escrita, na troca e no expurgo.

| Opção | Escrita | Troca | Expurgo de um membro |
|---|---|---|---|
| (P1) manter o prefixo de quem enviou | B não consegue anexar a foto de A | a foto antiga de A vira órfã | apaga as fotos de registros que ficam com a organização |
| **(P2) foto de `entity` sob a organização** | qualquer membro anexa objeto da organização | a antiga é apagada | não toca a organização |

**Adotada: P2.** O segmento de dono passa a ser `org-<organizationId>` para objetos da organização. A regex atual
(`[A-Za-z0-9_-]{1,128}`) já aceita o hífen, e id automático do Firestore é só alfanumérico, então nenhum perfil começa
com `org-`. Não muda a regex, nem `storage.rules`, nem o `isOwnedBy`.

- `storage.ts`: `organizationOwnerSegment(organizationId)`.
- `POST /files?scope=organization` grava em `uploads/org-<organizationId>/…`; sem `scope`, no prefixo da pessoa (avatar).
  Valor desconhecido: `400 VALIDATION_FAILED`. A rota passa a usar `requireOrganizationApi`, que custa uma leitura por
  envio.
- Anexar (`POST`, `PUT` com valor novo): URL http(s) absoluta ou objeto sob `org-<organizationId>`
  (`isAttachablePhoto`).
- Trocar: apaga a antiga se for objeto da organização, ou se for objeto antigo no prefixo pessoal **de quem está
  editando e também criou o registro** (`isReplaceablePhoto`), que é exatamente a regra de hoje para o autor. A foto
  antiga de outro autor, no prefixo pessoal dele, fica como está e sai no expurgo dele.
- A app passa `scope: "organization"` nos formulários de criar e editar `entity`; o avatar não muda.

### 4.6 Gate de plano

`refusePlanAccess` continua lendo o plano do sujeito, de quem cria (`plan.ts:28`). Com
`NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` vazia, que é o padrão, nada muda. Preenchida, um membro sem assinatura própria não
cria registro na organização de um dono que paga. Ler o plano do dono custaria mais uma leitura por pedido e anteciparia
uma regra de cobrança por organização, que está fora do corte. Fica como pergunta (P7).

### 4.7 Exclusão de conta e exportação

**Exclusão** (`account-erasure.ts`, chamada só por `POST /account/deletion`):

| Situação do titular | O que acontece |
|---|---|
| dono de organização com outros membros | **recusa antes de tudo**, na rota, depois da validação do corpo e antes da senha: `409 ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS`. Ele remove os membros primeiro (não há transferência no corte) |
| dono sozinho (o caso de todo fork B2C) | a organização morre com ele: todos os `entity` dela (de qualquer autor, inclusive ex-membros), os objetos `uploads/org-<id>/`, os vínculos e convites dela e o documento `organization` |
| membro da organização de outro | os registros que ele criou ali **ficam** com a organização; sai o vínculo dele; a organização de casa dele, se existir e estiver dormente, morre com tudo dela |
| qualquer um | os `entity` dele ainda sem carimbo também saem (`userId ==` e sem `organizationId`), e o prefixo pessoal `uploads/<profileId>/` continua varrido |

Passos depois da cobrança: `storage` (prefixo pessoal + prefixo da organização de casa), `entities` (organização de casa
+ não carimbados), **`organization`** (novo: vínculo do titular, vínculos e convites da organização de casa, documento da
organização e, na fase B, convites pendentes endereçados ao e-mail do titular), `auditTrail`, `sessions`, `notifications`,
`profile`, `authAccount`. O `id` de autor nos registros que ficam com a organização vira referência a um perfil que não
existe mais e não aponta para ninguém.

**Exportação** (`account-export.ts:134-150`): continua listando o que o titular criou (`findAllByUserId`, por autor), em
qualquer organização, como a spec recomenda (`:233-235`), e ganha `membership` (organização e papel atuais). Registros de
outros autores da mesma organização não entram: são dados da organização, não do titular.

**Arquivamento pelo admin** (`DELETE /users/:id`) não é expurgo e não muda. Dono arquivado deixa a organização
funcionando para os membros, sem quem a administre (§13).

### 4.8 Convites (fase B)

- **Token:** `randomBytes(32)` em base64url (43 caracteres), só no link do e-mail. O Firestore guarda `sha256(token)`. O
  token não aparece em resposta, DTO nem log.
- **Link:** `${NEXT_PUBLIC_APP_URL}/${locale}/invite?token=<token>`. O `locale` vem do corpo (o idioma em que o dono
  está), validado contra os três.
- **Pré-condição de envio:** `canSendAuthActionLink()` (`auth-action-links.ts:28-30`) falso, por falta de Resend ou de
  `NEXT_PUBLIC_APP_URL`: `503 EMAIL_NOT_CONFIGURED`, antes de ler o corpo, como o link de acesso
  (`email-link/request/route.ts:55-60`).
- **Emissão** (transação sobre o documento de id determinístico):
  - endereço que já é membro desta organização: `409 ORGANIZATION_INVITATION_ALREADY_MEMBER`. A checagem usa
    `getUserByEmail`, perfil e vínculo, e só revela pertencimento à organização do próprio dono;
  - convite pendente e não expirado para o mesmo endereço, enviado há menos de 60 s:
    `429 ORGANIZATION_INVITATION_RECENTLY_SENT`;
  - 20 convites pendentes e não expirados e este endereço não é um deles: `409 ORGANIZATION_INVITATION_LIMIT_REACHED`;
  - caso contrário, grava (ou regrava) com token novo, `expiresAt` = agora + 7 dias, `lastSentAt` = agora,
    `acceptedAt: null`. O token anterior deixa de valer.
- **Entrega:** síncrona, depois da transação, com `sendEmail` + `actionLinkEmail` e o slug `organizationInvitation`
  (`action-link.tsx:12-13`). `name` recebe o **e-mail** de quem convidou, não o nome de exibição: o título do e-mail não
  carrega texto livre escolhido por quem se cadastra (P11). A resposta é sempre 201 com `delivery: "sent" | "failed"`. Na
  falha, o convite fica e o dono pode reenviar.
- **Revogar:** `DELETE /organization/invitations/:id` apaga o documento (o endereço do convidado sai junto). Id de outra
  organização ou convite já aceito: `404 ORGANIZATION_INVITATION_NOT_FOUND`.
- **Prévia (pública):** `POST /invitations/preview { token }` devolve `{ email, inviterEmail, expiresAt }`, ou
  `400 ORGANIZATION_INVITATION_INVALID` (desconhecido, revogado, aceito, organização dormente) ou
  `400 ORGANIZATION_INVITATION_EXPIRED`. O token vai no corpo e não na query da API, para ficar fora de log de acesso.
- **Aceite (autenticado):** `POST /invitations/accept { token }` sob `requireCommonPanelApi` + flag, numa transação:
  1. convite pelo `tokenHash`: ausente, `INVALID`;
  2. já aceito: pela mesma pessoa, 200 (clique duplo); por outra, `INVALID`;
  3. `expiresAt` no passado: `EXPIRED`;
  4. e-mail da conta (`ctx.user.email`, normalizado) diferente do convite: `403 ORGANIZATION_INVITATION_EMAIL_MISMATCH`;
  5. organização ausente, ou dormente (o vínculo do dono aponta para outra): `INVALID`;
  6. a pessoa já está nesta organização: `409 ORGANIZATION_INVITATION_ALREADY_MEMBER`;
  7. a pessoa é dona de organização com outros membros: `409 ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS`;
  8. grava o vínculo `member` (sobrescreve o atual) e marca o convite aceito.
  A concorrência foi medida (tabela acima).
- **E-mail já cadastrado:** o convite não consulta conta nem cria conta. Quem tem conta entra e aceita, e quem não tem
  se cadastra pelo fluxo normal e volta ao link. Não há caminho que crie uma segunda conta.
- **O que acontece com a organização anterior de quem aceita:** fica dormente, com os registros dela. Se a pessoa sair ou
  for removida, o resolvedor a devolve à organização de casa (§2.3), e os registros voltam. A página de aceite avisa
  isso antes do clique.
- **Verificação de e-mail:** não é exigida de quem convida nem de quem aceita. O token prova acesso à caixa do convidado,
  como os links de ação do Firebase (P12, P13).

### 4.9 Membros (fase B)

- `GET /organization`: `{ id, ownerUserId, viewerRole }`. Qualquer membro.
- `GET /organization/members`: vínculos da organização + e-mail e nome do Firebase Auth (`getUsers`, em lotes de 100).
  Perfil arquivado aparece com e-mail e nome nulos. Qualquer membro.
- `DELETE /organization/members/:id` (id = id do perfil): só o dono. O próprio id ou o do dono:
  `409 ORGANIZATION_OWNER_CANNOT_LEAVE`. Vínculo fora da organização: `404 ORGANIZATION_MEMBER_NOT_FOUND`. Sucesso apaga
  o vínculo (`purge`): o `create()` do resolvedor recusaria um documento só marcado, e o histórico de quem entrou e saiu
  pertence a `audit-log`.
- `POST /organization/leave`: membro sai, o resolvedor o devolve à organização de casa na mesma requisição, 204. Dono:
  `409 ORGANIZATION_OWNER_CANNOT_LEAVE`.
- O membro removido perde o acesso no pedido seguinte: o guard lê o vínculo a cada requisição, sem cache.

### 4.10 Rotas públicas e limite de taxa

`RATE_LIMITED_PATHS` (`apps/api/proxy.ts:55-70`) casa o caminho exato (`:72-74`), em qualquer método. Entram
`/organization/invitations` (cada `POST` manda e-mail), `/invitations/preview` (pública) e `/invitations/accept`. O
comentário de `:28-53` ganha uma frase sobre elas. Sem `ARCJET_KEY` o limite é no-op (pendência 24); o teto de 20
pendentes por organização e o intervalo de 60 s por endereço continuam valendo.

### 4.11 Códigos de erro novos

| `error.code` | Status | Onde | Fase |
|---|---|---|---|
| `ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS` | 409 | `POST /account/deletion` | A |
| `ORGANIZATION_MEMBERS_DISABLED` | 404 | toda rota de `/organization/*` e `/invitations/*` com a flag desligada | B |
| `ORGANIZATION_FORBIDDEN` | 403 | membro em rota só do dono | B |
| `ORGANIZATION_MEMBER_NOT_FOUND` | 404 | remover vínculo de fora da organização | B |
| `ORGANIZATION_OWNER_CANNOT_LEAVE` | 409 | dono saindo, removendo a si ou ao dono | B |
| `ORGANIZATION_INVITATION_NOT_FOUND` | 404 | revogar id inexistente, de outra organização ou já aceito | B |
| `ORGANIZATION_INVITATION_ALREADY_MEMBER` | 409 | convidar quem já é membro; aceitar já sendo membro | B |
| `ORGANIZATION_INVITATION_LIMIT_REACHED` | 409 | 20 pendentes | B |
| `ORGANIZATION_INVITATION_RECENTLY_SENT` | 429 | reenvio antes de 60 s | B |
| `ORGANIZATION_INVITATION_INVALID` | 400 | token desconhecido, revogado, aceito por outra pessoa, organização dormente | B |
| `ORGANIZATION_INVITATION_EXPIRED` | 400 | token vencido | B |
| `ORGANIZATION_INVITATION_EMAIL_MISMATCH` | 403 | conta com outro e-mail | B |
| `ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS` | 409 | dono com membros tentando aceitar | B |

Reaproveitados: `ENTITY_NOT_FOUND`, `ENTITY_PHOTO_INVALID`, `VALIDATION_FAILED`, `EMAIL_NOT_CONFIGURED`,
`AUTH_REQUEST_IMPERSONATION_READ_ONLY`, `COMMON_PANEL_FORBIDDEN`, `AUTH_RATE_LIMITED`. Token inválido e vencido saem 400
como os `AUTH_OOB_CODE_*` (`toolkit-error-codes.ts:104-107`), e `HTTP_STATUS` não tem 410. Todos os 13 novos entram em
`apiErrors` nos três idiomas.

## 5. Front (`apps/app`)

### 5.1 Flag

`NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED` em `apps/app/env.ts` e `apps/api/env.ts` (bloco `client`, redeclarada na API
como `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE`, `env.ts:36-44`), com `process.env.X || undefined` no `runtimeEnv`. Só
`"true"` liga, sem diferenciar maiúsculas e com `trim`, como `EMAIL_LINK_SIGN_IN_ENABLED` (`email-link-sign-in.ts:4-5`).
Um helper por app (`isOrganizationMembersEnabled`), cópia como a de `entityPlanRequirement`, porque o repo não tem helper
de flag compartilhado.

### 5.2 Navegação

- `paths.ts`: `organization: { label, url: buildPath("/organization") }`.
- `routes.tsx`: item de topo "Equipe" (ícone `UsersIcon`) entre `entities` e `settings`, montado com spread condicional
  como o de cobrança (`routes.tsx:52-59`).
- `proxy.ts` da app: `/invite` em `PUBLIC_PATHS` **e** em `OOB_ACTION_PATHS` (`:90-103`). Sem o segundo, quem já está
  logado é mandado para a home e perde o token (`:251-268`).

### 5.3 Página da equipe: `(common)/(pages)/organization/`

- `page.tsx` (RSC): flag desligada, `notFound()`. Ligada, prefetch de `organization.detail()` e
  `organization.members()` dentro de `if (!(await isImpersonating()))`, como `entities/(pages)/(home)/page.tsx:17`.
- `loading.tsx` com `TableSkeleton`.
- Cliente `OrganizationClient.tsx`:
  - tabela **Membros** (`Table` com `searchFields` em nome e e-mail, `onRefresh`, `rowKey="userId"`): nome, e-mail,
    papel, entrada, ações. Só o dono vê "Remover", e nunca na linha do dono. A confirmação é a do `ActionsMenu` com
    `deleteLabels` (`action-menu.tsx:18-22`);
  - **Convidar** (só o dono): formulário com `HookFormInput` (e-mail) e `Footer` sem "voltar"; envia o idioma atual.
    `delivery: "failed"` mostra aviso; `EMAIL_NOT_CONFIGURED` mostra o erro traduzido;
  - tabela **Convites pendentes** (só o dono): e-mail, enviado em, expira em ou "Expirado", ações "Reenviar" (novo `POST`
    com o mesmo e-mail) e "Revogar";
  - **Sair da equipe** (só membro): botão com `AlertDialog`, como `AccountSessionsPanel.tsx`;
  - sob personificação: tudo visível, escrita desabilitada, `ImpersonationReadOnlyNotice`.

### 5.4 Página de aceite: `(unauthenticated)/invite/`

- `page.tsx` (RSC): flag desligada, `notFound()`. Lê `searchParams.token` e passa ao cliente.
- `components/InvitationAcceptance.tsx` (cliente), estados:
  - sem token ou prévia `INVALID`: cartão "convite inválido" com link para entrar;
  - `EXPIRED`: cartão "convite expirado, peça outro a quem convidou";
  - prévia ok e **sem sessão**: "{inviterEmail} convidou {email}", com botões "Entrar" e "Criar conta", que levam
    `?redirect=/{locale}/invite?token=…` (o sanitizador aceita caminho com query, `packages/auth/redirect.ts`);
  - prévia ok e **com sessão**: "Você está conectado como {e-mail}". E-mail diferente mostra aviso e "Entrar com outra
    conta". Igual mostra o aviso sobre a organização anterior (§4.8) e "Aceitar convite";
  - aceite: trava de envio único com `useRef`, como `EmailLinkCompletion.tsx:43-44`, e botão desabilitado durante o
    pedido. Sucesso: `queryClient.resetQueries()`, toast e `router.push` para `/{locale}/organization`. Erros traduzidos.
- `Referrer-Policy: no-referrer` já vale nas apps (`packages/security/__tests__/csp.test.ts:210`), então o token da URL
  não vaza para o host do logo.

### 5.5 Upload com escopo (fase A)

`useFileUpload(options?: { scope?: UploadScope })` (`shared/hooks/useFileUpload.ts:19-36`) repassa `scope` ao SDK. As
páginas de criar e editar `entity` passam `"organization"`; `AccountProfileForm` não muda.

### 5.6 Cache

`queryKeys.organization`: `all`, `detail()`, `members()`, `invitations()`. As chaves de `entities` não levam
organização. Aceitar e sair trocam a organização do sujeito, então os dois chamam `queryClient.resetQueries()`, a mesma
regra da troca de sujeito (`apps/app/CLAUDE.md`). Convidar, reenviar e revogar invalidam `invitations()`; remover
invalida `members()`. Hooks com `useAuthorizedQuery`. A prévia é pública e usa `useQuery` puro.

## 6. i18n

- **Fase A:** `apiErrors.ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS` nos três idiomas.
- **Fase B:**
  - `apps.app.pages.common.organization`, arquivo novo `common/organization.ts`;
  - `apps.app.pages.invitation`, folha nova `pages/invitation/index.ts`;
  - `routes.platform.organization` em `common/routes/index.ts`;
  - `email.actionLink.actions.organizationInvitation` em `translations/packages/email/index.ts`;
  - os outros 12 códigos em `apiErrors`.
- Rótulo de produto na B2B: "Equipe" / "Team" / "Equipo" (P15). Com a flag desligada nenhuma dessas chaves aparece. A
  única que um fork B2C poderia ver é a do 409 de exclusão, e ela não dispara sem membros.
- A cópia do e-mail diz "7 dias", amarrada à constante `ORGANIZATION_INVITATION_TTL_DAYS`. Quem muda uma muda a outra
  (nota no `FORKING.md`).

## 7. Autorização e segurança

### 7.1 Camadas

`apps/app/proxy.ts` (sessão; `/invite` público) → `requireSession` (grupo autenticado) → guard da API. O isolamento
entre organizações está **só** no servidor: repositório + guard. As rules seguem negando tudo ao cliente
(`firestore.rules:32-34`), e o teste de rules descobre as coleções novas sozinho, pela regex sobre `super(db, "…")` nos
repositórios (`firestoreRules.emulator.test.ts:28-45`).

### 7.2 Personificação

O admin personificando vê a organização do personificado, membros e convites inclusive, e não escreve nada (`POST`,
`PUT`, `DELETE` recusados pelo guard). Aceitar convite sob personificação também é `POST` e é recusado. A única escrita
possível é a criação implícita do §4.3.

### 7.3 Dois eixos de papel

`UserType` (`admin`/`common`) é papel de plataforma. `organizationMember.role` (`owner`/`member`) é papel dentro do grupo.
Nenhum guard lê os dois: `requireAdminApi` olha só o perfil, `requireOrganizationApi` olha só o vínculo, e o admin de
plataforma nunca tem vínculo porque nunca passa do sujeito comum.

### 7.4 Painel admin

Nada muda no corte. A lista de usuários não mostra organização, e o arquivamento não mexe nela. Promover a admin um dono
com membros deixa a organização sem administração ativa (§13).

### 7.5 Dados sensíveis

Token só no e-mail. Logs sem e-mail, token ou id de convite: `[organization] legacy-claim-failed`,
`invitation-delivery-failed` com `requestId`. `LogScope` ganha `"organization"` (`packages/shared/utils/helpers/log.ts:5-15`),
como `"notifications"` entrou na PR #52. `inviterEmail` fica no convite, que é apagado ao revogar e pela TTL.

## 8. Testes (Vitest)

Nível mais barato que prova cada coisa. Emulador só onde a infra é o objeto.

| Teste | Nível | O que prova | Fase |
|---|---|---|---|
| `organizationGuard.test.ts` | unit, guard com repositório e resolvedor mockados | `ctx.organization` injetado; a resolução usa o sujeito, não o ator; `role: "owner"` → 403; flag desligada → 404 antes da resolução; plano antes da resolução | A (+B) |
| `organizationMembership.test.ts` | unit, repositórios mockados | vínculo existente; organização de casa restaurada; criação; `ALREADY_EXISTS` relê; retrocarga com flag `true` roda e limpa; falha na retrocarga não derruba e mantém a flag | A |
| `entitiesRouteOrganizationScope.test.ts` | rota com `vi.mock` do guard e do repositório | 404 em GET/PUT/DELETE de outra organização; membro lê, edita e apaga registro de outro autor; `PUT` com a foto inalterada de outro autor passa; foto nova no prefixo pessoal → `ENTITY_PHOTO_INVALID`; troca apaga objeto da organização e não apaga o de outro autor | A |
| `entitiesRouteList`, `entitiesRouteImpersonation`, `entitiesRoutePlanGate`, `entitiesSummaryRoute`, `entityPhotoReference` | ajuste dos existentes | métodos novos do repositório e o guard novo; o gate de plano continua antes da gravação | A |
| `fileUploadRoute.test.ts` | ajuste | `?scope=organization` → `uploads/org-<id>/`; padrão continua pessoal; valor desconhecido → 400 | A |
| `accountErasure.test.ts`, `accountDeletionRoute.test.ts`, `accountExportRoute.test.ts` | ajuste | passos novos e ordem; 409 antes da senha; `membership` na exportação; registros por autor | A |
| `signUpProfile`, `googleSignInProfile`, `welcomeNotification`, `userMergeArchivedProfile` | ajuste de mocks | `createDefaultUserProfile` chama o resolvedor; `infra/database.ts` chama `getFirestoreAdmin()` no import, então quem mocka `@repo/auth/server` precisa mockar também o módulo novo (armadilha registrada no plano de notificações) | A |
| `firestoreIndexes.test.ts` | estático | os três índices de `organizationId` declarados e os de `userId` de `entity` fora | A |
| **`organizationScope.emulator.test.ts`** | **emulador de Firestore** | corrida da criação (1 organização); retrocarga carimba só o que não tem campo, de um usuário só, e a segunda passada é no-op; `listByOrganization`, `summaryByOrganization` e `findInOrganization` isolam duas organizações com o repositório real. O unit não prova nada disso: são semânticas do Firestore (`create()` atômico em lote, campo ausente × `null`) | A |
| `accountErasureStorage.emulator.test.ts` | ajuste, emulador de Storage | varre `uploads/<profileId>/` e `uploads/org-<casa>/` e deixa `uploads/org-<outra>/` | A |
| `organizationInvitationsRoute.test.ts` | rota com mocks | só o dono; `EMAIL_NOT_CONFIGURED` antes do corpo; já membro 409; teto 409; reenvio cedo 429; falha de entrega → 201 `failed`; o token nunca aparece na resposta, e o hash gravado é `sha256` do token do link capturado no mock de `sendEmail`; revogar 204 e 404 | B |
| `invitationsPreviewRoute.test.ts`, `invitationsAcceptRoute.test.ts` | rota com o repositório mockado | mapeamento de cada resultado para `error.code`; aceite sob personificação → 403; flag desligada → 404 | B |
| `organizationMembersRoute.test.ts` | rota com mocks | lista para qualquer membro; remover só o dono; dono não sai nem é removido; fora da organização 404; sair devolve à organização de casa | B |
| **`organizationInvitation.emulator.test.ts`** | **emulador de Firestore** | uso único sob concorrência (3 aceites: 1 aceito, mesmo usuário 200, outro `INVALID`); emissão concorrente para o mesmo endereço gera um documento; organização dormente recusa. Prova a transação com consulta, que o mock não reproduz | B |
| `corsOrigin.test.ts` (proxy) | ajuste | as três rotas novas na lista de limite | B |
| `templates.test.tsx` (`packages/email`, `:180-195`) | ajuste | o slug novo renderiza nos três idiomas | B |
| `organizationMembersEnabled.test.ts` (api e app) | unit | `"true"`, `" TRUE "` ligam; `""`, ausente e `"false"` desligam | B |
| `commonNavRoutes.test.tsx` | ajuste | item "Equipe" some com a flag desligada e aparece ligada | B |
| `useOrganization.test.tsx` | hook | invalidações e `resetQueries` em aceitar e sair | B |
| `inviteMemberFormSchema.test.ts` | schema | e-mail obrigatório e inválido com mensagens do dicionário | B |
| `InvitationAcceptance.test.tsx` | componente | estados de §5.4, `redirect` com o token, clique duplo envia um pedido | B |
| `proxy.test.ts` (app) | ajuste | `/invite` público; logado não é mandado para a home e mantém a query | B |

A suíte de emulador sobe só Firestore e Storage (`vitest.emulator.config.mts:32` zera o host do Auth), então nenhum dos
testes de emulador acima pode depender do Auth. O e-mail do aceite entra como parâmetro do método do repositório.

**E2E (`apps/e2e`):** nenhuma spec nova nesta rodada. As existentes cobrem a fase A sem mudança: `entityCrud.spec.ts`
lista o "Acme Franchise" do seed, que passa pela retrocarga; `signUp.spec.ts` cria conta e organização no cadastro;
`panelSwitch.spec.ts` personifica e dispara a criação implícita num `GET`. O E2E roda com a flag vazia do `.env.example`
(`stackEnv.ts:107-131`), então cobre o modo B2C. Uma spec para a fase B exige outra pilha com a flag ligada (P18).

## 9. O que o `/test` vai percorrer

### 9.1 Dados de QA

- Seed do emulador (`admin@example.com`, `user@example.com`, `user2@example.com`).
- Conta nova pela UI: `qa-teams-organizations@example.com`. A senha fica em `.claude/dev-credentials.local.md`, nunca
  no relatório.
- **Token conhecido sem caixa de entrada.** O token não fica no Firestore, então não há o que ler, ao contrário do
  `oobCodes` do link de acesso. O `/test` cria o convite pela UI (prova emissão, lista e revogação) e, para o aceite, grava
  no emulador um `organizationInvitation` com um token escolhido por ele. Receita com `firebase-admin` contra
  `FIRESTORE_EMULATOR_HOST`: id = `sha256("<organizationId>:<email>")`, campos de §2.1 com
  `tokenHash = sha256("<token>")`, `acceptedAt: null`, `expiresAt` futuro (ou passado, para o estado expirado). A
  organização sai de `organizationMember/<profileId do dono>`. O script fica fora do repositório e é apagado no fim.
- Fase B exige a flag `"true"` na `api` e na `app`. Para ver a entrega falhar sem Resend real, `RESEND_TOKEN` com
  placeholder `re_…` (como o `/test` da PR #56); para ver o 503, Resend vazio.

### 9.2 Fluxos

| # | Fluxo | Esperado |
|---|---|---|
| F1 (A) | `user@example.com` entra; `/entities` | os dois registros do seed aparecem; no emulador, os documentos ganharam `organizationId` e `updatedAt` não mudou |
| F2 (A) | com o token de `user`, `GET`, `PUT` e `DELETE /entities/<id de user2>` direto na API | `404 ENTITY_NOT_FOUND` nos três |
| F3 (A) | cadastro novo; documento `organization` + vínculo de dono; criar registro | registro com `organizationId` da conta nova e `userId` dela |
| F4 (A) | criar e editar `entity` com upload de foto (emulador de Storage) | objeto em `uploads/org-<id>/`; avatar continua em `uploads/<profileId>/` |
| F5 (A) | admin personifica `user` | vê os registros dele; escrita recusada |
| F6 (A, flag vazia) | navegar o painel inteiro nos três idiomas | nenhum "Equipe"; nenhuma ocorrência de "organiza", "organization" ou "organización" no texto das páginas; `/pt-br/organization` e `/pt-br/invite` em 404; `GET /organization` na API → `404 ORGANIZATION_MEMBERS_DISABLED` |
| F7 (B) | dono convida `qa-teams-organizations@example.com` com token Resend placeholder | 201 `delivery: "failed"`, aviso traduzido, convite na lista; reenviar antes de 60 s → mensagem do 429; revogar some da lista |
| F8 (B) | Resend vazio, tentar convidar | mensagem de `EMAIL_NOT_CONFIGURED`, nada gravado |
| F9 (B) | token semeado; abrir `/pt-br/invite?token=…` deslogado → "Criar conta" com o e-mail do convite → volta ao convite → aceitar | prévia com e-mail de quem convidou; aceite leva à página da equipe; o dono vê 2 membros; o membro vê os registros do dono, cria um, e o dono vê |
| F10 (B) | o membro edita registro do dono sem tocar na foto | salva, sem `ENTITY_PHOTO_INVALID` |
| F11 (B) | `user2` logado abre convite de outro e-mail | aviso de e-mail diferente; aceitar → mensagem do 403 |
| F12 (B) | token semeado com `expiresAt` no passado; token qualquer | cartão de expirado; cartão de inválido |
| F13 (B) | dono tenta sair; dono remove o membro; o membro tenta `GET /entities/<id do dono>` | dono sem "Sair" (direto na API, 409); depois da remoção, 404 para o ex-membro, que volta à própria organização |
| F14 (B) | membro sai pela UI | volta à organização de casa, com os registros que tinha antes, se tinha |
| F15 (B) | dono com membro tenta excluir a conta | mensagem do 409, nada apagado; membro exclui a conta, e os registros que criou continuam para o dono |
| F16 (B) | clique duplo em "Aceitar" e em "Enviar convite" | um pedido de cada |

### 9.3 Combinações

Página da equipe e página de aceite em light, dark e mobile, nos três idiomas. A tabela é antd: conferir que segue o
tema. Comum, dono, membro e admin personificando na página da equipe.

### 9.4 Não observável sem infra externa (vira 🔒, não ❌)

Entrega real do e-mail (Resend com domínio, pendência 13); `429` real do Arcjet (pendência 24); os índices compostos no
projeto real; a TTL de `organizationInvitation`.

## 10. Critérios de aceite (rascunho; o `/test` formaliza)

# Critérios de Aceite (Checklist)

- [ ] **Toda conta comum nova nasce com uma organização em que é dona**
  O cadastro por e-mail e o primeiro contato pelo Google gravam um documento `organization` com `ownerUserId` igual ao
  id do perfil e um `organizationMember/{profileId}` com `role: "owner"`. Se essa gravação falhar no cadastro, a conta
  continua criada e o primeiro pedido a uma rota escopada cria a organização. Perfil criado pelo admin ganha a
  organização no primeiro pedido.

- [ ] **Quem já existia é migrado no primeiro pedido, sem script**
  Um perfil sem vínculo e com `entity` sem `organizationId` recebe organização e vínculo, e todos os seus registros,
  inclusive os apagados, ganham o `organizationId` sem mudança de `updatedAt`. Uma segunda passada não altera nada.
  Pedidos simultâneos no primeiro contato terminam com uma só organização.

- [ ] **Registro de outra organização responde 404, inclusive chamando a API direto**
  `GET`, `PUT` e `DELETE /entities/:id` com o id de um registro de outra organização, de um registro apagado ou de um
  registro ainda sem carimbo respondem `404 ENTITY_NOT_FOUND`, nunca 403 nem lista vazia disfarçada. A listagem e o resumo
  da home só contam registros da organização do sujeito.

- [ ] **Membros da mesma organização compartilham os registros**
  Um registro criado pelo membro aparece para o dono e vice-versa. Qualquer membro edita e apaga registro de outro autor.
  O campo `userId` do registro guarda quem criou e não decide acesso. Editar sem mexer na foto de um registro de outro
  autor salva normalmente.

- [ ] **Fotos de `entity` pertencem à organização; o avatar continua da pessoa**
  O upload pelo formulário de `entity` grava em `uploads/org-<organizationId>/`; o do avatar continua em
  `uploads/<profileId>/`. Anexar a um registro um objeto do prefixo pessoal de alguém responde `400 ENTITY_PHOTO_INVALID`.
  Trocar a foto apaga a anterior quando ela é da organização. `?scope=` com valor desconhecido responde
  `400 VALIDATION_FAILED`.

- [ ] **Sob personificação vale a organização do personificado, em modo leitura**
  O admin personificando vê os registros, os membros e os convites da organização do usuário, nunca os de outra.
  Qualquer escrita, aceite de convite inclusive, responde `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`. Personificar quem
  ainda não tinha organização cria a dela e migra os registros.

- [ ] **Papel na organização e papel de plataforma não se misturam**
  Um dono comum chamando rota de admin recebe `403 ADMIN_FORBIDDEN`. Um admin sem personificar não alcança as rotas de
  organização (`403 COMMON_PANEL_FORBIDDEN`) e não aceita convite. Um membro chamando rota só do dono recebe
  `403 ORGANIZATION_FORBIDDEN`.

- [ ] **Fork B2C não vê organização**
  Com `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED` vazia ou ausente, a app e a API sobem, o build passa, não há item
  "Equipe", nenhuma página mostra "organização", "organization" ou "organización" nos três idiomas, `/organization` e
  `/invite` respondem 404, e as rotas `/organization/*` e `/invitations/*` respondem `404 ORGANIZATION_MEMBERS_DISABLED`,
  nunca 500. Só `"true"` liga, sem diferenciar maiúsculas.

- [ ] **O dono convida por e-mail**
  Com a flag ligada, o dono informa um e-mail válido e recebe confirmação. O convite aparece em "Convites pendentes" com
  data de expiração 7 dias à frente. E-mail vazio, inválido ou só com espaços é barrado no formulário e responde
  `400 VALIDATION_FAILED` na API. Um membro não vê o formulário e, direto na API, recebe `403 ORGANIZATION_FORBIDDEN`.

- [ ] **Sem e-mail configurado o convite degrada com código**
  Sem Resend ou sem `NEXT_PUBLIC_APP_URL`, convidar responde `503 EMAIL_NOT_CONFIGURED` e nada é gravado. Com o provedor
  recusando, o convite é gravado, a resposta é 201 com `delivery: "failed"` e a tela avisa que o e-mail não saiu e que dá
  para reenviar.

- [ ] **O token nunca fica guardado nem é devolvido**
  O documento guarda só `tokenHash`, o `sha256` do token do link. Nenhuma resposta da API, nenhum DTO e nenhuma linha de
  log carrega o token ou o e-mail do convidado.

- [ ] **Reenvio idempotente, com teto e intervalo**
  Convidar de novo o mesmo endereço reaproveita o convite, gera token novo, invalida o anterior e renova a validade. Antes
  de 60 s responde `429 ORGANIZATION_INVITATION_RECENTLY_SENT`. Com 20 pendentes, um endereço novo responde
  `409 ORGANIZATION_INVITATION_LIMIT_REACHED`. Convidar quem já é membro, o próprio dono inclusive, responde
  `409 ORGANIZATION_INVITATION_ALREADY_MEMBER`. Duas requisições simultâneas para o mesmo endereço deixam um documento.

- [ ] **Revogar invalida o link**
  Revogar tira o convite da lista e apaga o documento. Abrir o link depois mostra convite inválido
  (`400 ORGANIZATION_INVITATION_INVALID`). Revogar id de outra organização ou convite aceito responde
  `404 ORGANIZATION_INVITATION_NOT_FOUND`.

- [ ] **A página do convite funciona deslogado e logado**
  Deslogado, mostra quem convidou e o e-mail convidado, com "Entrar" e "Criar conta" que voltam ao mesmo convite depois.
  Logado, não é mandado para a home e mantém o token. Sem token, com token desconhecido ou expirado, mostra o cartão
  correspondente, sem botão de aceitar.

- [ ] **Aceitar exige o e-mail do convite e vale uma vez**
  Conta com outro e-mail recebe `403 ORGANIZATION_INVITATION_EMAIL_MISMATCH` e a opção de entrar com outra conta.
  Convite vencido responde `400 ORGANIZATION_INVITATION_EXPIRED`. Clique duplo envia um pedido e, se dois chegarem, os
  dois respondem sucesso para a mesma pessoa. Outra pessoa com o mesmo token recebe `INVALID`.

- [ ] **E-mail já cadastrado não cria conta duplicada**
  O convidado que já tem conta entra com ela e aceita; quem não tem se cadastra pelo fluxo normal e aceita em seguida. Em
  nenhum dos dois caminhos surge uma segunda conta ou um segundo perfil para o mesmo e-mail.

- [ ] **Aceitar troca de organização sem perder a anterior**
  Depois do aceite, a pessoa vê os registros da organização nova e deixa de ver os da sua organização anterior, que ficam
  guardados nela. A página avisa disso antes do clique. Ao sair ou ser removida, ela volta à organização anterior com os
  registros. Dono de organização com outros membros não aceita (`409 ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS`), e
  convite de uma organização cujo dono foi para outra responde `INVALID`.

- [ ] **Lista de membros**
  Qualquer membro vê nome, e-mail, papel e data de entrada de todos, com busca por nome e e-mail e botão de atualizar.
  Só o dono vê "Remover", e nunca na própria linha. Perfil arquivado aparece sem nome e e-mail, sem quebrar a lista.

- [ ] **A organização nunca fica sem dono**
  O dono não tem "Sair". Direto na API, sair ou remover a si mesmo responde `409 ORGANIZATION_OWNER_CANNOT_LEAVE`. Remover
  o dono por id também responde 409. Excluir a conta com membros responde
  `409 ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS` antes de pedir a senha e sem apagar nada.

- [ ] **Remover e sair cortam o acesso no pedido seguinte**
  O membro removido, no próximo pedido, recebe 404 nos registros da organização e passa a ver a própria organização.
  Remover id de fora da organização responde `404 ORGANIZATION_MEMBER_NOT_FOUND`. O membro que sai pela UI volta à
  organização de casa, e a tela troca de dados sem recarregar.

- [ ] **Exclusão e exportação do titular separam pessoa e organização**
  Dono sozinho que exclui a conta leva a organização inteira: registros, fotos, vínculos e convites. Membro que exclui a
  conta leva só os dados pessoais e a organização de casa, e os registros que criou na organização de outro ficam lá. A
  exportação traz os registros que o titular criou, em qualquer organização, e o `membership` atual.

- [ ] **Erros traduzidos nos três idiomas**
  Os 13 códigos novos aparecem como texto em pt-br, en e es, sem código cru nem stack, nos toasts e cartões da página da
  equipe, da página de aceite e da exclusão de conta.

- [ ] **Tema e responsivo**
  A página da equipe e a página de aceite funcionam em light, dark e mobile. As tabelas antd seguem o tema, e os
  formulários e diálogos têm foco visível e rótulo acessível.

## 11. Modo degradado

| Falta | Comportamento |
|---|---|
| flag da fase B vazia (padrão) | B2C: nada novo na UI; rotas de membros e convites `404 ORGANIZATION_MEMBERS_DISABLED`; escopo por organização continua ativo e transparente |
| flag ligada só na `app` | página carrega e mostra o erro de carga traduzido de `ORGANIZATION_MEMBERS_DISABLED` |
| flag ligada só na `api` | nenhuma UI; rotas respondem, sem efeito para quem não as chama |
| Resend ou `NEXT_PUBLIC_APP_URL` | `503 EMAIL_NOT_CONFIGURED` ao convidar; o resto da página funciona |
| provedor de e-mail recusando | 201 com `delivery: "failed"`, aviso, reenvio possível |
| índices compostos não publicados | lista `503 PAGINATION_INDEX_MISSING`, resumo `503 SUMMARY_INDEX_MISSING` (`entities/route.ts:47-52`, `summary/route.ts:14-18`): erro de carga na tela, nunca 500 |
| TTL de convite | convites vencidos e aceitos ficam (um por organização e endereço) e continuam inúteis, porque a expiração é checada no código |
| `ARCJET_KEY` | sem limite por IP; teto de 20 pendentes e intervalo de 60 s seguem |
| bucket | `POST /files` continua `503 STORAGE_NOT_CONFIGURED`; `scope` não muda isso |

Desligar a flag depois de ter membros não desfaz a equipe: os membros continuam vendo os registros da organização e
ninguém consegue gerenciar. O `FORKING.md` diz isso.

## 12. Pré-requisitos manuais de infra

O `/develop` não consegue satisfazê-los e o `/test` não reprova por eles. Cada um vira entrada em `docs/PRE-PRODUCTION.md`.

| # | Pré-requisito | Quando | Sem ele |
|---|---|---|---|
| 1 | Publicar os três índices compostos de `entity` por `organizationId` (`firebase deploy --only firestore:indexes`) e esperar ficarem prontos **antes** do deploy da API | todo fork com `entity`, fase A | listagem e home em 503 com código até o índice ficar pronto |
| 2 | Depois do deploy, confirmar a remoção dos três índices de `entity` por `userId`, que deixam de ter consulta | fase A, opcional | nada quebra; o fork paga gravação de índice sem uso |
| 3 | Política de TTL em `organizationInvitation.expiresAt` | fase B, opcional, exige faturamento ativo como a TTL de `notification` (§1.9) | documentos vencidos ficam até revogação, regravação ou expurgo da organização |
| 4 | Resend com domínio verificado (SPF/DKIM) e `NEXT_PUBLIC_APP_URL` na `api` | fase B, fork B2B | `503 EMAIL_NOT_CONFIGURED` ou `delivery: "failed"` |
| 5 | `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED="true"` na `api` **e** na `app` (Vercel, os dois projetos) | fase B, fork B2B | modo B2C |
| 6 | `ARCJET_KEY` (pendência 24) | fase B | sem limite por IP nas três rotas novas |
| 7 | Domínio da `app` em "Domínios autorizados" do Firebase Auth | já exigido pelo cadastro e pelo login | o cadastro a partir do convite falha como qualquer cadastro |

Nenhuma rule muda: `firestore.rules` e `storage.rules` negam tudo ao cliente, e a API usa o Admin SDK. O comentário de
`firestore.rules:39-43` sobre `entity.userId` ganha a nota de que o escopo agora é `organizationId`.

## 13. Riscos para o `/develop` e o `/review` olharem com desconfiança

1. **Handler novo sem escopo vaza entre organizações.** Os métodos por `userId` de listagem, resumo e expurgo têm de
   **sumir** do repositório. Conferir com `git grep 'where("userId"' apps/api/(shared)/repositories/entity.repository.ts`:
   sobram só a exportação por autor e a retrocarga.
2. **A foto reenviada no `PUT`** (§4.4). Sem a exceção do valor inalterado, o membro não salva nada em registro de outro
   autor que tenha foto.
3. **`== null` não casa com campo ausente** (medido). A retrocarga e o expurgo de não carimbados filtram em memória. Uma
   consulta `organizationId == null` "funciona" no teste e não migra nada.
4. **Corrida de criação.** Tem de ser `create()` nos dois documentos no mesmo lote, não `set`. Com `set`, o segundo
   pedido sobrescreve o vínculo e deixa uma organização órfã.
5. **Remoção de vínculo é `purge`.** Um `deletedAt` deixaria o documento no lugar e o `create()` do resolvedor falharia
   para sempre.
6. **A escrita sob personificação no resolvedor é deliberada** (§4.3). Quem revisar não deve "corrigir" isso recusando o
   `GET`.
7. **Retrocarga sem `updatedAt`.** Ela usa `batch.update` direto, não `BaseRepository.update`, que carimba `updatedAt`
   (`base.repository.ts:207-219`).
8. **`/invite` nas duas listas do proxy da app.** Só em `PUBLIC_PATHS`, o usuário logado perde o token.
9. **As três rotas na lista do proxy da API.** O casamento é exato: rota não listada não tem limite.
10. **`resetQueries` depois de aceitar e de sair.** Sem isso, a lista de `entity` em cache é da organização anterior.
11. **Mocks dos testes que importam `user-merge.ts`.** O resolvedor novo importa repositórios, e `infra/database.ts`
    toca o Admin SDK no import.
12. **Fixtures de `EntityDTO`** nos testes da `app` e da `api` precisam do `organizationId` (o `typecheck` acusa).
13. **Documentação que ensina o predicado antigo.** Sete lugares mandam copiar `row.userId !== ctx.subjectProfile.id`
    (§10.8). Se só o código mudar, o próximo recurso nasce escopado por pessoa.
14. **Dono promovido a admin ou arquivado.** A organização continua para os membros e fica sem administração. Está fora
    do corte e documentado; não é defeito desta entrega.
15. **Sign-up com `redirect` para `/invite?token=`.** O sanitizador aceita, mas o caminho cadastro → (onboarding) →
    convite não foi medido. Fica para o `/test` (F9).

## 14. Pós-entrega e fork

- Rollback da fase A: reverter o commit da API volta o predicado por `userId`; os documentos carimbados continuam com
  `userId` correto, e o campo extra é ignorado. Os índices por `userId` precisam continuar publicados para isso (por isso
  o pré-requisito 2 é "depois do deploy").
- Fork que cria recurso novo: escopo por organização com `requireOrganizationApi` + helper privado no repositório, como
  `entity`; recurso da pessoa por `userId`, como `notification`. A regra vai para `apps/api/CLAUDE.md` e para as skills
  `new-api-route` e `new-crud`.

---

# Etapa 2: blueprint técnico

## 10.1 Contrato (`packages/sdk`)

```ts
// packages/sdk/src/types/organization/organization.ts
// Fase A
export const ORGANIZATION_ROLES = ["owner", "member"] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export type OrganizationMembershipDTO = {
    organizationId: string;
    role: OrganizationRole;
    joinedAt: string;
};

// Fase B
export type OrganizationDTO = {
    id: string;
    ownerUserId: string;
    /** The caller's role, not a property of the organization. */
    viewerRole: OrganizationRole;
};

export type OrganizationMemberDTO = {
    userId: string;
    role: OrganizationRole;
    email: string | null;
    displayName: string | null;
    joinedAt: string;
};

export type OrganizationInvitationStatus = "pending" | "expired";

export type OrganizationInvitationDTO = {
    id: string;
    email: string;
    role: "member";
    status: OrganizationInvitationStatus;
    expiresAt: string;
    lastSentAt: string;
    createdAt: string;
};

export type CreateOrganizationInvitationRequest = {
    email: string;
    locale?: UserPreferences["locale"];
};

export type OrganizationInvitationDelivery = "sent" | "failed";

export type CreateOrganizationInvitationResponse = {
    invitation: OrganizationInvitationDTO;
    delivery: OrganizationInvitationDelivery;
};

export type OrganizationInvitationTokenRequest = { token: string };

export type OrganizationInvitationPreviewDTO = {
    email: string;
    inviterEmail: string | null;
    expiresAt: string;
};

export type AcceptOrganizationInvitationResponse = { organizationId: string };
```

```ts
// packages/sdk/src/types/entity/entity.ts (fase A)
export type EntityDTO = {
    id: string;
    /** The scope: every read and write is decided by it. */
    organizationId: string;
    /** Profile id of whoever created the record. It does not grant access. */
    userId: string;
    // ...resto inalterado
};

// packages/sdk/src/types/file (fase A)
export type UploadScope = "personal" | "organization";

// packages/sdk/src/types/account/account.ts (fase A)
export type AccountDataExportDTO = {
    // ...campos atuais
    membership: OrganizationMembershipDTO | null;
};
```

```ts
// packages/sdk/src/actions/organization/action.ts (fase B)
export default class OrganizationActions {
    get(): Promise<OrganizationDTO>;                                   // GET    /organization
    listMembers(): Promise<OrganizationMemberDTO[]>;                   // GET    /organization/members
    removeMember(userId: string): Promise<void>;                       // DELETE /organization/members/:id
    leave(): Promise<void>;                                            // POST   /organization/leave
    listInvitations(): Promise<OrganizationInvitationDTO[]>;           // GET    /organization/invitations
    invite(body: CreateOrganizationInvitationRequest):
        Promise<CreateOrganizationInvitationResponse>;                 // POST   /organization/invitations
    revokeInvitation(id: string): Promise<void>;                       // DELETE /organization/invitations/:id
    previewInvitation(token: string):
        Promise<OrganizationInvitationPreviewDTO>;                     // POST   /invitations/preview
    acceptInvitation(token: string):
        Promise<AcceptOrganizationInvitationResponse>;                 // POST   /invitations/accept
}
// ids no path com encodeURIComponent, como notification/action.ts:48
```

## 10.2 Guard e resolução

```ts
// apps/api/app/(guards)/organization.ts
export type OrganizationContext = { organizationId: string; role: OrganizationRole };
export type OrganizationAuthContext = CommonPanelAuthContext & { organization: OrganizationContext };

type Options = {
    plan?: PlanRequirementSource;
    role?: OrganizationRole;
    membersFeature?: boolean;
};

export function requireOrganizationApi<TRouteContext extends RouteContext = undefined>(
    handler: OrganizationHandler<TRouteContext>,
    options: Options = {}
) {
    return requirePlanApi<TRouteContext>(options.plan ?? null, async (req, ctx) => {
        if (options.membersFeature && !isOrganizationMembersEnabled()) {
            return Response.json(
                { error: { code: "ORGANIZATION_MEMBERS_DISABLED" } },
                { status: HTTP_STATUS.NOT_FOUND }
            );
        }
        const membership = await resolveOrganizationMembership(ctx.subjectProfile.id);
        if (options.role === "owner" && membership.role !== "owner") {
            return Response.json(
                { error: { code: "ORGANIZATION_FORBIDDEN" } },
                { status: HTTP_STATUS.FORBIDDEN }
            );
        }
        return handler(req, {
            ...ctx,
            organization: { organizationId: membership.organizationId, role: membership.role },
        });
    });
}

export const requireOrganizationMembersApi = <T extends RouteContext = undefined>(
    handler: OrganizationHandler<T>,
    options: Pick<Options, "role"> = {}
) => requireOrganizationApi<T>(handler, { ...options, membersFeature: true });
```

A flag é checada depois do gate de plano, como na ordem de §4.2; nenhuma rota de membros passa `plan`.
`ownsOrganizationWithMembers(profileId)`, usado pela exclusão de conta, mora no mesmo arquivo do resolvedor.

```ts
// apps/api/(shared)/lib/organization-membership.ts
export async function resolveOrganizationMembership(profileId: string): Promise<MembershipRow> {
    const membership =
        (await organizationMemberRepository.findByUserId(profileId)) ??
        (await joinHomeOrganization(profileId));

    if (membership.legacyClaimPending) {
        await claimLegacyRecordsQuietly(membership);
    }
    return membership;
}

async function joinHomeOrganization(profileId: string): Promise<MembershipRow> {
    const home = await organizationRepository.findOwnedBy(profileId);
    const created = await organizationMemberRepository.createOwnerMembership({
        userId: profileId,
        organizationId: home?.id ?? null, // null: cria organização nova no mesmo lote
    });
    // `null` = ALREADY_EXISTS: outra requisição gravou primeiro.
    return created ?? (await organizationMemberRepository.findByUserId(profileId))!;
}

async function claimLegacyRecordsQuietly(membership: MembershipRow): Promise<void> {
    try {
        const outcome = await entityRepository.claimUnscopedByUserId(
            membership.userId,
            membership.organizationId
        );
        if (outcome === "finished") {
            await organizationMemberRepository.clearLegacyClaim(membership.userId);
        } else {
            logEvent("organization", "legacy-claim-unfinished");
        }
    } catch {
        logEvent("organization", "legacy-claim-failed");
    }
}

export async function ensureOrganizationMembershipQuietly(profileId: string): Promise<void>;
```

## 10.3 Repositórios, mappers e forma dos documentos

```
organization/{autoId}
  { ownerUserId: "<profileId>", createdAt, updatedAt, deletedAt: null }

organizationMember/{profileId}
  { organizationId: "<orgId>", userId: "<profileId>", role: "owner" | "member",
    joinedAt, legacyClaimPending: boolean, createdAt, updatedAt, deletedAt: null }

organizationInvitation/{sha256("<orgId>:<email>")}
  { organizationId, email, role: "member", tokenHash, invitedByUserId, inviterEmail,
    expiresAt, lastSentAt, acceptedAt: null, acceptedByUserId: null,
    createdAt, updatedAt, deletedAt: null }

entity/{autoId}
  { organizationId: "<orgId>", userId: "<autor>", ...campos atuais }
```

| Repositório | Métodos | Fase |
|---|---|---|
| `entity.repository.ts` | `private inOrganization(orgId)`; `listByOrganization(orgId, page)`; `findInOrganization(id, orgId)`; `summaryByOrganization(orgId)`; `purgeByOrganization(orgId)`; `findAllByUserId(userId, limit)` (inalterado, autoria); `claimUnscopedByUserId(userId, orgId): "finished" \| "unfinished"`; `purgeUnscopedByUserId(userId)`. **Saem** `listByUserId`, `summaryByUserId`, `purgeAllByUserId` | A |
| `organization.repository.ts` (`super(db, "organization")`) | `findOwnedBy(profileId)`; `purgeById(id)` | A |
| `organization-member.repository.ts` (`super(db, "organizationMember", organizationMemberMapper)`) | `findByUserId(profileId)`; `createOwnerMembership({ userId, organizationId })` (lote com `create()`; `null` em `ALREADY_EXISTS`, via `isAlreadyExistsError`, `firestore-errors.ts:1-6`); `clearLegacyClaim(profileId)`; `listByOrganization(orgId)`; `countByOrganization(orgId)`; `findInOrganization(profileId, orgId)`; `remove(profileId)` (purge); `purgeByOrganization(orgId)` | A (+B) |
| `organization-invitation.repository.ts` (`super(db, "organizationInvitation", organizationInvitationMapper)`) | `issue({ organizationId, email, inviterEmail, invitedByUserId, tokenHash, now })` (transação; `issued` \| `recently-sent` \| `limit-reached`); `listOpenByOrganization(orgId)`; `findInOrganization(id, orgId)`; `revoke(id)`; `findByTokenHash(hash)`; `acceptByTokenHash({ tokenHash, userId, email, now })` (transação; `accepted` \| `already-accepted` \| `invalid` \| `expired` \| `email-mismatch` \| `already-member` \| `owner-has-members`); `purgeByOrganization(orgId)`; `purgeOpenByEmail(email)` | B |

Mappers: `organization-member.mapper.ts` e `organization-invitation.mapper.ts` com `normalizeFirestoreInstant` nas datas
e `toPersistence` por lista fechada de chaves. O de convite **não** expõe `tokenHash`, `invitedByUserId` nem
`acceptedByUserId` no DTO, e deriva `status` de `expiresAt`. `entity.mapper.ts` ganha `organizationId` nas duas direções.
`organization` dispensa mapper: o documento não sai como DTO.

## 10.4 Rotas: exemplos

| Método | Path | Guard | Quem | Fase |
|---|---|---|---|---|
| GET | `/entities`, `/entities/summary`, `/entities/:id` | `requireOrganizationApi` | membro | A |
| POST | `/entities` | `requireOrganizationApi(…, { plan })` | membro | A |
| PUT, DELETE | `/entities/:id` | `requireOrganizationApi` | membro | A |
| POST | `/files` | `requireOrganizationApi` | membro | A |
| GET | `/organization` | `requireOrganizationMembersApi` | membro | B |
| GET | `/organization/members` | idem | membro | B |
| DELETE | `/organization/members/:id` | idem, `role: "owner"` | dono | B |
| POST | `/organization/leave` | idem | membro | B |
| GET, POST | `/organization/invitations` | idem, `role: "owner"` | dono | B |
| DELETE | `/organization/invitations/:id` | idem, `role: "owner"` | dono | B |
| POST | `/invitations/preview` | nenhum (`export async function POST`) + flag | público | B |
| POST | `/invitations/accept` | `requireCommonPanelApi` + flag | autenticado | B |

```http
POST /organization/invitations
{ "email": "qa-teams-organizations@example.com", "locale": "pt-br" }

201
{ "data": {
    "invitation": { "id": "3f1c…", "email": "qa-teams-organizations@example.com", "role": "member",
                    "status": "pending", "expiresAt": "2026-10-29T14:36:00.000Z",
                    "lastSentAt": "2026-10-22T14:36:00.000Z", "createdAt": "2026-10-22T14:36:00.000Z" },
    "delivery": "sent" } }

POST /invitations/preview
{ "token": "<43 caracteres base64url>" }
200 { "data": { "email": "qa-teams-organizations@example.com", "inviterEmail": "user@example.com",
                "expiresAt": "2026-10-29T14:36:00.000Z" } }
400 { "error": { "code": "ORGANIZATION_INVITATION_EXPIRED" } }

POST /invitations/accept
{ "token": "<43 caracteres base64url>" }
200 { "data": { "organizationId": "Xy7…" } }
403 { "error": { "code": "ORGANIZATION_INVITATION_EMAIL_MISMATCH" } }

GET /organization/members
200 { "data": [
    { "userId": "Ab1…", "role": "owner", "email": "user@example.com", "displayName": null,
      "joinedAt": "2026-10-22T14:00:00.000Z" },
    { "userId": "Cd2…", "role": "member", "email": "qa-teams-organizations@example.com",
      "displayName": null, "joinedAt": "2026-10-22T14:40:00.000Z" } ] }

GET /organization
200 { "data": { "id": "Xy7…", "ownerUserId": "Ab1…", "viewerRole": "owner" } }
```

Esqueleto do aceite:

```ts
// apps/api/app/(routes)/invitations/accept/route.ts
export const POST = requireCommonPanelApi(async (req, ctx) => {
    if (!isOrganizationMembersEnabled()) return disabled();
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const parsed = parseInvitationToken(parsedBody.value);
    if (!parsed.ok) return parsed.response;

    const outcome = await organizationInvitationRepository.acceptByTokenHash({
        tokenHash: hashInvitationToken(parsed.value.token),
        userId: ctx.subjectProfile.id,
        email: normalizeInvitationEmail(ctx.user.email ?? ""),
        now: new Date(),
    });
    return respondToAcceptOutcome(outcome); // tabela de §4.11
});
```

Validação (`apps/api/(shared)/validation/organization.schema.ts`): `parseCreateInvitation` (e-mail obrigatório, até 254
caracteres, `trim` + minúsculas, `locale` opcional entre os três) e `parseInvitationToken` (`^[A-Za-z0-9_-]{43}$`), com o
retorno `{ ok: true; value } | { ok: false; response }` e `VALIDATION_FAILED`. Constantes:
`ORGANIZATION_INVITATION_TTL_DAYS = 7`, `ORGANIZATION_PENDING_INVITATIONS_MAX = 20`,
`ORGANIZATION_INVITATION_RESEND_COOLDOWN_SECONDS = 60`, `LEGACY_CLAIM_BATCH_SIZE = 500`, `LEGACY_CLAIM_MAX_PASSES = 100`.

## 10.5 Pseudo-diffs de código existente

```diff
 // apps/api/app/(routes)/entities/[id]/route.ts  (GET; PUT e DELETE iguais)
-export const GET = requireCommonPanelApi<RouteIdParamsContext>(
+export const GET = requireOrganizationApi<RouteIdParamsContext>(
     async (_req, ctx) => {
         const id = await resolveIdFromContext(ctx);
-        const row = await entityRepository.findById(id);
-        if (!row || row.userId !== ctx.subjectProfile.id) {
+        const row = await entityRepository.findInOrganization(id, ctx.organization.organizationId);
+        if (!row) {
             return Response.json({ error: { code: "ENTITY_NOT_FOUND" } }, { status: 404 });

 // PUT, foto
-            if (patch.photo && !isUsablePhotoReference(patch.photo, ctx.subjectProfile.id)) {
+            if (
+                patch.photo &&
+                patch.photo !== existing.photo &&
+                !isAttachablePhoto(patch.photo, ctx.organization.organizationId)
+            ) {
 ...
-            isOwnStorageObject(previousPhoto, ctx.subjectProfile.id)
+            isReplaceablePhoto(previousPhoto, {
+                organizationId: ctx.organization.organizationId,
+                actorId: ctx.subjectProfile.id,
+                authorId: existing.userId,
+            })
```

```diff
 // apps/api/app/(routes)/entities/route.ts
-export const GET = requireCommonPanelApi(async (req, ctx) => {
+export const GET = requireOrganizationApi(async (req, ctx) => {
-        const page = await entityRepository.listByUserId(ctx.subjectProfile.id, parsedQuery.value);
+        const page = await entityRepository.listByOrganization(ctx.organization.organizationId, parsedQuery.value);

-export const POST = requirePlanApi(entityPlanRequirement, async (req, ctx) => {
+export const POST = requireOrganizationApi(async (req, ctx) => {
-    if (photo && !isUsablePhotoReference(photo, ctx.subjectProfile.id)) {
+    if (photo && !isAttachablePhoto(photo, ctx.organization.organizationId)) {
     const created = await entityRepository.create({
+        organizationId: ctx.organization.organizationId,
         userId: ctx.subjectProfile.id,
-});
+}, { plan: entityPlanRequirement });
```

```diff
 // apps/api/(shared)/lib/entity-photo.ts
+export const isAttachablePhoto = (value: string, organizationId: string): boolean =>
+    isAbsoluteHttpUrl(value) || isOwnStorageObject(value, organizationOwnerSegment(organizationId));
+
+/** The author's own personal-prefix object is the photo this record held before photos moved to the organization. */
+export const isReplaceablePhoto = (
+    value: string,
+    scope: { organizationId: string; actorId: string; authorId: string }
+): boolean =>
+    isOwnStorageObject(value, organizationOwnerSegment(scope.organizationId)) ||
+    (scope.actorId === scope.authorId && isOwnStorageObject(value, scope.actorId));
 // isUsablePhotoReference fica: o avatar usa (account/route.ts:49)

 // apps/api/(shared)/lib/storage.ts
+/** Profile ids are Firestore auto-ids, letters and digits only, so the hyphen keeps the two namespaces apart. */
+export const organizationOwnerSegment = (organizationId: string): string => `org-${organizationId}`;
```

```diff
 // apps/api/app/(routes)/files/route.ts
-export const POST = requireCommonPanelApi(async (req, ctx) => {
+export const POST = requireOrganizationApi(async (req, ctx) => {
+    const scope = parseUploadScope(req);
+    if (!scope.ok) return scope.response;
 ...
-    const path = buildObjectPath(ctx.subjectProfile.id, extension);
+    const owner = scope.value === "organization"
+        ? organizationOwnerSegment(ctx.organization.organizationId)
+        : ctx.subjectProfile.id;
+    const path = buildObjectPath(owner, extension);
```

```diff
 // apps/api/app/(routes)/entities/summary/route.ts
-export const GET = requireCommonPanelApi(async (_req, ctx) => {
-        const summary = await entityRepository.summaryByUserId(ctx.subjectProfile.id);
+export const GET = requireOrganizationApi(async (_req, ctx) => {
+        const summary = await entityRepository.summaryByOrganization(ctx.organization.organizationId);
```

```diff
 // apps/api/(shared)/lib/user-merge.ts  (createDefaultUserProfile)
     if (created.type === UserType.COMMON) {
+        await ensureOrganizationMembershipQuietly(created.id);
         await emitNotificationQuietly({ ... });
     }
```

```diff
 // apps/api/app/(routes)/account/deletion/route.ts  (depois de parseDeleteAccount, antes da senha)
+    if (await ownsOrganizationWithMembers(ctx.subjectProfile.id)) {
+        return Response.json(
+            { error: { code: "ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS" } },
+            { status: HTTP_STATUS.CONFLICT }
+        );
+    }
```

```diff
 // apps/api/(shared)/lib/account-erasure.ts
 export type ErasureStepName =
     | "storage" | "billing" | "entities"
+    | "organization"
     | "auditTrail" | "sessions" | "notifications" | "profile" | "authAccount";

 export type AccountErasureInput = {
     profile: UserDTO;
     uid: string;
+    email: string | null; // convites endereçados ao titular (fase B)
     requestId: string | null;
 };

 async function eraseData(input) {
+    const home = await organizationRepository.findOwnedBy(input.profile.id);
     return [
-        await eraseStorage(profileId),
+        await eraseStorage(profileId, home?.id ?? null),          // dois prefixos
-        await runStep("entities", () => entityRepository.purgeAllByUserId(profileId)),
+        await runStep("entities", () => eraseEntities(profileId, home?.id ?? null)),
+        await runStep("organization", () => eraseOrganization(profileId, home?.id ?? null, input.email)),
         ...
```

```diff
 // apps/api/(shared)/lib/account-export.ts
-    const [entities, auditEvents, storageObjects, sessions, notifications] = await Promise.all([
+    const [entities, auditEvents, storageObjects, sessions, notifications, membership] = await Promise.all([
         entityRepository.findAllByUserId(profile.id, EXPORT_MAX_RECORDS),
         ...
+        organizationMemberRepository.findByUserId(profile.id),
     ]);
+        membership: membership ? toMembershipDTO(membership) : null,
```

```diff
 // apps/api/proxy.ts
 const RATE_LIMITED_PATHS = [
     ...
     "/contact",
+    "/organization/invitations",
+    "/invitations/preview",
+    "/invitations/accept",
 ];

 // apps/app/proxy.ts
 export const PUBLIC_PATHS = [ ..., "/verify-email", "/invite" ] as const;
-const OOB_ACTION_PATHS = ["/reset-password", "/verify-email"] as const;
+const OOB_ACTION_PATHS = ["/reset-password", "/verify-email", "/invite"] as const;
```

```diff
 // firestore.indexes.json
-  { "collectionGroup": "entity", "fields": [ userId ASC, deletedAt ASC, createdAt DESC ] },
-  { "collectionGroup": "entity", "fields": [ userId ASC, deletedAt ASC, enabled ASC ] },
-  { "collectionGroup": "entity", "fields": [ userId ASC, deletedAt ASC, type ASC ] },
+  { "collectionGroup": "entity", "fields": [ organizationId ASC, deletedAt ASC, createdAt DESC ] },
+  { "collectionGroup": "entity", "fields": [ organizationId ASC, deletedAt ASC, enabled ASC ] },
+  { "collectionGroup": "entity", "fields": [ organizationId ASC, deletedAt ASC, type ASC ] },
```

## 10.6 Front (`apps/app`)

```
apps/app/
  env.ts                                              (B) NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED
  proxy.ts                                            (B) /invite público e OOB
  shared/lib/organizationMembersEnabled.ts            (B)
  shared/lib/queryKeys.ts                             (B) organization.*
  shared/hooks/useFileUpload.ts                       (A) opção scope
  app/[locale]/(authenticated)/(common)/
    paths.ts, routes.tsx                              (B) item "Equipe"
    (pages)/entities/(pages)/create/page.tsx          (A) useFileUpload({ scope: "organization" })
    (pages)/entities/(pages)/edit/[id]/EditEntityClient.tsx  (A) idem
    (pages)/organization/                             (B)
      page.tsx
      loading.tsx
      OrganizationClient.tsx
      (components)/OrganizationMembersTable.tsx
      (components)/OrganizationInvitationsTable.tsx
      (components)/InviteMemberForm.tsx
      (components)/LeaveOrganizationButton.tsx
      (hooks)/useOrganization.tsx                     useOrganization + fetchOrganization
      (hooks)/useListOrganizationMembers.tsx          + fetchOrganizationMembersList
      (hooks)/useListOrganizationInvitations.tsx      + fetchOrganizationInvitationsList (enabled só para o dono)
      (hooks)/useOrganizationActions.tsx              invite, revoke, removeMember, leave
      (validations)/inviteMemberFormSchema.ts         buildInviteMemberFormSchema(dictionary)
  app/[locale]/(unauthenticated)/invite/              (B)
    page.tsx
    components/InvitationAcceptance.tsx
    hooks/useInvitation.ts                            useInvitationPreview + acceptInvitation
```

```ts
// apps/app/shared/lib/queryKeys.ts
organization: {
    all: ["organization"] as const,
    detail: () => [...queryKeys.organization.all, "detail"] as const,
    members: () => [...queryKeys.organization.all, "members"] as const,
    invitations: () => [...queryKeys.organization.all, "invitations"] as const,
},
```

| Formulário | Campo | Componente |
|---|---|---|
| Convidar | `email` | `HookFormInput` (`type="email"`, `autoComplete="off"`) |

## 10.7 i18n (forma das chaves; o `/develop` escreve o texto final nos três idiomas)

```
apps.app.pages.common.organization
  title, description
  members: { title, columns: { name, email, role, joinedAt, actions }, roles: { owner, member },
             unnamed, emptyText, searchPlaceholder, removeConfirmTitle, removeConfirmDescription, removed }
  invite: { title, emailLabel, emailPlaceholder, submit, sent, deliveryFailed,
            validation: { required, invalid } }
  invitations: { title, columns: { email, lastSentAt, expiresAt, actions }, expired, resend, revoke,
                 revokeConfirmTitle, revokeConfirmDescription, revoked, emptyText }
  leave: { action, confirmTitle, confirmDescription, confirm, cancel, done }
  loadError
apps.app.pages.common.routes.platform.organization
apps.app.pages.invitation
  title, invitedBy, invitedEmail, expiresAt, signIn, signUp, signedInAs, emailMismatch,
  switchAccount, previousOrganizationNotice, accept, accepted, invalidTitle, invalidBody,
  expiredTitle, expiredBody, goToSignIn
packages.email.actionLink.actions.organizationInvitation
  subject, preview, title ("{name}" = e-mail de quem convidou), body, cta
packages.shared.utils.apiErrors
  ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS (A) + os 12 ORGANIZATION_* de §4.11 (B)
```

## 10.8 Documentação

| Arquivo | Mudança | Fase |
|---|---|---|
| `docs/ARCHITECTURE.md` | seção "Escopo de dados: organização": B2C na interface e B2B no modelo; uma organização por conta comum; recurso da organização × recurso da pessoa; os dois eixos de papel; a flag | A |
| `apps/api/CLAUDE.md:31`, `docs/SECURITY.md:30-42`, `docs/feature-analysis-guide.md:77-78` e `:135-137`, `docs/review-checklist.md:66-69`, `.claude/skills/new-api-route/SKILL.md:44`, `.claude/skills/write-tests/SKILL.md:66`, `.claude/agents/desenvolvedor.md:78` | trocar o exemplo de posse por pessoa pela regra dos dois escopos; `SECURITY.md` ganha o guard novo na lista | A |
| `docs/ROPA.md` §9 (`:155-166`), §11 (`:182-195`) e registro novo "Organizações, membros e convites" | prefixo da organização, o que fica com a organização na exclusão, e-mail do convidado e retenção do convite | A e B |
| `docs/PRE-PRODUCTION.md` | §1.1 e §1.5 com os índices novos; §1.8 (tabela de entradas publicadas); §1.10 nova (índices e TTL de convite); §16 nova (membros e convites, só se o fork liga); declaração de exclusão (`:844-868`) com o passo `organization` e o 409 | A e B |
| `docs/BACKUP.md:91-93`, `docs/SUBPROCESSORS.md:34`, `docs/FORKING.md:468` + seção "Ligar membros e convites" | o que a exclusão alcança; prefixo da organização; como ligar, o que desligar não desfaz, a constante de 7 dias | A e B |
| `firestore.rules:39-43` (comentário) | o escopo é `organizationId` | A |
| `apps/api/.env.example`, `apps/app/.env.example` | `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED=""` com comentário | B |
| `apps/api/scripts/seed-emulator.mjs` (comentário de `:160-162`) | o seed grava `entity` sem `organizationId` para exercitar a retrocarga | A |

## 10.9 Env

| Variável | Onde | Valor | Fase |
|---|---|---|---|
| `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED` | `apps/api` (bloco `client`) e `apps/app` | `"true"` liga; vazia, ausente ou outra coisa, desliga | B |

Nada novo na fase A.

## 10.10 Arquivos por camada e fase

**Fase A**

- `packages/sdk`: `types/organization/{organization.ts,index.ts}` (novo), `types/index.ts`, `types/entity/entity.ts`,
  `types/account/account.ts`, `types/file/*` (`UploadScope`), `actions/file/action.ts`.
- `packages/shared`: `utils/helpers/log.ts` (`LogScope` `"organization"`).
- `apps/api`:
  - novos: `app/(guards)/organization.ts`, `(shared)/lib/organization-membership.ts`,
    `(shared)/repositories/organization.repository.ts`, `(shared)/repositories/organization-member.repository.ts`,
    `(shared)/mappers/organization-member.mapper.ts`;
  - alterados: `app/(routes)/entities/route.ts`, `entities/[id]/route.ts`, `entities/summary/route.ts`, `files/route.ts`,
    `account/deletion/route.ts`, `(shared)/repositories/entity.repository.ts`, `(shared)/mappers/entity.mapper.ts`,
    `(shared)/lib/entity-photo.ts`, `(shared)/lib/storage.ts`, `(shared)/lib/user-merge.ts`,
    `(shared)/lib/account-erasure.ts`, `(shared)/lib/account-export.ts`, `(shared)/validation/file.schema.ts`,
    `scripts/seed-emulator.mjs` (comentário);
  - testes: os de §8 marcados A.
- `apps/app`: `shared/hooks/useFileUpload.ts`, `entities/(pages)/create/page.tsx`, `entities/(pages)/edit/[id]/EditEntityClient.tsx`,
  fixtures de `EntityDTO` nos testes.
- `packages/internationalization`: `translations/packages/shared/utils.ts` (1 código).
- raiz: `firestore.indexes.json`, `firestore.rules` (comentário).
- docs: linhas A de §10.8.

**Fase B**

- `packages/sdk`: `types/organization/organization.ts` (resto), `actions/organization/action.ts` (novo),
  `client/index.ts`.
- `apps/api`:
  - novos: `(shared)/lib/organization-members.ts` (flag), `(shared)/lib/organization-invitation.ts` (token, hash, link,
    entrega), `(shared)/repositories/organization-invitation.repository.ts`,
    `(shared)/mappers/organization-invitation.mapper.ts`, `(shared)/validation/organization.schema.ts`, e as rotas
    `app/(routes)/organization/route.ts`, `organization/members/route.ts`, `organization/members/[id]/route.ts`,
    `organization/leave/route.ts`, `organization/invitations/route.ts`, `organization/invitations/[id]/route.ts`,
    `invitations/preview/route.ts`, `invitations/accept/route.ts`;
  - alterados: `env.ts`, `.env.example`, `proxy.ts`, `(shared)/lib/account-erasure.ts` (convites do titular),
    `(shared)/repositories/organization-member.repository.ts` (métodos de membros);
  - testes: os de §8 marcados B.
- `packages/email`: `__tests__/templates.test.tsx` (slug novo). O template não muda.
- `apps/app`: os arquivos B de §10.6 + `__tests__`.
- `packages/internationalization`: `apps/app/pages/common/organization.ts` (novo), `common/index.ts`,
  `common/routes/index.ts`, `apps/app/pages/invitation/index.ts` (novo), `pages/index.ts`,
  `packages/email/index.ts`, `packages/shared/utils.ts` (12 códigos).
- docs: linhas B de §10.8.

## 10.11 Ordem de implementação e commits

Implementação: fase A inteira, gates verdes (`pnpm check`, `typecheck`, `pnpm test` com `test:emulator`); depois fase B.
Dentro de cada fase, SDK → API → app → i18n → docs. Proposta de commits (quem decide é o `/review`):

**Fase A**
1. `feat(sdk): scope entities by organization and add upload scope`
2. `feat(shared): add the organization log scope`
3. `feat(api): resolve an implicit organization per common profile` (repositórios, mapper, resolvedor, guard, sign-up,
   testes de unidade e de emulador)
4. `feat(api): scope entities and their photos by organization` (rotas, repositório, foto, `/files`, índices, testes)
5. `feat(api): keep organization records out of a member's erasure` (expurgo, exportação, 409 da exclusão, testes)
6. `feat(app): upload entity photos into the organization scope`
7. `feat(internationalization): translate the organization deletion refusal`
8. `docs: declare organization scoping in the architecture and conventions` (+ `docs(claude)` separado para `.claude/`)

**Fase B**
9. `feat(sdk): add organization members and invitations actions`
10. `feat(api): list and remove organization members`
11. `feat(api): invite members by email with single-use tokens` (convites, prévia, aceite, proxy, testes)
12. `feat(app): add the team page and the invitation acceptance page`
13. `feat(internationalization): add team and invitation copy`
14. `docs: document the organization members switch`
15. `docs(features): teams-organizations` (sempre o último)

## 10.12 `contends_on` real

A spec declara 10 caminhos (`:11`). Este plano toca 8 deles. Ficam de fora `app/(guards)/common-panel.ts`, porque o guard
novo compõe sobre ele sem alterá-lo, e `packages/auth/types.ts`, porque o papel dentro da organização fica no SDK e na
API e `UserRoleLevel` não muda. Fora da lista, os de convergência: `apps/api/proxy.ts`,
`apps/app/proxy.ts`, `apps/api/env.ts`, `apps/app/env.ts`, a folha de `apiErrors`, `firestore.rules`,
`packages/shared/utils/helpers/log.ts`, `apps/api/app/(routes)/files/route.ts`,
`apps/api/app/(routes)/account/deletion/route.ts`, `apps/app/shared/hooks/useFileUpload.ts`,
`apps/app/app/[locale]/(authenticated)/(common)/routes.tsx` e `paths.ts`.

---

# Perguntas em aberto

Cada uma já tem a opção adotada nesta rodada. Revertê-las custa pouco, salvo onde indicado.

1. **A spec segue `deferred`.** O ciclo a levou ao `/analyze` por instrução de foco ("tarefa maior"). Mover para
   `approved` e depois `in-progress` é decisão sua; o plano não depende disso, mas o `/spec --sync` vai encontrar feature
   em andamento com a spec `deferred`.

2. **Retrocarga de quem já existe.**
   Opções: (a) script de migração; (b) consulta dupla (`organizationId` ou, na falta, `userId`); (c) retrocarga
   preguiçosa no primeiro pedido.
   **Adotada: (c)** (§2.3). (a) exige alguém rodando na hora certa e foi descartada pela própria rodada. (b) não pagina:
   duas consultas não se juntam num cursor. (c) é idempotente, medida e não precisa de janela. O preço: o primeiro pedido
   de quem tem muitos registros é mais lento, e quem nunca volta fica com registros sem carimbo, invisíveis e expurgáveis.

3. **O que sai com quem exclui a conta.**
   Opções: (a) dono com membros bloqueado até remover os membros; (b) a organização morre e expulsa os membros; (c)
   promover um membro a dono.
   **Adotada: (a)**, com o membro levando só o que é pessoal e a organização de casa (§4.7). (b) destrói o trabalho de
   quem ficou. (c) é transferência de propriedade, fora do corte. O direito de exclusão continua garantido, em dois passos.

4. **O que a exportação entrega.**
   Opções: (a) os registros que o titular criou, em qualquer organização; (b) só os da organização de casa; (c) todos
   os da organização atual.
   **Adotada: (a)**, como a spec recomenda (`:233-235`), mais o `membership`. Não exige mudar a consulta, porque `userId`
   já é o autor. (c) entregaria dados de outros membros.

5. **Personificação.**
   Opções: (a) organização do personificado, criando-a se faltar; (b) organização do personificado, sem criar (lista
   vazia até o usuário voltar).
   **Adotada: (a)** (§4.3). É escrita de sistema, como as duas que o guard já faz sob personificação, e (b) mostraria ao
   suporte uma conta vazia que não está vazia.

6. **Posse dos objetos no bucket.**
   Opções: (P1) prefixo de quem enviou; (P2) foto de `entity` sob `uploads/org-<id>/`, avatar sob o prefixo pessoal.
   **Adotada: P2** (§4.5). Com P1, um membro não anexa a foto de outro, a troca deixa órfãos e o expurgo de um membro
   quebra fotos que ficaram com a organização. P2 não muda regex nem rules. As fotos antigas continuam no prefixo pessoal
   de quem as enviou e saem no expurgo dessa pessoa.

7. **De quem é o plano que conta no `POST /entities`.**
   Opções: (a) de quem cria; (b) do dono da organização.
   **Adotada: (a)**, zero mudança (§4.6). (b) é o certo para B2B que cobra por organização, mas custa uma leitura por
   pedido e antecipa `billing` por organização, fora do corte. Só importa com `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE`
   preenchida.

8. **Como o B2C não vê "organização".**
   Opções: (a) flag `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED`, desligada por padrão; (b) ligada por padrão; (c) campo na
   brand config.
   **Adotada: (a).** Menor raio: nenhum fork existente muda de tela. A brand config é só identidade visual
   (`packages/next-config/brand.ts`), e misturar recurso nela inventaria um segundo lugar de configuração.

9. **Convite para quem já está em outra organização.**
   Opções: (a) aceitar move a pessoa, a organização anterior fica dormente e volta quando ela sai; (b) recusar quem já
   tem registros; (c) mover os registros junto.
   **Adotada: (a)**, recusando só o dono com outros membros (§4.8). (b) bloquearia quase todo mundo. (c) levaria dado
   pessoal para dentro de uma organização sem pedido explícito.

10. **Convite sem e-mail configurado.**
    Opções: (a) 503 sem Resend e 201 com `delivery: "failed"` na recusa do provedor; (b) devolver o link ao dono para ele
    copiar.
    **Adotada: (a)**, como o link de acesso. (b) resolveria o fork sem Resend e o `/test` sem caixa de entrada, mas põe o
    token no navegador do dono e acrescenta uma tela. Todo fork em produção já precisa da Resend para verificar e-mail e
    redefinir senha.

11. **Quem convidou, no e-mail.** E-mail ou nome de exibição?
    **Adotada: e-mail.** O nome de exibição é texto livre de quem se cadastra e iria para o título de um e-mail mandado do
    domínio do fork para qualquer endereço.

12. **Exigir e-mail verificado de quem convida?**
    **Adotada: não.** O teto e o intervalo limitam o volume, e exigir verificação trava o dono recém-cadastrado. Ligar é
    uma checagem de `ctx.user.emailVerified` na rota de convite.

13. **Exigir e-mail verificado de quem aceita?**
    **Adotada: não**; basta o e-mail da conta igual ao do convite. O token chegou àquela caixa. A brecha: quem recebe o
    link encaminhado e cria conta não verificada com o endereço do convidado consegue entrar.

14. **Constantes.** Validade de 7 dias, 20 pendentes por organização, 60 s entre reenvios. **Adotadas** como constantes
    nomeadas; mudar é uma linha (e a cópia do e-mail, no caso dos 7 dias).

15. **Rótulo na B2B.** "Equipe" / "Team" / "Equipo" ou "Organização"?
    **Adotada: "Equipe"**, com o código e a URL em `organization`. O fork troca a cópia sem tocar em código.

16. **Painel admin.** **Adotada: nada muda.** Dono arquivado ou promovido a admin deixa a organização sem administração
    ativa. Uma tela de organizações no admin seria outra spec.

17. **Registrar entrada, saída e convite na trilha de auditoria?**
    **Adotada: não**, a spec põe isso em `audit-log` (`:172`). São três `recordAuditEvent` quando for a hora.

18. **Spec E2E para a fase B.**
    **Adotada: nenhuma nesta rodada.** Exige uma segunda pilha com a flag ligada no `stackEnv`. A fase A já é exercitada
    pelas specs existentes. Fica como achado no backlog.

19. **Índices antigos por `userId`.**
    Opções: manter no arquivo; remover.
    **Adotada: remover do arquivo**, com a remoção no projeto como passo manual **depois** do deploy (pré-requisito 2),
    para o rollback da fase A continuar possível.

20. **Quem vê a lista de membros.**
    Opções: qualquer membro; só o dono.
    **Adotada: qualquer membro**, como a maioria dos SaaS. Convites pendentes, só o dono.

21. **Status de token inválido e vencido.**
    Opções: 400 (como `AUTH_OOB_CODE_*`); 404 e 410.
    **Adotada: 400**, seguindo o precedente e sem acrescentar `GONE` ao `HTTP_STATUS` compartilhado. O front decide pelo
    código.
