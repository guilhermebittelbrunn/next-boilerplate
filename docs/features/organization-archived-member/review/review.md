# Revisão: o membro arquivado deixa de contar na organização

Escopo revisado: `apps/api/(shared)/lib/organization-membership.ts` e `apps/api/__tests__/organizationMembership.test.ts`,
lidos contra os dois consumidores do helper. O resto do working tree pertence à auditoria do backlog e à tarefa
`organization-guardrails`; entra aqui só para montar o plano de commits, que cobre os três assuntos.

## Branch

- Atual: `guilhermebittelbrunn/cycle-command-v8`. O regex do padrão a recusa (`BRANCH INVALIDA`). Está em `61a781e`,
  igual a `origin/main`, sem commit próprio e sem upstream.
- Decisão: esta tarefa vai na mesma branch e na mesma PR de `organization-guardrails`, `api/fix/organization-guardrails`
  (regex: `branch OK`), criada a partir da atual. Não criei nem renomeei branch: a rodada é do `/cycle`.
- Por que a mesma branch:
  - `organization-guardrails` cria o segundo consumidor do helper (`DELETE /users/:id`), e esta tarefa muda a regra
    que ele aplica. Revisadas juntas, as duas mostram o comportamento final do arquivamento pelo admin.
  - `docs/SECURITY.md:40` é uma linha nova de `organization-guardrails` e agora cita o helper alterado aqui
    (`organization-membership.ts:102-127`). Numa branch separada a partir de `main`, essa âncora só ficaria certa
    depois do merge da outra PR.
  - O usuário revisa uma PR em vez de duas. O código desta tarefa são dois arquivos.
- Opção descartada: `api/fix/organization-archived-member` (regex: `branch OK`) a partir de `origin/main`. Funcionaria
  sem conflito, porque `HEAD` é `origin/main` e o `git switch` leva o working tree inteiro, mas exigiria duas trocas de
  branch com o working tree misto e deixaria a âncora do `SECURITY.md` errada numa das PRs.

## Achados

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `apps/api/(shared)/repositories/organization-invitation.repository.ts:269-275`: o aceite de convite ainda conta o
  membro arquivado (`members.docs.some((docSnap) => docSnap.id !== userId)`), e por isso as duas regras divergem. O dono
  cujo único membro foi arquivado agora pode excluir a conta e ser arquivado pelo admin, mas recebe
  `409 ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS` ao aceitar convite de outra organização. A divergência recusa mais,
  nunca menos: ninguém fica preso numa organização sem dono por causa dela, e a saída existe, porque a tabela da equipe
  lista o perfil arquivado (`organization-member-profiles.ts:32-36`) e a remoção
  (`organization/members/[id]/route.ts:22-58`) não lê o perfil. Concordo com o plano (§11, pergunta 2): corrigir põe N
  documentos de `user` no conjunto de leitura da transação e pede teste de emulador. Continua como achado do backlog.
- Os convites pendentes de um dono arquivado continuam aceitáveis (`isOrganizationActive` olha o vínculo do dono, não o
  perfil). Esta tarefa amplia o caso: antes só o dono sem membros podia ser arquivado, agora também o dono de só membros
  arquivados. A classe de defeito já existia. Continua como achado do backlog (plano, §12).
- `ownsOrganizationWithMembers` lê todos os perfis em paralelo, mesmo depois de achar um vivo. Uma organização tem
  "a handful of people" (`organization-member.repository.ts:80`), e a exclusão é rara. Sem ação.

### ✅ OK

- Premissa central: `UserRepository` não sobrescreve `findById`, então vale o do repositório base, que devolve `null`
  para documento inexistente e para `deletedAt` preenchido (`base.repository.ts:144-155`). O arquivamento é
  `userRepository.delete(id)`, que só grava `deletedAt` (`base.repository.ts:229-231`). A `/code-review` levantou a
  hipótese de `findById` devolver perfil arquivado; a leitura derruba a hipótese.
- Dono sozinho: `others` vazio devolve `false` sem ler perfil (`organization-membership.ts:118-121`). O teste confere que
  `findById` não é chamado.
- Membro arquivado ou órfão (vínculo sem perfil): `findById` devolve `null` e o vínculo não conta (`:123-126`). O órfão
  só aparece quando uma exclusão falha no meio, porque `account-erasure.ts:140-147` remove o vínculo do titular numa
  organização alheia.
- Membro bloqueado (`PUT` com `disabled: true`): o perfil continua vivo e conta. É o certo, porque o bloqueio é
  reversível, e o JSDoc diz isso ao falar de conta que "does not come back on its own". O core não tem restauração de
  perfil arquivado: a busca por `deletedAt: null` no `apps/api` não acha escrita que limpe o campo, e
  `user-merge.ts:55-71` desativa quem tenta entrar de novo.
- Falha de leitura: `Promise.all` rejeita, o helper rejeita e nenhum guard captura (`app/(guards)/` não tem `try`), então
  a rota responde `500`. Nos dois consumidores a chamada vem antes de qualquer escrita:
  - `POST /account/deletion` (`account/deletion/route.ts:43-48`): antes da conferência de senha, de `runAccountErasure` e
    da auditoria.
  - `DELETE /users/:id` (`users/[id]/route.ts:191-196`, working tree): depois do `404` e da trava de conta própria, antes
    do rótulo de auditoria, da Stripe, do Auth e do soft delete.
  O `500` sem `error.code` já é o comportamento do `findById` da linha 178 e entra no achado aberto "outros `500` sem
  `error.code`" do backlog.
- Exclusão pelo titular com só membros arquivados: `eraseOrganization` (`account-erasure.ts:125-161`) apaga todos os
  vínculos da organização de casa, inclusive o do arquivado, e `eraseEntities` apaga os registros dela de qualquer autor.
  É o que o `docs/ROPA.md:193` já descreve ("registros de `entity` de qualquer autor"). Nada novo para o ROPA.
- Teste: mock nas bordas com `vi.hoisted`, padrão de perfil vivo no `beforeEach`, três casos novos (só arquivado, vivo ao
  lado de arquivado, falha de leitura) e duas asserções novas. Nenhum comentário novo no código; o JSDoc explica a regra
  sem citar o fluxo.

### 👁 Verificar no `/test`

1. Ligação do helper real com as rotas. Os testes de rota mockam `@/(shared)/lib/organization-membership` inteiro
   (`accountDeletionRoute.test.ts:49`), então nenhum teste passa pela rota com o helper novo. A leitura acima confirma a
   ordem das chamadas, mas a afirmação do handoff de que o dono com só membros arquivados passa da recusa só fica medida
   com um teste. Repro: em `accountDeletionRoute.test.ts` (ou num arquivo novo), trocar o mock do helper por mocks de
   `organizationRepository.findOwnedBy` → `{ id: "org-home", ownerUserId }`,
   `organizationMemberRepository.listByOrganization` → `[dono, membro]` e `userRepository.findById` → `null` para o
   membro; esperar que a rota chegue à conferência de senha (`identitySignInWithPassword` chamado), não ao `409`. O
   mesmo com `findById` rejeitando: `500` (rejeição) e `runAccountErasure` não chamado.
2. O mesmo para `DELETE /users/:id`: com o membro arquivado, a rota segue para `cancelLiveSubscription`; com a leitura
   falhando, nada de `revokeAccountAccess` nem `userRepository.delete`.
3. Números do handoff que esta revisão não remediu: `organizationMembership.test.ts` 16/16, a mutação
   (`return others.length > 0` derruba 1 caso) e `pnpm --filter api test` 122 arquivos / 1646 testes.

## Correções aplicadas

- `docs/SECURITY.md:40`: a âncora do helper estava em `organization-membership.ts:101-117`, e o diff empurrou a
  função para `:102-127`. Corrigi a âncora e acrescentei uma frase: membro com perfil arquivado ou inexistente não conta,
  porque a conta está desativada e o core não a restaura. A linha é um hunk de `organization-guardrails` (hunk 1 do
  `-U0`), então a correção viaja no commit de docs dela, que no plano abaixo vem depois do commit deste helper.

Nenhuma edição no código.

## Raio de impacto

A assinatura não mudou: `(profileId: string) => Promise<boolean>`. Nenhum DTO, action do SDK, `error.code` ou chave
de i18n. Consumidores:

- `apps/api/app/(routes)/account/deletion/route.ts:43` (em `main`): o dono com só membros arquivados deixa de receber
  `409 ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS`.
- `apps/api/app/(routes)/users/[id]/route.ts:191` (working tree): o admin passa a poder arquivar esse dono.

A exclusão de conta passa a fazer uma leitura de `user` por membro não dono antes de pedir a senha.

## Lacunas de teste

- Teste de rota com o helper real (handoff): continua aberta. Vai para o `/test` como o item 1 acima.
- "Arquivado vira `null`" provado só em `baseRepository.test.ts` e na suíte de emulador `userArchivedProfile` (handoff):
  fora de escopo. A prova é do repositório, não do helper, e a leitura confirma que o helper usa o `findById` do base.
- `ownsOrganizationWithMembers` contando perfil arquivado (lacuna aberta pelo review de `organization-guardrails`):
  fechada pelo develop desta tarefa, com os três casos novos.

## Decisões em aberto

- Branch única para a auditoria, `organization-guardrails` e esta tarefa: decidida pela rodada (ver "Branch"). Se o
  usuário preferir PR separada, os comandos estão no retorno ao orquestrador.
- `specs/BACKLOG.md` vai no mesmo PR ainda com o 🟡 "Um perfil arquivado pelo admin continua contando como membro"
  (`:1439`) aberto e com a âncora `organization-membership.ts:105-117` em `:1440`. Não editei: fechar achado é do
  `/spec --sync`, e o próximo fecha este. Recomendação: aceitar.
- `docs/PRE-PRODUCTION.md:944-947`, `docs/ROPA.md:193` e `docs/INCIDENT-RESPONSE.md:52` não dizem que perfil arquivado
  não conta. Não ficam falsos ("o dono que ainda tem membros"), e o plano deixou o acréscimo para depois. Fica como o
  achado 🟢 do plano, §12, agora sem o `SECURITY.md`.

## Gates estáticos

| gate | resultado |
|------|-----------|
| `pnpm check` | "Checked 1047 files in 448ms. No fixes applied." |
| `pnpm --filter api typecheck` | sem erro |
| paridade de i18n | não se aplica (o diff não toca i18n) |

Sem `--force`. Suíte não rodada aqui (é do `/test`).

## Varredura de segredo

`docs/features/organization-archived-member/` não tem senha, token, chave nem endereço de e-mail. As ocorrências de
"senha" e "token" são texto sobre a rota (`conferência de senha`, `acceptByTokenHash`).

## Plano de commits

Uma branch, `api/fix/organization-guardrails`, nove commits. Passo 0:

```bash
git switch -c api/fix/organization-guardrails
git reset -q
git diff --cached --stat   # tem de sair vazio
```

O `git reset -q` tira do índice o `git mv` da auditoria; o rename volta no commit 7. Depois de cada commit,
`git show --stat --oneline HEAD` conferido contra a lista.

1. `fix(api): refuse to archive an organization owner who still has members`
   - `apps/api/app/(routes)/users/[id]/route.ts`
   - `apps/api/__tests__/usersAdminArchiveAccess.test.ts`
   - `apps/api/__tests__/usersAdminDeleteBilling.test.ts`
   - `apps/api/__tests__/usersAdminAuditTrail.test.ts`
2. `fix(api): rate limit only the POST on /organization/invitations`
   - `apps/api/proxy.ts`
   - `apps/api/__tests__/proxyArcjetKey.test.ts`
3. `fix(api): answer 503 with a code when the invitee check fails`
   - `apps/api/app/(routes)/organization/invitations/route.ts`
   - `apps/api/__tests__/organizationInvitationsRoute.test.ts`
4. `fix(api): stop counting archived members as blocking an owner's exit`
   - `apps/api/(shared)/lib/organization-membership.ts`
   - `apps/api/__tests__/organizationMembership.test.ts`
5. `feat(internationalization): add copy for the organization guardrail error codes`
   - `packages/internationalization/translations/packages/shared/utils.ts`
6. `docs: describe the organization guardrails in the security and compliance docs`
   - `docs/INCIDENT-RESPONSE.md`, `docs/BACKUP.md`, `docs/ROPA.md`, `docs/SUBPROCESSORS.md` (inteiros; só âncoras
     deslocadas pelo código de `organization-guardrails`)
   - `docs/SECURITY.md`, só os hunks 1, 3 e 4 do `-U0` (linhas 39-40, 163 e 175), por patch:

     ```bash
     git diff -U0 -- docs/SECURITY.md \
       | awk -v keep="1,3,4" 'BEGIN{split(keep,k,",");for(i in k)K[k[i]]=1} /^@@/{h++} h==0||K[h]{print}' \
       > /tmp/security-feature.patch
     git apply --cached --unidiff-zero /tmp/security-feature.patch
     ```

     Conferido de novo nesta revisão com `git apply --cached --check`: aplica limpo, três hunks. A auditoria delta não
     mexeu no `SECURITY.md`; continuam seis hunks, na mesma ordem. Os hunks 2, 5 e 6 (upload `?scope=organization`,
     contagem do `parseRequestJson`, item do checklist) ficam para o commit 7.
7. Commit misto aceito: a auditoria do backlog é um assunto só, embora toque `docs/` além de `specs/`. As duas passadas
   (a completa pós-PR #57 e a delta) vão juntas, porque o `BACKLOG.md` foi regravado nas duas e separá-las exigiria
   `git add -p` num arquivo com 829 linhas alteradas.
   `docs(specs): audit the backlog after the organizations delivery`
   - `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/observability-logging.md`,
     `specs/one-time-purchase.md`, `specs/social-sign-in-providers.md`
   - `git add -A specs/teams-organizations.md docs/features/teams-organizations/spec.md` (o rename e as edições do
     arquivo movido)
   - `docs/features/admin-billing-insights/spec.md`, `docs/features/dashboard-home/spec.md`,
     `docs/features/onboarding-flow/spec.md`, `docs/features/plan-entitlements/spec.md` (links)
   - `docs/PRE-PRODUCTION.md` (inteiro, só tem mudança da auditoria)
   - `docs/SECURITY.md` (o que sobrou depois do commit 6)
8. `docs(features): organization-guardrails`
   - `docs/features/organization-guardrails/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
     `review/review.md`, `test/criterios-aceite.md`, `test/report.md`)
9. `docs(features): organization-archived-member`
   - `docs/features/organization-archived-member/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
     `review/review.md` e o `test/` que o `/test` gravar; commitar depois do `/test`)

Título de PR sugerido: `fix(api): organization guardrails for owner exit, invitation rate limit and Auth failures`.

Commits realizados: (preenchido pelo orquestrador)
