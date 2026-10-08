# Handoff do `/develop`: cores-semente do antd deixam de virar `#000000`

Implementação do blueprint da §13 do plano, em `packages/design-system`. Nenhuma mudança em SDK, API, i18n,
variável de ambiente ou dependência. Nada foi commitado; tudo está no working tree da branch
`guilhermebittelbrunn/cycle`.

## Blueprint → arquivos

| Item do blueprint | Arquivo | O que mudou |
|-------------------|---------|-------------|
| 13.1 provider | `packages/design-system/providers/antd-app.tsx` | `antdSeedColors` (hex por tema, exportado), `keepSeedColors: MappingAlgorithm`, `antdThemes.light`/`antdThemes.dark` montados uma vez no módulo, componente escolhe pelo `useTheme().resolvedTheme`. Escuro com `[darkAlgorithm, keepSeedColors]`. `colorPrimaryBorder` = primário. `Button.primaryColor: "var(--color-primary-foreground)"`. Saiu o `Dropdown.colorError` e o comentário dele. Saiu o JSDoc antigo do componente |
| 13.2 token `--warning` | `packages/design-system/styles/globals.css` | `--warning` em `:root` (`oklch(0.555 0.163 48.998)`) e `.dark` (`oklch(0.828 0.189 84.429)`), `--color-warning` no `@theme inline` |
| T1, T2 | `packages/design-system/__tests__/antdTheme.test.tsx` (novo) | 10 testes: sementes por tema via `getDesignToken`, contraste ≥ 3:1 de `colorPrimaryBorder`/`colorPrimary`/`colorWarning`, degraus escuros no dark, provider ligado ao `resolvedTheme` (`dark`, `light`, `undefined`), botão primário sólido com `--primary-foreground` no escuro, hidratação |
| T3 | `packages/design-system/__tests__/themeContrast.test.ts` | pares `warning`/`background` nos dois temas; `describe("antd seed colours mirror globals.css")` com 8 casos (4 sementes × 2 temas) |
| T4 | `packages/design-system/__tests__/actionMenu.test.tsx` | a asserção do item `danger` passa de `var(--color-destructive)` para `antdSeedColors.light.destructive` (`#e7000b`), em repouso e no hover. Continua exata |

## Contrato e raio de impacto

Sem DTO nem action. O módulo `providers/antd-app.tsx` passa a exportar `antdSeedColors` e `antdThemes`, além
do `AntdAppProvider`. Hoje só os testes importam os dois exports novos. O `AntdAppProvider` continua sendo
usado só por `packages/design-system/index.tsx` (`DesignSystemProvider`), que `apps/app` e `apps/web` montam.

Códigos de erro novos: nenhum. Chaves de i18n novas: nenhuma.

## Conferência das decisões do plano

O pedido era corrigir o plano onde ele estivesse errado. Nas três afirmações conferidas, ele estava certo:

1. **`keepSeedColors` faz o que o plano diz.** O `Theme.getDerivativeToken` do cssinjs aplica os algoritmos em
   sequência, passando o mesmo seed e o mapa anterior (`Theme.js`, `reduce` em `derivative(token, result)`).
   Medido com `theme.getDesignToken(antdThemes.dark)`: `colorPrimary #fafafa`, `colorError #ff6467`,
   `colorErrorBg #2c191a`, `controlItemBgActive #595959`, `colorPrimaryHover #e8e8e8`,
   `colorPrimaryActive #aaaaaa`, nenhum token `#000000`. Sem o `keepSeedColors` (mutação M2) o teste do
   escuro falha.
2. **Primeiro render.** Lido no `next-themes` 0.4.6 instalado (`dist/index.mjs`): no servidor o
   `resolvedTheme` é `undefined` e o provider usa o claro; no cliente o `useState` inicial já lê
   `localStorage` e `matchMedia`, então o primeiro render do cliente já tem o tema resolvido. Para não deixar
   isso só na leitura, escrevi o teste "hydrates server markup rendered before the theme resolves":
   `renderToString` com `resolvedTheme` `undefined` (um `Table` e um `ActionsMenu` dentro do provider) e
   `hydrateRoot` com `"dark"`. Resultado: `onRecoverableError` vazio e nenhum `console.error` com "hydrat". A
   mutação M6 (pôr no markup um `<span data-mode={resolvedTheme}>`) faz esse teste falhar, o que mostra que
   ele pega divergência de markup. Flash visual no navegador não foi medido (ver "A verificar no `/test`").
3. **Hex contra o OKLCH do `globals.css`.** Convertidos com a mesma OKLab → sRGB do `themeContrast.test.ts`
   (script em `/tmp` e depois o teste de paridade, 8/8): `#171717`, `#fafafa`, `#e7000b`, `#ff6467`,
   `#007a55`, `#bb4d00`, `#ffb900`, todos iguais aos do plano.

## Desvios em relação ao plano

Nenhum desvio de decisão. Diferenças de execução:

- **JSDoc do componente removido, não reescrito.** O JSDoc antigo dizia que o provider "reativa o efeito de
  onda". O `wave` já vem ligado por padrão no antd 5, então reescrever a frase seria afirmar algo que não
  medi. A prop `wave={{ disabled: false }}` ficou como estava.
- **`keepSeedColors` com as seis chaves escritas à mão**, sem `seedColorKeys` + `Object.fromEntries`. O plano
  deixava essa opção em aberto; assim o retorno fica tipado sem cast.
- **Dois testes além do plano.** O de hidratação (item 2 acima) e "dark: the solid primary button keeps the
  primary foreground as text", que lê o CSS injetado e cobra `color:var(--color-primary-foreground);background:#fafafa;`.
  Sem ele, tirar o `Button.primaryColor` (mutação M8) passava na suíte e o "Sim" voltava a ser branco sobre
  `#fafafa`.
- **T1 também cobra `colorPrimaryBorder === antdSeedColors[mode].primary`**, além do contraste ≥ 3:1. Por isso
  a M3 derruba o teste nos dois temas, e não só no escuro como o plano previa.

## Vermelho registrado antes da correção

O T2 foi escrito antes de mexer no provider e rodado contra o código antigo:
`npx vitest run __tests__/antdTheme.test.tsx` → 3 de 3 falharam, os três com
`Received: "#000000 #000000 #000000"` (`colorPrimary`, `colorError`, `colorLink`), nos casos `dark`, `light` e
`undefined`.

## Mutações

Cada mutação aplicada no provider, rodada contra `antdTheme.test.tsx`, `themeContrast.test.ts` e
`actionMenu.test.tsx`, e revertida. Depois de cada reversão, `diff` contra a cópia de `/tmp` saiu idêntico.

| # | Mutação | Testes que falharam |
|---|---------|---------------------|
| M1 | `colorPrimary` do escuro = `"var(--color-primary)"` | 3: provider `dark`; `dark: every seed colour…`; `dark: focus outline…` |
| M2 | escuro só com `[darkAlgorithm]` | 2: provider `dark`; `dark: every seed colour…` |
| M3 | sem `colorPrimaryBorder` | 2: `light: focus outline…`; `dark: focus outline…` |
| M4 | `warning` escuro `#ffb900` → `#ffb800` | 1: `dark: --warning in globals.css is the antd seed #ffb800` |
| M5 | provider sempre `antdThemes.light` | 1: provider `dark` |
| M6 | markup depende do `resolvedTheme` | 1: `hydrates server markup…` |
| M7 | escuro com `defaultAlgorithm` | 1: `dark derives dark background steps…` |
| M8 | sem `Button.primaryColor` | 1: `dark: the solid primary button…` |

## Validação (sem `--force`)

| Gate | Comando | Resultado |
|------|---------|-----------|
| Testes do pacote | `pnpm --filter @repo/design-system test` | 7 arquivos, 80 testes, todos passando |
| Typecheck do pacote | `pnpm --filter @repo/design-system typecheck` | exit 0 |
| Typecheck dos consumidores | `tsc --noEmit -p .` em `apps/app` e `apps/web` (o mesmo comando do script `typecheck`) | exit 0 nos dois |
| Testes dos consumidores | `pnpm --filter app test` / `pnpm --filter web test` | 102 arquivos e 826 testes / 14 arquivos e 87 testes, todos passando |
| Lint | `pnpm check` | 861 arquivos, sem erro |
| i18n | não se aplica | nenhuma chave tocada |

Por que o typecheck dos apps rodou fora do turbo: `pnpm turbo run typecheck --filter=app --filter=web` voltou
`2 cached, 2 total` em 342 ms. O `--dry=json` da task `app#typecheck` mostra `dependencies: []` e 0 de 289
inputs vindos de `packages/design-system`, porque o `turbo.json` declara `typecheck.dependsOn: []`. Ou seja, o
cache do typecheck de um app não muda quando um pacote interno muda, e aquele HIT não dizia nada sobre este
diff. Rodei o `tsc` direto, sem `--force`. Fica como achado para o backlog (abaixo).

Smoke local: não subi app nem browser. O comportamento coberto aqui foi medido no nível de token e de CSS
injetado no jsdom.

## A verificar no `/test`

Nada abaixo foi medido no navegador. São os passos da §9 do plano, com o que este handoff já cobre e o que
falta:

1. **Confirmação de exclusão do `ActionsMenu`**: cor computada do ícone de alerta (`#bb4d00` claro, `#ffb900`
   escuro), fundo e texto do "Sim" em repouso, hover e pressionado, nos dois temas e nos três idiomas. Aqui só
   os tokens foram medidos (`colorWarning`, `colorPrimary*`) e a regra CSS do botão sólido no escuro.
2. **Anel de foco**: `outline-color` real nos botões "Não"/"Sim" e nos números da paginação, contra o fundo
   do painel. Aqui só `colorPrimaryBorder` foi medido.
3. **Item `danger` no escuro**: o teste de CSS injetado roda sem `ThemeProvider`, logo só no claro. No escuro só
   o token `colorError #ff6467` está coberto. Conferir texto em repouso e fundo/texto no hover e no foco.
4. **Paginação e spinner da `Table` no escuro**: borda da página ativa e indicador ao clicar em "Atualizar".
5. **Troca de tema com a página aberta** (claro → escuro → claro, sem recarregar): se o CSS do tema anterior
   some e as cores do passo 1 acompanham. A leitura do cssinjs no plano (§1.6, item 4) não foi medida.
6. **Recarregar já no escuro**: aviso de hidratação no console e flash de cor nos componentes antd. O teste de
   hidratação cobre só divergência de markup no jsdom, não o navegador.
7. **Área admin** (`/admin/users`): passos 1 e 4 no escuro.

## Lacunas de teste conhecidas

- Contraste real no navegador (passos 1 a 4 acima). Os testes calculam contraste a partir de token, não de cor
  computada.
- Troca de tema em tempo de execução (passo 5): nenhum teste Vitest cobre a remoção dos `<style>` do tema
  anterior.
- Item `danger` com o tema escuro no nível de CSS injetado.

## Achados para o backlog (não resolvidos aqui)

- Os quatro itens da §13.4 do plano continuam abertos: aliases `controlOutline`/`colorErrorOutline`/
  `colorWarningOutline` calculados sobre `var(...)`; `colorPrimaryBg`/`controlItemBgActive` cinza médio
  (`#575757` claro, `#595959` escuro, medido); `--success` a 3,69:1 no escuro; comentário de
  `globals.css:288-290` impreciso.
- Novo: `turbo.json` com `typecheck.dependsOn: []` faz o typecheck de `apps/app` e `apps/web` sair do cache
  depois de uma mudança em `packages/*` (medido acima: 0 inputs do design-system no hash de `app#typecheck`).
  O `/review` deve decidir se vira entrada no `BACKLOG.md`. Não mexi no `turbo.json`, que está fora do escopo.

## Pendências e bloqueios

Nenhum bloqueio. Pré-requisitos manuais de infra: nenhum. O `specs/BACKLOG.md` já estava modificado antes desta
etapa e não foi tocado.
