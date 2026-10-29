---
id: organization-ownership-transfer
title: Transferir a propriedade da organização, com a saída do dono e a trilha da equipe
status: done
value: alto
effort: M
audience: produto
area: [apps/api, apps/app, apps/e2e, packages/sdk, packages/internationalization]
mode: ambos
depends_on: [teams-organizations]
contends_on: ["apps/api/(shared)/repositories/organization-member.repository.ts", "apps/api/(shared)/repositories/organization-invitation.repository.ts", packages/sdk/src/types/audit/audit.ts, apps/e2e/support/stackEnv.ts]
feature: organization-ownership-transfer
updated: 2026-10-28
---

# Transferir a propriedade da organização, com a saída do dono e a trilha da equipe

> **Origem (2026-10-27, `/spec --sync` pós-PR #58, passo 1 de um `/cycle`).** Escrita a pedido de foco do usuário
> ("uma tarefa maior e que agregue valor"), como aconteceu com `teams-organizations`, que entrou no ciclo `deferred` por
> instrução de foco e foi entregue pela PR #57. Esta spec nasce `proposed`; levá-la ao ciclo sem passar por `approved`
> repete a E4 do `BACKLOG.md`. Ela junta, como fatia do mesmo assunto, três achados abertos do subsistema de organização
> e uma lacuna de teste da PR #57 (ver "O que já existe no repo").

> **Entrega (2026-10-28, `/spec --sync` pós-PR #59).** Entrou em `main` pela PR #59 (`277da43`, 2026-10-28 17:07 UTC),
> com os quatro jobs da execução de merge verdes (`gh run 40732626433`). A spec saiu `proposed` direto para `done`, sem
> passar por `approved` (E4 do `BACKLOG.md`). Os cinco itens do corte foram conferidos no código de `main`:
>
> 1. `POST /organization/members/[id]/ownership` (`organization/members/[id]/ownership/route.ts:43-91`), com a troca
>    numa transação de quatro leituras antes das três escritas (`organization-member.repository.ts:168-225`); recusas
>    `403 ORGANIZATION_FORBIDDEN`, `404 ORGANIZATION_MEMBER_NOT_FOUND`, `400 ORGANIZATION_OWNERSHIP_TARGET_SELF` e
>    `409 ORGANIZATION_OWNERSHIP_TARGET_ARCHIVED`; item "Tornar dono" na tabela da equipe
>    (`OrganizationMembersTable.tsx:112-119`, `TransferOwnershipDialog.tsx`); a corrida de duas transferências tem
>    teste contra o emulador (`organizationOwnershipTransfer.emulator.test.ts:181`).
> 2. O antigo dono vira membro e sai (`organization/leave/route.ts:20-30`), é removido (`members/[id]/route.ts:50-63`),
>    exclui a conta e aceita outro convite; a regra "dono com membros" lê todas as organizações de que a pessoa é dona
>    (`organization-membership.ts:108-132`, `organization.repository.ts:24`). As quatro recusas que continuam valendo
>    citam a transferência nos três idiomas (`translations/packages/shared/utils.ts:37`, `:79`, `:164`, `:179` em pt-br).
> 3. A prévia e o aceite recusam organização de dono arquivado (`organization-invitation.ts:99-115`,
>    `organization-invitation.repository.ts:231-252`), e o aceite conta só membro com perfil vivo (`:260-292`).
> 4. Cinco ações novas no `AuditAction` (`packages/sdk/src/types/audit/audit.ts:16-20`), gravadas pelas rotas de
>    transferência, convite (`organization/invitations/route.ts:142`), aceite (`invitations/accept/route.ts:71`),
>    remoção e saída; rótulos nos três idiomas (`translations/apps/app/pages/admin/auditTrail.ts:28-34`).
> 5. `apps/e2e/tests/organizationOwnership.spec.ts:68`, com a variável ligada na pilha da suíte (`stackEnv.ts:37`),
>    passou no job `e2e` da execução de merge (23 de 23).
>
> **Onde a spec estava errada ou incompleta** (desvios D1 a D3 do `analyze/plan.md`, §1.1): a suíte E2E não lia link de
> convite com o emulador, porque o convite não passa pelo Firebase Auth; o teste grava o convite com token conhecido
> direto no emulador. A transferência deixa o dono novo com duas organizações, caso que a spec não tratava; a regra de
> saída e o expurgo da conta passaram a ler a lista. O evento de convite enviado não grava o e-mail do convidado, porque
> o expurgo limpa rótulos por id de perfil e o convidado sem perfil nunca teria o endereço apagado. Fora da área
> declarada, a entrega corrigiu no `ActionsMenu` do design system o item que abria e fechava o diálogo no mesmo Enter.

## Problema

O dono de uma organização com membros não tem saída. Ele não sai da equipe, não é removido, não exclui a própria conta,
não aceita convite de outra equipe e não pode ser arquivado pelo admin. Hoje a única porta é remover um por um todos os
membros: três das quatro mensagens de erro mandam ele fazer isso, e a quarta diz só que o dono não pode sair. Para uma equipe de verdade isso significa desmontá-la
para trocar quem a administra: quem fundou a conta sai da empresa, e a equipe inteira perde o acesso aos registros
compartilhados.

O próprio código registra a causa: os bloqueios existem "porque não há transferência de propriedade". Enquanto ela não
existir, cada guarda nova do subsistema (PR #58) fecha uma porta a mais sem abrir nenhuma.

## O que já existe no repo

- `apps/api/(shared)/lib/organization-membership.ts:102-127` — `ownsOrganizationWithMembers`, com o comentário "There
  is no transfer of ownership, so an owner who still has members would leave them in an organization nobody can
  manage". Consumidores: `account/deletion/route.ts:43` (`409 ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS`) e
  `users/[id]/route.ts:191-196` (`409 USERS_DELETE_ORGANIZATION_HAS_MEMBERS`, desde a PR #58).
- `apps/api/app/(routes)/organization/leave/route.ts:11-16` e `organization/members/[id]/route.ts:37-44` — o dono
  recebe `409 ORGANIZATION_OWNER_CANNOT_LEAVE` ao sair e ao ser removido; o comentário da remoção diz que "ownership
  cannot be handed over".
- `apps/api/(shared)/repositories/organization-invitation.repository.ts:252-277` — no aceite de convite de outra
  equipe, o dono com membros recebe `owner-has-members`, pelo mesmo motivo escrito em `:252`.
- `packages/internationalization/translations/packages/shared/utils.ts:37`, `:79`, `:161` e `:176` (pt-br; os mesmos
  códigos em en e es) — as quatro mensagens dizem ao dono para remover os membros ou que ele "não pode sair nem ser
  removido".
- `packages/sdk/src/types/organization/organization.ts:5` — dois papéis, `owner` e `member`.
  `packages/sdk/src/types/organization/members.ts:4-9` — `OrganizationDTO` com `ownerUserId`, que a organização guarda
  (`apps/api/(shared)/repositories/organization.repository.ts:11`, `:24-35`).
- `apps/app/app/[locale]/(authenticated)/(common)/(pages)/organization/(components)/OrganizationMembersTable.tsx:63`,
  `:80` — a tabela da equipe mostra o papel e oferece só "remover", e nunca para o dono.
- `apps/api/(shared)/lib/organization-invitation.ts:98-110` e `organization-invitation.repository.ts:229-249` — uma
  organização é tratada como ativa enquanto o vínculo do dono aponta para ela. O perfil arquivado do dono não entra na
  conta, então convites de um dono arquivado continuam aceitáveis (achado 🟢 aberto no `BACKLOG.md`).
- `organization-invitation.repository.ts:269-276` — o aceite conta qualquer outro vínculo como membro, inclusive o de
  perfil arquivado; a regra da saída do dono, desde a PR #58, conta só perfil vivo (achado 🟢 aberto).
- `packages/sdk/src/types/audit/audit.ts:2-16` — o enum `AuditAction` não tem nenhuma ação de organização. Onze
  arquivos de rota chamam `recordAuditEvent`; nenhum em `organization/**` ou `invitations/**` (achado 🟢 aberto).
- `apps/e2e/tests/` — sete arquivos, nenhum com membros ou convites, e `apps/e2e/support/stackEnv.ts` não liga
  `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED` (lacuna 🟡 herdada da PR #57).
- `docs/PRE-PRODUCTION.md:945-947` — "ele precisa remover os membros primeiro, porque não há transferência de
  propriedade".
- **Lacuna:** não existe forma de o dono passar a organização a outra pessoa.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](../../../specs/research/saas-starter-feature-benchmark.md), adendo de
  2026-10-27, "Administração da organização depois do convite". A nota original (2026-08-21) já lista "deixar o último
  owner sair da organização" entre as armadilhas de convites e RBAC.
- Prevalência: a transferência explícita da propriedade aparece em **1 de 6** referências lidas (Makerkit, nos dois
  kits; no kit Drizzle ela é exigida antes de o dono sair). Alguma saída para o dono que não seja remover todos aparece
  em **4 de 6** (Makerkit pela transferência, Better Auth por um papel `admin`, Clerk por vários admins, o starter da
  Vercel por vários donos); em Supastarter não foi confirmada. O starter da Vercel grava convite e remoção de membro
  num registro de atividade.
- Leitura honesta: o número de transferência explícita é baixo, e o `value` alto não vem dele. Vem de este repositório
  ter escolhido um dono único (dois papéis, `teams-organizations`) e, com isso, ter fechado todas as outras saídas.
  Entre as alternativas que o mercado usa, a transferência é a que cabe no modelo de dois papéis sem abrir RBAC.
- Fontes (lidas em 2026-10-27): <https://makerkit.dev/docs/next-supabase-turbo/installation/functional-walkthrough> ·
  <https://makerkit.dev/docs/nextjs-drizzle/members-management/viewing-members> ·
  <https://www.better-auth.com/docs/plugins/organization> · <https://clerk.com/docs/organizations/roles-permissions> ·
  <https://raw.githubusercontent.com/nextjs/saas-starter/main/app/(login)/actions.ts>

## Proposta — corte de MVP

- [x] **Transferir a propriedade.** Na tabela da equipe, o dono escolhe um membro com perfil vivo e, depois de
      confirmar, passa a ele a organização. Numa operação só, o membro vira dono e o antigo dono vira membro; quem lê a
      organização logo depois vê o dono novo. A API recusa com `error.code` traduzido quando quem pede não é o dono,
      quando o alvo não é membro da organização, quando o alvo é o próprio dono e quando o perfil do alvo está
      arquivado. Dois pedidos simultâneos não deixam a organização com dois donos nem sem nenhum.
- [x] **O dono antigo ganha as saídas que hoje não tem.** Depois da transferência ele sai pela saída que já existe, é
      removido pelo dono novo, exclui a conta e aceita convite de outra equipe, sem nenhuma recusa nova. O dono novo
      convida, revoga e remove como qualquer dono. As mensagens das quatro recusas que continuam valendo (dono com
      membros) passam a indicar a transferência como saída, nos três idiomas.
- [x] **Organização sem dono ativo deixa de receber gente.** A prévia e o aceite recusam convite de organização cujo
      dono teve o perfil arquivado, e o aceite conta como membro só o vínculo de perfil vivo, com a mesma regra da saída
      do dono. Fecha os dois 🟢 do convite deixados pela tarefa `organization-archived-member`.
- [x] **A equipe aparece na trilha de auditoria.** Transferência, convite enviado, convite aceito, membro removido e
      saída voluntária gravam evento na trilha que o admin já filtra por usuário, com rótulo nos três idiomas e sem
      gravar e-mail fora do campo de rótulo que a trilha já usa.
- [x] **O fluxo da equipe ganha rede no CI.** A suíte E2E percorre, com membros ligados, convite, aceite pela conta
      convidada (lendo o link sem caixa de entrada, como a suíte já faz com o emulador) e transferência, e roda no job
      `e2e` de toda PR. Fecha a lacuna 🟡 da PR #57.

### Fora do corte

- **Terceiro papel (`admin` da organização) e troca de papel em geral.** É o caminho do Better Auth e do Clerk, mas
  abre RBAC, o que `teams-organizations` deixou fora de propósito. Volta como spec própria se um fork pedir delegação
  sem trocar o dono.
- **Transferência com aceite do destinatário** (convite de propriedade que a outra pessoa confirma). Nenhuma referência
  lida descreve esse passo; a confirmação fica com quem transfere.
- **Transferência pelo admin da plataforma**, para resolver uma equipe cujo dono sumiu. O admin hoje bloqueia ou
  arquiva; dar a ele a troca de dono é decisão de suporte de cada fork. Fica registrada como pergunta.
- **Nome da organização e renomear.** A organização não tem nome hoje (`OrganizationDTO`, `members.ts:4-9`); criar o
  campo muda o e-mail de convite e a tela da equipe, e não resolve a saída do dono.
- **Aviso ao dono novo por e-mail ou no sino.** A central de notificações aceitaria um tipo novo, mas a transferência
  aparece na tabela e na trilha; o aviso é melhoria barata para depois.
- **Promoção a admin da plataforma de um dono com membros** (achado 🟢 aberto). Continua decisão do usuário; com a
  transferência, a saída para esse dono passa a existir.
- **Várias organizações por pessoa e trocador de organização.** Seguem fora, como em `teams-organizations`.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Ação de transferir na fachada de organização; ações de organização no `AuditAction`. |
| `apps/api` | Rota de transferência atrás do guard de organização com papel de dono, numa transação do Firestore; regra de organização ativa e de membro vivo no aceite e na prévia; gravação na trilha nas rotas de organização e convite. Nenhuma coleção nova. |
| `apps/app` | Ação de transferir na tabela da equipe, com confirmação e o estado novo depois; rótulos das ações de organização na trilha do admin. |
| `apps/web` | N/A. |
| `apps/e2e` | Um fluxo novo com membros ligados, e o ambiente da pilha da suíte (`stackEnv.ts`) com a variável. |
| `packages/*` | i18n: copy da transferência, `apiErrors` novos e reescrita das quatro recusas, rótulos da trilha, nos três idiomas. |
| Infra/env | Nenhuma variável nova. Atrás de `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED`, como o resto de membros e convites. Índice novo só se o `/analyze` precisar; a leitura por organização já tem os da PR #57. |

## Riscos e trade-offs

- **Concorrência.** Transferência e remoção, ou duas transferências, ao mesmo tempo podem deixar dois donos ou nenhum.
  A garantia é a transação do Firestore sobre os dois vínculos e o documento da organização, e a prova é um teste
  contra o emulador. É o mesmo cuidado que o aceite de convite já tem.
- **A trilha muda de natureza.** Até aqui ela registra ação de admin e de titular sobre a própria conta. Ações de
  equipe trazem um ator agindo sobre outra pessoa comum; o filtro por usuário precisa encontrar os dois. O `ROPA.md` e
  a exportação de dados do titular podem precisar de uma linha.
- **Documentos que dizem "não há transferência".** `docs/PRE-PRODUCTION.md` §16 e `:945-947`, `docs/ROPA.md` §11 e
  `docs/SECURITY.md` descrevem a recusa como definitiva. A entrega precisa corrigi-los.
- **E2E com a variável ligada.** Ligar membros na pilha inteira da suíte muda o menu do painel comum em todos os fluxos
  existentes (o item da equipe aparece). O `/analyze` escolhe entre ligar na pilha toda ou subir uma segunda; a segunda
  dobra o tempo do job.
- **Esforço.** M no limite de G, pela soma de transação, trilha, aceite e E2E. Se o `/analyze` medir G, a ordem de
  corte é a do corte: a transferência e as saídas primeiro, o E2E por último.
- **Fork B2C.** Com a variável vazia nada aparece e as rotas novas respondem `404 ORGANIZATION_MEMBERS_DISABLED`, como
  as outras de membros.

## Sinais de pronto

- Sob o emulador, com membros ligados, o dono de uma equipe com um membro transfere a propriedade a ele, sai da equipe
  e exclui a própria conta, sem nenhum `409`.
- O antigo membro, agora dono, convida e remove pessoas; o antigo dono, se ficou, aparece como membro.
- A transferência para quem não é membro, para perfil arquivado ou pedida por quem não é dono responde com código
  traduzido nos três idiomas.
- Duas transferências simultâneas terminam com exatamente um dono (teste contra o emulador).
- Convite de uma equipe cujo dono foi arquivado é recusado na prévia e no aceite.
- A trilha do admin, filtrada pelo antigo dono, mostra a transferência e a saída.
- O job `e2e` do CI percorre convite, aceite e transferência.
- Com a variável vazia, a tela da equipe continua respondendo 404 e nada muda para o fork B2C.

## Perguntas em aberto

- O admin da plataforma também pode transferir a propriedade de uma equipe, pelo painel de usuários? —
  **recomendação:** não neste corte; o caso existe (dono que sumiu), mas é decisão de suporte de cada fork e cabe numa
  iteração própria.
- Depois de transferir, o antigo dono fica como membro ou sai junto? — **recomendação:** fica como membro, e sai pela
  saída que já existe se quiser; é o que deixa a operação reversível pelo dono novo.
- A transferência pede a senha de novo, como a exclusão de conta? — **recomendação:** não; confirmação na tela basta,
  porque a ação não apaga dado e o dono novo pode devolvê-la. Reavaliar se um fork tratar a propriedade como ativo de
  cobrança (assinatura por organização, fora do core hoje).
