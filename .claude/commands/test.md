---
description: QA unificado e única etapa que executa o produto — gera os critérios de aceite (formato §9.1), roda os testes Vitest dos workspaces afetados (+ pnpm test do root, que gateia o build) e valida o fluxo ponta a ponta dirigindo o app com agent-browser, com screenshots em test/e2e/. Foco opcional; por padrão usa as mudanças atuais + a feature mais recente.
argument-hint: "[opcional: slug/foco | 'manual' | --force]"
allowed-tools: Agent, AskUserQuestion, Read, Write, Edit, Grep, Glob, Bash, Skill
---

# /test

Foco (opcional): **$ARGUMENTS**

Você é o orquestrador (loop principal) do papel **Analista de QA**. Este comando **unifica** geração de
critérios de aceite + execução de testes + validação executável.

**É a única etapa do pipeline que executa o produto.** O `/develop` faz smoke e não guarda nada; o
`/review` roda gates estáticos e lê código. Subir app, dirigir `agent-browser`, tirar screenshot e rodar a
suíte são seus — e a evidência que sobrevive é o **texto** do `test/report.md`, não o print (§7 de
[`docs/review-checklist.md`](../../docs/review-checklist.md)).

## Regras de escrita (`humanizer` + `caveman`)

Regra em [`.claude/rules/writing-skills.md`](../rules/writing-skills.md); as skills estão no
`allowed-tools`.

- **`caveman` no que chega até o usuário**: pass/fail, lacunas, status por critério, próximo passo. Estilo
  restrito a este comando — **não** fixe o modo na sessão. Saia do estilo para avisar estado de dev
  alterado (dado criado/apagado) e para o roteiro manual, onde a ordem dos passos é o conteúdo.
- **`humanizer` no que vira arquivo**: `test/criterios-aceite.md` e `test/report.md`, incluindo o que você
  acrescentar a eles depois do subagent. O formato §9.1 manda; a skill ajusta o texto dentro dele.
- **Repita as regras no prompt do `analista-qa`.**

## Passo 0 — Determinar o foco e checar o gate (argumento é opcional)

> **Não carregue o diff nem os artefatos na sua própria janela.** Quem lê o diff completo, o handoff, o
> review e o plano é o subagent `analista-qa`, uma única vez. O orquestrador só **detecta** o escopo,
> **checa o gate** e **repassa caminhos**.

1. Escopo alterado: rode **apenas** `git diff --name-only`. **Não rode `git diff` completo aqui.**
2. Localizar a feature: se `$ARGUMENTS` trouxer **slug/caminho**, use-o; senão, a mais recente por
   `ls -t docs/features/*/STATE.md 2>/dev/null | head -1` → `dirname`. Guarde os **caminhos** do
   `develop/handoff.md`, do `review/review.md` e do `analyze/plan.md` — **não leia o conteúdo aqui**.
3. **Gate sequencial — exige `review` concluído.** Leia o `STATE.md` e confirme `review = done` (sinal
   alternativo: existência de `review/review.md`). Se faltar, **PARE** e sugira rodar `/review`.
   - **Bypass**: `$ARGUMENTS` com `--force`/`--skip-gate` prossegue e registra o bypass em "Notas".
4. `$ARGUMENTS` pode conter: um caminho a focar, uma descrição, e/ou a palavra **`manual`** para já incluir
   o roteiro de teste manual sem perguntar.
5. Determine o `<slug>` da feature para salvar a saída em `docs/features/<slug>/test/`.

## Passo 1 — Acionar o motor (critérios + testes)

Invoque o subagent **`analista-qa`** (Agent tool, `subagent_type: "analista-qa"`), repassando a **lista de
arquivos alterados**, os **caminhos** do `develop/handoff.md`, do `review/review.md` e do plano, o caminho
da pasta da feature, e o foco. Instrua-o a **ler ele mesmo o diff, o handoff e o review** — não cole esse
conteúdo no prompt. Peça para, **na mesma execução**:

- **Começar pela lista "Verificar no `/test`"** do `review/review.md`, mais o que o handoff marcou como
  "a verificar". Afirmação herdada é **hipótese**, não critério aprovado: ou ele mede, ou o critério fica
  **🔒 não verificado**. Cada item volta com veredito — confirmado, derrubado ou impossível de medir sem
  infra externa. Em 15 das 17 features entregues o handoff afirmou algo que a etapa seguinte derrubou;
- **Gerar os critérios de aceite** no formato **§9.1** de
  [`docs/feature-analysis-guide.md`](../../docs/feature-analysis-guide.md) e salvar em
  `docs/features/<slug>/test/criterios-aceite.md`;
- **Rodar os testes**: a suíte deste repo é pequena, então **rode inteira** a dos workspaces afetados
  (`pnpm --filter app test`, `pnpm --filter api test`) e **sempre** feche com
  `pnpm test` no root — `turbo build` **depende de `test`**, é isso que se está antecipando. Se o diff
  tocou i18n ou adicionou `error.code`, rode também
  `pnpm --filter @repo/internationalization test` (paridade dos 3 idiomas). Mais
  `pnpm --filter <app> typecheck` nos apps afetados. **Sem `--force`**: o cache do turbo vale aqui, o gate
  com cache sai em ~300 ms contra ~50 s e o número é idêntico — reserve o `--force` para quando suspeitar
  de cache sujo, e diga no relatório por que suspeitou;
- **Criar os testes que faltam** (skill `/write-tests`), cobrindo caminho feliz e **cada** caminho de erro
  — validação, não encontrado, sem permissão e **ownership de outro usuário (404)** — sempre no **nível
  mais barato que prova o comportamento**. Schema, mapper, hook e rota com `vi.mock` do repositório e do
  guard já cobrem tudo isso. Teste que exige **processo externo de pé** (emulador do Firebase em
  9099/8080, app servindo) só quando o objeto do teste for a **própria infra**: consulta real que depende
  de índice, `firestore.rules`, serialização `Timestamp` contra o documento. Se a rota já tem teste e o
  contrato de infra não mudou, **rodar o que existe** vale mais que somar cenário. Cada decisão dessas vai
  registrada no `report.md`;
- **Dar veredito às lacunas de teste herdadas** do `review/review.md`: cada uma sai como **fechada** (o
  teste foi criado), **aberta** (fica como follow-up, com o motivo) ou **fora de escopo** (com a razão).
  Copiar a lacuna adiante sem veredito é o que a faz atravessar o pipeline inteira sem dono;
- **Validação executável** dirigindo o app com `agent-browser`, quando houver fluxo de usuário (Passo 4);
- **Gravar os artefatos**: `test/criterios-aceite.md` e `test/report.md` são **entregáveis obrigatórios do
  pipeline**, escritos direto com a ferramenta `Write`. A diretriz genérica de "não criar arquivo de
  relatório" **não se aplica a eles** — ela já bloqueou a gravação em 5 features, que terminaram sem
  registro nenhum;
- Ao final, atualizar o `STATE.md` (`test = done`; `blocked` se algum teste falhar).

> O `analista-qa` **não cria branch, não nomeia branch e não commita** — isso é do `revisor-codigo`
> (`/review`). Se ele reportar que está numa branch protegida, **pare**: rode o `/review` para criar a
> branch antes de qualquer commit dos testes gerados.

## Passo 2 — Apresentar

Mostre, juntos: o veredito de cada item da lista **"Verificar no `/test`"**, o resultado dos testes
(pass/fail + lacunas, cada lacuna herdada com seu veredito), o checklist de critérios de aceite **com o
status por item** (✅ aprovado · ❌ reprovado · 🔒 não verificado) e o resultado do `pnpm test` do root.

Critério que ninguém conseguiu medir sem infra externa fica **🔒 não verificado** — nem aprovado, nem
reprovado. Marcá-lo como aprovado é mentira; como reprovado, é alarme falso que some no ruído.

## Passo 3 — Critérios/teste manual (sob demanda)

Se `$ARGUMENTS` contiver `manual`, **já inclua** no `test/criterios-aceite.md` o **roteiro de teste manual**
passo a passo (inputs → resultado esperado). Caso contrário, **pergunte** (`AskUserQuestion`) se deseja
gerar esse roteiro também.

## Passo 4 — Validação executável end-to-end (com confirmação)

O objetivo é **acessar o app rodando e percorrer o fluxo como usuário**, não só buildar. Se fizer sentido,
**pergunte antes** (`AskUserQuestion`) — especialmente se puder alterar estado real.

**Uma passada, bem feita.** O pipeline inteiro tem direito a uma única sessão de browser, e ela é esta —
o `/develop` e o `/review` não abrem outra. Então vale gastar tempo nela: o fluxo de ponta a ponta, os
estados de erro e vazio, light + dark + mobile.

**E nenhuma quando não há o que dirigir.** Diff que só toca teste, documentação, `specs/` ou tooling não
tem superfície de runtime — subir o app ali é custo sem achado. Pule e registre o motivo no `report.md`.

Ao autorizar, instrua o `analista-qa` a:

- **checar a porta antes de subir qualquer coisa** (`lsof -ti tcp:3000`): ocupada = o ambiente é seu,
  ele **reutiliza e não derruba**; livre = ele sobe, guarda o PID e **mata no final** — inclusive quando o
  e2e falha ou é abortado. ⛔ Nunca `pkill -f node`/`killall node`, que derrubaria seu editor e os outros
  workspaces. Portas em jogo: 3000 `app` · 3001 `web` · 3002 `api` · 3003 `email` · 9099 Auth · 8080
  Firestore · 4001 UI do emulador;
- subir `pnpm --filter api dev` (3002) + `pnpm --filter app dev` (3000) / `pnpm --filter web dev` (3001);
- usar a skill **`agent-browser`** (`agent-browser skills get core`) — **não** instalar Playwright por
  conta própria;
- **dirigir o app de fato**: navegar, preencher, submeter e **observar o resultado** — não parar em
  "compilou e serviu";
- conferir **light + dark + mobile** e salvar **todos** os screenshots em
  `docs/features/<slug>/test/e2e/` com nomes ordenados;
- ⚠️ rodar os comandos do `agent-browser` **estritamente em sequência** (chamadas concorrentes travam o
  daemon e os screenshots saem da aba errada).

**Credenciais de DEV**: se o fluxo exigir login, **pergunte ao usuário** (`AskUserQuestion`) e repasse ao
agente. Usar **apenas em dev**. ⛔ **Nunca persista credenciais em arquivo versionado** — se o usuário
quiser reuso entre rodadas, oriente-o a colocá-las em `.claude/dev-credentials.local.md` (gitignored).

Caso não seja autorizado ou não haja como dirigir o app, fique no roteiro manual e registre o motivo.

Ao receber o retorno, **confirme que as portas voltaram**: se o agent subiu algo, o `report.md` tem de
dizer o que ele subiu, o que reutilizou e que derrubou o que era dele. Se ele não mencionar, cheque
(`lsof -ti tcp:3000`) e peça o teardown antes de fechar o comando.

## Passo 5 — Cross-check

Liste os ambientes a conferir quando a mudança os afetar: `apps/app` × `apps/web`, comum × admin ×
impersonação, `subscription` × `simple`, mobile × desktop, light × dark, e os 3 idiomas. Registre os
follow-ups.

**Não escreva no ClickUp** (comentário/update/anexo): a integração é somente leitura em todo o fluxo. Os
critérios e o relatório ficam em `docs/features/<slug>/test/` para o usuário levar ao card se quiser.

## Passo 6 — Liberar contexto

Critérios e resultados já estão salvos e o `STATE.md` marca `test = done`. Pode `/compact`/`/clear` ao
concluir, ou seguir para `/observe` (opcional) para gerar a observação final não-técnica.

Se o `STATE.md` tiver `spec: <id>`, **sugira rodar `/spec --sync`** para fechar o ciclo: ele confere no
código o que foi entregue e move a spec para `done`. Sem esse passo, o backlog em `specs/` passa a mentir.

Mantenha tudo em português e em Markdown estruturado.
