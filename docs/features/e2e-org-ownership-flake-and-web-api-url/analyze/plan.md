# Plano: E2E instável de `organizationOwnership` e a `web` sem `NEXT_PUBLIC_API_URL` na pilha do E2E

- Tarefa direta, sem spec. Os dois achados estão em `specs/BACKLOG.md` (linhas 312 e 321 da fila; detalhe nas
  linhas 1648, 1623 e 1706).
- Modo: autônomo, dentro do `/cycle`. Nenhuma pergunta feita; as decisões estão em "Perguntas em aberto
  (decididas por padrão)", no fim.
- Código lido em `5829ea3` (HEAD do workspace `lima`), em 2026-11-24, com o working tree das fatias 2 e 3 de
  `delivery-security-review` ainda sem commit. Nenhum arquivo desta tarefa coincide com os delas, exceto
  `docs/SETUP.md` (ver §10.6).
- Escopo: só `apps/e2e` e uma linha de `docs/SETUP.md`. Nenhum código de produto muda.

---

## Etapa 1: análise

### 1. Contexto

#### 1.1 Problema

Achado A. O teste `apps/e2e/tests/organizationOwnership.spec.ts:68` reprovou na primeira tentativa na
execução de merge da PR #73 (`gh run 45311956449`, job `e2e`) com
`[serious] color-contrast @ /pt-br/organization (light)` no `<div>` "Atualizar" e passou na segunda (24,0 s).
Como o CI usa `failOnFlakyTests: isCi` (`apps/e2e/playwright.config.ts:36`), o job e a execução ficaram
vermelhos, e a `main` também.

Achado B. `buildStackEnv("web")` não define `NEXT_PUBLIC_API_URL` (`apps/e2e/support/stackEnv.ts:66-86`:
`crossAppUrls` devolve `{}` para `web`). Sem ela, as rotas de sessão da `web` rodam sem `SessionAuthority`
(`apps/web/shared/lib/sessionAuthority.ts:4-7` com `url` indefinida faz `check` responder `"unknown"` e `end`
não fazer nada, `packages/sdk/src/client/sessionAuthority.ts:46-67`). Sair na landing não encerra a sessão na
API, e a landing reescreve o cookie de uma sessão que a app já encerrou. O passo 3 de "Como validar o fluxo
completo" de `docs/AUTH-SSO.md:121-122` fica sem nenhum teste automático.

#### 1.2 Causa raiz do achado A (medida no artefato do CI)

Evidência baixada do artefato `e2e-evidence` da execução `45311956449`:

1. **O que o axe mediu.** O anexo do axe no `trace.zip` traz, para o nó
   `section:nth-child(3) > … > .dark\:border-input.dark\:hover\:bg-input\/50.py-2 > .gap-2.items-center.flex`:
   `fgColor #828282`, `bgColor #fdfdfd`, `contrastRatio 3.77`, 14 px normal, esperado 4.5:1. O texto do botão
   outline é quase preto; `#828282` sobre fundo quase branco é esse preto a cerca de 50% de opacidade. O
   `<div>` medido é o ramo **sem** carregamento do `Button` (`packages/design-system/components/ui/button.tsx:84`;
   o ramo de carregamento teria `opacity-0` na classe, linha 77). Ou seja: o botão já estava habilitado de novo,
   mas a opacidade ainda não tinha voltado a 1. O `Button` tem `transition-all` e `disabled:opacity-50`
   (`button.tsx:8`), então ao reabilitar a opacidade sobe de 0,5 para 1 numa transição.
2. **Qual tabela.** O `section` de índice 3 na página da equipe é a tabela de convites: a ordem em
   `OrganizationClient.tsx:46-53` é o aviso de personificação (que devolve `null` fora da personificação,
   `ImpersonationReadOnlyNotice.tsx:24-25`), o formulário de convite (`<section>`, `InviteMemberForm.tsx:42`),
   a tabela de membros (`<section>`, `OrganizationMembersTable.tsx:135`) e a de convites.
3. **A linha do tempo no trace do convidado** (contexto `3-trace`, horário do runner):

   | instante | evento |
   |----------|--------|
   | 02:27:55.636 | `inviteePage.reload()` |
   | 02:27:57.598 a 57.697 | as duas esperas `toHaveCSS("opacity", "1")` passam |
   | **02:27:57.809** | **`GET /organization/invitations` começa (143 ms)** |
   | 02:27:57.957 | o axe é injetado |
   | 02:27:58.167 a 58.460 | `axe.runPartial`, que reprova o "Atualizar" da tabela de convites |

   A única busca de convites do contexto do convidado começa **depois** de as esperas de opacidade passarem e
   termina logo antes da varredura.
4. **Por que a busca começa tarde.** A página só pré-carrega no servidor o detalhe da organização e os membros
   (`organization/page.tsx:27-36`); os convites não. No cliente, `useListOrganizationInvitations` usa
   `useAuthorizedQuery` (`(hooks)/useListOrganizationInvitations.tsx:14-18`), que segura a consulta até
   `sdkAuthorized` (`apps/app/shared/hooks/useAuthorizedQuery.ts:29-34`). Essa flag começa `false` e só vira
   `true` num efeito, quando o Firebase cliente entrega o token (`AuthRequestPanelContext.tsx:136-149`).
   Enquanto isso, a consulta fica `pending` e ociosa: `isFetching` é `false`, então `refreshLoading` é `false`
   (`OrganizationInvitationsTable.tsx:105`) e o botão aparece habilitado, com opacidade 1.
5. **Por que a espera atual não segura.** O teste espera opacidade 1 (`organizationOwnership.spec.ts:172-180`),
   mas o estado "ainda não buscou" e o estado "já buscou" têm a mesma opacidade. Quando o token chega depois
   da espera, a busca desabilita o botão, a resposta o reabilita, e a transição de volta coincide com o axe. Na
   segunda tentativa o token chegou antes da espera, por isso passou.

Conclusão: o contraste não é insuficiente em nenhum estado real que o critério cobre. Com o botão desabilitado,
o axe nem mede (a WCAG 1.4.3 isenta componente inativo), e habilitado ele fica com opacidade 1. O defeito está
no teste, que espera um sinal incapaz de distinguir "antes" de "depois" da busca. A correção é esperar a busca
dos convites terminar e só então esperar o botão estabilizar.

A tabela de membros não refaz a busca nesse momento: o dado vem hidratado do servidor e o `staleTime` é de
60 s (`apps/app/shared/providers/QueryProvider.tsx:6,20`), então habilitar a consulta não dispara requisição. O
trace confirma: nenhuma `GET /organization/members` no contexto do convidado depois do `reload`.

#### 1.3 Efeito colateral de passar `NEXT_PUBLIC_API_URL` à `web` (achado B)

Lido no código. O que a variável liga na landing:

| consumidor | o que muda na suíte |
|------------|---------------------|
| `apps/web/shared/lib/sessionAuthority.ts:4-7` → rotas `session` POST/DELETE, `session/refresh`, `custom-token` | passam a consultar `GET /auth/session` e a chamar `DELETE /auth/session` na API, do servidor da `web` (sem `Origin`, então CORS não se aplica; a credencial vai como bearer, que a API aceita). É o objetivo da tarefa |
| `apps/web/shared/lib/planCatalog.ts:24-29` (`/pricing`) | passa a chamar `payments.listCatalog`; sem Stripe na pilha, o catálogo vem desligado ou falha, e a página mostra lista vazia como hoje. Nenhum spec visita `/pricing` |
| `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx:48-56` | o envio vai para a API em vez de dar 404 na própria origem (linha 1706 do backlog). Nenhum spec envia esse formulário |
| `apps/web/app/[locale]/contact/components/contact-form-client.tsx:59` | idem; nenhum spec envia |
| `apps/web/proxy.ts:37-38` (CSP) | a origem da API entra no `connect-src`, em modo report-only (`REPORT_ONLY = true`, `proxy.ts:52`) |

O `CORS_ORIGIN` da API na pilha já inclui a origem da `web` (`stackEnv.ts:72`). Os specs que visitam a landing
(`landing.spec.ts`, `a11yDark.spec.ts` "signed out") rodam sem sessão: a `custom-token` responde 401 sem cookie
antes de consultar a autoridade (`packages/auth/session-routes.ts`, `customTokenPOST`). Nenhum teste existente
passa só por estar em modo degradado.

`NEXT_PUBLIC_APP_URL` **continua vazia** na `web`. Preenchida, o CTA da landing iria para a app em vez do
cadastro da própria landing (`apps/web/app/[locale]/(home)/components/hero.tsx:49`, `cta.tsx:39`), e o
`landing.spec.ts:35` quebraria. O teste de unidade já fixa isso (`apps/e2e/__tests__/stackEnv.test.ts:100-103`).
A hipótese da linha 1706 do backlog (passar também `APP_URL` e `WEB_URL`) fica descartada por esse motivo.

#### 1.4 O que a sessão faz entre as duas origens (base do teste novo)

- A chave da sessão na API é o instante da autenticação original (`apps/api/(shared)/lib/session-key.ts:12-18`).
  A front-end que entra pelo bootstrap herda esse instante pela claim `sessionAuthTime`
  (`packages/auth/session.ts:31-36,117-128`), então app e landing falam da **mesma** sessão.
- `DELETE /auth/session` revoga só essa sessão (`apps/api/app/(routes)/auth/session/route.ts:33-45`); as outras
  sessões da conta seguem vivas.
- Em `localhost` o cookie `access-token` vale para todas as portas, mas o Firebase cliente persiste por origem.
  Por isso, depois de sair numa front-end, a outra ainda tem usuário no Firebase e tenta regravar o cookie
  (`packages/auth/provider.tsx:284-313`: `refresh` sem cookie dá `no-session`, e o provider chama `session`
  POST). Só a consulta à autoridade impede isso: com a sessão revogada, `session` POST responde 401
  `AUTH_SESSION_REVOKED`, o provider desloga, mostra o aviso `packages.auth.provider.session.revoked` e manda
  para `/<locale>/sign-in` (`provider.tsx:252-270`). O JSDoc de `sessionDELETE` descreve exatamente
  isso (`session-routes.ts:172-176`).
- Sem a variável na `web`: sair na landing não revoga, e a app regrava o cookie (continua logada); sair na app
  revoga, mas a landing regrava o cookie sem perguntar à API, o que loga a app de novo, porque o cookie é
  compartilhado.

#### 1.5 Objetivos, corte e fora de escopo

Corte (MVP):

1. `organizationOwnership.spec.ts` espera a resposta de `GET /organization/invitations` da página recarregada
   antes de esperar os botões estabilizarem e chamar o axe.
2. `buildStackEnv("web")` passa `NEXT_PUBLIC_API_URL`, e o teste de unidade do `stackEnv` fixa isso (com
   `NEXT_PUBLIC_APP_URL` ainda vazia).
3. Spec E2E novo, `crossAppSignOut.spec.ts`, com dois testes: sair na landing encerra a sessão da app, e sair na
   app encerra a da landing. É a cobertura do passo 3 do `docs/AUTH-SSO.md`.
4. O aquecimento do `global.setup.ts` passa a compilar `/<locale>/sign-in` da `web`, para onde o segundo teste
   navega.
5. `docs/SETUP.md` cita o fluxo novo na lista do que a suíte percorre.

Fora de escopo:

- As três quebras por tempo do mesmo spec sob `next dev` local (linha 1648 do backlog, primeira metade). A causa
  é outra (compilação a frio), e o CI não reproduz.
- Mudar `failOnFlakyTests`, a regra de contraste, o `A11Y_ALLOWLIST` ou o `Button`.
- Pré-carregar os convites no servidor (ver Q2) e o estado vazio falso das tabelas que esperam o token (ver
  §1.6).
- "Um segundo navegador continua logado" (resto do passo 3): a revogação por sessão já tem teste de rota na API.

#### 1.6 Achados novos no caminho (registrar no backlog, não corrigir aqui)

- 🟢 **Tabela que espera o token mostra "vazio" antes de buscar.** Com a consulta `pending` e ociosa,
  `isLoading` é `false` e `dataSource` é `undefined`, então o antd mostra o `emptyText` até o token chegar,
  quando aparece o spinner e depois os dados. Acontece com os convites do dono em toda carga (não são
  pré-carregados) e com toda tabela durante a personificação, quando o pré-carregamento é pulado
  (`organization/page.tsx:23-24`). Lido no código, não medido em tela. Correção provável na raiz, em
  `useAuthorizedQuery` ou no `Table`, tratando "aguardando autorização" como carregamento.

### 2. Dados (Firestore)

N/A. Nenhuma coleção ou campo muda. O teste novo usa `user@example.com` do seed e revoga só a sessão aberta no
próprio contexto (§1.4); a sessão salva em `AUTH_STATE.common` tem outro instante de autenticação e segue ativa.

### 3. Contrato `@repo/sdk`

N/A.

### 4. API

N/A. Rotas usadas pelo teste, sem mudança: `GET` e `DELETE /auth/session`.

### 5. Front

N/A em produto. Nenhum componente, rota ou chave de tradução muda. O teste lê do dicionário:
`components.header.signOut` e `signIn`, `apps.app.shared.profileDropdown.triggerLabel` e `signOut`,
`packages.auth.provider.session.revoked`.

### 6. Autorização e segurança

Nenhuma mudança de regra. O teste novo afirma a propriedade de segurança que faltava na suíte: uma sessão
encerrada numa front-end não volta pela outra. Nenhuma credencial nova; a senha do seed já é pública
(`apps/e2e/support/seedAccounts.ts:1-3`).

### 7. Testes

| # | nível | arquivo | o que prova |
|---|-------|---------|-------------|
| T1 | unidade (Vitest) | `apps/e2e/__tests__/stackEnv.test.ts`, caso "points each app at the other two" | `buildStackEnv("web")` tem `NEXT_PUBLIC_API_URL === urls.api` mesmo com a chave vazia no `.env.example`, e `NEXT_PUBLIC_APP_URL` continua `""` |
| T2 | E2E (Playwright) | `apps/e2e/tests/organizationOwnership.spec.ts` (alterado) | o axe só roda depois de a busca de convites terminar e os botões estarem habilitados com opacidade 1 |
| T3 | E2E | `apps/e2e/tests/crossAppSignOut.spec.ts` (novo), teste 1 | sair na landing chama a API, e a app, ao recarregar, mostra o aviso de sessão encerrada e fica no `sign-in` |
| T4 | E2E | idem, teste 2 | sair na app faz a landing, ao recarregar, mostrar o aviso e ir para o próprio `sign-in`, sem regravar o cookie |

Por que E2E em T3 e T4: o objeto é a infra, a ligação entre duas front-ends, o cookie compartilhado por porta, o
Firebase cliente por origem e a autoridade da API. O unitário já existe para cada peça
(`packages/auth/__tests__/sessionRoutesAuthority.test.ts`, `serverSessionRevocation.test.ts`); nenhum deles prova
que a pilha montada pelo `stackEnv` liga essas peças.

T3 e T4 rodam só no projeto `chromium`. O nome não casa com `CRITICAL_FLOWS` (`playwright.config.ts:19`), e o
botão "Sair" da landing só aparece a partir de `md` (`apps/web/app/[locale]/components/header/index.tsx:266`).

### 8. O que o `/test` vai percorrer

Nenhum pixel muda, então não há passada de `agent-browser` nem matriz de tema, viewport ou idioma. A prova é
executar a suíte:

- V1. `pnpm --filter e2e test` e `pnpm --filter e2e typecheck`.
- V2. `pnpm e2e` inteiro, uma vez (paridade com o job `e2e` do CI).
- V3. Estabilidade: `pnpm --filter e2e e2e tests/organizationOwnership.spec.ts tests/crossAppSignOut.spec.ts --project=chromium --repeat-each=5 --retries=0`.
  Falha por tempo sob `next dev` é o achado já conhecido (fora de escopo); falha por contraste reprova.
- V4. Ordem no trace: rodar `organizationOwnership.spec.ts` com `--trace on` e conferir no contexto do convidado
  que a `GET /organization/invitations` termina antes do `axe.runPartial`.
- V5. Prova de que T3 e T4 detectam o defeito: reverter **temporariamente** a linha da `web` em
  `stackEnv.ts`, rodar `crossAppSignOut.spec.ts` e ver os dois testes reprovarem (a app ou a landing seguem
  logadas); restaurar a linha. Nada disso entra no diff.

Pré-condição: portas 3000, 3001 e 3002 livres e JDK 21. Se outro processo de QA estiver de pé, usar
`E2E_APP_PORT`/`E2E_WEB_PORT`/`E2E_API_PORT` (`docs/SETUP.md:288-291`).

### 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **O axe da página da equipe só roda com a tabela de convites estável**
  Depois do `reload` da página do convidado, o teste espera a resposta de `GET /organization/invitations` daquela
  carga, confere que ela veio com sucesso e só então espera os dois botões "Atualizar" habilitados e com
  opacidade 1. O trace mostra a requisição terminando antes do `axe.runPartial`. A regra `color-contrast`, o
  `A11Y_ALLOWLIST` (vazio) e o `failOnFlakyTests` ficam como estão.

- [ ] **O spec da equipe passa repetido sem reprovação por contraste**
  Com `--repeat-each=5 --retries=0`, nenhuma execução de `organizationOwnership.spec.ts` reprova por
  `color-contrast`. Uma quebra por tempo sob `next dev` local é registrada à parte, como o achado já conhecido, e
  não conta como regressão desta tarefa.

- [ ] **A landing da suíte fala com a API**
  `buildStackEnv("web")` devolve `NEXT_PUBLIC_API_URL` igual à URL da API da pilha, mesmo com o valor vazio no
  `.env.example`. `NEXT_PUBLIC_APP_URL` continua vazia, e o CTA da landing segue abrindo o cadastro da própria
  landing (`landing.spec.ts` verde). O teste de unidade do `stackEnv` fixa os dois valores.

- [ ] **Sair na landing encerra a sessão na app**
  Entrar pela app, abrir a landing (que aparece logada pelo bootstrap da SSO) e clicar em "Sair". A requisição
  `DELETE /api/auth/session` da landing responde com sucesso. Ao abrir a app de novo, ela termina em
  `/pt-br/sign-in` com o aviso "Esta sessão foi encerrada. Entre novamente para continuar.", e uma segunda
  navegação para `/pt-br` volta ao `sign-in`, sem cookie regravado.

- [ ] **Sair na app encerra a sessão na landing**
  Entrar pela app, abrir a landing (logada), voltar à app e sair pelo menu do perfil. Ao abrir a landing de novo,
  ela mostra o mesmo aviso de sessão encerrada e vai para `/pt-br/sign-in` da landing; a app continua no
  `sign-in` numa navegação seguinte. Sem a variável na `web`, a landing regravaria o cookie e logaria a app de
  novo.

- [ ] **Os dois testes novos detectam o defeito que cobrem**
  Com a linha da `web` revertida temporariamente em `stackEnv.ts`, os dois testes de `crossAppSignOut.spec.ts`
  reprovam. Restaurada a linha, passam. A reversão não entra no diff.

- [ ] **A sessão do seed usada pelos outros specs continua viva**
  Os testes novos usam um contexto próprio e revogam só a sessão aberta nele. Os specs que rodam depois com
  `AUTH_STATE.common` (`entityCrud`, `panelSwitch` e os demais) seguem verdes na mesma execução de `pnpm e2e`.

- [ ] **Gates estáticos e documentação**
  `pnpm check` e `pnpm --filter e2e typecheck` sem erro. `docs/SETUP.md` cita a saída entre apps na lista de
  fluxos da suíte. Nenhum comentário novo cita o fluxo de desenvolvimento.

---

## Etapa 2: blueprint técnico

### 10.1 `apps/e2e/tests/organizationOwnership.spec.ts`

Trecho final do teste, a partir do `reload` do convidado (`:164-183`):

```diff
-        await inviteePage.reload();
+        const invitationsFetched = inviteePage.waitForResponse(
+            (response) =>
+                response.request().method() === "GET" &&
+                new URL(response.url()).pathname === INVITATIONS_API_PATH
+        );
+        await inviteePage.reload();
         await expect(
             roleBadge(inviteePage, inviteeEmail, "owner")
         ).toBeVisible();
         await expect(memberRow(inviteePage, OWNER.email)).toHaveCount(0);
         await expect(
             inviteePage.getByText(organizationCopy.invite.title)
         ).toBeVisible();
-        // While a table refetches, its refresh button is disabled at half opacity
-        // and fades back in; axe would measure that transient contrast.
+        // Invitations are not prefetched on the server: the table fetches them once the
+        // client holds the bearer token, which can happen after the page looks settled.
+        // During that fetch its refresh button is disabled at half opacity, then fades in.
+        expect((await invitationsFetched).ok()).toBe(true);
         const refreshButtons = inviteePage.getByRole("button", {
             name: ptBr.components.table.refresh,
         });
         await expect(refreshButtons).toHaveCount(2);
         for (const refreshButton of await refreshButtons.all()) {
+            await expect(refreshButton).toBeEnabled();
             await expect(refreshButton).toHaveCSS("opacity", "1");
         }
```

E no topo, junto das outras constantes:

```ts
const INVITATIONS_API_PATH = "/organization/invitations";
```

Notas:

- O filtro por método descarta o `OPTIONS` de preflight (a requisição leva `Authorization`).
- A espera é registrada **antes** do `reload`, para não perder uma resposta rápida. O contexto do convidado não
  tinha nenhuma busca de convites pendente antes disso (era membro, consulta desligada).
- `toBeEnabled` garante que o React já aplicou o estado posterior à resposta; a opacidade 1 garante que a
  transição terminou. Os dois juntos, depois da resposta, descrevem o estado estável.
- Se um dia os convites passarem a ser pré-carregados no servidor, a espera fica sem resposta e o teste quebra
  nesta linha, por tempo. É o sinal certo para revisar a espera, não um falso verde.

### 10.2 `apps/e2e/support/stackEnv.ts`

```diff
     if (app === "app") {
         return {
             NEXT_PUBLIC_API_URL: urls.api,
             NEXT_PUBLIC_APP_URL: urls.app,
             NEXT_PUBLIC_WEB_URL: urls.web,
             VERCEL_PROJECT_PRODUCTION_URL: urls.app,
         };
     }
-    return {};
+    // NEXT_PUBLIC_APP_URL stays empty here: filled, the landing CTA would leave for the
+    // app instead of opening the landing's own sign-up page.
+    return { NEXT_PUBLIC_API_URL: urls.api };
 };
```

O comentário é da exceção 1 da regra de comentários (restrição que o código não mostra). Se o `/develop` achar
que o nome e o teste de unidade bastam, pode tirar.

### 10.3 `apps/e2e/__tests__/stackEnv.test.ts`

No caso "points each app at the other two" (`:85-104`):

```diff
-        writeEnv("web", ".env.example", ['NEXT_PUBLIC_APP_URL=""']);
+        writeEnv("web", ".env.example", [
+            'NEXT_PUBLIC_APP_URL=""',
+            'NEXT_PUBLIC_API_URL=""',
+        ]);
 …
-        // An empty app URL is what sends the landing CTA to the web sign-up page.
-        expect(
-            buildStackEnv("web", { appsRoot, urls }).NEXT_PUBLIC_APP_URL
-        ).toBe("");
+        // An empty app URL is what sends the landing CTA to the web sign-up page.
+        expect(buildStackEnv("web", { appsRoot, urls })).toMatchObject({
+            NEXT_PUBLIC_API_URL: urls.api,
+            NEXT_PUBLIC_APP_URL: "",
+        });
```

### 10.4 `apps/e2e/tests/crossAppSignOut.spec.ts` (novo)

Esqueleto. Nomes em inglês, cópia lida do dicionário, sem `waitForTimeout`.

```ts
import { expect, type Page, test } from "@playwright/test";
import { LOCALE, ptBr } from "../support/dictionary";
import { SEED_ACCOUNTS } from "../support/seedAccounts";
import { signInThroughForm } from "../support/signIn";
import { APP_URL, WEB_URL } from "../support/urls";

const headerCopy = ptBr.components.header;
const profileCopy = ptBr.apps.app.shared.profileDropdown;
const sessionEndedNotice = ptBr.packages.auth.provider.session.revoked;

const homePath = `/${LOCALE}`;
const appSignIn = new RegExp(`^${APP_URL}/${LOCALE}/sign-in`);
const webSignIn = new RegExp(`^${WEB_URL}/${LOCALE}/sign-in`);

const sessionDeleted = (page: Page, origin: string) =>
    page.waitForResponse(
        (response) =>
            response.request().method() === "DELETE" &&
            response.url() === `${origin}/api/auth/session`
    );

async function signInOnAppAndOpenLanding(page: Page) {
    await signInThroughForm(page, SEED_ACCOUNTS.common);
    await expect(page).toHaveURL(`${APP_URL}${homePath}`);
    await page.goto(`${WEB_URL}${homePath}`);
    // The landing adopts the shared session through the custom-token bootstrap.
    await expect(
        page.getByRole("button", { name: headerCopy.signOut })
    ).toBeVisible();
}

test("signing out on the landing ends the session in the app", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        await signInOnAppAndOpenLanding(page);

        const deleted = sessionDeleted(page, WEB_URL);
        await page.getByRole("button", { name: headerCopy.signOut }).click();
        expect((await deleted).ok()).toBe(true);
        await expect(
            page.getByRole("link", { name: headerCopy.signIn })
        ).toBeVisible();

        await page.goto(`${APP_URL}${homePath}`);
        await expect(page.getByText(sessionEndedNotice)).toBeVisible();
        await expect(page).toHaveURL(appSignIn);

        await page.goto(`${APP_URL}${homePath}`);
        await expect(page).toHaveURL(appSignIn);
    } finally {
        await context.close();
    }
});

test("signing out in the app ends the session on the landing", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
        await signInOnAppAndOpenLanding(page);

        await page.goto(`${APP_URL}${homePath}`);
        const signOutItem = page.getByRole("menuitem", { name: profileCopy.signOut });
        // A click that lands before the dropdown hydrates is lost.
        await expect(async () => {
            await page.getByRole("button", { name: profileCopy.triggerLabel }).click();
            await expect(signOutItem).toBeVisible({ timeout: 2000 });
        }).toPass();
        const deleted = sessionDeleted(page, APP_URL);
        await signOutItem.click();
        expect((await deleted).ok()).toBe(true);

        await page.goto(`${WEB_URL}${homePath}`);
        await expect(page.getByText(sessionEndedNotice)).toBeVisible();
        await expect(page).toHaveURL(webSignIn);

        await page.goto(`${APP_URL}${homePath}`);
        await expect(page).toHaveURL(appSignIn);
    } finally {
        await context.close();
    }
});
```

Pontos para o `/develop` conferir ao rodar o smoke:

- O papel e o nome do gatilho do menu do perfil (`DropdownMenuTrigger aria-label`,
  `apps/app/shared/components/ui/ProfileDropdown.tsx:44`) e do item "Sair" (`:91-94`). O padrão de repetir o
  clique até o menu abrir vem de `organizationOwnership.spec.ts:121-128`.
- Se o aviso some antes da asserção (toast), trocar a ordem: esperar o texto logo depois do `goto`, antes da
  URL, como está no esqueleto.
- `URL` com `?redirect=`: o provider pode acrescentar o destino (`provider.tsx:260-266`), por isso as regex só
  ancoram o começo.
- `new RegExp` com a URL: as URLs da pilha não têm caractere especial de regex além de `.` e `:`, que casam
  literalmente nesse contexto. Se o Biome reclamar, montar a regex no topo, como no esqueleto.

### 10.5 `apps/e2e/tests/global.setup.ts`

```diff
     await compileRoutes(page, [
         `/${LOCALE}/sign-up`,
         `${WEB_URL}/${LOCALE}/sign-up`,
+        `${WEB_URL}/${LOCALE}/sign-in`,
     ]);
```

### 10.6 `docs/SETUP.md`

Na lista de fluxos da seção "Testes E2E (Playwright)" (`:256-259`), acrescentar a saída entre apps: sair na
landing encerra a sessão da app e o contrário. O arquivo já tem um hunk de outra fatia sem commit (`git diff
--stat` mostra 2 linhas); o `/review` precisa preparar só o hunk desta tarefa.

### 10.7 Árvore de arquivos

```
apps/e2e/
  __tests__/stackEnv.test.ts            (alterado, T1)
  support/stackEnv.ts                    (alterado)
  tests/global.setup.ts                  (alterado)
  tests/organizationOwnership.spec.ts    (alterado, T2)
  tests/crossAppSignOut.spec.ts          (novo, T3 e T4)
docs/SETUP.md                            (um trecho)
```

### 10.8 Ordem de implementação e commits

Sem SDK, API, app ou i18n. Projeto do commit: `e2e`.

1. `test(e2e): wait for the invitations fetch before scanning the team page` (`organizationOwnership.spec.ts`).
2. `test(e2e): point the landing at the API and cover cross-app sign-out` (`stackEnv.ts`, `stackEnv.test.ts`,
   `global.setup.ts`, `crossAppSignOut.spec.ts`).
3. `docs: list cross-app sign-out among the e2e flows` (`docs/SETUP.md`, só o hunk desta tarefa).
4. `docs(features): e2e-org-ownership-flake-and-web-api-url`.

### 10.9 Env nova

Nenhuma no produto. Na pilha do E2E, a `web` passa a receber `NEXT_PUBLIC_API_URL`; nenhum fork precisa
configurar nada.

### Pré-requisitos manuais de infra

Nenhum.

---

## Perguntas em aberto (decididas por padrão)

| # | decisão | adotada | alternativa descartada | por quê |
|---|---------|---------|------------------------|---------|
| Q1 | Onde corrigir o *flake* | No teste: esperar a resposta de `GET /organization/invitations` antes da espera de opacidade, mais `toBeEnabled` | Corrigir o `Button` ou o contraste | O contraste medido (3,77) é de um estado transitório, e o botão habilitado fica com opacidade 1. A regra `cycle-policy.md` §1 proíbe afrouxar teste, e a tarefa proíbe mexer na regra ou no allowlist; a espera nova é mais estrita, não menos |
| Q2 | Pré-carregar os convites no servidor para tirar a busca do cliente | Não | Encadear `organization.get()` e, se dono, `listInvitations()` em `organization/page.tsx` | Muda `apps/app` e acrescenta uma ida à API por carga do dono. Esconde o sintoma na página da equipe, mas não resolve a causa geral (consulta ociosa mostrada como vazia), que também aparece na personificação. Menor raio de impacto: só `apps/e2e`. Vira achado em §1.6 |
| Q3 | Espera genérica no `expectAccessible` (aguardar `document.getAnimations()` do tipo `CSSTransition` terminar) | Não | Acrescentar essa espera em `apps/e2e/support/a11y.ts` para todo spec | Não resolve a causa: no caso medido nada animava quando a espera passou, a busca começou depois. Mudaria todas as varreduras da suíte por uma hipótese ainda não vista no CI. Fica como ideia de endurecimento, se aparecer um terceiro caso |
| Q4 | Quais URLs passar à `web` | Só `NEXT_PUBLIC_API_URL` | Também `NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_WEB_URL` (hipótese da linha 1706 do backlog) | `APP_URL` preenchida manda o CTA da landing para a app e quebra `landing.spec.ts:35`; o teste de unidade fixa o valor vazio de propósito. `WEB_URL` não muda nada que a suíte observe |
| Q5 | Teste E2E novo de saída entre apps cabe aqui? | Sim, `crossAppSignOut.spec.ts` com os dois sentidos | Só o sentido landing → app (o que a tarefa nomeia), ou nenhum teste novo | O objeto é a infra (duas front-ends, cookie por porta, Firebase por origem, autoridade na API), então E2E é o nível certo. Os dois sentidos exercitam caminhos diferentes da mesma variável (`end` e `check` da autoridade da `web`) e fecham as duas linhas do backlog (1623 e 1706) por uns 20 s de suíte |
| Q6 | Conta usada no teste novo | `user@example.com` (`SEED_ACCOUNTS.common`) num contexto novo | Conta nova por cadastro, como `organizationOwnership`, ou conta nova no seed | A revogação é por sessão (`auth/session/route.ts:33-45`), e a sessão salva em `AUTH_STATE.common` tem outro `auth_time`; os demais specs não são afetados. Cadastro com onboarding custa ~10 s por teste, e conta nova no seed mexe em `apps/api/scripts/seed-emulator.mjs` e na documentação do seed |
| Q7 | Projeto do Playwright | Só `chromium` | Incluir no `mobile` | O "Sair" da landing é `hidden md:inline`; o fluxo não é de visitante no celular (`CRITICAL_FLOWS`) |
| Q8 | Atualizar `docs/AUTH-SSO.md` dizendo que o passo 3 tem E2E | Não | Editar a seção "Como validar o fluxo completo" | O arquivo tem mudanças sem commit da fatia 2. A seção descreve a validação manual com Firebase real, que continua valendo; a lista de fluxos automatizados mora em `docs/SETUP.md` |
| Q9 | As quebras por tempo sob `next dev` local | Fora desta tarefa | Tratar junto | Causa diferente (compilação a frio, sempre por tempo, em pontos variados), sem reprodução no CI. A linha 1648 do backlog fica aberta só com essa parte quando o `/spec --sync` auditar |
