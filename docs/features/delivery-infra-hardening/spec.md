---
id: delivery-infra-hardening
title: Core aprovado na parte 2 da entrega (infra e hardening)
status: done
value: alto
effort: M
audience: confianca
area: [.github, apps/web, apps/api, apps/app, packages/security, packages/next-config, docs]
mode: ambos
depends_on: []
contends_on: [.github/workflows/ci.yml, apps/web/env.ts, apps/web/proxy.ts, apps/app/proxy.ts, packages/security/middleware.ts, packages/next-config/brand.ts, apps/app/next.config.ts]
feature: delivery-infra-hardening
updated: 2026-11-23
---

# Core aprovado na parte 2 da entrega (infra e hardening)

## Problema

A parte 2 da [etapa de entrega](../../delivery/README.md),
[infra e hardening](../../delivery/02-infra-hardening.md), confere 20 controles que precisam estar
ligados em produção. Metade deles depende de console (GitHub, Vercel, Firebase, Arcjet, Stripe, Resend) e
está coberta pelo [prompt do Claude Cowork](../../delivery/cowork-infra-prompt.md). A outra metade é do
repositório, e ali o core tem lacunas que todo fork herda: nenhuma varredura de segredo nem de dependência
roda sozinha, o bloqueio de bot da landing nunca executa, e faltam cabeçalhos. O próprio repositório de
referência, que é público, tem um alerta de segredo aberto desde abril.

## O que já existe no repo

Medido em 2026-11-19 sobre `583194b`, com `gh api` só de leitura no GitHub.

- **Cabeçalhos** — o nosecone emite HSTS de um ano com `includeSubDomains`, `nosniff`,
  `Referrer-Policy: no-referrer`, `frame-ancestors 'none'`, COOP e CORP
  (`packages/security/middleware.ts:54-139`); CSP bloqueante no painel e na API, `Report-Only` na landing.
  **Lacuna:** sem `Permissions-Policy`; `X-Powered-By: Next.js` nos três apps (nenhum `poweredByHeader`, item
  que fica com a fatia 1 de [`delivery-security-review`](../delivery-security-review/spec.md), entregue pela PR #64:
  `packages/next-config/index.ts:5`);
  a CSP `Report-Only` da landing não tem destino de relatório; o matcher dos proxies exclui `/api/*`
  (`apps/app/proxy.ts:127`, `apps/web/proxy.ts:61`), então as rotas de sessão das front-ends saem sem
  cabeçalho.
- **Rules ("RLS")** — `firestore.rules:32-34` e `storage.rules:27-29` em `deny-all`, testadas no emulador
  no CI (`apps/api/__tests__/firestoreRules.emulator.test.ts`, `storageRules.emulator.test.ts`). Sem
  lacuna no repositório; o fork precisa publicar (item 2.4).
- **Bot protection** — **lacuna:** na landing, `secure()` do Arcjet nunca roda: `skipValidation: true`
  (`apps/web/env.ts:36`) faz o `createEnv` devolver o `runtimeEnv` antes de juntar o `extends`, e
  `env.ARCJET_KEY` chega `undefined` em `apps/web/proxy.ts:67` mesmo com a chave preenchida. Na API, só
  `slidingWindow`, sem `shield` nem `detectBot` (`packages/security/index.ts:52-83`, era `:45-55` até a PR #64, que separou os orçamentos `strict` e `standard`). Sem App Check.
- **Segredos no Git** — `.gitignore:64,144-148` cobre `.env` e `.env.local`. **Lacuna:** `.env.production`,
  `.env.development` e JSON de service account (`*-firebase-adminsdk-*.json`) não estão ignorados; nenhum
  `gitleaks`/`trufflehog` no CI nem em hook.
- **Repositório de referência** — público (`gh repo view`); alerta de secret scanning #1, tipo
  `google_api_key`, aberto desde 2026-04-04, apontando para o commit `1e94b7c8`, que está em `origin/main`.
  Push protection ligado; non-provider patterns e validity checks desligados.
- **Dependências** — sem `.github/dependabot.yml`, sem Renovate, sem `pnpm audit` nem CodeQL no CI; os
  alertas do Dependabot estão desligados no repositório. `pnpm.overrides` (`package.json:49-54`) não trata
  CVE. *(Desde a PR #64, `package.json:55-66`: o override do `zod` corrige um aviso, e `pnpm.auditConfig.ignoreGhsas`
  registra a exceção do `@grpc/grpc-js`, justificada no campo `"//"` (`:2-7`). Medido em 2026-11-23, sobre `388a453`:
  `pnpm audit --prod --audit-level=high` sai 0, então o job do item 2 pode usar `high` em vez de `critical` sem
  reprovar a primeira PR. A escolha é do `/analyze`. O CI segue sem `pnpm audit`, sem Dependabot e sem CodeQL.)*
- **CI** — `permissions: contents: read`, gatilho `pull_request` e nenhum segredo
  (`.github/workflows/ci.yml:11-12`). **Lacuna:** actions referenciadas por tag, não por SHA (inclusive a de
  terceiro `pnpm/action-setup`); `main` sem proteção (`gh api …/branches/main/protection` responde 404,
  rulesets vazios).
- **HTTPS** — `http://` só no ramo de emulador. **Lacuna:** o logo da marca aceita `http:`
  (`packages/next-config/brand.ts:31`), o que gera conteúdo misto.
- **Otimizador de imagem** — `apps/app/next.config.ts:19` usa `images.domains`, deprecado, com
  `www.google.com` sem uso; `storage.googleapis.com` sem `pathname` (`:27`) deixa o otimizador servir objeto
  público de qualquer bucket.
- **Chave web do Firebase** — nenhum documento manda restringir a chave do navegador por referenciador nem
  separar a chave do servidor. `docs/FORKING.md:305` (era `:287` antes da PR #63) manda pôr as chaves da Resend na `web`, que não as usa
  desde que o contato passou pela API.

## Evidência de mercado

- Firebase: chaves restritas aos serviços do Firebase "do not need to be treated as secrets", e a
  documentação recomenda aplicar restrição de API (<https://firebase.google.com/docs/projects/api-keys>).
  App Check protege o backend de clientes não autorizados (<https://firebase.google.com/docs/app-check>).
- GitHub: push protection bloqueia push com segredo; o Dependabot abre PR de atualização de segurança
  (<https://docs.github.com/en/code-security/secret-scanning/introduction/about-push-protection>,
  <https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/about-dependabot-security-updates>).
- Gitleaks varre o histórico, não só o estado atual (<https://github.com/gitleaks/gitleaks>). O README
  dele diz que o projeto está "feature complete" e que o foco migrou para o Betterleaks; continua
  utilizável, mas a escolha da ferramenta fica para o `/analyze`. A action oficial
  (<https://github.com/gitleaks/gitleaks-action>, aberta em 2026-11-23) exige a variável `GITLEAKS_LICENSE` em
  repositório de organização, com uma chave gratuita cadastrada no site do projeto; em conta pessoal, não. O
  repositório de referência é de conta pessoal (`gh api users/<dono>` → `User`), mas um fork criado numa
  organização herdaria esse cadastro. Rodar o binário de linha de comando direto no job não pede chave.
- HSTS preload exige `max-age` ≥ 31536000, `includeSubDomains` e `preload` (<https://hstspreload.org/>).
- Arcjet bloqueia bots desnecessários e quem finge ser bot bom
  (<https://docs.arcjet.com/bot-protection/concepts>).
- OWASP Top 10 2025, A02 Security Misconfiguration e A03 Software Supply Chain Failures
  (<https://top10.owasp.org/2025>). Renovate e Lighthouse CI já aparecem em
  [`research/engineering-baseline.md`](../../../specs/reference/research/engineering-baseline.md).
- Todas as URLs acima foram abertas em 2026-11-19.

## Proposta — corte de MVP

- [x] **Varredura de segredo no CI**: um job que roda `gitleaks` (ou equivalente) no diff da PR e reprova
      com segredo; `.gitignore` cobrindo `.env*` (menos `.env.example`) e JSON de service account.
- [x] **Varredura de dependências que roda sozinha**: `.github/dependabot.yml` para `npm` (pnpm) e
      `github-actions`, com atualizações agrupadas, e um job de `pnpm audit --prod --audit-level=critical`
      que reprova a PR.
- [x] **Actions pinadas por SHA**, com a versão em comentário, e o Dependabot cuidando das atualizações.
- [x] **Bloqueio de bot da landing funcionando**: a chave do Arcjet chega ao proxy da `web` (o
      `skipValidation` deixa de engolir o `extends`), com um teste que prova que `secure()` roda quando a chave
      existe.
- [x] **Cabeçalhos completos**: `Permissions-Policy` restritiva no `@repo/security`, e cabeçalhos também
      nas rotas `/api/auth/*` das front-ends. Tirar o `X-Powered-By` era da fatia 1 de
      [`delivery-security-review`](../delivery-security-review/spec.md), entregue pela PR #64.
- [x] **Logo da marca só em `https:`** e `images.remotePatterns` do painel restrito ao bucket do produto.
- [x] **Guia das chaves do Firebase** em `docs/FORKING.md`: chave do navegador com referenciador e API,
      chave do servidor só com API; e a correção da seção da Resend.

### Fora do corte

- **App Check.** Exige mudança no cliente e no servidor e tem custo de reCAPTCHA Enterprise acima da
  faixa gratuita; fica documentado como opção na parte 2 e vira spec se um fork precisar.
- **CSP bloqueante na landing com destino de relatório.** Depende de escolher um coletor (serviço externo
  ou rota própria); continua no item 10 do `PRE-PRODUCTION.md`.
- **CodeQL.** Ligar é configuração de console (prompt do Cowork); o core não precisa de arquivo para isso.
- **Ações no repositório de referência** (rotação da chave do alerta #1, proteção da `main`, Dependabot
  ligado): são console, não código, e não esperam esta spec. Estão em "Perguntas em aberto".

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Nenhum. |
| `apps/api` | `shield` no limitador, se a decisão abaixo confirmar. |
| `apps/app` | `images` restrito; cabeçalhos em `/api/auth/*`. |
| `apps/web` | Correção do `env.ts` para o Arcjet rodar; cabeçalhos em `/api/auth/*`. |
| `packages/*` | `security` (`Permissions-Policy`), `next-config` (`https:` no logo). |
| Infra/env | Dois jobs novos no `ci.yml`, `.github/dependabot.yml`, `.gitignore`. Nenhuma variável nova. |

## Riscos e trade-offs

- **Bloqueio de bot ligado de verdade** pode barrar crawler de preview de link e monitor de uptime. A lista
  de permissões do `secure()` já cobre buscadores, previews e monitores; o teste precisa conferir que um
  navegador comum e o Googlebot passam.
- **`pnpm audit` reprovando a PR** trava o time quando sai uma CVE nova sem correção. O nível
  `critical` e uma lista de exceções com prazo reduzem o atrito.
- **Gitleaks com falso positivo** nas fixtures de teste (PEM falso). Uma allowlist versionada resolve.
- **Custo herdado pelo fork:** nenhum serviço pago; Dependabot e secret scanning são gratuitos em
  repositório público e no GitHub Advanced Security dos planos que o incluem.

## Sinais de pronto

- Uma PR com uma chave falsa no formato da Stripe reprova no CI.
- Uma PR que adiciona uma dependência com CVE crítica reprova no CI.
- `curl -A python-requests` na landing devolve 403 com a `ARCJET_KEY` preenchida.
- `curl -I` nos três apps mostra `Permissions-Policy`.
- Rodar a parte 2 contra o core termina sem 🔴 nos itens de repositório (2.2, 2.12, 2.15, 2.18, 2.20).

## Perguntas em aberto

- **O que fazer agora com o alerta #1 do repositório de referência?** — **recomendação:** restringir a
  chave no Google Cloud (ou rotacioná-la, se não houver como saber onde ela foi usada), conferir que o
  login segue funcionando, e fechar o alerta como "revoked". Não depende desta spec.
- **Proteger a `main` do repositório de referência?** — **recomendação:** sim, já, com o ruleset descrito no
  item 2.7 da parte 2. O CI já tem os checks `verify` e `e2e`.
- **Shield do Arcjet na API?** — **recomendação:** sim, no mesmo `checkRateLimit`, em modo `LIVE` só depois
  de uma semana em `DRY_RUN` num fork em produção.
- **Dependabot ou Renovate?** — **recomendação:** Dependabot, porque não precisa de app externo e o fork
  herda só um arquivo.
- **Varredura de segredo pela action do Gitleaks ou pelo binário?** — **recomendação:** pelo binário (ou
  equivalente sem cadastro), chamado direto no job. A action pede uma chave de licença, gratuita, em todo
  repositório de organização, e isso viraria um segredo a mais para cada fork configurar.

## Entrega conferida em 2026-11-23

Entregue pela PR #65 (`afb5b35`, mergeada em 2026-11-23 às 12:58 UTC, 13 commits de `feat/delivery-infra-hardening`).
A execução de merge do CI (`gh run 45179347409`) passou nos seis jobs: `changes`, `verify`, `secrets`, `audit`,
`coverage` e `e2e`. A auditoria conferiu os sete itens do corte no código de `main`:

| item | veredito | o que o código mostra |
|------|----------|-----------------------|
| 1. Varredura de segredo | implementado | job `secrets` (`.github/workflows/ci.yml:55-95`): Gitleaks 8.30.1 baixado da release com SHA-256 fixado no próprio arquivo, sobre os commits da PR ou do push. `.gitignore:64-66` ignora `.env*` (menos `.env.example`) e `*-firebase-adminsdk-*.json` |
| 2. Dependências | implementado | `.github/dependabot.yml` para `npm` e `github-actions`, semanal, com grupos de `minor` e `patch` por tipo de dependência; job `audit` com `pnpm audit --prod --audit-level=high` (`ci.yml:97-113`) |
| 3. Actions por SHA | implementado | os 21 `uses:` do `ci.yml` estão pinados por SHA de 40 caracteres, com a versão em comentário |
| 4. Bloqueio de bot da landing | implementado | `apps/web/env.ts` sem `skipValidation`, então `env.ARCJET_KEY` chega ao `secure()` (`apps/web/proxy.ts:71-88`). Testes: `apps/web/__tests__/webEnvArcjet.test.ts:19` e `proxyBotProtection.test.ts:55-90` |
| 5. Cabeçalhos | implementado | `PERMISSIONS_POLICY` em `packages/security/middleware.ts:25-26`, gravado por `applySecurityHeaders` (`:167`); `/api/*` das front-ends passa pelo proxy e recebe os cabeçalhos (`apps/app/proxy.ts:198-200`, `apps/web/proxy.ts:93-99`) |
| 6. Logo e otimizador | implementado | `toHttpsUrl` aceita só `https:`, e `http:` apenas em loopback (`packages/next-config/brand.ts:23-46`); `apps/app/next.config.ts:21-39` troca `images.domains` por `remotePatterns`, com `storage.googleapis.com` restrito a `/<bucket>/**` |
| 7. Guia das chaves | implementado | `docs/FORKING.md` §4, passo 8 (`:217-224`), e a seção da Resend (§7.1, `:316-317`) com as chaves só na `api`; o fork tem a caixa no `PRE-PRODUCTION.md` §17 |

O `/test` fechou com 12 ✅, 0 ❌ e 3 🔒, os três dependentes do GitHub. Medidos depois do merge: os jobs `secrets` e
`audit` rodaram verdes no merge e nas cinco PRs que o Dependabot abriu no mesmo dia (#66 a #70), e essas PRs mexem
nos `package.json` dos workspaces, o que responde a dúvida sobre o `directory: /` cobrir o monorepo. Seguem sem
medição no runner a PR com segredo reprovando e a dependência com CVE alta reprovando; a prova local das duas está em
`test/report.md`. O sinal "`curl -A python-requests` devolve 403" foi medido em `next start` com
`ARCJET_ENV=development`; em produção, depende da `ARCJET_KEY` de cada fork.

**Deriva:** cinco diferenças, todas registradas no plano e aceitas na revisão.

- O job `audit` reprova em `high`, não em `critical`. A spec deixava a escolha para o `/analyze`, e o `pnpm audit
  --prod` saía 0 no dia.
- O Gitleaks varre só os commits novos, não o histórico. O histórico de `main` já guarda a chave do alerta #1 de
  secret scanning, e uma varredura completa reprovaria o primeiro push de todo fork.
- O bloqueio de bot só decide localmente com `ARCJET_ENV=development`; sem isso o Arcjet não tem IP e deixa passar.
  Está escrito no `docs/FORKING.md` §7.3 e no item 2.12 da parte 2.
- O `shield` entrou nos dois orçamentos da API em `DRY_RUN` (`packages/security/index.ts:28`, `:68`, `:82`), como a
  pergunta em aberto recomendava. Passar para `LIVE` é a caixa nova do `PRE-PRODUCTION.md` §8.
- Os proxies passaram a atender `/api/*` com uma resposta cedo, em vez de o matcher excluir o caminho.

O `contends_on` declarava sete arquivos, e a PR tocou os sete. Fora da lista, tocou mais 19 fora de `docs/features` e
`specs`: testes, os documentos e o `packages/security/index.ts`.
