---
slug: delivery-product-quality
title: "Core aprovado na parte 3 da entrega, fatia 1 (og:image, 404 e noindex)"
task: -
spec: delivery-product-quality
branch: feat/delivery-product-quality
epic: -
updated: 2026-11-23 12:58
---

# Pipeline — Core aprovado na parte 3 da entrega, fatia 1 (og:image, 404 e noindex)

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-23 11:14 | analyze/plan.md | Fatia 1 da spec em quatro itens: `og:image` estática por idioma com `next/og` e `openGraph.images` declarado em `buildLocaleMetadata` (hoje nenhuma página emite `og:image`, porque o `openGraph` da página substitui o do layout); 404 traduzido da landing (`[...rest]` + `not-found.tsx` + validação do segmento `[locale]`, que também fecha o 🟡 do `/favicon.ico`); rota coringa da API com `ROUTE_NOT_FOUND`; opção `noIndex` em `applySecurityHeaders` ligada no `app` e na `api`, e `noindex` por metadata em login e cadastro da landing. Zero dependência e zero env nova. 11 decisões tomadas por padrão (Q1 a Q11) |
| develop | done    | 2026-11-23 11:30 | develop/handoff.md | Fatia 1 implementada: `noIndex` em `applySecurityHeaders` (ligado no `app` e na `api`), rota coringa da API com `ROUTE_NOT_FOUND`, `og:image` gerada por `next/og` e declarada em `buildLocaleMetadata`, 404 traduzido da landing com validação do `[locale]` (o plano B não foi preciso), `noindex` em login e cadastro. Gates verdes e smoke em `next start`. Achado: o 404 da landing sai sem SSR (`__next_error__`), comportamento do Next |
| review  | done    | 2026-11-23 12:41 | review/review.md | Duas rodadas. Rodada 1: nenhum bloqueante, branch `feat/delivery-product-quality` criada e validada, 404 sem HTML no servidor explicado lendo o Next (o renderizador do servidor não executa error boundaries). Rodada 2: o 404 ganhou `<title>` traduzido no próprio componente, porque a metadata do `not-found.tsx` só chega ao shell de erro; teste unitário e asserções no E2E. Regressão do HTML confirmada pelo `/test` e mantida como decisão do usuário (recomendação: aceitar). Gates verdes, 14 commits planejados |
| test    | done    | 2026-11-23 12:58 | test/report.md  | Duas rodadas, placar final 11 ✅, 0 ❌, 1 🔒 (validador de Open Graph). Rodada 1, em build de produção: o HTML do servidor do 404 da landing regrediu em relação a `main` (404 com `<h1>` → `__next_error__` vazio), com JS o cartão traduzido aparece nos 3 idiomas, light, dark e 390 px, e a opção `Suspense` dá 200. Rodada 2: o `<title>` do 404 sai traduzido nos 3 idiomas, com um só `<title>`, e o E2E do 404 passa com `toHaveTitle` e axe. `pnpm test` verde; `pnpm e2e` 30/31, a falha (`organizationOwnership`) também falha em `main` |
| observe | pending | -                | -               | - (opcional) |

## Notas

### Origem

- Spec `specs/delivery-product-quality.md` (`status: approved`), **só a fatia 1** (linhas 99-107). As fatias 2
  e 3 e o "Fora do corte" ficam fora. Não editar a spec: arquivá-la é do `/spec --sync`, e só quando as três
  fatias estiverem entregues.
- Rodou em modo autônomo dentro do `/cycle`. Nenhuma pergunta feita; decisões em `analyze/plan.md` →
  "Perguntas em aberto (decididas por padrão)".

### Para o `/develop`

- Nenhuma dependência nova: a imagem usa `next/og`, que já vem no `next` 16.4.6.
- A assinatura de `applySecurityHeaders` muda (terceiro parâmetro vira objeto). Ajustar as chamadas da `web`
  sem ligar `noIndex` nela.
- Cuidado com import circular entre `shared/lib/seo.ts` e o novo `shared/lib/openGraph.ts` (`plan.md` §10.3).
- Nenhum comentário de código cita plano, etapa ou spec. O comentário sobre as cores em hex da imagem explica a
  restrição do renderizador, não a origem da decisão.

### Pré-requisitos manuais de infra (não reprovam o `/test`)

- Validadores de Open Graph exigem a landing publicada num domínio.
- `noindex` nas previews da Vercel é configuração do projeto na Vercel, não código.
- `NEXT_PUBLIC_WEB_URL` em produção, senão a `og:image` aponta para localhost.
- Detalhe em `analyze/plan.md` §11.

### Para o `/test`

- Medir em `build && start`, não em `next dev`. Roteiro V1 a V9 em `analyze/plan.md` §8.
- V8 confirma o 404 de idioma inválido (`/favicon.ico`, `/api`), que vem de `notFound()` no root layout. Se
  der 500 ou 200, o plano B está em §10.5.

### Do `/develop`

- Desvios: `CardTitle` é `div`, então o 404 ganhou um `<h1>` dentro dele; `openGraphImageUrl` ficou em `seo.ts`
  para não criar import circular. Detalhe em `develop/handoff.md`.
- O `/test` começa pela lista "A verificar no `/test`" do handoff: o 404 no navegador (o HTML do servidor sai
  vazio) e o V5 no `app`, que só o teste unitário cobre por enquanto.

### Do `/review`

- Branch `feat/delivery-product-quality`, criada a partir de `guilhermebittelbrunn/cycle-command-v12` (mesmo commit
  de `origin/main`), nome validado pelo regex.
- O `/test` começa pela lista "Verificar no `/test`" do `review/review.md`. Os dois primeiros itens medem o HTML do
  404 com idioma válido nesta branch e em `main`.
- O critério de idioma inválido promete "a página padrão do Next"; pela leitura, o HTML sai vazio e o navegador deve
  ficar em branco. O status 404 não muda.
- O índice tem o rename da spec arquivada. O plano de commits manda tirá-lo do índice antes do commit 1 e devolvê-lo
  no commit `docs(specs)`.

### Do `/test`

- O 404 da landing com idioma válido sai do servidor como `<html id="__next_error__">` sem `<h1>`; em `main`, o
  mesmo endereço sai com `<h1 class="next-error-h1">404</h1>`. Com JS, o cartão traduzido aparece dentro do layout.
  A opção (b) do `/review` (`Suspense` em volta do `children`) foi medida num worktree temporário e responde 200,
  então está descartada. A decisão (a) continua com o usuário.
- Na rodada 1 o 404 da landing não tinha `<title>` (WCAG 2.4.2). Fechado na rodada 2.
- `organizationOwnership.spec.ts` falhou por tempo na suíte completa, isolado nesta branch e isolado em `main`. Não
  é regressão desta fatia.
- `apps/e2e/tests/landing.spec.ts` ganhou dois testes, que entram no plano de commits (sugestão: junto do commit 8,
  ou num `test(e2e)` próprio).
- Rodada 2: `apps/web/app/[locale]/not-found.tsx` passou a renderizar `<title>` (título traduzido e marca). O `/test`
  remede `document.title` nos três idiomas e roda o E2E do 404, que agora chama `toHaveTitle` e `expectAccessible`.
- Resultado da rodada 2: `document.title` = `Página não encontrada | next-boilerplate`, `Page not found | next-boilerplate`
  e `Página no encontrada | next-boilerplate`, com um único `<title>` no `<head>`. `/favicon.ico` continua com
  `404: This page could not be found.`, mais um segundo `<title>` vindo da metadata da home (🟢, backlog).
  `pnpm --filter web test` 288/288. E2E do 404 verde com `toHaveTitle` e `expectAccessible`.
