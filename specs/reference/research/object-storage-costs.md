---
topic: object-storage-costs
question: Quanto custa servir arquivos pelo Cloud Storage num MVP, e sair para S3 ou R2 sairia mais barato?
lens: dx
panel: [google-cloud-storage, firebase-storage, amazon-s3, cloudflare-r2]
collected: 2026-09-14
revalidate_after: 2026-12-14
confidence: alta
---

# Custo de object storage: Cloud Storage × S3 × R2

> ⚠️ **Preço envelhece.** Todo número aqui foi lido nas páginas oficiais em **2026-09-14** e vale para
> `us-east1` / `us-east-1`. Antes de decidir com base nesta nota depois de **2026-12-14**, reconfira os
> quatro links da seção [Fontes](#fontes). O que **não** envelhece na mesma velocidade é a conclusão
> estrutural: a ordem de grandeza entre as opções vem do **egress**, e isso é arquitetura de preço, não
> tabela.

## Resposta curta

**Não, S3 não sai mais barato.** No cenário de MVP modelado abaixo o custo é **$0,00/mês no Cloud Storage,
$0,10/mês no S3 e $0,00/mês no R2** — os três são irrelevantes, e trocar de provedor por causa de dez
centavos seria uma migração que não paga. S3 é a **pior** das três opções: é a única que custa dinheiro no
cenário de MVP e a única cujo free tier **expira** (o modelo novo da AWS fecha a conta em 6 meses).

O que mudou e é a informação de verdade desta nota: **o Cloud Storage para Firebase deixou de existir no
plano Spark.** Desde **2026-02-03** um projeto no Spark recebe **402/403 em qualquer chamada ao bucket** —
usar storage exige o plano **Blaze**, que exige uma **conta de faturamento com forma de pagamento**. O gasto
continua zero (a faixa "Always Free" do GCS cobre o cenário inteiro), mas **o cartão passou a ser
obrigatório**. Essa é a premissa do boilerplate que foi atingida — "começar de graça" continua verdade para
o dinheiro, e deixou de ser verdade para o **atrito de cadastro**.

A opção genuinamente mais barata **em escala** é o **Cloudflare R2**, e por um único motivo: **egress zero**.
Não é diferença de centavos; é duas ordens de grandeza a partir de ~10× o cenário de MVP.

## O gate que importa mais que o preço

| Provedor | Dá para começar sem cartão? | Free tier é permanente? |
|----------|-----------------------------|-------------------------|
| **Cloud Storage / Firebase** | ❌ **Não.** Exige Blaze → conta de faturamento com forma de pagamento | ✅ Sim — "Always Free" do GCS, sem prazo, em `us-central1`/`us-east1`/`us-west1` |
| **Amazon S3** | ❌ Não. Conta AWS exige forma de pagamento | ❌ **Não.** Contas criadas após **2025-07-15** não têm mais a franquia mensal fixa: recebem até **$200 em créditos** e a conta do plano Free **encerra em 6 meses** ou quando os créditos acabam |
| **Cloudflare R2** | ⚠️ Provavelmente sim — a doc diz "free to get started" e que **nenhum plano pago é exigido**; **não confirmado** se exige cartão no arquivo | ✅ Sim — 10 GB-mês, 1M Class A, 10M Class B, egress ilimitado |

A citação que sustenta a linha do Firebase, do FAQ oficial da mudança:

> "If your Firebase project is on the Spark pricing plan, you won't have access to any Cloud Storage
> buckets (including default buckets), and your API calls to buckets will return 402 or 403 errors."

> "To provision a new default bucket using the Firebase console or REST API, your project must be on the
> pay-as-you-go Blaze pricing plan."

⚠️ **Contradição registrada nas fontes oficiais.** A página `firebase.google.com/pricing` **ainda exibe**
uma coluna Spark com quotas para buckets `*.firebasestorage.app` (5 GB-mês, 100 GB/mês de download, 5K
uploads, 50K downloads). O FAQ dedicado à mudança diz o oposto, e de forma inequívoca. Adotei o **FAQ
específico** sobre a **tabela genérica** (fonte específica vence a geral), e o teste operativo é barato: se
o Spark realmente servisse, o bucket responderia; se não, responde 402/403. **Confirme no seu projeto antes
de confiar na tabela de preços.**

## Cenário modelado — e as premissas

Premissas declaradas, para poderem ser contestadas:

- **5.000 usuários**, 1 imagem de **500 KB** cada → **2,5 GB armazenados**
- **50.000 visualizações/mês** → **25 GB de egress** e **50.000 operações de leitura** (Class B / GET)
- **5.000 uploads/mês** → **5.000 operações de escrita** (Class A / PUT)
- Região `us-east1` / `us-east-1`; storage classe Standard
- **Sem CDN na frente** (pior caso: cada visualização é um download do bucket). A URL assinada de 15 min
  do repo, com `cacheControl: private, no-store`, é de fato o pior caso — nenhuma camada cacheia.
- Conta AWS **fora** da janela de créditos (o estado permanente, não o promocional)

### Custo mensal no cenário de MVP

| Item | Cloud Storage (Blaze) | Amazon S3 | Cloudflare R2 |
|------|----------------------|-----------|---------------|
| 2,5 GB armazenados | $0,00 *(free: 5 GB)* | 2,5 × $0,023 = **$0,058** | $0,00 *(free: 10 GB)* |
| 5.000 escritas | $0,00 *(free: 5.000)* | 5.000 × $0,005/1k = **$0,025** | $0,00 *(free: 1M)* |
| 50.000 leituras | $0,00 *(free: 50.000)* | 50.000 × $0,0004/1k = **$0,020** | $0,00 *(free: 10M)* |
| 25 GB de egress | $0,00 *(free: 100 GB NA)* | $0,00 *(free: 100 GB)* | **$0,00 sempre** |
| **Total** | **$0,00** | **≈ $0,10** | **$0,00** |

**Os três são gratuitos ou irrelevantes.** Dizendo com todas as letras: **custo não é critério de decisão
neste cenário.** Quem escolher provedor por essa tabela está otimizando dez centavos.

⚠️ **O Cloud Storage fica exatamente encostado no teto de operações** (5.000 de 5.000 e 50.000 de 50.000).
Não há folga: qualquer crescimento passa a ser cobrado imediatamente — ainda que em centavos.

### Onde a escolha passa a importar: 10× e 100×

**10×** (50.000 usuários · 25 GB · 250 GB egress · 50.000 escritas · 500.000 leituras):

| | Cloud Storage | S3 | R2 |
|--|--------------|-----|-----|
| armazenamento | (25−5) × $0,020 = $0,40 | 25 × $0,023 = $0,58 | (25−10) × $0,015 = $0,23 |
| operações | $0,23 + $0,18 = $0,41 | $0,25 + $0,20 = $0,45 | $0,00 |
| **egress** | (250−100) × $0,12 = **$18,00** | (250−100) × $0,09 = **$13,50** | **$0,00** |
| **Total** | **≈ $18,81** | **≈ $14,53** | **≈ $0,23** |

**100×** (250 GB armazenados · 2,5 TB egress):

| | Cloud Storage | S3 | R2 |
|--|--------------|-----|-----|
| **Total** | **≈ $293** | **≈ $222** | **≈ $3,60** |

**A conta inteira é egress.** No cenário 100× o egress é **98%** da fatura do Cloud Storage e **97%** da do
S3 — e **0%** da do R2. É por isso que "S3 é mais barato" é meia-verdade: S3 é ~25% mais barato que o GCS
em egress, o que é irrelevante contra um provedor que **não cobra egress**. Se o objetivo é custo, a
resposta nunca foi S3; é R2.

## Tabela de preços unitários (us-east1 / us-east-1, 2026-09-14)

| | Cloud Storage | S3 Standard | R2 Standard |
|--|--------------|-------------|-------------|
| Armazenamento | $0,020 /GB-mês | $0,023 /GB-mês *(1ºs 50 TB)* | $0,015 /GB-mês |
| Escritas (Class A / PUT) | $0,0050 /1.000 | $0,005 /1.000 | $4,50 /milhão |
| Leituras (Class B / GET) | $0,0004 /1.000 | $0,0004 /1.000 | $0,36 /milhão |
| **Egress p/ internet** | **$0,12 /GB** | **$0,09 /GB** *(0–10 TB)* | **$0,00 — "no charges for egress bandwidth for any storage class"** |
| Franquia permanente | 5 GB · 5K A · 50K B · 100 GB egress | 100 GB/mês de egress *(agregado na AWS)* | 10 GB · 1M A · 10M B · egress ilimitado |

⚠️ **Divergência não resolvida:** o exemplo oficial de precificação do Google usa **$0,020/GB-mês** para
Standard em `us-east1`, mas um trecho indexado da própria página de preços cita **$0,026** — que é a tarifa
da **multi-região US**, não da regional. Usei **$0,020** (fonte: exemplo trabalhado oficial). A diferença
não altera nenhuma conclusão: mesmo a $0,026 o armazenamento continua sendo ruído perto do egress.

## O custo que não é dinheiro

É aqui que a decisão realmente se decide, porque em dinheiro os três empatam em zero.

| Eixo | Ficar no Firebase/GCS | Ir para S3 ou R2 |
|------|----------------------|------------------|
| **Dependência nova** | **Zero.** `@google-cloud/storage@7.17.3` já vem como dep **opcional** do `firebase-admin@13.6.0`, e `firebase-admin/storage` está no mapa de `exports` | **+1 dep direta** (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`) e sua árvore transitiva, em todo fork |
| **Contas de provedor por fork** | **Nenhuma a mais.** A stack já é Firebase + Vercel | **+1 conta** (AWS ou Cloudflare) a criar, faturar e rotacionar credencial |
| **Assinatura de URL** | **Local.** A service account carrega chave privada, então a V4 é computada em processo: sem round-trip e **sem** o papel IAM `Service Account Token Creator` | Também local (HMAC com a access key), mas exige **novo par de credenciais** e nova política de bucket |
| **Portabilidade** | Presa ao GCS | ✅ **S3 e R2 são API-compatíveis entre si.** Adotar o SDK da AWS abre a porta para o R2 **sem código novo** — só troca de endpoint e credencial. É um argumento real a favor, e o registro dele é o ponto |
| **Cartão de crédito** | **Exigido** (Blaze) | Exigido na AWS; no R2 **provavelmente não** (não confirmado) |

O ponto de portabilidade merece destaque porque corta nos dois sentidos: ele **enfraquece** a urgência de
migrar agora (dá para migrar depois pelo mesmo preço) e ao mesmo tempo **é** o argumento de quem quer
migrar. Como o custo de migrar não sobe com o tempo — a superfície é um arquivo — a opção racional é
**adiar**.

## Armadilhas conhecidas

- **Egress é o único número que escala mal.** Armazenamento e operações são ruído; a fatura é tráfego.
  Qualquer decisão de storage que ignore egress está medindo a coisa errada.
- **URL assinada de curta duração é incompatível com cache.** O desenho atual (`no-store`, 15 min) força
  **um download por visualização**. É correto para privacidade e é o **pior caso** para a conta de egress.
  A mitigação barata não é trocar de provedor — é pôr CDN na frente ou alongar o TTL, e ambas trocam
  privacidade por dinheiro. Decidir isso é assunto de outra rodada.
- **O teto de operações do GCS é apertado** (5.000 escritas/mês), bem mais que o de armazenamento. Um fork
  com upload ativo estoura operações antes de estourar GB.
- **Free tier do GCS só vale em três regiões** (`us-central1`, `us-east1`, `us-west1`). Criar o bucket em
  `southamerica-east1` por reflexo de latência **cancela a franquia inteira** — é o erro mais fácil de
  cometer neste setup, e o mais caro.
- **O modelo novo de free tier da AWS encerra a conta.** "The account closes on its own 6 months after you
  open it or when your credits run out, whichever comes first." Para um boilerplate cujo propósito é gerar
  forks que ficam de pé, isso é desqualificante.

## Custo herdado por todo fork

**Zero para forks que não ligam upload** — e isso é fato verificado, não promessa: a capacidade é opt-in por
env (`FIREBASE_STORAGE_BUCKET` ausente → `POST /files` responde `STORAGE_NOT_CONFIGURED` 503, o formulário
mantém o campo de URL, o build passa). Um fork que não usa storage **continua rodando no Spark, sem
cartão**.

Para forks que **ligam** o upload: **+1 obrigação de plano Blaze** (cartão no arquivo), **$0,00/mês** de
gasto real no cenário de MVP, e **zero** dependência nova.

## Veredito sobre a decisão Q1 da spec

A spec [`file-upload-storage.md`](../../docs/features/file-upload-storage/spec.md) — entregue e arquivada
em 2026-09-14 — decidiu "Firebase Storage, não S3", justificada
por coerência de stack. **A pesquisa confirma a decisão, mas invalida parte da justificativa.**

- ✅ **Confirmado:** S3 não é mais barato — é mais caro no MVP e traz free tier que expira. A pergunta
  original ("não seria mais barato usar um S3?") tem resposta **não**.
- ✅ **Confirmado:** custo de dependência zero, provedor único, assinatura local. Tudo se sustenta.
- ❌ **Invalidado:** a spec afirma em Riscos que "o free tier do Firebase Storage é generoso mas finito".
  Isso ficou **desatualizado**: para projetos no Spark o free tier não é finito, é **inexistente** — o
  serviço não responde. O risco real não é cota, é **plano**.
- ⚠️ **Não considerado pela spec:** o R2 existe e é ~80× mais barato em escala. Não muda o MVP, mas devia
  estar escrito como saída.

**Recomendação: manter Firebase/GCS**, registrando o R2 como escape hatch com gatilho medido — quando o
egress passar de **~100 GB/mês** (o ponto em que a franquia do GCS acaba e a fatura começa), reavaliar. A
troca é barata e continuará barata: a superfície inteira do provedor está isolada em
`apps/api/(shared)/lib/storage.ts` (4 funções: `putObject`, `signReadUrl`, `deleteObjectQuietly`,
`buildObjectPath`). Migrar é reescrever **um arquivo**.

Não recomendo trocar agora: pagar uma dependência nova, uma conta de provedor a mais por fork e uma
reescrita para economizar **$0,00/mês** é otimização prematura no sentido literal.

## Fontes

- https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024 — exigência do plano
  Blaze desde 2026-02-03; 402/403 no Spark; "Always Free" restrita a `us-central1`/`us-east1`/`us-west1`
- https://firebase.google.com/pricing — tabela Spark/Blaze do Cloud Storage (**contradiz** o FAQ acima; ver
  ressalva no corpo da nota)
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans — "Cloud Billing accounts require
  a payment method"
- https://docs.cloud.google.com/free/docs/free-cloud-features — Always Free do Cloud Storage: 5 GB-mês,
  5.000 Class A, 50.000 Class B, 100 GB de egress da América do Norte; exige conta de faturamento
- https://cloud.google.com/storage/pricing-examples — exemplo oficial com as tarifas unitárias usadas aqui
  ($0,020/GB-mês, $0,0050/1k Class A, $0,0004/1k Class B, $0,12/GB de egress)
- https://cloud.google.com/storage/pricing — página de preços do GCS (tabelas regionais renderizadas por JS;
  os unitários vieram do exemplo oficial acima)
- https://aws.amazon.com/s3/pricing/ — S3 Standard $0,023/GB-mês (1ºs 50 TB), PUT $0,005/1k, GET $0,0004/1k,
  egress $0,09/GB (0–10 TB) com os 1ºs 100 GB/mês gratuitos agregados na AWS
- https://aws.amazon.com/free/ — modelo novo de free tier: até $200 em créditos, conta encerra em 6 meses
- https://developers.cloudflare.com/r2/pricing/ — $0,015/GB-mês, Class A $4,50/milhão, Class B $0,36/milhão,
  "There are no charges for egress bandwidth for any storage class"; franquia de 10 GB / 1M / 10M
- https://developers.cloudflare.com/r2/get-started/ — "R2 is free to get started with included free monthly
  usage" (não esclarece se exige forma de pagamento cadastrada)
