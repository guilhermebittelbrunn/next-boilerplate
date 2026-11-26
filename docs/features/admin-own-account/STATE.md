---
slug: admin-own-account
title: "Área de conta para o admin (perfil, senha e preferências)"
task: -
spec: admin-own-account
branch: feat/admin-account-forms-and-session-revocation
epic: -
updated: 2026-11-26 12:03
---

# Pipeline — Área de conta para o admin (perfil, senha e preferências)

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-25 21:00 | analyze/plan.md | Guard novo `requireOwnAccountApi` em `common-panel.ts` (sujeito comum ou o próprio admin sem personificação) em `GET`/`PUT /account`, `POST /account/password`, `POST /account/password/set` e no upload pessoal de `POST /files` (despacho por escopo). Tela `/admin/account` com Perfil, Segurança (só senha) e Preferências, reaproveitando os componentes da conta comum por props com default atual. "Minha conta" via prop `accountPath` do layout admin. SDK sem mudança, nenhum código de erro novo, 2 chaves de i18n, zero env e infra. 8 decisões por padrão |
| develop | done    | 2026-11-25 21:25 | develop/handoff.md | `requireOwnAccountApi` (funções nomeadas delegando para um corpo comum) nas 4 rotas de conta e no upload pessoal; tela `/admin/account` com 3 seções; 2 chaves de i18n. API 1852/1852, app 1351/1351 (com instabilidade sob carga em 2 arquivos alheios), typecheck, `pnpm check` e paridade verdes. Sem smoke de runtime |
| review  | done    | 2026-11-26 12:03 | review/review.md | Nenhum bloqueante. Guard, despacho de `POST /files` e `password/set` conferidos por leitura; checklist §1 passou a citar `requireOwnAccountApi`. Gates estáticos verdes. Plano de 18 commits combinando as duas features, com commit misto para os três formulários da conta. Branch proposta `feat/admin-account-and-centered-forms` |
| test    | done    | 2026-11-25 22:44 | test/report.md  | 14 critérios ✅, 1 🔒 (admin só com Google definindo senha), nenhum ❌. Os 10 itens do "Verificar no `/test`" medidos por HTTP e browser contra o emulador; os 403/400 com `error.code` literal conferem. 3 testes novos fecham as lacunas herdadas (9 casos). API 1852/1852 e emulador 274/274; app 1359/1360 sob load 35-58, com falha alternada em arquivos que não mudaram (instabilidade pré-existente, passam isolados). Portas liberadas |
| observe | pending | -                | -               | - (opcional)     |

## Notas

### Origem

- Spec `specs/features/admin-own-account.md` (`approved`). Rodou em modo autônomo dentro do `/cycle`; decisões em
  `analyze/plan.md`, "Perguntas em aberto (decididas por padrão)". As duas perguntas da spec seguiram a
  recomendação dela: reaproveitar as rotas `/account` com guard próprio, e sessões ativas fora do corte.

### Para o `/develop`

- O working tree carrega `app-form-layout-centered` sem commit. `AccountProfileForm.tsx`, `AccountSecurityForm.tsx` e
  `AccountPreferencesForm.tsx` mudam nas duas features (`plan.md` §10.9). Preserve a remoção de `flex-1` delas.
- Não toque `formLoadingSkeletons.test.tsx` (da feature anterior); o teste do esqueleto do admin vai em arquivo próprio.
- Lacuna fora da spec, já no plano: o upload de avatar passava por `requireOrganizationApi` e recusaria o admin.

### Pré-requisitos de infra

- Nenhum.

### Do `/test`

- O gate do `review` segue `in-progress` porque o `/cycle` não commita; não há commit da feature à frente de
  `main`. O `/test` foi marcado `done` com isso registrado em `test/report.md`.
- Instabilidade sob carga em `signInEmailLinkEntry.test.tsx` e `auditFiltersDateInput.test.tsx` (pré-existente,
  arquivos e imports iguais a `main`): sugestão de backlog para alargar os prazos.
