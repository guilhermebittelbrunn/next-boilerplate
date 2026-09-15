---
slug: account-settings
title: Área de conta e preferências do usuário
task: -
spec: account-settings
branch: app/feat/account-settings
epic: -
updated: 2026-09-15 09:53
---

# Pipeline — Área de conta e preferências do usuário

| etapa   | status      | quando           | artefato        | resumo (1 linha) |
|---------|-------------|------------------|-----------------|------------------|
| analyze | done        | 2026-09-14 22:23 | analyze/plan.md | Slice `/account` com 4 rotas sob `requireCommonPanelApi`, 3 campos aditivos no doc `user`, 12 commits. |
| develop | done        | 2026-09-14 23:18 | develop/handoff.md | 12 unidades entregues (sdk→api→app→i18n); 4 rotas, aba `/account`, 6 `apiErrors`; gates verdes. |
| review  | in-progress | 2026-09-15 09:58 | review/review.md | **Rodada 2**: D-1 (tema da conta perdia para override local, com flash) corrigido em `apps/app` com contrato declarado — conta semeia quem não escolheu, escolha local espelha no cookie; flash medido como eliminado (SSR == DOM); +6 casos de teste; gates 23/23 sem cache. Rodada 1: revogação de sessão não valia para bearer token (objetivo #3), corrigida em `packages/auth`; IDOR provado com 2 contas. |
| test    | blocked     | 2026-09-15 09:53 | test/report.md | Rodada 2: flash do tema corrigido, mas **com `?redirect=` nenhuma preferência é projetada** (objetivo #4 do corte) e o campo Idioma não recarrega o valor salvo. 33 ✅ / 1 ❌ / 4 🔒. |
| observe | pending     | -                | -               | - (opcional)     |

## Notas
- Spec de origem: `specs/account-settings.md` (não mover nem editar aqui — é do `/spec --sync`).
- As 9 perguntas em aberto foram **decididas** no plano (§21); nenhuma bloqueia o `/develop`.
- ⚠️ Cloud Storage **desativado** no projeto Firebase: o caminho feliz do avatar não é verificável.
  O `/test` deve validar o **modo degradado** (§16), não reprovar. Pré-requisitos de infra em §17.
  O modo degradado foi exercido na revisão: `POST /files` ⇒ **503** traduzido, formulário intacto.
- **Contrato do tema (decidido na revisão, rodada 2)**: a conta é o padrão entre dispositivos e semeia
  todo navegador que ainda não escolheu; o botão do cabeçalho é um **override local**, válido até ser
  mudado ali ou na tela de Preferências. O cookie `x-theme` sempre espelha o tema ativo — é isso que
  mantém a primeira pintura do servidor igual à do cliente. Fixado por teste.
- `review` fica `in-progress`: nada foi commitado. O plano de commits (12 blocos, 3 assuntos) está em
  `review/review.md`; quem aprova, commita e marca `done` é o `/review`.
- Contas de QA criadas nesta revisão: `rv-a@example.com` e `rv-b@example.com` (senhas descartáveis, não
  registradas). Somam-se às contas de QA acumuladas de ciclos anteriores.
- O `/test` criou mais duas: `qa-account-settings-a@example.com` e `qa-account-settings-b2@example.com`.
  A lista completa para limpeza está na §8 do `test/report.md`. Nenhuma senha foi gravada em arquivo.
- **D-1 (rodada 1) — resolvido.** O `/review` fez do `themePreference.ts` o escritor único e o cookie
  `x-theme` passou a espelhar o tema ativo: o flash acabou (classe do servidor == classe do DOM).
- ⚠️ **Dois defeitos de produção continuam abertos** (rodada 2, §4 do relatório), devolvidos sem correção
  porque o teto de rodadas do `/test` foi atingido:
  - **D-3** — com `?redirect=` (login por sessão expirada) **nenhuma preferência é projetada**.
    `seedThemeIfUnset` só é alcançado por `resolveDefaultPostLoginForApp`, e os dois chamadores retornam
    antes quando há `?redirect=` (`postLoginNavigation.ts:88-91` e `packages/auth/provider.tsx:85-88`,
    este último não modificado). Reprova o critério **D4** e o **objetivo #4 do corte**.
  - **D-4** — na tela de Preferências o campo **Idioma** não recarrega o valor salvo (vem vazio quando a
    conta não está em `pt-br`) e bloqueia o save com um erro cru do Zod, não traduzido.
