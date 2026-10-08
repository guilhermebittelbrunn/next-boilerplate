# Revisão: cores-semente do antd deixam de virar `#000000`

Revisão do diff em `packages/design-system` feita em rodada autônoma do `/cycle`. Nada foi commitado nem
pushado. A revisão leu código (inclusive `next-themes` 0.4.6, `@ant-design/cssinjs` 1.24.0 e `antd` 5.29.3 em
`node_modules`) e rodou só os gates estáticos.

## Branch

- **Nome:** `design-system/fix/antd-theme-seed-colors`.
- **Criada** nesta etapa com `git switch -c`, a partir de `guilhermebittelbrunn/cycle`. Essa branch não tinha
  commit próprio (`git log origin/main..HEAD` vazio, base `0a49a3b`) nem upstream, e o nome dela não passa no
  regex do repo. O working tree veio junto; o índice estava vazio (`git diff --cached --stat` sem saída).
- **Regex de validação:** `branch OK: design-system/fix/antd-theme-seed-colors`.
- A branch `guilhermebittelbrunn/cycle` continua existindo, apontando para o mesmo `0a49a3b`. Não foi
  renomeada porque é a branch do workspace do Conductor.

## Revisão: `packages/design-system` (provider do antd, `--warning`, testes)

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `packages/design-system/providers/antd-app.tsx:145-150`: o provider escolhia o tema só pelo `resolvedTheme`.
  No `next-themes` 0.4.6 o `resolvedTheme` ignora o `forcedTheme`: ele vem de `theme === "system" ? systemTheme
  : theme` (`dist/index.mjs`), enquanto a classe do `<html>` recebe `forcedTheme ?? theme`. O
  `DesignSystemProvider` repassa todas as props ao `ThemeProvider` (`packages/design-system/index.tsx:42`),
  então um fork que force um tema numa página teria as sementes do tema salvo pelo usuário sobre o CSS do tema
  forçado: primário `#171717` sobre `#0a0a0a`, ou `#fafafa` sobre branco. Hoje nenhum app passa `forcedTheme`.
  O `/code-review` achou o mesmo ponto de forma independente. **Corrigido:** `forcedTheme ?? resolvedTheme`,
  com um comentário de uma linha sobre o comportamento do `next-themes`.
- `turbo.json:11-14` (fora do escopo, vai para o backlog): `typecheck.dependsOn: []` faz o hash de
  `app#typecheck` ignorar os pacotes internos. Remedido aqui com `pnpm turbo run typecheck --filter=app
  --dry=json`, com o diff do design-system no working tree: `dependencies: []`, 289 inputs, 0 de
  `packages/design-system`, cache `HIT`. Para comparação, `app#test` tem 10 dependências. O efeito fica restrito
  ao terminal: o `ci.yml` não guarda cache do turbo (só pnpm, emuladores e Playwright), então o CI roda o
  typecheck de verdade. Quem roda `pnpm --filter app typecheck` também não é afetado, porque o pnpm chama o
  `tsc` direto. O problema aparece só em `pnpm turbo run typecheck` e na linha de gates do `CLAUDE.md`, que
  pode sair verde no terminal e vermelha no CI depois de uma mudança em `packages/*`. Correção provável:
  `"dependsOn": ["^typecheck"]` ou o padrão `transit` da documentação do turbo. Não mexi.

### 🟢 Sugestão / nit

- `packages/design-system/hooks/useAlert.ts:12`: mesmo padrão do `resolvedTheme` sem `forcedTheme`, no tema
  do toast. Não é desta entrega; vai para o backlog junto com o achado acima.
- Os quatro achados da §13.4 do plano seguem abertos e vão para o backlog como estão: aliases
  `controlOutline`/`colorErrorOutline`/`colorWarningOutline` calculados sobre `var(...)`;
  `colorPrimaryBg`/`controlItemBgActive` cinza médio (`#575757` claro, `#595959` escuro), que aparece no
  seletor de tamanho da paginação da `/admin/users` (`showSizeChanger: true` em `UsersListClient.tsx:195`);
  `--success` a 3,69:1 no escuro; comentário de `globals.css:291-294` impreciso depois desta tarefa.

### ✅ OK

- **`keepSeedColors` encadeia como o plano diz.** `Theme.getDerivativeToken` do cssinjs faz
  `derivatives.reduce((result, derivative) => derivative(token, result), undefined)` (`theme/Theme.js`), então
  o `keepSeedColors` recebe o mapa do `darkAlgorithm` e o seed original. O valor padrão do segundo parâmetro só
  existe para satisfazer o tipo `MappingAlgorithm`; no uso real ele sempre vem preenchido.
- **`colorPrimaryBorder` sobrevive ao override.** O `formatToken` só descarta do override as chaves de semente
  (`antd/lib/theme/util/alias.js`), e `colorPrimaryBorder` é token de mapa. O foco usa esse token em
  `genFocusOutline` (`antd/lib/style/index.js:118-119`).
- **Primeiro render.** No `next-themes` 0.4.6 a leitura do tema salvo devolve `undefined` no servidor, e no
  cliente o inicializador do `useState` lê o `localStorage`; o `resolvedTheme` inicial do cliente vem do
  `matchMedia` quando o tema é `system`. O servidor renderiza com o claro e o cliente hidrata já com o tema
  resolvido. Sem registro de SSR do antd e com `hashed: false`, o markup não depende do tema, e o teste de
  hidratação do handoff cobre a divergência de markup.
- **Item `danger` sem o override `Dropdown.colorError`.** O estilo vem de `antd/lib/dropdown/style/status.js`:
  texto `colorError`, hover com fundo `colorError` e texto `colorTextLightSolid`. O `colorError` global agora é o
  hex do `--destructive` (`#e7000b`/`#ff6467`), amarrado ao `globals.css` pelo teste de paridade, e o
  `Dropdown.colorTextLightSolid` continua `var(--color-background)`. Repouso e hover pintam o mesmo de antes nos
  dois temas.
- **Botão "Sim".** O `Popconfirm` do `ActionsMenu` usa o `okType` padrão (`primary`, sem `danger`), e o texto
  do botão primário sai de `Button.primaryColor` (`antd/lib/button/style/token.js:45`).
- **Raio de impacto dos componentes antd.** `from "antd"` aparece só em `action-menu.tsx` (`Dropdown`,
  `Popconfirm`), `table.tsx` (`Table`, com `Pagination`, `Spin` e o `Select` do seletor de tamanho) e no
  provider. Nenhum `Switch`, `Checkbox`, `Radio`, `Tag` ou `DatePicker` do antd é usado, então o primário quase
  branco no escuro não tem marca de seleção branca por cima em lugar nenhum do repo. A `Table` do design system
  não expõe filtro de coluna nem `rowSelection`, e nenhum app usa.
- **`--warning` novo.** Só o `globals.css` declara `--warning`/`--color-warning`. Nenhum app redefine
  `--primary`, `--success`, `--warning` ou `--destructive` em outro CSS, então o teste de paridade compara
  contra a única fonte. O `sonner` usa nomes próprios e não colide.
- **Paridade hex × `globals.css`.** O `describe("antd seed colours mirror globals.css")` percorre todas as
  entradas de `antdSeedColors` nos dois temas. Um fork que troque um token sem trocar o hex quebra a suíte com o
  nome do token. `colorInfo` e `colorLink` usam o `primary` e ficam cobertos por tabela.
- **Troca de tema remove o CSS antigo, pela leitura.** O cssinjs conta referências por token
  (`recordCleanToken`/`cleanTokenStyle`, `hooks/useCacheToken.js`) e, quando um token fica sem uso e ainda
  existe outro vivo, remove os `<style>` marcados com ele. Na troca claro → escuro o token claro cai para zero
  com o escuro vivo, então os estilos dele saem. Falta medir no navegador (lista abaixo).
- **Comentários.** Os dois comentários novos do provider explicam restrição do antd (semente em `var()` vira
  preto; o `darkAlgorithm` mistura a semente com `#141414`). Nenhum cita o fluxo.
- **Convenções.** Sem string de UI, sem fetch, sem sessão, nada fora de `packages/design-system`. Os testes
  usam `vi.hoisted` + `vi.mock` antes do `await import`, imports explícitos de `vitest`, sem `toBeInTheDocument`.
- Nenhum documento em `docs/`, `AGENTS.md` ou nos `CLAUDE.md` descreve o provider ou as sementes, então não há
  prosa a corrigir.

### 👁 Verificar no `/test`

Em `pnpm --filter app build && pnpm --filter app start`, como manda a §9 do plano.

1. **Troca de tema sem recarregar** (claro → escuro → claro, confirmação aberta antes e depois). É a afirmação
   de maior risco: a leitura do cssinjs diz que os `<style>` do token anterior saem, mas ninguém mediu. Repro:
   no console, contar `document.querySelectorAll("style[data-token-hash]")` agrupado pelo atributo antes e
   depois de cada troca; conferir que só um valor de `data-token-hash` sobra e que o `getComputedStyle` do
   ícone de alerta e do "Sim" acompanha. Também cabe num Vitest barato: renderizar o provider com
   `resolvedTheme` `"light"`, trocar para `"dark"` com `rerender`, e conferir que nenhum `<style>` ainda contém
   `background:#171717`.
2. **Recarregar já no escuro.** Console sem aviso de hidratação, e a confirmação abre com as cores do escuro.
   Medir também se há flash das cores do claro nos componentes antd: a leitura diz que não (o cliente hidrata
   com o tema resolvido), mas o handoff só cobriu markup no jsdom.
3. **Confirmação do `ActionsMenu`**, nos dois temas: cor computada do ícone (`#bb4d00` claro, `#ffb900`
   escuro), fundo e texto do "Sim" em repouso, hover e pressionado, nos três idiomas. Repro: `getComputedStyle`
   em `.ant-popconfirm-message-icon .anticon` e no `.ant-btn-primary`.
4. **Anel de foco**: Tab até "Não" e "Sim", e até um número da paginação. `outline-color` esperado igual ao
   primário do tema, pelo menos 3:1 contra o painel.
5. **Item `danger` no escuro e pelo teclado.** O `status.js` do antd só estiliza o `:hover` do item `danger`.
   O foco por seta (`ant-dropdown-menu-item-active`) cai na regra genérica `&:hover, &-active` com fundo
   `controlItemBgHover` (`antd/lib/dropdown/style/index.js:213-214`) e texto `colorError`. Qual das duas regras
   ganha no item `danger` com foco depende da ordem do CSS injetado. Medir texto e fundo em repouso, hover e
   foco por seta nos dois temas.
6. **Paginação, spinner e seletor de tamanho no escuro**, em `/entities` e em `/admin/users`: borda da página
   ativa, indicador ao clicar em "Atualizar", e o item selecionado do `Select` de tamanho (achado de backlog no
   claro; anotar o valor medido).
7. **`forcedTheme` (correção desta revisão).** Sem consumidor hoje, então não há o que percorrer no navegador.
   Cobrir com um caso Vitest em `antdTheme.test.tsx`: mock de `useTheme` com `forcedTheme: "dark"` e
   `resolvedTheme: "light"` deve entregar `#fafafa`/`#ff6467`/`#fafafa`.
8. **Suíte do pacote depois da correção.** O provider mudou depois da medição do handoff (80/80). Rodar
   `pnpm --filter @repo/design-system test` de novo. O `/code-review` rodou os três arquivos de teste do diff
   antes da correção (48 testes passando); depois dela, nada foi rodado.

## Correções aplicadas

| Arquivo | Mudança |
|---------|---------|
| `packages/design-system/providers/antd-app.tsx:145-150` | O tema do antd passa a ser escolhido por `forcedTheme ?? resolvedTheme`, com um comentário de uma linha dizendo que o `next-themes` mantém a preferência salva no `resolvedTheme` mesmo com tema forçado |

Antes:

```tsx
const { resolvedTheme } = useTheme();
// ...
theme={antdThemes[resolvedTheme === "dark" ? "dark" : "light"]}
```

Depois:

```tsx
const { forcedTheme, resolvedTheme } = useTheme();
// next-themes keeps the stored preference in resolvedTheme even when a page forces a theme.
const activeTheme = forcedTheme ?? resolvedTheme;
// ...
theme={antdThemes[activeTheme === "dark" ? "dark" : "light"]}
```

Muda comportamento só quando alguém passa `forcedTheme`; os testes atuais mockam `useTheme` sem essa chave e
continuam no mesmo caminho.

## Raio de impacto

Sem DTO, action, rota, `error.code` ou chave de i18n. O módulo `providers/antd-app.tsx` passa a exportar
`antdSeedColors` e `antdThemes`, que só os testes importam. O `AntdAppProvider` continua sendo montado só pelo
`DesignSystemProvider` (`packages/design-system/index.tsx:42-43`), usado por
`apps/app/shared/providers/AppDesignProvider.tsx:32` e `apps/web/app/[locale]/layout.tsx:36`. A `apps/web` não
usa componente antd. Na `apps/app`, mudam de cor a `Table` (paginação, spinner, ordenação, seletor de tamanho na
`/admin/users`) e o `ActionsMenu` (menu e confirmação) em toda listagem.

## Lacunas de teste

| Lacuna (origem) | Veredito |
|-----------------|----------|
| Contraste real no navegador, passos 1 a 4 da §9 (handoff) | Continua aberta. Itens 3, 4 e 6 da lista acima |
| Troca de tema em tempo de execução sem Vitest (handoff) | Continua aberta. Item 1 sugere um Vitest barato além da medição no navegador |
| Item `danger` no escuro no nível de CSS injetado (handoff) | Continua aberta. Cabe no `actionMenu.test.tsx` com `next-themes` mockado em `"dark"`, esperando `color:#ff6467;` |
| `forcedTheme` (nova, criada pela correção desta revisão) | Aberta. Item 7 |

## Decisões em aberto

Nenhuma. Decisões tomadas sem perguntar:

- Branch criada com `git switch -c`, sem renomear a `guilhermebittelbrunn/cycle`, que é a branch do workspace.
- A correção do `forcedTheme` foi aplicada aqui, sem esperar consumidor, porque o `DesignSystemProvider` já
  aceita a prop e o efeito do erro seria primário invisível. O mesmo padrão no `useAlert.ts` ficou para o
  backlog, para não ampliar o diff.
- O código entra num commit só: o `themeContrast.test.ts` recebe os pares do `--warning` e a paridade com o
  antd no mesmo arquivo, e separar exigiria `git add -p` (política do `/cycle`, §6).
- A auditoria do backlog (`specs/BACKLOG.md`) entra antes do código: ela é anterior e é a origem da tarefa.

## Gates (sem `--force`)

| Gate | Resultado |
|------|-----------|
| `pnpm check` | 861 arquivos, sem erro (rodado antes e depois da correção) |
| `pnpm --filter @repo/design-system typecheck` | exit 0 (depois da correção) |
| Typecheck de `apps/app` e `apps/web` | Não remedido. A correção não muda tipo exportado; vale o número do handoff: `tsc --noEmit -p .` direto, exit 0 nos dois |
| Paridade de i18n | Não se aplica, nenhuma chave tocada |

Varredura de segredo em `docs/features/antd-theme-seed-colors/` e no diff do `specs/BACKLOG.md`: nada encontrado.
A única ocorrência de "senha" é a instrução do plano de não gravar senha no relatório.

## Plano de commits

Antes do primeiro commit, `git diff --cached --stat` tem de sair vazio (saiu vazio nesta etapa).

| # | Mensagem | Arquivos |
|---|----------|----------|
| 1 | `docs(specs): sync the backlog after PR #41` | `specs/BACKLOG.md` |
| 2 | `fix(design-system): give antd real per-theme seed colours` | `packages/design-system/providers/antd-app.tsx`, `packages/design-system/styles/globals.css`, `packages/design-system/__tests__/antdTheme.test.tsx`, `packages/design-system/__tests__/themeContrast.test.ts`, `packages/design-system/__tests__/actionMenu.test.tsx` |
| 3 | `docs(features): antd-theme-seed-colors` | `docs/features/antd-theme-seed-colors/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`, `review/review.md`, e o que o `/test` gravar) |

Corpo sugerido para o commit 2:

```
antd derives its palettes in JavaScript and read the var() seeds as
black, so primary, error, warning and link all came out #000000.
The provider now passes per-theme hex seeds that mirror globals.css,
picks the theme from next-themes (forcedTheme first), keeps the seeds
intact on top of the dark algorithm, uses the primary colour for the
focus outline and the primary foreground for solid button text.
Adds a --warning token to globals.css for the antd warning colour.
A parity test ties every seed hex to its globals.css token.
```

Título de PR sugerido: `fix(design-system): give antd real per-theme seed colours`.

**Commits realizados:** (preenchido pelo `/review` depois de commitar)
