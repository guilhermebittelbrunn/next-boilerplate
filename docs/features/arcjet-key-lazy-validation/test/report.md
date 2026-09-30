# Relatório do `/test`: `ARCJET_KEY` malformada deixa de derrubar a API

Rodada autônoma do `/cycle`, em 2026-09-30, no workspace `tripoli`, branch `run-full-task-cycle-v3` (não
protegida; o nome definitivo é decisão do `/review`). Não criei branch nem commitei.

Resultado: 10 critérios ✅, nenhum ❌, 1 🔒 (chave real da Arcjet). Nenhum defeito de produção no diff.
Um teste novo, `apps/api/__tests__/proxyArcjetKey.test.ts`, fecha a lacuna do proxy com o pacote real.

## Verificar no `/test`

| # | afirmação herdada | veredito | medição |
|---|---|---|---|
| 1 | O `next build` de `apps/web` e `apps/app` falha com `ARCJET_KEY=invalida` | **confirmado** | `apps/web`: exit 1 em "Collecting page data", `❌ Invalid environment variables` com `path: [ 'ARCJET_KEY' ]` e `message: 'Invalid string: must start with "ajkey_"'`, depois "Failed to collect configuration for /[locale]" e `/[locale]/contact`. `apps/app`: exit 1 na mesma etapa e com a mesma causa, em `/_not-found` (a análise viu `/`; a ordem das páginas varia e nenhum documento cita a rota). O valor `invalida` não aparece em nenhum dos dois logs. O texto do `PRE-PRODUCTION.md` §8 ("o build falha em 'Collecting page data' com `Invalid environment variables`") bate com o que medi |
| 2 | A API builda e responde com a chave malformada | **confirmado, com ressalva no repro** | `ARCJET_KEY=invalida next build` na `apps/api`: exit 0, 33 páginas, `middleware.js` gerado. Com `next start -p 3002`: `GET /health` → `200 {"message":"OK"}`; `POST /auth/sign-up` com `{}` → `400 {"error":{"code":"VALIDATION_FAILED"}}`, 25 vezes seguidas, todas `400`. O repro sugerido (`curl -i -X POST /auth/sign-in`) responde **500**, mas o erro não vem do import: a resposta traz `x-request-id` e os cabeçalhos de segurança que só o proxy aplica, e o log mostra `SyntaxError: Unexpected end of JSON input` (sem corpo) e `IdentityToolkitError` (com `{}`) dentro do handler. É o defeito já registrado em `specs/BACKLOG.md:671` (a rota não tem `try` nem valida o corpo). Para separar os dois, buildei a API com o `index.ts` de antes da mudança e a mesma chave: `GET /health`, `POST /auth/sign-up` e `POST /auth/sign-in` responderam `500 Internal Server Error` sem `x-request-id`, e o log mostrou `Error: Invalid environment variables` saindo de `.next/server/middleware.js` |
| 3 | O boot mostra o `console.error` sem o valor; com `""`, só o `console.warn` | **confirmado** | Quatro boots de `next start` com stdout e stderr separados. `invalida`: uma linha `[security] rate limiting is DISABLED (ARCJET_KEY is set but does not start with "ajkey_"). Public auth routes accept unlimited requests.`, e `grep -c invalida` nos dois logs deu 0. `""` e `"   "`: só a linha `(no ARCJET_KEY)`, nenhuma com `does not start`. `ajkey_fake_qa`: nenhuma linha `[security]`. No Node, `console.warn` e `console.error` escrevem os dois em stderr, então o processo não distingue o método; quem prova que é `console.error` é o espião do `corsOriginBoot.test.ts`. O texto que apareceu em runtime só existe no ramo `malformed` |
| 4 | Chave válida contra a Arcjet real | **🔒 não verificável** | Exige credencial real. Com uma chave de formato certo e falsa (`ajkey_fake_qa`), a Arcjet registrou `Client IP address is missing` e `Failed to build fingerprint` em `localhost` e deixou a requisição passar; nem uma chave real decidiria nesse ambiente |

## Cobertura

| comando | resultado |
|---|---|
| `pnpm --filter @repo/security test` | 3 arquivos, 45 testes, todos passam (`keys.test.ts` 15, `rateLimit.test.ts` 12, `csp.test.ts` 18) |
| `pnpm --filter api test` (antes do teste novo) | 78 arquivos, 1034 testes, todos passam |
| `NODE_ENV=test npx vitest run __tests__/proxyArcjetKey.test.ts` (em `apps/api`) | 2 testes, passam |
| `pnpm --filter api typecheck` | exit 0 |
| `pnpm exec biome check apps/api/__tests__/proxyArcjetKey.test.ts` | 1 arquivo, nenhum erro, nenhuma correção |
| `pnpm test` (raiz, com `JAVA_HOME=/opt/homebrew/opt/openjdk@21`), 1ª rodada | 14 de 14 tasks, 10 do cache, 28 s |
| `pnpm test` (raiz), depois do teste novo | 14 de 14 tasks, 12 do cache, 18 s. `api:test` 1036, `api:test:emulator` 170, `app:test` 756, `web:test` 82, `@repo/security` 45, `@repo/auth` 112, `@repo/email` 202, `@repo/internationalization` 59, `@repo/shared` 44, `@repo/design-system` 45, `@repo/analytics` 34, `@repo/next-config` 32, `@repo/payments` 22, `e2e:test` 16. Total 2655, nenhuma falha |

Rodei sem `--force`: o diff não mexe em configuração do turbo nem em entrada que o cache pudesse esconder.
Não remedi `pnpm check` nem o typecheck de `app`/`web`: o `/review` mediu os dois (806 arquivos sem erro;
4 de 4 typechecks) e eu só acrescentei um arquivo de teste, que conferi com o Biome e com o typecheck da
`api`. A paridade de i18n não se aplica, porque o diff não toca `@repo/internationalization`; o workspace
passou do mesmo jeito dentro do `pnpm test`.

### Mutações

Apliquei e reverti cada uma. Depois de cada reversão, `cmp` contra a cópia de segurança confirmou o arquivo
idêntico ao do diff.

| mutação | efeito |
|---|---|
| `const eagerArcjetKey = keys().ARCJET_KEY;` de volta no topo de `packages/security/index.ts` | `rateLimit.test.ts`: 2 falhas em 12, os dois casos de `describe("rate limit with a malformed key")` |
| `packages/security/index.ts` inteiro trocado pela versão do `HEAD` | `proxyArcjetKey.test.ts`: 1 falha em 2, o caso de chave malformada, com `Error: Invalid environment variables`. O caso da chave válida continua passando |
| ramo `malformed` removido de `apps/api/instrumentation.ts` | `corsOriginBoot.test.ts`: 1 falha em 8, o caso "reports a key that is not an Arcjet key as an error, without echoing it" |

### Probe de import (§9.3 do plano), repetido depois da mudança

`jiti` com `NODE_ENV=production`, sem app de pé:

| `ARCJET_KEY` | `apps/app/env.ts` | `apps/web/env.ts` | `keys()` | import de `packages/security/index.ts` |
|---|---|---|---|---|
| `invalida` | lança | lança | lança | não lança |
| `""` | `undefined` | `undefined` | `undefined` | não lança |
| `"   "` | `undefined` | `undefined` | `undefined` | não lança |
| `ajkey_ok` | `"ajkey_ok"` | `undefined` | `"ajkey_ok"` | não lança |

A última linha reproduz o achado da análise: na `web`, `env.ARCJET_KEY` sai `undefined` mesmo com chave de
formato certo, e o bloqueio de bot da landing nunca roda.

## Critérios de aceite, item a item

| critério | status | meio |
|---|---|---|
| Chave malformada não derruba a API | ✅ | unidade (`rateLimit.test.ts`), rota com o pacote real (`proxyArcjetKey.test.ts`) e HTTP contra o build de produção, antes e depois |
| Chave malformada aparece no boot da API como erro | ✅ | unidade com espião de `console.error` (`corsOriginBoot.test.ts`) e log do `next start` |
| Chave ausente mantém o aviso de hoje | ✅ | unidade (`""`, `"   "`, variável ausente) e log do `next start` com `""` e `"   "` |
| Chave com o formato certo continua limitando | ✅ | unidade (`rateLimit.test.ts`) e rota (`proxyArcjetKey.test.ts`: `429 AUTH_RATE_LIMITED` com `Retry-After: 43`), com a Arcjet mockada; boot sem linha `[security]` medido com `ajkey_fake_qa` |
| Chave com espaços em volta é aceita aparada | ✅ | unidade (`keys.test.ts`, `rateLimit.test.ts`) |
| `secure()` degrada do mesmo jeito | ✅ | unidade (`rateLimit.test.ts`) |
| `app` e `web` continuam recusando o build | ✅ | `next build` das duas, exit 1; probe de import |
| A leitura é por chamada | ✅ | unidade (`rateLimit.test.ts`) |
| Os testes provam a correção | ✅ | as três mutações acima |
| Documentos dizem o que o código faz | ✅ | leitura contra as medições; âncoras conferidas com `awk` (`keys.ts:23`, `:26`, `:35`, `:41`; `instrumentation.ts:30`, `:45`; `index.ts:37`, `:47`, `:80`; `apps/api/proxy.ts:70`, `:147`; `apps/web/env.ts:33`; `apps/web/proxy.ts:63`, `:68`; `apps/app/proxy.ts:138`), todas batem |
| Chave válida contra a Arcjet real | 🔒 | exige credencial real e IP de cliente; roteiro manual em `criterios-aceite.md` |

## Decisões de custo de teste

- `packages/security`: os testes de unidade do `/develop` já cobrem classificador, leitor, degradação e
  leitura por chamada. Não criei nada ali.
- `apps/api/instrumentation.ts`: o `corsOriginBoot.test.ts` cobre os três estados da chave com espião. Não
  criei nada.
- `apps/api/proxy.ts` com o `@repo/security` real: criei `proxyArcjetKey.test.ts`, na faixa barata. Ele
  importa o proxy de verdade com o pacote de verdade, substitui só `@/env` e `@arcjet/next`, e roda em
  cerca de 130 ms, sem processo externo. O caso da chave válida existe para provar que o pacote não está
  mockado: se estivesse, o `429` não sairia.
- Nenhum teste da faixa cara. A falha acontece na validação de uma string, antes de rede, Firestore ou
  emulador.

## Lacunas herdadas

| lacuna | veredito |
|---|---|
| Nenhum teste percorre `apps/api/proxy.ts` com o `@repo/security` real e a chave malformada | **fechada aqui** por `apps/api/__tests__/proxyArcjetKey.test.ts`. A mutação com o `index.ts` antigo derruba o caso |
| Nenhum teste automatizado prende o build de `app`/`web` falhando com chave errada | **fora de escopo**, como o `/review` já tinha concluído. O build não roda no CI, e o `keys.test.ts` protege a causa (o schema estrito). Medi o build à mão nesta etapa |
| Chave válida contra a Arcjet real | **continua aberta**, 🔒, pelo motivo do item 4 acima |

## Achados fora do diff

- `POST /auth/sign-in` responde 500 sem corpo (`SyntaxError`) e com credencial recusada pelo Identity
  Toolkit (`IdentityToolkitError`). Já está em `specs/BACKLOG.md:671`; a medição acrescenta os dois casos
  concretos. Não tem relação com esta tarefa, mas torna o repro do item 2 do `review.md` enganoso: quem rodar
  o `curl` ao pé da letra vê 500 e pode concluir que a correção falhou. O repro que separa os dois é
  `GET /health` ou `POST /auth/sign-up` com `{}`.
- O `next build` avisa que inferiu a raiz do workspace a partir de um `pnpm-lock.yaml` no diretório home,
  fora do repositório. É da máquina, não do código, e não afetou os resultados.

## Validação no navegador

Não abri o `agent-browser`. O diff toca só `packages/security`, `apps/api`, testes e documentação, e não
muda nenhuma tela: os chamadores de `secure()` em `apps/app` e `apps/web` não mudaram e continuam atrás do
guard `env.ARCJET_KEY`. Tema, responsivo e idiomas não se aplicam.

## Ambiente do e2e

- Portas 3000, 3001, 3002, 3003, 4001, 8080, 9099 e 9199 estavam livres antes de começar. Não havia
  ambiente do usuário para reutilizar.
- Subi e derrubei, um de cada vez, seis processos `next start -p 3002` da `apps/api` (um com o código novo
  para os `curl`, quatro com o código novo e chaves diferentes para o boot, um com o `index.ts` antigo), cada
  um morto pelo PID que guardei. No fim, `lsof -ti tcp:<porta>` saiu vazio em todas as portas acima.
- Os emuladores de Firestore e Storage subiram e desceram sozinhos dentro do `api:test:emulator`.
- Credenciais: os builds e boots da API usaram valores falsos passados por variável de ambiente
  (`FIREBASE_ADMIN_PROJECT_ID=demo-arcjet-qa`, e-mail de conta de serviço inventado, chave de API do
  Firebase inventada e uma chave PEM descartável gerada com `openssl` em `/tmp`), por cima do `.env` local.
  Nenhuma requisição chegou ao projeto Firebase de dev. A PEM e o script com as variáveis foram apagados.
- Os `.next` gerados em `apps/web`, `apps/app` e `apps/api` não existiam antes e foram apagados, assim como o
  `apps/api/firestore-debug.log` que o `api:test:emulator` escreveu e os logs e cópias de segurança em
  `/tmp/arcjet-qa-*`.
- Ficaram em `/tmp` três logs da etapa de análise (`arcjet-api-build.log`, `arcjet-app-build.log`,
  `arcjet-web-build.log`, das 16:44 às 16:48). Não são desta etapa e não mexi neles.

## Estado de dev alterado

Nenhum. Não criei conta, não escrevi no Firestore de dev e não gerei dado de QA.

## Estado do gate

O `STATE.md` mostra `review` como `in-progress`. Não há commit da feature (`git log origin/main..HEAD` sai
vazio), o que é o esperado numa rodada do `/cycle`, que não commita: o `/review` fecha quando os commits
forem aprovados. Registro aqui para não parecer que o gate foi pulado.
