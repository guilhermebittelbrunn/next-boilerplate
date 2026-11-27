# Revisão: guard de redirect recusa barra dupla no caminho resolvido

Rodada autônoma do `/cycle`, sem o usuário acompanhando. Escopo: o hunk de `packages/auth/redirect.ts:39-45`
e as linhas 94-119 de `packages/auth/__tests__/postAuthRedirectTarget.test.ts`. Os outros hunks desses dois
arquivos são da `small-api-web-fixes`, já revisada e testada, e não foram revistos aqui.

## Branch

`feat/audit-log-levels`, reutilizada por pedido do usuário. Não criei nem troquei branch. O nome passa no
regex de `.claude/rules/git-commits.md` (forma sem projeto, aceita para mudança em vários apps). O nome não
descreve esta tarefa: é a branch do lote noturno que o usuário escolheu, e o título de PR resolve isso.

## Revisão: `packages/auth/redirect.ts:39-45` e teste

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- O índice não está vazio. `git diff --cached --stat` mostra dois renames já preparados por outra tarefa
  (`specs/features/admin-own-account.md` e `specs/features/app-form-layout-centered.md` para
  `docs/features/<slug>/spec.md`). Não são desta tarefa nem da `small-api-web-fixes`. Qualquer
  `git commit` de `fix(auth)` feito com esse índice leva os dois renames junto. O plano de commits abaixo
  exige o índice vazio antes de começar.

### 🟢 Sugestão / nit

- `packages/auth/redirect.ts:36`, anterior a esta tarefa: `/pt-br?tab=billing` (home do idioma com query,
  sem a barra final) cai no fallback, porque `isLocalePrefixed` exige `/pt-br` exato ou `/pt-br/`. O proxy
  grava `${pathname}${search}` (`apps/app/proxy.ts:267`), então um deep link para a home com query perde a
  query no retorno do login. `/pt-br/?tab=billing` passa. O fallback é a mesma home, então o efeito é só a
  query perdida. Fica como observação de backlog; não mexi.
- O `for` do teste novo (linhas 95-104) para na primeira asserção que falha, então uma regressão mostra só
  uma das seis entradas. O handoff já notou isso e mediu as seis com o guard mutado. O arquivo usa o mesmo
  padrão em outros `it` (30-44, 129-142); não troquei por `it.each`.

### ✅ OK

- A checagem nova roda sobre `new URL(path, PLACEHOLDER_ORIGIN).pathname` (`redirect.ts:42-43`), que exclui
  query e hash. `//` em query ou hash continua recusado só pela checagem do valor bruto na linha 33, que já
  existia.
- O conjunto aceito depois da mudança é subconjunto do anterior: a condição só entra com `&&` no retorno.
  Ela só recusa entradas novas quando o valor bruto não tem `//` e o caminho resolvido tem. Isso exige `\`,
  tab, LF ou CR literal no caminho. Remontagem de pontos (`..`, `%2e`) não cria segmento vazio onde não
  havia.
- Destinos legítimos conferidos com uma réplica do guard em Node 22 (mesma lógica de `redirect.ts:26-45`),
  todos aceitos e devolvidos sem alteração: `/pt-br/entities/abc?x=1`, `/en/admin/users/123/edit`,
  `/en/invite?token=ab%2F%2Fc`, `/pt-br/search?q=a\b` (`\` na query não vira `/`), `/pt-br/x#a\b`,
  `/pt-br/%5C`, `/pt-br/a/`, `/pt-br/./`,
  `/pt-br/onboarding?redirect=%2Fpt-br%2Fentities`. As seis entradas de recusa do teste caem no fallback.
- Os destinos que o próprio app grava vêm de `request.nextUrl` (`apps/app/proxy.ts:267`,
  `packages/auth/middleware.ts:48`), já parseados pelo navegador e pelo Next, que convertem `\` em `/` e
  removem tab e quebra de linha. Nenhum destino gerado pelo app chega com esses caracteres no caminho.
- Chamadores lidos, nenhum alterado (`git status` limpo nos cinco arquivos). Cada um trata a recusa com o
  fallback que já usava para qualquer outra entrada inválida:

  | chamador | fallback |
  |----------|----------|
  | `apps/app/proxy.ts:280-283` | `/${currentLocale}`; o layout `(common)` encaminha admin |
  | `apps/app/shared/lib/postLoginNavigation.ts:125` | `args.fallbackPath` |
  | `packages/auth/provider.tsx:94` (`expiredSessionOrigin`) | `window.location.pathname`; se for o sign-in, vira `null` (linha 96) |
  | `packages/auth/provider.tsx:159` (`resolvePostLoginPath`) | `getRedirectPath?.() ?? /${locale}` |
  | `apps/app/shared/lib/authRedirectLink.ts:8` (`withRedirectQuery`) | `""`: o link sai sem `?redirect=` |
  | `apps/app/shared/lib/onboarding.ts:90` (`resolveOnboardingDestination`) | `/${locale}`; `buildOnboardingPath` devolve o onboarding sem `?redirect=` quando o destino é a home |

- O comentário de `redirect.ts:39-41` explica o porquê (comportamento do parser WHATWG e o risco de o `//`
  virar host) e não cita artefato do fluxo, conforme `.claude/rules/code-comments.md`.
- Afirmações do handoff confirmadas por leitura: as 6 recusas e os 2 aceitos sem `//` resolvido batem com a
  réplica; o desvio (recusas num `it` novo, `it` antigo intacto) está como descrito; as linhas 94-120 são o
  único acréscimo desta tarefa no teste (`sed '94,120d'` sobre o arquivo atual é idêntico à cópia pré-tarefa
  que o `/develop` guardou).

### 👁 Verificar no `/test`

- `pnpm --filter @repo/auth test` com o guard real: 219 testes, 18 no `postAuthRedirectTarget.test.ts`.
  Repro: rodar o comando e conferir os três `it` novos.
- O mutante do handoff: tirar `&& !resolvedPath.includes("//")` deve derrubar o
  `it("rejects a path the URL parser resolves to a double slash")`. O handoff mediu; não remedi.
- `pnpm test` da raiz, que o `/develop` não rodou. A tarefa não toca a API; não se espera efeito.
- Opcional, só se o app já estiver de pé por outro motivo: `/pt-br/sign-in?redirect=%2Fpt-br%2F%5Cevil.com`,
  entrar e conferir que a navegação termina em `/pt-br`. Diff sem superfície visual: não justifica subir
  browser só para isso.

## Correções aplicadas

Nenhuma. Não editei código.

## Raio de impacto

`postAuthRedirectTarget` (`@repo/auth/redirect`) tem os seis consumidores da tabela acima, em `apps/app` e
`packages/auth`. `apps/web` não importa o guard. Nenhuma assinatura, DTO, rota, chave de i18n ou `error.code`
muda.

## Lacunas de teste

| lacuna (do handoff) | veredito |
|---------------------|----------|
| Nenhum teste de chamador usa as entradas novas | continua aberta, e não precisa fechar: os chamadores delegam à função, e a regra está coberta no teste de unidade do guard |

## Decisões em aberto

1. Forma de commitar (dois arquivos misturados com a `small-api-web-fixes`). Recomendação: opção A abaixo,
   um commit só.
2. `/pt-br?tab=...` cai no fallback (🟢 acima). Recomendação: registrar no backlog, fora desta tarefa.

## Gates

| gate | comando | resultado |
|------|---------|-----------|
| lint | `pnpm check` | 1175 arquivos, nenhuma correção |
| typecheck | `pnpm turbo run typecheck --filter=@repo/auth --filter=app` | 2/2 sem erro (1 do cache) |
| i18n | não se aplica | nenhuma chave tocada |

Varredura de segredo em `docs/features/redirect-double-slash-guard/`: nenhuma senha, token, chave ou e-mail
real. Os domínios que aparecem são `evil.com` e `x.com`, entradas de teste.

## Plano de commits

### Pré-condição

O índice tem dois renames de outra tarefa. Antes de qualquer commit abaixo, `git diff --cached --stat` tem de
sair vazio, seja porque os renames já foram commitados no commit próprio deles (`docs(specs)`), seja porque
alguém os tirou do índice de propósito. Se a saída não estiver vazia, pare.

Ordem: estes commits entram no lugar do commit 1 do plano da `small-api-web-fixes`
(`fix(auth): stop decoding the post-auth redirect twice`), depois dos commits das outras três tarefas, como
aquele plano já pedia.

### Opção A, recomendada: um commit `fix(auth)` para as duas mudanças do guard

É a mais simples e a mais segura. Não usa `git add -p` e não depende de arquivo temporário. As duas mudanças
são do mesmo guard, no mesmo pacote, e as duas foram revisadas e testadas. Separar exigiria `git add -p` no
`redirect.ts` e montar à mão a versão intermediária do teste, que está untracked. A política do `/cycle`
(§6) aceita commit misto nesse caso, com o porquê na mensagem.

Passo 1. Conferir que o índice está vazio:

```bash
git diff --cached --stat
```

Saída esperada: nada.

Passo 2. Preparar os três caminhos (o terceiro é a remoção do teste antigo; com os dois, o git registra o
rename):

```bash
git add packages/auth/redirect.ts \
  packages/auth/__tests__/postAuthRedirectTarget.test.ts \
  apps/app/__tests__/postAuthRedirectTarget.test.ts
```

Passo 3. Conferir o índice:

```bash
git diff --cached --stat
git diff --cached -M packages/auth/redirect.ts
```

Esperado: exatamente três entradas. `apps/app/__tests__/postAuthRedirectTarget.test.ts` aparece como rename
para `packages/auth/__tests__/postAuthRedirectTarget.test.ts`, e `packages/auth/redirect.ts` tem os três
hunks (docstring, remoção do `decodeURIComponent`, condição `!resolvedPath.includes("//")`). Qualquer outro
arquivo na lista: pare e tire-o com `git restore --staged <arquivo>`.

Passo 4. Commitar:

```bash
git commit -F - <<'EOF'
fix(auth): harden the post-auth redirect guard

Stop decoding the redirect a second time: callers pass the value already
decoded by URLSearchParams.get, so decoding again corrupted encoded %26 or
%25 in the destination query and threw on a stray %.

Reject destinations whose resolved pathname contains a double slash. The
URL parser reads a backslash as a slash and drops tab, CR and LF, so values
like /pt-br/\evil.com had no // in the raw string but resolved to one.

The guard test moves from apps/app to packages/auth so the package suite
covers it.

Both changes touch the same lines of redirect.ts and the same untracked test
file; they ship together because splitting them would need a hand-built
intermediate version of the test.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

Passo 5. Conferir o commit:

```bash
git show --stat --oneline HEAD
```

Esperado: os mesmos três caminhos do passo 3 e nenhum outro.

### Opção B: dois commits (só se a separação for exigida)

Funciona sem editor interativo, mas tem mais passos e cada um precisa de conferência.

Passo 1. `git diff --cached --stat` vazio, como na opção A.

Passo 2. Preparar só os dois primeiros hunks do `redirect.ts`. O `git diff` mostra três hunks nesta ordem:
docstring, remoção do `decodeURIComponent`, condição nova. As respostas são `y`, `y`, `n`:

```bash
printf 'y\ny\nn\n' | git add -p packages/auth/redirect.ts
```

Passo 3. Preparar o teste sem as linhas 94-120 (as desta tarefa) e a remoção do teste antigo. As linhas
valem para o arquivo como está agora; se ele mudou, recalcule antes:

```bash
SHA=$(sed '94,120d' packages/auth/__tests__/postAuthRedirectTarget.test.ts | git hash-object -w --stdin)
git update-index --add --cacheinfo "100644,$SHA,packages/auth/__tests__/postAuthRedirectTarget.test.ts"
git add apps/app/__tests__/postAuthRedirectTarget.test.ts
```

Passo 4. Conferir:

```bash
git diff --cached -M --stat
git diff --cached packages/auth/redirect.ts | grep -c 'resolvedPath.includes'
git show :packages/auth/__tests__/postAuthRedirectTarget.test.ts | grep -c 'resolves to a double slash'
```

Esperado: três caminhos (com o rename); as duas contagens `0`. Contagem diferente de `0`: pare e refaça com
`git restore --staged packages/auth/redirect.ts packages/auth/__tests__/postAuthRedirectTarget.test.ts apps/app/__tests__/postAuthRedirectTarget.test.ts`.

Passo 5. Commit 1, com a mensagem do plano da `small-api-web-fixes`:

```bash
git commit -m "fix(auth): stop decoding the post-auth redirect twice" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git show --stat --oneline HEAD
```

Passo 6. Preparar o restante e conferir:

```bash
git add packages/auth/redirect.ts packages/auth/__tests__/postAuthRedirectTarget.test.ts
git diff --cached --stat
git diff --cached
```

Esperado: os dois arquivos; no `redirect.ts`, só o comentário das linhas 39-41 e a condição das linhas 43-45;
no teste, só as linhas 94-120 adicionadas.

Passo 7. Commit 2:

```bash
git commit -m "fix(auth): reject redirect paths that resolve to a double slash" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git show --stat --oneline HEAD
```

### Artefatos (último commit, nas duas opções)

```bash
git diff --cached --stat
git add docs/features/redirect-double-slash-guard/
git diff --cached --stat
git commit -m "docs(features): redirect-double-slash-guard" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git show --stat --oneline HEAD
```

O primeiro `git diff --cached --stat` tem de sair vazio; o segundo, só com arquivos de
`docs/features/redirect-double-slash-guard/`.

Título de PR sugerido, se esta tarefa subir sozinha: `fix(auth): reject redirect paths that resolve to a double slash`.
No lote, vale o título do lote.

Commits realizados: _(preenchido pelo `/review`)_
