# Handoff do `/develop` — audit-log-levels

## Retomada após interrupção

A primeira execução do `/develop` caiu no meio, sem deixar handoff e com o `STATE.md` ainda em `pending`.
Esta execução partiu do working tree que ela deixou, fez o inventário item a item contra o plano e só
completou o que faltava:

- **Já feito e conferido:** contrato do SDK, toda a parte da API (nível, recorder, repositório, mapper,
  schema, rota, os 8 pontos de gravação, script de backfill), front, i18n, índices e os testes de todas as
  camadas. Typecheck, testes e `pnpm check` passavam sobre esse estado (números abaixo).
- **Pela metade:** nada encontrado. Nenhum arquivo ficou cortado no meio; os quatro workspaces compilam.
- **Faltando:** `docs/PRE-PRODUCTION.md` e `docs/ROPA.md` §7. Escritos nesta execução.
- **Corrigido:** a frase do JSDoc de `createDefaultUserProfile` dizia "neither" para três itens; virou
  "none of them".
- **Arquivos de script:** `apps/api/scripts/auditLevelPatch.mjs` não é sobra. É o módulo puro com
  `buildAuditLevelPatch`, separado porque `backfill-audit-levels.mjs` executa `main()` ao ser importado.
  Mesmo arranjo de `emulatorTarget.mjs`, que também é importado por teste. Os dois ficam.
- **`apps/api/package.json`:** só o script `backfill-audit-levels`. Nenhuma dependência nova
  (`git diff apps/api/package.json` → 1 linha em `scripts`).

## Blueprint → arquivos

| item | arquivos |
|------|----------|
| 10.1 contrato | `packages/sdk/src/types/audit/audit.ts` (`AuditLevel`, 8 ações, `level` no DTO e na query), `packages/sdk/src/actions/audit/action.ts` |
| 5.1 nível por ação | `apps/api/(shared)/lib/audit-level.ts` (novo): `AUDIT_ACTION_LEVEL`, `auditLevelOf`, `auditExpiresAtFor`, `AUDIT_INFO_RETENTION_DAYS = 365` |
| 5.2 recorder | `apps/api/(shared)/lib/audit-recorder.ts`: `level` + `expiresAt` em `recordAuditEvent`, `recordAuditEventOnce`, `recordAccountLifecycleEvent`, `level` em `recordImpersonationSession` |
| 5.3 repositório | `apps/api/(shared)/repositories/audit-event.repository.ts`: `append`/`appendOnce` com `expiresAt` fora do DTO, `level` em `listPage` |
| 5.4 mapper | `apps/api/(shared)/mappers/audit-event.mapper.ts`: ausente ou desconhecido → `sensitive`; `level` no `toPersistence` |
| 5.5 / 5.6 borda e rota | `apps/api/(shared)/validation/audit.schema.ts`, `apps/api/app/(routes)/audit-events/route.ts` |
| 5.7 pontos de gravação | `lib/user-merge.ts` + `auth/sign-up/route.ts` (`account.signUp`), `auth/email-verification/confirm/route.ts`, `account/onboarding/route.ts`, `webhooks/payments/route.ts` + `lib/subscription-audit.ts` (novo) + `lib/subscription-notifications.ts` (exports), `users/route.ts` (`user.create`) |
| 10.5 front | `AuditListClient.tsx` (coluna com `Badge`), `AuditFilters.tsx` (select de nível, grade `md:grid-cols-2 lg:grid-cols-4`), `auditFiltersSchema.ts` (`level`, `auditLevelAll`), `apps/app/shared/lib/queryKeys.ts` |
| 10.6 i18n | `packages/internationalization/translations/apps/app/pages/admin/auditTrail.ts` (3 idiomas) |
| 10.7 índices | `firestore.indexes.json` (+2 entradas de `auditEvent`) |
| 10.8 backfill | `apps/api/scripts/backfill-audit-levels.mjs`, `apps/api/scripts/auditLevelPatch.mjs`, `apps/api/package.json` |
| 10.9 docs | `docs/PRE-PRODUCTION.md` (§1.3, §1.8, §1.11 e §1.12 novas), `docs/ROPA.md` §7 |

Testes novos: `auditLevel.test.ts`, `subscriptionAudit.test.ts`, `auditLevelBackfill.test.ts`. Estendidos:
`auditEventMapper`, `auditRecorder`, `auditListQuery`, `auditEventRepository`, `auditEventsRoute`,
`paymentsWebhookRoute`, `signUpProfile`, `userMergeArchivedProfile`, `googleSignInProfile`,
`welcomeNotification` (só mock), `authEmailVerification`, `accountOnboardingRoute`, `usersRoute`,
`firestoreIndexes` na API; `auditFilters`, `auditFiltersSchema`, `auditListFiltersSurvive`,
`useListAuditEvents` no app.

## Contrato e raio de impacto

- `AuditEventDTO.level` é obrigatório. Quem monta o DTO literal quebraria no typecheck; os quatro
  workspaces passam.
- `AuditEventListQuery.level` é opcional, consumido por `useListAuditEvents` via spread dos filtros.
- `createDefaultUserProfile` ganhou um terceiro parâmetro opcional (`{ requestId }`); os outros chamadores
  seguem com dois.
- `readPrevious`, `ACTIVE` e `PAYMENT_PENDING` passaram a ser exportados por `subscription-notifications.ts`.
  `readPrevious` agora também lê `priceId`; o comportamento das notificações não muda.

## Códigos de erro

Nenhum `error.code` novo. A listagem reusa `VALIDATION_FAILED`, `PAGINATION_CURSOR_INVALID` e
`PAGINATION_INDEX_MISSING`, que já têm `apiErrors` nos 3 idiomas.

## Desvios do plano

1. **E-mail confirmado: o titular vem do `localId` da resposta do Identity Toolkit**, não de
   `checked.email` → `getUserByEmail` → `findByReferenceId`. `identityApplyOobCode` já devolve o `localId` da
   conta verificada (tipo `ToolkitApplyOob`), então o caminho economiza uma leitura no Auth e não depende de
   o e-mail continuar único. O rótulo é `applied.email`. Sem perfil, ou com a busca falhando, a rota loga
   `audit/subject-not-found` (só `action` e `requestId`) e responde 200 do mesmo jeito.
2. **Voltar de pagamento pendente não conta como ativação.** O plano gravaria `subscription.activate` em
   qualquer passagem de fora de `{active, trialing}` para dentro. A implementação exclui a origem
   `past_due`/`unpaid`: é a mesma assinatura voltando a pagar, e gravar ativação ali repetiria o evento a
   cada atraso. `incomplete` → `active` continua sendo ativação. Coberto por
   `subscriptionAudit.test.ts` ("does not call a recovered payment an activation").
3. **`POST /users` usa o perfil devolvido por `userRepository.create`** como alvo, em vez de esperar o
   `findByReferenceId` do fim da rota. O evento só é gravado depois de a criação dar certo.
4. **Onboarding usa `ctx.subjectProfile.reference_id` como `uid`** em vez de `ctx.user.uid`. Fora de
   personificação os dois coincidem, e escrita personificada já é recusada antes.
5. **O patch do backfill mora em `auditLevelPatch.mjs`** (função `buildAuditLevelPatch`), não exportado do
   próprio script, pelo motivo da seção de retomada.
6. **Teste do `user.create`** foi para `usersRoute.test.ts`, que já exercita `POST /users`, em vez de
   `usersAdminAuditTrail.test.ts`.
7. **Docs:** índices e backfill de nível viraram §1.11 e §1.12 do `PRE-PRODUCTION.md`, no fim do bloco 1,
   em vez de ficarem junto da §1.4. A §1.8 ganhou as duas linhas novas e as contagens de texto foram
   atualizadas (11 entradas declaradas, 10 pendentes no projeto de referência).

Nenhuma decisão do plano estava errada a ponto de ser revertida.

## Decisões em aberto

Herdadas do plano, sem resposta: prazo de 12 meses dos eventos `info`, E5 (prazo dos sensíveis),
`trialing` como ativação, nível na exportação LGPD (não incluído).

## Validação

| gate | comando | resultado |
|------|---------|-----------|
| typecheck | `pnpm turbo run typecheck --filter=api --filter=app --filter=@repo/sdk --filter=@repo/internationalization` | 4/4 tasks ok |
| testes api | `pnpm turbo run typecheck test --filter=api` (depois da última edição) | 135 arquivos, 1962 testes ok |
| testes app | `pnpm turbo run test --filter=app` | 155 arquivos, 1403 testes ok |
| testes sdk | idem | 4 arquivos, 15 testes ok |
| paridade i18n | `@repo/internationalization:test` | 7 arquivos, 67 testes ok |
| lint | `pnpm check` | 1166 arquivos, nenhuma correção |
| backfill carrega | `node scripts/backfill-audit-levels.mjs --bogus` | imprime o uso e sai com 1, antes de tocar em Firestore |
| `test:emulator` | não rodado | a máquina tem JDK 17 e a suíte exige 21. Nenhum teste de emulador grava `auditEvent` de verdade (`accountErasureStorage.emulator.test.ts` mocka o repositório) |

Nenhum app foi levantado e nenhum processo ficou de pé.

## A verificar no `/test`

- Coluna "Nível" com badge legível em light e dark, e grade de 4 filtros quebrando para 2 e 1 colunas no
  mobile sem rolagem horizontal. Repro: `/admin/audit` como admin, nos 3 idiomas.
- Filtro de nível combinado com usuário e período: a requisição leva `level`, `userId`, `from` e `to`
  juntos; "Limpar" volta para "Todos os níveis" e remove `level` da query. Repro: aba Network.
- Cadastro por senha gera "Cadastro" informativo com ator = alvo; primeiro login Google gera o mesmo com
  `requestId` nulo.
- E-mail confirmado no emulador: o Auth emulator devolve `localId` em `accounts:update` com `oobCode`, e o
  evento sai com o titular certo. Repro: pegar o código em
  `http://127.0.0.1:9099/emulator/v1/projects/<id>/oobCodes` e abrir o link.
- Onboarding: um evento só ao concluir, nenhum no duplo clique.
- Admin cria usuário em `/admin/users` → "Usuário criado pelo admin" com nível "Sensível".
- Documento antigo sem `level` (gravado à mão no emulador) aparece como "Sensível" em "Todos", não aparece
  no filtro "Sensível" antes do backfill e aparece depois de `pnpm --filter api backfill-audit-levels
  --apply`; segundo dry-run reporta 0.
- Evento `info` gravado no emulador tem `expiresAt` como `Timestamp` a 365 dias; sensível não tem o campo.
- 🔒 sem infra: 503 por índice ausente em projeto real (provado só por `auditEventsRoute.test.ts`), TTL
  apagando de fato (Blaze), eventos de assinatura no navegador (Stripe em modo teste).

## Lacunas de teste conhecidas

- Nenhum teste lê o documento gravado no Firestore real ou emulado para conferir que `expiresAt` vira
  `Timestamp`; o teste do repositório usa um fake. O `/test` confere no emulador.
- O script de backfill só tem teste da função pura; o laço de paginação e o `batch.commit` não são
  exercitados por teste automatizado.
