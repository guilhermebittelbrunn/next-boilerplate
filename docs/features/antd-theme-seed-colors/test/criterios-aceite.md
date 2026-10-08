# Critérios de Aceite (Checklist)

Critérios do plano (§10) revisados pelo `/test` depois da medição. Dois tiveram o texto corrigido porque
descreviam um comportamento que o produto nunca teve: o foco de teclado no item "Excluir" (critério 6) e o
indicador de carregamento da tabela (critério 7). Os valores esperados abaixo são os medidos em
`next build && next start`. O status de cada item, com o meio de verificação, está em `report.md`.

- [x] **Cores-semente do antd iguais às do tema ativo**
  No tema claro, `colorPrimary`, `colorInfo` e `colorLink` resolvem para `#171717`, `colorError` para
  `#e7000b`, `colorWarning` para `#bb4d00` e `colorSuccess` para `#007a55`. No escuro, os mesmos tokens
  resolvem para `#fafafa`, `#ff6467`, `#ffb900` e `#007a55`. Nenhuma das seis sementes sai `#000000` em
  nenhum tema. O `colorPrimaryActive` `#000000` do claro é derivação legítima de um primário `#171717` e não
  conta como falha. No navegador, a cor computada dos componentes antd tem de bater com esses valores.

- [x] **O provider segue o tema do `next-themes`, inclusive o tema forçado**
  Com `resolvedTheme` `"dark"`, o `AntdAppProvider` entrega o tema escuro. Com `"light"`, `undefined` (render
  no servidor ou fora do `ThemeProvider`) ou qualquer outro valor, entrega o claro. Quando uma página passa
  `forcedTheme`, ele vence a preferência salva no `resolvedTheme`: `forcedTheme: "dark"` com
  `resolvedTheme: "light"` entrega `#fafafa`/`#ff6467`/`#fafafa`.

- [x] **Troca de tema sem recarregar não deixa CSS do tema anterior**
  Trocar claro → escuro → claro pelo seletor de tema, com a página aberta, troca as cores dos componentes
  antd sem recarregar. Depois de cada troca sobra um único `data-token-hash` de tema nos `<style>` do antd
  (além do hash dos ícones, que não depende do tema), e nenhum `<style>` contém a cor do primário ou do
  destrutivo do tema anterior. A confirmação aberta depois da troca mostra as cores do tema novo.

- [x] **Recarregar já no escuro não pisca nem avisa hidratação**
  Com o tema escuro salvo, a carga completa de `/entities` não injeta nenhum `<style>` do antd com o token
  do claro em nenhum momento, e o console fica sem aviso de hidratação e sem erro de página. A confirmação
  aberta logo depois da carga já usa as cores do escuro.

- [x] **Ícone de alerta da confirmação de exclusão legível**
  Na confirmação aberta pelo "Excluir" do `ActionsMenu`, o ícone de alerta mede pelo menos 3:1 contra o
  fundo do painel nos dois temas: `#bb4d00` a 5,03:1 no claro e `#ffb900` a 11,49:1 no escuro. Vale para a
  confirmação aberta pelo mouse e pelo teclado, na listagem comum (`/entities`) e na admin
  (`/admin/users`, "Arquivar usuário"), em desktop e em 390 px. Antes da correção o ícone media 1,06:1 no
  escuro (`#000000` sobre `#0a0a0a`).

- [x] **Botão "Sim" da confirmação legível**
  O fundo do "Sim" mede pelo menos 3:1 contra o painel e o texto pelo menos 4,5:1 contra o fundo do botão,
  nos dois temas, em repouso, hover e pressionado. Claro: `#171717` (17,18:1), `#242424` (14,87:1) e
  `#000000` (20,12:1), texto `#fafafa`. Escuro: `#fafafa` (17,18:1), `#e8e8e8` (14,63:1) e `#aaaaaa`
  (7,72:1), texto `#171717`. O rótulo cabe sem corte em pt-br ("Sim", 40 px), en ("Yes", 39 px) e es ("Sí",
  28 px). Antes da correção o botão era `#000000` sobre o painel `#0a0a0a` (1,06:1) no escuro.

- [x] **Anel de foco dos componentes antd visível**
  O `outline` de foco de teclado nos botões "Não" e "Sim" da confirmação, no item do menu de ações e nos
  números da paginação usa a cor primária do tema (`#171717` no claro, `#fafafa` no escuro, 3 px, com 1 px
  de afastamento) e mede 17,93:1 e 18,97:1 contra o fundo. Antes da correção o anel era `#262626` nos dois
  temas, 1,31:1 no escuro.

- [x] **Item "Excluir" do menu mantém a cor de hoje**
  Em repouso o texto do item `danger` é o `--destructive` do tema (`#e7000b` a 4,77:1 no claro, `#ff6467` a
  6,85:1 no escuro). No hover o fundo vira o `--destructive` e o texto vira o `--background`. No foco por
  seta, o antd não aplica a regra do hover: o item recebe o fundo neutro de item ativo (`#f5f5f5` no claro,
  `#262626` no escuro), mantém o texto destrutivo e ganha o anel de foco primário. Esses valores são
  idênticos aos do código anterior, medidos no mesmo navegador. O override `Dropdown.colorError` sai do
  provider sem mudar nenhum deles, e o teste cobre repouso e hover nos dois temas.

- [x] **Paginação da tabela visível no escuro**
  Na `/admin/users`, com mais de 10 usuários, a página ativa tem borda `#fafafa` a 18,97:1 no escuro e
  `#171717` a 17,93:1 no claro; antes da correção a borda era `#000000` a 1,06:1 no escuro. A `/entities`
  usa paginação por cursor (`pagination={false}`) e não exibe a paginação do antd. Nenhum fluxo do repo passa
  `loading` à `Table` do antd: o "Atualizar" mostra o spinner do `Button` do design system, que não usa os
  tokens do antd. Por isso o indicador de carregamento do antd fica coberto só pelo token `colorPrimary`.

- [x] **Token `--warning` no tema**
  O `globals.css` declara `--warning` em `:root` e `.dark` e expõe `--color-warning`. O par `--warning` sobre
  `--background` passa 4,5:1 nos dois temas no `themeContrast.test.ts`. O `colorWarning` do antd usa esse
  token, e o ícone da confirmação mede exatamente o hex dele no navegador.

- [x] **Hex do antd amarrados ao `globals.css`**
  Um teste compara cada hex de `antdSeedColors` com o token OKLCH correspondente do `globals.css`
  (`--primary`, `--success`, `--warning`, `--destructive`) nos dois temas. Trocar um hex sem trocar o token
  faz a suíte falhar com o nome do token: `#ffb900` → `#ffb800` derruba
  `dark: --warning in globals.css is the antd seed #ffb800`.

- [x] **Gates verdes**
  `pnpm --filter @repo/design-system test` passa com 83 testes, o typecheck do pacote sai com exit 0 e o
  `pnpm test` da raiz fecha 15/15 tasks. O lint do arquivo de teste alterado nesta etapa sai limpo.
