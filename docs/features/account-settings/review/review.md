# Review — `account-settings`

## Branch

- **Recomendada e criada**: `app/feat/account-settings`, a partir de `dubai` (HEAD == `origin/main` == `9154776`).
- `dubai` não é protegida, mas o diff cobre 3 assuntos e vai virar PR; a branch de feature é o padrão do repo.

## Veredito do objetivo #3 do corte de MVP (troca de senha encerra as demais sessões)

**Reprovado como estava. Corrigido na raiz e revalidado — agora passa.**

Medido contra a API no ar, com duas sessões reais e independentes da mesma conta
(`rv-a@example.com`, dois `signInWithPassword` distintos), não com screenshot de terceiro:

| Credencial da **outra** sessão | Antes da correção | Depois da correção |
|---|---|---|
| `Authorization: Bearer <idToken>` | **200 — continuava valendo** ❌ | **401 `AUTH_INVALID_TOKEN`** ✅ |
| Session cookie `access-token` | 401 ✅ | 401 ✅ |
| Refresh token (`securetoken`) | `TOKEN_EXPIRED` ✅ | `TOKEN_EXPIRED` ✅ |
| Senha antiga no Identity Toolkit | `INVALID_LOGIN_CREDENTIALS` ✅ | idem ✅ |

**Causa**: `getCurrentUser` (`packages/auth/server.ts`) verificava o ID token **sem** confrontar o
`auth_time` com `tokensValidAfterTime`. Como o `apps/app` autentica a API por **bearer ID token**
(`AuthRequestPanelProvider`), a outra aba continuava escrevendo e lendo por até ~1 h após a troca —
justamente a janela que o objetivo do MVP promete fechar. O `revokeRefreshTokens` só fechava o cookie
(que é verificado com `checkRevoked: true`) e a renovação futura.

**Correção aplicada** (`packages/auth/server.ts`): helper `isMintedBeforeRevocation(decodedToken, user)`
comparando `decodedToken.auth_time` com `user.tokensValidAfterTime`. **Sem round trip extra** — o
`UserRecord` já era carregado ali; é o mesmo critério que o `verifyIdToken(token, true)` do Admin SDK
aplica, sem pagar um segundo `getUser`.

Revalidado depois da correção:

- outra sessão ⇒ **401** (bearer), **401** (cookie); a própria sessão que trocou ⇒ 401 (esperado, o
  Firebase não revoga seletivamente e o cliente faz `signOut`);
- conta **B**, não envolvida ⇒ **200** (nenhum dano colateral);
- **sem regressão de login**: sign-in novo depois da troca ⇒ `GET /account` **200** por bearer **e** por
  session cookie recém-emitido;
- `POST /account/sessions/revoke` ("sair de todos os dispositivos") ⇒ outra sessão **401** nos dois
  transportes. Antes da correção esse botão também não encerrava a outra sessão de verdade.

## IDOR / posse — provado contra a API no ar, com 2 contas reais

`rv-a@example.com` (A) e `rv-b@example.com` (B). Tentativas de A escrever em B:

| Vetor | Resultado |
|---|---|
| corpo com `id` do doc de B | **400 `VALIDATION_FAILED`** (`.strict()`) |
| corpo com `uid` de B | **400 `VALIDATION_FAILED`** |
| corpo com `reference_id` de B | **400 `VALIDATION_FAILED`** |
| corpo com `type: "admin"` | **400 `VALIDATION_FAILED`** |
| header `x-request-user-id: <uid B>` + `x-request-role: admin` | **403 `AUTH_REQUEST_PANEL_FORBIDDEN`** |
| header `x-user-id: <uid B>` | **403 `AUTH_REQUEST_USER_ID_MISMATCH`** |
| rota `PUT /account/<docId de B>` | **404** (não existe rota por id) |
| sem credencial | **401 `AUTH_INVALID_TOKEN`** |

Depois de todas as tentativas, `GET /account` como B devolve `displayName: null` — **nada foi escrito**.
Campo extra vira **400**, nunca escrita silenciosa: confirmado nos 4 primeiros vetores.

Outros contratos medidos na mesma bateria: `{}` e `{"preferences":{}}` ⇒ **400
`ACCOUNT_NOTHING_TO_UPDATE`** (D2 confere); `avatar` apontando para objeto de outro dono e
`avatar: "javascript:alert(1)"` ⇒ **400 `ACCOUNT_AVATAR_INVALID`**; senha atual errada ⇒ **400
`ACCOUNT_CURRENT_PASSWORD_INVALID`** (nunca 500, sem stack trace).

## Contrato de dados — `mergeAuthAndFirestore` (risco levantado: Auth vence)

**Sem colisão, confirmado por leitura e por resposta real.** `serializeUserRecord`
(`apps/api/(shared)/mappers/user.mapper.ts:4-27`) é uma **lista fechada** de chaves do Auth
(`uid`, `email`, `displayName`, `photoURL`, `phoneNumber`, `metadata`, `providerData`, `customClaims`,
`tokensValidAfterTime`, `emailVerified`, `disabled`) — `phone`, `avatar` e `preferences` não estão lá,
então o lado Firestore não é sombreado. Medido no `GET`/`PUT /account`:
`phone: "+55 51 99999-0000"`, `avatar: "https://example.com/a.png"`, `avatarUrl` resolvido,
`preferences: {theme:"dark", locale:"pt-br"}` — enquanto `phoneNumber`/`photoURL` (do Auth) seguem
`null`. O merge parcial de preferências também funciona: `PUT {"preferences":{"locale":"es"}}` devolve
`{theme:"dark", locale:"es"}`, sem perder o `theme` nem zerar `phone`/`displayName`.

## D1 — `mapPasswordCheckMessageToCode`

Confere. `apps/api/(shared)/lib/toolkit-error-codes.ts:49-65` trata `TOO_MANY_*` ⇒
`USERS_AUTH_RATE_LIMITED` (429) e `WEAK_PASSWORD` ⇒ `USERS_AUTH_WEAK_PASSWORD`, e colapsa o resto no
**fallback do chamador** — não mais em `USERS_AUTH_SIGN_UP_FAILED`. Medido: senha atual errada sai como
`ACCOUNT_CURRENT_PASSWORD_INVALID`, e nenhum erro de cadastro aparece num fluxo de troca de senha.
Nenhuma função existente foi alterada (raio de impacto zero sobre `auth/sign-in` e `auth/sign-up`).

## D4 — `AlertDialog` do design system (componente compartilhado)

**O botão de confirmar ainda confirma.** Exercitado no browser, na tela real:

- abre pelo trigger (`aria-expanded=true`, `[role=alertdialog]` presente);
- **Cancelar** fecha e **não** dispara requisição;
- **Confirmar** ⇒ `POST http://localhost:3002/account/sessions/revoke` **200** no log de rede **e**
  diálogo fechado **e** `signOut` levando para `/es/sign-in` — ou seja, o `asChild` **não engoliu o
  `onClick`** (o Slot do Radix compõe: handler do filho primeiro, depois o do primitivo, que fecha);
- `document.querySelectorAll('button button').length === 0` na página com o diálogo aberto.

Raio de impacto conferido por busca: `AlertDialogAction`/`AlertDialogCancel` só têm este consumidor
(`AccountSecurityForm.tsx`) — nenhum outro arquivo do repo importa o `alert-dialog`. Screenshot:
`review/screenshots/04-alertdialog-dark-es.png`.

Nota de leitura: a mesma string do dictionary é usada no **título da seção** e no **botão** que abre o
diálogo; um clique por texto acerta o `<span>` do título. Não é defeito — é ambiguidade de a11y/copy que
custou uma falsa reprovação aqui. Fica como achado 🟢.

## U9 — preferências entre dispositivos (o que o `/develop` não conseguiu validar)

Validado agora **em perfil de navegador limpo**, ponta a ponta: a conta tinha `preferences`
`{theme:"dark", locale:"es"}` gravadas pela API; o sign-in feito em `/pt-br/sign-in` terminou em
**`/es`**, com `document.documentElement.className` contendo **`dark`** já na primeira pintura e os
cookies **`x-theme=dark`** e **`x-locale=es`** gravados. Fecha a lacuna 3 da seção "o que NÃO foi
validado" do handoff.

O `?redirect=` continua tendo precedência sobre o locale preferido (`resolveAppPostLoginPath` lê a query
antes), então a projeção não abre brecha de open-redirect nem sequestra o destino pedido.

## 🟡 Achado novo — hidratação: o SSR de componente cliente sempre renderiza `pt-br`

`getDictionary()` de `@repo/internationalization/client` resolve o idioma por **`document.cookie`**
(`utils/cookies.ts:2-4` devolve `null` quando não há `window`). Num componente `"use client"` que o Next
renderiza no servidor, isso cai no default `pt-br` — o cliente depois re-renderiza em `es`, e o React
registra *Hydration failed … server rendered text didn't match the client* (`+ href="/es" / Inicio`
contra `- href="/pt-br" / Início`), com um flash do texto errado na primeira pintura.

**Não é regressão desta entrega** — medido no HTML servido, as duas rotas trazem o mesmo defeito:

```
curl /es/account  --cookie "x-locale=es" ⇒ breadcrumb-link" href="/pt-br">Início
curl /es/entities --cookie "x-locale=es" ⇒ breadcrumb-link" href="/pt-br">Início
```

O padrão `getDictionary()` em client component aparece em **18 arquivos** (entities, admin/users,
playground e os 6 novos de `account`). O que esta feature muda é a **frequência**: com a projeção de
`preferences` no sign-in, um locale diferente do default deixa de ser exceção.

**Não corrigi de propósito**: remendar só a `account` seria replicar workaround em 1 de 18 call sites. A
correção de raiz é resolver o locale no servidor e injetá-lo (o layout já resolve locale; falta um
provider/prop, como o `initialPanel` faz com o painel) ou usar `getDictionaryForLocale(useParams().locale)`
onde a URL é a autoridade — mudança de desenho, commit próprio, fora do escopo deste diff.

## D6 — abas por `history.replaceState`

- **Deep link funciona**, em carga fria: `?tab=profile`, `?tab=security`, `?tab=preferences` e
  `?tab=billing` abrem com a aba certa selecionada (medido por `aria-selected`).
- A URL fica sincronizada ao trocar de aba (`location.search` vira `?tab=security`) e sobrevive a um
  reload e à troca de idioma (`/es/account?tab=preferences` ⇒ `/en/account?tab=preferences`).
- **Custo aceito, confirmado**: `replaceState` não empilha histórico — apertar "voltar" **sai da página**
  em vez de trocar a aba (medido: de `?tab=security` o voltar foi para a entrada anterior do histórico).
  É o preço registrado pelo `/develop` para não pagar round-trip de RSC por clique de aba.

## Modo degradado do avatar (§16) — cobrado e aprovado

Com o Cloud Storage desativado no projeto, upload real de PNG pela tela:
`POST http://localhost:3002/files` ⇒ **503** (não 500, sem HTML de stack trace), mensagem **traduzida**
no campo ("Não foi possível enviar o arquivo agora. Tente de novo em instantes."), rótulo em vermelho,
**resto do formulário intacto** (nome e telefone preservados, abas funcionando).
Evidência: `review/screenshots/12-avatar-degradado-503-ptbr.png`.
O **caminho feliz do avatar segue não verificável** — pré-requisito de infra, não defeito de código.

## Validação visual

`agent-browser` em **sequência estrita**, sessão real, dev server. Screenshots em
`review/screenshots/`:

| Arquivo | Cenário |
|---|---|
| `01-security-dark-es-desktop.png` | Segurança · escuro · es · 1280 |
| `02-password-changed-toast-es.png` | pós-troca de senha: sessão encerrada, volta ao sign-in |
| `03-outra-sessao-encerrada-es.png` | **outro contexto de navegador** expulso para o sign-in |
| `04-alertdialog-dark-es.png` | `AlertDialog` aberto (escuro) |
| `05-preferences-dark-es-desktop.png` | Preferências · escuro · es |
| `06-preferences-light-en-desktop.png` | Preferências · claro · en (após salvar) |
| `07-profile-light-en-desktop.png` | Perfil · claro · en |
| `08-security-light-en-desktop.png` | Segurança · claro · en |
| `09-profile-light-en-mobile390.png` | Perfil · claro · en · **390×844** |
| `10-profile-light-ptbr-mobile390.png` | Perfil · claro · pt-br · **390×844** |
| `11-profile-dark-ptbr-mobile390.png` | Perfil · escuro · pt-br · **390×844** |
| `12-avatar-degradado-503-ptbr.png` | modo degradado do upload |

Cobertura: **claro + escuro**, **desktop + 390 px**, **pt-br + en + es**, as 4 abas.
Fluxos percorridos: sign-in (2 contextos), troca de senha, sair de todos os dispositivos, edição de
perfil, troca de tema e idioma com persistência, upload degradado, deep link por aba, dropdown do perfil.

**Não validado visualmente**: impersonação (exige conta admin + seletor; a recusa de escrita está
coberta por teste de rota — `PUT` sob impersonação ⇒ 403) e o caminho feliz do avatar (infra).

## Correções aplicadas (estão no working tree, para o usuário conferir no `git diff`)

| Arquivo | O que mudou | Por quê |
|---|---|---|
| `packages/auth/server.ts` | `getCurrentUser` passa a descartar ID token emitido antes da revogação (`isMintedBeforeRevocation`, comparando `auth_time` com `tokensValidAfterTime`) + constante `MILLISECONDS_IN_A_SECOND` | sem isso a outra sessão continuava válida por até ~1 h e o objetivo #3 do corte não era entregue (evidência acima) |
| `apps/app/.../account/(components)/AccountProfileForm.tsx` | `placeholder="https://"` (string literal em JSX) trocado por `accountProfile.avatarPlaceholder` | regra de ouro 2: placeholder é texto de UI e sai do dictionary, como o `phonePlaceholder` ao lado |
| `packages/internationalization/.../common/account.ts` | chave `avatarPlaceholder` nos **3** idiomas | par da correção acima; paridade verde |

Nada além disso foi tocado — nenhuma refatoração fora da tarefa.

## Achados que NÃO corrigi

| Sev | Onde | Problema | Ação |
|---|---|---|---|
| 🟡 | `packages/internationalization/client.ts:8` + 18 call sites | `getDictionary()` resolve idioma por cookie, indisponível no SSR ⇒ mismatch de hidratação e flash de `pt-br` (seção acima, com repro por `curl`) | **decisão em aberto**: correção de raiz é injetar o locale do servidor; remendar só `account` seria workaround em 1 de 18 |
| 🟡 | `packages/auth/server.ts:130` | `getCurrentUser` também **não checa `user.disabled`**: um usuário desativado pelo admin segue autenticado na API até o token expirar (mesma classe do defeito que corrigi, objetivo diferente) | **decisão em aberto**: 1 linha (`if (user.disabled) return null;`) — é o próximo vizinho do patch que apliquei |
| 🟢 | `apps/api/app/(routes)/account/route.ts:68-95` | `writeAccount` grava Firestore e depois o Auth; se o Auth falhar, o patch do Firestore já foi gravado e o cliente recebe 500 `ACCOUNT_UPDATE_FAILED` sobre um estado parcial | aceitável (o pior caso é `displayName` dessincronizado); registrar |
| 🟢 | `apps/api/app/(routes)/account/route.ts:104` | `GET /account` devolve o merge cru ao browser, incluindo `customClaims`, `providerData`, `disabled` e `tokensValidAfterTime` | é dado do próprio usuário e o formato herda o `/auth/me` pré-existente; um `AccountDTO` enxuto seria mais limpo |
| 🟢 | `AccountSecurityForm.tsx:106/119` | a mesma string (`signOutEverywhere`) rotula a **seção** e o **botão** — clique por texto é ambíguo e o leitor de tela ouve o mesmo rótulo duas vezes | copy/a11y |
| 🟢 | `TabsList` em 390 px | as 4 abas encostam nas bordas do contêiner (visível em `10`/`11`) | cosmético, componente compartilhado |
| 🟢 | `changePasswordSchema` | não recusa `password === currentPassword` | produto decide |

## Gates (números reais, medidos por mim, com `--force`)

| Gate | Comando | Resultado |
|---|---|---|
| Lint/format | `pnpm check` | ✅ **497 arquivos**, 0 erro |
| CI completo | `pnpm turbo run lint typecheck test --force` | ✅ **23 successful / 23 total**, `Cached: 0`, exit 0 |
| Testes API | dentro do gate | ✅ **288 testes** (28 arquivos) |
| Testes app | dentro do gate | ✅ **215 testes** (29 arquivos) |
| Paridade i18n | `@repo/internationalization:test` | ✅ **27 testes**, verde **depois** da chave nova |

Bate com o que o `/develop` reportou (497 / 23 / 288 / 215 / 27), agora sem cache e já com as correções
desta revisão. **Nenhum teste foi desativado, pulado ou afrouxado.**

Registro honesto: a primeira execução falhou em `//#lint` (`noMagicNumbers` no `1000` da minha
correção); extraí a constante e rodei de novo até verde.

## Lacunas de teste (para o `/test`)

Herdadas do handoff e ainda válidas:

1. `POST /account/password`: `TOO_MANY_ATTEMPTS` ⇒ 429 e `ACCOUNT_PASSWORD_UNSUPPORTED` sem teste de rota.
2. `POST /account/sessions/revoke`: sem nenhum teste.
3. `PUT /account`: `deleteObjectQuietly` do avatar anterior e o caso "avatar não mudou" não exercitados.
4. `apps/app`: nenhum teste de componente para `AccountProfileForm`/`AccountSecurityForm`.
5. `ProfileDropdown`: fallback `useMyAccount` → `useAuth` quando a query falha.
6. `postLoginNavigation`: projeção de cookie a partir de `preferences` (incluindo valor inválido).

Novas, abertas por esta revisão:

7. **`getCurrentUser` com token emitido antes da revogação** ⇒ `null`. É o contrato que acabou de ser
   corrigido e **não tem teste nenhum** — sem ele, a regressão volta silenciosa. É a lacuna nº 1.
8. `mergeAuthAndFirestore`: garantir que `phone`/`avatar`/`preferences` não sejam sombreados por chave
   do Auth (hoje só a lista fechada de `serializeUserRecord` protege isso, por convenção).
9. `parseUpdateAccount` com campo desconhecido no corpo (`id`, `uid`, `type`) ⇒ `VALIDATION_FAILED`:
   é a garantia de posse do payload e está coberta só pelo `.strict()`, sem teste explícito de IDOR.

## Decisões em aberto (para o `/review` perguntar)

1. **Mismatch de hidratação do `getDictionary()` cliente** (18 call sites): corrigir de raiz agora, em
   commit/tarefa própria, ou registrar no backlog? Recomendação: **backlog** — é pré-existente e a
   correção certa muda o desenho (locale injetado pelo servidor), o que não cabe neste diff.
2. **`getCurrentUser` não checa `user.disabled`**: incluir a linha agora (mesmo arquivo, mesma função que
   corrigi) ou tratar como tarefa separada? Recomendação: **incluir**, como commit próprio
   `fix(auth): stop authenticating disabled users` — é 1 linha e fecha a mesma classe de brecha.
3. **`GET /account` devolve o merge cru** (`customClaims`, `providerData`, `tokensValidAfterTime`):
   enxugar para um `AccountDTO` de verdade? Recomendação: **não agora** — muda contrato herdado do
   `/auth/me` e teria raio maior que a feature.

## Plano de commits proposto

⛔ Nada foi commitado. Branch criada: **`app/feat/account-settings`** (a partir de `dubai`).
Ordem por dependência: contrato → API → app → i18n. Três assuntos, nunca misturados.

### Assunto 1 — a feature

| # | Mensagem | Arquivos |
|---|---|---|
| 1 | `feat(sdk): add account contract` | `packages/sdk/src/types/user/user.ts`, `packages/sdk/src/types/account/account.ts`, `packages/sdk/src/types/account/index.ts`, `packages/sdk/src/types/index.ts`, `packages/sdk/src/actions/account/action.ts`, `packages/sdk/src/client/index.ts` |
| 2 | `fix(auth): reject id tokens minted before a session revocation` | `packages/auth/server.ts` |
| 3 | `feat(api): read and update the signed-in account` | `apps/api/(shared)/validation/account.schema.ts`, `apps/api/(shared)/lib/account-avatar.ts`, `apps/api/app/(routes)/account/route.ts`, `apps/api/__tests__/accountSchema.test.ts`, `apps/api/__tests__/accountAvatar.test.ts`, `apps/api/__tests__/accountRoute.test.ts` |
| 4 | `feat(api): change the password and revoke sessions` | `apps/api/app/(routes)/account/password/route.ts`, `apps/api/app/(routes)/account/sessions/revoke/route.ts`, `apps/api/(shared)/lib/toolkit-error-codes.ts` |
| 5 | `fix(design-system): stop nesting a button inside the alert dialog action` | `packages/design-system/components/ui/alert-dialog.tsx` |
| 6 | `feat(app): add the account data hooks` | `apps/app/shared/hooks/useMyAccount.ts`, `apps/app/shared/lib/queryKeys.ts`, `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useAccountMutations.tsx` |
| 7 | `feat(app): add the account page with profile, security, preferences and billing tabs` | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(pages)/**`, `.../(components)/**`, `.../(validations)/accountFormSchema.ts`, `apps/app/__tests__/accountFormSchema.test.ts` |
| 8 | `feat(app): link the account page from the sidebar and the profile menu` | `apps/app/app/[locale]/(authenticated)/(common)/paths.ts`, `.../routes.tsx`, `apps/app/shared/components/ui/ProfileDropdown.tsx` |
| 9 | `feat(app): apply the saved theme and language on the first paint` | `apps/app/app/layout.tsx`, `apps/app/shared/providers/AppDesignProvider.tsx`, `apps/app/shared/lib/postLoginNavigation.ts` |
| 10 | `feat(internationalization): add the account copy and its api error codes` | `packages/internationalization/translations/apps/app/pages/common/account.ts`, `.../pages/common/index.ts`, `.../pages/common/routes/index.ts`, `.../apps/app/shared/index.ts`, `.../apps/app/index.ts`, `.../packages/shared/utils.ts` |

### Assunto 2 — a auditoria do backlog (independente da feature)

| # | Mensagem | Arquivos |
|---|---|---|
| 11 | `docs(specs): reconcile the backlog with the delivered code` | `specs/BACKLOG.md` + `specs/account-security-mfa.md`, `account-settings.md`, `audit-log.md`, `billing-subscription.md`, `cookie-consent.md`, `cursor-pagination.md`, `dashboard-home.md`, `data-rights-lgpd.md`, `e2e-testing.md`, `firebase-emulator-seed.md`, `observability-logging.md`, `onboarding-flow.md`, `teams-organizations.md`, `specs/research/object-storage-costs.md` + o `git mv` `specs/file-upload-storage.md` → `docs/features/file-upload-storage/spec.md` + `docs/features/file-upload-storage/STATE.md` |

### Assunto 3 — os artefatos (sempre por último)

| # | Mensagem | Arquivos |
|---|---|---|
| 12 | `docs(features): account-settings` | `docs/features/account-settings/**` (plano, handoff, este review e os screenshots) |

Varredura de segredo nos artefatos: **nenhuma credencial** em texto ou print (as contas de QA
`rv-a@example.com` / `rv-b@example.com` aparecem sem senha; as senhas usadas foram descartáveis e não
estão registradas em lugar nenhum).

Título de PR sugerido: **`feat(app): account settings`**.
Depois do último commit aprovado, **perguntar** ao usuário se deve sincronizar com
`git push -u origin app/feat/account-settings`.

## Commits realizados

(preenchido pelo orquestrador do `/review` após a aprovação)

---

# Rodada 2 — defeito **D-1** devolvido pelo `/test`

## O que eu medi (antes)

Reproduzi o repro do QA e fui até a causa, medindo cada elo:

| Passo | `<html>` | `localStorage.theme` | cookie `x-theme` | conta |
|---|---|---|---|---|
| navegador novo + sign-in | `dark` | `null` | `dark` | dark |
| toggle do cabeçalho → Claro | `light` | `light` | **`dark`** | dark |
| recarga | `light` | `light` | **`dark`** | dark |
| sair e entrar de novo | **`light`** | `light` | `dark` | dark |

SSR conferido por `curl`: com `x-theme=dark` o servidor entrega `<html class="… dark">`, enquanto o
browser terminava em `light` ⇒ **flash a cada carga**, e a preferência da conta nunca mais aparecia
naquele navegador.

**Causa adicional que o QA não viu**: a projeção das preferências só roda quando **não há `?redirect=`**
(`packages/auth/provider.tsx:85-88` retorna antes de chamar o callback do app). Ou seja, no login por
sessão expirada — o caso mais comum — nem o cookie era atualizado. O comportamento "a conta vence" era,
na prática, **não determinístico**: dependia da query string.

## O que adotei

**Contrato declarado**: a conta é o padrão que atravessa dispositivos; o toggle do cabeçalho é um
**override local deste navegador**, que vale até ser mudado aqui ou na tela de Preferências. Quem nunca
escolheu nada neste navegador recebe o tema da conta.

Implementação (`apps/app` apenas, **nada** no `packages/design-system`):

- `apps/app/shared/lib/themePreference.ts` (novo) — dono único do par `localStorage` + cookie:
  `storeActiveTheme` (escreve os dois), `seedThemeIfUnset` (só semeia quem não escolheu),
  `syncThemeCookieWithChoice` (espelha a escolha local no cookie).
- `AppDesignProvider` — `ThemeCookieSync` mantém o cookie igual ao tema ativo, **o que mata o flash**.
- `postLoginNavigation` — o sign-in passa a semear o tema da conta (`seedThemeIfUnset`), não só o cookie.
- `AccountPreferencesForm` — passa a usar o mesmo escritor (some a cópia local das constantes de TTL).

## O que descartei, e por quê

- **(a) toggle do cabeçalho gravando via `PUT /account`** — um `PUT` por clique, quebra sob impersonação
  (escrita ⇒ 403) e na tela de login (401), e acopla um componente genérico do design system ao conceito
  de conta. Contraria "genérico no pacote, específico no app".
- **(b) pura e simples (sign-in sempre sobrescreve a chave do `next-themes`)** — **implementei e medi**:
  não resolve o repro, porque com `?redirect=` a projeção nem roda; e apagaria sem aviso uma escolha
  local. Virou `seedThemeIfUnset`, que é a versão determinística.
- **(c) sozinha (Preferências também escrever no `next-themes`)** — **já existia** (`setTheme` no
  `onSuccess`), e por isso não era a causa. Mantida, agora pelo escritor único.
- **Sync de cookie sem guarda** — minha primeira versão gravava o tema *resolvido*, e a medição pegou a
  **regressão**: num navegador virgem ela escrevia `theme=system` no `localStorage`, forjando uma escolha
  que **bloquearia para sempre** a preferência da conta naquele dispositivo. Reescrita para espelhar só
  escolha real. É o teste `never writes a cookie for a browser that made no choice`.

## O que eu medi (depois) — e o flash

Tudo medido no browser, em sequência estrita, com a versão final do código:

| Caso | `<html>` | `localStorage.theme` | cookie `x-theme` | SSR (por `curl`) | flash |
|---|---|---|---|---|---|
| navegador virgem, na tela de login | — | `null` | **ausente** | — | — |
| ↳ sign-in (conta = escuro) | `dark` | `dark` | `dark` | `dark` | **não** |
| ↳ recarga | `dark` | `dark` | `dark` | `dark` | **não** |
| toggle do cabeçalho → Claro | `light` | `light` | **`light`** | `light` | **não** |
| ↳ recarga | `light` | `light` | `light` | `light` | **não** |
| sair e entrar de novo (com `?redirect=`) | `light` | `light` | `light` | `light` | **não** |
| salvar Escuro em Preferências | `dark` | `dark` | `dark` | `dark` | **não** |

**O flash sumiu** e a medição é objetiva, não impressão: a classe que o servidor entrega passou a ser
**sempre igual** à classe com que o DOM termina (antes eram `dark` × `light`). Conferido com `curl` nos
dois sentidos: `x-theme=light` ⇒ `<html class="… light">`, `x-theme=dark` ⇒ `<html class="… dark">`.

**Objetivo #4 continua verdadeiro** no caso da spec ("outro navegador, mesma preferência"): navegador
limpo entra e já pinta no tema da conta, na primeira pintura.
Evidência: `review/screenshots/13-override-local-sem-flash-ptbr.png`.

## Teste que entrou

`apps/app/__tests__/themePreference.test.ts` (**5 casos**) fixa o contrato inteiro: escolha explícita
grava nos dois canais; a conta semeia quem não escolheu; a conta **não** apaga escolha local; o cookie
espelha a escolha; e **nunca** grava cookie para quem não escolheu.

`apps/app/__tests__/postLoginPreferences.test.ts` (do QA): **1 caso novo** — "mantém o tema escolhido
neste navegador e ainda assim aplica o idioma". Também adicionei `window.localStorage.clear()` no
`beforeEach`: cada teste representa um navegador, e sem isso um teste vazava estado para o seguinte.
**Nenhum teste foi afrouxado** — o arquivo ficou mais estrito, não menos.

**Teste de mutação, feito por mim**: removi a guarda `chosenTheme()` do `syncThemeCookieWithChoice`
(a regressão que a medição pegou) ⇒ `never writes a cookie for a browser that made no choice` **falhou**;
restaurei ⇒ 5/5 verdes. O teste morde.

## Gates depois da correção (`--force`, sem cache)

| Gate | Resultado |
|---|---|
| `pnpm check` | ✅ **506 arquivos**, 0 erro |
| `pnpm turbo run lint typecheck test --force` | ✅ **23 successful / 23 total**, `Cached: 0`, exit 0 |
| `api:test` | ✅ **315 testes** / 30 arquivos |
| `app:test` | ✅ **259 testes** / 34 arquivos (33/253 antes: +1 arquivo, +6 casos) |
| `@repo/internationalization:test` | ✅ **27 testes** (paridade verde) |

Registro honesto: a primeira rodada falhou em `//#lint` (`noDocumentCookie` no meu teste); resolvi com o
mesmo `biome-ignore` justificado que o teste vizinho já usa, e rodei de novo até verde.

## Achado novo (não corrigido)

| Sev | Onde | Problema | Ação |
|---|---|---|---|
| 🟢 | `account.preferences.description` (3 idiomas) | a copy diz que "tema e idioma acompanham a sua conta em qualquer dispositivo", mas o toggle do cabeçalho é override **deste** navegador — com um override ativo, o rádio mostra "Escuro" enquanto a tela está clara | copy de produto: valeria uma frase dizendo que o botão do cabeçalho muda só este dispositivo |
| 🟢 | `packages/auth/provider.tsx:85-88` | com `?redirect=`, o callback de pós-login do app não roda — nenhuma preferência é projetada nesse login | hoje é inócuo (o contrato não depende mais disso); vira armadilha se alguém voltar a pendurar efeito nesse callback |
| 🟢 | `packages/design-system/components/ui/mode-toggle.tsx` | "Light/Dark/System" e "Toggle theme" são strings fixas em inglês no componente genérico | dívida pré-existente de i18n |

## Plano de commits — atualização da rodada 2

O plano de 12 blocos **continua valendo**; os arquivos da correção do D-1 entram em **dois** deles:

- **#9 `feat(app): apply the saved theme and language on the first paint`** passa a incluir
  `apps/app/shared/lib/themePreference.ts` (novo) e `apps/app/__tests__/themePreference.test.ts` (novo),
  além de `app/layout.tsx`, `shared/providers/AppDesignProvider.tsx` e `shared/lib/postLoginNavigation.ts`.
- **#7 (página da conta)** absorve a mudança do `AccountPreferencesForm.tsx`, que já estava lá.
- Os testes trazidos pelo `/test` (`accountApiErrorCopy`, `accountSecurityForm`, `accountMergedPayload`,
  `accountPasswordRoute`, `postLoginPreferences`, `profileDropdownAccount`, `serverSessionRevocation`, …)
  acompanham o commit da funcionalidade que cobrem; `serverSessionRevocation.test.ts` vai com o **#2**
  (`fix(auth): reject id tokens minted before a session revocation`), que é o contrato que ele fixa.

---

# Rodada 3 — dois defeitos devolvidos pelo `/test`

## Antes de tudo: a conflação que eu cometi na rodada 2

Afirmei ter corrigido a "segunda causa" (projeção pulada com `?redirect=`) e **não corrigi**. O que eu
medi foi **coerência** entre SSR e DOM, não **projeção**: num navegador que já tem `localStorage.theme`,
o `ThemeCookieSync` mantém cookie e storage alinhados, então servidor e cliente pintam igual **mesmo sem
projeção nenhuma**. O teste que escrevi herdou o mesmo ponto cego. Fica registrado: *medir o sintoma
vizinho não é medir o defeito*.

## Defeito 1 — preferências não chegavam quando havia `?redirect=`

**Causa raiz**: projetar preferências e resolver destino eram a **mesma** função. `projectPreferences`
só era alcançada por `resolveDefaultPostLoginForApp`, e os dois caminhos de pós-login retornam antes
quando há `redirect` na query (`postLoginNavigation.ts:88-91` e `packages/auth/provider.tsx:85-88`).
O efeito colateral (levar a preferência ao dispositivo) estava pendurado na decisão de rota.

**Medido antes**, navegador virgem, conta `{theme: light, locale: es}`, `?redirect=%2Fpt-br%2Fentities`:
destino `/pt-br/entities` ✅, mas `x-theme` **ausente**, `localStorage.theme` **null**, DOM **`dark`**
(preferência do SO) — a conta dizia `light`.

**Correção** (só em `apps/app`, o pacote genérico não foi tocado): separei as responsabilidades em
`postLoginNavigation.ts` — `applyAccountPreferences(idToken)` faz o efeito e devolve `{type,
preferredLocale}`; `destinationForAccount()` decide a rota. `resolveAppPostLoginPath` **sempre** aplica
as preferências e **depois** avalia o `redirect`; o `postAuthRedirectTarget` continua sendo o único dono
do destino — o guard de open-redirect não foi tocado (o teste "recusa um redirect para fora da
aplicação" segue verde).

**Medido depois**, mesmo cenário: destino `/pt-br/entities` ✅ (inalterado), `x-theme=light`,
`localStorage.theme=light`, DOM **`light`**.

**Decisão sobre o idioma**: o `x-locale` **não** é projetado quando um `?redirect=` está mandando no
destino. Motivo medido: `apps/app/proxy.ts:159` reescreve `x-locale` a partir do segmento da URL **a
cada request**, então projetar `es` ao ir para `/pt-br/entities` só produzia um render transitório em
espanhol dentro de uma página portuguesa (`lang=es` com cookie voltando a `pt-br`) — piora, não melhora.
Sem `?redirect=`, o idioma continua sendo projetado e a navegação vai para `/{idioma preferido}`, que é
o caso que a spec descreve.

## Defeito 2 (D-4) — idioma vinha vazio e travava o salvamento

**Causa raiz isolada com instrumentação temporária** (removida): o campo era corrompido por uma escrita
vinda do **próprio primitivo de select**. Sequência medida no browser, com pilha de chamada:

1. render 1–2: `field.value = "pt-br"` (o `defaultValue`), opções `["pt-br","en","es"]`;
2. o dado da conta chega e `form.reset` põe `locale = "es"` (render 3–4);
3. o `select` nativo escondido que o primitivo mantém para submissão de formulário **ainda não tem a
   opção `es` montada**, então o browser força o valor dele para `""` e dispara `change`;
4. o handler do primitivo (`onChange` → `useControllableState.setValue`) propaga `""` pelo
   `onValueChange`, que o wrapper ligava direto ao `field.onChange` — **RHF passa a valer `""`**;
5. `""` não é opção válida, então o próprio wrapper deixa de controlar o primitivo e o estado se
   sustenta: rótulo mostra o placeholder e o submit morre no Zod (`Invalid option`).

Sonda que fecha o diagnóstico: `{"rhf":{"theme":"light","locale":""},"acc":{"theme":"light","locale":"es"}}`
— a conta trazia `es`, o formulário guardava `""`. Por isso só aparecia quando a conta tinha idioma
diferente do `defaultValue`: com `pt-br` o valor coincidia e a escrita espúria era invisível.

**Correção na raiz, no componente compartilhado** (`packages/design-system/.../hookformSelect.tsx`):
o wrapper só repassa para o RHF um valor que **é uma das `options`**. É o contrato do componente —
escolha é sempre uma opção — e vale para **todos** os consumidores (os formulários de entidade e de
usuário fazem o mesmo `reset` assíncrono e tinham a mesma armadilha dormente). Não mexi na
`AccountPreferencesForm`: remendar a tela seria replicar workaround num dos call sites.

**Medido depois**, na tela real: com conta `{locale: es}` e URL `/pt-br/account?tab=preferences`, o
campo abre com **"Español"**, o submit **emite `PUT /account`** e a mensagem de Zod cru desapareceu.

## Os testes mordem?

| Teste | Muta o quê | Resultado |
|---|---|---|
| `postLoginPreferences.test.ts` › "dá precedência ao redirect … e ainda assim aplica o tema" | movi a projeção para depois do early return do `redirect` | ❌ **falhou** · restaurado ⇒ 11/11 |
| `hookFormSelectValue.test.tsx` › "ignora um valor que não é uma das opções" | removi a guarda `options.some(...)` | ❌ **falhou** · restaurado ⇒ 2/2 |
| `accountPreferencesForm.test.tsx` › "mantém o idioma da conta quando o dado chega depois" | removi a guarda | ⚠️ **passou mesmo sem a correção** |

O terceiro **não morde** e eu digo isso em vez de contar como cobertura: o jsdom não reproduz o
`select` nativo escondido que dispara a escrita espúria. Ele fica porque descreve o cenário de ponta a
ponta (dado assíncrono ⇒ rótulo certo ⇒ submit com `locale: "es"`), mas **quem prova a correção é o
teste do wrapper**. O teste do `postLoginPreferences` que fixava o comportamento errado
(`expect(meMock).not.toHaveBeenCalled()`) foi **reescrito**, não removido: agora exige destino do
`redirect` **e** tema aplicado **e** `x-locale` ausente.

## Validação visual (rodada 3)

`agent-browser` em sequência estrita, sessão real, conta `{theme: light, locale: es}`:

| Arquivo | Cenário |
|---|---|
| `14-idioma-recarrega-light-ptbr.png` | URL `/pt-br`, conta `es`: campo Idioma abre com **"Español"** (antes: vazio) · claro |
| `15-preferencias-salvas-light-es.png` | salvar emite `PUT /account` **200** e navega para `/es/account?tab=preferences` · claro |
| `16-preferencias-dark-es.png` | mesma tela em **escuro**, es — rádio mostra o valor da conta, tela no override local |
| `17-idioma-mobile390-dark-en.png` | **390×844**, escuro, en: "Español" carregado no select |

Rede conferida no salvamento: `PUT /account` **200** seguido de `GET /account` **200** — antes da
correção **nenhuma requisição saía** (o submit morria na validação).

Cobertura desta rodada: claro + escuro, desktop + 390 px, pt-br + en + es.

## Gates (rodada 3, `--force`, sem cache)

| Gate | Resultado |
|---|---|
| `pnpm check` | ✅ **508 arquivos**, 0 erro |
| `pnpm turbo run lint typecheck test --force` | ✅ **23 successful / 23 total**, `Cached: 0`, exit 0 |
| `api:test` | ✅ **315 testes** / 30 arquivos (inalterado) |
| `app:test` | ✅ **262 testes** / 36 arquivos (259/34 antes: **+2 arquivos, +3 casos**) |
| `@repo/internationalization:test` | ✅ **27 testes** |

## Plano de commits — os novos commits desta rodada

Por cima dos 13 já feitos (`HEAD = 5d4f443`), **sem amend e sem rebase**. Um por pacote/app, na ordem de
dependência:

| # | Mensagem | Arquivos |
|---|---|---|
| 14 | `fix(design-system): keep a select value the primitive cannot resolve yet` | `packages/design-system/components/form/hookform/hookformSelect.tsx` |
| 15 | `fix(app): apply the account preferences on every sign-in` | `apps/app/shared/lib/postLoginNavigation.ts`, `apps/app/__tests__/postLoginPreferences.test.ts` |
| 16 | `test(app): cover the language field reloading from the account` | `apps/app/__tests__/hookFormSelectValue.test.tsx`, `apps/app/__tests__/accountPreferencesForm.test.tsx` |
| 17 | `docs(features): account-settings` | `docs/features/account-settings/review/review.md`, `docs/features/account-settings/review/screenshots/14…17`, `docs/features/account-settings/STATE.md` |

O #16 podia entrar junto do #14, mas cobre os dois defeitos (wrapper **e** tela), então fica separado
para não amarrar um teste de `apps/app` ao commit do pacote.
