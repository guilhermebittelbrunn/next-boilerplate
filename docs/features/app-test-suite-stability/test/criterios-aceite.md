# Critérios de Aceite (Checklist)

Status medido no `/test` de 2026-11-26, nesta máquina (8 núcleos, com processos de outros donos somando load de
15 a 85 ao longo da rodada). Legenda: ✅ medido e passou, ❌ medido e falhou, 🔒 não reproduzido ou não
verificável aqui (com o que cobre no lugar). O detalhe de cada medição está em `report.md`.

- [x] **O `tableLoadMore` desmonta a tabela ao fim de cada teste** ✅ diff + suíte (sintoma original 🔒 não reproduzido)
  O arquivo chama `afterEach(cleanup)` no lugar do `beforeEach`, então o último teste também desmonta a tabela antd
  antes de o jsdom ser destruído. O `cleanup()` no meio do teste "só oferece carregar mais…" continua, porque separa
  dois renders do mesmo teste. Com 16 `yes`, a suíte inteira saiu com código 0 e sem nenhuma seção "Unhandled Errors";
  nas cinco execuções dos três arquivos juntos, também. Com 32 `yes` a suíte saiu com código 1 e seis "Unhandled
  Error", todos `[vitest-pool]: Timeout starting forks runner` em seis arquivos fora do escopo; o `tableLoadMore`
  passou nos 5 testes. Nenhuma execução mostrou `_location`, nem antes da correção (linha de base do `/develop`) nem
  depois, então não há como afirmar que o erro original sumiu.

- [x] **As esperas do `signInEmailLinkEntry` têm prazo explícito abaixo do `testTimeout`** ✅ diff + suíte (sintoma original 🔒 não reproduzido)
  Os dois `findByRole` e os dois `waitFor` recebem `SLOW_MACHINE_WAIT = { timeout: 10_000 }`, abaixo dos 20 s do
  `testTimeout`, de modo que uma regressão de verdade ainda falha com a mensagem do Testing Library. As asserções não
  mudaram: o link aparece com `href` `/pt-br/sign-in/email-link` quando a API diz que está ligado, e não aparece quando
  está desligado, quando a consulta falha ou enquanto ela carrega. Os 4 testes passaram em todas as execuções desta
  rodada (2,7 s com 16 `yes`, 3,1 s com 32 `yes`). A falha original pelo prazo do `findBy` nunca apareceu na linha de
  base, então "deixou de cair" fica sem prova.

- [x] **O teste de navegação do `auditFiltersDateInput` fica mais barato, com a mesma cobertura** ✅ medição própria
  O botão de próximo mês e o dia 10 de janeiro de 2027 são buscados com `getByLabelText`, e o teste continua conferindo
  que o próximo mês não está desabilitado, que a navegação chega a janeiro de 2027, que o calendário reabre em
  "janeiro 2027" e que `onApply` recebe `{ from: "2027-01-10" }`. Em três pares alternados (original e editado em
  sequência) com 16 `yes`, a duração do teste caiu de 3494 ms para 1819 ms em média, 48% a menos. O critério pedia ao
  menos um terço, então o plano B não se aplica.

- [x] **A suíte da `apps/app` passa sob carga artificial** ✅ 1 execução própria com 16 `yes` (as 3 seguidas do handoff não foram remedidas)
  Com 16 `yes` e load 29,2 no início, `pnpm --filter app test` terminou com código 0, 149 arquivos e 1360 testes, em
  197 s. O orçamento desta rodada permitia duas execuções da suíte sob carga; a segunda foi com 32 `yes` (load 35,9 no
  início, 84,7 no fim) e saiu com código 1 por timeout do pool do Vitest ao iniciar os workers, sem falha de asserção.
  Esse resultado fica registrado como achado novo, fora desta tarefa. As três execuções seguidas com 16 `yes` exigidas
  pelo critério vêm do handoff e não foram repetidas aqui.

- [x] **Nenhuma asserção removida e nenhum arquivo fora do escopo** ✅ diff
  O diff toca só os três arquivos de teste. A contagem de `expect(` é igual antes e depois (11, 7 e 6), não há `skip`,
  `only`, `retry` nem `todo` nas linhas alteradas, e `apps/app/vitest.config.mts` não aparece no `git status`.
  `pnpm check` e `pnpm --filter app typecheck` vêm do handoff (saída 0) e não foram remedidos, porque nenhum arquivo
  mudou desde então.
