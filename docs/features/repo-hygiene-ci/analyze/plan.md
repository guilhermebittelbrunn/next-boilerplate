# Plano: higiene de repositório e CI (`repo-hygiene-ci`)

Tarefa direta, sem spec (`spec: -`). Junta três itens de configuração listados como tarefas diretas
candidatas em `specs/reference/AUDIT.md`. Não há superfície de runtime nem dependência nova, então o
`/test` não abre browser. O único processo que ele sobe é um `next dev` curto da `apps/api`, sem browser,
para medir o item 2.

## 1. Contexto e escopo

| # | Item | Origem | Decisão do usuário |
|---|------|--------|--------------------|
| 1 | `LEAKY_TOKEN` marcado pelo Gitleaks em `packages/auth/__tests__/serverErrorLogging.test.ts:62` | `AUDIT.md:334-336`, `:1800` | D22, 2026-11-24: `gitleaks:allow` na linha ou impressão digital num `.gitleaksignore`. Falta escolher entre os dois |
| 2 | `next dev` grava `AGENTS.md` em `apps/app`, `apps/web` e `apps/api` | `AUDIT.md:1619`, `:1857` | não precisa de decisão: o achado já oferece as duas saídas e esta análise escolhe uma |
| 3 | `ignore` de versão maior do `stripe` no `.github/dependabot.yml` | `AUDIT.md:1679` (D16) | D16, respondida em 2026-11-24 pela recomendação: "fechar a #69 com `ignore` de versão maior do `stripe`" |

Os três entram. O item 3 está decidido: a D16 aparece como respondida em `AUDIT.md:460-461` e `:1679`.

Fora de escopo:

- fechar a PR #69 do Dependabot, mergear a #68 e as tarefas da #66, #67 e #70. São ações no GitHub ou tarefas
  diretas próprias (`AUDIT.md:315`, `:341-343`);
- branch protection exigindo o check `secrets` (`AUDIT.md:1892`, `PRE-PRODUCTION.md` §9): infra, passo
  manual;
- atualizar `specs/reference/AUDIT.md`: isso é do `/spec --sync`.

Apps impactados: nenhum em runtime. Arquivos: um teste de `packages/auth`, a config compartilhada
`packages/next-config`, `.github/dependabot.yml` e `docs/SETUP.md`. Modo de produto, assinatura, dados,
SDK, API, i18n, front e impersonação: N/A.

### Estado do working tree

`git status --porcelain` sobre os alvos (`.gitignore`, `.github/`, `packages/next-config`,
`packages/auth/__tests__/serverErrorLogging.test.ts`, os três `next.config.ts`, `docs/SETUP.md` na parte do
Gitleaks) não mostrou nenhuma mudança pendente em 2026-11-26. As cinco tarefas não commitadas e as
mudanças em `specs/` não tocam nesses arquivos. `docs/SETUP.md` precisa ser conferido de novo no `/develop`,
porque outra tarefa pode mexer nele.

## 2. Item 1: Gitleaks e o `LEAKY_TOKEN`

### Como o job roda

`.github/workflows/ci.yml:80-95`: o passo "Scan the new commits" chama
`gitleaks git --redact --no-banner --log-opts="$range" .`, com Gitleaks 8.30.1 (`ci.yml:69`). O modo é
`git` e varre só o intervalo de commits da PR (`BASE..HEAD`) ou do push (`BEFORE..SHA`). O repositório não
tem `.gitleaksignore` nem `.gitleaks.toml` (`ls .gitleaks*`: nenhum arquivo).

### Escolha: `gitleaks:allow` na linha

| Critério | `gitleaks:allow` inline | `.gitleaksignore` |
|----------|-------------------------|-------------------|
| Funciona no modo `git` | sim: o Gitleaks descarta o achado quando a linha contém `gitleaks:allow`, em qualquer modo (`git`, `dir`, `stdin`) | sim, mas só para a impressão digital exata |
| Formato da impressão digital no modo `git` | não se aplica | `<commit>:<arquivo>:<regra>:<linha>`. O SHA do commit faz parte dela |
| Sobrevive a rebase, squash e ao merge da PR | sim: vai junto com a linha | não. Rebase e squash geram SHA novo. A PR é mergeada por squash (os commits da `main` são `(#NN)`), então o commit que a `main` varre no push não é o que a PR varreu |
| Protege o próximo commit que tocar a linha | sim | não. O achado seguinte tem outro SHA, que não se conhece de antemão |
| Funciona no comando local de `docs/SETUP.md:206-207` (`git` e `stdin`) | sim | `stdin` não tem commit, então a impressão digital não casa |

O `.gitleaksignore` só resolve o achado do commit que já reprovou, e esse commit nem volta a ser varrido,
porque o job olha só os commits novos (`AUDIT.md:97-98`). O risco real é o próximo commit que mexer na
linha, e só o inline cobre esse caso.

Sobre `.claude/rules/code-comments.md`: `gitleaks:allow` é diretiva lida por ferramenta, como um
`biome-ignore` ou `eslint-disable`, e não comentário explicativo. A regra proíbe comentar o óbvio e citar o
fluxo; não fala de diretiva. A diretiva vai sozinha, sem texto de justificativa e sem citar D22, auditoria
ou PR.

### Mudança

```diff
 // packages/auth/__tests__/serverErrorLogging.test.ts:62
-const LEAKY_TOKEN = "…";
+const LEAKY_TOKEN = "…"; // gitleaks:allow
```

O literal foi omitido aqui (está na linha 62 do teste), porque este arquivo também é versionado e o
Gitleaks varreria a cópia. O valor não muda: o teste depende dele para provar que o token sai mascarado do log.

A linha passa a ter 82 colunas e o `biome.jsonc:8` fixa `lineWidth: 80`. O formatador não quebra string
literal e comentário de fim de linha não conta para a largura, então o esperado é que `pnpm check` passe
sem mexer. Se o Biome reformatar, aceite o que `pnpm fix` produzir, desde que `gitleaks:allow` continue na
mesma linha do literal. Se ele mover o comentário para outra linha, a diretiva deixa de valer: nesse caso,
use `// biome-ignore format: <motivo curto>` acima da declaração. O `/review` mede.

### Documentação

`docs/SETUP.md:210-214` diz que "nenhum fixture do repositório dispara" e apresenta as duas saídas como
equivalentes. As duas afirmações deixam de ser verdade. Texto proposto:

```markdown
Não há allowlist (`.gitleaks.toml`). Um único fixture dispara com a configuração padrão, o token fictício de
`packages/auth/__tests__/serverErrorLogging.test.ts`, e a linha dele leva o comentário `gitleaks:allow`.
Se aparecer outro falso positivo, use o mesmo comentário na linha. Um `.gitleaksignore` não serve para o
job: no modo `git` a impressão digital inclui o SHA do commit, que muda no rebase e no squash do merge, e
o próximo commit que tocar a linha gera outra. Um segredo de verdade não se resolve assim: revogue a chave
no provedor e reescreva a branch antes do merge.
```

### Como medir

- Local: o `gitleaks` não está instalado (`which gitleaks`: não encontrado). O Docker está de pé (servidor
  29.7.2), mas o pull de `zricethezav/gitleaks:v8.30.1` não terminou em 180 s nesta análise, então nada foi
  medido aqui. O `/test` tenta, na ordem:
  1. `docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:v8.30.1 dir /repo/packages/auth/__tests__/serverErrorLogging.test.ts --no-banner -v`,
     antes e depois da mudança (antes: `leaks found: 1` com a regra identificada; depois: `no leaks found`);
  2. o binário 8.30.1 do release, baixado numa pasta temporária fora do repositório, como manda
     `docs/SETUP.md:203`, com o mesmo comando;
  3. se nenhum dos dois baixar, marca 🔒 e a medição fica para o CI.
- CI: o job `secrets` da PR. O commit desta tarefa altera a linha 62, então ela entra no intervalo
  varrido. O job verde com a linha no diff prova o inline no modo `git` real. É a medição que vale.

## 3. Item 2: `AGENTS.md` gerado pelo `next dev`

### O que o Next 16.4.6 faz

A versão instalada é 16.4.6 em todas as apps e em `packages/next-config` (`package.json` de cada um).

- `node_modules/next/dist/server/config-shared.d.ts:1744-1753`: a opção `agentRules?: boolean`, default
  `true`. Quando `next dev` detecta um agente de código e não há bloco gerenciado, ele cria `AGENTS.md` na
  raiz do projeto. "Set to `false` to disable this behavior."
- `dist/server/config-schema.js:545`: `agentRules: z.boolean().optional()` no schema estrito. O nome existe
  e é aceito; não é chute.
- `dist/server/lib/start-server.js:406`: `syncAgentRulesForDev(dir, initResult.agentRules !== false)`. O
  `dir` é o diretório do projeto Next, ou seja, `apps/<app>`, nunca a raiz do monorepo.
- `dist/server/lib/app-info-log.js:128-133`: com a opção em `false`, chama `removeAgentRulesFiles(dir)`.
- `dist/server/lib/generate-agent-files.js` (`removeManagedBlockFromFile`): tira o bloco entre
  `<!-- BEGIN:nextjs-agent-rules -->` e `<!-- END:nextjs-agent-rules -->` e apaga o arquivo se não sobrar
  nada. Um `apps/*/AGENTS.md` que já esteja no disco de alguém é limpo na próxima subida.

### Escolha: `agentRules: false` na config compartilhada

- `git ls-files | grep -i agents.md`: os versionados são `AGENTS.md` (raiz) e
  `.claude/skills/vercel-react-best-practices/AGENTS.md`. Nenhum em `apps/*`.
- Uma regra no `.gitignore` esconderia o sintoma e deixaria o arquivo no disco, onde o Claude Code o lê como
  instrução ao lado do `CLAUDE.md` aninhado. O texto gerado manda o agente "commit it with your work", o
  contrário do que este repo quer. Também esconderia um `apps/<app>/AGENTS.md` que um fork decida versionar.
- Desligar na origem não gera nada, não esconde nada e não afeta o `AGENTS.md` da raiz, porque o Next só
  escreve em `apps/<app>`.
- Pôr em `packages/next-config/index.ts` cobre as três apps de uma vez: `apps/api/next.config.ts:4` e
  `apps/web/next.config.ts:4` usam `config` direto, e `apps/app/next.config.ts:16-17` espalha
  `...config`. A `apps/email` não tem `next.config` e o preview dela é do `react-email`, fora daqui.

Para o `experimental.agentFeedback`, nada a fazer: ele só escreve quando está configurado e com telemetria
ligada (`start-server.js:407-414`), e o repo não o configura.

### Mudança

```diff
 // packages/next-config/index.ts
 export const config: NextConfig = {
+    agentRules: false,
     poweredByHeader: false,
     images: {
         formats: ["image/avif", "image/webp"],
     },
 };
```

Sem comentário: o nome da opção já explica.

Teste no nível mais barato, no arquivo que já cobre a config (`packages/next-config/__tests__/config.test.ts`):

```ts
it("does not let next dev write AGENTS.md into the apps", () => {
    expect(config.agentRules).toBe(false);
});
```

O teste prova que a config tem o valor. Que o Next o respeita vem da leitura do código acima e da medição
do `/test`.

### Como medir

- Vitest: `pnpm --filter @repo/next-config test`.
- Typecheck: `pnpm --filter app typecheck` (e `web`, `api`). O tipo `NextConfig` 16.4.6 tem `agentRules`, e
  um nome errado quebraria aqui.
- `/test`, sem browser: grava em `apps/api/AGENTS.md` um arquivo só com o bloco gerenciado (os dois
  marcadores e uma linha no meio), sobe `pnpm --filter api dev` a partir de uma sessão do Claude Code (o
  Next detecta o agente pelo ambiente), espera o "Ready" e derruba. Esperado: o log traz "Removed agent rules
  from AGENTS.md because `agentRules` is disabled", e `apps/api/AGENTS.md` deixa de existir. Depois,
  `git status --porcelain -- AGENTS.md 'apps/*/AGENTS.md'` sai vazio e `git diff --stat AGENTS.md` não
  mostra mudança na raiz.

## 4. Item 3: `ignore` de versão maior do `stripe`

A PR #69 do Dependabot sobe o `stripe` de versão maior e reprova no `verify` e no `e2e`
(`AUDIT.md:1679`), por causa da versão da API fixada em `packages/payments/index.ts:5`
(`API_VERSION = "2025-09-30.clover"`) e usada em `:21`. O pacote está em `packages/payments/package.json:13`
(`"stripe": "^19.1.0"`). A versão maior do SDK da Stripe acompanha uma versão nova da API e pede migração
manual. As menores e os patches seguem no grupo `production`.

### Mudança

```diff
 # .github/dependabot.yml
   - package-ecosystem: npm
     directory: /
     schedule:
       interval: weekly
     open-pull-requests-limit: 5
+    # A major of the Stripe SDK pins a new API version and needs a manual migration.
+    ignore:
+      - dependency-name: stripe
+        update-types: ["version-update:semver-major"]
     groups:
```

O comentário entra porque registra uma restrição externa, uma das duas exceções de
`.claude/rules/code-comments.md` §2. Segue o estilo do comentário que já abre o arquivo, em inglês.

### Como medir

- Sintaxe local: `ruby -ryaml -e 'p YAML.load_file(".github/dependabot.yml")["updates"][0]["ignore"]'`
  (Ruby do sistema; nesta análise o mesmo comando leu o arquivo atual e contou 2 entradas em `updates`).
- Schema do Dependabot: 🔒 até o merge na `main`. O GitHub só valida o arquivo da branch padrão (aba
  Insights, Dependency graph, Dependabot). O `/test` registra como 🔒.
- Efeito: 🔒. A PR #69 não fecha sozinha. Depois do merge, o usuário fecha a #69 no GitHub, e o próximo ciclo
  semanal não deve reabri-la.

## 5. Blueprint e ordem

Arquivos tocados:

```
packages/auth/__tests__/serverErrorLogging.test.ts   (item 1, 1 linha)
docs/SETUP.md                                         (item 1, parágrafo de :210-214)
packages/next-config/index.ts                         (item 2, 1 linha)
packages/next-config/__tests__/config.test.ts         (item 2, 1 caso)
.github/dependabot.yml                                (item 3, 4 linhas)
```

Env nova: nenhuma. Dependência nova: nenhuma. Nada a configurar por fork.

Ordem de commit sugerida (o `/review` decide a branch e os nomes):

1. `test(auth): mark the fictitious JWT fixture as a gitleaks false positive`
2. `chore(next-config): stop next dev from writing AGENTS.md into the apps`
3. `ci: ignore major Stripe SDK updates in Dependabot`
4. `docs: describe the inline gitleaks allow for test fixtures` (o `docs/SETUP.md`)
5. `docs(features): repo-hygiene-ci`

## 6. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **O job `secrets` passa com a linha do `LEAKY_TOKEN` no diff**
  O commit que acrescenta `// gitleaks:allow` à linha 62 de `serverErrorLogging.test.ts` entra no intervalo
  varrido pelo `gitleaks git`, e o job `secrets` da PR termina verde. O valor do token não muda, e o teste
  `serverErrorLogging` continua passando com a mesma asserção de mascaramento. Instrumento: o check
  `secrets` da PR no GitHub (`gh pr checks`); localmente, o Gitleaks 8.30.1 via Docker ou binário temporário
  em modo `dir` sobre o arquivo, com `leaks found: 1` antes e `no leaks found` depois. Se nenhum dos dois
  baixar, a medição local fica 🔒.

- [ ] **A diretiva sobrevive ao formatador**
  Depois de `pnpm check`, `gitleaks:allow` continua na mesma linha do literal. Se o Biome mover o comentário,
  a diretiva para de valer e o critério falha. Instrumento: `pnpm check` sem diff e
  `grep -n 'gitleaks:allow' packages/auth/__tests__/serverErrorLogging.test.ts` mostrando a linha da
  declaração.

- [ ] **O repositório não ganha `.gitleaksignore` nem `.gitleaks.toml`**
  A marcação é só inline, porque a impressão digital do modo `git` carrega o SHA e não sobrevive ao squash.
  Instrumento: `git ls-files .gitleaksignore .gitleaks.toml` vazio.

- [ ] **`docs/SETUP.md` descreve o fixture marcado e a escolha do inline**
  O parágrafo da varredura de segredo deixa de dizer que nenhum fixture dispara, cita o arquivo marcado e
  explica por que o `.gitleaksignore` não serve ao job. Instrumento: leitura do trecho e
  `grep -n 'nenhum fixture' docs/SETUP.md` vazio.

- [ ] **A config compartilhada desliga o `agentRules`**
  `config.agentRules` é `false` em `@repo/next-config`, e as três apps herdam o valor. O typecheck das três
  apps passa, o que confirma que o nome existe no tipo `NextConfig` do Next 16.4.6. Instrumento:
  `pnpm --filter @repo/next-config test` e `pnpm --filter app typecheck`, `--filter web` e `--filter api`.

- [ ] **`next dev` não cria `AGENTS.md` e limpa o que já existia**
  Com um `apps/api/AGENTS.md` contendo só o bloco gerenciado, subir `pnpm --filter api dev` numa sessão de
  agente imprime "Removed agent rules from AGENTS.md because `agentRules` is disabled" e apaga o arquivo.
  O `AGENTS.md` da raiz não muda. Instrumento: log do `next dev`, `ls apps/api/AGENTS.md` (ausente) e
  `git diff --stat AGENTS.md` vazio. Sem browser.

- [ ] **O Dependabot ignora a versão maior do `stripe`**
  O bloco de `npm` em `.github/dependabot.yml` tem um `ignore` para `stripe` com
  `version-update:semver-major`, e menores e patches seguem no grupo `production`. O arquivo é YAML válido.
  Instrumento: `ruby -ryaml -e 'p YAML.load_file(".github/dependabot.yml")["updates"][0]["ignore"]'`. A
  validação do schema pelo GitHub e o efeito sobre a PR #69 ficam 🔒 até o merge na `main`.

## 7. Riscos

- Se o pull da imagem continuar falhando, a única prova do item 1 é o CI. Como o job não é check exigido
  (`AUDIT.md:1892`), uma PR pode entrar com ele vermelho; o `/review` precisa olhar o check antes do merge.
- Uma versão futura do Next pode renomear `agentRules`. O schema estrito (`config-schema.js:545`) reprovaria
  a subida com chave desconhecida, e o teste de config continua verde, então o sinal aparece no `next dev`,
  não no Vitest.
- Esta análise não conferiu na documentação do GitHub se o `ignore` também vale para as atualizações de
  segurança. Se valer, uma correção que só exista numa versão maior do `stripe` não viria como PR
  automática, e só o alerta de segurança avisaria. Os alertas ainda estão desligados
  (`PRE-PRODUCTION.md` §9). O `/review` confere na documentação e registra.

## Perguntas em aberto

Nenhuma bloqueante. Decisões tomadas pela política do `/cycle`:

1. Item 1: inline em vez de `.gitleaksignore`, pelas razões da §2. Recomendação default: manter.
2. Item 2: `agentRules: false` na config compartilhada em vez de `.gitignore`. Recomendação default:
   manter.
3. Item 3: entra, porque a D16 está respondida. Fechar a #69 no GitHub continua sendo ação do usuário.

## Referências não lidas

Nenhuma. A documentação do Gitleaks não foi aberta nesta análise; o comportamento do `gitleaks:allow` e o
formato da impressão digital no modo `git` vêm do README do projeto, e o `/test` mede o primeiro.
