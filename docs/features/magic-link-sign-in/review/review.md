# Revisão: entrar com link enviado por e-mail

Revisão por leitura do diff da feature (`packages/sdk`, `apps/api`, `packages/auth`, `apps/app`,
`packages/internationalization`, `docs/SETUP.md`, `docs/PRE-PRODUCTION.md`) contra `docs/review-checklist.md`,
mais os gates estáticos. Rodada autônoma do `/cycle`: nenhuma branch foi criada nem renomeada, nada foi para o
índice. Os arquivos de `specs/` no working tree são da auditoria do backlog desta rodada e não foram revisados
como código; entram num commit `docs(specs)` próprio.

## Branch

| Item | Valor |
|------|-------|
| Atual | `guilhermebittelbrunn/feature-valor-cycle` (criada pelo Conductor, não protegida) |
| Regex sobre a atual | `BRANCH INVALIDA: guilhermebittelbrunn/feature-valor-cycle` |
| Proposta | `feat/magic-link-sign-in` |
| Regex sobre a proposta | `branch OK: feat/magic-link-sign-in` |
| Estado da atual | sem upstream, zero commits acima de `origin/main` (`df381f4`) |
| Ação | a criar na aprovação dos commits: `git branch -m feat/magic-link-sign-in` antes do primeiro `git add` |

A feature toca dois apps (`api`, `app`) e três pacotes, então o nome omite o `<project>`, que é a forma aceita
para vários apps. Como a branch atual não tem remoto nem commit de terceiro, renomear é o caminho da regra.

## Revisão: magic-link-sign-in

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `EmailLinkCompletion.tsx:161-177` (antes da correção): depois que o Firebase aceita o código, a página não
  tinha saída se o `onAuthSuccess` do provider falhasse ao gravar a sessão. O `onAuthSuccess`
  (`packages/auth/provider.tsx:353-370`) engole o erro, mostra um alerta e retorna sem lançar, então a mutation
  termina em `isSuccess`. No caminho com e-mail guardado, a tela ficava no loader "Entrando…" para sempre; no
  caminho com e-mail digitado, o formulário voltava e o próximo envio caía em "Este link não vale mais", porque o
  código já tinha sido gasto. **Corrigido** (ver abaixo). A causa de fundo (o provider não
  distingue sucesso de sessão recusada) ficou como decisão em aberto.

### 🟢 Sugestão / nit

- `packages/auth/provider.tsx:364`: o alerta de sessão recusada é `new Error("Could not establish session")`, e o
  `FormattedError` devolve `error.message` para `Error` genérico. O texto aparece em inglês nos três idiomas.
  O defeito é anterior a esta feature (o login por senha e o Google passam pelo mesmo `onAuthSuccess`); o link
  só herda. Fica para o backlog.
- `packages/internationalization/translations/packages/auth/index.ts:55`: `auth/user-disabled` em inglês é
  "User disabled.", enquanto pt-br e es dizem "Esta conta foi desativada." / "Esta cuenta ha sido desactivada.".
  O handoff já apontou; mudar afeta o login por senha também, então fica fora desta PR.
- `EmailLinkCompletion.tsx:184-192`: o loader "Entrando…" usa o `FullScreenLoader`, que tem `min-h-[60vh]`, com o
  texto abaixo dele. O texto pode ficar longe do spinner ou abaixo da dobra no celular. É visual; vai para a
  lista do `/test`.

### ✅ OK

- **Enumeração de conta**: o POST (`request/route.ts:45-80`) só responde de forma diferente por configuração
  (flag desligada → `404 AUTH_EMAIL_LINK_DISABLED`; sem Resend ou sem `NEXT_PUBLIC_APP_URL` → `503
  EMAIL_NOT_CONFIGURED`), e as duas checagens vêm antes de ler o corpo. Conta existente, inexistente, inelegível ou
  desativada recebe o mesmo `200 { requested: true }`. A busca da conta, a geração do link e o envio rodam em
  `after()`, como na recuperação de senha (`password/reset-request/route.ts`), e o log de falha só leva o
  `requestId`.
- **Rate limit**: `/auth/sign-in/email-link/request` entrou em `RATE_LIMITED_PATHS` (`proxy.ts:59`). O casamento é
  por path exato (`proxy.ts:72-73`, `RATE_LIMITED_PATHS.includes(pathname)`), então o GET de disponibilidade em
  `/auth/sign-in/email-link` fica fora, e `/auth/sign-in` não o captura por prefixo. O teste novo em
  `corsOrigin.test.ts` fixa isso.
- **Open redirect**: o cliente não manda URL. A URL de continuação e a base do link saem de
  `env.NEXT_PUBLIC_APP_URL` no servidor (`auth-action-links.ts:61-67`, `toAppLink`). O link não leva `redirect`; o
  destino pós-login passa por `postAuthRedirectTarget` quando há `?redirect=` na página.
- **Link reutilizado e leitor de link**: a página (`page.tsx`) é Server Component e não chama nada; a conclusão é
  só no cliente e só com o e-mail guardado no `localStorage` daquele navegador ou digitado. Um `GET` de scanner não
  gasta o código. O reuso devolve `auth/invalid-action-code`, mapeado para o cartão "inválido".
- **Elegibilidade (D1)**: `canSignInByLink` exige provedor `password` e `emailVerified`
  (`auth-action-links.ts:48-50`), antes de gerar o link. Erro do gerador com `code` vira `null` e log sem
  endereço; nenhum caminho responde 500.
- **Validação na borda**: `emailLinkSignInRequestSchema` (`auth.schema.ts:25-28`) com `trim`, `max(320)`, `email()`
  e `locale` restrito ao enum; corpo via `parseRequestJson`. O formato `export async function POST` sem guard
  segue as rotas anônimas vizinhas de `auth/password/*`.
- **Flag**: `EMAIL_LINK_SIGN_IN_ENABLED` usa `|| undefined` no `runtimeEnv` (`env.ts:54-55`), então `""` não
  derruba a app, e só `"true"` (com trim e sem diferenciar maiúsculas) liga (`email-link-sign-in.ts:4-5`).
- **GET de disponibilidade** com `dynamic = "force-dynamic"`: sem isso o Next pré-renderiza o GET sem argumento no
  build. O desvio do `/develop` está certo.
- **`error.code` novo** `AUTH_EMAIL_LINK_DISABLED` está em `apiErrors` nos três idiomas.
- **SDK**: só acréscimos em `AuthActions`, erro propaga cru. Único consumidor: `useEmailLinkSignIn.ts`.
- **App**: chamadas só via `apiClient`; `queryKeys.auth.emailLinkAvailability()` centralizado; formulários com
  `buildEmailLinkSchema(dictionary)` + `zodResolver` + `HookFormInput` com mensagem do dicionário; `"use client"`
  só nos dois componentes com estado; nenhuma string de UI solta.
- **Trava de duplo envio** por `useRef` nos dois formulários, além do botão com `isPending`.
- **Comentários**: nenhum cita o fluxo de agents (`grep` por `plan.md`, `handoff`, `D1`, `Q1`, "critério" nas
  linhas novas: zero). Os que existem explicam restrição do Firebase ou do Next.
- **Docs**: o formato do log citado no item 15 do `PRE-PRODUCTION.md`
  (`[auth-action-link] refused kind=sign-in code=…`) bate com `logEvent` (`packages/shared/utils/helpers/log.ts`);
  o projeto `demo-next-boilerplate` citado no `SETUP.md` bate com `DEMO_PROJECT_ID` (`packages/auth/emulator.ts:16`).
- **Artefatos**: `docs/features/magic-link-sign-in/` só tem endereços `@example.com` e nenhuma credencial.

**Divergência com a spec, registrada**: D1 estreita o corte. Conta só Google e conta com e-mail não confirmado
não recebem link, e a spec pedia o link para quem tem conta. O item que a auditoria acrescentou à spec ("conta que
só entra por link não vê o formulário de troca de senha…") fica atendido por construção: com D1, nenhuma conta
passa a ser "só link". A escolha é a Q1 do plano.

### 👁 Verificar no `/test`

Afirmações do handoff que a leitura não confirma, em ordem de risco:

1. **Fluxo ponta a ponta no emulador.** O handoff provou a montagem da URL (`mode=signIn`, `apiKey`) só com o SDK
   mockado. Repro: flag `"true"` e Resend placeholder na API, pedir com `user@example.com` em
   `/pt-br/sign-in/email-link`, ler o código em
   `GET http://127.0.0.1:9099/emulator/v1/projects/demo-next-boilerplate/oobCodes` (`requestType: "EMAIL_SIGNIN"`),
   abrir `/pt-br/sign-in/email-link?oobCode=<código>` no mesmo navegador e conferir que entra.
2. **E-mail diferente não gasta o código.** A UI de "mismatch" depende disso (o `/analyze` mediu no emulador; o
   código não foi exercitado contra o Firebase). Repro: abrir o link em aba anônima, digitar outro e-mail
   (mensagem "Este link foi pedido para outro e-mail."), depois o certo, e conferir que entra.
3. **Sessão recusada depois do link** (corrigido nesta revisão, sem teste). Repro: bloquear
   `POST /api/auth/session` no devtools e concluir um link. Esperado: alerta de erro, loader "Entrando…" com o link
   "Voltar para o login"; clicar leva ao login, que tenta gravar a sessão de novo. Medir também os dois caminhos
   (e-mail guardado e e-mail digitado).
4. **Cookie, `lastAccessAt` e onboarding** depois do link, e **admin cai em `/admin`**. Vem do `onAuthSuccess`,
   sem código novo. Repro: concluir com a conta comum do seed e com a admin; conferir o cookie `access-token`, o
   `lastAccessAt` no perfil e o destino.
5. **Contas inelegíveis não ganham código.** Repro: pedir com uma conta só Google e com uma não verificada;
   `oobCodes` sem entrada nova e `providerData` igual antes e depois. Resposta da API idêntica à da conta elegível.
6. **Build marca a rota de disponibilidade como dinâmica.** Repro: `pnpm --filter api build`, conferir
   `/auth/sign-in/email-link` como `ƒ`.
7. **Telas novas em light, dark, mobile e nos 3 idiomas**: pedido, enviado, indisponível, confirmação de e-mail,
   cartões de expirado, inválido e falha, link no login. Atenção ao loader "Entrando…" com o texto abaixo de
   `min-h-[60vh]` no celular.

### Lacunas de teste

| Lacuna | Veredito |
|--------|----------|
| Nenhum teste monta o `AuthProvider` real com `signInWithEmailLink` para provar que o sucesso passa pelo `onAuthSuccess` (handoff) | continua aberta; o percurso do item 4 acima cobre |
| Comportamento real do SDK do Firebase com a URL montada (handoff) | continua aberta; item 1 acima |
| "User disabled." em inglês (handoff) | fora de escopo; registrado como 🟢 |
| Estado pós-sucesso do `EmailLinkCompletion` (loader + "Voltar para o login", sem formulário) | nova, aberta: a correção desta revisão não tem caso em `emailLinkCompletion.test.tsx`. Sugestão para o `/test`: e-mail digitado, `completeMock` resolvido, conferir que o formulário some e o link de volta aparece |

## Correções aplicadas

- `apps/app/app/[locale]/(unauthenticated)/sign-in/email-link/components/EmailLinkCompletion.tsx:141-178`: com a
  mutation em `isSuccess`, a página mostra o loader "Entrando…" e o link "Voltar para o login" (que já existia no
  dicionário como `backToSignIn`), em vez de reabrir o formulário que gastaria o código de novo. O link de volta
  virou uma constante reaproveitada pelo cartão de falha. Antes: `isSuccess` com e-mail digitado reabria o
  formulário; com e-mail guardado, loader sem saída.

Validação da correção: `emailLinkCompletion.test.tsx` rodado isolado, 16/16.

## Raio de impacto

- `@repo/sdk` `AuthActions`: dois métodos novos, nada mudou de forma. Consumidor: `apps/app/shared/hooks/useEmailLinkSignIn.ts`.
- `@repo/auth`: `AuthContextType.signInWithEmailLink` novo; `client.ts` exporta `signInWithEmailLinkCode`. Todo teste
  que mocka `@repo/auth/client` com lista fechada e monta o `AuthProvider` precisa do export: os dois da app já
  foram ajustados. `apps/web` não monta esse provider.
- `buildAuthActionLink`: os kinds antigos usam o mesmo gerador; o `UserRecord` agora é guardado e só o kind
  `sign-in` o lê.
- `apps/api/proxy.ts`: um path a mais na lista de rate limit.

## Decisões em aberto

1. **O provider deveria reportar sessão recusada como erro da mutation?** Hoje `onAuthSuccess` engole a falha e a
   mutation termina em sucesso, para os três logins. Recomendação: separar o corpo de `onAuthSuccess` numa função
   que lança e deixar só o link usá-la, para a página mostrar o cartão de falha. Isso pede antes uma mensagem
   traduzida para sessão recusada, porque o texto atual é inglês fixo (🟢 acima). Fica para uma tarefa própria; a
   correção desta revisão já dá uma saída.
2. **Nome da branch**: renomear `guilhermebittelbrunn/feature-valor-cycle` para `feat/magic-link-sign-in` antes do
   primeiro commit.

As Q1 a Q5 do plano continuam como estavam, com a opção adotada implementada.

## Gates

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint/format | `pnpm check` | `Checked 989 files in 392ms. No fixes applied` |
| Typecheck | `pnpm turbo run typecheck --filter=app --filter=api --filter=@repo/auth --filter=@repo/sdk --filter=@repo/internationalization --filter=web` | 6/6 (5 do cache; `app` remedido por causa da correção) |
| Paridade i18n | `pnpm turbo run test --filter=@repo/internationalization` | 67/67, 7 arquivos (cache) |
| Teste do arquivo corrigido | `vitest run __tests__/emailLinkCompletion.test.tsx` (`apps/app`) | 16/16 |

A suíte inteira não foi rodada: é do `/test`.

## Plano de commits

Antes do primeiro: `git branch -m feat/magic-link-sign-in` e `git diff --cached --stat` vazio. Toda mensagem
termina com `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

1. `feat(sdk): add email link sign-in actions to the auth client`
   - `packages/sdk/src/actions/auth/action.ts`
2. `feat(api): add the sign-in kind to auth action links`
   - `apps/api/(shared)/lib/auth-action-links.ts`
   - `apps/api/__tests__/authActionLinks.test.ts`
3. `feat(api): add the email link sign-in flag and availability route`
   - `apps/api/env.ts`
   - `apps/api/.env.example`
   - `apps/api/(shared)/lib/email-link-sign-in.ts`
   - `apps/api/app/(routes)/auth/sign-in/email-link/route.ts`
   - `apps/api/__tests__/emailLinkSignInEnabled.test.ts`
4. `feat(api): add the email link sign-in request route`
   - `apps/api/(shared)/validation/auth.schema.ts`
   - `apps/api/app/(routes)/auth/sign-in/email-link/request/route.ts`
   - `apps/api/__tests__/authEmailLinkSignInRoute.test.ts`
5. `feat(api): rate limit the email link sign-in request`
   - `apps/api/proxy.ts`
   - `apps/api/__tests__/corsOrigin.test.ts`
6. `feat(auth): complete sign-in from an email link code`
   - `packages/auth/types.ts`
   - `packages/auth/client.ts`
   - `packages/auth/provider.tsx`
   - `packages/auth/__tests__/emailLinkSignIn.test.ts`
7. `test(app): stub the email link export in auth client mocks`
   - `apps/app/__tests__/authProviderLanguageSwitch.test.tsx`
   - `apps/app/__tests__/sessionExpiredSignOut.test.tsx`
8. `feat(app): add email link sign-in data hooks`
   - `apps/app/shared/lib/queryKeys.ts`
   - `apps/app/shared/lib/emailLinkSignIn.ts`
   - `apps/app/shared/hooks/useEmailLinkSignIn.ts`
   - `apps/app/__tests__/emailLinkSignInLib.test.ts`
9. `feat(app): add the email link sign-in page`
   - `apps/app/app/[locale]/(unauthenticated)/sign-in/email-link/page.tsx`
   - `apps/app/app/[locale]/(unauthenticated)/sign-in/email-link/components/EmailLinkRequestForm.tsx`
   - `apps/app/app/[locale]/(unauthenticated)/sign-in/email-link/components/EmailLinkCompletion.tsx`
   - `apps/app/app/[locale]/(unauthenticated)/sign-in/email-link/validations/emailLinkSchema.ts`
   - `apps/app/__tests__/emailLinkRequestForm.test.tsx`
   - `apps/app/__tests__/emailLinkCompletion.test.tsx`
   - `apps/app/__tests__/proxy.test.ts`
10. `feat(app): link to email sign-in from the sign-in form`
    - `apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx`
    - `apps/app/__tests__/signInEmailLinkEntry.test.tsx`
11. `feat(internationalization): add email link sign-in copy`
    - `packages/internationalization/translations/apps/app/pages/emailLinkSignIn/index.ts`
    - `packages/internationalization/translations/apps/app/pages/index.ts`
    - `packages/internationalization/translations/apps/app/pages/signIn/index.ts`
    - `packages/internationalization/translations/packages/shared/utils.ts`
12. `docs: document email link sign-in setup`
    - `docs/SETUP.md`
    - `docs/PRE-PRODUCTION.md`
13. `docs(specs): sync the backlog after PR #55`
    - `specs/BACKLOG.md`
    - `specs/account-security-mfa.md`
    - `specs/magic-link-sign-in.md`
14. `docs(features): magic-link-sign-in`
    - `docs/features/magic-link-sign-in/STATE.md`
    - `docs/features/magic-link-sign-in/analyze/plan.md`
    - `docs/features/magic-link-sign-in/develop/handoff.md`
    - `docs/features/magic-link-sign-in/review/review.md`
    - mais o `test/` que o `/test` gravar, se o usuário quiser no mesmo commit

A ordem segue a dependência pedida (`sdk` → `api` → `auth` → `app` → `internationalization`). Os commits 9 e 10
só passam no typecheck depois do 11, porque o texto vem do pacote de i18n; os commits intermediários não compilam um a um, e o
CI verifica a PR no conjunto.

PR sugerida: `feat: sign in with an email link`.

## Commits realizados

Feitos na branch `guilhermebittelbrunn/feature-valor-cycle`, com aprovação do usuário. A troca de nome para
`feat/magic-link-sign-in` não foi feita: o usuário pediu a PR a partir da branch atual.

| SHA | Mensagem |
|-----|----------|
| `47861bb` | `feat(sdk): add email link sign-in actions to the auth client` |
| `4e4945d` | `feat(api): add the sign-in kind to auth action links` |
| `3364a16` | `feat(api): add the email link sign-in flag and availability route` |
| `a08d666` | `feat(api): add the email link sign-in request route` |
| `fee0e3b` | `feat(api): rate limit the email link sign-in request` |
| `22e63c2` | `feat(auth): complete sign-in from an email link code` |
| `73eba2b` | `test(app): stub the email link export in auth client mocks` |
| `ffac05d` | `feat(app): add email link sign-in data hooks` |
| `96cb174` | `feat(app): add the email link sign-in page` |
| `8b92fb8` | `feat(app): link to email sign-in from the sign-in form` |
| `0720643` | `feat(internationalization): add email link sign-in copy` |
| `7ee4ca6` | `docs: document email link sign-in setup` |
| `d53ed4c` | `docs(specs): sync the backlog after PR #55` |

O commit dos artefatos (`docs(features): magic-link-sign-in`) vem por último e leva este arquivo.
