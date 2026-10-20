# Handoff do develop: contrato de erro de `POST /auth/sign-in/google`

Implementação de `analyze/plan.md` (§10). Só `apps/api` mudou: um schema, uma rota e um arquivo de teste
novo. Nada em `packages/sdk`, `apps/app`, `apps/web` ou `packages/internationalization`. Nenhuma env nova e
nenhum pré-requisito de infraestrutura.

## Blueprint → arquivos

| item | arquivos |
|------|----------|
| 10.1 `googleSignInSchema`, `GoogleSignInInput` e `parseGoogleSignIn` | `apps/api/(shared)/validation/auth.schema.ts` (constantes `GOOGLE_ID_TOKEN_MAX = 4096` e `REQUEST_URI_MAX = 2048`, schema logo depois do `signInSchema`) |
| 10.2 rota no molde do `/auth/sign-in` | `apps/api/app/(routes)/auth/sign-in/google/route.ts` (reescrita igual ao pseudo-código da §10.2) |
| 10.4 e 7.1, casos GC1 a GC14 | `apps/api/__tests__/authSignInGoogleRoute.test.ts` (novo, 21 testes) |
| 10.5 i18n | nada |
| 10.6 documentação | nada |

Como os 21 testes cobrem a §7.1:

| caso do plano | testes |
|---------------|--------|
| GC1 a GC5 | um `it.each` de 8 linhas: sem corpo, JSON inválido, `{}`, `idToken` vazio, numérico, com 4097 caracteres, `requestUri` que não é URL e `requestUri` acima de 2048 |
| GC6 | corpo só com `idToken` chega ao provedor com `http://localhost:3000` |
| GC7 | `it.each` com `https://app.example.com` e `http://localhost` (os dois formatos que a app manda) |
| extra | chave fora do schema é ignorada (CA2) |
| GC8 | `USER_DISABLED`: 400 `AUTH_INVALID_CREDENTIALS`, corpo sem a string, `getMergedUserByUid` não chamado |
| GC9, GC10 e a resposta sem `idToken` | `it.each` com `INVALID_IDP_RESPONSE : ...`, `Invalid response from identity provider` e a mensagem de chave ausente; o corpo não contém a mensagem nem `FIREBASE_WEB_API_KEY` |
| GC11 | `it.each` com `TOO_MANY_ATTEMPTS_TRY_LATER` e `TOO_MANY_REQUESTS` |
| GC12 | `Error("network down")` propaga |
| GC13 | 404 `USERS_NOT_FOUND` |
| GC14 | 200 `{ session, user }` |

## Contrato

Sem mudança de DTO nem de action no SDK. `GoogleSignInRequest` (`packages/sdk/src/actions/auth/action.ts`)
continua descrevendo um corpo que o schema aceita.

Para quem chama a API direto, a recusa do provedor passa de `401 { "error": "<mensagem>" }` para
`400 { error: { code: "AUTH_INVALID_CREDENTIALS" } }` ou `429 { error: { code: "USERS_AUTH_RATE_LIMITED" } }`.
Corpo vazio, JSON inválido ou campo fora do schema passam de 500 (ou chamada ao provedor com `undefined`) para
`400 VALIDATION_FAILED`. Consumidor no repositório: `apps/app/shared/lib/googleSignInApi.ts`, que já trata
qualquer resposta de erro como exceção e lê `error.code` pelo `FormattedError`.

A falta de `FIREBASE_WEB_API_KEY` fora do emulador segue o caminho que o plano definiu: `getWebApiKey` lança
`IdentityToolkitError`, a rota responde 400 `AUTH_INVALID_CREDENTIALS` e o nome da variável não aparece na
resposta. Não vira 500.

## Códigos de erro novos

Nenhum. `VALIDATION_FAILED`, `AUTH_INVALID_CREDENTIALS` e `USERS_AUTH_RATE_LIMITED` já existem em
`apiErrors` nos 3 idiomas. O `/i18n-sync` não rodou.

## Desvios

1. **`z.url()` no lugar de `z.string().url()`.** No Zod 4.1.12 instalado em `apps/api`, `ZodString.url()`
   está marcado `@deprecated Use z.url() instead.` (`apps/api/node_modules/zod/v4/classic/schemas.d.ts:103`).
   O repo já usa `z.url()` em `apps/api/env.ts:35` e `packages/next-config/keys.ts:22-25`. O schema ficou
   `requestUri: z.url().max(REQUEST_URI_MAX).optional()`. O plano já deixava a escolha para esta etapa
   (§10.1), então é mais registro do que correção.
2. **Casos a mais no teste.** Entraram `requestUri` acima de 2048, `TOO_MANY_REQUESTS`, a mensagem
   "Invalid response from identity provider", o `http://localhost` da app e a chave fora do schema. Todos
   estão nos critérios CA2, CA3, CA5 e CA6 mas não tinham linha própria na §7.1.
3. **Constantes no teste.** O Biome (`lint/style/noMagicNumbers`) recusou `4097` e `2048` literais no
   arquivo de teste. Viraram `ID_TOKEN_MAX` e `REQUEST_URI_MAX` locais ao teste. O schema não exporta as
   constantes dele, e exportar só para o teste mudaria a superfície do módulo sem necessidade.

Nenhuma decisão do plano estava errada.

## Observação para o `/review`

`z.url()` aceita qualquer esquema que o `URL` do WHATWG interpreta. Medido com
`node -e 'z.url().safeParse(...)'` em `apps/api`: `javascript:alert(1)`, `ftp://x.com` e `localhost:3000`
passam; `not a url` falha. O valor só é repassado ao `signInWithIdp` do Google e a API não redireciona para
ele, então não abre redirecionamento aberto. Se o revisor preferir restringir, a troca é
`z.url({ protocol: /^https?$/ })`. Mantive o que o plano pediu, "URL válida", sem restringir o esquema.

## Decisões em aberto, pendências e bloqueios

Nenhum bloqueio. P1 a P3 da §11 seguem como o plano adotou. O achado 🟢 da chave de API ausente mascarada
como credencial (`specs/BACKLOG.md:1464`) passa a valer também para esta rota; ampliar o texto do achado é
tarefa do `/review` ou do `/spec --sync`, como o plano diz na §13.

## Validação

| gate | comando | resultado |
|------|---------|-----------|
| testes do escopo | `pnpm --filter api exec vitest run __tests__/authSignInGoogleRoute.test.ts __tests__/authSignInRoute.test.ts __tests__/googleSignInProfile.test.ts` | 3 arquivos, 38 testes passando (21 + 13 + 4) |
| testes da api | `pnpm --filter api test` | 104 arquivos, 1341 testes passando, exit 0 |
| typecheck | `pnpm --filter api typecheck` | exit 0 |
| lint | `pnpm check` | `Checked 935 files`, sem correções, exit 0 |
| paridade i18n | não rodou | nenhum arquivo de `packages/internationalization` mudou |

Prova de que o teste pega o defeito (§7.3): com `google/route.ts` substituído por
`git show 4b0be90:"apps/api/app/(routes)/auth/sign-in/google/route.ts"`, o
`vitest run __tests__/authSignInGoogleRoute.test.ts` terminou com 14 falhas e 7 passando de 21. Caíram as 8
linhas de corpo (GC1 a GC5), o `USER_DISABLED` (GC8), as 3 recusas de GC9/GC10 e as 2 de limite (GC11). Os 7
que passaram são os que o plano marcou como "não falha hoje": GC6, GC7 (2), chave a mais, GC12, GC13 e
GC14. Com a rota nova restaurada, 21 de 21 passam.

Não subi app, emulador nem browser.

## A verificar no `/test`

- Rodar `pnpm --filter api test` e o `pnpm test` da raiz (CA10). Os números acima são desta etapa.
- Conferir por leitura de `git status` que `apps/app` e `packages/sdk` estão fora do diff (CA9).
- Opcional, contra o provedor real (emulador do Auth com a API de pé), não medido aqui:
  `curl -i -X POST http://localhost:3002/auth/sign-in/google -H 'content-type: application/json'` sem corpo
  (esperado 400 `VALIDATION_FAILED`), e o mesmo `POST` com o ID token de uma conta desativada no emulador
  (esperado 400 `AUTH_INVALID_CREDENTIALS`, sem `USER_DISABLED` no corpo).
- CA9 na tela (toast com o texto de `apiErrors` em vez de `"401 - Unauthorized"`): não medido. Pela app a
  recusa do provedor quase não é alcançável, porque o popup recusa a conta desativada antes (§1.3 do plano).

## Lacunas de teste conhecidas

- Nenhum teste contra o Identity Toolkit real. O mapeamento depende só da mensagem, que o teste injeta pelo
  `IdentityToolkitError` falso; o formato exato da mensagem de `USER_DISABLED` vinda do emulador foi medido no
  `/test` da PR #50 (`{ "error": "USER_DISABLED" }`), não nesta etapa.
- O caminho em que `getWebApiKey` lança está coberto pela mensagem injetada no mock, não pela função real
  com a env ausente.
