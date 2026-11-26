# Relatório de QA: o id do documento vence no BaseRepository

Branch: `guilhermebittelbrunn/claude-cycle-full-pipeline` (não protegida). Nada foi commitado nesta etapa.

## Superfície de runtime

O diff só toca `apps/api/(shared)/repositories/base.repository.ts` e testes. Não há UI nem rota nova, então não subi app, API nem `agent-browser`, e não há screenshot. Os únicos processos externos foram os emuladores de Firestore e Storage, abertos e fechados pelo `firebase emulators:exec`.

## Cobertura e gates

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter api test` (sem `--force`) | 131 arquivos, 1880 testes, todos passaram. São os 1879 do handoff mais o teste de `paginate` que a revisão acrescentou |
| `npx vitest run __tests__/baseRepository.test.ts` (em `apps/api`) | 71 de 71 |
| `pnpm --filter api test:emulator` (JDK 21 via `JAVA_HOME=/opt/homebrew/opt/openjdk@21`) | 10 arquivos, 280 testes, todos passaram. São os 279 do handoff mais o teste de emulador criado aqui |
| `pnpm --filter api typecheck` | sem erro |
| `npx biome check` no arquivo de teste novo | sem correção |
| `pnpm test` (raiz, sem `--force`) | 15 de 15 tarefas, 13 do cache, saída 0 em 41,3 s. Rodaram de fato `api:test` (1880, cache miss pelo arquivo novo) e `api:test:emulator` (280, nunca cacheado). Os outros workspaces vieram do cache: app 1378, web 315, auth 201, email 209, design-system 172, internationalization 67, security 65, shared 63, analytics 41, next-config 39, payments 19, sdk 15 |

Carga da máquina no `pnpm test` da raiz, medida com `uptime`: load average 6,80 antes e 6,18 depois.

Paridade de i18n: não se aplica, o diff não toca traduções nem cria `error.code`.

## Prova de que os testes reprovam o código anterior

Medi de forma independente do handoff e da revisão. Salvei o `base.repository.ts` atual e o `git diff` dele no scratchpad, troquei o arquivo pelo conteúdo do HEAD (`git show HEAD:...`), rodei os testes e restaurei. Depois de cada troca, `cmp` contra a cópia salva saiu igual e o `git diff` do arquivo ficou idêntico ao salvo.

`npx vitest run __tests__/baseRepository.test.ts -t "document id precedence"` contra o HEAD: 6 falharam, 1 passou, 64 pulados.

| Teste | Contra o HEAD |
|-------|---------------|
| `findById` com mapper | falha: `expected 'forged' to be 'e1'` |
| `findAll` com mapper | falha: `expected [ 'forged' ] to deeply equal [ 'e1' ]` |
| `findAll` sem mapper | falha: `expected [ 'forged' ] to deeply equal [ 'e1' ]` |
| `findById` sem mapper | passa (guarda de regressão, já estava certo) |
| `paginate` | falha: `expected [ 'forged' ] to deeply equal [ 'e1' ]` |
| `create` com `id` no payload | falha: `expected 'forged' to be 'doc-1'` |
| `UserRepository.findByReferenceId` | falha: `expected 'victim' to be 'p1'` |

O resultado bate com o handoff (testes 1, 2, 3, 5 e 6 falham, o 4 passa) e com a revisão (o de `paginate` falha).

## Teste de emulador criado

Arquivo novo: `apps/api/__tests__/userProfileIdPrecedence.emulator.test.ts`, um teste.

Ele grava na coleção `user` do emulador um documento com `id: "victim-<uuid>"` no corpo e chama `userRepository.findByReferenceId` e `userRepository.findById`. Espera o id do documento nos dois e que o valor forjado não apareça em nenhuma propriedade do DTO. O `afterAll` apaga o documento pelo `reference_id`.

Por que a faixa cara aqui: o teste unitário usa um `fakeDb` que devolve o objeto semeado. Este prova o mesmo contrato contra o snapshot que o Firestore devolve de fato, na consulta por `reference_id` que os guards usam (`common-panel.ts`, `admin.ts`). Custo: cerca de 0,7 s dentro de uma suíte que já sobe o emulador.

Criei arquivo próprio em vez de estender `userProfileInstants.emulator.test.ts`, que ainda não está no git e pertence à tarefa `stripe-customer-lookup-mapper`. Assim o arquivo novo vai inteiro no commit desta tarefa, sem recorte de hunk.

Medição contra o HEAD, com a mesma troca e restauração do `base.repository.ts` (`cmp` igual e `git diff` idêntico depois):

- código atual: 1 passou;
- HEAD: 1 falhou, `expected 'victim-99ca2910-…' to be 'eNsdMHHOCYC6DGK3Rza7'`.

Para o plano de commits: o arquivo entra no commit `fix(api): let the document id win over a stored id field`. Ele depende do `userMapper` no `super` do `user.repository.ts`, que vem no commit anterior.

## Critérios de aceite

| Critério | Status | Meio |
|----------|--------|------|
| O id do documento vence em toda leitura com mapper | PASS | unit (`findById`, `findAll`, `paginate`), cada um reprovando o HEAD |
| O id do documento vence nas leituras sem mapper | PASS | unit (`findAll` reprova o HEAD; `findById` passa nos dois, como guarda). `paginate` sem mapper não tem teste próprio, mas usa o mesmo `toDTO` que o `findAll` sem mapper |
| O retorno do create traz o id gerado pelo Firestore | PASS | unit, reprova o HEAD |
| O perfil resolvido pelo guard não troca de identidade | PASS | unit e emulador, os dois reprovando o HEAD |
| Documentos normais não mudam | PASS | suíte `api` 1880/1880 e emulador 280/280, sem alteração em teste existente |

## Decisões de custo de teste

- `base.repository.ts`: os sete testes unitários do `describe("BaseRepository document id precedence")` já cobriam os três pontos corrigidos. Não criei unitário novo.
- `user.repository.ts` lido contra o Firestore real: um teste de emulador, justificado acima. Não estendi para os outros repositórios, porque todos passam pelo mesmo `toEntity`/`toDTO` da base e o snapshot real não muda nada para eles.

## Verificar no `/test`

A revisão pediu uma coisa: rodar `pnpm --filter api test` e confirmar o arquivo com 71 testes. Confirmado: 1880 na suíte e 71 de 71 no arquivo.

Também confirmei a afirmação do handoff de que cinco testes reprovavam o HEAD, e a da revisão de que o teste de `paginate` reprova a ordem antiga. As duas se mantiveram.

## Lacunas herdadas

- `paginate` com `id` no corpo (handoff): fechada pela revisão e medida aqui.
- Nenhum teste de emulador (handoff e revisão, "fora de escopo"): fechada aqui com o teste do perfil.
- `paginate` sem mapper: continua sem teste próprio. Risco baixo, porque passa pelo mesmo `toDTO` que o `findAll` sem mapper, que tem teste e reprova o HEAD.

## Ambiente

- Não subi app, web nem API.
- Antes de cada execução, as portas 8080, 9099, 9199, 4001, 4400 e 4500 estavam livres. Os emuladores de Firestore e Storage subiram e desceram sozinhos dentro do `firebase emulators:exec` (duas rodadas isoladas do arquivo novo, mais a do `test:emulator` e a do `pnpm test` da raiz). No fim, as seis portas seguiam livres.
- Nenhum dado de dev criado ou apagado. Os documentos de teste ficaram só no emulador do projeto `demo-next-boilerplate`, que morre com o processo.
- Nenhuma credencial usada.

## Estado do gate anterior

`review` está `in-progress` no `STATE.md`. Os commits da feature ainda não existem (`/cycle` não commita), então isso é o esperado nesta rodada, não um gate esquecido. O `/review` precisa fechar a própria linha e incluir o arquivo de emulador novo no commit da tarefa quando executar o plano.
