# Relatório de QA: modelos de conformidade

Rodada autônoma do `/cycle`, em 2026-09-30, na branch `run-full-task-cycle-v2` (não protegida). Nada foi
commitado nem adicionado ao índice; o índice continua só com o rename da auditoria do backlog.

Resultado: 18 critérios com ✅, 0 com ❌, 2 com 🔒. Nenhuma afirmação dos documentos caiu na medição. A
suíte da raiz passou.

## Por que não houve browser

O diff não tem superfície de runtime: são quatro arquivos novos em `docs/`, edições em
`docs/PRE-PRODUCTION.md` e `docs/FORKING.md`, o adendo da nota de pesquisa e a auditoria de `specs/`.
Nenhum arquivo em `apps/` ou `packages/` mudou. Não subi app nem API, não abri o `agent-browser` e não tirei
screenshot. A pasta `test/e2e/` não existe nesta feature.

## Verificar no `/test`

| Item do `review.md` | Veredito | O que foi medido |
|---|---|---|
| Conta desativada com ID token válido: a leitura prevê `200` | **confirmado** | Com a conta desativada, `resolveApiActor` devolve o usuário (`disabled=true`) para o bearer emitido antes. `verifyIdToken(token)` sem `checkRevoked` resolve; com `checkRevoked=true` lança `auth/user-disabled`. Nenhum guard de `apps/api` confere `disabled` (`grep` em `app/(guards)`, `(shared)/lib` e `packages/auth`). O achado de segurança do core se sustenta. |
| Mesmo cenário depois de `revokeRefreshTokens(uid)`: a leitura prevê `401` | **confirmado** | `resolveApiActor` devolve `null` para o mesmo bearer, e continua `null` depois de reativar a conta. A saída manual da linha 51 do runbook funciona. |
| Cookie depois da revogação (`session-routes.ts:73`, `verifySessionCookie(..., true)`) | **confirmado, e a lacuna do runbook fecha** | Depois da revogação pelo titular: o bearer anterior é recusado; `verifyIdTokenClaims` (a porta de `mintSessionCookie`) ainda aceita o token; `createSessionCookie` com esse token lança `auth/id-token-expired` no Firebase, então a rota de sessão responde `401 AUTH_INVALID_TOKEN` e nenhum cookie novo sai; o cookie emitido antes é recusado por `getSessionFromCookie`; o refresh token responde `400 TOKEN_EXPIRED`. Com a conta desativada, `createSessionCookie` lança `auth/user-disabled` e o refresh responde `400 USER_DISABLED`. |
| 38 links externos e comandos 1 a 5 do §8 | **confirmado** | 38 de 38 URLs com 200; 0 de 88 links relativos quebrados; 21 arquivos no inventário, todos mapeados; 80 âncoras existentes; 0 acertos de segredo. Detalhe abaixo. |
| Backup, export/import e restauração no lugar | **🔒 não verificável** | Exige projeto no Blaze. A sintaxe confere com o `--help` do `firebase-tools` 15.30.1 e do `gcloud`; `--retention 14w` passa pelo parser do CLI (`^(\d+)([hdmw])$`). |

### Como a sessão foi medida, e por que não no emulador

O objeto da medição é o comportamento do Firebase: `verifyIdToken` sem `checkRevoked` diante de conta
desativada, e o backend de `createSessionCookie` diante de token anterior à revogação. Mock nenhum prova
isso, então escalei para a faixa cara.

Rodei primeiro no Auth emulator, como o `/review` sugeria, e ele dá a resposta errada para produção: com a
conta desativada, `verifyIdToken(token)` **sem** `checkRevoked` lança `auth/user-disabled` e a API recusaria
o bearer. A causa está no Admin SDK: `firebase-admin@13.6.0`, `lib/auth/base-auth.js:119`, faz
`if (checkRevoked || isEmulator)`, ou seja, sob emulador ele sempre confere revogação e `disabled`. Um teste
de `test:emulator` sobre este cenário passaria mesmo sem a correção do core. Por isso não criei teste no
emulador.

A medição que vale foi contra o projeto Firebase de dev, com o Admin SDK real e as credenciais do
`apps/api/.env`, num arquivo de teste descartável em `apps/api/__tests__/` que importava as funções reais
(`resolveApiActor`, `getCurrentUser`, `verifyIdTokenClaims`, `createSessionCookie`,
`getSessionFromCookie`). O login foi pelo REST do Identity Toolkit, com senha aleatória gerada em memória e
nunca gravada. Entre o login e cada revogação o script esperou 2 segundos, porque `tokensValidAfterTime`
tem resolução de segundo. O arquivo foi apagado logo depois e não está no working tree.

Resultado bruto das duas passadas, sem token:

| Passo | Emulador | Projeto de dev |
|---|---|---|
| Conta ativa: `resolveApiActor(bearer)` | usuário | usuário |
| Desativada: `resolveApiActor(bearer)` | `null` | usuário, `disabled=true` |
| Desativada: `verifyIdToken(token)` | lança `auth/user-disabled` | resolve |
| Desativada: `verifyIdToken(token, true)` | lança `auth/user-disabled` | lança `auth/user-disabled` |
| Desativada: cookie emitido antes | `null` | `null` |
| Desativada: `createSessionCookie` | lança `auth/user-disabled` | lança `auth/user-disabled` |
| Desativada: troca do refresh token | `400 USER_DISABLED` | `400 USER_DISABLED` |
| Desativada e revogada: `resolveApiActor(bearer)` | `null` | `null` |
| Reativada depois da revogação: `resolveApiActor(bearer)` | `null` | `null` |
| Revogação do titular: `resolveApiActor(bearer)` | `null` | `null` |
| Revogação do titular: `verifyIdTokenClaims` | `null` | claims |
| Revogação do titular: `createSessionCookie` com o token anterior | lança `auth/id-token-expired` | lança `auth/id-token-expired` |
| Revogação do titular: cookie emitido antes | `null` | `null` |
| Revogação do titular: troca do refresh token | `200` | `400 TOKEN_EXPIRED` |

`resolveApiActor` é o que os dois guards chamam (`app/(guards)/common-panel.ts:36`, `admin.ts:34`). Não
chamei `GET /account` de ponta a ponta porque isso exigiria criar perfil no Firestore de dev; a diferença
entre a resolução do ator e o `200` da rota é o carregamento do perfil, que não olha `disabled`.

## Comandos do §8 do plano

| # | Comando | Resultado |
|---|---|---|
| 1 | links relativos (estendido a `PRE-PRODUCTION.md`, `FORKING.md` e à nota) | 0 quebrados em 88: ROPA 13, INCIDENT-RESPONSE 11, SUBPROCESSORS 8, BACKUP 6, PRE-PRODUCTION 25, FORKING 21, nota 4. O handoff contou 85; a diferença são os links que o `/review` acrescentou. |
| 2 | `curl -L -A 'Mozilla/5.0' --max-time 20` em cada URL dos quatro documentos | 38 URLs únicas, 38 com `200`. `arcjet.com/dpa` e `arcjet.com/legal`, que o documento cita como ausentes, responderam `404`. |
| 3 | inventário de pacotes de provedor | 21 arquivos; todos importam Firebase, Stripe, Resend, Arcjet, `@vercel/analytics` ou `@next/third-parties/google`. Nenhum `package.json` declara Sentry, Logtail, Axiom, PostHog ou Upstash. As três buscas da seção "O que não entra" voltam vazias. |
| 4 | âncoras `arquivo:linha` (todas as dos quatro documentos, não só a amostra) | 80 âncoras, todas com arquivo existente e linha dentro do arquivo. As de `SUBPROCESSORS.md` impressas com `sed -n` mostram o que o texto diz; no runbook e no backup conferi `audit.ts:2-11` e `:29-31`, `log.ts:5-14`, `privacyContact.ts:10-19`, `audit-events/route.ts:10`, `sessions/revoke/route.ts:7-8`, `request-id.ts:6`, `users/[id]/route.ts:87` e `:169`, `base.repository.ts:225-226`. |
| 5 | segredo e e-mail | 0 acertos nos quatro documentos e 0 nas linhas acrescentadas em `PRE-PRODUCTION.md`, `FORKING.md` e na nota. |

Conferências a mais, pelo texto das fontes: "três dias úteis" (art. 6º), "vinte dias úteis" (§3º),
"contados em dobro" para caput e §3º (§8º) e "cinco anos" (art. 10) na Res. CD/ANPD 15/2024;
"cláusulas-padrão contratuais aprovadas pela ANPD" na página das BR SCCs do Google; "BR SCCs" no Cloud DPA;
"Brazilian Standard Contractual Clauses" no adendo da Stripe; "Enterprise and Pro plans" no DPA da Vercel;
"Firebase Authentication processes data exclusively in the United States" na privacidade do Firebase;
"requires the Blaze pricing plan" na documentação de backups. Travessão: 0 nos quatro documentos. Lacunas
`[FORK]`: ROPA 42, SUBPROCESSORS 13, INCIDENT-RESPONSE 13, BACKUP 5.

## Critérios de aceite

Texto completo em `test/criterios-aceite.md`.

| # | Critério | Status | Meio |
|---|---|---|---|
| 1 | O fork chega aos quatro documentos pelo checklist de produção | ✅ | leitura do diff, comando 1 |
| 2 | Aviso de modelo e data de coleta no topo | ✅ | leitura, `grep -c` |
| 3 | Lista de subprocessadores bate com o código | ✅ | comandos 3 e 4 |
| 4 | DPA, lista, região e mecanismo, ou a lacuna escrita | ✅ | comando 2, `curl` na Arcjet |
| 5 | Transferência sem adequação não confirmada (com a correção do handoff) | ✅ | leitura, `curl` nas fontes |
| 6 | RoPA nos blocos do modelo da ANPD | ✅ | leitura, `grep -c` |
| 7 | RoPA cobre as nove operações | ✅ | leitura, `grep -c` |
| 8 | Hipótese legal e prazo como sugestão marcada | ✅ | leitura, `sed -n` |
| 9 | Prazos da ANPD em dias úteis | ✅ | leitura, texto da Res. 15/2024 |
| 10 | Papéis e avaliação de comunicabilidade | ✅ | leitura |
| 11 | Registro de incidente por 5 anos, fora do repositório | ✅ | leitura |
| 12 | Onde buscar evidência, sem prometer o que o código não faz | ✅ | comando 4, `sed -n` |
| 13 | Limites de sessão do runbook batem com o medido | ✅ | script contra o projeto de dev |
| 14 | O que fazer no Spark | ✅ | leitura, `curl` |
| 15 | Ligar, restaurar e testar, com os limites do código | ✅ | leitura, `--help` dos CLIs |
| 16 | Restaurar não ressuscita conta excluída | ✅ | leitura, `sed -n` |
| 17 | Nenhum segredo nem e-mail real | ✅ | comando 5 |
| 18 | Nada fora de `docs/` e do adendo mudou | ✅ | `git status`, `git diff` |
| 19 | Comandos de backup rodam num projeto real | 🔒 | exige Blaze |
| 20 | O texto atende à lei | 🔒 | fora do alcance do QA |

## Sugestões para o `/review`

Nenhuma afirmação dos documentos se mostrou falsa. Ficam duas frases que a medição deixou velhas; não as
editei, porque correção de doc volta para o `/review`.

- `docs/INCIDENT-RESPONSE.md:50` termina com "se um ID token anterior à revogação ainda consegue gerar
  cookie novo não foi medido". Agora está medido: não consegue. O Firebase responde `auth/id-token-expired`
  a `createSessionCookie` e a rota de sessão devolve `401 AUTH_INVALID_TOKEN`. A mesma linha diz que o ID
  token "continua válido para o Firebase até expirar"; o que continua valendo é a verificação local sem
  revogação (`verifyIdToken` sem `checkRevoked`), porque o backend do Firebase já recusa trocá-lo por
  cookie. Repro: o script descrito acima, cenário de revogação do titular.
- `docs/INCIDENT-RESPONSE.md:51` diz "pela leitura do código"; o comportamento foi medido em 2026-09-30
  contra o projeto de dev. Dá para trocar a ressalva pela data da medição.

## Decisões de custo de teste

| Módulo | Decisão |
|---|---|
| Documentos em `docs/` e `specs/` | Sem teste Vitest, como o §7 do plano decidiu: um teste que lesse `SUBPROCESSORS.md` acoplaria um workspace a um arquivo de `docs/`. A coerência foi conferida pelos comandos do §8. |
| Sessão desativada e revogada (`packages/auth/server.ts`, `resolve-api-actor.ts`) | Faixa cara, com script descartável e não com teste persistido. O objeto é o comportamento do Firebase, que mock não prova. Não gravei teste porque o comportamento medido é o defeito do achado de segurança, e um teste dele fixaria a falha como contrato. O emulador foi descartado como instrumento pelo motivo acima. |

Follow-up para quem pegar o achado de segurança (`account-security-mfa`): o teste da correção tem de ser de
rota ou de unidade, com `getAuthInstance` mockado devolvendo usuário com `disabled: true`. Um teste em
`test:emulator` passa com ou sem a correção, porque o Admin SDK confere `disabled` sozinho sob emulador.

## Gates

| Comando | Resultado |
|---|---|
| `pnpm test` (raiz, sem `--force`, com `JAVA_HOME` no JDK 21) | 14 de 14 tasks; 13 do cache e `api:test:emulator` executado (nunca vem do cache). 230 arquivos e 2622 testes, todos passando: api 1022, app 756, email 202, auth 107, web 82, internationalization 59, design-system 45, shared 44, analytics 34, next-config 32, security 31, payments 22, e2e 16, api emulador 170. |
| `pnpm check`, `typecheck`, paridade de i18n | não remedidos: nenhum arquivo lido pelo Biome, pelo `tsc` ou pelo dicionário mudou desde a medição do `/review` ("Checked 806 files, No fixes applied"). A paridade entrou no `pnpm test` (59 testes). |

## Ambiente

| Serviço | Origem | Estado final |
|---|---|---|
| Auth emulator (9099, hub 4400, 4500) | subi com `firebase emulators:start --only auth`, PID guardado | derrubado por PID; portas livres |
| Emuladores do `test:emulator` (8080, 9199) | `emulators:exec` do próprio script da suíte | encerrados pelo script; portas livres |
| App, web, API, email (3000 a 3003) | não subi | portas livres antes e depois |

Nenhuma porta estava ocupada pelo usuário no início, então não reutilizei nada. No fim, 3000, 3001, 3002,
3003, 9099, 8080, 9199, 4001, 4400 e 4500 saíram vazias no `lsof`.

## Estado de dev alterado

- Projeto Firebase de dev: criei a conta `qa-compliance-docs-kit@example.com` no Authentication, desativei,
  revoguei e reativei, e apaguei no fim do mesmo script (o log registrou `account: deleted`). Nada foi
  escrito no Firestore nem no Storage. Não há conta a limpar, e por isso ela não entrou na lista do
  `docs/PRE-PRODUCTION.md`.
- Auth emulator: a mesma conta, apagada no fim; o emulador não persiste dados.
- A senha da conta foi gerada em memória e não foi gravada em lugar nenhum.

## Lacunas herdadas, com veredito

| Lacuna | Veredito |
|---|---|
| Conta desativada com ID token aceito | fechada como medição (confirmada); o defeito continua aberto no backlog, fora do corte |
| Emissão de cookie com ID token anterior à revogação | fechada: o Firebase recusa, sem cookie novo |
| Não há rota de admin para revogar a sessão de outro usuário | continua aberta, fora do corte |
| Não há ferramenta que reaplique exclusão depois de restaurar backup | continua aberta, fora do corte |
| A API só lê o banco `(default)` | continua aberta, fora do corte |
| `review-checklist.md` não cobra `SUBPROCESSORS.md` e `ROPA.md` em integração nova | continua aberta; o `/review` já a mandou para o backlog |
| Comandos de backup e restauração | continua 🔒 até haver projeto no Blaze |
