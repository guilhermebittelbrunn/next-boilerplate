# Plano: "Excluir" do menu de ações funciona pelo teclado

Tarefa direta, sem spec. Origem: a recomendação #1 da auditoria em `specs/BACKLOG.md` ("Recomendação para a
próxima rodada", `:185-195`) e os dois achados de `accessibility-conformance` na tabela de `:625-626`. Plano
feito em rodada autônoma do `/cycle`: as decisões tomadas sem perguntar estão na §12, e a §11 traz as
perguntas já com a opção adotada.

As referências `arquivo:linha` do repo foram conferidas neste checkout em 2026-10-06. As de biblioteca
apontam para `node_modules/.pnpm/antd@5.29.3_…/node_modules/`, abreviado aqui como `<nm>/`: `antd` 5.29.3,
`rc-menu` 9.16.1, `rc-dropdown` 4.2.1, `@rc-component/trigger` 2.3.1.

## 0. Sumário do desenho

- O `Popconfirm` sai de dentro do rótulo do item "Excluir" e passa a ser **controlado por estado**
  (`confirmOpen`). O `onClick` do item abre a confirmação. O `rc-menu` chama esse `onClick` tanto no clique
  quanto no Enter (`<nm>/rc-menu/es/MenuItem.js:129-145`), então mouse e teclado passam pelo mesmo caminho.
- A confirmação se ancora no gatilho "⋮", que continua visível depois que o menu fecha. O `Popconfirm`
  embrulha um `<span className="inline-flex">` que contém o `Dropdown` e o botão.
- Ao abrir, o foco vai para o botão "Não" (cancelar), via `afterOpenChange` + `id` gerado por `useId`. Esc,
  "Não" e "Sim" devolvem o foco ao gatilho.
- O gatilho passa a publicar `aria-haspopup="menu"` e `aria-expanded`, espelhando o `onOpenChange` do
  `Dropdown`. Fica no mesmo arquivo e no mesmo teste, sem dependência nem chave nova (§12, D5).
- Um arquivo de produção (`packages/design-system/components/ui/action-menu.tsx`) e o teste dele
  (`packages/design-system/__tests__/actionMenu.test.tsx`). A API pública do `ActionsMenu` não muda. Sem
  SDK, API, i18n, variável de ambiente ou infra.

## 1. Contexto

### 1.1 Problema

Hoje o item "Excluir" é montado assim (`packages/design-system/components/ui/action-menu.tsx:75-98`):

```tsx
{
    key: "delete",
    label: (
        <Popconfirm title=… description=… onConfirm={onDelete} … className="flex items-center justify-between gap-2 ">
            <span>{deleteAction}</span>
        </Popconfirm>
    ),
    danger: true,
}
```

O `Popconfirm` só abre com um **clique no `<span>` do rótulo**. Pelo teclado, a sequência é esta:

1. Enter no item "Excluir" cai em `onInternalKeyDown` do `rc-menu`, que chama o `onClick` do item e o
   `onItemClick` do menu (`<nm>/rc-menu/es/MenuItem.js:137-145`). Nenhum evento de clique chega ao `<span>`.
2. O `onItemClick` sobe até o `onMenuClick` do `Dropdown` do antd, que fecha o menu
   (`<nm>/antd/es/dropdown/dropdown.js:132-140`).
3. O `<li>` focado some junto com o menu. O `rc-dropdown` só devolve o foco ao gatilho em Esc e Tab
   (`<nm>/rc-dropdown/es/hooks/useAccessibility.js:13-19`, `:29-48`), então o foco cai no `body`.

Resultado: a confirmação nunca abre e o usuário de teclado perde o lugar na página. O `/test` de
`accessibility-conformance` mediu isso em 2026-09-29 (`specs/BACKLOG.md:625`). Fere o WCAG 2.1.1 (teclado).

O mouse funciona por acaso: o clique acerta o `<span>`, o `Popconfirm` abre e o mesmo clique, ao borbulhar
até o `<li>`, fecha o menu. A confirmação fica ancorada num `<span>` que acabou de sumir.

Achado vizinho (`specs/BACKLOG.md:626`): o botão "⋮" (`action-menu.tsx:104-113`) não publica
`aria-haspopup` nem `aria-expanded`. O antd não os coloca no filho do `Dropdown`
(`<nm>/rc-dropdown/es/Dropdown.js`, o `cloneElement` só mexe em `className` e `ref`), e o leitor de tela não
anuncia que o botão abre um menu.

### 1.2 Objetivo e corte

**Dentro do corte:**

- Enter no item "Excluir" (ou no rótulo customizado, como o "Arquivar" do admin) abre a confirmação.
- O foco entra na confirmação ao abrir e volta ao gatilho ao fechar por Esc, "Não" ou "Sim".
- O clique do mouse continua abrindo a mesma confirmação, com o mesmo texto e os mesmos botões.
- O gatilho anuncia `aria-haspopup="menu"` e `aria-expanded` correto (D5).

**Fora do corte** (achados, §13.3):

- Espaço para ativar item de menu. O `rc-menu` só trata Enter (`MenuItem.js:139`), e isso vale para
  "Editar" e para os itens customizados também. É defeito da biblioteca para todos os itens, não do
  "Excluir".
- `role="tooltip"` no painel da confirmação (`<nm>/rc-tooltip/es/Popup.js:17`). Para uma confirmação o certo
  seria `alertdialog`. Trocar exige outro componente (D3).
- Prender o foco dentro da confirmação. O `Popconfirm` não é modal: Tab sai dele, e um clique fora o fecha.
- Para onde vai o foco quando a linha some depois de excluir. Na lista de entidades a linha sai da tabela após
  a mutação e o foco cai no `body`. Isso é da `Table`, não do menu.
- Contraste de `--destructive` sobre `--accent` (`specs/BACKLOG.md:627`) e os seed tokens do antd que viram
  preto (`:628`). O ícone do `Popconfirm` já sai preto hoje.

### 1.3 Apps impactados

| Onde | Muda? | Evidência |
|------|-------|-----------|
| `packages/design-system` | Sim, `action-menu.tsx` e `__tests__/actionMenu.test.tsx` | §5.1 e §8 |
| `apps/app` | Não no código. Herdam a correção os 3 call sites com `onDelete` | ver §1.5 |
| `apps/api`, `packages/sdk`, `packages/internationalization` | Não | Nenhuma chave nova: título, descrição, "Sim" e "Não" já existem em `translations/components/ui/action-menu.ts:1-32` |
| `apps/web` | Não | `rg ActionsMenu apps/web` vazio |
| `apps/e2e` | Não no código. O fluxo segue igual (§1.5) | `apps/e2e/tests/entityCrud.spec.ts:68-72` |

Área do painel: comum (entidades) e admin (usuários). Modo de produto: indiferente. Plano/assinatura: não.
Genérico: sim, é componente do design system e cabe em `packages/*`.

### 1.4 Fontes

- `specs/BACKLOG.md:185-195` (recomendação) e `:625-626` (achados). Não há spec, card nem link externo.
- Código-fonte do antd e dos pacotes `rc-*` em `node_modules`, lido para escolher a abordagem (§1.6).

### 1.5 Raio de impacto: quem usa `ActionsMenu`

| Call site | `onDelete` | Observação |
|-----------|-----------|------------|
| `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/(home)/EntitiesListClient.tsx:129-138` | `() => deleteEntityMutation.mutate(record.id)`, ou `undefined` sob impersonação (`:130-134`) | Rótulos padrão: "Excluir" / "Excluir registro" |
| `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/(home)/UsersListClient.tsx:153-169` | `() => deleteUserMutation.mutate(record.id)`, ou `undefined` na própria linha (`:160-164`) | `deleteLabels` com "Arquivar" (`:154-159`) |
| `apps/app/app/[locale]/(authenticated)/(common)/(pages)/playground/page.tsx:1271-1283` | `noop` | Item customizado "Approve" + editar + excluir. Bom lugar para o `/test` confirmar sem apagar dado |

Testes que **mockam** o `ActionsMenu` e não enxergam a mudança: `apps/app/__tests__/entitiesListReadOnly.test.tsx:61`,
`usersListArchiveLabels.test.tsx:40`, `usersListLastAccess.test.tsx:38`. Continuam valendo porque as props
não mudam.

E2E: `apps/e2e/tests/entityCrud.spec.ts:68-72` clica no `menuitem` "Excluir" e depois no botão "Sim". Com a
mudança o `<li>` passa a ter só o texto como rótulo, o clique cai no `onClick` do item e a confirmação abre
ancorada no gatilho. Os seletores (`getByRole("menuitem", { name })`, `getByRole("button", { name: "Sim" })`)
continuam achando os mesmos elementos. O job `e2e` do CI confirma.

Documentos: `docs/review-checklist.md:113` e `docs/feature-analysis-guide.md:209` citam `ActionsMenu` só pelo
nome. Nenhum cita linha de `action-menu.tsx` fora do `BACKLOG.md`, que fica com o `/spec --sync`.

### 1.6 Por que esta abordagem (o que o código do antd mostra)

Foram avaliadas quatro formas de ancorar a confirmação. A escolhida é a **H**.

| # | Estrutura | Problema medido por leitura |
|---|-----------|-----------------------------|
| C | Manter o menu aberto enquanto confirma, com o `Popconfirm` no rótulo | O `Dropdown` fecha em qualquer clique de item (`dropdown.js:132-140`) e em qualquer Esc via `window` (`useAccessibility.js:29-33`, `:49-51`). Seria preciso controlar o `open` do `Dropdown` e filtrar a origem do fechamento, com o painel da confirmação fora da árvore DOM do menu. Muito acoplamento ao interno do antd |
| F | `Dropdown` > `Popconfirm` > `button` | O `rc-dropdown` guarda em `childRef` o ref do filho direto (`Dropdown.js`, `composeRef(childRef, getNodeRef(children))`, e no React 19 `supportRef` aceita qualquer elemento: `<nm>/rc-util/es/ref.js:50-53`). O filho passaria a ser o `Popconfirm`, cujo ref é o handle do `Tooltip` do antd: `{ forceAlign, forcePopupAlign, nativeElement }` (`<nm>/antd/es/tooltip/index.js:76-85`), sem `focus`. O Esc do menu (`useAccessibility.js:16`) deixaria de devolver o foco ao gatilho. Regressão do que já funciona |
| G | `Popconfirm` > `Dropdown` > `button` | O `Trigger` do `Popconfirm` precisaria achar o DOM do `Dropdown` do antd, que é componente de função sem `forwardRef` (`dropdown.js:25`). Depende de o `ref` atravessar `omit(props)` até o `rc-dropdown` no React 19. Não dá para provar lendo |
| **H** | `Popconfirm` > `<span>` > `Dropdown` > `button` | O alvo do `Popconfirm` é um elemento DOM, então o `Trigger` acha o nó sem truque. O `childRef` do `rc-dropdown` continua sendo o `<button>`, então o Esc do menu segue devolvendo o foco |

Comportamentos do antd que o desenho da H precisa contornar:

1. **O `Popconfirm` também reage a clique no `<span>`.** O `Trigger` clona `onClick` no filho
   (`<nm>/@rc-component/trigger/es/index.js:348-360`), e cliques no "⋮" ou em itens do menu (o painel do menu é
   portal, mas descende do `<span>` na árvore React) borbulham até ele e pedem `open: true`. Por isso o
   `onOpenChange` do `Popconfirm` **ignora `true`** e só repassa `false`. Quem abre a confirmação é o `onClick`
   do item. O clique fora continua fechando (`useWinClick`, `index.js:367`), assim como um clique no "⋮" com a
   confirmação aberta (`index.js:351`, `clickToHide`).
2. **O Esc nativo do `Popover` só escuta o filho.** O `Popover` clona `onKeyDown` no `<span>`
   (`<nm>/antd/es/popover/index.js:62-66`, `:97-104`). O painel da confirmação é portal irmão do `<span>`, não
   descendente, então Esc com o foco em "Não" não chega lá. O componente registra um `keydown` em `window`
   enquanto `confirmOpen` for `true`, o mesmo padrão do `rc-dropdown` (`useAccessibility.js:49-51`).
3. **O foco inicial não pode ir no mesmo tick do Enter.** O Chrome dispara o `keypress` do Enter no elemento
   focado naquele instante. Se o foco fosse para um botão da confirmação ainda dentro do `keydown`, o mesmo
   Enter poderia ativar esse botão. O `afterOpenChange` (repassado até o `Trigger`:
   `<nm>/antd/es/tooltip/index.js:178`) só dispara depois da animação de abertura. O próprio antd foca botão
   com atraso pelo mesmo motivo (`<nm>/antd/es/_util/ActionButton.js:29-44`, `setTimeout`).
4. **`cancelButtonProps` não aceita `ref` no tipo.** `ButtonProps` é `BaseButtonProps` + atributos HTML, sem
   `ref` (`<nm>/antd/es/button/button.d.ts:34-35`), e todas as props são opcionais. Um objeto só com `ref`
   cai na checagem de tipo fraco do TypeScript. O componente passa `id` (atributo HTML tipado) gerado por
   `useId` e foca com `document.getElementById`. Não depende de nome de classe do antd e é único por linha.

## 2. Dados (Firestore)

N/A.

## 3. Contrato `@repo/sdk`

N/A.

## 4. API

N/A. A exclusão e o arquivamento continuam com os guards e as checagens atuais; o diff não toca em quem pode
excluir.

## 5. Front-end

### 5.1 `ActionsMenu` (`packages/design-system/components/ui/action-menu.tsx`)

Estado novo, todo local ao componente:

| Estado/ref | Para quê |
|------------|----------|
| `menuOpen` | Espelha o `onOpenChange` do `Dropdown` para o `aria-expanded`. O `Dropdown` continua não controlado: o antd chama `onOpenChange` tanto no gatilho (`dropdown.js:114-120`) quanto no clique de item (`:132-140`) |
| `confirmOpen` | Abre/fecha o `Popconfirm` controlado |
| `triggerRef` | O `<button>` "⋮", alvo da devolução de foco |
| `cancelButtonId` (`useId`) | Acha o botão "Não" para o foco inicial |

Comportamento:

- Item "Excluir": `label: deleteAction` (texto puro), `onClick: () => setConfirmOpen(true)`, `danger: true`,
  ícone e estilo iguais. A `className` morta do `Popconfirm` (`:91`) sai.
- `Popconfirm`: `open={confirmOpen}`, `placement="bottomRight"` (o mesmo do `Dropdown`, `:51`), mesmos
  `title`, `description`, `okText`, `cancelText`.
  - `onOpenChange(next)`: só `if (!next) setConfirmOpen(false)`.
  - `afterOpenChange(opened)`: `if (opened) document.getElementById(cancelButtonId)?.focus()`.
  - `onCancel`: devolve o foco ao gatilho. O antd já fecha antes (`popconfirm/index.js`, `onCancel` chama
    `settingOpen(false)`).
  - `onConfirm`: devolve o foco ao gatilho e chama `onDelete`. O `ActionButton` fecha quando o retorno é
    `undefined` (`quitOnNullishReturnValue`).
- Efeito: enquanto `confirmOpen`, `keydown` em `window` com `key === "Escape"` fecha e devolve o foco.
- O `Popconfirm` fica montado mesmo sem `onDelete`. Sem o item de excluir nada o abre, e o DOM das linhas fica
  igual com ou sem permissão. Fechado, ele não renderiza painel.
- Gatilho: `ref={triggerRef}`, `aria-haspopup="menu"`, `aria-expanded={menuOpen}`. `aria-label`, classes e
  `type` não mudam.

O `<span className="inline-flex">` é a única mudança de DOM visível fora do menu. O botão tem `h-full w-full`
(`:107`); dentro de um `inline-flex` ele encolhe ao conteúdo, que é o mesmo `p-2` + ícone `h-6 w-6`. A célula
da tabela é `align: "center"` nos dois call sites (`EntitiesListClient.tsx:127`, `UsersListClient.tsx:151`).
O `/test` mede o tamanho e a posição do gatilho antes e depois (§9).

### 5.2 Estados

| Estado | Como fica |
|--------|-----------|
| Sem `onDelete` (impersonação na lista de entidades, própria linha no admin) | Menu sem o item; o `Popconfirm` nunca abre |
| Menu aberto | `aria-expanded="true"`, foco no menu (`autoFocus`, `:49`) |
| Confirmação aberta | Menu fechado, `aria-expanded="false"`, foco em "Não" |
| Confirmação fechada por Esc, "Não" ou "Sim" | Foco no "⋮" da mesma linha |
| Confirmação fechada por clique fora | Foco onde o usuário clicou (o componente não puxa o foco de volta) |

## 6. i18n

Nenhuma chave nova. O componente reaproveita `components.actionMenu.*`
(`packages/internationalization/translations/components/ui/action-menu.ts:1-32`) e os `deleteLabels` do
admin (`UsersListClient.tsx:154-159`).

## 7. Autorização e segurança

Nenhuma mudança. A UI continua escondendo "Excluir" quando `onDelete` é `undefined`, e a API continua sendo a
proteção real. Sob impersonação a lista de entidades não passa `onDelete` (`EntitiesListClient.tsx:130-134`),
então o menu mostra só "Editar". Não há como abrir a confirmação por teclado nem por mouse.

## 8. Testes

Nível: **componente, Vitest + jsdom**, no `packages/design-system`. O setup existe:
`packages/design-system/vitest.config.mts` (`environment: "jsdom"`, alias `@repo`) e
`__tests__/actionMenu.test.tsx` já renderiza o `ActionsMenu` real e abre o menu com `fireEvent.click`
(`:56-66`). Não há `@testing-library/user-event` no pacote (`package.json`), então os testes usam
`fireEvent.keyDown` com `keyCode`. O `rc-menu` lê `e.which`, que o React deriva de `keyCode` no `keydown`.

Casos novos em `packages/design-system/__tests__/actionMenu.test.tsx`:

| # | Caso | O que prova |
|---|------|-------------|
| 1 | Abre o menu, Enter (`keyCode: 13`) no `menuitem` "Excluir": o título `deleteConfirmTitle` aparece e `onDelete` não é chamado | O defeito. Com o `Popconfirm` de volta no rótulo, este caso falha |
| 2 | Depois do caso 1, `waitFor` do `document.activeElement` igual ao botão "Não" | Foco entra na confirmação |
| 3 | Depois do caso 1, `keyDown` em `window` com `key: "Escape"`: título some, foco no gatilho, `onDelete` não chamado | Esc fecha e devolve o foco |
| 4 | Depois do caso 1, clique em "Não": fecha, foco no gatilho, `onDelete` não chamado | Cancelar |
| 5 | Depois do caso 1, clique em "Sim": `onDelete` chamado **uma vez** e foco no gatilho | Confirmar |
| 6 | Clique do mouse no `menuitem` "Excluir": a confirmação abre | O mouse segue funcionando |
| 7 | Enter em "Editar": `onEdit` chamado e nenhuma confirmação aparece | O `onOpenChange(true)` vindo do clique borbulhado é ignorado |
| 8 | Gatilho com `aria-haspopup="menu"` e `aria-expanded` `"false"` → `"true"` (abre) → `"false"` (Enter em "Editar") | Achado vizinho |
| 9 | `deleteLabels` customizados (`action: "Arquivar"`, `confirmTitle` próprio): Enter no item abre a confirmação com o título custom | O caminho do admin |

Notas para quem implementa:

- O painel do menu e o da confirmação podem nascer fora da árvore de acessibilidade enquanto o `Trigger`
  alinha. Se `findByRole("menuitem", …)` não achar, use `{ hidden: true }` ou
  `findByText(…).closest('[role="menuitem"]')`. Não troque por seletor de classe do antd.
- O `afterOpenChange` depende do fim da animação do `rc-motion`. No jsdom, sem `transitionend`, a expectativa
  é que ele dispare logo. Não foi medido: se o caso 2 não fechar, desligue a animação no teste com
  `<ConfigProvider theme={{ token: { motion: false } }}>` antes de mexer no componente.
- Prova por mutação, a registrar no handoff: voltar o `Popconfirm` para o rótulo derruba os casos 1, 2, 3, 4,
  5 e 9; tirar o `afterOpenChange` derruba o 2; tirar o listener de Esc derruba o 3; deixar o `onOpenChange`
  repassar `true` derruba o 7.

Sem teste de emulador nem app de pé: nada aqui depende de infra. O E2E (`entityCrud.spec.ts:68-72`) não
ganha caso novo. Ele já cobre o clique, e o teclado fica com o teste de componente e a passada do `/test`.

Comandos: `pnpm --filter @repo/design-system test`, `pnpm --filter @repo/design-system typecheck`,
`pnpm --filter app test` (os três testes que mockam o `ActionsMenu` devem continuar verdes), `pnpm check`.

## 9. O que o `/test` vai percorrer

Fluxos, todos com `agent-browser`:

1. **Teclado, lista de entidades** (`/entities`, usuário comum com ao menos uma entidade de QA, ex.
   `qa-action-menu-<data>`): Tab até o "⋮" da linha, Enter (e numa segunda volta, Espaço) abre o menu, seta
   para baixo até "Excluir", Enter. Esperado: confirmação aberta ancorada no "⋮", foco em "Não", leitor de
   `document.activeElement` confirmando. Esc fecha e o foco volta ao "⋮". Repetir e confirmar com Tab até
   "Sim" + Enter: a linha some.
2. **Teclado, playground** (`/playground`, seção "ActionsMenu"): o mesmo roteiro, confirmando com "Sim" sem
   apagar dado (`onDelete` é `noop`). Bom para medir foco e posição sem gastar entidade.
3. **Teclado, admin** (`/admin/users`, usuário admin): "Arquivar" numa conta de QA (`qa-action-menu@example.com`),
   abrir pelo Enter e **cancelar** com "Não" e com Esc. Arquivar de fato só se a conta for descartável. Na
   própria linha o item não existe.
4. **Mouse**: clique no "⋮" e em "Excluir" abre a mesma confirmação; clique fora fecha; clique no "⋮" com a
   confirmação aberta fecha a confirmação e abre o menu.
5. **Impersonação**: admin personificando um usuário comum, `/entities`: o menu tem só "Editar".
6. **`aria-expanded`**: ler o atributo do "⋮" fechado, com o menu aberto e com a confirmação aberta.

Combinações: light e dark, desktop e mobile (390 px), pt-br, en, es (rótulos "Excluir/Delete/Eliminar",
"Sim/Yes/Sí", "Não/No/No"; no admin "Arquivar" e equivalentes).

Medidas que o `/test` precisa trazer em texto:

- Tamanho e posição do "⋮" antes e depois (o `<span>` novo não pode mudar a célula).
- Confirmação inteira visível a 390 px, sem cortar à direita.
- **Contorno de foco visível** em "Não" e "Sim" nos dois temas. Se não aparecer, a causa provável é o achado
  dos seed tokens (`packages/design-system/providers/antd-app.tsx:17-21`). Registre como defeito herdado e não
  como reprovação desta tarefa, salvo se o contorno existia antes e sumiu.
- Que o mesmo Enter que abre a confirmação **não** a fecha (o risco do `keypress` descrito na §1.6, item 3).

Não verificável sem ferramenta própria: anúncio do leitor de tela (vira 🔒). Nada depende de infra externa.

## 10. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Enter em "Excluir" abre a confirmação**
  Com o menu de ações aberto pelo teclado e o foco em "Excluir", Enter fecha o menu e abre a confirmação com
  o título e a descrição do idioma ativo. `onDelete` não é chamado nesse momento. O mesmo vale para o rótulo
  customizado "Arquivar" da lista de usuários do admin, com o título e a descrição dele.

- [ ] **O foco entra na confirmação e não ativa nada sozinho**
  Ao abrir, o foco vai para o botão "Não". O Enter que abriu a confirmação não a fecha nem a confirma: a
  confirmação continua aberta até uma nova ação do usuário. O foco nunca fica no `body` nesse fluxo.

- [ ] **Esc fecha e devolve o foco ao gatilho**
  Com a confirmação aberta e o foco dentro dela, Esc fecha a confirmação sem chamar `onDelete`, e o foco
  volta ao botão "⋮" da mesma linha. Esc com o menu aberto (antes de escolher o item) continua fechando o
  menu e devolvendo o foco ao "⋮", como já acontecia.

- [ ] **"Não" cancela e "Sim" exclui uma única vez**
  "Não" fecha sem chamar `onDelete` e devolve o foco ao "⋮". "Sim" chama `onDelete` uma vez só, fecha a
  confirmação e devolve o foco ao "⋮". Na lista de entidades a linha some depois da mutação, e o foco pode
  cair no `body` nesse caso (fora do corte).

- [ ] **O mouse continua funcionando**
  Clicar no "⋮" e em "Excluir" abre a mesma confirmação, agora ancorada no "⋮". Clicar fora fecha sem
  excluir e sem puxar o foco de volta. Clicar no "⋮" com a confirmação aberta fecha a confirmação. O fluxo do
  E2E `entityCrud.spec.ts` (clique em "Excluir", clique em "Sim") segue passando.

- [ ] **"Editar" e itens customizados não abrem a confirmação**
  Enter ou clique em "Editar" chama `onEdit` e nenhuma confirmação aparece. O mesmo vale para itens passados
  em `items` (ex.: "Approve" no playground), que continuam chamando o próprio `onClick`.

- [ ] **Sem `onDelete`, não há como excluir**
  Quando o call site não passa `onDelete` (impersonação na lista de entidades, linha do próprio admin na lista
  de usuários), o menu não tem o item de excluir e nenhuma interação abre a confirmação. A API segue sendo a
  proteção real.

- [ ] **O gatilho anuncia o menu**
  O "⋮" tem `aria-haspopup="menu"`. `aria-expanded` vale `"false"` com o menu fechado, `"true"` com o menu
  aberto e volta a `"false"` quando o menu fecha por item, Esc ou clique fora. O `aria-label` traduzido não
  muda.

- [ ] **Layout, tema e idioma**
  O "⋮" mantém tamanho e posição na célula da tabela. A confirmação aparece inteira em desktop e a 390 px, nos
  temas claro e escuro, com o texto em pt-br, en e es. O contorno de foco dos botões da confirmação é visível
  nos dois temas, ou a ausência é registrada como herdada dos seed tokens do antd.

## 11. Perguntas em aberto

Nenhuma bloqueia a implementação. Todas já têm a opção adotada.

1. **Onde a confirmação aparece?**
   Opções: (a) ancorada no "⋮", depois que o menu fecha; (b) dentro do menu, que ficaria aberto enquanto
   confirma; (c) um modal (`AlertDialog` do design system, `packages/design-system/components/ui/alert-dialog.tsx`).
   **Adotada: (a).** É a de menor raio: mesmo componente visual, mesmos textos, mesmos seletores do E2E. (b)
   exige controlar o fechamento interno do `Dropdown` (§1.6, C). (c) resolveria de graça foco preso, Esc e
   `role="alertdialog"`, mas troca o padrão visual de toda tabela de todo fork, o que é decisão de produto.

2. **Qual botão recebe o foco ao abrir?**
   Opções: (a) "Não"; (b) "Sim".
   **Adotada: (a).** É a recomendação do WAI-ARIA para diálogo destrutivo (focar a ação menos destrutiva), e
   com (b) um Enter repetido excluiria sem querer.

3. **Incluir `aria-haspopup`/`aria-expanded` agora?**
   Opções: (a) incluir; (b) deixar como achado.
   **Adotada: (a).** Mesmo arquivo, mesmo teste, três linhas, sem dependência nem chave nova (D5).

4. **Corrigir Espaço nos itens de menu?**
   Opções: (a) tratar Espaço com `onKeyDown` em cada item; (b) deixar como achado.
   **Adotada: (b).** O `rc-menu` só trata Enter para todos os itens (`MenuItem.js:139`). Corrigir só no
   "Excluir" deixaria o menu inconsistente; corrigir em todos passa a ser outra tarefa.

## 12. Decisões tomadas sem perguntar

| # | Decisão | Alternativa descartada e por quê |
|---|---------|----------------------------------|
| D1 | `Popconfirm` controlado, aberto pelo `onClick` do item | Embrulhar o rótulo (estado atual): o Enter não gera clique no rótulo |
| D2 | Estrutura H: `Popconfirm` > `<span>` > `Dropdown` > `button` | F quebra o Esc do menu; G não se prova por leitura; C acopla ao interno do `Dropdown` (§1.6) |
| D3 | Continuar com o `Popconfirm` do antd | `AlertDialog` muda o padrão visual de todos os forks (pergunta 1) |
| D4 | Foco inicial por `afterOpenChange` + `useId` | `cancelButtonProps={{ autoFocus: true }}`: o React foca no commit, possivelmente antes de o contêiner do portal entrar no documento e no mesmo tick do Enter. `ref` em `cancelButtonProps`: não passa no tipo (§1.6, item 4) |
| D5 | Incluir `aria-haspopup="menu"` + `aria-expanded` | Deixar para depois: custo marginal quase nulo na mesma mudança |
| D6 | Esc por `keydown` em `window` enquanto a confirmação está aberta | Depender do Esc do `Popover`, que só escuta o filho (§1.6, item 2) |
| D7 | `placement="bottomRight"` na confirmação | `top` (padrão): a coluna de ações é a última da tabela e o painel centrado tende a passar da borda direita. `bottomRight` repete o lugar onde o menu estava |
| D8 | Não devolver o foco ao gatilho no clique fora | O usuário escolheu outro lugar; puxar o foco de volta atrapalha |
| D9 | `Popconfirm` montado mesmo sem `onDelete` | Renderização condicional: dois DOMs diferentes por permissão, sem ganho |

## 13. Blueprint técnico

### 13.1 `packages/design-system/components/ui/action-menu.tsx`

Pseudo-diff. Tipos exportados (`ActionMenuItem`, `ActionMenuDeleteLabels`) e props do componente não mudam.

```tsx
"use client";

import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { getDictionary } from "@repo/internationalization/client";
import { cn } from "@repo/design-system/lib/utils";
import { Dropdown, Popconfirm } from "antd";
import { MoreVerticalIcon } from "lucide-react";
+import { useEffect, useId, useRef, useState } from "react";

 export function ActionsMenu({ onEdit, onDelete, deleteLabels, items, className }: ActionsMenuProps) {
     const { dictionary } = getDictionary();
     const translation = dictionary.components.actionMenu;
     // deleteAction / deleteConfirmTitle / deleteConfirmDescription: iguais
+    const [menuOpen, setMenuOpen] = useState(false);
+    const [confirmOpen, setConfirmOpen] = useState(false);
+    const triggerRef = useRef<HTMLButtonElement>(null);
+    const cancelButtonId = useId();
+
+    useEffect(() => {
+        if (!confirmOpen) {
+            return;
+        }
+        const closeOnEscape = (event: KeyboardEvent) => {
+            if (event.key !== "Escape") {
+                return;
+            }
+            setConfirmOpen(false);
+            triggerRef.current?.focus();
+        };
+        window.addEventListener("keydown", closeOnEscape);
+        return () => window.removeEventListener("keydown", closeOnEscape);
+    }, [confirmOpen]);
+
+    const returnFocusToTrigger = () => triggerRef.current?.focus();

     return (
+        <Popconfirm
+            afterOpenChange={(opened) => {
+                if (opened) {
+                    document.getElementById(cancelButtonId)?.focus();
+                }
+            }}
+            cancelButtonProps={{ id: cancelButtonId }}
+            cancelText={translation.deleteConfirmCancel}
+            description={deleteConfirmDescription}
+            okText={translation.deleteConfirmOk}
+            onCancel={returnFocusToTrigger}
+            onConfirm={() => {
+                returnFocusToTrigger();
+                onDelete?.();
+            }}
+            onOpenChange={(nextOpen) => {
+                if (!nextOpen) {
+                    setConfirmOpen(false);
+                }
+            }}
+            open={confirmOpen}
+            placement="bottomRight"
+            title={deleteConfirmTitle}
+        >
+            <span className="inline-flex">
                 <Dropdown
                     autoFocus
                     trigger={["click"]}
                     placement="bottomRight"
+                    onOpenChange={(open) => setMenuOpen(open)}
                     menu={{
                         items: [
                             /* edit e items: iguais */
                             ...(onDelete
                                 ? [
                                     {
                                         icon: <DeleteOutlined style={{ scale: 1.25 }} />,
                                         key: "delete",
-                                        label: (
-                                            <Popconfirm … className="flex items-center justify-between gap-2 ">
-                                                <span>{deleteAction}</span>
-                                            </Popconfirm>
-                                        ),
+                                        label: deleteAction,
+                                        onClick: () => setConfirmOpen(true),
                                         style: { margin: 4, fontSize: 14 },
                                         danger: true,
                                     },
                                 ]
                                 : []),
                         ],
                     }}
                 >
                     <button
+                        aria-expanded={menuOpen}
+                        aria-haspopup="menu"
                         aria-label={translation.trigger}
                         className={cn(/* igual */, className)}
+                        ref={triggerRef}
                         type="button"
                     >
                         <MoreVerticalIcon className="h-6 w-6" />
                     </button>
                 </Dropdown>
+            </span>
+        </Popconfirm>
     );
 }
```

Pontos de atenção:

- Biome: o `useEffect` só usa `setConfirmOpen` e `triggerRef`, que são estáveis, então a lista `[confirmOpen]`
  passa no `useExhaustiveDependencies`. Não extraia o fechamento para uma função do corpo, senão a regra pede
  ela nas dependências.
- Sem comentário no código, salvo se o porquê do `afterOpenChange` (foco depois da animação para o Enter que
  abriu não ativar o botão) não ficar claro pelo nome. Se entrar, uma linha, com a regra e sem citar este
  plano.
- Se o typecheck reclamar do `onOpenChange` do `Dropdown`, a assinatura é `(open: boolean, info: { source })`;
  a arrow de um parâmetro serve.

### 13.2 `packages/design-system/__tests__/actionMenu.test.tsx`

Esqueleto (os quatro testes atuais ficam como estão):

```tsx
const ENTER = { key: "Enter", code: "Enter", keyCode: 13, which: 13 };
const ESCAPE = { key: "Escape", code: "Escape", keyCode: 27, which: 27 };

async function openMenu() {
    const trigger = screen.getByRole("button", { name: actionMenuCopy.trigger });
    fireEvent.click(trigger);
    return trigger;
}

async function pressEnterOn(label: string) {
    const item = await screen.findByRole("menuitem", { name: label });
    fireEvent.keyDown(item, ENTER);
}

describe("ActionsMenu keyboard delete", () => {
    it("opens the confirmation when Enter is pressed on the delete item", async () => {
        const onDelete = vi.fn();
        render(<ActionsMenu onDelete={onDelete} onEdit={vi.fn()} />);
        await openMenu();
        await pressEnterOn(actionMenuCopy.delete);
        expect(await screen.findByText(actionMenuCopy.deleteConfirmTitle)).toBeTruthy();
        expect(onDelete).not.toHaveBeenCalled();
    });

    it("moves focus to the cancel button once the confirmation opens", …);
    it("closes on Escape and returns focus to the trigger", …);   // fireEvent.keyDown(window, ESCAPE)
    it("returns focus to the trigger on cancel", …);
    it("calls onDelete once on confirm and returns focus to the trigger", …);
    it("still opens the confirmation on mouse click", …);
    it("does not open the confirmation from the edit item", …);
    it("announces the menu through aria-haspopup and aria-expanded", …);
    it("uses the custom delete labels from the keyboard path", …);
});
```

### 13.3 Achados para o backlog (o `/spec --sync` registra)

- Espaço não ativa item de menu no `ActionsMenu` (`rc-menu`, `MenuItem.js:139`; vale para todos os itens).
- O painel da confirmação sai com `role="tooltip"` (`rc-tooltip/es/Popup.js:17`); confirmação destrutiva
  pediria `alertdialog` com foco preso.
- Depois de excluir uma entidade a linha some e o foco cai no `body`.

### 13.4 Ordem de implementação e de commit

| # | Commit | Arquivos |
|---|--------|----------|
| 1 | `fix(design-system): open the delete confirmation from the keyboard in ActionsMenu` | `packages/design-system/components/ui/action-menu.tsx`, `packages/design-system/__tests__/actionMenu.test.tsx` |
| 2 | `docs(features): action-menu-keyboard-delete` | `docs/features/action-menu-keyboard-delete/**` |

O `aria-haspopup`/`aria-expanded` vai no commit 1. Separar exigiria `git add -p` no mesmo arquivo, e a
política aceita o commit misto nesse caso (registre na mensagem). Se o `/review` preferir, o corpo do commit
cita as duas mudanças.

Antes do primeiro commit, `git diff --cached --stat` precisa sair vazio: o índice deste checkout já tem um
`git mv` de `specs/plan-entitlements.md` de outra rodada.

### 13.5 Env e infra

Nenhuma variável de ambiente, dependência, índice, regra ou serviço novo. Pré-requisitos manuais de infra:
nenhum. Rollback: reverter o commit 1.
