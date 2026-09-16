# Handoff: observabilidade, request id e readiness

Implementação do plano em [`analyze/plan.md`](../analyze/plan.md). Rodada autônoma, sem pergunta ao
usuário. Nenhuma variável de ambiente nova, nenhuma dependência nova, nenhum commit e nenhuma branch.

## Blueprint em arquivos

### `packages/shared`

| Item do blueprint | Arquivos |
|---|---|
| 10.1 Helper de log | `utils/helpers/log.ts` (novo), `utils/helpers/index.ts` |
| 10.2 Constante do header | `utils/helpers/request-id.ts` (novo) |
| 10.3 Gancho de erro | `utils/helpers/requestErrorReporter.ts` (novo) |
| 10.6 `FormattedError` e `handleClientError` | `utils/helpers/formattedError.ts`, `utils/helpers/handleClientError.ts` |
| 7. Testes | `__tests__/log.test.ts`, `__tests__/formattedErrorRequestId.test.ts` (ambos novos) |

### `apps/api`

| Item do blueprint | Arquivos |
|---|---|
| 10.2 Request id no proxy | `proxy.ts` |
| 10.2 CORS | `(shared)/lib/cors.ts` |
| 10.3 `onRequestError` | `instrumentation.ts` |
| 10.4 Liveness e readiness | `app/(routes)/health/route.ts`, `app/(routes)/health/ready/route.ts` (nova), `(shared)/lib/readiness.ts` (novo) |
| 10.7 Call sites | `(shared)/lib/storage.ts`, `(shared)/lib/entity-photo.ts`, `(shared)/lib/account-avatar.ts`, `(shared)/lib/auth-action-links.ts`, `app/(routes)/auth/sign-up/route.ts`, `app/(routes)/auth/password/reset/route.ts`, `app/(routes)/auth/password/reset-request/route.ts`, `app/(routes)/users/route.ts`, `app/(routes)/webhooks/payments/route.ts` |
| 7. Testes | `__tests__/requestId.test.ts`, `__tests__/healthReady.test.ts` (novos); `__tests__/health.test.ts`, `__tests__/corsOrigin.test.ts`, `__tests__/instrumentation.test.ts`, `__tests__/paymentsWebhookRoute.test.ts` (estendidos) |

### `apps/app`, `apps/web`, i18n

`apps/app/instrumentation.ts` e `apps/web/instrumentation.ts` são novos, com uma exportação só.
`packages/internationalization/translations/packages/shared/utils.ts` recebeu as 2 chaves nos 3 idiomas.

## Contrato

`packages/sdk` não mudou, conforme D8. O que mudou no contrato de tipos:

- `FormattedError` ganhou o campo público `requestId: string | null`. É adição, não quebra. Consumidores:
  todo `useXCrud`, `useAccountMutations`, `useFileUpload`, os quatro formulários de
  `(unauthenticated)` e `apps/app/proxy.ts`. Nenhum precisou mudar, porque a composição da mensagem
  acontece dentro de `handleClientError`.
- `@repo/shared` exporta `logEvent`, `LogScope`, `LogFieldValue`, `LogFields`, `REQUEST_ID_HEADER`,
  `generateRequestId`, `requestIdFrom` e `reportRequestError`.
- Toda resposta da API passa a carregar o header `x-request-id`, e `Access-Control-Expose-Headers`
  passou de `Retry-After` para `Retry-After, x-request-id`.

## Códigos de erro

`HEALTH_DEPENDENCY_UNAVAILABLE` é o único código novo. Está em `apiErrors` nos três idiomas:

| Idioma | Texto |
|---|---|
| pt-br | O serviço está indisponível no momento. |
| en | The service is unavailable right now. |
| es | El servicio no está disponible en este momento. |

`error.requestIdLabel` é a outra chave nova: `Código do erro` / `Error code` / `Código del error`.

## Desvios em relação ao plano

### 1. `REQUEST_ID_HEADER` mora em `packages/shared`, não em `apps/api`

O plano (§10.2) criava `apps/api/(shared)/lib/request-id.ts`. Não dá: `FormattedError` vive em
`packages/shared` e precisa ler o mesmo header (§10.6 do próprio plano usa o literal `"x-request-id"`
lá dentro). Seguir o plano ao pé da letra escreveria o nome do header em dois lugares que precisam
concordar, dentro de uma tarefa cuja tese é que convenção copiada se degrada. O módulo ficou em
`packages/shared/utils/helpers/request-id.ts` e a API importa dele.

### 2. O corpo do `onRequestError` é um só, compartilhado pelos três apps

O plano (§10.3) repetia as mesmas oito linhas em `apps/api`, `apps/app` e `apps/web`. Pelo mesmo
argumento do desvio anterior, o corpo virou `reportRequestError` em `packages/shared`, e cada
`instrumentation.ts` faz:

```ts
export const onRequestError: Instrumentation.onRequestError = reportRequestError;
```

O tipo vem de `next`, então o Next continua validando a assinatura em cada app. `packages/shared` não
importa `next`: os parâmetros de `reportRequestError` são estruturais.

### 3. O teste de tipo do helper virou teste de contenção

O critério de aceite diz que não existe assinatura que permita passar um `Error`. A garantia real é o
tipo `LogFieldValue`, e ela é cobrada sempre que um app typecheca uma chamada. O que **não** dá para
cobrar é uma asserção de tipo dentro de `packages/shared/__tests__/`, porque esse workspace tem `test`
mas não tem `typecheck` (é o único pacote nessa situação). Um teste cuja asserção é uma constante
`true` passaria sempre e mentiria sobre estar verificando algo.

No lugar dele, `log.test.ts` força um `Error` pela assinatura com um cast e verifica o que importa em
runtime: a stack de várias linhas não vira várias entradas de log. Ver a lacuna na última seção.

### 4. Três testes existentes mudaram de asserção

A linha de log mudou de propósito, então a asserção sobre ela tinha de mudar junto. Nenhum teste foi
afrouxado ou desativado:

- `corsOrigin.test.ts` (2 asserções): a linha `[security] blocked …` ganhou ` requestId=<uuid>`. As
  comparações por igualdade viraram regex ancoradas, que também passaram a exigir o formato do UUID.
- `paymentsWebhookRoute.test.ts`: `Unhandled event type invoice.paid` virou
  `[payments] webhook-unhandled-event eventType=invoice.paid`.

### 5. A sonda de prontidão limpa o próprio timer

O plano descrevia um `Promise.race` contra um timer. Sem `clearTimeout`, o timer de 2 segundos segue
vivo depois que a sonda responde e segura o event loop. `probeDatabase` limpa o timer num `finally`.

## Pendências e bloqueios

Nenhum bloqueio. As quatro pendências de infra da §11 do plano continuam de pé e são de console de
provedor: apontar o health check para `/health/ready`, plugar um coletor no `onRequestError`, conferir
a retenção de log da plataforma e decidir o destino do cron órfão `/cron/keep-alive`.

A decisão D1 (sem serviço gerenciado de coleta) foi mantida. O custo continua sendo o que o plano já
dizia: a trilha existe e é consultável, mas ninguém é notificado.

## Validação

Comandos e resultados:

| Comando | Resultado |
|---|---|
| `pnpm check` | 528 arquivos, 0 erro |
| `pnpm turbo run lint typecheck test --force` | 23 de 23 tasks |
| `pnpm --filter api test` | 35 arquivos, 365 testes |
| `pnpm --filter app test` | 36 arquivos, 265 testes |
| `pnpm --filter web test` | 4 arquivos, 27 testes |
| `pnpm --filter @repo/shared test` | 3 arquivos, 34 testes |
| `pnpm --filter @repo/internationalization test` | 3 arquivos, 27 testes (inclui a paridade) |
| `pnpm --filter @repo/auth test` | 6 arquivos, 62 testes |
| `pnpm --filter @repo/email test` | 7 arquivos, 137 testes |
| `pnpm --filter @repo/security test` | 3 arquivos, 31 testes |
| `pnpm --filter @repo/payments test` | 1 arquivo, 8 testes |

Total: 98 arquivos, 956 testes, nenhuma falha.

### Validação em runtime

A API foi subida na 3002 e o app na 3000. Ambos foram derrubados no fim; as portas estão livres.

Header em todos os caminhos do proxy, com `curl`:

| Caminho | Resultado |
|---|---|
| `GET /health` | `x-request-id: bd13c77c-…` |
| Duas chamadas seguidas | IDs diferentes (`14836c2f-…`, `65c538e7-…`) |
| `x-request-id: FORJADO-PELO-CLIENTE` na entrada | Volta um UUID gerado pelo servidor |
| `Origin: http://localhost:3000` | `access-control-expose-headers: Retry-After, x-request-id` |
| `OPTIONS` (preflight) | `204` com o header |
| `Origin: https://evil.example` | `403 AUTH_FORBIDDEN_ORIGIN` com o header |

Liveness e readiness:

| Estado | Rota | Resultado |
|---|---|---|
| Firestore alcançável | `/health/ready` | `200 {"data":{"ready":true}}` em 0,7s |
| Firestore inalcançável | `/health/ready` | `503 {"error":{"code":"HEALTH_DEPENDENCY_UNAVAILABLE"}}` em 2,2s |
| Firestore inalcançável | `/health` | `200 {"message":"OK"}` em 7ms |

O log da API na falha trouxe `[request] readiness-failed reason=timeout`. O corpo da resposta não
nomeia dependência nem traz mensagem do driver, e o timeout de 2s fechou a requisição em vez de
pendurá-la.

O Firestore inalcançável foi simulado com `FIRESTORE_EMULATOR_HOST=127.0.0.1:9` na linha de comando.
Nenhum `.env` foi editado.

### O header chega ao handler

Esse é o elo que nenhum teste unitário alcança: `NextResponse.next({ request: { headers } })` precisa
mesmo repassar o header. Uma rota-sonda temporária em `app/(routes)/probe-request-id/` devolveu o que
`requestIdFrom(req)` enxergou. Com `x-request-id: FORJADO-PELO-CLIENTE` na entrada:

```
corpo:   {"seenByHandler":"8be6494c-cd7b-4d49-bd1e-e3074349a8db"}
header:  x-request-id: 8be6494c-cd7b-4d49-bd1e-e3074349a8db
```

Mesmo valor dos dois lados, e não o valor do cliente. A rota foi apagada; `git status` não mostra
resíduo dela.

Uma armadilha para quem for repetir o teste: a primeira tentativa usou a pasta `__probe` e deu 404.
Pasta iniciada por `_` é privada no App Router e não vira rota.

### Validação visual

Fluxo usado: `/forgot-password`, que chama a API pelo `apiClient` e recebe `EMAIL_NOT_CONFIGURED`
(`RESEND_TOKEN` vazio no `.env` da API). Screenshots em `develop/screenshots/`:

| Arquivo | O que mostra |
|---|---|
| `01-toast-light-ptbr.png` | Tema light, 1280×720, sufixo presente |
| `02-toast-dark-ptbr.png` | Tema dark, o toast acompanha o tema |
| `03-toast-mobile-light-ptbr.png` | 390×844, o UUID quebra em duas linhas sem estourar nem truncar |
| `04-toast-en.png` | Rótulo `Error code` |
| `05-toast-es.png` | Rótulo `Código del error` |
| `06-degradado-sem-request-id.png` | API fora do ar |

A mensagem com identificador saiu assim, com o UUID real da resposta:

```
O envio de e-mails não está configurado. Fale com o suporte. (Código do erro: a986c1bb-9c0b-4bdd-adab-a6746e0e6d2e)
```

Com a API derrubada, a mensagem foi exatamente `Um erro inesperado aconteceu`: sem parênteses vazios,
sem rótulo órfão, sem `null` nem `undefined`. É o caminho degradado, e é o padrão.

Uma checagem extra, rodada no console do browser em `localhost:3000` contra `localhost:3002`:

```
{"status":503,"headerLidoPeloBrowser":"ca49e35d-e595-4fca-9454-7eb3864ce6df","body":{"error":{"code":"EMAIL_NOT_CONFIGURED"}}}
```

O JavaScript da página conseguiu ler o header numa requisição cross-origin. Sem a entrada em
`Access-Control-Expose-Headers` esse valor viria `null`, então essa linha é a prova do item 3 dos
critérios de aceite.

### O que a validação não provou

- **Emulador do Firebase.** `firebase-tools` 15.30.1 exige Java 21 e a máquina tem a 17
  (`openjdk 17.0.13`, Zulu). O `emulators:start` aborta antes de subir qualquer emulador. Nenhum JDK
  foi instalado. Consequência: o `ready: true` foi medido contra o projeto Firebase real dos `.env`,
  com uma leitura de um documento que não existe (`health/readiness`). Nenhuma escrita.
- **Fluxo autenticado do painel.** Sem emulador de Auth, não houve login. O sufixo do identificador foi
  provado em `/forgot-password`; os `useXCrud` do painel passam pelo mesmo `handleClientError`, mas
  isso não foi exercido com o app de pé.
- **Correlação entre o toast e a linha `[request] failed` no terminal.** O caminho
  `EMAIL_NOT_CONFIGURED` é um retorno normal, não um `throw`, então não aciona `onRequestError`. O
  comportamento do gancho está coberto por `instrumentation.test.ts`, não por observação em runtime.
- **`apps/web`.** O `instrumentation.ts` novo typecheca e a suíte passa, mas o app não foi subido.

### Conta de QA

`qa-observability@example.com` foi usado nos formulários. Não existe conta com esse endereço: as
tentativas de login falharam por credencial inválida e o `/forgot-password` parou antes de qualquer
consulta, porque o envio de e-mail não está configurado. Nada a limpar.

### Nota sobre um aviso do dev overlay

Depois de trocar o tema pelo seletor, o overlay do Next passou a mostrar um aviso de hidratação
(`Recoverable Error`). Ele some num reload limpo e não aparece em páginas fora desse fluxo
(`/sign-up`, por exemplo). É o comportamento conhecido do `next-themes`, que decide a classe do tema no
cliente. Nada neste corte toca renderização.

## Lacunas de teste para o `/test`

1. **A imunidade a `Error` no `logEvent` não tem gate automático.** `packages/shared` tem `test` e não
   tem `typecheck`, então nada valida uma asserção de tipo naquele workspace. Um `pnpm --filter api
   typecheck` pega a violação se ela estiver num call site da API, mas não pega uma dentro do pacote.
   Dar um `tsconfig.json` e um script `typecheck` ao `packages/shared` fecha isso. A sonda que fiz
   passou com zero erro, mas o pacote não declara `@repo/typescript-config` nas dependências e resolvê-lo
   dependeu do hoisting da raiz, o que mexeria no lockfile. Ficou fora por isso.
2. **Nenhum teste cobre o repasse do header pelo proxy até o handler.** O unitário testa a resposta do
   proxy, não a requisição que chega à rota. A prova foi manual, com a sonda descrita acima.
3. **Os 5 call sites de rota que chamam `requestIdFrom(req)` não têm teste do campo `requestId`.** Os
   testes existentes dessas rotas verificam status e corpo, não a linha de log.
4. **`apps/app` e `apps/web` não têm teste do `onRequestError`.** O de `apps/api` cobre o
   comportamento, e os três compartilham o mesmo `reportRequestError`, mas nada garante que os arquivos
   dos dois apps continuem exportando o gancho.

## Achados fora do corte

Os cinco da §12 do plano continuam valendo e nenhum entrou em código. Um achado novo:

**`packages/shared` é o único pacote com testes e sem `typecheck`.** Os outros oito pacotes com
`package.json` próprio têm o script; `packages/shared` tem só `test`, e não tem `tsconfig.json`. Os
arquivos do pacote são typechecados de carona pelos apps que os importam, mas os testes dele não são
typechecados por ninguém. Correção fora do corte porque exige acrescentar
`@repo/typescript-config` às dependências e mexer no lockfile.
