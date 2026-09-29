# Handoff do `/develop`: acessibilidade com allowlist do axe zerada

Plano: [`analyze/plan.md`](../analyze/plan.md). Rodada autônoma do `/cycle`; nada foi perguntado ao usuário.
Nenhuma branch criada, nenhum commit.

## Desvio que corrige o plano (leia primeiro)

**O override do `Dropdown` do antd como estava no plano quebrava o hover do item "Excluir" no escuro.** O
plano partia de que o item `danger` é pintado com `colorError` = vermelho do tema. Medi o CSS que o antd
injeta (teste no `jsdom` com o `AntdAppProvider` real) e o valor é outro: o antd passa todo *seed token*
(`colorPrimary`, `colorError`, `colorSuccess`, `colorWarning`, `colorInfo`, `colorLink`) pelo algoritmo de
paleta, que não entende `var(--...)` e devolve `#000000`.

- Instrumento: `theme.getDesignToken({ token: { colorError: "var(--color-destructive)", … } })` devolveu
  `colorPrimary`, `colorError`, `colorSuccess`, `colorWarning` e `colorLink` = `"#000000"`, e `colorText` =
  `"var(--color-foreground)"` (alias token passa intacto).
- CSS injetado antes do conserto: repouso `color:#000000`; hover `color:<colorTextLightSolid>;background-color:#000000`.
- Consequência: hoje o "Excluir" é preto sobre o popover escuro em repouso (defeito que o axe não pega porque
  a suíte não abre o menu). Com só o `colorTextLightSolid: var(--color-background)` do plano, o hover no escuro
  viraria quase preto sobre preto.

Conserto aplicado em `providers/antd-app.tsx`: `components.Dropdown` recebe `colorError:
"var(--color-destructive)"` **e** `colorTextLightSolid: "var(--color-background)"`. Override de token global
no nível do componente não passa pelo algoritmo. CSS injetado depois do conserto (mesmo instrumento):

- repouso: `color:var(--color-destructive);`
- hover: `color:var(--color-background);background-color:var(--color-destructive);`

O teste `actionMenu.test.tsx` ("paints the danger item…") trava as duas regras; tirar o `colorError` do
override faz ele falhar (mutação rodada). O par de cores é coberto pelo `themeContrast.test.ts`.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| 8.1 task `test` no design system | `packages/design-system/package.json` (script `test` + 7 devDependencies), `packages/design-system/vitest.config.mts`, `pnpm-lock.yaml` |
| 5.1/10.1 `Controller` → `FormField` | os 7 `components/form/hookform/hookform{Input,InputPassword,Select,DateInput,ImageUpload,RadioGroup,Textarea}.tsx` |
| 10.3 `FormControl` nos compostos | `hookformDateInput.tsx`, `hookformTextarea.tsx`, `hookformRadioGroup.tsx`, `hookformImageUpload.tsx`; `ui/date-input.tsx` e `ui/image-upload-input.tsx` aceitam `aria-describedby`; `ui/textarea-input.tsx` com `data-slot` depois do spread |
| 10.4 `Select` repassa `aria-*` | `ui/select/index.tsx` |
| 10.2 senha | `hookformInputPassword.tsx` (`FormControl` só no `Input`, `aria-label` do toggle por `dictionary.components.inputPassword`) |
| 10.5 `Button` em carregamento | `ui/button.tsx` |
| 10.6 `ActionsMenu` | `ui/action-menu.tsx` (`<button type="button">` com `aria-label`, anel de foco, `autoFocus` no `Dropdown`) |
| 10.6 tokens e antd | `styles/globals.css` (`--muted-foreground` claro 0.54, `--destructive` escuro do upstream), `providers/antd-app.tsx` (ver desvio acima) |
| 8.2 testes do design system | `packages/design-system/__tests__/{hookformAria,hookformInputPassword,imageUploadInput,button,actionMenu}.test.tsx`, `themeContrast.test.ts` |
| 10.8 `apps/app` | `(common)/layout.tsx` e `(admin)/admin/layout.tsx` (`generateMetadata`), `PanelNavbarControls.tsx` (2 `aria-label`), `EntitiesListClient.tsx`, `UsersListClient.tsx`, `ProfileDropdown.tsx` (`alt=""`), `NotFoundPage.tsx` |
| 8.3 testes do `apps/app` | `__tests__/entitiesListReadOnly.test.tsx`, `__tests__/usersListArchiveLabels.test.tsx`, `__tests__/panelNavbarControls.test.tsx` |
| 10.9 `apps/web` | `(home)/components/{hero,cta,faq}.tsx`, `pricing/page.tsx`, `contact/components/contact-form-client.tsx` |
| 8.3 `apps/e2e` | `a11y/allowlist.ts` (vazia), `tests/entityCrud.spec.ts` (gatilho por papel e nome), `support/signIn.ts` (comentário falso removido) |
| 10.7 i18n | `translations/components/ui/input-password.ts` (novo), `components/index.ts`, `components/ui/action-menu.ts`, `apps/app/pages/common/entities.ts`, `apps/app/pages/admin/users.ts` |
| 10.10 docs | `AGENTS.md`, `packages/CLAUDE.md`, `docs/SETUP.md` |

## Contrato

Sem SDK e sem API. Mudança de props públicas do design system, todas opcionais e aditivas:

- `SelectProps` ganha `aria-describedby` e `aria-invalid`.
- `DateInputProps` e `ImageUploadInputProps` ganham `aria-describedby`.
- `Button` com `loading` passa a renderizar os filhos em `sr-only` e publica `aria-busy`. Quem consome:
  qualquer `Button loading` do repo (formulários de auth, `Footer`, checkout).
- `ActionsMenu`: o gatilho virou `<button>`. Um `className` passado pelo chamador agora cai num botão.

## Códigos de erro

Nenhum `error.code` novo, nenhuma entrada em `apiErrors`.

## Chaves de i18n (3 idiomas)

`components.inputPassword.{show,hide}`, `components.actionMenu.trigger`,
`apps.app.pages.common.entities.list.enabledToggle`, `apps.app.pages.admin.users.list.statusToggle`.
Paridade: `pnpm --filter @repo/internationalization test` → 59 testes passam (incluindo `parity.test.ts`).

## Outros desvios

1. **Links da web mantêm a estrutura interna do `Button`.** O plano punha o ícone como filho direto do `Link`.
   Envolvi ícone e texto num `<span className="flex items-center gap-2">`, que é o que o `Button` renderizava
   por dentro. Com o `svg` como filho direto, a regra `has-[>svg]:px-*` do `buttonVariants` trocaria o padding
   e o `gap-4` do chamador passaria a valer entre ícone e texto. O `{" "}` que sobrava no fim do texto saiu.
2. **`generateMetadata` tipado com `Pick<AppLayoutProperties, "params">`**, não com o tipo inteiro do layout,
   porque o Next chama a função sem `children`.
3. **Um comentário novo no código** (`antd-app.tsx`, 3 linhas), explicando por que o `Dropdown` repete o
   `colorError`. É a exceção de restrição de biblioteca da regra de comentários.
4. **Supressão de lint** em `themeContrast.test.ts`: `biome-ignore-all lint/style/noMagicNumbers`, com motivo.
   As matrizes OKLab → sRGB são constantes publicadas; nomear cada coeficiente esconderia a referência.
5. **JSDoc no `A11Y_ALLOWLIST`** dizendo que ela fica vazia e quando uma entrada é aceitável. É a mesma regra
   que entrou no `docs/SETUP.md`.
6. **Lockfile**: `pnpm install --offline` (nenhum download). Além das arestas novas do importer
   `packages/design-system`, o pnpm deduplicou cinco pacotes para versões que **já estavam** no lockfile
   (`baseline-browser-mapping` 2.10.10, `magic-string` 0.30.19, `fdir` 6.5.0, `picomatch` 4.0.3, `ws` 8.21.3;
   conferido com `git show HEAD:pnpm-lock.yaml | grep -c`) e o peer `@babel/core` apareceu na chave do `next`
   usado pelo `geist`. Diff: +29/−55 linhas. Nenhuma dependência nova no repositório.
7. Nenhum `vitest.setup.ts`: o antd rodou no `jsdom` sem stub de `matchMedia`.

## Validação (comando → resultado)

- `pnpm --filter @repo/design-system test` → 6 arquivos, 44 testes passam.
- `pnpm turbo run typecheck test --filter=app --filter=web --filter=@repo/design-system --filter=@repo/internationalization --filter=e2e`
  → 16 tasks ok; `app:test` 690, `web:test` 82, `e2e:test` 16, `@repo/design-system:test` 44,
  `@repo/internationalization:test` 59.
- `pnpm check` → 790 arquivos, nenhum erro.
- Contraste dos tokens (mesma conversão do `themeContrast.test.ts`, feita também em script avulso): claro
  `muted-foreground`/`muted` 4,34 → 4,64; escuro `destructive`/`background` 1,97 → 6,84; escuro
  `destructive`/`accent` 5,23; `background` sobre `destructive` 4,76 (claro) e 6,84 (escuro). São números de
  conversão oklch → sRGB com clip de gamut, não do navegador.
- Mutações rodadas à mão e revertidas, cada uma derruba pelo menos um teste: `HookFormInput` de volta a
  `Controller`; `Select` e `DateInput` sem repassar `aria-describedby`; `HookFormRadioGroup` sem `FormControl`;
  `ImageUploadInput` só com `hintId`; `Button` sem o `sr-only`; gatilho de volta a `<div>`; toggle sem
  `aria-label`; os dois tokens de volta ao valor antigo (4 casos falham); `Dropdown` sem o `colorError`.

Não rodei `pnpm e2e`, `agent-browser` nem build de produção.

## A verificar no `/test`

- **Allowlist vazia passa**: `pnpm e2e` (claro e escuro), sem falha e sem `a11y-stale-exception`. Inclui o
  `<title>` agora exigido pelo `document-title` nas rotas do painel.
- **`<title>` renderizado**: "Painel do usuário | <marca>" e "Administração | <marca>" em `/pt-br`, `/en`, `/es`,
  inclusive nas páginas `"use client"` (`entities/create`, `admin/users/create`, `admin/users/edit/[id]`).
  Repro: `document.title` em cada rota.
- **Contraste no estilo computado**: mensagem de erro no escuro, iniciais do avatar e cards da landing no claro,
  `Button` destrutivo do `AccountPrivacyPanel` no escuro (branco sobre `bg-destructive/60`; meu cálculo de
  mistura dá 6,48:1, aproximado).
- **Item "Excluir" do `ActionsMenu`**, em repouso e com o cursor em cima, claro e escuro: ler `color` e
  `background-color` computados. Esperado: repouso vermelho do tema; hover texto na cor do fundo sobre o
  vermelho.
- **`autoFocus` do `Dropdown`**: abrir pelo teclado (Tab até o gatilho, Enter) e conferir se o foco entra no
  menu, se as setas andam e se Esc devolve o foco ao gatilho. Abrir com o mouse também move o foco para o
  menu (o `rc-dropdown` chama `focus()` no overlay ao abrir); conferir que isso não atrapalha. Se atrapalhar,
  tirar o `autoFocus`.
- **Nome acessível do botão em carregamento** num leitor real ou na árvore do Chrome: login com rede lenta,
  "Entrar" com `aria-busy="true"`. No `jsdom` o nome sai do `sr-only` (teste `button.test.tsx`), mas o `jsdom`
  não aplica CSS.
- **Erro de campo pela árvore de acessibilidade** no `apps/app` (criar entidade) e na `apps/web` (cadastro com
  senha curta), inclusive o `Select` de tipo.
- **Regressão visual** do `sr-only` no `Button` em carregamento (largura não deve mudar), dos links da web
  (hero, CTA, FAQ, preços) e do gatilho do menu (agora `<button>`; o preflight do Tailwind deveria zerar
  borda e fundo nativos, conferir em claro e escuro).
- **Seletor de data do contato** com um único botão focável depois do `PopoverTrigger asChild`.
- **Avatar enviado sem `image-alt`** no menu de perfil.

## Lacunas de teste conhecidas

- O `Select` mobile do navbar (`useIsMobile` → `true`) não tem asserção de `aria-label`; o mock do teste fixa
  `false`.
- Nenhum teste do `generateMetadata` dos layouts; quem prova é o E2E.
- `NotFoundPage` e os links da web não têm teste de componente.

## Achados fora do corte (para o backlog)

- **Seed tokens do antd como variável CSS viram `#000000`** (`providers/antd-app.tsx:17-21`, `36-38`):
  `colorPrimary`, `colorSuccess`, `colorWarning`, `colorInfo`, `colorLink` e o `colorError` global. Qualquer
  componente antd que pinte com eles usa preto nos dois temas. Aqui só o `Dropdown` foi corrigido. Caminhos
  possíveis: `cssVar` do antd ou override por componente onde o antd é usado.
- Os achados do §12.2 do plano continuam abertos (nomes literais em inglês nos primitivos shadcn e seletores de
  idioma, `<title>` por página, `disabled={loading}` antes do spread, `placeholder` fixo do campo de senha,
  `--destructive` claro sobre `--muted`, tokens `Menu.dangerItem*` sem efeito no `Dropdown`).
- A dica do `TextareaInput` (`hint`) não tem id e não entra no `aria-describedby`.
- No contato, `<Label htmlFor="date">` aponta para um id que nenhum elemento tem.
