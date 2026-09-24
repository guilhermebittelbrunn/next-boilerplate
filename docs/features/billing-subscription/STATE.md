---
slug: billing-subscription
title: Assinatura Stripe de ponta a ponta
task: -
spec: billing-subscription
branch: feat/billing-subscription
epic: -
updated: 2026-09-24 11:40
---

# Pipeline — Assinatura Stripe de ponta a ponta

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-24 09:21 | analyze/plan.md | `GET /payments/plans`, `POST /payments/checkout` e `POST /payments/portal`; webhook reconcilia `customer.subscription.*` em `user.subscription` com dedupe em `paymentEvent` e regra de ordem; aba billing preenchida (some no modo `simple`); CTAs do pricing para a aba; expurgo cancela a assinatura antes de apagar e exportação leva o estado |
| develop | done    | 2026-09-24 09:58 | develop/handoff.md | Slice completo sem dependência nova: `packages/payments` com chaves que tratam string vazia, 3 rotas de pagamento, webhook com dedupe e regra de ordem, aba billing (some no `simple`), CTAs do pricing, expurgo cancela antes de apagar; 24/24 tasks do turbo, builds degradados passam; 10 desvios menores no handoff |
| review  | done    | 2026-09-24 11:40 | review/review.md | 17 commits na branch `feat/billing-subscription`, aprovados pelo usuário junto com o push. Rodada 2 sobre o `/test`: D1 corrigido (CTA do `/pricing` usa o locale da rota; `pricingPage.test.tsx` falha 2/2 sem a correção), D2 e item 11 registrados no backlog (token `--destructive` não alterado: nenhum valor dá ≥4,5:1 como texto e como fundo do `danger` do antd; nome acessível é do `Button`). Gates: `pnpm check` 699 limpo, typecheck 13/13, web 41/41. Branch proposta `feat/billing-subscription`, a criar no commit; plano de 17 commits |
| test    | done    | 2026-09-24 10:57 | test/report.md | 19 ✅, 0 ❌, 5 🔒 (só Stripe real prova). Os 11 itens do "Verificar no `/test`" confirmados, com rodadas A e B contra o emulador e webhook assinado em `next dev`. Trava pós-checkout coberta por 5 testes novos (app 559/559). D1 (locale dos CTAs de `/pricing` vindo do cookie atrasado) remedido depois da rodada 2 do `/review` e fechado: href segue o segmento da URL em en/es com e sem cookie; web 41/41, raiz 10/10. D2 (contraste do `pastDueHint` no dark) foi para o backlog |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Plano feito em rodada autônoma do `/cycle`. As oito perguntas em aberto já vêm com a opção adotada, e as
  22 decisões tomadas sem perguntar estão no fim do `analyze/plan.md`, cada uma com a alternativa descartada.
- Dois defeitos encontrados no caminho entram no escopo: o webhook sempre responde `Not configured` em
  `next dev` (o segredo some com o `skipValidation` de `apps/api/env.ts`) e a `apps/web` nunca enxerga
  `NEXT_PUBLIC_APP_URL` (mesmo mecanismo em `apps/web/env.ts`).
- Pré-requisitos manuais de infra (catálogo, Customer Portal, endpoint de webhook na versão
  `2025-09-30.clover`, envs de produção) estão na seção 9.1 do plano e vão para `docs/PRE-PRODUCTION.md`. O
  `/test` não reprova por eles.
- Critérios que só uma conta Stripe real prova ficam como 🔒: Checkout e Portal reais, catálogo real,
  entrega real de webhook e cancelamento bem-sucedido no expurgo. O resto se prova com chaves falsas no
  ambiente do processo, webhook assinado localmente e o emulador (seção 8 do plano).
- Achado fora do escopo com peso: o modo `simple` não restringe o painel comum, ao contrário do que
  `docs/AUTH-SSO.md` afirma (A1 no plano).
- `/develop`: a afirmação do plano "chave malformada derruba o boot" foi medida e não se confirma como
  escrita. O build da API falha; em runtime o processo sobe e toda requisição responde 500 com
  `Invalid environment variables`. O `/test` deve medir o critério nessa forma (desvio 1 do handoff).
- `/review`: a atual `run-full-task-cycle` não passa na regex e não foi renomeada (workspace do Conductor). A
  checagem de assinatura duplicada direto na Stripe ficou como decisão em aberto no `review/review.md`; o
  `/test` começa pela lista "Verificar no `/test`" de lá.
- `/test`: a linha `review` continua `in-progress` porque os commits aguardam sua aprovação (nenhum commit
  à frente de `origin/main`). Todas as contas de QA viveram só no emulador; portas devolvidas.
- `/review` rodada 2: o D2 foi medido por cálculo (1,97:1 no dark) e deixado no backlog, junto com o nome
  acessível do `Button` em `loading` e o cookie de locale das páginas da web. O `/test` precisa remedir só o D1.
- Decisões do usuário em 2026-09-24: a sobrescrita de assinatura duplicada fica no MVP, com a checagem na
  Stripe escrita como passo antes do release no item 12 de `docs/PRE-PRODUCTION.md`; a P2 do plano foi mantida.
