# Relatório de QA: markRead contra notificação apagada

Data: 2026-11-26, a partir das 05:12. Branch: `guilhermebittelbrunn/claude-cycle-full-pipeline` (não
protegida). Rodada do `/cycle`; nada foi commitado.

Escopo da tarefa: `apps/api` apenas. `firestore-errors.ts` ganhou `isNotFoundError`,
`notification.repository.ts` passou a absorver o NOT_FOUND em `markRead`, e a rota `read` traduz `null` em
404. O diff não tem superfície de UI; não subi app, API nem browser.

## Cobertura executada

| comando | resultado |
|---------|-----------|
| `pnpm --filter api test` | 132 arquivos, 1890 testes, todos passando (17,0 s) |
| `JAVA_HOME=/opt/homebrew/opt/openjdk@21 pnpm --filter api test:emulator` | 11 arquivos, 281 testes, todos passando (22,2 s) |
| `pnpm turbo run lint typecheck test test:emulator` (linha do job verify do CI) | 30 de 30 tasks com sucesso, exit 0; detalhe abaixo |

Os dois primeiros bateram com os números do handoff (1890 e 281). A correção do revisor
(`try/finally` em `notificationRepository.test.ts`, no caso `code: 7`) roda verde nas três execuções.

Não criei teste novo. Os quatro arquivos da tarefa já cobrem o diff: rota com mock, repositório com
`fakeDb`, helper isolado e um caso de emulador.

## Prova independente de reprovação

Salvei `notification.repository.ts` e `route.ts` do working tree, troquei os dois pela versão do `HEAD`
(`git show HEAD:<arquivo>`), rodei os testes e restaurei. `cmp` contra a cópia salva saiu sem diferença
nos dois arquivos, e `git diff --stat` voltou a mostrar +23/-7 no repositório e +3 na rota.

O `firestore-errors.ts` ficou na versão nova, porque o helper tem teste próprio.

Com o código do `HEAD`:

- `vitest run notificationRepository.test.ts notificationsRoute.test.ts firestoreErrors.test.ts`: dois
  casos reprovaram.
  - `responde 404 NOTIFICATION_NOT_FOUND quando a notificação some entre a leitura e a escrita` (rota).
  - `devolve null sem criar documento quando a notificação some antes da escrita` (repositório).
  - O caso `propaga uma falha de escrita que não é documento ausente` passou, como esperado: ele protege
    contra absorver erro demais, e o código antigo não absorvia nada. Os 7 do helper passaram porque o
    helper não foi revertido.
- Emulador, só `notificationMarkRead.emulator.test.ts`, via
  `firebase emulators:exec --only firestore,storage --project demo-next-boilerplate`: `1 failed`, com
  `promise rejected "Error: 5 NOT_FOUND: no entity to update"`. A mensagem confirma que o driver real do
  Admin SDK rejeita com o código numérico `5`, que é o que o helper testa.

Com o código restaurado, as três medições voltaram a passar dentro das suítes completas.

O teste de rota reprova só com a rota antiga, sem depender do repositório, que está mockado ali. Cada
metade da correção tem um teste que falha sem ela.

## Gate final da branch

`uptime` antes: load average 13,22 / 15,59 / 14,70. Depois: 22,64 / 17,99 / 15,68 (máquina com outros
workspaces rodando). Tempo total: 1 min 9,7 s. Sem `--force`.

`Tasks: 30 successful, 30 total`, `Cached: 24 cached, 30 total`. Executaram de fato (cache miss):
`//:lint`, `api:typecheck`, `app:typecheck`, `@repo/design-system:typecheck` e `api:test`;
`api:test:emulator` nunca vem do cache. 14 tasks de typecheck, todas com exit 0. Lint:
`Checked 1159 files in 2s. No fixes applied.` Nenhum `Timeout starting forks runner`, então rodei uma vez
só.

| workspace | arquivos | testes |
|-----------|----------|--------|
| `api` (test) | 132 | 1890 |
| `api` (test:emulator) | 11 | 281 |
| `app` | 155 | 1389 |
| `web` | 35 | 315 |
| `@repo/email` | 8 | 209 |
| `@repo/auth` | 15 | 201 |
| `@repo/design-system` | 14 | 173 |
| `@repo/internationalization` | 7 | 67 |
| `@repo/security` | 3 | 65 |
| `@repo/shared` | 5 | 63 |
| `@repo/analytics` | 3 | 41 |
| `@repo/next-config` | 2 | 39 |
| `e2e` (Vitest) | 3 | 38 |
| `@repo/payments` | 3 | 19 |
| `@repo/sdk` | 4 | 15 |

Total: 4805 testes, nenhum reprovado.

## Critérios de aceite

| critério | status | meio |
|----------|--------|------|
| Corrida entre leitura e escrita responde 404 | PASS | rota (mock), reprova com a rota do HEAD |
| `markRead` devolve `null` e não cria documento | PASS | repositório (`fakeDb`) e emulador, ambos reprovam com o repositório do HEAD |
| Só o NOT_FOUND é absorvido | PASS | repositório (`code: 7`) e helper (7 casos) |
| O 404 da corrida não revela existência | PASS | rota (mesmo `notFound()`, mesmo corpo) e leitura do código |
| Comportamentos atuais preservados | PASS | rota, `notificationsRoute.test.ts` inteiro verde |
| Escrita sob impersonação continua barrada | PASS | `notificationsRouteImpersonation.test.ts` na suíte da api |
| Sem mudança de contrato nem de i18n | PASS | `git diff` da tarefa e paridade de i18n (67 testes) |

Checklist completo em `test/criterios-aceite.md`.

## Decisões de custo de teste

- Rota `POST /notifications/[id]/read`: o teste com `vi.mock` do repositório basta, porque o que mudou na
  rota é a tradução de `null` em 404, sem infra envolvida.
- `markRead`: o teste com `fakeDb` cobre a lógica do `catch`. O caso de emulador é faixa cara e se
  justifica: só ele prova que o Admin SDK rejeita o `update` de documento ausente com `code` numérico `5`,
  e não com a string `"not-found"`. Um mock devolveria o que o teste mandasse.
- Helper `isNotFoundError`: unitário puro.

## Verificar no `/test`

1. `pnpm --filter api test` com 132 arquivos e 1890 testes: **confirmado**.
2. `pnpm --filter api test:emulator` com `notificationMarkRead.emulator.test.ts` verde: **confirmado**
   (281 testes). A reprovação contra o repositório do `HEAD` mostrou `5 NOT_FOUND` vindo do driver.

## Ambiente

Não subi app, API nem browser, porque o diff não tem superfície de UI. Os emuladores de Firestore e Storage
foram subidos e derrubados pelos próprios scripts (`test:emulator` e `firebase emulators:exec`). As portas
8080, 9099, 9199, 4001, 4400 e 4500 estavam livres antes de cada execução e continuaram livres no fim.

## Lacunas

- Corrida ponta a ponta numa única requisição HTTP (documento apagado entre `findById` e `update`):
  **continua aberta**. As duas metades estão medidas e cada uma reprova sem a correção. Reproduzir a
  corrida exigiria injetar a deleção entre as chamadas, e o custo não compensa.
- `markAllReadByUserId` com documento sumindo no meio do lote: **fora de escopo**, candidato a achado no
  `specs/reference/AUDIT.md`.
- Toast de `NOTIFICATION_NOT_FOUND` no app: **fora de escopo**, sem mudança.

## Observação sobre o gate do pipeline

O `STATE.md` mostra `review` como `in-progress`, e `git log main..HEAD` está vazio: os commits do plano
ainda não existem. Numa rodada do `/cycle` isso é esperado, porque o ciclo não commita. O `/review`
precisa fechar a etapa quando executar o plano de commits.

## Estado de dev alterado

Nenhum. Só o emulador local (projeto `demo-next-boilerplate`) recebeu dados, que morreram com o processo.
Nenhuma conta foi criada e nenhuma credencial foi usada.
