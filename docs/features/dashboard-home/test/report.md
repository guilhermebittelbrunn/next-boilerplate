# Relatório de QA: home do painel com widgets

Escopo: o diff inteiro do working tree em `la-paz`, na branch `feat/dashboard-home`. Nada foi commitado.
Checklist completo em `criterios-aceite.md`.

## Placar

| Classificação | Quantidade |
|---|---|
| aprovado | 22 |
| reprovado | 0 |
| não verificado | 2 |

Os dois não verificados são os índices compostos da seção 12 do plano. Ninguém os publicou em ambiente
algum, e o emulador do Firestore serve consulta sem índice, então nem o caminho feliz contra Firestore real
nem o 503 por índice ausente têm prova executável. Pré-requisito manual de infraestrutura não reprova
entrega.

## Gates

Medidos depois das correções deste QA.

| Comando | Resultado |
|---|---|
| `pnpm check` | 601 arquivos, 0 erro |
| `pnpm turbo run lint typecheck test --force --continue` | 24/24 tasks |
| suíte completa | 1276 testes em 130 arquivos |

Distribuição: `apps/api` 532 em 48 arquivos, `apps/app` 370 em 51, `@repo/email` 137 em 7, `@repo/auth` 62
em 6, `@repo/shared` 44 em 4, `@repo/analytics` 34 em 2, `web` 31 em 5, `@repo/security` 31 em 3,
`@repo/internationalization` 27 em 3, `@repo/payments` 8 em 1.

O `pnpm check` chegou vermelho nesta etapa por causa de um teste escrito aqui: um número literal em
`adminHomeClient.test.tsx` violava `lint/style/noMagicNumbers`. Extraí para
`METRIC_CARDS_ON_THE_ADMIN_HOME` e o gate fechou. Nenhum teste foi desativado ou afrouxado.

Cuidado ao ler o log de `pnpm turbo run lint typecheck test` sem `--continue`: ele para na primeira falha,
e um lint vermelho faz parecer que `typecheck` e `test` também quebraram.

## Testes criados

Quatro arquivos, 22 testes, todos no nível mais barato que prova o comportamento. Nenhum exige emulador
nem app de pé.

| Arquivo | Testes | O que prova |
|---|---|---|
| `apps/app/__tests__/commonHomeClient.test.tsx` | 10 | Cartões com os números do resumo; gráfico recebendo `byType`; `chart.empty` quando os três tipos dão zero; estado vazio com botão habilitado e desabilitado em personificação; esqueleto sem zeros durante a carga; `LoadErrorState` com a cópia de `SUMMARY_INDEX_MISSING`; saudação com nome da conta, com nome do Firebase e sem nome |
| `apps/app/__tests__/adminHomeClient.test.tsx` | 6 | Os três cartões com os valores certos; saudação; três esqueletos durante a carga; `LoadErrorState` com a mesma cópia; confirmação de que a tela não chama `useMyAccount`, que responderia 403 para admin |
| `apps/app/__tests__/entityTypeChart.test.tsx` | 6 | Ordem e valores das colunas; `fill` apontando para `var(--color-<categoria>)`; bloco de estilo ligando essas variáveis a `--chart-1..3` no claro e no escuro; rótulos do eixo vindos do dicionário; categoria desconhecida legível; `role="img"` com `aria-label` |

### Por que nesse nível

Os três arquivos são testes de componente com jsdom, a faixa barata deste repo. A alternativa cara seria
provar as mesmas coisas dirigindo o app, e nada aqui é comportamento de infraestrutura: é renderização
condicional e montagem de props.

Um caso mereceu decisão explícita. `EntityTypeChart` monta o `CategoryBarChart`, que usa recharts, e
recharts mede o DOM antes de desenhar; em jsdom toda caixa tem tamanho zero, então a biblioteca real não
desenha nada. Em vez de escalar para um teste com navegador, mockei o módulo `recharts` com stubs que
guardam as props recebidas. O que está em teste são as props que o componente passa, que é onde mora a
ligação com o tema e com o dicionário, e não o desenho do SVG. O desenho foi conferido no browser, com
screenshot nos dois temas.

`CategoryBarChart` ficou coberto por esse mesmo arquivo, a partir do app. `packages/design-system` não tem
script de `test` nem configuração de Vitest; montar isso para um arquivo custaria dependência nova,
`package.json` alterado e uma task a mais no turbo, e o alias `@repo` da `apps/app` já resolve o pacote.

### Rotas e hooks: o que já existia

Não criei teste novo para as rotas de resumo nem para os hooks. `entitiesSummaryRoute.test.ts` (7 casos) e
`usersSummaryRoute.test.ts` (6 casos) já cobrem envelope de resposta, ownership pelo perfil do contexto,
401, 403, 503 com `SUMMARY_INDEX_MISSING`, erro alheio relançado e a ausência de verbo de escrita.
`useEntitySummary.test.tsx` cobre a chave de cache e a espera pelo token; `useEntityCrud.test.tsx` cobre o
ajuste otimista, o rollback e as invalidações. Acrescentar cenário ali seria redundância paga em todo CI.

## Critérios por item

Detalhe de cada um em `criterios-aceite.md`. Resumo do meio de verificação:

| Critério | Status | Verificado por |
|---|---|---|
| Total vem de consulta própria | aprovado | e2e + teste de componente |
| "Ativas" conta só `enabled == true` | aprovado | e2e |
| Home admin separa admin de comum | aprovado | e2e + teste de rota |
| Cartão de usuários pode passar a listagem | aprovado | teste unitário do repositório |
| `/entities/summary` conta só o sujeito | aprovado | teste de rota |
| Admin sem personificar recebe 403 | aprovado | teste de rota + log da API |
| `/users/summary` exige admin | aprovado | teste de rota |
| Personificação mostra o personificado | aprovado | e2e |
| Nenhuma rota aceita escrita | aprovado | teste de rota |
| Carga mostra esqueleto, não zeros | aprovado | teste de componente |
| Estado vazio orienta o cadastro | aprovado | e2e + teste de componente |
| Botão do vazio desabilitado em personificação | aprovado | teste de componente |
| Tipos zerados mostram aviso, não gráfico | aprovado | e2e + teste de componente |
| Falha mostra cópia traduzida | aprovado | teste de componente |
| Saudação sem vírgula solta | aprovado | e2e + teste de componente |
| Barras usam os tokens de tema | aprovado | e2e + teste de componente |
| Rótulos do eixo saem do dicionário | aprovado | e2e + teste de componente |
| Gráfico com `aria-label` | aprovado | e2e + teste de componente |
| `summary` vence `[id]` | aprovado | log da API |
| Toggle move "Ativas" sem refetch | aprovado | e2e + teste de hook |
| Mutations invalidam o resumo | aprovado | teste de hook |
| Prefetch escreve na chave do hook | aprovado | teste de hook |
| Índices publicados, rotas em 200 | não verificado | ninguém publicou os índices |
| 503 real por índice ausente | não verificado | emulador não recusa consulta sem índice |

## Validação executável

Percorri o app com `agent-browser`, em sequência, contra os emuladores. Screenshots em `test/e2e/`.

| Arquivo | O que mostra |
|---|---|
| `01-home-comum-claro.png` | Home comum em tema claro, 4 e 3 |
| `02-home-comum-grafico-claro.png` | Gráfico no claro: 2, 1, 1 somando o total, paleta laranja/verde azulado/azul escuro |
| `03-home-comum-grafico-escuro.png` | Mesmos números no escuro, paleta azul/verde/laranja |
| `04-home-comum-mobile.png` | 390x844: cartões empilhados, gráfico dentro da viewport |
| `05-home-comum-apos-toggle.png` | "Ativas" em 4 depois de ligar um registro pela lista |
| `06-home-admin-escuro.png` | Home admin no escuro: 3, 1, 2 |
| `07-admin-usuarios-lista.png` | `/admin/users` com 3 linhas, para cruzar com o cartão |
| `08-home-comum-personificando-user2.png` | Admin personificando `user2@example.com`: 2 e 2 |
| `11-home-comum-vazia.png` | Conta sem nenhum registro |
| `12-home-comum-grafico-vazio.png` | Total 1 com os três tipos em zero: aviso no lugar do gráfico |
| `13-home-comum-personificando-claro.png` | Personificação no tema claro, com as barras desenhadas |
| `14-artefato-aba-oculta-sem-barras.png` | Armadilha de harness, explicada abaixo |
| `15-home-admin-claro.png` | Home admin no tema claro |
| `16-home-admin-mobile.png` | Home admin em 390x844 |
| `17-home-admin-en.png` / `18-home-admin-es.png` | Home admin em inglês e espanhol |

Fluxos percorridos: entrar como `user@example.com`; ler os cartões e o gráfico nos dois temas e em largura
de celular; ligar um registro na lista e voltar para a home; sair e entrar como `admin@example.com`; ler os
três cartões e cruzar com `/admin/users`; trocar para o painel do usuário e personificar `user2` e depois
`user`; entrar como `user2@example.com`, excluir os dois registros e ver o estado vazio; gravar um
documento de `entity` sem `type` direto no emulador e ver o aviso do gráfico; abrir a home admin em `/en` e
`/es`.

O log da API registrou 27 respostas 200 em `GET /entities/summary`, 13 respostas 403 (admin no painel dele,
sem personificar) e 16 respostas 200 em `GET /users/summary`. Nenhum `ENTITY_NOT_FOUND`, o que confirma que
o segmento estático vence o `[id]` vizinho.

### A armadilha de harness que custou tempo

Depois de trocar a viewport, o gráfico passou a renderizar os eixos e os rótulos mas nenhuma barra, em toda
carga, inclusive fora de personificação. Cheguei a tratar como defeito de personificação antes de medir:
`document.visibilityState` estava em `"hidden"`, e a aba oculta suspende `requestAnimationFrame`, que é o
que move a animação inicial das barras do recharts. Reativando a aba, as barras e os rótulos de valor
voltaram na mesma carga. O print `14-artefato-aba-oculta-sem-barras.png` guarda o sintoma, porque quem
escrever teste visual automatizado vai esbarrar nele.

### O que não deu para exercitar no browser

- O 503 com a cópia traduzida. Tentei duas coisas. Derrubar a API não serve: sem ela, o proxy do app entra
  em laço de redirecionamento (`ERR_TOO_MANY_REDIRECTS`) em qualquer rota autenticada, inclusive
  `/pt-br/entities`, que existe desde antes desta feature. Interceptar a resposta pelo navegador também não
  funcionou: numa carga normal quem busca o resumo é o prefetch RSC, que sai do servidor e não passa pelo
  navegador, e em personificação a requisição do cliente ignorou o stub. A cópia na tela ficou coberta por
  teste de componente nas duas homes, partindo de um erro que carrega `SUMMARY_INDEX_MISSING`.
- A divergência entre o cartão de usuários e a listagem. Precisa de perfil sem conta de Auth, que o seed
  não cria.
- Só Chrome, sem Safari, sem Firefox, sem leitor de tela.

## Ambiente do e2e

As portas 3000 e 3002 estavam livres nesta rodada, mas usei 3010 (app) e 3012 (api), como as etapas
anteriores, porque o app Electron do usuário pode voltar a ocupá-las. Subi tudo eu mesmo: emuladores de
Auth e Firestore (9099, 8080, 4001, mais 4400, 4500 e 9150 que o Firebase reserva), api e app. Não
reutilizei nada do usuário.

`pnpm emulators` falha nesta máquina: `firebase-tools` 15.30.1 exige Java 21 ou superior e só existe o Zulu
17. Baixei um Temurin 21 para `/tmp` e apontei `JAVA_HOME` apenas nos processos que subi. Nada foi
instalado na máquina, e apaguei o diretório no fim. O procedimento correto já está descrito em
[`docs/SETUP.md`](../../../SETUP.md) (pré-requisitos e seção de emuladores): a fórmula do `brew` é
keg-only, então exportar `JAVA_HOME` e `PATH` antes de `pnpm emulators` resolve.

Nenhum `.env` foi editado. O `.env` local aponta para um projeto Firebase real, então passei
`FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` e o id `demo-next-boilerplate` na linha de comando
de cada processo, para que o Admin SDK não pudesse alcançar o projeto real.

No fim matei os quatro processos por PID. Os filhos que sobrevivem ao primeiro `kill` apareceram de novo,
como o `/review` tinha registrado: ao derrubar a api, a porta 3012 continuou ocupada por um filho, que
precisou de um segundo `kill` pelo PID. Conferi no encerramento que 3010, 3012, 9099, 8080, 4001, 4400,
4500 e 9150 estão todas livres.

## Dados de QA criados

Tudo viveu apenas nos emuladores, que foram derrubados. Nenhuma conta nova foi criada: usei as três do seed
(`admin@example.com`, `user@example.com`, `user2@example.com`, senha `demo1234`, impressa pelo próprio
`seed-emulator.mjs`). O que alterei nos dados do seed, e que some ao reexecutar `pnpm seed`:

- `user@example.com`: o registro "Retired Unit" foi ligado, então a conta ficou com 4 ativos em vez de 3.
- `user2@example.com`: os dois registros do seed foram excluídos.
- `user2@example.com`: recebeu um documento de `entity` sem `type`, chamado "QA sem tipo", gravado direto
  no Firestore do emulador para exercitar o aviso do gráfico.

Nenhum harness ficou no repositório. Removi o `01-home-comum-claro.png` que estava solto na raiz, o
diretório temporário do JDK e os logs em `/tmp`.

## Lacunas e recomendação

Recomendo seguir para o commit. Nenhum critério falhou e os gates estão verdes.

O que continua em aberto, por ordem de importância:

1. Publicar os três índices compostos no primeiro ambiente com Firestore real e confirmar que as duas
   rotas respondem 200. É o único jeito de fechar os dois não verificados, e é a diferença entre a feature
   funcionar localmente e funcionar em produção. O runbook está em
   [`docs/PRE-PRODUCTION.md`](../../../PRE-PRODUCTION.md) §1.5.
2. O laço de redirecionamento do proxy quando a API está fora do ar vale investigação própria. Não é desta
   feature, reproduz em `/pt-br/entities`, mas transforma indisponibilidade da API em tela inacessível em
   vez de mensagem de erro.
