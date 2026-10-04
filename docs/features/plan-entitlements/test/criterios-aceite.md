# Critérios de Aceite (Checklist)

Feature: acesso por plano espelhado na API (`plan-entitlements`). O status medido de cada item está em
[`report.md`](report.md). Marcado `[x]` quando o `/test` mediu e passou.

- [x] **Titular sem assinatura não cria pela API quando a demo está ligada**
  Com a cobrança ligada e `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` preenchida na API, `POST /entities` de um
  titular sem assinatura viva responde 403 com `{ "error": { "code": "PLAN_SUBSCRIPTION_REQUIRED" } }` e não
  grava nada. A recusa acontece antes da validação do corpo, então um corpo inválido também recebe o 403 de
  plano, e não `VALIDATION_FAILED`. A UI esconder o formulário não muda a resposta: a API é a autoridade.

- [x] **Assinatura viva sem o recurso pedido recebe o código de recurso**
  Com `subscription.status` em um dos status vivos (`active`, `trialing`, `past_due`, `unpaid`, `paused`)
  e sem o `lookup_key` pedido em `entitlements.features`, `POST /entities` responde 403
  `PLAN_FEATURE_REQUIRED`. O código é diferente do de assinatura para que a tela diga "fora do seu plano" e
  não "assine um plano".

- [x] **Assinatura viva com o recurso cria normalmente**
  Com a assinatura viva e o recurso na lista, `POST /entities` responde 201 com o DTO da entidade, como sem o
  gate. Pela tela, o formulário aparece, o envio redireciona para a lista e a entidade nova aparece nela.

- [x] **A negação vence quando os dois eventos discordam**
  Se a assinatura foi cancelada (`customer.subscription.deleted`) e a lista de recursos ainda traz o
  `lookup_key`, o acesso é negado com `PLAN_SUBSCRIPTION_REQUIRED`. `GET /account` mostra
  `subscribed: false` com `features` ainda preenchida, e a tela volta ao convite de assinatura.

- [x] **Cobrança desligada ou modo `simple` não bloqueiam nada**
  Sem as chaves Stripe na API, ou com `NEXT_PUBLIC_PRODUCT_MODE=simple` mesmo com as chaves, `GET /account`
  devolve `planAccess.enforced: false` e `POST /entities` responde 201 para quem não tem assinatura, mesmo com
  a demo ligada. A tela de criação mostra o formulário, sem convite.

- [x] **Demo desligada mantém a tela e a rota como antes**
  Com `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` vazia (`""`) ou ausente nos dois apps, o requisito é `null`:
  `POST /entities` responde 201 para quem não tem assinatura e `/entities/create` monta o formulário direto,
  sem passar pelo `PlanGate`. O build de produção do app com a variável vazia explícita embute `undefined`,
  não a string vazia.

- [x] **Webhook de recursos grava a lista ordenada e sem repetição**
  Um `entitlements.active_entitlement_summary.updated` assinado, para um `customer` vinculado a um perfil,
  grava `user.entitlements.features` em ordem alfabética e sem duplicata, com `lastEventAt` como `Timestamp`
  no Firestore. `GET /account` devolve `entitlements.lastEventAt` em ISO e `planAccess.features` com a mesma
  lista. Os `lookup_key` não aparecem no log.

- [x] **Regra de ordem, reentrega e cliente desconhecido no webhook de recursos**
  A reentrega do mesmo `event.id` responde 200 `{ "ok": true, "duplicate": true }`. Um evento com `created`
  anterior ao gravado responde 200, registra `result=skipped` e não muda a lista. Um `customer` sem perfil
  responde 200 e registra `webhook-profile-not-found`. Um resumo com `has_more: true` cuja listagem na Stripe
  falha responde 500, não marca o evento como processado (a reentrega volta a dar 500, não `duplicate`) e
  não mexe na lista.

- [x] **Convite no lugar do formulário enquanto a conta carrega**
  Com a demo ligada e acesso negado, `/entities/create` nunca mostra o formulário: enquanto `GET /account`
  não respondeu, aparece o `FormSkeleton`; depois, o convite. Isso vale no HTML do servidor e na primeira
  pintura do cliente. Se a conta falhar ao carregar, o formulário aparece e a API recusa com o código
  traduzido.
  Rodada 2: em três cargas frias o formulário não apareceu nenhuma vez (skeleton por cerca de 400 ms, depois
  o convite) e o HTML do servidor veio sem o formulário. Com a conta fora do ar, o formulário apareceu e o
  POST recebeu 403 `PLAN_SUBSCRIPTION_REQUIRED` com o toast em pt-br, en e es. Itens 3 e 6 do `report.md`.

- [x] **Convite de assinatura traduzido, com link para a cobrança**
  Sem assinatura, o convite mostra "Disponível para assinantes / Assine um plano para usar este recurso. /
  Ver planos" (en: "Available to subscribers / Subscribe to a plan to use this feature. / View plans"; es:
  "Disponible para suscriptores / Suscríbete a un plan para usar esta función. / Ver planes"). O link aponta
  para `/<locale>/account?tab=billing` e abre a conta com a aba Cobrança selecionada.

- [x] **Convite de recurso traduzido**
  Com assinatura e sem o recurso, o convite mostra "Fora do seu plano / O seu plano atual não inclui este
  recurso. Veja os planos que incluem." (en: "Not in your plan / Your current plan does not include this
  feature. See the plans that do."; es: "Fuera de tu plan / Tu plan actual no incluye esta función. Mira los
  planes que la incluyen."), com o mesmo link.

- [x] **Convite respeita tema e largura**
  O card do convite segue o tema: fundo e texto do `Card` invertem entre light e dark, e o botão "Ver
  planos" também. Em 375 px o card ocupa a largura útil sem rolagem horizontal (`scrollWidth` igual à
  largura da janela).

- [x] **Toast traduzido quando a tela está desatualizada**
  Se o recurso some do perfil com o formulário aberto, salvar dispara o 403 `PLAN_FEATURE_REQUIRED` e o toast
  mostra "O seu plano não inclui este recurso." (en: "Your plan does not include this feature."; es: "Tu plan
  no incluye esta función.") com o código de requisição. O texto de `PLAN_SUBSCRIPTION_REQUIRED` também tem
  tradução nos 3 idiomas.

- [x] **Admin personificando vê o plano do titular**
  Admin no painel comum, atuando como um titular sem assinatura, vê o convite de assinatura em
  `/entities/create`. O link leva à aba Cobrança com o aviso "Modo somente leitura". Escrita personificada
  continua recusada como somente leitura (`AUTH_REQUEST_IMPERSONATION_READ_ONLY`) antes de o plano ser
  consultado.

- [x] **Tela reflete o recurso novo na próxima montagem**
  Depois que o evento de recursos chega, a próxima montagem da tela de criação busca a conta de novo, mesmo
  com o cache dentro dos 60 s. Medido na rodada 2: do clique em "Novo" ao formulário, cerca de 120 ms e uma
  única busca; o convite antigo aparece por uns 35 ms enquanto a busca está no ar. Com a tela parada, o
  convite fica até a próxima montagem. A API já aceita a criação desde a gravação.

- [ ] **Entrega real da Stripe e recursos do catálogo (🔒)**
  A Stripe entrega `entitlements.active_entitlement_summary.updated` ao endpoint cadastrado na versão
  `2025-09-30.clover`; um recurso ligado a um produto aparece no perfil depois de um checkout real (e só no
  próximo ciclo para assinatura existente); a listagem paginada real com mais de 10 recursos; e o que a Stripe
  faz com os recursos em `past_due`, `unpaid` e `paused`. Exige conta Stripe.
