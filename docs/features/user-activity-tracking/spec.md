---
id: user-activity-tracking
title: Último acesso do usuário
status: done
value: médio
effort: M
audience: produto
area: [packages/sdk, apps/api, apps/app, packages/internationalization]
mode: ambos
depends_on: [session-refresh]
contends_on: [packages/sdk/src/types/user/user.ts, apps/api/(shared)/repositories/user.repository.ts, "apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/(home)/UsersListClient.tsx"]
feature: user-activity-tracking
updated: 2026-09-19
---

> **Entregue na PR #21**, mergeada em `main` em 2026-09-19T16:53:15Z (merge commit `e656331`), CI
> `success` nesse SHA. Cinco dos seis itens do corte foram confirmados no código na auditoria de
> 2026-09-19; o sexto está parcial e o motivo está em [Estado da entrega](#estado-da-entrega).

# Último acesso do usuário

## Problema

Quem opera um fork não consegue responder a pergunta mais básica sobre a própria base: quem ainda está
usando isto. A listagem de usuários do admin mostra foto, nome, e-mail, tipo e status — tudo que descreve
a conta, nada que descreva o uso.

Sem esse dado, decidir quem contatar, quem já abandonou o produto e se a base cresce ou só acumula cadastro
morto é palpite. E qualquer métrica de atividade construída depois (KPI de ativos, de inativos, gráfico de
acesso) fica sem chão, porque não existe o instante que ela agregaria.

## O que já existe no repo

Esta seção mudou o desenho da spec, então merece ser lida antes do corte.

- **Parte do dado já atravessa a rede hoje.** `packages/sdk/src/types/user/user.ts:56-60` declara
  `UserWithAuthDTO.metadata` com `creationTime`, **`lastSignInTime`** e **`lastRefreshTime`**, preenchidos a
  partir do Firebase Auth em `apps/api/(shared)/mappers/user.mapper.ts:13-17`. O merge acontece em
  `apps/api/(shared)/repositories/user.repository.ts:33-44`, que é o que alimenta `GET /users`. Ou seja: a
  listagem do admin **já recebe dois instantes de autenticação** e não renderiza nenhum dos dois.
- `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/(home)/UsersListClient.tsx:33-106`
  — a tabela declara **6 colunas** (foto `:35`, nome `:52`, e-mail `:59`, tipo `:63`, status `:68`, ações
  `:94`). Nenhuma delas é de acesso.
- **O que aqueles dois campos medem não é o que a pergunta quer.** Eles pertencem ao Firebase Auth e
  registram eventos de autenticação e de token, não uso do produto. Com o cookie de sessão de 5 dias
  (`packages/auth/session.ts:24`), alguém que usa o produto todo dia sem reautenticar mantém um
  `lastSignInTime` velho. Qual dos dois chega mais perto de "uso" é decisão do `/analyze`, e depende do
  comportamento do SDK cliente — não presumi.
- `packages/sdk/src/types/user/user.ts:12-22` — o `UserDTO`, que é o perfil no Firestore, tem `createdAt`,
  `updatedAt` e `deletedAt`, e **nenhum campo de acesso**.
- `apps/api/(shared)/mappers/user.mapper.ts:30-47` — `serializeFirestoreValue` já normaliza `Timestamp` para
  ISO recursivamente, inclusive dentro de objeto e de array. Um campo de instante novo não precisa de
  tratamento próprio.
- **Curiosidade que evita um mal-entendido:** `apps/api/__tests__/userProfileSerialization.test.ts:48-53` já
  usa `audit: { lastSeenAt }` — mas como **fixture inventada** para testar o serializador genérico. O nome
  existe no repositório sem que o campo exista. `grep` por `lastSeen|lastAccess|lastLogin` em
  `packages/sdk/src` e `apps/api` devolve **só essas duas linhas de teste** (medido em 2026-09-17).
- `apps/api/(shared)/repositories/base.repository.ts:122-124` — `countQuery` agrega com `query.count().get()`
  em vez de ler documento. É o helper de que uma métrica de atividade vai precisar depois.
- **Lacuna:** não há campo no perfil que registre uso do produto, e a listagem não mostra nem o que já
  recebe.

## Evidência de mercado

- Nota: [`research/compliance-trust-baseline.md`](../../../specs/research/compliance-trust-baseline.md) (coletada em
  2026-08-21, dentro da validade) para a parte de dado pessoal e retenção.

**O benchmark não sustenta esta spec.** Em
[`research/saas-starter-feature-benchmark.md`](../../../specs/research/saas-starter-feature-benchmark.md) não existe linha
para "último acesso" nem para rastreio de atividade de usuário. A linha mais próxima é "Admin/super-admin
(listar, banir)", com **4 em 10** e valor classificado como operacional — que é o painel onde a coluna
entraria, não a coluna em si. Não medi prevalência de coluna de último acesso entre os starters, e não vou
apresentar um número que não levantei.

O que sustenta a spec é interno: é o menor dado que destrava as métricas de atividade pedidas em
[`admin-analytics-dashboard`](../admin-analytics-dashboard/spec.md), e metade dele (a coluna) custa renderizar
informação que a API já entrega. O `value: médio` reflete isso — o valor está quase todo a jusante.

**O que a nota de conformidade obriga a escrever**, porque é o item que ela própria classifica como o mais
mal citado:

- Um carimbo de data e hora **sem IP** não é "registro de acesso" no sentido do **Marco Civil, art. 5º,
  VIII**, que define o termo como data e hora de uso **a partir de um determinado endereço IP**. Portanto o
  prazo de 6 meses do **art. 15** não se aplica a este campo, e citá-lo aqui seria a generalização falsa que
  a nota alerta contra.
- O que se aplica é o regime finalístico: a **LGPD não fixa prazo** (arts. 15, 16 e 6º, III; a ANPD confirma
  no FAQ, item 5.5), e o **Decreto 8.771/2016, art. 13, § 2º** manda reter a menor quantidade possível de
  dados pessoais, eliminando-os tão logo atingida a finalidade.

## Proposta — corte de MVP

- [x] A listagem de usuários do admin ganha uma **coluna de último acesso**, com data e hora formatadas por
      idioma e um estado explícito para quem nunca acessou (não um campo em branco nem um zero).
- [x] O perfil do usuário passa a guardar um instante de último acesso, carimbado **pelo servidor** no
      caminho de sessão, e exposto no contrato do SDK.
- [x] **A gravação é limitada por janela.** No máximo uma escrita por usuário a cada N minutos; dentro da
      janela a escrita é **descartada**, não enfileirada. O valor de N fica num único lugar e aparece na
      documentação, porque ele define a precisão de tudo que for derivado do campo.
- [~] O campo entra no que a conta do titular exporta e no que a exclusão de conta apaga, junto do resto do
      perfil — a costura com [`data-rights-lgpd`](../data-rights-lgpd/spec.md) é declarada, não deixada implícita.
- [x] A finalidade e a retenção do campo ficam escritas em `docs/PRE-PRODUCTION.md`, junto das outras
      decisões de dado pessoal que um fork herda.
- [x] Texto da coluna e do estado vazio no dictionary nos 3 idiomas.

### Fora do corte

- **Histórico de acessos.** O campo é um instante que se sobrescreve, não uma série. Guardar histórico é
  outra ordem de grandeza de custo e de exposição, e é o que a nota de conformidade manda evitar sem
  finalidade declarada.
- IP, user-agent, dispositivo e geolocalização. Acrescentar IP mudaria a natureza jurídica do dado, e essa
  é uma decisão que precisa de justificativa própria.
- Presença em tempo real (quem está online agora), que exige outro mecanismo inteiro.
- Backfill retroativo para bases que já têm dado: quem nunca acessou depois da entrega aparece como "nunca
  acessou", e está correto.
- Os KPIs e o gráfico construídos sobre o campo — são de
  [`admin-analytics-dashboard`](../admin-analytics-dashboard/spec.md).

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Campo novo no `UserDTO`, opcional, para não quebrar quem já consome o tipo. |
| `apps/api` | Escrita limitada por janela no repositório de usuário; o mapper já serializa instante sem mudança. |
| `apps/app` | Coluna nova na listagem do admin. Nenhuma tela nova. |
| `apps/web` | N/A. |
| `packages/*` | `auth`: o gancho de carimbo fica no caminho de sessão que `session-refresh` **já criou** — spec entregue, em [`docs/features/session-refresh/spec.md`](../session-refresh/spec.md). i18n nos 3 idiomas. |
| Infra/env | Nenhuma variável nova e nenhum serviço externo. Sem índice novo **neste** corte: a coluna não ordena no servidor. |

## Riscos e trade-offs

- **Custo de escrita, que é a armadilha desta spec.** Carimbar a cada requisição significa **uma escrita no
  Firestore por requisição** — a mesma família de armadilha que [`dashboard-home`](../dashboard-home/spec.md) teve
  de evitar do lado da contagem, e que naquele caso foi resolvida com agregação
  (`base.repository.ts:122-124`). Aqui não existe agregação que salve: a mitigação é a janela, e ela precisa
  estar no corte, não numa otimização futura. O custo residual, mesmo com a janela, é uma escrita por
  usuário ativo por janela.
- **É dado pessoal, e o carimbo é rastreamento.** Não é um efeito colateral técnico: é uma decisão de passar
  a observar o comportamento do titular. Por isso a finalidade e a retenção estão no corte. Um fork que
  herde o campo sem a declaração fica em posição pior do que sem o campo.
- **A precisão é a da janela, e isso contamina o que vem depois.** Com janela de 15 minutos, "último acesso"
  pode estar 15 minutos desatualizado, e um KPI de "ativos na última hora" herda essa folga. Quem ler o
  número precisa saber disso.
- ✅ **A dependência de ordem foi satisfeita em 2026-09-17, e o argumento dela se inverteu.** Esta spec
  dizia que sem `session-refresh` não existia batimento periódico onde carimbar, porque "o único caminho que
  grava o cookie é o login". Os dois fatos mudaram: `mintSessionCookie` (`packages/auth/session.ts:147`)
  agora tem **dois** chamadores — `sessionPOST:73` e `sessionRefreshPOST:117` —, e o segundo é exatamente o
  batimento periódico que faltava, já com throttle próprio (`shouldRefreshSession`, `session.ts:137-140`,
  metade da vida do cookie).
  **O que isso muda para o `/analyze`:** a janela de gravação que esta spec exige no corte **já tem um
  candidato natural**, e ele não é um número novo a escolher — é o limiar que a renovação usa. Carimbar
  dentro do ramo `{ refreshed: true }` produz no máximo uma escrita por usuário a cada meia vida de cookie,
  sem inventar mecanismo. Cuidado a registrar: o ramo `{ refreshed: false }` é o caminho quente e **não**
  deve carimbar, ou a garantia de custo desaparece.
- **Contenção conhecida:** `packages/sdk/src/types/user/user.ts` é disputado com
  [`billing-subscription`](../../../specs/billing-subscription.md) e [`onboarding-flow`](../../../specs/onboarding-flow.md), que também
  acrescentam campo ao `UserDTO`.

## Sinais de pronto

- O admin abre a listagem e vê, por usuário, quando foi o último acesso.
- Quem nunca acessou aparece com um rótulo que diz isso, e não com um campo vazio.
- Navegar pelo produto durante vários minutos não produz mais de uma escrita de perfil por janela.
- Excluir a conta remove o carimbo junto do resto do perfil.
- A coluna aparece nos 3 idiomas, com data e hora no formato de cada um.

## Perguntas em aberto

- **Qual é a fonte da verdade da coluna: um campo próprio ou o `metadata.lastRefreshTime` que o Firebase
  Auth já entrega?** — **recomendação:** campo próprio como fonte, porque ele mede uso do produto e
  sobrevive a uma troca de provedor de autenticação; o campo do Auth serve de valor de exibição para os
  perfis ainda não carimbados, evitando uma coluna inteira vazia no dia da entrega. Vale conferir no
  `/analyze` o que de fato move `lastRefreshTime` neste desenho de sessão, em vez de presumir.
- **Qual o tamanho da janela de gravação?** — **recomendação:** 15 minutos. Existe precedente no
  repositório: a trilha de auditoria registra impersonação por janela de 15 minutos com id determinístico
  (registrado na spec arquivada de `audit-log`). Precedente interno não é evidência de mercado, e não estou
  apresentando como tal.
- **Por quanto tempo reter o carimbo?** — **recomendação:** enquanto a conta existir, porque ele é estado
  atual e não histórico, e some com a exclusão da conta. Se alguém quiser expurgo antes disso, aí é
  histórico disfarçado e cai em "fora do corte".
- **A coluna deve ser ordenável pelo servidor?** — **recomendação:** não no primeiro corte. Ordenar por esse
  campo no servidor pede índice composto, e a fila de índices versionados e não publicados já tem **cinco
  entradas** (`docs/PRE-PRODUCTION.md` §1.1, §1.2 e §1.5), recontadas em 2026-09-17 depois da PR #19.
  Acrescentar um sexto por uma ordenação é caro no momento errado.
  → **Respondida na entrega: não ordena no servidor.** A fila de índices continua em **seis** entradas
  (`firestore.indexes.json`, recontado em 2026-09-19); a PR #21 não acrescentou nenhum.

## Estado da entrega

Conferido item a item contra o código em 2026-09-19, com o `HEAD` em `e656331`.

| item | veredito | evidência |
|------|----------|-----------|
| 1. Coluna de último acesso, formatada por idioma, com estado para quem nunca acessou | **implementado** | A tabela passou de 6 para **7 colunas**: o objeto da coluna começa em `UsersListClient.tsx:125`, com `dataIndex: "lastAccessAt"` em `:127`. Formatação por `Intl.DateTimeFormat` em `shared/lib/formatDisplayDateTime.ts:24`, mapa pt-BR/en/es em `:6-14`. O rótulo de "nunca acessou" sai em `UsersListClient.tsx:58-62` |
| 2. Instante no perfil, carimbado pelo servidor, exposto no SDK | **implementado** | Campo `lastAccessAt` em `packages/sdk/src/types/user/user.ts:27`, opcional. Escrita em `apps/api/(shared)/repositories/user.repository.ts:37-42`, deliberadamente fora de `BaseRepository.update` para não mexer no `updatedAt`. Instante do servidor em `apps/api/(shared)/lib/activity-recorder.ts:89` |
| 3. Janela de gravação, valor único, documentado | **implementado** | `ACTIVITY_WINDOW_MINUTES = 15` em `apps/api/(shared)/lib/activity-windows.ts:8`, definição única confirmada por `grep`. Dentro da janela a escrita é descartada em dois pontos — cache de processo (`activity-recorder.ts:71-73`) e instante já gravado no documento (`:78-81`) —, sem fila e sem retry. O número está em `docs/PRE-PRODUCTION.md:536-539` |
| 4. O campo entra no export e na exclusão de conta | **parcial** | A **declaração** da costura foi entregue (`docs/PRE-PRODUCTION.md:497-504`), inclusive dizendo o que ainda não é verdade. O **comportamento** não existe, e não podia existir: não há rota de export no repo, `apps/api/app/(routes)/account/route.ts` não tem `DELETE` (só `GET:97` e `PUT:107`), e o `delete()` herdado é soft delete (`base.repository.ts:205-207`). As duas superfícies pertencem a [`data-rights-lgpd`](../data-rights-lgpd/spec.md) |
| 5. Finalidade e retenção em `docs/PRE-PRODUCTION.md` | **implementado** | Seção em `docs/PRE-PRODUCTION.md:481`. Finalidade em `:485-486`, retenção em `:494-495`, e o argumento de por que o prazo do Marco Civil não se aplica em `:488-492` |
| 6. Texto da coluna e do estado vazio nos 3 idiomas | **implementado** | `packages/internationalization/translations/apps/app/pages/admin/users.ts` — pt-br `:13,17,18-19`, en `:63,67,68-69`, es `:113,117,118`. Paridade completa nas três chaves |

Cobertura: 25 casos em `apps/api/__tests__/activityRecorder.test.ts`, 14 em `apps/api/__tests__/guardsStampActivity.test.ts`, 9 em `apps/app/__tests__/usersListLastAccess.test.tsx`, mais 3 em `apps/api/__tests__/baseRepository.test.ts:806`.

**Por que a spec fecha com o item 4 parcial.** A metade construível do item — declarar a costura por escrito — foi
entregue, e com mais honestidade do que a spec pedia: o documento enumera o que ainda **não** é verdade. A outra
metade depende de duas superfícies que não existem no repositório. Manter a spec aberta por ela criaria um estado
absorvente: o item só poderia fechar quando `data-rights-lgpd` entregasse, e enquanto isso
`admin-analytics-dashboard` continuaria se declarando bloqueada por algo que já está em `main`. Existe precedente
no repositório — `ci-pipeline` foi arquivada com um item do corte em aberto. O que a auditoria fez em troca foi
transferir a obrigação: `data-rights-lgpd` passou a listar `lastAccessAt` entre os campos que o export e a
exclusão precisam cobrir.

## Deriva de implementação

A spec recomendava um caminho e a entrega escolheu outro. Não é erro de execução — é uma troca com ganho e
custo, e os dois estão medidos.

| especificado | implementado | leitura |
|--------------|--------------|---------|
| Carimbar dentro do ramo `{ refreshed: true }` de `sessionRefreshPOST`, reusando `shouldRefreshSession` como janela — "sem inventar mecanismo" | `packages/auth/session-routes.ts` **não foi tocado**. O gancho ficou nos guards da API: `apps/api/app/(guards)/admin.ts:73` e `apps/api/app/(guards)/common-panel.ts:87` | **A implementação desviou, e o desvio mede a coisa certa.** O gatilho passou a ser toda requisição autenticada à API, não a renovação do cookie — que é o que a pergunta "quem ainda usa isto" de fato pede. Cobre também o painel comum, não só o admin |
| A janela "não é um número novo a escolher — é o limiar que a renovação usa" | Janela própria de **15 minutos**, independente do throttle da sessão (`activity-windows.ts:8`), com bucket determinístico em `activity-recorder.ts:25-27` | **A spec errou a previsão de custo.** Com o gancho nos guards, o throttle da sessão não serve de janela: ele governa a renovação do cookie, não a requisição. O 15 veio do precedente interno de `audit-log`, que é precedente e não evidência de mercado |
| Garantia de "no máximo uma escrita por usuário por janela" | Não há transação. Requisições concorrentes do mesmo usuário na virada da janela podem gravar mais de uma vez | **A garantia é mais fraca do que a spec prometia, e o desvio está assumido no código** (`packages/sdk/src/types/user/user.ts:24-25`) e medido em `docs/PRE-PRODUCTION.md:511-515`: 110 requisições produziram 3 escritas, duas delas de um par concorrente |

Fora do corte, a entrega acrescentou um **fallback de exibição**: perfis ainda não carimbados mostram
`metadata.lastRefreshTime` em itálico esmaecido, rotulado como aproximado (`UsersListClient.tsx:46-56`). É
exatamente a recomendação da pergunta em aberto sobre a fonte da verdade, e evita uma coluna inteira vazia no
dia da entrega.
