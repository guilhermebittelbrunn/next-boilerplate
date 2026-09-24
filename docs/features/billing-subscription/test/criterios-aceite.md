# Critérios de Aceite (Checklist)

Base: seção 9 do `analyze/plan.md`, com três ajustes. O critério da chave malformada está escrito na forma
medida (o processo sobe e responde 500, em vez de "derrubar o boot"). A trava do "Assinar" na volta do
checkout entrou como critério próprio, porque nasceu no `/review`. Os pontos que só uma conta Stripe real
prova ficaram em critérios separados, para não esconder a parte que foi medida. O status de cada item está
em `test/report.md`.

- [ ] **Sem chaves Stripe, a aba mostra o mesmo placeholder de antes**
  Com `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` vazias ou ausentes, `/account?tab=billing` mostra o
  `AccountBillingPlaceholder` ("Cobrança em breve", "Billing coming soon", "Facturación próximamente") em
  light, dark e mobile. Antes do placeholder aparece um skeleton enquanto `GET /payments/plans` responde, e
  nenhum elemento abaixo do painel se desloca quando ele troca de altura. A API responde 200
  `{ enabled: false, plans: [] }` sem chamar a Stripe e sem expor botão de ação.

- [ ] **Sem chaves Stripe, as escritas respondem com código, nunca 500**
  `POST /payments/checkout` e `POST /payments/portal`, com corpo válido, inválido ou sem corpo, respondem 503
  `PAYMENTS_NOT_CONFIGURED`. O webhook responde 503 com o mesmo código e não lê o corpo, para a Stripe
  reentregar. String vazia no `.env` conta como ausência. Sem token, as rotas respondem 401
  `AUTH_INVALID_TOKEN` antes de olhar a configuração.

- [ ] **Build e boot sem Stripe; aviso de meia configuração; chave malformada**
  `pnpm --filter api build` e `pnpm --filter app build` passam sem nenhuma variável da Stripe. Com só uma das
  duas chaves, a API sobe, loga `[payments] billing is DISABLED (no STRIPE_WEBHOOK_SECRET)` e o webhook
  responde 503. Com chave de prefixo errado (`pk_…` no lugar de `sk_…`), o build sai com código 1 e a
  mensagem `must start with "sk_"`; um processo já buildado sobe, mas toda requisição, inclusive
  `/health`, responde 500 e loga `Invalid environment variables`, como já acontece com `CORS_ORIGIN`
  ausente.

- [ ] **Modo `simple` não tem cobrança**
  Com `NEXT_PUBLIC_PRODUCT_MODE=simple` no app, a aba "Cobrança" some de `AccountTabs` nos três idiomas, o
  item some do submenu "Configurações" da sidebar e `?tab=billing` abre a aba de perfil. Na API, mesmo com
  as duas chaves presentes, `GET /payments/plans` responde 200 `enabled: false` e checkout e portal
  respondem 503 `PAYMENTS_NOT_CONFIGURED`.

- [ ] **Falha do catálogo vira mensagem, não 500**
  Com a cobrança ligada e a Stripe recusando a chamada, `GET /payments/plans` responde 503
  `PAYMENTS_PROVIDER_UNAVAILABLE` sem mensagem interna. Sem assinatura, a aba mostra "Não foi possível
  carregar os planos." (e equivalentes em en/es); com assinatura viva, o card "Plano atual" continua na
  tela com o nome genérico "Plano contratado". Catálogo vazio mostra `billing.noPlans`.

- [ ] **Planos ativos com preço e moeda formatados**
  A aba lista cada plano com nome, descrição (ausente quando `null`), features e preço formatado na moeda do
  preço e no locale da tela: "R$ 29,00 / mês" em pt-br, "R$29.00 / month" em en, "29,00 BRL / mes" em es,
  com intervalo anual como "/ ano". JPY sai sem casas decimais. A grade não estoura a largura no mobile.

- [ ] **Catálogo real da Stripe**
  A listagem traz só preços recorrentes ativos de produtos ativos, do mais barato ao mais caro, lidos da
  conta Stripe do fork. Só uma conta Stripe com produtos cadastrados prova isso de ponta a ponta.

- [ ] **Checkout valida o preço e não duplica assinatura**
  `priceId` fora do formato `price_…` responde 400 `VALIDATION_FAILED`; preço inexistente, inativo ou avulso
  responde 404 `PAYMENTS_PLAN_NOT_FOUND`; perfil com assinatura viva (`active`, `trialing`, `past_due`,
  `unpaid`, `paused`) responde 409 `PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE`. Um duplo clique dispara um único
  pedido, e todos os botões de plano ficam desabilitados enquanto o pedido está pendente. Falha da Stripe
  devolve o toast traduzido de `PAYMENTS_PROVIDER_UNAVAILABLE` e reabilita os botões.

- [ ] **Na volta do checkout, "Assinar" fica travado até a assinatura aparecer**
  Com `?checkout=success` e nenhuma assinatura viva no perfil (inclusive uma anterior `canceled`), todos os
  botões "Assinar" ficam desabilitados e o aviso "Confirmando o pagamento. A assinatura aparece aqui em
  instantes." aparece. A aba relê `GET /account` a cada 3 s, no máximo 10 vezes. Com `?checkout=canceled` ou
  sem o parâmetro, os botões ficam habilitados. Assim que a assinatura viva chega, o aviso vira "Assinatura
  ativa." e "Gerenciar assinatura" fica habilitado.

- [ ] **Volta do checkout mostra o resultado**
  `?checkout=canceled` mostra "Pagamento cancelado. Nenhuma cobrança foi feita." e `?checkout=success` com
  assinatura viva mostra "Assinatura ativa.", nos três idiomas. A sessão é criada com o cliente do perfil,
  `client_reference_id`, `metadata.profileId`, o locale da tela e URLs de retorno
  `<app>/<locale>/account?tab=billing&checkout=success|canceled`.

- [ ] **Página real do Checkout e volta com assinatura criada pela Stripe**
  O usuário paga com cartão de teste na página hospedada da Stripe e volta para a aba com a assinatura
  gravada pelo webhook. Só uma conta Stripe real prova esse percurso.

- [ ] **Estado gravado no perfil e lido pela UI**
  O documento `user` guarda `stripeCustomerId` e `subscription` (status, preço, valor, moeda, intervalo,
  fim do período e `lastEventAt` como `Timestamp`, cancelamento agendado). `GET /account` devolve as datas
  em ISO e a aba lê o estado dali, sem chamar a Stripe. Perfil antigo sem os campos lê como "sem
  assinatura": `GET /account` omite os campos e a exportação traz `null`.

- [ ] **Webhook reconcilia criação, troca e cancelamento**
  `checkout.session.completed` liga o cliente ao perfil de `client_reference_id` quando o vínculo falta.
  `customer.subscription.created`, `updated` e `deleted` atualizam `subscription` no perfil achado por
  `stripeCustomerId`, com fallback para `metadata.profileId`. Uma assinatura nova depois de uma cancelada
  substitui a antiga. `deleted` grava `canceled` e a aba volta a oferecer os planos. Funciona em
  `next dev` com o segredo no ambiente do processo.

- [ ] **Reentrega, fora de ordem e assinatura adulterada não mudam o estado**
  Evento com `id` já processado responde 200 `{"ok":true,"duplicate":true}` e o documento fica idêntico,
  `updatedAt` inclusive. `updated` com `created` anterior ao último aplicado é ignorado. Nenhum evento
  ressuscita uma assinatura `canceled`. Corpo adulterado ou sem `stripe-signature` responde 500 e o
  documento não muda. Handler que falha responde 500 e não marca o evento.

- [ ] **Entrega real de webhook**
  A Stripe (ou o `stripe listen` do `pnpm --filter api dev:with-stripe`) entrega os eventos no endpoint
  registrado na versão `2025-09-30.clover`, e o estado bate com o Dashboard. Só a Stripe real prova a
  entrega e o formato exato do payload dessa versão.

- [ ] **Portal para quem tem cliente Stripe**
  "Gerenciar assinatura" aparece só com assinatura viva e pede o Customer Portal com o locale da tela. Sem
  cliente ligado, 409 `PAYMENTS_CUSTOMER_NOT_FOUND`; falha da Stripe, 503 com o toast "O serviço de
  pagamento não respondeu. Tente de novo em instantes." e equivalentes em en/es, legível em light e dark.

- [ ] **Página real do Customer Portal**
  O portal abre, permite cancelar, trocar de plano e atualizar cartão, e o cancelamento feito lá chega ao
  app pelo webhook. Depende da configuração do portal numa conta Stripe real.

- [ ] **`past_due` e `unpaid` são exibidos, não bloqueados**
  O badge "Pagamento pendente" / "Payment due" / "Pago pendiente" usa a variante destrutiva e o texto pede
  para atualizar o cartão, legível em light e em dark. "Gerenciar assinatura" continua disponível e o resto
  do painel não muda.

- [ ] **Personificação é só leitura**
  Um admin personificando o usuário vê o aviso "Modo somente leitura", o estado da assinatura e os planos,
  com "Gerenciar assinatura" e "Assinar" desabilitados; clicar não dispara pedido. Checkout, portal e
  exclusão com headers de personificação respondem 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY`. Admin sem
  personificar recebe 403 `COMMON_PANEL_FORBIDDEN`; sem token, 401 `AUTH_INVALID_TOKEN`.

- [ ] **Exclusão de conta trata a assinatura antes de apagar**
  O passo `billing` roda primeiro. Sem assinatura viva, `skipped: no-subscription` e a exclusão segue até
  `authAccount`. Com assinatura viva e cobrança desligada (`billing-not-configured`) ou cancelamento que
  falha na Stripe, nada é apagado: a rota responde 503 `ACCOUNT_DELETION_BILLING_FAILED`, o perfil fica
  com `deletedAt: null` e a mesma assinatura, e a conta continua entrando. Senha errada responde 400
  `ACCOUNT_CURRENT_PASSWORD_INVALID` antes de qualquer passo.

- [ ] **Cancelamento real no expurgo**
  Com assinatura viva numa conta Stripe real, a exclusão cancela a assinatura na Stripe e segue apagando.
  Assinatura que a Stripe já não tem conta como feita. Só a Stripe real prova o cancelamento.

- [ ] **Exportação leva o estado da assinatura**
  O JSON de `GET /account/export` traz `account.subscription` (datas em ISO) e `account.stripeCustomerId`,
  com `null` nos dois quando o perfil nunca assinou.

- [ ] **CTAs do pricing levam ao fluxo real**
  Em modo `subscription` com `NEXT_PUBLIC_APP_URL`, os CTAs dos dois primeiros planos de `/pricing` apontam
  para `<app>/<locale>/account?tab=billing`. Sem a URL, o destino é `/<locale>/sign-up`; em `simple`, a URL
  do app. O CTA de contato não muda. Hero, CTA da home e o link "Ir para o painel" do header passam a
  apontar para o app quando a URL existe.

- [ ] **Copy e erros nos 3 idiomas**
  Todo texto novo da aba e os seis códigos novos (`PAYMENTS_NOT_CONFIGURED`, `PAYMENTS_PLAN_NOT_FOUND`,
  `PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE`, `PAYMENTS_CUSTOMER_NOT_FOUND`, `PAYMENTS_PROVIDER_UNAVAILABLE`,
  `ACCOUNT_DELETION_BILLING_FAILED`) existem em pt-br, en e es com a mesma estrutura, e nenhum cai na
  mensagem genérica. Nenhuma string solta em JSX.
