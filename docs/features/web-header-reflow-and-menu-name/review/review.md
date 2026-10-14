# Revisão: header da web cabe na janela e o botão do menu tem nome

Revisão por leitura do diff desta tarefa em `apps/web` e `packages/internationalization`, contra
`docs/review-checklist.md`, mais os gates estáticos e o teste de paridade. Rodada autônoma do `/cycle`, terceira
tarefa da mesma PR que `date-input-navigation` e `form-field-focus-and-names`. Nenhuma branch foi criada ou
renomeada e nada foi adicionado ao índice.

## Branch

| Item | Valor |
|------|-------|
| Atual | `guilhermebittelbrunn/cycle-command-v4` (criada pelo Conductor, não protegida) |
| Regex do padrão sobre a atual | `BRANCH INVALIDA: guilhermebittelbrunn/cycle-command-v4` |
| Recomendada para a PR das três tarefas | `fix/date-pickers-form-fields-and-header` |
| Regex do padrão sobre a recomendada | `branch OK: fix/date-pickers-form-fields-and-header` |
| Estado | a atual não tem upstream nem commit acima de `origin/main`; a recomendada não existe no remoto |

A PR toca `packages/design-system`, `packages/internationalization`, `apps/app` e `apps/web`, então o nome omite o
`<project>`, na forma que o regex aceita para vários apps (contexto do achado E11). Substitui o
`fix/date-pickers-and-form-fields` da revisão anterior, que não cobria o header. O caminho da regra continua sendo
`git branch -m fix/date-pickers-form-fields-and-header` antes do primeiro commit, por decisão do usuário.

## Revisão: web-header-reflow-and-menu-name

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

Nenhum pede edição nesta PR; os três abaixo ficam registrados para o backlog.

- `header/index.tsx:261-266`: o botão do menu tem `aria-expanded`, mas não `aria-controls`. O padrão de disclosure
  da WAI-ARIA o recomenda, sem exigir; o painel só existe no DOM quando está aberto (`:274`), então ligar os dois
  pede um `id` estável e decidir o que fazer com o painel fechado. Fora do corte do plano.
- (superado na rodada 2, a classe saiu) `header/index.tsx:186`: com `lg:truncate`, um nome de marca cortado não tem
  `title`. Quem usa leitor de tela
  continua ouvindo o nome inteiro, que segue no DOM; quem vê perde o fim do nome, e só na configuração extrema.
- `apps/web/__tests__/headerMenuButton.test.tsx`, caso "usa o rótulo de cada idioma": fixa a cópia da chave
  (`["Menu", "Menu", "Menú"]`). A paridade já garante que a chave existe nos três idiomas; esse caso só reprova
  quando alguém muda o texto. Barato e inofensivo, então fica.

### ✅ OK

**Desvio do `/develop` em `brandSurfaces.test.tsx:99` e `:109`: ajuste legítimo de contrato, não afrouxamento**
(superado na rodada 2: o teste voltou ao `HEAD` junto com a remoção do `lg:truncate`). Os
dois casos continuam comparando a tag inteira, com o nome literal e a lista exata de classes, e continuam provando o
que o título deles diz: o nome sai completo no HTML e em uma linha (`whitespace-nowrap` segue na string, e o
`truncate` também aplica `white-space: nowrap`, conforme a compilação registrada no handoff). A asserção ficou tão
estrita quanto antes; só passou a descrever o atributo novo. O que mudou de comportamento é visual e só a partir de
1024 px: o nome pode aparecer com reticências se a coluna do meio ficar menor que ele, e isso foi decidido no plano
(D2), não descoberto pelo teste.

**`lg:truncate` é a escolha certa** (superado na rodada 2: a classe não agia e foi removida). A coluna do meio é
`minmax(0,auto)`. Como o mínimo é fixo em 0, o item da grade
não tem tamanho mínimo automático e a trilha pode encolher abaixo do nome. Sem `overflow: hidden` no `<p>`, o texto
`nowrap` transbordaria a célula e pintaria por cima das colunas vizinhas. Com `truncate`, o `<p>` (item flex do
`div` da marca, `:167`) ganha mínimo automático 0, porque o `overflow` deixa de ser `visible`, e encolhe com
reticências. O avatar já é `shrink-0` (`packages/design-system/components/ui/avatar.tsx:17`). Abaixo de 1024 px o
`lg:` não se aplica e o header fica igual ao do `HEAD`.

**Grade.** `lg:grid-cols-[1fr_minmax(0,auto)_1fr]` (`:84`): as laterais são `minmax(auto, 1fr)` e não encolhem
abaixo do próprio conteúdo; a do meio recebe a largura da marca enquanto sobra espaço e encolhe até zero quando não
sobra. A conta do plano (§1.3) cabe nos cinco casos medidos pelo `/test` anterior. Ela é estimativa de leitura; a
medida em px é do `/test`.

**Botão do menu** (`:261-266`): `aria-expanded={isOpen}` sai como `"false"`/`"true"` no HTML, e o `aria-label` vem
de `dictionary.components.header.menu`. O `Button` repassa os dois pelo `{...props}` (`button.tsx:71`); o botão não
usa `loading`, então a mudança do `Button` em `form-field-focus-and-names` não o afeta. Os ícones `Menu` e `X`
saem com `aria-hidden` (handoff, `lucide-react/dist/esm/Icon.js:32`).

**i18n.** A chave `components.header.menu` existe nos três idiomas com a mesma estrutura
(`packages/internationalization/translations/components/header/index.ts:18`, `:36`, `:54`): "Menu", "Menu",
"Menú". Nenhum `apiErrors` novo. Variável do dicionário no componente segue `dictionary`, sem `t`/`d`.

**Teste novo** `headerMenuButton.test.tsx`: SSR em `node`, mocks nas bordas (`@repo/auth/provider`, `@/env`,
`@/shared/lib/client`, `next/navigation`, `next/link`), imports explícitos de `vitest`. O caso "nenhum botão do
header fica sem nome" protege o header inteiro contra regressão do mesmo tipo.

Nenhum comentário novo no código, nenhuma string de UI solta, nenhuma mudança de SDK, API ou env.

### 👁 Verificar no `/test`

Nada abaixo fecha por leitura: nem o `node` nem o jsdom calculam layout. Web em `build && start`, API e emuladores
com `pnpm seed`, modo `subscription` com `NEXT_PUBLIC_APP_URL`.

1. **Rolagem lateral a partir de 1024 px** (sustenta o corte). Em 1024, 1280 e 1440 px; `/pt-br`, `/en` e `/es`;
   visitante e logado; claro e escuro: `document.documentElement.scrollWidth === clientWidth`. Começar pelos casos
   que estouravam: es visitante a 1280 (1304 antes), es e pt-br visitante a 1024 (+49 e +6), logado a 1024 e a 1280
   (+29 e +5).
2. **Marca no centro.** Nas mesmas combinações, centro horizontal da marca contra o centro da janela, diferença
   abaixo de 2 px. Anotar também o x da borda direita do último botão.
3. **Nada sumiu.** Links e botões visíveis do header em cada largura, comparados com o `HEAD`.
4. **Regressão abaixo de 1024 px.** A 768 e a 390 px, nos três idiomas: os mesmos itens do `HEAD`, sem rolagem
   lateral, e o nome da marca sem reticências.
5. **Botão do menu.** A 390 e a 768 px: nome "Menu"/"Menu"/"Menú" na árvore de acessibilidade e
   `aria-expanded="false"`; tocar abre e muda para `"true"`, tocar de novo volta a `"false"`; Tab até o botão e
   Enter alterna do mesmo jeito. O SSR só prova o estado inicial.
6. **Configuração extrema** (informativo, não reprova). Build com `NEXT_PUBLIC_DOCS_URL` e um
   `NEXT_PUBLIC_APP_NAME` de 30 caracteres, es a 1024 e a 1280 px: sem rolagem lateral; a 1024 o nome pode sair com
   reticências. Anotar o quanto a marca sai do centro.
7. **axe.** `pnpm e2e` sem regra nova, com a `A11Y_ALLOWLIST` vazia.

## Correções aplicadas

Nenhuma.

## Raio de impacto

- `Header` da web: todas as páginas da `apps/web`. Abaixo de 1024 px só muda o botão do menu (dois atributos).
- `components.header` do dicionário: consumida pelo header da web; a chave nova não altera as existentes.

## Lacunas de teste

| Lacuna | Veredito |
|--------|----------|
| Layout e rolagem sem teste automatizado (D6 do plano) | continua aberta; itens 1 a 4 acima |
| `aria-expanded="true"` depois do clique sem teste | continua aberta; item 5 acima |

## Decisões em aberto

- Branch: renomear para `fix/date-pickers-form-fields-and-header` antes do primeiro commit. Recomendação:
  renomear.
- Ordem do commit de i18n: decidida abaixo, sem pergunta.
- P1 a P3 do plano seguem com a opção adotada lá.

## Gates

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint | `corepack pnpm check` | 885 arquivos, nenhum erro |
| Typecheck | `corepack pnpm turbo run typecheck --filter=web --filter=@repo/internationalization` | 2 de 2 ok, 0 em cache, 5,4 s |
| Paridade de i18n | `corepack pnpm --filter @repo/internationalization test` | 67 testes em 7 arquivos, `parity.test.ts` 2 de 2 |
| Suíte da web | não remedida | não mexi em código; vale a medição do handoff (102 testes em 17 arquivos) |
| Índice | `git diff --cached --stat` | vazio |
| Segredo | `rg` por e-mail e prefixos de chave em `docs/features/web-header-reflow-and-menu-name/` | nenhuma ocorrência |

## Ordem do commit de i18n

A regra do repositório põe `packages/internationalization` depois de `apps/app`/`apps/web`. Aqui isso deixaria o
commit `fix(web)` do header sem compilar: ele lê `dictionary.components.header.menu`, que só existe a partir do
commit de i18n, e o `typecheck` da web reprova nesse ponto do histórico. Um histórico em que cada commit compila
vale mais que a ordem padrão: permite `git bisect` e revisão commit a commit. Por isso o commit de i18n entra
imediatamente antes do header, e não no fim. O desvio vale só para esse par; os demais commits seguem a ordem da
regra e nenhum outro depende de chave nova.

## Rodada 2: o `lg:truncate` não agia

O `/test` (`test/report.md`, item 6 e "Achados fora do diff", 2) mediu em build de produção, com nome de marca de
30 caracteres e `NEXT_PUBLIC_DOCS_URL` definido, a 1024 px: es visitante 1058 (+34), es logado 1050 (+26), en logado
1035 (+11), pt-br logado 1028 (+4). O nome saiu inteiro, sem reticências: no `<p>`, `scrollWidth` = `clientWidth` =
260 px; a coluna do meio ficou com 285 px e o grupo da direita precisava de 387 px numa coluna de 345. A grade nova
melhorou também esse caso (com a do `HEAD`, 1073 a 1024 e 1304 a 1280), e os 36 casos da configuração padrão
passaram, com a marca a 0 px do centro. A "rede de segurança" do `truncate`, porém, não funcionava.

### Decisão: remover o `lg:truncate`

`header/index.tsx:186` volta a `whitespace-nowrap font-semibold`, e `apps/web/__tests__/brandSurfaces.test.tsx` volta
ao conteúdo do `HEAD` (as duas strings esperadas sem `lg:truncate`). O arquivo de teste sai do diff.

Por que nada muda na tela: o `truncate` só corta quando o `<p>` fica mais estreito que o texto, e a medição mostrou
que isso não aconteceu em nenhum caso, padrão ou extremo (`scrollWidth` = `clientWidth`). A leitura do CSS explica
por quê. O grupo da direita (`:191`) tem `w-full`; uma largura percentual não dá ao item da grade uma contribuição
mínima de conteúdo durante o dimensionamento das trilhas, então a trilha `1fr` da direita fica com mínimo zero. A
coluna do meio, `minmax(0, auto)`, recebe espaço até a largura da marca antes de as trilhas `fr` dividirem o resto.
Com mínimos zero (direita) e a navegação (esquerda, ~290 a ~430 px), sobra sempre mais que a marca a partir de
1024 px, e a coluna do meio nunca encolhe. Sem encolher, não há o que truncar. O `whitespace-nowrap` continua, então
o nome segue em uma linha.

O `minmax(0, auto)` da coluna do meio fica: ele não muda nada nos casos medidos e é a metade da rede que já está
certa; sem ele, a correção abaixo também não funcionaria.

### Alternativa descartada: fazer a rede funcionar

Pela mesma leitura, a mudança mínima seria `lg:w-auto` (ou `lg:min-w-max`, a hipótese do `/test`) no grupo da
direita, de volta com o `lg:truncate`. Na grade, o item continuaria esticado até a borda da coluna
(`justify-self: stretch`), e a trilha da direita passaria a ter como mínimo a largura dos botões; aí a coluna do meio
cede e a marca corta com reticências. Descartada nesta PR por três motivos:

- a conclusão depende de detalhes do algoritmo de trilhas da grade (contribuição mínima com largura percentual,
  ordem entre "maximize tracks" e as trilhas `fr`) que não dá para fechar só lendo;
- quando o grupo da direita passa da metade, a trilha dele deixa de ser flexível e a marca sai do centro; é troca de
  um defeito (rolagem de 4 a 34 px) por outro (marca descentralizada), e precisa de decisão de produto;
- o `/test` teria de remedir os 36 casos padrão e a configuração extrema, por um caso que só existe com nome de 30
  caracteres e link de documentação, e o link nem aparece hoje (achado fora do diff, 1).

### Achado para o backlog (próximo `/spec --sync`)

Não editei o `specs/BACKLOG.md`, que é da auditoria e tem commit `docs(specs)` próprio. O item a registrar:

- **Header da web rola a 1024 px com marca longa e link de documentação.**
  `apps/web/app/[locale]/components/header/index.tsx:191`.
  Medido pelo `/test` desta tarefa: nome de 30 caracteres e `NEXT_PUBLIC_DOCS_URL`, 1024 px, +34 (es visitante),
  +26 (es logado), +11 (en logado), +4 (pt-br logado); 1280 e 1440 sem rolagem. Causa provável, por leitura: o
  `w-full` do grupo da direita zera a contribuição mínima dele na trilha `1fr`. Correção candidata, não medida:
  `lg:w-auto` ou `lg:min-w-max` nesse grupo e `lg:truncate` no nome da marca, com a marca podendo sair do centro.
  Depende do achado do link de documentação (`apps/web/env.ts` não declara `NEXT_PUBLIC_DOCS_URL`), que muda a
  largura da esquerda.

Os três achados fora do diff estão no `test/report.md` para a auditoria: o link de documentação que nunca aparece
("Achados fora do diff", 1), o menu que continua aberto depois de navegar ("Menu ao navegar") e o erro
"Cannot assign to read only property 'redirects'" no `next start` ("Achados fora do diff", 3). Nenhum foi corrigido
aqui.

### Gates da rodada 2

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint | `corepack pnpm check` | 885 arquivos, nenhum erro |
| Typecheck | `corepack pnpm turbo run typecheck --filter=web` | 1 de 1 ok, 0 em cache |
| Testes do header | `vitest run __tests__/brandSurfaces.test.tsx __tests__/headerMenuButton.test.tsx` (em `apps/web`) | 16 de 16 em 2 arquivos |
| Suíte da web | `vitest run` (em `apps/web`) | 102 testes em 17 arquivos |

### 👁 Verificar no `/test`

Nada a remedir. A classe removida não agia em nenhum dos casos medidos (`scrollWidth` = `clientWidth` no `<p>`), e
o resto do header não mudou desde a medição.

## Plano de commits (consolidado para a PR das três tarefas)

Este é o plano único da PR. Os `review.md` de `date-input-navigation` e `form-field-focus-and-names` apontam para
cá.

Antes do primeiro commit: `git diff --cached --stat` tem de sair vazio, e a branch deve estar renomeada (ou a
decisão do usuário registrada). Depois de cada commit, conferir `git show --stat --oneline HEAD` contra a lista. Os
screenshots em `docs/features/*/test/e2e/` são ignorados pelo `.gitignore:300` e não entram.

1. `fix(design-system): open the date input calendar on the selected month and accept a month and year selector`
   - `packages/design-system/components/ui/date-input.tsx`
   - `packages/design-system/__tests__/dateInputNavigation.test.tsx`
2. `fix(design-system): keep text fields focused while a form submits without submitting twice on Enter`
   - `packages/design-system/components/form/hookform/hookformInputPassword.tsx`
   - `packages/design-system/components/form/hookform/hookformInput.tsx`
   - `packages/design-system/components/form/hookform/useSubmitEnterGuard.ts`
   - `packages/design-system/__tests__/hookformSubmitReadOnly.test.tsx`
   - `packages/design-system/__tests__/hookformEnterResubmit.test.tsx`
   - `packages/design-system/__tests__/hookformInputPassword.test.tsx`
3. `fix(design-system): name the radio group after its label`
   - `packages/design-system/components/ui/radio-group-input.tsx`
   - `packages/design-system/__tests__/radioGroupInput.test.tsx`
4. `fix(design-system): keep the button width and lock while loading`
   - `packages/design-system/components/ui/button.tsx`
   - `packages/design-system/__tests__/button.test.tsx`
5. `feat(app): add a month and year selector to the entity birthdate field`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(components)/EntityFormFields.tsx`
   - `apps/app/__tests__/entityBirthdateField.test.tsx`
6. `test(app): cover the audit trail date filters with the real date input`
   - `apps/app/__tests__/auditFiltersDateInput.test.tsx`
7. `refactor(app): let the button lock the form footers while loading` (depende do 4)
   - `apps/app/shared/components/ui/Footer.tsx`
   - `apps/app/shared/components/ui/PageFormFooter.tsx`
   - `apps/app/__tests__/sharedFooterPendingState.test.tsx`
8. `test(app): send a single sign-in when Enter is pressed again before the button locks` (depende do 2)
   - `apps/app/__tests__/signInEnterResubmit.test.tsx`
9. `fix(web): use the shared date input on the contact form`
   - `apps/web/app/[locale]/contact/components/contact-form-client.tsx`
   - `apps/web/__tests__/contactFormDateLocale.test.tsx`
10. `fix(internationalization): add the header menu button label` (antes do 11 para ele compilar)
    - `packages/internationalization/translations/components/header/index.ts`
11. `fix(web): name the mobile menu button and keep the header within the viewport`
    - `apps/web/app/[locale]/components/header/index.tsx`
    - `apps/web/__tests__/headerMenuButton.test.tsx`
12. `docs: document the date input month and year selector and the radio group label`
    - `AGENTS.md` (as duas linhas, uma de cada tarefa; separar exigiria `git add -p`)
13. `docs(specs): audit the backlog after PR #44`
    - `specs/BACKLOG.md`
14. `docs(features): date-input-navigation`
    - `docs/features/date-input-navigation/STATE.md`
    - `docs/features/date-input-navigation/analyze/plan.md`
    - `docs/features/date-input-navigation/develop/handoff.md`
    - `docs/features/date-input-navigation/review/review.md`
    - `docs/features/date-input-navigation/test/criterios-aceite.md`
    - `docs/features/date-input-navigation/test/report.md`
15. `docs(features): form-field-focus-and-names`
    - `docs/features/form-field-focus-and-names/STATE.md`
    - `docs/features/form-field-focus-and-names/analyze/plan.md`
    - `docs/features/form-field-focus-and-names/develop/handoff.md`
    - `docs/features/form-field-focus-and-names/review/review.md`
    - `docs/features/form-field-focus-and-names/test/criterios-aceite.md`
    - `docs/features/form-field-focus-and-names/test/report.md`
    - mais o que o novo `/test` do R1 gravar nessa pasta antes do commit
16. `docs(features): web-header-reflow-and-menu-name`
    - `docs/features/web-header-reflow-and-menu-name/STATE.md`
    - `docs/features/web-header-reflow-and-menu-name/analyze/plan.md`
    - `docs/features/web-header-reflow-and-menu-name/develop/handoff.md`
    - `docs/features/web-header-reflow-and-menu-name/review/review.md`
    - `docs/features/web-header-reflow-and-menu-name/test/criterios-aceite.md`
    - `docs/features/web-header-reflow-and-menu-name/test/report.md`

Título de PR sugerido: `fix: date pickers, form fields and web header accessibility`. Depois do último commit
aprovado, perguntar ao usuário se deve rodar `git push -u origin fix/date-pickers-form-fields-and-header`.

### Commits realizados

(preenchido pelo `/review` depois de commitar)
