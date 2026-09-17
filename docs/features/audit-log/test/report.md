# Relatório de QA — Trilha de auditoria de ações sensíveis

- **Plano**: [`analyze/plan.md`](../analyze/plan.md) · **Handoff**: [`develop/handoff.md`](../develop/handoff.md) ·
  **Revisão**: [`review/review.md`](../review/review.md)
- **Critérios**: [`criterios-aceite.md`](criterios-aceite.md) · **Evidências**: [`screenshots/`](screenshots/)
- **Branch**: `feat/audit-log`, criada pelo `/review`. Nada foi commitado nesta etapa.
- **Rodada**: `/cycle` autônomo.

## Veredito

19 critérios. 18 aprovados, 1 não verificável sem projeto Firebase real. Nenhum reprovado, nenhum defeito
de produção encontrado.

Três achados 🟡 da revisão continuam de pé, e dois deles eu reproduzi no navegador. Nenhum reprova a
entrega.

## Gates medidos

| Gate | Comando | Resultado |
|---|---|---|
| CI completo | `pnpm turbo run lint typecheck test --force` | 24/24 tasks |
| Suíte | as 10 tasks de teste do turbo | **124 arquivos, 1227 testes, 0 falha** |
| Lint/format | `pnpm check` | 583 arquivos, 0 correção |
| Paridade i18n | `@repo/internationalization:test` | 3 arquivos, 27 testes |

Por workspace: `api` 46/511 · `app` 47/342 · `@repo/email` 7/137 · `@repo/auth` 6/62 · `@repo/shared` 4/44 ·
`web` 5/31 · `@repo/security` 3/31 · `@repo/analytics` 2/34 · `@repo/internationalization` 3/27 ·
`@repo/payments` 1/8.

Delta contra a baseline da revisão (121 arquivos, 1192 testes, 580 no lint): +3 arquivos de teste, +35
casos, +3 arquivos varridos pelo Biome.

## Testes criados

Três arquivos novos e dois existentes estendidos, todos no nível mais barato que prova o comportamento.
Nenhum exige emulador, app servindo ou qualquer processo externo.

| Arquivo | Nível | Lacuna que fecha | Casos |
|---|---|---|---|
| `apps/api/__tests__/accountAuditTrail.test.ts` | rota, com `vi.mock` do repositório, do guard e do Auth | `/account/password` e `/account/sessions/revoke` sem teste de gravação | 11 |
| `apps/api/__tests__/commonPanelImpersonationTrail.test.ts` | guard, com `vi.mock` do recorder | guard comum sem teste da instrumentação de impersonação | 8 |
| `apps/app/__tests__/auditFilters.test.tsx` | componente, com os primitivos `Select` e `DateInput` stubados | `AuditFilters` sem teste próprio e botão "Limpar" sem teste | 12 |
| `apps/api/__tests__/usersAdminAuditTrail.test.ts` (estendido) | rota | PUT de `users/[id]` com falha do Firebase Auth no meio | +1 |
| `apps/api/__tests__/auditRecorder.test.ts` (estendido) | helper | campo `status` no log das duas falhas | +3 |

O que cada um prova, além do caminho feliz:

- **`accountAuditTrail`**: ator igual ao alvo nas duas rotas; `targetType` `account` e `session`; nenhuma
  senha na serialização do evento; `requestId` vindo do cabeçalho; nada gravado quando a senha atual não
  confere, quando o Firebase recusa a escrita, quando falta credencial ou quando um admin tenta durante
  impersonação; ordem entre revogar as sessões e registrar o evento.
- **`commonPanelImpersonationTrail`**: ator, sujeito e `requestId` corretos; grava nos três métodos seguros;
  não grava quando o usuário age na própria conta, quando a escrita é recusada pela regra somente-leitura,
  quando falta credencial ou quando o perfil personificado não é comum; a gravação acontece antes do
  handler; rótulo caindo para o `displayName` quando não há e-mail.
- **`auditFilters`**: opções montadas a partir do `useListUsers`, com a opção "todos" em primeiro lugar e o
  id como rótulo de quem não tem e-mail nem nome; sentinela `__all__` virando "sem filtro"; usuário e
  período combinados; data vazia fora da query; período invertido barrado antes da API; "Limpar" devolvendo
  o formulário ao estado inicial, zerando a listagem e apagando a mensagem de validação.

### Por que nenhum teste de infra

O plano previu 10 testes, todos unitários, e a entrega respeitou isso. Mantive o padrão: o que o emulador
provaria aqui (ordenação, cursor, serialização de `Timestamp`) já foi provado na PR #17 sobre o mesmo
`paginate`, e o que ele não prova é justamente o índice composto, coberto pelo teste estático sobre
`firestore.indexes.json`. Para cada rota e módulo tocados sem teste novo:

| Rota/módulo | Por que o que existe basta |
|---|---|
| `GET /audit-events` | `auditEventsRoute.test.ts` cobre envelope, filtros repassados, 400 de cursor, 503 de índice, 403, 401 e a exportação só de `GET` |
| `AuditEventRepository` | `auditEventRepository.test.ts` cobre imutabilidade, `appendOnce`, `array-contains`, extremos do período e cursor |
| `audit-event.mapper` | `auditEventMapper.test.ts` cobre `Timestamp` para ISO, `null` preservado e arrays ausentes |
| `audit.schema` | `auditListQuery.test.ts` cobre clamp, datas malformadas e par invertido |
| `useListAuditEvents` | `useListAuditEvents.test.tsx` cobre cursor, chave por filtro e cache |
| `AuditListClient` | `auditListFiltersSurvive.test.tsx` cobre filtros montados na carga e no erro |
| `DELETE`/`PUT` de `users/[id]` | `usersAdminAuditTrail.test.ts`, agora com a falha do Auth |

## Critérios de aceite, item a item

Legenda: ✅ aprovado · ❌ reprovado · 🔒 não verificável sem infra externa.

| # | Critério | Status | Como foi verificado |
|---|---|---|---|
| 1 | Exclusão de usuário deixa registro que sobrevive | ✅ | rota (`usersAdminAuditTrail`) + e2e: `user.delete` com `targetLabel: user2@example.com` lido no Firestore depois de o perfil sumir da listagem |
| 2 | Alteração de perfil registra só os nomes dos campos | ✅ | rota + e2e: `changedFields: ["disabled"]`, sem nenhum valor no documento |
| 3 | Impersonação gera um evento por janela | ✅ | helper (`auditRecorder`, relógio controlado) + e2e: várias navegações com um documento por par e janela; a rolagem para a janela seguinte apareceu no próprio run (`…_1789642800000` e `…_1789643700000`, 15 min de diferença) |
| 4 | Trocar o personificado gera evento novo | ✅ | helper + e2e: documento novo para o segundo sujeito, o primeiro intacto |
| 5 | Revogação de sessão e troca de senha na trilha | ✅ | rota (`accountAuditTrail`) + e2e: os dois documentos gravados pela UI, ator igual ao alvo, sem senha nem hash |
| 6 | Gravação nunca derruba a ação principal | ✅ | helper + rota: `recordAuditEvent` não propaga, `DELETE` continua 204, log com `reason` e `status` e sem a mensagem do erro |
| 7 | Nenhum caminho edita ou apaga evento | ✅ | repositório + e2e: `POST`/`PUT`/`PATCH`/`DELETE` em `/audit-events` respondem 405; REST direto do cliente no Firestore responde `PERMISSION_DENIED` |
| 8 | Admin-only na API, não só na UI | ✅ | rota + e2e: 401 sem token, 403 com token comum, 403 com token comum forjando `x-user-role: admin`, usuário comum redirecionado para fora de `/admin/audit`, admin personificando idem |
| 9 | Paginação por cursor sem carregar tudo | ✅ | hook + e2e: 31 eventos, primeira página com 20 e `nextCursor`, "Carregar mais" fechando em 31 linhas únicas e o botão sumindo |
| 10 | Cursor expirado responde 400 | ✅ | rota + e2e: `?cursor=lixo` e cursor de âncora inexistente respondem `PAGINATION_CURSOR_INVALID` 400 |
| 11 | Filtro de período inclui os dois extremos | ✅ | schema + e2e: dia fechado devolvendo os eventos do dia inteiro; `from > to`, `2026-13-45` e `yesterday` em `VALIDATION_FAILED` 400; formulário barrando antes da API |
| 12 | Filtro por usuário casa ator, alvo e sujeito | ✅ | repositório + e2e: filtrar `user@example.com` devolveu as duas ações dele e a impersonação em que foi alvo; usuário e período combinados devolveram 4 eventos |
| 13 | Sem o índice, degrada e não quebra | 🔒 | Ver a nota abaixo |
| 14 | Índice declarado no repositório | ✅ | `firestoreIndexes.test.ts`, teste estático sobre o arquivo versionado |
| 15 | Cada filtro tem seu próprio cache | ✅ | hook: chaves distintas por combinação, cache reaproveitado no retorno, carregamento só para filtro inédito |
| 16 | Formulário sobrevive à consulta que dispara | ✅ | componente (`auditListFiltersSurvive`, `auditFilters`) + e2e: "Limpar" devolveu o select a "Todos os usuários" e apagou a mensagem de validação |
| 17 | Nenhuma string de UI solta | ✅ | paridade i18n (27 testes) + e2e nos três idiomas, incluindo os cinco rótulos de ação |
| 18 | Tema e viewport | ✅ | e2e: light, dark e 390x844, com a `Table` do antd conferida no escuro |
| 19 | Nenhum contrato existente quebrou | ✅ | `pnpm turbo run lint typecheck test --force` 24/24 e `pnpm check` sem correção |

### O 🔒 do critério 13

O comportamento degradado está provado nas duas pontas por teste unitário: `auditEventsRoute.test.ts`
injeta o erro real do Firestore (`9 FAILED_PRECONDITION: The query requires an index`) e verifica 503 com
`{ error: { code: "PAGINATION_INDEX_MISSING" } }`, e `auditListFiltersSurvive.test.tsx` verifica que a tela
renderiza a mensagem traduzida sem vazar `FAILED_PRECONDITION` e mantém os filtros acessíveis.

O que ninguém consegue verificar aqui é a recusa real: o emulador do Firestore serve qualquer consulta,
indexada ou não. Provar o caminho ponta a ponta exige um projeto Firebase real sem o índice publicado. Não
reproduzi com patch temporário no repositório de propósito: a revisão já fez isso e o ganho seria zero
diante do risco de deixar resquício em arquivo não rastreado, onde `git diff` não denuncia.

Isso é pré-requisito manual de infra, registrado em `docs/PRE-PRODUCTION.md` §1.2, e não reprova a entrega.

## Validação executável

Ambiente que eu subi: emuladores do Firebase (Auth 9099, Firestore 8080, UI 4001) com JDK 21, seed do repo,
API em 3002 e app em 3010. A porta 3000 estava ocupada por um processo de outro workspace e não foi tocada.
`.env.local` temporários em `apps/api` e `apps/app` apontando para o emulador, porque os `.env` do
workspace apontam para o projeto real; os dois foram apagados no fim e são ignorados pelo git.

As cinco ações foram provocadas pela interface e conferidas documento a documento no Firestore, via REST do
emulador com o token `owner`:

| Ação | Como provoquei | O que o documento tem |
|---|---|---|
| `user.update` | switch "Ativo" de `user2@example.com` em `/admin/users` | `changedFields: ["disabled"]`, nenhum valor |
| `impersonation.session` | seletor de painel, depois navegação por três telas | um documento por janela, `windowEndsAt` 15 min à frente |
| `impersonation.session` (troca de alvo) | troca de `user@` para `user2@` no seletor | documento novo, o anterior intacto |
| `account.password.change` | formulário de segurança em `/account` | `targetType: account`, ator igual ao alvo |
| `account.sessions.revoke` | "Sair de todos os dispositivos" com confirmação | `targetType: session`, ator igual ao alvo |
| `user.delete` | menu da linha em `/admin/users`, confirmação "Sim" | `targetLabel: user2@example.com`, gravado antes do soft delete |

Varri os documentos procurando senha, hash, token e as duas senhas que usei: nada. A única ocorrência da
palavra "password" na coleção é o nome da ação. Nenhum documento tem campo fora do DTO declarado.

Autorização conferida fora do navegador, com token do emulador:

    sem token                                   → 401 AUTH_INVALID_TOKEN
    token de usuário comum                      → 403 ADMIN_FORBIDDEN
    token comum forjando x-user-role: admin     → 403 ADMIN_FORBIDDEN
    POST / PUT / PATCH / DELETE /audit-events   → 405
    REST do Firestore como cliente              → PERMISSION_DENIED

E os caminhos de erro da listagem:

    ?from=2026-09-17&to=2026-09-01   → 400 VALIDATION_FAILED
    ?to=2026-13-45                   → 400 VALIDATION_FAILED
    ?to=yesterday                    → 400 VALIDATION_FAILED
    ?cursor=lixo                     → 400 PAGINATION_CURSOR_INVALID
    ?cursor=<âncora inexistente>     → 400 PAGINATION_CURSOR_INVALID

### Evidências

Em [`screenshots/`](screenshots/):

| Arquivo | O que mostra |
|---|---|
| `01-trilha-vazia-dark-ptbr.png` | trilha vazia, projeto recém-semeado |
| `02-impersonacao-painel-comum-dark-ptbr.png` | painel comum sob impersonação, de onde saem os eventos de janela |
| `03-lista-cinco-acoes-dark-ptbr.png` · `04-…-light-ptbr.png` | as cinco ações listadas, nos dois temas |
| `05-filtro-por-usuario-light-ptbr.png` | filtro por usuário trazendo ator, alvo e sujeito |
| `06-calendario-em-ingles-light-ptbr.png` | calendário e datas em inglês numa tela em português (achado 🟡) |
| `07-filtro-periodo-sem-resultado-light-ptbr.png` | período válido sem resultado: estado vazio, não erro |
| `08-periodo-invertido-light-ptbr.png` | mensagem traduzida sob o campo "Até", sem chamada à API |
| `09-carregar-mais-31-linhas-light-ptbr.png` | 31 linhas depois do "Carregar mais", sem id repetido |
| `10-lista-light-en.png` · `11-lista-light-es.png` | inglês e espanhol, incluindo sidebar, breadcrumb e os cinco rótulos |
| `12-lista-mobile-light-ptbr.png` · `13-lista-mobile-dark-ptbr.png` | 390x844, filtros em uma coluna e tabela com rolagem |
| `14-busca-em-memoria-dark-ptbr.png` | busca sobre `actorLabel`/`targetLabel` nas páginas carregadas |
| `15-comum-barrado-na-trilha-dark-ptbr.png` | usuário comum digitando `/admin/audit` e caindo fora |
| `16-trilha-final-dark-ptbr.png` | estado final da trilha ao fim do roteiro |

Console do navegador em carga fria: limpo, fora de dois avisos anteriores a esta feature, o
`scroll-behavior: smooth` do Next e o de compatibilidade do antd v5 com React 19.

## Achados confirmados

Nenhum defeito de produção. Dos três 🟡 que a revisão deixou em aberto, dois eu reproduzi:

1. **Evento de usuário excluído não é alcançável pelo filtro.** Depois de excluir `user2@example.com`, o
   select de usuário passou a listar apenas `user@example.com` e `admin@example.com`, porque as opções vêm
   do `useListUsers`. Os três eventos dele continuam na coleção e aparecem na listagem completa e na busca
   em memória, mas não há como filtrar por ele. Isso tira parte do sentido de desnormalizar
   `actorLabel`/`targetLabel` para sobreviver à exclusão.
2. **`DateInput` formata data e calendário sempre em inglês.** Em `/pt-br/admin/audit`, o campo mostra
   "September 16th, 2026" e o calendário inteiro fica em inglês
   (`06-calendario-em-ingles-light-ptbr.png`). Vale também para o `birthdate` do formulário de entidade,
   que já estava assim antes desta feature.
3. **`resolveUserAuditLabel` engole a falha sem log.** Não reproduzi: exige forçar a consulta ao Auth a
   falhar. Fica como estava na revisão.

Um quarto ponto, já registrado como 🟢 pela revisão e agora com teste: o PUT de `users/[id]` grava no
Firestore antes de chamar o Firebase Auth. Se a chamada ao Auth falhar, a alteração do Firestore permanece
e nenhum evento é gravado. O caso está coberto por `usersAdminAuditTrail.test.ts`, que documenta o
comportamento atual: a falha sobe para o chamador, o `userRepository.update` já rodou e a trilha fica sem o
registro. Não há transação entre Auth e Firestore, então corrigir é decisão de projeto, não conserto
mecânico. Não reprova a entrega.

## O que ficou sem cobertura

- **Recusa real do Firestore por índice ausente** (critério 13, 🔒). Depende de projeto Firebase real.
- **Rolagem da janela de impersonação pela UI.** Observei a segunda janela por acaso, porque o roteiro
  atravessou a fronteira dos 15 minutos. Forçar isso de propósito custaria 15 minutos de espera; o
  comportamento tem teste com relógio controlado.
- **Prefetch RSC da página** (`audit/(pages)/(home)/page.tsx`). Exercitado em toda carga de página no e2e,
  sem teste dedicado.
- **Cache de dedupe sob pressão** (`DEDUPE_CACHE_MAX`, 500 chaves). O descarte das chaves mais antigas não
  tem teste; o pior caso é uma tentativa de escrita a mais que falha com `ALREADY_EXISTS`, e a corretude
  não depende do cache.

## Ambiente e limpeza

**Portas.** Antes de subir qualquer coisa, só a 3000 estava ocupada (processo Electron de outro workspace,
não tocado). Subi emuladores, API e app; ao terminar, matei por PID cada processo e seus filhos. Conferido
no fim: 3002, 3010, 9099, 8080, 4001, 4400, 4500 e 9150 todas livres, e a 3000 ainda com o processo que já
estava lá.

**Harness temporário.** Nenhum. Não apliquei patch em código de produção. `audit-event.repository.ts`,
`audit-recorder.ts` e `audit-events/route.ts` foram conferidos pelo conteúdo, não por `git diff`, e não têm
resquício. O script que gerou os eventos sintéticos ficou em `/tmp`, fora do repositório, e foi apagado.

**Dados de QA.** Tudo no emulador `demo-next-boilerplate`, cujo estado morre com o processo. Nada a limpar
em projeto real. Para registro:

- contas do seed: `admin@example.com`, `user@example.com`, `user2@example.com`, senha `demo1234`;
- a senha de `user@example.com` foi trocada para `qaAudit2026!` durante o roteiro, e as sessões dele foram
  revogadas duas vezes;
- `user2@example.com` foi desabilitado e depois excluído;
- 25 eventos sintéticos com `targetLabel: qa-audit-log@example.com` e `requestId: qa-seed-NN`, gravados
  direto no Firestore emulado para exercitar a paginação;
- 7 eventos reais produzidos pela interface.

Os `.env.local` temporários de `apps/api` e `apps/app` foram apagados.

## Recomendação

Entrega aprovada para commit. As três pendências de infra (`docs/PRE-PRODUCTION.md` §1.2, §1.3 e §11)
continuam abertas por natureza e não bloqueiam. Os dois achados 🟡 confirmados valem item próprio no
backlog: o filtro que não alcança usuário excluído e o locale do `DateInput`, este último afetando também o
formulário de entidade.
