# Revisão: modelos de conformidade

Rodada autônoma do `/cycle`, sem pergunta ao usuário. O diff é só documentação: nenhum arquivo em `apps/`,
`packages/`, env, rule ou índice do Firestore mudou nesta feature.

## Branch

- Atual: `run-full-task-cycle-v2`, workspace do Conductor. O regex do Passo 3 de `.claude/commands/review.md`
  responde `BRANCH INVALIDA`.
- Proposta: `docs/compliance-docs-kit`. O regex responde `branch OK`. Não há `project`: o diff cobre
  `docs/` na raiz e `specs/`, e nenhum dos dois é app ou pacote, então vale a forma sem prefixo.
- A branch atual não tem upstream e não tem commit além de `origin/main`. Pelo passo 1 do gate, o caminho é
  renomear (`git branch -m docs/compliance-docs-kit`), não criar outra. Nesta rodada nada foi renomeado:
  o `/cycle` não cria nem troca branch, e a renomeação acontece quando o usuário aprovar os commits.

## Revisão: `docs/` e adendo da nota

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `docs/INCIDENT-RESPONSE.md:88-90`: dizia que "a senha nunca sai do Firebase". A senha passa pela API a
  caminho do Firebase no cadastro, no login (`apps/api/app/(routes)/auth/sign-in/route.ts:5-7`), na troca,
  na redefinição e na confirmação da exclusão. Corrigido: a linha diz que a senha passa pela API, não é
  gravada no Firestore nem vai para o log, e que o Firebase guarda só o hash.
- `docs/PRE-PRODUCTION.md:740`, `docs/ROPA.md:55`, `docs/BACKUP.md`: a declaração do expurgo dizia que "não
  há de onde restaurar", e o registro de cadastro dava "até a exclusão da conta" como período de guarda. O
  `BACKUP.md` que esta feature entrega ensina a ligar backup com retenção de até 14 semanas, e com ele
  ligado o perfil apagado fica nos backups até a retenção vencer. Corrigido nos três lugares: a declaração
  vale sem backup, o `ROPA.md` cita o prazo dos backups e o `BACKUP.md` manda declarar esse prazo ao
  titular.
- `docs/INCIDENT-RESPONSE.md:50-52`: a frase "Um ID token já emitido vale até 1 hora" vinha logo depois de
  dizer que a API recusa esse token, e as duas pareciam se contradizer. A leitura confirma a segunda:
  `getCurrentUser` recusa o token de login anterior à revogação (`packages/auth/server.ts:180-183`,
  `auth_time` contra `tokensValidAfterTime` em `:153-165`). Corrigido: o token continua válido para o
  Firebase até expirar, e o risco que resta é a emissão de cookie, que não confere revogação. Na linha do
  admin entrou a saída que o código permite: desativar e também revogar as sessões pelo Admin SDK, o que
  corta o bearer na hora.

### 🟢 Sugestão / nit

- `docs/SUBPROCESSORS.md:49`: "O proxy de cada app roda em todas as regiões" não tinha fonte, e com Next
  16.0.0 o `proxy.ts` usa o runtime Node.js. A frase agora diz que a região do proxy não foi confirmada.
- `docs/PRE-PRODUCTION.md` item 14: a comunicação de incidente foi atribuída só à Res. CD/ANPD 15/2024. A
  obrigação é da LGPD, art. 48, e a resolução a regulamenta. Corrigido.
- `docs/FORKING.md:167`: "upload de arquivo (item 7 abaixo)" apontava para o passo 7 da mesma lista, que é
  a Web API key. O upload está em §7.5. A frase é antiga, mas está na linha que a feature editou. Corrigido.
- `docs/BACKUP.md:92`, `docs/ROPA.md:55`: citam a seção como "Declaração: até onde a exclusão de conta
  alcança", mas o título real usa travessão. O link leva ao arquivo certo e o `grep` pelo texto falha. Ficou
  como está.
- Âncoras do backlog que esta feature desloca: o `PRE-PRODUCTION.md` ganhou 1 linha em `:387`, 16 depois de
  `:701` e 2 em `:740`. `specs/BACKLOG.md:415` cita `:717` para a linha `billing` da declaração do
  expurgo, que termina em `:733`. Não mexi no backlog para não misturar a auditoria com a feature: fica para
  o `/spec --sync`.

### ✅ OK

- Inventário: o comando de `SUBPROCESSORS.md:107-108` acha 21 arquivos, todos de Firebase, Stripe, Resend,
  Arcjet, `@vercel/analytics` e `@next/third-parties/google`. Os hosts externos citados no código
  (`identitytoolkit`, `securetoken`, `googletagmanager`, `google-analytics`, `va.vercel-scripts`,
  `storage.googleapis`, `lh3.googleusercontent`, `apis.google`, `arcjet`) caem nas 9 linhas. O único
  pacote com chave de terceiro sem linha é `LANGUNE_API_KEY` (`packages/internationalization/keys.ts:4`),
  ferramenta de tradução que não recebe dado de usuário.
- Âncoras: as 80 âncoras `arquivo:linha` dos quatro documentos existem, e a linha impressa corresponde ao
  que o texto afirma (conferido com `sed -n`).
- Links relativos: 85, nenhum quebrado, nos quatro documentos, em `PRE-PRODUCTION.md`, em `FORKING.md` e na
  nota.
- Res. CD/ANPD 15/2024, lida no texto da fonte citada: art. 6º caput (3 dias úteis), §2º (doze itens), §3º
  (20 dias úteis), §5º (encarregado ou representante), §8º (dobra caput e §3º); art. 8º (pedido do
  registro de operações); art. 9º caput, §3º (3 meses), §4º (declaração em 3 dias úteis), §6º (dobra do
  prazo do titular); art. 10 e §1º (5 anos, oito campos); art. 4º e 5º (gatilho cumulativo). Tudo bate com
  a tabela de prazos e com as seções 3 a 5 do runbook.
- Adequação jurídica: nenhum documento conclui que uma transferência está coberta. Onde o provedor não
  declara mecanismo brasileiro, a tabela diz "não encontrado", e onde declara (Google Cloud, Stripe) o texto
  avisa que ninguém comparou as cláusulas com o anexo da Res. 19/2024.
- Commit `3089d71` citado no adendo existe e é a migração para o Admin SDK.
- Segredo e e-mail real: nenhum nos arquivos do diff, inclusive nos artefatos da feature e no spec
  renomeado de `account-email-change`.
- Travessão: zero nos quatro documentos e nas linhas acrescentadas em `PRE-PRODUCTION.md` e `FORKING.md`.
- Corte da spec: os quatro documentos, o item 14, o checkbox do item 7 e a frase da rotina final
  correspondem ao corte de `specs/compliance-docs-kit.md`. Sem divergência a registrar.

### Achado de segurança do core, para o backlog

Fora do corte desta feature, e sem correção de código aqui (mudança mínima).

`PUT /users/:id` com `{"disabled": true}` não corta o acesso por bearer. O handler só chama
`updateUser(..., { disabled })` (`apps/api/app/(routes)/users/[id]/route.ts:117-122`) e não revoga os
refresh tokens. O bearer passa por `getCurrentUser` (`apps/api/(shared)/lib/resolve-api-actor.ts:24`), que
chama `verifyIdToken(token)` sem `checkRevoked` (`packages/auth/server.ts:180`), carrega o usuário (`:181`)
e confere só a revogação (`:182`), sem olhar `user.disabled`. Nenhum guard de `apps/api` confere
`disabled` (`grep disabled` em `apps/api` e `packages/auth` só acha o schema, o mapper, a rota e os códigos
benignos em `server.ts:121,130`). Pela leitura, uma conta desativada pelo admin segue chamando a API com o
ID token que já tinha até ele expirar, em até 1 hora. O cookie de sessão não tem esse problema, porque
`verifySessionCookie(..., true)` recusa conta desativada (`server.ts:298-301`).

Correção provável, para quem pegar o item: recusar `user.disabled` em `getCurrentUser`, ou chamar
`revokeRefreshTokens` no `PUT` quando `disabled` vira `true`. As duas mudam `packages/auth` ou a rota de
admin e pedem teste de rota. O runbook descreve o comportamento atual e a saída manual; quando a correção
entrar, a linha "O admin bloqueia uma conta" de `docs/INCIDENT-RESPONSE.md` muda junto. Destino sugerido: `account-security-mfa`, que já declara
`packages/auth/server.ts` e `resolve-api-actor.ts` em `contends_on`.

### 👁 Verificar no `/test`

- Conta desativada com ID token válido (o achado acima). Repro no emulador: entrar como usuário comum,
  guardar o ID token, desativar a conta como admin (`PUT /users/:id` com `{"disabled": true}`) e chamar
  `GET /account` com `Authorization: Bearer <id token>`. A leitura prevê `200`. Se vier `401`, a linha do
  runbook está errada e o achado cai.
- Mesmo cenário, com a saída do runbook: depois de desativar, revogar as sessões da conta
  (`revokeRefreshTokens(uid)` pelo Admin SDK ou pelo emulador) e repetir a chamada. A leitura prevê `401`.
- Revogação e emissão de cookie: `mintSessionCookie` confere o ID token sem checar revogação
  (`packages/auth/session.ts:150`) antes de `createSessionCookie` (`:161`). Repro: guardar um ID token,
  chamar `POST /account/sessions/revoke` e tentar emitir cookie com o token guardado pela rota de sessão
  (`packages/auth/session-routes.ts:73`). Se o Firebase emitir, o cookie ainda precisa passar por
  `verifySessionCookie(..., true)`; medir as duas pontas.
- Links externos: os 38 URLs dos quatro documentos, com o comando 2 do §8 do plano. Esta revisão não
  remediu.
- Comandos de backup, export/import e restauração no lugar: exigem projeto no Blaze. Ficam 🔒 sem infra.

## Lacunas herdadas do handoff, com veredito

| Lacuna | Veredito |
|---|---|
| Não há rota de admin para revogar a sessão de outro usuário | continua aberta; o runbook agora dá a saída manual pelo Admin SDK |
| Não há ferramenta que reaplique exclusão depois de restaurar backup | continua aberta, fora do corte |
| A API só lê o banco `(default)` | continua aberta, fora do corte |
| `review-checklist.md` não cobra atualizar `SUBPROCESSORS.md` e `ROPA.md` em integração nova | continua aberta; segunda aparição (plano e handoff), então pela política §5.1 vira item de backlog em vez de voltar ao relatório |
| Conta desativada com ID token aceito | confirmada por leitura; vira achado de backlog (acima) e medição no `/test` |

Testes de código: não se aplicam. Nenhum código mudou.

## Auditoria do backlog (mesmo diff, commit próprio)

Conferida só em coerência e segredo. `specs/BACKLOG.md`, `specs/account-security-mfa.md`,
`specs/compliance-docs-kit.md`, `specs/observability-logging.md` e o rename
`specs/account-email-change.md → docs/features/account-email-change/spec.md`, que já está no índice. Nenhum
segredo nem e-mail real. As âncoras de `observability-logging.md` para `apps/api/proxy.ts` conferem com o
disco. A única deriva é a de `BACKLOG.md:415`, listada acima.

## Gates

| Gate | Resultado |
|---|---|
| `pnpm check` (com cache, sem `--force`) | "Checked 806 files in 322ms. No fixes applied." O Biome não lê `.md`, então o gate não diz nada sobre estes arquivos. |
| `typecheck` | não rodado: nenhum arquivo fora de `docs/` e `specs/` mudou |
| Paridade de i18n | não rodada: nenhuma chave mudou |

## Rodada 2, depois do `/test`

O `/test` mediu os três cenários de sessão contra um projeto Firebase de dev, com o Admin SDK real
(`test/report.md`, seção "Como a sessão foi medida"). Tratei o relatório como hipótese e conferi o que dava
por leitura:

- A troca por cookie falha e a rota responde `401 AUTH_INVALID_TOKEN`. Conferido: quando `createSessionCookie`
  lança, `mintSessionCookie` devolve `invalid-token` (`packages/auth/session.ts:160-164`), e
  `mintFailureResponse` responde `AUTH_INVALID_TOKEN` com 401 (`packages/auth/session-routes.ts:59`). O
  `auth/id-token-expired` do Firebase é dado medido, sem leitura que o substitua.
- `firebase-admin@13.6.0`, `lib/auth/base-auth.js:119`, tem `if (checkRevoked || isEmulator)`. Conferido no
  `node_modules`. A mesma condição aparece em `:586`, no caminho do cookie de sessão.
- A medição parou em `resolveApiActor`, que os dois guards chamam, e não chamou `GET /account` de ponta a
  ponta. O texto do runbook fala da API resolver o usuário, não do status da rota.

O que mudou em `docs/INCIDENT-RESPONSE.md`:

- `:50`, o titular encerra as sessões: saiu "continua válido para o Firebase até expirar" e saiu "não foi
  medido". A linha agora diz que o ID token anterior à revogação só passa na verificação local sem
  revogação (`session.ts:150`), e que o Firebase recusa trocá-lo por cookie novo: `auth/id-token-expired`
  em `createSessionCookie` (`session.ts:161`), `401 AUTH_INVALID_TOKEN` na rota (`session-routes.ts:59`),
  medido em 2026-09-30. O limite de 1 hora continua atribuído à nota de pesquisa, porque a expiração não foi
  medida.
- `:51`, o admin bloqueia uma conta: saiu "pela leitura do código". Entrou a medição de 2026-09-30: com a
  conta desativada, a API resolve o usuário do bearer emitido antes; depois de `revokeRefreshTokens(uid)` o
  bearer é recusado, e continua recusado depois de a conta ser reativada.

Para quem corrigir o achado de segurança (`account-security-mfa`): o emulador não serve de teste. Sob o
Auth emulator, o Admin SDK confere revogação e `disabled` mesmo sem `checkRevoked`
(`base-auth.js:119`), então a API já recusa o bearer da conta desativada, e um teste em `test:emulator`
passa com ou sem a correção. O teste da correção tem de ser de unidade ou de rota, com `getAuthInstance`
mockado devolvendo um usuário com `disabled: true`.

Os itens 1 a 3 da lista "Verificar no `/test`" estão medidos. O item 4 (links externos) e o 5 (🔒 backup)
ficam com o veredito do `test/report.md`.

Gates: nada que o Biome lê mudou nesta rodada, só `.md`. O `pnpm check` da rodada 1 continua valendo
(806 arquivos, 0 correções).

## Plano de commits

O índice não está vazio: já contém o rename de `account-email-change`, que pertence ao commit 1. Antes de
começar, `git diff --cached --stat` deve mostrar só esse rename. Os documentos se linkam entre si, então
entre os commits 2 e 6 algum link relativo fica sem alvo; no fim da série todos resolvem.

1. `docs(specs): reconcile the backlog after the account email change delivery`
   - `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/compliance-docs-kit.md`,
     `specs/observability-logging.md`
   - rename já preparado: `specs/account-email-change.md → docs/features/account-email-change/spec.md`
2. `docs: add the subprocessor list and international transfer note` · `docs/SUBPROCESSORS.md`
3. `docs: add the record of processing activities template` · `docs/ROPA.md`
4. `docs: add the security incident response runbook` · `docs/INCIDENT-RESPONSE.md`
5. `docs: add the Firestore backup and restore procedure` · `docs/BACKUP.md`
6. `docs: link the compliance templates from the production and fork guides` · `docs/PRE-PRODUCTION.md`,
   `docs/FORKING.md`
7. `docs(specs): add the compliance templates sources addendum to the trust research note` ·
   `specs/research/compliance-trust-baseline.md`
8. `docs(features): compliance-docs-kit` · `docs/features/compliance-docs-kit/STATE.md`,
   `docs/features/compliance-docs-kit/analyze/plan.md`, `docs/features/compliance-docs-kit/develop/handoff.md`,
   `docs/features/compliance-docs-kit/review/review.md`, `docs/features/compliance-docs-kit/test/criterios-aceite.md`,
   `docs/features/compliance-docs-kit/test/report.md`

Título de PR sugerido: `docs: compliance templates for RoPA, incident response, subprocessors and backup`.

Commits realizados: (o orquestrador preenche)
