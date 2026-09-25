# Relatório de QA: seção de billing na home do admin

Rodada autônoma do `/cycle`, workspace `st-johns`, branch `admin-billing-insights` (não protegida; o nome
fora do padrão e a branch `feat/admin-billing-insights` a criar no primeiro commit estão no
`review/review.md`). Não criei branch, não commitei e não usei `git stash`. Não alterei nenhum arquivo de
código nem de teste: esta etapa só gravou este relatório, `test/criterios-aceite.md` e o `STATE.md`.

## Placar

| Resultado | Critérios |
|---|---|
| ✅ aprovado | 18 |
| ❌ reprovado, defeito anterior à entrega e fora do escopo dela | 1 |
| 🔒 não verificado (só Stripe real ou projeto Firebase real prova) | 4 |

Placar depois da rodada 2 (seção "Rodada 2", no fim). Na rodada 1 eram 17 ✅, 2 ❌ e 4 🔒; o texto logo
abaixo descreve a rodada 1.

Dois defeitos. O D1 é desta entrega: a 320 px os rótulos do eixo "Básic…" e "Empre…" se sobrepõem em
2 px, porque a conta que fixou o corte em 6 caracteres supôs colunas de 41 px e elas têm 38 px. O D2 vem
de antes: todo componente client que usa `getDictionary()` renderiza em pt-br no servidor, então em
`/en` e `/es` a home do admin inteira, seção nova incluída, dá aviso de hidratação. Repro e sugestão na
seção "Defeitos". Pelo D1, a etapa volta ao `/review`.

## Cobertura automatizada

| Comando | Resultado |
|---|---|
| `pnpm test` (raiz, sem `--force`) | 10/10 tasks, 10 em cache, 147 ms (FULL TURBO). api 882 (72 arquivos), app 597 (76), internationalization 47 (5), web 41 (8), auth 101, email 137, shared 44, security 31, payments 22, analytics 34 |
| `pnpm --filter api test` (fora do turbo, sem cache) | 882/882 em 72 arquivos, 4,1 s |
| `pnpm --filter app test` (fora do turbo) | 597/597 em 76 arquivos, 16,1 s |
| `pnpm --filter @repo/internationalization test` (paridade) | 47/47 em 5 arquivos |
| `pnpm --filter api typecheck`, `pnpm --filter app typecheck`, `pnpm --filter @repo/sdk typecheck` | código 0 nos três |

Os números batem com os do handoff (api 882/72, app 597/76, i18n 47/5). Rodei as suítes dos workspaces
direto, fora do turbo, para ter uma medição sem cache; o `pnpm test` da raiz saiu todo do cache e com o
mesmo número. Não remedi `pnpm check`: o `/review` mediu 723 arquivos limpos e depois dele nenhum arquivo
mudou. `@repo/sdk` não tem script de teste; o contrato dele entra pelo typecheck e pelos testes de hook e
de prefetch do app.

### Testes criados

Nenhum. Cada comportamento que cabe num teste barato já tem um:

| Rota ou módulo | O que já cobria |
|---|---|
| `GET /payments/summary` | `paymentsSummaryRoute` (desligada nos três jeitos, três blocos, `getStripe` nunca chamado, 503, falha alheia sobe, 403, 401, só `GET`) |
| webhook `invoice.paid` e fim do eco | `paymentsWebhookRoute` (primeira cobrança, `subscription_cycle`/`subscription_update`/`manual`, reprocesso, 500 sem marcar nas duas gravações, duplicado, log sem PII, nome do plano nos ramos de assinatura) |
| montagem do resumo | `billingSummary` (mês UTC com virada de ano e bissexto, soma por moeda, ranking, ativação sem assinante) |
| repositórios | `paidInvoiceRepository`, `subscriptionActivationRepository`, `planLabelRepository`, `userRepositoryBilling` |
| nome do plano | `planLabelResolution` (cache fresco, `expand` com timeout e sem retry, renovação, falha da Stripe e do Firestore) |
| app | `billingInsights`, `billingInsightsSection`, `useBillingSummary`, `adminHomePrefetch`, `adminHomeClient`, `adminHomeActivityDegraded` |
| i18n | paridade e `chartAxisLabels` |

Os dois defeitos apontam lacunas que teste unitário não fecha. O D1 é de layout: o jsdom não mede
largura de texto, e o modelo aritmético de `chartAxisLabels.test.ts` é justamente o que errou. O D2 é
de hidratação, que só aparece com servidor e navegador de verdade. Não escrevi teste que falha para
registrar defeito de produção; isso fica para quem corrigir.

### Decisões de custo de teste

Nenhum teste da faixa cara entrou na suíte. O que a lista fechada justificaria (o `in` em
`subscription.status` com `select`, o `Timestamp` gravado e relido como ISO, o `create()` concorrente
com `ALREADY_EXISTS`) eu rodei contra o emulador pelo harness da rodada B, com o resultado abaixo. Como
teste versionado, a lacuna continua aberta: a suíte não tem infraestrutura de Vitest contra emulador, e
montá-la é o escopo da spec `e2e-testing`.

## Verificar no `/test` (lista do `review.md`)

| # | Item | Veredito |
|---|---|---|
| 1 | `ALREADY_EXISTS` real | **Confirmado.** `invoice.paid` de `in_qa1` com `event.id` novo: 200 `{"ok":true}`, continua um documento. Duas entregas paralelas com `event.id` diferentes para `in_qa_conc` e três paralelas com o mesmo `event.id` para `in_qa_conc2`: as cinco responderam 200 `{"ok":true}`, e ficou um documento em `paidInvoice` e um em `subscriptionActivation` por fatura, sem `webhook-handler-failed` no log. Um `create()` direto sobre `paidInvoice/in_qa1` no emulador lançou `code 6` (`6 ALREADY_EXISTS: entity already exists`), o número que `isAlreadyExistsError` compara. Receita do mês igual antes e depois |
| 2 | Ordem: fatura antes do checkout | **Confirmado.** `invoice.paid` `subscription_create` de `cus_qa2` antes de qualquer vínculo: a contratação `sub_qa2` saiu com `subscriber: null` e a receita já somava US$ 49,00. Depois de `checkout.session.completed` e `customer.subscription.created`, a mesma linha passou a trazer `qa-billing-insights@example.com`, e o `recordedAt` de `subscriptionActivation/sub_qa2` ficou idêntico (`isEqual` verdadeiro, 2 documentos na coleção) |
| 3 | Fatura sem preço | **Confirmado.** `in_qa_manual`, `billing_reason: manual`, sem `parent` e sem linhas, R$ 15,00: gravou `paidInvoice` com `subscriptionId: null` e `priceId: null`, não criou ativação, somou na receita (R$ 59,00 → R$ 74,00) e o `requestId` dela só aparece em `webhook-invoice-recorded billingReason=manual`, sem `plan-label-unresolved` |
| 4 | Duas moedas e moeda sem casas | **Confirmado.** Três linhas no mês, ordenadas pelo valor bruto: `brl` 7400, `usd` 4900, `jpy` 1000, com a nota de sem conversão. JPY 1000 aparece como "JP¥ 1.000" (pt-br), "¥1,000" (en) e "1000 JPY" (es), sem divisão por 100 |
| 5 | Borda do mês em UTC | **Confirmado.** `in_qa_aug` com `paid_at` 2026-08-31T23:59:59Z ficou fora do total; `in_qa_sep1` com 2026-09-01T00:00:00Z entrou (R$ 58,00 → R$ 59,00, 3 faturas). `trackingSince` recuou para `2026-08-31T23:59:59.000Z`. No emulador, `paidAt` e `activatedAt` estão gravados como `Timestamp`, e a API devolve ISO (`activatedAt: "2026-09-25T13:30:48.000Z"`) |
| 6 | `in` com `select` contra o emulador | **Confirmado.** Seis perfis com `status: active` em seis preços contaram 6. Depois de `customer.subscription.deleted` (`canceled`) do `price_qa_year`, a contagem caiu para 5 planos. O soft delete de `qa-billing-insights@example.com` pelo `DELETE /users/:id` (204) tirou `price_qa_pro` da contagem (4 planos), a contratação dele virou "Usuário removido" e a receita ficou igual |
| 7 | Rota com credencial real | **Confirmado.** Rodada A (chaves vazias): sem token e com `Bearer x`, 401 `AUTH_INVALID_TOKEN`; `user@example.com`, 403 `ADMIN_FORBIDDEN`; admin do seed, 200 `{"data":{"enabled":false}}`; `POST`, 405. Home sem título nem esqueleto da seção nos 3 idiomas. Rodada B (chaves falsas), admin: 200 com os três blocos. Nenhuma chamada à Stripe na leitura: 72 `GET /payments/summary` durante a rodada B e nenhum log de Stripe; os 8 `plan-label-unresolved` do log pertencem a `requestId` de entregas do webhook |
| 8 | Degradação 503 | **Confirmado na UI, com a resposta forçada.** Um proxy temporário na 3012 respondeu 503 `SUMMARY_INDEX_MISSING` a `GET /payments/summary` e repassou o resto à API; subi o app com `NEXT_PUBLIC_API_URL` apontando para ele. A seção mostrou "O resumo está indisponível no momento. Tente de novo em instantes." / "The summary is unavailable right now. Try again shortly." / "El resumen no está disponible ahora. Inténtalo de nuevo en unos instantes.", com cartões de usuários ("Usuários 6") e o bloco de atividade intactos. O 503 da própria rota só o teste de rota prova; o de um projeto real fica 🔒 |
| 9 | Modo `simple` | **Confirmado.** App com `NEXT_PUBLIC_PRODUCT_MODE=simple`: `/pt-br/admin` e `/en/admin` sem a seção (só o `h2` de atividade), nenhuma requisição a `payments` no navegador e nenhum `GET /payments/summary` novo no log da API (14 antes e depois). API em `simple` com as duas chaves: 200 `{"data":{"enabled":false}}`. API sem `NEXT_PUBLIC_APP_URL` com as duas chaves: o mesmo |
| 10 | Corpo do webhook | **Confirmado.** Todas as entregas de `invoice.paid` levavam `customer_email`, `customer_name` e `customer_address`; toda resposta de sucesso foi exatamente `{"ok":true}`. Duplicado: `{"ok":true,"duplicate":true}`. Sem chaves: 503 `PAYMENTS_NOT_CONFIGURED`. Nenhuma linha `[payments]` do log tem `@` ou valor |
| 11 | `ensurePlanLabel` com a chave falsa | **Confirmado.** Log `plan-label-unresolved requestId=… reason=StripeAuthenticationError`, só com o tipo do erro, e o webhook respondeu 200. A entrega mais lenta levou 866 ms (a primeira depois do boot); as seguintes, de 230 a 345 ms. Com `planLabel/price_qa_pro` gravado à mão (`resolvedAt` agora), um `customer.subscription.updated` desse preço respondeu em 26 ms e não gerou `plan-label-unresolved` |
| 12 | Eixo e tooltip | **Derrubado a 320 px.** Com 6 planos (4 barras + "Outros"), a 375 px os cinco rótulos cabem nos 3 idiomas (menor intervalo: 10 px). A 320 px, "Básic…" termina em x=95 e "Empre…" começa em x=93: 2 px de sobreposição nos 3 idiomas, e na tela os dois se leem como uma palavra só ("Básic…Empre…"). É o D1. Tooltip: ao passar o mouse, mostra o rótulo cortado ("Básic…" 1, "Profi…" 1, "Outros" 2). O achado S1 do `/review` se confirma |
| 13 | Hidratação e `Intl` | **Derrubado em en e es; causa anterior à entrega (D2).** Em pt-br, recarregar a home com dados não gerou nenhum erro novo no console. Em en e es, "Hydration failed" a cada carga. O HTML do servidor de `/en/admin` e `/es/admin`, mesmo com `x-locale=en`/`es`, vem com "Olá", "Atividade", "Cobrança" e "R$ 74,00"; o navegador reescreve em inglês ou espanhol. Texto final no navegador na seção "Intl no navegador" abaixo |
| 14 | Light, dark e mobile | **Confirmado**, fora os rótulos a 320 px do item 12. Cartões com fundo `lab(2.75 0 0)` e texto `lab(98.26 0 0)` no dark; texto secundário `lab(66.1 0 0)` sobre `lab(2.75 0 0)`. O aviso de `invoice.paid` ausente aparece em light (estado real) e em dark a 375 px (resposta forçada), com borda `lab(15.2 0 0)` e 296 px de largura. `scrollWidth` 360 a 375 px e 305 a 320 px: sem rolagem horizontal |

## Critérios de aceite: status por item

Texto completo em `test/criterios-aceite.md`.

| # | Critério | Status | Meio |
|---|---|---|---|
| 1 | A seção some com a cobrança desligada | ✅ | e2e rodada A (3 idiomas, light, dark, mobile 375), HTTP com chaves vazias e sem `NEXT_PUBLIC_APP_URL`, teste de rota |
| 2 | A seção some no modo `simple` | ✅ | e2e (navegador e log da API), HTTP com a API em `simple`, `useBillingSummary`, `adminHomePrefetch` |
| 3 | Só admin lê o resumo | ✅ | HTTP (401, 401, 403, 200, 405), teste de rota; personificação por `adminHomePrefetch` |
| 4 | Receita do mês com moeda e critério | ✅ | emulador + e2e (R$ 74,00, JPY sem divisão, critério, "Contando desde", "Nenhuma fatura paga neste mês"), `billingSummary` |
| 5 | Moedas separadas, sem conversão | ✅ | emulador + e2e (três moedas), `billingSummary` |
| 6 | Mês fechado em UTC | ✅ | emulador (23:59:59Z fora, 00:00:00Z dentro, `Timestamp`↔ISO), `billingSummary` para dezembro e fevereiro bissexto |
| 7 | Reentrega do mesmo evento | ✅ | harness assinado (`{"ok":true,"duplicate":true}`, receita igual) |
| 8 | Reprocesso da mesma fatura | ✅ | harness (evento novo, 2 e 3 entregas paralelas, código 6 real) |
| 9 | Falha no handler não perde nem duplica | ✅ | `paymentsWebhookRoute` (500 sem marcar nas duas gravações); não provoquei falha de gravação no emulador |
| 10 | Contratações recentes | ✅ | emulador (ordem, `subscription_cycle` e `manual` sem contratação), teste de rota; o corte em 5 só por `billingSummary` (a rodada teve 4 contratações) |
| 11 | Usuário apagado aparece como removido | ✅ | emulador + e2e (soft delete, fatura antes do vínculo), `userRepositoryBilling` para Auth ausente |
| 12 | Planos mais vendidos | ✅ | emulador + e2e (6 planos → 4 + "Outros" 2, `canceled` fora), `billingInsights`; "Nenhuma assinatura vigente" por teste de componente |
| 13 | Nome do cache, home sem Stripe | ✅ | harness (`StripeAuthenticationError`, cache fresco sem chamada, 72 leituras sem Stripe), `planLabelResolution` |
| 14 | Orientação para quem não vendeu | ✅ | e2e (cartão único com o texto de orientação) |
| 15 | Aviso sem fatura registrada | ✅ | e2e (aparece com plano e sem fatura, some depois de `in_qa1`; dark por resposta forçada) |
| 16 | Índice recusado degrada só a seção | ✅ | e2e com resposta forçada nos 3 idiomas, teste de rota |
| 17 | Webhook sem eco | ✅ | harness (`{"ok":true}` com PII no payload), rodada A (503), `paymentsWebhookRoute` para assinatura inválida |
| 18 | Sem divergência de hidratação | ❌ pré-existente, fora do escopo | e2e: limpo em pt-br (remedido na rodada 2), "Hydration failed" em en e es. D2, causa anterior à entrega, com dono em `specs/BACKLOG.md:480` |
| 19 | Tema e tamanho de tela | ✅ | rodada 1: tokens e empilhamento corretos, rótulos sobrepostos a 320 px (D1). Rodada 2: corte em 5, folga mínima de 5,1 px a 320 px nos 3 idiomas, light e dark |
| 20 | Entrega real de `invoice.paid` | 🔒 | exige conta Stripe ou Stripe CLI |
| 21 | Resolução real do nome do plano | 🔒 | exige chave Stripe válida |
| 22 | Forma real do payload `2025-09-30.clover` | 🔒 | o harness imita os campos; só evento real confirma |
| 23 | Nenhum índice composto em projeto real | 🔒 | o emulador serve qualquer consulta; conferência pós-deploy (9.1 do plano) |

## Defeitos

A correção sugerida é hipótese, para o `/review` medir.

**D1. A 320 px, rótulos do eixo do gráfico de planos se sobrepõem.** Desta entrega.
Repro: rodada B com 6 planos vigentes, nomes em `planLabel` "Básico Anual", "Empresarial Premium", "Pro",
"Profissional Plus", "Starter" e um sem nome; viewport 320×812; `/pt-br/admin` (en e es iguais). Medido
pelo `getBoundingClientRect` de `.recharts-cartesian-axis-tick-value`: "Básic…" 57–95, "Empre…" 93–136,
"Pro" 143–162, "Profi…" 174–207, "Outros" 210–248. Os centros dos ticks ficam a cerca de 38 px um do
outro, e "Empre…" mede 43 px com a fonte de 12 px. O comentário de `PLAN_AXIS_LABEL_MAX_CHARS` e o de
`chartAxisLabels.test.ts` supõem 41 px por coluna. A 375 px nada se sobrepõe.
Sugestão: cortar em 5 caracteres ("Empr…" deve ficar abaixo de 36 px) e medir de novo a 320 px, ou
reduzir a fonte do eixo nessa largura; atualizar o comentário e o teste de i18n com o número medido.

**D2. Componentes client renderizam em pt-br no servidor em `/en` e `/es`.** Anterior à entrega; a seção
nova herda.
Repro: com a sessão do admin, `curl -H 'Cookie: <sessão>; x-locale=en' http://localhost:3000/en/admin`
devolve HTML com "Olá", "Atividade", "Cobrança" e "R$ 74,00"; no navegador o console registra "Hydration
failed", com os diffs "Platform"/"Plataforma" e "Inicio"/"Início" na sidebar e no breadcrumb. A causa está
em `packages/internationalization/utils/cookies.ts`: `getCookie` devolve `null` quando
`typeof window === "undefined"`, então `getDictionary()` de `@repo/internationalization/client` resolve
pt-br no servidor. Não depende de `next dev`: o desvio vem do ambiente de execução. `AdminHomeClient` e
`UserActivitySection` já usavam o mesmo `getDictionary()` antes desta feature, então o aviso já existia
em en e es.
Sugestão: passar o locale do segmento `[locale]` aos componentes client (prop ou `useParams`) e usar
`getDictionaryForLocale`. Corrigir na raiz vale para a sidebar, o breadcrumb e as seções da home.

## Evidências e2e (o texto é a prova)

Os screenshots em `test/e2e/` (01 a 14) serviram para eu conferir durante a execução; o `.gitignore`
descarta a pasta. Em captura de página inteira o recharts sai sem as barras (a animação reinicia); as
barras existem no DOM e aparecem nas capturas de viewport (08, 10).

### Rodada A: chaves Stripe vazias

- HTTP no item 7. Webhook sem chaves: 503 `PAYMENTS_NOT_CONFIGURED`.
- `/pt-br/admin`, `/en/admin`, `/es/admin`: os `h2` da página são só "Atividade"/"Activity"/"Actividad".
  O prefetch do servidor chama `GET /payments/summary` (200 no log da API) e o navegador não faz
  requisição a `payments`, porque o cache hidratado já tem `enabled: false`.
- Dark e mobile 375 px (es): mesma ausência, `scrollWidth` 375.

### Rodada B: chaves falsas só no ambiente do processo

`STRIPE_SECRET_KEY=sk_test_offline_qa` e `STRIPE_WEBHOOK_SECRET=whsec_offline_qa` no processo da API; o
`.env` não foi tocado. O harness em `/tmp` assinou os eventos com
`stripe.webhooks.generateTestHeaderString` e leu o emulador com o Admin SDK.

| Passo | O que a home mostrou (pt-br) |
|---|---|
| antes de qualquer evento | "Nenhuma assinatura ainda" com o texto de orientação, sem cartão de valor |
| checkout + `customer.subscription.created` de `user@example.com` | aviso "Há assinaturas vigentes, mas nenhuma fatura paga foi registrada…", "Recebido em setembro de 2026" com "Nenhuma fatura paga neste mês.", "Nenhuma contratação registrada ainda.", uma barra "Plano…" e a linha "Plano sem nome / mensal · price_qa_basic / 1" |
| `invoice.paid` `in_qa1` R$ 29,00 | aviso some; 2900 `brl`, 1 fatura; contratação de `user@example.com` |
| renovação, segunda pessoa em USD, bordas do mês, manual, JPY | "R$ 74,00 / US$ 49,00 / JP¥ 1.000", "Valores em moedas diferentes aparecem separados, sem conversão.", "Contando desde 31 de ago. de 2026." |
| `planLabel` gravado à mão, 6 planos | barras "Básic…", "Empre…", "Pro", "Profi…", "Outros"; lista "Básico Anual / anual / 1", "Empresarial Premium / anual / 1", "Pro / mensal / 1", "Profissional Plus / a cada 3 meses / 1", "Outros / 2" |
| soft delete da segunda pessoa, `canceled` de um plano | contratação "Usuário removido / Pro · mensal / 25 de set. de 2026" em `text-muted-foreground`; lista com "Empresarial Premium", "Profissional Plus", "Starter", "Plano sem nome"; receita igual |

### Intl no navegador

| | pt-br | en | es |
|---|---|---|---|
| título | Recebido em setembro de 2026 | Received in September 2026 | Recibido en septiembre de 2026 |
| BRL | R$ 74,00 | R$74.00 | 74,00 BRL |
| USD | US$ 49,00 | $49.00 | 49,00 US$ |
| JPY | JP¥ 1.000 | ¥1,000 | 1000 JPY |
| desde | Contando desde 31 de ago. de 2026. | Counting since Aug 31, 2026. | Contando desde 31 ago 2026. |
| data da contratação | 25 de set. de 2026 | Sep 25, 2026 | 25 sept 2026 |
| intervalo | mensal · anual · a cada 3 meses | monthly · yearly · every 3 months | mensual · anual · cada 3 meses |
| plano sem nome | Plano sem nome | Unnamed plan | Plan sin nombre |

O valor isolado de R$ 29,00 não ficou na tela em en e es, porque a receita já somava outras faturas
quando passei pelos idiomas; a formatação de BRL nos três idiomas está na linha "BRL" acima. "Usuário
removido" só apareceu em pt-br; en e es dessa chave entram pelo teste de componente e pela paridade.

## Observações que não reprovam

- A ativação só leva intervalo quando o preço tem `planLabel`. Sem ele, a linha da contratação mostra
  "Plano sem nome" sem intervalo, enquanto a lista de planos mostra "mensal" para o mesmo preço, que vem
  do snapshot da assinatura.
- A ordem das moedas compara valor bruto na menor unidade (achado S3): `brl` 7400, `usd` 4900, `jpy`
  1000. Confirmado; é só ordem de exibição.
- "Outros" usa `var(--chart-5)` e o primeiro plano `var(--chart-1)`; no light os dois são alaranjados e
  próximos, no dark não. A lista com nome desfaz a ambiguidade.
- O overlay de dev do Next mostra "1 Issue" em en e es: é o D2.

## Lacunas herdadas: veredito

| Lacuna (handoff e review) | Veredito |
|---|---|
| `in` em subcampo com `select`, `Timestamp` relido como ISO e `create()` concorrente com `ALREADY_EXISTS` contra Firestore de verdade | **Verificada aqui** contra o emulador (itens 1, 5 e 6); **continua aberta** como teste versionado, que depende da spec `e2e-testing` |
| Ausência de índice composto num projeto Firebase real | **Continua aberta**, 🔒 (critério 23; pré-requisito 9.1 do plano) |
| en e es conferidos só no título, no usuário removido e no plano sem nome | **Fechada** no navegador para o resto da copy e o `Intl` (tabela acima). Como teste de componente, continua como estava |
| Tooltip do gráfico com rótulo cortado (S1) | **Confirmada**: o tooltip mostra "Básic…" e "Profi…". Fora de escopo do código desta feature; a recomendação do `/review` (prop de rótulo de eixo no `CategoryBarChart`) segue para o backlog |
| Afirmações do handoff "a verificar no `/test`" (1 a 7) | Todas medidas nos itens 7, 9, 12, 13 e 14 e na rodada B; a 3 (eixo) e a 4 (hidratação) caíram, com D1 e D2 |

## Ambiente do e2e

No início, 3000, 3001, 3002, 3003, 9099, 8080, 4001, 4400, 4500 e 9150 estavam sem processo escutando (na
8080 havia só uma conexão de cliente do navegador Brave, não um servidor). Não reutilizei nada do usuário.

| Serviço | Como subi |
|---|---|
| Emulador Auth e Firestore | `pnpm emulators` com `JAVA_HOME` do `openjdk@21`, projeto `demo-next-boilerplate`, e o seed rodado com os hosts do emulador no ambiente |
| API (3002) | `pnpm dev` sem chaves (rodada A), com as chaves falsas (rodada B), e duas subidas curtas com as chaves mais `NEXT_PUBLIC_PRODUCT_MODE=simple` e mais `NEXT_PUBLIC_APP_URL=` |
| App (3000) | `pnpm dev` em `subscription`, em `simple`, e com `NEXT_PUBLIC_API_URL=http://localhost:3012` para a resposta forçada |
| Proxy de sonda (3012) | script Node em `/tmp` que responde 503 `SUMMARY_INDEX_MISSING`, ou um resumo com aviso, a `GET /payments/summary` e repassa o resto à API |

Os `.env` locais apontam para um projeto Firebase real. Passei os hosts do emulador e
`NEXT_PUBLIC_FIREBASE_PROJECT_ID`/`FIREBASE_ADMIN_PROJECT_ID=demo-next-boilerplate` no ambiente de cada
processo, sem editar arquivo; com os hosts presentes, o `@repo/auth` inicializa o Admin SDK sem
credencial. Nenhuma chamada foi ao projeto real. A primeira subida da API falhou porque eu tinha
esvaziado `FIREBASE_ADMIN_CLIENT_EMAIL` e `FIREBASE_ADMIN_PRIVATE_KEY` no ambiente e a validação recusa
string vazia nesses campos; subi de novo sem esvaziá-los.

Não rodei `build && start`: o D1 é de layout e o D2 depende de `typeof window`, e nenhum dos dois é
comportamento de `next dev`. O build da API também não roda sob o emulador (`docs/SETUP.md`).

Derrubei tudo por PID, inclusive os filhos do `next dev`. No fim, as dez portas acima e a 3012 estavam
sem processo escutando. Fechei a sessão do `agent-browser`, apaguei o harness, o proxy e os logs de
`/tmp` e o `firestore-debug.log` que o emulador criou na raiz (ignorado pelo git).

## Contas e dados de QA

Tudo viveu só no emulador e morreu com o processo. Não criei conta em projeto real, então nada entra na
lista do `docs/PRE-PRODUCTION.md`.

- Contas do seed: `admin@example.com`, `user@example.com`, `user2@example.com` (senha pública do seed,
  documentada em `docs/SETUP.md`).
- Contas criadas por `POST /auth/sign-up`: `qa-billing-insights@example.com` (depois apagada por soft
  delete), `qa-billing-insights-p3@example.com`, `qa-billing-insights-p4@example.com`,
  `qa-billing-insights-p5@example.com`, com senhas aleatórias descartadas.
- `paidInvoice`: `in_qa1`, `in_qa2`, `in_qa3`, `in_qa_aug`, `in_qa_sep1`, `in_qa_manual`, `in_qa_jpy`,
  `in_qa_conc`, `in_qa_conc2`. `subscriptionActivation`: `sub_qa1`, `sub_qa2`, `sub_qa_conc`,
  `sub_qa_conc2`. `planLabel`: cinco documentos gravados à mão. Mais os `paymentEvent` das entregas e os
  estados de assinatura e `stripeCustomerId` dos perfis acima.

Este arquivo não traz senha, token nem chave. `sk_test_offline_qa`, `whsec_offline_qa` e os ids `cus_qa*`,
`sub_qa*`, `in_qa*` e `price_qa_*` são strings falsas por construção.

## Roteiro manual (para quem tiver conta Stripe de teste)

1. Cadastrar `invoice.paid` no endpoint do webhook (cinco eventos, versão `2025-09-30.clover`) e subir a
   API com `pnpm --filter api dev:with-stripe`.
2. Abrir a home do admin antes de qualquer venda: aparece o cartão "Nenhuma assinatura ainda".
3. Com um usuário comum, assinar um plano pelo checkout com o cartão de teste `4242 4242 4242 4242`.
4. Recarregar a home do admin: o valor aparece em "Recebido em <mês>", a contratação lista a pessoa com o
   nome real do produto (critério 21) e o gráfico mostra uma barra com o nome do plano.
5. Reenviar o evento pelo Dashboard (Developers → Webhooks → evento → Resend): a receita não muda.
6. Num projeto Firebase real, conferir que `GET /payments/summary` não responde 503
   `SUMMARY_INDEX_MISSING` (critério 23).

## Cross-check

Percorri nesta rodada: admin × comum × sem token (HTTP), `subscription` × `simple` (app e API), desktop
1440 px × mobile 375 e 320 px, light × dark, pt-br × en × es. Personificação só por
`adminHomePrefetch` (a home do admin não renderiza personificando). `apps/web` não é afetado pelo diff.

## Rodada 2

O `/review` corrigiu o D1 e mandou o D2 para o backlog (`review/review.md`, seção "Rodada 2"). Esta
rodada remediu só o que mudou: o eixo a 320 e 375 px, a hidratação em pt-br e as suítes de app e i18n.
Não alterei código nem teste.

### Suítes, sem `--force`

| Comando | Resultado |
|---|---|
| `pnpm --filter app test` | 598/598 em 76 arquivos (eram 597; o `/review` acrescentou o teste da distância entre ticks) |
| `pnpm --filter @repo/internationalization test` | 47/47 em 5 arquivos |
| `pnpm test` (raiz) | 10/10 tasks, 3 em cache, 24,8 s. api 882, app 598, internationalization 47, web 41, auth 101, email 137, shared 44, security 31, payments 22, analytics 34 |
| `pnpm --filter app typecheck` | código 0 |

### D1: eixo de planos

Mesmos seis planos da rodada 1, recriados pelo harness assinado contra o emulador: "Básico Anual",
"Empresarial Premium", "Pro", "Profissional Plus", "Starter" e um preço sem nome, um assinante cada.
Posições pelo `getBoundingClientRect` de `.recharts-cartesian-axis-tick-value`, em px:

| Viewport | Rótulos | Posições (esquerda–direita) | Intervalos entre vizinhos | Folga mínima |
|---|---|---|---|---|
| 320 pt-br | Bási…, Empr…, Pro, Prof…, Resto | 60,7–91,5 · 96,6–132 · 143,1–161,9 · 175,5–205,9 · 212,8–245 | 5,1 · 11,1 · 13,6 · 6,9 | 5,1 |
| 320 en | …, Other | último 213,2–244,6 | 5,1 · 11,1 · 13,6 · 7,3 | 5,1 |
| 320 es | …, Otros | último 213,5–244,3 | 5,1 · 11,1 · 13,6 · 7,6 | 5,1 |
| 375 pt-br | Bási…, Empr…, Pro, Prof…, Resto | 66,2–97 · 113,1–148,5 · 170,6–189,4 · 214–244,4 · 262,3–294,5 | 16,1 · 22,1 · 24,6 · 17,9 | 16,1 |
| 375 en e es | …, Other / Otros | último 262,7–294,1 / 263–293,8 | 16,1 · 22,1 · 24,6 · 18,3 / 18,6 | 16,1 |

Light e dark deram as mesmas posições; só muda a cor do tick (`lab(48.5 0 0)` no light, `lab(66.1 0 0)`
no dark). `scrollWidth` 305 a 320 px e 360 a 375 px, sem rolagem horizontal. A lista abaixo do gráfico, a
320 px: "Básico Anual / anual / 1", "Empresarial Premium / anual / 1", "Pro / mensal / 1", "Profissional
Plus / a cada 3 meses / 1", "Resto / 2". Na captura do dark a 320 px os cinco rótulos aparecem separados.
A 375 px a folga mínima caiu de 10 px (rodada 1) para 16,1 px, então não houve regressão.

Veredito: **D1 fechado.** O critério 19 passa a ✅. O par mais apertado continua "Bási…"/"Empr…", com
5,1 px; a observação do `/review` vale: um nome feito só de letras largas ("M", "W") pode gastar mais
que a média medida aqui.

### Hidratação em pt-br

Numa sessão nova do navegador, com o estado de login carregado e `x-locale=pt-br`, `/pt-br/admin` com a
seção preenchida não registrou nenhum erro de página nem aviso no console, na carga e num reload. Controle
positivo na mesma sessão: abrir `/es/admin` registrou 1 "Hydration failed", então o instrumento capta o
aviso quando ele existe. Na sessão anterior, que tinha passado por en e es, o buffer de erros acumulava as
cargas desses idiomas e não servia para medir pt-br; por isso a sessão nova.

### Critério 18 reclassificado

O D2 continua: em `/en` e `/es` todo componente client da home renderiza pt-br no servidor. A causa
(`getCookie` sem `window` em `packages/internationalization/utils/cookies.ts:2-4`) vem de antes desta
entrega, a correção na raiz passa por 63 arquivos em quatro workspaces e o achado tem dono em
`specs/BACKLOG.md:480`. O critério fica ❌ pré-existente, fora do escopo desta entrega. Não é ✅: o
comportamento que ele descreve não acontece em en e es.

### Ambiente e dados

Todas as portas (3000, 3001, 3002, 3003, 3012, 9099, 8080, 4001, 4400, 4500, 9150) estavam sem processo
escutando antes. Subi o emulador (com `JAVA_HOME` do `openjdk@21`) e o seed, a API em `next dev` com
`sk_test_offline_qa`/`whsec_offline_qa` no ambiente do processo e o app em `next dev`, com os hosts do
emulador no ambiente. Derrubei os três por PID, com os filhos; no fim as portas estavam livres. Fechei as
sessões do `agent-browser`, apaguei o harness de `/tmp` e o `firestore-debug.log` da raiz.

Dados novos, só no emulador, mortos com ele: contas `qa-billing-insights-r2-p1@example.com` a
`-p4@example.com` (senhas aleatórias descartadas), mais as do seed; seis assinaturas e seis faturas
(`in_r2_*`, `sub_r2_*`, `cus_r2_*`) e cinco documentos `planLabel`. Nenhuma conta em projeto real.
