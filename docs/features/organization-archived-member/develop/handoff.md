# Handoff do `/develop`: o membro arquivado deixa de contar na organização

- **Plano:** `analyze/plan.md`
- **Data:** 2026-10-23 17:38
- **Branch:** `guilhermebittelbrunn/cycle-command-v8` (nenhuma branch criada, nada commitado, índice intocado)

## Blueprint → arquivos

| item do plano | arquivo | o que mudou |
|---------------|---------|-------------|
| §10.1 helper | `apps/api/(shared)/lib/organization-membership.ts` | import de `userRepository`; `ownsOrganizationWithMembers` filtra os vínculos que não são do dono, sai com `false` se não sobrar nenhum, lê os perfis com `userRepository.findById` em `Promise.all` e responde `true` só se algum perfil voltar. O JSDoc ganhou a regra: perfil arquivado ou ausente não fica preso na organização, porque a conta está desativada e não volta sozinha. |
| §10.2 teste | `apps/api/__tests__/organizationMembership.test.ts` | `findProfileByIdMock` no `vi.hoisted`, `vi.mock` de `@/(shared)/repositories/user.repository`, mock no laço de `mockReset` e padrão de perfil vivo no `beforeEach`. Asserções novas nos casos 2 (nenhuma leitura de perfil com o dono sozinho) e 3 (lê `profile-2`, nunca `PROFILE_ID`). Três casos novos: único outro membro arquivado → `false`; arquivado ao lado de um vivo → `true`; falha ao ler o perfil → o helper rejeita com o mesmo erro. |

O código seguiu o diff do plano. A única diferença de redação está no JSDoc ("no longer exists" no lugar de "is gone").

## Contrato

Nenhum DTO, action ou tipo mudou. A assinatura do helper continua `(profileId: string) => Promise<boolean>`.
Consumidores, sem edição:

- `apps/api/app/(routes)/account/deletion/route.ts` (em `HEAD`);
- `apps/api/app/(routes)/users/[id]/route.ts`, `DELETE` (chamada que só existe no working tree da tarefa `organization-guardrails`).

## Códigos de erro

Nenhum novo. `apiErrors` não foi tocado.

## Desvios

Nenhum. Conferi a premissa central do plano: `UserRepository` (`user.repository.ts:44`) não sobrescreve `findById`, então vale o do `BaseRepository` (`base.repository.ts:144-155`), que devolve `null` para documento inexistente e para `deletedAt` preenchido.

## Arquivos de outras tarefas

`git status --short` foi lido antes da primeira edição. Nenhum dos arquivos que já apareciam ali foi editado. Depois da implementação, as duas únicas entradas novas em `apps/` são os dois arquivos acima, e `git diff --cached --stat` mostra só o `git mv` da auditoria (`specs/teams-organizations.md => docs/features/teams-organizations/spec.md`), que já estava no índice.

## Validação

| comando | resultado |
|---------|-----------|
| `pnpm --filter api exec vitest run __tests__/organizationMembership.test.ts` | 1 arquivo, 16 testes passando (eram 13) |
| mutação: `return profiles.some(...)` trocado por `return others.length > 0`, mesmo comando | 1 falha (`is false when the only other member's profile was archived`), 15 passando; arquivo restaurado, `shasum` igual antes e depois (`34d6222…`) |
| `pnpm exec vitest run` em `accountDeletionRoute`, `usersAdminArchiveAccess`, `usersAdminAuditTrail`, `usersAdminDeleteBilling`, `organizationMemberProfiles`, `organizationMembersRoute` | 6 arquivos, 82 testes passando |
| `pnpm --filter api test` | 122 arquivos, 1646 testes passando |
| `pnpm --filter api typecheck` | sem erro |
| `pnpm check` | 1047 arquivos, nenhuma correção |

Nenhum teste da suíte quebrou com o import novo de `user.repository` no helper. Os testes de rota que importam o helper o substituem por mock.

O `test:emulator` não foi rodado: o diff não toca regra, consulta nem serialização, e as duas suítes de emulador que importam o módulo real não chamam este helper.

## A verificar no `/test`

- **A rota de exclusão de conta deixa de recusar o dono com só membros arquivados.** Os testes de rota mockam o helper inteiro, então nenhum teste medido aqui passa por `POST /account/deletion` com o helper real. Repro: um teste de rota que mocke só os repositórios (`organizationRepository.findOwnedBy`, `organizationMemberRepository.listByOrganization`, `userRepository.findById` → `null`), ou uma leitura do caminho `account/deletion/route.ts:41-48` confirmando que o `false` segue para a conferência de senha.
- **O mesmo para o `DELETE /users/:id`**, que depende do working tree de `organization-guardrails`. Mesmo repro.

## Lacunas de teste conhecidas

- Não existe teste de rota com o helper real (ver acima). O critério de aceite do plano se prova no nível do helper; a ligação com a rota fica por leitura.
- A semântica "arquivado vira `null`" não é provada neste arquivo, e sim em `baseRepository.test.ts` e na suíte de emulador `userArchivedProfile.emulator.test.ts`, como o plano registra na §7.

## Pendências e decisões em aberto

Nenhuma bloqueante. Os três achados da §12 do plano continuam abertos e fora de escopo: o aceite de convite ainda conta o membro arquivado, os convites pendentes de um dono arquivado continuam aceitáveis, e os quatro documentos da recusa podem passar a dizer que perfil arquivado não conta.
