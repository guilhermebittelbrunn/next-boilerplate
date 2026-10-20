# Relatório de QA: teto de bytes no corpo JSON da API

- **Data:** 2026-10-19 22:53
- **Branch:** `guilhermebittelbrunn/cycle-command-v5`, não protegida. Fora do padrão de nome; o `/review` propôs
  `api/fix/google-sign-in-unlink-restore-body-cap`, a aplicar só com aprovação do usuário. Nenhum commit, nenhuma
  branch criada.
- **Ambiente:** Node 22.13.0, Next 16.0.0, JDK 21.0.12 (`/opt/homebrew/opt/openjdk@21`) para o `test:emulator`.
- **Veredito (rodada 2, 2026-10-19 23:19):** `blocked`. A correção do D1 funciona: zero `unhandledRejection` em
  todos os 413, inclusive na rajada de 51, e o CA11 passa. A rodada 2 achou o D2: depois do 413 da camada do
  stream, o servidor deixa a conexão aberta, com o resto do corpo parado na fila do socket, até o `requestTimeout`
  do Node (reset aos 327 s). O D2 já existia na rodada 1 com o `cancel()`, que eu não medi naquela hora, e não
  existe no helper de `HEAD`. CA13 ❌, CA12 🔒, os outros onze ✅. Detalhes na seção "Rodada 2", no fim.
- **Veredito (rodada 1):** `blocked`. Dez dos doze critérios passaram. O CA11 falhou: todo 413 da camada do
  stream deixava um `unhandledRejection: AbortError` no log do `next-server`, e esse efeito vinha do diff (o
  helper de `HEAD` não o produz). O CA12 fica 🔒 por depender da plataforma, como o plano já previa.

## Por que não houve browser

O diff só toca `apps/api`, `apps/api/CLAUDE.md` e `docs/SECURITY.md`. Não há tela, texto de UI nem `error.code`
novo, então o `agent-browser` não teria o que percorrer. Em compensação, a api subiu de verdade (`next build` +
`next start`), porque o comportamento sob teste depende de como o Next entrega o corpo ao handler, coisa que o
`Request` montado à mão do teste unitário não alcança.

## Verificar no `/test`: veredito por item

| item do `review.md` | veredito | o que foi medido |
|---------------------|----------|------------------|
| Números do `/develop`: 106 arquivos, 1367 testes; 6 falhas e 29 passando com o helper de `HEAD` | **confirmado** | Com o helper de `HEAD` no lugar, `parseRequestJson.test.ts` + `contactRoute.test.ts` deram `Tests 6 failed \| 29 passed (35)`; os seis são os listados no handoff. `shasum` do arquivo: `634ddd5b…` antes, `7c8dce7f…` (`HEAD`) durante a troca, `634ddd5b…` depois. A suíte da api deu 106 arquivos e 1367 testes antes do caso novo deste `/test`, e 1368 depois. |
| Teto no servidor real, passando pelo `proxy.ts` | **confirmado** | 120 000 bytes com `content-length` → `413 VALIDATION_FAILED`. 120 000 bytes em chunked → 413. 50 000 bytes, nos dois modos → `400 VALIDATION_FAILED` do Zod (senha acima do máximo). Tabela completa abaixo. |
| O `cancel()` para a leitura do socket? | **confirmado, com efeito colateral** | Para: depois do 413, um cliente que respeita backpressure ficou parado em 851 968 bytes escritos por 15 s, sem erro, mandando 30 MB. Com o helper de `HEAD`, os 5 MB passam inteiros (5 243 567 bytes enviados). Memória: 50 corpos de 5 MB em chunked seguidos, todos 413 em cerca de 1 s; o RSS do processo foi de 289 088 KB para 219 824 KB, sem crescer. Efeito colateral: cada cancelamento gera um `unhandledRejection` no `next-server` (defeito D1). |
| 🔒 Vercel acima de 4,5 MB e truncamento em 10 MiB | **🔒 não verificável** | Comportamento da plataforma, sem infra aqui. Nenhum dos dois muda com o diff. |

### Teto medido no `next start`

A api foi construída com `pnpm --filter api build` e servida com `next start -p 3002`, com `CORS_ORIGIN` definido
só no processo, porque o `instrumentation.ts` recusa subir em produção sem ele. Sem `ARCJET_KEY`, o rate limit do
`proxy.ts` estava desligado e não interferiu. As requisições saíram do `curl`, em sequência, e o `curl -v`
confirmou o header enviado em cada uma.

| rota | corpo | envio | status | `error.code` | tempo |
|------|-------|-------|--------|--------------|-------|
| `/auth/sign-in` | 120 000 B | `Content-Length: 120000` | 413 | `VALIDATION_FAILED` | 10 ms |
| `/auth/sign-in` | 120 000 B | `transfer-encoding: chunked` | 413 | `VALIDATION_FAILED` | 7 ms |
| `/auth/sign-in` | 50 000 B | `Content-Length` | 400 | `VALIDATION_FAILED` (Zod) | 7 ms |
| `/auth/sign-in` | 50 000 B | chunked | 400 | `VALIDATION_FAILED` (Zod) | 6 ms |
| `/auth/sign-up` | 50 000 B, senha de 1 caractere | `Content-Length` | 400 | `AUTH_PASSWORD_TOO_SHORT` | 6 ms |
| `/auth/sign-up` | 50 000 B, senha de 1 caractere | chunked | 400 | `AUTH_PASSWORD_TOO_SHORT` | 5 ms |
| `/auth/sign-up` | 102 400 B, senha de 1 caractere | `Content-Length` | 400 | `AUTH_PASSWORD_TOO_SHORT` | 74 ms |
| `/auth/sign-up` | 102 400 B, senha de 1 caractere | chunked | 400 | `AUTH_PASSWORD_TOO_SHORT` | 5 ms |
| `/auth/sign-up` | 102 401 B | `Content-Length` | 413 | `VALIDATION_FAILED` | 3 ms |
| `/auth/sign-up` | 102 401 B | chunked | 413 | `VALIDATION_FAILED` | 5 ms |
| `/auth/sign-in` | sem corpo | - | 400 | `VALIDATION_FAILED` | 4 ms |
| `/auth/sign-in` | `{not json` | `Content-Length: 9` | 400 | `VALIDATION_FAILED` | 3 ms |
| `/auth/sign-in` | `{}` declarando `content-length: 200000` | 2 de 200 000 bytes enviados | 413 | `VALIDATION_FAILED` | 16 ms |
| `/auth/sign-in` | `{}` declarando `content-length: 102400` (controle) | 2 de 102 400 bytes enviados | sem resposta | - | timeout de 5 s |

O `/auth/sign-up` entrou na tabela porque o código `AUTH_PASSWORD_TOO_SHORT` só sai depois do `JSON.parse` e do
Zod. Ele prova que o corpo de 102 400 bytes foi lido inteiro e parseado nos dois modos, coisa que o
`VALIDATION_FAILED` do `/auth/sign-in` não distingue de uma falha de parse.

As duas últimas linhas medem a camada 1 sem ambiguidade. Com 200 000 declarados, a resposta sai em 16 ms com só
2 bytes recebidos: o helper recusou sem esperar o corpo. Com 102 400 declarados (dentro do teto), a mesma
requisição fica pendurada até o timeout, porque o helper passa a esperar os bytes prometidos.

O provedor não foi chamado em nenhum caso: os 413 saem do helper antes do Zod, e os 400 saem do Zod, que vem
antes de `identitySignInWithPassword` em `auth/sign-in/route.ts`. Nenhuma requisição chegou ao Identity Toolkit
e nenhuma conta foi criada.

### Linha de base com o helper de `HEAD`

Para separar o efeito do diff, pus o helper de `HEAD` no lugar, reconstruí a api e repeti as mesmas requisições:

| corpo | envio | status | bytes enviados | tempo | log do servidor |
|-------|-------|--------|----------------|-------|-----------------|
| 120 000 B | chunked | 400 (Zod) | 120 021 | 490 ms | limpo |
| 5 MiB | chunked | 400 (Zod) | 5 243 567 | 352 ms | limpo |
| 120 000 B | `Content-Length` | 400 (Zod) | 120 000 | - | limpo |

Antes do diff, os 5 MiB eram lidos, decodificados e parseados até o Zod recusar. Depois do diff, a resposta sai
em 17 ms e o cliente para de enviar. O arquivo voltou ao estado do working tree (`shasum` `634ddd5b…`) e a api foi
reconstruída com ele.

## Defeito encontrado

### D1. Cada 413 da camada do stream deixa um `unhandledRejection` no log do servidor (🟡, CA11)

**Repro:**

1. `pnpm --filter api build`, depois `CORS_ORIGIN=http://localhost:3000 next start -p 3002` em `apps/api`.
2. Corpo de 120 000 bytes em chunked:
   `cat corpo-120k.json | curl -X POST localhost:3002/auth/sign-in -H 'content-type: application/json' -H 'transfer-encoding: chunked' --data-binary @-`
3. A resposta é a esperada (`413 VALIDATION_FAILED`), mas o log do processo ganha:

   ```
   Error [AbortError]: The operation was aborted
       at ignore-listed frames {
     code: 'ABORT_ERR'
   }
    ⨯ unhandledRejection:  Error [AbortError]: The operation was aborted
   ```

**Medido:** uma rejeição por requisição, em todos os 413 da camada 2 (102 401 B, 120 000 B e 5 MiB em chunked;
51 em 51 numa rajada). Nenhuma nos 413 da camada 1, nos 400 nem no `GET /health`. Com o helper de `HEAD`, nenhuma.
Com um preload que imprime a stack inteira, a origem é o iterador assíncrono de um `Readable` do Node destruído
quando o cancelamento se propaga:

```
AbortError: The operation was aborted
    at Object.destroyer (node:internal/streams/destroy:328:11)
    at createAsyncIterator (node:internal/streams/readable:1401:19)
```

A rejeição nasce dentro do Next e do Node, não na promessa do helper: o `reader.cancel().catch(() => null)` trata a
dele. Uma sonda fora do Next (`Request` com `PassThrough` como corpo, mesmo `cancel()`) não reproduz, então o
efeito depende de como o Next 16 encadeia o corpo quando existe `proxy.ts`. O ✅ do `review.md` ("`cancel()` com
`.catch` não deixa rejeição solta") vale para o código do helper e não vale para o processo.

**Impacto:** o processo não cai. O `NextNodeServer` instala um handler de `unhandledRejection` para não derrubar o
processo (`next/dist/server/next-server.js:194`), e o servidor seguiu respondendo `/health` 200 depois de 51
rejeições. O custo é log de erro: duas entradas por requisição, sem stack útil, que qualquer pessoa sem credencial
gera à vontade nas rotas públicas quando o rate limit está desligado. O ruído também atrapalha a leitura de erros
reais e não passa pelo `onRequestError` do `instrumentation.ts`.

**Correção sugerida, medida:** trocar `reader.cancel().catch(() => null)` por `reader.releaseLock()` no
`readCapped`. Com essa variante construída e servida do mesmo jeito: 120 000 B em chunked → 413; 5 MiB em chunked →
413 em 5 ms; o cliente com backpressure parou de novo em 851 968 bytes; zero `unhandledRejection` no log. O caso
"cancels a stream that passes the cap instead of draining it" do `parseRequestJson.test.ts` afirma que o `cancel`
da fonte foi chamado, então teria de passar a afirmar só que o stream não foi drenado. O caso "still answers 413
when cancelling the stream throws" perde o objeto. A variante não foi aplicada: o arquivo voltou ao estado do
working tree. Decidir entre corrigir e aceitar o ruído de log é do `/develop`.

## Cobertura

### Comandos e resultados

| comando | resultado |
|---------|-----------|
| `cd apps/api && NODE_ENV=test npx vitest run __tests__/parseRequestJson.test.ts __tests__/contactRoute.test.ts` com o helper de `HEAD` | `Tests 6 failed \| 29 passed (35)` antes do caso novo; `7 failed \| 29 passed (36)` depois |
| o mesmo, só `contactRoute.test.ts`, com o helper do working tree | `Tests 23 passed (23)` |
| `pnpm --filter api test` | `Test Files 106 passed (106)`, `Tests 1368 passed (1368)` |
| `pnpm --filter api typecheck` | exit 0 |
| `pnpm check` | `Checked 937 files`, sem correções |
| `pnpm test` (raiz, sem `--force`, JDK 21 no `PATH`) | exit 0, `Tasks: 15 successful, 15 total`, `Cached: 13 cached`, 28,9 s |

`pnpm test` por workspace: api 1368, `api:test:emulator` 191, app 924, web 169, `@repo/internationalization` 67,
`@repo/shared` 56, `@repo/next-config` 32, `@repo/payments` 22, `@repo/security` 45, e2e 16, `@repo/auth` 132,
`@repo/email` 205, `@repo/sdk` 11, `@repo/design-system` 171, `@repo/analytics` 34. Todos verdes. Não houve motivo
para suspeitar do cache; as duas tasks que rodaram de fato foram `api:test` (o arquivo de teste mudou) e
`api:test:emulator` (nunca usa cache).

A paridade de i18n não precisava rodar, porque nenhum arquivo de `packages/internationalization` mudou; ela entrou
no `pnpm test` da raiz (67/67, do cache).

As suítes das outras duas tarefas da PR (`authSignInGoogleRoute.test.ts`, `authSignInGoogleToolkit.test.ts`,
`accountSignInMethodsRoute.test.ts`) estão dentro dos 1368 e continuam verdes.

### Teste criado

`apps/api/__tests__/contactRoute.test.ts`, no `describe("POST /contact validation")`:
`it("refuses a declared length over the cap without reading the body")`. Um `Request` real com
`content-length: 102401` e o corpo válido de sempre responde `413 VALIDATION_FAILED`, `bodyUsed` continua `false`
e o `sendEmail` não é chamado. Passa com o helper do working tree e falha com o de `HEAD`. Fecha a lacuna "nenhum
teste de rota com `content-length` declarado".

### Decisões de custo de teste

| módulo | decisão |
|--------|---------|
| `parse-request-json.ts` | Os 13 casos unitários já cobrem as duas camadas, o limite, a decodificação e o 400. Nenhum caso novo de helper. |
| `/contact` | Um caso unitário novo, com `Request` real, para a camada 1 numa rota pública. É o teste mais barato que prova o repasse do 413 sem ler o corpo. |
| Servidor do Next | Medição manual com `next start`, sem teste automatizado. A infra é o objeto aqui (como o Next entrega o corpo, se o cancelamento para o socket), e o D1 só aparece no processo real. Um teste da faixa cara para isso exigiria build e servidor de pé no CI; fica como sugestão se o D1 for corrigido e alguém quiser fixar a ausência de rejeição. |
| Webhook e upload | Sem teste novo: as três suítes existentes passam sem alteração e nenhum dos dois arquivos mudou. |

## Critérios de aceite: status por item

| critério | status | meio |
|----------|--------|------|
| CA1. Corpo declarado acima de 100 KiB é recusado sem ser lido | ✅ | unit (helper), rota (`/contact`, teste novo), servidor real (200 000 declarados, 2 bytes enviados, 413 em 16 ms; controle pendurado) |
| CA2. Corpo sem `content-length` é medido enquanto é lido | ✅ | unit (stream cancelado, `content-length` que mente), servidor real (chunked 102 401 B, 120 000 B e 5 MiB → 413; leitura para em 0,8 MiB; RSS estável em 50 × 5 MiB) |
| CA3. O limite é inclusivo | ✅ | unit, servidor real (102 400 B chega ao Zod nos dois modos, 102 401 B → 413) |
| CA4. JSON inválido e corpo ausente mantêm o comportamento anterior | ✅ | unit (sem corpo, malformado, já consumido), rota (`paymentsPortalRoute.test.ts`, "aceita a requisição sem corpo"), servidor real (sem corpo e `{not json` → 400) |
| CA5. Decodificação igual à do `req.json()` | ✅ | unit (BOM, `é` partido entre pedaços, byte inválido) |
| CA6. Rota pública recusa antes do provedor | ✅ | rota (`contactRoute.test.ts`: 413 pelo tamanho contado e pelo declarado, sem `sendEmail`; 503 sem ler o corpo; 5001 caracteres → 400) |
| CA7. Webhook e upload não mudam | ✅ | suítes `paymentsWebhookRoute`, `fileUploadRoute` e `uploadedImageValidation` verdes; `git diff` vazio nas três e nas rotas |
| CA8. Nenhum chamador quebra | ✅ | api 1368/1368; `grep -rn "parseRequestJson(" apps/api/app` dá 22; as duas rotas alteradas no working tree são das outras tarefas |
| CA9. Sem copy nova | ✅ | paridade 67/67; `VALIDATION_FAILED` em `utils.ts:95`, `:242` e `:390`; leitura de `formattedError.ts:60-87`, que traduz pelo `error.code` sem consultar o status |
| CA10. Documentação conferida contra o código | ✅ | leitura do diff de `docs/SECURITY.md`; `find "apps/api/app/(routes)/account" -name route.ts \| wc -l` dá 13; `proxy.ts` lista 3 de `/account`; 22 handlers |
| CA11. Recusa pelo stream não deixa erro não tratado no servidor | ❌ | servidor real: um `unhandledRejection: AbortError` por 413 da camada 2 (D1) |
| CA12. Tetos da plataforma | 🔒 | depende da Vercel e do comportamento do Next acima de 10 MiB; sem infra |

Sobre o CA10: o `docs/SECURITY.md` diz que, no `next start`, o Next guarda "até 10 MiB" de qualquer corpo. A
medição mostra que, com o teto, a leitura para perto de 0,8 MiB depois do 413. A frase continua correta como
limite superior da plataforma e não precisa mudar.

## Lacunas herdadas

| lacuna | origem | veredito |
|--------|--------|----------|
| Nenhum teste de rota com `content-length` declarado | handoff, review | **fechada** com o caso novo em `contactRoute.test.ts` |
| Dublês de `Request` sem `body` em 13 arquivos não passam pelo teto | handoff, review (🟢) | **continua aberta**, fora de escopo; item de backlog já registrado no `review.md` |
| Teto e cancelamento no servidor do Next | handoff, review | **fechada** pela medição no `next start`, que abriu o D1 |
| Vercel e truncamento em 10 MiB | plano §8, review | **continua aberta** como 🔒, depende da plataforma |

## Ambiente do e2e

- Portas 3000, 3001, 3002, 3003, 9099, 8080 e 4001 livres antes de começar; nada do usuário foi reutilizado.
- A api subiu quatro vezes na 3002, sempre com `next start` e PID guardado: o build do working tree, o mesmo build
  com um preload de diagnóstico em `/tmp`, o build com o helper de `HEAD` e o build com a variante `releaseLock()`.
  Cada processo foi encerrado pelo PID antes do seguinte.
- O emulador não subiu; nenhum fluxo precisava de Firestore ou Auth.
- Depois do último `kill`, `lsof -ti tcp:<porta>` saiu vazio nas sete portas.
- O `.next` de `apps/api` foi reconstruído no fim com o código do working tree, para não ficar com o build de uma
  das variantes.
- Corpos de teste, scripts de cliente e logs ficaram em `/tmp` e foram apagados no fim.

## Estado de dev alterado

Nenhum. Nenhuma requisição chegou ao Firebase, nenhuma conta foi criada e nenhum dado de QA ficou em projeto
real. O e-mail `qa-body-cap@example.com` aparece só dentro dos corpos de teste, recusados antes do provedor.

## Cross-check

- `apps/app` × `apps/web`: nenhum formulário dos dois chega perto de 100 KiB; o 413 aparece como "Dados
  inválidos." pelo `FormattedError`. Não exercitado no browser, porque o diff não tem UI.
- Comum × admin × personificação × não autenticado: o helper roda depois do guard e trata todos igual.
- `subscription` × `simple`: sem efeito.
- Rotas fora do helper: `/webhooks/payments` e `/files`, cada uma com o seu teto.

## Arquivos alterados por este `/test`

- `apps/api/__tests__/contactRoute.test.ts`: um caso novo.
- `docs/features/request-body-size-limit/test/criterios-aceite.md`, `test/report.md` e `STATE.md`.

## Rodada 2

O `/review` trocou `reader.cancel().catch(() => null)` por `reader.releaseLock()` no `readCapped`
(`parse-request-json.ts:37-39`, `shasum` `e2cbba76…`), reescreveu dois testes do helper e ajustou a frase do
`docs/SECURITY.md:174`. Mesmo método da rodada 1: `pnpm --filter api build`, `next start -p 3002` com
`CORS_ORIGIN` só no processo, PID guardado, `curl` e um cliente Node em sequência.

### D1: corrigido

| caso | status | `unhandledRejection` no log |
|------|--------|-----------------------------|
| 120 000 B em chunked | 413 `VALIDATION_FAILED`, 4 ms | 0 |
| 102 401 B em chunked | 413 `VALIDATION_FAILED`, 5 ms | 0 |
| 5 MiB em chunked | 413 `VALIDATION_FAILED`, 3 ms | 0 |
| rajada de 51 × 5 MiB em chunked | 51 × 413 | 0 |
| mais três rajadas de 50 × 5 MiB | 150 × 413 | 0 |

Ao fim da rodada, o log não tinha nenhuma linha `unhandledRejection` nem `AbortError`, e o `/health` respondia 200.

Com o `cancel().catch()` de volta no lugar, os dois testes reescritos falham (`Tests 2 failed | 11 passed (13)`:
"stops reading a stream that passes the cap instead of draining it" e "releases the stream past the cap without
cancelling it"), o que confirma a afirmação do `review.md`. O `shasum` voltou a `e2cbba76…` depois da troca.

### Sem regressão nos outros caminhos

| rota | corpo | envio | status | `error.code` |
|------|-------|-------|--------|--------------|
| `/auth/sign-in` | 120 000 B | `Content-Length` | 413 | `VALIDATION_FAILED` |
| `/auth/sign-in` | `{}` declarando 200 000 | 2 bytes enviados | 413 em 2 ms | `VALIDATION_FAILED` |
| `/auth/sign-in` | 5 MiB | `Content-Length: 5242880` | 413 | `VALIDATION_FAILED` |
| `/auth/sign-in` | 50 000 B | `Content-Length` e chunked | 400 | `VALIDATION_FAILED` (Zod) |
| `/auth/sign-up` | 50 000 B, senha de 1 caractere | `Content-Length` e chunked | 400 | `AUTH_PASSWORD_TOO_SHORT` |
| `/auth/sign-up` | 102 400 B, senha de 1 caractere | `Content-Length` e chunked | 400 | `AUTH_PASSWORD_TOO_SHORT` |
| `/auth/sign-up` | 102 401 B | `Content-Length` e chunked | 413 | `VALIDATION_FAILED` |
| `/auth/sign-in` | sem corpo | - | 400 | `VALIDATION_FAILED` |
| `/auth/sign-in` | `{not json` | `Content-Length: 9` | 400 | `VALIDATION_FAILED` |

Os mesmos resultados da rodada 1, nenhuma rejeição no log em nenhum deles.

### A leitura para, e a conexão fica aberta

O cliente Node que respeita backpressure, mandando 30 MB em chunked, recebeu o 413 aos 187 ms com 851 968 bytes
escritos, os mesmos da rodada 1. Depois disso não escreveu mais nenhum byte. O socket só fechou aos 327 126 ms, com
`ECONNRESET` vindo do servidor. Os 327 s batem com o `requestTimeout` padrão do Node (300 s) mais o intervalo de
checagem de conexões.

### D2. A conexão recusada pelo teto fica aberta até o `requestTimeout` (🟡, CA13)

O helper para de ler, mas nada fecha a conexão. O resto do corpo fica parado na fila do socket do servidor, e o
cliente não consegue terminar de enviar. Isso vale até para o `curl`, que sai logo depois de receber o 413: o
kernel do cliente segura o socket em `FIN_WAIT_1` com o resto do envio na fila.

**Repro:**

1. `pnpm --filter api build`, depois `CORS_ORIGIN=http://localhost:3000 next start -p 3002` em `apps/api`.
2. Cinquenta vezes: `cat corpo-5mib.json | curl -X POST localhost:3002/auth/sign-in -H 'content-type: application/json' -H 'transfer-encoding: chunked' --data-binary @-`
3. `lsof -nP -a -p <pid> -iTCP | grep -c ESTABLISHED` e `netstat -anp tcp | grep '\.3002 '`.

**Medido:**

| versão do helper | 50 × 5 MiB em chunked | conexões abertas 2 s depois | 60 s depois |
|------------------|-----------------------|-----------------------------|-------------|
| `HEAD` (lê o corpo inteiro) | 50 × 400 | 0 | - |
| rodada 1, `cancel().catch()` | 50 × 413 | 46 ESTABLISHED + 4 CLOSE_WAIT | 46 |
| rodada 2, `releaseLock()` | 50 × 413 | 43, 42, 34 e 33 novas a cada rajada (51 + 3 × 50) | todas, até perto dos 300 s |

Com o `releaseLock()`, quatro rajadas seguidas (201 requisições) deixaram 152 conexões ESTABLISHED mais 50 em
CLOSE_WAIT, cada uma com 400 KB a 980 KB parados na fila de recepção. As CLOSE_WAIT sumiram em cerca de 60 s; as 152
ESTABLISHED ficaram até perto dos 300 s e caíram juntas. O RSS acompanhou: 132 192 KB antes, 154 528 KB depois da
primeira rajada, 189 456 KB depois da quarta, e de volta a cerca de 60 000 KB quando as conexões fecharam. A
memória não vaza; ela fica presa enquanto as conexões existem.

Na rodada 1 eu medi só o RSS (289 088 KB → 219 824 KB) e não contei conexões, então o D2 passou. A tabela mostra
que ele vem do teto em si (parar de ler sem fechar), não da troca do `cancel()` pelo `releaseLock()`.

**Impacto:** cada corpo acima do teto prende um descritor de arquivo e o buffer do kernel por até cerca de
5 minutos, nas rotas públicas e sem credencial quando o rate limit está desligado. Uma pessoa que mande corpos
grandes depressa segura sockets do servidor sem precisar mandar devagar. Prender um socket por 300 s já era
possível no `HEAD` com um cliente lento, então o risco não é novo, mas o teto o deixa mais barato. O helper de
`HEAD` não tinha o problema com cliente rápido porque lia tudo e fechava.

**Correção sugerida, medida:** responder o 413 com `connection: close`. Numa variante em que o `refuse` acrescenta
`headers: { connection: "close" }` quando o status é 413, construída e servida do mesmo jeito: o header chegou ao
cliente (`connection: close` na resposta), 50 × 5 MiB em chunked deram 50 × 413, 0 conexões abertas 2 s depois e
0 `unhandledRejection`. A variante não foi aplicada; o arquivo voltou a `e2cbba76…`. Decidir entre corrigir e
aceitar fica com o `/develop`. Se corrigir, o `docs/SECURITY.md:174` pode dizer que a conexão é encerrada.

### Suítes

| comando | resultado |
|---------|-----------|
| `NODE_ENV=test npx vitest run __tests__/parseRequestJson.test.ts` | `Tests 13 passed (13)` |
| `pnpm --filter api test` | `Test Files 106 passed (106)`, `Tests 1368 passed (1368)` |
| `pnpm test` (raiz, sem `--force`, JDK 21.0.12 no `PATH`) | exit 0, `Tasks: 15 successful, 15 total`, `Cached: 13 cached`, 16,6 s; api 1368, `api:test:emulator` 191, app 924, web 169, i18n 67, os outros workspaces iguais à rodada 1 |

### Critérios na rodada 2

| critério | rodada 1 | rodada 2 | meio |
|----------|----------|----------|------|
| CA1 a CA10 | ✅ | ✅ | mesma matriz remedida no servidor real e suítes verdes |
| CA11. Recusa pelo stream não deixa erro não tratado no servidor | ❌ | ✅ | servidor real: 0 rejeições em 209 requisições acima do teto |
| CA12. Tetos da plataforma | 🔒 | 🔒 | sem infra |
| CA13. Conexão recusada pelo teto é encerrada | - | ❌ | servidor real: conexões abertas até cerca de 300 s (D2) |

O texto do CA2 perdeu a frase sobre a memória do processo, que passou para o CA13: o RSS cresce enquanto as
conexões do D2 existem.

### Ambiente da rodada 2

- Portas 3000 a 3003, 9099, 8080 e 4001 livres antes de começar.
- A api subiu cinco vezes na 3002 com `next start`, sempre com PID guardado e morto antes da seguinte: o código da
  rodada 2, a variante `cancel()`, o `HEAD`, a variante `connection: close` e de novo o código da rodada 2 para o
  cliente com backpressure. Numa das trocas, um `cd` dentro de uma função de shell fez a troca pelo `HEAD` falhar
  e a passada repetir a variante `cancel()`; o arquivo foi restaurado na hora (`shasum` `e2cbba76…`) e o `HEAD` foi
  medido de novo, à parte.
- O `.next` de `apps/api` ficou com o build do código da rodada 2.
- Depois do último `kill`, `lsof -ti tcp:<porta>` saiu vazio nas sete portas. Os arquivos de `/tmp` foram apagados.
- Nenhum dado de QA criado; nenhuma requisição chegou ao Firebase.
