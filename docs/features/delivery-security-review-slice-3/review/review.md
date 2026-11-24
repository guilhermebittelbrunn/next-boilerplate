# Revisão: fatia 3 da revisão de segurança (arestas)

Rodou dentro do `/cycle`, sem perguntas. Fontes: [`analyze/plan.md`](../analyze/plan.md),
[`develop/handoff.md`](../develop/handoff.md) e o diff que sobra depois dos arquivos da fatia 2
([`../../delivery-security-review-slice-2/review/review.md`](../../delivery-security-review-slice-2/review/review.md)).
Nada foi commitado.

## Branch

- **`feat/delivery-security-hardening`**, a mesma da fatia 2, criada pelo `/review` daquela fatia. Não troquei
  nem criei outra. Regex do `/review`: `branch OK: feat/delivery-security-hardening`.

## Revisão: fatia 3

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/api/(shared)/validation/file.schema.ts:141-152`: a leitura do corpo por `readCappedBody` ficava fora do
  `try`. Se o stream falhasse no meio (cliente que desiste do envio), o `reader.read()` rejeitava e a rota
  respondia 500 sem `error.code`. Antes desta fatia, o `req.formData()` estava dentro do `try` e a mesma falha
  virava `400 UPLOAD_FILE_MISSING`. **Corrigido**: a leitura entrou no `try` junto com o `formData()`, como já
  é em `parse-request-json.ts`. Teste novo em `apps/api/__tests__/uploadedImageValidation.test.ts`
  ("refuses a body whose stream fails mid-read with a code instead of throwing").
- `apps/api/(shared)/validation/file.schema.ts:120-129`: `stripImageMetadata` era chamado sem rede. A leitura
  do parser não achou caminho que lance (todas as leituras de `readUInt*` têm o limite conferido antes), mas
  uma exceção ali seria 500. **Corrigido**: `stripImageMetadataOrNull` converte qualquer exceção em `null`, que
  a rota já transforma em `415 UPLOAD_FILE_TYPE_NOT_ALLOWED`.
- `docs/delivery/01-security-review.md:39-42` (item 1.1): dizia que "os pacotes que leem essas chaves"
  importam `server-only`, citando `auth`, `payments` e `email`. O `@repo/security` lê a chave do Arcjet
  (`packages/security/keys.ts:23-26`) e não importa `server-only`. **Corrigido**: a frase fala dos pacotes de
  integração e diz por que a chave do Arcjet não vaza para o navegador (sem prefixo `NEXT_PUBLIC_`, ela chega
  vazia no bundle).

### 🟢 Sugestão / nit

- `apps/api/(shared)/lib/image-metadata.ts`, custo com entrada hostil. Medi com um script fora do repo
  (`node --experimental-strip-types`, entradas de 4 MiB montadas à mão). Nenhuma exceção e nenhum laço
  infinito, mas o pior caso custa memória:

  | entrada | tempo | heap | saída |
  |---------|-------|------|-------|
  | JPEG com 2 milhões de marcadores `RST` soltos | 394 ms | +242 MB | aceito |
  | JPEG com 1 milhão de segmentos de 4 bytes | 335 ms | +143 MB | aceito |
  | WebP com 524 mil chunks `ALPH` vazios | 116 ms | +66 MB | aceito |
  | PNG com 350 mil `IDAT` vazios | 60 ms | +24 MB | aceito |

  O custo vem de um objeto `Buffer` por bloco copiado. A rota exige login, está na lista estrita do limite de
  requisições, e a memória é liberada no fim da requisição. Na primeira passada não corrigi; o `/test` mediu o
  mesmo custo pelo endpoint e ele foi corrigido na rodada 2 (seção no fim).
- O removedor aceita estrutura sem pixel: `FFD8 FFD9` sai como JPEG de 4 bytes, e um RIFF com tamanho 0 sai
  como WebP de 12 bytes. O sniff de antes desta fatia já aceitava cabeçalho seguido de zeros, então não é
  regressão. Fica registrado.
- `packages/email/package.json` não declara `server-only`. Resolve pelo `public-hoist-pattern[]=*` do `.npmrc`,
  igual ao `@repo/auth`, que também não declara. Declarar mexeria no lockfile; mantido.
- `pnpm --filter email build` já quebrava antes desta fatia (`motion-dom` no `@react-email/preview-server`,
  medido pelo `/develop` com e sem a linha). O `apps/email` só lê `packages/email/templates`, que não importam
  o `index.ts`. Achado para o `/spec --sync`.

### ✅ OK

- **Parser contra entrada hostil** (`image-metadata.ts`), por leitura e pelo script acima:
  - segmento JPEG com tamanho 0 ou 1 → `null` (`:230`); todo segmento avança no mínimo 2 bytes, todo marcador
    avulso avança 1, então o laço sempre progride;
  - tamanho de segmento que passa do fim → `null` (`:229-231`); `SOS` sem fim → `null` (`:302-305`); arquivo
    só de `FF` → `null`;
  - EXIF com offset de IFD `0xFFFFFFFF` ou contagem de 65535 entradas truncada → orientação ignorada, sem
    leitura fora do buffer (`:121-129`);
  - chunk PNG com length `0xFFFFFFFF` → `null` (`:363-367`); o cálculo é em `number`, não estoura;
  - RIFF com tamanho maior que o arquivo → `null` (`:395-398`); chunk com tamanho enorme → `null`
    (`:413-416`); tamanho menor que o arquivo → o que sobra depois é descartado;
  - nenhuma das 15 entradas do script lançou exceção.
- **Allowlist de host** (`entity-photo.ts:21-37`): `new URL` e depois `EXTERNAL_IMAGE_HOSTS.has(url.hostname)`,
  comparação exata. Também exige `https:`, sem usuário, sem senha e sem porta. O parser de URL põe o host em
  minúsculas; `lh3.googleusercontent.com.evil.example` e host com ponto final ficam de fora. O host bate com o
  `GOOGLE_AVATAR_ORIGIN` da CSP (`apps/app/proxy.ts:25`) e com o `remotePatterns` (`apps/app/next.config.ts:25`).
  O único lugar da API que grava avatar é `account/route.ts`.
- **`readCappedBody`** (`read-capped-body.ts`): mesmo código do `readCapped` que saiu de
  `parse-request-json.ts`, com o teto como parâmetro. A chamada continua dentro do mesmo `try` e com o mesmo
  teto (`REQUEST_JSON_MAX_BYTES`). Comportamento de `parseRequestJson` igual.
- **`server-only` em `@repo/email`**: só a `apps/api` importa o entry point (`auth-action-links.ts`,
  `organization-invitation.ts`, `account/email/route.ts`). Os `env.ts` usam `@repo/email/keys`, que não importa
  o `index.ts`. Os testes da API mocam `@repo/email`; os do pacote mocam `server-only`, e `serverOnly.test.ts`
  prova que a importação real recusa.
- **`sign-in.tsx` removido**: `git grep "auth/components"` em `apps` e `packages` não acha importador; o
  export saiu do `package.json`. Nenhum doc fora de `specs/` e `docs/features/` cita o arquivo.
- **Avatar reenviado** (`account/route.ts:55`): `value !== stored` antes da allowlist, no mesmo molde que a
  edição de entidade já usava (`entities/[id]/route.ts:73-77`).
- **Cadastro da landing** (`sign-up-form-client.tsx:82-85`): uma flag só (`isSubmitting`) nos dois botões.
- **Comentários**: os novos explicam porquê e nenhum cita o fluxo.
- **i18n**: nenhuma chave nova; os quatro códigos que passam a sair em casos novos já existem nos três idiomas.
- **Corte da spec**: os quatro itens da fatia 3 de `specs/delivery-security-review.md` estão no diff.

### 👁 Verificar no `/test`

Por ordem de risco. O primeiro sustenta a promessa principal da fatia (foto sem GPS e ainda abrindo).

1. **Upload real com o emulador de Storage** (V2). Enviar JPEG com EXIF de GPS e `Orientation=6`, PNG com
   `tEXt`/`eXIf` e WebP com EXIF; baixar o objeto gravado e conferir: sem a string de GPS, `APP1` de 36 bytes
   no JPEG, a foto em retrato no painel e `naturalWidth > 0` nas três. O `/develop` provou só com
   `sips`/`dwebp`, não em navegador.
2. **Corpo `chunked` de 6 MiB em `POST /files`** (V3) contra `next start`: esperado `413 UPLOAD_FILE_TOO_LARGE`
   com `connection: close`. O unitário mede o stream da Web API, não o `Readable` do Node por baixo do Next.
3. **Cliente que corta o envio no meio** (correção desta revisão): `curl` com `--limit-rate` e `Ctrl+C` (ou
   `--max-time 1`) num upload grande; o log da API não pode mostrar erro não tratado, e um cliente que ainda
   lê a resposta recebe 400 `UPLOAD_FILE_MISSING`.
4. **Allowlist** (V4): `PUT /account` e `PUT /entities/:id` com bearer e URL `https://cdn.example.com/a.png` →
   400 com o código; `https://lh3.googleusercontent.com/a` → aceito. No navegador, salvar o perfil de uma
   conta com URL externa antiga já gravada no avatar → sucesso.
5. **Cadastro da landing** (V1): com o popup do Google aberto, os dois botões ficam `disabled`; com o envio por
   e-mail pendente, idem.
6. **E2E filtrado** (V6): `signUp`, `accountSettings`, `entityCrud`.
7. **Contagens da suíte** do handoff (`api` 1810, `web` 313, `@repo/email` 209): não remedidas aqui. A
   `uploadedImageValidation` passou de 20 para 21 testes com a correção.
8. 🔒 O teto em `chunked` dentro de uma função da Vercel.

## Correções aplicadas

| arquivo | o que mudou |
|---------|-------------|
| `apps/api/(shared)/validation/file.schema.ts` | leitura do corpo dentro do `try` (stream que falha → 400 `UPLOAD_FILE_MISSING`, não 500); `stripImageMetadataOrNull` converte exceção do removedor em 415 |
| `apps/api/__tests__/uploadedImageValidation.test.ts` | caso novo: stream que falha no meio da leitura → 400 `UPLOAD_FILE_MISSING` |
| `docs/delivery/01-security-review.md` | item 1.1 deixa de dizer que todo pacote que lê chave secreta importa `server-only`; explica o caso do `@repo/security` |

Teste que alterei, rodado: `npx vitest run __tests__/uploadedImageValidation.test.ts __tests__/imageMetadata.test.ts`
em `apps/api` → 48 passaram (21 + 27).

## Raio de impacto (contrato)

- `@repo/auth`: o subpath `@repo/auth/components/sign-in` deixou de existir. Sem importador.
- `@repo/email`: o entry point recusa importação fora do servidor. Subpaths `keys` e `templates/*` sem mudança.
- `apps/api`: `isUsablePhotoReference` e `isAttachablePhoto` ficaram mais restritos (URL fora da allowlist →
  `ENTITY_PHOTO_INVALID`/`ACCOUNT_AVATAR_INVALID`); `UploadResult.size` passa a ser o tamanho gravado. O único
  `.size` lido no front é o do arquivo local antes do envio.
- `@repo/sdk` e `@repo/internationalization`: sem mudança.

## Lacunas de teste

| lacuna (do handoff) | veredito |
|---------------------|----------|
| WebP animado e WebP com `ALPH` separado sem fixture | continua aberta; coberto só por leitura da lista de permissão |
| Orientação gravada com tipo diferente de `SHORT` sem teste | continua aberta |
| Edição de entidade com foto `lh3` nova coberta só pela função, não pela rota `PUT` | continua aberta |
| Falha do stream no meio da leitura do upload | **fechada aqui** (teste novo, junto com a correção) |

## Decisões em aberto

Nenhuma.

## Gates

| gate | comando | resultado |
|------|---------|-----------|
| lint/format | `pnpm check` | `Checked 1120 files in 670ms. No fixes applied.` |
| typecheck | `pnpm turbo run typecheck --filter=api --filter=web --filter=app --filter=@repo/auth --filter=@repo/email` | `Tasks: 5 successful, 5 total` (3 do cache) |
| i18n | não rodado | nenhum arquivo de `packages/internationalization` mudou |
| testes alterados | `npx vitest run` nos dois arquivos acima | 48/48 |

## Plano de commits

O plano combinado da rodada (fatia 2, fatia 3 e a tarefa `e2e-org-ownership-flake-and-web-api-url`) está em
[`../../app-footer-focus-not-obscured/review/review.md`](../../app-footer-focus-not-obscured/review/review.md),
seção "Plano de commits combinado da rodada" (recomposto quando as tarefas seguintes da rodada entraram). Os commits desta fatia mantêm mensagens e arquivos; as correções de
documentação saem num commit `docs` único da rodada, porque `SECURITY.md`, `01-security-review.md`,
`PRE-PRODUCTION.md` e `SETUP.md` têm trechos de mais de uma mudança.

Varredura de segredo em `docs/features/delivery-security-review-slice-3/`: nenhuma senha, chave, token real ou
e-mail de pessoa. A "string de GPS" do handoff é fictícia e não aparece no texto.

## Rodada 2: custo de memória do removedor de metadados

### Defeito

O `/test` mediu pelo endpoint real (`POST /files`, `next start` da `api`) o que a primeira passada tinha visto só
na função: um JPEG de 4 MiB com 2.097.150 marcadores `RST` soltos entre segmentos subia o RSS do `next-server` em
301 MB por requisição, e quatro em paralelo chegavam a 793 MB. O arquivo era aceito (201) e gravado. A causa
estava em `apps/api/(shared)/lib/image-metadata.ts`: cada bloco mantido virava um `Buffer` próprio
(`Buffer.from([0xFF, marcador])` por marcador avulso, `Buffer.concat` por segmento JPEG, `subarray` por chunk PNG,
`Buffer.from` por chunk WebP) antes do `Buffer.concat` final. É código novo desta fatia, numa rota de upload
autenticada, então foi tratado como defeito da entrega.

### Correção

Das duas hipóteses do `/test`, ficou a que não muda a saída: guardar intervalos em vez de pedaços. Recusar JPEG
com marcadores avulsos demais mudaria o que o removedor aceita e esbarraria na decisão do `/develop` de pular
bytes soltos para não recusar JPEG legítimo; não foi preciso.

- Classe `KeptBytes` (`image-metadata.ts:103-160`): registra cada bloco mantido como par `[início, fim)` de
  offsets num `number[]`, funde o bloco com o anterior quando são contíguos e, no fim, copia tudo num único
  `Buffer.alloc` do tamanho final. O `APP1` mínimo da orientação, único trecho que não vem do arquivo, entra
  como inserção na posição certa.
- JPEG: o segmento passa a ser copiado como intervalo do próprio arquivo (o marcador sempre vem logo depois de
  um `0xFF`, então o segmento começa dois bytes antes de `next`). O payload só é recortado para os `APPn`, que
  precisam ser identificados; `readJpegSegment`, que montava um `Buffer` por segmento, virou `jpegSegmentEnd`,
  que só calcula o fim.
- PNG e WebP usam o mesmo coletor. No WebP, o byte de flags do `VP8X` é limpo depois da cópia, pelo offset na
  saída, em vez de copiar o chunk só para alterá-lo.

### Números (função pura, processo novo por caso, entradas de 4 MiB)

Script descartável em `/tmp`, apagado no fim. RSS e heap medidos antes e depois da chamada.

| entrada | antes | depois |
|---------|-------|--------|
| JPEG com 2.097.150 `RST` soltos (o caso do `/test`) | 341 ms, RSS +315 MB, heap +257 MB | 24 ms, RSS +5 MB, heap +1 MB |
| JPEG com 1 milhão de segmentos `DHT` de 4 bytes | 330 ms, RSS +174 MB, heap +121 MB | 22 ms, RSS +5 MB, heap 0 |
| JPEG alternando `RST` mantido e `COM` descartado | 245 ms, RSS +137 MB, heap +87 MB | 40 ms, RSS +33 MB, heap +25 MB |
| WebP com 524 mil chunks `ALPH` vazios | 115 ms, RSS +99 MB, heap +65 MB | 38 ms, RSS +5 MB, heap +1 MB |
| WebP alternando `ALPH` mantido e `EXIF` descartado | 79 ms, RSS +61 MB, heap +29 MB | 46 ms, RSS +19 MB, heap +17 MB |
| PNG com 350 mil `IDAT` vazios | 62 ms, RSS +72 MB, heap +38 MB | 23 ms, RSS +5 MB, heap 0 |

O pior caso que sobra é o de blocos mantidos e descartados alternados, que não dá para fundir: um par de offsets
por bloco, em torno de 33 MB num arquivo de 4 MiB.

Saída idêntica: o mesmo script comparou a versão anterior com a nova, byte a byte, em 200.006 entradas (6
imagens montadas à mão com EXIF, XMP, ICC, `COM`, `RST`, `VP8X`, cauda depois do fim, mais 200 mil mutações
aleatórias delas, com truncamento e tipo trocado) e nas três entradas grandes. Zero divergência, inclusive em
quais entradas viram `null`; nenhuma exceção.

### Teste novo

`apps/api/__tests__/imageMetadata.test.ts`, bloco "cost on files made of many tiny blocks", três casos (JPEG
com 100 mil `RST` soltos, PNG com 100 mil `IDAT` vazios, WebP com 100 mil `ALPH` vazios). Cada um confere que a
saída é igual à entrada, byte a byte, e conta as chamadas a `Buffer.alloc`, `Buffer.allocUnsafe`,
`Buffer.from`, `Buffer.concat` e `Buffer.prototype.subarray` durante a remoção: tem de ficar abaixo de 10. Não
há asserção de tempo nem de heap. Com a versão anterior do arquivo no lugar, os três falham (medido trocando o
arquivo e restaurando); com a nova, passam.

### Gates da rodada 2

| gate | resultado |
|------|-----------|
| `npx vitest run __tests__/imageMetadata.test.ts __tests__/uploadedImageValidation.test.ts` (em `apps/api`) | 54/54 (33 + 21) |
| `pnpm check` | `Checked 1120 files … No fixes applied.` |
| `pnpm turbo run typecheck --filter=api` | `Tasks: 1 successful, 1 total` |

### Para o `/test` remedir

- O mesmo roteiro da seção "Medição de memória com JPEG hostil" do `test/report.md`: JPEG hostil de 4 MiB em
  `POST /files` contra `next start`, um envio e quatro em paralelo, RSS do `next-server` amostrado. Esperado:
  pico perto do controle (+60 MB no primeiro envio de um JPEG comum), não +301 MB.
- Repetir o upload real das três imagens (item 1 da lista "Verificar no `/test`"): a saída deveria ser a mesma
  de antes, mas o caminho de cópia mudou.

### Plano de commits

Sem mudança de conteúdo. `image-metadata.ts` e `imageMetadata.test.ts` já estão no commit
`feat(api): strip image metadata and cap chunked uploads while reading` do plano combinado.

Commits realizados: _(preenchido pelo orquestrador)_
