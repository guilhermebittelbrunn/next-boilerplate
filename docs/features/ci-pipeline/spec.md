---
id: ci-pipeline
title: Pipeline de CI no GitHub Actions
status: done
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

- Nota: [`specs/research/engineering-baseline.md`](../../../specs/research/engineering-baseline.md)
- **Prática 1 (CI + Remote Caching)** — classificada como *padrão de facto*, e a nota a lista entre as
  quatro sem as quais nada mais se sustenta neste repo, citando explicitamente a ausência de `.github/`.
- **Prática 5 (cobertura)** — consolidada; limiar global alto vira teatro e relatório por workspace **não
  soma**, exigindo consolidação na raiz. **Prática 13 (dependências)** — padrão de facto; Renovate vence
  Dependabot em monorepo por agrupamento, e sem agrupamento vira 40 PRs/semana ignoradas.
- Armadilha central herdada do `envMode: loose` (prática 1): env não declarada produz **cache-hit com valor
  errado** — típico com `NEXT_PUBLIC_*`, que este repo usa em quantidade.

## Proposta — corte de MVP

> Marcação conferida **no código e na plataforma** em 2026-09-01 pelo `/spec --sync` (3ª rodada), não no
> `status` gravado. Evidência item a item em "Estado da entrega".

- [x] Toda PR e todo push na branch principal disparam verificação automática, com resultado visível no
      GitHub antes do merge. — *fechado nesta rodada. Os **dois** gatilhos executaram de verdade: run
      `33568291265` (`pull_request`, na PR #5) e run `33571925292` (`push` em `main`), ambos `success`.
      O check aparece com o nome **`verify`** na PR (check-run `100056398679`, `conclusion: success`), e
      `gh workflow list --all` agora devolve `CI  active  347941676`. A plataforma enumera, executa e
      exibe.*
- [~] A verificação cobre **lint/format** (Ultracite/Biome), **tipos** de todos os workspaces e **testes**,
      com falha bloqueando o merge. — *cobre os três e falha; **não bloqueia**: sem branch protection ligada,
      o CI sinaliza. Este item é o único que impede a spec de fechar — e deixou de ser hipótese: a **PR #5
      foi mergeada com a proteção desligada**.*
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

## Estado da entrega — auditado em 2026-09-01 (3ª rodada, pós-merge)

Feature: os artefatos do pipeline estão nesta mesma pasta ([`STATE.md`](STATE.md), [`analyze/`](analyze/),
[`develop/`](develop/), [`review/`](review/), [`test/`](test/)) · branch `ci/feat/github-actions-pipeline`,
mergeada pela PR #5. O pipeline `/analyze → /develop → /review → /test` fechou as quatro etapas.

**O código está em `origin/main`.** A **PR #5 foi aberta, verificada e mergeada**; `origin/main` está em
`5b56702` (`ci: verify lint, types and tests on every pull request (#5)`). A evidência abaixo está
**reancorada em `origin/main`**, não mais numa branch de feature: o `HEAD` local (`c6f2b35`) e `origin/main`
têm **a mesma tree** (`d5bdaaf66b0d6e481094bca65a03e729ec7fff51`), e `git diff HEAD origin/main` é vazio —
portanto os gates que rodei localmente medem, byte a byte, o conteúdo de `origin/main`. O merge foi squash,
então `HEAD` não é ancestral de `origin/main`; a igualdade que importa é a de conteúdo, e ela é exata.

**O workflow rodou — duas vezes, verde.** Esta é a mudança da rodada, e ela é grande:

| run | gatilho | ref | conclusão | duração |
|-----|---------|-----|-----------|---------|
| `33568291265` | `pull_request` (PR #5) | `ci/feat/github-actions-pipeline` | `success` | 1m35s |
| `33571925292` | `push` | `main` | `success` | 1m36s |

`gh workflow list --all` → `CI  active  347941676`. O check-run `100056398679` da PR se chama **`verify`**,
com `conclusion: success` — é exatamente o nome que o runbook manda exigir na branch protection, e agora
ele já foi visto executar, que era o pré-requisito da UI.

**O que isso não muda: nada bloqueia o merge.** Reconferido nesta rodada —
`gh api repos/guilhermebittelbrunn/next-boilerplate/branches/main/protection` → **404 "Branch not
protected"**. E a lacuna deixou de ser teórica: **a PR #5 foi mergeada com a proteção desligada**. Se o
`verify` tivesse ficado vermelho, nada teria impedido o merge. O mecanismo não foi testado por sorte — ele
não existe.

### Evidência por item do corte

| item | evidência conferida | veredito |
|------|---------------------|----------|
| PR e push na principal disparam verificação | `.github/workflows/ci.yml:3-6` (`on: pull_request` + `push: branches: [main]`), job `verify` (`:19-20`). **E executou**: runs `33568291265` (`pull_request`) e `33571925292` (`push` em `main`), ambos `success`; check-run `verify` visível na PR #5 | ✅ **implementado** — fechado nesta rodada |
| Cobre lint + tipos + testes | `ci.yml:39` → `pnpm turbo run lint typecheck test`. Re-medido **por mim** nesta auditoria, contra a tree de `origin/main`: `pnpm check` **392 arquivos, 0 erros / 0 warnings** · `turbo run lint typecheck test --force` **21/21 em 1m14s** · `turbo run typecheck --force` **13/13 em 32s** · `turbo run test --force` **7 tasks / 44 arquivos / 331 testes em 21s** (shared 1/15 · payments 1/8 · i18n 2/11 · auth 2/29 · web 1/15 · api 16/118 · app 21/135). Os quatro exit 0 | **parcial** — cobre e falha, mas **não bloqueia** |
| `lint` e `typecheck` viram tasks do turbo | `turbo.json:7-10` (`//#lint`, task da raiz) e `:11-15` (`typecheck`, `dependsOn: []`), ambas `outputs: []` | ✅ implementado |
| Envs das tasks declaradas | `env: []` em `//#lint` (`:9`), `typecheck` (`:14`) e `test` (`:28`); `globalDependencies` passa a incluir `**/.env` (`:3`) | **parcial** — `envMode: loose` (`:5`) segue global e `build` (`:16-25`) não declara env (decisão Q7, rota A) |
| `apps/web` entra na suíte | `apps/web/package.json:10` (script `test`), `apps/web/vitest.config.mts` (`environment: "node"`), `apps/web/__tests__/seo.test.ts` — **15 testes verdes** | ✅ implementado |

Placar: **3 de 5 implementados, 2 parciais** (era 2/5 com 3 parciais na 2ª rodada). O item que virou ✅ é o
da execução visível; os dois parciais restantes são a branch protection e o `envMode`, e só o **primeiro**
está no caminho crítico — o segundo foi decidido fora do corte (Q7, rota A).

### Sinais de pronto — conferidos

| sinal | veredito |
|-------|----------|
| Defeito de lint/tipo/teste/tradução deixa a verificação vermelha | ✅ **fechado nesta rodada, com uma ressalva honesta.** Os 4 defeitos deliberados derrubam o gate (reconferidos de forma independente no `/test`) e o job foi executado num container via `act` (`Job failed` com anotação `::error::`, depois `Job succeeded`). O que faltava era a metade *plataforma*, e ela veio: o workflow rodou sozinho em PR e em push, sem ninguém rodar nada à mão. **Ressalva:** as duas execuções reais foram **verdes** — uma PR real **vermelha** nunca foi observada. O vermelho está provado no gate, não no GitHub |
| O mesmo comando roda local e no CI | ✅ `ci.yml:39` é literalmente o comando local; rodei os dois nesta auditoria com os mesmos números |
| Clone limpo, sem segredo, roda o pipeline até o fim | ✅ o workflow tem **zero** ocorrências de `secrets` (`grep -c secrets .github/workflows/ci.yml` → `0`) e `build` ficou fora do corte. As duas execuções reais confirmam: o runner não recebeu segredo nenhum e completou |

Os **três sinais de pronto estão satisfeitos.** É esse fato que abre a discussão de status abaixo — e é
por isso que ela não é óbvia.

### A decisão de status — os dois lados

A 2ª rodada sustentou `in-progress` em duas razões. **A razão 2 caiu por completo** (o workflow rodou, duas
vezes, verde, visível numa PR real). **A razão 1 está intacta e ficou mais concreta.** Como os três sinais
de pronto agora estão satisfeitos, a pergunta deixou de ser factual e virou interpretativa:

> O corte pode ser dado por cumprido com os 3 sinais satisfeitos, sendo que o item 2 pede literalmente
> "bloqueando o merge" — e isso é **configuração de plataforma, não código**?

**A favor de `done`:**

- Os três sinais de pronto (`:120-124`) estão satisfeitos, e eles são a régua que a própria spec escreveu
  para dizer quando parar.
- Branch protection **não é versionável**. Não vive no repositório, não entra num commit, e **nenhum fork
  a herda** — quem clonar este repo começa com `main` desprotegida, faça o que este projeto fizer. Uma spec
  cuja entrega se mede pelo conteúdo do repositório talvez nunca possa "entregar" esse item, o que
  transformaria `in-progress` num estado permanente.
- O runbook existe (`docs/SETUP.md:122-133`) e agora é executável de fato: o check `verify` já foi visto
  executar, que era o pré-requisito da UI.

**Contra `done`:**

- O item 2 é **literal**: "com falha **bloqueando o merge**". Não bloqueia. Reconferido nesta rodada: 404
  "Branch not protected".
- A `/spec-audit` é explícita: **"documentação não é evidência"**. Um runbook é instrução para um humano,
  não mecanismo. Marcar `done` afirmaria um bloqueio inexistente — exatamente o padrão do `docs/PAYMENTS.md`
  que a tabela de achados do backlog condena. Cometê-lo *na auditoria que existe para pegá-lo* custaria a
  credibilidade do loop inteiro.
- **A evidência nova é desconfortável e decide o peso:** a **PR #5 foi mergeada com a proteção desligada**.
  O gap saiu do plano hipotético — um merge acabou de acontecer sem gate obrigatório. Se o `verify`
  estivesse vermelho, nada teria impedido. Não houve dano porque o CI estava verde, não porque havia
  proteção.

### A decisão tomada — `done` com o item 2 em aberto

A recomendação desta auditoria era **ligar a proteção antes de fechar**, e a alternativa honesta era
**emendar o item 2** separando código de plataforma. **O usuário decidiu, em 2026-09-01, fechar como `done`
mantendo o texto do item 2 como está.** Registrado aqui porque uma decisão contra a recomendação precisa
ficar rastreável — não anotada de lado.

⚠️ **Portanto, leia `status: done` desta spec como "o pipeline da feature terminou e a spec saiu do
backlog", NÃO como "os 5 itens do corte foram entregues".** O placar real, medido, é **3 de 5 implementados
e 2 parciais**, e o item 2 segue marcado `[~]` no corte acima — de propósito. As duas marcações convivem, e
a do corte é a que descreve o código.

**O que continua faltando, e não tem dono:**

> **Ligar a branch protection** em `main`, marcando **`verify`** como status check obrigatório
> (`docs/SETUP.md:122-133`). Enquanto isso não for feito, **o CI sinaliza e não bloqueia**: uma PR vermelha
> pode ser mergeada. Medido em 2026-09-01: `gh api …/branches/main/protection` → **404 "Branch not
> protected"**, e a **PR #5 foi de fato mergeada sem gate**.
>
> O passo está destravado — o `verify` já executou duas vezes, que era o pré-requisito da UI. Custa minutos.
> `e2e-testing` **herda a mesma pendência** no seu próprio item 2: ligar uma vez resolve as duas.

Como a spec sai do backlog, este parágrafo passa a ser o **único** lugar onde essa pendência vive. Não há
`/spec --sync` futuro que a traga de volta: uma vez arquivada, ela deixa de ser reconciliada contra o
código. Quem for mexer em CI neste repo deveria ler isto primeiro.

## Perguntas em aberto

- CI deve bloquear merge (branch protection) ou apenas sinalizar? — **respondida (Q1, 2026-08-31):**
  bloquear, com runbook em `docs/SETUP.md`. Ligar a proteção é ação humana, fora da entrega — e é
  exatamente o que ainda não aconteceu.
- Incluir `build` no pipeline de PR ou só na branch principal? — **respondida (Q2):** fora deste corte.
  A medição do `/analyze` mostrou o `build` já vermelho por causa do cliente Stripe em escopo de módulo
  (corrigido no P10, `packages/payments/index.ts:14-24`), e `api#build` segue exigindo as três
  `FIREBASE_ADMIN_*` em secret — o que colidiria com o sinal de pronto do clone limpo.
- Adotar Remote Cache já no primeiro corte? — **respondida (Q3):** não.
- Adicionar `permissions: contents: read` ao `ci.yml`? — **respondida e aplicada** (2ª rodada):
  `ci.yml:11-12`, no nível do workflow, antes de a PR abrir, para que a primeira execução já rodasse com o
  mínimo de privilégio.
- **Nova, aberta (3ª rodada) — as três actions apontam para Node.js 20, que está deprecado.** Só apareceu
  quando o workflow rodou de verdade: as duas execuções trazem a **mesma anotação de `warning`** (uma por
  run, em `.github`), e **nenhuma validação local pegou — nem o `act`**:

  > `Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on
  > Node.js 24: actions/checkout@v4, actions/setup-node@v4, pnpm/action-setup@v4.`

  Confirmado no código: `ci.yml:24` (`actions/checkout@v4`), `:29` (`pnpm/action-setup@v4`) e `:32`
  (`actions/setup-node@v4`). Confirmado na origem — o `action.yml` de cada tag declara o runtime:

  | action | no repo | runtime da major usada | 1ª major em `node24` | major mais recente hoje |
  |--------|---------|------------------------|----------------------|--------------------------|
  | `actions/checkout` | `@v4` | `using: node20` | **v5** | **v7.0.1** (2026-07-20) |
  | `actions/setup-node` | `@v4` | `using: 'node20'` | **v5** | **v7.0.0** (2026-07-14) |
  | `pnpm/action-setup` | `@v4` | `using: node20` | **v5** | **v6.0.10** (2026-08-03) |

  **Não é dívida sem data — o prazo é daqui a 22 dias.** O changelog do GitHub marca **2026-06-16** como o
  início do Node 24 por padrão (já em vigor: daí o "forced to run on") e **2026-09-23** como a remoção
  total do suporte a Node 20. Hoje é 2026-09-01. Como este é o **core de vários forks**, cada fork herda o
  `ci.yml` com as três actions vencendo na mesma data.

  **Recomendação:** subir as três. ⚠️ **`@v5` está desatualizado**: v5 é a *menor* major que corrige o
  aviso, mas as majors atuais são **v7 / v7 / v6**. Recomendo ir direto nas mais recentes
  (`actions/checkout@v7`, `actions/setup-node@v7`, `pnpm/action-setup@v6`) — mesma mudança de 3 linhas,
  sem precisar repetir o salto em poucos meses. Fonte primária:
  <https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/>.
  **Correção pontual num arquivo de CI, não requer spec.**
