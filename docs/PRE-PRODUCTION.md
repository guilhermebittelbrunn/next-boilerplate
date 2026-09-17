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
**2026-09-14** lendo as rules publicadas direto do projeto, que batem com o arquivo versionado.

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

> 📌 **O emulador chegou; a suíte de testes das rules, não.** O repo agora roda contra os emuladores de
> Auth e Firestore (`pnpm emulators`), o que era o **pré-requisito** para testar as rules — mas nenhum
> teste as exercita ainda. Elas continuam validadas só por `deploy --dry-run` (sintaxe) e pelo `curl`
> manual acima (comportamento). A suíte com `@firebase/rules-unit-testing` está fora do corte da entrega
> do emulador e anda junto de `ci-pipeline`/`e2e-testing`. **Não leia "emulador entregue" como "rules
> testadas".** O emulador de **Storage** não foi ligado, então `storage.rules` segue sem teste e sem
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

**Sem isto, quem esquece a senha perde a conta.** A recuperação de senha e a verificação de e-mail
dependem de entrega real; sem credencial, o pedido de redefinição responde `EMAIL_NOT_CONFIGURED` (503) em
vez de fingir que enviou. O erro é honesto, mas a funcionalidade não existe.

⛔ **Nunca foi provado de ponta a ponta.** Toda a validação da base de e-mail e da recuperação de senha foi
feita com preview local e placeholder — **nenhuma mensagem saiu de verdade**, porque isso exige o passo de
DNS, que não tem contorno. Depois de configurar, rode o ciclo real uma vez: pedir redefinição → receber →
definir a senha nova → entrar.

### 4. As chaves que os links de ação carregam

- [ ] `FIREBASE_WEB_API_KEY` — a API confirma a redefinição de senha e a verificação de e-mail pelos
      endpoints REST do Identity Toolkit. Project settings → General → Web API Key.
- [ ] `NEXT_PUBLIC_APP_URL` **na `apps/api`** apontando para o host real da `apps/app` — é a base dos links
      enviados nos e-mails de ação. Valor errado gera link que não resolve; valor ausente faz o pedido de
      redefinição responder `EMAIL_NOT_CONFIGURED`.

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

**Este item é pulável, e pular é uma escolha legítima.** A capacidade é opt-in por env: sem as variáveis o
app sobe, o build passa e o fork **continua no plano Spark, sem cartão**. Só siga adiante se o produto
precisa de upload.

**São dois os consumidores hoje** — pulando o item, os dois degradam e nada quebra:

| Consumidor | Sem Storage |
|---|---|
| Foto da entidade de exemplo (`entities`) | O campo volta a ser uma caixa de URL de texto. |
| **Foto de perfil na área de conta** (`/account`, aba Perfil) | O campo de avatar **não aparece**; o resto da aba (nome, telefone) funciona normalmente. |

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
- [ ] Declarar os cookies que o fork grava, no texto da política
- [ ] `SESSION_COOKIE_DOMAIN` definida em produção, **se** `web` e `app` rodam em subdomínios distintos
- [ ] Conferir no painel do Google que o Consent Mode chega como esperado

O banner de consentimento e o Consent Mode v2 já funcionam sem nenhum destes passos: o visitante escolhe,
a escolha é respeitada e nenhuma tag carrega antes dela. O que falta é tudo **texto e domínio**, e é o tipo
de pendência que um fork carrega sem perceber porque a tela parece pronta.

**A política de privacidade em [`apps/web`](../apps/web) é um modelo**, e diz isso no próprio corpo. Um
fork que sobe com ela fica em posição pior do que se não tivesse banner nenhum: o banner afirma ao visitante
que existe uma política, e a política não descreve o tratamento real. Quem responde por isso é o fork, não o
boilerplate.

**A declaração de cookies é parte desse texto.** Recontado no código em 2026-09-16 — a lista anterior dizia
"sete" e omitia três nomes. São **sete gravados pelo próprio repositório**, mais dois do Google:

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

---

## ⚠️ Fortemente recomendados

Não impedem o deploy. Cada um é uma conta que chega depois.

### 8. `ARCJET_KEY`

- [ ] Definida em produção

Sem ela o `@repo/security` degrada para **no-op** e a API avisa uma vez, no boot. Isso inclui o pedido de
redefinição de senha e o reenvio de verificação: sem limite, os dois viram **gerador gratuito de e-mail em
nome do fork** — e a fatura do provedor é do fork.

### 9. Branch protection na `main`

- [ ] Exigir o check do CI antes do merge

O CI **sinaliza e não bloqueia**: uma PR vermelha pode ser mergeada hoje (`gh api …/branches/main/protection`
→ **404**, rulesets → `[]`). Ligar exigindo o check `verify` fecha isto.

✅ **O pré-requisito que segurava este item caiu.** Entre 2026-09-14 e 2026-09-15 este documento tratava o
`testTimeout` ausente como bloqueante — o gate tinha falhado de verdade, `app#test` estourando o teto de 5 s
do Vitest em `apps/app/__tests__/accountSecurityForm.test.tsx`, com taxa de falha observada de 1 em 2. A PR
**#13** declarou `testTimeout: 20_000` nas **9** configs que existiam então.

Remedido em **2026-09-16**, neste workspace, e **remedido de novo depois do merge da PR #17** — os números
abaixo são da terceira medição:

| medição | comando | resultado |
|---------|---------|-----------|
| configs com `testTimeout` | `grep -rl testTimeout --include=vitest.config.* .` | **10 de 10** (`apps/api:11`, `apps/app:13`, `apps/web:11`, `packages/analytics:6`, `packages/auth:10`, `packages/email:15`, `packages/internationalization:10`, `packages/payments:10`, `packages/security:10`, `packages/shared:10`) |
| gate completo, sem cache | `pnpm turbo run lint typecheck test --force` | ✅ **24/24 tasks**, 0 em cache, **31,9 s** |
| lint/format | `pnpm check` | **555 arquivos**, 0 correções |
| suíte | 10 tasks de teste | **1091 testes em 112 arquivos** |

Dois destes números mudam a cada entrega. A PR #16 tinha acrescentado o workspace `@repo/analytics` à suíte
e movido os quatro de uma vez; a PR #17 acrescentou 53 testes em 5 arquivos (paginação: repositório, query,
rota, hook e tabela) e 12 arquivos ao alcance do `pnpm check`. **Remedir antes de citar** — a contagem de
tasks e a de configs são as únicas que ficaram estáveis.

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
`/health/ready`. Isso cria a trilha; não cria quem a vigia. Os quatro passos abaixo são de console de
provedor e nenhum deles é código.

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

---

## 🧹 Higiene

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
são os que o usuário final sente.

Referências: [`SETUP.md`](SETUP.md) (variáveis, uma a uma) · [`SECURITY.md`](SECURITY.md) (postura e
comandos) · [`ARCHITECTURE.md`](ARCHITECTURE.md).
