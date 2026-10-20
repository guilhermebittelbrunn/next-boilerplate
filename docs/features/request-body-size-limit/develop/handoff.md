# Handoff do develop: teto de bytes no corpo JSON da API

- **Plano:** `analyze/plan.md`
- **Data:** 2026-10-19 22:38
- **Ambiente das medições:** Node 22.13.0, Vitest 4.0.3, Next 16.0.0, workspace `amman`.

## Blueprint → arquivos

| item do plano | arquivo | situação |
|---------------|---------|----------|
| §10.1 helper com teto em duas camadas | `apps/api/(shared)/lib/parse-request-json.ts` | alterado, com dois desvios (abaixo) |
| §7.1 testes do helper | `apps/api/__tests__/parseRequestJson.test.ts` | novo, 13 casos |
| §7.2 caso de rota pública | `apps/api/__tests__/contactRoute.test.ts` | um caso novo no `describe("POST /contact validation")` |
| §10.5 a) subseção "Tamanho do corpo" | `docs/SECURITY.md:172-179` | nova, entre "Limite de requisições" e "Pagamentos (Stripe)" |
| §10.5 b) conta da `:160` | `docs/SECURITY.md:160` | "Dez das treze", com as três rotas que faltavam |

Nenhum arquivo de rota mudou. Os arquivos das outras duas tarefas da PR não foram tocados. No `docs/SECURITY.md` a `:12` é da tarefa `password-unlink-email-restore`, e o meu diff fica na `:160` e na `:172-179`.

## Contrato

O SDK não mudou. A forma do erro continua `{ error: { code } }`, e o status 413 é a única novidade. O helper passou a exportar `REQUEST_JSON_MAX_BYTES` (102 400), que hoje só os dois arquivos de teste importam. O tipo de retorno é o mesmo, então os 22 chamadores (`grep -rn "parseRequestJson(" apps/api/app | wc -l` → 22) seguem com `if (!parsedBody.ok) return parsedBody.response` sem edição.

## Códigos de erro

Nenhum código novo. O 413 reaproveita `VALIDATION_FAILED`, que já está em `apiErrors` nos três idiomas. Nenhuma chave de i18n foi tocada.

## ⚠️ Desvios do plano

### 1. Sem stream, o helper chama `req.json()` em vez de responder 400 direto

O plano manda `if (!req.body) return refuse(400)`. Apliquei o pseudo-código do plano ao pé da letra e rodei a suíte da api: **95 testes falharam em 13 arquivos** (`NODE_ENV=test npx vitest run` → `Tests 95 failed | 1258 passed (1353)`, `Test Files 13 failed | 92 passed (105)`). A causa são os dublês de `Request` desses testes, objetos com `headers` e `json()` e sem `body` (ex.: `accountRoute.test.ts:85-97`). Um dos 13 é o `accountSignInMethodsRoute.test.ts`, que é da outra tarefa e não pode ser editado. O critério de aceite "Nenhum chamador quebra" e a §7.4 do plano diziam o contrário: o plano conferiu que nenhum teste mocka o módulo, mas não viu os dublês do `Request`.

A correção: sem stream para medir, o helper delega ao `req.json()`. Com um `Request` de verdade e corpo ausente, `req.body` é `null` e `req.json()` rejeita com `SyntaxError: Unexpected end of JSON input` (sonda em Node 22.13), e o `catch` devolve o mesmo `400 VALIDATION_FAILED`. O caso "answers 400 when there is no body" do teste novo cobre isso. Os 13 arquivos voltaram a passar sem edição.

Consequência para o revisor: um dublê sem `body` nunca passa pelo teto. Isso não muda nada em produção, porque o Next sempre entrega um `Request` com `body` stream ou `null`, mas quem quiser testar o teto numa rota precisa de um `Request` real, como o `contactRoute.test.ts` já faz.

### 2. O `reader.cancel()` não é aguardado

O plano faz `await reader.cancel()` dentro do `try`. Quando o `cancel` da fonte do stream lança, o `reader.cancel()` rejeita (sonda: fonte com `cancel() { throw new Error("boom") }` → `cancel rejects with throwing source: boom`), cai no `catch` e o 413 vira 400. Agora o helper chama `reader.cancel().catch(() => null)` sem aguardar e devolve 413. Medido: com o `await` do plano, o caso "still answers 413 when cancelling the stream throws" falha (`Tests 1 failed | 12 passed (13)`); com a correção, passa.

### Pequenos ajustes de forma

- `100 * BYTES_PER_KIB` virou `REQUEST_JSON_MAX_KIB * BYTES_PER_KIB`, porque o Biome recusa o número solto (`lint/style/noMagicNumbers`).
- O comentário JSDoc de `readCapped` saiu, porque o nome basta. Ficaram dois comentários de uma ou duas linhas que explicam o porquê: o `cancel()` não aguardado e o `req.json()` quando não há stream.
- O caso da rota de contato usa `"a".repeat(REQUEST_JSON_MAX_BYTES)` no lugar de 120 000, para não depender de um número solto e para acompanhar a constante se ela mudar.

## Conferência das premissas do plano

Uma sonda (`node /tmp/probe-body.mjs`, Node 22.13, fora do repo) mediu:

| premissa | resultado |
|----------|-----------|
| `new Request(url, { body: "..." })` não tem `content-length` | `null` |
| `bodyUsed` depois de `getReader()` sem `read()` | `false`; vira `true` só depois do primeiro `read()` |
| corpo já lido: `getReader()` lança | `TypeError`, cai no `catch` → 400 |
| `content-length` explícito no `Request` é mantido mesmo sem bater com o corpo | sim (`102401` com corpo `{}`) |
| BOM: `req.json()` e `TextDecoder` dão o mesmo valor | os dois dão `{"a":1}` |
| UTF-8 inválido: mesmo resultado | os dois trocam o byte por `�` |
| multibyte partido entre pedaços, concatenado antes de decodificar | `é` inteiro |
| stream que falha no meio | `read()` rejeita → `catch` → 400 |

Nenhuma rota consome o corpo antes ou depois do helper. O único acesso ao `req.body` fora dele é o `payments/portal/route.ts:23`, que só testa se o corpo existe, e ler a propriedade não consome o stream. Instrumento: `grep -rnE "(req|request)\.(json|text|formData|arrayBuffer|clone|body)\b" apps/api/app "apps/api/(shared)" apps/api/proxy.ts` → portal `:23`, webhook `:269`, o próprio helper e `file.schema.ts:113`.

O `docs/SECURITY.md` foi conferido de novo antes de escrever: `find "apps/api/app/(routes)/account" -name route.ts | wc -l` → 13, e `apps/api/proxy.ts:53-67` lista três delas (`/account/export`, `/account/deletion`, `/account/email`). O default `proxyClientMaxBodySize: 10485760` está em `next/dist/server/config-shared.js:208` e é lido em `lib/router-utils/resolve-routes.js:117`.

## Validação

| comando | resultado |
|---------|-----------|
| `pnpm --filter api test` (antes da mudança) | 105 arquivos, 1353 testes, todos verdes |
| `pnpm --filter api test` (depois) | 106 arquivos, 1367 testes, todos verdes (+13 do arquivo novo, +1 do contato). Inclui `authSignInGoogleRoute.test.ts`, `authSignInGoogleToolkit.test.ts` e `accountSignInMethodsRoute.test.ts` |
| `pnpm --filter api typecheck` | exit 0 |
| `pnpm check` | exit 0, `Checked 937 files`, sem correções |
| paridade de i18n | não rodada: nenhum arquivo de `packages/internationalization` mudou |

### Os testes pegam o defeito

Rodei os dois arquivos contra o helper de `HEAD` (`git show HEAD:"apps/api/(shared)/lib/parse-request-json.ts" > …`): **6 falham e 29 passam** (`Tests 6 failed | 29 passed (35)`). Falham os três casos de corpo acima do teto (sem header, com header declarado e com header que mente), os dois de stream (cancelamento e `cancel` que lança) e o caso novo da rota de contato. Os casos de comportamento preservado (400, BOM, multibyte, `content-length` não numérico, corpo exatamente no teto) passam nas duas versões, que é o esperado. Depois restaurei o arquivo e conferi o `shasum`: `634ddd5b2b4c8eaf85e8bd760b779b6f428f8e2e` antes e depois da troca; o de `HEAD` é `7c8dce7f5580586fe9ba7f97471e4619e3064889`.

## A verificar no `/test`

- **Teto com o servidor do Next de verdade.** Os testes usam `Request` montado à mão. Falta medir o caminho do `next start`, em que o corpo passa pelo `getCloneableBody` do proxy antes de chegar ao handler. Repro: `pnpm --filter api build && pnpm --filter api start`, depois `curl -i -X POST localhost:3002/auth/sign-in -H 'content-type: application/json' --data-binary @corpo-120k.json` (esperado 413 `VALIDATION_FAILED`), o mesmo com `-H 'transfer-encoding: chunked'`, e um corpo de 50 KB para conferir que segue até o Zod (400 pelo schema, não 413).
- **`cancel()` com o stream do Next.** A sonda só cobriu streams criados à mão. Não medi se o cancelamento do stream que o Next monta a partir do `IncomingMessage` encerra a leitura do socket ou se o resto do corpo continua chegando ao processo.
- **Vercel acima de 4,5 MB e truncamento em 10 MiB no `next start`.** São da plataforma e não mudam com este diff. Sem infra, ficam como 🔒.

## Lacunas de teste conhecidas

- Nenhum teste de rota exercita o teto com `content-length` declarado. O caso de contato usa corpo string, sem header, então passa pela camada 2. A camada 1 só é coberta no teste do helper.
- Os 13 arquivos de teste com dublês sem `body` não exercitam o teto (desvio 1). Fora de escopo aqui. Se o `/review` quiser, é um achado para migrar esses dublês para `Request` real.

## Achados fora do escopo

- `apps/api/CLAUDE.md`, seção "Helpers HTTP compartilhados", descreve o `parseRequestJson` como "body JSON com resposta 400 padronizada em falha de parse". Continua verdade, mas não fala do 413. Não editei porque o arquivo está fora do escopo pedido; é uma linha para o `/review` decidir.
- O plano já registra o `email` sem `.max()` em `user-admin.schema.ts:8`. Não mexi.

## Observação para o plano de commits

O `docs/SECURITY.md` tem hunks de duas tarefas: a `:12` é de `password-unlink-email-restore`, e a `:160` e a `:172-179` são desta. Separar os dois commits pede `git add -p`.

## Decisões em aberto

Nenhuma bloqueia. As quatro perguntas da §11 do plano foram mantidas como estavam.
