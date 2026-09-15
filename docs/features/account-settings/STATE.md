---
slug: account-settings
title: Área de conta e preferências do usuário
task: -
spec: account-settings
branch: app/feat/account-settings
epic: -
updated: 2026-09-15 (reconciliado pelo `/spec --sync` após o merge da PR #12)
---

# Pipeline — Área de conta e preferências do usuário

| etapa   | status      | quando           | artefato        | resumo (1 linha) |
|---------|-------------|------------------|-----------------|------------------|
| analyze | done        | 2026-09-14 22:23 | analyze/plan.md | Slice `/account` com 4 rotas sob `requireCommonPanelApi`, 3 campos aditivos no doc `user`, 12 commits. |
| develop | done        | 2026-09-14 23:18 | develop/handoff.md | 12 unidades entregues (sdk→api→app→i18n); 4 rotas, aba `/account`, 6 `apiErrors`; gates verdes. |
| review  | done        | 2026-09-15 11:36 | review/review.md | **Rodada 3**: os 2 defeitos do `/test` corrigidos — projeção das preferências separada da decisão de destino (roda também com `?redirect=`, sem relaxar o guard de open-redirect) e o `HookFormSelect` deixou de aceitar o valor vazio que o primitivo emite antes de montar as opções (raiz, vale para todos os formulários). 2 testes que **mordem** (provado por mutação) + 1 declaradamente insensível; gates 23/23 sem cache, app 262. Também registrado: na rodada 2 eu confundi coerência SSR/DOM com projeção. **Rodada 2**: D-1 (tema da conta perdia para override local, com flash) corrigido em `apps/app` com contrato declarado — conta semeia quem não escolheu, escolha local espelha no cookie; flash medido como eliminado (SSR == DOM); +6 casos de teste; gates 23/23 sem cache. Rodada 1: revogação de sessão não valia para bearer token (objetivo #3), corrigida em `packages/auth`; IDOR provado com 2 contas. |
| test    | done        | 2026-09-15 09:53 | test/report.md | Rodada 2 (o artefato): 33 ✅ / 1 ❌ / 4 🔒, com D-3 e D-4 em aberto. **Os dois foram corrigidos depois, na rodada 3 do `/review` (11:36), e a correção está no código mergeado** — ver Notas. Os 4 🔒 seguem não verificados por falta de Cloud Storage ativo. |
| observe | pending     | -                | -               | - (opcional)     |

## Notas

> **Fechamento — auditoria de 2026-09-15 (`/spec --sync`).** A feature foi **entregue e mergeada**: PR
> **#12**, merge commit `a4df5ed` em `main` (14:12:48Z), CI `success` nesse SHA. Os **6 itens do corte de
> MVP** foram reconferidos **um a um no código**, com evidência `arquivo:linha` marcada na spec arquivada
> ao lado (`spec.md`).
>
> ⚠️ **Este `STATE.md` estava atrasado e não foi usado como veredito** — segunda auditoria consecutiva em
> que isso acontece. Suas etapas `review` e `test` seguiam gravadas como `in-progress`/`blocked`, e o
> `updated` do frontmatter (09:53) era **anterior** ao carimbo da própria linha de `review` (11:36). Os
> status acima foram reconciliados **depois** da verificação no código, não antes.
>
> **Os dois defeitos que a linha de `test` reportava como abertos estão fechados no código mergeado**,
> verificado agora e não pelo relato da revisão:
> - **D-3** (`?redirect=` não projetava preferência) — `shared/lib/postLoginNavigation.ts:121` chama
>   `applyAccountPreferences` **antes** de ler o `redirect` em `:122`; fixado por teste em
>   `postLoginPreferences.test.ts:167`.
> - **D-4** (campo Idioma não recarregava o valor salvo) — corrigido na **raiz**, em
>   `hookformSelect.tsx:90`: o componente compartilhado deixou de aceitar o valor vazio que o primitivo
>   emite antes de montar as opções. Vale para todo formulário do repo, não só para este.

- Spec de origem: **arquivada em `docs/features/account-settings/spec.md`** (movida de `specs/` pelo
  `/spec --sync` em 2026-09-15, com `git mv`, preservando o histórico do arquivo).
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
