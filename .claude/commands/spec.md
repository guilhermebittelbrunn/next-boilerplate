---
description: Descobre, escreve e mantém as specs de funcionalidades em specs/ — varre o repositório, confronta com padrões de mercado (com fontes) e propõe features genéricas para o core de MVPs. Fecha a spec na branch da feature depois do /test (--close), reconcilia o backlog com o código a partir de main (--sync) e recomenda a próxima a atacar (--next). É a entrada e a saída do ciclo /spec → /analyze → /develop → /review → /test → /spec --close.
argument-hint: "[ideia | --close [id] | --sync | --next | --status | vazio para descoberta ampla]"
allowed-tools: Agent, AskUserQuestion, Read, Write, Edit, Grep, Glob, Bash, Skill, ToolSearch
---

# /spec

Entrada: **$ARGUMENTS**

Você é o orquestrador (loop principal) do papel **Estrategista de Produto**. Ele descobre e especifica
funcionalidades; você conduz as decisões com o usuário. O contrato do backlog está em
[`specs/README.md`](../../specs/README.md) — leia-o antes de qualquer coisa.

## Regras de escrita (`humanizer` + `caveman`)

Regra em [`.claude/rules/writing-skills.md`](../rules/writing-skills.md); as skills estão no
`allowed-tools`.

- **`caveman` no que chega até o usuário**: tabela de specs, lacunas descartadas, triagem, recomendação da
  próxima. Estilo restrito a este comando — **não** fixe o modo na sessão. Saia do estilo no texto das
  perguntas de triagem: aprovar ou rejeitar spec é decisão que o usuário toma em cima delas.
- **`humanizer` no que vira arquivo**: `specs/features/<id>.md`, `specs/BACKLOG.md` e `specs/reference/research/*`, inclusive
  na consolidação do Passo 4. Spec é o documento onde mais aparece superlativo sem número — a skill corta
  o inflado, mas a fonte com URL e data continua sendo exigência sua.
- **Repita as regras no prompt do `estrategista-produto`.**

## Passo 1 — Identifique o modo

| `$ARGUMENTS` | Modo | O que fazer |
|--------------|------|-------------|
| vazio | **descoberta** | varredura ampla do repo + mercado → lote de specs novas |
| `--close [id]` / `close` | **fechamento** | na branch da feature, depois do `/test`: confere o corte **daquela** spec no código, arquiva em `docs/features/<slug>/spec.md` e atualiza só as linhas dela no `BACKLOG.md` (Passo 2.1). Sem `id`, usa o `spec:` do `STATE.md` mais recente |
| `--sync` / `sync` | **reconciliação** | a partir de `main` atualizada: audita o backlog inteiro contra o código, confirma o merge das specs já fechadas e arquiva as entregues que ninguém fechou |
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
- **escrever as specs** no formato de [`specs/reference/TEMPLATE.md`](../../specs/reference/TEMPLATE.md) (status `proposed`),
  regravar o `specs/BACKLOG.md` e gravar as notas em `specs/reference/research/`;
- retornar a tabela de specs, as **lacunas descartadas com motivo** e as **"Perguntas em aberto"**.

Em `--sync`, instrua-o a **seguir a skill `spec-audit` passo a passo** — ela é o procedimento canônico da
auditoria e do arquivamento. Reforce só o princípio: **verificar o código, não o `status` gravado**.

### Passo 2.1 — `--close`: fechar a spec na branch da feature

É a última etapa do pipeline de uma feature que nasceu de spec. Ela existe para que a spec entregue saia de
`specs/` **na mesma PR** do código: quando a PR entra em `main`, a próxima branch já encontra o backlog
atualizado e a conferência da entrega dentro de `docs/features/<slug>/spec.md`.

1. Resolva a feature: o `id` do argumento, ou o `spec:` do `STATE.md` mais recente
   (`ls -t docs/features/*/STATE.md | head -1`). Sem `spec:`, diga que é tarefa direta e pare.
2. Confira o gate: `test = done` no `STATE.md` e branch atual não protegida. Se falhar, pare e diga qual.
3. Acione o **`estrategista-produto`** instruindo-o a seguir **só o §4.2 da skill `spec-audit`**: uma spec,
   sem auditar as outras; no `reference/AUDIT.md`, só a troca do alvo dos links que o movimento quebrou. Repita as regras de escrita.
4. Se o agente disser que o corte está incompleto, mostre o que falta e pare: a spec continua
   `in-progress`, e o caminho é voltar ao `/develop`.
5. Mostre o que foi arquivado e as linhas do `BACKLOG.md` que mudaram. Depois pergunte, com
   `AskUserQuestion`, se pode commitar `docs(specs): close <id>`. Com o "sim", confira o índice
   (`git diff --cached --stat` vazio antes do `git add`), commite só o rename, o `BACKLOG.md` e os links
   corrigidos, e confira com `git show --stat --oneline HEAD`.
6. Se a branch já tem upstream (o `/review` fez o push), pergunte se pode dar `git push`. Sem o "sim", não
   pushe.

No `/cycle` o fechamento roda sem as perguntas dos passos 5 e 6: o commit entra no plano de commits do
relatório final, como todo o resto.

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
- toda spec em `specs/features/` tem o bloco **Resumo** no topo, coerente com o frontmatter;
- o `BACKLOG.md` está ordenado por prioridade, com os contadores por status corretos, e continua cabendo numa
  tela: evidência de auditoria vai para o `specs/reference/AUDIT.md`;
- nenhuma spec contém pseudo-diff ou nome de arquivo a criar — isso é do `/analyze`.

## Passo 5 — Apresente e feche o loop

Mostre: quantas specs entraram/mudaram, a distribuição por `audience`, e a **recomendação da próxima**.
Sugira o próximo comando:

```
/analyze <id>             # o nome da spec é o argumento padrão do /analyze
```

Em `--sync`, mostre também **o que foi arquivado** e para onde, quais fechamentos feitos em branch tiveram
o merge confirmado, e confirme que `specs/` voltou a conter apenas o que falta.

Ao final de um ciclo de entrega (`/test` concluído), o próximo comando é **`/spec --close`**, ainda na
branch da feature. O `/spec --sync` fica para depois do merge, a partir de `main`.

## Regras

- **Nada de código.** Este comando não implementa, não faz scaffolding, não toca `apps/` nem `packages/`.
- **Não escreva em `docs/features/`**, exceto para arquivar a spec entregue no `--close` ou no `--sync`
  (procedimento em [`spec-audit`](../skills/spec-audit/SKILL.md) §4.1 e §4.2). O backlog vive em `specs/`;
  o resto da pasta da feature é do pipeline de execução.
- **Não crie branch** ([`.claude/rules/git-commits.md`](../rules/git-commits.md)). Commit e push só no
  `--close`, cada um com o "sim" explícito do usuário (Passo 2.1). Nos outros modos, os arquivos de `specs/`
  entram num commit `docs(specs): <resumo>` quando o usuário aprovar, normalmente pelo `/review`.
- **Genérico no core.** Recuse spec específica de domínio: explique que pertence ao fork.
- Tudo em português; `id`/slug em inglês.
