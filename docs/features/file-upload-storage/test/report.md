# Relatório de QA — `file-upload-storage`

**Data:** 2026-09-11 · **Branch:** `spec-sync-backlog-loop` (não protegida, em `e4eddb9`) · **Nada
commitado.**

Critérios completos em [`criterios-aceite.md`](criterios-aceite.md) (formato §9.1, 37 critérios).
Screenshots em [`e2e/`](e2e/) (16 arquivos).

## Veredito

**Aprovado com ressalvas.** Os gates passaram nas três execuções, o bloqueante que a revisão corrigiu foi
reconfirmado no browser (não aceito por screenshot de terceiro), e o modo degradado funciona ponta a
ponta. Duas ressalvas: **um defeito novo** e **6 critérios que ninguém consegue verificar** enquanto o
Cloud Storage não for ativado.

## Gates

| comando | resultado |
|---------|-----------|
| `pnpm turbo run lint typecheck test --force` (1ª) | ✅ **23/23 tasks**, exit 0 — 37,2 s |
| `pnpm turbo run lint typecheck test --force` (2ª) | ✅ 23/23 — 35,5 s |
| `pnpm turbo run lint typecheck test --force` (3ª) | ✅ 23/23 — 60,3 s |
| `pnpm test` (raiz — é o que gateia o `turbo build`) | ✅ 9/9 workspaces |
| `pnpm check` | ✅ **471 arquivos, 0 erro, 0 warning** |
| `pnpm --filter @repo/internationalization test` | ✅ 27 testes — paridade pt-br/en/es |

**748 testes** no total. Por workspace: `app` **202 → 208**, `api` 266, `email` 137, `security` 31,
`auth` 29, `web` 27, `@repo/internationalization` 27, `shared` 15, `payments` 8.

**O flake de `securityPolicySources.test.ts` não reproduziu** — terceira auditoria seguida. Foram 3
execuções completas do gate com `--force` mais **5 execuções isoladas** do arquivo: sempre 10/10, com
tempo de teste entre **259 ms e 411 ms**, mais de uma ordem de grandeza abaixo do default de 5 s. A causa
estrutural segue de pé (o arquivo chama `vi.resetModules()` e reimporta `@/proxy` a cada caso, e nenhuma
das 9 configs de Vitest declara `testTimeout`), então isto continua sendo ausência de reprodução, não
prova de ausência.

## Placar dos critérios

**26 PASS · 3 PARCIAL · 2 FALHOU · 6 bloqueados por infra** — e, depois da 2ª rodada do `/review`, um dos
dois "FALHOU" caiu: o 500 sem `error.code` **não existe em build de produção**. Placar final: **27 PASS ·
3 PARCIAL · 1 limitação conhecida · 6 bloqueados por infra.**

### ❌→✅ Defeito novo — `POST /files` responde 500 HTML sem `error.code` (**só em `next dev`**)

> **Resolvido na 2ª rodada do `/review`, por medição — sem mudança em código de produção.** Ver §12 do
> [`review.md`](../review/review.md). O que segue é o registro original do QA; a conclusão está logo
> abaixo dele.

```
4.194.304 B (4 MiB exatos) -> 503 UPLOAD_FAILED          (aceito; 503 só por não haver bucket)
4.200.000 B                -> 413 UPLOAD_FILE_TOO_LARGE   ✅
4.404.019 B                -> 500 <!DOCTYPE html>          ❌
4.718.592 B                -> 500 <!DOCTYPE html>          ❌
5.242.955 B                -> 500 <!DOCTYPE html>          ❌
```

Log da API, 3 ocorrências ↔ as 3 respostas 500:

```
⨯ TypeError: Response body object should not be disturbed or locked
    at ignore-listed frames { page: '/files' }
```

A recusa retorna **sem consumir `req.body`** enquanto o corpo grande ainda está sendo transmitido. O
limiar coincide com `DECLARED_BODY_MAX_BYTES` = 4 MiB + 64 KiB.

Importa mais do que a contagem sugere: **anula na prática o endurecimento por `content-length`** — o caso
que a proteção existe para cobrir é justamente o que perde o `error.code`. Viola a regra de ouro 3.

**Não é regressão da revisão.** `POST /files` **sem sessão** com 4,5 MiB também vira 500 em vez de 401,
então o guard pré-existente tem o mesmo problema. A UI não alcança o estado (o cliente recusa acima de
4 MiB). Medido em `next dev`; falta confirmar em build de produção. Correção sugerida e **não aplicada
nesta etapa**: consumir/cancelar o corpo antes da recusa antecipada, em `parseUploadedImage` e no guard.

#### Conclusão da 2ª rodada do `/review` — o defeito **não existe em produção**

```
PRODUÇÃO, sem sessão:  4,19 MB / 4,40 MB / 4,72 MB / 12 MB  -> 401 AUTH_INVALID_TOKEN
PRODUÇÃO, com sessão:  4,20 MB / 4,40 MB / 4,72 MB / 12 MB  -> 413 UPLOAD_FILE_TOO_LARGE
                       4 MiB exatos                          -> 503 UPLOAD_FAILED (sem bucket)
```

Zero `disturbed or locked` no log de produção, em todas as faixas, até 12 MB. Produção foi rodada **com e
sem** a correção sugerida, para isolar a variável: as duas passam. O `error.code` não se perde onde
importa.

**A correção sugerida foi implementada, medida e revertida** — é o registro mais útil desta rodada:

| abordagem | dev 4,4 MB | dev 4,7 MB | dev 12 MB |
|---|---|---|---|
| `body.cancel()` (o que este relatório sugeriu) | ❌ 500 | ❌ 500 | ❌ 500 |
| `req.arrayBuffer()` (drenar) | ✅ 401 | ❌ 500 | ❌ 500 |
| sem nada (produção) | ✅ 401 | ✅ 401 | ✅ 401 |

`cancel()` não resolve. Drenar só empurra o limiar **e bufferiza o corpo inteiro em memória** — exatamente
o vetor que o teto por `content-length` existe para fechar. Qualquer uma das duas seria código morto em
produção e ineficaz em dev; a do drain seria ainda uma regressão de segurança acompanhada de um comentário
afirmando o contrário.

**Correção ao diagnóstico deste relatório:** o limiar **não** é o `DECLARED_BODY_MAX_BYTES`. Sem sessão o
guard recusa antes de `parseUploadedImage`, então a constante nem chega a ser consultada — é o buffer do
runtime de dev (~4 MiB), e ele **oscila entre execuções**. Isso também desfaz a leitura de que o
endurecimento por `content-length` teria sido anulado: em produção ele devolve 413 em todas as faixas.

**Teste acrescentado** (`fileUploadRoute.test.ts`, parametrizado) fixa o contrato independentemente do
runtime: acima do teto ⇒ 413 + `error.code` + `content-type: application/json`; sem sessão ⇒ 401; **nunca
HTML**. API **266 → 268**.

### ❌ Um objeto referenciado por dois registros

Sonda executável sobre o handler real — **o arquivo foi descartado depois**, de propósito: um teste verde
afirmando o comportamento errado viraria contrato.

```
entity-1.photo = entity-2.photo = uploads/p2/9f1c…a44.webp
PUT /entities/entity-1 { photo: uploads/p2/1111…555.png }
  -> deleteObjectQuietly("uploads/p2/9f1c…a44.webp")
GET /entities
  -> entity-2.photo    = "uploads/p2/9f1c…a44.webp"            (objeto já apagado)
     entity-2.photoUrl = "https://storage.googleapis.com/…"     (assinada para o que não existe)
```

`deleteObjectQuietly` tem um único call site (`entities/[id]/route.ts:90`) e não consulta outros
registros. A UI não produz o estado; a API aceita.

### ⚠️ Parciais

| critério | o que faltou |
|---|---|
| Preview da imagem enviada | progresso e "Enviando…" vistos em voo; o preview depende do bucket |
| `error.code` em toda recusa | 6 códigos conferidos — menos o caso do defeito acima |
| Estado inválido percebido por mais de um canal | mensagem vermelha e `aria-invalid` OK; **no dark o rótulo não fica vermelho** |

Sobre o último: `dark:text-gray-400` vence `text-destructive` — medido `lab(65,9 −0,8 −8,2)` no dark
contra `lab(48,4 77,4 61,5)` no light. É **pré-existente e idêntico** em `date-input`,
`radio-group-input` e `textarea-input`: achado do design system para o backlog, **não** desta entrega.

### 🔒 Bloqueados por infra — não verificados, **não** reprovados

O Cloud Storage não está ativado em `next-boilerplate-576d0` (`firebasestorage…/o` → 400;
`POST /files` → 503 `UPLOAD_FAILED`, que é o comportamento **esperado** e é o item 5 do corte
funcionando). Ficam sem verificação:

preview da imagem enviada · impersonação na tela · 403 sem assinatura · expiração da URL · remoção do
objeto anterior contra bucket real · miniatura assinada carregando.

**Para destravar** (passos do plano, todos manuais): (1) ativar o Cloud Storage no console; (2) preencher
`FIREBASE_STORAGE_BUCKET` em `apps/api/.env` e as duas variáveis na Vercel; (3) conceder
`roles/storage.objectAdmin` à service account no bucket; (4) `firebase deploy --only storage`
(com `--dry-run` antes); (5) **não** conceder `allUsers` e conferir `curl` → 403; (6) CORS no bucket não é
necessário — o upload atravessa a API.

**Rate limit de `/files` — não verificável localmente.** A API imprime
`[security] rate limiting is DISABLED (no ARCJET_KEY)` e 20 POSTs deram 20×503, **0×429**. O que
provaria: subir com `ARCJET_KEY` válida e esperar 429 + `Retry-After`.

## O bloqueante da revisão — reconfirmado

Não foi aceito por print de terceiro. Listagem **e** edição com URL externa (`cdn.example.com`, host
**não** listado em `remotePatterns`) renderizam inteiras, com ícone de fallback, sem erro no console e sem
`⨯` no log da API. O `unoptimized` foi provado pelo DOM, com um host listado:

```json
[{"src":"https://lh3.googleusercontent.com/a/default-user=s96-c","srcset":null,"loading":"lazy"}]
```

`src` cru e `srcset: null` — com o otimizador seria `/_next/image?url=…&w=…`. Isso evidencia também o
custo aceito na revisão: sem `srcset`/WebP nas miniaturas (44/64 px, impacto baixo).

## Teste criado

**`apps/app/__tests__/useFileUpload.test.ts`** — 6 casos, o pedido explícito da revisão. Mocka só as
bordas e usa `FormattedError`/`handleClientError` **reais**, para a tradução ser provada de verdade:

- DTO e callback de progresso repassados ao SDK;
- `isUploading` em voo (deferred) e no `finally` da falha;
- `error.code` traduzido relançado como `Error`, e **não** mais como `AxiosError`;
- locale ativo em `en` e `es`;
- `ERR_NETWORK` caindo na copy genérica.

Nenhum teste existente foi desativado ou afrouxado.

## Outros achados da validação executável

- **`ENTITY_PHOTO_INVALID` não é alcançável pela UI em nenhum dos dois modos — e o motivo é uma defesa.**
  No modo degradado o campo é `<input type="url">` e o form **não tem `noValidate`**: um caminho de objeto
  não é URL absoluta, então o browser bloqueia o submit nativamente (medido: `requestSubmit()` ⇒ **0
  eventos** de submit). Confirmado por chamada direta: 400 `ENTITY_PHOTO_INVALID`. Coerente com o desenho —
  `javascript:alert(1)` **é** URL válida para o `type=url`, passa a validação nativa e é barrado pelo
  `refine` do Zod.
- **Posse com 2 contas reais**: `GET`/`PUT`/`DELETE` na entidade alheia ⇒ **404 `ENTITY_NOT_FOUND`**, igual
  a id inexistente. `PUT` com `photoUrl` forjado ⇒ **400 `VALIDATION_FAILED`** (schema estrito), documento
  intacto.
- **Modo degradado medido**: app reiniciada com a env vazia — o campo volta a "Foto (URL)",
  `validation.photoReference` aparece na tela, e a `img-src` fica **sem** `storage.googleapis.com` (com
  bucket configurado, presente).
- **Matriz de `/files`**: 401 sem sessão · 400 `UPLOAD_FILE_MISSING` (sem campo, campo string, zero byte) ·
  415 (texto declarado `image/jpeg`, PNG declarado `image/jpeg`, nome com `../`) · `octet-stream` segue em
  frente, como desenhado.

## Validação visual

`agent-browser 0.27.0`, comandos rodados **estritamente em sequência**. **16 screenshots** em
[`e2e/`](e2e/) — light, dark e 390×844, nos três idiomas. Destaques:

| arquivo | o que prova |
|---|---|
| `06-upload-em-voo-progresso-dark.png` | barra de progresso em movimento, "Enviando…" desabilitado e "Salvar" bloqueado |
| `11-lista-url-legada-light.png` · `13-edicao-url-legada-light.png` | o bloqueante corrigido — página inteira, com fallback |
| `09-modo-degradado-campo-url-light.png` · `10-validacao-photoReference-light.png` | o modo degradado |
| `15-copy-en-erro-415-dark.png` · `16-copy-es-erro-503-dark.png` | copy traduzida nos erros |

## Cross-check de cobertura

`apps/web` **N/A** (não exibe imagem de usuário) · painel comum ✅ · admin **N/A** · impersonação 🔒 só
unitário · `subscription` × `simple` **N/A** · mobile + desktop ✅ · light + dark ✅ (com a ressalva do
rótulo) · 3 idiomas ✅ · com bucket × sem bucket ✅.

## Roteiro manual — só depois da infra

1. Criar entidade com JPG de ~1 MB → o progresso anda, a miniatura aparece, o botão vira "Trocar imagem".
2. Salvar → miniatura na listagem.
3. Copiar `photoUrl` do Network → é `storage.googleapis.com/...?X-Goog-Signature=...`, e o `photo` gravado
   é `uploads/<id>/<uuid>.jpg`.
4. Abrir a URL em aba anônima → carrega.
5. Alterar 1 caractere da assinatura → **403 do Google**.
6. Abrir sem a query string → **403**.
7. Esperar 15 min e reabrir → **403**.
8. Trocar a imagem e conferir no console → só o objeto novo existe.
9. Como admin personificando: vê a imagem; tentar trocar ⇒ **403
   `AUTH_REQUEST_IMPERSONATION_READ_ONLY`**.
10. Repetir em light/dark/390 px nos 3 idiomas.

## Higiene — dados de QA criados nesta etapa

Contas **`qa-test-upload@example.com`** e **`qa-test-upload-b@example.com`** (senhas descartáveis, locais,
**não registradas em arquivo nenhum**); entidades **`Legacy QA URL Entity`**, **`QA Listed Host Entity`** e
**`QA Owner B Entity`**. Nenhum objeto no bucket — não há bucket.

Somadas às de `/develop` e `/review`, são **4 contas de QA** criadas neste pipeline. A pendência já aberta
no backlog sobre contas acumuladas piorou nesta rodada.

## Para decisão

1. **O defeito do 500 sem `error.code`** — devolvido ao `/review` para correção, com pedido de confirmar se
   persiste em build de produção.
2. **Contagem de referência de objetos** — aceitar como limitação conhecida ou abrir item.
3. **Ativar o Cloud Storage** para destravar os 6 critérios. Até lá a feature está entregue em modo
   degradado, que é um estado válido e testado.
4. **`ARCJET_KEY` em dev** para tornar o rate limit verificável.
