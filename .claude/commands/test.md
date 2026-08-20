---
description: QA unificado — gera os critérios de aceite (formato §9.1) E roda os testes Vitest dos workspaces afetados (+ pnpm test do root, que gateia o build); sob demanda gera o roteiro manual e valida dirigindo o app com agent-browser. Foco opcional; por padrão usa as mudanças atuais + a feature mais recente.
argument-hint: "[opcional: slug/foco | 'manual' | --force]"
allowed-tools: Agent, AskUserQuestion, Read, Write, Edit, Grep, Glob, Bash, Skill
---

# /test

Foco (opcional): **$ARGUMENTS**

Você é o orquestrador (loop principal) do papel **Analista de QA**. Este comando **unifica** geração de
critérios de aceite + execução de testes + validação executável.

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

- **Gerar os critérios de aceite** no formato **§9.1** de
  [`docs/feature-analysis-guide.md`](../../docs/feature-analysis-guide.md) e salvar em
  `docs/features/<slug>/test/criterios-aceite.md`;
- **Rodar os testes**: a suíte deste repo é pequena, então **rode inteira** a dos workspaces afetados
  (`pnpm --filter app test`, `pnpm --filter api test`) e **sempre** feche com
  `pnpm test` no root — `turbo build` **depende de `test`**, é isso que se está antecipando. Se o diff
  tocou i18n ou adicionou `error.code`, rode também
  `pnpm --filter @repo/internationalization test` (paridade dos 3 idiomas). Mais
  `pnpm --filter <app> typecheck` nos apps afetados;
- **Criar os testes que faltam** (skill `/write-tests`), cobrindo caminho feliz e **cada** caminho de erro
  — validação, não encontrado, sem permissão e **ownership de outro usuário (404)**;
- **Validação executável** dirigindo o app com `agent-browser`, quando houver fluxo de usuário (Passo 4);
- Ao final, atualizar o `STATE.md` (`test = done`; `blocked` se algum teste falhar).

> O `analista-qa` **não cria branch, não nomeia branch e não commita** — isso é do `revisor-codigo`
> (`/review`). Se ele reportar que está numa branch protegida, **pare**: rode o `/review` para criar a
> branch antes de qualquer commit dos testes gerados.

## Passo 2 — Apresentar

Mostre, juntos: o resultado dos testes (pass/fail + lacunas), o checklist de critérios de aceite **com o
status por item** e o resultado do `pnpm test` do root.

## Passo 3 — Critérios/teste manual (sob demanda)

Se `$ARGUMENTS` contiver `manual`, **já inclua** no `test/criterios-aceite.md` o **roteiro de teste manual**
passo a passo (inputs → resultado esperado). Caso contrário, **pergunte** (`AskUserQuestion`) se deseja
gerar esse roteiro também.

## Passo 4 — Validação executável end-to-end (com confirmação)

O objetivo é **acessar o app rodando e percorrer o fluxo como usuário**, não só buildar. Se fizer sentido,
**pergunte antes** (`AskUserQuestion`) — especialmente se puder alterar estado real. Ao autorizar, instrua
o `analista-qa` a:

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

## Passo 5 — Cross-check

Liste os ambientes a conferir quando a mudança os afetar: `apps/app` × `apps/web`, comum × admin ×
impersonação, `subscription` × `simple`, mobile × desktop, light × dark, e os 3 idiomas. Registre os
follow-ups.

**Não escreva no ClickUp** (comentário/update/anexo): a integração é somente leitura em todo o fluxo. Os
critérios e o relatório ficam em `docs/features/<slug>/test/` para o usuário levar ao card se quiser.

## Passo 6 — Liberar contexto

Critérios e resultados já estão salvos e o `STATE.md` marca `test = done`. Pode `/compact`/`/clear` ao
concluir, ou seguir para `/observe` (opcional) para gerar a observação final não-técnica.

Mantenha tudo em português e em Markdown estruturado.
