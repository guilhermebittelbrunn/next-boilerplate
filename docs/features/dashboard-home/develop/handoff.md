# Handoff: home do painel com widgets

Plano: `analyze/plan.md`. Spec: `specs/dashboard-home.md`. Rodada autônoma, sem interrupção para perguntas.

As duas homes do painel deixaram de ser `<Header page="Home" /> + <Container />`. A comum mostra saudação,
dois cartões numéricos e um gráfico de barras por tipo de entidade; a admin mostra três cartões sobre a base
de usuários. Os números vêm de `count()` do Firestore, sob os guards que já existiam.

## Blueprint → arquivos

### `packages/sdk`

| Item do blueprint | Arquivo |
|---|---|
| `EntitySummaryDTO` | `src/types/entity/entity.ts` |
| `UserSummaryDTO` | `src/types/user/user.ts` |
| `entity.summary()` | `src/actions/entity/action.ts` |
| `user.summary()` | `src/actions/user/user/action.ts` |

`src/client/index.ts` não mudou: os métodos entraram em classes que já estavam registradas.

### `apps/api`

| Item | Arquivo |
|---|---|
| `countQuery` protegido | `(shared)/repositories/base.repository.ts` |
| `summaryByUserId` | `(shared)/repositories/entity.repository.ts` |
| `summary` | `(shared)/repositories/user.repository.ts` |
| `GET /entities/summary` | `app/(routes)/entities/summary/route.ts` (novo) |
| `GET /users/summary` | `app/(routes)/users/summary/route.ts` (novo) |
| Três índices compostos | `firestore.indexes.json` |

### `apps/app`

| Item | Arquivo |
|---|---|
| Chaves de cache | `shared/lib/queryKeys.ts` (`entities.summary`, `users.summary`) |
| `useEntitySummary` + `fetchEntitySummary` | `.../(common)/(pages)/(hooks)/useEntitySummary.tsx` (novo) |
| `useUserSummary` + `fetchUserSummary` | `.../(admin)/admin/(pages)/(hooks)/useUserSummary.tsx` (novo) |
| `MetricCard` | `shared/components/ui/MetricCard.tsx` (novo) |
| Gráfico da home comum | `.../(common)/(pages)/(components)/EntityTypeChart.tsx` (novo) |
| Home comum | `.../(common)/(pages)/(components)/CommonHomeClient.tsx` + `page.tsx` + `loading.tsx` |
| Home admin | `.../(admin)/admin/(pages)/(components)/AdminHomeClient.tsx` + `page.tsx` + `loading.tsx` |
| Invalidação do resumo | `.../entities/(hooks)/useEntityCrud.tsx` |

### `packages/design-system`

`components/ui/category-bar-chart.tsx` (novo) e a reexportação em `components/ui/index.ts`. Esse é o desvio
principal do plano, explicado abaixo.

### `packages/internationalization`

`translations/apps/app/pages/common/home.ts` e `.../admin/home.ts`, registrados nos dois `index.ts`; mais
`SUMMARY_INDEX_MISSING` nos três blocos de `apiErrors` em `translations/packages/shared/utils.ts`.

## Contrato

Duas adições, nenhuma quebra. `EntitySummaryDTO` (`total`, `enabled`, `byType`) e `UserSummaryDTO`
(`total`, `byType`) saem pelo barrel de tipos que já exportava `./entity` e `./user`.

Consumidores hoje: `useEntitySummary` e o prefetch RSC da home comum; `useUserSummary` e o prefetch da home
admin; `useEntityCrud`, que importa `EntitySummaryDTO` para o ajuste otimista do toggle.

## Código de erro novo

`SUMMARY_INDEX_MISSING`, 503, devolvido pelas duas rotas quando `isMissingIndexError` reconhece a recusa do
Firestore. Traduzido nos três idiomas em `apiErrors`; o teste de paridade passa.

## Desvios do plano

### 1. O gráfico não cabia em `apps/app` (desvio com impacto)

O plano manda criar `EntityTypeChart` na `apps/app` usando `BarChart` do `recharts`. **Isso não compila**:
`recharts` é dependência da `packages/design-system` e o pnpm não cria o link em `apps/app`, que não o
declara. O `chart.tsx` do design-system exporta o container e o tooltip, não os primitivos de desenho.

Duas saídas eram possíveis: declarar `recharts` na `apps/app` (mexe em `package.json` e no lockfile, contra
o limite de "nenhuma dependência nova" desta rodada) ou pôr o gráfico no pacote. Escolhi a segunda, dividida
em duas camadas para não levar domínio para dentro do pacote:

- `packages/design-system/components/ui/category-bar-chart.tsx` — `CategoryBarChart`, genérico: recebe
  `data` (pares categoria/valor), `config` e `label`, e nada sabe sobre entidades.
- `apps/app/.../(components)/EntityTypeChart.tsx` — específico: monta o `ChartConfig` com os rótulos de
  `entities.list.typeLabels` e as cores `--chart-1..3`, e mapeia `EntitySummaryDTO["byType"]`.

O `next/dynamic` com `ssr: false` continua onde o plano pediu, no `CommonHomeClient`, e agora carrega o
wrapper específico, que puxa o `recharts` junto no mesmo chunk.

O revisor precisa olhar isto: `packages/design-system/components/ui` está **fora do Biome**
(`biome.jsonc`, bloco `files.includes`), então o arquivo novo não passa por `pnpm check` e segue a
indentação de 2 espaços dos vizinhos, não a do resto do repo.

### 2. Teste do repositório dentro de `baseRepository.test.ts`

O plano previa `apps/api/__tests__/entityRepositorySummary.test.ts`. O `fakeDb` (o Firestore em memória) é
um `vi.hoisted` privado de `baseRepository.test.ts`, com cerca de 200 linhas; um arquivo separado teria que
duplicá-lo ou exportá-lo. Os testes de agregação foram para o mesmo arquivo, logo depois dos que já existem,
e o `fakeDb` ganhou `count()`, como o risco 1 do plano antecipava.

### 3. Refusal do guard no teste de rota

O plano esperava `COMMON_PANEL_FORBIDDEN` quando um admin chama `/entities/summary`. O guard recusa antes
disso, com `AUTH_REQUEST_IMPERSONATION_REQUIRED` (403), porque o admin não indicou sujeito. O teste assere o
código que a rota devolve de verdade. A recusa acontece e o repositório não é tocado, que é o que importa.

### 4. Número sem separador de milhar

`MetricCard` imprime o número cru. `toLocaleString()` sem argumento resolve o separador pelo locale do
runtime: o Node do servidor e o navegador do visitante podem discordar, e o número mudaria entre o HTML e a
hidratação. Um fork que precise de formatação tem um ponto só para mexer.

### 5. Saudação sem nome

O plano previa `` `${greeting}, ${firstName}` ``. Quando a conta não tem `displayName` (o caso das contas do
seed), a tela mostraria "Olá, " com a vírgula solta. O código cai para só a saudação. Nenhuma chave nova.

### 6. Gráfico com todas as categorias zeradas

Se `total > 0` mas as três contagens por tipo derem zero (documento gravado fora da API, sem `type`, que é o
risco 3 do plano), o cartão mostra `chart.empty` em vez de três colunas vazias. A chave já estava prevista
na seção 10.9 do plano; o plano só não dizia onde ela seria usada.

## Validação

Tudo medido, nesta ordem:

```
pnpm check                          → 598 arquivos, 0 erro
pnpm turbo run lint typecheck test  → 24/24 tasks
pnpm --filter api test              → 48 arquivos, 532 testes
pnpm --filter app test              → 48 arquivos, 348 testes
pnpm --filter @repo/internationalization test → 3 arquivos, 27 testes (paridade dos 3 idiomas)
```

Testes novos: `apps/api/__tests__/entitiesSummaryRoute.test.ts` (7), `.../usersSummaryRoute.test.ts` (6),
6 casos de agregação em `baseRepository.test.ts`, 2 casos de índice em `firestoreIndexes.test.ts`,
`apps/app/__tests__/useEntitySummary.test.tsx` (3) e 3 casos em `useEntityCrud.test.tsx`.

## Validação visual

Portas 3000 e 3002 estavam ocupadas por um app Electron de outro workspace do usuário, que **não foi
tocado**. Subi a `api` em 3012 e a `app` em 3010, contra os emuladores do Firebase (`pnpm emulators` +
`pnpm seed`, projeto `demo-next-boilerplate`), com as variáveis de ambiente passadas só na linha de comando.
Nenhum `.env` foi editado. Emuladores, api e app foram derrubados no fim, um PID por vez.

Screenshots em `develop/screenshots/`:

| Arquivo | O que prova |
|---|---|
| `common-home-light.png` / `common-home-dark.png` | cartões e gráfico nos dois temas; as barras trocam de paleta (laranja/verde-azulado/azul-escuro no claro, azul/verde/laranja no escuro), então vêm de `--chart-1..3` e não do default do recharts |
| `common-home-mobile.png` / `common-home-mobile-top.png` | 390 × 844: cartões empilham, gráfico cabe na viewport, rótulos de valor legíveis |
| `common-home-en.png` / `common-home-es.png` | mesma tela em inglês e espanhol |
| `common-home-empty.png` | usuário sem nenhuma entidade: título, orientação e botão de cadastro, sem zeros soltos |
| `common-home-index-missing.png` | caminho degradado (ver abaixo) |
| `common-home-impersonating.png` | admin personificando `user2@example.com` vê 2/2 e o gráfico do personificado; o botão do estado vazio fica desabilitado em personificação |
| `admin-home-light.png` / `admin-home-dark.png` / `admin-home-mobile.png` / `admin-home-en.png` / `admin-home-es.png` | três cartões admin nos dois temas, no celular e nos três idiomas |

Fluxos percorridos: login como `user@example.com`, home comum com 4 entidades (4 total, 3 ativas, gráfico
2/1/1, soma batendo com o total); toggle de `enabled` na lista e volta para a home, com "Ativas" caindo de 3
para 2; exclusão de uma entidade e volta para a home, com o total caindo de 4 para 3 sem recarregar a página;
exclusão das três restantes até o estado vazio; troca de painel e de usuário personificado; login como
`admin@example.com` na home admin (3 usuários, 1 admin, 2 comuns, iguais ao seed).

O log da API confirma `GET /entities/summary 200` e `GET /users/summary 200`, ou seja, o segmento estático
vence o `[id]` vizinho: se perdesse, a resposta seria `ENTITY_NOT_FOUND` (risco 2 do plano).

### Caminho degradado

O emulador serve consulta sem índice, então o 503 não acontece sozinho ali. Para exercitar a cadeia inteira,
fiz `summaryByUserId` lançar um erro no formato `9 FAILED_PRECONDITION: ... requires an index`, tirei o
screenshot e **reverti a alteração** (`git status` confirma que ela não ficou na árvore).

Resultado: `GET /entities/summary 503` no log da API e a home renderizando "O resumo está indisponível no
momento. Tente de novo em instantes. (Código do erro: …)" dentro do `LoadErrorState`, com a saudação ainda
na tela. Sem 500, sem tela branca, sem esqueleto eterno.

### O que a validação não prova

- **Nada foi verificado contra um Firestore real.** Só o emulador, que serve qualquer consulta indexada ou
  não. Se os três índices compostos declarados estão corretos e suficientes para uma aggregation query,
  isso continua sem prova executável. A declaração está coberta por `firestoreIndexes.test.ts`, que é
  verificação de texto, não de comportamento.
- **O 503 real, por índice ausente, não foi observado** — foi simulado por um erro com a mesma forma. O que
  ficou provado é a cadeia repositório → rota → SDK → `apiErrors` → UI.
- **A divergência da seção 2.3 do plano** (perfil órfão de Auth inflando o cartão de usuários) tem teste
  unitário, mas não foi reproduzida no browser.
- Chrome apenas. Sem Safari, sem Firefox, sem leitor de tela.

## Achados que não virei correção

**Hidratação do dicionário no cliente.** Abrir `/es` ou `/en` com o cookie `x-locale` apontando para outro
idioma gera "Hydration failed" no overlay do Next: `getDictionary()` do cliente lê o cookie, que o SSR não
enxerga, e o servidor renderiza o idioma padrão. **Não é da feature**: reproduzi o mesmo erro em
`/es/entities`, que já existia antes desta tarefa. As homes novas passam a exibir o mesmo sintoma porque
usam o mesmo mecanismo. Corrigir mexe na resolução de locale de todo o app.

**Gráfico durante o redimensionamento.** Um screenshot de página inteira (que redimensiona a viewport) pega
as barras em altura zero: o `ResponsiveContainer` remede e o recharts reinicia a animação. Some sozinho.
Vale saber ao escrever teste visual automatizado, que pode capturar nesse instante.

## Para o `/review`

- O arquivo em `packages/design-system/components/ui/` fica fora do Biome (desvio 1).
- `EntityType`/`UserType` passaram de `import type` para import de valor nos dois repositórios, porque as
  queries comparam os valores do enum.
- `useEntityCrud` ganhou invalidação do resumo em `create`, `update` e `delete`, e ajuste por `setQueryData`
  com rollback no toggle, sem `invalidateQueries` (regra de ouro 8).

## Para o `/test`

- Os três índices não estão publicados em ambiente nenhum. Qualquer critério que dependa de `count()` contra
  Firestore real é **não verificado**, conforme a seção 12 do plano.
- O cartão "Usuários" da home admin pode mostrar um número maior que a quantidade de linhas em
  `/admin/users` quando existir perfil sem conta de Auth. É comportamento documentado, não defeito.
- A soma das barras do gráfico pode ficar abaixo do total quando existir documento de `entity` sem `type`.
  A UI mostra `chart.empty` quando as três contagens dão zero e não tenta reconciliar nos outros casos.
- Sem cobertura: renderização do `CommonHomeClient` e do `AdminHomeClient` em teste de componente (os
  estados de carga, vazio e erro foram conferidos só no browser) e o `CategoryBarChart`.
