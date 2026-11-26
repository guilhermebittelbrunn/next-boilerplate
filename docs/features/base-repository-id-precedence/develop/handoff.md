# Handoff do develop: id do documento vence no BaseRepository

## Blueprint para arquivos

| Item do plano | Arquivo | O que mudou |
|---------------|---------|-------------|
| `toEntity` | `apps/api/(shared)/repositories/base.repository.ts` | `{ id, ...raw }` virou `{ ...raw, id }`, com um comentário de duas linhas dizendo que o id do documento é a identidade usada na checagem de posse e não pode ser sobrescrito por um campo do corpo |
| `toDTO` sem mapper | mesmo arquivo | `{ id, ...(raw as DTO) }` virou `{ ...(raw as DTO), id }` |
| retorno do `create` | mesmo arquivo | `id: docRef.id` passou para depois do spread de `dataToCreate` |
| seis testes | `apps/api/__tests__/baseRepository.test.ts` | `describe("BaseRepository document id precedence")` novo, logo depois de `describe("BaseRepository.create")` |

O `findById` sem mapper já montava `{ ...data, id: snap.id }` e ficou como estava.

## Contrato

Nenhuma mudança no SDK nem em DTO. Para documentos sem `id` no corpo, que são todos os gravados pelo código atual, a saída dos repositórios continua a mesma.

## Códigos de erro novos

Nenhum. i18n não se aplica.

## Hunks compartilhados no arquivo de teste

`baseRepository.test.ts` tem três hunks no working tree:

- `@@ -573,6 +573,76 @@ describe("BaseRepository.create"`: desta tarefa (o `describe` novo inteiro).
- `@@ -806,6 +876,54 @@ describe("UserRepository.findByReferenceId"`: de `stripe-customer-lookup-mapper`.
- `@@ -883,7 +1001,7 @@ describe("UserRepository.update and delete"`: de `stripe-customer-lookup-mapper` (teste renomeado).

No `git add -p`, o primeiro hunk vai para o commit desta tarefa e os outros dois para o da tarefa do mapper. O `base.repository.ts` só tem o hunk desta tarefa.

O teste 6 (`findByReferenceId` com `id: "victim"` no corpo) só faz sentido com o `userMapper` passado no `super` de `user.repository.ts`, que é hunk da tarefa do mapper. Por isso este commit entra depois daquele.

## Desvios

Nenhum. Não foi preciso reverter `base.repository.ts` para medir a falha: o arquivo não tinha diff no working tree, então os testes rodaram contra o conteúdo do HEAD antes da edição.

## Prova de que os testes reprovam o código antigo

Comando: `npx vitest run __tests__/baseRepository.test.ts -t "document id precedence"` (em `apps/api`), com `base.repository.ts` igual ao HEAD.

| Teste | Resultado antes da correção |
|-------|-----------------------------|
| 1. `findById` com mapper | falha: `expected 'forged' to be 'e1'` |
| 2. `findAll` com mapper | falha: `expected [ 'forged' ] to deeply equal [ 'e1' ]` |
| 3. `findAll` sem mapper | falha: `expected [ 'forged' ] to deeply equal [ 'e1' ]` |
| 4. `findById` sem mapper | passa (guarda de regressão, já estava certo) |
| 5. `create` com `id` no payload | falha: `expected 'forged' to be 'doc-1'` |
| 6. `UserRepository.findByReferenceId` | falha: `expected 'victim' to be 'p1'` |

Total: 5 falharam e 1 passou. Depois da correção, o arquivo inteiro passou (70 de 70).

## Validação

| Gate | Comando | Resultado |
|------|---------|-----------|
| Arquivo de teste | `npx vitest run __tests__/baseRepository.test.ts` | 70 passaram |
| Suíte da API | `pnpm --filter api test` | 131 arquivos, 1879 testes, todos passaram |
| Emulador | `JAVA_HOME=/opt/homebrew/opt/openjdk@21 pnpm --filter api test:emulator` | 9 arquivos, 279 testes, todos passaram. As portas 8080, 9099 e 9199 estavam livres antes e continuaram livres depois |
| Typecheck | `pnpm --filter api typecheck` | sem erro |
| Lint | `pnpm check` | 1155 arquivos, nenhuma correção |

Nenhum teste existente foi alterado.

## A verificar no `/test`

Nada com browser: o diff não tem superfície visual. O `paginate` não tem teste próprio desta tarefa. Ele usa o mesmo `toDTO` que o `findAll`, então a correção vale para ele também, mas isso foi deduzido lendo o código. Se o QA quiser medir, o repro é semear um documento com `id: "forged"` e chamar `repository.paginate(...)` no mesmo `fakeDb`.

## Lacunas de teste conhecidas

- `paginate` com `id` no corpo (ver acima).
- Nenhum teste de emulador novo. A ordem do spread não depende do Firestore real.

## Pendências

A pergunta do plano continua registrada e sem bloqueio: tirar `id` do payload no `create` como defesa extra. Não foi feito, porque `CreateRequest` já omite o campo no tipo.
