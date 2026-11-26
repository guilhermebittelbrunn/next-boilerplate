# Plano: o id do documento vence na leitura do BaseRepository

Origem: achado 🟢 da revisão de `stripe-customer-lookup-mapper` (`docs/features/stripe-customer-lookup-mapper/review/review.md:29`). Tarefa direta, sem spec. Só `apps/api`.

## 1. Contexto e objetivo

`BaseRepository.toEntity` monta `{ id, ...raw }` (`apps/api/(shared)/repositories/base.repository.ts:70`). Se o documento guardar um campo `id`, ele sobrescreve o id do documento no DTO. O caminho sem mapper do `toDTO` tem o mesmo defeito (`base.repository.ts:77`, `{ id, ...(raw as DTO) }`), e o `create` também (`base.repository.ts:181-184`, `{ id: docRef.id, ...dataToCreate }`).

Só o `findById` sem mapper já fazia certo (`base.repository.ts:161-164`, `{ ...data, id: snap.id }`). Até a tarefa do mapper, o `userRepository` não tinha mapper e as buscas do perfil montavam `{ ...raw, id }` à mão. Agora ele passa `userMapper` no `super` (`user.repository.ts:47`, hunk não commitado) e `findById`, `findByReferenceId` (`user.repository.ts:62`) e `findByStripeCustomerId` (`user.repository.ts:96`) passam pelo `toEntity`. Os outros repositórios com mapper já se comportavam assim antes.

Objetivo: em toda leitura e no retorno do `create`, o id do documento vence qualquer campo `id` gravado no corpo.

Fora de escopo: limpar documentos que porventura tenham `id` gravado, impedir a escrita de `id` no corpo (os `create` tipados já omitem), mexer nos mappers ou no `planLabelRepository` (monta o id por conta própria em `plan-label.repository.ts:9-21`, já correto).

Corte de MVP: as três trocas de ordem na base e os testes que as provam.

## 2. Impacto

| Item | Valor |
|------|-------|
| Apps | `apps/api` apenas |
| SDK / contrato | sem mudança |
| i18n / `apiErrors` | N/A |
| UI / `/test` com browser | N/A (diff sem superfície de runtime visual) |
| Modo de produto / plano | N/A |
| Env nova | nenhuma |

## 3. Evidência levantada

**Mappers.** Todos desestruturam `const { id, ...raw } = entity` e devolvem o `id` recebido: `entity.mapper.ts:11-14`, `audit-event.mapper.ts:25-28`, `notification.mapper.ts:46-48`, `organization-invitation.mapper.ts:43-45`, `organization-member.mapper.ts:37-39`, `session.mapper.ts:67-72`, `subscription-activation.mapper.ts:24-27`. O `userMapper.toDTO` copia a linha inteira (`user.mapper.ts:143-155`). Nenhum lê um `id` próprio do raw com significado diferente do id do documento. `organization-member.mapper.ts:41` usa `record.userId ?? id` e `organization-invitation.mapper.ts:94` lê `record.id` de um record já mapeado; nenhum dos dois depende da ordem.

**Ids com significado.** Alguns ids de documento carregam semântica: sessão `<uid>_<sessionKey>` (`session.mapper.ts:13`), membro = id do perfil (`organization-member.mapper.ts:10`), ativação = id da assinatura no provedor (`subscription-activation.mapper.ts:9`), invoice (`paid-invoice.repository.ts:38`), preço (`plan-label.repository.ts:74`). Em todos o valor certo é o id do documento, o que reforça a correção.

**Escritas.** Nenhum payload grava `id` no corpo:
- `base.create` recebe `CreateRequest<DTO>`, que omite `id` (`base.repository.ts:12-15`). Chamadores: `users/route.ts:74` (`reference_id`, `type`), `entities/route.ts:83` (campos explícitos), `user-merge.ts:90` (`createDefaultUserProfile`, cujo `dto?: Partial<UserDTO>` não é passado por nenhum chamador: `sign-up/route.ts:55`, `user-merge.ts:71`).
- `base.update` tira o `id` antes de escrever (`base.repository.ts:208`).
- Escritas diretas com corpo literal sem `id`: `session.repository.ts:112,153,196`, `organization-invitation.repository.ts:157-172,331`, `organization-member.repository.ts:76-89`, `notification.repository.ts:106-122`, além de `organization`, `paid-invoice`, `payment-event`, `plan-label`, `audit-event` e `subscription-activation`.
- `firestore.rules:32-34` nega leitura e escrita a qualquer cliente (`allow read, write: if false`). O `firebase-admin` ignora as rules.

Conclusão: hoje só um documento editado à mão no console (ou por script com Admin SDK) chega ao caso.

## 4. Segurança

O defeito é latente, mas o alvo é sensível. Os guards resolvem o perfil por `userRepository.findByReferenceId(uid)` (`common-panel.ts:65,93`, `admin.ts:45`) e daí em diante o `profile.id` é a chave de posse: `entity.userId` (`entities/route.ts:85`), `organizationMember/{profileId}`, `notification.userId`. Com a ordem atual, um perfil com `id: "<perfil da vítima>"` gravado no corpo faria o guard devolver `subjectProfile.id` da vítima, e a pessoa agiria como dona dos dados dela (organização, notificações, entidades).

Não existe caminho de escrita para isso hoje (seção 3). O risco aparece se uma mudança futura abrir um, por exemplo um chamador de `createDefaultUserProfile(uid, dto)` repassando um DTO com `id`, ou um schema de PATCH sem `.strict()` espalhado num `update`. Com a correção, um `id` no corpo deixa de alterar identidade em qualquer leitura, e a posse volta a depender só do id do documento.

## 5. Blueprint

Arquivo único: `apps/api/(shared)/repositories/base.repository.ts`.

```diff
     protected toEntity(
         id: string,
         raw: Record<string, unknown>
     ): FirestoreDocumentRow {
-        return { id, ...raw };
+        return { ...raw, id };
     }

     protected toDTO(id: string, raw: Record<string, unknown>): DTO {
         if (this.rowMapper) {
             return this.rowMapper.toDTO(this.toEntity(id, raw));
         }
-        return { id, ...(raw as DTO) };
+        return { ...(raw as DTO), id };
     }
@@ create
         const created = {
-            id: docRef.id,
             ...dataToCreate,
+            id: docRef.id,
         } as DTO;
```

O `findById` (`base.repository.ts:156-164`) já respeita a ordem; não muda. Ninguém sobrescreve `toEntity` (grep em `apps/api`: só a base e o tipo `FirestoreDocumentRow` em `user.mapper.ts`).

### Efeito por repositório

| Repositório | Mapper | Caminhos afetados |
|-------------|--------|-------------------|
| `entity`, `auditEvent`, `notification`, `organizationInvitation`, `organizationMember`, `session`, `subscriptionActivation`, `user` | sim | `findById`, `findAll`, `paginate`, `toDTO` chamado nos próprios repositórios, retorno do `create` |
| `organization`, `paidInvoice`, `paymentEvent`, `planLabel` | não | `findAll`, `paginate`, retorno do `create` (o `findById` já estava certo; `planLabel` lê pelo próprio helper) |

Para documentos sem `id` no corpo, que são todos os gravados pelo código atual, a saída é idêntica.

## 6. Testes

Unitários em `apps/api/__tests__/baseRepository.test.ts`, com o `fakeDb` e o `repository` já existentes (`baseRepository.test.ts:343`, `BaseRepository<EntityDTO>` com `entityMapper`). Os casos marcados com "reprova hoje" falham contra o código atual:

1. `findById` com mapper, documento `e1` semeado com `id: "forged"`: espera `found.id === "e1"`. Reprova hoje.
2. `findAll` com mapper, mesmo seed: espera `id === "e1"`. Reprova hoje.
3. `findAll` num `new BaseRepository<EntityDTO>(fakeDb as never, "entity")` sem mapper, mesmo seed: espera `"e1"`. Reprova hoje (cobre `base.repository.ts:77`).
4. `findById` sem mapper, mesmo seed: espera `"e1"`. Já passa; fica como guarda de regressão.
5. `create` com `id: "forged"` no payload (cast, já que o tipo omite): espera `created.id === "doc-1"`. Reprova hoje.
6. `UserRepository.findByReferenceId` com perfil `p1` semeado com `id: "victim"`: espera `"p1"`. Reprova hoje e documenta o cenário do guard da seção 4.

Antes de implementar, conferir que os seis rodam e que 1, 2, 3, 5 e 6 falham. Depois: `pnpm --filter api test` inteiro e `pnpm --filter api test:emulator` (exige JDK 21), mais `pnpm check` e `pnpm --filter api typecheck`. Nenhum teste com emulador novo: a ordem do spread não depende de infra.

## 7. Working tree

Há nove tarefas não commitadas. Os arquivos desta tarefa:

- `base.repository.ts`: sem diff no working tree (`git diff --stat` vazio). A edição desta tarefa será o único hunk.
- `baseRepository.test.ts`: já tem hunks de `stripe-customer-lookup-mapper` (`describe("UserRepository.findById")` novo, caso "hands back the stored instants as Date" em `findByReferenceId`, e o teste renomeado para "update writes only the given fields" perto da linha 934). Os testes novos devem entrar em `describe` próprios para o `/review` conseguir separar os hunks por tarefa (`git add -p`).
- `user.repository.ts` e `user.mapper.ts`: hunks da tarefa do mapper; esta tarefa não os toca, mas depende deles para o teste 6.

Ordem de commit: depois do commit de `stripe-customer-lookup-mapper`. Um commit `fix(api): let the document id win over a stored id field` com base + testes, e por último `docs(features): base-repository-id-precedence`.

## 8. Critérios de aceite

- [ ] **O id do documento vence em toda leitura com mapper**
  Um documento com `id` gravado no corpo, lido por `findById`, `findAll` ou `paginate` de um repositório com mapper, sai com o id do documento. O campo do corpo é ignorado e não aparece em outra propriedade do DTO.

- [ ] **O id do documento vence nas leituras sem mapper**
  `findAll` e `paginate` de um repositório sem mapper (`organization`, `paidInvoice`, `paymentEvent`, `planLabel`) devolvem o id do documento mesmo com `id` no corpo. O `findById` sem mapper continua devolvendo o id do documento, como já fazia.

- [ ] **O retorno do create traz o id gerado pelo Firestore**
  Se um payload chegar ao `create` com `id` (só por cast, já que `CreateRequest` omite o campo), o DTO devolvido traz o `docRef.id`. O que fica gravado no corpo não muda nesta tarefa.

- [ ] **O perfil resolvido pelo guard não troca de identidade**
  `userRepository.findByReferenceId` devolve o id do documento do perfil mesmo que o corpo tenha `id` de outro perfil. Assim `subjectProfile.id`, que define a posse de entidades, membros e notificações, não pode ser forjado por um campo no documento.

- [ ] **Documentos normais não mudam**
  Para documentos sem `id` no corpo, que são todos os gravados pelo código atual, a saída de todos os repositórios é idêntica à de antes. A suíte `apps/api` (`test` e `test:emulator`) passa sem alterar teste existente.

## 9. Decisões tomadas (rodada autônoma)

- Corrigir os três pontos da base, e não só o `toEntity` citado no achado: o caminho sem mapper e o `create` têm a mesma inversão, e deixar dois deles dá comportamento diferente conforme o repositório tenha mapper.
- Não remover `id` do corpo na escrita nem migrar dados: nenhum escritor grava o campo e a leitura corrigida já o neutraliza.
- Sem mudança em mappers.

## Perguntas em aberto

Nenhuma bloqueante. Uma para registro: vale um guarda de escrita (tirar `id` do payload no `create`) como defesa em profundidade? Recomendação: não agora, porque `CreateRequest` já omite o campo no tipo; reavaliar se surgir um chamador que repasse DTO inteiro.
