# Handoff do `/develop`: repo-hygiene-ci

Segui o plano sem desvio de escopo. Os três itens saíram como estão em `analyze/plan.md`, sem dependência
nova e sem env nova. Nenhum arquivo do working tree de outras tarefas foi tocado: antes de editar,
`git status --porcelain` sobre os cinco alvos saiu vazio.

## Blueprint → arquivos

| Item | Arquivo | Mudança |
|------|---------|---------|
| 1. Gitleaks | `packages/auth/__tests__/serverErrorLogging.test.ts` | `// gitleaks:allow` no fim da linha 62. O valor do token não mudou |
| 1. Gitleaks | `docs/SETUP.md` | parágrafo da varredura de segredo trocado pelo texto proposto no plano (cita o fixture marcado e explica por que o `.gitleaksignore` não serve ao job) |
| 2. `agentRules` | `packages/next-config/index.ts` | `agentRules: false` na config compartilhada |
| 2. `agentRules` | `packages/next-config/__tests__/config.test.ts` | caso `does not let next dev write AGENTS.md into the apps` |
| 3. Dependabot | `.github/dependabot.yml` | `ignore` de `version-update:semver-major` para `stripe` no bloco `npm`, com um comentário de uma linha que registra a restrição externa (a versão maior do SDK fixa uma versão nova da API da Stripe) |

Diff total: 5 arquivos, 16 inserções, 6 remoções.

## Contrato

Nenhum DTO, action do SDK, rota, chave de i18n ou `error.code` foi alterado. A config de `@repo/next-config`
é consumida por `apps/api/next.config.ts` e `apps/web/next.config.ts` (uso direto) e por
`apps/app/next.config.ts` (spread de `...config`).

## Desvios

Nenhum em relação ao plano. O plano B do item 1 (`biome-ignore format`) não foi preciso, porque o Biome
deixou a linha como está (medição abaixo).

## Validação

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint/format | `pnpm check` | exit 0, "Checked 1153 files. No fixes applied." |
| Diretiva no lugar | `grep -n 'gitleaks:allow' packages/auth/__tests__/serverErrorLogging.test.ts` | linha 62, a declaração do `LEAKY_TOKEN` com `// gitleaks:allow` no fim, depois do `pnpm check` (literal omitido aqui) |
| Teste da config | `pnpm --filter @repo/next-config test` | 2 arquivos, 39 testes passando; o caso novo aparece no `--reporter=verbose` |
| Teste do fixture | `pnpm --filter @repo/auth test` | 15 arquivos, 201 testes passando |
| Typecheck | `pnpm --filter app typecheck`, `--filter web`, `--filter api` | exit 0 nos três |
| YAML | `ruby -ryaml -e 'y=YAML.load_file(".github/dependabot.yml"); p y["updates"][0]["ignore"]'` | `[{"dependency-name"=>"stripe", "update-types"=>["version-update:semver-major"]}]`; `updates` segue com 2 entradas e os grupos `production` e `development` intactos |
| i18n | não se aplica | nenhuma chave nova |

### Smoke do `next dev` da `api` (item 2)

A porta 3002 estava livre (`lsof -ti tcp:3002` sem saída). Gravei `apps/api/AGENTS.md` só com o bloco
gerenciado (os dois marcadores e a linha `seed`) e subi `pnpm dev` dentro de `apps/api`, numa sessão do
Claude Code. Derrubei o processo pelo PID e pelo PID da porta; depois, `lsof -ti tcp:3002` saiu vazio.

A primeira subida não prova nada: o instrumentation hook falhou com "Firebase Admin credentials are not
configured" antes de o Next chegar ao sync de `AGENTS.md` (o sync roda depois do `initResult`, em
`next/dist/server/lib/start-server.js:406`). O arquivo semeado ficou no disco.

A segunda subida teve `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` no ambiente, o que faz o Admin SDK inicializar
em modo emulador sem consultar nada. Log literal, sem cores:

```
▲ Next.js 16.4.6 (Turbopack)
- Local:         http://localhost:3002
✓ Ready in 396ms
✓ Running next.config.ts took 101ms
[security] rate limiting is DISABLED (no ARCJET_KEY). Mutating routes accept unlimited requests.
✓ Removed agent rules from AGENTS.md because `agentRules` is disabled.
 ELIFECYCLE  Command failed with exit code 143.
```

O exit 143 é o SIGTERM que eu mandei. Depois da subida:

- `ls apps/api/AGENTS.md`: "No such file or directory";
- `git status --porcelain -- AGENTS.md 'apps/*/AGENTS.md'`: vazio;
- `git diff --stat AGENTS.md`: vazio, então o `AGENTS.md` da raiz não mudou.

O smoke cobriu o caminho de remoção. Não rodei o controle (subir com `agentRules` ligado e ver o arquivo
nascer), porque o caminho de remoção não depende da detecção de agente (`app-info-log.js:128-129`).

Para repetir no `/test`, a subida da `api` sem `.env.local` precisa de `FIRESTORE_EMULATOR_HOST` no
ambiente; sem ele o processo morre antes do sync e o teste dá falso negativo.

## A verificar no `/test` e no CI

- Gitleaks com a diretiva: não medido. O binário não está instalado e, por orientação da rodada, não tentei
  baixar a imagem Docker nem o release. O esperado é `no leaks found` para
  `gitleaks dir packages/auth/__tests__/serverErrorLogging.test.ts` depois da mudança. A medição que vale é
  o job `secrets` da PR, já que o commit altera a linha 62 e ela entra no intervalo varrido.
- Schema do Dependabot e efeito sobre a PR #69: ficam para depois do merge na `main`. O GitHub só valida o
  arquivo da branch padrão.

## Decisões em aberto

- O plano deixou para o `/review` conferir na documentação do GitHub se o `ignore` também bloqueia as
  atualizações de segurança do `stripe`. Não conferi. Se bloquear, uma correção que exista só numa versão
  maior chega apenas pelo alerta de segurança, que ainda está desligado (`docs/PRE-PRODUCTION.md` §9).

## Lacunas de teste conhecidas

- O teste unitário prova o valor da config, não que o Next o respeita. Se uma versão futura renomear
  `agentRules`, o Vitest continua verde e o sinal aparece no `next dev` (o schema estrito do Next reprova
  chave desconhecida).
