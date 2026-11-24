# Relatório do `/test`: fatia 3 da revisão de segurança (arestas)

Rodou dentro do `/cycle`, sem perguntas, em `feat/delivery-security-hardening` (branch de feature, não protegida).
Nada foi commitado. Fontes: [`analyze/plan.md`](../analyze/plan.md), [`develop/handoff.md`](../develop/handoff.md),
[`review/review.md`](../review/review.md). A fatia 2, no mesmo working tree, não foi retestada: a fatia 3 não toca
nenhum arquivo de código dela, e o E2E abaixo cobre o login e o cadastro que ela mudou.

Placar: 12 critérios, 10 ✅, 0 ❌, 2 com parte 🔒 (envio real pelo Resend; toast da caixa de URL sem Storage).

## Cobertura: testes

| comando | resultado |
|---------|-----------|
| `JAVA_HOME=…openjdk@21 pnpm test` (raiz: `turbo test test:emulator`, sem `--force`), antes dos testes novos | `Tasks: 15 successful, 15 total`, 11 do cache, exit 0 |
| ↳ `api:test` | 1811 testes, 129 arquivos, pass (handoff 1810 + 1 do `/review` em `uploadedImageValidation`: confirmado) |
| ↳ `api:test:emulator` | 274 testes, 8 arquivos, pass |
| ↳ `web:test` | 313 testes, 34 arquivos, pass (confirma o handoff) |
| ↳ `@repo/email:test` | 209 testes, 8 arquivos, pass (confirma o handoff) |
| ↳ `@repo/auth:test` | 201 testes, 15 arquivos, pass |
| ↳ `@repo/internationalization:test` (paridade pt-br/en/es + `apiErrors`) | 67 testes, pass |
| ↳ demais | `app` 1277, `design-system` 172, `security` 65, `shared` 63, `analytics` 41, `next-config` 38, `e2e` (vitest) 38, `payments` 19, `sdk` 15, todos pass |
| `npx vitest run __tests__/imageMetadata.test.ts __tests__/entityPhotoReference.test.ts` (em `apps/api`), depois dos testes novos | 95 passaram (30 + 65) |
| `pnpm --filter api test`, depois dos testes novos | 1822 testes, 129 arquivos, pass |
| `JAVA_HOME=…openjdk@21 pnpm test` (raiz), final | `Tasks: 15 successful, 15 total`, 13 do cache; `api` 1822, `api:test:emulator` 274 |
| `pnpm turbo run typecheck --filter=api --filter=web --filter=@repo/auth --filter=@repo/email` | 4/4, do cache |
| `pnpm check` | `Checked 1120 files`, sem erro |
| `git grep -n "auth/components" -- apps packages ':!*.md'` | vazio |
| `pnpm --filter {api,app,web} exec next build` (ambiente do emulador) | os três com exit 0; o build da `api` prova que o `server-only` em `@repo/email` não quebra |
| `npx playwright test signUp accountSettings entityCrud --project=chromium --project=mobile` (em `apps/e2e`) | `11 passed (1.4m)`: 4 de setup, 5 no `chromium`, 2 no `mobile` |

### Testes criados

| arquivo | casos novos | o que fecham |
|---------|-------------|--------------|
| `apps/api/__tests__/entityPhotoReference.test.ts` | "switches a record with a legacy external url to a Google profile photo"; "refuses to update a record to %s" para as 7 URLs de `REFUSED_EXTERNAL_URLS` | a lacuna "edição com foto `lh3` nova coberta só pela função": agora a rota `PUT` também prova o aceite do `lh3` e a recusa de cada forma que tenta driblar o host |
| `apps/api/__tests__/imageMetadata.test.ts` | "ignores an orientation stored with a type other than SHORT, keeping the image"; "keeps a separate alpha chunk next to lossy image data"; "keeps every frame of an animated file and drops its EXIF" | as lacunas "orientação com tipo diferente de `SHORT`", "WebP com `ALPH` separado de `VP8 `" e "WebP animado" |

São 11 casos, todos na faixa barata (função pura e rota com `vi.mock`). Nenhum comentário cita o fluxo.

## Decisões de custo de teste

- **Faixa cara: nenhum teste versionado novo.** O upload real contra o emulador de Storage foi medido uma vez, à mão
  (seção de evidências). O objeto da fatia é a transformação dos bytes, que a função pura prova; a gravação no
  bucket já tem teste de emulador (`storageUpload.emulator.test.ts`), e o PNG 1x1 dele continua passando. O que o
  unitário não provava (a imagem abrir no navegador e a orientação aplicada) não vira teste de Vitest de qualquer
  forma.
- `file.schema.ts` e `read-capped-body.ts`: `uploadedImageValidation.test.ts` (21) e `parseRequestJson.test.ts` já
  cobrem stream sem `content-length`, `connection: close` e falha no meio da leitura. Nada acrescentado.
- `account/route.ts`: `accountRoute.test.ts` e `accountAvatar.test.ts` já cobrem avatar externo novo, `lh3` e o
  reenvio do valor guardado. Nada acrescentado.
- `sign-up-form-client.tsx`: `signUpFormSubmitLock.test.tsx` (9) cobre cada `isPending`. A interação real foi medida
  no navegador.
- `@repo/email` e `@repo/auth`: `serverOnly.test.ts` e o grep bastam.

## Critérios de aceite, item a item

| # | critério | status | meio |
|---|----------|--------|------|
| 1 | Avatar externo novo fora da allowlist é recusado | ✅ | unit (`accountAvatar`, `accountRoute`) + `curl` contra `next start` |
| 2 | Avatar já gravado continua salvável | ✅ | unit (inclui "não chama `deleteObjectQuietly`") + `curl` + navegador |
| 3 | Foto de entidade fora da allowlist é recusada | ✅ | unit (com os casos novos) + `curl` |
| 4 | Leitura de URL externa antiga não muda | ✅ | unit + `curl` (`GET`) + navegador |
| 5 | Upload sem `content-length` acima do teto é recusado durante a leitura | ✅ | unit (o handler para de ler no teto) + `curl` e cliente Node contra `next start` |
| 6 | JPEG gravado sem metadados e com orientação preservada | ✅ | unit + upload real no emulador + navegador (Adobe só por unit) |
| 7 | PNG e WebP gravados sem metadados | ✅ | unit (com os casos novos) + upload real + navegador (`zTXt`, `iTXt` e `XMP ` do WebP só por unit) |
| 8 | Imagem com estrutura quebrada é recusada | ✅ | unit + `curl` (5 casos) + paridade de i18n |
| 9 | Cadastro da landing trava os dois botões | ✅ | unit (T6) + `agent-browser` em `next start` (o caso "login pendente" só por unit) |
| 10 | Componente legado removido | ✅ | grep + typecheck |
| 11 | `@repo/email` só no servidor | ✅ / 🔒 | unit + build da `api`; envio real com Resend 🔒 (sem chave) |
| 12 | Sem Storage, nada muda além da caixa de URL | ✅ / 🔒 | unit (`fileUploadRoute`, `storageEmulatorIsolation`) + E2E rodando sem Storage; toast da caixa de URL 🔒 (não percorrido) |

## Verificar no `/test` (lista do `review.md`)

1. **Upload real com o emulador de Storage: confirmado.** Detalhe nas evidências. Os três objetos baixados do
   emulador saem sem nenhuma das strings fictícias; o JPEG tem um único `APP1` de 36 bytes com `Orientation=6`; o
   painel mostra a foto em retrato e `naturalWidth > 0` nos três formatos.
2. **`chunked` de 6 MiB contra `next start`: confirmado.** `413 {"error":{"code":"UPLOAD_FILE_TOO_LARGE"}}` com
   `connection: close`, nos dois modos (`chunked` e `content-length`). Ressalva medida: o servidor do Next recebe o
   corpo inteiro antes de o handler responder. Com um cliente Node mandando 64 KiB a cada 15 ms, a resposta chegou
   só depois de 6.291.565 bytes enviados; com 12 MiB, depois de 12.583.021 bytes, e o log mostrou "Request body
   exceeded 10MB for /files". É o comportamento que o `docs/SECURITY.md` já descreve (o `proxy.ts` faz o Next guardar
   até 10 MiB). O teto limita o que o handler acumula e parseia, como o plano previa; o unitário prova que o stream
   para de ser lido no teto.
3. **Cliente que corta o envio no meio: confirmado em parte.** `curl --limit-rate 300k --max-time 1` com 3 MiB,
   nos dois modos: a API segue de pé (`/health/ready` 200) e o log mostra uma linha
   `Error: aborted … code: 'ECONNRESET'`. Essa linha não vem do handler: ela aparece igual num `PUT /account` sem
   credencial, que o guard recusa antes de ler o corpo. É o Next lendo o corpo para o `proxy.ts`. Com meio-fechamento
   (o cliente manda 1 MiB de 3 MiB declarados e fecha a escrita, mantendo a leitura), a resposta é
   `HTTP/1.1 400 Bad Request\r\nConnection: close` sem corpo, a resposta padrão do servidor HTTP do Node, e não
   `UPLOAD_FILE_MISSING`. 🔒 A resposta 400 com código não é observável em `next start`, porque o corpo cortado não
   chega ao handler; ela fica provada só pelo unitário do `/review`.
4. **Allowlist: confirmado.** `PUT /account`: as 7 formas recusadas responderam 400 `ACCOUNT_AVATAR_INVALID`,
   `https://lh3.googleusercontent.com/a/qa-slice-3` respondeu 200 e gravou. `POST /entities` com
   `https://cdn.example.com/a.png` e com `http://lh3…` → 400 `ENTITY_PHOTO_INVALID`, sem registro criado (conferido
   na lista); com `lh3` e com objeto da organização → 201. No navegador, a conta com avatar
   `https://cdn.example.com/qa-legacy-avatar.png` gravado direto no Firestore salvou o telefone com o toast
   "Perfil atualizado."; o avatar ficou igual.
5. **Cadastro da landing: confirmado.** Com o popup do IdP do emulador aberto, os dois botões ficaram com
   `disabled=true` e opacidade 0,5; com o envio por e-mail atrasado de propósito, idem. Detalhe nas evidências.
6. **E2E filtrado: confirmado.** 11/11.
7. **Contagens: confirmado.** `api` 1811, `web` 313, `@repo/email` 209 antes dos testes novos; `api` 1822 depois.
8. 🔒 **Teto em `chunked` numa função da Vercel.** Sem ambiente Vercel.

## Medição de memória com JPEG hostil

O `review.md` mediu +242 MB de heap com "2 milhões de marcadores `RST` soltos". Reproduzi com um JPEG de 4 MiB:
`FFD8`, 2.097.150 marcadores `FFD0`…`FFD7` entre segmentos (fora de qualquer `SOS`) e `FFD9`. Fora do servidor, a
chamada direta a `stripImageMetadata` levou 819 ms e +270 MB de heap. O mesmo arquivo com os marcadores dentro do
`SOS` custa 10 ms e nada de heap, então o custo é dos marcadores avulsos, um `Buffer` por marcador.

Pelo endpoint real (`POST /files`, `next start` da `api`, processo `next-server`, RSS amostrado a cada 10 ms):

| entrada | status | tempo | RSS antes → pico |
|---------|--------|-------|------------------|
| JPEG de 4 MiB sem marcadores (controle), 3 envios seguidos | 201 | 0,11 a 0,23 s | 112 → 172 → 189 → 193 MB (+60, +16, +3) |
| JPEG hostil, 1º envio | 201 | 0,53 s | 193 → 494 MB (+301) |
| JPEG hostil, 2º envio | 201 | 0,57 s | 491 → 695 MB |
| JPEG hostil, 3º envio | 201 | 0,48 s | 619 → 742 MB |
| JPEG hostil, 4 envios em paralelo | 201 nos 4 | 1,66 a 1,75 s | 68 → 793 MB |

Depois de 30 segundos parado, o RSS voltou a 130 MB. A API respondeu `/health/ready` 200 o tempo todo. O arquivo
hostil é aceito e gravado: vira um objeto de 4 MiB no bucket.

Ordem de grandeza: cada requisição hostil custa uns 300 MB de pico e meio segundo de CPU; numa função da Vercel com
1 GB, três ou quatro em paralelo na mesma instância chegam perto do limite. A rota exige login e está na lista
estrita do limite de requisições (desligado no ambiente de QA, sem `ARCJET_KEY`). Correção possível, como hipótese:
guardar intervalos `[início, fim)` contíguos e fazer um único `Buffer.concat` no fim, ou recusar com 415 um JPEG com
mais de N marcadores avulsos (arquivo real não tem nenhum entre segmentos).

## Evidências e2e

Tudo em `next start`, contra os emuladores. Os prints em `test/e2e/` (14 arquivos) são descartados pelo
`.gitignore`; o texto abaixo é a prova.

**Cadastro da landing (`web`, 3001).** Estado lido no DOM (`disabled` e opacidade calculada de cada botão):

| passada | sem nada pendente | popup do Google aberto | envio por e-mail pendente | depois do erro |
|---------|-------------------|------------------------|---------------------------|----------------|
| pt-br, light, 1280 px | habilitados, opacidade 1 | `disabled` nos dois, 0,5 | `disabled` nos dois, 0,5 | habilitados; toast "Este e-mail já está em uso. (Código do erro: …)" |
| en, dark, 390 px | habilitados ("Sign Up", "Continue with Google") | `disabled` nos dois, 0,5 | `disabled` nos dois | habilitados; toast "This email is already in use. (Error code: …)" |
| es, dark, 1280 px | habilitados ("Registrarse", "Continuar con Google") | `disabled` nos dois, 0,5 | `disabled` nos dois | habilitados; toast "Este correo ya está en uso. (Código del error: …)" |
| pt-br, light, 390 px | habilitados | `disabled` nos dois, 0,5 | não medido | não medido |

- O atraso do envio veio de um `--init-script` que segura o `XMLHttpRequest` para `/auth/sign-up` por 2,5 a 4 s (o
  `network route` do `agent-browser` 0.27.0 não intercepta).
- Duplo clique em "Cadastrar" com o envio atrasado: um único `XMLHttpRequest` a `/auth/sign-up` nas três passadas.
- Fechar o popup: os botões voltaram a habilitar entre 6 e 11 segundos depois, sem toast. É o tempo que o SDK do
  Firebase leva para perceber o popup fechado.
- No dark, o botão desabilitado continua legível: "Sign Up" claro com texto escuro a 50% sobre fundo quase preto, e o
  do Google com contorno visível.

**Upload real (`api` 3002 com o emulador de Storage).** Imagens fictícias geradas em `/tmp` (pixels: metade esquerda
vermelha, metade direita azul, faixa verde no topo, 400x200), com `sips`, `cwebp` e `webpmux`. EXIF injetado por
script: `Make=QAFAKECAMERA`, `Orientation=6`, IFD de GPS com `GPSMapDatum` fictício, `COM`, bytes depois do `EOI`; o
`sips` ainda acrescenta um `APP13`. Objetos baixados pela URL do emulador:

- JPEG: segmentos de saída `e0:16 e1:34 c0 c4 c4 c4 c4 db db dd da`, termina em `FFD9`. O `APP1` tem 36 bytes,
  `ffe10022 457869660000 4d4d002a00000008 0001 0112 0003 00000001 0006 0000 00000000`. Nenhuma das strings
  fictícias (GPS, câmera, comentário, trailer) e nenhum `Photoshop`/`APP13`. Com um perfil ICC real do macOS
  (`sRGB Profile.icc`, 3.144 bytes) num `APP2`, o `APP2` de 3.160 bytes ficou, antes do `APP1`. `size` da resposta
  (6.901) igual ao tamanho do objeto gravado (6.901; o original tinha 7.110).
- PNG: entrada `IHDR,tEXt,eXIf,tIME,IDAT,IEND`; saída `IHDR,IDAT,IEND`, byte a byte igual ao PNG base sem os três
  blocos.
- WebP: entrada `VP8X(flags=0x8),VP8 ,EXIF`; saída `VP8X(flags=0x0),VP8 `, tamanho do RIFF 396 igual ao comprimento
  menos 8; `webpmux -info` sem metadado; `dwebp` decodifica em 400x200.
- Limite: arquivo de exatamente 4.194.304 bytes → 201 com `content-length` e com `chunked`; 4.194.305 bytes → 413
  nos dois.
- Estrutura quebrada → 415 `UPLOAD_FILE_TYPE_NOT_ALLOWED`: JPEG sem `EOI`, JPEG com tamanho de segmento `0xFFF0`,
  JPEG com tamanho 0, PNG sem `IEND`, WebP com bloco de tamanho `0x7FFFFFFF`, e `GIF89a` enviado como `.png`.

**Painel (`app` 3000).** Conta de QA logada, onboarding concluído.

- Avatar: JPEG enviado pelo `input` de arquivo, perfil salvo e página recarregada. Os dois `<img>` do avatar (menu do
  perfil e prévia) com `naturalWidth` 200 e `naturalHeight` 400, `image-orientation: from-image`. No print, vermelho
  em cima, azul embaixo e a faixa verde à direita: rotação de 90° no sentido horário, o que `Orientation=6` pede.
- Lista de entidades: foto WebP 400x200, PNG 400x200 e JPEG 200x400, todas com `complete=true`.

**Allowlist e leitura antiga (`curl` com bearer do emulador).** Valores no corpo de cada resposta:

- `GET /account` com avatar antigo gravado: `avatar` e `avatarUrl` iguais a `https://cdn.example.com/qa-legacy-avatar.png`.
- `PUT /account` reenviando esse valor com nome novo: 200, nome gravado; trocando por `https://cdn.example.com/other.png`: 400.
- `GET /entities/:id` com foto antiga gravada: `photo` e `photoUrl` iguais ao valor guardado; `PUT` reenviando com nome
  novo: 200; trocando por `https://cdn.example.com/other.png`: 400; trocando por `https://lh3.googleusercontent.com/a/qa-new`:
  200 (o `GET` seguinte mostra a foto nova); `https://lh4…`: 400.

## Ambiente do e2e

Todas as portas estavam livres no início (3000 a 3003, 4000, 4001, 4400, 4500, 8080, 9099, 9150, 9199). Nada foi
reutilizado do usuário.

| o quê | como | teardown |
|-------|------|----------|
| Emuladores (auth, firestore, storage) | `pnpm emulators` em background, PID guardado | `SIGINT` no processo do `firebase-tools`, que derrubou o Java |
| E2E | `npx playwright test …`: sobe `api`/`app`/`web` em `next dev` e reaproveita os emuladores | o próprio Playwright derrubou os três |
| Builds de produção | `next build` das três apps com o ambiente de `buildStackEnv` (`apps/e2e/support/stackEnv.ts`), mais o host do emulador de Storage, `NEXT_PUBLIC_API_URL` na `web` e uma service account de mentira (chave gerada na hora) para passar no `env.ts` da `api` | sem processo; ficaram os `.next/` de produção das três apps (gitignored), com o emulador embutido |
| `api` (3002), `app` (3000), `web` (3001) em `next start` | background, PIDs guardados | `kill` por PID |
| `agent-browser` | uma sessão, comandos em sequência | `close --all` |

Ao final, `lsof -ti tcp:<porta> -sTCP:LISTEN` saiu vazio em todas as portas acima. Os três `apps/*/AGENTS.md` que o
`next dev` gerou (não rastreados) foram apagados. O harness (`/tmp/qa-s3/`: imagens, scripts, chave de mentira,
senha gerada) foi apagado no fim.

## Lacunas herdadas

| lacuna (handoff/review) | veredito |
|-------------------------|----------|
| WebP animado e WebP com `ALPH` separado sem fixture | **fechada aqui** (2 testes novos em `imageMetadata.test.ts`) |
| Orientação gravada com tipo diferente de `SHORT` sem teste | **fechada aqui** (1 teste novo) |
| Edição de entidade com foto `lh3` nova coberta só pela função | **fechada aqui** (8 testes de rota novos + `curl`) |
| Falha do stream no meio da leitura do upload | fechada no `/review` (unitário); em `next start` o handler não chega a ver o corpo cortado (item 3 acima) |
| V1 a V4 e V6 não medidos | **fechadas aqui** |
| Teto em `chunked` na Vercel | continua aberta (🔒) |
| Envio real de e-mail com `server-only` | continua aberta (🔒, sem chave do Resend) |

## Observações (nenhuma é defeito desta fatia)

- **Prévia do avatar presa no ícone de fallback.** `packages/design-system/components/ui/responsive-image.tsx` guarda
  `hasError` em estado e não o zera quando o `src` muda. Repro: conta com avatar externo que a CSP bloqueia
  (`https://cdn.example.com/...`) → a prévia cai no ícone → enviar uma imagem nova pelo `input`: o upload responde 201
  (três vezes no log de rede), mas a prévia continua no ícone até salvar e recarregar. Comportamento anterior a esta
  fatia, que só fica mais visível agora que avatar externo antigo é o caso tratado. Correção sugerida (hipótese):
  `key={src}` no `ResponsiveImage` ou zerar `hasError` num efeito sobre `src`.
- **Host em maiúsculas.** `https://LH3.googleusercontent.com/...` é aceito e gravado como veio. A CSP compara host
  sem diferenciar maiúsculas, então a imagem aparece; só não há normalização.
- **Avatar do menu do perfil distorcido com foto em retrato.** O `<img>` de 36x36 tem `object-fit: fill`, então uma
  foto 200x400 aparece achatada no menu (a prévia da conta usa `cover`). Anterior a esta fatia.
- **Log do `next dev` no E2E.** "The destination stream errored while writing data" em `/pt-br/onboarding` e
  `/pt-br/admin`, já registrado na fatia 1.

## Estado de dev alterado

Nada fora dos emuladores. A conta `qa-security-slice-3@example.com`, o perfil, a organização, as cinco entidades
`QA s3 …` e os objetos enviados existiram só nos emuladores, que sobem sem persistência e já foram derrubados; o setup
do E2E também reinicia o emulador a partir do seed. Nenhuma conta foi criada em projeto Firebase real, então nada
entra no `docs/PRE-PRODUCTION.md`. `.claude/dev-credentials.local.md` não existe neste workspace e não foi necessário;
a senha da conta de QA foi gerada na hora, ficou só em `/tmp` e foi apagada.

Os `.next/` de `apps/api`, `apps/app` e `apps/web` ficaram com build de produção apontando para o emulador. Um
`next start` sem rebuild sobe "emulado"; rode `pnpm build` antes de usar `next start` com outro ambiente.

## Rodada 2: removedor de metadados com intervalos

O `/review` trocou o `Buffer` por bloco de `apps/api/(shared)/lib/image-metadata.ts` por intervalos copiados uma vez
só (seção "Rodada 2" do `review.md`) e acrescentou 3 testes em `imageMetadata.test.ts`. Remedi só o que essa
mudança afeta: a suíte da `api`, o custo de memória pelo endpoint e o upload real dos três formatos. Navegador e o
resto do roteiro não foram refeitos, porque nenhum outro arquivo mudou.

### Testes

| comando | resultado |
|---------|-----------|
| `pnpm --filter api test` (sem `--force`) | 1825 testes, 129 arquivos, pass (1822 da rodada 1 + 3 do `/review`); `imageMetadata.test.ts` com 33 |

### Memória pelo endpoint real

Mesmo roteiro da rodada 1: `next build` da `api` com o ambiente do emulador, `next start -p 3002`, RSS do processo
`next-server` amostrado a cada 10 ms, `POST /files` com bearer do emulador. Mesmos arquivos: JPEG de controle de
4 MiB sem marcadores e JPEG hostil de 4 MiB com 2.097.150 marcadores `RST` soltos entre segmentos. Processo novo,
então a ordem conta: três controles, dois hostis, quatro hostis em paralelo, quatro controles em paralelo.

| entrada | status | tempo | RSS antes → pico | rodada 1 |
|---------|--------|-------|------------------|----------|
| controle, 3 envios seguidos | 201 | 0,12 a 0,22 s | 134 → 175 → 184 → 192 MB (+40, +8, +9) | +60, +16, +3 |
| hostil, 1º envio | 201 | 0,17 s | 191 → 203 MB (+11) | +301 MB, 0,53 s |
| hostil, 2º envio | 201 | 0,17 s | 203 → 205 MB (+2) | 491 → 695 MB |
| hostil, 4 em paralelo | 201 nos 4 | 0,22 a 0,42 s | 205 → 230 MB (+24) | 68 → 793 MB, ~1,7 s cada |
| controle, 4 em paralelo | 201 nos 4 | 0,25 a 0,36 s | 230 → 263 MB (+32) | não medido |

O pico com a entrada hostil agora fica na mesma faixa do controle, e o tempo caiu de meio segundo para 0,17 s. O
arquivo hostil continua aceito e gravado do mesmo tamanho (`size` 4.194.304), como antes da correção. `/health/ready`
respondeu 200 no fim, e o log da API não registrou nenhum erro.

### Upload real dos três formatos

Imagens fictícias regeradas do mesmo jeito (400x200, EXIF com `Make=QAFAKECAMERA`, `Orientation=6` e GPS
fictício, `COM`, bytes depois do `EOI`, `APP13` do `sips` e um perfil ICC real do macOS no JPEG; `tEXt`, `eXIf` e
`tIME` no PNG; EXIF por `webpmux` no WebP). Enviadas com `scope=organization` e baixadas pela URL do emulador:

- JPEG: 201, `size` 6.901 (original 7.110). Segmentos de saída `e0:16 e2:3160 e1:34 c0 c4 c4 c4 c4 db db dd da`,
  termina em `FFD9`. `APP1` de 36 bytes, byte a byte igual ao da rodada 1
  (`ffe10022 457869660000 4d4d002a00000008 0001 0112 0003 00000001 0006 0000 00000000`). Perfil ICC mantido;
  nenhuma das strings fictícias (GPS, câmera, comentário, trailer) e nenhum `Photoshop`.
- PNG: 201, `size` 1.319. Blocos de saída `IHDR,IDAT,IEND`, byte a byte igual ao PNG base sem os três blocos.
- WebP: 201, `size` 404. Chunks de saída `VP8X(flags=0x0),VP8 `, tamanho do RIFF 396 igual ao comprimento menos 8,
  `webpmux -info` sem metadado, `dwebp` decodifica em 400x200.

Os três objetos saíram com os mesmos tamanhos e a mesma estrutura da rodada 1.

### Ambiente e dados

Portas livres no início. Subi os emuladores (`pnpm emulators`) e a `api` em `next start`, com os PIDs guardados.
No fim, matei a `api` por PID e mandei `SIGINT` ao `firebase-tools`; `lsof` saiu vazio em 3000 a 3003, 4000, 4001,
4400, 4500, 8080, 9099, 9150 e 9199. Nenhum `apps/*/AGENTS.md` apareceu. A conta
`qa-security-slice-3@example.com` foi recriada pela `POST /auth/sign-up` só no emulador, que não persiste; a senha
ficou em `/tmp` e foi apagada com o harness. O `.next/` da `api` ficou com o build novo, também apontando para o
emulador.

O placar não muda: 10 ✅, 0 ❌, 2 com parte 🔒. A observação de memória da rodada 1 está resolvida.
