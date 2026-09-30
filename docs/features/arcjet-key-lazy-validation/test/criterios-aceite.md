# Critérios de Aceite (Checklist)

Status medido no `/test` de 2026-09-30: ✅ verificado e correto · ❌ falha · 🔒 não verificável sem infra
externa. O meio de cada verificação está no `test/report.md`.

- [x] **Chave malformada não derruba a API** ✅
  Com `ARCJET_KEY=invalida`, importar `@repo/security` não lança, então o `proxy.ts` da API carrega e as
  requisições seguem para as rotas. Nas 12 rotas da lista de limite, `checkRateLimit` responde
  `{ allowed: true, enforced: false }` e nenhuma chamada à Arcjet acontece. Antes da mudança o mesmo import
  lançava `Invalid environment variables` e toda requisição que passava pelo proxy respondia 500, inclusive
  `GET /health`. Rota fora da lista também passa, porque o proxy carrega o pacote para qualquer caminho.

- [x] **Chave malformada aparece no boot da API como erro** ✅
  Com `ARCJET_KEY=invalida` e `NEXT_RUNTIME=nodejs`, `register()` escreve uma linha em `console.error`
  começando com `[security] rate limiting is DISABLED` e dizendo que a chave não começa com `ajkey_`. A
  linha não contém o valor da chave, nem parte dele. O boot continua e resolve o Firestore, como nos outros
  casos; a API sobe e responde.

- [x] **Chave ausente mantém o aviso de hoje** ✅
  Sem a variável ou com `ARCJET_KEY=""`, a saída é o mesmo `console.warn` de antes, com o texto intacto, e
  nenhum `console.error` do limitador. Com `ARCJET_KEY="   "` (só espaços), que antes não avisava nada, sai o
  mesmo `console.warn` de ausência. O limitador é no-op nos três casos.

- [x] **Chave com o formato certo continua limitando** ✅
  Com `ARCJET_KEY=ajkey_…`, `checkRateLimit` chama a Arcjet com `key`, `characteristics: ["ip.src"]` e a
  janela de 20 requisições em 60 s. Quando a decisão é de limite, o proxy da API devolve
  `429 { error: { code: "AUTH_RATE_LIMITED" } }` com `Retry-After`. O boot não escreve nada sobre o limitador.
  Os testes antigos de `rateLimit.test.ts` passam sem alteração. A Arcjet é substituída por mock nesse
  critério; o serviço real fica no último item.

- [x] **Chave com espaços em volta é aceita aparada** ✅
  `ARCJET_KEY="  ajkey_x  "` conta como válida e a Arcjet recebe `ajkey_x`, sem os espaços. O `keys()` já
  fazia isso, e o leitor que não lança passa a fazer igual. Caixa diferente no prefixo (`AJKEY_x`) conta como
  malformada.

- [x] **`secure()` degrada do mesmo jeito** ✅
  Com a chave malformada, `secure(allow, request)` resolve `undefined` sem montar cliente da Arcjet e sem
  lançar. Nenhum chamador de `apps/app` ou `apps/web` muda, e todos continuam atrás do guard
  `env.ARCJET_KEY`.

- [x] **`app` e `web` continuam recusando o build com a chave malformada** ✅
  `keys()` de `@repo/security/keys` continua lançando para valor sem o prefixo, e `apps/app/env.ts` e
  `apps/web/env.ts` falham no import com `ARCJET_KEY=invalida`. O `next build` das duas falha em
  "Collecting page data" com `Invalid environment variables` e `path: [ 'ARCJET_KEY' ]`; na Vercel, o deploy
  anterior fica no ar. Com `""` ou só espaços, as duas aceitam e a chave sai `undefined`. O teste
  `keys.test.ts` que recusa o valor sem prefixo segue intacto.

- [x] **A leitura é por chamada, não no import** ✅
  Carregar o pacote sem chave e definir `ARCJET_KEY=ajkey_test` depois faz `isRateLimitEnforced()` responder
  `true` sem recarregar o módulo. Nenhum valor de ambiente é avaliado no grafo de módulos do proxy da API.

- [x] **Os testes provam a correção** ✅
  Restaurar a leitura no topo do módulo (`const arcjetKey = keys().ARCJET_KEY;`) derruba os dois casos de
  chave malformada do `rateLimit.test.ts` e o caso de chave malformada do `proxyArcjetKey.test.ts`. Remover o
  ramo `malformed` do `instrumentation.ts` derruba o caso novo do `corsOriginBoot.test.ts`.

- [x] **Documentos dizem o que o código faz** ✅
  `docs/SECURITY.md`, `docs/PRE-PRODUCTION.md` §8 e `docs/FORKING.md` dizem que chave sem o prefixo `ajkey_`
  conta como ausente na API, com erro no boot, e que em `app`/`web` ela recusa o build em "Collecting page
  data". `docs/ROPA.md` e `docs/SUBPROCESSORS.md` não afirmam mais que a landing bloqueia bot. As âncoras
  citadas apontam para as linhas certas do código atual.

- [ ] **Chave válida contra a Arcjet real** 🔒
  Com uma chave de verdade, a 21ª requisição em 60 s a uma rota da lista deveria receber
  `429 AUTH_RATE_LIMITED`. Exige credencial da Arcjet e um IP de cliente que a Arcjet aceite; em `localhost`
  ela registra `Client IP address is missing` e não decide. Já não era verificado antes desta mudança e não
  reprova a entrega.

## Roteiro de teste manual

Para quem tiver uma chave real da Arcjet (critério 🔒). Rode num host com IP público ou com
`ARCJET_ENV=development`.

1. `ARCJET_KEY=<chave real> pnpm --filter api build`, depois `pnpm --filter api exec next start -p 3002`, com as
   `FIREBASE_ADMIN_*` de dev. Esperado: nenhuma linha `[security]` no boot.
2. Repita 21 vezes `curl -s -o /dev/null -w "%{http_code}\n" -X POST -H 'content-type: application/json' -d '{}' localhost:3002/auth/sign-up`.
   Esperado: 20 respostas `400` (`VALIDATION_FAILED`) e a 21ª `429`, com corpo
   `{"error":{"code":"AUTH_RATE_LIMITED"}}` e cabeçalho `Retry-After`.
3. Derrube o processo, troque a chave por `invalida`, rebuilde e suba de novo. Esperado: linha
   `[security] rate limiting is DISABLED (ARCJET_KEY is set but does not start with "ajkey_")` no boot, sem o
   valor, e as 21 requisições respondendo `400`.
