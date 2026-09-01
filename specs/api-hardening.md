---
id: api-hardening
title: "Endurecimento da borda da API: headers/CSP, rate limit e CORS"
status: approved
value: alto
effort: M
audience: confianca
area: [apps/api, apps/app, apps/web, packages/security, packages/internationalization]
mode: ambos
depends_on: []
feature: -
updated: 2026-09-01
---

# Endurecimento da borda da API: headers/CSP, rate limit e CORS

## Problema

A API deste boilerplate está na internet com a porta encostada. Ela responde a **qualquer** origem, porque o
padrão do controle de origem é o coringa; não tem limite de requisições em lugar nenhum, nem nas rotas
públicas de login e cadastro, onde tentar senha em massa sai de graça; e nenhum dos três apps devolve
cabeçalho de segurança ao navegador, embora o pacote que os produz esteja instalado — só nunca foi ligado.
Cada fork nasce assim, e o dia em que alguém percebe costuma ser o de uma fatura inesperada ou de uma conta
invadida.

## O que já existe no repo

- `apps/api/proxy.ts:14-19` — a borda da API faz **apenas CORS**: `Access-Control-Allow-Origin` vem de
  `process.env.CORS_ORIGIN ?? "*"` (`:15`, coringa como default), com métodos amplos e allow-headers
  incluindo `x-role`, `x-locale` e os headers de contexto de auth (`:6-12`); preflight responde 204
  (`:22-25`) e o matcher cobre todas as rotas (`:34-36`). **Sem rate limit, sem Arcjet, sem nenhum
  cabeçalho de segurança.**
- `CORS_ORIGIN` **não passa pelo env tipado**: `apps/api/proxy.ts:15` lê o valor direto de `process.env`.
  Desde `firestore-admin-access` (2026-08-31) o `apps/api/env.ts:12-16` **deixou de ser vazio** — declara as
  três `FIREBASE_ADMIN_*` como server vars obrigatórias —, então o lugar certo para a variável entrar já
  existe; ela é que não entrou. Só existe documentada em `docs/SETUP.md:48`.
- **Efeito colateral a considerar no escopo:** como `env.ts` é importado por
  `app/(routes)/webhooks/payments/route.ts:6` e o `createEnv` valida eagerly, `pnpm --filter api build`
  hoje **exige** as três `FIREBASE_ADMIN_*`. Declarar `CORS_ORIGIN` como obrigatória repetiria esse efeito
  no build; declará-la opcional com default explícito, não.
- `packages/security/index.ts:12-18` — `secure(...)` é **NO-OP quando `ARCJET_KEY` falta** (chave declarada
  opcional em `packages/security/keys.ts`). **É o padrão de opt-in do repositório e o precedente a seguir.**
  Registra shield + detecção de bot (`:26-36`) e trata `isRateLimit()` na decisão (`:44`), mas **nenhuma
  regra de rate limit é registrada** em lugar algum.
- `packages/security/middleware.ts:4` re-exporta o middleware de cabeçalhos (nosecone) e `:8-15` define as
  opções **com CSP desabilitado** (`:14`).
- **Nenhum app usa esse middleware**: `grep` por `securityMiddleware`/`noseconeOptions` só encontra
  ocorrências dentro de `packages/security/`. O consumo de `@repo/security` se resume a `secure`:
  `apps/app/proxy.ts:42-56`, os layouts autenticados (`(common)/layout.tsx:2`, `(admin)/admin/layout.tsx:2`)
  e `apps/web/proxy.ts:19-38` — só quando `ARCJET_KEY` existe. A `apps/api` sequer declara o pacote. Também
  não há `headers()` em `packages/next-config/index.ts:4-7` nem em `apps/api/next.config.ts`. **Resultado:
  zero cabeçalho de segurança em produção, nos três apps.**
- `apps/api/app/(routes)/auth/sign-in/route.ts:4` — `POST` sem guard e sem limite; idem `sign-up` e
  `sign-in/google`. `apps/web/proxy.ts:40-76` faz só redirect de locale.
- **Lacuna:** origem coringa por padrão, zero limite de requisições, zero cabeçalhos de segurança.

## Evidência de mercado

- Notas: [`research/compliance-trust-baseline.md`](research/compliance-trust-baseline.md) ·
  [`research/engineering-baseline.md`](research/engineering-baseline.md)
- **Controle 13 — "Security headers + CSP"**: boa prática **OWASP A02**, esforço **P**, e a nota aponta
  exatamente `packages/security/middleware.ts` como o lugar onde se materializa. É o melhor custo/benefício
  da lista inteira: o código já está no repo, desligado.
- **Controle 16 — "Anti-abuso: App Check + rate limit"**: boa prática, esforço M, "App Check + rate limit na
  API". E **OWASP Top 10:2025** (versão corrente segundo a nota) traz **A02 Security Misconfiguration** como
  segundo item — configuração ausente é o caso de manual.
- **Prática 9 da nota de engenharia (rate limiting)**, padrão de facto: "Em serverless o contador
  **precisa** ser externo — `Map` em memória não limita nada". A nota indica `@upstash/ratelimit` + Redis,
  `slidingWindow`, 429 com `Retry-After`, e IP vindo de `x-forwarded-for` na Vercel. Isso **decide a forma**
  da solução: contador em memória, aqui, é ilusão de controle.
- Fontes: <https://owasp.org/Top10/2025/> (da nota) · <https://docs.arcjet.com/nosecone/quick-start>
  (referenciada no próprio `packages/security/middleware.ts:6-7`).

## Proposta — corte de MVP

- [ ] Os três apps passam a responder com cabeçalhos de segurança, **com CSP ativa** — hoje desligada.
- [ ] A origem aceita pela API deixa de ter coringa como padrão e passa pelo env tipado, falhando cedo em
      produção quando não configurada.
- [ ] As rotas públicas de autenticação ganham limite de requisições, com 429 e indicação de quando tentar
      de novo.
- [ ] O limite é **opt-in**: sem a variável do serviço externo, o app sobe e funciona — mesmo padrão de
      `ARCJET_KEY` em `packages/security/index.ts:12-18`.
- [ ] Um pedido bloqueado (origem, bot ou limite) é observável por quem opera o fork, e não some em silêncio.

### Fora do corte

- **Firebase App Check** (a outra metade do controle 16): atesta o cliente, exige configuração de projeto.
- Rate limit por usuário/plano e cota de uso — regra de produto, ligada a `billing-subscription`.
- Log estruturado e alerta sobre os bloqueios — `observability-logging`.
- WAF/proteção volumétrica e autenticação mútua entre apps.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Nenhum contrato novo; precisa tratar 429 como caso próprio, não erro genérico. |
| `apps/api` | Borda ganha cabeçalhos e limite; `CORS_ORIGIN` entra no env tipado. Nenhuma rota muda de forma. |
| `apps/app` | Cabeçalhos ativos; CSP pode exigir ajuste no que é carregado. Novo estado "muitas tentativas" na tela de login. |
| `apps/web` | Mesmos cabeçalhos; é a mais sensível a CSP por causa de scripts de marketing/analytics. |
| `packages/*` | `@repo/security` deixa de ser pacote parcialmente morto; i18n ganha a mensagem do limite. |
| Infra/env | Origem permitida obrigatória em produção; serviço externo de contagem **opcional**. |

## Riscos e trade-offs

- **Custo herdado por todo fork:** CSP quebra o que não estiver previsto. Hoje a Stripe é usada só no
  servidor (`packages/payments/index.ts:1`, `import "server-only"`) e não há script dela no cliente, mas quando
  `billing-subscription` levar o checkout ao navegador — e considerando PostHog/Vercel Analytics em
  `packages/analytics` — a política terá de liberar esses domínios. **A nota de conformidade não cobre esse
  detalhe**: é conclusão tirada do repositório, e o `/analyze` precisa levantar a lista real de origens.
- Fechar o CORS derruba integrações que hoje funcionam por acidente (ferramenta local, app mobile, preview
  em outro domínio). É a falha correta, mas aparece no dia 1 do fork.
- Rate limit distribuído exige serviço externo com custo, e a nota de engenharia é categórica quanto ao
  contador precisar ser externo. Um fork sem esse serviço fica sem proteção — daí a exigência de NO-OP
  explícito, nunca de fallback em memória fingindo funcionar. E limite mal calibrado bloqueia usuário
  legítimo atrás de NAT/IP compartilhado: começar permissivo e apertar é mais barato que o contrário.
- ✅ **Ordem — resolvida.** A redação original dizia: "enquanto `firestore-admin-access` não fechar,
  endurecer a borda é trancar a porta de uma casa com a parede aberta". **`firestore-admin-access` fechou
  em 2026-08-31** (rules `deny-all` publicadas, leitura REST direta → 403). A parede está de pé; trancar a
  porta agora é o movimento certo, e não mais paliativo.
- ✅ **Rede de segurança — nova.** Desde `ci-pipeline` existe um gate automático
  (`.github/workflows/ci.yml`, `pnpm turbo run lint typecheck test`). Isso importa aqui mais do que para a
  média das specs: CSP e CORS quebram **por regressão silenciosa**, num arquivo (`proxy.ts`) que ninguém
  reabre. Uma suíte que roda a cada PR é o que impede o endurecimento de ser desfeito sem ninguém ver.
  **Ressalva:** enquanto a branch protection não estiver ligada, o gate sinaliza e não bloqueia.

## Sinais de pronto

- Uma requisição de origem não autorizada é recusada, e o coringa não aparece mais em resposta de produção.
- Repetir tentativas de login além do limite devolve 429 com indicação de espera, e a tela mostra mensagem
  traduzida nos três idiomas — não um erro cru.
- As respostas dos três apps trazem cabeçalhos de segurança com CSP ativa, e nenhuma tela quebra por causa
  dela (verificado em claro/escuro e mobile).
- Um fork sem a variável do serviço de contagem sobe, funciona, e deixa claro que o limite está desligado.

## Perguntas em aberto

- Arcjet (já instalado, chave opcional) ou Upstash Redis (o que a nota de engenharia sugere) para o
  contador? — **recomendação:** Arcjet, por já estar no repo e seguir o padrão de opt-in; reavaliar se o
  limite por rota ficar caro.
- CSP em modo somente-relatório primeiro ou já bloqueando? — **recomendação:** somente-relatório na primeira
  entrega da `apps/web`, bloqueando nos demais apps.
- `CORS_ORIGIN` ausente em produção deve falhar o build ou cair para a origem do próprio app? —
  **recomendação:** falhar; foi exatamente o default silencioso que produziu o coringa de hoje.
