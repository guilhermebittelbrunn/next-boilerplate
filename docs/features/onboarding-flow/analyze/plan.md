# Análise e blueprint: onboarding pós-cadastro

- **Spec de origem:** [`specs/onboarding-flow.md`](../../../../specs/onboarding-flow.md) (inclui o bloco "Reescopo que o
  `/analyze` deve aplicar", auditoria de 2026-09-23, adotado como base do corte).
- **Rodada:** autônoma, dentro de um `/cycle`. As decisões que pediriam pergunta foram tomadas pela escada
  spec → padrão do repo → menor raio de impacto e estão listadas no fim, com a alternativa descartada.
- **Branch:** nenhuma criada. Quem nomeia e cria é o `revisor-codigo`, no `/review`.

## Medições que mudam o reescopo

Duas coisas que o bloco de reescopo afirma foram conferidas no código e uma delas precisou de ajuste.

1. **O perfil nasce em mais de um lugar.** `createDefaultUserProfile` (`apps/api/(shared)/lib/user-merge.ts:47-55`)
   é chamado por `getMergedUserByUid` (`:22`) e `getMergedUserFromIdToken` (`:41`), e é por aí que passam os
   dois cadastros do painel: tanto o de e-mail/senha quanto o Google criam a conta pelo SDK cliente do
   Firebase (`packages/auth/client.ts:161-164`, `createUserWithEmailAndPassword`) e o perfil só nasce no
   primeiro `/auth/me` (`apps/api/app/(routes)/auth/me/route.ts:15`). Mas há dois outros pontos que gravam
   perfil **direto no repositório**, sem passar pelo helper:
   - `apps/api/app/(routes)/auth/sign-up/route.ts:34-37`, o `POST /auth/sign-up` da API. Nenhum front deste
     repo o chama hoje (`grep "auth/sign-up"` só encontra a lista de rate limit em `apps/api/proxy.ts:46`),
     mas é rota pública e um fork pode usá-la.
   - `apps/api/app/(routes)/users/route.ts:67-70`, a criação de usuário pelo admin.

   O plano troca a primeira por `createDefaultUserProfile(localId)` (mesma escrita, mais o estado inicial) e
   deixa a segunda como está: conta criada por admin não recebe o campo e conta como concluída. Ver
   decisão D3.
2. **O desvio no layout funciona como a auditoria descreveu.** `(common)/layout.tsx:28-35` já lê
   `resolvePanelSnapshot()` (`apps/app/lib/server/panelSnapshot.ts:23-38`), que chama `getAppSessionUser()`
   (`apps/app/lib/server/authSession.ts:15-32`, `cache` do React). O root layout chama a mesma função
   (`apps/app/app/layout.tsx:40`), então ler o perfil de novo no layout comum não gera requisição nova. O
   payload do `/auth/me` já carrega todos os campos do documento do Firestore, serializados
   (`apps/api/(shared)/mappers/user.mapper.ts:59-68`, com `Timestamp` e `Date` virando ISO em `:30-47`),
   então o estado do onboarding chega ao layout sem mudar o `/auth/me`.

   Sob impersonação o cliente do servidor manda só o bearer do admin
   (`apps/app/lib/server/apiServerClient.ts:15-32`), então o `/auth/me` resolve o ator: `profileKind` fica
   `admin` e o desvio novo, que só olha perfil `common`, nunca dispara para quem está personificando.

## Etapa 1 — Análise

### 1. Contexto

Quem termina o cadastro cai direto no painel. O perfil criado em `user-merge.ts:47-55` só tem `type` e
`reference_id`. Nome de exibição e idioma já são editáveis na área de conta (`PUT /account`,
`apps/api/app/(routes)/account/route.ts:107-167`), mas nada pede esses dados antes da primeira sessão, e
nada lembra se a pessoa já passou por isso.

#### Objetivo em uma frase

Um usuário comum recém-criado é levado, pelo servidor, a um fluxo curto de dois passos (nome, depois
idioma) que persiste o progresso a cada passo, respeita o deep link ao terminar e nunca mais aparece depois
de concluído.

#### Corte desta rodada

| Item da spec | Como se cumpre aqui |
|---|---|
| 1. Desvio decidido no servidor | `(common)/layout.tsx`, logo abaixo do desvio de admin. Rota do onboarding fora de `(common)`, em `(authenticated)/onboarding`. Nenhum dos resolvedores de destino do cliente muda. |
| 2. Fluxo de 2 a 3 passos com progresso | Dois passos: `profile` (nome de exibição, obrigatório) e `preferences` (idioma, pulável). Indicador "Passo X de 2" + `Progress` do design system. Os dados vão por `PUT /account`, sem campo de coleta novo. |
| 3. Retomável, deep link honrado | Campo `onboarding: { step, completedAt }` no perfil, gravado a cada passo por `POST /account/onboarding`. O proxy repassa o caminho pedido num header de requisição; o layout o põe em `?redirect=`; o fim do fluxo passa por `postAuthRedirectTarget`. |
| 4. Concluir marca como completo | `completedAt` preenchido no último passo. Com ele preenchido, o layout não intercepta mais. |
| 5. Passo pulável e interruptor | `skippable` declarado por passo, conferido também na API. Interruptor `ONBOARDING_ENABLED` na `apps/app`: vazio ou ausente liga, `"false"` desliga. |
| Perfis legados | Perfil sem o campo conta como concluído. |

#### Fora do corte

Da spec, sem mudança: passos condicionais por papel/plano, checklist de ativação, tour, coleta de dados de
domínio, convite de colegas, upload de avatar, e-mail de boas-vindas.

Decidido nesta análise:

- Voltar ao passo anterior. O estado só anda para frente; quem quiser corrigir o nome faz isso na área de
  conta.
- Botão "Sair" na tela do onboarding (ver pergunta P2).
- Status de onboarding na listagem admin e filtro por ele (a spec já registra que exigiria índice).
- Tema como parte do passo de preferências. O passo coleta só o idioma, que é o que a spec pede.
- Onboarding na `apps/web`.

### 1.2 Apps impactados, painel e modo de produto

| Camada | O que muda |
|---|---|
| `packages/sdk` | Tipos e a lista de passos em `types/user/user.ts`; ação `advanceOnboarding` em `actions/account/action.ts`. |
| `apps/api` | Rota nova `POST /account/onboarding`; schema em `account.schema.ts`; lógica pura em `(shared)/lib/onboarding.ts`; estado inicial em `createDefaultUserProfile`; `auth/sign-up/route.ts` passa a usar o helper. |
| `apps/app` | Header no `proxy.ts`; desvio no `(common)/layout.tsx`; rota `(authenticated)/onboarding/`; helpers em `lib/server/onboarding.ts` e `shared/lib/onboarding.ts`; env nova. |
| `packages/internationalization` | Módulo `apps/app/pages/onboarding` nos 3 idiomas; 3 códigos novos em `apiErrors`. |
| `apps/web` | N/A. |
| `packages/auth`, `packages/design-system` | Sem mudança. |

- **Área do painel:** só a comum. Admin sai pelo desvio que já existe (`layout.tsx:30-35`) antes de chegar
  ao novo.
- **Modo de produto:** nenhum código da `apps/app` lê `NEXT_PUBLIC_PRODUCT_MODE` hoje (`grep` por
  `getProductMode`/`isSubscriptionMode` só encontra `packages/next-config`). No modo `simple` o usuário
  comum opera na `apps/web` e só vê o onboarding se entrar no painel comum. A `apps/web` não intercepta.
- **Assinatura/plano:** não depende.
- **Dependências externas:** nenhuma nova. Nenhuma dependência de pacote nova.
- **Genérico × específico:** genérico. Nome e idioma servem a qualquer fork; o fork acrescenta passo
  editando a lista de passos e a tela correspondente.

### 1.3 Fontes

Só a spec e o código. Nenhum link externo, print ou Figma.

### 2. Dados (Firestore)

#### 2.1 Documento

Coleção existente `user` (`apps/api/(shared)/repositories/user.repository.ts:22-25`, sem mapper). Um campo
novo:

| Campo | Tipo | Default ao nascer | `null`? | Por quê |
|---|---|---|---|---|
| `onboarding` | map `{ step: OnboardingStepId; completedAt: Timestamp \| null }` | `{ step: "profile", completedAt: null }` | ausente = concluído | Guarda o passo em que o usuário parou e quando concluiu. |

Nomes considerados para o campo: `onboarding` (adotado, curto e alinhado ao nome da feature),
`onboardingState`, `activation`. Para o passo: `step` guarda o **próximo passo a mostrar**, não o último
concluído, para que ler o estado já diga que tela renderizar.

`completedAt` segue o precedente de `lastAccessAt` (`packages/sdk/src/types/user/user.ts:22-27`): gravado
como `Date` (vira `Timestamp` no Firestore) e sai como ISO pelo `serializeFirestoreData`.

- **Ownership:** o documento é o próprio perfil do usuário; o id vem do token via
  `ctx.subjectProfile.id`.
- **Soft delete:** N/A (o perfil já tem `deletedAt`; nada aqui apaga).
- **Regras do Firestore:** sem mudança. `firestore.rules` nega tudo ao cliente; só a API escreve.

#### 2.2 Consultas

Nenhuma consulta nova. O estado é lido junto do perfil, por `findByReferenceId`
(`user.repository.ts:27-42`), que o guard e o `/auth/me` já fazem. **Sem índice novo.**

#### 2.3 Dados existentes

- Perfis gravados antes da feature não têm o campo e contam como concluídos. Nenhum backfill.
- Perfis do seed do emulador (`apps/api/scripts/seed-emulator.mjs:110-128`) também não têm o campo: as
  contas semeadas nunca veem o onboarding. O `/test` produz o estado pendente cadastrando uma conta nova.
- Formato inválido no campo (não é objeto, `completedAt` que não é instante nem `null`): o app trata como
  concluído. Passo desconhecido com `completedAt: null` (um fork removeu um passo): app e API tratam como o
  primeiro passo da lista.
- O export de dados do titular leva o campo automaticamente, porque `toExportAccount`
  (`apps/api/(shared)/lib/account-export.ts:36-58`) repassa os campos do perfil. É dado do próprio titular;
  nada a mudar.

### 3. Contrato `@repo/sdk`

Em `packages/sdk/src/types/user/user.ts`, ao lado de `UserPreferences`:

- `ONBOARDING_STEPS`: lista ordenada `{ id, skippable }`. É a única fonte da ordem e da regra de pular, lida
  pela API (para validar) e pelo app (para renderizar). Runtime em `types/` já tem precedente no mesmo
  arquivo (`enum UserType`, `:2-5`).
- `OnboardingStepId`, `OnboardingState` (no `UserDTO`, `completedAt: Date | null`),
  `OnboardingStateDTO` (resposta, `completedAt: string | null`), `AdvanceOnboardingRequest`.
- `UserDTO.onboarding?: OnboardingState | null`.

Em `packages/sdk/src/actions/account/action.ts`: `advanceOnboarding(body) → Promise<OnboardingStateDTO | null>`
(`POST /account/onboarding`). Contexto `common`, já registrado como `apiClient.account`
(`packages/sdk/src/client/index.ts:24`).

Quem quebra: ninguém. Os campos são opcionais e a ação é nova.

### 4. API (`apps/api`)

#### 4.1 Rota e guard

`POST /account/onboarding` em `apps/api/app/(routes)/account/onboarding/route.ts`, com
`requireCommonPanelApi` (`apps/api/app/(guards)/common-panel.ts:32-114`). POST segue as outras ações de
conta (`/account/password`, `/account/deletion`, `/account/sessions/revoke`).

O guard já cobre o que a rota precisa:

- sem ator → 401 `AUTH_INVALID_TOKEN` (`:38-43`);
- admin sem impersonação → 403 `COMMON_PANEL_FORBIDDEN` (`:77-82`);
- admin personificando → 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY`, porque é método de escrita
  (`:65-71` + `apps/api/(shared)/lib/impersonation-read-only.ts:19-31`).

Não entra em `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:44-55`): é autenticada e barata, como `PUT /account`.
Nenhum header novo para o CORS.

#### 4.2 Validação na borda

`advanceOnboardingSchema` em `apps/api/(shared)/validation/account.schema.ts`, com `.strict()` pelo mesmo
motivo documentado em `:21-37` (o perfil vem do token; `id` ou `uid` no corpo é tentativa de escrever em
outra conta). `parseAdvanceOnboarding` na forma de união discriminada usada em `:73-101`. Corpo lido com
`parseRequestJson`.

#### 4.3 Regra de transição

Função pura `advanceOnboardingState(current, request, now)` em `apps/api/(shared)/lib/onboarding.ts`. Na
ordem:

1. Estado ausente ou `completedAt` preenchido → `unchanged` (200, sem escrita). Clique duplo no último passo
   e aba antiga caem aqui.
2. Passo pedido **antes** do passo atual → `unchanged` (200, devolve o estado atual). É o caso da segunda
   aba que ficou para trás: o cliente recebe o passo certo e segue.
3. Passo pedido **depois** do atual → 409 `ONBOARDING_STEP_OUT_OF_ORDER`. Só acontece com corpo forjado ou
   estado divergente.
4. `outcome: "skipped"` num passo com `skippable: false` → 400 `ONBOARDING_STEP_NOT_SKIPPABLE`.
5. Senão avança: o próximo passo vira `step`; no último passo, `completedAt = now` e `step` fica no último
   id.

Passo gravado que não existe mais na lista é tratado como índice 0.

A API **não** confere se o nome foi de fato salvo antes de aceitar `completed` no passo `profile`: o
`PUT /account` já aceita `displayName` vazio ou `null` (`account.schema.ts:28-30`), então essa checagem não
protegeria nada que a conta já não permita. Ver D6.

#### 4.4 Persistência

`userRepository.update({ id: ctx.subjectProfile.id, onboarding })` (`base.repository.ts:203-215`). O
`update` do Firestore com um map substitui o campo inteiro, que é o que se quer. Falha na escrita → 500
`ONBOARDING_UPDATE_FAILED`, no mesmo formato de `ACCOUNT_UPDATE_FAILED` (`account/route.ts:84-92`).

Estado inicial: `createDefaultUserProfile` passa a incluir `onboarding: initialOnboardingState()`. O
`...dto` continua por último, então quem passar `onboarding` explícito sobrescreve.

`POST /auth/sign-up` troca `userRepository.create({ reference_id, type: COMMON })` por
`createDefaultUserProfile(localId)`. O `try/catch` com rollback da conta Auth (`sign-up/route.ts:33-47`)
continua igual.

#### 4.5 Códigos de erro

| `error.code` | Status | Quando | Novo? |
|---|---|---|---|
| `VALIDATION_FAILED` | 400 | passo desconhecido, `outcome` inválido, chave extra | existente |
| `ONBOARDING_STEP_NOT_SKIPPABLE` | 400 | pular passo obrigatório | **novo** |
| `ONBOARDING_STEP_OUT_OF_ORDER` | 409 | passo à frente do atual | **novo** |
| `ONBOARDING_UPDATE_FAILED` | 500 | escrita no Firestore falhou | **novo** |
| `AUTH_INVALID_TOKEN` | 401 | sem sessão | existente |
| `COMMON_PANEL_FORBIDDEN` | 403 | admin | existente |
| `AUTH_REQUEST_IMPERSONATION_READ_ONLY` | 403 | admin personificando | existente |

Os três novos entram em `apiErrors` nos 3 idiomas
(`packages/internationalization/translations/packages/shared/utils.ts`, ao lado de
`ACCOUNT_DELETION_FAILED` em `:49`, `:143`, `:236`).

### 5. Front-end (`apps/app`)

#### 5.1 Onde entra

- **Header do caminho no proxy.** No `NextResponse.next()` final (`apps/app/proxy.ts:211`), o proxy passa a
  repassar `x-app-path` com o `pathname` da requisição, via `NextResponse.next({ request: { headers } })`.
  O proxy **sobrescreve** o valor (`headers.set`), então um header forjado pelo navegador nunca chega ao
  layout. Só o `pathname`, sem query, como o redirect de visitante anônimo já faz em `:185` (ver D5).
  `applySecurityHeaders` (`packages/security/middleware.ts:146-160`) só escreve no objeto de resposta, então
  o repasse sobrevive.
- **Desvio no layout comum.** `(common)/layout.tsx`, depois do bloco de admin (`:30-35`):
  `const onboardingPath = await resolveOnboardingRedirect(locale); if (onboardingPath) redirect(onboardingPath);`.
  A lógica fica em `apps/app/lib/server/onboarding.ts`, testável como `serverGuards.test.ts` testa
  `requireSession`.
- **Rota do onboarding.** `apps/app/app/[locale]/(authenticated)/onboarding/`, irmã de `(common)` e
  `(admin)`. Herda o `requireSession` de `(authenticated)/layout.tsx:9-16` e fica protegida pelo
  default-deny do proxy (`proxy.ts:71-82`) sem allowlist. Não tem Navbar, sidebar nem o aviso de e-mail
  não verificado, que moram no layout comum.
- **Gate da própria página.** O `page.tsx` redireciona para o destino quando não há o que fazer: interruptor
  desligado, perfil admin, legado ou concluído. Admin vai para o destino e o layout comum o manda para
  `/admin`, um salto a mais que só acontece em URL digitada à mão.

Um layout do App Router não re-renderiza em navegação suave entre páginas do mesmo grupo, então o header lido
ali reflete a requisição que montou o layout. Isso basta: o desvio só importa na entrada no grupo, e quem
entrou sem ser desviado não tem onboarding pendente. O desvio de admin tem a mesma propriedade.

#### 5.2 Laço de redirect

O layout comum só manda para `/onboarding` com onboarding pendente; a página do onboarding só manda de volta
com ele não pendente. As duas leem a mesma fonte (`getAppSessionUser`) na mesma requisição, então não há
laço. O caso que criaria laço é `?redirect=/pt-br/onboarding` com o onboarding concluído: a página mandaria
para si mesma. O helper de destino recusa qualquer alvo cujo caminho, sem o locale, seja `/onboarding` ou
comece com `/onboarding/`, e cai no fallback `/{locale}`.

#### 5.3 Dados

- Conta: `useMyAccount` (`apps/app/shared/hooks/useMyAccount.ts`, `useAuthorizedQuery`) com
  `queryKeys.account.me()` (`apps/app/shared/lib/queryKeys.ts:12-15`), prefetch no RSC com
  `HydrationBoundary` como `account/(pages)/(home)/page.tsx:11-31`. O prefetch não precisa do
  `isImpersonating()`, porque admin (personificando ou não) nunca chega a renderizar a página; o plano mantém
  o guard mesmo assim, por consistência com o padrão.
- Mutação: `useOnboardingMutations` em `onboarding/(hooks)/useOnboardingMutations.tsx`. Uma mutation,
  `advanceOnboardingMutation`, cujo `mutationFn` faz `apiClient.account.update(account)` quando o passo
  traz dado e depois `apiClient.account.advanceOnboarding({ step, outcome })`. Um só `isPending` cobre as
  duas chamadas. `onSuccess` invalida `queryKeys.account.me()`; `onError` usa
  `handleClientError(new FormattedError(error, locale))` + `errorAlert`, como `useAccountMutations.tsx:19-31`.
  Sem toast de sucesso: o avanço de tela já é o retorno.
- Passo corrente: vem do servidor (`page.tsx` lê de `getAppSessionUser()`) e entra no cliente como
  `initialStep`. O `OnboardingClient` recebe `key={initialStep}` para remontar quando um `router.refresh()`
  trouxer outro passo. Depois de cada sucesso o cliente troca de passo com o estado devolvido pela API.
- Falha parcial: se o `PUT /account` passa e o `POST /account/onboarding` falha, o nome já está salvo e o
  passo não andou. Na volta o passo 1 aparece de novo, já preenchido. É o comportamento retomável que a
  spec pede.

#### 5.4 Formulários

| Passo | Campo | Componente | Validação | Pulável |
|---|---|---|---|---|
| `profile` | `displayName` | `HookFormInput` (`type="text"`, `required`) | `trim`, 1 a 120 (`DISPLAY_NAME_MAX` igual a `account.schema.ts:4`) | não |
| `preferences` | `locale` | `HookFormSelect` (`searchable={false}`) com endônimos | `z.enum(["pt-br","en","es"])` | sim |

- Schema em `onboarding/(validations)/onboardingFormSchema.ts`, factory `buildOnboardingProfileSchema(dictionary)`
  e `buildOnboardingPreferencesSchema()`, como `accountFormSchema.ts:52-105`.
- Defaults: `displayName` de `account.displayName` (Google já traz um), `locale` de
  `account.preferences.locale` com fallback no locale da URL. `form.reset` quando a conta chega.
- Endônimos: a lista de 3 idiomas de `AccountPreferencesForm.tsx:33-37` é duplicada no passo, não
  importada entre rotas (ver D8).
- Ações: `Footer` dentro do `<form>` com `showBack={false}` no passo obrigatório. No passo pulável,
  `onBack={handleSkip}` e `backLabel={copy.actions.skip}`. O botão secundário do `Footer` não é bloqueado
  por `isLoading` (`Footer.tsx:43-60` só bloqueia o primário), então `handleSkip` retorna cedo quando a
  mutation está pendente. Rótulo do primário: "Continuar" no passo 1, "Concluir" no último.
- Fim do fluxo: resposta `null` ou com `completedAt` → navega. Se o passo de idioma foi concluído com um
  locale diferente do da URL, grava o cookie `x-locale` (como `AccountPreferencesForm.tsx:88-92`) e troca o
  segmento de locale do destino (ver D7). Navegação por `router.replace(destination)`, para que "voltar" no
  navegador não caia no onboarding.
- 409 `ONBOARDING_STEP_OUT_OF_ORDER`: toast traduzido e `router.refresh()` para ressincronizar o passo.

#### 5.5 Árvore e estados

Tela centralizada, `Card` com título, subtítulo, "Passo X de 2" e `Progress`
(`packages/design-system/components/ui/progress.tsx`), e o formulário do passo. Mobile primeiro, largura
máxima como a coluna de `(unauthenticated)/layout.tsx:43-46`.

Estados: carregando (`FormSkeleton` no `loading.tsx`), erro de carga da conta (`Container` com `loadError`),
submit pendente (primário com `loading`, pular inerte), erro de validação (mensagem no campo), erro de API
(toast pelo `error.code`).

#### 5.6 i18n

Módulo novo `translations/apps/app/pages/onboarding/index.ts`, registrado em
`translations/apps/app/pages/index.ts` nos 3 idiomas. Variáveis de dicionário com nome descritivo
(`onboardingCopy`, `onboardingProfileCopy`). A contagem usa placeholders `{current}`/`{total}` com
`.replace`, porque não há helper de interpolação na `apps/app` (o `interpolate` existente é do
`packages/email`). Árvore completa na seção 10.6.

### 6. Autorização e segurança

- **Camadas:** proxy (sessão, default-deny) → `(authenticated)/layout.tsx` (`requireSession`) →
  `(common)/layout.tsx` (desvio) → guard da API. A regra de negócio "pendente é desviado" vive no layout; a
  regra "o estado só anda para frente e passo obrigatório não se pula" vive na API.
- **Impersonação:** o desvio não dispara (o layout vê o ator admin). A escrita é recusada pela API
  (`AUTH_REQUEST_IMPERSONATION_READ_ONLY`). A página do onboarding manda o admin para o destino.
- **Admin:** nunca é desviado; a API recusa com `COMMON_PANEL_FORBIDDEN`.
- **Ids do corpo:** nenhum. `.strict()` recusa `id`/`uid`/`type`.
- **Open redirect:** o header e o `?redirect=` passam por `postAuthRedirectTarget`
  (`packages/auth/redirect.ts:10-33`) nas duas pontas: no layout, antes de montar a URL do onboarding, e na
  página, antes de navegar. Mais a recusa do alvo `/onboarding` (5.2).
- **Header forjado:** o proxy sempre sobrescreve `x-app-path`.
- **Dado sensível:** o estado não é sensível. Nada novo em log.

### 7. Testes

Todos no nível unitário, sem emulador: nenhuma consulta nova, nenhuma regra nova, nenhum índice.

| Arquivo | Nível | O que prova |
|---|---|---|
| `apps/api/__tests__/onboardingState.test.ts` (novo) | função pura | as 5 regras de 4.3; passo desconhecido tratado como o primeiro; `completedAt` só no último passo |
| `apps/api/__tests__/accountOnboardingRoute.test.ts` (novo) | rota, guard real com `resolveApiActor` e repositório mockados, como `accountRoute.test.ts` | 200 com `update` chamado com `{ id, onboarding }`; 200 sem escrita para legado e concluído; 400 `VALIDATION_FAILED` (passo desconhecido, chave extra); 400 `ONBOARDING_STEP_NOT_SKIPPABLE`; 409; 500 `ONBOARDING_UPDATE_FAILED`; 403 admin; 403 personificando; 401 |
| `apps/api/__tests__/googleSignInProfile.test.ts` (estender) | rota | perfil novo nasce com `onboarding: { step: "profile", completedAt: null }` |
| `apps/api/__tests__/signUpProfile.test.ts` (novo) | rota | `POST /auth/sign-up` cria o perfil com o estado inicial e mantém o rollback quando a criação falha |
| `apps/app/__tests__/onboardingState.test.ts` (novo) | função pura | `readOnboardingState` (formato inválido → `null`), `isOnboardingPending`, `isOnboardingEnabled` (`undefined`, `""`, `"true"` → ligado; `"false"` → desligado), `buildOnboardingPath` (omite home, sanitiza), `resolveOnboardingDestination` (open redirect, alvo `/onboarding`, troca de locale) |
| `apps/app/__tests__/onboardingRedirect.test.ts` (novo) | helper de servidor, como `serverGuards.test.ts` | pendente → caminho com `?redirect=`; admin → `null`; admin personificando → `null`; legado → `null`; interruptor desligado → `null` |
| `apps/app/__tests__/proxy.test.ts` (estender) | proxy | requisição autenticada repassa `x-app-path` (conferido em `x-middleware-request-x-app-path` da resposta); header forjado na entrada é sobrescrito |
| `apps/app/__tests__/onboardingClient.test.tsx` (novo) | componente, `apiClient`/`next/navigation`/`useAlert` mockados | passo 1 sem "Pular" e com erro de nome vazio; submit chama `account.update` e depois `advanceOnboarding`; passo 2 com "Pular" que chama só `advanceOnboarding` com `skipped`; fim chama `router.replace` com o destino |
| `packages/internationalization/__tests__/parity.test.ts` | existente | paridade das chaves novas |

### 8. O que o `/test` vai ter de percorrer

Tudo roda sob o emulador de Auth e Firestore (`pnpm emulators` + `pnpm seed` + `pnpm dev`). Nada exige
serviço externo.

Fluxos:

1. **Cadastro novo cai no onboarding.** Cadastrar `qa-onboarding@example.com` por e-mail/senha em
   `/pt-br/sign-up`. Esperado: `/pt-br/onboarding`, "Passo 1 de 2", sem sidebar nem navbar.
2. **Validação e passo obrigatório.** Enviar o nome vazio → mensagem traduzida no campo. Passo 1 sem botão
   "Pular".
3. **Retomada.** Preencher o nome e continuar. Na tela do passo 2, recarregar a página e depois fechar a aba
   e abrir `/pt-br` de novo. Esperado: passo 2 nas duas vezes; o nome aparece na área de conta depois.
4. **Deep link.** Com o onboarding pendente, digitar `/pt-br/entities/create` na barra. Esperado:
   `/pt-br/onboarding?redirect=%2Fpt-br%2Fentities%2Fcreate`; ao concluir, cai em `/pt-br/entities/create`.
5. **Troca de idioma no fim.** Concluir escolhendo English. Esperado: destino com `/en/…`, interface em
   inglês, preferência salva.
6. **Pular.** Com outra conta nova, pular o passo 2. Esperado: vai para o destino no locale da URL.
7. **Nunca mais.** Sair, entrar de novo com a conta concluída. Esperado: painel direto. Abrir
   `/pt-br/onboarding` à mão → redirecionado para `/pt-br`.
8. **Legado.** Entrar com uma conta do seed. Esperado: painel direto.
9. **Admin e impersonação.** Admin do seed vai para `/admin`. Admin personificando a conta pendente do fluxo
   6 (antes de concluir) vê o painel comum dela, sem desvio.
10. **Redirect malicioso.** `/pt-br/onboarding?redirect=https://example.org` e
    `?redirect=/pt-br/onboarding`, com o onboarding pendente e depois concluído. Esperado: nunca sai do
    domínio e nunca entra em laço.
11. **Interruptor.** `ONBOARDING_ENABLED="false"` na `apps/app`, reiniciar o app, cadastrar conta nova.
    Esperado: painel direto; `/pt-br/onboarding` redireciona para `/pt-br`. Voltar a `""` e a mesma conta
    passa a ser desviada (ver "Modo degradado").
12. **Clique duplo.** Clicar duas vezes rápido em "Continuar". Esperado: uma transição só, sem toast de erro.

Combinações: light, dark e mobile (375 px) nas duas telas do fluxo; os 3 idiomas (`/pt-br`, `/en`, `/es`
em `/onboarding`); comum, admin e admin personificando.

Estados que o `/test` precisa produzir: pendente (cadastro novo), concluído (fim do fluxo), legado (seed),
erro de API (409 com `curl` autenticado mandando `step: "preferences"` quando o atual é `profile`; o 500 fica
com o teste de rota).

Nada do fluxo depende de infra externa, então nenhum critério deve terminar como não verificado por falta
de infra.

### 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Usuário comum recém-cadastrado é desviado para o onboarding**
  Uma conta criada por e-mail/senha ou Google, ao entrar na área comum, é redirecionada no servidor para
  `/{locale}/onboarding` antes de qualquer página do painel renderizar. O redirect acontece num salto só,
  sem página intermediária do painel piscando e sem redirect feito pelo cliente.

- [ ] **O perfil novo nasce com o estado inicial**
  O documento criado em `createDefaultUserProfile` e em `POST /auth/sign-up` traz
  `onboarding: { step: "profile", completedAt: null }`. Contas criadas pelo admin em `POST /users` não
  recebem o campo e contam como concluídas.

- [ ] **Progresso visível**
  Cada tela mostra "Passo X de 2" traduzido e uma barra de progresso coerente com o passo. Os textos existem
  nos 3 idiomas e respeitam o locale da URL.

- [ ] **Nome de exibição é obrigatório**
  O passo 1 não mostra "Pular". Nome vazio ou só com espaços mostra a mensagem de validação traduzida e não
  chama a API; acima de 120 caracteres também é recusado. Um `POST /account/onboarding` forjado com
  `{ step: "profile", outcome: "skipped" }` responde 400 `ONBOARDING_STEP_NOT_SKIPPABLE`.

- [ ] **Nome é salvo pelo endpoint de conta existente**
  Concluir o passo 1 grava o nome por `PUT /account`, e a área de conta passa a exibi-lo. Nenhum campo de
  coleta novo aparece no `UserDTO`.

- [ ] **Idioma é pulável e salvo quando escolhido**
  O passo 2 mostra "Pular". Concluir grava `preferences.locale` por `PUT /account`; pular não altera a
  preferência e conclui o fluxo do mesmo jeito.

- [ ] **Retomável**
  Recarregar, fechar a aba ou sair e entrar de novo no meio do fluxo reabre no passo em que parou, com o
  nome já preenchido quando o passo 1 foi concluído. O passo vem do servidor, não da URL, então editar a
  URL não pula passo.

- [ ] **Deep link preservado**
  Quem pediu `/{locale}/qualquer/rota` com o onboarding pendente vai para
  `/{locale}/onboarding?redirect=%2F{locale}%2Fqualquer%2Frota` e, ao concluir, cai na rota pedida. Sem
  deep link (entrada pela home), a URL do onboarding não carrega `?redirect=` e o destino é `/{locale}`.

- [ ] **Troca de idioma leva o destino junto**
  Se o passo 2 foi concluído com um idioma diferente do da URL, o destino final usa o novo locale e o cookie
  `x-locale` é gravado. Pular o passo mantém o locale da URL.

- [ ] **Concluído nunca mais é interceptado**
  Depois de concluir, `completedAt` fica preenchido e nenhuma entrada no painel desvia de novo, inclusive
  depois de sair e entrar. Abrir `/{locale}/onboarding` à mão redireciona para o destino.

- [ ] **Perfil legado entra direto**
  Um perfil sem o campo `onboarding` (criado antes da feature ou pelo seed) nunca é desviado, e
  `POST /account/onboarding` responde 200 com `data: null` sem escrever nada.

- [ ] **Admin e impersonação não são interceptados**
  Admin continua indo para `/{locale}/admin`. Admin personificando um usuário pendente vê o painel comum
  dele sem desvio. `POST /account/onboarding` responde 403 `COMMON_PANEL_FORBIDDEN` para admin e 403
  `AUTH_REQUEST_IMPERSONATION_READ_ONLY` sob impersonação.

- [ ] **Sem open redirect e sem laço**
  `?redirect=` com URL absoluta, `//host`, caminho sem locale ou apontando para `/onboarding` cai no
  fallback `/{locale}`. Nenhuma combinação de estado e `?redirect=` produz redirect em laço. Um `x-app-path`
  enviado pelo navegador é sobrescrito pelo proxy.

- [ ] **Transição fora de ordem é recusada**
  Um `POST` com passo à frente do atual responde 409 `ONBOARDING_STEP_OUT_OF_ORDER`; a tela mostra a
  mensagem traduzida e se ressincroniza. Um `POST` com passo anterior ao atual responde 200 com o estado
  atual, sem escrita, e a tela vai para o passo certo.

- [ ] **Clique duplo não gera erro**
  Dois cliques rápidos em "Continuar" ou "Pular" produzem uma transição só. O primário fica bloqueado
  durante o envio e o "Pular" não dispara segunda requisição.

- [ ] **Validação do corpo na API**
  Passo desconhecido, `outcome` fora de `completed`/`skipped`, corpo vazio ou com chave extra (`id`,
  `uid`) respondem 400 `VALIDATION_FAILED`. Falha de escrita no Firestore responde 500
  `ONBOARDING_UPDATE_FAILED`, nunca stack trace.

- [ ] **Interruptor desliga tudo sem tocar em auth**
  Com `ONBOARDING_ENABLED="false"`, o app sobe, ninguém é desviado e `/onboarding` redireciona para o
  destino. Com a variável vazia, ausente ou `"true"`, o onboarding fica ligado. Nenhum guard de
  autenticação muda de comportamento em nenhum dos casos.

- [ ] **Erros traduzidos**
  Os três códigos novos têm texto em pt-br, en e es em `apiErrors`, e o teste de paridade passa.

- [ ] **Tema e responsivo**
  As duas telas funcionam em light, dark e mobile (375 px) sem rolagem horizontal, com o formulário e os
  botões alcançáveis.

## Etapa 2 — Blueprint técnico

### 10.1 Contrato (`packages/sdk/src/types/user/user.ts`)

```ts
/**
 * Order is the order of the flow. A step a fork removes later is read as the first one,
 * so a stored id that no longer exists restarts the flow instead of trapping the user.
 */
export const ONBOARDING_STEPS = [
    { id: "profile", skippable: false },
    { id: "preferences", skippable: true },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

/** `step` is the next step to show. Absent on profiles that predate the flow, which count as done. */
export type OnboardingState = {
    step: OnboardingStepId;
    completedAt: Date | null;
};

export type OnboardingStateDTO = {
    step: OnboardingStepId;
    completedAt: string | null;
};

export type AdvanceOnboardingRequest = {
    step: OnboardingStepId;
    outcome: "completed" | "skipped";
};

export type UserDTO = {
    // ...campos atuais
    onboarding?: OnboardingState | null;
};
```

Ação (`packages/sdk/src/actions/account/action.ts`):

```ts
/** `null` means there is nothing left to do: the profile predates the flow. */
async advanceOnboarding(
    body: AdvanceOnboardingRequest
): Promise<OnboardingStateDTO | null> {
    const { data } = await this.client.request<Response<OnboardingStateDTO | null>>({
        url: "/account/onboarding",
        method: "POST",
        data: body,
    });
    return data.data;
}
```

### 10.2 Rota

`apps/api/app/(routes)/account/onboarding/route.ts`:

```ts
export const POST = requireCommonPanelApi(async (req, ctx) => {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) return parsedBody.response;

    const parsed = parseAdvanceOnboarding(parsedBody.value);
    if (!parsed.ok) return parsed.response;

    const result = advanceOnboardingState(
        ctx.subjectProfile.onboarding,
        parsed.value,
        new Date()
    );

    if (result.kind === "unchanged") {
        return Response.json({ data: toOnboardingStateDTO(ctx.subjectProfile.onboarding) });
    }
    if (result.kind === "out-of-order") {
        return errorResponse("ONBOARDING_STEP_OUT_OF_ORDER", HTTP_STATUS.CONFLICT);
    }
    if (result.kind === "not-skippable") {
        return errorResponse("ONBOARDING_STEP_NOT_SKIPPABLE", HTTP_STATUS.BAD_REQUEST);
    }

    try {
        await userRepository.update({ id: ctx.subjectProfile.id, onboarding: result.state });
    } catch {
        return errorResponse("ONBOARDING_UPDATE_FAILED", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    return Response.json({ data: toOnboardingStateDTO(result.state) });
});
```

`apps/api/(shared)/lib/onboarding.ts`:

```ts
export function initialOnboardingState(): OnboardingState;

export type OnboardingTransition =
    | { kind: "unchanged" }
    | { kind: "out-of-order" }
    | { kind: "not-skippable" }
    | { kind: "advanced"; state: OnboardingState };

export function advanceOnboardingState(
    current: unknown,
    request: AdvanceOnboardingRequest,
    now: Date
): OnboardingTransition;

/** Timestamp, Date or ISO in, ISO out; `null` for an absent or malformed field. `completedAt: null` stays null. */
export function toOnboardingStateDTO(raw: unknown): OnboardingStateDTO | null;
```

`toOnboardingStateDTO` confere `completedAt == null` **antes** de chamar `normalizeFirestoreInstant`,
que transforma `null` em epoch (`packages/shared/utils/helpers/normalizeFirestoreInstant.ts:5-8`).

Schema (`apps/api/(shared)/validation/account.schema.ts`):

```ts
const onboardingStepIds = ONBOARDING_STEPS.map((step) => step.id) as [OnboardingStepId, ...OnboardingStepId[]];

export const advanceOnboardingSchema = z
    .object({
        step: z.enum(onboardingStepIds),
        outcome: z.enum(["completed", "skipped"]),
    })
    .strict();

export function parseAdvanceOnboarding(body: unknown):
    | { ok: true; value: AdvanceOnboardingInput }
    | { ok: false; response: Response };
```

Exemplo:

```http
POST /account/onboarding
{ "step": "profile", "outcome": "completed" }

200 { "data": { "step": "preferences", "completedAt": null } }
```

```http
POST /account/onboarding
{ "step": "preferences", "outcome": "skipped" }

200 { "data": { "step": "preferences", "completedAt": "2026-09-24T12:00:00.000Z" } }
```

```http
POST /account/onboarding   (perfil legado)
{ "step": "profile", "outcome": "completed" }

200 { "data": null }
```

```http
POST /account/onboarding
{ "step": "profile", "outcome": "skipped" }

400 { "error": { "code": "ONBOARDING_STEP_NOT_SKIPPABLE" } }
```

### 10.3 Persistência

Documento `user/{id}` depois do passo 1:

```json
{
  "reference_id": "firebase-uid",
  "type": "common",
  "preferences": { "theme": "system", "locale": "pt-br" },
  "onboarding": { "step": "preferences", "completedAt": null },
  "createdAt": "<Timestamp>",
  "updatedAt": "<Timestamp>",
  "deletedAt": null
}
```

Depois de concluir: `"onboarding": { "step": "preferences", "completedAt": "<Timestamp>" }`.

`userRepository` não ganha método: `update` do `BaseRepository` basta. Sem mapper novo; a normalização de
saída fica no `toOnboardingStateDTO`, e no `/auth/me` o `serializeFirestoreData` já faz o trabalho.

### 10.4 Árvore do front

```
apps/app/
  proxy.ts                                   ← header x-app-path
  env.ts                                     ← ONBOARDING_ENABLED
  lib/server/onboarding.ts                   ← isOnboardingEnabled, resolveOnboardingRedirect
  shared/lib/onboarding.ts                   ← readOnboardingState, isOnboardingPending,
                                               onboardingStepIndex, buildOnboardingPath,
                                               resolveOnboardingDestination, APP_PATH_HEADER
  app/[locale]/(authenticated)/
    (common)/layout.tsx                      ← chama resolveOnboardingRedirect
    onboarding/
      page.tsx                               ← RSC: gate, destino, prefetch, metadata
      loading.tsx                            ← FormSkeleton
      (components)/OnboardingClient.tsx      ← card, progresso, troca de passo, navegação final
      (components)/OnboardingProfileStep.tsx
      (components)/OnboardingPreferencesStep.tsx
      (hooks)/useOnboardingMutations.tsx
      (validations)/onboardingFormSchema.ts
```

`APP_PATH_HEADER = "x-app-path"` fica em `shared/lib/onboarding.ts` porque o proxy e o helper de servidor
precisam do mesmo nome.

### 10.5 Pseudo-diffs dos arquivos existentes

`apps/app/proxy.ts:205-212`:

```diff
     const arcjetResponse = await arcjetMiddleware(request);
     if (arcjetResponse) {
         return arcjetResponse;
     }

-    return NextResponse.next();
+    const requestHeaders = new Headers(request.headers);
+    requestHeaders.set(APP_PATH_HEADER, pathname);
+    return NextResponse.next({ request: { headers: requestHeaders } });
 }
```

`apps/app/app/[locale]/(authenticated)/(common)/layout.tsx:30-35`:

```diff
     if (
         snapshot.profileKind === "admin" &&
         !isImpersonatingSnapshot(snapshot)
     ) {
         redirect(`/${locale}/admin`);
     }
+
+    const onboardingPath = await resolveOnboardingRedirect(locale);
+    if (onboardingPath) {
+        redirect(onboardingPath);
+    }
```

`apps/app/lib/server/onboarding.ts` (novo):

```ts
export function isOnboardingEnabled(): boolean {
    return env.ONBOARDING_ENABLED !== "false";
}

export async function resolveOnboardingRedirect(locale: string): Promise<string | null> {
    if (!isOnboardingEnabled()) return null;
    const snapshot = await resolvePanelSnapshot();
    if (snapshot.profileKind !== "common") return null;
    const user = await getAppSessionUser();
    if (!isOnboardingPending(user?.onboarding)) return null;
    const requestedPath = (await headers()).get(APP_PATH_HEADER);
    return buildOnboardingPath(locale, requestedPath);
}
```

`apps/app/env.ts:9`:

```diff
-    server: {},
+    server: {
+        // Empty or absent keeps the post-sign-up flow on; only "false" turns it off.
+        ONBOARDING_ENABLED: z.string().optional(),
+    },
     ...
     runtimeEnv: {
+        ONBOARDING_ENABLED: process.env.ONBOARDING_ENABLED,
```

`z.string().optional()` aceita `""`, então a forma `ONBOARDING_ENABLED=""` do `.env.example` não derruba a
app (cycle-policy §3).

`apps/app/.env.example` (seção `# Server`):

```diff
+# Post-sign-up onboarding. Empty = on (the core default). "false" sends new users straight
+# to the panel; profiles created meanwhile still carry a pending state and are asked once
+# the flow is turned back on.
+ONBOARDING_ENABLED=""
```

`apps/api/(shared)/lib/user-merge.ts:47-55`:

```diff
 export function createDefaultUserProfile(uid: string, dto?: Partial<UserDTO>) {
     const defaultProps = {
         type: UserType.COMMON,
         reference_id: uid,
+        onboarding: initialOnboardingState(),
         ...dto,
     };
```

`apps/api/app/(routes)/auth/sign-up/route.ts:33-37`:

```diff
     try {
-        await userRepository.create({
-            reference_id: localId,
-            type: UserType.COMMON,
-        });
+        await createDefaultUserProfile(localId);
     } catch {
```

(os imports de `userRepository` e `UserType` saem se ficarem sem uso.)

`packages/internationalization/translations/apps/app/pages/index.ts`: `onboarding: onboardingTranslations[<locale>]`
nos três blocos.

`docs/SETUP.md`: linha para `ONBOARDING_ENABLED` (app `app`) na tabela de env, junto das de sessão e modo de
produto (`:78-84`).

### 10.6 Chaves de i18n

`apps.app.pages.onboarding` (mesma árvore em pt-br, en, es):

```ts
{
    meta: { title, description },
    title,                 // "Vamos configurar sua conta"
    subtitle,              // "Leva menos de um minuto."
    progress,              // "Passo {current} de {total}"
    loadError,             // "Não foi possível carregar sua conta."
    actions: { next, finish, skip },   // "Continuar", "Concluir", "Pular"
    steps: {
        profile: {
            title,                     // "Como devemos te chamar?"
            description,
            displayName,               // "Nome de exibição"
            displayNamePlaceholder,
            validation: { displayNameRequired, displayNameMax },
        },
        preferences: {
            title,                     // "Em que idioma prefere usar o produto?"
            description,
            language,                  // "Idioma"
        },
    },
}
```

`apiErrors` (3 idiomas):

| código | pt-br |
|---|---|
| `ONBOARDING_STEP_NOT_SKIPPABLE` | "Este passo não pode ser pulado." |
| `ONBOARDING_STEP_OUT_OF_ORDER` | "Seu progresso mudou em outra aba. Atualizamos para o passo certo." |
| `ONBOARDING_UPDATE_FAILED` | "Não foi possível salvar seu progresso. Tente de novo." |

Copy final é do `/develop`, com a skill `/i18n-sync`.

### 10.7 Ordem de implementação e commits

1. `feat(sdk): onboarding state and advance action` — tipos, `ONBOARDING_STEPS`, `advanceOnboarding`.
2. `feat(api): seed the onboarding state on new profiles` — `lib/onboarding.ts` (só
   `initialOnboardingState`), `user-merge.ts`, `auth/sign-up/route.ts` + `signUpProfile.test.ts` +
   extensão do `googleSignInProfile.test.ts`.
3. `feat(api): advance onboarding endpoint` — `advanceOnboardingState`, `toOnboardingStateDTO`, schema,
   rota + `onboardingState.test.ts` + `accountOnboardingRoute.test.ts`.
4. `feat(app): forward the requested path from the proxy` — `proxy.ts`, `APP_PATH_HEADER` + extensão do
   `proxy.test.ts`.
5. `feat(app): send pending users to onboarding from the common layout` — `env.ts`, `.env.example`,
   `lib/server/onboarding.ts`, `shared/lib/onboarding.ts`, `(common)/layout.tsx` + `onboardingState.test.ts`
   e `onboardingRedirect.test.ts`.
6. `feat(app): onboarding flow screens` — rota `onboarding/` inteira + `onboardingClient.test.tsx`.
7. `feat(internationalization): onboarding copy and error codes`.
8. `docs: onboarding switch in setup` — `docs/SETUP.md`.
9. `docs(features): onboarding-flow` — por último.

O commit 5 importa chaves de i18n que só chegam no 7. Se o `/review` quiser cada commit compilando sozinho,
o 7 sobe para antes do 5, o que a regra de granularidade permite.

### 10.8 Env nova

| Var | App | Default | Efeito |
|---|---|---|---|
| `ONBOARDING_ENABLED` | `app` (servidor) | vazio = ligado | `"false"` desliga o desvio e a página; qualquer outro valor liga |

Nada a configurar para a feature funcionar: o default é ligado.

## 11. Pré-requisitos manuais de infra

Nenhum. Sem índice, sem regra do Firestore, sem serviço externo, sem segredo, sem webhook. A env nova é
opcional e o default liga a feature. Nada entra em `docs/PRE-PRODUCTION.md` por esta entrega.

## 12. Modo degradado

**Interruptor desligado (`ONBOARDING_ENABLED="false"`).** A app sobe e o build passa. O layout comum não
desvia ninguém; `/onboarding` redireciona para o destino sanitizado. O `POST /account/onboarding` continua
respondendo (a API não lê a variável), mas nada no app o chama. A API segue gravando o estado inicial em
perfis novos, então quem se cadastrar com a feature desligada será desviado uma vez se o fork religá-la.
É o comportamento escolhido (ver D2); o `.env.example` avisa.

**Perfil legado (sem o campo).** Conta como concluído no app e na API. O layout não desvia, a página
redireciona, e `POST /account/onboarding` responde 200 com `data: null` sem escrever.

**Campo malformado.** O app trata como concluído e não intercepta (preferível a prender o usuário numa tela
que não consegue renderizar). Passo desconhecido com `completedAt: null` recomeça do primeiro passo nas duas
pontas.

**API fora do ar.** `getAppSessionUser` devolve `null`, e o `requireSession` de `(authenticated)` manda para
o sign-in antes de o desvio rodar, como hoje. Durante o fluxo, a falha de um passo aparece como toast
traduzido e o passo não anda.

**Rollback.** Reverter os commits. O campo `onboarding` fica nos documentos criados no intervalo e não é lido
por mais nada; não precisa de limpeza.

## 13. Pós-entrega

- Um fork que não quer onboarding põe `ONBOARDING_ENABLED="false"` e não precisa mexer em proxy nem guard.
- Um fork que quer mais um passo acrescenta um item em `ONBOARDING_STEPS`, um componente de passo e as
  chaves de i18n. Se o passo novo coleta dado de domínio, o endpoint que grava esse dado é do fork.
- Adjacente, fora do escopo: o botão secundário do `Footer` não respeita `isLoading`
  (`apps/app/shared/components/ui/Footer.tsx:43-60`). Aqui é contornado no handler do "Pular"; se um terceiro
  uso precisar do mesmo contorno, a correção vai no `Footer`.

## Decisões tomadas sem perguntar

| # | Decisão | Alternativa descartada | Por quê |
|---|---|---|---|
| D1 | Desvio no `(common)/layout.tsx`, rota em `(authenticated)/onboarding` | Proxy (recomendação original da spec) ou resolvedores do cliente | O reescopo da auditoria manda assim, e é o padrão do desvio de admin. O proxy não sabe o papel sem chamar a API (`proxy.ts:190-194`). |
| D2 | Interruptor só na `apps/app`; a API grava o estado sempre | API também ler a variável e não semear com a feature desligada | Uma variável em um app só. O custo é o fork que religa ver desviados os cadastros do intervalo, o que é defensável: eles nunca passaram pelo fluxo. Registrado em P1. |
| D3 | Conta criada pelo admin (`users/route.ts:67`) não recebe o estado | Semear também ali | Menor raio: o admin já informa o nome, e a rota cria admins também. Registrado em P3. |
| D4 | `POST /auth/sign-up` passa a usar `createDefaultUserProfile` | Deixar a rota gravando direto | Sem isso a regra "o estado nasce no helper" teria um furo numa rota pública. É uma troca de uma chamada, com o mesmo rollback. |
| D5 | Header só com o `pathname` | `pathname` + query | Mesma escolha do redirect anônimo (`proxy.ts:185`). Evita carregar o `_rsc` das navegações suaves e parâmetros de terceiros. Um deep link com `?tab=` perde a aba. |
| D6 | API não confere se o nome foi salvo antes de aceitar `completed` | Checar `displayName` no Firebase Auth | `PUT /account` já aceita nome vazio, então a checagem não protege nada e custaria uma leitura do Auth por passo. |
| D7 | Idioma escolhido no passo 2 troca o locale do destino | Honrar o deep link literalmente, como `postLoginNavigation.ts:47-54` faz no login | A escolha é posterior ao deep link e explícita, dentro do mesmo fluxo. No login a preferência é antiga e a URL é a intenção mais nova; aqui é o contrário. |
| D8 | Lista de endônimos duplicada no passo | Exportar de `AccountPreferencesForm.tsx` | Importar entre rotas quebra a colocação; são 3 linhas em 2 lugares. Com um terceiro uso, vira módulo compartilhado. |
| D9 | Ordem: nome, depois idioma | Idioma primeiro | Nome primeiro evita uma navegação de troca de locale no meio do fluxo carregando o `?redirect=`. A troca acontece uma vez, no fim. |
| D10 | Nome obrigatório, idioma pulável | Os dois puláveis ou os dois obrigatórios | O nome é o dado que o produto não tem; o idioma já tem default (o locale da URL). |
| D11 | Passo corrente vem do servidor, não da URL | Rota por passo (`/onboarding/profile`) | Não deixa pular passo editando a URL, e a retomada sai de graça. |
| D12 | Lista de passos com `skippable` no SDK | Duplicar na API e no app | A API precisa validar o pular e o app precisa renderizar; duas cópias da regra divergiriam no primeiro fork. `UserType` já é runtime em `types/`. |
| D13 | `POST /account/onboarding` separado | Aceitar `onboarding` no `PUT /account` | Mantém o `PUT /account` como está, e a regra de transição fica numa rota testável sozinha. |

## Perguntas em aberto

Nenhuma bloqueia o `/develop`. Cada uma já tem a opção adotada.

- **P1. Religar o onboarding deve desviar quem se cadastrou com ele desligado?** Opções: (a) sim, a API
  semeia sempre; (b) não, a API lê a mesma variável e não semeia com a feature desligada. **Adotada: (a)**,
  porque mantém a variável num app só e esses usuários de fato não passaram pelo fluxo.
- **P2. A tela do onboarding deve ter um botão "Sair"?** Hoje não há navbar ali; quem quiser sair antes de
  preencher o nome não tem botão (pode fechar a aba e voltar depois, e o fluxo retoma). Opções: (a) sem botão
  no MVP; (b) botão "Sair" reaproveitando o logout do `ProfileDropdown`. **Adotada: (a)**, menor escopo.
  Recomendo (b) se o `/test` achar a tela confinante.
- **P3. Conta criada pelo admin deve passar pelo onboarding no primeiro login?** Opções: (a) não, conta como
  concluída; (b) sim, `users/route.ts` semeia quando o tipo é `common`. **Adotada: (a)**, menor raio; o admin
  já informa o nome.
- **P4. O idioma escolhido no fim deve sobrescrever o locale do deep link?** Opções: (a) sim; (b) não, o deep
  link manda. **Adotada: (a)**, pela justificativa de D7.

## Desvios do reescopo da auditoria

- **Item 3 (estado nascendo em `user-merge.ts:47`):** mantido, com um acréscimo. `POST /auth/sign-up`
  (`auth/sign-up/route.ts:34`) grava perfil sem passar pelo helper e passa a usá-lo (D4). A criação pelo
  admin continua fora (D3).
- **Tabela "Impacto por camada" da spec (Infra/env: "nenhuma variável nova"):** entra uma variável opcional,
  `ONBOARDING_ENABLED`, porque o item 5 do próprio reescopo pede o interruptor por env.
- Os demais itens (desvio no layout, `PUT /account` sem campo novo, header no proxy + `postAuthRedirectTarget`,
  legado concluído, sem índice) foram adotados como escritos.

## Referências não lidas

Nenhuma.
