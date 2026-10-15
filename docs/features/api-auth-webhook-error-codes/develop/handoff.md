# Handoff do `/develop`: contrato de erro de `/auth/me`, `/auth/sign-in` e do webhook de pagamentos

Implementação do blueprint de `analyze/plan.md`, sem mudança em `packages/sdk`, `apps/app` ou `apps/web`.
Nenhuma env nova, nenhum acesso novo ao Firestore.

## Blueprint → arquivos

| item do blueprint | arquivos |
|-------------------|----------|
| `/auth/me` responde `401 AUTH_INVALID_TOKEN` nos dois ramos | `apps/api/app/(routes)/auth/me/route.ts`, `apps/api/__tests__/authMeRoute.test.ts` (novo) |
| `signInSchema` + `parseSignIn` (`parseWith`, senha via `existingPasswordSchema`) | `apps/api/(shared)/validation/auth.schema.ts` |
| `/auth/sign-in` com `parseRequestJson`, Zod, mapeamento do Identity Toolkit e `404 USERS_NOT_FOUND` | `apps/api/app/(routes)/auth/sign-in/route.ts`, `apps/api/__tests__/authSignInRoute.test.ts` (novo) |
| Webhook: `failure()` dividido em `signatureRejected()` (400 `VALIDATION_FAILED`) e `handlerFailed()` (500 `PAYMENTS_WEBHOOK_HANDLER_FAILED`) | `apps/api/app/(routes)/webhooks/payments/route.ts`, `apps/api/__tests__/paymentsWebhookRoute.test.ts` |
| `AUTH_INVALID_CREDENTIALS` e `PAYMENTS_WEBHOOK_HANDLER_FAILED` em `apiErrors` | `packages/internationalization/translations/packages/shared/utils.ts` |
| Documentação | `docs/PAYMENTS.md`, `docs/SECURITY.md` |

A ordem de commits do §10.5 do plano continua valendo; cada linha da tabela acima cabe num commit dela.

## Contrato

Nenhum DTO nem action mudou. Quem lê essas respostas está listado no §3 do plano; nenhum consumidor do repo lê
`message` nessas rotas (conferido no plano, não remedido aqui). O formato de sucesso do `/auth/sign-in`
(`{ session, user }`, sem `data`) ficou igual, e um teste fixa isso.

## Códigos de erro novos

- `AUTH_INVALID_CREDENTIALS`: pt-br "E-mail ou senha incorretos.", en "Incorrect email or password.", es
  "Correo electrónico o contraseña incorrectos.".
- `PAYMENTS_WEBHOOK_HANDLER_FAILED`: pt-br "Não foi possível processar o evento de pagamento.", en "The payment
  event could not be processed.", es "No se pudo procesar el evento de pago.".

Os dois estão nos três blocos de `apiErrors`; `pnpm --filter @repo/internationalization test` passou (67/67).

## Asserções do webhook que mudaram de 500 para 400

As quatro descreviam o defeito que a tarefa corrige: o 500 era a resposta a uma requisição recusada, não a uma
falha do servidor. Nenhuma asserção saiu; algumas ganharam verificação a mais.

| teste | antes | depois | por quê |
|-------|-------|--------|---------|
| header `stripe-signature` ausente | 500 `{ message, ok: false }` | 400 `VALIDATION_FAILED`; continua cobrando `constructEvent` não chamado e passa a cobrar `markProcessed` não chamado | quem chama não mandou a credencial; é recusa, não erro do servidor |
| assinatura que não confere (mock) | 500 `{ message, ok: false }` | 400 `VALIDATION_FAILED`; continua cobrando `markProcessed` não chamado e passa a cobrar `wasProcessed` não chamado | mesma recusa, com `constructEvent` lançando |
| corpo adulterado (SDK real da Stripe) | 500 | 400 `VALIDATION_FAILED` com corpo conferido; asserções de handler e marcação mantidas | o HMAC não confere; é o mesmo caso com assinatura real |
| assinatura com outro segredo (SDK real) | 500 | 400 `VALIDATION_FAILED` com corpo conferido; passa a cobrar `markProcessed` não chamado | idem |

Os dois testes de 500 do handler e do dedupe mantêm o status 500 e ganharam a asserção do corpo
`PAYMENTS_WEBHOOK_HANDLER_FAILED`; o do dedupe também passou a cobrar `markProcessed` não chamado. Os testes de
503, de "não vaza a mensagem da Stripe" e de log com e sem `requestId` não foram tocados. Caso novo: assinatura
real gerada com carimbo de uma hora atrás responde 400, não roda handler, não marca e loga `webhook-failed`.

## Desvios

Nenhum desvio de decisão. Diferenças pequenas em relação ao texto do plano:

1. **Testes a mais no `/auth/sign-in`**: JSON inválido, conta desativada (`USER_DISABLED` → o mesmo
   `AUTH_INVALID_CREDENTIALS`) e e-mail com espaços nas pontas chega aparado ao provedor. Os cinco casos de
   corpo inválido viraram um `it.each`.
2. **`docs/SECURITY.md` ganhou um item sobre `/auth/sign-in`** na seção "Autenticação", porque o critério 8
   pede que o documento descreva essas respostas e a tabela de guards só cita a rota pelo nome. O item da tabela
   de `/auth/*` também passou a citar `/auth/session`, que já existia sem guard e não estava na lista.
3. **Inventário remedido** com `find "apps/api/app/(routes)" -name route.ts` e
   `grep -L "require(CommonPanel|Admin|Plan)Api"`: 36 arquivos, 23 com guard, 13 sem; `account/*` ×10; três
   guards. Bate com o plano. Acrescentei o `requirePlanApi` à lista de guards, com o `POST /entities` como único
   usuário (`grep -rn requirePlanApi "apps/api/app/(routes)"`).
4. **Docstring do `POST` do webhook reescrita**: diz que a Stripe reentrega qualquer resposta fora de `2xx`, e
   que a assinatura recusada responde 400. Não promete o fim das reentregas.
5. **Tolerância da assinatura** no `docs/PAYMENTS.md`: escrevi "300 s do SDK da Stripe" depois de conferir
   `DEFAULT_TOLERANCE: 300` em `node_modules/.pnpm/stripe@19.1.0_*/node_modules/stripe/cjs/Webhooks.js:8`.

## Decisões em aberto

As oito do plano já vêm decididas, e nada aqui as reabre. Nenhum bloqueio.

## Validação

| gate | comando | resultado |
|------|---------|-----------|
| typecheck | `pnpm --filter api typecheck` | exit 0 |
| testes da API | `pnpm --filter api test` (`vitest run`) | 95 arquivos, 1222 testes, todos passando (2 arquivos e 17 testes são desta tarefa: 3 + 13 nos novos, 1 no webhook) |
| paridade i18n | `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes, exit 0 |
| lint | `pnpm check` (só leitura) | exit 0, 889 arquivos, nenhum erro (inclui os arquivos da outra feature) |
| formatação | `pnpm exec biome check --write` só nos arquivos desta tarefa | aplicado |

`test:emulator` não rodou: nada aqui toca Firestore.

**Os testes novos falham no código anterior.** Troquei as três rotas pela versão de `HEAD`
(`git show HEAD:<arquivo> > <arquivo>`, com cópia em `/tmp`), rodei
`vitest run __tests__/authMeRoute.test.ts __tests__/authSignInRoute.test.ts __tests__/paymentsWebhookRoute.test.ts`
e restaurei, conferindo com `cmp`. Resultado: 19 de 70 falham. São os 2 de 401 do `/auth/me`; 10 do
`/auth/sign-in` (5 de corpo inválido, e-mail aparado, 2 de `AUTH_INVALID_CREDENTIALS`, 429, 404); e 7 do webhook
(header ausente, assinatura que não confere, corpo adulterado, outro segredo, carimbo velho, e os 2 de handler
e dedupe pela asserção nova do corpo). Os que passam no código antigo são
os que fixam comportamento que não mudou: sucesso do `/auth/me`, formato `{ session, user }`, senha no mínimo
de 6 aceita e erro fora do provedor propagando.

## A verificar no `/test`

Nada abaixo foi medido aqui: nenhuma rota rodou fora do Vitest.

1. Respostas reais contra a API em build (`pnpm --filter api build && start`, porta 3002), roteiro do §8.1 do
   plano: `curl -i` em `GET /auth/me` sem credencial e com `Authorization: Bearer lixo`; `POST /auth/sign-in`
   sem corpo, com `{}` e com senha errada contra o emulador do Auth; `POST /webhooks/payments` sem chaves (503),
   e com `STRIPE_SECRET_KEY=sk_test_<qualquer>`/`STRIPE_WEBHOOK_SECRET=whsec_<qualquer>` sem header e com
   `stripe-signature: t=1,v1=00` (400). Conferir `x-request-id`, ausência de `message` e de stack.
2. O 429 do proxy (Arcjet) continua vindo antes da rota no `/auth/sign-in`; o teste de rota não passa pelo proxy.
3. Passada curta de login na `apps/app` (§8.2 do plano): entrar, chegar ao painel, sair, abrir `/pt-br` anônimo
   e cair no sign-in. O 401 do `/auth/me` não mudou de status, mas o corpo mudou, e só o fluxo real prova que
   `getAppSessionUser` segue redirecionando.

## Lacunas de teste conhecidas

- Nenhum teste prova que `FormattedError` traduz `AUTH_INVALID_TOKEN` vindo do `/auth/me`; o caminho é o mesmo
  de qualquer outro código e já tem cobertura no pacote `shared`.
- O `IdentityToolkitError` de chave ausente (`firebase-identity-toolkit.ts:47-49`) cai em
  `AUTH_INVALID_CREDENTIALS`, como o plano registrou em "Achados". Não há teste que fixe isso; continua aberto
  como achado, fora de escopo.

## Achados novos (para a próxima auditoria)

- `docs/SECURITY.md:155` lista o que fica fora do rate limit e não cita `/auth/session`, que também não está em
  `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:45-58`). Não alterei: a linha é do rate limit, não desta tarefa.
