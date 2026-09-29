---
slug: account-email-change
title: Troca de e-mail do titular
task: -
spec: account-email-change
branch: feat/account-email-change
epic: -
updated: 2026-09-29 12:09
---

# Pipeline — Troca de e-mail do titular

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-29 10:52 | analyze/plan.md | Pedido em `POST /account/email` (senha atual, link `VERIFY_AND_CHANGE_EMAIL` do Admin SDK reescrito para `/verify-email?mode=verifyAndChangeEmail`, aviso ao endereço antigo antes do link, pela Resend); confirmação pública em `POST /auth/email-change/confirm` que confere o tipo do código, aplica, revoga as sessões e grava `account.email.change`; diálogo na aba Perfil; 3 códigos novos; sem Firestore, sem env nova, 10 commits |
| develop | done    | 2026-09-29 11:14 | develop/handoff.md | Slice completo SDK → API → e-mail → app → i18n como no plano, com 5 desvios pequenos (chave `emailMax`, placeholder `newEmail` na lista do teste de copy, helpers na rota do pedido); `pnpm check` limpo, api 1017, app 752, email 202, i18n 59; smoke contra o emulador mediu 503 `EMAIL_NOT_CONFIGURED`, confirmação 200 com revogação e evento, repetição e código de outro tipo em 400 |
| review  | done    | 2026-09-29 12:30 | review/review.md | Nada bloqueante; foco do diálogo passou a voltar ao botão "Trocar e-mail" ao fechar (caía no `<body>`) e, depois do `/test` achar, a entrar no campo "Novo e-mail" ao abrir (15/15, mutação derruba 4); `/auth/email-verification/confirm` passou a recusar código que não é `VERIFY_EMAIL` (o de troca contornava revogação e trilha), com 5 testes novos, 22/22; `pnpm check` 806 limpo, typecheck limpo, i18n 59/59; branch proposta `feat/account-email-change`, 13 commits planejados |
| test    | done    | 2026-09-29 12:09 | test/report.md  | 16 ✅, 0 ❌, 1 🔒 (entrega real do aviso pela Resend). Rodada 1 achou o foco fora do diálogo ao abrir; rodada 2 remediu a correção: foco em "Novo e-mail" ao abrir e de volta ao botão ao fechar, em 3 idiomas × 1280/375 px, axe 0; app 756/756, mutação sem `onOpenAutoFocus` derruba 4; api 1022, emulador 170; fluxo inteiro medido contra o emulador |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Plano feito em rodada autônoma do `/cycle`. As 13 decisões tomadas sem perguntar estão na §13 do plano,
  cada uma com a alternativa descartada, e as 5 perguntas da §12 já vêm com a opção adotada.
- O plano discorda da spec num ponto (P5): o pedido novo não invalida o anterior por estado nosso, porque
  quem tem o link aplica o código direto no Identity Toolkit. O primeiro link aplicado invalida os outros.
- No emulador de Auth, aplicar o código de troca não revoga as sessões (`operations.js:861-863`), então a
  rota de confirmação chama `revokeUserSessions` explicitamente.
- Pré-requisitos manuais de infra (§14 do plano): Resend com domínio verificado, `NEXT_PUBLIC_APP_URL` e
  `FIREBASE_WEB_API_KEY` na API, `NEXT_PUBLIC_APP_SUPPORT_EMAIL` para o canal de contestação. Nenhum
  bloqueia a entrega; a entrega real dos e-mails fica 🔒 no `/test`.
- Testes planejados todos em Vitest, sem emulador. O `/test` percorre a confirmação contra o emulador de
  Auth gerando o link pelo Admin SDK, já que sem Resend o pedido responde `EMAIL_NOT_CONFIGURED`.
- Develop: nenhuma decisão do plano precisou ser corrigida. O que ficou para o `/test` (telas, toast,
  sessão caindo noutra aba, links concorrentes) está listado no `develop/handoff.md`.
- Review: a branch atual `run-full-task-cycle-v1` falha no regex do padrão e não foi criada nem renomeada
  nesta rodada. O nome proposto, `feat/account-email-change`, passou. O índice ainda tem o `git mv` da spec
  `accessibility-conformance`, que entra no commit `docs(specs)`; o `review/review.md` diz como tirá-lo do
  caminho antes do primeiro commit.
- Test: o `test/report.md` foi gravado pelo orquestrador, porque o `Write` do subagent recusou o arquivo.
  O diálogo de exclusão da aba Privacidade (`AccountPrivacyPanel.tsx:137`) continua deixando o foco no
  botão que o abriu; ficou fora desta fatia e virou achado de backlog. A etapa `review` segue
  `in-progress` porque os commits aguardam aprovação do usuário (nenhum commit além de `origin/main`).
