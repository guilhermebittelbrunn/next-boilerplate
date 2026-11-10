---
id: app-internal-ux-polish
title: Conta como página de configurações e padrão único de página nas telas internas
status: in-progress
value: alto
effort: M
audience: produto
area: [apps/app, packages/design-system, packages/internationalization]
mode: ambos
depends_on: []
contends_on: [apps/app/shared/components/ui/Header.tsx, apps/app/shared/components/ui/Container.tsx, "apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountTabs.tsx", "apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm.tsx"]
feature: app-internal-ux-polish
updated: 2026-11-10
---

# Conta como página de configurações e padrão único de página nas telas internas

## Problema

Quem abre a área logada de um fork encontra telas montadas cada uma de um jeito. A conta é o caso mais
visível: cinco abas horizontais coladas, que a 375 px rolam de lado sem indicar que rolam e que em inglês já
se sobrepuseram a 1280 px. Dentro das abas, os blocos são caixas feitas à mão, com título em `span`, em `h3`
ou sem título. Cinco formulários usam um botão de salvar preso a uma barra fixa no rodapé, dois deles dentro
de diálogos. "Excluir conta" aparece com a mesma
moldura de "Exportar dados". Os links do menu lateral para cada aba não trocam a aba quando a pessoa já está
na conta, e nenhum deles aparece como ativo.

Fora da conta, nenhuma tela além das duas home tem título visível: o nome da página só aparece no breadcrumb,
que no celular perde os níveis anteriores. Espaçamento, superfície (painel cinza, card, nada), largura e
estado de carga mudam de tela para tela. Cada fork herda isso e paga para refazer, ou entrega assim.

## O que já existe no repo

Caminhos encurtados: `account/` é `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/`;
`ui/` é `apps/app/shared/components/ui/`.

**Conta**

- `account/(components)/AccountTabs.tsx:21-27` — cinco abas (perfil, segurança, preferências, cobrança,
  privacidade); cobrança some fora do modo assinatura (`:33-35`).
- `AccountTabs.tsx:51-53` — a aba é lida do `?tab=` uma vez só, no estado inicial; `:61` regrava a URL com
  `history.replaceState` e descarta `?checkout=` e `?plan=`, que `AccountBillingPanel.tsx:242-243` lê.
  É o achado estacionado E9 do backlog.
- `AccountTabs.tsx:70` — a faixa de abas rola de lado num wrapper `overflow-x-auto`; os gatilhos têm
  `whitespace-nowrap` (`packages/design-system/components/ui/tabs.tsx:66`). Sobreposição em en a 1280 px
  medida pelo `/test` da PR #47 (achado 🟢 do backlog).
- `ui/Sidebar.tsx:70-71` — o item ativo compara só o `pathname`; os itens de Configurações apontam para
  `/account?tab=…` (`(common)/paths.ts:46-66`), então nunca ficam ativos nem abrem o grupo.
- `(common)/routes.tsx:54-80` chama o primeiro item de "Geral"; a aba se chama "Perfil".
- A aba Segurança empilha quatro blocos sem hierarquia: métodos de login (`AccountSecurityForm.tsx:76`),
  troca de senha só com um parágrafo de descrição e sem título (`:86`), sessões (`:119`) e "Sair de todos os
  dispositivos" (`:121-164`).
- Ações destrutivas com variante `outline`, ao lado de formulários de edição: desvincular
  (`AccountSignInMethodsPanel.tsx:172`), encerrar sessão (`AccountSessionsPanel.tsx:106`, `:149`), sair de
  todos (`AccountSecurityForm.tsx:134`). As confirmações não usam estilo destrutivo
  (`AccountSecurityForm.tsx:152`).
- `AccountPrivacyPanel.tsx:86` e `:108` — exportar dados e excluir conta usam a mesma caixa
  `rounded-lg border border-border p-4`. Não há zona de perigo.
- Títulos de bloco feitos de três jeitos: `h3` (`AccountSignInMethodsPanel.tsx:113`,
  `AccountPasswordSetForm.tsx:62`, `AccountBillingPanel.tsx:196`), `span` (`AccountSessionsPanel.tsx:117`,
  `AccountSecurityForm.tsx:122`, `AccountPrivacyPanel.tsx:87`, `:111`, `:120`) e nenhum
  (`AccountSecurityForm.tsx:86`). O `Card` do design system só aparece em cobrança
  (`AccountBillingPanel.tsx:127`).
- Perfil e preferências põem cada campo em `md:col-span-2` (`AccountProfileForm.tsx:82-131`,
  `AccountPreferencesForm.tsx:115`, `:122`) dentro de um `Container` sem largura máxima
  (`ui/Container.tsx:141`): inputs da largura da tela inteira num monitor largo.
- Todo `Footer` é uma barra fixa no rodapé (`ui/Footer.tsx:47`), inclusive os de dentro de diálogos
  (`AccountEmailChangeDialog.tsx:134`, `AccountPrivacyPanel.tsx:166`).
- `account/(pages)/(home)/loading.tsx:5-11` desenha cinco barras genéricas, que não lembram a tela.
- Contratos de URL que a conta precisa manter: o retorno da Stripe aponta para `/account?tab=billing`
  (`apps/api/(shared)/lib/billing.ts:44`) e o CTA de preços da landing para
  `/account?tab=billing&plan=…` (`apps/web/shared/lib/pricingCta.ts:30`).

**Demais telas e shell**

- `ui/Header.tsx:24-45` — só breadcrumb, sem slot de título nem de descrição; os níveis anteriores somem
  abaixo de `md` (`:31-33`); padding horizontal dobrado (`:24` e `:25`) desalinha o breadcrumb do conteúdo.
  É usado por 12 telas.
- `ui/Container.tsx:141` — `max-w-full`, sem título nem ações; a carga mostra um spinner que ocupa a altura da
  tela no celular (`:27`).
- Título visível só nas duas home, escrito à mão (`(common)/(pages)/(components)/CommonHomeClient.tsx:171`,
  `(admin)/admin/(pages)/(components)/AdminHomeClient.tsx:67`). Entidades, organização, usuários e auditoria
  têm só o breadcrumb.
- Espaçamento de página diferente por tela: `gap-6` na home, `gap-4` em entidades, `gap-8` em organização
  (`organization/OrganizationClient.tsx:36`).
- A ação primária "Adicionar" é `outline` (`packages/design-system/components/ui/add-button.tsx:21`).
- Os `loading.tsx` usam `pt-6` sem a faixa do cabeçalho, enquanto a tela real tem `pt-0` sob 64 px de
  cabeçalho, e a página pula quando carrega (`(admin)/admin/(pages)/loading.tsx:5`,
  `(common)/(pages)/entities/(pages)/edit/[id]/loading.tsx:8`).
- Nenhum componente de cabeçalho de página, de seção ou de layout de configurações existe hoje (busca por
  `PageHeader|SectionHeader|SettingsLayout|SidebarNav` em `apps/` e `packages/`: 0). `PageBreadcrumb.tsx`
  só é usado no `playground`.
- Peças reaproveitáveis no design system: `Tabs` com orientação vertical e variante `line`
  (`tabs.tsx:10-35`), `Card` com `CardAction`, `Separator`, `Item`, `Field`, `Empty`, `Skeleton`, `Sheet`
  (barril `packages/design-system/components/ui/index.ts`).
- **Lacuna:** um padrão de página (título, descrição, ação primária, largura, espaçamento) e um layout de
  configurações com navegação por seção, blocos com título e descrição e zona de perigo separada.

## Evidência de mercado

- Nota: [`research/settings-page-patterns.md`](research/settings-page-patterns.md) (painel de 11, 10 com
  fonte primária lida, coletada em 2026-11-10).
- **Navegação:** nenhuma das 10 usa abas horizontais entre as seções das configurações. Navegação lateral com
  uma página por seção aparece em 4 de 10 (shadcn/ui, Makerkit, Vercel, GitHub); página única em 2; hub
  agrupado em 2; as outras 2 não têm página de configurações.
- **Zona de perigo:** exclusão isolada no fim da página em 5 de 10; com o rótulo "Danger Zone" em 2 (GitHub,
  Makerkit).
- **Título e descrição por seção:** confirmado em 1 de 10 com card (Makerkit) e em 1 sem card (shadcn/ui).
- **Salvar por seção:** 2 de 10 confirmadas (shadcn/ui, Makerkit), nenhuma com salvar global; nas outras o
  comportamento não foi verificado. É o critério com menos evidência do corte.
- **Cabeçalho de página com título:** 4 de 10; com título, descrição e ação, 2 (Makerkit, Saas-UI). O
  next-forge, de quem este repositório é fork, tem só breadcrumb, igual ao `Header.tsx` daqui.
- **Diretrizes:** a NN/g recomenda poucas abas e diz que a faixa vira carrossel quando estoura, que é o que
  acontece na conta hoje
  ([tabs-used-right](https://www.nngroup.com/articles/tabs-used-right/)); pede para não pôr ação de
  consequência alta ao lado de opção benigna
  ([proximity-consequential-options](https://www.nngroup.com/articles/proximity-consequential-options/)). O
  WCAG 2.2 SC 2.4.11 cita rodapés fixos como causa típica de foco escondido
  ([focus-not-obscured-minimum](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)),
  e o SC 2.4.6 pede títulos que descrevam o assunto
  ([headings-and-labels](https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html)). Os alvos de
  toque atuais (cerca de 30 px nas abas, 32 px nos botões `sm`) já passam no SC 2.5.8, que pede 24 px.
- **Ressalva:** a amostra é pequena e a referência mais próxima da stack, o exemplo "forms" do shadcn/ui, saiu
  do site; foi lido no código de um commit anterior à remoção. O `value` alto vem mais do atrito medido no
  próprio repositório (o E9, as abas sobrepostas, a falta de título) do que da prevalência.

## Proposta — corte de MVP

- [ ] **Conta como página de configurações com navegação por seção.** As seções são as de hoje (perfil,
      segurança, preferências, cobrança no modo assinatura, privacidade). No desktop, a navegação é uma lista
      vertical de abas numa coluna ao lado do conteúdo; no celular, vira um controle que cabe a 375 px sem
      rolagem lateral nem sobreposição, em pt-br, en e es.
- [ ] **A seção ativa vem do `?tab=` da URL a cada navegação, não só na primeira carga.** Clicar num item de Configurações do menu lateral
      troca de seção mesmo com a conta aberta, o item fica marcado como ativo, e os links existentes com
      `?tab=<seção>` (retorno da Stripe, CTA da landing) continuam caindo na seção certa sem perder
      `?checkout=` e `?plan=`. O rótulo do menu e o da seção passam a ser o mesmo. Fecha o E9.
- [ ] **Cada seção é uma pilha de blocos com título, descrição e ação própria.** Um formato só para todos os
      blocos da conta, com título em heading real; quem salva é o bloco, e o botão fica junto do bloco que
      ele salva, não numa barra fixa da página. Diálogos usam o rodapé do próprio diálogo.
- [ ] **Zona de perigo separada.** "Excluir conta" sai da moldura comum e fica num bloco destrutivo no fim
      da seção, visualmente distinto. Ações que encerram acesso (desvincular método, encerrar sessões, sair
      de todos) usam estilo destrutivo no botão de confirmação.
- [ ] **Padrão único de página nas telas internas.** Título visível (`h1`), descrição opcional e ação
      primária no mesmo lugar, largura máxima de leitura para formulários e configurações, e um espaçamento
      vertical só. Aplicado à conta, à home comum, a entidades (lista, criar, editar), à organização e às
      telas do admin (home, usuários, criar/editar usuário, auditoria). Breadcrumb continua, abaixo do título
      ou no cabeçalho, mas deixa de ser o único lugar do nome da página.

### Fora do corte

- **Unificar as confirmações** (o `Popconfirm` do antd em `action-menu.tsx:6`, `:71` e o `AlertDialog` do
  Radix convivem na mesma tela de organização). Mexe no `ActionsMenu` compartilhado e em todas as tabelas;
  merece tarefa própria.
- **Confirmação ao desativar usuário ou entidade pelo `Switch`** (`UsersListClient.tsx:123-132`). É
  decisão de produto por recurso, e o padrão do repo hoje é toggle otimista sem confirmação.
- **Página de detalhe do usuário no admin** (status, último acesso, arquivar e impersonar num lugar só).
  Feature, não polimento.
- **Skeletons que reproduzem cada layout.** Entra só o ajuste para não haver salto com o cabeçalho novo; o
  desenho fiel de cada tela fica para depois.
- **Formulários em duas colunas.** O corte limita a largura; reorganizar campos em grade é escolha por
  recurso.
- **`playground` fora do menu do usuário final.** Já é achado 🟢 do backlog (`(common)/routes.tsx:27-33`),
  resolvido como tarefa direta.
- **Configurações da conta para o admin.** Hoje "Minha conta" leva o admin a `/account`, que o layout comum
  devolve para `/admin` (`ui/ProfileDropdown.tsx:65`, `(common)/layout.tsx:47-52`). É funcionalidade nova,
  com guard e rota, e tem spec própria: [`admin-own-account`](admin-own-account.md).

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Nenhum. |
| `apps/api` | Nenhum. O `?tab=` continua sendo o formato da URL, então o retorno da Stripe (`billing.ts:44`) não muda. |
| `apps/app` | Conta inteira (layout, navegação, blocos, zona de perigo), cabeçalho de página e container compartilhados, as telas internas listadas no corte, os `loading.tsx` dessas rotas, o item ativo do menu lateral. |
| `apps/web` | Nenhum, se `?tab=billing&plan=` seguir válido (`pricingCta.ts:30`). |
| `packages/*` | `design-system`: possível peça nova de cabeçalho de página ou de seção, se o `/analyze` decidir que ela é genérica; variante de destaque do `AddButton`. `internationalization`: título de bloco e descrição que faltam (a seção Perfil não tem descrição hoje, `account.ts:12-18`), nos três idiomas. |
| Infra/env | Nenhuma. |

## Riscos e trade-offs

- **Contratos de URL.** `?tab=billing` está gravado no retorno da Stripe e no CTA da landing, e há testes que
  o fixam (`apps/api/__tests__/paymentsCheckoutRoute.test.ts:327`, `apps/app/__tests__/commonNavRoutes.test.tsx:38-52`,
  `accountTabsOverflow.test.tsx`). Mudar o formato da URL sem compatibilidade quebra o retorno do checkout
  em todo fork com assinatura.
- **Conflito com `account-security-mfa` (fatia 3).** O segundo fator vai entrar como bloco novo na seção
  Segurança, em `AccountSecurityForm.tsx`, arquivo que esta spec reorganiza. Não há dependência de ordem, mas
  as duas não devem rodar em paralelo. Fazer esta antes dá à fatia 3 um formato de bloco pronto.
- **Conflito com `one-time-purchase`** (`deferred`): a cobrança é uma das seções da conta, e
  `AccountBillingPanel.tsx` está no `contends_on` dela. Se as duas voltarem juntas, rodam em série.
- **Raio de impacto largo para uma spec de UI.** Toca 12 telas e os componentes que todas usam. O histórico
  do backlog mostra entregas tocando muito mais arquivos do que o `contends_on` previu; o campo aqui lista
  só os pontos de convergência mais prováveis.
- **Testes de componente que fixam a estrutura atual** (`accountTabsOverflow.test.tsx`, que busca por
  `role="tab"`) vão mudar junto. O E2E não percorre a conta hoje, e a suíte de axe do E2E também não
  (`apps/e2e/tests/a11yDark.spec.ts:35-93`).
- **Custo herdado pelo fork:** zero em serviço, env e dependência. O fork herda um formato de página que pode
  querer trocar; por isso o padrão deve ficar em componentes compartilhados, e não repetido em cada tela.

## Sinais de pronto

- A 375 px, em pt-br, en e es, a navegação da conta cabe na tela sem rolagem lateral nem rótulos sobrepostos;
  a 1280 px também.
- Com a conta aberta, clicar em cada item de Configurações do menu lateral troca de seção e marca o item como
  ativo. Abrir `/<locale>/account?tab=billing&checkout=success` cai na cobrança e mostra o aviso do checkout.
- Cada bloco da conta tem título lido como heading por leitor de tela, uma descrição e, se edita algo, o
  próprio botão de salvar ao lado do conteúdo.
- "Excluir conta" aparece separado, no fim da seção, com aparência destrutiva; a confirmação de desvincular,
  encerrar sessão e sair de todos é destrutiva.
- Conta, home comum, entidades, organização e as telas do admin mostram título visível no mesmo lugar, com a
  mesma largura máxima nas telas de formulário e o mesmo espaçamento vertical; a ação primária tem destaque.
- Nenhuma tela pula de posição quando sai do estado de carga para o conteúdo.
- Nenhum texto novo fora de `@repo/internationalization`; paridade pt-br/en/es verde.
- Percorrido pelo `/test` com `agent-browser` em tema claro e escuro, a 375 px e a 1280 px, nos três
  idiomas, nas telas do corte (regra de ouro 11).
- A suíte de axe do E2E passa a incluir a conta, sem violação nova.

## Decisões

Tomadas por você na triagem de 2026-11-10, quando a spec passou a `approved`.

- **Navegação da conta: `Tabs` vertical do design system, com `?tab=` na URL.** A aba ativa é derivada da URL
  a cada navegação, e não só lida na primeira carga. Ficaram descartadas duas alternativas:
  - uma URL por seção (sub-rotas), porque obrigaria a mexer no retorno da Stripe (`apps/api`), no CTA de
    preços (`apps/web`) e nos testes que fixam `?tab=`, ou a manter um redirecionamento só para isso;
  - página única com âncoras, porque deixa todas as seções carregadas numa página longa e não resolve o
    item ativo do menu lateral.
- **O admin entra no corte só com o padrão de página**: home, usuários, criar e editar usuário, auditoria.
  Nenhuma funcionalidade nova do admin entra.
- **Área de conta para o admin fica fora** e virou a spec [`admin-own-account`](admin-own-account.md),
  `proposed`.
- **Prioridade: #1 do backlog.** Roda antes da fatia 3 de `account-security-mfa` e nunca em paralelo com
  ela, porque as duas alteram a seção Segurança.
- **Salvar por seção fica no corte**, mesmo sendo o critério com menos evidência de mercado (2 de 10
  referências confirmadas). O motivo é o WCAG 2.2 SC 2.4.11, que cita rodapés fixos como causa típica de foco
  escondido.

## Perguntas em aberto

- Nenhuma de produto. Os detalhes de implementação (se o cabeçalho de página vira componente do design
  system ou do `apps/app`, qual controle substitui as abas no celular) são do `/analyze`.
