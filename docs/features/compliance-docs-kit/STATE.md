---
slug: compliance-docs-kit
title: "Modelos de conformidade: RoPA, incidente, subprocessadores e backup"
task: -
spec: compliance-docs-kit
branch: docs/compliance-docs-kit (proposta; a atual run-full-task-cycle-v2 é renomeada na aprovação dos commits)
epic: -
updated: 2026-09-30 10:05
---

# Pipeline — Modelos de conformidade: RoPA, incidente, subprocessadores e backup

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-30 09:25 | analyze/plan.md | Quatro documentos novos em `docs/` (`ROPA.md`, `INCIDENT-RESPONSE.md`, `SUBPROCESSORS.md` com a nota de transferência, `BACKUP.md`), item 14 no `PRE-PRODUCTION.md` e uma frase no `FORKING.md`; 9 subprocessadores em 5 empresas e 9 operações de tratamento, todos com `arquivo:linha` |
| develop | done    | 2026-09-30 09:52 | develop/handoff.md | Quatro documentos em `docs/`, item 14 no `PRE-PRODUCTION.md`, ressalva no `FORKING.md` e adendo da nota; três correções ao plano (DPA do Google Cloud, cláusulas brasileiras no Google Cloud e na Stripe, limite do ID token na API) |
| review  | done    | 2026-09-30 10:40 | review/review.md | Nada bloqueante; seis correções nos docs (senha passa pela API, retenção dos backups na exclusão, ID token depois da revogação, região do proxy sem fonte, art. 48, âncora do `FORKING.md`); achado de core para o backlog: conta desativada segue com bearer aceito até 1 hora; 8 commits propostos, nenhum feito |
| test    | done    | 2026-09-30 10:05 | test/report.md, test/criterios-aceite.md | 18 critérios ✅, 0 ❌, 2 🔒 (backup no Blaze, conformidade jurídica); conta desativada segue com bearer aceito (medido no projeto de dev; o emulador não reproduz), revogar corta, cookie novo não sai com token anterior à revogação; `pnpm test` 2622/2622; sem browser (só docs). O `report.md` teve a gravação bloqueada pelo harness do subagent e o conteúdo foi devolvido ao `/test` para gravar |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Rodada autônoma do `/cycle`: nada foi perguntado ao usuário. As 14 decisões tomadas no lugar dele, cada
  uma com a alternativa descartada, estão em "Decisões tomadas sem perguntar" no `analyze/plan.md`. Ficam
  duas perguntas para o relatório, nenhuma bloqueante.
- Só documentação: nenhuma mudança em `packages/*`, `apps/*`, env, índice ou rule. O `/test` não sobe
  browser; os critérios se verificam por leitura, `grep` e checagem de link, com os comandos da §8 do plano.
- Os campos do modelo de registro da ANPD foram confirmados no próprio PDF em 2026-09-30, pelo download
  direto. A nota de pesquisa só tinha o resumo da página.
- No plano Spark o Firestore não tem backup de nenhum tipo: agendado, PITR e export gerenciado exigem
  faturamento. A frase do `FORKING.md` que diz que o Spark basta ganha essa ressalva.
- A API só lê o banco `(default)` (`packages/auth/server.ts:100`) e a restauração sempre cria banco novo. O
  procedimento traz os dados de volta por export/import e manda listar as exclusões de conta posteriores ao
  backup antes de restaurar.
- O `/develop` tem uma lista de coleta nova com `WebFetch` (mecanismo de transferência de cada DPA,
  cobertura do Google Analytics e do Vercel Web Analytics, `firebase auth:export`). O que não se confirmar
  fica escrito como "não confirmado".
- As fontes novas vão para um adendo de 2026-09-30 na nota de pesquisa, que também corrige o bloqueador
  vencido das linhas 25-27.
- Duas âncoras da spec derivaram (`PRE-PRODUCTION.md:658` é hoje `:669`, `:532` é `:531`). A spec não foi
  editada; fica para o `/spec --sync`.
- `/develop` sem código: `pnpm check` limpo, 0 links relativos quebrados em 85, 38 URLs externas com 200.
  Dois comportamentos de sessão ficaram para o `/test` medir (conta desativada com ID token válido e
  emissão de cookie com token anterior à revogação).
- `/test` mediu os dois contra o projeto Firebase de dev com uma conta de QA criada e apagada no mesmo
  script. O Auth emulator não serve para isso: sob emulador o Admin SDK sempre confere `disabled` e
  revogação (`firebase-admin` `base-auth.js:119`). Duas frases do runbook ficaram velhas (linhas 50 e 51)
  e voltam para o `/review` como sugestão; nenhuma afirmação caiu.
- `/review` sem commit: a rodada é do `/cycle`. O plano de 8 commits e a renomeação da branch para
  `docs/compliance-docs-kit` estão no `review/review.md` e esperam a aprovação do usuário.
- `/review` rodada 2, depois do `/test`: `INCIDENT-RESPONSE.md:50-51` passou a citar a medição de 2026-09-30
  (cookie novo recusado depois da revogação; bearer de conta desativada aceito até revogar). O commit 8 do
  plano ganhou `test/criterios-aceite.md` e `test/report.md`.
