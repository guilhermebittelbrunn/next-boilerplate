# Revisão: travas da organização

Escopo revisado: o diff de `apps/api` (duas rotas, o proxy e cinco arquivos de teste), as duas chaves novas de
`apiErrors` e as âncoras dos cinco documentos da feature. O resto do working tree é da auditoria do backlog e entra
aqui só para montar o plano de commits.

## Branch

- Atual: `guilhermebittelbrunn/cycle-command-v8`. O regex do padrão a recusa (`BRANCH INVALIDA`). Ela não tem
  commit próprio sobre `origin/main` e não tem upstream.
- Proposta: `api/fix/organization-guardrails`, a partir da atual (que está em `61a781e`, o `main` de hoje). O regex
  aceita (`branch OK`). O projeto é `api` porque o código está todo lá; a i18n e os documentos acompanham.
- Não criei nem renomeei branch. A rodada é do `/cycle`, que não cria branch, e a troca fica para quando os commits
  forem aprovados: `git switch -c api/fix/organization-guardrails`. O working tree e o índice vão junto.

## Achados

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/api/(shared)/lib/organization-membership.ts:116`: o helper conta como membro um perfil arquivado pelo admin.
  O arquivamento marca `deletedAt` no perfil e deixa o vínculo (`users/[id]/route.ts:228`); `listByOrganization`
  só filtra `deletedAt` do vínculo (`organization-member.repository.ts:81-92`). Com isso, um dono cujo único membro foi
  arquivado recebe `409 USERS_DELETE_ORGANIZATION_HAS_MEMBERS` no admin e `409` na exclusão pelo titular. A saída
  existe: o dono vê o membro arquivado na tabela (`organization-member-profiles.ts:33-36` lista perfil arquivado com
  nome vazio) e pode removê-lo. Não mudei nada porque muda regra de negócio nos dois caminhos de exclusão. Vai para o
  backlog como achado.

### 🟢 Sugestão / nit

- `apps/api/app/(routes)/users/[id]/route.ts:191`: se o Firestore falhar dentro de `ownsOrganizationWithMembers`, o
  `DELETE` responde `500` sem `error.code`. É o mesmo comportamento do `findById` da linha 178 e da exclusão pelo
  titular (`account/deletion/route.ts:43`), então ficou como está. Entra no achado aberto "outros `500` sem
  `error.code`" do backlog.
- Variável `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED` desligada depois de a organização ter membros: as rotas de
  membros respondem `404 ORGANIZATION_MEMBERS_DISABLED` (`organization-members.ts:21-28`), então o dono não tem como
  remover ninguém, e o admin também não arquiva o dono. Já valia para a exclusão pelo titular; a feature estende o
  caso ao admin. O bloqueio (`PUT` com `disabled: true`) continua disponível. Registro para o backlog, sem ação aqui.

### ✅ OK

- `DELETE /users/:id` (`route.ts:191-196`): recusa depois do `404` e da trava de conta própria e antes de qualquer
  efeito (Stripe, Auth, soft delete, auditoria). Chama o helper com `profile.id`, o id do documento, igual à exclusão
  pelo titular (`account/deletion/route.ts:43`, `ctx.subjectProfile.id`). `HTTP_STATUS.CONFLICT` e
  `{ error: { code } }` no formato do repo.
- Proxy (`proxy.ts:80-92`, `:176`): `RATE_LIMITED_METHODS` só restringe `/organization/invitations` a `POST`; os
  outros 16 caminhos contam qualquer método. `OPTIONS` sai antes, na linha 167. `HEAD` não está no mapa e não conta:
  confirmado por leitura, então o item R2 do handoff sai da lista do `/test`.
- `POST /organization/invitations` (`route.ts:73-88`): o `try` cobre a chamada inteira de `isMemberOfOrganization`,
  ou seja, a falha do Auth e também a leitura do perfil e do vínculo no Firestore. O log usa `adminAuthErrorReason`,
  que devolve o código do provedor ou o `name` do erro e nunca a mensagem (`toolkit-error-codes.ts:93-102`). Nada é
  gravado nem enviado antes do retorno `503`.
- `apiErrors`: os dois códigos estão nos três idiomas, na mesma posição. `FormattedError` traduz qualquer `error.code`
  presente no dicionário (`formattedError.ts:71-77`), então as telas de arquivar (`useUserCrud.tsx:33`) e de convidar
  (`useOrganizationActions.tsx:21-41`) mostram a cópia nova sem mudança no app. Confirmado por leitura.
- A afirmação de `docs/SECURITY.md:163` de que a tabela do dono relê o caminho por `GET` depois de cada convite e de
  cada revogação confere com `useOrganizationActions.tsx:27-29` e `:46-48`. A de `SECURITY.md:40` de que os convites
  continuariam aceitáveis confere com `isOrganizationActive` (`organization-invitation.ts:98-111`), que olha o
  vínculo do dono e não o perfil.
- Âncoras dos cinco documentos remedidas contra o código atual: `users/[id]/route.ts` `:46-48`, `:79`, `:113`,
  `:134-136`, `:147-152`, `:154-156`, `:175`, `:187-189`, `:191-196`, `:216`, `:228`; `organization-membership.ts:101-117`;
  `proxy.ts` `:60-78`, `:80-83`, `:94-106`, `:100`, `:177`. Todas batem.
- Comentários: o do proxy explica o porquê da exceção e não cita o fluxo. Nenhum comentário novo nas rotas.
- Testes no padrão do repo: mock nas bordas com `vi.hoisted`, cada caminho de erro novo coberto no nível de rota, e
  o teste do convite confere que o log não leva o e-mail do convidado, o do dono nem a mensagem do erro.

### 👁 Verificar no `/test`

1. Números do handoff, que esta revisão não remediu: `pnpm --filter api exec vitest run` nos arquivos
   `usersAdminArchiveAccess`, `usersAdminDeleteBilling`, `usersAdminAuditTrail`, `organizationInvitationsRoute` e
   `proxyArcjetKey` (handoff: 60, 23 e 7 testes passando), e depois `pnpm --filter api test` (handoff: 122 arquivos,
   1643 testes).
2. Teste de mutação do handoff ("5 failed | 36 passed"). É a afirmação que sustenta que os casos novos pegam a
   regressão. Repro: trocar `profile.id` por `profile.reference_id` em `users/[id]/route.ts:191`, pôr `"GET"` em
   `proxy.ts:82` e acrescentar `email` ao `logEvent` de `organization/invitations/route.ts:80`; rodar os três
   arquivos de teste; restaurar com `git checkout -p` só nesses trechos (o working tree tem outras mudanças).
3. Helper real no `DELETE`, contra o emulador (opcional pelo §8 do plano): dono com um membro, `DELETE /users/<doc id
   do dono>` com cookie de admin, esperar `409 USERS_DELETE_ORGANIZATION_HAS_MEMBERS` e o perfil sem `deletedAt`.
4. Caso do 🟡 acima, se o emulador estiver de pé: arquivar o membro pelo admin, tentar arquivar o dono. O esperado
   hoje é `409`; o resultado serve de evidência para o achado do backlog.
5. 🔒 `429` real da Arcjet no `POST` com o `GET` livre: exige `ARCJET_KEY`, pendência que já existe.
6. 🔒 Falha real do Firebase Auth no convite: o emulador não a produz; o teste de rota é a prova.

## Correções aplicadas

Nenhuma. Não achei defeito no diff que justificasse edição, e os dois pontos em aberto mudam regra de negócio.

## Raio de impacto

Nenhum contrato do SDK mudou. Os dois códigos novos chegam a `useUserCrud.tsx` (admin) e
`useOrganizationActions.tsx` (dono) pelo `FormattedError`. A mudança no proxy só afeta `GET` e `HEAD` em
`/organization/invitations`, que deixam de gastar a cota por IP. Quem chama `DELETE /users/:id` passa a poder receber
`409`; o único chamador é o painel admin.

## Lacunas de teste

- `isMemberOfOrganization` com erro do Auth diferente de `user-not-found` (herdada da PR #57): fechada pelo
  develop, em nível de rota. Confirmado por leitura do teste.
- Promoção a admin do dono de organização com membros (`users/[id]/route.ts:138-140`): fora de escopo, continua
  aberta no backlog.
- Outros `500` sem `error.code`: fora de escopo, continua aberta. O caso do 🟢 acima entra nela.
- `ownsOrganizationWithMembers` contando perfil arquivado: lacuna nova, sem teste. Fica para o achado do 🟡.

## Decisões em aberto

Nenhuma para esta rodada. Os dois pontos (🟡 do membro arquivado e 🟢 da variável desligada) vão para o backlog no
próximo `/spec --sync`.

## Gates estáticos

| gate | resultado |
|------|-----------|
| `pnpm check` | "Checked 1047 files in 604ms. No fixes applied." |
| `pnpm --filter api typecheck` | sem erro |
| `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes passando |

Sem `--force`. Suíte da api não rodada aqui (é do `/test`).

## Varredura de segredo

`docs/features/organization-guardrails/` não tem senha, token, chave nem e-mail real. Os endereços citados são de
`@example.com`. O diff da auditoria também passou na mesma varredura.

## Plano de commits

Antes do primeiro commit, `git reset -q` (mixed) para tirar do índice o `git mv` da auditoria. O working tree fica
igual; o rename volta no commit 7, com `git add -A` nos dois caminhos. Depois, `git diff --cached --stat` tem de sair
vazio.

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
4. `feat(internationalization): add copy for the organization guardrail error codes`
   - `packages/internationalization/translations/packages/shared/utils.ts`
5. `docs: describe the organization guardrails in the security and compliance docs`
   - `docs/INCIDENT-RESPONSE.md`, `docs/BACKUP.md`, `docs/ROPA.md`, `docs/SUBPROCESSORS.md` (inteiros)
   - `docs/SECURITY.md`, só os hunks da feature (linhas 39-40, 163 e 175), por patch:

     ```bash
     git diff -U0 -- docs/SECURITY.md \
       | awk -v keep="1,3,4" 'BEGIN{split(keep,k,",");for(i in k)K[k[i]]=1} /^@@/{h++} h==0||K[h]{print}' \
       > /tmp/security-feature.patch
     git apply --cached --unidiff-zero /tmp/security-feature.patch
     ```

     Conferido com `--check`: aplica limpo. Os hunks 1, 3 e 4 do `-U0` são os da feature; os hunks 2, 5 e 6 (upload
     `?scope=organization`, contagem do `parseRequestJson`, item do checklist) ficam no working tree para o commit
     seguinte.
6. Commit misto aceito: a auditoria do backlog é um assunto só, embora toque `docs/` além de `specs/`.
   `docs(specs): audit the backlog after the organizations delivery`
   - `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/observability-logging.md`,
     `specs/one-time-purchase.md`, `specs/social-sign-in-providers.md`
   - `git add -A specs/teams-organizations.md docs/features/teams-organizations/spec.md` (o rename e as edições do
     arquivo movido)
   - `docs/features/admin-billing-insights/spec.md`, `docs/features/dashboard-home/spec.md`,
     `docs/features/onboarding-flow/spec.md`, `docs/features/plan-entitlements/spec.md` (links)
   - `docs/PRE-PRODUCTION.md` (inteiro, só tem mudança da auditoria)
   - `docs/SECURITY.md` (o que sobrou depois do commit 5)
7. `docs(features): organization-guardrails`
   - `docs/features/organization-guardrails/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
     `review/review.md`, e o `test/` quando existir)

Depois de cada commit, `git show --stat --oneline HEAD` conferido contra a lista acima.

Título de PR sugerido: `fix(api): organization guardrails for owner archive, invitation rate limit and Auth failures`.

Commits realizados: (preenchido pelo orquestrador)
