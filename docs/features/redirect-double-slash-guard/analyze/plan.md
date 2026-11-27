# Plano: guard de redirect recusa `//` no caminho resolvido

Tarefa direta, sem spec. Origem: achado 🟢 de `docs/features/small-api-web-fixes/review/review.md:33-37` e
item "continua aberta" de `docs/features/small-api-web-fixes/test/report.md:206`. Plano feito em rodada
autônoma do `/cycle`; as decisões estão na §11 com a alternativa descartada.

Estado de partida: o working tree já contém a mudança da `small-api-web-fixes` em `packages/auth/redirect.ts`
(sem a segunda decodificação) e o teste em `packages/auth/__tests__/postAuthRedirectTarget.test.ts`. Este
plano parte desse estado, ainda não commitado.

## 1. Contexto, objetivo e corte

`postAuthRedirectTarget` (`packages/auth/redirect.ts:22-43`) é o guard de open redirect de todo destino
pós-login. Ele faz quatro checagens sobre o valor bruto e uma sobre o caminho resolvido:

| linha | checagem | sobre |
|-------|----------|-------|
| 30 | começa com `/` e não com `//` | valor bruto inteiro |
| 33 | não contém `//` | valor bruto inteiro (inclui query e hash) |
| 36 | prefixo `/<locale>` | valor bruto |
| 41-42 | prefixo `/<locale>` | `pathname` de `new URL(path, PLACEHOLDER_ORIGIN)` |

O parser WHATWG remove tab, LF e CR literais e lê `\` como `/`. Por isso entradas sem `//` no valor bruto
ganham `//` depois de resolvidas e passam. Medi com uma réplica do guard em Node 22:

| entrada (literal JS) | `pathname` resolvido | guard atual |
|----------------------|----------------------|-------------|
| `"/pt-br/\t/evil.com"` | `/pt-br//evil.com` | aceita |
| `"/pt-br/\n/evil.com"` | `/pt-br//evil.com` | aceita |
| `"/pt-br/\r/evil.com"` | `/pt-br//evil.com` | aceita |
| `"/pt-br/\\evil.com"` | `/pt-br//evil.com` | aceita |
| `"/pt-br/\\/evil.com"` | `/pt-br///evil.com` | aceita |
| `"/pt-br/x/\\y"` | `/pt-br/x//y` | aceita |

Nenhuma delas sai da origem: o prefixo `/<locale>/` exigido na linha 42 impede que o resultado comece com
`//host` (a revisão da `small-api-web-fixes` mediu isso, `review.md:104-118`). O problema é de coerência e
de robustez. O teste `"rejects a path smuggling a double slash"` (`postAuthRedirectTarget.test.ts:88-92`)
promete uma regra que o guard só cumpre para o `//` literal, e qualquer normalização futura que colapse ou
corte segmentos vazios (ou um destino que use o caminho como base de outra URL) transforma esse `//` em
autoridade.

**Objetivo:** o guard recusa todo destino cujo `pathname` resolvido contém `//`, para que a regra da linha 33
valha também depois da normalização do parser.

**Corte de MVP:** uma condição a mais na linha 42 e casos de teste. Sem mudança de assinatura, de chamador,
de fallback, de SDK, de API, de i18n ou de UI.

**Fora de escopo:**

- A linha 33 continua checando o valor bruto inteiro, então um destino legítimo com `//` na query
  (`/pt-br/search?next=https://x.com`) ou no hash cai no fallback hoje. Medi que nenhuma rota da `apps/app`
  carrega URL em query param (busca por `returnUrl|callbackUrl|continueUrl|next=` e por `http(s)://` em
  query em `apps/app`, sem resultado). Restringir a linha 33 ao pathname alargaria o que o guard aceita;
  fica registrado na §12 como observação, não entra aqui.
- Recusar `%2F`, `%5C`, `%09` codificados. A revisão anterior mediu que ficam na mesma origem e o teste
  `postAuthRedirectTarget.test.ts:30-44` fixa que são aceitos. Continua assim.

**Apps impactados:** `packages/auth` (código e teste). Os chamadores em `apps/app` e `packages/auth` herdam o
comportamento sem edição. Modo de produto, plano e área do painel: N/A.

## 2-5. Dados, contrato, API, front

N/A. Nenhuma coleção, DTO, rota, tela ou chave de tradução muda.

### Chamadores e o fallback que recebem

Todos passam o valor já decodificado uma vez (confirmado na revisão anterior e relido aqui). Uma entrada que
passa a ser recusada leva cada um para o seu fallback:

| chamador | origem do valor | fallback |
|----------|-----------------|----------|
| `apps/app/proxy.ts:280-283` | `request.nextUrl.searchParams.get("redirect")` na página pública com sessão | `/${currentLocale}` (home comum; o layout encaminha admin) |
| `apps/app/shared/lib/postLoginNavigation.ts:122-125` | `URLSearchParams(window.location.search).get("redirect")` | `args.fallbackPath` |
| `packages/auth/provider.tsx:92-94` (`expiredSessionOrigin`) | `?redirect=` da URL atual | `pathname` atual (que, se for o sign-in, vira `null`, linha 96) |
| `packages/auth/provider.tsx:157-159` (`resolvePostLoginPath`) | `?redirect=` da URL atual | `getRedirectPath?.() ?? /${locale}` |
| `apps/app/shared/lib/authRedirectLink.ts:8` (`withRedirectQuery`) | prop `redirect` do `searchParams` da página; usado em `SignInForm.tsx:194`, `SignUpFormClient.tsx:214`, `InvitationAcceptance.tsx:56-57` | `""`: o link sai sem `?redirect=` |
| `apps/app/shared/lib/onboarding.ts:90` (`resolveOnboardingDestination`) | `onboarding/page.tsx:40` (`searchParams.redirect`) e `buildOnboardingPath` (`onboarding.ts:99`, chamado por `lib/server/onboarding.ts:40` com o `x-app-path` do proxy) | `/${locale}` |

Quem grava o `?redirect=`: `apps/app/proxy.ts:267` (`${pathname}${search}` de `request.nextUrl`) e
`packages/auth/middleware.ts:48` (só `pathname`). O `pathname` de `request.nextUrl` vem de uma URL já
parseada pelo navegador e pelo Next, que convertem `\` em `/` e removem tab e quebra de linha antes de a
requisição chegar. Por isso um destino gerado pelo próprio app nunca tem `\`, tab ou CR/LF literal no
caminho. A regra nova só recusa valor montado à mão na query.

`InvitationAcceptance.tsx:53-55` monta `/${locale}/invite?token=${encodeURIComponent(token)}`: o token vai
codificado e está na query, então não é afetado.

### Destinos legítimos com `//`

Nenhum. O `//` literal no valor bruto já é recusado pela linha 33 desde antes. A checagem nova olha só o
`pathname` (`new URL(...).pathname` exclui query e hash), então `//` em query ou hash não pesa nela. O único
`pathname` legítimo que poderia ter `//` seria um com segmento vazio, e o app não tem rota assim.

## 6. Autorização e segurança

A mudança só restringe: o conjunto de entradas aceitas depois dela é subconjunto estrito do atual. Não há
caminho de impersonação, guard de API ou dado envolvido.

## 7. Testes

Nível: unidade, em `packages/auth/__tests__/postAuthRedirectTarget.test.ts`, que já é o teste do guard. Não
precisa de emulador nem de app de pé: o objeto é uma função pura.

Casos que passam a cair no fallback (adicionados ao `it("rejects a path smuggling a double slash")`,
linhas 88-92):

| entrada (literal TS) | por quê |
|----------------------|---------|
| `"/pt-br/\t/evil.com"` | tab removido vira `//` |
| `"/pt-br/\n/evil.com"` | LF removido vira `//` |
| `"/pt-br/\r/evil.com"` | CR removido vira `//` |
| `"/pt-br/\\evil.com"` | `\` lido como `/` |
| `"/pt-br/\\/evil.com"` | `\/` vira `//` (pathname `/pt-br///evil.com`) |
| `"/pt-br/x/\\y"` | `//` no meio, depois do primeiro segmento |
| `"/pt-br//evil.com"` | já existia; continua |

Casos que continuam aceitos e já estão cobertos (não mexer): `"/pt-br/entities"`, `"/en/admin/users"`, `"/es"`
(linhas 11-19); `%2F%2F`, `%5C%5C`, `%09`, `..%2F` codificados com origem preservada (30-44); query com
`%26`, `%25` e `%` solto (46-56); `"/pt-br/x/../entities"` e `"/pt-br/../en/entities"` (124-131); query de deep
link (133-140).

Casos que continuam aceitos e ganham asserção nova (num `it` próprio, para fixar que a regra é sobre o
pathname):

| entrada | esperado |
|---------|----------|
| `"/pt-br/"` | igual à entrada |
| `"/pt-br/x\t/y"` | igual à entrada (resolve para `/pt-br/x/y`, sem `//`) |

Casos que continuam no fallback pela linha 33 (pré-existente) e ganham asserção para documentar o limite
conhecido: `"/pt-br/search?next=https://x.com"` e `"/pt-br/a#//x"`. Se alguém decidir mais tarde liberar
`//` em query, esse teste é o que muda, de propósito.

Também conferir que nada fora do pacote depende de aceitar `\`, tab ou CR/LF: busquei esses literais em
`apps/app/__tests__/{authRedirectLink,onboardingRedirect,onboardingState,postLoginPreferences,useSignedInRedirect}`
e não há. As únicas ocorrências estão nas linhas 107-108 do próprio teste, já esperando fallback.

Mutante a rodar no `/develop`: tirar `&& !resolvedPath.includes("//")` deve derrubar os 6 casos novos de
recusa.

## 8. O que o `/test` percorre

Diff sem superfície visual: não sobe browser. O `/test` roda `pnpm --filter @repo/auth test` e o `pnpm test`
da raiz (gate do build). Opcional, se o app já estiver de pé por outro motivo: abrir
`/pt-br/sign-in?redirect=%2Fpt-br%2F%5Cevil.com`, entrar e confirmar que cai em `/pt-br` (o `%5C` aqui é a
codificação de transporte: o `searchParams.get` devolve `\` literal).

## 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Caminho que resolve com barra dupla cai no fallback**
  `postAuthRedirectTarget` devolve o fallback para `"/pt-br/\t/evil.com"`, `"/pt-br/\n/evil.com"`,
  `"/pt-br/\r/evil.com"`, `"/pt-br/\\evil.com"`, `"/pt-br/\\/evil.com"` e `"/pt-br/x/\\y"`. Em todos, o valor
  bruto não tem `//`, mas o `pathname` resolvido pelo parser WHATWG tem. O caso literal `"/pt-br//evil.com"`
  continua recusado.

- [ ] **Destino legítimo continua aceito sem alteração**
  Caminhos com prefixo de idioma, com segmentos de ponto que ficam dentro de um idioma, com query (inclusive
  `%26`, `%25` e `%` solto) e com `%2F`, `%5C`, `%09` codificados continuam devolvidos exatamente como
  entraram. `"/pt-br/"` e `"/pt-br/x\t/y"` também são aceitos, porque o caminho resolvido não tem `//`.

- [ ] **A regra nova olha só o pathname**
  A checagem acrescentada usa `new URL(...).pathname`, que exclui query e hash. `//` em query ou hash
  continua caindo no fallback pela checagem pré-existente sobre o valor bruto (linha 33), comportamento que
  esta tarefa não altera e que o teste passa a documentar.

- [ ] **Chamadores inalterados**
  Nenhum arquivo fora de `packages/auth/redirect.ts` e do teste muda. Cada chamador da tabela da §2-5 recebe
  o mesmo fallback que já recebia para qualquer outra entrada recusada; `withRedirectQuery` gera o link sem
  `?redirect=`.

- [ ] **Suíte e gates verdes**
  `pnpm --filter @repo/auth test`, `pnpm --filter @repo/auth typecheck` e `pnpm check` passam. O mutante que
  remove a condição nova faz falhar os casos de recusa novos.

## 10. Blueprint (Etapa 2)

### Arquivos

| arquivo | mudança |
|---------|---------|
| `packages/auth/redirect.ts` | condição a mais na linha 42; comentário das linhas 39-40 ampliado |
| `packages/auth/__tests__/postAuthRedirectTarget.test.ts` | casos novos no `it` da linha 88 e dois `it` novos |

### Pseudo-diff, `packages/auth/redirect.ts`

```diff
-    // The URL parser reads `\` as `/` and resolves `..`, so `/pt-br/../\evil.com` passes the
-    // checks above and still parses to `//evil.com`, which leaves the host once made relative.
+    // The URL parser reads `\` as `/`, drops tab and newline characters and resolves `..`, so
+    // `/pt-br/../\evil.com` or `/pt-br/\t/evil.com` pass the checks above and still parse to a
+    // path with `//`, which turns into a host as soon as anything collapses the locale segment.
     const resolvedPath = new URL(path, PLACEHOLDER_ORIGIN).pathname;
-    return isLocalePrefixed(resolvedPath) ? path : fallback;
+    return isLocalePrefixed(resolvedPath) && !resolvedPath.includes("//")
+        ? path
+        : fallback;
```

O JSDoc (linhas 11-21) não muda: já diz que só caminhos de mesma origem com prefixo de idioma passam.

### Pseudo-diff, teste

```diff
     it("rejects a path smuggling a double slash", () => {
-        expect(postAuthRedirectTarget("/pt-br//evil.com", FALLBACK)).toBe(
-            FALLBACK
-        );
+        for (const target of [
+            "/pt-br//evil.com",
+            "/pt-br/\t/evil.com",
+            "/pt-br/\n/evil.com",
+            "/pt-br/\r/evil.com",
+            "/pt-br/\\evil.com",
+            "/pt-br/\\/evil.com",
+            "/pt-br/x/\\y",
+        ]) {
+            expect(postAuthRedirectTarget(target, FALLBACK)).toBe(FALLBACK);
+        }
     });
+
+    it("accepts a path that resolves without a double slash", () => {
+        expect(postAuthRedirectTarget("/pt-br/", FALLBACK)).toBe("/pt-br/");
+        expect(postAuthRedirectTarget("/pt-br/x\t/y", FALLBACK)).toBe("/pt-br/x\t/y");
+    });
+
+    it("falls back when the query or hash carries a double slash", () => {
+        expect(
+            postAuthRedirectTarget("/pt-br/search?next=https://x.com", FALLBACK)
+        ).toBe(FALLBACK);
+        expect(postAuthRedirectTarget("/pt-br/a#//x", FALLBACK)).toBe(FALLBACK);
+    });
```

A formatação final fica com o Biome (`pnpm fix`).

### Ordem e commit

Um commit, depois dos commits da `small-api-web-fixes` (que tocam os mesmos dois arquivos):

1. `fix(auth): reject redirect paths that resolve to a double slash`
   - `packages/auth/redirect.ts`
   - `packages/auth/__tests__/postAuthRedirectTarget.test.ts`
2. `docs(features): redirect-double-slash-guard`

Os dois arquivos já estão modificados no working tree pela outra tarefa. Se ela ainda não tiver sido
commitada quando esta for, os hunks se misturam no mesmo arquivo: commitar a `small-api-web-fixes` primeiro
ou separar com `git add -p` e conferir `git diff --cached` antes de cada commit.

Env nova, dependência nova, infra: nenhuma.

## 11. Decisões tomadas sem perguntar

| decisão | alternativa descartada | motivo |
|---------|------------------------|--------|
| Checar `//` no `pathname` resolvido, junto da checagem de prefixo da linha 42 | Remover tab/CR/LF e `\` do valor antes das checagens | a sugestão do revisor é uma condição; normalizar o valor mudaria o que o guard devolve |
| Manter a linha 33 sobre o valor bruto | Trocar a linha 33 pela checagem no pathname | trocar liberaria `//` em query e hash e `/pt-br//../entities`; mais raio de impacto e nenhum destino do app precisa disso |
| Devolver o valor bruto, como hoje | Devolver o `resolvedPath` | os destinos finais já resolvem com o parser WHATWG; mudar o retorno afetaria os 6 chamadores e os testes de query |
| Teste só de unidade | Teste E2E | função pura; o navegador não acrescenta prova |

## 12. Perguntas em aberto

Nenhuma bloqueia a implementação.

1. **`//` em query ou hash.** A linha 33 recusa hoje `/pt-br/search?next=https://x.com`. Nenhuma rota do app
   usa URL em query, então não há perda medida. Recomendação: manter; se um fork precisar, restringir a
   linha 33 ao pathname em tarefa própria, com o teste da §7 mudando junto.

## Referências não lidas

Nenhuma.
