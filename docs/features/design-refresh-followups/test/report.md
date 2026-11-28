# Relatório do `/test`: acabamento da branch de design

Branch `feat/design-system-refresh` (não protegida, sem commit nesta etapa). Escopo: o working tree da tarefa
(`sonner.tsx`, `action-menu.tsx`, `table.tsx`, header da landing e os testes de cada um). As mudanças em `specs/` e
`docs/features/audit-log-levels/` são da auditoria e ficaram fora.

Resultado: nenhum defeito de produção. Todas as suítes passam. A decisão em aberto da revisão tem medição: o menu
**fecha ao rolar** e a rolagem acontece.

## Decisão em aberto: toque fora fecha no `pointerdown`

Medido no Chromium do `agent-browser`, com a landing em 390 × 844, `deviceScaleFactor` 3, modo mobile e emulação de
toque ligada por CDP (`Emulation.setTouchEmulationEnabled`, `navigator.maxTouchPoints` = 5,
`(pointer: coarse)` verdadeiro). Os gestos saíram de `Input.synthesizeScrollGesture` com
`gestureSourceType: "touch"` e de `Input.dispatchTouchEvent` (arrasto manual em 10 passos de 30 px). Um listener de
captura no `document` registrou o tipo de cada evento.

| Cenário (menu aberto, `scrollY` inicial 0) | Eventos registrados | `aria-expanded` depois | `scrollY` depois |
|---|---|---|---|
| Gesto de rolagem de 400 px começando no conteúdo abaixo do painel | `pointerdown:touch`, `touchstart`, `pointercancel:touch` | `false` | 396 |
| Arrasto manual de 300 px no mesmo ponto | `pointerdown:touch`, `touchstart`, `pointercancel:touch` | `false` | 425 (com inércia) |
| Arrasto de 20 px que volta ao ponto de partida | não registrado | `false` | 0 |
| Gesto de rolagem de 300 px começando dentro do painel | `pointerdown:touch` num link do painel | `true` | 304 |
| Referência, menu fechado, gesto de 300 px no conteúdo | não registrado | `false` | 213 |

Veredito: **fecha ao rolar**. O primeiro contato do dedo fora do painel já fecha o menu, antes de o navegador
classificar o gesto como rolagem (o `pointercancel` chega depois). A rolagem não trava: a página percorre a mesma
distância que percorre com o menu fechado. Arrastar começando dentro do painel rola a página e mantém o menu aberto,
porque o painel fica preso ao header `sticky`. Isso confirma o comportamento que a revisão descreveu e a premissa da
recomendação dela (a rolagem não fica travada), então a variante do Radix (adiar o fechamento do toque para o
`click`) não é necessária. Um teste novo trava essa escolha: se alguém trocar para a variante do Radix, o caso "fecha
no primeiro contato de um toque fora, sem esperar o click" falha e obriga a decisão a ser revista.

## Verificar no `/test`

| Item do `review.md` | Veredito | O que foi medido |
|---|---|---|
| Toque fora fecha o menu a 390 px | confirmado | Toque (CDP, `pointerType` touch) no conteúdo abaixo do painel: `aria-expanded` passou de `true` a `false` e o painel saiu do DOM. Clique de mouse no `h1` do hero, em escuro, pt-br: mesmo resultado, com o foco indo para o `body`. |
| Rolar a página com o menu aberto | confirmado, fecha e rola | Tabela acima. |
| Toque numa área vazia do painel mantém aberto | confirmado | Toque em (380, 315), alvo `NAV` do painel: eventos `pointerdown`, `pointerup` e `click` de toque, `aria-expanded` continuou `true`. |
| Seletor de idioma do painel troca a rota | confirmado | Mouse, claro: escolher "EN English" levou de `/pt-br` a `/en`, `<html lang="en">`, `h1` "Next.js monorepo for teams that ship MVP after MVP". Toque, escuro: escolher "ES Español" levou de `/en` a `/es`. |
| Seletor de tema do painel | confirmado | Mouse, en: escolher "Dark" pôs a classe `dark` no `<html>`, `localStorage.theme = "dark"`, e o painel continuou aberto (`aria-expanded="true"`). Toque, es: escolher "Claro" tirou a classe `dark` e o painel continuou aberto. |
| Seletor aberto e toque fora de tudo | confirmado | Com o dropdown de idioma aberto, o `body` tinha `pointer-events: none` e havia 1 `[role=menu]`. Um clique de mouse (alvo `SPAN` no hero) e, em outra rodada, um toque fecharam o dropdown e o painel no mesmo gesto; depois, `pointer-events: auto`, 0 menus, e o botão do menu reabriu o painel no gesto seguinte. |
| Escape fecha e devolve o foco | confirmado | en, escuro: foco no link "Home" do painel, Escape: `aria-expanded="false"`, `document.activeElement` é o botão "Menu", que casa com `:focus-visible`. |
| 1024 px sem link de documentação | confirmado | `NEXT_PUBLIC_DOCS_URL` vazio. Em 1024 px o contêiner do botão tem `display: none` e a barra mostra Início, Preços, Contato. Em 1023 px o botão volta (`display: flex`) e os links da barra somem. |
| App, excluir entidade pelo `ActionsMenu` em light e dark | confirmado | Conta `user@example.com` do seed. Claro: "Mais ações", "Excluir", "Sim"; o diálogo fechou, a linha sumiu e o toast "Entidade removida com sucesso." saiu com `data-sonner-theme="light"`, fundo `lab(100 0 0)` e texto `lab(8.3 …)`. Escuro (tema trocado pelo seletor do topo): mesmo fluxo, toast com `data-sonner-theme="dark"`, fundo `lab(10.0 …)` sobre `body` `lab(4.0 …)` e texto `lab(95.9 …)`. Na primeira exclusão em claro não capturei o toast (li o DOM depois que ele já tinha saído); as duas seguintes foram capturadas com um `MutationObserver`. |
| App, `/admin/users` com 10 linhas | confirmado | Conta `admin@example.com` do seed, 15 usuários no emulador: 10 linhas, "Página 1 de 2", seletor "Linhas por página" em 10 (opções 10, 20, 50); a página 2 mostra 5 linhas. Escolher 20 mostrou as 15 linhas; "Atualizar" (refetch) manteve as 15; recarregar a rota voltou a 10. |

Sem caminho na UI atual, provados só no Vitest: o toast com `forcedTheme` (nenhuma página força tema), o `onDelete`
que rejeita ou lança (os quatro consumidores passam `mutation.mutate`) e a troca de `pageSize` pela prop (o único
consumidor passa a constante 10). Nenhum desses foi marcado como medido no browser.

## Cobertura e comandos

Rodados nesta etapa, sem `--force`, depois dos testes novos:

| Comando | Resultado |
|---|---|
| `pnpm --filter @repo/design-system test` | 14 arquivos, 202 testes, todos passando |
| `pnpm --filter web test` | 36 arquivos, 328 testes, todos passando |
| `pnpm --filter app test` | 158 arquivos, 1415 testes, todos passando |
| `pnpm --filter @repo/design-system typecheck` | exit 0 |
| `pnpm --filter web typecheck` | exit 0 |
| `pnpm --filter app typecheck` | exit 0 |
| `pnpm check` | 1181 arquivos, nenhuma correção |
| `pnpm test` (raiz, com `JAVA_HOME` do JDK 21) | 15 tarefas com sucesso, 9 do cache, 2 min 21 s. Inclui `@repo/internationalization` (7 arquivos, 67 testes), `api` (137 arquivos, 1984 testes) e `api:test:emulator` (12 arquivos, 284 testes) |

A paridade de i18n entrou pelo `pnpm test` da raiz; o diff não toca tradução. O design system foi de 201 testes
(handoff) para 202 e a web de 325 para 328, pelos casos criados aqui.

## Testes criados

| Arquivo | Caso | Prova de mutação |
|---|---|---|
| `packages/design-system/__tests__/actionMenu.test.tsx` | `onDelete` que lança de forma síncrona: diálogo fecha, foco no gatilho, sem `aria-busy`, nenhum `unhandledRejection`, uma chamada | Com o `action-menu.tsx` do `HEAD` (sem `catch`), o caso falha no `expect(unhandled).not.toHaveBeenCalled()` |
| `apps/web/__tests__/headerMobileMenu.test.tsx` | `pointerDown` com `pointerType: "touch"` fora fecha sem `click` | Com o header do `HEAD`, falha |
| idem | Tema escolhido no seletor do painel (portal): `pointerDown` no item não fecha, `click` chama `setTheme("dark")`, painel continua aberto | Com a detecção trocada por `contains(event.target)` no DOM, falha (junto com o caso antigo do idioma) |
| idem | Seletor de idioma aberto e `pointerDown` no `body`: painel fecha e o `[role=menu]` some | Com o header do `HEAD`, falha |

O teste do header passou a mockar `next-themes` (`useTheme` devolve um `setTheme` espião) para observar a escolha do
tema sem `ThemeProvider`. Depois de cada mutação, restaurei o arquivo de produção e comparei byte a byte com a cópia
salva antes.

## Lacunas

| Lacuna | Origem | Veredito |
|---|---|---|
| `ModeToggle` dentro do painel com clique fora | handoff e revisão | fechada: teste novo no jsdom e medição no browser (mouse e toque) |
| Fechamento simultâneo do dropdown e do painel ao tocar fora | handoff e revisão | fechada: teste novo no jsdom e medição no browser |
| Toque × mouse no clique fora | revisão | fechada para a decisão atual. O jsdom carrega o `pointerType` no evento, e o teste trava que toque fecha no `pointerdown`. A rolagem real só existe no browser e foi medida lá |
| `onDelete` síncrono que lança | revisão | fechada: teste novo com prova de mutação |
| `forcedTheme` no toast, `onDelete` rejeitado e `pageSize` pela prop no browser | plano | fora de escopo: sem caminho na UI; provados no Vitest |

## Decisões de custo de teste

Nenhum teste da faixa cara. As quatro correções são de componente e o jsdom prova cada uma: o tema do `Toaster` com
`next-themes` e `sonner` mockados, a rejeição e o lançamento síncrono com `process.on("unhandledRejection")`, a
paginação com `rerender`, e o clique fora com `fireEvent.pointerDown` mais o portal real do Radix. A rolagem por toque
não tem equivalente no jsdom e foi medida no browser. Rotas da API, Firestore e regras de segurança não mudaram.

## Defeitos

Nenhum ❌.

Observações fora do escopo do diff, sem bloqueio:

- O console da landing em dev mostra "Encountered a script tag while rendering React component", aviso que já
  existia antes desta tarefa (script de tema injetado durante o render) e que o overlay do Next conta como "1 Issue".
- Em `/admin/users`, com 15 usuários e 20 linhas por página, o paginador some inteiro (`hideOnSinglePage`), inclusive
  o seletor, e só recarregar a rota volta para 10. É o comportamento de `hideOnSinglePage` que já estava na `Table`.
- Depois de excluir uma entidade, o foco cai no `body`, porque o gatilho saiu junto com a linha. Já era assim; o
  componente não tem para onde devolver o foco.

## Critérios de aceite

| Critério | Status | Meio |
|---|---|---|
| Tema forçado vence a preferência salva no toast | ✅ | unit (`sonnerTheme.test.tsx`, 4 casos); sem caminho na UI |
| Toast de sucesso sai no tema da página | ✅ | e2e, claro e escuro |
| `onDelete` que rejeita não deixa rejeição solta | ✅ | unit; sem caminho na UI |
| `onDelete` síncrono que lança se comporta como o que rejeita | ✅ | unit (novo) |
| Exclusão bem-sucedida continua como antes | ✅ | unit (casos existentes de bloqueio de Cancelar/Escape e de `aria-busy`) e e2e |
| Mudar `pagination.pageSize` aplica o novo tamanho e volta à página 1 | ✅ | unit; sem caminho na UI |
| Re-render com a mesma prop preserva a escolha do seletor | ✅ | unit e e2e (20 linhas mantidas após "Atualizar") |
| Tabela de usuários do admin abre com dez linhas por página | ✅ | e2e (`pagination={false}` pelo caso unit existente) |
| Clique ou toque fora fecha o menu mobile | ✅ | unit e e2e (mouse e toque) |
| Toque ou clique dentro do painel não fecha | ✅ | unit e e2e (toque em área vazia, arrasto dentro do painel) |
| Seletor de idioma dentro do painel troca a rota | ✅ | e2e (mouse para `/en`, toque para `/es`); unit cobre o `pointerdown` no portal |
| Seletor de tema dentro do painel troca o tema sem fechar o painel | ✅ | unit (novo) e e2e (mouse para escuro, toque para claro) |
| Seletor aberto e toque fora fecham juntos, sem nada preso | ✅ | unit (novo) e e2e |
| Escape fecha o menu e devolve o foco ao botão | ✅ | unit e e2e |
| Barra cheia em 1024 px sem link de documentação | ✅ | e2e (1024, 1023 e 1440 px) e unit |
| Textos nos três idiomas | ✅ | e2e (pt-br, en, es) e paridade de i18n |

## Evidência por tema, tamanho e idioma

- 390 px: pt-br em escuro (clique fora com mouse) e em claro (painel aberto, seletor de idioma aberto e clique fora);
  en em claro e escuro (troca de idioma, troca de tema, Escape); es em escuro e claro (fluxos por toque).
- 1024 e 1023 px: pt-br claro.
- 1440 px: pt-br claro, en escuro e es escuro. Barra cheia com os três links no idioma da rota, sem rolagem
  horizontal (`scrollWidth` igual à largura da janela).
- App em 1440 px: entidades em claro e escuro, `/admin/users` em escuro.

O elemento que vence cada tela não mudou com este diff: no painel mobile são os links de navegação; no app, a tabela.
O diff não toca cor, sombra, animação nem layout, então foco visível (medido no botão do menu depois do Escape) e
`prefers-reduced-motion` seguem como estavam.

Prints em `docs/features/design-refresh-followups/test/e2e/` (`01-390-dark-ptbr-menu-aberto.png` até
`15-admin-users-pagina1.png`). O `.gitignore` descarta essa pasta; o texto acima é a evidência.

## Ambiente do e2e

Todas as portas (3000 a 3003, 9099, 8080, 9199, 4001, 4400, 4500, 9150) estavam livres no início, então não
reutilizei nada. Subi, com o ambiente montado a partir dos `.env.example` e o bloco do emulador forçado (projeto
`demo-next-boilerplate`, as mesmas regras de `apps/e2e/support/stackEnv.ts`):

- `pnpm emulators` (Auth, Firestore, Storage) com `JAVA_HOME` do JDK 21, seguido de `pnpm seed`;
- `api` em 3002, `app` em 3000 e `web` em 3001 com `next dev`.

Ao terminar, fechei o browser e derrubei por PID os processos que subi e os filhos deles que seguravam as portas
(três `next-server`, o `firebase-tools` e o JAR do Firestore). Conferi com `lsof` que todas as portas acima ficaram
vazias, antes do `pnpm test` da raiz e de novo depois dele (o `test:emulator` sobe e derruba os próprios emuladores).

## Estado de dev alterado

Nenhum projeto Firebase real foi tocado e nenhuma conta foi criada fora do emulador. No emulador, que morreu com o
processo, criei 12 usuários comuns `qa-design-refresh-followups-NN@example.com` para paginar a tabela do admin e
excluí 3 das 4 entidades de `user@example.com`. Nenhuma senha fica neste arquivo; as contas do seed estão em
`docs/SETUP.md`. `docs/PRE-PRODUCTION.md` não muda.

## Arquivos alterados nesta etapa

- `packages/design-system/__tests__/actionMenu.test.tsx` (um caso novo)
- `apps/web/__tests__/headerMobileMenu.test.tsx` (mock de `next-themes` e três casos novos)
- `docs/features/design-refresh-followups/test/criterios-aceite.md`
- `docs/features/design-refresh-followups/test/report.md`
- `docs/features/design-refresh-followups/STATE.md`
