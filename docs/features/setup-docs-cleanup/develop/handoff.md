# Handoff do develop: setup-docs-cleanup

Tarefa de configuração e documentação. Nenhum código de produto, contrato, rota, i18n ou código de erro mudou.

## Blueprint → arquivos

| Item do plano | Arquivo | Mudança |
|---------------|---------|---------|
| Tirar `STRIPE_*` da app | `apps/app/.env.example` | saem `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` e a linha em branco seguinte |
| Tirar `STRIPE_*` da web | `apps/web/.env.example` | idem |
| Ajustar o FORKING | `docs/FORKING.md:373` | o passo 4 fica em uma linha: "**só na `api`**, o único app que as lê." |
| Trocar o gitleaks local | `docs/SETUP.md:203-210` | parágrafo de introdução explica que os três comandos usam o modo `git` e que arquivo novo precisa de `git add` (ou `git add -N`); o `git diff origin/main \| gitleaks stdin` vira `--pre-commit --staged` (índice) e `--pre-commit` (fora do índice) |

Contrato: nada mudou. Códigos de erro novos: nenhum.

## Desvios

Nenhum em relação ao blueprint. O texto do `SETUP.md` é o do plano, palavra por palavra.

## Separar o `SETUP.md` no commit

O arquivo tem duas mudanças no working tree: a desta tarefa e o parágrafo "Não há allowlist" da
`repo-hygiene-ci`. Com o contexto padrão (`-U3`) o git junta tudo num hunk só (`@@ -200,18 +200,22 @@`),
porque entre o fim do bloco de comandos e o parágrafo seguinte só há duas linhas. O `git add -p` não separa
esse hunk com `s` de forma limpa.

Com contexto zero os hunks saem separados:

```
git diff -U0 docs/SETUP.md | grep '^@@'
@@ -203 +203,3 @@     <- esta tarefa (introdução)
@@ -207 +209,2 @@     <- esta tarefa (comandos)
@@ -210,5 +213,6 @@   <- repo-hygiene-ci
```

Para levar só os dois primeiros ao índice:

```bash
git diff -U0 docs/SETUP.md | awk '/^@@/{n++} n<3' > <scratch>/setup.patch
git apply --cached --unidiff-zero <scratch>/setup.patch
```

Conferi com `git apply --cached --unidiff-zero --check` (passou) e não apliquei: o índice continua vazio
(`git diff --cached --stat` sem saída). Se a `repo-hygiene-ci` for commitada antes, o problema some e basta
`git add docs/SETUP.md`.

## Flags do gitleaks 8.30.1

Baixei `gitleaks_8.30.1_darwin_arm64.tar.gz` do release oficial para uma pasta vazia do scratchpad. O
sha256 (`b40ab0ae…a6a5`) bateu com o `gitleaks_8.30.1_checksums.txt` do mesmo release. `gitleaks version`
devolveu `8.30.1`, e `gitleaks git --help` lista `--pre-commit` ("scan using git diff") e `--staged` ("scan
staged commits"). A pasta foi apagada no fim.

## Prova do comando

Repositório git descartável no scratchpad (apagado no fim). O token que dispara a regra `generic-api-key` foi
gerado em runtime com `openssl rand` e só existiu nesse repositório; nada dele foi gravado aqui.

| Cenário | Comando | Resultado |
|---------|---------|-----------|
| controle: commit com o token | `gitleaks git .` | `leaks found: 1` |
| linha apagada, fora do índice | `git diff HEAD \| gitleaks stdin` (antigo) | `leaks found: 1` (falso positivo) |
| linha apagada, fora do índice | `gitleaks git --pre-commit .` | `no leaks found` |
| linha apagada, no índice | `gitleaks git --pre-commit --staged .` | `no leaks found` |
| linha nova, fora do índice | `--pre-commit` | `leaks found: 1` |
| linha nova, fora do índice | `--pre-commit --staged` | `no leaks found` |
| linha nova, no índice | `--pre-commit --staged` | `leaks found: 1` |
| linha nova, no índice | `--pre-commit` | `no leaks found` |
| linha nova com `gitleaks:allow`, no índice | `--pre-commit --staged` | `no leaks found` |
| arquivo novo sem `git add` | `--pre-commit` | `no leaks found` |
| arquivo novo com `git add -N` | `--pre-commit` | `leaks found: 1` |

As duas variantes se complementam: cada uma só enxerga o seu lado do índice, e por isso o doc lista as duas.
O resultado das duas últimas linhas é o que sustenta a frase sobre `git add -N`.

Rodei também os dois comandos novos neste repositório, com o working tree das outras tarefas abertas:
`--pre-commit --staged` e `--pre-commit` deram `no leaks found`.

## Validação

| Gate | Comando | Resultado |
|------|---------|-----------|
| critérios 1-3 | `grep -c STRIPE_` em app e web; `grep -cE '^STRIPE_(SECRET_KEY\|WEBHOOK_SECRET)='` na api | `0`, `0`, `2` |
| critério 4 | `grep -rln "STRIPE_\|@repo/payments" apps/app apps/web` (sem `node_modules`/`.next`/`.turbo`) | só `apps/app/env.ts` |
| critério 6 | `grep -c "também listam as duas" docs/FORKING.md` | `0`; o `grep -rn STRIPE docs` não tem menção que mande pôr a chave em app ou web |
| critério 7 | `grep -c "gitleaks stdin" docs/SETUP.md` | `0` |
| critério 11 | `git diff docs/SETUP.md \| grep -c "Um único fixture dispara"` | `1` |
| e2e | `pnpm --filter e2e exec vitest run __tests__/stackEnv.test.ts` | 9/9 |
| app e web | `pnpm turbo run test --filter=app --filter=web` | app 1378/1378, web 315/315, 11 tasks ok |
| lint | `pnpm check` | 1155 arquivos, sem correção |

Typecheck e paridade de i18n não se aplicam: nenhum `.ts` nem chave de tradução mudou.

## A verificar no `/test`

- Os critérios 8 a 10 do plano: medi aqui, mas a regra é o QA medir de novo com o próprio binário. O repro
  está na tabela acima.
- Se a `apps/app` sobe em dev com o `.env.local` copiado do `.env.example` novo. Não subi a app. Pela leitura
  do `apps/app/env.ts:10` ela não estende `payments`, então não deve mudar nada, mas isso é leitura e não
  medição.

## Pendências

Nenhuma bloqueante. `RESEND_*` na web continua fora do escopo, como o plano decidiu.
