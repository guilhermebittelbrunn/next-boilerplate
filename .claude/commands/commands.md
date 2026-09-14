---
description: Folha de referência dos slash commands deste projeto — o que cada um faz, quem pode criar branch e commitar, o gate sequencial e onde o estado da feature vive.
argument-hint: "(sem argumento)"
allowed-tools: Read
---

# `.claude/commands/` — os slash commands do projeto

Cada arquivo `.md` desta pasta vira um comando `/<nome>` no Claude Code. Eles rodam no **loop principal**
(a conversa com você), e o trabalho pesado vai para um **subagent** de `.claude/agents/`.

Este arquivo é a **referência da pasta** e também o comando `/commands` — invocado, apresente o conteúdo
abaixo de forma resumida. O fluxo completo está em
[`docs/TASK-PIPELINE.md`](../../docs/TASK-PIPELINE.md); o ferramental, em
[`docs/AI-WORKFLOW.md`](../../docs/AI-WORKFLOW.md).

> Por que `commands.md` e não `README.md`: **todo** `.md` desta pasta vira slash command, então um README
> apareceria no menu como `/README`. Já que ia virar comando de qualquer jeito, que seja um que sirva para
> alguma coisa.

## O pipeline

```
/spec  →  /analyze  →  /develop  →  /review  →  /test     (+ /observe · /mediate)
   ↑                                              │
   └────────── /spec --sync fecha o ciclo ────────┘

/cycle — a linha inteira numa tacada, sem parar para perguntar
```

| Comando | Arquivo | Subagent | O que faz |
|---------|---------|----------|-----------|
| `/spec` | [`spec.md`](spec.md) | `estrategista-produto` | Descobre e especifica o que vale construir → `specs/<id>.md` + `BACKLOG.md`. `--sync` reconcilia o backlog **com o código** e arquiva as specs entregues; `--next` recomenda a próxima. |
| `/analyze` | [`analyze.md`](analyze.md) | `planejador-tarefa` | Transforma uma spec em **plano técnico** → `docs/features/<slug>/analyze/plan.md` + `STATE.md`. |
| `/develop` | [`develop.md`](develop.md) | `desenvolvedor` | **Implementa** o slice vertical (SDK → API → app/web → i18n) → `develop/handoff.md`. |
| `/review` | [`review.md`](review.md) | `revisor-codigo` | Revisa o diff, **corrige**, resolve a branch, propõe os commits → `review/review.md`. |
| `/test` | [`test.md`](test.md) | `analista-qa` | Critérios de aceite (§9.1) + testes Vitest + validação e2e no browser → `test/`. |
| `/observe` | [`observe.md`](observe.md) | `observador-tarefa` | *(opcional)* Resumo de 2–3 parágrafos em linguagem de negócio → `observacao.md`. |
| `/mediate` | [`mediate.md`](mediate.md) | `mediador-pr` | *(avulso)* Triagem dos comentários de uma PR → markdown de replies. Independente do pipeline. |
| `/cycle` | [`cycle.md`](cycle.md) | todos | Roda o ciclo inteiro **sem parar para perguntar**. Para quando você não vai acompanhar. |

## Quem pode fazer o quê

Três permissões que separam os papéis, e que **nenhum** comando pode contornar:

| | cria branch | commita | pusha |
|---|---|---|---|
| `/spec` · `/analyze` · `/develop` · `/test` · `/observe` · `/mediate` | ❌ | ❌ | ❌ |
| `/review` | ✅ **é o dono da branch** | ❌ *propõe o plano* | ❌ |
| `/cycle` | ❌ | ❌ | ❌ |
| **você** | — | ✅ | ✅ |

**Commit exige a sua aprovação explícita** ([`../rules/git-commits.md`](../rules/git-commits.md)) — e
"rodar o `/cycle`" não é essa aprovação. ⛔ Nunca em `main`/`master`/`production`/`production-backup`; o
hook `block-protected-branch-write.sh` é a rede, não a verificação.

## Gate sequencial

Cada comando exige a etapa anterior concluída — `/develop` ← `analyze`, `/review` ← `develop`,
`/test` ← `review` — lendo o `STATE.md` da feature. Se faltar, ele **para** e manda rodar a etapa anterior.

`--force` (ou `--skip-gate`) pula em casos legítimos (hotfix sem plano formal) e **registra o bypass** no
`STATE.md`.

`/spec` está fora do gate: roda antes de existir tarefa. Bug e ajuste pontual vão direto ao `/analyze`.

## Argumento: sempre opcional

Sem argumento, todos usam a **feature mais recente** (o `STATE.md` mais novo em `docs/features/`), e
`/review`/`/test` focam no `git diff` atual à luz dos artefatos dessa feature. O argumento aceita um
slug/caminho de `docs/features/<slug>`, um caminho de arquivo, ou uma descrição livre.

Exceção: o argumento padrão do `/analyze` é o **nome de uma spec** (`/analyze audit-log`).

## Onde o estado vive

No disco, por feature, em `docs/features/<slug>/` — **versionado**, é o histórico de como a feature foi
construída:

```
STATE.md              ← o gate: até onde o pipeline chegou
spec.md               ← a spec arquivada, quando a feature nasceu de uma  [/spec --sync]
analyze/plan.md       ← o blueprint técnico                               [/analyze]
develop/handoff.md    ← o que foi implementado, desvios, validação        [/develop]
review/review.md      ← achados, correções, plano de commits              [/review]
test/                 ← critérios de aceite, relatório, screenshots e2e   [/test]
observacao.md         ← resumo de negócio                                 [/observe]
pr-review/pr-<n>.md   ← triagem de comentários de PR                      [/mediate]
```

Cada etapa lê o **handoff conciso** da anterior, não o plano inteiro — é o ganho de tokens do pipeline. E
é por isso que uma sessão pode cair no meio sem perder trabalho: o estado não está na conversa.

⛔ **O código nunca aponta para esses arquivos.** `docs/features/` ser versionado não autoriza comentário,
docstring ou mensagem de commit a citá-lo — o ponteiro apodrece e o comentário precisa ser autossuficiente
([`../rules/code-comments.md`](../rules/code-comments.md)).

## Colisões de nome

`/review` também existe como comando **global** (revisão de PR do GitHub). O do projeto tem precedência;
para a revisão genérica de diff, use `/code-review`.

O comando do ciclo chama-se `/cycle` e **não** `/loop` porque `/loop` é embutido do Claude Code (agenda um
prompt em intervalo recorrente). São coisas diferentes — e complementares: o agendamento noturno do
`/cycle` está em [`../cycle-schedule.jsonc`](../cycle-schedule.jsonc).

## Editar um comando

O frontmatter é o contrato:

```yaml
---
description: <uma linha — é o que aparece no menu de comandos>
argument-hint: "[o que o argumento aceita]"
allowed-tools: Agent, AskUserQuestion, Read, Write, Edit, Grep, Glob, Bash, Skill
---
```

No corpo, `$ARGUMENTS` recebe o que o usuário digitou. Convenções desta pasta: texto em **português**,
`id`/slug/código/commits em **inglês**, e o comando **repassa caminhos** ao subagent em vez de colar
conteúdo de arquivo no prompt — quem lê o diff e os artefatos é o agente, uma vez só.

Comando novo que vira padrão reutilizável deveria ser uma **skill** (`.claude/skills/<nome>/SKILL.md`),
não um comando: skills auto-acionam por contexto, comandos são invocados de propósito.
