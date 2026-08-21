---
description: Gera a observação final da tarefa — resumo extremo de 2 a 3 parágrafos, em linguagem de negócio, que QA/PO/CTO leem em 30 segundos, com avisos precisos e delimitada para não se misturar ao conteúdo do card. Markdown pronto para colar. Etapa opcional, roda depois do /review; não exige /test.
argument-hint: "[opcional: slug/caminho da feature — padrão: mais recente]"
allowed-tools: Agent, AskUserQuestion, Read, Write, Bash, ToolSearch
---

# /observe

Foco (opcional): **$ARGUMENTS**

Você é o orquestrador do papel **Observador de Tarefa** — a etapa final e **opcional** do fluxo.

## Passo 0 — Localizar a feature e checar o gate

1. Se `$ARGUMENTS` trouxer um **slug** ou **caminho** de `docs/features/<slug>`, use essa pasta. Senão, a
   mais recente: `ls -t docs/features/*/STATE.md 2>/dev/null | head -1` → `dirname`.
2. **Gate frouxo — exige só `review` concluído** (não exige `/test`). Leia o `STATE.md` e confirme
   `review = done` (sinal alternativo: existência de `review/review.md`). **Siga mesmo que `test` esteja
   `pending`/`blocked`.** Se nem o `review` tiver rodado, avise e sugira `/review` antes — mas não bloqueie
   se o usuário insistir.
3. Guarde o **caminho da pasta da feature** e o **`<slug>`** para repassar ao subagent — **não leia os
   artefatos aqui** (o subagent lê).

## Passo 1 — Acionar o motor

Invoque o subagent **`observador-tarefa`** (Agent tool, `subagent_type: "observador-tarefa"`), passando o
caminho da pasta da feature (e o slug). Peça para gerar a observação, salvar em
`docs/features/<slug>/observacao.md` e atualizar o `STATE.md` (linha `observe`).

**Reforce as restrições de formato** — é aqui que a observação costuma inchar:

- **Resumo extremo: 2 ou 3 parágrafos, teto de ~150 palavras.** Sem subtítulos, sem listas, sem tabelas,
  sem changelog de arquivos. §1 o que era (para bug, a reprodução embutida na frase); §2 o que muda agora,
  com exemplo concreto; §3 **só se houver** ação/risco real.
- **Público: QA, PO e CTO**, lendo de passagem — o QA precisa saber o que testar, o PO o que o usuário
  ganha, o CTO se há risco ou pendência. Linguagem 100% de negócio, zero termo técnico (nada de "DTO",
  "guard", "hook", "SDK", "repositório").
- **Avisos precisos ou nenhum.** Todo ponto de atenção começa com `⚠️ **<Destinatário>:**` e nomeia
  **ação + responsável + lugar**. Neste boilerplate os casos reais são quase sempre: **variável de ambiente
  na Vercel**, **webhook a cadastrar no provedor**, **índice do banco a publicar** ou **regra de segurança
  do banco a atualizar**. "Validar em produção" e "atenção ao testar" não são avisos — mande cortar.
- **Não pode se misturar ao card**: começa com `---` + `### Observação`, é autossuficiente (nada de
  "conforme descrito acima"), não repete nem contradiz a descrição existente.
- **Sem referência ao fluxo dos agents**: nada de `plan.md`, `handoff.md`, `criterios-aceite.md`,
  "critério 4", nome de branch/commit — quem lê o card não tem o repositório aberto. Se a informação
  importa, ela entra pelo **conteúdo**, não pela citação.

## Passo 2 — Validar com o usuário

Mostre o texto completo e **confira você mesmo, antes de perguntar**: cabe em 3 parágrafos? tem algum termo
técnico, lista ou referência a artefato do fluxo? algum aviso genérico? Se algo violar, mande o agent
reescrever **antes** de levar ao usuário — não peça aprovação de um texto fora do padrão.

Então pergunte (`AskUserQuestion`) se está bom ou se precisa ajustar tom/conteúdo — repita até aprovar.

## Passo 3 — Entregar (ClickUp é somente leitura)

**Não publique nada no ClickUp.** Nada de `clickup_update_task`, `clickup_create_comment` ou anexos — a
integração é usada apenas para **ler** contexto. Entregue assim:

1. Apresente o texto final aprovado, em bloco de markdown pronto para copiar.
2. Informe o caminho do arquivo (`docs/features/<slug>/observacao.md`) e diga onde ele deve entrar no card
   (ao final da descrição, depois do conteúdo existente) — a colagem é feita pelo usuário.

## Passo 4 — Liberar contexto

A observação está salva em disco e o `STATE.md` marca `observe = done`. Pode `/compact`/`/clear` — a tarefa
está encerrada nesta sessão.
