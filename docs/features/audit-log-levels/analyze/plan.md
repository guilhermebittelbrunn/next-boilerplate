# Plano — Níveis na trilha de auditoria (sensível e informativo)

- **Spec de origem:** [`specs/features/audit-log-levels.md`](../../../../specs/features/audit-log-levels.md) (status `approved`, revisada em 2026-11-26)
- **Rodada:** `/cycle` autônomo, sem acompanhamento do usuário. As perguntas 2, 3 e 4 da spec não tinham
  resposta; o plano adota a recomendação da própria spec em cada uma (ver "Decisões adotadas").
- **Escopo:** `packages/sdk` → `apps/api` → `apps/app` → `packages/internationalization`, mais
  `firestore.indexes.json`, um script de backfill e documentação (`PRE-PRODUCTION.md`, `ROPA.md`).

---

## Etapa 1 — Análise

### 1. Contexto, objetivo e corte

A trilha (`auditEvent`) hoje só registra 18 ações sensíveis (`packages/sdk/src/types/audit/audit.ts:2-21`).
O admin não tem onde consultar quando uma conta foi criada, assinou, trocou de plano ou cancelou. A spec pede
duas coisas juntas: eventos `info` de ciclo de vida da conta e um nível que os separe das ações sensíveis,
filtrável na tela `/admin/audit`.

**Corte de MVP (da spec, sem alteração):**

1. Todo evento tem `level` (`sensitive` | `info`), derivado da ação no servidor e nunca do chamador. As 18
   ações atuais são `sensitive`.
2. Registro antigo, sem o campo, aparece como `sensitive` na tela e no filtro (mapper + backfill).
3. Criação de usuário pelo admin gera evento `sensitive` (`user.create`).
4. Eventos `info` nos pontos únicos do servidor: cadastro, e-mail confirmado, onboarding concluído,
   assinatura ativada, troca de plano, cancelamento agendado e assinatura encerrada. Os de assinatura não se
   repetem quando a Stripe reentrega o evento.
5. Coluna de nível e filtro por nível (todos, sensível, informativo) na listagem, combinável com usuário e
   período.
6. Eventos `info` gravam `expiresAt` (12 meses); `sensitive` não. `PRE-PRODUCTION.md` documenta a TTL e o
   comportamento no plano Spark.
7. Rótulos de nível e das ações novas nos 3 idiomas.

**Fora do corte (fica fora):** login a cada sessão; checkout iniciado e outros sinais de intenção; eventos de
`entity`; motivo do cancelamento; exportar a trilha, alerta em tempo real e um terceiro nível; retenção
configurável pela tela. Também fora: incluir o nível no registro da exportação LGPD
(`apps/api/(shared)/lib/account-export.ts:87-97` exporta só `action`, `actorRole`, `createdAt`,
`requestId`), já que a spec não pede.

**Valor observável:** o admin abre `/admin/audit`, escolhe um usuário e "Informativo", e vê a história da
conta (cadastro → e-mail → onboarding → assinatura → troca → cancelamento) sem cruzar Stripe e banco.

### 2. Apps impactados e modo de produto

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | enum `AuditLevel`, 8 valores novos em `AuditAction`, `level` no `AuditEventDTO` e no `AuditEventListQuery`, parâmetro `level` na action `audit.list` |
| `apps/api` | mapa ação → nível, `level`/`expiresAt` gravados no recorder, 8 pontos de gravação, filtro por nível no schema/repositório, script de backfill |
| `apps/app` | coluna "Nível" com `Badge`, select de nível no filtro, `queryKeys` com o nível |
| `apps/web` | N/A |
| `packages/internationalization` | `levelLabels`, `columns.level`, filtro de nível e 8 `actionLabels` nos 3 idiomas |
| Infra | 2 índices compostos novos; TTL opcional (Blaze); backfill único em base com dado |

- Área do painel: **admin** (a tela já usa `requireAdminApi`, `apps/api/app/(routes)/audit-events/route.ts:10`).
- Modo de produto: os eventos de assinatura só existem em `subscription` (webhook da Stripe). Em `simple`, o
  webhook nem recebe evento e nada muda; os demais eventos valem nos dois modos.
- Nenhuma dependência nova, nenhum serviço pago. A TTL é recurso nativo do Firestore e fica opcional.

### 3. Dados (Firestore)

**Coleção `auditEvent` — campos novos**

| campo | tipo | default | `null`? | justificativa |
|-------|------|---------|---------|---------------|
| `level` | `"sensitive" \| "info"` | derivado da ação no recorder | não (ausente só em documento antigo) | filtro por igualdade; o Firestore não casa documento sem o campo, por isso o backfill |
| `expiresAt` | `Timestamp` | `createdAt + 365 dias` só em `info` | ausente em `sensitive` | campo da TTL policy; precisa ser `Timestamp` (não string ISO, como `windowEndsAt`) para a TTL agir |

- `expiresAt` **não entra no DTO**: é campo de persistência, como em `notification`
  (`apps/api/(shared)/repositories/notification.repository.ts:27-33`, `lib/notifications.ts:8`, `:30-31`).
  Entrar no DTO exigiria string ISO e a TTL ignora string.
- Ownership: não há `userId` de dono; o escopo de leitura é "só admin". `involvedUserIds` continua sendo o
  que o filtro por usuário usa (`audit-recorder.ts:52-54`).
- Soft delete: não se aplica (somente adição, `audit-event.repository.ts:70-73`, `:226-240`).
- **Consultas novas** (todas em `listPage`, `audit-event.repository.ts:203-224`, ordenadas por
  `createdAt desc` + `__name__ desc` em `base.repository.ts:99-105`):

| filtro | índice |
|--------|--------|
| `level ==` (± período) | **novo**: `level ASC, createdAt DESC` |
| `involvedUserIds array-contains` + `level ==` (± período) | **novo**: `involvedUserIds CONTAINS, level ASC, createdAt DESC` |
| sem nível | existentes, sem mudança |

- **Limite do `BaseRepository`:** a listagem já usa `paginate` com cursor; não há filtro em memória. O
  volume dos eventos `info` é baixo (poucas ocorrências por conta), longe da cota de 20.000 escritas/dia
  citada na spec.
- **Dado existente:** todo documento antigo é sensível por construção (só existiam ações sensíveis). Mapper
  lê ausência como `sensitive`; o script `backfill-audit-levels` grava `level: "sensitive"` onde falta, para
  o filtro "Sensível" encontrar esses documentos.

### 4. Contrato `@repo/sdk`

Arquivo único: `packages/sdk/src/types/audit/audit.ts`, mais a action
`packages/sdk/src/actions/audit/action.ts:24-30`.

- Novo `enum AuditLevel { SENSITIVE = "sensitive", INFO = "info" }`.
- `AuditAction` ganha 8 valores (seção 10.1).
- `AuditEventDTO.level: AuditLevel` (obrigatório).
- `AuditEventListQuery.level?: AuditLevel`.
- `AuditTargetType` **não muda**: os eventos de assinatura usam `ACCOUNT` (a tela não exibe o tipo de alvo,
  `AuditListClient.tsx:42-75`, e `ACCOUNT` já é o tipo das ações do titular, ex.
  `account/password/route.ts:72-81`). A spec dizia "possivelmente um tipo de alvo para assinatura"; menor
  raio de impacto venceu.
- Quem quebra: só consumidores que constroem `AuditEventDTO` literal (testes de API/app e o mock do mapper).
  Contexto `admin`.

### 5. API

**5.1 Nível derivado da ação.** Novo `apps/api/(shared)/lib/audit-level.ts` com
`AUDIT_ACTION_LEVEL: Record<AuditAction, AuditLevel>` e `auditLevelOf(action)`. O `Record` sobre o enum faz o
`typecheck` falhar quando alguém acrescenta ação sem nível. O chamador não informa nível:
`AuditEventInput` (`audit-recorder.ts:17-28`) não ganha campo de nível.

**5.2 Recorder.** `recordAuditEvent` (`audit-recorder.ts:91-120`) passa a gravar `level` e, quando `info`,
`expiresAt`. `recordImpersonationSession` (`:122-170`) grava `level: sensitive`. Dois acréscimos:

- `recordAuditEventOnce(key, input)`: mesma montagem, gravada por `appendOnce` (`audit-event.repository.ts:88-109`).
  Usada pelo webhook com chave `stripe_<event.id>_<action>`.
- `recordAccountLifecycleEvent({ action, profileId, uid, label?, requestId, onceKey? })`: monta o evento do
  titular sobre a própria conta (ator = alvo = titular, `targetType: ACCOUNT`), resolvendo o rótulo por
  `resolveUserAuditLabel(uid)` (`audit-label.ts:8-17`) quando o chamador não o tem. Nunca lança.

Fica um comentário curto perto do mapa de níveis com a regra da spec: evento `info` é fato consumado,
gravado uma vez por ocorrência, nunca por requisição (risco de volume apontado na spec).

**5.3 Repositório.** `append(data, { expiresAt })` e `appendOnce(id, data, { expiresAt })` aceitam o
`expiresAt` opcional fora do DTO e só o escrevem quando presente. `AuditEventFilters` ganha `level?`;
`listPage` acrescenta `where("level", "==", level)`.

**5.4 Mapper.** `audit-event.mapper.ts:24-51`: `level: record.level === "info" ? INFO : SENSITIVE`
(ausente ou valor desconhecido lê como sensível). `toPersistence` (`:53-77`) inclui `level`.

**5.5 Validação na borda.** `apps/api/(shared)/validation/audit.schema.ts:27-36` ganha
`level: z.enum(AuditLevel).optional()`; `:55-59` lê `params.get("level") || undefined`; `AuditListQuery`
(`:38-44`) e o retorno (`:73-85`) carregam `level`. Valor fora do enum → `400 VALIDATION_FAILED`.

**5.6 Rota.** `audit-events/route.ts:16-22` repassa `level` ao repositório. Sem verbo novo, sem guard novo.

**5.7 Pontos de gravação (ator definido pela pergunta 4 da spec)**

| ação | nível | onde | ator / alvo | idempotência |
|------|-------|------|-------------|--------------|
| `user.create` | sensitive | `users/route.ts:73-99`, depois do perfil criado | ator = `ctx.actorProfile` (admin), alvo = perfil criado, `targetLabel = input.email` | uma requisição, um evento |
| `account.signUp` | info | `createDefaultUserProfile` (`user-merge.ts:79-103`), logo depois de `userRepository.create` | titular; `requestId` do `sign-up/route.ts:55` (novo parâmetro opcional) e `null` no primeiro contato Google/link (`user-merge.ts:56-71`) | o perfil é criado uma vez por uid |
| `account.email.verify` | info | `auth/email-verification/confirm/route.ts`, depois de `identityApplyOobCode` (`:49`) | titular resolvido por `checked.email` → `getUserByEmail` → `findByReferenceId`; não achou → `logEvent("audit","subject-not-found")` e não grava | o `oobCode` é de uso único |
| `account.onboarding.complete` | info | `account/onboarding/route.ts:48-58`, depois do `update`, só quando `transition.state.completedAt !== null` | `ctx.subjectProfile` (impersonação já é recusada em escrita, `impersonation-read-only.ts:20-31`) | `advanceOnboardingState` devolve `unchanged` depois da conclusão (`onboarding.ts:77-78`) |
| `subscription.activate` | info | webhook, `reconcileSubscription` (`webhooks/payments/route.ts:94-119`) quando `result === "applied"` | dono da assinatura (`findSubscriptionOwner`, `:61-82`); sem dono → já loga `webhook-profile-not-found` (`:121`) e não grava | `applied` + `appendOnce` com `stripe_<event.id>_<action>` |
| `subscription.plan.change` | info | idem | idem | idem |
| `subscription.cancellation.schedule` | info | idem | idem | idem |
| `subscription.end` | info | idem | idem | idem |

**Transições de assinatura.** Função pura nova `subscriptionAuditActionsFor(stored, next): AuditAction[]` em
`apps/api/(shared)/lib/subscription-audit.ts`, lendo o snapshot anterior como
`subscription-notifications.ts:19-34` faz (snapshot de outra assinatura lê como ausente), acrescido de
`priceId`:

- `activate`: `next.status` ∈ {`active`,`trialing`} e anterior ausente ou fora desse conjunto.
- `plan.change`: anterior e próximo ativos e `previous.priceId !== next.priceId`, ambos não nulos.
- `cancellation.schedule`: `next.cancelAtPeriodEnd` e não `previous.cancelAtPeriodEnd`, com `next.status`
  diferente de `canceled`.
- `end`: `next.status === "canceled"` com anterior presente e diferente de `canceled` (mesma regra da
  notificação `subscriptionCanceled`, `subscription-notifications.ts:58-60`).

Para não duplicar o leitor, `readPrevious` passa a ser exportado e a ler `priceId`; o comportamento de
`subscriptionNotificationFor` não muda (o teste `subscriptionNotifications.test.ts` continua valendo).

**5.8 Erros.** Nenhum `error.code` novo. A listagem reusa `VALIDATION_FAILED` (400),
`PAGINATION_CURSOR_INVALID` (400) e `PAGINATION_INDEX_MISSING` (503), já traduzidos. Nenhuma gravação da
trilha altera status de resposta das rotas instrumentadas (fail-open, `audit-recorder.ts:85-90`).

### 6. Front (`apps/app`)

Tela existente: `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/audit/`.

- `AuditListClient.tsx:42-75`: coluna `level` depois de "Ação", com `Badge`
  (`@repo/design-system/components/ui/badge`, mesmo uso de `OrganizationMembersTable.tsx:74-78`):
  `sensitive` → `variant="destructive"`, `info` → `variant="secondary"`. Texto de `levelLabels`.
- `(validations)/auditFiltersSchema.ts:9-19`: `level: string` com sentinela `auditLevelAll = "__all__"`,
  default "todos" (pergunta 5 da spec).
- `(components)/AuditFilters.tsx`: `HookFormSelect` de nível (sem `searchable`, 3 opções); `toQueryFilters`
  (`:29-35`) omite o nível quando é a sentinela; grade de `md:grid-cols-3` (`:74`) para
  `md:grid-cols-2 lg:grid-cols-4`. "Limpar" já reseta para os defaults (`:95-98`).
- `shared/lib/queryKeys.ts:22-33`: `list` inclui `filters?.level ?? "all"` (a chave já documenta que cada
  combinação é uma consulta).
- Estados: vazio ("Nenhum evento registrado."), erro 503 com filtros preservados (comportamento já existente,
  `AuditListClient.tsx:85-93`), carregando. Nada novo de prefetch RSC.

### 7. i18n

Arquivo: `packages/internationalization/translations/apps/app/pages/admin/auditTrail.ts`, nos 3 idiomas
(árvore em 10.6). Nenhuma entrada em `apiErrors`.

### 8. Autorização, segurança e LGPD

- Leitura continua `requireAdminApi`. Admin personificando no painel comum não chega a `/admin/audit`.
- Nível derivado no servidor: o cliente não tem como gravar evento nem escolher nível.
- `email-verification/confirm` é rota pública. O evento só é gravado depois de o Identity Toolkit aceitar o
  código, e o titular vem do e-mail que o código confirma, não de input do cliente. Falha na resolução não
  muda a resposta.
- Webhook: gravação só depois da assinatura Stripe validada (`webhooks/payments/route.ts:284-298`).
- Exclusão de conta: `anonymizeUserLabels` (`audit-event.repository.ts:149-201`) varre por
  `involvedUserIds`, então limpa os rótulos dos eventos `info` do titular (ator = alvo). Sem mudança.
- Exportação do titular: os eventos `info` entram na lista (teto 5.000, `account-export.ts:26`).
- `ROPA.md` §7 precisa citar a nova finalidade (histórico de ciclo de vida da conta) e o prazo de 12 meses
  dos eventos `info`.

### 9. Retenção: pergunta 3 da spec × E5

A spec recomenda `info` com vencimento de 12 meses e `sensitive` sem vencimento. A auditoria apontou que isso
encosta na **E5** (prazo de retenção da coleção `auditEvent`, decisão do usuário, estacionada em
`specs/reference/AUDIT.md:500` e `docs/PRE-PRODUCTION.md` §1.3).

Tratamento adotado:

- **A E5 continua aberta para os eventos sensíveis.** Este plano não fixa prazo para eles: nada muda nos
  documentos `sensitive` (sem `expiresAt`) e o texto de §1.3 sobre eles fica como está.
- **Os eventos `info` ganham prazo próprio de 12 meses** numa constante (`AUDIT_INFO_RETENTION_DAYS = 365`
  em `audit-level.ts`), ajustável por fork. É a recomendação da spec, e não decide a E5: a categoria `info`
  nasce com esta entrega e não existia quando a E5 foi aberta.
- **Gravar `expiresAt` não apaga nada sozinho.** Só a TTL policy do Firestore apaga, e ela exige faturamento
  (Blaze) e um comando manual. Sem ela, o campo fica inerte e os eventos `info` ficam até a exclusão da
  conta, como os demais. Esse é o modo degradado.
- A TTL policy é por campo: ligada em `auditEvent.expiresAt`, ela ignora documento sem o campo. Os sensíveis
  ficam fora mesmo com a policy ativa.
- A TTL apaga pelo servidor, fora do repositório. A afirmação "nenhuma rota edita nem apaga evento" continua
  verdadeira; o `PRE-PRODUCTION.md` passa a dizer que a TTL, quando ligada, apaga eventos `info` vencidos.

O prazo de 12 meses vai para "Perguntas em aberto" como confirmação, junto da E5.

### 10. Testes (Vitest, nível mais barato)

| teste | nível | prova |
|-------|-------|-------|
| `auditLevel.test.ts` (novo) | unit | as 18 ações antigas e `user.create` são `sensitive`; as 7 novas de ciclo de vida são `info`; `expiresAt` = `createdAt + 365 d` só em `info` |
| `auditEventMapper.test.ts` (estende) | unit | `level` ausente/desconhecido → `sensitive`; `info` preservado; `toPersistence` inclui `level` |
| `auditRecorder.test.ts` (estende) | unit, mock do repo | `recordAuditEvent` grava `level` e `expiresAt` conforme a ação; `recordAuditEventOnce` usa `appendOnce`; `recordAccountLifecycleEvent` monta ator = alvo, nunca lança |
| `auditListQuery.test.ts` (estende) | unit | `level=info` aceito; `level=critical` → `VALIDATION_FAILED` |
| `auditEventRepository.test.ts` (estende) | unit, mock de query | `listPage` acrescenta `where("level","==",…)` combinado com usuário e período |
| `auditEventsRoute.test.ts` (estende) | rota, mock repo + guard | `level` repassado; 503 `PAGINATION_INDEX_MISSING` continua com filtro de nível |
| `subscriptionAudit.test.ts` (novo) | unit | cada transição; anterior de outra assinatura; reentrega idêntica não gera ação; `trialing` conta como ativa |
| `paymentsWebhookRoute.test.ts` (estende) | rota | `applied` grava com chave `stripe_<event.id>_<action>`; `skipped` não grava; sem dono não grava |
| `signUpProfile.test.ts` / `userMergeArchivedProfile.test.ts` (estende) | unit | `createDefaultUserProfile` grava `account.signUp` com o `requestId` recebido; perfil arquivado não grava |
| `authEmailVerification.test.ts` (estende) | rota | sucesso grava `account.email.verify` do titular; e-mail sem perfil não grava e loga; falha do Toolkit não grava |
| `accountOnboardingRoute.test.ts` (estende) | rota | só a transição que conclui grava; passo intermediário e `unchanged` não gravam |
| `usersAdminAuditTrail.test.ts` (estende) | rota | `POST /users` grava `user.create` com ator admin; falha na criação do perfil não grava |
| `firestoreIndexes.test.ts` (estende) | estático | as duas entradas novas de `auditEvent` estão declaradas |
| `auditFilters.test.tsx` / `auditFiltersSchema.test.ts` / `useListAuditEvents.test.tsx` (estende) | componente / hook | select de nível, sentinela omitida, `level` na `queryKey` e na chamada do SDK |
| `backfillAuditLevels` | unit sobre `buildPatch` puro, se o script exportar a função | só documento sem `level` recebe patch; rodar duas vezes não muda nada |
| paridade i18n | existente | chaves novas nos 3 idiomas |

**Teste com emulador:** nenhum novo. O único comportamento de infra em jogo é o índice composto, e o emulador
não cobra índice; o teste estático sobre `firestore.indexes.json` é a defesa possível localmente.

### 11. O que o `/test` vai percorrer

Ferramenta: `agent-browser`, uma passada, light + dark + mobile, pt-br/en/es, como admin.

1. **Cadastro** com e-mail novo (`qa-audit-levels-<n>@example.com`) → `/admin/audit` mostra "Cadastro"
   (pt-br) com nível "Informativo", ator e alvo iguais.
2. **E-mail confirmado:** pegar o `oobCode` no endpoint de códigos do Auth emulator, abrir o link de
   confirmação → evento "E-mail confirmado" informativo.
3. **Onboarding** concluído pelo mesmo usuário → um evento "Onboarding concluído"; refazer o último passo não
   gera segundo.
4. **Admin cria usuário** em `/admin/users` → "Usuário criado pelo admin" com nível "Sensível".
5. **Filtros:** "Sensível" mostra só sensíveis (incluindo os do seed/anteriores, depois de rodar
   `backfill-audit-levels --apply` no emulador); "Informativo" só os novos; usuário + nível + período
   combinados; "Limpar" volta a "Todos".
6. **Registro antigo sem `level`:** gravar um documento no emulador sem o campo → na listagem "Todos" ele
   aparece com "Sensível"; antes do backfill o filtro "Sensível" não o mostra, depois mostra.
7. **Tema e responsivo:** badge legível em light/dark; grade de 4 filtros quebra para 2 colunas e depois 1
   no mobile, sem rolagem horizontal da página.

🔒 **Não observável sem infra externa:** eventos de assinatura no navegador exigem Stripe em modo teste com
webhook encaminhado (`pnpm --filter api dev:with-stripe` + chaves). Se as chaves não estiverem no ambiente, o
critério é provado pelos testes unitários do webhook e marcado não verificado no navegador. A recusa por
índice ausente também é 🔒 (só projeto real). A TTL apagando de fato também é 🔒 (Blaze).

---

## Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Todo evento novo grava o nível derivado da ação**
  Cada documento gravado em `auditEvent` depois da entrega tem `level` igual a `sensitive` ou `info`,
  definido pelo mapa do servidor e nunca por parâmetro do chamador. As 18 ações anteriores e `user.create`
  gravam `sensitive`; as sete de ciclo de vida gravam `info`. Uma ação nova sem nível no mapa quebra o
  `typecheck`.

- [ ] **Registro antigo lê como sensível**
  Um documento sem `level` aparece na listagem "Todos" com o rótulo "Sensível" nos 3 idiomas. Antes do
  backfill ele não aparece no filtro "Sensível" (limitação conhecida do Firestore, documentada); depois de
  `pnpm --filter api backfill-audit-levels --apply` aparece. O script em modo padrão é dry-run, e rodá-lo duas
  vezes não altera nada na segunda.

- [ ] **Admin cria usuário e o evento é sensível**
  `POST /users` bem-sucedido grava `user.create` com ator = admin, alvo = perfil criado e rótulo do alvo = e-mail
  informado. Se a criação do perfil falhar (500 `USERS_PROFILE_CREATE_FAILED`), nenhum evento é gravado. A
  resposta da rota não muda em nenhum caso.

- [ ] **Cadastro grava um evento informativo, em qualquer método**
  Cadastro por senha e primeiro contato por Google ou link passam por `createDefaultUserProfile` e gravam um
  `account.signUp` cada, com ator e alvo iguais ao titular. O cadastro por senha leva o `requestId`; o primeiro
  contato por Google/link grava `requestId: null`. Conta com perfil arquivado não ganha perfil nem evento.

- [ ] **E-mail confirmado grava evento do titular**
  `POST /auth/email-verification/confirm` com código válido grava `account.email.verify` do dono do e-mail.
  Código inválido, expirado ou de outro tipo (`AUTH_OOB_CODE_INVALID`) não grava. Se o e-mail não tiver
  perfil, a confirmação responde normalmente, nada é gravado e o log estruturado registra o motivo sem dado
  pessoal.

- [ ] **Onboarding concluído grava uma vez**
  Só a transição que preenche `completedAt` grava `account.onboarding.complete`. Passos intermediários, pulo
  de passo pulável, `unchanged` e as recusas `ONBOARDING_STEP_OUT_OF_ORDER`/`ONBOARDING_STEP_NOT_SKIPPABLE`
  não gravam. Duplo clique no último passo gera um evento só, porque o segundo chega como `unchanged`.

- [ ] **Eventos de assinatura sem repetição**
  Com o webhook da Stripe, ativação, troca de plano, cancelamento agendado e encerramento gravam cada um o
  evento correspondente, com ator = dono do cliente Stripe. Reentrega do mesmo `event.id` responde
  `duplicate: true` ou cai em `skipped`, e em nenhum dos casos cria segundo documento (id determinístico
  `stripe_<event.id>_<action>`). Assinatura sem dono encontrado não grava evento e mantém o log
  `webhook-profile-not-found`. Renovação sem mudança de preço ou de status não grava nada.

- [ ] **Coluna de nível na listagem**
  A tabela de `/admin/audit` mostra a coluna "Nível" ("Level"/"Nivel") com badge distinto para sensível e
  informativo, legível em light e dark. No mobile a tabela mantém o comportamento atual de rolagem própria.

- [ ] **Filtro por nível combinável**
  O filtro tem "Todos", "Sensível" e "Informativo", com "Todos" como padrão. Combinado com usuário e período, a
  API recebe `level`, `userId`, `from` e `to` juntos e devolve só os eventos que casam em todos. Lista vazia
  mostra "Nenhum evento registrado.". "Limpar" volta para "Todos" e remove o nível da URL da consulta.

- [ ] **Validação do parâmetro na borda**
  `GET /audit-events?level=critical` (ou qualquer valor fora do enum) responde `400 VALIDATION_FAILED`, com a
  mensagem traduzida. `level=` vazio é tratado como ausente.

- [ ] **Autorização da listagem inalterada**
  Usuário comum e não autenticado continuam recusados em `GET /audit-events` como hoje. Nenhuma rota nova
  permite gravar, editar ou apagar evento.

- [ ] **Modo degradado sem índice publicado**
  Num projeto real sem os índices novos, filtrar por nível responde `503 PAGINATION_INDEX_MISSING` ("A
  listagem está indisponível no momento…") e mantém os filtros visíveis para desfazer. "Todos" sem usuário
  continua funcionando. Nunca 500. Não verificável no emulador (🔒).

- [ ] **Vencimento só nos eventos informativos**
  Evento `info` grava `expiresAt` como `Timestamp` 365 dias depois de `createdAt`; evento `sensitive` não tem
  o campo. Sem a TTL ligada, nada é apagado; com a TTL ligada (Blaze), só os `info` vencidos são removidos.
  A TTL de fato é 🔒.

- [ ] **Exclusão de conta anonimiza os informativos**
  Excluir a conta do titular limpa `actorLabel` e `targetLabel` dos eventos `info` dele junto dos sensíveis, e
  os eventos continuam na trilha com ação, instante e `requestId`.

- [ ] **Falha de gravação não derruba a ação**
  Se o Firestore recusar a gravação de qualquer evento novo, a rota responde o mesmo que responderia sem a
  trilha e o log `audit/write-failed` registra ação, `requestId`, motivo e status.

- [ ] **Textos nos 3 idiomas**
  Rótulos de nível, coluna, filtro e as 8 ações novas existem em pt-br, en e es, e o teste de paridade passa.
  Nenhuma ação aparece como chave crua na tabela.

---

## Etapa 2 — Blueprint técnico

### 10.1 Contrato (`packages/sdk/src/types/audit/audit.ts`)

```ts
export enum AuditLevel {
    SENSITIVE = "sensitive",
    INFO = "info",
}

export enum AuditAction {
    // ...18 existentes
    USER_CREATE = "user.create",
    ACCOUNT_SIGN_UP = "account.signUp",
    ACCOUNT_EMAIL_VERIFY = "account.email.verify",
    ACCOUNT_ONBOARDING_COMPLETE = "account.onboarding.complete",
    SUBSCRIPTION_ACTIVATE = "subscription.activate",
    SUBSCRIPTION_PLAN_CHANGE = "subscription.plan.change",
    SUBSCRIPTION_CANCELLATION_SCHEDULE = "subscription.cancellation.schedule",
    SUBSCRIPTION_END = "subscription.end",
}

export type AuditEventDTO = {
    // ...campos existentes
    level: AuditLevel;
};

export type AuditEventListQuery = {
    userId?: string;
    from?: string;
    to?: string;
    level?: AuditLevel;
};
```

Action (`packages/sdk/src/actions/audit/action.ts`):

```ts
params: {
    // ...existentes
    ...(query?.level ? { level: query.level } : {}),
},
```

### 10.2 Rota — `GET /audit-events`

Guard `requireAdminApi`, sem mudança. Exemplo:

```
GET /audit-events?limit=20&userId=p_123&level=info&from=2026-11-01&to=2026-11-30
```

```json
{
  "data": {
    "items": [
      {
        "id": "stripe_evt_1Q_subscription.activate",
        "action": "subscription.activate",
        "level": "info",
        "actorUserId": "p_123",
        "actorUid": "uid_abc",
        "actorLabel": "qa-audit-levels@example.com",
        "onBehalfOfUserId": null,
        "targetType": "account",
        "targetUserId": "p_123",
        "targetLabel": "qa-audit-levels@example.com",
        "changedFields": [],
        "involvedUserIds": ["p_123"],
        "requestId": "req_9",
        "windowEndsAt": null,
        "createdAt": "2026-11-26T18:00:00.000Z",
        "updatedAt": "2026-11-26T18:00:00.000Z",
        "deletedAt": null
      }
    ],
    "nextCursor": null
  }
}
```

| `error.code` | status | quando |
|--------------|--------|--------|
| `VALIDATION_FAILED` | 400 | `level` fora do enum, datas inválidas, `from > to` |
| `PAGINATION_CURSOR_INVALID` | 400 | cursor inexistente |
| `PAGINATION_INDEX_MISSING` | 503 | índice composto não publicado |
| `AUTH_*` do guard | 401/403 | como hoje |

### 10.3 Persistência

Documento `auditEvent` (`info`):

```ts
{
  action: "account.signUp",
  level: "info",
  actorUserId, actorUid, actorLabel,
  onBehalfOfUserId: null,
  targetType: "account",
  targetUserId, targetLabel,
  changedFields: [],
  involvedUserIds: [actorUserId],
  requestId: "req_…" | null,
  windowEndsAt: null,
  expiresAt: Timestamp(createdAt + 365 d),   // ausente em "sensitive"
  createdAt: Timestamp, updatedAt: Timestamp, deletedAt: null,
}
```

`apps/api/(shared)/lib/audit-level.ts` (novo):

```ts
export const AUDIT_INFO_RETENTION_DAYS = 365;

export const AUDIT_ACTION_LEVEL: Record<AuditAction, AuditLevel> = {
    [AuditAction.IMPERSONATION_SESSION]: AuditLevel.SENSITIVE,
    // ...as 18 existentes + USER_CREATE → SENSITIVE
    [AuditAction.ACCOUNT_SIGN_UP]: AuditLevel.INFO,
    // ...as 7 de ciclo de vida → INFO
};

export function auditLevelOf(action: AuditAction): AuditLevel;
export function auditExpiresAtFor(level: AuditLevel, now: Date): Date | null;
```

Repositório (`audit-event.repository.ts`):

```diff
 export type AuditEventFilters = {
     userId?: string;
     from?: Date;
     to?: Date;
+    level?: AuditLevel;
 };
+type AppendOptions = { expiresAt?: Date | null };

-append(data: CreateRequest<AuditEventDTO>)
+append(data: CreateRequest<AuditEventDTO>, options: AppendOptions = {})
+    // grava { ...data, ...(options.expiresAt ? { expiresAt: options.expiresAt } : {}) }

-appendOnce(id, data)
+appendOnce(id, data, options: AppendOptions = {})

 listPage(filters, page) {
     ...
+    if (filters.level) {
+        query = query.where("level", "==", filters.level);
+    }
```

Recorder (`audit-recorder.ts`):

```diff
 export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
+    const level = auditLevelOf(input.action);
     try {
-        await auditEventRepository.append({ ...campos });
+        await auditEventRepository.append(
+            { ...campos, level },
+            { expiresAt: auditExpiresAtFor(level, new Date()) }
+        );
     } catch (error) { /* inalterado */ }
 }
+export async function recordAuditEventOnce(key: string, input: AuditEventInput): Promise<void>;
+export async function recordAccountLifecycleEvent(input: {
+    action: AuditAction;
+    profileId: string;
+    uid: string;
+    label?: string | null;
+    requestId: string | null;
+    onceKey?: string;
+}): Promise<void>;

 recordImpersonationSession(...) {
-        await auditEventRepository.appendOnce(key, { ...campos });
+        await auditEventRepository.appendOnce(key, { ...campos, level: AuditLevel.SENSITIVE });
```

Os testes do recorder hoje comparam o payload do `append` por igualdade; vão precisar do `level` e do
segundo argumento.

### 10.4 Pontos de gravação (pseudo-diffs)

`apps/api/(shared)/lib/user-merge.ts`:

```diff
 export async function createDefaultUserProfile(
     uid: string,
-    dto?: Partial<UserDTO>
+    dto?: Partial<UserDTO>,
+    options: { requestId?: string | null } = {}
 ): Promise<UserDTO> {
     const created = await userRepository.create({ ...defaultProps });
+    await recordAccountLifecycleEvent({
+        action: AuditAction.ACCOUNT_SIGN_UP,
+        profileId: created.id,
+        uid,
+        requestId: options.requestId ?? null,
+    });
     if (created.type === UserType.COMMON) { ... }
```

`apps/api/app/(routes)/auth/sign-up/route.ts:55`:

```diff
-        await createDefaultUserProfile(uid);
+        await createDefaultUserProfile(uid, undefined, { requestId: requestIdFrom(req) });
```

`apps/api/app/(routes)/users/route.ts`:

```diff
-export const POST = requireAdminApi(async (req, _ctx) => {
+export const POST = requireAdminApi(async (req, ctx) => {
     ...
     const created = await userRepository.findByReferenceId(localId);
+    if (created) {
+        await recordAuditEvent({
+            action: AuditAction.USER_CREATE,
+            actorUserId: ctx.actorProfile.id,
+            actorUid: ctx.user.uid,
+            actorLabel: ctx.user.email ?? ctx.user.displayName ?? null,
+            targetType: AuditTargetType.USER,
+            targetUserId: created.id,
+            targetLabel: input.email,
+            requestId: requestIdFrom(req),
+        });
+    }
```

`apps/api/app/(routes)/auth/email-verification/confirm/route.ts`:

```diff
-    const { oobCode } = parsed.value;
+    const { oobCode } = parsed.value;
+    let confirmedEmail: string | undefined;
     try {
         const checked = await identityCheckOobCode(oobCode);
         ...
         await identityApplyOobCode(oobCode);
+        confirmedEmail = checked.email;
     } catch (error) { ... }
+
+    await recordEmailVerified(confirmedEmail, requestIdFrom(req));
     return Response.json({ data: { confirmed: true } });
```

`recordEmailVerified` (no próprio arquivo ou em `audit-recorder.ts`): `getUserByEmail` →
`userRepository.findByReferenceId` → `recordAccountLifecycleEvent`; qualquer falha vira
`logEvent("audit", "subject-not-found", { action, requestId })` sem lançar.

`apps/api/app/(routes)/account/onboarding/route.ts`:

```diff
     try {
         await userRepository.update({ ... });
     } catch { ... }
+
+    if (transition.state.completedAt !== null) {
+        await recordAccountLifecycleEvent({
+            action: AuditAction.ACCOUNT_ONBOARDING_COMPLETE,
+            profileId: ctx.subjectProfile.id,
+            uid: ctx.user.uid,
+            label: ctx.user.email ?? ctx.user.displayName ?? null,
+            requestId: requestIdFrom(req),
+        });
+    }
```

`apps/api/app/(routes)/webhooks/payments/route.ts` (`reconcileSubscription`):

```diff
+        if (result === "applied") {
+            for (const action of subscriptionAuditActionsFor(profile.subscription, state)) {
+                await recordAccountLifecycleEvent({
+                    action,
+                    profileId: profile.id,
+                    uid: profile.reference_id,
+                    requestId,
+                    onceKey: `stripe_${event.id}_${action}`,
+                });
+            }
+        }
```

O `profile.subscription` é o valor anterior ao `applySubscriptionState`, o mesmo que a notificação já usa
(`:108-111`).

### 10.5 Front (árvore)

```
apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/audit/
  (pages)/(home)/AuditListClient.tsx     ← coluna "level" com Badge
  (components)/AuditFilters.tsx          ← HookFormSelect name="level", grade 2/4 colunas
  (validations)/auditFiltersSchema.ts    ← level + auditLevelAll + default
  (hooks)/useListAuditEvents.tsx         ← sem mudança (filtros já repassados por spread)
apps/app/shared/lib/queryKeys.ts         ← level na chave
```

Campo novo do formulário: `level` → `HookFormSelect` com opções
`[{ __all__, levelAll }, { sensitive, levelLabels.sensitive }, { info, levelLabels.info }]`.

### 10.6 i18n (`translations/apps/app/pages/admin/auditTrail.ts`)

```ts
list: {
    columns: { level: "Nível" | "Level" | "Nivel" },
    levelLabels: {
        sensitive: "Sensível" | "Sensitive" | "Sensible",
        info: "Informativo" | "Informational" | "Informativo",
    },
    actionLabels: {
        "user.create": "Usuário criado pelo admin" | "User created by an admin" | "Usuario creado por el admin",
        "account.signUp": "Cadastro" | "Signed up" | "Registro",
        "account.email.verify": "E-mail confirmado" | "Email confirmed" | "Correo confirmado",
        "account.onboarding.complete": "Onboarding concluído" | "Onboarding completed" | "Onboarding completado",
        "subscription.activate": "Assinatura ativada" | "Subscription activated" | "Suscripción activada",
        "subscription.plan.change": "Plano alterado" | "Plan changed" | "Plan cambiado",
        "subscription.cancellation.schedule": "Cancelamento agendado" | "Cancellation scheduled" | "Cancelación programada",
        "subscription.end": "Assinatura encerrada" | "Subscription ended" | "Suscripción finalizada",
    },
},
filters: {
    levelLabel: "Nível" | "Level" | "Nivel",
    levelAll: "Todos os níveis" | "All levels" | "Todos los niveles",
},
```

Nenhuma chave em `apiErrors`.

### 10.7 Índices (`firestore.indexes.json`)

```json
{
  "collectionGroup": "auditEvent",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "level", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "auditEvent",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "involvedUserIds", "arrayConfig": "CONTAINS" },
    { "fieldPath": "level", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

O `__name__ desc` da ordenação de `paginate` fica implícito, como na entrada existente de `auditEvent`
(`firestore.indexes.json:54-61`).

### 10.8 Backfill

`apps/api/scripts/backfill-audit-levels.mjs` (novo) + script `backfill-audit-levels` em
`apps/api/package.json`, no molde de `backfill-instants.mjs`: mesmo `initializeTarget` com
`emulatorTarget.mjs`, dry-run por padrão, `--apply` grava em lotes de 400, cabeçalho anunciando se o projeto
é real. Patch: `{ level: "sensitive" }` só em documento sem `level`; não mexe em `updatedAt` nem em
`expiresAt`. Exportar `buildPatch` para testar sem Firestore.

### 10.9 Documentação

- `docs/PRE-PRODUCTION.md`: nova subseção para os dois índices de `auditEvent` (no molde da §1.2, com o
  modo degradado), linha nova na tabela da §1.8, passo do backfill de nível (perto da §1.4) e, na §1.3, a
  política dos eventos `info` com o comando de TTL e o efeito no Spark. A parte dos sensíveis continua
  remetendo à E5.
- `docs/ROPA.md` §7: finalidade acrescida (histórico de ciclo de vida da conta), período "12 meses para
  eventos informativos com a TTL ligada; sensíveis: `[FORK]`", e a lista de ações.

### 10.10 Ordem de implementação e commits

1. `feat(sdk): audit level and lifecycle actions` — tipos + action.
2. `feat(api): derive audit level from action` — `audit-level.ts`, recorder, mapper, repositório, testes.
3. `feat(api): filter audit trail by level` — schema, rota, `firestore.indexes.json`, teste de índices.
4. `feat(api): record account lifecycle audit events` — `user-merge`, `sign-up`, `email-verification`,
   `onboarding`, testes.
5. `feat(api): record subscription audit events` — `subscription-audit.ts`, export de `readPrevious`,
   webhook, testes.
6. `feat(api): audit user creation by admin` — `users/route.ts`, teste.
7. `feat(api): backfill script for audit levels` — script + `package.json` + teste do `buildPatch`.
8. `feat(app): audit level column and filter` — tela, schema, `queryKeys`, testes.
9. `feat(internationalization): audit level labels` — 3 idiomas.
10. `docs: audit level indexes, retention and records` — `PRE-PRODUCTION.md`, `ROPA.md`.
11. `docs(features): audit-log-levels` — artefatos, por último.

### 10.11 Env e configuração

Nenhuma env nova. Constante `AUDIT_INFO_RETENTION_DAYS` em código, ajustável por fork.

---

## Pré-requisitos manuais de infra

O `/develop` não satisfaz nenhum destes, e o `/test` não reprova a entrega por eles. Cada um vira pendência
em `docs/PRE-PRODUCTION.md`.

| # | pré-requisito | comando / onde | sem ele (modo degradado) |
|---|---------------|----------------|--------------------------|
| P1 | Publicar os dois índices novos de `auditEvent` no projeto do fork (e no de referência) | `npx -y firebase-tools@latest deploy --only firestore:indexes` | filtro por nível responde `503 PAGINATION_INDEX_MISSING` com mensagem traduzida; "Todos", usuário e período seguem funcionando; nunca 500 |
| P2 | Rodar o backfill de nível em base que já tem eventos | `pnpm --filter api backfill-audit-levels` (dry-run), depois `--apply` | eventos antigos aparecem como "Sensível" em "Todos", mas somem do filtro "Sensível" |
| P3 | Ligar a TTL em `auditEvent.expiresAt` (exige Blaze) | `gcloud firestore fields ttls update expiresAt --collection-group=auditEvent --enable-ttl --project=<id>` | `expiresAt` fica gravado sem efeito; eventos `info` ficam até a exclusão da conta |
| P4 | Decidir o prazo dos eventos sensíveis (E5) | decisão do usuário, `PRE-PRODUCTION.md` §1.3 | sem mudança em relação a hoje |
| P5 | Stripe em modo teste com webhook encaminhado, para ver os eventos de assinatura no navegador | `pnpm --filter api dev:with-stripe` + chaves de teste | provado por teste unitário; critério fica 🔒 no navegador |

O emulador do Firestore não cobra índice composto, então nenhum gate local prova P1. A defesa local é o
teste estático em `firestoreIndexes.test.ts`.

---

## Riscos

- **Índice esquecido no fork** (P1): mesmo risco da §1.2 atual; mitigado pelo 503 traduzido e pela entrada no
  `PRE-PRODUCTION.md`.
- **Filtro "Sensível" incompleto antes do backfill** (P2): é a limitação do Firestore descrita na spec. O
  rótulo na listagem "Todos" fica certo de qualquer forma.
- **Perfil duplicado no primeiro contato**: duas requisições simultâneas de uma conta nova podem criar dois
  perfis (`findOrCreateProfile`, `user-merge.ts:56-72`, sem transação). Cada criação gravaria um
  `account.signUp`. O defeito é anterior a esta entrega e fica fora do escopo; o evento duplicado só torna o
  problema visível.
- **`trialing` conta como ativação**: o início do período de teste gera `subscription.activate`, e a conversão
  do teste em pago não gera nada. Coerente com o conjunto `ACTIVE` da notificação; fica registrado.
- **Evento de assinatura perdido em falha parcial**: se a gravação da trilha falhar e o evento for reentregue,
  a reentrega cai em `skipped` e o evento não volta. É o fail-open aceito na spec; fica o log
  `audit/write-failed`.
- **Uma consulta a mais no cadastro**: `resolveUserAuditLabel` faz uma leitura no Firebase Auth por
  cadastro. Custo baixo, mesmo padrão de `users/[id]/route.ts:169`.

---

## Decisões adotadas sem perguntar

| # | decisão | adotada | alternativa descartada | por quê |
|---|---------|---------|------------------------|---------|
| D1 | Níveis (pergunta 1 da spec) | `sensitive` e `info` | terceiro nível `critical` | recomendação da spec; fora do corte |
| D2 | Registros antigos (pergunta 2) | gravar `level` sempre, mapper lê ausência como `sensitive`, backfill único | filtrar por lista de ações com `in` | recomendação da spec; a alternativa amarra o filtro ao enum e consome o limite do `in` |
| D3 | Retenção (pergunta 3) | `info` com `expiresAt` de 12 meses em constante; sensíveis sem vencimento; E5 segue aberta | fixar prazo para a coleção inteira | recomendação da spec; fixar prazo dos sensíveis é a E5, decisão do usuário |
| D4 | Ator sem sessão (pergunta 4) | titular, resolvido pelo cliente Stripe ou pelo e-mail confirmado; não achou → não grava e loga | ator "sistema" sintético | recomendação da spec; ator sintético poluiria o filtro por usuário |
| D5 | Filtro padrão (pergunta 5) | "Todos" | "Sensível" | recomendação da spec |
| D6 | Exclusão de conta (pergunta 6) | anonimizar `info`, como hoje | apagar | recomendação da spec; sem segundo caminho de escrita |
| D7 | Tipo de alvo da assinatura | `AuditTargetType.ACCOUNT` | `AuditTargetType.SUBSCRIPTION` novo | a tela não mostra o tipo; menor raio de impacto |
| D8 | `expiresAt` no DTO | fora do DTO, campo de persistência | no DTO como string | a TTL só age sobre `Timestamp`; precedente de `notification` |
| D9 | Idempotência do webhook | `result === "applied"` + `appendOnce` com `stripe_<event.id>_<action>` | só o `applied` | o id determinístico fecha também a entrega concorrente sem custo extra; precedente de `recordImpersonationSession` |
| D10 | Leitor do snapshot anterior | exportar `readPrevious` e acrescentar `priceId` | copiar o leitor em `subscription-audit.ts` | uma regra de "snapshot de outra assinatura lê como ausente" em vez de duas |
| D11 | Backfill | script novo `backfill-audit-levels.mjs` | modo novo dentro de `backfill-instants.mjs` | o `backfill-instants` trata instantes de qualquer coleção; nível é outro assunto e outro alvo |
| D12 | Nome das ações | `subscription.cancellation.schedule`, `subscription.plan.change`, `account.signUp` | outras grafias | segue o padrão de pontos já usado (`account.signInMethod.link`, `account.sessions.revokeOthers`) |

---

## Perguntas em aberto

1. **Prazo dos eventos informativos.** Adotado 12 meses (`AUDIT_INFO_RETENTION_DAYS = 365`), como a spec
   recomenda. Opções: 12 meses (adotado), 6 meses, sem prazo. Ele não decide a E5: os sensíveis continuam
   sem vencimento até você decidir. Confirme o prazo ou ajuste a constante.
2. **E5 (prazo dos sensíveis)** continua estacionada. Esta entrega não a destrava; só deixa o campo
   `expiresAt` e o comando de TTL prontos para quando houver prazo.
3. **`trialing` como ativação.** Adotado: início de teste grava `subscription.activate` e a conversão em
   pago não grava nada. Opção: gravar a ativação só no primeiro pagamento (`invoice.paid` com
   `subscription_create`, `webhooks/payments/route.ts:144-155`). Adotada a primeira porque reusa o conjunto
   `ACTIVE` da notificação e não acrescenta caminho novo no webhook.
4. **Nível no registro da exportação LGPD.** Adotado: não incluir (fora do corte). Opção: acrescentar
   `level` ao `AccountDataExportRecord`. A spec não pede, e mudar o formato da exportação é contrato com o
   titular.
5. **Discordância de corte:** nenhuma.

## Referências não lidas

Nenhuma. As fontes externas da spec foram lidas pelo `/spec` em 2026-11-24
(`specs/reference/research/audit-log-levels.md`); este plano não dependeu de reabri-las.
