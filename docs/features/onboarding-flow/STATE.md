---
slug: onboarding-flow
title: Onboarding pós-cadastro
task: -
spec: onboarding-flow
branch: feat/onboarding-flow
epic: -
updated: 2026-09-24 01:01
---

# Pipeline — Onboarding pós-cadastro

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-24 00:00 | analyze/plan.md | Desvio no layout comum para um fluxo de 2 passos (nome obrigatório, idioma pulável), estado `onboarding` no perfil avançado por `POST /account/onboarding`, deep link por header do proxy, interruptor `ONBOARDING_ENABLED` |
| develop | done    | 2026-09-24 00:17 | develop/handoff.md | `POST /account/onboarding` + estado inicial em `createDefaultUserProfile`, header `x-app-path` no proxy, desvio no layout comum e rota `/onboarding` com 2 passos; 8 desvios pequenos registrados, nenhum reverte decisão do plano |
| review  | in-progress | 2026-09-24 00:56 | review/review.md | Rodada 2: D1 (default do passo 2 = locale da tela) e D2 (409 volta ao passo da montagem antes do refresh) corrigidos em `OnboardingClient`/`useOnboardingMutations`, cada um com teste que falha sem a correção; O3 registrado como achado do design system; branch `feat/onboarding-flow`, 12 commits propostos |
| test    | done    | 2026-09-24 01:01 | test/report.md  | Rodada 2: 20 ✅ / 0 ❌ / 0 🔒; D1 (idioma pré-selecionado) e D2 (409 volta ao passo do servidor) remedidos no browser; troca para English no fim confirmada; suíte verde (app 501, api 680, i18n 44) |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Plano feito em rodada autônoma do `/cycle`. As quatro perguntas em aberto já vêm com a opção adotada, e as
  13 decisões tomadas sem perguntar estão no fim do `analyze/plan.md`, cada uma com a alternativa descartada.
- Desvio em relação ao reescopo da spec: `POST /auth/sign-up` gravava o perfil sem passar por
  `createDefaultUserProfile` e passa a usá-lo. A criação de usuário pelo admin continua sem o estado.
- Nenhum pré-requisito de infra. Todos os critérios se verificam sob o emulador de Auth e Firestore; o
  estado pendente se produz cadastrando uma conta nova, porque as contas do seed contam como legadas.
- `/test`: `review` segue `in-progress` porque o `/cycle` não commita; nenhum commit da feature existe sobre
  `origin/main`. Não é gate aberto por esquecimento, mas continua pendente de aprovação dos commits.
- `/test` rodada 1 ficou `blocked` por D1 e D2; o `/review` corrigiu os dois e a rodada 2 fechou `done`.
