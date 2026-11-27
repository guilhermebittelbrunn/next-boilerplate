# Plano: lote de correções pequenas (api, web, auth, e2e)

Tarefa direta, sem spec. Os itens vêm de "Tarefas diretas candidatas" em `specs/reference/AUDIT.md:330-390`.
Plano feito numa rodada autônoma do `/cycle`, sem acompanhamento: as decisões seguiram a ordem padrão do repo
e depois o menor raio de impacto, e cada uma está na §6 com a alternativa descartada.

Cada item foi reconferido no código do working tree em 2026-11-27, sobre `a13768c` com a feature
`audit-log-levels` ainda não commitada.

## 1. Resumo do lote

| # | item | procede? | fica no lote? | área |
|---|------|----------|---------------|------|
| 1 | `PUT /health` responde `405` sem `error.code` | sim | **não** | `apps/api` |
| 2 | Link de "esqueci a senha" no login da landing | sim | **sim** | `apps/web` + i18n |
| 3 | Guard de redirect: decodificação dupla e teste fora do pacote | sim | **sim** | `packages/auth` + `apps/app` (teste) |
| 4 | `getMergedUserFromIdToken` sem chamador | sim | **não, adiado** | `apps/api` |
| 5 | `RegExp` sem escape do `screenTitled` no E2E | sim, e em mais 3 lugares | **sim** | `apps/e2e` |
| 6 | `start` com porta fixa na `web` e na `api` | sim | **sim**, com aviso | `apps/web`, `apps/api` |

Ficam quatro itens: 2, 3, 5 e 6. Nenhum toca SDK, Firestore, rota da API, env nova ou infra. Nenhuma
dependência nova.

## 2. Itens que saíram do lote

### Item 1: `PUT /health` com `405` sem `error.code` (cortado)

Procede. `apps/api/app/(routes)/health/route.ts:5` só exporta `GET`, e o Next responde `405` sem corpo a
qualquer outro método. A rota coringa `apps/api/app/[[...path]]/route.ts:6-16` cobre só caminho inexistente
(`ROUTE_NOT_FOUND`).

Sai porque o defeito não é do `/health`. O achado (`AUDIT.md:1738`) diz que vale para toda rota que não
exporta o método pedido, e a `apps/api` tem 57 arquivos `route.ts`. Corrigir só o `/health` exportando
`PUT`/`POST`/... com um código novo seria o workaround que a política do ciclo manda não replicar
(`.claude/cycle-policy.md` §3, "corrigir na raiz"). A correção na raiz exige escolher um mecanismo: o
`apps/api/proxy.ts` saber quais métodos cada rota aceita, ou um helper que toda rota use para exportar os
métodos que faltam. Isso é decisão de arquitetura que alcança todas as rotas, e o efeito atinge só cliente
externo, porque o SDK nunca manda método errado. Fica como pergunta (§7).

### Item 4: `getMergedUserFromIdToken` sem chamador (adiado)

Procede. `git grep getMergedUserFromIdToken` acha só a definição (`apps/api/(shared)/lib/user-merge.ts:34-50`)
e o teste (`apps/api/__tests__/userMergeArchivedProfile.test.ts:65`, `:217-225`). A remoção também deixa sem
uso o import de `getCurrentUser` (`user-merge.ts:1`) e o `getCurrentUserMock` do teste (`:6`, `:17`, `:46`,
`:100`, `:113`).

Sai porque os dois arquivos estão modificados pela feature `audit-log-levels`, ainda fora de commit. No teste,
as linhas que a remoção mexe (o bloco `vi.hoisted` em `:6-25` e a lista do `beforeEach` em `:100-108`) são as
mesmas que a outra feature alterou (`recordLifecycleMock`). Os hunks se encostam, e separar os commits das
duas tarefas exigiria staging parcial dentro do mesmo hunk. O ganho é apagar código morto, com valor baixo.
Reabrir como tarefa direta depois que `audit-log-levels` for commitada.

## 3. Itens do lote

### Item 2: link de "esqueci a senha" no login da landing

**Procede.** `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx:162-172` tem só o link para o
cadastro. A recuperação existe apenas na app (`apps/app/app/[locale]/(unauthenticated)/forgot-password/`), e o
login da app já linka para ela (`apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx:170-176`).
A landing não tem rota de recuperação.

**Correção.**

- O link aponta para a app: `${NEXT_PUBLIC_APP_URL sem barra final}/${locale}/forgot-password`. É o mesmo
  modo como a landing já leva o visitante para a app no header (`apps/web/app/[locale]/components/header/index.tsx:63-65`,
  componente client que importa `env` de `@/env`) e no CTA de preços (`apps/web/shared/lib/pricingCta.ts:31`,
  que tira a barra final com `TRAILING_SLASHES`).
- Sem `NEXT_PUBLIC_APP_URL` (o `.env.example` publica `""`, e `apps/web/env.ts:32` já lê vazio como ausência),
  o link não aparece. A landing não tem para onde mandar o visitante, e a tela fica como está hoje. Esse é o
  modo degradado.
- Elemento `<a href>` comum, não `next/link`: o destino é outra origem e precisa de carga completa.
- Posição: acima do link de cadastro, num bloco `space-y-2 text-center text-sm`, como no login da app.
- Classe igual à dos links vizinhos: `text-primary hover:underline`.

**i18n.** Chave nova `apps.web.pages.signIn.forgotPassword` em
`packages/internationalization/translations/apps/web/pages/signIn/index.ts`, com a mesma copy do login da app
(`translations/apps/app/pages/signIn/index.ts:24`, `:49`, `:74`):

| idioma | valor |
|--------|-------|
| pt-br | `Esqueci minha senha` |
| en | `Forgot your password?` |
| es | `¿Olvidaste tu contraseña?` |

**Teste (Vitest, componente).** Arquivo novo `apps/web/__tests__/signInForgotPassword.test.tsx`, com os mocks de
`apps/web/__tests__/signInFormRedirect.test.tsx:13-50` e o `vi.stubEnv` + import dinâmico de
`apps/web/__tests__/docsUrlEnv.test.tsx:62-69`, `:132-137`. Casos:

1. Com `NEXT_PUBLIC_APP_URL="https://app.example.com/"`, o link com o texto do dicionário tem
   `href="https://app.example.com/en/forgot-password"` (barra final removida, idioma da rota).
2. Com `NEXT_PUBLIC_APP_URL=""`, nenhum link com esse texto é renderizado.
3. O texto vem do dicionário nos 3 idiomas (um `it.each` sobre `pt-br`/`en`/`es`).

**Critério de aceite.** No login da landing (`/{locale}/sign-in`), com `NEXT_PUBLIC_APP_URL` preenchida, aparece
"Esqueci minha senha" / "Forgot your password?" / "¿Olvidaste tu contraseña?" e o clique abre
`<APP_URL>/{locale}/forgot-password` na app, no mesmo idioma. Sem a variável, o link não aparece e o resto da
tela não muda. Light, dark e mobile sem sobreposição nem contraste abaixo de AA.

**Arquivos.**

- `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx`
- `packages/internationalization/translations/apps/web/pages/signIn/index.ts`
- `apps/web/__tests__/signInForgotPassword.test.tsx` (novo)

### Item 3: guard de redirect, decodificação dupla e teste fora do pacote

**Procede, as duas partes.**

Decodificação dupla: `packages/auth/redirect.ts:27` aplica `decodeURIComponent` ao valor recebido. Todos os
chamadores passam o resultado de `URLSearchParams.get("redirect")`, que já vem decodificado:

- `apps/app/proxy.ts:280-283` (`request.nextUrl.searchParams.get`);
- `apps/app/shared/lib/postLoginNavigation.ts:122-125`;
- `packages/auth/provider.tsx:92-94` e `:157-159`;
- `apps/app/app/[locale]/(authenticated)/onboarding/page.tsx:36-43` (`searchParams` do Next, também
  decodificado).

Dois chamadores passam um caminho montado por código, já na forma de URL, e não um parâmetro:
`InvitationAcceptance.tsx:53-57` (`/${locale}/invite?token=${encodeURIComponent(token)}`, via
`withRedirectQuery`) e `apps/app/lib/server/onboarding.ts:39-40` (o header `APP_PATH_HEADER`, via
`buildOnboardingPath`). Nos dois, a decodificação atual desfaz o `encodeURIComponent` da query antes de o
caminho ser recodificado; sem ela, o caminho segue exatamente como foi montado, que é o certo.

E todos os produtores codificam uma vez só: `proxy.ts:267` (`searchParams.set`), `authRedirectLink.ts:9`,
`onboarding.ts:104`, `packages/auth/provider.tsx:272` e `apps/web/shared/lib/pricingCta.ts:31` usam
`encodeURIComponent` uma vez. A segunda decodificação transforma `%26` em `&`, `%3D` em `=` e `%25` em `%`
dentro do destino, e um `%` solto (ex.: `?v=100%`, que chega como `100%25` e vira `100%` depois da primeira
decodificação) faz o `decodeURIComponent` lançar e o destino cair no fallback.

Teste fora do pacote: o guard só é testado por `apps/app/__tests__/postAuthRedirectTarget.test.ts`;
`packages/auth/__tests__/` não tem teste dele, então `pnpm --filter @repo/auth test` não pega regressão no
guard.

**Correção.**

1. Em `postAuthRedirectTarget`, trocar o `try { decodeURIComponent(...) } catch` por
   `const path = rawRedirect.trim();`. O resto das checagens fica igual. O JSDoc passa a dizer que a função
   recebe o valor já decodificado (o que `URLSearchParams.get` devolve). É restrição de contrato que o código
   não deixa evidente, então cabe nas exceções de `.claude/rules/code-comments.md` §2.
2. Mover o teste com `git mv` para `packages/auth/__tests__/postAuthRedirectTarget.test.ts`, importando de
   `../redirect`. O `packages/auth/vitest.config.mts` roda em `node`, o que basta: o guard não usa DOM.
3. Ajustar os casos que dependiam da decodificação extra:

| caso hoje | depois |
|-----------|--------|
| `"%2Fpt-br%2Fentities"` aceito como `/pt-br/entities` (`:21-25`) | vira recusa: valor que não começa com `/` cai no fallback |
| deep link `"%2Fpt-br%2Faccount%3Ftab%3Dbilling%26plan%3Dprice_1"` (`:87-95`) | entrada passa a ser `"/pt-br/account?tab=billing&plan=price_1"`, saída igual |
| `"%2Fpt-br%2F..%2F%5Cevil.com"` e `"%2Fpt-br%2F%252e%252e%2F%255cevil.com"` na lista de recusa (`:57-70`) | continuam recusados (não começam com `/`); ficam na lista |
| `"%E0%A4%A"` cai no fallback (`:105`) | continua no fallback (não começa com `/`) |

4. Casos novos, que provam a correção:
   - `"/pt-br/search?q=a%26b"` volta igual (antes voltava `?q=a&b`);
   - `"/pt-br/report?v=100%25"` volta igual (antes caía no fallback por `URIError`).
5. Todos os outros casos de recusa (`/pt-br/%2e%2e/%5cevil.com`, `/pt-br/../\evil.com`, `//evil.com`, ...)
   seguem como estão. A segurança vem da checagem sobre o `pathname` resolvido pelo `new URL`
   (`redirect.ts:43-44`), que interpreta `%2e%2e` como `..` sem precisar do `decodeURIComponent`, e um `%2F`
   ou `%5C` que fica codificado é segmento literal, sem efeito no host.

**Critério de aceite.** `pnpm --filter @repo/auth test` roda o teste do guard e passa; o arquivo antigo não existe
mais em `apps/app/__tests__/`. Um destino com `%26` ou `%25` na query sobrevive ao guard sem mudar. Todos os
casos de recusa de open redirect continuam recusados. Pelo produto: entrar em
`/{locale}/sign-in?redirect=<destino codificado uma vez>` leva ao destino exato depois do login (o E2E
`apps/e2e/tests/signIn.spec.ts:74` já cobre o caminho com `encodeURIComponent` simples).

**Arquivos.**

- `packages/auth/redirect.ts`
- `apps/app/__tests__/postAuthRedirectTarget.test.ts` → `packages/auth/__tests__/postAuthRedirectTarget.test.ts` (`git mv` + ajustes)

### Item 5: `RegExp` sem escape no E2E

**Procede, e em mais lugares que o achado.** `apps/e2e/tests/entityCrud.spec.ts:15` monta
`new RegExp(\`^${label} \\| .+\`)` com texto do dicionário. O mesmo padrão aparece em:

- `apps/e2e/tests/landing.spec.ts:9` (`notFound.title`);
- `apps/e2e/tests/panelSwitch.spec.ts:20` (`admin.home.greeting`);
- `apps/e2e/tests/signIn.spec.ts:50` (`admin.home.greeting`).

O próprio `signIn.spec.ts:16-17` já tem um `escapeRegExp` local, usado só em `:22-24`.

**Correção.** Levar o `escapeRegExp` de `signIn.spec.ts:16-17` para `apps/e2e/support/regExp.ts` (exportado) e
usar nos quatro lugares acima e no `:22-24` do `signIn.spec.ts`, removendo a cópia local. É a correção na raiz:
um helper para 5 usos em vez de uma terceira cópia.

Fora: `apps/e2e/tests/crossAppSignOut.spec.ts:12-13` montam a `RegExp` com `APP_URL`/`WEB_URL`, que vêm do
ambiente e não do dicionário. O `.` sem escape ali casa com qualquer caractere e nunca faz o teste reprovar
nem passar por engano com as URLs do E2E. Fica como está (mudança mínima).

**Teste (Vitest, unidade).** `apps/e2e/__tests__/regExp.test.ts` (novo; `apps/e2e/vitest.config.mts` inclui
`__tests__/**/*.test.ts`): `new RegExp(\`^${escapeRegExp("Plano (anual) + 50%?")}$\`)` casa com a string
literal e não casa com `"Plano anual + 50%"`; um rótulo sem metacaractere volta inalterado.

**Critério de aceite.** `pnpm --filter e2e test` passa com o teste novo; `pnpm --filter e2e typecheck` passa;
`git grep -n "new RegExp(\`^\${" apps/e2e/tests` não acha mais rótulo de dicionário sem `escapeRegExp`. O
`pnpm e2e` não muda de resultado, porque os rótulos de hoje não têm metacaractere; roda no job `e2e` do CI.

**Arquivos.**

- `apps/e2e/support/regExp.ts` (novo)
- `apps/e2e/tests/entityCrud.spec.ts`
- `apps/e2e/tests/landing.spec.ts`
- `apps/e2e/tests/panelSwitch.spec.ts`
- `apps/e2e/tests/signIn.spec.ts`
- `apps/e2e/__tests__/regExp.test.ts` (novo)

### Item 6: `start` sem porta na `web` e na `api`

**Procede.** `apps/web/package.json:7` e `apps/api/package.json:9` têm `"start": "next start"`, que sobe na
3000, a porta da `app`. O `dev` fixa 3001 e 3002 (`apps/web/package.json:5`, `apps/api/package.json:5`).
`AUDIT.md:1419` registra a medição (`pnpm --filter web start` subiu na 3000) e a restrição: o CLI do Next lê
`PORT` como default de `-p`, e um `-p 3001` fixo venceria a `PORT` que plataformas como o Cloud Run injetam.

**Correção.** `"start": "next start -p ${PORT:-3001}"` na `web` e `"start": "next start -p ${PORT:-3002}"` na
`api`. Com `PORT` definida, ela vale; sem, cai na porta do `dev`. A expansão `${VAR:-default}` é de shell
POSIX, e os scripts do repo já assumem shell POSIX (`"test": "NODE_ENV=test vitest run"` em todo workspace).
A Vercel não usa o script `start`, e o `pnpm lighthouse` chama `next start -p <porta>` direto
(`apps/e2e/lighthouse/run.mjs:140-143`), então nenhum dos dois muda. A `app` fica como está: o default do Next
já é 3000.

**Aviso de working tree.** `apps/api/package.json` está modificado pela `audit-log-levels` (script
`backfill-audit-levels`, linha 15). A linha 9 deste item fica a 6 linhas daquela; com o contexto padrão de 3
linhas do `git diff`, os dois hunks provavelmente se juntam num só. O `/review` precisa commitar a
`audit-log-levels` antes deste lote, ou preparar só a linha do `start` com um patch aplicado no índice
(`git apply --cached`). Conferir com `git diff --cached` antes do commit, como manda
`.claude/rules/git-commits.md`.

**Teste.** Sem teste Vitest: um teste que lê o `package.json` e compara a string só repetiria o arquivo. A prova
é de execução, no `/test`: com os builds feitos, `pnpm --filter web start` responde em `:3001`,
`PORT=3105 pnpm --filter web start` responde em `:3105`, e o mesmo par para a `api` (`:3002` e `PORT`).

**Critério de aceite.** Os quatro comandos acima sobem cada app na porta esperada, medido com `curl` (a web em
`/pt-br`, a api em `/health`, que responde `200 {"message":"OK"}`).

**Arquivos.**

- `apps/web/package.json`
- `apps/api/package.json` (com o aviso acima)

## 4. Testes do lote e o que o `/test` percorre

Nível mais barato que prova o comportamento, em cada item:

| item | teste | nível |
|------|-------|-------|
| 2 | `apps/web/__tests__/signInForgotPassword.test.tsx` | componente (jsdom), env por `vi.stubEnv` |
| 3 | `packages/auth/__tests__/postAuthRedirectTarget.test.ts` | unidade (node) |
| 5 | `apps/e2e/__tests__/regExp.test.ts` | unidade (node) |
| 6 | nenhum Vitest; medição de porta por `curl` no `/test` | execução |

Nenhum teste novo precisa de emulador.

O `/test` percorre com `agent-browser` só o item 2, que é o único com UI:

- login da landing `/{pt-br,en,es}/sign-in`, com `NEXT_PUBLIC_APP_URL` preenchida (ex.: `http://localhost:3000`):
  o link aparece com a copy do idioma e leva ao `/{locale}/forgot-password` da app;
- a mesma tela com `NEXT_PUBLIC_APP_URL=""`: o link some e o resto não muda;
- light, dark e mobile (390 px) na tela com link.

O item 3 não muda nada visível no fluxo normal. Se der, o `/test` confirma pelo navegador que
`/pt-br/sign-in?redirect=%2Fpt-br%2Faccount%3Ftab%3Dbilling` leva a `/pt-br/account?tab=billing` depois do login.

Rodar as suítes dos workspaces tocados (`web`, `@repo/auth`, `app`, `e2e`) e o `pnpm test` da raiz.

## 5. Ordem de implementação e commits sugeridos

Sem SDK nem API. Um commit por pacote/app, na ordem do repo:

1. `fix(auth): stop decoding the post-auth redirect twice` (`packages/auth/redirect.ts` + o teste movido para
   `packages/auth/__tests__/`; o `git mv` sai de `apps/app`, mas o arquivo pertence ao pacote).
2. `fix(api): default start port to 3002 and honour PORT` (`apps/api/package.json`, ver aviso do item 6).
3. `fix(web): default start port to 3001 and honour PORT` (`apps/web/package.json`).
4. `feat(web): link the landing sign-in to password recovery` (form + teste).
5. `feat(internationalization): add landing sign-in forgot password copy` (a chave nos 3 idiomas).
6. `test(e2e): escape dictionary labels in E2E regular expressions` (helper + specs + teste).
7. `docs(features): small-api-web-fixes`.

A chave de i18n (5) entra antes do form (4) se o `/review` quiser cada commit compilando sozinho; a ordem
acima segue a regra do repo, que põe i18n por último.

Env nova: nenhuma (`NEXT_PUBLIC_APP_URL` já existe na web). Infra: nenhuma.

## 6. Decisões tomadas sem perguntar

| # | decisão adotada | alternativa descartada | por quê |
|---|-----------------|------------------------|---------|
| D1 | Cortar o item 1 | Exportar os outros métodos no `/health` com um código `METHOD_NOT_ALLOWED` | O defeito vale para 57 rotas; corrigir uma replica workaround (política §3) |
| D2 | Adiar o item 4 | Remover agora, com staging parcial | Hunks encostados nos da `audit-log-levels` no mesmo teste; valor baixo |
| D3 | Link da landing aponta para a app via `NEXT_PUBLIC_APP_URL` | Criar `/forgot-password` na landing | Padrão do header e do CTA de preços; tela nova duplicaria o fluxo da app |
| D4 | Sem `NEXT_PUBLIC_APP_URL`, esconder o link | Cair num caminho relativo da landing | A landing não tem rota de recuperação; link quebrado é pior que nenhum |
| D5 | Copy igual à do login da app | Copy própria da landing | Mesmo fluxo, mesmo texto; nada novo a traduzir |
| D6 | Remover a segunda decodificação do guard | Manter e documentar | Todos os chamadores passam valor já decodificado (§3, item 3); a decodificação extra estraga `%26`/`%25` |
| D7 | Mover o teste do guard para `packages/auth/__tests__/` | Duplicar no pacote e manter o da app | Duas cópias do mesmo teste de segurança divergem com o tempo |
| D8 | Helper `escapeRegExp` em `apps/e2e/support/regExp.ts` usado em 5 lugares | Corrigir só o `entityCrud.spec.ts:15` | O mesmo padrão está em 4 specs; corrigir na raiz |
| D9 | Deixar `crossAppSignOut.spec.ts:12-13` sem escape | Escapar também | A `RegExp` ali vem de URL do ambiente, sem risco de falso resultado; mudança mínima |
| D10 | `start` com `-p ${PORT:-3001}`/`${PORT:-3002}` | `-p` fixo, ou script Node para ler `PORT` | `-p` fixo ignora `PORT` (`AUDIT.md:1419`); script Node é estrutura nova para um default |
| D11 | Não mexer no `start` da `app` | Pôr `${PORT:-3000}` por simetria | O default do Next já é 3000; mudança mínima |
| D12 | Item 6 sem teste Vitest, medido por `curl` no `/test` | Teste que lê o `package.json` | Repetiria a string do arquivo sem provar a porta |

## 7. Perguntas em aberto

Nenhuma bloqueia este lote. Ficam para o relatório do `/cycle`:

1. **Item 1: como dar `error.code` ao método não suportado em todas as rotas?** Opções: (a) o `apps/api/proxy.ts`
   responde `405 { error: { code: "METHOD_NOT_ALLOWED" } }` a partir de um mapa rota → métodos; (b) um helper
   que cada `route.ts` usa para exportar os métodos ausentes; (c) não fazer, porque só cliente externo é
   afetado. Recomendação: (c) até um fork expor a API a terceiros, e então (a), que não toca as 57 rotas.
2. **Item 4: reabrir depois do commit da `audit-log-levels`?** Recomendação: sim, como tarefa direta de um
   commit só na `api`.
3. **Ordem de commit com a `audit-log-levels`.** O item 6 toca `apps/api/package.json`, modificado pela outra
   feature. Recomendação: commitar a `audit-log-levels` primeiro e este lote depois, numa branch própria.

## 8. Referências não lidas

Nenhuma. As fontes são o `specs/reference/AUDIT.md` e o código.
