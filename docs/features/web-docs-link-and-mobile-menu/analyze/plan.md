# Plano: link de documentação e menu mobile da web

Tarefa direta, sem spec. Vem da recomendação #1 de `specs/BACKLOG.md` (seção "Ordem recomendada", linhas
240-280) e do achado em `specs/BACKLOG.md:1263`. É a primeira de duas tarefas da branch
`guilhermebittelbrunn/cycle-2-features-implement`; a segunda, `api-auth-webhook-error-codes`, mexe só em
`apps/api` e não divide arquivo com esta. Plano feito em rodada autônoma do `/cycle`: as decisões que
normalmente seriam perguntas estão na §11, cada uma com a opção adotada e a descartada.

As âncoras foram conferidas neste checkout em 2026-10-14. Abreviações usadas no texto:

| Abreviação | Caminho |
|------------|---------|
| `<env>` | `apps/web/env.ts` |
| `<header>` | `apps/web/app/[locale]/components/header/index.tsx` |
| `<footer>` | `apps/web/app/[locale]/components/footer.tsx` |
| `<core-keys>` | `packages/next-config/keys.ts` |
| `<env-core>` | `node_modules/.pnpm/@t3-oss+env-core@0.13.8_…/node_modules/@t3-oss/env-core/dist/src-Bb3GbGAa.js` |

## 0. Sumário do desenho

- `<env>` passa a declarar `NEXT_PUBLIC_DOCS_URL` no `client` e no `runtimeEnv`, com `|| undefined`, do mesmo
  jeito que já declara `NEXT_PUBLIC_APP_URL` (`<env>:20-22`, `:31`). É o que faz o link aparecer no header e no
  footer: os dois componentes já leem `env.NEXT_PUBLIC_DOCS_URL` e já sabem montar o item.
- Com o link ligado, a barra cheia do header passa a aparecer a partir de `xl` (1280 px) em vez de `lg`
  (1024 px). Sem o link, nada muda: a barra continua a partir de `lg`, com as classes de hoje. A conta da §1.3
  mostra que quatro itens à esquerda cabem a 1024 px com folga menor que o erro da estimativa e tiram a marca
  do centro; a 1280 px sobram mais de 100 px.
- Na barra cheia, o link de documentação abre em aba nova com `rel="noopener noreferrer"`, como já fazem o menu
  mobile (`<header>:282-291`) e o footer (`<footer>:109-122`).
- Os links do painel do menu mobile (`<header>:279-313`) ganham `onClick` que fecha o painel. O botão volta a
  `aria-expanded="false"` e o painel sai do DOM.
- `docs/SETUP.md:72` deixa de dizer que a `app` lê a variável.
- Testes: um arquivo em `node` que lê o `env.ts` real e renderiza header e footer nos três idiomas, e um arquivo
  em jsdom que abre o menu, segue um link e confere o fechamento. Os dois reprovam no código atual. O jsdom
  exige declarar `jsdom` e `@testing-library/react` como devDependencies da `apps/web`, nas versões que a
  `apps/app` já usa.
- Sem SDK, API, Firestore, chave nova de i18n ou infraestrutura.

## 1. Contexto

### 1.1 Problema

Dois defeitos na landing, os dois medidos pelo `/test` da PR #45
(`docs/features/web-header-reflow-and-menu-name/test/report.md:74-86`):

1. O link "Documentação" nunca aparece. `docs/FORKING.md:364` e `docs/SETUP.md:72` anunciam a variável
   `NEXT_PUBLIC_DOCS_URL` a todo fork, e `apps/web/.env.example:53` a publica vazia. Quem preenche não vê
   efeito nenhum e só descobre o motivo lendo o `env.ts`.
2. No celular, o menu continua aberto por cima da página nova depois de seguir um link. O `/test` abriu o menu a
   390 px, seguiu "Contato", e `/pt-br/contact` carregou com `aria-expanded="true"`.

### 1.2 Conferência das afirmações da auditoria

| Afirmação | Conferido em | Resultado |
|-----------|--------------|-----------|
| `<env>` não declara `NEXT_PUBLIC_DOCS_URL` | `<env>:13-32` | Confirmado. O `client` tem 5 chaves e o `runtimeEnv` também; nenhuma é a de documentação. |
| Com `skipValidation`, o que vem de `core()` não chega ao objeto | `<env-core>:36-37` | Confirmado na fonte da biblioteca: `const skip = !!opts.skipValidation; if (skip) return runtimeEnv;`. O `extends` só é mesclado depois desse retorno (`<env-core>:68-71`), então com `skipValidation: true` (`<env>:33`) o objeto é exatamente o `runtimeEnv` declarado no próprio `<env>`. |
| `core()` declara a variável | `<core-keys>:25`, `:64` | Confirmado, mas é inócuo pelo motivo acima. |
| Header e footer leem a variável | `<header>:72-78`, `<footer>:28-35` | Confirmado. Os dois montam o item com `dictionary.components.header.docs`. |
| Os testes não pegam porque mocam `@/env` | `headerInteractiveNesting.test.tsx:25`, `:113`; `headerMenuButton.test.tsx:19-21`; `brandSurfaces.test.tsx:18-23` | Confirmado. Nenhum teste da `apps/web` importa o `env.ts` real. |
| Os links do menu mobile não fecham o painel | `<header>:80`, `:264`, `:279-313` | Confirmado. `setOpen` só é chamado no `onClick` do botão (`:264`); os `Link` do painel não têm handler. O `Header` é renderizado pelo layout e sobrevive à navegação client-side, então o estado `isOpen` também sobrevive. |
| `docs/SETUP.md:72` cita a `app` | `docs/SETUP.md:72` | Confirmado e errado: nenhum arquivo de `apps/app` lê a variável (`grep` no repo). Ela aparece em `apps/app/.env.example:74` e `apps/api/.env.example:86`, com valor `http://localhost:3004`, sem consumidor. |
| `docs/FORKING.md:364` | idem | Diz "web", "header e footer", "Link oculto" quando vazia. Passa a ser verdade com esta entrega; não precisa mudar. |
| A chave `components.header.docs` existe | `packages/internationalization/translations/components/header/index.ts:9`, `:27`, `:45` | Confirmado: "Documentação", "Documentation", "Documentación". |

Achado lateral do mesmo trecho: na barra cheia o item de documentação é um `Link` sem `target` nem `rel`
(`<header>:90-100`), enquanto o menu mobile e o footer abrem URL externa em aba nova. O link nunca apareceu,
então o comportamento dele está sendo definido agora. Ver D3 na §11.

### 1.3 Conta de largura: por que a barra cheia sobe para `xl` com o link

Sem navegador, a conta reaproveita as medições da PR #45
(`docs/features/web-header-reflow-and-menu-name/analyze/plan.md:56-92` e `test/report.md:44-69`). A grade da
barra é `lg:grid-cols-[1fr_minmax(0,auto)_1fr]` com `gap-4` (`<header>:84`). A 1024 px o contêiner mede 1008 px
(976 úteis depois dos dois `gap-4`); com barra de rolagem vertical, 993 (961 úteis). A marca padrão
(`next-boilerplate`, `packages/next-config/brand.ts:14`) ocupa ~156 px.

| Caso a 1024 px | Esquerda (4 itens) | Marca | Direita | Total | Disponível | Folga |
|----------------|--------------------|-------|---------|-------|------------|-------|
| es, visitante | ~429 | 156 | ~374 (medido) | ~959 | 976 | ~17 px |
| es, logado, com barra de rolagem | ~429 | 156 | ~366 | ~951 | 961 | ~10 px |

As larguras de texto têm erro estimado de ±20 px, maior que a folga. E mesmo quando cabe, a coluna da esquerda
(~429) passa da metade que lhe cabe (~410), a grade deixa de ter laterais iguais e a marca sai ~10 px do centro,
propriedade que a PR #45 mediu em 0 px nas 36 combinações.

A 1280 px cada lateral tem ~538 px. Com o rótulo do seletor de idioma visível a partir de 1280
(`useIsLargeDesktop`, `packages/design-system/hooks/useMediaQuery.ts:115-119`), a maior direita medida foi
~443 px (es visitante). A esquerda com o link fica em ~429. Sobram mais de 90 px dos dois lados e a marca segue
no centro.

Por isso, com o link ligado, a barra cheia começa em `xl`. Entre 1024 e 1279 px o header usa o layout que hoje
vale de 768 a 1023 (idioma, tema, botões de conta e o menu), que já cabe a 768 px. Sem o link, a grade de hoje
continua a partir de `lg`. Os números da tabela são estimativa por leitura; o `/test` mede a largura real da
lista da esquerda a 1280 px para conferir a premissa (§9, F2).

### 1.4 Objetivo e corte

**Objetivo:** quem preenche `NEXT_PUBLIC_DOCS_URL` vê o link no header e no footer, sem que o header estoure ou
descentralize a marca; e quem navega pelo menu do celular chega à página nova com o menu fechado.

**Corte de MVP (dentro):**

1. Declarar a variável em `<env>` com `|| undefined` (string vazia é ausência, `cycle-policy` §3).
2. Barra cheia a partir de `xl` só quando o link existe.
3. Link de documentação da barra cheia em aba nova, como no menu e no footer.
4. Fechar o menu mobile ao seguir qualquer link do painel, item ou subitem.
5. Corrigir `docs/SETUP.md:72`.
6. Dois testes que reprovam hoje, mais as devDependencies que o teste jsdom exige.

**Fora do corte:**

- Marca com 30 caracteres a 1024 px (achado informativo da PR #45). Tirar a marca do centro é decisão de produto.
- `skipValidation` no `<env>` e o bloqueio de bot (E13). Declarar a variável não mexe nisso.
- Fechar o menu com Escape ou clique fora, foco preso no painel, `aria-controls`. São melhorias de acessibilidade
  do disclosure que a auditoria não pediu; ficam como achado.
- Remover `NEXT_PUBLIC_DOCS_URL` de `apps/app/.env.example:74` e `apps/api/.env.example:86`, onde não tem
  consumidor. Ver D5.
- Validar o formato da URL. Com `skipValidation` o schema não roda; a URL vem do operador do fork, não de usuário.

### 1.5 Apps impactados

| Área | Impacto |
|------|---------|
| `apps/web` | `env.ts`, `header/index.tsx`, dois testes novos, `package.json` (devDependencies), `CLAUDE.md` (seção Testes) |
| `pnpm-lock.yaml` | Entradas novas só no importer `apps/web`; os pacotes já estão no lockfile pela `apps/app` |
| `docs/SETUP.md` | Uma linha |
| `apps/app`, `apps/api`, `packages/*` | Nenhum |

- Área do painel: N/A (landing pública).
- Modo de produto: o link de documentação independe de `NEXT_PUBLIC_PRODUCT_MODE`. O modo só muda o grupo da
  direita no estado logado (botão "Ir para o painel" existe só em `subscription`, `<header>:47`), e o `simple`
  é o caso mais estreito. O `/test` usa o padrão (`subscription`), que é o pior caso.
- Assinatura/plano: N/A.
- Genérico × específico: genérico, em `apps/web`.

### 1.6 Fontes

- `specs/BACKLOG.md` (recomendação #1, linhas 240-280; achado em `:1263`; contradições de doc em `:590`).
- `docs/features/web-header-reflow-and-menu-name/` (plano, relatório de teste e números de largura).
- `.claude/cycle-policy.md` §3 (string vazia é ausência; modo degradado testado) e §4.
- Nenhuma referência externa. Nada ficou sem ler.

## 2. Dados (Firestore)

N/A.

## 3. Contrato `@repo/sdk`

N/A.

## 4. API

N/A. Nenhum `error.code` novo.

## 5. Front-end

### 5.1 `env.ts`

Acrescentar `NEXT_PUBLIC_DOCS_URL: z.string().optional()` no `client` e
`NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL || undefined` no `runtimeEnv`. O comentário de
`<env>:20-21` ("Same reason as above") já explica a duplicação para o `NEXT_PUBLIC_APP_URL`; a linha nova fica
ao lado dele e o comentário passa a cobrir as duas, sem texto novo.

`z.string()` e não `z.url()`: com `skipValidation` o schema não roda, e o padrão do arquivo para URLs é
`z.string().optional()` (`<env>:18`, `:22`). O `|| undefined` está na mesma linha do `NEXT_PUBLIC_APP_URL`
(`<env>:31`). O Next inlina `process.env.NEXT_PUBLIC_*` no build, então servidor e cliente recebem o mesmo valor
e não há risco de diferença na hidratação.

### 5.2 Barra cheia condicionada ao link

As quatro classes que decidem a partir de quando a barra cheia aparece:

| Linha | Hoje | Papel |
|-------|------|-------|
| `<header>:84` | `lg:grid lg:grid-cols-[1fr_minmax(0,auto)_1fr]` | grade de três colunas |
| `<header>:85` | `hidden … lg:flex` | navegação da esquerda |
| `<header>:167` | `lg:justify-center` | marca centralizada |
| `<header>:260` | `lg:hidden` | botão e painel do menu |

Um objeto com as duas variantes em string literal (o Tailwind v4 só gera classe que aparece inteira no código),
escolhido por `docsUrl`:

```tsx
const FULL_BAR_FROM = {
    lg: {
        row: "lg:grid lg:grid-cols-[1fr_minmax(0,auto)_1fr]",
        nav: "lg:flex",
        brand: "lg:justify-center",
        menu: "lg:hidden",
    },
    xl: {
        row: "xl:grid xl:grid-cols-[1fr_minmax(0,auto)_1fr]",
        nav: "xl:flex",
        brand: "xl:justify-center",
        menu: "xl:hidden",
    },
} as const;
```

O `lg:grid` interno do conteúdo do dropdown "Produto" (`<header>:107`) fica como está: é a grade do painel do
dropdown, que só abre quando a barra cheia existe.

O objeto pede um comentário curto, por ser restrição de layout não evidente: com quatro itens à esquerda a barra
não cabe a 1024 px com a marca no centro. Nada de citar plano, PR ou medição de etapa.

### 5.3 Link de documentação na barra cheia

No ramo `item.href` da barra (`<header>:90-100`), passar `target="_blank"` e `rel="noopener noreferrer"` quando
`item.href.startsWith("http")`, a mesma regra do menu mobile (`<header>:282-291`). Os itens internos continuam
sem esses atributos.

### 5.4 Fechar o menu ao seguir link

`const closeMenu = () => setOpen(false);` e `onClick={closeMenu}` nos dois `Link` do painel: o do item
(`<header>:279`) e o do subitem (`<header>:304`). Clique em link que abre aba nova (documentação) também fecha o
painel na aba original. Clique em link para a rota atual (por exemplo "Início" estando na home) também fecha, e é
por isso que o fechamento vai no clique e não num efeito sobre `usePathname`: o pathname não muda nesse caso.

### 5.5 Footer

Nenhuma mudança de código. `<footer>:28-35` já põe o link na coluna "Produto", em aba nova (`:109-122`), e
passa a funcionar com o `<env>` corrigido. Coberto pelo teste T1.

### 5.6 Estados

| Estado | Como produzir | Esperado |
|--------|---------------|----------|
| Variável ausente | não definir | Sem link em lugar nenhum; barra cheia a partir de 1024 px, como hoje |
| Variável vazia | `NEXT_PUBLIC_DOCS_URL=""` (forma do `.env.example`) | Igual a ausente |
| Variável preenchida | `NEXT_PUBLIC_DOCS_URL=https://docs.example.com` no build | Link no header (barra a partir de 1280, menu abaixo disso) e no footer, nos três idiomas |
| Menu aberto, link seguido | 390 ou 768 px, abrir o menu, clicar num link | Página nova com o menu fechado e `aria-expanded="false"` |

## 6. i18n

Nenhuma chave nova. Usa `components.header.docs` (já existe nos três idiomas, §1.2). Nenhum texto novo em JSX.

## 7. Autorização e segurança

- Página pública, sem guard. Impersonação: N/A.
- O link externo sai com `rel="noopener noreferrer"` nas três superfícies.
- A URL vem de variável de ambiente pública definida pelo operador no build, não de entrada de usuário. A CSP da
  web (`apps/web/proxy.ts`) não restringe navegação por link, então nada a ajustar ali.

## 8. Testes

O nível mais barato que prova cada critério:

| Critério | Nível | Arquivo |
|----------|-------|---------|
| A variável chega ao `env` e o link aparece no header e no footer, nos três idiomas | Vitest `node`, `renderToString`/`renderToStaticMarkup`, `env.ts` real | T1 |
| Vazio e ausente escondem o link | idem | T1 |
| Seguir link do painel fecha o menu | Vitest jsdom + Testing Library | T2 |
| Barra a partir de `xl` só com o link; aba nova na barra | Vitest jsdom (classe e atributo), sem layout | T2 |
| Sem rolagem lateral de 1024 a 1440 px | Só navegador | `/test` |

### 8.1 T1: `apps/web/__tests__/docsUrlEnv.test.tsx` (novo, ambiente `node`)

Mesma estrutura do `brandSurfaces.test.tsx`, com uma diferença: **não** moca `@/env`. Moca `@repo/auth/provider`,
`@/shared/lib/client`, `@repo/next-config/product-mode`, `@repo/design-system/hooks/useMediaQuery`,
`@repo/analytics/consent-context`, `@repo/internationalization/server` (`getDictionary` controlado pelo teste),
`next/navigation` (com `params.locale` mutável, como em `headerMenuButton.test.tsx:7-9`) e `next/link`.

Cada caso faz `vi.stubEnv("NEXT_PUBLIC_DOCS_URL", valor)`, `vi.resetModules()` e reimporta `Header` e `Footer`
(precedente de `resetModules` + import dinâmico do `env.ts` real: `apps/app/__tests__/entityPlanRequirementEnv.test.ts`).
`afterEach` com `vi.unstubAllEnvs()`.

Casos:

1. `it.each(locales)`: com `https://docs.example.com`, o header tem `href="https://docs.example.com"` e o texto de
   `globalTranslations[locale].components.header.docs`.
2. `it.each(locales)`: idem no footer.
3. `""`: nem header nem footer contêm o `href`, e o `env.NEXT_PUBLIC_DOCS_URL` importado é `undefined`.
4. Ausente (`vi.stubEnv` com `undefined`, ou `delete process.env.NEXT_PUBLIC_DOCS_URL` restaurado no `afterEach`):
   idem ao 3.

Reprova hoje nos casos 1 e 2, porque o `env` real não carrega a variável. Os casos 3 e 4 passam hoje e seguem
passando; garantem o modo degradado.

### 8.2 T2: `apps/web/__tests__/headerMobileMenu.test.tsx` (novo, jsdom por arquivo)

Primeira linha `// @vitest-environment jsdom`. Usa `render`, `screen`, `within` e `fireEvent` de
`@testing-library/react`. Moca `@/env` (aqui o objeto do teste é o componente; o `env` real já está coberto pelo
T1), `@repo/auth/provider`, `@/shared/lib/client`, `@repo/next-config/product-mode`,
`@repo/design-system/hooks/useMediaQuery` e `next/navigation`, como o `headerInteractiveNesting.test.tsx`. O mock
de `next/link` repassa as props e chama `event.preventDefault()` antes do `onClick` recebido, para o jsdom não
tentar navegar.

Escopo do painel sem mudar a marcação: o botão é `screen.getByRole("button", { name: menuLabel })`, e o painel é
procurado com `within(menuButton.parentElement)`, já que botão e painel são filhos do mesmo `div`
(`<header>:260-320`).

Casos:

1. Abrir o menu, clicar no link "Contato" do painel: o botão fica com `aria-expanded="false"` e o link do painel
   some.
2. Idem pelo subitem "Preços".
3. Com `NEXT_PUBLIC_DOCS_URL` no mock, clicar em "Documentação" no painel também fecha.
4. O botão continua abrindo e fechando por clique (regressão do comportamento de hoje).
5. Sem o link: o wrapper do botão tem `lg:hidden` e não tem `xl:hidden`. Com o link: o inverso, e o link de
   documentação da barra tem `target="_blank"` e `rel="noopener noreferrer"`.

Reprovam hoje: 1, 2, 3 e 5. Se o jsdom acusar falta de `ResizeObserver` ou `matchMedia` ao montar os primitivos
Radix, o teste define um stub mínimo em `globalThis` (precedentes: `matchMedia` em `apps/app/__tests__/sidebarPersistence.test.tsx:55`, `ResizeObserver` em
`apps/app/__tests__/accountPreferencesForm.test.tsx`).

### 8.3 Dependências de teste

A suíte da web roda em `node` (`apps/web/vitest.config.mts:9`), e o `apps/web/CLAUDE.md` ("Testes") diz que ela
não usa jsdom. `jsdom` e `@testing-library/react` resolvem hoje só porque o `.npmrc` faz hoist de tudo
(`public-hoist-pattern[]=*`). Depender disso sem declarar é dependência fantasma. Então:

- `apps/web/package.json`, devDependencies: `"@testing-library/dom": "^10.4.1"`, `"@testing-library/react": "^16.3.0"`,
  `"jsdom": "^27.0.1"`, as mesmas faixas de `apps/app/package.json:42-49`. `pnpm install` só acrescenta entradas no
  importer `apps/web` do `pnpm-lock.yaml`; nenhum pacote novo no repositório. O CI instala com lockfile congelado,
  então o lockfile entra no commit.
- O ambiente global continua `node`. O jsdom vale só no arquivo que declara.
- `apps/web/CLAUDE.md`, seção "Testes": acrescentar a segunda exceção estreita, a interação de Client Component
  cujo estado só muda por evento (jsdom por arquivo, com `// @vitest-environment jsdom`). Layout, tema e largura
  continuam com `agent-browser`.

### 8.4 Regressão que deve seguir verde

`headerMenuButton.test.tsx`, `headerInteractiveNesting.test.tsx` e `brandSurfaces.test.tsx` mocam `@/env` sem
`NEXT_PUBLIC_DOCS_URL` (ou com ela, no caso logado de `headerInteractiveNesting.test.tsx:113`). Nenhum deles
confere classe de breakpoint; o `brandSurfaces.test.tsx:99-110` confere a classe do `<p>` da marca, que não muda.
A suíte e2e (`apps/e2e`) não define a variável nem usa o header a 1024 px, então segue igual.

## 9. O que o `/test` vai percorrer

Dois builds de produção da web (`pnpm --filter web build && pnpm --filter web start`, para não depender do cache
do turbo), com a variável no ambiente do processo:

- **B1:** `NEXT_PUBLIC_DOCS_URL=https://docs.example.com`.
- **B2:** `NEXT_PUBLIC_DOCS_URL=""`.

Estado logado com o emulador do Firebase e a `api`/`app` de pé, como na PR #45. Modo `subscription` (padrão).

| Fluxo | Build | Viewports | Idiomas / tema / estado | Esperado |
|-------|-------|-----------|--------------------------|----------|
| F1. Link presente | B1 | 1280, 1440 (barra); 390, 768, 1024 (menu aberto); footer em qualquer largura | 3 idiomas | Texto do dicionário, `href` igual à variável, `target="_blank"` e `rel="noopener noreferrer"` na barra, no painel e no footer |
| F2. Header com o link cabe | B1 | 1024, 1280, 1440 | 3 idiomas × visitante/logado × claro/escuro (36) | `scrollWidth` = `clientWidth`; a 1280 e 1440, marca a 0 px do centro e quatro itens à esquerda; a 1024, layout com o botão do menu e todos os itens alcançáveis pelo menu. Informativo: largura da lista da esquerda a 1280 px em cada idioma, para conferir os ~429 px estimados na §1.3 |
| F3. Sem o link nada muda | B2 | 1024, 1280, 1440 | as 36 combinações da PR #45 | Três itens à esquerda, barra cheia a partir de 1024, sem rolagem lateral, marca no centro; nenhum link de documentação no header nem no footer |
| F4. Menu fecha ao seguir link | B1 e B2 | 390, 768 (e 1024 no B1) | 3 idiomas; claro e escuro | Abrir o menu, seguir "Contato": página nova com o painel fechado e `aria-expanded="false"`. Repetir com o subitem "Preços", com "Início" estando na home (mesma rota) e, no B1, com "Documentação" (aba nova; o painel fecha na aba original). Teclado: Tab até um link do painel e Enter fecha |
| F5. Abaixo de 1024 px | B2 | 390, 768 | 3 idiomas, visitante e logado | Mesmos itens e mesma ausência de rolagem da PR #45 |
| F6. Acessibilidade | B1 | 390 (menu aberto e fechado), 1280 | es e pt-br, claro e escuro | axe-core no `header` sem violações |

Gates: `pnpm check`, `pnpm --filter web typecheck`, `pnpm --filter web test`, `pnpm test` da raiz e `pnpm e2e`.

Nada depende de infraestrutura externa. Nenhum critério deve sair 🔒.

## 10. Critérios de aceite (resumo para o `/test` expandir no formato §9.1)

1. Com a variável preenchida no build, o link aparece no header (barra cheia e menu) e no footer nos três
   idiomas, com o texto do dicionário. Vazia ou ausente, some.
2. T1 lê o `env.ts` real e reprova no código de antes.
3. Seguir qualquer link do painel do menu fecha o painel e devolve `aria-expanded="false"`; T2 reprova no código de
   antes.
4. Com o link ligado, 1024/1280/1440 px, três idiomas, visitante e logado, claro e escuro: sem rolagem lateral,
   marca no centro onde a barra cheia aparece, nenhum item inalcançável.
5. Sem o link, as 36 combinações da PR #45 seguem iguais.
6. Abaixo de 1024 px muda só o fechamento do menu.
7. O link de documentação abre em aba nova com `noopener noreferrer` nas três superfícies.
8. Gates verdes e `/test` feito em build com e sem a variável.

## 11. Perguntas em aberto (todas já decididas nesta rodada)

| # | Pergunta | Opções | Adotada | Por quê |
|---|----------|--------|---------|---------|
| D1 | Como fazer a variável chegar ao `env`? | (a) declarar em `<env>` como o `NEXT_PUBLIC_APP_URL`; (b) tirar o `skipValidation` | (a) | Recomendação da auditoria e padrão do próprio arquivo. (b) é a E13, fora do corte. |
| D2 | O que fazer com a largura da barra quando o link liga? | (a) barra cheia a partir de `xl` só com o link; (b) `xl` sempre; (c) manter `lg` e deixar o `/test` decidir | (a) | A ordem do coordenador era subir para `xl` se estourasse. Como o `/develop` não mede layout, a conta da §1.3 decide antes: a folga a 1024 px (10 a 17 px) é menor que o erro (±20 px) e a marca sai do centro mesmo quando cabe. (b) muda o layout padrão de 1024 a 1279 px para todo fork que não usa o link, e quebra o critério 5. (c) arrisca uma segunda rodada de `/review`, como aconteceu na PR #45. Se você preferir (b) pela simplicidade (uma classe por linha em vez do objeto), é trocar o objeto por quatro `xl:` fixos. |
| D3 | O link de documentação da barra abre em aba nova? | (a) sim, como menu e footer; (b) mesma aba | (a) | O link nunca apareceu, então não há comportamento anterior a preservar, e as outras duas superfícies já abrem em aba nova. |
| D4 | Como testar o fechamento do menu? | (a) jsdom por arquivo, com devDependencies declaradas na `apps/web`; (b) spec Playwright em `apps/e2e`; (c) sem teste, só `/test` | (a) | A auditoria pediu teste jsdom. As versões já estão no lockfile pela `apps/app`, então não entra pacote novo no repo. (b) exige a stack inteira de pé e é o nível mais caro. (c) viola o critério 3. O `apps/web/CLAUDE.md` ganha uma linha registrando a exceção. |
| D5 | Remover a variável de `apps/app/.env.example:74` e `apps/api/.env.example:86`, onde não há consumidor? | (a) remover agora; (b) registrar como achado | (b) | Menor raio: tocaria dois apps que esta tarefa não toca, um deles o da segunda tarefa da branch. O `SETUP.md` corrigido já diz que só a web lê. Vira achado no backlog com `arquivo:linha`. |
| D6 | Fechar o menu também com Escape e clique fora? | (a) agora; (b) achado | (b) | Fora do pedido da auditoria; fica registrado. |

## 12. Blueprint técnico

### 12.1 `apps/web/env.ts`

```diff
     client: {
         …
         NEXT_PUBLIC_APP_URL: z.string().optional(),
+        NEXT_PUBLIC_DOCS_URL: z.string().optional(),
     },
     runtimeEnv: {
         …
         NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || undefined,
+        NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL || undefined,
     },
```

O comentário de `:20-21` pode virar plural ("Where every call to action sends a visitor, and the docs link…")
se o desenvolvedor achar necessário; não é obrigatório.

### 12.2 `apps/web/app/[locale]/components/header/index.tsx`

```diff
+// Four links on the left do not fit next to a centred brand at 1024 px, so the full
+// bar waits for 1280 px when the docs link is configured.
+const FULL_BAR_FROM = { lg: { … }, xl: { … } } as const;   // §5.2

 export const Header = () => {
     …
-    if (env.NEXT_PUBLIC_DOCS_URL) {
+    const docsUrl = env.NEXT_PUBLIC_DOCS_URL;
+    const fullBar = FULL_BAR_FROM[docsUrl ? "xl" : "lg"];
+
+    if (docsUrl) {
         navigationItems.push({
             title: dictionary.components.header.docs,
-            href: env.NEXT_PUBLIC_DOCS_URL,
+            href: docsUrl,
             description: "",
         });
     }

     const [isOpen, setOpen] = useState(false);
+    const closeMenu = () => setOpen(false);
+    const isExternal = (href: string) => href.startsWith("http");

-    <div className="container … lg:grid lg:grid-cols-[1fr_minmax(0,auto)_1fr]">
-        <div className="hidden flex-row items-center justify-start gap-4 lg:flex">
+    <div className={cn("container relative mx-auto flex min-h-20 flex-row items-center gap-4", fullBar.row)}>
+        <div className={cn("hidden flex-row items-center justify-start gap-4", fullBar.nav)}>
     …
-            <Link href={item.href}>
+            <Link
+                href={item.href}
+                rel={isExternal(item.href) ? "noopener noreferrer" : undefined}
+                target={isExternal(item.href) ? "_blank" : undefined}
+            >
     …
-    <div className="flex items-center gap-2 lg:justify-center">
+    <div className={cn("flex items-center gap-2", fullBar.brand)}>
     …
-    <div className="flex w-12 shrink items-end justify-end lg:hidden">
+    <div className={cn("flex w-12 shrink items-end justify-end", fullBar.menu)}>
     …
             <Link
                 className="flex items-center justify-between"
                 href={item.href}
+                onClick={closeMenu}
                 …
             <Link
                 className="flex items-center justify-between"
                 href={subItem.href}
                 key={subItem.title}
+                onClick={closeMenu}
             >
```

O helper `isExternal` é opcional; o menu mobile pode passar a usá-lo também, desde que o diff fique pequeno.

### 12.3 `docs/SETUP.md:72`

```diff
-| `NEXT_PUBLIC_DOCS_URL` | `app`, `web` | Link de Documentação no header (opcional; oculto se vazio). |
+| `NEXT_PUBLIC_DOCS_URL` | `web` | Link de Documentação no header e no footer da landing, em aba nova (opcional; oculto se vazio). Com o link, a barra completa do header aparece a partir de 1280 px. |
```

### 12.4 `apps/web/CLAUDE.md`, seção "Testes"

Um item novo abaixo da exceção do `renderToStaticMarkup`: interação de Client Component cujo estado só muda por
evento (abrir/fechar, clique em link) pode usar jsdom no próprio arquivo, com `// @vitest-environment jsdom` e
`@testing-library/react`, como em `headerMobileMenu.test.tsx`. Layout, tema e largura seguem com
`agent-browser`. Ajustar também a frase "sem jsdom e sem plugin do React" para "sem jsdom por padrão".

### 12.5 Árvore de arquivos

```
apps/web/
  env.ts                                        (editado)
  package.json                                  (devDependencies)
  CLAUDE.md                                     (seção Testes)
  app/[locale]/components/header/index.tsx      (editado)
  __tests__/docsUrlEnv.test.tsx                 (novo, node)
  __tests__/headerMobileMenu.test.tsx           (novo, jsdom)
pnpm-lock.yaml                                  (importer apps/web)
docs/SETUP.md                                   (uma linha)
```

### 12.6 `contends_on`

`apps/web/env.ts`, `apps/web/app/[locale]/components/header/index.tsx`, `apps/web/package.json`,
`pnpm-lock.yaml`. A tarefa `api-auth-webhook-error-codes` não toca nenhum deles. O `pnpm-lock.yaml` só seria
disputado se a segunda tarefa adicionasse dependência, o que o plano dela não prevê.

### 12.7 Ordem de implementação

1. `env.ts` e T1. Rodar T1 antes da correção para ver a reprovação nos casos 1 e 2.
2. devDependencies (`pnpm install`) e `CLAUDE.md`.
3. `header/index.tsx` e T2. Rodar T2 antes da mudança do header para ver a reprovação.
4. `docs/SETUP.md`.
5. `pnpm check`, `pnpm --filter web typecheck`, `pnpm --filter web test`.

### 12.8 Env

Nenhuma variável nova. `NEXT_PUBLIC_DOCS_URL` já existe e já está em `apps/web/.env.example:53`, vazia. Para o
fork: preencher na Vercel do projeto da web e fazer novo deploy (valor público, inlinado no build).

## 13. Pré-requisitos manuais de infra

Nenhum. Nada a acrescentar ao `docs/PRE-PRODUCTION.md`.

## 14. Plano de commits sugerido (o `/review` consolida com a segunda tarefa da branch)

O `header/index.tsx` recebe as duas mudanças (barra/aba nova e fechamento do menu). Separá-las exigiria
`git add -p`, que o fluxo não usa, então ficam num commit só.

1. `fix(web): read NEXT_PUBLIC_DOCS_URL into the typed env`: `apps/web/env.ts`, `apps/web/__tests__/docsUrlEnv.test.tsx`.
2. `chore(web): add jsdom and testing-library for interaction tests`: `apps/web/package.json`, `pnpm-lock.yaml`,
   `apps/web/CLAUDE.md`.
3. `fix(web): fit the docs link in the header and close the mobile menu on navigation`:
   `apps/web/app/[locale]/components/header/index.tsx`, `apps/web/__tests__/headerMobileMenu.test.tsx`.
4. `docs: NEXT_PUBLIC_DOCS_URL is read by the web only`: `docs/SETUP.md`.
5. `docs(features): web-docs-link-and-mobile-menu`: `docs/features/web-docs-link-and-mobile-menu/`, depois de
   varrido por segredo, no fim da branch.

## 15. Achados para o backlog (fora do corte)

- `apps/app/.env.example:74` e `apps/api/.env.example:86` publicam `NEXT_PUBLIC_DOCS_URL="http://localhost:3004"`
  sem consumidor (D5).
- Menu mobile sem fechamento por Escape ou clique fora e sem `aria-controls` (`<header>:260-320`, D6).
- Marca de 30 caracteres ainda estoura a 1024 px sem o link (herdado da PR #45). Com o link ligado o caso deixa de
  existir a 1024, porque a barra cheia só aparece a partir de 1280.
