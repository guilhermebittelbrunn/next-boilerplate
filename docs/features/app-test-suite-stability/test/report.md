# Relatório do `/test`: estabilidade da suíte Vitest da `apps/app` sob carga

Rodada autônoma do `/cycle`, em 2026-11-26. Branch `guilhermebittelbrunn/claude-cycle-full-pipeline` (não
protegida). Nada commitado, nenhuma branch criada.

O diff são três arquivos de teste da `apps/app`, sem superfície de runtime. Por isso esta etapa não subiu app nem
abriu browser: não havia tela, rota ou contrato para percorrer.

## Resumo

As três edições estão no código como o plano pedia, e nenhuma asserção foi afrouxada. O teste do calendário ficou 48%
mais rápido sob carga, numa medição independente da do `/develop`. A suíte passou com 16 `yes`.

Os dois sintomas originais (o `_location` do `tableLoadMore` e a queda do `signInEmailLinkEntry` pelo prazo do
`findBy`) não apareceram nesta rodada, assim como não apareceram na linha de base do `/develop`. Ficam como "não
reproduzido": um verde depois da correção não separa "corrigido" de "não aconteceu".

Com 32 `yes` a suíte saiu com código 1, mas por outro motivo: o pool do Vitest não conseguiu iniciar os workers de
seis arquivos a tempo. Nenhum deles é desta tarefa. Fica como achado novo.

## Verificar no `/test` (itens do `review.md`)

| item | veredito | o que foi medido |
|------|----------|------------------|
| 1. Asserções intactas | confirmado | `git diff HEAD` dos três arquivos: contagem de `expect(` igual antes e depois (`tableLoadMore` 11, `signInEmailLinkEntry` 7, `auditFiltersDateInput` 6). Nenhum `skip`/`only`/`retry`/`todo` nas linhas alteradas. `vitest.config.mts` fora do `git status`. |
| 2. Os três arquivos verdes juntos, com carga | confirmado | 5 execuções com 16 `yes`, load de 30,1 a 32,3: código 0 nas cinco, 11/11 testes, 0 "Unhandled", 0 `_location`. A execução isolada sem carga não foi feita; o `pnpm test` da raiz cobriu o caso sem carga minha. |
| 3. Duração do teste do calendário | confirmado | Três pares alternados com 16 `yes`. Original 3720, 2918 e 3843 ms (média 3494). Editado 1916, 1720 e 1820 ms (média 1819). Queda de 48%, igual à do handoff. |
| 4. Suíte inteira sob 16 ou 32 `yes`, procurando "Unhandled" e `_location` | confirmado com 16; com 32 apareceu outro erro | Detalhe na seção seguinte. `_location` não apareceu em nenhuma das duas. |
| 🔒 `_location` do `tableLoadMore` some | não reproduzido | Zero ocorrências em 2 execuções da suíte e 5 dos três arquivos. Sem reprodução antes da correção, não há o que comparar. |
| 🔒 `signInEmailLinkEntry` deixa de cair pelo `findBy` | não reproduzido | 4/4 em todas as execuções. Mesmo caso. |

## Medições

Máquina com 8 núcleos. Havia processos de outros donos pesando: o load estava em 16,5 antes de eu iniciar qualquer
carga e chegou a 85 com só os meus 32 `yes`. Os números de load somam a minha carga e a deles.

Para medir o calendário original, copiei a versão do `HEAD` para `apps/app/__tests__/zzOrigAuditFilters.test.tsx`,
alternei as execuções e apaguei o arquivo logo depois (`ls __tests__/zz*` sem resultado).

### Suíte inteira (`pnpm --filter app test`, da raiz)

| execução | carga | load no início | saída | arquivos / testes | Unhandled | `_location` | tableLoadMore / auditFilters / signIn |
|----------|-------|----------------|-------|-------------------|-----------|-------------|----------------------------------------|
| 1 | 16 `yes` | 29,2 | 0 (197 s) | 149 / 1360 | 0 | 0 | 11763 / 7547 / 2701 ms |
| 2 | 32 `yes` | 35,9 (84,7 no fim) | 1 (539 s) | 143 / 1333 passaram | 6 erros | 0 | 17718 / 14591 / 3093 ms |

Na execução 2, os seis erros são o mesmo: `Error: [vitest-pool]: Timeout starting forks runner.`, lançado de dentro do
`vitest/dist/chunks/cli-api` por um timer. Os arquivos que não chegaram a rodar foram `authFormsNoValidate`,
`cookieBannerAuthLayoutOffset`, `formLoadingSkeletons`, `panelErrorRequestId`, `postLoginFullPageNavigation` e
`serverGuards`. Depois disso o Vitest avisou `close timed out after 10000ms` e "something prevents Vite server from
exiting". Nenhum teste reprovou por asserção, e os três arquivos desta tarefa passaram.

O `tableLoadMore` imprime `Not implemented: Window's getComputedStyle() method: with pseudo-elements` no stderr de
cada teste. É o jsdom avisando que não implementa pseudo-elementos para o antd; o aviso não é erro e não entra na
contagem de "Unhandled".

### Gate do build (`pnpm test` da raiz, sem `--force`, sem carga minha)

Com `JAVA_HOME` apontando para o `openjdk@21` (o `test:emulator` exige). Load de 77,5 no início e 42,3 no fim, só de
outros processos.

| task | resultado |
|------|-----------|
| turbo | 15/15 com sucesso, 13 do cache, 4 min 6 s, saída 0 |
| `app:test` (cache miss) | 149 arquivos, 1360 testes, 0 "Unhandled" |
| `api:test:emulator` | 8 arquivos, 274 testes |
| `api:test` (cache) | 130 arquivos |
| `web:test` (cache) | 35 arquivos |
| pacotes (cache) | todos verdes |

As portas do emulador (9099, 8080, 9199, 4001) estavam livres antes e voltaram livres depois.

## Gates citados, não remedidos

Nenhum arquivo do escopo mudou desde o `/develop`, então estes números vêm do handoff:

| comando | resultado |
|---------|-----------|
| `pnpm --filter app typecheck` | saída 0 |
| `pnpm check` | saída 0, 1148 arquivos |
| `pnpm --filter @repo/internationalization test` | não se aplica, o diff não toca i18n |

## Critérios de aceite, item a item

| critério | status | meio |
|----------|--------|------|
| `tableLoadMore` desmonta a tabela ao fim de cada teste | PASS (código e suíte com 16 `yes`); sintoma original não reproduzido | diff + suíte |
| Esperas do `signInEmailLinkEntry` com prazo explícito abaixo do `testTimeout` | PASS; sintoma original não reproduzido | diff + suíte |
| Teste do calendário mais barato, mesma cobertura | PASS, queda de 48% | medição alternada |
| Suíte passa sob carga artificial | PASS em 1 execução própria com 16 `yes`; as 3 seguidas são do handoff | suíte |
| Nenhuma asserção removida, nada fora do escopo | PASS | diff |

A lista completa, no formato §9.1, está em `criterios-aceite.md`.

## Decisões de custo de teste

Nenhum teste novo. A tarefa só endurece três testes existentes e não cria comportamento. Nenhum teste da faixa cara
entrou.

## Ambiente

Não subi app, API nem emulador manualmente; o `test:emulator` da raiz sobe e derruba o emulador sozinho.

Carga artificial: antes de começar, `pgrep -x yes` não achou nenhum processo. Iniciei 32 `yes` (16 e depois mais 16)
com os PIDs gravados num arquivo da pasta de rascunho e derrubei por PID com `kill`. Conferência final: nenhum dos 32
PIDs vivo e `pgrep -x yes` vazio.

## Lacunas

| lacuna (origem) | veredito |
|-----------------|----------|
| Se o `_location` do `tableLoadMore` some (handoff e review) | continua aberta. Só se fecha reproduzindo a falha na versão antiga ou observando o CI ao longo do tempo. |
| Se o `signInEmailLinkEntry` deixa de cair pelo `findBy` (handoff e review) | continua aberta, pelo mesmo motivo. |
| Segunda medição independente do roteiro 10.6 (handoff) | fechada em parte: calendário, laço dos três arquivos e duas execuções da suíte. Não repeti as três execuções seguidas com 16 `yes`, por orçamento. |
| `signUpFormSubmitLock.test.tsx`, `accountSignInMethodsPanel.test.tsx:247`, `accountTabs.test.tsx:333` instáveis (handoff) | fora de escopo. Nenhum deles caiu nesta rodada, o que não diz nada sobre eles. |
| Limpeza automática global do Testing Library (plano e review) | fora de escopo; segue como decisão em aberto. |

## Achado novo

- Com 32 `yes` e load acima de 80, o Vitest da `apps/app` não inicia os workers de alguns arquivos a tempo
  (`Timeout starting forks runner`) e a suíte sai com código 1 sem nenhuma asserção reprovada. Não é defeito de teste
  nem de produção; é o limite do pool sob uma carga bem acima da que o achado original mediu (load 18 a 22).
  Candidato ao backlog só se aparecer no CI.

## Estado de dev alterado

Nenhum. Nenhuma conta, dado ou arquivo versionado foi criado. A cópia temporária do teste do calendário foi apagada.
