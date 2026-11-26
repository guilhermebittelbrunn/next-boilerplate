# Plano: setup-docs-cleanup

Tarefa direta (sem spec, sem card), rodada autônoma do `/cycle`. Dois consertos de configuração e
documentação, sem código de produto.

1. Achado A3 do `specs/reference/AUDIT.md:785`: os `.env.example` da `apps/app` e da `apps/web` publicam
   `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`, que nenhum dos dois apps lê.
2. Achado fora de escopo do `/test` da `repo-hygiene-ci` (`docs/features/repo-hygiene-ci/test/report.md:82-93`):
   o comando local do `docs/SETUP.md:207` (`git diff origin/main | gitleaks stdin`) acusa linhas removidas
   do diff.

## 1. Contexto, objetivo e corte

Quem configura um fork copia os três `.env.example` (`docs/SETUP.md:422-424`, `docs/FORKING.md:140-142`) e
preenche o que vê. Hoje a chave secreta da Stripe aparece em três arquivos, e o caminho natural é colá-la nos
três projetos da Vercel, dois dos quais não precisam dela. Isso aumenta a superfície de vazamento e contradiz
o `SETUP.md:5` ("refletem apenas as vars usadas por este fork"). O `FORKING.md:373-374` contorna o problema
em prosa ("também listam as duas, mas nenhum desses apps as lê"), o que confirma o defeito em vez de
corrigi-lo.

O comando `stdin` do item 2 lê o patch como texto e não distingue `-` de `+`. Quem apaga uma linha que
dispara vê um falso positivo, e o comando diverge do job `secrets` do CI, que usa o modo `git`.

**Corte:** remover as duas linhas `STRIPE_*` de cada `.env.example` (app e web); ajustar o `FORKING.md` que
descreve o estado antigo; trocar o comando local do `SETUP.md` por um que use o mesmo modo do CI.

**Fora de escopo:**

- `RESEND_*` na `apps/web` (achado 🟢 do `AUDIT.md:1254`). Diferente da Stripe, a web **lê** essas vars: o
  `apps/web/env.ts:1,8` estende `email()`. Removê-las exige mexer no `env.ts` e no `package.json`, e isso é
  outra tarefa.
- Reescrever o `AUDIT.md`. Fechar o A3 lá é do `/spec --sync`.
- `docs/INCIDENT-RESPONSE.md:54` ("na Vercel de cada app") lista `STRIPE_*` junto de `ARCJET_KEY`, que existe
  nos três apps. A frase é genérica e continua correta depois da mudança. Não mexer.

Apps impactados: nenhum runtime. Arquivos: `apps/app/.env.example`, `apps/web/.env.example`, `docs/FORKING.md`,
`docs/SETUP.md`. Modo de produto, assinatura, i18n, SDK, API, Firestore, UI: N/A.

## 2. Medições (item 1): quem lê `STRIPE_*`

Instrumento: `grep -rn "STRIPE"` no repositório inteiro, excluindo `node_modules`, `.next`, `.turbo`,
`docs/features/`, `specs/` e o lockfile. Rodado em 2026-11-26.

| Onde | Resultado | Evidência |
|------|-----------|-----------|
| Leitor real | só `@repo/payments` | `packages/payments/keys.ts:13-19`, `packages/payments/index.ts:15,27,34` |
| Quem depende de `@repo/payments` | só a `apps/api` | `grep -rl "@repo/payments" --include=package.json`: `apps/api/package.json:27` e o próprio pacote |
| `apps/api` | lê também no boot | `apps/api/instrumentation.ts:11-20` |
| `apps/app/env.ts` | não estende `payments` | `apps/app/env.ts:10` → `extends: [core(), email(), security()]`. O `STRIPE_LOOKUP_KEY_MAX_LENGTH` em `:7,33` é constante local, não env |
| `apps/web/env.ts` | não estende `payments` | `apps/web/env.ts:8` → `extends: [core(), email(), security()]` |
| `packages/next-config`, `email`, `security`, `auth`, `analytics` | nenhum import de `@repo/payments` nem `STRIPE` | grep sem resultado |
| `turbo.json` | sem `globalEnv`/`passThroughEnv`; `env: []` nas tasks | `turbo.json:3-28` |
| `vercel.json` (app, web, api) | só `ignoreCommand` | os três arquivos |
| `.github/workflows/ci.yml` | nenhum `STRIPE` | grep sem resultado; nenhum job injeta a var |
| `apps/e2e` | nenhum `STRIPE` | `apps/e2e/support/stackEnv.ts:119-140` monta o env de cada servidor a partir do `.env.example` do app; sem as linhas, o servidor da app só deixa de receber duas vars que não lê |
| Testes de app/web que leem `.env.example` | nenhum cita `STRIPE` | `apps/app/__tests__/*`, `apps/web/__tests__/*` |
| `scripts/` | só texto de documento | `scripts/kickoff/documents.mjs:18` |

Conclusão: nenhum dos dois apps lê `STRIPE_*`. Remover é seguro.

### Docs que mandam pôr `STRIPE_*` em app/web

| Doc | Estado | Ação |
|-----|--------|------|
| `docs/FORKING.md:373-374` | diz "só na `api`" e acrescenta que app e web também listam as duas | remover a segunda frase, que vira falsa |
| `docs/FORKING.md:489` | tabela já diz `api` | nada |
| `docs/SETUP.md:104-113` | não nomeia app | nada |
| `docs/SETUP.md:5` | "refletem apenas as vars usadas" | passa a ser verdade para a Stripe; nada |
| `docs/PRE-PRODUCTION.md:551,629` | `apps/api` | nada |
| `docs/PAYMENTS.md:19,47` | descreve o pacote | nada |
| `docs/delivery/cowork-infra-prompt.md:74` | "`STRIPE_*` só no projeto da API" | nada |
| `docs/templates/README.template.md` | nenhum `STRIPE_` | nada |
| `packages/payments/keys.ts:5` (comentário) | "`.env.example` publishes `STRIPE_*=""`" | continua verdade pela `apps/api/.env.example:74-75`; nada |

## 3. Medições (item 2): o comando local do gitleaks

O job `secrets` (`.github/workflows/ci.yml:79-94`) roda `gitleaks git --redact --no-banner --log-opts="<range>" .`.
O modo `git` lê o patch de cada commit e só analisa linhas adicionadas, conhece o caminho do arquivo e honra
`gitleaks:allow`.

Opções avaliadas para "o que ainda não foi commitado":

| Opção | Fidelidade ao CI | Problema |
|-------|------------------|----------|
| `git diff origin/main \| grep '^+' \| gitleaks stdin` | baixa | perde o caminho do arquivo (regras e allowlist por path do gitleaks deixam de valer) e o contexto do patch |
| `gitleaks dir <arquivos alterados>` | média | varre o arquivo inteiro, não só o que entrou; outro detector de fonte; exige montar a lista de arquivos |
| `gitleaks git --pre-commit [--staged]` | alta | mesmo subcomando e mesmo parser de patch do CI (`git diff -U0`, só adições); não vê arquivo não rastreado |

Escolha: `gitleaks git --pre-commit`, nas duas variantes (índice e working tree). Arquivo novo só entra no
diff depois de `git add` (ou `git add -N`), e o texto diz isso.

O `/test` confirma que os flags `--pre-commit` e `--staged` existem no `gitleaks git --help` da 8.30.1 antes de
dar o item por fechado. Se não existirem, cai para `grep '^+'` com a limitação registrada.

### Estado do `SETUP.md` no working tree

`git diff docs/SETUP.md` mostra um único hunk, da `repo-hygiene-ci` (`@@ -210,5 +210,6 @@`, parágrafo
"Não há allowlist"). As linhas 203-208 (bloco de comandos) estão iguais ao `HEAD`. Esta tarefa edita só esse
bloco; o hunk existente fica como está e o commit precisa separar os dois (ver §6).

## 4. Testes

Nenhum teste Vitest novo: não há comportamento de código. A prova é por instrumento direto (grep com
contagem e o binário do gitleaks), descrita nos critérios.

## 5. Blueprint

### `apps/app/.env.example` (remover linhas 26-27 e a linha em branco que sobra)

```diff
 RESEND_FROM=""
 RESEND_TOKEN=""

-STRIPE_SECRET_KEY=""
-STRIPE_WEBHOOK_SECRET=""
-
 # Optional. Without it, @repo/security degrades to a no-op.
 ARCJET_KEY=""
```

### `apps/web/.env.example` (remover linhas 5-6 e a linha em branco que sobra)

```diff
 RESEND_FROM=""
 RESEND_TOKEN=""

-STRIPE_SECRET_KEY=""
-STRIPE_WEBHOOK_SECRET=""
-
 # Optional. Without it, @repo/security degrades to a no-op.
 ARCJET_KEY=""
```

### `docs/FORKING.md:373-374`

```diff
-4. `STRIPE_SECRET_KEY` (`sk_…`) e `STRIPE_WEBHOOK_SECRET` (`whsec_…`) **só na `api`**. Os
-   `.env.example` de `app` e `web` também listam as duas, mas nenhum desses apps as lê.
+4. `STRIPE_SECRET_KEY` (`sk_…`) e `STRIPE_WEBHOOK_SECRET` (`whsec_…`) **só na `api`**, o único app que as lê.
```

### `docs/SETUP.md:203-208`

````diff
-Para rodar localmente antes de abrir a PR, com o binário numa pasta temporária fora do repositório:
+Para rodar localmente antes de abrir a PR, com o binário numa pasta temporária fora do repositório. Os três
+comandos usam o modo `git` do job, que só analisa linhas adicionadas; arquivo novo só aparece no diff depois
+de `git add` (ou `git add -N`):

 ```bash
 gitleaks git --redact --no-banner --log-opts="origin/main..HEAD" .   # commits da branch
-git diff origin/main | gitleaks stdin --redact --no-banner           # o que ainda não foi commitado
+gitleaks git --redact --no-banner --pre-commit --staged .            # o que está no índice
+gitleaks git --redact --no-banner --pre-commit .                     # o que mudou fora do índice
 ```
````

Ordem de implementação: `.env.example` (app, web) → `FORKING.md` → `SETUP.md`. Env nova: nenhuma.

## 6. Commits sugeridos (para o `/review`)

- `chore(app): drop unused Stripe keys from .env.example`
- `chore(web): drop unused Stripe keys from .env.example`
- `docs: keep Stripe keys api-only in FORKING and scan uncommitted changes in git mode`

O `docs/SETUP.md` já tem o hunk da `repo-hygiene-ci` (linhas 210-215). Se aquela tarefa não for commitada
antes, o `/review` usa `git add -p` para levar só o hunk do bloco de comandos neste commit.

## 7. O que o `/test` percorre

Sem runtime: nenhum app sobe, nenhum browser. Instrumentos: `grep -c`, o binário do gitleaks 8.30.1 baixado
com checksum conferido numa pasta do scratchpad (apagada no fim) e um repositório git descartável, também no
scratchpad.

## 8. Critérios de aceite (§9.1)

| # | Critério | Instrumento | Esperado |
|---|----------|-------------|----------|
| 1 | `apps/app/.env.example` não publica `STRIPE_*` | `grep -c STRIPE_ apps/app/.env.example` | `0` |
| 2 | `apps/web/.env.example` não publica `STRIPE_*` | `grep -c STRIPE_ apps/web/.env.example` | `0` |
| 3 | `apps/api/.env.example` continua com as duas | `grep -cE '^STRIPE_(SECRET_KEY\|WEBHOOK_SECRET)=' apps/api/.env.example` | `2` |
| 4 | Nenhum código de app/web passou a depender da Stripe | `grep -rln "STRIPE_\|@repo/payments" apps/app apps/web --exclude-dir=node_modules --exclude-dir=.next` | só `apps/app/env.ts` (constante `STRIPE_LOOKUP_KEY_MAX_LENGTH`) |
| 5 | A suíte da `apps/e2e` que monta o env a partir do `.env.example` continua verde | `pnpm --filter e2e exec vitest run __tests__/stackEnv.test.ts` | passa |
| 6 | Nenhum doc manda pôr `STRIPE_*` em app ou web | `grep -rn "STRIPE" docs --exclude-dir=features --exclude-dir=reports` lido linha a linha; `grep -c "também listam as duas" docs/FORKING.md` | toda menção aponta para `api` ou é genérica; `0` |
| 7 | O `SETUP.md` não recomenda mais `gitleaks stdin` | `grep -c "gitleaks stdin" docs/SETUP.md` | `0` |
| 8 | Os flags do comando novo existem na versão fixada do CI | `gitleaks git --help` (8.30.1) | lista `--pre-commit` e `--staged` |
| 9 | O comando novo não acusa linha removida | repositório descartável: commit com uma linha que dispara a regra `generic-api-key` (token montado em runtime, nunca gravado em doc versionado), depois apagar essa linha e adicionar a mesma com `gitleaks:allow`; rodar o `stdin` antigo e o `--pre-commit` novo | antigo `leaks found: 1`; novo `no leaks found` |
| 10 | O comando novo pega segredo adicionado (controle positivo) | mesmo repositório: adicionar uma linha que dispara, sem a diretiva; rodar `--pre-commit` antes do `git add` e `--pre-commit --staged` depois | `leaks found: 1` nas duas |
| 11 | O hunk da `repo-hygiene-ci` no `SETUP.md` ficou intacto | `git diff docs/SETUP.md` | o hunk `@@ -210` continua com o texto "Um único fixture dispara" |
| 12 | Lint/format sem regressão | `pnpm check` | passa (os `.env.example` e `.md` não são alvo do Biome; serve de sanidade) |

Nenhum segredo, real ou fictício, entra em `docs/features/setup-docs-cleanup/`: o job `secrets` varreria o
próprio relatório.

## Perguntas em aberto

Nenhuma bloqueante. Decisões tomadas pela política do ciclo:

1. **Comando local do gitleaks.** Escolhido `gitleaks git --pre-commit` (com e sem `--staged`), por usar o
   mesmo modo do CI. Alternativa descartada: `grep '^+' | gitleaks stdin`, mais curta, mas perde o caminho do
   arquivo. Recomendação: manter a escolha.
2. **`RESEND_*` na web** fica fora; é o achado 🟢 separado do `AUDIT.md:1254` e exige mudar `env.ts`.
   Recomendação: tarefa direta própria.
