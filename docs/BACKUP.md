# Backup e restauração do Firestore

> **Modelo, não parecer jurídico.** Este documento vem preenchido com o que o boilerplate faz e marca com
> `[FORK]` o que só o produto pode preencher. Os comandos foram copiados da documentação do provedor e não
> foram executados contra um projeto real.
>
> Fontes coletadas em 2026-09-30. Base na nota
> [`compliance-trust-baseline`](../specs/research/compliance-trust-baseline.md), a revalidar depois de
> 2027-08-21. Recurso de nuvem muda de plano e de sintaxe; confira a página do provedor antes de rodar.

## No plano Spark não há backup

Os três recursos de cópia do Firestore exigem faturamento ativo, e no Firebase isso significa o plano Blaze.

| Recurso | Plano | O que guarda | Para onde restaura | Fonte |
|---|---|---|---|---|
| Backup agendado | Blaze ("This feature requires the Blaze pricing plan") | um agendamento diário e um semanal por banco, retenção de até 14 semanas; dados e configuração de índices, sem as políticas de TTL; fica na mesma região do banco | sempre um banco que ainda não existe | <https://firebase.google.com/docs/firestore/backups> |
| Recuperação a um instante (PITR) | faturamento ativo; vem desligado | uma versão por minuto nos últimos 7 dias, a partir de quando foi ligado | leitura no passado e regravação, clone do banco, ou export num instante e import em outro banco | <https://docs.cloud.google.com/firestore/native/docs/pitr> |
| Export e import gerenciado | faturamento ativo ("Firebase projects must be on the Blaze plan") | o que foi exportado, enquanto o bucket guardar | qualquer banco; o import sobrescreve documento de mesmo id | <https://docs.cloud.google.com/firestore/docs/manage-data/export-import> |

`[FORK]` Decida uma das duas saídas e anote a decisão com data no bloco "Medidas que valem para todos os
registros" do [`ROPA.md`](ROPA.md):

- **Migrar para o Blaze e ligar o backup agendado.** Exige cartão cadastrado. O custo é o armazenamento de
  cada backup e, numa restauração, o tamanho do backup restaurado; a tabela de preço está na
  [página do Firestore](https://firebase.google.com/docs/firestore/pricing). Este documento não traz número
  porque não mediu nenhum.
- **Operar sem backup.** Nesse caso, um dado apagado por erro ou por incidente não volta, e isso é o que o
  registro de operações e a resposta a incidente precisam dizer.

A exportação de conta que o titular baixa em `/account/export` é um direito dele, não uma cópia de
segurança do produto.

## O que o backup do Firestore não cobre

- **Contas do Firebase Authentication** (e-mail, hash de senha, provedores de login). Elas vivem fora do
  Firestore. O comando de exportação é `firebase auth:export ACCOUNT_FILE --format=json` (ou `csv`), e o de
  volta é `firebase auth:import`, que sobrescreve a conta de mesmo uid
  ([documentação](https://firebase.google.com/docs/cli/auth), lida em 2026-09-30). A página não diz se o
  comando exige o Blaze: **não confirmado**. O arquivo exportado tem e-mail e hash de senha de cada usuário,
  e os parâmetros de hash do projeto são sensíveis: nenhum dos dois entra no repositório.
- **Objetos do Cloud Storage.** O bucket tem política própria; `[FORK]` se o produto usa upload.
- **Dados na Stripe.** A Stripe é a fonte da verdade da cobrança. Depois de uma restauração, o estado de
  assinatura gravado no perfil volta ao da data do backup; confira com o painel da Stripe.
- **Variáveis de ambiente e a service account.** Ficam no painel da Vercel e no console do Firebase.
- **Políticas de TTL.** A de `paymentEvent` ([`PRE-PRODUCTION.md`](PRE-PRODUCTION.md), item 12, passo 5) não
  vai no backup e precisa ser reaplicada se o banco restaurado virar o banco em uso.

## Ligar o backup agendado (Blaze)

Papel necessário para quem configura: `roles/datastore.backupSchedulesAdmin` (ou `roles/datastore.owner`).
Para restaurar: `roles/datastore.restoreAdmin`. O banco que a API usa é o `(default)`.

```bash
# diário, guardando 14 semanas (o máximo)
firebase firestore:backups:schedules:create \
  --database '(default)' \
  --recurrence 'DAILY' \
  --retention 14w

# semanal, num dia fixo
firebase firestore:backups:schedules:create \
  --database '(default)' \
  --recurrence 'WEEKLY' \
  --retention 14w \
  --day-of-week SUNDAY

# conferir
firebase firestore:backups:schedules:list --database '(default)'
firebase firestore:backups:list
```

A hora do backup não é configurável; ele roda em horário diferente a cada dia. Apagar o banco não apaga os
backups dele.

Ligado o backup, a exclusão de conta deixa de apagar tudo na hora: o perfil e os registros do titular
continuam nos backups até a retenção escolhida acima vencer. Declare esse prazo no registro de cadastro do
[`ROPA.md`](ROPA.md) e na política de privacidade.

## Restaurar

A restauração sempre escreve num banco que ainda não existe, e a API só lê o `(default)`:
`getFirestore(getFirebaseAdminApp())`, sem id de banco (`packages/auth/server.ts:100`). Por isso os dados
precisam voltar ao `(default)` por um dos dois caminhos do passo 3.

1. **Antes de qualquer troca, liste as exclusões posteriores ao backup.** Em `/admin/audit`, filtre o
   período a partir da data do backup e anote os eventos `account.delete` e `user.delete`. A trilha guarda o
   id do alvo (`targetUserId`) mesmo depois da exclusão (`packages/sdk/src/types/audit/audit.ts:29-31`).
   Guarde a lista fora do repositório. Os dois eventos são diferentes:
   - `account.delete` é a exclusão pedida pelo titular: apaga perfil, registros de `entity`, conta no
     Authentication, arquivos (com Storage ligado) e os rótulos pessoais na trilha
     ([`PRE-PRODUCTION.md`](PRE-PRODUCTION.md), "Declaração: até onde a exclusão de conta alcança").
   - `user.delete` é o arquivamento pelo admin: marca `deletedAt` no perfil
     (`apps/api/app/(routes)/users/[id]/route.ts:173`, que chama `apps/api/(shared)/repositories/base.repository.ts:225-226`).
2. **Restaure para um banco novo.** Pegue o nome completo do backup em `firebase firestore:backups:list`:

   ```bash
   firebase firestore:databases:restore \
     --backup '<nome completo do backup>' \
     --database '<id-do-banco-novo>'
   ```

   O id não pode estar em uso, e o banco só fica acessível quando a operação termina.
3. **Traga os dados de volta ao `(default)`.** Escolha um caminho:

   **Por export e import**, sem derrubar o banco em uso. Exige um bucket do Cloud Storage perto da região do
   banco e os papéis `Cloud Datastore Import Export Admin` e `Storage Admin`:

   ```bash
   gcloud firestore export gs://<bucket> --database='<id-do-banco-novo>'
   gcloud firestore import gs://<bucket>/<prefixo-do-export>/ --database='(default)'
   ```

   O import sobrescreve o documento de mesmo id e não apaga documento que não estava no export. Na prática:
   documento alterado depois do backup volta à versão antiga, documento criado depois continua lá, e
   documento apagado depois volta a existir. Para trazer só parte dos dados, as duas pontas aceitam
   `--collection-ids=<colecao1>,<colecao2>`. Export e import cobram uma leitura e uma escrita por documento.

   **Por restauração no lugar**: apagar o `(default)` e restaurar o backup com o mesmo id
   ([documentação](https://docs.cloud.google.com/firestore/native/docs/restore-in-place)). É irreversível,
   derruba o produto entre a exclusão e o fim da restauração, e perde tudo o que foi escrito depois do
   backup, inclusive os eventos de auditoria do passo 1. A página descreve o procedimento para um id de
   banco qualquer e não faz exceção ao `(default)`; não foi testado neste repositório.

   ```bash
   gcloud firestore databases delete --database='(default)'
   # esperar ao menos 5 minutos até o id ficar livre
   gcloud firestore databases restore \
     --source-backup=projects/<projeto>/locations/<regiao>/backups/<id-do-backup> \
     --destination-database='(default)'
   ```

   Nesse caminho, reaplique a TTL de `paymentEvent` e confira os índices contra `firestore.indexes.json`.
4. **Reaplique as exclusões da lista do passo 1.** A restauração traz de volta o perfil e os registros de
   quem se excluiu depois do backup, e os rótulos pessoais na trilha voltam junto. O core não tem ferramenta
   para reaplicar uma exclusão de conta sobre um perfil cuja conta no Authentication já não existe.
   `[FORK]` como reaplicar, e quem confere. Para `user.delete`, o admin pode arquivar de novo pela própria
   tela de usuários.
5. **Apague o banco temporário** quando terminar: `gcloud firestore databases delete --database='<id-do-banco-novo>'`.
   Os backups continuam.

## Testar a restauração (rotina)

Backup que nunca foi restaurado não conta como backup. `[FORK]` frequência do teste, anotada no
[`ROPA.md`](ROPA.md).

1. Restaure o backup mais recente num banco descartável (passo 2 acima).
2. Compare a contagem de documentos de `user` e de `auditEvent` no banco descartável com a do `(default)`,
   pelo console do Firestore. A diferença esperada é só o que entrou depois do backup.
3. Anote, fora do repositório: data, backup usado, duração da restauração e qualquer divergência.
4. Apague o banco descartável.
