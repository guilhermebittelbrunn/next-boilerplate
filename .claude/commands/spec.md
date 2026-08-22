---
description: Descobre, escreve e mantém as specs de funcionalidades em specs/ — varre o repositório, confronta com padrões de mercado (com fontes) e propõe features genéricas para o core de MVPs. Também reconcilia o backlog com o código (--sync) e recomenda a próxima a atacar (--next). É a entrada do ciclo /spec → /analyze → /develop → /review → /test.
argument-hint: "[ideia | --sync | --next | --status | vazio para descoberta ampla]"
allowed-tools: Agent, AskUserQuestion, Read, Write, Edit, Grep, Glob, Bash, Skill, ToolSearch
---

# /spec

Entrada: **$ARGUMENTS**

Você é o orquestrador (loop principal) do papel **Estrategista de Produto**. Ele descobre e especifica
funcionalidades; você conduz as decisões com o usuário. O contrato do backlog está em
[`specs/README.md`](../../specs/README.md) — leia-o antes de qualquer coisa.

## Passo 1 — Identifique o modo

| `$ARGUMENTS` | Modo | O que fazer |
|--------------|------|-------------|
| vazio | **descoberta** | varredura ampla do repo + mercado → lote de specs novas |
| `--sync` / `sync` | **reconciliação** | audita o backlog contra o código, **arquiva as specs entregues** em `docs/features/<slug>/spec.md` e fecha o loop |
| `--next` / `next` | **priorização** | recomenda a próxima spec, com justificativa |
| texto livre | **spec dirigida** | escreve/atualiza a spec daquela ideia |
| `--status` / `status` | **leitura** | só resume o `BACKLOG.md`; não aciona subagent |

Antes de acionar o motor em modo **descoberta**, pergunte com `AskUserQuestion`:

- **Foco desta rodada** — `produto` (valor ao usuário final) · `dx` (prática de desenvolvimento) ·
  `confianca` (segurança/privacidade/a11y) · **equilibrado** *(default)*.
- **Tamanho do lote** — 6–8 specs *(default)* ou até 12.

Não pergunte mais que isso aqui: o resto das perguntas nasce do que o agente encontrar.

## Passo 2 — Acione o motor

Invoque o subagent **`estrategista-produto`** (`subagent_type: "estrategista-produto"`) passando o modo, o
foco e o lote escolhidos, e instruindo a:

- **inventariar o repositório primeiro**, com evidência `arquivo.ts:linha`, disparando `Explore` em
  paralelo por área (`apps/api` · `apps/app`+`apps/web` · `packages/*` · infra/testes/CI);
- **ler `specs/BACKLOG.md` e as specs existentes** para não repropor nada — inclusive o que está
  `rejected`/`deferred`;
- **pesquisar o mercado** com a skill `market-research`, com fontes primárias, prevalência declarada e
  ceticismo sobre hype;
- **escrever as specs** no formato de [`specs/TEMPLATE.md`](../../specs/TEMPLATE.md) (status `proposed`),
  regravar o `specs/BACKLOG.md` e gravar as notas em `specs/research/`;
- retornar a tabela de specs, as **lacunas descartadas com motivo** e as **"Perguntas em aberto"**.

Em `--sync`, instrua-o a **seguir a skill `spec-audit` passo a passo** — ela é o procedimento canônico da
auditoria e do arquivamento. Reforce só o princípio: **verificar o código, não o `status` gravado**.

## Passo 3 — Decida com o usuário

Este é o passo que só existe porque `/spec` roda no loop principal. Com `AskUserQuestion`:

1. **Triagem das specs propostas** — para cada lote, pergunte quais viram `approved`, quais ficam
   `proposed`, quais são `deferred`/`rejected`. Agrupe: não faça 8 perguntas seguidas; ofereça as
   recomendações do agente como opção default.
2. **Perguntas em aberto** do agente (corte de MVP, adotar serviço pago, prioridade).
3. Em `--sync`, confirme as mudanças de status que o agente marcou como "precisa de decisão" —
   especialmente `rejected` e casos de **deriva** (implementado diferente do especificado).

Nunca invente resposta e **nunca mova uma spec para `approved`/`rejected` sem confirmação**.

## Passo 4 — Consolide

Aplique as respostas nos arquivos de spec e no `BACKLOG.md` (`status`, `value`, `effort`, motivo de
`deferred`/`rejected`, `updated` com `date '+%Y-%m-%d'`). Garanta que:

- todo frontmatter está completo e com valores válidos (ver `specs/README.md`);
- o `BACKLOG.md` está ordenado por prioridade e com os contadores por status corretos;
- nenhuma spec contém pseudo-diff ou nome de arquivo a criar — isso é do `/analyze`.

## Passo 5 — Apresente e feche o loop

Mostre: quantas specs entraram/mudaram, a distribuição por `audience`, e a **recomendação da próxima**.
Sugira o próximo comando:

```
/analyze <id>             # o nome da spec é o argumento padrão do /analyze
```

Em `--sync`, mostre também **o que foi arquivado** e para onde, e confirme que `specs/` voltou a conter
apenas o que falta.

Ao final de um ciclo de entrega (`/test` concluído), lembre o usuário de rodar **`/spec --sync`** para
fechar o loop e tirar a spec do backlog.

## Regras

- **Nada de código.** Este comando não implementa, não faz scaffolding, não toca `apps/` nem `packages/`.
- **Não escreva em `docs/features/`**, exceto para arquivar a spec entregue no `--sync` (procedimento em
  [`spec-audit`](../skills/spec-audit/SKILL.md) §4.1). O backlog vive em `specs/`; o resto da pasta da
  feature é do pipeline de execução.
- **Não crie branch, não commite, não pushe** ([`.claude/rules/git-commits.md`](../rules/git-commits.md)).
  Os arquivos de `specs/` são versionados e entram num commit `docs(specs): <resumo>` quando o usuário
  aprovar — normalmente pelo `/review`.
- **Genérico no core.** Recuse spec específica de domínio: explique que pertence ao fork.
- Tudo em português; `id`/slug em inglês.
