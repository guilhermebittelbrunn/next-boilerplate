---
description: Roda o ciclo inteiro sem parar — /spec --sync, escolhe a próxima spec do backlog e leva ela por /analyze → /develop → /review → /test, acumulando as perguntas para o fim. Adota a recomendação quando precisa decidir, registra as pendências de infra em docs/PRE-PRODUCTION.md e nunca commita sozinho.
argument-hint: "[id da spec | --audit-only | --no-audit (exige id) | --max-rounds N]"
allowed-tools: Agent, AskUserQuestion, Read, Write, Edit, Grep, Glob, Bash, Skill
---

# /cycle

Foco (opcional): **$ARGUMENTS**

Você é o orquestrador (loop principal) do **ciclo completo**. Este comando existe para uma situação
específica: **o usuário não vai estar na frente da tela**. Ele autoriza uma rodada inteira de uma vez e lê o
resultado no fim.

Isso muda o seu comportamento em relação aos comandos individuais: onde o `/analyze` ou o `/develop`
parariam para perguntar, você **decide, registra e segue**. O preço disso é que o relatório final tem de
ser honesto o bastante para o usuário conseguir desfazer qualquer decisão que não goste.

> **Este comando não substitui os individuais.** Quem está acompanhando de perto deve rodar
> `/spec --sync`, `/analyze`, `/develop`, `/review`, `/test` um a um — o feedback chega mais cedo e sai
> mais barato. O `/cycle` é para a rodada autônoma.

## Regras de escrita (`humanizer` + `caveman`)

Regra em [`.claude/rules/writing-skills.md`](../rules/writing-skills.md). Aqui elas pesam mais que nos
outros comandos, porque **o usuário lê zero mensagens até o Passo 7**:

- **`humanizer` em tudo que vira arquivo** — os artefatos de cada etapa, as specs que a auditoria regrava e
  o [`docs/PRE-PRODUCTION.md`](../../docs/PRE-PRODUCTION.md), que é o que sobrevive ao fechar a janela.
  **Repita a exigência no prompt de cada subagent**: numa rodada autônoma ninguém revisa o texto no meio.
- **`caveman` no relatório final** — ele é longo por natureza e é o único momento em que você fala. Comprima
  o estilo, **nunca o conteúdo**: decisão adotada sem perguntar continua vindo com a alternativa
  descartada e o porquê, senão o usuário não tem como discordar de forma informada.
- **Saia do `caveman`** no bloco de pendências, no plano de commits e na pergunta "commito?" — é
  confirmação de ação difícil de desfazer.
- **Não fixe o modo na sessão.** Terminado o comando, volte ao normal.

## A regra que não pode ser quebrada

⛔ **O `/cycle` NÃO commita e NÃO faz push.** Ele deixa o working tree pronto e **apresenta o plano de
commits** no fim. Commit exige aprovação explícita do usuário
([`.claude/rules/git-commits.md`](../rules/git-commits.md)) — e "rodar o `/cycle`" **não é** essa aprovação.
Isso vale mesmo com tudo verde, mesmo que o usuário tenha aprovado commits numa rodada anterior.

## Passo 0 — Fixar o terreno

0. **Leia [`.claude/cycle-policy.md`](../cycle-policy.md) antes de qualquer coisa.** É a lista de decisões
   que o usuário já tomou e não quer que você readivinhe. **Ela vence a escada de decisão do Passo 2**, e
   perde só para uma instrução direta na conversa e para `.claude/rules/`. Onde a política cobre o caso,
   siga-a e **não** leve a pergunta ao relatório final — é justamente o que ela existe para eliminar.
1. **Trave o diretório de trabalho.** Rode `pwd` e guarde o **caminho absoluto**. Existem checkouts
   paralelos deste repo na máquina (workspaces do Conductor, clones antigos) e **eles divergem**. Já houve
   rodada em que um subagent leu o checkout errado e reportou símbolos que não existiam aqui, contaminando
   o plano. **Todo prompt de subagent deve carregar esse caminho absoluto e a instrução de confirmar com
   `pwd` antes de editar.**
2. **Cheque a branch**: `git rev-parse --abbrev-ref HEAD`. Se for protegida (`main`, `master`,
   `production`, `production-backup`), **PARE** e diga que o `/review` precisa criar uma branch antes — o
   `/cycle` não nomeia branch, isso é do `revisor-codigo`. **Cheque também se o nome bate com o padrão**
   (regex no Passo 3 do [`/review`](review.md)): nome inválido não interrompe a rodada, mas entra no
   relatório final como pendência — o `revisor-codigo` vai ter de resolvê-lo antes dos commits, e é melhor
   o usuário saber disso no começo do que na hora de aprovar.
3. **Cheque o working tree**: `git status --short`. Se já houver mudanças, **não as descarte** — identifique
   de que assunto são e registre, porque elas vão precisar de commits separados no fim.
4. **Defina o teto de rodadas**: `--max-rounds N` (padrão **2**) limita o vai-e-volta `/test` ↔ `/review`
   do Passo 5. Sem teto, um defeito que nenhum dos dois resolve vira laço infinito.

## Passo 1 — `/spec --sync`

Salvo `--no-audit`, acione o subagent **`estrategista-produto`** em modo reconciliação, instruindo-o a
**seguir a skill [`spec-audit`](../skills/spec-audit/SKILL.md) passo a passo**.

O princípio, que você repete no prompt: **verificar o código, não o `status` gravado.** Cada item do corte
de MVP é reconferido no código-fonte com evidência `arquivo.ts:linha`. Spec só vira `done` com o corte
inteiro confirmado — e o critério de "entregue" inclui **PR mergeada em `main` e CI verde no SHA de
merge**, não apenas código no disco.

Peça também: corrigir a **deriva** de referências nas specs (elas apodrecem a cada entrega), reconferir os
**achados** e as **pendências sem dono** um a um, remedir os **gates**, recalcular os **lotes paralelos** a
partir do `contends_on`, e devolver a **recomendação de #1** já decidida.

Se `$ARGUMENTS` trouxer um **id de spec**, ele **vence** a recomendação do agente — mas registre a
divergência no relatório final, com o motivo que o agente deu.

Com `--audit-only`, pare aqui e apresente o resultado da auditoria.

### `--no-audit` — quando você é um de vários

Existe para **rodar em paralelo**. Vários workspaces rodando o ciclo ao mesmo tempo não podem todos
reescrever o `specs/BACKLOG.md`: só **um** roda a auditoria, os outros passam `--no-audit`.

Com `--no-audit`, o `$ARGUMENTS` **tem** de trazer o id da spec — sem auditoria não há recomendação, e
adivinhar qual atacar é exatamente como dois workspaces acabam na mesma feature. Se vier vazio, **pare** e
peça o id.

Antes de começar, confirme no `BACKLOG.md` que a spec pedida está no **mesmo lote** que as outras em
execução: lote é calculado por `contends_on` disjunto. `depends_on` vazio **não** significa paralelizável —
ele modela ordem ("A precisa de B"), não contenção de arquivo.

### Passo 1.1 — Resolver o que a auditoria pede antes de seguir

A auditoria costuma devolver perguntas cuja resposta é **uma medição de 2 minutos**, não uma decisão de
produto: "as rules estão publicadas?", "o CI passou naquele SHA?", "essa branch foi mergeada?".

**Meça agora**, antes do `/analyze` — uma dessas mediu 403 numa rodada e derrubou uma "pendência #1 de
segurança" que não existia, além de revelar **dois documentos afirmando o contrário**. Fatos assim mudam o
plano da feature seguinte; descobri-los depois é retrabalho.

Só deixe para o fim o que exige **julgamento do usuário** (aprovar/rejeitar spec, adotar serviço pago,
mudar prioridade).

## Passo 2 — `/analyze`

Acione o **`planejador-tarefa`** na spec eleita. Entregáveis: `docs/features/<slug>/analyze/plan.md`
(Etapa 1 + Etapa 2 do [`feature-analysis-guide.md`](../../docs/feature-analysis-guide.md)) e o `STATE.md`
com `spec: <id>`.

**Instrua-o a não perguntar nada.** A ordem de precedência para decidir:

1. onde a **spec** já recomenda uma escolha → adote a spec;
2. onde a spec é omissa mas há **padrão vigente no repo** → siga o padrão (o slice de referência é
   `entity`);
3. onde resta ambiguidade real → **escolha o menor raio de impacto**, implemente essa, e registre em
   "Perguntas em aberto" com: a pergunta, as opções, **a que foi adotada** e por quê.

Exija que o plano separe explicitamente os **pré-requisitos manuais de infra** (criar bucket, publicar
rules, variável de ambiente, ativar serviço). O `/develop` não consegue satisfazê-los e o `/test` precisa
saber disso para não reprovar o que não é código.

## Passo 3 — `/develop`

Acione o **`desenvolvedor`** com o caminho do plano. Ordem do slice vertical: `packages/sdk` → `apps/api` →
`apps/app`/`apps/web` → `packages/internationalization`.

Além das obrigações normais do `/develop`, o prompt carrega três coisas:

- **Se uma decisão do plano estiver errada** — não discutível, **errada** —, corrigir e registrar o desvio
  com destaque, em vez de seguir cegamente.
- **Implementar e validar o caminho degradado** quando houver pré-requisito de infra pendente. É o que a
  maioria dos forks vai ver no primeiro `pnpm dev`, e costuma ser um item do corte. Não travar a entrega
  esperando credencial, **não inventar credencial**.
- **Validação visual obrigatória** se tocar front-end (regra de ouro 11): light + dark + mobile, nos 3
  idiomas, com screenshots. ⚠️ `agent-browser` **estritamente em sequência**.

## Passo 4 — `/review`

Acione o **`revisor-codigo`**. Ele aplica o [`review-checklist.md`](../../docs/review-checklist.md),
**corrige** o que encontra, decide a branch e devolve o plano de commits.

Duas instruções que só existem no modo loop:

- **Não confie no "validado" do `/develop`.** Reverifique você mesmo a afirmação de **maior risco** do
  handoff. Numa rodada, o handoff dava como validado um fallback de imagem que na verdade **derrubava a
  página inteira** — só apareceu porque o revisor não aceitou o screenshot de terceiro. Se o handoff diz
  "X funciona" e X é o coração da feature, **abra o browser e olhe**.
- **Separe os assuntos no plano de commits.** O working tree quase sempre carrega mais de um: o código da
  feature, a auditoria do backlog (`docs(specs)`), correções de documentação (`docs`), e os artefatos da
  feature (`docs(features)`, sempre o **último**). Um commit por app/pacote, na ordem de dependência.

## Passo 5 — `/test`, e o vai-e-volta que fecha o loop

Acione o **`analista-qa`**: critérios de aceite no formato §9.1, testes dos workspaces afetados +
`pnpm test` da raiz, criação dos testes que faltam, e validação executável dirigindo o app.

Duas instruções que a rodada autônoma tende a atropelar, e que custam caro depois:

- **Teste no nível mais barato que prova o comportamento.** Rodada sem ninguém olhando é onde nasce o
  teste caro por precaução. Teste que exige processo externo de pé (emulador, app servindo) só quando a
  **infra for o objeto do teste** — e com o motivo escrito no `report.md`.
- **Devolva as portas.** Ele checa a porta antes de subir; ocupada = reutiliza e não derruba, livre = sobe,
  guarda o PID e mata no fim, **inclusive quando o e2e falha**. Numa rodada autônoma ninguém está na frente
  da tela para perceber processo pendurado — o usuário só descobre no próximo `pnpm dev`. ⛔ Nunca
  `pkill -f node`/`killall node`.

**Três regras de classificação** que evitam relatório enganoso:

| situação | classificação |
|---|---|
| critério verificado e correto | ✅ aprovado |
| critério que falha | ❌ reprovado |
| critério que **ninguém consegue verificar** sem infra externa | 🔒 **não verificado** — nem aprovado, nem reprovado |

Um 🔒 marcado como aprovado é mentira; marcado como reprovado, é alarme falso que some no ruído.

**Se o `/test` achar defeito de produção, ele volta ao `/review`** — retome o mesmo agent (ele tem o diff
em contexto), não abra outro. Defeito de produção **não é** trabalho do QA corrigir, e **não pode** virar
nota de rodapé: isso é o loop deixando de fechar.

⚠️ **A correção que o QA sugere é hipótese, não instrução.** O revisor deve **implementar, medir, e
reverter se não funcionar**. Numa rodada, a correção sugerida não resolvia e a alternativa óbvia era uma
regressão de segurança disfarçada — o desfecho certo foi medir o build de produção, descobrir que o
defeito só existia em `next dev`, e deixar só um teste fixando o contrato.

Ao atingir `--max-rounds` (padrão 2) sem convergir, **pare** e leve o defeito ao usuário no relatório final,
com o repro e o que já foi tentado.

## Passo 6 — Registrar as pendências de infra

Tudo que **exige ação externa** (console de provedor, DNS, cartão de crédito, variável em produção, IAM,
publicar rules) vai para [`docs/PRE-PRODUCTION.md`](../../docs/PRE-PRODUCTION.md) — **não** só no relatório
desta conversa, que o usuário perde ao fechar a janela.

Cada pendência escrita com: **o que fazer** (passo a passo executável, copiável), **por que existe**, **o
que acontece sem ela** (normalmente o modo degradado, que é comportamento projetado), e **como verificar**
que ficou certa.

> **Enquanto estiver nesse arquivo, confira o que ele já afirma.** Nenhum gate lê prosa: `lint`,
> `typecheck` e `test` não têm como saber que um documento descreve como pronto algo que não existe, ou
> como pendente algo já feito. Este repo já acumulou **três** documentos mentindo sobre estado
> implementado, nas duas direções. Se uma afirmação do `PRE-PRODUCTION.md` ou do `SECURITY.md` for barata
> de medir, **meça e corrija** — é a única forma de esse arquivo não apodrecer.

Se a decisão envolver **custo ou escolha de provedor**, use a skill
[`/market-research`](../skills/market-research/SKILL.md) e grave a nota em `specs/research/`, com
`collected`/`revalidate_after`. Preço envelhece; número sem data é boato.

## Passo 7 — Relatório final

Este é o **entregável** do comando. O usuário leu zero mensagens até aqui.

Estruture em seis blocos:

1. **O que rodou** — tabela etapa × resultado. Inclua os **gates medidos** (não copiados) e as transições
   de status do backlog.
2. **O que foi entregue** — a feature, o que ficou de fora do corte, e o estado real (entregue /
   entregue-em-modo-degradado / bloqueada).
3. **Decisões adotadas sem perguntar** — cada uma com a alternativa que **não** foi escolhida e o porquê.
   É o bloco que permite ao usuário desfazer o que não gostar; sem a alternativa escrita, ele não tem como
   discordar de forma informada.
4. **Perguntas que exigem você** — só as de julgamento humano, cada uma com **a resposta recomendada**.
   Agrupe; não faça oito perguntas em sequência.
   > Pergunta que você respondeu pela [`cycle-policy.md`](../cycle-policy.md) **não entra aqui** — ela já
   > foi decidida. E se uma pergunta se repetiu em duas rodadas com a mesma resposta, **proponha a linha
   > de política** que a elimina da próxima vez. É assim que o arquivo cresce: por evidência, não por
   > antecipação.
5. **Pendências** — as de infra (com ponteiro para o `PRE-PRODUCTION.md`, não recopiadas), as de higiene
   (contas de QA, branches mortas, dados de teste), e os **achados** novos que viraram item de backlog.
6. **Plano de commits proposto** — na ordem de dependência, assuntos separados. E a pergunta: **commito?**

**Erros seus vão no relatório.** Se você introduziu uma regressão e outro agent pegou, isso é informação de
primeira ordem sobre a confiabilidade da rodada — e some se você resumir como "corrigido". O valor do
relatório é o usuário saber **onde olhar com desconfiança**.

## Passo 8 — Fechar

Sugira o próximo passo concreto: aprovar os commits, depois `git push`, PR, e **`/cycle` de novo** depois do
merge — a spec entregue sai do backlog e a cadeia de dependências se move.

## Se a sessão cair no meio

Rodada completa é longa e pode esbarrar em limite de sessão. **O estado real está no disco**, não no seu
histórico: `docs/features/<slug>/STATE.md` diz até onde foi, e cada etapa deixou o seu artefato
(`analyze/plan.md`, `develop/handoff.md`, `review/review.md`, `test/`).

Ao retomar: cheque `git status` (nada se perde — o `/cycle` não commita), leia o `STATE.md`, e **retome o
subagent pelo `agentId`** em vez de abrir um novo, se ele ainda existir — o contexto dele vale mais que o
tempo de recarregar.

## Regras

- **Não commite, não pushe, não abra PR, não crie branch.** Branch é do `revisor-codigo`; commit é do
  usuário.
- **Não escreva em `docs/features/`** fora dos artefatos das etapas; não escreva em `specs/` fora do que a
  auditoria manda.
- **Nunca persista credencial** em arquivo versionado. Dados de QA criados → liste no relatório para
  limpeza.
- **Não desative teste** para fazer a suíte passar.
- Tudo em português; `id`/slug/código/commits em inglês.
