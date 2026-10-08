# Plano: cores-semente do antd deixam de virar `#000000`

Tarefa direta, sem spec. Origem: a recomendação #1 da auditoria em `specs/BACKLOG.md` ("Recomendação para a
próxima rodada", `:185-219`) e o achado 🟡 "Seed tokens do antd passados como variável CSS viram `#000000`"
da tabela de `accessibility-conformance` (`:737`). Plano feito em rodada autônoma do `/cycle`: as decisões
tomadas sem perguntar estão na §12, e a §11 traz as perguntas já com a opção adotada.

As referências `arquivo:linha` do repo foram conferidas neste checkout em 2026-10-07. As de biblioteca apontam
para o antd instalado (`antd` 5.29.3, `@ant-design/cssinjs` 1.24.0, `next-themes` 0.4.6), abreviado aqui
como `<antd>/` = `packages/design-system/node_modules/antd/lib/` e `<cssinjs>/` =
`node_modules/.pnpm/@ant-design+cssinjs@1.24.0_…/node_modules/@ant-design/cssinjs/lib/`. Todos os números de
token e de contraste deste plano saíram de `theme.getDesignToken()` rodado com o antd instalado (script
descartável em `/tmp`, fora do repo); os hex dos tokens do `globals.css` saíram da mesma conversão OKLCH →
sRGB que o `themeContrast.test.ts` já usa.

## 0. Sumário do desenho

- O `AntdAppProvider` passa a ler o tema resolvido do `next-themes` (`useTheme().resolvedTheme`, mesmo padrão
  de `packages/design-system/hooks/useAlert.ts:12`) e escolhe entre duas configurações prontas,
  `antdThemes.light` e `antdThemes.dark`.
- As cinco cores-semente (`colorPrimary`, `colorSuccess`, `colorWarning`, `colorError`, `colorInfo`) e o
  `colorLink` deixam de ser `var(...)` e viram hex por tema, espelhando o `globals.css`. Um teste de paridade
  compara cada hex com o token OKLCH correspondente do `globals.css`, para que um fork que troque a cor
  primária descubra na suíte que precisa trocar aqui também.
- O escuro usa o `darkAlgorithm` do antd seguido de um algoritmo de 5 linhas que **devolve as sementes
  intactas**: o `darkAlgorithm` mistura cada semente com `#141414` e tiraria o primário de `#fafafa` para
  `#d8d8d8` e o destrutivo de `#ff6467` para `#dc585b`.
- O anel de foco do antd (`colorPrimaryBorder`) passa a ser a própria cor primária nos dois temas.
- O botão primário do antd ganha `primaryColor: "var(--color-primary-foreground)"`: no escuro o primário é
  quase branco, e o texto branco padrão do antd sumiria nele.
- Token novo `--warning` no `globals.css` (claro `oklch(0.555 0.163 48.998)` = `#bb4d00`; escuro
  `oklch(0.828 0.189 84.429)` = `#ffb900`). Hoje o `colorWarning` aponta para `--chart-4`, que no claro mede
  1,72:1 sobre branco e no escuro é roxo.
- O override `Dropdown.colorError` (`antd-app.tsx:72-78`) sai: com o `colorError` global correto ele vira
  redundante. O `Dropdown.colorTextLightSolid` fica.
- Dois arquivos de produção (`packages/design-system/providers/antd-app.tsx`,
  `packages/design-system/styles/globals.css`), um teste novo e dois testes ajustados, todos em
  `packages/design-system`. Sem SDK, API, i18n, variável de ambiente, dependência ou infra.

## 1. Contexto

### 1.1 Problema

`packages/design-system/providers/antd-app.tsx:17-21` e `:36` passam `var(--color-...)` como cor-semente. O
antd calcula a paleta de cada semente em JavaScript com `@ant-design/fast-color`, que não entende
`var(...)` e lê preto. Medido com o antd instalado, usando o objeto `token` de hoje:

| token | valor hoje | papel |
|-------|-----------|-------|
| `colorPrimary`, `colorError`, `colorWarning`, `colorSuccess`, `colorInfo`, `colorLink` | `#000000` | cor base de cada semente |
| `colorPrimaryHover`, `colorErrorHover` | `#0d0d0d` | hover |
| `colorPrimaryBorder` | `#262626` | anel de foco (`genFocusOutline`, `<antd>/style/index.js:118-119`) |
| `colorPrimaryBg` / `controlItemBgActive` | `#404040` | fundo de item selecionado |

Somando as variantes, 44 tokens de cor saem pretos ou quase pretos. Efeito medido pelo `/test` da PR #40 no
tema escuro, na confirmação de exclusão do `ActionsMenu`: ícone de alerta `rgb(0,0,0)` sobre `rgb(10,10,10)`
(1,06:1), botão "Sim" preto sobre quase preto, e anel de foco dos botões antd `rgb(38,38,38)` (1,31:1). Falha
o WCAG 1.4.11 (contraste de componente de interface, AA).

Só o `Dropdown` escapou, por override de componente (`antd-app.tsx:72-78`). O próprio comentário em
`:72-74` explica a causa.

### 1.2 Objetivo e corte

**Objetivo:** cada cor-semente do antd sai com a cor real do tema ativo, e os componentes antd que o repo usa
ficam legíveis nos dois temas.

**Corte de MVP (este plano):**

1. Sementes hex por tema + algoritmo por tema + escolha pelo `resolvedTheme`.
2. Anel de foco com a cor primária.
3. Texto do botão primário antd com `--primary-foreground`.
4. Token `--warning` no `globals.css` alimentando o `colorWarning`.
5. Remoção do override `Dropdown.colorError`.
6. Testes: config de tema via `getDesignToken`, provider ligado ao `next-themes`, paridade com o
   `globals.css`, contraste do `--warning`.

**Fora do corte:**

- Os tokens neutros (`colorText`, `colorBgContainer`, `colorBorder`, `colorFill*` etc.) continuam como
  `var(...)`. Eles são tokens de mapa, não sementes, e o antd os usa como valor de CSS sem recalcular
  (`<antd>/theme/util/alias.js:28-31` só descarta do override as chaves de semente). Trocar todos por hex é
  outra tarefa.
- Aliases que o antd calcula com `getAlphaColor` sobre esses neutros (`controlOutline`,
  `colorErrorOutline`, `colorWarningOutline`) continuam com valor ruim. Eles pintam o foco de `Input` e
  `Select` do antd, que o repo não usa fora do seletor de tamanho da paginação. Vai para o backlog (§13.3).
- `colorPrimaryBg` / `controlItemBgActive` derivados de um primário neutro saem cinza médio (`#575757` no
  claro, `#595959` no escuro). Hoje são `#404040`. Aparecem só em item selecionado de `Select` (seletor de
  tamanho da paginação, que o antd mostra com mais de 50 linhas) e em linha selecionada de `Table`, que o
  repo não usa. Vai para o backlog.
- Os tokens `Menu.dangerItem*` sem efeito no `Dropdown` (`antd-app.tsx:66-70`). Esta correção não os resolve,
  e o BACKLOG diz que só entram se resolver.
- O `--destructive` do claro abaixo de 4,5:1 sobre `--accent` (`globals.css:24`), excluído explicitamente
  pela recomendação.
- As regras `html .ant-table … !important` do `globals.css:286-305`. O comentário em `:288-290` cita "sem um
  ConfigProvider sincronizado com o next-themes"; depois desta tarefa o provider fica sincronizado, mas o
  fundo da tabela continua vindo de `FastColor(colorFillSecondary)` sobre `var(...)` (`<antd>/table/style/index.js:199-201`),
  então as regras seguem necessárias. Não mexer.

### 1.3 Apps impactados

| Onde | Impacto |
|------|---------|
| `packages/design-system` | `providers/antd-app.tsx`, `styles/globals.css`, testes |
| `apps/app` | Indireto: toda tela com `Table` (paginação, spinner, ordenação) e `ActionsMenu` (menu e confirmação). Área comum e admin |
| `apps/web` | Indireto e sem efeito visível: usa `DesignSystemProvider` (`apps/web/app/[locale]/layout.tsx:36`), mas nenhum componente antd |
| `apps/api`, `packages/sdk`, i18n | N/A |

Modo de produto (`subscription` × `simple`): N/A, o tema não depende disso. Assinatura: N/A. Impersonação:
N/A. É genérico e fica em `packages/design-system`, como manda a regra mestra.

### 1.4 Fontes

- `specs/BACKLOG.md:185-219` (recomendação e critério de pronto) e `:737` (achado ampliado em 2026-10-07).
- `docs/features/action-menu-keyboard-delete/` (formato de tarefa direta; o `/test` de lá registrou o anel
  de foco 1,31:1 como herdado).
- Nenhuma referência externa. Referências não lidas: nenhuma.

### 1.5 Raio de impacto: quem usa antd

`grep 'from "antd'` em `apps/` e `packages/` encontra três arquivos:

| Arquivo | Componentes antd | Tokens de semente que eles pintam |
|---------|------------------|-----------------------------------|
| `packages/design-system/providers/antd-app.tsx:3` | `ConfigProvider`, `theme` | (o próprio tema) |
| `packages/design-system/components/ui/action-menu.tsx:6` | `Dropdown`, `Popconfirm` (com `Button` interno) | `colorError` (item `danger`, `<antd>/dropdown/style/status.js:19-22`), `colorWarning` (ícone, `<antd>/popconfirm/style/index.js:34-35`), `colorPrimary`/`Hover`/`Active` e `primaryColor` (botão "Sim", `<antd>/button/style/index.js:371-376`), `colorPrimaryBorder` (foco de botões e itens) |
| `packages/design-system/components/ui/table.tsx:7` | `Table` (com `Pagination`, `Spin`, ordenação) | `colorPrimary` (página ativa, spinner, ícone de ordenação), `colorPrimaryBorder` (foco da paginação, `<antd>/pagination/style/index.js:501-513`) |

`ActionsMenu` e `Table` estão em toda listagem do CRUD de referência `entity` e nas telas admin.

### 1.6 Por que esta abordagem (o que o código do antd mostra)

1. **A derivação só acontece nas chaves de semente.** O `formatToken` remove do override as chaves de semente
   antes de mesclar (`<antd>/theme/util/alias.js:28-31`). Por isso `colorLinkHover: "var(...)"` sobrevive
   (é token de mapa) e `colorLink: "var(...)"` vira `#000000` (é semente). O mesmo vale ao contrário: não dá
   para "corrigir" `colorPrimary` com override, e dá para fixar `colorPrimaryBorder` com override.
2. **O `darkAlgorithm` mistura cada semente com `#141414`.** A paleta escura é gerada por
   `generate(cor, { theme: "dark" })` (`<antd>/theme/themes/dark/colors.js:9-11`), que mistura com
   `opts.backgroundColor || '#141414'` (`@ant-design/colors/lib/generate.js:128`). Medido: semente
   `#fafafa` vira `colorPrimary` `#d8d8d8`; `#ff6467` vira `#dc585b`. Sem o `darkAlgorithm`, os tokens de
   fundo (`colorErrorBg`, `colorPrimaryBg`, `controlItemBgActive`) saem tons claros (`#fff2f0`, `#ffffff`)
   sobre fundo escuro.
3. **Algoritmos encadeiam.** O `Theme.getDerivativeToken` do cssinjs aplica a lista de algoritmos em
   sequência, cada um recebendo o mapa anterior (`<cssinjs>/theme/Theme.js:33`). O tipo público é
   `MappingAlgorithm` (`antd` exporta em `<antd>/index.d.ts:128`). Um algoritmo depois do `darkAlgorithm`
   que recoloca as sementes mantém a paleta escura para fundos e bordas e a cor base igual ao CSS.
4. **Trocar de tema em tempo de execução não deixa CSS velho ganhando.** Com `hashed: false`, os estilos do
   claro e do escuro têm os mesmos seletores. O cssinjs marca cada `<style>` com o token
   (`<cssinjs>/hooks/useStyleRegister.js:364`) e, quando um token deixa de ser usado, remove todos os
   `<style>` dele (`cleanTokenStyle`, `<cssinjs>/hooks/useCacheToken.js:45-58`), inclusive sem `autoClear`.
   Ao voltar para o claro, o estilo é reinserido no fim. A leitura indica que o toggle funciona; o `/test`
   confirma (§9, item 6).
5. **SSR e hidratação.** O repo não usa registro de SSR do antd (nenhum `@ant-design/nextjs-registry`,
   `StyleProvider` ou `extractStyle` em `apps/` e `packages/`), então o CSS do antd só é injetado no
   cliente. Com `hashed: false` e sem `cssVar`, o token não muda o markup. No servidor o `resolvedTheme` é
   `undefined` e o provider usa o claro; no primeiro render do cliente o `next-themes` 0.4.6 já resolve o
   tema no inicializador do `useState` (lê `localStorage` e `matchMedia`). Não há divergência de markup a
   hidratar. O flash do `Table` sem estilo antd antes da hidratação é anterior a esta tarefa.

## 2. Dados (Firestore)

N/A.

## 3. Contrato `@repo/sdk`

N/A.

## 4. API

N/A.

## 5. Front-end

### 5.1 `AntdAppProvider` (`packages/design-system/providers/antd-app.tsx`)

Antes: um `ConfigProvider` com objeto de tema literal, `algorithm: antdTheme.defaultAlgorithm` (`:15`),
sementes em `var(...)` (`:17-21`, `:36`) e override `Dropdown.colorError` (`:75-78`).

Depois:

- `antdSeedColors`: hex por tema, exportado (o teste de paridade lê).
- `keepSeedColors: MappingAlgorithm`: recoloca as seis sementes no mapa.
- `antdThemes: Record<"light" | "dark", ThemeConfig>`: construído uma vez no módulo, exportado. Referências
  estáveis evitam recriar o `Theme` do cssinjs a cada render.
- O componente lê `useTheme().resolvedTheme` e passa `antdThemes[mode]`.
- Os tokens neutros, `Table`, `Menu`, `Modal` e `Button` ficam como estão; `Button` ganha `primaryColor`.
- `Dropdown` perde `colorError` e o comentário de `:72-74`; mantém `colorTextLightSolid`.

`useTheme` fora do `ThemeProvider` devolve contexto vazio (`resolvedTheme` indefinido) e o provider cai no
claro. O único uso do provider está dentro do `ThemeProvider` (`packages/design-system/index.tsx:42-43`).

### 5.2 Token `--warning` (`packages/design-system/styles/globals.css`)

| tema | valor | hex | contraste sobre `--popover` |
|------|-------|-----|------------------------------|
| claro (`:root`, perto de `:26`) | `oklch(0.555 0.163 48.998)` | `#bb4d00` | 5,03:1 |
| escuro (`.dark`, perto de `:65`) | `oklch(0.828 0.189 84.429)` | `#ffb900` | 11,49:1 |

Mais `--color-warning: var(--warning);` no `@theme inline`, ao lado de `--color-success` (`:118`). O
precedente é o `--success`, que também não é token do shadcn. Os valores são o âmbar-700 e o âmbar-400 da
paleta do Tailwind v4. O claro passa 4,5:1 de propósito: o antd também usa `colorWarning` como cor de texto
(mensagem de aviso de formulário, `Typography` `type="warning"`).

### 5.3 Valores resultantes (medidos)

| token | claro | escuro |
|-------|-------|--------|
| `colorPrimary` / `colorInfo` / `colorLink` | `#171717` (17,93:1 sobre o fundo) | `#fafafa` (18,97:1) |
| `colorError` | `#e7000b` (4,77:1) | `#ff6467` (6,85:1) |
| `colorWarning` (ícone da confirmação) | `#bb4d00` (5,03:1) | `#ffb900` (11,49:1) |
| `colorSuccess` | `#007a55` (5,36:1) | `#007a55` (3,69:1) |
| `colorPrimaryBorder` (anel de foco) | `#171717` (17,93:1) | `#fafafa` (18,97:1) |
| "Sim": texto `--primary-foreground` sobre `colorPrimary` | 17,18:1 | 17,18:1 |
| "Sim" em hover / pressionado | `#242424` 14,87:1 / `#000000` 20,12:1 | `#e8e8e8` 14,63:1 / `#aaaaaa` 7,72:1 |

"Fundo" = `--background`/`--popover` (`#ffffff` no claro, `#0a0a0a` no escuro). O `colorPrimaryActive`
`#000000` do claro é derivação legítima (o pressionado de um primário `#171717` é mais escuro), não falha de
leitura. Por isso o critério 1 do BACKLOG ("nenhum seed token derivado como `#000000`") vira aqui "cada
semente sai igual ao hex do tema", que é o que a falha de leitura impedia.

### 5.4 Estados

| Estado | Esperado |
|--------|----------|
| Tema claro, escuro, `system` | Config do tema resolvido |
| Primeiro render no servidor | Config do claro (sem efeito visível: antd não tem SSR de CSS aqui) |
| Troca de tema com a página aberta | Componentes antd trocam de cor sem recarregar |
| Fora do `ThemeProvider` | Config do claro |

## 6. i18n

N/A. Nenhuma string de UI nova.

## 7. Autorização e segurança

N/A. Mudança só de apresentação.

## 8. Testes

Todos em `packages/design-system/__tests__/`, Vitest + jsdom, sem processo externo.

| # | Arquivo | Nível | O que prova | Falha hoje? |
|---|---------|-------|-------------|-------------|
| T1 | `antdTheme.test.tsx` (novo) | unitário sobre `theme.getDesignToken(antdThemes[mode])` | nos dois temas, as seis sementes saem iguais a `antdSeedColors[mode]` e diferentes de `#000000`; `colorPrimaryBorder` ≥ 3:1 sobre o fundo; `colorWarning` ≥ 3:1 sobre o fundo; `colorPrimary` ≥ 3:1 sobre o fundo; o escuro usa o `darkAlgorithm` (ex.: `colorErrorBg` mais escuro que o fundo claro, `colorBgSpotlight` ≠ `rgba(0,0,0,0.85)`) | Não compila hoje (`antdThemes` não existe). Ver T2 |
| T2 | mesmo arquivo | componente: `render(<AntdAppProvider><Probe/></AntdAppProvider>)`, com `vi.mock("next-themes")` devolvendo `resolvedTheme` (precedente: `apps/app/__tests__/accountPreferencesForm.test.tsx:35-37`); o `Probe` usa `theme.useToken()` e escreve `token.colorPrimary`, `token.colorError`, `token.colorLink` no DOM | `"dark"` → `#fafafa`/`#ff6467`/`#fafafa`; `"light"` e `undefined` → `#171717`/`#e7000b`/`#171717` | **Sim**: com o provider atual os três saem `#000000`. O `/develop` escreve T2 primeiro e registra o vermelho no handoff |
| T3 | `themeContrast.test.ts` (ajuste) | unitário | (a) pares `["light","warning","background"]` e `["dark","warning","background"]` na lista `textPairs` (`:104-114`); (b) `describe` novo de paridade: para cada tema, `antdSeedColors[mode].primary/success/warning/destructive` igual ao hex de `--primary/--success/--warning/--destructive` convertido pelas funções que o arquivo já tem (`oklchToLinearRgb` + codificação sRGB + arredondamento) | (a) falha hoje: não há `--warning` |
| T4 | `actionMenu.test.tsx:76-100` (ajuste) | componente | o item `danger` continua pintado com a cor destrutiva em repouso e no hover. As expectativas mudam de `var(--color-destructive)` para `antdSeedColors.light.destructive` (`#e7000b`): o teste roda sem `ThemeProvider`, logo no claro | Não; é ajuste de mecanismo |

Sobre T4: não é afrouxar teste. A asserção continua exata e passa a apontar para o hex que o T3 amarra ao
`globals.css`. A cobertura do escuro para o `colorError` fica no T2 (token) e no `/test` (pixel).

**Mutações que o `/develop` confere e registra no handoff:**

- M1: voltar `colorPrimary` do escuro para `"var(--color-primary)"` → T1 e T2 falham.
- M2: tirar `keepSeedColors` do escuro → T1 falha (`#d8d8d8` ≠ `#fafafa`).
- M3: tirar o `colorPrimaryBorder` → T1 falha no escuro (`#595959`, 2,83:1).
- M4: trocar um hex de `antdSeedColors` por outro valor → T3(b) falha.
- M5: ignorar o `resolvedTheme` (sempre `light`) → T2 falha no caso `"dark"`.

Nenhum teste de emulador ou de app de pé: nada aqui depende de infra.

## 9. O que o `/test` vai percorrer

Em `pnpm --filter app build && pnpm --filter app start` (política §4: `next dev` não é produção), claro e
escuro, desktop e 390 px. Idioma: pt-br completo; en e es só no passo 1, porque a mudança não toca texto
(os rótulos "Sim"/"Não" mudam de largura entre idiomas, o que justifica conferir o botão nos três).

Dado necessário: uma conta comum com pelo menos uma entidade (para o `ActionsMenu`) e, para a paginação,
mais de 10 entidades. Credencial de dev em `.claude/dev-credentials.local.md`; nada de senha no relatório.

1. **Confirmação de exclusão do `ActionsMenu`** (`/entities`): abrir pelo mouse e pelo teclado (Enter em
   "Excluir"). Medir cor computada e contraste contra o fundo do painel: ícone de alerta (esperado `#bb4d00`
   no claro, `#ffb900` no escuro, ≥ 3:1), fundo do "Sim" (≥ 3:1 contra o painel) e texto do "Sim" (≥ 4,5:1
   contra o fundo do botão). Nos três idiomas.
2. **Anel de foco dos botões antd**: Tab até "Não" e "Sim" na confirmação. Medir `outline-color` e contraste
   contra o fundo do painel (esperado ≥ 3:1; hoje 1,31:1 no escuro).
3. **Item `danger` do `Dropdown`**: cor do texto em repouso e fundo/texto no hover e no foco de teclado, nos
   dois temas. Esperado igual ao de hoje: texto `--destructive`, hover com fundo `--destructive` e texto
   `--background`.
4. **Paginação da `Table`**: página ativa (borda e texto) e foco de teclado num número de página. Esperado: a
   borda da página ativa visível no escuro (hoje preta sobre preto).
5. **Spinner da `Table`**: com o botão "Atualizar", conferir que o indicador de carregamento aparece no
   escuro (hoje `colorPrimary` preto).
6. **Troca de tema com a página aberta**: claro → escuro → claro pelo seletor de tema, sem recarregar,
   com a confirmação aberta antes e depois. Esperado: cores do passo 1 corretas após cada troca, sem
   recarregar. É a verificação do §1.6, item 4.
7. **Recarregar no escuro** (tema salvo): console sem aviso de hidratação; a confirmação abre já com as cores
   do escuro.
8. **Área admin** (`/admin/users`): o `ActionsMenu` e a `Table` de lá, só no escuro, passos 1 e 4.

Não observável sem infra externa: nada.

## 10. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Cores-semente do antd iguais às do tema ativo**
  Com o tema claro, `colorPrimary`, `colorInfo` e `colorLink` resolvem para `#171717`, `colorError` para
  `#e7000b`, `colorWarning` para `#bb4d00` e `colorSuccess` para `#007a55`; com o escuro, `#fafafa`,
  `#ff6467`, `#ffb900` e `#007a55`. Nenhuma das seis sementes sai `#000000` em nenhum tema. O
  `colorPrimaryActive` `#000000` do claro é derivação legítima e não conta como falha. Provado pelo T1 e T2.

- [ ] **O provider segue o tema do `next-themes`**
  Com `resolvedTheme` `"dark"` o `AntdAppProvider` entrega o tema escuro; com `"light"`, `"system"` ainda não
  resolvido ou `undefined` (render no servidor, ou fora do `ThemeProvider`), entrega o claro. Trocar o tema
  com a página aberta troca as cores dos componentes antd sem recarregar, e voltar ao tema anterior não deixa
  regra do outro tema ganhando no CSS. Recarregar já no escuro não gera aviso de hidratação no console.

- [ ] **Ícone de alerta da confirmação de exclusão legível**
  Na confirmação aberta pelo "Excluir" do `ActionsMenu`, o ícone de alerta mede pelo menos 3:1 contra o fundo
  do painel nos dois temas (calculado: 5,03:1 no claro, 11,49:1 no escuro). Vale para a confirmação aberta
  pelo mouse e pelo teclado, na listagem comum e na admin. Hoje mede 1,06:1 no escuro.

- [ ] **Botão "Sim" da confirmação legível**
  O fundo do "Sim" mede pelo menos 3:1 contra o fundo do painel e o texto mede pelo menos 4,5:1 contra o fundo
  do botão, nos dois temas, em repouso, hover e pressionado (calculado: texto 17,18:1 em repouso; no escuro,
  7,72:1 pressionado). Conferido nos três idiomas, já que a largura do rótulo muda. Hoje o botão é preto
  sobre quase preto no escuro.

- [ ] **Anel de foco dos componentes antd visível**
  O `outline` de foco de teclado nos botões da confirmação, nos itens do menu e nos números da paginação usa a
  cor primária do tema e mede pelo menos 3:1 contra o fundo nos dois temas. Hoje mede 1,31:1 no escuro.

- [ ] **Item "Excluir" do menu mantém a cor de hoje**
  O texto do item `danger` continua `--destructive` em repouso; no hover e no foco de teclado o fundo
  continua `--destructive` e o texto `--background`, nos dois temas. O override `Dropdown.colorError` sai do
  provider sem mudar nenhum desses valores. O teste `actionMenu.test.tsx` continua cobrindo repouso e hover.

- [ ] **Paginação e carregamento da tabela visíveis no escuro**
  A página ativa da paginação tem borda visível no escuro e o indicador de carregamento da `Table` aparece ao
  atualizar a lista. No claro, a aparência fica praticamente igual (primário `#171717` no lugar de `#000000`).

- [ ] **Token `--warning` no tema**
  O `globals.css` declara `--warning` em `:root` e `.dark` e expõe `--color-warning`. O par `--warning` sobre
  `--background` passa 4,5:1 nos dois temas no `themeContrast.test.ts`. O `colorWarning` do antd usa esse
  token, não mais o `--chart-4`.

- [ ] **Hex do antd amarrados ao `globals.css`**
  Um teste compara cada hex de `antdSeedColors` com o token OKLCH correspondente do `globals.css`
  (`--primary`, `--success`, `--warning`, `--destructive`) nos dois temas. Mudar uma cor do tema sem mudar o
  provider faz a suíte falhar com o nome do token.

- [ ] **Gates verdes**
  `pnpm check`, `pnpm --filter @repo/design-system typecheck` e a suíte do pacote passam. O T2 falha com o
  provider de hoje (vermelho registrado no handoff) e passa com o novo.

## 11. Perguntas em aberto

Nenhuma bloqueia a implementação. Todas já têm a opção adotada.

1. **De onde vem a cor de aviso?**
   Opções: (a) token novo `--warning` no `globals.css` (âmbar-700 no claro, âmbar-400 no escuro); (b) manter
   `--chart-4` e trocar só o ícone do `Popconfirm` para `--destructive` por override de componente; (c) hex
   de aviso só no provider, sem token CSS.
   **Adotada: (a).** O critério 2 do BACKLOG exige o ícone com 3:1 nos dois temas, e o `--chart-4` do claro
   mede 1,72:1 (o ícone, hoje preto, mede 21:1; passar para `--chart-4` seria regressão no claro). No escuro
   o `--chart-4` é roxo. (b) deixa o `colorWarning` global quebrado para os forks e é mais um override por
   componente, o que a política manda evitar. (c) não tem lugar no CSS para o teste de paridade. O BACKLOG já
   previa mexer no `globals.css` "se a correção precisar de token novo". Os valores exatos são escolha de
   design e podem ser trocados por fork; o teste de paridade aponta onde.

2. **Cor do anel de foco do antd.**
   Opções: (a) a cor primária do tema; (b) o passo seguinte da paleta (`colorPrimaryBorderHover`, `#7c7c7c`
   no escuro, 4,74:1); (c) `--ring` (`#525252` no escuro, 2,6:1).
   **Adotada: (a).** É a única regra que passa 3:1 para qualquer primário que contraste com o fundo, o que vale
   para os forks com primário colorido; (b) passa aqui, mas com primário azul o mesmo passo no escuro fica em
   torno de 2,6:1; (c) não passa. Efeito colateral aceito: no escuro o anel branco fica a 1 px do botão "Sim"
   branco, separado por uma faixa do fundo.

3. **Tirar o override `Dropdown.colorError`?**
   Opções: (a) tirar e ajustar a asserção do `actionMenu.test.tsx`; (b) manter, por redundância.
   **Adotada: (a).** O override era o contorno da falha que esta tarefa corrige na raiz, e o próprio comentário
   dele diz isso. Os valores pintados não mudam (critério 6).

## 12. Decisões tomadas sem perguntar

| # | Decisão | Alternativa descartada e por quê |
|---|---------|----------------------------------|
| D1 | Hex por tema escolhidos pelo `resolvedTheme` do `next-themes` | `cssVar: true` do antd 5: ele só publica os tokens já calculados como variáveis CSS; a derivação continua em JS a partir da semente, então `var(...)` como semente segue virando preto. Usá-lo para sobrescrever cada `--ant-color-*` por tema no `globals.css` exigiria escrever à mão dezenas de tokens derivados e mudaria a forma como todo CSS do antd é emitido |
| D2 | Corrigir na semente, no tema global | Overrides por componente como o do `Dropdown`: cada componente e cada derivado (hover, active, border) precisaria do seu, e os aliases globais continuariam pretos. É o contorno que a política manda substituir |
| D3 | `darkAlgorithm` + `keepSeedColors` no escuro; `defaultAlgorithm` no claro | `defaultAlgorithm` nos dois: fundos derivados claros no escuro (`colorErrorBg` `#fff2f0`, `controlItemBgActive` `#ffffff`). `darkAlgorithm` sozinho: primário `#d8d8d8` e destrutivo `#dc585b`, diferentes do CSS, e o item `danger` mudaria de cor (fere o critério 6) |
| D4 | `colorPrimaryBorder` fixado por override de token de mapa | Fixar dentro do `keepSeedColors`: funciona igual, mas esconde no algoritmo um valor que é configuração declarativa. Override de mapa é suportado (§1.6, item 1) |
| D5 | Hex como constantes no provider + teste de paridade com o `globals.css` | Ler `getComputedStyle` em tempo de execução e converter OKLCH no navegador: só funciona depois de montar (primeiro render com cores erradas), exige conversor de cor em produção e não roda no jsdom. Constantes são determinísticas e o teste pega a deriva |
| D6 | Tudo em `antd-app.tsx`, sem arquivo novo de produção | Módulo `antd-theme.ts` separado: mais um arquivo para o mesmo assunto. Exportar constantes de um módulo `"use client"` é permitido; só componentes de servidor não podem importá-las, e nenhum importa |
| D7 | Tokens neutros continuam `var(...)` | Hex também para eles: funcionam hoje (são tokens de mapa), trocam na hora pela classe `.dark` e ampliariam o diff. Os aliases quebrados que dependem deles vão para o backlog |
| D8 | `Button.primaryColor: "var(--color-primary-foreground)"` | Deixar o `colorTextLightSolid` branco: no escuro o "Sim" ficaria branco sobre `#fafafa`. Trocar o `colorTextLightSolid` global: ele pinta também o texto do hover do item `danger` e de outros componentes sólidos |
| D9 | Paridade e contraste do `--warning` dentro do `themeContrast.test.ts` | Arquivo novo para a paridade: duplicaria a conversão OKLCH que o arquivo já tem. Extrair a conversão para um helper: refatoração fora do escopo |
| D10 | `/test` em build de produção, en/es só no passo 1 | Os três idiomas em todos os passos: a mudança não toca texto; só o "Sim"/"Não" muda de largura |

## 13. Blueprint técnico

### 13.1 `packages/design-system/providers/antd-app.tsx`

Pseudo-diff. Os nomes são sugestão; o formato dos objetos `Table`/`Menu`/`Modal` não muda e aparece
abreviado.

```tsx
"use client";

import {
    theme as antdTheme,
    ConfigProvider,
    type MappingAlgorithm,
    type ThemeConfig,
} from "antd";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";

type ThemeMode = "light" | "dark";

// antd derives its palettes in JavaScript and reads a CSS var() as black, so its seed colours
// are hex copies of the globals.css tokens (--primary, --success, --warning, --destructive).
export const antdSeedColors = {
    light: { primary: "#171717", success: "#007a55", warning: "#bb4d00", destructive: "#e7000b" },
    dark: { primary: "#fafafa", success: "#007a55", warning: "#ffb900", destructive: "#ff6467" },
} as const satisfies Record<ThemeMode, Record<string, string>>;

const seedColorKeys = [
    "colorPrimary", "colorSuccess", "colorWarning", "colorError", "colorInfo", "colorLink",
] as const;

// The dark algorithm blends every seed with #141414; restoring the seeds keeps the base
// colours equal to the CSS theme while hover, background and border steps stay dark.
const keepSeedColors: MappingAlgorithm = (
    seedToken,
    mapToken = antdTheme.defaultAlgorithm(seedToken)
) => ({
    ...mapToken,
    ...Object.fromEntries(seedColorKeys.map((key) => [key, seedToken[key]])),
});

const neutralTokens = {
    colorText: "var(--color-foreground)",
    // … os mesmos tokens neutros de hoje (:22-35), sem mudança
    colorLinkHover: "var(--color-primary)",
    colorLinkActive: "var(--color-primary)",
    borderRadius: 10,
    fontFamily: "var(--font-sans)",
} satisfies ThemeConfig["token"];

const components = {
    Table: { /* sem mudança */ },
    Menu: { /* sem mudança */ },
    Dropdown: {
        colorTextLightSolid: "var(--color-background)",
    },
    Modal: { /* sem mudança */ },
    Button: {
        // … os 6 tokens de hoje (:86-91)
        primaryColor: "var(--color-primary-foreground)",
    },
} satisfies ThemeConfig["components"];

function buildAntdTheme(mode: ThemeMode): ThemeConfig {
    const colors = antdSeedColors[mode];
    return {
        hashed: false,
        algorithm:
            mode === "dark"
                ? [antdTheme.darkAlgorithm, keepSeedColors]
                : antdTheme.defaultAlgorithm,
        token: {
            ...neutralTokens,
            colorPrimary: colors.primary,
            colorSuccess: colors.success,
            colorWarning: colors.warning,
            colorError: colors.destructive,
            colorInfo: colors.primary,
            colorLink: colors.primary,
            colorPrimaryBorder: colors.primary,
        },
        components,
    };
}

export const antdThemes: Record<ThemeMode, ThemeConfig> = {
    light: buildAntdTheme("light"),
    dark: buildAntdTheme("dark"),
};

export function AntdAppProvider({ children }: { children: ReactNode }) {
    const { resolvedTheme } = useTheme();
    return (
        <ConfigProvider
            theme={antdThemes[resolvedTheme === "dark" ? "dark" : "light"]}
            wave={{ disabled: false }}
        >
            {children}
        </ConfigProvider>
    );
}
```

Pontos de atenção:

- O JSDoc atual do componente (`:6-9`) diz "alinhado às variáveis CSS (light/dark via `.dark`)". Atualizar
  para refletir que o tema vem do `next-themes`, ou remover (regra de comentários: só o porquê).
- Os dois comentários acima são as exceções legítimas da regra de comentários (restrição externa do antd).
  Nenhum deles cita artefato do fluxo.
- Conferir se `MappingAlgorithm` e `ThemeConfig` saem do índice do `antd` com `import type`; ambos estão em
  `<antd>/index.d.ts`. Se o Biome reclamar do `Object.fromEntries` tipado, escrever as seis chaves à mão.
- `antdThemes` precisa ser referência estável: nada de construir dentro do componente.

### 13.2 `packages/design-system/styles/globals.css`

```diff
 :root {
     …
     --success: oklch(50.8% 0.118 165.612);
+    --warning: oklch(0.555 0.163 48.998);
     …
 }
 .dark {
     …
     --success: oklch(50.8% 0.118 165.612);
+    --warning: oklch(0.828 0.189 84.429);
     …
 }
 @theme inline {
     …
     --color-success: var(--success);
+    --color-warning: var(--warning);
     …
 }
```

### 13.3 Testes

`packages/design-system/__tests__/antdTheme.test.tsx` (novo), esqueleto:

```tsx
const resolvedTheme = vi.hoisted(() => ({ current: undefined as string | undefined }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: resolvedTheme.current }) }));

const { AntdAppProvider, antdSeedColors, antdThemes } = await import(
    "@repo/design-system/providers/antd-app"
);

// contraste WCAG entre dois hex: luminância relativa + (L1 + 0.05) / (L2 + 0.05)

describe("antd theme config", () => {
    it.each(["light", "dark"] as const)("%s: seeds resolve to the theme colours", (mode) => {
        const token = theme.getDesignToken(antdThemes[mode]);
        // colorPrimary/colorInfo/colorLink === antdSeedColors[mode].primary, etc.; nenhum === "#000000"
    });
    it.each(…)("%s: focus outline, warning icon and primary reach 3:1 on the page", …);
    it("dark derives dark backgrounds", …); // colorErrorBg e controlItemBgActive escuros
});

describe("AntdAppProvider", () => {
    it.each([
        ["dark", "#fafafa", "#ff6467"],
        ["light", "#171717", "#e7000b"],
        [undefined, "#171717", "#e7000b"],
    ])("resolvedTheme %s → colorPrimary %s, colorError %s", …); // Probe com theme.useToken()
});
```

`themeContrast.test.ts`: dois pares novos em `textPairs` e um `describe("antd seed colours mirror
globals.css")` que importa `antdSeedColors` e converte o OKLCH para hex (aplicar a codificação sRGB sobre
`oklchToLinearRgb` e arredondar para 0..255). Mapa: `primary → --primary`, `success → --success`,
`warning → --warning`, `destructive → --destructive`.

`actionMenu.test.tsx:97-100`: trocar `var(--color-destructive)` por `${antdSeedColors.light.destructive}` nas
duas expectativas; manter o resto. Se o formato do CSS gerado mudar (minúsculas, sem `;`), ajustar o texto
esperado sem perder a exatidão.

### 13.4 Achados para o backlog (o `/spec --sync` registra)

- `controlOutline`, `colorErrorOutline` e `colorWarningOutline` saem com valor sem sentido porque o antd
  calcula com `getAlphaColor` sobre `colorBgContainer: var(...)` (`<antd>/theme/util/alias.js`). Afeta o foco
  de `Input`/`Select` do antd; no repo, só o seletor de tamanho da paginação.
- `colorPrimaryBg`/`controlItemBgActive` cinza médio com primário neutro (`#575757` claro, `#595959` escuro):
  item selecionado do seletor de tamanho da paginação com texto `--foreground` fica abaixo de 3:1 no claro.
- `--success` no escuro mede 3,69:1 sobre o fundo, abaixo de 4,5:1 para texto.
- O comentário de `globals.css:288-290` fica impreciso depois desta tarefa (o provider passa a seguir o
  `next-themes`), embora as regras continuem necessárias.

### 13.5 Ordem de implementação e de commit

Ordem de implementação: T2 (vermelho registrado) → `globals.css` → `antd-app.tsx` → T1, T3, T4 → gates.

| # | Commit | Arquivos |
|---|--------|----------|
| 1 | `fix(design-system): give antd real per-theme seed colours` | `packages/design-system/providers/antd-app.tsx`, `packages/design-system/styles/globals.css`, `packages/design-system/__tests__/antdTheme.test.tsx`, `packages/design-system/__tests__/themeContrast.test.ts`, `packages/design-system/__tests__/actionMenu.test.tsx` |
| 2 | `docs(features): antd-theme-seed-colors` | `docs/features/antd-theme-seed-colors/**` |

O `--warning` vai no commit 1. Separá-lo exigiria `git add -p` no `themeContrast.test.ts`, que recebe os
pares do `--warning` e a paridade com o antd no mesmo arquivo; a política aceita o commit misto nesse caso.
O corpo da mensagem cita as duas mudanças.

O `specs/BACKLOG.md` já está modificado neste checkout por outra etapa do ciclo e não pertence a nenhum dos
dois commits. Antes do primeiro commit, `git diff --cached --stat` precisa sair vazio.

### 13.6 Env, infra e pré-requisitos manuais

Nenhuma variável de ambiente, dependência, índice, regra ou serviço novo. `next-themes` e `antd` já são
dependências do `@repo/design-system`. **Pré-requisitos manuais de infra: nenhum.** Nada vai para o
`docs/PRE-PRODUCTION.md`.

Rollback: reverter o commit 1.

O que um fork precisa saber: ao trocar uma cor de `--primary`, `--success`, `--warning` ou `--destructive`
no `globals.css`, trocar o hex correspondente em `antdSeedColors`. O teste de paridade falha até isso
acontecer.
