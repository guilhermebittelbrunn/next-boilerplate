---
id: audit-log-levels
title: Níveis na trilha de auditoria (sensível e informativo)
status: done
value: médio
effort: M
audience: produto
area: [packages/sdk, apps/api, apps/app, packages/internationalization]
mode: ambos
depends_on: []
contends_on: [firestore.indexes.json, apps/api/app/(routes)/webhooks/payments/route.ts, apps/api/(shared)/lib/user-merge.ts]
feature: audit-log-levels
updated: 2026-11-27
---

# Níveis na trilha de auditoria (sensível e informativo)

> **Resumo**
> - **O quê:** cada evento da trilha ganha um nível. As 18 ações que já existem viram `sensitive`, e a trilha passa a gravar também eventos `info` de ciclo de vida da conta (cadastro, assinatura criada, troca de plano, cancelamento, onboarding concluído, e-mail confirmado), com coluna e filtro por nível na listagem do admin.
> - **Por quê:** hoje o admin só vê operações sensíveis e não tem onde consultar, por usuário e por período, quando alguém se cadastrou, assinou ou cancelou. O GA mostra o funil anônimo, não a história de uma conta.
> - **Status:** `done` · valor médio · esforço M · produto. Entregue pela PR #78, mergeada em `main` em 2026-11-27 (`6943ce9`), com o CI de merge verde
> - **Próximo passo:** publicar os dois índices novos, rodar o backfill de nível e, no Blaze, ligar a TTL em `auditEvent.expiresAt` (`docs/PRE-PRODUCTION.md` §1.3, §1.11 e §1.12). O que foi conferido está em [Conferência da entrega](#conferência-da-entrega)

## Problema

A trilha de auditoria entregue na PR #18 responde "quem fez o quê de sensível, e quando". Ela não responde
perguntas de operação do produto: quando esta conta foi criada, quando assinou, quando cancelou, se terminou
o onboarding. Hoje o admin cruza o perfil, a Stripe e o banco para montar essa história. E como todo evento
da trilha é tratado igual, misturar fatos de ciclo de vida às ações sensíveis sem uma forma de separá-los
enterraria a investigação de segurança no ruído. O usuário pediu os dois juntos: novos eventos informativos e
um nível que os distinga das operações sensíveis, filtrável na tela.

## O que já existe no repo

- `packages/sdk/src/types/audit/audit.ts:2-21`: enum `AuditAction` com as 18 ações atuais (impersonação,
  alteração e exclusão de usuário pelo admin, sessões, senha, e-mail, exportação, exclusão de conta, métodos
  de login, organização e convites). `:30-53`: `AuditEventDTO`, sem campo de nível. `:55-62`: o filtro da
  listagem aceita só `userId`, `from` e `to`.
- `apps/api/(shared)/lib/audit-recorder.ts:91-120`: `recordAuditEvent` grava e nunca lança; em falha, cai no
  `logEvent("audit", "write-failed", ...)`. `:17-28`: a entrada exige `actorUserId` e `actorUid`, ou seja,
  hoje todo evento tem um ator humano autenticado.
- `apps/api/(shared)/repositories/audit-event.repository.ts:203-224`: `listPage` filtra por
  `involvedUserIds array-contains` e por intervalo de `createdAt`, ordenando por `createdAt` desc e id
  (`base.repository.ts:99-105`, remedida em 2026-11-26 depois da PR #76; era `:97-103`). `:226-240`: `update`, `updateBulk`, `delete` e `deleteBulk` lançam
  `AuditEventImmutableError`. `:149-201`: a única escrita aceita depois da criação é a anonimização.
- `apps/api/(shared)/mappers/audit-event.mapper.ts:24-51`: normaliza o documento; é onde um registro antigo
  sem nível receberia um valor padrão na leitura.
- `firestore.indexes.json:55-61`: um índice composto (`involvedUserIds` + `createdAt` desc). A rota responde
  `503 PAGINATION_INDEX_MISSING` quando o índice falta (`apps/api/app/(routes)/audit-events/route.ts:39-44`),
  e o `docs/PRE-PRODUCTION.md:85-101` manda publicá-lo no projeto do fork.
- Tela: colunas em `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/audit/(pages)/(home)/AuditListClient.tsx:42-75`
  (data, ação, ator, alvo, campos alterados); filtros em `.../audit/(components)/AuditFilters.tsx:74-80`
  (grade de 3 colunas: usuário, de, até).
- Pontos únicos no servidor para os eventos informativos (critério: um lugar só, já executado no servidor,
  sem depender do cliente):
  - Cadastro: `createDefaultUserProfile` (`apps/api/(shared)/lib/user-merge.ts:79`), chamado pelo cadastro
    com senha (`apps/api/app/(routes)/auth/sign-up/route.ts:55`) e pelo primeiro contato de conta Google ou
    link (`user-merge.ts:56-71`). O usuário criado pelo admin passa por outro caminho
    (`apps/api/app/(routes)/users/route.ts:40-75`, `userRepository.create` direto) e **não gera evento
    nenhum hoje**, nem sensível.
  - Assinatura: o webhook da Stripe é idempotente por `event.id` (`apps/api/app/(routes)/webhooks/payments/route.ts:300-306`).
    A primeira ativação já é distinguida (`:144-155`, `billing_reason === "subscription_create"`), e a
    reconciliação compara o estado anterior com o novo (`:85-127`), comparação que
    `apps/api/(shared)/lib/subscription-notifications.ts:42-60` já faz para pagamento pendente e cancelamento.
  - Onboarding: `POST /account/onboarding` (`apps/api/app/(routes)/account/onboarding/route.ts:14`) grava a
    transição de estado (`:49-52`), incluindo a conclusão.
  - E-mail confirmado: `POST /auth/email-verification/confirm`
    (`apps/api/app/(routes)/auth/email-verification/confirm/route.ts:27-58`). A rota não é autenticada (usa o
    `oobCode`), então o ator sai do e-mail que o código confirma. Se a spec
    [`signup-email-verification`](../../../specs/features/signup-email-verification.md) entrar antes, a confirmação por código vira
    um segundo ponto para o mesmo evento.
- LGPD: a exclusão de conta já anonimiza a trilha inteira do titular, qualquer que seja a ação
  (`apps/api/(shared)/lib/account-erasure.ts:227`), e a exportação do titular já inclui os eventos dele, com
  teto de 5.000 registros (`apps/api/(shared)/lib/account-export.ts:26`, `:145`).
- Analytics: `packages/analytics/events.ts:1-7` define `sign_up` e `generate_lead`, disparados do cliente
  (`apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx:53`, `:104`), sem dado
  pessoal por regra do GA (`events.ts:6`) e só com consentimento.
- Precedente de backfill: `pnpm --filter api backfill-instants` (`apps/api/package.json:14`) e o passo
  correspondente em `docs/PRE-PRODUCTION.md` (§ 1.4).
- **Lacuna:** não há nível no evento, não há evento informativo, a tela não filtra por tipo de evento, e a
  criação de usuário pelo admin passa sem registro.

### Auditoria × analytics: a fronteira

| | Trilha de auditoria (esta spec) | `packages/analytics` (GA) |
|---|---|---|
| O que registra | fato consumado no servidor, atribuído a uma conta | interação no navegador, anônima |
| Quem consulta | admin do fork, por usuário e período | quem analisa o funil, agregado |
| Depende de consentimento de cookie | não | sim |
| Dado pessoal | sim (ator, rótulo), sob anonimização na exclusão | proibido |
| Exemplo | "a conta X assinou o plano Y em 12/03" | "40% de quem abriu o cadastro concluiu" |

Regra prática: intenção e navegação (abriu o checkout, clicou no CTA) ficam no analytics; fato consumado e
atribuível (assinatura ativada) entra na trilha. Os dois coexistem: o `sign_up` do GA continua.

## Evidência de mercado

- Nota: [`reference/research/audit-log-levels.md`](../../../specs/reference/research/audit-log-levels.md)
- Prevalência: 0 de 2 produtos de trilha para SaaS consultados (WorkOS, Supabase) têm nível no evento; 2 de 2
  provedores de nuvem (Google Cloud, AWS) separam por categoria, com a de alto volume opcional ou com retenção
  menor; o OWASP recomenda o atributo "Severity of event" e uma classificação documentada. O nível proposto
  aqui é categoria de negócio, não severidade de log.
- A trilha do Supabase Auth registra cadastro (`user_signedup`) e login junto das ações de segurança, o que
  sustenta colocar ciclo de vida da conta na trilha.
- O OWASP lista "addition or deletion of users" entre o que sempre registrar, o que justifica cobrir a criação
  de usuário pelo admin.
- Fontes: <https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html> ·
  <https://docs.cloud.google.com/logging/quotas> · <https://workos.com/docs/audit-logs> ·
  <https://supabase.com/docs/guides/auth/audit-logs> · <https://firebase.google.com/docs/firestore/ttl>
  (todas acessadas em 2026-11-24)

## Proposta — corte de MVP

- [x] Todo evento da trilha tem nível, `sensitive` ou `info`, definido pela ação e nunca pelo chamador. As 18
      ações atuais são `sensitive`.
- [x] Registros gravados antes desta entrega aparecem como `sensitive` na tela **e** no filtro (ver pergunta 2
      sobre como).
- [x] A criação de usuário pelo admin passa a gerar evento `sensitive`.
- [x] Eventos `info` gravados nos pontos únicos do servidor: cadastro (senha, Google ou link, num lugar só),
      e-mail confirmado, onboarding concluído, assinatura ativada, troca de plano, cancelamento agendado e
      assinatura encerrada. Os de assinatura não se repetem quando a Stripe reentrega o mesmo evento.
- [x] A listagem do admin ganha a coluna de nível e um filtro por nível (todos, sensível, informativo), que
      combina com os filtros de usuário e período.
- [x] Os eventos `info` carregam um instante de vencimento, conforme o prazo decidido na pergunta 3, e os
      `sensitive` não; o `docs/PRE-PRODUCTION.md` explica a política de TTL e o que muda no plano Spark.
- [x] Rótulos de nível e das ações novas nos 3 idiomas.

### Fora do corte

- Login a cada sessão nova como evento `info`. A coleção de sessões já guarda cada login com instante e
  dispositivo (`apps/api/(shared)/lib/session-tracker.ts:73-95`), e o último acesso já está no perfil
  (`user-activity-tracking`). Repetir isso na trilha dobra escritas sem resposta nova.
- Checkout iniciado, clique em plano e outros sinais de intenção: são funil, pertencem ao analytics.
- Criação e edição de `entity`: é o recurso de exemplo, e cada fork troca pelo seu domínio. O fork registra
  os próprios eventos `info` com a mesma chamada.
- Motivo do cancelamento (pedido do titular × falta de pagamento × disputa). A Stripe informa, mas o corte
  registra só o fato.
- Exportar a trilha, alerta em tempo real e um terceiro nível (`critical`): sem demanda registrada.
- Retenção configurável pela tela.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | nível no DTO e no filtro da listagem; ações novas no enum; possivelmente um tipo de alvo para assinatura |
| `apps/api` | nível derivado da ação no gravador; chamadas nos pontos únicos listados; filtro por nível na listagem; ator dos eventos do webhook (pergunta 4) |
| `apps/app` | coluna e filtro na tela de auditoria do admin |
| `apps/web` | N/A |
| `packages/*` | i18n dos níveis e das ações novas |
| Infra/env | dois índices compostos novos (nível + data; usuário + nível + data); TTL opcional no Blaze; backfill único para bases que já têm eventos |

## Riscos e trade-offs

- **Filtro e registro antigo.** O Firestore não encontra, com filtro de igualdade, documento sem o campo. Se o
  padrão for aplicado só na leitura, o filtro "sensível" esconde todo evento anterior à entrega. Por isso a
  pergunta 2 existe.
- **Índice esquecido no fork.** O emulador não cobra índice composto. Sem os índices novos publicados, filtrar
  por nível responde `PAGINATION_INDEX_MISSING`. O passo entra no `PRE-PRODUCTION.md`, como o índice atual.
- **Volume e custo.** Os eventos `info` escolhidos acontecem poucas vezes por usuário (cadastro, confirmação,
  onboarding, alguns de assinatura), então a cota gratuita de 20.000 escritas por dia não é ameaçada. O risco
  aparece se um fork registrar evento por requisição; a regra "fato consumado, uma vez por ocorrência" precisa
  estar escrita perto do gravador.
- **TTL só no Blaze.** A política de TTL exige faturamento. No Spark, o vencimento fica gravado sem efeito até o
  fork migrar ou rodar expurgo próprio. Cada exclusão pelo TTL é cobrada como delete.
- **Ator sem humano.** Hoje todo evento tem ator autenticado (`audit-recorder.ts:17-28`). Eventos do webhook
  não têm requisição de usuário, e a confirmação de e-mail chega sem sessão. Escolher mal o ator polui o
  filtro por usuário.
- **Dado pessoal com finalidade de análise.** Evento `info` guarda ator e rótulo, como os sensíveis. A
  anonimização na exclusão já cobre todos (`account-erasure.ts:227`), mas a finalidade "análise de uso"
  precisa constar no aviso de privacidade do fork, e a exportação do titular passa a trazer mais registros
  (teto de 5.000).
- **Fail-open herdado.** Uma falha de gravação perde o evento `info` em silêncio, com rastro só no stdout.
  Para análise, é aceitável; não há motivo para mudar o comportamento.

## Sinais de pronto

- Um usuário se cadastra, confirma o e-mail, conclui o onboarding, assina, troca de plano e cancela: os
  eventos aparecem na trilha como informativos, um por ocorrência, mesmo com o webhook reentregue.
- O admin filtra por "sensível" e vê exatamente o que via antes da entrega, inclusive eventos antigos.
- Filtro por nível combinado com usuário e período funciona no projeto do fork com os índices publicados.
- Um admin cria um usuário e o evento aparece como sensível.
- Excluir a conta do titular anonimiza os eventos informativos dele junto dos sensíveis.

## Perguntas em aberto

1. Nomes e quantidade de níveis? — **recomendação:** dois, `sensitive` e `info`; rótulos "Sensível" e
   "Informativo" na tela. Um terceiro nível não tem caso de uso hoje.
2. Como tratar os eventos gravados antes da entrega? — **recomendação:** gravar o nível em todo evento novo,
   ler ausência como `sensitive` no mapper (é verdade por construção: só existiam ações sensíveis) e oferecer
   um backfill único no molde do `backfill-instants`, com passo no `PRE-PRODUCTION.md`. Alternativa sem
   backfill: não persistir o nível e filtrar por lista de ações; evita a migração, mas amarra o filtro ao enum
   e consome o limite de valores do operador `in`.
3. Retenção diferente por nível? — **recomendação:** sim. `info` com vencimento padrão de 12 meses, ajustável
   por fork numa constante; `sensitive` sem vencimento, como hoje. O TTL fica documentado como passo do Blaze.
4. Quem é o ator dos eventos sem sessão (webhook da Stripe, confirmação de e-mail)? — **recomendação:** o
   próprio titular da conta, resolvido pelo cliente da Stripe ou pelo e-mail confirmado, com `requestId` da
   requisição. Se o titular não for encontrado, o evento não é gravado e o motivo vai para o log estruturado.
5. Filtro padrão ao abrir a tela? — **recomendação:** "todos", com a coluna de nível visível. Se o volume de
   `info` atrapalhar a investigação, troca-se o padrão depois sem migração.
6. Na exclusão de conta, eventos `info` do titular são anonimizados (como os sensíveis) ou apagados? —
   **recomendação:** anonimizados, como hoje. Mantêm a contagem agregada e não precisam de um segundo caminho
   de escrita numa coleção somente-adição.

## Conferência da entrega

Conferida em 2026-11-27 no código da branch `feat/audit-log-levels`, item a item contra o corte de MVP. O
`test/report.md` da feature serviu de pista; as âncoras abaixo foram lidas no código.

| item do corte | situação | evidência |
|---------------|----------|-----------|
| Nível definido pela ação, nunca pelo chamador; as 18 ações antigas são `sensitive` | entregue | `packages/sdk/src/types/audit/audit.ts:31-34` (enum `AuditLevel`), `:48` (campo no DTO); `apps/api/(shared)/lib/audit-level.ts:12-39` (mapa tipado sobre o enum inteiro, então ação nova sem nível quebra o typecheck); `apps/api/(shared)/lib/audit-recorder.ts:89` (o gravador deriva o nível) |
| Registro antigo aparece como `sensitive` na tela e no filtro | entregue, com passo manual | leitura: `apps/api/(shared)/mappers/audit-event.mapper.ts:31-35`; filtro: backfill em `apps/api/scripts/backfill-audit-levels.mjs`, exposto como `pnpm --filter api backfill-audit-levels` (`apps/api/package.json:15`); passo em `docs/PRE-PRODUCTION.md` §1.12 |
| Criação de usuário pelo admin gera evento `sensitive` | entregue | `apps/api/app/(routes)/users/route.ts:96-105` (`user.create`, gravado só depois de a criação dar certo) |
| Eventos `info` nos pontos únicos do servidor, sem repetir na reentrega da Stripe | entregue | cadastro: `apps/api/(shared)/lib/user-merge.ts:94-99`, dentro de `createDefaultUserProfile`, que atende o cadastro com senha (`apps/api/app/(routes)/auth/sign-up/route.ts:55`) e o primeiro contato Google ou link (`user-merge.ts:72`); e-mail confirmado: `apps/api/app/(routes)/auth/email-verification/confirm/route.ts:40-62`; onboarding concluído: `apps/api/app/(routes)/account/onboarding/route.ts:58-66`, com a decisão numa transação (`apps/api/(shared)/repositories/user.repository.ts:143`); assinatura: as quatro transições em `apps/api/(shared)/lib/subscription-audit.ts:25-53`, gravadas pelo webhook com chave `stripe_<event.id>_<ação>` (`apps/api/app/(routes)/webhooks/payments/route.ts:123-137`) por `recordAuditEventOnce` (`audit-recorder.ts:138-150`) |
| Coluna e filtro por nível na listagem do admin, combinando com usuário e período | entregue, com índices pendentes | API: `apps/api/(shared)/validation/audit.schema.ts:33`, `apps/api/(shared)/repositories/audit-event.repository.ts:243-245`, `apps/api/app/(routes)/audit-events/route.ts:16-20`; 503 `PAGINATION_INDEX_MISSING` sem índice: `route.ts:39-43`; tela: coluna em `.../admin/(pages)/audit/(pages)/(home)/AuditListClient.tsx:63-71`, filtro em `.../audit/(components)/AuditFilters.tsx:71-104`; índices em `firestore.indexes.json:62-77`; publicação em `docs/PRE-PRODUCTION.md` §1.11 |
| Vencimento só nos `info`; TTL e plano Spark documentados | entregue, com TTL pendente | `apps/api/(shared)/lib/audit-level.ts:3` (365 dias, constante do fork), `:49-54`; gravação em `audit-recorder.ts:126-129` e `:144-147`; política, comando e limite do Spark em `docs/PRE-PRODUCTION.md` §1.3 |
| Rótulos de nível e das ações novas nos 3 idiomas | entregue | `packages/internationalization/translations/apps/app/pages/admin/auditTrail.ts:17`, `:43-47` (pt-br), `:81`, `:105-109` (en), `:143`, `:171` (es) |

**Placar do `/test`:** 16 critérios, 14 aprovados e 2 não verificados por falta de infra externa (eventos de
assinatura no navegador sem Stripe em modo teste; o 503 sem projeto Firebase real). Os dois têm cobertura
unitária em `subscriptionAudit.test.ts`, `paymentsWebhookRoute.test.ts` e `auditEventsRoute.test.ts`. A
corrida de duas abas no onboarding, achada na rodada 1, foi corrigida com transação e remedida na rodada 2:
5 rodadas concorrentes, um evento e o mesmo `completedAt` em cada. `pnpm test` 15/15.

**Deriva.** Três diferenças em relação ao texto da spec. Em todas, a spec é que estava imprecisa, e a
implementação fica como está:

- o titular da confirmação de e-mail sai do `localId` que o Identity Toolkit devolve, e não de uma busca
  pelo e-mail confirmado, como dizia a recomendação da pergunta 4. Evita uma leitura no Auth e não depende
  de o e-mail continuar único. Sem titular, a rota registra `audit/subject-not-found` e não grava o evento;
- uma assinatura que volta de `past_due` ou `unpaid` para ativa não conta como `subscription.activate`. A spec
  não tratava esse caso, e gravar ali repetiria a ativação a cada atraso de pagamento;
- o onboarding passou a avançar dentro de uma transação do Firestore, fora do que a spec pedia, para que duas
  abas concluindo ao mesmo tempo gravem um evento só.

As perguntas 2, 3 e 4 não tiveram resposta antes do `/analyze`, e o `/cycle` adotou a recomendação da spec
em cada uma: nível gravado com leitura padrão `sensitive` e backfill, 12 meses de retenção só nos `info`,
titular como ator. A retenção dos eventos sensíveis continua sem prazo e segue como decisão do usuário.

**Pendências de infra no fork** (não reprovam a entrega): publicar os dois índices de `auditEvent` por
`level` (§1.11), rodar o backfill de nível em base que já tem eventos (§1.12) e, no plano Blaze, ligar a
TTL em `auditEvent.expiresAt` (§1.3), todas em `docs/PRE-PRODUCTION.md`.

**Branch:** `feat/audit-log-levels`. **PR:** #78, mergeada em 2026-11-27 às 19:36 UTC, merge `6943ce9`. A execução de
merge (`gh run 46057935539`) passou nos seis jobs (`verify`, `audit`, `secrets`, `changes`, `coverage` e `e2e`),
conferida na auditoria de 2026-11-27.
