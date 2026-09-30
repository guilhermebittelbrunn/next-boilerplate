# Relatório do /test: disabled-account-revocation

Rodada autônoma do `/cycle`, em 2026-09-30, no workspace `indianapolis`, branch `run-cycle-pipeline` (não
protegida; o nome proposto pelo `/review` é `fix/disabled-account-revocation`, ainda não criado). Nenhum commit
da feature existe (`git log origin/main..HEAD` vazio), e o `review` está `done` no `STATE.md`, pela convenção do
`/cycle`.

O diff não tem superfície de UI. Por isso não abri browser. Subi só a API, contra o projeto Firebase de
desenvolvimento (`next-boilerplate-576d0`), porque a afirmação central da entrega só se prova ali: sob o
emulador, o `firebase-admin@13.6.0` confere `disabled` sozinho e o teste passaria sem a correção.

## Resultado

Nenhum defeito encontrado. Dos 4 itens da lista "Verificar no `/test`", 3 foram confirmados por medição e 1 (a
passada no navegador) ficou de fora por decisão de custo, com o motivo abaixo. Todos os gates passaram.

## Cobertura

| comando | escopo | resultado |
|---------|--------|-----------|
| `pnpm --filter @repo/auth test` | 9 arquivos | 112/112 |
| `pnpm --filter api test` | 78 arquivos | 1031/1031 |
| mutação 1: `if (user.disabled \|\| isMintedBeforeRevocation(...))` trocado por `if (isMintedBeforeRevocation(...))` + `pnpm --filter @repo/auth exec vitest run __tests__/serverSessionRevocation.test.ts` | 14 testes | 2 falhas, 12 passam: "recusa o id token de uma conta desativada" e "recusa mesmo com o token emitido depois da revogação" |
| mutação 2: `await revokeUserSessions(profile.reference_id);` trocado por `(void 0);` + `pnpm --filter api exec vitest run __tests__/usersAdminAuditTrail.test.ts` | 18 testes | 2 falhas, 16 passam: "revokes the target's sessions after disabling it in Firebase Auth" e "revokes when disabling together with other edits" |
| `pnpm test` (raiz, `turbo test test:emulator`, com `JAVA_HOME=/opt/homebrew/opt/openjdk@21`, sem `--force`) | 14 tasks, 7 do cache | saída 0, 14/14 tasks |

Contagem por workspace no `pnpm test` da raiz: `api` 1031, `app` 756, `@repo/email` 202, `api:test:emulator`
170, `@repo/auth` 112, `web` 82, `@repo/internationalization` 59, `@repo/design-system` 45, `@repo/shared` 44,
`@repo/analytics` 34, `@repo/next-config` 32, `@repo/security` 31, `@repo/payments` 22, `e2e` 16. São 2636
testes, todos passando. A paridade de i18n veio do cache (59/59) e não precisava rodar: o diff não toca
`packages/internationalization`.

Desfiz as duas mutações copiando de volta o arquivo salvo antes. O `shasum` do `git diff` dos quatro arquivos
de código e teste (`server.ts`, `route.ts` e os dois testes) deu `350e1f23d61a5a2e5f54da697e91ea6aaf788dc8`
antes das mutações e o mesmo valor depois de cada restauração.

Não remedi `typecheck` nem `pnpm check`: não mexi em código, e o `/review` mediu os dois (typecheck de
`@repo/auth` e `api` com saída 0; `pnpm check` com 806 arquivos limpos). Não criei teste novo.

## Decisões de custo de teste

| módulo tocado | decisão |
|---------------|---------|
| `packages/auth/server.ts` (`getCurrentUser`) | Nenhum teste novo. Os 5 casos de `serverSessionRevocation.test.ts`, com `firebase-admin/auth` mockado, cobrem a recusa por `disabled`, a independência da revogação, a conta ativa e a ausência de chamada extra, e 2 deles caem na mutação. Um teste de emulador seria pior que nenhum: passaria sem a correção. |
| `apps/api/app/(routes)/users/[id]/route.ts` (`PUT`) | Nenhum teste novo. Os 9 casos de `usersAdminAuditTrail.test.ts`, com repositório, guard e `@repo/auth/server` mockados, cobrem revogar só com `disabled: true`, a ordem `updateUser → revoke → audit` e os caminhos que não revogam (reativar, outras edições, falha do Firebase, 404, patch vazio). 2 caem na mutação. |
| cadeia `resolveApiActor → getCurrentUser → 401` | Nenhum teste persistente novo. A medição contra o projeto real, abaixo, percorreu a cadeia inteira sem mock. Um teste de unidade de `resolveApiActor` teria de mockar `verifySessionCookie` e só provaria o que o mock devolve. |

Nenhum teste da faixa cara foi criado.

## Verificar no /test

| item do `review.md` | veredito |
|---------------------|----------|
| 1. Bearer de conta desativada recusado contra o projeto Firebase real | **Confirmado.** `GET /account` (`requireCommonPanelApi`) com o bearer emitido antes da desativação: 200 com a conta ativa, 401 `{"error":{"code":"AUTH_INVALID_TOKEN"}}` com a conta desativada. Medi também sem revogação (conta desativada só pelo Admin SDK) e deu 401. Com a mutação 1 aplicada na API rodando, a mesma requisição voltou a dar **200** com o perfil no corpo; depois da restauração, 401 de novo. Isso mostra, no Firebase real, que `verifyIdToken` sem `checkRevoked` aceita o token de conta desativada e que a checagem nova é o que barra. |
| 2. Reativar com o mesmo bearer continua 401 | **Confirmado.** `PUT /users/:id` com `{"disabled":true}` como admin: 200, `disabled` passou a `true` e `tokensValidAfterTime` avançou de 18:27:00 para 18:27:57 GMT. `PUT` com `{"disabled":false}`: 200, e `tokensValidAfterTime` ficou em 18:27:57. O bearer antigo seguiu com 401 `AUTH_INVALID_TOKEN`; um login novo, 1,5 s depois, gerou um token aceito (`GET /account` 200). |
| 3. Números do handoff e as duas mutações | **Confirmado.** 112/112, 1031/1031, 2 falhas em cada mutação, com os nomes de teste que o handoff citou. Arquivos restaurados e conferidos pelo `shasum` do diff. |
| 4. Usuário desativado com o app aberto vai para o sign-in e vê a mensagem certa | **🔒 não verificado no navegador**, por decisão de custo. O diff não toca UI. O 401 que a aba aberta passa a receber é o mesmo que a revogação de sessão já produzia, e o callback de 401 do SDK é anterior à tarefa. A mensagem do sign-in vem do erro `auth/user-disabled` do SDK cliente do Firebase, também anterior. Medi o que dá sem browser: o login por senha da conta desativada volta `400 USER_DISABLED` no Identity Toolkit, e as três frases existem em `translations/packages/auth/index.ts:14`, `:42` e `:71`. A porta 3000 estava ocupada por um processo de outro projeto (Electron do `comanda10`); subir o app pediria outra porta e outra configuração de CORS. |
| extra do `review.md`: fallback `getUserFromSessionCookie(bearer)` sem `console.error` | **Confirmado.** Durante as 8 respostas 401 com bearer, o log da API tem só as linhas de acesso do Next (`GET /account 401 in 292ms`, por exemplo) e nenhum erro. |

## Critérios de aceite

| critério | status | meio |
|----------|--------|------|
| Bearer de conta desativada é recusado pelas rotas com guard | ✅ PASS | unidade + API contra Firebase real (`/account` 401, `/auth/me` 401). O admin desativado passa pela mesma `resolveApiActor`/`getCurrentUser` (leitura); não medi com uma conta admin como alvo |
| A recusa não depende de revogação | ✅ PASS | unidade + real (desativação só pelo Admin SDK: 401; com a mutação 1: 200) |
| Conta ativa segue funcionando | ✅ PASS | unidade + real (conta reativada sem revogação: `/account` 200) |
| Nenhuma chamada nova ao Firebase por requisição | ✅ PASS | unidade (`verifyIdToken` com 1 argumento, `getUser` uma vez) |
| Desativar pelo admin revoga as sessões da conta | ✅ PASS | unidade + real (`tokensValidAfterTime` avançou; 2 eventos `user.update` com `changedFields: ["disabled"]`) |
| Outras edições não revogam | ✅ PASS | unidade + real (a reativação não moveu `tokensValidAfterTime`) |
| Falha e recusa não revogam | ✅ PASS | unidade (falha do Firebase, patch vazio) + real (404 `USERS_NOT_FOUND`, 400 `VALIDATION_FAILED`, 403 `ADMIN_FORBIDDEN`, 401 sem bearer; conta alvo inalterada) |
| Reativar não ressuscita a sessão antiga | ✅ PASS | real (bearer antigo 401, login novo 200, login com a conta desativada `USER_DISABLED`) |
| Recusa sem ruído no log | ✅ PASS | real (log da API) |
| Quem é desativado é levado ao sign-in e vê a mensagem certa | 🔒 não verificado | leitura das chaves + `USER_DISABLED` no Identity Toolkit; sem browser, por custo |
| Os documentos descrevem o comportamento novo | ✅ PASS | âncoras do runbook conferidas com `sed -n` contra o código final; corrigi a última frase do runbook (abaixo) |
| Nenhum teste depende do emulador | ✅ PASS | mutações + `pnpm --filter` sem JDK |

## Evidências da execução

Esta rodada não tem screenshots. O que prova cada item é o texto acima. A sequência completa, na ordem em que
rodou contra `http://localhost:3002`:

1. `POST /auth/sign-up` com `qa-disabled-revocation@example.com`: `201 {"data":{"created":true}}`, perfil
   `common` criado.
2. Login por senha no Identity Toolkit: 200, bearer T1. `GET /auth/me` com T1: 200. `GET /entities` com T1:
   `503 PAGINATION_INDEX_MISSING`, a pendência de índice já registrada no `PRE-PRODUCTION.md`; o guard passou.
   Troquei para `GET /account`, que também usa `requireCommonPanelApi`.
3. `updateUser(uid, { disabled: true })` pelo Admin SDK, sem revogar: `GET /entities` e `GET /account` com T1
   deram `401 AUTH_INVALID_TOKEN`; `GET /auth/me` deu `401 {"message":"Invalid or expired token"}`.
4. Mutação 1 aplicada com a API no ar: `GET /account` com T1 deu 200 com o perfil. Restaurada: 401.
5. Reativação pelo Admin SDK, sem revogar: `GET /account` com T1 deu 200.
6. Como `qa-admin@example.com` (token customizado, sem senha), `PUT /users/<perfil>` com `{"disabled":true}`:
   200. T1 em `/account` e `/auth/me`: 401. Login por senha: `400 USER_DISABLED`.
7. `PUT` com `{"disabled":false}`: 200. T1: 401. Login novo: 200, e o bearer novo em `/account`: 200.
8. Com o bearer novo (conta comum), `PUT` no próprio perfil com `{"disabled":true}`: `403 ADMIN_FORBIDDEN`. Sem
   bearer: `401 AUTH_INVALID_TOKEN`. Como admin, id inexistente: `404 USERS_NOT_FOUND`; `{"disabled":"yes"}`:
   `400 VALIDATION_FAILED`. A conta seguiu ativa e o `tokensValidAfterTime` não mudou.

O harness ficou em `/tmp/qa-dar/`, fora do repositório. A senha da conta de QA foi gerada aleatoriamente em
memória e não foi para nenhum arquivo do repo; apaguei ao final o arquivo temporário de `/tmp` que guardava
senha e tokens entre as fases.

## Ambiente do e2e

| serviço | porta | o que fiz |
|---------|-------|-----------|
| `api` | 3002 | livre; subi com `pnpm --filter api dev` (PID 42622 e filhos 42626, 42637, 42660), matei pelos PIDs no fim, `lsof -ti tcp:3002` vazio |
| `app` | 3000 | ocupada por um processo de outro projeto (Electron do `comanda10`); não usei nem derrubei |
| emuladores | 8080, 9099, 9199, 4001 | não subi; o `test:emulator` do `pnpm test` sobe e derruba os seus, e as portas estavam vazias depois |
| `web`, `email` | 3001, 3003 | não usados |

## Documentos alterados nesta etapa

- `docs/INCIDENT-RESPONSE.md:51`: a última frase dizia que a única medição contra um projeto de dev era
  anterior à checagem de `disabled`. Depois desta rodada a frase ficou falsa, e troquei pelo resultado medido
  aqui (401 com a conta só desativada, 200 sem a checagem, bearer antigo recusado depois de desativar e
  reativar pelo `PUT`). Pertence ao commit 3 do plano do `/review`.
- `docs/PRE-PRODUCTION.md`, lista "Contas de QA acumuladas": entrada desta tarefa, dizendo que nenhuma conta
  sobrou. Não estava no plano de commits do `/review`; cabe no commit 3 (`docs`).

## Lacunas

| lacuna | veredito |
|--------|----------|
| `resolveApiActor` sem teste ponta a ponta com `getCurrentUser` real e conta desativada (handoff e review) | **Fechada por medição**, sem teste persistente: a cadeia rodou sem mock contra o Firebase real (item 1). Um teste de unidade dela mockaria `verifySessionCookie` e não acrescentaria prova. |
| `revokeUserSessions` lançando dentro do `PUT` (handoff e review) | **Fora de escopo**, como o review decidiu: a função engole a falha (`server.ts:326-328`), então a rota nunca vê o erro; o `catch` sem teste é anterior à tarefa. |
| Sign-in com a mensagem de conta desativada nos 3 idiomas (handoff) | **Continua aberta**, como 🔒, pelo motivo do item 4. |
| Admin desativado como alvo (critério 1, não medido com conta admin) | **Nova, pequena.** Mesmo caminho de código; não desativei a `qa-admin@`, que é conta compartilhada entre rodadas. |

## Estado de dev alterado

- Criados e apagados: `qa-disabled-revocation@example.com` no Authentication, o doc `user` dela e os 2 eventos
  `auditEvent` (`user.update`, `changedFields: ["disabled"]`) que o `PUT` gravou. Conferido depois da limpeza:
  `auth/user-not-found`, perfil inexistente, 0 eventos com o perfil em `involvedUserIds`.
- `qa-admin@example.com` serviu de ator, sem senha, por token customizado. Continua existindo, ativa e
  `admin`; o `lastAccessAt` do perfil passou a 2026-09-30T18:27:56Z.
- Nenhuma credencial gravada em arquivo versionado. Não havia `.claude/dev-credentials.local.md`; o acesso veio
  da service account que já está em `apps/api/.env`.
