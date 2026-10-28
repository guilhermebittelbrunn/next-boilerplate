# Plano: transferir a propriedade da organização

- Spec: [`specs/organization-ownership-transfer.md`](../../../../specs/organization-ownership-transfer.md) (`proposed`,
  levada ao ciclo por instrução de foco do usuário, como `teams-organizations`).
- Rodada autônoma do `/cycle` em 2026-10-28. Nenhuma pergunta foi feita; as decisões seguem a escada spec → padrão do
  repo → menor raio de impacto, e as ambíguas estão na §17 com a opção adotada.
- Branch: nenhuma criada nem nomeada aqui (é do `/review`).

## 0. Fontes lidas

| Fonte | Para quê |
|-------|----------|
| `specs/organization-ownership-transfer.md` | problema, corte, fora do corte, perguntas com recomendação |
| `docs/features/teams-organizations/` (spec, plano, handoff, review, report) | modelo de organização de casa, convites, decisão P18 (E2E adiado), receita do token conhecido |
| `docs/features/organization-guardrails/` e `organization-archived-member/` | `409 USERS_DELETE_ORGANIZATION_HAS_MEMBERS`, regra de perfil vivo, os dois 🟢 do convite que este corte fecha |
| `specs/BACKLOG.md:208-262` | a recomendação desta rodada e a tabela de provas |
| `.claude/cycle-policy.md` | inegociáveis e regras de decisão |
| código da §1.1 e da §5 | cada âncora conferida no working tree de 2026-10-28 |

## 1. Contexto

**Resumo.** O dono de uma equipe passa a propriedade a um membro com perfil vivo numa transação do Firestore; o antigo
dono vira membro e ganha as saídas que hoje não tem. Na mesma entrega, a organização cujo dono foi arquivado para de
aceitar convite, o aceite passa a contar só membro vivo, cinco ações de equipe entram na trilha de auditoria e a suíte
E2E ganha o fluxo de convite, aceite e transferência.

**Objetivos (o corte de MVP da spec, sem mudança de escopo).**

1. Transferir a propriedade pela tabela da equipe, com confirmação, recusas por `error.code` e sem dois donos nem
   nenhum dono sob concorrência.
2. Depois da transferência, o antigo dono sai, é removido, exclui a conta e aceita outro convite sem recusa nova. As
   quatro recusas que continuam valendo (dono com membros) indicam a transferência, nos três idiomas.
3. Prévia e aceite recusam convite de organização cujo dono foi arquivado; o aceite conta só vínculo de perfil vivo.
4. Transferência, convite enviado, convite aceito, membro removido e saída voluntária gravam evento na trilha.
5. `pnpm e2e` percorre convite, aceite e transferência com membros ligados, no job `e2e` de toda PR.

**Fora do corte** (da spec, mantido): terceiro papel e troca de papel em geral; aceite do destinatário; transferência
pelo admin da plataforma; nome da organização; aviso ao dono novo por e-mail ou sino; promoção a admin de dono com
membros; várias organizações por pessoa.

**Ordem de corte se o esforço estourar** (a spec manda): itens 1 e 2 primeiro, depois 3, depois 4, e o E2E (5) por
último. A estimativa deste plano é M no limite de G: a transferência obriga a tratar uma pessoa dona de duas
organizações (§2), o que a spec não previu e acrescenta o ajuste do expurgo da conta.

| Pergunta do guia | Resposta |
|------------------|----------|
| Apps impactados | `packages/sdk`, `apps/api`, `apps/app`, `packages/internationalization`, `apps/e2e`, docs. `apps/web`: N/A |
| Área do painel | comum (`(common)/(pages)/organization`) para a transferência; admin só nos rótulos da trilha (`(admin)/admin/(pages)/audit`) |
| Modo de produto | nenhuma diferença entre `subscription` e `simple`: a página da equipe e as rotas de organização não mudam de comportamento por modo hoje, e a transferência segue a mesma porta |
| Assinatura/plano | não depende. `requireOrganizationApi` sem a opção `plan` (`apps/api/app/(guards)/organization.ts:51-57`) |
| Dependências externas | Firestore. Nenhum serviço novo. A entrega real de e-mail de convite continua dependendo da Resend (pendência existente) |
| Env nova | nenhuma. Atrás de `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED`, como o resto de membros e convites |
| Dependência nova | nenhuma. O E2E fala com o emulador por REST, com `fetch` do Node |
| Genérico ou específico | genérico do core (subsistema de organização já está no core), em `apps/*` |

### 1.1 Âncoras da spec, conferidas

| Âncora citada | Situação em 2026-10-28 |
|---------------|------------------------|
| `organization-membership.ts:102-127` (`ownsOrganizationWithMembers`, comentário "There is no transfer of ownership") | confere |
| `account/deletion/route.ts:43` | confere |
| `users/[id]/route.ts:191-196` | confere (`:191` chama o helper, `:193` o código) |
| `organization/leave/route.ts:11-16`, `organization/members/[id]/route.ts:37-44` | conferem |
| `organization-invitation.repository.ts:252-277` | confere (comentário em `:251-254`, método em `:255-277`) |
| `utils.ts:37`, `:79`, `:161`, `:176` | conferem (pt-br); en em `:215`, `:257`, `:338`, `:353`; es nas linhas equivalentes do bloco `es` |
| `organization.ts:5`, `members.ts:4-9`, `organization.repository.ts:11`, `:24-35` | conferem (`findOwnedBy` vai até `:37`) |
| `OrganizationMembersTable.tsx:63`, `:80` | conferem |
| `organization-invitation.ts:98-110`, repositório `:229-249` | conferem |
| repositório `:269-276` | confere |
| `audit.ts:2-16` | confere; também `AuditTargetType` em `:18-22` |
| `apps/e2e/tests/` com sete arquivos, `stackEnv.ts` sem a flag | confere (`global.setup.ts` mais seis specs) |
| `docs/PRE-PRODUCTION.md:945-947` | confere |

**Desvios em relação à spec** (corrigidos aqui):

- **D1. "A suíte já lê o link com o emulador" não é verdade.** Nenhum arquivo de `apps/e2e` lê link de e-mail ou
  `oobCodes`, e o convite nem passa pelo Firebase Auth: o token é aleatório e vai pela Resend
  (`organization-invitation.ts:123-143`). Sem `RESEND_*`, `POST /organization/invitations` responde
  `503 EMAIL_NOT_CONFIGURED` antes de gravar (`organization/invitations/route.ts:53-58`). O E2E grava o convite com um
  token conhecido direto no emulador de Firestore, a mesma receita que o `/test` de `teams-organizations` usou
  (`docs/features/teams-organizations/analyze/plan.md`, §9.1). A emissão pela tela fica com os testes de rota e com a
  passada do `/test`.
- **D2. A transferência cria pessoas donas de duas organizações**, caso que a spec não trata (§2). Sem tratar, o
  expurgo da conta e a regra "dono com membros" escolheriam uma organização ao acaso, e o expurgo do antigo dono
  apagaria a equipe inteira. Isso entra no escopo como parte do item 1, não como extra.
- **D3. O rótulo do convite enviado não leva o e-mail do convidado** (§5.6). A spec permite o e-mail no campo de
  rótulo; aqui fica `null`, porque o expurgo da conta limpa rótulos por id de perfil
  (`audit-event.repository.ts:46-62`) e um convidado sem perfil no momento do convite nunca teria o endereço apagado.

## 2. A decisão central: o que muda no documento da organização

Cada perfil comum tem uma organização de casa, encontrada por `organization.ownerUserId`
(`organization.repository.ts:24-37`). Quatro lugares dependem dessa leitura:

| Consumidor | Uso |
|------------|-----|
| `joinHomeOrganization` (`organization-membership.ts:47-64`) | para onde a pessoa volta quando sai ou é removida |
| `ownsOrganizationWithMembers` (`organization-membership.ts:107-127`) | recusa da exclusão de conta e do arquivamento pelo admin |
| `memoizedHome` no expurgo (`account-erasure.ts:77-83`, `:113-161`) | o que o expurgo apaga inteiro: registros, fotos, vínculos, convites e o documento |
| `isOrganizationActive` e `isOrganizationOpen` (`organization-invitation.ts:98-110`, repositório `:230-249`) | organização dormente (dono em outra) não recebe ninguém |

**Adotado: a transferência troca `organization.ownerUserId` e os dois papéis, na mesma transação.**

A alternativa de trocar só os papéis em `organizationMember` quebra as quatro leituras: o antigo dono A, ao sair,
voltaria para a própria equipe X como dono (`findOwnedBy(A)` ainda devolveria X), e o expurgo da conta de A apagaria X
com os registros de todos. Trocar `ownerUserId` mantém a regra que o código já usa: dono é quem `ownerUserId` aponta, e
o vínculo dele aponta para a organização.

**Consequência: o dono novo pode ser dono de duas organizações.** B, ao aceitar o convite, deixou a casa dele (Y)
dormente, com `ownerUserId = B` (é como o aceite funciona hoje, `organization-invitation.repository.ts:318-327`). Depois
da transferência, B é dono de X e de Y. Ajustes:

- `organizationRepository.listOwnedBy(profileId)`: todas as organizações vivas com aquele `ownerUserId`, ordenadas
  pela data de criação do documento (`QueryDocumentSnapshot.createTime`, ascendente). Mesma consulta de campo único de
  hoje, sem índice novo.
- `findOwnedBy` continua existindo para `joinHomeOrganization` e passa a devolver a primeira de `listOwnedBy`, para a
  escolha ser determinística. Só importa num caso raro (B dono de X sem membros vivos aceita convite de Z e depois sai
  de Z); ver §17, pergunta 6.
- `ownsOrganizationWithMembers` olha todas as organizações de que a pessoa é dona. Uma organização dormente não tem
  membro vivo (o dono só sai dela sem membros vivos, e ela não aceita convite), então o resultado prático é o da
  organização atual.
- O expurgo apaga todas as organizações de que o titular é dono: registros, fotos (`uploads/org-<id>/` de cada uma),
  vínculos, convites e documentos. O vínculo atual só sai pelo `remove` quando aponta para uma organização que não é
  dele.

**O antigo dono A fica sem casa.** X deixa de ser dele. Se A sair ou for removido, `joinHomeOrganization` não acha
nada e cria uma organização nova, vazia, no mesmo lote com `create()` de hoje (`organization-member.repository.ts:37-71`).
Os registros que A criou em X ficam com X, como já acontece com os de qualquer membro. A copy de "sair da equipe"
(§7) deixa de prometer "os registros que tinha antes de entrar", porque para A isso é falso.

**Convites pendentes de X** emitidos por A continuam valendo depois da transferência: X segue ativa (o vínculo de B
aponta para X), o dono novo os vê e revoga na tabela, e o convidado vê "A convidou você", que é o que aconteceu.

## 3. Dados (Firestore)

Nenhuma coleção nova, nenhum campo novo em documento.

| Documento | Mudança |
|-----------|---------|
| `organization/{id}` | `ownerUserId` passa a mudar na transferência; `updatedAt` estampado |
| `organizationMember/{profileId}` | `role` muda de `owner` para `member` (A) e de `member` para `owner` (B); `updatedAt` estampado. `legacyClaimPending` não muda: o de B é `false` desde o aceite (`organization-invitation.repository.ts:323`), então a retrocarga nunca puxa registros antigos de B para X |
| `auditEvent` | cinco valores novos de `action` e um de `targetType` (§4) |

- **Ownership:** a transferência é recurso da organização; o guard `requireOrganizationApi` com `role: "owner"` e a
  transação conferem que quem pede é o dono daquela organização.
- **Consultas:** todas por id de documento, mais a de campo único `ownerUserId`. **Nenhum índice novo.**
- **Documentos antigos:** nada a migrar. Organizações criadas antes desta entrega têm um dono e um documento cada; a
  lista de `listOwnedBy` tem um item para elas.
- **Regras do Firestore:** sem mudança (`firestore.rules` nega acesso de cliente às três coleções).

## 4. Contrato `@repo/sdk`

```ts
// packages/sdk/src/types/organization/members.ts
export type OrganizationMemberDTO = {
    userId: string;
    role: OrganizationRole;
    email: string | null;
    displayName: string | null;
    joinedAt: string;
    /** The profile was archived or no longer exists: it cannot receive ownership. */
    archived: boolean;
};

export type TransferOrganizationOwnershipResponse = { ownerUserId: string };
```

```ts
// packages/sdk/src/actions/organization/action.ts
async transferOwnership(userId: string): Promise<TransferOrganizationOwnershipResponse> {
    const { data } = await this.client.request<Response<TransferOrganizationOwnershipResponse>>({
        url: `/organization/members/${encodeURIComponent(userId)}/ownership`,
        method: "POST",
    });
    return data.data;
}
```

```ts
// packages/sdk/src/types/audit/audit.ts
export enum AuditAction {
    // ...as 13 de hoje
    ORGANIZATION_OWNERSHIP_TRANSFER = "organization.ownership.transfer",
    ORGANIZATION_INVITATION_SEND = "organization.invitation.send",
    ORGANIZATION_INVITATION_ACCEPT = "organization.invitation.accept",
    ORGANIZATION_MEMBER_REMOVE = "organization.member.remove",
    ORGANIZATION_MEMBER_LEAVE = "organization.member.leave",
}
export enum AuditTargetType {
    USER = "user",
    ACCOUNT = "account",
    SESSION = "session",
    ORGANIZATION = "organization",
}
```

- Contexto do `Client`: `common`, como as outras ações de `organization` (`packages/sdk/src/client/index.ts:42`).
- **Quem quebra:** `archived` é campo novo obrigatório no DTO; o único produtor é
  `describeOrganizationMembers` (`organization-member-profiles.ts:37-72`), e os consumidores
  (`OrganizationMembersTable.tsx`, testes de app com fixtures de membro) só leem. As fixtures de
  `apps/app/__tests__/organizationTeamPage.test.tsx` e de `apps/api/__tests__/organizationMembersRoute.test.ts`
  ganham o campo. Os valores novos de `AuditAction` obrigam rótulo em `actionLabels` nos três idiomas: o tipo do
  dicionário indexado por `AuditAction` em `AuditListClient.tsx:50-54` falha no `typecheck` se faltar.

## 5. API (`apps/api`)

### 5.1 Rota nova

`POST /organization/members/[id]/ownership`, arquivo `app/(routes)/organization/members/[id]/ownership/route.ts`.
O aninhamento sob `[id]` tem precedente em `notifications/[id]/read/route.ts:18` (`resolveIdFromContext`).

- Envolvida em `whenOrganizationMembersEnabled` (404 antes de autenticar com a flag vazia).
- Guard `requireOrganizationApi<RouteIdParamsContext>(handler, { role: "owner" })`: membro recebe
  `403 ORGANIZATION_FORBIDDEN` (`organization.ts:63-68`), personificação recebe
  `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY` antes de tudo (`impersonation-read-only.ts:23-31`), sem sessão `401`.
- Sem corpo. Sem entrada no rate limit do proxy: não manda e-mail, é só do dono e é idempotente no efeito.

```ts
export const POST = whenOrganizationMembersEnabled(
    requireOrganizationApi<RouteIdParamsContext>(
        async (req, ctx) => {
            const targetUserId = await resolveIdFromContext(ctx);
            const { organizationId } = ctx.organization;

            if (targetUserId === ctx.subjectProfile.id) {
                return refuse("ORGANIZATION_OWNERSHIP_TARGET_SELF", HTTP_STATUS.BAD_REQUEST);
            }

            const outcome = await organizationMemberRepository.transferOwnership({
                organizationId,
                fromUserId: ctx.subjectProfile.id,
                toUserId: targetUserId,
                now: new Date(),
            });

            if (outcome.status !== "transferred") {
                const refusal = TRANSFER_REFUSALS[outcome.status];
                return refuse(refusal.code, refusal.status);
            }

            await recordAuditEvent({
                action: AuditAction.ORGANIZATION_OWNERSHIP_TRANSFER,
                actorUserId: ctx.subjectProfile.id,
                actorUid: ctx.user.uid,
                actorLabel: ctx.user.email ?? ctx.user.displayName ?? null,
                targetType: AuditTargetType.USER,
                targetUserId,
                targetLabel: outcome.targetReferenceId
                    ? await resolveUserAuditLabel(outcome.targetReferenceId)
                    : null,
                requestId: requestIdFrom(req),
            });

            return Response.json({ data: { ownerUserId: targetUserId } });
        },
        { role: "owner" }
    )
);
```

Resposta de sucesso:

```json
{ "data": { "ownerUserId": "9fQ2b1x0member" } }
```

| `error.code` | status | quando |
|--------------|--------|--------|
| `ORGANIZATION_MEMBERS_DISABLED` | 404 | flag vazia (existente) |
| `AUTH_INVALID_TOKEN` | 401 | sem sessão (existente) |
| `AUTH_REQUEST_IMPERSONATION_READ_ONLY` | 403 | admin personificando (existente) |
| `ORGANIZATION_FORBIDDEN` | 403 | quem pede é membro, ou deixou de ser dono enquanto o pedido corria (existente) |
| `ORGANIZATION_OWNERSHIP_TARGET_SELF` | 400 | alvo é o próprio dono (**novo**) |
| `ORGANIZATION_MEMBER_NOT_FOUND` | 404 | alvo não é membro desta organização: id inexistente, de outra organização, removido ou saído no meio (existente) |
| `ORGANIZATION_OWNERSHIP_TARGET_ARCHIVED` | 409 | perfil do alvo arquivado ou inexistente (**novo**) |

### 5.2 A transação

Método novo em `organization-member.repository.ts`. O repositório passa a nomear as coleções `organization` e `user`
como constantes, no molde de `organization-invitation.repository.ts:14-19`.

```ts
export type TransferOwnershipInput = {
    organizationId: string;
    fromUserId: string;
    toUserId: string;
    now: Date;
};

export type TransferOwnershipOutcome =
    | { status: "transferred"; targetReferenceId: string | null }
    | { status: "forbidden" }
    | { status: "not-member" }
    | { status: "target-archived" };

transferOwnership(input: TransferOwnershipInput): Promise<TransferOwnershipOutcome> {
    const organizationRef = this.db.collection(ORGANIZATION_COLLECTION).doc(input.organizationId);
    const fromRef = this.db.collection(this.table).doc(input.fromUserId);
    const toRef = this.db.collection(this.table).doc(input.toUserId);
    const targetProfileRef = this.db.collection(USER_COLLECTION).doc(input.toUserId);

    return this.db.runTransaction(async (tx) => {
        const [organization, from, to, targetProfile] = await tx.getAll(
            organizationRef, fromRef, toRef, targetProfileRef
        );

        const stillOwner =
            isLive(organization) &&
            organization.get("ownerUserId") === input.fromUserId &&
            isLive(from) &&
            from.get("organizationId") === input.organizationId &&
            from.get("role") === "owner";
        if (!stillOwner) return { status: "forbidden" };

        if (!(isLive(to) && to.get("organizationId") === input.organizationId)) {
            return { status: "not-member" };
        }
        if (!isLive(targetProfile)) return { status: "target-archived" };

        tx.update(organizationRef, { ownerUserId: input.toUserId, updatedAt: input.now });
        tx.update(fromRef, { role: "member", updatedAt: input.now });
        tx.update(toRef, { role: "owner", updatedAt: input.now });

        return {
            status: "transferred",
            targetReferenceId: stringOrNull(targetProfile.get("reference_id")),
        };
    });
}
```

- Lê os quatro documentos antes de qualquer escrita, num `getAll` só.
- `isLive` (existe e `deletedAt == null`) já está em `organization-invitation.repository.ts:78-80`; o `/develop`
  decide entre copiar a função de duas linhas ou exportá-la daquele arquivo. Exportar cria import entre repositórios
  que hoje não existe; copiar é o menor raio.
- A ordem das recusas segue a dos códigos: primeiro autoridade (403), depois alvo (404), depois perfil (409). Quem não é
  mais dono não descobre se o alvo existe.

### 5.3 Corridas

O Firestore serializa transações que leem e escrevem os mesmos documentos: a segunda refaz as leituras depois que a
primeira grava. O que cada par garante:

| Corrida | Garantia | Onde |
|---------|----------|------|
| A→B e A→C ao mesmo tempo | uma grava; a outra relê `ownerUserId = B` e o papel de A como `member` e devolve `403 ORGANIZATION_FORBIDDEN`. Um dono só | transação da §5.2 |
| A→B e B sai | `remove` passa a recusar vínculo de dono (abaixo). Se a transferência vem antes, a saída de B recebe `409 ORGANIZATION_OWNER_CANNOT_LEAVE`; se a saída vem antes, a transferência recebe `404 ORGANIZATION_MEMBER_NOT_FOUND` | `remove` + §5.2 |
| A→B e A remove B (outra aba) | mesma regra: um dos dois recusa | `remove` + §5.2 |
| A→B e B aceita convite de outra equipe Z | o aceite escreve o vínculo de B depois de lê-lo (`organization-invitation.repository.ts:305-327`). Se a transferência vem antes, o aceite vê B dono com A vivo e devolve `owner-has-members`; se o aceite vem antes, a transferência vê o vínculo de B em Z e devolve 404 | as duas transações |
| A→B e alguém aceita convite para X | o aceite lê `organization/X` e o vínculo do dono (`:230-249`); depois da transferência, o dono é B e o vínculo de B aponta para X, então X continua aberta | transação do aceite |
| A→B e o admin arquiva B | **não coberto por transação.** `DELETE /users/:id` confere `ownsOrganizationWithMembers(B)` fora de transação (`users/[id]/route.ts:191`). Se o arquivamento grava depois da transferência, X fica com dono arquivado: não recebe convite (§5.5), A continua membro e pode sair. Janela de milissegundos entre duas ações de pessoas diferentes; registrado como risco aceito (§18) | - |

**`remove` muda de assinatura.** Hoje devolve `boolean` e apaga qualquer vínculo da organização
(`organization-member.repository.ts:111-122`), o que deixaria X sem dono se a transferência para B gravasse entre a
checagem de papel da rota e o `remove` da saída ou da remoção de B.

```ts
export type RemoveMembershipOutcome = "removed" | "not-member" | "owner";

remove(profileId: string, organizationId: string): Promise<RemoveMembershipOutcome> {
    const ref = this.db.collection(this.table).doc(profileId);
    return this.db.runTransaction(async (tx) => {
        const current = await tx.get(ref);
        if (current.get("organizationId") !== organizationId) return "not-member";
        if (current.get("role") === "owner") return "owner";
        tx.delete(ref);
        return "removed";
    });
}
```

Consumidores:

| Arquivo | Hoje | Depois |
|---------|------|--------|
| `organization/leave/route.ts:18-24` | ignora o resultado | `"owner"` → `409 ORGANIZATION_OWNER_CANNOT_LEAVE` sem resolver casa; `"removed"` → grava evento de saída; `"not-member"` segue como hoje (resolve a casa, 204) |
| `organization/members/[id]/route.ts:46-52` | `false` → 404 | `"not-member"` → 404; `"owner"` → `409 ORGANIZATION_OWNER_CANNOT_LEAVE`; `"removed"` → grava evento de remoção, 204 |
| `account-erasure.ts:139-148` | `&&` com o boolean | `=== "removed"` |

A checagem de papel antes do `remove` nas duas rotas fica (resposta rápida e já testada); a do `remove` cobre a janela.

### 5.4 Saídas do antigo dono e o helper de posse

```ts
// organization-membership.ts
/**
 * Every organization the profile owns: its home and any handed to it. An owner who still
 * has live members in one of them would leave those people with nobody to manage them.
 * A member whose profile was archived, or no longer exists, does not count: that account
 * is disabled and does not come back on its own.
 */
export async function ownsOrganizationWithMembers(profileId: string): Promise<boolean> {
    const owned = await organizationRepository.listOwnedBy(profileId);
    if (owned.length === 0) return false;

    const memberships = await Promise.all(
        owned.map((organization) => organizationMemberRepository.listByOrganization(organization.id))
    );
    const others = memberships.flat().filter((member) => member.userId !== profileId);
    if (others.length === 0) return false;

    const profiles = await Promise.all(others.map((member) => userRepository.findById(member.userId)));
    return profiles.some((profile) => profile !== null);
}
```

```ts
// organization.repository.ts
async listOwnedBy(profileId: string): Promise<OrganizationRecord[]> {
    const snapshot = await this.db.collection(this.table).where("ownerUserId", "==", profileId).get();
    return snapshot.docs
        .filter((docSnap) => docSnap.data().deletedAt == null)
        .sort((a, b) => a.createTime.toMillis() - b.createTime.toMillis())
        .map((docSnap) => ({ id: docSnap.id, ownerUserId: String(docSnap.data().ownerUserId) }));
}

async findOwnedBy(profileId: string): Promise<OrganizationRecord | null> {
    return (await this.listOwnedBy(profileId))[0] ?? null;
}
```

O comentário de `findOwnedBy` ("Every common profile owns exactly one organization") é reescrito: a pessoa é dona da
casa e das organizações que recebeu; a casa para onde ela volta é a mais antiga.

```ts
// account-erasure.ts (pseudo-diff)
- type HomeOrganization = () => Promise<OrganizationRecord | null>;
- function memoizedHome(profileId) { lookup ??= organizationRepository.findOwnedBy(profileId) }
+ type OwnedOrganizations = () => Promise<OrganizationRecord[]>;
+ function memoizedOwned(profileId) { lookup ??= organizationRepository.listOwnedBy(profileId) }

  eraseStorage: personal + soma de deleteObjectsByPrefix(ownerPrefix(organizationOwnerSegment(id))) de cada uma
  eraseEntities: soma de entityRepository.purgeByOrganization(id) de cada uma + purgeUnscopedByUserId
  eraseOrganization:
-   membership.organizationId !== organization?.id && remove(...)
+   membership && !ownedIds.has(membership.organizationId) && (await remove(...)) === "removed"
+   para cada organização possuída: purge de vínculos, convites e do documento
```

O comentário de `account-erasure.ts:70-74` passa a falar de "as organizações de que o titular é dono". A rota de
exclusão já recusa quem tem membro vivo em qualquer uma delas, então nada de outra pessoa viva some.

Comentários a reescrever sem a frase "não há transferência" (regra de comentários: traz a regra, não o histórico):
`organization-membership.ts:102-106`, `organization/members/[id]/route.ts:37-38`,
`organization-invitation.repository.ts:251-254`, `account/deletion/route.ts:41-42`.

### 5.5 Organização sem dono ativo e membro vivo no aceite

```ts
// organization-invitation.ts, isOrganizationActive
const [ownerMembership, ownerProfile] = await Promise.all([
    organizationMemberRepository.findByUserId(organization.ownerUserId),
    userRepository.findById(organization.ownerUserId),
]);
return ownerProfile !== null && ownerMembership?.organizationId === organizationId;
```

```ts
// organization-invitation.repository.ts, isOrganizationOpen (dentro da transação)
const ownerUserId = String(organization.get("ownerUserId"));
const [ownerMembership, ownerProfile] = await tx.getAll(
    this.db.collection(MEMBER_COLLECTION).doc(ownerUserId),
    this.db.collection(USER_COLLECTION).doc(ownerUserId)
);
return isLive(ownerProfile) && ownerMembership.get("organizationId") === organizationId;

// refuseCurrentMembership: conta só vínculo de perfil vivo
const others = members.docs.filter((docSnap) => docSnap.id !== userId);
if (others.length === 0) return null;
const profiles = await tx.getAll(...others.map((docSnap) => this.db.collection(USER_COLLECTION).doc(docSnap.id)));
return profiles.some(isLive) ? { status: "owner-has-members" } : null;
```

- Prévia: dono arquivado → `400 ORGANIZATION_INVITATION_INVALID`, a mesma resposta da organização dormente
  (`invitations/preview/route.ts:42-44`). Aceite: `400 ORGANIZATION_INVITATION_INVALID` (`accept/route.ts:19-22`).
  Sem código novo: para o convidado o efeito é o mesmo, "este convite não vale mais".
- Todas as leituras continuam antes da única escrita (`tx.set` do vínculo, `:318`).
- A regra do aceite passa a ser a mesma de `ownsOrganizationWithMembers`. Fecha os dois 🟢 de
  `organization-archived-member` (§12 daquele plano).

### 5.6 Trilha de auditoria

`recordAuditEvent` nunca lança (`audit-recorder.ts:85-120`); cada rota grava depois do efeito, como as rotas de
`account/**`. Sob personificação nenhuma dessas rotas chega ao handler (todas são escrita), então `onBehalfOfUserId`
fica sempre vazio.

| Ação | Rota | Ator | Alvo (`targetType`, `targetUserId`, `targetLabel`) | Quando grava |
|------|------|------|-----------------------------------------------------|--------------|
| `organization.ownership.transfer` | `members/[id]/ownership` | dono que transferiu | `user`, B, rótulo de B pelo Auth | `transferred` |
| `organization.invitation.send` | `POST organization/invitations` | dono | `organization`, `null`, `null` | `issued` (também no reenvio), independente da entrega |
| `organization.invitation.accept` | `invitations/accept` | quem aceitou | `organization`, `null`, `null` | só `accepted`; `already-accepted` não grava de novo |
| `organization.member.remove` | `DELETE organization/members/[id]` | dono | `user`, removido, rótulo pelo Auth (perfil arquivado → `null`) | `removed` |
| `organization.member.leave` | `organization/leave` | quem saiu | `organization`, `null`, `null` | `removed` |

- Rótulo do ator: `ctx.user.email ?? ctx.user.displayName ?? null`, como em `account/sessions/revoke/route.ts:10`.
- Rótulo do alvo: `resolveUserAuditLabel(uid)` (`audit-label.ts:8-17`), que degrada para `null` se o Auth falhar. Na
  remoção, o uid sai de `userRepository.findById(userId)` (já lido hoje para o arquivamento em outros pontos; aqui é
  uma leitura a mais, só no caminho de sucesso).
- `involvedUserIds` junta ator e alvo (`audit-recorder.ts:52-54`), então o filtro por usuário do admin acha a
  transferência e a remoção pelos dois lados, e a saída e o aceite por quem agiu. O sinal de pronto da spec ("filtrada
  pelo antigo dono, mostra a transferência e a saída") sai disso.
- Sem id de organização no evento: o DTO não tem campo para isso e a spec pede só o enum. Ver §17, pergunta 7.
- Exportação do titular: os eventos entram sozinhos por `involvedUserIds` (`account-export.ts:145`), com
  `actorRole: "operator"` quando outra pessoa agiu (`account-export.ts:87-97`). Não muda aqui; §18.

### 5.7 `describeOrganizationMembers`

Ganha `archived: profiles[index] === null` por vínculo (`organization-member-profiles.ts:40-65`). Nenhuma leitura
nova: o perfil já é lido para achar o uid.

## 6. Front (`apps/app`)

Rota existente: `app/[locale]/(authenticated)/(common)/(pages)/organization/`. Sem rota nova, sem `paths.ts`, sem
`loading.tsx` novo, sem prefetch novo.

```
organization/
  (components)/
    OrganizationMembersTable.tsx      ← item "Tornar dono" no ActionsMenu da linha
    TransferOwnershipDialog.tsx       ← novo: AlertDialog controlado
  (hooks)/
    useOrganizationActions.tsx        ← transferOwnershipMutation
```

**Tabela** (`OrganizationMembersTable.tsx:73-96`):

- O `ActionsMenu` da linha recebe `items` com `{ key: "transfer", label: transferCopy.action, icon: <CrownIcon
  aria-hidden className="size-4" />, onClick: () => setTransferTarget(record) }`, no molde do "Reenviar" de
  `OrganizationInvitationsTable.tsx:73-86` (lucide, como lá). O item só aparece para linha de membro com
  `archived === false`; o "Remover" continua aparecendo para o arquivado (é por onde o dono limpa o vínculo).
- `canManage = isOwner && !isImpersonating && !transferOwnershipMutation.isPending`. Enquanto a transferência corre a
  coluna de ações some, então um segundo clique não manda outro pedido; se mandar (outra aba), a API responde
  `403 ORGANIZATION_FORBIDDEN` com toast.

**Diálogo** (`TransferOwnershipDialog.tsx`, `"use client"`): `AlertDialog` controlado (`open` e `onOpenChange`, como
`AccountEmailChangeDialog.tsx:98`), recebe `member: OrganizationMemberDTO | null`. Título, descrição com o nome do
membro (`displayName ?? email ?? members.unnamed`, interpolado com `.replace("{name}", …)` como em
`AccountSessionsPanel.tsx:94-97`), botão de cancelar e `AlertDialogAction` "Transferir", que chama a mutation e fecha.
Como o diálogo abre de um item de menu e não de um `AlertDialogTrigger`, o `onCloseAutoFocus` devolve o foco ao título
da seção "Membros" (`h2` com `tabIndex={-1}`), pelo motivo descrito em `AccountEmailChangeDialog.tsx:76-82`.

**Mutation** (`useOrganizationActions.tsx`):

```ts
const transferOwnershipMutation = useMutation({
    mutationFn: (member: OrganizationMemberDTO) =>
        apiClient.organization.transferOwnership(member.userId),
    onSuccess: async (_result, member) => {
        // The role drives which sections render: refetching it first unmounts the owner-only
        // invitations table before anything asks the API for it as a member.
        await queryClient.invalidateQueries({ queryKey: queryKeys.organization.detail() });
        queryClient.removeQueries({ queryKey: queryKeys.organization.invitations() });
        await queryClient.invalidateQueries({ queryKey: queryKeys.organization.members() });
        successAlert(organizationCopy.transfer.done.replace("{name}", nameOf(member)));
    },
    onError: (error) => errorAlert(formatClientError(error)),
});
```

Depois do sucesso, a página re-renderiza como membro (`OrganizationClient.tsx:41-46`): some o formulário de convite e
a tabela de convites, aparece "Sair da equipe", e a tabela mostra B como dono e A como membro. Os registros de `entity`
não mudam de escopo, então nenhum outro cache é tocado.

**Trilha do admin:** só os rótulos novos em `actionLabels` (`auditTrail.ts:14-28` e equivalentes). Nenhuma mudança em
`AuditListClient.tsx`.

**Estados:** loading do diálogo não existe (fecha no clique, como `LeaveOrganizationButton.tsx:56-58`); erro por toast
com `FormattedError`; impersonação esconde a ação e a API recusa de qualquer jeito.

## 7. i18n

`packages/internationalization/translations/apps/app/pages/common/organization.ts`, mesma estrutura nos três idiomas:

```ts
transfer: {
    action: "Tornar dono",
    confirmTitle: "Transferir a propriedade da equipe?",
    confirmDescription:
        "{name} passa a ser dono da equipe, e você continua nela como membro. Só o dono convida e remove pessoas, e {name} pode devolver a propriedade a você. Os registros continuam com a equipe, mesmo que você saia depois.",
    confirm: "Transferir",
    cancel: "Cancelar",
    done: "{name} agora é dono da equipe.",
},
// en: "Make owner" / "Transfer team ownership?" / "{name} becomes the team owner and you stay on as a member. Only the owner invites and removes people, and {name} can hand ownership back to you. Records stay with the team, even if you leave later." / "Transfer" / "Cancel" / "{name} is now the team owner."
// es: "Hacer dueño" / "¿Transferir la propiedad del equipo?" / "{name} pasa a ser dueño del equipo y tú sigues en él como miembro. Solo el dueño invita y quita personas, y {name} puede devolverte la propiedad. Los registros siguen con el equipo, aunque salgas después." / "Transferir" / "Cancelar" / "{name} ahora es dueño del equipo."
```

Ajustes de copy existente:

| Chave | pt-br hoje | pt-br depois |
|-------|------------|--------------|
| `description` | "...Só o dono convida e remove membros." | "...Só o dono convida e remove membros, e pode passar a propriedade a outro membro." |
| `leave.description` | "...volta para a sua conta, com os registros que tinha antes de entrar." | "Você deixa de ver os registros da equipe e volta para a sua própria conta. Os registros criados na equipe ficam com ela." |

`packages/internationalization/translations/apps/app/pages/admin/auditTrail.ts`, `list.actionLabels`:

| Ação | pt-br | en | es |
|------|-------|----|----|
| `organization.ownership.transfer` | Propriedade da equipe transferida | Team ownership transferred | Propiedad del equipo transferida |
| `organization.invitation.send` | Convite para a equipe enviado | Team invitation sent | Invitación al equipo enviada |
| `organization.invitation.accept` | Convite para a equipe aceito | Team invitation accepted | Invitación al equipo aceptada |
| `organization.member.remove` | Membro removido da equipe | Member removed from the team | Miembro quitado del equipo |
| `organization.member.leave` | Saída da equipe | Left the team | Salida del equipo |

`apiErrors` (`translations/packages/shared/utils.ts`), dois códigos novos e quatro reescritos, nos três idiomas:

| Código | pt-br |
|--------|-------|
| `ORGANIZATION_OWNERSHIP_TARGET_SELF` (novo) | Você já é o dono da equipe. |
| `ORGANIZATION_OWNERSHIP_TARGET_ARCHIVED` (novo) | Esta conta foi desativada e não pode receber a propriedade da equipe. |
| `ORGANIZATION_OWNER_CANNOT_LEAVE` | O dono não pode sair nem ser removido da equipe. Para sair, transfira antes a propriedade a outro membro. |
| `ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS` | A sua equipe ainda tem membros. Transfira a propriedade a um deles ou remova-os antes de excluir a conta. |
| `ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS` | Você é dono de uma equipe com membros. Transfira a propriedade a um deles ou remova-os antes de entrar em outra equipe. |
| `USERS_DELETE_ORGANIZATION_HAS_MEMBERS` | Este usuário é dono de uma equipe que ainda tem membros, então ele não foi arquivado. Antes, ele precisa transferir a propriedade a um dos membros, ou os membros precisam sair ou ser removidos. |

en e es seguem o mesmo sentido; o `/develop` usa a skill `i18n-sync`, e `parity.test.ts` cobre a paridade.

## 8. Autorização e segurança

| Camada | Regra |
|--------|-------|
| `whenOrganizationMembersEnabled` | flag vazia → 404 antes de autenticar |
| `requireCommonPanelApi` (dentro do guard de organização) | sem sessão 401; admin personificando 403 em toda escrita |
| `requireOrganizationApi({ role: "owner" })` | membro 403 |
| transação | dono ainda dono, alvo membro desta organização, perfil vivo; o id do alvo vem da URL e só vale se o vínculo dele apontar para a organização do contexto (nunca confiado) |
| UI | item escondido para membro, para impersonação, para a linha do dono e para perfil arquivado. Não é a proteção |

- Admin de plataforma: nunca é resolvido numa organização (`ARCHITECTURE.md`, "Dois eixos de papel"), então não
  transfere. Fora do corte por decisão da spec.
- Dado sensível: a resposta devolve só o id do dono novo; o log não ganha nada; a trilha guarda rótulo no campo de
  rótulo, que o expurgo limpa.
- Rate limit: sem mudança no proxy. A rota não manda e-mail e só o dono a chama.

## 9. Testes

Nível mais barato que prova cada coisa. Emulador só onde a transação é o objeto.

| Arquivo | Nível | Prova |
|---------|-------|-------|
| `packages/sdk/__tests__/organizationAction.test.ts` | unit | `transferOwnership` chama `POST /organization/members/<id codificado>/ownership` e devolve `data.data` |
| `apps/api/__tests__/organizationOwnershipRoute.test.ts` (novo) | rota com repositório e Auth mockados, guard real como em `organizationMembersRoute.test.ts` | 200 com o corpo; flag vazia 404; membro 403; personificação 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY`; alvo = dono 400 sem chamar o repositório; `not-member` 404; `target-archived` 409; `forbidden` 403; evento gravado com ator, alvo e rótulos; nenhum evento em recusa |
| `apps/api/__tests__/organizationMembersRoute.test.ts` | rota (ajuste) | `removeMock` passa a devolver `"removed"`/`"not-member"`/`"owner"`; `"owner"` na remoção e na saída → 409; evento de remoção e de saída só em `"removed"`; `archived` no DTO da lista |
| `apps/api/__tests__/organizationInvitationsRoute.test.ts` | rota (ajuste) | evento `organization.invitation.send` em `issued`, com `targetLabel: null`; nenhum em `recently-sent`, `limit-reached`, `503` |
| `apps/api/__tests__/invitationsRoutes.test.ts` | rota (ajuste) | prévia com dono arquivado → `400 ORGANIZATION_INVITATION_INVALID` (helper real ou mock de `isOrganizationActive`, conforme o arquivo já faz); evento `organization.invitation.accept` só em `accepted` |
| `apps/api/__tests__/organizationMembership.test.ts` | unit (ajuste) | `ownsOrganizationWithMembers` com zero, uma e duas organizações possuídas; membro vivo só na segunda → `true` |
| `apps/api/__tests__/organizationOwnerExitArchivedMember.test.ts` | rota (ajuste) | troca o mock de `findOwnedBy` por `listOwnedBy`; os seis casos continuam |
| `apps/api/__tests__/accountErasure.test.ts` | unit (ajuste) | expurgo de dono de duas organizações apaga as duas (registros, fotos, vínculos, convites, documentos); antigo dono (dono de nenhuma) só perde o vínculo |
| `apps/api/__tests__/accountErasureStorage.emulator.test.ts` | emulador (ajuste, se usar `findOwnedBy` mockado ou o formato antigo) | prefixo de cada organização possuída é varrido |
| `apps/api/__tests__/organizationInvitation.emulator.test.ts` | emulador (ajuste) | **os casos existentes precisam gravar `user/{profileId}` vivo** para dono e membros: sem isso, `isOrganizationOpen` passa a recusar todo aceite e `owner-has-members` deixa de disparar. Casos novos: dono arquivado → `invalid`; dono cujo único outro membro foi arquivado aceita convite de outra equipe |
| `apps/api/__tests__/organizationOwnershipTransfer.emulator.test.ts` (novo) | emulador; a transação é o objeto | (a) caminho feliz: `ownerUserId`, papéis e `updatedAt`; (b) `Promise.all` de A→B e A→C: exatamente um vínculo `owner` em X, `ownerUserId` igual a ele, o perdedor `forbidden`; (c) A→B contra `remove(B)`: invariante de um dono só, nos dois desfechos; (d) A→B contra o aceite de B em Z: um dono em X, B dono em X ou membro em Z; (e) depois de (a), `ownsOrganizationWithMembers(A)` falso e `listOwnedBy(B)` com X e a casa de B, na ordem de criação; (f) alvo com perfil arquivado → `target-archived`, nada escrito. O que o unit não prova: a serialização real das transações e a regra "leituras antes de escritas" do Firestore |
| `apps/app/__tests__/organizationTeamPage.test.tsx` | componente (ajuste) | "Tornar dono" aparece só para o dono, nunca na linha do dono nem de perfil arquivado, nunca sob personificação; o diálogo mostra o nome; confirmar chama a mutation uma vez; cancelar não chama |
| `apps/app/__tests__/useOrganization.test.tsx` | hook (ajuste) | sucesso da transferência: invalida `detail` antes de `members`, remove `invitations`, toast com o nome; erro vira `errorAlert` |
| `apps/e2e/__tests__/stackEnv.test.ts` | unit (ajuste) | a flag de membros vai `"true"` na `api` e na `app`, e não vai na `web` |
| `packages/internationalization/__tests__/parity.test.ts` | existente | paridade dos três idiomas e dos `apiErrors` |

A suíte de emulador não sobe o Auth (`vitest.emulator.config.mts:32-33`); nenhum teste acima depende dele.

## 10. E2E (`apps/e2e`)

**Decisão: a flag de membros fica ligada na pilha inteira da suíte**, não numa segunda pilha. Uma segunda pilha dobra o
tempo do job (a spec cita o custo). Nenhum spec atual depende do menu lateral (`grep` por "Equipe", "sidebar" e
"navigation" em `apps/e2e` volta vazio), e o modo B2C continua coberto por testes de unidade
(`apps/app/__tests__/commonNavRoutes.test.tsx`, `organizationPagesSwitch.test.tsx`,
`organizationMembersEnabled.test.ts`; `apps/api/__tests__/organizationMembersEnabled.test.ts`). Ver §17, pergunta 4.

Mudanças:

- `support/stackEnv.ts`: um bloco `MEMBERS_BLOCK = { NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED: "true" }` aplicado só
  em `api` e `app`, depois do `.env.example` (que traz a variável vazia).
- `support/firestoreEmulator.ts` (novo): REST do emulador com `fetch` e o cabeçalho `Authorization: Bearer owner`, que
  o emulador aceita como acesso administrativo. Funções: `profileIdOf(email, password)` (uid pelo
  `accounts:signInWithPassword` do emulador do Auth, perfil por `runQuery` em `user` com `reference_id`),
  `organizationIdOf(profileId)` (lê `organizationMember/<profileId>`) e `seedInvitation({ organizationId, email,
  invitedByUserId, inviterEmail })`, que sorteia o token, grava o documento com o formato de
  `organization-invitation.repository.ts:156-170` (id `sha256("<organizationId>:<email>")`,
  `tokenHash = sha256(token)`, `acceptedAt: null`, `expiresAt` em 7 dias) e devolve o token. Usa só `node:crypto`.
- `tests/organizationOwnership.spec.ts` (novo), com dois contextos de navegador:
  1. `user2@example.com` (seed, não usado por nenhum outro spec) entra e abre `/pt-br/organization`; a tabela mostra
     uma pessoa, com papel "Dono".
  2. O teste grava o convite para `e2e-team-<timestamp>@example.com` e recarrega: "Convites pendentes" lista o
     endereço.
  3. No segundo contexto, a conta convidada é criada pela tela de cadastro, como em `signUp.spec.ts`, abre
     `/pt-br/invite?token=…` e aceita; `/pt-br/organization` mostra papel "Membro" e o dono.
  4. O dono recarrega, abre o menu da linha da pessoa nova, "Tornar dono", confirma "Transferir": toast com o nome, a
     linha dele vira "Membro", some o formulário de convite e aparece "Sair da equipe".
  5. O antigo dono sai: a página mostra uma equipe com uma pessoa só, ele como "Dono" (organização nova).
  6. O dono novo recarrega: papel "Dono", formulário de convite visível. `expectAccessible` em `/pt-br/organization`
     numa das telas.
- `tests/global.setup.ts`: `/pt-br/organization` e `/pt-br/invite` entram na lista de rotas compiladas antes dos testes.
- Senha da conta nova: `SEED_PASSWORD`, como em `signUp.spec.ts` (só existe no emulador).

O que o E2E não prova: a emissão do convite pela tela e a entrega do e-mail (sem Resend na suíte, D1), tema,
responsivo e idiomas. Isso fica com os testes de rota e com a passada do `/test`.

## 11. O que o `/test` vai percorrer

Fluxos com `agent-browser`, em light, dark e 375 px, nos três idiomas (amostra de copy em cada um), com a flag ligada
na `api` e na `app`:

| Fluxo | Estado e como produzir |
|-------|------------------------|
| F1. Dono transfere a um membro | duas contas (seed `user@example.com` dono + conta QA aceita por convite com token conhecido, receita da §10) |
| F2. Antigo dono vira membro, sai e exclui a conta | depois de F1; a exclusão pede a senha da conta QA, guardada em `.claude/dev-credentials.local.md` |
| F3. Dono novo convida e remove | depois de F1 (convite pela tela com `RESEND_*` de placeholder, como o `/test` de `teams-organizations` fez, ou só a remoção) |
| F4. Item "Tornar dono" escondido | linha do dono; membro arquivado pelo admin; admin personificando o dono |
| F5. Recusas com código traduzido | alvo arquivado (arquivar entre abrir a tabela e confirmar); duas abas transferindo a pessoas diferentes; chamar a API direto com o próprio id e com id de outra organização |
| F6. Convite de dono arquivado | arquivar pelo admin um dono sem membros com convite pendente; abrir o link deslogado e logado |
| F7. Trilha do admin | filtrar pelo antigo dono: transferência e saída; pelo dono novo: transferência e aceite; rótulos nos três idiomas |
| F8. B2C | flag vazia: `/organization` 404, menu sem "Equipe", `POST …/ownership` 404 `ORGANIZATION_MEMBERS_DISABLED` |

Combinação arriscada: o `AlertDialog` novo e o `Dropdown` do antd no dark e em 375 px; foco depois de fechar o
diálogo pelo teclado.

🔒 previsíveis: entrega real do e-mail de convite (Resend); `429` real (não há rota nova no rate limit, então nada aqui
depende da `ARCJET_KEY`).

Dados de QA a listar no relatório: a conta `qa-ownership-transfer@example.com` (ou parecida) e as organizações criadas
no emulador.

## 12. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **O dono transfere a propriedade a um membro**
  Na tabela da equipe, o dono abre o menu da linha de um membro com perfil vivo, escolhe "Tornar dono" e confirma. A
  API responde `200 { data: { ownerUserId } }`; `organization.ownerUserId` passa a ser o membro, o vínculo dele vira
  `owner` e o do antigo dono vira `member`, numa transação só. A tela mostra o toast com o nome, o dono novo com o
  selo "Dono", o antigo como "Membro", e deixa de mostrar o formulário de convite e a tabela de convites para quem
  transferiu. Instrumento: teste de rota e emulador (a); E2E passo 4; `/test` F1.

- [ ] **Só o dono transfere, e nunca sob personificação**
  Um membro que chama `POST /organization/members/<id>/ownership` recebe `403 ORGANIZATION_FORBIDDEN`; sem sessão,
  `401 AUTH_INVALID_TOKEN`; um admin personificando o dono recebe `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY` e nada
  muda no banco. Na tela, o item "Tornar dono" não aparece para o membro nem para o admin personificando. Instrumento:
  teste de rota; teste de componente; `/test` F4.

- [ ] **Alvo inválido é recusado com código traduzido**
  Transferir para si mesmo responde `400 ORGANIZATION_OWNERSHIP_TARGET_SELF` sem abrir transação. Um id inexistente,
  de pessoa de outra organização, ou de alguém que saiu ou foi removido no meio responde
  `404 ORGANIZATION_MEMBER_NOT_FOUND` (manipular o id na URL não vaza se a pessoa existe). Perfil arquivado responde
  `409 ORGANIZATION_OWNERSHIP_TARGET_ARCHIVED`. As três mensagens existem em pt-br, en e es, e nenhum documento é
  escrito. Instrumento: teste de rota; emulador (f); paridade; `/test` F5.

- [ ] **Perfil arquivado não é oferecido como dono**
  A linha de um membro arquivado (nome "Sem nome", e-mail "Conta indisponível") mostra só "Remover da equipe", nunca
  "Tornar dono", e a linha do dono não tem menu. O DTO de membros traz `archived: true` para esse vínculo.
  Instrumento: teste de rota (lista) e de componente; `/test` F4.

- [ ] **Transferências simultâneas terminam com exatamente um dono**
  Duas transferências do mesmo dono para pessoas diferentes, disparadas juntas, deixam um vínculo `owner` na
  organização, igual a `ownerUserId`; a segunda recebe `403 ORGANIZATION_FORBIDDEN`. Transferência correndo com a
  remoção, a saída ou o aceite de convite do alvo em outra equipe também termina com um dono só, nunca zero nem dois.
  Duplo clique na confirmação manda um pedido: o diálogo fecha no primeiro clique e as ações somem enquanto o pedido
  corre. Instrumento: emulador (b), (c), (d); teste de componente; `/test` F5 (duas abas).

- [ ] **O antigo dono ganha as saídas**
  Depois da transferência, o antigo dono sai da equipe (`204`), é removido pelo dono novo (`204`), exclui a própria
  conta sem `409 ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS` e aceita convite de outra equipe sem
  `409 ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS`. Ao sair, ganha uma organização nova e vazia; os registros que criou
  ficam com a equipe. A exclusão da conta dele não apaga nada da equipe. Instrumento: teste de rota (membros e
  exclusão), unit do expurgo, emulador (e); E2E passo 5; `/test` F2.

- [ ] **O dono novo age como dono**
  O dono novo vê o formulário de convite e a tabela de convites (inclusive os pendentes que o antigo dono enviou),
  convida, revoga e remove pessoas, e pode transferir de volta. O dono novo não sai da equipe nem é removido enquanto
  for dono (`409 ORGANIZATION_OWNER_CANNOT_LEAVE`). Instrumento: teste de rota; E2E passo 6; `/test` F3.

- [ ] **Dono de duas organizações**
  O dono novo, que já era dono da própria casa dormente, continua recusado para excluir a conta enquanto a equipe
  tiver membro vivo, e o arquivamento pelo admin também recusa (`409 USERS_DELETE_ORGANIZATION_HAS_MEMBERS`). Quando
  ele exclui a conta sem membros vivos, as duas organizações saem com registros, fotos, vínculos e convites.
  Instrumento: unit de `ownsOrganizationWithMembers` e do expurgo; emulador (e).

- [ ] **As recusas que continuam valendo indicam a transferência**
  As mensagens de `ORGANIZATION_OWNER_CANNOT_LEAVE`, `ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS`,
  `ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS` e `USERS_DELETE_ORGANIZATION_HAS_MEMBERS` citam a transferência como
  saída, nos três idiomas, e nenhuma diz mais que a única saída é remover todos. Instrumento: paridade e leitura do
  dicionário; `/test` amostra nos três idiomas.

- [ ] **Organização com dono arquivado não recebe ninguém**
  Com o dono arquivado pelo admin, a prévia e o aceite de um convite pendente dela respondem
  `400 ORGANIZATION_INVITATION_INVALID`, deslogado e logado, e nenhum vínculo é criado. Instrumento: teste de rota
  (prévia), emulador (aceite); `/test` F6.

- [ ] **O aceite conta só membro vivo**
  O dono cujo único outro membro foi arquivado aceita convite de outra equipe e sai dela; o vínculo do arquivado não
  bloqueia. Com um membro vivo, a recusa continua `409 ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS`. Instrumento:
  emulador.

- [ ] **Ações da equipe aparecem na trilha**
  Transferência, convite enviado (inclusive reenvio), convite aceito, membro removido e saída gravam um evento cada,
  com o rótulo traduzido na tela de auditoria do admin. Filtrar pelo antigo dono mostra a transferência e a saída;
  filtrar pelo dono novo mostra a transferência e o aceite. O evento de convite enviado não guarda o e-mail do
  convidado; recusas não gravam evento; repetir o aceite do mesmo convite não grava de novo. Instrumento: testes de
  rota; `/test` F7.

- [ ] **Fork B2C não muda**
  Com `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED` vazia, `POST /organization/members/<id>/ownership` responde
  `404 ORGANIZATION_MEMBERS_DISABLED` antes de autenticar, a página da equipe continua 404 e o menu não mostra
  "Equipe". A exclusão de conta de quem nunca teve membros continua igual. Instrumento: teste de rota; testes de unidade
  existentes da `app`; `/test` F8.

- [ ] **A suíte E2E cobre o fluxo da equipe**
  `pnpm e2e` sobe a pilha com a flag ligada e percorre convite gravado no emulador, aceite pela conta convidada,
  transferência e saída do antigo dono, sem quebrar os specs existentes. O job `e2e` da PR fica verde. Instrumento:
  `pnpm e2e` local e o job da PR.

- [ ] **Tema, responsivo e foco**
  O item do menu, o diálogo de confirmação e o toast ficam legíveis em light e dark, desktop e 375 px; o diálogo abre
  com foco em "Cancelar", fecha com Esc e devolve o foco ao título "Membros". Instrumento: `/test` (agent-browser).

## 13. Blueprint: adaptação de código existente

Resumo do que muda fora do que as seções acima já mostram em código:

```ts
// organization/leave/route.ts
const outcome = await organizationMemberRepository.remove(ctx.subjectProfile.id, ctx.organization.organizationId);
if (outcome === "owner") {
    return Response.json({ error: { code: "ORGANIZATION_OWNER_CANNOT_LEAVE" } }, { status: HTTP_STATUS.CONFLICT });
}
await resolveOrganizationMembership(ctx.subjectProfile.id);
if (outcome === "removed") {
    await recordAuditEvent({ action: AuditAction.ORGANIZATION_MEMBER_LEAVE, targetType: AuditTargetType.ORGANIZATION, targetUserId: null, targetLabel: null, ... });
}
```

```ts
// organization/members/[id]/route.ts
const outcome = await organizationMemberRepository.remove(userId, organizationId);
if (outcome === "not-member") return memberNotFound();
if (outcome === "owner") return ownerCannotLeave();
const profile = await userRepository.findById(userId);
await recordAuditEvent({
    action: AuditAction.ORGANIZATION_MEMBER_REMOVE,
    targetType: AuditTargetType.USER,
    targetUserId: userId,
    targetLabel: profile ? await resolveUserAuditLabel(profile.reference_id) : null,
    ...
});
```

```ts
// organization/invitations/route.ts, depois de outcome.status === "issued"
await recordAuditEvent({ action: AuditAction.ORGANIZATION_INVITATION_SEND, targetType: AuditTargetType.ORGANIZATION, targetUserId: null, targetLabel: null, ... });

// invitations/accept/route.ts, só em outcome.status === "accepted"
await recordAuditEvent({ action: AuditAction.ORGANIZATION_INVITATION_ACCEPT, targetType: AuditTargetType.ORGANIZATION, targetUserId: null, targetLabel: null, ... });
```

Pontos de atenção:

- `whenOrganizationMembersEnabled` envolve a rota inteira (`organization-members.ts:21-28`); a rota nova segue igual.
- O hook de formatação do Biome remove import que fica sem uso entre edições: adicione o uso antes do import.
- Nenhum comentário novo cita plano, spec, etapa ou ID (regra de comentários).

## 14. Arquivos previstos e ordem de commit

| # | Commit (proposta) | Arquivos |
|---|-------------------|----------|
| 1 | `feat(sdk): transfer organization ownership and team audit actions` | `packages/sdk/src/types/organization/members.ts`, `packages/sdk/src/actions/organization/action.ts`, `packages/sdk/src/types/audit/audit.ts`, `packages/sdk/__tests__/organizationAction.test.ts` |
| 2 | `feat(api): ownership-aware organization lookups and erasure` | `organization.repository.ts`, `organization-membership.ts`, `account-erasure.ts`, `organization-member-profiles.ts`, testes `organizationMembership`, `organizationOwnerExitArchivedMember`, `accountErasure`, `accountErasureStorage.emulator` (se mudar) |
| 3 | `feat(api): transfer organization ownership in a transaction` | `organization-member.repository.ts` (`transferOwnership`, `remove`), `organization/members/[id]/ownership/route.ts`, `organization/members/[id]/route.ts`, `organization/leave/route.ts`, `account/deletion/route.ts` (comentário), `organizationOwnershipRoute.test.ts`, `organizationMembersRoute.test.ts`, `organizationOwnershipTransfer.emulator.test.ts` |
| 4 | `fix(api): refuse invitations of an archived owner and count live members on accept` | `organization-invitation.ts`, `organization-invitation.repository.ts`, `invitationsRoutes.test.ts`, `organizationInvitation.emulator.test.ts` |
| 5 | `feat(api): record team actions in the audit trail` | `organization/invitations/route.ts`, `invitations/accept/route.ts`, ajustes de `organizationInvitationsRoute.test.ts` e `invitationsRoutes.test.ts` (as chamadas de trilha de `leave`, remoção e transferência vão nos commits 3; se o `/review` preferir, move para cá com `git add -p`) |
| 6 | `feat(app): transfer ownership from the team table` | `OrganizationMembersTable.tsx`, `TransferOwnershipDialog.tsx`, `useOrganizationActions.tsx`, `organizationTeamPage.test.tsx`, `useOrganization.test.tsx` |
| 7 | `feat(internationalization): ownership transfer copy, team audit labels and owner exit errors` | `translations/apps/app/pages/common/organization.ts`, `translations/apps/app/pages/admin/auditTrail.ts`, `translations/packages/shared/utils.ts` |
| 8 | `test(e2e): team invitation, acceptance and ownership transfer` | `apps/e2e/support/stackEnv.ts`, `apps/e2e/support/firestoreEmulator.ts`, `apps/e2e/tests/organizationOwnership.spec.ts`, `apps/e2e/tests/global.setup.ts`, `apps/e2e/__tests__/stackEnv.test.ts` |
| 9 | `docs: organization ownership transfer` | `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/PRE-PRODUCTION.md`, `docs/ROPA.md`, `docs/SETUP.md`, `docs/INCIDENT-RESPONSE.md` |
| 10 | `docs(features): organization-ownership-transfer` | `docs/features/organization-ownership-transfer/**` |

Atenção ao índice: o working tree tem mudanças da auditoria em `specs/` (`BACKLOG.md`, três specs e a nota de pesquisa,
mais a spec nova não rastreada). Elas são de outro assunto (`docs(specs)`) e não entram em nenhum commit acima.
Typecheck: o commit 1 sozinho quebra o `typecheck` da `app` até o 7 (rótulos de `actionLabels`) e o da `api` até o 3
(campo `archived`). Se o `/review` exigir cada commit verde, junta o rótulo vazio no 1 ou reordena; registrado para
ele decidir.

## 15. Documentos

Medidos e corrigidos na entrega (nenhum gate lê prosa):

| Documento | Mudança |
|-----------|---------|
| `docs/ARCHITECTURE.md:67-69`, `:86-90` | `organization` guarda o dono atual, que pode mudar; a pessoa pode ser dona de mais de uma; o dono transfere a propriedade a um membro e vira membro |
| `docs/SECURITY.md:40` | tira "Não há transferência de dono"; a recusa continua para quem tem membro vivo, e a saída é transferir ou remover |
| `docs/PRE-PRODUCTION.md:945-947` e §16 | o dono com membros transfere ou remove; §16 ganha a transferência no "Para conferir depois de ligar" |
| `docs/ROPA.md` §7 | o processo passa a incluir ações de equipe (transferência, convite, aceite, remoção, saída) |
| `docs/ROPA.md` §11 (`:190`, `:193`) e §9 (`:166`) | `ownerUserId` muda na transferência; a exclusão apaga as organizações de que o titular é dono; o dono com membros transfere ou remove |
| `docs/SETUP.md:218-262` | a suíte E2E roda com membros ligados e percorre convite, aceite e transferência; o convite entra no emulador com token conhecido |
| `docs/INCIDENT-RESPONSE.md:52` | a linha do arquivamento de dono com membros cita a transferência como saída antes do arquivamento |

`specs/BACKLOG.md` não é editado: fechar os achados é do `/spec --sync`.

## 16. Pré-requisitos manuais de infra

**Nenhum.** Sem índice novo (todas as leituras são por id ou pela consulta de campo único `ownerUserId` que já existe),
sem regra do Firestore, sem env, sem serviço. As pendências que já existem para membros e convites (flag nas duas
apps, Resend, `ARCJET_KEY`, TTL opcional em `organizationInvitation.expiresAt`) continuam em
`docs/PRE-PRODUCTION.md` §16 e não reprovam esta entrega. O `/test` não deve reprovar por elas.

Requisito local, não de produção: `pnpm e2e` e `test:emulator` exigem JDK 21 (já documentado em `docs/SETUP.md`).

## 17. Perguntas em aberto (decididas pela rodada autônoma)

1. **O admin da plataforma também transfere?**
   Adotada: não (recomendação da spec). Descartada: botão no painel de usuários. O caso existe (dono que sumiu), mas é
   decisão de suporte de cada fork.

2. **O antigo dono fica como membro ou sai junto?**
   Adotada: fica como membro (recomendação da spec). Descartada: sair junto. Ficar deixa a operação reversível pelo
   dono novo e a saída já existe.

3. **A transferência pede a senha de novo?**
   Adotada: não (recomendação da spec). Descartada: reautenticar como na exclusão de conta. A ação não apaga dado e o
   dono novo pode devolvê-la.

4. **Flag de membros ligada na pilha inteira do E2E ou numa segunda pilha?**
   Adotada: pilha inteira. Descartada: segunda pilha com a flag, que dobra o tempo do job. Nenhum spec atual depende do
   menu, e o modo B2C tem testes de unidade na `app` e na `api`. Custo: o E2E deixa de passar pelo modo B2C.

5. **Rota da transferência.**
   Adotada: `POST /organization/members/[id]/ownership`, sem corpo. Descartada: `POST /organization/ownership` com
   `{ userId }` no corpo. O id na URL repete a remoção (`DELETE /organization/members/[id]`) e o aninhamento tem
   precedente em `notifications/[id]/read`.

6. **Para qual casa volta quem é dono de duas organizações e perde o vínculo?**
   Adotada: a mais antiga (`createTime` ascendente). Descartada: a mais recente, ou guardar a "casa" num campo novo.
   Só acontece se o dono novo, sem membros vivos, aceitar convite de outra equipe e depois sair; as duas são dele, e um
   campo novo não paga o caso.

7. **Gravar o id da organização no evento da trilha?**
   Adotada: não. Descartada: campo `organizationId` no `AuditEventDTO`, mapper e recorder. A spec pede só o enum, e
   ator e alvo bastam para o filtro por usuário. Reavaliar se o admin precisar filtrar por equipe.

8. **E-mail do convidado no rótulo do evento de convite enviado?**
   Adotada: não, `targetLabel: null` (desvio D3). Descartada: o e-mail no rótulo, que a spec permite. O expurgo limpa
   rótulo por id de perfil, e o convidado que ainda não tem conta nunca teria o endereço apagado da trilha.

9. **Código para o alvo igual ao dono.**
   Adotada: `400 ORGANIZATION_OWNERSHIP_TARGET_SELF`. Descartada: tratar como `404 ORGANIZATION_MEMBER_NOT_FOUND`. O
   dono sabe quem ele é, e a mensagem própria explica.

10. **Recusa por perfil arquivado: `409` com código novo ou o `404` de não membro?**
    Adotada: `409 ORGANIZATION_OWNERSHIP_TARGET_ARCHIVED` (a spec lista o caso à parte). O dono já vê a linha na
    tabela, então não há existência a esconder.

11. **Mostrar um selo "Arquivado" na tabela da equipe?**
    Adotada: não. O DTO ganha `archived` só para esconder o item "Tornar dono"; a linha continua como hoje ("Sem nome",
    "Conta indisponível"), por onde o dono remove o vínculo. Descartada: selo novo, que é copy e layout fora do corte.

12. **Dono novo recebe aviso?**
    Adotada: não (fora do corte da spec). A transferência aparece na tabela e na trilha.

## 18. Riscos e achados para o backlog

- **Arquivamento do alvo correndo com a transferência** (§5.3): `DELETE /users/:id` confere a posse fora de transação.
  A janela é de milissegundos entre ações de duas pessoas; o efeito é uma equipe com dono arquivado, que não recebe
  convite e cujos membros podem sair. Risco aceito; fechar exigiria pôr o arquivamento numa transação com os vínculos.
- **Exportação do titular chama o colega de "operator"** (`account-export.ts:93`). Para um evento de equipe em que
  outra pessoa agiu sobre o titular, `actorRole` sai `"operator"`, que é o rótulo genérico de "outra pessoa" do tipo
  (`packages/sdk/src/types/account/account.ts:87-88`). Não nomeia ninguém e não é falso; um valor `"teammate"` seria
  mais claro. 🟢 para o backlog.
- **Retrocarga pendente do antigo dono.** Se A ainda tiver `legacyClaimPending: true` ao transferir (retrocarga que
  não terminou), a retrocarga para de rodar para ele como membro (`organization-membership.ts:23-25`) e os registros
  antigos sem `organizationId` ficam sem escopo até ele ter casa de novo. Caso de borda de fork migrado; registrar no
  handoff se o `/develop` confirmar.
- **Commit 1 quebra o typecheck até os commits 3 e 7** (§14). Decisão do `/review`.
- **Esforço.** Se o `/develop` medir G, a ordem de corte é a da spec: itens 1 e 2, depois 3, 4 e por último o E2E.
