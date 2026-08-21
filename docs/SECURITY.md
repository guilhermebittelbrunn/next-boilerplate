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

## ⚠️ Firestore: achado crítico e como blindar

**Situação atual**: a `apps/api` acessa o Firestore pelo **client SDK do Firebase, não autenticado** (`apps/api/(shared)/infra/dabatase.ts`, com config pública hardcoded). Isso significa:

- As **security rules do Firestore se aplicam** ao acesso da API.
- Como a config do projeto é pública (vai no bundle do cliente), **se as rules forem permissivas, qualquer pessoa pode ler/escrever todos os dados direto no Firestore**, ignorando completamente os guards da API.
- Mas se as rules forem restritivas, a API (que não tem identidade autenticada) **perde acesso e quebra**.

**Postura recomendada (secure-by-default)**: todo acesso ao Firestore deve passar pela API via **firebase-admin**, que roda como serviço confiável e **ignora** as security rules. Então as rules podem **negar todo acesso direto de cliente**. É o que está em [`firestore.rules`](../firestore.rules) (`allow read, write: if false`).

**Migração necessária antes de publicar as rules** (ordem):
1. Em `apps/api/(shared)/infra/dabatase.ts`, troque o client SDK por `getFirestoreAdmin()` de `@repo/auth/server`.
2. Adapte `BaseRepository` e os repositórios para a API do **admin SDK** (`db.collection(...).doc(...).get()/set()/update()`, `Timestamp` do `firebase-admin/firestore`) em vez de `firebase/firestore` (`collection`, `getDocs`, `query`, `where`).
3. Configure as credenciais admin (`FIREBASE_ADMIN_*` — ver [`docs/SETUP.md`](SETUP.md)).
4. Publique as rules: `npx -y firebase-tools@latest deploy --only firestore:rules`.

Enquanto a migração não acontecer, **não publique** `allow read, write: if false` (a API quebra). Trate isso como a prioridade #1 de segurança do fork.

### Auditar as rules
- **Firebase MCP** (já conectado): use a skill `firebase:firebase-security-rules-auditor` para avaliar a robustez das rules — especialmente útil **se** adotar o modelo alternativo (regras por dono) comentado em `firestore.rules`. Para `allow ... if false` o resultado é trivialmente "máximo de restrição".
- CLI: `npx -y firebase-tools@latest deploy --only firestore:rules --dry-run` para validar sintaxe.

## Pagamentos (Stripe)

- O webhook (`apps/api/app/(routes)/webhooks/payments/route.ts`) **verifica a assinatura** (`stripe.webhooks.constructEvent` com `STRIPE_WEBHOOK_SECRET`) — mantenha isso; nunca processe o corpo sem verificar a assinatura.
- Os handlers de `checkout.session.completed` / `subscription_schedule.canceled` estão como **TODO** (persistir assinatura no perfil do usuário). Ver a skill `/payments-flow` e [`docs/PAYMENTS.md`](PAYMENTS.md).
- Nunca exponha `STRIPE_SECRET_KEY` no cliente; criação de checkout/portal é **server-side** (na API).

## Segredos e configuração

- Não commite `.env`/`.env.local`. As vars reais estão em [`docs/SETUP.md`](SETUP.md).
- **Higiene pendente**: mover a config Firebase hardcoded de `infra/dabatase.ts` para `NEXT_PUBLIC_FIREBASE_*`; limpar `.env.example` (chaves do upstream que não são usadas).
- `@repo/security` (Arcjet) fornece rate limiting e secure headers — habilite `ARCJET_KEY` em produção.

## Checklist ao revisar mudanças sensíveis

- [ ] Rota nova tem guard (`requireCommonPanelApi`/`requireAdminApi`) e checa posse.
- [ ] Nenhum header de auth do cliente é confiado sem validação server-side.
- [ ] Erros expõem só `error.code` (sem stack trace/PII).
- [ ] Acesso a dados via API; cliente não toca Firestore direto.
- [ ] Webhooks verificam assinatura.
- [ ] Segredos só no servidor; nada de `NEXT_PUBLIC_*` para chave secreta.

> Para uma varredura automatizada das mudanças pendentes, use a skill global `/security-review`.
