# Handoff do develop: link de documentação e menu mobile da web

Escopo: só `apps/web`, `pnpm-lock.yaml` (importer `apps/web`) e `docs/SETUP.md`. Nenhuma mudança em SDK, API,
i18n ou `packages/*`. Nenhuma branch criada, nenhum commit.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| §12.1 `env.ts` | `apps/web/env.ts`: `NEXT_PUBLIC_DOCS_URL` no `client` e no `runtimeEnv` com `\|\| undefined`. O comentário que já explicava o `NEXT_PUBLIC_APP_URL` passou a cobrir as duas chaves. |
| §12.2 header | `apps/web/app/[locale]/components/header/index.tsx`: objeto `FULL_BAR_FROM` (`lg`/`xl`) escolhido por `docsUrl`; link externo da barra cheia com `target="_blank"` e `rel="noopener noreferrer"`; `closeMenu` no `onClick` do item e do subitem do painel mobile; helper `isExternal` usado na barra e no painel. |
| §5.5 footer | Sem mudança de código. Passa a mostrar o link porque o `env` agora carrega a variável (coberto pelo T1). |
| §8.1 T1 | `apps/web/__tests__/docsUrlEnv.test.tsx` (novo, ambiente `node`, `env.ts` real) |
| §8.2 T2 | `apps/web/__tests__/headerMobileMenu.test.tsx` (novo, `// @vitest-environment jsdom`) |
| §8.3 devDependencies | `apps/web/package.json` (`@testing-library/dom ^10.4.1`, `@testing-library/react ^16.3.0`, `jsdom ^27.0.1`) e `pnpm-lock.yaml` (+9 linhas, só no importer `apps/web`) |
| §12.4 CLAUDE.md | `apps/web/CLAUDE.md`, seção "Testes": "sem jsdom por padrão" e a segunda exceção estreita (jsdom por arquivo para interação de Client Component) |
| §12.3 SETUP | `docs/SETUP.md:72`: a variável é lida só pela `web`, no header e no footer, em aba nova; com o link, a barra completa começa em 1280 px |

## Contrato

Nenhum DTO nem action mexidos. A única superfície pública nova é a chave `NEXT_PUBLIC_DOCS_URL` no objeto `env` da
`apps/web`, consumida por `header/index.tsx` e `footer.tsx`, que já a liam.

## Códigos de erro novos

Nenhum. Nenhuma chave de i18n nova: o rótulo vem de `components.header.docs`, que já existe nos três idiomas.

## Desvios em relação ao plano

1. **Lockfile editado à mão, e não por `pnpm install`.** As tentativas de `pnpm install` não terminaram: com
   rede, o registry devolveu `ECONNRESET` e requisições de vários minutos (`/tmp/bogota-pnpm-install.log`); com
   `--offline`, faltavam metadados no cache (`ERR_PNPM_NO_OFFLINE_META` para `concurrently` e
   `@firebase/performance`). É provavelmente o que travou a primeira execução desta etapa. Acrescentei as três
   entradas ao importer `apps/web` copiando literalmente as strings de versão que o importer `apps/app` já usa:
   `@testing-library/dom 10.4.1`, `@testing-library/react 16.3.2(…)`, `jsdom 27.0.1(bufferutil@4.0.9)(postcss@8.5.6)`.
   O `vitest` da web já estava resolvido com o peer `jsdom@27.0.1(…)`, a mesma variante usada pelos oito
   importers que têm `vitest`, então nenhuma outra linha mudou. Conferência: `pnpm install --frozen-lockfile
   --offline --ignore-scripts` respondeu "Lockfile is up to date, resolution step is skipped" e criou os links
   `apps/web/node_modules/jsdom` e `apps/web/node_modules/@testing-library/{dom,react}` apontando para pacotes que
   já estavam no store. O diff do lockfile não tem chave nova em `packages:` nem em `snapshots:` (contagem de
   linhas `^+  [a-z'@]` no diff: 0). O `/review` pode rodar `pnpm install --lockfile-only` com rede estável para
   confirmar que o pnpm gera o mesmo arquivo; o CI instala com lockfile congelado, que é a mesma checagem feita
   aqui.
2. **D4 mantida.** Procurei um caminho mais barato para provar o fechamento do menu sem dependência nova e não
   achei: no ambiente `node` o `renderToString` não executa handler de evento, e reproduzir o estado do `useState`
   sem um renderer de DOM exigiria simular o React. As três versões já estavam no lockfile pela `apps/app`.
3. **Mock de `next/link` no T2.** O plano pedia um mock que chamasse `event.preventDefault()` antes do `onClick`.
   Um `<a onClick>` explícito no mock reprova no Biome (`noStaticElementInteractions`, `useValidAnchor`), então o
   mock repassa as props como nos outros testes do header e o `preventDefault` fica num listener de `click` no
   `document`, registrado no `beforeEach` e removido no `afterEach`. O handler do React roda antes do listener do
   `document`, e o jsdom não tenta navegar (nenhum "Not implemented: navigation" na saída).
4. **Caso 5 do T2 dividido em dois testes** (sem o link / com o link). O T2 tem 6 testes no total.
5. `isExternal` ficou no escopo do módulo, fora do componente, porque não depende de props nem de estado.

## Decisões em aberto, pendências e bloqueios

Nenhum bloqueio. D5 (variável sem consumidor em `apps/app/.env.example:74` e `apps/api/.env.example:86`) e D6
(fechar o menu com Escape e clique fora, `aria-controls`) continuam abertas como achados de backlog, conforme o
plano. Não mexi nelas.

## Validação

| Gate | Comando | Resultado |
|------|---------|-----------|
| Typecheck | `pnpm --filter web typecheck` | exit 0 |
| Lint/format | `pnpm check` | exit 0, 887 arquivos, nenhum erro |
| Testes da web | `pnpm --filter web test` | 19 arquivos, 116 testes, todos passando |
| Testes novos | `npx vitest run __tests__/docsUrlEnv.test.tsx __tests__/headerMobileMenu.test.tsx` (em `apps/web`) | 14/14 |
| Testes novos contra o código anterior | `header/index.tsx` e `env.ts` trocados temporariamente por `git show HEAD:<arquivo>`, teste rodado e arquivos restaurados (`cmp` contra a cópia em `/tmp` confirmou) | 10 falham, 4 passam. Falham os 6 casos com a variável preenchida do T1 e os casos 1, 2, 3 e "com o link" do T2. Passam os 2 de modo degradado do T1, o de regressão do botão e o "sem o link" do T2 |
| Modo degradado igual ao de hoje | teste temporário (apagado depois): `renderToString` do `Header` novo e do `Header` de `HEAD`, com `env` sem a variável, nos 3 idiomas | HTML idêntico byte a byte nos 3 (3/3) |
| Paridade de i18n | não rodado | nenhum arquivo de `packages/internationalization` mudou |

Não rodei `pnpm test` da raiz nem `pnpm e2e` (`e2e` precisa de JDK 21 e da stack de pé).

## A verificar no `/test`

- A 1280 e 1440 px, com a variável preenchida no build, a barra cheia aparece com quatro itens à esquerda e a marca
  no centro; entre 1024 e 1279 px aparece o botão do menu. O teste só prova que as classes `xl:*` estão no HTML,
  não que o Tailwind as gerou no CSS nem que cabem. Repro: build com `NEXT_PUBLIC_DOCS_URL=https://docs.example.com`,
  medir `scrollWidth` e `clientWidth` do documento e o centro da marca nas larguras da §9 (F2).
- Sem a variável (ou com `""`), as 36 combinações da PR #45 seguem iguais (F3). O HTML idêntico ao de `HEAD` foi
  medido só para o visitante, com o `env` mocado; o build real com `NEXT_PUBLIC_DOCS_URL=""` falta medir.
- Navegação real do Next: abrir o menu a 390 px, seguir "Contato" e conferir na página nova `aria-expanded="false"`
  e o painel fora do DOM. O jsdom prova o `onClick`; a navegação client-side com o `Header` persistindo no layout
  falta medir (F4), inclusive "Início" estando na home e Enter num link focado pelo teclado.
- "Documentação" abre em aba nova na barra, no painel e no footer, e o painel fecha na aba original (F1, F4).
- axe-core no header com o link ligado (F6).

## Lacunas de teste conhecidas

- Nenhum teste automatizado mede largura ou layout. Isso fica com o `agent-browser`, como diz o `apps/web/CLAUDE.md`.
- O T2 roda só em pt-br. O texto nos três idiomas está coberto pelo T1, em `node`.
- O estado logado não está no T2. O fechamento do menu não depende dele, e o `headerInteractiveNesting.test.tsx` já
  cobre o header logado com a variável no mock.
