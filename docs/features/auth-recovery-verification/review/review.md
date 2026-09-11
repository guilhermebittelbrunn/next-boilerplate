# Revisão — Recuperação de senha e verificação de e-mail

- **Slug**: `auth-recovery-verification`
- **Data**: 2026-09-10
- **Escopo revisado**: o diff da feature (`packages/shared`, `packages/sdk`, `apps/api`, `packages/auth`,
  `apps/app`, `packages/internationalization`, `packages/email` (teste), `docs/features/<slug>/`).
  O sync do backlog (`specs/`) **não teve o mérito revisado** — só o enquadramento nos commits (§8).
- **Veredito**: **nada bloqueante em aberto**. O corte de MVP da spec está entregue. Os 3 defeitos que o
  `desenvolvedor` reportou foram **confirmados como realmente corrigidos**, dois deles com medição própria
  (§2).
- **Encontrado e corrigido nesta etapa**: o **oráculo de enumeração por tempo** (D-A, fechado com
  `after()` e **remedido** — §7.0); o **idioma atrasado uma navegação** no escopo não-autenticado (§7.0b);
  o **beco sem saída do reenvio** (D-C, §7.1) e — descoberto ao reproduzi-lo — um 🔴 **pré-existente** que
  deixava **todo toast com texto branco sobre fundo branco em light mode**, tornando os 6 `error.code`
  novos invisíveis no tema padrão. Mais 5 ajustes menores, incluindo **3 senhas de QA em texto puro**
  removidas de artefato versionado.
- **Restam 3 decisões em aberto** (D-B, D-D, D-E) + o enquadramento já decidido (D-F). Nenhuma bloqueia.

---

## 1. Branch

| item | valor |
|---|---|
| **Nome** | `feat/auth-recovery-verification` |
| **Ação** | **criada** nesta etapa (`git switch -c`) |
| **Base** | `spec-sync-then-next-task` @ `400f290`, que era **idêntico a `origin/main`** (0 commits à frente) — a troca preservou o working tree inteiro |
| **Descartada** | `spec-sync-then-next-task` — nome gerado por rename automático do harness, fora do padrão do repo e sem relação com o trabalho |

**Por que sem `<project>`**: a regra de [`git-commits.md`](../../../../.claude/rules/git-commits.md) manda
omitir o escopo quando o trabalho cruza **vários apps**. Este diff toca `apps/api` **e** `apps/app` (além
de 4 pacotes), então nem `api/`, nem `app/`, nem `packages/` descrevem o conjunto: qualquer um deles
mentiria sobre metade da mudança. Daí `feat/<title>`, sem prefixo de projeto.

⚠️ O working tree traz **dois assuntos** (feature + sync do backlog). Como `HEAD` estava em `main`, os dois
vivem nesta mesma branch — separados por commit, não por branch (§8).

---

## 2. Os 3 defeitos reportados pelo `desenvolvedor` — reconferidos

Os três foram verificados no código **e** exercitados contra a API rodando. Resultado: todos realmente
corrigidos. Um deles, porém, deixa um resíduo que o handoff não mede (§3, achado 1).

### 2.1 ✅ Anti-enumeração — resposta idêntica confirmada, byte a byte

`getUserByEmail` antes do gerador de link (`auth-action-links.ts:47-55`), e **qualquer** recusa do gerador
virando `null` (`:63-72`). Medido com a API no ar, e-mail conhecido × desconhecido:

| dimensão | resultado |
|---|---|
| **Status** | `200` nos dois |
| **Corpo** | `{"data":{"requested":true}}` — `cmp` byte-idêntico |
| **Headers** | `diff` vazio (só `Date` difere) — 22 headers iguais, incl. CORS e CSP |
| **Tela** | screenshots do painel "Pedido recebido" com **SHA1 idêntico** (`6b1ef84f…`), reproduzido de forma independente do V2 do handoff |
| **Log** | `[email] failed template=action-link reason=provider-error locale=pt-br` — **sem o endereço** |

O `EMAIL_NOT_CONFIGURED` também não vaza nada: `canSendAuthActionLink()` é a primeira instrução do handler
(`reset-request/route.ts:15`), então a resposta é função só da configuração do fork. Confirmado com
`RESEND_*` vazios: **503 para conhecido e desconhecido igualmente**.

**Mas o *timing* não é idêntico** — ver achado 1 (§3). A afirmação "anti-enumeração byte a byte" do
`STATE.md`/handoff vale para a **resposta**, não para o **observável**.

### 2.2 ✅ `skipValidation` descartando os `extends` — diagnóstico correto, correção segura

Confirmei a causa na fonte da dependência, não por dedução —
`node_modules/@t3-oss/env-core/dist/src-Bb3GbGAa.js:36`:

```js
const skip = !!opts.skipValidation;
if (skip) return runtimeEnv;        // ← retorna antes de montar `extendedObj`
```

O merge de `extends` só acontece 30 linhas abaixo (`(opts.extends ?? []).reduce(...)`), inalcançável quando
`skip` é `true`. O diagnóstico do `desenvolvedor` está certo: em dev, `apps/api` só vê o próprio
`runtimeEnv`.

**Raio de impacto da correção — seguro, e não pode quebrar `next dev`:**

| cenário | efeito |
|---|---|
| `next dev` | `skipValidation` continua `true` → `createEnv` **retorna antes de validar**. Nenhuma var nova passa a ser exigida. Impossível quebrar por env faltante |
| `build`/produção | a var entrou como `z.url().optional()` → **nenhum requisito novo**. Um fork sem `NEXT_PUBLIC_APP_URL` builda como antes (e o reset responde `EMAIL_NOT_CONFIGURED`, que é o desenho) |
| runtime em dev | verificado no ar: `POST /auth/password/reset-request` responde **200** (antes: 503 sempre) |

Resposta direta à pergunta: **não**, a mudança não quebra `next dev` nem o build por env faltante. Ela só
adiciona uma chave opcional.

⚠️ **A correção é local, a causa não.** Ver achado 2 (§3): encontrei **outro** consumidor de `extends` já
quebrado em dev pelo mesmo motivo.

### 2.3 ✅ `reloadCurrentUser()` em `packages/auth/client.ts` — genérico, não duplica nada

| critério | veredito |
|---|---|
| **Genérico?** | Sim. `reload(user)` + `getIdToken(true)` é operação de sessão Firebase, zero domínio de produto. `packages/auth` é pacote de **integração**, onde a exceção da regra "genérico no pacote" se aplica por definição |
| **Duplica algo?** | Não. `getIdToken` (`:172`) só renova o token; nada no pacote relia o registro da conta. Verifiquei os 6 exports de sessão (`signIn`, `signInWithGoogle`, `signUp`, `logout`, `loginWithCustomToken`, `getIdToken`) |
| **Justifica o desvio de D-5?** | Sim. D-5 recusa os **remetentes** do client SDK (`sendPasswordResetEmail`/`sendEmailVerification`), que mandam pela página hospedada do Firebase. Um `reload` não envia e-mail nenhum. A alternativa era importar `firebase/auth` dentro de `apps/app`, furando a fronteira do pacote — pior |
| **Necessário?** | Sim, e por um motivo real: `User.emailVerified` vem do registro da conta, não do ID token. O comentário em `client.ts:182-188` documenta exatamente isso, de forma autocontida |

Correção da lacuna declarada no handoff: **`packages/auth` tem suíte Vitest** —
`__tests__/firebaseClient.test.ts` (10 casos sobre `client.ts`, com `firebase/auth` já mockado) e
`middleware.test.ts`. O handoff §9 afirma o contrário. Ver §6.

---

## 3. Achados

| # | sev | arquivo:linha | problema | ação |
|---|---|---|---|---|
| 1 | 🟡 | `apps/api/app/(routes)/auth/password/reset-request/route.ts:40` | **Oráculo de enumeração por tempo.** A resposta é byte-idêntica, mas o caminho do e-mail conhecido faz `getUserByEmail` + `generatePasswordResetLink` + `await sendEmail`; o desconhecido para no primeiro. **Medido 4×: conhecido 1127–1265 ms, desconhecido 288–295 ms — zero sobreposição** | **✅ corrigido e remedido** — ver §7.0 |
| 1b | 🟡 | `apps/app/app/[locale]/(unauthenticated)/layout.tsx:11` **+ os 5 `generateMetadata` do escopo** | **Idioma atrasado uma navegação.** O `getDictionary()` do servidor lê **só o cookie `x-locale`** (`server.ts:19-27`), escrito *depois* do render: `/en` mostrava o painel de depoimento em pt-br, `/es` em en. O `h1` escapava porque vem do `getDictionary` **client**, que resolve por `useParams()`. O mesmo padrão estava nos 5 `generateMetadata` do escopo, deixando o `<title>` atrasado junto | **✅ corrigido** — ver §7.0 |
| 2 | 🟡 | `apps/api/app/(routes)/webhooks/payments/route.ts:30,46` | A causa-raiz de §2.2 **continua ativa para outros consumidores**: `env.STRIPE_WEBHOOK_SECRET` vem de `payments()` via `extends` → `undefined` em dev → o webhook da Stripe cai no early-return e **não processa evento nenhum** localmente (`pnpm --filter api dev:with-stripe` fica inútil). Mesma classe do achado gêmeo em `apps/web/env.ts:22`, ainda aberto no backlog | **Decisão em aberto D-B** — fora do escopo da feature |
| 3 | 🟡 | `apps/api/app/(routes)/auth/email-verification/send/route.ts:48-53` | **Beco sem saída com copy errada.** Quando o Firebase estrangula a geração de links (devolve `auth/internal-error` opaco), `buildAuthActionLink` → `null` → o reenvio **autenticado** responde `AUTH_EMAIL_VERIFICATION_FAILED`, cuja copy é *"Não foi possível **confirmar** o e-mail. **Peça um novo link**."* — para quem acabou de apertar "Reenviar". **Reproduzido no browser**: log `[auth-action-link] refused kind=verify-email code=auth/internal-error` + `POST … 400` e o toast errado na tela | **✅ corrigido** — ver §7.1 |
| 3b | 🔴 | `packages/design-system/hooks/useAlert.ts:9,19` | **Todo toast tinha texto branco sobre fundo branco em light mode** — achado *ao reproduzir* o item 3. O `theme` do `next-themes` é a **preferência crua**, que no default vale a string `"system"`, tema que o `react-toastify` não conhece: sem stylesheet correspondente ele mantém o texto branco default, enquanto o `className` do próprio hook força `bg-background` (branco em light). Medido: `color: rgb(255,255,255)` sobre `bg: lab(100 0 0)` → **contraste 1:1, texto invisível**. Efeito nesta feature: os **6 `error.code` novos não chegavam ao usuário** no tema padrão — o item 5 do corte de MVP estava só nominalmente entregue. Pré-existente e atingia **todo** `errorAlert`/`successAlert` dos 3 apps | **✅ corrigido** — ver §7.1 |
| 4 | 🟡 | `apps/app/.../sign-up/components/SignUpFormClient.tsx:100-115` | **Corrida com a navegação.** O `onSuccess` do `mutate` dispara `sendEmailVerification` **depois** do `onSuccess` do hook (`:42-50`), que já fez `router.push`; e o efeito de `:64-92` faz `window.location.replace` (navegação dura), que **cancela requisição em voo**. Observado a favor (`POST /auth/email-verification/send` completou), mas é ordenação, não garantia | **Decisão em aberto D-D**. Degradação é graciosa (o banner tem "reenviar"), por isso não é 🔴 |
| 5 | 🟡 | `docs/features/.../develop/handoff.md:226` | **Credencial em artefato versionado**: 3 senhas de contas de QA do projeto Firebase de dev, em texto puro, prontas para entrar no commit. Viola `git-commits.md` ("Nunca commite credencial que tenha vazado para print ou roteiro de teste") | **✅ corrigido** — senhas removidas, a informação operacional (quais contas mudaram) preservada |
| 6 | 🟡 | `docs/features/.../develop/handoff.md:246-247` | Afirma que "`packages/auth` não tem suíte Vitest hoje" para justificar a ausência de teste de `reloadCurrentUser`. **Falso**: `packages/auth/__tests__/firebaseClient.test.ts` existe e já mocka `firebase/auth`. A lacuna é barata de fechar, não bloqueada | **Registrado em §6** para o `/test` |
| 7 | 🟢 | `apps/app/.../(unauthenticated)/components/AuthCard.tsx:9` | Docblock afirmava ser "o painel que as telas de sign-in e sign-up usam" — **nenhuma das duas usa**; ambas mantêm o markup próprio. Comentário que mente | **✅ corrigido** — removido (o nome já se explica) |
| 8 | 🟢 | `apps/api/(shared)/lib/auth-action-links.ts:19` | `(error as { code?: unknown }).code` estoura `TypeError` se algo lançar `null`/`undefined`, mascarando o erro original | **✅ corrigido** — optional chaining |
| 9 | 🟢 | `apps/api/(shared)/lib/auth-action-links.ts:79` | `env.NEXT_PUBLIC_APP_URL as string` — a asserção é uma promessa que o tipo não sustenta (a var é `optional()`); sem ela o link sairia `"undefined/pt-br/…"` | **✅ corrigido** — guard explícito, `as string` eliminado |
| 10 | 🟢 | `apps/app/.../sign-up/components/SignUpFormClient.tsx:96` | "Fire and forget" descrevia mal o código: a função **é** aguardada dentro do callback do `mutate` | **✅ corrigido** — reescrito para dizer a garantia real |
| 11 | 🟢 | `apps/app/proxy.ts:70-72` | `isOobActionPath` é por **path**, não por presença de `oobCode`. Efeito: visitante logado em `/reset-password` **sem** código vê "Link inválido" em vez de ir para casa (**confirmado no browser**). Sem impacto de segurança — a tela é pública e não revela nada | Não aplicado — ver §7 (nit) |
| 12 | 🟢 | `docs/features/.../develop/screenshots/` | 30 PNGs, **1,2 MB**, versionados para sempre num repo cuja função é ser forkado | **Decisão em aberto D-E** |

### ✅ Conforme as convenções (verificado, não presumido)

- **SDK é a única porta**: `rg` por `fetch(`/`axios` nos arquivos novos de `apps/app` → **zero**. As 4 telas
  usam `apiClient.authApi.*`. Nenhuma URL de API hardcoded. As 4 ações estão em `AuthActions`, o erro
  **propaga cru** (sem `FormattedError` dentro do SDK) e os tipos saem do mesmo módulo.
- **Rate limit — as 4 rotas, conferidas literal contra o path real** (`(routes)` é route group, não entra
  na URL):

  | `RATE_LIMITED_PATHS` | rota no disco | bate |
  |---|---|---|
  | `/auth/password/reset-request` | `app/(routes)/auth/password/reset-request/route.ts` | ✅ |
  | `/auth/password/reset` | `app/(routes)/auth/password/reset/route.ts` | ✅ |
  | `/auth/email-verification/send` | `app/(routes)/auth/email-verification/send/route.ts` | ✅ |
  | `/auth/email-verification/confirm` | `app/(routes)/auth/email-verification/confirm/route.ts` | ✅ |

  **Barra final não é bypass** (testado): `POST /auth/password/reset/` recebe **308** do próprio Next para
  `/auth/password/reset`, e a repetição cai no path contado. O 308 não alcança handler, não gasta cota nem
  manda e-mail.
- **Isenção do `oobCode` é mínima e não abre nada** (testado no browser, 4 combinações):
  logado + `/reset-password?oobCode=X` → **fica, código intacto**; logado + `/verify-email?oobCode=X` →
  fica; logado + `/forgot-password` → **bounce para `/pt-br`** (isenção não vazou para a 3ª tela pública);
  logado + `/sign-in` → bounce. E em sessão **anônima isolada**, `/pt-br`, `/pt-br/entities` e
  `/pt-br/admin` continuam todos redirecionando para `sign-in` com o deep link preservado — as adições a
  `PUBLIC_PATHS` não alargaram acesso autenticado.
- **`error.code` nos 3 idiomas**: os 6 códigos novos estão em `apiErrors` pt-br/en/es com estrutura
  idêntica; teste de paridade verde (§5).
- **Zero string de UI solta**: as 4 telas novas, o banner e o hook só leem do dictionary. Não há
  `aria-label` literal — não há `aria-label` nenhum, e não falta: o `Alert` do design system já traz
  `role="alert"` (`alert.tsx:29`), então o comentário de "live region" em `EmailNotVerifiedNotice.tsx:15-19`
  é verdadeiro. Toasts saem de `apiErrors` via `FormattedError` + `handleClientError`.
- **Design system**: `HookFormInput`/`HookFormInputPassword` de `components/form/hookform`; **nenhum**
  `errorMessage` no diff; `Alert`/`Button` reaproveitados. `Container`/`FormContainer`/`Footer`/`Table` são
  N/A aqui — são de página de formulário do painel, e estas são telas de auth centralizadas, irmãs do
  `SignInForm`. **`AuthCard` é justificado, não reinvenção**: não existe primitivo equivalente no design
  system, ele não faz fetch nem lê sessão, é presentacional puro (sem `"use client"`), mora em
  `apps/app` (correto — é específico do app, não genérico), e substitui **7** repetições do mesmo wrapper.
- **Validação na borda**: os 4 schemas Zod em `(shared)/validation/auth.schema.ts` com o contrato
  `{ ok, value } | { ok, response }`, via `parseRequestJson`, magic numbers extraídos em consts
  (`EMAIL_MAX`, `MIN_PASSWORD_LENGTH`, `PASSWORD_MAX`, `OOB_CODE_MAX`).
- **Autorização espelhada**: o reenvio resolve o **ator** (`resolveApiActor`), nunca o sujeito
  personificado — coberto pelo teste *"mails the actor, never an address taken from the body"*. O banner
  esconde-se sob impersonação **e** a rota age sobre o ator: proteção nos dois lados, não só na UI.
- **Comentários**: `rg` por `plan.md|handoff.md|review.md|docs/features|STATE.md|"no review"` em
  `apps/` + `packages/` → **zero ocorrências**. Nenhuma narração de autoria/etapa. Os comentários que
  ficaram explicam **porquê** não óbvio (assimetria D-2/D-4, revogação de sessão, `emailVerified` fora do
  token, isenção do `oobCode`) — dentro das duas exceções da regra.
- **Firestore**: N/A confirmado — `emailVerified` vive no Auth. Nenhum repositório, mapper ou regra tocada.
- **Handler sem guard**: as 3 rotas públicas usam `export async function POST`, igual às `auth/sign-in`,
  `auth/sign-up` e `auth/sign-in/google` existentes. O `export const X = guard(...)` do checklist
  pressupõe um guard, e aqui não há sessão para exigir — o `oobCode` **é** a credencial (há teste
  explícito para isso). Consistente com o vizinho, não desvio.

---

## 4. Raio de impacto

| mudança de contrato | consumidores | risco |
|---|---|---|
| `AuthActions` +4 métodos, +6 tipos (`packages/sdk`) | **só adição**; `me()` e `signInWithGoogle()` intocados. Novos chamadores: `ForgotPasswordForm`, `ResetPasswordForm`, `SignUpFormClient`, `useEmailVerification` | nenhum — nada existente muda de assinatura |
| `HTTP_STATUS.SERVICE_UNAVAILABLE` (`packages/shared`) | +1 chave num objeto lido por `apps/api`, `apps/app`, `apps/web` | nenhum |
| `reloadCurrentUser` (`packages/auth/client.ts`) | 1 chamador (`useEmailVerification`) | nenhum — export novo |
| `apps/api/env.ts` +`NEXT_PUBLIC_APP_URL` | o módulo `env` da `apps/api` inteira | **nenhum** — ver §2.2 |
| `apps/api/proxy.ts` `RATE_LIMITED_PATHS` +4 | toda request à API passa por `isRateLimitedPath` | nenhum — 4 paths novos, os 3 antigos intocados |
| `apps/app/proxy.ts` `PUBLIC_PATHS` +3, `OOB_ACTION_PATHS` | **toda** navegação da `apps/app` | verificado no browser em 8 combinações (§3) — nada alargado |
| `apiErrors` +6 códigos | `FormattedError` nos 3 apps | nenhum — só adição, paridade testada |
| `email-verification/send` `400`→`503` + `EMAIL_SEND_FAILED` (D-C) | 1 chamador (`useEmailVerification` → banner) | nenhum — o front já mapeia `error.code` genericamente; nada lê o status. Contrato **não** cresceu: código reusado, sem chave nova |
| **`useAlert`** (`packages/design-system`) — achado 3b | **todo** `successAlert`/`infoAlert`/`warningAlert`/`errorAlert` de `apps/app` **e** `apps/web` | assinatura **inalterada** (só o valor de `theme` passado ao `react-toastify`). Efeito é sempre melhorar contraste; verificado sem regressão nas variantes de erro **e** de sucesso (§7.1) |

**Nada em `apps/web`** diretamente. A única mudança que o alcança é a de `useAlert` (3b), e só para
tornar seus toasts legíveis — é o motivo de ela estar em commit próprio e derrubável (#13).

---

## 5. Gates

Rodados **de novo, do zero**, depois de D-A, do idioma, de D-C e do achado 3b:

| gate | comando | resultado |
|---|---|---|
| Lint/format | `pnpm check` | ✅ **456** arquivos, 0 erro |
| CI completo — **passe 1** | `pnpm turbo run lint typecheck test --force` | ✅ **23/23** |
| CI completo — **passe 2** | idem | ✅ **23/23** |
| Paridade i18n | `pnpm --filter @repo/internationalization test` | ✅ 27 testes (incl. `parity.test.ts`) |

Suítes que cresceram: `authPasswordReset.test.ts` 16 → **24** (D-A, §7.0) e `authEmailVerification.test.ts`
13 → **14** (D-C). No segundo, o antigo *"reports a link that could not be generated"* virou *"reports a
link the provider would not mint as a failed send"* (503 + `EMAIL_SEND_FAILED`), mais o teste de regressão
*"never answers the resend with a confirmation error code"*, que falha se `AUTH_EMAIL_VERIFICATION_FAILED`
reaparecer no corpo do reenvio. `apps/app` foi de 24 para **26 arquivos** de teste (contribuição do QA).

Confirmei também que `packages/design-system/hooks/useAlert.ts` **é** coberto pelo Biome (a exclusão do
`biome.jsonc` vale para `components/{ui,lib,hooks}`, não para `hooks/` na raiz do pacote).

**`securityPolicySources.test.ts` — não reproduzi a falha** em 6 passes ao todo. Mas a fragilidade se
confirma pelo outro lado: o Vitest marca os dois em **amarelo** por lentidão — `app` **1960–2203 ms**,
`web` **1077–1378 ms**, contra o `testTimeout` **default de 5 s** que o arquivo não sobrescreve. Margem de
~2,3× num runner ocioso; num runner de CI carregado, encosta. O risco registrado pela auditoria é real, só
não determinístico.

**Contagens do handoff §6 não batem** com o que medi na `apps/api`: ele diz *25 arquivos / 228 testes*, e são
**22 arquivos / 194 testes** (`apps/app` bate: 24/170). Sem impacto técnico — mas o `/test` não deve usar
esses números como linha de base.

---

## 6. Lacunas de teste (para o `/test`)

Mantenho as 9 do handoff §9, com **duas correções** e **três adições**:

**Corrigidas**
1. **`reloadCurrentUser` — não está bloqueado por "falta de suíte".** `packages/auth/__tests__/firebaseClient.test.ts`
   existe, cobre `client.ts` e já mocka `firebase/auth`. Teste barato: assertar que `reload` **e**
   `getIdToken(true)` são chamados (as duas metades, que é justamente o que o defeito 2.3 exigia) e que
   retorna `null` sem `currentUser`. **Recomendo fechar no `/test`.**
2. **V9 (banner sob impersonação)** — o handoff sugere fechar por browser. Já está coberto de forma
   determinística por `emailNotVerifiedNotice.test.tsx` nos 4 termos do guard, **e** o lado servidor está
   coberto por *"mails the actor, never an address taken from the body"*. O ganho de dirigir impersonação
   real é baixo; se o custo for criar admin + comum com perfil no Firestore, **não vale**.

**Adições**
3. ~~Timing do `reset-request`~~ — **fechada nesta etapa**: *"resolves nothing about the account before
   answering"* e *"defers the same amount of work for an address with no account"* (§7.0) travam a
   propriedade no nível em que ela é determinística. A latência em si continua sendo medida à mão, porque
   cronômetro em CI é teste instável por construção.
4. **Corrida sign-up × navegação** (achado 4): difícil em unitário; vale um passo no roteiro manual —
   cadastrar com rede estrangulada e conferir se o `POST /auth/email-verification/send` chega.
5. **Contraste dos toasts** (achado 3b): não há teste que impeça a regressão. Um teste de `useAlert`
   assertando que o `theme` passado ao `react-toastify` é sempre `"light"` ou `"dark"` — **nunca**
   `"system"` — é barato e trava a classe inteira do defeito. `packages/design-system` não tem suíte
   Vitest hoje; se criar uma for caro, vale ao menos um passo de roteiro manual: **disparar um erro com o
   tema em "system" e conferir que o texto é legível**.
6. **Idioma pelo segmento** (achado 1b): nada impede alguém de voltar a `getDictionary()` num Server
   Component com `[locale]` à mão. Um teste de render do layout com `params` de cada idioma, conferindo o
   depoimento, cobre o escopo inteiro. Enquanto não existir, o roteiro manual precisa de um passo que
   **navegue entre idiomas** — o defeito é invisível num carregamento único.

---

## 7. Correções aplicadas

Todas ficam **no working tree**, sem commit — confira no `git diff` antes de aprovar.

### 7.0 D-A — oráculo de tempo fechado com `after()`, e remedido

`reset-request/route.ts`: `buildAuthActionLink` + `sendEmail` saíram do caminho da resposta e foram
para um `after()` (`next/server`, Next 16). A resposta sai antes de **qualquer** consulta de conta, então
o tempo deixa de ser função da existência do endereço por construção, e não por ajuste fino.

**O `EMAIL_NOT_CONFIGURED` continua síncrono e primeiro**, como pedido: ele é função só da configuração do
fork, nunca do input — é exatamente por isso que pode ser honesto sem revelar conta. Conferido no ar com
`RESEND_*` vazio: 503 para conhecido e desconhecido, 4,9–11,5 ms × 4,5–6,1 ms (sobrepostos; nem chega a
ler o body).

**A rota autenticada de reenvio não foi tocada** — `EMAIL_SEND_FAILED` 503 segue chegando à tela.

**Medição, 10 pares alternando a ordem, com 3 s de isolamento** (sem isso, o trabalho diferido da
requisição anterior ainda ocupa o event loop e contamina a seguinte — foi o que vi numa primeira leva, e é
artefato de medição, não sinal):

| | antes | depois |
|---|---|---|
| conhecido | 1127–1265 ms | min 7,7 · **mediana 13,3** · max 231,3 ms |
| desconhecido | 288–295 ms | min 7,5 · **mediana 31,4** · max 203,6 ms |
| faixas | **disjuntas** (4×) | **sobrepostas** |
| sinal | sempre o mesmo sentido | **inverte de rodada para rodada** |

O resíduo agora é ruído do dev server (recompilação, GC, trabalho diferido vizinho) e aponta para o
**lado errado**: a mediana do *desconhecido* ficou 18 ms **acima** da do conhecido. Um oráculo não muda de
sinal. Considero fechado — e medido, não declarado.

Também conferido: o trabalho diferido **continua acontecendo** (21 eventos de envio/recusa no log das 42
requisições), **nenhum endereço aparece no log** (`grep` por endereço → 0) e uma falha no caminho
assíncrono não derruba nada (`try/catch` no callback, com teste dedicado).

Testes: `authPasswordReset.test.ts` 16 → **24 casos**. `next/server` é mockado para **capturar** o
callback em vez de executá-lo, o que permite o teste que importa — *"resolves nothing about the account
before answering"*, que falha se alguém trouxer o lookup de volta para antes da resposta. Mais
*"defers the same amount of work for an address with no account"* e
*"keeps the answer and swallows a failure raised after it"* (que também reassegura a ausência de endereço
no log).

---

### 7.0b Idioma atrasado no escopo não-autenticado (achado 1b)

`getTranslations(resolveLocale(locale))` a partir do **segmento `[locale]`**, no lugar do
`getDictionary()` que lê cookie. Aplicado em **6 Server Components**: o layout (a cópia visível) e os 5
`generateMetadata` do mesmo escopo (o `<title>`, que sofria do mesmo atraso).

`getTranslations` já existia no pacote e é o helper explícito de locale — **não mexi no mecanismo de
dicionário**, só troquei a fonte da verdade em quem já tinha o segmento à mão. `resolveLocale` protege
contra um segmento inválido.

⚠️ **Pré-existente e fora do diff da feature.** Em **commit próprio (#14)**, escopo `app`, derrubável.
Incluí os 3 `page.tsx` novos da feature no mesmo commit de propósito: é um defeito de padrão único, e
corrigir 3 arquivos e deixar 3 com o bug produziria um estado incoerente. Derrubar o commit devolve os 6
ao comportamento de hoje.

---

### 7.1 D-C e o defeito que ele revelou

**D-C — decidi reusar `EMAIL_SEND_FAILED`, não inventar código novo.**
`apps/api/app/(routes)/auth/email-verification/send/route.ts:48-53` passou de
`AUTH_EMAIL_VERIFICATION_FAILED` + `400` para **`EMAIL_SEND_FAILED` + `503`**.

Por que reusar em vez de criar `AUTH_EMAIL_VERIFICATION_SEND_FAILED`:

1. **A copy existente já é exatamente a certa** — *"Não foi possível enviar o e-mail agora. Tente de novo
   em instantes."* Verbo correto (**enviar**, não confirmar) e instrução que **não** manda repetir a ação
   que acabou de falhar: "tente em instantes" implica esperar, que é o que o estrangulamento exige.
2. **Do ponto de vista de quem clicou, é o mesmo evento**: o e-mail não saiu. "Não consegui gerar o link"
   e "não consegui entregar ao provedor" não são distinções sobre as quais o usuário possa agir
   diferente — e a rota já responde `EMAIL_SEND_FAILED` no ramo vizinho (`:68-73`).
3. **Código novo é superfície pública nova** (contrato + 3 traduções + risco de deriva) para zero ganho de
   ação.
4. **Efeito colateral bom**: `AUTH_EMAIL_VERIFICATION_FAILED` passa a ser usado **só** em
   `email-verification/confirm/route.ts`, que é sobre confirmar um `oobCode` — a copy dele finalmente
   casa com o único lugar que o emite. O código nunca esteve errado; estava sendo usado no lugar errado.
   **Corrigir o call site era melhor que somar um código.**

**Status 400 → 503**: a requisição era perfeitamente válida; quem recusou foi o provedor. É condição de
upstream, não erro do cliente — e alinha com o `EMAIL_SEND_FAILED` do ramo vizinho, que já era 503.

**i18n: nenhuma chave nova.** `EMAIL_SEND_FAILED` já existia nos 3 idiomas em `apiErrors`
(`utils.ts:47`, `:98`, `:153`), com copy adequada em pt-br/en/es. Paridade verde.

**`toolkit-error-codes.ts`: nenhuma mudança, e por um motivo verificado.** Conferi que `auth/internal-error`
**nunca** alcança `mapOobActionMessageToCode`: aquele mapa só é chamado pelas duas rotas de *confirmar*
(`password/reset/route.ts:32`, `email-verification/confirm/route.ts:27`), sempre sobre um
`IdentityToolkitError` vindo da API REST do toolkit. `auth/internal-error` é código do **Admin SDK**,
lançado pelos geradores de link e tratado exclusivamente em `auth-action-links.ts:50,64`. Os dois
contextos já estão separados **por módulo**, então não havia ambiguidade a desfazer — desambiguar ali
seria inventar um acoplamento que não existe.

**Anti-enumeração intacta.** Não toquei `password/reset-request/route.ts`: ele continua respondendo
`{ requested: true }` haja ou não conta, e só distingue configuração do fork (`EMAIL_NOT_CONFIGURED`,
antes de qualquer consulta). O detalhe do envio ficou **restrito à rota autenticada**, onde o chamador é o
dono da conta e não há existência a revelar. Reconferido no diff: nenhuma alteração na rota pública.

---

**Achado 3b — texto branco sobre branco em todo toast (light mode).**
`packages/design-system/hooks/useAlert.ts`: `useTheme().theme` → **`resolvedTheme`**, normalizado para
`"dark" | "light"` antes de ir ao `react-toastify`.

Provado antes e depois, medindo o computed style:

| | classe do tema | `color` | `background` | legível? |
|---|---|---|---|---|
| **antes** (light) | `theme--system` | `rgb(255,255,255)` | `lab(100 0 0)` | ❌ **1:1** |
| **depois** (light) | `theme--light` | `rgb(117,117,117)` | `rgb(255,255,255)` | ✅ ~4,6:1 (AA) |
| antes/depois (dark) | `theme--system`/`--dark` | branco | quase preto | ✅ (só o dark funcionava) |

Sem regressão nas outras variantes: o toast de **sucesso** do login também passou a `theme--light` com
`color: rgb(117,117,117)` e texto legível — a correção melhora as 4 variantes de uma vez.

⚠️ **Está fora do diff da feature** (bug pré-existente, em primitivo compartilhado dos 3 apps). Deixei em
**commit próprio** (**#13** do plano, posicionado depois de todo o código da feature) para você poder
derrubar só ele se preferir tratar em tarefa separada, sem rebase. Recomendo **manter**: sem isso, os 6
`error.code` novos desta feature não chegam ao usuário no tema padrão.

### 7.2 Demais correções

| arquivo | mudança |
|---|---|
| `docs/features/auth-recovery-verification/develop/handoff.md:225-229` | **Senhas de QA removidas.** Antes: `` `qa-common-ci@` (→ `SenhaNova2026`), `qa-probe-common@` (→ `SenhaProbe1`), `qa-api-hardening@` (→ `SenhaHard1`) ``. Depois: as contas seguem nomeadas (o QA precisa saber o que reprovisionar), as senhas não, com nota de pedir por canal privado |
| `apps/api/(shared)/lib/auth-action-links.ts:19` | `(error as {code?: unknown}).code` → `(error as {code?: unknown} \| null)?.code` |
| `apps/api/(shared)/lib/auth-action-links.ts:79-83` | `const base = env.NEXT_PUBLIC_APP_URL as string;` → `const base = env.NEXT_PUBLIC_APP_URL; if (!base) return null;` |
| `apps/app/.../(unauthenticated)/components/AuthCard.tsx:9` | Docblock falso removido |
| `apps/app/.../sign-up/components/SignUpFormClient.tsx:94-99` | "Fire and forget" → descrição da garantia real (roda depois do redirect já ordenado; engole a própria falha) |

**Nit não aplicado** (achado 11): condicionar a isenção à presença do código, em `apps/app/proxy.ts` —
`isOobActionPath(appPath) && request.nextUrl.searchParams.has("oobCode")`. Deixei fora porque muda
comportamento testado (`proxy.test.ts` afirma o atual) e o ganho é cosmético.

---

## 8. Decisões em aberto

**D-A — ✅ RESOLVIDA (aplicada e remedida).** Ver §7.0. Sai das decisões em aberto.

> Agora que a resposta não espera mais o envio, a frase "anti-enumeração byte a byte" do `STATE.md` e do
> handoff finalmente descreve o sistema inteiro, e não só o corpo da resposta.

**D-B — Causa-raiz `skipValidation` × `extends`** (achado 2) · *recomendo: manter a correção local, abrir
item de backlog*
`env.STRIPE_WEBHOOK_SECRET` está `undefined` em dev pelo mesmo mecanismo, o que deixa
`pnpm --filter api dev:with-stripe` sem processar evento. A correção de raiz (parar de usar
`skipValidation`, ou remontar os `extends` à mão) mexe na plumbing de env de **todos** os apps e junta-se
ao gêmeo já aberto em `apps/web/env.ts:22`. Fora do escopo desta feature — mas não deve morrer aqui.

**D-C — ✅ RESOLVIDA (aplicada).** Ver §7.1 para o desenho, a justificativa do reuso de
`EMAIL_SEND_FAILED` e a evidência na tela. Sai das decisões em aberto.

> Resíduo consciente de D-C: `buildAuthActionLink` continua achatando *toda* recusa em `null`, então o
> reenvio não sabe distinguir "provedor estrangulou" de "provedor recusou por outro motivo" e responde
> `EMAIL_SEND_FAILED` para os dois. Avaliei propagar o motivo para responder `USERS_AUTH_RATE_LIMITED` no
> caso do estrangulamento e **decidi não fazer**: mudaria a assinatura do helper crítico de
> anti-enumeração e reescreveria seus 11 testes, para entregar ao usuário uma distinção sobre a qual ele
> age igual (esperar). A copy atual já diz "tente de novo em instantes". Se algum dia o reenvio precisar
> de `Retry-After`, é aí que vale plumbar o motivo.

**D-D — Corrida entre o envio de verificação e a navegação pós-cadastro** (achado 4) ·
*recomendo: aceitar; reavaliar se `POST /auth/sign-up` algum dia passar a ser o caminho do app*
O gatilho é do cliente porque o sign-up da `apps/app` chama o Firebase direto (achado do `/analyze`:
`POST /auth/sign-up` tem zero chamador). O envio server-side dentro do sign-up seria imune, mas depende de
mudar por onde o cadastro passa — outra tarefa. A degradação é graciosa: o banner com "reenviar" cobre o
caso.

**D-E — 1,2 MB de screenshots versionados** (achado 12) · *recomendo: guardar as que provam algo,
apagar as redundantes*
`docs/features/<slug>/` é versionado por regra, então **não apaguei nada**. Mas 1,2 MB por feature entra na
bagagem de todo fork. As que carregam prova: o **par V2** (SHA1 idêntico — é evidência de segurança), uma
por tema/viewport e as 6 de e-mail. As demais (~15) documentam estado que o teste já cobre. Decisão sua.

**D-F — Enquadramento de `specs/auth-recovery-verification.md`** · *decidi: vai no commit do sync*
O arquivo mistura, nos mesmos hunks, trabalho do `/spec --sync` (correção de referências
`utils.ts:30-35`, reescrita do parágrafo de dependência, prosa do `RATE_LIMITED_PATHS`, `updated:`) e do
`/analyze` (`status: in-progress`, `feature:`). Coloquei o arquivo **inteiro** no `docs(specs):`. Por quê:
(1) a maioria dos hunks é do sync e descreve o estado do repo **antes** da feature — atribuí-los à feature
seria pior; (2) `status`/`feature` é escrituração de backlog, exatamente o que o commit de sync carrega, e
o `/spec --sync` final vai reescrever esse frontmatter de novo ao mover a spec para
`docs/features/<slug>/spec.md`; (3) separar exigiria `git add -p`, que é interativo e indisponível aqui.

---

## 9. Validação visual

**Feita** com `agent-browser` (comandos **estritamente em sequência**), `apps/app` :3000 + `apps/api` :3002,
contra o projeto Firebase real, em **três rodadas**: a revisão inicial, a reconferência de D-C e a de
D-A + idioma. Screenshots em `/tmp/review-shots/` (21) — **não versionadas**: são reconferência
independente do V1–V13, e as do `develop/` já cobrem o registro.

| fluxo | evidência |
|---|---|
| Sign-in → "Esqueci minha senha" | link no rodapé, acima de "Cadastrar"; leva a `/forgot-password` |
| Pedido com e-mail **desconhecido** | painel "Pedido recebido", copy condicional ("Se existir uma conta…") |
| Pedido com e-mail **conhecido** | **screenshot de SHA1 idêntico** ao anterior (`6b1ef84f…`) |
| `/reset-password` sem código | "Link inválido", sem formulário, com saída para `/forgot-password` |
| `/reset-password?oobCode=` inválido | toast lido do DOM: **"Este link não é válido. Peça um novo."** (`AUTH_OOB_CODE_INVALID` traduzido); formulário preservado para nova tentativa |
| `/verify-email` sem código | "Link inválido" |
| `/verify-email?oobCode=` inválido | **"Não foi possível confirmar — O link pode ter expirado ou já ter sido usado."** (cobre link expirado/usado) |
| **Cadastro real pela UI** | conta nova → painel → banner "Confirme seu e-mail" presente; `POST /auth/email-verification/send` disparou **sem bloquear** a navegação |
| Reenviar do banner | disparou; **expôs o achado 3** (toast com copy de "confirmar") |
| Proxy × `oobCode` (logado) | 4 combinações + 3 anônimas em sessão isolada — ver §3 ✅ |
| **light + dark + mobile** | `/forgot-password` nos 3; banner do painel nos 3 (390×844 sem overflow, tema respeitado nos dois sentidos) |
| **pt-br + en + es** | as 3 telas nos 3 idiomas, sem chave faltando nem vazamento de fallback |

### Rodada 2 — reconferência de D-C (achados 3 e 3b)

A condição do defeito foi **reproduzida de propósito**, não esperada: estrangulei o gerador de links do
Firebase com 7 chamadas a `reset-request`, depois pressionei "Reenviar" até o log confirmar a recusa.

| passo | evidência |
|---|---|
| Condição reproduzida | `[auth-action-link] refused kind=verify-email code=auth/internal-error` no log — **exatamente** a linha que antes produzia `POST … 400` |
| Resposta da rota | `POST /auth/email-verification/send` **503** (era **400**) |
| **Toast, antes** | *"Não foi possível **confirmar** o e-mail. **Peça um novo link**."* — beco sem saída |
| **Toast, depois** | *"Não foi possível **enviar** o e-mail agora. **Tente de novo em instantes**."* — lido do DOM e **visível no screenshot** (`dc4-toast-dark.png`, `dc5-toast-light-fixed.png`) |
| Contraste (achado 3b) | light **antes** `color rgb(255,255,255)` sobre `bg lab(100 0 0)`; **depois** `rgb(117,117,117)` sobre branco. Dark legível nos dois casos |
| Sem regressão | toast de **sucesso** do login em light: `theme--light`, `rgb(117,117,117)`, *"Login realizado com sucesso!"* legível |
| Anti-enumeração | rota pública **não** foi tocada — reconferido no diff e no código: segue `{ requested: true }` para conta existente e inexistente |

### Rodada 3 — D-A e o idioma

**D-A** está medido em §7.0 (10 pares alternados, com isolamento; faixas sobrepostas e sinal invertendo).

**Idioma**: o defeito só aparece **navegando entre idiomas** — um carregamento único sempre acertou,
que é por que passou despercebido. Percorri sempre chegando de um idioma diferente:

| chegada | painel de depoimento | `document.title` |
|---|---|---|
| `/pt-br/sign-in` (de novo) | "Essa biblioteca…" ✅ | Entrar |
| `/en/sign-in` **vindo de pt-br** | "This library…" ✅ | Sign In |
| `/es/sign-up` **vindo de en** | "Esta biblioteca…" ✅ | Registrarse |
| `/en/forgot-password` **vindo de es** (dark) | "This library…" ✅ | Forgot your password |
| `/es/forgot-password` | "Esta biblioteca…" ✅ | Olvidé mi contraseña |
| `/pt-br/reset-password` · `/en/reset-password` | "Essa…" / "This…" ✅ | Escolher senha nova / Choose a new password |
| `/es/verify-email` · `/pt-br/verify-email` | "Esta…" / "Essa…" ✅ | Confirmar correo / Confirmar e-mail |
| `/es/sign-in` · `/pt-br/sign-up` | "Esta…" / "Essa…" ✅ | Iniciar sesión / Cadastrar |

As 5 telas do escopo × 3 idiomas, **light e dark**, painel e `<title>` sempre casando com o segmento.
Screenshots: `loc1-es-signup-light.png`, `loc2-en-forgot-dark.png`.

Foi a captura em **dark mode** que fechou o diagnóstico do 3b: lá o texto aparecia, em light não — o que
provou que o problema era contraste, e não o toast falhar em renderizar.

**Não coberto** (mesmas fronteiras do handoff): ciclo completo de reset com `oobCode` **real** e a
revogação de sessão consequente (V5/V6) — exige gerar código pelo Admin SDK e trocar a senha de uma conta
real; fico com a prova do `desenvolvedor` mais os 16 testes de rota. Entrega real pelo Resend (sem
credencial: usei placeholder, e **`apps/api/.env` foi restaurado byte-idêntico**, SHA conferido). 429 real
(`ARCJET_KEY` vazia — a API avisa no boot).

**Dado novo de QA**: criei **uma** conta descartável pela UI (`review-qa-<epoch>@example.com`,
`emailVerified: false`) no projeto de dev. Não toquei nas contas de QA existentes — a deriva registrada no
handoff §8.6 continua sendo a de antes.

---

## 10. Aderência à spec

O corte de MVP de `specs/auth-recovery-verification.md:59-65` está **entregue nos 5 itens**. Uma
divergência a registrar:

> O item 5 lista **"e-mail desconhecido"** entre os erros que devem chegar ao front como `error.code`
> traduzido. A implementação **não faz isso** — responde sucesso. E está certa: a própria spec, 20 linhas
> abaixo (`:90`, "Enumeração de conta"), exige o contrário. **A spec se contradiz**; a implementação seguiu
> o ramo seguro (D-2). Nada a corrigir no código; quem fechar a spec no `/spec --sync` deve ajustar a
> redação do item 5.

---

## 11. Plano de commits

Proposto — **nada commitado por mim**. Ver §12 do retorno ao orquestrador para os arquivos exatos.

> ⚠️ Com a i18n por último (regra do repo), os commits de `apps/app` referenciam chaves de dicionário que
> só existem no commit **11**. Intermediários **não** passam typecheck isolado; a PR inteira passa. É
> consequência da ordem canônica, não defeito do plano — só não use `git bisect --run typecheck` aqui.

**16 commits** (era 15). O que mudou nesta rodada:

- **#4 absorveu D-A** — a rota `reset-request` é *introduzida* nesse commit, então entra já com o
  `after()`. Commit separado seria "corrigir" código que ainda não existe na história. Os 8 testes novos
  vão junto.
- **#14 é novo** — `fix(app)` do idioma atrasado. **Assunto separado**, pré-existente, e **derrubável**:
  posicionado depois de todo o código da feature. Inclui os 3 `page.tsx` novos dela de propósito (§7.0b).
- **#13 e #15–16 mantêm** o que já estava: fix do design system, docs da feature, sync do backlog.
- **#11 continua intocado** — nenhuma das correções desta rodada precisou de chave de i18n nova.

**Os três commits derrubáveis** (`#13`, `#14`, `#16`) estão todos **depois** do código da feature, então
qualquer um pode ser descartado sem rebase dos demais.

| # | mensagem | escopo |
|---|---|---|
| 1 | `feat(shared): add the service unavailable http status` | `packages/shared` |
| 2 | `feat(sdk): expose the password recovery and email verification actions` | `packages/sdk` |
| 3 | `feat(api): build branded account action links from the identity toolkit` | `apps/api` — helper, toolkit, schema, env, testes |
| 4 | `feat(api): add the password reset request and confirm routes` | `apps/api` — **inclui D-A (`after()`)** |
| 5 | `feat(api): add the email verification send and confirm routes` | `apps/api` — **inclui D-C** |
| 6 | `feat(api): rate limit the account recovery endpoints` | `apps/api` — proxy + teste + `.env.example` |
| 7 | `feat(auth): reload the current user from the account record` | `packages/auth` |
| 8 | `feat(app): keep the action code when a signed-in visitor opens a recovery link` | `apps/app` — proxy + teste |
| 9 | `feat(app): add the forgot and reset password screens` | `apps/app` |
| 10 | `feat(app): warn the account holder about an unconfirmed email` | `apps/app` |
| 11 | `feat(internationalization): translate the recovery and verification copy` | `packages/internationalization` |
| 12 | `test(email): cover the reset and verification action copy` | `packages/email` |
| 13 | `fix(design-system): make the toast text legible in light mode` | `packages/design-system` — **separado, droppable** |
| 14 | `fix(app): resolve the unauthenticated locale from the route segment` | `apps/app` — **separado, droppable** |
| 15 | `docs(features): auth-recovery-verification` | artefatos do fluxo |
| 16 | `docs(specs): reconcile the backlog with the delivered code` | **sync — separado, droppable** |

**Arquivos dos commits novos/alterados nesta rodada:**

- **#4** — `apps/api/app/(routes)/auth/password/reset-request/route.ts`,
  `apps/api/app/(routes)/auth/password/reset/route.ts`, `apps/api/__tests__/authPasswordReset.test.ts`
  *(mesma lista de antes; o conteúdo é que mudou)*
- **#14** — `apps/app/app/[locale]/(unauthenticated)/layout.tsx`,
  `.../sign-in/page.tsx`, `.../sign-up/page.tsx`, `.../forgot-password/page.tsx`,
  `.../reset-password/page.tsx`, `.../verify-email/page.tsx`

  ⚠️ Os 3 últimos também aparecem em **#9** e **#10** (são arquivos novos da feature). Na prática:
  #9/#10 os criam com `getDictionary()`, #14 os converte para o segmento. Se preferir evitar o
  arquivo-tocado-duas-vezes, a alternativa é dobrar a conversão dentro de #9/#10 e deixar #14 só com
  `layout.tsx` + `sign-in` + `sign-up` — mas aí a correção deixa de ser derrubável por inteiro.
  **Recomendo como está.**

**PR sugerida**: `feat: recover a password and verify an email address`
**Push**: só com o "sim" do usuário, depois do último commit aprovado — `git push -u origin feat/auth-recovery-verification`.

---

## 12. Commits realizados

_(a preencher pelo orquestrador do `/review` depois de commitar)_
