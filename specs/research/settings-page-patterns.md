---
topic: settings-page-patterns
question: Como SaaS e starters de Next.js organizam a página de configurações da conta e o cabeçalho das telas internas, e o que disso vale como padrão para o core de MVPs?
lens: produto
panel: [shadcn-ui, next-forge, makerkit, supastarter, shipfast, vercel, github, linear, stripe-dashboard, open-saas, saas-ui]
collected: 2026-11-10
revalidate_after: 2027-05-10
confidence: média
---

# Layout de configurações e cabeçalho de página em SaaS e starters

## Resposta curta

Nenhuma das 10 referências com fonte primária usa abas horizontais para separar as seções das configurações.
Quando há várias seções, o arranjo mais comum é uma navegação lateral, com uma página ou rota por seção (4 de 10).
Isolar a exclusão de conta ou de projeto no fim da página aparece em 5 de 10. Cabeçalho de página com título
e descrição aparece em 4 de 10. O sinal favorece uma navegação lateral para a conta e um cabeçalho de página
padrão, mas a amostra é pequena e vários critérios não puderam ser confirmados. A confiança fica em média.

## Prevalência

Painel de 11 referências; 10 com fonte primária lida, 1 não verificada (Supastarter: páginas de docs com 404
ou sem descrição do layout, e o código é privado). Os critérios:

- **(a)** navegação entre seções;
- **(b)** cada seção com título e descrição;
- **(c)** exclusão isolada (zona de perigo);
- **(d)** salvar por seção;
- **(e)** cabeçalho de página com título, descrição ou ação.

| Referência | (a) | (b) | (c) | (d) | (e) |
|------------|-----|-----|-----|-----|-----|
| shadcn/ui, exemplo "forms" e blocos | nav lateral com sub-rotas (Profile, Account, Appearance, Notifications, Display) | título `h3` + descrição + `Separator`, sem card | não | um botão por página ("Update profile") | `h2` "Settings" + descrição; blocos com `<header>` e breadcrumb |
| next-forge | não tem página de configurações; o item "Settings" aponta para `#` | n/a | n/a | n/a | só breadcrumb e slot |
| Makerkit | kit lite: página única com cards; kit Drizzle: layout comum com nav lateral | card com `CardTitle` + `CardDescription` | sim, card com borda destrutiva e confirmação digitando `DELETE` | um por card | `PageHeader` com título, descrição e ações |
| Supastarter | não verificado | não verificado | não verificado | não verificado | não verificado |
| ShipFast | os docs não mostram página de configurações | n/a | n/a | n/a | n/a |
| Vercel | nav lateral dentro de Settings | seções nomeadas na página | sim, "Delete Project" no fim da página General, confirmando com o nome | não verificado | não verificado |
| GitHub | nav lateral com grupos | não verificado | sim, seção "Danger Zone", confirmação em três passos com o nome do repositório | não verificado | não verificado |
| Linear | configurações agrupadas em Account, Features, Administration e times; nav lateral não confirmada | não verificado | exclusão em Settings > Workspace, com código por e-mail; sem rótulo de zona de perigo | não verificado | não verificado |
| Stripe Dashboard | hub agrupado (Business, Personal) | não verificado | sim, "Close account" no fim de Account details | não verificado | não verificado |
| Open SaaS / Saas-UI | Open SaaS: um card só; Saas-UI: cards por assunto | Saas-UI: cards por seção, descrição não confirmada | nenhum dos dois | não verificado | Saas-UI: `PageHeader` com `title`, `description`, `actions` e variante `settings` |

Totais sobre as 10 com fonte primária:

- **(a)** nav lateral ou sub-rotas: 4 de 10 (shadcn, Makerkit Drizzle, Vercel, GitHub). Abas horizontais
  entre seções: 0 de 10. Página única: 2 de 10. Hub agrupado: 2 de 10. Sem página de configurações: 2 de 10
  (next-forge, ShipFast).
- **(b)** card com título e descrição confirmado: 1 de 10 (Makerkit); parcial em 2 (shadcn sem card, Saas-UI
  sem descrição confirmada).
- **(c)** exclusão isolada: 5 de 10; com o rótulo "Danger Zone": 2 (GitHub, Makerkit); confirmação digitando
  nome ou palavra: 3 (GitHub, Vercel, Makerkit).
- **(d)** salvar por seção: 2 de 10 (shadcn, Makerkit); salvar global: 0 de 10; o resto não foi verificado.
- **(e)** cabeçalho de página consistente: 4 de 10; com título, descrição e ação: 2 (Makerkit, Saas-UI).

O next-forge, de quem este repositório é fork, não tem página de configurações nem cabeçalho com título: o
`Header` dele é só breadcrumb e slot, o mesmo formato do `apps/app/shared/components/ui/Header.tsx` daqui.

## O que o mercado trata como o mínimo

- Seções de configuração separadas por navegação que não seja uma faixa horizontal de abas, quando há mais de
  três ou quatro seções.
- Cada seção com um título que descreve o assunto e, nos starters que mostram o código, uma descrição curta.
- Exclusão de conta ou de recurso no fim da página, separada das ações comuns, com confirmação explícita.

## O que é opcional / avançado

- Confirmação digitando o nome do recurso ou uma palavra (3 de 10). Para a conta deste repositório, a senha
  atual já cumpre o papel de "ação não padrão" que a NN/g pede para operações perigosas.
- Configurações num diálogo em vez de página (bloco `sidebar-13` do shadcn).
- Hub de configurações em grade de cartões (Stripe, Linear), que só compensa com dezenas de seções.

## Obrigações e requisitos externos

Nenhuma obrigação legal sobre layout. As referências de acessibilidade que tocam o tema:

- **WCAG 2.2, SC 2.5.8 (AA):** alvo de ponteiro com pelo menos 24 × 24 px CSS, com exceções para
  espaçamento, alvo equivalente, texto corrido, controle do navegador e casos essenciais. Os gatilhos de aba
  atuais (cerca de 30 px de altura) e os botões `sm` (32 px) passam.
- **WCAG 2.2, SC 2.4.11 (AA):** o componente que recebe foco do teclado não pode ficar totalmente escondido
  por conteúdo do autor; a página de "Understanding" cita rodapés e cabeçalhos fixos como causa típica. Vale
  para a barra fixa de salvar.
- **WCAG 2.2, SC 2.4.6 (AA):** títulos e rótulos descrevem o assunto ou a finalidade.
- **NN/g, abas:** abas servem para conteúdo com agrupamento claro, "the fewer tabs, the better", e quando
  estouram a faixa vira carrossel; rótulos de uma ou duas palavras. O artigo não discute nav lateral como
  alternativa.
- **NN/g, confirmação:** confirmar antes de ação com consequência séria, dizer a consequência, rotular os
  botões com a ação ("Delete file") e, em operação muito perigosa, exigir uma ação não padrão.
- **NN/g, proximidade:** não pôr ação de consequência alta logo ao lado de opção benigna.
- **Material Design 3, abas:** não verificado direto (a página só renderiza com JavaScript). O trecho que
  aparece na busca diz para evitar mais de quatro abas e usar abas roláveis quando não cabem.

## Armadilhas conhecidas

- O exemplo "forms" do shadcn, a referência mais próxima da stack deste repositório, foi tirado do site
  (`ui.shadcn.com/examples/forms` devolve 404). O código foi lido no commit `84bd724` do repositório
  `shadcn-ui/ui`, anterior à remoção. Quem copiar o padrão não tem mais a página viva para consultar.
- Mudar o formato da URL das seções quebra links gravados fora do app (retorno de checkout, CTA de landing).
  Neste repositório, os dois existem.

## Custo herdado por todo fork

Zero em serviço, variável de ambiente e dependência. As peças necessárias (`Tabs` com orientação vertical,
`Card`, `Separator`, `Sidebar`) já estão no design system.

## Fontes

Acessadas em 2026-11-10.

- https://github.com/shadcn-ui/ui/tree/84bd724/apps/www/app/(app)/examples/forms — layout de configurações
  com nav lateral, título e descrição por seção, um botão por página.
- https://ui.shadcn.com/blocks/sidebar — blocos com cabeçalho e breadcrumb; `sidebar-13` como diálogo de
  configurações.
- https://github.com/haydenbleasel/next-forge — `apps/app/app/(authenticated)`: sem página de configurações;
  `Header` só com breadcrumb.
- https://github.com/makerkit/nextjs-saas-starter-kit-lite — cards por seção, zona de perigo com borda
  destrutiva, `PageHeader`.
- https://makerkit.dev/courses/nextjs-drizzle/settings-and-profile — layout comum com nav lateral.
- https://makerkit.dev/docs/nextjs-drizzle/organizations/settings — ações irreversíveis separadas.
- https://shipfa.st/docs — sem página de configurações documentada.
- https://vercel.com/docs/project-configuration/project-settings — Settings com menu lateral.
- https://vercel.com/docs/projects/managing-projects — "Delete Project" no fim da página General.
- https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository — "Danger
  Zone".
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule
  — grupos na barra lateral de Settings.
- https://linear.app/changelog/2024-12-18-personalized-sidebar — grupos de configurações.
- https://linear.app/docs/workspaces — exclusão do workspace.
- https://support.stripe.com/questions/close-a-stripe-account — "Close account" no fim de Account details.
- https://github.com/wasp-lang/open-saas — `template/app/src/user/AccountPage.tsx`, um card só.
- https://saas-ui.dev/docs/components/page — `PageHeader` com título, descrição e ações.
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html — SC 2.5.8.
- https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html — SC 2.4.11.
- https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html — SC 2.4.6.
- https://www.nngroup.com/articles/tabs-used-right/ — quando usar abas.
- https://www.nngroup.com/articles/confirmation-dialog/ — diálogos de confirmação.
- https://www.nngroup.com/articles/proximity-consequential-options/ — ação perigosa longe da benigna.
- https://m3.material.io/components/tabs/guidelines — não lida direto; citada pelo trecho da busca.
