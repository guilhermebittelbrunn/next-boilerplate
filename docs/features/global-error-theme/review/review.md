# Revisão: global-error-theme

Rodada autônoma do `/cycle`. Escopo: `apps/app/app/global-error.tsx`, `apps/web/app/global-error.tsx` e os dois
`globalErrorLocale.test.tsx`. O working tree também carrega a `web-auth-forms` (revisada e testada, não revisada de
novo aqui) e a auditoria do backlog em `specs/`. As duas entram só no plano de commits unificado.

## Branch

- **Resolvida:** `fix/auth-forms-and-global-error-theme`, criada com `git switch -c` a partir do HEAD da
  `web/fix/auth-forms` (`af763bb`, igual a `origin/main`). O working tree veio junto, e `git diff --cached --stat` saiu
  vazio depois da troca.
- **Por que outra branch:** a `web/fix/auth-forms` nomeava uma tarefa só da `apps/web`. Agora o diff leva também
  `apps/app` e `specs/`. Com mais de um app, a regra de `.claude/rules/git-commits.md` é omitir o `project`. A PR #54
  levou duas tarefas diretas numa branch só e saiu com título `fix: …`, sem projeto; esta segue o mesmo caminho.
- **A antiga:** não foi renomeada, como pedido. Ela aponta para `af763bb`, não tem commit próprio
  (`git log origin/main..HEAD` vazio) nem upstream. Pode ser apagada com `git branch -d web/fix/auth-forms` depois dos
  commits.
- **Validação do nome:** regex do passo 3 de `.claude/commands/review.md` → `branch OK: fix/auth-forms-and-global-error-theme`.

## Revisão: global-error-theme

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `apps/app/__tests__/globalErrorLocale.test.tsx:46-54` e `apps/web/__tests__/globalErrorLocale.test.tsx:46-54`: sem
  `<script>` no HTML renderizado, o `runThemeScript` executava `new Function("")` e o caso caía mais adiante num
  `expected false to be true` que não dizia o motivo. **Corrigido**: a função lança
  `"The rendered screen carries no theme script"` quando o script não existe e só então executa o conteúdo.
- `apps/app/app/global-error.tsx:30`: a tela não lê o cookie `x-theme`, que o root layout usa para pintar a primeira
  tela (`apps/app/app/layout.tsx:32-38`, `:70-74`). Quem tem o cookie e não tem `localStorage.theme` vê o tema do
  sistema aqui. É o R4 e a D3 do plano, aceitos lá. Sem ação.

### ✅ OK

- **`new Function` no teste é aceitável**, e não achei forma mais simples que prove a mesma coisa:
  - o Biome com o preset do Ultracite não tem regra ligada para `new Function` (o `noGlobalEval` cobre só `eval`), e
    `pnpm check` passa nos 971 arquivos sem supressão;
  - a entrada é o HTML que o próprio componente acabou de renderizar, sem dado externo, e o código só existe no teste;
  - `new Function` roda no escopo global, então `document`, `localStorage` e `window.matchMedia` do script resolvem
    para os globais do `jsdom`, que é o que o teste precisa;
  - as alternativas são piores. Comparar a string `"class","theme","system"` (a D7 original) não prova E1 a E4.
    Anexar um `<script>` ao DOM depende do `runScripts` do ambiente `jsdom` e continua sendo avaliação de código, só
    menos explícita. A função do script não é exportada pelo `next-themes` 0.4.6 (o `dist/index.mjs` exporta só
    `ThemeProvider` e `useTheme`).
- **E1 a E4 no estado final, confirmados por leitura do `next-themes` 0.4.6** (`packages/design-system/node_modules/next-themes/dist/index.mjs`),
  nos dois caminhos:
  - script inline (SSR): lê `localStorage.getItem("theme") || "system"`, resolve `system` por
    `matchMedia("(prefers-color-scheme: dark)")`, troca a classe e põe `style.colorScheme`;
  - cliente, que é o caminho medido no build de produção pelo `/develop`: o `useState` lê o mesmo `localStorage` ao
    montar, e o `useEffect` aplica a classe e o `color-scheme` com a mesma regra. A classe certa chega depois da
    montagem, e o quadro antes disso fica para o `/test` (abaixo).
- Chave do tema: o padrão `storageKey` do `next-themes` é `"theme"`, a mesma de `THEME_STORAGE_KEY`
  (`apps/app/shared/lib/themePreference.ts:17`). O teste da app amarra as duas porque grava com `storeActiveTheme`
  (`apps/app/__tests__/globalErrorLocale.test.tsx:104`).
- `ThemeProvider` em vez de `DesignSystemProvider`: o segundo traz `AuthProvider`, antd e toasts
  (`packages/design-system/index.tsx:42-51`), que a tela não usa.
- CSS: `apps/app/app/styles.css` existe ao lado da tela; na web, `apps/web/app/` não tem CSS na raiz, e
  `./[locale]/styles.css` é o mesmo arquivo do root layout (`apps/web/app/[locale]/layout.tsx:1`).
- `suppressHydrationWarning` está no `<html>` (`:28` nas duas telas), não no `<body>`. Cobre o R2 quando a tela vier
  do servidor.
- Layout no molde do `NotFoundPage` (`apps/app/shared/components/ui/NotFoundPage.tsx:21-47`): mesmas classes de
  contêiner, card, título e botão. `<h1>` no lugar do `CardTitle` (uma `div`) mantém o título da página.
- Sem detalhe do erro: as duas telas desestruturam só `reset` (`:20`), então `error.message` e `digest` não chegam ao
  JSX.
- i18n: nenhuma string nova; `title` e `retry` vêm de `apps.app.pages.common.globalError` e `apps.web.pages.error`.
  Paridade não remedida: o diff não toca `packages/internationalization`.
- Comentários: o do `global-error.tsx` explica uma restrição do Next (a tela substitui o root layout) e o do stub de
  `matchMedia` explica uma lacuna do `jsdom`. Nenhum cita o fluxo.
- Contagem de casos: app 3 + 1 + 4 = 8, web 3 + 1 + 1 + 4 = 9, como o handoff diz. O critério "Testes e gates" do
  rascunho do plano (5 e 6) precisa usar 8 e 9.
- Fora do diff e fora de escopo: `apps/api/app/global-error.tsx:22` tem `Tentar novamente` fixo no JSX. Não mexi.

### 👁 Verificar no `/test`

Em ordem de risco. As três primeiras sustentam o corte.

1. **F1 reescrito, CSS na tela, nas duas apps.** O `/develop` mediu o payload só na web; a app não foi medida com o
   `throw`. Repro: `throw` depois do `Promise.all` do root layout, `build` + `next start`, abrir `/pt-br` no
   navegador e, depois da montagem, `[...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href)` com o CSS
   do app. Na app, repetir também o `curl` e conferir o `preload` no `<head>` e a entrada `"G"` com o CSS.
2. **F2, E1 a E4 no navegador, nas duas apps.** A leitura confirma a regra; o `/test` mede o resultado:
   `document.documentElement.className`, `style.colorScheme` e o `background-color` do `<body>`, com
   `localStorage.theme` e `set media dark|light` como na §8.2 do plano.
3. **Quadro claro antes do escuro em E2 e E3.** No caminho do cliente a classe vem de um `useEffect`, que roda depois
   do commit. Isso vale também para erro que acontece depois da hidratação: o React reaproveita o `<html>`, troca o
   `className` do layout pelo `fonts` da tela (o que tira o `dark`) e só o efeito do provider põe a classe de volta.
   Repro: sistema escuro, recarregar a tela de erro e gravar o primeiro paint (performance trace ou screenshot logo
   no `load`). Se aparecer, registrar; o critério cobra o estado final.
4. **F6, console em build de produção.** Aviso de hidratação no `<html>` e o aviso do React 19 sobre `<script>`
   renderizado no cliente (o `next-themes` 0.4.6 renderiza um `<script>` com `dangerouslySetInnerHTML`). Repro:
   console aberto, carregar a tela com o `throw`, filtrar por `hydrat` e `script`.
5. **CSS extra nas páginas normais.** O `"G"` entra no payload de toda página. Se o chunk de CSS da tela não for o
   mesmo do layout, toda página passa a baixar um CSS a mais. Repro, sem `throw`: em `/pt-br` das duas apps, conferir
   que todo `href` de CSS da entrada `"G"` do payload também aparece entre os CSS que o layout carrega
   (`curl -s … | grep -o '/_next/static/[^"]*\.css' | sort -u`).
6. **F3 mobile, F4 botão e F5 idiomas**, como no plano. Geist no `<h1>`, fundo do token e botão do design system só
   foram vistos como classes no CSS gerado da web, nunca medidos na tela.

## Correções aplicadas

| arquivo | mudança |
|---------|---------|
| `apps/app/__tests__/globalErrorLocale.test.tsx:46-54` | `runThemeScript` lança erro quando o HTML não tem `<script>`; antes rodava `new Function("")` |
| `apps/web/__tests__/globalErrorLocale.test.tsx:46-54` | o mesmo |

Fora do código: `docs/features/web-auth-forms/STATE.md` (`branch:` e uma nota) e uma linha no plano de commits de
`docs/features/web-auth-forms/review/review.md` apontando para o plano unificado. A revisão daquela tarefa não mudou.

## Raio de impacto

Nenhum símbolo público alterado. As duas telas são arquivos de convenção do Next, sem import externo. O
`ThemeProvider` e os componentes `Card`/`Button` do design system são só consumidos. Os testes importam
`storeActiveTheme` sem alterá-lo.

## Lacunas de teste

| lacuna (do handoff) | veredito |
|---------------------|----------|
| O Vitest não prova que o CSS chega à tela (o CSS vira string vazia) | continua aberta; fecha no F1 do `/test` |
| O clique em "Tentar novamente" (`reset()`) sem teste de unidade | continua aberta; fecha no F4. Clicar exige montar `<html>` no cliente, fora do corte |
| O teste executa o script do SSR e não o efeito do provider no cliente | continua aberta; o F2 mede o estado final no navegador. Um teste de cliente provaria o `next-themes`, não a tela |
| Script ausente passava em silêncio até a asserção da classe | fechada aqui (correção acima) |

## Decisões em aberto

Nenhuma bloqueante.

- Apagar a `web/fix/auth-forms` local depois dos commits (`git branch -d`). Recomendação: apagar, porque não tem
  commit próprio nem remoto.

## Gates

| gate | comando | resultado |
|------|---------|-----------|
| lint | `pnpm check` | 971 arquivos, nenhum ajuste, exit 0 |
| typecheck app | `pnpm --filter app typecheck` | exit 0 |
| typecheck web | `pnpm --filter web typecheck` | exit 0 |
| paridade de i18n | não rodado | o diff não toca `packages/internationalization` |

Sem `--force`. A suíte não foi rodada aqui; a última medição é a do handoff (app 979, web 207), antes da correção do
`runThemeScript`, que o `/test` remede.

Varredura por segredo em `docs/features/global-error-theme/` e `docs/features/web-auth-forms/`: nenhuma senha, token ou
chave; os e-mails são todos `@example.com`. Os prints de `docs/features/web-auth-forms/test/e2e/` são descartados pelo
`.gitignore:300`.

## Plano de commits

Substituído pelo plano unificado de `docs/features/app-sign-up-copy/review/review.md`, que acrescenta os três commits
daquela tarefa e o `docs(features)` dela. Os commits abaixo continuam lá, com a mesma mensagem e os mesmos arquivos.

Branch `fix/auth-forms-and-global-error-theme`. Antes do primeiro, `git diff --cached --stat` vazio. Depois de cada um,
`git show --stat --oneline HEAD` conferido contra a lista.

1. `fix(web): send signed-in visitors home from the sign-in form`
   - `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx`
   - `apps/web/__tests__/signInFormRedirect.test.tsx`
   - Corpo: o arquivo também leva o `noValidate` e o `px-4 md:px-2` do login; separar exigiria `git add -p`.
2. `fix(web): request the verification e-mail after a landing sign-up`
   - `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx`
   - `apps/web/__tests__/signUpFormApi.test.tsx`
   - `apps/web/__tests__/signUpFormSubmitLock.test.tsx`
   - `apps/web/__tests__/signUpFormValidation.test.tsx`
   - Corpo: o arquivo leva o `noValidate` e o recuo do cadastro; o `signUpFormSubmitLock` e o `signUpFormValidation`
     cobrem o `noValidate`.
3. `fix(app): style and theme the global error screen`
   - `apps/app/app/global-error.tsx`
   - `apps/app/__tests__/globalErrorLocale.test.tsx`
4. `fix(web): style and theme the landing global error screen`
   - `apps/web/app/global-error.tsx`
   - `apps/web/__tests__/globalErrorLocale.test.tsx`
5. `docs(specs): reconcile the backlog after PR #54`
   - `specs/BACKLOG.md`
   - `specs/account-security-mfa.md`
   - `specs/observability-logging.md`
6. `docs(features): web-auth-forms`
   - `docs/features/web-auth-forms/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`, `review/review.md`,
     `test/criterios-aceite.md`, `test/report.md`; os PNG de `test/e2e/` ficam de fora pelo `.gitignore`)
7. `docs(features): global-error-theme`
   - `docs/features/global-error-theme/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`, `review/review.md` e o
     que o `/test` gravar)

Título de PR sugerido: `fix: landing auth forms and themed global error screens`.

### Commits realizados

(preenchido pelo orquestrador depois de commitar)
