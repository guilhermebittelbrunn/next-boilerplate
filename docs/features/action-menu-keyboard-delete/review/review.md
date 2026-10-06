# Revisão: "Excluir" do menu de ações funciona pelo teclado

Escopo: `packages/design-system/components/ui/action-menu.tsx` e
`packages/design-system/__tests__/actionMenu.test.tsx`. O working tree também traz a auditoria do backlog
desta rodada (`specs/*` e o rename de `specs/plan-entitlements.md`), revisada só por segredo e consistência.

## Branch

- Nome: `design-system/fix/action-menu-keyboard-delete`.
- Origem: renomeada de `guilhermebittelbrunn/spec-sync` com `git branch -m`. A branch antiga não seguia
  `<project>/<type>/<title>`, não tinha upstream e não tinha commit à frente de `origin/main`
  (`git log --oneline origin/main..HEAD` vazio), então o rename era seguro. Base: `d92d21b` (`origin/main`).
- Validação pelo regex do `/review`: `branch OK: design-system/fix/action-menu-keyboard-delete`.
- O nome cobre só o código. O commit `docs(specs)` da auditoria entra na mesma PR, como nas PRs #35 a #39,
  em que a auditoria do backlog veio junto da feature. O assunto principal da PR é o `design-system`, por
  isso o prefixo.

## Rodada 2: defeito D1 do `/test`

O `/test` mediu (`test/report.md` §1) que, a 390 px, a confirmação ficava em x -49 → 341 (pt-br) e
-49 → 331 (es), nas listas de entidades e de usuários do admin, nos dois temas. Com o código de `main` ela
ficava em 0 → 390. O título aparecia cortado como "cluir registro".

### Causa, confirmada pela leitura do antd e do `@rc-component/trigger`

- `antd/es/_util/placements.js`, `getOverflowOptions`: só os placements `top` e `bottom` recebem `shiftX`
  (`arrowOffsetHorizontal * 2 + arrowWidth`). `bottomRight` recebe só `adjustX`/`adjustY`, que **viram** o
  painel para o lado oposto mas não o **deslocam**.
- `@rc-component/trigger/es/hooks/useAlign.js:419-436`: o deslocamento para dentro da área visível só roda
  quando `shiftX` é número ou `true`. Com `bottomRight`, a virada para `bottomLeft` piora o estouro (o painel
  passaria a começar na esquerda do "⋮"), então o trigger mantém o alinhamento pela direita do "⋮" e o painel
  de ~390 px sai pela esquerda.
- A área visível vem dos ancestrais com scroll do **painel** (`useAlign.js:92`, `collectScroller(popupEle)`),
  que é portal no `body`. O wrapper com scroll da tabela não recorta essa área: ela é a viewport inteira.
- Em `main` o placement era o padrão (`top`), que tem `shiftX`; por isso o painel era empurrado até x 0.

### Correção

`packages/design-system/components/ui/action-menu.tsx:94`: `placement="bottomRight"` passou a
`placement="bottom"`. O painel continua abaixo do "⋮", centralizado nele, e o antd volta a deslocá-lo
horizontalmente para dentro da viewport. Como `bottom` alinha pelo centro (`points: ['tc', 'bc']`), a seta
segue o "⋮" mesmo com o painel deslocado (`Popup/Arrow.js` usa `arrowPos.x` nesse caso). Com `bottomRight`
ela ficava presa no canto do painel.

A sugestão do QA de limitar a largura (`maxWidth: calc(100vw - 32px)`) não resolveria sozinha: sem `shiftX` o
painel continua alinhado pela direita do "⋮" (x 341), e com 358 px de largura começaria em x -17. A opção
`autoAdjustOverflow={{ shiftX: true }}` funcionaria em runtime, mas o tipo `AdjustOverflow` do antd só aceita
`adjustX`/`adjustY` e exigiria cast. Por isso fiquei com a troca de placement.

Isso derruba a premissa da decisão D7 do plano: lá, `bottomRight` foi escolhido porque o painel centrado
"tende a passar da borda direita". Pela leitura, o centrado é justamente o que o antd consegue deslocar.

Posição esperada pela leitura, a medir no `/test` (item 9 abaixo): a 390 px, o centro do painel cai no
centro do "⋮" (perto de x 321). O lado direito estoura e o shift empurra o painel até `right = 390`, ficando
0 → 390 em pt-br e 10 → 390 em es (380 px de largura). A trava do `useAlign.js:432` só age se o "⋮" estiver a
menos de `numShiftX` da borda direita, o que não é o caso medido.

### Gates da rodada 2

| Gate | Resultado |
|------|-----------|
| `pnpm --filter @repo/design-system test` | 6 arquivos, 60 testes, todos passando (inclui os 6 casos que o `/test` criou) |
| `pnpm --filter @repo/design-system typecheck` | exit 0 |
| `pnpm check` | 856 arquivos, nenhuma correção |

O jsdom não tem layout, então nenhum teste de componente prova a posição. Quem mede é o `/test`.

## Revisão: ActionsMenu pelo teclado + auditoria do backlog

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `packages/design-system/components/ui/action-menu.tsx:84-87`: o `onConfirm` novo chamava `onDelete?.()` e
  descartava o retorno. O antd (`_util/ActionButton.js`, com `emitEvent` e `quitOnNullishReturnValue` no
  `Popconfirm`) só mostra carregamento no "Sim" e espera antes de fechar quando o `onConfirm` devolve uma
  promise. Antes da mudança o componente passava `onConfirm={onDelete}`, então um fork com
  `onDelete={() => mutation.mutateAsync(id)}` tinha esse comportamento e o perderia em silêncio. Os dois
  consumidores atuais usam `.mutate()`, que devolve `undefined`, e não mudam. Corrigido: o `onConfirm` agora
  faz `return onDelete?.()`. A assinatura `onDelete?: () => void` não mudou.

### 🟢 Sugestão / nit

- `packages/design-system/components/ui/action-menu.tsx:97,152`: dentro do `<span className="inline-flex">`,
  o `w-full h-full` do botão passa a valer o tamanho do conteúdo (`p-2` + ícone de 24 px). Antes ele ocupava a
  largura da célula. A área de hover e de clique encolhe, e o anel de foco fica redondo. O plano já previa
  isso (§5.1). Não é defeito por leitura; vai para a medição do `/test`.
- `docs/features/plan-entitlements/analyze/plan.md:3`: o link para `specs/plan-entitlements.md` morreu com o
  rename desta auditoria. A própria auditoria já registrou isso em `specs/BACKLOG.md:414` e `:736`. Não
  corrigi: está fora do diff, e corrigir aqui deixaria aquela linha do backlog desatualizada no mesmo commit.

### ✅ OK

- Props e tipos exportados (`ActionMenuItem`, `ActionMenuDeleteLabels`, `ActionsMenuProps`) iguais aos do
  `HEAD`. Os consumidores são os três que o handoff lista: `EntitiesListClient.tsx:129`,
  `UsersListClient.tsx:153` e `playground/page.tsx:1271`. Nenhum precisa mudar, e por isso não rodei o
  `pnpm --filter app typecheck`.
- Componente presentacional: sem fetch, sem sessão, nenhuma string de UI nova (usa
  `components.actionMenu` e os `deleteLabels`). Nenhuma chave de i18n tocada.
- O único comentário (`:73-74`) explica o porquê de um edge case (o Enter que abriu a confirmação não pode
  ativar o botão) e não cita o fluxo.
- Confirmado por leitura do antd 5.29.3, `rc-dropdown` 4.2.1 e `@rc-component/trigger` 2.3.1:
  - o `onOpenChange` do `Popconfirm` só repassa `false`, então o clique no `<span>` (inclusive o clique de
    item do menu, que borbulha pela árvore React do portal) não abre a confirmação por conta própria;
  - o clique fora fecha a confirmação: o `useWinClick` escuta `mousedown`, que já passou quando o item abre a
    confirmação, então o mesmo clique não a fecha;
  - `onCancel` fecha antes de chamar o callback (`popconfirm/index.js:60-64`), e o `onConfirm` fecha pelo
    `ActionButton` quando o retorno não é promise;
  - o Esc do `Popover` só escuta o filho (`popover/index.js:62-66`), e daí vem a necessidade do listener em
    `window` (`:55-68`), registrado só enquanto aquela instância está com a confirmação aberta;
  - `aria-expanded` volta a `false` em Esc e clique fora: o `rc-dropdown` chama `onVisibleChange(false)`, e o
    antd repassa para `onOpenChange` (`dropdown/dropdown.js:114-120`). O clique de item passa por
    `onMenuClick` (`:132-140`).
- Testes novos: imports explícitos de `vitest`, sem `toBeInTheDocument`, sem seletor de classe do antd nos
  casos novos. O mock é só `vi.fn()` nos callbacks.
- Auditoria do backlog: nenhum segredo nos diffs de `specs/*` e de `docs/features/plan-entitlements/spec.md`
  (varri senha, token, chave, `sk_`, `whsec_`, `AIza`, chave privada e e-mail). As ocorrências de "token" e
  "senha" descrevem comportamento, e as de `STRIPE_SECRET_KEY` são nome de variável. O link de pesquisa da
  spec movida (`../../../specs/research/saas-starter-feature-benchmark.md`) resolve. A recomendação #1 do
  `BACKLOG.md:181-195` é esta tarefa.
- Artefatos de `docs/features/action-menu-keyboard-delete/`: sem segredo. O único e-mail é
  `qa-action-menu@example.com` (`analyze/plan.md:280`), domínio de exemplo.

### 👁 Verificar no `/test`

Em ordem de risco. O primeiro item sustenta o corte da feature.

1. O Enter que abre a confirmação não a fecha nem a confirma, e o foco termina em "Não". O jsdom não gera o
   clique sintético do Enter e não roda animação de verdade. Repro: Tab até o "⋮", Enter, seta até "Excluir",
   Enter; conferir que o painel segue aberto e que `document.activeElement.textContent` é o rótulo de "Não"
   nos 3 idiomas.
2. Foco preso no `<li>` escondido. O `rc-dropdown` agenda `raf(focusMenu, 3)` ao abrir e não cancela ao fechar
   (`useAccessibility.js`). Repro: mesmo fluxo do item 1, medindo `document.activeElement` meio segundo
   depois do segundo Enter. Repetir com as setas e o Enter digitados o mais rápido possível depois de abrir
   o menu.
3. Esc, "Não" e "Sim" devolvem o foco ao "⋮" da mesma linha. Repro: abrir pelo teclado e, em cada caso,
   medir `document.activeElement.getAttribute("aria-label")` e o índice da linha.
4. Mouse: clicar no "⋮" e em "Excluir" abre a confirmação ancorada no "⋮"; clicar fora fecha sem puxar o
   foco; clicar no "⋮" com a confirmação aberta fecha a confirmação e abre o menu. O E2E
   `apps/e2e/tests/entityCrud.spec.ts:68-72` continua passando.
5. Esc com o menu aberto, antes de escolher item, devolve o foco ao "⋮". Não há teste de componente para isso.
6. Layout: tamanho e posição do "⋮" na célula antes e depois do `<span className="inline-flex">`
   (`getBoundingClientRect` do botão e da célula), área de hover, light e dark, pt-br, en e es. A posição da
   confirmação ficou no item 9.
7. Contorno de foco visível em "Não" e "Sim" nos dois temas.
8. `aria-expanded` no browser com o menu fechado, aberto e com a confirmação aberta. O fechamento por Esc e
   por clique fora está confirmado por leitura; falta a medição.
9. D1 (rodada 2), posição da confirmação com `placement="bottom"`. Repro: viewport 390 × 844, `/pt-br/entities`
   e `/es/entities` com o usuário comum e `/pt-br/admin/users` com o admin ("Arquivar"), claro e escuro;
   rolar até a coluna "Ações", abrir pelo "⋮" e por "Excluir". Medir `getBoundingClientRect()` do
   `.ant-popover` visível: esperado `left >= 0` e `right <= 390`, título inteiro.
   Conferir também que a seta aponta para o "⋮" (centro da seta dentro do `getBoundingClientRect` do botão)
   e que o painel abre abaixo dele. No desktop (1280 × 800), sem regressão: painel abaixo do "⋮", seta no
   "⋮", inteiro na viewport. Abrir também pela última linha visível, para ver a virada para cima quando falta
   espaço embaixo.

## Correções aplicadas

| Arquivo | O que mudou |
|---------|-------------|
| `packages/design-system/components/ui/action-menu.tsx:86` | `onDelete?.();` passou a `return onDelete?.();` dentro do `onConfirm`, para o antd voltar a esperar um `onDelete` assíncrono, como antes da mudança |
| `packages/design-system/components/ui/action-menu.tsx:94` (rodada 2) | `placement="bottomRight"` passou a `placement="bottom"` no `Popconfirm`, para o antd deslocar o painel para dentro da viewport (D1) |

Antes e depois, porque muda comportamento num caminho que nenhum consumidor atual usa:

```tsx
// antes
onConfirm={() => {
    returnFocusToTrigger();
    onDelete?.();
}}
// depois
onConfirm={() => {
    returnFocusToTrigger();
    return onDelete?.();
}}
```

Com `onDelete` síncrono (os consumidores atuais e os `vi.fn()` dos testes) o caminho é o mesmo: retorno
`undefined` e o `ActionButton` fecha na hora.

## Raio de impacto

Nenhuma mudança de contrato. O `ActionsMenu` tem os mesmos consumidores de antes (`apps/app`: lista de
entidades, lista de usuários do admin e playground). Os testes de `apps/app` que mockam o componente
(`entitiesListReadOnly`, `usersListArchiveLabels`, `usersListLastAccess`) não dependem da estrutura interna.
A única mudança de DOM fora do menu é o `<span className="inline-flex">` em volta do gatilho.

## Lacunas de teste

| Lacuna | Veredito |
|--------|----------|
| Fechamento por clique fora e por clique no "⋮" com a confirmação aberta (handoff) | fechada pelo `/test` (2 casos novos em `actionMenu.test.tsx`) |
| `aria-expanded` voltando a `false` por Esc ou clique fora (handoff) | parcialmente fechada pelo `/test`: o caso do Esc com o menu aberto confere o `"false"`; o clique fora segue confirmado só por leitura |
| Itens customizados (`items`) não abrirem a confirmação (handoff) | fechada pelo `/test` |
| Anúncio de leitor de tela (handoff) | fora de escopo: não há instrumento no repo |
| `onDelete` que devolve promise mantém o "Sim" carregando e fecha só ao resolver (rodada 1 desta revisão) | fechada pelo `/test`, com mutação M5 conferida |
| Posição da confirmação na viewport (rodada 2) | continua aberta como teste: o jsdom não tem layout. Medição no item 9 |

## Decisões em aberto

Nenhuma. O nome da branch e o rename foram decididos aqui (seção Branch).

## Gates

| Gate | Comando | Resultado |
|------|---------|-----------|
| Typecheck | `pnpm --filter @repo/design-system typecheck` | exit 0, sem erro (depois da correção) |
| Lint | `pnpm check` | 856 arquivos, nenhuma correção |
| `apps/app` typecheck | não rodado | props e tipos do `ActionsMenu` não mudaram |
| Paridade de i18n | não rodado | nenhuma chave tocada |
| Suíte Vitest | não rodada aqui | é do `/test`; o handoff mediu 13/13 no arquivo e 54/54 no pacote antes da correção |

## Plano de commits

Antes do primeiro commit, o índice não está vazio: `git diff --cached --stat` mostra o rename
`specs/plan-entitlements.md => docs/features/plan-entitlements/spec.md`, que pertence ao commit 2. Rode
`git restore --staged specs/plan-entitlements.md docs/features/plan-entitlements/spec.md` (o arquivo
continua no lugar novo, o antigo continua apagado no working tree) e confira que `git diff --cached --stat`
sai vazio. No commit 2, o `git add` dos dois caminhos refaz o rename.

1. `fix(design-system): open the ActionsMenu delete confirmation from the keyboard`
   - `packages/design-system/components/ui/action-menu.tsx`
   - `packages/design-system/__tests__/actionMenu.test.tsx`
   - Corpo sugerido: o item "Excluir" abre um `Popconfirm` controlado pelo Enter e pelo clique; o foco vai para
     "Não" e volta ao gatilho em Esc, "Não" e "Sim"; a confirmação abre abaixo do gatilho, centralizada, e o
     antd a desloca para caber na viewport; o gatilho ganha `aria-haspopup="menu"` e `aria-expanded`; um
     `onDelete` assíncrono continua segurando o "Sim" até resolver. O `aria-*` vai no
     mesmo commit porque separar exigiria `git add -p` no mesmo arquivo.
2. `docs(specs): audit backlog after active sessions and plan entitlements`
   - `specs/BACKLOG.md`
   - `specs/account-security-mfa.md`
   - `specs/observability-logging.md`
   - `specs/teams-organizations.md`
   - `specs/plan-entitlements.md` (remoção)
   - `docs/features/plan-entitlements/spec.md` (rename com edição)
3. `docs(features): action-menu-keyboard-delete`
   - `docs/features/action-menu-keyboard-delete/STATE.md`
   - `docs/features/action-menu-keyboard-delete/analyze/plan.md`
   - `docs/features/action-menu-keyboard-delete/develop/handoff.md`
   - `docs/features/action-menu-keyboard-delete/review/review.md`
   - `docs/features/action-menu-keyboard-delete/test/criterios-aceite.md`
   - `docs/features/action-menu-keyboard-delete/test/report.md`
   - (`test/e2e/*.png` fica de fora: o `.gitignore:300` descarta)

Título de PR sugerido: `fix(design-system): open the ActionsMenu delete confirmation from the keyboard`.
Depois do último commit, o `/review` pergunta antes de `git push -u origin design-system/fix/action-menu-keyboard-delete`.

Commits realizados: _(preenchido pelo `/review`)_
