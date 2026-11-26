# Relatório de QA: Stripe só na api e gitleaks local no modo git

Rodada autônoma do `/cycle`, 2026-11-26. Branch: `guilhermebittelbrunn/claude-cycle-full-pipeline` (não
protegida). Nenhum commit foi feito; `git log main..HEAD` está vazio e o índice também.

## Superfície de runtime

Nenhuma. O diff toca dois `.env.example`, `docs/FORKING.md` e `docs/SETUP.md`. Não subi app, api, web,
emulador nem browser, e não tirei screenshot. A pergunta "a app e a web sobem sem `STRIPE_*`" foi respondida
com leitura e com o montador de ambiente da suíte E2E (abaixo), sem build e sem `dev`.

## Verificar no `/test`

| Item do `review.md` | Veredito | Como medi |
|---------------------|----------|-----------|
| Critérios 8 a 10 com o binário do próprio QA | **confirmado** | gitleaks 8.30.1 baixado para pasta nova, sha256 conferido, repositório descartável (detalhe abaixo) |
| App e web sobem com o `.env.example` novo | **confirmado por leitura e montagem do ambiente**, sem subir os apps | `env.ts` de app e web estendem só `core()`, `email()`, `security()`; nenhum desses `keys.ts` declara `STRIPE_*` (o único é `packages/payments/keys.ts`). `buildStackEnv` com os arquivos reais: api com as duas chaves, app e web sem nenhuma. Subir de fato fica para o job `e2e` do CI, que monta o ambiente pelo mesmo `buildStackEnv` |

## Gitleaks (critérios 8 a 10)

Binário: `gitleaks_8.30.1_darwin_arm64.tar.gz` do release oficial, baixado para uma pasta nova e vazia do
scratchpad. O sha256 bateu com a linha `darwin_arm64` de `gitleaks_8.30.1_checksums.txt` (começa com
`b40ab0ae`, termina com `a6a5`, o mesmo do handoff). `gitleaks version` devolveu `8.30.1`, e
`gitleaks git --help` lista `--pre-commit` e `--staged`.

Repositório git descartável em outra pasta do scratchpad. Os tokens (três, para a regra `generic-api-key`)
saíram de `openssl rand -hex 20` em runtime e só existiram nesse repositório. Script e binário ficaram em
pastas separadas do repositório, e o binário recebeu os caminhos como argumento. Todos os comandos rodaram
com `--redact --no-banner`.

| Cenário | Comando | Saída | Código |
|---------|---------|-------|--------|
| controle: token commitado | `gitleaks git .` | `leaks found: 1` | 1 |
| linha removida, fora do índice | `git diff base \| gitleaks stdin` (antigo) | `leaks found: 1` | 1 |
| linha removida, fora do índice | `gitleaks git --pre-commit .` | `no leaks found` | 0 |
| linha removida, fora do índice | `gitleaks git --pre-commit --staged .` | `no leaks found` | 0 |
| linha removida, no índice | antigo | `leaks found: 1` | 1 |
| linha removida, no índice | `--pre-commit --staged` | `no leaks found` | 0 |
| linha removida, no índice | `--pre-commit` | `no leaks found` | 0 |
| removida e re-adicionada com `gitleaks:allow`, fora do índice | antigo | `leaks found: 1` | 1 |
| idem | `--pre-commit` | `no leaks found` | 0 |
| idem, no índice | `--pre-commit --staged` | `no leaks found` | 0 |
| linha nova, fora do índice | `--pre-commit` | `leaks found: 1` | 1 |
| linha nova, fora do índice | `--pre-commit --staged` | `no leaks found` | 0 |
| linha nova, no índice | `--pre-commit --staged` | `leaks found: 1` | 1 |
| linha nova, no índice | `--pre-commit` | `no leaks found` | 0 |
| arquivo novo sem `git add` | `--pre-commit` | `no leaks found` | 0 |
| arquivo novo com `git add -N` | `--pre-commit` | `leaks found: 1` | 1 |
| arquivo novo com `git add -N` | `--pre-commit --staged` | `no leaks found` | 0 |

A tabela reproduz a do handoff linha a linha e acrescenta o caso "removida, no índice" com o comando antigo.

No repositório real, os três comandos do `SETUP.md` deram `no leaks found` e código 0: commits da branch
(0 commits, a branch não tem commit próprio), índice (vazio) e fora do índice (cerca de 139 KB de diff). O
working tree tem `packages/auth/__tests__/serverErrorLogging.test.ts` modificado, com o fixture fictício
reescrito: a linha nova leva `gitleaks:allow` e a antiga sai do diff. Para comparar, rodei o comando antigo
(`git diff | gitleaks stdin`) no mesmo working tree: `leaks found: 1`, regra `generic-api-key`, e a
evidência mostra a linha **removida** desse fixture (prefixo `-`). É o falso positivo que motivou a tarefa,
medido no repositório de verdade.

As três pastas (`gl-qa`, repositório descartável e scripts) foram apagadas no fim; `ls` confirmou que não
existem mais.

## Critérios de aceite

| # | Critério | Status | Meio | Valor medido |
|---|----------|--------|------|--------------|
| 1 | `.env.example` da app sem `STRIPE_*` | PASS | leitura | `grep -c STRIPE_` → `0` |
| 2 | `.env.example` da web sem `STRIPE_*` | PASS | leitura | `0` |
| 3 | api mantém as duas | PASS | leitura | `grep -cE '^STRIPE_(SECRET_KEY\|WEBHOOK_SECRET)='` → `2` |
| 4 | nenhum código de app/web depende da Stripe | PASS | leitura | só `apps/app/env.ts` (constante `STRIPE_LOOKUP_KEY_MAX_LENGTH`) |
| 5 | ambiente E2E de app/web sem `STRIPE_*`, `stackEnv.test.ts` verde | PASS | unit + execução de `buildStackEnv` | 9/9; api com 2 chaves `STRIPE_*`, app e web com 0 |
| 6 | nenhum doc manda `STRIPE_*` para app/web | PASS | leitura | `grep -c "também listam as duas" docs/FORKING.md` → `0`; `FORKING.md:373` diz "só na `api`" |
| 7 | `SETUP.md` sem `gitleaks stdin` | PASS | leitura | `0` |
| 8 | flags existem na 8.30.1 | PASS | binário próprio | `--pre-commit`, `--staged` no help |
| 9 | comando novo não acusa linha removida | PASS | repositório descartável | antigo 1, novos 0 (tabela acima) |
| 10 | comando novo pega segredo adicionado | PASS | repositório descartável | `leaks found: 1` nas duas variantes, cada uma do seu lado do índice |
| 11 | comandos novos passam no repositório real | PASS | binário próprio | `no leaks found` nos três |
| 12 | hunk da `repo-hygiene-ci` intacto | PASS | leitura | `git diff docs/SETUP.md \| grep -c "Um único fixture dispara"` → `1` |
| 13 | lint, typecheck e testes sem regressão | PASS | gates | ver abaixo |

O `stackEnv.test.ts` usa fixtures próprios e não lê os `.env.example` reais. Por isso o critério 5 também foi
medido chamando `buildStackEnv` direto, com os arquivos reais, por um script de poucas linhas no scratchpad
(apagado depois).

## Gates finais da branch

Esta foi a última tarefa da rodada, então os números valem para a branch inteira. Sem `--force` em nenhum.
`uptime` antes do `pnpm test`: carga 5,07 / 8,05 / 9,98. Portas 9099, 8080, 9199, 4001, 4400 e 4500 livres
antes e depois. `JAVA_HOME=/opt/homebrew/opt/openjdk@21` (`openjdk 21.0.12.1`).

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter e2e exec vitest run __tests__/stackEnv.test.ts` | 9/9 |
| `pnpm test` (raiz) | 15/15 tasks, 13 do cache, 30,9 s, código 0 |
| `pnpm check` | 1155 arquivos, nenhum fix |
| `pnpm turbo run lint typecheck` | 15/15 tasks, 7 do cache, 32,6 s, código 0 |

Contagem por workspace no `pnpm test`:

| Workspace | Arquivos | Testes |
|-----------|----------|--------|
| `api` (`test`) | 131 | 1873 |
| `api` (`test:emulator`, nunca do cache) | 9 | 279 |
| `app` | 154 | 1378 |
| `web` | 35 | 315 |
| `e2e` (cache miss) | 3 | 38 |
| `@repo/email` | 8 | 209 |
| `@repo/auth` | 15 | 201 |
| `@repo/design-system` | 14 | 172 |
| `@repo/internationalization` | 7 | 67 |
| `@repo/security` | 3 | 65 |
| `@repo/shared` | 5 | 63 |
| `@repo/analytics` | 3 | 41 |
| `@repo/next-config` | 2 | 39 |
| `@repo/payments` | 3 | 19 |
| `@repo/sdk` | 4 | 15 |

Nenhum `Timeout starting forks runner` nem teste reprovado. A paridade de i18n roda dentro de
`@repo/internationalization` (67/67); a tarefa não tocou tradução.

## Decisões de custo de teste

Nenhum teste novo, porque o diff não tem código. O único consumidor executável dos `.env.example` é o
`buildStackEnv` da suíte E2E, que já tem 9 testes unitários. Medi o comportamento com os arquivos reais numa
chamada avulsa em vez de acrescentar um teste que dependeria de arquivo de configuração do repositório.
Nenhum teste da faixa cara.

## Ambiente do e2e

Nada subiu e nada foi reutilizado. O emulador do `test:emulator` é iniciado e encerrado pela própria task;
as portas dele estavam livres depois.

## Lacunas

- Critérios 8 a 10, abertos no handoff e no review: **fechados** com binário próprio.
- Subida real de app e web com o `.env.example` novo: **continua aberta** como medição de runtime. A leitura
  do `env.ts` e o `buildStackEnv` cobrem a parte de ambiente, e o job `e2e` do CI sobe os apps na PR.
- `RESEND_*` na web: **fora de escopo**, como o plano decidiu.

## Estado de dev alterado

Nenhum. Nenhuma conta, dado ou projeto Firebase foi tocado.

## Varredura de segredo

Procurei em `docs/features/setup-docs-cleanup/` por hex ou base64 com 32 caracteres ou mais, `sk_live_`,
`sk_test_`, `whsec_` seguido de valor, `senha`, `password` e endereço de e-mail. Nenhum token gerado nesta
rodada foi gravado; o sha256 do binário aparece só abreviado.
