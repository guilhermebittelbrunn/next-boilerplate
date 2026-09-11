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

- [ ] `firestore.rules` publicado no projeto

**Estado hoje: a base está aberta.** O arquivo [`firestore.rules`](../firestore.rules) está escrito em
`deny-all`, mas **nunca foi publicado** — e arquivo não publicado não protege nada. Qualquer pessoa com a
chave pública do projeto (que, por definição, viaja no bundle do front) lê e grava a base inteira.

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

---

## ⚠️ Fortemente recomendados

Não impedem o deploy. Cada um é uma conta que chega depois.

### 6. `ARCJET_KEY`

- [ ] Definida em produção

Sem ela o `@repo/security` degrada para **no-op** e a API avisa uma vez, no boot. Isso inclui o pedido de
redefinição de senha e o reenvio de verificação: sem limite, os dois viram **gerador gratuito de e-mail em
nome do fork** — e a fatura do provedor é do fork.

### 7. Branch protection na `main`

- [ ] Exigir o check do CI antes do merge

O CI **sinaliza e não bloqueia**: uma PR vermelha pode ser mergeada hoje (`gh api …/branches/main/protection`
→ **404**, rulesets → `[]`). Ligar exigindo o check `verify` fecha isto.

⚠️ Antes de ligar, declare um `testTimeout` explícito nas configs do Vitest. Nenhuma das 9 declara, e
`apps/app/__tests__/securityPolicySources.test.ts` roda **216 ms isolado × até 2203 ms sob contenção**
contra o default de 5 s. Gate obrigatório + teste que falha sozinho = merge bloqueado ao acaso, e o runner
do GitHub é mais lento que uma máquina local.

### 8. CSP bloqueante na `apps/web`

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
recuperação de senha**. Os três últimos são os que ninguém lembra, e são os que o usuário final sente.

Referências: [`SETUP.md`](SETUP.md) (variáveis, uma a uma) · [`SECURITY.md`](SECURITY.md) (postura e
comandos) · [`ARCHITECTURE.md`](ARCHITECTURE.md).
