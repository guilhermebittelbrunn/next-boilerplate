# Análise e blueprint: modelos de conformidade (registro de operações, incidente, subprocessadores e backup)

- **Spec de origem:** `specs/compliance-docs-kit.md` (status `approved`, atualizada em 2026-09-30). Continua
  em `specs/` até a entrega; quem arquiva é o `/spec --sync`.
- **Nota de pesquisa:** `specs/research/compliance-trust-baseline.md` (coletada em 2026-08-21, adendo de
  2026-09-26, `revalidate_after: 2027-08-21`).
- **Rodada:** autônoma, dentro de um `/cycle`. Cada decisão que pediria pergunta foi tomada pela escada
  spec → padrão do repo → menor raio de impacto e está no fim, com a alternativa descartada.
- **Branch:** nenhuma criada. Quem nomeia e cria é o `revisor-codigo`, no `/review`.

## Medições que ajustam a spec

Reli as âncoras da spec no disco e conferi as fontes que a nota deixou pendentes. Cinco pontos mudam o
trabalho:

1. **Os campos do modelo da ANPD estão confirmados no próprio PDF.** A nota diz que o portal bloqueou a
   leitura em 2026-09-26 e pede ao `/analyze` que abra o modelo antes de copiar a estrutura. Em 2026-09-30 o
   `WebFetch` da URL da nota devolveu só a página de metadados, mas o download direto
   (`…/modelo_de_ropa_para_atpp.pdf/@@download/file`, HTTP 200, 2 páginas) abriu com `pdftotext`. O modelo
   tem oito blocos: **Informações de contato** (Organização, CNPJ, Endereço, Principal atividade, Gestor
   responsável, E-mail, Telefone, Data do registro), **Categorias de titulares** (titulares em geral,
   crianças e adolescentes, idosos), **Dados pessoais** (nome, endereço, RG, e-mail, CPF, telefone, outros),
   **Compartilhamento**, **Medidas de segurança**, **Período de armazenamento**, **Processo, finalidade e
   hipótese legal** e **Observações**. A página de instruções diz que se marcam só os tipos de dado, nunca
   os valores; que a hipótese legal segue os arts. 7º e 11 da LGPD; e que Observações recebe encarregado,
   operadores e transferência internacional. O modelo é **um registro por processo**, e é assim que o
   documento novo se organiza.
2. **No plano Spark não existe backup de nenhum tipo, nem por export.** A spec fala do backup agendado.
   Conferi as outras duas saídas do Firestore em 2026-09-30: o export/import gerenciado ("Only Google Cloud
   projects with billing enabled can use the export and import functionality",
   `docs.cloud.google.com/firestore/docs/manage-data/export-import`) e o PITR ("you must have billing
   enabled if you want to use PITR", janela de 7 dias, `docs.cloud.google.com/firestore/native/docs/pitr`).
   As três exigem faturamento. O `docs/FORKING.md:167` diz que "o plano gratuito (Spark) basta, a menos que
   o produto use upload de arquivo", e isso fica incompleto: basta para rodar, não para ter backup. A frase
   ganha uma ressalva curta (§10.6).
3. **A restauração cai num banco que a API não lê.** Backup agendado restaura sempre para um banco novo
   (nota, adendo; confirmado em `firebase.google.com/docs/firestore/backups` em 2026-09-30). A API abre só o
   banco `(default)`: `getFirestore(getFirebaseAdminApp())` em `packages/auth/server.ts:100`, sem id de banco.
   O procedimento de restauração precisa dizer como os dados voltam ao `(default)`, e o caminho que não
   exige código é exportar do banco restaurado e importar no `(default)`. O import "overwrites the existing
   document" com o mesmo id e não apaga o que foi criado depois (mesma página do export, 2026-09-30).
4. **Restaurar ressuscita contas excluídas.** A exclusão de conta é imediata e "não há de onde restaurar"
   (`docs/PRE-PRODUCTION.md:724`). Um backup anterior à exclusão traz o perfil de volta. A trilha preserva o
   id do alvo em `account.delete` e `user.delete` (`packages/sdk/src/types/audit/audit.ts:5`, `:10`,
   `:30`), então dá para listar quem foi excluído depois da data do backup. O procedimento manda fazer isso
   **antes** de trocar os dados, e o core não tem ferramenta que reaplique a exclusão (fica como lacuna
   declarada, não como código).
5. **Duas âncoras da spec derivaram, sem mudar o conteúdo.** "Incidente" aparece em
   `docs/PRE-PRODUCTION.md:52` e `:669` (a spec diz `:658`), e o comando de TTL está em `:531` (a spec diz
   `:532`). Não edito a spec; o `/spec --sync` ajusta ao arquivar.

Fora do que a spec pediu, a nota tem uma afirmação vencida: o bloqueador de "client SDK não autenticado"
(`specs/research/compliance-trust-baseline.md:25-27`) não vale mais, porque a API usa o Admin SDK
(`packages/auth/server.ts:96-101`, e o cabeçalho de `firestore.rules`). O adendo novo da nota registra isso
(§10.5).

## Etapa 1 — Análise

### 1. Contexto

#### Objetivo em uma frase

Um fork encontra, a partir do `docs/PRE-PRODUCTION.md`, quatro modelos em português já preenchidos com o
que o core faz: registro de operações, runbook de incidente, lista de subprocessadores com nota de
transferência internacional e procedimento de backup e restauração do Firestore. Cada lacuna que só o fork
pode preencher está marcada.

#### Corte desta rodada (o da spec, sem acréscimo)

| Item do corte | Onde fica |
|---|---|
| Registro de operações nos campos do modelo da ANPD | `docs/ROPA.md` |
| Runbook de incidente | `docs/INCIDENT-RESPONSE.md` |
| Lista de subprocessadores | `docs/SUBPROCESSORS.md` |
| Nota de transferência internacional | seção de `docs/SUBPROCESSORS.md` |
| Backup e restauração do Firestore | `docs/BACKUP.md` |
| `docs/PRE-PRODUCTION.md` aponta para os documentos | item 14 novo + uma linha no item 7 + uma linha na rotina final |

A spec conta "os quatro documentos" nos sinais de pronto e lista cinco itens no corte. A nota de
transferência vai dentro da lista de subprocessadores porque o mecanismo de transferência é um atributo de
cada provedor: a tabela já tem uma linha por provedor, e um quinto arquivo repetiria a mesma lista.

#### Fora do escopo (da spec)

- `/.well-known/security.txt` e política de divulgação de vulnerabilidade.
- Texto real das páginas de privacidade e termos.
- DPA do fork com os clientes dele.
- Automação de backup por script ou job agendado. O documento de backup mostra comandos de CLI para rodar à
  mão; nenhum arquivo executável entra no repo.

Também fica fora, por decisão desta análise: mudar código para a API ler um banco com id diferente de
`(default)`, e qualquer ferramenta de reaplicar exclusão depois de uma restauração. As duas viram achado.

### 1.2 Apps impactados, painel e modo de produto

| Área | Impacto |
|---|---|
| `packages/sdk`, `apps/api`, `apps/app`, `apps/web`, `packages/*` | Nenhum. |
| `docs/` | 4 arquivos novos, `PRE-PRODUCTION.md` e `FORKING.md` editados. |
| `specs/research/compliance-trust-baseline.md` | Adendo de 2026-09-30 com as fontes novas. |
| Painel comum × admin | N/A. O runbook cita telas de admin como fonte de evidência, sem mudá-las. |
| Modo `subscription` × `simple` | N/A. O tratamento de dados é o mesmo nos dois modos. |
| Assinatura/plano | N/A. A Stripe entra só como subprocessador opcional. |
| Env nova | Nenhuma. |

### 1.3 Fontes

Lidas: a spec, a nota inteira (inclusive o adendo), `.claude/cycle-policy.md`, este guia, o `PRE-PRODUCTION.md`
nas seções 1.3, 6, 7, 8, 11, 12, 13 e Higiene, o `FORKING.md` §4 e §7, e o código de cada integração (§2).

Coletado nesta análise, em 2026-09-30:

| Fonte | O que confirmou |
|---|---|
| PDF do modelo da ANPD (download direto) | Os oito blocos e as instruções de preenchimento (medição 1). |
| `docs.cloud.google.com/firestore/docs/manage-data/export-import` | Export/import exige faturamento; import sobrescreve documento de mesmo id; papéis `Cloud Datastore Import Export Admin` e `Storage Admin`; bucket perto do banco. |
| `docs.cloud.google.com/firestore/native/docs/pitr` | PITR exige faturamento, guarda 7 dias, vem desligado; recuperação por leitura com timestamp passado ou export numa data para banco novo. |
| `firebase.google.com/docs/firestore/backups` | Blaze; até dois agendamentos por banco (diário e semanal); retenção de até 14 semanas; restauração em banco novo; comandos `firebase firestore:backups:*` e `firestore:databases:restore`; papel `roles/datastore.backupsAdmin`. |
| `docs.arcjet.com/privacy` | Arcjet trata IP e cabeçalhos da requisição; guarda 30 dias; processa em várias regiões sem garantir a mesma região; a página não cita DPA, lista de subprocessadores nem mecanismo de transferência. |
| `arcjet.com/dpa` | 404 de novo. |
| `business.safety.google/adsprocessorterms/` | Os termos de processamento do Google Ads citam SCCs; a lista de serviços cobertos fica em outra URL (`business.safety.google/adsservices/`), que não foi lida. |
| Status HTTP das URLs de DPA e lista de subprocessadores da nota | Firebase, Stripe, Resend e Vercel responderam 200. |

Precisa de coleta nova no `/develop`, com `WebFetch` e data registrada. Sem confirmação em fonte, a célula
fica "não confirmado" ou "a preencher pelo fork", nunca com um valor presumido:

| Lacuna | Onde procurar |
|---|---|
| Mecanismo de transferência declarado no DPA de Firebase/Google Cloud, Stripe, Resend e Vercel (SCCs, DPF, outro) | as URLs de DPA da nota |
| Se o Google Analytics está coberto pelos termos de processamento do Google Ads e como o fork os aceita | `business.safety.google/adsservices/` e a ajuda do Google Analytics |
| Se o Vercel Web Analytics entra no DPA da Vercel | `vercel.com/legal/dpa` |
| Qual DPA cobre Authentication, Firestore e Storage (os termos do Firebase ou os do Google Cloud) | `firebase.google.com/terms/data-processing-terms` |
| Região padrão das funções da Vercel | documentação da Vercel |
| Sintaxe e alcance de `firebase auth:export` (as contas do Auth não estão no backup do Firestore) e se funciona no Spark | `firebase.google.com/docs/cli/auth` (o `WebFetch` desta análise devolveu só o menu) |
| Conteúdo mínimo da comunicação de incidente à ANPD (opcional; o runbook pode apontar o formulário sem listar campos) | `dspace.mj.gov.br/bitstream/1/12879/2/RES_ANPD_2024_15.html` (200 em 2026-09-30) |

### 2. Inventário de integrações, verificado no código

É a base da lista de subprocessadores. Critério para entrar: o código chama o provedor e dado de usuário
final sai para ele. Pacote instalado e não usado não conta.

| # | Provedor / serviço | Obrigatório? | O que liga | Dado de usuário que sai | Evidência |
|---|---|---|---|---|---|
| 1 | Google — Firebase Authentication (inclui Identity Toolkit e login com Google) | sim | projeto Firebase (`NEXT_PUBLIC_FIREBASE_*`, service account `FIREBASE_ADMIN_*`) | e-mail, senha (o Firebase guarda o hash), nome, uid, foto e token da conta Google no login social, IP do navegador | `packages/auth/client.ts:81` (`initializeApp`), `:152-153` (`GoogleAuthProvider` + `signInWithPopup`); `packages/auth/server.ts:92`, `:229` (cookie de sessão), `:323-329` (revogação); `apps/api/(shared)/lib/firebase-identity-toolkit.ts:4` (REST `identitytoolkit.googleapis.com`) |
| 1a | Google — avatar da conta Google | sim, quando o usuário entra com Google | login com Google | IP do navegador ao carregar a imagem | `apps/app/proxy.ts:19` (`lh3.googleusercontent.com` no CSP), `apps/app/next.config.ts:19-23` |
| 2 | Google — Cloud Firestore | sim | service account | perfil (`user`: telefone, avatar, preferências, onboarding, `lastAccessAt`, `stripeCustomerId`, assinatura), `entity`, `auditEvent`, `paymentEvent`, `paidInvoice`, `subscriptionActivation`, `planLabel` | `packages/auth/server.ts:96-101`; coleções em `apps/api/(shared)/repositories/*.repository.ts` (`user.repository.ts:42`, `audit-event.repository.ts:76`, `entity.repository.ts:13`, `payment-event.repository.ts:22`, `paid-invoice.repository.ts:33`, `subscription-activation.repository.ts:24`, `plan-label.repository.ts:27`); campos em `packages/sdk/src/types/user/user.ts:44-66` e `packages/sdk/src/types/audit/audit.ts:19-42` |
| 3 | Google — Cloud Storage for Firebase | não | `FIREBASE_STORAGE_BUCKET` (api) / `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (app) | arquivos enviados (avatar, foto de `entity`) | `apps/api/(shared)/lib/storage.ts:35-37` (`isStorageConfigured`), `:44`; `packages/auth/server.ts:108-114`; `apps/app/proxy.ts:35`, `:66` |
| 4 | Stripe | não | `STRIPE_SECRET_KEY` **e** `STRIPE_WEBHOOK_SECRET` | e-mail e id do cliente, dados de cobrança digitados no Checkout hospedado, assinatura, faturas | `packages/payments/index.ts:14-24` (`getStripe`), `:33-36` (`isPaymentsConfigured`); chamadas em `apps/api/app/(routes)/payments/checkout/route.ts:21`, `payments/portal/route.ts:15`, `payments/plans/route.ts:13`, `webhooks/payments/route.ts:199`, `users/[id]/route.ts:53`, `apps/api/(shared)/lib/account-erasure.ts:85` |
| 5 | Resend | não | `RESEND_TOKEN` **e** `RESEND_FROM` | e-mail do destinatário e corpo dos e-mails de verificação, redefinição de senha e troca de e-mail; nome, e-mail e mensagem do formulário de contato | `packages/email/index.ts:75-78` (`isEmailEnabled`), `:89-100` (`sendEmail`); chamadas em `apps/api/app/(routes)/auth/password/reset-request/route.ts:38`, `auth/email-verification/send/route.ts:62`, `account/email/route.ts:147`, `:157`; `apps/web/app/[locale]/contact/actions/contact.tsx:16-22` |
| 6 | Vercel — hospedagem e logs de função | condicional: só se o fork publica na Vercel | deploy na Vercel (`VERCEL_*` em `packages/next-config/keys.ts:13-19`) | toda requisição (IP, cabeçalhos, caminho) e o log estruturado, que não carrega IP nem corpo | `apps/app/vercel.json`, `apps/web/vercel.json`, `apps/api/vercel.json`; log em `packages/shared/utils/helpers/log.ts:51-57`; bloqueio sem endereço em `apps/api/proxy.ts:64-76` |
| 7 | Vercel — Web Analytics | condicional: deploy na Vercel **e** consentimento de analytics | `VERCEL_ENV` presente e cookie de consentimento com analytics | eventos de navegação | `packages/analytics/consent.ts:103-107` (`resolveConsentable`), `packages/analytics/provider.tsx:103`, `:109` |
| 8 | Google Analytics 4 | não | `NEXT_PUBLIC_GA_MEASUREMENT_ID` com prefixo `G-` **e** consentimento | eventos de navegação, identificadores do GA | `packages/analytics/keys.ts:7-13`, `packages/analytics/provider.tsx:110-111`; Consent Mode com sinais de anúncio negados em `:28-32` |
| 9 | Arcjet | não | `ARCJET_KEY` com prefixo `ajkey_` | IP e cabeçalhos da requisição | `packages/security/keys.ts:9-15`; `packages/security/index.ts:32`, `:42` (`checkRateLimit`), `:84` (`secure`); chamadas em `apps/api/proxy.ts:147`, `apps/app/proxy.ts:138`, `apps/web/proxy.ts:68` |

O que **não** entra na lista, com o motivo:

| Candidato | Por que fica fora | Evidência |
|---|---|---|
| Firebase Analytics | O `measurementId` vai para o `firebaseConfig`, mas ninguém chama `getAnalytics`; o SDK de analytics do Firebase nunca carrega. | `packages/auth/client.ts:72`; `grep "getAnalytics\|firebase/analytics"` sem resultado em `apps/` e `packages/` |
| `@stripe/agent-toolkit` | Declarado e com fábrica em `packages/payments/ai.ts:9-32`, sem nenhum consumidor fora dos testes. Mesmo que ganhe um, o provedor seria a própria Stripe. | `grep "payments/ai"` fora de `__tests__` sem resultado |
| Sentry, Better Stack, Axiom, PostHog, Upstash e afins | Nenhuma integração. Sentry, Better Stack e Axiom aparecem só como sugestão em `docs/PRE-PRODUCTION.md` §11. | `grep -rniE "posthog\|sentry\|betterstack\|logtail\|upstash\|redis"` em código: só um arquivo de eval de skill |
| GitHub (Actions) | Recebe código, não dado de usuário final. | `.github/workflows/ci.yml` |
| Fontes | `geist` vem como pacote npm, servido pelo próprio app. Não há `next/font/google`. | `packages/design-system/package.json`; `grep "next/font/google"` sem resultado |

A lista final tem **9 linhas de provedor em 5 empresas** (Google, Stripe, Resend, Vercel, Arcjet): 2 sempre
presentes (Auth e Firestore), 2 condicionais ao deploy na Vercel e 5 ligadas por env.

### 2.1 Operações de tratamento do core (para o registro de operações)

A spec lista seis operações. O código mostra mais três que tratam dado pessoal, e a lista precisa bater com
o código pelo mesmo critério da lista de subprocessadores:

| # | Processo | Dados | Evidência |
|---|---|---|---|
| 1 | Cadastro e autenticação | e-mail, senha (hash no Firebase), nome, telefone, avatar, preferências, onboarding | `apps/api/app/(routes)/auth/sign-up/route.ts`, `packages/sdk/src/types/user/user.ts:44-66` |
| 2 | Sessão e registro de acesso | cookie de sessão (5 dias padrão, teto absoluto de 30), `lastAccessAt`, IP nos logs da plataforma | `packages/auth/session.ts:23-29`, `user.ts:55-59`, `docs/PRE-PRODUCTION.md` §11 |
| 3 | Cobrança de assinatura (opcional) | `stripeCustomerId`, estado da assinatura, faturas pagas, eventos de pagamento | `user.ts:62-65`, repositórios `paid-invoice`, `payment-event`, `subscription-activation` |
| 4 | E-mail transacional (opcional) | endereço e conteúdo dos e-mails de conta | §2, linha 5 |
| 5 | Formulário de contato da landing | nome, e-mail, mensagem livre | `apps/web/app/[locale]/contact/actions/contact.tsx:7-22` |
| 6 | Medição de audiência com consentimento (opcional) | eventos de navegação, cookie de consentimento (180 dias) | `packages/analytics/consent.ts:10`, `provider.tsx:103-111` |
| 7 | Trilha de auditoria | ids e rótulo (e-mail ou nome) de quem agiu e de quem foi alvo, nomes de campo alterado, `requestId` | `packages/sdk/src/types/audit/audit.ts:1-42` |
| 8 | Proteção contra abuso (opcional) | IP e cabeçalhos enviados à Arcjet | §2, linha 9 |
| 9 | Arquivos enviados (opcional) | arquivos sob `uploads/<profileId>/` | `apps/api/(shared)/lib/storage.ts`, `docs/PRE-PRODUCTION.md` §6 |

O atendimento ao titular (exportar e excluir conta) entra como medida e prazo dentro das operações 1 e 7, e
não como processo próprio: ele trata os mesmos dados. O recurso `entity` é exemplo do boilerplate e aparece
só como lacuna ("dados do domínio do fork").

### 3. Dados (Firestore), contrato do SDK, API, front, i18n

N/A. Nenhuma coleção, campo, DTO, rota, tela ou chave de tradução muda. Os documentos são internos
(`docs/`) e seguem o padrão do repo: português, sem versão nos três idiomas.

### 6. Autorização e segurança

- Os documentos não guardam segredo. Onde o runbook cita rotação de credencial, ele nomeia a variável
  (`FIREBASE_ADMIN_PRIVATE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_TOKEN`, `ARCJET_KEY`),
  nunca um valor.
- O registro de incidente contém dado real de pessoas. O runbook traz o **formato** do registro e diz para
  guardá-lo fora do repositório. Um fork que o versionasse espalharia dado pessoal pelo histórico do git.
- O runbook não afirma o que o código não faz. Três limites que ele declara, com fonte:
  - `revokeRefreshTokens` não invalida ID token já emitido, que vale até expirar (nota, seção de sessão).
    O cookie de sessão é checado com `checkRevoked: true`, então revogar ou desativar corta o cookie
    (`packages/auth/server.ts:283-300`).
  - Não há rota de admin para revogar a sessão de outro usuário. O titular revoga a própria sessão em
    `POST /account/sessions/revoke` (`apps/api/app/(routes)/account/sessions/revoke/route.ts:7-8`), e o
    admin desativa a conta em `PUT /users/:id` com `disabled`
    (`apps/api/app/(routes)/users/[id]/route.ts:87`, `:112-118`).
  - Os Data Access logs do Firestore vêm desligados, e o bucket `_Default` do GCP retém 30 dias (nota,
    seção de retenção de log).

### 7. Testes

N/A para Vitest: não há código. Um teste que lesse `docs/SUBPROCESSORS.md` e o comparasse com as
dependências seria possível (há precedente na lista de cookies da política de privacidade), mas faria um
diff só de documentação disparar suíte e acoplaria um workspace a um arquivo de `docs/`. Descartado; a
coerência com o código é conferida pelo `/test` com os comandos do §8.

### 8. O que o `/test` vai ter de percorrer

Sem browser: o diff não tem superfície de runtime (`.claude/cycle-policy.md` §3.1). O `/test` lê os quatro
documentos e roda estes comandos a partir da raiz do workspace:

```bash
# 1. Links relativos: todo alvo local citado nos quatro documentos existe
for f in docs/ROPA.md docs/INCIDENT-RESPONSE.md docs/SUBPROCESSORS.md docs/BACKUP.md; do
  grep -oE '\]\(([^)#]+)' "$f" | sed 's/](//' | grep -vE '^https?://' | while read -r p; do
    [ -e "$(dirname "$f")/$p" ] || echo "QUEBRADO em $f: $p"
  done
done

# 2. Links externos: status de cada URL (200 ou 3xx para 200 esperado; gov.br pode exigir o download direto)
grep -ohE 'https?://[^) >`]+' docs/ROPA.md docs/INCIDENT-RESPONSE.md docs/SUBPROCESSORS.md docs/BACKUP.md \
  | sort -u | while read -r u; do
    printf '%s %s\n' "$(curl -s -o /dev/null -L -A 'Mozilla/5.0' -w '%{http_code}' --max-time 20 "$u")" "$u"
  done

# 3. Cada provedor da lista tem integração no código, e nenhum pacote de provedor ficou de fora
grep -rlE 'from "(stripe|resend|@arcjet/next|@vercel/analytics/react|@next/third-parties/google|firebase-admin/[a-z]+|firebase/(app|auth))"' \
  --include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude-dir=__tests__ packages apps

# 4. Âncoras arquivo:linha citadas nos documentos apontam para a linha certa (amostragem: todas as da SUBPROCESSORS.md)
grep -oE '`[a-zA-Z0-9_./()\[\]-]+\.(ts|tsx|json):[0-9]+' docs/SUBPROCESSORS.md | tr -d '`' | sort -u

# 5. Nenhum segredo nem e-mail real
grep -nE '(sk_|whsec_|re_|ajkey_)[A-Za-z0-9]{6,}|-----BEGIN|@[a-z0-9-]+\.(com|com\.br|io)' \
  docs/ROPA.md docs/INCIDENT-RESPONSE.md docs/SUBPROCESSORS.md docs/BACKUP.md
```

O item 5 aceita e-mail de exemplo com domínio reservado (`example.com`) e os domínios dos provedores em URL.
Qualquer outro acerto é defeito.

Não verificável sem infra externa, e por isso 🔒 em vez de reprovado: se os comandos de backup e
restauração rodam de fato (exige projeto no Blaze), e se o texto atende à lei (a spec já diz que o `/test`
confere conteúdo e coerência, não conformidade).

### 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **O fork chega aos quatro documentos a partir do checklist de produção**
  O `docs/PRE-PRODUCTION.md` tem um item 14 que linka `ROPA.md`, `INCIDENT-RESPONSE.md`, `SUBPROCESSORS.md`
  e `BACKUP.md`, cada um com um checkbox do que o fork precisa fazer. O item 7 (texto legal) ganha um
  checkbox que manda listar os subprocessadores na política de privacidade a partir de `SUBPROCESSORS.md`, e
  a seção de rotina final cita o teste de restauração. Os quatro links resolvem (comando 1 do §8).

- [ ] **Cada documento avisa no topo que é modelo, não parecer jurídico, e diz quando foi coletado**
  As primeiras linhas de cada um dos quatro arquivos trazem o aviso uma vez só, a data de coleta das fontes e
  o link para `specs/research/compliance-trust-baseline.md` com o `revalidate_after` dela. O aviso não se
  repete parágrafo a parágrafo. Documento sem data ou sem link para a nota reprova.

- [ ] **A lista de subprocessadores bate com o código, sem provedor a mais nem a menos**
  `SUBPROCESSORS.md` tem exatamente as 9 linhas de provedor do §2 deste plano, em 5 empresas, e cada linha
  cita o `arquivo:linha` onde a integração acontece. Cada linha marca se é obrigatória, condicional ao
  deploy na Vercel ou opcional, e nomeia a variável que a liga. O comando 3 do §8 não pode revelar pacote de
  provedor sem linha correspondente. Firebase Analytics, `@stripe/agent-toolkit`, Sentry/Better Stack/Axiom,
  GitHub e fontes aparecem na seção "O que não entra", com o motivo.

- [ ] **Cada subprocessador tem DPA, lista de subprocessadores do provedor, região e mecanismo, ou a lacuna escrita**
  As URLs de DPA e lista de subprocessadores de Google/Firebase, Stripe, Resend e Vercel estão na tabela e
  respondem 200 (comando 2). O DPA da Arcjet aparece como "não encontrado" com a data da busca, sem link
  inventado. Região vem do provedor quando ele informa; o Firestore diz que a região é escolhida pelo fork na
  criação do banco e não muda depois (`docs/FORKING.md` §4, passo 5). Célula sem fonte diz "não confirmado"
  ou "a preencher pelo fork".

- [ ] **A nota de transferência internacional não afirma adequação que a pesquisa não confirmou**
  A seção de transferência cita LGPD arts. 33 e 35 e, para cada provedor fora do Brasil, o mecanismo que o
  DPA declara, com a data da leitura. Ela diz que as SCCs de um DPA são mecanismo do GDPR e que a presença
  das cláusulas-padrão da ANPD (Res. CD/ANPD 19/2024) no DPA não foi confirmada. A Res. 32/2026 (adequação
  da União Europeia) aparece como existente com texto integral não confirmado, e o documento não conclui
  que ela cobre provedor dos Estados Unidos.

- [ ] **O registro de operações segue os blocos do modelo da ANPD**
  `ROPA.md` tem um bloco de informações de contato com os oito campos do modelo em branco, e um registro por
  processo com os sete blocos restantes (categorias de titulares, dados pessoais, compartilhamento, medidas
  de segurança, período de armazenamento, processo/finalidade/hipótese legal, observações). Os dados
  pessoais aparecem como tipos, nunca como valores. O documento cita a URL do modelo oficial.

- [ ] **O registro de operações cobre as nove operações que o código faz**
  Estão lá cadastro e autenticação, sessão e registro de acesso, cobrança, e-mail transacional, formulário de
  contato, analytics com consentimento, trilha de auditoria, proteção contra abuso e arquivos enviados, cada
  uma com o `arquivo` de onde vem o dado. As opcionais dizem qual variável as liga. Os dados do domínio do
  fork (o que substitui `entity`) aparecem como lacuna marcada.

- [ ] **Hipótese legal e prazo de guarda são sugestão marcada, com lacuna onde o código não decide**
  Cada hipótese legal sugerida cita o inciso do art. 7º e vem marcada como a confirmar pelo fork. Prazos que
  o código fixa aparecem com o número e a fonte (cookie de consentimento 180 dias, sessão 5 dias com teto de
  30, Arcjet 30 dias). Prazos que o código não fixa aparecem como lacuna: a retenção de `auditEvent` aponta
  para `PRE-PRODUCTION.md` §1.3, e o registro de acesso aponta para os 6 meses do Marco Civil art. 15 e para
  a §11. Nenhum prazo inventado.

- [ ] **O runbook responde em quantos dias úteis comunicar a ANPD, sem pesquisa**
  `INCIDENT-RESPONSE.md` tem uma tabela de prazos: ANPD em 3 dias úteis (6 para pequeno porte, Res. 15/2024
  art. 6º e §8º), complementação em 20 dias úteis, titular em 3 dias úteis (em dobro para pequeno porte, art.
  9º §6º), GDPR 72 horas à autoridade (art. 33(1)) e titular "without undue delay" só quando "likely to
  result in a high risk" (art. 34(1)). Cada linha tem a fonte ao lado. O leitor acha o número de dias sem
  sair do documento.

- [ ] **O runbook diz quem decide e como avaliar se o incidente é comunicável**
  Há uma seção de papéis com lacunas nomeadas (quem decide, canal do titular via
  `NEXT_PUBLIC_PRIVACY_CONTACT`, contato técnico). A avaliação segue o gatilho cumulativo do art. 5º da Res.
  15/2024 (dano relevante e ao menos um critério específico, como dado financeiro, de autenticação ou em
  larga escala) e o limiar do GDPR, incluindo a dispensa do art. 34(3)(a) para dado ininteligível.

- [ ] **O runbook exige registro de todo incidente por 5 anos, fora do repositório**
  O documento cita o art. 10 da Res. 15/2024 (registro inclusive dos não comunicados, por no mínimo 5 anos),
  traz os campos do registro e manda guardá-lo fora do git, porque ele carrega dado real de pessoas.

- [ ] **O runbook aponta onde buscar evidência no repositório, sem prometer o que o código não faz**
  Aponta a trilha em `/admin/audit` (rota `GET /audit-events`, só admin), o log estruturado por escopo com
  `requestId`/`x-request-id`, o bloqueio da Arcjet no log sem IP, a revogação de sessão do titular e a
  desativação de conta pelo admin. Declara que não existe rota de admin para revogar a sessão de outro
  usuário, que ID token já emitido vale até 1 hora, e que os Data Access logs do Firestore vêm desligados.
  Cada ponto com `arquivo:linha` que o comando 4 confirma.

- [ ] **O procedimento de backup diz o que fazer no Spark**
  `BACKUP.md` diz na primeira seção que no Spark não há backup agendado, PITR nem export gerenciado, com a
  fonte de cada um, e que a decisão do fork é migrar para o Blaze antes de ter dado de cliente ou registrar
  por escrito que opera sem backup (no bloco de medidas de segurança do `ROPA.md`). O documento não sugere
  script próprio de cópia.

- [ ] **O procedimento de backup cobre ligar, restaurar e testar, com os limites do código**
  Mostra os comandos de agendamento e restauração com a data da coleta, diz que a restauração vai para banco
  novo e que a API só lê `(default)` (`packages/auth/server.ts:100`), e dá o caminho de volta ao `(default)`
  por export/import, avisando que o import sobrescreve e não apaga documento criado depois. Diz o que o
  backup não cobre (contas do Firebase Auth, objetos do Storage, dados na Stripe, variáveis de ambiente).
  Trata a restauração como rotina, com passos de teste num banco descartável e o registro do resultado.

- [ ] **Restaurar não ressuscita em silêncio conta excluída**
  `BACKUP.md` manda listar, antes de trocar os dados, os eventos `account.delete` e `user.delete` posteriores
  à data do backup (a trilha guarda o id do alvo) e reaplicar essas exclusões depois. Declara que o core não
  tem ferramenta para reaplicar.

- [ ] **Nenhum segredo, e-mail real ou dado pessoal nos arquivos novos**
  O comando 5 do §8 não acha chave, bloco de chave privada nem e-mail fora de `example.com` e de URL de
  provedor. Vale também para o `docs/PRE-PRODUCTION.md` editado e para o adendo da nota.

- [ ] **Nada fora de `docs/` e do adendo da nota mudou**
  `git status` mostra só os quatro arquivos novos, `docs/PRE-PRODUCTION.md`, `docs/FORKING.md`,
  `specs/research/compliance-trust-baseline.md` e os artefatos em `docs/features/compliance-docs-kit/`,
  além das mudanças da auditoria do backlog que já estavam no working tree antes desta feature. A spec em
  `specs/compliance-docs-kit.md` não foi editada nesta feature.

## Etapa 2 — Blueprint técnico

A feature é só documentação, então o "slice" é a estrutura de cada arquivo e a origem de cada dado. Os
esqueletos abaixo fixam seções e colunas; o texto final é escrito no `/develop` e passa pela `humanizer`.

### 10.1 Onde ficam os arquivos

```
docs/
  ROPA.md                  novo — registro de operações de tratamento
  INCIDENT-RESPONSE.md     novo — runbook de incidente de segurança
  SUBPROCESSORS.md         novo — subprocessadores + transferência internacional
  BACKUP.md                novo — backup e restauração do Firestore
  PRE-PRODUCTION.md        editado — item 14, linha no item 7, linha na rotina
  FORKING.md               editado — ressalva de backup no §4, passo 1
specs/research/
  compliance-trust-baseline.md   editado — adendo de 2026-09-30
```

Padrão seguido: `docs/` é plano, com nome em inglês e maiúsculas (`SECURITY.md`, `PAYMENTS.md`,
`PRE-PRODUCTION.md`) e conteúdo em português. A única subpasta de `docs/` com conteúdo é `features/`, que é
histórico do pipeline, não referência.

Cabeçalho comum aos quatro (texto final no `/develop`):

```markdown
# <Título em português>

> **Modelo, não parecer jurídico.** Este documento vem pronto com o que o boilerplate faz e marca com
> `[FORK]` o que só o produto pode preencher. Revise com quem responde juridicamente pelo produto antes de
> usar como registro oficial.
>
> Fontes coletadas em <data>; base na nota
> [`compliance-trust-baseline`](../specs/research/compliance-trust-baseline.md), a revalidar depois de
> 2027-08-21. Prazo legal e lista de provedor mudam; confira antes de confiar num número daqui.
```

Marcador de lacuna: `[FORK]` seguido do que falta (`[FORK] CNPJ`). Um só formato nos quatro arquivos, para o
fork achar tudo com `grep -n "\[FORK\]" docs/*.md`.

### 10.2 `docs/SUBPROCESSORS.md`

```markdown
# Subprocessadores e transferência internacional

<cabeçalho comum>

## Como ler esta lista
- Obrigatório: todo deploy do boilerplate usa.
- Condicional: só se o fork publica na Vercel.
- Opcional: só entra se a variável estiver preenchida. Sem ela, o dado não sai para o provedor.
Um fork que não liga uma integração opcional tira a linha da política de privacidade dele.

## Lista
| Provedor | Serviço | Finalidade | Dado tratado | Obrigatoriedade (variável) | Região | DPA | Subprocessadores do provedor | Onde no código |
|---|---|---|---|---|---|---|---|---|
| Google | Firebase Authentication | ... | ... | obrigatório | [FORK]/não informado | <url> | <url> | `packages/auth/client.ts:81` ... |
| Google | Cloud Firestore | ... | ... | obrigatório | escolhida na criação do banco, não muda | ... | ... | `packages/auth/server.ts:100` |
| Google | Cloud Storage for Firebase | ... | ... | opcional (`FIREBASE_STORAGE_BUCKET`) | ... | ... | ... | `apps/api/(shared)/lib/storage.ts:35` |
| Stripe | Checkout, Billing, webhooks | ... | ... | opcional (`STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`) | ... | stripe.com/legal/dpa | stripe.com/legal/service-providers | `packages/payments/index.ts:33` |
| Resend | e-mail transacional | ... | ... | opcional (`RESEND_TOKEN` + `RESEND_FROM`) | ... | resend.com/legal/dpa | resend.com/legal/subprocessors | `packages/email/index.ts:75` |
| Vercel | hospedagem e logs | ... | ... | condicional (deploy na Vercel) | ... | vercel.com/legal/dpa | vercel.com/legal/sub-processors | `apps/*/vercel.json` |
| Vercel | Web Analytics | ... | ... | condicional (Vercel + consentimento) | ... | ... | ... | `packages/analytics/provider.tsx:109` |
| Google | Google Analytics 4 | ... | ... | opcional (`NEXT_PUBLIC_GA_MEASUREMENT_ID` + consentimento) | ... | ... | business.safety.google/adssubprocessors/ | `packages/analytics/provider.tsx:110` |
| Arcjet | limite de requisições e bloqueio de bot | ... | IP e cabeçalhos | opcional (`ARCJET_KEY`) | várias regiões, sem garantia (docs.arcjet.com/privacy) | não encontrado (arcjet.com/dpa, 404 em 2026-09-30) | não informado | `packages/security/index.ts:42` |

(Dado tratado e evidência completos no §2 deste plano. O login com Google e o avatar entram na linha do
Authentication.)

## O que não entra, e por quê
<a tabela "não entra" do §2>

## Ao adicionar uma integração
1. Uma linha nova aqui, com a variável que a liga.
2. Um registro novo ou atualizado em `ROPA.md` (bloco Compartilhamento).
3. A política de privacidade do fork (`PRE-PRODUCTION.md` §7).
Comando para conferir a lista contra o código: <comando 3 do §8 do plano>.

## Transferência internacional
- Base: LGPD arts. 33 e 35; GDPR capítulo V. Links da nota.
- Tabela: provedor | país declarado | mecanismo declarado no DPA (data da leitura) | observação.
- O que não está confirmado (da nota): conteúdo da retificação de 18/08/2025 da Res. 19/2024; texto
  integral da Res. 32/2026. SCCs de DPA são mecanismo do GDPR; se o DPA traz as cláusulas-padrão da ANPD
  fica "não confirmado" até alguém ler.
- `[FORK]` registrar no bloco Observações do `ROPA.md` cada transferência que o fork liga.
```

### 10.3 `docs/ROPA.md`

```markdown
# Registro das operações de tratamento de dados pessoais

<cabeçalho comum>

## Por que existe e como preencher
- LGPD art. 37 (controlador e operador). Res. CD/ANPD 2/2022 art. 9º: pequeno porte cumpre de forma
  simplificada, sem isenção. Quem trata dado de alto risco (art. 4º) sai do regime de pequeno porte (art. 3º).
- GDPR art. 30: a isenção de quem tem menos de 250 pessoas cai quando o tratamento não é ocasional.
- Os blocos seguem o modelo oficial da ANPD para ATPP (<url do PDF>), confirmado em 2026-09-30. Um registro
  por processo. Marque tipos de dado, nunca valores.

## Informações de contato
Organização: [FORK] · CNPJ: [FORK] · Endereço: [FORK] · Principal atividade: [FORK] ·
Gestor responsável: [FORK] · E-mail: [FORK] · Telefone: [FORK] · Data do registro: [FORK]

## Registros
### 1. Cadastro e autenticação
| Bloco | Conteúdo |
|---|---|
| Categorias de titulares | titulares em geral · [FORK] marcar crianças/adolescentes/idosos se o produto atende |
| Dados pessoais | nome, e-mail, telefone; outros: senha (hash guardado pelo Firebase), foto de perfil, preferências de tema e idioma |
| Compartilhamento | Google (Firebase Authentication, Cloud Firestore) — ver SUBPROCESSORS.md |
| Medidas de segurança | rules do Firestore em negação total, acesso só pela API com service account, política de senha, cookie de sessão httpOnly, limite de requisições (se `ARCJET_KEY`) |
| Período de armazenamento | até a exclusão da conta, que é imediata (PRE-PRODUCTION.md, "até onde a exclusão alcança") · [FORK] |
| Processo, finalidade e hipótese legal | Processo: cadastro de usuários. Finalidade: dar acesso ao produto. Hipótese sugerida: execução de contrato (art. 7º, V) — [FORK] confirmar |
| Observações | onde está no código: <arquivos do §2.1> · encarregado/canal: `NEXT_PUBLIC_PRIVACY_CONTACT` |
### 2. Sessão e registro de acesso
... (mesmo formato para as 9 operações do §2.1)
### 10. [FORK] Dados do domínio do produto
(bloco em branco; o recurso `entity` do boilerplate é exemplo e sai quando o fork o substitui)
```

Origem de cada prazo que aparece no documento:

| Prazo | Valor | Fonte |
|---|---|---|
| Cookie de consentimento | 180 dias | `packages/analytics/consent.ts:10` |
| Sessão | 5 dias padrão, até 14; teto absoluto 30 dias padrão, até 90 | `packages/auth/session.ts:23-29` |
| Retenção na Arcjet | 30 dias | `docs.arcjet.com/privacy`, 2026-09-30 |
| `auditEvent` | não decidido | `docs/PRE-PRODUCTION.md` §1.3 |
| `paymentEvent` | TTL opcional em `expiresAt` | `docs/PRE-PRODUCTION.md:529-533` |
| `paidInvoice`, `subscriptionActivation` | sobrevivem à exclusão, só ids da Stripe, valor, moeda e datas | `docs/PRE-PRODUCTION.md`, tabela da exclusão |
| Registro de acesso (IP e data/hora) | 6 meses, se PJ com fins econômicos | Marco Civil art. 15; `PRE-PRODUCTION.md` §11 |

As hipóteses legais sugeridas: execução de contrato (art. 7º, V) para cadastro, sessão, cobrança e e-mail de
conta; consentimento (art. 7º, I) para analytics; legítimo interesse (art. 7º, IX) para trilha de auditoria
e proteção contra abuso, com o lembrete do próprio art. 37 de que o registro é mais exigido nesse caso;
obrigação legal (art. 7º, II) para o registro de acesso do Marco Civil. Todas marcadas `[FORK] confirmar`.

### 10.4 `docs/INCIDENT-RESPONSE.md`

```markdown
# Resposta a incidente de segurança com dados pessoais

<cabeçalho comum>

## Papéis
| Papel | Quem |
|---|---|
| Decide se comunica e quando | [FORK] |
| Canal do titular / encarregado | `NEXT_PUBLIC_PRIVACY_CONTACT` (vazio: formulário de /contact) · [FORK] |
| Contato técnico de plantão | [FORK] |

## Prazos
| Para quem | Prazo | Pequeno porte | Fonte |
|---|---|---|---|
| ANPD | 3 dias úteis do conhecimento de que dados pessoais foram afetados | 6 dias úteis | Res. CD/ANPD 15/2024, art. 6º e §8º |
| ANPD, complementação | 20 dias úteis | [verificar dobra no /develop] | art. 6º |
| Titular | 3 dias úteis, linguagem simples, individual | em dobro | art. 9º, §6º |
| Autoridade da UE | 72 horas | — | GDPR art. 33(1) |
| Titular na UE | "without undue delay", só se "likely to result in a high risk" | — | GDPR art. 34(1) |
| Registro interno | todo incidente, inclusive o não comunicado, por no mínimo 5 anos | — | Res. 15/2024, art. 10 |

## 1. Conter
| Ação | Como, neste repo |
|---|---|
| Cortar a sessão de um titular | titular: `POST /account/sessions/revoke`; admin: desativar em `PUT /users/:id` (`disabled`). ID token já emitido vale até 1 hora. |
| Rodar credencial vazada | trocar a variável no provedor e na Vercel, novo deploy: `FIREBASE_ADMIN_PRIVATE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_TOKEN`, `ARCJET_KEY` |
| Base exposta por rules | republicar `firestore.rules`; nunca afrouxar rule como rollback (PRE-PRODUCTION.md §1) |

## 2. Levantar evidência
| Fonte | O que tem | Limite |
|---|---|---|
| `/admin/audit` (`GET /audit-events`, só admin) | ações sensíveis com ator, alvo, campos alterados e `requestId` | retenção não decidida (§1.3) |
| Log estruturado (`[escopo] evento chave=valor`) | escopos `account`, `audit`, `auth`, `email`, `payments`, `request`, `security`, `storage`; `requestId` = cabeçalho `x-request-id` | sem IP, sem corpo; retenção é a da plataforma (§11) |
| Bloqueios da Arcjet | `[security] blocked` com motivo, caminho, método | sem endereço de origem |
| Painéis dos provedores | eventos da Stripe, envios da Resend, painel da Arcjet (30 dias) | [FORK] quem tem acesso |
| Data Access logs do Firestore | quem leu o quê | vêm desligados; ligar antes, não depois |

## 3. Avaliar se é comunicável
- LGPD/ANPD: gatilho cumulativo do art. 5º (afetar significativamente direitos fundamentais **e** ao menos
  um de: sensível, criança/adolescente/idoso, financeiro, autenticação, sigilo, larga escala).
- GDPR: art. 33 salvo improvável gerar risco; art. 34 só alto risco; 34(3)(a) dispensa se ininteligível.
- Checklist curto de perguntas, sem decidir pelo fork.

## 4. Comunicar
- ANPD: formulário eletrônico (página CIS da ANPD).
- Titular: individual; se inviável, divulgação pública por no mínimo 3 meses (art. 9º).

## 5. Registrar
Campos do registro: data do conhecimento, descrição, categorias de dados e de titulares, quantidade
estimada, avaliação de risco (e por que comunicou ou não), datas de comunicação, medidas tomadas. Guardado
fora do repositório.

## 6. Depois
Restaurar se preciso (BACKUP.md), revisar a lista de subprocessadores e o registro de operações.
```

Âncoras que o runbook cita (o `/develop` confere cada uma antes de gravar):

| Afirmação | Âncora |
|---|---|
| revogar a própria sessão | `apps/api/app/(routes)/account/sessions/revoke/route.ts:7-8` |
| revogação no Admin SDK | `packages/auth/server.ts:323-329` |
| cookie checado com revogação | `packages/auth/server.ts:283-300` |
| desativar conta | `apps/api/app/(routes)/users/[id]/route.ts:87`, `:112-118` |
| trilha só para admin | `apps/api/app/(routes)/audit-events/route.ts:10` |
| ações registradas | `packages/sdk/src/types/audit/audit.ts:2-11` |
| escopos do log | `packages/shared/utils/helpers/log.ts:5-14` |
| formato do log | `packages/shared/utils/helpers/log.ts:51-57` |
| nome do cabeçalho | `packages/shared/utils/helpers/request-id.ts:6` |
| bloqueio sem IP | `apps/api/proxy.ts:64-76` |
| canal do titular | `apps/web/shared/lib/privacyContact.ts:10-19` |

Na linha "ANPD, complementação", o `/develop` confere na Res. 15/2024 se o §8º dobra também os 20 dias
úteis. Sem confirmação, a célula diz "não confirmado".

### 10.5 `docs/BACKUP.md`

```markdown
# Backup e restauração do Firestore

<cabeçalho comum>

## No plano Spark não há backup
| Recurso | Plano | Guarda | Restaura onde | Fonte (2026-09-30) |
|---|---|---|---|---|
| Backup agendado | Blaze | diário ou semanal, até 14 semanas, até 2 agendamentos por banco | banco novo | firebase.google.com/docs/firestore/backups |
| PITR | faturamento ativo, desligado por padrão | 7 dias, granularidade de minuto | leitura no passado ou export para banco novo | docs.cloud.google.com/firestore/native/docs/pitr |
| Export/import gerenciado | faturamento ativo | enquanto o bucket guardar | qualquer banco; import sobrescreve id igual | docs.cloud.google.com/firestore/docs/manage-data/export-import |
Decisão do fork: [FORK] migrar para o Blaze antes do primeiro cliente, ou registrar em ROPA.md
(medidas de segurança) que opera sem backup. A exportação de conta do titular não é backup.

## O que o backup do Firestore não cobre
- Contas do Firebase Authentication — `firebase auth:export` [sintaxe e plano a confirmar no /develop]
- Objetos do Cloud Storage
- Dados na Stripe (a Stripe é a fonte da verdade da cobrança)
- Variáveis de ambiente e service account

## Ligar (Blaze)
comandos `firebase firestore:backups:schedules:create` (diário e semanal), `firebase firestore:backups:list`;
papel `roles/datastore.backupsAdmin`; custo: armazenamento de cada backup e tamanho restaurado, sem número.

## Restaurar
1. Antes de tudo: listar em `/admin/audit` os eventos `account.delete` e `user.delete` posteriores à data do
   backup e guardar os ids fora do repositório.
2. `firebase firestore:databases:restore --backup <backup> --database <banco-novo>`.
3. A API lê só `(default)` (`packages/auth/server.ts:100`). Para trazer os dados de volta:
   `gcloud firestore export gs://<bucket> --database=<banco-novo>` e
   `gcloud firestore import gs://<bucket>/<prefixo>/ --database='(default)'`. O import sobrescreve documento
   de mesmo id e não apaga documento criado depois do backup.
4. Reaplicar as exclusões do passo 1. O core não tem ferramenta para isso: [FORK].
5. Apagar o banco novo quando terminar.

## Testar a restauração (rotina)
Frequência: [FORK] (anote no ROPA). Restaurar o último backup num banco descartável, contar documentos de
`user` e `auditEvent` contra o `(default)`, anotar data, backup usado, duração e divergência, apagar o banco.
```

O `/develop` confere a sintaxe exata dos comandos na página do Firebase antes de gravar. Qualquer flag que a
página não mostrar sai do documento.

Adendo da nota (`specs/research/compliance-trust-baseline.md`, seção nova "Adendo de 2026-09-30"): os oito
blocos do modelo da ANPD lidos do PDF; export/import e PITR exigem faturamento; restauração só em banco novo
e a API só lê `(default)`; o que a página de privacidade da Arcjet diz; o link dos termos de processamento do
Google Ads; o que o `/develop` coletar da lista de lacunas do §1.3; e a correção do bloqueador vencido das
linhas 25-27 (a API usa o Admin SDK desde `firestore-admin-access`). O `revalidate_after` fica como está.

### 10.6 Pseudo-diffs dos arquivos existentes

`docs/PRE-PRODUCTION.md`, item 7 (depois do checkbox de `NEXT_PUBLIC_PRIVACY_CONTACT`, perto da linha 386):

```diff
 - [ ] `NEXT_PUBLIC_PRIVACY_CONTACT` com o endereço do fork (vazio: o canal cai no formulário de `/contact`)
+- [ ] Listar na política de privacidade os subprocessadores que o fork liga, a partir de [`SUBPROCESSORS.md`](SUBPROCESSORS.md)
 - [ ] `SESSION_COOKIE_DOMAIN` definida em produção, **se** `web` e `app` rodam em subdomínios distintos
```

`docs/PRE-PRODUCTION.md`, item 14 novo, no fim de "⚠️ Fortemente recomendados" (depois do item 13, antes
do `---` que abre "🧹 Higiene"):

```diff
+### 14. Documentos de conformidade
+
+- [ ] Registro de operações completo nas lacunas `[FORK]`: [`ROPA.md`](ROPA.md)
+- [ ] Papéis do runbook preenchidos e o runbook lido por quem decide: [`INCIDENT-RESPONSE.md`](INCIDENT-RESPONSE.md)
+- [ ] Lista de subprocessadores cortada para as integrações que o fork liga, e o DPA de cada uma aceito no painel do provedor: [`SUBPROCESSORS.md`](SUBPROCESSORS.md)
+- [ ] Backup decidido (Blaze com agendamento, ou operação sem backup registrada) e uma restauração testada: [`BACKUP.md`](BACKUP.md)
+
+<2 ou 3 frases: são obrigação legal de quem opera o fork, não recurso de produto; nada disso é cobrado por
+teste; o boilerplate entrega o modelo e o fork responde pelo preenchimento. `grep -n "\[FORK\]" docs/*.md`
+lista o que falta.>
```

`docs/PRE-PRODUCTION.md`, "Passo manual que não é pendência, é rotina" (linha 881-884): uma frase no fim do
parágrafo, dizendo que a restauração do backup é testada na frequência que o fork anotou em
[`BACKUP.md`](BACKUP.md), porque backup nunca restaurado não conta como backup.

`docs/FORKING.md:166-167`, §4 passo 1:

```diff
 1. **Crie o projeto** no [Firebase Console](https://console.firebase.google.com). O plano gratuito
-   (Spark) basta, a menos que o produto use upload de arquivo (item 7 abaixo).
+   (Spark) basta para rodar, a menos que o produto use upload de arquivo (item 7 abaixo). Ele não tem
+   backup do Firestore de nenhum tipo: [`BACKUP.md`](BACKUP.md).
```

Nenhuma outra linha desses arquivos muda. O `README.md` fica como está: o caminho `FORKING.md` checklist,
passo 9 → `PRE-PRODUCTION.md` → item 14 já leva aos quatro documentos.

### 10.7 Ordem de implementação e commits

Ordem de escrita: `SUBPROCESSORS.md` primeiro (o inventário alimenta o bloco Compartilhamento do registro),
depois `ROPA.md`, `INCIDENT-RESPONSE.md`, `BACKUP.md`, os ponteiros e por último o adendo da nota.

Plano de commits previsto (quem aplica é o `/review`):

1. `docs: add subprocessor list and international transfer note` — `docs/SUBPROCESSORS.md`
2. `docs: add record of processing activities template` — `docs/ROPA.md`
3. `docs: add security incident response runbook` — `docs/INCIDENT-RESPONSE.md`
4. `docs: add Firestore backup and restore procedure` — `docs/BACKUP.md`
5. `docs: point fork checklists to the compliance documents` — `docs/PRE-PRODUCTION.md`, `docs/FORKING.md`
6. `docs(specs): amend compliance research note with 2026-09-30 sources` — a nota
7. `docs(features): compliance-docs-kit` — `docs/features/compliance-docs-kit/`

As mudanças da auditoria do backlog que já estão no working tree (`specs/*`, o `git mv` de
`account-email-change`) não pertencem a nenhum destes commits. O `git diff --cached --stat` precisa sair
vazio antes do primeiro.

### 10.8 Env nova

Nenhuma.

## 11. Pré-requisitos manuais de infra

São do fork, não do core, e não reprovam a entrega no `/test`. Todos entram no item 14 novo do
`PRE-PRODUCTION.md`:

| Pré-requisito | Por quê fica fora do código |
|---|---|
| Migrar o projeto Firebase para o Blaze, se o fork quiser backup | cartão e custo são decisão do fork (`cycle-policy` §1: não provisionar infra) |
| Criar os agendamentos de backup e testar uma restauração | exige Blaze e console/CLI autenticada |
| Aceitar o DPA de cada provedor no painel dele (Firebase/Google Cloud, Google Analytics, Stripe, Resend, Vercel) | aceite contratual da conta do fork |
| Preencher os `[FORK]` dos quatro documentos | dados da empresa e decisões jurídicas |
| Ligar os Data Access logs do Firestore, se o fork quiser essa evidência num incidente | configuração de projeto GCP com custo |
| Ajustar a retenção do log de acesso para 6 meses, se o fork se enquadra no Marco Civil art. 15 | já está na `PRE-PRODUCTION.md` §11; o runbook só aponta |

## 12. Modo degradado

N/A. Não há feature opt-in em código. Os documentos dizem quais linhas desaparecem quando uma variável não
está preenchida.

## 13. Pós-entrega

- Nenhuma env, índice, rule ou webhook.
- Rollback: reverter os commits de documentação. Nada fica órfão.
- Um fork ajusta: as lacunas `[FORK]`, as linhas de provedor que não usa, a política de privacidade.
- Manutenção: quem adicionar integração nova atualiza `SUBPROCESSORS.md` e `ROPA.md` no mesmo PR. O
  `/review` pode cobrar isso lendo o diff; hoje o `docs/review-checklist.md` não cobra. Fica como achado.

## Decisões tomadas sem perguntar

| # | Decisão | Alternativa descartada | Por quê |
|---|---|---|---|
| D1 | Documentos só em português, com trechos do GDPR citados em inglês | três idiomas | recomendação da spec; `docs/` é interno e todo o repo escreve assim |
| D2 | Sem `security.txt` | entrar no corte | recomendação da spec; está em "Fora do corte" |
| D3 | Quatro arquivos planos em `docs/` com nome em inglês e maiúsculas (`ROPA.md`, `INCIDENT-RESPONSE.md`, `SUBPROCESSORS.md`, `BACKUP.md`) | subpasta `docs/compliance/` ou um `docs/COMPLIANCE.md` único | padrão do repo (`SECURITY.md`, `PAYMENTS.md`); a única subpasta de `docs/` é histórico do pipeline; um arquivo único misturaria documento que o jurídico lê com runbook de plantão |
| D4 | Nota de transferência como seção de `SUBPROCESSORS.md` | quinto arquivo | a spec conta quatro documentos; o mecanismo é atributo de cada provedor e a tabela já existe |
| D5 | Nove operações no registro, não seis | só as seis da spec | o código trata dado pessoal em formulário de contato, proteção contra abuso e upload; a regra "bate com o código" da spec vale para os dois documentos |
| D6 | Vercel entra como condicional ao deploy, em duas linhas (hospedagem e Web Analytics) | obrigatória, ou uma linha só | nada no código obriga a Vercel (`vercel.json` só tem `ignoreCommand`); o Web Analytics tem gatilho e consentimento próprios (`consent.ts:103-107`) |
| D7 | Firebase Analytics e `@stripe/agent-toolkit` fora da lista | listar por estarem nas dependências | a spec pede "nenhuma a mais"; nenhum dos dois é chamado (§2) |
| D8 | Hipótese legal como sugestão marcada `[FORK] confirmar` | deixar em branco, ou afirmar | em branco o modelo perde valor; afirmar seria parecer jurídico, que a spec proíbe |
| D9 | Registro de incidente com formato no runbook e guarda fora do repositório | modelo de registro versionado em `docs/` | o registro carrega dado real de pessoa; `docs/` vai para todo fork e para o histórico do git |
| D10 | Restauração volta ao `(default)` por export/import, sem mudar código | ensinar a apontar a API para o banco restaurado | exigiria mudar `packages/auth/server.ts:100`, fora do corte (só docs) |
| D11 | Sem teste automatizado que compare a lista com as dependências | teste Vitest lendo `docs/SUBPROCESSORS.md` | acopla workspace a `docs/` e faz diff de documentação disparar suíte; a spec já diz que a prova é leitura |
| D12 | Tocar `FORKING.md` numa frase e não tocar `README.md` | só `PRE-PRODUCTION.md`, ou também uma linha no README | a frase do `FORKING.md` sobre o Spark ficou incompleta e é barata de corrigir (`cycle-policy` §4); o README já chega aos documentos pelo `FORKING.md` |
| D13 | Fontes novas desta rodada no adendo da nota, com data | citar só dentro dos documentos | a spec manda cada documento apontar para a nota com `revalidate_after`; fonte fora da nota não seria revalidada |
| D14 | Marcador único `[FORK]` para lacunas | texto livre "a preencher" | um formato só permite `grep` nos quatro arquivos, e o item 14 usa esse comando |

## Perguntas em aberto

Nenhuma bloqueia o `/develop`. As duas abaixo têm recomendação adotada e ficam para o relatório do ciclo.

1. **Os documentos devem dizer ao fork para migrar ao Blaze antes do primeiro cliente, ou só expor as duas
   opções?** Opções: (a) recomendar o Blaze; (b) apresentar as duas saídas sem preferência. **Adotada:**
   (b), com a consequência de cada uma escrita. Custo e cartão são decisão do fork, e a política do ciclo
   não adota serviço pago sem passar por você. Se preferir (a), é uma frase em `BACKUP.md`.
2. **A `review-checklist.md` deve cobrar a atualização de `SUBPROCESSORS.md` e `ROPA.md` quando um diff traz
   integração nova?** Opções: (a) acrescentar uma linha ao checklist agora; (b) deixar como achado.
   **Adotada:** (b). Mexer no checklist de revisão está fora do corte, e sem essa linha a lista envelhece no
   primeiro provedor novo. Recomendo abrir como item de backlog.

## Achados fora do escopo

- A API só abre o banco `(default)` (`packages/auth/server.ts:100`). Restaurar direto num banco nomeado e
  apontar a API para ele exigiria um id de banco configurável.
- Não existe ferramenta que reaplique exclusões de conta depois de uma restauração. Hoje é trabalho manual
  a partir da trilha.
- Não existe rota de admin para revogar a sessão de outro usuário. A saída é desativar a conta.
- `docs/review-checklist.md` não cobra atualização da lista de subprocessadores (pergunta 2).
- A nota de pesquisa afirma nas linhas 25-27 um bloqueador que já foi resolvido. O adendo corrige.

## Referências não lidas

- `business.safety.google/adsservices/` (lista de serviços cobertos pelos termos de processamento do Google
  Ads): fica para o `/develop`.
- `firebase.google.com/docs/cli/auth`: o `WebFetch` devolveu só o menu; fica para o `/develop`.
- O texto integral da Res. CD/ANPD 32/2026 e a retificação da Res. 19/2024 seguem não confirmados, como na
  nota.
