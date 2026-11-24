---
slug: e2e-org-ownership-flake-and-web-api-url
title: "E2E instável de organizationOwnership e a web sem NEXT_PUBLIC_API_URL na pilha do E2E"
task: -
spec: -
branch: feat/delivery-security-hardening
epic: -
updated: 2026-11-24 02:42
---

# Pipeline — E2E instável de organizationOwnership e a web sem NEXT_PUBLIC_API_URL na pilha do E2E

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-24 01:55 | analyze/plan.md | Causa do *flake* medida no trace do CI (`gh run 45311956449`): os convites não são pré-carregados e só são buscados quando o token chega; a busca começou 110 ms depois de as esperas de opacidade passarem e o axe mediu o "Atualizar" voltando de 50% (3,77:1). Correção no teste (esperar a `GET /organization/invitations` e `toBeEnabled`), sem mexer em regra, allowlist ou `failOnFlakyTests`. A `web` da pilha passa a receber só `NEXT_PUBLIC_API_URL` (`APP_URL` segue vazia por causa do CTA) e o spec novo `crossAppSignOut.spec.ts` cobre a saída nos dois sentidos. Só `apps/e2e` e um trecho de `docs/SETUP.md`. 9 decisões por padrão (Q1 a Q9) |
| develop | done    | 2026-11-24 02:12 | develop/handoff.md | Espera da `GET /organization/invitations` + `toBeEnabled` no `organizationOwnership`, `NEXT_PUBLIC_API_URL` na `web` da pilha e `crossAppSignOut.spec.ts` (2 testes). Desvio: removido o `<AuthProvider>` duplicado de `apps/web/app/[locale]/layout.tsx`, que dobrava as chamadas de sessão e o toast. `--repeat-each=6` dos dois specs: 22 passed |
| review  | done    | 2026-11-24 02:25 | review/review.md | Nenhum achado que pedisse correção. Teste não afrouxado (config, `a11y.ts`, retries e `failOnFlakyTests` intactos); o `waitForResponse` dos convites, registrado antes do `reload`, ataca a causa medida. Remoção do `AuthProvider` interno da `web` conferida: mesmo provider, props efetivas iguais, os cinco `useAuth` pegam o externo, `apps/app` sem o padrão. Fecha a parte dos dois providers do achado do backlog; a dupla `onAuthSuccess` + observador na app e a tela vazia do `signInStartedHereRef` continuam abertas. Gates: `pnpm check` 1121 sem erro, typecheck e2e e web 2/2. Plano de commits combinado da rodada (24 commits) gravado aqui. 6 itens para o `/test` |
| test    | done    | 2026-11-24 02:42 | test/report.md  | 13 critérios ✅, 0 ❌, login pelo Google na landing 🔒. `pnpm e2e` frio 42/42; `organizationOwnership` 10/10 com `--retries=0`, e nos 10 traces a `GET /organization/invitations` termina 338 a 607 ms antes do `axe.runPartial`. Landing com um provider: 1 `custom-token` e 1 `refresh` por carga (antes 2 e 4), toast único no sucesso e na senha errada, capturas idênticas antes e depois. Login com senha pela landing ainda faz 2 `POST /api/auth/session` (par `onAuthSuccess` + observador, caso aberto do backlog). Teste novo `rootLayoutAuthProvider.test.tsx`; `pnpm test` 15/15 |
| observe | pending | -                | -               | - (opcional)     |

## Notas

### Origem

- Tarefa direta do `/cycle`, sem spec. Os dois achados estão em `specs/BACKLOG.md` (fila, linhas 312 e 321;
  detalhe nas linhas 1623, 1648 e 1706). Não editar o backlog aqui: fechar as linhas é do `/spec --sync`.
- Rodou em modo autônomo. Nenhuma pergunta feita; decisões em `analyze/plan.md`, "Perguntas em aberto
  (decididas por padrão)".
- O working tree tem mudanças sem commit das fatias 2 e 3 de `delivery-security-review`. A única intersecção é
  `docs/SETUP.md` (um hunk delas, outro desta tarefa).

### Para o `/develop`

- Não subir a suíte inteira só para se desbloquear; um `--project=chromium` dos dois specs basta para o smoke.
- Conferir no smoke os locators do menu do perfil da app e do "Sair" da landing (`plan.md` §10.4).

### Para o `/test`

- Roteiro V1 a V5 em `plan.md` §8. Sem passada de `agent-browser`: nenhum pixel muda.
- V5 reverte temporariamente a linha da `web` em `stackEnv.ts` para provar que os testes novos detectam o
  defeito. Restaurar antes de terminar.
- Quebra por tempo sob `next dev` local é o achado já conhecido (fora de escopo); quebra por contraste reprova.

### Achado novo para o backlog

- 🟢 Tabela que espera o token mostra o estado vazio antes de buscar (convites do dono em toda carga e qualquer
  tabela na personificação). Lido no código, não medido (`plan.md` §1.6).

### Pré-requisitos manuais de infra (não reprovam o `/test`)

- Nenhum.
