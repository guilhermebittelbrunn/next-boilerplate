---
slug: delivery-security-review-slice-2
title: "Core aprovado na parte 1 da entrega, fatia 2 (defesa em profundidade)"
task: -
spec: delivery-security-review
branch: feat/delivery-security-hardening
epic: -
updated: 2026-11-24 00:37
---

# Pipeline — Core aprovado na parte 1 da entrega, fatia 2 (defesa em profundidade)

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-23 23:48 | analyze/plan.md | Fatia 2 em cinco itens: a API recusa escrita carregada só pelo cookie sem `Origin` (`403 AUTH_FORBIDDEN_ORIGIN`, bearer segue aceito) e as quatro rotas de sessão das front-ends exigem `Origin` do mesmo host ou `Sec-Fetch-Site: same-origin`; `setCookie` com `Secure` em HTTPS, `x-locale` do proxy com 180 dias e `Secure` em HTTPS, `bp:*` com `Secure`; os sete `console.error` de `@repo/auth/server.ts` viram `logEvent` com `code`/`reason`; o boot em produção encerra o processo (`process.exit(1)`) sem `CORS_ORIGIN` ou sem credencial do Firestore; `max` no e-mail do admin e Zod com teto de 4096 no `idToken`. Zero dependência, zero env, zero código de erro novo. 17 decisões tomadas por padrão (Q1 a Q17) |
| develop | done    | 2026-11-24 00:11 | develop/handoff.md | Os cinco itens implementados com 12 grupos de teste (T1 a T12) e gates verdes (`pnpm check`, typecheck, `turbo run lint typecheck test` 29/29). Medido: `next build` da api não executa `register` (sem ramo `NEXT_PHASE`), `next start` sem `CORS_ORIGIN` sai com código 1. Desvio principal: o `process.exit` mora em `apps/api/instrumentation-node.ts`, importado no ramo `nodejs`, porque no `instrumentation.ts` o build avisava "Node.js API … not supported in the Edge Runtime" |
| review  | done    | 2026-11-24 00:40 | review/review.md | Nenhum bloqueante. Raio de impacto conferido por leitura: servidor dos front-ends e `SessionAuthority` mandam bearer, webhook da Stripe não leva cookie, `OPTIONS` fica fora da regra, `Secure` decide por protocolo e não quebra o dev em HTTP, `process.exit` só em `NODE_ENV=production`. Duas correções: linha ambígua da tabela de CORS em `docs/SECURITY.md` e JSDoc de `instrumentation-node.ts` que prometia parar o deploy. Gates: `pnpm check` 1117 arquivos sem erro, typecheck 4/4. Branch `feat/delivery-security-hardening` criada e validada no regex. Plano de commits recomposto para a rodada inteira (em `../e2e-org-ownership-flake-and-web-api-url/review/review.md`). 8 itens para o `/test` |
| test    | done    | 2026-11-24 00:37 | test/report.md, test/criterios-aceite.md | 11 ✅, 0 ❌, 1 🔒 (encerramento numa função da Vercel). Suíte da raiz 15/15 com as contagens do handoff, E2E `signIn`/`signUp` 14/14 em `chromium` e `mobile`. Medido em `next start`: as quatro rotas de sessão no `app` e na `web`, a recusa da escrita por cookie na API, o `x-locale` com 180 dias, o boot que encerra nos quatro casos (inclusive sem credencial do Firestore) e, num proxy de TLS local, `Secure` em `bp:*`, `x-theme`, `x-timezone` e `x-locale`. Login por e-mail e Google, SSO e saída sem nenhum 403. Nenhum teste novo, nenhum defeito. O `report.md` foi gravado pelo orquestrador do `/cycle`, porque a ferramenta `Write` recusou o arquivo dentro do subagent |
| observe | pending | -                | -               | - (opcional) |

## Notas

### Origem

- Spec `specs/delivery-security-review.md` (`status: approved`), só a fatia 2 ("defesa em profundidade"). A
  fatia 1 saiu na PR #64 e tem o pipeline em `docs/features/delivery-security-review/`. A fatia 3 roda depois,
  no mesmo working tree, e não divide arquivo com esta (`plan.md` §1.3).
- Pasta própria em vez de reabrir a da fatia 1, cujo `STATE.md` está fechado. O `spec:` do frontmatter liga as
  duas. Não editar a spec: arquivá-la é do `/spec --sync`, quando as três fatias estiverem entregues.
- Rodou em modo autônomo dentro do `/cycle`. Nenhuma pergunta feita; decisões em `analyze/plan.md`, "Perguntas
  em aberto (decididas por padrão)".
- O working tree já tinha mudanças da auditoria do backlog em `specs/*.md`. Elas não são desta fatia e entram no
  commit `docs(specs)` da auditoria, separado.

### Para o `/develop`

- Antes de mexer no `instrumentation.ts`, medir se o `next build` da `api` executa `register`. Só se executar
  entra o desvio por `NEXT_PHASE` (`plan.md` §4.4).
- Os testes de sessão montam `Request` sem `Origin` (`sessionRoutesAuthority.test.ts:88`,
  `sessionRefreshRoute.test.ts:96`). O construtor passa a mandar o header; nenhuma asserção sai.
- O jsdom descarta cookie `Secure` em página HTTP: os testes de `Secure` espiam o setter de `document.cookie`.
- Seis documentos passam a mentir com o código novo (`plan.md` §B8). Medir cada âncora antes de editar.

### Pré-requisitos manuais de infra (não reprovam o `/test`)

- Nenhum novo. `CORS_ORIGIN` em produção já era obrigatória; agora a falta dela encerra o processo. O
  comportamento numa função da Vercel fica 🔒 (`plan.md` §10).

### Branch

- `feat/delivery-security-hardening`, criada pelo `/review` a partir de `guilhermebittelbrunn/remaining-tasks-cycle`
  (fora do padrão, sem upstream, sem commit à frente de `main`). Vale para a rodada inteira: a fatia 3 e as
  tarefas diretas seguem no mesmo working tree e na mesma branch. Regex do `/review`: OK.

### Para o `/test`

- Começar pela lista "Verificar no `/test`" de `review/review.md` (8 itens; o 1, login/SSO/saída sem 403, é o de
  maior risco).

- Roteiro V1 a V7 em `plan.md` §9. Passada funcional de navegador (login, SSO, saída, troca de idioma), sem
  matriz de tema e viewport, porque nenhum pixel muda (Q15). O `mobile` entra pelo E2E filtrado.
- V5 exige `pnpm --filter api build` e `start` com `CORS_ORIGIN=` vazio e `-p 3002`.
