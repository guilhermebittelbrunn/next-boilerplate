# QA: acesso por plano espelhado na API

Rodada autônoma (`/cycle --no-audit`), 2026-09-30, worktree `philadelphia-wt-plan-entitlements`, branch
`feat/plan-entitlements` (não protegida). Nada commitado, nada no índice. O `/review` está `in-progress` no
`STATE.md` e não há commit da feature (`git log e791d3a..HEAD` vazio): o plano de commits foi proposto e
ainda não executado.

Resultado: **bloqueado por um defeito de produção** (D1, abaixo). Os gates passam, 14 dos 16 critérios
passam e um fica 🔒 por depender de conta Stripe.

## Defeito de produção

### D1. `PlanGate` mostra o conteúdo bloqueado na carga fria (🟡)

`apps/app/shared/components/ui/PlanGate.tsx:40-48` decide pelo `isLoading` de `useMyAccount`. A query vem de
`useAuthorizedQuery`, que mantém `enabled: false` até o SDK receber o token (`sdkAuthorized`). Query
desabilitada e sem dados tem `isLoading === false`, e no servidor o React Query também não busca. Nesse
intervalo `account` é `undefined`, `denial` é `null` e o componente renderiza `children`.

O que medi, com a demo ligada e um titular sem assinatura:

- O HTML que o servidor devolve para `/pt-br/entities/create` contém o formulário (`id="birthdate"`) e não
  contém o texto do convite.
- No cliente, com um `MutationObserver` registrado antes do carregamento, o formulário apareceu entre 14 e
  67 ms e saiu entre 381 e 1282 ms, em três cargas frias; o convite entrou logo depois (429, 613 e 1382 ms).
  O `loadingFallback` (`FormSkeleton`) não chegou a substituir o formulário nessa janela.

A API continua recusando (403), então nada é gravado. O efeito é visual: a pessoa vê e pode começar a
preencher um formulário que logo some. Num fork que coloque dados pagos dentro do `PlanGate`, os filhos
montam e disparam as próprias queries antes do convite.

Repro: cobrança ligada com chaves fictícias, `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE=advanced-reports` nos dois
apps, login como `user@example.com` (seed, sem assinatura) e recarregar `/pt-br/entities/create`.

Correção sugerida (para o `/review`): tratar "sem dados e sem erro" como carregando, por exemplo
`if (!account && !isError) return loadingFallback;` no lugar do `if (isLoading)`, e cobrir em
`planGate.test.tsx` o caso `{ data: undefined, isLoading: false, isError: false }` esperando o fallback. O
teste atual simula o carregamento só com `isLoading: true`, estado que a query desabilitada nunca produz.

## Verificar no `/test`

| # | Item do `review.md` | Veredito |
|---|---------------------|----------|
| 1 | Suíte da API e do app | **Confirmado.** api 84 arquivos e 1115 testes, app 95 e 773 antes do meu teste (774 depois), todos verdes. `impersonationReadOnly`, `billingEntitlementKeys` e os dois testes de env passaram dentro da suíte. |
| 2 | `storageUpload.emulator.test.ts` | **Confirmado.** `pnpm --filter api test:emulator` com JDK 21: 4 arquivos, 170 testes; `storageUpload.emulator.test.ts` com 4 testes verdes. |
| 3 | 403 real e convite | **Confirmado.** `POST /entities` sem assinatura: 403 `PLAN_SUBSCRIPTION_REQUIRED`; com assinatura `active` sem o recurso: 403 `PLAN_FEATURE_REQUIRED`. Convites "Disponível para assinantes" e "Fora do seu plano" na tela; "Ver planos" leva a `/pt-br/account?tab=billing` com a aba "Cobrança" selecionada. Achado novo no caminho: D1. |
| 4 | Webhook assinado grava a lista | **Confirmado.** Evento com `reports-basic`, `advanced-reports`, `reports-basic` gravou `features: ["advanced-reports", "reports-basic"]` e `lastEventAt` como `Timestamp` (`_seconds: 1790818863`). `GET /account` devolveu `entitlements.lastEventAt: "2026-10-01T01:41:03.000Z"` e `planAccess.features` com os dois. |
| 5 | Convite em light, dark, mobile e 3 idiomas | **Confirmado.** Textos exatos em `criterios-aceite.md`. Light: card `lab(100 0 0)` com texto `lab(2.75 0 0)`, botão escuro. Dark: card `lab(2.75 0 0)` com texto `lab(98.26 0 0)`, botão claro. 375 px: card de 343 px, `scrollWidth` 375. O `Card` dentro do `Container contentOnly` fica alinhado ao breadcrumb, sem margem extra. |
| 6 | Toast de `PLAN_FEATURE_REQUIRED` com a tela desatualizada | **Confirmado** em pt-br (light, 1280), en (dark, 1280) e es (light, 375): "O seu plano não inclui este recurso.", "Your plan does not include this feature.", "Tu plan no incluye esta función.", seguidos de "(Código do erro: <request id>)". O tema do toast acompanha a página. |
| 7 | Cache da conta depois do evento de recursos | **Confirmado, com número maior que o previsto.** Tela aberta com "Fora do seu plano", evento entregue, `POST /entities` direto respondeu 201 em 10 s. Navegando para a lista e de volta à criação 5 s depois do carregamento, o convite continuou por mais de 80 s, até eu parar de observar: `staleTime` vencido não refaz a busca sem nova montagem (`refetchOnWindowFocus: false`). Na navegação seguinte, com a conta vencida, o convite durou cerca de 1 s e o formulário apareceu. O achado 🟢 do `/review` falava em "até um minuto"; o limite real é "até a próxima montagem depois de 60 s, ou recarregar". |
| 8 | Admin personificando titular sem plano | **Confirmado.** `admin@example.com` no painel do usuário, atuando como `user@example.com`: convite "Disponível para assinantes" e link para `/pt-br/account?tab=billing`, com o aviso "Modo somente leitura / Atuando como: user@example.com". Os botões de assinar não aparecem porque o catálogo falha com a chave fictícia ("Não foi possível carregar os planos."), então "botões desabilitados" não pôde ser observado. A recusa da escrita personificada vem só do teste de rota (`planGuard.test.ts`, `impersonationReadOnly.test.ts`). |
| 9 | Build com a variável vazia | **Confirmado.** `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE="" pnpm --filter app build`: exit 0, nenhuma linha com "error" no log, rota `/[locale]/entities/create` gerada. Nos chunks do cliente o valor ficou `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE:void 0`. |

## Critérios de aceite

| Critério | Status | Meio |
|----------|--------|------|
| Sem assinatura não cria pela API | ✅ | e2e (curl com ID token do emulador), rota |
| Assinatura sem recurso recebe o código de recurso | ✅ | e2e, rota |
| Assinatura com recurso cria | ✅ | e2e (curl 201 e envio pela tela), rota |
| A negação vence | ✅ | e2e (`deleted` com lista gravada: `subscribed:false`, 403, convite de assinatura), unit |
| Cobrança desligada ou `simple` não bloqueiam | ✅ | e2e (sem chaves: `enforced:false`, 201, formulário; `simple` com chaves: `enforced:false`, 201) |
| Demo desligada mantém a tela | ✅ | e2e (variável `""`: 201 e formulário direto, sem convite), build, unit |
| Webhook grava a lista | ✅ | e2e (harness assinado), unit |
| Ordem, reentrega e cliente desconhecido | ✅ | e2e (`duplicate:true`, `result=skipped`, `webhook-profile-not-found`, `has_more` com 500 e sem marcar) |
| Convite no lugar do formulário enquanto carrega | ❌ | e2e: D1 |
| Convite de assinatura traduzido com link | ✅ | e2e nos 3 idiomas |
| Convite de recurso traduzido | ✅ | e2e nos 3 idiomas |
| Tema e largura | ✅ | e2e light, dark, 375 px |
| Toast traduzido com a tela desatualizada | ✅ | e2e nos 3 idiomas, unit novo |
| Admin personificando vê o plano do titular | ✅ | e2e (convite e aviso), rota (recusa da escrita) |
| Tela reflete o recurso na próxima montagem | ✅ | e2e (tempos no item 7) |
| Entrega real da Stripe e catálogo | 🔒 | exige conta Stripe |

## Cobertura e gates

| Gate | Comando | Resultado |
|------|---------|-----------|
| Vitest dos afetados | `pnpm turbo run test --filter=api --filter=app --filter=@repo/internationalization` | 11 de 11 tarefas (9 do cache). api 84/1115, app 95/773, i18n 6/59 |
| Emulador | `pnpm --filter api test:emulator` (JDK 21 via `JAVA_HOME=/opt/homebrew/opt/openjdk@21`) | 4 arquivos, 170 testes |
| Teste novo | `pnpm --filter app exec vitest run __tests__/apiErrorCopy.test.ts` | 11 testes |
| Raiz | `pnpm test` | 14 de 14 tarefas (12 do cache). api 84/1115, `test:emulator` 4/170, app 95/774 |
| Typecheck | `pnpm --filter app typecheck` | sem erro |
| Lint | `pnpm check` | 822 arquivos, sem correção |
| Build | `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE="" pnpm --filter app build` | exit 0 |

Não usei `--force`: nada indicou cache sujo. O typecheck da API não foi medido de novo porque não toquei em
arquivo dela; vale o do `/review`.

### Teste criado

`apps/app/__tests__/apiErrorCopy.test.ts`, bloco "refused by the plan check": `PLAN_FEATURE_REQUIRED` e
`PLAN_SUBSCRIPTION_REQUIRED` percorrem a mesma cadeia do toast (`AxiosError` 403 → `FormattedError` →
`handleClientError`) e saem com o texto de cada idioma. Fecha no nível unitário a lacuna nova do `/review`;
a passada no browser confirmou o toast de verdade.

### Decisões de custo de teste

Nenhum teste da faixa cara foi criado. O plano não traz consulta nova, índice novo nem regra do Firestore, e
a busca por `stripeCustomerId` já existia. A gravação real do `Timestamp` pela transação e a leitura em ISO,
que o teste de rota não alcança porque mocka o registro mesclado, foram provadas contra o emulador nesta
passada. Como teste versionado, isso continua sem cobertura.

| Módulo tocado | O que já cobria |
|---------------|-----------------|
| `plan-access.ts`, `plan.ts` | `planAccess.test.ts`, `planGuard.test.ts`, `impersonationReadOnly.test.ts` |
| `entities/route.ts`, `entity-plan.ts` | `entitiesRoutePlanGate.test.ts`, `entityPlanEnv.test.ts` |
| webhook, `billing-state.ts`, `billing.ts`, `user.repository.ts` | `paymentsWebhookRoute.test.ts`, `billingState.test.ts`, `billingEntitlementKeys.test.ts`, `userRepositoryBilling.test.ts` |
| `account/route.ts`, `account-export.ts` | `accountRoute.test.ts`, `accountExportRoute.test.ts` |
| `PlanGate.tsx`, `create/page.tsx`, `entityPlanRequirement.ts` | `planGate.test.tsx`, `entityCreatePlanGate.test.tsx`, `entityPlanRequirement*.test.ts`. Não pegam D1 (ver a correção sugerida) |
| i18n | paridade (6/59) e o bloco novo em `apiErrorCopy.test.ts` |

## Evidências do e2e

Estado produzido com um harness Node em `/tmp` (já apagado): login no emulador de Auth para obter o ID
token, leitura e escrita direta no documento `user` pelo Admin SDK apontado para o emulador, e eventos
assinados com `stripe.webhooks.generateTestHeaderString` e segredo fictício.

- Sem assinatura, `GET /account`: `planAccess: { enforced: true, subscribed: false, features: [] }`.
- `customer.subscription.created` com `status: active` para `cus_qa_plan`: 200, `result=applied`, e
  `plan-label-unresolved reason=StripeAuthenticationError` no log (esperado com chave fictícia).
- `has_more: true`: a listagem na Stripe falha com a chave fictícia, o webhook responde
  `500 {"message":"something went wrong","ok":false}`, a lista não muda e a reentrega do mesmo id volta a
  dar 500. Nenhuma linha do log da API contém `advanced-reports` ou `reports-basic`.
- Aviso de hidratação no console (ids do Radix no `GlobalSidebar` e do formulário): aparece igual com a demo
  ligada e desligada, 13 ocorrências de `form-item-description` nos dois casos. Já existia e não vem desta
  feature.

Screenshots em `docs/features/plan-entitlements/test/e2e/` (01 a 09), descartados pelo `.gitignore`. O texto
acima é a evidência.

## Ambiente do e2e

Todas as portas estavam livres no início: 3000, 3001, 3002, 3003, 9099, 8080, 9199, 4001, 4400, 4500, 9150.
Não reutilizei nada de outro checkout.

| Serviço | Como subi |
|---------|-----------|
| Emuladores Auth, Firestore e Storage | `pnpm emulators` com `JAVA_HOME` do `openjdk@21`, seguido de `pnpm seed` |
| API (3002) | `pnpm --filter api dev` em quatro rodadas: chaves fictícias com a demo ligada; chaves fictícias com a variável `""`; sem chaves com a demo ligada; chaves fictícias com `NEXT_PUBLIC_PRODUCT_MODE=simple` |
| App (3000) | `pnpm --filter app dev` com a demo ligada, depois com `""`, depois ligada de novo |

O ambiente de cada processo foi montado a partir do `.env.example` com o bloco do emulador forçado, como faz
`apps/e2e/support/stackEnv.ts`. Os `.env` locais apontam para um projeto Firebase real e não foram editados;
nenhuma chamada foi a ele.

Derrubei tudo por PID: os launchers, os `next-server` filhos presos às portas que abri e os dois processos do
emulador (a CLI do Firebase e o JAR do Firestore). No fim as onze portas estavam vazias, inclusive depois do
`pnpm test` da raiz, que sobe e derruba os próprios emuladores. Apaguei `firestore-debug.log` da raiz e de
`apps/api` (ambos ignorados), o harness em `/tmp` e o estado salvo do browser. Fechei as duas sessões do
`agent-browser`. O `.next` do build do app ficou no disco, ignorado pelo git.

## Contas e dados de QA

Tudo viveu só no emulador e morreu com o processo. Não criei conta em projeto real, então nada entra no
`docs/PRE-PRODUCTION.md`.

- Contas do seed: `admin@example.com`, `user@example.com`, `user2@example.com` (senha pública do seed,
  documentada em `docs/SETUP.md`).
- `user@example.com` recebeu `stripeCustomerId: cus_qa_plan`, assinatura `sub_qa_plan` e a lista de
  recursos; entidades "QA plano curl", "QA plano UI" e "QA demo off". `user2@example.com` recebeu "QA
  billing off" e "QA simple".
- Documentos `paymentEvent` dos eventos do harness.

Este arquivo não traz senha, token nem chave. As chaves Stripe usadas eram fictícias, com o prefixo exigido
pelo `@repo/payments`, e não estão registradas aqui.

## Lacunas

| Lacuna | Veredito |
|--------|----------|
| `listActiveEntitlementKeys` sem teste (handoff) | Fechada pelo `/review`. A paginação real continua 🔒 |
| Testes de env não isolam o `\|\| undefined` (handoff) | Fechada pelo `/review` no teste e aqui no build (item 9) |
| `storageUpload.emulator.test.ts` não executado (handoff) | Fechada (item 2) |
| `GET /account` real com `lastEventAt` em ISO (handoff) | Fechada no e2e (item 4). Sem teste versionado |
| Toast de `PLAN_FEATURE_REQUIRED` sem teste (review) | Fechada: teste unitário novo e e2e nos 3 idiomas |
| Admin personificando vê o convite (handoff e review) | Fechada no e2e. "Botões desabilitados" na aba de cobrança continua aberto: sem catálogo, os botões não aparecem |
| Critérios 🔒 da seção 11 do plano | Continuam abertos; exigem conta Stripe |
| Lacuna nova: nenhum teste do `PlanGate` com a query desabilitada | Aberta, junto com D1 |

## Cross-check

- `apps/app` × `apps/web`: só o app tem o gate; a web não foi tocada.
- Comum × admin × personificação: comum e personificação medidos; o admin no painel admin não tem
  `subjectProfile` e não é alvo.
- `subscription` × `simple`: os dois medidos na API.
- Light × dark e 1280 × 375 px: medidos no convite e no toast.
- pt-br, en e es: medidos no convite e no toast.

## Roteiro manual (com conta Stripe de teste)

1. Cadastrar no Dashboard o recurso `advanced-reports` e ligá-lo a um produto com preço recorrente.
2. Acrescentar `entitlements.active_entitlement_summary.updated` aos eventos do endpoint `/webhooks/payments`.
3. Subir API e app com `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE=advanced-reports` nos dois e
   `pnpm --filter api dev:with-stripe`.
4. Com uma conta nova, abrir `/pt-br/entities/create`: convite "Disponível para assinantes".
5. "Ver planos", assinar o produto e voltar à criação: o formulário aparece quando o evento de recursos
   chega; criar uma entidade.
6. Remover o recurso do produto no Dashboard e conferir que o perfil perde a lista no próximo evento.
7. Cliente com mais de 10 recursos: conferir que a lista inteira chega ao perfil (`has_more`).

## Rodada 2

Rodada autônoma, 2026-10-01, mesma worktree e branch. Remede a correção do D1 e do item 7 feita na rodada 2
do `/review` (`PlanGate.tsx`, `useMyAccount.ts`, `planGate.test.tsx`, `planGateAccountRefresh.test.tsx`).
Cada medição foi gravada aqui ao terminar. O `/review` continua `in-progress` no `STATE.md` e não há commit
da feature.

### 1. Suíte (sem servidor)

| Gate | Comando | Resultado |
|------|---------|-----------|
| Suíte do app | `pnpm turbo run test --filter=app` | 8 de 8 tarefas, todas do cache (o hash bate com os arquivos atuais). app 96 arquivos e 778 testes, todos verdes. Na rodada 1 eram 95/774: entrou `planGateAccountRefresh.test.tsx` e os casos novos de `planGate.test.tsx`. |
| Raiz | `pnpm test` com `JAVA_HOME` do `openjdk@21` | 14 de 14 tarefas, 13 do cache; só `test:emulator` rodou (4 arquivos, 170 testes). api 84/1115, app 96/778, web 13/82, i18n 6/59, demais pacotes verdes. |

Sem `--force`. Depois do `pnpm test`, as portas 9099, 8080, 9199, 4001, 4400 e 4500 ficaram vazias: o
`test:emulator` derrubou os próprios emuladores.

### 2. Ambiente

Todas as portas estavam livres às 02:50. Subi em background, com log em `/tmp`, e esperei cada porta com
laço limitado a 120 s:

- `pnpm emulators` com `JAVA_HOME` do `openjdk@21`: pronto em cerca de 10 s (Auth 9099, Firestore 8080,
  Storage 9199, UI 4001). `pnpm seed` recriou `admin@example.com`, `user@example.com` e `user2@example.com`.
- `pnpm --filter api dev` e `pnpm --filter app dev`, prontos em cerca de 10 s. Ambiente de cada processo
  montado a partir do `.env.example` com o bloco do emulador forçado, como na rodada 1, mais
  `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE=advanced-reports`, `NEXT_PUBLIC_PRODUCT_MODE=subscription` e chaves
  Stripe fictícias geradas na hora (não registradas aqui).

Estado de partida, lido por `GET /account` com ID token do emulador:

- `user@example.com`: `planAccess: { enforced: true, subscribed: false, features: [] }`.
- `user2@example.com`, depois de `customer.subscription.created` (`active`) e
  `entitlements.active_entitlement_summary.updated` assinados com `generateTestHeaderString` (os dois 200,
  `result=applied`): `planAccess: { enforced: true, subscribed: true, features: ["advanced-reports",
  "reports-basic"] }`.

Nota de execução: `agent-browser wait --url "**/dashboard**" --timeout 30000` não respeitou o próprio
timeout depois do login e travou a chamada (o login tinha ido para `/pt-br`, não para `/dashboard`). Matei
o processo do `wait` por PID; a sessão do browser seguiu viva. Daqui em diante as esperas são por `eval`.

### 3. D1 na carga fria: corrigido

`user@example.com` (sem assinatura), `/pt-br/entities/create`, observador registrado como init script do
`agent-browser` antes de qualquer navegação. Ele anota, a cada mutação do DOM, se existe `#birthdate`, se o
texto do convite está em `main` e quantos `[data-slot="skeleton"]` há em `main` (tempos em ms desde o
início da navegação).

| Carga | Linha do tempo | Formulário visto |
|-------|----------------|------------------|
| 1 (primeira compilação da rota, 2,7 s) | 2972 vazio → 2986 skeleton (5) → 2990 skeleton (12) → 3347 convite | nunca |
| 2 (reload) | 150 vazio → 164 skeleton (5) → 167 skeleton (12) → 570 convite | nunca |
| 3 (reload) | 116 vazio → 128 skeleton (5) → 133 skeleton (12) → 538 convite | nunca |

Os 12 skeletons são o `FormSkeleton` (6 campos, rótulo e caixa). O skeleton fica cerca de 400 ms e dá lugar
direto ao convite "Disponível para assinantes".

HTML do servidor (mesma URL, buscada com os cookies da sessão): 119.463 bytes, sem `id="birthdate"`, sem o
texto do convite, 17 ocorrências de `data-slot="skeleton"` e sem redirecionamento para o login. Na rodada 1
o mesmo HTML trazia o formulário.

### 4. Titular com o recurso na carga fria: confirmado

`user2@example.com` (assinatura `active` com `advanced-reports`), mesma página, uma navegação e dois reloads:

| Carga | Linha do tempo |
|-------|----------------|
| 1 | 114 vazio → 123 skeleton (5) → 128 skeleton (12) → 455 formulário |
| 2 | 108 vazio → 117 skeleton (5) → 120 skeleton (12) → 427 formulário |
| 3 | 112 vazio → 120 skeleton (5) → 134 skeleton (12) → 437 formulário |

Em nenhuma das três o observador registrou o convite: o skeleton troca direto pelo formulário em cerca de
300 ms.

### 5. Item 7 (recurso liberado depois da assinatura): corrigido

Preparo: `user@example.com` recebeu `customer.subscription.created` (`active`) sem recursos. Com a criação
aberta e o convite "Fora do seu plano" na tela, entreguei `entitlements.active_entitlement_summary.updated`
com `advanced-reports` (200, `GET /account` passou a devolver `features: ["advanced-reports"]`) e, no mesmo
comando, um script na página clicou em "Entidades" na barra lateral e depois em "Novo", navegação do
cliente, sem recarregar. Tempos em ms desde o primeiro clique:

| Momento | ms |
|---------|----|
| Última busca da conta antes do clique (dentro do `staleTime` de 60 s) | 7.248 ms antes |
| Lista com o botão "Novo" | 384 |
| URL de criação | 428 |
| `GET /account` disparado pela montagem do gate | 424 → 467 (uma única busca na navegação) |
| Convite ainda visível, vindo do cache | 428 a 463 |
| Formulário (`#birthdate`) | 503 |

Do clique em "Novo" ao formulário foram cerca de 120 ms, com uma busca da conta. O convite antigo aparece
por uns 35 ms enquanto a busca está no ar, porque o gate desenha primeiro a conta em cache. Na rodada 1, no
mesmo percurso, o convite ficou mais de 80 s. Com a tela parada, sem navegação, o convite continua até a
próxima montagem: comportamento aceito pelo `/review`, não remedido.

Uma tentativa anterior do script falhou porque procurava um link para `/entities/create`; na lista o
acesso é o botão "Novo". Antes de repetir, voltei a lista de recursos para vazia por evento e recarreguei
a criação.


### 6. P12 (conta indisponível): confirmado

Preparo: `user@example.com` recebeu `customer.subscription.deleted` (`canceled`, 200) e o `GET /account`
passou a devolver `planAccess: { enforced: true, subscribed: false, features: [] }`. Depois, no
`agent-browser`, `network route "http://localhost:3002/account" --abort`: toda busca da conta falha por
erro de rede (status 0 na Resource Timing). A aba não caiu, então não precisei da resposta 500.

Carga fria de `/<idioma>/entities/create` com o observador do item 3:

| Idioma | Linha do tempo | Buscas da conta | POST `/entities` | Toast |
|--------|----------------|-----------------|------------------|-------|
| pt-br | 155 vazio → 175 skeleton (5) → 180 skeleton (12) → 1823 formulário | 2, as duas abortadas (622 e 1627 ms na primeira carga) | 403 `{"error":{"code":"PLAN_SUBSCRIPTION_REQUIRED"}}` | "Esta ação exige uma assinatura ativa. (Código do erro: <uuid>)" |
| en | 142 vazio → 169 skeleton (5) → 1601 formulário | 2 abortadas | 403 `PLAN_SUBSCRIPTION_REQUIRED` | "This action requires an active subscription. (Error code: <uuid>)" |
| es | 108 vazio → 130 skeleton (5) → 1497 formulário | 2 abortadas | 403 `PLAN_SUBSCRIPTION_REQUIRED` | "Esta acción requiere una suscripción activa. (Código del error: <uuid>)" |

Com a conta fora do ar, o gate libera o formulário. Ele fica cerca de 1,4 s no skeleton porque a query
tenta de novo uma vez antes de desistir. Em nenhum momento o observador registrou o convite. A API barra o
envio com o código certo, e o toast sai traduzido nos três idiomas, com o identificador da requisição
anexado como nos demais erros do app.

Fora de escopo: na carga de `/en` o `document.documentElement.lang` ainda dizia `pt-br`, e na de `/es`
dizia `en`, no momento da leitura. Não investiguei.

### 7. Skeleton em light, dark e 375 px: não medido nesta rodada

Quatro execuções seguidas do agente de QA travaram durante a passada de browser desta rodada (dez minutos
sem progresso, encerradas pelo watchdog). Os itens 1 a 6 ficaram gravados acima porque cada um foi escrito
ao terminar. O item 7 não chegou a ser medido em texto: só existem prints de uma tentativa anterior em
`test/e2e/r2-0*.png`, que não valem como evidência.

O risco é pequeno. O skeleton é o `FormSkeleton` que o app já usa em outras telas, a correção não mexeu
nele, e o convite foi medido em light, dark e 375 px na rodada 1. Fica como item aberto para a próxima
passada de browser.

Os processos que os agentes deixaram de pé (emulador, `next dev` da api e do app, daemon do `agent-browser`
e o Chrome dele) foram derrubados por PID ao fim da rodada. As portas 3000, 3002, 4400, 4500, 8080, 9099,
9150 e 9199 ficaram livres.

### Placar da rodada 2

D1 corrigido. Placar dos critérios: 15 ✅, 0 ❌, 1 🔒 (só fecha com conta Stripe real). Item aberto: o
skeleton em light, dark e 375 px, sem medição nesta rodada.
