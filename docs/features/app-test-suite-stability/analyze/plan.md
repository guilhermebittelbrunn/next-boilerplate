# Plano: estabilidade da suíte Vitest da `apps/app` sob carga

Tarefa direta, sem spec. A origem é o achado 🟡 "A suíte da `app` falha sob carga, cada vez num arquivo", em
`specs/reference/AUDIT.md` (seção "Achados do `/test` de `admin-own-account`", linha da tabela em `:1867`), com as
medições em `docs/features/admin-own-account/develop/handoff.md:80` e `docs/features/admin-own-account/test/report.md:22-49`.

## Etapa 1: análise

### 1. Contexto

Com a máquina carregada (load average de 18 a 58 em 8 núcleos), `pnpm --filter app test` reprova numa execução
sim e noutra não, e cada vez num arquivo diferente:

| arquivo | sintoma medido | onde foi medido |
|---------|----------------|-----------------|
| `auditFiltersDateInput.test.tsx` | o teste "navegam além do fim do ano corrente…" estoura o `testTimeout` de 20 s | `admin-own-account/test/report.md:22` (load 52) |
| `signInEmailLinkEntry.test.tsx` | `findByRole` não acha o link; numa auditoria anterior caiu "perto dos 2 s, pela espera do `findBy`" | `report.md:24`, `handoff.md:80`, `AUDIT.md:2000` |
| `tableLoadMore.test.tsx` | os testes passam, mas um erro não tratado do jsdom (`_location`) depois do teardown faz o Vitest sair com código 1 | `handoff.md:80` (load 18 a 22) |

Os três passam isolados. Como o `build` do turbo depende de `test`, `pnpm test` e `pnpm build` ficam vermelhos em
máquina carregada, e um runner de CI sob pressão pode repetir o problema.

**Objetivo:** os três arquivos deixam de reprovar por tempo ou por trabalho pendente depois do teardown, sem perder
nenhuma asserção, e há uma medição sob carga artificial que mostre isso.

**Fora de escopo:**
- `apps/web` e `packages/design-system`. A auditoria viu 3 e 5 testes caírem por tempo com `--concurrency=4`
  (`AUDIT.md:204`), mas não registrou quais arquivos nem a causa. Sem essa evidência, a tarefa não mexe neles; o
  `/develop` só anota se a mesma causa aparecer de novo.
- Os outros instáveis conhecidos da `apps/app` (`useListAuditEvents.test.tsx`, `AUDIT.md:832`; `actionMenu.test.tsx`,
  `AUDIT.md:2000`). O primeiro é da mesma família do `tableLoadMore` (trabalho do React pendente depois do teardown),
  mas tem achado e correção próprios.
- Limpeza automática global do Testing Library (`afterEach(cleanup)` num `setupFiles`). Ver "Decisões".
- Detector de *flake* no CI e mudança de `maxWorkers`/pool.

**Corte de MVP:** três edições locais, uma por arquivo de teste, mais o roteiro de medição. Nenhum arquivo de
produção e nenhuma configuração do Vitest muda.

### 1.1 Estado do working tree

O working tree carrega duas features não commitadas (`app-form-layout-centered` e `admin-own-account`) e mudanças em
`specs/`. Nenhum dos arquivos-alvo foi alterado por elas: `git status --short` não lista
`auditFiltersDateInput.test.tsx`, `signInEmailLinkEntry.test.tsx`, `tableLoadMore.test.tsx` nem
`apps/app/vitest.config.mts`, e `git diff --stat HEAD` sobre os quatro sai vazio (medido em 2026-11-26).

### 2 a 6. Dados, SDK, API, front, autorização

N/A. A tarefa só toca arquivos de teste da `apps/app`. Não há rota, DTO, chave de i18n nem tela nova.

### 7. Causa provável por arquivo (leitura de código)

O setup que vale para os três: `apps/app/vitest.config.mts` usa `environment: "jsdom"` e `testTimeout: 20_000`
(`:8`, `:13`), sem `globals` e sem `setupFiles`. Duas consequências:

1. O `@testing-library/react` só registra a limpeza automática quando encontra um `afterEach` global. Sem `globals`,
   não encontra, então cada arquivo é responsável por chamar `cleanup()` no fim de cada teste.
2. As esperas do Testing Library (`findBy*`, `waitFor`) usam o prazo padrão de 1000 ms de relógio de parede. Um
   processo que fica sem CPU por mais de um segundo perde esse prazo mesmo com o código correto. O `testTimeout` de
   20 s foi aumentado pelo mesmo motivo (comentário em `vitest.config.mts:9-12`), mas não alcança essas esperas.

Para dimensionar a carga, rodei os três arquivos juntos duas vezes (2026-11-25, 23:55):

| condição | duração dos testes | resultado |
|----------|-------------------|-----------|
| load 11, sem carga extra | 4,05 s (auditFilters 667 ms + 1101 ms; signIn primeiro teste 434 ms) | 11/11, código 0 |
| 16 processos `yes > /dev/null`, load subindo até 26, 6 execuções seguidas | 15,6 s a 25,0 s | 11/11, código 0 nas seis |

A carga sozinha deixa os testes de 4 a 6 vezes mais lentos, mas os três arquivos juntos não reprovaram. A falha
precisa da suíte inteira (149 arquivos disputando os workers) somada à carga externa. Por isso a medição final é
sobre a suíte, não só sobre os arquivos.

#### `tableLoadMore.test.tsx`: árvore montada até o teardown

- `:50-52` chama `cleanup()` num `beforeEach`, não num `afterEach`. A limpeza de cada teste só acontece quando o
  próximo começa. O último teste do arquivo (`:95-107`, "desabilita o botão…") nunca é desmontado: a tabela antd fica
  montada até o Vitest destruir o ambiente jsdom.
- A tabela antd (`packages/design-system/components/ui/table.tsx:7`) observa tamanho e agenda trabalho assíncrono
  (observador de redimensionamento, `matchMedia` em `:6-15`, estilos em runtime). Se um desses callbacks dispara
  depois de o `window` do jsdom ser fechado, ele acessa um documento já destruído, que é o erro `_location` do
  `handoff.md:80`. Sob carga, o teardown alcança esse callback pendente; sem carga, ele roda antes.
- O `cleanup()` no meio do teste (`:86`) é legítimo: troca de `hasMore` com o mesmo teste. Ele fica.

Confiança: alta na falta da limpeza do último teste (lida no código). Média em qual callback exato toca o
`_location`: a pilha do erro não foi registrada. O `/develop` deve capturar a pilha se reproduzir.

#### `signInEmailLinkEntry.test.tsx`: prazo de 1 s nas esperas

- `:81-83`: `findByRole("link", { name: emailLink })` depende de uma cadeia assíncrona: o `useQuery` chama
  `availabilityMock`, a promessa resolve, o React Query agenda a notificação por `setTimeout` e o componente
  re-renderiza o link (`SignInForm.tsx:43`, `:178-186`). Sem carga, o primeiro teste leva 434 ms, a maior parte
  importando e montando o formulário. Com a CPU 4 a 6 vezes mais lenta, a cadeia passa do 1 s do `findByRole`. A
  auditoria de 2026-11-23 registrou exatamente isso: falha "perto dos 2 s, pela espera do `findBy`"
  (`AUDIT.md:2000`).
- `:92` e `:93`: o `waitFor` da chamada ao mock e o `findByRole` do link "Esqueci a senha" usam o mesmo prazo de
  1 s. O link de senha é renderizado de forma síncrona (`SignInForm.tsx:170-177`), então o `:93` só cai se o
  `waitFor` do `:92` já tiver perdido o prazo ou se o processo ficar parado mais de 1 s antes da primeira checagem.
  A evidência não diz qual linha falhou em cada execução (os relatórios dizem "link não encontrado"). A correção
  cobre as quatro esperas do arquivo (`:81`, `:92`, `:93`, `:102`) para não depender dessa resposta.

Confiança: alta para o `:81`, média para o `:93`.

#### `auditFiltersDateInput.test.tsx`: consultas por papel caras repetidas no calendário

- O teste que estourou (`:84-112`) não falhou por `waitFor` (que desistiria em 1 s com outra mensagem): consumiu os
  20 s inteiros de trabalho. Sem carga ele leva 1101 ms, e é o teste mais lento dos três arquivos.
- O custo está nas consultas `*ByRole("button", { name })` dentro do calendário aberto: `:89-91` três vezes no laço
  e `:96-98` no clique do dia. Para cada chamada, o Testing Library avalia todos os botões do diálogo (navegação mais
  cerca de 42 dias do mês), calcula o nome acessível de cada um e checa se está acessível subindo os ancestrais com
  `getComputedStyle`. Num jsdom, essa é a consulta mais cara da biblioteca. São pelo menos quatro varreduras completas
  num teste que, além disso, re-renderiza o calendário a cada mês avançado.
- Os dois botões têm `aria-label` do `react-day-picker` 9 (`packages/design-system/package.json:27`): "Ir para o
  próximo mês" e "…10 de janeiro de 2027". O `getByLabelText` acha o mesmo elemento sem calcular papel nem
  acessibilidade de todos os botões.
- Os fake timers (`:64-67`) só falseiam `Date`, e o `afterEach` (`:69-72`) faz `cleanup()` e `useRealTimers()`. Não há
  vazamento de timer nem de árvore aqui.

Confiança: média. É a explicação mais provável pela leitura, mas o ganho precisa ser medido (duração do teste antes e
depois, com a mesma carga). Se o ganho for pequeno, aplica-se o plano B descrito no blueprint.

### 7.1 Testes a criar

Nenhum. A tarefa corrige três testes existentes. Nenhuma asserção é removida, nenhum teste recebe `skip` ou
`retry`.

### 8. O que o `/test` vai percorrer

Diff só de arquivos de teste, sem superfície de runtime: o `/test` **não sobe app nem abre browser** (política do
`/cycle`, §3.1). O `/test` executa o roteiro de medição da seção 10.6.

### 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **O `tableLoadMore` desmonta a tabela ao fim de cada teste**
  O arquivo chama `cleanup()` num `afterEach`, de modo que o último teste também desmonta a tabela antd antes de o
  ambiente jsdom ser destruído. O `cleanup()` no meio do teste "só oferece carregar mais…" continua, porque separa dois
  renders do mesmo teste. Nas execuções sob carga do roteiro, a saída do Vitest não tem nenhuma seção
  "Unhandled Errors" e o código de saída é 0.

- [ ] **As esperas do `signInEmailLinkEntry` têm prazo explícito abaixo do `testTimeout`**
  Os `findByRole` de `:81` e `:93` e os `waitFor` de `:92` e `:102` recebem um prazo explícito (constante única no
  arquivo, 10 s), menor que os 20 s do `testTimeout`, para que uma regressão de verdade ainda falhe com a mensagem do
  Testing Library e não com o timeout genérico do Vitest. As asserções continuam as mesmas: o link aparece com o
  `href` `/pt-br/sign-in/email-link` quando a API diz que está ligado, não aparece quando está desligado, quando a
  consulta falha ou enquanto ela carrega.

- [ ] **O teste de navegação do `auditFiltersDateInput` fica mais barato, com a mesma cobertura**
  As consultas de botão dentro do calendário passam a buscar pelo rótulo (`aria-label`) em vez do papel, e o teste
  continua conferindo que o botão de próximo mês não está desabilitado, que se navega até janeiro de 2027, que o
  calendário reabre em "janeiro 2027" e que `onApply` recebe `{ from: "2027-01-10" }`. A duração do teste, medida com
  `--reporter=verbose` na mesma condição de carga antes e depois, cai. Se não cair pelo menos um terço, o teste
  recebe prazo próprio maior (plano B) e o `handoff.md` registra o número.

- [ ] **A suíte da `apps/app` passa sob carga artificial**
  Com 16 processos `yes > /dev/null` rodando, `pnpm --filter app test` termina com código 0 em três execuções
  seguidas, e o load average medido por `uptime` antes de cada execução fica registrado no relatório. Se uma execução
  falhar num arquivo fora dos três, o relatório registra o arquivo, a mensagem e o load, sem tratar a tarefa como
  reprovada por isso: vira achado novo.

- [ ] **Nenhuma asserção removida e nenhum arquivo fora do escopo**
  O diff toca só os três arquivos de teste. Não há `skip`, `only`, `retry`, `todo`, `expect` removido nem alteração de
  `vitest.config.mts`. `pnpm check` e `pnpm --filter app typecheck` passam.

## Etapa 2: blueprint técnico

### 10.1 Contrato, API, documento, i18n

N/A.

### 10.2 `apps/app/__tests__/tableLoadMore.test.tsx`

```diff
-import { beforeEach, describe, expect, it, vi } from "vitest";
+import { afterEach, describe, expect, it, vi } from "vitest";
@@
-beforeEach(() => {
-    cleanup();
-});
+afterEach(cleanup);
```

O `cleanup()` de `:86` fica. Se o erro `_location` reaparecer sob carga mesmo com o `afterEach`, a próxima hipótese é
um callback agendado pela antd que sobrevive ao unmount. Nesse caso o `/develop` captura a pilha do erro e trata a
origem (por exemplo, drenar o trabalho pendente dentro de `act` antes do `cleanup`), registrando a medição no handoff.

### 10.3 `apps/app/__tests__/signInEmailLinkEntry.test.tsx`

```diff
+const SLOW_MACHINE_WAIT = { timeout: 10_000 };
@@ :81
-        const link = await screen.findByRole("link", {
-            name: signInCopy.emailLink,
-        });
+        const link = await screen.findByRole(
+            "link",
+            { name: signInCopy.emailLink },
+            SLOW_MACHINE_WAIT
+        );
@@ :92-93
-        await waitFor(() => expect(availabilityMock).toHaveBeenCalled());
-        await screen.findByRole("link", { name: signInCopy.forgotPassword });
+        await waitFor(
+            () => expect(availabilityMock).toHaveBeenCalled(),
+            SLOW_MACHINE_WAIT
+        );
+        await screen.findByRole(
+            "link",
+            { name: signInCopy.forgotPassword },
+            SLOW_MACHINE_WAIT
+        );
@@ :102
-        await waitFor(() => expect(availabilityMock).toHaveBeenCalled());
+        await waitFor(
+            () => expect(availabilityMock).toHaveBeenCalled(),
+            SLOW_MACHINE_WAIT
+        );
```

O nome da constante pode mudar, desde que diga o porquê. Sem comentário no código (regra de comentários).

### 10.4 `apps/app/__tests__/auditFiltersDateInput.test.tsx`

```diff
         for (let step = 0; step < MONTHS_FROM_OCTOBER_TO_JANUARY; step++) {
-            const next = within(calendar).getByRole("button", {
-                name: NEXT_MONTH,
-            });
+            const next = within(calendar).getByLabelText(NEXT_MONTH);
             expect(next.hasAttribute("aria-disabled")).toBe(false);
             fireEvent.click(next);
         }
         fireEvent.click(
-            within(within(calendar).getByRole("grid")).getByRole("button", {
-                name: JANUARY_10_2027_DAY_BUTTON,
-            })
+            within(within(calendar).getByRole("grid")).getByLabelText(
+                JANUARY_10_2027_DAY_BUTTON
+            )
         );
```

O `getByRole("dialog")`, o `getByRole("grid")` e o `getByRole("button", { name: filtersCopy.apply })` ficam: cada um
tem um candidato só (ou poucos) e custa pouco. Antes de editar, o `/develop` confirma que o `react-day-picker` põe o
rótulo como `aria-label` no próprio `<button>` do dia; se o rótulo estiver na célula (`<td>`), o `getByLabelText`
devolveria a célula e o clique não selecionaria o dia. Nesse caso, mantém a consulta por papel só no dia.

**Plano B**, se a medição não mostrar ganho de pelo menos um terço: dar ao teste de `:84` um prazo próprio maior
(terceiro argumento do `it`, 40 s). Isso aumenta o prazo de espera e não mexe em asserção.

### 10.5 Árvore de arquivos

```
apps/app/__tests__/
  auditFiltersDateInput.test.tsx   (consultas por rótulo no calendário)
  signInEmailLinkEntry.test.tsx    (prazo explícito nas 4 esperas)
  tableLoadMore.test.tsx           (afterEach(cleanup))
```

### 10.6 Como medir

Todos os comandos rodam a partir de `apps/app`. O roteiro não grava nada no repositório.

1. **Duração do teste do calendário, antes e depois** (instrumento do terceiro critério), na mesma condição:
   ```bash
   NODE_ENV=test npx vitest run __tests__/auditFiltersDateInput.test.tsx --reporter=verbose
   ```
   Três execuções sem carga e três com a carga do passo 3, antes e depois da edição. Anotar a duração em ms do teste
   "navegam além do fim do ano corrente…".
2. **Os três arquivos em laço** (barato, pega regressão óbvia):
   ```bash
   for n in $(seq 1 10); do
     NODE_ENV=test npx vitest run __tests__/auditFiltersDateInput.test.tsx \
       __tests__/signInEmailLinkEntry.test.tsx __tests__/tableLoadMore.test.tsx \
       || echo "FALHOU na execução $n"
   done
   ```
   O laço da linha de base não reprovou (seis execuções com load até 26), então ele não prova a correção sozinho.
3. **Suíte inteira sob carga artificial** (o instrumento que decide):
   ```bash
   for i in $(seq 1 16); do (yes > /dev/null &); done
   sleep 5; uptime
   for n in 1 2 3; do uptime; pnpm --filter app test; echo "exit=$?"; done
   pkill -x yes
   ```
   Registrar o load de cada execução, o código de saída, a contagem de testes e se apareceu a seção "Unhandled
   Errors". Derrubar os `yes` no fim, mesmo se o laço for interrompido.
4. **Linha de base opcional:** se a máquina permitir, rodar o passo 3 uma vez antes da edição. Se a linha de base
   passar três vezes, a carga de 16 `yes` não basta para reproduzir; subir para 32 processos e registrar.

O `--repeat` não existe na CLI do Vitest 4 para arquivos inteiros, e o `--retry` está fora (esconderia a falha). Por
isso o laço de shell.

### 10.7 Ordem de implementação

1. `tableLoadMore.test.tsx` (menor e de causa mais certa).
2. `signInEmailLinkEntry.test.tsx`.
3. `auditFiltersDateInput.test.tsx`, com a medição do passo 1 antes e depois.
4. `pnpm check` e `pnpm --filter app typecheck`.

Commit único sugerido para o `/review`: `test(app): stabilize three suite files under CPU load`, mais o commit dos
artefatos `docs(features): app-test-suite-stability`.

### 10.8 Env nova

Nenhuma.

## Decisões tomadas sem perguntar

| decisão | alternativa descartada | por quê |
|---------|------------------------|---------|
| Prazo explícito só no `signInEmailLinkEntry` | `configure({ asyncUtilTimeout })` global num `setupFiles` novo | Só um arquivo tem evidência de cair pela espera de 1 s. Um setup global muda a espera de 149 arquivos e deixa mais lenta a falha de qualquer `waitFor` que hoje reprova em 1 s. Se um segundo arquivo cair pelo mesmo motivo, o global passa a se justificar (três ou mais lugares, pela política). |
| `afterEach(cleanup)` local no `tableLoadMore` | `afterEach(cleanup)` global num `setupFiles` | 25 arquivos `.tsx` de `__tests__` não chamam `cleanup`, mas nenhum deles tem falha registrada por isso, e mudar a limpeza de todos ao mesmo tempo pode quebrar teste que dependa do DOM entre casos. Fica como achado para o backlog. |
| Consulta por rótulo no calendário | Só aumentar o `testTimeout` do teste | Prazo maior esconde o custo; a consulta mais barata remove parte dele. O prazo maior fica como plano B medido. |
| Não mexer em `maxWorkers`/pool | Limitar workers no `vitest.config.mts` | Afeta a duração da suíte inteira em toda máquina e não corrige nenhum dos três testes. |
| Não tocar `web` nem `design-system` | Aplicar o mesmo prazo lá | Não há registro de quais arquivos caíram nem por quê. |

## Riscos

- A carga de 16 `yes` pode não reproduzir a falha original (a linha de base com os três arquivos não reproduziu).
  Sem linha de base vermelha, "verde sob carga" mostra que nada piorou, não que a correção resolveu. O passo 4 de
  10.6 trata isso; o relatório deve dizer qual dos dois casos aconteceu.
- Outros arquivos podem cair sob a mesma carga (`actionMenu`, `useListAuditEvents`, `securityPolicySources`). Isso
  vira achado, não reprovação desta tarefa.
- A causa exata do `_location` não foi confirmada por pilha. Se o `afterEach` não bastar, a correção cresce um passo
  (drenar o trabalho pendente da antd), ainda dentro do mesmo arquivo.

## Perguntas em aberto

Nenhuma bloqueia o `/develop`. Uma para o relatório final do `/cycle`:

1. **Limpeza automática global do Testing Library na `apps/app`** (`setupFiles` com `afterEach(cleanup)` ou
   `globals: true`). Recomendação: abrir como tarefa direta separada, com a suíte inteira como medição, porque mexe
   em todos os arquivos de teste.
