---
description: Implementa uma tarefa já planejada (lê o plano gerado pelo /analyze em analyze/plan.md) seguindo os padrões do repo — SDK → API → app/web → i18n, com validação visual obrigatória em front-end. Não cria branch nem commita — isso é do /review.
argument-hint: '[slug/caminho da feature | vazio = feature mais recente | --force]'
allowed-tools: Agent, AskUserQuestion, Read, Write, Edit, Grep, Glob, Bash, Skill
---

# /develop

Foco (opcional): **$ARGUMENTS**

Você é o orquestrador (loop principal) do papel **Desenvolvedor**.

## Passo 0 — Localizar a feature e checar o gate

**Localizar a feature** (pasta em `docs/features/<slug>/`):

- Se `$ARGUMENTS` trouxer um **slug** ou **caminho** de `docs/features/<slug>`, use essa pasta.
- Senão, a feature mais recente: `ls -t docs/features/*/STATE.md 2>/dev/null | head -1` → `dirname`.

**Gate sequencial — exige `analyze` concluído.** Leia o `STATE.md` (arquivo pequeno) e confirme que
`analyze` está `done`. Sinal alternativo: existência de `analyze/plan.md`. Se não existir, **PARE** e
sugira rodar `/analyze` primeiro.

- **Bypass**: se `$ARGUMENTS` contiver `--force` (ou `--skip-gate`), prossiga sem o pré-requisito e
  registre o bypass na seção "Notas" do `STATE.md` (crie o `STATE.md` se faltar).

**Plano a repassar**: `docs/features/<slug>/analyze/plan.md`. **Não leia o conteúdo aqui** — guarde o
**caminho** para o subagent.

## Passo 1 — Acionar o motor

Invoque o subagent **`desenvolvedor`** (Agent tool, `subagent_type: "desenvolvedor"`), repassando o
**caminho do plano** e o **caminho da pasta da feature**. Peça para:

- implementar o blueprint na **ordem do slice vertical**: `packages/sdk` (contrato) → `apps/api`
  (guard + Zod + repo/mapper) → `apps/app`/`apps/web` (hooks, formulário, tabela, prefetch RSC) →
  `packages/internationalization` (chaves nos 3 idiomas + `apiErrors`);
- usar as skills do repo quando couber (`/new-crud`, `/new-api-route`, `/i18n-sync`, `/write-tests`);
- rodar `pnpm --filter <app> typecheck`, `pnpm check` e, se tocou i18n ou adicionou `error.code`,
  `pnpm --filter @repo/internationalization test`;
- **validar visualmente com `agent-browser`** se tocou `apps/app`, `apps/web` ou
  `packages/design-system` — percorrer o fluxo, light + dark + mobile, screenshots (comandos **em
  sequência**);
- **sem criar branch e sem commitar**;
- escrever o **handoff** em `develop/handoff.md`, atualizar o `STATE.md` (`develop = done`) e devolver o
  resumo (blueprint → arquivos) + decisões em aberto.

## Passo 2 — Apresentar e perguntar

- Apresente o que foi implementado (mapeado ao plano), o resultado de typecheck/lint/testes e **o que foi
  validado visualmente** (ou por que não foi).
- Se houver "decisões em aberto" (ambiguidades surgidas na implementação), faça-as ao usuário com
  `AskUserQuestion` e ajuste conforme a resposta.
- Se a validação visual **não** foi feita num diff de front-end, diga isso explicitamente — não apresente
  como concluído. Pergunte se deve subir o app e validar agora.

## Passo 3 — Próximo passo

Sugira rodar **`/review`** para revisar, criar a branch e preparar os commits (um por app, em inglês).

## Passo 4 — Liberar contexto

A implementação está no working tree e o `develop/handoff.md` + `STATE.md` guardam o que foi feito. Pode
`/compact` antes do `/review` — o revisor lê o diff via `git` e o handoff do disco, não precisa do seu
histórico desta etapa.

Mantenha o texto em português; código/identificadores em inglês.
