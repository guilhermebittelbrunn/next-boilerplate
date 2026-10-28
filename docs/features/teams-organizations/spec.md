---
id: teams-organizations
title: Organizações, membros e convites
status: done
value: alto
effort: G
audience: produto
area: [apps/api, apps/app, packages/sdk, packages/auth, packages/internationalization]
mode: ambos
depends_on: [transactional-emails]
contends_on: ["apps/api/app/(routes)/entities/[id]/route.ts", "apps/api/app/(routes)/entities/route.ts", apps/api/(shared)/repositories/entity.repository.ts, apps/api/(shared)/lib/user-merge.ts, apps/api/(shared)/lib/account-erasure.ts, apps/api/(shared)/lib/account-export.ts, "apps/api/app/(guards)/common-panel.ts", packages/sdk/src/client/index.ts, packages/auth/types.ts, firestore.indexes.json]
feature: teams-organizations
updated: 2026-10-23
---

# Organizações, membros e convites

> **Entregue e arquivada em 2026-10-23 (auditoria pós-PR #57).** A PR #57 (`feat: organizations with members and
> email invitations`) entrou em `main` em 2026-10-23 às 19:19 UTC, no SHA `61a781e`, com as duas fatias juntas. A
> execução de merge do CI (`gh run 40010571950`) passou nos quatro jobs. Os cinco itens do corte foram conferidos no
> código de `61a781e`:
>
> | item do corte | veredito | o que o código mostra |
> |---------------|----------|------------------------|
> | 1. Organização implícita, invisível no fork B2C | ✅ | criada no cadastro (`user-merge.ts:92-93`, chamando `ensureOrganizationMembershipQuietly`) e no primeiro pedido a rota escopada (`organization-membership.ts:71-83`); página da equipe responde 404 com a variável vazia (`organization/page.tsx:14-16`) e o item do menu só aparece com ela (`(common)/routes.tsx:41`); declaração B2B/B2C em `docs/ARCHITECTURE.md:60-64` |
> | 2. `entity` escopado por organização, isolamento no servidor | ✅ | as três rotas de `entities` usam `requireOrganizationApi` e leem por `findInOrganization` (`entities/[id]/route.ts:25-39`, `:41-51`, `:109-119`; `entities/route.ts:19-29`, `:83-84`; `entities/summary/route.ts:6-10`); o filtro vive num helper só, `inOrganization` (`entity.repository.ts:40-44`), e o id vazio é recusado (`:51-60`). Provado sob o emulador em `organizationScope.emulator.test.ts` |
> | 3. Papéis dono e membro, por guard próprio | ✅ | `requireOrganizationApi` (`(guards)/organization.ts:44-78`), com recusa `403 ORGANIZATION_FORBIDDEN` para quem não é dono (`:63-68`); o guard de admin segue lendo só o `UserType` (`(guards)/admin.ts:30`) |
> | 4. Convidar, aceitar, listar, com expiração e e-mail já cadastrado | ✅ | `POST /organization/invitations` (`organization/invitations/route.ts:47-149`), validade de 7 dias (`organization-invitation.ts:14`, `:42-43`), recusa por expiração dentro da transação (`organization-invitation.repository.ts:94-96`), aceite só pela conta com o mesmo e-mail (`invitations/accept/route.ts:47-82`), lista em `organization/members/route.ts:6-17`. Quem já tem conta entra pelo login a partir de `/invite`, sem criar outra |
> | 5. Remover membro sem deixar a organização sem dono | ✅ com ressalva | o dono não é removido nem sai (`organization/members/[id]/route.ts:39-44`, `organization/leave/route.ts:11-16`) e não exclui a própria conta enquanto houver membros (`account/deletion/route.ts:43`). O admin ainda consegue arquivar um dono com membros (D3 do `review.md`), registrado como achado no `BACKLOG.md` |
>
> **Deriva, com a spec imprecisa:** membros e convites ficaram atrás de `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED`,
> desligada por padrão na `api` e na `app`; com ela vazia as rotas respondem `404 ORGANIZATION_MEMBERS_DISABLED` antes
> de autenticar (`organization-members.ts:21-28`). A spec pedia só que o fork B2C não visse a palavra "organização". A
> entrega também moveu as fotos de `entity` para `uploads/org-<id>/` e separou, na exportação e no expurgo, o que é da
> pessoa e o que é da organização, decisões do `/analyze` que a spec deixava em aberto. Detalhe em
> `analyze/plan.md` e `review/review.md`, nesta pasta.
>
> O bloco abaixo, do adiamento e da contagem de sítios de posse, é o estado anterior à entrega e fica como histórico.

> **`deferred` em 2026-08-22 — motivo.** A **implementação** fica adiada: esforço G, e nenhum fork atual
> pediu escopo por organização. O que **não** fica adiado é a decisão, porque ela encarece a cada recurso
> novo que nasce escopado por usuário. Duas contrapartidas de esforço P tornam o adiamento honesto, e
> valem como tarefa direta (não precisam desta spec):
>
> 1. escrever, em `docs/ARCHITECTURE.md`, se este core é **B2B ou B2C por padrão** — hoje a resposta está
>    implícita no código e ninguém a declarou;
> 2. concentrar o predicado de posse num ponto único de escopo.
>
> Sem essas duas, adiar é só acumular juros. Reabrir esta spec exige argumento novo — tipicamente o
> primeiro fork B2B real.
>
> **Reconferido em 2026-10-22, pós-PR #56 (`9c793c6`), para alimentar o `/analyze`.** As duas contrapartidas seguem
> sem código. (1) `git grep -i` por `B2B`, `B2C`, `tenant` e `organiza` em `docs/ARCHITECTURE.md` devolve 0; o
> documento não muda desde a PR #41 (`0a49a3b`). (2) O predicado de posse por usuário está em **16 sítios de 6
> arquivos, em 3 recursos** (tabela abaixo, recontada linha a linha), o mesmo piso medido em 2026-09-23: nenhum sítio
> novo nesses recursos desde então, e nenhum consolidado. A PR #52 criou um quarto recurso escopado por pessoa, a
> notificação, com o mesmo predicado em mais 5 pontos, contados à parte porque a notificação pertence a quem a
> recebe e continuaria assim com organizações.
>
> | arquivo | sítios | o que expressa |
> |---------|--------|----------------|
> | `apps/api/app/(routes)/entities/[id]/route.ts` | `:24`, `:40`, `:102` | posse do **registro** (`row.userId !== ctx.subjectProfile.id` → 404, e `existing.userId !==` no `PUT` e no `DELETE`) |
> | `apps/api/app/(routes)/entities/[id]/route.ts` | `:67`, `:86` | posse do **objeto no bucket** (`isUsablePhotoReference`, `isOwnStorageObject` com `ctx.subjectProfile.id`) |
> | `apps/api/app/(routes)/entities/route.ts` | `:28`, `:73`, `:81` | chave de escopo da listagem, posse do objeto, gravação do dono (`userId: ctx.subjectProfile.id`) |
> | `apps/api/app/(routes)/entities/summary/route.ts` | `:9` | chave de escopo do resumo da home |
> | `apps/api/(shared)/repositories/entity.repository.ts` | `:23`, `:40`, `:64`, `:72` | `where("userId", "==", userId)` em `listByUserId`, `findAllByUserId`, `purgeAllByUserId` e `summaryByUserId`, quatro cópias sem helper |
> | `apps/api/app/(routes)/account/route.ts` | `:49`, `:162` | posse do avatar no bucket (`ownerId = ctx.subjectProfile.id`, `:127`) |
> | `apps/api/app/(routes)/files/route.ts` | `:27` | caminho do objeto derivado do dono (`buildObjectPath(ctx.subjectProfile.id, …)`) |
>
> Os helpers por trás das linhas de bucket: `buildObjectPath` (`apps/api/(shared)/lib/storage.ts:46`), `isOwnedBy`
> (`:59`), `isOwnStorageObject` e `isUsablePhotoReference` (`apps/api/(shared)/lib/entity-photo.ts:24-25`, `:32-35`).
> Quem passa o dono para fora do request: a exportação (`account-export.ts:136`) e o expurgo (`account-erasure.ts:121`)
> do titular. A convenção está escrita como padrão para rota nova em `apps/api/CLAUDE.md:31`, o que explica a cópia.
>
> **Contados à parte (pertencem à pessoa):** `notifications/[id]/read/route.ts:25` (o mesmo `row.userId !==`),
> `notifications/route.ts:16`, `read-all/route.ts:9` e `unread-count/route.ts:9` (chave de escopo), e
> `notification.repository.ts:38`. Este último é o contraexemplo útil: o repositório de notificações concentra o
> filtro num helper privado (`byOwner`, `:37-39`), e o de `entity` repete o `where` quatro vezes. A coleção `session`
> filtra por `where("uid", "==", uid)` em `session.repository.ts:69`, `:89` e `:211`, também fora da contagem. Também
> fora: os `actorUserId`/`targetUserId` da trilha de auditoria, que identificam quem fez, não escopo.
>
> *(Série histórica: 3 sítios em 1 recurso até a PR #10, 4 com a PR #11, 11 em 3 recursos com a PR #12, 14 com a PR
> #19 e 16 com a PR #23. As contagens intermediárias e as correções de omissão estão na versão deste arquivo em
> `9c793c6`.)*

## Problema

Este boilerplate só sabe pensar em **uma pessoa por vez**. Não existe conceito de organização, workspace,
membro ou convite: cada usuário vê apenas o que ele mesmo criou, e não há como duas pessoas
compartilharem um registro. Qualquer fork B2B — que é a maioria dos SaaS pagos — bate nessa parede na
primeira conversa com o cliente.

O ponto desta spec não é a funcionalidade: **é uma decisão de arquitetura de produto, não uma feature de
backlog**. Toda consulta, toda regra de posse e todo documento gravado hoje assumem que o dono é um
usuário. Introduzir organização depois não é acrescentar uma tela, é reescrever a chave de escopo de todo
recurso que existir até lá. Adiar a *implementação* é legítimo; adiar a *decisão* é o que sai caro.

## O que já existe no repo

Conferido em `main` (`9c793c6`) em 2026-10-22.

- **Zero ocorrências** de `organizationId`, `tenant` ou `membership` em `apps/` e `packages/` (`git grep -i`), e
  nenhuma de `workspace` ou `invite` no sentido de domínio (a palavra `workspace` aparece só em `package.json` e em
  cinco arquivos de teste). A palavra "organization" aparece em `packages/seo/schema.ts`, no identificador
  `organizationSchema` (`:6`) e no tipo schema.org `Organization` (`:1`, `:5`, `:11`, `:14`), e no único consumidor,
  o JSON-LD da home da web (`apps/web/app/[locale]/(home)/page.tsx:4`, `:32`). É marcação da landing, nada a ver.
- `packages/sdk/src/types/user/user.ts:5` — `UserType` tem exatamente dois valores: `ADMIN` e `COMMON` (`:6-7`).
  O papel é **global**, não relativo a um grupo. A assinatura também mora no perfil da pessoa
  (`stripeCustomerId` em `:64`, `subscription` em `:66`), então cobrança por organização, fora deste corte,
  pressupõe migrar esse vínculo.
- `packages/auth/types.ts:4` — `UserRoleLevel` espelha o mesmo par, e `canSwitchPanelEnvironment`
  (`:27`) trata `ADMIN` como papel de plataforma.
- `apps/api/app/(guards)/` — três arquivos: `admin.ts` (`requireAdminApi`, `:30`), `common-panel.ts`
  (`requireCommonPanelApi`, `:32`) e, desde a PR #38, `plan.ts` (`requirePlanApi`, `:21`, composto sobre o do painel
  comum). Nenhum resolve "pertence a este grupo". Os dois primeiros registram o último acesso
  (`admin.ts:73`, `common-panel.ts:87`).
- **A posse é por usuário, repetida em cada handler e no repositório**: os 16 sítios da tabela do topo. O caso mais
  visível é `apps/api/app/(routes)/entities/[id]/route.ts:24`, `:40` e `:102`, o mesmo teste três vezes num único
  arquivo de um único recurso. Uma armadilha de conferência que já enganou três rodadas: a posse do objeto nesse
  arquivo está em `:67` e `:86`, não na linha em que o `if` abre.
- **O perfil nasce num ponto só.** `createDefaultUserProfile` (`apps/api/(shared)/lib/user-merge.ts:77`) cria o
  perfil comum no cadastro (`auth/sign-up/route.ts:55`) e no primeiro contato de quem entra pelo Google
  (`user-merge.ts:70`); a criação pelo admin grava direto (`users/route.ts:74`). É onde a organização implícita
  nasceria.
- **A exportação e o expurgo do titular** leem e apagam os registros pelo dono (`account-export.ts:136`,
  `account-erasure.ts:121`). Com organização, o expurgo de um membro não pode apagar registro que pertence ao grupo:
  é decisão de produto que o corte precisa tomar (ver "Riscos").
- `firestore.rules:32-34` — negação total de acesso direto de cliente (`match /{document=**}` em `:32`,
  `allow read, write: if false;` em `:33`); o comentário em `:39-43` registra que `entity.userId` guarda o **id do
  documento de perfil**, não o UID do Firebase Auth. `storage.rules:27-28` também nega tudo e não menciona dono: a
  posse por prefixo do caminho existe só no código da API, numa camada só.
- `packages/email/templates/action-link.tsx:13` — o template de link de ação é escolhido por `ActionSlug`, chave do
  dicionário. Convite não é template novo, é slug de dicionário nos três idiomas. A dependência
  `transactional-emails` está satisfeita desde a PR #9.
- `docs/ARCHITECTURE.md` não declara B2B nem B2C (ver o topo).
- **Lacuna:** não existe grupo, não existe papel dentro de grupo, não existe convite, e o escopo por usuário está
  espalhado em 16 sítios.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](../../../specs/research/saas-starter-feature-benchmark.md)
- Prevalência: **6 de 10** starters entregam times/organizações; **5 de 10** entregam convites + RBAC.
  Valor **alto (B2B)**, esforço **G** nos dois casos.
- A nota é categórica: organizações são "o eixo que separa B2B de B2C e a decisão **mais cara de
  postergar**: retrofitar `organizationId` em todas as queries e regras é **reescrita, não refactor**".
- Armadilha nomeada: **isolamento só no cliente**, sem regra/guard espelhado no servidor.
- Armadilhas de convite/RBAC nomeadas: convite para e-mail já cadastrado, expiração de token, e deixar o
  **último owner sair** da organização.
- Custo herdado, segundo a nota: "alto e permanente — muda o modelo de dados de **todo** recurso,
  **inclusive nos forks B2C que não usam times**".

## Proposta — corte de MVP

Corte deliberadamente mínimo: o objetivo é **fixar a chave de escopo** e provar o isolamento
ponta a ponta, não entregar administração de times completa.

- [x] Todo usuário passa a pertencer a uma organização — criada automaticamente no cadastro, de modo que
      o fork B2C nunca precise ver a palavra "organização" na interface.
- [x] O escopo dos recursos deixa de ser o usuário e passa a ser a organização: no slice `entity`, a
      listagem e a checagem de posse (`entities/[id]/route.ts:24`) passam a decidir por grupo, com o
      isolamento verificado **no servidor**.
- [x] Dois papéis dentro da organização (dono e membro), independentes do `UserType` global, resolvidos
      por um guard próprio — o `admin`/`common` atual continua sendo papel de **plataforma**.
- [x] Convidar por e-mail, aceitar e listar membros, com convite **expirável** e tratamento de convite
      para e-mail já cadastrado.
- [x] Remover membro, com a garantia de que a organização nunca fica sem dono.

### Fatiamento recomendado para uma rodada autônoma (2026-10-22)

O corte inteiro é G e cruza API, SDK, app, i18n e o modelo de dados. Numa rodada do `/cycle` ele tende a voltar com
partes 🔒 ou com um diff grande demais para revisar de uma vez. A recomendação é o `/analyze` entregar em duas
fatias, com a spec indo a `in-progress` depois da primeira, como `account-security-mfa` fez:

- **Fatia 1 — a chave de escopo.** Itens 1, 2 e 3: organização implícita criada com o perfil (inclusive para quem já
  existe, no primeiro contato), o `entity` escopado por organização num ponto único de escopo, o guard de
  pertencimento com os papéis dono e membro, e a declaração B2B/B2C em `docs/ARCHITECTURE.md`. Tudo prova sob os
  emuladores de Firestore e Auth: dois usuários de organizações diferentes recebem 404 no registro um do outro
  chamando a API direto. Sem tela nova para o fork B2C.
- **Fatia 2 — membros e convites.** Itens 4 e 5: convite expirável por e-mail, aceite, lista de membros e remoção sem
  deixar a organização sem dono. A entrega real do e-mail fica 🔒 sem a Resend (pendência 13 do `BACKLOG.md`); o
  aceite prova sob o emulador se o `/test` conseguir ler o convite sem a caixa de entrada, como já faz com os links de
  ação.

Isto é corte de produto, não desenho: modelo de dados, nome de coleção e forma do guard ficam com o `/analyze`.

### Fora do corte

- Trocador de organização na interface e usuário em várias organizações ao mesmo tempo — só depois que
  o escopo único estiver sólido.
- RBAC com permissões granulares por recurso; dois papéis bastam para provar o modelo.
- Cobrança por organização/assento — depende de `billing-subscription` e muda o modelo de assinatura.
- Transferência de propriedade, domínios verificados, SSO e SCIM — a nota registra SSO enterprise/SCIM
  em **0/10**, território de contrato enterprise.
- Registro de quem fez o quê dentro da organização — pertence a `audit-log`.
- Escopar por organização os recursos da pessoa: notificações, sessões, avatar e preferências continuam da pessoa.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Recurso novo (organização, membros, convites) **e** mudança de contrato em todo recurso escopado. |
| `apps/api` | Guard de pertencimento novo; coleções novas; **toda consulta e toda checagem de posse existente muda de chave**. Convite exige envio de e-mail. |
| `apps/app` | Telas de membros e convites; aceite de convite (rota parcialmente pública); o painel admin ganha a dimensão "organização". |
| `apps/web` | Página de aceite de convite para quem ainda não tem conta, se o aceite não viver no `app`. |
| `packages/*` | `auth`: papel por organização convive com `UserRoleLevel` global. `email`: convite é **slug de dicionário × 3 idiomas** no template de link de ação. i18n nos 3 idiomas. |
| Infra/env | Índices compostos no Firestore (escopo + filtro) para toda consulta escopada; `firestore.rules` reescritas se algum dia expuser cliente direto. Nenhum serviço pago novo além do envio de e-mail. |

## Riscos e trade-offs

- **Custo permanente no modelo de dados de TODO recurso, inclusive em forks B2C.** Isto não é um risco
  contornável, é o preço da decisão: depois de adotada, cada recurso novo carrega a chave de escopo,
  cada consulta ganha um filtro, cada índice ganha um campo. Um fork B2C paga a complexidade sem usar a
  funcionalidade. O único jeito de baratear é a organização implícita (criada sozinha, invisível na UI),
  que esconde o custo do usuário final — não do desenvolvedor.
- **O risco simétrico é maior.** Não adotar significa que o primeiro fork B2B reescreve o escopo de todo
  recurso já construído, mais os índices, mais as regras — em código que já está em produção. A série histórica do
  topo mostra o predicado indo de 3 sítios em 1 recurso para 16 em 3, sem que ninguém decidisse nada a respeito.
- **Vazamento entre organizações é a falha crítica.** Uma consulta sem o filtro de escopo entrega dado de
  outro cliente, e com a autorização espalhada por handler basta um handler novo esquecer. Isso empurra
  para um ponto único de escopo no acesso a dados — decisão que precisa ser tomada junto, não depois.
- **Exclusão de conta e direitos do titular.** Hoje o expurgo apaga os registros da pessoa
  (`account-erasure.ts:121`) e a exportação os entrega (`account-export.ts:136`). Com organização, os registros
  passam a ser do grupo: o corte precisa dizer o que sai com o membro que exclui a conta e o que fica com a
  organização, e o `docs/ROPA.md` acompanha.
- **Migração de forks existentes.** Qualquer fork já rodando precisa de retrocarga: criar a organização
  de cada usuário e reescrever o dono de cada documento. Sem plano, é indisponibilidade.
- **Dois eixos de papel confundem.** `UserType` global (plataforma) e papel dentro da organização são
  coisas diferentes; misturá-los produz escalada de privilégio silenciosa. A distinção tem de estar no
  guard, não na convenção. A personificação do admin (`subjectProfile` no guard do painel comum) precisa resolver a
  organização do personificado, não a do admin.

## Sinais de pronto

- Dois usuários de organizações diferentes não enxergam os registros um do outro, **nem chamando a API
  diretamente** com id conhecido — a resposta é 404, não 403 disfarçado de lista vazia.
- Um usuário comum de um fork B2C usa o produto inteiro sem ver a palavra "organização".
- Um convite chega por e-mail, expira, e um convite para e-mail já cadastrado não cria conta duplicada.
- A organização nunca fica sem dono, mesmo com o dono tentando sair.
- O papel dentro da organização não concede nada no painel admin de plataforma, e vice-versa.

## Perguntas em aberto

- **Esta spec entra na fila agora (`approved`) ou fica `deferred` com motivo?** — **recomendação original
  (2026-08-22):** `deferred` para a implementação, com a decisão de modelo tomada agora e as duas contrapartidas P
  feitas. **Atualização de 2026-10-22:** as specs que a recomendação punha antes (`account-settings`,
  `billing-subscription` e o resto do backlog de produto) foram entregues, e a fila não tem mais nenhuma spec
  `proposed` nem `approved`. O motivo escrito do adiamento perdeu a base; a decisão de status segue sua (E2 no
  `BACKLOG.md`).
- Organização implícita (uma por usuário, invisível) ou explícita desde o início? — **recomendação:**
  implícita; é o que permite ao fork B2C ignorar o recurso e ao B2B ligá-lo sem migrar dados.
- Um usuário pode pertencer a várias organizações no primeiro corte? — **recomendação:** não. Múltiplo
  pertencimento traz trocador de contexto, escopo de sessão e cache por organização — é outra spec.
- O aceite de convite vive no `app` ou no `web`? — **recomendação:** no `app`, com a rota de aceite como
  caminho público autorizado pelo token do convite, para não duplicar sessão em dois domínios.
- O que sai com o membro que exclui a conta? — **recomendação:** os dados pessoais saem; os registros da organização
  ficam com ela, e a exportação do titular passa a listar só o que ele criou. A decidir no `/analyze` com o
  `docs/ROPA.md` aberto.
