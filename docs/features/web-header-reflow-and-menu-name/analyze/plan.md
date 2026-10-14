# Plano: header da web cabe na janela e o botão do menu tem nome

Tarefa direta, sem spec. Vem da recomendação para a próxima tarefa em `specs/BACKLOG.md:323-358`, que junta
quatro achados abertos em `apps/web/app/[locale]/components/header/index.tsx`. Plano feito na terceira rodada
autônoma do `/cycle` no mesmo working tree: divide a PR com `date-input-navigation` e
`form-field-focus-and-names`, as duas implementadas, testadas e não commitadas. As decisões tomadas sem perguntar
estão na §12, e a §11 traz as perguntas já com a opção adotada.

As âncoras foram conferidas neste checkout em 2026-10-14. Abreviações: `<header>` =
`apps/web/app/[locale]/components/header/index.tsx`, `<i18n-header>` =
`packages/internationalization/translations/components/header/index.ts`.

## 0. Sumário do desenho

- O botão do menu (`<header>:261`) ganha `aria-label={dictionary.components.header.menu}` e
  `aria-expanded={isOpen}`. Nome fixo ("Menu", "Menu", "Menú") e o estado no `aria-expanded`, como no padrão
  de disclosure da WAI-ARIA. Uma chave nova em `<i18n-header>`, nos três idiomas.
- A grade da barra cheia (`<header>:84`) troca `lg:grid-cols-3` por `lg:grid-cols-[1fr_minmax(0,auto)_1fr]`.
  Hoje as três colunas têm a mesma largura, e a da marca fica com um terço da barra para um conteúdo de
  ~156 px, enquanto a da direita não cabe no terço dela. Com a coluna do meio do tamanho da marca, as laterais
  dividem o resto em partes iguais e a marca continua centralizada sempre que as duas laterais cabem na metade
  delas, o que vale para todas as larguras e idiomas medidos (§1.3).
- A marca (`<header>:186`) ganha `lg:truncate`. É uma rede de segurança para configurações extremas (link de
  documentação ligado, idioma longo e nome de marca muito longo na mesma janela estreita): o nome encolhe com
  reticências em vez de empurrar a página. Nas configurações medidas o nome não chega a encolher.
- Nenhum item sai do header, nenhuma classe de visibilidade muda e o menu do celular continua com os mesmos
  links. Abaixo de 1024 px o header fica como hoje.
- Teste: um arquivo SSR novo na `apps/web` (ambiente `node`, mesmo harness do
  `headerInteractiveNesting.test.tsx`) para o nome e o `aria-expanded` nos três idiomas. Reprova no código
  atual. A rolagem só se mede no navegador, porque nem o `node` nem o jsdom calculam layout; fica para o
  `/test`.
- Sem SDK, API, Firestore, env, dependência nem infra.

## 1. Contexto

### 1.1 Problema

| Âncora | Hoje | Efeito |
|--------|------|--------|
| `<header>:261-267` | `<Button onClick={() => setOpen(!isOpen)} variant="ghost">` só com o ícone `Menu` ou `X` | botão sem nome acessível e sem estado; o leitor de tela anuncia "botão" (WCAG 4.1.2). O estado existe em `:80` |
| `<header>:84` | `lg:grid lg:grid-cols-3` | a partir de 1024 px, três colunas iguais (`repeat(3, minmax(0, 1fr))` no Tailwind 4). O grupo da direita (`:191-258`) não cabe no terço dele e passa da borda |
| `<header>:191-258` | idioma, tema, separadores e botões de conta com `gap-4`; o idioma ganha o rótulo a partir de 1280 px (`useIsLargeDesktop`, `:38`, `:194`; `MEDIA_BREAKPOINTS.largeDesktop` 1280) | o grupo cresce ~65 px justo em 1280, onde a coluna também cresce |

### 1.2 Conferência das afirmações da auditoria

| Afirmação | Situação |
|-----------|----------|
| Botão em `:261`, ícones em `:262-266`, `isOpen` em `:80` | confere |
| Barra cheia a partir de `lg` (`:85`, `:260`), itens da direita a partir de `md` (`:192-242`) | confere |
| Deslogado a 1024: +6 px pt-br, +49 px es, en cabe (`docs/features/brand-config/test/report.md:162-164`) | confere com o relatório; o mesmo número com o nome padrão e com um de 30 caracteres, o que é coerente com a coluna do meio fixa em um terço |
| Deslogado es a 1280: `scrollWidth` 1304, só "Registrarse" além da borda (`docs/features/date-input-navigation/test/report.md:155-156`) | confere. A medição anterior, com outro conteúdo de página, deu 1293 (`date-input-locale/test/report.md:148`) |
| Logado a 1280 +5, a 1024 +29, a 1440 nenhuma (`i18n-hydration-admin-delete-billing/test/report.md:310-313`) | confere. Detalhe do relatório: "Sign Out" termina em x = 1270 com a área útil em 1265, ou seja, a janela tinha barra de rolagem vertical de 15 px |
| "o que sai da barra continua no menu (`:268-300`)" | o menu (`:268-313`) só tem os itens de navegação. Idioma, tema, entrar, sair e o link do painel ficam escondidos abaixo de `md` e não estão no menu. Isso já é assim a 390 px e não muda aqui, porque esta tarefa não tira nada da barra. Fica como achado (§1.4) |
| Dicionário do header já existe e não tem chave reutilizável | confere. Nenhuma chave "Menu"/"Abrir menu" no pacote; a mais próxima é `apps.app.shared…triggerLabel` ("Abrir menu do perfil"), de outro componente |

### 1.3 Medição por leitura: por que estoura e por que a grade nova cabe

Sem navegador, a conta usa as larguras que os relatórios mediram e as classes do arquivo. Janela de 1024 px
sem barra de rolagem: o header tem `md:px-2`, então o contêiner mede 1008 px; com `gap-4` entre as três colunas,
cada terço mede (1008 − 32) / 3 ≈ 325 px. O estouro medido diz quanto o grupo da direita precisa:

| Caso | Terço disponível | Estouro medido | Grupo da direita precisa de |
|------|------------------|----------------|-----------------------------|
| deslogado pt-br, 1024 | ~325 | +6 | ~331 |
| deslogado es, 1024 | ~325 | +49 | ~374 |
| logado en, 1024 (com barra de rolagem: 1009 px) | ~320 | +29 | ~349 |
| logado en, 1280 (com barra de rolagem: 1265 px) | ~406 | +5 (até x = 1270) | ~419 |
| deslogado es, 1280 | ~411 | +32 (até x = 1304) | ~443 |

Com `1fr minmax(0, auto) 1fr`, a coluna do meio fica do tamanho da marca (avatar de 18 px, `gap-2` e o nome; ~156 px
com `next-boilerplate`) e as laterais dividem o resto. Cada lateral passa a ter, a 1024 px,
(1008 − 32 − 156) / 2 ≈ 410 px (≈ 402 com barra de rolagem), e a 1280 px, (1264 − 32 − 156) / 2 ≈ 538 px. O
maior caso medido em cada largura cabe: 374 em 410 e 443 em 538. A navegação da esquerda (três links,
~290 px em es) também cabe, então as duas laterais ficam iguais e a marca segue no centro da barra.

As colunas laterais são `1fr`, isto é, `minmax(auto, 1fr)`: nunca ficam menores que o próprio conteúdo. A do
meio é `minmax(0, auto)`: recebe o tamanho da marca quando sobra espaço e pode encolher até zero quando não
sobra. Com o `lg:truncate` no nome, o que encolhe é a marca, com reticências, e não a página.

Estimativa para os casos fora das medições, com folga de erro de ±20 px nas larguras de texto:

| Caso | Esquerda | Direita | Marca | Cabe sem encolher a marca? |
|------|----------|---------|-------|-----------------------------|
| es, 1024, link de documentação ligado | ~429 | ~374 | 156 | sim, por ~17 px; a marca sai um pouco do centro |
| es, 1024, nome de 30 caracteres | ~286 | ~374 | ~281 | sim, por ~35 px |
| es, 1024, documentação e nome de 30 caracteres | ~429 | ~374 | ~281 | não; o nome encolhe ~110 px, a página não rola |
| es, 1280, documentação e nome de 30 caracteres | ~429 | ~443 | ~281 | sim |

Os números do link de documentação e do nome longo são estimativa por leitura, não medição. O `/test` mede os
casos da configuração padrão (critério) e, se houver tempo, um build com documentação e nome longo
(informativo, §9 item 6).

### 1.4 Objetivo e corte

Corte de MVP:

1. O botão do menu tem nome acessível do dicionário nos três idiomas e `aria-expanded` igual a `isOpen`.
2. Em 1024, 1280 e 1440 px, logado e deslogado, nos três idiomas, com a configuração padrão do repositório,
   `document.documentElement.scrollWidth` é igual à largura útil da janela.
3. Nenhum item sai do header e nenhum muda de visibilidade: todo link que aparece hoje em cada largura continua
   aparecendo.
4. Abaixo de 1024 px (768 e 390), o header fica como hoje, e o menu abre e fecha.

Fora do corte, só citados (viram achados no backlog):

- **O menu do celular só tem navegação.** Abaixo de `md` não há como trocar idioma ou tema, entrar (só
  cadastrar aparece), sair ou ir ao painel pelo header. Já existe e já foi medido (a 390 px, no
  `ui-strings-and-password-focus/test/report.md:215`). Decidir o que entra no menu é decisão de produto (§11, P2).
- **O menu não fecha ao navegar nem com Esc.** Os links do menu (`:274-308`) não chamam `setOpen(false)`; como o
  header vive no layout, o menu deve continuar aberto na página nova. Não medido; o `/test` registra o que vir
  (§9 item 4).
- **`aria-controls` no botão.** O painel só existe no DOM quando aberto (`:268`), então o atributo apontaria
  para um `id` ausente com o menu fechado. O nome e o `aria-expanded` resolvem o WCAG 4.1.2 sem ele.
- **Configurações extremas** (documentação ligada, nome de marca longo e idioma longo a 1024 px): a página não
  rola, mas a marca encolhe com reticências (§1.3).

### 1.5 Apps impactados

| App/pacote | Impacto |
|------------|---------|
| `apps/web` | `<header>` (botão do menu, grade, marca); 1 teste novo |
| `packages/internationalization` | `<i18n-header>`: chave `menu` nos três idiomas |
| `apps/app`, `apps/api`, `packages/sdk`, `packages/design-system`, demais | nenhum |

Área: landing pública. Modo de produto: o link do painel só aparece em `subscription` com `NEXT_PUBLIC_APP_URL`
(`<header>:44-47`), e é o caso logado medido. Plano: indiferente.

### 1.6 Fontes

`specs/BACKLOG.md:323-358`; `docs/features/brand-config/test/report.md:162-164`;
`docs/features/date-input-navigation/test/report.md:155-156`;
`docs/features/date-input-locale/test/report.md:148`;
`docs/features/i18n-hydration-admin-delete-billing/test/report.md:300-313`;
`docs/features/ui-strings-and-password-focus/test/report.md:215`. Nenhuma referência inacessível.

## 2. Dados (Firestore)

N/A.

## 3. Contrato `@repo/sdk`

N/A.

## 4. API

N/A. Nenhum `error.code` novo.

## 5. Front-end

### 5.1 Botão do menu

```tsx
<Button
    aria-expanded={isOpen}
    aria-label={dictionary.components.header.menu}
    onClick={() => setOpen(!isOpen)}
    variant="ghost"
>
```

O `Button` do design system repassa os dois atributos pelo `{...props}`. Os ícones do `lucide-react` 0.548 saem
com `aria-hidden="true"`, então o nome vem só do `aria-label`. O `Button` também foi alterado no working tree por
`form-field-focus-and-names`; o caminho sem `loading` não mudou lá, e este botão não usa `loading`.

### 5.2 Grade da barra cheia

`<header>:84`: `lg:grid-cols-3` → `lg:grid-cols-[1fr_minmax(0,auto)_1fr]`. O Tailwind 4 converte os `_` em
espaços dentro do valor arbitrário. O `lg:grid` continua, e abaixo de `lg` o contêiner segue `flex`, como hoje.

`<header>:186`: `whitespace-nowrap font-semibold` → `whitespace-nowrap font-semibold lg:truncate`. O
`lg:truncate` só vale na grade; abaixo de `lg` a marca fica exatamente como hoje. Na grade, o `p` é item flex
do `div` da marca (`:167`) e, com `overflow: hidden`, pode encolher; o avatar já é `shrink-0`
(`packages/design-system/components/ui/avatar.tsx:17`).

As colunas laterais não mudam: o grupo da direita continua `flex w-full justify-end gap-4`, e a navegação
continua com os mesmos itens.

### 5.3 Estados

| Estado | Como produzir | Esperado |
|--------|---------------|----------|
| visitante, 1024/1280/1440 | `/pt-br`, `/en`, `/es` sem sessão | sem rolagem lateral; marca no centro |
| logado, 1024/1280/1440 | entrar na web com uma conta do seed, modo `subscription` com `NEXT_PUBLIC_APP_URL` | "Ir para o painel" e "Sair" visíveis, sem rolagem lateral |
| 768 | qualquer idioma | header como hoje: marca, grupo da direita e botão do menu |
| 390, menu fechado | qualquer idioma | botão "Menu"/"Menú", `aria-expanded="false"` |
| 390, menu aberto | tocar no botão | `aria-expanded="true"`, links de navegação visíveis; tocar de novo fecha |

## 6. i18n

Uma chave nova em `<i18n-header>`, na raiz de cada idioma, depois de `goToPanel`:

| Chave | pt-br | en | es |
|-------|-------|----|----|
| `components.header.menu` | `Menu` | `Menu` | `Menú` |

Sem entrada em `apiErrors`. A paridade é coberta por `packages/internationalization/__tests__/parity.test.ts`.
O `/develop` usa a skill `i18n-sync` para incluir a chave.

## 7. Autorização e segurança

N/A. O header não muda o que cada perfil vê. A grade não afeta o link do painel, que continua dependendo de
`isSubscriptionMode()` e de `NEXT_PUBLIC_APP_URL`.

## 8. Testes

### 8.1 `apps/web/__tests__/headerMenuButton.test.tsx` (novo, SSR em `node`)

Mesmos mocks do `headerInteractiveNesting.test.tsx:5-53` (`@repo/auth/provider`, `@/env`,
`@/shared/lib/client`, `@repo/next-config/product-mode`, `useMediaQuery`, `next/link`), com `useParams`
lendo um `params.locale` içado, como no `languageSwitcher.test.tsx:6-14`, e `renderToString` dentro do
`LocaleProvider`. A `apps/web` roda em `environment: "node"` (`apps/web/vitest.config.mts`) e não declara jsdom
nem Testing Library, então o teste fica em SSR.

| # | Caso | No código atual |
|---|------|-----------------|
| M1 | `it.each(locales)`: o HTML tem um `<button` com `aria-label` igual a `globalTranslations[locale].components.header.menu` e `aria-expanded="false"` | reprova (sem nome e sem estado) |
| M2 | os valores da chave são os literais `Menu`, `Menu` e `Menú` | reprova (a chave não existe) |
| M3 | o HTML não tem nenhum `<button` sem nome entre os botões do header: todo `<button` tem `aria-label` ou texto (o gatilho de idioma tem o `span.sr-only`) | reprova (o botão do menu) |

`aria-expanded="true"` depois do clique não é provado aqui: o SSR só renderiza o estado inicial, e o atributo
vem direto de `isOpen`. O `/test` confere no navegador os dois valores.

### 8.2 Regressão que deve seguir verde

`headerInteractiveNesting.test.tsx` (o botão continua um `<button>` sem link dentro), `languageSwitcher.test.tsx`,
`brandSurfaces.test.tsx` (lê a marca no header; a classe nova não muda o texto), `parity.test.ts` e o resto da
suíte da web.

Mutação a registrar no handoff: M1, M2 e M3 reprovam com o código atual.

O layout não ganha teste automatizado. O Playwright da `apps/e2e` é a rede de regressão dos fluxos e, pela regra
de ouro 11, não julga responsivo; a medição é do `/test`.

## 9. O que o `/test` vai percorrer

Web em `build && start`, API e emuladores com `pnpm seed`, modo `subscription` com `NEXT_PUBLIC_APP_URL` (para
o caso logado). Medir com `document.documentElement.scrollWidth` contra `document.documentElement.clientWidth`
(a largura útil, que desconta a barra de rolagem vertical quando ela existe) e anotar as duas.

1. **Larguras**: 1024, 1280 e 1440 px; `/pt-br`, `/en`, `/es`; visitante e logado; claro e escuro. Em cada
   combinação, `scrollWidth === clientWidth`. Anotar o x da borda direita do último botão do header e o centro
   da marca contra o centro da janela.
2. **Regressão abaixo de `lg`**: 768 e 390 px, três idiomas. Os mesmos itens visíveis de hoje e sem rolagem
   lateral.
3. **Botão do menu**: a 390 px e a 768 px, na árvore de acessibilidade, o botão se chama "Menu"/"Menu"/"Menú" e
   tem `aria-expanded="false"`; tocar abre o menu e muda para `true`; tocar de novo fecha e volta a `false`. Pelo
   teclado: Tab até o botão, Enter abre, Enter fecha.
4. **Menu ao navegar** (informativo, fora do corte): abrir o menu, seguir um link e anotar se ele continua aberto
   na página nova.
5. **Itens alcançáveis**: em cada largura, listar os links e botões visíveis do header e comparar com a lista
   de hoje (o `HEAD` antes do diff). Nada pode sumir.
6. **Configuração extrema** (informativo, se houver tempo): build com `NEXT_PUBLIC_DOCS_URL` e um
   `NEXT_PUBLIC_APP_NAME` de 30 caracteres, em es a 1024 e a 1280. Esperado pela §1.3: sem rolagem lateral, com a
   marca encolhida a 1024. Valores `NEXT_PUBLIC_*` entram no build, então isso pede outro `build`.
7. **axe**: a suíte E2E (`pnpm e2e`) sem regra nova, com a `A11Y_ALLOWLIST` vazia
   (`apps/e2e/a11y/allowlist.ts:20`).

Nada depende de infra externa; nada fica 🔒.

## 10. Critérios de aceite

- [ ] **Botão do menu com nome e estado**
  O botão que abre o menu do header da web se chama "Menu" em pt-br e en e "Menú" em es, vindo do dicionário,
  e anuncia `aria-expanded="false"` fechado e `aria-expanded="true"` aberto. Tocar ou apertar Enter alterna o
  menu e o atributo junto. O nome não muda com o estado; quem informa aberto ou fechado é o `aria-expanded`.

- [ ] **Sem rolagem lateral de 1024 a 1440 px**
  Em 1024, 1280 e 1440 px, visitante e logado, em pt-br, en e es, com a configuração padrão do repositório,
  `document.documentElement.scrollWidth` é igual à largura útil da janela. Inclui os casos que hoje estouram:
  es visitante a 1280 (hoje 1304), es e pt-br visitante a 1024 (hoje +49 e +6) e logado a 1024 e 1280 (hoje +29
  e +5).

- [ ] **Marca centralizada e nada removido**
  Nas mesmas larguras, a marca fica no centro da barra (diferença abaixo de 2 px entre o centro dela e o da
  janela) e todo link ou botão que o header mostra hoje em cada largura continua visível. Nenhum item muda de
  visibilidade e nenhum vai para o menu.

- [ ] **Abaixo de 1024 px nada muda**
  A 768 e a 390 px o header tem os mesmos itens de hoje, sem rolagem lateral, e o menu abre e fecha pelo botão.
  O nome da marca não encolhe abaixo de 1024 px.

- [ ] **Configuração extrema sem rolagem** (informativo)
  Com o link de documentação ligado e um nome de marca de 30 caracteres, em es a 1024 px, a página não rola de
  lado; o nome pode aparecer com reticências. Não reprova a entrega se o `/test` não tiver tempo de gerar o
  build com essa configuração.

- [ ] **Tema, testes e gates**
  Claro e escuro sem diferença de layout. Os casos M1, M2 e M3 reprovam no código anterior e passam no novo.
  `pnpm check`, o `typecheck` da web, a suíte da web, a de internacionalização (paridade) e o `pnpm e2e` passam,
  com o axe sem regra nova.

## 11. Perguntas em aberto

Todas já vêm com a opção adotada; mudar qualquer uma é barato e localizado.

| # | Pergunta | Opções | Adotada e por quê |
|---|----------|--------|-------------------|
| P1 | Como corrigir a rolagem? | (a) grade `1fr minmax(0,auto) 1fr` com a marca truncável; (b) barra cheia só a partir de `xl` (1280), com navegação no menu entre 1024 e 1279; (c) recolher idioma e tema no menu entre 1024 e 1279 | (a). É a menor mudança que cabe em todas as medições: a coluna do meio deixa de reservar um terço da barra para ~156 px de marca. A marca continua no centro e ninguém perde a navegação em telas de 1024 a 1279. (b) também cabe e é mais folgado, mas tira a navegação da barra em toda tela de notebook nessa faixa. (c) obriga a pôr no menu itens que ele não tem hoje |
| P2 | O menu do celular deve ganhar idioma, tema, entrar, sair e o link do painel? | (a) não nesta tarefa; (b) sim | (a). É lacuna antiga, de produto, e independe da rolagem. Fica como achado |
| P3 | Nome do botão fixo ou variando com o estado? | (a) fixo "Menu", com `aria-expanded`; (b) "Abrir menu"/"Fechar menu" | (a). É o padrão de disclosure da WAI-ARIA; com (b) mais `aria-expanded`, o leitor de tela anuncia o estado duas vezes ("Fechar menu, expandido"). A recomendação aceita as duas formas |

## 12. Decisões tomadas sem perguntar

| # | Decisão | Alternativa descartada | Motivo |
|---|---------|------------------------|--------|
| D1 | Grade `lg:grid-cols-[1fr_minmax(0,auto)_1fr]` | `1fr auto 1fr` | com `auto`, a coluna do meio nunca encolhe abaixo do nome da marca, e uma configuração extrema volta a rolar a página |
| D2 | `lg:truncate` no nome da marca | `truncate` em todas as larguras | abaixo de `lg` o header não muda, e o critério 4 pede isso |
| D3 | Teste SSR em `node` | jsdom com `// @vitest-environment jsdom` e Testing Library | a `apps/web` não declara essas dependências; elas só resolvem pelo `public-hoist-pattern[]=*` do `.npmrc`. Usar dependência fantasma ou declarar uma nova não compensa para provar um atributo que vem direto de `isOpen` |
| D4 | Sem `aria-controls` | `aria-controls` apontando para o painel | o painel não existe no DOM fechado (§1.4) |
| D5 | Chave `menu` na raiz de `components.header` | folha nova em `components/ui/` | o botão é do header da web e o dicionário dele já existe; não há outro consumidor |
| D6 | Sem teste de layout no Playwright | um `scrollWidth` por largura no `apps/e2e` | a suíte E2E não julga responsivo (regra de ouro 11); o `/test` mede |

## 13. Blueprint técnico

### 13.1 `<header>`

```diff
-            <div className="container relative mx-auto flex min-h-20 flex-row items-center gap-4 lg:grid lg:grid-cols-3">
+            <div className="container relative mx-auto flex min-h-20 flex-row items-center gap-4 lg:grid lg:grid-cols-[1fr_minmax(0,auto)_1fr]">
 ...
-                    <p className="whitespace-nowrap font-semibold">
+                    <p className="whitespace-nowrap font-semibold lg:truncate">
                         {brand.name}
                     </p>
 ...
                 <div className="flex w-12 shrink items-end justify-end lg:hidden">
-                    <Button onClick={() => setOpen(!isOpen)} variant="ghost">
+                    <Button
+                        aria-expanded={isOpen}
+                        aria-label={dictionary.components.header.menu}
+                        onClick={() => setOpen(!isOpen)}
+                        variant="ghost"
+                    >
```

O `pnpm fix` acerta a ordem das classes que o Biome exigir.

### 13.2 `<i18n-header>`

```diff
         signOut: "Sair",
         goToPanel: "Ir para o painel",
+        menu: "Menu",
     },
     en: {
 ...
         goToPanel: "Go to panel",
+        menu: "Menu",
     },
     es: {
 ...
         goToPanel: "Ir al panel",
+        menu: "Menú",
     },
```

### 13.3 Árvore de arquivos

```
apps/web/
  app/[locale]/components/header/index.tsx      (editado)
  __tests__/headerMenuButton.test.tsx           (novo)
packages/internationalization/
  translations/components/header/index.ts       (editado, 1 chave × 3 idiomas)
```

### 13.4 `contends_on`

- `apps/web/app/[locale]/components/header/index.tsx`

A folha `<i18n-header>` é aditiva. Nenhum dos dois arquivos está alterado no working tree das outras duas
tarefas, e nenhuma spec viva os declara.

### 13.5 Ordem de implementação

1. `<i18n-header>` com a chave nova (antes do código, para o `typecheck` da web passar).
2. `<header>`: botão, grade e marca.
3. `headerMenuButton.test.tsx`.
4. `pnpm check`, `pnpm --filter web typecheck`, `pnpm --filter web test` e a suíte de
   `@repo/internationalization`.

### 13.6 Env

Nenhuma variável nova.

## 14. Pré-requisitos manuais de infra

Nenhum. Nada vai para o `docs/PRE-PRODUCTION.md`.

## 15. Plano de commits (soma ao consolidado da PR)

O plano consolidado está em `docs/features/form-field-focus-and-names/review/review.md:230-290` (13 commits). Os
desta tarefa entram depois dos commits da app e da web que já existem, e o `docs(features)` desta vai por
último. Conferir `git diff --cached --stat` vazio antes do primeiro commit.

| Posição | Commit | Arquivos |
|---------|--------|----------|
| 1 a 9 | como no consolidado (design system, app, `fix(web)` do contato) | sem mudança |
| 10 | `fix(web): name the mobile menu button and keep the header within the viewport` | `<header>`, `apps/web/__tests__/headerMenuButton.test.tsx` |
| 11 | `fix(internationalization): add the header menu button label` | `<i18n-header>` |
| 12 | `docs: document the date input month and year selector and the radio group label` | (o antigo 10) |
| 13 | `docs(specs): audit the backlog after PR #44` | (o antigo 11) |
| 14 | `docs(features): date-input-navigation` | (o antigo 12) |
| 15 | `docs(features): form-field-focus-and-names` | (o antigo 13) |
| 16 | `docs(features): web-header-reflow-and-menu-name` | `docs/features/web-header-reflow-and-menu-name/` |

Os commits 10 e 11 seguem a ordem da regra (app/web antes do i18n). O 10 sozinho não passa no `typecheck`,
porque a chave só existe a partir do 11; é a mesma situação de todo commit de app que usa chave nova neste
repositório. Se o `/review` preferir cada commit compilando, inverte os dois.

Título de PR sugerido para as três tarefas: `fix: date pickers, form fields and web header accessibility`.
