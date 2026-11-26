# Revisão: Stripe só na api e gitleaks local no modo git

Escopo: `apps/app/.env.example`, `apps/web/.env.example`, `docs/FORKING.md:373` e os hunks 1 e 2 de
`docs/SETUP.md` (com `-U0`: `@@ -203` e `@@ -207`). O hunk 3 (`@@ -210,5 +213,6`) é da `repo-hygiene-ci`,
já revisado lá, e não foi relido.

## Branch

- Atual: `guilhermebittelbrunn/claude-cycle-full-pipeline`. Não é protegida. Regex: `BRANCH INVALIDA`.
- Proposta, herdada do plano combinado: `feat/admin-account-forms-and-session-revocation`. Regex:
  `branch OK`. A branch ainda não existe localmente.
- Nada foi criado nem renomeado: a rodada é do `/cycle`, que não cria branch. O `/review` cria a branch a
  partir da atual antes do primeiro commit.

## Revisão: `.env.example` de app e web, `FORKING.md`, `SETUP.md`

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `docs/features/setup-docs-cleanup/develop/handoff.md` (seção "Separar o `SETUP.md` no commit") diz que,
  se a `repo-hygiene-ci` for commitada antes, "basta `git add docs/SETUP.md`". No plano combinado isso não
  vale: o commit dela (`docs: describe the inline gitleaks allow for test fixtures`) faz
  `git add docs/SETUP.md` do arquivo inteiro, e o working tree já tem os hunks desta tarefa. Executado como
  está, esse commit levaria as duas mudanças. Qualquer ordem exige um passo de staging parcial no primeiro
  commit que tocar o arquivo. A ordem escolhida está em "Plano de commits".

### 🟢 Sugestão / nit

- `docs/SETUP.md:104-108`: a tabela de Stripe não tem a coluna de app que as outras seções têm. A prosa da
  linha 110 fala só da API, então não induz ninguém a pôr a chave em app ou web. Fica como está: editar ali
  criaria um quarto hunk no mesmo arquivo e complicaria o staging.

### ✅ OK

- Nenhum leitor de `STRIPE_*` em app ou web. `apps/app/env.ts:10` e `apps/web/env.ts:8` estendem só
  `core()`, `email()` e `security()`. O único `STRIPE_` em `apps/app` é a constante
  `STRIPE_LOOKUP_KEY_MAX_LENGTH` (`apps/app/env.ts:7`). `@repo/payments` só aparece como dependência em
  `apps/api/package.json`, e nenhum outro pacote importa dele. Sem `STRIPE` em `turbo.json`,
  `apps/app/vercel.json`, `apps/web/vercel.json`, `.github/` e `apps/e2e`.
- Nenhum doc fora de `docs/features/` manda pôr `STRIPE_*` em app ou web. As menções em `docs/` e
  `.claude/` apontam para a api (`FORKING.md:373`, `FORKING.md:488`, `PRE-PRODUCTION.md:551`,
  `PRE-PRODUCTION.md:629`, `delivery/cowork-infra-prompt.md:74`) ou são genéricas (`SECURITY.md`,
  `PAYMENTS.md`, `ROPA.md`, `SUBPROCESSORS.md`, `INCIDENT-RESPONSE.md:54`, que fala da Vercel "de cada app"
  ao rodar qualquer credencial vazada). Não há README por app.
- `docs/FORKING.md:373` bate com a medição: a api é o único app que lê as duas chaves.
- `docs/SETUP.md:203-211` bate com o `ci.yml`. O job roda `gitleaks git --redact --no-banner
  --log-opts="$range" .` (`.github/workflows/ci.yml:95`), na versão 8.30.1 (`ci.yml:69`). Os dois comandos
  novos usam o mesmo subcomando `git`, e a frase sobre `git add -N` corresponde às duas últimas linhas da
  tabela de prova do handoff. Commits da branch, índice e o que está fora do índice cobrem o que o antigo
  `git diff origin/main | gitleaks stdin` cobria, sem o falso positivo de linha removida.
- Os `.env.example` têm um hunk cada e `FORKING.md` tem um hunk só, todos desta tarefa. Nenhum outro plano
  do combinado lista esses arquivos.
- Varredura de segredo em `docs/features/setup-docs-cleanup/`: procurei hex ou base64 com 32 caracteres ou
  mais, `sk_live_`, `sk_test_`, `whsec_` seguido de valor, `senha`, `password` e endereço de e-mail. Sem
  acerto. O handoff cita o sha256 do binário só abreviado (`b40ab0ae…a6a5`) e diz que o token do
  `openssl rand` não foi gravado. Nenhum valor dele aparece nos artefatos.

### 👁 Verificar no `/test`

- Critérios 8 a 10 do plano, com o binário do próprio QA (8.30.1): `gitleaks git --help` lista
  `--pre-commit` e `--staged`, e o repositório descartável reproduz a tabela do handoff, com token gerado
  em runtime e nunca gravado em arquivo.
- `apps/app` e `apps/web` sobem com um `.env.local` copiado do `.env.example` novo. Pela leitura do
  `env.ts`, nada muda. Medir só se o `/test` já for subir os apps por outro motivo; senão, a leitura basta.

## Correções aplicadas

Nenhuma. Nada no diff precisava de edição.

## Raio de impacto

Nenhum contrato mudou. Quem copia `apps/app/.env.example` ou `apps/web/.env.example` deixa de ver as duas
chaves, e nenhum código desses apps as lê. `apps/e2e` não lê `STRIPE_*`.

## Lacunas de teste

- Do handoff: os critérios 8 a 10 continuam abertos para o `/test` remedir. Nenhuma lacuna nova.

## Decisões em aberto

Nenhuma. A ordem do `SETUP.md` foi decidida com medição (abaixo).

## Gates

| Comando | Resultado |
|---------|-----------|
| `pnpm check` | número do handoff: 1155 arquivos, nenhum fix. Nenhum arquivo foi editado nesta revisão |
| Typecheck | não se aplica: nenhum `.ts` mudou |
| Paridade de i18n | não se aplica |
| Staging do `SETUP.md` | as duas ordens simuladas num índice temporário (`GIT_INDEX_FILE` no scratchpad); o índice real seguiu vazio |

## Plano de commits

Plano combinado de `docs/features/focus-e2e-precondition/review/review.md` (42 commits), agora com 46. Esta
tarefa entra como 26, 27, 34 e 46. Os demais mantêm conteúdo e ordem relativa. Antes do primeiro commit,
`git diff --cached --stat` tem de sair vazio (conferido nesta revisão: vazio).

### Ordem do `SETUP.md`

Simulei as duas ordens num índice temporário:

- **A** (commit da `repo-hygiene-ci` primeiro, só com o hunk 3 via `-U0`, e depois `git add` do arquivo
  neste commit): funciona, mas o patch do hunk 3 isolado leva o cabeçalho `+213` de um arquivo que já tem
  as linhas desta tarefa, e o commit antigo deixa de poder ser executado como o plano dele descreve.
- **B** (este commit primeiro, com os hunks 1 e 2 via `-U0`, e depois o commit da `repo-hygiene-ci` com
  `git add docs/SETUP.md` inteiro): funciona, o patch tem coordenadas coerentes porque os hunks 1 e 2 são os
  primeiros do arquivo, e o commit antigo continua exatamente como está escrito no plano dele.

Fica a B: o passo especial mora num único commit, o novo, e está descrito aqui.

- Commit 34:
  ```bash
  P=<scratchpad>/setup-docs-cleanup.patch
  git diff -U0 docs/SETUP.md | awk '/^@@/{n++} n<3' > "$P"
  git apply --cached --unidiff-zero --check "$P" && git apply --cached --unidiff-zero "$P"
  git add docs/FORKING.md
  ```
  Antes de commitar: `git diff --cached docs/SETUP.md | grep -c "Um único fixture"` sai `0` e
  `git diff --cached docs/SETUP.md | grep -c "pre-commit --staged"` sai `1`. Depois do commit,
  `git diff docs/SETUP.md` mostra só o parágrafo "Não há allowlist".
- Commit 35 (o antigo 32): `git add docs/SETUP.md`, sem mudança. Depois dele, `git diff docs/SETUP.md` sai
  vazio.

### Trecho alterado

1 a 25: sem mudança.

26. `chore(app): stop listing Stripe keys in the app env example` (esta tarefa)
    - `apps/app/.env.example`
    - Corpo: "The app never reads STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET: its env schema does not extend
      the payments keys and no code imports @repo/payments. Only the api does."
27. `chore(web): stop listing Stripe keys in the web env example` (esta tarefa)
    - `apps/web/.env.example`
    - Corpo: o mesmo, trocando "app" por "web".
28. `feat(internationalization): add the admin account copy` (antigo 26)
29. `fix(internationalization): add the USERS_SESSIONS_NOT_REVOKED message` (antigo 27)
30. `docs(api): list requireOwnAccountApi among the guards` (antigo 28, `git add -p`, só o 1.º hunk)
31. `docs(api): name organization as the repository without a mapper` (antigo 29)
32. `docs: document the own-account guard in the auth panel and review checklist` (antigo 30)
33. `docs: describe how a refused session revocation is reported` (antigo 31)
34. `docs: run local gitleaks in git mode and keep Stripe keys on the api` (esta tarefa)
    - `docs/SETUP.md` (hunks 1 e 2, via `git apply --cached --unidiff-zero`), `docs/FORKING.md`
    - Corpo: "Piping git diff into gitleaks stdin flags removed lines, so a secret deleted from the branch
      still fails the local check. The pre-commit mode of the git subcommand only scans added lines, like
      the CI job; --staged covers the index and the plain form covers the working tree. FORKING no longer
      says app and web list the Stripe keys."
35. `docs: describe the inline gitleaks allow for test fixtures` (antigo 32, `git add docs/SETUP.md`, depois
    do 34)
36. `docs: stop citing the user repository as one without a mapper` (antigo 33)
37. `docs(claude): point the new-api-route skill at a repository without a mapper` (antigo 34)
38. `docs(features): app-form-layout-centered` (antigo 35)
39. `docs(features): admin-own-account` (antigo 36)
40. `docs(features): app-test-suite-stability` (antigo 37)
41. `docs(features): account-avatar-polish` (antigo 38)
42. `docs(features): auth-revocation-failure` (antigo 39)
43. `docs(features): repo-hygiene-ci` (antigo 40)
44. `docs(features): stripe-customer-lookup-mapper` (antigo 41)
45. `docs(features): focus-e2e-precondition` (antigo 42)
46. `docs(features): setup-docs-cleanup` (esta tarefa)
    - `docs/features/setup-docs-cleanup/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
      `review/review.md`, mais o que o `/test` gravar)

Arquivos e corpos dos commits antigos continuam os dos planos de origem. Repetir a varredura de segredo no
que o `/test` gravar antes do commit 46.

Título de PR sugerido: `feat: admin own account area, centered form pages, session revocation errors, CI hygiene, user profile mapper, focus E2E precondition and setup docs cleanup`.

Depois do último commit aprovado, o `/review` pergunta se deve rodar
`git push -u origin feat/admin-account-forms-and-session-revocation`.

### Commits realizados

(preenchido pelo orquestrador)
