# Relatório do `/test`: contrato de erro de `/auth/me`, `/auth/sign-in` e do webhook de pagamentos

Rodada autônoma do `/cycle`, na mesma passada da tarefa `web-docs-link-and-mobile-menu`. Branch
`guilhermebittelbrunn/cycle-2-features-implement`, não protegida. Nenhum commit, nenhum `git add`, nenhuma branch.

Resultado: 11 critérios aprovados, 0 reprovados e 1 não verificado (o 429 do Arcjet, que exige `ARCJET_KEY`).
Nenhum defeito.

## Cobertura de testes

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter api test` | 95 arquivos, 1222 testes, todos passando |
| `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes, todos passando (paridade inclui os dois códigos novos) |
| `pnpm test` (raiz, JDK 21) | 15/15 tarefas, 279 arquivos, 3.139 testes; `api:test:emulator` 186 |
| `npx vitest run __tests__/authMeRoute.test.ts __tests__/authSignInRoute.test.ts __tests__/paymentsWebhookRoute.test.ts` (em `apps/api`) com as três rotas trocadas pela versão de `HEAD` | 19 falham e 51 passam, em 70, como o handoff disse. Rotas restauradas e conferidas com `cmp` |

Typecheck e `pnpm check` vêm do `/review` (código não mudou nesta etapa). Nenhum teste novo.

## Decisões de custo de teste

| Rota | Decisão |
|------|---------|
| `GET /auth/me` | `authMeRoute.test.ts` (rota com mock) cobre os dois ramos de 401 e o sucesso; o `curl` confirmou o que o Next acrescenta (header, corpo) |
| `POST /auth/sign-in` | `authSignInRoute.test.ts` cobre validação, mapeamento do Identity Toolkit, 429 e 404; o `curl` contra o emulador do Auth confirmou a recusa real (senha errada, e-mail inexistente, conta desativada) |
| `POST /webhooks/payments` | `paymentsWebhookRoute.test.ts` já usa o SDK real da Stripe para assinatura; o `curl` com HMAC próprio confirmou o 400, o 500 e o 200 no build |

Nenhum teste da faixa cara.

## Verificar no `/test` (lista do `review/review.md`)

| # | Veredito | O que foi medido |
|---|----------|------------------|
| 1 | confirmado | API em `next build` + `next start` na 3002, contra o emulador. Detalhe na tabela abaixo |
| 2 | não verificável (🔒) | O 429 do proxy antes da rota precisa de uma `ARCJET_KEY` válida; o ambiente sobe com o rate limit desligado (`[security] rate limiting is DISABLED`). Continua fechado só por leitura, como o review deixou |
| 3 | confirmado | App em `next dev` na 3000 com a API em build: `/pt-br` anônimo redireciona para `/pt-br/sign-in?redirect=%2Fpt-br`; login com a conta do seed leva a `/pt-br` ("Painel do usuário"); "Sair" no menu do perfil volta para o sign-in; reabrir `/pt-br` volta para o sign-in |

### Respostas medidas com `curl -i`

| Chamada | Status e corpo |
|---------|----------------|
| `GET /auth/me` sem credencial | `401 {"error":{"code":"AUTH_INVALID_TOKEN"}}`, com `x-request-id` |
| `GET /auth/me` com `Authorization: Bearer lixo` | `401 {"error":{"code":"AUTH_INVALID_TOKEN"}}`, com `x-request-id` |
| `GET /auth/me` com token de conta apagada do Auth | `401 {"error":{"code":"AUTH_INVALID_TOKEN"}}` |
| `GET /auth/me` com token válido (seed) | `200`, chaves `["data"]`, `data.email` da conta |
| `POST /auth/sign-in` sem corpo | `400 {"error":{"code":"VALIDATION_FAILED"}}`, com `x-request-id` |
| `POST /auth/sign-in` com JSON malformado | `400 VALIDATION_FAILED` |
| `POST /auth/sign-in` com `{}` | `400 VALIDATION_FAILED` |
| `POST /auth/sign-in` com e-mail inválido | `400 VALIDATION_FAILED` |
| `POST /auth/sign-in` com senha de 5 caracteres | `400 VALIDATION_FAILED` |
| `POST /auth/sign-in`, conta do seed, senha errada | `400 {"error":{"code":"AUTH_INVALID_CREDENTIALS"}}` |
| `POST /auth/sign-in`, e-mail inexistente | `400 AUTH_INVALID_CREDENTIALS` |
| `POST /auth/sign-in`, `qa-api-error-codes@example.com` desativada no emulador | `400 AUTH_INVALID_CREDENTIALS` |
| `POST /auth/sign-in`, credencial correta | `200`, chaves `["session","user"]`, `session` com `idToken`, `refreshToken`, `expiresIn` |
| `POST /auth/sign-in`, e-mail com espaços nas pontas | `200` |
| `POST /webhooks/payments` sem chaves da Stripe | `503 {"error":{"code":"PAYMENTS_NOT_CONFIGURED"}}`, com `x-request-id` |
| webhook com chaves fictícias, sem header | `400 {"error":{"code":"VALIDATION_FAILED"}}`, com `x-request-id` |
| webhook com `stripe-signature: t=1,v1=00` | `400 VALIDATION_FAILED` |
| webhook com HMAC correto e carimbo de 1 h atrás | `400 VALIDATION_FAILED` |
| webhook assinado com outro segredo | `400 VALIDATION_FAILED` |
| webhook com corpo alterado depois de assinar | `400 VALIDATION_FAILED` |
| webhook válido, tipo não tratado | `200 {"ok":true}` (log `webhook-unhandled-event`) |
| o mesmo evento de novo | `200 {"ok":true,"duplicate":true}` |
| webhook válido `invoice.paid` com `data.object` vazio | `500 {"error":{"code":"PAYMENTS_WEBHOOK_HANDLER_FAILED"}}`, com `x-request-id`; log `webhook-handler-failed eventType=invoice.paid` |
| o mesmo `invoice.paid` de novo | `500 PAYMENTS_WEBHOOK_HANDLER_FAILED` de novo: o evento não foi marcado |

As cinco recusas de assinatura geraram cinco linhas `[payments] webhook-failed requestId=...` no log. Nenhuma
resposta trouxe `message` nem stack. As chaves da Stripe eram fictícias, existiram só no ambiente do processo e
nenhuma requisição saiu para a Stripe.

## Critérios de aceite

| # | Critério | Status | Meio |
|---|----------|--------|------|
| 1 | `/auth/me` sem credencial ativa → 401 `AUTH_INVALID_TOKEN`; válida → 200 `{data}` | PASS | `curl` em build + rota |
| 2 | Login da `apps/app` segue funcionando | PASS | e2e (agent-browser) |
| 3 | `/auth/sign-in` com corpo inválido → 400 `VALIDATION_FAILED` sem chamar o provedor | PASS | `curl` + rota (o "sem chamar" e a senha de 6 aceita vêm do teste de rota) |
| 4 | Recusa → 400 `AUTH_INVALID_CREDENTIALS` | PASS | `curl` contra o emulador do Auth |
| 5 | Limite → 429 `USERS_AUTH_RATE_LIMITED`; ausente → 404 `USERS_NOT_FOUND` | PASS | rota (o emulador não produz esses casos de forma controlada) |
| 6 | Sucesso mantém `{ session, user }` | PASS | `curl` + rota |
| 7 | Webhook com assinatura recusada → 400 `VALIDATION_FAILED`, sem handler, sem marca | PASS | `curl` + log + rota |
| 8 | Handler falhando → 500 `PAYMENTS_WEBHOOK_HANDLER_FAILED` sem marca; sem config → 503 | PASS | `curl` (handler e 503) + rota (dedupe) |
| 9 | Erros sem `message`, sem stack, com `x-request-id` | PASS | `curl` |
| 10 | Códigos novos nos 3 idiomas, paridade verde | PASS | `pnpm --filter @repo/internationalization test` 67/67 + leitura |
| 11 | Docs descrevem as respostas sem prometer o fim das reentregas | PASS | leitura de `docs/PAYMENTS.md` e `docs/SECURITY.md`; `PRE-PRODUCTION.md:568` bate com o 400 medido |
| 12 | 429 do Arcjet antes da rota | 🔒 não verificado | exige `ARCJET_KEY` válida |

## Lacunas herdadas

| Lacuna | Veredito |
|--------|----------|
| Nenhum teste prova que `FormattedError` traduz `AUTH_INVALID_TOKEN` do `/auth/me` | Continua aberta, sem prioridade |
| `IdentityToolkitError` de chave ausente cai em `AUTH_INVALID_CREDENTIALS` sem teste | Fora de escopo; segue como achado para a auditoria |

## Achados (informativos, fora do diff)

- `next build` da API em produção exige `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL` e
  `FIREBASE_ADMIN_PRIVATE_KEY` mesmo com o emulador (`apps/api/env.ts`). O build usou valores de forma válida e
  projeto `demo-`. Não são credencial: com o emulador ativo, `packages/auth/server.ts` não usa o `cert()`.
- Com o token de uma conta apagada, o servidor loga `Error verifying token: ... There is no user record` com stack.
  É só log do servidor; a resposta é o 401 sem detalhe.

## Ambiente

O mesmo da tarefa da web: emuladores com JDK 21 e o seed; API em `next build` + `next start` na 3002, duas vezes
(sem as chaves da Stripe e com chaves fictícias no ambiente do processo); app em `next dev` na 3000. Todas as
portas estavam livres no início. No fim, tudo foi derrubado por PID, o `firebase-tools` recebeu `SIGINT`, as
sessões do agent-browser foram fechadas e 3000, 3001, 3002, 3003, 9099, 8080, 4001, 9199, 4400, 4500 e 9150
ficaram livres. O harness em `/tmp` e os `firestore-debug.log` da rodada foram apagados.

O relatório foi gravado pelo orquestrador do `/cycle` com o conteúdo devolvido pelo `analista-qa`, porque a escrita
do subagent foi bloqueada pela harness.

## Dados de QA e estado de dev

Tudo no emulador, que morreu com o processo; nada em projeto real.

- `qa-api-error-codes@example.com`: criada no emulador do Auth, desativada e depois apagada, com senha aleatória que
  não ficou gravada em nenhum lugar.
- Conta do seed `user@example.com` (senha pública no repositório, não copiada para cá).
- Documentos de evento processado `evt_qa_*` no Firestore emulator.
- Nada a acrescentar ao `docs/PRE-PRODUCTION.md`.
