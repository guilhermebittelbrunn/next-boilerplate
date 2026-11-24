# Revisão: parte 3 da entrega, fatia 3 (títulos e conversão)

Revisão do working tree sobre `18288c9` contra `docs/review-checklist.md`, partindo do `develop/handoff.md`. Rodou
dentro do `/cycle`, sem perguntas ao usuário. Não subi app nem browser, e não rodei a suíte: isso é do `/test`. A
única execução de teste foi o arquivo `apps/app/__tests__/panelTitles.test.ts`, para medir a correção que fiz nele.

## Branch

- Atual: `guilhermebittelbrunn/cycle-command-v13` (placeholder do Conductor, sem commit além de `origin/main`).
  Regex do `/review`: `INVALIDA`.
- Não criei nem troquei de branch: o ambiente Conductor não permite trocar sem autorização do usuário, e o
  orquestrador pediu só a proposta.
- Nome proposto: `feat/delivery-product-quality-slice-3`, a criar com `git switch -c` a partir da atual, levando o
  working tree. Sem prefixo de projeto porque o diff toca três apps (`app`, `web`, `e2e`) e dois pacotes. Segue as
  fatias 1 e 2 (`feat/delivery-product-quality`, `feat/delivery-product-quality-slice-2`).
- Regex do `/review` sobre o nome proposto: `OK: feat/delivery-product-quality-slice-3`.

## Revisão: `packages/analytics`, `packages/auth`, `apps/app`, `apps/web`, `apps/e2e`

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx:86-88` (corrigido). O comentário justificava
  o `mutateAsync` (desvio 2 do handoff) com "o React Query pula os callbacks por chamada de um componente que já
  desmontou". A explicação não procede. O `signInWithGoogle` que a tela recebe de `useAuth()` é o resultado do
  `useMutation` do próprio `AuthProvider` (`packages/auth/provider.tsx:374-379`, exposto em `:406`), e o
  `#notify` do `MutationObserver` confere os ouvintes desse observador (`mutationObserver.js:77`). Esse
  observador vive no `AuthProvider` de `apps/web/app/[locale]/layout.tsx:41`, que não desmonta no
  `router.push(\`/${locale}\`)` do `useEffect` da tela. Ou seja, o `mutate(undefined, { onSuccess })` do plano
  também funcionaria, e é ele que a tela de login da landing usa (`sign-in-form-client.tsx:138-146`). O código
  com `mutateAsync` continua correto, então mantive o código e troquei o comentário pelo motivo real do
  `.catch`: o `onError` do provider (`provider.tsx:376-377`) já mostra o erro, e o `catch` só evita a rejeição
  sem tratamento. Conferido que ele não engole erro que a UI precisasse mostrar: falha do popup ou da troca
  cai no `onError` do provider antes de rejeitar; falha do cookie de sessão é tratada dentro do
  `onAuthSuccess` (`provider.tsx:353-365`), que mostra `session.notEstablished` e resolve sem lançar.
- `apps/app/__tests__/panelTitles.test.ts:131-140` (corrigido). O caso "wires `<rota>`" procurava a string exata
  `export const generateMetadata = panelPageMetadata("<rota>")` numa linha só. O Biome quebra linhas acima de 80
  colunas (`biome.jsonc:8`), e essa linha passa de 80 com rota de mais de 28 caracteres, por exemplo
  `/admin/organizations/edit/[id]`. O `apps/app/CLAUDE.md` e a skill `new-crud` mandam todo CRUD de fork por esse
  caminho, então o primeiro recurso de nome longo reprovaria sem defeito e depois de um `pnpm fix`. Agora a
  comparação ignora espaço, quebra de linha e a vírgula final (`withoutFormatting`). Medido: 27/27 passando; a
  chamada de `/playground` reescrita em três linhas com vírgula final passa; a mesma chamada apontando para
  `/account` reprova 1 caso (`wires '/playground'`). O layout foi restaurado e o `git status` dele segue `??`.

### 🟢 Sugestão / nit

- Desvio 1 do handoff (`apps/app/shared/lib/googleSignInApi.ts:40-44`): o `sign_up` do Google sai logo depois do
  popup, antes da troca de sessão. Aceito. O evento conta conta criada no Firebase, e a conta existe nesse ponto:
  se a troca falhar, o `catch` só faz `signOut` (`:48-52`) e a rota `auth/sign-in/google` da API não apaga
  ninguém. Na nova tentativa o `isNewUser` vem falso, então a mesma conta não é contada duas vezes. A landing tem
  a mesma semântica por outro caminho: o `onAuthSuccess` engole a falha de sessão, o `mutateAsync` resolve e o
  evento sai. As duas apps contam "conta criada", não "sessão aberta", e é isso que o GA4 chama de `sign_up`. O
  risco que sobra é de entrega, não de semântica: o evento entra no `dataLayer` pouco antes do
  `window.location.replace` (`SignUpFormClient.tsx:102`, `SignInForm.tsx:119`). Vai para o `/test`.
- `packages/analytics/provider.tsx:102-113`. O `trackEvent` lê o `measuring` do render em que a mutation
  começou. Se o visitante aceitar o banner enquanto o popup do Google está aberto, aquele cadastro não é medido.
  O erro é para menos, nunca um envio sem consentimento. Fica como está.
- `apps/e2e/tests/entityCrud.spec.ts:15`. O `screenTitled` monta a `RegExp` com o rótulo do dicionário sem
  escapar. Os rótulos de hoje ("Entidades", "Nova entidade", "Editar entidade") não têm metacaractere. Fica
  como está.

### ✅ OK

- Consentimento: `sendAnalyticsEvent` só chama o `gtag` com `measuring`, `gaMeasurementId` e `target.gtag`
  presentes (`packages/analytics/events.ts:24-29`). O contexto de eventos só é montado no ramo `consentable`
  (`provider.tsx:123-127`); fora dele vale o `ignoreEvent` (`events-context.tsx:11-16`). Os seis `sign_up` e o
  `generate_lead` passam todos por `useAnalyticsEvent()`. Nenhum `gtag(` ou `dataLayer` direto em `apps/app` ou
  `apps/web`.
- Sem dado pessoal: o único parâmetro é `{ method: "email" | "google" }`; o `generate_lead` vai sem parâmetro
  (`contact-form-client.tsx:62`). O tipo `AnalyticsEventParams` leva a regra do Google no próprio JSDoc.
- Modo degradado: sem id do GA, `sendAnalyticsEvent` devolve `false`; sem provider, o contexto padrão não faz
  nada; sem `window.gtag`, também não. Nenhum caminho lança. A app rodando com a env vazia fica para o `/test`.
- `generate_lead` só no `onSuccess` da mutation do contato; os dois `error.code` da API não disparam (teste em
  `contactForm.test.tsx`).
- `isNewAccount` (`packages/auth/client.ts:177-178`) é genérico e mora no pacote de integração `auth`.
  `@repo/analytics` não importa nada de `apps/*`.
- Títulos: zero chave nova, zero string solta. `PANEL_PAGE_TITLES` lê rótulos de rota que já existem nos três
  idiomas. `panelTitles.ts` não tem `"use client"` e só é importado por código de servidor e testes. Os quatro
  `layout.tsx` irmãos só devolvem `children`. O `generateMetadata` das rotas `[id]` lê só `locale`.
- `getBrand` saiu dos dois layouts sem sobrar import (Biome limpo).
- Comentários novos explicam o porquê (corrida de navegação em `googleSignInApi.ts:40-42`, regra do Google em
  `events.ts:6`). Nenhum cita plano, handoff, `docs/features` ou etapa do fluxo.
- Docs: as linhas do `x-locale` corrigidas em `docs/PRE-PRODUCTION.md` batem (`apps/app/proxy.ts:249,253`,
  `apps/web/proxy.ts:121,125`, conferido com `grep -n`).
- Corte da spec: a fatia 3 de `specs/delivery-product-quality.md` (título por tela no painel e eventos de
  conversão) está implementada. Os desvios estão registrados no handoff e acima.

### 👁 Verificar no `/test`

- Desvio 1, `sign_up` do Google na app sobrevive ao `window.location.replace`. Repro: emulador, aceitar o
  banner, Google com conta nova na tela de cadastro e na de login da app. Antes de clicar, injetar um script que
  copie cada `push` do `dataLayer` para o `sessionStorage`, ou ler o log de rede com `googletagmanager.com`
  bloqueado e conferir que o `event` foi enfileirado. É a afirmação de maior risco da fatia: nenhum teste chega
  ao `useEffect` que navega.
- `sign_up` por e-mail na app, mesmo caminho (`SignUpFormClient.tsx:132-135`): o evento sai antes do
  `signIn.mutate`, e o cadastro termina em carregamento completo. Mesmo repro.
- Desvio 2, Google na tela de cadastro da landing com conta nova: o `["event","sign_up",{"method":"google"}]`
  aparece no `dataLayer` depois da navegação do cliente. E com o popup fechado pelo visitante: aparece o alerta
  de erro do provider e nenhum evento.
- Google na tela de login da landing com conta nova: o callback por chamada roda depois do `router.push` do
  `onAuthSuccess`. Pela leitura ele roda (o observador é do `AuthProvider`), mas com `?redirect=` para outra
  origem a navegação é completa. Repro: login com `?redirect=` apontando para a app e conta nova.
- Recusar o banner e repetir um cadastro: nenhuma entrada `event` no `dataLayer` e nenhuma requisição ao Google.
- Títulos V1 a V3: `document.title` nas 12 telas do painel, nos três idiomas, no formato `<tela> | <marca>`, e
  as duas telas iniciais com o nome da área. Só o navegador prova que o `template` do layout envolve o título da
  página.
- E2E de títulos: `pnpm --filter e2e e2e tests/entityCrud.spec.ts`, projetos `chromium` e `mobile`. O
  `/develop` não rodou.
- App com `NEXT_PUBLIC_GA_MEASUREMENT_ID=""`: sobe, cadastro e contato funcionam, nada lança no console.
- `generate_lead` com o `?redirect=` cruzado e com aceite do banner simultâneo ao envio (plano §13).

## Itens herdados do handoff, com veredito

| Item | Veredito |
|------|----------|
| Nenhum teste chega ao `window.dataLayer` nem ao `GoogleAnalytics` reais | Continua aberto. É o `/test` no navegador. |
| O `useEffect` que navega nas telas da app não está nos testes de evento | Continua aberto. Coberto pelo primeiro item de "Verificar no `/test`". |
| `panelTitles.test.ts` quebra se a chamada for quebrada em várias linhas | Fechado aqui (`withoutFormatting`), com a medição acima. |
| "A verificar no `/test`" do handoff (desvios 1 e 2, V1 a V9, E2E, `generate_lead`) | Continua aberto, repassado acima com repro. |

## Correções aplicadas

- `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx:86-87`: comentário reescrito com o motivo
  real do `.catch`; o código não mudou.
- `apps/app/__tests__/panelTitles.test.ts:49-53,131-140`: `WHITESPACE` e `withoutFormatting`; a verificação de
  ligação ignora a formatação e continua exigindo a rota exata.

## Raio de impacto

- `signInWithGoogleViaApi(options?)`: parâmetro opcional novo. Consumidores: `SignUpFormClient.tsx` e
  `SignInForm.tsx` da app, ambos atualizados. Os outros mocks em teste não mudam.
- `generateMetadata` dos layouts `(common)` e `admin` passou a devolver `{ default, template }`. Quem lê é o Next
  e `panelLayoutTitle.test.ts`, já ajustado.
- `@repo/analytics/events`, `@repo/analytics/events-context` e `isNewAccount` em `@repo/auth/client` são
  exports novos. O `provider.tsx` mudou por dentro, sem mudar props. A landing e a app montam o provider do
  mesmo jeito.
- Fork que cria tela no painel passa a precisar do registro em `PANEL_PAGE_TITLES`; o teste avisa.

## Decisões em aberto

- Nome da branch: `feat/delivery-product-quality-slice-3`, a criar a partir de
  `guilhermebittelbrunn/cycle-command-v13`. Precisa do "sim" do usuário por causa do Conductor.
- Q3 (Vercel Analytics) e Q6 (área no título) seguem como o plano registrou.

## Gates

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint | `pnpm check` | `Checked 1112 files`, sem correção |
| Typecheck | `pnpm turbo run typecheck --filter=app --filter=web` | 2 tarefas com sucesso, 0 do cache |
| Typecheck dos pacotes e do e2e | não rodei de novo | não mexi neles; o handoff mediu 5/5 |
| Paridade i18n | não rodei | nenhuma chave mudou; o handoff mediu 67 testes |
| `panelTitles.test.ts` | `pnpm exec vitest run __tests__/panelTitles.test.ts` em `apps/app` | 27/27, mais as duas sondas descritas acima |

## Varredura de segredo

`docs/features/delivery-product-quality-slice-3/` e os diffs de `docs/` e `specs/`: nenhuma senha, token, chave,
id `G-` real ou e-mail fora de `example.com`. As duas ocorrências da busca são texto (`api_secret` como nome de
parâmetro do Measurement Protocol, "grava o token" na descrição do fluxo). O teste da landing usa
`qa-dpq3-web@example.com`.

## Plano de commits

Ordem de dependência, um assunto por commit. Antes do primeiro, `git diff --cached --stat` tem de sair vazio
(saiu vazio nesta revisão). Antes de tudo, criar a branch proposta.

1. `feat(auth): expose isNewAccount for popup credentials`
   - `packages/auth/client.ts`
   - `packages/auth/__tests__/newAccount.test.ts`
2. `feat(analytics): add a consent-gated useAnalyticsEvent hook`
   - `packages/analytics/events.ts`
   - `packages/analytics/events-context.tsx`
   - `packages/analytics/provider.tsx`
   - `packages/analytics/__tests__/events.test.ts`
3. `feat(app): give each panel screen its own tab title`
   - `apps/app/shared/lib/panelTitles.ts`
   - `apps/app/lib/server/panelMetadata.ts`
   - `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/layout.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/(home)/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/edit/[id]/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/layout.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/organization/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(pages)/(home)/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/playground/layout.tsx`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/(home)/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/layout.tsx`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/layout.tsx`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/audit/(pages)/(home)/page.tsx`
   - `apps/app/__tests__/panelTitles.test.ts`
   - `apps/app/__tests__/panelLayoutTitle.test.ts`
4. `feat(app): report sign_up from the sign-up and sign-in forms`
   - `apps/app/shared/lib/googleSignInApi.ts`
   - `apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx`
   - `apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx`
   - `apps/app/__tests__/googleSignInApi.test.ts`
   - `apps/app/__tests__/signUpAnalytics.test.tsx`
   - `apps/app/__tests__/analyticsEvents.test.tsx` (testa o provider do `@repo/analytics`, mas mora na app
     porque o jsdom está lá)
5. `feat(web): report sign_up and generate_lead from the landing forms`
   - `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx`
   - `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx`
   - `apps/web/app/[locale]/contact/components/contact-form-client.tsx`
   - `apps/web/__tests__/signUpAnalytics.test.tsx`
   - `apps/web/__tests__/contactForm.test.tsx`
6. `test(e2e): assert the entity screens' tab titles`
   - `apps/e2e/tests/entityCrud.spec.ts`
7. `docs: document the conversion events and the panel tab titles`
   - `docs/FORKING.md`
   - `docs/PRE-PRODUCTION.md`
   - `docs/delivery/03-product-quality.md`
   - O `PRE-PRODUCTION.md` leva junto a correção das linhas do `x-locale` no item 7. Separar exigiria
     `git add -p`; o corpo da mensagem registra.
8. `docs(claude): add the panel tab title rule to the app guide and new-crud`
   - `apps/app/CLAUDE.md`
   - `.claude/skills/new-crud/SKILL.md`
9. `docs(specs): audit the backlog against 18288c9`
   - `specs/BACKLOG.md`
   - `specs/delivery-product-quality.md`
   - `specs/delivery-security-review.md`
10. `docs(features): delivery-product-quality-slice-3`
    - `docs/features/delivery-product-quality-slice-3/` (inteira)

Título de PR sugerido: `feat: delivery part 3 slice 3 (panel tab titles, sign_up and generate_lead events)`.

### Commits realizados

(preenchido pelo orquestrador)
