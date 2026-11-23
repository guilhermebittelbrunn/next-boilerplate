# Plano: core aprovado na parte 1 da entrega (fatia 1, "o que expõe hoje")

- **Spec**: [`specs/delivery-security-review.md`](../../../../specs/delivery-security-review.md) (`status: approved`).
  Problema, evidência e corte são decisão de produto já tomada. Este plano responde ao *como*.
- **Escopo**: só a fatia 1 da spec. As fatias 2 (defesa em profundidade) e 3 (arestas) ficam fora, como a
  própria spec recomenda ("só a fatia 1 é pré-requisito para começar forks novos").
- **Modo**: rodada autônoma do `/cycle`. Nenhuma pergunta foi feita; as decisões estão em
  [Perguntas em aberto](#perguntas-em-aberto-decididas-por-padrão), cada uma com a alternativa descartada.
- **Medido em**: 2026-11-19, sobre `c9b4d9c`, só leitura.

---

## Etapa 1: análise

### 1. Contexto

A [etapa de entrega](../../../delivery/README.md) exige de todo fork a parte 1,
[validação de segurança](../../../delivery/01-security-review.md). O core reprova hoje em cinco pontos que
dá para corrigir uma vez, aqui, em vez de cada fork corrigir na própria entrega:

| # | Item da fatia 1 | Item da parte 1 | Estado medido |
|---|-----------------|-----------------|---------------|
| 1 | Dependências de produção sem crítica/alta | 1.13 | `pnpm audit --prod`: 8 críticas, 120 altas, 115 moderadas, 32 baixas |
| 2 | Rate limit padrão em todo método mutável | 1.15, 1.8 | lista fechada de 17 caminhos casados por igualdade (`apps/api/proxy.ts:60-92`); rota nova nasce sem limite |
| 3 | Revogação que falha responde erro | 1.14 | `revokeUserSessions` engole o erro (`packages/auth/server.ts:330-336`); a troca de senha responde sucesso mesmo assim (`apps/api/app/(routes)/account/password/route.ts:66,80`) |
| 4 | `/auth/me` e `/auth/sign-in` com allowlist | 1.12 | as duas respondem o documento inteiro por spread (`apps/api/(shared)/mappers/user.mapper.ts:59-68`) |
| 5 | Sem `X-Powered-By` | 1.12 | `packages/next-config/index.ts:4-8` não define `poweredByHeader`; os três apps herdam o padrão do Next |

**Objetivo**: os cinco itens acima passam nos comandos de verificação da parte 1, e cada um tem um teste
no nível mais barato que prova o comportamento.

**Fora de escopo** (vem da spec ou deste corte):

- Fatias 2 e 3 inteiras: origem conferida em escrita por cookie, cookies de preferência, logs sem objeto
  inteiro, boot que cai sem `CORS_ORIGIN`, `max` em toda string, SSRF de foto/avatar, upload, botão do
  Google, formulário legado de `@repo/auth`, `server-only` em `@repo/email`.
- Prefixo `__Secure-` no cookie de sessão (a spec recomenda não fazer: derruba as sessões dos forks).
- `GET /account` e `GET /users/:id` também espalham o documento (`apps/api/app/(routes)/account/route.ts:29-34`,
  `apps/api/(shared)/lib/user-merge.ts:15-31`). A spec pede allowlist só em `/auth/me` e `/auth/sign-in`.
  Os dois ficam registrados como achado em [§13](#13-achados-para-o-spec---sync), não corrigidos aqui.
- `revokeUserSessions` nos chamadores fora da spec (admin desativa usuário, arquivamento, expurgo LGPD,
  desvincular método de login). Continuam com o comportamento atual (engolir e seguir).

**Corte de MVP**: os cinco itens são independentes. Se o `/develop` travar em um, os outros quatro entregam
valor sozinhos. A ordem de risco, do maior para o menor, é 1 (mexe no runtime inteiro), 2, 4, 3, 5.

**Apps impactados**

| Onde | O que muda |
|------|-----------|
| raiz | `package.json` (override do `zod`, justificativas), `pnpm-lock.yaml` |
| `packages/sdk` | `axios`; tipo `AuthMePayload` explícito |
| `packages/auth` | `firebase-admin`, `next`; função de revogação que propaga erro |
| `packages/security` | `@arcjet/next`; dois orçamentos (`strict`, `standard`) e chave por sujeito |
| `packages/next-config` | `next`, `@next/bundle-analyzer`; `poweredByHeader: false` |
| `packages/payments` | remove `@stripe/agent-toolkit` e `ai.ts` (sem importador) |
| `packages/analytics`, `internationalization`, `seo` | `next`, `@next/third-parties` |
| `apps/api` | `next`, `firebase-admin`; proxy com orçamento padrão; allowlist em 3 rotas; 5 rotas com revogação visível |
| `apps/app` | `next`; tipo da sessão; tela de confirmação de troca de e-mail lê o código novo |
| `apps/web` | só `next` (e herda `poweredByHeader`) |
| `apps/email` | `@react-email/preview-server` e `react-email` vão para `devDependencies`; `next` |
| `packages/internationalization` | 1 código novo em `apiErrors` |
| docs | `SECURITY.md`, `delivery/01-security-review.md`, `PAYMENTS.md`, `SUBPROCESSORS.md`, `PRE-PRODUCTION.md`, skill `payments-flow` |

**Área do painel**: comum (troca de senha, encerrar sessões) e telas não autenticadas (redefinição, troca
de e-mail). Nada muda na área admin.

**Modo de produto**: igual em `subscription` e `simple`. `/auth/me` é lido pelo layout raiz do `apps/app` nos
dois modos (`apps/app/app/layout.tsx:50`).

**Assinatura/plano**: não depende.

**Dependências externas e env**: nenhuma variável nova. O rate limit continua dependendo de `ARCJET_KEY`
(opcional, já existente). Ver [§11](#11-pré-requisitos-manuais-de-infra).

**Genérico ou específico**: genérico. É o core cumprindo a parte 1 que todo fork herda.

### 1.1 Fontes

- Spec, lida inteira.
- [`docs/delivery/01-security-review.md`](../../../delivery/01-security-review.md), itens 1.8, 1.12, 1.13,
  1.14 e 1.15 (comandos de verificação e critério de aprovação usados abaixo).
- [`.claude/cycle-policy.md`](../../../../.claude/cycle-policy.md): sem dependência nova; modo degradado
  testado para todo opt-in; string vazia é ausência.
- Precedente direto: [`api-hardening`](../../api-hardening/STATE.md), que criou o rate limit e a lista
  fechada. Os achados dele ("rota nova nasce sem limite", "`/auth/sign-in` sem consumidor") são a origem do
  item 2.
- Nenhuma referência externa deixou de ser lida.

### 2. Dados (Firestore)

N/A. Nenhum campo novo, nenhuma consulta nova, nenhum índice. O item 4 só **remove** campos da resposta;
o documento não muda.

### 3. Contrato `@repo/sdk`

**`AuthMePayload`** (`packages/sdk/src/actions/auth/action.ts:4-7`) hoje é
`Record<string, unknown> & { uid; type? }`, o que deixa passar qualquer campo. Passa a ser explícito, com
exatamente os campos que algum consumidor lê:

| Campo | Quem lê | Evidência |
|-------|---------|-----------|
| `uid` | layout raiz (`actorUid`) e `getAppSessionUser` | `apps/app/app/layout.tsx:62`, `apps/app/lib/server/authSession.ts:24` |
| `type` | painel, admin, 404, pós-login | `apps/app/lib/server/panelSnapshot.ts:35`, `requireAdmin.ts:18`, `notFoundHome.ts:9`, `apps/app/shared/lib/postLoginNavigation.ts:72` |
| `email` | página de convite | `apps/app/app/[locale]/(unauthenticated)/invite/page.tsx:46-47` |
| `preferences` | pós-login (tema e idioma) | `apps/app/shared/lib/postLoginNavigation.ts:70-73` |
| `onboarding` | redirecionamento do onboarding | `apps/app/lib/server/onboarding.ts:28` |

Ninguém lê o `user` devolvido por `/auth/sign-in` (a rota não tem consumidor no repo, achado do
`api-hardening`) nem o de `/auth/sign-in/google` (`SignInForm.tsx:49-57` e `SignUpFormClient.tsx:50-58` usam só
`result.session`). Os dois passam a devolver a mesma forma de `/auth/me`, para o contrato
"mesmo `session` + `user` do login por e-mail" (`action.ts:108-111`) continuar verdadeiro.

**Quem quebra**: `apps/app/lib/server/authSession.ts:5-8` define `AppSessionUser` como
`Record<string, unknown> & {…}`. Passa a ser alias de `AuthMePayload`. `apps/app/shared/lib/googleSignInApi.ts:13-20`
declara `user: Record<string, unknown> | null` e passa a `AuthMePayload | null`. Nenhum consumidor lê campo
fora da allowlist (conferido por `grep` em `getAppSessionUser`, `sessionUser`, `authApi.me` e `signInWithGoogle`).

`axios` sobe de `^1.13.5` para `^1.21.1` (`packages/sdk/package.json:10`). É minor; a API pública que o SDK
usa (`request`, `AxiosError`) não muda.

### 4. API (`apps/api`)

#### 4.1 Rate limit padrão (item 2)

Hoje `isRateLimited` (`apps/api/proxy.ts:85-92`) só olha a lista `RATE_LIMITED_PATHS`. Passa a escolher um
**orçamento** por requisição:

| Requisição | Orçamento | Chave | Limite |
|------------|-----------|-------|--------|
| caminho da lista estrita (e método, quando restrito) | `strict` | `ip.src` | 20 / 60 s (o de hoje) |
| `POST`/`PUT`/`PATCH`/`DELETE` em qualquer outro caminho, fora da lista de isenção | `standard` | `ip.src` + `subject` | 60 / 60 s |
| `GET`, `HEAD`, `OPTIONS` fora da lista estrita | nenhum | — | — |
| caminho isento (`/webhooks/payments`) | nenhum | — | — |

- **Lista estrita** = os 17 caminhos de hoje + os sensíveis que a spec manda incluir e ainda faltam:
  `/account/password`, `/account/password/set` (troca e definição de senha), `/payments/checkout` e
  `/payments/portal` (cobrança). Os outros sensíveis que a spec cita (autenticação, convite, contato) já
  estão na lista.
- **Isenção**: `/webhooks/payments`. A Stripe chama de poucos endereços e faz retry; um 429 vira evento
  perdido (o comentário em `apps/api/proxy.ts:33-34` já registra isso).
- **`subject`**: hash do `sub` do JWT do `Authorization: Bearer` (ID token ou cookie de sessão encaminhado
  como bearer, `apps/api/(shared)/lib/resolve-api-actor.ts:21-43`), **decodificado sem verificar**. Sem
  bearer, ou bearer que não é JWT, vira `"anonymous"`, e a chave efetiva fica só o IP. Por que é seguro sem
  verificar: um `sub` forjado dá ao atacante um balde novo, mas a requisição morre no guard com 401 antes de
  qualquer escrita; o custo é o mesmo de hoje, quando nada disso tem limite. Por que hash: o valor vai para
  o Arcjet, e não há motivo para entregar um identificador estável de conta a terceiro. Por que IP + sujeito:
  um escritório atrás de um NAT soma o uso de todos (o comentário em `packages/security/index.ts:12-16`
  descreve esse problema); com o sujeito, cada pessoa tem o próprio orçamento.
- **Rota nova nasce com limite**: o orçamento padrão casa por método, não por caminho. É o sinal de pronto
  "uma rota mutável nova, criada sem mexer no proxy, devolve 429".
- **Configurável por rota**: o fork move um caminho para a lista estrita ou para a de isenção. Número
  diferente por rota fica fora (YAGNI até existir o caso).
- **Precedência**: um caminho estrito conta só no estrito. Nenhuma requisição gasta dois orçamentos.
- O 429, o `Retry-After`, o `error.code` (`AUTH_RATE_LIMITED`) e a linha de log (`apps/api/proxy.ts:95-106,139-150`)
  não mudam. O log continua sem IP e sem sujeito.
- O aviso de boot (`apps/api/instrumentation.ts:35,42`) diz "Public auth routes accept unlimited requests".
  Passa a dizer que as rotas mutáveis aceitam requisições sem limite. O teste
  (`apps/api/__tests__/corsOriginBoot.test.ts:16`) casa só `rate limiting is DISABLED` e não quebra.

**Modo degradado** (sem `ARCJET_KEY`, vazia ou sem o prefixo `ajkey_`): `checkRateLimit` devolve
`{ allowed: true, enforced: false }` sem tocar a rede, para os dois orçamentos, como já faz hoje
(`packages/security/index.ts:37-41`). A API sobe, nada vira 429, o boot avisa uma vez. Com chave e o Arcjet
fora do ar, `protect()` não lança e a decisão de erro não é `isDenied()`, então a requisição passa.

#### 4.2 Allowlist em `/auth/me` e no login (item 4)

Função nova `toSessionUser(merged)` em `apps/api/(shared)/mappers/user.mapper.ts`, ao lado de
`mergeAuthAndFirestore`, aplicada em três rotas:

- `apps/api/app/(routes)/auth/me/route.ts:19-25`
- `apps/api/app/(routes)/auth/sign-in/route.ts:45-60`
- `apps/api/app/(routes)/auth/sign-in/google/route.ts:47-62`

`getMergedUserByUid` **não muda**: `GET /users/:id` (admin) e o `user.repository` dependem do formato
completo. A allowlist fica na borda das três rotas, que é onde o contrato é público.

Campo novo no documento continua sem vazar: só sai o que está na lista. É o que a spec pede ("campo interno
novo vaza sozinho").

#### 4.3 Revogação que falha de forma visível (item 3)

`revokeUserSessions` tem 10 chamadores. Fazer ele lançar mudaria rotas fora da spec, entre elas o expurgo
LGPD, que roda `revokeUserSessions` e `deleteUser` no mesmo passo (`apps/api/(shared)/lib/account-erasure.ts:236-239`):
um lançamento ali deixaria a conta viva. Então:

- `packages/auth/server.ts` ganha `revokeUserSessionsOrThrow(uid)`, que chama
  `getAuthInstance().revokeRefreshTokens(uid)` sem `try`.
- `revokeUserSessions` passa a chamar a nova dentro do `try/catch` de hoje. Comportamento idêntico para os
  chamadores que não mudam.
- As cinco rotas abaixo trocam para a nova e respondem erro quando ela lança:

| Rota | Linha hoje | Quando a revogação falha | Status | `error.code` | Auditoria |
|------|------------|--------------------------|--------|--------------|-----------|
| `POST /account/password` | `route.ts:66` | a senha já mudou | 500 | `AUTH_SESSIONS_NOT_REVOKED` (novo) | grava (a troca aconteceu) |
| `POST /account/password/set` | `set/route.ts:74` | a senha já foi definida | 500 | `AUTH_SESSIONS_NOT_REVOKED` | grava |
| `POST /auth/password/reset` | `reset/route.ts:48-55` | a senha já foi redefinida | 500 | `AUTH_SESSIONS_NOT_REVOKED` | não há auditoria nesta rota |
| `POST /auth/email-change/confirm` | `confirm/route.ts:75-79` | o endereço já mudou | 500 | `AUTH_SESSIONS_NOT_REVOKED` | grava (mantém o fluxo de hoje e responde erro no fim) |
| `POST /account/sessions/revoke` | `revoke/route.ts:8` | nada mudou | 500 | `ACCOUNT_SESSIONS_REVOKE_FAILED` (já existe nos 3 idiomas, sem emissor hoje) | não grava (nada aconteceu) |

`/account/sessions/revoke` não está na lista da spec, mas é o "encerrar sessões" em pessoa: hoje responde
`confirmed: true` quando nada foi encerrado. `/account/password/set` é a "definição de senha", com o mesmo
comentário de intenção da troca (`set/route.ts:73`). Os dois entram pelo mesmo motivo e com a mesma mudança.

Na redefinição, a falha de `getUserByEmail` também significa sessão não encerrada, e passa a responder o
mesmo erro (hoje só registra `session-revoke-failed`). O `logEvent("auth", "session-revoke-failed", { requestId })`
fica nas cinco rotas, sem uid nem e-mail.

Por que 500 e não 401/400: o SDK encerra a sessão em todo 401, e 400 diria que o pedido estava errado. É o
mesmo status do `ACCOUNT_UPDATE_FAILED` (`account/password/route.ts:58-61`), falha do provedor.

Por que um código novo e não reaproveitar `ACCOUNT_SESSIONS_REVOKE_FAILED`: a cópia dele ("Não foi possível
encerrar as sessões. Tente de novo.") induz a repetir a troca, que não tem mais o que trocar. Nos quatro casos
a mudança **já foi salva**, e a cópia precisa dizer isso.

#### 4.4 Sem `X-Powered-By` (item 5)

`poweredByHeader: false` em `packages/next-config/index.ts:4-8`. Os três apps herdam: `apps/api/next.config.ts:4`
e `apps/web/next.config.ts:4` usam `config` direto, `apps/app/next.config.ts:12-13` espalha `...config`.

#### 4.5 Códigos de erro

| `error.code` | Status | Novo? | Onde |
|--------------|--------|-------|------|
| `AUTH_SESSIONS_NOT_REVOKED` | 500 | sim | 4 rotas da tabela acima |
| `ACCOUNT_SESSIONS_REVOKE_FAILED` | 500 | não (já traduzido, `utils.ts:56-57`) | `/account/sessions/revoke` |
| `AUTH_RATE_LIMITED` | 429 | não | proxy, agora também no orçamento padrão |

### 5. Front-end

**`apps/app`**

- `apps/app/lib/server/authSession.ts`: `AppSessionUser` vira alias de `AuthMePayload`.
- `apps/app/shared/lib/googleSignInApi.ts:13-20`: `user: AuthMePayload | null`.
- `apps/app/app/[locale]/(unauthenticated)/verify-email/components/ConfirmEmailChangeResult.tsx:53-62`: o
  cartão de erro diz "o link pode ter expirado". Com `AUTH_SESSIONS_NOT_REVOKED` isso é falso, porque o
  endereço mudou. Quando o código for esse, a tela mostra o título de sucesso (`changeEmail.success.title`),
  a descrição vinda de `handleClientError(new FormattedError(error, locale))` (a cópia do `apiErrors`) e o
  link de "Entrar". Zero chave de UI nova.
- Para ler o código, `apiErrorCodeOf` sai de `invite/hooks/useInvitation.ts:39-47` para
  `apps/app/shared/lib/apiErrorCode.ts`, e `InvitationAcceptance.tsx:24` passa a importar de lá. Segundo
  consumidor de um helper que mora dentro de uma rota; importar de uma feature para outra seria pior.
- Troca de senha, definição e redefinição não mudam de código: os três já mostram `errorAlert` com a cópia
  do `apiErrors` no erro (`useAccountMutations.tsx:47-52`, `AccountPasswordSetForm.tsx:50`,
  `ResetPasswordForm.tsx:47-48`). No erro, nenhum deles faz `signOut`, o que está certo: a sessão deste
  navegador também não foi encerrada.

**`apps/web`**: nenhum código. Não chama `/auth/me` nem as cinco rotas.

### 6. i18n

Uma chave em `apiErrors` (`packages/internationalization/translations/packages/shared/utils.ts`), nos 3 idiomas.
A cópia precisa servir às quatro telas (troca, definição, redefinição, troca de e-mail) e citar o botão pelo
rótulo real (`account.ts:92,361,632`):

| Idioma | `AUTH_SESSIONS_NOT_REVOKED` |
|--------|-----------------------------|
| pt-br | A alteração foi salva, mas não conseguimos encerrar as outras sessões desta conta. Entre de novo e use "Sair de todos os dispositivos" em Segurança. |
| en | Your change was saved, but we could not end the other sessions of this account. Sign in again and use "Sign out everywhere" under Security. |
| es | El cambio se guardó, pero no pudimos cerrar las otras sesiones de esta cuenta. Vuelve a entrar y usa "Cerrar sesión en todos los dispositivos" en Seguridad. |

O código entra também na lista `ACCOUNT_ERROR_CODES` de `apps/app/__tests__/accountApiErrorCopy.test.ts:16-60`.

### 7. Autorização e segurança

- Nenhum guard muda. O proxy continua decidindo antes do guard; o orçamento padrão é uma camada a mais, não
  substitui autorização.
- **Impersonação**: o admin personificando manda o próprio bearer, então o `subject` do orçamento padrão é o
  admin, não o usuário personificado. O orçamento é de quem age, que é o certo. `/auth/me` continua
  resolvendo o ator (`apps/app/lib/server/onboarding.ts:15-17` já documenta isso); a allowlist não muda isso.
- A personificação é só leitura (`AUTH_REQUEST_IMPERSONATION_READ_ONLY`), então as cinco rotas do item 3 não
  são alcançáveis personificando.
- A decodificação sem verificação do JWT no proxy serve só para escolher o balde. Nenhuma decisão de
  autorização usa o valor. Fica escrito no código, em uma linha, como exceção legítima de comentário.

### 8. Dependências (item 1)

Fatos da auditoria (`pnpm audit --prod --json`, 2026-11-19) com o caminho de cada crítica/alta, agrupados
pela causa:

| Causa | Pacotes vulneráveis (crítica em negrito) | Correção adotada |
|-------|------------------------------------------|------------------|
| `@react-email/preview-server` e `react-email` em `dependencies` de `apps/email` (`package.json:11-16`) | **`next` 15.5.2 (4 críticas)**, `next` (14 altas), `sharp`, `postcss`, `fast-uri`, `serialize-javascript`, `socket.io-parser`, `engine.io`, `glob`, `minimatch`, `brace-expansion`, `picomatch`, `nanoid`, `ws` | mover os dois para `devDependencies`. É o servidor de preview local (`email dev`); o build (`email build`) roda com devDeps instaladas no CI e na Vercel |
| `@stripe/agent-toolkit` (`packages/payments/package.json:11`), importado só por `packages/payments/ai.ts`, que ninguém importa fora de `__tests__/aiToolkit.test.ts` (conferido por `grep`) | **`proxy-addr`**, `@modelcontextprotocol/sdk`, `@langchain/core`, `langsmith`, `body-parser`, `path-to-regexp`, `jsondiffpatch`, `form-data`, `nanoid` | remover a dependência, `ai.ts` e o teste. Atualizar `docs/PAYMENTS.md:21`, `docs/SUBPROCESSORS.md:93` e `.claude/skills/payments-flow/SKILL.md:24` |
| `firebase-admin` 13.6.0 (`apps/api/package.json:30`, `packages/auth/package.json:23`) | **`protobufjs`**, **`fast-xml-parser`**, **`websocket-driver`**, `node-forge` (12), `jws`, `@grpc/grpc-js`, `@fastify/busboy`, `form-data` | `^13.10.0` (último da linha 13; tira `node-forge` das dependências e sobe `google-auth-library` para `^10.6.1`). O resto é transitiva dentro de faixa: atualizar pelo lockfile |
| `axios` 1.13.5 no SDK | `axios` (12 altas) | `^1.21.1` |
| `@arcjet/next` 1.0.0-beta.13 (`packages/security/package.json:12`) | `undici` 5.29.0 (5 altas, via `@connectrpc/connect-node` 1.x) e `@fastify/busboy` | `1.16.0`. A 1.16 usa `connect-node` 2.3.0, sem `undici`. As exportações que o repo usa (`arcjet`, `slidingWindow`, `shield`, `detectBot`, `request`, características customizadas) existem com a mesma assinatura (conferido no `.d.ts` publicado) |
| `next` 16.4.3 em 9 `package.json` | `browserslist`, `source-map-js` (transitivas do `next`); 2 moderadas do próprio `next` | `16.4.6` em todos, com `@next/bundle-analyzer` e `@next/third-parties` no mesmo número (precedente: #61, `599ce85`) |
| override `"zod": "4.1.12"` na raiz (`package.json:52`) | `zod` (1 alta, corrigida em 4.6.6) | override para `4.6.7`. As faixas declaradas (`^4.1.12`) já admitem |
| `recharts` → `lodash` 4.17.21 | `lodash` (1 alta, corrigida em 4.18.0) | atualizar pelo lockfile se a faixa do `recharts` admitir; senão, override |
| `@next/bundle-analyzer` em `dependencies` de `packages/next-config` → `ws` 7.5.10 | `ws` | atualizar pelo lockfile (7.5.11 cabe em `^7`) |

**Procedimento para o `/develop`**, nesta ordem:

1. Subir as diretas da tabela (`pnpm add`/editar `package.json` + `pnpm install`).
2. `pnpm audit --prod` de novo. Para cada alta/crítica que sobrar, `pnpm update -r --depth Infinity <pacote>`
   (re-resolve a transitiva dentro da faixa que o pai já declara, sem config nova).
3. Só o que ainda sobrar vai para `pnpm.overrides`, **sempre com seletor e dentro do major do pai**
   (`"protobufjs@<7.5.6": "^7.5.6"`), nunca `>=`, que pode puxar um major que o pai não testou.
4. O que não tiver correção dentro do major vira **exceção** escrita: caminho, por que o código vulnerável não
   roda aqui, e prazo para rever.
5. Justificativa de cada override e exceção num campo `"//"` no topo do `package.json` raiz (convenção do npm
   para comentário; pnpm e npm ignoram chave desconhecida no topo), por exemplo
   `"//": { "pnpm.overrides.zod": "…" }`. Inclui o `zod` e o `parse5` que já existem.

**Plano B do Arcjet**: se a 1.16 quebrar `typecheck` ou os testes de `packages/security` por algo além de
ajuste de tipo, voltar ao beta.13 e registrar `undici` como exceção (o único servidor com quem ele fala é a
API de decisão do Arcjet, host fixo). Registrar no handoff qual caminho foi seguido.

**Modo degradado**: N/A. Dependência não tem opt-in.

### 9. Testes

Sempre o nível mais barato que prova. Nenhum teste aqui precisa de emulador nem de app de pé.

| Item | Teste | Nível | Arquivo |
|------|-------|-------|---------|
| 2 | `checkRateLimit(req, { budget: "standard", subject })` monta `slidingWindow` com `max: 60` e características `["ip.src", "subject"]`, e chama `protect(req, { subject })` | unit, Arcjet mockado | `packages/security/__tests__/rateLimit.test.ts` |
| 2 | sem opções continua igual a hoje (`strict`, 20, `["ip.src"]`); os testes atuais passam sem edição | unit | mesmo |
| 2 | modo degradado: sem chave, com chave vazia e com chave malformada, os **dois** orçamentos devolvem `{ allowed: true, enforced: false }` e não chamam `arcjet` | unit | mesmo |
| 2 | proxy: `POST /rota-que-nao-existe` chama `checkRateLimit` com `standard`; com recusa mockada responde 429 + `AUTH_RATE_LIMITED` + `Retry-After` (sinal de pronto "rota nova devolve 429") | unit do proxy | `apps/api/__tests__/corsOrigin.test.ts` |
| 2 | proxy: `/account/password`, `/account/password/set`, `/payments/checkout`, `/payments/portal` vão para `strict`; `POST /webhooks/payments` e todo `GET` não chamam `checkRateLimit`; caminho estrito chama uma vez só | unit do proxy | mesmo |
| 2 | o teste "counts the listed paths only, not their neighbours" (`corsOrigin.test.ts:583-597`) muda: os vizinhos com `POST` agora contam no `standard`, não no `strict` | ajuste | mesmo |
| 2 | `subject`: bearer com JWT dá o mesmo hash para dois tokens do mesmo `sub` e hashes diferentes para `sub` diferente; sem bearer, bearer não-JWT, payload sem `sub` → `"anonymous"`; o valor nunca é o `sub` em claro | unit | `apps/api/__tests__/rateLimitSubject.test.ts` (novo) |
| 3 | `revokeUserSessionsOrThrow` propaga a rejeição; `revokeUserSessions` continua engolindo | unit | `packages/auth/__tests__/` (novo ou existente de `server.ts`) |
| 3 | cada uma das 5 rotas: revogação rejeitada → 500 com o código da tabela; auditoria gravada ou não conforme a tabela; revogação ok → resposta de hoje (sinal de pronto "forçar falha da revogação faz a troca de senha responder erro") | rota com `vi.mock` | `accountPasswordRoute`, `accountPasswordSetRoute`, `authPasswordReset`, `authEmailChangeConfirm`, `accountAuditTrail` (os mocks de `@repo/auth/server` ganham `revokeUserSessionsOrThrow`) |
| 3 | `ConfirmEmailChangeResult` com erro `AUTH_SESSIONS_NOT_REVOKED` mostra o título de sucesso e a cópia do `apiErrors`; com outro código mostra o cartão de erro de hoje | componente | `apps/app/__tests__/confirmEmailChangeResult.test.tsx` (novo) |
| 3 | `AUTH_SESSIONS_NOT_REVOKED` tem cópia própria nos 3 idiomas | unit (lista existente) | `apps/app/__tests__/accountApiErrorCopy.test.ts` + paridade de `@repo/internationalization` |
| 4 | `toSessionUser` devolve exatamente as 5 chaves, com `null` no que faltar, e descarta `stripeCustomerId`, `subscription`, `entitlements`, `customClaims`, `tokensValidAfterTime`, `providerData`, `metadata` e qualquer campo desconhecido | unit do mapper | `apps/api/__tests__/userProfileSerialization.test.ts` |
| 4 | `GET /auth/me`, `POST /auth/sign-in` e `POST /auth/sign-in/google` respondem só as chaves da allowlist mesmo com o merge trazendo campos internos | rota com `vi.mock` | `authMeRoute`, `authSignInRoute`, `authSignInGoogleRoute`; `mergedUserPayload.test.ts:138-162` troca a asserção de `createdAt` (que sai da resposta) por "nenhum `_seconds`" + chaves exatas |
| 5 | `config.poweredByHeader === false` | unit | `packages/next-config/__tests__/` |
| 1 | `pnpm audit --prod --audit-level=high` sai 0 (ou cada exceção escrita) | comando | — |
| 1 | suíte completa, `test:emulator` e E2E verdes depois das subidas (a spec exige isso para `firebase-admin` e `next`) | gate | `pnpm turbo run lint typecheck test test:emulator` + `pnpm e2e` no `/test` |

### 10. O que o `/test` vai percorrer

Superfície de UI mínima: uma tela (confirmação de troca de e-mail) e quatro toasts de erro. O resto é API e
dependência.

**Medições por comando** (sem browser):

1. `pnpm audit --prod --audit-level=high; echo "saída=$?"` → `saída=0`, ou cada linha restante bate com uma
   exceção do campo `"//"`.
2. `curl -sI` em `localhost:3000`, `:3001` e `:3002/health` → nenhuma linha `x-powered-by`. Vale em `next dev`,
   mas conferir também num `build && start` de um dos apps (política §4: dev não é produção).
3. Com conta de QA no emulador: `curl -s -H "Authorization: Bearer $ID_TOKEN" $API/auth/me | jq '.data | keys'`
   → exatamente `["email","onboarding","preferences","type","uid"]`. Mesmo teste no `user` de `POST /auth/sign-in`.
4. Modo degradado do rate limit, sem `ARCJET_KEY`: 70 `POST` autenticados seguidos numa rota mutável → zero 429,
   e o boot avisa uma vez com o texto novo.
5. Com `ARCJET_KEY` real, se houver (🔒 se não houver): 25 `POST` em `/account/password` → 429 a partir da 21ª;
   65 `POST /notifications/read-all` com o mesmo bearer → 429 a partir da 61ª; `POST /webhooks/payments` nunca 429.

**Fluxos no browser** (`agent-browser`, light + dark + 390×844, pt-br/en/es):

- **F1. Troca de senha com revogação falhando.** Não dá para fazer o Firebase Admin falhar de propósito sem
  mexer no código. Forma de produzir o estado: mutação temporária em `revokeUserSessionsOrThrow` (lançar
  sempre), revertida no fim e conferida com `git diff`, como o `api-hardening` fez com as 18 mutações. Esperado:
  toast com a cópia de `AUTH_SESSIONS_NOT_REVOKED`, usuário continua logado, a senha nova vale no próximo login.
- **F2. Troca de e-mail com revogação falhando** (mesma mutação). Abrir o link de confirmação: cartão com o
  título "E-mail alterado" e a descrição do `apiErrors`, link "Entrar". Sem a mutação: o cartão de sucesso de
  hoje.
- **F3. Encerrar sessões com revogação falhando**: toast "Não foi possível encerrar as sessões".
- **F4. Regressão do login** (e-mail/senha e, se possível, Google até o redirect) e do pós-login: tema e idioma
  da conta aplicados, admin cai em `/admin`, convite mostra o e-mail logado. São os 5 campos da allowlist em
  uso real.
- **F5. Regressão geral depois das subidas**: CRUD de `entities`, upload de avatar (usa `@google-cloud/storage`,
  que sobe junto com o `firebase-admin`), checkout em modo sem Stripe, e o preview de e-mail
  (`pnpm --filter email dev`) abrindo com `@react-email/preview-server` em `devDependencies`.

**Não observável sem infra externa** (vira 🔒, não reprova): o 429 real dos dois orçamentos (exige
`ARCJET_KEY`); o comportamento do Arcjet 1.16 contra a API de decisão real; login Google com conta real.

**Sinais de pronto da spec como critérios verificáveis**

| Sinal da spec | Critério | Instrumento |
|---------------|----------|-------------|
| `pnpm audit --prod --audit-level=high` sai 0 ou exceção justificada | medição 1 | comando |
| Parte 1 da entrega sem 🔴 | **restrito aos itens da fatia 1** (1.8, 1.12, 1.13, 1.14, 1.15) sem 🔴. Os itens 1.10, 1.11, 1.17 e 1.18 continuam 🔴 até as fatias 2 e 3 (ver pergunta Q9) | rodar os comandos da parte 1 desses itens |
| `curl` em `/auth/me` lista só a allowlist; `curl -I` sem `X-Powered-By` | medições 2 e 3 | comando |
| Rota mutável nova devolve 429 sem mexer no proxy | teste do proxy com `POST` em caminho inexistente (prova a fiação); medição 5 (prova o 429 real, 🔒 sem chave) | unit + comando |
| Forçar falha da revogação faz a troca de senha responder erro | teste de rota + F1 | unit + browser |

### 11. Pré-requisitos manuais de infra

Nada aqui é feito pelo `/develop`, e nada aqui reprova o `/test`.

| Pré-requisito | Sem ele | Como o `/test` classifica |
|---------------|---------|---------------------------|
| `ARCJET_KEY` em produção (já é o item 8 de `docs/PRE-PRODUCTION.md`) | os dois orçamentos viram no-op; a API sobe e avisa no boot. Agora o aviso cobre **todas** as rotas mutáveis, não só as de autenticação | 429 real 🔒; modo degradado ✅/❌ medido |
| Conferir o plano do Arcjet contra o volume novo | o orçamento padrão faz uma chamada ao Arcjet por requisição mutável, não só nas 17 rotas de hoje. Não medi a cota do plano gratuito; o `/develop` não deve afirmar número sem fonte datada | pendência em `PRE-PRODUCTION.md` §8 |
| Rodar `pnpm e2e` (JDK 21, browser) depois das subidas | a spec exige suíte + `test:emulator` + E2E verdes antes do merge | gate do `/test` |

O `/develop` atualiza o texto do item 8 de `docs/PRE-PRODUCTION.md` com essas duas linhas. Não cria item novo.

### 12. Riscos

- **Subida do runtime** (`next`, `firebase-admin`, `@arcjet/next`, `zod`): é o maior risco do corte. Mitigação:
  tudo patch/minor dentro do major, exceto o Arcjet (beta → estável da mesma API), com plano B escrito.
  `firebase-admin` 14 fica de fora (ver Q2).
- **Orçamento padrão barrando uso legítimo**: 60/min por pessoa folga para formulário, mas uma importação em
  lote pelo painel bateria nele. Não existe importação em lote no core. O fork que criar uma move o caminho para
  a isenção ou sobe o número.
- **Latência**: uma chamada ao Arcjet a mais por requisição mutável, só quando há chave. Sem chave, zero custo.
- **Decodificar JWT no proxy**: o valor só escolhe balde. Se um dia alguém usar o `subject` para autorizar,
  vira falha; o nome da função e o comentário de uma linha deixam isso explícito.
- **Mudança de contrato do `/auth/me`**: forks que leem outro campo de `getAppSessionUser` quebram em tempo de
  compilação (o tipo fica fechado), não em silêncio. É o efeito desejado.
- **Remoção do `@stripe/agent-toolkit`**: quem dependia de `getPaymentsAgentToolkit` para semear catálogo perde
  a fábrica. Nenhum código do repo usa; `docs/PAYMENTS.md:21` e a skill `payments-flow` deixam de oferecer.

### 13. Achados para o `/spec --sync`

- `GET /account` (`apps/api/app/(routes)/account/route.ts:29-34`) também espalha o documento inteiro
  (`withAvatarUrl(merged)`), inclusive `stripeCustomerId`. A tela de conta é dona dos próprios dados, então não é
  vazamento entre pessoas, mas é o mesmo "campo interno novo vaza sozinho" do item 1.12. Candidato à fatia 2.
- O sinal de pronto "parte 1 sem 🔴" depende das três fatias. Medido só com a fatia 1, continua 🔴 em 1.10,
  1.11, 1.17 e 1.18.

---

## Etapa 2: blueprint técnico

### B1. Contrato do SDK

```ts
// packages/sdk/src/actions/auth/action.ts
import type { OnboardingStateDTO, UserPreferences, UserType } from "../../types";

/** Only what the front-ends read. A field the API adds to the profile stays out until it is listed here. */
export type AuthMePayload = {
    uid: string;
    type: UserType | null;
    email: string | null;
    preferences: UserPreferences | null;
    onboarding: OnboardingStateDTO | null;
};

export type GoogleSignInResponse = {
    session: GoogleSignInSession;
    user: AuthMePayload | null;
};
```

`me()` mantém a assinatura (`Promise<AuthMePayload>`) e perde o `as AuthMePayload` da linha 93.

Ajuste de tipo esperado no `apps/app`: `mapMeTypeToProfileKind(type?: string)`
(`apps/app/shared/lib/authRequestHeaders.ts:10`) recebe `user.type`, que passa a ser `UserType | null`.
Passar `user.type ?? undefined` em `panelSnapshot.ts:35`; o comportamento (tudo que não é admin conta como
comum) não muda.

### B2. `@repo/security`

```ts
// packages/security/index.ts
const RATE_LIMIT_INTERVAL = "60s";
const STRICT_RATE_LIMIT_MAX = 20;      // o RATE_LIMIT_MAX de hoje, com o comentário que já tem
const STANDARD_RATE_LIMIT_MAX = 60;

export type RateLimitBudget = "strict" | "standard";

export type RateLimitOptions = {
    budget?: RateLimitBudget;      // default "strict": quem chama sem opções mantém o comportamento de hoje
    /** Opaque per-actor key; "anonymous" when the request carries no credential. */
    subject?: string;
};

export const checkRateLimit = async (
    sourceRequest?: Request,
    { budget = "strict", subject = "anonymous" }: RateLimitOptions = {}
): Promise<RateLimitResult> => {
    const arcjetKey = readArcjetKey();
    if (!arcjetKey) return { allowed: true, enforced: false };

    const req = sourceRequest ?? (await request());
    const decision =
        budget === "standard"
            ? await arcjet({
                  key: arcjetKey,
                  characteristics: ["ip.src", "subject"],
                  rules: [slidingWindow({ mode: "LIVE", interval: RATE_LIMIT_INTERVAL, max: STANDARD_RATE_LIMIT_MAX })],
              }).protect(req, { subject })
            : await arcjet({
                  key: arcjetKey,
                  characteristics: ["ip.src"],
                  rules: [slidingWindow({ mode: "LIVE", interval: RATE_LIMIT_INTERVAL, max: STRICT_RATE_LIMIT_MAX })],
              }).protect(req);
    // tradução da decisão: igual a hoje (index.ts:59-80)
};
```

Características diferentes dão impressões digitais diferentes no Arcjet, então os dois orçamentos não dividem
contador.

### B3. Proxy da API

```ts
// apps/api/(shared)/lib/rate-limit-subject.ts (novo, sem importar @repo/auth: o proxy não precisa de firebase-admin)
const ANONYMOUS = "anonymous";

/** Picks a rate limit bucket. The token is NOT verified here; never use the result to authorize. */
export async function rateLimitSubject(request: Request): Promise<string> {
    const header = request.headers.get("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
    const sub = readJwtSubject(token);            // base64url do 2º segmento → JSON → `sub` string não vazia, ou null
    if (!sub) return ANONYMOUS;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sub));
    return Buffer.from(digest).toString("hex").slice(0, 32);
}
```

```ts
// apps/api/proxy.ts (pseudo-diff)
- const RATE_LIMITED_PATHS = [ … 17 … ];
+ const STRICT_RATE_LIMITED_PATHS = [ … 17 de hoje …,
+     "/account/password",
+     "/account/password/set",
+     "/payments/checkout",
+     "/payments/portal",
+ ];
- const RATE_LIMITED_METHODS = new Map(…);
+ const STRICT_RATE_LIMITED_METHODS = new Map(…);           // mesmo conteúdo
+ const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
+ /** Stripe retries from a handful of addresses; a 429 here is a lost event. */
+ const RATE_LIMIT_EXEMPT_PATHS = ["/webhooks/payments"];

- function isRateLimited(request): boolean { … }
+ function rateLimitBudgetFor(request: NextRequest): RateLimitBudget | null {
+     const { pathname } = request.nextUrl;
+     if (STRICT_RATE_LIMITED_PATHS.includes(pathname)) {
+         const methods = STRICT_RATE_LIMITED_METHODS.get(pathname);
+         if (methods === undefined || methods.includes(request.method)) return "strict";
+     }
+     if (RATE_LIMIT_EXEMPT_PATHS.includes(pathname)) return null;
+     return MUTATING_METHODS.has(request.method) ? "standard" : null;
+ }

  // em proxy():
- if (isRateLimited(request)) {
-     const decision = await checkRateLimit(request);
+ const budget = rateLimitBudgetFor(request);
+ if (budget) {
+     const decision = await checkRateLimit(request, {
+         budget,
+         subject: budget === "standard" ? await rateLimitSubject(request) : undefined,
+     });
```

Atenção: `GET /organization/invitations` hoje não conta (só `POST`). Com a função acima ele cai em
`MUTATING_METHODS.has("GET") === false` e continua sem contar. O comentário de bloco (`proxy.ts:30-59`) é
reescrito para descrever os dois orçamentos e a isenção, e a frase "Matched exactly, so a new endpoint is
unlimited until it is listed here" sai, porque deixa de ser verdade.

### B4. Allowlist

```ts
// apps/api/(shared)/mappers/user.mapper.ts
import type { AuthMePayload } from "@repo/sdk/src/actions/auth/action";

const asObjectOrNull = <T>(value: unknown): T | null =>
    value && typeof value === "object" && !Array.isArray(value) ? (value as T) : null;

/** The session payload is an allow-list, so a field added to the profile stays private until it is listed. */
export function toSessionUser(merged: Record<string, unknown>): AuthMePayload {
    return {
        uid: String(merged.uid),
        type: merged.type === UserType.ADMIN || merged.type === UserType.COMMON ? merged.type : null,
        email: typeof merged.email === "string" ? merged.email : null,
        preferences: asObjectOrNull(merged.preferences),
        onboarding: asObjectOrNull(merged.onboarding),
    };
}
```

```ts
// apps/api/app/(routes)/auth/me/route.ts
- return Response.json({ data: user });
+ return Response.json({ data: toSessionUser(user) });

// sign-in/route.ts e sign-in/google/route.ts
-     user,
+     user: toSessionUser(user),
```

Exemplo de resposta de `GET /auth/me` (antes trazia também `id`, `reference_id`, `createdAt`, `updatedAt`,
`deletedAt`, `lastAccessAt`, `stripeCustomerId`, `subscription`, `entitlements`, `displayName`, `photoURL`,
`emailVerified`, `phoneNumber`, `disabled`, `metadata`, `providerData`, `customClaims`, `tokensValidAfterTime`):

```json
{
  "data": {
    "uid": "Xk2…",
    "type": "common",
    "email": "qa-delivery-security-review@example.com",
    "preferences": { "theme": "dark", "locale": "pt-br" },
    "onboarding": { "step": "profile", "completedAt": "2026-11-19T12:00:00.000Z" }
  }
}
```

### B5. Revogação

```ts
// packages/auth/server.ts
/** Ends every session of the account, or throws: the caller decides what a failure means. */
export const revokeUserSessionsOrThrow = async (uid: string): Promise<void> => {
    await getAuthInstance().revokeRefreshTokens(uid);
};

export const revokeUserSessions = async (uid: string): Promise<void> => {
    try {
        await revokeUserSessionsOrThrow(uid);
    } catch (error) {
        console.error("Error revoking user sessions:", error);   // inalterado; a troca por logEvent é da fatia 2
    }
};
```

```ts
// apps/api/app/(routes)/account/password/route.ts (mesmo desenho em password/set)
- await revokeUserSessions(ctx.user.uid);
+ const sessionsRevoked = await revokeUserSessionsOrThrow(ctx.user.uid).then(
+     () => true,
+     () => {
+         logEvent("auth", "session-revoke-failed", { requestId: requestIdFrom(req) });
+         return false;
+     }
+ );

  await recordAuditEvent({ … });            // a troca aconteceu: grava nos dois casos

+ if (!sessionsRevoked) {
+     return Response.json(
+         { error: { code: "AUTH_SESSIONS_NOT_REVOKED" } },
+         { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
+     );
+ }
  return Response.json({ data: { confirmed: true } });
```

```ts
// apps/api/app/(routes)/auth/password/reset/route.ts
  try {
      const user = await getAuthInstance().getUserByEmail(email);
-     await revokeUserSessions(user.uid);
+     await revokeUserSessionsOrThrow(user.uid);
  } catch {
      logEvent("auth", "session-revoke-failed", { requestId: requestIdFrom(req) });
+     return Response.json(
+         { error: { code: "AUTH_SESSIONS_NOT_REVOKED" } },
+         { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
+     );
  }
```

```ts
// apps/api/app/(routes)/auth/email-change/confirm/route.ts
- await revokeUserSessions(applied.localId);
+ const sessionsRevoked = await revokeUserSessionsOrThrow(applied.localId).then(() => true, () => false);
  // perfil + auditoria seguem iguais; os dois `return Response.json({ data: { confirmed: true } })`
  // passam por um helper que devolve 500 AUTH_SESSIONS_NOT_REVOKED quando !sessionsRevoked.
```

O comentário em `confirm/route.ts:72-75` ("nothing is reported as a failure to whoever opened the link") deixa
de ser verdade e é reescrito: depois do `apply`, a única falha reportada é a de revogação, porque o endereço
mudou e a pessoa precisa saber que sessões antigas seguem abertas.

```ts
// apps/api/app/(routes)/account/sessions/revoke/route.ts
- await revokeUserSessions(ctx.user.uid);
+ try {
+     await revokeUserSessionsOrThrow(ctx.user.uid);
+ } catch {
+     logEvent("auth", "session-revoke-failed", { requestId: requestIdFrom(req) });
+     return Response.json(
+         { error: { code: "ACCOUNT_SESSIONS_REVOKE_FAILED" } },
+         { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
+     );
+ }
  await recordAuditEvent({ … });
```

Exemplo de resposta: `500 { "error": { "code": "AUTH_SESSIONS_NOT_REVOKED" } }`.

### B6. Front

```tsx
// apps/app/app/[locale]/(unauthenticated)/verify-email/components/ConfirmEmailChangeResult.tsx
+ import FormattedError from "@repo/shared/utils/helpers/formattedError";
+ import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
+ import { apiErrorCodeOf } from "@/shared/lib/apiErrorCode";

  if (confirmEmailChangeMutation.isError) {
+     if (apiErrorCodeOf(confirmEmailChangeMutation.error) === "AUTH_SESSIONS_NOT_REVOKED") {
+         return (
+             <AuthCard
+                 description={handleClientError(new FormattedError(confirmEmailChangeMutation.error, locale))}
+                 title={changeEmailCopy.success.title}
+             >
+                 {signInLink}            // o mesmo link do cartão de sucesso, extraído para uma const
+             </AuthCard>
+         );
+     }
      return ( …cartão de erro de hoje… );
  }
```

Arquivos do `apps/app`:

```
apps/app/shared/lib/apiErrorCode.ts                                   (novo: apiErrorCodeOf movido)
apps/app/app/[locale]/(unauthenticated)/invite/hooks/useInvitation.ts  (remove a função)
apps/app/app/[locale]/(unauthenticated)/invite/components/InvitationAcceptance.tsx (import novo)
apps/app/app/[locale]/(unauthenticated)/verify-email/components/ConfirmEmailChangeResult.tsx
apps/app/lib/server/authSession.ts
apps/app/shared/lib/googleSignInApi.ts
apps/app/__tests__/confirmEmailChangeResult.test.tsx                   (novo)
apps/app/__tests__/accountApiErrorCopy.test.ts
```

### B7. `next-config`

```ts
// packages/next-config/index.ts
  export const config: NextConfig = {
+     poweredByHeader: false,
      images: { formats: ["image/avif", "image/webp"] },
  };
```

### B8. i18n

```ts
// packages/internationalization/translations/packages/shared/utils.ts, nos 3 blocos apiErrors,
// logo depois de ACCOUNT_SESSIONS_REVOKE_FAILED
AUTH_SESSIONS_NOT_REVOKED: "<cópia da §6>",
```

### B9. Documentação a medir e corrigir

| Arquivo | O que muda |
|---------|-----------|
| `docs/SECURITY.md:163` | descreve os dois orçamentos, a isenção do webhook, a chave por sujeito e a nova lista estrita de 21 caminhos |
| `docs/delivery/01-security-review.md` §1.8, §1.12, §1.14, §1.15 | "O core já faz" passa a citar o orçamento padrão, a allowlist de `/auth/me`, a ausência de `X-Powered-By` e a revogação que responde erro. §1.15 deixa de pedir que o fork liste toda rota nova (o padrão cobre); passa a pedir que rota pública que confere segredo, manda e-mail ou custa dinheiro entre na **lista estrita** |
| `docs/PAYMENTS.md:21`, `docs/SUBPROCESSORS.md:93`, `.claude/skills/payments-flow/SKILL.md:24` | removem a linha do toolkit |
| `docs/PRE-PRODUCTION.md` §8 | o no-op agora cobre todas as rotas mutáveis; conferir o plano do Arcjet contra o volume novo |
| `docs/ROPA.md:110` | sem mudança (`/contact` continua no estrito, 20/min por IP); conferir |

### B10. Ordem de implementação e plano de commits

O `/develop` implementa nesta ordem; o `/review` commita nesta ordem.

| # | Commit | Conteúdo |
|---|--------|----------|
| 1 | `chore: patch vulnerable production dependencies` | todos os `package.json`, `pnpm-lock.yaml`, override do `zod`, campo `"//"`, remoção de `packages/payments/ai.ts` e do teste dele. Commit misto aceitável: o lockfile é um só e não se separa sem `git add -p` (política §6) |
| 2 | `feat(sdk): narrow the session user payload to an allow-list` | `action.ts` |
| 3 | `feat(auth): add a session revocation that reports failure` | `packages/auth/server.ts` + teste |
| 4 | `feat(security): add a standard rate limit budget keyed by actor` | `packages/security/index.ts` + teste |
| 5 | `feat(next-config): stop sending the X-Powered-By header` | `index.ts` + teste |
| 6 | `feat(api): rate limit every mutating request by default` | `proxy.ts`, `rate-limit-subject.ts`, `instrumentation.ts`, testes |
| 7 | `feat(api): answer the session user from an allow-list` | `user.mapper.ts`, 3 rotas, testes |
| 8 | `fix(api): answer an error when ending the sessions fails` | 5 rotas, testes |
| 9 | `fix(app): explain a saved change whose sessions survived` | `apps/app` (B6) + testes |
| 10 | `feat(internationalization): add AUTH_SESSIONS_NOT_REVOKED copy` | `utils.ts` |
| 11 | `docs: describe the default rate limit, the session allow-list and the removed toolkit` | B9 (a skill em `.claude/` pode ir num `chore(claude)` separado) |
| 12 | `docs(features): delivery-security-review` | artefatos da feature, por último |

### B11. Env e config

Nenhuma variável nova. Nenhuma mudança em `turbo.json` nem no CI. O fork que quiser outro número para o
orçamento padrão muda `STANDARD_RATE_LIMIT_MAX` em `packages/security/index.ts`; para isentar ou endurecer um
caminho, edita as listas em `apps/api/proxy.ts`.

### B12. Rollback

Reverter os commits. Nada é gravado no Firestore, nenhum índice ou regra muda. A subida de dependências é o
único commit com efeito fora do código (lockfile); revertê-lo volta às versões vulneráveis.

---

## Perguntas em aberto (decididas por padrão)

Nenhuma bloqueia o `/develop`. Cada uma traz a adotada e a descartada.

**Q1. Quanto vale o orçamento padrão e qual a chave?**
Adotada: 60/min por IP + sujeito (hash do `sub` não verificado), estrito mantido em 20/min por IP. É a
recomendação da spec.
Descartada: só por IP. Mais simples, mas trata um escritório inteiro como uma pessoa, que é o problema que o
comentário de `packages/security/index.ts:12-16` já aponta.

**Q2. `firebase-admin` 14 ou 13.10 + atualização de transitivas?**
Adotada: `^13.10.0` e re-resolução do lockfile, com overrides só no que sobrar. Menor raio: a 13.10 já tira o
`node-forge` (12 altas) e as outras críticas vêm de transitivas cuja faixa admite a correção.
Descartada: 14.5.1. Exige Node 22 (o repo usa 22.12, então caberia), mas leva `@google-cloud/firestore` 9 e
`@google-cloud/storage` 8, dois majors no caminho de toda escrita e do upload. Fica para quando a 13 parar de
receber correção.

**Q3. Mover o preview de e-mail para `devDependencies` ou subir o `@react-email/preview-server` para a 5.x?**
Adotada: mover. O pacote só roda em `email dev`, local; o `--prod` contava 4 críticas que não chegam a produção.
Descartada: subir para a 5.x (major) e o `react-email` para a 6.x. Mais trabalho para um servidor que não vai
ao ar. Se o fork publicar o preview, a parte 1 pega pelo `pnpm audit` sem `--prod`.

**Q4. Remover o `@stripe/agent-toolkit` ou subir para a 0.9.1?**
Adotada: remover, com `ai.ts` e o teste. Ninguém importa (`grep` fora de `__tests__` vazio).
Descartada: subir. Mantém uma dependência sem consumidor e o risco de as transitivas (MCP, LangChain, Express)
voltarem a acusar. O fork que precisar do toolkit para semear catálogo adiciona de volta, passando pela parte 1.

**Q5. Onde fica a justificativa dos overrides, já que JSON não tem comentário?**
Adotada: campo `"//"` no topo do `package.json` raiz, como a spec pede ("justificativa no `package.json`").
Descartada: uma tabela em `docs/SECURITY.md`. Fica longe de quem edita o override e envelhece sem ninguém ver.

**Q6. `revokeUserSessions` passa a lançar, ou nasce uma função nova?**
Adotada: função nova `revokeUserSessionsOrThrow`, usada só pelas cinco rotas. A antiga mantém o comportamento.
Descartada: fazer a antiga lançar. Mudaria o expurgo LGPD (revogação e `deleteUser` no mesmo passo,
`account-erasure.ts:236-239`), a desativação pelo admin e o desvincular método de login, nenhum deles pedido
pela spec.

**Q7. Código de erro da revogação que falhou depois de a mudança ser salva.**
Adotada: código novo `AUTH_SESSIONS_NOT_REVOKED` (500), com cópia que diz que a mudança foi salva.
Descartada: reaproveitar `ACCOUNT_SESSIONS_REVOKE_FAILED`, cuja cópia manda "tentar de novo", o que leva a
pessoa a repetir uma troca já feita. O código existente vai para `/account/sessions/revoke`, onde a cópia dele
é exata.

**Q8. Incluir `/account/password/set` e `/account/sessions/revoke` no item 3?**
Adotada: incluir. Mesma falha (sucesso sem revogação), mesma mudança, e o segundo é literalmente o "encerrar
sessões" do título do item.
Descartada: ficar só nas três rotas listadas. Deixaria o botão "Sair de todos os dispositivos" respondendo
sucesso sem encerrar nada, que é o pior caso do item.

**Q9. O sinal de pronto "parte 1 sem 🔴" vale para esta entrega?**
Adotada: medir só os itens que a fatia 1 cobre (1.8, 1.12, 1.13, 1.14, 1.15). Os itens 1.10, 1.11, 1.17 e 1.18
seguem 🔴 até as fatias 2 e 3, e isso vai escrito no relatório do `/test`.
Descartada: tratar a ausência total de 🔴 como critério desta rodada. Reprovaria por algo que está fora do
corte aprovado.

**Q10. Allowlist com 5 campos ou com campos "de identidade" a mais (`displayName`, `photoURL`, `emailVerified`, `id`)?**
Adotada: os 5 que algum consumidor lê (tabela da §3). É o que a spec pede ("só o que o front usa").
Descartada: acrescentar os de identidade por conveniência de fork. O fork que precisar acrescenta um campo
na allowlist e no tipo, e a revisão vê.

**Q11. Ler o código de erro na tela de troca de e-mail: importar `apiErrorCodeOf` do convite ou mover para `shared/lib`?**
Adotada: mover para `apps/app/shared/lib/apiErrorCode.ts`.
Descartada: importar de `invite/hooks/useInvitation.ts`, que amarraria uma tela a outra.

**Q12. `@arcjet/next` beta.13 → 1.16.0?**
Adotada: subir. É a única forma de tirar o `undici` 5 (5 altas) sem override de major, e a API usada não mudou
de assinatura.
Descartada: override do `undici` para 6.x dentro do `connect-node` 1.x (major que o pai não testou) ou exceção
escrita. A exceção continua como plano B (§8).
