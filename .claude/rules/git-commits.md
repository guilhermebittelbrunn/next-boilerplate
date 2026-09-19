# Regra global — commits e branches

Aplica-se a todo o trabalho neste repositório (loop principal e subagents).

- **⛔ REGRA CENTRAL — nenhum commit em branch protegida**: `main`, `master`, `production`,
  `production-backup`. Sem exceção. Todo código produzido a partir dessas branches exige **branch nova**
  (criada a partir dela) para que o merge aconteça via **Pull Request**. Se o usuário pedir para commitar
  direto numa delas, recuse e explique.
- **Sempre verifique a branch atual antes de commitar**: `git rev-parse --abbrev-ref HEAD`. Se for
  protegida, pare e crie uma branch de feature primeiro.
- **Dono da branch = `revisor-codigo`**: ele é o único agent que **define o nome** (padrão abaixo) e
  **cria** a branch. `planejador-tarefa`, `desenvolvedor` e `analista-qa` não nomeiam nem criam branch;
  se estiverem em branch protegida, param e sinalizam.
- **Commit só com aprovação explícita do usuário.** Nunca commite ao final de uma tarefa/plano por
  iniciativa própria: o usuário revisa o diff primeiro. O `/review` apresenta o plano de commits e
  commita bloco a bloco, cada um confirmado.

## Padrões (canônicos aqui — não há linter de commit neste repo)

Não há husky/git-commit-msg-linter instalado: o formato é **convenção humana**, então respeitá-lo é
responsabilidade de quem escreve a mensagem.

- Branch: `<project>/<type>/<title>` (ex.: `api/feat/entity-soft-delete`).
- Commit: `type(project): descrição curta`.
- PR: `type(project): title`.
- `type` ∈ `feat` / `fix` / `style` / `chore` / `ci` / `refactor` / `perf` / `test` / `docs`.
- `project` = pasta em `apps/` (`app`, `web`, `api`, `email`) **ou** nome do pacote sem `@repo/`
  (`sdk`, `design-system`, `internationalization`, `auth`, `payments`, `shared`, …). Vários pacotes no
  mesmo commit → `packages`. Tooling de IA → `claude`. Backlog de funcionalidades (`specs/`) → `specs`.
  Vários apps num commit único → omita o escopo (`feat: …`) ou concatene com hífen — mas prefira
  **separar em commits** (regra abaixo).
- **Idioma — sempre em inglês:** nomes de branch e mensagens de commit/PR são escritos **em inglês**.
  Use o idioma de origem **apenas** para nome próprio ou termo sem equivalente direto (ex.: `Pix`,
  `Boleto`, `CNPJ`).

## Granularidade

- **Um commit por aplicação/pacote:** não misture `apps/app` com `apps/api` ou `packages/*` no mesmo
  commit. Ordene por dependência: **`packages/sdk` (contrato) → `apps/api` → `apps/app`/`apps/web` →
  `packages/internationalization` (i18n)**.
- **Pulverize por funcionalidade:** dentro de cada app, quebre em **vários commits pequenos e coesos, um
  por unidade de mudança** (evite commits com +10 arquivos misturando assuntos). Ex.: na `api`, um commit
  para a rota nova (schema + repo + mapper) e outro para o guard/autorização; na `app`, um para os hooks
  de dados e outro para a página/formulário. Testes acompanham o commit da funcionalidade que cobrem.
- **Artefatos do fluxo:** `docs/features/<slug>/` é versionado (histórico da feature) e entra como
  **último commit**, separado do código: `docs(features): <slug>`.
  - ⛔ **Varra o artefato por segredo antes de incluí-lo no plano.** `docs/features/` é versionado e vai
    para todo fork. Isso já vazou duas vezes: um `test/report.md` gravou a senha `NovaSenha2026!x` **no
    mesmo arquivo** em que afirmava "nenhuma senha foi gravada em arquivo", e outro gravou `qaAudit2026!`.
    Senha, token, chave e e-mail real de pessoa não entram — nem em roteiro de teste, nem em bloco de log
    colado, nem em nome de arquivo. Credencial de dev reutilizável vive em
    `.claude/dev-credentials.local.md` (gitignored).
  - Screenshot é descartado pelo `.gitignore` (`docs/features/**/screenshots/`,
    `docs/features/**/test/e2e/`) — então o print **não** é evidência que sobrevive, e prova em imagem tem
    de virar texto no markdown da etapa. Print com e-mail, nome ou foto de pessoa real não se justifica.
- **Épicos (tarefas com subtarefas):** branch do épico `feat/<epic-slug>` (a partir de `main`); cada
  subtarefa é uma sub-branch `<project>/feat/<epic-slug>-<subtask>` que faz PR **para a branch do
  épico**; ao final, um PR do épico para `main`. Dentro de cada subtarefa vale o "um commit por app".

## Executar o plano de commits — confira o índice

`git add <arquivo> && git commit` **não restringe o commit a `<arquivo>`**: commita tudo que estiver no
índice. Se algo já foi preparado antes (um `git mv` de outra etapa, um `git add` anterior), vai junto em
silêncio e o commit cruza assuntos que o plano tinha separado.

Aconteceu: uma rodada do `/cycle` deixou no índice o `git mv` de uma spec arquivada, e o primeiro commit —
que devia ter só o contrato do SDK — levou o rename junto.

- **Antes do primeiro commit:** `git diff --cached --stat` tem de sair **vazio**. Se não sair, descubra o
  que está preparado e decida a qual commit do plano aquilo pertence. Não siga em frente.
- **Depois de cada commit:** `git show --stat --oneline HEAD` conferido contra a lista de arquivos do
  plano. Divergiu, corrija **antes** do próximo.
- Ainda não pushado → `git reset <base>` (mixed, preserva o working tree) e refaça. Depois do push, não
  reescreva histórico.

## Push

**Push só com o "sim" do usuário, e no fim do `/review`:** depois de **todos** os commits aprovados, o
orquestrador do `/review` **pergunta** se deve sincronizar (`git push -u origin <branch>`). Fora disso,
nunca faça `git push`. Nunca pushe para branch protegida, nunca use `--force`, nunca abra PR por conta
própria.

O hook `PreToolUse` `.claude/hooks/block-protected-branch-write.sh` bloqueia commit em branch protegida,
push para branch protegida e `--force` como rede de segurança — mas a verificação proativa continua
sendo responsabilidade de quem vai commitar.
