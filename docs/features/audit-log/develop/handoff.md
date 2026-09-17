# Handoff — Trilha de auditoria de ações sensíveis

- **Plano**: [`analyze/plan.md`](../analyze/plan.md)
- **Base**: branch `provo`, `HEAD` = `c36e084`
- **Rodada**: `/cycle` autônomo. Nada foi commitado e nenhuma branch foi criada.

---

## Blueprint → arquivos

| Item do blueprint | Arquivos |
|---|---|
| B7 — escopo de log | `packages/shared/utils/helpers/log.ts` (`"audit"` no `LogScope`) |
| B1 — contrato do SDK | `packages/sdk/src/types/audit/audit.ts`, `.../audit/index.ts`, `src/types/index.ts`, `src/actions/audit/action.ts`, `src/client/index.ts` |
| B4 — repositório | `apps/api/(shared)/repositories/audit-event.repository.ts` |
| B3 — mapper | `apps/api/(shared)/mappers/audit-event.mapper.ts` |
| B6 — rota de leitura | `apps/api/app/(routes)/audit-events/route.ts` |
| §4.2 — schema de filtros | `apps/api/(shared)/validation/audit.schema.ts` |
| B5 — helper de gravação | `apps/api/(shared)/lib/audit-recorder.ts` e `apps/api/(shared)/lib/audit-label.ts` |
| B7 — `actorProfile` no guard admin | `apps/api/app/(guards)/admin.ts` |
| B7 — impersonação no guard comum | `apps/api/app/(guards)/common-panel.ts` |
| B7 — chamadas nos handlers | `apps/api/app/(routes)/users/[id]/route.ts` (PUT e DELETE), `.../account/sessions/revoke/route.ts`, `.../account/password/route.ts` |
| B7 — índice composto | `firestore.indexes.json` |
| §5.2 — chaves e tamanho de página | `apps/app/shared/lib/queryKeys.ts`, `apps/app/shared/lib/pagination.ts` |
| §5.1 a §5.5 — tela | `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/audit/` (`(hooks)/useListAuditEvents.tsx`, `(validations)/auditFiltersSchema.ts`, `(components)/AuditFilters.tsx`, `(pages)/(home)/{page,loading,AuditListClient}.tsx`) |
| §5.1 — navegação | `apps/app/.../admin/paths.ts`, `apps/app/.../admin/routes.tsx` |
| §6 — dicionário | `packages/internationalization/translations/apps/app/pages/admin/auditTrail.ts`, `.../admin/index.ts`, `.../admin/routes/index.ts` |
| §10.3 — pré-requisitos | `docs/PRE-PRODUCTION.md` (§1.2, §1.3 e o passo de retenção do log de acesso em §11) |

## Contrato

`packages/sdk` ganhou `AuditAction`, `AuditTargetType`, `AuditEventDTO` e `AuditEventListQuery`, mais a
action `audit.list(query?: PageQuery & AuditEventListQuery): Promise<PageDTO<AuditEventDTO>>`, registrada
como `audit` no `Client`. Consome hoje: `useListAuditEvents` na `apps/app` e o prefetch RSC de
`audit/(pages)/(home)/page.tsx`.

Uma assinatura existente mudou, de forma aditiva: `AdminAuthContext` passou a expor
`actorProfile: UserDTO`. Todo handler embrulhado em `requireAdminApi` recebe o campo novo; nenhum deixa de
compilar. Raio de impacto: `users/route.ts`, `users/[id]/route.ts`, `files/*` e os testes que montam o
contexto na mão.

## Códigos de erro

Nenhum código novo. A rota reusa `AUTH_INVALID_TOKEN`, `ADMIN_FORBIDDEN`, `VALIDATION_FAILED`,
`PAGINATION_CURSOR_INVALID` e `PAGINATION_INDEX_MISSING`, todos já presentes em `apiErrors` nos três
idiomas. `apiErrors` não foi tocado.

Chaves de UI novas, nos três idiomas: `apps.app.pages.admin.auditTrail` (listagem, rótulos das cinco
ações, filtros e mensagem de erro) e `apps.app.pages.admin.routes.platform.audit.list`.

---

## Desvios do plano

### 1. `UserDTO` não tem `email` nem `name` (o plano assume que tem)

O plano manda gravar `targetLabel` com `profile.email ?? profile.name ?? null`
(B7, diff de `users/[id]` DELETE) e `subjectProfile.email ?? subjectProfile.name` no guard comum. Esses
campos não existem: `UserDTO` tem `id`, `type`, `reference_id`, timestamps, `phone`, `avatar` e
`preferences`. E-mail e nome de exibição vivem no Firebase Auth.

Correção aplicada: `apps/api/(shared)/lib/audit-label.ts` resolve o rótulo por
`getAuthInstance().getUser(uid)`, devolvendo `email ?? displayName ?? null`, e engole a falha da consulta
para que um rótulo ausente não derrube a ação auditada.

No guard comum isso custaria uma consulta ao Auth em **toda** requisição personificada. Por isso
`recordImpersonationSession` só resolve o rótulo depois de passar pelo cache de dedupe: quem repete a
janela sai antes de consultar. O guard não conhece mais a resolução do rótulo, o que também reduziu a
mudança nos testes a um único `vi.mock`.

### 2. `windowEndsAt` é gravado como string ISO, não como `Timestamp`

O plano descreve o campo como `Timestamp` em B3 e passa `new Date(...)` em B5. Isso não compila:
`CreateRequest<AuditEventDTO>` tipa `windowEndsAt` como `string | null`, porque o DTO usa ISO em todos os
instantes. O campo é gravado como ISO, no mesmo padrão de `birthdate` em `EntityDTO`. Nenhuma consulta
ordena ou filtra por ele, então não há o problema de ordenação por tipo que afeta `createdAt`. O mapper
aceita as duas formas via `normalizeFirestoreInstant`.

### 3. Dois defeitos de UI encontrados na validação visual, e corrigidos

Nenhum dos dois estava no plano; os dois aparecem no caminho que o fork vê primeiro.

**O spinner do `Container` desmontava o formulário de filtros.** Com `Container loading={isLoading}`, cada
consulta nova (que é sempre disparada por um filtro) trocava toda a subárvore pelo spinner. O
`react-hook-form` perdia o estado e remontava nos valores padrão: o admin escolhia um usuário, clicava em
Aplicar e via o select voltar para "Todos os usuários" enquanto a lista filtrada carregava. Medido no
navegador: o `select` nativo escondido voltava para `__all__` com a query já filtrada por
`brtiWx8xLkV1D5jpnrTh`.

**O `loadError` do `Container` escondia os filtros junto com a tabela.** No caminho degradado (503 por
índice ausente), a tela virava só a mensagem de erro. Como é justamente o filtro por usuário que provoca o
erro, o admin ficava sem o controle para desfazê-lo e só saía recarregando a página.

Correção: `AuditListClient` deixou de passar `loading` e `loadError` ao `Container`. O spinner virou o
`loading` da própria `Table`, e o erro substitui apenas a tabela, com `LoadErrorState` abaixo dos filtros.
Coberto por `apps/app/__tests__/auditListFiltersSurvive.test.tsx`.

`EntitiesListClient` tem o mesmo `Container loading/loadError`, mas lá não há filtro: recarregar a página
resolve. Não foi alterado, para manter a mudança dentro do escopo.

### 4. Um `refine` do Zod v4 que rodava sobre dado inválido

Escrito conforme o plano (§4.2), `calendarDaySchema` encadeava `.regex()` com dois `.refine()`. O Zod v4
não interrompe a cadeia no primeiro erro, então `?to=yesterday` chegava ao
`new Date(...).toISOString()` e lançava `RangeError`, virando 500 em vez de 400. O teste do schema pegou
isso antes de qualquer execução manual. As três checagens viraram um predicado único e guardado
(`isCalendarDay`).

---

## Decisões que o plano deixou para a implementação

- **Sentinela do filtro "todos os usuários"**: `__all__`, na mesma forma de `entityGenreUnset`. O
  `HookFormSelect` recusa valor fora das opções e um select sem valor não dispara `onValueChange`.
- **Mensagem de validação do período no cliente**: chave nova
  `auditTrail.filters.validation.rangeInverted`, ancorada em `path: ["to"]` para o erro aparecer sob o
  campo que o usuário corrige. O servidor continua validando o mesmo par.
- **Ordem do `LogScope`**: `"audit"` entrou em ordem alfabética, entre `"account"` e `"auth"`.
- **`resetImpersonationDedupeCache()`** é exportado só para o teste zerar o cache entre casos. O cache é do
  processo e não tem outro ponto de limpeza.

## Pendências e bloqueios

Nenhum bloqueio. As três pendências de infra estão escritas em `docs/PRE-PRODUCTION.md`:

1. **§1.2, índice composto de `auditEvent`** (`involvedUserIds CONTAINS` + `createdAt DESCENDING`).
   Publicar com `firebase deploy --only firestore:indexes`. Sem ele, só o filtro por usuário falha.
2. **§1.3, retenção da coleção `auditEvent`.** Sem campo `expiresAt`, a TTL policy do Firestore não se
   aplica e o expurgo é manual. O texto registra que não existe prazo legal para trilha de auditoria de
   negócio no Brasil e que o Decreto 8.771/2016 art. 13 §2º aponta no sentido oposto.
3. **§11, retenção do log de acesso da plataforma.** O passo que já existia ganhou o prazo (6 meses, Marco
   Civil art. 15) e a separação entre registro de acesso, registro de conexão e trilha de auditoria.

---

## Validação

Comandos e números medidos nesta rodada, com o working tree final:

| Gate | Comando | Resultado |
|---|---|---|
| Lint/format | `pnpm check` | 580 arquivos, 0 erro |
| CI completo | `pnpm turbo run lint typecheck test --force` | 24/24 tasks |
| Suíte | `pnpm turbo run test --force` | 121 arquivos, 1192 testes, 0 falha |
| Paridade i18n | `pnpm --filter @repo/internationalization test` | 3 arquivos, 27 testes |
| Typecheck por app | `pnpm --filter api typecheck`, `pnpm --filter app typecheck` | limpos |

Baseline antes desta entrega: 112 arquivos e 1091 testes. A entrega soma 9 arquivos de teste e 101 casos.

### Testes escritos

| Arquivo | Prova |
|---|---|
| `apps/api/__tests__/auditListQuery.test.ts` | clamp do tamanho de página, cursor, `from > to` reprovado, `2026-13-45` e `2026-02-30` reprovados, extremos do dia em UTC |
| `apps/api/__tests__/auditEventMapper.test.ts` | `Timestamp` para ISO, `deletedAt` e `windowEndsAt` preservando `null`, arrays ausentes viram `[]`, entrada não-string descartada |
| `apps/api/__tests__/auditEventRepository.test.ts` | `update`/`updateBulk`/`delete`/`deleteBulk` lançam; `appendOnce` devolve `false` em `ALREADY_EXISTS` e relança o resto; `array-contains` casa ator e alvo; período inclui os dois extremos; cursor percorre cada evento uma vez |
| `apps/api/__tests__/auditEventsRoute.test.ts` | envelope da página, filtros repassados ao repositório, 400 de cursor, 503 de índice, 403 sem admin, 401 sem token, e que o módulo exporta apenas `GET` |
| `apps/api/__tests__/auditRecorder.test.ts` | `involvedUserIds` sem duplicata e sem `null`, fail-open com `logEvent("audit", "write-failed", …)`, mensagem do erro nunca logada, chave de janela estável e dedupe por par e por janela |
| `apps/api/__tests__/usersAdminAuditTrail.test.ts` | DELETE continua 204, grava `user.delete` e lê o rótulo antes do soft delete; PUT grava só nomes de campo; patch vazio e perfil inexistente não geram evento |
| `apps/api/__tests__/firestoreIndexes.test.ts` | declaração do índice de `auditEvent` no arquivo versionado |
| `apps/app/__tests__/useListAuditEvents.test.tsx` | primeira página sem cursor, cursor da segunda, filtros na `queryKey`, cache por combinação |
| `apps/app/__tests__/auditFiltersSchema.test.ts` | período invertido reprovado com a mensagem do dicionário nos três idiomas, ancorada em `to` |
| `apps/app/__tests__/auditListFiltersSurvive.test.tsx` | filtros continuam montados durante a carga e no erro; o erro substitui só a tabela e sai traduzido |

Onze arquivos de teste existentes na `apps/api` ganharam `vi.mock("@/(shared)/lib/audit-recorder", …)`,
porque o guard comum passou a depender do módulo e ele alcança o driver do Firestore no import. É a mesma
forma que esses arquivos já usam para `user.repository`.

### Validação visual

Emuladores do Firebase (`auth` + `firestore`, JDK 21) com o seed do repo, API em 3002 e app em 3010. A
porta 3000 estava ocupada por um app Electron de outro workspace, então o app subiu em 3010 com
`CORS_ORIGIN` ajustado. Todos os processos que subi foram encerrados no fim; a 3000 não foi tocada.

Fluxos percorridos como `admin@example.com` e `user@example.com`, com as cinco ações gravadas de verdade
pela UI e conferidas documento a documento no Firestore:

| Ação | Como foi provocada | Conferência |
|---|---|---|
| `user.update` | switch "Ativo" de um usuário em `/admin/users` | `changedFields: ["disabled"]`, nenhum valor no documento |
| `user.delete` | menu da linha, confirmação "Sim" | 204 sem corpo, `targetLabel: user2@example.com` gravado antes do soft delete |
| `impersonation.session` | seletor de painel do navbar, depois navegação por três telas | um documento por janela; 20 requisições continuaram valendo um documento; `windowEndsAt` 15 minutos à frente |
| `impersonation.session` (troca de alvo) | troca de `user2@` para `user@` no seletor | documento novo, o anterior intacto |
| `account.password.change` | formulário de segurança em `/account` | `targetType: account`, nenhuma senha ou hash no documento |
| `account.sessions.revoke` | "Sair de todos os dispositivos" com confirmação | `targetType: session`, ator igual ao alvo |

Estados e recortes conferidos, com screenshots em `develop/screenshots/`:

| Screenshot | O que mostra |
|---|---|
| `01-empty-dark-ptbr.png` | trilha vazia, projeto limpo |
| `02-list-dark-ptbr.png`, `03-list-light-ptbr.png`, `09-list-dark-ptbr.png` | listagem nos dois temas, incluindo a `Table` do antd no escuro |
| `04-loadmore-light-ptbr-full.png` | 31 linhas depois do "Carregar mais", sem id repetido, botão some quando o cursor volta `null` |
| `05-filter-invalid-range-light-ptbr.png` | período invertido barrado no formulário, antes de chamar a API |
| `06-filter-no-results-light-ptbr.png` | período válido sem resultado, estado vazio e não erro |
| `07-filter-by-user-light-ptbr.png` | filtro por usuário com o índice servido pelo emulador |
| `08-index-missing-degraded-light-ptbr.png` | 503 `PAGINATION_INDEX_MISSING` traduzido, com os filtros ainda acessíveis |
| `10-list-mobile-dark-ptbr.png`, `14-list-mobile-light-ptbr.png` | 390x844, filtros em uma coluna e tabela com rolagem horizontal |
| `11-list-dark-en.png`, `12-list-dark-es.png` | inglês e espanhol, incluindo sidebar, breadcrumb, colunas e os cinco rótulos de ação |
| `13-search-dark-ptbr.png` | busca em memória sobre `actorLabel`/`targetLabel` |

Buscar por um valor que só existe na segunda página mostrou o aviso do componente compartilhado
("Nada encontrado no que já foi carregado. Carregue mais para continuar a busca."), que é o comportamento
projetado de `searchMissesPendingPages`.

Console do navegador limpo em carga fria nas três rotas. Os avisos de hidratação que apareceram no meio da
sessão vieram do Fast Refresh durante as edições e não reproduzem em carga nova.

### Caminho degradado sem o índice

O emulador serve qualquer consulta, indexada ou não, então ele não reproduz a recusa. A prova foi dividida
em duas partes, e as duas passaram:

- **Servidor**: `auditEventsRoute.test.ts` injeta o erro real do Firestore
  (`9 FAILED_PRECONDITION: The query requires an index`) e verifica 503 com
  `{ error: { code: "PAGINATION_INDEX_MISSING" } }`. Um erro desconhecido continua propagando, em vez de
  virar lista vazia.
- **Navegador**: forcei o mesmo erro no repositório por alguns minutos, com o app rodando, e percorri o
  filtro por usuário. A API respondeu 503 (não 500), a tela mostrou "A listagem está indisponível no
  momento. Tente de novo em instantes." com o `requestId`, e os filtros continuaram utilizáveis. O patch
  temporário foi revertido e `git diff` do arquivo está vazio.

---

## Lacunas conhecidas para o `/test`

- **A rota `/account/sessions/revoke` não tem teste de gravação.** `usersAdminAuditTrail.test.ts` cobre os
  dois handlers de `users/[id]`; as duas rotas de `account` foram provadas só no navegador.
- **O guard comum não tem teste da instrumentação.** `commonPanelGuard.test.ts` agora mocka o recorder, e
  nenhum caso verifica que ele é chamado quando `isImpersonating` é verdadeiro e ignorado quando não é.
- **A `AuditFilters` não tem teste próprio.** A montagem das opções do select a partir de `useListUsers` e
  a conversão do sentinela `__all__` para "sem filtro" foram vistas só no navegador.
- **O botão "Limpar" não tem teste.** Ele reseta o formulário e chama `onApply({})`; conferido à mão.

## Achados fora do escopo

- **`DateInput` formata a data sempre em inglês.** `packages/design-system/components/ui/date-input.tsx:83`
  chama `format(selected, "PPP")` do `date-fns` sem locale, então o campo mostra "September 1st, 2026"
  numa tela em português. Vale para o `birthdate` do formulário de entidade também, que já estava no repo.
  Corrigir exige passar o locale ao componente compartilhado.
- **`FormattedError` devolve a mensagem crua de um `Error` comum.** Só o erro do axios cai no mapa de
  `apiErrors`; qualquer outro vira copy visível. Não afeta o caminho real, em que o erro sempre vem do
  SDK, mas é uma forma de vazar texto interno para a tela.
- **O placeholder do filtro de usuário e o rótulo da opção "todos" têm o mesmo texto.** Fica impossível
  distinguir "nenhum usuário escolhido" de "todos os usuários escolhido" só olhando. Não incomodou em
  uso, mas foi o que atrapalhou o diagnóstico do defeito de remontagem.

## Dados de QA criados

Nenhum dado persistente. Tudo aconteceu no emulador (`demo-next-boilerplate`), cujo estado morre com o
processo: as contas do seed (`admin@`, `user@`, `user2@`), 25 eventos sintéticos gravados direto no
Firestore para exercitar a paginação, e os 6 eventos reais produzidos pela UI. O projeto Firebase de
referência não foi tocado, e nenhuma conta nova foi criada nele. Nada a limpar em
`docs/PRE-PRODUCTION.md`.

Durante a validação existiram `apps/app/.env.local` e `apps/api/.env.local` apontando para o emulador,
porque os `.env` do workspace apontam para o projeto real. Os dois foram apagados; são ignorados pelo git
e nunca entraram no diff.
