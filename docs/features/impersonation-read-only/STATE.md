---
slug: impersonation-read-only
title: Impersonação é somente leitura em todos os painéis
task: -
spec: -
branch: api/fix/impersonation-read-only
epic: -
updated: 2026-08-22 10:47
---

# Pipeline — Impersonação é somente leitura em todos os painéis

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-08-22 08:33 | analyze/plan.md | Plano consolidado com as 7 decisões do usuário: helper `assertReadOnlyWhileImpersonating` nos dois guards + `error.code` novo + teste de varredura de guards + espelho de UI em `entities` + bootstrap do admin de DEV |
| develop | done    | 2026-08-22 09:21 | develop/handoff.md | Helper `assertReadOnlyWhileImpersonating` nos dois guards + `error.code` novo ×3 idiomas, `authGuard` removido, sinal `isImpersonating` + aviso + 5 afordâncias suprimidas em `entities`, script `create-dev-admin.mjs`; 45 testes na api / 120 na app, fluxo validado no browser (light+dark+mobile) e o 403 provado por `curl` |
| review  | done    | 2026-08-22 10:47 | review/review.md | Equivalência do guard admin e ordem do `common-panel` verificadas, fail-closed sem furo, visual em light+dark+mobile; correções: senha descartada em silêncio no script de DEV, docstring falsa, ponteiros para o guard deletado, 🔴 do BACKLOG fechado — e, por decisão do usuário, o **`FormattedError`** (SDK parou de embrulhar): o 403 agora exibe a copy traduzida no locale ativo, com sign-in/sign-up revalidados e `apiErrorCopy.test.ts` travando a regressão; `pnpm test` 173 |
| test    | pending | -                | -               | -                |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- **Origem**: achado 🔴 de segurança do `specs/BACKLOG.md:113` ("Achados da varredura que não viraram
  spec"). Não passa por `/spec`; o achado sai do backlog quando o `/spec --sync` rodar.
- **Feature precedente obrigatória**: `docs/features/auth-panel-context/`. A lacuna já tinha sido
  levantada lá, em `review/review.md:131-135` ("Decisões em aberto" #2) — o `requireAdminApi` foi
  endurecido e o guard comum não foi revisitado.
- **Escopo aprovado pelo usuário** (seção "Decisões tomadas" do plano; o `/develop` não precisa
  reabrir nada):
  1. **D1** bloqueio absoluto — sem escape hatch, e o ponto de extensão fica só nomeado no plano,
     nunca em código nem no `AUTH-PANEL.md`;
  2. **D2** `error.code` novo `AUTH_REQUEST_IMPERSONATION_READ_ONLY` (403) nos **dois** guards;
     `AUTH_REQUEST_PANEL_FORBIDDEN` **permanece** (não fica órfão — `auth-request-context.ts:48` e `:77`);
  3. **D3** aviso só nas telas com ação mutante, citando o usuário — **sem** criar interpolação no
     i18n (reusa `navbar.actingAsUserLabel`, hoje órfã);
  4. **D4** remover `apps/api/app/(guards)/auth.ts` em commit separado (grep repo-wide: zero importadores);
  5. **D5** helper explícito `assertReadOnlyWhileImpersonating()` + **teste que varre `app/(guards)/`**
     como mitigação do esquecimento em guard novo;
  6. **D6** teste de componente da lista sob impersonação é obrigatório;
  7. **D7** o **admin de DEV vira entregável**: `apps/api/scripts/create-dev-admin.mjs`.
- **Verificado, e é o que sustenta o plano**: `requestRole !== ADMIN` (predicado atual do `admin.ts`) é
  **equivalente** a `isImpersonating` para um ator admin, então unificar é refactor puro no guard admin.
  As três rotas de bypass por header já falham fechadas antes do sinal (plano §4.3).
- **Lacuna de teste que a tarefa fecha**: `requireCommonPanelApi` — o guard do slice de referência — tem
  **cobertura zero** hoje. Só existe `apps/api/__tests__/adminGuard.test.ts`.
- ✅ **Bloqueio herdado, resolvido**: o fluxo de impersonação nunca tinha sido validado no browser por
  falta de admin de DEV. O script de bootstrap (§8.1) foi entregue **e executado**, e o fluxo completo
  rodou em `light + dark + mobile` no `/develop`. A senha usada foi gerada na hora e **não** está em
  nenhum arquivo.
- **Sem SDK, sem Firestore de produto, sem env nova, sem migração.** Única dependência adicionada:
  `firebase-admin` como **devDependency** de `apps/api` (mesma versão já travada por `packages/auth`).
- **Documentação**: `docs/AUTH-PANEL.md` (§3, §5, §7, §9) é fonte única declarada e exige atualização;
  `docs/SETUP.md` ganha **uma subseção** sobre o admin de DEV. **Não** editar
  `specs/firebase-emulator-seed.md` (delimitação em §8.2 do plano).
- **1 pergunta em aberto** (não bloqueia o `/develop`, tem default): o aviso mostra o UID truncado
  quando `impersonatedLabel` ainda não hidratou — default é aceitar, igual ao navbar.
- ⚠️ **Escopo ampliado no `/develop`, por decisão do usuário**: a regra `useFilenamingConvention` foi
  reconfigurada no `biome.jsonc` (aceita camelCase/PascalCase/kebab-case) porque **94 dos 289** erros de
  lint eram a convenção do repo brigando com o linter. `pnpm check` foi de **289 → 197** erros. Sete
  comentários `biome-ignore` ficaram mortos e foram removidos. **Para o `/review`**: `biome.jsonc`, os 2
  arquivos de `packages/design-system` e os 5 módulos de `entities` (só a linha 1) não pertencem à
  feature — pedem commit próprio. Detalhe em `develop/handoff.md`.
- **Achado registrado, fora de escopo**: `hydration mismatch` do `PanelNavbarControls` foi adicionado à
  tabela de achados do `specs/BACKLOG.md` (decisão do usuário: vira tarefa própria).
