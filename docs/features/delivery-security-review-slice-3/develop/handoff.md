# Handoff do `/develop`: fatia 3 da revisão de segurança (arestas)

Plano: [`analyze/plan.md`](../analyze/plan.md). Rodou dentro do `/cycle`, sem perguntas. Nada foi commitado e
nenhuma branch foi criada. O índice está vazio (`git diff --cached --stat` sem saída). A fatia 2, que está no
mesmo working tree sem commit, não foi tocada em nenhum arquivo de código ou de teste.

## Blueprint → arquivos

| item | arquivos |
|------|----------|
| B1 leitor com teto compartilhado | `apps/api/(shared)/lib/read-capped-body.ts` (novo; `readCappedBody(body, maxBytes): Promise<Buffer<ArrayBuffer> \| null>`), `apps/api/(shared)/lib/parse-request-json.ts` (o laço `readCapped` saiu e virou chamada ao helper) |
| B2 remoção de metadados | `apps/api/(shared)/lib/image-metadata.ts` (novo; `stripImageMetadata(body, type)`, com `stripJpeg`, `stripPng`, `stripWebp`) |
| B3 parser do upload | `apps/api/(shared)/validation/file.schema.ts` (`refuseTooLarge` com `connection: close` nos três 413; leitura por `readCappedBody` com teto `DECLARED_BODY_MAX_BYTES`; `formData()` montado a partir dos bytes lidos; `stripImageMetadata` depois do sniff; `size` passa a ser o tamanho gravado; JSDoc de `exceedsDeclaredLength` atualizado) |
| B4 allowlist de host | `apps/api/(shared)/lib/entity-photo.ts` (`EXTERNAL_IMAGE_HOSTS`, `isAllowedExternalImageUrl`; `isUsablePhotoReference` usa a allowlist no lugar de `isAbsoluteHttpUrl`, que continua na leitura) |
| B5 avatar reenviado | `apps/api/app/(routes)/account/route.ts` (`resolveAvatar(raw, ownerId, stored)`, chamado com `previousAvatar`) |
| B4 comentário da edição | `apps/api/app/(routes)/entities/[id]/route.ts` (só o comentário: "or an image on an allowed host") |
| B6 cadastro da landing | `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx` (`isSubmitting` nos dois botões) |
| B7 componente legado | `packages/auth/components/sign-in.tsx` apagado (sem `git rm`: aparece como ` D` no status); export `./components/sign-in` removido de `packages/auth/package.json` |
| B8 `server-only` | `packages/email/index.ts` (primeira linha) |
| B9 docs | `docs/SECURITY.md` (dois bullets novos na seção de Storage, depois do bullet do upload; frase do `/files` no parágrafo do teto de corpo), `docs/delivery/01-security-review.md` (1.1, 1.11, 1.17), `docs/PRE-PRODUCTION.md` (§6, tabela "Sem Storage", linhas da foto da entidade e do avatar) |
| testes | `apps/api/__tests__/imageMetadata.test.ts` (novo), `uploadedImageValidation.test.ts`, `entityPhotoReference.test.ts`, `accountAvatar.test.ts`, `accountRoute.test.ts`; `apps/web/__tests__/signUpFormSubmitLock.test.tsx`; `packages/email/__tests__/serverOnly.test.ts` (novo), `credentials.test.ts`, `logPrivacy.test.ts`, `sendEmail.test.ts` (`vi.mock("server-only", () => ({}))`) |

Nos três documentos, os trechos desta fatia caem em hunks separados dos da fatia 2 (`git diff -U0`):
`SECURITY.md` em `:109` e `:227` (fatia 2 entre `:173` e `:217`); `01-security-review.md` em `:39`, `:232` e
`:353` (fatia 2 em `:211-224`, `:371`, `:390`); `PRE-PRODUCTION.md` em `:406` (fatia 2 em `:383-387`, `:498-501`,
`:1124-1128`). O par mais próximo é `01-security-review.md` `:224` (fatia 2) e `:232` (esta), separáveis com o
contexto padrão de 3 linhas.

## Contrato

- `@repo/sdk`: nada mudou. `UploadResult.size` continua `number`, agora com o tamanho gravado (menor ou igual ao
  enviado). O único `.size` lido no front é o do arquivo local antes do envio.
- `@repo/auth`: o subpath `@repo/auth/components/sign-in` deixou de existir.
  `git grep -n "auth/components" -- apps packages ':!*.md'` não acha importador.
- `@repo/email`: o entry point (`@repo/email`) recusa importação fora do servidor. Os subpaths
  `@repo/email/keys` (importado pelos `env.ts` de `api`, `app` e `web`) e `@repo/email/templates/*` não
  importam o `index.ts` e não mudam. Importadores do entry point: só arquivos da `apps/api`
  (`git grep -n '"@repo/email"' -- apps packages`).
- `entity-photo.ts` exporta `isAllowedExternalImageUrl` (novo). `isUsablePhotoReference` e `isAttachablePhoto`
  mantêm a assinatura e ficaram mais restritos.

## Códigos de erro

Nenhum novo. Passam a sair em casos novos `ENTITY_PHOTO_INVALID` e `ACCOUNT_AVATAR_INVALID` (URL fora da
allowlist), `UPLOAD_FILE_TOO_LARGE` (corpo sem `content-length` acima do teto, agora com `connection: close`) e
`UPLOAD_FILE_TYPE_NOT_ALLOWED` (estrutura que o removedor não percorre). Os quatro já existiam nos três idiomas;
nenhuma chave de i18n foi tocada.

## Desvios em relação ao plano

1. **Tamanho do `APP1` mínimo.** O plano diz "34 bytes". O campo de tamanho vale `0x0022` (34), mas o segmento
   ocupa 36 bytes com o marcador `FFE1`. O teste confere os dois números.
2. **Bytes soltos entre segmentos JPEG.** Além do preenchimento `FF` que o plano prevê, o percurso pula qualquer
   byte fora de marcador entre dois segmentos (o mesmo que o libjpeg faz, com aviso). Esses bytes não são
   copiados. Recusar com 415 seria mais estrito, mas aumentaria o risco de recusar JPEG legítimo, que é o
   primeiro risco do §11 do plano.
3. **Documentos além do §B9.** `01-security-review.md` 1.1 ganhou uma frase sobre `server-only` nos pacotes que
   leem chave secreta, porque o I4b fecha esse item. Em `PRE-PRODUCTION.md`, a linha do avatar dizia que o campo
   "não aparece" sem Storage; o código mostra uma caixa de URL (`AccountProfileForm.tsx:111-135`, ramo
   `canUploadAvatar === false`). A linha foi corrigida junto com a da foto da entidade.
4. **Teste do header declarado mais forte.** `uploadedImageValidation.test.ts` vigiava só o acesso a `formData`;
   com a leitura por stream, passou a vigiar `formData` e `body`. Sem isso o teste continuaria verde mesmo se o
   parser lesse o corpo antes de conferir o header.
5. **Tipo de retorno do helper.** `readCappedBody` devolve `Buffer<ArrayBuffer>` (o tipo de `Buffer.concat` no
   `@types/node` 24), porque `new Response(bytes)` não aceita `Buffer<ArrayBufferLike>` no typecheck.
6. **Casos extras na allowlist.** Além dos do plano, `https://lh3.googleusercontent.com.evil.example/...` é
   recusado, e há teste de rota para avatar `lh3` aceito e para troca de URL externa gravada por outra fora da
   allowlist (conta e entidade).

## Testes que mudaram de comportamento de propósito

- `entityPhotoReference.test.ts`, "what counts as a usable reference": `LEGACY_URL`
  (`https://cdn.example.com/legacy.png`) e `http://example.com/a.jpg` saíram de aceitos para recusados.
- `entityPhotoReference.test.ts`, "what a record's photo may point at": `LEGACY_URL` saiu de aceito para recusado.
- `accountAvatar.test.ts`: `isUsablePhotoReference("https://cdn.example.com/a.png", OWNER)` passou de `true`
  para `false`.
- `uploadedImageValidation.test.ts`: os fixtures eram cabeçalho mais zeros e passaram a ser a estrutura mínima
  de cada formato (`structuredImage`), no mesmo tamanho. Nenhuma asserção saiu; os 5 testes que ficaram vermelhos
  com o removedor (medido antes da troca) voltaram a passar.
- O teste do schema Zod que aceita `http(s)` no formato ficou como estava, e o "hands an absolute url back
  untouched" da leitura também.

## Validação

| o quê | comando | resultado |
|-------|---------|-----------|
| suíte | `pnpm turbo run test` (com cache) | 14/14 tasks. `api` 1810 testes em 129 arquivos; `web` 313/34; `app` 1277/140; `@repo/email` 209/8; `@repo/auth` 201/15; demais pacotes verdes |
| testes novos e alterados | `npx vitest run` por arquivo | `imageMetadata` 27; `uploadedImageValidation` 20 (eram 16); `entityPhotoReference` + `accountAvatar` + `accountRoute` 86; `signUpFormSubmitLock` 9 (eram 4); `serverOnly` 1 |
| guard do `server-only` | `npx vitest run` em `packages/email` antes dos mocks | 49 falhas em 3 arquivos com "This module cannot be imported from a Client Component module"; depois dos mocks, 209/209 |
| typecheck | `pnpm turbo run typecheck --filter=api --filter=web --filter=@repo/auth --filter=@repo/email --filter=app` | verde |
| lint | `pnpm check` | 1120 arquivos, sem erro |
| build da API com `server-only` no e-mail | `pnpm --filter api build` | exit 0 |
| build do preview de e-mail | `pnpm --filter email build` | **falha**, e falha igual sem a linha do `server-only` (medido tirando a linha e reconstruindo): `'activeAnimations' is not exported from 'motion-dom'` no `toolbar.tsx` do `@react-email/preview-server`. Defeito anterior a esta fatia; os templates (`packages/email/templates`) não importam o `index.ts` |
| componente removido | `git grep -n "auth/components" -- apps packages ':!*.md'` | vazio |

Smoke com imagens reais, sem persistir nada (pasta em `/tmp`, apagada no fim): um ícone do sistema convertido
por `sips` em PNG e JPEG 256x256 e por `cwebp -metadata all` em WebP; injetados por script um `APP1` EXIF com
`Orientation=6` e uma string de GPS fictícia, um `COM` e bytes depois do `EOI` no JPEG, `tEXt` e `eXIf` no PNG, e
EXIF por `webpmux -set exif` no WebP. Rodando `stripImageMetadata` (`node --experimental-strip-types`):

- os três saíram sem a string de GPS (`Buffer.includes`);
- o JPEG ficou com `e1:34` (o EXIF mínimo), `e0:16` e as tabelas; o `APP1` XMP que o `sips` grava saiu;
- o PNG passou de `IHDR,gAMA,cHRM,eXIf,pHYs,iTXt,IDAT,IDAT,IEND` para `IHDR,gAMA,cHRM,pHYs,IDAT,IDAT,IEND`;
- `webpmux -info` mostrava "EXIF metadata XMP metadata transparency" na entrada e só "transparency" na saída;
- `sips -g pixelWidth -g pixelHeight` abriu o JPEG e o PNG de saída em 256x256, e `dwebp` decodificou o WebP.

Isso prova que os decodificadores do macOS e da libwebp abrem a saída. Não prova a orientação aplicada num
navegador.

## A verificar no `/test`

- **V1**, cadastro da landing com o popup do Google aberto: os dois botões com `disabled`. Repro no plano §9. O
  T6 prova pelo HTML renderizado com cada `isPending`; a interação real não foi medida.
- **V2**, upload real com o emulador de Storage: baixar o objeto gravado e conferir ausência de GPS, o `APP1` de
  36 bytes no JPEG e a foto com `Orientation=6` aparecendo em retrato no painel (`naturalWidth > 0`).
- **V3**, `curl` com `Transfer-Encoding: chunked` de 6 MiB em `POST /files` contra `next start`/`next dev`:
  esperado `413 UPLOAD_FILE_TOO_LARGE` com `connection: close`. O unitário mede que o stream para de ser lido
  entre o teto e o teto mais dois pedaços de 64 KiB; o comportamento sobre o `Readable` do Node não foi medido.
- **V4**, allowlist por `curl` com bearer e, no navegador, salvar o perfil de uma conta com URL externa já
  gravada no avatar (esperado: sucesso).
- **V6**, `pnpm e2e` filtrado (`signUp`, `accountSettings`, `entityCrud`). Não rodei.
- 🔒 de saída, sem como medir aqui: o teto em `chunked` dentro de uma função da Vercel.

## Lacunas de teste conhecidas

- WebP animado (`ANIM`/`ANMF`) e WebP com `ALPH` separado de `VP8 ` não têm fixture; a lista de permissão os
  cobre por leitura.
- Orientação do EXIF gravada com tipo diferente de `SHORT` é ignorada (o segmento sai inteiro, sem `APP1`
  mínimo). Não há teste para isso.
- A edição de entidade com foto `lh3` nova só é coberta pela função (`isAttachablePhoto`), não pela rota `PUT`.

## Achados para o `/spec --sync`

- `pnpm --filter email build` quebrado por `motion-dom`/`framer-motion` no preview-server, com e sem esta fatia.
- Âncoras do `specs/BACKLOG.md` deslocadas por este diff: o `docs/SECURITY.md` ganhou 13 linhas depois da `:109`
  (afeta `:160`, `:204`, `:216`), e `sign-up-form-client.tsx` ganhou 5 linhas na `:82` e perdeu 2 no botão de
  envio (afeta a âncora `:158-160,181`, hoje `:163` e `:184`). O `BACKLOG.md` está modificado pela auditoria no working tree e não foi
  tocado.
- Objetos já gravados com EXIF em forks em produção continuam como estão (Q11 do plano).
