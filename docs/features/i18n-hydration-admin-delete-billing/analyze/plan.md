# Plano: hidratação do dicionário client em `/en` e `/es` + cancelamento da assinatura no arquivamento pelo admin

Tarefa direta, sem spec. Junta dois achados do backlog que o usuário aprovou em 2026-09-25 para tratar numa
tarefa só:

- **H1**, `specs/BACKLOG.md:502`: componente client renderiza em pt-br no servidor em `/en` e `/es`, e a
  hidratação falha.
- **A2**, `specs/BACKLOG.md:430`: o soft delete de usuário pelo admin não cancela a assinatura.

Plano feito em rodada autônoma do `/cycle`. Nenhuma pergunta foi feita ao usuário; as decisões estão na
seção 13, cada uma com a alternativa descartada.

---

## 1. Contexto

### 1.1 Resumo

- **H1.** `getDictionary()` do client (`packages/internationalization/client.ts:7-13`) lê o locale do cookie
  `x-locale` por `getCookie`, que devolve `null` quando não há `window`
  (`packages/internationalization/utils/cookies.ts:2-4`). No SSR todo componente client cai no locale padrão
  (pt-br). No navegador o cookie já diz `en` ou `es` (o proxy grava o cookie a partir da URL em toda
  requisição: `apps/app/proxy.ts:174`, `apps/web/proxy.ts:108`), o React compara e acusa "Hydration failed"
  em toda carga de `/en` e `/es`.
- **A2.** `DELETE /users/[id]` (`apps/api/app/(routes)/users/[id]/route.ts:101-132`) faz o soft delete
  direto (`:117`), sem cancelar a assinatura. A pessoa arquivada continua sendo cobrada e, depois disso,
  `findByStripeCustomerId` (`apps/api/(shared)/repositories/user.repository.ts:67-78`) pula o perfil
  arquivado, então o webhook deixa de achar o dono da assinatura por esse caminho. A exclusão pelo titular
  já cancela antes de apagar (`apps/api/(shared)/lib/account-erasure.ts:74-97` e `:139-169`).

### 1.2 Objetivos

1. Todo componente client que chama `getDictionary()` renderiza no servidor no mesmo locale que o navegador
   vai usar na hidratação, que é o do segmento `[locale]` da URL. Sem "Hydration failed" em `/en` e `/es`
   nos dois apps.
2. O arquivamento pelo admin cancela a assinatura viva na Stripe **antes** do soft delete, com as mesmas
   regras da exclusão pelo titular: sem assinatura viva não chama a Stripe; Stripe desligada com assinatura
   viva gravada recusa; falha no cancelamento recusa; assinatura que a Stripe já não tem conta como
   cancelada.

### 1.3 Fora do escopo

- Migrar os 63 arquivos que chamam `getDictionary()` para um hook `useDictionary()`. A correção proposta
  (seção 12.1) não exige mexer em nenhum deles.
- `<html lang>` e os Server Components que usam o `getDictionary()` **do servidor** (cookie da requisição)
  em vez da URL. É o achado O4 do backlog ("`<html lang>` segue o cookie `x-locale`, não a URL, na primeira
  carga"), com mecanismo diferente: 26 arquivos importam `@repo/internationalization/server`, e o root
  layout da `apps/app` (`apps/app/app/layout.tsx:38-53`) fica acima do segmento `[locale]` e não é
  re-renderizado numa troca de idioma por navegação suave. Continua aberto.
- Os literais soltos do backlog (`"Switch language"`, `"Pick a date"`, `"Início"`, `DateInput` em inglês).
  Continuam abertos.
- `findByStripeCustomerId` devolver o documento cru sem mapper (`user.repository.ts:77`, achado próprio no
  backlog). Continua aberto.
- Reativar ("desarquivar") usuário, reembolso e cancelamento no fim do período. A exclusão pelo titular
  também cancela na hora, sem reembolso proporcional (`docs/PAYMENTS.md:154-157`).

### 1.4 Corte de MVP

- H1: um provider de locale no pacote de i18n, montado uma vez em cada app, e `getDictionary()` passando a
  ler dele. Nenhum call site muda.
- A2: a checagem de assinatura viva + `cancelSubscriptionForErasure` dentro do handler de `DELETE`, um
  `error.code` novo e uma frase a mais no texto de confirmação do arquivamento.

### 1.5 Apps impactados

| Onde | H1 | A2 |
|------|----|----|
| `packages/internationalization` | `client.ts` (provider + leitura do locale) e teste novo | `apiErrors` (código novo) e texto do arquivamento em `pages/admin/users.ts` |
| `apps/app` | `app/layout.tsx` monta o provider | nenhum código (o erro chega pelo `errorAlert` que já existe) |
| `apps/web` | `app/[locale]/layout.tsx` monta o provider | N/A |
| `apps/api` | N/A | `users/[id]/route.ts` e teste novo |
| `packages/sdk` | N/A | N/A (contrato inalterado: 204 ou erro) |
| `packages/design-system`, `packages/auth` | nenhuma mudança (passam a funcionar pelo provider) | N/A |

- **Área do painel.** H1: comum, admin e telas públicas dos dois apps. A2: admin (`requireAdminApi`).
- **Modo de produto.** H1: N/A. A2: a regra não olha o modo, igual ao titular (`account-erasure.ts:74-97`
  não consulta `isSubscriptionMode`). Num fork em `simple` sem Stripe nenhum perfil tem assinatura viva e o
  arquivamento segue como hoje.
- **Assinatura/plano.** A2 depende de `profile.subscription` e de `isLiveSubscription`
  (`apps/api/(shared)/lib/billing-state.ts:16-22`; status vivos em
  `packages/sdk/src/types/payments/payments.ts:20-26`: `active`, `trialing`, `past_due`, `unpaid`,
  `paused`).
- **Dependências externas e env.** Nenhuma variável nova. A2 usa `STRIPE_SECRET_KEY` pelo `getStripe()`
  que já existe (`packages/payments/index.ts:14-24`).
- **Genérico × específico.** As duas mudanças são do core. O provider fica em `packages/internationalization`
  porque o defeito é do helper compartilhado (política §3, "corrigir na raiz").

### 1.6 Fontes

- `specs/BACKLOG.md:430` e `:502`, lidos nesta rodada.
- `docs/features/admin-billing-insights/STATE.md` (o `/test` dessa feature registrou o sintoma como D2).
- Nenhum link externo, Figma ou print. Nada em "Referências não lidas".

---

## 2. Inventário de H1 (evidência)

Levantado com `grep -rln '@repo/internationalization/client' apps packages` (sem `node_modules`/`.next`):

| Grupo | Arquivos | Observação |
|-------|---------:|------------|
| Importam `@repo/internationalization/client` | **80** | 68 de produção + 12 testes em `apps/app/__tests__/` |
| Produção que chama `getDictionary()` | **63** | 50 em `apps/app`, 7 em `apps/web`, 5 em `packages/design-system`, 1 em `packages/auth` |
| Produção que só usa `getDictionaryForLocale(locale)` | 5 | `admin/routes.tsx:14`, `(common)/routes.tsx:16`, `PanelNavbarControls.tsx:32`, `apps/web/.../cookiePreferencesButton.tsx:14`, `design-system/.../cookie-consent.tsx:107`. Já leem o locale da URL e não têm o defeito |

Onde cada chamada de `getDictionary()` roda (script que acha a função que envolve cada chamada):

- **61 dos 63** chamam no corpo de um componente ou hook (nome em PascalCase ou `useX`), ou seja, durante
  o render. Exemplos: `AdminHomeClient.tsx:22`, `Sidebar.tsx:64`, `table.tsx:70`,
  `packages/auth/provider.tsx:126`.
- **2** chamam dentro de função comum:
  - `packages/design-system/index.tsx:25`: `getRedirectPath`, um callback passado ao `AuthProvider`. Só é
    invocado por `redirectPath()` (`packages/auth/provider.tsx:131` e `:381`), dentro de callbacks
    assíncronos, então só roda no navegador.
  - `apps/app/shared/lib/formatDisplayDateTime.ts:26`: função pura. O único chamador é
    `useFormatDisplayDateTime()` (`:37-41`), cujo retorno é chamado pelas colunas das tabelas
    (`UsersListClient.tsx:44,54`, `AuditListClient.tsx:45`, `EntitiesListClient.tsx:91`) e por
    `EntityFormFields.tsx:87`. A coluna do antd é chamada pelo `useCellRender` do `rc-table`, que usa o
    `useMemo` do `rc-util` (baseado em `useRef`, executado no corpo do render:
    `node_modules/.pnpm/rc-table@7.54.0_.../rc-table/lib/Cell/useCellRender.js:30-41`). Então também roda
    durante o render.

Conclusão: no servidor, **toda** chamada de `getDictionary()` acontece durante o render de um componente.
As chamadas fora de render só existem no navegador. É isso que permite corrigir sem mexer nos call sites.

Por que o `curl` do backlog devolve pt-br e as páginas RSC não: os Server Components usam o `getDictionary()`
do servidor, que lê o cookie pela requisição (`packages/internationalization/server.ts:18-35`). O defeito é
só do client.

Precedente de ler o locale da URL num provider montado no root layout: `useAuthRequestPanel()` usa
`useParams()` (`apps/app/shared/providers/AuthRequestPanelContext.tsx:172-173`) e é montado por
`ClientLayout`, dentro do root layout (`apps/app/app/layout.tsx:87`). `LanguageSwitcher` e
`PanelNavbarControls` também leem `params.locale` (`LanguageSwitcher.tsx:40-41`,
`PanelNavbarControls.tsx:30-32`).

---

## 3. Dados (Firestore)

- H1: N/A.
- A2: nenhuma coleção nem campo novo. O handler lê `profile.subscription` (já gravado pelo webhook) do
  documento que `userRepository.findById` devolve (`base.repository.ts:143-151`, que já filtra
  `deletedAt`). O soft delete continua sendo `userRepository.delete(id)` (`base.repository.ts:225-227`).
- Nenhum índice, nenhuma regra do Firestore, nenhum backfill.
- Depois do arquivamento, o snapshot `subscription` do perfil arquivado pode ficar com `status: "active"`:
  o `customer.subscription.deleted` chega depois do soft delete, `findByStripeCustomerId` pula o perfil
  arquivado e o fallback por `metadata.profileId` usa `findById`, que também pula
  (`webhooks/payments/route.ts:57-77`). O webhook só registra `webhook-profile-not-found` e responde 200
  (`:28-32`, `:100-102`), sem reentrega. Não afeta nenhuma leitura: `countLiveSubscriptionsByPrice` descarta
  arquivados em memória (`user.repository.ts:243-245`) e `identifyByStripeCustomerIds` também (`:302-307`).
  Fica registrado; corrigir o snapshot não entra no corte.

---

## 4. Contrato `@repo/sdk`

N/A nas duas frentes. `apiClient.users.delete` continua recebendo 204 no sucesso; o erro novo chega como
`{ error: { code } }`, como os outros.

---

## 5. API (`apps/api`), só A2

### 5.1 Rota e guard

`DELETE /users/[id]`, `requireAdminApi<RouteIdParamsContext>` (sem mudança). Ownership: N/A (admin).

### 5.2 Comportamento novo

Ordem dentro do handler, depois do 404 e da leitura do rótulo de auditoria (`route.ts:106-115`):

1. `profile.subscription` ausente ou não viva (`isLiveSubscription`) → segue para o soft delete, sem tocar
   na Stripe. É o caso de todo fork sem cobrança.
2. Viva e `getStripe()` devolve `null` (Stripe desligada) → **503 `USERS_DELETE_BILLING_FAILED`**, nada é
   arquivado, nenhum evento de auditoria. Mesma regra do titular (`account-erasure.ts:70-92`): arquivar
   apagaria o único vínculo com um cliente que segue pagando.
3. Viva e Stripe configurada → `cancelSubscriptionForErasure(stripe, subscription.subscriptionId)`
   (`apps/api/(shared)/lib/billing.ts:161-174`).
   - `resource_missing` já é engolido pelo helper e conta como cancelado → segue.
   - Qualquer outra exceção → **503 `USERS_DELETE_BILLING_FAILED`**, nada é arquivado, nenhum evento de
     auditoria.
4. Soft delete e evento `USER_DELETE`, como hoje (`route.ts:117-128`). 204.

Nos dois caminhos de falha, uma linha de log sem PII:
`logEvent("payments", "admin-user-delete-billing-failed", { requestId, reason })`, com `reason` igual a
`"billing-not-configured"` ou ao `error.name` (mesma regra de `reasonOf`, `account-erasure.ts:35-39`: só o
nome, nunca a mensagem do provedor). `LogScope` `"payments"` já existe
(`packages/shared/utils/helpers/log.ts:5-14`).

Se o cancelamento passar e o soft delete falhar (Firestore fora), a exceção sobe como hoje. O perfil fica
vivo com a assinatura cancelada; o webhook o encontra e grava `canceled`; uma nova tentativa do admin cai no
passo 1 e arquiva. Não há estado sem saída.

### 5.3 Erros

| `error.code` | status | quando |
|--------------|--------|--------|
| `USERS_NOT_FOUND` | 404 | sem mudança |
| `USERS_DELETE_BILLING_FAILED` (novo) | 503 `HTTP_STATUS.SERVICE_UNAVAILABLE` | assinatura viva e Stripe desligada, ou `subscriptions.cancel` falhou |

503 pelo mesmo motivo do titular (`account/deletion/route.ts:81-91`): nada foi alterado e a operação pode ser
repetida.

### 5.4 Import e as suítes que já importam a rota

`billing.ts` importa `@/env` (`billing.ts:5`), e as 9 suítes da API que carregam `billing.ts` mockam
`@/env` (padrão em `apps/api/__tests__/accountErasure.test.ts:79-86`). Duas suítes já importam
`users/[id]/route.ts` sem esse mock: `usersAdminAuditTrail.test.ts:65` e `mergedUserPayload.test.ts`. Se a
coleta delas quebrar com o import novo, acrescente `vi.mock("@/env", ...)` e
`vi.mock("@repo/payments", () => ({ getStripe: () => null }))` nas duas, com o mesmo formato do
`accountErasure.test.ts`. Nenhuma asserção muda: os perfis dessas suítes não têm assinatura.

---

## 6. Front-end

### 6.1 H1

- `apps/app/app/layout.tsx:75-94`: `<LocaleProvider>` envolve o conteúdo do `<body>` (acima do
  `QueryProvider`), para cobrir também o `AuthProvider` do `DesignSystemProvider` e o `ClientLayout`.
- `apps/web/app/[locale]/layout.tsx:32-51`: idem, envolvendo o `QueryProvider`; cobre `Header` e `Footer`.
- Os layouts continuam Server Components; `LocaleProvider` entra como referência client e não recebe prop.
- Nenhum call site muda. `formatDisplayDateTime.ts` também não (seção 2).

### 6.2 A2

Sem código no app. `deleteUserMutation` já mostra o erro por `errorAlert(formatClientError(error))`
(`admin/(pages)/users/(hooks)/useUserCrud.tsx`), que traduz o `code` pelo `apiErrors`. A frase da
confirmação muda só na tradução (seção 7).

---

## 7. i18n

| Chave | pt-br | en | es |
|-------|-------|----|----|
| `packages.shared.utils.apiErrors.USERS_DELETE_BILLING_FAILED` (`translations/packages/shared/utils.ts`, junto de `USERS_NOT_FOUND` em `:30`, `:140`, `:248`) | "Não foi possível cancelar a assinatura deste usuário, então ele não foi arquivado. Tente de novo em instantes." | "We couldn't cancel this user's subscription, so they were not archived. Try again in a moment." | "No pudimos cancelar la suscripción de este usuario, así que no se archivó. Inténtalo de nuevo en unos instantes." |
| `apps.app.pages.admin.users...archive.confirmDescription` (`translations/apps/app/pages/admin/users.ts:32-33`, `:88-89`, `:143-144`) | acrescentar ao fim: " Se houver assinatura ativa, ela é cancelada na hora." | " If there is an active subscription, it is canceled right away." | " Si hay una suscripción activa, se cancela de inmediato." |

O texto atual da confirmação ("o cadastro é preservado") ficaria incompleto depois da mudança, porque a
assinatura não é preservada. Por isso a frase entra no corte (decisão D6).

Paridade: `pnpm --filter @repo/internationalization test` (`__tests__/parity.test.ts`). Use `/i18n-sync`.

---

## 8. Autorização e segurança

- A2 mantém `requireAdminApi`; o cancelamento só acontece depois do guard e do 404. Nenhum id vem do body.
- Log sem PII: só `requestId` e o nome do erro.
- O arquivamento passa a ter efeito financeiro irreversível. Quem pode fazê-lo não muda (admin).
- Impersonação: N/A. O admin arquiva pela área admin, fora do contexto de sujeito.
- H1: estado de módulo no servidor é compartilhado entre requisições concorrentes. O desenho da seção 12.1
  não grava nada em módulo no servidor: lá o locale vem do contexto React, que é por árvore de render e
  portanto por requisição. O teste H1-T4 prova isso com duas renderizações intercaladas.
- Rate limit, CORS, `firestore.rules`: N/A.

---

## 9. Testes

Todos Vitest, sem processo externo.

### 9.1 H1: `packages/internationalization/__tests__/localeProvider.test.ts` (novo, ambiente `node`)

Monta com `createElement` (o pacote não tem JSX configurado) e `react-dom/server`. Mock de
`next/navigation` (`useParams: () => paramsMock()`), com `vi.resetModules()` + `await import("../client")`
em cada teste para zerar o estado de módulo do ramo do navegador. `Probe` é um componente que renderiza
`getDictionary().locale` e uma string conhecida do dicionário.

| id | Cenário | Prova |
|----|---------|-------|
| H1-T1 | `renderToString(LocaleProvider > Probe)` sem `window`, `useParams → { locale: "en" }` | HTML com `en` e a string em inglês. **Hoje sai `pt-br`**: é o defeito reproduzido |
| H1-T2 | `it.each(locales)` do T1 | os três idiomas |
| H1-T3 | `useParams → { locale: "fr" }` e `→ {}` | cai em `resolveLocale` (padrão) sem lançar |
| H1-T4 | Duas renderizações concorrentes com `renderToReadableStream`: a de `en` suspende num `Suspense` com promise pendente, a de `es` termina, depois a promise resolve | a de `en` termina com `en`. O locale é por requisição, não por módulo |
| H1-T5 | Depois de renderizar com `es` no servidor, `renderToString(Probe)` sem provider | padrão (pt-br). O servidor não guardou nada em módulo |
| H1-T6 | Com `vi.stubGlobal("window", {})` e `document.cookie = "x-locale=pt-br"`: renderiza o provider com `en` e depois chama `getDictionary()` fora do render | `en`. No navegador, a URL vence o cookie velho, e o callback fora de render (`design-system/index.tsx:25`) recebe o locale certo |
| H1-T7 | Ramo do navegador sem provider montado, cookie `x-locale=es` | `es` (comportamento atual preservado para árvores sem provider, como o `global-error`) |

T1 e T6 juntos fixam o contrato da hidratação: servidor e navegador dão o mesmo locale para a mesma URL.
A prova de que o React não acusa mais o erro é do `/test` (seção 10), porque exige o Next de pé.

`cookies.test.ts` e `resolveLocale.test.ts` continuam como estão.

Dependências de dev do pacote: `react-dom` (19.2.0), `@types/react` (19.2.2) e `@types/react-dom` (19.2.2).
Já estão no lockfile (`apps/app/package.json:31-32,45-46`) e o `.npmrc` iça tudo
(`public-hoist-pattern[]=*`), então nenhum pacote novo entra no repositório. Declare no
`packages/internationalization/package.json` e rode `pnpm install --offline`; se falhar sem rede, confie no
hoist e registre no handoff.

### 9.2 A2: `apps/api/__tests__/usersAdminDeleteBilling.test.ts` (novo)

Mocks no formato de `usersAdminAuditTrail.test.ts:8-63` (repositório, guard via `resolve-api-actor`,
`audit-recorder`, `audit-label`, `@repo/auth/server`) mais `@repo/payments` (`getStripe`), `@/env` e
`@repo/shared/utils/helpers/log`. `billing.ts` e `billing-state.ts` reais, para exercitar o
`cancelSubscriptionForErasure` de verdade com `stripe.subscriptions.cancel` mockado.

| id | Cenário | Esperado |
|----|---------|----------|
| A2-T1 | assinatura `active` | `subscriptions.cancel("sub_…")` chamado **antes** de `userRepository.delete` (ordem conferida), 204, `USER_DELETE` gravado |
| A2-T2 | `it.each` com `trialing`, `past_due`, `unpaid`, `paused` | cancela |
| A2-T3 | sem `subscription` | `getStripe` e `cancel` não chamados, 204 |
| A2-T4 | `canceled` e `incomplete_expired` | não cancela, 204 |
| A2-T5 | viva e `getStripe() → null` | 503 `USERS_DELETE_BILLING_FAILED`, `delete` e `recordAuditEvent` não chamados, log com `reason=billing-not-configured` |
| A2-T6 | `cancel` lança erro com `name: "StripeConnectionError"` | 503 `USERS_DELETE_BILLING_FAILED`, sem `delete`, sem auditoria, log com `reason=StripeConnectionError` |
| A2-T7 | `cancel` lança `{ code: "resource_missing" }` | 204, `delete` chamado |
| A2-T8 | perfil inexistente | 404 `USERS_NOT_FOUND`, Stripe não tocada |

`pnpm --filter api test` inteiro, incluindo as duas suítes da seção 5.4.

---

## 10. O que o `/test` vai percorrer

Instrumento para H1, em ordem de custo:

1. `curl` do HTML de SSR, com o cookie `x-locale` igual à URL (caso normal) e sessão de admin do emulador:
   `/en/admin` e `/es/admin` sem "Olá", "Atividade", "Cobrança" e com os equivalentes do idioma (é o repro de
   `BACKLOG.md:502`). Repetir em `/en/sign-in` (formulário client, anônimo), `/en/admin/users` (data da
   coluna de último acesso no formato inglês), `/en/entities` e `/en/account` (conta comum), e na web
   `http://localhost:3001/en` e `/es` (header client).
2. `agent-browser`, console aberto, **sem** "Hydration failed" nem "did not match" em: `/en/admin`,
   `/es/admin`, `/en`, `/en/entities`, `/en/account`, `/en/sign-in`, web `/en` e `/es`. `/pt-br/admin` como
   controle.
3. Troca de idioma pelo `LanguageSwitcher` (navegação suave, `router.push`, `LanguageSwitcher.tsx:44-54`):
   de `/en/entities` para `/es/entities`, textos de componentes client (sidebar, breadcrumb, tabela) mudam
   para espanhol sem recarregar e sem aviso de hidratação. Em seguida, disparar um toast (ex.: salvar
   formulário inválido na API) e conferir que sai em espanhol.
4. Cookie divergente da URL: `x-locale=pt-br` e abrir `/en/sign-in`. Esperado: componentes client em inglês
   e sem erro de hidratação. Server Components e `<html lang>` podem sair em pt-br: é o O4, fora do escopo,
   registrar como observado e não como reprovado.
5. Light + dark + mobile (375 px) em `/en/admin` e web `/en`: nenhuma mudança visual esperada; basta
   conferir que nada quebrou.

Instrumento para A2:

- Coberto por A2-T1..T8. O fluxo pelo browser só dá para percorrer até o ponto que não exige Stripe real:
  arquivar pela listagem `/pt-br/admin/users` um usuário **sem** assinatura (204 e toast "Usuário arquivado
  com sucesso.") e conferir a frase nova do diálogo de confirmação nos 3 idiomas.
- Com um perfil de QA no emulador com `subscription.status = "active"` gravado à mão e a API sem
  `STRIPE_SECRET_KEY`: arquivar mostra o toast do `USERS_DELETE_BILLING_FAILED` e o usuário continua na
  listagem.
- 🔒 Cancelamento real numa conta Stripe de teste (assinatura some do dashboard) exige conta no provedor.
  Fica não verificado.

Dados de QA: contas `qa-i18n-hydration-admin@example.com` e `qa-i18n-hydration-common@example.com` no
emulador; listar no relatório para limpeza.

---

## 11. Critérios de aceite (resumo para o `/test` expandir no formato §9.1 do guia)

1. SSR em `/en` e `/es` sai no idioma da URL em todo componente client.
2. Sem "Hydration failed" nas rotas da seção 10, nos dois apps.
3. Troca de idioma por navegação suave atualiza componentes client e mensagens de callback.
4. pt-br sem regressão.
5. Arquivar usuário sem assinatura: 204, igual a antes.
6. Arquivar usuário com assinatura viva: cancela antes do soft delete.
7. Stripe desligada com assinatura viva: 503 `USERS_DELETE_BILLING_FAILED`, usuário continua ativo, mensagem
   traduzida nos 3 idiomas.
8. Falha da Stripe: idem ao 7.
9. Assinatura que a Stripe já não tem: arquiva normalmente.
10. Diálogo de arquivamento avisa do cancelamento nos 3 idiomas.
11. Gates do CI: `pnpm turbo run lint typecheck test`.

---

## 12. Blueprint técnico

### 12.1 H1: `packages/internationalization/client.ts`

Antes (`client.ts:7-13`): `resolveLocale(getCookie("x-locale"))`.

Depois (esboço; o `/develop` ajusta nomes):

```ts
"use client";

import { useParams } from "next/navigation";
import { createContext, createElement, type ReactNode, use } from "react";
import { globalTranslations } from "./translations/global";
import { type IGetDictionaryResponse, type Locale, resolveLocale } from "./utils";
import { getCookie } from "./utils/cookies";

const LocaleContext = createContext<Locale | null>(null);

let browserLocale: Locale | null = null;

function readActiveLocale(): string | null {
    if (typeof window === "undefined") {
        return use(LocaleContext);
    }
    return browserLocale ?? getCookie("x-locale");
}

export function LocaleProvider({ children }: { children: ReactNode }) {
    const params = useParams<{ locale?: string }>();
    const locale = resolveLocale(params?.locale);
    if (typeof window !== "undefined") {
        browserLocale = locale;
    }
    return createElement(LocaleContext.Provider, { value: locale }, children);
}

export function getDictionary(): IGetDictionaryResponse {
    const l = resolveLocale(readActiveLocale());
    return { dictionary: globalTranslations[l], locale: l };
}

// getDictionaryForLocale inalterado
```

Como funciona:

- **No servidor**, `getDictionary()` lê o locale do contexto React com `use()`. Isso só é válido durante o
  render, e a seção 2 mostra que no servidor toda chamada acontece durante o render. O contexto é por
  árvore, então duas requisições concorrentes não se enxergam. O servidor nunca grava `browserLocale`.
- **No navegador**, o provider grava `browserLocale` durante o próprio render, antes dos filhos, e
  `getDictionary()` lê dele. Assim a primeira renderização da hidratação usa o mesmo locale do servidor, e
  as chamadas fora de render (callbacks, toasts) também. Estado de módulo no navegador é por aba. O cookie
  fica como fallback para árvore sem provider.
- **Troca de idioma**: `useParams()` muda na navegação suave, o provider re-renderiza com o locale novo e os
  filhos do segmento `[locale]` renderizam de novo com ele.
- `resolveLocale` continua sendo o funil de validação (`utils.ts:20-32`).

Comentário no código: um só, de 1 a 2 linhas acima de `readActiveLocale`, com a regra não evidente (no
servidor o locale vem do contexto porque o módulo é compartilhado entre requisições; no navegador vem da
última URL renderizada). Nada de citar backlog ou plano.

Biome: o esboço acima passou por `biome lint --stdin-file-path=packages/internationalization/client.ts` sem
diagnóstico nesta análise. O `/develop` confirma com `pnpm check`.

Layouts (pseudo-diff):

```diff
// apps/app/app/layout.tsx
+import { LocaleProvider } from "@repo/internationalization/client";
 ...
             <body>
+                <LocaleProvider>
                 <QueryProvider>
                     ...
                 </QueryProvider>
+                </LocaleProvider>
             </body>
```

```diff
// apps/web/app/[locale]/layout.tsx
+import { LocaleProvider } from "@repo/internationalization/client";
 ...
             <body>
+                <LocaleProvider>
                 <QueryProvider>
                     ...
                 </QueryProvider>
+                </LocaleProvider>
             </body>
```

`package.json` do pacote: devDependencies da seção 9.1. `exports` não muda (`./client` continua
`./client.ts`).

### 12.2 A2: `apps/api/app/(routes)/users/[id]/route.ts`

```diff
+import { getStripe } from "@repo/payments";
+import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
+import { logEvent } from "@repo/shared/utils/helpers/log";
+import { cancelSubscriptionForErasure } from "@/(shared)/lib/billing";
+import { isLiveSubscription } from "@/(shared)/lib/billing-state";
 ...
+type BillingCancellation = { ok: true } | { ok: false; reason: string };
+
+async function cancelLiveSubscription(profile: UserDTO): Promise<BillingCancellation> {
+    const subscription = profile.subscription;
+    if (!(subscription && isLiveSubscription(subscription))) {
+        return { ok: true };
+    }
+    const stripe = getStripe();
+    if (!stripe) {
+        return { ok: false, reason: "billing-not-configured" };
+    }
+    try {
+        await cancelSubscriptionForErasure(stripe, subscription.subscriptionId);
+        return { ok: true };
+    } catch (error) {
+        return { ok: false, reason: error instanceof Error ? error.name : "unknown" };
+    }
+}
 ...
 export const DELETE = requireAdminApi<RouteIdParamsContext>(
     async (req, ctx) => {
         ...
         const targetLabel = await resolveUserAuditLabel(profile.reference_id);
 
+        const billing = await cancelLiveSubscription(profile);
+        if (!billing.ok) {
+            logEvent("payments", "admin-user-delete-billing-failed", {
+                requestId: requestIdFrom(req),
+                reason: billing.reason,
+            });
+            return Response.json(
+                { error: { code: "USERS_DELETE_BILLING_FAILED" } },
+                { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
+            );
+        }
+
         await userRepository.delete(id);
         ...
```

`UserDTO` vem de `@repo/sdk/src/types` (já importado para `AuditAction`). A leitura do rótulo pode ficar
antes ou depois do cancelamento; manter antes deixa o diff menor.

Resposta de exemplo no erro:

```json
{ "error": { "code": "USERS_DELETE_BILLING_FAILED" } }
```

### 12.3 Documentação (medir e corrigir ao passar, política §4)

| Arquivo | Mudança |
|---------|---------|
| `docs/PAYMENTS.md:152-157` | bullet novo: o arquivamento pelo admin cancela a assinatura viva antes do soft delete, 503 `USERS_DELETE_BILLING_FAILED` nas mesmas condições do titular |
| `docs/PAYMENTS.md:165-166` | tirar "cancelar a assinatura quando o admin faz soft delete…, que hoje não cancela" de "Fora do corte" |
| `docs/PRE-PRODUCTION.md:477-478` | "a exclusão de conta cancela só essa" passa a citar também o arquivamento pelo admin |
| `docs/ARCHITECTURE.md:64`, `AGENTS.md:25`, `apps/app/CLAUDE.md:47` | o `getDictionary()` do client segue o segmento `[locale]` via `LocaleProvider` (montado nos root layouts); o cookie fica como fallback. O do servidor segue lendo o cookie |
| `AGENTS.md:52` | sem mudança (continua verdade: o locale de `formatDisplayDateTime` vem de `getDictionary()`) |

`specs/BACKLOG.md` não é editado aqui: fechar os achados é do `/spec --sync`.

### 12.4 Ordem de implementação e de commit

Há duas frentes independentes. Ordem sugerida, um commit por app/pacote e por assunto:

1. `feat(internationalization): resolve the client dictionary locale from the route segment` (`client.ts`,
   `package.json`, lockfile se mudar, `localeProvider.test.ts`)
2. `fix(app): mount the locale provider in the root layout`
3. `fix(web): mount the locale provider in the root layout`
4. `fix(api): cancel the live subscription before an admin archives a user` (rota + teste novo + mocks nas
   duas suítes, se precisar)
5. `feat(internationalization): add USERS_DELETE_BILLING_FAILED and warn about cancellation on archive`
6. `docs: document locale provider and admin archive cancellation`
7. `docs(features): i18n-hydration-admin-delete-billing` (último)

O commit 1 precisa vir antes de 2 e 3 (o import não existe sem ele). O working tree desta rodada já tem
mudanças da auditoria do backlog (`specs/BACKLOG.md`, renames de spec); o `/review` separa em
`docs(specs)`.

### 12.5 Env e configuração

Nenhuma variável nova. Nenhum pré-requisito manual de infraestrutura: nada a provisionar, nenhum webhook
novo (o `customer.subscription.deleted` já é um dos eventos cadastrados), nenhum índice. Nada entra no
`docs/PRE-PRODUCTION.md` como pendência nova.

### 12.6 Rollback

Reverter os commits. H1 não grava dado. A2 não grava dado novo; assinaturas canceladas enquanto a mudança
esteve no ar continuam canceladas na Stripe, que é o comportamento desejado.

---

## 13. Decisões tomadas sem perguntar

| id | Decisão | Alternativa descartada e por quê |
|----|---------|----------------------------------|
| D1 | H1 corrigido dentro de `getDictionary()`: contexto React no servidor, locale da última URL renderizada no navegador. **Zero** dos 63 call sites muda | Provider + hook `useDictionary()` migrando 63 arquivos e os mocks de 12 testes (`vi.mock("@repo/internationalization/client")`). Mesmo efeito, raio de impacto uma ordem de grandeza maior, e ainda deixaria as 2 chamadas fora de render sem solução |
| D2 | Provider lê `useParams()` em vez de receber o locale por prop | Prop vinda do servidor: o root layout da `apps/app` fica acima de `[locale]` e não re-renderiza na troca de idioma por `router.push` (`LanguageSwitcher.tsx:53`), então a prop ficaria velha. Criar `apps/app/app/[locale]/layout.tsx` para isso deixaria o `AuthProvider` (root layout) fora do provider |
| D3 | No navegador, estado de módulo gravado pelo provider durante o render | Ler `window.location.pathname` em `getDictionary()`: na navegação suave o App Router atualiza a URL depois do commit, então o render do destino leria o idioma anterior. Gravar em `useLayoutEffect`: roda depois dos filhos, e a hidratação leria o cookie |
| D4 | No servidor, `use(LocaleContext)` sem `try/catch` | Envolver em `try/catch` para tolerar chamada fora de render: o React registra "Invalid hook call" no console antes de lançar, e engolir o erro esconderia um uso errado. Hoje nenhuma chamada fora de render roda no servidor (seção 2) |
| D5 | `formatDisplayDateTime.ts` não muda | Passar o locale como parâmetro a partir do hook. Seria mais explícito, mas a chamada já acontece durante o render (via `rc-util` `useMemo`, que roda no corpo do componente) e, mesmo dentro do `useMemo` do React, o Fizz devolve o valor do contexto e só avisa em dev (`react-dom-server.node.development.js:3934-3940`). Mudança fora do necessário |
| D6 | A frase de aviso de cancelamento entra no diálogo de arquivamento | Deixar o texto como está: ele diz que "o cadastro é preservado" e passaria a omitir um efeito financeiro irreversível |
| D7 | Código novo `USERS_DELETE_BILLING_FAILED` | Reusar `ACCOUNT_DELETION_BILLING_FAILED`: a cópia fala com o titular ("a sua assinatura", `utils.ts:51-52`), e o admin veria uma mensagem em segunda pessoa sobre outra conta. Outro nome considerado: `USERS_SUBSCRIPTION_CANCEL_FAILED`; o escolhido espelha o do titular |
| D8 | Lógica de cancelamento numa função local da rota, chamando `cancelSubscriptionForErasure` | Exportar `cancelBilling` de `account-erasure.ts`: o import traria `storage`, `entity.repository`, `audit-event.repository` e `revokeUserSessions` para a rota e para as suítes que a importam (a mesma armadilha que tirou `ensurePlanLabel` de `billing.ts` em `admin-billing-insights`). Mover a lógica para `billing.ts` e fazer o titular usá-la seria refatorar o fluxo do titular fora da tarefa. Ficam duas cópias da checagem, abaixo do limiar de três da política §3 |
| D9 | Regras de modo degradado e de falha iguais às do titular: sem assinatura viva segue; Stripe desligada com assinatura viva recusa; falha recusa; `resource_missing` segue | Seguir com o arquivamento quando a Stripe falha: a pessoa seria cobrada sem vínculo com o perfil, que é o defeito que a tarefa corrige |
| D10 | O4 (`<html lang>` e Server Components pelo cookie) fica fora | Corrigir junto: mecanismo diferente (26 arquivos do `getDictionary()` do servidor) e, na `apps/app`, o root layout não re-renderiza na troca de idioma. O `/test` registra o que observar no caso de cookie divergente, sem reprovar |
| D11 | Snapshot `subscription` do perfil arquivado pode ficar `active` | Gravar `canceled` no perfil no mesmo handler: nenhuma leitura usa o snapshot de arquivado (seção 3), e o webhook seria o dono dessa escrita |

---

## 14. Perguntas em aberto

Todas já têm uma opção adotada; nenhuma bloqueia o `/develop`.

1. **O aviso no diálogo de arquivamento deve ser condicional?** O diálogo é o mesmo para qualquer usuário, e
   a UI da listagem não sabe se aquele usuário tem assinatura viva.
   Opções: (a) frase fixa "Se houver assinatura ativa, ela é cancelada na hora."; (b) frase só quando o
   usuário tem assinatura, o que exige expor o status na listagem; (c) sem aviso.
   **Adotada: (a).** Informa sem mudar contrato nem DTO.
2. **O arquivamento pelo admin deve cancelar na hora ou no fim do período pago?**
   Opções: (a) na hora, como o titular (`subscriptions.cancel`); (b) `cancel_at_period_end`.
   **Adotada: (a).** É o que o usuário decidiu ("chamar `cancelSubscriptionForErasure`") e mantém uma regra
   só para os dois caminhos. (b) deixaria a pessoa com acesso pago a um perfil arquivado.
3. **Vale fechar o O4 (`<html lang>` e Server Components pelo cookie) numa próxima tarefa?** Depois desta
   correção, com cookie divergente da URL, a página pode sair com texto de Server Component em pt-br e texto
   de componente client em inglês, sem erro de hidratação. Antes, saía tudo em pt-br e o React reescrevia.
   Opções: (a) tarefa direta nova para o `getDictionary()` do servidor ler o locale da URL; (b) deixar como
   está. **Adotada: (a) como recomendação**, sem implementar aqui (D10).
