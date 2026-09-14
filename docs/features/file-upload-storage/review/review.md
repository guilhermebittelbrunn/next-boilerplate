# Revisão — Upload de arquivos e storage

- **Slug**: `file-upload-storage` · **Data**: 2026-09-11
- **Worktree**: `conductor/workspaces/next-boilerplate/surabaya` (confirmado com `pwd`)
- **Base**: `origin/main` @ `e4eddb9` · **Nada commitado** por esta etapa

**Veredito**: aprovado com correções aplicadas. Um defeito **bloqueante** foi encontrado na validação
visual (a tela de edição e a listagem quebravam com URL externa legada) e está corrigido. Os demais
achados são endurecimento e limpeza. Gates verdes depois das correções.

> **2.ª rodada (pós-`/test`)**: o `/test` reportou `POST /files` respondendo **500 HTML** para corpo
> grande. **Reproduzi, investiguei e o defeito é exclusivo do `next dev`** — o build de produção responde
> `413`/`401` com `error.code` em **todas** as faixas medidas, até 12 MB. **Nenhum código de produção
> mudou** nesta rodada; entrou **um teste** que fixa o contrato. Detalhe em **§12**.

---

## 1. Branch

**Recomendação: criar `app/feat/file-upload-storage` a partir da branch atual.**

A branch atual é **`spec-sync-backlog-loop`** — nome do ciclo de `/spec --sync` que originou a auditoria
do backlog, não desta feature. Ela está em `e4eddb9`, **idêntica a `origin/main`**, sem commits próprios,
então criar a branch da feature a partir dela não arrasta nada.

Não a criei ainda: o working tree mistura **dois assuntos** (auditoria do backlog + feature) e a decisão
de separar em duas branches ou deixar as duas linhas de commit na mesma é do usuário (bloco §7). Se a
resposta for "uma branch só", `app/feat/file-upload-storage` cobre tudo. O `project` é `app` porque o
maior volume de código de produto está em `apps/app` + `packages/design-system`; a API é suporte.

## 2. Achados

| Sev | Arquivo:linha | Problema | Ação |
|---|---|---|---|
| 🔴 | `packages/design-system/components/ui/responsive-image.tsx:60` (via `image-upload-input.tsx:163` e `EntitiesListClient.tsx:54`) | `next/image` recebe host não listado em `remotePatterns` e **lança** `next-image-unconfigured-host`, derrubando a página inteira. Reproduzido: entidade com `photo` = URL externa → **tela de erro** na listagem **e** na edição | **Corrigido** — `unoptimized` |
| 🟡 | `apps/api/app/(routes)/files/route.ts:38` | `signReadUrl` fora do `try`: escrita OK + assinatura falha ⇒ throw ⇒ 500 **sem `error.code`** | **Corrigido** — dentro do mesmo `try` |
| 🟡 | `entities/route.ts:36` e `entities/[id]/route.ts:67` | Checagem de posse só disparava **se** `isStorageObjectPath(photo)`; regex duplicada em `storage.ts` e `entity.schema.ts`. Se divergirem, valor fora do formato **pula** a checagem e ainda assim é assinado | **Corrigido** — fail-closed |
| 🟡 | `apps/api/(shared)/validation/file.schema.ts:96` | Teto de 4 MiB só aplicado **depois** de `req.formData()` bufferizar o corpo inteiro | **Corrigido** — recusa por `content-length` antes |
| 🟡 | `apps/api/(shared)/lib/entity-photo.ts:35` | `withPhotoUrl` assinava **qualquer** string não-URL, inclusive dado legado nunca validado | **Corrigido** — só caminho bem-formado |
| 🟡 | `packages/auth/keys.ts:52` | `FIREBASE_WEB_API_KEY` tem a **mesma** armadilha do bucket (§3.2): `.env.example` publica `""`, `??` preserva `""`, `min(1)` recusa ⇒ **API não sobe** | **Corrigido** — `\|\|` (fora do escopo; ver §7) |
| 🟢 | `translations/.../entities.ts:64,141,218` | `validation.photoUrl` ficou órfã (o refine passou a usar `photoReference`) | **Corrigido** — removida nos 3 idiomas |
| 🟢 | `packages/design-system/components/ui/date-input.tsx:50` | `placeholder = "Pick a date"` literal aparece em pt-br/es — viola a regra de ouro 2 | **Não corrigido** — pré-existente (`90152c4`), fora do escopo. Achado para o backlog |
| 🟢 | `apps/api/.env.example:15` | Diz que esvaziar `FIREBASE_STORAGE_BUCKET` desliga a feature, mas o fallback para `NEXT_PUBLIC_*` mantém ligada se a pública existir no mesmo ambiente | **Não corrigido** — ver §7 |

### ✅ Conforme

Handlers com `guard(async …)`; posse do **registro** conferida (404, sem vazar existência) em `GET`/`PUT`/
`DELETE`; `parseCreateX`/`parseUpdateX` na borda; `{ error: { code } }` + `HTTP_STATUS` em todas as
recusas; mapper **intocado**; `photoUrl` derivado no handler; SDK com action registrada no `Client` e erro
propagado cru; `HookFormImageUpload` com `Omit<…>` + `{...rest}` e prop `error`; 6 `apiErrors` + nó
`photoUpload` nos 3 idiomas; `/files` em `RATE_LIMITED_PATHS`; `storage.rules` deny-all.

## 3. Os 9 pontos céticos

**1. Desvio do `FIREBASE_STORAGE_BUCKET` — reprodução confirmada, correção correta.** Executei o schema do
plano contra o zod do repo:

```
?? (plano)   -> THROWS: FIREBASE_STORAGE_BUCKET: Too small: expected string to have >=1 characters
|| (entregue) -> PARSED
```

`.env.example` publica `FIREBASE_STORAGE_BUCKET=""`, `??` só cai no fallback para `null`/`undefined`, e
`z.string().min(1)` recusa `""`. Com o schema literal do plano `keys()` lança e a API não sobe. O desvio é
**correção de defeito**, não preferência. **Não abre outro buraco**: o único consumidor é
`isStorageConfigured()`, cujo contrato é exatamente "vazio = desligado"; `""` e `undefined` colapsam no
mesmo estado desejado. A ressalva é de **documentação**, não de código (§2, último achado).

**2. `FIREBASE_WEB_API_KEY` — confirmado, e é pior do que latente.** Mesma prova acima. `.env.example:12`
publica `FIREBASE_WEB_API_KEY=""`, e `keys()` é chamado por `getFirebaseAdminApp()` ⇒ **qualquer** acesso a
Firestore. Um fork que copie o `.env.example` e preencha só a service account **não sobe a API**. Corrigi
(1 linha) porque é a mesma classe de defeito e deixar metade corrigida convida alguém a "restaurar a
simetria" para o lado errado. O consumidor (`firebase-identity-toolkit.ts:27`) já trata ausência com erro
explícito, então a troca converte *crash de boot* em *falha localizada e legível*.

**3. `application/octet-stream` — não virou bypass.** O allowlist é imposto por `sniffImageType`, que só
devolve um dos 3 tipos ou `null`; `null` ⇒ 415. O tipo declarado é restrição **adicional**, nunca
permissiva. Confirmado pelos testes: `.txt` declarado `image/jpeg` ⇒ 415; PNG declarado `image/jpeg` ⇒ 415;
`RIFF` truncado ⇒ 415; e a extensão vem dos bytes, nunca do nome (`../../evil.php.jpg` ⇒ `png`).

**4. IDOR — fechado nos dois handlers, e agora fail-closed.** Verificado **contra a API rodando**:

| Tentativa (`PUT`/`POST`) | Resposta |
|---|---|
| `uploads/<outro-uid>/<uuid>.jpg` | `400 ENTITY_PHOTO_INVALID` |
| `uploads/../../etc/passwd` | `400 VALIDATION_FAILED` |
| `not-a-url-nor-a-path` | `400 VALIDATION_FAILED` |
| `javascript:alert(1)` | `400 VALIDATION_FAILED` |
| `https://cdn.example.com/ok.png` | `200` |

Sobre os vetores específicos: **`..`** não passa no regex (`[A-Za-z0-9_-]` não aceita ponto) e, mesmo que
passasse, nome de objeto no GCS é literal, não há resolução de caminho. **Prefixo de outro uid** não cola:
`isOwnedBy` exige `uploads/<id>/` com a barra, e o regex garante exatamente 3 segmentos, então `abc` não
casa `uploads/abcd/…`. **Uid de header** não é confiável por acidente: `resolveAuthRequestContext` compara
o header com o `uid` do token verificado (`AUTH_REQUEST_USER_ID_MISMATCH`) e recusa impersonação para
usuário comum; `assertReadOnlyWhileImpersonating` bloqueia escrita de admin personificando (coberto por
teste em `fileUploadRoute.test.ts`).

**5. URL assinada nunca persistida — confirmado.** `photoUrl` só é acrescentado no retorno de
`withPhotoUrl`, nunca em `create`/`update`. O risco real era `BaseRepository.update` (`base.repository.ts:
100-114`) gravando `{...currentData, ...data}` **sem mapper**: `currentData` vem de `findById`, que devolve
o DTO **do documento** (sem `photoUrl`, porque o handler é quem deriva), e o handler passa apenas
`{ id, ...patch }`. Coberto por teste (`signs a bucket object on read and never persists the signature`
afirma `updateMock` não chamado).

**6. Ordem do delete — correta.** `deleteObjectQuietly` roda **depois** do `await update`; se a escrita
falhar, a exceção sobe antes e o objeto antigo continua sendo o válido. Só apaga objeto **próprio** e nunca
URL externa. Testado nos 5 casos (troca, mesmo valor, patch sem foto, limpar, URL externa).

**7. CSP × `remotePatterns` no modo degradado — inconsistentes, e era pior do que parecia.** A CSP ganha o
host condicionalmente (`imgSrc`), mas `remotePatterns` o adiciona **incondicionalmente**. Isso por si só é
inofensivo, mas investigando essa assimetria encontrei o bloqueante do §2: `remotePatterns` **não é** uma
lista de "hosts permitidos que degradam"; é uma lista cuja violação **lança e derruba a página**. Como o
campo aceita URL externa arbitrária por design (compatibilidade legada), nenhuma lista estática cobre o
caso — daí a correção por `unoptimized`, que tira a URL do otimizador e deixa a CSP ser a autoridade
(host não permitido ⇒ `onError` ⇒ ícone de fallback).

**8. Tamanho/MIME no servidor — sim, e agora antes de bufferizar.** A regra de ouro 4 está atendida: o
cliente recusa por conveniência, a API recusa por autoridade (415 comprovado na tela com `.txt` renomeado).
O achado histórico (`photo` era `z.string().trim().max()` e qualquer texto passava) está resolvido pelo
`photoReferenceSchema`. Acrescentei a recusa por `content-length` porque um teto aplicado **depois** de
`req.formData()` não protege memória fora da Vercel.

**9. i18n — paridade real.** `pnpm --filter @repo/internationalization test` verde (teste determinístico de
estrutura). Conferi na tela nos **3 idiomas**: `Foto/Photo/Foto` + `Escolher/Choose/Elegir imagem`. O
`alt` da pré-visualização e o `aria-describedby` do hint vêm do dicionário; o `aria-live` do progresso usa
`texts.uploading`. **Zero string solta introduzida por este diff** — a única literal na tela é o
`"Pick a date"` pré-existente do `DateInput` (§2).

## 4. Correções aplicadas

Todas no working tree, **não commitadas**, prontas para `git diff`.

1. **`packages/design-system/components/ui/responsive-image.tsx`** — prop `unoptimized` opcional, repassada
   ao `next/image`. Sem ela, host fora de `remotePatterns` derruba a página inteira.
2. **`packages/design-system/components/ui/image-upload-input.tsx:167`** — `unoptimized` na
   pré-visualização.
3. **`.../entities/(pages)/(home)/EntitiesListClient.tsx:59`** — `unoptimized` na miniatura.
4. **`apps/api/app/(routes)/files/route.ts`** — `signReadUrl` movido para dentro do `try` do `putObject`.
5. **`apps/api/(shared)/lib/entity-photo.ts`** — novos `isOwnStorageObject` e `isUsablePhotoReference`
   (fail-closed); `withPhotoUrl` só assina caminho bem-formado.
6. **`apps/api/app/(routes)/entities/route.ts` + `[id]/route.ts`** — passam a usar os helpers; o `[id]`
   perdeu a condição duplicada de delete. Removeu a dependência da regex duplicada.
7. **`apps/api/(shared)/validation/file.schema.ts`** — `exceedsDeclaredLength` recusa 413 antes de ler o
   corpo, com folga de 64 KiB para o envelope multipart.
8. **`packages/auth/keys.ts`** — `FIREBASE_WEB_API_KEY` passa a usar `||` + `|| undefined`.
9. **`packages/internationalization/.../entities.ts`** — removida `validation.photoUrl` órfã (×3).

**Testes acrescentados** (6): assinatura que falha depois da escrita ⇒ `UPLOAD_FAILED`; matriz do
`isUsablePhotoReference` (6 recusas, incluindo prefixo-de-outro-uid e extensão fora do allowlist); valor
legado malformado não é assinado; `content-length` acima do teto recusa sem ler o corpo; corpo sem
`content-length` ainda é medido pelo arquivo; `FIREBASE_WEB_API_KEY=""` não derruba `keys()` e cai no
fallback público. **API: 248 → 266 testes.**

## 5. Validação visual

`agent-browser 0.27.0`, comandos **estritamente em sequência**, conta criada pelo próprio sign-up
(`qa-review-upload@example.com`; senha é descartável local, não registrada aqui). Screenshots em
`review/screenshots/`.

| Cenário | Resultado | Evidência |
|---|---|---|
| Campo de upload no create, dark | label "Foto", "Escolher imagem", hint "JPG, PNG ou WebP, até 4 MB." | `r02` |
| Upload real de PNG (bucket ausente) | `POST /files` **503**, copy pt-br traduzida, sem stack trace | `r03` |
| Estado de erro, light | label + borda em vermelho, contraste correto | `r04` |
| Mobile 390×844 | mensagem quebra linha, nada estoura | `r05` |
| Listagem, foto nula | coluna "Foto" com `—` | `r06` |
| **Listagem com URL externa** | **antes: tela de erro** · depois: ícone de fallback | `r07` |
| **Edição com URL externa** | **antes: tela de erro** · depois: preview + "Trocar/Remover imagem" | `r08` |
| Edição dark + mobile 390 | botões empilham, nada estoura | `r09` |
| pt-br / en / es | `Foto/Photo/Foto`, `Escolher/Choose/Elegir imagem` | — |
| IDOR contra a API no ar | 5 vetores, tabela do §3.4 | — |

⚠️ **O caminho feliz continua não validado** — ver §6.

## 6. 🚨 Pré-requisito de infra — NÃO é falha de código

O **Cloud Storage não está ativado** no projeto `next-boilerplate-576d0`
(`https://firebasestorage.googleapis.com/v0/b/next-boilerplate-576d0.firebasestorage.app/o` → **404**),
mesmo com `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` preenchida. Reconfirmado nesta revisão: o upload responde
**503 `UPLOAD_FAILED`**, que é o comportamento **esperado** sem bucket.

Passos manuais em `develop/handoff.md` §8. **Não reprovei por isso.**

## 7. Precisa de decisão do usuário

1. **Correção do `FIREBASE_WEB_API_KEY` está fora do escopo da feature.** Apliquei porque é a mesma classe
   de defeito, impede o boot de um fork novo e cabe em 1 linha — mas ela vive em `packages/auth/keys.ts`,
   **o mesmo arquivo** da mudança do bucket, então não dá para separar em outro commit sem `git add -p`.
   Está descrita na mensagem do commit 2. **Se preferir isolar, é só reverter essa linha.**
2. **Duas branches ou uma?** O working tree mistura a auditoria do backlog (`/spec --sync`) com a feature.
   O plano abaixo separa em **commits**, mas mantém tudo na mesma branch. Separar em duas branches/PRs é
   mais limpo e é o que eu recomendaria se a auditoria for para `main` sozinha.
3. **`.env.example` da API promete um desligamento que o fallback não entrega.** Esvaziar
   `FIREBASE_STORAGE_BUCKET` não desliga a feature se `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` existir no
   mesmo ambiente (é exatamente o caso do `apps/api/.env` local). Opções: (a) ajustar a redação, (b) tirar
   o fallback e exigir a var explícita na API. Não decidi — (b) muda comportamento.
4. **`unoptimized` tem custo.** URL assinada muda a cada 15 min, então o cache do otimizador erraria
   sempre; `unoptimized` evita esse desperdício, mas também tira `srcset`/WebP das miniaturas (44 px e
   64 px — impacto baixo). Alternativa futura: rota de proxy própria com cache estável.

## 8. Lacunas para o `/test`

1. **Caminho feliz de ponta a ponta** — depende do §6. É a lacuna principal: preview, barra de progresso,
   URL assinada abrindo em aba anônima, expiração, 403 sem assinatura, remoção do objeto anterior.
2. **Regressão do `unoptimized`** — com bucket real, confirmar que a miniatura assinada **carrega** (aqui
   só provei que host inválido degrada em vez de derrubar).
3. **`ENTITY_PHOTO_INVALID` pela UI** — só exercitável por API; o formulário não deixa digitar caminho.
4. **Mensagem `validation.photoReference`** — só alcançável no **modo degradado** (campo de URL). No modo
   com bucket o picker nunca produz valor inválido.
5. **Rate limit de `/files`** — não exercitável sem `ARCJET_KEY`; a constante não é exportada.
6. **`useFileUpload`** — sem teste próprio.
7. **Dois registros apontando para o mesmo objeto** — trocar a foto de um apaga o objeto que o outro ainda
   referencia. A UI não produz o caso (a API aceita caminho próprio arbitrário). Sem contagem de
   referência, é limitação conhecida.
8. **Objeto órfão no soft delete** — **decisão consciente** (Q12 do plano: `delete` é soft, apagar
   impediria restauração). Não é defeito; pertence a `data-rights-lgpd`.

## 9. Gates

| Comando | Resultado |
|---|---|
| `pnpm turbo run lint typecheck test` | ✅ **23/23** |
| `pnpm check` | ✅ 470 arquivos, 0 erro |
| `pnpm --filter api test` | ✅ 25 arquivos / **266** testes |
| `pnpm --filter app test` | ✅ 27 arquivos / 202 testes |
| `pnpm --filter @repo/internationalization test` | ✅ paridade pt-br/en/es |

## 10. Plano de commits proposto

Ordem de dependência `sdk → api → app/design-system → i18n`, um commit por app/pacote, pulverizado por
funcionalidade. **Nada commitado** — o `/review` aplica bloco a bloco com aprovação.

**1. `feat(shared): add the unsupported media type status`**
- `packages/shared/utils/helpers/httpStatus.ts`

**2. `feat(auth): expose the storage admin and read empty env vars as absent`**
> Inclui a correção do `FIREBASE_WEB_API_KEY` (§7.1).
- `packages/auth/keys.ts`
- `packages/auth/server.ts`

**3. `feat(sdk): add the file upload action and the derived entity photo url`**
- `packages/sdk/src/types/file/file.ts`, `packages/sdk/src/types/file/index.ts`
- `packages/sdk/src/actions/file/action.ts`
- `packages/sdk/src/client/index.ts`, `packages/sdk/src/types/index.ts`
- `packages/sdk/src/types/entity/entity.ts`

**4. `feat(api): accept image uploads on a signed, owner-scoped storage path`**
- `apps/api/(shared)/lib/storage.ts`
- `apps/api/(shared)/validation/file.schema.ts`
- `apps/api/app/(routes)/files/route.ts`
- `apps/api/__tests__/uploadedImageValidation.test.ts`, `apps/api/__tests__/fileUploadRoute.test.ts`

**5. `feat(api): derive the entity photo url and guard the referenced object`**
- `apps/api/(shared)/lib/entity-photo.ts`
- `apps/api/(shared)/validation/entity.schema.ts`
- `apps/api/app/(routes)/entities/route.ts`, `apps/api/app/(routes)/entities/[id]/route.ts`
- `apps/api/__tests__/entityPhotoReference.test.ts`, `apps/api/__tests__/entitiesRouteImpersonation.test.ts`

**6. `chore(api): rate limit the upload route and resolve the storage bucket`**
- `apps/api/env.ts`, `apps/api/proxy.ts`, `apps/api/.env.example`
- `apps/api/__tests__/serviceAccountEnv.test.ts`

**7. `feat(design-system): add the image upload input`**
- `packages/design-system/components/ui/image-upload-input.tsx`
- `packages/design-system/components/form/hookform/hookformImageUpload.tsx`
- `packages/design-system/components/ui/index.ts`, `packages/design-system/components/form/hookform/index.ts`

**8. `fix(design-system): stop an unlisted image host from taking the page down`**
- `packages/design-system/components/ui/responsive-image.tsx`

**9. `chore(app): allow the bucket host in the image policy`**
- `apps/app/env.ts`, `apps/app/proxy.ts`, `apps/app/next.config.ts`, `apps/app/.env.example`
- `apps/app/__tests__/securityPolicySources.test.ts`

**10. `feat(app): upload the entity photo from the form`**
- `apps/app/shared/hooks/useFileUpload.ts`, `apps/app/shared/lib/storageEnabled.ts`
- `.../entities/(validations)/entityFormSchema.ts`, `.../entities/(components)/EntityFormFields.tsx`
- `.../entities/(pages)/create/page.tsx`, `.../entities/(pages)/edit/[id]/EditEntityClient.tsx`
- `.../entities/(pages)/(home)/EntitiesListClient.tsx`
- `apps/app/__tests__/imageUploadInput.test.tsx`, `apps/app/__tests__/entityFormSchema.test.ts`

**11. `feat(internationalization): translate the upload copy and its error codes`**
- `packages/internationalization/translations/packages/shared/utils.ts`
- `packages/internationalization/translations/apps/app/pages/common/entities.ts`

**12. `chore: publish deny-all storage rules`**
- `firebase.json`, `storage.rules`

**13. `docs(specs): re-audit the backlog and archive the delivered recovery spec`**
> Assunto **independente** — resultado do `/spec --sync`. Usa `git mv` (rename detectado).
- `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/account-settings.md`,
  `specs/cursor-pagination.md`, `specs/firebase-emulator-seed.md`, `specs/observability-logging.md`,
  `specs/onboarding-flow.md`
- `specs/auth-recovery-verification.md` → `docs/features/auth-recovery-verification/spec.md`

**14. `docs(features): file-upload-storage`**
- `docs/features/file-upload-storage/` (plano, handoff, review, STATE, screenshots)

**PR sugerido**: `feat(app): upload de foto com storage assinado` — ou dois PRs, se §7.2 for "duas
branches".

**Commits realizados**: _(o orquestrador preenche)_

## 11. Higiene

- **Sem segredo** nos artefatos: nenhuma senha em screenshot ou roteiro; o token de sessão usado nas
  sondagens ficou só em variável de shell.
- **Dados de QA no Firestore**: `qa-file-upload@example.com` (do `/develop`), `qa-review-upload@example.com`
  (meu) e as entidades `Legacy URL Entity` e `Review Entity No Photo` — esta última com `photo` =
  `https://cdn.example.com/ok.png`, útil para o `/test` reproduzir o caso legado.
- Nenhuma dependência nova em nenhum `package.json`.
- `docs/SECURITY.md:106` continua dizendo que o rate limit cobre 3 rotas; com `/files` são 8 (achado do
  `/develop`, mantido fora do escopo).

---

# 12. Segunda rodada — retorno do `/test`

## 12.1 Defeito 1 — `POST /files` 500 HTML: **é do `next dev`, não do código**

**Reproduzido primeiro, como reportado.** Em `pnpm --filter api dev`, corpo grande + recusa antes de ler
o corpo ⇒ `TypeError: Response body object should not be disturbed or locked` ⇒ **500 HTML**:

```
DEV, sem sessão:
4.194.304 B -> 401 {"error":{"code":"AUTH_INVALID_TOKEN"}}
4.404.019 B -> 500 <!DOCTYPE html>     ❌
4.718.592 B -> 500 <!DOCTYPE html>     ❌
```

### O que o build de produção faz — a medição decisiva

```
PRODUÇÃO (next build && next start), SEM sessão:
4.194.304 B  -> 401 {"error":{"code":"AUTH_INVALID_TOKEN"}}
4.404.019 B  -> 401 {"error":{"code":"AUTH_INVALID_TOKEN"}}
4.718.592 B  -> 401 {"error":{"code":"AUTH_INVALID_TOKEN"}}
12.000.000 B -> 401 {"error":{"code":"AUTH_INVALID_TOKEN"}}

PRODUÇÃO, COM sessão (bearer):
4.194.304 B  -> 503 {"error":{"code":"UPLOAD_FAILED"}}        (4 MiB exatos: passa o teto, falha por não haver bucket)
4.200.000 B  -> 413 {"error":{"code":"UPLOAD_FILE_TOO_LARGE"}}
4.404.019 B  -> 413 {"error":{"code":"UPLOAD_FILE_TOO_LARGE"}}
4.718.592 B  -> 413 {"error":{"code":"UPLOAD_FILE_TOO_LARGE"}}
12.000.000 B -> 413 {"error":{"code":"UPLOAD_FILE_TOO_LARGE"}}
```

**Zero** ocorrências de `disturbed or locked` no log de produção. Para isolar a variável, rodei o build de
produção **com e sem** a correção tentada: **os dois passam**. Ou seja, produção nunca teve o defeito, e o
`error.code` **não** se perde onde importa. A regra de ouro 3 está atendida no alvo de deploy.

### Por que não deixei a "correção"

A sugestão do QA (`await req.body?.cancel()` antes da recusa) foi implementada e **medida**:

| Abordagem | dev 4,4 MB | dev 4,7 MB | dev 12 MB |
|---|---|---|---|
| `body.cancel()` | ❌ 500 | ❌ 500 | ❌ 500 |
| `req.arrayBuffer()` (drenar) | ✅ 401 | ❌ 500 | ❌ 500 |
| sem nada (produção) | ✅ 401 | ✅ 401 | ✅ 401 |

`cancel()` **não resolve**, e drenar só empurra o limiar — além de **bufferizar o corpo inteiro em
memória**, que é exatamente o vetor que o teto por `content-length` existe para fechar. Manter qualquer uma
das duas seria código morto em produção, ineficaz em dev e, no caso do drain, **uma regressão de segurança**
com um comentário afirmando o contrário. **Revertido**: os dois guards voltaram ao estado de `HEAD`,
`(shared)/lib/discard-request-body.ts` foi apagado e `file.schema.ts` voltou ao estado da 1.ª rodada.

**Sobre o limiar**: não é o `DECLARED_BODY_MAX_BYTES` (4 MiB + 64 KiB). Sem sessão o guard recusa **antes**
de `parseUploadedImage`, então a constante nem é consultada — o corte fica no buffer interno do runtime de
dev (~4 MiB) e **oscila entre execuções**. É mais um indício de que o fenômeno é do servidor de dev.

**Conclusão registrada**: limitação conhecida do `next dev`, **não** defeito de produção, **não**
bloqueante de entrega. Vale como nota para quem for depurar upload localmente e se assustar com um 500 HTML.

### Teste de regressão acrescentado

`apps/api/__tests__/fileUploadRoute.test.ts` — caso parametrizado que fixa o contrato independentemente do
runtime: corpo acima do teto ⇒ **413 `UPLOAD_FILE_TOO_LARGE`**, e **sem sessão** ⇒ **401
`AUTH_INVALID_TOKEN`**, ambos com `content-type: application/json` e `error.code` legível — **nunca** HTML.
**API: 266 → 268 testes.**

## 12.2 Defeito 2 — objeto compartilhado entre dois registros: **concordo, limitação conhecida**

Confirmado por leitura: `deleteObjectQuietly` tem **um único** call site
(`apps/api/app/(routes)/entities/[id]/route.ts:90`) e decide só com o registro em mãos.

**Repro (API):** `POST /entities` com `photo: uploads/<meu-id>/<uuid>.png` ⇒ registro A · o mesmo corpo de
novo ⇒ registro B, mesmo objeto · `PUT /entities/<A>` trocando a foto ⇒ o objeto é apagado · `GET
/entities/<B>` ⇒ `photo` aponta para arquivo inexistente e `photoUrl` vem **assinada para um objeto que não
existe** (a assinatura V4 não verifica existência; o navegador recebe 404 e o `ResponsiveImage` cai no
ícone de fallback).

**Não implementei contagem de referência**, como instruído — e concordo: a UI não chega nesse estado (o
formulário só produz caminho recém-enviado, sempre um UUID novo), o dano é uma miniatura quebrada em vez de
perda de dado, e contagem de referência exige consultar todos os registros que citam o caminho a cada
troca — custo e superfície desproporcionais ao risco. Fica em **§8.7** como limitação conhecida.

## 12.3 Os dois pontos de contexto do QA — registrados, sem ação

- **Rótulo inválido não fica vermelho no dark** (`dark:text-gray-400` vence `text-destructive`).
  Confirmado como **pré-existente e idêntico** em `date-input`, `radio-group-input` e `textarea-input` —
  achado do **design system** para o backlog, não desta entrega. Some-se ao `"Pick a date"` do §2: são dois
  itens do mesmo pacote.
- **`ENTITY_PHOTO_INVALID` inalcançável pela UI é comportamento correto.** O `<input type="url">` sem
  `noValidate` barra caminho de objeto nativamente, e o modo com bucket nem mostra esse campo. A defesa da
  API existe para o chamador que não é a UI. **Não deve ser lido como "critério reprovado"** numa rodada
  futura — é a validação em profundidade funcionando.

## 12.4 Validação no browser desta rodada

**Nada a validar**: a rodada não alterou nenhum código de produção — o diff é um arquivo de teste. As telas
seguem como validadas na §5, e a prova comportamental desta rodada é a medição HTTP contra o build de
produção acima, que é mais forte do que o browser para este defeito.

## 12.5 Gates da 2.ª rodada

| Comando | Resultado |
|---|---|
| `pnpm turbo run lint typecheck test` | ✅ **23/23** |
| `pnpm check` | ✅ 471 arquivos, 0 erro |
| `pnpm --filter api test` | ✅ 25 arquivos / **268** testes |
| `pnpm --filter api build` + `next start` | ✅ build limpo; 401/413/503 com `error.code` em todas as faixas |

## 12.6 Plano de commits — atualização

A divisão **não muda**. A 2.ª rodada só acrescentou casos a um arquivo que já estava no **commit 4**:

- **Commit 4** (`feat(api): accept image uploads on a signed, owner-scoped storage path`) passa a carregar
  também o teste de contrato de recusa. Lista de arquivos **inalterada**.

Os commits 1–3 e 5–14 seguem exatamente como na §10. Nenhum arquivo novo, nenhum removido.
