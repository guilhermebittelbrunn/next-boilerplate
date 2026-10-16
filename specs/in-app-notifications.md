---
id: in-app-notifications
title: Central de notificações no app
status: proposed
value: médio
effort: M
audience: produto
area: [apps/api, apps/app, packages/sdk, packages/design-system, packages/internationalization]
mode: ambos
depends_on: []
contends_on: [packages/sdk/src/client/index.ts, apps/api/(shared)/lib/account-export.ts, apps/api/(shared)/lib/account-erasure.ts, apps/api/app/(routes)/webhooks/payments/route.ts, firestore.indexes.json]
feature: -
updated: 2026-10-16
---

# Central de notificações no app

> **Reabertura.** A tabela "Lacunas avaliadas e não especificadas" do [`BACKLOG.md`](BACKLOG.md) tinha
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

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md), adendo de
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
