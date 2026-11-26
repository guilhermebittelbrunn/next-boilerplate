# Critérios de Aceite (Checklist)

Tarefa `repo-hygiene-ci`. O status por item, com o meio de prova, está em `test/report.md`. A tarefa não tem
superfície de runtime: não há tela, rota, `error.code`, chave de i18n nem diferença entre comum, admin e
impersonação, então os critérios de autorização, tema, responsivo e idioma da seção 9 do guia não se aplicam.

- [x] **O fixture fictício deixa de disparar o Gitleaks**
  Com o Gitleaks 8.30.1 na configuração padrão, a versão de `HEAD` de
  `packages/auth/__tests__/serverErrorLogging.test.ts` dá um achado da regra `generic-api-key` na linha 62
  (a declaração do `LEAKY_TOKEN`). A versão do working tree, com o comentário `gitleaks:allow` no fim da
  mesma linha, dá `no leaks found` em modo `dir`. Em modo `git`, que é o do job `secrets`, um commit com a
  linha marcada também passa, e um commit que volta a linha sem o comentário reprova.

- [x] **O valor do token e a asserção de mascaramento não mudam**
  O literal do `LEAKY_TOKEN` continua o mesmo, só ganhou a diretiva no fim da linha. O teste que prova que o
  token não aparece no log continua verde (`@repo/auth`, 201 testes). Se o `pnpm check` movesse o
  comentário para outra linha, a diretiva deixaria de valer, então a posição dela também conta.

- [x] **Os artefatos do fluxo não disparam o Gitleaks**
  `docs/features/repo-hygiene-ci/`, incluindo o que o `/test` grava, e `docs/features/` inteiro dão
  `no leaks found`. O commit `docs(features)` entra no intervalo varrido pelo job, então uma cópia do
  literal num plano ou handoff faria a PR reprovar no último commit.

- [x] **O `docs/SETUP.md` descreve o repositório como ele está**
  A frase "um único fixture dispara com a configuração padrão" vale para a árvore de `HEAD`: a varredura
  dos arquivos versionados dá exatamente um achado, o da linha 62. A árvore do working tree, sem os
  ignorados pelo `.gitignore`, dá zero. Um segundo achado em qualquer outro arquivo tornaria a frase falsa.

- [x] **`next dev` não escreve `AGENTS.md` nas apps**
  A config compartilhada de `@repo/next-config` leva `agentRules: false`, e as apps `api`, `app` e `web`
  herdam a chave. Com um `apps/api/AGENTS.md` semeado só com o bloco gerenciado, `next dev` registra
  "Removed agent rules from AGENTS.md because `agentRules` is disabled" e o arquivo some. O `AGENTS.md` da
  raiz não muda. Sem `FIRESTORE_EMULATOR_HOST` no ambiente, a `api` morre antes do sync e o teste dá falso
  negativo.

- [x] **O valor da config está coberto por teste unitário**
  `packages/next-config/__tests__/config.test.ts` tem o caso que confere `config.agentRules === false`. O
  teste prova o valor, não que o Next o respeite; esse comportamento fica com o smoke do `next dev`.

- [ ] **O Dependabot não abre PR de versão maior do `stripe`**
  O bloco `npm` de `.github/dependabot.yml` ignora `version-update:semver-major` para `stripe`, e as versões
  menores e patches seguem no grupo `production`. O GitHub só valida o arquivo da branch padrão, então o
  schema e o efeito sobre a PR aberta da versão maior só aparecem depois do merge na `main`.

- [ ] **O `ignore` não bloqueia atualização de segurança do `stripe`**
  Uma correção de segurança que só exista numa versão maior deveria continuar chegando como PR de segurança.
  A referência do Dependabot diz que `update-types` em `allow` só afeta atualizações de versão; a seção
  `ignore` não foi lida. Enquanto isso não for conferido, e com os alertas de segurança desligados
  (`docs/PRE-PRODUCTION.md` §9), esse caminho fica sem garantia.

- [x] **A suíte do repositório continua verde**
  `pnpm test` da raiz termina com exit 0 e as 15 tasks com sucesso, incluindo `api:test:emulator`, que
  exige JDK 21 no `PATH`. Como `turbo build` depende de `test`, uma falha aqui bloquearia o build.
