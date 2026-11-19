# Revisão: etapa de entrega dos forks

Escopo: o diff inteiro da branch (código, binários, documentação, comando de IA e specs), lido contra o
`develop/handoff.md`. Não houve `analyze/plan.md`. Lido em 2026-11-19 sobre `583194b`.

## Branch

- **`feat/delivery-stage`**, renomeada com `git branch -m` a partir de `guilhermebittelbrunn/fork-delivery-specs`.
  Base: `main` em `583194b`.
- O nome antigo reprovou no regex de `.claude/commands/review.md` (prefixo de usuário, sem `type`). A branch
  não tinha remoto (`git ls-remote --heads origin` vazio para ela, sem upstream) nem commit à frente de
  `origin/main`, então a renomeação era permitida. O nome novo passou no regex.
- Sem `project` no nome porque o diff cruza `apps/web`, `apps/e2e`, `.claude`, `docs` e `specs`. O tipo é
  `feat` porque o diff entrega capacidade nova (o comando `/deliver`, a captura `pnpm --filter e2e showcase`
  e o vídeo servido pela landing), e não só texto.

## Achados

| Severidade | Arquivo:linha | Problema | Ação |
|------------|---------------|----------|------|
| 🟡 | `README.md:150-153` | "Toda rota valida a entrada com Zod na borda, recusa corpo acima de 100 KiB" não bate com o código: `/files` tem teto de 4 MiB (`apps/api/(shared)/validation/file.schema.ts:10`) e `/webhooks/payments` lê o corpo cru (`route.ts:286`), como o `docs/SECURITY.md:185` já registra | Corrigido |
| 🟡 | `docs/delivery/01-security-review.md:255` (item 1.12) | `grep -iE "x-powered-by\|server:"` com "esperado: vazio" reprova sempre na Vercel, que manda `server: Vercel` em toda resposta | Corrigido: o grep procura só `x-powered-by`, e uma linha explica o cabeçalho da plataforma |
| 🟡 | `docs/delivery/03-product-quality.md:137` (item 3.5) | O `find` acusa as PNGs de `apps/e2e/showcase-results/` (capturas da parte 4, fora do Git) como imagem de página acima de 100 KB. Rodado no core, listou 19 | Corrigido: `-path 'apps/e2e' -prune` e o texto do item |
| 🟡 | `specs/delivery-security-review.md:119` e `specs/delivery-infra-hardening.md:98` | As duas specs prometem o mesmo `poweredByHeader: false` em `packages/next-config/index.ts` | Decisão em aberto 1 |
| 🟡 | frontmatter das três specs `delivery-*` e `specs/BACKLOG.md:303-308` | `contends_on` não lista arquivos que as specs alteram: `delivery-infra-hardening` muda o matcher de `apps/web/proxy.ts` e `apps/app/proxy.ts` (cabeçalhos em `/api/auth/*`); `delivery-security-review` muda o cookie `x-locale` nos mesmos dois proxies e o `packages/next-config/index.ts`. A nota do BACKLOG diz que `delivery-product-quality` altera o `apps/web/proxy.ts`, mas a tabela de impacto dela não toca esse arquivo | Decisão em aberto 2 (specs `approved`, não editadas) |
| 🟢 | `docs/AI-WORKFLOW.md:24` | A tabela de slash commands não citava o `/deliver` | Corrigido |
| 🟢 | `docs/delivery/01-security-review.md:346` (1.17) | A alternativa `got\(` do regex exigia `got((`; o certo é `got\(` uma vez só | Corrigido. Mesma contagem no core (12 linhas) |
| 🟢 | `docs/delivery/01-security-review.md:326` (1.16) | O segundo `git grep` acusa `apps/web/__tests__/instrumentationRequestError.test.ts:57` | Corrigido: exclui `__tests__`, como o primeiro grep do item |
| 🟢 | `docs/delivery/01-security-review.md:65,196` (1.2, 1.9) | Arquivo apagado no diff vira "No such file or directory" no `xargs grep` | Corrigido: `git diff --name-only --diff-filter=d` |
| 🟢 | `docs/delivery/02-infra-hardening.md:262` (2.15) | O mesmo `server:` do item 1.12; o critério do item só fala de `X-Powered-By` | Corrigido |
| 🟢 | `docs/delivery/cowork-infra-prompt.md:45-46` | "os 4 primeiros caracteres do prefixo público (`ajkey_`, `rk_live_`)", com exemplos de 6 e 8 caracteres | Corrigido: "o prefixo público do formato" |
| 🟢 | `docs/FORKING.md:471` | A âncora `#crud-de-referência` não existe: o título `### 🧬 CRUD de referência` gera `#-crud-de-referência`. O erro é anterior a este diff | Corrigido |
| 👁 | `docs/FORKING.md:305,423` | Mandam pôr `RESEND_TOKEN` na `web` para o formulário de contato, que hoje passa pela API (`apps/web/app/[locale]/contact/components/contact-form-client.tsx:56`). Anterior ao diff, e já é item do corte de `delivery-infra-hardening` | Sem ação |
| 👁 | `docs/delivery/04-documentation.md:65-66` | O `cp brag-output/brag.mp4` supõe a pasta sem carimbo; se `brag-output/` já existir, a skill grava em `brag-output-<data-hora>/` (`.claude/skills/brag-slim/SKILL.md:20`). O `.gitignore` cobre as duas (`brag-output*/`) | Sem ação |
| 👁 | `apps/web/proxy.ts:61` | `/showcase/*` deixa de receber os cabeçalhos do nosecone (CSP, HSTS, `nosniff`), como já acontece com `_next/static`, `favicon.ico`, `robots.txt` e `sitemap.xml` | Aceito: são arquivos de mídia estáticos |

### ✅ Conferido

- **Matcher** (`apps/web/proxy.ts:61`): o lookahead só exclui caminho que começa com `showcase/`. `/showcase`
  sem barra e `/pt-br/showcase` continuam passando pelo proxy, e nenhuma página da landing começa por
  `showcase/`, porque todas vivem sob `[locale]`. O redirecionamento que o handoff descreve (caminho sem idioma
  vira `/pt-br/...`) está em `route()`, `apps/web/proxy.ts:104-113`.
- **Teste do matcher** (`apps/web/__tests__/proxyLocale.test.ts:84-97`): cobre o MP4, o GIF e duas rotas
  localizadas.
- **A captura não alcança Firebase real.** `apps/e2e/showcase/playwright.config.ts` espalha o config da suíte,
  que monta o ambiente das três apps com `buildStackEnv` ao carregar (`apps/e2e/playwright.config.ts:19-23`).
  Esse helper reconstrói o env a partir do `.env.example`, esvazia as credenciais e lança erro quando o
  ambiente ainda aponta para projeto real (`assertEmulatorTarget`, `apps/e2e/support/stackEnv.ts:99-109`).
  As apps sobem com `reuseExistingServer: false`, e o setup semeia o emulador com o mesmo env. A saída vai
  para `apps/e2e/showcase-results/`, ignorada.
- **Specs**: frontmatter válido no `js-yaml` (com `feature: -` normalizado, como nas demais specs); caminho com
  colchete entre aspas só em `"apps/web/app/[locale]/layout.tsx"`. Os contadores do `BACKLOG.md` batem com o
  disco: 9 specs, sendo 1 `proposed`, 3 `approved`, 3 `in-progress` e 2 `deferred`. Referências de linha
  conferidas por amostra (`packages/auth/server.ts:330-336`, `user.mapper.ts:67`, `apps/web/env.ts:36`,
  `parse-request-json.ts:5`).
- **README**: mantém o formato (centro, badges, sumário, seções com emoji). As âncoras novas
  (`#-demonstração`, `#-etapa-de-entrega`) resolvem. A tabela de rotas da API bate com `apps/api/app/(routes)`;
  `requireOrganizationApi` e `requirePlanApi` existem (`apps/api/app/(guards)/`); "conta desativada perde o
  acesso na hora" confere com `packages/auth/server.ts:185`; o contato pela API confere com
  `contact-form-client.tsx:56`.
- **Links**: os relativos dos documentos novos e alterados resolvem. Os do `README.template.md` e do
  `report-template.md` partem do lugar para onde o arquivo é copiado (raiz do fork e
  `docs/delivery/reports/<data>/`), e as âncoras `#1-segurança` a `#4-documentação` do modelo de README
  batem com os títulos do modelo de relatório.
- **Comandos**: todos os blocos `bash` de `docs/delivery/*.md` passam em `bash -n` e `zsh -n`. Os que não
  pedem app de pé rodaram contra o core nos dois shells (1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 1.9, 1.14, 1.16,
  1.17, 1.18, 2.8, 3.5). Conferi as flags de `gitleaks git --redact`, `pnpm audit --audit-level`,
  `lighthouse`, `agent-browser set viewport` e `agent-browser eval`. A lista de rotas sem guard do item 1.6
  (18) bate com a tabela de rotas públicas de `docs/SECURITY.md`.
- **Segredos**: nenhuma chave, token, senha real ou e-mail fora de `@example.com` nos arquivos novos e
  alterados, inclusive handoff, specs e `docs/delivery/`. O `demo1234` do modelo de README é a senha fixa do
  seed do emulador, já publicada no `README.md` e no `docs/SETUP.md:371`. O alerta de secret scanning é
  citado só por número, tipo e commit. Os binários só trazem a tag `encoder=Lavf61.7.100`.
- **Terceiro**: `.claude/skills/brag-slim/SKILL.md` não foi editado; a `LICENSE` MIT está ao lado.

## Correções aplicadas

| Arquivo | O que mudou |
|---------|-------------|
| `README.md` | O parágrafo da API passa a dizer que o teto de 100 KiB vale para rota que recebe JSON e que o upload tem teto de 4 MiB |
| `docs/delivery/01-security-review.md` | 1.12: grep só de `x-powered-by` e uma linha sobre `server: Vercel`. 1.17: regex corrigido. 1.16: segundo grep sem `__tests__`. 1.2 e 1.9: `--diff-filter=d` |
| `docs/delivery/02-infra-hardening.md` | 2.15: grep só de `x-powered-by` |
| `docs/delivery/03-product-quality.md` | 3.5: `find` sem `apps/e2e`, e o texto explicando a exclusão |
| `docs/delivery/cowork-infra-prompt.md` | Regra 1: "o prefixo público do formato" no lugar de "os 4 primeiros caracteres" |
| `docs/AI-WORKFLOW.md` | `/deliver` na tabela de slash commands |
| `docs/FORKING.md` | Âncora do README corrigida para `#-crud-de-referência` |

## Raio de impacto

- `apps/web/proxy.ts`: só a `web`. As specs `delivery-infra-hardening` e `delivery-security-review` vão
  alterar o mesmo arquivo.
- Binários em `apps/web/public/showcase/`: cerca de 3,9 MB no histórico. Todo fork herda os três arquivos e os
  troca na parte 4 da entrega (`docs/FORKING.md`, seção 12).
- `apps/e2e/package.json`: script `showcase` novo; o `clean` passa a apagar `showcase-results`.
- `.gitignore` da raiz: três padrões novos.
- Nenhum contrato do SDK, rota da API, `error.code` ou chave de i18n mudou.

## Verificar no `/test`

1. **A landing serve o vídeo em produção.** O handoff mediu com `next dev`. Repro:
   `pnpm --filter web build && pnpm --filter web start`, depois
   `curl -sI http://localhost:3001/showcase/showcase.mp4` (e `.gif`, `.jpg`): 200 com `video/mp4`,
   `image/gif` e `image/jpeg`; `curl -sI http://localhost:3001/foo` continua 307 para `/pt-br/foo`. O teste
   unitário aproxima o matcher com `RegExp`, e o Next compila o matcher por outro caminho; esta medição é a
   prova de verdade.
2. **Testes da `web`.** `pnpm --filter web test`: os 7 testes de `proxyLocale.test.ts` e o total de 210 que o
   handoff cita.
3. **Captura do vídeo.** `pnpm --filter e2e showcase` (JDK 21): 27 testes (4 do setup e 23 telas) e 23 PNGs em
   `apps/e2e/showcase-results/`. Confira nos prints que só aparecem dados do seed.
4. **GIF no README do GitHub.** Só depois do push: a página da branch mostra o GIF e o clique abre o MP4.
5. **Contagem do `pnpm audit --prod`.** As specs citam 8 críticas e 120 altas
   (`specs/delivery-security-review.md:23,51`), medidas numa saída que ficou fora do repositório.
6. **Regras de conteúdo do vídeo.** Uma pessoa assiste aos 21 segundos e confere a lista da parte 4 (só seed,
   nenhuma URL interna nem nome de projeto real). Até lá, o item fica 🔒 no `/deliver`.

## Lacunas de teste

O handoff não listava lacunas. As que vi:

- **Aberta, opcional**: o teste do matcher não cobre `/showcase` sem barra, que continua indo ao proxy e
  redirecionando. Não há página nesse caminho.
- **Fora de escopo**: `apps/e2e/showcase/*` é ferramenta de captura, sem teste unitário. O próprio
  `pnpm --filter e2e showcase` é a prova, no item 3 acima.

## Decisões em aberto

1. **`poweredByHeader: false` está em duas specs** (`delivery-security-review`, fatia 1, e
   `delivery-infra-hardening`, "Cabeçalhos completos"). Recomendação: manter só na fatia 1 de
   `delivery-security-review`, que vem antes na ordem aprovada, e marcar o item de `delivery-infra-hardening`
   como entregue por ela, via `/spec`.
2. **`contends_on` das specs `delivery-*`.** Recomendação: acrescentar `apps/web/proxy.ts` e
   `apps/app/proxy.ts` em `delivery-infra-hardening` e `delivery-security-review`, e
   `packages/next-config/index.ts` em `delivery-security-review`; na nota do `BACKLOG.md`, trocar o par
   `delivery-infra-hardening` × `delivery-product-quality` no `apps/web/proxy.ts` por
   `delivery-infra-hardening` × `delivery-security-review`. Não editei porque as specs estão `approved`.

## Gates estáticos

- `pnpm check`: limpo, 1072 arquivos.
- `pnpm --filter web typecheck`: sai com 0.
- `pnpm --filter e2e typecheck`: sai com 0.
- Paridade de i18n: não se aplica, o diff não toca `@repo/internationalization`.

## Plano de commits

Na ordem, um bloco por vez. Todas as mensagens terminam com a linha de coautoria.

1. `fix(web): serve files under /showcase without the locale redirect`
   - `apps/web/proxy.ts`
   - `apps/web/__tests__/proxyLocale.test.ts`
2. `feat(web): add the showcase video, gif and poster`
   - `apps/web/public/showcase/showcase.mp4`
   - `apps/web/public/showcase/showcase.gif`
   - `apps/web/public/showcase/showcase.jpg`
3. `chore: ignore showcase captures, brag output and delivery screenshots`
   - `.gitignore`
4. `feat(e2e): capture the showcase screens against the emulators`
   - `apps/e2e/package.json`
   - `apps/e2e/showcase/playwright.config.ts`
   - `apps/e2e/showcase/capture.spec.ts`
   - `apps/e2e/showcase/shots.ts`
5. `docs: add the fork delivery stage specifications`
   - `docs/delivery/README.md`
   - `docs/delivery/01-security-review.md`
   - `docs/delivery/02-infra-hardening.md`
   - `docs/delivery/03-product-quality.md`
   - `docs/delivery/04-documentation.md`
   - `docs/delivery/cowork-infra-prompt.md`
   - `docs/delivery/report-template.md`
6. `feat(claude): add the brag-slim skill from latent-spaces/brag`
   - `.claude/skills/brag-slim/SKILL.md`
   - `.claude/skills/brag-slim/LICENSE`
7. `feat(claude): add the /deliver command`
   - `.claude/commands/deliver.md`
   - `.claude/commands/commands.md`
8. `docs: add the fork README template and link the delivery stage`
   - `docs/templates/README.template.md`
   - `docs/FORKING.md`
   - `docs/TASK-PIPELINE.md`
   - `docs/AI-WORKFLOW.md`
   - `CLAUDE.md`
9. `docs: show the demo video and the delivery stage in the README`
   - `README.md`
10. `docs(specs): add the delivery security, infra and quality specs`
    - `specs/delivery-security-review.md`
    - `specs/delivery-infra-hardening.md`
    - `specs/delivery-product-quality.md`
    - `specs/BACKLOG.md`
11. `docs(features): delivery-stage`
    - `docs/features/delivery-stage/STATE.md`
    - `docs/features/delivery-stage/develop/handoff.md`
    - `docs/features/delivery-stage/review/review.md`

Título sugerido para a PR: `feat: fork delivery stage, README template and showcase video`.

## Decisões do usuário (2026-11-19)

- `poweredByHeader: false` fica só na fatia 1 de `delivery-security-review`. O item saiu do corte de
  `delivery-infra-hardening`, que agora aponta para a outra spec.
- `contends_on` corrigido antes do commit das specs: `apps/web/proxy.ts` e `apps/app/proxy.ts` nas duas
  specs de segurança, `packages/next-config/index.ts` em `delivery-security-review` e
  `packages/next-config/brand.ts` no lugar do `index.ts` em `delivery-infra-hardening`. A nota de ordem do
  `BACKLOG.md` passou a nomear os pares certos.
- Plano de commits aprovado para execução direta, sem parada entre blocos.

## Commits realizados

Branch `feat/delivery-stage`, a partir de `main` em `583194b`. Cada commit conferido com
`git show --stat` contra a lista de arquivos do plano.

| # | hash | mensagem |
|---|------|----------|
| 1 | `1595d9e` | `fix(web): serve files under /showcase without the locale redirect` |
| 2 | `c0dce2b` | `feat(web): add the showcase video, gif and poster` |
| 3 | `d0f769d` | `chore: ignore showcase captures, brag output and delivery screenshots` |
| 4 | `b1cd1be` | `feat(e2e): capture the showcase screens against the emulators` |
| 5 | `8178b0c` | `docs: add the fork delivery stage specifications` |
| 6 | `49afecf` | `feat(claude): add the brag-slim skill from latent-spaces/brag` |
| 7 | `cb34fad` | `feat(claude): add the /deliver command` |
| 8 | `edae6d1` | `docs: add the fork README template and link the delivery stage` |
| 9 | `ce9d54a` | `docs: show the demo video and the delivery stage in the README` |
| 10 | `1f374b9` | `docs(specs): add the delivery security, infra and quality specs` |
| 11 | este | `docs(features): delivery-stage` |

Envio ao remoto: pendente da resposta do usuário.
