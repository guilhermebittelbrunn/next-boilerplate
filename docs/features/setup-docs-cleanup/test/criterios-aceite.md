# Critérios de Aceite (Checklist)

Tarefa de configuração e documentação: `apps/app/.env.example`, `apps/web/.env.example`, `docs/FORKING.md`
e o bloco de comandos do gitleaks em `docs/SETUP.md`. Não há tela, rota, contrato, código de erro nem chave
de tradução nova, então autorização, ownership, modo de produto, tema, responsivo e idiomas não se aplicam.

- [x] **O `.env.example` da app não publica `STRIPE_*`**
  `apps/app/.env.example` não tem `STRIPE_SECRET_KEY` nem `STRIPE_WEBHOOK_SECRET`, e não sobra linha em
  branco dupla no lugar delas. Quem copia o arquivo para `.env.local` não recebe nenhuma chave da Stripe, e
  a app continua sem ler essas variáveis: `apps/app/env.ts` estende só `core()`, `email()` e `security()`.

- [x] **O `.env.example` da web não publica `STRIPE_*`**
  `apps/web/.env.example` segue a mesma regra da app. O `env.ts` da web também não estende as chaves de
  `@repo/payments`, então a ausência das duas variáveis não muda a validação do ambiente na subida.

- [x] **A api continua publicando as duas chaves da Stripe**
  `apps/api/.env.example` mantém `STRIPE_SECRET_KEY=""` e `STRIPE_WEBHOOK_SECRET=""`. Vazias, as duas
  desligam a cobrança: `packages/payments/keys.ts` converte string vazia em `undefined` com `||`, e a api
  sobe sem Stripe.

- [x] **Nenhum código de app ou web depende da Stripe**
  Fora de `node_modules`, `.next` e `.turbo`, o único arquivo de `apps/app` e `apps/web` que contém
  `STRIPE_` ou `@repo/payments` é `apps/app/env.ts`, por causa da constante `STRIPE_LOOKUP_KEY_MAX_LENGTH`.
  Ela limita o tamanho de uma chave pública e não lê segredo.

- [x] **O ambiente da suíte E2E monta app e web sem `STRIPE_*`**
  `apps/e2e/support/stackEnv.ts` reconstrói o ambiente de cada app a partir do `.env.example` real. Com os
  arquivos novos, o ambiente da app e o da web não têm nenhuma chave `STRIPE_*`, e o da api tem as duas. Os
  9 testes de `apps/e2e/__tests__/stackEnv.test.ts` continuam passando.

- [x] **Nenhum doc manda pôr `STRIPE_*` em app ou web**
  `docs/FORKING.md:373` diz que as duas chaves vão "só na `api`, o único app que as lê", e a frase antiga
  ("também listam as duas") não existe mais. As outras menções em `docs/` apontam para a api ou são
  genéricas.

- [x] **O `SETUP.md` não recomenda mais `gitleaks stdin`**
  O bloco de comandos locais usa só o subcomando `git`, o mesmo do job `secrets` do CI: um comando para os
  commits da branch, um para o índice (`--pre-commit --staged`) e um para o que mudou fora do índice
  (`--pre-commit`). O parágrafo de introdução avisa que arquivo novo só entra no diff depois de `git add` ou
  `git add -N`.

- [x] **Os flags novos existem na versão do CI**
  O gitleaks 8.30.1, a versão fixada em `.github/workflows/ci.yml`, lista `--pre-commit` ("scan using git
  diff") e `--staged` ("scan staged commits") em `gitleaks git --help`.

- [x] **Os comandos novos não acusam segredo removido**
  Uma linha com segredo que existia na base e foi apagada não reprova nenhum dos dois comandos novos, nem
  com a remoção fora do índice nem dentro dele. O mesmo vale quando a linha volta com o comentário
  `gitleaks:allow`. O `git diff <base> | gitleaks stdin` antigo reprova os três casos, porque analisa as
  linhas com `-` do diff.

- [x] **Os comandos novos pegam segredo adicionado**
  Uma linha nova com segredo reprova `--pre-commit` enquanto está fora do índice e `--pre-commit --staged`
  depois do `git add`. Cada variante só enxerga o seu lado do índice, por isso o doc lista as duas. Um
  arquivo novo sem `git add` passa despercebido; com `git add -N` o `--pre-commit` o reprova.

- [x] **No repositório real os comandos novos passam**
  Rodados neste working tree, os três comandos do `SETUP.md` terminam com `no leaks found` e código de saída
  0. O fixture de `packages/auth/__tests__/serverErrorLogging.test.ts` está modificado e leva
  `gitleaks:allow`: o modo `git` respeita a diretiva na linha adicionada e ignora a linha removida.

- [x] **O hunk da `repo-hygiene-ci` no `SETUP.md` ficou intacto**
  O parágrafo "Não há allowlist", com o texto "Um único fixture dispara", continua no diff de
  `docs/SETUP.md`, separado do bloco de comandos desta tarefa.

- [x] **Lint, format, typecheck e testes sem regressão**
  `pnpm check`, `pnpm turbo run lint typecheck` e `pnpm test` da raiz passam. Nenhum `.ts` nem chave de
  tradução mudou nesta tarefa, então os números servem de sanidade da branch.
