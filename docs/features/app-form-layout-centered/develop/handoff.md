# Handoff do `/develop`: telas de formulário centralizadas e com altura do conteúdo

Implementação do `analyze/plan.md` sem desvio de escopo. Só `apps/app` e um teste de `apps/e2e`. Nenhum
contrato de SDK, rota de API, chave de i18n, variável de ambiente ou pré-requisito de infra.

## D0: diagnóstico do E2E vermelho (`focusNotObscured.spec.ts:188`)

A causa está no teste: o clique em "Mais ações" chegava antes de a lista hidratar e se perdia.

Instrumento: log do job `e2e` do run 45633106961 (`gh api .../actions/jobs/139271383244/logs`) e o trace
do artefato `e2e-evidence` (`gh run download 45633106961 -n e2e-evidence`), primeira tentativa.

- O `goto` termina em 239931 ms (tempo monotônico do trace); o clique em "Mais ações" é despachado em
  240090 ms (`performing click action`) e termina em 240391 ms.
- O quadro do screencast em 240088 ms mostra a tabela ainda sem o CSS do antd (cabeçalho duplicado, linhas
  compactas). O quadro seguinte, em 240396 ms, já mostra a tabela estilizada, com outra geometria de
  linha. Ou seja, o clique caiu no HTML do servidor, antes de o `Dropdown` montar no cliente.
- As primeiras requisições do cliente (`accounts:lookup` do Firebase em 240411 ms,
  `/api/auth/session/refresh` em 240419 ms) só saem depois do clique.
- O snapshot de erro (`error-context.md`) mostra o botão da linha "Acme Franchise" com `[active]` e nenhum
  `menuitem`: o foco nativo chegou, o handler não. Como o teste clicava uma vez só, esperava 120 s por um
  menu que nunca abriria.

O `entityCrud.spec.ts` não sofre disso porque roda o axe e navega pelo cliente antes de abrir o menu.

Correção (`apps/e2e/tests/focusNotObscured.spec.ts`): o mesmo padrão já usado no repositório para menus
antd depois de carga fria (`organizationOwnership.spec.ts:123-129`, `crossAppSignOut.spec.ts:71-77`,
`support/panelNavigation.ts:21-30`). Dentro de `expect(...).toPass()`, clica no gatilho só se o item
"Editar" ainda não estiver visível e espera o item por 2 s. A checagem antes de clicar evita fechar um menu
que abriu atrasado. A navegação continua pela lista, sem URL direta, e nenhuma asserção foi afrouxada.

A correção **não foi rodada** aqui (`pnpm e2e` não subiu; o diagnóstico fechou pelo trace). O
`pnpm --filter e2e typecheck` passa. O `--repeat-each` fica para o `/test`.

## Blueprint → arquivos

| item | arquivos |
|---|---|
| Coluna `narrow` centralizada (§5.1) | `apps/app/shared/components/ui/pageLayout.ts` (`PAGE_NARROW_CLASS` ganhou `mx-auto`) |
| `<form>` com altura do conteúdo (§5.2) | `users/(pages)/create/page.tsx`, `users/(pages)/edit/[id]/page.tsx`, `entities/(pages)/create/page.tsx`, `entities/(pages)/edit/[id]/EditEntityClient.tsx`: `flex min-h-[50vh] w-full flex-1 flex-col` → `flex w-full flex-col` |
| Blocos da conta sem `flex-1` (§5.4) | `AccountProfileForm.tsx`, `AccountPreferencesForm.tsx`, `AccountSecurityForm.tsx`, `AccountPrivacyPanel.tsx`, `AccountBillingPanel.tsx` |
| Esqueletos estreitos (§5.6) | novos `loading.tsx` em `users/(pages)/create/`, `users/(pages)/edit/[id]/`, `entities/(pages)/create/`, cópia de `entities/(pages)/edit/[id]/loading.tsx` |
| T1 | `apps/app/__tests__/pageShell.test.tsx` (caso "limita a largura e centraliza só com width narrow") |
| T2 | `apps/app/__tests__/formLoadingSkeletons.test.tsx` (novo, cinco `loading.tsx`) |
| Regra de páginas | `apps/app/CLAUDE.md`, seção Páginas |
| D0 | `apps/e2e/tests/focusNotObscured.spec.ts` |

`Container.tsx`, `PageSkeleton.tsx`, `Footer.tsx` e `FormSkeleton.tsx` não mudaram. O grep por
`width="narrow"` em `apps/app/app` devolve os mesmos sete arquivos listados no plano, então nenhuma lista
recebe a classe nova.

## Contrato, erros, i18n

Nenhum DTO, action ou `error.code` novo. Nenhuma chave de tradução.

## Desvios

Nenhum. Conferi as linhas citadas no plano antes de editar e todas batiam.

## Validação

| gate | comando | resultado |
|---|---|---|
| T1 + T2 | `pnpm vitest run __tests__/pageShell.test.tsx __tests__/formLoadingSkeletons.test.tsx` (em `apps/app`) | 14/14 |
| T1 + T2 sem a mudança | mesma linha com `PAGE_NARROW_CLASS` revertido para `"w-full max-w-4xl"` (restaurado em seguida) | 6 falhas de 14: os testes acusam a regressão |
| suíte da app | `pnpm --filter app test` | 144 arquivos, 1321 testes, todos verdes |
| typecheck | `pnpm --filter app typecheck`, `pnpm --filter e2e typecheck` | sem erro |
| lint | `pnpm check` | 1138 arquivos, sem erro |

Não houve smoke no browser: a mudança é só de classe CSS e `loading.tsx`, e nada travava o trabalho.

## A verificar no `/test`

Nada abaixo foi medido aqui.

- Centralização a 1920×1080 nas cinco telas (margens iguais, diferença ≤ 1 px) e o `h1` na borda da coluna.
- Painel `bg-muted/50` com a altura dos campos e a barra de ações 16 px abaixo dele, nas quatro telas de
  criar/editar.
- Barra fixa grudada no rodapé em formulário longo (390×844; editar entidade com descrição longa no desktop).
- Os dois primeiros casos do `focusNotObscured.spec.ts` a 375×812. O primeiro exige algum campo começando
  abaixo da barra com a página no topo (`:106-109`); com o `<form>` sem `min-h-[50vh]`, isso é hipótese.
- O terceiro caso do mesmo arquivo depois da correção do D0, com `--repeat-each`.
- Esqueletos sem salto horizontal com rede lenta, nas cinco telas.
- Listas e dashboards inalterados; mobile com o painel mínimo de 50vh; `LoadErrorState` igual ao de antes.
- Abas da conta sem blocos esticados, claro e escuro, três idiomas.

## Lacunas de teste conhecidas

- Não há teste unitário das classes dos `<form>` nem dos blocos da conta (decisão do plano, §7). A altura
  só se prova no browser.
- Achado fora de escopo, visto no trace do D0: a tabela do antd chega do servidor sem o CSS-in-JS e muda de
  geometria quando hidrata (cabeçalho duplicado e linhas compactas no quadro de 240088 ms). Pode ser
  comportamento só do `next dev`; antes de levar ao backlog, confirmar em `pnpm --filter app build && start`.

## Pendências

Nenhuma decisão em aberto. Nenhum pré-requisito de infra.
