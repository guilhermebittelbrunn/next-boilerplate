---
description: Faz a mediação dos comentários de uma PR aberta (review automático + humanos) validando contra a branch remota, aplica correções quando fizer sentido e gera um markdown de replies — um bloco por comentário (item a item quando há checklist), cada ponto com status, pronto para colar na PR. Independente do fluxo de desenvolvimento — não usa STATE.md.
argument-hint: "[opcional: número/URL da PR — padrão: PR da branch atual]"
allowed-tools: Agent, AskUserQuestion, Read, Bash
---

# /mediate

Foco (opcional): **$ARGUMENTS**

Você é o orquestrador do papel **Mediador de Comentários de PR**. Este comando é independente do fluxo
`/analyze → /develop → /review → /test → /observe` — não interage com `STATE.md`.

## Passo 0 — Determinar a PR

1. Rode `git fetch origin` e, se `$ARGUMENTS` vier (número ou URL), use. Senão, descubra a PR da branch
   atual: `gh pr view --json number,url,headRefName 2>/dev/null`.
2. Se não houver PR aberta para a branch atual e nada foi passado, avise e pare.
3. Tente associar uma pasta de feature: se a branch seguir o padrão `<project>/<type>/<slug>` ou
   `feat/<slug>` e existir `docs/features/<slug>/`, repasse esse caminho ao subagent. Se não existir, siga
   sem — **não é obrigatório**.

## Passo 1 — Acionar o motor

Invoque o subagent **`mediador-pr`** (Agent tool, `subagent_type: "mediador-pr"`), passando o número da PR
e, se encontrado, o caminho da pasta de feature. Peça para:

- **`git fetch origin`** e validar tudo contra `origin/<headRefName>` (o código que o revisor viu), não
  contra o working tree local — sinalizando commits locais não enviados e comentários já obsoletos;
- buscar os comentários **não resolvidos** (threads via GraphQL, comentários gerais e corpos de review);
- aplicar as correções que fizerem sentido, usando
  [`docs/review-checklist.md`](../../docs/review-checklist.md) e os `CLAUDE.md` do escopo como **evidência
  objetiva** quando for discordar de um comentário;
- tratar como `📦 Fora de escopo` o que **muda o contrato do `@repo/sdk`** ou a API pública do
  `@repo/design-system` — isso atinge todos os apps e não cabe numa correção pontual de thread;
- **validar visualmente** com `agent-browser` (comandos em sequência) antes de marcar `✅ Corrigido` numa
  correção de UI/layout;
- salvar o **markdown de replies**: um bloco por comentário, pronto para colar na thread; quando o
  comentário trouxer checklist, **um item por ponto**, cada um com o **status** do vocabulário fechado
  (`✅ Corrigido`, `🩹 Corrigido parcialmente`, `✔️ Já contemplado`, `❌ Não procede`, `📦 Fora de escopo`,
  `🎯 Escolha deliberada`, `⏳ Decisão pendente`, `❓ Preciso de contexto`) + tabela de visão geral no topo.

## Passo 2 — Apresentar

Mostre: a **contagem por status**, o estado da sincronia com o remoto, o que foi corrigido e o caminho do
arquivo salvo. Se houver itens `⏳ Decisão pendente` ou `❓ Preciso de contexto`, faça-os ao usuário com
`AskUserQuestion` e peça ao agent para atualizar o arquivo conforme as respostas.

Lembre que as correções ficam **no working tree**: o commit delas segue o fluxo normal (`/review` ou
manual), com aprovação do usuário. O agent **não publica nada no GitHub** — a colagem das respostas é
manual.

## Passo 3 — Liberar contexto

O markdown de resposta está salvo em disco e as correções (se houve) estão no working tree. Pode
`/compact`/`/clear` — para postar as respostas na PR ou revisar as correções, volte a ler o arquivo salvo,
não esta conversa.
