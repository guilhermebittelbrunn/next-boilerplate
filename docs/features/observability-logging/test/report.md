# Relatório de QA — observabilidade, request id e readiness

Rodada autônoma do `/cycle`, sem ninguém acompanhando. Branch `feat/observability-logging`, working tree
com 53 arquivos e nada commitado.

Placar: **16 critérios aprovados, 0 reprovados, 4 não verificados.** Os 4 exigem infra que esta máquina
não provisiona; nenhum deles é defeito da entrega.

Nenhum defeito de produção encontrado.

## Gates

Todos rodados com `--force`, sem cache.

| comando | resultado |
|---|---|
| `pnpm check` | **532 arquivos**, 0 correções |
| `pnpm turbo run lint typecheck test --force` | **23 de 23 tasks**, 0 em cache, **29,7 s** |
| `pnpm test` (raiz, o que gateia o `turbo build`) | 9 de 9 tasks |
| `pnpm --filter api test` | 35 arquivos, **371 testes** (eram 367) |
| `pnpm --filter app test` | **38 arquivos**, **274 testes** (eram 36 e 265) |
| `pnpm --filter web test` | **5 arquivos**, **31 testes** (eram 4 e 27) |
| `pnpm --filter @repo/shared test` | **4 arquivos**, **40 testes** (eram 3 e 34) |
| `pnpm --filter @repo/internationalization test` | 3 arquivos, 27 testes, `parity.test.ts` incluído |
| `pnpm --filter api build` | sucesso; `/health` e `/health/ready` listados como `ƒ (Dynamic)` |

Nenhuma falha, nenhum `skip`, nenhum `todo`. Os 23 testes novos são o delta.

Checei dois gates por mutação, porque teste que nunca reprova não é gate:

- Comentar `forwardedHeaders.set(REQUEST_ID_HEADER, requestId)` no `proxy.ts` reprova 2 dos testes novos
  de `requestId.test.ts`. Restaurei o arquivo e conferi com `diff` contra a cópia.
- Remover a chave `HEALTH_DEPENDENCY_UNAVAILABLE` do espanhol reprova as 2 asserções de
  `parity.test.ts`. Restaurei o arquivo e conferi com `diff`.

## Critérios de aceite, item a item

Checklist completo em [`criterios-aceite.md`](criterios-aceite.md).

| # | critério | status | meio |
|---|---|---|---|
| 1 | Toda resposta da API carrega `x-request-id` | ✅ | prod (`curl`) + rota unitária |
| 2 | O identificador enviado pelo cliente é ignorado | ✅ | prod + unitário do proxy |
| 3 | O browser lê o identificador cross-origin | ✅ | e2e (`headers.get` na página) |
| 4 | A mensagem do painel mostra o identificador | ✅ | e2e nos 3 idiomas + hook novo |
| 5 | Sem identificador, a mensagem sai como antes | ✅ | e2e (texto lido do DOM) + unitário |
| 6 | `throw` nos 3 apps produz linha estruturada | ✅ | runtime nos 3 + unitário em cada um |
| 7 | O log deliberado não carrega erro nem PII | ✅ | unitário + runtime em prod |
| 8 | Os 11 pontos de `console` passam pelo helper | ✅ | auditoria por `grep` |
| 9 | `/health` responde e não é pré-renderizado | ✅ | build de produção + prod com banco fora |
| 10 | `/health/ready` distingue processo de dependência | ✅ | prod nos dois estados + rota unitária |
| 11 | A prontidão não pendura a requisição | ✅ | prod (2,01 s) + unitário com timer falso |
| 12 | Nenhuma variável de ambiente nova | ✅ | diff dos `.env.example` + 3 apps de pé |
| 13 | Paridade de i18n nas chaves novas | ✅ | `parity.test.ts` + mutação |
| 14 | Tema e responsivo | ✅ | e2e light/dark/mobile + medida do retângulo |
| 15 | O identificador do toast acha a linha do servidor | ✅ | prod, `[request] failed` e `[security] blocked` |
| 16 | A query string não entra no log | ✅ | prod (`?search=alguem@example.com`) |
| 17 | `ready:true` contra o emulador do Firestore | 🔒 | emulador não sobe: Java 17, exige 21 |
| 18 | Alguém é avisado quando um erro acontece | 🔒 | nenhum coletor plugado (decisão D1) |
| 19 | O health check da plataforma consulta `/health/ready` | 🔒 | console de provedor |
| 20 | A retenção de log cobre um post-mortem | 🔒 | console de provedor |

Os quatro 🔒 estão em `docs/PRE-PRODUCTION.md`, seção 10, com os quatro passos que faltam. Conferi a lista
contra a §11 do plano: não falta nenhum.

### Onde a verificação ficou mais rasa que o critério

Três aprovações merecem a ressalva, porque o critério pede mais do que foi medido:

- **Critério 10.** Medi o `ready:true` contra o projeto Firebase real dos `.env`, com leitura de um documento que não
  existe e nenhuma escrita. O que o emulador provaria a mais está no 🔒 nº 17.
- **Critério 12.** O que verifiquei foi que nenhum `.env.example` aparece no diff e que os três apps
  sobem com o `.env` de hoje. Não fiz um clone limpo do repositório.
- **Critério 6.** Em `apps/api` observei a linha em build de produção; em `apps/app` e `apps/web`, em `next dev`. O que está em jogo ali é o Next carregar o `instrumentation.ts` e chamar o export, que não
  muda entre os dois modos, mas a medida é de dev.

## Testes criados

23 testes novos, todos na faixa barata: rodam em milissegundos, sem processo externo. Não criei nenhum teste da faixa
cara: nada nesta entrega tem a infra como objeto do teste. As consultas do Firestore
não mudaram, as `firestore.rules` não mudaram, o `BaseRepository` não mudou, e a sonda de prontidão é uma
leitura que o mock cobre igual.

| arquivo | nível | quantos | que lacuna fecha |
|---|---|---|---|
| `apps/api/__tests__/requestId.test.ts` (estendido) | unit, proxy direto | 2 | O repasse do header do proxy até o handler não tinha gate. `NextResponse.next({ request: { headers } })` codifica o override em `x-middleware-override-headers` + `x-middleware-request-x-request-id`, e é isso que as asserções leem |
| `apps/api/__tests__/paymentsWebhookRoute.test.ts` (estendido) | unit, rota com `vi.mock` | 2 | Nenhum dos 5 call sites que chamam `requestIdFrom(req)` tinha teste do campo `requestId` na linha de log. Cobre o campo presente e o campo ausente |
| `packages/shared/__tests__/requestIdHelpers.test.ts` | unit | 6 | `requestIdFrom`, `generateRequestId` e o nome do header não tinham teste próprio. O nome é o contrato entre quem escreve (API) e quem lê (`FormattedError`) |
| `apps/app/__tests__/instrumentationRequestError.test.ts` | unit | 5 | `apps/app` não tinha teste do `onRequestError`. Nada garantia que o arquivo continuasse exportando o gancho |
| `apps/web/__tests__/instrumentationRequestError.test.ts` | unit | 4 | Mesma lacuna em `apps/web` |
| `apps/app/__tests__/panelErrorRequestId.test.tsx` | unit, hook com `QueryClientProvider` | 4 | O sufixo do identificador não tinha sido exercido num fluxo autenticado. Usa `FormattedError` e `handleClientError` reais (o teste vizinho os mocka), com `pt-br` e `es`, e cobre os dois caminhos degradados |

### Por que não criei teste onde não criei

- **Rotas de `apps/api` já cobertas.** `health.test.ts`, `healthReady.test.ts`, `corsOrigin.test.ts` e
  `instrumentation.test.ts` já exercitam status, corpo, `error.code`, timeout e a linha de log. O contrato
  de infra não mudou, então acrescentar cenário ali seria custo sem cobertura.
- **Os outros 4 call sites de `requestIdFrom`.** São a mesma linha única (`requestId: requestIdFrom(req)`)
  em rotas com mocks pesados. O comportamento está coberto pelo helper e por um call site real.
- **Emulador do Firestore.** A entrega não mexe em consulta composta, índice, regra de segurança nem no
  contrato do `BaseRepository`. Subir emulador aqui seria caro e não provaria nada que o mock não prova.

## Evidências de e2e

Screenshots em [`e2e/`](e2e/), com a API em **build de produção** na 3002 (`next build` + `next start`) e
`apps/app` em `next dev` na 3000.

| arquivo | o que mostra | tema / viewport |
|---|---|---|
| `01-toast-request-id-light-ptbr.png` | Sufixo `(Código do erro: fe590375-…)` no toast | light, 1280×800 |
| `02-toast-request-id-dark-ptbr.png` | O mesmo toast acompanhando o tema | dark, 1280×577 |
| `03-toast-request-id-mobile-dark-ptbr.png` | UUID quebrando em linhas sem estourar | dark, 390×844 |
| `04-toast-request-id-light-en.png` | Rótulo `Error code` | light, 1280×800 |
| `05-toast-request-id-light-es.png` | Rótulo `Código del error` | light, 1280×800 |
| `06-degradado-api-fora-do-ar.png` | `Um erro inesperado aconteceu`, sem sufixo | light, 1280×800 |

O que foi lido do DOM, não só olhado na captura:

- O valor no toast (`9fa878c6-9bb8-43b2-b33e-f3396a0fd980`) é byte a byte o que o JavaScript da página em
  `localhost:3000` leu de `response.headers.get("x-request-id")` de `localhost:3002`. Sem
  `Access-Control-Expose-Headers` esse `get` devolveria `null`, então a mesma medida cobre os critérios 3
  e 4.
- No modo degradado o texto tem **28 bytes** e é exatamente `Um erro inesperado aconteceu`: sem
  parênteses, sem `null`, sem `undefined`, sem rótulo órfão.
- No mobile, o retângulo do toast é `x=20 w=351` num viewport de `390`, `scrollWidth === clientWidth` e o
  texto contém o UUID inteiro. Sem estouro e sem truncagem.

Uma folha de estilo temporária desligou a animação de entrada e saída do toast, porque o tempo de vida
dele é menor que o intervalo entre dois comandos do `agent-browser`. Ela vive só na página, não toca
arquivo, e some quando o browser fecha. É por isso que a captura mobile mostra dois toasts empilhados.

### Medições em build de produção

Tudo abaixo com `next build` + `next start`, não `next dev`.

| caminho | resultado |
|---|---|
| `GET /health` | `200`, `x-request-id` presente; duas chamadas seguidas trazem UUIDs diferentes |
| `x-request-id: FORJADO-PELO-CLIENTE` na entrada | volta `6107f194-…`, gerado pelo servidor |
| `Origin: http://localhost:3000` | `access-control-expose-headers: Retry-After, x-request-id` |
| `OPTIONS` (preflight) | `204`, mesmos cabeçalhos |
| `Origin: https://evil.example` | `403 AUTH_FORBIDDEN_ORIGIN`, sem `Access-Control-Allow-Origin`, com `x-request-id` |
| sem `Origin` (servidor a servidor) | `200`, inalterado |
| `/health/ready`, Firestore alcançável | `200 {"data":{"ready":true}}` em 1,30 s |
| `/health/ready`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:9` | `503 {"error":{"code":"HEALTH_DEPENDENCY_UNAVAILABLE"}}` em 2,01 s |
| `/health`, mesmo estado | `200 {"message":"OK"}` em 0,20 s |
| corpo do `503` | não casa `firestore`, `firebase`, `google`, `127.0.0.1`, `stack` nem `at ` |
| log da falha | `[request] readiness-failed reason=timeout`, sem mensagem do driver |

### O laço de correlação

Uma rota temporária que faz `throw`, chamada em build de produção:

```
cliente:  x-request-id: 6803a8c2-5ebd-45de-8192-0d39cd04b534
servidor: [request] failed method=GET path=/qa-throw routeType=route requestId=6803a8c2-5ebd-45de-8192-0d39cd04b534
```

O mesmo laço fecha pela recusa de origem, que não precisa de rota temporária nenhuma:

```
cliente:  x-request-id: 1dfcd35b-790e-4128-9d19-fc5b80f2eade
servidor: [security] blocked reason=origin path=/entities method=GET requestId=1dfcd35b-790e-4128-9d19-fc5b80f2eade
```

Chamando a mesma rota com `?search=alguem@example.com&token=segredo123`, a linha gravada foi
`[request] failed method=GET path=/qa-throw routeType=route requestId=…`. Nenhuma linha `[request] failed`
do log contém `@` nem `segredo123`.

### `onRequestError` nos três apps

| app | modo | linha observada |
|---|---|---|
| `apps/api` | build de produção | `[request] failed method=GET path=/qa-throw routeType=route requestId=…` |
| `apps/app` | `next dev` | `[request] failed method=GET path=/pt-br/forgot-password/qa-throw routeType=route` |
| `apps/web` | `next dev` | `[request] failed method=GET path=/pt-br/qa-throw routeType=route` |

Em `apps/app` e `apps/web` não há `requestId`: só a API carimba o header, e é isso que o desenho pede.

Chegar à rota do `apps/app` exigiu colocá-la sob um prefixo de `PUBLIC_PATHS`
(`/forgot-password/qa-throw`): o proxy é default-deny e manda qualquer outro caminho para `/sign-in`.
Quem for repetir o teste perde tempo com isso se não souber.

## Ambiente do e2e

As sete portas (3000, 3001, 3002, 3003, 9099, 8080, 4001) estavam **livres** antes de eu começar, então
subi tudo e derrubei tudo. Nada foi reutilizado do usuário.

| serviço | porta | como subiu | estado no fim |
|---|---|---|---|
| `apps/api` | 3002 | `next build` + `next start`, `CORS_ORIGIN` e `PORT` na linha de comando | derrubado |
| `apps/app` | 3000 | `pnpm --filter app dev` | derrubado |
| `apps/web` | 3001 | `pnpm --filter web dev` | derrubado |
| browser do `agent-browser` | — | `agent-browser open` | `agent-browser close --all` |

Conferi no fim: `lsof -ti tcp:<porta> -sTCP:LISTEN` devolve vazio nas sete. Não usei `pkill`.

Dois tropeços que valem para a próxima rodada:

- `lsof -ti tcp:3002` **sem** `-sTCP:LISTEN` lista também quem está conectado à porta. Matei um processo
  auxiliar do Chrome por causa disso; o browser se recuperou sozinho, mas podia ter sido o editor.
- `pnpm start` na `apps/api` ignora `-p 3002` e sobe na 3000. A porta vai por `PORT=3002`, e sem
  `CORS_ORIGIN` o boot aborta de propósito.

## Higiene

- **Criei e apaguei três rotas-sonda**: `apps/api/app/(routes)/qa-throw/`,
  `apps/app/app/[locale]/(unauthenticated)/forgot-password/qa-throw/` e
  `apps/web/app/[locale]/qa-throw/`. `git status` não mostra nenhuma delas.
- **Reconstruí a `apps/api` depois** de apagar a sonda. Sem isso o `.next` de produção continuaria
  servindo `/qa-throw` para quem rodasse `pnpm --filter api start`. A listagem de rotas do build novo não
  tem a sonda.
- Sobra a saída de build antiga da sonda da revisão em
  `apps/api/.next/dev/server/app/(routes)/probe-request-id/`, dentro do `.next`, que é ignorado pelo git e
  regenerado no próximo `dev`. O arquivo-fonte não existe.
- **Nenhuma conta ou dado de QA a limpar.** Digitei `qa-observability@example.com` nos formulários de
  `/forgot-password`, que param em `EMAIL_NOT_CONFIGURED` antes de qualquer consulta. Nenhum login,
  nenhuma escrita no Firestore, nenhuma credencial em arquivo.
- Auditoria de `console.*`: em `apps/api` sobram `instrumentation.ts:27` (aviso de boot) e
  `app/global-error.tsx:15` (componente React), as duas exceções declaradas no critério. Em
  `packages/shared` restam os dois do próprio helper (`log.ts:55`, `requestErrorReporter.ts:52`).

## Lacunas que ficaram

1. **`packages/shared` não tem `typecheck`.** É o único pacote com `test` e sem ele, e não tem
   `tsconfig.json`. A imunidade a `Error` na assinatura do `logEvent` é cobrada em todo call site de
   `apps/api`, `apps/app` e `apps/web`, que typecheckam; o buraco são os arquivos de `__tests__/` do
   próprio pacote. Corrigir mexe no `pnpm-lock.yaml` e é tarefa própria — não toquei.
2. **O laço de correlação não tem gate automático.** Ele depende de o Next repassar o header codificado no
   `x-middleware-override-headers`, e o teste novo cobre o lado do proxy. Que o runtime honra a instrução
   continua sendo prova manual, repetida acima em build de produção.
3. **O caminho de rate limit do proxy nunca foi exercido em runtime**, porque sem `ARCJET_KEY` o limitador
   fica desligado. O `429` com `x-request-id` sai de teste unitário com o `checkRateLimit` mockado.
4. **`ready:true` nunca foi medido contra o emulador** (🔒 nº 17). Uma tarefa que resolva o Java 21 fecha
   essa lacuna e destrava o fluxo autenticado de ponta a ponta nas próximas rodadas.

## Achado pré-existente, fora do escopo

O badge `1 Issue` do overlay do Next aparece em `/en/forgot-password` e `/es/forgot-password`, e não em
`/pt-br/forgot-password`. É o erro de hidratação que a revisão localizou em
`apps/app/app/[locale]/(unauthenticated)/components/AuthCard.tsx:14` e confirmou na baseline com
`git stash`. Não repeti a confirmação na baseline; aceito o veredito da revisão. Nada neste corte toca renderização.
