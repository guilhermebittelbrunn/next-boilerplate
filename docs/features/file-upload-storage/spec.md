---
id: file-upload-storage
title: Upload de arquivos e storage
status: done
value: alto
effort: M
audience: produto
area: [apps/api, apps/app, packages/sdk, packages/design-system, packages/internationalization]
mode: ambos
depends_on: []
contends_on: [firebase.json, apps/api/env.ts, apps/app/env.ts, apps/api/proxy.ts, apps/app/proxy.ts, apps/app/next.config.ts]
feature: file-upload-storage
updated: 2026-09-14
---

# Upload de arquivos e storage

## Problema

O boilerplate não sabe receber um arquivo. Nenhum. O usuário do fork não consegue pôr uma foto no
próprio perfil, nem anexar uma imagem a um registro — e o desenvolvedor do fork não tem nem onde
guardar, nem por onde subir.

Todo fork descobre isso no primeiro dia de UI real, numa capacidade banal e perigosa em partes iguais:
quem improvisa acaba com bucket público, arquivo validado só no navegador, ou uma URL de terceiro colada
à mão num campo de texto. Fazer certo uma vez, no core, é barato; errar em cinco forks é o cenário atual.

## O que já existe no repo

- `firebase.json:1` — o arquivo tem **6 linhas** e declara só `firestore.rules` e
  `firestore.indexes.json`. **Não há bloco `storage`** — o projeto Firebase nem sequer tem bucket
  configurado no repo.
- Busca por integração de storage em `apps/` + `packages/` (`getStorage`, `firebase-storage`,
  `@aws-sdk`, `S3Client`, `uploadthing`): **zero ocorrências**. A única menção a `multipart/form-data`
  no repo é em `packages/shared/utils/helpers/formattedError.ts:115`, que apenas detecta o content-type ao
  formatar erro — não processa upload.
- `packages/sdk/src/types/entity/entity.ts:14` — `photo: string | null`. É só uma string.
- `apps/api/(shared)/validation/entity.schema.ts:23` — a validação é
  `z.string().trim().max(PHOTO_URL_MAX)`, com `PHOTO_URL_MAX = 2048` declarado em `:7`. **Não é validação
  de URL**: qualquer texto de até 2048 caracteres passa. O mesmo limite se repete, **idêntico**, em
  `updateEntitySchema` (`:34`) — a spec original citava só o `createEntitySchema`. No lado da leitura, o
  campo chega pronto via `apps/api/(shared)/mappers/entity.mapper.ts:19` (`toDTO`); no lado da escrita, o
  caminho é `toPersistence` (`:32-52`), com `"photo"` na lista de chaves em `:41`.
- `packages/design-system/components/form/hookform/` — **7** componentes (`hookformInput`,
  `hookformInputPassword`, `hookformTextarea`, `hookformSelect`, `hookformSwitch`, `hookformRadioGroup`,
  `hookformDateInput`). **Nenhum** aceita arquivo.
- `packages/design-system/components/ui/responsive-image.tsx:16` — componente de **exibição** (78
  linhas, `next/image`). Quando `src` é vazio, `:27` não é fallback nenhum: é `return <></>`, ou seja,
  **não renderiza nada** — sem imagem substituta, sem placeholder. Já é o padrão de miniatura em listas
  segundo `apps/app/CLAUDE.md`. Reaproveitável como preview.
- `packages/{analytics,auth,email,internationalization,next-config,payments,security}/keys.ts` — 7
  arquivos de env tipada; nenhum declara bucket ou credencial de storage.
- **Lacuna:** não existe upload, não existe storage, não existe validação de arquivo, e o campo que
  parece ser de imagem (`entity.photo`) é texto livre não verificado.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md)
- Prevalência: **6 de 10** starters entregam perfil com avatar/upload por padrão. É a faixa
  "esperado, não diferencial" — a nota classifica o valor para o usuário como **alto** e o esforço como
  **P**, e observa que o recurso "traz consigo storage de arquivo".
- Armadilha explícita na nota: **validar MIME e tamanho no servidor**, e **bucket não público**.
- A nota registra ainda um efeito colateral: exclusão de conta (4/10) falha justamente por deixar
  "arquivos no bucket" órfãos — storage sem política de remoção cria dívida em `data-rights-lgpd`.

## Proposta — corte de MVP

> **Entregue.** PR **#11** mergeada em `main` em 2026-09-14T23:53:32Z (merge commit `9154776`), CI
> **verde** nesse SHA (run `34910857483`, `success`). Os 5 itens abaixo foram reconferidos **um a um no
> código** em 2026-09-14, não no `status` gravado.

- [x] Um campo de upload no formulário do painel: o usuário escolhe um arquivo, vê o progresso, vê o
      preview e salva o registro com a imagem associada.
      → `EntityFormFields.tsx:121-128` monta `HookFormImageUpload`;
      `packages/design-system/components/ui/image-upload-input.tsx:215-217` renderiza a barra de
      progresso e o percentual, `:162-167` o preview;
      `packages/sdk/src/actions/file/action.ts:29-36` converte `onUploadProgress` em percentual;
      `apps/app/shared/hooks/useFileUpload.ts:26` chama `apiClient.file.upload`.
- [x] **Validação no servidor** de tipo real e tamanho máximo, com recusa por `error.code` traduzível —
      o limite do navegador é conveniência, não a proteção.
      → `apps/api/(shared)/validation/file.schema.ts:128` faz sniffing de magic bytes
      (`sniffImageType:73-84`), `:123-125` recusa acima de 4 MiB e `:107-109` recusa antes de bufferizar
      pelo `content-length`; os 6 códigos estão traduzidos nos 3 idiomas em
      `packages/internationalization/translations/packages/shared/utils.ts:55-63` (pt-br), `:115-123`
      (en), `:181-189` (es).
- [x] Bucket **não público**: o arquivo só é servido por URL de acesso restrito e expirável, emitida pela
      API para quem tem permissão de ver o registro.
      → `apps/api/(shared)/lib/storage.ts:56-67` emite URL assinada V4 com TTL de 15 min (`:11`);
      `entity-photo.ts:31-34` decide **fail-closed** (só URL http(s) absoluta ou objeto sob o prefixo do
      próprio dono); `entities/[id]/route.ts:65-73` recusa referência alheia com `ENTITY_PHOTO_INVALID`;
      `storage.rules:26-30` publica `allow read, write: if false`. Zero ocorrências de
      `makePublic`/`getDownloadURL`/`allUsers` em `apps/` + `packages/`.
- [x] Substituir o arquivo de um registro remove o anterior, para o bucket não acumular órfãos.
      → `apps/api/app/(routes)/entities/[id]/route.ts:81-91` chama `deleteObjectQuietly(previousPhoto)`
      **depois** do `update`, e só quando o objeto é do próprio dono (`isOwnStorageObject`).
      ⚠️ **Limitação conhecida e aceita** (não é falha do corte): sem contagem de referência, dois
      registros apontando para o mesmo objeto perdem a miniatura de um deles. Ver [Achados].
- [x] A capacidade é **opt-in por env**: sem a variável configurada, o fork continua funcionando e o
      campo de upload simplesmente não aparece.
      → `apps/api/(shared)/lib/storage.ts:23-24` (`isStorageConfigured`) e `apps/api/app/(routes)/files/route.ts:14-19`
      devolvem `STORAGE_NOT_CONFIGURED` 503; `apps/app/shared/lib/storageEnabled.ts:3-4` +
      `EntityFormFields.tsx:47,121-141` caem de volta no campo de URL; a env é `.optional()` nos três
      pontos (`packages/auth/keys.ts:18`, `apps/api/env.ts:26`, `apps/app/env.ts:16`), então o boot e o
      build passam sem ela.

### Fora do corte

- Múltiplos arquivos por registro, galeria, reordenação e drag-and-drop de vários itens.
- Redimensionamento/otimização no servidor, thumbnails geradas, conversão de formato.
- Documentos não-imagem (PDF, planilha) e antivírus — mais conformidade que produto.
- Upload de avatar na tela de conta (depende de `account-settings`) e varredura de órfãos/limpeza no
  encerramento de conta (pertence a `data-rights-lgpd`).

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Ação de upload e de emissão de acesso ao arquivo; o campo de imagem deixa de ser texto livre e passa a referenciar um objeto do storage. |
| `apps/api` | Rota de upload sob guard de painel comum + validação de tipo/tamanho na borda; emissão de URL restrita; remoção do arquivo antigo. Nenhuma coleção nova. |
| `apps/app` | Campo de upload no formulário de `entities` (slice de referência) e preview com `ResponsiveImage`. |
| `apps/web` | N/A. |
| `packages/*` | `design-system`: o 8.º componente `HookForm*`, o primeiro de arquivo. i18n nos 3 idiomas, incluindo os novos `apiErrors`. |
| Infra/env | Bloco `storage` no `firebase.json` + regras do bucket; env tipada nova (bucket/credencial) em `keys.ts`; conta de serviço com permissão de escrita. |

## Riscos e trade-offs

- **Custo herdado por todo fork:** variável de ambiente nova e um bucket a provisionar. Precisa ser
  opt-in de verdade — um fork sem storage configurado tem de subir e passar no build. Se a env virar
  obrigatória, todo fork paga por um recurso que talvez não use.
- **Custo de serviço pago.** ⚠️ **Corrigido em 2026-09-14 — este risco estava mal formulado.** Não é que o
  free tier seja "generoso mas finito": desde **2026-02-03** o Cloud Storage **não existe no plano Spark**
  (chamadas voltam 402/403). Ligar upload **exige plano Blaze, ou seja, cartão de crédito** — ainda que o
  gasto real seja **$0,00/mês** no cenário de um MVP. O risco é de **plano e atrito de cadastro**, não de
  cota. Segue verdade que egress é cobrado por download e que URL expirável ajuda no controle de acesso,
  não na conta. Números, comparativo com S3/R2 e cenários de 10×/100×:
  [`research/object-storage-costs.md`](research/object-storage-costs.md).
- **Regras do bucket são um segundo modelo de autorização.** Hoje o repo concentra tudo na API
  (`firestore.rules:32-33`, `match /{document=**}` com `allow read, write: if false;`, nega todo acesso
  direto de cliente). Se o cliente subir direto ao bucket, a
  autorização passa a viver nas regras, e divergir do guard da API é o caminho mais curto para vazamento.
  Atravessar a API mantém um único lugar de decisão, ao custo de tráfego pela função — e do limite de
  tamanho de corpo do runtime, que precisa entrar no limite anunciado ao usuário.
- **Migração do que já existe.** `entity.photo` aceita qualquer string; forks podem ter URLs externas
  gravadas. Endurecer a validação sem plano de convivência quebra dados existentes.

## Sinais de pronto

- O usuário sobe uma imagem no formulário, vê o preview, salva, e a imagem aparece na lista.
- Um arquivo de tipo não permitido ou acima do limite é recusado **mesmo** contornando o navegador, com
  mensagem traduzida nos 3 idiomas.
- A URL do arquivo não abre para quem não tem permissão, e expira.
- Trocar a imagem de um registro não deixa o arquivo antigo no bucket.
- Com a env de storage ausente, o app sobe, o build passa e o campo de upload não é renderizado.

## Perguntas em aberto

- Upload atravessa a API ou vai direto ao bucket com credencial de curta duração? — **recomendação:**
  atravessar a API no MVP (uma única autoridade de autorização e validação real de tipo); migrar para
  upload direto só se o limite de corpo virar problema medido.
- Firebase Storage ou provedor S3-compatível? — **recomendação:** Firebase Storage, para não introduzir
  um segundo provedor num repo que já roda Auth e Firestore em Firebase.
  ✅ **Pesquisado e confirmado em 2026-09-14** ([`research/object-storage-costs.md`](research/object-storage-costs.md)):
  no cenário de MVP o custo é **$0,00** no Cloud Storage, **$0,10** no S3 e **$0,00** no R2 — **S3 não é
  mais barato**, é a única das três que cobra no MVP e a única cujo free tier expira. Custo de dependência
  do Firebase segue **zero** (`@google-cloud/storage` já vem com o `firebase-admin`). **Ressalva que a
  decisão original não previa:** exige plano **Blaze** (cartão). **Saída registrada:** o **Cloudflare R2**
  tem **egress zero** e fica ~80× mais barato a partir de ~10× este cenário; o gatilho para reavaliar é
  egress **> ~100 GB/mês**. A troca é barata e continua barata — todo o provedor está isolado em
  `apps/api/(shared)/lib/storage.ts`, e S3/R2 são API-compatíveis entre si.
- Endurecer `entity.photo` agora ou manter texto livre por compatibilidade? — **recomendação:**
  endurecer; hoje o campo aceita qualquer texto, e isso é bug latente, não flexibilidade.
