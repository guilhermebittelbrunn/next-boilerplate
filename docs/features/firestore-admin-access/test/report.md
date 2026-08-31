# Relatório de QA — `firestore-admin-access`

**Data:** 2026-08-30 · **Branch:** `api/refactor/firestore-admin-access`
**Critérios:** [`criterios-aceite.md`](criterios-aceite.md) · **Evidência visual:** [`e2e/`](e2e/) (14 prints)

## Veredito

**Aprovado com uma pendência que não é da implementação.**

O QA encontrou **1 defeito novo** (regressão introduzida durante a própria revisão, em `84201b6`), que foi
**corrigido e travado por teste** na mesma rodada. Restam **2 critérios bloqueados** por dependerem de uma
ação humana — publicar as security rules —, e eles **não são falha do código**.

## Suítes

| Comando | Antes | Depois |
|---|---|---|
| `pnpm --filter api test` | 10 arq / 72 | **14 arq / 105** ✅ |
| `pnpm --filter app test` | 21 / 135 | 21 / 135 ✅ |
| `pnpm --filter @repo/internationalization test` | 2 | 2 ✅ |
| **`pnpm test` (root — gateia `turbo build`)** | 209 | **242** ✅ |
| `pnpm --filter api typecheck` | limpo | limpo ✅ |
| `pnpm check` | 192/37 | **192/37** — sem regressão ✅ |
| `npx biome check` nos arquivos tocados | — | 0/0 ✅ |

## Testes criados (+33)

| Arquivo | Testes | Lacuna fechada |
|---|---|---|
| `userProfileSerialization.test.ts` (novo) | 8 | **6** e **1** — `serializeFirestoreData`/`mergeAuthAndFirestore` com `Timestamp` **real** e com `Date` |
| `mergedUserPayload.test.ts` (novo) | 7 | **6** na borda HTTP — `GET /auth/me`, `GET /users/:id` |
| `serviceAccountEnv.test.ts` (novo) | 9 | **7** e **3** — `apps/api/env.ts` + os 3 ramos de `packages/auth/keys.ts` |
| `instrumentation.test.ts` (novo) | 3 | **2** — `register()` sem credencial |
| `baseRepository.test.ts` (estendido) | 14 → 20 | **4** e **5** — `list()` sobre o `findAll` real; `update()`/`delete()` sem mapper |

**Todos provados load-bearing por mutação**, com os arquivos restaurados depois: reverter
`mergeAuthAndFirestore` para o spread cru derruba 4 testes em 2 endpoints; esvaziar o `server` de
`apps/api/env.ts` derruba 1; remover o tratamento de `Date` derruba exatamente 1 — o que foi escrito para
isso.

Como o `/review` havia alertado, `serializeFirestoreData` usa `instanceof Timestamp`, então o dublê
duck-typed do `baseRepository.test.ts` não serviria aqui: os testes novos usam `Timestamp.fromDate(...)` de
verdade.

## A lacuna 6, medida em runtime

A correção de `84201b6` está provada em três camadas — unit, rota e runtime:

| Endpoint | `createdAt` | contém `_seconds`? |
|---|---|---|
| `POST /auth/sign-in` · `GET /auth/me` · `GET /users/:id` | `'2026-08-22T16:22:57.960Z'` | não |
| `GET /users?type=admin` | 4 registros, todos string | não |
| `POST /users` | `'2026-08-31T01:20:29.800Z'` | não |

Lista e detalhe voltaram a concordar.

## Autorização e ownership, com dois usuários comuns reais

```
GET/PUT/DELETE /entities/:id (de outro comum)  -> 404 ENTITY_NOT_FOUND (nos três)
GET /entities (outro comum)                    -> 0 registros
GET /entities/<inexistente> (dono)             -> 404
GET /entities/:id · GET /users (sem credencial)-> 401
admin no painel comum sem personificar         -> 403 AUTH_REQUEST_IMPERSONATION_REQUIRED
```

## Defeito encontrado e corrigido — `Date` virava `{}`

`serializeFirestoreValue` tratava `Timestamp` e caía no ramo genérico de objeto. Um `Date` do JS não é
`Timestamp`, entrava nesse ramo, e `Object.entries(new Date())` é vazio → o campo virava `{}`.

Alcançável porque `BaseRepository.create()` devolve o objeto que acabou de montar (`createdAt: new Date()`)
sem reler do Firestore, e `getMergedUserByUid` mescla exatamente esse objeto quando não há perfil vivo.
**Reproduzido em runtime**: admin soft-deleta o perfil → o usuário chama `/auth/me` → `createdAt = {}`.

Atingia `GET /auth/me` e `POST /auth/sign-in` de qualquer conta de Auth sem perfil vivo (perfil excluído,
conta criada no console, migração de fork). `sign-up`, `sign-in/google` e `POST /users` não eram afetados,
porque releem do Firestore.

**Era regressão desta branch**: antes de `84201b6` o `Date` virava ISO no `JSON.stringify`. Corrigido
tratando `Date` ao lado de `Timestamp`, com teste dedicado.

## 🔴 Pendência que não é da implementação — as rules seguem não publicadas

Medido nesta rodada: leitura REST direta de `entity` com a **chave pública** → **HTTP 200, 1223 bytes, 1
documento real**. O furo que a spec existe para fechar **continua aberto**.

Por isso dois sinais de pronto estão **BLOQUEADO — depende de ação humana**, e não PASS:

- `:111` — "com as regras `deny-all` publicadas, a aplicação funciona de ponta a ponta";
- `:113` — "leitura direta com as credenciais públicas é negada".

O caminho é `firebase login` (interativo) + `deploy --only firestore:rules,firestore:indexes`. O código já
está do lado certo da ordem: publicar agora é seguro.

## e2e — 14 prints em `e2e/`

`agent-browser`, comandos estritamente em sequência, duas sessões (admin + comum criado pelo sign-up da UI).
Lista admin (dark 01, light 04, mobile light 05, mobile dark 06) · `GET /users/:id` renderizando (02) ·
`PUT /users/:id` confirmado **por reload** (03) · impersonação read-only (07) · CRUD `entity` completo:
vazio (08), submit inválido (09), criar com `Criado em` real (10), toggle após reload (11), edição mostrando
`Criado em: 30 de ago. de 2026, 22:26` depois do `PUT` que reescreve o documento (12), confirmação (13),
soft delete (14).

Console: só o aviso pré-existente do antd. PII: filtro `qa-` aplicado **antes** de qualquer captura.

## Cross-check

| Ambiente | Resultado |
|---|---|
| `apps/web` | **Não aplicável** — não fala com Firestore, zero arquivo no diff |
| comum × admin × impersonação × não autenticado | Todos exercitados |
| mobile × desktop · light × dark | Ambos |
| 3 idiomas | **Não afetados** — o diff não toca i18n nem cria `error.code` (paridade rodada mesmo assim: 2/2) |
| `subscription` × `simple` | **Não aplicável por análise** — a troca está abaixo dos guards; nenhum arquivo do diff lê o modo de produto |

## Follow-ups

1. **Publicar as rules** — único caminho para `:111`/`:113`.
2. `POST /auth/sign-up` e `/auth/sign-in/google` sem teste de formato de payload — barato.
3. `userRepository.list()` declara `Promise<UserDTO[]>` mas devolve o merge com o auth
   (`UserWithAuthDTO`) — o teste exigiu cast. Menor, pré-existente.
4. `ensureDefaultUserProfile` é chamado **incondicionalmente** em `POST /auth/sign-in/google` e sempre cria
   documento — aparenta perfil duplicado a cada login Google. Pré-existente, fora do diff, não investigado a
   fundo.

## Estado de dev alterado (autorizado — remover ao fechar o pipeline)

Em `next-boilerplate-576d0`: contas `qa-probe-common@example.com` (`QA Probe Renamed`),
`qa-test-common@example.com`, `qa-owner-b@example.com`; o perfil original do `qa-probe-common` está
soft-deletado e há um segundo criado automaticamente (é a reprodução do defeito); entidades
`QA Test Admin SDK Entity` (soft-deletada) e `QA Ownership Probe` (viva). A senha do `qa-admin` foi
redefinida via `create-dev-admin`.

**Nenhuma senha gravada em arquivo.** Tokens temporários em `/tmp` removidos.
