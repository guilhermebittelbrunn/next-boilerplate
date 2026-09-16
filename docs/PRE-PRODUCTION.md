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

✅ **O pré-requisito que segurava este item caiu.** Entre 2026-09-14 e 2026-09-15 este documento tratava o
`testTimeout` ausente como bloqueante — o gate tinha falhado de verdade, `app#test` estourando o teto de 5 s
do Vitest em `apps/app/__tests__/accountSecurityForm.test.tsx`, com taxa de falha observada de 1 em 2. A PR
**#13** declarou `testTimeout: 20_000` nas **9** configs.

Remedido em **2026-09-16**, neste workspace:

| medição | comando | resultado |
|---------|---------|-----------|
| configs com `testTimeout` | `grep -rl testTimeout --include=vitest.config.* .` | **9 de 9** (`apps/api:11`, `apps/app:13`, `apps/web:11`, `packages/auth:10`, `packages/email:15`, `packages/internationalization:10`, `packages/payments:10`, `packages/security:10`, `packages/shared:10`) |
| gate completo, sem cache | `pnpm turbo run lint typecheck test --force` | ✅ **23/23 tasks**, 0 em cache, **50,7 s** |
| lint/format | `pnpm check` | **517 arquivos**, 0 correções |

O teste que estourava roda hoje em **1273 ms** dentro do arquivo de 3322 ms — folga de mais de 15× contra o
teto novo. Nada impede mais tornar o check `verify` obrigatório na `main`.

O que **continua** valendo do diagnóstico antigo: o teto do Vitest é medido sob contenção do turbo, e o
runner do GitHub é mais lento que uma máquina local. Um teste de componente que espere por interação e
passe a encostar em 20 s é sinal de problema no teste, não motivo para subir o teto de novo.

### 9. CSP bloqueante na `apps/web`

- [ ] Trocar `Report-Only` por enforcing

Na `apps/app` e na `apps/api` a CSP já é bloqueante; na landing é `Report-Only` (`apps/web/proxy.ts`). Foi
decisão deliberada para observar antes de bloquear — e a política rodou com **zero violações reportadas**,
então virar a chave é barato.

### 10. Fechar o circuito de observabilidade

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
      exato precisa ser lido no painel do provedor: nenhuma fonte com data foi consultada para ele aqui.
- [ ] **Decidir o destino do cron órfão.** `apps/api/vercel.json:4-9` agenda `/cron/keep-alive`, rota que
      não existe e que responde 404 todo dia à 01:00. Ou criar a rota, ou apontar o cron para `/health`
      (que agora é dinâmico e serve de keep-alive), ou remover a entrada.

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
