# Segurança

Modelo de segurança do boilerplate e como mantê-lo. Leia junto com [`docs/ARCHITECTURE.md`](ARCHITECTURE.md). Regra de ouro transversal: **autorização é sempre repetida no servidor** — UI oculta nunca é a única proteção.

## Autenticação

- **Provider**: Firebase. No cliente (`@repo/auth/client`), o usuário faz sign-in/sign-up (e-mail/senha ou Google) e obtém um **ID token**, sincronizado num cookie de sessão.
- **No servidor** (`@repo/auth/server`), o Firebase **Admin SDK** verifica o token (`verifyIdToken`) a partir do cookie `access-token` ou do header `Authorization: Bearer`. Falhas benignas (token expirado/ inválido) viram "sem sessão", não erro 500.
- **Identity Toolkit REST** (`FIREBASE_WEB_API_KEY`) é usado para sign-in/sign-up server-side em algumas rotas.

## Autorização (guards da API)

Toda rota da `apps/api` é embrulhada por um guard que roda **antes** da lógica:

- `requireCommonPanelApi` — exige um usuário comum válido; resolve `ctx.subjectProfile` (titular **ou** usuário personificado).
- `requireAdminApi` — exige perfil admin.

Os guards:
1. Validam o Bearer token (Firebase Admin).
2. Resolvem o perfil Firestore do **ator** (`userRepository.findByReferenceId(uid)`).
3. Resolvem o **subject** e validam o contexto de impersonação em `resolveAuthRequestContext` — os headers `x-role` / `requestUserId` enviados pelo SDK **não são confiados cegamente**: são validados server-side (papel, posse, permissão de painel).
4. Checam **posse** do recurso quando aplicável (ex.: `row.userId !== ctx.subjectProfile.id` → 404).

> Ao criar rotas, repita a checagem mesmo que o front já restrinja a navegação. Ver [`apps/api/CLAUDE.md`](../apps/api/CLAUDE.md) e a skill `/new-api-route`.

## Firestore: acesso por service account, rules em deny-all

**Postura vigente**: a `apps/api` acessa o Firestore pelo **Admin SDK** — `getFirestoreAdmin()` de `@repo/auth/server`, resolvido em `apps/api/(shared)/infra/database.ts` e injetado no `BaseRepository`. Como serviço confiável, a API **ignora** as security rules; então [`firestore.rules`](../firestore.rules) pode **negar todo acesso direto de cliente** (`allow read, write: if false`) sem afetar a API.

> ⛔ **ESTADO ATUAL: as rules do arquivo NÃO estão publicadas.** O código da API já roda no Admin SDK, mas
> enquanto o `deploy` abaixo não for executado a base continua **legível e gravável** por qualquer pessoa
> com a chave pública do projeto — medido: a leitura direta via REST devolve **200 com dados reais**. O
> arquivo `firestore.rules` estar em `deny-all` **não protege nada** até ser publicado. Trate como a
> pendência #1 de segurança do fork.

Consequências (uma vez publicadas):

- Nenhum cliente (browser) toca o Firestore: o front fala só com a API via `@repo/sdk`. A chave pública do projeto deixa de ser um caminho de leitura dos dados.
- A API **não sobe** sem `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL` e `FIREBASE_ADMIN_PRIVATE_KEY`: `apps/api/instrumentation.ts` resolve a instância no boot e o processo morre com mensagem clara se faltar alguma. Não existe modo degradado — credencial ausente é erro de configuração, não estado de negócio.
- `packages/auth/keys.ts` trata a service account como **tudo ou nada**: um conjunto parcial é erro de env (antes passava e só explodia no primeiro request).

### Publicar rules e índices

```bash
npx -y firebase-tools@latest login                                          # uma vez por máquina
npx -y firebase-tools@latest deploy --only firestore:rules --dry-run        # valida a sintaxe
npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes
```

O projeto alvo vem do [`.firebaserc`](../.firebaserc) versionado. **Um fork publica com `--project <id-do-fork>`** — ver [`docs/SETUP.md`](SETUP.md).

⛔ **Ordem e rollback**: publique as rules **depois** de a API estar rodando no Admin SDK; o inverso deixa a API sem acesso. E o rollback correto é **reverter o código da API primeiro** — republicar rules permissivas sem reverter reexpõe a base inteira, o que não é rollback.

### Verificar que o furo está fechado

Com as rules publicadas, uma leitura direta com a chave pública do projeto deve ser **negada**:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  "https://firestore.googleapis.com/v1/projects/<projectId>/databases/(default)/documents/entity?key=<NEXT_PUBLIC_FIREBASE_API_KEY>"
```

Esperado **403** (`PERMISSION_DENIED`). Com rules permissivas o mesmo comando devolve **200 com os dados** — é a medida da vulnerabilidade. Não salve o corpo da resposta: ele contém dados reais.

### Auditar as rules
- **Firebase MCP** (já conectado): use a skill `firebase:firebase-security-rules-auditor` para avaliar a robustez das rules — especialmente útil **se** adotar o modelo alternativo (regras por dono) comentado em `firestore.rules`. Para `allow ... if false` o resultado é trivialmente "máximo de restrição".
- CLI: `npx -y firebase-tools@latest deploy --only firestore:rules --dry-run` para validar sintaxe.

## Borda HTTP: cabeçalhos, CSP, CORS e limite de requisições

Os três controles vivem no `proxy.ts` de cada app e na política genérica de `@repo/security`
(`middleware.ts` monta as opções, `applySecurityHeaders` as aplica na resposta que o proxy já construiu).

### Cabeçalhos de segurança + CSP

| App | Política | Observação |
|-----|----------|------------|
| `apps/app` | `Content-Security-Policy` **bloqueante** | Maior superfície: analytics, avatar do Google, popup de login |
| `apps/api` | `Content-Security-Policy` **bloqueante**, `default-src 'none'` | Responde JSON; o único HTML é a página de erro do Next |
| `apps/web` | `Content-Security-Policy-Report-Only` | Só relata no console — rede de segurança para o que a landing venha a carregar |

Três defaults do nosecone são **deliberadamente afrouxados** nos front-ends, porque derrubam o login:

- `Cross-Origin-Opener-Policy` vai para `same-origin-allow-popups` — `same-origin` corta `window.opener` e o popup do Google nunca devolve a credencial (falha silenciosa: o popup fecha e nada acontece).
- `Cross-Origin-Embedder-Policy` fica **desligado** — `require-corp` exigiria CORP no avatar servido pelo Google.
- `frame-src` lista `https://<NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN>` — o resolver do popup monta um iframe oculto ali.

⚠️ **`script-src` ainda usa `'unsafe-inline'`.** O script anti-flash do `next-themes`, o bootstrap de hidratação do App Router e o `gtag` são inline **sem nonce**, e fiar nonce nos três é tarefa própria. O valor desta política vem das demais diretivas (`frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'self'` e as allowlists de `connect-src`/`img-src`/`frame-src`); o bloqueio de XSS por `script-src` é parcial até lá. `style-src 'unsafe-inline'` é irremovível nesta stack (antd CSS-in-JS, `next-themes`, `sonner`).

> **Ao introduzir um terceiro, acrescente-o à CSP do app** — é o custo herdado. Ex.: levar o checkout da Stripe ao browser exige `script-src https://js.stripe.com`, `frame-src https://js.stripe.com https://hooks.stripe.com` e `connect-src https://api.stripe.com`.

### CORS (allowlist, sem coringa)

`CORS_ORIGIN` é uma **lista separada por vírgula** e é **obrigatória em produção** — a exigência é aplicada no boot (`apps/api/instrumentation.ts`), não no env tipado, para que o build não passe a exigir valor de produção em qualquer ambiente. Decisão por requisição:

| Situação | Resposta |
|----------|----------|
| Sem header `Origin` (servidor→servidor, prefetch RSC) | Passa, **sem** cabeçalho de CORS |
| `Origin` na allowlist | Ecoa aquela origem + `Vary: Origin` |
| `Origin` fora da allowlist | `403 { "error": { "code": "AUTH_FORBIDDEN_ORIGIN" } }`; preflight recebe `204` **sem** `Access-Control-Allow-Origin` |

Refletir a origem **após** conferir a allowlist é a implementação canônica de multi-origem (o cabeçalho não aceita lista); o anti-padrão é refletir incondicionalmente.

### Limite de requisições

`checkRateLimit()` (Arcjet, `slidingWindow` de **20 req/60 s por IP**) roda no proxy da API apenas em `/auth/sign-in`, `/auth/sign-up` e `/auth/sign-in/google`. Estouro devolve `429 AUTH_RATE_LIMITED` + `Retry-After`. Ficam de fora `/auth/me` (autenticada, hot path), `/webhooks/payments` (a Stripe faz retry agressivo; um 429 nosso viraria assinatura perdida) e `/health`.

- **Sem `ARCJET_KEY` o limite é um no-op explícito**: nada é contado, nenhuma chamada de rede é feita, e a API avisa **uma vez, no boot**. Nunca há contador em memória — em serverless ele não limita nada.
- ⚠️ **Isto não protege o formulário de login.** O login por e-mail/senha das duas front-ends vai do browser direto para `identitytoolkit.googleapis.com` e **nunca toca a `apps/api`**; quem limita esse caminho é a proteção nativa do Firebase (`USERS_AUTH_RATE_LIMITED`). O limite aqui cobre a **superfície da API**.
- Bloqueio é registrado com um `console.warn` de uma linha (`[security] blocked reason=… path=… method=…`), **sem IP, e-mail, body ou token** — IP é dado pessoal sob LGPD.

## Pagamentos (Stripe)

- O webhook (`apps/api/app/(routes)/webhooks/payments/route.ts`) **verifica a assinatura** (`stripe.webhooks.constructEvent` com `STRIPE_WEBHOOK_SECRET`) — mantenha isso; nunca processe o corpo sem verificar a assinatura.
- Os handlers de `checkout.session.completed` / `subscription_schedule.canceled` estão como **TODO** (persistir assinatura no perfil do usuário). Ver a skill `/payments-flow` e [`docs/PAYMENTS.md`](PAYMENTS.md).
- Nunca exponha `STRIPE_SECRET_KEY` no cliente; criação de checkout/portal é **server-side** (na API).

## Segredos e configuração

- Não commite `.env`/`.env.local`. As vars reais estão em [`docs/SETUP.md`](SETUP.md).
- **Higiene pendente**: limpar `apps/api/.env.example` (chaves do upstream que não são usadas: Clerk, `DATABASE_URL`, BetterStack, Svix, Knock, Liveblocks, BaseHub).
- `@repo/security` (Arcjet + nosecone) fornece rate limiting e secure headers — habilite `ARCJET_KEY` em produção e defina `CORS_ORIGIN` **antes** do primeiro deploy da API.

## Checklist ao revisar mudanças sensíveis

- [ ] Rota nova tem guard (`requireCommonPanelApi`/`requireAdminApi`) e checa posse.
- [ ] Nenhum header de auth do cliente é confiado sem validação server-side.
- [ ] Erros expõem só `error.code` (sem stack trace/PII).
- [ ] Acesso a dados via API; cliente não toca Firestore direto.
- [ ] Webhooks verificam assinatura.
- [ ] Segredos só no servidor; nada de `NEXT_PUBLIC_*` para chave secreta.
- [ ] Domínio de terceiro novo (script, iframe, imagem, endpoint) foi acrescentado à CSP do app que o carrega.

> Para uma varredura automatizada das mudanças pendentes, use a skill global `/security-review`.
