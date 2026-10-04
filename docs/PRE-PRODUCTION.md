# Antes de entrar em produção

Passos que **não são código** e que nenhum teste, lint ou CI consegue cobrar. Cada um exige console de
provedor, DNS ou painel do GitHub — e todos já estão implementados do lado do repositório, esperando
configuração.

> **Por que este arquivo existe.** O repo sobe, os testes passam e a UI funciona com quase todos estes
> itens pendentes. É exatamente isso que os torna perigosos: a ausência não aparece em lugar nenhum até
> alguém ser prejudicado por ela em produção. Um fork que herda este boilerplate herda esta lista.

Marque o que fizer. O que estiver desmarcado aqui é o que falta para o deploy ser honesto.

---

## ⛔ Bloqueadores

Sem estes, ou o produto está **inseguro**, ou uma funcionalidade central **não existe** para o usuário.

### 1. Publicar as rules e os índices do Firestore

- [x] `firestore.rules` publicado no projeto de referência (`next-boilerplate-576d0`)
- [ ] `firestore.rules` publicado **no projeto do seu fork**

**Estado hoje: a base do projeto de referência está fechada.** O `deny-all` de
[`firestore.rules`](../firestore.rules) **está publicado e em vigor** — medido em **2026-09-11** (o `curl`
de [`SECURITY.md`](SECURITY.md#verificar-que-o-furo-está-fechado) devolveu **403**) e reconferido em
**2026-09-14** lendo as rules publicadas direto do projeto, que batem com o arquivo versionado. Reconferido pela terceira vez em **2026-09-23**, pelo `curl` desta seção: **403** em `entity`, `user` e `auditEvent`.

> ⚠️ **Versões anteriores deste documento afirmavam o contrário** ("nunca foi publicado", "a base está
> aberta") e tratavam isso como a pendência #1 de segurança. **Era falso.** Se você leu aquela versão, não
> republique nada por engano: a ordem errada de publicação/rollback é justamente o que **reexpõe** a base
> (ver o aviso no fim desta seção).

**Isto não isenta um fork.** Um fork roda em **outro projeto Firebase**, onde nada foi publicado ainda — lá
a base nasce aberta e o passo abaixo é obrigatório. O runbook continua aqui por isso: ele é o procedimento
para **ambiente novo**, não dívida em aberto do projeto de referência.

A `apps/api` acessa o Firestore pelo Admin SDK e **ignora** as rules, então publicar não quebra a API:

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest deploy --only firestore:rules --dry-run   # valida a sintaxe
npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes
```

Conferir depois de publicar — uma leitura direta com a chave pública deve devolver **403
`PERMISSION_DENIED`**; se devolver **200 com os dados**, as rules não pegaram. O roteiro está em
[`SECURITY.md`](SECURITY.md#publicar-rules-e-índices). Não salve o corpo da resposta: ele traz dados reais.

⛔ **Ordem e rollback.** Publique as rules **depois** de a API estar rodando no Admin SDK — o inverso deixa
a API sem acesso. E o rollback correto é **reverter o código da API primeiro**: republicar rules
permissivas sem reverter reexpõe a base inteira, o que não é rollback, é o incidente de novo.

> 📌 **Testado no emulador não é publicado.** `firestore.rules` e `storage.rules` têm teste contra os
> emuladores (`pnpm --filter api test:emulator`, dentro do `pnpm test` e do job `verify`): cliente anônimo e
> autenticado são recusados em leitura, listagem, escrita e remoção, e trocar a negação por
> `allow read, write: if true` quebra a suíte. Isso prova o arquivo, não o projeto: enquanto o `deploy`
> acima não rodar, o projeto real segue com as rules que tiver. `storage.rules` também continua sem
> publicação (§ abaixo).

#### 1.1 Índice composto da listagem paginada de `entity`

- [ ] índice de `entity` publicado no projeto de referência
- [ ] índice de `entity` publicado **no projeto do seu fork**

`GET /entities` consulta `userId` + `deletedAt` com ordenação por `createdAt`, e o Firestore recusa essa
combinação enquanto o índice composto não existir. A declaração está em
[`firestore.indexes.json`](../firestore.indexes.json); publicar é o mesmo comando de sempre:

```bash
npx -y firebase-tools@latest deploy --only firestore:indexes
```

**Enquanto não rodar, a listagem responde `503 PAGINATION_INDEX_MISSING`** e a tela mostra o estado de
erro traduzido. O painel continua navegável e a app sobe — a degradação é intencional, para o fork não
descobrir isso como um 500. Em coleção grande a construção do índice leva alguns minutos, e até terminar a
consulta continua recusada.

⚠️ **O emulador não cobra índice composto**: ele serve a consulta de qualquer jeito. Rodar contra
`pnpm emulators` prova ordenação e cursor, mas não prova que a entrada existe. O gate automatizado é
`apps/api/__tests__/firestoreIndexes.test.ts`, que lê o arquivo versionado — ele pega a entrada apagada,
não o índice não publicado.

#### 1.2 Índice composto do filtro por usuário da trilha de auditoria

- [ ] índice de `auditEvent` publicado no projeto de referência
- [ ] índice de `auditEvent` publicado **no projeto do seu fork**

A tela `/admin/audit` filtra por usuário com `involvedUserIds array-contains`, ordenando por `createdAt`
decrescente. Essa combinação exige índice composto; a declaração está em
[`firestore.indexes.json`](../firestore.indexes.json) e sobe no mesmo comando do item anterior.

**Sem o índice, só o filtro por usuário falha.** A tela abre, a listagem completa funciona e o filtro de
período também, porque os dois usam índice de campo único. Escolher um usuário responde
`503 PAGINATION_INDEX_MISSING`, exibido como "A listagem está indisponível no momento. Tente de novo em
instantes." nos três idiomas. Nenhuma resposta é 500.

Para conferir depois de publicar: `npx -y firebase-tools@latest firestore:indexes` lista a entrada de
`auditEvent`; na tela, escolher um usuário no filtro devolve a lista em vez do alerta. Vale o mesmo aviso
do índice de `entity` — o emulador serve a consulta indexada ou não, então nenhum gate local pega a falta.

#### 1.3 Retenção da coleção `auditEvent`

- [ ] prazo de retenção decidido e expurgo configurado

A trilha só cresce: nenhuma rota edita ou apaga evento, por desenho. Cada documento é pequeno e nada
quebra sem esta configuração, mas o armazenamento é herdado por todo fork.

Os documentos não têm campo `expiresAt`, então a TTL policy nativa do Firestore não se aplica: o expurgo é
manual ou por job do fork. Para contar o que já existe, use a contagem de documentos de `auditEvent` no
console do Firestore.

⚠️ **Não existe prazo legal para trilha de auditoria de negócio no Brasil.** O Decreto 8.771/2016, art. 13
§2º aponta no sentido oposto: reter a menor quantidade possível de dado pessoal e excluir assim que a
finalidade for atingida. O prazo é decisão de cada fork, com finalidade declarada — "a lei exige 6 meses"
é generalização falsa e vem da confusão com o registro de acesso a aplicações (§11), que é outra coisa.

#### 1.4 Backfill de instantes em base que já tem dado

- [ ] backfill rodado, ou confirmado como desnecessário

Só para quem já tem documentos gravados antes desta entrega. Até aqui, o primeiro `PUT` num registro
reescrevia `createdAt` como string ISO em vez de `Timestamp`; o Firestore ordena por tipo antes de por
valor, então uma coleção com os dois tipos não volta em ordem cronológica. A causa foi corrigida em
`BaseRepository.update`, mas o que já está gravado continua como está.

```bash
pnpm --filter api backfill-instants --collection=entity           # dry-run
pnpm --filter api backfill-instants --collection=entity --apply
```

O script converte `createdAt`/`updatedAt`/`deletedAt` de string para `Timestamp` e estampa
`deletedAt: null` onde o campo está ausente — sem isso o documento some da listagem, porque o Firestore
não casa campo ausente contra `null`. Rodar duas vezes não muda nada. O projeto de referência roda no
emulador, cujo estado morre a cada reinício: lá é dispensável.

Ele lê o alvo como os outros scripts de bootstrap: com os hosts do emulador preenchidos, vai no emulador
sem credencial; com eles vazios, exige o service account de `apps/api/.env` e anuncia no cabeçalho que o
projeto é real. Confira essa linha antes de repetir o comando com `--apply`.

#### 1.5 Índices compostos dos resumos da home

- [ ] os três índices publicados no projeto de referência
- [ ] os três índices publicados **no projeto do seu fork**

As duas homes do painel contam registros no servidor em vez de trazer a lista inteira para o navegador.
Cada contagem é uma agregação com filtro de igualdade em mais de um campo, e o Firestore cobra índice
composto por isso — agregação não escapa da regra. São três entradas novas em
[`firestore.indexes.json`](../firestore.indexes.json), publicadas pelo mesmo comando das anteriores:

| coleção | campos | serve |
|---------|--------|-------|
| `entity` | `userId` + `deletedAt` + `enabled` | cartão "ativas" da home comum |
| `entity` | `userId` + `deletedAt` + `type` | as três barras do gráfico por tipo |
| `user` | `deletedAt` + `type` | cartão de administradores da home admin |

```bash
npx -y firebase-tools@latest deploy --only firestore:indexes
```

**Sem eles, `GET /entities/summary` e `GET /users/summary` respondem `503 SUMMARY_INDEX_MISSING`** e os
widgets mostram o erro traduzido nos três idiomas. A saudação continua na tela, o painel continua
navegável e nenhuma resposta é 500 — a degradação é intencional. Enquanto o índice está sendo construído,
a recusa persiste.

Para conferir depois de publicar: `npx -y firebase-tools@latest firestore:indexes` lista as três entradas;
na tela, os cartões mostram números em vez do alerta. Vale o mesmo aviso dos índices anteriores — **o
emulador serve a consulta com ou sem índice**, então `pnpm emulators` não prova que a entrada existe.
`apps/api/__tests__/firestoreIndexes.test.ts` cobre o arquivo versionado, o que pega a entrada apagada e
não o índice não publicado.

#### 1.6 Índice composto da busca de perfil por `reference_id`

- [ ] índice de `user` publicado no projeto de referência
- [ ] índice de `user` publicado **no projeto do seu fork**

`userRepository.findByReferenceId(uid)` casa `reference_id` e `deletedAt` na mesma consulta, e é ela que
todo guard roda para transformar o UID do Firebase Auth no documento de perfil. A entrada está declarada em
[`firestore.indexes.json`](../firestore.indexes.json) e é coberta por
`apps/api/__tests__/firestoreIndexes.test.ts`.

| coleção | campos | serve |
|---------|--------|-------|
| `user` | `reference_id` + `deletedAt` | resolução do perfil a partir do UID, em todo request autenticado |

Este item **faltava nesta lista até 2026-09-17**: o arquivo versionado declarava seis entradas e o checklist
descrevia cinco. Quem seguisse só o documento publicaria cinco e descobriria a sexta pelo comportamento — e,
diferente das outras, esta não tem degradação traduzida, porque ninguém a previu como podendo faltar.

#### 1.7 Índice composto das faixas de recência de acesso

- [ ] índice de `user` publicado no projeto de referência
- [ ] índice de `user` publicado **no projeto do seu fork**

O bloco de atividade da home do admin distribui os perfis em faixas de último acesso. Cada faixa é uma
agregação que combina igualdade em `deletedAt` com um intervalo em `lastAccessAt`, e o Firestore cobra
índice composto por isso. A entrada está declarada em
[`firestore.indexes.json`](../firestore.indexes.json) e é coberta por
`apps/api/__tests__/firestoreIndexes.test.ts`.

| coleção | campos | serve |
|---------|--------|-------|
| `user` | `deletedAt` + `lastAccessAt` | as quatro contagens por faixa de `GET /users/activity-summary` |

```bash
npx -y firebase-tools@latest deploy --only firestore:indexes
```

**Sem ele, `GET /users/activity-summary` responde `503 SUMMARY_INDEX_MISSING`.** O bloco de atividade
mostra a mensagem traduzida nos três idiomas; os três cartões de contagem, a saudação e a navegação
continuam funcionando, porque o agregado de atividade é uma rota separada da de `GET /users/summary`.
Nenhuma resposta é 500. Enquanto o índice está sendo construído, a recusa persiste.

Para conferir depois de publicar: `npx -y firebase-tools@latest firestore:indexes` lista a entrada de
`user` com `lastAccessAt`; na tela, os dois cartões e o gráfico mostram números em vez do alerta. Vale o
mesmo aviso das outras entradas — **o emulador serve a consulta com ou sem índice**, então `pnpm emulators`
não prova que ela existe.

#### 1.8 Quais das sete entradas já estão publicadas

Medido em **2026-09-23** neste workspace, com `npx -y firebase-tools@latest firestore:indexes --project
next-boilerplate-576d0`, contra as **7** entradas declaradas em
[`firestore.indexes.json`](../firestore.indexes.json).

| coleção | campos | publicado no projeto de referência |
|---------|--------|-----------------------------------|
| `user` | `reference_id` + `deletedAt` | **sim** |
| `entity` | `userId` + `deletedAt` + `createdAt` | não |
| `entity` | `userId` + `deletedAt` + `enabled` | não |
| `entity` | `userId` + `deletedAt` + `type` | não |
| `user` | `deletedAt` + `type` | não |
| `user` | `deletedAt` + `lastAccessAt` | não |
| `auditEvent` | `involvedUserIds` + `createdAt` | não |

**Uma de sete.** As subseções acima marcam cada índice como pendente uma a uma, o que estava certo em
substância e escondia que a de `reference_id` já tinha subido — provavelmente junto com a publicação das
rules. Publicar as seis restantes é o mesmo comando único, e ele é idempotente para a que já existe.

⛔ **Não leia esta tabela como estado do seu fork.** Ela descreve o projeto de referência
(`next-boilerplate-576d0`). Um fork roda em outro projeto Firebase, onde **nenhuma** das sete existe.

Uma consulta que esta entrega acrescentou **não** entrou nessa fila, de propósito: o expurgo da trilha
ordena por `FieldPath.documentId()` sobre um `array-contains`, e todo índice de campo único termina em
`__name__`. Sondada em leitura contra o projeto real em 2026-09-23, com e sem cursor: nenhuma
`FAILED_PRECONDITION`.

### 2. Service account do Firebase Admin

- [ ] `FIREBASE_ADMIN_PROJECT_ID` · `FIREBASE_ADMIN_CLIENT_EMAIL` · `FIREBASE_ADMIN_PRIVATE_KEY`

Firebase Console → Project settings → Service accounts → gerar chave privada. Mantenha os `\n` escapados
na private key (o código faz `replace(/\\n/g, "\n")`).

⚠️ **É requisito de _build_, não só de runtime.** `apps/api/env.ts` valida as três de forma eager, então
`pnpm --filter api build` **falha** sem elas — a pipeline de deploy quebra antes de subir, não no boot. É
também por isso que `turbo build` não está no CI.

⚠️ **A service account é tudo ou nada.** `packages/auth/keys.ts` aceita o conjunto inteiramente ausente,
mas rejeita um conjunto **parcial**. Caso de borda: `FIREBASE_ADMIN_PROJECT_ID` cai para
`NEXT_PUBLIC_FIREBASE_PROJECT_ID`, então ter só a parte pública configurada já torna o conjunto "não
vazio" e passa a exigir as outras duas. Detalhes em [`SETUP.md`](SETUP.md).

### 3. Domínio de e-mail verificado (SPF + DKIM)

- [ ] `RESEND_TOKEN` · `RESEND_FROM` com domínio verificado no provedor

**Sem isto, quem esquece a senha perde a conta.** A recuperação de senha, a verificação de e-mail e a troca
de e-mail do titular dependem de entrega real; sem credencial, o pedido de redefinição e o pedido de troca
de e-mail respondem `EMAIL_NOT_CONFIGURED` (503) em vez de fingir que enviaram. O erro é honesto, mas a
funcionalidade não existe.

⛔ **Nunca foi provado de ponta a ponta.** Toda a validação da base de e-mail e da recuperação de senha foi
feita com preview local e placeholder — **nenhuma mensagem saiu de verdade**, porque isso exige o passo de
DNS, que não tem contorno. Depois de configurar, rode o ciclo real uma vez: pedir redefinição → receber →
definir a senha nova → entrar.

Rode também o ciclo da troca de e-mail: na aba Perfil, pedir a troca → receber o aviso no endereço antigo
e o link no novo → abrir o link → entrar com o endereço novo e ver a sessão antiga cair. Com
`NEXT_PUBLIC_APP_SUPPORT_EMAIL` vazia (§13), o aviso sai sem a linha de suporte, que é o canal para
contestar a troca. O comportamento do Firebase de produção nesse fluxo nunca foi medido: o desenho se apoia
no emulador para três pontos (conferir o código sem gastá-lo, o link pendente deixar de valer depois que
outro é aplicado, e o gerador recusar endereço em uso).

### 4. As chaves que os links de ação carregam

- [ ] `FIREBASE_WEB_API_KEY` — a API confirma a redefinição de senha, a verificação de e-mail e a troca de
      e-mail pelos endpoints REST do Identity Toolkit. Project settings → General → Web API Key.
- [ ] `NEXT_PUBLIC_APP_URL` **na `apps/api`** apontando para o host real da `apps/app` — é a base dos links
      enviados nos e-mails de ação. Valor errado gera link que não resolve; valor ausente faz o pedido de
      redefinição e o de troca de e-mail responderem `EMAIL_NOT_CONFIGURED`.

### 5. `CORS_ORIGIN`

- [ ] Lista de origens do browser autorizadas a chamar a API, separada por vírgula. **Não há wildcard.**

Obrigatória em produção: `apps/api/instrumentation.ts` derruba o boot sem ela.

⚠️ **O gate não mata o processo.** O Next imprime `Failed to prepare server` e **fica no ar respondendo
500 a tudo** — uma plataforma que só verifica se a porta responde veria o container **saudável** e daria o
deploy por bem-sucedido. Ou o health check distingue 5xx, ou vale trocar o `throw` por `process.exit(1)`.

### 6. Cloud Storage — **só se o fork usa upload de arquivo**

- [ ] Serviço de Storage ativado no projeto (exige plano **Blaze**)
- [ ] `FIREBASE_STORAGE_BUCKET` (`apps/api`) e `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (`apps/app`), local **e** na Vercel
- [ ] `roles/storage.objectAdmin` concedido à service account
- [ ] `storage.rules` publicado
- [ ] Verificado que o objeto **não** abre sem assinatura
- [ ] Verificado que a exclusão de conta apaga os objetos sob `uploads/<profileId>/`

**Este item é pulável, e pular é uma escolha legítima.** A capacidade é opt-in por env: sem as variáveis o
app sobe, o build passa e o fork **continua no plano Spark, sem cartão**. Só siga adiante se o produto
precisa de upload.

**São dois os consumidores hoje** — pulando o item, os dois degradam e nada quebra:

| Consumidor | Sem Storage |
|---|---|
| Foto da entidade de exemplo (`entities`) | O campo volta a ser uma caixa de URL de texto. |
| **Foto de perfil na área de conta** (`/account`, aba Perfil) | O campo de avatar **não aparece**; o resto da aba (nome, telefone) funciona normalmente. |
| **Exclusão de conta pelo titular** (`POST /account/deletion`) | O passo `storage` do expurgo reporta `skipped: storage-not-configured`. Sem bucket não há objeto para deixar para trás; o que fica pendente é conferir esse passo **depois** de ativar o Storage. A permissão que ele exige (listar e apagar por prefixo) já vem de `roles/storage.objectAdmin`, acima. |

Se as variáveis estiverem preenchidas mas o serviço **não** estiver ativado, o upload responde **503 com
`error.code` traduzido** — nunca 500, e nunca uma tela quebrada.

⛔ **O que ninguém avisa: storage exige plano Blaze — ou seja, cartão de crédito.** Desde **2026-02-03** um
projeto no Spark **não tem acesso a bucket nenhum**; as chamadas voltam **402/403**. O gasto real continua
**$0,00/mês** no cenário de um MVP (a faixa "Always Free" do GCS cobre folgado), mas a **forma de pagamento
passou a ser obrigatória** — e isso contraria a leitura ingênua de "começar de graça". Os números, o
comparativo com S3/R2 e o veredito estão em
[`specs/research/object-storage-costs.md`](../specs/research/object-storage-costs.md).

⚠️ **Escolha a região do bucket com cuidado — é o erro caro deste passo.** A franquia "Always Free" do
Cloud Storage só existe em **`us-central1`, `us-east1` e `us-west1`**. Criar o bucket em
`southamerica-east1` por reflexo de latência **cancela a franquia inteira** e passa a cobrar desde o
primeiro byte.

**Passo a passo:**

1. **Ativar.** Firebase Console → Build → Storage → *Get started*. O console vai exigir o upgrade para
   Blaze e um método de pagamento. Escolha uma das três regiões acima. Anote o nome do bucket — algo como
   `<project-id>.firebasestorage.app`.
2. **Preencher as duas variáveis**, com o **mesmo** valor, em **dois lugares** (o `.env` local e o painel da
   Vercel de cada app — esquecer a Vercel é o modo de falha mais comum aqui):
   - `apps/api` → `FIREBASE_STORAGE_BUCKET`
   - `apps/app` → `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
3. **Dar permissão à service account.** A mesma do item 2 precisa ler, gravar e apagar objetos:
   ```bash
   gcloud storage buckets add-iam-policy-binding gs://<bucket> \
     --member="serviceAccount:<FIREBASE_ADMIN_CLIENT_EMAIL>" \
     --role="roles/storage.objectAdmin"
   ```
   ⛔ **Nunca conceda `allUsers` nem `allAuthenticatedUsers`**, em nenhum papel. Isso torna o bucket
   público e anula todo o desenho de acesso — a URL deixa de precisar de assinatura e nunca expira.
4. **Publicar as rules do bucket** (com ensaio antes, como nas do Firestore):
   ```bash
   npx -y firebase-tools@latest deploy --only storage --dry-run   # valida a sintaxe
   npx -y firebase-tools@latest deploy --only storage
   ```
5. **Verificar que o furo está fechado.** Pegue o caminho de um objeto que você acabou de subir e tente
   baixá-lo **sem** assinatura:
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' "https://storage.googleapis.com/<bucket>/<objeto>"
   ```
   Esperado **403**. Se devolver **200**, o bucket está público — revise o passo 3. A URL assinada que a
   API emite, essa sim, deve devolver 200 enquanto não expirar (15 min).

**CORS no bucket: não é necessário.** O browser nunca fala com o bucket a não ser por `GET` de imagem
(`<img src>`), que não é requisição CORS. O upload atravessa a `apps/api` (`POST /files`), servidor a
servidor. Se algum dia o upload virar direto-ao-bucket, aí sim CORS passa a ser obrigatório.

⚠️ **Duas camadas diferentes, e só uma é `storage.rules`.** As rules governam
`firebasestorage.googleapis.com` (a API do Firebase). Quem fecha `storage.googleapis.com` — de onde saem as
URLs assinadas — é a **ausência de IAM público** no bucket (passo 3). Publicar as rules e deixar `allUsers`
no IAM deixa o bucket aberto. O cabeçalho de [`storage.rules`](../storage.rules) detalha.

**O que acontece sem configurar (comportamento projetado, não bug):** o app sobe e o build passa;
`POST /files` responde **503 `STORAGE_NOT_CONFIGURED`**; o formulário de `entities` **não** mostra o seletor
de arquivo e mantém o campo de URL de imagem que já existia. Nada quebra — a funcionalidade apenas não
existe, e diz isso em voz alta em vez de fingir.

### 7. Consentimento de cookies — o texto legal e o domínio

- [ ] Reescrever a política de privacidade com os dados reais do fork
- [ ] Acrescentar à seção de cookies os que o fork gravar além dos do core
- [ ] `NEXT_PUBLIC_PRIVACY_CONTACT` com o endereço do fork (vazio: o canal cai no formulário de `/contact`)
- [ ] Listar na política de privacidade os subprocessadores que o fork liga, a partir de [`SUBPROCESSORS.md`](SUBPROCESSORS.md)
- [ ] `SESSION_COOKIE_DOMAIN` definida em produção, **se** `web` e `app` rodam em subdomínios distintos
- [ ] Conferir no painel do Google que o Consent Mode chega como esperado

O banner de consentimento e o Consent Mode v2 já funcionam sem nenhum destes passos: o visitante escolhe,
a escolha é respeitada e nenhuma tag carrega antes dela. O que falta é tudo **texto e domínio**, e é o tipo
de pendência que um fork carrega sem perceber porque a tela parece pronta.

**A política de privacidade em [`apps/web`](../apps/web) é um modelo**, e diz isso no próprio corpo. Um
fork que sobe com ela fica em posição pior do que se não tivesse banner nenhum: o banner afirma ao visitante
que existe uma política, e a política não descreve o tratamento real. Quem responde por isso é o fork, não o
boilerplate.

**A declaração de cookies é parte desse texto, e o modelo já a carrega.** A política em `apps/web` tem uma
seção "Cookies que usamos" nos 3 idiomas, com os sete nomes abaixo; o teste
`packages/internationalization/__tests__/legalSections.test.ts` falha se um deles sumir de algum idioma. O
que o fork acrescenta é o que ele mesmo gravar.

Recontado no código em 2026-09-16 — a lista anterior dizia "sete" e omitia três nomes. São **sete gravados
pelo próprio repositório**, mais dois do Google:

| cookie | onde | categoria |
|--------|------|-----------|
| `access-token` | `packages/auth/session.ts:14` | estritamente necessário (sessão) |
| `bp:panel-request-role` | `apps/app/shared/lib/panelState.ts:18` | estritamente necessário (estado de painel) |
| `bp:impersonate-firebase-uid` | `apps/app/shared/lib/panelState.ts:19` | estritamente necessário (estado de painel) |
| `bp:cookie-consent` | `packages/analytics/consent.ts:1` | estritamente necessário (a própria escolha) |
| `x-locale` | `packages/internationalization/server.ts:20` · `apps/app/proxy.ts:169,173` · `apps/web/proxy.ts:104,108` | preferência |
| `x-theme` | `apps/app/shared/lib/themePreference.ts:10` · `apps/app/app/layout.tsx:21` | preferência |
| `sidebar_state` | `packages/design-system/components/ui/sidebar.tsx:28` | preferência |
| `_ga` · `_ga_<id>` | Google Analytics | medição — só depois do consentimento |

Um fork que acrescente ferramenta acrescenta cookie, e a lista precisa acompanhar. Conte no código antes de
escrever o número: esta é a terceira contagem de cookies do repositório a sair errada.

**`SESSION_COOKIE_DOMAIN` só importa em subdomínio.** Ela já existe para o SSO entre `web` e `app`; o
consentimento reaproveita o mesmo valor. Em `localhost` os dois apps compartilham o cookie sem configuração
nenhuma, então **este é um caso que não aparece em desenvolvimento**: a falha só surge em produção, com
`site.com` e `app.site.com`, na forma de um visitante que aceita na landing e recebe o banner de novo ao
entrar no app.

**O Consent Mode do lado do Google não é verificável daqui.** Os quatro sinais são emitidos e chegam à
requisição de coleta como `gcs=G101` — isso foi medido. Como o Google os interpreta só aparece numa
propriedade real, depois de tráfego.

**O que acontece sem configurar:** o app sobe, o build passa, o banner aparece e é respeitado. Sem
`NEXT_PUBLIC_GA_MEASUREMENT_ID` e fora da Vercel, o banner **nem aparece** — não há o que consentir, e
nenhuma tag é montada.

**Como verificar** que o consentimento está de pé, com o app servindo:

```bash
curl -s -L http://localhost:3001/pt-br | grep -c googletagmanager
# 0 — antes da decisão, o HTML não cita o Google

curl -s -L -H 'Cookie: bp:cookie-consent=v1:analytics=granted' http://localhost:3001/pt-br \
  | grep -o '"analytics_storage":"[a-z]*"'
# "analytics_storage":"granted" — a escolha já nasce no primeiro script, sem esperar update
```

### 12. Stripe — só se o fork cobra assinatura

Numerado depois dos recomendados para não mudar a numeração que outros documentos citam. É bloqueador
para quem vende assinatura; quem não vende pula inteiro.

- [ ] Produtos e preços **recorrentes** criados no Dashboard da Stripe
- [ ] Customer Portal configurado (cancelamento, troca de plano, cartão; reembolso conforme a lei)
- [ ] Endpoint `https://<api>/webhooks/payments` registrado na versão `2025-09-30.clover`, com os seis eventos
      (inclui `invoice.paid` e `entitlements.active_entitlement_summary.updated`)
- [ ] Recursos (Product catalog → Features) cadastrados com o `lookup_key` que o código do fork pede e ligados
      aos produtos que os incluem, se o fork usa gate por recurso
- [ ] Conferir na conta Stripe se o Entitlements tem custo: a documentação lida em 2026-09-30 não fala em preço
- [ ] Opcional, só para ver a demonstração do gate: `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` com o mesmo valor na
      `apps/api` e na `apps/app`
- [ ] `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` na `apps/api` (Vercel)
- [ ] `NEXT_PUBLIC_APP_URL` na `apps/api` e na `apps/web`; `NEXT_PUBLIC_PRODUCT_MODE` igual nos três apps
- [ ] Opcional: TTL do Firestore em `paymentEvent.expiresAt`, e em nenhuma outra coleção de cobrança
- [ ] Antes do release, decidir se o checkout passa a consultar a Stripe contra assinatura duplicada (ver
      "Risco aceito" abaixo)

**Por que existe.** O código de assinatura está pronto, mas catálogo, portal e endpoint de webhook vivem na
conta Stripe de cada fork, e nenhum teste alcança essa conta.

**O que acontece sem ela (comportamento projetado, não bug).** O app sobe e o build passa. A aba
`/account?tab=billing` mostra o placeholder "Cobrança em breve", `GET /payments/plans` responde
`{ "enabled": false, "plans": [] }`, checkout e portal respondem 503 `PAYMENTS_NOT_CONFIGURED`, e o webhook
responde 503 com o mesmo código. Com só uma das duas chaves, a API loga no boot
`[payments] billing is DISABLED (no <chave que falta>)` e continua desligada. Sem catálogo mas com as
chaves, a aba diz que não há planos. Com o endpoint numa versão de API anterior a 2025-03-31, a assinatura
é gravada mas sem data de renovação (`currentPeriodEnd: null`).

Na home do admin, com a cobrança desligada ou no modo `simple`, a seção de cobrança não aparece e
`GET /payments/summary` responde 200 `{ "data": { "enabled": false } }` sem ler as coleções de cobrança. Com a cobrança
ligada mas sem `invoice.paid` no endpoint, a assinatura continua sendo gravada no perfil, mas a receita do mês
e as contratações recentes ficam vazias; havendo assinatura vigente, a seção mostra um aviso para conferir o
evento. Um fork que já vendia começa receita e contratações do zero no dia em que `invoice.paid` for
cadastrado, porque faturas antigas não são importadas. Os nomes de plano aparecem conforme os eventos de cada
preço chegam, o que leva até um ciclo de cobrança; até lá o gráfico mostra "Plano sem nome".

Sem `entitlements.active_entitlement_summary.updated` no endpoint, ou sem recursos cadastrados na Stripe,
nenhum perfil recebe a lista de recursos. O gate por status (`requirePlanApi` com `{}`) funciona; o gate por
recurso responde 403 `PLAN_FEATURE_REQUIRED` a todo assinante. Com a cobrança desligada, nenhum dos dois
bloqueia: `planAccess.enforced` vem `false`. Com `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` vazia, a criação de
`entity` não tem gate nenhum.

**Risco aceito: assinatura duplicada.** O checkout só recusa com 409 `PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE`
quando o perfil já tem uma assinatura viva gravada (`apps/api/app/(routes)/payments/checkout/route.ts:41`).
Se a pessoa abrir o checkout em duas abas e pagar nas duas antes de o primeiro webhook chegar, a Stripe cria
duas assinaturas. O perfil fica com a mais recente (`decideSubscriptionWrite`,
`apps/api/(shared)/lib/billing-state.ts:207-214`) e tanto a exclusão de conta quanto o arquivamento pelo admin cancelam só essa
(`apps/api/(shared)/lib/account-erasure.ts:95`, `apps/api/app/(routes)/users/[id]/route.ts`). A outra segue cobrando sem vínculo com o perfil. Para o MVP
a sobrescrita foi aceita. Quem precisar fechar o caso antes do release:

1. Em `POST /payments/checkout`, quando o perfil já tem `stripeCustomerId`, chamar
   `stripe.subscriptions.list({ customer: stripeCustomerId })` antes de criar a sessão. Sem filtro de
   status, a Stripe omite as canceladas.
2. Se alguma estiver num dos `LIVE_SUBSCRIPTION_STATUSES` (`packages/sdk/src/types/payments/payments.ts:20`),
   responder 409 `PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE`, o mesmo código que a rota já usa.
3. Acrescentar em `apps/api/__tests__/paymentsCheckoutRoute.test.ts` o caso "perfil sem assinatura gravada,
   Stripe com uma viva".

O custo é uma chamada a mais à Stripe por checkout. Para saber se já aconteceu numa conta em produção,
`stripe subscriptions list --status active --limit 100` na Stripe CLI e procurar `customer` repetido.

**Passo a passo:**

1. **Catálogo.** Dashboard → Product catalog → *Add product*, com preço **recorrente** (mensal, anual…). A
   aba lista os preços recorrentes ativos cujo produto está ativo, do mais barato ao mais caro; nome,
   descrição e *marketing features* do produto aparecem no card, no idioma em que foram escritos. Preço
   avulso não aparece.
2. **Customer Portal.** Dashboard → Settings → Billing → Customer portal. Habilite cancelamento, atualização
   de forma de pagamento e troca de plano (adicione os produtos à lista). Se o produto está sujeito ao CDC,
   configure o reembolso da janela de arrependimento. Habilite também a edição do e-mail em *Customer
   information*: a troca de e-mail na conta não atualiza o `customer` da Stripe, e o portal é o caminho
   do titular para mudar o endereço de cobrança.
3. **Endpoint do webhook.** Dashboard → Developers → Webhooks → *Add endpoint*:
   - URL: `https://<host-da-api>/webhooks/payments`
   - Versão de API: **`2025-09-30.clover`** (a mesma de `packages/payments/index.ts`)
   - Eventos: `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`,
     `entitlements.active_entitlement_summary.updated`

   Num endpoint que já existe, edite-o e acrescente o que faltar. `invoice.paid` alimenta a receita e as
   contratações recentes da home do admin; `entitlements.active_entitlement_summary.updated` grava no perfil
   os recursos do plano, que o gate por recurso consulta.

   Copie o *Signing secret* (`whsec_…`).
4. **Variáveis**, no painel da Vercel de cada app:
   - `apps/api` → `STRIPE_SECRET_KEY` (`sk_live_…` ou `sk_test_…`) e `STRIPE_WEBHOOK_SECRET` (passo 3)
   - `apps/api` e `apps/web` → `NEXT_PUBLIC_APP_URL` com o host real da `apps/app`
   - `NEXT_PUBLIC_PRODUCT_MODE` com o mesmo valor em `apps/api`, `apps/app` e `apps/web` (ausente vale
     `subscription`)
   - Opcional: `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` com o mesmo `lookup_key` em `apps/api` e `apps/app`,
     para a criação de `entity` exigir aquele recurso. Na `apps/app` o valor entra no build: mudar pede
     novo deploy.

   Uma chave com o prefixo errado (`pk_` no lugar de `sk_`) derruba o `next build` da API com
   `Invalid environment variables`. `apps/app` e `apps/web` não leem as chaves da Stripe.
5. **Recursos do plano (só para gate por recurso).** Dashboard → Product catalog → Features → *Create
   feature*, com o `lookup_key` exato que o código pede (até 80 caracteres). Depois, em cada produto que
   inclui o recurso, acrescente-o em *Features*. Quem já assina recebe o recurso só a partir do próximo
   ciclo, segundo a documentação de Entitlements da Stripe.
6. **TTL (opcional).** A coleção `paymentEvent` guarda um documento por evento processado. Para ela não
   crescer para sempre:
   ```bash
   gcloud firestore fields ttls update expiresAt \
     --collection-group=paymentEvent --enable-ttl --project=<project-id>
   ```

   Não aplique TTL em `paidInvoice` nem em `subscriptionActivation`. São o livro de faturas pagas e a data
   da primeira cobrança de cada assinatura; a home do admin soma a receita a partir deles, e um documento
   expirado some do número sem aviso.

**Como verificar**, com a API publicada:

```bash
# sem sessão: o guard responde antes da Stripe
curl -s -o /dev/null -w '%{http_code}\n' https://<api>/payments/plans      # 401
curl -s -o /dev/null -w '%{http_code}\n' https://<api>/payments/summary    # 401

# webhook sem assinatura: a configuração está lida (sem chaves seria 503)
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://<api>/webhooks/payments -d '{}'   # 500
```

Com a Stripe CLI logada na conta de teste, `stripe trigger customer.subscription.created` cria um cliente e
uma assinatura de teste; em Developers → Webhooks → endpoint, a entrega aparece com resposta 200 (nenhum
perfil tem aquele cliente, então a API registra `webhook-profile-not-found`). A resposta de sucesso é só
`{"ok":true}`; o webhook não devolve o evento recebido. Depois, com um usuário de
teste, assine um plano com o cartão `4242 4242 4242 4242`: de volta ao app, a aba mostra "Confirmando o
pagamento" e troca para o card "Plano atual" quando o webhook chega. Aberta depois disso, a home do admin
mostra o valor em "Recebido em <mês>" e a contratação na lista. Se `GET /payments/summary` responder 503
`SUMMARY_INDEX_MISSING` num projeto real, alguma consulta precisou de índice; nenhuma foi desenhada para
precisar, então isso é defeito a reportar, não índice a publicar.

---

## ⚠️ Fortemente recomendados

Não impedem o deploy. Cada um é uma conta que chega depois.

### 8. `ARCJET_KEY`

- [ ] Definida em produção, com o prefixo `ajkey_`

Sem ela o `@repo/security` degrada para **no-op** e a API avisa uma vez, no boot. Isso inclui o pedido de
redefinição de senha e o reenvio de verificação: sem limite, os dois viram **gerador gratuito de e-mail em
nome do fork** — e a fatura do provedor é do fork.

O cadastro também fica sem trava. `POST /auth/sign-up` cria a conta pelo Admin SDK, que não passa pelo
limite do Firebase de 100 contas por hora por IP (esse limite vale para a criação pelo cliente). Sem
`ARCJET_KEY`, um script cria contas pela API até o Firebase recusar por cota do projeto.

Uma chave sem o prefixo `ajkey_` tem efeito diferente em cada app. Na `api` ela conta como ausente: o limite
vira no-op e o boot registra um `console.error`, sem imprimir o valor. Em `app` e `web` o build falha em
"Collecting page data" com `Invalid environment variables`, e na Vercel o deploy anterior continua no ar.

### 9. Branch protection na `main`

- [ ] Exigir os checks `verify` e `e2e` do CI antes do merge

O CI **sinaliza e não bloqueia**: uma PR vermelha pode ser mergeada hoje (`gh api …/branches/main/protection`
→ **404**, rulesets → `[]`, remedido em 2026-09-24). Ligar exigindo os checks `verify` e `e2e` fecha isto.
O `e2e` é o job da suíte Playwright; ele só aparece na busca do ruleset depois de ter rodado numa PR, e é
pulado (o que conta como sucesso) em PR que só mexe em documentação. `coverage` é informativo e não entra.
Passo a passo no runbook de [`docs/SETUP.md`](SETUP.md#runbook--branch-protection-ação-manual-no-github).

✅ **O segundo pré-requisito também caiu, e este item não tem mais nenhum.** A auditoria de 2026-09-19
acrescentou uma condição que não existia antes: exigir o check do CI com um teste instável no repositório
transformaria um defeito de milissegundo em merge bloqueado ao acaso, e a reação previsível seria desligar
a proteção de novo. O teste era
`apps/api/__tests__/baseRepository.test.ts:477`, que afirmava `created.updatedAt === created.createdAt`
enquanto o `create()` produzia os dois instantes com duas chamadas separadas a `new Date()`. Ele derrubou o
CI da PR #21 e estava latente desde a PR #4.

A PR #22 corrigiu: `apps/api/(shared)/repositories/base.repository.ts:151` agora usa um `const createdAt`
único para os dois carimbos. Reconferido no código em **2026-09-23**, com o `HEAD` em `03498ae`, e o estado
da proteção remedido no mesmo dia (`protection` → **404**, `rulesets` → `[]`, **22** PRs mergeadas).

Não há mais nada técnico entre hoje e ligar a proteção. O que falta é a decisão, e ela é do dono do
repositório.

✅ **O pré-requisito que segurava este item caiu.** Entre 2026-09-14 e 2026-09-15 este documento tratava o
`testTimeout` ausente como bloqueante — o gate tinha falhado de verdade, `app#test` estourando o teto de 5 s
do Vitest em `apps/app/__tests__/accountSecurityForm.test.tsx`, com taxa de falha observada de 1 em 2. A PR
**#13** declarou `testTimeout: 20_000` nas **9** configs que existiam então.

Remedido em **2026-09-30**, com o `HEAD` em `c7aa4d9` (PR #34 já mergeada), sem mudança de código no working
tree. Os números de tasks e arquivos abaixo são dessa medição. A contagem da suíte foi remedida depois, na
mesma data, depois da PR #35 e com os testes novos da `ARCJET_KEY` malformada:

| medição | comando | resultado |
|---------|---------|-----------|
| configs com `testTimeout` | `grep -rl testTimeout --include=vitest.config.* .` | **13 de 13** configs de workspace (`apps/api`, `apps/app`, `apps/e2e`, `apps/web`, `packages/analytics`, `packages/auth`, `packages/design-system`, `packages/email`, `packages/internationalization`, `packages/next-config`, `packages/payments`, `packages/security`, `packages/shared`); a de `packages/next-config` entrou em 2026-09-27, com a marca configurável, e a de `packages/design-system` na PR #32. O `vitest.config.mts` da raiz só agrega a cobertura e não roda teste |
| gate completo, sem cache | `pnpm turbo run lint typecheck test test:emulator --force`, com JDK 21 | ✅ **29/29 tasks** (as 28 de `lint typecheck test` mais `api#test:emulator`), 0 em cache, **1 min 6,3 s** |
| lint/format | `pnpm check` | **806 arquivos**, 0 correções |
| suíte | `pnpm turbo run test`, 13 tasks de teste | **2485 testes em 227 arquivos**. A suíte contra emulador (`api#test:emulator`, 170 testes em 4 arquivos) fica fora desta contagem: ela roda no `pnpm test` e no `verify`, com JDK 21 |

Distribuição da suíte, medida em 2026-09-25 com `--force`: `apps/api` 894 em 73 arquivos, `apps/app` 608 em
78, `@repo/email` 137 em 7, `@repo/auth` 101 em 8, `@repo/internationalization` 59 em 6, `@repo/shared` 44
em 4, `apps/web` 44 em 9, `@repo/analytics` 34 em 2, `@repo/security` 31 em 3, `@repo/payments` 22 em 4,
`apps/e2e` (Vitest) 16 em 2.

Dois destes números mudam a cada entrega. A PR #16 acrescentou o workspace `@repo/analytics` à suíte; a #17
somou 53 testes em 5 arquivos de paginação; a #18 somou 136 testes em 12 arquivos; a home do painel somou
49 testes em 6 arquivos e 18 arquivos ao alcance do `pnpm check`; a renovação de sessão somou 49 testes em
4 arquivos (2 em `packages/auth`, 2 em `apps/app`) e 6 arquivos ao `pnpm check`. Da PR #21 à #24, a suíte
foi de 1325 para 1615 testes e o `pnpm check`, de 607 para 666 arquivos; a PR #25 somou 202 testes em 16
arquivos e 33 arquivos ao `pnpm check`; a PR #32 somou 59 testes em 8 arquivos, 10 arquivos ao `pnpm check`
e a task `@repo/design-system#test`, que levou as tasks de 27 para 28 e as configs de 12 para 13; a PR #33
somou 156 testes em 6 arquivos e 14 arquivos ao `pnpm check`, e a #34 só trouxe documentação.
**Remedir antes de citar** — nenhum destes números é estável, nem a contagem de tasks e de configs, que
mudou na PR #32. Cada uma das oito últimas auditorias encontrou a contagem de testes e de arquivos defasada, sempre pelo mesmo mecanismo: eles
são medidos corretamente e invalidados pela entrega seguinte. Leia-os como "medido em tal data", nunca como
fato corrente.

O tempo do gate já foi medido em 1 min 30 s, 30,6 s, 1 min 16,6 s, 1 min 12,4 s, 1 min 2,7 s, 56,7 s, 47,8 s, 1 min 5,8 s e agora 1 min 6,3 s (esta última já com `test:emulator` na linha), com a
suíte sempre maior. A variação é contenção da máquina no momento, não ganho ou perda de suíte. Não use este número para
dimensionar CI.

O teste que estourava roda hoje em **1273 ms** dentro do arquivo de 3322 ms — folga de mais de 15× contra o
teto novo. Nada impede mais tornar o check `verify` obrigatório na `main`.

O que **continua** valendo do diagnóstico antigo: o teto do Vitest é medido sob contenção do turbo, e o
runner do GitHub é mais lento que uma máquina local. Um teste de componente que espere por interação e
passe a encostar em 20 s é sinal de problema no teste, não motivo para subir o teto de novo.

### 10. CSP bloqueante na `apps/web`

- [ ] Trocar `Report-Only` por enforcing

Na `apps/app` e na `apps/api` a CSP já é bloqueante; na landing é `Report-Only` (`apps/web/proxy.ts`). Foi
decisão deliberada para observar antes de bloquear — e a política rodou com **zero violações reportadas**,
então virar a chave é barato.

### 11. Fechar o circuito de observabilidade

A API passou a carimbar `x-request-id` em toda resposta, a emitir log estruturado de uma linha e a expor
`/health/ready`. Isso cria a trilha; não cria quem a vigia. Os três passos abertos abaixo são de console de
provedor e nenhum deles é código — o quarto, já resolvido, era.

- [ ] **Apontar o health check da plataforma para `/health/ready`.** `/health` responde enquanto o processo
      estiver de pé, mesmo com o Firestore fora do ar — serve como liveness e nada mais. Quem decide tirar
      uma instância de rotação precisa consultar `/health/ready`, que responde `503` quando o banco não
      atende em 2 segundos.
- [ ] **Plugar um coletor de erro no `onRequestError` dos três apps.** O gancho existe e escreve no stdout,
      que a Vercel e o Cloud Run indexam. Nenhum alerta é disparado: alguém ainda precisa ir olhar. Quem
      quiser notificação acrescenta a chamada do provedor (Sentry, Better Stack, Axiom) dentro de
      `reportRequestError` e traz a env correspondente.
- [ ] **Conferir a retenção de log da plataforma de deploy.** No free tier a janela costuma ser curta o
      bastante para servir a um incidente em andamento e não a um post-mortem do dia seguinte. O número
      exato precisa ser lido no painel do provedor.

      **Há um piso normativo no Brasil, e ele vale para o log de acesso, não para a trilha de auditoria.**
      Provedor de aplicações de internet constituído como pessoa jurídica com fins econômicos deve guardar
      os registros de acesso a aplicações por **6 meses** (Marco Civil, Lei 12.965/2014, art. 15). Registro
      de acesso a aplicação é a data e a hora de uso a partir de um determinado IP (art. 5º, VIII), e desde
      o Decreto 12.975/2026 o IP guardado precisa incluir a porta lógica de origem.

      Três distinções que costumam ser confundidas: o art. 13 (1 ano) é **registro de conexão**, obrigação
      de provedor de acesso, não sua; a **trilha de auditoria** de `/admin/audit` é registro de ação de
      negócio e não tem prazo legal (§1.3); e o log de acesso é responsabilidade de **infra**, resolvida na
      retenção do bucket do provedor, não em código da aplicação. No GCP, o bucket `_Default` retém 30
      dias, insuficiente para os 6 meses.
- [x] ~~**Decidir o destino do cron órfão.**~~ Resolvido em **2026-09-16**: o bloco `crons` de
      `apps/api/vercel.json` agendava `/cron/keep-alive` às 01:00 e a rota nunca existiu — nem no commit
      que introduziu o agendamento (`665a4cc`), nem em nenhum outro. A entrada foi removida. Apontá-la
      para `/health` chegou a ser considerado e foi descartado: um ping diário não mantém uma função
      serverless aquecida, então a chamada existiria só para justificar a linha.

### 13. Marca do produto

- [ ] `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_LOGO_URL` e `NEXT_PUBLIC_APP_SUPPORT_EMAIL` definidas nos
      projetos `app`, `web` e `api` da Vercel, seguidas de um deploy novo de cada um
- [ ] Logo hospedado numa URL `https` pública e estável, num CDN ou bucket com leitura pública (a web não
      serve arquivo solto: o proxy dela redireciona para o prefixo de idioma todo caminho sem ele)
- [ ] Ícones do app (`apps/app/app/`) e da web (`apps/web/app/[locale]/`) trocados pelos do produto

Sem as variáveis, o produto sobe normalmente e o cliente vê `next-boilerplate` no painel, na landing, no
título da aba e nos e-mails. As variáveis são `NEXT_PUBLIC_*`, então defini-las sem refazer o deploy não
muda nada. Passo a passo em [`FORKING.md`](FORKING.md), passo 1.

### 14. Documentos de conformidade

- [ ] Registro de operações completo nas lacunas `[FORK]`: [`ROPA.md`](ROPA.md)
- [ ] Papéis do runbook preenchidos e o runbook lido por quem decide: [`INCIDENT-RESPONSE.md`](INCIDENT-RESPONSE.md)
- [ ] Lista de subprocessadores cortada para as integrações que o fork liga, e o DPA de cada uma aceito na conta do provedor: [`SUBPROCESSORS.md`](SUBPROCESSORS.md)
- [ ] Backup decidido (Blaze com agendamento, ou operação sem backup registrada no `ROPA.md`) e uma restauração testada: [`BACKUP.md`](BACKUP.md)

São obrigações de quem opera o fork, não recursos do produto: a LGPD cobra o registro de operações (art.
37) e a comunicação de incidente (art. 48, regulamentado pela Res. CD/ANPD 15/2024), e nenhum teste deste repositório confere nada
disso. O boilerplate entrega os quatro modelos preenchidos com o que o código faz; o preenchimento e a
decisão jurídica são do fork. `grep -n "\[FORK\]" docs/*.md` lista o que falta.

Dois achados dos modelos pedem atenção antes do primeiro cliente: o DPA da Vercel só vale nos planos Pro e
Enterprise, e no plano Spark do Firebase o Firestore não tem backup de nenhum tipo.

---

## 🧹 Higiene

### Declaração — até onde a exclusão de conta alcança

Não é pendência de configuração: é o que o fork precisa saber antes de prometer ao titular que a conta
some inteira.

`runAccountErasure` (`apps/api/(shared)/lib/account-erasure.ts`) roda seis passos nomeados e devolve o
estado de cada um. Quatro apagam de verdade no boilerplate como ele vem: os registros de `entity` do
titular, os rótulos pessoais na trilha de auditoria, o documento de perfil e a conta no Firebase Auth —
que é o que libera o e-mail para um novo cadastro. Os outros dois dependem de infra do fork:

| Passo | Estado no boilerplate | O que destrava |
|---|---|---|
| `billing` | Roda **primeiro**. `skipped: no-subscription` para quem não tem assinatura viva; com assinatura viva, cancela na Stripe (imediato, sem reembolso proporcional) e reporta `done`. | Configurar a Stripe (item 12). Se o cancelamento falhar, ou se a Stripe estiver desligada e o perfil tiver assinatura viva gravada, o expurgo **para antes de apagar qualquer coisa**: os outros passos saem como `skipped: billing-failed` e a rota responde 503 `ACCOUNT_DELETION_BILLING_FAILED`. Apagar o perfil com a assinatura ativa deixaria a pessoa sendo cobrada sem vínculo para descobrir de quem é a assinatura. O cliente Stripe (e-mail e histórico de faturas) **continua** na Stripe: apagá-lo é decisão fiscal e jurídica de cada fork. As coleções `paidInvoice` e `subscriptionActivation` também ficam: guardam só ids da Stripe, valor, moeda e datas, sem perfil, nome ou e-mail. Depois do expurgo, a contratação aparece na home do admin como "Usuário removido" e o valor pago continua na receita. |
| `storage` | `skipped: storage-not-configured` | Ativar o Cloud Storage (item 6). Sem bucket não existe objeto para apagar. |

O relatório inteiro vai para o log estruturado como `[account] erasure-step`, uma linha por passo,
correlacionada por `requestId`, com nome do passo, estado e contagem — nunca valores. Ele não volta na
resposta: quem pediu a exclusão não precisa da operação, e a resposta é `{ "confirmed": true }`.

**A exclusão não tem janela de arrependimento.** É imediata e irreversível, e sem backup do Firestore não
há de onde restaurar. Com o backup agendado ligado ([`BACKUP.md`](BACKUP.md)), o perfil e os registros
apagados ficam nos backups até o fim da retenção deles, e esse prazo entra no que se declara ao titular.

### Pendência — no modo `simple` o titular não alcança a aba de privacidade

**Fechada em 2026-09-25.** A premissa não conferia com o código (nota abaixo) e o usuário decidiu não
mexer no modo `simple` por ora. Reabra se o modo passar a restringir o painel comum.

> ⚠️ **Correção medida em 2026-09-25: a premissa desta seção não confere com o código.** O texto abaixo parte
> de que o modo `simple` restringe o painel comum a administradores. Nada no `apps/app` faz isso: o layout
> `(common)` não lê o modo de produto, e os únicos arquivos do app que leem são `(common)/routes.tsx:52` e
> `AccountTabs.tsx:33`, os dois só para esconder a cobrança. `commonUserUsesPanel()` não existe em
> `packages/next-config/product-mode.ts`, e a `apps/web` não tem área autenticada. Hoje, num fork `simple`, o
> usuário comum entra no painel e alcança a aba de privacidade. A pendência real é outra: o modo `simple`
> não faz o que `docs/AUTH-SSO.md` descreve. Ela está registrada nos achados do `specs/BACKLOG.md`. O texto
> abaixo fica como estava, porque as saídas listadas voltam a valer no dia em que a restrição existir.

A exportação e a exclusão de conta vivem na aba Privacidade da área de conta, que fica sob o painel comum
(`apps/app/app/[locale]/(authenticated)/(common)/`). Quando `NEXT_PUBLIC_PRODUCT_MODE` é `simple`, o painel
comum fica restrito a administradores, então o usuário final não tem rota até a aba.

**O que isso significa na prática.** Num fork `simple`, o titular exerce os direitos do art. 18 apenas pelo
canal publicado nas páginas legais (`NEXT_PUBLIC_PRIVACY_CONTACT`, item 7) — e alguém do outro lado atende
na mão. A obrigação legal continua de pé; o que muda é que ela deixa de ser autoatendimento.

**Por que ficou assim.** Nenhum arquivo da entrega de direitos do titular lê `NEXT_PUBLIC_PRODUCT_MODE`: a
aba herda o alcance do painel que a hospeda. É consequência do desenho de modos de produto, não um defeito
desta feature, e por isso não foi tratada junto dela.

**Saídas possíveis, nenhuma escolhida:**

1. Expor a aba de privacidade fora do painel comum, numa rota que o modo `simple` alcance.
2. Manter como está e exigir que todo fork `simple` preencha `NEXT_PUBLIC_PRIVACY_CONTACT` com um endereço
   monitorado — hoje o vazio cai no formulário de `/contact`, que entrega em `ownerInbox()`.
3. Declarar que o modo `simple` não atende titular final e serve só a ferramenta interna.

**Como verificar que o fork está coberto:** com `NEXT_PUBLIC_PRODUCT_MODE=simple`, entre como usuário
comum e tente chegar a `/{locale}/account?tab=privacy`. Se não chegar, confirme que as páginas legais
publicam um canal que alguém lê.

### Declaração — por quanto tempo uma sessão pode ser renovada

`SESSION_ABSOLUTE_MAX_AGE_DAYS` (nos `.env.example` da `apps/app` e da `apps/web`) define o teto absoluto
da sessão, contado a partir do login original. Vazia ou ausente, vale **30 dias**; o valor é grampeado
entre a vida do cookie e **90 dias** (`packages/auth/session.ts:28-29`, `:96-107`). Nada quebra se o fork
não definir: ele só herda uma política de sessão que talvez nunca tenha lido.

**O teto pode ser ultrapassado por até metade da vida do cookie.** A renovação só é tentada depois de o
cookie cumprir metade da vida (`session.ts:30`, `:137-139`), e é nessa tentativa que o teto é conferido (`:154`).
Com os padrões (cookie de 5 dias, teto de 30), uma sessão pode seguir válida até cerca de 32,5 dias depois
do login: ela não é renovada além do teto, mas o último cookie emitido vive até expirar sozinho. Conferir o
teto a cada navegação custaria uma chamada ao provedor em toda requisição, e por isso ficou assim de
propósito.

**Como decidir:** se o produto precisa de um corte rígido (conta compartilhada, dado sensível), reduza
`SESSION_COOKIE_MAX_AGE_DAYS` junto com o teto, porque a folga é proporcional à vida do cookie.

### Declaração — o que encerrar uma sessão pela lista não corta

Não é pendência que bloqueie deploy: é o limite do que a lista de sessões da aba Segurança garante.

O Firebase só revoga refresh token da conta inteira (`revokeRefreshTokens`), nunca de uma sessão. Por isso,
encerrar uma sessão ou "todas as outras" grava a recusa na coleção `session`, e a API passa a recusar a
credencial daquela sessão, por ID token ou por cookie. O aparelho encerrado perde a API e o cookie, mas
**continua com um refresh token válido no Firebase**: consegue emitir ID tokens e chamar o Identity Toolkit
direto com a chave pública. Firestore e Storage negam todo cliente (`firestore.rules`, `storage.rules`), e
trocar senha, e-mail ou excluir a conta pelo Identity Toolkit exige login recente, ou seja, a senha. Para
cortar também no Firebase, o titular usa "Sair de todos os dispositivos" ou troca a senha.

O botão "Sair" passou a encerrar só a sessão do navegador atual. Fork que queira o comportamento antigo
(sair de todos) chama `POST /account/sessions/revoke` antes do `signOut`.

**Paridade de `SESSION_ABSOLUTE_MAX_AGE_DAYS`.** A API lê a mesma variável para esconder da lista as sessões
além do teto absoluto. Se o fork mudou o valor na `apps/app` e na `apps/web`, precisa repetir o valor na
`apps/api` (está no `.env.example` dela). Sem isso, a lista esconde sessões ainda vivas ou mostra sessões já
vencidas, conforme o lado para que o valor mudou.

**Não configure TTL na coleção `session`.** Apagar o documento de uma sessão encerrada a faria voltar a
valer para um cliente Firebase que ainda tem o refresh token. Os documentos saem na exclusão da conta.

### Declaração — o campo `lastAccessAt` do perfil

Não é pendência: é o que o fork precisa saber sobre um dado pessoal que ele herda ligado.

**Para que serve.** Medir uso do produto para operar a base — identificar conta parada, decidir contato.
Dois consumidores hoje: a listagem do admin, que mostra o instante por pessoa, e o bloco de atividade da
home do admin, que só publica contagens agregadas. Nada de perfilamento, nada de decisão automatizada.

**O que o campo guarda.** Data e hora, e só. Sem IP, sem user-agent, sem dispositivo, sem localização.
Isso importa juridicamente: o Marco Civil (art. 5º, VIII) define registro de acesso como data e hora de
uso **a partir de um determinado endereço IP**, então o prazo de 6 meses do art. 15 não alcança este
campo. Vale o regime finalístico da LGPD (arts. 15, 16 e 6º, III), sem prazo fixo, com o Decreto
8.771/2016 (art. 13, § 2º) mandando reter o mínimo.

**Retenção.** Enquanto a conta existir. O campo é estado atual, não série histórica: cada gravação
substitui a anterior, e não há segundo lugar guardando o valor antigo.

**Onde ele mora.** Chave de primeiro nível no documento da coleção `user`. Sem coleção própria, sem
subcoleção, sem espelho na trilha de auditoria, sem derivado gravado. Um export do documento de perfil
já leva o campo junto; uma exclusão do documento já o apaga.

**O que é verdade, e por qual caminho.** São dois sentidos de "excluir", e eles não fazem a mesma coisa.
A exclusão pedida pelo titular (`POST /account/deletion`, aba Privacidade de `/account`) apaga o documento
de perfil de fato, e o `lastAccessAt` vai junto. O `DELETE /users/[id]` do admin continua sendo soft
delete: carimba `deletedAt` e mantém o documento, com o campo dentro. Um fork que prometa "apagamos seu
último acesso ao excluir a conta" acerta sobre o primeiro caminho e erra sobre o segundo.

**Precisão.** `ACTIVITY_WINDOW_MINUTES` vale **15**, em
`apps/api/(shared)/lib/activity-windows.ts`. Esse número é o erro máximo do campo: o valor exibido pode
estar até 15 minutos atrás do acesso real. Qualquer métrica derivada herda essa precisão. Um fork que
precise de mais resolução paga em escritas no Firestore.

**Custo de escrita.** Uma escrita por usuário por janela no caso normal. Requisições simultâneas do mesmo
usuário que cheguem antes da primeira escrita da janela leem o perfil ainda sem carimbo e gravam cada uma
— o desenho não usa transação, então o piso é uma escrita por janela e o teto é o paralelismo do momento.
Medido em 2026-09-17 contra o emulador: 110 requisições autenticadas em duas janelas produziram 3
escritas, das quais 2 vieram de um par concorrente na abertura da primeira janela.

### Declaração — o que a política de senha não alcança

Não é pendência que bloqueie deploy: é o limite do que o boilerplate garante sem custo.

A regra de 8 a 1024 caracteres vale em toda rota da `apps/api` que define senha. Os formulários das duas
front-ends aplicam o mínimo de 8 antes de enviar; o teto de 1024 só a API confere. O cadastro pelo produto
passa por `POST /auth/sign-up`, então a regra vale ali também.

**O caminho que fica aberto.** A chave web do Firebase é pública por desenho. Quem chamar
`identitytoolkit.googleapis.com/v1/accounts:signUp?key=<chave>` direto, fora do produto, ainda cria conta
com senha de 6 ou 7 caracteres, porque o mínimo do Firebase é 6. O prejuízo fica com quem faz isso: é a
própria conta dele que nasce com senha fraca. As contas criadas antes da política também podem ter senha de
6 ou 7, e o login continua aceitando essas senhas; o servidor não sabe o tamanho delas e não força troca.

**Como fechar, se o fork precisar.** As duas saídas exigem o upgrade para Firebase Authentication with
Identity Platform:

1. Password policy em modo `ENFORCE` com mínimo 8, aplicada pelo próprio Firebase a qualquer cliente.
2. Desligar o cadastro pelo cliente, e aí só o Admin SDK (a rota da API) cria conta.

O upgrade impõe teto de 3.000 usuários ativos por dia no plano Spark, ou exige cartão no Blaze (50 mil MAU
sem custo, depois US$ 0,0025 a 0,0055 por MAU, segundo `firebase.google.com/docs/auth`, consultado em
2026-09-26).

**Como verificar:** com a política ligada, a chamada REST acima com senha de 7 caracteres tem de ser
recusada em vez de criar a conta.

- [ ] **Contas de QA acumuladas** no projeto Firebase de desenvolvimento (`next-boilerplate-576d0`).
      Todas `example.com`, sem PII real e sem senha em arquivo. Limpar em Authentication **e** o doc `user`
      no Firestore. Nenhuma existe no projeto de produção; a limpeza é para o ambiente de dev não virar
      lixão.
      - Ciclos anteriores: `qa-admin@`, `qa-common@`, `qa-review-common@`, `qa-ci-admin@`,
        `qa-review-ci@`, `qa-common-ci@`, `qa-api-hardening@`, `review-api-hardening@` e as descartáveis da
        recuperação de senha.
      - Da PR #11 (`file-upload-storage`): `qa-test-upload@`, `qa-test-upload-b@`.
      - **Da PR #12 (`account-settings`) — 5 contas, acrescentadas na auditoria de 2026-09-15 porque a
        entrega não as registrou aqui:** `rv-a@`, `rv-b@` (criadas pelo `/review`),
        `qa-account-settings-a@`, `qa-account-settings-b@`, `qa-account-settings-b2@` (criadas pelo
        `/test`). ⚠️ `qa-account-settings-b@` ficou **inutilizável** — a senha não foi registrada e o
        `sign-in` devolve 500; apagar em vez de tentar reusar.

      - **Da PR #13 (`firebase-emulator-seed`): nenhuma.** Conferido na auditoria de 2026-09-16 contra
        `docs/features/firebase-emulator-seed/test/report.md:131-135`: as contas do ciclo
        (`admin@`, `user@`, `user2@`, `qa-emulator-seed@`) existiram **só no emulador** e morreram com o
        processo; `qa-trap@` nunca chegou a ser criada, porque a trava de
        `apps/api/scripts/emulatorTarget.mjs` recusou antes da escrita. É o primeiro ciclo que não engorda
        esta lista, e é exatamente o efeito que a PR #13 existia para produzir.
      - **Da PR #14:** nenhuma — a PR não tocou em código de aplicação.
      - **Do ciclo `observability-logging`: nenhuma.** `qa-observability@example.com` aparece nos
        formulários do `/develop` e do `/review`, mas nenhuma conta com esse endereço chegou a existir: o
        `/forgot-password` para no `EMAIL_NOT_CONFIGURED` antes de consultar o Authentication, e as
        tentativas de `sign-in` falharam por credencial inválida. Nada a apagar.
      - **Da tarefa `disabled-account-revocation`: nenhuma sobrou.** O `/test` de 2026-09-30 criou
        `qa-disabled-revocation@example.com` pelo `POST /auth/sign-up`, desativou e reativou a conta, e
        apagou no fim o usuário do Authentication, o doc `user` e os 2 eventos `auditEvent` que o `PUT`
        gravou. Usou `qa-admin@` como ator por token customizado, sem senha; ela continua existindo e
        ganhou só um `lastAccessAt` novo.

      > **Padrão a corrigir no processo, não na lista:** esta seção é atualizada por quem entrega, e em
      > 2026-09-15 a entrega anterior não a atualizou. Foram **15 contas** acumuladas em 12 PRs, todas
      > anteriores ao emulador. Se o `/review` e o `/test` não escreverem aqui, a auditoria descobre tarde
      > — e descobriu. Com o emulador como caminho local padrão, a tendência é a lista parar de crescer.
- [ ] **Branches mergeadas ainda vivas no remoto** — as PRs são mergeadas por squash e as branches ficam.

---

## Passo manual que não é pendência, é rotina

Quem for a produção pela primeira vez deve conferir, na ordem: **service account** → **build passa** →
**`CORS_ORIGIN`** → **deploy da API** → **publicar as rules** → **domínio de e-mail** → **ciclo real de
recuperação de senha** → **storage, se o fork usa upload**. Os quatro últimos são os que ninguém lembra, e
são os que o usuário final sente. Depois disso, a restauração do backup é testada na frequência que o fork
anotou em [`BACKUP.md`](BACKUP.md): backup que nunca foi restaurado não conta como backup.

Referências: [`SETUP.md`](SETUP.md) (variáveis, uma a uma) · [`SECURITY.md`](SECURITY.md) (postura e
comandos) · [`ARCHITECTURE.md`](ARCHITECTURE.md).
