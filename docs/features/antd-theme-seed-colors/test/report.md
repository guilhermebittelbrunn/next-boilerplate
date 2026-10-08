# Relatório de QA: antd-theme-seed-colors

Rodada autônoma do `/cycle`, em 2026-10-07, na branch `design-system/fix/antd-theme-seed-colors` (não
protegida). A medição no navegador foi feita em `next build && next start` da `apps/app`, com o ambiente do
emulador. Para comparar, montei também um build de produção do `HEAD` (`0a49a3b`, código anterior à
correção) e medi os mesmos pontos nele.

Resultado: 12 critérios, 12 ✅, 0 ❌, 0 🔒. Nenhum defeito de produção introduzido por este diff. Dois
critérios do plano tinham texto errado (foco de teclado no item "Excluir" e indicador de carregamento da
tabela); reescrevi os dois em `criterios-aceite.md` com o comportamento medido, que é igual ao do código
anterior.

## 1. Cobertura de testes

| comando | resultado |
|---------|-----------|
| `pnpm --filter @repo/design-system test` | 7 arquivos, 83 testes passando (os 80 do handoff mais os 3 criados aqui) |
| `pnpm --filter @repo/design-system typecheck` | exit 0, depois dos testes novos |
| `npx biome check packages/design-system/__tests__/antdTheme.test.tsx` | sem erro |
| `pnpm test` (raiz, JDK 21 no `PATH`, sem `--force`) | 15/15 tasks, 9 do cache, 1m47s. design-system 83, app 826 (102 arquivos), web 87 (14), api 1205 (93), `api:test:emulator` 186 (4), i18n 67, auth 127, email 202, shared 44, security 45, payments 22, next-config 32, analytics 34, sdk 9, e2e 16 |
| Paridade de i18n | não se aplica: o diff não toca chave de tradução (o `pnpm test` da raiz rodou os 67 testes do pacote, verdes) |
| `pnpm check` completo e typecheck de `app`/`web` | não rodados de novo: só acrescentei casos a um arquivo de teste do design-system. Valem os números do `/review` (861 arquivos sem erro) e do handoff (`tsc --noEmit` exit 0 nos dois apps) |

O `test:emulator` sobe e derruba os próprios emuladores; as portas 8080, 9099 e 9199 estavam livres depois
dele.

### Testes criados

Todos em `packages/design-system/__tests__/antdTheme.test.tsx`, no nível mais barato (jsdom, `next-themes`
mockado). O mock passou a devolver também `forcedTheme`.

| teste | o que prova | mutação que derruba |
|-------|-------------|---------------------|
| `forcedTheme wins over the stored preference in resolvedTheme` | `forcedTheme: "dark"` com `resolvedTheme: "light"` entrega `#fafafa #ff6467 #fafafa` | provider só com `resolvedTheme`: falha |
| `switching theme without reloading drops the styles of the previous theme` | `rerender` claro → escuro → claro: o `<style>` com o botão primário do tema anterior some, junto com o `data-token-hash` dele | tema congelado no primeiro render (`useState`): falha |
| `dark: the danger menu item uses the dark destructive colour at rest and on hover` | no escuro, as regras do item `danger` trazem `color:#ff6467;` e `color:var(--color-background);background-color:#ff6467;`, sem o hex do claro | `Dropdown.colorError: "var(--color-destructive)"` de volta: falha |

Cada mutação foi aplicada no provider, rodada e revertida; o `diff` contra a cópia guardada saiu idêntico nas
três. Repeti também a M4 do handoff (`#ffb900` → `#ffb800`): o `themeContrast.test.ts` falha em
`dark: --warning in globals.css is the antd seed #ffb800`.

O teste de troca contorna um detalhe do jsdom: o cssinjs só remove os estilos de um token quando outro token
ainda está vivo, e estilos de testes anteriores do mesmo arquivo ficam no `<head>` depois do `cleanup()`. Por
isso o teste identifica o hash pelo conteúdo do `<style>` (o CSS do botão primário de cada tema), e não pela
contagem total. No app isso não acontece, porque o provider fica montado o tempo todo.

## 2. Verificar no `/test` (lista do `review.md`)

| # | item | veredito |
|---|------|----------|
| 1 | Troca de tema sem recarregar | **Confirmado.** No navegador, claro → escuro trocou os 12 `<style>` de `data-token-hash="p4fhvg"` por 12 de `16i4cd0`; nenhum `<style>` ficou com `background:#171717` nem `#e7000b`. Escuro → claro fez o inverso. O único outro hash, `1g3r1lh`, é o dos ícones e não depende do tema. Fiz claro → escuro → claro → escuro na mesma página, conferindo com um marcador em `window` que não houve recarga, e a confirmação aberta depois de cada troca mostrou as cores do tema novo (seção 4). Coberto também pelo Vitest novo |
| 2 | Recarregar já no escuro | **Confirmado.** Com um `MutationObserver` registrado antes do primeiro script da página, a carga completa de `/pt-br/entities` com o tema escuro salvo injetou só estilos do token escuro (`16i4cd0`); nenhum `<style>` com `#171717` apareceu em momento algum, então não há flash do claro nos componentes antd. Console vazio (conferi antes que a captura funciona) e nenhum erro de página. A confirmação aberta em seguida mediu `#ffb900` no ícone e `#fafafa` no "Sim" |
| 3 | Confirmação do `ActionsMenu` | **Confirmado.** Valores na seção 4. Ícone `#bb4d00` (5,03:1) e `#ffb900` (11,49:1); "Sim" em repouso, hover e pressionado nos dois temas; pt-br, en e es nos dois temas |
| 4 | Anel de foco | **Confirmado.** "Não", "Sim", item do menu e número da paginação: `#171717` 3 px no claro (17,93:1) e `#fafafa` 3 px no escuro (18,97:1) |
| 5 | Item `danger` no escuro e pelo teclado | **Confirmado nas cores; a frase do critério 6 do plano caiu.** Repouso e hover seguem o `--destructive`. No foco por seta o antd aplica a regra genérica de item ativo: fundo `#f5f5f5` (claro) ou `#262626` (escuro), texto destrutivo. O build do `HEAD` mediu os mesmos valores, então não é regressão. O critério foi reescrito |
| 6 | Paginação, spinner e seletor de tamanho no escuro | **Paginação confirmada; a premissa do spinner caiu.** Página ativa com borda `#fafafa` (18,97:1) no escuro; no `HEAD`, `#000000` (1,06:1). Nenhum fluxo passa `loading` à `Table` do antd: o "Atualizar" usa o `Button` do design system, então não existe spinner do antd para medir. Item selecionado do seletor de tamanho: texto `#0a0a0a` sobre `#575757` no claro (2,74:1) e `#fafafa` sobre `#595959` no escuro (6,71:1). É o achado de backlog já registrado, e o claro melhorou em relação ao `#404040` do primário antigo (cerca de 1,9:1) |
| 7 | `forcedTheme` | **Confirmado** pelo Vitest novo, com a mutação correspondente pega |
| 8 | Suíte do pacote depois da correção | **Confirmado.** 83/83 |

## 3. Critérios de aceite: status por item

| # | critério | status | meio |
|---|----------|--------|------|
| 1 | Cores-semente iguais às do tema ativo | ✅ | unit (`antdTheme.test.tsx`) + e2e (cor computada) |
| 2 | Provider segue o `next-themes`, inclusive o tema forçado | ✅ | unit (incluindo `forcedTheme`) + e2e |
| 3 | Troca de tema sem recarregar não deixa CSS do tema anterior | ✅ | unit (`rerender`) + e2e (contagem de `data-token-hash`) |
| 4 | Recarregar no escuro não pisca nem avisa hidratação | ✅ | unit (hidratação, do handoff) + e2e (observer desde o primeiro script, console) |
| 5 | Ícone de alerta legível | ✅ | e2e, comum e admin, mouse e teclado, desktop e 390 px |
| 6 | Botão "Sim" legível | ✅ | e2e, três estados, dois temas, três idiomas |
| 7 | Anel de foco visível | ✅ | e2e |
| 8 | Item "Excluir" mantém a cor de hoje | ✅ | unit (claro e escuro) + e2e comparado com o `HEAD` |
| 9 | Paginação visível no escuro | ✅ | e2e na `/admin/users`, comparado com o `HEAD` |
| 10 | Token `--warning` | ✅ | unit (`themeContrast.test.ts`) + e2e (ícone com o hex do token) |
| 11 | Hex amarrados ao `globals.css` | ✅ | unit, mutação M4 repetida aqui |
| 12 | Gates verdes | ✅ | comandos da seção 1 |

Autorização, ownership e modo de produto não se aplicam: a mudança é só de apresentação e não toca rota,
guard nem dado.

## 4. Evidências e2e

Medidas com `getComputedStyle`; cores convertidas para sRGB por um canvas de 1 px e contraste WCAG calculado
na página. "Painel" é o fundo do popover (`#ffffff` no claro, `#0a0a0a` no escuro).

### Confirmação de exclusão (`/entities`, conta comum)

| medida | claro | escuro | escuro no `HEAD` |
|--------|-------|---------|------------------|
| ícone de alerta | `#bb4d00`, 5,03:1 | `#ffb900`, 11,49:1 | `#000000`, 1,06:1 |
| "Sim" em repouso | fundo `#171717` (17,93:1 no painel), texto `#fafafa` (17,18:1) | fundo `#fafafa` (18,97:1), texto `#171717` (17,18:1) | fundo `#000000` (1,06:1), texto `#ffffff` |
| "Sim" em hover | `#242424`, texto 14,87:1 | `#e8e8e8`, texto 14,63:1 | não medido |
| "Sim" pressionado | `#000000`, texto 20,12:1 | `#aaaaaa`, texto 7,72:1 | não medido |
| anel de foco em "Não" e "Sim" | `#171717` 3 px, afastamento 1 px, 17,93:1 | `#fafafa` 3 px, 18,97:1 | `#262626` 3 px, 1,31:1 |

Medi o "pressionado" com o botão do mouse abaixado sobre o "Sim" e solto fora dele, para não excluir o
registro. Aberta pelo teclado (seta até "Excluir" + Enter), a confirmação levou o foco para "Não", com anel
visível. Aberta pelo mouse, o foco também vai para "Não".

Idiomas, nos dois temas, com as mesmas cores da tabela acima: pt-br "Excluir registro", "Não" 42 px, "Sim"
40 px; en "Delete record", "No" 35 px, "Yes" 39 px; es "Eliminar registro", "No" 35 px, "Sí" 28 px. Nenhum
rótulo cortado.

### Item "Excluir" do menu

| estado | claro | escuro | `HEAD` |
|--------|-------|--------|--------|
| repouso | texto `#e7000b` sobre `#ffffff`, 4,77:1 | `#ff6467` sobre `#0a0a0a`, 6,85:1 | idêntico nos dois temas |
| hover | texto `#ffffff` sobre `#e7000b`, 4,77:1 | texto `#0a0a0a` sobre `#ff6467`, 6,85:1 | claro idêntico; escuro não medido |
| foco por seta | texto `#e7000b` sobre `#f5f5f5`, 4,38:1, anel `#171717` | texto `#ff6467` sobre `#262626`, 5,24:1, anel `#fafafa` | mesmos fundos e textos; anel `#262626` nos dois temas |

### Paginação (`/admin/users`, conta admin, 12 usuários)

| medida | claro | escuro | escuro no `HEAD` |
|--------|-------|--------|------------------|
| borda da página ativa | `#171717`, 17,93:1 | `#fafafa`, 18,97:1 | `#000000`, 1,06:1 |
| foco de teclado na página 2 | anel `#171717` 3 px | anel `#fafafa` 3 px | anel `#262626` 3 px |
| item selecionado do seletor de tamanho | texto `#0a0a0a` sobre `#575757`, 2,74:1 | texto `#fafafa` sobre `#595959`, 6,71:1 | não medido |

### Área admin

A confirmação "Arquivar usuário" da `/admin/users` no escuro mediu o mesmo que a comum: ícone `#ffb900`
(11,49:1), "Sim" `#fafafa` com texto `#171717` (17,18:1).

### Mobile (390 × 844)

Na `/entities`, claro e escuro: ícone, "Sim" e "Não" com os mesmos valores do desktop; item "Excluir" em
repouso `#ff6467` (6,85:1) no escuro. A troca claro → escuro em 390 px deixou só o hash `16i4cd0`. Sem
rolagem horizontal da página. O painel da confirmação começa em x = −15 (ver O2).

### Screenshots

Em `docs/features/antd-theme-seed-colors/test/e2e/`, descartados pelo `.gitignore`. Serviram só para eu
conferir a tela; o texto acima é a evidência. Nenhum mostra dado de pessoa real (contas do seed do
emulador e entidades "QA tema N").

## 5. Decisões de custo de teste

- Nenhum teste da faixa cara. O objeto da mudança é o CSS que o cssinjs injeta, e o jsdom executa o mesmo
  cssinjs; os três casos novos rodam em milissegundos.
- `providers/antd-app.tsx`: os casos novos cobrem `forcedTheme`, a troca de tema e o item `danger` no
  escuro. O resto já estava coberto pelos 10 casos do handoff.
- `styles/globals.css` e paridade dos hex: o `themeContrast.test.ts` já cobria; só repeti a mutação.
- `actionMenu.test.tsx`: não mexi. O caso do claro continua lá; o do escuro ficou no `antdTheme.test.tsx`,
  que já mocka o `next-themes`.

## 6. Lacunas herdadas

| lacuna (origem) | veredito |
|-----------------|----------|
| Contraste real no navegador (handoff) | **Fechada.** Seção 4 |
| Troca de tema em tempo de execução sem Vitest (handoff) | **Fechada.** Vitest novo e medição no navegador |
| Item `danger` no escuro no nível de CSS injetado (handoff) | **Fechada.** Vitest novo |
| `forcedTheme` (review) | **Fechada.** Vitest novo |
| Achados da §13.4 do plano: aliases `controlOutline`/`colorErrorOutline`/`colorWarningOutline` sobre `var()`, `controlItemBgActive` cinza médio, `--success` a 3,69:1 no escuro, comentário do `globals.css` | **Fora de escopo**, já vão para o backlog. Medi o do seletor de tamanho (seção 4) |
| `turbo.json` com `typecheck.dependsOn: []` e o `resolvedTheme` sem `forcedTheme` no `useAlert.ts` (review) | **Fora de escopo**, backlog |

## 7. Observações fora do escopo deste diff

Nenhuma é regressão desta entrega; registro para o backlog.

- **O1.** No claro, o foco por seta no item "Excluir" deixa o texto `#e7000b` sobre `#f5f5f5` a 4,38:1,
  abaixo de 4,5:1 para texto de 14 px. O `HEAD` mede o mesmo. Mudar isso pede regra própria no
  `globals.css` ou token de componente, e é decisão de design, não desta tarefa.
- **O2.** Em 390 px, o painel da confirmação começa em x = −15: a margem interna esquerda fica fora da tela.
  O texto começa em x = 18 e os botões cabem (272 a 363 px), então nada fica ilegível. A posição vem do
  `placement="bottom"` do `ActionsMenu`; este diff só muda cor e não altera layout. Não medi o `HEAD` em
  mobile.
- **O3.** O seletor de tamanho da paginação mostra "10 / page" em pt-br e es: o `ConfigProvider` não recebe
  `locale` do antd.
- **O4.** O seletor de tema da `apps/app` tem `aria-label` "Toggle theme" e itens "Light", "Dark" e "System"
  em inglês, também em pt-br e es.
- **O5.** A §9 do plano previa medir o spinner da `Table` ao clicar em "Atualizar". Esse spinner não é do
  antd (seção 2, item 6).

## 8. Ambiente do e2e

Todas as portas (3000, 3001, 3002, 3003, 8080, 9099, 9199, 4001, 4400, 4500, 9150) estavam livres no início;
não reutilizei nada do usuário.

- O ambiente de cada servidor veio do `buildStackEnv` de `apps/e2e/support/stackEnv.ts` (o mesmo montador
  do `pnpm e2e`): `.env.example` com o bloco do emulador e as credenciais reais vazias, projeto
  `demo-next-boilerplate`.
- Subi e derrubei por PID: `pnpm emulators` com JDK 21 (encerrado com SIGINT), `next dev -p 3002` da API,
  `next start -p 3000` da `apps/app` do working tree e, depois dele, `next start -p 3000` do build do `HEAD`
  num worktree temporário em `/tmp`.
- No fim, nenhuma das portas acima tinha processo escutando. O worktree temporário foi removido e
  `git worktree prune` rodou. A sessão do `agent-browser` foi fechada e o arquivo de estado dela apagado.
- O Chrome do `agent-browser` reiniciou sozinho várias vezes durante a passada (a aba voltava para
  `about:blank`) e às vezes ficava com `document.visibilityState` `hidden`, o que trava as animações do
  antd. Não achei a causa. Contornei trazendo a aba para frente antes de cada medida e refazendo o login
  quando o navegador reiniciava. Nenhuma medida da seção 4 foi feita com a aba oculta.

## 9. Estado de dev alterado e dados de QA

- `apps/app/.next` foi reconstruído com o ambiente do emulador. Um `next start` sem novo build aponta para o
  emulador, não para o `.env` local.
- Nenhuma conta em projeto Firebase real; nada a acrescentar ao `docs/PRE-PRODUCTION.md`.
- No emulador, que sobe sem `--import` nem `--export-on-exit` e foi derrubado no fim, criei: 8 entidades
  "QA tema 1" a "QA tema 8" na conta `user@example.com` do seed; 9 usuários só no Auth
  (`qa-antd-theme-1@example.com` a `qa-antd-theme-9@example.com`); e 9 usuários com perfil pelo
  `POST /auth/sign-up` (`qa-antd-theme-u1@example.com` a `qa-antd-theme-u9@example.com`), para a paginação
  da `/admin/users` aparecer. Senhas aleatórias, descartadas. Tudo sumiu com o emulador.
- As contas do seed usam a senha documentada no `docs/SETUP.md` para o emulador.
- Nenhum arquivo do repositório alterado fora de `packages/design-system/__tests__/antdTheme.test.tsx` e
  desta pasta.

## 10. Cross-check

- `apps/app`: medido (comum e admin). `apps/web` não usa componente antd; o provider muda lá sem efeito
  visível, e a suíte dela (87) passou.
- Comum × admin: medidos. Personificação não muda o provider.
- `subscription` × `simple`: o provider não depende do modo.
- Claro × escuro, desktop × 390 px, pt-br × en × es: medidos.

## 11. Estado do pipeline

A etapa `review` está `in-progress` no `STATE.md` e a branch não tem commit próprio
(`git log origin/main..HEAD` vazio). Numa rodada do `/cycle` isso é o esperado, porque os commits dependem
da aprovação do usuário. O teste novo fica no working tree e entra no commit 2 do plano do `/review`
(`fix(design-system): give antd real per-theme seed colours`), junto com os outros testes do pacote.
