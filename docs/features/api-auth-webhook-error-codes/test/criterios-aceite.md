# Critérios de Aceite (Checklist)

Feature: `/auth/me`, `/auth/sign-in` e o webhook de pagamentos respondem erro no formato
`{ "error": { "code": "..." } }`. Os critérios partem da §9 do `analyze/plan.md`, com os casos-limite que o
`/test` mediu contra a API em build. O status de cada um, e por qual meio, está em `test/report.md`.

- [x] **`GET /auth/me` sem credencial ativa responde 401 `AUTH_INVALID_TOKEN`**
  Sem header de autorização, com `Authorization: Bearer lixo` e com o token de uma conta que foi apagada do Auth, a
  resposta é `401 {"error":{"code":"AUTH_INVALID_TOKEN"}}`, sem `message` e sem stack. Com um token válido a
  resposta continua `200 { data }`, com o usuário dentro de `data`.

- [x] **Login da `apps/app` segue funcionando**
  Entrar em `/pt-br/sign-in` com a conta do seed leva ao painel; sair leva de volta ao sign-in; abrir `/pt-br`
  sem sessão redireciona para `/pt-br/sign-in?redirect=%2Fpt-br`. O status do `/auth/me` sem sessão continua 401;
  só o corpo mudou.

- [x] **`POST /auth/sign-in` recusa corpo inválido com 400 `VALIDATION_FAILED`**
  Corpo ausente, JSON malformado, `{}`, e-mail inválido e senha com menos de 6 caracteres respondem
  `400 {"error":{"code":"VALIDATION_FAILED"}}` sem chamar o Identity Toolkit. A senha com exatamente 6 caracteres
  passa pelo schema. Login nunca devolve `AUTH_PASSWORD_TOO_SHORT`, porque o schema usa `parseWith`.

- [x] **Credencial recusada responde 400 `AUTH_INVALID_CREDENTIALS`**
  Senha errada, e-mail que não existe e conta desativada respondem o mesmo
  `400 {"error":{"code":"AUTH_INVALID_CREDENTIALS"}}`. A resposta não diz se o e-mail existe e não repete a
  mensagem do provedor.

- [x] **Limite do provedor responde 429 e usuário ausente responde 404**
  Quando o Identity Toolkit devolve `TOO_MANY_ATTEMPTS_TRY_LATER`, a rota responde
  `429 {"error":{"code":"USERS_AUTH_RATE_LIMITED"}}`. Quando a senha é aceita mas o usuário não existe mais, a rota
  responde `404 {"error":{"code":"USERS_NOT_FOUND"}}`. Um erro que não é do Identity Toolkit é relançado (500 sem
  corpo).

- [x] **Login aceito mantém o formato `{ session, user }`**
  Com credencial correta a resposta é 200 com `session` (`idToken`, `refreshToken`, `expiresIn`) e `user`, sem
  envelope `data`. E-mail com espaços nas pontas chega aparado ao provedor e o login funciona.

- [x] **Webhook com assinatura recusada responde 400 `VALIDATION_FAILED`**
  Sem o header `stripe-signature`, com `t=1,v1=00`, com assinatura feita com outro segredo, com corpo adulterado
  depois de assinar e com assinatura correta de uma hora atrás (fora da tolerância de 300 s), a rota responde
  `400 {"error":{"code":"VALIDATION_FAILED"}}`, registra `webhook-failed` com o `requestId` e não roda handler nem
  marca o evento.

- [x] **Falha do handler responde 500 `PAYMENTS_WEBHOOK_HANDLER_FAILED`; sem configuração, 503**
  Com assinatura válida e handler que lança, a rota responde
  `500 {"error":{"code":"PAYMENTS_WEBHOOK_HANDLER_FAILED"}}`, registra `webhook-handler-failed` e não marca o
  evento, de modo que a reentrega roda o handler de novo. A falha na leitura do dedupe tem o mesmo resultado. Sem
  as chaves da Stripe a resposta continua `503 {"error":{"code":"PAYMENTS_NOT_CONFIGURED"}}`. Evento válido não
  tratado responde `200 {"ok":true}`, e a segunda entrega do mesmo evento responde
  `200 {"ok":true,"duplicate":true}`.

- [x] **Respostas de erro sem `message`, sem stack e com `x-request-id`**
  Todas as respostas de erro das três rotas trazem só `error.code` no corpo e o header `x-request-id` que o proxy
  acrescenta.

- [x] **Os dois códigos novos têm texto nos três idiomas**
  `AUTH_INVALID_CREDENTIALS` e `PAYMENTS_WEBHOOK_HANDLER_FAILED` existem em pt-br, en e es dentro de `apiErrors`, e
  o teste de paridade do pacote de internacionalização passa.

- [x] **A documentação descreve as respostas sem prometer o fim das reentregas**
  `docs/PAYMENTS.md` e `docs/SECURITY.md` descrevem o 400 da assinatura recusada, o 500 do handler e as respostas
  do `/auth/sign-in`, e dizem que a Stripe reentrega qualquer resposta fora de `2xx`. O roteiro de
  `docs/PRE-PRODUCTION.md:568` espera 400 para o webhook sem assinatura, que é o que a API responde.

- [ ] **429 do proxy (Arcjet) vem antes da rota no `/auth/sign-in`** (não verificado)
  Com o rate limit ligado, a 21ª chamada em 60 s ao `/auth/sign-in` recebe `429 AUTH_RATE_LIMITED` do proxy antes
  de chegar à rota. A leitura do `apps/api/proxy.ts` sustenta isso e o diff não toca o proxy, mas medir exige uma
  `ARCJET_KEY` válida, que não existe no ambiente de teste.
