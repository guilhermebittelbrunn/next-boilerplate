# Revisão — audit-log-levels

Rodada autônoma do `/cycle`, sem acompanhamento do usuário. A revisão leu o diff inteiro de código
(`packages/sdk`, `apps/api`, `apps/app`, `packages/internationalization`, `firestore.indexes.json`) contra o
plano, o handoff e o [`review-checklist.md`](../../../review-checklist.md), e rodou só os gates estáticos.
Nenhum app subiu e nenhuma suíte de teste rodou além da paridade de i18n.

## Branch

- **Resolvida:** `feat/audit-log-levels`, criada nesta etapa com `git switch -c` a partir de
  `guilhermebittelbrunn/run-full-task`, que por sua vez está em `a13768c` (mesmo commit de `main`).
- **Por que não reutilizar a anterior:** `guilhermebittelbrunn/run-full-task` falha no regex do padrão
  `<project>/<type>/<title>`. Ela não tinha upstream nem commit à frente de `origin/main`, então daria para
  renomear com `git branch -m`. A revisão preferiu criar uma branch nova porque o nome antigo é o do
  workspace do Orca, e renomeá-lo poderia desamarrar o worktree da ferramenta. A branch antiga continua
  existindo, sem commit próprio.
- **Sem `project`:** o diff toca `apps/api` e `apps/app`, e o padrão manda omitir o prefixo quando há mais
  de um app.
- **Validação do nome:** `branch OK: feat/audit-log-levels` (regex do agent, rodado depois do switch).
- O `git switch -c` preservou o working tree e o índice: os dois `git mv` da auditoria do backlog
  continuam preparados.

## 🔴 Bloqueante

Nenhum. A revisão não encontrou defeito que impeça os commits.

## 🟡 Atenção

- `apps/api/app/(routes)/auth/email-verification/confirm/route.ts:42-60`: o titular do evento sai de
  `applied.localId`, a resposta de `accounts:update` com `oobCode`. A documentação pública do Firebase
  para "confirm email verification" não lista `localId` entre os campos da resposta. O risco é limitado
  por dois fatos lidos no código: a rota de troca de e-mail já depende do mesmo campo na mesma chamada
  (`auth/email-change/confirm/route.ts:82` e `:90`), e, se o campo vier vazio, a rota cai no log
  `audit/subject-not-found` e responde 200, sem 500 e sem evento com titular errado. A falha seria
  silenciosa: nenhum evento "E-mail confirmado" em produção. Sem correção aqui; vai para a lista do `/test`.
- `apps/api/app/(routes)/account/onboarding/route.ts:63`: o evento é gravado com `recordAuditEvent` comum,
  sem id determinístico. `advanceOnboardingState` devolve `unchanged` para estado já concluído, e o
  `OnboardingClient.tsx` bloqueia o duplo clique com uma ref, então a duplicação só aconteceria com duas
  requisições concorrentes (duas abas). O handoff afirma "nenhum no duplo clique"; o código sustenta isso
  para o mesmo navegador, não para corrida entre abas. Corrigir com `onceKey` por perfil mudaria o
  comportamento se um fork reabrir o onboarding, então ficou como está.

## 🟢 Sugestão / nit

- `apps/api/app/(routes)/webhooks/payments/route.ts:129`: cada ação do laço chama
  `recordAccountLifecycleEvent` sem `label`, e cada chamada faz um `getUser` no Firebase Auth
  (`audit-recorder.ts:168`). Um mesmo evento da Stripe pode gerar duas ações (ativação e cancelamento
  agendado), ou seja, duas leituras iguais. Custo baixo, não vale mexer agora.
- `apps/api/(shared)/lib/subscription-audit.ts:48`: `subscription.end` é gravado para qualquer passagem a
  `canceled`, inclusive de `incomplete`, quando a assinatura nunca chegou a ser ativada. É raro e coerente
  com a frase "assinatura encerrada", mas o admin pode ver um "encerrada" sem "ativada" antes.
- `apps/api/app/(routes)/webhooks/payments/route.ts:127`: o estado anterior vem de `profile.subscription`,
  lido fora da transação de `applySubscriptionState`. Dois eventos diferentes da mesma assinatura
  processados ao mesmo tempo leem o mesmo estado anterior e podem gravar a mesma ação duas vezes, com ids
  distintos (o `onceKey` usa `event.id`). As notificações de assinatura já têm essa característica desde
  antes desta entrega.
- `apps/api/(shared)/lib/user-merge.ts:72`: dois primeiros acessos concorrentes de uma conta Google podem
  criar dois perfis e, agora, dois `account.signUp`. A corrida de criação de perfil é anterior a esta
  entrega; o evento só a torna visível na trilha.

## ✅ OK

- `Record<AuditAction, AuditLevel>` exaustivo em `apps/api/(shared)/lib/audit-level.ts`: as 26 ações do
  enum têm nível, e uma ação nova sem nível quebra o typecheck. As 19 ações sensíveis (18 antigas mais
  `user.create`) e as 7 informativas batem com o corte da spec.
- O nível nunca vem do chamador: `buildAuditEvent` e `recordImpersonationSession` derivam de
  `auditLevelOf(action)`. A borda (`audit.schema.ts`) só aceita `level` como filtro de leitura, validado com
  `z.enum(AuditLevel)`.
- `expiresAt` só nos `info`: `auditExpiresAtFor` devolve `null` para `sensitive`, e `withExpiry` só acrescenta
  o campo quando há data. `BaseRepository.create` não passa pelo `toPersistence` do mapper, então o campo
  chega ao Firestore como `Date` (que vira `Timestamp`) sem entrar no DTO.
- Modo degradado: `GET /audit-events` responde `503 PAGINATION_INDEX_MISSING` por `isMissingIndexError`, e o
  `error.code` já tem `apiErrors` nos 3 idiomas. Os dois índices novos cobrem `level` sozinho, `level` com
  período e `level` com usuário. O arquivo declara 11 índices, o número que o `PRE-PRODUCTION.md` cita.
- Mapper: `level` ausente ou desconhecido vira `sensitive`, e `toPersistence` inclui `level` na whitelist.
- Autorização: `GET /audit-events` e `POST /users` seguem em `requireAdminApi`; o onboarding segue em
  `requireCommonPanelApi`, que já recusa escrita personificada. A confirmação de e-mail é pública e tira o
  titular da resposta do provedor, nunca do corpo da requisição.
- Gravação nunca derruba a ação: `recordAuditEvent`, `recordAuditEventOnce` e
  `recordAccountLifecycleEvent` engolem a falha no log, e `resolveUserAuditLabel` não lança. O cadastro não
  apaga a conta por causa da trilha.
- Idempotência do webhook: só grava com `result === "applied"`, e o id `stripe_<event.id>_<action>` faz o
  `create()` recusar a segunda escrita (`ALREADY_EXISTS` → `false`).
- Desvio 2 do handoff (`past_due`/`unpaid` → `active` não é ativação): implementado em
  `subscription-audit.ts:25` e coerente com a regra de "uma vez por ocorrência".
- Front: nenhuma string solta (rótulos de nível, filtro e ações vêm de `auditTrail.ts`); `queryKeys` inclui
  o nível, e o prefetch RSC (`list()`) e o hook (`list(filters)`) geram a mesma chave sem filtro; "Limpar"
  reseta `level` para `auditLevelAll`. `Badge` `destructive`/`secondary` é a escolha do plano.
- i18n: as 8 ações novas, `levelLabels`, `columns.level`, `filters.levelLabel` e `filters.levelAll` existem em
  pt-br, en e es com a mesma estrutura.
- Nenhuma dependência nova: `apps/api/package.json` ganhou só o script `backfill-audit-levels`.
- Comentários: nenhum cita artefato do fluxo, etapa ou ID de card. Os que existem explicam regra de negócio
  (TTL, eventos antigos sensíveis, reentrega da Stripe).
- Corte de MVP da spec: os 7 itens estão implementados. O nível ficou fora da exportação LGPD
  (`account-export.ts` mantém a whitelist), o que o plano registrou como decisão em aberto.
- Documentação: o `ROPA.md` §7 afirma que os informativos perdem os rótulos na exclusão da conta. Isso
  confere, porque eles carregam `involvedUserIds` com o id do titular, e é esse campo que
  `anonymizeUserLabels` percorre.

## Correções aplicadas

Nenhuma no código. Os achados acima ou dependem de medição (lista abaixo) ou mudariam comportamento sem
ganho claro no corte do MVP. A única mudança desta etapa no repositório é a branch.

## Raio de impacto

- `AuditEventDTO.level` é obrigatório. Consumidores: `audit-event.mapper.ts`, `audit-recorder.ts`,
  `audit-event.repository.ts`, `account-export.ts` (whitelist, não repassa `level`), `AuditListClient.tsx` e
  `useListAuditEvents.tsx`. Os 4 workspaces compilam.
- `AuditEventListQuery.level` é opcional; o SDK só o envia quando há valor.
- `AuditAction` ganhou 8 valores. O único `Record` exaustivo sobre o enum fora do i18n é
  `AUDIT_ACTION_LEVEL`; o mapa de rótulos do front também é verificado pelo typecheck.
- `createDefaultUserProfile` ganhou um terceiro parâmetro opcional. Chamadores: `auth/sign-up/route.ts`
  (passa `requestId`) e `findOrCreateProfile` (não passa).
- `readPrevious`, `ACTIVE` e `PAYMENT_PENDING` passaram a ser exportados; o novo campo `priceId` de
  `readPrevious` não é lido pelas notificações.
- `firestore.indexes.json`: dois índices novos de `auditEvent`, que precisam ser publicados em cada projeto
  (`PRE-PRODUCTION.md` §1.11).

## 👁 Verificar no `/test`

Em ordem de risco. A primeira sustenta um dos eventos do corte e é a única que pode falhar em silêncio.

1. **`localId` na resposta de `accounts:update` com `oobCode`.** Repro: cadastrar
   `qa-audit-levels@example.com` no emulador, pegar o código em
   `http://127.0.0.1:9099/emulator/v1/projects/<id>/oobCodes`, chamar `POST /auth/email-verification/confirm`
   e conferir em `/admin/audit` um "E-mail confirmado" com autor e alvo iguais ao titular. No log da API não
   pode aparecer `[audit] subject-not-found`. O emulador não prova o comportamento do Identity Toolkit real;
   se não houver projeto real, o critério fica 🔒 para produção.
2. **`expiresAt` gravado como `Timestamp`.** Repro: depois do cadastro do item 1, ler no emulador o documento
   `account.signUp` de `auditEvent` e conferir `expiresAt` cerca de 365 dias depois de `createdAt`; num
   evento sensível (por exemplo `user.create`, item 5) o campo não existe. Nenhum teste automatizado lê o
   documento gravado.
3. **Backfill de nível.** Repro: gravar à mão no emulador um `auditEvent` sem `level`; em `/admin/audit` ele
   aparece como "Sensível" em "Todos os níveis" e some no filtro "Sensível"; rodar
   `pnpm --filter api backfill-audit-levels` (dry-run conta 1), depois `--apply`, depois o dry-run de novo
   (conta 0); o filtro "Sensível" passa a mostrá-lo. O laço de paginação e o `batch.commit` não têm teste.
4. **Filtro combinado e "Limpar".** Repro: na aba Network, aplicar nível, usuário e período juntos; a
   requisição leva `level`, `userId`, `from` e `to`. "Limpar" volta para "Todos os níveis" e a requisição
   seguinte não leva `level`.
5. **`user.create`.** Repro: criar usuário em `/admin/users`; aparece "Usuário criado pelo admin", nível
   "Sensível", autor = admin, alvo = e-mail criado.
6. **Cadastro e onboarding.** Repro: cadastro por senha gera um "Cadastro" informativo com autor = alvo;
   concluir o onboarding gera um "Onboarding concluído", e clicar duas vezes no último passo não gera um
   segundo. Abrir o último passo em duas abas e concluir nas duas mede a corrida citada em 🟡.
7. **Layout.** `/admin/audit` como admin, nos 3 idiomas, light, dark e mobile: badge legível nos dois temas;
   grade de 4 filtros em 4, 2 e 1 coluna, sem rolagem horizontal.
8. 🔒 sem infra: 503 por índice ausente em projeto real (provado só por `auditEventsRoute.test.ts`), TTL
   apagando de fato (Blaze) e eventos de assinatura no navegador (Stripe em modo teste). A lógica de
   assinatura está coberta por `subscriptionAudit.test.ts` e `paymentsWebhookRoute.test.ts`, que o `/test`
   roda.

## Lacunas de teste

- Nenhum teste lê `expiresAt` no documento gravado: **continua aberta**. O item 2 da lista acima a mede no
  emulador; um teste automatizado seria do tipo emulador e, pela §6 do checklist, só se justifica se o
  `/test` encontrar divergência.
- Laço de paginação e `batch.commit` do backfill sem teste: **continua aberta**. O item 3 mede uma vez; um
  script operacional de execução única não pede mais que isso.
- Corrida de duas abas no onboarding: aberta na rodada 1, **fechada na rodada 2** (ver a seção da rodada 2).

## Decisões em aberto

Herdadas do plano e do handoff, sem resposta nesta etapa (decisão de produto, não de revisão):

- prazo de 12 meses dos eventos `info` (`AUDIT_INFO_RETENTION_DAYS`);
- E5, o prazo dos eventos sensíveis;
- `trialing` → `active` não conta como ativação (hoje não conta);
- nível fora da exportação LGPD.

Nova desta revisão:

- **Onboarding com `onceKey` por perfil.** Recomendação da rodada 1: não adotar. Resolvida na rodada 2 por
  outro caminho: a transação em `advanceOnboarding` impede a segunda conclusão sem fixar uma chave.

## Gates estáticos

| gate | comando | resultado |
|------|---------|-----------|
| typecheck | `pnpm turbo run typecheck --filter=api --filter=app --filter=@repo/sdk --filter=@repo/internationalization` | 4/4 ok, 4 de cache (mesmas entradas do handoff) |
| lint | `pnpm check` | 1166 arquivos, nenhuma correção |
| paridade i18n | `pnpm turbo run test --filter=@repo/internationalization` | 7 arquivos, 67 testes ok, de cache |

Testes de `api` e `app` não rodaram aqui. O handoff registra 1962 testes na `api` e 1403 no `app`, e o
`/test` remede.

## Rodada 2: corrida de duas abas no onboarding

O `/test` mediu a corrida que a rodada 1 deixou em 🟡: duas requisições concorrentes no passo `preferences`
responderam 200, gravaram `completedAt` diferentes (`…19.763Z` e `…19.765Z`) e criaram dois
`account.onboarding.complete`. O defeito vai além da linha duplicada na trilha: a segunda escrita
sobrescreve o `completedAt` da primeira.

**Causa.** A rota decidia a transição sobre `ctx.subjectProfile.onboarding`, o snapshot que o guard leu,
e gravava com `userRepository.update`. As duas requisições liam `completedAt: null`, as duas avançavam e
as duas gravavam o evento.

**Correção.** A decisão e a escrita passaram a rodar na mesma transação do Firestore, no mesmo formato de
`applySubscriptionState` e `applyEntitlementsState`:

- `apps/api/(shared)/repositories/user.repository.ts:143`: `advanceOnboarding(id, decide)` lê o perfil
  dentro de `runTransaction`, chama `decide` sobre o valor gravado e só escreve quando a transição é
  `advanced`. Devolve `null` quando o perfil não existe. `decide` pode rodar mais de uma vez se o Firestore
  repetir a transação, e `advanceOnboardingState` é pura, então repetir não muda o resultado.
- `apps/api/app/(routes)/account/onboarding/route.ts:28-39`: a rota passa `advanceOnboardingState` como
  `decide` e responde `ONBOARDING_UPDATE_FAILED` (500) quando a transação falha ou devolve `null`. A
  requisição que perde a corrida recebe `unchanged` e responde 200 com o estado gravado pela vencedora.
- `route.ts:58`: o evento só é gravado quando a transição desta requisição concluiu o fluxo. Quem perdeu
  não grava nada.
- `route.ts:30`: a revisão renomeou o parâmetro do callback de `stored` para `current`. O `pnpm check`
  falhava com `lint/nursery/noShadow`, porque `stored` também é desestruturado do resultado na linha 41.

A decisão em aberto da rodada 1 (`onceKey` por perfil) deixa de ser necessária. A transação impede a
segunda conclusão sem fixar uma chave, então um fork que reabra o onboarding continua gravando um evento
por conclusão.

**Testes.**

- `apps/api/__tests__/accountOnboardingRoute.test.ts`: 8 casos novos, com o repositório trocado por um
  fake que aplica `decide` sobre um valor em memória. Cobrem evento na conclusão (completa e pulada),
  nenhum evento em passo intermediário, repetição, passo recusado, falha de escrita, outra aba que concluiu
  antes e perfil que sumiu no meio da requisição.
- `apps/api/__tests__/onboardingAdvance.emulator.test.ts` (novo): duas chamadas concorrentes de
  `advanceOnboarding` contra o emulador do Firestore. Exatamente uma avança e a outra vê `unchanged`; o
  `completedAt` persistido é o da vencedora, e é esse valor que a perdedora leu.

**Por que um teste de emulador.** Pela §6 do checklist, emulador só se justifica quando a infraestrutura é
o objeto do teste, e aqui é: o que está sendo provado é o isolamento da transação do Firestore. O fake da
suíte unitária executa as duas chamadas uma depois da outra e passaria com ou sem transação. Para conferir
que o teste de emulador detecta o defeito, a revisão rodou uma vez um teste temporário com a mesma
corrida, lendo e escrevendo fora da transação: as duas chamadas devolveram `advanced,advanced` e a
asserção de "uma só avança" falhou. Com a transação, o mesmo cenário passou. O arquivo temporário foi
apagado logo depois e não está no diff.

**Medição (2026-11-27, com cache, sem `--force`).**

| gate | comando | resultado |
|------|---------|-----------|
| testes da api | `pnpm --filter api test` | 135 arquivos, 1964 testes ok |
| rota do onboarding (após o rename) | `vitest run __tests__/accountOnboardingRoute.test.ts` | 20 testes ok |
| emulador | `pnpm --filter api test:emulator` (JDK 21) | 12 arquivos, 283 testes ok, 26,3 s; `onboardingAdvance` 2 testes ok |
| prova de mutação | teste temporário sem transação, via `firebase emulators:exec` | falhou como esperado (`advanced,advanced`) |
| typecheck | `pnpm turbo run typecheck --filter=api` | ok |
| lint | `pnpm check` | 1167 arquivos, nenhum erro após o rename |

O `test:emulator` sobe e derruba os emuladores com `firebase emulators:exec`. Depois das duas execuções,
nenhum processo ficou escutando em 8080 ou 9199.

**Verificar no `/test` (remedir).** Repetir o repro do item 6: duas requisições concorrentes no passo
`preferences` com o mesmo token. Esperado: as duas respondem 200 com o mesmo `completedAt`, há um único
`account.onboarding.complete` em `/admin/audit`, e o `completedAt` gravado no documento é o que as duas
respostas devolveram. Repetir também o duplo clique e o envio sequencial depois da conclusão (200, nada
gravado).

**Lacuna "corrida de duas abas no onboarding": fechada nesta rodada**, coberta pelo teste de emulador e
pelos 8 casos de rota. O `/test` ainda remede o fluxo pela API.

## Plano de commits

Antes do primeiro commit, o índice tem os dois `git mv` da auditoria do backlog. Eles pertencem ao commit
13 e saem do índice antes do commit 1:

```bash
git restore --staged specs/features/admin-own-account.md specs/features/app-form-layout-centered.md \
  docs/features/admin-own-account/spec.md docs/features/app-form-layout-centered/spec.md
git diff --cached --stat   # tem de sair vazio
```

No commit 13, `git add -A` sobre os quatro caminhos refaz o rename.

1. `feat(sdk): add audit levels and lifecycle audit actions`
   `packages/sdk/src/types/audit/audit.ts`, `packages/sdk/src/actions/audit/action.ts`
2. `feat(api): derive audit level from the action and expire info events`
   `apps/api/(shared)/lib/audit-level.ts`, `apps/api/(shared)/lib/audit-recorder.ts`,
   `apps/api/(shared)/mappers/audit-event.mapper.ts`, `apps/api/(shared)/repositories/audit-event.repository.ts`,
   `apps/api/__tests__/auditLevel.test.ts`, `apps/api/__tests__/auditRecorder.test.ts`,
   `apps/api/__tests__/auditEventMapper.test.ts`, `apps/api/__tests__/auditEventRepository.test.ts`
3. `feat(api): filter audit events by level`
   `apps/api/(shared)/validation/audit.schema.ts`, `apps/api/app/(routes)/audit-events/route.ts`,
   `firestore.indexes.json`, `apps/api/__tests__/auditListQuery.test.ts`,
   `apps/api/__tests__/auditEventsRoute.test.ts`, `apps/api/__tests__/firestoreIndexes.test.ts`
4. `feat(api): record sign-up and email verification audit events`
   `apps/api/(shared)/lib/user-merge.ts`, `apps/api/app/(routes)/auth/sign-up/route.ts`,
   `apps/api/app/(routes)/auth/email-verification/confirm/route.ts`, `apps/api/__tests__/signUpProfile.test.ts`,
   `apps/api/__tests__/userMergeArchivedProfile.test.ts`, `apps/api/__tests__/googleSignInProfile.test.ts`,
   `apps/api/__tests__/welcomeNotification.test.ts`, `apps/api/__tests__/authEmailVerification.test.ts`
5. `feat(api): advance onboarding in a transaction and audit its completion once`
   `apps/api/(shared)/repositories/user.repository.ts`, `apps/api/app/(routes)/account/onboarding/route.ts`,
   `apps/api/__tests__/accountOnboardingRoute.test.ts`, `apps/api/__tests__/onboardingAdvance.emulator.test.ts`
6. `feat(api): record subscription lifecycle audit events`
   `apps/api/(shared)/lib/subscription-audit.ts`, `apps/api/(shared)/lib/subscription-notifications.ts`,
   `apps/api/app/(routes)/webhooks/payments/route.ts`, `apps/api/__tests__/subscriptionAudit.test.ts`,
   `apps/api/__tests__/paymentsWebhookRoute.test.ts`
7. `feat(api): audit user creation by an admin`
   `apps/api/app/(routes)/users/route.ts`, `apps/api/__tests__/usersRoute.test.ts`
8. `feat(api): add audit level backfill script`
   `apps/api/scripts/backfill-audit-levels.mjs`, `apps/api/scripts/auditLevelPatch.mjs`,
   `apps/api/package.json`, `apps/api/__tests__/auditLevelBackfill.test.ts`
9. `feat(app): key the audit list cache by level`
   `apps/app/shared/lib/queryKeys.ts`, `apps/app/__tests__/useListAuditEvents.test.tsx`
10. `feat(app): add audit level column and filter`
   `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/audit/(components)/AuditFilters.tsx`,
   `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/audit/(pages)/(home)/AuditListClient.tsx`,
   `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/audit/(validations)/auditFiltersSchema.ts`,
   `apps/app/__tests__/auditFilters.test.tsx`, `apps/app/__tests__/auditFiltersSchema.test.ts`,
   `apps/app/__tests__/auditListFiltersSurvive.test.tsx`
11. `feat(internationalization): add audit level and lifecycle action labels`
    `packages/internationalization/translations/apps/app/pages/admin/auditTrail.ts`
12. `docs: document audit level indexes, backfill and info event retention`
    `docs/PRE-PRODUCTION.md`, `docs/ROPA.md`
13. `docs(specs): sync backlog with delivered specs`
    `specs/features/admin-own-account.md` → `docs/features/admin-own-account/spec.md`,
    `specs/features/app-form-layout-centered.md` → `docs/features/app-form-layout-centered/spec.md`,
    `docs/features/app-internal-ux-polish/spec.md`, `specs/BACKLOG.md`,
    `specs/features/account-security-mfa.md`, `specs/features/audit-log-levels.md`,
    `specs/reference/AUDIT.md`
14. `docs(features): audit-log-levels`
    `docs/features/audit-log-levels/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
    `review/review.md`, `test/criterios-aceite.md`, `test/report.md`)

Varredura de segredo nos commits 12 a 14: nenhuma senha, token, chave ou e-mail real. As ocorrências de
`whsec_`, `sk_live_` e `sk_test_` no `PRE-PRODUCTION.md` são prefixos de exemplo que já existiam no arquivo.

Título de PR sugerido: `feat: audit log levels (sensitive and info)`.

### Commits realizados

(preenchido pelo orquestrador do `/review`)
