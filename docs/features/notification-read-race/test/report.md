# Relatório do `/test`: notification-read-race

Rodada autônoma do `/cycle` (rodada 1 de 2), sem perguntas ao usuário. Branch `feat/audit-log-levels`,
reutilizada a pedido do usuário; nenhuma branch criada, nenhum commit, índice intocado (os 2 renomes da
auditoria de specs que já estavam preparados continuam lá). Escopo: os 5 arquivos da tarefa.

**Resultado: aprovado.** 11 critérios ✅, 2 🔒, nenhum ❌. Nenhum defeito de produção encontrado. O exit 1
intermitente do `api:test` relatado no handoff não se reproduziu em 5 execuções.

## Verificar no `/test` (lista do `review.md`)

| # | item | veredito |
|---|------|----------|
| 1 | Exit 1 intermitente do `api:test` no turbo | **Não reproduzido** em 5 execuções (detalhe abaixo). Sem evidência que ligue o fenômeno ao diff. |
| 2 | Premissa do código 5 no emulador | **Confirmado.** `pnpm --filter api test:emulator`: 12 arquivos, 284/284. O caso "rejects a batch whose document vanished with NOT_FOUND and marks the rest on the next pass" passa e afirma `code: 5` no erro do primeiro commit. |
| 3 | Notificação apagada no sino | **Confirmado** no browser, pelo botão e pelo título, em desktop e em mobile. A API respondeu `404`, a linha sumiu, nenhum toast, contador com 1 a menos. |
| 4 | "Marcar todas" pela rota HTTP | **Confirmado** no caminho sem corrida: `200 {"data":{"updated":3}}` com 3 não lidas, depois `200 {"data":{"updated":0}}`. A corrida fica com a medição do repositório (item 2). |

### Diagnóstico do exit 1 intermitente

O `--force` foi usado aqui de propósito: o fenômeno relatado é de execução, e com cache o turbo devolveria o
resultado guardado sem rodar o Vitest, o que esconderia qualquer intermitência. Os logs completos ficaram fora
do repositório, no scratchpad da sessão (`qa-turbo-1.log` a `qa-turbo-4-envup.log` e `qa-root-test.log`).

| execução | comando | condição | exit | `api:test` | `app:test` |
|----------|---------|----------|------|------------|------------|
| 1 | `pnpm turbo run test typecheck --filter=api --filter=app --force` | máquina sem processos do repo | 0 | 135 arquivos, 1966/1966 | 155 arquivos, 1405/1405 |
| 2 | idem | idem | 0 | 1966/1966 | 1405/1405 |
| 3 | idem | idem | 0 | 1966/1966 | 1405/1405 |
| 4 | idem | emuladores, `api dev` e `app dev` de pé, como na rodada do `/develop` | 0 | 1966/1966 | 1405/1405 |
| 5 | `pnpm test` (raiz, sem `--force`) | idem, com `test:emulator` reutilizando os emuladores | 0 | 1966/1966 | 1405/1405 |

As execuções 1 a 4 terminaram com `Tasks: 14 successful, 14 total` e `Cached: 0 cached, 14 total`, em 90 s a
113 s cada. Nos cinco logs, a busca por `Unhandled`, `Errors`, `Worker exited`, `ELIFECYCLE` e `ERR_` não
achou nada. O `stderr` que aparece no `api:test` vem dos testes que provocam erro de propósito
(`accountEmailRoute.test.ts`, `accountPasswordRoute.test.ts`) e aparece também nas execuções com exit 0.

O log da execução que falhou no `/develop` não existe, então a causa segue desconhecida. Uma pista: os arquivos
de backup da mutação feita pelo `/develop` (`repo.bak` às 10:10 e `hook.bak` às 10:11, no scratchpad) mostram
que ele trocou e restaurou o repositório e o hook naquela janela. Se a primeira execução do turbo coincidiu com
uma dessas trocas, o exit 1 seria artefato da própria medição, não da suíte. É hipótese: nenhum log prova a
sobreposição. Recomendação: tratar como não reproduzido e, se reaparecer no CI ou em outra rodada, guardar o
log inteiro e procurar o arquivo de teste citado no erro.

## Cobertura

| comando | o que rodou | resultado |
|---------|-------------|-----------|
| `pnpm turbo run test typecheck --filter=api --filter=app --force` (×4) | `api:test`, `app:test`, typecheck de `api` e `app` e as dependências | exit 0 nas 4; 1966/1966 e 1405/1405; typecheck sem erro |
| `pnpm --filter api test:emulator` (JDK 21) | 12 arquivos contra Firestore e Storage emulados | 284/284 |
| `vitest run --config vitest.emulator.config.mts __tests__/notificationMarkRead.emulator.test.ts` | os 2 casos do arquivo, em modo verbose | 2/2 |
| `pnpm test` (raiz, JDK 21) | todos os workspaces + `test:emulator` | exit 0, `Tasks: 15 successful, 15 total`, `12 cached` |

Contagens do `pnpm test` da raiz: security 65, shared 63, payments 19, internationalization 67, next-config 39,
email 209, auth 201, sdk 15, design-system 173, analytics 41, api 1966, app 1405, e2e 38, web 315,
`api:test:emulator` 284. Todos passaram.

A paridade de i18n roda dentro do `pnpm test` (67/67), mas a tarefa não tocou em tradução. O `pnpm check` não
foi remedido: o `/review` mediu depois da última edição e o `/test` não alterou código.

### Testes desta tarefa

Os casos novos já estavam no working tree, escritos pelo `/develop`. O `/test` não criou teste.

- `apps/api/__tests__/notificationRepository.test.ts`: corrida com Firestore falso (resolve com 2, contagem 0) e
  `PERMISSION_DENIED` relançado sem gravar.
- `apps/api/__tests__/notificationMarkRead.emulator.test.ts`: o lote real rejeita com código 5 e a passada
  seguinte marca as restantes.
- `apps/app/__tests__/useNotifications.test.tsx`: `404 NOTIFICATION_NOT_FOUND` tira a linha sem `errorAlert`
  com o contador em `CACHED_COUNT - 1`, e a marca de lista velha se mantém.

## Decisões de custo de teste

| módulo tocado | decisão |
|---------------|---------|
| `notification.repository.ts` | A lógica da passada perdida fica no teste com Firestore falso. O único caso de emulador prova o que o falso não prova: que o Admin SDK rejeita o lote com código 5 quando um documento some. É contrato de infra, então a faixa cara se justifica. |
| `useNotificationActions.ts` | Teste de hook com `apiClient` mockado, lendo o cache. Basta para o comportamento; o browser só confirmou o efeito na tela. |
| `notifications/read-all/route.ts` | Sem teste novo: a rota não mudou e só repassa o número. A chamada HTTP desta rodada conferiu o contrato. |

## Critérios de aceite

Checklist completo em `criterios-aceite.md`. Resumo:

| critério | status | meio |
|----------|--------|------|
| "Marcar todas" termina quando uma notificação some no meio do lote | ✅ | repositório (falso) + emulador |
| O lote real rejeita com código 5 | ✅ | emulador |
| Outro erro de commit continua subindo | ✅ | repositório (falso) |
| `read-all` mantém o contrato sem corrida | ✅ | HTTP |
| "Marcar como lida" numa apagada tira a linha sem aviso | ✅ | hook + browser |
| Contador com 1 a menos depois do `404` | ✅ | hook + browser |
| Título de uma apagada navega sem aviso | ✅ | browser |
| Erro que não é `NOTIFICATION_NOT_FOUND` mantém o comportamento antigo | ✅ | hook |
| Marca de lista velha sobrevive | ✅ | hook |
| Marcar como lida uma que existe continua igual | ✅ | browser |
| Notificação de outra pessoa responde 404 e some | 🔒 | leitura de código |
| Personificação mantém o botão desabilitado | 🔒 | leitura de código |
| Layout do sino no mobile | ✅ | browser |

## Evidências e2e

Conta `qa-notification-race@example.com`, criada pela tela de cadastro no emulador (onboarding com nome "QA
Race", idioma Português). As notificações extras foram semeadas pela API REST do emulador do Firestore com ids
`qa-race-1` a `qa-race-7`; `qa-race-3` recebeu o tipo `subscriptionReactivated` para ter título com link. Idioma
pt-br, tema escuro (o que o navegador abriu). Sem texto novo, um idioma e um tema bastam.

1. **Desktop, botão.** Sino com "Notificações (não lidas: 4)" e quatro linhas "Não lida". `qa-race-2` apagado no
   emulador (`DELETE` 200) e clique no "Marcar como lida" da linha dele. Log da API:
   `POST /notifications/qa-race-2/read 404`. Depois: badge "Notificações (não lidas: 3)", três linhas restantes,
   todas ainda "Não lida", nenhum `[data-sonner-toast]` no DOM em 1 s e em 5 s, e nenhum `GET /notifications`
   disparado depois do `404`.
2. **Desktop, título.** `qa-race-3` apagado e clique no link "Assinatura ativa de novo". Log:
   `POST /notifications/qa-race-3/read 404`. A navegação foi para `/pt-br/account?tab=billing`; nenhum toast nas
   6 checagens, de 1 s em 1 s; badge "Notificações (não lidas: 2)". Ao reabrir o sino, duas linhas "Boas-vindas",
   sem a de assinatura.
3. **Controle.** "Marcar como lida" na notificação de boas-vindas que existe: `POST .../read 200`, linha marcada
   como lida e mantida na lista, badge "não lidas: 1", sem toast.
4. **Rota `read-all` por HTTP**, com o cookie de sessão da conta de QA: `GET /notifications/unread-count`
   devolveu `{"data":{"count":3}}`; `POST /notifications/read-all` devolveu `200 {"data":{"updated":3}}`; a
   contagem passou a `{"data":{"count":0}}`; um segundo `read-all` devolveu `200 {"data":{"updated":0}}`.
5. **Mobile (390 x 844).** O popover ocupa a largura da tela menos a margem. Com duas não lidas, `qa-race-6` foi
   apagado e o "Marcar como lida" da linha dele clicado. Log: `POST /notifications/qa-race-6/read 404`. A linha das
   10:27 sumiu, o badge foi de 2 para 1, sem toast; a linha restante (10:26) continua "Não lida", com o botão.

Um detalhe do mobile: o primeiro clique no botão de uma linha fora da área visível do popover fechou o popover
sem disparar requisição. Depois de rolar a linha para a vista, o clique funcionou. Pelo comportamento, o
`agent-browser` clicou numa coordenada fora do popover; não há indício de defeito do produto, e o caso não foi
investigado além disso.

Screenshots em `test/e2e/` (`01-sino-4-nao-lidas.png` a `06-mobile-apos-marcar-apagada.png`). O `.gitignore`
descarta a pasta; a prova é o texto acima.

## Ambiente do e2e

Todas as portas estavam livres no início (3000, 3001, 3002, 3003, 9099, 8080, 4001, 9199, 4400, 4500). Nada
foi reutilizado do usuário.

| subido | como | derrubado |
|--------|------|-----------|
| emuladores (Auth, Firestore, Storage) | `pnpm emulators` com JDK 21, em background | `kill` do PID e dos filhos |
| `api` (3002) | `pnpm dev` em `apps/api` | `kill` do PID e dos filhos |
| `app` (3000) | `pnpm dev` em `apps/app` | `kill` do PID e dos filhos |
| `agent-browser` | sessão única, comandos em sequência | `agent-browser close` |

Depois do teardown, `lsof -ti tcp:<porta> -sTCP:LISTEN` saiu vazio para 3000, 3002, 9099, 8080, 9199, 4001,
4400, 4500 e 9150. Os `.env` temporários de `apps/api` e `apps/app`, copiados dos `.env.example`, foram
apagados. O `pnpm seed` rodou uma vez para dar ponto de partida ao emulador.

## Lacunas

| lacuna | veredito |
|--------|----------|
| Rota `read-all` sem teste novo (handoff) | Fora de escopo. A rota não mudou; a chamada HTTP desta rodada conferiu o contrato. |
| Várias passadas perdidas seguidas até `MARK_ALL_MAX_PASSES` (handoff) | Continua aberta, de baixo valor. O laço é o mesmo de antes. |
| Corrida provocada pela rota HTTP | Continua aberta. Exige apagar o documento entre a leitura e o commit; a medição no emulador cobre o comportamento. |
| Notificação de outra pessoa e personificação | Abertas (🔒). Caminhos que a tarefa não mudou, conferidos só por leitura. |
| Exit 1 intermitente do `api:test` | Não reproduzido em 5 execuções. Fica registrado com a hipótese acima. |

## Estado de dev alterado

Nenhum dado fora do emulador. A conta `qa-notification-race@example.com` e as notificações `qa-race-*` existiram
só no emulador e morreram com o processo. Nenhuma conta foi criada em projeto Firebase real, então o
`docs/PRE-PRODUCTION.md` não muda. A senha da conta foi gerada na hora, usada só na sessão e apagada; ela não
está em nenhum arquivo.
