# Revisão: acessibilidade com allowlist do axe zerada

> **Rodada 2 (depois do `/test`)** está na seção [Rodada 2](#rodada-2-hover-do-excluir-no-actionsmenu), no
> fim do arquivo. Ela corrige um defeito deste diff que a rodada 1 aprovou, e o plano de commits abaixo já
> está atualizado.

Rodada autônoma do `/cycle`. Nada foi perguntado ao usuário; as decisões estão registradas abaixo, cada uma
com a alternativa descartada. A revisão leu o diff inteiro, o `develop/handoff.md` e as partes do
`analyze/plan.md` que tratam de commits e achados fora do corte. Não subi app, não rodei a suíte de testes e
não abri browser.

## Branch

- **Nome:** `feat/accessibility-conformance`, criada com `git switch -c` a partir do HEAD `2c285de` da branch
  `cycle-spec-pipeline`. O working tree e o índice vieram junto.
- **Por que sem `project`:** o diff toca `packages/design-system`, `apps/app`, `apps/web`, `apps/e2e` e
  `packages/internationalization`. Com vários apps, a regra de `git-commits.md` manda omitir o prefixo.
- **Regex:** `branch OK: feat/accessibility-conformance`.
- **A branch anterior:** `cycle-spec-pipeline` não passa no regex. Não foi renomeada (o `git branch -m` está
  proibido neste workspace) e continua existindo, sem upstream, no mesmo commit.

## Achados

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/app/shared/components/ui/NotFoundPage.tsx:50-61`: o `ArrowLeft` virou filho direto do `Link`. Com um
  `svg` como filho direto, a regra `has-[>svg]:px-4` do `buttonVariants({ size: "lg" })` troca o `px-6` que o
  `Button` antigo tinha, porque o `Button` embrulhava ícone e texto num `div`. É o mesmo problema que o
  `/develop` evitou nos links da web (desvio 1 do handoff) e não repetiu aqui. **Corrigido:** ícone e texto
  dentro de `<span className="flex items-center gap-2">`, igual aos links da web.
- `pnpm-lock.yaml`: além das arestas do importer `packages/design-system`, o pnpm deduplicou cinco pacotes
  transitivos (`baseline-browser-mapping` 2.8.16 → 2.10.10, `magic-string` 0.30.17 → 0.30.19, `fdir` 6.4.3 →
  6.5.0, `picomatch` 4.0.2 → 4.0.3, `ws` 8.18.3 → 8.21.3) e o `geist` do design system passou a apontar para
  a instância `next@16.0.0(@babel/core@7.28.4)`. **Mantido como o pnpm gerou.** Motivos: as cinco versões
  novas já estavam no lockfile e ficam dentro das faixas declaradas; a instância do `next` com `@babel/core`
  também já existia, e a troca vem do `@vitejs/plugin-react` novo trazer `@babel/core` para o importer; e um
  lockfile podado à mão é o que o próximo `pnpm install` desfaz, com risco de quebrar o `--frozen-lockfile`
  do CI. Medi: `pnpm install --frozen-lockfile --lockfile-only --offline` passa e deixa o arquivo idêntico
  (`cmp`). O efeito fora do design system é que o `jsdom` dos testes do `apps/app` e da `apps/web` passa a usar
  `ws` 8.21.3. Alternativa descartada: reduzir o diff às arestas do design system editando o YAML.
- `turbo.json` não mudou, mas o design system agora tem task `test`. Como `test` depende de `^test` e `build`
  depende de `test`, todo `build` e todo `pnpm test` de app passam a rodar antes os 44 testes do design system
  (jsdom com antd). É o que a spec pede; fica registrado como custo novo no CI.

### 🟢 Sugestão / nit

- `packages/design-system/components/ui/form.tsx:109-124`: sem `FormDescription`, o `FormControl` publica
  `aria-describedby="<id>-form-item-description"` apontando para um id que não existe. O padrão já estava no
  `HookFormInput` e agora chega a mais quatro compostos. O axe costuma tratar referência inexistente em
  `aria-describedby` como "needs review", não como violação, mas isso precisa ser visto na suíte (lista abaixo).
  Fora do corte; não mexi.
- `apps/web/app/[locale]/components/header/index.tsx:261`: o botão do menu mobile só tem ícone (`Menu`/`X`) e
  nenhum `aria-label`. A suíte do axe roda em viewport de desktop, onde o botão está `lg:hidden`, então não
  aparece. Achado novo, fora do corte, para o backlog.
- `apps/web/app/[locale]/components/header/language-switcher.tsx:68`: "Switch language" em inglês fixo. Já
  está no §12.2 do plano; continua aberto.
- `UsersListClient.tsx:107-110` usa `record.displayName ?? record.email ?? ""`. Um `displayName` vazio gera
  "Usuário ativo: ". A coluna de nome do mesmo arquivo (`:73`) usa o mesmo `??`, então mantive a consistência.

### ✅ OK

- **`FormField` nos 7 `HookForm*` (item d).** `FormField` é o `Controller` com as mesmas props dentro do
  `FormFieldContext.Provider` (`form.tsx:32-41`); `value`, `onChange`, `onBlur` e `ref` chegam ao componente
  como antes. O `Slot` do `FormControl` deixa as props do filho vencerem: o `id={field.name}` do `DateInput`,
  do `ImageUploadInput` e do `TextareaInput` sobrescreve o `formItemId`, então as labels internas desses
  compostos continuam apontando para o id certo. O `ref={field.ref}` do filho é composto pelo `Slot`, e o foco
  no primeiro campo inválido do RHF segue funcionando. O `aria-invalid` que o `Slot` injeta no `DateInput` e
  no `ImageUploadInput` cai fora porque eles não repassam props desconhecidas; o `aria-describedby` agora é
  aceito e repassado ao elemento focável. No `TextareaInput`, o `data-slot` foi para depois do spread, senão
  o `form-control` do `Slot` o sobrescreveria. No `RadioGroupInput`, `id`, `aria-*` e `data-slot` vão para a
  raiz do `RadioGroup`; nenhum CSS ou teste do repo seleciona `[data-slot="radio-group"]`.
- **`HookFormSelect`.** O `Select` agora recebe `aria-invalid` do `FormControl`, e o `SelectTrigger` passa a
  aplicar as classes `aria-invalid:*`. É uma mudança visual pequena e coerente com os outros campos.
- **Senha.** O `FormControl` saiu do `div` e foi para o `Input`, então o `FormLabel htmlFor` passa a apontar
  para o próprio input. Isso sustenta a remoção do comentário em `apps/e2e/support/signIn.ts`. O `aria-label`
  do toggle vem de `dictionary.components.inputPassword`.
- **`Button` em carregamento (item e).** `sr-only` é `position: absolute`, então o texto não entra no fluxo
  nem no `gap` do flex. A largura fica igual à do spinner sozinho, que é o que o botão já fazia antes deste
  diff. `aria-busy` e `aria-hidden` do `Spinner` vêm antes do `{...props}` e podem ser sobrescritos pelo
  chamador.
- **Override `components.Dropdown` (item b).** No antd 5.29.3, `colorError` e `colorTextLightSolid` só
  aparecem em `lib/dropdown/style/status.js`, na regra do item `danger`. O override por componente não vaza
  para outro estado do `Dropdown`. O comentário em `antd-app.tsx:72-74` explica uma restrição da biblioteca,
  que é a exceção 1 de `code-comments.md`, em três linhas e sem citar o fluxo. **Errado na rodada 1:** olhei
  só o CSS do antd e não o `globals.css`, que pintava os filhos do item `danger` direto. O `/test` pegou o
  resultado (texto 1:1 no hover); ver Rodada 2.
- **`biome-ignore-all` em `themeContrast.test.ts` (item c).** Uma regra só (`noMagicNumbers`), com motivo, e
  o repo já usa a mesma forma em cinco `hookform*.tsx` e no `postcss.config.mjs` da web.
- **`generateMetadata` nos layouts (item f).** O root layout (`apps/app/app/layout.tsx`) não define
  `title.template`, então o título do layout não sai duplicado. As chaves `navbar.environmentCommon` e
  `navbar.environmentAdmin` existem nos três idiomas. O formato `<título> | <marca>` é o mesmo do
  `createMetadata` de `@repo/seo`.
- **Links da web com `buttonVariants` (item g).** Hero, CTA, FAQ e preços seguem o precedente do header
  (PR #28). O `span` interno mantém o padding do tamanho e o `gap-2` entre ícone e texto. O `PopoverTrigger
  asChild` do contato usa o `Button` do design system, que é `forwardRef`.
- **Strings e comentários (item h).** Nenhum texto visível novo fora do dicionário. As chaves novas existem
  em pt-br, en e es com a mesma estrutura. Nenhum comentário novo cita artefato do fluxo, e os dois comentários
  removidos no `apps/e2e` descreviam defeitos que este diff corrige.
- **Afirmações do handoff confirmadas por leitura:** o `AGENTS.md` diz que o `hookformAria.test.tsx` cobre os
  oito `HookForm*`, e o arquivo importa os oito. A allowlist está vazia e o `apps/e2e/support/a11y.ts:97` ainda
  emite `a11y-stale-exception`. O `Select` de usuário impersonado, que o grupo `UNNAMED_SELECT_TRIGGER` citava,
  já tinha nome pelo `placeholder` (`select/index.tsx:279`).
- **Spec.** O corte de `specs/accessibility-conformance.md` foi implementado. A divergência que o plano
  registrou continua valendo: quatro `HookForm*` já publicavam `aria-invalid`, e o que faltava era ligar o
  campo à mensagem.

## Correções aplicadas

| Arquivo | O que mudou |
|---------|-------------|
| `apps/app/shared/components/ui/NotFoundPage.tsx` | Ícone e texto do link "voltar ao início" dentro de `<span className="flex items-center gap-2">`, para o `buttonVariants` manter o `px-6` do tamanho `lg`. |

Não há outra edição de código. A branch foi criada, e este arquivo e o `STATE.md` foram escritos.

## Raio de impacto

- `Button` (`packages/design-system/components/ui/button.tsx`): quem passa `loading` passa a ter o rótulo em
  `sr-only` e `aria-busy`. São os formulários de auth do `apps/app` e da `apps/web`, o `Footer` dos
  formulários do painel e o checkout.
- `SelectProps`, `DateInputProps` e `ImageUploadInputProps` ganham props opcionais. Nenhum call site quebra
  (typecheck de `app`, `web` e `e2e` passa).
- `ActionsMenu`: o gatilho virou `<button>`. Ninguém passa `className` além do padrão; o `playground` não usa
  essa prop.
- Tokens `--muted-foreground` (claro) e `--destructive` (escuro): mudam toda superfície que os usa nos dois
  apps. Fork que customizou o `globals.css` recebe o aviso do `themeContrast.test.ts`.
- Sem SDK, sem API, sem `error.code` novo.

## 👁 Verificar no `/test`

Por ordem de risco. A primeira sustenta o corte da feature.

1. **Allowlist vazia passa.** `pnpm e2e` em claro e escuro, sem violação e sem `a11y-stale-exception`. Olhar
   também se o axe devolve `aria-valid-attr-value` para o `aria-describedby` que aponta para o
   `-form-item-description` inexistente: "incomplete" é aceitável, violação não.
2. **`<title>` renderizado.** `document.title` em `/pt-br`, `/en`, `/es` nas rotas do painel comum e admin,
   inclusive nas páginas `"use client"` (`entities/create`, `admin/users/create`, `admin/users/edit/[id]`).
   Esperado: "Painel do usuário | <marca>" e "Administração | <marca>" (e as traduções).
3. **Item "Excluir" do `ActionsMenu`.** Abrir o menu de uma linha de entidades, ler `color` e
   `background-color` computados do item em repouso e com hover, em claro e escuro. Esperado: repouso no
   vermelho do tema; hover com texto na cor do fundo sobre o vermelho. Nunca `#000000`.
4. **`autoFocus` do `Dropdown`.** Tab até o gatilho, Enter: o foco entra no menu, as setas andam, Esc devolve
   o foco ao gatilho. Abrir com o mouse não pode deixar o foco preso nem rolar a tabela. Se atrapalhar, o
   plano manda tirar o `autoFocus`.
5. **Contraste no estilo computado.** Mensagem de erro no escuro; iniciais do avatar e cards `bg-muted` da
   landing no claro; `Button` destrutivo do `AccountPrivacyPanel` no escuro (branco sobre
   `bg-destructive/60`, o handoff estima 6,48:1). Os números do handoff são de conversão oklch → sRGB, não do
   navegador.
6. **Erro de campo pela árvore de acessibilidade.** Criar entidade com campos vazios no `apps/app` (incluindo o
   `Select` de tipo e o `DateInput`) e cadastro com senha curta na `apps/web`: o campo focável tem
   `aria-invalid="true"` e o `aria-describedby` inclui o id da mensagem visível. Conferir também que o foco vai
   para o primeiro campo inválido no submit (o `ref` passa pelo `Slot`).
7. **Nome do botão em carregamento.** Login com rede lenta (DevTools, Slow 3G): o botão mantém o nome
   "Entrar" na árvore do Chrome, com `aria-busy="true"`, e a largura não salta ao entrar e sair do
   carregamento.
8. **Regressão visual.** Links do hero, CTA, FAQ e preços, e o link do `NotFoundPage` (padding `px-6` em
   `lg`, depois da correção desta revisão). Gatilho do menu agora `<button>`: sem borda nem fundo nativos, anel
   de foco visível, em claro e escuro.
9. **Seletor de data do contato.** Um único elemento focável no gatilho, depois do `PopoverTrigger asChild`.
10. **Avatar enviado.** Usuário com foto: sem `image-alt` no menu de perfil.

## Lacunas de teste

| Lacuna | Veredito |
|--------|----------|
| `Select` mobile do navbar (`useIsMobile` → `true`) sem asserção de `aria-label` | Continua aberta. O mock do teste fixa `false`; um segundo cenário com o mock em `true` fecha. |
| `generateMetadata` dos layouts sem teste | Continua aberta, por decisão. O E2E (item 2 acima) é quem prova. Um unitário que chame a função com `params` resolvidos seria barato, fica a critério do `/test`. |
| `NotFoundPage` e links da web sem teste de componente | Continua aberta. A correção desta revisão não acrescenta teste; o item 8 acima cobre visualmente. |

## Decisões em aberto

Nenhuma que precise do usuário. Decisões que tomei sem perguntar:

1. **Lockfile inteiro, como o pnpm gerou.** Descartado: podar o YAML à mão até sobrarem só as arestas do
   design system.
2. **Nome da branch sem `project`** (`feat/accessibility-conformance`). Descartado: `packages/feat/...`, que
   esconderia que `apps/app`, `apps/web` e `apps/e2e` também mudam.
3. **i18n como primeiro commit, e não o último.** A regra de commits põe `packages/internationalization` no
   fim porque ele costuma consumir `error.code` da API. Aqui a dependência é a inversa: o design system
   (`inputPassword`, `actionMenu.trigger`), o `apps/app` (`enabledToggle`, `statusToggle`) e o `apps/e2e`
   (`actionMenuCopy.trigger`) leem as chaves novas, e o dicionário é tipado a partir do objeto pt-br. Com o
   i18n por último, os commits de 2 a 12 não passariam no typecheck. A regra fala em "ordem de dependência", e
   essa é a ordem real.
4. **`hookformInputPassword.tsx` inteiro num commit só** (o de campos), com o nome do toggle junto, para não
   precisar de `git add -p`. O plano previa isso como alternativa.
5. **Testes do design system separados por commit de funcionalidade.** O `actionMenu.test.tsx` trava o
   override do `antd-app.tsx`, então o commit dos tokens vem antes do commit do gatilho.

## Gates

| Comando | Resultado |
|---------|-----------|
| `pnpm check` | 790 arquivos, nenhum erro (depois da correção). |
| `pnpm turbo run typecheck --filter=app --filter=web --filter=@repo/design-system --filter=e2e --filter=@repo/internationalization` | 5 tasks ok (4 do cache; `app` rodou de novo por causa da correção). |
| `pnpm --filter @repo/internationalization test` | 6 arquivos, 59 testes, paridade inclusa. |
| `pnpm install --frozen-lockfile --lockfile-only --offline` | Passa; lockfile idêntico antes e depois. |

A suíte do design system (44 testes) e as de `app`/`web`/`e2e` não rodei: são do `/test`. O número do handoff
é `app:test` 690, `web:test` 82, `e2e:test` 16, `@repo/design-system:test` 44. Cada commit intermediário do
plano não foi compilado isoladamente; só a árvore final.

## Varredura de segredo

`docs/features/accessibility-conformance/` e `docs/features/storage-emulator-rules-tests/`: só aparecem
`user@example.com` e `qa-storage-emulator@example.com`, placeholders do seed e da conta de QA já documentados.
Nenhuma senha, token ou chave.

## Plano de commits

**Passo 0, antes do primeiro commit.** `git diff --cached --stat` não sai vazio: o índice tem o
`git mv specs/storage-emulator-rules-tests.md → docs/features/storage-emulator-rules-tests/spec.md` da
auditoria do backlog. Tirar do índice sem perder o working tree:

```bash
git restore --staged specs/storage-emulator-rules-tests.md docs/features/storage-emulator-rules-tests/spec.md
git diff --cached --stat   # tem de sair vazio
```

O rename volta no commit 14. Depois de cada commit, `git show --stat --oneline HEAD` contra a lista abaixo.

O cenário novo do `/test` em `apps/app/__tests__/panelNavbarControls.test.tsx` (menu mobile) está no mesmo
arquivo que o commit 7 já leva, então vai junto sem mudar a lista.

| # | Mensagem | Arquivos |
|---|----------|----------|
| 1 | `feat(internationalization): add accessible names for form and table controls` | `packages/internationalization/translations/components/ui/input-password.ts`, `packages/internationalization/translations/components/index.ts`, `packages/internationalization/translations/components/ui/action-menu.ts`, `packages/internationalization/translations/apps/app/pages/common/entities.ts`, `packages/internationalization/translations/apps/app/pages/admin/users.ts` |
| 2 | `test(design-system): add a vitest task with jsdom and testing library` | `packages/design-system/package.json`, `packages/design-system/vitest.config.mts`, `pnpm-lock.yaml` |
| 3 | `fix(design-system): link every HookForm field to its error message` | `packages/design-system/components/form/hookform/hookformInput.tsx`, `.../hookformInputPassword.tsx`, `.../hookformSelect.tsx`, `.../hookformDateInput.tsx`, `.../hookformImageUpload.tsx`, `.../hookformRadioGroup.tsx`, `.../hookformTextarea.tsx`, `packages/design-system/components/ui/select/index.tsx`, `packages/design-system/components/ui/date-input.tsx`, `packages/design-system/components/ui/image-upload-input.tsx`, `packages/design-system/components/ui/textarea-input.tsx`, `packages/design-system/__tests__/hookformAria.test.tsx`, `packages/design-system/__tests__/hookformInputPassword.test.tsx`, `packages/design-system/__tests__/imageUploadInput.test.tsx` |
| 4 | `fix(design-system): raise muted and destructive text contrast to AA` | `packages/design-system/styles/globals.css` (tokens e a regra dos filhos do item `danger`, da rodada 2), `packages/design-system/providers/antd-app.tsx`, `packages/design-system/__tests__/themeContrast.test.ts` |
| 5 | `fix(design-system): keep the loading button named and make the actions trigger a button` | `packages/design-system/components/ui/button.tsx`, `packages/design-system/components/ui/action-menu.tsx`, `packages/design-system/__tests__/button.test.tsx`, `packages/design-system/__tests__/actionMenu.test.tsx` (inclui o teste novo da rodada 2, que lê o `globals.css` do commit 4) |
| 6 | `fix(app): title the panel pages from the dictionary` | `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx`, `apps/app/app/[locale]/(authenticated)/(admin)/admin/layout.tsx`, `apps/app/__tests__/panelLayoutTitle.test.ts` |
| 7 | `fix(app): name the environment picker and the row switches` | `apps/app/shared/components/ui/PanelNavbarControls.tsx`, `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/(home)/EntitiesListClient.tsx`, `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/(home)/UsersListClient.tsx`, `apps/app/__tests__/panelNavbarControls.test.tsx`, `apps/app/__tests__/entitiesListReadOnly.test.tsx`, `apps/app/__tests__/usersListArchiveLabels.test.tsx` |
| 8 | `fix(app): mark the navbar avatar as decorative` | `apps/app/shared/components/ui/ProfileDropdown.tsx` |
| 9 | `fix(app): render the not-found home action as a link` | `apps/app/shared/components/ui/NotFoundPage.tsx`, `apps/app/__tests__/notFoundPageHomeLink.test.tsx` |
| 10 | `fix(web): render the landing and pricing CTAs as links` | `apps/web/app/[locale]/(home)/components/hero.tsx`, `apps/web/app/[locale]/(home)/components/cta.tsx`, `apps/web/app/[locale]/(home)/components/faq.tsx`, `apps/web/app/[locale]/pricing/page.tsx` |
| 11 | `fix(web): use the date button as the contact popover trigger` | `apps/web/app/[locale]/contact/components/contact-form-client.tsx` |
| 12 | `test(e2e): empty the axe allowlist and query the row menu by name` | `apps/e2e/a11y/allowlist.ts`, `apps/e2e/tests/entityCrud.spec.ts`, `apps/e2e/support/signIn.ts` |
| 13 | `docs: record the HookForm field rule and the empty allowlist` | `AGENTS.md`, `packages/CLAUDE.md`, `docs/SETUP.md` |
| 14 | `docs(specs): audit the backlog and archive storage-emulator-rules-tests` | `specs/BACKLOG.md`, `specs/accessibility-conformance.md`, `specs/compliance-docs-kit.md`, `specs/observability-logging.md`, `specs/storage-emulator-rules-tests.md` (remoção), `docs/features/storage-emulator-rules-tests/spec.md`, `docs/features/storage-emulator-rules-tests/analyze/plan.md`. Stage com `git add -A specs/storage-emulator-rules-tests.md docs/features/storage-emulator-rules-tests/ specs/BACKLOG.md specs/accessibility-conformance.md specs/compliance-docs-kit.md specs/observability-logging.md`. |
| 15 | `docs(features): accessibility-conformance` | `docs/features/accessibility-conformance/STATE.md`, `docs/features/accessibility-conformance/analyze/plan.md`, `docs/features/accessibility-conformance/develop/handoff.md`, `docs/features/accessibility-conformance/review/review.md`, `docs/features/accessibility-conformance/test/criterios-aceite.md`, `docs/features/accessibility-conformance/test/report.md` (os screenshots de `test/e2e/` ficam de fora pelo `.gitignore`) |

Nos commits 3 a 5, `...` é `packages/design-system/components/form/hookform/`.

**Título de PR sugerido:** `fix: accessibility conformance with an empty axe allowlist`.

Depois do último commit aprovado, o `/review` pergunta se sincroniza com
`git push -u origin feat/accessibility-conformance`.

### Commits realizados

(preenchido pelo orquestrador)

## Rodada 2: hover do "Excluir" no `ActionsMenu`

Primeira de duas rodadas de vai e volta entre `/test` e `/review`.

### Defeito

O `/test` mediu, com estilo computado e cor lida em canvas: com o cursor sobre "Excluir", o `li` fica certo
(texto `--background` sobre `--destructive`, 4,77:1 no claro e 6,85:1 no escuro), mas os filhos
`span.ant-dropdown-menu-title-content` e `span.anticon` continuam em `var(--color-destructive)`. Texto e
ícone ficam da cor do fundo, 1:1 nos dois temas.

**É erro deste diff.** As regras que pintam os filhos já existiam no `globals.css`, mas antes o fundo do
hover era `#000000` (o seed token resolvido para preto) e o vermelho aparecia por cima. O override
`components.Dropdown` do `antd-app.tsx` trocou o fundo do hover para `--destructive`, e aí as duas regras
passaram a esconder o rótulo. A rodada 1 desta revisão também errou: aprovou o override lendo só o CSS do
antd e não olhou as regras do `globals.css` que miram o mesmo item. O `actionMenu.test.tsx` não pegou porque
lê só o CSS injetado pelo antd, e o `jsdom` não carrega o `globals.css`.

### Correção

`packages/design-system/styles/globals.css`, bloco do item `danger`:

```css
/* antes */
html .ant-dropdown .ant-dropdown-menu-item-danger,
html .ant-dropdown .ant-dropdown-menu-item-danger .ant-dropdown-menu-title-content {
    color: var(--color-destructive);
}
html .ant-dropdown .ant-dropdown-menu-item-danger .anticon {
    color: var(--color-destructive);
}

/* depois */
html .ant-dropdown .ant-dropdown-menu-item-danger {
    color: var(--color-destructive);
}
html .ant-dropdown .ant-dropdown-menu-item-danger .ant-dropdown-menu-title-content,
html .ant-dropdown .ant-dropdown-menu-item-danger .anticon {
    color: inherit;
}
```

O `li` continua com `--destructive` como primeira pintura, antes do CSS do antd chegar. Os filhos herdam do
`li`. A regra ganhou um comentário de duas linhas dizendo por que os filhos não podem ter cor própria: a
interação com o hover do antd não aparece lendo o `globals.css`. A hipótese do QA era essa; trocar por
`inherit` em vez de apagar deixa a intenção explícita e dá ao teste uma regra para travar.

### Medição sem subir app

Seletores que o antd injeta, lidos no `jsdom` com o `AntdAppProvider` real (sonda temporária, apagada depois):

| Regra | Especificidade | Declaração |
|-------|----------------|------------|
| antd, repouso: `.ant-dropdown .ant-dropdown-menu .ant-dropdown-menu-item.ant-dropdown-menu-item-danger:not(.ant-dropdown-menu-item-disabled)` | (0,5,0) | `color: var(--color-destructive)` |
| antd, hover: a mesma com `:hover` | (0,6,0) | `color: var(--color-background); background-color: var(--color-destructive)` |
| `globals.css`: `html .ant-dropdown .ant-dropdown-menu-item-danger` | (0,2,1) | `color: var(--color-destructive)` |
| `globals.css`: filhos do `danger` | (0,3,1) | `color: inherit` |
| antd: `.anticon` | (0,1,0) | `color: inherit` |

- A regra do `li` no `globals.css` perde para as duas do antd. Em repouso o valor é o mesmo; no hover o antd
  manda, e é o que o QA já tinha medido no `li`.
- O antd não põe cor no `title-content` (só no `> a`, com `inherit`), e o `.anticon` dele já é `inherit`.
  Com os filhos em `inherit`, o repouso dá `--destructive` e o hover dá `--background`, que são os números
  do `li` (4,77:1 e 6,85:1).
- O item com foco de teclado (`-active`, sem `:hover`) continua `--destructive` sobre `--accent`, como antes
  deste diff. No claro isso dá 4,38:1, par já listado no §12.2 do plano; fica no backlog.
- A mesma sonda mostrou `.ant-popconfirm-message-icon .anticon { color: #000000 }`: é o seed token virando
  preto, o achado do handoff sobre `colorWarning`. Fora do corte, já registrado.

### Teste e mutação

`packages/design-system/__tests__/actionMenu.test.tsx`, caso novo "lets the danger item's text and icon
inherit the item colour": lê o `globals.css` como texto, sem comentários, confirma que a regra do próprio
item `danger` existe (para o teste não passar vazio se o parser quebrar) e exige que toda declaração `color`
de um seletor descendente de `.ant-dropdown-menu-item-danger` seja `inherit`.

- Mutação 1, só trocar `inherit` por `var(--color-destructive)`: o teste cai (`Received ["var(--color-destructive)"]`).
- Mutação 2, restaurar o bloco inteiro do `HEAD`: o teste cai (dois valores `var(--color-destructive)`).
- Restaurado a partir da cópia salva: 4/4 no arquivo, 45/45 no pacote.

O teste não prova a cor pintada. Isso continua sendo do `/test`.

### Outros achados do `/test`: regressão ou pré-existente

| Achado | Veredito |
|--------|----------|
| "Excluir" pelo teclado fecha o menu sem abrir o `Popconfirm` | Pré-existente e agora exposto. Antes o gatilho era um `div` e o menu nem abria pelo teclado. Backlog. |
| Gatilho sem `aria-haspopup`/`aria-expanded` | Pré-existente (o antd não põe no filho). Backlog. |
| "Excluir" com foco de teclado no claro, 4,38:1 | Pré-existente (`--destructive` sobre `--accent`, §12.2). Backlog. |
| `RadioGroup` de gênero sem `aria-labelledby` | Pré-existente. O `id` que o `FormControl` novo põe na raiz não tem `label` apontando para ele (o `RadioGroupInput` usa `Label` sem `htmlFor`, e o `HookFormRadioGroup` não usa `FormLabel`), então o nome do grupo não mudou com este diff. Backlog. |
| 404 sem `document.title` | Pré-existente, fora dos layouts do painel. Backlog. |
| Menu mobile da web sem nome | Pré-existente, já anotado na rodada 1. Backlog. |
| `Button` em carregamento encolhe | Pré-existente: o QA mediu que o salto já existia antes do diff. Backlog. |
| CTA "Entrar" levando a `/contact` | Pré-existente, destino igual ao de antes. Backlog. |

Nenhum deles vai para código nesta rodada.

### Lacunas de teste depois do `/test`

| Lacuna | Veredito |
|--------|----------|
| `Select` mobile do navbar | Fechada pelo `/test` (cenário novo em `panelNavbarControls.test.tsx`). |
| `generateMetadata` dos layouts | Fechada pelo `/test` (`panelLayoutTitle.test.ts`). |
| `NotFoundPage` | Fechada pelo `/test` (`notFoundPageHomeLink.test.tsx`). Links da web continuam sem teste de componente, cobertos pelo axe da E2E. |
| Cor dos filhos do item `danger` | Fechada aqui (teste novo em `actionMenu.test.tsx`). |

### Gates da rodada 2

| Comando | Resultado |
|---------|-----------|
| `pnpm check` | 792 arquivos, nenhum erro. |
| `pnpm turbo run typecheck test --filter=@repo/design-system` | 5 tasks ok (3 do cache); `@repo/design-system:test` 45/45. |

Não rodei `app`, `web` nem `e2e`: esta rodada só mexeu no design system, e os números deles são os do
`/test` (`app:test` 702 com os testes novos, `pnpm e2e` 22/22).

### Verificar no `/test` (residual)

1. "Excluir" do `ActionsMenu` em `/pt-br/entities` e `/pt-br/admin/users`, claro e escuro, cor computada do
   `li`, do `span.ant-dropdown-menu-title-content` e do `span.anticon`:
   - repouso: os três em `--destructive` sobre o fundo do popover (esperado 4,77:1 no claro e 6,85:1 no escuro);
   - hover: os três em `--background` sobre `--destructive` (esperado 4,77:1 e 6,85:1). Nada em 1:1.
2. "Editar" no mesmo menu, repouso e hover: texto e ícone em `--foreground`, sem mudança.

