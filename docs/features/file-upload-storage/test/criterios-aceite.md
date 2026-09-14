# Critérios de Aceite (Checklist)

Feature **`file-upload-storage`** — upload de imagem para bucket privado, com referência persistida e URL
assinada derivada na leitura. Formato §9.1 de [`docs/feature-analysis-guide.md`](../../../feature-analysis-guide.md).

O status de cada critério (PASS / FALHOU / bloqueado por infra / não coberto) e o meio de verificação estão
em [`report.md`](report.md). Os critérios marcados com 🔒 dependem do **pré-requisito manual de infra**
(Cloud Storage não ativado no projeto Firebase) e **não** foram verificados nesta rodada.

---

## Campo de upload no formulário

- [ ] **O formulário de entidade oferece um seletor de imagem quando o fork tem bucket configurado**
  Com `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` preenchida, o campo `photo` deixa de ser um input de texto e
  passa a ser o `HookFormImageUpload`: rótulo "Foto", botão "Escolher imagem" e a dica "JPG, PNG ou WebP,
  até 4 MB.". O input `type="file"` fica visualmente oculto mas continua sendo o controle rotulado — o
  `aria-describedby` aponta para a dica, e o botão apenas dispara o `click()` do input. Quando o registro
  já tem uma referência gravada, o botão passa a dizer "Trocar imagem" e surge um segundo botão "Remover
  imagem"; sem referência, nenhum dos dois aparece.

- [ ] **O valor do formulário é a referência (caminho no bucket), nunca a URL assinada**
  Após um upload bem-sucedido, o `onChange` do campo recebe `uploaded.path`
  (`uploads/<userId>/<uuid>.<ext>`) e a pré-visualização usa `uploaded.url` — dois valores separados de
  propósito. A URL assinada expira em 15 minutos e não pode virar o conteúdo do campo, porque seria ela a
  ser enviada no `POST`/`PUT` e gravada no Firestore. Ao editar um registro existente, o preview vem de
  `entity.photoUrl` (derivado pela API) enquanto o campo continua com `entity.photo`.

- [ ] 🔒 **A barra de progresso aparece durante o envio e a pré-visualização substitui-a ao terminar**
  Enquanto o upload está em voo, o botão fica desabilitado e passa a exibir "Enviando…", uma `Progress`
  aparece abaixo do campo e uma região `aria-live="polite"` anuncia "Enviando… N%". Ao concluir com
  sucesso, a barra some e a miniatura de 64 px da imagem recém-enviada aparece à esquerda dos botões. O
  progresso vem do `onUploadProgress` do axios, portanto só reflete o envio ao servidor, não a gravação no
  bucket.

- [ ] **Submeter o formulário fica bloqueado enquanto um upload está em voo**
  O `Footer` recebe `disabled={isImpersonating || isUploading}`, então "Salvar" não aceita clique durante o
  envio; o botão de escolher também fica desabilitado, o que impede um segundo arquivo ser escolhido por
  duplo clique e garante **uma requisição por escolha**. Ao terminar (sucesso ou falha) os dois voltam a
  ficar habilitados, sem `useEffect` de sincronização.

- [ ] **Remover a imagem limpa a referência sem tocar no bucket naquele instante**
  "Remover imagem" chama `onChange("")` e limpa a pré-visualização local; nada é apagado no bucket até o
  `PUT` ser salvo. Se o usuário desistir e sair da tela sem salvar, o objeto continua íntegro e o registro
  continua apontando para ele — a remoção só se materializa quando a escrita no Firestore acontece.

## Validação no cliente (conveniência) e no servidor (autoridade)

- [ ] **Arquivo acima de 4 MB é recusado no cliente, sem gastar requisição**
  `ImageUploadInput` compara `file.size` com `maxSizeBytes` (4 MiB) antes de qualquer chamada e exibe "A
  imagem excede 4 MB." (`photoUpload.errors.tooLarge`). Nenhuma requisição é disparada — o contador de
  `POST /files` no log da API não se move — e o campo do formulário **não** recebe valor. Isso é
  conveniência: a autoridade continua sendo a API.

- [ ] **Tipo fora do allowlist é recusado no cliente pelo MIME declarado**
  Um `.svg`, `.gif` ou qualquer tipo que o browser declare fora de `image/jpeg|png|webp` exibe "Formato não
  aceito. Escolha JPG, PNG ou WebP." e não sobe. A declaração vazia ou `application/octet-stream` **não** é
  recusada no cliente, porque um encoder multipart escreve esse valor sempre que o browser não sabe o tipo
  do arquivo — recusar aí quebraria upload legítimo.

- [ ] **A API recusa por bytes reais, não pela extensão nem pelo tipo declarado**
  `sniffImageType` lê os 12 primeiros bytes e só aceita as assinaturas de JPEG (`ffd8ff`), PNG
  (`89504e470d0a1a0a`) e RIFF/WEBP. Um `.txt` renomeado para `.jpg` passa pelo filtro do browser e leva
  **415 `UPLOAD_FILE_TYPE_NOT_ALLOWED`** da API, com a copy traduzida ("Formato não aceito. **Envie** JPG,
  PNG ou WebP." — repare que a copy do servidor difere da do cliente, o que permite distinguir quem
  recusou). A extensão gravada no caminho vem do tipo farejado, nunca do nome enviado: um arquivo chamado
  `../../evil.php.jpg` com bytes de PNG vira `<uuid>.png`.

- [ ] **Declarar um tipo que contradiz os bytes é recusado; não declarar nada não é**
  PNG declarado como `image/jpeg` ⇒ 415. Os mesmos bytes declarados como `application/octet-stream` ou sem
  tipo ⇒ aceitos, e o tipo real decide a extensão. O tipo declarado é restrição **adicional**, nunca
  permissiva — não existe declaração capaz de fazer a API aceitar bytes que o sniffing reprova.

- [ ] **Valores-limite de tamanho respondem com o código certo**
  Exatamente 4 MiB (4.194.304 bytes) é **aceito**. Um byte acima é recusado com **413
  `UPLOAD_FILE_TOO_LARGE`**. Um corpo cujo `content-length` declarado ultrapassa 4 MiB + 64 KiB (folga do
  envelope multipart) deve ser recusado **antes** de `req.formData()` bufferizar a memória — também com
  413 e o mesmo `error.code`, porque uma recusa sem código não é traduzível pelo painel.

- [ ] **Campo `file` ausente, vazio ou não-arquivo responde 400 `UPLOAD_FILE_MISSING`**
  Requisição sem a parte `file`, com `file` sendo uma string em vez de arquivo, ou com um arquivo de zero
  byte, todas recebem **400 `UPLOAD_FILE_MISSING`**. Um corpo que nem é multipart válido (falha de
  `formData()`) cai no mesmo código, em vez de virar 500 sem vocabulário.

## Autorização e posse

- [ ] **`POST /files` exige sessão e recusa quem não tem perfil**
  Sem `Authorization`, a rota responde **401 `AUTH_INVALID_TOKEN`**, sem stack trace e sem revelar se o
  storage está configurado. Um token válido cujo UID não tem perfil Firestore recebe **403
  `COMMON_PANEL_FORBIDDEN`**. A checagem de configuração de bucket (`STORAGE_NOT_CONFIGURED`) roda **depois**
  do guard, então o estado da infra não vaza para quem não está autenticado.

- [ ] 🔒 **Admin personificando um usuário comum vê as imagens, mas não consegue subir uma**
  Leitura funciona normalmente durante a impersonação (as URLs assinadas do sujeito personificado são
  emitidas). Qualquer escrita — incluindo `POST /files` — é bloqueada por
  `assertReadOnlyWhileImpersonating` com **403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY`**, e a copy traduzida
  aparece na tela. Um usuário comum que forje os headers de impersonação recebe
  `AUTH_REQUEST_USER_ID_MISMATCH`, porque o header é comparado com o UID do token verificado.

- [ ] **Apontar um registro para o objeto de outro dono é recusado com `ENTITY_PHOTO_INVALID`**
  No `POST /entities` e no `PUT /entities/[id]`, uma referência que é caminho de objeto só é aceita se
  estiver sob `uploads/<id-do-próprio-perfil>/`. Um caminho bem formado de outro dono
  (`uploads/someone-else/<uuid>.png`) responde **400 `ENTITY_PHOTO_INVALID`** e o registro não é
  criado/atualizado. A decisão é **fail-closed**: o handler não confia no schema ter filtrado; qualquer
  valor que não seja URL http(s) absoluta **nem** caminho próprio bem formado é recusado, de modo que
  nenhum valor fora do formato escapa da checagem e ainda assim é assinado na volta.

- [ ] **Valores fora do formato são recusados ainda no schema com `VALIDATION_FAILED`**
  `uploads/../../etc/passwd`, `javascript:alert(1)`, `data:image/png;base64,…` e texto aleatório recebem
  **400 `VALIDATION_FAILED`** antes de chegarem ao handler. Fixar o esquema em `http`/`https` é o que
  mantém `javascript:` fora, já que ele parseia como URL e o valor vai parar no `src` de uma imagem
  renderizada. `..` sequer casa o regex do caminho (`[A-Za-z0-9_-]` não aceita ponto) e, mesmo que
  casasse, nome de objeto no GCS é literal — não há resolução de caminho.

- [ ] **Acessar, editar ou excluir a entidade de outro usuário responde 404, não 403**
  `GET`, `PUT` e `DELETE` em `/entities/[id]` conferem `row.userId !== ctx.subjectProfile.id` e devolvem
  **404 `ENTITY_NOT_FOUND`** — o mesmo código e status de um id inexistente, para não confirmar a
  existência do registro alheio. A listagem é escopada por `listByUserId`, então a entidade de outro dono
  nunca aparece, nem com a foto.

- [ ] **Uma URL assinada forjada no corpo da requisição não é persistida**
  `photoUrl` é derivado na saída e **jamais** gravado. Enviar `photoUrl` no corpo do `PUT` é recusado pelo
  schema com **400 `VALIDATION_FAILED`** (chave desconhecida), e mesmo que passasse, `BaseRepository.update`
  grava `{...currentData, ...data}` a partir do documento — que não tem `photoUrl` — e o handler só passa
  `{ id, ...patch }`. O documento no Firestore nunca guarda uma assinatura expirável.

## Bucket privado e URL assinada

- [ ] 🔒 **O objeto gravado não é legível sem assinatura**
  `curl https://storage.googleapis.com/<bucket>/<objeto>` sem query de assinatura deve responder **403**.
  As `storage.rules` são deny-all e o código nunca chama `makePublic()` nem `getDownloadURL()`; a leitura
  acontece exclusivamente por URL assinada V4 emitida pela API **depois** de a posse do registro ter sido
  conferida.

- [ ] 🔒 **A URL assinada abre em aba anônima e para de funcionar depois de expirar**
  A URL devolvida em `photoUrl` abre sem sessão (é a assinatura que autoriza, não o cookie) e carrega a
  imagem. Passados 15 minutos, ou com o `X-Goog-Signature` adulterado em um caractere, o mesmo endereço
  responde **403 do Google** — não a imagem, não uma página de erro do app. O `expiresAt` devolvido no
  `UploadedFileDTO` é o instante de expiração em ISO.

- [ ] **A assinatura é derivada na leitura e nunca gravada; falha ao assinar degrada a linha, não a lista**
  `GET /entities` e `GET /entities/[id]` acrescentam `photoUrl` no retorno. Se o bucket recusar assinar um
  objeto específico, aquele registro volta com `photoUrl: null` e a linha renderiza sem miniatura — a
  listagem inteira **não** vira 500 por causa de uma imagem. Um valor legado malformado (texto que
  antecede a validação atual) também devolve `photoUrl: null` e **não** é enviado para assinatura.

- [ ] 🔒 **Substituir a imagem remove o objeto anterior, e só depois de a escrita ter dado certo**
  No `PUT`, o `deleteObjectQuietly` do caminho antigo roda **após** o `await update`: se a escrita falhar, a
  exceção sobe antes e o objeto antigo continua sendo o válido. O objeto só é apagado quando (a) o patch
  tocou em `photo`, (b) existia um valor anterior, (c) ele mudou e (d) ele é um objeto **do próprio dono**.
  Limpar a foto (`photo: ""`) também apaga. Uma URL externa legada **nunca** é alvo de delete, e um patch
  que não menciona `photo` não mexe em nada.

- [ ] **Um objeto referenciado por mais de um registro não pode ser apagado pela troca de foto de um deles**
  Se dois registros do mesmo dono apontarem para o mesmo caminho, trocar a foto de um **não** pode remover
  o arquivo que o outro ainda exibe; o registro sobrevivente passaria a receber uma URL assinada para um
  objeto inexistente. A UI não produz esse estado (cada upload gera um UUID novo), mas a API aceita
  qualquer caminho próprio no corpo, então o estado é alcançável por chamada direta.

- [ ] **O arquivo continua existindo após o soft delete da entidade**
  `BaseRepository.delete` é soft. Apagar o objeto no `DELETE` tornaria a restauração impossível, então o
  arquivo é deliberadamente mantido. A consequência aceita é o órfão no bucket até a varredura de retenção
  existir — isso pertence a `data-rights-lgpd`, não a esta entrega.

## Opt-in por env (o modo degradado)

- [ ] **Sem bucket, o fork sobe, o build passa e o campo de upload simplesmente não aparece**
  Com `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` ausente **ou vazia**, `isStorageEnabled()` é falso e o
  formulário volta a exibir o campo de texto "Foto (URL)" com a dica antiga. A API sobe normalmente: `""`
  precisa significar "sem bucket", não "valor malformado" — um schema que só aceite `undefined` faz
  `keys()` lançar no boot, porque o `.env.example` publica a variável como string vazia.

- [ ] **Sem bucket, `POST /files` responde 503 `STORAGE_NOT_CONFIGURED` com copy traduzida**
  A rota continua existindo e continua autenticada, mas recusa com **503 `STORAGE_NOT_CONFIGURED`** e a
  mensagem "O envio de arquivos não está configurado. Fale com o suporte." Um bucket configurado porém
  inexistente/não provisionado produz **503 `UPLOAD_FAILED`** ("Não foi possível enviar o arquivo agora.
  Tente de novo em instantes.") — dois estados distintos, com códigos distintos.

- [ ] **A política de imagem só ganha o host do bucket quando ele existe**
  Com bucket, o `img-src` da CSP inclui `https://storage.googleapis.com`; sem bucket, o host **não**
  aparece na política. Nenhum fork que não use a feature herda uma origem extra na CSP.

- [ ] **No modo degradado o campo de URL valida a referência e mostra a mensagem certa**
  Um valor que não seja vazio, caminho de objeto bem formado ou URL http(s) absoluta é recusado pelo
  resolver com "Envie uma imagem ou informe uma URL válida (http ou https)."
  (`validation.photoReference`). Essa mensagem só é alcançável no modo degradado — com bucket, o seletor
  nunca produz um valor inválido.

## Convivência com o dado anterior

- [ ] **Uma entidade com URL externa gravada antes da mudança continua salvando e exibindo**
  `entity.photo` aceita **caminho de objeto ou URL absoluta http(s)**. Registros anteriores continuam
  válidos, a API devolve `photoUrl` igual à própria URL (sem assinar) e tanto a listagem quanto a tela de
  edição renderizam normalmente.

- [ ] **Uma URL de host não listado degrada para o ícone de fallback — nunca derruba a página**
  `next/image` **lança** `next-image-unconfigured-host` quando o host não está em `remotePatterns`, e esse
  throw derruba a árvore inteira: a listagem e a tela de edição viram tela de erro. Como o campo aceita URL
  externa arbitrária por design, nenhuma lista estática de hosts cobre o caso — a imagem precisa sair do
  otimizador (`unoptimized`), deixando a CSP ser a autoridade: host não permitido ⇒ `onError` ⇒ ícone de
  fallback, com a página intacta. Vale para a miniatura da listagem e para a pré-visualização do
  formulário.

- [ ] 🔒 **A miniatura de um objeto do bucket carrega de fato**
  Com bucket real, a URL assinada devolvida em `photoUrl` precisa **carregar** a imagem na listagem e no
  preview de edição — não basta provar que um host inválido degrada. O custo assumido do `unoptimized` é
  perder `srcset`/WebP nas miniaturas de 44 px e 64 px, em troca de não desperdiçar cache do otimizador com
  uma URL que muda a cada 15 minutos.

- [ ] **Entidade sem foto renderiza a coluna vazia e devolve `photoUrl: null`**
  `photo` ausente, `null` ou `""` é normalizado para `null` no armazenamento; a API devolve
  `photoUrl: null` e a listagem mostra o ícone de fallback (ou o traço, conforme a coluna). Uma string só
  com espaços é tratada como "sem foto", não como referência inválida.

## Erros, i18n e a11y

- [ ] **Toda recusa carrega um `error.code` estável e traduzido nos 3 idiomas**
  Os seis códigos novos — `STORAGE_NOT_CONFIGURED` (503), `UPLOAD_FILE_MISSING` (400),
  `UPLOAD_FILE_TOO_LARGE` (413), `UPLOAD_FILE_TYPE_NOT_ALLOWED` (415), `UPLOAD_FAILED` (503) e
  `ENTITY_PHOTO_INVALID` (400) — existem em `apiErrors` nos três idiomas com a mesma estrutura. Nenhuma
  resposta de erro devolve stack trace nem mensagem interna como copy, e nenhuma recusa chega ao usuário
  sem código: uma resposta sem `error.code` é indistinguível de uma falha genérica e o painel não tem o que
  traduzir.

- [ ] **Nenhuma string de interface nova fica solta em JSX**
  Rótulo, botões, dica, `alt` da pré-visualização e as três mensagens de erro do componente vêm todos de
  `entities.form.photoUpload`, nos três idiomas. A copy do servidor e a do cliente para o mesmo problema
  são textos distintos de propósito ("Escolha" no cliente, "Envie" no servidor).

- [ ] **O estado inválido é percebido por mais de um canal**
  Quando há erro, o campo marca `aria-invalid`, a mensagem aparece em texto vermelho abaixo do campo e o
  rótulo recebe a cor destrutiva. O progresso é anunciado por uma região `aria-live="polite"` com o texto
  traduzido e o percentual, e a dica é ligada ao input e ao botão por `aria-describedby`.

- [ ] **Tema e responsivo**
  O campo, a pré-visualização, a barra de progresso e a mensagem de erro respeitam light e dark. Em 390 px
  os botões "Trocar imagem" / "Remover imagem" quebram linha sem estourar a largura da página
  (`scrollWidth` ≤ viewport), e a miniatura não empurra o conteúdo para fora.

## Limites de plataforma

- [ ] **`POST /files` está sob rate limit**
  A rota entra em `RATE_LIMITED_PATHS` no `proxy.ts` da API, junto das rotas públicas de auth. Com
  `ARCJET_KEY` configurado, uma rajada de uploads passa a receber **429** com `Retry-After`; sem a chave, o
  `@repo/security` degrada para no-op e a API avisa no boot — nesse estado o limite não é observável.

- [ ] **Nenhuma dependência nova entra no `package.json`**
  `@google-cloud/storage` chega como dependência opcional do `firebase-admin` já instalado; `sharp`,
  `file-type`, `busboy`, `multer` e `formidable` não são adicionados. Um fork que adote a feature não herda
  custo de dependência.
