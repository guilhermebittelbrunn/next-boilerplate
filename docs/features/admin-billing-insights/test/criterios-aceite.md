# Critérios de Aceite (Checklist)

Base: seção 9 do `analyze/plan.md`. Mudei três coisas. O limite do rótulo do eixo agora diz 5 caracteres,
que é o que o código usa depois da rodada 2 do `/review`, em vez dos 10 do plano. O critério de tema e tela passou a exigir, com números,
que um rótulo não encoste no vizinho. E o que só uma conta Stripe ou um projeto Firebase real provam foi
para critérios separados no fim, para a parte medida não ficar escondida atrás do cadeado. O status de
cada item, com o meio de prova, está em `test/report.md`.

- [ ] **A seção some quando a cobrança está desligada**
  Com `STRIPE_SECRET_KEY` ou `STRIPE_WEBHOOK_SECRET` vazias, ou com `NEXT_PUBLIC_APP_URL` vazia na API, a
  home do admin não mostra nenhum elemento da seção de cobrança: nem título, nem esqueleto, nem zeros.
  `GET /payments/summary` responde 200 `{ "data": { "enabled": false } }`; o guard lê o perfil do admin,
  mas a rota não lê as coleções de cobrança nem chama a Stripe. String vazia conta como ausência. Os
  cartões de usuários e o bloco de atividade continuam iguais, em light, dark e mobile, nos 3 idiomas.

- [ ] **A seção some no modo `simple`**
  Com `NEXT_PUBLIC_PRODUCT_MODE=simple` no app, nenhuma requisição a `/payments/summary` sai, nem do
  prefetch do servidor nem do navegador, e a seção não aparece. Com a API em `simple` e as duas chaves
  presentes, a resposta continua `enabled: false`, então as duas pontas concordam mesmo quando só uma
  delas está em `simple`.

- [ ] **Só admin lê o resumo de cobrança**
  Sem credencial ou com token inválido, a rota responde 401 `AUTH_INVALID_TOKEN`; com um perfil comum, 403
  `ADMIN_FORBIDDEN`, e as duas mensagens existem nos 3 idiomas. Com a cobrança desligada o guard continua
  valendo. `POST` responde 405, porque a rota só exporta `GET`. Enquanto o admin personifica, a home do
  admin não é renderizada e o prefetch do resumo não roda.

- [ ] **Receita do mês é o valor recebido, com moeda e critério na tela**
  O cartão "Recebido em {mês}" soma `amount_paid` das faturas `invoice.paid` com `paid_at` no mês UTC
  corrente e formata cada total na moeda da fatura e no idioma da tela. Moeda sem casas decimais, como
  JPY, não é dividida por 100. Junto do número aparecem o critério (faturas pagas, mês fechado em UTC, sem
  descontar reembolsos, não substitui a contabilidade) e "Contando desde" a primeira fatura registrada.
  Sem fatura no mês, o cartão diz "Nenhuma fatura paga neste mês" em vez de mostrar zero numa moeda
  inventada. Fatura avulsa (`billing_reason: manual`, sem assinatura nem preço) entra na soma.

- [ ] **Moedas diferentes aparecem separadas, sem conversão**
  Faturas em `brl`, `usd` e `jpy` no mesmo mês produzem uma linha por moeda, cada uma com o seu total, e a
  nota de que moedas diferentes não são somadas. Nenhum total geral é calculado. A ordem segue o valor
  bruto na menor unidade de cada moeda, que é só ordem de exibição.

- [ ] **O mês é fechado em UTC, com limites exatos**
  Uma fatura paga às `23:59:59Z` do último dia do mês anterior fica fora do total; uma paga às
  `00:00:00Z` do dia 1 entra. A virada de dezembro para janeiro e fevereiro bissexto seguem a mesma
  regra. A fatura do mês anterior não entra no total, mas recua o "Contando desde". O `paidAt` fica
  gravado como `Timestamp` e volta da API como ISO.

- [ ] **Reentregar o mesmo evento não altera a receita**
  Um `invoice.paid` com `id` já processado responde 200 `{ "ok": true, "duplicate": true }` sem rodar
  handler, sem criar documento e sem mudar o valor exibido.

- [ ] **Reprocessar a mesma fatura não duplica a receita**
  Se o handler de uma fatura rodar de novo (evento com outro `id` para a mesma fatura, ou reentrega depois
  de a marcação em `paymentEvent` falhar), `paidInvoice/<in_id>` já existe, o `create()` recebe
  `ALREADY_EXISTS` (código 6) e nada é regravado. Duas ou três entregas concorrentes da mesma fatura, com
  `id` de evento iguais ou diferentes, respondem 200 e terminam com um documento em `paidInvoice` e um em
  `subscriptionActivation`.

- [ ] **Falha no handler não perde nem duplica a fatura**
  Se a gravação da fatura ou da ativação lançar, o webhook responde 500 e não marca o evento, para a
  Stripe reentregar. Na reentrega, o que já foi gravado não se repete.

- [ ] **Contratações recentes mostram as 5 últimas primeiras cobranças**
  A lista traz até 5 assinaturas, da mais recente para a mais antiga, pela data da primeira fatura paga
  (`billing_reason = subscription_create`), com usuário, plano e data no idioma da tela, em UTC.
  Renovação (`subscription_cycle`), troca de plano (`subscription_update`) e fatura manual não criam
  contratação. Com mais de 5, aparecem só as 5 mais recentes.

- [ ] **Usuário apagado aparece como removido, e o dinheiro continua contado**
  Quando o perfil do contratante tem `deletedAt`, foi expurgado ou não existe no Firebase Auth, a linha
  mostra "Usuário removido" em texto secundário, com plano e data. Uma fatura que chega antes de o
  `checkout.session.completed` ligar o cliente ao perfil entra na receita na hora, e a contratação passa a
  mostrar a pessoa assim que o vínculo existe, sem nova escrita em `subscriptionActivation`. Perfil
  apagado sai da contagem de planos e a receita não muda.

- [ ] **Planos mais vendidos contam assinaturas vigentes por plano**
  O gráfico mostra, por preço, quantos perfis não apagados têm `subscription.status` em
  `LIVE_SUBSCRIPTION_STATUSES`, do maior para o menor, e a descrição diz que pagamento pendente conta.
  Assinatura `canceled` sai da contagem. Com mais de 5 planos, aparecem os 4 primeiros e "Outros" com a
  soma dos demais. A lista abaixo do gráfico traz nome completo, intervalo ("mensal", "anual", "a cada 3
  meses") e contagem. Sem plano vigente, o cartão diz "Nenhuma assinatura vigente".

- [ ] **O nome do plano vem do cache local, e a home nunca chama a Stripe**
  A rota lê o nome em `planLabel` e nunca chama `getStripe()`. O webhook tenta resolver o nome de um preço
  sem cache ou com cache de 7 dias ou mais, com timeout de 3 s e sem retry. Se a Stripe recusar, o
  webhook responde 200 mesmo assim e registra `plan-label-unresolved` só com o tipo do erro. Com um
  `planLabel` recente, o webhook não tenta chamada nenhuma. Preço sem nome no cache aparece como "Plano sem
  nome", com o `priceId` em texto secundário na lista.

- [ ] **Fork que ainda não vendeu vê orientação, não zeros**
  Sem plano vigente, sem contratação e sem nenhuma fatura registrada, a seção mostra um único cartão
  dizendo que os números aparecem a partir da primeira assinatura paga e que contam só do momento em que o
  webhook passou a receber `invoice.paid`. Nenhum cartão com valor zero aparece nesse estado.

- [ ] **Assinaturas sem fatura registrada geram aviso de configuração**
  Quando há plano vigente mas nenhuma fatura registrada (`trackingSince` nulo), a seção mostra o aviso
  para conferir se `invoice.paid` está cadastrado no endpoint do webhook. O aviso some assim que a
  primeira fatura chega, e é legível em light e dark.

- [ ] **Índice recusado degrada só a seção**
  Se o Firestore recusar uma consulta por índice, a rota responde 503 `SUMMARY_INDEX_MISSING` e a seção
  mostra a mensagem traduzida nos 3 idiomas; os cartões de usuários e o bloco de atividade continuam.
  Outra falha não é rotulada como índice e sobe.

- [ ] **O webhook não ecoa mais o evento**
  A resposta de sucesso do webhook é `{ "ok": true }` para qualquer tipo de evento, mesmo quando a fatura
  traz `customer_email`, `customer_name` e `customer_address`. Sem configuração, o webhook responde 503
  `PAYMENTS_NOT_CONFIGURED`; duplicado responde `{ "ok": true, "duplicate": true }`; assinatura inválida
  responde 500, como antes. Nenhum log do webhook traz valor, e-mail ou payload.

- [ ] **Moeda, mês e data seguem o idioma sem divergência de hidratação**
  Em pt-br, en e es, valores, nome do mês e datas saem formatados pelo `Intl` com o locale da tela e fuso
  UTC, e o HTML do servidor bate com o do navegador: nenhum aviso de hidratação no console. Toda a copy da
  seção existe nos 3 idiomas com a mesma estrutura. Em en e es isso depende de corrigir um defeito
  anterior a esta entrega: `getDictionary()` resolve pt-br no servidor em qualquer componente client da
  home (achado registrado em `specs/BACKLOG.md:480`).

- [ ] **Tema e tamanho de tela**
  Em light e dark, cartões, aviso, gráfico e lista usam os tokens do tema com contraste legível. A 375 px
  e a 320 px os cartões empilham, a página não ganha rolagem horizontal, todo rótulo do eixo aparece
  (cortado em 5 caracteres, com a barra de agrupamento em "Resto", "Other" e "Otros", que cabem sem
  corte) e nenhum rótulo encosta ou passa por cima do vizinho.

- [ ] **Entrega real de `invoice.paid` pela Stripe**
  Com o endpoint do fork cadastrado com os cinco eventos, uma assinatura paga no modo de teste da Stripe
  chega como `invoice.paid` assinado, grava a fatura e a contratação e aparece na home. Só uma conta Stripe
  (ou a Stripe CLI) prova isso.

- [ ] **Resolução real do nome do plano**
  `stripe.prices.retrieve` com `expand: ["product"]` devolve o nome do produto, que o webhook grava em
  `planLabel`, e a home passa a mostrar esse nome no lugar de "Plano sem nome". Exige chave Stripe válida.

- [ ] **Forma real do payload na versão `2025-09-30.clover`**
  Os campos que o código lê (`parent.subscription_details.subscription`,
  `lines.data[0].pricing.price_details.price`, `status_transitions.paid_at`, `billing_reason`) existem
  com esses nomes no evento real. O harness imita esses campos; só um evento real confirma.

- [ ] **Nenhum índice composto num projeto Firebase real**
  Depois do deploy, a home do admin num projeto real não recebe 503 `SUMMARY_INDEX_MISSING`. O emulador
  serve qualquer consulta sem índice, então não prova isso.
