# Handoff do `/develop`: devolução do e-mail ao desvincular a senha

Implementação do plano `analyze/plan.md` sem desvio de comportamento. O único ajuste foi de forma no teste,
para passar no `noMagicNumbers` e no `noMisplacedAssertion` do Biome (ver "Desvios").

## Blueprint → arquivos

| item do plano | arquivo | o que mudou |
|---------------|---------|-------------|
| §10.1 rota | `apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts` | `ADDRESS_RESTORE_ATTEMPTS = 2`; função local `restoreUnlinkedAddress(uid, address)` que repete `updateUser` sem espera e devolve `{ restored }` ou `{ restored: false, reason }`; `revokeUserSessions` roda sempre que a senha saiu; na falha persistente, `logEvent("account", "password-unlink-email-restore-failed", { uid, requestId, reason, attempts })` e `500 ACCOUNT_UPDATE_FAILED`. O desvínculo continua com uma chamada só. O comentário sobre o Firebase apagar o endereço ficou; o da revogação foi reescrito para o fluxo novo. |
| §7.1 teste | `apps/api/__tests__/accountSignInMethodsRoute.test.ts` | mock de `@repo/shared/utils/helpers/log` (`logEventMock`, incluído no `mockReset`); caso de `:252` reescrito para a falha persistente; dois casos novos; caminho feliz da senha passa a conferir a contagem de chamadas e a ausência de log. |
| §10.5 doc | `docs/SECURITY.md:12` | frase do plano acrescentada depois de "e a tela sai da conta." |

Conferências feitas antes de seguir o plano:

- `logEvent(scope: LogScope, event: string, fields?: LogFields)` em `packages/shared/utils/helpers/log.ts:51-57`;
  `"account"` está na lista de escopos (`:6`) e `null`/`undefined` são descartados na linha (`:38-39`).
- `adminAuthErrorReason(error: unknown): string` em `apps/api/(shared)/lib/toolkit-error-codes.ts`: devolve o
  `code` do erro quando é string, senão o `name` do `Error`, senão `"unknown"`. Nunca a mensagem.
- Os campos do log são `uid`, `requestId`, `reason` e `attempts`. O e-mail não entra, e o teste prova (ver
  "Validação").
- `revokeUserSessions` engole o próprio erro (`packages/auth/server.ts:330-336`), então rodar a revogação na
  falha não cria caminho de exceção novo.

## Contrato

Nenhuma mudança em `packages/sdk`. `unlinkSignInMethod(providerId): Promise<void>` é o mesmo, e o
`500 ACCOUNT_UPDATE_FAILED` já existia. Consumidor: `useSignInMethodMutations.tsx` em `apps/app`, sem mudança
de código; o efeito no app (sessão revogada também na falha) está descrito na §1.3 do plano.

## Códigos de erro novos

Nenhum. Nada entra em `apiErrors`.

## Desvios

- **Forma do teste.** O plano descrevia as asserções com `toHaveBeenCalledTimes(3)` e
  `toHaveBeenNthCalledWith(2|3, ...)`. O `pnpm check` recusou os literais (`lint/style/noMagicNumbers`) e,
  quando tentei helpers com `expect` fora do `it`, `lint/suspicious/noMisplacedAssertion`. A versão final
  compara `updateUserMock.mock.calls` inteiro com a constante `UNLINK_THEN_EVERY_RESTORE_CALLS` (o desvínculo
  seguido de `ADDRESS_RESTORE_ATTEMPTS` devoluções iguais) e usa `lastUpdateUserCallOrder()` para a ordem da
  revogação. A asserção ficou mais estrita que a do plano: ela fixa a lista exata de chamadas, não só a
  contagem e duas posições.
- **Contagem de casos.** O plano fala em "ganha três"; o terceiro é o caminho feliz existente ampliado, não um
  caso novo. O arquivo foi de 19 para 21 testes.
- Nenhuma decisão do plano estava errada. As suposições sobre `logEvent`, `adminAuthErrorReason` e
  `revokeUserSessions` conferem com o código.

## Decisões em aberto, pendências e bloqueios

Nenhum bloqueio. Achado adjacente, fora do escopo: `revokeUserSessions` faz
`console.error("Error revoking user sessions:", error)` com o erro cru (`packages/auth/server.ts:334`), fora do
padrão `logEvent` sem mensagem. Não foi mexido; serve de candidato ao backlog.

## Validação

| o que | comando | resultado |
|-------|---------|-----------|
| arquivo da rota | `pnpm --filter api exec vitest run __tests__/accountSignInMethodsRoute.test.ts` | 21/21 passam |
| suíte da api | `pnpm --filter api test` | 105 arquivos, 1350 testes, todos passam |
| typecheck | `pnpm --filter api typecheck` | exit 0 |
| lint/format | `pnpm check` | 936 arquivos, 0 erros |
| i18n | não rodado | nenhuma chave mexida |

Prova de que o teste pega o defeito. A rota de `HEAD` (`git show HEAD:"apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts"`,
`shasum` `90e0d59f…`) foi posta no lugar da nova e o arquivo de teste rodou: 2 falhas, 19 passam.

- "tenta a devolução do e-mail de novo quando a primeira falha e responde 204": `expected 500 to be 204`;
- "revoga as sessões e registra o uid quando a devolução do e-mail falha nas duas tentativas": a lista de
  chamadas a `updateUser` tem 2 itens, o esperado tem 3.

Rodei também duas mutações na rota nova, cada uma restaurada antes da seguinte:

- revogar só quando a devolução passa: 1 falha (`revokeUserSessionsMock` não chamado com `owner-1`), 20 passam;
- acrescentar `hint: ctx.user.email` aos campos do log: 1 falha (a asserção exata de `logEventMock`), 20
  passam. A checagem `JSON.stringify(logEventMock.mock.calls)` sem o e-mail e sem a mensagem do erro também
  está no caso.

Depois de cada troca a rota voltou ao `shasum` `a519993a…`, conferido no fim de cada comando.

## A verificar no `/test`

- Repetir a prova contra `HEAD` e a suíte da api (os números acima são medição minha, não do QA).
- `pnpm test` da raiz, que gateia o build. Não rodei.
- 🔒 Falha real da devolução contra o Firebase: exige injetar falha no Admin SDK entre as duas chamadas.
  Fica no teste de rota.
- 🔒 Sequência no navegador depois do 500 com a sessão revogada (alerta de `ACCOUNT_UPDATE_FAILED`, 401, ida ao
  login). Mesmo motivo.
- Formato da linha de log real (`[account] password-unlink-email-restore-failed uid=… reason=… attempts=2`): o
  teste mocka `logEvent`, então a linha impressa só foi conferida por leitura de `log.ts:56`.

## Lacunas de teste conhecidas

- Conta sem `email` no desvínculo da senha (pula a devolução e revoga): comportamento anterior mantido, sem
  caso de teste próprio, nem antes nem agora.
- O comportamento do Firebase que a rota supõe (o desvínculo apaga o e-mail; a devolução revoga os tokens)
  continua medido só à mão, fora da suíte.
