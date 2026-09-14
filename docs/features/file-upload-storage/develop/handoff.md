# Handoff do `/develop` — Upload de arquivos e storage

- **Slug**: `file-upload-storage` · **Plano**: [`analyze/plan.md`](../analyze/plan.md)
- **Data**: 2026-09-11 · **Branch**: `spec-sync-backlog-loop` (não protegida; **nada commitado**)
- **Worktree**: `conductor/workspaces/next-boilerplate/surabaya` (o correto — não `~/next-boilerplate`)

As 13 unidades do plano foram implementadas na ordem prevista. **Um desvio corrige um defeito real**
(§3.1) que quebrava o item 5 do corte; os demais são pontuais e estão justificados.

---

## 1. Blueprint → arquivos

| # | Escopo | Arquivos |
|---|--------|----------|
| 1 | `shared` | `packages/shared/utils/helpers/httpStatus.ts` (`UNSUPPORTED_MEDIA_TYPE: 415`) |
| 2 | `auth` | `packages/auth/keys.ts` (`FIREBASE_STORAGE_BUCKET` no schema, no `runtimeEnv` **e no early-return**), `packages/auth/server.ts` (`getStorageAdmin()` memoizado; `initializeApp` **intocado**) |
| 3 | `sdk` | **novo** `src/types/file/{file.ts,index.ts}` (`UploadedFileDTO`), **novo** `src/actions/file/action.ts` (`FileActions.upload`), `src/client/index.ts` (`file!: FileActions`), `src/types/index.ts`, `src/types/entity/entity.ts` (`photoUrl?: string \| null`) |
| 4 | `api` — upload | **novo** `(shared)/lib/storage.ts`, **novo** `(shared)/validation/file.schema.ts`, **novo** `app/(routes)/files/route.ts` |
| 5 | `api` — entity | `(shared)/validation/entity.schema.ts` (`photoReferenceSchema`), **novo** `(shared)/lib/entity-photo.ts` (`withPhotoUrl`/`withPhotoUrls`/`normalizePhotoReference`), `app/(routes)/entities/route.ts`, `app/(routes)/entities/[id]/route.ts` |
| 6 | `api` — config | `proxy.ts` (`/files` em `RATE_LIMITED_PATHS` + comentário do bloco estendido), `env.ts` (redeclaração obrigatória), `.env.example` |
| 7 | `design-system` | **novo** `components/ui/image-upload-input.tsx`, **novo** `components/form/hookform/hookformImageUpload.tsx`, os 2 barrels |
| 8 | `app` — config | `env.ts`, `proxy.ts` (`STORAGE_ORIGIN` em `imgSrc`, condicionado), `next.config.ts` (`remotePatterns`), `.env.example` |
| 9 | `app` — dados | **novo** `shared/hooks/useFileUpload.ts`, **novo** `shared/lib/storageEnabled.ts`, `(validations)/entityFormSchema.ts` |
| 10 | `app` — telas | `(components)/EntityFormFields.tsx`, `(pages)/create/page.tsx`, `(pages)/edit/[id]/EditEntityClient.tsx`, `(pages)/(home)/EntitiesListClient.tsx` |
| 11 | `internationalization` | `translations/packages/shared/utils.ts` (6 `apiErrors` × 3), `translations/apps/app/pages/common/entities.ts` (`form.photoUpload` + `validation.photoReference` × 3) |
| 12 | config | `firebase.json` (bloco `storage`), **novo** `storage.rules` (deny-all) |
| 13 | docs | `docs/features/file-upload-storage/develop/` |

**Testes**: `apps/api/__tests__/{uploadedImageValidation,fileUploadRoute,entityPhotoReference}.test.ts`
(novos), `apps/app/__tests__/imageUploadInput.test.tsx` (novo),
`apps/app/__tests__/{entityFormSchema,securityPolicySources}.test.ts` e
`apps/api/__tests__/{serviceAccountEnv,entitiesRouteImpersonation}.test.ts` (estendidos).

> ⚠️ **Ruído no `git status` que não é meu**: `specs/*.md`, `specs/BACKLOG.md` e o rename
> `specs/auth-recovery-verification.md → docs/features/auth-recovery-verification/spec.md` já estavam no
> working tree (vieram do `/spec --sync` que criou esta branch). **Não commitar junto com o código desta
> feature.**

## 2. Contrato

- **`UploadedFileDTO`** (novo): `{ path, url, expiresAt, contentType, size }`. `path` é o que se persiste;
  `url` é efêmero.
- **`EntityDTO.photoUrl?: string | null`** — **opcional e derivado**, nunca persistido (D-3: o
  `BaseRepository.update` grava `{...currentData, ...data}` sem passar pelo mapper). `entity.mapper.ts`
  ficou **intocado**, como o plano exigia.
- **`Client.file`** (novo) — contexto `common`.
- **Consumidores**: `EntitiesListClient` passou a ler `photoUrl` (era `photo`); `EditEntityClient` passa
  `entity.photoUrl` como preview. `useEntityCrud`, `useListEntities`, `useFindEntityById` **não mudaram**.
- **Raio de impacto**: `GET /entities`, `GET /entities/[id]` e `POST /entities` agora respondem com
  `photoUrl`. `PUT` e `DELETE` mantêm o contrato.

## 3. Desvios e decisões

### 3.1 🔴 Desvio que corrige defeito — `FIREBASE_STORAGE_BUCKET=""` derrubava a API no boot

O plano mandava copiar o padrão de `FIREBASE_WEB_API_KEY`: `z.string().min(1).optional()` + `??`.
**Isso quebra o item 5 do corte.** `.env.example` publica `FIREBASE_STORAGE_BUCKET=""` como a forma
documentada de recusar a feature, e `optional()` aceita `undefined`, **não** `""` — com o schema literal
do plano, `keys()` lança e **a API não sobe**. Reproduzido: `instrumentation.ts` → `getFirestoreAdmin` →
`keys()` → `Too small: expected string to have >=1 characters`.

Corrigido em `packages/auth/keys.ts` e `apps/api/env.ts`: leitura com `||` e `|| undefined`, de modo que
`""` significa "sem bucket" em vez de "valor malformado". Coberto por 3 casos novos em
`apps/api/__tests__/serviceAccountEnv.test.ts`.

> Nota para o `/spec --sync`: **`FIREBASE_WEB_API_KEY` tem a mesma armadilha latente** e `.env.example`
> também o publica como `""`. Não mexi (fora de escopo), mas um fork que preencha só a service account e
> deixe essa linha vazia não sobe a API.

### 3.2 `application/octet-stream` não pode contar como tipo divergente

O plano recusava quando `file.type && file.type !== sniffed`. Um encoder multipart escreve
`application/octet-stream` sempre que o browser não tem tipo para o arquivo escolhido — com a regra
literal, **upload legítimo levava 415**. Pegou no primeiro teste. Agora só uma declaração **concreta** é
confrontada com os bytes (`isTypeDeclared`); `""` e `application/octet-stream` significam "não sei" e a
autoridade é o sniffing. A proteção que importa (declarar `image/jpeg` sobre bytes de texto) continua.

### 3.3 `withPhotoUrl` engole falha de assinatura

Não estava no plano. Se `getSignedUrl` lançar, a alternativa é **500 na lista inteira** por causa de uma
imagem. Agora loga e devolve `photoUrl: null` — a linha renderiza sem miniatura. Opção de menor raio.

### 3.4 `useFileUpload` mora nas páginas, não em `EntityFormFields`

O plano não dizia onde instanciar o hook. Instanciei em `create/page.tsx` e `EditEntityClient.tsx`, que
passam `uploadPhoto` para `EntityFormFields` e usam `isUploading` no `disabled` do `Footer` — é o que
entrega o V12 do plano (submit bloqueado durante o upload) sem `useEffect` de sincronização.
Consequência: `create/page.tsx` entrou no diff (o plano listava só 3 arquivos na unidade 10).

### 3.5 O hook traduz o erro e relança `Error(mensagem)`

`@repo/design-system` não pode mapear `error.code` (sem SDK, sem locale). `useFileUpload` faz
`handleClientError(new FormattedError(error, locale))` e relança com a mensagem pronta; o componente só
exibe. Acrescentei `photoUpload.errors.failed` como fallback (não estava no plano).

### 3.6 Constantes e sniffing por hex

`noMagicNumbers` do Biome recusa `4 * 1024 * 1024`, `15 * 60 * 1000` e arrays de magic bytes. Segui a
convenção que já existe em `packages/auth/session.ts` (`MS_PER_SECOND`/`SECONDS_PER_MINUTE`) e troquei os
arrays por comparação de prefixo **hex**/ASCII. Comportamento idêntico, e o `sniffImageType` ficou menor.

### 3.7 Sem `loading` no botão de escolher

O `Button` do repo troca os filhos por um `Spinner` quando `loading`, o que **apagaria** a copy
"Enviando…". Usei só `disabled` + a copy + a `Progress` abaixo.

### 3.8 `entitiesRouteImpersonation.test.ts` precisou de ajuste

As rotas de `entities` agora importam `(shared)/lib/storage` → `@repo/auth/server` → `server-only`, que
recusa carregar em teste. Mockei o módulo (mesmo padrão dos repositórios) e atualizei duas asserções de
`GET` para incluir `photoUrl: null`. **Nenhum teste foi desativado.**

## 4. Códigos de erro novos

Os 6 do plano, **presentes nos 3 idiomas** em `translations/packages/shared/utils.ts` (31 → 37 códigos),
com `pnpm --filter @repo/internationalization test` verde:

`STORAGE_NOT_CONFIGURED` (503) · `UPLOAD_FILE_MISSING` (400) · `UPLOAD_FILE_TOO_LARGE` (413) ·
`UPLOAD_FILE_TYPE_NOT_ALLOWED` (415) · `UPLOAD_FAILED` (503) · `ENTITY_PHOTO_INVALID` (400).

`STORAGE_NOT_CONFIGURED`, `UPLOAD_FILE_TYPE_NOT_ALLOWED` e `UPLOAD_FAILED` foram vistos **na tela**, em
pt-br, com a copy correta (§6).

## 5. Gates

| Comando | Resultado |
|---|---|
| `pnpm turbo run lint typecheck test` | ✅ **23/23** tasks |
| `pnpm check` | ✅ 470 arquivos, 0 erro |
| `pnpm --filter api test` | ✅ 25 arquivos / 248 testes |
| `pnpm --filter app test` | ✅ 27 arquivos / 202 testes |
| `pnpm --filter @repo/internationalization test` | ✅ paridade pt-br/en/es |

`pnpm build` **não** foi rodado (o gate do CI é a linha acima).

## 6. Validação visual

`agent-browser 0.27.0`, comandos **em sequência**. Conta criada pelo próprio fluxo de sign-up
(`qa-file-upload@example.com`; **a senha não está registrada aqui de propósito** — o QA cria a sua).
Screenshots em `develop/screenshots/`.

| Cenário | Resultado | Evidência |
|---|---|---|
| Campo de upload no create (dark) | label "Foto", botão, hint "JPG, PNG ou WebP, até 4 MB." | `01`, `02` |
| Arquivo > 4 MB | recusado **no cliente**, "A imagem excede 4 MB.", **0 requisição** (contador do log da API não mudou) | — |
| `.svg` | recusado **no cliente**, "Formato não aceito. **Escolha** JPG…", 0 requisição | — |
| `.txt` renomeado para `.jpg` | cliente **aceita**, API recusa **415** `UPLOAD_FILE_TYPE_NOT_ALLOWED`, copy "Formato não aceito. **Envie** JPG…" | `04` |
| Bucket inexistente | `UPLOAD_FAILED` 503 + copy traduzida | `03` |
| App **com** bucket, API **sem** | `STORAGE_NOT_CONFIGURED` 503 + copy traduzida | `08` |
| `POST /files` sem sessão | **401** `{"error":{"code":"AUTH_INVALID_TOKEN"}}`, sem stack trace | — |
| Modo degradado (bucket vazio nos dois) | API **sobe**, campo volta a ser "Foto (URL)" + hint antigo | `07` |
| URL externa legada | salva, `GET /entities` devolve `photoUrl`, a lista renderiza o `ResponsiveImage` (ícone de fallback porque a URL é fictícia — o **passthrough** é o que se prova) | `09` |
| CSP | `img-src … https://storage.googleapis.com` **com** bucket; ausente **sem** bucket (teste automatizado) | — |
| Light / dark / mobile 390×844 | os três corretos; estado inválido em vermelho; nada estoura em 390 px | `05`, `06`, `02` |
| pt-br / en / es | copy nova renderizando nos três | — |

**Não validado (bucket não provisionado — pré-requisito manual):** caminho feliz do upload, preview da
imagem, barra de progresso em movimento, URL assinada abrindo em aba anônima, expiração da assinatura,
403 do bucket sem assinatura, remoção do objeto anterior na troca, e impersonação no `POST /files`
(coberta por teste). São **V1, V2, V6, V7 e V9** do §8 do plano.

## 7. Lacunas de teste para o `/test`

1. **Caminho feliz de ponta a ponta** — exige os passos de infra do §8. É a lacuna principal.
2. **Rate limit de `/files`** — não exercitável localmente: sem `ARCJET_KEY`, `@repo/security` degrada
   para no-op e a API avisa no boot (`rate limiting is DISABLED`). 25 POSTs seguidos deram 25×401, nenhum
   429. A entrada em `RATE_LIMITED_PATHS` é verificável por leitura de `apps/api/proxy.ts`; **não há
   teste automatizado** porque a constante não é exportada.
3. **Remoção do objeto anterior** — coberta por unidade (ordem `update` → `delete`, e os 4 casos em que
   **não** deve apagar), **não** contra um bucket real.
4. **`ENTITY_PHOTO_INVALID`** — coberto por unidade nos dois handlers; não exercitado pela UI (o
   formulário não permite digitar um caminho de outro dono).
5. **Impersonação no upload** — coberta por unidade; não vista na tela.
6. **`useFileUpload`** — sem teste próprio; exercitado indiretamente.

## 8. Pré-requisitos MANUAIS de infra — **não reprovar o código por eles**

Nada disso é código, e sem isso o comportamento observado **é o esperado** (item 5 do corte).
Medido hoje: `https://firebasestorage.googleapis.com/v0/b/next-boilerplate-576d0.firebasestorage.app/o`
→ **404**, ou seja, o Cloud Storage **não está ativado** no projeto, embora
`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` já esteja preenchida em `apps/app/.env`.

1. Ativar o **Cloud Storage for Firebase** no console (`next-boilerplate-576d0`).
2. Preencher `FIREBASE_STORAGE_BUCKET` em `apps/api/.env` (hoje só existe a pública, que o fallback
   aproveita) e as duas na Vercel.
3. IAM da service account: `roles/storage.objectAdmin` no bucket.
4. `npx -y firebase-tools@latest deploy --only storage` (`--dry-run` antes).
5. **Não** conceder `allUsers`/`allAuthenticatedUsers`; **não** `makePublic()`; **não** `getDownloadURL()`.
   Conferir: `curl -o /dev/null -w '%{http_code}' https://storage.googleapis.com/<bucket>/<objeto>` → 403.
6. CORS no bucket **não** é necessário.

## 9. Pendências e observações para o `/review`

- **Dado de QA deixado no Firestore**: usuário `qa-file-upload@example.com` e a entidade
  `Legacy URL Entity` (com `photo` = URL externa fictícia). Inofensivos; úteis para o `/test`.
- **`docs/SECURITY.md:106`** continua dizendo que o rate limit cobre 3 rotas; com `/files` são **8**.
  Não corrigido (Q8 do plano manteve os docs fora de escopo) — vale como achado.
- Nenhuma dependência nova em nenhum `package.json`. `@google-cloud/storage@7.17.3` continua chegando
  como optional dep de `firebase-admin@13.6.0`.
- `turbo.json`, `instrumentation.ts`, `entity.mapper.ts`, `packages/security`, `apps/web`, `queryKeys`,
  `paths.ts` e `cors.ts` **não foram tocados**, como o plano previu.
