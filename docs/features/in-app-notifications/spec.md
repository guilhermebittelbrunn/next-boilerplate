---
id: in-app-notifications
title: Central de notificações no app
status: done
value: médio
effort: M
audience: produto
area: [apps/api, apps/app, packages/sdk, packages/design-system, packages/internationalization]
mode: ambos
depends_on: []
contends_on: [packages/sdk/src/client/index.ts, apps/api/(shared)/lib/account-export.ts, apps/api/(shared)/lib/account-erasure.ts, apps/api/app/(routes)/webhooks/payments/route.ts, firestore.indexes.json]
feature: in-app-notifications
updated: 2026-10-20
---

# Central de notificações no app

> **Reabertura.** A tabela "Lacunas avaliadas e não especificadas" do [`BACKLOG.md`](../../../specs/BACKLOG.md) tinha
> "Notificações in-app + preferências", 3/10, com o motivo "Esforço G à mão; a referência terceiriza num serviço
> pago." O que mudou: (1) a prevalência remedida em 2026-10-16 é **4 de 10**; (2) só o next-forge terceiriza num
> serviço pago, e o Makerkit entrega com tabela própria, sem tempo real por padrão, num modo que a doc dele chama
> de sem custo; (3) este corte tira as preferências e o tempo real, que eram o que fazia o esforço ser G; (4) o core
> ganhou, depois daquela avaliação, eventos que o usuário hoje só descobre se abrir a aba certa, como a assinatura
> com pagamento pendente (PR #25). Em 2026-10-16 o usuário decidiu que o core terá o recurso, com este corte (D6).

## Problema

Quando algo muda na conta sem a pessoa estar olhando, o produto não tem onde contar. A assinatura entra em
pagamento pendente e o aviso só aparece dentro da aba de cobrança. Cada fork que precisar avisar algo ao usuário
("seu relatório ficou pronto", "alguém comentou") vai montar o próprio sino, e o erro mais provável é gravar o
texto já traduzido no idioma de quem disparou, ou deixar a leitura sem dono no servidor.

O core não precisa de muitos avisos próprios. Precisa do lugar onde avisos aparecem, com posse, idioma e retenção
resolvidos uma vez.

## O que já existe no repo

- Nenhuma notificação: grep por `notification`, `announcement` e `BellIcon` em `apps/` e `packages/` só acha o
  `useAlert` (toast) e um ícone decorativo no `playground`.
- `apps/app/shared/components/ui/Navbar.tsx:15-24` — a barra do painel tem idioma, tema e menu do perfil; é onde o
  sino entraria.
- `apps/api/(shared)/repositories/base.repository.ts:27`, `:94` — a paginação por cursor da PR #17 serve a uma
  listagem por dono.
- `apps/api/(shared)/repositories/payment-event.repository.ts:13-18`, `:43` — o padrão de `expiresAt` para TTL
  nativo do Firestore, já usado em `paymentEvent`.
- `apps/api/(shared)/lib/account-export.ts:133-136` e `account-erasure.ts:17-24` — a exportação e o expurgo do
  titular listam cada coleção com dado pessoal. As PRs #38 e #39 mostraram que toda spec que grava dado pessoal
  novo passa por esses dois arquivos.
- `apps/api/app/(routes)/webhooks/payments/route.ts:194-232` — o webhook já reconcilia a mudança de status da
  assinatura; é o primeiro produtor natural.
- `packages/email/templates/welcome.tsx:50` e o texto `welcome` do dicionário de e-mail — boas-vindas escritas e sem
  chamador (achado aberto).
- `firestore.rules:32-34` — o cliente não lê o Firestore direto, então tempo real por `onSnapshot` exigiria abrir
  regra de leitura. O corte lê pela API.
- `apps/api/(shared)/lib/impersonation-read-only.ts:19-31` — sob impersonação, a API recusa escrita; "marcar como
  lida" herda essa regra.
- **Lacuna:** não há coleção, rota, ação do SDK nem componente de notificação.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](../../../specs/research/saas-starter-feature-benchmark.md), adendo de
  2026-10-16, seção "Notificações in-app (remedição)".
- Prevalência: **4 de 10** (next-forge com Knock; Makerkit com tabela própria, ligado por padrão; Supastarter
  segundo a página inicial; Saas UI pelo router de notificações da API). Continua minoria, e o `value` reflete isso.
- O Makerkit é a referência do corte: sino com contador, lista em popover, três níveis (info, aviso, erro),
  notificação guardada até ser lida ou expirar, tempo real desligado por padrão.
- Fontes: <https://makerkit.dev/docs/next-supabase-turbo/notifications/notifications-configuration> ·
  <https://makerkit.dev/docs/next-supabase-turbo/notifications> · <https://www.next-forge.com/docs/packages/notifications> ·
  <https://www.saas-js.com/docs/starter-kits/nextjs> (lidas em 2026-10-16).

## Proposta — corte de MVP

- [ ] O usuário do painel comum vê um sino na barra com o número de não lidas, atualizado ao navegar e em
      intervalo curto.
- [ ] O sino abre a lista das notificações, mais recentes primeiro, paginada, com marcar uma ou todas como lidas e
      estado vazio. Uma notificação pode levar à tela relacionada.
- [ ] A notificação guarda um tipo e parâmetros, não texto pronto. O texto sai do dicionário no idioma de quem lê,
      como os `apiErrors`.
- [ ] O servidor tem um ponto único para emitir notificação, só para o dono, e dois produtores do core usam esse
      ponto: as boas-vindas na criação da conta, que funcionam em qualquer fork, e a mudança de status da
      assinatura (pagamento pendente, cancelada, reativada), em modo assinatura.
- [ ] As notificações entram na exportação de dados do titular, saem no expurgo da conta e expiram sozinhas depois
      de um prazo.
- [ ] Sob impersonação, o admin vê o sino do usuário e não consegue marcar nada como lido.

### Fora do corte

- **Tempo real**: exige regra de leitura no cliente ou uma conexão aberta; o intervalo curto resolve o MVP.
- **Preferências por tipo e canal, e-mail e push**: era o que fazia a lacuna antiga ser G.
- **Aviso do admin para todos os usuários** (broadcast) e notificações para o painel admin.
- **Agrupamento e resumo diário.**

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Recurso novo de notificações: listar, contar não lidas, marcar como lida. |
| `apps/api` | Coleção nova por dono, rotas com `requireCommonPanelApi`, o ponto único de emissão e os dois produtores. |
| `apps/app` | Sino na `Navbar`, lista e estado vazio. |
| `apps/web` | N/A. |
| `packages/*` | `design-system`: reaproveita `Popover`, `Badge` e `Empty`, sem componente novo se der. i18n: textos de cada tipo nos três idiomas. |
| Infra/env | Índice composto novo (dono + data) a publicar, e a política de TTL do Firestore como passo do fork. Nenhuma variável. |

## Riscos e trade-offs

- **Custo de leitura.** O contador consultado em intervalo é uma leitura por usuário ativo a cada ciclo. O `/analyze`
  precisa escolher um intervalo e uma forma de contar que não multiplique a cota do Firestore.
- **Sino vazio.** Num fork sem Stripe, só as boas-vindas aparecem até o fork criar os próprios produtores. A spec
  entrega a infraestrutura, e a documentação precisa mostrar como acrescentar um tipo.
- **Dado pessoal novo.** Cada notificação é dado do titular; esquecer a exportação ou o expurgo é o defeito que as
  PRs #38 e #39 quase repetiram.
- **Mais um índice sem publicação.** O backlog já tem seis índices declarados e não publicados (pendências 1 a 4).
- Sem serviço pago e sem variável obrigatória.

## Sinais de pronto

- Uma conta nova, no emulador, abre o painel e vê uma notificação de boas-vindas não lida, no idioma escolhido.
- Marcar como lida zera o contador, e o estado persiste depois de recarregar.
- Um evento de assinatura simulado que muda o status para pagamento pendente cria a notificação do dono, e só dele.
- A exportação de dados traz as notificações; a exclusão da conta as apaga.
- Sob impersonação, "marcar como lida" é recusado.

## Decisões

- **D6, 2026-10-16:** o core terá central de notificações, com este corte: sem tempo real, sem preferências e com
  dois produtores. Sem ela, cada fork que precisar resolve posse, idioma e retenção sozinho. A spec segue `proposed`
  porque a triagem a deixou para depois do lote das três aprovadas, e não por dúvida sobre o recurso.

## Perguntas em aberto

- Por quanto tempo uma notificação fica guardada? — **recomendação:** 90 dias, por TTL, como o `paymentEvent` faz
  com 30.

## Estado da entrega

Entregue pela PR #52, mergeada em `main` em 2026-10-20 às 12:23 UTC (`3a118c6`), a partir da branch
`feat/in-app-notifications`. A execução de merge do CI (`gh run 39421836824`, SHA `3a118c6`) terminou em `success`
nos quatro jobs: `changes`, `verify` (4 min 22 s), `coverage` e `e2e` (3 min 19 s). O `/test` da feature fechou com
17 ✅, 0 ❌ e 3 🔒: o evento real da Stripe, o índice composto ausente num projeto real e a TTL apagando o documento
vencido. Os três exigem infraestrutura real. A spec entrou no ciclo ainda `proposed`, por instrução direta do
usuário naquela rodada (a D6 já tinha decidido o recurso), sem passar por `approved`. Arquivada pelo `/spec --sync`
de 2026-10-20, que releu cada item do corte no código de `3a118c6`.

| item do corte | situação | evidência |
|---------------|----------|-----------|
| 1. Sino na barra do painel comum com o número de não lidas, atualizado ao navegar e em intervalo curto | **implementado** | o layout comum passa o sino à `Navbar` (`(common)/layout.tsx:62`, `Navbar.tsx:11`, `:26`); badge com teto `99+` em `NotificationsBell.tsx:17-20`, `:50-57`; contagem a cada 120 s só com a aba visível, ao voltar à aba e na troca de rota quando o número tem mais de 30 s (`useUnreadNotificationsCount.ts:10`, `:26-48`; `apps/app/shared/lib/pagination.ts:16`); a API conta até 100 (`notification.repository.ts:58`, `unread-count/route.ts:6-22`) |
| 2. O sino abre a lista, mais recentes primeiro, paginada, com marcar uma ou todas como lidas, estado vazio e link para a tela relacionada | **implementado** | `NotificationsList.tsx:80-90` (vazio), `:115-119` ("carregar mais"), `:134-140` (marcar todas); `NotificationItem.tsx:94-98` (link), `:120-121` (marcar uma); rotas `notifications/route.ts:8-43` (cursor, 10 por página), `[id]/read/route.ts:16-34`, `read-all/route.ts:6-22`; quatro ações no SDK (`packages/sdk/src/actions/notification/action.ts:18-59`, barril em `packages/sdk/src/client/index.ts:39`) |
| 3. A notificação guarda tipo e parâmetros; o texto sai do dicionário no idioma de quem lê | **implementado** | contrato em `packages/sdk/src/types/notification/notification.ts:1-21`, `:26-37`; a app monta título e corpo em `apps/app/shared/lib/notifications.ts:47-57`, a partir de `translations/apps/app/shared/notifications.ts` nos três idiomas; tipo desconhecido cai no texto genérico, medido pelo `/test` com o item `legacyTypeRemoved` do seed |
| 4. Ponto único de emissão no servidor, só para o dono, com dois produtores: boas-vindas na criação da conta e mudança de status da assinatura | **implementado, com deriva de letra** | `apps/api/(shared)/lib/notifications.ts:20-36` (`emitNotification`) e `:39-51` (a versão silenciosa); id determinístico por `dedupeKey` em `notification.repository.ts:101-114`; boas-vindas em `user-merge.ts:91-96`; assinatura em `webhooks/payments/route.ts:106-119`, com a tabela de transições em `subscription-notifications.ts:42-69` |
| 5. As notificações entram na exportação do titular, saem no expurgo e expiram sozinhas depois de um prazo | **implementado; a expiração depende de passo manual** | exportação em `account-export.ts:146-149`, `:172-175`; passo `notifications` do expurgo em `account-erasure.ts:24`, `:108`, `:129-131`; `expiresAt` de 90 dias em `notifications.ts:8`, `:30-32`. Quem apaga o documento vencido é a política de TTL do Firestore, que o fork liga (`docs/PRE-PRODUCTION.md` §1.9, `:251`) |
| 6. Sob impersonação, o admin vê o sino do usuário e não marca nada como lido | **implementado** | o guard recusa todo método fora de `GET`, `HEAD` e `OPTIONS` (`common-panel.ts:65-71`, `impersonation-read-only.ts:19-31`); a tela desabilita os botões (`NotificationsList.tsx:106`, `:134`, `:143`). O `/test` mediu `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY` nas duas rotas de escrita, com a contagem do dono intacta |

**Deriva, com a leitura de cada uma:**

- **Dois índices compostos, não um.** A spec previa um índice (dono + data). A contagem de não lidas e o "marcar
  todas" filtram por dono e `readAt`, e isso pediu o segundo (`firestore.indexes.json:62-77`). A spec estava
  imprecisa.
- **As boas-vindas vão só para perfil comum.** O admin criado pela mesma rotina não recebe aviso
  (`user-merge.ts:90`), porque o sino só existe no painel comum. A spec não tratava o caso.
- **Contagem com teto de 100 e intervalo de 120 s.** A spec deixava para o `/analyze` o intervalo e a forma de
  contar, e o plano escolheu os dois para limitar as leituras do Firestore.
- **Além do plano:** `[id]/read` responde 404 para id inválido, porque um `%2F` chega ao handler; e `LogScope` ganhou
  `notifications` em `packages/shared`, fora da área declarada.
- **`contends_on` previu cinco arquivos e a entrega tocou os cinco**, mais cerca de 55 fora da lista: `user-merge.ts`,
  a `Navbar`, o layout comum, a folha de `apiErrors`, o seed do emulador, `packages/shared` e seis documentos.

**Além do corte:** o seed do emulador cria notificações para as contas de exemplo; o `docs/FORKING.md` ganhou a
seção "Avisar o usuário: um tipo de notificação novo", que responde ao risco "a documentação precisa mostrar como
acrescentar um tipo"; ROPA, subprocessadores, backup e `PAYMENTS.md` passaram a citar a coleção; e a suíte de rules
contra o emulador passou de 161 para 177 casos, cobrindo a recusa de acesso direto a `notification`.

**Pergunta em aberto respondida:** a retenção ficou em 90 dias, pela recomendação.

**Ficou para o backlog** (achados em `specs/BACKLOG.md`): o id com `%2F` que derruba `entities/[id]` e `users/[id]`
com 500, a lista que herda 60 s de `staleTime`, o `markRead` que pode encontrar o documento apagado, dois eventos
concorrentes da Stripe que geram dois avisos, o popover encostado na borda a 375 px, o badge `99+` que cobre o ícone,
o badge que conserva o último número depois de uma falha e o link do `analyze/plan.md` para esta spec, que morreu
com o arquivamento.
