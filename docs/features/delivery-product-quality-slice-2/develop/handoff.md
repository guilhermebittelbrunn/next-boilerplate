# Handoff do `/develop`: parte 3 da entrega, fatia 2

Implementação de `analyze/plan.md` (fatia 2 da spec `delivery-product-quality`), sobre `a391d1c`. Sem SDK, API,
`apps/app` nem i18n. Nenhuma dependência nova no `package.json` ou no lockfile; o Lighthouse roda via
`npx -y lighthouse@12.8.2`, como o plano decidiu em Q11.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| 10.1 projeto `mobile` | `apps/e2e/playwright.config.ts` (`CRITICAL_FLOWS`, `PHONE_VIEWPORT`, projeto `mobile` com `devices["Pixel 7"]` e viewport 390 × 844) |
| 10.2 barra lateral no celular | `apps/e2e/support/panelNavigation.ts` (novo, `expectPanelNavLink`), `apps/e2e/tests/signIn.spec.ts`, `apps/e2e/tests/signUp.spec.ts` |
| 10.3 reflow | `apps/e2e/support/a11y.ts` (`expectNoHorizontalScroll`, só quando `testInfo.project.use.isMobile`) |
| 10.4 Lighthouse | `apps/e2e/lighthouse/summary.mjs` e `apps/e2e/lighthouse/run.mjs` (novos), `apps/e2e/__tests__/lighthouseSummary.test.ts` (novo) |
| 10.5 sitemap | `apps/web/app/sitemap.ts` (sem `lastModified`) |
| 10.6 teste do sitemap | `apps/web/__tests__/sitemap.test.ts` (novo) |
| 10.7 scripts e ignore | `package.json` (`lighthouse`), `apps/e2e/package.json` (`lighthouse`, `clean`), `.gitignore` (`apps/e2e/lighthouse-results/`) |
| 10.8 documentação | `docs/delivery/03-product-quality.md` ("Onde medir", 3.1, 3.4, 3.7), `docs/SETUP.md` (dois projetos, `--project=mobile`, subseção "Lighthouse da landing"), `CLAUDE.md` (linha do `pnpm lighthouse`), `.claude/commands/deliver.md` (passo 3) |

## Contrato

Nenhum DTO ou action mexido. A única mudança de runtime é o `sitemap.xml` da `web`, que deixa de emitir
`<lastmod>`. Quem consome: buscadores e o item 3.7 do `/deliver`.

## Códigos de erro novos

Nenhum. Nenhuma chave de i18n nova; o helper do E2E lê `components.sidebar.toggle` e `components.sidebar.mobileTitle`,
que já existem nos três idiomas.

## Desvios do plano

1. **A abertura da barra lateral tenta de novo enquanto o `Sheet` está fechado.** O plano previa um clique só. Na
   primeira execução do projeto `mobile`, `signIn.spec.ts:26` falhou: o snapshot do `error-context.md` mostrou o
   painel carregado e nenhum diálogo aberto, ou seja, o toque chegou antes da hidratação (ou antes do
   `useIsMobile` assumir o valor de celular) e se perdeu. O helper agora usa `expect(...).toPass({ timeout: 30_000 })`:
   só toca no botão se o diálogo "Barra lateral" não estiver visível e espera até 2 s por ele. Um menu que nunca
   abre continua reprovando em 30 s, e o helper não procura o link fora do `Sheet`. Depois disso os quatro testes de
   `signIn` e o de `signUp` passaram no `mobile` e no `chromium` (ver Validação).
2. **Nome e retorno do helper.** `panelNavLink` virou `expectPanelNavLink` e não devolve o locator, porque nenhum
   chamador usa o retorno e o nome passa a dizer que a função afirma.
3. **`screen` fica o do Pixel 7 (412 × 915).** Tentei trocar `screen` junto do viewport, mas o `tsc` recusa: `screen`
   não existe em `UseOptions` do `@playwright/test` 1.63. Só o viewport muda, como no plano.
4. **Porta ocupada é detectada por conexão, não por `listen`.** O runner tenta conectar em `127.0.0.1` e `::1`; se um
   dos dois aceita, recusa. A conexão pega o servidor em qualquer um dos dois endereços sem depender de como o
   sistema trata um `listen` em `::` com a porta ocupada só em IPv4, caso que não testei. O caso IPv4 foi medido
   com `python3 -m http.server 3001 --bind 127.0.0.1` (ver Validação).
5. **Extras do runner:** com `--url`, a base precisa responder 2xx em `/<locale>` antes de medir; a saída do
   `next start` vai para `lighthouse-results/next-start.log`; o JSON anterior de cada página é apagado antes da
   medição, para uma falha não ler número velho; `--out` relativo resolve a partir de `INIT_CWD` (de onde o
   `pnpm` foi chamado). Uma categoria com `score: null` sem `runtimeError` também termina com código 1, porque a
   página não foi medida por inteiro (`isComplete`).
6. **Comentário dos limiares** diz "Delivery part 3 thresholds" em vez de citar o caminho do documento, a alternativa
   que o próprio plano ofereceu.
7. **Teste do sitemap tem um caso a mais:** "excludes only pages that exist" quebra se a lista de exclusão citar uma
   página que sumiu.
8. **Documentação além da tabela 10.8:** a 3.7 de `03-product-quality.md` ganhou um parágrafo sobre o teste do
   sitemap e a ausência de `<lastmod>`, e o bullet "Onde medir" passou a apontar para `pnpm lighthouse`.
9. **Supressão de lint** em `lighthouseSummary.test.ts`: `biome-ignore-all lint/style/noMagicNumbers`, com motivo. Os
   números são as fronteiras dos limiares; nomear cada um esconderia o valor afirmado. Mesmo caminho de
   `themeContrast.test.ts`.
10. **Limpeza:** o `next dev` da suíte E2E criou `apps/api/AGENTS.md`, `apps/app/AGENTS.md` e `apps/web/AGENTS.md`
    (bloco `nextjs-agent-rules`); apaguei os três, não fazem parte do repo.

O projeto `mobile` não revelou violação do axe nem rolagem horizontal nas telas percorridas, então nenhum
componente compartilhado foi alterado.

## Decisões em aberto

Nenhuma nova. As perguntas Q1, Q5 e Q9 do plano continuam como estavam (Node 22.19 para o Lighthouse 13, data
declarada por rota no sitemap, mediana de execuções).

## Validação

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint | `pnpm check` | `Checked 1098 files`, sem erro |
| Typecheck | `pnpm --filter e2e typecheck`, `pnpm --filter web typecheck` | exit 0 nos dois |
| Testes `web` | `pnpm --filter web test` | 33 arquivos, 296 testes, todos verdes |
| Testes `e2e` (Vitest) | `pnpm --filter e2e test` | 3 arquivos, 38 testes (21 novos em `lighthouseSummary.test.ts`) |
| Teste do sitemap pega regressão | página temporária `app/[locale]/zz-probe/page.tsx` | 3 falhas ("lists exactly the indexable pages…" em cada idioma); removida depois |
| Teste do sitemap pega o relógio | `lastModified: new Date()` reposto em `sitemap.ts` | 1 falha ("does not depend on the time it is generated"); arquivo restaurado, `git diff` mostra só as 2 linhas removidas |
| Lista do Playwright | `pnpm exec playwright test --list` (em `apps/e2e`) | 40 testes; 9 no `[mobile]`: `entityCrud` (1), `landing` (3), `signIn` (4), `signUp` (1) |
| Projeto `mobile`, 1ª execução | `pnpm exec playwright test --project=mobile` (JDK 21 no `PATH`) | 12 passaram, 1 falhou (`signIn.spec.ts:26`, desvio 1), 2,8 min |
| `signIn` e `signUp` depois do desvio 1 | `pnpm exec playwright test --project=mobile --project=chromium tests/signIn.spec.ts tests/signUp.spec.ts` | 14 passaram (setup + 5 desktop + 5 mobile), 1,2 min |
| Lighthouse no build | `pnpm --filter web build` e `pnpm lighthouse` | exit 0 em 1 min 21 s; tabela abaixo; porta 3001 livre depois (`lsof -ti tcp:3001` vazio) |
| Porta ocupada | `python3 -m http.server 3001 --bind 127.0.0.1`, depois `node apps/e2e/lighthouse/run.mjs` | `Port 3001 is already in use. Stop that server or pass --port <free port>.`, exit 1 |
| Argumentos inválidos | `run.mjs --locale xx`, `--port 0`, `--bogus`; `CHROME_PATH=/nope`; sem `apps/web/.next/BUILD_ID` | exit 1 em todos, com a mensagem de cada caso |
| `--url` sem servidor | `run.mjs --url http://localhost:3999/` | `http://localhost:3999/pt-br did not answer with a 2xx status.`, exit 1 (a barra final foi removida) |
| Pasta ignorada | `git status --short` com `apps/e2e/lighthouse-results/` presente | a pasta não aparece |

Saída do `pnpm lighthouse` nesta máquina (uma execução, número de máquina local, varia entre execuções):

```markdown
Lighthouse 12.8.2 · 2026-11-23T18:15:40.696Z · commit a391d1c · http://localhost:3001 (next start started by the command)

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
|------|---|---|---|---|---|---|---|
| /pt-br | 57 🟡 | 100 ✅ | 96 ✅ | 100 ✅ | 7.6 s 🟡 | 0.000 ✅ | 0 ms ✅ |
| /pt-br/pricing | 85 🟡 | 100 ✅ | 96 ✅ | 100 ✅ | 4.2 s 🟡 | 0.000 ✅ | 104 ms ✅ |
| /pt-br/contact | 95 ✅ | 100 ✅ | 93 🟡 | 100 ✅ | 2.9 s 🟡 | 0.000 ✅ | 26 ms ✅ |
```

O Lighthouse 12.8.2 rodou com o Chromium 1243 do Playwright sem `CHROME_PATH`, o que fecha o risco que o plano
listava. A pasta `lighthouse-results/`, o `test-results/` e o `playwright-report/` foram apagados no fim; o
`apps/web/.next` do build ficou (ignorado pelo Git, e o `/test` precisa dele para a V4).

## A verificar no `/test`

- **V3, a checagem de reflow pega vazamento.** Nenhuma rota vazou, então ainda não vi a asserção falhar. Repro: spec
  temporária no projeto `mobile` que injeta `<div style="width:600px">` e chama `expectAccessible`. Na mesma
  passada, confirmar a segunda frase do comentário de `a11y.ts` (que o `innerWidth` cresce com a emulação mobile);
  se não crescer, cortar a frase.
- **Estabilidade do helper da barra lateral.** Uma execução verde depois do desvio 1 não prova que a falha de
  hidratação sumiu. Repro: `pnpm --filter e2e e2e --project=mobile tests/signIn.spec.ts tests/signUp.spec.ts --repeat-each=5`.
- **V1 completa.** `entityCrud` e `landing` passaram no `mobile` só na primeira execução, antes do desvio 1, que não
  toca neles. Rodar o projeto `mobile` inteiro de novo.
- **V2 de `landing` e `entityCrud` no desktop.** Rodei no `chromium` só `signIn` e `signUp`.
- **V5** (`pnpm lighthouse --url` contra um `next start` iniciado à mão) e **V7** (`curl -s localhost:3001/sitemap.xml`:
  15 `<loc>`, nenhum `<lastmod>`). Não medi nenhuma das duas.
- **Interrupção com Ctrl+C** durante a medição: o runner trata `SIGINT` e derruba o grupo do `next start`. Não
  medi. Repro: `pnpm lighthouse`, Ctrl+C durante "Measuring", depois `lsof -ti tcp:3001` vazio.
- **Logs `[app] [request] failed … digest=414930086`** apareceram nas duas execuções, no desktop e no celular, em
  `/pt-br`, `/pt-br/admin`, `/pt-br/entities` e `/pt-br/onboarding`, com os testes verdes. Não investiguei a
  origem nem comparei com `main`.

## Lacunas de teste conhecidas

- `run.mjs` não tem teste unitário: argumentos, porta, ciclo do servidor e chamada ao `npx` foram exercitados só
  pelo smoke acima. A lógica de veredito e da tabela está em `summary.mjs`, coberta.
- O ramo de `run.mjs` em que o Lighthouse sai com código diferente de zero numa página (linha marcada como
  "not measured" e código 1) não foi exercitado de ponta a ponta; a renderização dessa linha está no teste
  "keeps a failed page in the table without a single ✅".
