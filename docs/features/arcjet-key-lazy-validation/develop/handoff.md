# Handoff do `/develop`: `ARCJET_KEY` malformada deixa de derrubar a API

Plano seguido: `analyze/plan.md`. Nenhuma decisão do plano precisou ser revertida. Sem dependência nova,
sem i18n, sem `error.code`, sem variável de ambiente nova e sem infra.

## Blueprint → arquivos

| item do plano | arquivos |
|---|---|
| §13.1 leitor que não lança e classificador | `packages/security/keys.ts`: `ARCJET_KEY_PREFIX`, `ArcjetKeyState`, `arcjetKeyState()` (`:11-17`), `readArcjetKey()` (`:23-26`). O `keys()` estrito ficou igual, agora usando a mesma constante de prefixo (D11), e o comentário do schema ganhou uma frase explicando por que ele segue estrito |
| §13.2 leitura por chamada | `packages/security/index.ts`: saiu o `keys().ARCJET_KEY` do topo do módulo; `isRateLimitEnforced` (`:30`), `checkRateLimit` (`:40`) e `secure` (`:84`) chamam `readArcjetKey()` |
| §13.3 aviso de boot | `apps/api/instrumentation.ts`: `warnOnDisabledRateLimit()` (`:30-45`), com import estático de `@repo/security/keys`. Ausente sai em `console.warn` com o texto antigo; malformada sai em `console.error` sem o valor |
| §13.4 testes | `packages/security/__tests__/keys.test.ts`, `packages/security/__tests__/rateLimit.test.ts`, `apps/api/__tests__/corsOriginBoot.test.ts` |
| §13.5 documentos | `docs/SECURITY.md` (bullet novo depois do `:157`), `docs/PRE-PRODUCTION.md` §8, `docs/FORKING.md` §7.3 e tabela de variáveis, `docs/ROPA.md:108` e `:152`, `docs/SUBPROCESSORS.md:40`, `apps/api/.env.example` (comentário da `ARCJET_KEY`) |

## Contrato

Não há DTO nem action do SDK envolvidos. O pacote `@repo/security` ganhou dois exports em `keys.ts`
(`arcjetKeyState`, `readArcjetKey`) e o tipo `ArcjetKeyState`. As assinaturas públicas de `index.ts`
(`checkRateLimit`, `isRateLimitEnforced`, `secure`) não mudaram.

Quem consome:

- `apps/api/proxy.ts:1` usa `checkRateLimit`, que agora lê a chave por chamada.
- `apps/app/proxy.ts:138`, os dois layouts de `apps/app` e `apps/web/proxy.ts:68` usam `secure`. Todos
  continuam atrás do guard `env.ARCJET_KEY` e não mudaram.
- `apps/api/instrumentation.ts` passou a importar `arcjetKeyState`.
- `apps/app/env.ts` e `apps/web/env.ts` seguem estendendo `keys()`, que continua estrito.

## Códigos de erro novos

Nenhum, e portanto nenhuma entrada em `apiErrors`.

## Desvios em relação ao plano

Nenhum desvio de decisão. Há três diferenças pequenas de execução:

1. **Testes além do esqueleto.** Em `rateLimit.test.ts`, entrou um caso que confere que a Arcjet recebe a
   chave aparada (`"  ajkey_test  "` vira `ajkey_test`). Em `corsOriginBoot.test.ts`, entrou um `it.each`
   para `""` e `"   "` (os dois avisam como ausentes e não geram `console.error`), e o caso já existente de
   chave válida passou a também afirmar que não há `console.error`.
2. **Armadilha do parâmetro padrão.** `readArcjetKey(value = process.env.ARCJET_KEY)` lê o ambiente quando
   recebe `undefined` explícito, porque é assim que parâmetro padrão funciona em JavaScript. O teste de
   ausência mede isso pelo ambiente (`givenArcjetKey(undefined)` e depois `readArcjetKey()`), em vez de
   chamar `readArcjetKey(undefined)`, que passaria por coincidência. O código de produção não passa
   `undefined` explícito: `index.ts` chama sem argumento e o boot usa `arcjetKeyState`, que não tem padrão.
3. **Âncora a mais.** `docs/SUBPROCESSORS.md:40` citava `packages/security/keys.ts:9-15`, que o plano não
   listou. O schema foi para `:35-41`, e a âncora foi corrigida junto com as de `index.ts`.

## Âncoras remedidas depois da edição

Medidas com `awk 'NR==…'` e `grep -n` sobre os arquivos já editados:

| documento | antes | depois | linha de destino |
|---|---|---|---|
| `docs/ROPA.md:152` | `index.ts:39-48`, `index.ts:81` | `index.ts:37-47`, `index.ts:80` | `export const checkRateLimit` até `characteristics: ["ip.src"]`; `export const secure` |
| `docs/SUBPROCESSORS.md:40` | `keys.ts:9-15`, `index.ts:39`, `:48`, `:81` | `keys.ts:35-41`, `index.ts:37`, `:47`, `:80` | schema estrito; `checkRateLimit`; `characteristics`; `secure` |
| `docs/SECURITY.md` (novo) | | `keys.ts:23-26`, `keys.ts:35-41`, `instrumentation.ts:30-45` | `readArcjetKey`; schema estrito; `warnOnDisabledRateLimit` |
| `docs/ROPA.md:108`, `docs/SUBPROCESSORS.md:40` | | `apps/web/env.ts:33`, `apps/web/proxy.ts:63` | `skipValidation: true`; `if (!env.ARCJET_KEY)` |

`apps/api/proxy.ts:147` e `apps/app/proxy.ts:138` foram conferidas com `grep -n` e não mudaram.

## Validação (smoke do `/develop`, não é evidência de QA)

| comando | resultado |
|---|---|
| `pnpm --filter @repo/security test` | 3 arquivos, 45 testes, todos passam (`keys.test.ts` 15, `rateLimit.test.ts` 12) |
| `pnpm turbo run test --filter=api --filter=@repo/security` | 9 tasks ok; `api`: 78 arquivos, 1034 testes passam |
| `npx vitest run` em `corsOriginBoot`, `instrumentation`, `corsOrigin` e `requestId` (dentro de `apps/api`) | 4 arquivos, 65 testes passam (`corsOriginBoot.test.ts` 8) |
| `pnpm --filter @repo/security typecheck` | exit 0 |
| `pnpm --filter api typecheck` | exit 0 |
| `pnpm check` | 806 arquivos, 0 erros |
| paridade de i18n | não se aplica: nenhuma chave nova. O `@repo/internationalization:test` rodou como dependência do turbo: 59 testes passam |

**Mutações da §8 do plano, aplicadas e revertidas:**

- Com `keys().ARCJET_KEY` de volta no topo de `index.ts`: `rateLimit.test.ts` dá 2 falhas e 10 aprovações
  em 12. As duas falhas são os casos de `describe("rate limit with a malformed key")`.
- Sem o ramo `malformed` de `instrumentation.ts`: `corsOriginBoot.test.ts` dá 1 falha e 7 aprovações em 8.
  A falha é o caso "reports a key that is not an Arcjet key as an error, without echoing it".

Depois de reverter, `git diff --stat` voltou a mostrar só as mudanças da tarefa.

**Probe da §9.3 do plano** (`jiti`, `NODE_ENV=production`, sem app de pé):

| `ARCJET_KEY` | `apps/app/env.ts` | `apps/web/env.ts` | `keys()` | import de `packages/security/index.ts` |
|---|---|---|---|---|
| `invalida` | lança | lança | lança | **ok** (antes lançava) |
| `""` | ok, `undefined` | ok, `undefined` | ok, `undefined` | ok |
| `"   "` | ok, `undefined` | ok, `undefined` | ok, `undefined` | ok |
| `ajkey_ok` | ok, `"ajkey_ok"` | ok, **`undefined`** | ok, `"ajkey_ok"` | ok |

## A verificar no `/test`

- **`next build` de `apps/web` e `apps/app` com `ARCJET_KEY=invalida` continua falhando (D2).** Não rodei o
  build. O probe acima mostra que o `env.ts` das duas ainda lança, e o `keys()` não mudou. Repro:
  `cd apps/web && ARCJET_KEY=invalida npx next build`, esperando "Failed to collect configuration" com
  `path: [ 'ARCJET_KEY' ]`.
- **O proxy da API responde com a chave malformada.** Os testes provam isso no nível do módulo: o import não
  lança e `checkRateLimit` devolve `{ allowed: true, enforced: false }`. Ninguém fez uma requisição HTTP de
  verdade. Repro, se o custo couber: `ARCJET_KEY=invalida pnpm --filter api build && start` e
  `curl -i -X POST localhost:3002/auth/sign-in`, esperando qualquer status que não seja 500 vindo do import
  (400 de validação serve). O mesmo `start` deve mostrar a linha `console.error` no boot.
- **Chave válida contra a Arcjet de verdade.** Fica sem verificação (🔒): exige credencial real, que não foi
  inventada.

## Lacunas de teste conhecidas

- Nenhum teste percorre `apps/api/proxy.ts` com `@repo/security` real e chave malformada. Os testes do
  proxy (`corsOrigin.test.ts:20`, `requestId.test.ts:14`) substituem o pacote com `vi.mock`. A cobertura do
  "não derruba" vive em `rateLimit.test.ts`, que importa `index.ts` de verdade com a Arcjet mockada.
- Nenhum teste automatizado prende o comportamento de build de `app`/`web` com chave errada. O teste
  `keys.test.ts:47-51` ("still refuses a value that is not an Arcjet key") segue intacto e protege o schema
  estrito, que é a causa dessa falha.

## Para o `/spec --sync` registrar no backlog

- 🟡 **Novo: o bloqueio de bot da landing nunca roda.** `apps/web/proxy.ts:63` só chama `secure()` quando
  `env.ARCJET_KEY` é verdadeiro. Mas `apps/web/env.ts:33` usa `skipValidation: true`, e com isso o
  `createEnv` do `@t3-oss/env-core@0.13.8` devolve só o `runtimeEnv` do próprio módulo e descarta o que veio
  de `extends` (conferido no `dist/src-*.js` do pacote: `if (skip) return runtimeEnv;` vem antes do merge de
  `extends`). Como o `runtimeEnv` da web não declara `ARCJET_KEY`, o valor é sempre `undefined`, mesmo com
  chave válida (probe acima, última linha). A pergunta em aberto é a D8 do plano: declarar `ARCJET_KEY` no
  `runtimeEnv` da web liga `detectBot` e `shield` em modo `LIVE` para visitante anônimo em todo fork que já
  tem a chave, e isso pede decisão e teste próprios. `docs/ROPA.md:108`, `docs/SUBPROCESSORS.md:40` e
  `docs/FORKING.md` §7.3 já descrevem o comportamento atual.
- 🔴 de `specs/BACKLOG.md:640`: fecha com esta tarefa, e o texto precisa de correção. Em `app` e `web` o
  efeito da chave malformada é o build recusado, não requisição falhando. Só a `api` publicava um build que
  respondia erro a tudo.

## Pendências

Nenhuma pendência de infra, e nada entrou em `docs/PRE-PRODUCTION.md` como item novo; o §8 teve só o texto
corrigido. As mudanças em `specs/BACKLOG.md` e `specs/account-security-mfa.md` já estavam no working tree e
não foram tocadas.
