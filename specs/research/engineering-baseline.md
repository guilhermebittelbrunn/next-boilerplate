---
topic: engineering-baseline
question: Qual é o baseline de práticas de desenvolvimento que um monorepo Turborepo + pnpm + Next.js + Firebase + Vercel precisa ter para ser production-ready em 2025–2026?
lens: dx
panel: [turborepo-docs, vercel-docs, playwright-docs, vitest-docs, firebase-docs, sentry-docs, stripe-docs, upstash-docs, t3-env, renovate-docs, changesets, lighthouse-ci]
collected: 2026-08-21
revalidate_after: 2027-02-21
confidence: alta
---

# Baseline de engenharia para o monorepo

## Resposta curta

Dezoito práticas formam o baseline. As **quatro sem as quais nada mais se sustenta** neste repo são:
**CI com cache do turbo** (não existe `.github/` hoje), **teste de regras do Firestore** (com Firebase, a
autorização *mora* nas rules — sem teste, é autorização não verificada), **paginação por cursor** (o
`offset` do Firestore cobra o que pulou) e **idempotência de webhook** (a Stripe entrega *at-least-once*).
As demais são incrementos com custo baixo.

## Prevalência

Aqui "prevalência" é **grau de consolidação** da prática, não contagem de starters.

| # | Prática (EN) | Consolidação | Esforço | Dor que evita |
|---|---|---|---|---|
| 1 | CI + Remote Caching | padrão de facto | M | CI lento; "passa local, quebra no CI" |
| 2 | Testes E2E | padrão de facto | M–G | regressão em login/checkout |
| 3 | Testes de security rules | **obrigatório com Firebase** | M | vazamento de dados entre usuários |
| 4 | Seed / dados de demo | consolidada | P–M | onboarding de dias; ambiente irreprodutível |
| 5 | Cobertura de teste | consolidada (limiar é opcional) | P | ilusão de suíte |
| 6 | Error tracking / tracing | padrão de facto | M | bug descoberto pelo cliente |
| 7 | Logs estruturados + request id | padrão de facto | P–M | incidente sem trilha |
| 8 | Validação de env vars | padrão de facto | P | deploy que cai por segredo faltando |
| 9 | Rate limiting | padrão de facto | P–M | brute force, spam, fatura estourada |
| 10 | Idempotência de webhook | **exigência do provedor** | M | cobrança/plano duplicado por retry |
| 11 | Paginação por cursor | padrão de facto no Firestore | M | custo linear de leituras |
| 12 | Versionamento / changelog | opcional-forte | P–M | breaking change silencioso no SDK |
| 13 | Atualização de dependências | padrão de facto | P | CVE parado meses |
| 14 | Preview deploy por PR | padrão de facto na Vercel | P | review sem ver rodando |
| 15 | Health / readiness | consolidada | P | deploy quebrado sem detectar |
| 16 | Feature flags | consolidada | M | deploy = release; rollback via revert |
| 17 | A11y automatizada (axe) | em consolidação | P–M | contraste/label quebrando em produção |
| 18 | Orçamento de performance | opcional-forte | M | landing degradando bundle a bundle |

## O que o mercado trata como o mínimo

**1. CI com cache remoto.** Jobs `lint`/`typecheck`/`test`/`build` orquestrados pelo `turbo` com Remote
Cache. Materializa em `.github/workflows/ci.yml` (`pnpm/action-setup`, `setup-node` com `cache: pnpm`,
`fetch-depth: 2`) + `turbo run …` com `TURBO_TOKEN`/`TURBO_TEAM`. **Armadilha:** env não declarada em
`env`/`globalEnv` do `turbo.json` gera **cache-hit com valor errado** — clássico com `NEXT_PUBLIC_*`.

**3. Testes de regras do Firestore.** `@firebase/rules-unit-testing` (`initializeTestEnvironment`,
`assertFails`/`assertSucceeds`) sob `firebase emulators:exec --only firestore`. **Armadilhas:** precisa de
`withSecurityRulesDisabled` para semear; cachear `~/.cache/firebase/emulators/` no CI evita baixar o JAR a
cada run; regra escrita só no console não vive no repo.

**8. Validação de env.** Schema único que falha **no build**, não no primeiro request (`@t3-oss/env-nextjs`,
separando `server`/`client`/`shared`). **Armadilha específica daqui:** chave privada do Firebase Admin com
`\n` escapado quebra o parse.

**9. Rate limiting.** Em serverless o contador **precisa** ser externo — `Map` em memória não limita nada.
`@upstash/ratelimit` + Redis, `slidingWindow`, 429 com `Retry-After`. IP na Vercel vem de
`x-forwarded-for`.

**10. Idempotência de webhook.** Verifique a assinatura, grave `event.id` com o id do documento = `evt_…`
usando `create()` (falha se existir) **dentro de transação**, e só então aplique o efeito. **Armadilhas:**
`SELECT`-depois-`INSERT` corre; se o handler enfileira job, a idempotência tem de estar no job também; o
body parser não pode consumir o raw body antes da verificação.

**11. Paginação por cursor.** `limit` + `startAfter(lastDoc)`/`endBefore` + `limitToLast`, devolvendo
`nextCursor` opaco no DTO. **Armadilhas:** cursor exige `orderBy` estável (tiebreaker por `__name__`);
filtro composto novo pede índice e **falha só em runtime**; "ir para a página 7" não existe nesse modelo — a
UI vira "carregar mais"/próxima-anterior.

## O que é opcional / avançado

**2. E2E.** Playwright em 5–10 fluxos, `webServer`, `--shard` em matriz + `merge-reports`, trace no fail.
Aponte para o **emulador**, não para o Firebase real. Sharding só quando um runner passa de ~10–15 min.

**5. Cobertura.** Vitest com `projects` (o antigo `workspace` está deprecado) e coverage v8 **na raiz** —
relatórios por workspace não somam. Com `projects`, configs por pacote **não podem** estender o config raiz.
Limiar global alto vira teatro; prefira limiar em pastas críticas.

**6. Observabilidade.** Sentry com `instrumentation.ts`, `withSentryConfig`, `onRequestError`. **Armadilha
grande:** Sentry v8+ configura OpenTelemetry sozinho e **conflita com `@vercel/otel`**, quebrando propagação
de trace — use `skipOpenTelemetrySetup: true`. `tracesSampleRate: 1.0` queima cota.

**7. Logs estruturados.** `pino` num pacote próprio, `requestId` propagado via `AsyncLocalStorage`.
**Armadilha:** `pino` **não roda no Edge Runtime**; e `headers()` é assíncrono no Next 15+, então o id entra
no contexto no início do handler. Nunca logar token/PII.

**14. Preview deploy.** Um projeto Vercel por app com Root Directory + `turbo-ignore`. **Armadilha
clássica:** o domínio efêmero `*.vercel.app` não está nos *Authorized domains* do Firebase Auth e o login
social falha com `auth/unauthorized-domain`; cookie de sessão com `domain` fixo também não cola no preview.

**15. Health/readiness.** Liveness + readiness separados. **Armadilha:** sem `dynamic = "force-dynamic"` o
Next pré-renderiza e o health **mente para sempre**; readiness público que enumera dependências e versões é
vazamento.

**16. Feature flags.** Flag avaliada **no servidor** (Flags SDK / Remote Config). Avaliar no cliente causa
layout shift e vaza a existência da feature; flag em Server Component interfere no cache estático; flag sem
data de remoção vira dívida permanente.

**17. A11y automatizada.** `@axe-core/playwright` no job de E2E, falhando em `critical`/`serious`. axe pega
~30–40% dos problemas reais — **não substitui** teste de teclado/leitor de tela. O que costuma quebrar não é
o componente Radix/shadcn, é o wrapper do time (label ausente, contraste do tema, `aria-label` sem
tradução). Comece com allowlist para não travar o repo no dia 1.

**12. Changesets** é opcional-forte aqui: com pacotes `private: true` e forks divergentes, o valor real é o
**changelog e a disciplina de breaking change no contrato do SDK**, não a publicação.

**13. Renovate** vence Dependabot em monorepo por causa de `packageRules` (agrupa por caminho e tipo de
bump). **Armadilha:** sem agrupamento você recebe 40 PRs/semana e ignora todos; automerge só com E2E
confiável; major do Next nunca em automerge.

**18. Orçamento de performance.** Lighthouse CI contra a URL de preview, `numberOfRuns: 3`. Preview
cold-start dá métrica flaky — trate LCP como aviso e mantenha o **erro** nas métricas estáveis (tamanho de
bundle, score de a11y/SEO).

## Custo herdado por todo fork

- **Zero custo em dinheiro:** CI (GitHub Actions em repo público/limite gratuito), emulador, seed, cobertura,
  validação de env, health, cursor, changesets, Renovate, axe, Lighthouse CI.
- **Requer conta/serviço:** Remote Cache do Turbo (Vercel), Sentry, Upstash Redis (rate limiting), Flags via
  Edge Config. Todos têm free tier, mas **todos adicionam env** — devem ser opt-in por variável ausente, no
  padrão que o repo já usa em `packages/security` (no-op sem `ARCJET_KEY`).

## Fontes

- <https://turborepo.dev/docs/guides/ci-vendors/github-actions> · <https://turborepo.dev/docs/crafting-your-repository/using-environment-variables> · <https://turborepo.dev/docs/guides/tools/vitest>
- <https://playwright.dev/docs/ci> · <https://playwright.dev/docs/test-sharding> · <https://playwright.dev/docs/accessibility-testing>
- <https://firebase.google.com/docs/firestore/security/test-rules-emulator> · <https://firebase.google.com/docs/rules/unit-tests> · <https://firebase.google.com/docs/emulator-suite/install_and_configure>
- <https://cloud.google.com/firestore/docs/query-data/query-cursors> · <https://firebase.google.com/docs/firestore/best-practices>
- <https://vitest.dev/guide/projects> · <https://vitest.dev/guide/coverage>
- <https://docs.sentry.io/platforms/javascript/guides/nextjs/opentelemetry/custom-setup/> · <https://vercel.com/docs/tracing> · <https://nextjs.org/docs/app/guides/open-telemetry>
- <https://getpino.io/#/docs/api> · <https://env.t3.gg/docs/nextjs>
- <https://github.com/upstash/ratelimit-js> · <https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html>
- <https://docs.stripe.com/webhooks> · <https://docs.stripe.com/api/idempotent_requests>
- <https://vercel.com/docs/deployments/environments> · <https://vercel.com/docs/monorepos/turborepo> · <https://firebase.google.com/docs/auth/web/google-signin>
- <https://flags-sdk.dev/> · <https://vercel.com/docs/flags/flags-sdk-reference>
- <https://pnpm.io/using-changesets> · <https://docs.renovatebot.com/configuration-options/>
- <https://github.com/treosh/lighthouse-ci-action> · <https://vercel.com/docs/speed-insights>
