# Relatório de QA

Feature `admin-analytics-dashboard`, branch `feat/admin-analytics-dashboard`. Nada commitado; tudo no
working tree, incluindo o arquivo de teste que esta etapa criou.

O QA rodou em duas passadas. A primeira reprovou um critério e o `/review` corrigiu; a segunda remediu no
browser o que só o browser prova. As duas subiram emulador, API e app: nenhuma outra etapa da entrega
executou o produto.

## Veredito

**20 ✅, 0 ❌, 2 🔒, sobre 22 critérios.**

A primeira passada fechou em 19 ✅, 1 ❌ e 2 🔒. O ❌ era o eixo do gráfico perdendo rótulo, e a correção do
`/review` o resolveu: remedi e virou ✅.

Correção de contagem: o resumo da primeira passada dizia "20 ✅ sobre 23 critérios". O checklist tem 22
critérios, e o certo era 19 ✅. Erro de soma meu, não mudança de veredito.

Os dois 🔒 seguem iguais: a degradação por índice composto ausente contra Firestore real e o custo faturado
da agregação. Nenhum dos dois é observável sem projeto real com billing, e o plano já previa isso.

## Gates e suíte

Números da segunda passada, com os três arquivos corrigidos já no disco.

| gate | comando | resultado |
|---|---|---|
| lint | `pnpm check` | 624 arquivos em 380 ms, nenhuma correção aplicada |
| testes `api` | `pnpm --filter api test` | 53 arquivos, 597 testes, todos verdes |
| testes `app` | `pnpm --filter app test` | 58 arquivos, 418 testes, todos verdes |
| i18n | `pnpm --filter @repo/internationalization test` | 4 arquivos, 33 testes, com `parity.test.ts` e `chartAxisLabels.test.ts` |
| turbo | `pnpm test` | 10 de 10 tasks verdes |
| typecheck | `pnpm --filter <workspace> typecheck` em `app`, `api`, `@repo/sdk`, `@repo/internationalization`, `@repo/design-system` | exit 0 nos cinco |

Sem `--force` em nenhum.

Entre as duas passadas a `app` foi de 417 para 418 testes (o caso novo em `userRecencyChart.test.tsx`) e a
i18n de 27 para 33 (o `chartAxisLabels.test.ts`, 6 casos).

**A instabilidade da suíte da `app` não apareceu em nenhuma das duas passadas.** O handoff documenta cinco
execuções com cinco resultados diferentes, incluindo uma que devolveu exit 1 sem nenhum teste falhando.
Rodei a suíte inteira cinco vezes somando as duas passadas, todas verdes, entre 11 e 18 segundos de
relógio. Não repeti arquivo isolado porque não houve falha para diagnosticar. Isso não desmente o handoff:
a causa apontada lá é contenção de máquina, e a máquina estava ociosa aqui.

`@repo/sdk` **não tem script de teste**. O `pnpm --filter @repo/sdk test` do handoff sai com exit 0 porque
o pnpm não reclama de script ausente, não porque algo rodou. O contrato do SDK fica coberto de forma
indireta, pelos testes de rota e de hook que o consomem.

## O defeito do eixo, e como ele fechou

### O que a primeira passada encontrou

A 375 px, em inglês, o gráfico mostrava cinco barras e quatro rótulos. Sumia `"8 to 30d"`, o do meio, e a
barra ficava sem identificação nenhuma. pt-br e es mostravam os cinco na mesma largura. Abaixo de 375 px o
problema atingia os três idiomas: a 320 px o espanhol mostrava 3 de 5.

A causa imediata era `CategoryBarChart` não passar `interval` ao `<XAxis>`, herdando o `preserveEnd` do
recharts, que descarta em silêncio o tick que calcula como sobreposto.

### O que o `/review` mudou

O revisor concluiu que eram duas causas somadas, não uma, e mexeu em três pontos:

1. `interval={0}` no `<XAxis>`, para o eixo nunca mais esconder rótulo sem avisar.
2. Os quatro rótulos de faixa viraram notação numérica, iguais nos três idiomas: `0-7d`, `8-30d`,
   `31-90d`, `+90d`. O maior caiu de 9 para 6 caracteres. Só `never` continua palavra.
3. A descrição do gráfico passou a abrir com a unidade, já que o eixo ficou mudo sobre ela.

Ele argumentou que `interval={0}` sozinho trocaria "rótulo que some" por "rótulo sobreposto", e **não
mediu essa variante isolada**. Eu também não: medi o resultado das três mudanças juntas, que é o que vai
para produção. A hipótese dele sobre a variante continua sem medição, e registro isso porque ela sustenta
a decisão de encurtar a copy.

### O que a segunda passada mediu

Instrumento igual ao da primeira:
`document.querySelectorAll('.recharts-xAxis .recharts-cartesian-axis-tick-value')`, mais geometria de cada
tick para detectar sobreposição (folga negativa entre vizinhos) e corte (tick fora da caixa do SVG).

Home do admin, cinco categorias:

| largura | idioma | rótulos | folga mínima | sobreposição | corte |
|---|---|---|---|---|---|
| 375 px | pt-br | 5 de 5 | 14,8 px | nenhuma | nenhum |
| 375 px | en | 5 de 5 | 14,8 px | nenhuma | nenhum |
| 375 px | es | 5 de 5 | 14,8 px | nenhuma | nenhum |
| 320 px | pt-br | 5 de 5 | 3,8 px | nenhuma | nenhum |
| 320 px | en | 5 de 5 | 3,8 px | nenhuma | nenhum |
| 320 px | es | 5 de 5 | 3,8 px | nenhuma | nenhum |

Os rótulos lidos foram `["0-7d", "8-30d", "31-90d", "+90d", "Nunca"]` em pt-br e es, e
`["0-7d", "8-30d", "31-90d", "+90d", "Never"]` em inglês. Cinco barras desenhadas em todos os casos.

A 375 px a folga mínima passou de 7 px, que era a margem do pt-br na primeira passada, para 14,8 px. A
320 px sobram 3,8 px entre "8-30d" e "31-90d", que é pouco mas positivo, e a leitura na tela continua
limpa: conferi o print de 320 px em inglês e os cinco rótulos aparecem inteiros e separados.

Como as quatro faixas de intervalo passaram a ser a mesma string nos três idiomas, a folga também ficou
igual nos três. A única diferença sobrou na última coluna, onde "Never" é mais estreito que "Nunca" e
sobra 21,1 px em vez de 19,6 px a 375 px.

## Os 11 itens de "Verificar no `/test`"

| # | item | veredito | o que medi, e com quê |
|---|---|---|---|
| 1 | Degradação por índice ausente, ponta a ponta | ✅ confirmado na parte observável | Com a rota respondendo 503 `SUMMARY_INDEX_MISSING`, a home ficou de pé: "Olá", "Usuários 13", "Administradores 1", "Usuários comuns 12", o título "Atividade" e a descrição da seção continuaram na tela. No lugar dos números apareceu "O resumo está indisponível no momento. Tente de novo em instantes." A falha do Firestore real continua 🔒 |
| 2 | Cinco rótulos do eixo X em 375 px | ✅ **confirmado na segunda passada** | Era o ❌ da primeira. Cinco de cinco nos três idiomas, a 375 px e a 320 px. Tabela de medições acima |
| 3 | Cinco barras distinguíveis em claro e escuro | ✅ confirmado, e remedido | Os cinco `fill` computados são distintos em cada tema, e os tokens trocam mesmo: `--chart-1` vale `lab(36.9 35.1 -85.7)` (azul) no escuro e `lab(57.1 64.3 89.9)` (laranja avermelhado) no claro. Remedi depois da troca de rótulos e os cinco valores do tema claro voltaram idênticos, então a mudança de copy não mexeu em cor. No escuro, a 320 px, as cinco barras saíram azul, verde, laranja, roxo e vermelho |
| 4 | Os `hint` com 7, 30 e 15 vindos do servidor | ✅ confirmado | Com a rota respondendo de verdade: "Acessaram nos últimos 7 dias. O registro tem precisão de 15 minutos." e "Sem acesso há mais de 30 dias. Não inclui quem nunca acessou." Nenhum `{days}`, `{minutes}` ou `{count}` na tela, reconferido nos três idiomas depois da mudança de copy |
| 5 | Home comum sem regressão | ✅ confirmado, e remedido | Ver "A home comum" abaixo |
| 6 | Impersonação | ✅ confirmado | Admin personificando um comum, ao abrir `/pt-br/admin`, termina em `/pt-br`, sem a seção de atividade e sem nenhum rótulo de faixa no documento. Voltando ao painel de administração, o bloco reaparece com os números atuais da API, e não com os que estavam na tela antes |
| 7 | Custo da agregação | 🔒 não verificável | O emulador não reporta leitura faturada, e não há projeto real disponível. O que dá para afirmar: a resposta HTTP não carrega documento algum, só contagens e limiares, e `userActivitySummaryRepository.test.ts` prova que o repositório monta 5 contagens sem ler documento |
| 8 | Os três idiomas na tela | ✅ confirmado, e remedido | Reli a copy renderizada nos três locales depois da mudança. As quatro faixas de intervalo agora são a mesma string nos três, por serem notação numérica, e quem carrega a unidade é a descrição: "Dias desde o último acesso", "Days since the last sign-in", "Días desde el último acceso". Nenhum placeholder cru sobrou |
| 9 | `/users/activity-summary` resolve para a rota estática | ✅ confirmado | `GET` autenticado como admin devolveu `{"data":{"active":...}}` com HTTP 200, e não um 404 de usuário inexistente |
| 10 | O aviso de perfis sem registro | ✅ confirmado nos dois sentidos | Com `never` igual a 2: "2 perfis ainda não têm registro de acesso. O registro de cada pessoa começa no próximo acesso dela." Depois de carimbar o último perfil sem registro, `never` foi a 0 e o parágrafo saiu do documento, com a faixa "Nunca" ainda rotulada no eixo e a barra valendo 0 |
| 11 | O guard na cadeia real | ✅ confirmado | Contra a API rodando: admin 200, usuário comum 403 `ADMIN_FORBIDDEN`, sem token 401 `AUTH_INVALID_TOKEN`, token inválido 401, `POST` na mesma URL 405 |

## A home comum

`CategoryBarChart` é compartilhado, e o `interval={0}` entrou nele, então a home comum também mudou de
comportamento sem que o código dela fosse tocado. Medi nas duas larguras e nos três idiomas:

| largura | idioma | rótulos | folga mínima | corte |
|---|---|---|---|---|
| 375 px | pt-br | 3 de 3 | 32,7 px | nenhum |
| 320 px | pt-br | 3 de 3 | 14,3 px | nenhum |
| 320 px | en | 3 de 3 | 6,7 px | nenhum |
| 320 px | es | 3 de 3 | 14,3 px | nenhum |

O pior caso é "Collaborator" em inglês a 320 px, e mesmo ele sobra 6,7 px do vizinho. Os cartões continuam
com "Entidades 4" e "Ativas 3", e o gráfico com Franquia 2, Cliente 1 e Colaborador 1. Nenhuma regressão.

Isso é medição, não a aritmética que o `/review` usou para prever o mesmo resultado.

## Lacunas de teste do `review.md`

| lacuna | veredito |
|---|---|
| Sem teste do prefetch RSC em `(pages)/page.tsx` | **Fechada.** Criei `apps/app/__tests__/adminHomePrefetch.test.tsx`, 8 casos, 65 ms, sem processo externo |
| Sem teste provando que `recharts` ficou fora do chunk inicial | **Continua aberta, e fora do alcance desta etapa também.** Medir isso pede análise de build, não execução. O que acrescentei por observação é que o esqueleto de fallback aparece antes do gráfico na tela, o que confirma o carregamento diferido em runtime mas não o conteúdo do chunk |
| `activitySummary()` roda contra um Firestore falso | **Segue fechada como decisão.** Rodei a rota contra o emulador durante o e2e e ela respondeu o agregado correto para 13 perfis distribuídos nas cinco faixas, o que exercita a consulta real. Continua sem provar índice, porque o emulador serve a consulta com ou sem ele |

Nenhuma lacuna nova nas duas passadas.

## Testes criados

`apps/app/__tests__/adminHomePrefetch.test.tsx`, 8 casos, faixa barata (mock de `getServerApiClient` e
`isImpersonating`, sem processo externo):

- as duas chaves entram no cache desidratado, e são as mesmas que o hook lê;
- cada agregado é pedido uma vez só;
- o cliente é criado no contexto `admin`;
- o payload de atividade chega intacto ao cache;
- personificando, a API não é chamada e o cache sai vazio, então nenhum agregado vaza para a visão do
  sujeito personificado;
- sem sessão, a página renderiza em vez de estourar;
- com um dos agregados falhando, a página ainda renderiza e o outro sobrevive no cache.

O último caso é o que sustenta em teste a parte server-side da degradação: `prefetchQuery` engole a falha e
deixa o cliente refazer a busca.

O `/review` acrescentou `chartAxisLabels.test.ts` e um caso em `userRecencyChart.test.tsx`. Os dois passam,
e os dois cobrem o que dá para cobrir sem layout: comprimento de rótulo e a prop chegando ao `<XAxis>`.
Nenhum deles pega o defeito original, porque a decisão do recharts depende de medição real e o jsdom não
tem layout. Quem pega é a passada visual, e por isso ela não é substituível por teste aqui.

### Decisões de custo, por módulo tocado

| módulo | decisão |
|---|---|
| `apps/api/app/(routes)/users/activity-summary/route.ts` | Nenhum teste novo. `usersActivitySummaryRoute.test.ts` já cobre 200, 403, 401 e 503, e confirmei os quatro contra a cadeia real por curl |
| `apps/api/(shared)/lib/activity-windows.ts` | Nenhum teste novo. `activityWindows.test.ts` já sonda as bordas das quatro faixas |
| `apps/api/(shared)/repositories/user.repository.ts` | Nenhum teste novo. `userActivitySummaryRepository.test.ts` cobre as cinco contagens e o clamp de `never` |
| `apps/app/.../UserActivitySection.tsx` | Nenhum teste novo. `userActivitySection.test.tsx` cobre carregamento, valores, `hint` interpolado, erro traduzido e os dois lados do aviso |
| `apps/app/.../UserRecencyChart.tsx` | Nenhum teste meu. O `/review` cobriu o `interval` |
| `packages/design-system/.../category-bar-chart.tsx` | Nenhum teste novo meu. O comportamento que importa é de layout e está medido no browser |
| `apps/app/.../(pages)/page.tsx` | **Teste criado**, como acima. Era a única lacuna fechável barato |

Nenhum teste da faixa cara foi criado nas duas passadas. Nada aqui tem a infra como objeto: a única coisa
que exigiria emulador é o comportamento do índice, e o emulador não o reproduz.

## Ambiente do e2e

As sete portas do fluxo estavam **livres** antes de cada passada, então subi tudo e derrubei tudo nas duas.

| o que | como |
|---|---|
| emuladores Auth (9099) e Firestore (8080), com UI em 4001 | `pnpm emulators`, projeto `demo-next-boilerplate` |
| API | `pnpm --filter api dev` na 3002 |
| app | `pnpm --filter app dev` na 3000 |

Nada foi reutilizado do usuário.

O `pnpm emulators` reclamou de versão de Java na primeira tentativa. O `openjdk@21` já estava instalado
pelo Homebrew, mas é keg-only, então o `java` do `PATH` respondia 17.0.13. Exportar
`JAVA_HOME=/opt/homebrew/opt/openjdk@21` e pôr o `bin` na frente do `PATH` resolveu, e os emuladores
subiram em 5 segundos. É a armadilha que o `docs/SETUP.md` descreve, e ela continua acontecendo.

**Portas devolvidas nas duas passadas.** Matei cada processo por PID, sem `pkill`, e conferi as dez portas
envolvidas (3000, 3001, 3002, 3003, 9099, 8080, 4001, 4400, 4500, 9150) uma a uma: todas vazias ao fim. O
`firestore-debug.log` que o emulador gera na raiz foi apagado; ele é ignorado pelo git de qualquer forma.

### Como simulei a degradação

O stub de rede no browser não bastava: `page.tsx` faz prefetch no servidor, e o dado chegava hidratado no
HTML antes de qualquer request do cliente. Pus um proxy HTTP temporário entre o app e a API, respondendo
503 `SUMMARY_INDEX_MISSING` só em `/users/activity-summary` e repassando o resto, e reiniciei o app
apontando para ele. Assim os dois caminhos falharam, que é o que aconteceria com o índice ausente de
verdade.

Na primeira tentativa o proxy também respondia 503 ao preflight `OPTIONS`, e o browser bloqueava a
requisição inteira. O resultado era a tela mostrando "Um erro inesperado aconteceu" em vez da copy de
`SUMMARY_INDEX_MISSING`, porque o axios recebia erro de rede, sem resposta para ler o `error.code`. Era
defeito do meu harness, não do produto. Corrigido o preflight, a copy certa apareceu nos três idiomas.
Registro isso porque um relatório apressado teria reportado um ❌ falso aqui.

O proxy e o script de fixture foram apagados. O working tree não tem harness meu.

## Dados de QA criados

Todos no emulador, que morre com o processo. **Nada foi criado em projeto Firebase real**, e não há conta
para limpar depois.

- As três contas do `pnpm seed` (`admin@example.com`, `user@example.com`, `user2@example.com`). As
  credenciais do seed estão documentadas no `docs/SETUP.md`, e não se repetem aqui.
- Dez perfis `qa-admin-analytics-<slug>@example.com`, com `lastAccessAt` retroativo, para produzir as cinco
  faixas não vazias. Distribuição obtida: 2 em "0-7d", 3 em "8-30d", 2 em "31-90d", 4 em "+90d" e 2 em
  "nunca", sobre 13 perfis.

Nenhuma senha, token ou chave aparece neste arquivo.

## Evidências

Os prints ficaram em `test/e2e/`, mas o `.gitignore` descarta essa pasta, então o que vale como prova é o
texto acima. Cada afirmação traz o valor medido, o rótulo exato ou o status HTTP.

Arquivos da primeira passada: `01-admin-home-ptbr-light-desktop.png`, `02-chart-dark-desktop-ptbr.png`,
`03-chart-light-desktop-ptbr.png`, `04-chart-mobile375-light-ptbr.png`,
`05-chart-mobile375-light-en-MISSING-LABEL.png`, `06-chart-mobile375-light-es.png`,
`07-degraded-index-missing-ptbr.png`, `08-common-home-no-regression-ptbr.png`,
`09-never-zero-notice-absent-ptbr.png`, `10-impersonation-admin-blocked.png`,
`11-chart-mobile375-dark-ptbr.png`, `12-en-375-missing-8to30d-label.png`.

Da segunda: `r2-01-chart-320-en.png` (o pior caso de largura, com os cinco rótulos inteiros),
`r2-02-chart-375-ptbr-light.png`, `r2-03-common-home-320-en.png`.

Uma armadilha de captura, para quem repetir: `screenshot --full` colapsa o `ResponsiveContainer` do
recharts e sai com a área do gráfico vazia, com eixo e grade mas sem barra nenhuma. O DOM tem os cinco
retângulos com altura correta no mesmo instante. Captura de viewport sai certa. Quase virou um ❌ falso.

## Pendências de infra

Uma, já registrada e inalterada: o índice composto de `user` por `deletedAt` mais `lastAccessAt` precisa ser
publicado à mão, conforme a §1.7 do `docs/PRE-PRODUCTION.md`. Enquanto não existir, a rota responde 503 e o
bloco de atividade mostra a mensagem traduzida, comportamento que verifiquei na primeira passada.

## Observação adjacente, fora do escopo

Em `/en/admin` e `/es/admin` o conteúdo sai no idioma da URL, mas o atributo `lang` do `<html>` fica com o
locale da navegação anterior. A origem é `apps/app/app/layout.tsx:67`, que este diff não toca, então é
dívida anterior à feature. Vale uma tarefa própria: leitor de tela e mecanismo de busca leem o `lang`, não
a URL.

## Cross-check

| eixo | estado |
|---|---|
| `apps/app` comum contra admin | verificados os dois, nas duas passadas |
| comum, admin, admin personificando, não autenticado | verificados os quatro |
| pt-br, en, es | verificados os três, com dado, no estado degradado e depois da mudança de copy |
| claro e escuro | verificados os dois |
| desktop (1440 px) e mobile (375 px) | verificados os dois, mais 320 px nas duas homes |
| `apps/web` | fora de escopo; o diff não a toca |
| `subscription` contra `simple` | fora de escopo; a home do admin não depende do modo de produto |
