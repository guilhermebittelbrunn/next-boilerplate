# Handoff: etapa de entrega dos forks

Tarefa direta, pedida em conversa em 2026-11-19: definir a etapa final de entrega que todo fork cumpre
antes de ir para o cliente (segurança, infra e hardening, qualidade do produto, documentação), versionar a
etapa no repositório, atualizar o README, criar o modelo de README dos forks, baixar a skill brag e gerar o
vídeo e o GIF do produto. Não passou pelo `/analyze`: o escopo veio inteiro do pedido.

## O que mudou

**Etapa de entrega (documentação permanente)**

- `docs/delivery/README.md`: visão geral, ordem das quatro partes, status (✅ ❌ ➖ 🔒), gravidade (🔴 🟡 🟢),
  regra de aprovação e onde o relatório fica.
- `docs/delivery/01-security-review.md` (19 itens), `02-infra-hardening.md` (20), `03-product-quality.md`
  (11) e `04-documentation.md`: cada item com o porquê, o que o core já faz, o comando de verificação, o
  critério de aprovação e a gravidade.
- `docs/delivery/cowork-infra-prompt.md`: prompt para o Claude Cowork configurar os consoles pelo
  navegador, sem registrar valor de segredo e parando antes de ação irreversível.
- `docs/delivery/report-template.md`: o relatório de cada rodada.
- `docs/templates/README.template.md`: modelo de README de todo fork.
- `.claude/commands/deliver.md`: o comando `/deliver`, que roda as quatro partes e grava o relatório.
  Registrado em `.claude/commands/commands.md`, `docs/TASK-PIPELINE.md` e `CLAUDE.md`.

**Specs de backlog (lacunas do core)**

- `specs/delivery-security-review.md`, `specs/delivery-infra-hardening.md` e
  `specs/delivery-product-quality.md`, `approved` pelo usuário em 2026-11-19, e o registro delas no
  `specs/BACKLOG.md` (nota da rodada, contadores, lista e ordem).

**Vídeo de demonstração**

- `.claude/skills/brag-slim/` (SKILL.md e LICENSE, MIT), copiada de `latent-spaces/brag` no commit
  `0637943`. A variante completa `/brag` ficou de fora: traz 16 MB de música e depende do Hyperframes, e o
  próprio `/brag` delega para a `brag-slim` no Opus 5.5.
- `apps/e2e/showcase/` (`playwright.config.ts`, `capture.spec.ts`, `shots.ts`) e o script
  `pnpm --filter e2e showcase`: captura as telas do vídeo reaproveitando o boot da suíte E2E
  (`buildStackEnv`), que ignora o `.env` local e só aceita projeto `demo-*`. Saída em
  `apps/e2e/showcase-results/`, ignorada.
- `apps/web/public/showcase/showcase.mp4` (21 s, 1920 × 1080, 30 fps, 2,1 MB), `showcase.gif` (720 px,
  12 fps, 1,8 MB) e `showcase.jpg` (pôster).
- `apps/web/proxy.ts`: o matcher deixa de rodar em `showcase/`. Sem isso, o proxy redirecionava
  `/showcase/showcase.mp4` para `/pt-br/showcase/showcase.mp4`, que dá 404. Teste novo em
  `apps/web/__tests__/proxyLocale.test.ts`.
- `.gitignore`: `apps/e2e/showcase-results/`, `brag-output*/` e `docs/delivery/reports/**/screenshots/`.

**Documentação existente**

- `README.md`: mesmo formato, com os recursos das PRs #32 a #62, a seção "🎬 Demonstração" com o GIF e a
  seção "✅ Etapa de entrega".
- `docs/FORKING.md`: passo 10 do checklist, seção "README do produto" e duas linhas no mapa de arquivos.
- `docs/AI-WORKFLOW.md` e `CLAUDE.md`: a skill `brag-slim`.

## Instrumento de cada afirmação

| Afirmação | Instrumento |
|-----------|-------------|
| Estado do core em cada spec (arquivo:linha) | Três auditorias só de leitura no `583194b`, uma por tópico; os achados mais graves conferidos de novo à mão |
| Repositório público e alerta #1 de secret scanning aberto | `gh repo view` e `gh api …/secret-scanning/alerts`, executados |
| 8 críticas e 120 altas no `pnpm audit --prod` | Auditoria de front/infra (saída em `/tmp/audit-dubai.json`, fora do repo). **A verificar no `/test`** com `pnpm audit --prod` |
| Fontes de mercado das specs | 23 URLs abertas em 2026-11-19 por um agente de leitura; duas com ressalva registrada no texto |
| Telas do vídeo vêm só do emulador | `pnpm --filter e2e showcase` executado: 27 testes passaram, com o `assertEmulatorTarget` da E2E no boot |
| Vídeo com 630 quadros e 21 s | `ffprobe -count_frames` no MP4 final |
| A landing serve `/showcase/*` | `next dev` da `web` de pé: `showcase.mp4` 200 `video/mp4`, `showcase.gif` 200, `showcase.jpg` 200, `/foo` 307 para `/pt-br/foo` |
| Matcher | `proxyLocale.test.ts`, 7 testes passando |
| Gates | `pnpm check` limpo; `pnpm turbo run typecheck test --filter=web --filter=e2e`, 13/13 tasks, 210 testes na `web` |
| Comandos das especificações rodam | Os comandos sem app de pé das partes 1 e 2 executados contra o core; três regex corrigidas depois disso |

## O que não foi verificado

- Os comandos que exigem URL pública (PageSpeed, `curl -I` em produção, `gitleaks`, os passos do Cowork):
  nenhum ambiente de produção foi usado.
- O `/deliver` não foi executado de ponta a ponta; ele existe como roteiro.
- O GIF dentro do README renderizado pelo GitHub: só depois do push.

## Efeitos colaterais conhecidos

- O `next dev` 16.4.3 para a cada duas execuções com um aviso de vulnerabilidade quando roda numa sessão de
  agente, e gera um `AGENTS.md` em cada app. Os três `AGENTS.md` gerados foram apagados; nada disso entra no
  diff. A correção é subir o `next`, na fatia 1 de `delivery-security-review`.
