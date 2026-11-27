# Relatório de QA: redirect-double-slash-guard

Rodada autônoma do `/cycle`, sem o usuário acompanhando. Branch `feat/audit-log-levels` (não protegida); não
criei nem troquei branch, não toquei no índice. Escopo: o hunk de `packages/auth/redirect.ts:39-45` e as
linhas 94-120 de `packages/auth/__tests__/postAuthRedirectTarget.test.ts`.

Esta foi a última passada de testes da madrugada, então os gates do repo inteiro abaixo valem para o working
tree todo (as seis tarefas da rodada), não só para esta.

## Verificar no `/test` (lista do `review.md`)

| item | veredito | o que medi |
|------|----------|------------|
| `pnpm --filter @repo/auth test` com 219 testes, 18 no arquivo do guard | confirmado | 16 arquivos, 219 passando; `postAuthRedirectTarget.test.ts` com 18 passando, incluindo os três `it` novos (`rejects a path the URL parser resolves to a double slash`, `accepts a path that resolves without a double slash`, `falls back when the query or hash carries a double slash`) |
| Mutante: tirar `&& !resolvedPath.includes("//")` derruba o `it` de recusa | confirmado | Com a condição removida, o arquivo fica em 1 falho e 17 passando, e o falho é exatamente o `it` de recusa. Chamei o guard mutado com as seis entradas via `vite-node`: as seis voltam como entraram (`"/pt-br/\t/evil.com"` devolve `"/pt-br/\t/evil.com"`, e assim por diante). Com o arquivo restaurado, as seis devolvem `"/pt-br"` |
| `pnpm test` da raiz | confirmado, com ressalva de carga | verde na última medição (detalhe em "Gates") |
| Opcional: `/pt-br/sign-in?redirect=%2Fpt-br%2F%5Cevil.com` no app de pé | 🔒 não verificado | Nenhum app estava de pé (portas 3000 e 3002 livres) e o diff não tem superfície visual. Não subi nada |

O mutante usou uma cópia do arquivo no scratchpad da sessão, fora do repo. Restaurei pela cópia, `cmp` saiu
sem diferença e não ficou `.bak` em `packages/auth`. Nenhum gate oficial rodou durante a troca.

## Destinos legítimos

Passei pelo guard real, com fallback `"FALLBACK"`, os destinos que o `review.md` citou e alguns a mais. Todos
voltaram exatamente como entraram: `/pt-br/entities/abc?x=1`, `/en/admin/users/123/edit`,
`/es/invite?token=ab%2F%2Fc`, `/pt-br/search?q=a\b`, `/pt-br/x#a\b`, `/pt-br/%5C`, `/pt-br/a/`, `/pt-br/./`,
`/pt-br/onboarding?redirect=%2Fpt-br%2Fentities` e `/pt-br/a?x=%26%25%`. `/pt-br//evil.com` e
`/pt-br/../\evil.com` caíram no fallback.

## Critérios de aceite

| critério | status | meio |
|----------|--------|------|
| Caminho que resolve com barra dupla cai no fallback | ✅ PASS | unit (`it` de recusa) + mutante + `vite-node` |
| Destino legítimo continua aceito sem alteração | ✅ PASS | unit (`it` de aceite e os `it` anteriores) + `vite-node` com 10 destinos |
| A regra nova olha só o pathname | ✅ PASS | unit (`it` de query/hash) + leitura de `redirect.ts:42-45` |
| Chamadores inalterados | ✅ PASS | `git status --short` nos seis chamadores saiu vazio; suítes da app e do auth verdes |
| O teste prende a regra | ✅ PASS | mutante |
| Suíte e gates verdes | ✅ PASS | comandos abaixo |

Checklist completo em `test/criterios-aceite.md`.

## Gates

Load average da máquina durante a rodada: entre 10 e 88, com picos vindos de processos fora do repo
(navegador, VM). Não alterei timeout, não pulei teste e não usei `--force`.

| comando | resultado | load (`uptime`) |
|---------|-----------|-----------------|
| `pnpm --filter @repo/auth test` | 16 arquivos, 219 passando | 33 |
| `pnpm --filter @repo/auth exec vitest run __tests__/postAuthRedirectTarget.test.ts` | 18 passando | 33 |
| `pnpm test` (raiz, JDK 21), 1ª | falhou: `@repo/design-system` com 3 timeouts de 20 s em `actionMenu.test.tsx` e um `Timeout starting forks runner`; o turbo parou antes de `api`, `app` e `test:emulator` | 30 a 40 |
| `pnpm --filter @repo/design-system exec vitest run __tests__/actionMenu.test.tsx` | 20 passando (81 s) | 36 |
| `pnpm test` (raiz), 2ª | falhou: `@repo/design-system` com 8 timeouts em 4 arquivos, conjunto diferente da 1ª | 33 a 47 |
| `pnpm turbo run test test:emulator --continue` | `design-system` 173 passando, `auth` 219, `app` 1405 passando com 6 erros de `Timeout starting forks runner`, `api` 1982/1984 (2 timeouts em `googleSignInProfile.test.ts`), `web` 317/319 (2 timeouts), `api:test:emulator` 284 passando | 30 a 46 |
| `pnpm test` (raiz), 3ª | falhou só `web`: 4 timeouts de 20 s, em arquivos diferentes da rodada anterior | 15 a 38 |
| `pnpm --filter web test`, `--filter api test`, `--filter app test`, isolados e em sequência | web 319/319, api 1984/1984, app 1405/1405 | 27 a 88 |
| `pnpm turbo run lint typecheck` | 15/15 tasks; Biome em 1175 arquivos, nenhuma correção; typecheck de todos os workspaces sem erro (14 do cache) | 65 a 76 |
| `pnpm test --concurrency=1` (raiz, JDK 21) | 15/15 tasks (11 do cache): api 1984, web 319, app 1405, `api:test:emulator` 284, demais pacotes verdes | 56 a 23 |

Todas as falhas foram timeout de 20 s ou de início de worker do Vitest. Cada rodada falhou em testes
diferentes, nenhum em arquivo tocado pelo diff (`git status --short packages/design-system` vazio), e cada
workspace passou quando rodou sozinho. Leio isso como efeito de carga, não como regressão. A última medição
só tirou o paralelismo entre tasks do turbo; os testes e os timeouts são os mesmos.

A linha do CI (`pnpm turbo run lint typecheck test test:emulator`) fica coberta pelas duas últimas linhas da
tabela: lint e typecheck 15/15, `test` e `test:emulator` 15/15.

Paridade de i18n: a tarefa não toca `packages/internationalization`; o pacote passou dentro do `pnpm test`
(67 testes).

## Decisões de custo de teste

Não criei teste. O guard é função pura, o teste de unidade do pacote prova a regra, e o mutante confirma que
ele não passa sem a condição nova. Nada aqui pede a faixa cara: não há Firestore, rule, sessão nem rota
envolvidos.

## Evidência e2e

Não abri browser. O diff muda uma função pura de `packages/auth`, sem tela, copy ou layout, e nenhum app
estava de pé para o repro opcional.

## Ambiente

Não subi serviço nem emulador de dev. O `test:emulator` da API sobe e derruba os próprios emuladores dentro
da task do turbo. As portas 3000 e 3002 estavam livres no início e não as usei. Nenhum dado de dev criado ou
apagado, nenhuma conta de QA.

## Lacunas

| lacuna (handoff e review) | veredito |
|---------------------------|----------|
| Nenhum teste de chamador usa as entradas novas | continua aberta, sem necessidade de fechar: os seis chamadores delegam à mesma função e não mudaram |
| Repro do sign-in com `%5C` no app rodando | continua aberta (🔒), opcional; fica para uma rodada em que o app já esteja de pé |
| `/pt-br?tab=billing` cai no fallback (🟢 do review, anterior à tarefa) | fora de escopo; observação de backlog |

## Pendências para o usuário

- O índice ainda tem os dois renames de spec de outra tarefa (`git diff --cached --stat`). O plano de
  commits do `review.md` exige o índice vazio antes do `fix(auth)`.
- A suíte fica instável com load acima de ~30: timeouts de 20 s em testes de UI do `design-system`, da `web`
  e da `api`. Não é defeito desta tarefa, mas o `pnpm test` da raiz pode falhar numa máquina carregada.
