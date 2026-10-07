# Handoff do develop: "Excluir" do menu de ações funciona pelo teclado

## Blueprint → arquivos

| Item do plano | Arquivo |
|---------------|---------|
| §13.1 `Popconfirm` controlado, estrutura H (`Popconfirm` > `<span className="inline-flex">` > `Dropdown` > `button`), foco em "Não" por `afterOpenChange` + `useId`, Esc por `keydown` em `window`, foco de volta ao gatilho em Esc/"Não"/"Sim", `aria-haspopup="menu"` + `aria-expanded` | `packages/design-system/components/ui/action-menu.tsx` |
| §13.2 os 9 casos novos (os 4 testes antigos ficaram como estavam) | `packages/design-system/__tests__/actionMenu.test.tsx` |

O componente segue o pseudo-diff do plano. A `className` morta do `Popconfirm` antigo saiu. Os tipos exportados
(`ActionMenuItem`, `ActionMenuDeleteLabels`) e as props de `ActionsMenu` não mudaram. O diff do componente é
grande (+112/-65 antes do ajuste do comentário) porque o `Dropdown` inteiro ganhou dois níveis de indentação.
`components/ui` está fora do Biome (`biome.jsonc:48`), então mantive o estilo original do arquivo (4 espaços,
vírgula final).

Há um comentário de duas linhas no `afterOpenChange`. Ele explica por que o foco só vai para "Não" depois da
animação: assim o mesmo Enter que abriu a confirmação não ativa o botão. É a exceção de "edge case não
óbvio" da regra de comentários e não cita o plano.

## Contrato

Nenhum. Sem SDK, API, i18n, env ou dependência. Consumidores do `ActionsMenu` (conferido com
`grep -rln ActionsMenu apps packages --include='*.tsx' --include='*.ts'`): `EntitiesListClient.tsx`,
`UsersListClient.tsx` e `playground/page.tsx` em `apps/app`, mais os 3 testes de `apps/app` que mockam o
componente. A lista bate com a §1.5 do plano.

## Códigos de erro novos

Nenhum. Nenhuma chave de i18n nova: o componente usa as chaves existentes de `components.actionMenu`.

## Desvios do plano

1. **O teste espera o foco entrar no menu antes do Enter.** O plano não previa isso. O `rc-dropdown` agenda
   o foco do menu com `raf(focusMenu, 3)` quando ele abre e não cancela esse agendamento quando o menu fecha
   (`rc-dropdown/es/hooks/useAccessibility.js`, efeito com `autoFocus`). No jsdom o `fireEvent.keyDown` chega
   antes desses 3 frames, a confirmação abre, e só depois o `raf` atrasado puxa o foco para o `<li>` do menu
   já escondido. Resultado: os casos 3, 4 e 5 falharam com `activeElement` igual ao `<li>`. O helper
   `pressEnterOn` agora faz `waitFor` até o `document.activeElement` estar dentro do `[role="menu"]`, que é a
   condição real de quem usa teclado: o Enter vem depois de o menu receber o foco. O componente não mudou por
   causa disso. Fica para o `/test` confirmar no browser que um Enter rápido não deixa o foco preso no menu
   (ver abaixo).
2. **"Confirmação fechada" se verifica por `queryByRole("tooltip")`, não pelo título.** O antd mantém o painel
   montado depois de fechar, só com a classe `ant-popover-hidden`, então `queryByText(título)` continua
   achando o nó. Uma sonda no jsdom mostrou `queryAllByRole("tooltip")` em 1 com a confirmação aberta e em 0
   depois de fechar (o `getComputedStyle` deu `display: none`), e o botão "Não" saiu da árvore de
   acessibilidade do mesmo jeito. Não usei seletor de classe do antd.
3. **Plano B do §8 não foi preciso.** O `afterOpenChange` dispara no jsdom sem `ConfigProvider` com
   `motion: false`: o caso 2 passa, e removê-lo derruba o caso 2 (mutação M2 abaixo).

## Prova por mutação

Rodei `NODE_ENV=test npx vitest run __tests__/actionMenu.test.tsx` em `packages/design-system` com cada
mutação aplicada e restaurei o arquivo depois.

| Mutação | Casos que caíram |
|---------|------------------|
| M1: componente original (`git show HEAD:…/action-menu.tsx`) | 8 de 13: casos 1, 2, 3, 4, 5, 6, 8, 9 |
| M2: sem `afterOpenChange` | 1: caso 2 (foco em "Não") |
| M3: sem o `addEventListener` do Esc | 1: caso 3 (Esc) |
| M4: `onOpenChange` repassa `true` (`setConfirmOpen(nextOpen)`) | 2: caso 2 e caso 7 ("Editar" não abre a confirmação) |

Em M1 o caso 6 (clique do mouse) também cai, o que o plano não listava. Com o componente antigo, o
`fireEvent.click` no `<li>` não chega ao `<span>` interno do rótulo. No browser real o clique sobre o texto
acertava o `<span>`, então isso é diferença de alvo do clique e não regressão do mouse. Em M4 o caso 7 cai
porque o `fireEvent.click` no gatilho "⋮" borbulha até o `<span>` do `Popconfirm` e abriria a confirmação
junto com o menu.

## Validação

| Gate | Comando | Resultado |
|------|---------|-----------|
| Testes do pacote | `pnpm --filter @repo/design-system test` | 6 arquivos, 54 testes, todos passando (13 em `actionMenu.test.tsx`) |
| Estabilidade | `npx vitest run __tests__/actionMenu.test.tsx`, 3 vezes seguidas | 13/13 nas 3 |
| Typecheck | `pnpm --filter @repo/design-system typecheck` | exit 0 |
| Lint | `pnpm check` | 856 arquivos, exit 0, nenhuma correção |
| Testes de `apps/app` que mockam o `ActionsMenu` | `npx vitest run __tests__/entitiesListReadOnly.test.tsx __tests__/usersListArchiveLabels.test.tsx __tests__/usersListLastAccess.test.tsx` em `apps/app` | 3 arquivos, 25 testes, todos passando |
| Paridade de i18n | não rodado | nenhuma chave mudou |
| `pnpm --filter app typecheck` | não rodado | as props do `ActionsMenu` não mudaram |

Não subi app nem browser. O índice ficou como estava: `git diff --cached --stat` mostra só o rename de
`specs/plan-entitlements.md`, que veio de outra rodada.

## A verificar no `/test`

Nada abaixo foi medido em browser. O roteiro completo está na §9 do plano. Os pontos onde o jsdom não prova
nada:

- **O Enter que abre a confirmação não a fecha nem a confirma.** O jsdom não gera `keypress` nem clique
  sintético a partir do Enter. Repro: Tab até o "⋮", Enter, seta para baixo até "Excluir", Enter, e
  verificar que a confirmação continua aberta e que `document.activeElement` tem o texto "Não".
- **Enter rápido no menu.** Por causa do `raf(focusMenu, 3)` do `rc-dropdown` (desvio 1), se o Enter em
  "Excluir" vier menos de 3 frames depois de o menu abrir, o foco pode acabar no `<li>` escondido em vez de
  "Não". Pelo teclado isso parece impossível (o usuário precisa da seta para chegar em "Excluir"), mas vale
  medir `document.activeElement` depois do fluxo de teclado normal.
- **Mouse no browser real**: clique no "⋮" e em "Excluir" abre a confirmação ancorada no "⋮"; clique fora
  fecha sem puxar o foco; clique no "⋮" com a confirmação aberta fecha a confirmação. O jsdom só cobriu a
  abertura (caso 6). O E2E `apps/e2e/tests/entityCrud.spec.ts:68-72` também precisa continuar passando.
- **Layout**: tamanho e posição do "⋮" na célula antes e depois do `<span className="inline-flex">`; a
  confirmação inteira visível a 390 px com `placement="bottomRight"`; light e dark; pt-br, en e es.
- **Contorno de foco** visível em "Não" e "Sim" nos dois temas.
- **`aria-expanded`** lido no browser com o menu fechado, aberto e com a confirmação aberta. O jsdom cobriu
  `false` → `true` → `false` pelo Enter em "Editar" (caso 8), mas não o fechamento por Esc nem por clique
  fora.
- **Esc com o menu aberto** (antes de escolher o item) continua devolvendo o foco ao "⋮". Não há teste para
  isso; o plano escolheu a estrutura H justamente para preservar esse comportamento.

## Lacunas de teste conhecidas

- Fechamento por clique fora e por clique no "⋮" com a confirmação aberta: sem teste de componente.
- `aria-expanded` voltando a `false` por Esc ou clique fora: sem teste.
- Itens customizados (`items`, como o "Approve" do playground) não abrirem a confirmação: sem teste
  específico. O caso 7 cobre só "Editar".
- Anúncio de leitor de tela: sem instrumento.

## Decisões em aberto

Nenhuma nova. As perguntas da §11 do plano seguem com a opção adotada, e os achados da §13.3 (Espaço não
ativa item de menu, `role="tooltip"` no painel, foco no `body` depois de excluir a linha) ficam para o
`/spec --sync`.
