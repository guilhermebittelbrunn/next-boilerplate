# Revisão: acabamento da branch de design

## Branch

`feat/design-system-refresh`, reutilizada. É a branch desta tarefa (o `STATE.md` aponta para ela) e já existe no
remoto (`origin/feat/design-system-refresh`, sem divergência: 0 commits atrás e 0 à frente). Não foi renomeada nem
recriada.

Validação do nome pelo regex de `.claude/agents/revisor-codigo.md`: `branch OK: feat/design-system-refresh`. A forma
sem `project` é a de mudança que cruza apps, e a branch carrega `apps/app`, `apps/web` e `packages/design-system`.

## Escopo revisado

O working tree tem dois assuntos, revisados de forma diferente:

1. A tarefa `design-refresh-followups`: `sonner.tsx`, `action-menu.tsx` e `table.tsx` do design system, o header
   da landing e os testes de cada um. Revisada contra `docs/review-checklist.md` (§0, §3, §4, §5.1, §6, §7.1).
2. A auditoria do backlog da mesma rodada: `specs/BACKLOG.md`, `specs/reference/AUDIT.md`, cinco arquivos em
   `specs/features/` e `docs/features/audit-log-levels/spec.md`. Conferida só para segredo e coerência, sem
   reescrita.

## Revisão: design-refresh-followups

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/web/app/[locale]/components/header/index.tsx:95-103` — o painel fecha no `pointerdown` de qualquer tipo de
  ponteiro, inclusive toque. O plano diz que a técnica é "a mesma do `DismissableLayer` do Radix", mas o Radix trata
  toque de outro jeito: com `pointerType === "touch"` ele adia o fechamento para o `click` seguinte
  (`@radix-ui/react-dismissable-layer` 1.1.11, `dist/index.mjs:153-156`), justamente para que arrastar o dedo para
  rolar a página não conte como toque fora. Aqui, num celular, começar a rolar o conteúdo abaixo do header fecha o
  menu. A parte da árvore do React com portal é igual à do Radix; a de toque, não. Não corrigi porque muda o
  comportamento decidido no plano; está em "Decisões em aberto" e em "Verificar no `/test`".

### 🟢 Sugestão / nit

- `packages/design-system/components/ui/action-menu.tsx:81-83` — o `catch` vazio engole a rejeição sem nenhum
  sinal. Um chamador que passe uma função `async` sem `onError` próprio deixa de ver até o `unhandledrejection` no
  console que via antes. É a decisão 1 do plano (o chamador reporta), coerente com os quatro consumidores atuais,
  que passam `mutation.mutate` e mostram o toast no `onError`. Fica registrado para quem usar `mutateAsync` no
  futuro.
- `packages/design-system/components/ui/sonner.tsx:17` — um `forcedTheme="system"` cai em `light`, porque o valor
  literal não é `"dark"`. É o mesmo comportamento do provider do antd que saiu e nenhum app força tema, então não
  mexi.

### ✅ OK

- `sonner.tsx:16-17`: a premissa do plano confere no código instalado. No `next-themes` 0.4.6 o `resolvedTheme` é
  `theme === "system" ? systemTheme : theme` e não olha `forcedTheme` (`dist/index.js` do pacote), então o
  `forcedTheme ?? resolvedTheme` é a correção certa. O comentário explica uma restrição da biblioteca e não cita o
  fluxo.
- `action-menu.tsx:77-87`: o `finally` continua saindo do estado ocupado e fechando o diálogo; o `catch` também cobre
  um `onDelete` síncrono que lance erro, que antes virava rejeição solta dentro da função `async`.
- `table.tsx:142-149`: ajuste de estado durante o render, com comparação contra o último valor aplicado. Re-render
  com a mesma prop não toca no estado, então a escolha do seletor sobrevive a refetch. `setPage` já existe acima
  (`:140`). Sem `useEffect`, sem render extra visível.
- `header/index.tsx:86`, `:246-248`: o ref zerado no efeito resolve o `pointerdown` do botão que abriu o menu. O
  `onPointerDownCapture` do React percorre a árvore de fibras, então o item do `LanguageSwitcher` no portal conta
  como dentro. No App Router o contêiner do React é o `document`, e o listener de captura dele roda antes do nosso,
  que é de bolha. A ordem não depende de quem registrou primeiro.
- O comentário de `header/index.tsx:93-94` entra na exceção 2 de `.claude/rules/code-comments.md` (armadilha do
  portal). Nenhum comentário aponta para artefato do fluxo.
- §0: mudança mínima, nenhuma API pública mudou (props de `Toaster`, `ActionsMenu`, `Table` e `Header` iguais),
  nada de domínio no pacote, nenhum `console.log`. `components/ui/*` ficam fora do Biome; a indentação de cada arquivo
  segue a que já existia (4 espaços em `action-menu.tsx`, 2 em `table.tsx` e `sonner.tsx`).
- §4: o design system continua presentacional, sem fetch nem sessão. Nenhum componente novo para reexportar.
- §5 e §5.1: nenhuma chave de i18n nova, nenhuma classe, token, sombra, cor ou animação nova. O diff só muda
  comportamento, então o `web-design-guidelines` não tem o que avaliar aqui. O handoff responde o gate de 6
  perguntas.
- §6: testes no nível mais barato (jsdom, componente). Mocks na borda (`next-themes`, `sonner`). O header usa
  `// @vitest-environment jsdom` no próprio arquivo, a exceção que o `apps/web/CLAUDE.md` permite para estado que
  só muda por evento. `afterEach(cleanup)` no `sonnerTheme.test.tsx` está certo: o design system não tem
  `vitest.setup.ts` e os outros testes do pacote fazem o mesmo.
- `/code-review` (nível baixo) sobre os quatro arquivos de produto: sem achado.

### 👁 Verificar no `/test`

Começa pelo item de maior risco, que é o único defeito real da tarefa (menu mobile da landing). Os itens 1 a 3 do
plano são latentes e só têm prova em Vitest.

- Toque fora fecha o menu, a 390 px — repro: abrir o menu e tocar no hero abaixo do header; o painel some e o botão
  fica com `aria-expanded="false"`. O teste do jsdom só dispara `pointerDown` sintético em `document.body`.
- Rolar a página com o menu aberto (achado 🟡) — repro: com o menu aberto, arrastar o dedo sobre o conteúdo abaixo
  do header para rolar. Hoje o esperado pelo código é fechar no primeiro contato. Registrar o que acontece e se a
  rolagem chega a acontecer; isso decide a pergunta em aberto. Precisa de emulação de toque (`pointerType` igual a
  `touch`), não de clique de mouse.
- Toque numa área vazia do próprio painel mantém aberto — repro: tocar no espaço entre os links do painel.
- Seletor de idioma dentro do painel troca a rota — repro: abrir o menu, abrir o seletor de idioma, escolher
  English; a URL passa a `/en`. O jsdom só provou que o `pointerdown` no item não fecha o painel.
- Seletor de tema dentro do painel — repro: abrir o menu, abrir o seletor de tema, escolher escuro; o tema muda antes
  de o painel fechar. Não há teste automatizado do `ModeToggle` nesse caminho.
- Seletor aberto e toque fora de tudo — repro: abrir o menu, abrir o seletor de idioma, tocar no hero. O código
  fecha dropdown e painel no mesmo toque (o Radix dispensa o dropdown e o nosso listener fecha o painel). Com o
  dropdown modal o `body` fica com `pointer-events: none` e o alvo vira o `html`; conferir que o painel fecha mesmo
  assim e que nada fica preso.
- Escape continua fechando e devolvendo o foco ao botão — repro: abrir, apertar Escape, conferir o foco.
- Em 1024 px sem link de documentação o botão do menu some — repro: largura 1024, sem `NEXT_PUBLIC_DOCS_URL`.
- App, excluir uma entidade pelo `ActionsMenu` em light e dark — repro: lista de entidades, menu de ações, Excluir,
  confirmar; o diálogo fecha e o toast de sucesso sai no tema da página.
- App, tabela de usuários do admin continua com 10 linhas por página — repro: `/admin/users` com mais de 10
  usuários.

Sem caminho na UI atual, provados só em Vitest, e o relatório do `/test` deve dizer isso: toast com `forcedTheme`
(nenhuma página força tema), `onDelete` que rejeita (nenhum consumidor passa promise) e troca de `pageSize` pela prop
(o único consumidor passa a constante `10`).

## Correções aplicadas

Nenhuma. Não achei problema claro a corrigir; o único achado 🟡 muda comportamento decidido no plano e ficou para
decisão.

## Raio de impacto

Nenhum contrato mudou. Os consumidores herdam só o comportamento novo:

- `Toaster`: montado pelo `DesignSystemProvider` (`packages/design-system/index.tsx`), então vale para `apps/app` e
  `apps/web`. Sem `forcedTheme` em nenhum app, o tema do toast é o mesmo de antes.
- `ActionsMenu`: `EntitiesListClient.tsx`, `UsersListClient.tsx`, `OrganizationInvitationsTable.tsx`,
  `OrganizationMembersTable.tsx`. Todos passam `mutation.mutate`, que devolve `void`; nada muda para eles.
- `Table`: todas as tabelas de `apps/app`. Só `UsersListClient.tsx` passa `pageSize`, e é constante.
- `Header`: só `apps/web`.

## Lacunas de teste

Vereditos sobre as lacunas do handoff:

- `ModeToggle` dentro do painel com clique fora, sem teste: continua aberta. O `LanguageSwitcher` cobre o mesmo
  caminho de portal, então o risco é baixo; o `/test` confere no browser.
- Fechamento simultâneo do dropdown e do painel ao tocar fora com o seletor aberto, sem teste: continua aberta, e
  está na lista acima.

Lacunas novas:

- Nenhum teste distingue toque de mouse no clique fora. Se a decisão em aberto for adiar o fechamento do toque para
  o `click`, o teste precisa disparar `pointerDown` com `pointerType: "touch"`.
- `onDelete` síncrono que lança erro não tem caso. O `catch` cobre, mas nada trava isso.

## Decisões em aberto

1. **Toque fora fecha no `pointerdown` ou no `click`.** Hoje fecha no `pointerdown`, também para toque, e iniciar uma
   rolagem sobre a página fecha o menu. A alternativa é seguir o Radix: para `pointerType === "touch"`, registrar um
   `click` único no `document` e fechar só nele, de modo que rolar não feche. Recomendação: manter como está e deixar
   o `/test` medir. Num menu que cobre o topo da página, fechar quando a pessoa começa a rolar é aceitável, e a
   variante com `click` traz o caso de `click` que nunca chega (rolagem cancelada) para tratar. Se o `/test` mostrar
   que a rolagem fica travada ou que o fechamento atrapalha, adotar a variante do Radix. Em qualquer caso, a frase do
   plano de que a técnica é "a mesma do `DismissableLayer`" vale só para a parte do portal.

As perguntas 1 a 4 do plano seguem como registradas lá, e a revisão concorda com as escolhas adotadas.

## Auditoria do backlog (segundo assunto)

Conferida só para segredo e coerência:

- Varredura das linhas acrescentadas em `specs/` e `docs/features/audit-log-levels/spec.md` por e-mail, senha,
  token e chave: nenhum e-mail, nenhuma credencial. As ocorrências de "senha" e "token" são nomes de funcionalidade
  e de schema (`password.schema.ts`, "troca de senha").
- Coerência: a spec `audit-log-levels` passa a dizer que a PR #78 foi mergeada em `6943ce9`, e esse commit é
  ancestral do `HEAD` desta branch. O `specs/BACKLOG.md:9` registra a auditoria sobre `main` em `6943ce9`, na
  branch `feat/design-system-refresh`, o que bate com o estado do repositório. As âncoras remedidas
  (`AccountSecurityForm.tsx:168`, `auth/sign-up/route.ts:60`, `users/route.ts:69`) não foram reconferidas linha a
  linha; isso é trabalho do `/spec --sync`.

## Artefatos da tarefa

`docs/features/design-refresh-followups/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md` e este arquivo)
varrido por senha, token, chave e e-mail: nada encontrado. Não há pasta de screenshots.

## Gates

| Comando | Resultado |
|---------|-----------|
| `pnpm check` | 1181 arquivos, nenhuma correção |
| `pnpm --filter @repo/design-system --filter web --filter app typecheck` | os três com `Done` |
| `pnpm --filter @repo/internationalization test` | não rodado: nenhum arquivo de tradução no diff |

As suítes Vitest não foram rodadas aqui (são do `/test`). O handoff registra 201 testes no design system e 325 na
web, com prova de mutação; esses números são dele, não desta revisão.

## Plano de commits

Ordem: código do design system, um commit por correção, depois a web, depois a auditoria do backlog, e os artefatos
da tarefa por último.

1. `fix(design-system): let a forced theme drive the toaster theme`
   - `packages/design-system/components/ui/sonner.tsx`
   - `packages/design-system/__tests__/sonnerTheme.test.tsx`
2. `fix(design-system): catch a rejected onDelete in the actions menu`
   - `packages/design-system/components/ui/action-menu.tsx`
   - `packages/design-system/__tests__/actionMenu.test.tsx`
3. `fix(design-system): follow pagination.pageSize changes in the table`
   - `packages/design-system/components/ui/table.tsx`
   - `packages/design-system/__tests__/tablePagination.test.tsx`
4. `fix(web): close the mobile menu on a click outside`
   - `apps/web/app/[locale]/components/header/index.tsx`
   - `apps/web/__tests__/headerMobileMenu.test.tsx`
5. `docs(specs): sync backlog after PR #78 and the design system refresh`
   - `specs/BACKLOG.md`
   - `specs/reference/AUDIT.md`
   - `specs/features/account-security-mfa.md`
   - `specs/features/international-billing.md`
   - `specs/features/observability-logging.md`
   - `specs/features/one-time-purchase.md`
   - `specs/features/signup-email-verification.md`
   - `docs/features/audit-log-levels/spec.md`
6. `docs(features): design-refresh-followups`
   - `docs/features/design-refresh-followups/STATE.md`
   - `docs/features/design-refresh-followups/analyze/plan.md`
   - `docs/features/design-refresh-followups/develop/handoff.md`
   - `docs/features/design-refresh-followups/review/review.md`

Título de PR: o da branch, já sugerido na revisão do refactor, `feat: design system refresh without antd`. A branch já
tem remoto, então o push é `git push origin feat/design-system-refresh`, só depois do "sim" do usuário.

### Commits realizados

(preenchido pelo orquestrador depois de commitar)
