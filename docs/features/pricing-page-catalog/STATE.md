---
slug: pricing-page-catalog
title: Página de preços a partir do catálogo da Stripe
task: -
spec: pricing-page-catalog
branch: feat/pricing-page-catalog
epic: -
updated: 2026-10-16 19:40
---

# Pipeline — Página de preços a partir do catálogo da Stripe

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-16 17:58 | analyze/plan.md | `GET /payments/catalog` público com cache de 1 h em memória e fora do rate limit; `listCatalog()` no SDK; `/pricing` monta os cards do catálogo com estado vazio traduzido e card fixo de contato; CTA pelo cadastro da app com `plan` no `redirect`; query preservada em quatro pontos do `apps/app/proxy.ts`; links entre cadastro e login carregam o `redirect`; aba de cobrança destaca o plano; formatador de preço vai para `@repo/shared`; zero dependência e env novas |
| develop | done    | 2026-10-16 18:15 | develop/handoff.md | Implementado o blueprint inteiro: rota pública com cache, `listCatalog()` com prazo de 5 s, `/pricing` lendo o catálogo com estado vazio nos três idiomas, query preservada no proxy da app, links entre cadastro e login com `redirect`, selo "Plano escolhido" na aba e formatador em `@repo/shared`; `pnpm turbo run lint typecheck test` 29/29 |
| review  | done    | 2026-10-16 19:40 | review/review.md | 18 commits na branch `feat/pricing-page-catalog`, criada a partir de `guilhermebittelbrunn/spec-discussion` com `git switch -c`; rodada 1 depois do `/test`: corrigida a regressão dos cards da `/pricing` colados na borda (`px-4 md:px-2` no wrapper, o mesmo do cabeçalho e do rodapé); os 4 testes novos do QA entraram no plano, com um `test(app)` próprio para o guard de redirect; expectativa de `es` corrigida para "29,00 BRL / mes"; 3 achados de backlog fora do diff; `pnpm check` 902, `web` typecheck + 131 testes; 18 commits propostos, aguardando aprovação |
| test    | done    | 2026-10-16 19:07 | test/report.md | 21 ✅, 0 ❌, 3 🔒 (Stripe real); rodada 2 mediu o recuo da `/pricing`: grade alinhada ao header (16 px em 375, 8 px em 768/1280), sem rolagem lateral, com planos e no estado vazio, light/dark, pt-br/es; open redirect medido: `main` devolvia `Location: //evil.example.com`, agora `/pt-br` em `next dev` e `next start`; fluxo landing → cadastro → onboarding → aba com selo nos três idiomas, light/dark/mobile; `pnpm test` 15/15 (app 861), `pnpm check` 902; +12 testes (guard, proxy, páginas de auth, personificação) |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Plano feito em rodada autônoma do `/cycle`. As 15 perguntas em aberto já vêm com a opção adotada, a
  descartada e o motivo, no fim do `analyze/plan.md`.
- D4 (CTA leva ao cadastro da app) e o cache de uma hora vieram decididos da spec.
- Nenhum pré-requisito manual de infra novo. O que a landing precisa já está em `docs/PRE-PRODUCTION.md` §12 e
  em `docs/SETUP.md:69`. Três critérios só fecham com conta Stripe real e ficam 🔒 (seção 12 do plano).
- O `/test` precisa de um stub HTTP temporário para o catálogo da landing, porque a página lê o catálogo no
  servidor (seção 11 do plano).
- O `contends_on` real difere do da spec: `payments/plans/route.ts` e `billing.ts` não mudam, e entram os
  formulários de cadastro e login da app (seção 10.14 do plano).
- A correção do `x-app-path` fecha a deriva do deep link registrada em `onboarding-flow`.
- O docblock novo em `apps/api/proxy.ts` deslocou as linhas que os docs citam. `docs/` foi corrigido no
  `/develop`; as referências em `specs/` ficaram antigas e estão listadas no desvio 5 do
  `develop/handoff.md`, para o `/spec --sync`.
- O formatador foi movido com `mv`, fora do índice. Na divisão de commits do plano (10.13, itens 4 e 5), a
  adição em `packages/shared` e a remoção em `apps/app` caem em commits diferentes, e o git registra as duas
  em vez de um rename.
- Na revisão, o guard de open redirect em `packages/auth/redirect.ts` ganhou uma checagem do caminho resolvido
  pelo parser de URL. No `/test` ela ganhou teste de regressão (`postAuthRedirectTarget.test.ts`,
  `proxy.test.ts`), com mutação contra o guard de `HEAD`, e a medição real está em `test/report.md`.
- O dicionário da landing e a página nova não ficam verdes em commits separados (decisão D3 do
  `review/review.md`). A opção adotada mantém os dois separados e aceita um commit vermelho no meio.
- O `/test` encontrou o `review` ainda `in-progress`, aguardando a aprovação dos commits (nenhum commit da
  feature existe). As observações estão no fim do `test/report.md`: os cards colados na borda da
  `/pricing` foram corrigidos pelo `/review` e medidos na rodada 2; seguem BRL em `es` como "29,00 BRL"
  (correto) e as abas da conta apertadas (fora do diff).
- Rodada 1 do vai-e-volta `/test` → `/review`: o `/test` precisa medir de novo só o recuo dos cards da
  `/pricing` (item 1 de "Verificar no `/test`, rodada 2" no `review/review.md`).
