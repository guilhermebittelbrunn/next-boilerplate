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

---

## ⚠️ Fortemente recomendados

Não impedem o deploy. Cada um é uma conta que chega depois.

### 7. `ARCJET_KEY`

- [ ] Definida em produção

Sem ela o `@repo/security` degrada para **no-op** e a API avisa uma vez, no boot. Isso inclui o pedido de
redefinição de senha e o reenvio de verificação: sem limite, os dois viram **gerador gratuito de e-mail em
nome do fork** — e a fatura do provedor é do fork.

### 8. Branch protection na `main`

- [ ] Exigir o check do CI antes do merge

O CI **sinaliza e não bloqueia**: uma PR vermelha pode ser mergeada hoje (`gh api …/branches/main/protection`
→ **404**, rulesets → `[]`). Ligar exigindo o check `verify` fecha isto.

⚠️ Antes de ligar, declare um `testTimeout` explícito nas configs do Vitest. Nenhuma das 9 declara, e
`apps/app/__tests__/securityPolicySources.test.ts` roda **216 ms isolado × até 2203 ms sob contenção**
contra o default de 5 s. Gate obrigatório + teste que falha sozinho = merge bloqueado ao acaso, e o runner
do GitHub é mais lento que uma máquina local.

### 9. CSP bloqueante na `apps/web`

- [ ] Trocar `Report-Only` por enforcing

Na `apps/app` e na `apps/api` a CSP já é bloqueante; na landing é `Report-Only` (`apps/web/proxy.ts`). Foi
decisão deliberada para observar antes de bloquear — e a política rodou com **zero violações reportadas**,
então virar a chave é barato.

---

## 🧹 Higiene

- [ ] **Contas de QA acumuladas** no projeto Firebase de desenvolvimento (`next-boilerplate-576d0`):
      `qa-admin@`, `qa-common@`, `qa-review-common@`, `qa-ci-admin@`, `qa-review-ci@`, `qa-common-ci@`,
      `qa-api-hardening@`, `review-api-hardening@` e as descartáveis da recuperação de senha — todas
      `example.com`, sem PII real e sem senha em arquivo. Limpar em Authentication **e** o doc `user` no
      Firestore. Nenhuma existe no projeto de produção; a limpeza é para o ambiente de dev não virar lixão.
- [ ] **Branches mergeadas ainda vivas no remoto** — as PRs são mergeadas por squash e as branches ficam.

---

## Passo manual que não é pendência, é rotina

Quem for a produção pela primeira vez deve conferir, na ordem: **service account** → **build passa** →
**`CORS_ORIGIN`** → **deploy da API** → **publicar as rules** → **domínio de e-mail** → **ciclo real de
recuperação de senha** → **storage, se o fork usa upload**. Os quatro últimos são os que ninguém lembra, e
são os que o usuário final sente.

Referências: [`SETUP.md`](SETUP.md) (variáveis, uma a uma) · [`SECURITY.md`](SECURITY.md) (postura e
comandos) · [`ARCHITECTURE.md`](ARCHITECTURE.md).
