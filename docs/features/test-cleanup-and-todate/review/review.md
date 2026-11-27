# Revisão: test-cleanup-and-todate

Rodada autônoma do `/cycle`. A revisão leu o diff desta tarefa e rodou os gates estáticos. Não subiu app nem rodou a
suíte de testes. Nenhum arquivo foi editado na revisão.

## Branch

- `feat/audit-log-levels`, reutilizada. O usuário pediu que todas as tarefas da madrugada ficassem nela; a revisão não
  criou nem trocou branch.
- Regex de validação do nome: `branch OK: feat/audit-log-levels`.
- O índice tem dois `git mv` de specs (`admin-own-account`, `app-form-layout-centered`) que não pertencem a esta
  tarefa. Ficaram como estavam.

## Escopo revisado

Parte A: `apps/app/vitest.setup.ts` (novo), `apps/app/vitest.config.mts`, `apps/app/__tests__/testingLibraryCleanup.test.tsx`
(novo), `docs/review-checklist.md` §6.

Parte B: `packages/shared/utils/helpers/normalizeFirestoreInstant.ts`, `packages/shared/__tests__/readFirestoreInstant.test.ts`
(novo), `apps/api/(shared)/mappers/user.mapper.ts`, `apps/api/(shared)/repositories/organization-invitation.repository.ts`,
`apps/api/(shared)/lib/onboarding.ts`, `apps/api/__tests__/onboardingState.test.ts`,
`apps/api/__tests__/organizationInvitationExpiry.test.ts` (novo).

O diff de cada um desses arquivos contém só hunks desta tarefa. O resto do working tree pertence a outras quatro tarefas
e ficou de fora.

## Revisão — test-cleanup-and-todate

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `apps/api/app/(routes)/invitations/preview/route.ts:39` e `apps/api/(shared)/mappers/organization-invitation.mapper.ts:99`
  leem a validade do convite com `new Date(record.expiresAt)`, sobre o valor que `normalizeFirestoreInstant` devolveu
  (`organization-invitation.mapper.ts:52`). Com `expiresAt` gravado como string ilegível, a prévia e a listagem tratam o
  convite como válido (`NaN <= now` dá `false`) e o aceite responde `ORGANIZATION_INVITATION_EXPIRED`. Antes desta
  tarefa o aceite já recusava esse caso, então não é regressão. Para string ISO legível a tarefa até remove uma
  divergência: antes a prévia aceitava e o aceite recusava; agora os dois concordam. Fica para o backlog, junto com o
  achado já registrado no plano §13 sobre `normalizeFirestoreInstant`. O caso não acontece com dado gravado pela própria
  api, que sempre grava `Date` (`organization-invitation.repository.ts:154-155`).
- O commit da api muda comportamento (aceite falha fechado com `toDate()` inválido, onboarding deixa de lançar
  `RangeError`). Por isso o plano de commits usa `fix(api)` no lugar do `refactor(api)` sugerido no plano §10.3.

### ✅ OK

- (a) Comportamento na api, chamador por chamador:
  - Aceite de convite (`organization-invitation.repository.ts:85-87`): um `Timestamp` cujo `toDate()` dá data
    inválida antes passava pela checagem (`NaN <= now` é `false`) e seguia para o aceite. Agora vira `expired`, que a
    rota `invitations/accept` traduz para `ORGANIZATION_INVITATION_EXPIRED`, código que já existe e já está em
    `apiErrors`. Nenhum código novo.
  - `isOpen` (`:65`) e o limite de reenvio com `lastSentAt` (`:128`): a única diferença observável é a string ISO
    legível, que antes contava como ausente. A api grava os dois campos como `Date`, então não há dado existente que
    mude de resultado.
  - Onboarding (`lib/onboarding.ts:46-47`): string legível passa a sair como ISO completo em UTC, e `toDate()` inválido
    vira `null` em vez de `RangeError`. O único consumidor na app é `apps/app/shared/lib/onboarding.ts:40-44`, que só
    exige string com `Date.parse` válido, e `OnboardingClient.tsx:89`, que compara com `null`. Nada dependia do texto
    exato da string nem do erro. `null` segue o contrato documentado no próprio arquivo ("perfil ilegível passa").
  - Mapper de usuário (`user.mapper.ts:95-97`): resultado idêntico para `Date`, string legível, string ilegível e
    `Timestamp` real. A única diferença é um `toDate()` que devolve data inválida, que agora volta como o valor
    original em vez de um `Date` inválido, coerente com a docstring da função.
- (b) `readFirestoreInstant` não tem nada de domínio: recebe `unknown` e devolve `Date | null`. Vive ao lado de
  `normalizeFirestoreInstant` e sai pelo barril que já existia (`helpers/index.ts`). As duas funções não se duplicam:
  `normalizeFirestoreInstant` devolve string para DTO com fallback em epoch, e a nova devolve `Date` ou `null` para
  comparação. A função cobre o que os três helpers removidos cobriam, e o `rg` não encontra mais `instantOf` nem
  `toIsoInstant` no repositório.
- (c) `vitest.setup.ts` importa `cleanup` e `afterEach` explicitamente; `globals` continua desligado. O comentário
  explica por que o Testing Library não registra a limpeza sozinho, o que é uma restrição real de biblioteca e cabe na
  regra de comentários. Na vitest 4.0.3 o padrão de `sequence.hooks` é `stack`, então o `afterEach` do setup roda
  depois dos `afterEach` de cada arquivo, inclusive o `vi.useRealTimers()` dos quatro arquivos com fake timers. O
  `cleanup` em si não depende de timer, e chamá-lo duas vezes (nos arquivos que já chamam à mão) não tem efeito.
  `tsconfig.json` da app inclui `**/*.ts`, então o typecheck da app cobre o arquivo novo.
- (d) `packages/shared` não tem `typecheck`. Rodei `tsc --noEmit` pontual no `readFirestoreInstant.test.ts` com um
  tsconfig temporário fora do repo (estende `typescript-config/base.json`, `moduleResolution: bundler`, que é a
  resolução usada por quem consome o pacote): saída limpa. Com a `nodenext` do `base.json` puro, o import relativo sem
  extensão falha, mas os outros testes do pacote importam do mesmo jeito; a falha é da configuração escolhida, não do
  arquivo.
- (e) A frase nova em `docs/review-checklist.md:162-164` confere com o código: a limpeza roda pelo
  `vitest.setup.ts` e só na `app`. A observação anterior sobre jest-dom continua verdadeira, porque o setup não carrega
  jest-dom. Nenhum outro documento ou skill manda escrever `afterEach(cleanup)`.
- Comentários e docstrings novos não citam artefato do fluxo.
- O teste do convite falsifica só a borda (`@/(shared)/infra/database`, `server-only`) e usa endereços em
  `example.com`.

### 👁 Verificar no `/test`

- Limpeza global sem efeito colateral na suíte da app. Repro: `pnpm --filter app test`, esperado 155 arquivos e 1405
  testes, nenhum pulado; comparar a contagem por arquivo com a do handoff.
- Canário morde. Repro: remover `setupFiles` de `apps/app/vitest.config.mts`, rodar
  `npx vitest run __tests__/testingLibraryCleanup.test.tsx` na app e ver o segundo `it` cair com `expected 1 to be +0`;
  restaurar.
- `usersListLastAccess.test.tsx:314` chama `cleanup` no meio do teste. Repro: rodar o arquivo isolado e confirmar que a
  limpeza global depois dele não lança.
- Aceite de convite falha fechado. Repro: `pnpm --filter api exec vitest run __tests__/organizationInvitationExpiry.test.ts`
  com o `organization-invitation.repository.ts` do `HEAD` (deve cair) e com o atual (deve passar).

## Correções aplicadas

Nenhuma. Não houve achado que pedisse edição.

## Raio de impacto

- Contrato público: nenhum DTO, action do SDK, rota ou `error.code` mudou.
- `@repo/shared` ganhou o export `readFirestoreInstant`. Consumidores: os três arquivos da api listados acima.
- Parte A atinge todos os testes da `apps/app` (configuração global do Vitest). `apps/web`, `apps/api` e os pacotes
  não mudam.

## Lacunas de teste

- `isOpen` do convite com `expiresAt` ilegível (contagem de pendentes e reenvio em `issue`), do handoff: continua
  aberta. O risco é baixo, porque a mesma função de leitura está coberta pelo teste do aceite.
- `normalizeFirestoreInstant` lança `RangeError` com `Date` inválido e devolve string ilegível como veio (plano §13):
  continua aberta, fora do escopo desta tarefa.
- Remoção das 82 chamadas manuais de `cleanup`: continua aberta, fora do escopo.
- Nova: prévia e listagem de convite tratam string ilegível como válida (ver 🟢). Fora do escopo.

## Decisões em aberto

Nenhuma.

## Gates estáticos

| gate | comando | resultado |
|------|---------|-----------|
| typecheck | `pnpm turbo run typecheck --filter=app --filter=api` | 2/2, do cache do turbo |
| lint | `pnpm check` | 1174 arquivos, nenhuma correção |
| tsc pontual | `tsc -p <tsconfig temporário>` no `readFirestoreInstant.test.ts` | sem erro |
| paridade de i18n | não se aplica | o diff não toca tradução |

## Varredura de segredo

`rg` por senha, token, chave e e-mail em `docs/features/test-cleanup-and-todate/`: nada. Os testes novos usam só
endereços `@example.com`.

## Plano de commits

Entra depois dos commits das outras quatro tarefas da mesma branch. Ordem: shared, api, app, docs, artefato.

1. `feat(shared): add readFirestoreInstant`
   - `packages/shared/utils/helpers/normalizeFirestoreInstant.ts`
   - `packages/shared/__tests__/readFirestoreInstant.test.ts`
2. `fix(api): read stored instants through readFirestoreInstant`
   - `apps/api/(shared)/mappers/user.mapper.ts`
   - `apps/api/(shared)/repositories/organization-invitation.repository.ts`
   - `apps/api/(shared)/lib/onboarding.ts`
   - `apps/api/__tests__/onboardingState.test.ts`
   - `apps/api/__tests__/organizationInvitationExpiry.test.ts`
3. `test(app): run Testing Library cleanup after every test`
   - `apps/app/vitest.setup.ts`
   - `apps/app/vitest.config.mts`
   - `apps/app/__tests__/testingLibraryCleanup.test.tsx`
4. `docs: note the global Testing Library cleanup in the review checklist`
   - `docs/review-checklist.md`
5. `docs(features): test-cleanup-and-todate`
   - `docs/features/test-cleanup-and-todate/`

Título de PR sugerido, se esta tarefa virar PR própria: `fix(api): single Firestore instant reader and global Testing
Library cleanup`.

### Commits realizados

(preenchido pelo orquestrador)
