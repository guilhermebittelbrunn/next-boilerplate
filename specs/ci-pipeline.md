---
id: ci-pipeline
title: Pipeline de CI no GitHub Actions
status: in-progress
value: alto
effort: M
audience: dx
area: [raiz, apps/api, apps/app, apps/web, packages/internationalization]
mode: ambos
depends_on: []
feature: ci-pipeline
updated: 2026-09-01
---

# Pipeline de CI no GitHub Actions

## Problema

Hoje nada é verificado automaticamente quando código entra neste repositório. Lint, tipos e testes só
rodam se a pessoa (ou o agent) lembrar — o `/review` cobra isso por disciplina, não por mecanismo. Como
este repo é o **core de vários forks**, um erro que passa aqui é replicado em cada MVP gerado, e cada fork
herda a mesma ausência de rede de proteção. O sintoma clássico é a PR aprovada que quebra o build de
produção por um tipo ou uma chave de tradução faltando.

## O que já existe no repo

- **Não existe `.github/`** — `git ls-files` não retorna nenhum workflow, template de PR/issue, `CODEOWNERS`
  nem configuração de Dependabot/Renovate. Não há `.husky/`.
  > **Correção de deriva (`/spec --sync`, 2026-09-01):** a redação original afirmava que **também não havia
  > `vercel.json`**. Estava errada quando foi escrita. Existe nos **três** apps — `apps/api/vercel.json`,
  > `apps/app/vercel.json` e `apps/web/vercel.json` —, os três com `ignoreCommand: node scripts/skip-ci.js`
  > (`apps/web/scripts/skip-ci.js:5-8` pula o build quando o commit contém `[skip ci]`), e o da api ainda
  > com um `crons` para `/cron/keep-alive`. **Não muda o corte**: `vercel.json` governa deploy, não
  > verificação, e nada ali roda lint, tipo ou teste. Vale como aviso para a prática 14 (preview deploy por
  > PR, hoje fora do corte): o `ignoreCommand` já existe e precisa ser considerado quando ela entrar.
- `turbo.json:6-36` — tasks declaradas: `build` (linha 7, com `dependsOn: ["^build", "test"]`), `test`
  (17), `analyze` (20), `dev` (23), `translate` (27), `clean` (31) e `//#clean` (34). **Não há task `lint`
  nem `typecheck`** no grafo do turbo.
- `package.json:14-16` — os scripts existem na raiz (`check`/`fix` via `npx ultracite@latest`, `test` via
  `turbo test`), mas `check`/`fix` ficam fora do turbo: sem cache, sem paralelismo, sem gate. `typecheck`
  existe **por workspace** (`apps/api/package.json:14`, `apps/app/package.json:11`,
  `apps/web/package.json:10` e todos os `packages/*`) e nunca é executado em conjunto.
- `turbo.json:5` — `"envMode": "loose"`: toda env vaza para as tasks sem declaração explícita.
- Suíte atual: **23 arquivos** Vitest — 5 em `apps/api/__tests__`, 17 em `apps/app/__tests__`, 1 em
  `packages/internationalization/__tests__`; três configs, **nenhuma com cobertura**.
  *(Número da descoberta, 2026-08-21. Envelheceu durante `firestore-admin-access`: a baseline medida no
  `/analyze` desta spec, em 2026-08-31, era de **37 arquivos / 244 testes** em 3 tasks. Mantido como
  registro do que motivou a spec; o estado atual está em "Estado da entrega".)*
- `apps/web/package.json:4-11` — **sem script `test`** e sem nenhum teste: a landing não é verificada.
- `.claude/hooks/block-protected-branch-write.sh` — proteção de branch existe, mas é **local**, por
  ferramenta de IA; não vale para um clone/fork sem esse hook.
- **Lacuna:** não há execução automática de nada em nenhum evento de repositório.

## Evidência de mercado

- Nota: [`research/engineering-baseline.md`](research/engineering-baseline.md)
- **Prática 1 (CI + Remote Caching)** — classificada como *padrão de facto*, e a nota a lista entre as
  quatro sem as quais nada mais se sustenta neste repo, citando explicitamente a ausência de `.github/`.
- **Prática 5 (cobertura)** — consolidada; limiar global alto vira teatro e relatório por workspace **não
  soma**, exigindo consolidação na raiz. **Prática 13 (dependências)** — padrão de facto; Renovate vence
  Dependabot em monorepo por agrupamento, e sem agrupamento vira 40 PRs/semana ignoradas.
- Armadilha central herdada do `envMode: loose` (prática 1): env não declarada produz **cache-hit com valor
  errado** — típico com `NEXT_PUBLIC_*`, que este repo usa em quantidade.

## Proposta — corte de MVP

> Marcação conferida **no código** em 2026-09-01 pelo `/spec --sync`, não no `status` gravado. Evidência
> item a item em "Estado da entrega".

- [~] Toda PR e todo push na branch principal disparam verificação automática, com resultado visível no
      GitHub antes do merge. — *escrito, commitado e publicado numa branch de feature; provado localmente
      e dentro do `act`. Mas **nenhum resultado é visível no GitHub**: sem PR aberta o gatilho nunca
      disparou, e `gh workflow list --all` volta **vazio** — a plataforma sequer enumera o workflow, porque
      ele não está na branch padrão nem tem execução. Fecha junto com o item abaixo, ao abrir a PR.*
- [~] A verificação cobre **lint/format** (Ultracite/Biome), **tipos** de todos os workspaces e **testes**,
      com falha bloqueando o merge. — *cobre os três e falha; **não bloqueia**: sem branch protection ligada,
      o CI sinaliza. Este item é o que impede a spec de fechar.*
- [x] `lint` e `typecheck` passam a ser tasks do turbo, para rodarem com cache e em paralelo — e para que
      `pnpm check`/`typecheck` local e CI executem exatamente a mesma coisa.
- [~] As envs consumidas pelas tasks ficam declaradas, eliminando cache-hit com valor errado. — *feito para
      as três tasks do gate; `build` segue sem declaração sob `envMode: loose` (decisão Q7, rota A).*
- [x] `apps/web` entra na suíte (mesmo que com um teste mínimo), para deixar de ser o app não verificado.

### Fora do corte

- Remote Cache do Turbo — exige conta/serviço e env; entra depois, e o CI precisa funcionar sem ele.
- Limiar de cobertura (prática 5): medir primeiro, gatear depois — e só em pastas críticas.
- Renovate/Dependabot (prática 13), preview deploy por PR (prática 14) e orçamento de performance
  (prática 18): dependem de um CI verde estável para não virar ruído.
- Testes E2E — spec própria (`e2e-testing`), que consome este pipeline.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Nenhum. |
| `apps/api` | Nenhum código; passa a ter tipos e testes verificados a cada PR. |
| `apps/app` | Idem. |
| `apps/web` | Ganha script e suíte mínima de teste (hoje inexistente). |
| `packages/*` | `typecheck` passa a rodar em todos; nenhuma mudança de API. |
| Infra/env | Automação no GitHub Actions; tasks novas no `turbo.json` e declaração de env por task. Nenhum serviço pago no corte. |

## Riscos e trade-offs

- **Custo herdado por todo fork:** o fork passa a ter um CI que pode ficar vermelho. É o objetivo, mas
  significa que quem forka herda a obrigação de manter a suíte viva — CI cronicamente vermelho é pior que
  CI nenhum, porque ensina o time a ignorar sinal.
- Declarar env por task encerra o `envMode: loose`: se alguma env usada em build não for declarada, o
  build passa a falhar onde antes passava silenciosamente. É a falha correta, mas aparece no dia 1.
- Remote Cache, quando entrar, deve ser **opt-in por variável ausente**, no padrão que
  `packages/security/index.ts:16-18` já usa com `ARCJET_KEY` (retorna sem fazer nada quando a env não
  existe). Um fork sem a conta precisa continuar com CI funcional, apenas mais lento.
- `apps/api/vitest.config.mts:8` roda em `jsdom` num app de servidor: expor isso no CI pode revelar testes
  que só passam por causa do ambiente errado.

## Sinais de pronto

- Abrir uma PR com erro de lint, erro de tipo, teste quebrado ou chave de tradução faltando em um idioma
  resulta em verificação vermelha, sem ninguém rodar nada à mão.
- O mesmo comando que a pessoa roda local é o que roda no CI; não existe verificação que só existe em um
  dos dois lados.
- Um clone limpo do repositório, sem nenhum segredo configurado, consegue rodar o pipeline até o fim.

## Estado da entrega — auditado em 2026-09-01 (2ª rodada, pós-commit)

Feature: [`docs/features/ci-pipeline/`](../docs/features/ci-pipeline/) · branch `ci/feat/github-actions-pipeline`.
O pipeline `/analyze → /develop → /review → /test` fechou as quatro etapas.

**O código está commitado e publicado.** Os **29 commits** do plano do `/review` foram aplicados
(`1b4ad2f`…`eed0fa2`, 196 arquivos, +6406/−2008), a branch `ci/feat/github-actions-pipeline` está
**sincronizada com `origin`** (0 à frente, 0 atrás) e o working tree está **limpo**. O `ci.yml` entrou em
`db53bcc`. Toda a evidência abaixo foi reconferida **em `eed0fa2`**, não no working tree — os gates foram
re-executados nesta auditoria contra o estado commitado.

**O que isso não muda:** o arquivo chegou ao remoto **numa branch de feature**, e o gatilho é
`pull_request` + `push` para `main`. Push em branch de feature não dispara nada. Medido nesta auditoria:
`gh run list` **vazio** e `gh workflow list --all` **vazio** — o GitHub sequer enumera o workflow, porque
ele não está na branch padrão nem tem execução alguma. `git cat-file -e origin/main:.github/workflows/ci.yml`
falha.

### Evidência por item do corte

| item | evidência conferida | veredito |
|------|---------------------|----------|
| PR e push na principal disparam verificação | `.github/workflows/ci.yml:3-6` (`on: pull_request` + `push: branches: [main]`), job `verify` (`:13-14`) | implementado no código |
| Cobre lint + tipos + testes | `ci.yml:33` → `pnpm turbo run lint typecheck test`. Re-medido em `eed0fa2` nesta auditoria: `pnpm check` **392 arquivos, 0 erros / 0 warnings** · `turbo run lint typecheck test --force` **21/21** · `turbo run typecheck --force` **13/13** · `pnpm test` **7 tasks / 44 arquivos / 331 testes** (shared 15 · payments 8 · i18n 11 · auth 29 · app 135 · api 118 · web 15) | **parcial** — cobre e falha, mas **não bloqueia** |
| `lint` e `typecheck` viram tasks do turbo | `turbo.json:7-10` (`//#lint`, task da raiz) e `:11-15` (`typecheck`, `dependsOn: []`), ambas `outputs: []` | implementado |
| Envs das tasks declaradas | `env: []` em `//#lint` (`:9`), `typecheck` (`:14`) e `test` (`:28`); `globalDependencies` passa a incluir `**/.env` (`:3`) | **parcial** — `envMode: loose` (`:5`) segue global e `build` (`:16-25`) não declara env |
| `apps/web` entra na suíte | `apps/web/package.json:10` (script `test`), `apps/web/vitest.config.mts` (`environment: "node"`), `apps/web/__tests__/seo.test.ts` — **15 testes verdes** | implementado |

### Sinais de pronto — conferidos

| sinal | veredito |
|-------|----------|
| Defeito de lint/tipo/teste/tradução deixa a verificação vermelha | ✅ **local**. Os 4 defeitos deliberados derrubam o gate, reconferidos de forma independente no `/test`, e o job foi executado de verdade num container via `act` (`Job failed` com anotação `::error::`, depois `Job succeeded`). ⚠️ **nunca observado numa PR real do GitHub** |
| O mesmo comando roda local e no CI | ✅ `ci.yml:33` é literalmente o comando local; rodei os dois nesta auditoria com os mesmos números |
| Clone limpo, sem segredo, roda o pipeline até o fim | ✅ o workflow tem **zero** ocorrências de `secrets` (`grep -c secrets .github/workflows/ci.yml` → `0`) e `build` ficou fora do corte |

### Por que a spec **não** foi para `done`

Duas razões, nenhuma delas sobre a qualidade do que foi feito. **A re-auditoria de 2026-09-01 (segunda
rodada, depois dos commits) reavaliou as duas: a primeira está intacta, a segunda encolheu mas não caiu.**

1. **O mecanismo de bloqueio não está ligado.** O item 2 do corte diz "com falha **bloqueando o merge**".
   O que existe é um workflow que reporta e um **runbook** em `docs/SETUP.md:122-133` instruindo um humano
   a exigir o check `verify` no GitHub. Runbook é documentação, e documentação não é evidência de entrega.
   Marcar `done` afirmaria que merges são bloqueados quando nada bloqueia — a mesma classe de mentira que
   o backlog registra sobre o `docs/PAYMENTS.md`, cometida justamente na auditoria que existe para pegá-la.
   **Reconferido em `eed0fa2`:** `gh api repos/:owner/:repo/branches/main/protection` → **404 "Branch not
   protected"**. Nenhum required check configurado. Razão **inalterada**.
2. **O workflow nunca rodou no GitHub.** Esta razão era "nada foi commitado" e **mudou de forma**: os 29
   commits existem e a branch está publicada. Mas o arquivo chegou ao remoto **numa branch de feature**, e
   o gatilho (`pull_request` + `push` para `main`) não é sensível a isso. `gh run list` e
   `gh workflow list --all` voltam **vazios**: para a aba Actions do repositório, o workflow ainda não
   existe. "Existe no remoto" não é "roda no GitHub" — e é a execução, não o arquivo, que o item 1 do
   corte promete tornar visível antes do merge.

### O que falta para fechar (tudo ação humana)

Commitar e publicar **já foi feito** (`eed0fa2`, sincronizado com `origin`). Restam **dois passos, e eles
são encadeados** — a ordem não é preferência, é dependência técnica:

1. **Abrir a PR** de `ci/feat/github-actions-pipeline` para `main`. É isto que faz o workflow rodar **pela
   primeira vez**: o gatilho é `pull_request`, e nenhum push em branch de feature o dispara. A primeira
   execução fecha o sinal de pronto 1 de ponta a ponta (ver o check `verify` vermelho/verde numa PR real).
2. **Ligar a branch protection** pelo runbook de `docs/SETUP.md:122-133`, marcando **`verify`** como status
   check obrigatório em `main`. **Na prática, depende do passo 1**: a busca de required checks da UI só
   lista um check depois de tê-lo visto executar — é o que o passo 1 do runbook já adverte ("deixe o
   workflow rodar ao menos uma vez"). *(A API REST aceita um contexto arbitrário por nome, sem execução
   prévia; mas aí o nome é digitado sem conferência, e um `verify` com erro de digitação bloqueia todo
   merge para sempre esperando um check que nunca chega. Pelo caminho do runbook, abrir a PR antes não é
   zelo, é pré-requisito.)*

Depois dos dois, rodar `/spec --sync` → `done` + arquivar em `docs/features/ci-pipeline/spec.md`.

Só o passo 2 transforma "sinaliza" em "bloqueia". Sem os dois, o corte de MVP fica cumprido em **2 de 5
itens**, com 3 parciais — e os três parciais dependem exatamente desses dois passos, não de mais código.

## Perguntas em aberto

- CI deve bloquear merge (branch protection) ou apenas sinalizar? — **respondida (Q1, 2026-08-31):**
  bloquear, com runbook em `docs/SETUP.md`. Ligar a proteção é ação humana, fora da entrega — e é
  exatamente o que ainda não aconteceu.
- Incluir `build` no pipeline de PR ou só na branch principal? — **respondida (Q2):** fora deste corte.
  A medição do `/analyze` mostrou o `build` já vermelho por causa do cliente Stripe em escopo de módulo
  (corrigido no P10, `packages/payments/index.ts:14-24`), e `api#build` segue exigindo as três
  `FIREBASE_ADMIN_*` em secret — o que colidiria com o sinal de pronto do clone limpo.
- Adotar Remote Cache já no primeiro corte? — **respondida (Q3):** não.
- **Nova, aberta:** adicionar `permissions: contents: read` ao `ci.yml`? — recomendado pelo `/review` e
  reforçado pelo `/test`, **não aplicado** porque o YAML foi aprovado literalmente pelo usuário.
  **Recomendação:** aplicar — 2 linhas de hardening num arquivo que todo fork herda.
