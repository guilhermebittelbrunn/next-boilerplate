# Revisão: teto de bytes no corpo JSON da API

Terceira tarefa da rodada autônoma do `/cycle`, na mesma PR de `google-sign-in-error-contract` e
`password-unlink-email-restore`. A revisão leu o diff, o `develop/handoff.md` e o plano, e não subiu app nem
rodou a suíte.

## Branch

- Atual: `guilhermebittelbrunn/cycle-command-v5`. Não passa no regex do `/review`. Não foi alterada, porque a
  rodada autônoma não cria nem renomeia branch sem aprovação do usuário.
- Nome proposto para a PR das três tarefas: `api/fix/google-sign-in-unlink-restore-body-cap`. O regex de
  `.claude/commands/review.md:115` respondeu `branch OK: api/fix/google-sign-in-unlink-restore-body-cap`. Ele
  substitui o `api/fix/google-sign-in-and-password-unlink` da segunda revisão, que não cobria esta tarefa.
- `api/` porque o código das três tarefas está todo em `apps/api`. A branch atual não tem upstream nem commit
  à frente de `origin/main`, então, aprovado o nome, o caminho é
  `git branch -m api/fix/google-sign-in-unlink-restore-body-cap`.

## Revisão: `parseRequestJson` + testes + `docs/SECURITY.md`

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/api/CLAUDE.md:18` descrevia o helper como "body JSON com resposta 400 padronizada em falha de parse".
  Com o teto, o helper também responde 413. Corrigido: "body JSON com `VALIDATION_FAILED` padronizado: 400 em
  falha de parse, 413 acima de 100 KiB (`REQUEST_JSON_MAX_BYTES`)". Entra no commit `fix(api)` do teto, porque
  o arquivo é de `apps/api` e descreve o helper que o commit muda.

### 🟢 Sugestão / nit

Itens de backlog para o `/spec --sync` registrar. `specs/` não foi editado.

- Os 13 arquivos de teste da api com dublê de `Request` sem `body` (ex.: `accountRoute.test.ts:85-97`) caem
  no ramo `req.json()` do helper e nunca passam pelo teto. Em produção não muda nada, mas um teste de rota
  desses arquivos não consegue provar o 413. Sugestão: migrar os dublês para `new Request(...)` quando alguém
  tocar o arquivo. 🟢.
- `apps/api/(shared)/validation/user-admin.schema.ts:8`: `email` sem `.max()`. O teto de 100 KiB limita o
  estrago, mas os outros schemas usam `EMAIL_MAX = 320`. 🟢.
- `packages/auth/server.ts:334` (`console.error` com o erro cru), registrado na revisão de
  `password-unlink-email-restore`, continua aberto.

### ✅ OK

- Desvio 1, `req.json()` quando não há `body`. Com um `Request` real, `body` é `null` só quando não há corpo.
  Nesse caso `req.json()` lê zero bytes e rejeita, e o `catch` devolve 400, o mesmo de antes. Não existe
  `Request` conforme a especificação com corpo presente e `body` nulo, e um `content-length` declarado acima do
  teto já é recusado antes, na camada 1 (`parse-request-json.ts:51-53`). O único caminho que pula o teto é o
  dublê de teste sem `body` (nit acima). `payments/portal/route.ts:23` testa `req.body` antes de chamar o
  helper, e ler a propriedade não consome o stream.
- Desvio 2, `reader.cancel().catch(() => null)` sem `await` (`:39`). O `.catch` fica preso à promessa na mesma
  linha, então não sobra rejeição não tratada. O cancelamento começa na hora e o helper solta a referência ao
  reader. O caso "still answers 413 when cancelling the stream throws" fixa o 413. Se o cancelamento encerra a
  leitura do socket no servidor do Next não dá para fechar lendo; está em "Verificar no `/test`".
- Decodificação igual à do `req.json()`. A Fetch decodifica UTF-8 tirando o BOM e trocando byte inválido por
  `U+FFFD`; `new TextDecoder()` sem opções faz o mesmo (`fatal: false`, `ignoreBOM: false`). Os pedaços são
  concatenados antes de decodificar (`:33`), então caractere multibyte partido entre pedaços chega inteiro. Os
  casos de BOM e de `é` partido cobrem isso.
- `content-length` inválido ou negativo. `Number("abc")` dá `NaN`, `Number("-5")` dá `-5` e header ausente
  dá `0`; nenhum passa em `Number.isFinite(declared) && declared > REQUEST_JSON_MAX_BYTES` (`:21`), e o corpo
  segue para a contagem da camada 2. Um valor que mente para baixo é pego na contagem (caso "refuses a body
  longer than its declared length"). Formas como `1e6` ou `0x20000` viram número e são recusadas como acima
  do teto, sem risco de passar.
- 413 com `VALIDATION_FAILED` no cliente. `FormattedError.apiResponseMessage` lê `error.code` antes do status,
  então a app mostra o texto de `VALIDATION_FAILED` ("Dados inválidos.") e `formatStatus` devolve 413. Nada em
  `apps/app`, `apps/web` ou `packages/sdk` trata 413 de JSON de outro jeito (`rg "413|PAYLOAD_TOO_LARGE"`: só o
  upload).
- Rotas fora do helper. `rg "(req|request)\.(json|text|formData|arrayBuffer|blob|body)"` em `apps/api` acha só
  o webhook (`webhooks/payments/route.ts:269`, `text()` para a assinatura da Stripe), o upload
  (`file.schema.ts:113`, `formData()`, teto próprio de 4 MiB em `:9-18`) e o portal (`:23`, só testa a
  presença). Nenhuma rota declara `runtime = "edge"`, então o `Buffer.concat` do helper roda em Node.
- `proxy.ts` não lê o corpo. O buffer de até 10 MiB que o Next faz quando existe `proxy.ts` acontece antes do
  handler, e o `docs/SECURITY.md:178` já diz que o teto não limita o que a plataforma recebe.
- As duas tarefas anteriores continuam corretas. O `/auth/sign-in/google` usa o helper e os corpos dele são
  pequenos (`idToken` até 4096, `requestUri` até 2048). O `DELETE /account/sign-in-methods/[id]` não lê corpo.
  O handoff rodou `authSignInGoogleRoute.test.ts`, `authSignInGoogleToolkit.test.ts` e
  `accountSignInMethodsRoute.test.ts` dentro dos 1367 testes verdes.
- `docs/SECURITY.md` confere com o código. Na `:160`, "dez das treze": `find "apps/api/app/(routes)/account"
  -name route.ts | wc -l` dá 13, e `proxy.ts:63-65` lista 3. Em `:172-179`, o teto de 100 KiB, o 413
  `VALIDATION_FAILED`, as duas camadas, as duas rotas fora do helper e os 22 handlers
  (`grep -rn "parseRequestJson(" apps/api/app | wc -l` dá 22). O pior caso de 74 KB da criação de entidade
  bate com `entity.schema.ts:5-7` (255 + 10 000 + 2048 + 10 caracteres, a 6 bytes por `\uXXXX`).
- Testes: 13 casos no helper com `Request` real e stream controlado, mais um na rota de contato que prova o
  413 antes do Zod e sem chamar o provedor. Constantes no lugar de números soltos. Os dois comentários do
  helper (`:37-38` e `:56`) explicam o porquê.

### 👁 Verificar no `/test`

- Números do `/develop`: 106 arquivos e 1367 testes na api, 6 falhas e 29 passando com o helper de `HEAD`.
  Repro: `pnpm --filter api test`, `pnpm test` da raiz, e a troca por
  `git show HEAD:"apps/api/(shared)/lib/parse-request-json.ts"` rodando os dois arquivos (esperado 6 falhas).
- Teto com o servidor do Next de verdade, passando pelo `proxy.ts`. Repro: `pnpm --filter api build && pnpm
  --filter api start`; `curl -i -X POST localhost:3002/auth/sign-in -H 'content-type: application/json'
  --data-binary @corpo-120k.json` (esperado 413 `VALIDATION_FAILED`); o mesmo com
  `-H 'transfer-encoding: chunked'`; e um corpo de 50 KB, que deve seguir até o Zod (400, não 413).
- O `cancel()` com o stream que o Next monta: não dá para saber lendo se ele para a leitura do socket ou se o
  resto do corpo continua chegando ao processo. Repro: no mesmo `next start`, mandar 5 MB em chunked e
  observar o tempo até a resposta e o uso de memória do processo. Se não medir, fica 🔒.
- 🔒 Vercel acima de 4,5 MB e truncamento em 10 MiB no `next start`: comportamento da plataforma, sem
  mudança neste diff.

## Raio de impacto

- 22 handlers em `apps/api/app` passam a recusar corpo acima de 100 KiB com `413 VALIDATION_FAILED`. O tipo de
  retorno do helper é o mesmo, e nenhum chamador mudou. O maior corpo legítimo, cerca de 74 KB, cabe.
- Novo export `REQUEST_JSON_MAX_BYTES`, hoje importado só por dois arquivos de teste.
- Cliente: o SDK propaga o 413 como erro do axios; `FormattedError` mostra o texto de `VALIDATION_FAILED`.
  Nenhum formulário de `apps/app` ou `apps/web` chega perto de 100 KiB.
- Fora do teto: o webhook da Stripe e o upload, cada um com o seu motivo, documentados no `SECURITY.md`.

## Correções aplicadas

| arquivo | o que mudou |
|---------|-------------|
| `apps/api/CLAUDE.md:18` | a descrição do `parseRequestJson` passa a citar o 413 acima de 100 KiB, além do 400 |

Nenhuma mudança de código.

## Lacunas de teste

| lacuna | veredito |
|--------|----------|
| Nenhum teste de rota com `content-length` declarado (handoff) | continua aberta; a camada 1 só é coberta no teste do helper |
| Dublês sem `body` nos 13 arquivos (handoff) | fora de escopo, vira item de backlog (nit acima) |
| Teto e cancelamento no servidor do Next | aberta; repro em "Verificar no `/test`" |

## Decisões em aberto

1. `docs/SECURITY.md` entra num commit `docs` único, cobrindo a `:12` (desvínculo da senha) e a `:160` e
   `:172-179` (teto do corpo). Separar os trechos pede `git add -p`, que é interativo e o ambiente do
   orquestrador não executa. A alternativa seria um patch montado à mão e aplicado com `git apply --cached`,
   frágil para três trechos num arquivo de linhas longas. O documento é um só, e a mensagem do commit cita as
   duas mudanças.
2. `apps/api/CLAUDE.md` vai no `fix(api)` do teto, e não no `docs`: o arquivo é de `apps/api`, e a regra de um
   commit por app/pacote o põe junto do helper que ele descreve.
3. Nome da branch: `api/fix/google-sign-in-unlink-restore-body-cap`, a aplicar com `git branch -m` só com a
   aprovação do usuário.

## Gates estáticos

| gate | resultado |
|------|-----------|
| `pnpm check` | não remedido: esta revisão só mudou markdown, que o Biome não lê. Handoff: `Checked 937 files`, exit 0 |
| `pnpm --filter api typecheck` | não remedido, sem mudança de código. Handoff: exit 0 |
| paridade i18n | não se aplica |
| testes | não rodados (é do `/test`). Handoff: 106 arquivos, 1367 testes |

## Rodada 2: D1 do `/test` (`unhandledRejection` a cada 413 da camada do stream)

O `/test` mediu no `next start` um `⨯ unhandledRejection: Error [AbortError]` por recusa da camada 2 (51 de 51 em
chunked), com origem em `destroyer` e `createAsyncIterator` do Node (`test/report.md`, D1). O ✅ da rodada 1
sobre o desvio 2 valia para a promessa do helper e não para o processo. A rejeição nasce fora do helper, e o
`.catch` não a alcança.

### Por que acontece

Lido em `next@16.0.0`. O adaptador passa o corpo do Node ao `NextRequest` como iterável assíncrono
(`dist/server/web/spec-extension/adapters/next-request.js:84-87`, `body = request.body`). Com `proxy.ts`
presente, esse corpo é o `PassThrough` do `getCloneableBody`, que substitui os métodos do `IncomingMessage`
(`dist/server/body-streams.js`, `replaceRequestBody` e `cloneBodyStream`). O `ReadableStream` que o undici
monta sobre o iterável responde ao `cancel()` chamando `iterator.return()`. O `finally` do
`createAsyncIterator` chama `destroyer(stream, null)`, que cria o `AbortError` porque o stream não terminou e
destrói o `Readable` com ele. A rejeição sai de dentro dessa cadeia, sem passar pela promessa que o helper
recebe.

### O que mudou

| arquivo | antes | depois |
|---------|-------|--------|
| `apps/api/(shared)/lib/parse-request-json.ts:37-39` | `reader.cancel().catch(() => null)` | `reader.releaseLock()`, com comentário de 2 linhas sobre a armadilha |
| `apps/api/__tests__/parseRequestJson.test.ts` | "cancels a stream that passes the cap instead of draining it" (`cancels` igual a 1) e "still answers 413 when cancelling the stream throws" | "stops reading a stream that passes the cap instead of draining it" (413, `pulls` abaixo dos pedaços disponíveis, `cancels` igual a 0) e "releases the stream past the cap without cancelling it" (413, a fonte com `cancel` que lança nunca é chamada, `request.body.locked` falso) |
| `docs/SECURITY.md:174` | "cancela a leitura ao passar do teto" | "para de ler ao passar do teto, soltando o stream sem cancelá-lo", com o motivo |

Os testes não afrouxaram: continuam exigindo o 413 e que o stream não seja drenado, e agora também exigem que
o `cancel` não aconteça e que o lock seja solto. Com o `cancel().catch()` de volta, os dois falham
(`Tests 2 failed | 11 passed (13)`), e o `shasum` do helper voltou a `e2cbba76e4af` depois da troca. A variante
"só parar de ler", sem `releaseLock`, também cai no segundo caso, porque o stream continua travado.

### Por que `releaseLock()` e não as alternativas

- `releaseLock()` não lança aqui. A especificação só rejeita leituras pendentes ao soltar o lock, e no
  helper não há `read()` pendente: o lock é solto depois que o `await reader.read()` resolveu. Conferido com
  `node` (Node 22): `releaseLock()` depois de uma leitura resolvida não lança, e o stream sai com `locked:
  false`.
- Não cancelar não deixa o socket ler até o fim por conta do helper. Pela leitura do `body-streams.js`, o cancelamento
  também não fechava o socket: ele destruía o `PassThrough` do Next, não o `IncomingMessage`. O `/test` mediu a variante uma vez,
  com o cliente parado nos mesmos 851 968 bytes da versão com `cancel()`. O que acontece com a conexão depois
  da resposta (o Node drena, pausa ou fecha) é comportamento do servidor do Node e do Next, igual nas duas
  versões, e por isso fica para a medição da rodada 2 do `/test`.
- "Só parar de ler", sem soltar o lock, tem o mesmo efeito no socket, mas deixa o stream travado num reader
  abandonado. Soltar o lock é o encerramento explícito do lado do helper e dá ao teste uma propriedade
  observável (`locked`).
- Descartada: manter o `cancel()` e silenciar o `unhandledRejection` com um handler de processo. Esconderia
  rejeições reais e espalharia a correção para fora do helper.

### Gates da rodada 2

| gate | resultado |
|------|-----------|
| `pnpm check` | `Checked 937 files`, `No fixes applied`, exit 0 |
| `pnpm --filter api typecheck` | exit 0 |
| `parseRequestJson.test.ts` | 13 de 13 passam |

### O que o `/test` precisa remedir (rodada 2)

1. D1 no servidor real. `pnpm --filter api build`, depois `CORS_ORIGIN=http://localhost:3000 next start -p 3002`
   em `apps/api`, depois
   `cat corpo-120k.json | curl -X POST localhost:3002/auth/sign-in -H 'content-type: application/json' -H 'transfer-encoding: chunked' --data-binary @-`.
   Esperado: `413 VALIDATION_FAILED` e nenhum `unhandledRejection` no log. Repetir a rajada de 51 em chunked e
   contar as rejeições (esperado 0).
2. A leitura parando. O cliente com backpressure mandando 30 MB deve parar perto dos 851 968 bytes, como na
   rodada 1. Registrar também se a conexão fecha depois do 413 ou fica aberta, e por quanto tempo.
3. Memória. Os 50 corpos de 5 MiB em chunked seguidos, todos 413, com o RSS do processo antes e depois. Na
   rodada 1, com `cancel()`, foi de 289 088 KB para 219 824 KB. Esperado: sem crescimento.
4. Sem regressão nos outros caminhos: 413 da camada 1 (`content-length` declarado), 400 de JSON inválido e um
   corpo de 50 KB chegando ao Zod.
5. `pnpm --filter api test` e `pnpm test` da raiz.

### Plano de commits

Não muda. A correção está nos arquivos que já eram do commit 4 (`parse-request-json.ts` e
`parseRequestJson.test.ts`), e a frase nova do `docs/SECURITY.md` vai no commit 5. O commit 8 passa a listar os
arquivos de `test/` que o `/test` gravou.

## Working tree classificado (PR inteira)

| assunto | arquivos |
|---------|----------|
| auditoria do backlog | `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/observability-logging.md`, `specs/social-sign-in-providers.md` |
| Google sign-in | `apps/api/(shared)/validation/auth.schema.ts`, `apps/api/app/(routes)/auth/sign-in/google/route.ts`, `apps/api/__tests__/authSignInGoogleRoute.test.ts`, `apps/api/__tests__/authSignInGoogleToolkit.test.ts` |
| desvínculo da senha | `apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts`, `apps/api/__tests__/accountSignInMethodsRoute.test.ts` |
| teto do corpo | `apps/api/(shared)/lib/parse-request-json.ts`, `apps/api/__tests__/parseRequestJson.test.ts`, `apps/api/__tests__/contactRoute.test.ts`, `apps/api/CLAUDE.md` |
| documento de segurança | `docs/SECURITY.md` |
| artefatos | `docs/features/google-sign-in-error-contract/`, `docs/features/password-unlink-email-restore/`, `docs/features/request-body-size-limit/` |

Nada mais no working tree. `git diff --cached --stat` saiu vazio. Varredura de segredo nos três diretórios de
`docs/features/`: nenhuma senha, token ou chave; os e-mails são `@example.com`. O `test/report.md` do
desvínculo diz que o script gerou as senhas ao acaso e não as gravou, e nenhuma aparece no arquivo.

## Plano de commits (PR inteira)

1. `docs(specs): audit the backlog after PR #50`
   - `specs/BACKLOG.md`
   - `specs/account-security-mfa.md`
   - `specs/observability-logging.md`
   - `specs/social-sign-in-providers.md`
2. `fix(api): validate the Google sign-in body and answer provider refusals by code`
   - `apps/api/(shared)/validation/auth.schema.ts`
   - `apps/api/app/(routes)/auth/sign-in/google/route.ts`
   - `apps/api/__tests__/authSignInGoogleRoute.test.ts`
   - `apps/api/__tests__/authSignInGoogleToolkit.test.ts`
3. `fix(api): retry the address restore after a password unlink and end sessions when it fails`
   - `apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts`
   - `apps/api/__tests__/accountSignInMethodsRoute.test.ts`
4. `fix(api): refuse JSON request bodies over 100 KiB with 413`
   - `apps/api/(shared)/lib/parse-request-json.ts`
   - `apps/api/__tests__/parseRequestJson.test.ts`
   - `apps/api/__tests__/contactRoute.test.ts`
   - `apps/api/CLAUDE.md`

   Corpo sugerido:

   ```
   parseRequestJson now measures the body before parsing it. A declared
   content-length over 100 KiB is refused without reading, and a body without
   the header (or with a smaller one) is counted while it streams and cancelled
   once it passes the cap. Both answer 413 VALIDATION_FAILED; parse failures
   keep the 400. The 22 handlers that use the helper need no change.
   ```
5. `docs: document the password unlink restore failure and the JSON body cap in SECURITY.md`
   - `docs/SECURITY.md`
6. `docs(features): google-sign-in-error-contract`
   - `docs/features/google-sign-in-error-contract/STATE.md`
   - `docs/features/google-sign-in-error-contract/analyze/plan.md`
   - `docs/features/google-sign-in-error-contract/develop/handoff.md`
   - `docs/features/google-sign-in-error-contract/review/review.md`
   - `docs/features/google-sign-in-error-contract/test/criterios-aceite.md`
   - `docs/features/google-sign-in-error-contract/test/report.md`
7. `docs(features): password-unlink-email-restore`
   - `docs/features/password-unlink-email-restore/STATE.md`
   - `docs/features/password-unlink-email-restore/analyze/plan.md`
   - `docs/features/password-unlink-email-restore/develop/handoff.md`
   - `docs/features/password-unlink-email-restore/review/review.md`
   - `docs/features/password-unlink-email-restore/test/criterios-aceite.md`
   - `docs/features/password-unlink-email-restore/test/report.md`
8. `docs(features): request-body-size-limit`
   - `docs/features/request-body-size-limit/STATE.md`
   - `docs/features/request-body-size-limit/analyze/plan.md`
   - `docs/features/request-body-size-limit/develop/handoff.md`
   - `docs/features/request-body-size-limit/review/review.md`
   - `docs/features/request-body-size-limit/test/criterios-aceite.md`
   - `docs/features/request-body-size-limit/test/report.md`

Título de PR sugerido: `fix(api): Google sign-in error codes, email restore on password unlink and a JSON
body cap`. Push só depois do último commit aprovado e com o "sim" do usuário.

### Commits realizados

(preenchido pelo `/review` depois de commitar)
