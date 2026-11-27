# Relatório de QA: test-cleanup-and-todate

Rodada autônoma do `/cycle` (rodada 1 de 2), último `/test` da madrugada. Branch `feat/audit-log-levels`, que não é
protegida. O QA não criou nem trocou branch, não commitou e não mexeu no índice. O índice já trazia dois `git mv` de
specs de outras tarefas (`admin-own-account`, `app-form-layout-centered`), que ficaram como estavam.

## Sem browser, e por quê

O diff não tem superfície de runtime de UI. A Parte A muda a configuração do Vitest da `app`; a Parte B muda como a api
lê instantes gravados no Firestore, e a diferença só aparece com dado malformado que a própria api não grava (ela
sempre grava `Date`). Subir app e api para provocar esse caso exigiria escrever o dado malformado à mão no emulador, e
o que se veria é o mesmo `ORGANIZATION_INVITATION_EXPIRED` que o teste unitário já prova no repositório. Não subi
nenhum serviço e não abri browser.

## Verificar no `/test` (lista do `review.md`)

| item | veredito | o que medi |
|------|----------|------------|
| Limpeza global sem efeito colateral, 155/1405 por arquivo | ✅ confirmado | `pnpm --filter app test`: 155 arquivos, 1405 testes, 0 pulados. Rodei a suíte inteira também sem o `setupFiles` e comparei a lista `arquivo → nº de testes` das duas execuções com `diff`: os 155 arquivos têm a mesma contagem. O handoff não guardou o log do "antes", então a comparação foi contra essa execução sem o setup. |
| Canário morde | ✅ confirmado | Sem `setupFiles`, `npx vitest run __tests__/testingLibraryCleanup.test.tsx` sai com código 1: o segundo `it` cai com `AssertionError: expected 1 to be +0`. Na suíte inteira sem o setup, é a única falha (1 de 1405). Config restaurada da cópia e conferida com `cmp`. |
| `usersListLastAccess.test.tsx:314` isolado | ✅ confirmado | Arquivo rodado sozinho com o setup ligado: 10 de 10. O `cleanup()` no meio do teste limpa a renderização em `en` antes da de `es`, e a limpeza global depois não lança. |
| Aceite de convite falha fechado, `HEAD` × atual | ✅ confirmado | Com o repositório do `HEAD`: 3 de 7 caem (string ISO futura, `Date` inválido, `toDate()` inválido). String ilegível e valor ausente já passavam no `HEAD`, como o review disse. Com o atual: 7 de 7. Repositório restaurado e conferido com `cmp`. |

As mutações rodaram com `npx vitest run` direto no workspace, sem nenhum gate oficial (`pnpm test`, turbo) durante a
troca. Os dois arquivos mexidos (`apps/app/vitest.config.mts` e `organization-invitation.repository.ts`) voltaram
idênticos à cópia do scratchpad.

## Testes criados

`apps/api/__tests__/organizationInvitationIssue.test.ts`, 9 testes, faixa barata (`vi.mock` do
`@/(shared)/infra/database` e de `server-only`, endereços `@example.com`). Fecha a lacuna do `isOpen`, que o handoff e o
review deixaram aberta:

- limite de pendentes: convite com validade futura conta (`limit-reached`); com validade futura gravada como string ISO
  também conta; com `Date` inválido, string ilegível, `toDate()` inválido ou ausente não conta (`issued`);
- reenvio: convite aberto enviado há pouco recusa (`recently-sent`); convite com validade ilegível ou com `lastSentAt`
  ilegível é reenviado (`issued`).

Mutações para provar que os testes mordem:

- repositório do `HEAD`: cai 1 de 9, o da string ISO futura (`expected { status: 'issued', … } to deeply equal
  { status: 'limit-reached' }`). Bate com o desvio 4 do handoff: para `Date` inválido o `isOpen` já falhava fechado,
  e a mudança real é a string ISO legível;
- `isOpen(currentData, input.now) &&` trocado por `true &&` na checagem de reenvio: cai "resends when the stored expiry
  cannot be read".

Repositório restaurado e conferido com `cmp` depois de cada mutação. `biome check` no arquivo novo passa.

Este arquivo entra no commit `fix(api): read stored instants through readFirestoreInstant` do plano de commits do
review, junto com `organizationInvitationExpiry.test.ts`.

## Decisões de custo de teste

| módulo tocado | decisão |
|---------------|---------|
| `readFirestoreInstant` (`@repo/shared`) | O unitário do develop (15 testes, faixa barata) basta; não criei nada. |
| `organization-invitation.repository.ts` | Unitário com `db` falsificado (o do develop e o novo deste QA). Nenhum teste de emulador novo: o emulador só grava o que o Firestore aceita, e `Date` inválido não chega lá. O `organizationInvitation.emulator.test.ts` existente segue verde. |
| `lib/onboarding.ts` | Os 2 casos novos do develop em `onboardingState.test.ts` bastam. |
| `user.mapper.ts` | `userMapper.test.ts`, sem diff, cobre o comportamento. |
| `apps/app/vitest.setup.ts` | O canário mais a comparação por arquivo da suíte cobrem. |

Nenhum teste da faixa cara foi criado.

## Critérios de aceite

| critério | status | meio |
|----------|--------|------|
| Limpeza vale para todo teste da `app` | ✅ | canário + mutação |
| Ligar a limpeza não perde nem afrouxa teste | ✅ | suíte com e sem setup, `diff` por arquivo; `rg RTL_SKIP_AUTO_CLEANUP` sem resultado |
| Chamadas manuais de `cleanup` continuam funcionando | ✅ | `usersListLastAccess.test.tsx` isolado; suíte verde |
| Uma só função decide o que é instante legível | ✅ | `readFirestoreInstant.test.ts`; `rg "instantOf\|toIsoInstant"` sem resultado |
| Mapper de usuário sem mudança de comportamento | ✅ | `userMapper.test.ts` sem diff, verde |
| Convite falha fechado com validade ilegível | ✅ | `organizationInvitationExpiry.test.ts` (aceite) + `organizationInvitationIssue.test.ts` (pendentes e reenvio), mutação contra o `HEAD` |
| `completedAt` do onboarding em ISO completo | ✅ | `onboardingState.test.ts` na suíte da api |
| `normalizeFirestoreInstant` não muda | ✅ | `git diff HEAD`: 18 inserções, 0 remoções |
| Gates do working tree inteiro verdes | ✅ | ver tabela abaixo |

## Gates

Este é o último `/test` da madrugada, então o `pnpm test` da raiz vale como gate do working tree inteiro, com as cinco
tarefas da branch juntas. Sem `--force`.

| comando | resultado | `uptime` (load 1/5/15) início → fim |
|---------|-----------|--------------------------------------|
| `pnpm --filter app test` | 155 arquivos, 1405 testes, 0 falhos, 0 pulados, 64 s | 4.00 / 17.67 / 22.49 → 12.58 / 17.53 / 22.08 |
| `JAVA_HOME=/opt/homebrew/opt/openjdk@21 PATH=…openjdk@21/bin:$PATH pnpm test` | 15/15 tasks, 12 do cache, 1 min 37 s | 12.91 / 16.14 / 20.69 → 15.53 / 17.34 / 20.72 |
| `pnpm turbo run lint typecheck` | 15/15 tasks, 13 do cache, 22 s; Biome: 1175 arquivos, nenhuma correção | 14.68 / 17.13 / 20.63 no início |

Contagem por workspace no `pnpm test` da raiz:

| workspace | arquivos | testes | origem |
|-----------|----------|--------|--------|
| `api` | 137 | 1984 | executado (136/1975 do handoff + o arquivo novo, 9 testes) |
| `api` `test:emulator` | 12 | 284 | executado (nunca vem do cache) |
| `web` | 36 | 319 | executado |
| `app` | 155 | 1405 | cache |
| `@repo/shared` | 6 | 78 | cache |
| `@repo/auth` | 16 | 216 | cache |
| `@repo/email` | 8 | 209 | cache |
| `@repo/design-system` | 14 | 173 | cache |
| `@repo/internationalization` | 7 | 67 | cache |
| `@repo/security` | 3 | 65 | cache |
| `@repo/analytics` | 3 | 41 | cache |
| `e2e` | 4 | 41 | cache |
| `@repo/next-config` | 2 | 39 | cache |
| `@repo/payments` | 3 | 19 | cache |
| `@repo/sdk` | 4 | 15 | cache |

Os dois comandos juntos formam a linha do job `verify` do CI (`lint typecheck test test:emulator`). Nenhum
`Timeout starting forks runner` nem teste pulado no log. O `typecheck` da api rodou sem cache por causa do arquivo de
teste novo; o da app veio do cache. A paridade de i18n veio do cache e não se aplica: o diff não toca tradução.

## Lacunas herdadas

| lacuna | veredito |
|--------|----------|
| `isOpen` do convite com `expiresAt` ilegível (pendentes e reenvio) | Fechada aqui, com `organizationInvitationIssue.test.ts`. |
| `usersListLastAccess.test.tsx:314` sem medição isolada (handoff) | Fechada aqui (ver tabela do review). |
| `normalizeFirestoreInstant` lança `RangeError` com `Date` inválido e devolve string ilegível como veio (plano §13) | Fora de escopo; continua aberta como achado do backlog. |
| Remoção das 82 chamadas manuais de `cleanup` | Fora de escopo; continua aberta. |
| Prévia (`invitations/preview/route.ts:39`) e listagem (`organization-invitation.mapper.ts:99`) tratam `expiresAt` gravado como string ilegível como válido | Fora de escopo, não é regressão desta tarefa; continua aberta para o backlog. |

## Defeitos

Nenhum defeito de produção encontrado nesta tarefa.

## Ambiente do e2e

Nenhum serviço subido. As portas 3000, 3001, 3002, 3003, 9099, 8080 e 4001 estavam livres no início e no fim. O
`test:emulator` sobe e derruba o próprio emulador dentro da task. Nenhuma conta de QA criada, nenhum dado de dev
alterado, nenhuma credencial usada.

## Estado do pipeline

A etapa `review` estava `in-progress`. Os commits desta tarefa ainda não existem (o plano de commits do review roda
depois das outras tarefas da branch), então não é gate esquecido: a revisão terminou sem achado bloqueante e este QA a
marca como `done`.
