---
id: file-upload-storage
title: Upload de arquivos e storage
status: proposed
value: alto
effort: M
audience: produto
area: [apps/api, apps/app, packages/sdk, packages/design-system, packages/internationalization]
mode: ambos
depends_on: []
feature: -
updated: 2026-08-21
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
  no repo é em `packages/shared/utils/helpers/formattedError.ts:83`, que apenas detecta o content-type ao
  formatar erro — não processa upload.
- `packages/sdk/src/types/entity/entity.ts:14` — `photo: string | null`. É só uma string.
- `apps/api/(shared)/validation/entity.schema.ts:23` — a validação é
  `z.string().trim().max(2048)`. **Não é validação de URL**: qualquer texto de até 2048 caracteres passa,
  e vai direto para o Firestore via `apps/api/(shared)/mappers/entity.mapper.ts:22`.
- `packages/design-system/components/form/hookform/` — **7** componentes (`hookformInput`,
  `hookformInputPassword`, `hookformTextarea`, `hookformSelect`, `hookformSwitch`, `hookformRadioGroup`,
  `hookformDateInput`). **Nenhum** aceita arquivo.
- `packages/design-system/components/ui/responsive-image.tsx:16` — componente de **exibição** (78
  linhas, `next/image` com fallback quando `src` é vazio, `:27`). Já é o padrão de miniatura em listas
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

- [ ] Um campo de upload no formulário do painel: o usuário escolhe um arquivo, vê o progresso, vê o
      preview e salva o registro com a imagem associada.
- [ ] **Validação no servidor** de tipo real e tamanho máximo, com recusa por `error.code` traduzível —
      o limite do navegador é conveniência, não a proteção.
- [ ] Bucket **não público**: o arquivo só é servido por URL de acesso restrito e expirável, emitida pela
      API para quem tem permissão de ver o registro.
- [ ] Substituir o arquivo de um registro remove o anterior, para o bucket não acumular órfãos.
- [ ] A capacidade é **opt-in por env**: sem a variável configurada, o fork continua funcionando e o
      campo de upload simplesmente não aparece.

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
- **Custo de serviço pago.** O free tier do Firebase Storage é generoso mas finito, e egress é cobrado
  por download. URL expirável ajuda no controle de acesso, não na conta: um fork com imagem pesada em
  lista pública queima cota rápido.
- **Regras do bucket são um segundo modelo de autorização.** Hoje o repo concentra tudo na API
  (`firestore.rules:30` nega todo acesso direto de cliente). Se o cliente subir direto ao bucket, a
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
- Endurecer `entity.photo` agora ou manter texto livre por compatibilidade? — **recomendação:**
  endurecer; hoje o campo aceita qualquer texto, e isso é bug latente, não flexibilidade.
