# Revisão — consentimento de cookies e Consent Mode

Diff revisado em 2026-09-16, rodada autônoma do `/cycle`. Escopo: `packages/analytics`,
`packages/design-system`, `packages/shared`, `packages/internationalization`, `apps/app`, `apps/web`,
mais dois assuntos que vieram junto na árvore de trabalho (auditoria do backlog e remoção de um cron órfão
em `apps/api/vercel.json`).

A revisão teve duas rodadas. A segunda entrou depois de o `/test` achar, na `apps/web`, o mesmo defeito de
sobreposição que a primeira já tinha corrigido na `apps/app`. O registro dessa falha de escopo está na
seção "O que a primeira medição deixou passar".

## Branch

| item | valor |
|---|---|
| branch | `feat/cookie-consent` |
| origem | criada a partir de `dublin`, que estava exatamente em `origin/main` (0 à frente, 0 atrás) |
| criada ou reutilizada | criada |
| validação do nome | passou no regex do padrão |

A branch anterior, `dublin`, reprova no regex de `.claude/rules/git-commits.md`: não tem `type` e não tem
`title`. Ela não tinha remoto nem commit próprio, então a árvore de trabalho migrou inteira com
`git switch -c`.

O nome vai sem prefixo de projeto porque a entrega cobre dois apps e quatro pacotes. O padrão reserva
`feat/<title>` exatamente para esse caso.

## Achados

### 🔴 Bloqueante

- **O banner tornava o cadastro inalcançável na primeira visita.** `apps/app/app/[locale]/(unauthenticated)/layout.tsx:19`
  usava `h-dvh`, então a página de login nunca rolava, e o card opaco do banner cobria a parte de baixo do
  formulário. Medido com `elementFromPoint` no centro de cada alvo, antes da correção:

  | viewport | Continuar com Google | Esqueci minha senha | Cadastrar | rolagem |
  |---|---|---|---|---|
  | 1280×800 | alcançável (topo 534) | **bloqueado** (topo 604) | **bloqueado** (topo 632) | `scrollHeight` 800 = viewport |
  | 390×844 | **bloqueado** (topo 556) | **bloqueado** (topo 626) | **bloqueado** (topo 654) | `scrollHeight` 844 = viewport |

  Sem o banner, o login funciona; com ele, não. O defeito nasceu nesta entrega, e atinge a primeira visita
  de todo usuário de todo fork, que é exatamente quando o banner aparece. **Corrigido.**

### 🟡 Atenção

- **O card do banner cobria os links do rodapé da `apps/web` no fim da rolagem.** Achado pelo `/test` e
  confirmado aqui. Repro: `/pt-br` sem o cookie `bp:cookie-consent`, rolar até o fim, clicar em "Política
  de Privacidade". Para separar o defeito da correção, neutralizei a folga no próprio navegador
  (`footer.style.paddingBottom = '0px'`) e remedi:

  | viewport | Início | Preços | Política de Privacidade | Termos de Uso |
  |---|---|---|---|---|
  | 390×844 | **bloqueado** (topo 520) | **bloqueado** (topo 624) | **bloqueado** (topo 724) | **bloqueado** (topo 756) |

  Em todos os quatro o nó no ponto estava dentro de `[data-cookie-banner]`, ou seja, era o card opaco, não
  a faixa transparente. O `pointer-events` da primeira rodada continua funcionando.

  Menos grave que o do login: a landing rola, a condição some com um clique e a política de privacidade
  segue alcançável pelo link de dentro do próprio banner. Ainda assim são links de rodapé inalcançáveis na
  primeira visita de todo fork, na página que existe para converter, e dois deles são os links legais.
  **Corrigido.**

  O `/test` descartou um falso positivo com cuidado, e confirmei: o item "Preferências de cookies" acusa
  bloqueio por `NEXTJS-PORTAL`, o distintivo de desenvolvimento do Next, que não existe em produção. Ele
  aparece com e sem banner, e com e sem a correção. Não conta.

- `packages/design-system/components/ui/cookie-consent.tsx:115` — o `<section>` do banner é
  `fixed inset-x-0 bottom-0` sem fundo visível, mas a caixa dele mede 1280×250 px e capturava clique em toda
  a largura, inclusive nas laterais transparentes onde nada é desenhado. Medido com
  `elementFromPoint(60, topo+40)` em `apps/app`: o elemento no topo era o próprio `<section>`. Qualquer link
  nos 250 px inferiores de qualquer página dos dois apps ficava inclicável enquanto o banner estivesse
  aberto. **Corrigido.**

- `apps/app` — a língua do banner pode divergir da língua da página. Repro exato:

  ```bash
  curl -s -L -H 'Cookie: x-locale=pt-br' http://localhost:3010/en/sign-in
  # <title>Sign In | next-boilerplate</title>   ← segmento [locale] da URL
  # "Cookies neste site" / "Recusar tudo"       ← cookie x-locale
  ```

  O layout raiz resolve a locale por `getDictionary()`, que lê o cookie `x-locale`, enquanto as páginas sob
  `[locale]` usam o segmento da URL. O `privacyPolicyHref` acompanha a locale do cookie, então ao menos o
  link fica coerente com o texto do banner. A divisão entre chrome (cookie) e conteúdo (URL) já existia no
  app antes desta tarefa; o banner só a torna mais visível, por ficar sobre a página. Corrigir aqui
  significaria mudar como o app inteiro resolve locale, e isso é refatoração fora da tarefa. Fica como
  achado de backlog, com o repro acima.

### 🟢 Sugestão

- `specs/cookie-consent.md` continua em `specs/` depois de a feature ter sido entregue. A auditoria do
  backlog rodou antes da implementação, no mesmo ciclo. Quem fecha isso é o `/spec --sync`, movendo a spec
  para `docs/features/cookie-consent/spec.md`.

- Não existe teste protegendo a ordem no `dataLayer` (`consent default` antes de `js`/`config`). A ordem
  depende de o script inline renderizar antes do `<GoogleAnalytics>` na árvore e de o `@next/third-parties`
  continuar usando `afterInteractive`. Medi a ordem no browser e ela está correta hoje.

### ✅ Conforme

- `packages/analytics/consent.ts` é módulo puro, sem import do Next, com 24 testes. `parseConsent` trata
  entrada hostil sem lançar.
- `packages/analytics/server.ts` marca `server-only` e lê a tag por `keys()`, que descarta string vazia e id
  sem prefixo `G-`. O `SESSION_COOKIE_DOMAIN` sai de `process.env` direto, igual ao que
  `packages/auth/session.ts:49` já fazia.
- Nenhuma string de UI solta. As 14 chaves novas existem nos três idiomas e o teste de paridade passa.
- `setCookie` ganhou um parâmetro opcional. Os três call sites antigos não mudaram e há teste fixando que a
  string produzida sem opções continua idêntica.
- Sem ciclo entre pacotes: `@repo/analytics` passou a depender de `design-system`, `internationalization` e
  `shared`, e nenhum deles depende de `analytics`.
- Componente novo reexportado em `packages/design-system/components/ui/index.ts`.
- Nenhum comentário cita o fluxo de agents, `plan.md`, `handoff.md` ou ID de tarefa.
- `docs/features/cookie-consent/` não carrega credencial.

### 👁 Validação visual

Servidores próprios em 3010 (`app`) e 3011 (`web`). As portas 3000 e 3001 estavam ocupadas por outro
projeto do usuário e não foram tocadas; conferi ao final que continuam como estavam. Matei o que subi, pai
e filho.

| cenário | medido |
|---|---|
| primeira visita, `web` | `dataLayer` só com `consent default` negado e `wait_for_update:500`; zero recurso de `googletagmanager` ou `vercel-scripts`; HTML servido sem nenhuma citação a `googletagmanager` |
| recusar tudo | cookie `v1:analytics=denied`; `default` + `update`, ambos negados; zero recurso de terceiro; zero `<script src>` do Google ou da Vercel no DOM; banner sai |
| recarga depois de recusar | `default` negado, sem `wait_for_update`; nada de terceiro carrega; banner não volta |
| aceitar pelo diálogo | cookie `v1:analytics=granted`; ordem `default` → `update (granted)` → `js` → `config`; cookies `_ga` gravados |
| recarga com consentimento concedido | `default` já sai com `analytics_storage:'granted'`, sem `wait_for_update`, e é a **primeira** entrada do `dataLayer`, antes de `js` e `config`; carregam `googletagmanager.com/gtag/js` e `va.vercel-scripts.com` |
| `Esc` no diálogo sem salvar | nenhum cookie escrito, decisão anterior preservada |
| modo degradado (sem `NEXT_PUBLIC_GA_MEASUREMENT_ID`) | `GET /pt-br` 200 com 206 KB de HTML; zero script de consentimento, zero banner, zero gatilho no rodapé |
| `apps/app`, primeira visita e aceitar | mesmo comportamento da `web` |
| temas e viewports | claro e escuro nos dois apps, 1280×800 e 390×844 |
| idiomas | pt-br e en, com `privacyPolicyHref` acompanhando (`/en/legal/privacy`) |

Não verificado: o item de preferências no `ProfileDropdown` da `apps/app`. Ele só aparece em tela
autenticada e a máquina tem apenas o JDK 17 (`java -version`: `openjdk 17.0.13`), enquanto os emuladores do
Firebase pedem JDK 21. Confirmei a limitação em vez de aceitar a do handoff. Fica sem classificação: nem
aprovado, nem reprovado. O teste jsdom em `apps/app/__tests__/profileDropdownCookieConsent.test.tsx` cobre
as três condições do item, e o equivalente na `web` (`CookiePreferencesButton`, mesmo hook, mesma chave de
tradução) abriu o diálogo corretamente no browser.

## Reverificação das afirmações de maior risco do handoff

O handoff foi conferido, não aceito.

**"Recusar tudo produz zero script do Google e zero script da Vercel"** — confere. Depois de clicar em
"Recusar tudo", `performance.getEntriesByType('resource')` filtrado por
`googletagmanager|google-analytics|vercel|insights|doubleclick` devolveu lista vazia, e nenhum `<script src>`
do Google ou da Vercel existia no DOM. Na primeira visita, antes de qualquer escolha, o mesmo filtro também
devolveu vazio, e o HTML servido não cita `googletagmanager` nenhuma vez.

**Desvio nº 1, o `buildConsentModeDefaultsScript(snapshot)`** — a correção funciona. Com o cookie já gravado
como `granted`, recarreguei e li o `dataLayer`: a primeira entrada é
`["consent","default",{…,"analytics_storage":"granted"}]`, sem `wait_for_update`, antes de `js` e de
`config`. O defeito que o plano original teria produzido (padrão negado numa visita em que o consentimento
já existe, sem `update` atrás) não acontece. Confirmei o mesmo pelo HTML servido, com `curl` mandando os
três estados de cookie: sem cookie sai `denied` com `wait_for_update`, `granted` sai `granted` sem espera,
`denied` sai `denied` sem espera.

## O que a primeira medição deixou passar

A sobreposição do banner sobre conteúdo era risco declarado na §8 do `analyze/plan.md`. Ela atravessou o
`/develop` e a primeira rodada do `/review` sem ninguém medir, e a segunda rodada mediu **só a página de
login** porque foi só ela que a instrução citou. O defeito da `apps/web` sobreviveu até o `/test`.

A falha não foi de código, foi de escopo da medição: o banner é fixo na base da janela e afeta **toda
página de qualquer app**, não a que se lembrou de conferir. Quem acrescentar um terceiro app ao monorepo
precisa medir o fim da rolagem dele também, e a lista de alvos é a mesma: o que estiver nos 250 px (desktop)
a 354 px (celular) inferiores da janela.

## Correções aplicadas

| arquivo:linha | o que mudou |
|---|---|
| `packages/design-system/components/ui/cookie-consent.tsx:115,118` | `pointer-events-none` no `<section>` e `pointer-events-auto` no `Card`, para a faixa transparente do banner parar de engolir clique |
| `packages/design-system/components/ui/cookie-consent.tsx:116` | atributo `data-cookie-banner` no `<section>`, para o layout saber que o banner está aberto sem depender do `aria-label`, que é traduzido |
| `apps/app/app/[locale]/(unauthenticated)/layout.tsx:19` | `h-dvh` → `min-h-dvh`, para a página de autenticação poder crescer e rolar |
| `apps/app/app/[locale]/(unauthenticated)/layout.tsx:43` | `[body:has([data-cookie-banner])_&]:pb-96` na coluna do formulário, reservando 384 px embaixo **só enquanto o banner existe no documento** |
| `apps/web/app/[locale]/components/footer.tsx:56` | mesma folga condicional no `<footer>`, mais `bg-background` no próprio elemento para a faixa reservada não mostrar fundo diferente |

A folga é condicional porque folga constante regride o caso sem banner. No login, 570 px de formulário mais
384 px de padding passam de qualquer um dos dois viewports, e a página passaria a rolar e a desalinhar o
formulário mesmo para quem já respondeu. Na landing, a página ganharia 384 px de vazio no fim para sempre.
O seletor `body:has([data-cookie-banner])` resolve isso sem JavaScript e sem efeito global: o pacote só
publica o atributo, e cada app escolhe onde consumir.

No login a folga foi para a coluna do formulário, não para o contêiner do grid. No contêiner, `min-height`
em `border-box` encolheria a linha do grid, e a coluna decorativa da esquerda (`h-full`, `bg-muted`)
deixaria uma faixa de fundo diferente embaixo. Conferi nas capturas que não há essa emenda.

### Medição da página de login

Sonda `elementFromPoint`, três alvos. "Alcançável" quer dizer que o elemento no ponto central é o próprio
alvo, não o banner.

Com banner aberto:

| viewport | rolagem | Continuar com Google | Esqueci minha senha | Cadastrar |
|---|---|---|---|---|
| 1280×800, topo | `scrollHeight` 1142 > 800 | alcançável (topo 510) | coberto (topo 580) | coberto (topo 608) |
| 1280×800, rolado ao fim | — | **alcançável** (topo 238) | **alcançável** (topo 308) | **alcançável** (topo 336) |
| 390×844, topo | `scrollHeight` 1110 > 844 | coberto (topo 497) | coberto (topo 567) | coberto (topo 595) |
| 390×844, rolado ao fim | — | **alcançável** (topo 250) | **alcançável** (topo 320) | **alcançável** (topo 348) |

Rolar é necessário porque o formulário tem 570 px e o banner ocupa 250 px no desktop e 354 px no celular:
570 mais 354 não cabe em 844 px de altura. Antes da correção a página não rolava, e por isso não havia
caminho nenhum até os links.

Sem banner, consentimento já concedido:

| viewport | rolagem | Continuar com Google | Esqueci minha senha | Cadastrar |
|---|---|---|---|---|
| 1280×800 | `scrollHeight` 800 = viewport, não rola | alcançável (topo 534) | alcançável (topo 604) | alcançável (topo 632) |
| 390×844 | `scrollHeight` 844 = viewport, não rola | alcançável (topo 556) | alcançável (topo 626) | alcançável (topo 654) |

Sem banner, modo degradado (servidor reiniciado sem `NEXT_PUBLIC_GA_MEASUREMENT_ID`): números idênticos aos
da tabela acima, nas duas viewports, e iguais aos da medição de referência feita antes de eu tocar no
arquivo. A página sem banner ficou pixel a pixel como era.

Capturas: `review/screenshots/app-signin-reachable-{desktop,mobile}.png`,
`review/screenshots/app-signin-no-banner-unchanged.png`, e o estado anterior em
`review/screenshots/app-signin-banner-overlap-{desktop,mobile}.png`.

### Medição do rodapé da landing

Página rolada até o fim, os quatro links de navegação do rodapé.

Com banner aberto, depois da correção:

| viewport | `scrollHeight` | Início | Preços | Política de Privacidade | Termos de Uso |
|---|---|---|---|---|---|
| 1280×800 | 5581 | **alcançável** (topo 189) | **alcançável** (topo 225) | **alcançável** (topo 225) | **alcançável** (topo 257) |
| 390×844 | 5560 | **alcançável** (topo 136) | **alcançável** (topo 240) | **alcançável** (topo 340) | **alcançável** (topo 372) |

Os quatro ficam acima do topo do banner (535 no desktop, 490 no celular). O quinto item do rodapé,
"Preferências de cookies", também fica alcançável nessa posição.

Sem banner, consentimento já concedido:

| viewport | `padding-bottom` do `<footer>` | `scrollHeight` | base do `<footer>` | alvos |
|---|---|---|---|---|
| 1280×800 | `0px` | 5197 | 785 | os quatro alcançáveis |
| 390×844 | `0px` | 5176 | 844 | os quatro alcançáveis |

A diferença de 384 px entre 5581 e 5197 no desktop, e entre 5560 e 5176 no celular, é exatamente a folga, e
ela some quando o banner some. O 5176 do celular bate com o valor medido na reprodução do defeito, quando
zerei a folga à mão: sem banner a página é a mesma de antes da correção.

Sem banner, modo degradado (servidor reiniciado sem `NEXT_PUBLIC_GA_MEASUREMENT_ID`): `padding-bottom` do
`<footer>` em `0px`, base do rodapé em 785 no desktop e 844 no celular, os mesmos valores da tabela acima.
O `scrollHeight` cai para 5163 e 5144 porque em modo degradado o rodapé também não mostra o gatilho
"Preferências de cookies", que é 32 px a menos. Nenhuma folga sobrando.

Capturas: `review/screenshots/web-footer-reachable-desktop.png` e
`review/screenshots/web-footer-no-banner-unchanged-mobile.png`.

## Raio de impacto

- `AnalyticsProvider` passou a exigir `consent` e `locale`. Quebra de contrato para quem já usa o pacote.
  Os dois call sites do repositório (`apps/app/app/layout.tsx`, `apps/web/app/[locale]/layout.tsx`) foram
  ajustados. Um fork que monte o provider em outro lugar não compila até passar as props.
- `packages/analytics/provider.tsx` virou `"use client"`. Os `children` continuam renderizando no servidor
  porque chegam como prop, e os dois builds passam.
- `<VercelAnalytics />` deixou de montar incondicionalmente. Fork hospedado fora da Vercel e sem tag do
  Google configurada não monta mais medição nenhuma, e também não mostra banner. É o modo degradado, e
  confirmei que a página serve 200 nesse estado.
- `setCookie` ganhou um quarto parâmetro opcional. Aditivo, com teste de regressão na forma antiga.
- `packages/design-system/components/ui/index.ts` exporta mais um componente cliente. Quem importa pelo
  barrel em Server Component já convivia com outros clientes ali.
- O atributo `data-cookie-banner` é contrato público do banner, com dois consumidores:
  `apps/app/app/[locale]/(unauthenticated)/layout.tsx:43` e
  `apps/web/app/[locale]/components/footer.tsx:56`. `apps/app/__tests__/cookieBannerAuthLayoutOffset.test.tsx`
  cobre o primeiro; o segundo não tem teste.
- `pnpm-lock.yaml` mudou por causa das dependências de workspace declaradas em `packages/analytics`,
  `apps/app` e `apps/web`. Nenhuma dependência de registro entrou.

## Lacunas de teste

- O acoplamento entre `data-cookie-banner` e o seletor do rodapé da `apps/web`. O `/test` cobriu o mesmo
  acoplamento no layout de autenticação da `apps/app`; a `apps/web` não tem equivalente, e a suíte dela roda
  em `environment: "node"`, sem jsdom, então um teste de render não cabe lá sem mudar a configuração.
- Ordem no `dataLayer`. Um teste de componente que renderize o `AnalyticsProvider` e afirme que o `<script>`
  inline aparece antes do `<GoogleAnalytics>` na árvore travaria o que hoje só é garantido por leitura do
  código.
- Duplo clique em aceitar e em recusar. A operação é idempotente por construção e não foi exercitada.
- Sobrevivência do TTL de 180 dias ao fechar e reabrir o navegador.
- Admin personificando: a escolha é do navegador e deve continuar valendo. Depende do ambiente autenticado
  que não subiu.
- JavaScript desligado.
- O `ProfileDropdown` no browser, quando houver emulador de pé.

## Decisões em aberto

1. **Remoção do bloco `crons` de `apps/api/vercel.json`.** Concordo com a remoção. `/cron/keep-alive`
   aparece uma única vez na história do repositório, no commit `665a4cc feat: initial files`, e só dentro
   do próprio `vercel.json`: nenhum arquivo de rota com esse caminho foi adicionado em commit nenhum
   (`git log --all --diff-filter=A` sob `apps/api/app/**cron**` não retorna nada). Era um 404 diário à
   01:00 herdado do template. Apontar o cron para `/health`, a alternativa registrada, inventaria um
   trabalho que ninguém pediu: um ping diário não mantém função serverless aquecida e a rota já é sondada
   pelo monitoramento da plataforma.

## Gates

Rodados com as duas correções de layout dentro e com os testes que o `/test` acrescentou.

| gate | resultado |
|---|---|
| `pnpm check` | 543 arquivos, nenhuma correção |
| `pnpm turbo run lint typecheck test` | 24 de 24 tasks, todas passando |
| `pnpm test` (raiz) | 10 de 10 tasks |
| `apps/app` | 293 testes em 41 arquivos |
| `apps/web` | 31 testes em 5 arquivos |
| `@repo/internationalization` | 27 testes em 3 arquivos, paridade dos 3 idiomas inclusa |

`apps/app/__tests__/cookieBannerAuthLayoutOffset.test.tsx` passa com a correção do login intacta. Ele lê o
arquivo do layout e confere que o seletor `body:has(...)` casa com o atributo que o banner realmente
renderiza, então é ele quem avisa se um dos dois lados for renomeado.

## Plano de commits

Proposto, não executado. Nenhum commit foi feito.

| # | mensagem | arquivos |
|---|---|---|
| 1 | `docs(specs): reconcile the feature backlog with the code` | `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/audit-log.md`, `specs/billing-subscription.md`, `specs/cookie-consent.md`, `specs/cursor-pagination.md`, `specs/dashboard-home.md`, `specs/data-rights-lgpd.md`, `specs/e2e-testing.md`, `specs/observability-logging.md`, `specs/onboarding-flow.md`, `specs/teams-organizations.md` |
| 2 | `docs: correct the rate limit and gate figures in the audits` | `docs/SECURITY.md`, `docs/PRE-PRODUCTION.md` |
| 3 | `chore(api): drop the cron pointing at a route that never existed` | `apps/api/vercel.json` |
| 4 | `feat(shared): allow setCookie to declare domain and Secure` | `packages/shared/utils/helpers/cookies.ts`, `packages/shared/__tests__/cookies.test.ts` |
| 5 | `feat(analytics): consent core, server bootstrap and Consent Mode defaults` | `packages/analytics/consent.ts`, `packages/analytics/consent-context.tsx`, `packages/analytics/server.ts`, `packages/analytics/__tests__/consent.test.ts`, `packages/analytics/__tests__/keys.test.ts`, `packages/analytics/vitest.config.mts`, `packages/analytics/package.json` |
| 6 | `feat(analytics): load the tags only after the visitor consents` | `packages/analytics/provider.tsx` |
| 7 | `feat(design-system): cookie banner and preferences dialog` | `packages/design-system/components/ui/cookie-consent.tsx`, `packages/design-system/components/ui/index.ts` |
| 8 | `feat(app): mount the consent provider and keep the sign-in links reachable under the banner` | `apps/app/app/layout.tsx`, `apps/app/app/[locale]/(unauthenticated)/layout.tsx`, `apps/app/shared/components/ui/ProfileDropdown.tsx`, `apps/app/__tests__/profileDropdownCookieConsent.test.tsx`, `apps/app/__tests__/cookieBannerAuthLayoutOffset.test.tsx`, `apps/app/__tests__/analyticsConsentProvider.test.tsx`, `apps/app/package.json` |
| 9 | `feat(web): mount the consent provider, reopen preferences from the footer and keep its links reachable` | `apps/web/app/[locale]/layout.tsx`, `apps/web/app/[locale]/components/footer.tsx`, `apps/web/app/[locale]/components/cookiePreferencesButton.tsx`, `apps/web/package.json` |
| 10 | `feat(internationalization): cookie consent copy in the three languages` | `packages/internationalization/translations/components/ui/cookie-consent.ts`, `packages/internationalization/translations/components/index.ts` |
| 11 | `chore: declare the workspace dependencies of the consent layer` | `pnpm-lock.yaml` |
| 12 | `docs(features): cookie-consent` | `docs/features/cookie-consent/` |

Três decisões de alocação:

O layout de autenticação vai no commit 8 porque a folga só existe para o banner que esse mesmo commit monta
na `apps/app`, e porque o commit 7, que publica o atributo `data-cookie-banner`, já veio antes. As duas
metades do seletor ficam em ordem de dependência e nenhum commit intermediário deixa a página de login
quebrada.

Os dois arquivos de teste que o `/test` acrescentou vão no commit 8. Os dois moram em `apps/app/__tests__/`,
e um commit por app é a regra mais forte aqui: `analyticsConsentProvider.test.tsx` exercita o provider, que
é código do commit 6, mas não pode entrar num commit de `packages/analytics` sem misturar app com pacote.

O rodapé da `apps/web` continua no commit 9, que já o alterava para o gatilho de preferências. A folga entra
no mesmo arquivo e pela mesma razão, e a mensagem do commit passa a dizer isso.

O `pnpm-lock.yaml` ficou sozinho no commit 11 porque as dependências que ele registra entram em três
workspaces diferentes (`packages/analytics`, `apps/app`, `apps/web`) e isolar por workspace exigiria
`git add -p` num arquivo gerado.

Título de PR sugerido: `feat: cookie consent and Google Consent Mode v2`.

## Commits realizados

(preenchido pelo orquestrador depois da aprovação)
