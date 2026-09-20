# Revisão de código

Feature `admin-analytics-dashboard`, revisada contra
[`docs/review-checklist.md`](../../../review-checklist.md). Base: `HEAD` = `origin/main` = `e656331`.
Nada commitado; tudo no working tree.

A revisão leu o código e rodou os gates estáticos. Nenhum app foi iniciado, nenhum browser foi dirigido e
a suíte Vitest não foi executada aqui, fora a paridade de i18n. O que não deu para confirmar lendo o
código está na secção "Verificar no `/test`".

O `/test` rodou depois e devolveu um defeito de produção, corrigido aqui. A secção "Rodada 1 do `/test`",
no fim, traz o que mudou e o que sustenta a correção.

## Branch

`feat/admin-analytics-dashboard`, **criada** a partir de `hanoi`, que estava em `e656331` sem nenhum
commit à frente de `origin/main` e sem upstream.

`hanoi` não serve: é nome de workspace do Conductor e não bate com `<project>/<type>/<title>`. Não foi
renomeada porque o workspace do Conductor depende dela; ficou intacta, apontando para `e656331`.

Sem prefixo de projeto porque o diff atravessa `packages/sdk`, `apps/api`, `apps/app` e
`packages/internationalization`, e a regra manda omitir o escopo quando vários apps entram. É a forma que
as três entregas anteriores usaram (PRs #19, #20 e #21).

Validação contra o regex de [`.claude/rules/git-commits.md`](../../../../.claude/rules/git-commits.md):

```
branch OK: feat/admin-analytics-dashboard
```

## Achados

| sev | arquivo:linha | problema | ação |
|-----|---------------|----------|------|
| 🔴 | `packages/design-system/components/ui/category-bar-chart.tsx:48-56` · `packages/internationalization/.../admin/home.ts` | O gráfico perdia um rótulo do eixo X: cinco barras e quatro rótulos em inglês a 375 px. Achado pelo `/test`, não por esta leitura. | Corrigido na rodada 1 do `/test`, secção própria abaixo. |
| 🟡 | `specs/BACKLOG.md:75,147,432` · `specs/admin-analytics-dashboard.md:45` · `docs/features/user-activity-tracking/spec.md:195,219` | Seis ponteiros para `activity-recorder.ts:12` como casa de `ACTIVITY_WINDOW_MINUTES`. A constante mudou para `activity-windows.ts:8` neste diff. O `/develop` corrigiu o `PRE-PRODUCTION.md` e deixou estes. | Corrigido nos seis. |
| 🟡 | `docs/PRE-PRODUCTION.md:188` | A §1.7 nova inseriu 29 linhas no meio do arquivo, então todo ponteiro `PRE-PRODUCTION.md:<n>` para linha acima de 188 saiu do lugar. São 18 referências espalhadas por `specs/` e `docs/features/`, contadas com `rg -o` e filtro numérico. | Corrigidas as 3 que caíram em linhas que eu já estava editando. As outras 15 ficam para o `/spec --sync`, que reancora ponteiro por ofício. Registrado em "Decisões em aberto". |
| 🟢 | `apps/app/.../(components)/UserActivitySection.tsx:30-38` | `fillPlaceholders` refaz o que `interpolate` (`packages/email/interpolate.ts:4-11`) já faz. Duas implementações de substituição `{chave}` no repositório. | Não corrigido. Ver "Decisões em aberto". |
| 🟢 | `apps/api/(shared)/lib/activity-recorder.ts:3` | O handoff diz que `activity-windows.ts` "reexporta o valor para o recorder". Não reexporta: o recorder importa e não reexporta, e `ACTIVITY_WINDOW_MINUTES` saiu da superfície pública dele. | Nada a corrigir no código. `rg` confirma que só o teste importava a constante de lá, e ele foi ajustado. A frase do handoff é que está errada. |
| 🟢 | `apps/app/.../(components)/UserActivitySection.tsx:90-101` | `active` mais `inactive` não fecha com o total: a faixa de 8 a 30 dias não entra em nenhum dos dois cartões. É o desenho do plano, e o gráfico mostra as cinco faixas. Quem olhar só os cartões pode somar e estranhar. | Não corrigido. O texto dos dois `hint` delimita cada número, e mudar isso mudaria o corte. |
| ✅ | `apps/api/app/(routes)/users/activity-summary/route.ts:6` | `export const GET = requireAdminApi(...)`, autorização no servidor. Cópia estrutural de `users/summary/route.ts`, incluindo a degradação por `isMissingIndexError`. | Conforme. |
| ✅ | `apps/api/(shared)/lib/activity-windows.ts:34-49` | As quatro faixas são contíguas e não se sobrepõem: o teto de cada uma é o piso da seguinte, e `over90Days` tem piso em `new Date(0)`. `activityWindows.test.ts` prova isso com sondas nas bordas. | Conforme. |
| ✅ | `apps/api/(shared)/repositories/user.repository.ts:52` · `base.repository.ts:147-158` | `lastAccessAt` só é escrito por `touchLastAccess`, com `update`. `create` não declara o campo, então perfil nunca carimbado não tem o campo e sai de toda consulta de intervalo. O comentário em `:88-91` descreve o que o código faz. | Conforme. |
| ✅ | `apps/api/(shared)/repositories/user.repository.ts:128` | `Math.max(0, total - stamped)` impede contagem negativa quando as cinco agregações pegam estados diferentes da coleção. Coberto por `userActivitySummaryRepository.test.ts:148`. | Conforme. |
| ✅ | `packages/sdk/src/types/user/user.ts:77-100` | Anexo puro no fim do arquivo, `@@ -74,3 +74,27 @@`. `UserDTO` intocado, então `billing-subscription` e `onboarding-flow` não herdam conflito. | Conforme. |
| ✅ | `packages/sdk/src/actions/user/user/action.ts:44-54` | `this.client.request<Response<T>>` devolvendo `data.data`, erro cru, sem `FormattedError` dentro do SDK. `UserActions` já registrada em `src/client/index.ts:27`. | Conforme. |
| ✅ | `apps/app/.../(components)/AdminHomeClient.tsx:89` | `<UserActivitySection />` está fora do ternário de `summaryLoadError`, então a falha de um agregado não derruba o outro. `adminHomeActivityDegraded.test.tsx` cobre os dois sentidos. | Conforme. |
| ✅ | `apps/app/.../(components)/UserActivitySection.tsx:22-28` | `next/dynamic` com `ssr: false` e `Skeleton` de fallback. `CategoryBarChart` só é importado por `UserRecencyChart.tsx` e por `EntityTypeChart.tsx`, que a home comum também carrega por `dynamic`. O padrão bate com `CommonHomeClient.tsx:38`. | Conforme. |
| ✅ | `apps/app/.../(pages)/page.tsx:17-26` | Prefetch com a mesma `queryKey` do hook, dentro do `if (!(await isImpersonating()))` que já existia, via `getServerApiClient` e não pelo singleton. | Conforme. |
| ✅ | `packages/internationalization/.../admin/home.ts` | Subárvore `activity` com estrutura idêntica nos três idiomas. Nenhuma chave nova em `apiErrors`: a rota reusa `SUMMARY_INDEX_MISSING`, que já existe em `translations/packages/shared/utils.ts:83,164,252`. | Conforme. |
| ✅ | diff inteiro | Nenhum comentário cita `plan.md`, `docs/features/`, etapa do fluxo ou ID de card. `rg` sobre `apps/` e `packages/` não acha nada. Os comentários que ficaram explicam restrição de Firestore ou de bundle, que é o caso 1 e o caso 2 de `code-comments.md`. | Conforme. |

A leitura de código não pegou o rótulo que sumia. A primeira linha da tabela entrou depois, com o
resultado do `/test`, e é o registro de que este tipo de defeito não se acha lendo o componente: ele
depende da largura do texto renderizado contra a largura da faixa do eixo.

## Correções aplicadas

Só ponteiro de documentação. Nenhuma linha de código de produção ou de teste mudou na revisão.

1. `specs/BACKLOG.md:75` — casa da constante corrigida para `activity-windows.ts:8`; os dois pontos de
   descarte, que eram bare refs, passaram a nomear `activity-recorder.ts:71-73` e `:78-81`; o intervalo do
   `PRE-PRODUCTION.md` foi reancorado em `536-539`.
2. `specs/BACKLOG.md:147` e `:432` — mesma troca de arquivo, e o bucket determinístico passou a apontar
   `activity-recorder.ts:25-27`.
3. `specs/admin-analytics-dashboard.md:45` — `activity-recorder.ts:12` virou `activity-windows.ts:8`.
4. `docs/features/user-activity-tracking/spec.md:195` — as mesmas trocas da linha 75 do `BACKLOG.md`,
   inclusive o intervalo do `PRE-PRODUCTION.md`.
5. `docs/features/user-activity-tracking/spec.md:219` — casa da constante e bucket determinístico.

Cada linha nova foi conferida contra o arquivo: `grep` confirma `ACTIVITY_WINDOW_MINUTES` em
`activity-windows.ts:8`, os descartes em `activity-recorder.ts:71-73` e `:78-81`, o bucket em `:25-27` e o
parágrafo de precisão em `PRE-PRODUCTION.md:536`.

## Raio de impacto

`UserActivitySummaryDTO` e `UserActivityBucket` nascem agora e nenhum tipo existente mudou, então nenhum
consumidor de `UserDTO` ou `UserSummaryDTO` precisa de ajuste. A confirmação é o próprio cabeçalho do
diff, `@@ -74,3 +74,27 @@`: anexo, sem edição acima.

`UserActions.activitySummary()` é método novo. Chamam ele o hook `useUserActivitySummary` e o prefetch de
`(pages)/page.tsx`, e mais ninguém.

`ACTIVITY_WINDOW_MINUTES` deixou de ser exportada por `activity-recorder.ts`. O único importador fora do
próprio módulo era `activityRecorder.test.ts`, já ajustado. O ciclo que o desvio evita existe mesmo:
`activity-recorder.ts:4` importa `userRepository`, então `user.repository.ts` importar a constante do
recorder fecharia `user.repository → activity-recorder → user.repository`.

`queryKeys.users.activitySummary()` entra sob o prefixo `users`. Na troca de sujeito isso é indiferente:
`AuthRequestPanelContext.tsx:192` chama `queryClient.resetQueries()` sem argumento, que varre tudo.

`firestore.indexes.json` ganhou a sétima entrada. Enquanto ela não for publicada, a rota responde 503 e o
bloco de atividade mostra a mensagem traduzida, sem afetar os três cartões antigos.

## Verificar no `/test`

Os oito primeiros vêm do handoff e continuam de pé: reli cada um e nenhum se confirma só lendo código. Os
três últimos são meus.

1. **Degradação por índice ausente, ponta a ponta.** A cobertura para em dois níveis, nenhum deles HTTP
   real. Repro: forçar a falha do hook e conferir que os três cartões antigos, a saudação e o título da
   secção continuam na tela, com a mensagem traduzida no lugar dos números.
2. **Os cinco rótulos do eixo X em 375 px**, sem sobreposição nem corte. **Reprovou na rodada 1** e foi
   corrigido; a rodada 2 remede. Repro: home do admin a 375 px nos três idiomas, contando
   `document.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick-value')`, e de novo a 320 px,
   onde a folga calculada é a menor.
3. **As cinco barras distinguíveis em tema claro e escuro.** Os tokens `--chart-1..5` trocam de valor
   entre os temas. Repro: alternar o tema com o gráfico na tela.
4. **Os `hint` dos dois cartões com 7, 30 e 15 vindos do servidor.** O teste de componente prova a
   interpolação com dado mockado, o que não é o mesmo que ver o número que a rota mandou. Repro: abrir a
   home do admin com a rota respondendo de verdade e ler os dois textos.
5. **A home comum sem regressão.** O diff toca `queryKeys.ts`, compartilhado pelas duas homes. Repro:
   abrir a home comum e conferir cartões e gráfico.
6. **Impersonação.** O admin personificando um comum não alcança `/admin`, e a troca de sujeito não deixa
   dado do agregado em cache. Repro: personificar, tentar `/admin`, voltar e reabrir a home.
7. **Custo da agregação.** O plano conta 8 agregações e 0 leituras de documento por abertura da home. Os
   testes provam as 5 contagens do repositório; a conta faturada pelo Firestore não foi medida contra
   projeto real.
8. **Os três idiomas na tela.** A paridade das chaves está provada; a copy renderizada, não.
9. **`/users/activity-summary` resolve para a rota estática, não para `/users/[id]`.** O App Router dá
   precedência ao segmento estático e `users/summary` já é o precedente em `main`, mas isso é leitura de
   regra, não medição. Repro: chamar a rota autenticado como admin e conferir que volta o agregado, e não
   um 404 de usuário inexistente.
10. **O aviso de perfis sem registro.** `UserActivitySection.tsx:112` só renderiza `neverNotice` quando
    `never > 0`. Numa base sem backfill quase todo perfil cai nesse balde, então o aviso é o texto que
    mais vai aparecer. Repro: ler a frase com a contagem real e conferir que ela some quando o balde
    zera.
11. **O guard na cadeia real.** `usersActivitySummaryRoute.test.ts` mocka `resolveApiActor`, então o 403
    do não admin está provado contra o guard, não contra o proxy. Repro: chamar a rota autenticado como
    usuário comum.

## Lacunas de teste

| lacuna do handoff | veredito |
|---|---|
| Sem teste do prefetch RSC em `(pages)/page.tsx` | **Aberta.** Risco baixo: a chave vem de `queryKeys.users.activitySummary()`, a mesma do hook, e o bloco está dentro do `if (!(await isImpersonating()))` que já existia. Confirmado por leitura, não por teste. |
| Sem teste provando que `recharts` ficou fora do chunk inicial | **Aberta, e fora do alcance do `/test` também.** Medir isso pede análise de build. O que dá para afirmar por leitura é o grafo de imports: `CategoryBarChart` só entra por `UserRecencyChart.tsx` e `EntityTypeChart.tsx`, os dois atrás de `next/dynamic`. |
| `activitySummary()` roda contra um Firestore falso | **Fechada como decisão, não como lacuna.** O checklist §6 só manda usar emulador quando a infra é o objeto do teste, e o emulador serve a consulta com ou sem índice, então ele não provaria nada aqui. |

Nenhuma lacuna nova.

## Gates

| gate | comando | resultado | quem mediu |
|---|---|---|---|
| lint | `pnpm check` | 622 arquivos em 409 ms, nenhuma correção aplicada | esta revisão |
| paridade de i18n | `pnpm --filter @repo/internationalization test` | 3 arquivos, 27 testes, `parity.test.ts` incluso | esta revisão |
| typecheck da `app` | `pnpm --filter app typecheck` | exit 0 | orquestrador, citado |
| lint + typecheck + test do repo | `pnpm turbo run lint typecheck test` | 22 de 24 tasks verdes, único vermelho `app#test` | orquestrador, citado |

Sem `--force`: o cache do turbo vale aqui, e a auditoria que precisa desconfiar dele é a do `/spec --sync`.
Os dois gates citados não foram remedidos porque as correções da primeira passada só tocaram markdown.

A correção da rodada 1 do `/test` mexeu em código, então os gates foram refeitos. Os números estão na
secção daquela rodada: `pnpm check` em 624 arquivos, typecheck da `app` e do `design-system` em exit 0, e
a paridade de i18n em 33 testes.

### O vermelho da `app` não vem deste diff

O handoff documenta cinco execuções da suíte com cinco resultados diferentes: arquivos distintos estourando
o `testTimeout` de 20 s a cada vez, nenhum deles tocado pelo diff, cada um passando isolado
(`securityPolicySources` 13/13 em 359 ms, `useListUsers` 6 testes em 291 ms). Uma das execuções devolveu
exit 1 com zero testes falhando, por `close timed out after 10000ms` no teardown.

O `vitest.config.mts` da `app` já registra a causa no comentário que subiu o `testTimeout` para 20 s. É
dívida anterior à feature e não foi mexida aqui.

**Para a decisão de ligar branch protection na `main`:** ligar a proteção com essa suíte como gate
obrigatório transforma contenção de máquina em merge bloqueado por sorteio, e o pior caso já foi observado
(exit 1 sem nenhum teste falhando, que é o modo de falha mais caro de diagnosticar). A recomendação é
tratar a estabilização da suíte como pré-requisito da proteção, em tarefa própria, começando pelo reporter
`hanging-process` para achar o handle que segura o teardown.

## Decisões em aberto

1. **`fillPlaceholders` contra `interpolate`.** O repositório passa a ter duas substituições de `{chave}`:
   a nova em `UserActivitySection.tsx:30-38` e `packages/email/interpolate.ts:4-11`. Não unifiquei porque
   a casa comum seria `@repo/shared`, e mover para lá mexe em `packages/email`, `packages/shared` e
   `apps/app`, o que sai de "mudança mínima" e cruza três dos commits propostos. Recomendação: promover
   `interpolate` para `@repo/shared/utils` em tarefa própria e apagar a cópia. `apps/app` não deve importar
   de `@repo/email`, que carrega Resend.
2. **Os 15 ponteiros para `PRE-PRODUCTION.md` que ficaram deslocados.** Recomendação: deixar para o
   `/spec --sync`, que já reancora ponteiro como parte da auditoria. Corrigir à mão aqui significaria
   editar artefato arquivado de outra feature para acertar número de linha, com risco de errar o novo.
3. **`@repo/sdk` não tem script `test`.** O `exit 0` que o handoff registrou como "testes `sdk`" é pnpm
   não achando o script, não suíte verde. O pacote não tem teste nenhum. Não criei suíte aqui porque isso
   é tarefa própria e não tem relação com o defeito desta rodada. Recomendação: cobrir as actions do SDK
   num ciclo dedicado, e até lá não contar o `sdk` como coberto.

## Rodada 1 do `/test`

O QA fechou em 20 ✅, 1 ❌ e 2 🔒. O reprovado: o gráfico de recência perdia um rótulo do eixo X. Em
inglês, a 375 px, ele mediu cinco barras e quatro rótulos, com `"8 to 30d"` ausente.

### O que causava

Duas coisas somadas, e só a segunda estava no radar do QA.

A primeira é a largura dos rótulos. O espaço do gráfico na home do admin sai de uma cadeia de padding que
dá para somar lendo o código: `Container` com `p-4` (`Container.tsx:135`), o painel interno com outro
`p-4` (`:59`), a borda do `Card`, e `CardContent` com `px-6` (`card.tsx:70`). A 375 px de viewport sobram
cerca de 261 px, ou 52 px por categoria com cinco categorias. A fonte do tick é a `text-xs` do
`ChartContainer` (`chart.tsx:56`), 12 px, onde um caractere mede em torno de 6,15 px. `"31 to 90d"`, com
nove caracteres, pedia perto de 55 px e não cabia.

A segunda é o `<XAxis>` sem `interval`: o recharts assume `preserveEnd`, que descarta em silêncio o tick
que colidiria com o vizinho. O gráfico ficava com aparência de correto e uma barra sem nome.

Esse modelo de largura reproduz as cinco medições do QA, o que é o motivo de eu confiar nele:

| locale | viewport | faixa por categoria | maior rótulo | previsto | QA mediu |
|---|---|---|---|---|---|
| en | 375 px | 52,2 px | `31 to 90d`, 9 caracteres | não cabe | 4 de 5 |
| en | 390 px | 55,2 px | `31 to 90d`, 9 caracteres | no limite | 5 de 5 |
| es | 375 px | 52,2 px | `Hasta 7d`, 8 caracteres | cabe | 5 de 5 |
| es | 360 px | 49,2 px | `Hasta 7d`, 8 caracteres | não cabe | 3 de 5 |
| es | 320 px | 41,2 px | `Hasta 7d`, 8 caracteres | não cabe | 3 de 5 |

### O que mudei

Ataquei as duas causas, porque cada uma sozinha deixa um problema de pé.

1. `packages/design-system/components/ui/category-bar-chart.tsx:52` ganhou `interval={0}`. O eixo passa a
   desenhar um tick por categoria e nunca mais esconde um rótulo sem avisar.
2. `packages/internationalization/translations/apps/app/pages/admin/home.ts` teve os quatro rótulos de
   faixa encurtados para notação numérica, igual nos três idiomas: `0-7d`, `8-30d`, `31-90d`, `+90d`. O
   `never` continua sendo palavra (`Nunca`, `Never`, `Nunca`), e é o único que varia por idioma.
3. A descrição do gráfico passou a abrir com a unidade, nos três idiomas, já que o eixo ficou mudo sobre
   ela: "Dias desde o último acesso", "Days since the last sign-in", "Días desde el último acceso".

O maior rótulo passou de nove para seis caracteres, cerca de 37 px. Na faixa de 52,2 px de 375 px isso
deixa 41% de folga, e mesmo a 320 px, onde a faixa cai para 41,2 px, ainda sobra espaço. A folga saiu de
praticamente zero para uma margem que absorve erro do modelo.

### Por que `interval={0}` sozinho não bastava

Foi a hipótese que o QA sugeriu, e ela troca um defeito por outro. Forçar todos os ticks com os rótulos
longos faria `"31 to 90d"` e `"Hasta 7d"` se sobreporem nas larguras em que hoje eles somem. O resultado
deixa de ser silencioso, o que é melhor, e passa a ser ilegível, o que não é aceitável. Não cheguei a
medir essa versão isolada: a aritmética de largura acima já mostra que ela não fecha, e o dado do QA de
espanhol a 320 px aponta na mesma direção.

O caminho oposto, só encurtar a copy, resolveria esta tela e deixaria o componente compartilhado com a
mesma armadilha para a próxima que tiver muitas categorias. Por isso os dois.

Descartei `angle` com `textAnchor` nos ticks: resolve largura gastando altura e inclina rótulo de quatro
caracteres como `+90d`, que não precisa disso. Descartei também reduzir o `fontSize`, que compra poucos
pixels e piora a legibilidade justamente na largura em que ela já está no limite.

### A home comum não regride

`EntityTypeChart` usa o mesmo componente com três categorias, e o maior rótulo é `Collaborator`, com doze
caracteres, perto de 74 px. Com três categorias a faixa é de 87 px a 375 px e de 68,7 px a 320 px. Em
nenhuma das duas um par de rótulos vizinhos soma mais que a faixa, então o `preserveEnd` já desenhava os
três e o `interval={0}` não muda o que aparece na tela. `entityTypeChart.test.tsx` e
`commonHomeClient.test.tsx` seguem verdes, 16 casos.

### O que medi

| o que | comando | resultado |
|---|---|---|
| paridade e rótulos de i18n | `pnpm --filter @repo/internationalization test` | 4 arquivos, 33 testes (eram 27) |
| gráfico e bloco de atividade | `npx vitest run` nos 4 arquivos da feature | 4 arquivos, 27 testes |
| home comum, contra regressão | `npx vitest run entityTypeChart commonHomeClient` | 2 arquivos, 16 testes |
| lint | `pnpm check` | 624 arquivos, 246 ms, nenhuma correção |
| typecheck `app` | `pnpm --filter app typecheck` | exit 0 |
| typecheck `design-system` | `pnpm --filter @repo/design-system typecheck` | exit 0 |

**O que eu não medi:** a tela. Não subo app nem dirijo browser. A confirmação de que os cinco rótulos
aparecem nos três idiomas a 375 px, sem corte e sem sobreposição, é da rodada 2 do `/test`, com o mesmo
`document.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick-value')` que pegou o defeito.
Vale medir também a 320 px, onde o modelo prevê folga menor.

### Teste novo contra a volta do defeito

`packages/internationalization/__tests__/chartAxisLabels.test.ts` limita os rótulos de faixa a sete
caracteres nos três idiomas e confere que as cinco chaves existem e não estão vazias. O teste de paridade
não pega esse caso, porque a chave continua no lugar quando alguém troca `8-30d` por `8 to 30 days`. O
limite e a conta que o justifica estão escritos no arquivo.

`apps/app/__tests__/userRecencyChart.test.tsx` ganhou um caso que verifica o `interval` chegando ao
`<XAxis>`, ao lado dos que já liam as props do gráfico.

### Achado adjacente, não corrigido

Em `/en/admin` e `/es/admin` o conteúdo sai no idioma certo e o `<html lang>` fica com o locale anterior.
Origem em `apps/app/app/layout.tsx:67`, que este diff não toca. É defeito de acessibilidade real, porque o
leitor de tela escolhe a voz por esse atributo. Fora do escopo desta entrega e não corrigido aqui.

## Plano de commits

Ordem e conteúdo estão no retorno ao `/review`. A branch é `feat/admin-analytics-dashboard`.

A correção da rodada 1 acrescentou um commit de `packages/design-system`, que entra **antes** dos de
`apps/app` por ordem de dependência, e levou o teste de prefetch que o QA escreveu para o commit da
secção de atividade.

⚠️ O índice **não** está limpo: o `git mv` de `specs/user-activity-tracking.md` para
`docs/features/user-activity-tracking/spec.md` já está preparado, de uma etapa anterior. Ele pertence ao
commit da auditoria do backlog, que é o penúltimo. Rodar `git reset` antes do primeiro commit e conferir
que `git diff --cached --stat` sai vazio, senão o rename entra no commit do contrato do SDK. Isso já
aconteceu numa rodada anterior do `/cycle` neste repositório.

Commits realizados: (preenchido pelo `/review` depois da aprovação)
