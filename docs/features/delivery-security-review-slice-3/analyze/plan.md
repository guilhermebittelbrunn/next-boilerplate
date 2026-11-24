# Plano: core aprovado na parte 1 da entrega (fatia 3, "arestas")

- Spec: [`specs/delivery-security-review.md`](../../../../specs/delivery-security-review.md) (`status: approved`), só
  a fatia 3. A fatia 1 saiu na PR #64 (`docs/features/delivery-security-review/`). A fatia 2 foi implementada,
  revisada e testada neste mesmo working tree e ainda não tem commit (`docs/features/delivery-security-review-slice-2/`).
- Modo: autônomo, dentro do `/cycle`. Nenhuma pergunta foi feita; as decisões estão em "Perguntas em aberto
  (decididas por padrão)", no fim.
- Código lido em `5829ea3` com o diff da fatia 2 aplicado por cima, em 2026-11-24. As âncoras são dessa versão.
- Esta fatia fecha a spec. Nada da fatia 2 é desfeito nem refeito aqui.

---

## Etapa 1: análise

### 1. Contexto

#### 1.1 Problema e objetivo

Sobram quatro itens da parte 1 da etapa de entrega (`docs/delivery/01-security-review.md`) que o core deixa
para o fork: 1.17 (SSRF latente na foto e no avatar), 1.11 (upload sem teto quando falta `content-length`, e
EXIF com GPS chegando ao bucket), 1.9 (botão do Google solto no cadastro da landing), 1.2 e 1.1 (formulário
legado sem schema exportado por `@repo/auth`, e `@repo/email` sem `server-only`). Nenhum expõe dado hoje.
São as arestas que um auditor da parte 1 aponta e que cada fork corrigiria de um jeito.

Em uma frase: foto e avatar passam a aceitar só objeto do bucket ou URL `https` de host em allowlist; o upload
conta os bytes enquanto lê e recusa acima do teto mesmo sem `content-length`, e grava a imagem sem metadados;
o cadastro da landing trava os dois botões enquanto qualquer envio está pendente; o componente morto sai de
`@repo/auth`; `@repo/email` passa a recusar importação fora do servidor.

#### 1.2 Corte (os quatro itens da fatia 3 da spec)

| # | item da spec | lacuna medida |
|---|--------------|---------------|
| I1 | Foto e avatar aceitam só caminho do bucket ou host em allowlist | `isUsablePhotoReference` aceita qualquer `http(s)` absoluto (`apps/api/(shared)/lib/entity-photo.ts:11-14`, `:33-36`). É a única regra de escrita dos dois campos: `isAttachablePhoto` a reusa (`:42-46`), e ela decide em `entities/route.ts:69-81`, `entities/[id]/route.ts:64-82` e `account/route.ts:38-60` |
| I2a | Upload recusa corpo sem `content-length` acima do teto antes de ler | `parseUploadedImage` só confere o header declarado (`apps/api/(shared)/validation/file.schema.ts:95-110`); sem ele, `req.formData()` (`:112-117`) carrega o corpo inteiro antes do teste de tamanho em `:124` |
| I2b | Upload remove metadados da imagem | o `Buffer` lido vai direto para `putObject` (`file.schema.ts:128-146`, `files/route.ts:35-46`, `storage.ts:70-82`); EXIF (com GPS), XMP, IPTC e comentários chegam ao bucket |
| I3 | Botão do Google travado durante o envio no cadastro da landing | o botão do Google só olha `signInWithGoogle.isPending` (`apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx:179-185`), e o de envio não olha o Google (`:156-161`) |
| I4a | Formulário legado de `@repo/auth` removido | `packages/auth/components/sign-in.tsx` (texto em inglês fixo, sem schema), exportado em `packages/auth/package.json:17`; `git grep "auth/components/sign-in" -- apps packages` não acha importador |
| I4b | `server-only` em `@repo/email` | `packages/email/index.ts:1` começa direto pelos imports; `@repo/payments` (`packages/payments/index.ts:1`) e `@repo/auth` (`server.ts:1`, `session.ts:1`) já usam o guard |

#### 1.3 Fora do corte

- O "Fora do corte" da spec inteiro: segundo fator, captcha/App Check, nonce na CSP, e-mail verificado nos
  guards, enumeração de e-mail.
- Tudo o que a fatia 2 entregou ou deixou de fora com veredito (Q9, Q10, Q6 e Q14 do plano dela).
- Filtrar na leitura as URLs externas já gravadas (Q5). Elas continuam saindo como estão.
- Espelhar a allowlist nos schemas do formulário (`entityFormSchema.ts`, `accountFormSchema.ts`) e reescrever o
  texto de ajuda da caixa de URL (Q6).
- Recodificar a imagem (`sharp`), converter HEIC, redimensionar ou gerar miniatura (Q1).
- A chave órfã `components.header.noAccount` (achado 🟢 do `BACKLOG.md`, "junto da linha" do componente morto).
  Não é usada pelo componente e não está no texto da spec (Q9).
- Declarar `server-only` no `package.json` de `@repo/email` (Q7).

#### 1.4 Apps impactados

| camada | impacto |
|--------|---------|
| `apps/api` | allowlist de host na regra de foto/avatar; avatar reenviado sem mudança continua aceito; leitura do corpo do upload com teto; remoção de metadados de JPEG, PNG e WebP |
| `apps/web` | os dois botões do cadastro travados por um estado só |
| `packages/auth` | `components/sign-in.tsx` e o export apagados |
| `packages/email` | `import "server-only"` em `index.ts` |
| `apps/app`, `packages/sdk`, `packages/internationalization` | N/A. Nenhum código de erro novo, nenhuma chave nova, contrato do SDK igual |

- Área do painel: comum (avatar em `/account`, foto em `entities`). Admin e personificação seguem o guard que já
  existe. Modo de produto: igual em `subscription` e `simple`. Assinatura: N/A.
- Dependência nova: nenhuma. Variável de ambiente nova: nenhuma. Serviço novo: nenhum.
- Genérico: sim. As regras moram na `apps/api` e nos pacotes de integração `auth` e `email`.

#### 1.5 Fontes

| fonte | lido |
|-------|------|
| `specs/delivery-security-review.md` | inteira |
| `specs/BACKLOG.md` | linha 221 (a fatia 3 na ordem), `:290-305` (fatias 2 e 3 no mesmo working tree e a ressalva do `sharp`), `:1385` (componente morto), `:1386` (`header.noAccount`), `:1290` (413 do `/files` sem `connection: close`) |
| `.claude/cycle-policy.md` | inteira |
| `docs/feature-analysis-guide.md` | inteira |
| `docs/features/delivery-security-review-slice-2/` | `STATE.md`, `analyze/plan.md`, `develop/handoff.md` |
| `docs/delivery/01-security-review.md` | 1.1, 1.2, 1.9, 1.11, 1.17 |
| `docs/SECURITY.md:100-124`, `:224-232`; `docs/PRE-PRODUCTION.md:404-412` | trechos que esta fatia completa |

Referências não lidas: nenhuma.

### 2. Dados (Firestore)

Nenhuma coleção, campo ou consulta muda. Os campos `entity.photo` e `user.avatar` continuam guardando o caminho
do objeto ou uma URL. Documento antigo com URL externa fica válido: a leitura não muda (Q5), e reenviar o mesmo
valor sem mexer continua aceito (§4.1).

Objetos já gravados no bucket com EXIF ficam como estão. Varrer o bucket e regravar seria um script de backfill
com custo de egress, para um risco que só vale para quem já enviou foto num fork em produção (Q11).

### 3. Contrato `@repo/sdk`

N/A. `UploadResult.size` (`packages/sdk/src/types/file/file.ts:9`) passa a ser o tamanho gravado, menor ou igual
ao do arquivo enviado. O tipo é o mesmo e nenhum consumidor compara esse número com o arquivo local: o único
`.size` lido no front é o do arquivo escolhido, antes do envio (`packages/design-system/components/ui/image-upload-input.tsx:94`).

### 4. API

#### 4.1 I1: allowlist de host na foto e no avatar

A CSP do painel já decide quais imagens externas aparecem: `img-src` lista `https://lh3.googleusercontent.com`,
o host das URLs assinadas quando há bucket, o emulador e a origem do logo (`apps/app/proxy.ts:25`, `:70-76`). A
lista da tabela de entidades renderiza com `unoptimized` (`EntitiesListClient.tsx:62-70`), então quem barra é a
CSP; o otimizador do Next aceita os mesmos hosts (`apps/app/next.config.ts:21-38`). Uma URL de qualquer outro
host hoje é gravada e nunca aparece.

A regra nova alinha a escrita com o que aparece:

```ts
const EXTERNAL_IMAGE_HOSTS = new Set(["lh3.googleusercontent.com"]);

export const isAllowedExternalImageUrl = (value: string): boolean => {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return false;
    }
    return (
        url.protocol === "https:" &&
        url.username === "" &&
        url.password === "" &&
        url.port === "" &&
        EXTERNAL_IMAGE_HOSTS.has(url.hostname)
    );
};

export const isUsablePhotoReference = (value: string, ownerId: string): boolean =>
    isAllowedExternalImageUrl(value) || isOwnStorageObject(value, ownerId);
```

- `https` só; `http`, porta explícita, credencial na URL e subdomínio vizinho (`lh4.googleusercontent.com`) são
  recusados. O `hostname` do `URL` já vem em minúsculas.
- `isAbsoluteHttpUrl` continua existindo para a leitura (`withPhotoUrl`, `entity-photo.ts:77-79`;
  `resolveAvatarUrl`, `account-avatar.ts:31-33`), que não muda.
- O schema Zod de `entity.schema.ts:19-35` continua aceitando `http(s)` no formato. Quem decide a posse e o host
  é o handler, como hoje (comentário em `entityPhotoReference.test.ts:222-225`). O arquivo não é tocado.
- Um fork que queira aceitar o próprio CDN edita a constante e a CSP do `apps/app` juntas. O comentário da
  constante diz isso, porque é uma restrição externa que o código não mostra.

Códigos de recusa (os de hoje): `400 ENTITY_PHOTO_INVALID` na criação e na edição de entidade, `400
ACCOUNT_AVATAR_INVALID` no `PUT /account`.

**Avatar reenviado sem mudança.** O formulário da conta manda o avatar guardado a cada salvamento
(`AccountProfileForm.tsx:60`, `:69`). Com a regra nova, uma conta que tenha URL externa gravada não conseguiria
mais salvar nome e telefone. A edição de entidade já trata esse caso: o valor igual ao do registro passa sem
nova checagem (`entities/[id]/route.ts:66-76`). A conta ganha a mesma regra:

```ts
-function resolveAvatar(raw, ownerId): AvatarResolution {
+function resolveAvatar(raw, ownerId, stored: string | null): AvatarResolution {
     ...
-    if (value && !isUsablePhotoReference(value, ownerId)) {
+    if (value && value !== stored && !isUsablePhotoReference(value, ownerId)) {
```

com a chamada em `account/route.ts:130` passando `previousAvatar` (`:128`). A criação de entidade não tem valor
anterior e aplica a regra inteira.

#### 4.2 I2a: leitura do upload com teto

`parseRequestJson` já resolve o mesmo problema para JSON: conta os bytes enquanto lê o stream e solta o leitor
sem `cancel()` ao passar do teto (`apps/api/(shared)/lib/parse-request-json.ts:29-49`). A leitura vira um
helper com teto por parâmetro, e as duas rotas usam o mesmo:

- novo `apps/api/(shared)/lib/read-capped-body.ts`, `readCappedBody(body, maxBytes): Promise<Buffer | null>`,
  com o corpo atual de `readCapped` e o comentário do `releaseLock`;
- `parse-request-json.ts` passa a chamar `readCappedBody(req.body, REQUEST_JSON_MAX_BYTES)`; nenhuma mudança de
  comportamento, e `parseRequestJson.test.ts` continua sendo a prova;
- `parseUploadedImage`, depois do teste do header declarado:

```ts
if (!req.body) return refuse("UPLOAD_FILE_MISSING", HTTP_STATUS.BAD_REQUEST);
const bytes = await readCappedBody(req.body, DECLARED_BODY_MAX_BYTES);
if (!bytes) return refuseTooLarge();
const form = await new Response(bytes, {
    headers: { "content-type": req.headers.get("content-type") ?? "" },
}).formData(); // dentro do try que hoje responde UPLOAD_FILE_MISSING
```

- `refuseTooLarge()` responde `413 UPLOAD_FILE_TOO_LARGE` com `connection: close`, pelo mesmo motivo do
  `parseRequestJson` (`parse-request-json.ts:19-22`): o resto do corpo não é lido. Vale para o header declarado
  acima do teto e para o corpo que passa do teto na leitura. Isso fecha o achado 🟢 do `BACKLOG.md:1290`.
- O teto da leitura é `DECLARED_BODY_MAX_BYTES` (4 MiB mais 64 KiB de envelope, `file.schema.ts:18-19`). O teste
  exato do arquivo (`:124`) continua depois.

#### 4.3 I2b: remoção de metadados sem dependência nova

O `sharp` está no lockfile só como dependência opcional do `next`, e nenhum `package.json` o declara
(`BACKLOG.md:301-305`). Declarar na `api` é dependência nova, que a política manda levar ao relatório (Q1). O
corte usa código próprio que percorre a estrutura de cada formato e copia só os blocos de imagem, sem decodificar
pixel. Os três formatos aceitos têm estrutura em blocos com tamanho declarado, o que torna isso viável em poucas
dezenas de linhas por formato.

Novo `apps/api/(shared)/lib/image-metadata.ts`:

```ts
export function stripImageMetadata(body: Buffer, type: UploadImageType): Buffer | null
```

`null` quer dizer estrutura malformada; o upload responde `415 UPLOAD_FILE_TYPE_NOT_ALLOWED` (Q3).

**JPEG.** Depois do `SOI` (`FFD8`), lê segmento por segmento (`FF`, marcador, tamanho de 2 bytes que inclui a
si mesmo):

| segmento | destino | por quê |
|----------|---------|---------|
| `APP0` com `JFIF\0` | mantém | cabeçalho do formato |
| `APP0` de outro tipo (`JFXX`) | remove | miniatura extra |
| `APP1` (`Exif\0\0`, XMP) | remove; se o EXIF tiver `Orientation` de 2 a 8, grava no lugar um `APP1` mínimo só com essa tag | sem a orientação, foto de celular aparece deitada |
| `APP2` com `ICC_PROFILE\0` | mantém | perfil de cor; sem ele, foto de gama larga muda de cor |
| `APP2` de outro tipo (`MPF`) | remove | índice das imagens extras, que somem junto |
| `APP3` a `APP13`, `APP15` | remove | IPTC, Photoshop, dados de fabricante |
| `APP14` com `Adobe` | mantém | transformação de cor de JPEG CMYK |
| `COM` (`FFFE`) | remove | comentário livre |
| `DQT`, `SOF*`, `DHT`, `DRI`, `SOS` e demais | mantém | dados da imagem |

Depois de cada `SOS`, copia os dados comprimidos byte a byte até o próximo marcador que não seja `FF00` (byte de
escape) nem `RST0` a `RST7`; isso cobre JPEG progressivo, que alterna `DHT` e `SOS`. No `EOI` (`FFD9`) para e
descarta o que vem depois, onde celulares guardam imagens extras (MPF) e blocos de fabricante com EXIF próprio.
Tamanho de segmento menor que 2 ou além do fim do buffer, ou fim do buffer sem `EOI`, devolve `null`.

O `APP1` mínimo tem 34 bytes: `FFE1`, tamanho `0022`, `Exif\0\0`, cabeçalho TIFF big-endian (`MM\0*`, offset 8),
uma entrada (`0112`, tipo `SHORT`, contagem 1, valor) e o ponteiro do próximo IFD zerado. A leitura da
orientação original aceita `II` e `MM`, confere cada offset contra o tamanho do segmento e, se o EXIF estiver
malformado, só descarta o segmento, sem recusar a imagem.

**PNG.** Depois da assinatura de 8 bytes, lê blocos (tamanho de 4 bytes, tipo, dados, CRC) e copia inteiros os
que estão nesta lista: `IHDR`, `PLTE`, `IDAT`, `IEND`, `tRNS`, `cHRM`, `gAMA`, `iCCP`, `sBIT`, `sRGB`, `cICP`,
`mDCV`, `cLLI`, `bKGD`, `hIST`, `pHYs`, `sPLT`, `acTL`, `fcTL`, `fdAT`. Os demais saem, inclusive `tEXt`, `zTXt`,
`iTXt`, `eXIf`, `tIME` e blocos privados. A lista é de permissão: bloco desconhecido sai. O CRC não muda, porque
o bloco é copiado inteiro. Para no `IEND` e descarta o que vem depois. Bloco truncado ou ausência de `IEND`
devolve `null`. O PNG 1x1 do teste de emulador (`storageUpload.emulator.test.ts:66-70`) tem só `IHDR`, `IDAT` e
`IEND` (conferido nesta análise), então sai idêntico e a comparação byte a byte daquele teste continua valendo.

**WebP.** Contêiner RIFF (`RIFF`, tamanho little-endian, `WEBP`). Copia os blocos `VP8 `, `VP8L`, `VP8X`,
`ALPH`, `ANIM`, `ANMF` e `ICCP`, com o byte de preenchimento dos blocos de tamanho ímpar; remove `EXIF`, `XMP ` e
desconhecidos. No `VP8X`, zera os bits de EXIF (`0x08`) e XMP (`0x04`) do byte de flags. Regrava o tamanho do
RIFF como `comprimento final - 8`. Bloco além do fim do buffer devolve `null`. A orientação do EXIF de WebP não é
preservada (risco §11).

Encaixe em `parseUploadedImage`, depois do sniff:

```ts
const stripped = stripImageMetadata(body, sniffed);
if (!stripped) {
    return refuse("UPLOAD_FILE_TYPE_NOT_ALLOWED", HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE);
}
return { ok: true, value: { body: stripped, contentType: sniffed,
    extension: UPLOAD_IMAGE_EXTENSION[sniffed], size: stripped.length } };
```

O custo é uma passada linear sobre no máximo 4 MiB, sem cópia de pixel.

#### 4.4 Códigos de erro

Nenhum novo. Reusados, todos já traduzidos nos três idiomas (`translations/packages/shared/utils.ts:41`, `:142-144`,
`:147` e os equivalentes em en e es):

| código | status | onde passa a sair também |
|--------|--------|--------------------------|
| `ENTITY_PHOTO_INVALID` | 400 | foto com URL `https` fora da allowlist, ou qualquer `http` |
| `ACCOUNT_AVATAR_INVALID` | 400 | avatar novo com URL fora da allowlist |
| `UPLOAD_FILE_TOO_LARGE` | 413 | corpo sem `content-length` que passa do teto na leitura; agora com `connection: close` |
| `UPLOAD_FILE_TYPE_NOT_ALLOWED` | 415 | JPEG, PNG ou WebP com estrutura que o removedor de metadados não consegue percorrer |

### 5. Front-end

**Cadastro da landing (I3).** Um estado só trava os dois botões, como o cadastro da `app` já faz
(`apps/app/.../sign-up/components/SignUpFormClient.tsx:138-139`, `:206`, `:227`) e o login da landing também
(`sign-in-form-client.tsx:34`):

```tsx
+const isSubmitting =
+    createAccount.isPending || signIn.isPending || signInWithGoogle.isPending;
 ...
-disabled={createAccount.isPending || signIn.isPending}   // envio
+disabled={isSubmitting}
 ...
-disabled={signInWithGoogle.isPending}                    // Google
+disabled={isSubmitting}
```

Nenhum texto, layout ou cor muda. O `loading` do botão do Google, que a `app` usa, fica fora para não mudar pixel
(Q12).

**Foto e avatar no painel.** Nada muda na UI. A caixa de URL só aparece quando não há bucket
(`EntityFormFields.tsx:121-142`, `AccountProfileForm.tsx:110-136`); nela, uma URL fora da allowlist passa a voltar
com o toast traduzido de `ENTITY_PHOTO_INVALID` ou `ACCOUNT_AVATAR_INVALID`, em vez de ser gravada e não aparecer
(Q6).

### 6. i18n

N/A. Nenhuma chave nova; os códigos reusados já estão nos três idiomas (§4.4).

### 7. Autorização e segurança

- I1 é validação de borda no servidor; o guard e a posse do objeto (`isOwnStorageObject`) continuam como estão.
  Personificação: o `PUT /account` usa `requireCommonPanelApi`, ciente de personificação; a regra nova não muda
  quem pode escrever.
- I2a reduz o que um cliente consegue pôr na memória da função com uma requisição `chunked`. No `next start`, o
  `proxy.ts` ainda guarda até 10 MiB de qualquer corpo antes do handler (`docs/SECURITY.md:232`); na Vercel, o
  limite de 4,5 MB vem antes. O helper limita o que o handler acumula e parseia.
- I2b protege quem envia: a foto deixa de levar GPS, modelo, número de série e data para um bucket que o fork
  lê e exporta (`/account/export`).
- I4b faz o build falhar se um componente cliente importar `@repo/email`, que lê `RESEND_TOKEN` (`keys.ts`).
- Os logs não mudam. Nenhum dado novo entra em log.

### 8. Testes (nível mais barato que prova)

| # | arquivo | nível | prova |
|---|---------|-------|-------|
| T1 | `apps/api/__tests__/imageMetadata.test.ts` (novo) | função pura, com bytes montados no teste | JPEG: `APP1` Exif com uma string de GPS fictícia, `APP1` XMP, `APP13`, `COM`, `APP2` MPF e bytes depois do `EOI` somem; `APP0` JFIF, `APP2` ICC, `APP14` Adobe, `DQT`, `SOF0`, `DHT`, `SOS`, dados comprimidos e `EOI` saem idênticos e na mesma ordem; `Orientation` 6 em `II` e em `MM` vira o `APP1` de 34 bytes com valor 6; orientação 1 ou ausente não gera `APP1`; EXIF com offset fora do segmento é descartado e a imagem passa; progressivo com dois `SOS`, `DHT` entre eles, `RST0` e `FF00` nos dados sai idêntico; tamanho de segmento 0, segmento além do fim e falta de `EOI` → `null`; passar duas vezes dá o mesmo resultado. PNG: `tEXt`, `zTXt`, `iTXt`, `eXIf`, `tIME` e um bloco privado somem, `IHDR`/`PLTE`/`tRNS`/`iCCP`/`IDAT`/`IEND` ficam idênticos; o PNG 1x1 do teste de emulador sai byte a byte igual; bytes depois do `IEND` somem; bloco truncado e falta de `IEND` → `null`. WebP: `VP8X` com `EXIF` e `XMP ` perde os dois blocos, os bits `0x08` e `0x04` zerados e o tamanho do RIFF igual ao comprimento menos 8; bloco de tamanho ímpar mantém o preenchimento; `VP8 ` simples sai idêntico; tamanho além do fim → `null` |
| T2 | `apps/api/__tests__/uploadedImageValidation.test.ts` (ajustar e estender) | função com `Request` real | os fixtures `imageBytes(HEAD, tamanho)` passam a montar a estrutura mínima de cada formato no tamanho pedido (JPEG: `SOI`, `SOS`, zeros, `EOI`; PNG: assinatura, `IHDR`, `IDAT` de preenchimento, `IEND`; WebP: RIFF com um `VP8L`). É adaptação ao contrato novo: nenhuma asserção sai. Casos novos: corpo em stream sem `content-length` acima do teto → 413 `UPLOAD_FILE_TOO_LARGE`, `connection: close`, e o stream deixa de ser lido logo depois do teto (contador de bytes entregues ≤ teto + um pedaço); `content-length` acima do teto → `connection: close`; JPEG com EXIF → `value.body` sem `Exif` e `value.size === value.body.length`; JPEG com segmento truncado → 415 `UPLOAD_FILE_TYPE_NOT_ALLOWED` |
| T3 | `apps/api/__tests__/parseRequestJson.test.ts` | função | sem mudança; tem de continuar verde depois da extração de `readCappedBody` |
| T4 | `apps/api/__tests__/entityPhotoReference.test.ts` (ajustar e estender) | função + rota com `vi.mock` | `isUsablePhotoReference` e `isAttachablePhoto`: `LEGACY_URL` (`:115`) e `http://example.com/a.jpg` passam de aceitos (`:229`, `:249`) a recusados; `https://lh3.googleusercontent.com/a/x` aceito; `http://lh3…`, `https://lh3…:8443/x`, `https://u:p@lh3…/x`, `https://lh4.googleusercontent.com/x` recusados. Rota: `POST /entities` com URL externa → 400 `ENTITY_PHOTO_INVALID` sem gravar; `PUT` reenviando o `LEGACY_URL` já gravado → 200. É mudança de comportamento de propósito; o teste do schema Zod (`:199-221`) fica como está |
| T5 | `apps/api/__tests__/accountAvatar.test.ts`, `accountRoute.test.ts` (ajustar e estender) | função + rota | `isUsablePhotoReference("https://cdn.example.com/a.png")` passa a `false` (`accountAvatar.test.ts:33`); `lh3` aceito; o caso "hands an absolute url back untouched" (`:88-99`) fica, porque a leitura não muda. Rota: avatar externo novo → 400 `ACCOUNT_AVATAR_INVALID` sem gravar; reenvio do avatar externo já gravado, junto de um nome novo → 200, grava o nome e não chama `deleteObjectQuietly` |
| T6 | `apps/web/__tests__/signUpFormSubmitLock.test.tsx` (estender) | `renderToString` com o harness do arquivo | o botão do Google desabilitado com `createAccount`, com `signIn` e com `googleSignIn` pendentes, e habilitado sem nada pendente; o botão de envio desabilitado com `googleSignIn` pendente |
| T7 | `packages/email/__tests__/serverOnly.test.ts` (novo) | importação | sem mockar `server-only`, `import("../index")` rejeita com `/Server Component/`. Os três testes que importam `../index` (`credentials`, `logPrivacy`, `sendEmail`) ganham `vi.mock("server-only", () => ({}))`, o padrão de 28 arquivos do repositório |
| T8 | nenhum arquivo | gate | a remoção do componente é provada por `pnpm --filter @repo/auth typecheck` e `git grep "auth/components" -- apps packages` vazio |

Nenhum teste com emulador ou app de pé. A gravação no bucket já tem teste de emulador e o objeto desta fatia é a
transformação dos bytes, que a função pura prova. O único comportamento que o unitário não prova é a imagem
continuar abrindo num navegador depois da remoção, e isso vai para o `/test` (V2).

### 9. O que o `/test` vai percorrer

| # | o quê | como | esperado |
|---|-------|------|----------|
| V1 | cadastro da landing | `agent-browser` na `web` com o emulador: em `/pt-br/sign-up`, clicar em "Google" e, com o popup aberto, conferir os dois botões; fechar o popup e conferir de novo | com o popup aberto, envio e Google com `disabled`; depois de fechar, os dois habilitados. O caso do envio por e-mail pendente fica provado pelo T6 (o `network route` do `agent-browser` 0.27.0 não intercepta, segundo a memória do projeto). Uma passada em light desktop, dark mobile, e o mesmo estado em `en` e `es`, porque o estado desabilitado é o único efeito visual |
| V2 | upload sem metadados | gerar em `/tmp` um JPEG com `sips` e injetar um `APP1` com GPS e `Orientation=6` por script Node; um PNG com `tEXt`; um WebP com bloco `EXIF`. Enviar cada um como avatar e como foto de entidade no `app` com o emulador de Storage, baixar o objeto pela URL do emulador | o objeto baixado não contém `GPS` nem o texto injetado; o JPEG tem só o `APP1` de 34 bytes; a imagem renderiza no painel (`naturalWidth > 0`) e o JPEG de pixels em paisagem com orientação 6 aparece em retrato. Se houver uma foto real de celular à mão sem dado pessoal, repetir com ela |
| V3 | teto sem `content-length` | `curl -H 'Transfer-Encoding: chunked' -H "Authorization: Bearer $ID_TOKEN" -F file=@/tmp/6mib.jpg "$API/files"` contra a API com o emulador de Storage | `413 {"error":{"code":"UPLOAD_FILE_TOO_LARGE"}}` com `connection: close`; o mesmo arquivo com `content-length` → 413 com `connection: close` |
| V4 | allowlist | `curl` com bearer: `PUT /account` com `avatar: "https://example.com/a.png"`; com `https://lh3.googleusercontent.com/a/x`; `POST /entities` com `photo` externo | 400 `ACCOUNT_AVATAR_INVALID`; 200; 400 `ENTITY_PHOTO_INVALID`. No navegador, salvar o perfil de uma conta sem mexer no avatar continua dando sucesso |
| V5 | gates estáticos da parte 1 | `git grep "auth/components" -- apps packages`; `pnpm --filter api build` (prova que o `server-only` não quebra o build da API) | grep vazio; build verde |
| V6 | regressão E2E | `pnpm e2e` filtrado: `signUp.spec.ts`, `accountSettings.spec.ts`, `entityCrud.spec.ts` (projetos `chromium` e `mobile`) | verde |

🔒 de saída: o comportamento do teto em `chunked` dentro de uma função da Vercel, que recusa corpo acima de 4,5 MB
antes do handler. O V3 mede `next start`/`next dev`.

### 10. Pré-requisitos manuais de infra

Nenhum pré-requisito novo. O `/develop` e o `/test` rodam com o emulador.

| pendência | quem | caminho degradado sem ela |
|-----------|------|---------------------------|
| Cloud Storage ativado (`docs/PRE-PRODUCTION.md` §6, já existente) | o fork, se usa upload | sem bucket, `POST /files` responde `503 STORAGE_NOT_CONFIGURED` antes de ler o corpo (`files/route.ts:18-23`), como hoje; a remoção de metadados não roda porque nada é gravado. A caixa de URL volta e aceita só objeto do bucket ou `https://lh3.googleusercontent.com/...`; outra URL recebe o erro traduzido |
| CDN próprio para foto externa | o fork, se quiser | edita `EXTERNAL_IMAGE_HOSTS` em `entity-photo.ts` e o `img-src` em `apps/app/proxy.ts`. Sem isso, a URL desse CDN é recusada (hoje ela é gravada e a CSP a bloqueia) |
| Fotos antigas com EXIF no bucket de um fork em produção | o fork | ficam como estão; só os envios novos saem limpos (Q11) |

Para o V2 e o V6: JDK 21 à frente no `PATH` (`/opt/homebrew/opt/openjdk@21`) e as portas 3000 a 3002, 8080, 9099
e 9199 livres.

### 11. Riscos

- **JPEG legítimo recusado.** Um arquivo com estrutura incomum (marcador fora do lugar, preenchimento estranho)
  passa a receber 415. A mitigação é o T1 cobrir progressivo, `RST`, `FF00`, preenchimento `FFFF` antes do
  marcador e bytes depois do `EOI`, e o V2 usar uma foto real quando houver.
- **Orientação.** Preservada no JPEG pelo `APP1` mínimo. No WebP o EXIF sai inteiro e a orientação se perde;
  câmeras de celular não gravam WebP como original, então o caso é raro.
- **Perfil de cor.** ICC fica. A tag `ColorSpace` do EXIF sai; leitores usam o ICC quando existe.
- **Fixtures dos testes de upload.** Os fixtures de hoje são cabeçalho mais zeros (`uploadedImageValidation.test.ts:8-27`)
  e passariam a 415. A correção é montar a estrutura mínima, não afrouxar o removedor (T2).
- **`server-only` nos testes.** Teste que importe `@repo/email` de verdade sem mockar `server-only` passa a falhar.
  Na `api`, os oito arquivos que citam `@repo/email` o mockam; o `/develop` roda a suíte inteira e acrescenta
  `vi.mock("server-only", () => ({}))` onde aparecer.
- **URL externa antiga.** Continua sendo lida e devolvida. O risco de SSRF não muda com ela, porque nenhum código
  do servidor busca essa URL (`docs/delivery/01-security-review.md` 1.17, o `git grep` de `fetch`); o efeito é
  só que ela não aparece por causa da CSP, como hoje.
- **Contenção com a fatia 2.** Nenhum arquivo de código em comum. Três documentos em comum, em trechos
  distantes (§B9).

### 12. Achados para o `/spec --sync`

- Fecham com esta fatia, se o `/test` confirmar: os quatro itens da fatia 3, o componente morto
  (`BACKLOG.md:1385`) e o 413 do `/files` sem `connection: close` (`BACKLOG.md:1290`). Com as fatias 1 e 2, a spec
  fica pronta para arquivar.
- Continua aberto, com veredito: `components.header.noAccount` (`BACKLOG.md:1386`, fora do corte, Q9).
- Novo, para registrar se o `/review` concordar: objetos já gravados com EXIF nos forks em produção (Q11).

---

## Etapa 2: blueprint técnico

### B1. `apps/api/(shared)/lib/read-capped-body.ts` (novo) e `parse-request-json.ts`

```ts
export async function readCappedBody(
    body: ReadableStream<Uint8Array>,
    maxBytes: number
): Promise<Buffer | null> {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) return Buffer.concat(chunks);
        total += value.byteLength;
        if (total > maxBytes) {
            // Stop reading without cancel(): on Next's Node-backed body, cancelling
            // destroys the underlying Readable and leaves an unhandled AbortError.
            reader.releaseLock();
            return null;
        }
        chunks.push(value);
    }
}
```

```ts
-async function readCapped(body) { ... }
+import { readCappedBody } from "./read-capped-body";
 ...
-        const bytes = await readCapped(req.body);
+        const bytes = await readCappedBody(req.body, REQUEST_JSON_MAX_BYTES);
```

### B2. `apps/api/(shared)/lib/image-metadata.ts` (novo)

```ts
import type { UploadImageType } from "@/(shared)/validation/file.schema";

export function stripImageMetadata(body: Buffer, type: UploadImageType): Buffer | null {
    switch (type) {
        case "image/jpeg": return stripJpeg(body);
        case "image/png": return stripPng(body);
        case "image/webp": return stripWebp(body);
    }
}

// stripJpeg: SOI; laço de segmentos (pula FF de preenchimento; standalone D0-D7/01 sem tamanho;
//   D9 encerra; DA copia o cabeçalho e chama copyEntropy, que avança até FF seguido de byte
//   diferente de 00 e de D0-D7); keepJpegSegment(marker, payload) com a tabela de §4.3;
//   APP1 Exif → readExifOrientation(payload) → buildOrientationApp1(value) quando 2..8.
// stripPng: assinatura; laço de blocos com PNG_KEPT_CHUNKS; para em IEND.
// stripWebp: RIFF/WEBP; laço de blocos com WEBP_KEPT_CHUNKS e padding; limpa flags do VP8X;
//   regrava o tamanho do RIFF.
```

Constantes com nome (`JPEG_MARKER_SOS = 0xda`, `EXIF_ORIENTATION_TAG = 0x0112`, `VP8X_EXIF_FLAG = 0x08`,
`VP8X_XMP_FLAG = 0x04` etc.), sem número solto, pelo Ultracite. Sem comentário além do porquê das tabelas de
permissão (restrição de formato que o código não mostra).

### B3. `apps/api/(shared)/validation/file.schema.ts`

```ts
+import { readCappedBody } from "@/(shared)/lib/read-capped-body";
+import { stripImageMetadata } from "@/(shared)/lib/image-metadata";
 ...
+const refuseTooLarge = (): UploadRefusal => ({
+    ok: false,
+    response: Response.json(
+        { error: { code: "UPLOAD_FILE_TOO_LARGE" } },
+        { status: HTTP_STATUS.PAYLOAD_TOO_LARGE, headers: { connection: "close" } }
+    ),
+});
 ...
 export async function parseUploadedImage(req) {
     if (exceedsDeclaredLength(req)) {
-        return refuse("UPLOAD_FILE_TOO_LARGE", HTTP_STATUS.PAYLOAD_TOO_LARGE);
+        return refuseTooLarge();
     }
+    if (!req.body) {
+        return refuse("UPLOAD_FILE_MISSING", HTTP_STATUS.BAD_REQUEST);
+    }
+    const bytes = await readCappedBody(req.body, DECLARED_BODY_MAX_BYTES);
+    if (!bytes) {
+        return refuseTooLarge();
+    }
     let form: FormData;
     try {
-        form = await req.formData();
+        form = await new Response(bytes, {
+            headers: { "content-type": req.headers.get("content-type") ?? "" },
+        }).formData();
     } catch { ... }
     ...
-    if (file.size > UPLOAD_MAX_BYTES) return refuse("UPLOAD_FILE_TOO_LARGE", …);
+    if (file.size > UPLOAD_MAX_BYTES) return refuseTooLarge();
     ...
+    const stripped = stripImageMetadata(body, sniffed);
+    if (!stripped) return refuse("UPLOAD_FILE_TYPE_NOT_ALLOWED", HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE);
     return { ok: true, value: {
-        body, contentType: sniffed, extension: …, size: file.size,
+        body: stripped, contentType: sniffed, extension: …, size: stripped.length,
     } };
 }
```

O JSDoc de `exceedsDeclaredLength` (`:95-99`) passa a dizer que o corpo sem header é contado na leitura. A rota
`files/route.ts` não muda.

Exemplo de resposta (igual à de hoje, com `size` gravado):

```json
{ "data": { "path": "uploads/p2/9f1c8e30-4b7a-4c21-9f2a-3c5b0d8e1a44.jpg",
  "url": "https://storage.googleapis.com/…", "expiresAt": "2026-11-24T01:15:00.000Z",
  "contentType": "image/jpeg", "size": 183022 } }
```

### B4. `apps/api/(shared)/lib/entity-photo.ts`

```ts
+/**
+ * The only host an external image may come from. It has to match the panel's CSP `img-src`
+ * (`apps/app/proxy.ts`): a URL on any other host would be stored and never render.
+ */
+const EXTERNAL_IMAGE_HOSTS = new Set(["lh3.googleusercontent.com"]);
+
+export const isAllowedExternalImageUrl = (value: string): boolean => { … §4.1 … };
 ...
 /**
- * Decides fail-closed: a reference is usable only as an absolute http(s) URL or as an
+ * Decides fail-closed: a reference is usable only as an https URL on an allowed host or as an
  * object under the owner's own prefix. …
  */
 export const isUsablePhotoReference = (value, ownerId) =>
-    isAbsoluteHttpUrl(value) || isOwnStorageObject(value, ownerId);
+    isAllowedExternalImageUrl(value) || isOwnStorageObject(value, ownerId);
```

O comentário de `entities/[id]/route.ts:69-72` termina em "or an external URL"; passa a "or an image on an
allowed host", porque mentiria com a regra nova.

### B5. `apps/api/app/(routes)/account/route.ts`

Pseudo-diff em §4.1: `resolveAvatar(raw, ownerId, stored)` e a chamada com `previousAvatar`.

### B6. `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx`

Pseudo-diff em §5.

### B7. `packages/auth`

- apagar `packages/auth/components/sign-in.tsx` (a pasta fica vazia e some);
- `packages/auth/package.json`: remover `"./components/sign-in": "./components/sign-in.tsx"` (`:17`) e a vírgula
  da linha anterior.

Mesmo procedimento da remoção de `components/sign-up.tsx` na PR de `account-security-mfa`
(`docs/features/account-security-mfa/analyze/plan.md:325`).

### B8. `packages/email/index.ts`

```ts
+import "server-only";
 import { type Locale, resolveLocale } from "@repo/internationalization/utils";
```

`server-only` resolve pelo `public-hoist-pattern[]=*` do `.npmrc`, do mesmo jeito que em `@repo/auth`, que o
importa em quatro arquivos sem declará-lo (Q7).

### B9. Documentação

Três documentos, todos também tocados pela fatia 2, em trechos distantes dos dela:

| documento | trecho desta fatia | trechos da fatia 2 (`git diff -U0`) |
|-----------|--------------------|--------------------------------------|
| `docs/SECURITY.md` | bullet do upload em `:105-108` (acrescenta "e remove metadados (EXIF, XMP, comentários), mantendo perfil de cor e orientação"); `:230` (o `/files` também conta os bytes ao ler e responde 413 com `connection: close`); uma linha na seção de Storage sobre a allowlist de host da foto e do avatar | `:173` a `:220` |
| `docs/delivery/01-security-review.md` | 1.11 "O core já faz" (`:234-235`): teto também sem `content-length` e remoção de metadados; 1.17 "O core já faz" (`:357-358`): foto e avatar só do bucket ou de `https://lh3.googleusercontent.com` | `:211-228`, `:375`, `:396` |
| `docs/PRE-PRODUCTION.md` | linha da foto da entidade na tabela do §6 (`:409`): "volta a ser uma caixa de URL de texto, que aceita só foto do Google" | `:383-391`, `:501-504`, `:1127-1131` |

Os trechos ficam a mais de seis linhas dos da fatia 2, então o `git add -p` os separa em hunks distintos. Antes de
editar, o `/develop` mede cada âncora contra o arquivo, porque a fatia 2 deslocou linhas.

### B10. Arquivos desta fatia e sobreposição com a fatia 2

| arquivo | ação | fatia 2 tocou? |
|---------|------|----------------|
| `apps/api/(shared)/lib/read-capped-body.ts` | novo | não |
| `apps/api/(shared)/lib/parse-request-json.ts` | usa o helper | não |
| `apps/api/(shared)/lib/image-metadata.ts` | novo | não |
| `apps/api/(shared)/validation/file.schema.ts` | teto na leitura, remoção de metadados | não |
| `apps/api/(shared)/lib/entity-photo.ts` | allowlist | não |
| `apps/api/app/(routes)/account/route.ts` | avatar reenviado | não |
| `apps/api/app/(routes)/entities/[id]/route.ts` | só o comentário de `:69-72` | não |
| `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx` | trava | não |
| `packages/auth/components/sign-in.tsx` | apagado | não |
| `packages/auth/package.json` | export removido | não |
| `packages/email/index.ts` | `server-only` | não |
| `apps/api/__tests__/imageMetadata.test.ts` | novo | não |
| `apps/api/__tests__/uploadedImageValidation.test.ts` | fixtures e casos | não |
| `apps/api/__tests__/entityPhotoReference.test.ts` | casos | não |
| `apps/api/__tests__/accountAvatar.test.ts`, `accountRoute.test.ts` | casos | não |
| `apps/web/__tests__/signUpFormSubmitLock.test.tsx` | casos | não |
| `packages/email/__tests__/serverOnly.test.ts` | novo | não |
| `packages/email/__tests__/{credentials,logPrivacy,sendEmail}.test.ts` | `vi.mock("server-only")` | não |
| `docs/SECURITY.md` | §B9 | **sim** |
| `docs/delivery/01-security-review.md` | §B9 | **sim** |
| `docs/PRE-PRODUCTION.md` | §B9 | **sim** |

O `BACKLOG.md:295` previa contenção em `entity.schema.ts`, `account-avatar.ts` e `packages/auth`. O desenho evita
os três: a regra de escrita mora em `entity-photo.ts`, a leitura de `account-avatar.ts` não muda, e em
`packages/auth` só o `package.json` e o componente morto são tocados (a fatia 2 mexeu em `server.ts`,
`session.ts` e `session-routes.ts`).

### B11. Ordem de implementação e plano de commits

1. `refactor(api): share the capped body reader` (`read-capped-body.ts`, `parse-request-json.ts`)
2. `feat(api): cap upload bodies sent without content-length` (`file.schema.ts` na parte da leitura +
   `uploadedImageValidation.test.ts` nos casos de teto e nos fixtures)
3. `feat(api): strip image metadata on upload` (`image-metadata.ts`, `imageMetadata.test.ts`, `file.schema.ts` na
   parte da remoção, casos de metadados do `uploadedImageValidation.test.ts`). Se separar 2 e 3 dentro de
   `file.schema.ts` exigir `git add -p` frágil, um commit só com as duas partes, registrado na mensagem
4. `feat(api): only accept external images from allowed hosts` (`entity-photo.ts`, `account/route.ts`, comentário
   de `entities/[id]/route.ts`, `entityPhotoReference.test.ts`, `accountAvatar.test.ts`, `accountRoute.test.ts`)
5. `fix(web): lock both sign-up buttons while any submission is pending` (formulário + teste)
6. `chore(auth): remove the unused legacy sign-in component`
7. `fix(email): guard the package with server-only` (index + testes)
8. `docs: document upload metadata stripping and image host allowlist` (hunks desta fatia nos três documentos,
   por `git add -p`)
9. `docs(features): delivery-security-review-slice-3` (último)

Os commits da fatia 2 vêm antes, no plano do `/review` dela. Nenhum commit desta fatia depende de um da fatia 2.

### B12. Env e configuração

Nenhuma variável nova. Nada a configurar em produção além do que já existe.

---

## Critérios de aceite (rascunho para o `/test`)

# Critérios de Aceite (Checklist)

- [ ] **Avatar externo novo fora da allowlist é recusado**
  `PUT /account` com `avatar: "https://example.com/a.png"` responde 400 `ACCOUNT_AVATAR_INVALID` e não grava nada.
  O mesmo vale para `http://lh3.googleusercontent.com/x`, para porta explícita, para credencial na URL e para
  `https://lh4.googleusercontent.com/x`. Com `https://lh3.googleusercontent.com/a/x`, responde 200 e grava.

- [ ] **Avatar já gravado continua salvável**
  Uma conta com URL externa gravada antes desta mudança salva nome e telefone pelo formulário, que reenvia o
  avatar sem mudança, e recebe 200. Nenhum objeto do bucket é apagado nesse salvamento. Trocar esse avatar por
  outra URL externa fora da allowlist é recusado com 400 `ACCOUNT_AVATAR_INVALID`.

- [ ] **Foto de entidade fora da allowlist é recusada**
  `POST /entities` com foto `https://cdn.example.com/a.png` responde 400 `ENTITY_PHOTO_INVALID` sem criar o
  registro. A edição que reenvia a foto externa já gravada responde 200; a edição que troca para outra URL fora
  da allowlist responde 400. Objeto da organização e `https://lh3.googleusercontent.com/...` continuam aceitos.

- [ ] **Leitura de URL externa antiga não muda**
  Registro e conta com URL externa gravada continuam saindo com `photoUrl`/`avatarUrl` iguais ao valor guardado,
  sem assinatura e sem erro. A lista de entidades e o menu de perfil carregam normalmente.

- [ ] **Upload sem `content-length` acima do teto é recusado durante a leitura**
  Um corpo `chunked` de 6 MiB em `POST /files` recebe 413 `UPLOAD_FILE_TOO_LARGE` com `connection: close`, e a
  rota para de ler logo depois de 4 MiB mais 64 KiB. O mesmo arquivo com `content-length` também recebe 413 com
  `connection: close`. Um arquivo de exatamente 4 MiB continua aceito; com 1 byte a mais, 413.

- [ ] **JPEG gravado sem metadados e com orientação preservada**
  Um JPEG com EXIF de GPS, XMP, IPTC e comentário é gravado sem nenhum deles e sem os bytes depois do `EOI`. Se
  o original tinha `Orientation` de 2 a 8, o objeto gravado tem só um `APP1` de 34 bytes com essa tag, e a foto
  aparece de pé no painel. Perfil ICC e o segmento Adobe ficam. A resposta traz `size` igual ao tamanho gravado.

- [ ] **PNG e WebP gravados sem metadados**
  Um PNG com `tEXt`, `iTXt`, `zTXt`, `eXIf` e `tIME` é gravado sem esses blocos, com os blocos de imagem idênticos.
  Um WebP estendido com `EXIF` e `XMP ` é gravado sem os dois, com as flags do `VP8X` zeradas e o tamanho do RIFF
  correto. Os três abrem no navegador depois do envio.

- [ ] **Imagem com estrutura quebrada é recusada**
  Um JPEG com segmento de tamanho impossível ou sem `EOI`, um PNG sem `IEND` e um WebP com bloco além do fim do
  arquivo recebem 415 `UPLOAD_FILE_TYPE_NOT_ALLOWED`, com a mensagem traduzida nos três idiomas, e nada é gravado.
  O arquivo `GIF89a` renomeado para `.png` continua recebendo 415, como antes.

- [ ] **Cadastro da landing trava os dois botões**
  Em `/<locale>/sign-up` da `web`, enquanto o popup do Google está aberto, o botão de envio e o do Google ficam
  desabilitados; enquanto a criação da conta ou o login que vem depois estão pendentes, o do Google também fica.
  Duplo clique em qualquer um dos dois gera uma requisição só. Sem nada pendente, os dois ficam habilitados, em
  light e dark, desktop e mobile, nos três idiomas.

- [ ] **Componente legado removido**
  `git grep "auth/components" -- apps packages` sai vazio, `packages/auth/package.json` não exporta mais
  `./components/sign-in`, e `pnpm --filter @repo/auth typecheck` passa.

- [ ] **`@repo/email` só no servidor**
  `packages/email/index.ts` começa por `import "server-only"`. Importar o pacote fora do servidor falha com a
  mensagem do `server-only`, e `pnpm --filter api build` continua verde, com os e-mails de contato, convite e
  recuperação de senha saindo como antes quando o Resend está configurado.

- [ ] **Sem Storage, nada muda além da caixa de URL**
  Sem bucket, `POST /files` responde 503 `STORAGE_NOT_CONFIGURED` antes de ler o corpo. A caixa de URL do
  formulário aceita só objeto do bucket ou foto do Google; outra URL volta com o toast traduzido do código da API.

---

## Perguntas em aberto (decididas por padrão)

| # | pergunta | opções | adotada | por quê |
|---|----------|--------|---------|---------|
| Q1 | Como remover os metadados da imagem? | (a) código próprio que percorre os blocos de JPEG, PNG e WebP; (b) declarar `sharp` na `api` e recodificar (`sharp(body).rotate().toBuffer()`) | **(a)** | a política proíbe dependência nova sem passar pelo relatório. O `sharp` recodifica, aplica a orientação nos pixels e cobre metadado desconhecido, mas traz binário nativo para a função da Vercel, perde qualidade a cada envio e muda o tamanho do arquivo. Fica como alternativa para você decidir |
| Q2 | O que manter no JPEG? | (a) tirar todo `APP1`; (b) tirar só a parte de GPS do EXIF; (c) tirar EXIF e XMP e regravar só a orientação | **(c)** | (a) deixa foto de celular deitada; (b) mantém modelo, número de série e data, que também identificam; (c) mantém o que o navegador precisa para mostrar a foto e nada mais |
| Q3 | Imagem que o removedor não consegue percorrer | (a) recusar com `415 UPLOAD_FILE_TYPE_NOT_ALLOWED`; (b) gravar o original; (c) código novo `UPLOAD_FILE_INVALID` | **(a)** | (b) deixa passar justamente o caso não verificado; (c) pede chave nova nos três idiomas para um caso raro, e a mensagem de hoje ("envie JPG, PNG ou WebP") serve para arquivo corrompido |
| Q4 | Quais hosts entram na allowlist? | (a) só `lh3.googleusercontent.com`, igual à CSP; (b) variável de ambiente; (c) `*.googleusercontent.com` | **(a)** | a spec não admite variável nova; (c) aceitaria hosts que a CSP bloqueia. Fork com CDN edita a constante e a CSP juntas |
| Q5 | E as URLs externas já gravadas? | (a) leitura igual, reenvio sem mudança aceito; (b) filtrar na leitura; (c) script que limpa os documentos | **(a)** | o item da spec fala do que se aceita na escrita. Nenhum código do servidor busca essas URLs, e a CSP já as bloqueia na tela. (b) e (c) mexem em dado do usuário sem ganho de segurança mensurável |
| Q6 | Espelhar a allowlist no formulário e reescrever a ajuda da caixa de URL? | (a) só na API; (b) API, schemas do `apps/app` e texto nos três idiomas | **(a)** | a caixa de URL só aparece sem bucket, a API devolve o erro traduzido, e o texto de ajuda já pedia para trocar por upload em produção. (b) acrescenta dois schemas e doze textos para um modo de desenvolvimento. Se você quiser, é uma tarefa direta pequena |
| Q7 | Declarar `server-only` no `package.json` de `@repo/email`? | (a) não, como `@repo/auth`; (b) sim, como `@repo/payments` e `@repo/analytics` | **(a)** | evita mexer no lockfile numa rodada sem você; resolve pelo `public-hoist-pattern[]=*` do `.npmrc`, que é como `@repo/auth` funciona hoje |
| Q8 | Duplicar a leitura com teto ou extrair? | (a) extrair `readCappedBody`; (b) copiar para `file.schema.ts` | **(a)** | a política manda corrigir na raiz; com dois chamadores, a cópia já seria a segunda versão do mesmo laço, com o mesmo detalhe do `releaseLock` |
| Q9 | Apagar `components.header.noAccount` junto do componente? | (a) não; (b) sim | **(a)** | não é usada pelo componente e não está na spec; continua como achado 🟢 do `BACKLOG.md:1386` |
| Q10 | Atualizar os documentos que a fatia 2 também mexeu? | (a) sim, em trechos distantes, separáveis por `git add -p`; (b) não tocar | **(a)** | `01-security-review.md` é o roteiro que o fork roda na entrega; sem a linha, o auditor não sabe que foto e avatar estão protegidos. Os trechos não encostam nos da fatia 2 (§B9) |
| Q11 | Limpar o EXIF dos objetos já gravados? | (a) não; (b) script de backfill | **(a)** | só afeta fork já em produção com upload, custa egress e reescrita, e o core não tem esse dado. Vira achado para o `/spec --sync` |
| Q12 | Pôr `loading` no botão do Google da landing, como na `app`? | (a) não; (b) sim | **(a)** | o item pede travar; `loading` muda pixel e pediria a matriz visual inteira no `/test` |
| Q13 | `size` da resposta do upload | (a) tamanho gravado; (b) tamanho enviado | **(a)** | é o tamanho do objeto que a URL devolvida serve |
