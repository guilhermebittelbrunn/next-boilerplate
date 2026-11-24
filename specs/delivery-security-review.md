---
id: delivery-security-review
title: Core aprovado na parte 1 da entrega (validação de segurança)
status: approved
value: alto
effort: G
audience: confianca
area: [apps/api, apps/app, apps/web, packages/auth, packages/security, packages/shared, packages/sdk]
mode: ambos
depends_on: []
contends_on: [apps/api/proxy.ts, apps/web/proxy.ts, apps/app/proxy.ts, packages/auth/session.ts, packages/auth/session-routes.ts, packages/auth/server.ts, packages/shared/utils/helpers/cookies.ts, apps/api/instrumentation.ts]
feature: delivery-security-review
updated: 2026-11-23
---

# Core aprovado na parte 1 da entrega (validação de segurança)

## Problema

A [etapa de entrega](../docs/delivery/README.md) passa a exigir de todo fork a parte 1,
[validação de segurança](../docs/delivery/01-security-review.md), com 19 itens. O core resolve a maior
parte deles por desenho, mas, medido hoje, reprova em alguns e passa raspando em outros. O caso mais
urgente é o de dependências: `pnpm audit --prod` acusa 8 vulnerabilidades críticas e 120 altas, parte delas
no runtime da API. Um fork criado agora herda essas lacunas e precisaria corrigi-las na própria entrega,
cada um de um jeito. Corrigir no core uma vez é mais barato e mais seguro.

## O que já existe no repo

Medido em 2026-11-19 sobre `583194b`, só leitura.

**Itens aprovados**, com a evidência que a parte 1 pede:

- Validação no back-end: 26 handlers leem o corpo por `parseRequestJson` (100 KiB,
  `apps/api/(shared)/lib/parse-request-json.ts:5`) e validam com Zod; o comando de busca por rota sem Zod
  sai vazio.
- Injeção NoSQL: `where`/`orderBy` só com campo literal
  (`apps/api/(shared)/repositories/base.repository.ts:101-103`); cursor validado
  (`apps/api/(shared)/lib/pagination.ts:35-53`).
- IDOR: escopo por organização (`apps/api/app/(routes)/entities/[id]/route.ts:28-30`) e por dono; os
  cabeçalhos de painel do SDK são conferidos no servidor (`apps/api/(shared)/lib/auth-request-context.ts:94-126`).
- Senha e segredo no banco: senha só no Firebase Auth; token de convite como SHA-256
  (`apps/api/(shared)/lib/organization-invitation.ts:24,28`).
- SSRF: o servidor só chama hosts fixos (`apps/api/(shared)/lib/firebase-identity-toolkit.ts:80-210`).
- CORS: allowlist sem coringa (`apps/api/(shared)/lib/cors.ts:30-41,69-83`).
- Validação no front: 23 de 24 `useForm` usam `zodResolver`; bloqueio durante o envio nos formulários
  principais (`packages/design-system/components/ui/button.tsx:72`).
- Nenhuma variável secreta com prefixo `NEXT_PUBLIC_`.

**Lacunas**, por item da parte 1. As cinco primeiras (1.13, 1.15, 1.8, 1.14 e 1.12) foram fechadas pela fatia 1, na
PR #64; o texto delas descreve o código de `583194b` e as âncoras são daquela versão. As outras seguem abertas e
foram reconferidas em `388a453`.


- **1.13 Dependências vulneráveis** — `pnpm audit --prod`: 8 críticas, 120 altas, 115 moderadas. `axios`
  1.13.5 direto no SDK (`packages/sdk/package.json:10`), 12 altas, corrigido a partir de 1.20.0;
  `firebase-admin` 13.6.0 traz `protobufjs` (crítica, execução de código), `fast-xml-parser` (crítica),
  `node-forge` e `jws`; `next` 16.4.3 tem 2 moderadas corrigidas em 16.4.5 (o próprio `next dev` avisa no
  boot); `@arcjet/next` traz `undici` (5 altas). O `next` 15 do preview de e-mail (`apps/email`) soma 4
  críticas, mas só roda localmente.
  *(Remedido na auditoria de 2026-11-19, sobre `c9b4d9c`: os números batem, e as 8 críticas são 4 do `next` 15 do
  preview, 1 de `protobufjs` e 1 de `fast-xml-parser`, as duas pelo `firebase-admin`, e mais duas que este item não
  citava: `websocket-driver`, pelo `firebase-admin` (`@firebase/database-compat` → `faye-websocket`), e
  `proxy-addr`, pelo `@stripe/agent-toolkit` de `packages/payments/package.json:11`. Esse pacote só é importado por
  `packages/payments/ai.ts`, que nenhum app nem pacote importa fora dos testes. O `@react-email/preview-server` está
  em `dependencies` de `apps/email/package.json:13`, e é por isso que o `--prod` conta as críticas dele. Versões
  publicadas no mesmo dia: `next` 16.4.6, `axios` 1.21.1, `firebase-admin` 14.5.1; o lockfile tem 13.6.0.)*
  ✅ **Fechada pela PR #64.** Em `388a453`, `pnpm audit --prod --audit-level=high` sai 0. Sem `--prod`, as
  dependências de desenvolvimento ainda somam 12 críticas e 98 altas (medido em 2026-11-23); o corte não as cobre.
- **1.15 Rate limit** — a lista é fechada e casa por igualdade (`apps/api/proxy.ts:60-78`): rota nova nasce
  sem limite. Fora dela: 10 das 13 rotas de `/account` (inclusive `/account/password` e
  `/account/password/set`), `payments/checkout`, `payments/portal`, `POST /entities` e a transferência de
  propriedade. ✅ **Fechada pela PR #64** (`apps/api/proxy.ts:70-116`).
- **1.8 Força bruta** — a troca de senha confere a senha atual pelo servidor, então o limite por IP do
  Firebase enxerga um IP só (o da API), e a rota não está no rate limit. ✅ **Fechada pela PR #64**: as duas
  rotas de senha estão no orçamento estrito (`apps/api/proxy.ts:84-85`).
- **1.14 Tokens** — `revokeUserSessions` engole o erro (`packages/auth/server.ts:330-336`): a troca de
  senha responde sucesso mesmo quando as outras sessões continuam vivas
  (`apps/api/app/(routes)/account/password/route.ts:66`). ✅ **Fechada pela PR #64** para as rotas do corte;
  quatro chamadores fora dele seguem com a variante que engole o erro (ver a deriva da fatia 1).
- **1.12 Informação sensível / respostas enxutas** — `GET /auth/me` e `POST /auth/sign-in` devolvem o
  documento do Firestore inteiro por spread (`apps/api/(shared)/mappers/user.mapper.ts:67`):
  `stripeCustomerId`, `subscription`, `entitlements`, `customClaims` e `tokensValidAfterTime`. Campo interno
  novo vaza sozinho. `X-Powered-By: Next.js` sai nos três apps. ✅ **Fechada pela PR #64**
  (`user.mapper.ts:80-89`, `packages/next-config/index.ts:5`).
- **1.10 CSRF** — a API aceita o cookie como credencial (`apps/api/(shared)/lib/resolve-api-actor.ts:45-48`)
  e requisição sem `Origin` passa (`apps/api/(shared)/lib/cors.ts:48-53`); `isSameOriginRequest` aceita
  ausência de `Origin` (`packages/auth/session.ts:78-82`); `customTokenPOST` não confere origem
  (`packages/auth/session-routes.ts:190-198`).
- **1.18 Cookies** — o helper só põe `Secure` quando pedem (`packages/shared/utils/helpers/cookies.ts:24-31`),
  e quase ninguém pede; `x-locale` sai sem `maxAge` nem `Secure` (`apps/app/proxy.ts:249,253`, eram `:245,249` até a PR #71 e `:235,239` até a PR #65;
  `apps/web/proxy.ts:121,125`, eram `:125,129` até a PR #71 e `:111,115` até a PR #65); `bp:*` sem `Secure` (`apps/app/shared/lib/panelState.ts:142`). O cookie de
  sessão em si está correto (`packages/auth/session.ts:60-71`).
- **1.16 Dados sensíveis em log** — `console.error(error)` com o objeto inteiro em
  `packages/auth/server.ts:194,211,227,260,286,315,340` (sete; até a auditoria de 2026-11-23 a lista citava cinco e
  a última, a de `revokeUserSessions`, estava em `:334`) e no reporter de erro de requisição.
- **1.19 CORS em produção** — sem `CORS_ORIGIN`, o boot lança erro mas o processo não cai: toda rota
  responde 500 em texto (`apps/api/instrumentation.ts:63-67`; medido na PR #53, registrado no BACKLOG).
- **1.11 Upload** — sem `content-length`, `req.formData()` carrega o corpo inteiro na memória antes de
  conferir o tamanho; a imagem não é recodificada, então o EXIF (inclusive GPS) chega ao bucket.
- **1.17 SSRF (latente)** — foto de entidade e avatar aceitam qualquer URL `http(s)`
  (`apps/api/(shared)/validation/entity.schema.ts:19-35`, `apps/api/(shared)/lib/account-avatar.ts:31`);
  hoje só a CSP `img-src` barra a exibição.
- **1.3 / 1.19 Limites** — `adminCreateUserSchema.email` sem `max`; `session-routes.ts:36-50` lê o
  `idToken` sem Zod e sem teto.
- **1.9 Bloqueio durante o envio** — no cadastro da landing, o botão do Google não trava enquanto o envio
  por e-mail está pendente (`apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx:145-147,168`).
- **1.2** — `packages/auth/components/sign-in.tsx:23` é um formulário legado sem schema, com texto em
  inglês, exportado e sem importador.
- **1.1** — falta `import "server-only"` em `packages/email/index.ts`.

## Evidência de mercado

- OWASP Top 10 2025: A01 Broken Access Control, A02 Security Misconfiguration, A03 Software Supply Chain
  Failures, A04 Cryptographic Failures, A05 Injection, A07 Authentication Failures
  (<https://top10.owasp.org/2025>, aberto em 2026-11-19). Os itens desta spec caem em A01, A02, A03 e A07.
- Mass assignment: "Explicitly allow-list fields" (OWASP Mass Assignment Cheat Sheet). SSRF: "Match the
  host against an allowlist" (OWASP SSRF Prevention Cheat Sheet). CSRF: SameSite e conferência de
  `Origin` como defesa em profundidade (OWASP CSRF Prevention Cheat Sheet). As três abertas em 2026-11-19.
- Baseline de confiança já pesquisado, com OWASP ASVS 5.0 e cookies do Firebase:
  [`research/compliance-trust-baseline.md`](research/compliance-trust-baseline.md).

## Proposta — corte de MVP

**Fatia 1: o que expõe hoje** (✅ entregue pela PR #64, `388a453`, em 2026-11-23, e conferida no código de `main`)

- [x] **Dependências de produção sem vulnerabilidade crítica ou alta**: `axios`, `next` (16.4.5 ou
      posterior) e `firebase-admin` atualizados, e `pnpm.overrides` para as transitivas que o pai ainda não
      corrigiu, com a justificativa no `package.json`.
- [x] **Rate limit por padrão**: todo método mutável da API passa por um orçamento padrão, e as rotas
      sensíveis (autenticação, troca e definição de senha, cobrança, convite, contato) ficam no orçamento
      estrito de hoje.
- [x] **Encerrar sessões falha de forma visível**: se a revogação falhar, a troca de senha, a redefinição e
      a troca de e-mail respondem erro com `error.code`, não sucesso.
- [x] **`/auth/me` e `/auth/sign-in` com allowlist de campos**: a resposta leva só o que o front usa.
- [x] **Sem `X-Powered-By`** nos três apps.

**Conferência da fatia 1 no código de `388a453`** (auditoria de 2026-11-23):

| item | evidência |
|------|-----------|
| Dependências | `next` 16.4.6 nos nove `package.json` que o declaram; `firebase-admin` `^13.10.0` (`apps/api/package.json:30`, `packages/auth/package.json:23`; o lockfile resolve 13.10.0); `axios` `^1.21.1` (`packages/sdk/package.json:10`); `@arcjet/next` 1.16.0; `@react-email/preview-server` em `devDependencies` (`apps/email/package.json:17`); `packages/payments/ai.ts` e o `@stripe/agent-toolkit` removidos. Overrides e a exceção do `@grpc/grpc-js` justificados no campo `"//"` (`package.json:2-7`), com `pnpm.auditConfig.ignoreGhsas` (`:56-67`, era `:55-66` até a PR #72). Medido nesta auditoria: `pnpm audit --prod --audit-level=high` sai 0 (0 críticas, 1 alta ignorada pela exceção, 7 moderadas, 4 baixas) |
| Rate limit por padrão | `apps/api/proxy.ts:70-116`: 21 caminhos no orçamento estrito, todo `POST`/`PUT`/`PATCH`/`DELETE` restante no `standard`, `/webhooks/payments` isento; 60/min por IP e sujeito (`packages/security/index.ts:17-22`, `:52-83`), sujeito em `apps/api/(shared)/lib/rate-limit-subject.ts:61` |
| Revogação que falha visível | `apps/api/(shared)/lib/session-revocation.ts:7-31` (`500 AUTH_SESSIONS_NOT_REVOKED`), usado em `account/password/route.ts:70,84`, `account/password/set/route.ts:78,92` e `auth/email-change/confirm/route.ts:82-86`; a redefinição responde o mesmo código em `auth/password/reset/route.ts:50-58`; "Sair de todos" responde `500 ACCOUNT_SESSIONS_REVOKE_FAILED` (`account/sessions/revoke/route.ts:10-20`). Traduzido nos três idiomas (`translations/packages/shared/utils.ts:58`, `:241`, `:426`) |
| Allowlist | `toSessionUser` com cinco campos (`apps/api/(shared)/mappers/user.mapper.ts:80-89`), usado em `auth/me/route.ts:26`, `auth/sign-in/route.ts:61` e `auth/sign-in/google/route.ts:63` |
| `X-Powered-By` | `poweredByHeader: false` em `packages/next-config/index.ts:5`, com teste em `packages/next-config/__tests__/config.test.ts:11` |

O CI da execução de merge passou nos quatro jobs (`gh run 45105651062`). O `/test` fechou 15 ✅, 0 ❌ e 1 🔒: o
`429` real depende de `ARCJET_KEY`, que não existe em dev. Por isso o sinal de pronto "uma rota mutável nova devolve
429 quando abusada" está provado só por teste de unidade (`packages/security/__tests__/rateLimit.test.ts`,
`apps/api/__tests__/corsOrigin.test.ts`), não contra a API de decisão do Arcjet.

**Deriva da fatia 1, sem efeito no corte:**

- A redefinição de senha responde `500 AUTH_SESSIONS_NOT_REVOKED`, como o corte pede, mas a tela da `apps/app`
  mostra o cartão de "senha alterada" com a explicação, em vez de um erro: a senha nova já vale e o link já foi
  gasto (`ResetPasswordForm.tsx:51-53`, `:89-91`). A spec não dizia o que a interface faria; a escolha é do `/review`.
- Quatro chamadores seguem com a revogação que engole o erro (`revokeUserSessions`, `packages/auth/server.ts:336-342`):
  a desativação pelo admin (`users/[id]/route.ts:155`), desvincular um método de login
  (`account/sign-in-methods/[id]/route.ts:122`), o expurgo da conta (`account-erasure.ts:237`) e o bloqueio de
  conta arquivada (`account-access.ts:20`). Estão fora da lista do corte (troca e definição de senha, redefinição,
  troca de e-mail); desvincular a senha encerra todas as sessões e é o mais próximo dela. Fica para o `/analyze` da
  fatia 2 decidir se entra.
- O `contends_on` foi revisto nesta auditoria para as fatias que faltam: saíram `user.mapper.ts` e
  `packages/next-config/index.ts`, entregues na fatia 1; entraram `session-routes.ts`, `server.ts` e
  `apps/api/instrumentation.ts`, que as lacunas da fatia 2 citam.

**Fatia 2: defesa em profundidade**

- [ ] **Origem conferida em toda escrita autenticada por cookie**, na API e nas rotas de sessão das
      front-ends; requisição mutável sem `Origin` nem `Sec-Fetch-Site` é recusada.
- [ ] **Cookies de preferência com `Secure` em HTTPS e `maxAge`**, pelo helper compartilhado.
- [ ] **Logs sem objeto inteiro**: os `console.error(error)` de `@repo/auth` passam a `logEvent` com
      código.
- [ ] **API cai no boot sem `CORS_ORIGIN` em produção**, em vez de responder 500 a tudo.
- [ ] **`max` em toda string de entrada** e Zod no corpo das rotas de sessão.

**Fatia 3: arestas**

- [ ] Foto e avatar aceitam só caminho do bucket ou host em allowlist.
- [ ] Upload recusa corpo sem `content-length` acima do teto antes de ler, e remove metadados da imagem.
- [ ] Botão do Google travado durante o envio no cadastro da landing.
- [ ] Formulário legado de `@repo/auth` removido; `server-only` em `@repo/email`.

### Fora do corte

- **Segundo fator e reautenticação para admin.** Já é a fatia 3 de
  [`account-security-mfa`](account-security-mfa.md).
- **Captcha, App Check e bloqueio de bot.** São controles de borda e de console; estão em
  [`delivery-infra-hardening`](../docs/features/delivery-infra-hardening/spec.md), entregue pela PR #65.
- **Nonce na CSP para tirar `'unsafe-inline'` de `script-src`.** É mudança grande (tema, hidratação e
  `gtag`) e merece spec própria.
- **Exigir e-mail verificado nos guards.** Muda o fluxo de todo fork; fica como opção a decidir depois da
  fatia 1.
- **Enumeração de e-mail no cadastro.** O cadastro precisa dizer que o e-mail já existe para o usuário
  seguir; a mitigação é rate limit (fatia 1) e a proteção do Firebase (parte 2).

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Atualização do `axios`; tipo de `/auth/me` restrito aos campos devolvidos. |
| `apps/api` | Orçamento padrão de rate limit no proxy; mapper de `/auth/me` com allowlist; recusa de escrita sem origem; boot que cai sem `CORS_ORIGIN`; `max` nos schemas. |
| `apps/app` | Cookies de preferência pelo helper com `Secure`; `poweredByHeader`. |
| `apps/web` | Idem; botão do Google travado no cadastro. |
| `packages/*` | `auth` (revogação que propaga erro, origem nas rotas de sessão, logs, remoção do formulário legado), `shared` (helper de cookie), `next-config` (`poweredByHeader: false`), `email` (`server-only`). |
| Infra/env | Nenhuma variável nova. |

## Riscos e trade-offs

- **Atualizar `firebase-admin` e `next` mexe no runtime inteiro.** Exige a suíte completa, o
  `test:emulator` e o E2E verdes antes do merge.
- **Orçamento padrão de rate limit** pode barrar uso legítimo intenso (importação, tela que salva a cada
  tecla). O orçamento padrão precisa ser folgado e configurável por rota.
- **Recusar escrita sem `Origin`** pode quebrar cliente que não é navegador e usa cookie. Hoje não existe
  nenhum no repo; o Bearer token continua aceito sem `Origin`.
- **Custo herdado pelo fork:** nenhum serviço novo.

## Sinais de pronto

- `pnpm audit --prod --audit-level=high` sai com código 0 (ou cada exceção tem justificativa escrita).
- Rodar a parte 1 da etapa de entrega contra o core termina sem 🔴.
- `curl` em `/auth/me` lista só os campos da allowlist; `curl -I` nos três apps não mostra `X-Powered-By`.
- Uma rota mutável nova, criada sem mexer no proxy, devolve 429 quando abusada.
- Forçar falha da revogação num teste faz a troca de senha responder erro.

## Perguntas em aberto

- **Orçamento padrão de rate limit: quanto?** — **recomendação:** 60 requisições por minuto por usuário
  autenticado (ou por IP sem sessão) para métodos mutáveis, mantendo as 20 por minuto das rotas sensíveis.
  *Aplicada pela fatia 1 (PR #64): 60 por minuto por IP e sujeito no `standard`, 20 por minuto por IP no
  estrito.*
- **O cookie de sessão ganha prefixo `__Secure-`?** — **recomendação:** não nesta spec; muda o nome do
  cookie e derruba todas as sessões ativas dos forks já em produção.
- **As fatias 2 e 3 bloqueiam a entrega de forks?** — **recomendação:** não; só a fatia 1 é pré-requisito
  para começar forks novos.
