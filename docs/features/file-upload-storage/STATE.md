---
slug: file-upload-storage
title: Upload de arquivos e storage
task: -
spec: file-upload-storage
branch: spec-sync-backlog-loop
epic: -
updated: 2026-09-14 21:20
---

# Pipeline — Upload de arquivos e storage

| etapa   | status  | quando           | artefato              | resumo (1 linha) |
|---------|---------|------------------|-----------------------|------------------|
| analyze | done    | 2026-09-11 00:58 | analyze/plan.md       | Plano em **13 commits** (`shared` → `auth` → `sdk` → `api` ×3 → `design-system` → `app` ×3 → `internationalization` → config → docs) para **1 rota nova** (`POST /files`, multipart, `requireCommonPanelApi`), **1 módulo no SDK** (`FileActions` + `UploadedFileDTO`), o **8.º `HookForm*`** (o primeiro de arquivo), **6 `error.code`** e `entity.photo` deixando de ser texto livre — com **13 decisões** e **zero dependência nova**: `@google-cloud/storage@7.17.3` **já está instalado** como optional dep de `firebase-admin@13.6.0`, e `firebase-admin/storage` está no mapa de `exports`. As 3 recomendações da spec (`:124-130`) **adotadas**: Firebase Storage, upload atravessando a API, `photo` endurecido. **4 achados que mudam o desenho e não estavam na spec**: 🔴 **`BaseRepository.update` (`base.repository.ts:104-114`) escreve `{...currentData, ...data}` SEM passar pelo mapper**, então todo campo que o `toDTO` emitir é persistido — se `photoUrl` fosse campo obrigatório do DTO, **uma URL assinada e expirada seria gravada no documento a cada edição**; por isso ele é `photoUrl?:` opcional, o mapper não o emite e só o handler o acrescenta (D-3/Q6, `entity.mapper.ts` fica **intocado**); 🔴 **IDOR real na referência**: sem checar o prefixo do caminho, o usuário A põe `uploads/<B>/<uuid>.jpg` na *própria* entidade e a API assina o arquivo de B — o check de posse do handler é sobre a **entidade**, não sobre o arquivo → `ENTITY_PHOTO_INVALID` 400 (D-11); 🔴 **`apps/api/env.ts:37` tem `skipValidation` em dev e isso descarta tudo que vem por `extends`** (documentado em `:23-26`, e já matou o `NEXT_PUBLIC_APP_URL` na feature anterior) — `FIREBASE_STORAGE_BUCKET` **tem** de ser redeclarada no `apps/api/env.ts`, senão o upload nasce morto em todo `pnpm dev`; 🟡 **`javascript:alert(1)` passa hoje nos dois lados** (`URL.canParse` devolve `true`, `entityFormSchema.ts:58`) — o refine restrito a `http(s)` fecha isso de graça (D-9). **Ganho não previsto pela spec**: atravessar a API **dispensa configurar CORS no bucket** (o browser só faz `GET` de imagem na URL assinada, que não é requisição CORS), e a assinatura V4 é **local** porque a service account tem chave privada (`server.ts:50-57`) — sem round-trip e sem o papel IAM `Service Account Token Creator`. **Impersonação sai correta de graça**: `assertReadOnlyWhileImpersonating` já recusa todo método não-seguro, então o admin personificando **vê** as imagens mas não sobe. **N/A explícito e justificado**: Firestore por completo (coleção, campo persistido novo, índice, regra, backfill), `apps/web`, `packages/security`, `queryKeys`, `paths.ts`, `loading.tsx`, `PUBLIC_PATHS`, `cors.ts` (`Content-Type` já está em `ALLOWED_HEADERS` e `multipart/form-data` é safelisted), `instrumentation.ts` e `entity.mapper.ts`. **12 perguntas em aberto**, nenhuma bloqueante, todas decididas |
| develop | done    | 2026-09-11 01:45 | develop/handoff.md    | As **13 unidades** entregues na ordem do plano (`shared` → `auth` → `sdk` → `api` ×3 → `design-system` → `app` ×3 → `i18n` → `firebase.json`+`storage.rules`): `POST /files` com guard, sniffing de magic bytes e teto de 4 MiB; `FileActions`+`UploadedFileDTO` no SDK; `photoUrl` **opcional e derivado** no handler (mapper intocado); posse do caminho conferida no `POST`/`PUT` (`ENTITY_PHOTO_INVALID`); objeto anterior removido **depois** do `update`; `ImageUploadInput`+`HookFormImageUpload` (o 8.º `HookForm*`, recebendo `upload` por prop); `/files` no `RATE_LIMITED_PATHS`; CSP+`remotePatterns` condicionados ao bucket; 6 `apiErrors` + nó `photoUpload` nos 3 idiomas. **Gates: `pnpm turbo run lint typecheck test` 23/23 ✅, `pnpm check` ✅, paridade i18n ✅** (4 arquivos de teste novos, 4 estendidos; nenhum desativado). 🔴 **Desvio que corrige defeito do plano**: `z.string().min(1).optional()` + `??` recusa `""`, e `.env.example` publica `FIREBASE_STORAGE_BUCKET=""` como o jeito de desligar a feature — com o schema literal a **API não sobe** (reproduzido: `instrumentation` → `keys()` → *Too small*); trocado por `\|\|`/`\|\| undefined` em `keys.ts` e `apps/api/env.ts` + 3 testes. *(A mesma armadilha existe em `FIREBASE_WEB_API_KEY` — achado, não corrigido.)* 🟡 Outro desvio de correção: `application/octet-stream` é o que o encoder multipart escreve quando o browser não sabe o tipo, então tratá-lo como "tipo divergente" **recusava upload legítimo com 415** — só declaração concreta é confrontada com os bytes. Mais 6 desvios menores, todos no handoff. **Validação visual feita** (light+dark+mobile 390, pt-br/en/es, 9 screenshots): recusa no cliente (tamanho/SVG, **0 requisição**), recusa no servidor (`.txt` renomeado → **415**), `UPLOAD_FAILED`, `STORAGE_NOT_CONFIGURED`, **401 sem sessão**, **modo degradado** (API sobe, volta o campo de URL), URL legada preservada, `img-src` com o host do bucket só quando configurado. ⚠️ **Caminho feliz NÃO validado**: o Cloud Storage não está ativado no projeto (`firebasestorage…/o` → **404**) — V1/V2/V6/V7/V9 dependem dos pré-requisitos manuais e **não são falha de código** |
| review  | done    | 2026-09-11 10:00 | review/review.md  | **Fechada em 2026-09-14 pelo `/spec --sync`: a PR #11 foi mergeada em `main` (`9154776`), o que resolve o `in-progress` que ficou gravado antes do merge.** — **2.ª rodada (pós-`/test`, §12 do review)**: o QA reportou `POST /files` ⇒ **500 HTML sem `error.code`** para corpo grande. **Reproduzi em `next dev` e investiguei até a causa: o fenômeno é exclusivo do servidor de desenvolvimento.** O **build de produção** (`next build && next start`) responde correto em **todas** as faixas medidas: sem sessão **401** e com sessão **413 `UPLOAD_FILE_TOO_LARGE`** de 4,2 MB a **12 MB**, zero `disturbed or locked` no log. Para isolar a variável, rodei produção **com e sem** a correção tentada — **as duas passam**, logo produção nunca teve o defeito. A correção sugerida pelo QA (`req.body?.cancel()`) foi implementada e **medida**: **não resolve** nem em dev (500 em 4,4/4,7/12 MB); drenar via `arrayBuffer()` só empurra o limiar **e bufferiza o corpo inteiro**, justamente o vetor que o teto por `content-length` fecha. **Revertido tudo** (guards de volta a `HEAD`, `discard-request-body.ts` apagado): manter seria código morto em produção, ineficaz em dev e — no caso do drain — **regressão de segurança com comentário afirmando o contrário**. O limiar **não** é o `DECLARED_BODY_MAX_BYTES`: sem sessão o guard recusa antes de `parseUploadedImage`, então é o buffer do runtime de dev (~4 MiB), e **oscila entre execuções**. **Nenhum código de produção mudou nesta rodada**; entrou **1 teste** parametrizado que fixa o contrato independentemente do runtime (acima do teto ⇒ 413 + `error.code` + `content-type: application/json`, **nunca** HTML; sem sessão ⇒ 401) — API **266 → 268**. **Defeito 2** (dois registros no mesmo objeto): concordo que é **limitação conhecida**, repro documentado no review, **contagem de referência não implementada** (a UI não alcança o estado, o dano é miniatura quebrada, e o custo seria consultar todos os registros a cada troca). Contexto do QA registrado sem ação: rótulo inválido sem vermelho no dark é **pré-existente e idêntico** em `date-input`/`radio-group-input`/`textarea-input` (backlog do design system, junto do `"Pick a date"`), e `ENTITY_PHOTO_INVALID` inalcançável pela UI é **comportamento correto** (o `input type="url"` barra nativamente) — **não deve virar "critério reprovado"**. Gates 2.ª rodada: `turbo run lint typecheck test` **23/23** ✅, `pnpm check` 471 ✅, `pnpm --filter api build` ✅. Plano de commits **inalterado** (o teste entra no commit 4, que já carregava o arquivo). — **1.ª rodada**: revisão contra o `review-checklist.md` com **9 correções aplicadas** e **6 testes novos** (API 248 → **266**); gates verdes (`turbo run lint typecheck test` 23/23, `pnpm check` 470 arquivos, paridade i18n). 🔴 **Bloqueante encontrado na validação visual e corrigido**: `next/image` **lança** `next-image-unconfigured-host` quando o host não está em `remotePatterns`, e como `photo` aceita URL externa arbitrária por design, uma entidade com URL legada **derrubava a página inteira** — tela de erro na **listagem** (pré-existente, `dataIndex` era `photo`) **e** na **edição** (regressão nova: o form antes era um `input type="url"`, agora renderiza preview). Corrigido com prop `unoptimized` no `ResponsiveImage` + os 2 call sites, e a CSP volta a ser a autoridade (host não permitido ⇒ ícone de fallback). Isso **contradiz** o item "URL externa legada" da validação do `/develop`, que reportava fallback funcionando. 🟡 Outras correções: `signReadUrl` estava **fora** do `try` do `POST /files` (escrita OK + assinatura falha ⇒ **500 sem `error.code`**); posse do arquivo virou **fail-closed** (`isUsablePhotoReference`) porque a checagem só disparava se `isStorageObjectPath()` e a regex está **duplicada** em `storage.ts` e `entity.schema.ts` — se divergirem, o valor pula a checagem e ainda é assinado; teto de 4 MiB passou a recusar por `content-length` **antes** de `req.formData()` bufferizar; `withPhotoUrl` deixou de assinar dado legado malformado. **Os 9 pontos céticos confirmados**: reprodução do `FIREBASE_STORAGE_BUCKET=""` **é real** (rodei o schema do plano: *Too small*) e a troca por `\|\|` não abre buraco; `FIREBASE_WEB_API_KEY` tem a **mesma** armadilha e é pior (`keys()` roda em todo acesso a Firestore ⇒ fork novo **não sobe**) — **corrigido**, fora do escopo, revertível (§7.1 do review); `application/octet-stream` **não** é bypass (o allowlist é o `sniffImageType`); IDOR fechado nos **dois** handlers, verificado **contra a API no ar** (5 vetores: uid alheio ⇒ `ENTITY_PHOTO_INVALID`, `..`/bogus/`javascript:` ⇒ `VALIDATION_FAILED`, URL externa ⇒ 200) e header de uid é validado contra o token; URL assinada **nunca** persistida (`currentData` do `update` vem do documento, sem `photoUrl`); delete do objeto antigo **depois** da escrita. Validação visual própria: **9 screenshots** em `review/screenshots/`, light+dark+mobile 390, pt-br/en/es. Achados **não** corrigidos (fora do escopo): `"Pick a date"` literal no `DateInput` (pré-existente, `90152c4`) e `.env.example` da API prometendo um desligamento que o fallback não entrega. ⚠️ **Caminho feliz segue NÃO validado** — Cloud Storage ainda desativado (503 `UPLOAD_FAILED`), pré-requisito **manual** de infra, não falha de código. **Branch**: recomendo `app/feat/file-upload-storage` a partir da atual (`spec-sync-backlog-loop`, == `origin/main`, sem commits próprios) — **não criada**, porque o working tree mistura a auditoria do `/spec --sync` e a decisão de 1 ou 2 branches é do usuário. **Nada commitado**; plano de **14 commits** proposto, com a auditoria do backlog e os artefatos separados no fim |
| test    | done    | 2026-09-11 09:42 | test/criterios-aceite.md | **Fechada em 2026-09-14 pelo `/spec --sync`.** O `blocked` era por **1 defeito** e **6 critérios não verificáveis**. O defeito foi investigado na 2.ª rodada do `/review` e **é exclusivo do servidor de desenvolvimento** — o build de produção responde 413 `UPLOAD_FILE_TOO_LARGE` corretamente em toda a faixa medida, e entrou um teste que fixa o contrato independentemente do runtime. Os **6 critérios seguem não verificados** por falta de infra (Cloud Storage desativado — remedido em 2026-09-14: `firebasestorage…/o` ⇒ **404**), o que é pendência de infra registrada em `docs/PRE-PRODUCTION.md:101-167`, **não** reprovação de código. — **37 critérios** no formato §9.1: **26 PASS · 3 PARCIAL · 2 FALHOU · 6 bloqueados/não verificados**. `blocked` por **2 motivos**: **1 defeito novo** e **6 critérios impossíveis de verificar** enquanto o Cloud Storage não for ativado. **Gates**: `pnpm turbo run lint typecheck test --force` rodado **3×**, 23/23 tasks e exit 0 nas três (748 testes; `app` 202 → **208**), `pnpm test` (raiz) ✅, `pnpm check` **471 arquivos / 0 erro**, paridade i18n ✅. **Flake de `securityPolicySources.test.ts` NÃO reproduziu** — 3 execuções completas do gate + **5 isoladas** do arquivo, sempre 10/10, entre 259 ms e 411 ms (mais de uma ordem de grandeza abaixo do default de 5 s); **terceira auditoria seguida sem reprodução**. **Teste novo**: `apps/app/__tests__/useFileUpload.test.ts` (6 casos — o pedido explícito da revisão), usando `FormattedError`/`handleClientError` **reais** para provar a tradução de verdade: DTO + callback de progresso repassados, `isUploading` em voo e no `finally` da falha, `error.code` traduzido relançado como `Error` (e **não** mais `AxiosError`), locale ativo em `en`/`es`, e `ERR_NETWORK` caindo na copy genérica. ❌ **Defeito novo**: `POST /files` com corpo acima de ~4,06 MiB responde **500 com HTML e sem `error.code`** (`⨯ TypeError: Response body object should not be disturbed or locked`), porque a recusa retorna **sem consumir `req.body`** — isso **anula na prática** o endurecimento por `content-length` que a revisão acrescentou. Limiar medido: 4.194.304 B ⇒ aceito · 4.200.000 B ⇒ **413 `UPLOAD_FILE_TOO_LARGE`** ✅ · 4.404.019 B / 4.718.592 B / 5.242.955 B ⇒ **500** ❌. **Não é regressão da revisão**: isolei que `POST /files` **sem sessão** com corpo de 4,5 MiB também vira 500 em vez de 401, então o guard pré-existente tem o mesmo problema. A UI **não** chega lá (o cliente recusa acima de 4 MiB); atinge chamada direta. Correção sugerida (não aplicada — defeito de produção): `await req.body?.cancel()` antes da recusa antecipada. ❌ **Limitação confirmada com repro**: sem contagem de referência, trocar a foto de um registro **apaga o objeto que outro registro ainda referencia** (`deleteObjectQuietly` tem 1 único call site e não consulta outros registros); sonda executável rodada e **descartada de propósito** — um teste verde afirmando o comportamento errado viraria contrato. ✅ **Bloqueante da revisão reconfirmado por mim, no browser** (não aceitei print de terceiro): listagem **e** edição com URL externa renderizam inteiras, e provei o `unoptimized` pelo DOM — `src` cru com `srcset: null` (com otimizador seria `/_next/image?url=…`), o que também evidencia o custo aceito de perder `srcset`/WebP. **Posse verificada com 2 contas reais**: `GET`/`PUT`/`DELETE` na entidade alheia ⇒ **404 `ENTITY_NOT_FOUND`**, igual a id inexistente; `PUT` com `photoUrl` forjado ⇒ **400 `VALIDATION_FAILED`**. **`ENTITY_PHOTO_INVALID` não é alcançável pela UI em nenhum dos 2 modos** — e o motivo é uma defesa: no modo degradado o campo é `type="url"` sem `noValidate`, então o browser bloqueia o submit antes (medido: `requestSubmit()` ⇒ 0 eventos); confirmado por chamada direta à API. **Modo degradado medido de ponta a ponta** (app reiniciada com a env vazia): campo volta a "Foto (URL)", `validation.photoReference` na tela, e `img-src` **sem** `storage.googleapis.com`. 🟡 Achado pré-existente para o backlog: no tema **escuro** o rótulo do campo inválido não fica vermelho (`dark:text-gray-400` vence `text-destructive` — medido `lab(65,9 −0,8 −8,2)` no dark contra `lab(48,4 77,4 61,5)` no light), idêntico em `date-input`/`radio-group-input`/`textarea-input`. 🔒 **Bloqueados por infra** (Cloud Storage **não ativado** em `next-boilerplate-576d0`; `POST /files` ⇒ 503 `UPLOAD_FAILED`, que é o **esperado**): preview da imagem enviada, impersonação na tela, 403 sem assinatura, expiração da URL, remoção do objeto anterior contra bucket real, miniatura assinada carregando — **marcados como não verificados, nunca como reprovados**. 🔒 Rate limit de `/files` **não verificável localmente**: sem `ARCJET_KEY` o `@repo/security` é no-op (20 POSTs ⇒ 0×429); a entrada em `RATE_LIMITED_PATHS` foi conferida por leitura. **Validação visual**: `agent-browser 0.27.0` em sequência, **16 screenshots** em `test/e2e/`, light + dark + 390 px, pt-br/en/es, incluindo a **barra de progresso em movimento** com "Salvar" desabilitado. **Nada commitado, nenhuma branch criada.** ⚠️ **`test/report.md` não foi gravado** — a escrita foi bloqueada pelo harness; o conteúdo íntegro voltou no retorno do agent para o orquestrador persistir. **Dados de QA criados**: contas `qa-test-upload@example.com` e `qa-test-upload-b@example.com` (senhas locais, **não** registradas em lugar nenhum) e as entidades `Legacy QA URL Entity`, `QA Listed Host Entity` e `QA Owner B Entity` — somadas às de rodadas anteriores são **4 contas de QA acumuladas**, e há pendência aberta no backlog sobre isso |
| observe | pending | -                | -                     | - (opcional)     |

## Notas

### Fechamento — auditado em 2026-09-14

**Entregue.** PR **#11** mergeada em `main` em 2026-09-14T23:53:32Z (merge commit `9154776`,
`feat: entity photo uploads, plus the /cycle command that built them`), CI **verde** nesse SHA
(run `34910857483`, `success`). A spec foi movida de `specs/file-upload-storage.md` para
[`spec.md`](spec.md), com os **5 itens do corte marcados um a um** e a evidência em `arquivo:linha`.

⚠️ **As linhas de `review` e `test` abaixo foram gravadas ANTES do merge** e ficaram atrasadas em
relação ao que foi de fato mergeado. Foram reconciliadas em 2026-09-14 contra o código e o estado da PR,
não contra o que estava escrito aqui.

**O que a PR entregou além da spec:** o comando `/cycle` e seu runner agendável, a política de ciclo, e a
modelagem de `contends_on` no backlog. Nada disso está no corte da spec — é escopo adicional, registrado
aqui para que a leitura do diff não surpreenda.

**Achados do `/review` e do `/test` que a própria PR corrigiu** (e que estavam registrados abaixo como
"não corrigidos"): o rótulo de campo inválido que não ficava vermelho no tema escuro **foi corrigido**
(`packages/design-system/components/ui/label.tsx:20-22`, commit `fix(design-system): keep invalid field
labels red in dark mode`), junto de um defeito vizinho — o `error` do `Input` nunca era desestruturado e
vazava como atributo desconhecido para o `<input>` (`input.tsx:12`). A validação de `photo` que só existia
no navegador **também foi fechada** (`entity.schema.ts:19-30`, `refine` restrito a http(s) ou caminho de
objeto, nos dois schemas).

**Achados que sobrevivem** e foram devolvidos ao backlog: o literal `"Pick a date"` no `DateInput`
(`date-input.tsx:50`), o `.env.example` da API prometendo um desligamento que o fallback não entrega
(`apps/api/.env.example:15-18` contra `apps/api/env.ts:40-43` — as duas frases se contradizem dentro do
mesmo comentário), e a ausência de contagem de referência de objetos no storage
(`deleteObjectQuietly` tem **um** call site, `entities/[id]/route.ts:90`, e não consulta outros registros).

### Origem

- **Spec**: `specs/file-upload-storage.md` — **#1 da fila** do `specs/BACKLOG.md` desde o `/spec --sync`
  de 2026-09-11 (`value: alto`, `effort: M`, `audience: produto`, `mode: ambos`, `depends_on: []`).
  **A spec continua em `specs/`** durante o desenvolvimento — movê-la para
  `docs/features/file-upload-storage/spec.md` é do `/spec --sync`.
- **É o único bloqueio restante de `account-settings`**, que por sua vez bloqueia
  `account-security-mfa` e `data-rights-lgpd`. Cadeia de três níveis — daí a insistência do plano em
  manter `POST /files`, `FileActions`, `useFileUpload` e `HookFormImageUpload` **genéricos**: o avatar da
  tela de conta precisa reusá-los sem tocar em nada.
- Nota de pesquisa citada pela spec: `specs/research/saas-starter-feature-benchmark.md` — prevalência
  **6/10**, faixa "esperado, não diferencial", com duas armadilhas explícitas (**validar MIME e tamanho no
  servidor**, **bucket não público**) que viraram, respectivamente, o §10.4 e o §6 do plano.
- Nenhum card, wiki, Figma ou print. **Referências não lidas: nenhuma.**

### Aviso sobre o worktree

Existem **dois checkouts** do repo na máquina e eles divergem. Tudo neste plano foi lido de
`conductor/workspaces/next-boilerplate/surabaya`, que está **à frente** de `~/next-boilerplate`.
Um dos subagents de exploração leu o checkout errado e reportou, entre outras coisas, um `BaseClient`
diferente e um `PaymentsActions` que **não existe** aqui — os arquivos load-bearing foram todos
reconferidos diretamente. Se o `/develop` rodar noutro cwd, o plano não bate.

### Decisões de produto adotadas (não re-litigar)

O `/analyze` rodou em modo contínuo, sem interrupção. As 3 perguntas em aberto da spec (`:122-130`)
foram resolvidas **adotando a recomendação da própria spec**:

1. **Upload atravessa a API**, não vai direto ao bucket. → D-2/Q2. Migrar só se o teto de corpo virar
   problema **medido**.
2. **Firebase Storage**, não S3. → D-1/Q1.
3. **`entity.photo` endurecido**, aceitando URL absoluta como plano de convivência. → D-9/Q7.

### Verificação das refs da spec (2026-09-11)

Todas reabertas e **confirmadas**: `firebase.json` (6 linhas, sem bloco `storage`),
`packages/sdk/src/types/entity/entity.ts:14` (`photo: string | null`),
`apps/api/(shared)/validation/entity.schema.ts:7,23,34` (`PHOTO_URL_MAX = 2048`, o mesmo
`z.string().trim().max()` **idêntico** no create e no update),
`entity.mapper.ts:19` (`toDTO`) e `:32-52` (`toPersistence`, com `"photo"` em `:41` — e **sem chamador**),
`packages/design-system/components/form/hookform/` (**7** componentes, nenhum de arquivo),
`responsive-image.tsx:16` (78 linhas) e `:27-29` (`src` vazio → `return <></>`, sem placeholder),
os 7 `keys.ts` (nenhum declara bucket). Grep de
`getStorage|firebase-storage|@aws-sdk|S3Client|uploadthing` em `apps/` + `packages/`: **zero**.
`multipart/form-data` no repo: só `packages/shared/utils/helpers/formattedError.ts:115`.

**Três precisões sobre a spec**, nenhuma altera o corte e por isso a spec **não foi editada**:

- A spec diz que nenhum `keys.ts` declara bucket — correto —, mas **`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  já existe** em `apps/app/.env.example:34`, `apps/web/.env.example:29`, `docs/SETUP.md:48` e
  `packages/auth/client.ts:51`. A env "nova" que o fork precisa é, na prática, **uma que ele talvez já
  tenha preenchido** — o plano só passa a validá-la e a usá-la como liga/desliga.
- `formattedError.ts` **já antecipa upload**: `isUploadRequest` (`:104-128`) detecta
  `multipart/form-data`/`FormData`/URL com `file|upload|image`, e `formatStatus` (`:163-165`) devolve
  `PAYLOAD_TOO_LARGE` quando a requisição morre **sem resposta**. Nenhuma linha nova no `packages/shared`
  além do `415`.
- O `photoHint` do dicionário (`entities.ts:30-31`, nos 3 idiomas) já diz *"Em produção, substitua por
  upload para storage"*. A chave **fica**: passa a ser a copy do modo sem storage (D-7/Q10).

### Achados para o `/spec --sync` (registrados, não corrigidos aqui)

- 🔴 **`docs/SECURITY.md:29-33` e `docs/PRE-PRODUCTION.md:23-25` estão errados**: afirmam que as
  `firestore.rules` **não** estão publicadas e que a base está aberta. A medição de hoje devolve **403**.
  Fora de escopo desta tarefa (Q8), mas o `storage.rules` novo foi escrito **sem** repetir a afirmação.
- 🟡 **`docs/SECURITY.md:106` está desatualizado**: diz que o rate limit cobre 3 rotas; o código lista
  **7** (`apps/api/proxy.ts:33-41`). Com `/files`, passam a ser **8**.
- 🟡 **`components/ui/index.ts:61` (`export * from './responsive-image'`) não reexporta nada**:
  `ResponsiveImage` é `export default` e `ResponsiveImageProps` não é exportado. Por isso os dois call
  sites importam pelo caminho concreto, contrariando `packages/CLAUDE.md:35`. O plano **contorna** em vez
  de refatorar (mudanças mínimas).
- 🟡 **`rounded-full` é hardcoded no wrapper do `ResponsiveImage`** (`:33`), antes do `className` — o
  preview do upload sai circular e não há prop para mudar isso.
- ⚪ **`entity.mapper.ts:32-52` (`toPersistence`) é código morto** — nenhum chamador. Existe só para
  satisfazer o contrato abstrato de `Mapper`.

### Restrições de processo

- **Nenhuma branch criada, nada commitado.** A branch atual é `spec-sync-backlog-loop` (não protegida).
  Quem nomeia e cria branch é o `revisor-codigo`.
- ⚠️ **O working tree tem ruído anterior ao `/develop`**: `specs/*.md`, `specs/BACKLOG.md` e o rename
  `specs/auth-recovery-verification.md → docs/features/auth-recovery-verification/spec.md` vieram do
  `/spec --sync` que criou esta branch. **Não entram nos commits desta feature.**
- **`RATE_LIMITED_PATHS` não é automático** (`apps/api/proxy.ts:43-45`, `Array.includes`, match exato).
  A string `/files` tem de entrar **literalmente**, senão o endpoint é escrita ilimitada no bucket do
  fork. Commit 6 do plano.
- **`apps/api/env.ts` — redeclaração obrigatória.** Ver o achado 🔴 no resumo do `analyze`. Sem isso, a
  feature funciona no build e falha em todo `pnpm dev`.
- **`instrumentation.ts` NÃO muda.** Bucket ausente é estado de negócio válido (opt-in). Crashar no boot
  violaria o item 5 do corte.
- **CSP é allowlist explícita.** `apps/app/proxy.ts:46-49` + `apps/app/next.config.ts:20-25` — sem as
  duas edições a imagem é bloqueada em runtime. A entrada é **condicionada** ao bucket configurado
  (padrão `isAnalyticsEnabled`, `proxy.ts:28-30`), para um fork sem storage não alargar a própria CSP.
  Host único e estático: `https://storage.googleapis.com` (URL assinada V4 é path-style).
- **Paridade i18n sai de graça**: `parity.test.ts:15-22` varre recursivamente, sem lista fixa. Os 6
  `apiErrors` e o nó `photoUpload` são cobertos sem uma linha de teste. Rodar `/i18n-sync`.
- **`HTTP_STATUS` ganha uma linha** (`UNSUPPORTED_MEDIA_TYPE: 415`) — não existe hoje
  (`packages/shared/utils/helpers/httpStatus.ts`), e o precedente direto é o `503` acrescentado pela
  feature anterior.
- **Validação visual é obrigatória** (regra de ouro 11): roteiro **V1–V13** na §8 do plano, incluindo a
  prova de que a recusa não é do navegador (V5, `curl` com magic bytes erradas), o 403 do bucket sem
  assinatura (V7), o modo opt-in desligado (V8) e a impersonação (V9). `agent-browser` **em sequência**.
- **Não adicionar nada ao `turbo.json`**: `lint`/`typecheck`/`test` têm `env: []` de propósito.

### Ordem de commit (do plano, §10.15)

`shared` (415) → `auth` (bucket na env + `getStorageAdmin`) → `sdk` (`FileActions` + `photoUrl`) →
`api` (storage + validação + rota → `entity` endurecido + `photoUrl` + remoção do antigo → rate limit +
env) → `design-system` (`ImageUploadInput` + `HookFormImageUpload`) → `app` (env/CSP → hook + schema →
telas) → `internationalization` (6 `apiErrors` + copy) → config (`firebase.json` + `storage.rules`) →
`docs(features)`. Um commit por app/pacote, testes junto da funcionalidade que cobrem.
**Implementar o i18n primeiro** (é a fonte dos tipos de copy) e commitá-lo por último, com `git add` por
caminho.

### Pré-requisitos MANUAIS de infra (o `/develop` não consegue; o `/test` não deve reprovar por eles)

1. **Ativar o Cloud Storage for Firebase** no console (`.firebaserc` → `next-boilerplate-576d0`) — cria o
   bucket default.
2. **Preencher** `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (`apps/app`) e `FIREBASE_STORAGE_BUCKET`
   (`apps/api`), local e na Vercel.
3. **Conferir o IAM**: a service account precisa de `roles/storage.objectAdmin` no bucket.
4. **Publicar**: `npx -y firebase-tools@latest deploy --only storage` (`--dry-run` antes).
5. **Não** conceder `allUsers`/`allAuthenticatedUsers`, **não** `makePublic()`, **não** `getDownloadURL()`
   (esse último produz URL permanente e pública — o oposto do item 3 do corte).
6. **Não é preciso** configurar CORS no bucket — consequência de o upload atravessar a API.

⚠️ Sem 1 e 2, o comportamento esperado é: app sobe, `pnpm build` passa, campo de upload **ausente** (o de
URL aparece no lugar) e `POST /files` responde `STORAGE_NOT_CONFIGURED` 503. **Isso é o item 5 do corte
funcionando, não uma falha.**

⚠️ **`storage.rules` governa `firebasestorage.googleapis.com`, não `storage.googleapis.com`.** Publicar
deny-all fecha o acesso direto do client SDK; o que fecha o endpoint do GCS é a **ausência** de IAM
público no bucket. São duas coisas, e o corte precisa das duas.
