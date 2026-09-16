---
slug: observability-logging
title: "Observabilidade: log estruturado, request id e readiness"
task: -
spec: observability-logging
branch: feat/observability-logging
epic: -
updated: 2026-09-16 13:18
---

# Pipeline — Observabilidade: log estruturado, request id e readiness

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-16 12:10 | analyze/plan.md | Helper de log em `@repo/shared`, request id no `proxy.ts`, `onRequestError` nos 3 apps, `/health/ready`, 11 call sites migrados; zero dependência e zero env nova. |
| develop | done    | 2026-09-16 12:31 | develop/handoff.md | Corte entregue inteiro; 956 testes passando; header, readiness e sufixo conferidos com os apps de pé. |
| review  | in-progress | 2026-09-16 13:05 | review/review.md | Branch `feat/observability-logging` criada; 2 correções de privacidade e correlação no `reportRequestError`; laço request id fechado em build de produção; 23/23 tasks. |
| test    | done    | 2026-09-16 13:18 | test/report.md  | 16 critérios aprovados, 0 reprovados, 4 não verificados por falta de infra; 23 testes novos, 23/23 tasks, laço do request id fechado em build de produção. |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Spec de origem: `specs/observability-logging.md`, movida para `status: in-progress` no início desta
  etapa. Arquivá-la é do `/spec --sync`, na entrega.
- **A contagem da spec estava alta.** Remedido aqui: **24 chamadas `console.*` em 19 arquivos** de produção
  (`.ts`/`.tsx` fora de `__tests__` e `scripts/`), não 26 em 20. O restante das afirmações da spec bateu,
  incluindo o clone `account-avatar.ts:44` ↔ `entity-photo.ts:61`.
- **Serviço gerenciado de coleta ficou fora do corte** (D1 do plano), por
  `.claude/cycle-policy.md:40-43`. O que se entrega é a costura (`onRequestError` nativo do Next 16) e não
  o coletor. O custo declarado: a trilha passa a existir, mas ninguém é notificado. É a pergunta em aberto
  nº 1.
- **Nenhuma env nova, nenhuma dependência nova, nenhuma linha em `.env.example`.** O modo degradado é o
  modo padrão, e é isso que o `/test` deve validar (§9 do plano), não reprovar.
- Pré-requisitos manuais de infra estão na §11 do plano e vão para `docs/PRE-PRODUCTION.md`: apontar o
  health check da plataforma para `/health/ready`, plugar um coletor no `onRequestError`, conferir a
  retenção de log da plataforma, e decidir o destino do cron órfão.
- ⚠️ **Número não verificado no plano**: a retenção de log do free tier da Vercel (§11.3) está escrita como
  "cerca de uma hora" sem fonte com data. Quem passar por ali mede ou corta a frase.
- Achados fora do corte, para não virarem commit desta tarefa, estão na §12 do plano. O mais relevante: a
  API **não tem ponto único de captura de erro**, então um `throw` num handler vira 500 sem `error.code`
  (`app/(guards)/admin.ts:79`, `common-panel.ts:91`).
- As 4 perguntas em aberto foram decididas no plano (§13 e §14). Nenhuma bloqueia o `/develop`.
- Nenhuma branch criada, nada commitado. Branch é do `revisor-codigo`.
- **Dois desvios do plano, ambos pelo mesmo motivo.** `REQUEST_ID_HEADER` e o corpo do `onRequestError`
  ficaram em `packages/shared`, não duplicados em `apps/api` e nos três apps como o blueprint escrevia.
  Duplicar o nome do header e o corpo do gancho recria o defeito que a spec documenta. Detalhe em
  `develop/handoff.md`.
- **O emulador do Firebase não subiu nesta máquina**: `firebase-tools` 15.30.1 exige Java 21 e há Java 17.
  O `ready: true` foi medido contra o projeto real dos `.env`, só leitura. O fluxo autenticado do painel
  não foi exercido com o app de pé.
- `packages/shared` é o único pacote com `test` e sem `typecheck`, o que deixa a imunidade a `Error` do
  `logEvent` sem gate próprio. Achado novo, fora do corte (mexe no lockfile).

## Revisão (2026-09-16)

- Branch **`feat/observability-logging`**, criada a partir de `los-angeles` e validada contra o regex do
  padrão. Nada commitado, nada pushado.
- Duas correções de comportamento em `packages/shared/utils/helpers/requestErrorReporter.ts`: a linha
  `[request] failed` deixou de reter a query string do `path` (e com ela o que o usuário digitou numa
  busca) e passou a carregar o `requestId` que o chamador viu. Sem a segunda, o identificador do toast não
  achava nada no log, que é o que a feature existe para permitir. As duas ganharam asserção em
  `apps/api/__tests__/instrumentation.test.ts`.
- As três afirmações de maior risco do handoff foram refeitas em **build de produção**, não em `next dev`:
  repasse do header ao handler, mensagem degradada idêntica à de hoje, e CORS sem regressão. Todas
  confirmadas. `apps/web` subiu limpo, o que o `/develop` não tinha exercido.
- Pendências de infra da §11 do plano agora estão em `docs/PRE-PRODUCTION.md`, seção 10.
- Achado pré-existente, fora do escopo: erro de hidratação em
  `apps/app/.../components/AuthCard.tsx:14` com locale diferente do padrão. Reproduzido na baseline.

## QA (2026-09-16)

- **16 critérios aprovados, 0 reprovados, 4 não verificados.** Os 4 dependem de infra externa (emulador do
  Firebase com Java 21, coletor de erro, health check de plataforma, retenção de log do provedor) e já
  estão em `docs/PRE-PRODUCTION.md`, seção 10. Nenhum defeito de produção.
- **23 testes novos**, todos na faixa barata. Contagens: `api` 371, `app` 274, `web` 31, `@repo/shared` 40,
  `@repo/internationalization` 27. `pnpm turbo run lint typecheck test --force` em 23 de 23 tasks e
  `pnpm check` em 532 arquivos.
- As lacunas que a revisão listou para o `/test` foram fechadas: repasse do header até o handler, campo
  `requestId` num call site de rota, `onRequestError` em `apps/app` e `apps/web`, e o sufixo do
  identificador num fluxo autenticado do painel.
- Dois testes foram checados por mutação (o repasse do header e a paridade de i18n) para confirmar que
  reprovam de verdade.
- O laço de correlação foi refeito em build de produção: o UUID que o browser lê é o mesmo de
  `requestId=` na linha `[request] failed`. `onRequestError` observado em runtime nos três apps.
- Três rotas-sonda temporárias criadas e apagadas; a `apps/api` foi reconstruída para que o `.next` de
  produção não sirva nenhuma delas. Portas 3000, 3001, 3002 devolvidas.
- Nenhuma conta ou dado de QA a limpar: `qa-observability@example.com` só passou por `/forgot-password`,
  que para em `EMAIL_NOT_CONFIGURED` antes de qualquer consulta.
- Lacuna que fica: `packages/shared` continua sem `typecheck`, conforme a decisão da revisão de tratar isso
  como tarefa própria (mexe no lockfile).
