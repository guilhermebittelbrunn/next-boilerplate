# Revisão: telas de formulário centralizadas e com altura do conteúdo

## Branch

- Atual: `guilhermebittelbrunn/claude-cycle-full-pipeline`. O regex do padrão a reprova
  (`BRANCH INVALIDA`). Ela aponta para o mesmo commit da `main` (`b7f9124`), não tem commit próprio
  (`git log main..HEAD` vazio) e não tem remoto.
- Proposta: `feat/app-form-layout-centered`. Passa no regex (`OK`). Sem prefixo de projeto porque o diff
  cruza `apps/app`, `apps/e2e` e `specs/`, e `e2e` não está na lista de projetos do padrão.
- Não criei nem renomeei a branch: rodada do `/cycle`, que não mexe em branch. Como a atual não tem commit
  nem remoto, quando os commits forem aprovados basta `git branch -m feat/app-form-layout-centered`
  antes do primeiro `git add`.

## Revisão: `apps/app` (layout das telas estreitas), `apps/e2e` (D0), `specs/` (auditoria)

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `users/(pages)/create/loading.tsx`, `users/(pages)/edit/[id]/loading.tsx`,
  `entities/(pages)/create/loading.tsx`: os três são cópia literal de
  `entities/(pages)/edit/[id]/loading.tsx`. O repositório já trata `loading.tsx` como arquivo por rota, e
  extrair um `FormPageSkeleton` seria refatoração fora do corte. Sem ação.
- `apps/app/__tests__/formLoadingSkeletons.test.tsx:36`: `container.children.item(1)` depende de o
  `PageSkeleton` devolver dois irmãos (barra do breadcrumb e corpo). Se essa ordem mudar, o teste falha
  ruidosamente em vez de passar em falso, então serve. Sem ação.
- `specs/BACKLOG.md` lista como tarefa direta nº 1 "consertar o teste E2E de foco". O D0 deste diff é
  essa correção. Fechar o item é do `/spec --sync` depois do merge, não desta revisão.

### ✅ OK

- `apps/app/shared/components/ui/pageLayout.ts:3`: `mx-auto` entra só em `PAGE_NARROW_CLASS`, que o
  `Container` (`Container.tsx:155`) e o `PageSkeleton` (`PageSkeleton.tsx:33`) aplicam apenas com
  `width === "narrow"`. O `grep` por `width="narrow"` devolve as cinco telas de formulário e os cinco
  `loading.tsx`; nenhuma lista nem dashboard usa a prop. O pai é o `SidebarInset`
  (`packages/design-system/components/ui/sidebar.tsx:338`, `flex flex-col`), onde margem automática no
  eixo cruzado centraliza a coluna.
- Quatro `<form>` (`users/create/page.tsx:71`, `users/edit/[id]/page.tsx:96`, `entities/create/page.tsx:70`,
  `EditEntityClient.tsx:114`) perderam `flex-1` e `min-h-[50vh]`. Nenhum outro `<form>` em `apps/app/app`
  carrega essas classes, o que bate com a regra nova do `apps/app/CLAUDE.md`.
- O painel do `Container` aninhado (`Container.tsx:68`) mantém `min-h-[50vh]` no mobile e `md:min-h-min`
  a partir de 768 px. Com o `<form>` sem `flex-1`, no desktop o painel fica com a altura dos campos e o
  `Footer` vem logo abaixo, com `mt-4` (`Footer.tsx:50`).
- Blocos da conta sem `flex-1`: o `Tabs` de `AccountTabs.tsx:90` não cresce no eixo principal, então o
  `flex-1` removido já não tinha efeito vertical. Os `flex-1` que sobraram (`AccountTabs.tsx:129`,
  `AccountBillingPlaceholder.tsx:11`, `BillingPlanCard.tsx:57`) não fazem parte do corte e não esticam
  até o rodapé.
- `Container.tsx`, `PageSkeleton.tsx`, `Footer.tsx` e `FormSkeleton.tsx` não mudaram, como o plano pedia.
- Corte de MVP da spec: os seis itens de código estão no diff. O sétimo (conferir em light, dark e mobile)
  é do `/test`. Organização e Playground ficaram fora, como a spec manda.
- D0 (`apps/e2e/tests/focusNotObscured.spec.ts:192-205`): o `Dropdown` do `ActionsMenu` usa
  `trigger={["click"]}` (`packages/design-system/components/ui/action-menu.tsx:153`), então um segundo
  clique fecha o menu aberto. O laço só clica quando `editItem.isVisible()` é falso. O antd monta o popup
  na primeira abertura e o esconde com `ant-dropdown-hidden` ao fechar, então `isVisible()` falso quer
  dizer menu fechado ou ainda não montado. Um menu que abriu depois do timeout de 2 s é visto como visível
  na volta seguinte e não leva outro clique. É o mesmo padrão de `apps/e2e/support/panelNavigation.ts:22-30`.
  O teste continua navegando pela lista e não afrouxa asserção. O comentário de `:193-194` explica o
  motivo sem citar o fluxo.
- Comentários: nenhum comentário novo no código da app. Nenhuma referência a artefato do fluxo.
- i18n: nenhuma chave nova nem alterada.
- Segredos: `docs/features/app-form-layout-centered/` e o diff de `specs/` não têm senha, token nem
  e-mail real. O único e-mail é `user@example.com` (`analyze/plan.md:235`), do seed do emulador.
- Índice do git vazio (`git diff --cached --stat` sem saída).

### 👁 Verificar no `/test`

1. **D0 depois da correção** (`focusNotObscured.spec.ts:188`). Ninguém rodou a correção: o handoff
   fechou o diagnóstico pelo trace do run 45633106961. Resta um risco que a leitura não elimina: se o
   React reproduzir o clique perdido depois de hidratar, o menu abre entre o `isVisible()` falso e o
   clique seguinte, e esse clique fecha o menu. O `toPass()` volta a clicar na tentativa seguinte, então
   no pior caso o teste demora mais, mas convém medir. Repro: `pnpm e2e -- focusNotObscured --repeat-each=10`
   com `next dev` frio (primeira execução depois de subir) e registrar quantas tentativas do `toPass`
   cada repetição usou.
2. **Caso 1 do mesmo E2E** (`:106-109`, "some field must start under the action bar"). Lendo o código,
   o `min-h-[50vh]` e o `flex-1` do `<form>` só mudavam a altura quando o conteúdo era menor que a janela.
   Se o conteúdo for menor, nenhum campo fica abaixo da barra e a asserção já falhava antes. Então a
   asserção depende de o formulário de criar entidade passar de 812 px a 375 px de largura, e isso a
   mudança não altera. É hipótese até alguém medir. Repro: `pnpm e2e -- focusNotObscured` no projeto
   mobile, e anotar `fieldsStartingUnderActionBar` e a altura do `<form>` em `/pt-br/entities/create`.
3. **Barra fixa em formulário longo.** O `Footer` é `sticky bottom-0` (`Footer.tsx:52`) dentro do
   `<form>` e nenhum ancestral entre os dois tem `overflow`. A leitura indica que ele gruda no rodapé
   enquanto o fim do `<form>` está fora da janela. Repro: editar entidade com descrição de 30 linhas, a
   1280×720 e 390×844; rolar até o meio e conferir que `[data-sticky-action-bar]` tem
   `getBoundingClientRect().bottom` igual a `innerHeight`.
4. **Formulário curto no desktop.** Painel com a altura dos campos e barra 16 px abaixo dele, nas quatro
   telas de criar/editar, a 1920×1080. Medir `panel.bottom` e `bar.top`.
5. **Centralização.** Nas cinco telas a 1920×1080 e 1280×800, margem esquerda e direita da coluna iguais
   (diferença ≤ 1 px) e o `h1` alinhado à borda esquerda da coluna.
6. **Listas e dashboards sem mudança.** Por leitura não recebem a classe. Conferir que a coluna de
   entidades, usuários, organização e o dashboard continuam com largura cheia e sem `mx-auto` no
   corpo.
7. **Esqueletos sem salto horizontal.** Com rede lenta (throttle 3G), navegar para as cinco telas e
   comparar o `left` do `h1` no esqueleto e na tela carregada.
8. **Mobile.** Painel com no mínimo 50vh a 390×844 e `LoadErrorState` igual ao de antes (forçar erro de
   carga na edição de entidade com id inexistente).
9. **Conta.** Abas sem bloco esticado até o rodapé, claro e escuro, três idiomas. Inclui a aba Cobrança
   com e sem Stripe configurada (`AccountBillingPlaceholder`).

## Correções aplicadas

Nenhuma. Não encontrei nada que precisasse de correção.

## Raio de impacto

- `PAGE_NARROW_CLASS` tem dois consumidores, `Container.tsx` e `PageSkeleton.tsx`, e chega a dez arquivos
  de rota: cinco páginas e cinco `loading.tsx`.
- Nenhum contrato público mudou: sem DTO, action do SDK, rota, `error.code`, chave de i18n nem prop de
  componente do design system.
- `apps/app/CLAUDE.md` ganhou uma regra de layout; ela é lida por quem criar tela nova.

## Lacunas de teste

- Classes do `<form>` e dos blocos da conta sem teste unitário: continua aberta, por decisão do plano
  (§7). A altura só se prova no browser, itens 3, 4 e 9 acima.
- Correção do D0 não executada: continua aberta, item 1 acima.
- CSS do antd ausente na primeira pintura da tabela: fora de escopo. Precisa ser confirmado em
  `pnpm --filter app build && start` antes de ir para o backlog.

## Decisões em aberto

- Nome da branch: aplicar `feat/app-form-layout-centered` com `git branch -m` quando os commits forem
  aprovados. Recomendação: sim. A branch atual não tem commit nem remoto.
- O D0 é uma correção do E2E vermelho na `main`, que poderia ir numa PR própria
  (`test/fix-focus-e2e-hydration`, por exemplo) e destravar as outras PRs antes desta. Recomendação: manter
  nesta branch como commit separado. A feature mexe nas mesmas telas que o teste cobre, e o `/test` vai
  rodar os dois juntos.

## Gates estáticos

| gate | comando | resultado |
|---|---|---|
| lint | `pnpm check` | 1138 arquivos, sem erro |
| typecheck app | `pnpm --filter app typecheck` | sem erro |
| typecheck e2e | `pnpm --filter e2e typecheck` | sem erro |
| paridade i18n | não se aplica | nenhuma chave tocada |

A suíte da app não rodou aqui. O número do handoff é 144 arquivos e 1321 testes verdes, e T1 + T2 com
14/14.

## Plano de commits

Ordem: backlog, teste E2E, código da app, documentação da app, artefatos da feature.

1. `docs(specs): audit backlog against b7f9124`
   - `specs/BACKLOG.md`, `specs/reference/AUDIT.md`
   - `specs/features/account-security-mfa.md`, `specs/features/admin-own-account.md`,
     `specs/features/app-form-layout-centered.md`, `specs/features/signup-email-verification.md`,
     `specs/features/social-sign-in-providers.md`
   - `specs/reference/research/compliance-trust-baseline.md`,
     `specs/reference/research/object-storage-costs.md`,
     `specs/reference/research/saas-starter-feature-benchmark.md`
2. `test(e2e): retry action menu trigger until the row dropdown hydrates`
   - `apps/e2e/tests/focusNotObscured.spec.ts`
3. `feat(app): center the narrow page column`
   - `apps/app/shared/components/ui/pageLayout.ts`
   - `apps/app/__tests__/pageShell.test.tsx`
4. `feat(app): size full-page forms and account sections to their content`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/edit/[id]/EditEntityClient.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountBillingPanel.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPreferencesForm.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPrivacyPanel.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm.tsx`
5. `feat(app): add narrow loading skeletons to the create and edit form pages`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/loading.tsx`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/loading.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/loading.tsx`
   - `apps/app/__tests__/formLoadingSkeletons.test.tsx`
6. `docs(app): document centered narrow pages and content-height forms`
   - `apps/app/CLAUDE.md`
7. `docs(features): app-form-layout-centered`
   - `docs/features/app-form-layout-centered/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
     `review/review.md`, mais o que o `/test` gravar)

Título de PR sugerido: `feat(app): center form pages and size them to their content`.

### Commits realizados

(preenchido pelo orquestrador)
