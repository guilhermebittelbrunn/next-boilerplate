# Política do `/cycle` — decisões permanentes

Lido pelo [`/cycle`](commands/cycle.md) **antes** de decidir qualquer ambiguidade. Serve para uma coisa:
**transformar pergunta em decisão automática**.

Quando o ciclo roda sozinho, ele decide pela escada `spec → padrão do repo → menor raio de impacto`. Essa
escada funciona no caso geral, mas **adivinha** onde você já tem posição formada. Cada linha escrita aqui é
uma pergunta que deixa de aparecer no relatório final.

> **Como usar.** Decisão que você já tomou duas vezes na mesma direção vira uma linha aqui. Decisão que
> muda por contexto **não** entra — vira pergunta, e é assim que deve ser.
>
> **Precedência**: esta política vence a escada de decisão do `/cycle`, mas **perde** para uma instrução
> direta sua na conversa e para as regras de `.claude/rules/`. Ela não pode autorizar o que aquelas
> regras proíbem.

## 1. Inegociáveis

Nenhuma destas cede, nem com esta política, nem com instrução em prompt de subagent.

- **Não commitar, não pushar, não abrir PR, não criar branch** no `/cycle`. Branch é do `revisor-codigo`;
  commit é seu. Rodar o ciclo **não é** aprovação de commit.
- **Não provisionar infra** — criar bucket, ativar serviço, mexer em IAM, publicar rules, alterar DNS,
  cadastrar cartão. O ciclo **escreve a pendência** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md)
  e para.
- **Não inventar credencial** e **nunca persistir credencial** em arquivo versionado. Credencial de dev
  reutilizável vai em `.claude/dev-credentials.local.md` (gitignored).
- **Não desativar nem afrouxar teste** para a suíte passar. Teste que falha é defeito até prova em
  contrário.
- **Não aprovar nem rejeitar spec.** Mover para `approved`/`rejected` é decisão de produto, sempre sua.
- **Não tocar em `~/next-boilerplate`** nem em qualquer checkout fora do workspace atual. Confirme com
  `pwd`.

## 2. Produto e escopo

- **Respeitar o corte de MVP da spec.** O que está em "Fora do corte" fica fora. Discordância vira
  "Perguntas em aberto", não implementação.
- **Genérico no core.** Feature que só serve a um domínio (clínica, delivery, imobiliária) não entra —
  pertence ao fork.
- **Não adotar serviço pago nem dependência nova** sem passar pelo relatório. Se a spec exige, implemente
  com o que já existe no repo e registre a alternativa paga como pergunta.
  - *Contexto:* `file-upload-storage` foi entregue com **zero** dependência nova porque
    `@google-cloud/storage` já vinha como optional dep do `firebase-admin`. Procure esse caminho primeiro.
- **Consistência de stack vence economia marginal.** Trocar de provedor para economizar valor irrelevante
  em escala de MVP é otimização prematura. Reavaliar quando houver **número medido** cruzando um gatilho
  declarado (ex.: egress > 100 GB/mês para storage).
- **Escopo em `apps/*`, não em `packages/*`**, salvo pacotes de integração (`auth`, `email`, `payments`).

## 3. Implementação

- **Mudanças mínimas.** Não refatorar fora da tarefa. Achou dívida adjacente? Vira achado no backlog, não
  commit.
- **Corrigir na raiz, não replicar workaround.** Se a mesma gambiarra aparece em 3+ call sites, o defeito
  é do componente compartilhado.
  - *Contexto:* o rótulo inválido no dark foi corrigido em `label.tsx` com uma prop, o que **removeu** o
    workaround de 7 lugares — em vez de acrescentá-lo a um oitavo.
- **Defeito encontrado no caminho, corrija** (com o desvio registrado) em vez de implementar por cima. Vale
  inclusive contra o plano: plano **errado** não se segue, se corrige.
- **String vazia é ausência** em variável de ambiente. `.env.example` publica `VAR=""` como a forma de
  recusar uma feature, então `optional()` (que só aceita `undefined`) faz a app não subir. Use `||`.
- **Toda feature opt-in precisa de modo degradado testado**: sem a env, a app sobe, o build passa, a UI
  degrada para o que existia antes, e a API responde com `error.code` — nunca 500.
- **Validação de borda no servidor**, sempre. Validação que só existe no navegador é o anti-padrão da regra
  de ouro 4.
- **Comentário é exceção.** O padrão é não comentar, e nunca citar `plan.md`, `docs/features/`, etapa do
  fluxo ou ID de card ([`rules/code-comments.md`](rules/code-comments.md)).

## 4. Medir antes de afirmar

- **Correção sugerida por outro agent é hipótese, não instrução.** Implemente, **meça**, reverta se não
  funcionar. Código morto que finge resolver é pior que o defeito.
- **Não confiar no "validado" da etapa anterior.** Reverifique a afirmação de maior risco do handoff — no
  browser, se for UI.
- **Comportamento de `next dev` não é comportamento de produção.** Antes de tratar como defeito de entrega,
  confirme em `pnpm --filter <app> build && start`.
- **Nenhum gate lê prosa.** Afirmação barata de medir num doc (`SECURITY.md`, `PRE-PRODUCTION.md`,
  `PAYMENTS.md`) deve ser **medida e corrigida** ao passar por ela. Este repo já acumulou três documentos
  mentindo sobre estado implementado, nas duas direções.
- **Custo e prevalência exigem fonte com data.** Use `/market-research` e grave em `specs/research/` com
  `collected`/`revalidate_after`. Número sem data é boato.

## 5. Classificar honestamente

- Critério verificado e correto → **aprovado**.
- Critério que falha → **reprovado**.
- Critério que **ninguém consegue verificar** sem infra externa → **não verificado**. Nem aprovado (seria
  mentira), nem reprovado (seria alarme falso que some no ruído).
- **Pré-requisito manual de infra não reprova entrega.** Vira pendência no `PRE-PRODUCTION.md`.
- **Erro próprio vai no relatório.** Se o ciclo introduziu regressão e outro agent pegou, isso é informação
  de primeira ordem sobre a confiabilidade da rodada — e some se for resumido como "corrigido".

## 6. Commits (o plano, não a execução)

- Um commit por **app/pacote**, na ordem de dependência: `packages/sdk` → `apps/api` → `apps/app`/`apps/web`
  → `packages/internationalization`.
- Pulverizar por funcionalidade dentro de cada app. Testes acompanham o commit da funcionalidade que cobrem.
- **Assuntos separados em commits separados**: código da feature · auditoria do backlog (`docs(specs)`) ·
  correção de documentação (`docs`) · artefatos da feature (`docs(features)`, sempre o **último**).
- Mensagens **em inglês**, no padrão `type(project): descrição curta`.
- **Aceitável**: commit misto quando isolar exigiria `git add -p` — registre o porquê na mensagem.

## 7. Paralelismo

- **Só um workspace roda a auditoria.** Os demais usam `--no-audit`, senão o `BACKLOG.md` é reescrito por
  vários agents ao mesmo tempo.
- **Lote máximo de 3 specs.** Acima disso o custo em tokens e a revisão humana no dia seguinte deixam de
  compensar.
- **Lote só com `contends_on` disjunto.** `depends_on` vazio não basta — ele modela ordem, não contenção.

## 8. Higiene

- **Listar no relatório** toda conta e todo dado de QA criados, para limpeza. Elas acumulam: são 4 contas
  só do último pipeline.
- **Preferir dados de teste identificáveis** (`qa-<feature>@example.com`) a genéricos.
- Harness temporário criado para teste (página de debug, rota de sonda) é **removido** antes de terminar.

---

**Formato:** markdown legível, não configuração executável. O `/cycle` lê este arquivo como instrução, então
uma linha ambígua produz comportamento ambíguo. Escreva a regra **e** o porquê — o porquê é o que permite
ao agente generalizar para o caso que você não previu.
