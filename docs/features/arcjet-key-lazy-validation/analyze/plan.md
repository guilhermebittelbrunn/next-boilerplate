# Plano: `ARCJET_KEY` malformada deixa de derrubar a API

Tarefa direta, sem spec. Origem: o achado 🔴 de `specs/BACKLOG.md:640` e a recomendação #1 em
`specs/BACKLOG.md:229-265`. Rodada autônoma do `/cycle`: ninguém foi consultado, e as decisões tomadas estão
na §12, cada uma com a alternativa descartada.

## 0. Sumário do desenho

A medição desta análise mudou o recorte do problema. O achado dizia que as três apps quebram em runtime. Não
é o que acontece:

| app | onde a chave malformada é avaliada | efeito medido |
|-----|-------------------------------------|---------------|
| `apps/api` | só no `proxy.ts:1` (import de `@repo/security`), que o build não executa | `next build` **passa**; em runtime, toda requisição que passa pelo proxy falha no import do pacote |
| `apps/app` | `apps/app/env.ts:8` (`extends: [..., security()]`) + `proxy.ts:5` | `next build` **falha** em "Collecting page data" com `Invalid environment variables` / `ARCJET_KEY` |
| `apps/web` | `apps/web/env.ts:8` (mesmo `extends`, apesar do `skipValidation: true`) + `proxy.ts:5` | `next build` **falha** do mesmo jeito |

Na Vercel, trocar variável de ambiente só vale no próximo deploy. Então, em `app` e `web`, uma chave errada
nunca chega a servir requisição: o deploy fica vermelho e o anterior continua no ar. A `api` é a única que
publica um build verde que responde erro a tudo. É ali que está o 🔴.

O desenho:

1. `packages/security/keys.ts` ganha um leitor que **não lança** (`readArcjetKey`) e um classificador
   (`arcjetKeyState`: `absent` | `malformed` | `valid`). O `keys()` estrito continua como está, e é ele que
   mantém o build de `app` e `web` recusando a chave errada.
2. `packages/security/index.ts` deixa de chamar `keys()` no topo do módulo (`:11`) e passa a ler a chave com
   `readArcjetKey()` em cada chamada. Chave malformada vira ausência: limitador no-op, `secure()` no-op.
3. `apps/api/instrumentation.ts:46-50` distingue ausente de malformada. Ausente continua no `console.warn` de
   hoje; malformada sai em `console.error`, sem ecoar o valor.
4. Testes de unidade no pacote e no boot da API. Nenhum emulador, nenhum app de pé.
5. Documentos que ficam falsos (ou já estão) são corrigidos no mesmo diff (§13.5).

Sem i18n, sem `error.code` novo, sem variável nova, sem dependência nova, sem infra.

## 1. Contexto

### 1.1 Problema medido

`packages/security/index.ts:11` faz `const arcjetKey = keys().ARCJET_KEY;` no carregamento do módulo. O
schema em `packages/security/keys.ts:9-15` aceita vazio ou só espaços como ausência, mas recusa qualquer
valor sem o prefixo `ajkey_`, e o `createEnv` lança `Invalid environment variables`. Os usos da chave estão em
`index.ts:32` (`isRateLimitEnforced`), `:42-47` (`checkRateLimit`) e `:85-91` (`secure`).

Quem importa o pacote: `apps/api/proxy.ts:1` (`checkRateLimit`), `apps/app/proxy.ts:5` e
`apps/web/proxy.ts:5` (`secure`), e os layouts `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx:5`
e `.../(admin)/admin/layout.tsx:5`.

O aviso de boot em `apps/api/instrumentation.ts:46-50` só testa `!process.env.ARCJET_KEY`. Com a chave
malformada ele fica em silêncio, porque a variável existe.

### 1.2 Medições desta análise (2026-09-30)

Todas no workspace `tripoli`, sem subir app. Os comandos estão na §9 para o `/test` repetir.

1. **Import direto, via `jiti`**, com `NODE_ENV=production`:

   | `ARCJET_KEY` | `apps/app/env.ts` | `apps/web/env.ts` | `packages/security/keys.ts` (`keys()`) | `packages/security/index.ts` |
   |---|---|---|---|---|
   | `invalida` | lança | lança | lança | lança |
   | `""` | ok, `undefined` | ok, `undefined` | ok, `undefined` | ok |
   | `ajkey_ok` | ok, `"ajkey_ok"` | ok, **`undefined`** | ok, `"ajkey_ok"` | ok |

   O `skipValidation: true` de `apps/web/env.ts:33` não impede a exceção: o array
   `extends: [core(), email(), security()]` é avaliado antes do `createEnv` externo, e `security()` é o
   `keys()` estrito. A última linha revela outro defeito, tratado na §1.5.

2. **`next build` com `ARCJET_KEY=invalida`:**
   - `apps/web`: falha. "Failed to collect configuration for /[locale]", `/[locale]/contact`,
     `/[locale]/pricing`, `/[locale]/sign-up`, todas com `cause: Invalid environment variables` e
     `path: [ 'ARCJET_KEY' ]`.
   - `apps/app`: falha. "Failed to collect configuration for /", mesma causa.
   - `apps/api`: **passa** (exit 0, 33 páginas geradas). As variáveis do Firebase Admin foram preenchidas com
     valores de mentira e uma chave PEM descartável gerada com `openssl` e apagada em seguida. Nenhum módulo
     de rota da API importa `@repo/security` (grep: só `proxy.ts:1` e testes com `vi.mock`), e
     `apps/api/env.ts:9` não estende `security()`.

### 1.3 Objetivo e corte

- Uma `ARCJET_KEY` presente e sem o prefixo `ajkey_` não derruba mais requisição nenhuma da `apps/api`. O
  limitador vira no-op, como já acontece sem a chave.
- O processo da API avisa no boot, com `console.error`, que a chave foi recusada e por quê, sem imprimir o
  valor.
- `app` e `web` continuam recusando o build com a chave malformada, que é o sinal mais cedo possível. Se o
  valor chegar só em runtime (host que injeta env sem rebuild), o `env.ts` das duas continua lançando por
  requisição, como hoje. Ver D2.

**Fora do corte:**

- Ligar o bloqueio de bot da landing, que hoje nunca roda (§1.5). Vira achado para o backlog.
- Aviso de boot em `apps/app` e `apps/web` (D9).
- O achado aberto de que o `throw` do `CORS_ORIGIN` em `instrumentation.ts:40-44` não derruba o processo.
  Não muda com esta tarefa.

### 1.4 Apps impactados

| área | muda? | o quê |
|------|-------|-------|
| `packages/security` | sim | leitor que não lança, leitura por chamada em `index.ts` |
| `apps/api` | sim | ramo novo no aviso de boot; comentário do `.env.example` |
| `apps/app`, `apps/web` | não | o código não muda; o comportamento com chave malformada também não (build recusa) |
| `packages/sdk`, `packages/internationalization` | não | |
| `docs/` | sim | §13.5 |

Área do painel, modo de produto (`subscription` × `simple`) e assinatura: N/A. A mudança é de borda HTTP e
vale igual para qualquer modo.

### 1.5 Achado no caminho: o bloqueio de bot da landing nunca roda

`apps/web/proxy.ts:63` só chama `secure()` se `env.ARCJET_KEY` for verdadeiro. Mas `apps/web/env.ts:33` usa
`skipValidation: true`, e com ele o `createEnv` do `@t3-oss/env-core@0.13.8` devolve o `runtimeEnv` do próprio
módulo e descarta tudo que veio de `extends` (`dist/src-Bb3GbGAa.js`: `if (skip) return runtimeEnv;`, antes do
merge dos `extends`). O `runtimeEnv` da web não declara `ARCJET_KEY`, então `env.ARCJET_KEY` é sempre
`undefined`, mesmo com chave válida (medição 1, última linha). O próprio `apps/web/env.ts:10-12` já registra
esse efeito para as variáveis `NEXT_PUBLIC_*`.

Documentos que afirmam o contrário: `docs/ROPA.md:108` ("Bloqueio de bot na landing, se `ARCJET_KEY` estiver
definida") e `docs/SUBPROCESSORS.md:40` (cita a chamada em `apps/web/proxy.ts:68` como se rodasse).

Não entra no código desta tarefa (D8): ligar o `secure()` na landing põe um bloqueio `LIVE` de bot e `shield`
na frente de visitante anônimo em todo fork que já tem a chave, e isso precisa de decisão e de teste próprios.
Os dois documentos são corrigidos para dizer o que acontece hoje.

## 2. Dados (Firestore)

N/A. Nenhuma coleção, campo, consulta ou regra.

## 3. Contrato `@repo/sdk`

N/A. Nenhum DTO nem action muda. A resposta de rota limitada continua `429 AUTH_RATE_LIMITED` quando há
chave válida, e passa direto quando não há.

## 4. API

### 4.1 O que muda no caminho da requisição

`apps/api/proxy.ts:146-147` chama `checkRateLimit(request)` para os 12 caminhos da lista
(`proxy.ts:45-58`). Depois da mudança:

| `ARCJET_KEY` | import de `@repo/security` | `checkRateLimit` |
|---|---|---|
| ausente, `""`, `"   "` | não lança (igual a hoje) | `{ allowed: true, enforced: false }` (igual a hoje) |
| `invalida` | **não lança** (hoje lança) | `{ allowed: true, enforced: false }`, sem chamar a Arcjet |
| `ajkey_…` | não lança | chama a Arcjet (igual a hoje) |

O `proxy.ts` da API não muda.

### 4.2 Aviso de boot

`register()` em `apps/api/instrumentation.ts:35-56` já roda só no runtime `nodejs` (`:36-38`) e já avisa a
ausência (`:46-50`). O ramo novo:

| estado | saída | nível |
|---|---|---|
| `absent` | `[security] rate limiting is DISABLED (no ARCJET_KEY). Public auth routes accept unlimited requests.` (texto de hoje, sem mudança) | `console.warn` |
| `malformed` | `[security] rate limiting is DISABLED (ARCJET_KEY is set but does not start with "ajkey_"). Public auth routes accept unlimited requests.` | `console.error` |
| `valid` | nada | |

O valor da chave nunca aparece no log, nem em parte. O boot segue até `getFirestoreAdmin()` nos três casos.

Mudança de comportamento pequena e intencional: hoje `ARCJET_KEY="   "` não gera aviso nenhum (a string é
verdadeira em `!process.env.ARCJET_KEY`) e o limitador já é no-op, porque o schema trata espaço como ausência.
Com o classificador, esse caso passa a avisar como ausente, que é o que ele é.

### 4.3 Erros

Nenhum `error.code` novo, nenhuma entrada em `apiErrors`.

## 5. Front-end

N/A. Nenhum arquivo de `apps/app` ou `apps/web` muda. `secure()` continua com a mesma assinatura, e os três
chamadores (`apps/app/proxy.ts:138`, os dois layouts, `apps/web/proxy.ts:68`) seguem protegidos pelo mesmo
guard de `env.ARCJET_KEY`.

## 6. i18n

N/A. Log de boot não é texto de UI.

## 7. Autorização e segurança

- **Postura com chave malformada:** a API passa a aceitar as rotas da lista sem limite, em vez de recusar
  tudo. É o mesmo estado de quem não configurou a chave, que `docs/SECURITY.md:157` e
  `docs/PRE-PRODUCTION.md` §8 já documentam como aceitável para subir. A diferença é que agora o boot diz,
  em `console.error`, que a chave foi recusada.
- **Nada vaza:** o log não imprime o valor. Uma chave colada errada pode ser outra credencial (um token de
  outro serviço), e log de plataforma é retido.
- **Impersonação:** N/A. O limite é por IP, antes de qualquer guard.
- **`app` e `web`:** sem mudança de postura (build recusa).

## 8. Testes

Todos de unidade, rodando com `pnpm --filter @repo/security test` e `pnpm --filter api test`. Nenhum exige
emulador: a falha acontece na validação da string, antes de qualquer rede, e a Arcjet já é mockada em
`packages/security/__tests__/rateLimit.test.ts:12-18`.

| arquivo | nível | o que prova |
|---------|-------|-------------|
| `packages/security/__tests__/keys.test.ts` | unidade (função pura) | `arcjetKeyState`: `undefined`, `""`, `"   "` → `absent`; `"invalida"`, `"AJKEY_x"`, `"sk_live_x"` → `malformed`; `"ajkey_x"` e `"  ajkey_x  "` → `valid`. `readArcjetKey`: devolve `undefined` para ausente e malformada **sem lançar**, e a chave aparada quando válida. O teste existente `:47-51` ("still refuses a value that is not an Arcjet key") **continua como está**: é ele que prende o build recusando em `app`/`web` (D2) |
| `packages/security/__tests__/rateLimit.test.ts` | unidade, módulo recarregado com `vi.resetModules` (padrão de `:45-54`) | novo `describe("rate limit with a malformed key")`: `loadLimiter("invalida")` resolve sem lançar; `checkRateLimit` → `{ allowed: true, enforced: false }`; `arcjetMock`, `protectMock` e `requestMock` nunca chamados; `isRateLimitEnforced()` → `false`; `secure([...], request)` resolve `undefined` sem chamar `arcjetMock`. Um caso de leitura por chamada: carregar sem chave, depois definir `ajkey_test` em `process.env` e ver `isRateLimitEnforced()` virar `true` sem recarregar o módulo |
| `apps/api/__tests__/corsOriginBoot.test.ts` | unidade (`register()` com `@repo/auth/server` mockado) | no `describe("boot notice for the rate limiter")` já existente (`:68-86`): chave malformada → `console.error` uma vez com `/does not start with "ajkey_"/`, nenhuma chamada contém o valor, `console.warn` sem a linha de ausência, `register()` resolve e `getFirestoreAdmin` é chamado; `ARCJET_KEY="   "` → `console.warn` com `/rate limiting is DISABLED/` |

Os testes existentes não mudam. `apps/api/__tests__/instrumentation.test.ts:64` já faz
`vi.stubEnv("ARCJET_KEY", "ajkey_qa")` e filtra por `[payments]`, então não é afetado. Os testes da API que
fazem `vi.mock("@repo/security", …)` (`corsOrigin.test.ts:20`, `requestId.test.ts:14`) substituem o módulo
inteiro e também não são afetados. O `corsOriginBoot.test.ts` hoje só espiona `console.warn` (`:31-33`); os
casos novos espionam `console.error` também, e o `vi.restoreAllMocks()` de `:37` desfaz.

**Mutação para o `/test` conferir:** com `index.ts:11` restaurado (`const arcjetKey = keys().ARCJET_KEY;`), o
`describe` novo do `rateLimit.test.ts` tem de falhar no `loadLimiter("invalida")`. Com o ramo `malformed` do
`instrumentation.ts` removido, o caso novo do `corsOriginBoot.test.ts` tem de falhar.

## 9. O que o `/test` vai percorrer

Diff sem superfície de UI: **nenhuma passada de `agent-browser`**, pela `cycle-policy` §3.1. O `/test`:

1. Roda `pnpm --filter @repo/security test` e `pnpm --filter api test`, e a suíte da raiz que gateia o build.
2. Aplica as duas mutações da §8 e confirma que os testes caem.
3. Repete a medição 1 da §1.2 depois da mudança. Esperado: `packages/security/index.ts` passa a importar
   com `invalida`; `apps/app/env.ts`, `apps/web/env.ts` e `keys()` continuam lançando. Comando (sem
   credencial):

   ```bash
   R=$(pwd)
   cat > /tmp/arcjet-env-probe.mjs <<EOF
   import { createJiti } from "$R/node_modules/jiti/lib/jiti.mjs";
   const target = process.argv[2];
   const jiti = createJiti(target, { interopDefault: true, moduleCache: false });
   try {
     const mod = await jiti.import(target);
     const env = mod.env ?? mod;
     const v = typeof env.keys === "function" ? env.keys().ARCJET_KEY : env.ARCJET_KEY;
     console.log("OK   ", JSON.stringify(process.env.ARCJET_KEY), target, JSON.stringify(v));
   } catch (e) {
     console.log("THREW", JSON.stringify(process.env.ARCJET_KEY), target, e.message.split("\n")[0]);
   }
   EOF
   for key in invalida "" ajkey_ok; do
     for f in apps/app/env.ts apps/web/env.ts packages/security/keys.ts packages/security/index.ts; do
       ARCJET_KEY="$key" NODE_ENV=production node /tmp/arcjet-env-probe.mjs "$R/$f" 2>&1 | grep -E "^(OK|THREW)"
     done
   done
   ```

4. Opcional, se o custo couber: `ARCJET_KEY=invalida npx next build` em `apps/web` ainda falha (confirma D2).
   Os builds da `app` e da `api` foram medidos nesta análise e não mudam com o diff.

Não verificável sem infra: o comportamento com uma chave válida contra a Arcjet de verdade. Já não era
verificado antes e continua fora (🔒), sem reprovar a entrega.

## 10. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Chave malformada não derruba a API**
  Com `ARCJET_KEY=invalida`, importar `@repo/security` não lança, então o `proxy.ts` da API carrega e as
  requisições seguem para as rotas. Nas 12 rotas da lista de limite, `checkRateLimit` responde
  `{ allowed: true, enforced: false }` e nenhuma chamada à Arcjet é feita. Hoje o mesmo import lança
  `Invalid environment variables` e toda requisição que passa pelo proxy falha.

- [ ] **Chave malformada aparece no boot da API como erro**
  Com `ARCJET_KEY=invalida` e `NEXT_RUNTIME=nodejs`, `register()` escreve uma linha em `console.error`
  começando com `[security] rate limiting is DISABLED` e dizendo que a chave não começa com `ajkey_`. A
  linha não contém o valor da chave, nem parte dele. O boot continua e resolve o Firestore, como nos outros
  casos.

- [ ] **Chave ausente mantém o aviso de hoje**
  Sem a variável ou com `ARCJET_KEY=""`, a saída é o mesmo `console.warn` de hoje, com o texto intacto, e
  nenhum `console.error` do limitador. Com `ARCJET_KEY="   "` (só espaços), que hoje não avisa nada, passa a
  sair o mesmo `console.warn` de ausência. O limitador é no-op nos três casos, como já era.

- [ ] **Chave válida continua limitando**
  Com `ARCJET_KEY=ajkey_…`, `checkRateLimit` chama a Arcjet com `key`, `characteristics: ["ip.src"]` e a
  janela de 20 requisições em 60 s, e devolve `429 AUTH_RATE_LIMITED` com `Retry-After` quando a decisão é de
  limite. O boot não escreve nada sobre o limitador. Os testes existentes de `rateLimit.test.ts:102-167`
  continuam passando sem alteração.

- [ ] **Chave com espaços em volta é aceita aparada**
  `ARCJET_KEY="  ajkey_x  "` conta como válida e a Arcjet recebe `ajkey_x`, sem os espaços. Isso já valia
  para o `keys()` e passa a valer igual para o leitor que não lança.

- [ ] **`secure()` degrada do mesmo jeito**
  Com a chave malformada, `secure(allow, request)` resolve `undefined` sem montar cliente da Arcjet e sem
  lançar. Nenhum chamador de `apps/app` ou `apps/web` muda.

- [ ] **`app` e `web` continuam recusando o build com a chave malformada**
  `keys()` de `@repo/security/keys` continua lançando para valor sem o prefixo, e `apps/app/env.ts` e
  `apps/web/env.ts` continuam falhando no import com `ARCJET_KEY=invalida`. Com isso o `next build` das duas
  segue falhando em "Collecting page data", e na Vercel o deploy anterior fica no ar. O teste
  `keys.test.ts:47-51` segue intacto.

- [ ] **A leitura é por chamada, não no import**
  Carregar o pacote sem chave e definir `ARCJET_KEY=ajkey_test` depois faz `isRateLimitEnforced()` responder
  `true` sem recarregar o módulo. É o que garante que nenhum valor de ambiente seja avaliado no grafo de
  módulos do proxy.

- [ ] **Os testes provam a correção**
  Restaurar a leitura no topo do módulo (`const arcjetKey = keys().ARCJET_KEY;`) faz o teste de chave
  malformada do `rateLimit.test.ts` falhar. Remover o ramo `malformed` do `instrumentation.ts` faz o caso
  novo do `corsOriginBoot.test.ts` falhar.

- [ ] **Documentos dizem o que o código faz**
  `docs/SECURITY.md`, `docs/PRE-PRODUCTION.md` §8 e `docs/FORKING.md` passam a dizer que chave sem o prefixo
  `ajkey_` é tratada como ausência na API, com erro no boot, e que em `app`/`web` ela recusa o build.
  `docs/ROPA.md:108` e `docs/SUBPROCESSORS.md:40` deixam de afirmar que a landing bloqueia bot, e as âncoras
  de `packages/security/index.ts` citadas em `ROPA.md:152` e `SUBPROCESSORS.md:40` apontam para as linhas
  certas depois da mudança.

## 11. Perguntas em aberto

Nenhuma bloqueia o `/develop`. Todas já vêm com a opção adotada.

| # | pergunta | opções | adotada | por quê |
|---|----------|--------|---------|---------|
| D1 | `ARCJET_KEY` malformada na API: limitador no-op com erro no log de boot, ou o processo recusa subir? | (a) no-op + `console.error` no boot; (b) recusar subir | **(a)**, decisão do orquestrador | `cycle-policy` §3 pede modo degradado para feature opt-in. E (b) não funciona hoje sem mexer em outra coisa: o `throw` de boot do `CORS_ORIGIN` (`instrumentation.ts:40-44`) não derruba o processo (achado aberto), então o resultado seria o mesmo 🔴 com outra mensagem |
| D2 | `app` e `web` também passam a tolerar a chave malformada? | (a) manter o `keys()` estrito, e o build das duas segue recusando; (b) schema tolerante em `keys.ts`, e as três apps degradam igual | **(a)** | Medido: o build das duas já falha com a chave errada, e o deploy anterior fica no ar. É o sinal mais cedo possível e o backlog pediu para mantê-lo se existisse (`BACKLOG.md:260-263`). (b) trocaria um deploy vermelho por bloqueio de bot desligado em silêncio. Custo de (a): em `next dev`, ou em host que injeta env só em runtime, `app`/`web` falham por requisição com `Invalid environment variables` no terminal, como hoje |
| D3 | A API também deveria recusar o build, estendendo `security()` no `apps/api/env.ts` como faz com `payments()`? | (a) não; (b) sim | **(a)** | Contradiz D1. E o `extends` é avaliado mesmo com o `skipValidation` de desenvolvimento (`apps/api/env.ts:46`), então em `next dev` toda rota que importa `@/env` passaria a falhar, que é o defeito que esta tarefa remove |
| D8 | Ligar agora o bloqueio de bot da landing, que nunca roda por causa do `skipValidation` (§1.5)? | (a) não, registrar achado e corrigir os documentos; (b) declarar `ARCJET_KEY` no `runtimeEnv` de `apps/web/env.ts` | **(a)** | (b) liga `detectBot` e `shield` em modo `LIVE` para visitante anônimo em todo fork que já tem a chave. É mudança de comportamento em produção, fora do 🔴, e a `cycle-policy` §3 manda dívida adjacente para o backlog. Os documentos que afirmam o bloqueio são corrigidos no diff |

## 12. Decisões tomadas sem perguntar

| # | decisão | alternativa descartada | por quê |
|---|---------|------------------------|---------|
| D4 | Leitor que não lança, `readArcjetKey`, exportado de `keys.ts` junto com `arcjetKeyState`, e usado por `index.ts` e pelo boot da API | `try { keys() } catch` dentro de `index.ts` | O `createEnv` imprime `❌ Invalid environment variables` em `console.error` antes de lançar (`onValidationError` padrão do `env-core`). No caminho da requisição, isso seria uma linha de erro por requisição limitada. E o boot precisa distinguir ausente de malformada, o que um `catch` não informa |
| D5 | Ler a chave a cada chamada, sem memoizar | memoizar na primeira chamada | O custo é um `trim` e um `startsWith`. Memoizar não ganha nada mensurável e reintroduz estado de módulo, que é o que prende os testes a `vi.resetModules` |
| D6 | `console.error` para chave malformada, sem imprimir valor nem prefixo do valor | `console.warn` como a ausência; ou mostrar os primeiros caracteres para ajudar a identificar | Ausência é escolha documentada (`.env.example` publica `ARCJET_KEY=""`); chave errada é erro de configuração, e o orquestrador pediu "erro no log". O valor fica de fora porque uma credencial colada no lugar errado pode ser de outro serviço |
| D7 | `ARCJET_KEY="   "` passa a gerar o aviso de ausência | manter o silêncio de hoje | O limitador já trata espaço como ausência (`keys.ts:13-14`). Avisar é o comportamento coerente, e o classificador compartilhado resolve os dois de uma vez |
| D9 | Sem aviso de boot em `apps/app` e `apps/web` | `console.warn` no `instrumentation.ts` das duas | Nas duas a chave malformada já recusa o build (D2), e o `instrumentation.ts` delas hoje só exporta `onRequestError`. Acrescentar `register()` é superfície nova sem caso que ela cubra |
| D10 | Casos novos de boot no `corsOriginBoot.test.ts`, não no `instrumentation.test.ts` | seguir a âncora do backlog (`instrumentation.test.ts:64`) | O `describe("boot notice for the rate limiter")` já existe em `corsOriginBoot.test.ts:68-86`, com o controle de env (`MANAGED_VARS` inclui `ARCJET_KEY`) de que os casos precisam. O `:64` do outro arquivo só fixa uma chave válida para isolar os avisos da Stripe |
| D11 | `keys()` continua com o schema estrito, e o `preprocess` dele passa a usar a mesma constante de prefixo do leitor | duplicar `"ajkey_"` em dois lugares | Uma fonte só para o prefixo evita que o build recuse uma coisa e o runtime aceite outra |

## 13. Blueprint técnico

### 13.1 `packages/security/keys.ts`

```ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const ARCJET_KEY_PREFIX = "ajkey_";

export type ArcjetKeyState = "absent" | "malformed" | "valid";

const trimmedString = (value: unknown): string =>
    typeof value === "string" ? value.trim() : "";

export const arcjetKeyState = (value: unknown): ArcjetKeyState => {
    const key = trimmedString(value);
    if (key === "") {
        return "absent";
    }
    return key.startsWith(ARCJET_KEY_PREFIX) ? "valid" : "malformed";
};

/**
 * Never throws: a key without the Arcjet prefix reads as no key at all, so the limiter
 * degrades to a no-op instead of failing every request that imports this package.
 */
export const readArcjetKey = (
    value: unknown = process.env.ARCJET_KEY
): string | undefined =>
    arcjetKeyState(value) === "valid" ? trimmedString(value) : undefined;

/**
 * The key is optional and the example env files ship it declared but empty, so an
 * empty value has to mean "absent" — otherwise merely copying `.env.example`
 * refuses the schema and takes down every app that imports this package.
 */
const optionalArcjetKey = z.preprocess((value) => {
    if (typeof value !== "string") {
        return value;
    }
    const key = value.trim();
    return key === "" ? undefined : key;
}, z.string().startsWith(ARCJET_KEY_PREFIX).optional());

export const keys = () =>
    createEnv({ /* sem mudança */ });
```

O comentário de `optionalArcjetKey` hoje diz que vazio precisa ser ausência para não derrubar "every app that
imports this package". Continua verdadeiro. Vale acrescentar, em uma linha, que o schema estrito existe para o
build de quem estende `keys()` recusar a chave errada, já que agora o pacote tem um leitor tolerante ao lado e
o motivo de manter os dois não é óbvio (regra de comentário: o porquê, não o quê).

### 13.2 `packages/security/index.ts`

```diff
-import { keys } from "./keys";
-
-const arcjetKey = keys().ARCJET_KEY;
+import { readArcjetKey } from "./keys";

 …
-export const isRateLimitEnforced = (): boolean => Boolean(arcjetKey);
+export const isRateLimitEnforced = (): boolean => Boolean(readArcjetKey());

 export const checkRateLimit = async (sourceRequest?: Request): Promise<RateLimitResult> => {
+    const arcjetKey = readArcjetKey();
     if (!arcjetKey) {
         return { allowed: true, enforced: false };
     }
     const aj = arcjet({ key: arcjetKey, … });
 …
 export const secure = async (allow, sourceRequest?) => {
+    const arcjetKey = readArcjetKey();
     if (!arcjetKey) {
         return;
     }
```

### 13.3 `apps/api/instrumentation.ts`

```diff
-    if (!process.env.ARCJET_KEY) {
-        console.warn(
-            "[security] rate limiting is DISABLED (no ARCJET_KEY). Public auth routes accept unlimited requests."
-        );
-    }
+    warnOnDisabledRateLimit();
```

```ts
import { arcjetKeyState } from "@repo/security/keys";

function warnOnDisabledRateLimit(): void {
    const state = arcjetKeyState(process.env.ARCJET_KEY);

    if (state === "absent") {
        console.warn(
            "[security] rate limiting is DISABLED (no ARCJET_KEY). Public auth routes accept unlimited requests."
        );
        return;
    }

    if (state === "malformed") {
        console.error(
            '[security] rate limiting is DISABLED (ARCJET_KEY is set but does not start with "ajkey_"). Public auth routes accept unlimited requests.'
        );
    }
}
```

Import estático ou dinâmico: `keys.ts` só importa `@t3-oss/env-nextjs` e `zod`, os dois sem dependência de
Node, e não executa nada no carregamento. O import estático no topo serve. Se o `/develop` preferir o padrão
de `:54` (`await import(...)` depois do teste de runtime), também funciona. `@repo/security` já é dependência
da API (`apps/api/package.json:28`), e o subcaminho `@repo/security/keys` já é importado por
`apps/app/env.ts:3` e `apps/web/env.ts:3`.

### 13.4 Testes (esqueleto)

```ts
// packages/security/__tests__/keys.test.ts (acréscimo)
describe("arcjet key state", () => {
    it.each([undefined, "", "   "])("reads %j as absent", (value) => {
        expect(arcjetKeyState(value)).toBe("absent");
    });
    it.each(["invalida", "AJKEY_x", "sk_live_x"])("reads %j as malformed", (value) => {
        expect(arcjetKeyState(value)).toBe("malformed");
    });
    it("accepts a real key with surrounding spaces", () => {
        expect(arcjetKeyState("  ajkey_x  ")).toBe("valid");
        expect(readArcjetKey("  ajkey_x  ")).toBe("ajkey_x");
    });
    it("reads a malformed key as no key without throwing", () => {
        expect(() => readArcjetKey("invalida")).not.toThrow();
        expect(readArcjetKey("invalida")).toBeUndefined();
    });
});

// packages/security/__tests__/rateLimit.test.ts (acréscimo)
describe("rate limit with a malformed key", () => {
    it("loads without throwing and lets the request through, not enforcing", async () => {
        const { checkRateLimit, isRateLimitEnforced } = await loadLimiter("invalida");
        await expect(checkRateLimit(new Request("http://api.test/"))).resolves.toEqual({
            allowed: true,
            enforced: false,
        });
        expect(isRateLimitEnforced()).toBe(false);
        expect(arcjetMock).not.toHaveBeenCalled();
    });
    it("skips the bot check as well", async () => {
        const { secure } = await loadLimiter("invalida");
        await expect(secure([], new Request("http://app.test/"))).resolves.toBeUndefined();
        expect(arcjetMock).not.toHaveBeenCalled();
    });
});

// apps/api/__tests__/corsOriginBoot.test.ts (acréscimo no describe existente)
it("reports a key that is not an Arcjet key as an error, without echoing it", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    givenBootEnv({ NODE_ENV: "development", ARCJET_KEY: "invalida" });

    await expect(register()).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/does not start with "ajkey_"/));
    expect(JSON.stringify(error.mock.calls)).not.toContain("invalida");
    expect(console.warn).not.toHaveBeenCalledWith(expect.stringMatching(RATE_LIMIT_DISABLED));
    expect(getFirestoreAdminMock).toHaveBeenCalledTimes(1);
});
```

O teste de leitura por chamada precisa de cuidado com o `afterEach` de `rateLimit.test.ts:68-74`, que já
restaura a variável. Basta definir `process.env.ARCJET_KEY` depois do `loadLimiter(undefined)`.

### 13.5 Documentos a corrigir no mesmo diff

Âncoras medidas em 2026-09-30. O `/develop` remede depois de editar `index.ts`, que desloca as linhas.

| arquivo | trecho | o que fica falso | correção |
|---------|--------|------------------|----------|
| `docs/SECURITY.md:157` | "Sem `ARCJET_KEY` o limite é um no-op explícito … a API avisa uma vez, no boot" | incompleto: não diz o que acontece com chave malformada | acrescentar que chave sem o prefixo `ajkey_` conta como ausência na API, com `console.error` no boot, e que em `app`/`web` ela faz o build falhar |
| `docs/PRE-PRODUCTION.md:569-571` (§8) | "Definida em produção" / "Sem ela o `@repo/security` degrada para no-op e a API avisa uma vez, no boot" | idem | o item do checklist passa a pedir a chave com o prefixo `ajkey_`, e o texto diz o que acontece com uma chave errada em cada app |
| `docs/FORKING.md:312` e `:392` | "`ARCJET_KEY` (`ajkey_…`) em `api`, `app` e `web`" / "Sem limite; a API avisa no boot" | a coluna de efeito não cobre a chave errada; e na `web` a variável hoje não tem efeito nenhum (§1.5) | uma frase sobre chave errada; registrar que na `web` ela só é validada no build, sem ativar o bloqueio de bot |
| `docs/ROPA.md:108` | "Bloqueio de bot na landing, se `ARCJET_KEY` estiver definida" | falso hoje (§1.5) | dizer que a landing não aplica bloqueio de bot, mesmo com a chave, e apontar o motivo (`apps/web/env.ts` com `skipValidation`) |
| `docs/ROPA.md:152` | `packages/security/index.ts:39-48`, `packages/security/index.ts:81` | âncoras deslocadas pela mudança | remedir |
| `docs/SUBPROCESSORS.md:40` | `packages/security/index.ts:39`, `:48`, `:81`; "chamadas em … `apps/web/proxy.ts:68`" | âncoras deslocadas; a chamada da web não roda | remedir e marcar a chamada da web como inativa |
| `apps/api/.env.example:67-70` | comentário da `ARCJET_KEY` | incompleto | uma linha: o valor precisa começar com `ajkey_`; qualquer outro é tratado como ausente e a API registra erro no boot |

Não mudam: `docs/SETUP.md:118-119`, os `.env.example` de `app` e `web` ("Without it, @repo/security degrades to
a no-op" segue verdadeiro), `docs/ROPA.md:54` e `:94` (falam do limite com a chave definida).

**Para o handoff levar ao backlog** (quem escreve no `BACKLOG.md` é o `/spec --sync`):

- 🟡 novo: bloqueio de bot da landing nunca roda (`apps/web/env.ts:33` + `apps/web/proxy.ts:63`), com a D8
  como pergunta.
- O 🔴 de `BACKLOG.md:640` fecha com esta tarefa, e o texto dele precisa da correção medida: em `app` e `web`
  o efeito é build recusado, não requisição falhando.

### 13.6 Ordem de implementação e de commit

Branch: quem define é o `revisor-codigo`. O workspace está em `run-full-task-cycle-v3`.

1. `fix(security): read the Arcjet key per call and treat a malformed one as absent`
   `packages/security/keys.ts`, `packages/security/index.ts`, `packages/security/__tests__/keys.test.ts`,
   `packages/security/__tests__/rateLimit.test.ts`.
2. `fix(api): report a malformed ARCJET_KEY at boot`
   `apps/api/instrumentation.ts`, `apps/api/__tests__/corsOriginBoot.test.ts`, `apps/api/.env.example`.
3. `docs: describe what a malformed ARCJET_KEY does in each app`
   `docs/SECURITY.md`, `docs/PRE-PRODUCTION.md`, `docs/FORKING.md`, `docs/ROPA.md`, `docs/SUBPROCESSORS.md`.
4. `docs(features): arcjet-key-lazy-validation`, sempre por último.

As mudanças já presentes no working tree (`specs/BACKLOG.md`, `specs/account-security-mfa.md`) são da
auditoria anterior e não entram em nenhum destes commits.

### 13.7 Env e infra

- Variável nova: nenhuma. `ARCJET_KEY` já existe nos três `.env.example`.
- **Pré-requisitos manuais de infra: nenhum.** Nenhuma conta, bucket, índice, regra, webhook ou DNS. Nada
  entra em `docs/PRE-PRODUCTION.md` como pendência nova; o §8 só tem o texto corrigido.
- Rollback: reverter os commits 1 e 2. Não há dado gravado.
- Fork: nada a fazer. Quem já tem chave válida não percebe diferença; quem colou chave errada na API passa a
  ver `console.error` no boot em vez de erro em toda requisição.
