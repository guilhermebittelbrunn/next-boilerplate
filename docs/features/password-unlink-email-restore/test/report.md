# Relatório de QA: devolução do e-mail ao desvincular a senha

Rodada autônoma do `/cycle`, passo 5, em 2026-10-19. Branch `guilhermebittelbrunn/cycle-command-v5`, que não é
protegida. O `/review` propôs `api/fix/google-sign-in-and-password-unlink`, e a renomeação espera o usuário.
O diff de produção desta feature é só `apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts`, mais
`docs/SECURITY.md:12`.

Legenda: ✅ verificado e correto · ❌ falha · 🔒 não verificável sem infra externa.

## Resultado

Nenhum defeito de produção. 12 critérios ✅ e 1 com uma parte 🔒 (CA2: a revogação que falha, conferida só por
leitura, sem teste; detalhe na tabela). Criei 3 casos no arquivo de teste da rota, que foi de 21 para 24 testes,
e medi no emulador de Auth as duas premissas do Firebase que a rota assume. A suíte da api foi de 105 / 1350
para 105 / 1353, e o `pnpm test` da raiz saiu com exit 0.

## Verificar no `/test` (lista do `review/review.md`)

| item | veredito | o que foi medido |
|------|----------|------------------|
| 1. Números do `/develop`: 21/21 no arquivo, 105 / 1350 na api, 2 falhas com a rota de `HEAD` | confirmado | Com a rota trocada por `git show HEAD:"apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts"` (`shasum` `90e0d59f…`), o arquivo deu `Tests 2 failed \| 19 passed (21)`. Caíram "tenta a devolução do e-mail de novo quando a primeira falha e responde 204" (`expected 500 to be 204`) e "revoga as sessões e registra o uid quando a devolução do e-mail falha nas duas tentativas" (lista de `updateUser` com 2 itens, esperados 3). Restaurada a rota, o `shasum` voltou a `a519993a…`, igual ao de antes. Os 1350 batem: 1350 mais os meus 3 casos dão os 1353 medidos. |
| 2. Mesmo `requestId` no log e na trilha, sem teste | fechado aqui | Caso novo "grava o mesmo requestId no log e na trilha quando a devolução do e-mail falha": a requisição leva `x-request-id: req-unlink-1` (`REQUEST_ID_HEADER`), e `recordAuditEventMock` e `logEventMock` recebem `requestId: "req-unlink-1"`. Mutação: com `requestId: null` no `logEvent` da rota, o caso falha, e o da linha real também (`2 failed \| 22 passed (24)`). |
| 3. Linha de log real, conferida só por leitura de `log.ts` | fechado aqui | Caso novo "imprime uma linha só, sem o e-mail, quando a devolução do e-mail falha": `logEventMock` delega ao `logEvent` real (`vi.importActual`), com `console.warn` espiado. Saída medida, exatamente uma linha: `[account] password-unlink-email-restore-failed uid=owner-1 requestId=req-unlink-1 reason=auth/internal-error attempts=2`. O erro injetado tinha como mensagem o e-mail seguido de quebra de linha e `forged line`; nada disso chegou à saída. |
| 4. Sequência no navegador depois do 500 com a sessão revogada | 🔒 | Reproduzir exige que a segunda chamada `updateUser` falhe duas vezes contra um Firebase de verdade, e nenhum caminho do produto ou do emulador injeta essa falha. A parte mensurável sem injeção está coberta: o 500 com `ACCOUNT_UPDATE_FAILED` (teste de rota) e o token revogado nesse estado (emulador, CA11). O alerta antes da ida ao login segue sem medição. Roteiro em `test/criterios-aceite.md`. |

## Critérios de aceite com status

| critério | status | meio |
|----------|--------|------|
| CA1. Devolução passageira não deixa a conta sem e-mail | ✅ | rota (mock): `:233`, 204, as três chamadas a `updateUser` iguais à lista esperada, revogação depois da última, sem log. Cai com a rota de `HEAD`. |
| CA2. Falha persistente revoga as sessões | ✅ revogação · 🔒 falha da revogação | rota (mock): `:325`, `revokeUserSessionsMock` com `owner-1` depois da última `updateUser` (`invocationCallOrder`). Emulador: sem devolução, `revokeRefreshTokens` levou o token de `valid` a `auth/id-token-revoked`. A frase "uma falha da própria revogação não muda a resposta" conferi só lendo `packages/auth/server.ts:330-336` (`try`/`catch` em volta de `revokeRefreshTokens`). Nenhum teste prova isso, e o pacote está fora do diff. |
| CA3. Falha persistente responde com o código que já existe | ✅ | rota (mock): `:325`, `500 ACCOUNT_UPDATE_FAILED` e trilha com `changedFields: ["password"]`. `git diff --name-only -- packages/internationalization` saiu vazio. |
| CA4. Falha persistente registrada sem dado pessoal | ✅ | rota (mock): `:325`, objeto exato do `logEvent` e `JSON.stringify(logEventMock.mock.calls)` sem o e-mail e sem a mensagem. Linha real em `:385`. |
| CA5. Log e trilha com o mesmo `requestId` | ✅ | rota (mock): `:366`, caso novo, com prova de mutação. |
| CA6. Uma linha só, sem o endereço | ✅ | rota com `logEvent` real e `console.warn` espiado: `:385`, caso novo. |
| CA7. Só a devolução é repetida | ✅ | rota (mock): `:309` (desvínculo recusado: uma chamada, sem trilha, revogação nem log) e `:185` (Google: uma chamada, 204, sem revogação). |
| CA8. Caminho feliz da senha inalterado | ✅ | rota (mock): `:208`, duas chamadas, trilha, revogação depois da devolução, sem log. |
| CA9. Conta sem e-mail pula a devolução e revoga | ✅ | rota (mock): `:404`, caso novo. `updateUser` uma vez (o desvínculo), `targetLabel: "Owner"` (o `displayName`), revogação, 204, sem log. Mutação: com a rota tentando a devolução sempre, o caso falha (`1 failed \| 23 passed (24)`). |
| CA10. Recusas anteriores inalteradas | ✅ | rota (mock): `:254` (409), `:271` e `:282` (404, 5 ids inválidos), `:431` (titular divergente, 403), `:449` (personificação, 403). Nenhum chama `updateUser`. |
| CA11. O Firebase se comporta como a rota supõe | ✅ | emulador de Auth, medição única fora da suíte (detalhe abaixo). |
| CA12. Teste rápido e prova contra a versão anterior | ✅ | a rota não espera entre tentativas (`route.ts:40-47`, laço sem `setTimeout`), e o teste não usa timer. Prova contra `HEAD` no item 1 acima. |
| CA13. Documentação de segurança atualizada | ✅ | leitura contra o código: a frase nova de `docs/SECURITY.md:12` confere com `ADDRESS_RESTORE_ATTEMPTS = 2` (`route.ts:20`), revogação incondicional (`:122`), `500` (`:131-134`), campos do log (`:125-130`, medidos em CA6) e com o `logEvent("audit", "write-failed", { …, requestId })` de `apps/api/(shared)/lib/audit-recorder.ts:112-115`. |

## Medição no emulador de Auth

Subi o emulador porque aqui o objeto da medição é o próprio Firebase. As duas premissas da rota (o desvínculo
da senha apaga o e-mail, e a devolução revoga os tokens) estavam medidas só à mão, numa rodada anterior
(`docs/features/linked-sign-in-methods/develop/handoff.md:58`). O estado da conta na falha persistente nunca
tinha sido medido. Um script em `/tmp`, fora do repo, rodou `firebase-admin@13.6.0` (o da `apps/api`) contra
`127.0.0.1:9099`, com pausas de 1,2 s entre os passos, porque `tokensValidAfterTime` tem resolução de segundo.

Conta A, `qa-password-unlink@example.com`, com senha e Google (`providerToLink`):

| passo | `email` | `emailVerified` | provedores | ID token aberto antes |
|-------|---------|-----------------|------------|------------------------|
| antes | o endereço | `true` | `google.com`, `password` | `valid` (login por senha: 200) |
| `providersToUnlink: ["password"]` | ausente | `false` | `google.com` | `valid` |
| `updateUser({ email, emailVerified: true })` | o endereço | `true` | `google.com` | `auth/id-token-revoked` (`tokensValidAfterTime` avançou 3 s) |

Depois disso, o login com a senha antiga respondeu `INVALID_PASSWORD`.

Conta B, `qa-password-unlink+restore-failed@example.com`, que simula a falha persistente (sem devolução):

| passo | `email` | ID token aberto antes |
|-------|---------|------------------------|
| `providersToUnlink: ["password"]` | ausente | `valid` |
| `revokeRefreshTokens` | ausente | `auth/id-token-revoked` |

A conta B mostra que a revogação explícita que a rota passou a fazer é necessária: sem ela, o token aberto antes
do desvínculo segue válido quando a devolução não acontece. O script apagou as duas contas com `deleteUsers` no
fim, e o emulador não persiste nada.

## Cobertura e comandos

| comando | resultado |
|---------|-----------|
| `pnpm --filter api exec vitest run __tests__/accountSignInMethodsRoute.test.ts` com a rota de `HEAD` | 21 testes, 2 falhas, 19 passando (esperado), antes dos meus casos |
| idem, com a rota nova e os 3 casos novos | 24 testes passando |
| idem, mutação `requestId: null` no `logEvent` | 2 falhas (`:366`, `:385`), 22 passando |
| idem, mutação "devolve o e-mail sempre" | 1 falha (`:404`), 23 passando |
| `pnpm exec biome check apps/api/__tests__/accountSignInMethodsRoute.test.ts` | sem erro |
| `pnpm check` | `Checked 936 files`, `No fixes applied` |
| `pnpm --filter api typecheck` | sem erro |
| `pnpm --filter api test` | 105 arquivos, 1353 testes passando, exit 0 |
| `pnpm test` (raiz, sem `--force`, `JAVA_HOME` no openjdk@21) | exit 0, `Tasks: 15 successful, 15 total`, 13 do cache. `api:test` 105 / 1353; `api:test:emulator` 5 / 191; `app:test` 112 / 924; `web:test` 22 / 169; `@repo/auth` 11 / 132; `@repo/internationalization` 7 / 67; os demais pacotes verdes |
| paridade i18n | não rodou à parte: nenhum arquivo de `packages/internationalization` no diff. Passou dentro do `pnpm test` da raiz (7 / 67) |

Antes de cada troca guardei a rota nova em `/tmp` e, depois de restaurar, conferi o `shasum` (`a519993a…`).
O `git status` no fim lista os mesmos arquivos do início; dentro da feature, mudou só o arquivo de teste.

## Testes criados

Todos em `apps/api/__tests__/accountSignInMethodsRoute.test.ts`, na faixa barata (rota com `vi.mock`):

- `:366` "grava o mesmo requestId no log e na trilha quando a devolução do e-mail falha";
- `:385` "imprime uma linha só, sem o e-mail, quando a devolução do e-mail falha", com o `logEvent` real e
  `console.warn` espiado;
- `:404` "desvincula a senha de uma conta sem e-mail sem tentar devolvê-lo e revoga as sessões".

Infra nova no arquivo: `REQUEST_ID`, `OWNER_HEADERS_WITH_REQUEST_ID`, `realLogEvent` (`vi.importActual`) e o
helper `failEveryAddressRestore`. Os 21 casos que já existiam não mudaram.

## Decisões de custo de teste

- A rota: os três casos novos ficaram na faixa barata. Correlação de `requestId`, formato da linha e o ramo sem
  e-mail são lógica da rota e do `log.ts`, e o mock prova os três por inteiro.
- O comportamento do Firebase: medido no emulador, sem virar teste permanente. O runner `test:emulator` da
  `apps/api` sobe Firestore e Storage, não o Auth, e o plano deixou o teste contra o Auth fora do corte (🟢 em
  `specs/BACKLOG.md:1539`). Pôr o Auth no runner mexe na infra do CI, fora do escopo desta tarefa.
- `packages/auth` (`revokeUserSessions` engolindo o erro): sem teste novo, porque o pacote está fora do diff.
  Fica como lacuna.

## Lacunas herdadas

| lacuna | origem | veredito |
|--------|--------|----------|
| Conta sem `email` no desvínculo da senha | handoff, review | fechada aqui: caso `:404`, com prova de mutação |
| Comportamento do Firebase medido só à mão | handoff, review | fechada como medição (emulador, nesta rodada, incluindo o estado da falha persistente). Continua aberta como teste de suíte: depende de pôr o Auth no `test:emulator` |
| `requestId` igual no log e na trilha | review | fechada aqui: caso `:366` |
| Linha de log real | handoff, review | fechada aqui: caso `:385` |
| Falha real da devolução contra o Firebase | handoff | continua aberta (🔒): exige injetar falha no Admin SDK entre as duas chamadas |
| Sequência no navegador depois do 500 | handoff, review | continua aberta (🔒), mesmo motivo; roteiro em `test/criterios-aceite.md` |
| `revokeUserSessions` engole o erro, sem teste | nova, desta rodada | aberta, fora de escopo (`packages/auth` fora do diff) |
| `console.error` cru em `packages/auth/server.ts:334` | review | fora de escopo, já encaminhado ao `/spec --sync` |

## Browser

Não subi app nem `agent-browser`. O diff não tem superfície de UI: nenhum arquivo de `apps/app`, `apps/web` ou
`packages/design-system`, nenhuma chave de tradução, nenhum `error.code` novo. O efeito visível no app (alerta e
ida ao login depois do 500) só aparece com falha injetada no Admin SDK, e está registrado como 🔒.

## Ambiente do e2e

| serviço | porta | o que fiz |
|---------|-------|-----------|
| emulador de Auth (`firebase emulators:start --only auth --project demo-next-boilerplate`, JDK 21) | 9099, mais hub 4400, logging 4500 e UI 4001 | as portas estavam livres; subi, guardei o PID e matei pelo PID no fim. Depois, 9099, 4001, 4400, 4500 e 9150 saíram vazias no `lsof` |
| `api:test:emulator` dentro do `pnpm test` | 8080, 9199 | o próprio runner sobe e derruba; antes e depois, as duas portas saíram vazias |
| app, web, api, email | 3000 a 3003 | não subi |

## Dados de QA e estado de dev

- `qa-password-unlink@example.com` e `qa-password-unlink+restore-failed@example.com`, criadas só no emulador
  (projeto `demo-next-boilerplate`) e apagadas no fim do script. Nenhuma conta em projeto real, então nada entra
  em `docs/PRE-PRODUCTION.md`.
- O script gerou a senha das duas aleatoriamente e não a gravou em lugar nenhum.
- Nenhum dado de dev alterado.
