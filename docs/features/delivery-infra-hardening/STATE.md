---
slug: delivery-infra-hardening
title: "Core aprovado na parte 2 da entrega (infra e hardening)"
task: -
spec: delivery-infra-hardening
branch: -
epic: -
updated: 2026-11-23 02:54
---

# Pipeline — Core aprovado na parte 2 da entrega (infra e hardening)

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-23 02:01 | analyze/plan.md | Corte inteiro em sete itens independentes, mais o shield do Arcjet na API em `DRY_RUN`: tirar o `skipValidation` da `web` (causa lida no `env-core` 0.13.8, linha 37 antes do merge da 70); `Permissions-Policy` em `applySecurityHeaders`; `/api/*` das front-ends com resposta cedo no proxy; logo `https:` (mais `http:` em loopback); `remotePatterns` por bucket; jobs `secrets` (Gitleaks 8.30.1 por binário com SHA-256 fixado, só os commits novos) e `audit` (`--prod --audit-level=high`, sai 0 hoje); 6 actions pinadas por SHA; `dependabot.yml`; `.gitignore`; docs. 9 decisões tomadas por padrão (Q1–Q9) |
| develop | done    | 2026-11-23 02:21 | develop/handoff.md | Sete itens e o shield entregues: `skipValidation` fora da `web` (T1/T2 falham sem a correção), `Permissions-Policy` nos três apps, `/api/*` das front-ends com cabeçalhos, logo `https:`, `remotePatterns` por bucket, jobs `secrets`/`audit`, 21 `uses:` por SHA conferidos, `dependabot.yml`, `.gitignore`, docs. Desvio principal: bloqueio de bot local só decide com `ARCJET_ENV=development` (sem isso o Arcjet não tem IP e libera) |
| review  | done    | 2026-11-23 02:35 | review/review.md | Nenhum bloqueante. Uma correção em `ci.yml` (job `changes` lê `github.event_name` por `env:`). 6 SHAs conferidos no GitHub, gitleaks limpo no diff, lint 1080 arquivos e typecheck dos 4 workspaces em cache hit. Oito itens em "Verificar no `/test`" (V1 a V8). Branch proposta `feat/delivery-infra-hardening`, não criada; 13 commits planejados, nenhum feito |
| test    | done    | 2026-11-23 02:54 | test/report.md  | 12 ✅, 0 ❌, 3 🔒 (job `secrets`, job `audit` e Dependabot, só no GitHub). V1 a V8 medidos em `next start`; `pnpm e2e` 29/29; `pnpm test` da raiz saída 0; logout propaga entre `app` e `web`. Nenhum defeito de produção e nenhum teste novo. Corrigidas três referências de linha em `docs/SUBPROCESSORS.md` |
| observe | pending | -                | -               | - (opcional) |

## Notas

### Origem

- Spec `specs/delivery-infra-hardening.md` (`status: approved`), corte inteiro. Não editar a spec: arquivá-la
  é do `/spec --sync`.
- Rodou em modo autônomo dentro do `/cycle`. Nenhuma pergunta feita; decisões em `analyze/plan.md` →
  "Perguntas em aberto (decididas por padrão)".

### Para o `/develop`

- Nenhuma dependência nova e nenhuma variável de ambiente nova. O Gitleaks entra só no CI, por download com
  checksum.
- Re-resolver os SHAs das actions antes de gravar (`plan.md` §10.3). Tag anotada precisa ser dereferenciada
  até o commit.
- Os testes T1 e T2 usam o `@/env` real da `web`. Os testes atuais mockam o módulo inteiro, e foi assim que o
  defeito passou despercebido.
- Rodar a suíte inteira da `web` depois de tirar o `skipValidation`.
- O `docs/PRE-PRODUCTION.md` já tem hunk da auditoria do backlog no working tree.

### Pré-requisitos manuais de infra (não reprovam o `/test`)

- Repositório de referência: restringir ou rotacionar a chave do alerta #1 e fechá-lo; proteger a `main` com
  `verify`, `e2e`, `secrets` e `audit`; ligar Dependabot alerts e security updates; apagar o ref local
  `refs/conductor-checkpoints/conductor-archive-bb3ed7d1-…`, que guarda três `.env` (não está no `origin`).
- Todo fork: restringir as chaves do Firebase; conferir a cota do Arcjet contra o tráfego da landing; trocar
  o shield da API para `LIVE` depois de uma semana em `DRY_RUN`.
- Detalhe em `analyze/plan.md` §11. O que só o GitHub executa (job reprovando PR, Dependabot abrindo PR) tem
  prova local equivalente em §12.1.

### Para o `/test`

- Comece pela tabela "Verificar no `/test`" de `review/review.md` (V1 a V8). V2 é novo: a landing no navegador
  com o `env` validado.
- A branch continua `guilhermebittelbrunn/cycle-command-v11` (nome inválido). O nome proposto e o comando estão
  em `review/review.md`; os commits dependem da sua aprovação.
