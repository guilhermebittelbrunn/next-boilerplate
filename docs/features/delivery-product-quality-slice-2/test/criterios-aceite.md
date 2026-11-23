# Critérios de Aceite (Checklist)

Fatia 2 da spec `delivery-product-quality`. Marcado `[x]` o que o `/test` mediu e passou; `[ ]` o que falhou ou
ficou sem medição. O status por item, com o meio e o número medido, está em `test/report.md`.

- [x] **Os fluxos críticos rodam a 390 px no Playwright**
  O `playwright.config.ts` tem um projeto `mobile` com `devices["Pixel 7"]` e viewport de 390 × 844, em Chromium,
  dependente do `setup`. Ele roda só `landing.spec.ts`, `signIn.spec.ts`, `signUp.spec.ts` e `entityCrud.spec.ts`:
  nenhum outro arquivo de `tests/` entra no projeto. `pnpm --filter e2e e2e --project=mobile` roda o `setup` mais os
  nove testes desses quatro arquivos e termina verde. `pnpm e2e` roda os dois projetos.

- [x] **No celular, o teste abre a barra lateral antes de procurar um link dela**
  Abaixo de 768 px a navegação do painel fica num `Sheet` fechado. No projeto `mobile`, os testes de login e cadastro
  tocam em "Alternar barra lateral", esperam o diálogo "Barra lateral" e só então afirmam o link de entidades. Se o
  toque chega antes da hidratação e o `Sheet` não abre em 2 s, o helper toca de novo; um menu que nunca abre reprova
  em 30 s. No desktop o helper não clica em nada e faz a mesma asserção de antes.

- [x] **O axe roda a 390 px nas telas dos fluxos críticos**
  Toda chamada a `expectAccessible` nos quatro fluxos roda o axe com as mesmas tags WCAG do desktop e reprova violação
  `critical` ou `serious`. A allowlist continua vazia. Violação que só aparece no celular se corrige no componente,
  nunca na allowlist.

- [x] **Rolagem horizontal reprova no celular**
  No projeto `mobile`, `expectAccessible` também confere que o `scrollWidth` do documento não passa do `clientWidth`.
  A falha é `expect.soft` com a rota no texto (`<rota> scrolls horizontally`), então o teste segue e lista todas as
  rotas que vazam. No desktop a checagem não roda. Um elemento de 600 px injetado numa rota faz a checagem reprovar;
  sem a injeção, a mesma rota passa.

- [x] **`pnpm lighthouse` mede o build de produção da landing**
  Sem argumentos, o comando confere que `apps/web/.next/BUILD_ID` existe, sobe `next start` na porta 3001, espera a
  home responder, mede home, preços e contato em `pt-br` com Lighthouse 12.8.2 em perfil mobile e derruba o servidor
  no fim. Sem build, sai com código 1 e manda rodar `pnpm --filter web build`. Com a porta ocupada, sai com código 1
  antes de subir qualquer coisa, nomeia a porta e sugere `--port`.

- [x] **Ctrl+C no `pnpm lighthouse` derruba o `next start` que o comando subiu**
  Interromper o comando com Ctrl+C, seja enquanto o servidor sobe, seja durante "Measuring", encerra o `next start` e
  deixa a porta 3001 livre. Como o servidor roda num grupo de processos próprio, o terminal não o alcança; quem o
  derruba é o tratamento de sinal do runner, que precisa sobreviver ao mesmo sinal chegando várias vezes (do terminal
  e de cada `pnpm` da cadeia). Depois de cada interrupção, o comando sai com código 1, `lsof -ti tcp:3001` sai vazio,
  nenhum processo `next start -p 3001`, `npx lighthouse` ou Chromium continua vivo, e a medição da página seguinte
  não começa.

- [x] **`--url` mede um servidor que já está de pé**
  `pnpm lighthouse --url <base>`, chamado da raiz, repassa o argumento ao script, mede `<base>/pt-br`,
  `<base>/pt-br/pricing` e `<base>/pt-br/contact` sem subir nem derrubar servidor, e o cabeçalho da tabela diz
  `server already running`. `--locale en` (ou `es`) troca o idioma das três páginas. Idioma fora da lista sai com
  código 1 e a mensagem `--locale must be one of pt-br, en, es; got "<valor>".`

- [x] **A saída é uma tabela que o relatório de entrega cita**
  O comando imprime e grava em `apps/e2e/lighthouse-results/summary.md` uma tabela com uma linha por página e as
  colunas Performance, Accessibility, Best practices, SEO, LCP, CLS e TBT, cada valor com o veredito da parte 3: ✅
  quando cumpre a meta, e 🔴, 🟡 ou 🟢 quando não cumpre. O cabeçalho traz versão do Lighthouse, data, commit curto,
  URL base e quem subiu o servidor. Os JSON brutos ficam na mesma pasta, que o `git status` não mostra.

- [x] **Medição incompleta não aparece como aprovada**
  Se o Lighthouse devolve `runtimeError` ou uma categoria com `score: null`, a célula mostra "not measured", nunca ✅.
  Se o processo do Lighthouse falha numa página, a linha daquela página vira "not measured", a seção "Not measured"
  traz o motivo, as outras páginas são medidas e o comando termina com código 1. Pontuação abaixo da meta, sozinha,
  termina com código 0.

- [x] **O Chromium do Playwright serve de navegador**
  Sem `CHROME_PATH`, o comando usa o executável de `chromium.executablePath()` do `@playwright/test`. Se o arquivo não
  existe, sai com código 1 e manda rodar `pnpm --filter e2e exec playwright install chromium`. Com `CHROME_PATH`
  definido, o valor é respeitado.

- [x] **O sitemap lista exatamente as páginas públicas indexáveis**
  Um teste descobre as páginas em `apps/web/app/[locale]/**/page.tsx`, ignora grupos de rota e segmentos dinâmicos e
  tira login e cadastro. O conjunto tem de ser igual ao do sitemap em cada idioma. Página pública nova fora do sitemap
  quebra o teste, e rota no sitemap sem página também.

- [x] **As páginas excluídas são de fato não indexáveis**
  O mesmo teste chama `generateMetadata` das páginas de login e cadastro e confirma `robots.index === false`. Se uma
  delas perder o `indexable: false`, o teste quebra e obriga a decidir se ela entra no sitemap.

- [x] **`lastModified` deixa de ser a hora da geração**
  O sitemap não emite `lastModified`. Duas chamadas com o relógio em datas diferentes devolvem o mesmo resultado. No
  build de produção, `/sitemap.xml` tem 15 `<loc>` (5 rotas × 3 idiomas), nenhum `<lastmod>`, nenhuma URL de
  `sign-in`/`sign-up`, e `hreflang` dos três idiomas em cada URL. `changeFrequency` e `priority` continuam como antes.

- [x] **Documentação aponta para os comandos novos**
  `docs/delivery/03-product-quality.md`, `.claude/commands/deliver.md`, `docs/SETUP.md` e a lista de comandos do
  `CLAUDE.md` citam `pnpm lighthouse` e o projeto `mobile`. Nenhum documento fora do histórico de features manda rodar
  `npx lighthouse` sem versão.

- [ ] **`pnpm lighthouse --url` contra uma preview pública da Vercel**
  O mesmo caminho de código da medição contra um `next start` local, apontado para a URL de uma preview. Depende de
  deploy na Vercel, que esta máquina não tem.
