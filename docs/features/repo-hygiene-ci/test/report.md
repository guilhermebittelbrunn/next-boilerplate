# Relatório de QA: repo-hygiene-ci

Rodada autônoma do `/cycle`, 2026-11-26, branch `guilhermebittelbrunn/claude-cycle-full-pipeline` (não
protegida; `HEAD` igual a `origin/main`, nenhum commit da tarefa ainda). Escopo: os cinco arquivos do
`develop/handoff.md`. Não abri browser: o diff só mexe em fixture de teste, config do Next, Dependabot e
documentação, sem tela nem rota. O único processo que subi foi um `next dev` curto da `api` para o item 4.

## Cobertura

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter @repo/next-config test` | 2 arquivos, 39 testes, todos passando. Bate com o handoff |
| `pnpm --filter @repo/auth test` | 15 arquivos, 201 testes, todos passando. Bate com o handoff |
| `pnpm test` (raiz, sem `--force`, JDK 21 no `PATH`) | exit 0, 15 de 15 tasks, 5 do cache, 2m39s |

Detalhe do `pnpm test` da raiz: `app` 154 arquivos/1378 testes, `api` 130/1859, `api:test:emulator`
8/274, `web` 35/315, `@repo/email` 8/209, `@repo/auth` 15/201, `@repo/design-system` 14/172,
`@repo/internationalization` 7/67, `@repo/security` 3/65, `@repo/shared` 5/63, `@repo/analytics` 3/41,
`@repo/next-config` 2/39, `e2e` 3/38, `@repo/payments` 3/19, `@repo/sdk` 4/15. Nenhuma falha.

`uptime` antes: load 4.92 / 5.73 / 9.16. Depois: 21.69 / 13.09 / 11.62, a carga da própria suíte. O
`Timeout starting forks runner` da rodada anterior não se repetiu, então não precisei rodar workspace
separado.

O `java -version` do shell apontava para o JDK 17. Exportei `JAVA_HOME=/opt/homebrew/opt/openjdk@21` antes
do `pnpm test`, como manda o `docs/SETUP.md`.

Não criei teste. O caso de `config.agentRules` já está em `packages/next-config/__tests__/config.test.ts`,
e o fixture de `@repo/auth` não mudou de valor. Paridade de i18n e typecheck não se aplicam: nenhum arquivo
de tradução nem de código de app mudou, e o `/review` já rodou o typecheck dos dois pacotes.

## Decisões de custo de teste

- `@repo/next-config`: o unitário existente prova o valor da chave. Que o Next respeite a chave depende do
  próprio Next, e o smoke do item 4 mediu isso nesta rodada. Teste automatizado com `next dev` de pé seria
  custo permanente para conferir comportamento do framework.
- `@repo/auth`: só ganhou uma diretiva em comentário. A suíte existente cobre o mascaramento.
- Gitleaks: medição de ferramenta externa, feita uma vez com o binário fora do repositório. O job `secrets`
  do CI repete em toda PR.
- `.github/dependabot.yml`: sem teste possível fora do GitHub.

## Critérios de aceite com status

| # | Critério | Status | Meio |
|---|----------|--------|------|
| 1 | O fixture fictício deixa de disparar o Gitleaks | PASS | Gitleaks 8.30.1 local, modos `dir` e `git` |
| 2 | O valor do token e a asserção de mascaramento não mudam | PASS | diff + `@repo/auth` 201 testes |
| 3 | Os artefatos do fluxo não disparam o Gitleaks | PASS | Gitleaks `dir` em `docs/features/` |
| 4 | O `docs/SETUP.md` descreve o repositório como ele está | PASS | Gitleaks `dir` na árvore de `HEAD` e do working tree |
| 5 | `next dev` não escreve `AGENTS.md` nas apps | PASS | smoke do `next dev` da `api` |
| 6 | O valor da config está coberto por teste unitário | PASS | unit, `@repo/next-config` 39 testes |
| 7 | O Dependabot não abre PR de versão maior do `stripe` | 🔒 não verificável | só depois do merge na `main` |
| 8 | O `ignore` não bloqueia atualização de segurança do `stripe` | 🔒 não verificável | seção `ignore` da documentação não lida |
| 9 | A suíte do repositório continua verde | PASS | `pnpm test` da raiz |

## Verificar no `/test`

Binário: `gitleaks_8.30.1_darwin_arm64.tar.gz` do release oficial, baixado numa pasta nova do scratchpad,
fora do repositório. O SHA-256 bateu com o `gitleaks_8.30.1_checksums.txt` do mesmo release. A linha
`linux_x64` desse arquivo é igual ao `GITLEAKS_SHA256` de `.github/workflows/ci.yml`, então o binário local
é a mesma versão do job. Todas as execuções usaram `--redact`. Docker não foi preciso. A pasta do binário e
as cópias temporárias foram apagadas no fim.

1. **O fixture deixa de disparar com a diretiva: confirmado.**
   - `gitleaks dir` na cópia de `HEAD` do arquivo (`git show HEAD:...`): `leaks found: 1`, regra
     `generic-api-key`, linha 62, entropia 4.32.
   - `gitleaks dir` no arquivo do working tree: `no leaks found`.
   - Medi também o modo `git`, que é o do job, num clone descartável a partir de `b7f9124`. Um commit com o
     arquivo do working tree, varrido com `--log-opts="HEAD~1..HEAD"`, deu `no leaks found`. Um commit de
     controle que tirou só o `// gitleaks:allow` deu `leaks found: 1`. A diretiva é o que faz a diferença.
2. **Os artefatos da feature não disparam: confirmado.** `docs/features/repo-hygiene-ci/` (com os arquivos
   deste `/test`) e `docs/features/` inteiro, 86 pastas e cerca de 9,5 MB incluindo os screenshots ignorados
   pelo git: `no leaks found` nos dois.
3. **"Um único fixture dispara": confirmado.** Varri os arquivos versionados de `HEAD` (via `git archive`,
   sem `node_modules` nem `.next`): exatamente 1 achado, `packages/auth/__tests__/serverErrorLogging.test.ts`
   linha 62. Os arquivos do working tree, versionados e não ignorados: 0 achados. A frase do SETUP.md está
   certa.
4. **`next dev` remove o `AGENTS.md` semeado: confirmado.** Detalhe em "Ambiente".
5. **Dependabot: 🔒.** Schema e efeito sobre a PR da versão maior só aparecem depois do merge. A pergunta
   sobre atualização de segurança continua aberta (critério 8).

## Achado fora do escopo: o comando `stdin` do SETUP.md dispara na linha removida

`docs/SETUP.md:207` sugere `git diff origin/main | gitleaks stdin --redact --no-banner` para varrer o que
ainda não foi commitado. Rodado agora, ele dá `leaks found: 1`, e o achado é a linha removida do diff (a
declaração antiga do `LEAKY_TOKEN`, sem a diretiva, com prefixo `-`). O modo `stdin` lê o patch como texto e
não distingue linha removida de adicionada; o modo `git`, que o job usa, só olha o que entrou.

O CI não é afetado: o modo `git` passou na simulação. O efeito é local: quem seguir o SETUP.md antes de
abrir esta PR vê um falso positivo, e o mesmo acontece em qualquer diff futuro que apague uma linha que
dispara. O comando já estava em `HEAD`, então não reprova esta tarefa. Correção sugerida, para o `/review`
ou uma tarefa direta: filtrar só as linhas adicionadas antes do `stdin` (`grep '^+'`) ou trocar por
`gitleaks dir` nos arquivos alterados, e medir de novo.

## Ambiente do e2e

- Porta 3002 livre antes (`lsof -ti tcp:3002` vazio), 8080 também. Nada do usuário foi reutilizado.
- Semeei `apps/api/AGENTS.md` só com os marcadores `BEGIN`/`END:nextjs-agent-rules` e uma linha `seed`, e
  subi `pnpm dev` em `apps/api` com `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` (PID do `pnpm` 14064, do
  servidor 14097). Log: "Ready in 376ms" e, logo depois, "Removed agent rules from AGENTS.md because
  `agentRules` is disabled."
- Depois: `apps/api/AGENTS.md` não existe; `git status --porcelain -- AGENTS.md 'apps/*/AGENTS.md'` vazio; o
  SHA-1 do `AGENTS.md` da raiz é o mesmo de antes da subida.
- Derrubei por PID (14064 e 14097). `ps` não acha mais 14064, 14077 nem 14097, e `lsof -ti tcp:3002` saiu
  vazio. Nenhum `pkill` ou `killall`.

## Lacunas

- Do handoff, "o unitário prova o valor da config, não que o Next o respeita": continua aberta como teste
  automatizado; o smoke desta rodada cobriu o comportamento. Não pede teste novo.
- Do handoff e do review, Gitleaks não medido localmente: fechada nesta rodada (itens 1 a 3).
- Do review, schema do Dependabot e `ignore` contra atualização de segurança: continuam abertas, 🔒 até o
  merge ou até alguém ler a seção `ignore` da referência.
- Nova: o comando `stdin` do SETUP.md (achado acima), fora do escopo desta tarefa.

## Estado de dev alterado

Nenhum. Não criei conta nem gravei dado (o emulador não estava de pé; a variável só serve para o Admin SDK
inicializar sem credencial). O `apps/api/AGENTS.md` semeado foi removido pelo próprio Next. Este arquivo não
traz credencial, token nem o literal do fixture.
