# Plano: core aprovado na parte 3 da entrega, fatia 2 (medição no repositório)

- **Spec**: [`specs/delivery-product-quality.md`](../../../../specs/delivery-product-quality.md) (`status: approved`).
  Problema, evidência e corte são decisão de produto já tomada. Este plano responde ao *como*.
- **Escopo**: só a **fatia 2** da spec (linhas 139-145): projeto `mobile` no Playwright, Lighthouse por comando
  e teste do sitemap. A fatia 1 foi entregue pela PR #71 e tem o histórico em
  [`../delivery-product-quality/`](../../delivery-product-quality/STATE.md). A fatia 3 e o "Fora do corte"
  (Lighthouse como gate de CI, dieta do bundle, copy de SEO, `error.tsx` de segmento) ficam fora.
- **Por que uma pasta nova**: `docs/features/delivery-product-quality/` guarda o pipeline completo da fatia 1, com
  `STATE.md` em `done`. Reabrir aquele `STATE.md` misturaria duas entregas no mesmo gate. A fatia 2 ganha
  `docs/features/delivery-product-quality-slice-2/`, com `spec: delivery-product-quality` no frontmatter.
- **Modo**: rodada autônoma do `/cycle`. Nenhuma pergunta foi feita; as decisões estão em
  [Perguntas em aberto](#perguntas-em-aberto-decididas-por-padrão), cada uma com a alternativa descartada.
- **Medido em**: 2026-11-23, sobre `a391d1c`, só leitura. Playwright `1.63.0` (`apps/e2e/package.json`), Next
  `16.4.6` (`apps/web/package.json`), Node local `v22.13.0` e `.nvmrc` `22.12.0`.

---

## Etapa 1: análise

### 1. Contexto

A parte 3 da etapa de entrega ([`docs/delivery/03-product-quality.md`](../../../delivery/03-product-quality.md))
pede três medições que hoje dependem de alguém lembrar de fazê-las à mão:

1. **Celular (3.1).** `apps/e2e/playwright.config.ts:49-56` tem só o projeto `chromium` com
   `devices["Desktop Chrome"]`. O axe (`apps/e2e/support/a11y.ts:59-103`) roda só em desktop e pt-br, e o
   `docs/SETUP.md:266-267` diz isso por escrito ("roda só em `pt-br` e desktop"). Ninguém confere no CI se o
   cadastro, o login ou o CRUD completam a 390 px.
2. **Desempenho (3.4).** Não existe Lighthouse no repo. A spec de entrega manda rodar
   `npx -y lighthouse` sem versão (`03-product-quality.md:109-111`), e o `/deliver` repete isso
   (`.claude/commands/deliver.md:74-75`). O número sai num JSON solto, sem os limiares aplicados, e cada pessoa
   monta a tabela do relatório de um jeito.
3. **Sitemap (3.7).** `apps/web/app/sitemap.ts:10-16` lista cinco rotas à mão, e nenhum teste compara essa
   lista com as páginas que existem em `apps/web/app/[locale]/`. `lastModified = new Date()` (`:20`) declara
   todas as páginas alteradas no momento em que o sitemap é gerado.

**Objetivo.** Ao fim da fatia, o relatório de entrega cita a pontuação do Lighthouse produzida por
`pnpm lighthouse` (sinal de pronto da spec, linha 193), os fluxos críticos rodam a 390 px no `pnpm e2e` e no CI,
e um teste quebra quando alguém cria uma página pública sem colocá-la no sitemap.

**Fora de escopo** (além do "Fora do corte" da spec):

- Viewport de 360 × 800, tema escuro e os outros idiomas no projeto `mobile`. A spec pede 390 px; o resto
  continua com o `agent-browser` no `/test` e no `/deliver`.
- `panelSwitch`, `accountSettings`, `a11yDark` e `organizationOwnership` no projeto `mobile`. Ver Q2.
- Lighthouse no CI, mediana de várias execuções e varredura do site inteiro (`unlighthouse`).
- Corrigir pontuação baixa que o Lighthouse revelar. A spec manda medir primeiro; a dieta do bundle é spec
  própria ("Fora do corte", linhas 155-157).

**Corte de MVP desta fatia** (adotado da spec):

- [ ] Projeto `mobile` no Playwright, 390 × 844, rodando os fluxos críticos com o axe.
- [ ] `pnpm lighthouse` contra o build de produção da landing, com os limiares da parte 3 aplicados e uma tabela
      markdown que o relatório copia.
- [ ] Teste do sitemap: a lista bate com as páginas públicas indexáveis e a saída não depende do relógio.

**Apps impactados**: `apps/e2e` (projeto, helper, runner do Lighthouse, teste unitário), `apps/web` (sitemap e
teste), raiz (`package.json`, `.gitignore`), docs (`SETUP.md`, `03-product-quality.md`, `CLAUDE.md`) e
`.claude/commands/deliver.md`. Nenhuma mudança em `packages/*`, `apps/api` ou `apps/app`.

**Modo de produto**: indiferente. Nenhuma dependência de assinatura ou plano.

### 1.1 Fontes

| Fonte | Lida | O que tirou |
|-------|------|-------------|
| `specs/delivery-product-quality.md` | sim | corte da fatia 2 (139-145), "Fora do corte" (153-163), pergunta sobre `npx` sem versão (204-206) |
| `docs/delivery/03-product-quality.md` | sim | limiares de 3.4 (116-124), critério de 3.1 (41-44), comando de 3.7 (179-183) |
| `docs/delivery/report-template.md` | sim | linha 3.4 pede "Perf/A11y/BP/SEO mobile, LCP, CLS, por URL" |
| `npm view lighthouse` | sim | `latest` 13.6.0 exige Node `>=22.19`; 12.8.2 (2025-08-28) é a última com `>=18.16` |
| `gh run view 45230519218` | sim | job `e2e` levou 4 min 30 s no merge da PR #71; `timeout-minutes: 25` (`ci.yml:147`) |
| Auditoria desta rodada (orquestrador) | sim | `pnpm e2e` local ~18 min; `organizationOwnership.spec.ts` instável sob `next dev` |

### 2. Dados (Firestore)

N/A. Nenhuma coleção, campo ou consulta.

### 3. Contrato `@repo/sdk`

N/A.

### 4. API (`apps/api`)

N/A. O projeto `mobile` usa a API do jeito que a suíte desktop já usa.

### 5. Front-end

Nenhuma tela nova. A única mudança de runtime é em `apps/web/app/sitemap.ts`, que deixa de emitir
`lastModified` (Q5). O resto é ferramenta de medição.

#### 5.1 O que quebra a 390 px nos fluxos críticos (lido no código)

| Fluxo | Arquivo | Comportamento a 390 px | Ajuste |
|-------|---------|------------------------|--------|
| Landing: home, CTA, 404 | `tests/landing.spec.ts` | o CTA é procurado dentro da `div` do hero (`:25-33`), não no header que colapsa em `lg:hidden` (`components/header/index.tsx:42`) | nenhum |
| Login | `tests/signIn.spec.ts:34-38` | afirma o link `entities.list` visível. Abaixo de 768 px a barra lateral vira `Sheet` fechado (`packages/design-system/hooks/useMobile.ts:3`, `components/ui/sidebar.tsx:218-238`) e o link não existe no DOM até o botão `components.sidebar.toggle` abrir | abrir a navegação antes de afirmar |
| Cadastro + onboarding | `tests/signUp.spec.ts:58-64` | mesma afirmação do link da barra lateral | idem |
| CRUD de `entity` | `tests/entityCrud.spec.ts` | não usa a barra lateral; tabela, menu da linha e `Select` não têm ramo mobile no código (`grep` por `useIsMobile`/`hidden md:` não acha nada em `Table` nem na página) | nenhum previsto; o `/test` mede |
| Troca de painel | `tests/panelSwitch.spec.ts:27-33` | no celular o seletor vira `DropdownMenu` com outro `Select` dentro (`apps/app/shared/components/ui/PanelNavbarControls.tsx:190-230`) | fora do projeto `mobile` (Q2) |

#### 5.2 Reflow a 390 px

O critério de 3.1 é "nenhuma rota tem rolagem horizontal". Isso é o critério 1.4.10 (Reflow) da WCAG 2.1 AA,
então a checagem entra em `expectAccessible`, que todo teste dos fluxos críticos já chama, e só roda quando o
projeto é mobile (`testInfo.project.use.isMobile`). A comparação usa
`document.documentElement.scrollWidth <= document.documentElement.clientWidth`. O `window.innerWidth` do comando
da parte 3 não serve aqui: com `isMobile`, o Chromium afasta o zoom quando o conteúdo vaza, e o `innerWidth`
cresce junto com a página, o que faria a checagem passar justamente no caso que ela deve pegar. O `/test`
confirma isso injetando um elemento largo (§8, V3).

### 5.4 i18n e a11y

- Nenhuma chave nova. O helper do E2E lê `ptBr.components.sidebar.toggle`, que já existe
  (`packages/internationalization/translations/components/ui/sidebar.ts:3`, montado em
  `components/index.ts:32`).
- A saída do `pnpm lighthouse` é texto de ferramenta, não UI do produto, e fica em inglês como a do
  `scripts/coverage-summary.mjs:51-54`. Quem escreve o relatório traduz os cabeçalhos.
- O axe passa a rodar a 390 px nas rotas dos quatro fluxos críticos. A allowlist continua vazia
  (`apps/e2e/a11y/allowlist.ts:20`); violação nova no celular é defeito a corrigir no componente.

### 6. Autorização e segurança

- Nada muda em guard, ownership ou impersonação.
- **Cadeia de suprimento do Lighthouse.** `npx -y lighthouse@12.8.2` baixa um pacote do npm na primeira execução.
  Fixar a versão impede que uma publicação nova (ou maliciosa) rode sem ninguém ver, na mesma linha em que a PR #65
  fixou as Actions por SHA. O pacote não entra no `package.json`, no lockfile nem no bundle de nenhum app; roda só
  na máquina de quem mede. O processo filho é criado com `spawn` e argumentos em array, sem shell, então a URL
  passada em `--url` não vira comando.
- **O runner sobe a landing com o `.env` local** (`next start` lê `apps/web/.env`). É o mesmo que
  `pnpm --filter web start` faz; nenhuma credencial vai para a saída, que guarda só pontuações, métricas e a URL
  medida.
- **Porta ocupada.** Se a porta escolhida já tiver um `next dev` ouvindo, o `next start` falha e o runner mediria o
  servidor de desenvolvimento sem perceber. O runner testa a porta antes de subir e recusa com mensagem.

### 7. Testes (Vitest)

| Teste | Nível | Prova |
|-------|-------|-------|
| `apps/web/__tests__/sitemap.test.ts` (novo) | unitário, lê o sistema de arquivos | (a) os caminhos do sitemap, em cada idioma, são exatamente as páginas de `app/[locale]/**/page.tsx` sem grupo de rota, sem segmento dinâmico e sem as não indexáveis; (b) cada entrada tem URL absoluta com a base de `NEXT_PUBLIC_WEB_URL` e `alternates.languages` com os três idiomas; (c) nenhuma URL é de `/sign-in` ou `/sign-up`; (d) duas chamadas com `vi.setSystemTime` em datas diferentes devolvem o mesmo resultado, e nenhuma entrada tem `lastModified` |
| mesmo arquivo | unitário com `vi.mock` | as páginas que o teste exclui como não indexáveis (`sign-in`, `sign-up`) de fato devolvem `robots.index === false` em `generateMetadata`. Segue o padrão de `contactPageAvailability.test.tsx:3-11`: `getDictionary` e o formulário mockados, `await import` da página. Sem isso, a lista de exclusão do teste poderia esconder uma página indexável |
| `apps/e2e/__tests__/lighthouseSummary.test.ts` (novo) | unitário puro | limiares da parte 3 nas fronteiras: Performance 90 ✅, 89 e 50 🟡, 49 🔴; Acessibilidade, Boas práticas e SEO 95 ✅, 94 🟡; LCP 2 499 ms ✅ e 2 500 ms 🟡; CLS 0,099 ✅ e 0,1 🟡; TBT 199 ms ✅ e 200 ms 🟢; categoria com `score: null` ou `runtimeError` no relatório vira "not measured", nunca ✅; a tabela markdown traz versão do Lighthouse, data, commit e URL. Segue o par `support/a11yFilter.ts` + `__tests__/a11yFilter.test.ts` |

Nenhum teste novo exige emulador. O projeto `mobile` é E2E, mas reaproveita specs existentes: o que ele prova
(layout e fluxo a 390 px no Chromium de verdade) não tem versão unitária.

### 8. O que o `/test` vai percorrer

Não há tela nova para o `agent-browser` percorrer em três idiomas e dois temas: o diff não muda UI. A passada é
de **execução das ferramentas**, em build de produção quando o assunto é desempenho.

| # | Verificação | Como | Esperado |
|---|-------------|------|----------|
| V1 | Projeto `mobile` verde | `pnpm --filter e2e e2e --project=mobile` (JDK 21 no `PATH`) | `setup` + os testes de `landing`, `signIn`, `signUp` e `entityCrud` passam a 390 × 844; o relatório lista o projeto `mobile` |
| V2 | Desktop sem regressão nas specs tocadas | `pnpm --filter e2e e2e --project=chromium tests/landing.spec.ts tests/signIn.spec.ts tests/signUp.spec.ts tests/entityCrud.spec.ts` | verde; o helper não abre a barra lateral no desktop |
| V3 | A checagem de reflow pega vazamento | spec temporária (apagada no fim) no projeto `mobile` que injeta `<div style="width:600px">` numa rota e chama `expectAccessible` | a asserção falha nomeando a rota; sem a injeção, passa |
| V4 | `pnpm lighthouse` em build de produção | `pnpm --filter web build`, depois `pnpm lighthouse` | três linhas (home, preços, contato em `pt-br`), cada métrica com o veredito da parte 3; `apps/e2e/lighthouse-results/summary.md` e três JSON gravados; `git status` não mostra a pasta |
| V5 | `--url` aponta para servidor já de pé | `pnpm --filter web start -p 3001` à mão, `pnpm lighthouse --url http://localhost:3001` | mesma tabela, sem o runner subir outro servidor |
| V6 | Porta ocupada | com `pnpm --filter web dev` na 3001, `pnpm lighthouse` | sai com código 1 e mensagem nomeando a porta e o `--port`; não mede nada |
| V7 | Sitemap em produção | `curl -s localhost:3001/sitemap.xml` no `next start` da V4 | 15 `<loc>` (5 rotas × 3 idiomas), nenhum `<lastmod>`, nenhum `sign-in`/`sign-up`; `hreflang` dos três idiomas em cada URL |
| V8 | Suítes unitárias | `pnpm --filter web test`, `pnpm --filter e2e test`, depois `pnpm test` da raiz | verdes |

O relatório da V4 entra no `test/report.md` como evidência (a tabela copiada), com a ressalva de que é medição de
máquina local e varia entre execuções. Pontuação abaixo da meta **não reprova** esta fatia: a fatia entrega o
instrumento. O número alimenta a spec da dieta do bundle.

**Não verificável sem infra externa (🔒):** `pnpm lighthouse --url` contra uma preview pública da Vercel. O
caminho de código é o mesmo da V5.

### 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Os fluxos críticos rodam a 390 px no Playwright**
  O `playwright.config.ts` ganha um projeto `mobile` com viewport de 390 × 844, `isMobile` e `hasTouch`, em
  Chromium, dependente do `setup`. Ele roda `landing.spec.ts`, `signIn.spec.ts`, `signUp.spec.ts` e
  `entityCrud.spec.ts`, os mesmos arquivos do projeto desktop, e nenhum outro. `pnpm e2e` roda os dois projetos;
  `pnpm --filter e2e e2e --project=mobile` roda só o celular mais o `setup`.

- [ ] **No celular, o teste abre a barra lateral antes de procurar um link dela**
  Abaixo de 768 px a navegação do painel fica num `Sheet` fechado. Quando o projeto é mobile, os testes de login e
  cadastro tocam no botão "Alternar barra lateral" e só então afirmam o link de entidades. No desktop o helper não
  clica em nada, e o comportamento atual dos testes não muda. O helper nunca procura o link fora do `Sheet` no
  celular, então um menu que não abre reprova o teste.

- [ ] **O axe roda a 390 px nas telas dos fluxos críticos**
  Toda chamada a `expectAccessible` dentro dos quatro fluxos roda o axe com as mesmas tags WCAG do desktop e falha
  em violação `critical` ou `serious`. A allowlist continua vazia. Uma violação que só aparece no celular reprova o
  teste e é corrigida no componente, não na allowlist.

- [ ] **Rolagem horizontal reprova no celular**
  No projeto mobile, `expectAccessible` também confere que `scrollWidth` do documento não passa do `clientWidth`. A
  falha é `expect.soft` com a rota no texto, como as do axe, então o teste segue e lista todas as rotas que vazam. No
  desktop a checagem não roda. Um elemento de 600 px injetado de propósito numa rota faz a checagem falhar.

- [ ] **`pnpm lighthouse` mede o build de produção da landing**
  Sem argumentos, o comando confere que `apps/web/.next/BUILD_ID` existe, sobe `next start` na porta 3001, espera a
  home responder, mede home, preços e contato em `pt-br` com Lighthouse 12.8.2 em perfil mobile e derruba o servidor
  no fim, inclusive quando a medição falha. Sem build, sai com código 1 e manda rodar `pnpm --filter web build`.
  Com a porta ocupada, sai com código 1 antes de subir qualquer coisa e sugere `--port`.

- [ ] **`--url` mede um servidor que já está de pé**
  `pnpm lighthouse --url <base>` mede `<base>/pt-br`, `<base>/pt-br/pricing` e `<base>/pt-br/contact` sem subir nem
  derrubar servidor. Serve para a preview da Vercel e para uma landing iniciada à mão. `--locale en` (ou `es`) troca o
  idioma das três páginas. Idioma fora da lista sai com código 1.

- [ ] **A saída é uma tabela que o relatório de entrega cita**
  O comando imprime e grava em `apps/e2e/lighthouse-results/summary.md` uma tabela com uma linha por página e as
  colunas Performance, Accessibility, Best practices, SEO, LCP, CLS e TBT, cada valor com o veredito da parte 3:
  ✅ quando cumpre a meta, e a gravidade da parte 3 (🔴, 🟡 ou 🟢) quando não cumpre. O cabeçalho traz a versão do
  Lighthouse, a data da medição, o commit curto, a URL base e se o servidor foi iniciado pelo comando. Os JSON brutos
  ficam na mesma pasta, que está no `.gitignore`.

- [ ] **Medição incompleta não aparece como aprovada**
  Se o Lighthouse devolve `runtimeError` ou uma categoria com `score: null`, a célula mostra "not measured" e não
  ✅. Se o processo do Lighthouse falha numa página, o comando registra a falha na linha daquela página, mede as
  outras e termina com código 1. Pontuação abaixo da meta, sozinha, termina com código 0: o comando mede, não bloqueia.

- [ ] **O Chromium do Playwright serve de navegador**
  Sem `CHROME_PATH` no ambiente, o comando usa o executável que `chromium.executablePath()` do `@playwright/test`
  aponta, o mesmo que o `pnpm e2e` usa. Se o arquivo não existe, sai com código 1 e manda rodar
  `pnpm --filter e2e exec playwright install chromium`. Com `CHROME_PATH` definido, respeita o valor.

- [ ] **O sitemap lista exatamente as páginas públicas indexáveis**
  Um teste descobre as páginas em `apps/web/app/[locale]/**/page.tsx`, ignora grupos de rota e segmentos dinâmicos
  e tira as não indexáveis (login e cadastro). O conjunto resultante tem de ser igual ao do sitemap em cada idioma.
  Criar uma página pública nova sem incluí-la no sitemap quebra o teste; incluir no sitemap uma rota que não existe
  também quebra.

- [ ] **As páginas excluídas são de fato não indexáveis**
  O mesmo teste chama `generateMetadata` das páginas de login e cadastro e confirma `robots.index === false`. Se
  alguém tirar o `indexable: false` de uma delas, o teste quebra e obriga a decidir se ela entra no sitemap.

- [ ] **`lastModified` deixa de ser a hora da geração**
  O sitemap não emite `lastModified`. Duas chamadas com o relógio em datas diferentes devolvem o mesmo resultado.
  `curl /sitemap.xml` no build de produção não mostra `<lastmod>`. URL absoluta, `hreflang` dos três idiomas,
  `changeFrequency` e `priority` continuam como hoje.

- [ ] **Documentação aponta para os comandos novos**
  `docs/delivery/03-product-quality.md` (3.1 e 3.4), `.claude/commands/deliver.md` (passo 3), `docs/SETUP.md` (seção
  de E2E, que hoje diz "só desktop") e a lista de comandos do `CLAUDE.md` citam `pnpm lighthouse` e o projeto
  `mobile`. Nenhum documento continua mandando rodar `npx lighthouse` sem versão.

---

## Etapa 2: blueprint técnico

### 10.1 `apps/e2e/playwright.config.ts`

```diff
 const isCi = Boolean(process.env.CI);
 const SERVER_START_TIMEOUT = 300_000;
+
+// The flows a visitor must be able to finish on a phone: landing, sign-in, sign-up
+// with onboarding, and the central CRUD.
+const CRITICAL_FLOWS = /(landing|signIn|signUp|entityCrud)\.spec\.ts$/;
+const PHONE_VIEWPORT = { width: 390, height: 844 };
@@
     projects: [
         { name: "setup", testMatch: /global\.setup\.ts/ },
         {
             name: "chromium",
             use: { ...devices["Desktop Chrome"] },
             dependencies: ["setup"],
         },
+        {
+            name: "mobile",
+            testMatch: CRITICAL_FLOWS,
+            use: { ...devices["Pixel 7"], viewport: PHONE_VIEWPORT },
+            dependencies: ["setup"],
+        },
     ],
```

`devices["Pixel 7"]` (medido em `@playwright/test` 1.63) traz `defaultBrowserType: "chromium"`, `isMobile`,
`hasTouch`, `deviceScaleFactor: 2.625` e user agent Android. Só o viewport é trocado, para os 390 px da spec. O
`locale`, o `timezoneId` e o `colorScheme` de `use` no topo continuam valendo. Comentário: os dois da config são
opcionais; o de `CRITICAL_FLOWS` explica um critério de negócio (por que esses quatro) e pode ficar.

### 10.2 `apps/e2e/support/panelNavigation.ts` (novo)

```ts
import { expect, type Page } from "@playwright/test";
import { ptBr } from "./dictionary";

const sidebarCopy = ptBr.components.sidebar;

/**
 * Below the sidebar breakpoint the panel navigation lives in a closed sheet, so its
 * links only exist after the toggle opens it.
 */
export async function panelNavLink(page: Page, name: string, isMobile: boolean) {
    if (isMobile) {
        await page.getByRole("button", { name: sidebarCopy.toggle }).click();
    }
    const link = page.getByRole("link", { name });
    await expect(link).toBeVisible();
    return link;
}
```

`isMobile` chega pelo fixture nativo do Playwright (`async ({ page, isMobile }, testInfo)`), sem ler o nome do
projeto. Uso:

```diff
// tests/signIn.spec.ts
-test("a common user signs in and lands on the common panel", async ({
-    page,
-}, testInfo) => {
+test("a common user signs in and lands on the common panel", async ({
+    page,
+    isMobile,
+}, testInfo) => {
@@
     await expect(page).toHaveURL(`${APP_URL}/${LOCALE}`);
-    await expect(
-        page.getByRole("link", {
-            name: commonRoutesCopy.platform.entities.list,
-        })
-    ).toBeVisible();
+    await panelNavLink(page, commonRoutesCopy.platform.entities.list, isMobile);
```

`tests/signUp.spec.ts:58-64` recebe a mesma troca. O `expectAccessible` do fim do cadastro roda com o `Sheet`
aberto no celular, o que também mede o diálogo da navegação.

**Ponto de atenção para o `/develop`:** `SidebarRail` também tem `aria-label` "Alternar barra lateral"
(`sidebar.tsx:315`), mas ele mora dentro da `Sidebar`, que no celular só monta quando o `Sheet` abre. Se o
`getByRole` achar dois botões, use o do `data-sidebar="trigger"` em vez de `.first()`.

### 10.3 `apps/e2e/support/a11y.ts`

```diff
 export async function expectAccessible(
     page: Page,
     testInfo: TestInfo,
     { route }: { route: string }
 ) {
@@
     expect.soft(failing, formatViolations(failing)).toEqual([]);
+
+    if (testInfo.project.use.isMobile) {
+        await expectNoHorizontalScroll(page, route);
+    }
 }
+
+// WCAG 1.4.10: content reflows without horizontal scrolling. clientWidth, not
+// innerWidth: with mobile emulation Chromium zooms out to fit overflowing content,
+// and innerWidth grows with it.
+async function expectNoHorizontalScroll(page: Page, route: string) {
+    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
+        scrollWidth: document.documentElement.scrollWidth,
+        clientWidth: document.documentElement.clientWidth,
+    }));
+    expect
+        .soft(scrollWidth, `${route} scrolls horizontally`)
+        .toBeLessThanOrEqual(clientWidth);
+}
```

O comentário fica: a escolha entre `clientWidth` e `innerWidth` é exatamente o tipo de armadilha que a regra de
comentários aceita. Se a V3 mostrar que o `innerWidth` não cresce no Chromium 1243, o `/develop` (ou o `/review`)
corta a segunda frase.

### 10.4 Lighthouse: `apps/e2e/lighthouse/`

Arquivos novos:

```
apps/e2e/lighthouse/
  summary.mjs   ← puro: limiares, veredito, extração do relatório, markdown
  run.mjs       ← CLI: argumentos, servidor, navegador, npx, gravação
apps/e2e/__tests__/lighthouseSummary.test.ts
```

Por que `.mjs` e em `apps/e2e`: o Node do repo (`22.12.0`) não roda TypeScript sem flag experimental, e
`scripts/coverage-summary.mjs` já é o precedente de script em JS puro. Em `apps/e2e` o runner tem o
`@playwright/test` à mão para achar o Chromium, o Vitest do workspace (`environment: node`) testa o módulo puro,
e o `showcase/` mostra que ferramenta da etapa de entrega já mora ali. O `tsconfig` do workspace tem
`allowJs: true`, então o teste em TS importa o `.mjs` com tipos inferidos.

#### `summary.mjs`

```js
export const LIGHTHOUSE_VERSION = "12.8.2";
export const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];

// docs/delivery/03-product-quality.md §3.4, measured on mobile.
export const THRESHOLDS = {
    performance: { pass: 90, below: [{ min: 50, severity: "🟡" }], floor: "🔴" },
    accessibility: { pass: 95, floor: "🟡" },
    "best-practices": { pass: 95, floor: "🟡" },
    seo: { pass: 95, floor: "🟡" },
    "largest-contentful-paint": { under: 2500, floor: "🟡" },   // ms
    "cumulative-layout-shift": { under: 0.1, floor: "🟡" },
    "total-blocking-time": { under: 200, floor: "🟢" },          // ms
};

export function summarizeReport(lhr) { /* → { url, scores: {cat: 0..100|null}, metrics: {id: number|null}, error } */ }
export function verdict(key, value) { /* → "✅" | "🟡" | "🔴" | "🟢" | "not measured" */ }
export function renderSummary({ rows, meta }) { /* → string markdown */ }
```

O desenho exato das estruturas é do `/develop`; o contrato que o teste fixa é o da tabela de critérios. O
comentário que cita `docs/delivery/03-product-quality.md` é um ponteiro para documento de produto versionado, não
para artefato do fluxo, e a regra de comentários permite. Se o `/review` preferir, troca por "Delivery part 3
thresholds".

Exemplo de saída (números ilustrativos, não medidos):

```markdown
## Lighthouse (mobile)

Lighthouse 12.8.2 · 2026-11-24T10:00:00.000Z · commit a391d1c · http://localhost:3001 (next start started by the command)

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
|------|-------------|---------------|----------------|-----|-----|-----|-----|
| /pt-br | 71 🟡 | 98 ✅ | 100 ✅ | 100 ✅ | 4.1 s 🟡 | 0.002 ✅ | 310 ms 🟢 |
| /pt-br/pricing | ... |
| /pt-br/contact | ... |
```

#### `run.mjs`

Argumentos: `--url <base>`, `--locale <pt-br|en|es>` (padrão `pt-br`), `--port <n>` (padrão `3001`),
`--out <dir>` (padrão `apps/e2e/lighthouse-results`). Sequência:

1. Resolve o navegador: `process.env.CHROME_PATH || chromium.executablePath()`; se o arquivo não existe, erro com o
   comando de instalação.
2. Sem `--url`: confere `apps/web/.next/BUILD_ID`; confere que a porta está livre (`net.createServer().listen`);
   sobe `pnpm --filter web exec next start -p <port>` com `detached: true`; espera `GET /<locale>` responder
   (timeout de 60 s). Com `--url`: só confere que a base responde.
3. Para cada caminho (`""`, `/pricing`, `/contact`), roda
   `npx -y lighthouse@${LIGHTHOUSE_VERSION} <url> --form-factor=mobile --screenEmulation.mobile
   --only-categories=performance,accessibility,best-practices,seo --quiet --chrome-flags=--headless=new
   --output=json --output-path=<out>/<slug>.json`, com `CHROME_PATH` no ambiente do filho e `spawn` sem shell.
4. Lê cada JSON, monta as linhas com `summarizeReport`, grava `<out>/summary.md` e imprime em `stdout`.
5. `finally`: mata o grupo de processos do `next start` (`process.kill(-pid, "SIGTERM")`) quando foi ele quem
   subiu.
6. Código de saída: 0 quando as três páginas foram medidas; 1 em erro de execução. Pontuação baixa não muda o
   código.

As flags do Lighthouse são as do comando que a parte 3 já documenta (`03-product-quality.md:109-111`).

### 10.5 `apps/web/app/sitemap.ts`

```diff
 const sitemap = (): MetadataRoute.Sitemap => {
     const baseUrl = getWebBaseUrl();
-    const lastModified = new Date();
 
     return routes.flatMap((route) =>
         locales.map((locale) => ({
             url: `${baseUrl}/${locale}${route.path}`,
-            lastModified,
             changeFrequency: route.changeFrequency,
             priority: route.priority,
```

A lista de rotas não muda. `WEB_PATHS` (`apps/web/app/[locale]/paths.ts:7-15`) tem as mesmas cinco rotas, mas
trocar a fonte do sitemap seria refatoração fora da tarefa; o teste novo é o que impede as duas listas de
divergirem das páginas.

### 10.6 `apps/web/__tests__/sitemap.test.ts` (novo)

```ts
import { readdirSync } from "node:fs";
import { join, sep } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/internationalization/server", () => ({ getDictionary: vi.fn() }));
vi.mock("@/app/[locale]/sign-in/components/sign-in-form", () => ({ SignInForm: () => null }));
vi.mock("@/app/[locale]/sign-up/components/sign-up-form", () => ({ SignUpForm: () => null }));

const { default: sitemap } = await import("@/app/sitemap");

const LOCALE_DIR = join(__dirname, "../app/[locale]");
const NON_INDEXABLE = {
    "/sign-in": () => import("@/app/[locale]/sign-in/page"),
    "/sign-up": () => import("@/app/[locale]/sign-up/page"),
};

const publicPagePaths = () =>
    readdirSync(LOCALE_DIR, { recursive: true, encoding: "utf8" })
        .filter((file) => file.endsWith(`${sep}page.tsx`) || file === "page.tsx")
        .map((file) => file.split(sep).slice(0, -1))
        .filter((segments) => !segments.some((s) => s.startsWith("[")))
        .map((segments) => segments.filter((s) => !s.startsWith("(")))
        .map((segments) => (segments.length ? `/${segments.join("/")}` : ""));
```

Casos: os quatro de §7. `getDictionary` mockado devolve o dicionário real de `pt-br` (como em
`notFoundPage.test.tsx:8`); `NEXT_PUBLIC_WEB_URL` via `vi.stubEnv` (como em `robots.test.ts:18`). Segmento
dinâmico fica de fora da descoberta de propósito: `[...rest]` é o 404, e uma rota dinâmica pública de verdade
(blog, por exemplo) precisaria de um sitemap gerado a partir dos dados, que este teste não tem como conhecer.

### 10.7 Raiz e workspace `e2e`

```diff
// package.json (raiz)
     "e2e": "pnpm --filter e2e e2e",
+    "lighthouse": "pnpm --filter e2e lighthouse",

// apps/e2e/package.json
     "showcase": "playwright test -c showcase/playwright.config.ts",
+    "lighthouse": "node lighthouse/run.mjs",
-    "clean": "git clean -xdf .turbo node_modules playwright-report test-results blob-report .auth showcase-results"
+    "clean": "git clean -xdf .turbo node_modules playwright-report test-results blob-report .auth showcase-results lighthouse-results"

// .gitignore
 apps/e2e/showcase-results/
+apps/e2e/lighthouse-results/
```

O `.gitignore` também mantém os JSON longe do Biome, que lê o arquivo de ignore pelo `vcs.useIgnoreFile` do
`ultracite/core`.

### 10.8 Documentação

| Arquivo | Mudança |
|---------|---------|
| `docs/delivery/03-product-quality.md` §3.1 | antes do `agent-browser`: `pnpm --filter e2e e2e --project=mobile` cobre os fluxos críticos e o axe a 390 px; o `agent-browser` continua para 360 px, tema escuro, idiomas e as telas fora dos fluxos críticos |
| `docs/delivery/03-product-quality.md` §3.4 | o bloco `npx -y lighthouse ...` vira `pnpm --filter web build` + `pnpm lighthouse` (ou `pnpm lighthouse --url "$WEB"`), com a tabela de `summary.md` como evidência |
| `.claude/commands/deliver.md:74-75` | "senão `pnpm lighthouse` contra o build de produção local" |
| `docs/SETUP.md:266-267` e "Rodar local" | a suíte roda em desktop e, nos fluxos críticos, a 390 px; `--project=mobile` para rodar só o celular; `pnpm lighthouse` numa subseção curta (pré-requisito: build da `web` e Chromium do Playwright) |
| `CLAUDE.md` (comandos essenciais) | uma linha: `pnpm lighthouse   # Lighthouse mobile do build de produção da landing (medição, não gate)` |

Tudo passa pelo `humanizer` antes de salvar.

### 10.9 i18n

Nenhuma chave nova.

### 10.10 Ordem de implementação e de commit

Sem SDK, API ou i18n. Ordem por dependência:

1. `test(web): check the sitemap against the public landing pages` + `fix(web): drop the request-time lastModified from the sitemap`. Podem ser um commit só (`fix(web)`), com o teste junto da correção que ele cobre.
2. `test(e2e): run the critical flows and axe at 390 px` (config, `panelNavigation.ts`, `a11y.ts`, `signIn`, `signUp`).
3. `feat(e2e): add pnpm lighthouse for the production landing` (`lighthouse/`, teste unitário, `apps/e2e/package.json`, `package.json` raiz, `.gitignore`).
4. `docs: point delivery part 3 at the mobile project and pnpm lighthouse` (`03-product-quality.md`, `SETUP.md`, `CLAUDE.md`).
5. `docs(claude): use pnpm lighthouse in the deliver command`.
6. `docs(features): delivery-product-quality-slice-2` (último).

O `package.json` da raiz e o `.gitignore` vão no commit 3 porque só existem por causa do comando; separar exigiria
`git add -p` sem ganho.

### 10.11 Env nova

Nenhuma variável de app. `CHROME_PATH` é lida pelo `chrome-launcher` do Lighthouse e é opcional; o runner a
preenche com o Chromium do Playwright quando falta. Nada a configurar em fork nem na Vercel.

---

## 11. Pré-requisitos manuais de infra

Nenhum. A fatia não cria recurso, variável ou serviço. O que o `/test` precisa ter na máquina:

| Para | Precisa | Situação medida nesta máquina |
|------|---------|-------------------------------|
| V1, V2 (`pnpm e2e`) | JDK 21 no `PATH` (emulador) | o `java` padrão é 17.0.13; existe `/opt/homebrew/opt/openjdk@21`, que precisa ir à frente no `PATH` |
| V1, V2 | Chromium do Playwright | `~/Library/Caches/ms-playwright/chromium-1243` instalado |
| V4 a V6 (`pnpm lighthouse`) | build da `web` | `apps/web/.next/BUILD_ID` não existe hoje; rodar `pnpm --filter web build` |
| V4 a V6 | rede na primeira execução (o `npx` baixa `lighthouse@12.8.2`) | a consulta ao registro do npm funcionou nesta rodada |
| V4 a V6 | navegador | não há Google Chrome em `/Applications`; o runner usa o Chromium do Playwright |
| V4 a V6 | portas | 3001 livre para o `next start` (ou `--port`) |

**Tempo estimado do `/test`:** setup do E2E com compilação do `next dev` de 5 a 8 min; V1 e V2 juntas de 8 a 12 min
(o `pnpm e2e` completo leva cerca de 18 min, e esta fatia não pede a suíte inteira); build da `web` de 2 a 3 min;
cada página do Lighthouse de 20 a 40 s, então V4 e V5 juntas por volta de 4 min. Total na faixa de 25 a 30 min. A
suíte completa fica com o CI, onde o job `e2e` levou 4 min 30 s na última execução e tem 25 min de limite.

`organizationOwnership.spec.ts` falha por tempo sob `next dev` local e passa no CI. Não faz parte do projeto
`mobile` e não é desta fatia; V2 filtra por arquivo para não esbarrar nele.

## 12. Sinais de pronto da spec cobertos por esta fatia

- "O relatório de entrega consegue citar a pontuação do Lighthouse produzida por um comando do repositório"
  (linha 193): coberto por `pnpm lighthouse` e `summary.md`.
- "Sem 🟡 no item 3.7": a fatia fecha as duas lacunas que a spec aponta no sitemap (lista não testada e `lastmod`).
  O "enviado no Google Search Console" do 3.7 continua manual, do fork.
- 3.1 deixa de depender só da passada manual para os fluxos principais, que são os de gravidade 🔴 na parte 3.

## Perguntas em aberto (decididas por padrão)

Nenhuma foi perguntada. Cada uma traz a decisão adotada, a alternativa descartada e o porquê.

**Q1. Versão do Lighthouse no `npx`.**
Adotado: `lighthouse@12.8.2`, fixada numa constante de `summary.mjs`, que entra no cabeçalho da saída. A spec
recomenda fixar (linhas 204-206). A versão atual, 13.6.0, exige Node `>=22.19`, e o repo fixa `22.12.0` no
`.nvmrc`; 12.8.2 é a última que aceita esse Node. Descartado: `lighthouse@13.6.0` com o aviso de `engines`
ignorado (risco de quebrar em API do Node que falta) e subir o `.nvmrc` (mexe em CI, Vercel e em todo fork, fora
desta fatia). **Pergunta para o usuário:** subir o Node do repo para `>=22.19` numa tarefa própria, o que libera o
Lighthouse 13? Recomendação: sim, quando houver outro motivo para mexer no Node; sozinho não compensa.

**Q2. Quais fluxos entram no projeto `mobile`.**
Adotado: `landing`, `signIn`, `signUp` e `entityCrud`. São o cadastro, o login e a ação central, que a parte 3
classifica como 🔴 quando não completam no celular (`03-product-quality.md:43`), e o caminho da landing até o
cadastro. Descartado: a suíte inteira (dobra o tempo local de ~18 min e inclui `organizationOwnership`, instável
sob `next dev`); `panelSwitch` (no celular o seletor muda de componente, o teste precisaria de um ramo próprio, e
a troca de painel é do admin, não do visitante); `a11yDark` a 390 px (13 rotas a mais; tema escuro no celular
continua com o `agent-browser`).

**Q3. Dispositivo do projeto.**
Adotado: `devices["Pixel 7"]` com o viewport trocado para 390 × 844. É Chromium (o CI só instala Chromium,
`ci.yml:181`), com `isMobile`, `hasTouch` e user agent de celular coerente com o motor. Descartado:
`devices["iPhone 13"]` (390 × 844 de fábrica, mas `defaultBrowserType: webkit`, que o CI não instala; forçar
Chromium com user agent de Safari mente sobre o navegador); viewport solto sobre `Desktop Chrome`, como o
`showcase/capture.spec.ts:23-26` (o user agent continua de desktop).

**Q4. O projeto `mobile` roda no CI?**
Adotado: sim. Ele está na config, e `pnpm e2e` roda todos os projetos; o job `e2e` usa 4 min 30 s de 25. Descartado:
projeto opcional por variável de ambiente, que deixaria o celular de fora justamente da rede de regressão. Só o
Lighthouse fica fora do CI, como a spec manda.

**Q5. `lastModified` do sitemap.**
Adotado: não emitir. O protocolo de sitemap trata `lastmod` como opcional, e o Google só o usa quando ele é
"consistently and verifiably accurate" (página citada pela spec, linha 85). Hoje o valor é a hora da geração, que no
build de produção vira a hora do build: toda implantação declara todas as páginas alteradas. Descartado: data fixa
por rota no array `routes` (o fork esquece de atualizar e a data passa a mentir no sentido oposto); data do último
commit do arquivo (`git log` no build não é confiável na Vercel, que pode clonar raso, e o texto da página mora no
dicionário, não no `page.tsx`). **Pergunta para o usuário:** preferir uma data declarada por rota? Recomendação:
não, até existir conteúdo que muda com frequência (um blog), quando o sitemap passa a ser gerado a partir dos dados.

**Q6. Como o teste sabe quais páginas são não indexáveis.**
Adotado: lista explícita no teste (`/sign-in`, `/sign-up`), conferida chamando `generateMetadata` de cada página
com o dicionário e o formulário mockados. Descartado: importar todas as páginas e ler `robots` de cada uma (a home
puxa todas as seções da landing para dentro do Vitest, caro e frágil); procurar `indexable: false` no texto do
arquivo (teste de string, quebra com qualquer reformatação).

**Q7. O `pnpm lighthouse` sobe a landing sozinho?**
Adotado: sim quando não há `--url`. Ele sobe `next start`, que só existe para build de produção e recusa rodar sem
um; isso garante o "nunca meça em `next dev`" da parte 3 (`03-product-quality.md:14-15`). O build continua sendo
passo de quem mede, porque leva minutos e o `/deliver` já roda `pnpm build`. Descartado: só medir uma URL dada
(deixa a escolha do servidor para a memória de quem roda); rodar o build dentro do comando (dobra o tempo e
reconstrói o que já está pronto).

**Q8. O comando falha quando a pontuação fica abaixo da meta?**
Adotado: não. Código 1 só em erro de execução. A spec põe o Lighthouse como medição e deixa o gate fora do corte
(linhas 160-161), porque a variação entre execuções ainda não foi medida. Descartado: `--strict` com código de
saída por limiar (abstração antes do caso de uso, que é o gate de CI).

**Q9. Uma execução ou mediana de várias.**
Adotado: uma execução por página. A saída registra versão, data e commit, então o relatório diz o que mediu.
Descartado: mediana de três ou cinco execuções, que reduz a variação, porque
triplica o tempo e só se paga quando o número virar gate. **Pergunta para o usuário:** incluir mediana já?
Recomendação: não; entra junto com o Lighthouse no CI.

**Q10. Onde mora o runner.**
Adotado: `apps/e2e/lighthouse/`, script `pnpm --filter e2e lighthouse`, com atalho `pnpm lighthouse` na raiz, no
mesmo formato de `pnpm e2e`. Descartado: `scripts/lighthouse.mjs` na raiz (o Vitest da raiz só roda projetos de
`apps/*` e `packages/*`, `vitest.config.mts:9`, então o módulo puro ficaria sem teste, e o runner não teria o
`@playwright/test` para achar o Chromium).

**Q11. `npx` com versão fixa conta como dependência nova?**
Adotado: tratado como ferramenta de medição, não dependência. Não entra no `package.json`, no lockfile nem no
bundle; roda na máquina de quem mede, como o `npx npm-check-updates` do `bump-deps` e o `npx shadcn` do `bump-ui`
(`package.json` da raiz). A política do `/cycle` pede que isso passe pelo relatório, então fica registrado aqui e no
retorno. Descartado: `lighthouse` como `devDependency` da raiz (entra no `pnpm install` e no `pnpm audit` de todo
fork, por uma ferramenta usada uma vez por entrega).

## 13. Riscos

- **Teste do celular revelar defeito real.** Uma violação do axe ou um vazamento horizontal a 390 px reprova a
  suíte. Pela política, defeito encontrado se corrige no componente, dentro desta fatia, com o desvio registrado
  no handoff. Se a correção crescer além de um ajuste de classe, vira achado no backlog e o `/develop` para e
  registra.
- **Lighthouse 12.8.2 com Chromium 1243.** A versão é de agosto de 2025 e o Chromium do Playwright 1.63 é bem mais
  novo. O protocolo do DevTools costuma ser compatível, mas não medi. A V4 confirma; se falhar, o plano B é
  `CHROME_PATH` apontando para um Chrome estável instalado à mão.
- **Pontuação baixa.** O Lighthouse deve mostrar Performance abaixo de 90 na home, pela carga do antd e do Firebase
  Auth que a spec já aponta (linhas 43-48). Isso é o número que a fatia existe para produzir, não uma reprovação.
- **`next start` órfão.** Se o runner morrer por sinal externo entre subir e matar o servidor, a porta 3001 fica
  ocupada. O `finally` cobre exceção, não `kill -9`. O `/test` confere a porta no fim.
- **Tempo do CI.** O projeto `mobile` soma em torno de nove testes já compilados pelo desktop. Estimo menos de um
  minuto no job `e2e`; o `/test` não mede isso, o CI da PR mede.
