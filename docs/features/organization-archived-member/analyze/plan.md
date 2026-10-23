# Plano: o membro arquivado deixa de contar na organização

- **Slug:** `organization-archived-member`
- **Origem:** tarefa direta, sem spec. É a recomendação "A próxima: tarefa direta `organization-archived-member`" de
  `specs/BACKLOG.md:225-256`, que leva ao `/analyze` o 🟡 "Um perfil arquivado pelo admin continua contando como
  membro da organização" da seção "Achados da tarefa `organization-guardrails`" (`specs/BACKLOG.md:1429-1442`).
- **Base:** `HEAD` em `61a781e` (PR #57). Branch atual `guilhermebittelbrunn/cycle-command-v8`; este plano não cria
  nem nomeia branch. Os dois arquivos que a tarefa toca estão limpos no working tree (`git diff HEAD --stat` vazio
  para eles).
- **Escopo:** só `apps/api`, um arquivo de código e um de teste. Sem SDK, sem `apps/app`, sem `apps/web`, sem
  `error.code` novo, sem i18n, sem variável de ambiente, sem índice do Firestore, sem infra.

## 0. Sumário do desenho

`ownsOrganizationWithMembers` (`apps/api/(shared)/lib/organization-membership.ts:105-117`) passa a contar só os
vínculos de outras pessoas cujo perfil está vivo. O helper separa os vínculos que não são do próprio dono, lê o
perfil de cada um com `userRepository.findById` em paralelo e responde `true` se algum perfil voltar. O `findById` do
repositório base já devolve `null` para perfil com `deletedAt` preenchido e para documento que não existe
(`base.repository.ts:144-155`), então "arquivado" e "perfil ausente" saem pelo mesmo caminho, sem regra nova.

Nada muda nas rotas. A exclusão pela própria conta (`account/deletion/route.ts:43`, em `main`) e o arquivamento pelo
admin (`users/[id]/route.ts:191`, só no working tree da tarefa `organization-guardrails`) passam a se beneficiar sem
edição, porque os dois chamam o helper.

## 1. Contexto

### 1.1 Problema

O helper existe porque não há transferência de dono: um dono que sai deixaria os membros numa organização que
ninguém gerencia (`organization-membership.ts:101-104`). Hoje ele lê os vínculos da organização de casa com
`organizationMemberRepository.listByOrganization` e responde `true` se algum `userId` for diferente do dono
(`:113-116`). O `listByOrganization` filtra o `deletedAt` do vínculo (`organization-member.repository.ts:86`), não o do
perfil.

O arquivamento pelo admin marca `deletedAt` só no perfil (`userRepository.delete(id)`, `users/[id]/route.ts:220` em
`HEAD`, `:228` no working tree) e deixa o vínculo onde está. A exclusão pelo titular, ao contrário, remove o vínculo
(`account-erasure.ts:130-147`). O resultado é que o vínculo de um perfil arquivado continua contando.

Cenário que falha hoje, em `main`: o dono D convidou M; o admin arquivou M. D pede a exclusão da própria conta e
recebe `409 ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS` (`account/deletion/route.ts:41-48`), mesmo sem ninguém ativo
para proteger. Com `organization-guardrails` aplicada, o admin que tentar arquivar D recebe
`409 USERS_DELETE_ORGANIZATION_HAS_MEMBERS` pelo mesmo motivo.

Contar esse vínculo não protege ninguém. O core não tem restauração de perfil arquivado pelo painel
(`docs/INCIDENT-RESPONSE.md:52`: só limpando `deletedAt` no Firestore), e a conta arquivada é desativada no Auth e não
recria perfil ao entrar de novo (PR #50, `user-merge.ts:55-71`).

A saída existe, mas é escondida: a tabela da equipe lista o perfil arquivado com nome e e-mail vazios
(`organization-member-profiles.ts:32-36`) e o dono pode removê-lo (`organization/members/[id]/route.ts`). Nada na
mensagem do `409` diz ao dono que é aquela linha sem nome.

### 1.2 Objetivo e corte de MVP

Corte (é o que a recomendação escreveu):

1. `ownsOrganizationWithMembers` ignora o vínculo cujo perfil não está vivo (arquivado ou ausente).
2. O dono continua sem ser lido: o vínculo dele já é descartado pelo `userId`, e o perfil dele não entra na leitura.
3. Organização com pelo menos um membro de perfil vivo continua respondendo `true`, como hoje.

Fora de escopo:

- **A lista de membros** (`organization/members/route.ts:9`) continua mostrando o perfil arquivado. É por essa linha
  que o dono acha e remove o vínculo; escondê-la tiraria a única saída para limpar a organização. Decisão escrita na
  recomendação (`specs/BACKLOG.md:253-255`).
- **A recusa do aceite de convite** (`owner-has-members`, `organization-invitation.repository.ts:255-276`) aplica a
  mesma regra por conta própria, dentro de uma transação, e também conta o membro arquivado. Ver §11, pergunta 2: fica
  fora e vira achado.
- **Mensagem do `409`** apontando a linha sem nome. Mudaria copy em `apiErrors`, arquivo sem commit da outra tarefa.
- Restauração de perfil arquivado, limpeza automática do vínculo no arquivamento (mudaria `users/[id]/route.ts`, sem
  commit) e qualquer mudança na variável `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED`.

### 1.3 Apps impactados

| área | impacto |
|------|---------|
| `apps/api` | `(shared)/lib/organization-membership.ts` (helper) e `__tests__/organizationMembership.test.ts` |
| `apps/app` | nenhum. A tela de exclusão de conta e a de usuários do admin só deixam de receber um `409` que não devia sair |
| `apps/web` | nenhum |
| `packages/*` | nenhum |

Área: comum (exclusão pelo titular) e admin (arquivamento, quando `organization-guardrails` entrar). Modo de produto:
indiferente. Sem dependência de assinatura.

## 2. Dados (Firestore)

Nenhum campo, coleção ou índice novo.

| coleção | id do documento | o que importa aqui |
|---------|-----------------|--------------------|
| `organizationMember` | o id do perfil (`organization-member.repository.ts:57`) | `organizationId`, `userId`, `role`; `deletedAt` sempre `null` (o vínculo é removido de verdade, `:105-122`) |
| `user` | o id do perfil | `deletedAt` preenchido pelo arquivamento do admin (`base.repository.ts:229-231`) |

Consulta: a mesma de hoje, `organizationMember where organizationId ==` (campo único, índice automático), mais uma
leitura por id em `user` para cada vínculo que não é do dono.

**Custo de leitura.** Vira `1 (organização) + 1 (consulta de vínculos) + N (perfis dos outros membros)`, com as N
leituras em paralelo, então a latência soma uma ida ao Firestore, não N. É o mesmo padrão que a tabela da equipe já
usa para os mesmos perfis (`organization-member-profiles.ts:40-44`). Organizações de MVP têm poucas pessoas
(`organization-member.repository.ts:80`), e o helper roda em duas operações raras (excluir a própria conta, arquivar
pelo admin). Ver §11, pergunta 1, para a leitura em lote descartada.

Dados existentes: nenhuma migração. Vínculos de perfis já arquivados passam a ser ignorados na próxima chamada.

## 3. Contrato `@repo/sdk`

N/A. Nenhum DTO, action ou tipo muda.

## 4. API

### 4.1 Rotas e guards

Nenhuma rota muda. Consumidores do helper, conferidos por `grep`:

| consumidor | linha | estado | efeito |
|------------|-------|--------|--------|
| `POST /account/deletion` | `account/deletion/route.ts:43` | em `HEAD` | o dono com só membros arquivados passa da recusa e segue para a conferência de senha |
| `DELETE /users/:id` | `users/[id]/route.ts:191` | só no working tree (`organization-guardrails`) | o admin arquiva o dono com só membros arquivados |

A regra vale para os dois do mesmo jeito: nos dois casos o objetivo é não deixar gente ativa numa organização sem
gestão, e um perfil arquivado não é gente ativa.

### 4.2 Erros

Nenhum código novo. `409 ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS` e `409 USERS_DELETE_ORGANIZATION_HAS_MEMBERS`
continuam iguais; só deixam de sair no caso do membro arquivado.

Falha ao ler um perfil propaga, como já acontece com a falha do `listByOrganization`: a rota responde `500` antes de
qualquer efeito. Isso já está no backlog como 🟢 "Falha do Firestore numa leitura de recusa vira `500` sem
`error.code`" (`specs/BACKLOG.md:1442`) e não muda aqui. Engolir o erro e responder `false` seria pior: apagaria a
conta de um dono com membros ativos.

## 5. Front-end

N/A. Sem tela, rota, hook, formulário ou chave nova.

## 6. Autorização e segurança

- **Direção do risco.** A mudança afrouxa uma recusa. O único caso liberado é o de organização cujos outros vínculos
  são todos de perfil arquivado ou inexistente. Um membro ativo continua bloqueando, e o teste prova isso (§7, caso 3).
- **Efeito no vínculo do arquivado.** Quando o dono se exclui, `eraseOrganization` apaga todos os vínculos da
  organização de casa (`account-erasure.ts:153`), inclusive o do perfil arquivado. Se alguém restaurar esse perfil à
  mão depois, o próximo pedido dele cria uma organização de casa nova (`organization-membership.ts:46-63`). Os
  registros que ele criou na organização apagada saem junto com ela, como já acontece com membros removidos.
- **Convites pendentes de um dono arquivado.** Arquivado pelo admin, o dono mantém o vínculo, então a organização
  segue ativa para o aceite (`organization-invitation.ts:98-110`) e os convites pendentes continuam aceitáveis. Isso
  já acontece hoje com o dono sem membro nenhum; a mudança estende o caso ao dono com só membros arquivados. Vira
  achado (§12).
- **Impersonação.** `POST /account/deletion` recusa com `403 AUTH_REQUEST_IMPERSONATION_FORBIDDEN` antes do helper
  (`account/deletion/route.ts:24-29`). O `DELETE /users/:id` é do admin, sem impersonação. Nada muda.
- **Variável de membros desligada.** O helper não lê `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED`, como hoje. O 🟢
  dessa variável (`specs/BACKLOG.md:1440`) segue aberto.

## 7. Testes

Nível: unitário do helper, com `vi.mock` dos repositórios. É o mais barato que prova a regra. Não há emulador: o que
faz "arquivado" virar `null` é o `findById` do repositório base, já coberto em `baseRepository.test.ts:421-431`, e o
`deletedAt` gravado como `Timestamp` pelo `UserRepository` em `baseRepository.test.ts:811-840` e na suíte de
emulador `userArchivedProfile.emulator.test.ts`.

Arquivo: `apps/api/__tests__/organizationMembership.test.ts` (existente).

- Acrescentar `findProfileByIdMock` ao `vi.hoisted` e
  `vi.mock("@/(shared)/repositories/user.repository", () => ({ userRepository: { findById: ... } }))`. É obrigatório:
  o helper passa a importar `user.repository`, que importa `../infra/database`; sem o mock o teste carregaria o
  Firestore real. Incluir o mock no laço de `mockReset` do `beforeEach` e, como padrão, responder um perfil vivo
  (`{ id, reference_id: \`${id}-uid\`, type: UserType.COMMON }`, igual a `organizationMemberProfiles.test.ts:52-58`).
- Casos no `describe("ownsOrganizationWithMembers")` (`:238`):
  1. já existe: sem organização de casa → `false`;
  2. já existe, mais uma asserção: dono sozinho → `false` **e** `findProfileByIdMock` não chamado;
  3. já existe, mais uma asserção: outro membro com perfil vivo → `true`, `findProfileByIdMock` chamado com
     `"profile-2"` e nunca com `PROFILE_ID`;
  4. novo: o único outro membro tem perfil arquivado (`findById` → `null`) → `false`;
  5. novo: um membro arquivado e um vivo → `true`;
  6. novo: falha ao ler o perfil (`mockRejectedValue`) → o helper rejeita com o mesmo erro.

Arquivos que **não** precisam mudar, conferidos: os testes de rota que usam o helper o substituem inteiro por mock
(`accountDeletionRoute.test.ts:50`, `usersAdminArchiveAccess.test.ts:37`, `usersAdminAuditTrail.test.ts:33`,
`usersAdminDeleteBilling.test.ts:31`), e os que mockam `organization-membership` para o guard
(`organizationGuard.test.ts` e os de `entities*`) também. As suítes de emulador que importam o módulo real
(`organizationScope.emulator.test.ts`, `organizationInvitation.emulator.test.ts`) não chamam este helper.

Suítes: `pnpm --filter api test` (a suíte inteira, por causa do import novo), `pnpm --filter api typecheck`,
`pnpm check`. O `test:emulator` não é afetado; o `/test` pode citar o número da etapa anterior.

Mutação recomendada ao `/test`: trocar o filtro por `return others.length > 0` e conferir que os casos 4 falham e os
outros passam; restaurar e conferir o `shasum`.

## 8. O que o `/test` vai ter de percorrer

Nada no navegador: o diff não tem superfície de UI, e os dois `409` já chegam às telas pelo `FormattedError`. O
`/test` roda as suítes da §7, a mutação, e confirma por leitura os pontos de §9 que não têm teste próprio (rotas sem
mudança, tabela da equipe sem mudança).

Não verificável sem infra: nenhum.

## 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Dono cujo único outro membro está arquivado não é bloqueado**
  Com a organização de casa contendo o dono e um vínculo cujo perfil tem `deletedAt` preenchido,
  `ownsOrganizationWithMembers(dono)` responde `false`. Na prática, `POST /account/deletion` deixa de responder
  `409 ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS` e segue para a conferência de senha; com `organization-guardrails`
  aplicada, o `DELETE /users/:id` também deixa de responder `409 USERS_DELETE_ORGANIZATION_HAS_MEMBERS`. Prova: caso 4
  do teste do helper.

- [ ] **Um membro ativo continua bloqueando, mesmo ao lado de um arquivado**
  Com um vínculo de perfil arquivado e outro de perfil vivo, o helper responde `true`, e as duas rotas mantêm o `409`
  de hoje. A ordem dos vínculos na lista não muda o resultado. Prova: caso 5 do teste do helper, e o caso 3 para o
  membro vivo sozinho.

- [ ] **Vínculo sem perfil no Firestore não conta**
  Um vínculo cujo documento em `user` não existe (sobra de uma exclusão interrompida, ou perfil apagado fora da app)
  é tratado como o arquivado: `findById` devolve `null` e o helper ignora o vínculo. Não há perfil para proteger. Prova:
  o mesmo `null` do caso 4; o `findById` do base devolve `null` nos dois casos (`base.repository.ts:149-155`).

- [ ] **O perfil do dono nunca é lido, e o dono sozinho não gera leitura de perfil**
  O helper filtra o vínculo do próprio dono pelo `userId` antes de ler perfis. Com o dono sozinho na organização, a
  resposta é `false` sem nenhuma chamada a `userRepository.findById`. Com outros membros, só os ids deles são lidos.
  Prova: asserções novas nos casos 2 e 3.

- [ ] **Sem organização de casa, nada muda**
  Um perfil que não é dono de organização (membro de outra, ou sem vínculo) recebe `false` sem consultar vínculos nem
  perfis, como hoje. Prova: caso 1, já existente.

- [ ] **Falha ao ler um perfil não libera a exclusão**
  Se `userRepository.findById` rejeitar, o helper rejeita com o mesmo erro, e a rota que o chamou não executa nenhum
  efeito (nada é apagado, nenhuma assinatura cancelada). O comportamento da rota nesse caso continua o `500` sem
  `error.code` já registrado no backlog. Prova: caso 6 do teste do helper.

- [ ] **A tabela da equipe continua mostrando o membro arquivado**
  `GET /organization/members` e `describeOrganizationMembers` não mudam: o vínculo arquivado segue listado com nome e
  e-mail vazios, e o dono ainda pode removê-lo com `DELETE /organization/members/:id`. Prova: leitura do diff (nenhum
  dos dois arquivos aparece) e `organizationMemberProfiles.test.ts` e `organizationMembersRoute.test.ts` verdes sem
  edição.

- [ ] **Nenhuma rota, contrato ou tradução muda**
  O diff da tarefa se limita a `organization-membership.ts` e `organizationMembership.test.ts`. Nenhum arquivo da
  tarefa `organization-guardrails` sem commit é tocado, e a suíte da `apps/api` passa inteira com o import novo de
  `user.repository` no helper. Prova: `git status --short` e `pnpm --filter api test`.

## 10. Blueprint técnico

### 10.1 `apps/api/(shared)/lib/organization-membership.ts`

```diff
 import { logEvent } from "@repo/shared/utils/helpers/log";
 import type { OrganizationMemberRecord } from "../mappers/organization-member.mapper";
 import { entityRepository } from "../repositories/entity.repository";
 import { organizationRepository } from "../repositories/organization.repository";
 import { organizationMemberRepository } from "../repositories/organization-member.repository";
+import { userRepository } from "../repositories/user.repository";
@@
 /**
  * There is no transfer of ownership, so an owner who still has members would leave them
- * in an organization nobody can manage.
+ * in an organization nobody can manage. A member whose profile was archived, or is gone,
+ * cannot be stranded: the account is disabled and never comes back on its own.
  */
 export async function ownsOrganizationWithMembers(
     profileId: string
 ): Promise<boolean> {
     const home = await organizationRepository.findOwnedBy(profileId);
     if (!home) {
         return false;
     }
 
     const members = await organizationMemberRepository.listByOrganization(
         home.id
     );
-    return members.some((member) => member.userId !== profileId);
+    const others = members.filter((member) => member.userId !== profileId);
+    if (others.length === 0) {
+        return false;
+    }
+
+    const profiles = await Promise.all(
+        others.map((member) => userRepository.findById(member.userId))
+    );
+    return profiles.some((profile) => profile !== null);
 }
```

O comentário do JSDoc é a exceção legítima da regra de comentários: é regra de negócio que o código não diz sozinho
(por que um vínculo existente não conta). O `/develop` pode ajustar a redação, mas sem citar artefato do fluxo.

Ciclo de import: `user.repository.ts` não importa nada de `lib/organization-membership` (`user.repository.ts:1-28`),
então não há ciclo novo.

### 10.2 `apps/api/__tests__/organizationMembership.test.ts`

```diff
 const {
     findByUserIdMock,
     ...
     logEventMock,
+    findProfileByIdMock,
 } = vi.hoisted(() => ({
     ...
+    findProfileByIdMock: vi.fn(),
 }));
+
+vi.mock("@/(shared)/repositories/user.repository", () => ({
+    userRepository: {
+        findById: (...args: unknown[]) => findProfileByIdMock(...args),
+    },
+}));
@@ beforeEach
     for (const mock of [ ..., logEventMock, findProfileByIdMock ]) {
         mock.mockReset();
     }
+    findProfileByIdMock.mockImplementation((id: string) =>
+        Promise.resolve({ id, reference_id: `${id}-uid`, type: UserType.COMMON })
+    );
@@ describe("ownsOrganizationWithMembers")
+    it("is false when the only other member's profile was archived", ...)   // findById → null
+    it("is true when a live member sits next to an archived one", ...)
+    it("surfaces a failure to read a member's profile", ...)                 // rejects
```

`UserType` vem de `@repo/sdk/src/types`, como em `organizationMemberProfiles.test.ts:1`. Os nomes dos casos ficam em
inglês, no estilo dos que já estão no arquivo.

### 10.3 Exemplo

| vínculos na organização de casa de D | perfis | antes | depois |
|--------------------------------------|--------|-------|--------|
| D | D vivo | `false` | `false` (sem ler perfil) |
| D, M | M arquivado | `true` → `409` | `false` |
| D, M | M sem documento | `true` → `409` | `false` |
| D, M, N | M arquivado, N vivo | `true` → `409` | `true` → `409` |
| D, N | N vivo | `true` → `409` | `true` → `409` |

### 10.4 Ordem de implementação e de commit

1. `fix(api): ignore archived profiles when counting organization members`:
   `apps/api/(shared)/lib/organization-membership.ts` e `apps/api/__tests__/organizationMembership.test.ts`.
2. `docs(features): organization-archived-member`: `docs/features/organization-archived-member/`.

Os commits de `organization-guardrails` e da auditoria do backlog são de outros assuntos e não entram nesta lista. O
índice git tem um `git mv` da auditoria (`specs/teams-organizations.md` → `docs/features/teams-organizations/spec.md`):
`git diff --cached --stat` tem de sair vazio, ou o `/review` decide antes a qual commit ele pertence.

### 10.5 Env e configuração

Nenhuma.

## Pré-requisitos manuais de infra

Nenhum. Sem índice, sem regra do Firestore, sem serviço.

## 11. Perguntas em aberto (decididas pela rodada autônoma)

1. **Ler os perfis um a um em paralelo ou em lote?**
   Adotada: `Promise.all` de `userRepository.findById`, no próprio helper. Reaproveita a semântica de arquivado do
   repositório base sem regra nova, repete o padrão de `organization-member-profiles.ts:40-44` e não toca
   `user.repository.ts`.
   Descartada: um método novo no `UserRepository` com `db.getAll(...refs, { fieldMask: ["deletedAt"] })`, no molde de
   `plan-label.repository.ts:44-71`. Faz uma chamada só, mas o Firestore cobra uma leitura por documento do mesmo
   jeito, a latência das leituras em paralelo já é de uma ida, e o método novo pediria o seu próprio teste com o
   driver falso. Vale a troca se uma organização passar de algumas dezenas de pessoas.

2. **A recusa do aceite de convite (`owner-has-members`) também deve ignorar o membro arquivado?**
   Adotada: não nesta tarefa; vira achado no backlog (§12). A regra está duplicada dentro da transação de
   `acceptByTokenHash` (`organization-invitation.repository.ts:255-276`), e ler perfis ali põe N documentos de `user` no
   conjunto de leitura da transação. A única prova de comportamento dessa transação é a suíte de emulador
   (`organizationInvitation.emulator.test.ts:188-190`), então a correção pede teste de emulador e sai do corte P.
   O dono afetado tem a mesma saída de hoje: remover o membro arquivado na tabela.
   Alternativa: corrigir junto, com um caso novo na suíte de emulador.

3. **Esconder o membro arquivado na tabela da equipe?**
   Adotada: não. É a recomendação escrita (`specs/BACKLOG.md:253-255`): a linha sem nome é por onde o dono acha e
   remove o vínculo.

4. **Atualizar os documentos que descrevem a recusa?**
   Adotada: não nesta tarefa. Os quatro documentos que citam a regra (`docs/SECURITY.md:40`,
   `docs/PRE-PRODUCTION.md:944-947`, `docs/ROPA.md:193`, `docs/INCIDENT-RESPONSE.md:52`) estão sem commit pela tarefa
   `organization-guardrails` ou pela auditoria. Nenhum deles fica falso: dizem "o dono que ainda tem membros", e um
   perfil arquivado deixa de ser membro para essa regra. Acrescentar "perfil arquivado não conta" fica para quando
   aqueles arquivos estiverem commitados (§12).

## 12. Achados para o backlog (não são desta tarefa)

- 🟢 **O aceite de convite ainda conta o membro arquivado.** `organization-invitation.repository.ts:269-275`
  (`members.docs.some((docSnap) => docSnap.id !== userId)`): o dono cujo único membro foi arquivado recebe
  `409 ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS` ao aceitar convite de outra organização. Mesma regra deste helper,
  duplicada numa transação. P a M, pede teste de emulador.
- 🟢 **Os convites pendentes de um dono arquivado continuam aceitáveis.** O arquivamento mantém o vínculo do dono, e
  `isOrganizationActive` (`organization-invitation.ts:98-110`) só olha o vínculo. Acontece hoje com o dono sem membros
  e, depois desta tarefa, também com o dono de só membros arquivados. Quem aceita entra numa organização cujo dono
  não entra mais.
- 🟢 **Os quatro documentos da recusa podem dizer que perfil arquivado não conta** (§11, pergunta 4), depois do commit
  de `organization-guardrails`.

## 13. Riscos e hipóteses a medir

- **Import novo no helper.** Qualquer teste que importe o módulo real sem mockar `user.repository` passa a carregar
  `infra/database`. O levantamento da §7 achou só `organizationMembership.test.ts`; o `/develop` confirma rodando a
  suíte inteira da `apps/api`.
- **Perfil vivo com conta bloqueada.** Um membro bloqueado pelo admin (`PUT` com `disabled: true`) tem perfil vivo e
  continua contando. É o comportamento desejado: o bloqueio é reversível.
