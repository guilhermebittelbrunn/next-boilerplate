# Consentimento de cookies e Consent Mode — análise e blueprint

Spec de origem: [`specs/cookie-consent.md`](../../../../specs/cookie-consent.md). Roteiro:
[`docs/feature-analysis-guide.md`](../../../feature-analysis-guide.md).

Rodada autônoma do `/cycle`: onde faltava decisão, o plano decidiu. A lista completa está na seção
"Decisões tomadas sem perguntar", no fim.

---

## 1. Contexto da tarefa

Hoje o `AnalyticsProvider` sobe as tags de medição sem perguntar nada ao visitante.
`packages/analytics/provider.tsx:15` monta o Vercel Analytics em toda requisição e `:16-18` monta o
Google Analytics assim que `NEXT_PUBLIC_GA_MEASUREMENT_ID` existir. Não há checagem de consentimento em
lugar nenhum do repositório. O provider é montado em `apps/app/app/layout.tsx:63`, ou seja, envolve o
painel inteiro.

A tarefa insere uma camada entre o visitante e essas tags: nada de medição carrega antes de uma escolha
explícita, a escolha fica guardada num cookie que os dois apps leem, e ela pode ser revista depois.

### Objetivos

- Nenhuma tag de medição carrega antes da escolha do visitante.
- Aceitar tudo e recusar tudo com o mesmo peso visual, no primeiro nível.
- Segundo nível por categoria de finalidade, com o que não é estritamente necessário desligado por padrão.
- A escolha sobrevive a recarregar e atravessa `apps/app` e `apps/web`.
- Ponto de acesso permanente para rever a escolha.
- Aviso, preferências e link para a política nos 3 idiomas.
- Os quatro sinais do Consent Mode v2 chegam ao Google.

### Fora de escopo

Herdado do corte da spec (`specs/cookie-consent.md:115-124`) e mantido sem discussão: registro auditável
de consentimento, varredura automática de cookies, CMP de terceiro / TCF do IAB, geolocalização do
visitante, consentimento para e-mail de marketing.

Acrescentado por este plano:

- **Ligar analytics na `apps/web`.** A landing passa a exibir o aviso e a gravar a escolha, mas continua
  sem montar tag nenhuma. Segue a recomendação da própria spec (`:174-175`).
- **Página de política de cookies dedicada.** O banner aponta para a política de privacidade que já
  existe (`apps/web/app/[locale]/legal/privacy/page.tsx`). Escrever uma política de cookies separada é
  trabalho de conteúdo jurídico, não de código.
- **Corrigir o `setCookie` para emitir `Secure` nos cookies de tema e locale.** O helper hoje não emite a
  flag (`packages/shared/utils/helpers/cookies.ts:13`). Este plano acrescenta a flag como opção e a usa
  no cookie de consentimento; alterar o comportamento dos outros dois cookies fica como dívida adjacente
  registrada, não como mudança desta tarefa.

### Corte de MVP

A menor fatia vertical que entrega valor observável:

1. Núcleo de consentimento em `packages/analytics`: nome do cookie, formato do valor, leitura no servidor,
   contexto no cliente.
2. Banner (1º nível) e diálogo de preferências (2º nível) em `packages/design-system`, apresentacionais.
3. Os dois layouts passam a alimentar o provider com o que leram do cookie no servidor.
4. Ponto permanente de reabertura: rodapé da `apps/web` e menu de perfil da `apps/app`.
5. Chaves de tradução nos 3 idiomas.

O que **não** é necessário para o valor aparecer e por isso fica de fora: qualquer rota de API, qualquer
documento no Firestore, qualquer alteração no `@repo/sdk`.

### Apps impactados

| Camada | O que muda |
|--------|-----------|
| `packages/analytics` | Núcleo do consentimento; o provider deixa de montar tag direto e passa a depender da escolha. |
| `packages/design-system` | Banner + diálogo de preferências, apresentacionais, reexportados no barrel. |
| `packages/shared` | `setCookie` ganha um parâmetro opcional de `domain`/`secure`. Aditivo. |
| `packages/internationalization` | Namespace novo em `components`, 3 idiomas. |
| `apps/app` | Layout raiz alimenta o provider; item no `ProfileDropdown`. |
| `apps/web` | Layout raiz passa a montar o provider; gatilho no rodapé. |
| `apps/api` | Nada. |
| `packages/sdk` | Nada. |

Área do painel: nenhuma. O banner vive no layout raiz dos dois apps, antes de qualquer grupo de rota, e
aparece igualmente em tela autenticada e não autenticada.

Modo de produto (`subscription` × `simple`): sem diferença. O consentimento não olha para papel, plano
nem assinatura.

Dependência de assinatura/plano: nenhuma.

Dependências externas: só o Google Analytics, que já está no repositório via `@next/third-parties`
(`packages/analytics/package.json`). **Nenhuma dependência nova**, nem npm nem serviço pago.

Genérico ou específico: genérico. Todo fork herda a camada; um fork sem tag de medição configurada não
vê banner nenhum (ver "Modo degradado").

### 1.1 Fontes

A spec é a fonte de requisitos e foi lida por completo. Ela cita o guia orientativo da ANPD e a ePrivacy
2002/58/CE art. 5(3) como origem das regras de interface (`specs/cookie-consent.md:86-97`), e aponta a
nota `specs/research/compliance-trust-baseline.md`. Não há card do ClickUp, Figma, print nem wiki
associados.

**Referências não lidas:** nenhuma.

---

## 2. Inventário de cookies

O banner precisa declarar o que o produto grava. A spec afirma 5 cookies
(`specs/cookie-consent.md:44-53`). A contagem no código dá **6**.

| cookie | escrito em | lido em | categoria |
|--------|-----------|---------|-----------|
| `access-token` | `packages/auth/session.ts:84-88` | `packages/auth/session.ts:94`, `apps/app/proxy.ts:177` | estritamente necessário |
| `x-locale` | `apps/app/proxy.ts:169,173`, `apps/web/proxy.ts:104,108` | `packages/internationalization/client.ts:8`, `server.ts:20` | preferência |
| `x-theme` | `apps/app/shared/lib/themePreference.ts:33,60` | `apps/app/app/layout.tsx:28` | preferência |
| `bp:panel-request-role` | `apps/app/shared/lib/panelState.ts:147` | `apps/app/lib/server/panelSnapshot.ts:35` | estritamente necessário |
| `bp:impersonate-firebase-uid` | `apps/app/shared/lib/panelState.ts:148` | `apps/app/lib/server/panelSnapshot.ts:36` | estritamente necessário |
| `sidebar_state` | `packages/design-system/components/ui/sidebar.tsx:108` | `apps/app/lib/server/sidebarState.ts:14` | preferência |

`sidebar_state` está declarado em `packages/design-system/components/ui/sidebar.tsx:28`, gravado em
`document.cookie` na linha 108 com `max-age` de 7 dias, e lido no servidor por
`apps/app/lib/server/sidebarState.ts:14`. É cookie de primeira parte por qualquer definição, e a spec o
omite.

A auditoria de 2026-09-16 corrigiu um erro real (tirou `bp:panel-state`, que é chave de localStorage,
declarada como `PANEL_STORAGE_KEY` em `apps/app/shared/lib/panelState.ts:20` e usada via
`window.localStorage` nas linhas 161, 187 e 198), mas não percorreu `packages/design-system`. O número
correto é 6, e o cookie de consentimento criado por esta tarefa faz 7.

**Chaves de localStorage**, que a spec pede para tratar em seção separada: `bp:panel-state`
(`panelState.ts:20`) e `theme` (`themePreference.ts:17`). As duas são estritamente necessárias, espelho
local de estado de interface, e entram no texto das preferências como um parágrafo à parte, fora da
tabela de cookies.

---

## 3. Contrato `@repo/sdk`

N/A. O consentimento é decisão do navegador, gravada em cookie, lida pelo servidor de renderização. Nada
trafega pela API.

---

## 4. API (`apps/api`)

N/A neste corte, por decisão da spec (`specs/cookie-consent.md:131`): o registro auditável de quem
consentiu o quê e quando está fora do corte, e é ele que exigiria persistência. Sem ele, não há recurso
a expor.

Como não há borda de API, não há guard, schema Zod, `error.code` nem status novo. A pergunta que a regra
de ouro 4 faz ("a autorização está espelhada no servidor?") se responde aqui pela negativa útil:
**o cookie de consentimento não autoriza nada**. Ele suprime tag de medição no cliente e mais nada.

Três invariantes que o `/develop` e o `/review` devem cobrar, justamente porque não há guard para
protegê-las:

1. O cookie de consentimento **não** é `httpOnly` (o cliente precisa escrevê-lo) e por isso **não pode**
   entrar em nenhuma decisão de autorização, em nenhuma camada. Nenhum handler da `apps/api`, nenhum
   proxy e nenhum Server Component pode ler `bp:cookie-consent` para liberar ou negar acesso.
2. O valor do cookie é entrada não confiável. `parseConsent` trata qualquer coisa que não case com o
   formato esperado como "sem decisão" e nunca lança.
3. O cookie não é enviado à `apps/api` como cabeçalho novo, então `allowHeaders` do CORS
   (`apps/api/(shared)/lib/cors.ts`) não muda.

---

## 5. Front-end

### 5.1 Rotas e renderização

Não há rota nova. O provider é montado nos dois layouts raiz:

- `apps/app/app/layout.tsx:63` (já monta o `AnalyticsProvider`, que passa a receber props).
- `apps/web/app/[locale]/layout.tsx` (não monta hoje; passa a montar).

O layout resolve o cookie no servidor e passa o resultado como prop. É o padrão que a PR #12 deixou
pronto em `apps/app/app/layout.tsx:27-32` para o tema e que `apps/app/lib/server/sidebarState.ts:12-16`
usa para a sidebar, prescrito em `apps/app/CLAUDE.md` na seção de estado persistido no browser. Ler o
cookie dentro de um `useState` de componente cliente faz o servidor renderizar uma coisa e o cliente
outra: quem já respondeu vê o banner piscar.

A `apps/web` não lê cookie nenhum no layout hoje (`apps/web/app/[locale]/layout.tsx:19` só chama
`getDictionary()`). Este plano introduz a primeira leitura.

O banner em si é `"use client"`, porque tem estado e eventos. Os `children` continuam sendo renderizados
no servidor: passar children como prop de um componente cliente não os converte.

### 5.2 Dados

Sem React Query, sem `queryKeys`, sem hook de dados. O estado é um cookie e um `useState` no provider.

### 5.3 Formulários e listas

Sem RHF e sem Zod: o segundo nível tem um único `Switch` por categoria, e são duas categorias, uma delas
fixa. Um `buildXFormSchema` aqui seria cerimônia sem ganho. O `Switch` usado é o do design system
(`packages/design-system/components/ui/switch.tsx`), com `label`.

### 5.4 i18n e acessibilidade

Nenhuma string de interface em JSX. As chaves entram em `dictionary.components.cookieConsent`, no mesmo
bucket compartilhado que `components.table` e `components.actionMenu` já usam, porque o componente é
consumido pelos dois apps.

A locale chega ao banner **por prop**, resolvida no servidor, e o componente usa
`getDictionaryForLocale(locale)` (`packages/internationalization/client.ts:16`). Os componentes vizinhos
do design system chamam `getDictionary()` direto (`add-button.tsx:16`, `table.tsx:60`), que lê o cookie
`x-locale` via `document.cookie` e por isso resolve para a locale padrão durante o render do servidor.
Numa coluna de tabela isso passa despercebido; num aviso legal, não: a ANPD trata política em idioma
estrangeiro como vício (`specs/cookie-consent.md:93-95`), e um banner que pinta em português antes de
hidratar para espanhol é exatamente isso por um instante. Os dois layouts já têm a locale em mãos
(`apps/app/app/layout.tsx:35`, `apps/web/app/[locale]/layout.tsx:19`).

Acessibilidade, que a spec marca como ponto crítico (`specs/cookie-consent.md:152-153`):

- Primeiro nível é uma região **não modal** (`role="region"` + `aria-label`), não um diálogo. Ele não
  prende o foco, porque o produto tem de continuar utilizável enquanto o visitante não escolhe, e porque
  prender o foco na entrada do site quebra navegação por teclado.
- Segundo nível é o `Dialog` do design system (radix), que já trata foco, `Esc` e `aria-modal`.
- Fechar as preferências com `Esc` ou clicando fora **não** grava nada. Sem decisão, o banner continua.
- Os dois botões do primeiro nível têm a mesma `variant`, o mesmo `size` e ficam na mesma linha. "Rever
  preferências" é um link de texto, de peso menor, o que a ANPD permite: o que ela proíbe é destacar
  aceitar em relação a recusar.
- Ordem de foco: título, descrição, link da política, recusar, aceitar, preferências.

---

## 6. Autorização e segurança

- Não há endpoint, então não há guard a acrescentar.
- O cookie não é credencial e não libera nada. Ver as três invariantes da seção 4.
- **Impersonação**: o consentimento pertence ao navegador, não à conta. Um admin personificando um
  usuário comum continua sob a escolha feita naquele navegador, e trocar de sujeito não reabre o banner.
  Isso é o comportamento correto: o dado de navegação medido é o do navegador que está ali.
- **Escopo do cookie entre apps**: o cookie recebe o mesmo `domain` que a sessão usa, lido de
  `SESSION_COOKIE_DOMAIN` (`packages/auth/session.ts:49`). Em desenvolvimento a variável fica vazia e o
  cookie nasce host-only em `localhost`, que os dois apps compartilham porque o navegador ignora a porta
  no escopo de cookie (`packages/auth/session.ts:10,56`). Em produção, sem a variável configurada, a
  escolha não atravessa os subdomínios e o visitante é perguntado duas vezes. Isso está na seção de
  pré-requisitos manuais.
- `Secure`: o cookie sai com a flag quando `NODE_ENV === "production"`, espelhando
  `packages/auth/session.ts:51`.
- **CSP**: `apps/app/proxy.ts:20-32,48,56,61` já libera os domínios do Google Analytics condicionados a
  `NEXT_PUBLIC_GA_MEASUREMENT_ID` começar com `G-`. Esse gate é por variável de ambiente, não por
  consentimento, e continua correto quando a tag passa a carregar mais tarde. A `apps/web` não ganha
  origem nova porque não monta tag nenhuma. O script inline do Consent Mode é permitido:
  `packages/security/middleware.ts` mantém `'unsafe-inline'` em `script-src` e não declara nonce, com
  teste que fixa esse contrato (`packages/security/__tests__/csp.test.ts:114-119`).
- Nenhum dado pessoal entra no cookie: o valor guarda a versão do formato e o estado de uma categoria.
- Regras do Firestore e rate limit: sem mudança.

---

## 7. Testes

Tudo que decide comportamento aqui é função pura. Os testes ficam no nível mais barato que prova o
comportamento, e nenhum precisa de emulador, app servindo ou processo externo.

| Arquivo | Nível | O que prova |
|---------|-------|-------------|
| `packages/analytics/__tests__/consent.test.ts` | unit, node | `serializeConsent`/`parseConsent` fecham o ciclo; cookie ausente, valor corrompido, versão desconhecida e categoria desconhecida resultam em "sem decisão" com analytics negado; `parseConsent` nunca lança. |
| `packages/analytics/__tests__/consentGate.test.ts` | unit, node | `resolveConsentable`: id de GA válido devolve `true`; string vazia devolve `false`; id sem prefixo `G-` devolve `false`; `VERCEL_ENV` presente sem GA devolve `true`; nada configurado devolve `false`. |
| `packages/internationalization/__tests__/parity.test.ts` | já existe | Paridade das chaves novas nos 3 idiomas. Só rodar. |
| `packages/shared/__tests__/cookies.test.ts` | já existe, estender | `setCookie` sem opções produz exatamente a string de hoje; com `domain` acrescenta `domain=`; com `secure` acrescenta `Secure`. Prova que a extensão não mexeu nos 3 call sites atuais. |

`packages/analytics` não tem Vitest configurado hoje (`packages/analytics/package.json` só traz `clean` e
`typecheck`). O custo de configurar é um `vitest.config.mts` e uma linha de script, copiando
`packages/shared/vitest.config.mts` e `packages/shared/package.json:12-14`. Nenhuma dependência nova: o
Vitest vem da raiz.

O banner em si não ganha teste de componente. `packages/design-system` não tem setup de Vitest, e montar
um para um componente custa mais do que prova: o que importa no banner é que os dois botões existam com
o mesmo peso, que o `Switch` de medição comece desligado e que a escolha persista, e isso é
`resolveConsentable`/`parseConsent` mais a passada de browser da seção 8. Se o `/test` quiser garantia em
código, o caminho mais barato é um teste jsdom em `apps/app/__tests__/`, que já tem esse ambiente
montado.

---

## 8. Validação visual

Obrigatória (regra de ouro 11). Comandos do `agent-browser` **em sequência**, nunca em paralelo.

Para enxergar o banner em desenvolvimento é preciso ter uma tag configurada, porque sem isso o gate
desliga tudo de propósito. Ponha `NEXT_PUBLIC_GA_MEASUREMENT_ID="G-TEST00000"` no `.env.local` dos dois
apps antes de subir.

Fluxos a percorrer, em `apps/app` (3000) e `apps/web` (3001):

1. Primeira visita, cookie limpo: o banner aparece. Confirmar na aba de rede que **nenhuma** requisição
   sai para `googletagmanager.com`, `google-analytics.com` ou `va.vercel-scripts.com`.
2. Recusar tudo: o banner some, o cookie grava negado, nenhuma requisição de medição sai. Recarregar e
   confirmar que o banner não volta.
3. Aceitar tudo: a tag do GA carrega, o `gtag('consent','update')` sai com `analytics_storage: granted`.
4. Abrir preferências: o `Switch` de medição começa desligado; a categoria necessária aparece fixa e não
   desligável. Ligar, salvar, conferir o cookie.
5. Fechar as preferências com `Esc` sem salvar: nada muda, o banner continua.
6. Reabrir pelo ponto permanente (rodapé na web, menu de perfil no app) com escolha já feita: o diálogo
   abre refletindo o estado gravado.
7. Trocar de idioma pelo seletor e recarregar: banner e preferências em espanhol e inglês, e o link da
   política apontando para a mesma locale.
8. Consentir na `apps/web` e navegar para a `apps/app` na mesma sessão: o banner não reaparece.

Cada fluxo com screenshot em **light, dark e mobile**. Dois pontos que costumam quebrar: o banner sobre
conteúdo de rodapé no mobile, e o contraste dos dois botões no dark quando eles compartilham a mesma
`variant`.

Teclado: percorrer o primeiro nível só com `Tab` e `Enter`, confirmando que o foco entra no banner e
consegue sair dele para a página.

---

## 9. Comportamentos que os critérios de aceite precisam cobrir

Insumo para o `/test` montar o formato §9.1, não os critérios prontos.

- Primeira visita, com e sem tag configurada.
- Recusar tudo, aceitar tudo, escolher por categoria.
- Recarregar, fechar e reabrir o navegador.
- Atravessar `apps/web` → `apps/app` com a escolha feita.
- Reabrir pelo ponto permanente e mudar de ideia nos dois sentidos.
- Cookie com valor corrompido, versão desconhecida e categoria desconhecida.
- `Esc` e clique fora nas preferências sem salvar.
- Duplo clique em aceitar e em recusar.
- Os 3 idiomas, incluindo o link da política na locale corrente.
- Light, dark e mobile.
- Comportamento anterior × posterior: com `NEXT_PUBLIC_GA_MEASUREMENT_ID` vazio, `apps/app` continua
  subindo e o build continua passando, sem banner.
- Admin personificando: a escolha do navegador continua valendo e o banner não reaparece.

---

## 10. Blueprint técnico

### 10.1 Núcleo do consentimento — `packages/analytics/consent.ts` (novo)

Puro: sem React, sem Next, sem acesso a `document` ou `process.env`. É o que os testes da seção 7 batem.

```ts
export const CONSENT_COOKIE_NAME = "bp:cookie-consent";
export const CONSENT_COOKIE_VERSION = "v1";

const DAYS = 180;
const SECONDS_IN_A_DAY = 60 * 60 * 24;
export const CONSENT_COOKIE_TTL_SECONDS = DAYS * SECONDS_IN_A_DAY;

export type ConsentDecision = {
    analytics: boolean;
};

export type ConsentSnapshot = ConsentDecision & {
    decided: boolean;
};

export const NO_CONSENT: ConsentSnapshot = { decided: false, analytics: false };

export function serializeConsent(decision: ConsentDecision): string {
    const analytics = decision.analytics ? "granted" : "denied";
    return `${CONSENT_COOKIE_VERSION}:analytics=${analytics}`;
}

export function parseConsent(raw: string | undefined | null): ConsentSnapshot {
    if (!raw) {
        return NO_CONSENT;
    }
    const [version, entries] = raw.split(":");
    if (version !== CONSENT_COOKIE_VERSION || !entries) {
        return NO_CONSENT;
    }
    const analytics = entries
        .split(",")
        .map((pair) => pair.split("="))
        .find(([key]) => key === "analytics")?.[1];

    if (analytics !== "granted" && analytics !== "denied") {
        return NO_CONSENT;
    }
    return { decided: true, analytics: analytics === "granted" };
}

export function resolveConsentable(input: {
    gaMeasurementId?: string;
    vercelEnv?: string;
}): boolean {
    return Boolean(input.gaMeasurementId) || Boolean(input.vercelEnv);
}
```

Valor do cookie: `v1:analytics=granted`. Versionado de propósito. Quando uma categoria nova entrar, o
`v1` vira `v2`, o cookie antigo deixa de casar, `parseConsent` devolve "sem decisão" e o visitante é
perguntado de novo. É o comportamento correto: consentimento dado para duas categorias não vale para
três.

### 10.2 Leitura no servidor — `packages/analytics/server.ts` (novo)

```ts
import { cookies } from "next/headers";
import { CONSENT_COOKIE_NAME, parseConsent, resolveConsentable, type ConsentSnapshot } from "./consent";
import { keys } from "./keys";

export type ConsentBootstrap = {
    snapshot: ConsentSnapshot;
    consentable: boolean;
    cookieDomain: string | null;
    secure: boolean;
};

export async function resolveConsentBootstrap(): Promise<ConsentBootstrap> {
    const cookieStore = await cookies();
    return {
        snapshot: parseConsent(cookieStore.get(CONSENT_COOKIE_NAME)?.value),
        consentable: resolveConsentable({
            gaMeasurementId: keys().NEXT_PUBLIC_GA_MEASUREMENT_ID,
            vercelEnv: process.env.VERCEL_ENV,
        }),
        cookieDomain: process.env.SESSION_COOKIE_DOMAIN?.trim() || null,
        secure: process.env.NODE_ENV === "production",
    };
}
```

O gate usa `keys().NEXT_PUBLIC_GA_MEASUREMENT_ID`, não `process.env` cru, porque
`packages/analytics/keys.ts:7-13` já devolve `undefined` para string vazia e para id sem prefixo `G-`.
Ler a variável crua faria o banner aparecer com nada atrás dele quando o fork deixasse o
`NEXT_PUBLIC_GA_MEASUREMENT_ID=""` que o `.env.example` publica (`apps/web/.env.example:45`).

`VERCEL_ENV` é lido direto de `process.env`, como `packages/seo/metadata.ts:23` faz com
`VERCEL_PROJECT_PRODUCTION_URL`. Declará-lo em `keys.ts` como variável de servidor criaria a armadilha de
`@t3-oss/env-nextjs` lançar se `keys()` fosse chamado no cliente, e `provider.tsx` chama.

### 10.3 Provider — `packages/analytics/provider.tsx` (reescrito)

Pseudo-diff sobre as 20 linhas atuais:

```diff
+"use client";
+
 import { GoogleAnalytics } from "@next/third-parties/google";
 import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
-import type { ReactNode } from "react";
+import { CookieConsentBanner } from "@repo/design-system/components/ui/cookie-consent";
+import { setCookie } from "@repo/shared/utils";
+import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
 import { keys } from "./keys";
+import { CONSENT_COOKIE_NAME, CONSENT_COOKIE_TTL_SECONDS, serializeConsent, type ConsentDecision, type ConsentSnapshot } from "./consent";

 type AnalyticsProviderProps = {
     readonly children: ReactNode;
+    readonly locale: string;
+    readonly initialConsent: ConsentSnapshot;
+    readonly consentable: boolean;
+    readonly cookieDomain: string | null;
+    readonly secure: boolean;
+    readonly privacyPolicyHref: string | null;
 };

 const { NEXT_PUBLIC_GA_MEASUREMENT_ID } = keys();

-export const AnalyticsProvider = ({ children }: AnalyticsProviderProps) => (
-    <>
-        {children}
-        <VercelAnalytics />
-        {NEXT_PUBLIC_GA_MEASUREMENT_ID && (
-            <GoogleAnalytics gaId={NEXT_PUBLIC_GA_MEASUREMENT_ID} />
-        )}
-    </>
-);
+export const AnalyticsProvider = ({ children, consentable, ... }: AnalyticsProviderProps) => {
+    const [consent, setConsent] = useState(initialConsent);
+
+    const decide = useCallback((decision: ConsentDecision) => {
+        setCookie(CONSENT_COOKIE_NAME, serializeConsent(decision), CONSENT_COOKIE_TTL_SECONDS, {
+            domain: cookieDomain ?? undefined,
+            secure,
+        });
+        pushConsentUpdate(decision);
+        setConsent({ decided: true, ...decision });
+    }, [cookieDomain, secure]);
+
+    if (!consentable) {
+        return <ConsentContext.Provider value={inertValue}>{children}</ConsentContext.Provider>;
+    }
+
+    const measuring = consent.decided && consent.analytics;
+
+    return (
+        <ConsentContext.Provider value={{ consent, decide, openPreferences, ... }}>
+            {children}
+            <ConsentModeDefaults />
+            {measuring && <VercelAnalytics />}
+            {measuring && NEXT_PUBLIC_GA_MEASUREMENT_ID && (
+                <GoogleAnalytics gaId={NEXT_PUBLIC_GA_MEASUREMENT_ID} />
+            )}
+            <CookieConsentBanner
+                open={!consent.decided}
+                locale={locale}
+                privacyPolicyHref={privacyPolicyHref}
+                onAcceptAll={() => decide({ analytics: true })}
+                onRejectAll={() => decide({ analytics: false })}
+                onSave={decide}
+            />
+        </ConsentContext.Provider>
+    );
+};
```

Pontos de atenção:

- O provider vira `"use client"`. Os `children` continuam renderizando no servidor, porque são passados
  como prop pelo layout, que é Server Component.
- `keys()` continua no escopo do módulo, lendo só a variável `NEXT_PUBLIC_`, que existe no bundle do
  cliente.
- O contexto é exportado com um `useCookieConsent()` para o gatilho de reabertura.
- `VercelAnalytics` passa a depender de consentimento, seguindo a recomendação da spec
  (`specs/cookie-consent.md:169-171`).

### 10.4 Consent Mode v2

```tsx
const ConsentModeDefaults = () => (
    <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: o gtag exige a fila
        // declarada antes do carregamento da tag; um script externo chegaria tarde.
        dangerouslySetInnerHTML={{
            __html:
                "window.dataLayer=window.dataLayer||[];" +
                "function gtag(){dataLayer.push(arguments);}" +
                "gtag('consent','default',{" +
                "'ad_storage':'denied'," +
                "'ad_user_data':'denied'," +
                "'ad_personalization':'denied'," +
                "'analytics_storage':'denied'," +
                "'wait_for_update':500});",
        }}
    />
);
```

Renderizado antes de `<GoogleAnalytics>` na árvore, o que garante a ordem no HTML: um `<script>` inline
executa no parse, e `@next/third-parties` carrega a tag do GA com `afterInteractive`. É um `push` no
`dataLayer`, sem requisição de rede, então a promessa de "nenhuma tag de medição carrega antes da
escolha" continua de pé.

Ao decidir, `pushConsentUpdate`:

```ts
window.gtag?.("consent", "update", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: decision.analytics ? "granted" : "denied",
});
```

Os quatro sinais são declarados, como o corte exige. Os três de publicidade ficam permanentemente
`denied` porque o boilerplate não embarca tag de anúncio nenhuma. Declarar uma categoria "marketing" no
segundo nível para poder concedê-los seria pedir consentimento para coisa que não existe, que é o defeito
que a spec quer evitar.

Se o script inline der problema, a alternativa é `next/script` com `strategy="beforeInteractive"`, que os
dois layouts raiz suportam.

### 10.5 Banner e preferências — `packages/design-system/components/ui/cookie-consent.tsx` (novo)

Apresentacional, conforme `packages/CLAUDE.md` ("Componentes presentacionais... Sem fetch, sem session").
Não importa `@repo/analytics`: a dependência corre no sentido `analytics → design-system`, que é o único
sem ciclo.

```ts
export type CookieConsentBannerProps = {
    open: boolean;
    locale: string;
    privacyPolicyHref: string | null;
    onAcceptAll: () => void;
    onRejectAll: () => void;
    onSave: (decision: { analytics: boolean }) => void;
    preferencesOpen?: boolean;
    onPreferencesOpenChange?: (open: boolean) => void;
    currentAnalytics?: boolean;
};
```

Composição, tudo com primitivo que já existe:

- 1º nível: `<div role="region">` fixo no rodapé da viewport, `Card` + dois `Button` de mesma `variant` e
  `size`, mais um `Button variant="link"` para preferências. O link da política só renderiza quando
  `privacyPolicyHref` existe.
- 2º nível: `Dialog` (`packages/design-system/components/ui/dialog.tsx`), uma linha por categoria com
  `Switch` + `Label` + descrição, `Separator` entre elas, e um `Button` de salvar.
- Necessários: `Switch` com `checked` e `disabled`, mais o texto "sempre ativo".
- Medição: `Switch` que começa em `currentAnalytics ?? false`.

Reexportar em `packages/design-system/components/ui/index.ts`, como o barrel exige.

### 10.6 Extensão do `setCookie` — `packages/shared/utils/helpers/cookies.ts`

```diff
-export const setCookie = (name: string, value: string, expiresIn: number) => {
+type CookieOptions = {
+    domain?: string;
+    secure?: boolean;
+};
+
+export const setCookie = (
+    name: string,
+    value: string,
+    expiresIn: number,
+    options?: CookieOptions
+) => {
     if (typeof window === "undefined") {
         return;
     }
 
     const expires = new Date();
     const ms = 1000;
     expires.setTime(expires.getTime() + expiresIn * ms);
 
-    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
+    document.cookie = [
+        `${name}=${value}`,
+        `expires=${expires.toUTCString()}`,
+        "path=/",
+        "SameSite=Lax",
+        ...(options?.domain ? [`domain=${options.domain}`] : []),
+        ...(options?.secure ? ["Secure"] : []),
+    ].join(";");
 };
```

Aditivo: os 3 call sites atuais (`themePreference.ts:33,60` e os dois `LanguageSwitcher`) não mudam, e a
string produzida sem opções é idêntica à de hoje, o que os testes existentes em
`packages/shared/__tests__/cookies.test.ts:80-84` já fixam.

### 10.7 Montagem nos apps

`apps/app/app/layout.tsx`:

```diff
+import { resolveConsentBootstrap } from "@repo/analytics/server";
...
-    const [{ locale }, sessionUser, panelSnapshot, preferredTheme] =
+    const [{ locale }, sessionUser, panelSnapshot, preferredTheme, consent] =
         await Promise.all([
             getDictionary(),
             getAppSessionUser(),
             resolvePanelSnapshot(),
             resolvePreferredTheme(),
+            resolveConsentBootstrap(),
         ]);
...
-                    <AnalyticsProvider>
+                    <AnalyticsProvider
+                        consentable={consent.consentable}
+                        cookieDomain={consent.cookieDomain}
+                        initialConsent={consent.snapshot}
+                        locale={locale}
+                        privacyPolicyHref={
+                            env.NEXT_PUBLIC_WEB_URL
+                                ? `${env.NEXT_PUBLIC_WEB_URL}/${locale}/legal/privacy`
+                                : null
+                        }
+                        secure={consent.secure}
+                    >
```

`NEXT_PUBLIC_WEB_URL` já existe e é opcional (`packages/next-config/keys.ts:23`), chegando ao
`apps/app/env.ts` pelo `core()` (`apps/app/env.ts:8`). Sem ela, o link da política some e o resto do
banner funciona.

`apps/web/app/[locale]/layout.tsx`: mesma montagem, com `privacyPolicyHref={`/${locale}/legal/privacy`}`,
que é a rota que já existe (`apps/web/app/[locale]/paths.ts:11-14`) e que o rodapé já linka
(`apps/web/app/[locale]/components/footer.tsx`).

Os dois `package.json` de app precisam declarar `"@repo/analytics": "workspace:*"`. Hoje nenhum dos dois
declara, e `apps/app` só funciona pelo symlink da raiz mais o `paths` do tsconfig.

`packages/analytics/package.json` ganha `@repo/design-system`, `@repo/shared` e
`@repo/internationalization` como `workspace:*`.

### 10.8 Ponto permanente de reabertura

- `apps/web/app/[locale]/components/footer.tsx`: um `CookiePreferencesTrigger` (cliente, exportado por
  `packages/analytics`) abaixo da grade de navegação, na coluna legal que já agrupa privacidade e termos.
- `apps/app/shared/components/ui/ProfileDropdown.tsx`: um `DropdownMenuItem` novo no grupo que já tem
  "minha conta" e "sair".

O menu de perfil é chrome autenticado. Nas telas de entrada da `apps/app` não há ponto de reabertura, e
isso é aceitável: a superfície pública daquele app é só autenticação, e enquanto não houver escolha o
próprio banner está na tela. A `apps/web`, que é onde o visitante anônimo chega, tem o ponto no rodapé de
todas as páginas.

### 10.9 i18n

Arquivo novo `packages/internationalization/translations/components/ui/cookie-consent.ts`, exportando
`cookieConsentTranslations` com as 3 locales. Registro em
`packages/internationalization/translations/components/index.ts`: um import e uma entrada em cada um dos
três blocos.

Árvore de chaves, idêntica nos 3 idiomas:

```
components.cookieConsent
├── banner
│   ├── ariaLabel
│   ├── title
│   ├── description
│   ├── acceptAll
│   ├── rejectAll
│   ├── managePreferences
│   └── privacyPolicy
├── preferences
│   ├── title
│   ├── description
│   ├── save
│   ├── localStorageNotice
│   ├── necessary
│   │   ├── title
│   │   ├── description
│   │   └── alwaysOn
│   └── analytics
│       ├── title
│       └── description
└── trigger
    └── label
```

`preferences.localStorageNotice` é o parágrafo separado sobre `bp:panel-state` e `theme`, que a seção 2
justifica manter fora da lista de cookies.

Nada entra em `apiErrors`: não há código de erro novo, porque não há API.

### 10.10 Ordem de implementação e commits

A ordem canônica do repo é contrato → API → apps → i18n. Sem SDK e sem API, ela vira:

1. `fix(shared): support domain and secure flags on setCookie`
2. `feat(analytics): consent state, server bootstrap and consent mode v2`
3. `feat(design-system): cookie consent banner and preferences dialog`
4. `feat(app): gate analytics behind cookie consent`
5. `feat(web): cookie consent banner on the landing`
6. `feat(internationalization): cookie consent copy`
7. `docs(features): cookie-consent`

O commit de i18n vem por último, como a regra manda, mas as chaves precisam existir para o typecheck
fechar. Rodar `pnpm turbo run lint typecheck test` sobre a árvore completa, não commit a commit.

### 10.11 Variáveis de ambiente

Nenhuma variável nova. Três já existentes passam a ter efeito sobre esta feature:

| variável | efeito | sem ela |
|----------|--------|---------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | liga o gate do banner e a tag do GA | não há o que consentir; nenhum banner |
| `SESSION_COOKIE_DOMAIN` | faz a escolha atravessar os subdomínios | a escolha é por host; o visitante responde uma vez em cada app |
| `NEXT_PUBLIC_WEB_URL` | link da política a partir da `apps/app` | o link some; o banner continua |

---

## 11. Pré-requisitos manuais de infra

Nenhum deles é código, nenhum o `/develop` consegue satisfazer, e nenhum deve reprovar a entrega no
`/test`. Vão para [`docs/PRE-PRODUCTION.md`](../../../PRE-PRODUCTION.md).

1. **`SESSION_COOKIE_DOMAIN` em produção.** Sem o domínio pai configurado (`.exemplo.com`), o cookie de
   consentimento nasce host-only e a escolha não atravessa a landing e o painel. A variável já existe
   para a sessão (`packages/auth/session.ts:49`); se o SSO entre apps já funciona em produção, ela já
   está posta e não há ação. Verificável só com os dois apps servidos em subdomínios reais.
2. **Revisar o texto da política de privacidade.** O banner passa a apontar para
   `/legal/privacy`, cujo conteúdo hoje é um modelo de boilerplate, com aviso disso no próprio texto
   (`packages/internationalization/translations/apps/web/pages/legal/index.ts`). O banner traduzido
   apontando para política genérica cumpre a forma e não o conteúdo.
3. **Declarar os cookies na política.** A tabela da seção 2 (6 cookies, mais o de consentimento) precisa
   sair do plano e entrar no texto legal do fork. É redação, não código.
4. **Conferir o Consent Mode no painel do Google.** Que o GA está recebendo os sinais só se confirma na
   propriedade real do fork, com tráfego real. Nem aprovar nem reprovar no `/test`: não verificável.

---

## 12. Modo degradado

Exigência da política do ciclo: toda feature opt-in sobe sem a variável, com o build passando e a
interface caindo para o que existia antes.

| cenário | comportamento |
|---------|---------------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID=""` e fora da Vercel | `consentable` é `false`. Nenhum banner, nenhum script de Consent Mode, nenhuma tag. O provider só repassa `children`. É o caso do `pnpm dev` limpo e de qualquer fork sem medição. |
| Variável com id inválido (sem `G-`) | Igual ao anterior: `packages/analytics/keys.ts:7-13` devolve `undefined`, e o gate usa `keys()`, não `process.env`. |
| Na Vercel, sem GA | `consentable` é `true` pelo `VERCEL_ENV`. O banner aparece e o Vercel Analytics só carrega com consentimento. |
| `SESSION_COOKIE_DOMAIN` vazia | O cookie fica host-only. Funciona dentro de cada app; em produção o visitante responde duas vezes. Degrada, não quebra. |
| `NEXT_PUBLIC_WEB_URL` vazia na `apps/app` | O link da política não renderiza; aceitar, recusar e preferências seguem funcionando. |
| Cookie corrompido ou de versão antiga | `parseConsent` devolve "sem decisão", o banner reaparece, nada carrega antes da resposta. |
| JavaScript desligado | O banner não aparece, e nenhuma tag carrega, porque o carregamento também depende do cliente. Sem medição e sem aviso, que é o lado seguro. |

Não há resposta de API para degradar, então não há risco de 500 nem `error.code` a definir.

**Mudança de comportamento a registrar**: um fork hospedado fora da Vercel e sem GA deixa de montar
`<VercelAnalytics />`, que hoje monta sempre (`packages/analytics/provider.tsx:15`). O componente não
envia nada fora da Vercel, então o efeito prático é menos JavaScript na página.

---

## 13. Riscos

- **O banner só aparece com tag configurada**, e em `pnpm dev` limpo não há tag. Quem for validar sem ler
  a seção 8 vai concluir que a feature não funciona. É o custo de honrar o "NO-OP quando não há o que
  consentir" da spec (`:139-143`).
- **O escopo entre apps depende de configuração de produção** que não dá para provar em desenvolvimento,
  onde `localhost` compartilha o cookie de graça.
- **Medição cai.** Recusar por padrão significa medir menos, e a spec diz para não trocar isso por um
  botão de aceitar em destaque (`:144-145`).
- **A ordem do script inline** é garantida pela ordem no HTML e pelo `afterInteractive` do
  `@next/third-parties`. Se uma versão futura mudar a estratégia de carregamento, a chamada de `default`
  pode chegar depois da tag. Vale conferir no browser que o `dataLayer` tem o `default` antes do
  `update`.
- **O barrel do design system não exporta `popover`**, único arquivo de `components/ui/` fora do
  `index.ts`. Não afeta este plano, que usa `Dialog`, mas é armadilha se o segundo nível virar popover.

---

## 14. Decisões tomadas sem perguntar

Rodada autônoma: cada linha aqui seria uma pergunta ao usuário. A decisão já está no plano; a alternativa
está escrita para que dê para discordar com base.

1. **Inventário: 6 cookies, não 5.** Alternativa descartada: manter os 5 da spec. O `sidebar_state`
   (`packages/design-system/components/ui/sidebar.tsx:28,108`, lido em
   `apps/app/lib/server/sidebarState.ts:14`) é cookie de primeira parte e a spec não o lista. Um banner
   que declara menos cookies do que o produto grava nasce com o defeito que a spec existe para evitar.

2. **O banner aparece só quando há tag configurada.** Adotada a recomendação da spec (`:167-168`).
   Alternativa descartada: mostrar para todo visitante, o que imporia fricção a forks sem medição.

3. **O gate é `GA configurado` OU `rodando na Vercel`.** Alternativa descartada: gate só pelo GA. Como o
   Vercel Analytics passa a depender de consentimento, um gate só de GA faria o fork que usa só Vercel
   Analytics perder a medição em silêncio. `VERCEL_ENV` é injetada pela própria Vercel, resolvida no
   servidor, e não cria variável nova. Segunda alternativa descartada: criar
   `NEXT_PUBLIC_VERCEL_ANALYTICS`, rejeitada por adicionar superfície de configuração a todo fork.

4. **Vercel Analytics entra como sujeito a consentimento.** Adotada a recomendação da spec (`:169-171`).
   Alternativa descartada: classificá-lo como necessário, que é a saída confortável e não a correta.

5. **Duas categorias: necessários e medição.** Adotada a recomendação da spec (`:172-173`). Alternativa
   descartada: uma terceira categoria de marketing, que hoje seria consentimento para tag inexistente.

6. **Os quatro sinais do Consent Mode v2 são declarados, três permanentemente negados.** Alternativa
   descartada: declarar só `analytics_storage`. O corte pede os quatro (`:112-113`), e negar
   explicitamente os de publicidade é informação, não omissão.

7. **A `apps/web` exibe o banner mas não monta analytics.** Adotada a recomendação da spec (`:174-175`),
   combinada com a linha da tabela de impacto que pede o aviso na landing (`:133`). A landing é onde o
   visitante anônimo chega; ligar medição lá é decisão de cada fork. Consequência: a `apps/web` coleta
   uma escolha que só a `apps/app` consome hoje, e o `apps/web/proxy.ts` não ganha origem de CSP.

8. **Nome do cookie: `bp:cookie-consent`.** Alternativa descartada: `x-cookie-consent`. O prefixo `bp:` é
   a convenção mais recente e deliberada do repo, documentada em
   `apps/app/shared/lib/panelState.ts:4-17`; `x-` é dos cookies antigos de locale e tema.

9. **Valor versionado e compacto (`v1:analytics=granted`).** Alternativa descartada: JSON com
   `encodeURIComponent`. O formato compacto é mais barato de afirmar em teste, e a versão dá a
   re-pergunta automática quando o conjunto de categorias mudar.

10. **TTL de 180 dias.** Alternativa descartada: 365 dias. 180 é o que o repo já usa para preferência
    (`apps/app/shared/lib/themePreference.ts:5-8`) e fica dentro dos 6 meses que a orientação europeia
    costuma citar. A constante é declarada em `packages/analytics/consent.ts` e não importada de
    `apps/app`, porque pacote não depende de app (`packages/CLAUDE.md`).

11. **Escopo entre apps pelo `SESSION_COOKIE_DOMAIN`, passado como prop.** Alternativa descartada: criar
    `NEXT_PUBLIC_COOKIE_DOMAIN`. O servidor já lê a variável de sessão (`packages/auth/session.ts:49`) e
    o layout já passa props para o provider; nenhuma variável nova.

12. **A UI fica em `packages/design-system` e o estado em `packages/analytics`.** Alternativa descartada:
    tudo no design system, o que o faria depender de `@repo/analytics` e inverteria a direção natural da
    dependência. A spec pede a UI no design system (`:134`), e ela fica lá, apresentacional.

13. **A locale chega por prop, com `getDictionaryForLocale`.** Alternativa descartada: `getDictionary()`
    direto no cliente, como `add-button.tsx:16` e `table.tsx:60` fazem. Rejeitada porque o primeiro
    render do banner sairia na locale padrão, e idioma errado num aviso legal é vício apontado pela
    própria ANPD.

14. **Primeiro nível não modal, segundo nível modal.** Alternativa descartada: modal já no primeiro
    nível, com foco preso. A spec trata o banner como ponto crítico de acessibilidade (`:152-153`) e
    exige que o produto siga funcionando sem decisão (`:106-107`).

15. **Sem teste de componente para o banner.** Alternativa descartada: montar Vitest em
    `packages/design-system`. O que decide comportamento é função pura e está coberto; o resto é a passada
    de browser. Se o `/test` quiser garantia em código, o caminho barato é jsdom em `apps/app/__tests__/`.

16. **`setCookie` ganha opções em vez de um escritor novo.** Alternativa descartada: um escritor de cookie
    dedicado dentro de `packages/analytics`. A spec manda reaproveitar o helper (`:67-71`), a mudança é
    aditiva e os testes existentes fixam que a saída sem opções não muda.

17. **Política de cookies aponta para a de privacidade existente.** Alternativa descartada: criar
    `/legal/cookies`. Página nova sem conteúdo jurídico real seria casca; a redação entra nos
    pré-requisitos manuais.

### Perguntas que sobram para o usuário

Estas não foram decididas pelo plano porque mudam o produto, não a implementação:

- O corte deixa de fora o registro auditável de consentimento (`specs/cookie-consent.md:117-118`). Sem
  ele, o fork consegue honrar a escolha mas não consegue provar em auditoria que a obteve. Mantido fora,
  como a spec define. Vale abrir a spec seguinte?
- Um fork que queira medir a landing precisa ligar o `AnalyticsProvider` com tag na `apps/web` e
  acrescentar as origens do Google ao `apps/web/proxy.ts:30-41`. Isso vira item de documentação para
  forks ou fica como está?
