# Handoff do `/develop`: foco escondido pela barra fixa

Plano: `analyze/plan.md`. Plano A (`scroll-padding` no `<html>`) medido no Chromium e mantido. O plano B
(listener de `focusin`) não foi necessário.

## Blueprint → arquivos

| item do plano | arquivo | mudança |
|---------------|---------|---------|
| `scroll-padding` condicional no documento | `apps/app/app/layout.tsx` | `has-[[data-panel-navbar]]:scroll-pt-20 has-[[data-sticky-action-bar]]:scroll-pb-20` ao lado do `scroll-smooth`, com um comentário de duas linhas explicando os 80 px |
| atributo no `Footer` fixo | `apps/app/shared/components/ui/Footer.tsx` | `data-sticky-action-bar={sticky ? "" : undefined}` |
| atributo na barra do `Container` | `apps/app/shared/components/ui/Container.tsx` | `data-sticky-action-bar=""` no `stickyBar` |
| atributo no `PageFormFooter` | `apps/app/shared/components/ui/PageFormFooter.tsx` | `data-sticky-action-bar=""` |
| atributo no `Navbar` | `apps/app/shared/components/ui/Navbar.tsx` | `data-panel-navbar=""` no `<nav>` |
| T1 | `apps/app/__tests__/focusNotObscuredScrollPadding.test.tsx` (novo) | 7 casos: tamanho `20` dos dois lados, `Footer` fixo, `Footer sticky={false}` sem atributo, `PageFormFooter`, `Container contentOnly showGoBack`, `Container` sem barra, `Navbar` |
| T2 | `apps/e2e/tests/focusNotObscured.spec.ts` (novo) | 3 testes a 375×812 no projeto `chromium` (detalhe em "Desvios") |
| regra no guia do app | `apps/app/CLAUDE.md` | uma linha na seção "Formulários com ações no rodapé". O bloco "Pós-login é carga completa", da tarefa de autenticação, ficou intocado na seção "Autenticação / admin / contexto de painel" |

Contrato (SDK, API, i18n, env): nenhum. Nenhum `error.code` novo, nenhuma chave de tradução.

## Desvios do plano

1. **O repro das setas roda em editar entidade, não em criar.** O plano escolheu criar para não depender do
   seed. Medido no Playwright a 375×812: em criar, a página rola no máximo 137 px e, com ela no topo, o último
   rádio ("Outro") fica em 728 a 744 px contra a barra em 743 px. Ou seja, 1 px de sobreposição, e não há
   rolagem para descer o grupo mais. Em editar a entidade semeada (`Acme Franchise`), o switch "Ativo"
   empurra o grupo, e com a página no topo "Outro" fica em 764 px, o mesmo número do repro original da
   PR #62. O teste navega pela lista (menu de ações da linha), como o `entityCrud.spec.ts`, e só lê a
   entidade.
2. **O sentido do `Navbar` ganhou um teste próprio, com a página posicionada.** O Shift+Tab do formulário
   inteiro passava mesmo sem o `scroll-pt-20` (medido: rodada com só essa classe removida, 1 de 1 verde). O
   motivo é a página curta: em criar, com a rolagem máxima de 137 px, o nome fica em 97 px, abaixo do `Navbar`.
   Quando o campo está totalmente fora da tela, o Chromium centraliza o campo ao focar, então ele nunca para
   sob a barra. O teste novo preenche a descrição com 12 linhas (o `Textarea` usa `field-sizing-content` e
   cresce), foca a descrição, rola a página até o topo do nome ficar 24 px por baixo do `Navbar` (em 40 px) e
   aperta Shift+Tab. Antes de apertar, ele confere que o nome está na tela e por baixo do `Navbar`, para não
   passar no vazio se o layout mudar.
3. **Achado no caminho, sem correção.** Numa primeira versão, o Shift+Tab subindo pela descrição longa
   deixou o topo do `textarea` em -59 px com a correção ativa. O Chromium rola um campo de texto até o
   cursor, não até a caixa: com o cursor no fim do texto, visível, ele não rola, e as primeiras linhas ficam
   por baixo do `Navbar`. O SC 2.4.11 (mínimo) segue atendido, porque o campo não fica inteiro escondido e o
   cursor aparece. O `scroll-padding` não muda isso e o teste final não passa por esse caso. Fica registrado
   para o `/test` e para o backlog, se valer.
4. **Asserções de pré-condição no E2E**, que o plano não previa: o último rádio começa abaixo do topo da barra,
   o rádio marcado tem opções abaixo dele e o nome está sob o `Navbar` antes do Shift+Tab. Cada uma reprova
   alto se o layout mudar a ponto de o teste deixar de reproduzir o defeito.

## Validação (instrumento de cada número)

| o quê | comando | resultado |
|-------|---------|-----------|
| T1 verde | `npx vitest run __tests__/focusNotObscuredScrollPadding.test.tsx` (em `apps/app`) | 7/7 |
| T1 vermelho, sem as duas classes no `<html>` | mesmo comando | 5 falham, 2 passam (os dois casos negativos, que dependem do caso 1 para não passarem no vazio; o caso 1 falha com `expected undefined to be '20'`) |
| T2 verde | `pnpm exec playwright test tests/focusNotObscured.spec.ts --project=chromium --retries=0` (JDK 21) | 3/3 |
| T2 vermelho, sem as duas classes | mesmo comando | 3/3 falham: Tab `birthdate ends at 812px, under the action bar that starts at 743px`; navbar `… starts at 40px, under the navbar that ends at 64px`; setas `_r_n_-female ends at 748px, under the action bar that starts at 743px` |
| T2 vermelho, só sem `scroll-pt-20` | mesmo comando | só o teste do `Navbar` falha (40 px contra 64 px), os outros 2 passam |
| estabilidade com `scroll-smooth` | `... --repeat-each=3 --retries=0` | 9/9 verdes, nenhum flaky |
| suíte E2E completa | `pnpm exec playwright test --retries=0` | 45 passed (3,0 min), projetos `setup`, `chromium` e `mobile` |
| Vitest de `app` e `e2e` | `pnpm turbo run typecheck test --filter=app --filter=e2e` | `app` 143 arquivos verdes, `e2e` 3 arquivos verdes, 12/12 tasks |
| typecheck `app` e `e2e` | `pnpm turbo run typecheck --filter=app --filter=e2e` | 2/2 |
| lint | `pnpm check` | 1127 arquivos, nenhum ajuste |
| `scroll-padding` calculado | `getComputedStyle(document.documentElement)` no Playwright, em criar entidade | `scrollPaddingBottom` e `scrollPaddingTop` = `80px` |

Nenhum gate com `--force`. Portas 3000, 3001, 3002, 8080, 9099 e 4001 conferidas livres antes e depois de
cada rodada (`lsof -ti tcp:<porta>`). O Playwright subiu e derrubou o stack, sem `next-server` ou Java
sobrando (`ps`). Os `apps/{api,app,web}/AGENTS.md` não rastreados que o `next dev` gera foram apagados.
Nenhum screenshot persistido. Os `test-results/` das rodadas vermelhas ficam no diretório ignorado do
Playwright.

## A verificar no `/test`

- As outras telas com barra fixa (criar e editar usuário no admin, os dois passos do onboarding), a 390×844 e
  a 1280×720: o E2E só cobre criar e editar entidade a 375×812. Repro: Tab do primeiro campo até a barra e
  Shift+Tab de volta, medindo `getBoundingClientRect` do `document.activeElement` contra
  `[data-sticky-action-bar]` e `[data-panel-navbar]`.
- `scroll-padding` no valor padrão sem barra: lista de entidades (`scrollPaddingBottom`), blocos da conta com
  `sticky={false}` e login sem `Navbar` (`scrollPaddingTop`), inclusive depois de sair de um formulário por
  navegação do App Router, sem recarregar. Não medi.
- A barra numa linha só a 375 px nos três idiomas, com 69 px, em claro e escuro. Não medi.
- O `textarea` com texto longo e cursor no fim (desvio 3): decidir se é aceitável no nível mínimo do SC.
- Teclado virtual, Safari e Firefox: continuam não verificáveis aqui (plano §8.4).

## Lacunas de teste conhecidas

- O E2E não cobre admin nem onboarding, e não roda nos idiomas `en` e `es`.
- O T1 confere que seletor e atributo combinam, mas não a altura da barra. Uma barra acima de 80 px só é
  pega pelo E2E, e só nas telas que ele percorre.

## Pendências

Nenhuma decisão em aberto bloqueia o `/review`. O `apps/app/CLAUDE.md` tem dois blocos de tarefas
diferentes, em seções distintas, que o plano de commits precisa separar (plano §10.5).
