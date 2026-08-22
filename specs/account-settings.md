---
id: account-settings
title: Área de conta e preferências do usuário
status: proposed
value: alto
effort: M
audience: produto
area: [apps/app, apps/api, packages/sdk, packages/design-system, packages/internationalization]
mode: ambos
depends_on: [auth-recovery-verification, file-upload-storage]
feature: -
updated: 2026-08-21
---

# Área de conta e preferências do usuário

## Problema

O usuário autenticado **não tem onde mexer na própria conta**. Não há página de conta, perfil ou configurações em nenhum lugar da `apps/app`: não dá para corrigir o nome, trocar a foto, mudar a senha ou escolher um idioma que persista. O menu do avatar oferece uma única ação — sair.

Pior que faltar: o produto **promete e não entrega**. A sidebar exibe um menu "Configurações" com quatro itens (General, Team, Billing, Limits) e todos apontam para `#`. O usuário clica e nada acontece. Para um core de MVPs, isso significa que todo fork ou apaga o menu ou implementa a área do zero — e é a primeira tela que qualquer usuário procura depois de entrar.

## O que já existe no repo

- `apps/app/shared/components/ui/ProfileDropdown.tsx` — o menu do avatar mostra nome e e-mail (`:42-45`) e tem **uma** ação: sair (`:49-52`, com a string "Sair" literal no JSX, `:51`). Nenhum link para conta.
- `apps/app/app/[locale]/(authenticated)/(common)/routes.tsx:64-81` — o grupo "Configurações" declara `General`, `Team`, `Billing` e `Limits`, **todos com `url: "#"`** e título literal em inglês. O grupo `Documentation` (`:41-58`) tem outros 4 placeholders iguais.
- `apps/app/app/[locale]/(authenticated)/(common)/paths.ts:10-35` — o mapa real de rotas da área comum tem só `root`, `playground` e `entities`. Confirma que os itens acima não existem como página.
- `packages/sdk/src/types/user/user.ts:30-52` — `UserWithAuthDTO` já carrega `displayName:34`, `photoURL:35`, `phoneNumber:36` e `emailVerified:33`. O contrato existe; é **somente leitura** hoje.
- `packages/design-system/components/form/hookform/index.ts:2-8` — 7 campos RHF prontos (input, senha, data, radio, select, switch, textarea), que cobrem quase todo o formulário desta spec.
- `packages/auth/server.ts:212` — `revokeUserSessions` já existe e já é usado no logout global (`packages/auth/session-routes.ts:79`); falta só ser oferecido como ação do usuário.
- `packages/design-system/components/ui/mode-toggle.tsx:25` e `apps/app/shared/components/ui/LanguageSwitcher.tsx:37` — tema e idioma **já são trocáveis**, mas via `next-themes` e cookie de navegador: mudar de máquina perde a escolha.
- **Lacuna:** todas as rotas de usuário da API são de administrador — `users/route.ts:21,34` e `users/[id]/route.ts:15,33,75` estão sob `requireAdminApi`. **Não existe nenhum caminho pelo qual o usuário edite a si mesmo.** Não há campo de preferência no `UserDTO` (`:7-14`), não há wrapper RHF de checkbox nem de upload no design system, e `firebase.json:1-6` configura só Firestore — não há bucket de arquivo.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md)
- Prevalência: **perfil + avatar/upload em 6/10 dos starters**, com valor "alto" e esforço "P" — bom retorno. A nota alerta que o avatar "traz consigo storage de arquivo (validar MIME e tamanho **no servidor**, bucket não público)".
- **Dark mode: 9/10**, commodity. Aqui existe, mas por navegador; persistir por usuário é o delta real.
- **Exclusão de conta: 4/10** (confiança/legal), com a armadilha registrada: "deletar o usuário e deixar órfãos (assinatura Stripe ativa, arquivos no bucket, membros de organização). O correto é anonimizar + cancelar + limpar" — motivo pelo qual fica fora deste corte.
- **Sessões/dispositivos gerenciáveis: 1/10** — nicho; entra aqui só na forma mínima ("sair de todos os dispositivos"), porque a peça de servidor já está pronta e custa quase nada.
- Fontes: <https://clerk.com/docs/components/user/user-profile> · <https://makerkit.dev/docs/next-supabase-turbo/installation/functional-walkthrough>

## Proposta — corte de MVP

- [ ] Existe uma área de conta acessível pelo menu do avatar e pela sidebar, e os itens de "Configurações" deixam de apontar para `#`.
- [ ] O usuário edita os próprios dados de perfil (nome de exibição, telefone) e vê o resultado no cabeçalho sem recarregar.
- [ ] O usuário troca a própria senha informando a senha atual, e a troca encerra as demais sessões.
- [ ] O usuário escolhe tema e idioma, e a escolha **acompanha a conta** — outro navegador, mesma preferência.
- [ ] O usuário envia uma foto de perfil, validada em tipo e tamanho **no servidor**.
- [ ] A API garante que cada um só altera a si mesmo: o guard é de painel comum, não de administrador.

### Fora do corte

- **Exclusão/anonimização de conta e exportação de dados** — 4/10 e 0/10 na nota, e a armadilha dos registros órfãos torna isso dependente de `billing-subscription` e `file-upload-storage`. Vira `data-rights-lgpd`.
- **Troca de e-mail** (exige verificar o endereço novo) — iteração de `auth-recovery-verification`.
- **Item "Team"** — depende de `teams-organizations`. **Item "Billing"** — é `billing-subscription`; aqui só reservamos o lugar. **Item "Limits"** — depende de metering (2/10 na nota); sugere-se **remover** o placeholder em vez de deixá-lo morto.
- **Lista de sessões/dispositivos ativos** (1/10) — só a ação global "sair de todos" entra.
- **Preferências de notificação por canal** — dependem de uma spec de notificações.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | ações de "meu perfil" (ler/atualizar, trocar senha, encerrar sessões) + campo de preferências no DTO |
| `apps/api` | rotas de auto-serviço sob `requireCommonPanelApi` (`apps/api/app/(guards)/common-panel.ts:28`), com ownership no servidor; recepção e validação do avatar |
| `apps/app` | página de conta com abas (perfil, segurança, preferências); menu do avatar ganha entrada; `routes.tsx` deixa de ter `url: "#"` |
| `apps/web` | N/A |
| `packages/*` | `design-system` pode precisar do campo de upload que hoje não existe; i18n para toda a copy (incluindo a string "Sair" hoje literal) |
| Infra/env | bucket de arquivo (ausente em `firebase.json`) com regras próprias; nenhuma variável nova se o avatar for adiado |

## Riscos e trade-offs

- **Custo herdado por todo fork:** o avatar arrasta armazenamento de arquivo — bucket novo, regras novas e **custo por GB/egress** que o repo hoje não tem. Todo fork herda isso, inclusive quem nunca vai mostrar foto. Daí a dependência de `file-upload-storage`: se aquela spec não vier antes, o avatar sai deste corte e o resto continua de pé sem env nova.
- **Escrita de usuário sem ser admin é novidade no repo.** Toda rota de `users` hoje é `requireAdminApi`; abrir auto-serviço exige ownership espelhado no servidor — UI escondendo botão não protege nada. É o tipo de erro que só aparece em pentest.
- **Preferência persistida × primeira pintura.** Tema e idioma vindos do perfil chegam depois do primeiro render: resolvidos no cliente, dão mismatch de hidratação e "pisca" na tela — a mesma armadilha que a área autenticada já documenta para estado de UI.
- **Upload é vetor de abuso:** validar tipo e tamanho só no cliente é o erro clássico que a nota cita nominalmente.
- **Placeholder morto é dívida ativa.** Manter "Limits" e "Documentation" apontando para `#` depois desta entrega preserva exatamente o problema que ela existe para resolver.

## Sinais de pronto

- Um usuário muda o nome e o vê no cabeçalho e no menu do avatar imediatamente.
- Um usuário troca a senha e a sessão aberta em outro navegador para de valer.
- Um usuário escolhe espanhol, entra de outro dispositivo e o app abre em espanhol.
- Nenhum item de menu da área comum aponta para `#`.
- Tentar alterar o perfil de outra pessoa é recusado pela API, não só escondido na UI; e arquivo grande ou de tipo inválido é recusado pelo servidor com erro traduzido.

## Perguntas em aberto

- Preferência de tema/idioma no documento do usuário ou em coleção separada? — **recomendação:** no próprio documento; são poucos campos e evita uma leitura extra por render.
- Trocar a senha exige a senha atual? — **recomendação:** sim; sem isso, uma sessão roubada assume a conta em um clique.
- Manter "Documentation" e "Limits" na sidebar? — **recomendação:** remover os dois placeholders agora e reintroduzir quando houver destino real.
- Se `file-upload-storage` não vier antes, entregamos a área sem avatar? — **recomendação:** sim; o restante do corte entrega valor observável sozinho.
