# Revisão de código, trilha de auditoria de ações sensíveis

- **Plano**: [`analyze/plan.md`](../analyze/plan.md) · **Handoff**: [`develop/handoff.md`](../develop/handoff.md)
- **Rodada**: `/cycle` autônomo. Nada foi commitado e nada foi enviado ao remoto.

## Branch

`feat/audit-log`, criada a partir de `provo` (que estava em `c36e084`, o mesmo commit de `origin/main`).

A branch anterior, `provo`, não bate com `<project>/<type>/<title>`. Ela não tinha commit próprio nem
remoto, então renomear seria possível, mas `provo` é o nome do workspace do Conductor e renomeá-la
quebraria essa associação. Criei a branch de feature a partir dela.

O nome novo passou no regex do padrão. Como o diff toca `packages/shared`, `packages/sdk`, `apps/api`,
`apps/app` e `packages/internationalization`, o prefixo de projeto foi omitido, que é a forma prevista para
mudança em vários apps.

```
feat/audit-log  →  branch OK
provo           →  BRANCH INVALIDA (confirmado)
```

## Reverificação independente das afirmações do handoff

Subi os emuladores do Firebase com o seed do repo, a API na 3002 e o app na 3010 (a 3000 estava ocupada
por um processo de outro workspace, que não foi tocado). Percorri os fluxos no navegador e li os
documentos direto no Firestore, sem usar os screenshots do `/develop`.

| Afirmação | Resultado | Como conferi |
|---|---|---|
| As 5 ações gravam de verdade pela UI | ✅ confere | Um documento por ação, lido campo a campo no Firestore |
| Dedupe de impersonação: N requisições, 1 documento | ✅ confere | 8 navegações sob impersonação, `TOTAL DOCS: 1` |
| Troca de sujeito gera documento novo | ✅ confere | Segundo documento criado, o primeiro intacto |
| Filtro por usuário sem índice responde 503, nunca 500 | ✅ confere | `HTTP 503 {"error":{"code":"PAGINATION_INDEX_MISSING"}}` |
| Filtros continuam utilizáveis no caminho degradado | ✅ confere | O erro substitui só a tabela; o select e os botões seguem na tela |
| Repositório append-only de verdade | ✅ confere | `update`/`delete` lançam, e nenhum ponto do código os chama |
| A rota só exporta GET | ✅ confere | `POST`, `PUT`, `PATCH` e `DELETE` respondem 405 |
| O patch temporário do 503 foi revertido | ✅ confere, com ressalva | Ver a ressalva abaixo |

Os cinco documentos gravados pela UI:

| Ação | Como provoquei | O que o documento tem |
|---|---|---|
| `impersonation.session` | Seletor de painel, depois navegação por três telas | Id `imp_<actorUid>_<subjectUid>_1789618500000`, `windowEndsAt` no fim da janela de 15 min |
| `user.update` | Switch "Ativo" em `/admin/users` | `changedFields: ["disabled"]`, sem nenhum valor |
| `user.delete` | Menu da linha, confirmação "Sim" | `targetLabel: user2@example.com`, lido antes do soft delete |
| `account.sessions.revoke` | "Sair de todos os dispositivos" | `targetType: session`, ator igual ao alvo |
| `account.password.change` | Formulário de segurança em `/account` | `targetType: account`, sem senha nem hash |

Varri os 7 documentos da coleção procurando senha, hash, token e chave: nada. Nenhum documento tem campo
fora do DTO declarado.

**Ressalva sobre o patch temporário.** O handoff prova a reversão com "o `git diff` do arquivo está
vazio". Essa prova não vale: `audit-event.repository.ts` é arquivo novo e não rastreado, então o
`git diff` dele é vazio de qualquer jeito, com ou sem patch. Conferi o conteúdo do arquivo, que está
limpo. Eu mesmo apliquei e removi um patch equivalente durante esta revisão, e reconferi o arquivo depois.

Também reverifiquei os quatro desvios do plano. D1 (rótulo vindo do Firebase Auth) está com a consulta
depois do cache de dedupe, como o handoff diz, então requisição repetida não paga round-trip ao Auth.
D2 (`windowEndsAt` em ISO) confere no documento. D3 tem teste e responde 400 em `?to=yesterday`,
`?to=2026-13-45`, `?to=2026-02-30` e no par invertido. D4 confere nos dois defeitos: o select mantém o
usuário escolhido depois de aplicar, e no erro os filtros continuam na tela.

## Achados

| Sev | Onde | Problema | Ação |
|---|---|---|---|
| 🟡 | `audit/(components)/AuditFilters.tsx:52-62` | O select de usuário vem de `useListUsers()`, que não devolve perfil excluído. Depois de um `user.delete`, os eventos daquele usuário continuam na coleção mas somem do filtro | Registrado, não corrigido |
| 🟡 | `packages/design-system/components/ui/date-input.tsx:83` | `format(selected, "PPP")` sem locale: o filtro mostra "September 1st, 2026" em tela pt-br, e o calendário inteiro fica em inglês, inclusive os rótulos de acessibilidade | Registrado, não corrigido |
| 🟡 | `apps/api/(shared)/lib/audit-label.ts:14` | `catch { return null }` engole toda falha sem log. A gravação fail-open se apoia no log como registro alternativo, mas a resolução do rótulo não tem nenhum | Registrado, não corrigido |
| 🟢 | `audit-recorder.ts:102` | O log de falha só trazia `reason`, que num erro do Firestore é quase sempre `Error` | ✅ Corrigido |
| 🟢 | `auditTrail.ts` | `filters.title` e `messages.loadError` nasceram sem nenhum consumidor, nos três idiomas | ✅ Corrigido |
| 🟢 | `AuditListClient.tsx:59,65,73` | A chave `noChangedFields` era usada também como vazio das colunas Autor e Alvo | ✅ Corrigido |
| 🟢 | `audit-recorder.ts:39` | `writtenWindows` é `Map<string, number>` cujo valor (`Date.now()`) nunca é lido. Um `Set` bastaria | Registrado, não corrigido |
| 🟢 | `audit-event.repository.ts:92-106` | `update`/`delete` lançam de forma síncrona, mas são tipados `Promise<...>`. Um chamador com `.catch()` não pegaria o erro | Registrado, não corrigido |
| 🟢 | `users/[id]/route.ts:68-94` | `userRepository.update` roda antes de `getAuthInstance().updateUser`. Se a chamada ao Auth falhar, a alteração no Firestore já aconteceu e nenhum evento é gravado | Registrado, não corrigido |
| 🟢 | `users/[id]/route.ts:22` | `changedFields` guarda os campos que o admin enviou, não os que mudaram de valor. Enviar `disabled: true` em quem já estava desabilitado grava `["disabled"]` | Registrado, comportamento aceitável |
| 🟢 | `docs/PRE-PRODUCTION.md:355-358` | Os números do gate (555 arquivos, 1091 testes, 112 arquivos) são da PR #17 e envelhecem no merge desta. O próprio texto manda remedir antes de citar | Registrado |

Nenhum achado 🔴.

Sobre o primeiro 🟡: ele tira parte do sentido de guardar `actorLabel`/`targetLabel` para sobreviver à
exclusão. O evento sobrevive e aparece na listagem completa, mas o admin só chega nele pela busca em
memória sobre as páginas já carregadas. Corrigir exige decidir se o select deve listar perfil excluído, o
que muda `useListUsers` e afeta outras telas. É decisão, não conserto mecânico.

## Correções aplicadas

Três, todas no working tree, prontas para o diff.

1. `apps/api/(shared)/lib/audit-recorder.ts`: acrescentei `status` ao log das duas falhas, com o código
   gRPC que o Firestore anexa (7 é permissão, 8 é cota, 14 é indisponível). O `reason` continua sendo só
   o `name`, e a mensagem segue fora do log. Sem isso, o operador lia `reason=Error` e não tinha o que
   fazer com a informação.
2. `packages/internationalization/.../admin/auditTrail.ts`: removi `filters.title` e `messages.loadError`
   nos três idiomas. Nenhum componente lia as duas.
3. `auditTrail.ts` e `AuditListClient.tsx`: renomeei `noChangedFields` para `emptyValue`. O valor é `"—"`
   e as colunas Autor e Alvo já usavam a mesma chave; com o nome antigo, quem trocasse o texto por
   "Nenhum campo alterado" passaria a ver isso na coluna Autor.

## Raio de impacto

`AdminAuthContext` ganhou `actorProfile: UserDTO`. A mudança é aditiva e alcança `users/route.ts`,
`users/[id]/route.ts`, `files/*` e os testes que montam o contexto na mão. Nenhum handler deixou de
compilar.

`packages/sdk` ganhou `audit` no `Client`, mais `AuditAction`, `AuditTargetType`, `AuditEventDTO` e
`AuditEventListQuery`. Consomem hoje o hook `useListAuditEvents` e o prefetch RSC da página.

`packages/shared` ganhou `"audit"` no `LogScope`, que é uma união de strings e não quebra chamador algum.

A paginação foi reusada da PR #17 sem alteração: `paginate`, `encodeCursor`, `decodeCursor`,
`parseListQuery`, `isMissingIndexError` e `useAuthorizedInfiniteQuery` não aparecem no diff. A trilha não
construiu listagem própria.

Onze arquivos de teste da `apps/api` ganharam `vi.mock` do recorder, porque o guard comum passou a
importá-lo.

## Validação visual

Emuladores com o seed, API na 3002, app na 3010. Encerrei tudo que subi no fim, e a 3000 continua com o
processo que já estava lá.

| O que percorri | Resultado |
|---|---|
| Listagem, tema escuro e claro, pt-br | Colunas, rótulos das 5 ações e estado vazio corretos |
| Listagem em inglês e espanhol | Sidebar, breadcrumb, colunas, filtros e as 5 ações traduzidos |
| 390x844, claro e escuro | Filtros em uma coluna, tabela com rolagem horizontal |
| Filtro por usuário | Query certa na API, e o usuário escolhido continua no select depois de aplicar |
| Filtro de período | O `HookFormDateInput` envia `from=2026-09-01`, que é o formato que o schema espera |
| Período invertido | Barrado no formulário, mensagem traduzida ancorada no campo "Até", sem chamar a API |
| Caminho degradado (503) | Mensagem traduzida com o `requestId`, filtros ainda acessíveis |
| Console em carga fria | Limpo. Sobra um aviso do Next sobre `scroll-behavior: smooth`, que é global e anterior a esta feature |

O aviso de hidratação que aparecia no meio da sessão veio do Fast Refresh, como o handoff diz. Em carga
fria não reproduz.

Screenshots em `review/screenshots/`, tirados nesta revisão e independentes dos do `/develop`. O
`08-dateinput-english-on-ptbr.png` é a prova do segundo 🟡: calendário em inglês numa tela em português.

## Segurança e dados pessoais

A trilha guarda e-mail em `actorLabel` e `targetLabel` para continuar identificando alguém depois da
exclusão da conta, e a rota é admin-only espelhada na API, não só escondida na UI:

```
sem token                  → 401 AUTH_INVALID_TOKEN
token de usuário comum     → 403 ADMIN_FORBIDDEN
POST/PUT/PATCH/DELETE      → 405
```

A gravação é fail-open de verdade e não engole erro em silêncio: a falha vai para `logEvent("audit",
"write-failed", ...)` com o mesmo `requestId` da requisição. A exceção é a resolução do rótulo, que é o
terceiro 🟡 acima.

A retenção da coleção não tem prazo nem expurgo, e isso está registrado em `docs/PRE-PRODUCTION.md` §1.3,
junto com a nota de que não existe prazo legal para trilha de auditoria de negócio no Brasil.

## Lacunas de teste para o `/test`

As quatro que o handoff já lista seguem de pé: `/account/sessions/revoke` sem teste de gravação, o guard
comum sem teste da instrumentação, `AuditFilters` sem teste próprio e o botão "Limpar" sem teste.

Acrescento três:

1. **`/account/password` sem teste de gravação**, pelo mesmo motivo da rota de sessões.
2. **PUT de `users/[id]` quando o Firebase Auth falha no meio.** O `userRepository.update` já rodou e
   nenhum evento é gravado. Nenhum teste cobre esse caminho.
3. **O `status` novo no log de falha** (`audit-recorder.ts`) não tem teste. O `reason` tem.

## Gates

Medidos neste working tree, depois das minhas correções.

| Gate | Comando | Resultado |
|---|---|---|
| CI completo | `pnpm turbo run lint typecheck test --force` | 24/24 tasks |
| Suíte | as 10 tasks de teste | 121 arquivos, 1192 testes, 0 falha |
| Lint/format | `pnpm check` | 580 arquivos, 0 correção |
| Paridade i18n | `@repo/internationalization:test` | 3 arquivos, 27 testes |

Bate com a baseline que o `/develop` declarou.

## Decisões em aberto

1. **Filtrar eventos de usuário excluído.** Hoje não dá. Recomendo abrir como item próprio e resolver
   depois, porque mexer em `useListUsers` afeta outras telas. Não reprova esta entrega.
2. **Locale do `DateInput`.** Recomendo item próprio no backlog, valendo também para o `birthdate` do
   formulário de entidade, que já estava assim antes desta feature.
3. **`docs/PRE-PRODUCTION.md` mistura dois assuntos no mesmo arquivo.** Os três blocos alterados são
   separáveis por hunk: §1.2 e §1.3 e o parágrafo do §11 são da feature, e os números do gate são da
   auditoria de backlog. Separar exige `git add -p`. Recomendo um commit só, com o motivo na mensagem.

## Plano de commits

Proposto, não executado. Nenhum `git add` foi feito.

| # | Mensagem | Escopo |
|---|---|---|
| 1 | `docs(specs): reconcile the backlog with the code after PR #17` | `specs/` e o `git mv` da spec de `cursor-pagination` |
| 2 | `feat(shared): add the audit scope to the structured logger` | `packages/shared/utils/helpers/log.ts` |
| 3 | `feat(sdk): add the audit event contract and list action` | `packages/sdk/` |
| 4 | `feat(api): add the append-only audit event repository and mapper` | repositório, mapper, índice e testes |
| 5 | `feat(api): record the five sensitive actions in the audit trail` | recorder, label, guards, handlers e testes |
| 6 | `feat(api): expose the admin-only audit event listing` | rota, schema e testes |
| 7 | `feat(app): add the admin audit trail screen` | tela, hooks, validações, navegação e testes |
| 8 | `feat(internationalization): add the audit trail dictionary keys` | dicionário nos três idiomas |
| 9 | `docs: register the audit trail index and retention prerequisites` | `docs/PRE-PRODUCTION.md` |
| 10 | `docs(features): audit-log` | `docs/features/audit-log/` |

A ordem respeita a dependência `packages/shared` → `packages/sdk` → `apps/api` → `apps/app` →
`packages/internationalization`. O commit 1 vem primeiro porque a auditoria de backlog rodou antes do
desenvolvimento e não depende dele.

### Commits realizados

(preenchido pelo `/review` depois de commitar)
