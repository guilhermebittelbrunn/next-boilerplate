# Handoff do develop: lote de correções pequenas

Implementados os itens 2, 3, 5 e 6 do plano. Os itens 1 e 4 continuam fora, como o plano decidiu. Nada foi
commitado, nenhuma branch foi criada e o índice não foi tocado (os dois renames de `specs/` que estão nele
são de outra tarefa).

## Blueprint → arquivos

| item | arquivos |
|------|----------|
| 2. Link "esqueci a senha" na landing | `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx`; `packages/internationalization/translations/apps/web/pages/signIn/index.ts` (chave `forgotPassword` nos 3 idiomas); `apps/web/__tests__/signInForgotPassword.test.tsx` (novo) |
| 3. Guard de redirect | `packages/auth/redirect.ts`; `apps/app/__tests__/postAuthRedirectTarget.test.ts` movido para `packages/auth/__tests__/postAuthRedirectTarget.test.ts` com `mv` comum, import trocado para `../redirect`; `apps/app/__tests__/onboardingState.test.ts` (ver desvio 1) |
| 5. `escapeRegExp` no E2E | `apps/e2e/support/regExp.ts` (novo); `apps/e2e/tests/entityCrud.spec.ts`, `landing.spec.ts`, `panelSwitch.spec.ts`, `signIn.spec.ts` (cópia local removida); `apps/e2e/__tests__/regExp.test.ts` (novo) |
| 6. Porta do `start` | `apps/web/package.json` (`next start -p ${PORT:-3001}`); `apps/api/package.json` (`next start -p ${PORT:-3002}`, só a linha 9; a linha `backfill-audit-levels` da `audit-log-levels` ficou intacta) |

O `mv` do teste do guard aparece no `git status` como `D apps/app/__tests__/postAuthRedirectTarget.test.ts` mais
um arquivo novo não rastreado em `packages/auth/__tests__/`. O revisor decide se registra como rename no commit.

## Contrato

Nenhum DTO, action do SDK ou rota da API mudou. A única mudança de contrato é a do `postAuthRedirectTarget`:
ele passa a esperar o valor já decodificado uma vez e não decodifica de novo. Quem consome:
`apps/app/proxy.ts`, `apps/app/shared/lib/postLoginNavigation.ts`, `apps/app/shared/lib/authRedirectLink.ts`
(`withRedirectQuery`), `apps/app/shared/lib/onboarding.ts` (`resolveOnboardingDestination` e
`buildOnboardingPath`) e `packages/auth/provider.tsx` (dois pontos).

## Códigos de erro novos

Nenhum.

## Desvios em relação ao plano

1. **O plano deixou de fora um teste que a mudança do guard quebra.** `apps/app/__tests__/onboardingState.test.ts:119`
   afirmava que `resolveOnboardingDestination("%2Fen%2Faccount", "pt-br")` devolve `/en/account`, o que só
   valia por causa da segunda decodificação. Troquei a entrada por `"/en/account"`, que é a forma que os
   chamadores reais passam. Nesse mesmo arquivo, as entradas codificadas da lista de laço do onboarding
   (`"%2Fpt-br%2Fonboarding"` e `"%2Fpt-br%2Fonboarding%3Fx%3D1"`, linhas 141 e 154) continuam passando, mas agora
   porque o guard as recusa e devolve o fallback `/pt-br`, e não porque elas são reconhecidas como caminho do
   onboarding. O resultado esperado é o mesmo, então deixei como estão; as versões decodificadas ao lado ainda
   cobrem a detecção do laço.
2. **Casos extras no teste do guard**, além dos dois que o plano pedia: `%2F%2Fevil.com`, `/\evil.com`,
   `"  //evil.com"` (com espaço antes), `javascript:alert(1)`, `/pt-br/x/../../javascript:alert(1)` e
   `/pt-br/report?v=100%` (um `%` solto, que antes lançava `URIError`).
3. **Item 2**: o JSX do bloco de baixo virou `div.space-y-2` com um `<p>` por link, igual ao login da app; antes
   era um `div` só com o texto e o link de cadastro.
4. **Item 5**: `entityCrud.spec.ts:63` monta `new RegExp(\`${listPath}/edit/[^/]+$\`)` com um caminho fixo do
   próprio teste, não com texto do dicionário. Ficou fora pelo mesmo motivo do D9 (`crossAppSignOut.spec.ts`).

## Revisão de segurança do item 3

Li todos os chamadores de `postAuthRedirectTarget` (lista na seção Contrato) e os de `withRedirectQuery` e
`resolveOnboardingDestination`:

- `proxy.ts:280`, `postLoginNavigation.ts:122`, `provider.tsx:92` e `:157` passam `URLSearchParams.get("redirect")`,
  já decodificado.
- `SignInForm.tsx:194` e `SignUpFormClient.tsx:214` passam a prop `redirect`, que vem do `searchParams` da página
  (`sign-in/page.tsx:22`, `sign-up/page.tsx:22`), já decodificado pelo Next. O mesmo vale para
  `onboarding/page.tsx:36-43`.
- `InvitationAcceptance.tsx:53-57` passa um caminho montado em código (`/${locale}/invite?token=${encodeURIComponent(token)}`)
  e `lib/server/onboarding.ts:39-40` passa o header `x-app-path` (`${pathname}${search}` do proxy). Os dois estão
  na forma de URL de propósito; sem a segunda decodificação, seguem como foram montados.

Nenhum chamador passa valor que ainda precise ser decodificado. Um valor que chega codificado (por exemplo
`%2F%2Fevil.com`) agora cai no fallback porque não começa com `/`. As recusas de antes continuam: a checagem
final é sobre o `pathname` que o `new URL` resolve, e ele interpreta `%2e%2e` como `..` e `\` como `/` sem
depender do `decodeURIComponent`.

Uma mudança de comportamento que o plano não cita: no header `x-app-path`, um caminho como
`/pt-br/%2F%2Fevil.com` antes era decodificado para `/pt-br//evil.com` e recusado; agora é aceito como está. O
`%2F` fica literal no caminho, o destino continua na mesma origem (`/pt-br/%2F%2Fevil.com`) e o host não muda.
Não há teste dedicado para essa forma; fica para o revisor julgar se vale um.

Instrumentos: `npx vitest run __tests__/postAuthRedirectTarget.test.ts` em `packages/auth` → 14/14;
`npx vitest run` de `onboardingState`, `authRedirectLink`, `proxy` e `postLoginPreferences` em `apps/app` → 67/67
(inclui os casos codificados de `proxy.test.ts:356-386`, que passam pela URL e chegam decodificados uma vez).

## Testes mutantes

Cada mutação foi aplicada com a cópia original guardada no scratchpad da sessão, fora do repositório, e
restaurada antes de qualquer gate oficial.

| item | mutação | resultado |
|------|---------|-----------|
| 3 | volta o `decodeURIComponent` com `try/catch` | 2 testes falham (valor codificado recusado; `%26`/`%25` preservados), 12 passam |
| 5 | `escapeRegExp` devolve o texto sem escapar | 2 de 3 falham |
| 2 | não remove a barra final da `NEXT_PUBLIC_APP_URL` | 3 de 4 falham (os 3 idiomas) |
| 2 | link renderizado sem depender da env | 1 de 4 falha (o caso de env vazia) |

## Validação

Carga da máquina durante os gates: `uptime` → load average 7,88 / 7,92 / 14,16. Nenhum timeout de runner.

| gate | comando | resultado |
|------|---------|-----------|
| testes `@repo/auth`, `web`, `e2e`, `@repo/internationalization` (e dependências) | `pnpm turbo run test typecheck --filter=@repo/auth --filter=web --filter=e2e --filter=@repo/internationalization` | 15/15 tasks; auth 215 testes (16 arquivos), web 319 (36), e2e 41 (4), internationalization 67 (7, inclui paridade) |
| testes `app` (por causa do `onboardingState.test.ts` e da remoção do teste movido) | `pnpm turbo run test --filter=app` | 9/9 tasks; app 1403 testes (154 arquivos) |
| typecheck | `pnpm turbo run typecheck --filter=@repo/auth --filter=web --filter=e2e --filter=@repo/internationalization --filter=app` | 5/5 tasks |
| lint | `pnpm check` | 1170 arquivos, nenhuma correção |
| rótulos sem escape | `git grep -n 'new RegExp(\`^${' apps/e2e/tests` | sobram só `crossAppSignOut.spec.ts:12-13` (D9) e a chamada já escapada de `entityCrud.spec.ts:17` |

Porta do `start` (item 6). Sem build de produção, o `next start` imprime a URL local com a porta que recebeu e
só depois falha com "Could not find a production build". Medi isso nos quatro casos:

| comando | `Local:` impresso |
|---------|-------------------|
| `env -u PORT pnpm --filter web start` | `http://localhost:3001` |
| `PORT=3105 pnpm --filter web start` | `http://localhost:3105` |
| `env -u PORT pnpm --filter api start` | `http://localhost:3002` |
| `PORT=3105 pnpm --filter api start` | `http://localhost:3105` |

Os quatro processos terminaram sozinhos; `lsof -nP -iTCP:3001 -iTCP:3002 -iTCP:3105 -sTCP:LISTEN` não listou
nada depois. Isso prova a porta que o Next recebe, não que o app responde nela.

## A verificar no `/test`

1. **Item 6, app respondendo na porta.** Com `pnpm --filter web build` e `pnpm --filter api build` feitos:
   `pnpm --filter web start` → `curl -sI http://localhost:3001/pt-br`; `PORT=3105 pnpm --filter web start` →
   `curl -sI http://localhost:3105/pt-br`; o mesmo par na api com `curl -s http://localhost:3002/health` e
   `:3105/health` (espera `200 {"message":"OK"}`). Não fiz o build por custo.
2. **Item 2 no navegador.** `/{pt-br,en,es}/sign-in` da landing com `NEXT_PUBLIC_APP_URL` preenchida: o link
   aparece com a copy do idioma, acima do "Não tem uma conta?", e o clique abre `<APP_URL>/{locale}/forgot-password`.
   Com `NEXT_PUBLIC_APP_URL=""` o link some e o resto não muda. Light, dark e mobile 390 px. O teste de componente
   mede `href` e presença, não layout nem contraste.
3. **Item 3 no fluxo.** `/pt-br/sign-in?redirect=%2Fpt-br%2Faccount%3Ftab%3Dbilling` leva a
   `/pt-br/account?tab=billing` depois do login. Opcional: um destino com `%26` na query
   (`?redirect=%2Fpt-br%2Fentities%3Fq%3Da%2526b`) chega com `q=a%26b`.
4. **Item 5.** `pnpm e2e` não deve mudar de resultado; roda no job `e2e` do CI. Não rodei.

## Lacunas de teste conhecidas

- Item 6 não tem teste automatizado; a prova é a medição acima e o item 1 da lista anterior.
- Nenhum teste cobre a forma `/pt-br/%2F%2Fevil.com` vinda do header `x-app-path` (ver revisão de segurança).
- `signInForgotPassword.test.tsx` usa jsdom no próprio arquivo, como o `signInFormRedirect.test.tsx` vizinho.

## Decisões em aberto

Nenhuma nova. As perguntas 1 e 2 da §7 do plano seguem como estão. A pergunta 3 (branch própria) foi respondida
pelo usuário: tudo fica em `feat/audit-log-levels`. O `apps/api/package.json` continua com os dois hunks (o
`start` deste lote e o `backfill-audit-levels` da `audit-log-levels`), então o `/review` precisa commitar a
outra feature antes ou preparar só a linha do `start` com patch no índice.
