# Handoff do `/develop`: borda da API (413 com `connection: close` e id inválido nas rotas `[id]`)

Plano: `analyze/plan.md`. Só `apps/api` e duas frases de documentação. Sem SDK, front, i18n, env ou infra.

## Blueprint → arquivos

| item do plano | arquivos |
|---------------|----------|
| §10.1 `refuseTooLarge()` com `connection: close` nos dois 413 | `apps/api/(shared)/lib/parse-request-json.ts` |
| §10.2 `findById` devolve `null` para id inutilizável | `apps/api/(shared)/repositories/base.repository.ts` |
| §10.3 limite do id em bytes UTF-8 | `apps/api/(shared)/lib/pagination.ts` (`DOCUMENT_ID_MAX_LENGTH` virou `DOCUMENT_ID_MAX_BYTES`, comparado com `Buffer.byteLength`) |
| §7.1 testes do helper | `apps/api/__tests__/parseRequestJson.test.ts` (+3 casos) |
| §7.2 testes do repositório | `apps/api/__tests__/baseRepository.test.ts` (+8 casos: 7 ids recusados com espião em `fakeDb.collection`, 1 controle de 1 500 bytes) |
| §7.3 testes de `isUsableDocumentId` | `apps/api/__tests__/paginationQuery.test.ts` (+4 casos) |
| §10.5 documentação | `docs/SECURITY.md` (subseção "Tamanho do corpo", um parágrafo novo), `AGENTS.md` (uma frase no item "Repositórios com mapper") |

O comentário de `refuseTooLarge` é o do blueprint (restrição externa: o Node segura o socket). O JSDoc de `parseRequestJson` ganhou "The 413 closes the connection."

## Contrato

Nenhum DTO ou action mudou. Mudou o comportamento de `BaseRepository.findById`, herdado por todo repositório: com id que `isUsableDocumentId` recusa, devolve `null` sem chamar `collection().doc()`. Chamadores afetados, conforme §1.3 e §4.2 do plano: `entities/[id]` e `users/[id]` (GET/PUT/DELETE), o webhook de pagamentos (`webhooks/payments/route.ts:50` e `:77`) e `session.repository.ts:62`. O cursor de paginação (`decodeCursor`) herda o limite em bytes.

## Códigos de erro

Nenhum novo. `ENTITY_NOT_FOUND`, `USERS_NOT_FOUND` e `VALIDATION_FAILED` já existem em `apiErrors` nos três idiomas.

## Medições (passo 0 e depois da correção)

Ambiente: emuladores (`pnpm emulators`, JDK 21 do Homebrew) com `pnpm seed`, `apps/api` em `next build` + `next start -p 3002`, tokens do Auth emulado obtidos por `accounts:signInWithPassword` com as contas do seed (usuário comum para `entities`, admin para `users`). Credenciais não foram gravadas: os tokens ficaram em `/tmp` e foram apagados.

Instrumento: `curl -s --path-as-is -o body -w '%{http_code}' -X <método> http://127.0.0.1:3002/<rota>/<id> -H "authorization: Bearer <token>"`, com `PUT` levando `{"name":"x"}`.

| id | antes (código de `3a118c6`) | depois |
|----|-----------------------------|--------|
| `a%2Fb` | **500** nos 6 (3 métodos × 2 rotas), corpo vazio. Log: `Value for argument "documentPath" must point to a document, but was "a/b"` | 404 `ENTITY_NOT_FOUND` / `USERS_NOT_FOUND` nos 6 |
| `__x__` | **500** nos 6. Log: `3 INVALID_ARGUMENT: Resource id "__x__" is invalid because it is reserved.` (recusa do emulador, não do driver) | 404 nos 6 |
| `a%2Fb%2Fc` | 404 nos 6 (lê a subcoleção, como o plano previa em §1.3) | 404 nos 6, sem leitura |
| 751 `é` codificado (1 502 bytes) | 404 nos 6: **o emulador aceita o id** | 404 nos 6, sem leitura |
| sem token, `GET /entities/a%2Fb` | 401 | 401 |

Depois da correção, `grep -c -E 'must point|INVALID_ARGUMENT'` no log do servidor deu 0. Sem regressão nos ids reais: `GET /entities/<primeiro id da lista do usuário>` → 200, `GET /users/<primeiro id da lista do admin>` → 200.

413, mesmo servidor, corpo de 5 MiB em `POST /auth/sign-in`, contagem com `lsof -nP -a -p <pid> -iTCP -sTCP:ESTABLISHED | grep -c 3002` 2 s depois:

| cenário | antes | depois |
|---------|-------|--------|
| `curl -D -` em `chunked` | `413`, `Connection: keep-alive` | `413`, `connection: close` |
| 20 × `chunked` em paralelo | 20 × 413, **20** conexões ESTABLISHED | 20 × 413, **0** |
| 20 × `content-length` declarado, `-H 'Expect:'` | não medido | 20 × 413, **0** |
| JSON inválido (`{nope`) | não medido | `400`, `Connection: keep-alive` |
| `unhandledRejection`/`AbortError` no log | não contado | 0 (`grep -c`) |

R1 no localhost: script com o `fetch` do Node 22.13.0, 5 MiB, cinco tentativas por camada. `content-length`: 5 × `413 conn=close`. `chunked` (`ReadableStream`, `duplex: "half"`): 5 × `413 conn=close`. Nenhum `ECONNRESET`.

Testes antes da correção: com os casos novos escritos e o código de `3a118c6`, `vitest run` dos três arquivos deu 10 falhas e 82 passes. As 10 falhas foram os dois casos de `connection: close`, os 7 ids recusados de `findById` e o caso de 751 `é` em `isUsableDocumentId`. Os controles (400 sem o header, 1 500 bytes aceitos) já passavam. Depois da correção, 0 falhas.

## Desvios

1. **⚠️ O critério de aceite sobre `.`/`..` não vale por HTTP.** O plano (§9, "Id inválido em `entities/[id]`") pede `404 ENTITY_NOT_FOUND` para `.` e `..`. Esses ids não chegam ao handler: `GET /entities/.`, `/entities/..`, `/entities/%2E` e `/entities/%2E%2E` recebem o 404 em HTML do próprio Next, antes da rota (medido com `curl --path-as-is`, depois da correção). Não é defeito do código e não há o que mudar na rota. A guarda de `.`/`..` em `findById` está coberta pelo teste unitário. O `/test` deve ler o critério como "404, sem 500" para esses dois.
2. **R3 se confirmou.** O emulador aceita id de 1 502 bytes (751 `é` → 404, sem erro no log). O limite em bytes fica justificado pela documentação do Firestore e pelo teste unitário; em produção, não foi medido.
3. **`__x__` dava 500 pelo emulador, não pelo driver.** O plano supunha que o driver lança em `doc("a/b")`, o que se confirmou. No reservado, quem recusa é o servidor (`INVALID_ARGUMENT`). A correção cobre os dois casos, porque age antes de qualquer chamada.
4. **Texto do `SECURITY.md` já tem números, mas de uma rajada de 20, não de 50.** O plano pedia rascunho para o `/test` completar. Escrevi com o que medi (20 envios, as duas camadas, R1 em localhost) e com a ressalva de que rede com latência e Vercel não foram medidas. Se o `/test` repetir com 50 e o resultado divergir, a frase precisa mudar.

## Achados fora do escopo (não corrigidos)

- **`FIREBASE_ADMIN_CLIENT_EMAIL=""` derruba o `next build` da `api`.** Com a variável vazia, o build falhou com `ZodError` em `FIREBASE_ADMIN_CLIENT_EMAIL` (`invalid_format`, email) e `FIREBASE_ADMIN_PRIVATE_KEY` (`too_small`). `packages/auth/keys.ts` lê os dois com `process.env.X` direto, sem `||`, e o `apps/api/.env.example` publica os dois como `""`. Medi isso exportando a variável vazia por cima do `.env` deste checkout, não com uma cópia limpa do `.env.example`; o `/test` ou o `/spec --sync` confirma e registra como achado. O `next dev` pode não passar pelo mesmo caminho.
- **`next start` sem `CORS_ORIGIN` sobe com `unhandledRejection`** no hook de instrumentação (`CORS_ORIGIN is required in production`). É comportamento intencional de produção, mas quem for medir em `next start` precisa exportar `CORS_ORIGIN`.
- O `apps/api/.env` deste checkout é antigo (chaves da era Clerk, service account em formato inválido). Para o smoke, sobrescrevi pelo ambiente do processo: hosts do emulador, `FIREBASE_ADMIN_PROJECT_ID=demo-next-boilerplate`, service account fictícia em formato válido (ignorada no modo emulado), `ARCJET_KEY` vazia e `CORS_ORIGIN`. O arquivo não foi tocado.

## Decisões em aberto

Nenhuma nova. As quatro da §11 do plano seguem como adotadas. A D4 (manter a checagem própria de `notifications/[id]/read`) continua; a suíte dela passa.

## Validação

| gate | comando | resultado |
|------|---------|-----------|
| typecheck | `pnpm --filter api typecheck` | exit 0 |
| testes | `pnpm --filter api test` | 112 arquivos, 1 453 testes, 0 falhas |
| lint | `pnpm check` | 965 arquivos, sem correção, exit 0 |
| i18n | não se aplica (nenhuma chave nova) | não rodado |

Processos: subi o emulador (PID do `pnpm emulators` e filhos) e o `next start` (PID próprio), com as portas 3002, 8080, 9099, 9199 e 4001 livres antes. Derrubei os dois pelo PID; `lsof` depois mostrou todas as portas livres. Os builds deixaram `apps/api/.next` (ignorado pelo git).

## A verificar no `/test`

- Itens 1 e 2 da §8 do plano com 50 envios e contagem também 60 s depois. Eu medi com 20 e só aos 2 s.
- R1 com mais amostras e, se possível, fora do loopback (ou com latência simulada). No localhost foram 10/10 413.
- Item 4 da §8 (`unhandledRejection`) durante a rajada de 50.
- Itens 6 a 9 da §8 já foram medidos aqui (tabela acima); o `/test` repete para ter medição própria, incluindo `PUT` e `DELETE` de uma entidade criada na hora (200/204), que eu não fiz.
- `GET /users/a%2Fb` responde 404, mas não conferi se o fallback `getMergedUserByUid` cria perfil. Repro: depois do GET, contar documentos de `user` no emulador.
- Webhook de pagamentos com `profileId` inválido nos metadados: o plano prevê `logProfileNotFound` em vez de 500. Não medido, exige evento Stripe assinado.

## Lacunas de teste conhecidas

- Sem teste de rota para id inválido (D6 do plano). A garantia está no teste do repositório.
- Sem teste de emulador (D7). O 500 de antes e o 404 de depois contra o emulador estão só neste handoff, medidos com `curl`.
