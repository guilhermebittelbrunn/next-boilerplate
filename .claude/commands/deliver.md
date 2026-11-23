---
description: Roda a etapa de entrega de um produto (fork) antes da entrega final — segurança, infra e hardening, qualidade do produto e documentação — seguindo as especificações de docs/delivery/, e grava o relatório versionado em docs/delivery/reports/<data>/report.md. Obrigatória para todo fork. Audita e registra; não commita.
argument-hint: "[opcional: partes — 1 | 2 | 3 | 4 | lista como 1,3 — padrão: todas]"
allowed-tools: Agent, AskUserQuestion, Read, Write, Edit, Grep, Glob, Bash, Skill
---

# /deliver

Partes (opcional): **$ARGUMENTS**

Você é o orquestrador da **etapa de entrega**. O conteúdo de cada parte está nas especificações; este
comando só define a ordem, quem executa o quê e onde a evidência fica. Leia antes:

- [`docs/delivery/README.md`](../../docs/delivery/README.md): status (✅ ❌ ➖ 🔒), gravidade (🔴 🟡 🟢) e
  a regra de aprovação.
- A especificação de cada parte pedida: `docs/delivery/0N-*.md`.

## Regras de escrita (`humanizer` + `caveman`)

Regra em [`.claude/rules/writing-skills.md`](../rules/writing-skills.md).

- **`humanizer` no relatório** (`report.md`): é versionado e lido por quem recebe o produto.
- **Estilo `caveman` na conversa**: andamento, achados, perguntas. Não fixe o modo na sessão.
- ⛔ **Nada de segredo no relatório nem na conversa.** Saída de comando com chave, token, senha ou e-mail
  de pessoa real vai resumida. Repita esta regra no prompt de todo subagent.

## Passo 0 — Preparar a rodada

1. Partes: as de `$ARGUMENTS` ou, sem argumento, `1,2,3,4`, sempre nessa ordem.
2. `git rev-parse --abbrev-ref HEAD` e `git status --short`. Este comando **não** cria branch nem commita;
   só avisa se houver mudança não commitada (o relatório mede o commit atual, e mudança solta entra na
   conta sem estar nele).
3. Base do core: `git fetch upstream 2>/dev/null; git merge-base HEAD upstream/main`. Sem o remoto
   `upstream`, pergunte o SHA do core de onde o fork saiu (ou registre "desconhecida").
4. Ambiente medido: pergunte as URLs (`$WEB`, `$APP`, `$API`) de produção ou da preview que vai virar
   produção. Sem URL pública, as partes 1 e 3 rodam contra os emuladores e o build local, e os itens que
   exigem URL pública (PageSpeed, `og:image` nos validadores, `robots.txt` de produção) ficam 🔒.
5. Crie `docs/delivery/reports/<AAAA-MM-DD>/report.md` a partir de
   [`docs/delivery/report-template.md`](../../docs/delivery/report-template.md), com o cabeçalho
   preenchido. Se a pasta do dia já existir, acrescente `-2`, `-3`.

## Passo 1 — Segurança (parte 1)

1. Rode os comandos de verificação de [`01-security-review.md`](../../docs/delivery/01-security-review.md)
   que não exigem app de pé (greps, `pnpm audit`). Os que exigem (`curl` contra a API) rodam contra a URL
   do Passo 0.
2. Acione o subagent **`code-reviewer`** com o intervalo `<base>...HEAD` restrito a `apps`, `packages`,
   `firestore.rules` e `storage.rules`, pedindo revisão das seções de autorização, validação, erros e
   segredos do [`review-checklist.md`](../../docs/review-checklist.md). Em paralelo, rode a skill
   `/security-review` sobre o mesmo diff.
3. Preencha a seção 1 do relatório. Este comando **não corrige código**: cada ❌ vira uma linha com o que
   corrigir. Correção pequena e óbvia pode ser feita na hora se o usuário pedir; o resto segue o pipeline
   (`/analyze` → `/develop` → `/review` → `/test`) e o `/deliver 1` roda de novo depois.

## Passo 2 — Infra e hardening (parte 2)

1. Rode as verificações de terminal de [`02-infra-hardening.md`](../../docs/delivery/02-infra-hardening.md)
   (`gitleaks --redact`, `gh api` de leitura, `curl -I`). Nunca rode `gitleaks` sem `--redact`.
2. Gere o prompt do Cowork já preenchido: copie o bloco de
   [`cowork-infra-prompt.md`](../../docs/delivery/cowork-infra-prompt.md) para
   `docs/delivery/reports/<data>/cowork-prompt.md`, trocando os `{{...}}` pelos identificadores públicos do
   produto (domínios, ids de projeto). Nenhuma chave.
3. Pergunte (AskUserQuestion) se a configuração de console já foi feita, se vai ser feita agora no Cowork
   (o usuário cola o relatório dele de volta) ou se fica pendente. Itens de console sem evidência ficam 🔒
   com dono.
4. Preencha a seção 2 do relatório.

## Passo 3 — Qualidade do produto (parte 3)

1. Acione o subagent **`analista-qa`** com [`03-product-quality.md`](../../docs/delivery/03-product-quality.md)
   como roteiro, as URLs do Passo 0 e a regra de evidência: número medido escrito no relatório, prints em
   `docs/delivery/reports/<data>/screenshots/` (fora do Git). Ele é o único que dirige o `agent-browser`
   (regra de ouro 11) e sobe o que precisar, derrubando no fim só o que ele subiu.
2. PageSpeed e Lighthouse: pela API do PageSpeed Insights quando houver URL pública; senão
   `pnpm --filter web build` e `pnpm lighthouse` contra o build de produção local, nunca contra `next dev`. A
   tabela de `apps/e2e/lighthouse-results/summary.md` vai para o relatório. Celular: `pnpm --filter e2e e2e
   --project=mobile` antes da passada com o `agent-browser`.
3. Preencha a seção 3 do relatório com o que o `analista-qa` mediu.

## Passo 4 — Documentação (parte 4)

1. Compare o `README.md` com [`docs/templates/README.template.md`](../../docs/templates/README.template.md)
   pelos comandos de [`04-documentation.md`](../../docs/delivery/04-documentation.md). Se o README fugir do
   modelo, proponha a versão corrigida e aplique só com o "sim" do usuário.
2. Vídeo: `pnpm --filter e2e showcase` (telas contra os emuladores) e a skill **`brag-slim`** com as telas
   capturadas; entregáveis em `apps/web/public/showcase/` (`showcase.mp4`, `showcase.jpg`,
   `showcase.gif`). Antes de dar o item por aprovado, peça a uma pessoa que assista ao vídeo inteiro
   conferindo as regras de conteúdo; até lá ele fica 🔒.
3. Confira `PRE-PRODUCTION.md`, os `.env.example` e o mapa do `FORKING.md` (item 4.3).
4. Preencha a seção 4 e o resumo do relatório.

## Passo 5 — Fechar

1. Aplique a regra de aprovação do `docs/delivery/README.md`: nenhum 🔴 aberto e toda 🟡 com dono e prazo.
2. Leve as 🟡 aceitas para `docs/PRE-PRODUCTION.md`.
3. Apresente o resumo (contagem por parte, 🔴 abertos, pendências) e pergunte quem assina. A assinatura
   é escrita no relatório só com a resposta do usuário.
4. Atualize a seção "✅ Entrega" do README para apontar para este relatório.
5. **Não commite.** Sugira o plano de commits (`docs(delivery): report <data>` separado de qualquer
   correção) e pare. Commit e push seguem [`.claude/rules/git-commits.md`](../rules/git-commits.md).
