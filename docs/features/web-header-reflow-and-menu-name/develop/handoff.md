# Handoff do develop: web-header-reflow-and-menu-name

Implementação do plano em `analyze/plan.md`, com um desvio: um teste existente fixava a classe exata do nome
da marca e precisou de ajuste (detalhe abaixo). Divide o working tree com `date-input-navigation` e
`form-field-focus-and-names`, que não foram tocadas, assim como o `specs/BACKLOG.md`.

## Desvio: `brandSurfaces.test.tsx` fixa a classe do nome da marca

O plano (§8.2) previa que `apps/web/__tests__/brandSurfaces.test.tsx` seguiria verde porque "a classe nova não
muda o texto". Não seguiu. Dois casos comparam o HTML com a string exata
`<p class="whitespace-nowrap font-semibold">…</p>` (linhas 99 e 109), e o `lg:truncate` muda o atributo.
Medido com `corepack pnpm --filter web test`: 2 reprovados, "mostra o nome neutro quando nenhuma marca está
configurada" e "mostra o nome configurado numa linha só, mesmo com 30 caracteres".

Ajuste: as duas strings esperadas passaram a ser
`<p class="whitespace-nowrap font-semibold lg:truncate">…</p>`. Nada mais no teste mudou.

Por que o contrato continua coberto: os dois casos garantem que o nome sai inteiro no HTML e numa linha só. O
nome completo continua sendo comparado literalmente, e o `whitespace-nowrap` continua na asserção. O
`truncate` também aplica `white-space: nowrap`, como mostrou a compilação da classe (abaixo). O que muda de
fato, e foi decidido no plano (D2), é que a partir de 1024 px, se a coluna do meio ficar menor que o nome, ele
aparece cortado com reticências. Isso só acontece em configuração extrema e o `/test` verifica (item 6).

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| 13.1 botão do menu com `aria-expanded` e `aria-label`; grade `lg:grid-cols-[1fr_minmax(0,auto)_1fr]`; `lg:truncate` na marca | `apps/web/app/[locale]/components/header/index.tsx` |
| 13.2 chave `components.header.menu` (Menu / Menu / Menú), via skill `i18n-sync` | `packages/internationalization/translations/components/header/index.ts` |
| 8.1 teste SSR novo | `apps/web/__tests__/headerMenuButton.test.tsx` (7 casos: M1 e M3 por idioma, M2 uma vez) |
| desvio acima | `apps/web/__tests__/brandSurfaces.test.tsx` (2 strings esperadas) |

## Contrato

Nenhum DTO, action, rota ou `error.code`. A única chave nova é `components.header.menu`, sem `apiErrors`. O
header não recebe props novas.

## Conferências feitas antes de implementar

- O Tailwind 4.1.16 do repositório gera o CSS esperado. Compilei as classes com o `compile` do pacote
  `tailwindcss` (script temporário, já apagado):
  `lg:grid-cols-3` → `grid-template-columns: repeat(3, minmax(0, 1fr))`;
  `lg:grid-cols-[1fr_minmax(0,auto)_1fr]` → `grid-template-columns: 1fr minmax(0,auto) 1fr`;
  `lg:truncate` → `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`, os três dentro de
  `@media (width >= 64rem)`.
- Os ícones do `lucide-react` só recebem `aria-hidden="true"` quando não têm prop de acessibilidade nem filhos
  (`lucide-react/dist/esm/Icon.js:32`), que é o caso de `Menu` e `X` aqui. O nome do botão vem só do
  `aria-label`.

## Validação

| Gate | Comando | Resultado |
|------|---------|-----------|
| Teste novo sem a chave e sem o header novo | `corepack pnpm exec vitest run __tests__/headerMenuButton.test.tsx` (em `apps/web`) | 7 de 7 reprovados |
| Teste novo com a chave e o header antigo | mesmo comando | 6 de 7 reprovados: M1 e M3 nos três idiomas. M2 passa porque a chave já existe |
| Teste novo com o header novo | mesmo comando, dentro da suíte | 7/7 |
| Suíte da web | `corepack pnpm --filter web test` | antes 95 testes / 16 arquivos; depois 102 / 17 (+7 novos). Os 2 casos do `brandSurfaces` reprovaram antes do ajuste descrito acima |
| Suíte do i18n, com paridade | `corepack pnpm --filter @repo/internationalization test` | 67 / 7, verde |
| Typecheck | `corepack pnpm --filter web typecheck`, `corepack pnpm --filter @repo/internationalization typecheck` | os dois sem erro |
| Lint | `corepack pnpm check` | 885 arquivos, sem erro |

Smoke local: não subi a web nem browser. Nenhuma medida de layout foi feita aqui.

## A verificar no `/test`

Nem o `node` nem o jsdom calculam layout. O roteiro completo está no §9 do plano; o essencial:

1. **Rolagem lateral.** Web em `build && start`, API e emuladores com `pnpm seed`, modo `subscription` com
   `NEXT_PUBLIC_APP_URL`. Em 1024, 1280 e 1440 px, `/pt-br`, `/en` e `/es`, visitante e logado, claro e
   escuro: anotar `document.documentElement.scrollWidth` e `clientWidth`, que têm de ser iguais. Casos que
   estouravam antes: es visitante a 1280 (1304), es e pt-br visitante a 1024 (+49 e +6), logado a 1024 e a
   1280 (+29 e +5).
2. **Marca no centro.** Nas mesmas larguras, centro da marca contra o centro da janela, com diferença
   abaixo de 2 px, e x da borda direita do último botão.
3. **Nada sumiu.** Links e botões visíveis do header em cada largura, comparados com o `HEAD`.
4. **Regressão abaixo de 1024.** A 768 e a 390 px, três idiomas: os mesmos itens de hoje e sem rolagem
   lateral. O nome da marca não aparece cortado.
5. **Botão do menu.** A 390 e a 768 px, na árvore de acessibilidade, nome "Menu"/"Menu"/"Menú" e
   `aria-expanded="false"`; tocar abre e muda para `true`, tocar de novo volta a `false`. Pelo teclado: Tab
   até o botão e Enter alterna. O SSR só prova o estado inicial.
6. **Configuração extrema** (informativo). Build com `NEXT_PUBLIC_DOCS_URL` e `NEXT_PUBLIC_APP_NAME` de 30
   caracteres, es a 1024 e 1280: sem rolagem lateral, e a 1024 o nome pode aparecer com reticências.
7. **axe.** `pnpm e2e` sem regra nova, com a `A11Y_ALLOWLIST` vazia.

## Lacunas de teste conhecidas

- Layout e rolagem não têm teste automatizado (D6 do plano). Ficam com os itens 1 a 4 acima.
- `aria-expanded="true"` depois do clique só é verificado no item 5.

## Decisões em aberto

Nenhuma nova. P1 a P3 do plano seguem com a opção adotada lá. O desvio no `brandSurfaces.test.tsx` merece um
olhar do `/review`: a alternativa seria tirar o `lg:truncate` e manter a string antiga no teste. Pela leitura do
CSS (não medido), na configuração extrema o nome passaria a transbordar sobre as colunas vizinhas em vez de
encolher.
