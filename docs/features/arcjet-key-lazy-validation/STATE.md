---
slug: arcjet-key-lazy-validation
title: ARCJET_KEY malformada deixa de derrubar a API
task: -
spec: none
branch: security/fix/arcjet-key-lazy-validation (proposta; a atual run-full-task-cycle-v3 falha no regex e é renomeada na aprovação)
epic: -
updated: 2026-09-30 17:50
---

# Pipeline — ARCJET_KEY malformada deixa de derrubar a API

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-30 16:48 | analyze/plan.md | `index.ts` lê a chave por chamada com um leitor que não lança (`readArcjetKey`), e chave malformada vira no-op; boot da API separa ausente (`warn`) de malformada (`error`, sem ecoar o valor); `keys()` segue estrito, porque o build de `app`/`web` já recusa a chave errada (medido); testes só de unidade; 5 documentos corrigidos; sem i18n, env, dependência ou infra |
| develop | done    | 2026-09-30 16:58 | develop/handoff.md | `readArcjetKey`/`arcjetKeyState` em `keys.ts`, `index.ts` lê a chave por chamada, boot da API separa ausente (`warn`) de malformada (`error`); 14 testes novos no pacote e 3 no boot; mutações da §8 derrubam os testes; 5 docs e o `.env.example` da API corrigidos, com âncoras remedidas; nenhum desvio de decisão |
| review  | done    | 2026-09-30 17:50 | review/review.md | nenhum 🔴; código sem correção; 4 docs corrigidos (seção 8 do `ROPA.md`, `FORKING.md`, âncora do `SECURITY.md`, contagem da suíte no `PRE-PRODUCTION.md`, agora 2485 testes em 227 arquivos); `proxyArcjetKey.test.ts` do QA revisado e incluído no commit da `api`; repro do item 2 trocado para `/health` e `POST /auth/sign-up {}`; typecheck 4/4, `pnpm check` 807 sem erro; 5 commits propostos, nenhum feito |
| test    | done    | 2026-09-30 17:11 | test/report.md  | 10 ✅, 0 ❌, 1 🔒 (chave real da Arcjet); build de `app`/`web` falha e o da `api` responde com a chave malformada (`/health` 200, antes 500), boot com `console.error` sem o valor; teste novo `proxyArcjetKey.test.ts` fecha a lacuna do proxy com o pacote real; `pnpm test` da raiz 14/14 (2655 testes); sem UI, sem navegador |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec, a partir do achado 🔴 de `specs/BACKLOG.md:640` (recomendação #1 em `:229-265`).
  Rodada autônoma do `/cycle`: as decisões estão nas §11 e §12 do plano, cada uma com a alternativa descartada.
  A D1 (no-op com erro no log, em vez de recusar subir) veio decidida pelo orquestrador.
- **A medição mudou o recorte.** Com `ARCJET_KEY=invalida`, o `next build` de `apps/app` e `apps/web` falha
  (o `extends: [security()]` do `env.ts` das duas roda o schema estrito, mesmo com o `skipValidation` da web),
  e o de `apps/api` passa. Só a API publica um build que responde erro a toda requisição. Por isso o schema
  estrito fica, e o leitor tolerante é usado só pelo pacote em runtime e pelo boot da API.
- **Achado no caminho, fora do escopo de código:** o bloqueio de bot da landing nunca roda. Com
  `skipValidation: true`, `apps/web/env.ts` devolve só o próprio `runtimeEnv`, e `env.ARCJET_KEY` sai
  `undefined` mesmo com chave válida (`apps/web/proxy.ts:63`). `docs/ROPA.md:108` e `docs/SUBPROCESSORS.md:40`
  são corrigidos no diff; ligar o bloqueio fica como pergunta (D8) e achado para o backlog.
- Os testes novos do boot entram em `apps/api/__tests__/corsOriginBoot.test.ts`, onde já existe o `describe`
  do aviso do limitador, e não em `instrumentation.test.ts` como o backlog sugeria.
- Pré-requisitos manuais de infra: nenhum.
