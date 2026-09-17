# Revisão: home do painel com widgets

Escopo: o diff inteiro do working tree em `la-paz`, revisado contra `docs/review-checklist.md`.

## Branch

`feat/dashboard-home`, criada nesta revisão a partir de `la-paz`.

A `la-paz` é a amarração do workspace do Conductor e não foi renomeada. Ela não é branch protegida, então
o hook não bloquearia um commit ali, mas o nome não segue o padrão do repo.

O nome novo passou no regex de `.claude/rules/git-commits.md`:

```
feat/dashboard-home  →  branch OK
```

Sem prefixo de projeto porque a feature cruza `packages/sdk`, `apps/api`, `apps/app`,
`packages/design-system` e `packages/internationalization`. É o que as quatro PRs anteriores fizeram para
features multi-app: `feat/audit-log` (#18), `feat/cursor-pagination` (#17), `feat/cookie-consent` (#16),
`feat/observability-logging` (#15).

## Achados

| Sev | Arquivo:linha | Problema | Ação |
|-----|---------------|----------|------|
| 🟡 | `apps/api/app/(routes)/entities/summary/route.ts:6-7` | Comentário "Read-only by design (...) no verb here that could let a caller write a number" repete o que o arquivo já diz: ele exporta só `GET`. Viola `.claude/rules/code-comments.md` §1. O teste `entitiesSummaryRoute.test.ts:160-164` já assere `Object.keys(handlers) === ["GET"]`, que prende a regra melhor que o texto | Removido |
| 🟡 | `apps/api/app/(routes)/users/summary/route.ts:6-7` | O mesmo comentário, copiado literalmente no segundo arquivo | Removido |
| 🟢 | `packages/design-system/components/ui/category-bar-chart.tsx` | Arquivo escrito à mão numa pasta que o Biome ignora. A exclusão existe para componente shadcn vendorizado, não para código autoral | Registrado abaixo, sem alteração |
| 🟢 | `apps/app/.../(components)/EntityTypeChart.tsx:14-15` | Os rótulos do gráfico vêm de `pages.common.entities.list.typeLabels`, dicionário de outra página | Mantido: reusar é melhor que duplicar três traduções |
| 🟢 | `packages/shared/utils/helpers/handleClientError.ts:19` | O fallback `"Um erro inesperado aconteceu"` está cravado em pt-br dentro do pacote. Confirmei no browser: em erro sem `error.code` a home mostra esse texto, e mostraria em português também em `/en` e `/es` | Dívida anterior, já no `specs/BACKLOG.md`. Fora do escopo desta tarefa |
| ✅ | `apps/api/app/(routes)/*/summary/route.ts` | `export const GET = guard(...)`, guards corretos (`requireCommonPanelApi` e `requireAdminApi`), `{ error: { code } }` com `HTTP_STATUS` | |
| ✅ | `apps/api/(shared)/repositories/entity.repository.ts:29` | Conta por `ctx.subjectProfile.id`, nunca por id vindo do request. Há teste dedicado (`entitiesSummaryRoute.test.ts:110`) | |
| ✅ | `apps/app/.../(pages)/page.tsx` (comum e admin) | Prefetch RSC com a mesma `queryKey` do hook, dentro de `if (!(await isImpersonating()))`, usando `getServerApiClient` em vez do singleton | |
| ✅ | `packages/internationalization` | `SUMMARY_INDEX_MISSING` e as duas páginas novas existem nos três idiomas com estrutura igual | |
| ✅ | `packages/sdk/src/types/{entity,user}` | `Record<EntityType, number>` e `Record<UserType, number>`: um enum novo passa a quebrar a compilação do repositório, que é onde o esquecimento apareceria | |

Nada bloqueante.

## Correções aplicadas

- `apps/api/app/(routes)/entities/summary/route.ts`: removido o comentário de duas linhas acima do `export const GET`.
- `apps/api/app/(routes)/users/summary/route.ts`: removido o mesmo comentário.

Nenhuma mudança de comportamento. Os outros comentários do diff ficaram: explicam cobrança de agregação no
Firestore, a armadilha de `toLocaleString()` entre servidor e hidratação, e por que a contagem de usuários
pode passar o número de linhas da listagem. Todos se sustentam sozinhos e nenhum aponta para artefato do
fluxo.

## Reverificação independente do handoff

O `develop/handoff.md` afirma duas coisas que eu refiz do zero, sem usar os screenshots dele.

### 1. O harness do caminho degradado saiu do código

Confere. Varri o diff e os arquivos novos atrás de `FAILED_PRECONDITION`, `requires an index`, `console.log`,
`TODO` e `@ts-ignore`. As duas únicas ocorrências estão em `entitiesSummaryRoute.test.ts:82` e
`usersSummaryRoute.test.ts:92`, onde são fixture de teste. `summaryByUserId` está limpo.

O mapeamento de produção existe inteiro: `isMissingIndexError` (`apps/api/(shared)/lib/pagination.ts:59`)
reconhece o erro, as duas rotas devolvem 503 com `SUMMARY_INDEX_MISSING`, e a chave está nos três blocos de
`apiErrors`.

### 2. O gráfico renderiza

Confere, e verifiquei nos dois temas e no celular. As barras trocam de paleta entre claro (laranja, verde
azulado, azul escuro) e escuro (azul, verde, laranja), o que só acontece se vierem de `--chart-1..3` e não
do default do recharts.

### O que contradisse o handoff

**O ambiente descrito não subia.** O handoff diz que a validação rodou contra `pnpm emulators`. Nesta
máquina isso falha: o `firebase-tools` fixado em 15.30.1 exige Java 21 ou superior e só existe o Zulu 17.

```
Error: firebase-tools no longer supports Java version before 21.
```

Nada no working tree explica a diferença, porque `package.json` não foi tocado nesta tarefa. Para rodar a
validação baixei um Temurin 21 para `/tmp` e apontei `JAVA_HOME` só para os processos que subi. Nada foi
instalado na máquina. Quem for repetir a validação precisa do mesmo passo, e vale registrar isso em
`docs/PRE-PRODUCTION.md` como requisito de ambiente.

**O 503 com a mensagem traduzida continua sem prova no browser.** O handoff diz ter observado a tela pondo
`summaryByUserId` para lançar e revertendo depois. Um patch revertido não é auditável, e o emulador serve
consulta sem índice, então o erro real não acontece ali. Eu forcei a falha por fora, abortando a requisição
no browser, e vi o `LoadErrorState` aparecer com a saudação ainda na tela. Isso prova a superfície de erro,
não o texto de `SUMMARY_INDEX_MISSING`: um request abortado não carrega `error.code`, e o que apareceu foi o
fallback genérico.

O que sustenta o texto específico é o teste de rota (503 com o código certo, a partir de um erro no formato
do Firestore), a entrada em `apiErrors` e o teste de paridade. A cadeia código, cópia traduzida e tela segue
sem verificação de ponta a ponta, e é isso que o `/test` deve tratar como não verificado.

## Desvio do `CategoryBarChart`

O plano mandava o gráfico para `apps/app`. O desenvolvedor descobriu que não compila, porque `recharts` é
dependência da `packages/design-system` e o pnpm não linka o pacote em `apps/app`, e criou
`packages/design-system/components/ui/category-bar-chart.tsx` com o wrapper específico (`EntityTypeChart`)
no app.

A solução está certa, por três motivos:

1. A alternativa era declarar `recharts` em `apps/app`, o que mexe em `package.json` e no lockfile. A
   rodada tinha limite de nenhuma dependência nova.
2. A divisão entre genérico no pacote e específico no app segue a regra mestra do repo. O
   `CategoryBarChart` recebe `data`, `config` e `label` e não sabe o que é uma entidade.
3. Arquivo próprio, e não código enfiado dentro de `chart.tsx`, é o que protege a mudança de
   `pnpm bump-ui`, que roda `shadcn add --all --overwrite` e sobrescreveria `chart.tsx`.

Sobre ficar fora do Biome: `packages/design-system/components/ui` está excluído em `biome.jsonc:48`, e o
próprio `docs/review-checklist.md` §0 manda usar 2 espaços ali e não "corrigir" a indentação desses caminhos.
O arquivo segue a convenção da pasta, então não é dívida que esta tarefa criou.

Sobra um desconforto real, e ele é pequeno: a exclusão foi escrita para arquivo vendorizado que ninguém
edita, e agora a pasta guarda um componente autoral que o lint não lê. Dá para reincluir só ele, com uma
entrada negativa depois da exclusão em `biome.jsonc`. Não fiz porque muda configuração global do repositório
por causa de um arquivo, e porque o arquivo passaria a exigir 4 espaços ao lado de vizinhos com 2. Fica como
decisão do usuário.

## Raio de impacto

Contrato só cresceu, nada quebrou. `EntitySummaryDTO` e `UserSummaryDTO` são tipos novos no barrel que já
exportava `./entity` e `./user`; `entity.summary()` e `user.summary()` entraram em classes já registradas no
`Client`, então `src/client/index.ts` não mudou.

Consumidores: `useEntitySummary` e o prefetch da home comum, `useUserSummary` e o prefetch da home admin, e
`useEntityCrud`, que importa `EntitySummaryDTO` para o ajuste otimista do toggle.

`packages/design-system` ganhou um componente e uma reexportação, sem alterar nada existente, então os
outros apps não sentem. `apps/web` não é tocada.

Os três índices compostos de `firestore.indexes.json` cobrem as consultas por prefixo: `userId, deletedAt`
sai do índice `userId, deletedAt, enabled`, e o total de usuários sai do prefixo `deletedAt`.

## Validação visual

Subi emuladores (9099, 8080, 4001), api em 3012 e app em 3010. As portas 3000 e 3002 ficaram intocadas. No
fim matei tudo por PID, inclusive os dois processos filhos do emulador que sobreviveram ao primeiro `kill`,
e conferi que as seis portas voltaram a sair vazias.

Screenshots em `review/screenshots/`.

| Fluxo | Resultado |
|---|---|
| Home comum, tema claro | 4 entidades, 3 ativas, barras 2/1/1 somando o total |
| Home comum, tema escuro | mesmos números, paleta de barras diferente |
| Home comum, 390x844 | cartões empilham, gráfico cabe, rótulos legíveis |
| Home comum, erro | `LoadErrorState` com a saudação preservada, sem tela branca nem esqueleto eterno |
| Home comum, personificando `user@example.com` | mostra os dados do personificado, não os do admin. Switches e botão de cadastro desabilitados |
| Home admin, claro, escuro e celular | 3 usuários, 1 admin, 2 comuns, iguais ao seed |
| Home admin, carregando | esqueleto dos três cartões |
| Toggle na lista e volta para a home | "Ativas" caiu de 3 para 2 sem recarregar a página |

Duas observações do log e do snapshot:

- `GET /entities/summary 200` no log da api confirma que o segmento estático vence o `[id]` vizinho. Se
  perdesse, viria `ENTITY_NOT_FOUND`.
- `GET /entities/summary 403` quando o admin está no painel dele, sem personificar. O guard recusa antes do
  repositório.
- Numa carga limpa o browser não chega a pedir o resumo: o prefetch RSC resolve tudo. A requisição do
  cliente só aparece em personificação, que é quando o prefetch é pulado.

O que não foi visto: o estado vazio (nenhum usuário do seed tem zero entidades) e o `chart.empty`. Ambos são
ramo de `if` simples e têm o screenshot do `/develop`. Só Chrome, sem leitor de tela.

## Lacunas de teste para o `/test`

- `CommonHomeClient` e `AdminHomeClient` não têm teste de componente. Carga, vazio e erro foram vistos só no
  browser.
- `CategoryBarChart` não tem teste.
- O 503 real por índice ausente continua sem prova executável. Os três índices não estão publicados em
  ambiente nenhum, e `firestoreIndexes.test.ts` confere o texto do arquivo, não o comportamento.
- O estado vazio e o `chart.empty` não foram reexecutados nesta revisão.
- O cartão "Usuários" pode passar o número de linhas de `/admin/users` quando existir perfil sem conta de
  Auth. É comportamento documentado no DTO, não defeito.

## Decisões em aberto

1. **Reincluir `category-bar-chart.tsx` no Biome?** Recomendo não fazer agora. O ganho é um arquivo lintado;
   o custo é configuração global e indentação misturada na pasta. Se a pasta receber um segundo componente
   autoral, vale reabrir.
2. **Registrar o Java 21 como requisito de ambiente?** Recomendo uma linha em `docs/PRE-PRODUCTION.md`, já
   que `pnpm emulators` é o caminho padrão de validação local e hoje falha sem dizer como resolver.

## Gates

| Comando | Resultado |
|---|---|
| `pnpm check` | 598 arquivos, 0 erro |
| `pnpm turbo run lint typecheck test` | 24/24 tasks |
| `pnpm --filter @repo/internationalization test` | 3 arquivos, 27 testes, paridade dos 3 idiomas |

Medidos depois das correções, já na `feat/dashboard-home`.

## Plano de commits

Proposto, não executado. Os commits ficam para o `/review` aplicar bloco a bloco, com aprovação do usuário.

| # | Mensagem | Escopo |
|---|---|---|
| 1 | `docs(specs): re-measure backlog anchors against the current code` | `specs/*`, `docs/PRE-PRODUCTION.md`, `docs/SECURITY.md`, `docs/PAYMENTS.md` |
| 2 | `docs(specs): archive the audit-log spec as a delivered feature` | `git mv specs/audit-log.md docs/features/audit-log/spec.md` |
| 3 | `feat(sdk): add entity and user summary types` | `packages/sdk/src/types/*` |
| 4 | `feat(sdk): add entity and user summary actions` | `packages/sdk/src/actions/*` |
| 5 | `feat(api): add a counted query helper to the base repository` | `base.repository.ts` + casos em `baseRepository.test.ts` |
| 6 | `feat(api): aggregate entity and user counts in the repositories` | `entity.repository.ts`, `user.repository.ts` |
| 7 | `feat(api): serve the entity and user summary endpoints` | as duas `summary/route.ts` + os dois testes de rota |
| 8 | `feat(api): declare the composite indexes for the summary queries` | `firestore.indexes.json` + `firestoreIndexes.test.ts` |
| 9 | `feat(design-system): add a category bar chart on top of the chart primitive` | `category-bar-chart.tsx`, `components/ui/index.ts` |
| 10 | `feat(app): add summary query keys and data hooks` | `queryKeys.ts`, os dois hooks, `useEntitySummary.test.tsx` |
| 11 | `feat(app): add a metric card component` | `shared/components/ui/MetricCard.tsx` |
| 12 | `feat(app): fill the common panel home with summary widgets` | `page.tsx`, `loading.tsx`, `CommonHomeClient.tsx`, `EntityTypeChart.tsx` da home comum |
| 13 | `feat(app): fill the admin panel home with user metrics` | `page.tsx`, `loading.tsx`, `AdminHomeClient.tsx` da home admin |
| 14 | `feat(app): refresh the entity summary after entity mutations` | `useEntityCrud.tsx` + `useEntityCrud.test.tsx` |
| 15 | `feat(internationalization): add the home page and summary error copy` | os dois `home.ts`, os dois `index.ts`, `shared/utils.ts` |
| 16 | `docs(features): dashboard-home` | `docs/features/dashboard-home/` |

Ordem de dependência: `packages/sdk`, `apps/api`, `packages/design-system`, `apps/app`,
`packages/internationalization`. O design-system sobe antes do app porque `EntityTypeChart` importa o
`CategoryBarChart`.

A pasta `docs/features/dashboard-home/` não tem credencial. A senha `demo1234` que aparece no handoff é a do
seed do emulador, impressa pelo próprio `seed-emulator.mjs`.

Título de PR sugerido: `feat: dashboard home with summary widgets`.

### Commits realizados

(preenchido pelo `/review` depois da aprovação)
