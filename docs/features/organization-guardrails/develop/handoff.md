# Handoff do develop: travas da organização

Implementação do plano `analyze/plan.md` na ordem API, i18n e docs. Sem SDK, sem `apps/app`, sem `apps/web`, sem
variável de ambiente. Nada foi commitado, nenhuma branch foi criada e o índice git não foi tocado (segue só com o
`git mv` da auditoria: `git diff --cached --stat` → `specs/teams-organizations.md => docs/features/teams-organizations/spec.md`).

## Blueprint → arquivos

| item do plano | arquivos |
|---------------|----------|
| §10.1 D10, recusa no `DELETE /users/:id` | `apps/api/app/(routes)/users/[id]/route.ts` (import + bloco nas linhas 191-196) |
| §7.1 testes do D10 | `apps/api/__tests__/usersAdminArchiveAccess.test.ts` (mock de `organization-membership` + `describe` novo com 4 casos) |
| §7.2 mock nos outros testes do `DELETE` | `apps/api/__tests__/usersAdminDeleteBilling.test.ts`, `apps/api/__tests__/usersAdminAuditTrail.test.ts` |
| §10.2 D11, rate limit só no `POST` | `apps/api/proxy.ts` (comentário do bloco de convites, `RATE_LIMITED_METHODS` em 80-83, `isRateLimited` em 85-92, chamada em 176) |
| §7.4 testes do proxy | `apps/api/__tests__/proxyArcjetKey.test.ts` (helpers `appRequest`/`spendBudget` + `describe` novo com 4 casos) |
| §10.3 item 3, `503` no convite | `apps/api/app/(routes)/organization/invitations/route.ts` (import de `adminAuthErrorReason` + `try/catch` em 73-88) |
| §7.3 testes do convite | `apps/api/__tests__/organizationInvitationsRoute.test.ts` (caso `:331-343` reescrito, caso novo de falha do Firestore, header `x-request-id` no helper `request`) |
| §10.4 i18n | `packages/internationalization/translations/packages/shared/utils.ts` |
| §10.5 docs | `docs/SECURITY.md`, `docs/INCIDENT-RESPONSE.md`, `docs/BACKUP.md`, `docs/ROPA.md`, `docs/SUBPROCESSORS.md` |

## Contrato

Nenhum DTO ou action do SDK mudou. Os consumidores dos códigos novos são as telas que já leem qualquer `error.code`
pelo `FormattedError`: `useUserCrud.tsx` (arquivar, admin) e `useOrganizationActions.tsx` (convidar, dono). Nenhum
arquivo delas foi editado.

## Códigos de erro novos

| código | status | entrada em `apiErrors` |
|--------|--------|------------------------|
| `USERS_DELETE_ORGANIZATION_HAS_MEMBERS` | 409 | pt-br, en, es, logo depois de `USERS_DELETE_AUTH_FAILED` |
| `ORGANIZATION_INVITATION_FAILED` | 503 | pt-br, en, es, logo depois de `ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS` |

Contagem: `grep -c "USERS_DELETE_ORGANIZATION_HAS_MEMBERS\|ORGANIZATION_INVITATION_FAILED" .../shared/utils.ts` → `6`
(dois códigos em três idiomas). A cópia é a da tabela do §10.4, com um ajuste no espanhol: "ser quitados del equipo
antes" no lugar de "ser quitados antes", que soava incompleto.

Evento de log novo: `[organization] invitation-member-check-failed` com `requestId` e `reason`.

## Desvios em relação ao plano

Nenhuma decisão do plano estava errada. Os desvios são de forma:

1. **Sem comentário no `DELETE /users/:id`.** O plano deixava cortar. O JSDoc de `ownsOrganizationWithMembers`
   (`organization-membership.ts:101-104`) já diz que não há transferência de dono, então o nome do helper basta.
2. **Comentário do proxy manteve a frase "The pending ceiling and the resend interval still hold".** Coube nas mesmas
   quatro linhas, então a lista continua em `proxy.ts:60-78` e as âncoras `ROPA.md:54`, `:94` e `SECURITY.md:163`
   não se mexeram (medido: `grep -n "^const RATE_LIMITED_PATHS\|^];" apps/api/proxy.ts` → `60`, `78`).
3. **Dois casos de teste a mais que o §7:** `OPTIONS /organization/invitations` com a cota estourada responde `204`
   sem chamar o limitador (cobre o critério "OPTIONS continua respondendo 204"), e o caso de falha do Auth também
   confere que o log não contém o e-mail do dono nem a mensagem do erro.
4. **Duas âncoras fora da lista do §10.5 foram corrigidas** porque o código novo as deslocou:
   `docs/SUBPROCESSORS.md:35` (`users/[id]/route.ts:78` → `:79`, a chamada `getStripe()`) e `docs/SUBPROCESSORS.md:40`
   (`apps/api/proxy.ts:167` → `:177`, a chamada `checkRateLimit`).
5. **Data da medição da lista em `SECURITY.md:163`** passou de 2026-10-22 para 2026-10-23, porque a lista foi medida
   de novo aqui.

Âncoras que citam `proxy.ts` e ficaram como estavam: `docs/RESEARCH-tanstack-vs-next.md:77,149` (nota de pesquisa
datada, cujos números já não batiam antes desta tarefa) e `docs/PRE-PRODUCTION.md:501` (aponta para
`apps/app/proxy.ts` e `apps/web/proxy.ts`, que não mudaram).

## O que é meu em `docs/SECURITY.md`

O arquivo já tinha mudanças da auditoria do backlog no working tree. Para o `/review` separar os commits (numeração
do working tree atual):

- **desta tarefa:**
  - linha 39: só as âncoras `:45-47`, `:133-135`, `:186-188` → `:46-48`, `:134-136`, `:187-189`;
  - linha 40: o sub-item novo inteiro (`DELETE /users/:id` recusa com `409 USERS_DELETE_ORGANIZATION_HAS_MEMBERS` …);
  - linha 163: a data `2026-10-22` → `2026-10-23` e a frase "Em `/organization/invitations` só o `POST` conta … como
    os outros 14 caminhos da lista.", que substitui "As três de convite valem para qualquer método: …";
  - linha 175: `apps/api/proxy.ts:90` → `:100`.
- **da auditoria (não mexi):** o hunk do upload (`?scope=organization`, linhas 106-108), a contagem de handlers do
  `parseRequestJson` (linha 179, "26 handlers, contados em 2026-10-23") e o item do checklist com
  `requireOrganizationApi` (linha 204).

Os outros quatro documentos (`INCIDENT-RESPONSE.md`, `BACKUP.md`, `ROPA.md`, `SUBPROCESSORS.md`) só têm mudança
desta tarefa (`git diff --stat` → 6, 2, 4 e 6 linhas alteradas, respectivamente).

## Validação

| gate | comando | resultado |
|------|---------|-----------|
| risco R1 (import sem mock) | `pnpm --filter api exec vitest run` nos 4 arquivos que importam `users/[id]/route`, antes do mock | 3 arquivos falharam no import (`getFirestoreAdmin` ausente do mock de `@repo/auth/server`); `mergedUserPayload.test.ts` passou, como o plano previa |
| testes dos arquivos tocados | `pnpm --filter api exec vitest run` nos 4 arquivos do `DELETE` | 4 arquivos, 60 testes, todos passando |
| | idem `organizationInvitationsRoute.test.ts` | 23 testes passando |
| | idem `proxyArcjetKey.test.ts` | 7 testes passando |
| suíte da api | `pnpm --filter api test` | 122 arquivos, 1643 testes passando (rodado depois do último ajuste de formatação) |
| typecheck | `pnpm --filter api typecheck` | exit 0 |
| lint | `pnpm check` | "Checked 1047 files … No fixes applied" |
| paridade i18n | `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes passando |

Teste de mutação, feito à mão com cópia e restauração dos três arquivos de rota: trocar `profile.id` por
`profile.reference_id` no `DELETE`, pôr `"GET"` no mapa do proxy e acrescentar `email` ao log do convite fez 5 dos
casos novos falharem (`vitest run` nos três arquivos de teste → "5 failed | 36 passed"). Os arquivos foram
restaurados e a suíte inteira passou de novo depois.

Smoke local: não subi app nem API. Não há UI nova, e os testes de rota cobrem o comportamento.

`test:emulator` não foi rodado: nenhum arquivo do emulador nem consulta mudou.

## A verificar no `/test`

- **Helper real contra o Firestore no `DELETE`.** Os testes de rota mocam `ownsOrganizationWithMembers`. Repro: emulador
  + `next start` da api, criar dono `qa-organization-guardrails-owner@example.com` com membro
  `qa-organization-guardrails-member@example.com`, `curl -i -X DELETE /users/<id do documento do dono>` com cookie de
  admin → esperado `409` com o código. Opcional pelo §8 do plano.
- **Cópia nas telas.** Que o alerta do admin e o da tela da equipe mostrem os textos novos depende do caminho
  `FormattedError` já testado em `useUserCrudSelfLockout.test.tsx`; para os dois códigos novos, a verificar no `/test`
  (leitura do dicionário basta, sem `agent-browser`).
- **`HEAD /organization/invitations` (R2).** Não está no mapa, então não conta. Repro: `curl -I` com API de pé.
- 🔒 **`429` real da Arcjet** no `POST` e `GET` livre com a cota estourada: exige `ARCJET_KEY` válida, pendência que
  já existe.
- 🔒 **Falha real do Firebase Auth** no convite: o emulador não a produz sem mock; o teste de rota é a prova.

## Lacunas de teste e pendências herdadas

- Lacuna "`isMemberOfOrganization` com erro do Auth diferente de `user-not-found`" do `review.md` da PR #57: **fechada
  aqui**, no nível da rota (`organizationInvitationsRoute.test.ts`, caso "answers 503 and stores and sends nothing when
  Auth fails…").
- Promoção a admin do dono de organização com membros (`PUT /users/:id` com `type: ADMIN`, hoje
  `users/[id]/route.ts:138-140`): **fora de escopo**, continua aberta. Achado para o backlog (D7 do plano).
- Outros `500` sem `error.code` em rotas além do convite (`specs/BACKLOG.md:1352`): **fora de escopo**, continua aberto.
- `specs/BACKLOG.md` e `specs/observability-logging.md` (contagem de `logEvent(` sobe de 48 para 49, âncoras de
  `proxy.ts:80-82`): **fora de escopo**, ficam para o `/spec --sync`.

## Decisões em aberto

Nenhuma nova. As cinco perguntas da §11 do plano seguiram a opção adotada lá.
