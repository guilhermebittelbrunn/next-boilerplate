# Handoff do `/develop`: parte 3 da entrega, fatia 3

Implementação de `analyze/plan.md` (fatia 3 da spec `delivery-product-quality`), sobre `18288c9`. Sem SDK, API nem
chave de i18n nova. Nenhuma dependência nova em `package.json` ou no lockfile, nenhuma variável de ambiente nova.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| 10.1 eventos | `packages/analytics/events.ts` (novo: `ANALYTICS_EVENT`, `AnalyticsEventParams`, `GtagEventCommand`, `sendAnalyticsEvent`, que devolve `boolean`) |
| 10.2 contexto | `packages/analytics/events-context.tsx` (novo: `AnalyticsEventsContext`, `useAnalyticsEvent`) |
| 10.3 provider | `packages/analytics/provider.tsx` (`measuring` e `trackEvent` antes do retorno antecipado; `AnalyticsEventsContext.Provider` só no ramo `consentable`) |
| 10.4 auth | `packages/auth/client.ts` (`isNewAccount`) |
| 10.5 Google na app | `apps/app/shared/lib/googleSignInApi.ts` (opção `onAccountCreated`, ver desvio 1) |
| 10.6 formulários da app | `SignUpFormClient.tsx` (e-mail e Google), `SignInForm.tsx` (Google) |
| 10.7 formulários da landing | `sign-up-form-client.tsx` (e-mail e Google, ver desvio 2), `sign-in-form-client.tsx` (Google), `contact-form-client.tsx` (`generate_lead`) |
| 10.8 registro de títulos | `apps/app/shared/lib/panelTitles.ts` (novo) |
| 10.9 metadata por tela | `apps/app/lib/server/panelMetadata.ts` (novo) |
| 10.10 layouts e páginas | `(common)/layout.tsx` e `admin/layout.tsx` (`panelTitleTemplate`, `getBrand` saiu dos dois); seis páginas server com `generateMetadata`; quatro `layout.tsx` novos ao lado das páginas cliente (`entities/(pages)/create`, `playground`, `users/(pages)/create`, `users/(pages)/edit/[id]`) |
| 10.11 E2E | `apps/e2e/tests/entityCrud.spec.ts` (`toHaveTitle` na lista, criação e edição) |
| 10.12 docs | `docs/delivery/03-product-quality.md` (3.8 e 3.11), `docs/FORKING.md` §7.4, `docs/PRE-PRODUCTION.md` (item 19 novo e correção no item 7), `apps/app/CLAUDE.md` ("Páginas"), `.claude/skills/new-crud/SKILL.md` (passo 4) |
| §7 testes | `packages/analytics/__tests__/events.test.ts`, `packages/auth/__tests__/newAccount.test.ts`, `apps/app/__tests__/{analyticsEvents,signUpAnalytics,panelTitles}.test.tsx/ts` (novos), `apps/app/__tests__/googleSignInApi.test.ts` e `panelLayoutTitle.test.ts` (alterados), `apps/web/__tests__/signUpAnalytics.test.tsx` (novo), `apps/web/__tests__/contactForm.test.tsx` (alterado) |

## Contrato

Nenhum DTO ou action do SDK mexido. Mudanças de assinatura dentro do repositório:

- `signInWithGoogleViaApi(options?: { onAccountCreated?: () => void })`. Antes não tinha parâmetro. Consumidores:
  `SignUpFormClient.tsx` e `SignInForm.tsx` da app, que agora a chamam por uma arrow no `mutationFn` (passar a
  função direto mandaria as `variables` da mutation como opções). Os outros testes que a mockam com `vi.fn()` não
  mudaram.
- `generateMetadata` dos dois layouts do painel devolve `title: { default, template }` em vez de string. Quem lê:
  o Next e `panelLayoutTitle.test.ts`, que foi ajustado.
- `@repo/auth/client` exporta `isNewAccount`; `@repo/analytics/events` e `@repo/analytics/events-context` são
  módulos novos.

## Códigos de erro novos

Nenhum. Nenhuma chave de tradução nova: os títulos usam rótulos de rota que já existem.

## Desvios do plano

1. **Na app, o `sign_up` do Google sai logo depois do popup, e não no `onSuccess` da mutation.** O plano dizia que
   "na app o disparo vem antes de qualquer navegação". Isso não vale para o Google. Assim que o popup autentica o
   cliente Firebase, o `AuthProvider` publica o `user`, e o `useEffect` de `SignUpFormClient.tsx:80-108` (o mesmo
   em `SignInForm.tsx:91-125`) troca a página com `window.location.replace` depois de duas requisições, sem
   esperar a mutation. A mutation, por sua vez, só termina depois da rota `auth/sign-in/google` da API (Identity
   Toolkit e perfil no Firestore) e do cookie de sessão. A ordem entre as duas navegações não é garantida, e o
   `onSuccess` pode nunca rodar antes da troca de página. Conclusão por leitura de código, sem medição no
   navegador. Agora `signInWithGoogleViaApi` chama `onAccountCreated` quando `isNewAccount(popup)` é verdadeiro,
   antes de qualquer `await` de rede. Efeito colateral aceito: se a troca de sessão falhar depois do popup, o
   evento já saiu. A conta existe no Firebase nesse ponto, então ela conta como cadastro; o risco 3 do plano
   (evento perdido nesse caso) deixa de existir. `GoogleApiSignInResult` não ganhou `isNewUser`, porque ninguém
   mais o leria.
2. **Na landing, o Google da tela de cadastro usa `mutateAsync`, e não `mutate(undefined, { onSuccess })`.** Na
   tela de cadastro, o `useEffect` (`sign-up-form-client.tsx:76-80`) manda para `/${locale}` assim que o `user`
   aparece, enquanto o `onAuthSuccess` do provider ainda espera o cookie de sessão. O React Query 5.90 só chama os
   callbacks passados ao `mutate` se o observador ainda tem ouvintes (`mutationObserver.js`, `#notify`:
   `if (this.#mutateOptions && this.hasListeners())`), e uma tela desmontada não tem. O `mutateAsync` resolve com
   a credencial mesmo depois de a tela sair, e o erro continua tratado pelo `onError` do provider (o `.catch` só
   evita a rejeição sem tratamento). Na tela de **login** da landing o plano foi seguido: ali o
   `signInStartedHereRef` impede a navegação antecipada, e o callback por chamada roda logo depois do
   `onAuthSuccess`.
3. **`SignUpMethod` não foi criado.** Nenhum chamador o usaria; o `method` vai como string literal nos seis pontos.
4. **`sendAnalyticsEvent` também confere se `target.gtag` existe** antes de chamar, e devolve `false` nesse caso.
5. **`panelLayoutTitle.test.ts` foi ajustado.** O plano não o citava; com o `title.template`, os layouts devolvem
   objeto, e as quatro asserções de string passaram a conferir `{ default, template }`.
6. **Teste de componente da web em jsdom.** `apps/web/__tests__/signUpAnalytics.test.tsx` usa
   `// @vitest-environment jsdom` no próprio arquivo, a exceção que o `apps/web/CLAUDE.md` admite para interação de
   Client Component. O caso do Google precisa do clique, e o `renderToString` dos testes vizinhos não clica.
7. **`PRE-PRODUCTION.md`, item 7:** a tabela de cookies citava `apps/app/proxy.ts:235,239` e
   `apps/web/proxy.ts:111,115` para o `x-locale`. As linhas certas hoje são `249,253` e `121,125`
   (`grep -n '"x-locale"' apps/app/proxy.ts apps/web/proxy.ts`). Corrigido. As outras nove referências da tabela
   foram conferidas com `sed -n '<linha>p'` e batem.
8. **Passo 4 do item 19:** além de esperar o evento aparecer na lista, o texto indica criar o evento principal pelo
   nome (Administrador → Exibição de dados → Eventos principais). O caminho no console do GA4 vem de conhecimento
   do produto, não de consulta nesta rodada.

## Decisões em aberto

Nenhuma nova. Q3 (Vercel Analytics) e Q6 (área no título) seguem como o plano registrou.

## Validação

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint | `pnpm check` | `Checked 1112 files`, sem erro |
| Typecheck | `pnpm turbo run typecheck --filter=app --filter=web --filter=e2e --filter=@repo/analytics --filter=@repo/auth` | 5 tarefas, todas com sucesso |
| Build da app | `pnpm build` em `apps/app` | exit 0, `Compiled successfully`. Valida os tipos das rotas do Next, inclusive o `generateMetadata` com `params` só de `locale` nas rotas `[id]` |
| Testes `@repo/analytics` | `pnpm turbo run test --filter=@repo/analytics` | 3 arquivos, 41 testes (7 novos em `events.test.ts`) |
| Testes `@repo/auth` | idem `--filter=@repo/auth` | 13 arquivos, 142 testes (3 novos em `newAccount.test.ts`) |
| Testes `app` | idem `--filter=app` | 140 arquivos, 1273 testes |
| Testes `web` | idem `--filter=web` | 34 arquivos, 306 testes |
| Paridade i18n | `pnpm --filter @repo/internationalization test` | 67 testes |
| Teste de títulos pega tela nova | página temporária `(common)/(pages)/zzprobe/page.tsx` | 2 falhas (registro diferente do disco; `/zzprobe` sem `panelPageMetadata`); pasta removida |
| Teste de títulos pega ligação errada | `panelPageMetadata("/admin/users")` na página de auditoria | 1 falha (`wires '/admin/audit'`); arquivo restaurado |
| Teste de eventos pega consentimento ignorado | `{ measuring: true, gaMeasurementId }` no `provider.tsx` | 4 falhas em `analyticsEvents.test.tsx`; arquivo restaurado (`grep -c "measuring: true"` → 0) |
| Teste do cadastro pega evento removido | linha do `sign_up` por e-mail apagada em `SignUpFormClient.tsx` | 1 falha em `signUpAnalytics.test.tsx`; arquivo restaurado |

**Modo degradado, o que está medido.** `NEXT_PUBLIC_GA_MEASUREMENT_ID=""` vira `undefined` em `keys()`
(`keys.test.ts`, "descarta a string vazia que o .env.example publica", teste anterior a esta fatia). Com
`consentable: false` e sem id, o provider não monta o contexto de eventos e o `trackEvent` padrão não faz nada nem
lança erro (`analyticsEvents.test.tsx`, "sends nothing and does not throw when no measurement is configured", e o
caso fora do provider). Na Vercel sem id (`consentable: true`, `gaMeasurementId: null`) nenhum evento sai (caso
"sends nothing on Vercel without a Google Analytics id"). Página sem `window.gtag` não lança erro
(`events.test.ts` e `analyticsEvents.test.tsx`). A app com a variável vazia rodando de verdade não foi medida:
fica para a V9.

Nenhum servidor foi iniciado; `lsof -ti tcp:3000 tcp:3001 tcp:3002` saiu vazio no fim. O `apps/app/.next` do build
ficou (ignorado pelo Git).

## A verificar no `/test`

- **Desvio 1 no navegador (V7, app).** Repro: emulador, aceitar o banner, Google na tela de login da app com conta
  nova. O `window.location.replace` zera o `dataLayer`; para ler, injete antes de navegar um script que copie cada
  `push` para o `sessionStorage`, ou observe a requisição de coleta (abortada) no log de rede.
- **Desvio 2 no navegador (V7, landing).** Repro: Google na tela de cadastro da landing com conta nova; a navegação é
  do cliente, então o `dataLayer` continua legível depois.
- **V1 a V3 (títulos compostos pelo Next).** Só o E2E e o navegador provam que o `template` do layout envolve o
  título da página. O unitário prova as duas metades e o build prova os tipos. Repro: `document.title` nas 12
  telas, nos três idiomas.
- **E2E de títulos.** `pnpm --filter e2e e2e tests/entityCrud.spec.ts`, projetos `chromium` e `mobile`. Não rodei.
- **V4 a V6, V8 e V9** como estão no plano §8.
- **`generate_lead` com o `?redirect=` cruzado** e o risco do aceite simultâneo ao envio (plano §13) continuam sem
  medição.

## Lacunas de teste conhecidas

- Nenhum teste chega ao `window.dataLayer` real nem ao `GoogleAnalytics` real: os testes de componente mockam o
  `@next/third-parties` e conferem as chamadas ao `window.gtag`.
- O `useEffect` que navega nas telas de cadastro e login da app não está nos testes de evento (o `useAuth`
  mockado devolve `user: null`), então a corrida do desvio 1 não tem teste automatizado, só a ordem "evento antes
  da troca de sessão" em `googleSignInApi.test.ts`.
- O item (d) de `panelTitles.test.ts` lê o texto do arquivo e procura `export const generateMetadata =
  panelPageMetadata("<rota>")` numa linha só. Reformatar essa chamada em várias linhas quebra o teste sem defeito
  real; a mensagem diz o que foi procurado.
