---
description: Implementa uma tarefa já planejada (lê o plano gerado pelo /analyze em analyze/plan.md) seguindo os padrões do repo — SDK → API → app/web → i18n, com smoke local só para se desbloquear. Não cria branch nem commita (isso é do /review); quem executa o produto e guarda evidência é o /test.
argument-hint: '[slug/caminho da feature | vazio = feature mais recente | --force]'
allowed-tools: Agent, AskUserQuestion, Read, Write, Edit, Grep, Glob, Bash, Skill
---

# /develop

Foco (opcional): **$ARGUMENTS**

Você é o orquestrador (loop principal) do papel **Desenvolvedor**.

## Regras de escrita (`humanizer` + `caveman`)

Regra em [`.claude/rules/writing-skills.md`](../rules/writing-skills.md); as skills estão no
`allowed-tools`.

- **`caveman` no que chega até o usuário**: o que foi implementado, resultado de typecheck/lint/testes,
  o que ficou para o `/test` medir, decisões em aberto. Estilo restrito a este comando — **não** fixe o
  modo na sessão. Saia do estilo nas decisões em aberto e na lista do que não foi medido.
- **`humanizer` em qualquer prosa que você acrescente** ao `develop/handoff.md` ou ao `STATE.md` depois do
  subagent. ⛔ Nunca em código, comentário ou chave de i18n.
- **Repita as duas regras no prompt do `desenvolvedor`.**

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
- fazer no máximo um **smoke local** para se desbloquear: abrir o que acabou de escrever e saber se dá
  para seguir. Smoke **não persiste evidência** — nada de screenshot em `docs/features/` (o `.gitignore`
  descarta essas pastas de qualquer jeito). Quem executa o produto, dirige o `agent-browser` e guarda
  evidência é o `analista-qa`, no `/test` (§7 de
  [`docs/review-checklist.md`](../../docs/review-checklist.md)). Se precisar subir algo, **checar a porta
  antes** (`lsof -ti tcp:3000`): ocupada = ambiente do usuário, reutiliza e não derruba; livre = sobe,
  guarda o PID e mata no final. ⛔ Nunca `pkill -f node`/`killall node`;
- escrever cada afirmação de comportamento do handoff **com o instrumento que a produziu** — o comando, a
  consulta, a contagem. Sem instrumento, a afirmação vira **"a verificar no `/test`"**. O que o smoke
  mostrou não é "validado";
- criar teste sempre no **nível mais barato que prova o comportamento** — teste que exige emulador ou app
  servindo só quando a infra for o objeto do teste;
- **sem criar branch e sem commitar**;
- escrever o **handoff** em `develop/handoff.md`, atualizar o `STATE.md` (`develop = done`) e devolver o
  resumo (blueprint → arquivos) + decisões em aberto.

## Passo 2 — Apresentar e perguntar

- Apresente o que foi implementado (mapeado ao plano) e o resultado de typecheck/lint/testes.
- Liste à parte as afirmações que ficaram como **"a verificar no `/test`"** — o que o handoff não
  conseguiu medir agora. Essa lista é o insumo do QA; apresentar suposição como fato é o que o `/review` e
  o `/test` derrubaram em 15 das 17 features entregues.
- Se houver "decisões em aberto" (ambiguidades surgidas na implementação), faça-as ao usuário com
  `AskUserQuestion` e ajuste conforme a resposta.

## Passo 3 — Próximo passo

Sugira rodar **`/review`** para revisar, criar a branch e preparar os commits (um por app, em inglês).

## Passo 4 — Liberar contexto

A implementação está no working tree e o `develop/handoff.md` + `STATE.md` guardam o que foi feito. Pode
`/compact` antes do `/review` — o revisor lê o diff via `git` e o handoff do disco, não precisa do seu
histórico desta etapa.

Mantenha o texto em português; código/identificadores em inglês.
