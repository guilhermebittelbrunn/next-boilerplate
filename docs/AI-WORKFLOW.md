# Trabalhando com IA neste repo

Este repositório vem integrado com o **Claude Code**. Este guia é o **hub**: o que está configurado e
quando usar cada coisa. O objetivo é que cada fork já nasça com uma base sólida para desenvolvimento
assistido por IA.

> **Vai executar uma tarefa?** O fluxo de trabalho (`/spec → /analyze → /develop → /review → /test`,
> fechando com `/spec --sync`) está em [`TASK-PIPELINE.md`](TASK-PIPELINE.md). Este documento cobre o
> **ferramental**.

## O que está configurado

| Artefato | Caminho | Para quê |
|----------|---------|----------|
| Memória do projeto | [`CLAUDE.md`](../CLAUDE.md) | Lido automaticamente. Mapa do repo, comandos, regras de ouro e ponteiros. **Curto** de propósito. |
| Convenções completas | [`AGENTS.md`](../AGENTS.md) | Fonte de verdade detalhada (API, app, design system/RHF). |
| Regras por escopo | `apps/*/CLAUDE.md`, `packages/CLAUDE.md` | `CLAUDE.md` aninhados, **auto-carregados** ao trabalhar em cada pasta. |
| Regras globais de conduta | `.claude/rules/*.md` | Sempre em contexto: commits/branches e comentários no código. |
| Pipeline de tarefas | [`TASK-PIPELINE.md`](TASK-PIPELINE.md) | Comandos, subagents, `STATE.md`, gates, épicos. |
| Backlog de funcionalidades | [`specs/`](../specs/README.md) | O que **ainda falta** no core, com evidência de mercado e status auditado contra o código. Entrada do ciclo — a spec entregue **sai daqui** e é arquivada em `docs/features/<slug>/spec.md`. |
| Roteiro de análise | [`feature-analysis-guide.md`](feature-analysis-guide.md) | Checklist de tech lead + formato dos critérios de aceite (§9.1). |
| Checklist de revisão | [`review-checklist.md`](review-checklist.md) | **Fonte única** das invariantes que uma revisão cobra. |
| Glossário | [`GLOSSARY.md`](GLOSSARY.md) | Vocabulário do boilerplate (guard, subject, DTO/mapper, slice, modo de produto…). |
| Slash commands | `.claude/commands/*` | `/spec`, `/analyze`, `/develop`, `/review`, `/test`, `/observe`, `/mediate` + `/cycle` (o ciclo inteiro de uma vez). |
| Subagents | `.claude/agents/*` | Os motores do pipeline + o `code-reviewer` read-only. |
| Skills do projeto | `.claude/skills/*` | Procedimentos invocáveis com `/`. |
| Harness | `.claude/settings.json` + `.claude/hooks/` | Permissões, auto-format ao editar, bloqueio de commit em branch protegida. |

Documentação de produto/infra: [`ARCHITECTURE.md`](ARCHITECTURE.md) · [`SETUP.md`](SETUP.md) (env) ·
[`SECURITY.md`](SECURITY.md) · [`PAYMENTS.md`](PAYMENTS.md) · [`AUTH-SSO.md`](AUTH-SSO.md).

## Subagents (`.claude/agents/`)

| Agent | Papel |
|-------|-------|
| `estrategista-produto` | Descobre e especifica o que vale construir → `specs/<id>.md` + `specs/BACKLOG.md`. |
| `planejador-tarefa` | Analisa e planeja (PO + Tech Lead) → `analyze/plan.md`. |
| `desenvolvedor` | Implementa o slice vertical → `develop/handoff.md`. |
| `revisor-codigo` | Revisa e corrige o diff, **dono da branch**, propõe os commits → `review/review.md`. |
| `analista-qa` | Roda/cria testes, critérios de aceite e validação e2e → `test/`. |
| `observador-tarefa` | Observação final em linguagem de negócio → `observacao.md`. |
| `mediador-pr` | Triagem de comentários de PR → `pr-review/pr-<n>.md`. |
| `code-reviewer` | Revisão **read-only** avulsa ("revise o diff"), sem tocar em arquivos nem em branch. |

`code-reviewer` e `revisor-codigo` aplicam o **mesmo** [`review-checklist.md`](review-checklist.md) — a
diferença é que o primeiro só relata e o segundo corrige, resolve a branch e monta os commits.

## Skills do projeto

Digite `/` no Claude Code para invocar. Cada skill encapsula o passo a passo já alinhado às convenções.

### Criadas para este repo (descoberta)

- **`/market-research`** — pesquisa de mercado **com fontes** para decidir se uma feature merece entrar no
  core: hierarquia de fontes (lei/regulador > doc de provedor > página do produto > blog **nunca**),
  **prevalência** medida sobre um painel declarado ("7 de 11"), ceticismo sobre hype e **custo herdado por
  todo fork**. Grava nota citável em `specs/research/<topico>.md` com `collected`/`revalidate_after`.
- **`/spec-audit`** — reconcilia `specs/` com a realidade do **código** (não com o `status` gravado):
  confere o corte de MVP de cada spec, cruza com `docs/features/*/STATE.md`, aplica transições, detecta
  **deriva** e regressão, e regrava o `BACKLOG.md`. É o motor do `/spec --sync` — o passo que fecha o loop.

### Criadas para este repo (scaffolding)

- **`/new-crud`** — scaffold de um **CRUD vertical completo** (SDK → API → hooks → UI → i18n), seguindo o
  recurso de referência `entity`. Use para "criar o recurso X de ponta a ponta".
- **`/new-api-route`** — cria uma **rota HTTP** em `apps/api` (validação Zod, guard, repositório+mapper
  Firestore, `error.code` traduzível). Use para endpoints isolados.
- **`/i18n-sync`** — adiciona/valida **chaves de tradução** nos 3 idiomas (pt-br/en/es) + `apiErrors`, com
  teste de paridade determinístico (`pnpm --filter @repo/internationalization test`). Use sempre que criar
  texto de UI ou um código de erro novo.
- **`/payments-flow`** — implementa/estende o **fluxo de assinatura Stripe** (planos, checkout, portal de
  cobrança, webhook). Ver [`PAYMENTS.md`](PAYMENTS.md).
- **`/write-tests`** — escreve **testes Vitest** (schema, mapper, rota da API, hook, componente) no setup do
  repo, com mocks de SDK/Firebase.

`new-crud` compõe `new-api-route` e `i18n-sync` automaticamente nas etapas correspondentes.

### Baixadas da comunidade (orientação)

Instaladas via `npx skills add ...` e **movidas para `.claude/skills/`** para o Claude descobri-las e
auto-acioná-las (a pasta `.agents/skills/` original não é varrida pelo Claude Code):

- **`agent-browser`** — automação de browser (CDP) para navegar, preencher, clicar, **tirar screenshots** e
  testar o app. Base da validação visual descrita abaixo. É um stub de descoberta: carregue o uso real com
  `agent-browser skills get core` (e `... get dogfood` para QA exploratório). Requer instalação global:
  `npm i -g agent-browser && agent-browser install`.
- **`vercel-react-best-practices`** — 70 regras de performance React/Next da Vercel (waterfalls, bundle,
  RSC, re-render). Auto-aciona ao escrever, revisar ou refatorar componentes/data fetching.
- **`frontend-design`** — direção de design visual (paleta, tipografia, layout) para UI distintiva,
  não-templated. Mais útil na `apps/web` e em telas novas.
- **`web-design-guidelines`** — revisão de código de UI contra Web Interface Guidelines (acessibilidade,
  UX). Use em "revise minha UI / cheque acessibilidade".
- **`copywriting`** — escrita/melhoria de copy de marketing (hero, headline, CTA, pricing) — `apps/web`.
- **`brainstorming`** — transforma uma ideia em design/spec via diálogo, **antes** de codar. Tem um
  `HARD-GATE`: não implementa nada até apresentar o design e você aprovar. Use ao iniciar features/
  componentes novos.
- **`ui-ux-pro-max`** — base de design UI/UX consultável (estilos, paletas, pares de fonte, guidelines de
  UX, tipos de gráfico) com recomendações por stack. Complementa `frontend-design` (direção) com referência
  estruturada.
- **`seo-audit`** — auditoria de SEO técnico/on-page (meta tags, Core Web Vitals, indexação, queda de
  tráfego). Voltada à `apps/web`.
- **`ai-seo`** — otimização para **AI search** (AEO/GEO/LLMO): ser citado por AI Overviews, ChatGPT,
  Perplexity, Claude, Gemini. Complementa `seo-audit` e `copywriting`.

> Para baixar mais skills da comunidade: rode `npx skills add <repo> --skill <nome>` e **mova a pasta
> resultante de `.agents/skills/<nome>` para `.claude/skills/<nome>`** (é lá que o Claude Code descobre
> skills do projeto).

## Validação visual com `agent-browser` (obrigatória)

**Política** (regra de ouro 11): todo fluxo que toca front-end (`apps/app`, `apps/web`,
`packages/design-system`) **e** toda entrega de código passam por validação visual. Front-end não é
"pronto" só porque compila e o lint passa.

Como validar:

1. Suba o app afetado: `pnpm --filter app dev` (3000) / `pnpm --filter web dev` (3001) — e
   `pnpm --filter api dev` (3002) quando o fluxo carrega dados.
2. Carregue o workflow da skill: `agent-browser skills get core` (e `... get dogfood` para QA
   exploratório/bug hunt).
3. Abra o app e **percorra os fluxos tocados** pela mudança: navegue, preencha formulários, dispare as
   ações, **observe o resultado**.
4. **Tire screenshots** e confira: layout, estados de erro/vazio, **responsividade** (mobile + desktop) e
   **tema** (light/dark/system). O `Table` é antd — confirme que respeita o tema.
5. ⚠️ **Rode os comandos do `agent-browser` estritamente em sequência.** Chamadas concorrentes travam o
   daemon e os screenshots passam a sair da aba errada, silenciosamente.
6. Registre o que foi validado (telas/fluxos + screenshots) e qualquer regressão. Se o `agent-browser` não
   estiver instalado, **sinalize** que a validação não foi feita — não conte como aprovado.

Os agents `desenvolvedor`, `revisor-codigo`, `analista-qa` e `code-reviewer` já executam esse passo quando
o diff é de front-end.

## Skills globais úteis

- **`/code-review`** — revisão de diff de propósito geral (bugs + simplificação). Usada dentro do
  `/review`.
- **`/security-review`** — revisão de segurança das mudanças pendentes (importante para auth/pagamentos).
- **`/verify`** e **`/run`** — sobem o app e confirmam que uma mudança funciona de verdade.

## Harness (`.claude/settings.json`)

- **Permissões**: allowlist dos comandos rotineiros do repo (`pnpm check/fix/test/dev`, `turbo`,
  `pnpm --filter ...`, `git` read-only, `agent-browser`) para reduzir prompts.
- **Hook de formatação** (`PostToolUse`): a cada `Edit/Write`, o `.claude/hooks/format-edited-file.sh` roda
  `biome check --write` **apenas no arquivo editado**. É não-bloqueante (sempre sai com 0).
  ⚠️ Ele **apaga imports não usados** — ao adicionar um import antes do uso, escreva os dois juntos.
- **Hook de proteção de branch** (`PreToolUse`): o `.claude/hooks/block-protected-branch-write.sh` nega
  `git commit` em `main`/`master`/`production`/`production-backup`, `git push` para uma dessas branches e
  qualquer `git push --force`. É rede de segurança para
  [`.claude/rules/git-commits.md`](../.claude/rules/git-commits.md), não substituto da verificação
  proativa.
- **Typecheck**: não roda por hook (custo alto por edição). Rode `pnpm turbo run lint typecheck test`
  antes de concluir — os três gates de uma vez, cacheados, e é o que o CI vai rodar de qualquer jeito.
- **Rede de segurança fora da máquina**: o hook de branch e a disciplina de rodar os comandos existem só no
  clone com o ferramental de IA. Quem garante lint/tipos/testes em toda PR é o
  [`ci.yml`](../.github/workflows/ci.yml) — inclusive num fork sem nada disso instalado.
- `.claude/settings.local.json` é pessoal e **não** vai para o git.

> ⚠️ Os dois hooks e todos os comandos `pnpm` dependem de `node_modules` **no workspace atual**. Em
> workspaces do Conductor isso é resolvido pelo `scripts.setup` de
> [`.conductor/settings.toml`](../.conductor/settings.toml) — ver a seção Conductor em
> [`SETUP.md`](SETUP.md). Fora dele, rode `pnpm install` antes de pedir validação a um agent.

## Regras sempre em contexto (`.claude/rules/`)

Estes arquivos são carregados em toda sessão — por isso são curtos:

- [`git-commits.md`](../.claude/rules/git-commits.md) — branch protegida, padrão de branch/commit, um commit
  por app, push só com aprovação.
- [`code-comments.md`](../.claude/rules/code-comments.md) — o padrão é não comentar; e **nunca** referenciar
  o fluxo de agents no código, mesmo `docs/features/` estando versionado (o ponteiro apodrece; o comentário
  tem de ser autossuficiente).

## Fluxo recomendado para uma feature

Formal, com rastreio em disco → use o [pipeline](TASK-PIPELINE.md):
`/spec → /analyze → /develop → /review → /test` (+ `/observe`), fechando com `/spec --sync`.

Autônomo, quando você não vai acompanhar → **`/cycle`** (abaixo).

Informal, para mudanças pequenas:

1. Descreva o recurso. Se for CRUD, peça `/new-crud`.
2. As regras do escopo (`apps/*/CLAUDE.md`, `packages/CLAUDE.md`) carregam automaticamente; aponte o
   recurso de referência `entity`.
3. Ao concluir: `pnpm turbo run lint typecheck test` — é o mesmo comando que o CI roda em toda PR
   ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)), cobre lint, tipos, testes e a paridade de
   i18n de uma vez, e é cacheado. (⚠️ `turbo build` depende de `test`, e o `build` **não** está no CI.)
4. **Se tocou front-end**: valide visualmente com `agent-browser` (fluxos, screenshots, responsivo + tema).
5. Passe o agente `code-reviewer` (ou `/code-review`) no diff. Para mudanças sensíveis (auth, pagamentos,
   dados), rode `/security-review`.

## `/cycle` — o ciclo inteiro numa tacada

[`/cycle`](../.claude/commands/cycle.md) roda `/spec --sync`, escolhe a próxima spec do
[`BACKLOG.md`](../specs/BACKLOG.md) e a leva por `/analyze → /develop → /review → /test` **sem parar para
perguntar**. Existe para uma situação específica: **você não vai estar na frente da tela**.

```bash
/cycle                      # audita o backlog e ataca a spec recomendada
/cycle cursor-pagination    # força uma spec específica (vence a recomendação, mas registra a divergência)
/cycle --audit-only         # só o /spec --sync
/cycle --max-rounds 3       # teto do vai-e-volta /test ↔ /review (padrão 2)
```

**O que ele faz com as perguntas.** Onde o `/analyze` ou o `/develop` parariam, ele decide nesta ordem: a
recomendação da **spec** → o **padrão vigente no repo** → a opção de **menor raio de impacto**. Cada decisão
vai para o relatório final **com a alternativa que não foi escolhida** — é isso que permite você desfazer o
que não gostar. Só chegam até você as perguntas de **julgamento humano** (aprovar spec, adotar serviço pago,
mudar prioridade), agrupadas e com resposta recomendada.

**O que ele não faz.** ⛔ **Não commita, não pusha, não abre PR, não cria branch.** Ele deixa o working tree
pronto e apresenta o plano de commits. Rodar o `/cycle` **não é** aprovação de commit
([`git-commits.md`](../.claude/rules/git-commits.md)).

**Onde as pendências ficam.** Tudo que exige ação externa (console de provedor, DNS, cartão, IAM, variável
em produção) é escrito em [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md) — com o passo a passo, o que acontece sem
aquilo, e como verificar. O relatório da conversa some quando você fecha a janela; o arquivo não.

### Por que ele é desconfiado de propósito

Três comportamentos do `/cycle` parecem paranoia e são cicatriz de rodada real:

- **Cada etapa reverifica a afirmação de maior risco da anterior.** Um handoff já deu como validado um
  fallback de imagem que na verdade **derrubava a página inteira** — apareceu porque o revisor não aceitou o
  screenshot de terceiro. Se a etapa anterior diz "X funciona" e X é o coração da feature, a seguinte abre o
  browser e olha.
- **Defeito de produção achado no `/test` volta ao `/review`**, não vira nota de rodapé — e a correção que o
  QA sugere é tratada como **hipótese**: o revisor implementa, **mede**, e reverte se não funcionar. Numa
  rodada a correção sugerida não resolvia e a alternativa óbvia era uma regressão de segurança disfarçada.
- **Critério que ninguém consegue verificar sem infra externa fica 🔒 "não verificado"** — nem aprovado
  (seria mentira), nem reprovado (seria alarme falso que some no ruído).

### Limites honestos

- Uma rodada completa é **cara e longa**, e pode esbarrar em limite de sessão. Nada se perde: o estado vive
  no `STATE.md` e nos artefatos de cada etapa. Ao retomar, retome o **subagent pelo `agentId`** em vez de
  abrir outro.
- Ele **não** substitui os comandos individuais. Quem acompanha de perto deve rodar um a um — o feedback
  chega mais cedo e sai mais barato. `/cycle` troca interatividade por autonomia, conscientemente.
- O nome é `/cycle` e não `/loop` de propósito: **`/loop` é um comando embutido** do Claude Code (agenda um
  prompt em intervalo recorrente). São coisas diferentes e o nome ficaria ambíguo — inclusive porque os dois
  se combinam (veja abaixo).

## Rodar várias features em paralelo

O gargalo do desenvolvimento paralelo **não é** agendamento, é escolher specs que não brigam. Duas coisas
governam isso, e elas são diferentes:

| campo | pergunta que responde | exemplo |
|-------|----------------------|---------|
| `depends_on` | "pode ser feito **antes**?" | `account-settings` precisa de `file-upload-storage` entregue |
| `contends_on` | "pode ser feito **ao mesmo tempo**?" | `cursor-pagination` e `audit-log` alteram as duas o `base.repository.ts` |

`depends_on` vazio **não** significa paralelizável. O `/spec --sync` calcula os **lotes paralelos** a partir
do `contends_on` e escreve a tabela no [`BACKLOG.md`](../specs/BACKLOG.md) — é de lá que você tira o que
rodar junto.

**A regra de processo que evita estrago:** só **um** workspace roda a auditoria (`/cycle --audit-only` ou
`/cycle` normal); todos os outros rodam `/cycle <id> --no-audit`. Senão três agents reescrevem o
`BACKLOG.md` ao mesmo tempo e você acorda com um conflito de 68 KB.

```bash
# workspace A (o que audita)
/cycle
# workspaces B e C
/cycle dashboard-home --no-audit
/cycle cookie-consent --no-audit
```

Lote disjunto em `contends_on` **reduz** conflito, não elimina: duas features ainda podem brigar num arquivo
que nenhuma das duas previu. E o teto prático é **3 specs** — acima disso o custo em tokens e a revisão
humana no dia seguinte deixam de compensar.

## Agendar o ciclo (trabalho noturno)

Configuração declarativa em [`.claude/cycle-schedule.jsonc`](../.claude/cycle-schedule.jsonc): horário,
workspace, comando, modelo e esforço por job. Quem lê o arquivo é
[`scripts/cycle-runner.sh`](../scripts/cycle-runner.sh), que invoca o Claude Code em modo headless
(`claude -p`) dentro do workspace certo.

```bash
scripts/cycle-runner.sh --list          # mostra os jobs configurados
scripts/cycle-runner.sh --dry-run nightly-1   # imprime o comando sem executar
scripts/cycle-runner.sh nightly-1       # roda agora
scripts/cycle-runner.sh --install       # instala os jobs no launchd (macOS)
```

**O que funciona e o que não funciona**, sem ilusão:

- O `/loop` embutido e o `CronCreate` vivem **na sessão**: morrem quando você fecha o Claude Code e só
  disparam com o REPL ocioso. Servem para "daqui a 2h faça X" na mesma sessão — **não** para trabalho
  noturno.
- O que sobrevive a você fechar o terminal é o **launchd** (macOS) chamando o runner. O Mac precisa estar
  **ligado e acordado** — o runner usa `caffeinate` enquanto roda, mas não acorda uma máquina suspensa.
  Agende com a tampa aberta ou com "Prevent sleep" ligado.
- O runner escreve **dentro do workspace do Conductor**, na branch dele. De manhã você abre o Conductor,
  vê o diff e revisa normalmente — é o mesmo fluxo de sempre, só que o trabalho já estava lá.
- ⛔ O runner roda o `/cycle`, que **não commita**. Você acorda com working tree sujo e um plano de commits,
  não com commits que ninguém revisou. É deliberado.

Cada execução deixa log em `.claude/cycle-logs/<job>-<data>.log` (gitignored). Comece com **`--dry-run`**,
depois um job só, e só então paralelize.

## Mantendo a base de IA saudável

- **Rode `/spec --sync` ao fim de cada entrega.** É o passo que impede o backlog de virar ficção: ele
  confere no código o que foi entregue, em vez de acreditar no `status` gravado. Backlog que ninguém audita
  é pior que backlog nenhum, porque parece confiável.
- Nota de pesquisa vencida (`revalidate_after`) → revalide **só o que mudou** (preço, versão, prevalência),
  não a nota inteira.
- Atualize o `CLAUDE.md` (regras de ouro / mapa) quando uma convenção mudar — mas mantenha-o **curto**,
  deixando o detalhe em `AGENTS.md` e nos `CLAUDE.md` aninhados.
- Invariante nova que a revisão deve cobrar → entra em [`review-checklist.md`](review-checklist.md)
  (**um** lugar; os dois revisores leem de lá).
- Padrão novo reutilizável → considere transformá-lo em skill (`.claude/skills/<nome>/SKILL.md`).
- Ao herdar este boilerplate num fork: revise os nomes de exemplo (`entity`), os valores neutros do
  dicionário e substitua os exemplos do [`GLOSSARY.md`](GLOSSARY.md) pelo vocabulário do seu produto.
