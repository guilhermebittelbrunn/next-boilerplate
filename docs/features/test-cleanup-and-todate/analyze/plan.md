# Plano: limpeza global do Testing Library na `app` e leitura única de instante do Firestore

Tarefa direta, sem spec. Origem: [`specs/reference/AUDIT.md`](../../../../specs/reference/AUDIT.md), seção "Tarefas
diretas candidatas" (`:344` e `:350`) e a tabela "Achados das tarefas diretas da madrugada" (`:1925`), com o veredito
"continua aberto" para os dois itens na seção da PR #76 (`:1971` e `:1977`). Plano feito em rodada
autônoma do `/cycle`: as decisões estão na §12, cada uma com a alternativa descartada.

São duas mudanças pequenas e independentes, só de qualidade interna. Nenhuma toca UI, contrato do SDK, i18n,
Firestore ou env.

## 1. Contexto, objetivo e corte

### 1.1 Parte A: limpeza do Testing Library

`apps/app/vitest.config.mts:7-14` não tem `setupFiles` nem `globals`. O `@testing-library/react` (16.3, em
`apps/app/package.json:43`) só registra o `afterEach(cleanup)` automático quando encontra um `afterEach` global, o que
não acontece com `globals` desligado (o `docs/review-checklist.md:160-161` confirma que ele está desligado de
propósito). Resultado medido por leitura em `apps/app/__tests__/`:

- 106 arquivos importam `@testing-library/react`;
- 82 chamam `cleanup` por conta própria (`afterEach(cleanup)` ou `cleanup()` num `afterEach`);
- 24 renderizam (`render` ou `renderHook`) e não limpam nada. A lista: `alertTheme.test.ts`,
  `authHeaderOwnership.test.tsx`, `commonNavRoutes.test.tsx`, `authRequestPanel.test.tsx`,
  `panelErrorRequestId.test.tsx`, `panelNavbarControls.test.tsx`, `sidebarPersistence.test.tsx`,
  `useBillingSummary.test.tsx`, `useEntitySummary.test.tsx`, `useAccountSessions.test.tsx`,
  `useEntityCrud.test.tsx`, `useEmailVerification.test.tsx`, `useFileUpload.test.ts`, `useListAuditEvents.test.tsx`,
  `useAccountDataRights.test.tsx`, `useListUsers.test.tsx`, `useCheckoutConfirmation.test.tsx`,
  `usePaymentsMutations.test.tsx`, `useNotifications.test.tsx`, `useUserCrudSessionsNotRevoked.test.tsx`,
  `useListEntities.test.tsx`, `useSignInMethodMutations.test.tsx`, `useOrganization.test.tsx`,
  `useUserCrudSelfLockout.test.tsx`.

Nesses 24, o DOM e os hooks montados num teste continuam vivos no seguinte do mesmo arquivo. Um `screen.getBy...` pode
achar o nó do teste anterior, e um observador do React Query montado antes segue reagindo a mock trocado depois.

Objetivo: a limpeza passa a valer para todo teste da `app` por configuração, e quem escreve teste novo não precisa
lembrar dela.

Fora do corte:

- **A suíte do design system sob carga.** Sem reprodução: a auditoria de 2026-11-26 rodou 173 de 173
  (`specs/reference/AUDIT.md:1968`), e as falhas anteriores foram por tempo, sem nome de teste no log (`:1932`). Além
  disso, os 13 arquivos de teste do `@repo/design-system` que usam o Testing Library já chamam `cleanup` (0 sem a
  chamada), então a causa desta tarefa não existe lá. Fica aberta no backlog com esse motivo.
- **Os três testes da `app` instáveis sob carga** (`:1934`) e o `Timeout starting forks runner` (`:1933`): sem
  reprodução, e nada liga a falha deles à falta de limpeza (os três já chamam `cleanup`, por exemplo
  `signUpFormSubmitLock.test.tsx:159`).
- **Remover as 82 chamadas manuais de `cleanup`.** Viram redundantes e inofensivas (o `cleanup` percorre os containers
  montados e não falha quando não há nenhum). Ver D3.
- `apps/web`: os testes rodam em `environment: "node"` (`apps/web/vitest.config.mts:9`) e só 5 arquivos usam o Testing
  Library. Fora.

### 1.2 Parte B: os helpers de instante por duck-typing

A auditoria aponta três helpers. Reconferidos no código atual (nenhum dos três arquivos está modificado no working
tree):

| helper | onde | entrada → saída | `Date` inválido | string válida | string inválida | `Timestamp` | outro valor |
|--------|------|-----------------|-----------------|---------------|-----------------|-------------|-------------|
| `toDate` | `apps/api/(shared)/mappers/user.mapper.ts:95-107` | `unknown → unknown` | devolve o próprio | `Date` | devolve a string | `Date` | devolve o valor |
| `instantOf` | `apps/api/(shared)/repositories/organization-invitation.repository.ts:59-68` | `unknown → Date \| null` | devolve o próprio (`Invalid Date`) | `null` | `null` | `Date` | `null` |
| `toIsoInstant` | `apps/api/(shared)/lib/onboarding.ts:24-37` | `unknown → string \| null` | `null` | a string **como veio** | `null` | ISO | `null` |

Existe um quarto, que a auditoria não listou e que é público: `normalizeFirestoreInstant` em
`packages/shared/utils/helpers/normalizeFirestoreInstant.ts:5-20` (`unknown → string`, devolve string como veio, cai em
epoch para o resto, lança `RangeError` com `Date` inválido). Tem mais de 30 chamadores na `api` e um na `app`
(`apps/app/shared/lib/formatDisplayDateTime.ts:28`).

Os três não são o mesmo comportamento na saída, e isso é legítimo: o mapper de `user` entrega `Date` para o DTO, o
repositório de convite precisa de `Date` para comparar com `now`, e o onboarding devolve ISO para o
`OnboardingStateDTO`. O que se repete é a **leitura**: reconhecer `Date`, string e `Timestamp` (pelo `toDate`) e
decidir o que é um instante válido. É aí que os três divergem sem motivo:

- uma string `"2026-01-02"` sai `2026-01-02T00:00:00.000Z` no `GET /users` (o `Date` vira ISO no JSON) e sai
  `"2026-01-02"` no `completedAt` do onboarding;
- o convite trata string como "sem validade" (`null`), e os outros dois a aceitam;
- o convite deixa passar `Invalid Date`: em `refuseInvitation` (`:95-97`) a comparação `NaN <= now` dá `false`, então
  o convite **não** conta como expirado.

Nenhum desses casos acontece com os escritores atuais: o convite grava `expiresAt` e `lastSentAt` como `Date`
(`organization-invitation.repository.ts:164-165`), e o onboarding grava `completedAt` com o `now` do servidor
(`onboarding.ts:77-101`). Por isso a correção é pequena e não muda nada observável para dados gravados pelo próprio
código.

Objetivo: uma função só decide o que é um instante legível, e os três helpers viram adaptadores de uma linha sobre ela,
cada um mantendo o tipo de saída que o chamador precisa.

Fora do corte:

- **Reescrever `normalizeFirestoreInstant` sobre a função nova.** Mudaria o `RangeError` de `Date` inválido para epoch
  e a string inválida de "devolve como veio" para epoch, em 30+ chamadores, inclusive na `app`. Fica como achado.
- Qualquer mudança em mapper de outro recurso.

### 1.3 Apps e áreas

| área | parte A | parte B |
|------|---------|---------|
| `apps/app` | `vitest.config.mts`, arquivo de setup novo, 1 teste novo | N/A |
| `apps/api` | N/A | 3 arquivos de produção, 1 teste estendido |
| `packages/shared` | N/A | função nova no helper existente, 1 teste novo |
| `apps/web`, `packages/sdk`, i18n | N/A | N/A |
| docs | `docs/review-checklist.md` §6 | N/A |

Modo de produto, assinatura, painel comum ou admin, impersonação: N/A nas duas partes.

## 2. Dados (Firestore)

N/A. Nenhuma coleção, campo, índice ou regra muda. A parte B só muda como valores já gravados são lidos, e os valores
que mudariam de leitura não são gravados pelo código atual (§1.2).

## 3. Contrato `@repo/sdk`

N/A. `UserDTO` e `OnboardingStateDTO` mantêm os tipos. A única diferença possível no fio é um `completedAt` gravado como
string não ISO sair normalizado em ISO completo, o que deixa o campo mais próximo do que o tipo promete.

## 4. API

Sem rota, guard, schema ou `error.code` novos. Mudanças internas:

- `user.mapper.ts:95-107`: `toDate` passa a delegar a leitura. Comportamento idêntico em todos os casos da tabela
  (o `?? value` devolve o valor original quando a leitura falha, inclusive o `Date` inválido).
- `organization-invitation.repository.ts:59-68`: `instantOf` sai, e os três usos (`:75`, `:95`, `:138`) chamam a
  função nova direto. Duas mudanças, ambas inalcançáveis com os escritores atuais: string ISO vira `Date` em vez de
  `null`, e `Date` inválido vira `null`, o que faz o convite contar como expirado (`:96`) e não aberto (`:76`), ou seja,
  falha fechado.
- `onboarding.ts:24-37`: `toIsoInstant` vira `readFirestoreInstant(value)?.toISOString() ?? null`. Mudança: string
  válida não ISO sai normalizada. String inválida, `Date` inválido e valor estranho seguem `null`, então o teste
  "treats a malformed field as done" (`apps/api/__tests__/onboardingState.test.ts:44-58`) continua valendo.

## 5. Front

N/A na parte B. Na parte A só muda configuração de teste.

## 6. Autorização e segurança

N/A. A única mudança com efeito de segurança é a do convite com `expiresAt` inválido, que passa a falhar fechado.

## 7. Testes

| teste | nível | o que prova |
|-------|-------|-------------|
| `packages/shared/__tests__/readFirestoreInstant.test.ts` (novo) | helper puro | `Date` válido volta o mesmo objeto; `Date` inválido → `null`; string ISO e string só com data → `Date`; string inválida → `null`; objeto com `toDate()` → o `Date` dele; objeto com `toDate()` que devolve `Date` inválido → `null`; `null`, `undefined`, número, objeto sem `toDate`, array → `null` |
| `apps/api/__tests__/onboardingState.test.ts` (estendido) | helper puro | `toOnboardingStateDTO({ step: "profile", completedAt: "2026-01-02" })` devolve `completedAt: "2026-01-02T00:00:00.000Z"`; os casos existentes seguem verdes |
| `apps/api/__tests__/userMapper.test.ts` (sem mudança) | mapper | a suíte existente cobre a conversão dos instantes do perfil; tem de passar sem edição, o que prova que o `toDate` não mudou |
| `apps/app/__tests__/testingLibraryCleanup.test.tsx` (novo) | configuração | dois `it` no mesmo arquivo, sem `cleanup` manual: o primeiro renderiza um elemento, o segundo afirma que `document.body` não tem filhos. Mutação para o `/develop`: tirar o `setupFiles` e ver o segundo cair |

O convite não ganha teste unitário novo: as mudanças só aparecem com dado que o código não grava, e o repositório é
coberto pelo `organizationInvitation.emulator.test.ts`, que tem de seguir verde no `test:emulator`. Teste de emulador
novo para isso provaria a mesma coisa que o unitário do helper.

**Medição da parte A, antes e depois.** O `/develop` roda `pnpm --filter app test` duas vezes, antes de mexer em
qualquer arquivo e depois do setup ligado, e grava no handoff os números de arquivos e testes (passados, falhos,
pulados). Critério: o "depois" tem exatamente os mesmos testes do "antes" mais os 2 do arquivo novo, todos verdes. Se
algum teste cair com a limpeza ligada, ele dependia de estado vazado do teste anterior: o defeito é do teste e se
corrige no teste (montar o que precisa no próprio `it` ou num `beforeEach`), nunca com `skip`, `RTL_SKIP_AUTO_CLEANUP`
ou removendo o setup.

## 8. O que o `/test` vai percorrer

Nada no browser. A mudança não tem superfície de runtime de UI. O `/test` mede:

- `pnpm --filter app test`, comparando com os números de antes e depois do handoff;
- `pnpm --filter api test` e `pnpm --filter @repo/shared test`;
- `pnpm --filter api test:emulator`, só para o `organizationInvitation.emulator.test.ts` (o repositório de convite
  mudou), se houver JDK 21; sem JDK, fica 🔒 e não reprova;
- a mutação do teste de limpeza (tirar o `setupFiles`, ver cair, restaurar).

## 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **A limpeza do Testing Library vale para todo teste da `app`**
  `apps/app/vitest.config.mts` aponta `setupFiles` para um arquivo que registra `afterEach(cleanup)`. O teste
  `testingLibraryCleanup.test.tsx` renderiza num `it` e, no seguinte, encontra `document.body` sem filhos sem chamar
  `cleanup`. Com o `setupFiles` removido, esse segundo `it` falha, o que prova que é a configuração que limpa.

- [ ] **Ligar a limpeza não perde nem afrouxa teste**
  A contagem de `pnpm --filter app test` depois da mudança é a de antes mais 2, sem teste pulado novo e sem
  `RTL_SKIP_AUTO_CLEANUP`. Se algum teste cair, a correção fica no próprio teste e é descrita no handoff com o nome do
  arquivo e o estado que ele herdava. Nenhum arquivo de teste existente perde asserção.

- [ ] **As chamadas manuais de `cleanup` continuam funcionando**
  Os 82 arquivos que chamam `cleanup` por conta própria passam sem edição. A chamada no meio de um teste
  (`usersListLastAccess.test.tsx:314`) segue limpando naquele ponto, e a limpeza global depois dela não falha.

- [ ] **Uma só função decide o que é um instante legível**
  `readFirestoreInstant` em `@repo/shared` devolve `Date` para `Date` válido, string que o `Date` entende e objeto com
  `toDate()` que devolve data válida; devolve `null` para `Date` inválido, string ilegível, `null`, `undefined`, número,
  array e objeto sem `toDate`. O teste do helper cobre cada um desses casos. Não há mais `typeof ...toDate ===
  "function"` em `user.mapper.ts`, `organization-invitation.repository.ts` nem `onboarding.ts`.

- [ ] **O mapper de usuário não muda de comportamento**
  `toDate` em `user.mapper.ts` delega a leitura e devolve o valor original quando ela falha. `userMapper.test.ts`
  passa sem edição. Uma string ilegível num campo de instante do perfil continua saindo como estava gravada, e um campo
  ausente continua ausente.

- [ ] **O convite falha fechado com validade ilegível**
  Os três usos de `instantOf` passam a chamar `readFirestoreInstant`. Um `expiresAt` que não se lê como instante faz o
  convite contar como expirado na aceitação e como fechado na contagem de pendentes. `organizationInvitationsRoute`,
  `invitationsRoutes` e o teste de emulador do convite seguem verdes.

- [ ] **O `completedAt` do onboarding sai sempre em ISO completo**
  Uma string só com data (`"2026-01-02"`) sai `"2026-01-02T00:00:00.000Z"`. `null` continua `null`, e valor ilegível
  continua tornando o estado inteiro `null` (o perfil é tratado como concluído), como no teste existente de campo
  malformado.

- [ ] **`normalizeFirestoreInstant` não muda**
  O arquivo ganha só a função nova; o corpo de `normalizeFirestoreInstant` e os testes dos seus chamadores ficam como
  estão.

- [ ] **Gates estáticos limpos**
  `pnpm check`, `pnpm --filter app typecheck` e `pnpm --filter api typecheck` passam.

## 10. Blueprint técnico

### 10.1 Parte A

`apps/app/vitest.setup.ts` (novo):

```ts
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// With `globals` off, Testing Library cannot find a global `afterEach` to register its
// own cleanup, so every test file would otherwise have to remember it.
afterEach(cleanup);
```

`apps/app/vitest.config.mts`:

```diff
     test: {
         environment: "jsdom",
+        setupFiles: ["./vitest.setup.ts"],
         // The 5s default is a wall-clock budget, ...
         testTimeout: 20_000,
     },
```

O `tsconfig.json` da `app` já inclui `**/*.ts`, então o arquivo entra no typecheck sem mudança. Ordem dos hooks: no
Vitest 4 o padrão de `sequence.hooks` é `stack`, então o `afterEach` do setup (registrado primeiro) roda **depois** dos
`afterEach` de cada arquivo. Os `vi.useRealTimers()` e `vi.unstubAllEnvs()` dos arquivos
(`useCheckoutConfirmation.test.tsx:40-41`, `useBillingSummary.test.tsx:52-53`) rodam antes do desmonte. Se algum
efeito de desmonte depender de timer falso ou de env, a medição do §7 mostra.

`apps/app/__tests__/testingLibraryCleanup.test.tsx` (novo): dois `it` em sequência, sem `cleanup` importado. O primeiro
faz `render(<p>montado</p>)` e confere `document.body.childElementCount` maior que 0; o segundo confere que é 0. Texto
de teste não é string de UI, então não passa pelo dicionário.

`docs/review-checklist.md:160-161`, na linha de localização dos testes:

```diff
 - [ ] Localização `apps/<app>/__tests__/<assunto>.test.ts(x)`; imports explícitos de `vitest`
-      (`globals` não está ligado); sem `toBeInTheDocument` (não há jest-dom no setup).
+      (`globals` não está ligado); sem `toBeInTheDocument` (não há jest-dom no setup). Na `app`, o
+      `cleanup` do Testing Library roda depois de cada teste pelo `vitest.setup.ts`: não repita
+      `afterEach(cleanup)` em arquivo novo.
```

### 10.2 Parte B

`packages/shared/utils/helpers/normalizeFirestoreInstant.ts`, função nova no mesmo arquivo, que já é o lugar do pacote
que conhece o formato de instante do Firestore e já é exportado pelo barril (`packages/shared/utils/helpers/index.ts`):

```ts
/** A readable instant as a `Date`, or `null` when the value is absent or cannot be read as one. */
export function readFirestoreInstant(value: unknown): Date | null {
    const candidate =
        typeof value === "string"
            ? new Date(value)
            : value instanceof Date
              ? value
              : typeof (value as { toDate?: unknown } | null)?.toDate === "function"
                ? (value as { toDate: () => Date }).toDate()
                : null;
    return candidate && !Number.isNaN(candidate.getTime()) ? candidate : null;
}
```

A forma exata (ternário ou `if`) fica com o `/develop` e o Biome; o contrato é a tabela do critério 4. `Date` válido
volta o **mesmo** objeto, como hoje nos três helpers.

`apps/api/(shared)/mappers/user.mapper.ts`:

```diff
+import { readFirestoreInstant } from "@repo/shared/utils";
 ...
 /** A value that is not a readable instant is handed back as stored rather than turned into an invalid Date. */
 function toDate(value: unknown): unknown {
-    if (value instanceof Date) { ... }
-    if (typeof value === "string") { ... }
-    const maybeTimestamp = ...
-    if (typeof maybeTimestamp?.toDate === "function") { ... }
-    return value;
+    return readFirestoreInstant(value) ?? value;
 }
```

O import de `@repo/shared/utils` já existe no arquivo (`AllOptional`, `:3`); a função entra no mesmo import.

`apps/api/(shared)/repositories/organization-invitation.repository.ts`:

```diff
+import { readFirestoreInstant } from "@repo/shared/utils";
 ...
-function instantOf(value: unknown): Date | null { ... }
 ...
-    const expiresAt = instantOf(data.expiresAt);
+    const expiresAt = readFirestoreInstant(data.expiresAt);
 ...
-    const expiresAt = instantOf(invitation.get("expiresAt"));
+    const expiresAt = readFirestoreInstant(invitation.get("expiresAt"));
 ...
-            const lastSentAt = instantOf(currentData?.lastSentAt);
+            const lastSentAt = readFirestoreInstant(currentData?.lastSentAt);
```

`apps/api/(shared)/lib/onboarding.ts`:

```diff
+import { readFirestoreInstant } from "@repo/shared/utils";
 ...
-function toIsoInstant(value: unknown): string | null { ... }
 ...
-    const completedAtIso = toIsoInstant(completedAt);
+    const completedAtIso = readFirestoreInstant(completedAt)?.toISOString() ?? null;
```

O `/develop` confere se o `apps/api/package.json` já declara `@repo/shared` (os mappers vizinhos importam dele, por
exemplo `session.mapper.ts:3`); não há dependência nova.

### 10.3 Ordem de implementação e commits sugeridos

1. `test(app): run Testing Library cleanup after every test` com `vitest.setup.ts`, `vitest.config.mts` e
   `testingLibraryCleanup.test.tsx` (medir antes de criar os arquivos).
2. `feat(shared): add readFirestoreInstant` com o helper e o teste dele.
3. `refactor(api): read Firestore instants through readFirestoreInstant` com os três arquivos e a extensão de
   `onboardingState.test.ts`.
4. `docs: note the global Testing Library cleanup in the review checklist`.
5. `docs(features): test-cleanup-and-todate`.

Nenhum desses arquivos está modificado no working tree atual (a feature `audit-log-levels`, não commitada, mexe em
outros). O `useListAuditEvents.test.tsx`, que está modificado por ela, é um dos 24 sem `cleanup`, mas esta tarefa não o
edita; ele só passa a ser limpo pela configuração. Se ele cair na medição, a correção toca um arquivo em voo e precisa
ser registrada no handoff como conflito com a outra feature.

Env nova: nenhuma. Infra: nenhuma.

## 11. Perguntas em aberto

Nenhuma bloqueia. Cada uma já vem com a opção adotada.

1. **Remover as 82 chamadas manuais de `cleanup` agora?** Adotado: não. A configuração resolve na raiz, a checklist
   impede a repetição em teste novo, e a remoção é uma tarefa mecânica separada que toca 82 arquivos, dois deles em
   voo na `audit-log-levels` (`auditFilters.test.tsx`, `auditListFiltersSurvive.test.tsx`).
2. **`readFirestoreInstant` em `@repo/shared` ou em `apps/api/(shared)/lib/`?** Adotado: `@repo/shared`, no arquivo de
   `normalizeFirestoreInstant`. A função não tem domínio, o pacote já é dono do conhecimento de "instante do Firestore
   por duck-typing", e assim o próximo leitor acha as duas juntas. Alternativa: um arquivo na `api`, com raio menor
   (um commit a menos), mas deixando o conhecimento espalhado em dois pacotes.
3. **Rebaixar `normalizeFirestoreInstant` para cima da função nova?** Adotado: não nesta tarefa (§1.2). Vira achado
   para o `/spec --sync`.
4. **Aplicar o mesmo setup no `@repo/design-system`?** Adotado: não. Os 13 arquivos dele já limpam, e não há
   reprodução da instabilidade sob carga.

## 12. Decisões tomadas sem perguntar

| # | decisão | adotada | descartada e por quê |
|---|---------|---------|----------------------|
| D1 | Como ligar a limpeza | `setupFiles` com `afterEach(cleanup)` explícito | `globals: true`: faria o próprio Testing Library registrar a limpeza, mas muda a convenção de imports explícitos que a checklist cobra (`review-checklist.md:160-161`) e expõe `describe`/`it`/`vi` globais em todo arquivo |
| D2 | Teste que cair com a limpeza | corrigir o teste | `skip`, `RTL_SKIP_AUTO_CLEANUP` ou excluir o arquivo do setup: afrouxa teste, proibido pela política (§1) |
| D3 | As 82 chamadas manuais | ficam | remover: churn grande sem mudança de comportamento e conflito com arquivos em voo |
| D4 | Design system sob carga | fora, com motivo | investigar sem repro: a auditoria rodou 173/173 e o pacote já limpa em todos os arquivos |
| D5 | Consolidar os três helpers | uma função de leitura (`Date \| null`) e três adaptadores de uma linha | uma função única com uma saída só: mudaria o tipo que dois dos chamadores usam; deixar como está: mantém a divergência de string e o `Invalid Date` aceito no convite |
| D6 | Onde fica a função | `@repo/shared`, ao lado de `normalizeFirestoreInstant` | `apps/api/(shared)/lib/`: ver pergunta 2 |
| D7 | `normalizeFirestoreInstant` | intocado | reescrever sobre a função nova: muda comportamento em 30+ chamadores, inclusive na `app` |
| D8 | Teste do convite | nenhum unitário novo; o de emulador existente cobre o repositório | teste de emulador novo: provaria o mesmo que o teste do helper |

## 13. Achados para o backlog

- `normalizeFirestoreInstant` lança `RangeError` com `Date` inválido (`normalizeFirestoreInstant.ts:13-15`, o
  `toISOString()` sem checagem) e devolve string ilegível como veio (`:10-12`). Inalcançável com os escritores atuais.
  Candidato a usar `readFirestoreInstant` numa tarefa própria. P.
- Remoção mecânica das chamadas manuais de `cleanup` na `app`, depois que a `audit-log-levels` for commitada. P.
