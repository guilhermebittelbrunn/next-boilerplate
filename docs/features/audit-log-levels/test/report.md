# Relatório do `/test`: audit-log-levels

Rodada autônoma do `/cycle`, retomada depois de uma execução que caiu sem gravar artefato. Os 11
screenshots daquela execução serviram só de pista; tudo abaixo foi medido de novo nesta rodada, no emulador
(`demo-next-boilerplate`), com `api` (3002) e `app` (3000) em `next dev`.

Resultado da rodada 1: nenhum teste falhou e nenhum critério reprovou. Dos 16 critérios, 14 passaram e 2 ficam 🔒 por
falta de infra externa (eventos de assinatura sem Stripe em modo teste, 503 sem projeto real). Dentro de
critérios aprovados, a TTL apagando de fato (Blaze) e o `localId` no Identity Toolkit real também são 🔒. A medição confirmou a corrida
de duas abas no onboarding que a revisão tinha apontado: duas conclusões concorrentes gravam dois eventos.

A remedição da rodada 2, no fim deste arquivo, mediu a correção da corrida do onboarding: o defeito não
se reproduziu em 5 tentativas e o critério continua ✅, agora sem ressalva.

## Verificar no `/test`

| # | item do `review.md` | veredito | o que foi medido |
|---|---------------------|----------|------------------|
| 1 | `localId` na resposta de `accounts:update` com `oobCode` | **confirmado** no emulador; 🔒 em produção | Código `VERIFY_EMAIL` gerado pelo Auth emulator; `POST /auth/email-verification/confirm` respondeu 200 `{"data":{"confirmed":true}}`. Um `account.email.verify` gravado com `actorUserId = targetUserId` = perfil do titular e `actorUid` = uid dele. Nenhum `[audit] subject-not-found` no log da API. O Identity Toolkit real não foi exercitado. |
| 2 | `expiresAt` gravado como `Timestamp` | **confirmado** | REST do emulador: `account.signUp` com `createdAt` `2026-11-27T03:21:47.576Z` e `expiresAt` `{"timestampValue":"2027-11-27T03:21:47.576Z"}`, 365 dias. Mesmo padrão em `account.email.verify` e `account.onboarding.complete`. `user.create` e `account.delete` não têm o campo. |
| 3 | Backfill dry-run / apply / dry-run | **confirmado** | Documento `qa-legacy-no-level` sem `level`: API devolveu `level: "sensitive"` sem filtro e não o trouxe em `?level=sensitive`. Backfill: `8 scanned, 1 would be updated` → `8 scanned, 1 updated` → `8 scanned, 0 would be updated`. Depois disso, `?level=sensitive` passou a trazê-lo. `updatedAt` ficou em `2026-10-01T12:00:00Z` e nenhum `expiresAt` apareceu. Repetido com 450 documentos extras: `458 scanned, 450 would be updated` → `450 updated` → `0 would be updated`, ou seja, duas páginas de 400 e dois `batch.commit`. |
| 4 | Filtros na aba de rede e "Limpar" | **confirmado** | Requisição `GET /audit-events?limit=20&userId=<perfil>&from=2026-11-02&to=2026-11-28&level=info` → 200, três linhas, todas do usuário escolhido e "Informativo". Trocar para "Sensível" com o mesmo usuário → `level=sensitive`, lista vazia com "Nenhum evento registrado.". "Limpar" → `GET /audit-events?limit=20`, selects de volta a "Todos os usuários" e "Todos os níveis", datas vazias. |
| 5 | `user.create` pela tela | **confirmado** | `/pt-br/admin/users/create` com `qa-audit-levels-created@example.com` → `POST /users` 201. Linha "Usuário criado pelo admin", "Sensível", autor `admin@example.com`, alvo `qa-audit-levels-created@example.com`. |
| 6 | Cadastro, onboarding e corrida de duas abas | cadastro e duplo clique **confirmados**; corrida **confirmada como defeito** | Cadastro em `/pt-br/sign-up` → `POST /auth/sign-up` 201, um "Cadastro" informativo com autor = alvo e `requestId` preenchido. Duplo clique em "Concluir" gerou um só `POST /account/onboarding` para o último passo e um só evento. Corrida: duas requisições concorrentes com o mesmo token no passo `preferences` → as duas 200, com `completedAt` diferentes (`…19.763Z` e `…19.765Z`), e **dois** `account.onboarding.complete`. Um terceiro envio sequencial respondeu o estado salvo e não gravou nada. |
| 7 | Layout em 3 idiomas, light, dark, mobile | **confirmado** | Ver "Evidências e2e". |
| 8 | 503 por índice ausente, TTL, assinatura no navegador | 🔒 | Sem projeto real, sem Blaze e sem Stripe de teste. Cobertos por `auditEventsRoute.test.ts`, `subscriptionAudit.test.ts` e `paymentsWebhookRoute.test.ts`, que passaram. |

## Defeito encontrado (comportamento de produção)

**Conclusão concorrente do onboarding grava dois `account.onboarding.complete`.** Severidade baixa: exige
duas abas no último passo ou duas requisições simultâneas, e o efeito é uma linha duplicada na trilha.

- Repro: perfil comum no passo `preferences`; disparar ao mesmo tempo dois
  `POST /account/onboarding` com `{"step":"preferences","outcome":"completed"}` e o mesmo token. As duas
  respostas são 200 e `auditEvent` ganha dois documentos `account.onboarding.complete` do mesmo perfil.
- Causa (hipótese, por leitura): `apps/api/app/(routes)/account/onboarding/route.ts:28-61` decide a transição
  sobre `ctx.subjectProfile.onboarding`, lido pelo guard antes da escrita, e grava com
  `userRepository.update` fora de transação. As duas requisições veem `completedAt: null` e as duas gravam
  o evento (linha 62). O `completedAt` do perfil também é sobrescrito pela segunda.
- Correção sugerida (hipótese): ler e escrever o estado de onboarding numa transação do Firestore e gravar
  o evento só quando a transação desta requisição for a que preencheu `completedAt`. Alternativa mais curta,
  já descartada pela revisão: `recordAuditEventOnce` com chave por perfil, que impediria um segundo evento
  se algum fork reabrir o onboarding.
- A revisão já tinha registrado o risco em 🟡 e a decisão "não adotar agora". A medição confirma o risco; a
  decisão continua com o usuário.

## Cobertura

| comando | resultado |
|---------|-----------|
| `pnpm test` (raiz, `JAVA_HOME` no JDK 21) | 15/15 tasks ok, 14 de cache, 52 s. `api` 135 arquivos / 1962 testes; `app` 155 / 1403; `web` 35 / 315; `@repo/sdk` 4 / 15; `@repo/internationalization` 7 / 67 (paridade); `api:test:emulator` 11 / 281 (fora do cache). Os demais pacotes passaram de cache. |
| typecheck e `pnpm check` | não remedidos. Nenhum código de produção nem teste mudou nesta etapa; vale o número do `review.md` (4/4 typecheck, 1166 arquivos no lint). |

O cache de `api:test` e `app:test` bate com o working tree atual, porque o hash do turbo inclui os
arquivos de entrada. Não houve motivo para suspeitar dele, então nada rodou com `--force`.

### Testes criados

Nenhum. A cobertura unitária do diff já prova os comportamentos que cabem na faixa barata:

- `GET /audit-events` (validação do `level`, combinação com usuário e período, 503 por índice ausente):
  `auditListQuery.test.ts` e `auditEventsRoute.test.ts`.
- `POST /users` com `user.create` e o caminho `USERS_PROFILE_CREATE_FAILED` sem evento: `usersRoute.test.ts`.
- Cadastro, Google/link e perfil arquivado: `signUpProfile`, `googleSignInProfile`, `userMergeArchivedProfile`.
- Confirmação de e-mail com titular ausente e código de outro tipo: `authEmailVerification.test.ts`.
- Onboarding, transições que não gravam e falha do `update`: `accountOnboardingRoute.test.ts`.
- Assinatura: `subscriptionAudit.test.ts`, `paymentsWebhookRoute.test.ts`.
- Front (filtro, schema, cache por nível): `auditFilters`, `auditFiltersSchema`, `auditListFiltersSurvive`,
  `useListAuditEvents`.

### Decisões de custo de teste

- Nenhum teste da faixa cara foi criado. O `expiresAt` como `Timestamp` e o laço do backfill dependem do
  Firestore de verdade, mas a medição no emulador não encontrou divergência, e a §6 do checklist só pede
  teste de emulador nesse caso.
- A corrida do onboarding pede teste só quando a correção for adotada. Um teste com mock do repositório
  conseguiria simular a leitura dupla e seria barato, mas hoje ele só fixaria o defeito.

## Lacunas herdadas

| lacuna | veredito |
|--------|----------|
| Nenhum teste lê `expiresAt` no documento gravado | **fechada por medição** nesta rodada (item 2); continua sem teste automatizado, pelo motivo acima. |
| Laço de paginação e `batch.commit` do backfill sem teste | **fechada por medição** com 458 documentos (duas páginas, dois commits). Sem teste automatizado: script operacional de execução única. |
| Corrida de duas abas no onboarding | **fechada** na rodada 2: corrigida pela revisão, coberta por `accountOnboardingRoute.test.ts` e `onboardingAdvance.emulator.test.ts`, e remedida pela API (ver abaixo). |

## Evidências e2e

Uma passada com `agent-browser`, em sequência, logado como `admin@example.com` do seed.

- Coluna e rótulos, pt-br, light, 1440 px: cabeçalhos "Quando", "Ação", "Nível", "Autor", "Alvo", "Campos
  alterados". Linhas: "Usuário criado pelo admin | Sensível", "Onboarding concluído | Informativo",
  "Cadastro | Informativo", "E-mail confirmado | Informativo", e o documento antigo como "Perfil alterado
  pelo admin | Sensível", com campo alterado `displayName`.
- en: "Level", opções "All levels" / "Sensitive" / "Informational", ações "User created by an admin",
  "Onboarding completed", "Signed up", "Email confirmed", botões "Clear" e "Apply".
- es: "Nivel", opções "Todos los niveles" / "Sensible" / "Informativo", ações "Usuario creado por un
  administrador", "Onboarding completado", "Registro", "Correo confirmado", botões "Limpiar" e "Aplicar".
- Contraste do badge, medido pelo estilo computado: light, "Sensível" branco sobre `rgb(231,0,11)` = 4,77:1
  e "Informativo" `rgb(23,23,23)` sobre `rgb(245,245,245)` = 16,44:1. Dark, "Sensível" branco sobre
  `rgba(255,100,103,0.6)`, cor efetiva aproximada `rgb(168,75,77)` = cerca de 5,6:1 (aproximação: o fundo
  atrás também tem transparência); "Informativo" `rgb(250,250,250)` sobre `rgb(38,38,38)` = 14,50:1. O
  screenshot dark confere a leitura.
- Grade de filtros: 4 colunas em 1440 px, 2 em 820 px, 1 em 390 px. `scrollWidth` do documento ficou abaixo
  da largura da janela nos três (1425/1440, 805/820, 375/390), também em en e es a 390 px. A tabela rola
  dentro do próprio contêiner (1223 px de conteúdo em 311 px no mobile).
- Erro: forçando `level=critical` na requisição, a API devolveu 400 e a tela mostrou "Dados inválidos.
  (Código do erro: <requestId>)" com os filtros visíveis. O mock de 503 pelo `agent-browser network route`
  não interceptou o XHR, por isso o 503 ficou só na prova unitária.
- Screenshots de apoio em `test/e2e/` (`01-ptbr-light-desktop-todos.png` a `10-es-dark-mobile.png`), que o
  `.gitignore` descarta.

## Ambiente do e2e

- Portas 3000-3003, 4000, 4001, 4400, 4500, 8080, 9099, 9150 e 9199 estavam livres no início; nada do
  usuário foi reutilizado. O processo `firebase mcp` que já rodava na máquina não foi tocado.
- Subidos e derrubados por PID: `pnpm emulators` (JDK 21), `pnpm --filter api dev`, `pnpm --filter app dev`.
  `pnpm seed` rodou uma vez. Depois do `kill`, todas as portas acima voltaram vazias no `lsof`.
- `apps/api/.env` e `apps/app/.env` foram criados a partir dos `.env.example` para a passada e apagados no
  fim (não existiam antes).

## Dados de QA

Todos no emulador, que descarta o estado ao parar. Nada foi criado em projeto Firebase real, e o
`PRE-PRODUCTION.md` não ganha conta nova.

- `qa-audit-levels@example.com` (cadastro, onboarding e e-mail confirmado).
- `qa-audit-levels-race@example.com` (corrida do onboarding; conta excluída pela própria rota de exclusão).
- `qa-audit-levels-created@example.com` (criada pelo admin).
- `auditEvent/qa-legacy-no-level` e 450 documentos `qa-bulk-*` (estes apagados logo após a medição).

A senha das contas foi gerada para a sessão e não foi gravada em arquivo. O admin é o do seed.

## Remedição (rodada 2)

A revisão moveu a decisão e a escrita do onboarding para uma transação do Firestore
(`userRepository.advanceOnboarding`, `apps/api/(shared)/repositories/user.repository.ts:143`) e a rota passou
a gravar o evento só na requisição que concluiu (`apps/api/app/(routes)/account/onboarding/route.ts:28-58`).
O delta é só da API e não tem superfície de UI, então esta remedição não abriu navegador nem subiu o `app`.

### Corrida no último passo

Ambiente: emulador (JDK 21) e `pnpm --filter api dev`. Para cada conta, cadastro por `POST /auth/sign-up`,
passo `profile` concluído, e então requisições simultâneas de `POST /account/onboarding` com
`{"step":"preferences","outcome":"completed"}` e o mesmo token.

| conta | requisições simultâneas | respostas | `completedAt` nas respostas | `completedAt` no documento | eventos `account.onboarding.complete` |
|-------|------------------------|-----------|-----------------------------|----------------------------|---------------------------------------|
| `qa-audit-levels-race2-1@example.com` | 2 | 200, 200 | `2026-11-27T13:06:42.646Z` nas duas | igual | 1 |
| `qa-audit-levels-race2-2@example.com` | 2 | 200, 200 | `2026-11-27T13:06:45.522Z` nas duas | igual | 1 |
| `qa-audit-levels-race2-3@example.com` | 2 | 200, 200 | `2026-11-27T13:06:48.612Z` nas duas | igual | 1 |
| `qa-audit-levels-race2-4@example.com` | 3 | 200, 200, 200 | `2026-11-27T13:06:52.328Z` nas três | igual | 1 |
| `qa-audit-levels-race2-5@example.com` | 3 | 200, 200, 200 | `2026-11-27T13:06:55.689Z` nas três | igual | 1 |

Na rodada 1, o mesmo repro gerou `completedAt` diferentes nas respostas e dois eventos. Um envio sequencial
depois de cada conclusão respondeu 200 com o `completedAt` gravado e não acrescentou evento. O log da API
registrou 25 respostas 200 em `POST /account/onboarding` e nenhuma 500.

### Regressão dos outros passos

Conta `qa-audit-levels-race2@example.com`:

- `preferences` antes de `profile`: 409 `ONBOARDING_STEP_OUT_OF_ORDER`.
- `profile` pulado: 400 `ONBOARDING_STEP_NOT_SKIPPABLE`.
- passo inexistente: 400 `VALIDATION_FAILED`.
- `profile` concluído: 200 `{"step":"preferences","completedAt":null}`, nenhum evento.
- `preferences` pulado: 200 com `completedAt` preenchido e um evento (conclusão por pulo).
- repetição do pulo: 200 com o mesmo `completedAt`, ainda um evento.

Os mesmos códigos e respostas da rodada 1.

### Gates

| comando | resultado |
|---------|-----------|
| `pnpm test` (raiz, JDK 21, sem `--force`) | 15/15 tasks ok, 13 de cache, 55 s. `api:test` rodou de verdade (cache miss): 135 arquivos, 1964 testes. `api:test:emulator`: 12 arquivos, 283 testes. `app` 1403 de cache, sem mudança de entrada. |

Os números batem com os da revisão. Nenhum teste novo foi criado nesta remedição: os 8 casos unitários e o
teste de emulador da revisão já cobrem o comportamento, e a prova de mutação que ela registrou mostra que o
teste de emulador falha sem a transação.

### Ambiente e dados

- Portas 3000, 3002, 4000, 4001, 4400, 4500, 8080, 9099, 9150 e 9199 livres no início. Subidos e derrubados
  por PID: `pnpm emulators` e `pnpm --filter api dev`. Todas as portas voltaram vazias.
- `apps/api/.env` criado a partir do `.env.example` e apagado no fim.
- Contas só no emulador, descartadas com ele: `qa-audit-levels-race2@example.com` e
  `qa-audit-levels-race2-1@example.com` a `qa-audit-levels-race2-5@example.com`. A senha foi gerada para a
  sessão e não foi gravada em arquivo.
