# Regra global — escrita (`humanizer` + `caveman`)

Aplica-se a **todo agent e todo slash command** deste repositório. Duas skills, duas superfícies
diferentes — nunca troque uma pela outra:

| Superfície | Skill | Por quê |
|------------|-------|---------|
| **Arquivo que fica no repo** (prosa) | `humanizer` (global, `~/.claude/skills/`) | É lido por humano meses depois, entra no diff e no PR. Texto inflado de IA envelhece pior que código ruim. |
| **Mensagem na conversa** (retorno ao orquestrador, resposta ao usuário) | [`caveman`](../skills/caveman/SKILL.md) (deste repo) | É consumido uma vez e descartado. Cada palavra a mais é token pago sem retorno. |

## 1. `humanizer` — obrigatório antes de salvar prosa

Roda **antes** de gravar qualquer arquivo de texto do fluxo:

- `docs/features/<slug>/` — `analyze/plan.md`, `develop/handoff.md`, `review/review.md`,
  `test/criterios-aceite.md`, `test/report.md`, `observacao.md`, `STATE.md`;
- `specs/` — specs, `BACKLOG.md`, notas em `specs/research/`;
- markdown de replies de PR (`pr-review/pr-<numero>.md`);
- qualquer `docs/*.md` novo ou editado (incluindo `docs/PRE-PRODUCTION.md`).

O que ela corta, e que este fluxo produz de montão: superlativo vazio ("robusto", "abrangente",
"cuidadosamente"), fórmula de encerramento ("Com isso, o fluxo passa a funcionar corretamente"), voz
passiva onde cabe sujeito, estrutura repetitiva de três itens, e afirmação sem fonte disfarçada de fato.

**Não se aplica a**: código, comentário de código, mensagem de commit, nome de branch, título de PR,
tabela de dados pura, bloco de log/comando. Prosa é que passa pelo `humanizer`.

## 2. `caveman` — obrigatório na conversa

Vale para o **retorno do subagent ao orquestrador** e para a **mensagem do comando ao usuário**: resumo,
achados, opções de `AskUserQuestion`, próximo passo sugerido, plano de commits.

Preserve o que a própria skill manda preservar: **português** (é a língua do fluxo aqui), termos técnicos,
nomes de símbolo, caminhos de arquivo, comandos, `error.code`, tipos de commit (`feat`/`fix`/…) e strings de
erro — literais. Compressão é de estilo, não de conteúdo.

**Auto-clareza**: saia do `caveman` para aviso de segurança, confirmação de ação irreversível (commit,
push, apagar dado de dev) e sequência de passos em que fragmento ambíguo faz o usuário errar a ordem.
Volte depois.

### Não ative o modo persistente no loop principal

A skill declara persistência por sessão ("até o usuário dizer normal mode"). Num **subagent** isso é
inofensivo: o contexto morre quando ele termina.

Num **slash command**, que roda no loop principal, não é — o estilo vazaria para o resto da conversa,
inclusive para trabalho que nada tem a ver com o comando. Então, nos comandos:

- aplique o **estilo** do `caveman` às mensagens daquele comando;
- **não** invoque a skill pela Skill tool com a intenção de fixá-la na sessão, e **não** anuncie modo;
- terminado o comando, volte ao normal sem o usuário precisar pedir.

Se o usuário ativar `caveman` explicitamente na conversa, aí sim ela persiste — é escolha dele.

## 3. ⛔ A fronteira que não se cruza

**`caveman` nunca sai da conversa.** Nada de prosa comprimida em:

- arquivo salvo em `docs/`, `specs/` ou qualquer lugar do repo;
- código, comentário de código, JSDoc;
- mensagem de commit, nome de branch, título/corpo de PR;
- chave de tradução em `@repo/internationalization` — copy de UI segue o tom do produto, não o do chat;
- arquivo de memória.

O que vai para arquivo é escrito em português normal e passa pelo `humanizer`. Quem lê aquele texto não
estava na sessão e não tem como reconstituir o que foi comprimido.

**Formato fixo vence estilo.** Onde um artefato define forma própria — o `⚠️ **<Destinatário>:**` da
`observacao.md`, o vocabulário de status (`✅ Corrigido`, `❌ Não procede`, …) do markdown de replies de PR,
o formato §9.1 dos critérios de aceite, as severidades `🔴`/`🟡`/`🟢`/`✅`/`👁` do relatório de revisão
(§8 de [`docs/review-checklist.md`](../../docs/review-checklist.md)) — a forma do artefato manda. O "sem
emoji" do `caveman` não sobrescreve ela, porque ali o emoji **é** o dado. Isso vale mesmo quando o formato
é entregue na conversa, como no relatório do `code-reviewer`: comprima o texto de cada achado e preserve
os cabeçalhos.

## 4. Quando o agent escreve e conversa na mesma execução

É o caso normal: o `desenvolvedor` grava o `handoff.md` e devolve um resumo; o `revisor-codigo` grava o
`review.md` e devolve o plano de commits. **São dois registros distintos, no mesmo turno.** Não gere um só
e reaproveite: o arquivo em português normal (humanizado), o retorno comprimido.

E ao acionar um subagent, **repita a regra no prompt** — o subagent começa com contexto limpo.
