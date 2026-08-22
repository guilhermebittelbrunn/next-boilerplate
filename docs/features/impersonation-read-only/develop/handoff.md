# Handoff — `impersonation-read-only`

Implementação completa do plano (`analyze/plan.md`), sem desvio de escopo. Working tree sujo, sem branch
nova e sem commit — como combinado, isso é do `/review`.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---|---|
| §10.1 helper compartilhado | **novo** `apps/api/(shared)/lib/impersonation-read-only.ts` — `assertReadOnlyWhileImpersonating(req, resolved)`, `SAFE_METHODS` privado, devolve `Response \| null` |
| §10.2 guard comum | `apps/api/app/(guards)/common-panel.ts` — chamada do helper logo após `resolveAuthRequestContext`, **antes** da leitura do `subjectProfile` |
| §10.3 guard admin | `apps/api/app/(guards)/admin.ts` — predicado local + `SAFE_METHODS` + imports `UserRoleLevel`/`HTTP_STATUS` removidos, substituídos pela mesma chamada |
| §4.5 remoção do guard morto | `apps/api/app/(guards)/auth.ts` — **deletado** (grep repo-wide reconfirmado: zero importadores) |
| §7.2 cobertura do guard comum | **novo** `apps/api/__tests__/commonPanelGuard.test.ts` (6 casos, incl. o titular comum que **não** pode ser barrado e o bypass sem headers) |
| §7.2 unidade + simetria + varredura | **novo** `apps/api/__tests__/impersonationReadOnly.test.ts` (7 casos em 3 blocos) |
| §4.4 troca de código no admin | `apps/api/__tests__/adminGuard.test.ts:106` → `AUTH_REQUEST_IMPERSONATION_READ_ONLY` |
| §8.1 bootstrap do admin de DEV | **novo** `apps/api/scripts/create-dev-admin.mjs` + script `create-dev-admin` e devDependency `firebase-admin@^13.0.2` em `apps/api/package.json` (+3 linhas no `pnpm-lock.yaml`) |
| §5.2 sinal no cliente | `apps/app/shared/providers/AuthRequestPanelContext.tsx` — `isImpersonating` via `usePanelState(isImpersonatingSnapshot)` (a mesma função pura que os layouts do servidor usam) |
| §5.4 aviso | **novo** `apps/app/shared/components/ui/ImpersonationReadOnlyNotice.tsx` — `Alert` + `role="alert"`, `null` quando não impersonando, nome com fallback para uid truncado (8 chars) |
| §5.3 afordâncias (5) | `EntitiesListClient.tsx` (AddButton `disabled`, Switch `disabled`, `onDelete` → `undefined`, aviso), `create/page.tsx` (Footer `disabled` + aviso), `edit/[id]/EditEntityClient.tsx` (Footer `disabled` + aviso) |
| §7.3 testes de UI | **novo** `apps/app/__tests__/entitiesListReadOnly.test.tsx` (3 casos) + 3 casos novos em `apps/app/__tests__/authRequestPanel.test.tsx` |
| §5.5 i18n | **novo** `translations/apps/app/pages/impersonation/index.ts`, registrado em `translations/apps/app/pages/index.ts`; `apiErrors` nos 3 blocos de `translations/packages/shared/utils.ts` |
| §10.10 documentação | `docs/AUTH-PANEL.md` (§3, regra 9 em §5, tabela §7, tabela §9 e a linha de testes) · `docs/SETUP.md` (subseção "Primeiro admin") |

## Contrato

**Nenhuma mudança em `packages/sdk` e nenhuma no Firestore de produto** — como o plano previa (§2, §3).
Nenhum DTO, `Create/UpdateRequest` ou action tocada.

O que muda é **runtime**: `apiClient.entity.create/update/delete` (e as mutações admin) passam a poder
responder 403 num cenário que antes retornava 2xx. Consumidores afetados: as 3 telas de `entities` e
`/admin/users` — todos no `apps/app`, todos já cobertos pela supressão de UI.

## Códigos de erro

| Código | Situação | i18n |
|---|---|---|
| `AUTH_REQUEST_IMPERSONATION_READ_ONLY` (403) | **novo** — método mutante enquanto `isImpersonating`, nos dois guards | ✅ pt-br / en / es em `apiErrors` |
| `AUTH_REQUEST_PANEL_FORBIDDEN` | **mantido**, chave e copy intocadas | continua emitido por `auth-request-context.ts:48` e `:77` |

Paridade validada: `pnpm --filter @repo/internationalization test` (2 passed).

## Desvios do plano

1. **`--env-file-if-exists`** no script do `package.json` (o plano deixou a escolha para o `/develop`).
   Node 22.13 local suporta; tolera a ausência do `.env` sem quebrar.
2. **`docs/SETUP.md` ganhou uma linha a mais** do que o plano previa: um aviso para preferir a forma com
   variável de ambiente, porque o `pnpm` ecoa a linha de comando e a senha passada por argumento aparece
   no terminal e no histórico do shell. Descoberto ao rodar o script de verdade.
3. **`pnpm-lock.yaml` editado cirurgicamente** (3 linhas). Um `pnpm install` completo arrastava junto um
   bump não relacionado de `radix-ui` 1.5.0 → 1.6.7 (`packages/design-system` declara `"radix-ui": "latest"`,
   então qualquer install re-resolve). Restaurei o lockfile e inseri só a entrada de `firebase-admin` no
   importer `apps/api`; `pnpm install --filter api --frozen-lockfile` valida ("Lockfile is up to date") e
   `apps/api/node_modules/firebase-admin` resolve.
4. Os `Container` de `create`/`edit` ganharam `flex flex-col gap-4` para o aviso não colar no formulário.

Nada mais. Sem escape hatch, sem interpolação nova no i18n, sem tocar em
`docs/features/auth-panel-context/**` nem em `specs/firebase-emulator-seed.md`.

## Validação

| Comando | Resultado |
|---|---|
| `pnpm --filter api typecheck` | ✅ |
| `pnpm --filter app typecheck` | ✅ |
| `pnpm --filter api test` | ✅ **45** (era 38) |
| `pnpm --filter app test` | ✅ **120** (era 114) |
| `pnpm --filter @repo/internationalization test` | ✅ 2 |
| `pnpm check` | **197 erros / 40 avisos** — baseline medida com `git stash -u` era **285 / 40** |

### `useFilenamingConvention` — regra reconfigurada (decisão do usuário, posterior ao desenvolvimento)

O diff nasceu com **+4** erros de `lint/style/useFilenamingConvention`, um por arquivo novo: a regra exige
kebab-case, e o repositório nomeia módulos em camelCase e componentes React em PascalCase.

A medição mostrou que o problema não era dos 4 arquivos: **94 dos 289 erros** eram dessa regra — um terço
de toda a dívida de lint era a convenção documentada do repositório brigando com o linter. Em vez de
renomear os arquivos novos contra a convenção, a regra foi configurada no `biome.jsonc` para aceitar
`camelCase`, `PascalCase` e `kebab-case`.

Consequências, todas verificadas:

- `pnpm check`: **289 → 197 erros** (88 abaixo da baseline de 285), avisos inalterados em 40.
- Sobra **1** violação legítima da regra: `apps/app/midd_teste.ts` (snake_case) — o arquivo órfão que o
  `specs/BACKLOG.md` já lista como resíduo. A regra agora aponta exatamente o caso real.
- **7 comentários `biome-ignore` ficaram mortos** e foram removidos (2 em `packages/design-system`,
  5 nos módulos colocados de `entities`). Deixá-los manteria `suppressions/incorrect` no quadro.

Arquivos tocados por essa decisão, **fora** do escopo original da feature — o `/review` deve tratá-los em
commit próprio: `biome.jsonc`, `packages/design-system/components/ui/select/index.tsx`,
`packages/design-system/components/form/hookform/hookformSelect.tsx` e os 5 módulos de `entities`
(`useFindEntityById.tsx`, `useListEntities.tsx`, `useEntityCrud.tsx`, `EntityFormFields.tsx`,
`entityFormSchema.ts` — só a linha 1 de cada).

Typecheck de `api` e `app` e os 167 testes dos 3 workspaces foram re-executados depois da mudança: verdes.

**Prova de que o teste de UI trava a regressão**: removi `disabled={isImpersonating}` do `AddButton` e
`entitiesListReadOnly.test.tsx` falhou; restaurado em seguida.

## Validação visual — feita

Ambiente: `pnpm --filter api dev` (3002) + `pnpm --filter app dev` (3000), projeto Firebase de
desenvolvimento `next-boilerplate-576d0`. Admin criado **pelo script entregue nesta tarefa**
(`dev-admin@example.com`) e usuário comum `readonly-check@example.com` criado pela UI de sign-up, com 2
entidades. Comandos do `agent-browser` rodados estritamente em sequência.

Screenshots em `docs/features/impersonation-read-only/develop/screenshots/`:

| Fluxo (§8.3) | Evidência | Arquivo |
|---|---|---|
| 1 · lista impersonando | aviso com o nome, "Novo" desabilitado, `Switch` desabilitado, dados do alvo carregam | `01-impersonating-list-light.png`, `01-impersonating-list-dark.png`, `01-impersonating-list-mobile-light.png`, `01-impersonating-list-mobile-dark.png` |
| 1 · menu de ações | só "Editar"; "Excluir" **ausente** | `01-impersonating-actions-menu-no-delete.png` |
| 2 · `/entities/create` | formulário renderiza, aviso acima, "Salvar" desabilitado | `02-impersonating-create-light.png`, `02-impersonating-create-mobile-dark.png` |
| 3 · `/entities/edit/[id]` | dados carregam, "Salvar" desabilitado | `03-impersonating-edit-light.png`, `03-impersonating-edit-dark.png` |
| 6 · usuário comum titular | nenhum aviso, "Novo" e `Switch` habilitados, "Excluir" presente | `06-common-user-own-list-light.png`, `06-common-user-own-list-dark.png`, `06-common-user-actions-menu.png` |

Temas light + dark e viewports desktop (1280×900) + mobile (390×844) cobertos nos fluxos 1, 2, 3 e 6. O
`Table` (antd) respeita o tema nos dois modos.

**Fluxo 4 e 5 por `curl`, contra a API real** (o token de sessão do admin foi lido do browser e apagado
depois; nada disso ficou em arquivo):

| Request | Resultado |
|---|---|
| `GET /entities` impersonando | `200` com os dados do alvo |
| `POST /entities` impersonando | `403 {"error":{"code":"AUTH_REQUEST_IMPERSONATION_READ_ONLY"}}` |
| `DELETE /entities/<id>` impersonando | `403` mesmo código |
| `PUT /users/<id>` (guard **admin**) impersonando | `403` **mesmo código** — a simetria observável |
| `GET /users` (guard admin) impersonando | `200` — leitura segue aberta |
| `POST /entities` como admin **sem** headers de impersonação | `403 COMMON_PANEL_FORBIDDEN` — o bypass falha fechado |
| `PUT /users/<id>` como admin no painel **admin** | `200` (revertido em seguida) — o admin agindo como ele mesmo não é afetado |

**Controle suprimido é controle real**: logado como o próprio dono, cliquei no `Switch` da lista e a API
registrou `PUT /entities/<id> 200` (revertido). Sob impersonação o mesmo controle vem `disabled`.

## Observações (nenhuma bloqueia)

- **Console do browser, pré-existente e alheio a este diff**: um `hydration mismatch` num `id` gerado pelo
  Radix (`DropdownMenuTrigger`) e o aviso "Select is changing from uncontrolled to controlled", ambos
  vindos de `PanelNavbarControls`. Aparecem já em `/pt-br/admin`, antes de qualquer tela desta feature.
- **Dados deixados no projeto de DEV**: o admin `dev-admin@example.com`, o usuário
  `readonly-check@example.com` e 2 entidades. Úteis para o `/test`; apague se preferir. A senha de ambos
  foi gerada na hora, usada só na sessão e **não** está em nenhum arquivo (versionado ou não).

## Decisões em aberto

- **Q do plano (fallback do nome)**: implementado o **default recomendado** — `impersonatedLabel ?? uid
  truncado em 8 chars`, igual ao navbar. Na validação o rótulo real (`readonly-check@example.com`)
  apareceu sempre; o caminho do uid está coberto por teste unitário. Se o usuário preferir a alternativa
  (resolver o nome via `useListUsers`), é troca localizada no componente.
- ~~**Nome de arquivo × Biome**~~ — **resolvido**: o usuário optou por reconfigurar a regra dentro deste
  diff. Ver a subseção "`useFilenamingConvention` — regra reconfigurada" em Validação.
- **`hydration mismatch` do `PanelNavbarControls`** — o usuário decidiu manter **fora de escopo**;
  registrado como achado no `specs/BACKLOG.md` para virar tarefa própria.

## Lacunas de teste para o `/test`

1. `create/page.tsx` e `EditEntityClient.tsx` **não** têm teste de componente — só a lista tem. O
   `disabled` do `Footer` nessas duas telas está coberto apenas pela validação visual.
2. `ImpersonationReadOnlyNotice` é exercitado indiretamente (pela lista); não há teste isolado do caso
   `isImpersonating === false` → `null` fora daquele contexto.
3. Rotas de `entities` sob impersonação não têm teste de rota (só de guard); a cobertura vem da simetria
   do guard + do `curl`.
4. O script `create-dev-admin.mjs` não tem teste automatizado — foi validado executando contra o projeto
   real (criou usuário + perfil com `deletedAt: null`) e no caminho de erro (sem argumentos → uso + exit 1).
