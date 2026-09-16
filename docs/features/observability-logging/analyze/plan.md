# Observabilidade: log estruturado, request id e readiness

Plano da spec [`observability-logging`](../../../../specs/observability-logging.md). Cobre a Etapa 1
(análise) e a Etapa 2 (blueprint) do [`feature-analysis-guide.md`](../../../feature-analysis-guide.md).

Números do repo remedidos em **2026-09-16** contra este checkout, antes de planejar. Onde a medição diverge
da spec, o valor aqui prevalece e a divergência está anotada.

---

## 1. Contexto

### 1.1 Resumo

Dar ao boilerplate uma trilha de investigação: um helper de log compartilhado que torna a convenção já
emergida obrigatória, um identificador por requisição que cola o erro que o usuário vê ao que o servidor
registrou, um gancho de erro não tratado nos três apps, e um endpoint de prontidão que checa o Firestore.

### 1.2 O que a medição confirmou e o que corrigiu

| Afirmação da spec | Medido aqui | Veredito |
|---|---|---|
| 26 chamadas `console.*` em 20 arquivos de produção | **24 chamadas em 19 arquivos** (`.ts`/`.tsx`, fora de `__tests__` e `scripts/`) | Corrigido para baixo. A contagem da spec provavelmente incluiu arquivos de teste. |
| `account-avatar.ts:44` é clone textual de `entity-photo.ts:61` | Confirmado. Ambos `console.warn("[storage] could not sign a read url for a…")`, dentro de `catch {}` sem binding, mensagem estática, zero par `chave=valor` | Confirmado |
| `packages/auth/server.ts` concentra 5 chamadas com o objeto de erro | Confirmado: `:191`, `:204`, `:220`, `:263`, `:276`, todas `console.error("<frase>:", error)` | Confirmado |
| Nenhuma dependência de observabilidade | Confirmado: `sentry`, `opentelemetry`, `otel`, `pino`, `winston` não aparecem em nenhum `package.json` | Confirmado |
| `health/route.ts` tem 2 linhas e não checa dependência | Confirmado, literal, e o handler nem é `async` | Confirmado |
| `apps/api/instrumentation.ts` é o único gancho do repo | Confirmado. `apps/app` e `apps/web` não têm arquivo de instrumentação | Confirmado |

Três achados novos, que a spec não tinha:

1. **Não existe ponto único de captura de erro na API.** Os guards (`apps/api/app/(guards)/admin.ts:79`,
   `common-panel.ts:91`) terminam em `return handler(req, enrichedContext)` sem `try/catch`. Um `throw`
   dentro de um handler escapa para o Next, vira 500 no formato do framework e chega ao front **sem
   `error.code`**, caindo no fallback `error.unexpected` do `FormattedError`. O tratamento de erro hoje é
   local, rota a rota, em 18 blocos `try/catch` espalhados.
2. **`apps/api/vercel.json:4-9` agenda um cron para `/cron/keep-alive`, e essa rota não existe.** O cron
   bate num 404 todo dia à 01:00. Fica fora do corte (dívida adjacente), registrado na seção 12.
3. **A rota de webhook usa outro envelope.** `webhooks/payments/route.ts:30-32,63,74` responde
   `{ message, ok }`, não `{ error: { code } }`, e o caminho de sucesso ecoa o evento Stripe inteiro de
   volta (`:63`). Também fora do corte, registrado na seção 12.

### 1.3 Corte de MVP

A spec já fez o corte; este plano executa o que ela listou, com uma subtração forçada pela política e uma
adição justificada.

Entra:

- Helper de log em `@repo/shared`, com o formato que `proxy.ts:52-60` e `packages/email/index.ts:39-47` já
  praticam, mais um teste de privacidade no molde de `packages/email/__tests__/logPrivacy.test.ts`.
- Identificador por requisição gerado em `apps/api/proxy.ts`, devolvido no header `x-request-id` de toda
  resposta, injetado no header da requisição que chega ao handler, e exposto ao browser via CORS.
- `onRequestError` nos três apps, registrando rota, método, tipo de rota e o digest do erro.
- `/health` declarado dinâmico (liveness) e `/health/ready` novo, que verifica o Firestore e responde só um
  booleano.
- Migração dos `console.*` de `apps/api` para o helper: 11 pontos.
- `FormattedError.requestId` lido do header, e o identificador anexado à mensagem de erro que o usuário vê.

Não entra (subtração):

- **Serviço gerenciado de coleta de erro (Sentry ou equivalente).** Decisão D1 na seção 13. O que o corte
  entrega é a costura onde um fork pluga o coletor, não o coletor.

Fica fora, conforme a spec: tracing distribuído, alertas, painéis, retenção, métricas de negócio, session
replay, monitoramento sintético.

Também fora, por decisão deste plano: os 5 `console.error` de `packages/auth/server.ts`, os logs de cliente
(`SignUpFormClient.tsx:107`, `handleClientError.ts:7`), os `global-error.tsx` e o aviso de boot
`instrumentation.ts:24`. Critério em D3.

### 1.4 Apps impactados

| Alvo | O que muda |
|---|---|
| `packages/shared` | Helper de log novo; `FormattedError` ganha `requestId`; `handleClientError` compõe o sufixo |
| `apps/api` | `proxy.ts`, `instrumentation.ts`, `cors.ts`, rota `/health`, rota `/health/ready` nova, 11 call sites de log |
| `apps/app` | `instrumentation.ts` novo (só `onRequestError`) |
| `apps/web` | `instrumentation.ts` novo (só `onRequestError`) |
| `packages/internationalization` | 2 chaves novas nos 3 idiomas |
| `packages/sdk` | Nenhuma mudança. Ver D8. |

Área do painel: nenhuma, a mudança de UI é transversal ao alerta de erro. Modo de produto (`subscription`
× `simple`): sem diferença de comportamento. Não depende de assinatura nem de plano. Nenhuma dependência
externa nova, nenhuma variável de ambiente nova.

### 1.5 Genérico ou específico

O helper de log é utilitário transversal, e `@repo/shared` é exatamente onde vivem `HTTP_STATUS`,
`handleClientError` e `normalizeFirestoreInstant`. A política do ciclo manda manter escopo em `apps/*`
para não inchar `packages/*` com domínio de produto; log não é domínio de produto, e duplicar o helper nos
três apps recria o defeito que a spec documenta (a degradação se copia junto com o código). Ver D2.

### 1.6 Fontes

A spec aponta para [`specs/research/engineering-baseline.md`](../../../../specs/research/engineering-baseline.md),
que foi lido. As três práticas aplicáveis, com a armadilha de cada uma:

- Prática 6 (`:97-99`): Sentry conflita com `@vercel/otel` porque configura OTel sozinho; `tracesSampleRate:
  1.0` queima cota.
- Prática 7 (`:101-103`): `pino` não roda no Edge Runtime; `headers()` é assíncrono no Next 15+; nunca logar
  token ou PII.
- Prática 15 (`:109-111`): sem `dynamic = "force-dynamic"` o Next pré-renderiza e o health mente para
  sempre; readiness público que enumera dependências e versões é vazamento.

Nenhuma referência não lida. Não há card do ClickUp nem Figma associados.

---

## 2. Dados (Firestore)

Nenhum documento novo, nenhum campo novo, nenhum backfill, nenhum índice, nenhuma mudança em
`firestore.rules`.

A única leitura nova é a sonda de prontidão. Ver D6 para a forma dela e por que não usa o
`BaseRepository`.

---

## 3. Contrato — `@repo/sdk`

**Nenhuma mudança no `packages/sdk`.** A spec previa "propagar/expor o identificador de requisição nas
respostas de erro", e a medição mostrou que o SDK não é o lugar: `packages/sdk/src/client/base.ts:72-79`
propaga o erro do axios intocado de propósito, e quem lê a resposta de erro é
`packages/shared/utils/helpers/formattedError.ts:56-84`. O identificador entra lá, no mesmo ponto onde
`retryAfterSeconds` já é lido do header `Retry-After` (`:90-102`). Isso mantém o SDK como fachada pura e
evita um interceptor global.

Consequência para consumidores: nenhuma quebra. `FormattedError` ganha um campo, não perde nenhum.

---

## 4. API (`apps/api`)

### 4.1 Identificador de requisição

Gerado em `apps/api/proxy.ts`, que já roda em toda requisição (matcher `"/:path*"`, `:128-130`).

- `crypto.randomUUID()`, disponível em Edge e Node sem dependência.
- **Não honra `x-request-id` de entrada.** Ver D5: aceitar o valor do cliente abre injeção de linha no log,
  e correlacionar entre apps é tracing distribuído, que a spec deixou fora do corte.
- Vai em três lugares: no header da requisição repassada ao handler
  (`NextResponse.next({ request: { headers } })`), no header de toda resposta que o proxy devolve
  (inclusive as recusas de origem e de rate limit), e nos campos dos logs emitidos dentro daquela
  requisição.
- `apps/api/(shared)/lib/cors.ts:59` hoje é `const EXPOSED_HEADERS = "Retry-After"`. Precisa virar
  `"Retry-After, x-request-id"`. **Sem isso o browser não consegue ler o header**, pelo mesmo motivo já
  documentado no comentário `:55-58` daquele arquivo.
- `allowHeaders` do CORS não muda, justamente porque o header não é aceito na entrada.

### 4.2 Rota e guard

Nenhum guard novo, nenhum guard alterado. O único ponto por onde toda requisição passa é o proxy, e é lá
que o identificador nasce.

`/health/ready` é rota nova, sem guard (precisa ser chamável por load balancer e por uptime check), método
`GET`. É a única rota nova do corte.

### 4.3 Validação

Nada a validar: a rota de prontidão não tem body nem query. Nenhum schema Zod novo.

### 4.4 Erros

| `error.code` | Status | Quando |
|---|---|---|
| `HEALTH_DEPENDENCY_UNAVAILABLE` | 503 `SERVICE_UNAVAILABLE` | A sonda do Firestore falha ou estoura o timeout |

Único código novo, e exige entrada em `apiErrors` nos 3 idiomas
(`packages/internationalization/translations/packages/shared/utils.ts`, blocos que começam em `:2`, `:76`
e `:146`), senão `packages/internationalization/__tests__/parity.test.ts` reprova e derruba o build
(`turbo.json:16-17` faz `build` depender de `test`).

---

## 5. Front-end

### 5.1 `apps/app` e `apps/web`

Cada app ganha um `instrumentation.ts` na raiz (ao lado de `next.config.ts`, como já é em `apps/api`), com
uma exportação só: `onRequestError`. Next 16 carrega o arquivo sem flag. Nenhuma rota nova, nenhum
componente novo, nenhum `loading.tsx`, nenhuma entrada em `paths.ts`/`sidebar.tsx`.

### 5.2 Dados

Nenhuma `queryKey`, nenhum hook, nenhuma mutation. Nenhum formulário.

### 5.3 O que o usuário passa a ver

Quando a API responde erro e o header chega, a mensagem do alerta ganha o identificador no fim:

```
Sessão inválida ou expirada. (Código do erro: 3f2a1b8c-...)
```

A composição acontece em `packages/shared/utils/helpers/handleClientError.ts`, que já é o ponto único por
onde todo erro de UI passa antes do `errorAlert` (`packages/design-system/hooks/useAlert.ts:38`, chamado em
`packages/design-system/index.tsx:29` e em cada `useXCrud`). Uma linha lá cobre todos os pontos de erro do
painel.

Sem o header, a mensagem sai exatamente como sai hoje. É o modo degradado, e é o padrão.

### 5.4 i18n

Duas chaves novas, nos 3 idiomas. Árvore na seção 10.5.

---

## 6. Autorização e segurança

- Nenhuma regra de autorização muda. Nenhum guard novo.
- `/health/ready` é público e **não enumera dependência nem versão** (prática 15). O corpo de sucesso é
  `{ "data": { "ready": true } }` e o de falha é `{ "error": { "code": "HEALTH_DEPENDENCY_UNAVAILABLE" } }`.
  Nada indica qual dependência falhou.
- O identificador de requisição é um UUID v4 sem conteúdo derivado do usuário. Não é segredo e não
  identifica ninguém.
- Regra de privacidade do log, escrita e testada (D7): **log deliberado nunca recebe objeto de erro**; só
  pares `chave=valor` de vocabulário fechado. O `onRequestError` é a exceção declarada, com justificativa
  em D7.
- Impersonação: sem efeito. Nada no corte lê `subjectProfile` nem depende de `isImpersonating()`.

---

## 7. Testes

Todos no nível mais barato que prova o comportamento. **Nenhum exige emulador nem app de pé.**

| Arquivo | Nível | O que prova |
|---|---|---|
| `packages/shared/__tests__/log.test.ts` | unit | A linha casa a regex ancorada; passar um segundo argumento é impossível pela assinatura; `console.error`/`log`/`info`/`debug` ficam mudos; nenhum `@` e nenhum valor de PII aparece na saída |
| `packages/shared/__tests__/formattedErrorRequestId.test.ts` | unit | `requestId` é lido de `x-request-id`; é `null` quando o header falta; `handleClientError` anexa o sufixo só quando existe, e devolve a mensagem intacta quando não |
| `apps/api/__tests__/requestId.test.ts` | unit (proxy direto) | Toda resposta do proxy carrega `x-request-id`; formato UUID; muda entre duas chamadas; a recusa de origem e a de rate limit também carregam |
| `apps/api/__tests__/healthReady.test.ts` | unit (rota com `vi.mock` da sonda) | 200 `{ data: { ready: true } }` quando a sonda resolve; 503 `HEALTH_DEPENDENCY_UNAVAILABLE` quando ela lança; 503 quando estoura o timeout; o corpo de falha não contém nome de dependência |
| `apps/api/__tests__/health.test.ts` | unit (existente, estender) | `/health` segue respondendo `{"message":"OK"}` e exporta `dynamic === "force-dynamic"` |
| `apps/api/__tests__/corsOrigin.test.ts` | unit (existente, estender) | `Access-Control-Expose-Headers` inclui `x-request-id` |
| `apps/api/__tests__/instrumentation.test.ts` | unit (existente, estender) | `onRequestError` emite a linha estruturada e não lança quando `request`/`context` vêm incompletos |
| `packages/internationalization/__tests__/parity.test.ts` | unit (existente) | As 2 chaves novas existem nos 3 idiomas. Cobre sozinho, sem edição |

Cobertura por caminho de erro: sonda que lança, sonda que pendura, header ausente, header presente,
proxy recusando origem, proxy recusando por rate limit.

---

## 8. Validação visual

A única superfície visível é o sufixo na mensagem de erro. Fluxo, com `agent-browser` e comandos em
sequência:

1. `pnpm --filter api dev` e `pnpm --filter app dev`.
2. Entrar no painel, abrir o formulário de entidade e submeter um payload que a API recusa (por exemplo,
   nome vazio via manipulação do campo depois do `zodResolver`, ou uma requisição a `/entities/<id>`
   inexistente pela URL).
3. Screenshot do toast de erro com o identificador, em **light**, **dark** e **mobile**.
4. Conferir na aba de rede que a resposta traz `x-request-id` e que o valor no toast é o mesmo.
5. Conferir o terminal da API: a linha `[request] failed` daquela requisição carrega o mesmo
   `requestId`. Esse é o critério que fecha o laço entre o que o usuário vê e o que o servidor registrou.
6. Screenshot do toast **sem** a API rodando (erro de rede): a mensagem sai sem sufixo, igual a hoje.

---

## 9. Critérios de aceite

Formato §9.1 do guia. O `/test` cobra estes.

- [ ] **Toda resposta da API carrega `x-request-id`**
  Qualquer requisição a `apps/api`, com qualquer método e em qualquer rota, recebe um header
  `x-request-id` com um UUID v4. Vale para o caminho feliz, para o `204` do preflight `OPTIONS`, para a
  recusa de origem (`AUTH_FORBIDDEN_ORIGIN`, 403) e para a recusa por rate limit (`AUTH_RATE_LIMITED`,
  429). Duas requisições seguidas recebem valores diferentes.

- [ ] **O identificador enviado pelo cliente é ignorado**
  Uma requisição com `x-request-id: qualquer-coisa` no header de entrada recebe de volta um UUID gerado
  pelo servidor, não o valor enviado. Um valor com quebra de linha ou caracteres de controle não aparece
  em nenhum log. Isso é deliberado: honrar o valor do cliente permitiria injetar linhas falsas na trilha.

- [ ] **O browser consegue ler o identificador em requisição cross-origin**
  `Access-Control-Expose-Headers` inclui `x-request-id` junto de `Retry-After`. Sem isso o header chega na
  aba de rede mas fica invisível para o código, que é o comportamento documentado em
  `apps/api/(shared)/lib/cors.ts:55-58` para o `Retry-After`.

- [ ] **A mensagem de erro do painel mostra o identificador quando ele existe**
  Um erro vindo da API produz um alerta com a mensagem traduzida seguida do identificador, no formato
  `<mensagem> (<rótulo>: <uuid>)`, com o rótulo vindo do dicionário nos 3 idiomas. O valor mostrado é
  idêntico ao do header `x-request-id` daquela resposta.

- [ ] **Sem o identificador, a mensagem sai exatamente como antes**
  Erro de rede (API fora do ar), erro sem resposta HTTP, ou resposta sem o header: a mensagem é a mesma
  string de hoje, sem parênteses vazios, sem rótulo órfão e sem `null` ou `undefined` no texto. Este é o
  caminho degradado padrão e vale em `pnpm dev` sem nenhuma configuração.

- [ ] **Um erro não tratado nos três apps produz uma linha estruturada**
  Provocar um `throw` num route handler da `apps/api`, num Server Component da `apps/app` e numa página da
  `apps/web` produz, em cada um, uma linha `[request] failed …` no stdout com `method`, `path`,
  `routeType` e `digest`. O processo não morre e a resposta ao usuário continua sendo a página de erro
  normal.

- [ ] **O log deliberado nunca carrega objeto de erro nem PII**
  O helper de log aceita apenas pares `chave=valor` de tipo fechado; não há assinatura que permita passar
  um `Error`. O teste em `packages/shared/__tests__/log.test.ts` reprova se a saída tiver mais de um
  argumento, se contiver `@`, ou se não casar a regex ancorada. Um fluxo completo de cadastro e de
  redefinição de senha não deixa e-mail, token nem senha no stdout.

- [ ] **Os 11 pontos de `console` da `apps/api` passam pelo helper**
  Nenhum `console.*` direto sobra em `apps/api`, exceto `instrumentation.ts:24` (aviso de boot) e
  `app/global-error.tsx:15` (componente React). Os dois clones de mensagem estática
  (`entity-photo.ts:61`, `account-avatar.ts:44`) passam a emitir par `chave=valor` e ficam distinguíveis
  um do outro e por recurso.

- [ ] **`/health` continua respondendo e deixa de ser pré-renderizado**
  `GET /health` responde `200` com `{"message":"OK"}`, sem tocar o Firestore, mesmo com o banco fora do
  ar. O módulo exporta `dynamic = "force-dynamic"`, o que impede o Next de congelar a resposta no build.
  O contrato de corpo não muda, então o teste existente segue valendo.

- [ ] **`/health/ready` distingue processo de pé de dependência viva**
  Com o Firestore respondendo, `GET /health/ready` devolve `200` com `{ "data": { "ready": true } }`. Com
  o Firestore inacessível ou lento além do timeout, devolve `503` com
  `{ "error": { "code": "HEALTH_DEPENDENCY_UNAVAILABLE" } }`. A resposta de falha não diz qual dependência
  falhou, não traz versão, não traz mensagem do driver e não traz stack.

- [ ] **A prontidão não pendura a requisição**
  Uma sonda que nunca resolve faz `/health/ready` responder `503` dentro do timeout configurado, em vez de
  ficar aberta até o limite da plataforma. O timeout é uma constante nomeada, não um número solto no
  handler.

- [ ] **Nenhuma variável de ambiente nova é exigida**
  Um clone limpo do repositório, com os `.env.example` copiados sem edição, sobe os três apps, passa
  `pnpm turbo run lint typecheck test` e responde em `/health` e `/health/ready`. A feature não acrescenta
  linha nenhuma a nenhum `.env.example`.

- [ ] **Paridade de i18n nas chaves novas**
  `HEALTH_DEPENDENCY_UNAVAILABLE` em `apiErrors` e o rótulo do identificador existem em `pt-br`, `en` e
  `es` com a mesma estrutura. `pnpm --filter @repo/internationalization test` passa.

- [ ] **Tema e responsivo**
  O alerta de erro com o identificador é legível em light e dark, e o identificador não estoura a largura
  do toast em viewport mobile (não quebra o layout nem é truncado sem reticências).

---

## 10. Blueprint técnico

### 10.1 Helper de log — `packages/shared/utils/helpers/log.ts`

Formato herdado de `apps/api/proxy.ts:52-60` e `packages/email/index.ts:39-47`, sem inventar nada:
`[<escopo>] <evento> chave=valor chave=valor`, uma linha, `console.warn`.

```ts
type LogScope =
    | "security"
    | "email"
    | "storage"
    | "auth-action-link"
    | "auth"
    | "account"
    | "payments"
    | "request";

type LogFieldValue = string | number | boolean | null | undefined;

type LogFields = Record<string, LogFieldValue>;

export function logEvent(
    scope: LogScope,
    event: string,
    fields?: LogFields
): void;
```

Três propriedades que a assinatura garante, e que o teste trava:

1. `LogFieldValue` não inclui `object`, então **não há como passar um `Error`**. É a diferença entre o
   helper e a convenção por imitação, que é o argumento central da spec.
2. Campo `undefined` ou `null` é omitido da linha, não vira `chave=undefined`. Isso permite que
   `entity-photo.ts` e `account-avatar.ts` chamem sem `requestId` sem sujar a saída.
3. Valor recebe sanitização para linha única: quebra de linha, retorno de carro e espaço viram `_`. Sem
   isso, um `path` com `\n` quebra a trilha em duas linhas falsas.

Roda no Edge. É `console.warn` e concatenação de string, sem `pino` e sem `AsyncLocalStorage` (D4).

Exportado em `packages/shared/utils/helpers/index.ts`, em ordem alfabética entre `httpStatus` e
`normalizeFirestoreInstant`. Importado como `@repo/shared/utils/helpers/log`, que é o especificador
dominante no repo (34 usos do irmão `httpStatus`). Nenhuma mudança em `packages/shared/package.json`: o
`tsconfig` resolve `@repo/*` por path.

Saída de exemplo:

```
[storage] sign-url-failed resource=entity-photo requestId=3f2a1b8c-0f4a-4d0a-9e77-9f5f0a3a1c22
[request] failed method=POST path=/entities routeType=route digest=1837465920
```

### 10.2 Request id

`apps/api/(shared)/lib/request-id.ts`, novo:

```ts
export const REQUEST_ID_HEADER = "x-request-id";

export const generateRequestId = (): string => crypto.randomUUID();

export const requestIdFrom = (req: Request): string | null =>
    req.headers.get(REQUEST_ID_HEADER);
```

Pseudo-diff em `apps/api/proxy.ts`:

```diff
+const withRequestId = <T extends Response>(response: T, requestId: string): T => {
+    response.headers.set(REQUEST_ID_HEADER, requestId);
+    return response;
+};
+
 export default async function proxy(request: NextRequest) {
+    const requestId = generateRequestId();
     const origin = request.headers.get("origin");

     if (!isOriginAllowed(origin, allowedOrigins)) {
-        logBlocked("origin", request);
-        return withSecurityHeaders(withCors(refuseOrigin(request), null));
+        logBlocked("origin", request, requestId);
+        return withRequestId(
+            withSecurityHeaders(withCors(refuseOrigin(request), null)),
+            requestId
+        );
     }
     …
-    return withSecurityHeaders(withCors(NextResponse.next(), origin));
+    const forwardedHeaders = new Headers(request.headers);
+    forwardedHeaders.set(REQUEST_ID_HEADER, requestId);
+
+    return withRequestId(
+        withSecurityHeaders(
+            withCors(
+                NextResponse.next({ request: { headers: forwardedHeaders } }),
+                origin
+            )
+        ),
+        requestId
+    );
 }
```

`forwardedHeaders.set` sobrescreve o que o cliente mandou, que é o ponto de D5.

`logBlocked` passa a chamar o helper, produzindo a mesma linha de hoje mais um campo:

```diff
-    console.warn(
-        `[security] blocked reason=${reason} path=${request.nextUrl.pathname} method=${request.method}`
-    );
+    logEvent("security", "blocked", {
+        reason,
+        path: request.nextUrl.pathname,
+        method: request.method,
+        requestId,
+    });
```

Pseudo-diff em `apps/api/(shared)/lib/cors.ts:59`:

```diff
-const EXPOSED_HEADERS = "Retry-After";
+const EXPOSED_HEADERS = "Retry-After, x-request-id";
```

### 10.3 `onRequestError`

Assinatura do Next 16. Em `apps/api/instrumentation.ts`, acrescentada ao `register()` que já existe:

```ts
export const onRequestError = (
    error: unknown,
    request: { path: string; method: string },
    context: { routerKind: string; routePath: string; routeType: string }
): void => {
    logEvent("request", "failed", {
        method: request.method,
        path: request.path,
        routeType: context.routeType,
        digest: (error as { digest?: string })?.digest,
    });

    console.error(error);
};
```

`apps/app/instrumentation.ts` e `apps/web/instrumentation.ts` são arquivos novos com a mesma exportação e
sem `register()`.

O `console.error(error)` bruto é a exceção declarada à regra de privacidade. Justificativa em D7.

### 10.4 Health e readiness

`apps/api/app/(routes)/health/route.ts`:

```diff
+export const dynamic = "force-dynamic";
+
 export const GET = () =>
     new Response(JSON.stringify({ message: "OK" }), { status: 200 });
```

`apps/api/app/(routes)/health/ready/route.ts`, novo:

```ts
export const dynamic = "force-dynamic";

const PROBE_TIMEOUT_MS = 2000;

export const GET = async (): Promise<Response> => {
    const ready = await probeDatabase(PROBE_TIMEOUT_MS);

    if (!ready) {
        return Response.json(
            { error: { code: "HEALTH_DEPENDENCY_UNAVAILABLE" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }

    return Response.json({ data: { ready: true } }, { status: HTTP_STATUS.OK });
};
```

`probeDatabase` vive em `apps/api/(shared)/lib/readiness.ts`, faz `Promise.race` entre uma leitura barata
do Firestore e um timer, engole o erro (`catch` sem binding, no idioma de `packages/email/index.ts:126`) e
devolve `boolean`. Emite `logEvent("request", "readiness-failed", { reason })` com `reason` de vocabulário
fechado (`"timeout"` ou `"probe-error"`), nunca a mensagem do driver.

Payloads:

```jsonc
// GET /health           → 200
{ "message": "OK" }

// GET /health/ready     → 200
{ "data": { "ready": true } }

// GET /health/ready     → 503
{ "error": { "code": "HEALTH_DEPENDENCY_UNAVAILABLE" } }
```

### 10.5 i18n

Mesma estrutura nos 3 blocos de
`packages/internationalization/translations/packages/shared/utils.ts` (`pt-br` em `:2`, `en` em `:76`,
`es` em `:146`):

```
packages.utils
├── error
│   └── requestIdLabel     ← nova
└── apiErrors
    └── HEALTH_DEPENDENCY_UNAVAILABLE   ← nova
```

| Chave | pt-br | en | es |
|---|---|---|---|
| `error.requestIdLabel` | `Código do erro` | `Error code` | `Código del error` |
| `apiErrors.HEALTH_DEPENDENCY_UNAVAILABLE` | `O serviço está indisponível no momento.` | `The service is unavailable right now.` | `El servicio no está disponible en este momento.` |

O rótulo é um substantivo, não uma frase com placeholder, porque o dicionário do repo não tem motor de
interpolação. A composição fica no código.

### 10.6 `FormattedError` e `handleClientError`

Pseudo-diff em `packages/shared/utils/helpers/formattedError.ts`, espelhando `formatRetryAfter`
(`:90-102`):

```diff
     retryAfterSeconds: number | null;
+    requestId: string | null;
 …
         this.retryAfterSeconds = this.formatRetryAfter(error);
+        this.requestId = this.formatRequestId(error);
+    }
+
+    private formatRequestId(error: unknown): string | null {
+        if (!axios.isAxiosError(error)) {
+            return null;
+        }
+        const value = error.response?.headers?.["x-request-id"];
+        return typeof value === "string" && value.length > 0 ? value : null;
     }
```

Pseudo-diff em `packages/shared/utils/helpers/handleClientError.ts`:

```diff
 export function handleClientError(error: unknown): string {
     if (error instanceof FormattedError) {
-        return error.message;
+        if (!error.requestId) {
+            return error.message;
+        }
+        const label = error.translations?.packages.utils.error.requestIdLabel;
+        return `${error.message} (${label}: ${error.requestId})`;
     }
-    console.error("Error", error);
+    logEvent("request", "client-error");
     return "Um erro inesperado aconteceu";
 }
```

A troca do `console.error("Error", error)` da linha 7 vem de brinde: é o único `console` de
`packages/shared` e ele hoje despeja o objeto de erro, exatamente o que `logPrivacy.test.ts` reprova uma
camada abaixo. Sem `error` na saída, o caso vira contagem, não investigação, o que é aceitável porque este
ramo só é alcançado por erro que não é `FormattedError`.

### 10.7 Os 11 call sites da `apps/api`

| Arquivo:linha | Hoje | Vira |
|---|---|---|
| `proxy.ts:57` | conforme | `logEvent("security", "blocked", { reason, path, method, requestId })` |
| `(shared)/lib/auth-action-links.ts:25` | conforme | `logEvent("auth-action-link", "refused", { kind, code })` |
| `(shared)/lib/storage.ts:81` | conforme | `logEvent("storage", "delete-failed", { path })` |
| `(shared)/lib/entity-photo.ts:61` | semiconforme | `logEvent("storage", "sign-url-failed", { resource: "entity-photo" })` |
| `(shared)/lib/account-avatar.ts:44` | semiconforme | `logEvent("storage", "sign-url-failed", { resource: "avatar" })` |
| `app/(routes)/auth/password/reset-request/route.ts:41` | semiconforme, passa `error` | `logEvent("auth", "reset-request-delivery-failed", { requestId })` |
| `app/(routes)/auth/password/reset/route.ts:51` | não conforme, passa `error` | `logEvent("auth", "session-revoke-failed", { requestId })` |
| `app/(routes)/auth/sign-up/route.ts:38` | não conforme, `console.error(profileErr)` | `logEvent("auth", "profile-create-failed", { requestId })` |
| `app/(routes)/users/route.ts:71` | não conforme, `console.error(profileErr)` | `logEvent("account", "profile-create-failed", { requestId })` |
| `app/(routes)/webhooks/payments/route.ts:59` | não conforme | `logEvent("payments", "webhook-unhandled-event", { eventType: event.type })` |
| `app/(routes)/webhooks/payments/route.ts:65` | não conforme, passa `error` | `logEvent("payments", "webhook-failed", { requestId })` |

Os três primeiros são troca mecânica: a linha de saída fica byte a byte igual à de hoje, fora o campo
`requestId` no `proxy.ts`. Entram porque o objetivo do helper é fechar a porta, e deixar três chamadas
cruas ao lado dele reabre a imitação como caminho aceitável.

`entity-photo.ts` e `account-avatar.ts` deixam de ser indistinguíveis por causa do campo `resource`, que é
o defeito nomeado pela spec (`account-avatar.ts:44` é clone de `entity-photo.ts:61`).

Nos handlers de rota, `requestId` vem de `requestIdFrom(req)`. Nos módulos de `(shared)/lib/` que não
recebem a requisição, o campo é omitido.

### 10.8 Árvore de arquivos

```
packages/shared/
  utils/helpers/log.ts                      ← novo
  utils/helpers/index.ts                    ← + export
  utils/helpers/formattedError.ts           ← + requestId
  utils/helpers/handleClientError.ts        ← + sufixo
  __tests__/log.test.ts                     ← novo
  __tests__/formattedErrorRequestId.test.ts ← novo

apps/api/
  (shared)/lib/request-id.ts                ← novo
  (shared)/lib/readiness.ts                 ← novo
  (shared)/lib/cors.ts                      ← EXPOSED_HEADERS
  (shared)/lib/storage.ts                   ← logEvent
  (shared)/lib/entity-photo.ts              ← logEvent
  (shared)/lib/account-avatar.ts            ← logEvent
  (shared)/lib/auth-action-links.ts         ← logEvent
  proxy.ts                                  ← request id + logEvent
  instrumentation.ts                        ← + onRequestError
  app/(routes)/health/route.ts              ← force-dynamic
  app/(routes)/health/ready/route.ts        ← novo
  app/(routes)/auth/sign-up/route.ts        ← logEvent
  app/(routes)/auth/password/reset/route.ts ← logEvent
  app/(routes)/auth/password/reset-request/route.ts ← logEvent
  app/(routes)/users/route.ts               ← logEvent
  app/(routes)/webhooks/payments/route.ts   ← logEvent
  __tests__/requestId.test.ts               ← novo
  __tests__/healthReady.test.ts             ← novo
  __tests__/health.test.ts                  ← estender
  __tests__/corsOrigin.test.ts              ← estender
  __tests__/instrumentation.test.ts         ← estender

apps/app/instrumentation.ts                 ← novo
apps/web/instrumentation.ts                 ← novo

packages/internationalization/
  translations/packages/shared/utils.ts     ← 2 chaves × 3 idiomas
```

### 10.9 Ordem de implementação e de commit

1. `feat(shared): structured log helper with a privacy test`
2. `feat(shared): expose the request id on FormattedError`
3. `feat(api): generate and return a request id on every response`
4. `feat(api): report unhandled errors through the structured logger`
5. `feat(api): add a readiness probe and pin health to dynamic rendering`
6. `refactor(api): route every deliberate log through the shared helper`
7. `feat(app): report unhandled errors through the structured logger`
8. `feat(web): report unhandled errors through the structured logger`
9. `feat(internationalization): add the readiness error code and the request id label`
10. `docs(features): observability-logging`

Testes acompanham o commit da funcionalidade que cobrem. A branch é do `revisor-codigo`; este plano não
nomeia nem cria nenhuma.

### 10.10 Env e configuração

**Nenhuma variável de ambiente nova.** Nenhuma linha nova em nenhum `.env.example`. Um fork que clona o
repo e copia os `.env.example` sem editar nada recebe a feature inteira funcionando: identificador de
requisição, logs estruturados, gancho de erro e readiness. A parte que exige conta de provedor foi cortada
(D1), e é exatamente por isso que não sobrou env para configurar.

---

## 11. Pré-requisitos manuais de infra

Nada aqui bloqueia o `/develop` nem reprova o `/test`. São passos de console de provedor, e entram em
[`docs/PRE-PRODUCTION.md`](../../../PRE-PRODUCTION.md) como pendência.

1. **Apontar o health check da plataforma para `/health/ready`.** Vercel, Cloud Run ou o uptime check
   escolhido. Hoje nada consulta essas rotas: criá-las não faz ninguém ser avisado.
2. **Plugar um coletor de erro no `onRequestError` dos três apps.** O gancho existe e emite a linha
   estruturada; quem quiser notificação (Sentry, Better Stack, Axiom) acrescenta a chamada dentro dele e
   traz a env do provedor. É decisão de fork, com custo de conta, e está fora deste corte por D1.
3. **Conferir a retenção de log da plataforma de deploy.** No free tier da Vercel os logs de runtime
   duram cerca de uma hora, o que basta para investigar um incidente em andamento e não basta para um
   post-mortem do dia seguinte. Este número precisa ser verificado no painel antes de virar afirmação:
   nenhuma fonte com data foi consultada para ele neste plano.
4. **Decidir o destino do cron órfão.** `apps/api/vercel.json:4-9` agenda `/cron/keep-alive`, rota que não
   existe. Fica fora do corte (seção 12), mas quem for para produção precisa ou criar a rota, ou apontar o
   cron para `/health`, ou remover a entrada.

---

## 12. Achados fora do corte

Dívida adjacente encontrada no caminho. Nenhuma entra em commit desta tarefa.

| Achado | Onde | Por que fica fora |
|---|---|---|
| Não há ponto único de captura de erro na API; um `throw` num handler vira 500 sem `error.code` | `app/(guards)/admin.ts:79`, `common-panel.ts:91` | Envolver os guards em `try/catch` muda o contrato de erro de toda rota autenticada. Raio grande demais para esta tarefa, e a spec não pede |
| `packages/auth/server.ts:191,204,220,263,276` logam o objeto de erro sem prefixo | `packages/auth` | D3. Pacote de integração no caminho de sessão dos três apps |
| Cron agendado para rota inexistente | `apps/api/vercel.json:4-9` | Mudança mínima. Registrado em §11.4 |
| Webhook de pagamento usa envelope `{ message, ok }` e ecoa o evento Stripe inteiro na resposta de sucesso | `app/(routes)/webhooks/payments/route.ts:30,63,74` | Mudar o contrato de resposta de um webhook é assunto de `payments`, não de observabilidade |
| Guards respondem `401`/`403` com número literal em vez de `HTTP_STATUS` | `admin.ts:34-50`, `common-panel.ts:36-50` | Cosmético, fora da tarefa |

---

## 13. Decisões tomadas sem perguntar

A rodada é autônoma. Cada decisão traz a alternativa descartada e o critério.

**D1. Sem serviço gerenciado de coleta de erro.**
A spec recomenda "serviço gerenciado, opt-in por env", e `.claude/cycle-policy.md:40-43` diz para não
adotar serviço pago nem dependência nova sem passar pelo relatório, implementando com o que já existe e
registrando a alternativa paga como pergunta. A política vence a escada de decisão. Adotado: gancho nativo
`onRequestError` do Next 16 (zero dependência) escrevendo no stdout, que Vercel e Cloud Run já coletam e
indexam. Descartado: `@sentry/nextjs` mais conta Sentry. O custo honesto da escolha é que **ninguém é
notificado**: a trilha passa a existir e a ser consultável, mas alguém ainda precisa ir olhar. Vira
pergunta em aberto.

**D2. Helper em `packages/shared`, não em cada app.**
A política manda manter escopo em `apps/*`. Log não é domínio de produto, é utilitário transversal, e
`@repo/shared` já hospeda `HTTP_STATUS`, `handleClientError` e `FormattedError`. Descartado: uma cópia por
app, que recria o defeito que a spec documenta.

**D3. Migrar 11 call sites, não 24.**
Critério declarado: **migra todo `console.*` de `apps/api` que não seja aviso de boot nem componente
React.** Dá 11 de 13. Fica de fora `instrumentation.ts:24` (roda antes de tudo e a mensagem é instrução
para humano, não evento) e `app/global-error.tsx:15` (componente React, já gateado por `NODE_ENV`).
Descartado: migrar os 24, incluindo `packages/auth/server.ts` (5 chamadas no caminho de sessão dos três
apps) e os logs de cliente. O corte de MVP da spec nomeia "webhook de pagamento, criação de perfil"; este
plano entrega isso mais os dois clones de storage e os dois logs de senha que passam o objeto de erro,
porque são o argumento de privacidade que a própria spec levanta. Um app inteiro é uma fronteira que dá
para verificar por grep; "os pontos críticos" não é.

**D4. Sem `pino`, sem `AsyncLocalStorage`.**
A prática 7 da nota de pesquisa recomenda os dois. `pino` é dependência nova e não roda no Edge, e
`apps/api/proxy.ts` roda no Edge. `AsyncLocalStorage` também não roda no Edge, e passar o identificador
explícito custa um parâmetro por call site. Descartado: contexto implícito, que é o caso geral e cobra
complexidade antes do segundo caso de uso.

**D5. O identificador de entrada não é honrado.**
Adotado: o proxy sempre gera e sempre sobrescreve. Descartado: aceitar `x-request-id` do cliente para
correlacionar app e API. Dois motivos. Correlacionar entre apps é tracing distribuído, que a spec pôs
fora do corte; e um valor vindo do browser precisa de validação estrita contra injeção de linha no log,
que é superfície nova para um ganho fora do corte.

**D6. A sonda de prontidão não usa o `BaseRepository`.**
Adotado: `apps/api/(shared)/lib/readiness.ts` com uma leitura barata direta e `Promise.race` contra um
timeout nomeado. Descartado: `userRepository.list()` ou equivalente, que carrega documentos reais e faz o
readiness custar proporcional ao tamanho da coleção (o `BaseRepository` não tem `limit`, conforme o guia
§2.2).

**D7. `onRequestError` emite o objeto de erro; log deliberado não.**
A fronteira, escrita para quem for editar depois: **log deliberado de caminho conhecido só carrega campos
de vocabulário fechado; erro não tratado carrega o erro.** O motivo é que o objeto de erro de um caminho
conhecido tem PII conhecida (`packages/email/index.ts:126-127` descarta a mensagem do provedor justamente
porque ela traz o endereço do destinatário), enquanto um erro não tratado já é impresso no stdout pelo
Next de qualquer forma. O gancho não acrescenta exposição, acrescenta correlação. Descartado: suprimir o
erro também no `onRequestError`, que deixaria o corte sem nada para investigar e contrariaria o primeiro
item do corte de MVP da spec.

**D8. O identificador entra em `@repo/shared`, não no `packages/sdk`.**
A spec previa o SDK. A medição mostrou que `packages/sdk/src/client/base.ts:72-79` propaga o erro do axios
intocado de propósito, e que quem lê a resposta de erro é `FormattedError`. Descartado: interceptor de
resposta no SDK, que é global por instância e fixaria comportamento para todos os consumidores.

**D9. O sufixo do identificador entra em `handleClientError`.**
Uma linha cobre todo erro do painel, porque `handleClientError` é o ponto por onde todo erro passa antes
do `errorAlert`. Descartado: renderizar num componente novo de erro, que exigiria tocar cada `useXCrud`.
Descartado também: embutir o sufixo dentro de `FormattedError.message`, que mudaria a string que os testes
existentes comparam.

---

## 14. Perguntas em aberto

Todas foram decididas para a rodada seguir. Cada uma traz o que foi adotado.

1. **Adotar Sentry (ou equivalente gerenciado) agora?**
   Opções: (a) adotar, opt-in por `SENTRY_DSN` ausente, no padrão do `ARCJET_KEY`; (b) só a costura, sem
   serviço. **Adotado: (b)**, por `.claude/cycle-policy.md:40-43`. O que se perde é a notificação: a
   trilha existe, mas ninguém é avisado. Se a resposta for (a), o trabalho incremental é pequeno, porque
   o `onRequestError` já é o lugar onde o SDK do Sentry entra, e a armadilha de conflito com
   `@vercel/otel` (prática 6) só aparece aí.

2. **Migrar os 5 `console.error` de `packages/auth/server.ts`?**
   É o ponto com maior chance de PII no repo (objeto de erro num pacote de autenticação), e ficou fora por
   raio de impacto (D3). **Adotado: fora do corte**, registrado como achado na seção 12. Se a resposta for
   migrar, é um commit isolado de 5 linhas em um arquivo só.

3. **Mostrar o identificador ao usuário final?**
   A spec recomenda que sim. **Adotado: sim**, sufixado à mensagem do alerta, nunca junto de detalhe
   interno da falha (D9). O identificador é um UUID sem informação derivada do usuário.

4. **O que fazer com o cron órfão `/cron/keep-alive`?**
   **Adotado: nada nesta tarefa**, por mudanças mínimas. Registrado em §11.4 e na seção 12. A correção
   natural é apontar o cron para `/health`, que passa a existir de forma dinâmica e serve de keep-alive
   sem rota extra.
