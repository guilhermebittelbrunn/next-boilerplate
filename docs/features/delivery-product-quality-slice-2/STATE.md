---
slug: delivery-product-quality-slice-2
title: "Core aprovado na parte 3 da entrega, fatia 2 (medição no repositório)"
task: -
spec: delivery-product-quality
branch: feat/delivery-product-quality-slice-2
epic: -
updated: 2026-11-23 15:51
---

# Pipeline — Core aprovado na parte 3 da entrega, fatia 2 (medição no repositório)

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-23 15:03 | analyze/plan.md | Fatia 2 da spec em três itens: projeto `mobile` no Playwright (`Pixel 7` a 390 × 844) com `landing`, `signIn`, `signUp` e `entityCrud`, helper que abre a barra lateral no celular e checagem de reflow dentro de `expectAccessible`; `pnpm lighthouse` em `apps/e2e/lighthouse/` que sobe `next start`, mede home, preços e contato com `lighthouse@12.8.2` via `npx` no Chromium do Playwright e grava uma tabela com os limiares da parte 3; teste do sitemap contra as páginas de `app/[locale]` e `lastModified` removido. Zero dependência e zero env nova. 11 decisões tomadas por padrão (Q1 a Q11) |
| develop | done    | 2026-11-23 15:16 | develop/handoff.md | Projeto `mobile` (Pixel 7 a 390 × 844) com os 4 fluxos críticos, reflow em `expectAccessible` e helper da barra lateral que tenta de novo enquanto o `Sheet` está fechado (o toque antes da hidratação se perdia); `pnpm lighthouse` medido no build (home 57, preços 85, contato 95 em Performance); sitemap sem `lastModified`, com teste contra `app/[locale]`. Gates verdes; V3, `--repeat-each` do helper, V5 e V7 ficam para o `/test` |
| review  | done    | 2026-11-23 15:52 | review/review.md | Rodada 2: o Ctrl+C no `pnpm lighthouse` ainda deixava o `next start` órfão porque o `process.once` perdia os sinais repetidos pelo `pnpm`; a correção da rodada 1 tinha sido declarada sem medição. Agora `process.on` com handler idempotente e laço que para no sinal: 3 de 3 na subida e 3 de 3 em "Measuring" com a 3001 livre, execução completa com exit 0. Gates verdes; plano de 7 commits sem mudança |
| test    | done    | 2026-11-23 15:51 | test/report.md  | Rodada 2 depois da correção do `run.mjs`: Ctrl+C via `pnpm lighthouse` com a 3001 livre e nada sobrando em 6 de 6 (3 na subida, 3 durante a medição, que para na página em curso); `pnpm lighthouse` exit 0 em 58 s. Rodada 1: `mobile` 29/29 com `--repeat-each=5`, reflow reprova 600 px, V2/V5/V7 e `pnpm test` da raiz verdes. Só a preview da Vercel fica 🔒 |
| observe | pending | -                | -               | - (opcional) |

## Notas

### Origem

- Spec `specs/delivery-product-quality.md` (`status: approved`), **só a fatia 2** (linhas 139-145). A fatia 1 foi
  entregue pela PR #71 e tem o pipeline em `docs/features/delivery-product-quality/`. A fatia 3 e o "Fora do corte"
  ficam fora. Não editar a spec: arquivá-la é do `/spec --sync`, quando as três fatias estiverem entregues.
- Pasta própria em vez de reabrir a da fatia 1, cujo `STATE.md` já está fechado. O `spec:` do frontmatter liga as
  duas.
- Rodou em modo autônomo dentro do `/cycle`. Nenhuma pergunta feita; decisões em `analyze/plan.md` → "Perguntas em
  aberto (decididas por padrão)".

### Para o `/develop`

- O Lighthouse 13 exige Node `>=22.19` e o repo fixa `22.12.0`. Por isso a versão fixada é 12.8.2 (Q1).
- Não há Google Chrome nesta máquina. O runner usa `chromium.executablePath()` do `@playwright/test` quando
  `CHROME_PATH` não está definido.
- O helper `panelNavLink` só clica no botão da barra lateral quando o fixture `isMobile` é verdadeiro. Cuidado com o
  `SidebarRail`, que tem o mesmo `aria-label` (`plan.md` §10.2).
- Defeito que o projeto `mobile` revelar (axe ou rolagem horizontal) se corrige no componente, com o desvio no
  handoff. Allowlist do axe continua vazia.

### Pré-requisitos manuais de infra (não reprovam o `/test`)

- Nenhum. Para executar: JDK 21 à frente no `PATH` (`/opt/homebrew/opt/openjdk@21`; o `java` padrão é 17), build da
  `web` antes do Lighthouse, rede na primeira execução do `npx`, porta 3001 livre. Detalhe em `analyze/plan.md` §11.

### Para o `/test`

- Começar pela seção "A verificar no `/test`" de `develop/handoff.md`. O `apps/web/.next` do build ficou na
  máquina, então a V4 pode rodar direto.
- Roteiro V1 a V8 em `analyze/plan.md` §8, estimado em 25 a 30 min. Não rodar a suíte E2E inteira: filtrar por
  projeto e arquivo. `organizationOwnership.spec.ts` é instável sob `next dev` local e não é desta fatia.
- Pontuação do Lighthouse abaixo da meta não reprova a fatia: o entregável é o comando. Copiar a tabela de
  `summary.md` no `test/report.md`.
- A V3 (vazamento injetado) é harness temporário e sai antes do fim.
