# Handoff — consentimento de cookies e Consent Mode

Plano: [`analyze/plan.md`](../analyze/plan.md). Rodada autônoma do `/cycle`, sem pergunta ao usuário.

Nenhuma rota de API, nenhum documento no Firestore, nenhuma mudança no `@repo/sdk`, nenhuma dependência
npm nova, nenhuma variável de ambiente nova.

---

## Blueprint → arquivos

| Item do plano | Arquivos |
|---|---|
| 10.1 Núcleo do consentimento | `packages/analytics/consent.ts` (novo) |
| 10.2 Leitura no servidor | `packages/analytics/server.ts` (novo) |
| 10.3 Provider | `packages/analytics/provider.tsx` (reescrito), `packages/analytics/consent-context.tsx` (novo) |
| 10.4 Consent Mode v2 | `buildConsentModeDefaultsScript` em `packages/analytics/consent.ts`; `ConsentModeDefaults` em `provider.tsx` |
| 10.5 Banner + preferências | `packages/design-system/components/ui/cookie-consent.tsx` (novo), reexportado em `components/ui/index.ts` |
| 10.6 `setCookie` com `domain`/`secure` | `packages/shared/utils/helpers/cookies.ts` |
| 10.7 Montagem nos apps | `apps/app/app/layout.tsx`, `apps/web/app/[locale]/layout.tsx`, `apps/app/package.json`, `apps/web/package.json`, `packages/analytics/package.json`, `pnpm-lock.yaml` |
| 10.8 Ponto de reabertura | `apps/web/app/[locale]/components/cookiePreferencesButton.tsx` (novo) + `components/footer.tsx`; `apps/app/shared/components/ui/ProfileDropdown.tsx` |
| 10.9 i18n | `packages/internationalization/translations/components/ui/cookie-consent.ts` (novo) + `translations/components/index.ts` |
| 7. Testes | `packages/analytics/__tests__/consent.test.ts`, `packages/analytics/__tests__/keys.test.ts`, `packages/analytics/vitest.config.mts` (novos); `packages/shared/__tests__/cookies.test.ts` (estendido); `apps/app/__tests__/profileDropdownCookieConsent.test.tsx` (novo) |

## Contrato

Superfície pública nova de `@repo/analytics`:

- `@repo/analytics/consent` — `CONSENT_COOKIE_NAME`, `CONSENT_COOKIE_VERSION`,
  `CONSENT_COOKIE_TTL_SECONDS`, `NO_CONSENT`, tipos `ConsentDecision`/`ConsentSnapshot`/`ConsentBootstrap`,
  `serializeConsent`, `parseConsent`, `buildConsentModeDefaultsScript`, `resolveConsentable`.
- `@repo/analytics/server` — `resolveConsentBootstrap()`, `server-only`.
- `@repo/analytics/consent-context` — `useCookieConsent()` → `{ available, openPreferences }`.
- `@repo/analytics/provider` — `AnalyticsProvider` passou a exigir `consent` e `locale`;
  `privacyPolicyHref` é opcional.

Consomem isso os dois layouts raiz, o rodapé da `web` e o `ProfileDropdown` da `app`. Quem chamar
`<AnalyticsProvider>` sem as props novas não compila: é a única quebra de contrato da entrega, e já
ajustei os dois call sites do repositório.

`setCookie` ganhou um quarto parâmetro opcional. Os três call sites existentes não mudaram, e há teste
fixando que a string produzida sem opções continua idêntica.

## Códigos de erro

Nenhum. Sem API, sem `error.code`, sem entrada nova em `apiErrors`.

---

## Desvios do plano

**1. O script do Consent Mode nasce com a escolha já feita.** É o desvio que importa, e saiu de um defeito
que a passada no browser expôs. O plano (§10.4) emitia sempre `'analytics_storage':'denied'` no
`gtag('consent','default', …)`, contando com o `update` que a decisão dispara. Isso funciona na visita em
que a pessoa decide e falha na seguinte: com o cookie já gravado como `granted`, a página recarrega, o
`default` nega, nenhum `update` vem atrás (não houve decisão nova) e a tag mede em modo restrito apesar do
consentimento. O `dataLayer` antes da correção:

```
["consent","default",{…,"analytics_storage":"denied","wait_for_update":500}]
["js", …]
["config","G-TEST00000"]
```

Depois da correção, na mesma situação: `analytics_storage: "granted"` no próprio `default`, sem
`wait_for_update` (não há o que esperar quando a escolha já existe). A função virou
`buildConsentModeDefaultsScript(snapshot)`, mora no módulo puro e tem sete testes.

**2. `gaMeasurementId` viaja como prop, não como `keys()` no escopo do módulo.** O plano (§10.3) mantinha
`const { NEXT_PUBLIC_GA_MEASUREMENT_ID } = keys()` no topo do `provider.tsx`, que agora é `"use client"`.
Passar o id pelo `ConsentBootstrap` deixa uma fonte só, a mesma que decide o `consentable`, e tira o
`@t3-oss/env-nextjs` do bundle do cliente.

**3. O provider recebe um objeto `consent` em vez de cinco props soltas.** `ConsentBootstrap` fica em
`consent.ts`, não em `server.ts`, para o componente cliente importar o tipo sem arrastar `server-only`
junto.

**4. O gatilho de reabertura é do app, não do pacote.** O plano (§10.8) previa um `CookiePreferencesTrigger`
exportado por `@repo/analytics`. O pacote exporta o hook `useCookieConsent()`; a `web` renderiza um link de
rodapé e a `app` um `DropdownMenuItem`. São duas peças de chrome com aparência diferente, e um componente
único teria de aceitar props de estilo dos dois.

**5. O `Switch` dos necessários não usa a prop `label`.** Em 390 px de largura "Sempre ativo" quebrava em
duas linhas dentro do rótulo do `Switch`. O texto virou um `<span>` com `whitespace-nowrap` ao lado do
controle.

**6. Um teste a mais em `apps/app`.** O plano (§7, decisão 15) dispensava teste de componente. Como o item
do `ProfileDropdown` não deu para exercitar no browser (ver abaixo), ele ganhou o teste jsdom que o próprio
plano apontava como caminho barato.

## Confirmações

O inventário de 6 cookies da §2 do plano confere. Recontei com `grep` de `document.cookie` e
`cookieStore.set` em `apps/` e `packages/`: `access-token`, `x-locale`, `x-theme`,
`bp:panel-request-role`, `bp:impersonate-firebase-uid`, `sidebar_state`. Com o de consentimento, sete.

---

## Validação

- `pnpm turbo run lint typecheck test` — 24 tarefas, todas passando.
- `pnpm check` — 540 arquivos, zero erro.
- `pnpm --filter @repo/analytics test` — 34 testes (2 arquivos).
- `pnpm --filter @repo/shared test` — 44 testes, sendo 19 em `cookies.test.ts` (eram 15).
- `pnpm --filter @repo/internationalization test` — 27 testes, incluindo a paridade dos 3 idiomas.
- `pnpm --filter app test` — 277 testes (eram 274).
- `pnpm --filter web build` e `pnpm --filter app build` — os dois concluem. Rodaram com
  `NEXT_PUBLIC_GA_MEASUREMENT_ID=""`, ou seja, o build passa em modo degradado.

## Validação visual

Subi servidores próprios em 3010 (`app`) e 3011 (`web`), com `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-TEST00000` e
`NEXT_PUBLIC_WEB_URL=http://localhost:3011` na linha de comando. As portas 3000 e 3001 estavam ocupadas por
outro projeto e não mexi nelas. Não alterei nenhum `.env`, e matei os dois processos no fim.

O que percorri e observei:

- **Modo degradado**, antes de configurar tag nenhuma: `GET /pt-br` e `GET /pt-br/sign-in` respondem 200, o
  HTML não traz o script do Consent Mode, não traz banner e o rodapé não traz o link de preferências.
- **Primeira visita** com tag configurada: o banner aparece nos dois apps e o HTML inicial não cita
  `googletagmanager` nenhuma vez.
- **Recusar tudo**: cookie `v1:analytics=denied`, zero script do Google, zero script da Vercel, banner sai.
- **Aceitar / salvar preferências**: cookie `v1:analytics=granted`, a tag carrega e a ordem no `dataLayer` é
  `consent default` → `consent update (granted)` → `js` → `config`.
- **Recarregar**: o banner não volta e o `default` já sai concedido (o defeito descrito acima, revalidado
  depois da correção).
- **Reabrir pelo rodapé da `web`** com escolha feita: o diálogo abre com "Medição de uso" ligado; desligar e
  salvar grava `denied` e empilha um `update` negado.
- **`Esc` sem salvar**: nenhum cookie escrito, banner continua.
- **Teclado**: com foco no link da política, `Tab` percorre recusar → aceitar → preferências e sai do banner
  (não há armadilha de foco); `Enter` em "Recusar tudo" grava a escolha.
- **Cookie corrompido** (`v9:lixo`): banner volta, nenhuma tag, `default` negado.
- **Atravessar os apps**: consentir em `:3010` some com o banner em `:3011`, porque o cookie host-only de
  `localhost` vale para as duas portas.
- **Temas e viewports**: claro, escuro e 390×844 nos dois apps.
- **Idiomas**: pt-br, en e es, com o link da política na locale corrente (`/en/legal/privacy`,
  `/es/legal/privacy`).

Screenshots em [`screenshots/`](screenshots/).

O console do navegador acusa 4 erros na `web`: `<a>` dentro de `<a>` no `NavigationMenuLink` do cabeçalho e
`<button>` dentro de `<button>` no seletor de idioma. Os dois são anteriores a esta tarefa e nenhum vem do
banner.

## O que não validei

- **O item de preferências no `ProfileDropdown` da `app`, no browser.** Ele só existe em tela autenticada, e
  aqui não há como autenticar: os emuladores do Firebase exigem JDK 21 e a máquina tem Java 17, enquanto os
  `.env` locais apontam para um projeto Firebase real cujas credenciais de usuário eu não tenho e não devo
  inventar. `apps/app/__tests__/profileDropdownCookieConsent.test.tsx` cobre o comportamento: o item aparece
  quando há consentimento a gerenciar, chama `openPreferences` ao ser acionado e some quando `available` é
  `false`. Sem prova visual fica o diálogo abrindo por cima do menu já aberto.
- **O escopo entre subdomínios reais.** Em `localhost` o cookie é compartilhado de graça, então o
  `SESSION_COOKIE_DOMAIN` não chegou a ser exercitado. Segue como pré-requisito manual.
- **O Consent Mode do lado do Google.** O id que usei é falso; conferi o que sai no `dataLayer`, não o que o
  Google recebe.
- **`VERCEL_ENV` como gate.** Tem teste unitário; nunca rodou numa implantação da Vercel.

## Lacunas para o `/test`

- Duplo clique em aceitar e em recusar (a operação é idempotente por construção, mas não exercitei).
- Fechar e reabrir o navegador, para confirmar que o TTL de 180 dias sobrevive à sessão.
- Admin personificando: a escolha do navegador deve continuar valendo. Depende do mesmo ambiente autenticado
  que faltou aqui.
- JavaScript desligado.

## Dados de QA criados

Nenhuma conta. O único estado é o cookie `bp:cookie-consent` no perfil de navegador do `agent-browser`, em
`localhost`.

## Riscos para o `/review` olhar

1. **A ordem no `dataLayer` depende do `afterInteractive` do `@next/third-parties`.** O provider renderiza o
   script inline antes do `<GoogleAnalytics>`, e foi essa ordem que medi no browser. Uma versão futura que
   mude a estratégia de carregamento quebra a garantia sem quebrar teste nenhum.
2. **O provider virou `"use client"`.** Os `children` continuam renderizando no servidor, porque chegam como
   prop, e os dois builds passam. Ainda assim é a mudança de maior raio da entrega.
3. **`<VercelAnalytics />` deixou de montar incondicionalmente.** Um fork fora da Vercel e sem GA não monta
   mais nada; antes montava sempre.
4. **A locale do banner vem de `getDictionary()`, que lê o cookie `x-locale`.** Na primeira requisição depois
   de trocar de idioma o cookie ainda é o antigo, e a página inteira sai na locale anterior, banner incluído.
   O comportamento é do repositório e não entrou com esta tarefa; usar o segmento `[locale]` só no banner o
   deixaria em desacordo com o resto da página.
