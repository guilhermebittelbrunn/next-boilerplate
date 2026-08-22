---
id: ci-pipeline
title: Pipeline de CI no GitHub Actions
status: proposed
value: alto
effort: M
audience: dx
area: [raiz, apps/api, apps/app, apps/web, packages/internationalization]
mode: ambos
depends_on: []
feature: -
updated: 2026-08-21
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
  nem configuração de Dependabot/Renovate. Também não há `vercel.json` nem `.husky/`.
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

- [ ] Toda PR e todo push na branch principal disparam verificação automática, com resultado visível no
      GitHub antes do merge.
- [ ] A verificação cobre **lint/format** (Ultracite/Biome), **tipos** de todos os workspaces e **testes**,
      com falha bloqueando o merge.
- [ ] `lint` e `typecheck` passam a ser tasks do turbo, para rodarem com cache e em paralelo — e para que
      `pnpm check`/`typecheck` local e CI executem exatamente a mesma coisa.
- [ ] As envs consumidas pelas tasks ficam declaradas, eliminando cache-hit com valor errado.
- [ ] `apps/web` entra na suíte (mesmo que com um teste mínimo), para deixar de ser o app não verificado.

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

## Perguntas em aberto

- CI deve bloquear merge (branch protection) ou apenas sinalizar? — **recomendação:** bloquear, alinhado
  à regra de nunca commitar direto em `main`.
- Incluir `build` no pipeline de PR ou só na branch principal? — **recomendação:** `build` só na principal
  no começo; em PR ele é o job mais lento e `test` já é pré-requisito dele (`turbo.json:8`).
- Adotar Remote Cache já no primeiro corte? — **recomendação:** não; é a única peça que arrasta conta e
  env, e o ganho só aparece com o CI já estável.
