---
id: onboarding-flow
title: Onboarding pós-cadastro
status: done
value: alto
effort: M
audience: produto
area: [apps/app, apps/api, packages/sdk, packages/internationalization]
mode: ambos
depends_on: []
contends_on: [apps/app/proxy.ts, apps/app/shared/lib/postLoginNavigation.ts, apps/api/(shared)/lib/user-merge.ts, packages/sdk/src/types/user/user.ts, "apps/app/app/[locale]/(authenticated)/(common)/layout.tsx"]
feature: onboarding-flow
updated: 2026-09-24
---

# Onboarding pós-cadastro

## Problema

Quem termina o cadastro é jogado direto no painel, sem nenhum passo intermediário. O fork nasce sem
saber nada sobre o usuário além do e-mail, e o usuário nasce sem saber o que fazer — a primeira tela é
literalmente vazia. É o momento em que se decide se a pessoa fica, e hoje ele é um espaço em branco.

Para quem constrói o fork, o custo é pior: cada MVP reinventa "pegar o nome da pessoa e explicar o
produto" do zero, como um formulário solto que não sobrevive a um refresh.

## O que já existe no repo

- `apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx:38-51` — a mutation
  **`googleSignIn`** resolve o caminho (`resolveAppPostLoginPath`, `:44`) e faz `router.push` (`:49`). Já o
  cadastro por **e-mail/senha** faz `window.location.replace` (`:86`), dentro do `useEffect` (`:64-92`) que
  dispara depois do POST da sessão. Não há qualquer passo entre "cadastrou" e "está no painel", em
  nenhum dos dois fluxos. 🔁 **Correção de 2026-09-16 — a spec atribuía isto ao lugar errado.** A precisão de 2026-09-11 dizia que
  "esse mesmo `useEffect` dispara o e-mail de verificação". Não dispara: `requestVerificationEmail`
  (`:101-109`, com a chamada em `:105`) é ligada como `onSuccess` do `signUp.mutate` (`:114`), e o próprio
  docblock em `:94-100` registra que ela roda **depois** de o redirect já ter sido ordenado. A âncora `:105`
  está certa; a atribuição, não. **Por que importa:** a spec usava esse fato para dizer que já existe um
  gancho pós-cadastro **no caminho de redirect** — que é onde o desvio de onboarding precisaria entrar. O
  gancho existe, mas no `onSuccess` da mutation, fora do caminho que o onboarding interceptaria. O trabalho
  de desvio segue por fazer; e o banner de e-mail não
  verificado (`shared/components/ui/EmailNotVerifiedNotice.tsx`, montado em
  `(authenticated)/(common)/layout.tsx:41`) já provou que o painel comum aceita um aviso de estado
  incompleto. O caminho ficou mais barato do que a spec orçou.
- `apps/app/shared/lib/postLoginNavigation.ts` — ⚠️ **a PR #12 reescreveu este arquivo, e ele deixou de ter
  um ponto único de decisão.** *(Referências antigas `:31` e `:24` remedidas em 2026-09-15: as duas caíram
  dentro de `projectThemePreference`, função que nem existia quando a spec foi escrita.)* Hoje a decisão
  está fatiada em três: **`destinationForAccount` (`:80`)**, onde mora a regra de mandar admin para
  `/{locale}/admin` (`:92-93`); `resolveDefaultPostLoginForApp` (`:104`); e `resolveAppPostLoginPath`
  (`:112`), que honra `?redirect=` em `:124-126`.
  **O gancho natural para desviar um usuário incompleto mudou de endereço — é `destinationForAccount:80`.**
  E há um **quarto** caminho, `packages/auth/provider.tsx:128-144` (`redirectPath` +
  `resolvePostLoginPath`), que todo fork herda do pacote: um plano de onboarding precisa decidir
  explicitamente se intercepta nos dois ou se promove a decisão a um lugar só. Essa fragmentação é custo
  novo que a spec não orçava. *(A âncora era `:80-94` até a PR #20 inserir a renovação de sessão acima
  dela.)*
  ⚠️ **E apareceu mais um caminho em 2026-09-17.** A entrega de `session-refresh` acrescentou
  `handleSessionExpired` (`provider.tsx:235`), que manda para `/{locale}/sign-in` com um `?redirect=`
  próprio, montado por `expiredSessionOrigin` (`:72`). É mais um lugar decidindo destino de navegação
  autenticada, e o primeiro que decide isso **saindo** do produto em vez de entrando.

  ⚠️ **Recontagem de 2026-09-19 — a fragmentação é maior do que esta spec vinha dizendo.** Os números
  "quatro" e depois "cinco" saíram de uma contagem que colapsava duas funções numa só. Pelo critério da
  própria spec (função nomeada que decide destino), são **seis no cliente**: `destinationForAccount`
  (`postLoginNavigation.ts:80`), `resolveDefaultPostLoginForApp` (`:104`), `resolveAppPostLoginPath`
  (`:112`), `redirectPath` (`provider.tsx:128`), `resolvePostLoginPath` (`provider.tsx:130`) e
  `handleSessionExpired` (`provider.tsx:235`). `redirectPath` é o fallback síncrono e
  `resolvePostLoginPath` é a decisão assíncrona — são duas, não uma.

  E há **três decisões no servidor que esta spec nunca contou**, justamente na camada onde ela diz que o
  desvio precisa nascer: o proxy manda para `sign-in?redirect=<pathname>` quando não há sessão
  (`apps/app/proxy.ts:185-186`); o proxy faz o bounce do visitante autenticado em rota pública
  (`:189-202`); e **`(common)/layout.tsx:31-34` desvia admin para `/{locale}/admin`**. O último é o que mais
  muda o plano: é o único desvio de destino já implementado no servidor e é o padrão que o onboarding
  deveria seguir. **Total: 6 no cliente, 9 contando o servidor.**
- `packages/auth/redirect.ts:10` — `postAuthRedirectTarget` já sanitiza o deep link (guard de
  open-redirect, coberto por `apps/app/__tests__/postAuthRedirectTarget.test.ts`). Um fluxo retomável
  precisa exatamente disso para voltar ao destino original ao terminar.
- `apps/api/(shared)/lib/user-merge.ts:47` — **`createDefaultUserProfile`** (não `ensureDefaultUserProfile`
  — esse nome não existe no repo) cria o perfil com apenas `type: COMMON` e `reference_id`. É o ponto exato
  onde o estado inicial de onboarding nasceria. Há **dois** pontos de chamada diretos, ambos internos ao
  próprio `user-merge.ts` (`:22`, `:41`); a rota Google
  (`apps/api/app/(routes)/auth/sign-in/google/route.ts:16`) chega até ele **indiretamente**, via
  `getMergedUserByUid`.
- `apps/app/proxy.ts:76` — `PUBLIC_PATHS` (`isPublicPath` em `:97-99`); o proxy é default-deny (razão
  documentada em `:71-75`), então qualquer rota nova de onboarding já fica protegida sem allowlist.
  **Remedido em 2026-09-11:** a lista deixou de ser "só `/sign-in` e `/sign-up`" — a PR #10 a levou a
  **cinco** entradas (`:77-81`: `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`,
  `/verify-email`) e introduziu o conceito de rota pública **isenta do bounce**
  (`OOB_ACTION_PATHS:89`, `isOobActionPath:101`, consumido em `:189`), porque o redirect de visitante
  autenticado apaga a query string (`:200`). Um passo de onboarding que carregue token na URL herda
  exatamente esse problema — e agora herda também a solução.
- `packages/sdk/src/types/user/user.ts:12-28` — o `UserDTO` tem `id`, `type`, `reference_id`, timestamps e,
  desde as PRs #11/#12, **`phone` (`:19`), `avatar` (`:20`) e `preferences` (`:21`)**. *(Âncora remedida em
  2026-09-15: era `:7`, que hoje é o início de `UserPreferences`.)*
- 🔴 **O item 2 do corte perdeu quase todo o conteúdo — e isso precisa ser decidido antes do `/analyze`.**
  A spec propunha um fluxo que coleta **nome de exibição e idioma**. A PR #12 passou a coletar **exatamente
  esses dois dados**: `displayName` em `AccountProfileForm.tsx` e `locale` em `AccountPreferencesForm.tsx`,
  persistidos por `PUT /account` (`apps/api/app/(routes)/account/route.ts:107`) e projetados no login por
  `postLoginNavigation.ts:63-78`. **O que sobra do item 2 é o "quando", não o "o quê"** — a diferença entre
  "o usuário pode preencher" e "o produto pede antes de deixar entrar". Continua sendo uma diferença real
  de ativação, mas é um item muito menor do que o escrito, e o corte deve ser reescrito para dizer isso.
- **Lacuna:** não existe nenhuma noção de "perfil incompleto", nenhum passo guiado, nenhum estado
  persistido de progresso — `grep -rin onboarding` em `apps/` e `packages/` segue em **1 ocorrência**, e é
  um endereço de sandbox do Resend num fixture (`packages/email/__tests__/credentials.test.ts:23`).
  ~~O perfil não guarda sequer o nome próprio do usuário.~~ *(Essa frase caducou: o `displayName` já é
  editável pelo titular desde a PR #12, ainda que viva no Firebase Auth e não no `UserDTO`.)*

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](../../../specs/research/saas-starter-feature-benchmark.md)
- Prevalência: **3 de 10** starters do painel entregam onboarding pós-signup multi-step.
- Valor atribuído na nota: **muito alto** — descrito como o **maior desequilíbrio valor/prevalência de
  todo o painel**: "é onde o usuário decide se fica, e quase nenhum kit entrega".
- Armadilha nomeada na nota: **fluxo não retomável**. Quem fecha a aba no passo 2 volta ao passo 1, ou
  pior, entra no painel com metade do cadastro.

> Prevalência baixa (3/10) é o argumento **a favor**, não contra: a nota é explícita em que a raridade é
> lacuna de mercado, não sinal de irrelevância. Mesmo assim o valor aqui não se sustenta em benchmark —
> sustenta-se em dois fatos deste repo: o perfil criado em `user-merge.ts:47` não tem dado nenhum de
> produto, e a tela de destino está vazia (ver [`dashboard-home`](../dashboard-home/spec.md)).

## Proposta — corte de MVP

- [x] Ao entrar no painel com o perfil ainda incompleto, o usuário é levado a um fluxo de onboarding em
      vez do destino normal — decidido no servidor, não por redirect no cliente.
- [x] Fluxo de 2 a 3 passos, com progresso visível, coletando o mínimo genérico: nome de exibição e uma
      preferência que qualquer fork usa (idioma).
- [x] **Retomável:** o progresso é persistido a cada passo; fechar a aba e voltar cai no passo em que
      parou, e o deep link original (`?redirect=`) é honrado ao concluir.
- [x] Concluir marca o perfil como completo e nunca mais intercepta.
- [x] Um passo pode ser pulado quando o fork configurar assim, sem deixar o usuário preso.

### Reescopo que o `/analyze` deve aplicar (auditoria de 2026-09-23)

A auditoria contestou este corte em três rodadas seguidas (item 2 esvaziado pela PR #12; nove pontos de
decisão de destino contra os cinco declarados). Em vez de esperar uma reescrita completa, esta é a leitura
mínima que torna o corte planejável. Os cinco itens acima continuam valendo; o que muda é **onde** e
**com o quê** cada um se cumpre.

1. **Item 1 — o desvio mora no layout da área comum, não no proxy nem no cliente.**
   `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx:30-35` já desvia admin para `/{locale}/admin`
   no servidor, lendo o perfil que `resolvePanelSnapshot` resolve via `/auth/me`
   (`apps/app/lib/server/panelSnapshot.ts:23-38`, `apps/app/lib/server/authSession.ts:15-27`). Toda
   entrada na área comum passa por esse layout: login por senha, Google, sessão já existente e deep link.
   Decidir ali torna os seis resolvedores do cliente e as três decisões do proxy irrelevantes para o
   desvio, e nenhum deles precisa mudar. A pergunta em aberto "proxy ou resolvedor pós-login" fica
   respondida por uma terceira via, que é o padrão que o repositório já usa.
   As rotas do onboarding ficam **fora** do grupo `(common)` (irmãs dele dentro de `(authenticated)/`),
   senão o desvio intercepta a si mesmo. Admin sai pelo desvio que já existe antes de chegar ao novo;
   admin personificando um usuário incompleto **não** é interceptado, porque a impersonação é só leitura.
2. **Item 2 — nada novo a coletar.** Nome de exibição e idioma já são gravados por `PUT /account`
   (`apps/api/app/(routes)/account/route.ts:107`). O fluxo reaproveita essa escrita; o que ele acrescenta
   é a obrigatoriedade e a ordem, não campos. Nenhum campo de coleta novo no `UserDTO`.
3. **Item 3 — o único campo novo do perfil é o estado do onboarding** (passo atual e conclusão), nascendo
   em `createDefaultUserProfile` (`apps/api/(shared)/lib/user-merge.ts:47`). **Ressalva sobre o deep
   link:** um layout do App Router não recebe o caminho da requisição. Honrar `?redirect=` ao concluir exige
   que `apps/app/proxy.ts` repasse o caminho num header de requisição, ou que o corte aceite honrar o deep
   link só quando a entrada passou pelo login. A recomendação é o header, que é uma linha no proxy e é o
   motivo de `proxy.ts` seguir no `contends_on`. O destino final passa por `postAuthRedirectTarget`
   (`packages/auth/redirect.ts:10`), que já recusa open redirect.
4. **Item 4** sem mudança.
5. **Item 5 — um interruptor para o recurso inteiro e um "pular" por passo.** A variável que desliga o
   onboarding trata valor vazio como ausente, como o resto do repositório; ausente significa o padrão do
   core, que a spec recomenda ser ligado.
6. **Perfis legados:** campo ausente conta como concluído (recomendação da própria spec, adotada).
7. **Verificabilidade:** todos os critérios se provam sob o emulador de Auth e Firestore do
   `firebase-emulator-seed`, sem chave e sem serviço externo.

### Fora do corte

- Passos condicionais por papel/plano, checklist de ativação e tour interativo — dependem de haver
  produto, e cada fork tem o seu.
- Coleta de dados de domínio (empresa, cargo, segmento) — não é genérico; é código do fork, que apenas
  encaixa um passo a mais no fluxo.
- Convite de colegas ([`teams-organizations`](../../../specs/teams-organizations.md)), upload de avatar
  ([`file-upload-storage`](../file-upload-storage/spec.md) — **entregue**, PR #11) e
  e-mail de boas-vindas (`transactional-emails`).

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Estende o recurso de usuário com o estado de onboarding e a ação de avançar/concluir. |
| `apps/api` | Rota(s) sob o guard de painel comum; o estado inicial passa a nascer em `createDefaultUserProfile`. Sem coleção nova — é campo no perfil existente. |
| `apps/app` | Rotas novas dentro de `(authenticated)`, formulários com os `HookForm*` já existentes; ponto de desvio no resolvedor pós-login e no `proxy.ts`. |
| `apps/web` | N/A. |
| `packages/*` | i18n nos 3 idiomas (títulos de passo, ações, progresso, erros). Nenhuma mudança em `auth`. |
| Infra/env | Nenhuma variável nova, nenhum serviço externo. Possível índice se o admin passar a filtrar por estado de onboarding — fora do corte. |

## Riscos e trade-offs

- **Interceptação mal-feita vira loop de redirect.** O repo já tem histórico nisso: a regra registrada em
  `apps/app/CLAUDE.md` é reconciliar contexto no servidor e nunca redirecionar para rota autenticada pelo
  cliente. O desvio tem de nascer server-side.
- **Custo herdado por todo fork:** um passo obrigatório entre cadastro e painel. Um fork que não quer
  onboarding precisa desligá-lo por configuração, ou vai arrancá-lo do proxy — e aí o guard de
  autenticação vai junto. O interruptor faz parte do corte, não é refinamento.
- **Perfis pré-existentes.** Contas criadas antes do recurso não têm o estado; se o default for
  "incompleto", todo usuário legado é interceptado. Concluído por omissão é mais seguro.
- Passo obrigatório aumenta o abandono entre cadastro e primeira sessão; curto (2–3 passos) e pulável é
  mitigação, não solução.

## Sinais de pronto

- Um usuário recém-cadastrado cai no onboarding, e não no painel.
- Fechar a aba no meio e voltar retoma no mesmo passo, com o que já foi preenchido.
- Concluir leva ao destino que o usuário pedia antes de ser interceptado (deep link preservado).
- Um usuário que já concluiu nunca vê o fluxo de novo, inclusive após novo login.
- Nenhuma string do fluxo está fora do dictionary, nos 3 idiomas.
- Desligar o recurso por configuração devolve o comportamento atual, sem tocar em guard de auth.

## Perguntas em aberto

- Interceptar no `proxy.ts` (todas as rotas do painel) ou só no resolvedor pós-login? — **recomendação:**
  no proxy, porque só ele cobre quem volta por sessão já existente sem passar por login.
- O onboarding é ligado por padrão no boilerplate? — **recomendação:** sim, ligado, com interruptor de
  configuração; um core de MVPs deve entregar o caminho bom por default.
- Perfis antigos entram como completos ou incompletos? — **recomendação:** completos, para não
  interceptar quem já usa o fork.

## Estado da entrega

Auditado em 2026-09-24 pelo `/spec --sync`. PR **#24** mergeada em `main` em 2026-09-24T11:26:50Z (merge
commit `d52c4f0`), com CI `success` nesse SHA (`gh run 35993064246`, `headSha` = `d52c4f0e…`). Os cinco
itens do corte foram reabertos no código, lidos pelo bloco de reescopo acima:

| item | veredito | evidência |
|------|----------|-----------|
| 1. Perfil incompleto é levado ao onboarding, com a decisão no servidor | **implementado** | O layout da área comum chama `resolveOnboardingRedirect` logo depois do desvio de admin (`apps/app/app/[locale]/(authenticated)/(common)/layout.tsx:38-41`). A regra fica em `apps/app/lib/server/onboarding.ts:18-30`: interruptor desligado, perfil que não é comum (admin, inclusive personificando) ou estado ausente devolvem `null`. A rota do fluxo é irmã de `(common)` (`(authenticated)/onboarding/page.tsx`), então o desvio não intercepta a si mesmo |
| 2. Fluxo de 2 a 3 passos, com progresso visível, coletando nome de exibição e idioma | **implementado** | Dois passos declarados em `packages/sdk/src/types/user/user.ts:17-20`. Rótulo "Passo N de M" e barra em `OnboardingClient.tsx:102-104` e `:169-175`. O passo 1 grava o nome e o passo 2 grava o idioma pelo mesmo `PUT /account` da área de conta (`OnboardingClient.tsx:112-146`), sem campo de coleta novo no `UserDTO` |
| 3. Retomável, com o deep link honrado ao concluir | **implementado**, com deriva | O estado nasce em `createDefaultUserProfile` (`apps/api/(shared)/lib/user-merge.ts:52`) e avança por `POST /account/onboarding` (`apps/api/app/(routes)/account/onboarding/route.ts:14`, regra em `apps/api/(shared)/lib/onboarding.ts:71-109`). A página abre no passo gravado (`onboarding/page.tsx:45-67`), e o hook grava a conta antes de avançar o passo, então o passo volta preenchido (`useOnboardingMutations.tsx:34-42`). O proxy repassa o caminho no header `x-app-path` (`apps/app/proxy.ts:214-216`) e o destino passa por `postAuthRedirectTarget` (`apps/app/shared/lib/onboarding.ts:85-105`). A query string do destino se perde (ver deriva) |
| 4. Concluir marca o perfil como completo e nunca mais intercepta | **implementado** | O último passo grava `completedAt` (`apps/api/(shared)/lib/onboarding.ts:105-108`); com ele preenchido, `resolvePendingOnboarding` devolve `null` e a página redireciona para o destino (`onboarding/page.tsx:45-48`) |
| 5. Passo pulável quando o fork configurar, sem prender o usuário | **implementado** | `skippable` por passo em `ONBOARDING_STEPS` (`user.ts:17-20`), com recusa `400 ONBOARDING_STEP_NOT_SKIPPABLE` na API (`route.ts:41-46`). O interruptor do recurso inteiro é `ONBOARDING_ENABLED` (`apps/app/env.ts:11`), com vazio tratado como ligado (`apps/app/shared/lib/onboarding.ts:54-56`) |

Cobertura: `accountOnboardingRoute.test.ts` (12 casos), `onboardingState.test.ts` (14),
`signUpProfile.test.ts` e o caso novo de `googleSignInProfile.test.ts` na `apps/api`;
`onboardingClient.test.tsx` (12), `onboardingRedirect.test.ts` (8), `onboardingState.test.ts` (16) e o caso
novo de `proxy.test.ts` na `apps/app`. Os códigos de erro novos estão em `apiErrors` nos 3 idiomas
(`translations/packages/shared/utils.ts:51-55`, `:150-154`, `:248-252`). O `/test` fechou 20 de 20
critérios sob o emulador de Auth e Firestore, sem chave nem serviço externo (`test/report.md`, rodada 2).

## Deriva de implementação

| especificado | implementado | leitura |
|--------------|--------------|---------|
| "O deep link original (`?redirect=`) é honrado ao concluir" | O proxy grava só o `pathname` em `x-app-path` (`apps/app/proxy.ts:215`). `/pt-br/entities?page=2` vira `?redirect=%2Fpt-br%2Fentities` (observação O2 do `/test`) | **A implementação desviou**, por pouco. O caminho é honrado e a query não. Registrado como achado no `BACKLOG.md` |
| O estado nasce em `createDefaultUserProfile` | Nasce ali, e `POST /auth/sign-up` passou a chamar o helper em vez de gravar o perfil direto (`apps/api/app/(routes)/auth/sign-up/route.ts:35`). A criação pelo admin (`POST /users`) continua sem o estado, e esse perfil conta como concluído | **A spec estava incompleta**: não sabia que o cadastro por senha contornava o helper. As duas escolhas estão registradas como D3 e D4 no plano |
| `contends_on` com 5 arquivos | Tocou 4 deles. `postLoginNavigation.ts` ficou intacto, como o reescopo previa. Tocou sem declarar `packages/sdk/src/actions/account/action.ts`, `apps/api/(shared)/validation/account.schema.ts`, `auth/sign-up/route.ts`, `apps/app/env.ts` e `translations/packages/shared/utils.ts` | Mesmo padrão das entregas anteriores: o arquivo que falta é vizinho dos declarados, na mesma camada |
