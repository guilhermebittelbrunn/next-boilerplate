# Critérios de Aceite (Checklist)

Status medido no `/test` em 2026-11-26. Meio de verificação entre parênteses. Detalhe e números em
`test/report.md`.

- [x] ✅ **O caso 1 garante a própria pré-condição** (e2e, medição temporária)
  O caso preenche a descrição com 12 linhas, põe o caret no início e volta a página ao topo antes da
  contagem. Medido a 375×812 com a página em `scrollY` 0: 11 elementos focáveis começam abaixo da barra
  de ações (que começa em 743 px), contra 1 elemento a 6 px antes da tarefa. A menor folga é 19 px, a
  maior 295 px (data de nascimento), e a descrição preenchida tem 306 px de altura. O plano estimava cerca
  de 200 px de folga mínima; o número real é menor, mas a pré-condição só exige um campo abaixo da barra,
  e o mais distante está a 295 px dela.

- [x] ✅ **O caso 1 não passa vazio** (e2e, prova P2)
  Sem o `fill` e com viewport 375×1600, o caso reprova na pré-condição (`:125`) com a mensagem
  "some field must start under the action bar with the page at the top" (`Expected: > 0`, `Received: 0`).
  A asserção nova "the Tab walk must scroll the document" passou em todas as execuções; o `scrollY` medido
  ao chegar na barra foi 372. Não houve prova de reprovação isolada dessa segunda asserção, porque
  nenhuma mutação planejada a dispara sem antes reprovar a pré-condição.

- [x] ✅ **O caso 1 reprova sem a reserva de foco** (e2e, prova P1)
  Com `has-[[data-sticky-action-bar]]:scroll-pb-20` removido de `apps/app/app/layout.tsx`, o caso reprova
  numa parada do Tab (`:132`) com a mensagem
  "button ends at 798px, under the action bar that starts at 743px". O `layout.tsx` voltou idêntico ao
  HEAD (`git diff --stat` vazio, `cmp` com a cópia de antes sem diferença).

- [x] ✅ **O arquivo fica estável em repetição** (e2e, `--repeat-each=10`)
  `34 passed (3.5m)` no projeto `chromium`: 4 setups e os 3 casos 10 vezes cada (30/30), sem nenhum
  `flaky`. O `toPass` do caso 3 e o caso 2 seguem como estão no working tree.

- [x] ✅ **Nenhum código de produção muda** (git, typecheck)
  O único arquivo modificado da tarefa é `apps/e2e/tests/focusNotObscured.spec.ts`, e o diff dele é
  idêntico ao que a revisão leu (comparado byte a byte depois de cada mutação temporária).
  `pnpm --filter e2e typecheck` passou nesta etapa. `pnpm check` não foi remedido: nenhum arquivo mudou
  desde o número do handoff (1155 arquivos, nenhum fix).

## Fora do escopo desta tarefa

- 🔒 **Caret no fim de um textarea longo ao voltar com Shift+Tab** (e2e, observação)
  Com o `setSelectionRange` removido, o caso 1 reprova na volta com Shift+Tab (`:144` da variante, `:146`
  do arquivo real) com "description starts at -59px, under the navbar that ends at 64px". O print da
  falha mostra a linha 12 com o caret logo abaixo da navbar e as linhas 1 a 5 sob ela. É o achado 🟢 da
  revisão, comportamento nativo do navegador, sem cobertura de teste e sem correção de produção prevista.
