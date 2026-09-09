# Relatório de QA — `api-hardening`

> Etapa `/test` · 2026-09-02 · branch `api-hardening-flow` (não protegida) · **nada commitado, nada em
> stage**. Critérios e roteiro manual em [`criterios-aceite.md`](criterios-aceite.md); prints em
> [`e2e/`](e2e/).

## Veredito

**Liberado para commit, com 2 bloqueios fora do escopo — nenhum deles regressão.** Os **dois achados 🔴
que o `/review` deixou abertos foram fechados**: a *volta* do login com Google (no mecanismo, com
contraprova) e o avatar real do Google (integralmente).

Um passe humano antes do merge: **roteiro M3** (~2 min).

## Gates — medidos, não copiados

| Comando | Resultado |
|---------|-----------|
| `pnpm check` | **404 arquivos · 0 erros / 0 warnings** (era 402 — os 2 arquivos de teste novos) |
| `pnpm turbo run lint typecheck test --force` | **22/22 tasks · 0 cached** |
| `pnpm test` (root — é o que gateia o `turbo build`) | verde |
| `pnpm --filter @repo/internationalization test` | 2 arquivos / 11 testes (paridade pt-br/en/es) |
| `pnpm --filter api build` **sem `CORS_ORIGIN`** | exit 0, zero menção à variável |
| `pnpm --filter app build` | exit 0 |

**Testes: 52 arquivos / 405 → 54 arquivos / 421.** Por workspace: `api` 145 → 152, `app` 146 → 153,
`web` 19 → 22. A baseline informada pelo `/review` foi reconferida e bate.

## Testes criados (+17)

| Arquivo | Testes |
|---------|--------|
| `apps/api/__tests__/corsOrigin.test.ts` | +6 |
| `apps/app/__tests__/securityPolicySources.test.ts` (novo) | 7 |
| `apps/web/__tests__/securityPolicySources.test.ts` (novo) | 3 |

Cobrem as **três lacunas que o `/review` apontou** — `Vary` no 403 e na resposta sem `Origin`,
`Access-Control-Expose-Headers` no 429 real do proxy, e o casamento exato de rota que deixa
`/auth/sign-in/` (com barra final) de fora — mais: `Access-Control-Allow-Credentials` ausente, log de
`rate-limit` sem PII, colapso de `frame-src`/`child-src` em `'none'` quando falta
`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `connect-src` sem entrada vazia, e o gate `startsWith("G-")`
recusando um id `UA-…`.

## Mutações — 18 aplicadas, **18 mortas**

Teste que não morre com a mutação não prova nada. Foram 15 no nível de unidade:

remover o `Expose-Headers` · `buildCorsHeaders(null)` devolvendo `{}` · o 403 pulando o `withCors` ·
`includes` em lugar de `startsWith` · o webhook entrando na lista de rotas limitadas · COOP →
`same-origin` · `frame-src` vazio virando `'self'` · COEP religado · `eval` sempre liberado · qualquer id
de GA alargando a política · a landing bloqueando em vez de reportar · `keys.ts` aceitando qualquer string
· o limitador construindo cliente sem chave · o gate de boot de produção desligado · `localhost` na
allowlist em produção.

E **3 em runtime, com o servidor no ar** — é isso que impede a evidência de e2e de ser decorativa:

| Mutação | Efeito observado |
|---------|------------------|
| COOP → `same-origin` | **`window.opener === null`** no popup, **silenciosamente** |
| `img-src` sem `lh3` | `securitypolicyviolation` com `effectiveDirective: "img-src"` |
| API sem `Expose-Headers` | `response.headers.get("Retry-After")` volta `null`; a lista visível ao script cai para `["content-type"]` |

Todas revertidas; `git diff --stat` do código de produção ficou byte-a-byte idêntico ao que o `/review`
deixou, e os gates foram re-executados com `--force`.

## Critérios de aceite — 31 itens: **30 ✅ · 1 ⚠️ · 0 ❌**

| Bloco | Resultado |
|-------|-----------|
| **A1–A7 — origem/CORS** | 7 ✅. `curl` ao vivo em dev **e** em produção: allowlist ecoada, coringa em lugar nenhum, 403 `AUTH_FORBIDDEN_ORIGIN`, `Vary` nas respostas sem permissão, `Allow-Credentials` nunca enviado, preflight 204 com os headers de contexto de auth |
| **B1–B8 — rate limit** | 8 ✅. `/auth/sign-in/google` levada a 25 POSTs com o limitador desligado: zero 429 (fecha o ⚪ do `/review`). Aviso de boot impresso **uma única vez** |
| **C1–C12 — cabeçalhos/CSP** | 11 ✅ · **C6 ⚠️ parcial** (renovação do ID token — ver bloqueios) |
| **D1–D2 — observabilidade** | 2 ✅ |
| **E1–E4 — cross-check** | 4 ✅ (⚪ preview da Vercel fora) |

## O que o e2e provou

**🔴 A volta do login com Google — provada no mecanismo, não simulada.** Sob o
`same-origin-allow-popups` que a entrega emite: `window.opener !== null` no popup, e um `postMessage`
disparado **de dentro de `accounts.google.com`** *chegou* ao opener em `localhost:3000`
(`origin: "https://accounts.google.com"`). Esse é exatamente o canal pelo qual o Firebase devolve a
credencial. **Contraprova**: sob `same-origin` o opener vira `null` **sem nenhum erro no console** — o que
confirma que o modo de falha é silencioso. O iframe `__/auth/iframe` e o `apis.google.com/js/api.js`
carregam com zero recusa.

**🔴 Avatar real do Google** — foto real de `lh3.googleusercontent.com` renderiza no `ProfileDropdown`
(que usa `<img>` cru, não o otimizador): `naturalWidth: 96, complete: true`, em dev **e** no build de
produção.

**🟡 CSP de produção num browser** — `next build && next start` nos dois apps. A política perde
`'unsafe-eval'` e `va.vercel-scripts.com`; a aplicação hidrata, **11 scripts inline executam**, o tema
troca, o `Table` antd renderiza e as chamadas à API passam pelo CORS. Zero violação.

**🟡 Área admin + impersonação sob CSP bloqueante** — `/admin` e `/admin/users` abrem limpos; `/entities`
impersonado carrega com o aviso de somente-leitura. O log de rede mostra `OPTIONS /users?type=common →
204` seguido de `GET → 200`, **provando que os headers `x-request-*` de impersonação estão em
`Access-Control-Allow-Headers`** — uma entrada a menos ali mataria o painel impersonado inteiro no
preflight.

**🟡 Toast do `AUTH_RATE_LIMITED` na tela, nos 3 idiomas** — 429 forçado pelo caminho **real** do proxy
(harness temporário, revertido); toast visto em pt-br/en/es. E o `Retry-After: 12` foi **lido por script
cross-origin** (`headersVisibleToScript: ["content-type", "retry-after"]`).

**Console limpo**: 13 telas, light + dark, desktop + 390×844, pt-br/en/es — **zero `Refused to …`**. A
landing em Report-Only reportou **zero violações**, ou seja, a política está calibrada para ser promovida
a bloqueante.

19 screenshots em [`e2e/`](e2e/), com PII borrada (avatares e coluna de e-mail); só
`qa-…@example.com` sintético fica legível.

## Bloqueios

| # | Item | Por que | Onde está o passo |
|---|------|---------|-------------------|
| 1 | 🔴 **Login Google com conta real até a sessão iniciar** | Não há conta Google utilizável neste ambiente — e não foi fingido. Mecanismo provado, quebra reproduzida; a **entrega da credencial** não foi exercitada | Roteiro **M3**, ~2 min. **Antes do merge** |
| 2 | ⚠️ **C6 — renovação do ID token após ~1h** | A sessão precisaria ficar viva por mais de uma hora. `securetoken.googleapis.com` **está** no `connect-src` emitido e tem teste de unidade | Roteiro **M4**. Quebra diferida: se falhar, a sessão de todo usuário morre 1h após o login |
| 3 | ⚪ 429 ao vivo com chave Arcjet | `ARCJET_KEY` está vazia neste `.env`. O `/develop` já mediu 20 passam / 21ª bloqueia com chave real; aqui está coberto por unidade + um 429 pelo caminho real do proxy | — |
| 4 | ⚪ Preview deploy da Vercel | Exige ambiente hospedado | Roteiro **M7** |

## Achado novo (não bloqueia)

**O gate de produção do `CORS_ORIGIN` não derruba o processo.** Com `NODE_ENV=production` e a variável
ausente, o `register()` lança, o Next imprime `Failed to prepare server: … CORS_ORIGIN is required in
production…` e **o processo continua no ar respondendo 500 a tudo**. A intenção é cumprida (nada é
servido), mas uma plataforma que só faz ping na porta consideraria o contêiner saudável, e o alarme chega
pelo erro do usuário. Ou o health check aprende a distinguir 5xx, ou o gate chama `process.exit(1)`.

## Follow-ups

1. O comportamento de 500 do gate de boot, acima.
2. **Um `useList*` que falha renderiza o estado vazio, não erro** — um 429 na lista de entidades mostra
   "Nenhuma entidade cadastrada", indistinguível de lista vazia. **Pré-existente**, não deste diff.
3. `img-src` precisa de `lh3.googleusercontent.com` **só** por causa do `ProfileDropdown`; a lista do
   admin serve a mesma foto via `/_next/image`, same-origin, já coberta por `'self'`.
4. `skipValidation: true` no `apps/web/env.ts` segue de pé (D-C do review): o bloco `client` *parece*
   validar e não valida.

## Estado do ambiente de dev

Conta de QA `qa-test-api-hardening@example.com` criada pelo fluxo real de cadastro, promovida a admin,
com `photoURL` do Google, e depois **apagada** (usuário do Auth + perfil no Firestore; nenhuma entidade
sobrou). Todas as 18 mutações revertidas. Todos os servidores parados.

**Limpeza ainda pendente após o merge** (soma-se à D-F do `/review`): `qa-api-hardening@example.com` (do
`/develop`) e `review-api-hardening@example.com` (do `/review`) — Firebase Console → Authentication + o
documento em `user` no Firestore.
