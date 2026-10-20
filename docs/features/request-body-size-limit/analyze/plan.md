# Plano: teto de bytes no corpo JSON da API antes do parse

- **Slug:** `request-body-size-limit`
- **Origem:** tarefa direta, sem spec. Achado 🟢 de `specs/BACKLOG.md:1562`, candidata em `specs/BACKLOG.md:292-293`.
  A revisão da PR #49 deixou o achado de fora (decisão 2 de `docs/features/contact-support-channel/review/review.md:165`)
  porque seria um padrão novo numa rota só, quando o problema é de todas as rotas públicas.
- **Rodada:** terceira tarefa do `/cycle`, na mesma PR de `google-sign-in-error-contract` e
  `password-unlink-email-restore`. Nenhum arquivo dessas duas tarefas é tocado aqui (§10.6).
- **Branch:** `guilhermebittelbrunn/cycle-command-v5`. O nome proposto pelo `/review` para a PR é
  `api/fix/google-sign-in-and-password-unlink`; este plano não cria nem renomeia branch.

## 0. Sumário do desenho

`parseRequestJson` (`apps/api/(shared)/lib/parse-request-json.ts:4-18`) passa a recusar com
`413 { "error": { "code": "VALIDATION_FAILED" } }` todo corpo acima de **100 KiB (102 400 bytes)**, em duas
camadas e sem dependência nova:

1. `content-length` declarado acima do teto é recusado **sem ler o corpo**;
2. o corpo é lido do stream com um contador de bytes; ao passar do teto, o leitor é cancelado e a rota
   responde 413. Isso cobre `transfer-encoding: chunked` e o `content-length` que mente para menos.

O helper já é o caminho de 22 handlers, então a correção vale para todos sem mexer em nenhuma rota. JSON
inválido e corpo ausente continuam respondendo `400 VALIDATION_FAILED`, como hoje. O webhook da Stripe e o
upload ficam fora, porque não passam pelo helper e têm motivo para isso (§1.4). Nada muda em `packages/*`,
`apps/app`, `apps/web` ou i18n. O `docs/SECURITY.md` ganha uma subseção sobre o teto, e a conta defasada da
`:160` é corrigida de passagem.

## 1. Contexto

### 1.1 Problema, pela leitura do código

`parseRequestJson` faz `await req.json()` (`parse-request-json.ts:8`). O `Request` lê o corpo inteiro para a
memória e só então faz o `JSON.parse`; o Zod da rota recusa o tamanho dos campos depois disso. Na rota de
contato a sequência é `parseRequestJson` em `contact/route.ts:20` e `parseContactMessage` em `:25`. Um corpo
de vários megabytes é lido, decodificado e parseado inteiro para depois virar `400 VALIDATION_FAILED`.

Hoje só o upload confere tamanho antes de ler: `exceedsDeclaredLength` em
`apps/api/(shared)/validation/file.schema.ts:96-102`, chamado em `:108` antes do `req.formData()` de `:113`.

### 1.2 Inventário das rotas

`find "apps/api/app/(routes)" -name route.ts` dá **41** arquivos. Os que leem corpo:

**Pelo `parseRequestJson`: 22 handlers.**

| rota | chamada | quem pode chegar à leitura do corpo | rate limit (`proxy.ts:53-67`) |
|------|---------|-------------------------------------|-------------------------------|
| `POST /auth/sign-in` | `auth/sign-in/route.ts:15` | **qualquer um** (primeira linha do handler) | sim |
| `POST /auth/sign-up` | `auth/sign-up/route.ts:20` | **qualquer um** | sim |
| `POST /auth/sign-in/google` | `auth/sign-in/google/route.ts:17` | **qualquer um** | sim |
| `POST /auth/password/reset` | `auth/password/reset/route.ts:16` | **qualquer um** | sim |
| `POST /auth/password/reset-request` | `auth/password/reset-request/route.ts:63` | **qualquer um**, com e-mail configurado (`:55-60`) | sim |
| `POST /auth/email-verification/confirm` | `auth/email-verification/confirm/route.ts:28` | **qualquer um** | sim |
| `POST /auth/email-change/confirm` | `auth/email-change/confirm/route.ts:35` | **qualquer um** | sim |
| `POST /contact` | `contact/route.ts:20` | **qualquer um**, com o canal ativo (`:15-18`) | sim |
| `POST /auth/email-verification/send` | `auth/email-verification/send/route.ts:36` | quem tem ID token válido (`resolveApiActor`, `:17-23`), sem guard de painel | sim |
| `PUT /account` | `account/route.ts:116` | `requireCommonPanelApi` | não |
| `POST /account/password` | `account/password/route.ts:19` | `requireCommonPanelApi` | não |
| `POST /account/password/set` | `account/password/set/route.ts:24` | `requireCommonPanelApi` | não |
| `POST /account/deletion` | `account/deletion/route.ts:30` | `requireCommonPanelApi` | sim |
| `POST /account/email` | `account/email/route.ts:84` | `requireCommonPanelApi` | sim |
| `POST /account/onboarding` | `account/onboarding/route.ts:15` | `requireCommonPanelApi` | não |
| `POST /account/sign-in-methods/linked` | `account/sign-in-methods/linked/route.ts:27` | `requireCommonPanelApi` | não |
| `POST /entities` | `entities/route.ts:58` | `requirePlanApi` sobre `requireCommonPanelApi` | não |
| `PUT /entities/:id` | `entities/[id]/route.ts:47` | `requireCommonPanelApi` | não |
| `POST /payments/checkout` | `payments/checkout/route.ts:29` | `requireCommonPanelApi` | não |
| `POST /payments/portal` | `payments/portal/route.ts:24` (só quando `req.body` existe, `:23-25`) | `requireCommonPanelApi` | não |
| `POST /users` | `users/route.ts:41` | `requireAdminApi` | não |
| `PUT /users/:id` | `users/[id]/route.ts:123` | `requireAdminApi` | não |

Resumo: **8 públicas** leem o corpo sem credencial nenhuma, **1** exige só um ID token, **13** passam por guard
antes do handler. As 8 públicas estão todas na lista de rate limit.

**Fora do helper: 2 handlers.**

| rota | leitura | por que fica fora |
|------|---------|-------------------|
| `POST /webhooks/payments` | `request.text()` em `webhooks/payments/route.ts:269` | `stripe.webhooks.constructEvent` (`:275`) precisa do corpo cru, byte a byte, para conferir a assinatura. Não é JSON parseado por nós, e o tamanho do evento é decidido pela Stripe; um teto nosso abaixo do que ela manda viraria evento perdido. |
| `POST /files` | `req.formData()` em `file.schema.ts:113` | já tem teto próprio de 4 MiB + 64 KiB de envelope (`file.schema.ts:9-18`), que é 40 vezes o teto do JSON. Passar pelo helper quebraria todo upload. |

**Sem leitura de corpo: 17 arquivos** (os `GET`, os `DELETE` e as rotas de sessão). `DELETE /auth/session`
(`auth/session/route.ts:32-33`) só lê a credencial.

### 1.3 O que a plataforma já limita

Medido no código do Next instalado (`apps/api/node_modules/next`, versão **16.0.0**) e no repo:

- **Route handlers do App Router não têm teto próprio.** O `bodyParser.sizeLimit` é do Pages Router, e o
  `serverActions.bodySizeLimit` vale só para Server Actions. Nada no `apps/api/next.config.ts` nem em
  `packages/next-config/index.ts` configura limite.
- **Com o `proxy.ts` presente, o servidor do Next clona o corpo até 10 MiB.** `resolve-routes.js:117-118` passa
  `experimental.proxyClientMaxBodySize` (padrão `10485760`, `config-shared.js:208`) a `getCloneableBody`. Em
  `body-streams.js:85-97`, acima desse valor o Next emite um `console.warn` e **trunca** o corpo; abaixo, o
  corpo inteiro passa por `PassThrough` em memória antes de chegar ao handler. No `next start` próprio, então,
  o processo já recebe até 10 MiB de qualquer chamador, e um corpo maior chega cortado (vira JSON inválido e
  `400`). Isto é leitura do código, não medição.
- **Na Vercel o teto é 4,5 MB**, recusado antes do handler e sem `error.code`. O próprio repo registra isso em
  `file.schema.ts:3-7`.

Consequência para o desenho: o helper **não impede** que a plataforma receba os bytes. O que ele limita é o
que o handler acumula, decodifica, parseia com `JSON.parse` e entrega ao Zod. Também troca uma resposta que
dependia da plataforma (truncamento no `next start`, recusa sem código na Vercel) por uma resposta nossa e
estável. O achado do backlog já classificava o risco como 🟢 pelo mesmo motivo ("o rate limit e o teto da
plataforma cobrem o caso", `specs/BACKLOG.md:1562`). O valor está em fechar o padrão na raiz, antes que uma
rota nova leia algo pesado depois do parse.

### 1.4 Objetivo e corte de MVP

- **Dentro:** o teto no `parseRequestJson`, com as duas camadas; testes unitários do helper e um caso de rota
  pública; a subseção no `docs/SECURITY.md`; a correção da conta da `:160`.
- **Fora:** o webhook e o upload (§1.2); teto por rota (nenhuma precisa de mais que o padrão, §4.2); mexer no
  `proxyClientMaxBodySize` do Next (é config de plataforma, muda o comportamento do proxy para todas as rotas e
  não reduz o que a Vercel aceita); log da recusa (o 413 é barato e a rota não registra hoje o 400 de JSON
  inválido; criar o evento seria padrão novo sem consumidor); código de erro novo (§4.4).

### 1.5 Apps impactados

| área | muda? | o quê |
|------|-------|-------|
| `apps/api` | sim | `(shared)/lib/parse-request-json.ts`, teste novo, um caso em `contactRoute.test.ts` |
| `docs/SECURITY.md` | sim | subseção nova depois da `:170`; frase da `:160` |
| `packages/sdk` | não | contrato e tipos intactos |
| `apps/app`, `apps/web` | não | nenhum cliente legítimo chega perto do teto (§4.2) |
| `packages/internationalization` | não | `VALIDATION_FAILED` já existe nos 3 idiomas (`translations/packages/shared/utils.ts:95`, `:242`, `:390`) |

Modo de produto, assinatura, área do painel: N/A, a mudança é transversal e anterior a qualquer regra de
negócio.

## 2. Dados (Firestore)

N/A. Nenhuma coleção, campo ou consulta muda.

## 3. Contrato `@repo/sdk`

N/A. A forma de erro (`{ error: { code } }`) é a mesma; só o status 413 é novo, e o `FormattedError` já lê o
status da resposta (`packages/shared/utils/helpers/formattedError.ts:170-187`) e traduz pelo `code`.

## 4. API

### 4.1 Rota e guard

Nenhuma rota muda. O helper roda depois do guard nas 13 rotas guardadas (o guard embrulha o handler) e é a
primeira leitura do corpo nas 8 públicas, como hoje. A ordem "disponibilidade antes do corpo" de
`contact/route.ts:15-18` e `reset-request/route.ts:55-60` continua valendo: sem canal, 503 sem ler nada.

### 4.2 O teto e de onde vem o número

O maior corpo legítimo, pelos schemas Zod que os 22 handlers aplicam:

| schema | campos com teto (unidades UTF-16) | soma | pior caso em bytes (`\uXXXX`, 6 bytes por unidade) |
|--------|-----------------------------------|------|-----------------------------------------------------|
| `createEntitySchema` (`entity.schema.ts:45-53`) | `name` 255, `description` 10 000, `photo` 2048, `birthdate` 10 | 12 313 | ~74 KB |
| `contactMessageSchema` (`contact.schema.ts:11-16`) | `name` 120, `email` 320, `message` 5000 | 5440 | ~33 KB |
| `parseDeleteAccount` (`account.schema.ts:15`, `password.schema.ts`) | `reauthIdToken` 4096, senha 1024 | 5120 | ~31 KB |
| `parseUpdateAccount` (`account.schema.ts:11-13`) | 120 + 32 + 2048 | 2200 | ~13 KB |
| demais (`auth.schema.ts:11-14`, `payments.schema.ts:5`) | ≤ 4096 por campo | | < 30 KB |

O pior caso usa 6 bytes por unidade porque é o que o `JSON.stringify` produz para caractere de controle e
surrogate isolado. Texto digitado de verdade fica em até 3 bytes por unidade (CJK); emoji ocupa 4 bytes em 2
unidades. A descrição de entidade com 10 000 caracteres CJK dá ~30 KB.

**Teto adotado: 100 KiB (102 400 bytes).** Cobre o pior caso patológico do maior schema com ~28% de folga e
é o padrão do `express.json()` (`body-parser`, `lib/types/json.js:57`, presente no lockfile como dependência
transitiva), que é o número que quem vem de Node espera ver. Nenhuma rota precisa de mais, então o helper não
ganha parâmetro de override agora (§12, decisão 3).

`POST /users` aceita `email: z.string().email()` sem `.max()` (`user-admin.schema.ts:8`). É rota de admin e o
teto global passa a limitá-la também; o campo sem `max` fica registrado como achado, fora desta tarefa.

### 4.3 Mecanismo

Opção (c): as duas camadas.

1. `content-length` declarado maior que o teto → 413 sem tocar no stream. É o mesmo raciocínio do upload
   (`file.schema.ts:91-102`): recusar antes de ler é o que evita carregar o corpo.
2. Sem `content-length`, ou com um valor que mente para menos: leitura com `req.body.getReader()`, somando
   `value.byteLength` a cada pedaço. Ao passar do teto, `reader.cancel()` e 413. A memória retida fica
   limitada ao teto mais um pedaço.

Por que não só (a): o header é opcional (`transfer-encoding: chunked`) e o cliente controla o valor. Medido
no Node 22.13: `new Request(url, { method: "POST", body: "..." }).headers.get("content-length")` devolve
`null`, ou seja, todo teste com corpo string já exercita o caminho sem header.

Por que não só (b): ler até o teto e cancelar custa pouco, mas quando o cliente declara 5 MB não há motivo
para ler os primeiros 100 KiB.

Detalhes que preservam o comportamento de hoje:

- **`req.body === null`** (POST sem corpo): `req.json()` lança `SyntaxError` (medido), e a resposta é
  `400 VALIDATION_FAILED`. O helper mantém o 400.
- **Decodificação:** `new TextDecoder().decode(bytes)` com os padrões (`fatal: false`, BOM removido) faz o
  mesmo que o `req.json()` da especificação Fetch (UTF-8 decode). Os pedaços são concatenados antes de
  decodificar, então um caractere multibyte partido entre dois pedaços não é corrompido.
- **Corpo já consumido ou stream travado:** `getReader()` lança e cai no `catch` com 400, como o `req.json()`
  faria.
- **`for await` sobre o stream:** não serve. O `tsconfig` do repo usa `lib: ["es2022", "DOM",
  "DOM.Iterable"]` (`packages/typescript-config/base.json:11`), sem `DOM.AsyncIterable`, então o
  `ReadableStream` não tem `Symbol.asyncIterator` no tipo. O laço com `reader.read()` passa no Biome
  (`noAwaitInLoops` está `off` no Ultracite, `node_modules/ultracite/config/core/biome.jsonc:281`).
- **`content-length` não numérico** (`"abc"`): `Number("abc")` é `NaN`, a camada 1 não recusa e a camada 2
  mede de verdade. Mesma regra de `file.schema.ts:100-101`.

### 4.4 Erros

| situação | status | `error.code` | antes |
|----------|--------|--------------|-------|
| `content-length` > 102 400 | **413** | `VALIDATION_FAILED` | lia tudo; 400 se o Zod recusasse, ou 2xx se os campos coubessem (impossível acima de ~74 KB) |
| corpo lido passa de 102 400 bytes | **413** | `VALIDATION_FAILED` | idem |
| corpo ausente | 400 | `VALIDATION_FAILED` | igual |
| JSON inválido | 400 | `VALIDATION_FAILED` | igual |
| corpo ≤ 102 400 bytes e JSON válido | segue para o Zod da rota | | igual |

O código reaproveitado é `VALIDATION_FAILED`. O motivo está na §11, pergunta 1.

### 4.5 Persistência

N/A.

## 5. Front-end

N/A. Os formulários do `apps/app` e da `apps/web` limitam os campos pelos mesmos tetos do Zod, então não
produzem corpo perto de 100 KiB. Se algum cliente produzir, `handleClientError` mostra "Dados inválidos." (e
equivalentes) pelo `code`, sem copy nova.

## 6. Autorização e segurança

- A mudança reduz o trabalho que um chamador sem credencial consegue impor às 8 rotas públicas por
  requisição: no máximo 100 KiB acumulados, decodificados e parseados, em vez de até 10 MiB (`next start`) ou
  4,5 MB (Vercel).
- Não é defesa contra volume. Quem limita requisições é o Arcjet no proxy, e sem `ARCJET_KEY` nada limita
  (`docs/SECURITY.md:166`). O teto e o rate limit se somam.
- Impersonação: N/A. O helper roda depois do guard e não lê contexto.
- A resposta 413 não ecoa nada do corpo nem o tamanho recebido.

## 7. Testes

Todos unitários, no ambiente `node` do Vitest (`apps/api/vitest.config.ts:6`), sem emulador e sem app de pé.

### 7.1 `apps/api/__tests__/parseRequestJson.test.ts` (novo)

`Request` construído à mão, importando `parseRequestJson` e a constante exportada do teto.

| caso | como montar | esperado |
|------|-------------|----------|
| JSON válido pequeno | `body: JSON.stringify({ a: 1 })` | `ok: true`, `value` igual |
| corpo exatamente no teto | string JSON de 102 400 bytes (ex.: `"` + `a`×102 398 + `"`) | `ok: true` |
| um byte acima, sem `content-length` | mesma string com 102 401 bytes | `ok: false`, 413, `VALIDATION_FAILED` |
| `content-length` declarado acima, corpo pequeno | `headers: { "content-length": "102401" }`, body `"{}"` | 413 e o corpo **não** foi lido: `request.bodyUsed === false` |
| stream sem `content-length` que passa do teto | `ReadableStream` que enfileira pedaços de 50 000 bytes, `duplex: "half"`; o `pull` conta quantas vezes foi chamado | 413; o stream foi cancelado (o `cancel` do underlying source foi chamado) e não foi drenado até o fim |
| stream sem `content-length` abaixo do teto, pedaço partindo um caractere multibyte | dois pedaços de `TextEncoder().encode('{"a":"é"}')` cortados no meio do `é` | `ok: true`, `value.a === "é"` |
| `content-length` que mente para menos | header `"10"`, corpo de 102 401 bytes | 413 pela leitura |
| `content-length` não numérico | header `"abc"`, corpo `"{}"` | `ok: true` |
| sem corpo | `new Request(url, { method: "POST" })` | 400, `VALIDATION_FAILED` |
| JSON inválido | `"{not json"` | 400, `VALIDATION_FAILED` |
| corpo já consumido | `await request.text()` antes de chamar | 400, `VALIDATION_FAILED` |

A asserção do status usa `HTTP_STATUS.PAYLOAD_TOO_LARGE` (`packages/shared/utils/helpers/httpStatus.ts:12`).

### 7.2 `apps/api/__tests__/contactRoute.test.ts` (um caso no `describe("POST /contact validation")`, `:102`)

"refuses a body over the cap without calling the provider": com o canal ativo (setup de `:60-69`), um JSON
com `message` de 120 000 caracteres responde 413 `VALIDATION_FAILED` e `sendEmailMock` não é chamado. É o
caso de rota pública pedido e prova que a rota repassa a resposta do helper sem tratá-la. Os casos de
`:126-139` (mensagem com 5001 caracteres, ~5 KB) continuam em 400: o teto não engole a validação de campo.

### 7.3 Prova de que o teste pega o defeito

Com o helper de `HEAD`, o caso de 102 401 bytes e o de `content-length` declarado devolvem `ok: true` (a
string cabe num JSON válido) e o caso de stream drena tudo. O `/develop` roda o arquivo novo contra o helper
antigo uma vez e registra no handoff quantos casos falham.

### 7.4 Suítes a rodar

`pnpm --filter api test` (inclui as suítes de rota dos 22 chamadores, que exercitam o helper novo com corpo
string e sem `content-length`), `pnpm --filter api typecheck`, `pnpm check`. Atenção aos testes das outras
duas tarefas da PR (`authSignInGoogleRoute.test.ts`, `accountSignInMethodsRoute.test.ts`): passam pelo
helper e têm de continuar verdes. Nenhum teste mocka `parse-request-json` (conferido com grep).

## 8. O que o `/test` vai ter de percorrer

Diff sem UI: sem `agent-browser`, sem tema, viewport ou idioma (`.claude/cycle-policy.md`, §3.1). O `/test`
roda as suítes da §7.4 e o `pnpm test` da raiz.

Não verificável sem infra, vira 🔒 e não reprova: o comportamento da Vercel com corpo acima de 4,5 MB e o
truncamento em 10 MiB do `next start` (§1.3). Os dois são da plataforma e não mudam com este diff.

## 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Corpo declarado acima de 100 KiB é recusado sem ser lido**
  Uma requisição com `content-length` maior que 102 400 a qualquer rota que usa `parseRequestJson` recebe
  `413` com `{ "error": { "code": "VALIDATION_FAILED" } }`. O corpo não é lido (`bodyUsed` continua `false`).
  Um `content-length` não numérico não conta como declaração e cai na medição do critério seguinte.

- [ ] **Corpo sem `content-length` é medido enquanto é lido**
  Com `transfer-encoding: chunked`, ou com um `content-length` menor que o corpo real, o helper soma os bytes
  de cada pedaço e cancela a leitura ao passar de 102 400, respondendo `413 VALIDATION_FAILED`. O stream não é
  drenado até o fim, e a memória retida fica no teto mais um pedaço.

- [ ] **O limite é inclusivo**
  Um corpo de exatamente 102 400 bytes com JSON válido é aceito e chega ao Zod da rota. Com 102 401 bytes, a
  resposta é 413.

- [ ] **JSON inválido e corpo ausente mantêm o comportamento anterior**
  `POST` sem corpo, JSON malformado e corpo já consumido continuam respondendo `400 VALIDATION_FAILED`, como
  antes da mudança. O `POST /payments/portal` sem corpo continua tratando o corpo como `{}`
  (`payments/portal/route.ts:23-25`).

- [ ] **Decodificação igual à do `req.json()`**
  Um caractere multibyte partido entre dois pedaços do stream chega inteiro ao valor parseado. BOM no início
  é removido, como no `req.json()`.

- [ ] **Rota pública recusa antes do provedor**
  `POST /contact`, com o canal ativo e um corpo acima do teto, responde `413 VALIDATION_FAILED` sem chamar o
  `sendEmail`. Com o canal inativo, continua `503 CONTACT_UNAVAILABLE` sem ler o corpo. Uma mensagem de 5001
  caracteres (dentro do teto de bytes, fora do Zod) continua `400 VALIDATION_FAILED`.

- [ ] **Webhook e upload não mudam**
  `POST /webhooks/payments` continua lendo o corpo cru com `request.text()`, sem teto nosso, e
  `POST /files` continua aceitando arquivo de até 4 MiB com o teto próprio de `file.schema.ts`. As suítes
  `paymentsWebhookRoute.test.ts`, `fileUploadRoute.test.ts` e `uploadedImageValidation.test.ts` passam sem
  alteração.

- [ ] **Nenhum chamador quebra**
  Os 22 handlers seguem com as suítes verdes sem edição, incluindo as das outras duas tarefas da PR. Nenhum
  arquivo de rota é editado.

- [ ] **Sem copy nova**
  `VALIDATION_FAILED` já existe em `apiErrors` nos 3 idiomas, então o teste de paridade de i18n não muda. Um
  cliente que receba o 413 mostra "Dados inválidos." / "Invalid data." / "Datos no válidos.".

- [ ] **Documentação conferida contra o código**
  O `docs/SECURITY.md` descreve o teto, as duas camadas, as rotas fora e os tetos da plataforma. A frase da
  `:160` passa a dizer dez das treze rotas de `/account` fora do rate limit, com a lista atual.

## 10. Blueprint técnico

### 10.1 `apps/api/(shared)/lib/parse-request-json.ts`, pseudo-diff

```ts
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";

const BYTES_PER_KIB = 1024;
export const REQUEST_JSON_MAX_BYTES = 100 * BYTES_PER_KIB;

type ParsedJson =
    | { ok: true; value: unknown }
    | { ok: false; response: Response };

const refuse = (status: number): ParsedJson => ({
    ok: false,
    response: Response.json({ error: { code: "VALIDATION_FAILED" } }, { status }),
});

const exceedsDeclaredLength = (req: Request): boolean => {
    const declared = Number(req.headers.get("content-length"));
    return Number.isFinite(declared) && declared > REQUEST_JSON_MAX_BYTES;
};

/** `null` once the stream passes the cap; the rest of it is never read. */
async function readCapped(
    body: ReadableStream<Uint8Array>
): Promise<Uint8Array | null> {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) {
            return Buffer.concat(chunks);
        }
        total += value.byteLength;
        if (total > REQUEST_JSON_MAX_BYTES) {
            await reader.cancel();
            return null;
        }
        chunks.push(value);
    }
}

/**
 * Parses JSON body for POST/PUT handlers; returns a consistent 400 on invalid JSON
 * and 413 past the cap, measured before the body is parsed.
 */
export async function parseRequestJson(req: Request): Promise<ParsedJson> {
    if (exceedsDeclaredLength(req)) {
        return refuse(HTTP_STATUS.PAYLOAD_TOO_LARGE);
    }
    try {
        if (!req.body) {
            return refuse(HTTP_STATUS.BAD_REQUEST);
        }
        const bytes = await readCapped(req.body);
        if (!bytes) {
            return refuse(HTTP_STATUS.PAYLOAD_TOO_LARGE);
        }
        return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
    } catch {
        return refuse(HTTP_STATUS.BAD_REQUEST);
    }
}
```

Pontos de atenção para o `/develop`:

- O formato do retorno não muda; os 22 chamadores continuam com `if (!parsedBody.ok) return parsedBody.response`.
- O comentário de `readCapped` e o do helper são candidatos a sair se o nome bastar
  (`.claude/rules/code-comments.md`). O comentário do topo do arquivo já existe; atualize, não acrescente outro.
- O Biome pode reclamar do `for (;;)`; `while (true)` é a alternativa. `Buffer` global sem import já é o
  padrão da API (`(shared)/lib/pagination.ts:30`, `(shared)/validation/file.schema.ts:74`).
- Não toque em `file.schema.ts`. O `exceedsDeclaredLength` de lá tem o mesmo formato com outro teto;
  unificar seria refatoração fora da tarefa.

### 10.2 Exemplos

```http
POST /auth/sign-in
content-type: application/json
content-length: 5000000

→ 413
{ "error": { "code": "VALIDATION_FAILED" } }
```

```http
POST /contact
content-type: application/json
transfer-encoding: chunked

<120 000 bytes>

→ 413
{ "error": { "code": "VALIDATION_FAILED" } }
```

```http
POST /contact
content-type: application/json

{"name":"Ana","email":"a@example.com","message":"oi"}

→ 200 { "data": { "sent": true } }   (sem mudança)
```

### 10.3 Testes

Arquivos e casos na §7. Nomes em inglês, no estilo dos arquivos vizinhos (`describe("parseRequestJson", …)`).

### 10.4 i18n

Nenhuma chave nova. `VALIDATION_FAILED` em `packages/internationalization/translations/packages/shared/utils.ts:95`
(pt-br), `:242` (en), `:390` (es).

### 10.5 Documentação: `docs/SECURITY.md`

**a) Subseção nova**, depois da `:170` (último item de "Limite de requisições") e antes de `## Pagamentos (Stripe)`
(`:172`):

```markdown
### Tamanho do corpo

O `parseRequestJson` (`apps/api/(shared)/lib/parse-request-json.ts`), que lê o corpo JSON de todas as rotas
que recebem JSON, recusa acima de **100 KiB** com `413 VALIDATION_FAILED` antes do `JSON.parse` e do Zod.
`content-length` declarado acima do teto é recusado sem ler o corpo; sem o header, ou com um valor menor que
o real, o helper conta os bytes enquanto lê e cancela a leitura ao passar do teto. O maior corpo legítimo de
hoje é o de criação de entidade, ~74 KB no pior caso de escape.

Duas rotas leem o corpo por fora: `/webhooks/payments`, que precisa dos bytes crus para conferir a
assinatura da Stripe, e `/files`, que tem teto próprio de 4 MiB (`file.schema.ts`).

O teto limita o que o handler acumula e parseia, não o que a plataforma recebe. Na Vercel, corpo acima de
4,5 MB é recusado antes do handler e sem `error.code`. No `next start`, o proxy faz o Next guardar até 10 MiB
de qualquer corpo (`experimental.proxyClientMaxBodySize`) e truncar o resto. Uma rota nova que leia o corpo
sem o helper fica sem teto.
```

**b) Correção da `:160`**, medida em 2026-10-19 com `find "apps/api/app/(routes)/account" -name route.ts`
(13 arquivos) contra `apps/api/proxy.ts:53-67` (3 caminhos de `/account`):

```diff
-⚠️ **Casamento exato significa que rota nova nasce sem limite.** Sete das dez rotas de `/account` (contadas em 2026-09-30) não estão na lista: o perfil, a troca de senha, o avanço do onboarding e as quatro de sessões (`/account/sessions`, `/account/sessions/[id]`, `/account/sessions/revoke` e `/account/sessions/revoke-others`). A exportação de dados, a exclusão de conta e o pedido de troca de e-mail estão. Quem acrescentar um endpoint sensível precisa acrescentá-lo ali também.
+⚠️ **Casamento exato significa que rota nova nasce sem limite.** Dez das treze rotas de `/account` (contadas em 2026-10-19) não estão na lista: o perfil, a troca de senha, a definição da primeira senha (`/account/password/set`), o avanço do onboarding, as quatro de sessões (`/account/sessions`, `/account/sessions/[id]`, `/account/sessions/revoke` e `/account/sessions/revoke-others`) e as duas de métodos de login (`/account/sign-in-methods/linked` e `/account/sign-in-methods/[id]`). A exportação de dados, a exclusão de conta e o pedido de troca de e-mail estão. Quem acrescentar um endpoint sensível precisa acrescentá-lo ali também.
```

A `:12` ("Métodos de login") é da tarefa `password-unlink-email-restore` e não é tocada. A linha de `/contact`
na tabela da `:28` também fica como está; a subseção nova cobre o teto de todas as rotas.

### 10.6 Ordem de implementação e de commit

Propostos ao `/review`, que monta o plano final da PR com as outras duas tarefas:

1. `fix(api): cap JSON request bodies before parsing`: `parse-request-json.ts`, `parseRequestJson.test.ts`,
   o caso novo de `contactRoute.test.ts`.
2. `docs: document the request body cap and recount account routes`: `docs/SECURITY.md` (só a subseção nova e
   a `:160`).
3. `docs(features): request-body-size-limit`: o diretório desta feature, no último commit de artefatos.

Arquivos das outras tarefas que este plano **não** toca: `auth/sign-in/google/route.ts`, `auth.schema.ts`,
`authSignInGoogle*.test.ts`, `account/sign-in-methods/[id]/route.ts`, `accountSignInMethodsRoute.test.ts`,
`docs/SECURITY.md:12`, `docs/features/google-sign-in-error-contract/`,
`docs/features/password-unlink-email-restore/`, `specs/`.

### 10.7 Env e configuração

Nenhuma variável nova e nenhuma mudança no `next.config.ts`.

## Pré-requisitos manuais de infra

Nenhum. O teto é código, vale em dev, `next start` e Vercel sem configuração. Nada vai para o
`docs/PRE-PRODUCTION.md`.

## 11. Perguntas em aberto (decididas pela rodada autônoma)

1. **Qual `error.code` no 413?**
   - Opções: (a) reaproveitar `VALIDATION_FAILED`; (b) código novo `REQUEST_BODY_TOO_LARGE` nos 3 idiomas;
     (c) reaproveitar `UPLOAD_FILE_TOO_LARGE`.
   - **Adotada: (a).** Nenhum cliente legítimo chega ao teto (§5), então ninguém vê a mensagem; o status 413 já
     separa o caso para quem integra e para o log de acesso. É o menor raio de impacto: zero chave de i18n e
     paridade intacta. (c) foi descartada porque a copy fala de arquivo de 4 MB. (b) vale a pena se um fork
     tiver cliente que monte corpo grande e precise de mensagem própria.

2. **Teto global de 100 KiB ou menor para as rotas públicas?**
   - Opções: (a) 100 KiB para todas; (b) 16 KiB para as públicas e 100 KiB para as guardadas.
   - **Adotada: (a).** A maior rota pública (`/contact`) chega a ~33 KB no pior caso de escape, então um teto
     menor exigiria override por rota e só economizaria ~70 KB de parse por requisição, já sob rate limit.

3. **Override por chamador?**
   - Opções: (a) `parseRequestJson(req, { maxBytes })` desde já; (b) só a constante exportada, sem parâmetro.
   - **Adotada: (b).** Nenhum dos 22 chamadores precisa de mais (§4.2). Parâmetro sem segundo caso de uso é
     abstração antecipada; acrescentá-lo depois é uma mudança de uma linha que não quebra ninguém.

4. **Registrar a recusa em log?**
   - Opções: (a) `logEvent("security", "body-too-large", …)`; (b) não registrar.
   - **Adotada: (b).** O helper não registra o 400 de JSON inválido hoje, e o proxy já registra os bloqueios que
     importam (`proxy.ts:74-85`). Um evento novo pediria o `requestId` dentro do helper, que não tem acesso a ele
     sem mudar a assinatura.

## 12. Decisões tomadas sem perguntar

| decisão | adotada | descartada e por quê |
|---------|---------|----------------------|
| Onde corrigir | no `parseRequestJson`, a raiz comum dos 22 handlers | no `proxy.ts`: só enxerga `content-length` sem ler o stream, e precisaria de exceção por caminho para upload e webhook; numa rota só: é o que a revisão da PR #49 recusou |
| Mecanismo | (c), header e stream | (a) só header: o cliente omite ou mente; (b) só stream: lê 100 KiB à toa quando o cliente já declarou 5 MB |
| Webhook | fora | precisa do corpo cru e o tamanho é decidido pela Stripe; um teto nosso perderia evento |
| Upload | fora, sem tocar no `file.schema.ts` | já tem teto próprio de 4 MiB; passar pelo helper quebraria todo upload; unificar o `exceedsDeclaredLength` seria refatoração fora da tarefa |
| Leitura do stream | `getReader()` + laço | `for await`: o `lib` do `tsconfig` não tem `DOM.AsyncIterable`; dependência nova (`raw-body`): proibida pela política |
| `proxyClientMaxBodySize` do Next | não mexer | muda o proxy de todas as rotas, inclusive upload, e não vale na Vercel |
| `email` sem `.max()` em `user-admin.schema.ts:8` | não corrigir aqui | rota de admin, já coberta pelo teto global; vira achado para o `/spec --sync` |

## 13. Riscos

- **Corpo legítimo acima de 100 KiB num fork.** Um fork que aumente `DESCRIPTION_MAX` ou crie rota com lista
  grande passa a receber 413. O sintoma é claro (status 413) e o remédio é o override da pergunta 3 ou subir a
  constante. A subseção do `SECURITY.md` registra o teto e o motivo.
- **`Buffer.concat` com muitos pedaços pequenos.** Limitado a 100 KiB, o custo é desprezível.
- **Diferença sutil de decodificação.** O `TextDecoder` padrão é o mesmo algoritmo do `req.json()`; o caso
  multibyte partido está na §7.1 para pegar regressão.
- **Testes das outras tarefas da PR.** Passam pelo helper com corpo pequeno e não devem mudar; a §7.4 manda
  rodar a suíte inteira da `apps/api` para confirmar.
