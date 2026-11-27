# Handoff do `/develop`: test-cleanup-and-todate

Rodada autônoma do `/cycle`, branch `feat/audit-log-levels` (o usuário quer as tarefas nela). Nada commitado, nada no
índice. Nenhum arquivo das outras quatro tarefas em voo foi editado: a Parte A não derrubou teste nenhum, então o
`useListAuditEvents.test.tsx` e os demais ficaram intocados.

## Blueprint → arquivos

| item | arquivos |
|------|----------|
| A. limpeza global do Testing Library | `apps/app/vitest.setup.ts` (novo), `apps/app/vitest.config.mts` (`setupFiles`) |
| A. canário | `apps/app/__tests__/testingLibraryCleanup.test.tsx` (novo) |
| A. checklist | `docs/review-checklist.md` §6, linha da localização dos testes |
| B. função de leitura | `packages/shared/utils/helpers/normalizeFirestoreInstant.ts` (`readFirestoreInstant` adicionada; `normalizeFirestoreInstant` intocada) |
| B. teste do helper | `packages/shared/__tests__/readFirestoreInstant.test.ts` (novo, 15 testes) |
| B. mapper de usuário | `apps/api/(shared)/mappers/user.mapper.ts` (`toDate` vira `readFirestoreInstant(value) ?? value`) |
| B. convite | `apps/api/(shared)/repositories/organization-invitation.repository.ts` (`instantOf` removida; os 3 usos chamam a função nova) |
| B. onboarding | `apps/api/(shared)/lib/onboarding.ts` (`toIsoInstant` removida) |
| B. testes da api | `apps/api/__tests__/onboardingState.test.ts` (2 casos novos), `apps/api/__tests__/organizationInvitationExpiry.test.ts` (novo, 7 testes) |

`apps/api/package.json` já declarava `@repo/shared` (`workspace:*`, linha 24). Nenhuma dependência nova.

## Contrato

Nenhum DTO nem action do SDK mudou. `readFirestoreInstant` é export novo de `@repo/shared/utils` (pelo barril de
`helpers/index.ts`, que já reexporta o arquivo). Consumidores: os três arquivos da api acima.

## Códigos de erro novos

Nenhum.

## Desvios em relação ao plano

1. **D8 revertida: o convite ganhou teste unitário.** O plano dizia que o teste de emulador bastava. Não basta: o
   emulador só aceita gravar o que o Firestore aceita, e um `Date` inválido não chega lá. O comportamento declarado
   como mudado ("convite com `expiresAt` ilegível falha fechado") ficaria sem prova. O teste novo
   `organizationInvitationExpiry.test.ts` falsifica o `db` com `vi.mock("@/(shared)/infra/database")` e chama
   `acceptByTokenHash` com o e-mail trocado de propósito: validade legível e futura para em `email-mismatch`, validade
   ilegível para em `expired`.
2. **`readFirestoreInstant` também recusa `toDate()` que não devolve `Date`.** O esboço do plano confiava no tipo de
   retorno; um objeto com `toDate: () => "2026-01-02"` passaria adiante uma string e quebraria no `getTime()`. Agora
   vira `null`. Coberto no teste do helper.
3. **Mudança de comportamento a mais no onboarding, não listada no plano.** Um objeto com `toDate()` que devolve
   data inválida fazia o `toIsoInstant` antigo lançar `RangeError` (o `toISOString()` sem checagem). Agora o estado
   vira `null`, como qualquer outro valor ilegível. Coberto em `onboardingState.test.ts` ("returns null for an
   unreadable instant instead of throwing").
4. **Na contagem de pendentes do convite (`isOpen`) não há mudança observável para `Date` inválido.** O plano dizia
   que passaria a contar como fechado; já contava, porque `NaN > now` dá `false`. A mudança real em `isOpen` é a
   string ISO legível, que antes era `null` (fechado) e agora conta pela data.

## Decisões em aberto

Nenhuma.

## Validação

### Parte A, antes e depois

`pnpm --filter app test` roda o script do pacote direto, sem cache do turbo.

| medição | `uptime` (load 1/5/15) início → fim | arquivos | testes | falhos | pulados |
|---------|--------------------------------------|----------|--------|--------|---------|
| antes, sem setup | 3.57 / 8.28 / 16.65 → 21.38 / 13.08 / 17.83 | 154 | 1403 | 0 | 0 |
| depois, com setup | 15.41 / 12.34 / 17.42 → 26.61 / 16.98 / 18.60 | 155 | 1405 | 0 | 0 |
| depois, de novo, pelo turbo (`pnpm turbo run test --filter=app ...`, cache miss) | 5.99 / 11.70 / 16.15 → 53.46 / 48.59 / 31.96 | 155 | 1405 | 0 | 0 |

Conferência arquivo a arquivo: extraí do log de cada execução a lista `arquivo N tests` e rodei `diff` entre antes e
depois. A única linha a mais é `__tests__/testingLibraryCleanup.test.tsx 2 tests`; os outros 154 arquivos têm a mesma
contagem. Nenhum `Timeout starting forks runner` nem timeout de 20 s nas três execuções, mesmo com load 53.
`grep -r RTL_SKIP_AUTO_CLEANUP apps/app` → nada.

Mutação do canário: com o `testingLibraryCleanup.test.tsx` já escrito e o `setupFiles` ainda ausente,
`npx vitest run __tests__/testingLibraryCleanup.test.tsx` → o segundo `it` cai com `expected 1 to be +0`. Com o setup
ligado, os dois passam.

### Parte B, mutações

- Helper (`packages/shared`), cada mutação aplicada e revertida a partir de uma cópia no scratchpad, conferida com
  `cmp`:
  - sem a checagem de `NaN` → 3 testes caem (`Date` inválido, string ilegível, `toDate()` inválido);
  - sem a guarda `instanceof Date` sobre o retorno de `toDate()` → 1 cai;
  - string vira `null` → 2 caem (ISO e só-dia).
- api: `organization-invitation.repository.ts` e `onboarding.ts` trocados temporariamente pela versão do `HEAD`
  (`git show HEAD:...`) e restaurados da cópia. Com os helpers antigos, 5 de 23 caem: só-dia em ISO completo,
  instante ilegível sem lançar, string ISO futura aceita no convite, `Date` inválido como expirado e `toDate()`
  inválido como expirado. Com os novos, 23 de 23.

### Gates

| gate | comando | resultado |
|------|---------|-----------|
| testes app, api, shared | `pnpm turbo run test --filter=app --filter=api --filter=@repo/shared` | 12/12 tasks; app 155/1405, api 136/1975, shared 6/78 |
| emulador | `JAVA_HOME=/opt/homebrew/opt/openjdk@21 ... pnpm turbo run test:emulator --filter=api` | 12 arquivos, 284 testes; `organizationInvitation.emulator.test.ts` 7/7 |
| typecheck | `pnpm turbo run typecheck --filter=app --filter=api` | 2/2; api repetido depois do reordenamento de import, 1/1 |
| lint | `pnpm check` | passou depois de `biome check --write` reordenar o import do repositório de convite |

`userMapper.test.ts` não foi editado e está dentro dos 1975 da api, então o `toDate` do mapper manteve o comportamento
que a suíte cobre.

`packages/shared` não tem script `typecheck`. A função nova é verificada pelo typecheck da api, que a importa; o
arquivo de teste dela não passa por `tsc`.

## A verificar no `/test`

- Repetir a comparação da Parte A com `pnpm --filter app test` (esperado 155/1405, nenhum pulado) e a mutação do
  canário (tirar `setupFiles`, ver o segundo `it` cair, restaurar).
- O plano cita a chamada de `cleanup` no meio de `usersListLastAccess.test.tsx:314`. Ela passou nas três execuções,
  mas não medi isoladamente que a limpeza global depois dela não falha; está implícito no arquivo verde.

## Lacunas de teste conhecidas

- O `isOpen` do convite (contagem de pendentes e reenvio em `issue`) não tem teste unitário com `expiresAt` ilegível.
  Hoje ele já falhava fechado com `Date` inválido (ver desvio 4); o único caso novo é string ISO legível, que o teste
  de aceitação cobre pela mesma função.
- Achados que continuam abertos, herdados do plano §13: `normalizeFirestoreInstant` lança `RangeError` com `Date`
  inválido e devolve string ilegível como veio; remoção mecânica das 82 chamadas manuais de `cleanup`.
