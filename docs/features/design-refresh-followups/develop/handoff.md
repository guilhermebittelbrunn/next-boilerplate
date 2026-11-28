# Handoff do develop: acabamento da branch de design

Branch `feat/design-system-refresh`, sem commit. As alterações em `specs/` e em
`docs/features/audit-log-levels/spec.md` que estão no working tree são de outra rodada e não foram tocadas.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| 5.1 `Toaster` respeita `forcedTheme` | `packages/design-system/components/ui/sonner.tsx`, `packages/design-system/__tests__/sonnerTheme.test.tsx` (novo, 4 casos) |
| 5.2 `ActionsMenu` com `onDelete` que rejeita | `packages/design-system/components/ui/action-menu.tsx`, `packages/design-system/__tests__/actionMenu.test.tsx` (1 caso novo) |
| 5.3 `Table` acompanha `pagination.pageSize` | `packages/design-system/components/ui/table.tsx`, `packages/design-system/__tests__/tablePagination.test.tsx` (2 casos novos) |
| 5.4 Menu mobile fecha com clique fora | `apps/web/app/[locale]/components/header/index.tsx`, `apps/web/__tests__/headerMobileMenu.test.tsx` (4 casos novos) |

O código segue os pseudo-diffs do plano. O único texto que mudou foi o comentário do `catch` no
`action-menu.tsx`: em vez de "its mutation shows the error toast", ficou
"Reporting the failure is the caller's job; the menu only has to leave the busy state.", porque o componente
não sabe se quem chama usa mutation.

## Contrato

Nenhuma API pública mudou. As props de `Toaster`, `ActionsMenu`, `Table` e `Header` são as mesmas. Os quatro
consumidores do `ActionsMenu` (`EntitiesListClient.tsx`, `UsersListClient.tsx`,
`OrganizationInvitationsTable.tsx`, `OrganizationMembersTable.tsx`) e o único consumidor com `pageSize`
(`UsersListClient.tsx`) continuam compilando: `pnpm --filter app typecheck` saiu com código 0.

Sem SDK, rota, `error.code` ou entrada nova em `apiErrors`. Nenhuma chave de i18n nova.

## Desvios em relação ao plano

Nenhum desvio de decisão. Conferi a técnica do 5.4 contra o comportamento do React com portal e ela se
sustenta: o listener do React no contêiner do portal despacha pela árvore de fibras, então o
`onPointerDownCapture` do wrapper dispara para o item do `LanguageSwitcher` mesmo ele estando fora do `div` no
DOM. A mutação M3 abaixo confirma.

Ajuste de forma nos testes do header: o helper que abre o menu com `pointerDown` + `click` devolve o
`aria-expanded` em vez de fazer o `expect` dentro dele, porque o Biome rejeita asserção fora de `it()`.

## Validação (instrumento e resultado)

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter @repo/design-system test` | 14 arquivos, 201 testes, todos passando |
| `pnpm --filter web test` | 36 arquivos, 325 testes, todos passando |
| `pnpm --filter @repo/design-system typecheck` | exit 0 |
| `pnpm --filter web typecheck` | exit 0 |
| `pnpm --filter app typecheck` | exit 0 |
| `npx biome check --write <8 arquivos tocados>` | sem erro, nenhuma correção aplicada |
| `pnpm check` | exit 0, 1181 arquivos, nenhuma correção |

### Prova de mutação (cada correção revertida, teste novo falhando)

Feita com o arquivo do `HEAD` no lugar do corrigido e restaurado em seguida (`git diff --stat` conferido depois).

| Mutação | Comando | Falhas |
|---------|---------|--------|
| `sonner.tsx` do `HEAD` | `vitest run __tests__/sonnerTheme.test.tsx` | 2 de 4: os dois casos de tema forçado |
| `action-menu.tsx` do `HEAD` | `vitest run __tests__/actionMenu.test.tsx` | 1 de 15: o caso de rejeição, com o `unhandledRejection` chamado 1 vez com `Error: delete failed` |
| `table.tsx` do `HEAD` | `vitest run __tests__/tablePagination.test.tsx` | 1 de 14: "aplica um pageSize novo vindo da prop". O caso de re-render com a mesma prop passa com o código antigo também, o que é esperado: ele trava a regressão de quem implementar a sincronização sem comparar o valor anterior |
| M1: `header/index.tsx` do `HEAD` | `vitest run __tests__/headerMobileMenu.test.tsx` | 2 de 12: fechar ao tocar fora e fechar depois de reabrir |
| M2: sem `pointerStartedInsideMenu.current = false` no efeito | idem | 2 de 12: os mesmos dois, porque o `pointerdown` do botão deixa o ref marcado |
| M3: `contains(event.target)` no DOM em vez da árvore do React | idem | 1 de 12: o caso do idioma no portal |

## Gate do `docs/DESIGN.md` §5

Não há tela nova nem reformulada; são quatro correções de comportamento. Respondo o gate pelo que se aplica.

1. Específico: não se aplica, nenhuma composição visual mudou.
2. Evidência: não consultei referência; a técnica do clique fora é a do `DismissableLayer` do Radix, já
   dependência do repo.
3. Estados: os estados novos (rejeição no `onDelete`, troca de `pageSize`, tema forçado) só estão medidos
   em Vitest, conforme a tabela acima. Nada visto renderizado.
4. Conteúdo: nenhum markup novo.
5. Hierarquia: não mudou.
6. Limites: não subi app nem abri browser. Tudo que depende de renderização real está na seção seguinte.

## A verificar no `/test`

Nenhuma destas afirmações tem medição minha fora do jsdom.

- Landing em 390 px, clique fora: abrir o menu e tocar no conteúdo abaixo do header deve fechar, com
  `aria-expanded="false"` no botão.
- Toque numa área vazia do próprio painel mantém aberto.
- Seletor de idioma dentro do painel: abrir e escolher outro idioma deve trocar a rota. No jsdom só provei
  que o `pointerdown` no item não fecha o painel; a troca de rota no browser real não foi vista.
- Seletor de tema dentro do painel: escolher escuro deve mudar o tema sem o painel fechar antes da seleção.
  Não há teste automatizado para o `ModeToggle`; o caminho é o mesmo do `LanguageSwitcher` (portal do Radix).
- Com o seletor de idioma aberto, tocar fora de tudo: espero que feche o dropdown e o painel no mesmo toque
  (o Radix dispensa o dropdown e o nosso listener fecha o painel). Conferir se isso é aceitável ou se o
  usuário espera fechar só o dropdown. O `DropdownMenu` modal põe `pointer-events: none` no `body` enquanto
  está aberto; o alvo do toque fora pode ser o `html`, e o listener em `document` recebe do mesmo jeito.
- Escape continua fechando e devolvendo o foco ao botão (coberto em jsdom pelos casos antigos).
- App: excluir uma entidade pelo `ActionsMenu` em light e dark, o diálogo fecha e o toast de sucesso sai no
  tema da página.
- App: tabela de usuários do admin continua com 10 linhas por página.

Sem caminho na UI atual para reproduzir: toast com `forcedTheme` (nenhuma página força tema), `onDelete`
que rejeita (nenhum consumidor passa promise) e troca de `pageSize` pela prop. Esses ficam provados só no
Vitest, e o relatório do `/test` deve dizer isso.

## Lacunas de teste conhecidas

- Nenhum teste do `ModeToggle` dentro do painel com clique fora; só o `LanguageSwitcher` cobre o caso do
  portal.
- Fechamento simultâneo do dropdown e do painel ao tocar fora com o seletor aberto não tem teste.

## Pendências e decisões em aberto

Nenhuma bloqueante. As perguntas 1 a 4 do plano continuam como registradas lá (catch que fecha o diálogo,
prop vence só quando muda, painel feito à mão mantido, foco no `body` ao seguir link fora do escopo).
