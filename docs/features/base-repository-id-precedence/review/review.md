# Revisão: id do documento vence no BaseRepository

Escopo: `apps/api/(shared)/repositories/base.repository.ts` (três trocas de ordem do spread) e o
`describe("BaseRepository document id precedence")` em `apps/api/__tests__/baseRepository.test.ts`
(hunk `@@ -573`). Os outros dois hunks do arquivo de teste são da `stripe-customer-lookup-mapper`, já
revisados lá, e não foram relidos.

## Branch

- Atual: `guilhermebittelbrunn/claude-cycle-full-pipeline`. Não é protegida. Regex: `BRANCH INVALIDA`.
- Proposta, herdada do plano combinado: `feat/admin-account-forms-and-session-revocation`. Regex:
  `branch OK`. A branch ainda não existe localmente.
- Nada foi criado nem renomeado: a rodada é do `/cycle`, que não cria branch. O `/review` cria a branch a
  partir da atual antes do primeiro commit.

## Revisão

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/api/__tests__/baseRepository.test.ts`: o commit 17 do plano combinado
  (`fix(api): read user profile instants as Date through a mapper`) adicionava o arquivo de teste inteiro.
  Com o hunk desta tarefa no working tree, isso levaria os sete testes de precedência para um commit em que
  a base ainda monta `{ id, ...raw }`, e cinco deles reprovariam ali. Corrigido no plano: o commit 17 passa
  a aplicar só os hunks 2 e 3 (ver "Plano de commits").

### 🟢 Sugestão / nit

- `base.repository.ts:163-166`: o `findById` sem mapper chama `snap.data()` de novo em vez de reaproveitar
  `raw` pelo `toDTO`. Já estava certo quanto à ordem (`{ ...data, id: snap.id }`) e fica fora do corte.
  Sem ação.

### ✅ OK

- As três trocas batem com o plano: `toEntity` (`base.repository.ts:72`), `toDTO` sem mapper (`:79`) e o
  retorno do `create` (`:183-186`).
- O comentário de `base.repository.ts:70-71` cumpre `.claude/rules/code-comments.md`. Diz por que a ordem
  importa (o id do documento é a identidade usada na checagem de posse), não cita artefato do fluxo, tem
  duas linhas e protege uma linha que um refactor de estilo trocaria de volta sem perceber.
- Nenhum repositório sobrescreve `toEntity` ou `toDTO`. A busca por `(toEntity|toDTO)\(\s*\w+\s*:` só
  encontra a própria base e os `toDTO` dos mappers.
- Nenhum mapper lê do raw um `id` com outro significado. Todos fazem `const { id, ...raw } = entity` e
  devolvem esse `id` (`entity.mapper.ts:11`, `audit-event.mapper.ts:25`, `notification.mapper.ts:46`,
  `organization-invitation.mapper.ts:43`, `organization-member.mapper.ts:37`, `session.mapper.ts:67`,
  `subscription-activation.mapper.ts:24`). O `userMapper.toDTO` (`user.mapper.ts:144`) copia a linha
  inteira, que agora chega com o id do documento por último.
- O `paginate` (`base.repository.ts:126-133`) monta cada item com `this.toDTO(docSnap.id, docSnap.data())`,
  o mesmo caminho do `findAll`. O `nextCursorId` usa `docSnap.id` e nunca dependeu do corpo.
- Fora da base não há leitura que monte `{ id, ...data() }`. A busca por `id, ...` e por spread de
  `.data()` em `apps/api` e `packages`, sem testes, achou só:
  - desestruturações `const { id, ...x } = ...` nos mappers, em `base.repository.ts:210` e em
    `packages/sdk/src/actions/user/user/action.ts:75`, que tiram o `id` em vez de sobrescrevê-lo;
  - `account/route.ts:90`, `userRepository.update({ id: args.ownerId, ...args.patch })`. Ali um `id` no
    `patch` trocaria o documento escrito, mas o `patch` é montado campo a campo em `account/route.ts:144-151`
    (`phone`, `avatar`, `preferences`) e não tem como carregar `id`;
  - `plan-label.repository.ts:9-21` e `organization.repository.ts:33-36`, que montam o objeto com
    `docSnap.id` explícito e não espalham o corpo.

  Zero ocorrências fora da base, então não é padrão e não há o que ampliar.

### 👁 Verificar no `/test`

Nada com browser: o diff não tem superfície visual. Todas as afirmações de comportamento do handoff estão
cobertas por teste unitário que reprova a ordem antiga, inclusive o `paginate` agora. Para o `/test` basta
rodar `pnpm --filter api test` e confirmar o arquivo com 71 testes.

## Correções aplicadas

- `apps/api/__tests__/baseRepository.test.ts`: teste novo
  `paginate keeps the document id over a stored id field`, dentro do mesmo `describe`. Semeia `e1` com
  `id: "forged"` no corpo e chama `entityRepository.listByOrganization("org-1", { limit: 20, cursorId: null })`.
  Com `toEntity` voltado temporariamente para `{ id, ...raw }`, reprova com
  `expected [ 'forged' ] to deeply equal [ 'e1' ]`. Com o código atual, passa. O arquivo foi restaurado
  logo depois e o `git diff` de `base.repository.ts` ficou idêntico ao do handoff.

## Raio de impacto

Nenhuma mudança de contrato, SDK ou DTO. Consumidores da base são os 12 repositórios que a estendem; para
documentos sem `id` no corpo, que são todos os gravados pelo código atual, a saída não muda.

## Lacunas de teste

- `paginate` com `id` no corpo: fechada nesta revisão.
- Teste de emulador: continua fora de escopo. A ordem do spread não depende do Firestore real.

## Decisões em aberto

- Tirar `id` do payload no `create` em tempo de execução, como defesa extra (pergunta do plano). Recomendação:
  não fazer agora. `CreateRequest<DTO>` já omite `id` no tipo e, com a correção, um `id` que escape para o
  corpo não chega mais ao DTO.
- Branch: a mesma decisão do plano combinado, criar `feat/admin-account-forms-and-session-revocation` a
  partir da atual antes do primeiro commit.

## Gates

| Comando | Resultado |
|---------|-----------|
| `npx vitest run __tests__/baseRepository.test.ts` (em `apps/api`) | 71 passaram (70 do handoff mais o de `paginate`) |
| `pnpm --filter api typecheck` | sem erro |
| `pnpm check` | 1155 arquivos, nenhuma correção |
| Paridade de i18n | não se aplica |
| Suíte da API e emulador | número do handoff (1879 e 279). A revisão só acrescentou um teste neste arquivo |
| Staging do arquivo de teste | simulado num índice temporário (`GIT_INDEX_FILE` no scratchpad); o índice real seguiu vazio |

## Plano de commits

Plano combinado de `docs/features/setup-docs-cleanup/review/review.md` (46 commits), agora com 48. Esta
tarefa entra como 18 e 48; do antigo 18 em diante, todos sobem uma posição. Antes do primeiro commit,
`git diff --cached --stat` tem de sair vazio (conferido nesta revisão: vazio).

### Ordem do `baseRepository.test.ts`

O arquivo tem três hunks: `@@ -573,6 +573,87` (desta tarefa), `@@ -806` e `@@ -883` (da
`stripe-customer-lookup-mapper`). O recorte fica no commit 17, o do mapper, porque é ele que vem antes. Se
o 17 levasse o arquivo inteiro, os testes de precedência entrariam num commit em que a base ainda não foi
corrigida.

- Commit 17: os demais arquivos como no plano de origem, e o teste só com os hunks 2 e 3:
  ```bash
  P=<scratchpad>/mapper-test.patch
  git diff apps/api/__tests__/baseRepository.test.ts | awk '/^@@/{n++} n!=1' > "$P"
  git apply --cached --check "$P" && git apply --cached "$P"
  ```
  Antes de commitar: `git diff --cached apps/api/__tests__/baseRepository.test.ts | grep -c "document id precedence"`
  sai `0` e `... | grep -c "hands back the stored instants"` sai `2`. Depois do commit,
  `git diff apps/api/__tests__/baseRepository.test.ts` mostra só o hunk `@@ -573`.
- Commit 18: `git add` simples dos dois arquivos.

### Trecho alterado

1 a 16: sem mudança.

17. `fix(api): read user profile instants as Date through a mapper` (mesmo commit, agora com o teste via
    `git apply --cached`, hunks 2 e 3)
18. `fix(api): let the document id win over a stored id field` (esta tarefa)
    - `apps/api/(shared)/repositories/base.repository.ts`, `apps/api/__tests__/baseRepository.test.ts`
      (o que sobrou depois do commit 17: só o hunk `@@ -573`)
    - Corpo: "The base repository spread the stored body after the document id, so a document carrying
      an id field reported that value as its identity, and ownership checks key on it. The document id now
      wins in toEntity, in toDTO without a mapper and in the value create returns."
19. a 47: os antigos 18 a 46, com o mesmo conteúdo e a mesma ordem relativa.
48. `docs(features): base-repository-id-precedence` (esta tarefa)
    - `docs/features/base-repository-id-precedence/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
      `review/review.md`, mais o que o `/test` gravar)

Varredura de segredo na pasta da feature: nenhuma ocorrência de senha, token, chave ou e-mail. Repetir no
que o `/test` gravar antes do commit 48.

Título de PR sugerido: o do plano combinado, sem mudança. Depois do último commit aprovado, o `/review`
pergunta se deve rodar `git push -u origin feat/admin-account-forms-and-session-revocation`.

### Commits realizados

(preenchido pelo orquestrador)
