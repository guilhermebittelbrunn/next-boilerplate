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
  mesmo commit → `packages`. Tooling de IA → `claude`. Vários apps num commit único → omita o escopo
  (`feat: …`) ou concatene com hífen — mas prefira **separar em commits** (regra abaixo).
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
  **último commit**, separado do código: `docs(features): <slug>`. Nunca commite credencial que tenha
  vazado para print ou roteiro de teste.
- **Épicos (tarefas com subtarefas):** branch do épico `feat/<epic-slug>` (a partir de `main`); cada
  subtarefa é uma sub-branch `<project>/feat/<epic-slug>-<subtask>` que faz PR **para a branch do
  épico**; ao final, um PR do épico para `main`. Dentro de cada subtarefa vale o "um commit por app".

## Push

**Push só com o "sim" do usuário, e no fim do `/review`:** depois de **todos** os commits aprovados, o
orquestrador do `/review` **pergunta** se deve sincronizar (`git push -u origin <branch>`). Fora disso,
nunca faça `git push`. Nunca pushe para branch protegida, nunca use `--force`, nunca abra PR por conta
própria.

O hook `PreToolUse` `.claude/hooks/block-protected-branch-write.sh` bloqueia commit em branch protegida,
push para branch protegida e `--force` como rede de segurança — mas a verificação proativa continua
sendo responsabilidade de quem vai commitar.
