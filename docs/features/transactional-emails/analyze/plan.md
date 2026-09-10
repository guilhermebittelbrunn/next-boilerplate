# Análise + Blueprint — E-mails transacionais traduzidos

> Origem: `specs/transactional-emails.md` (`status: approved`, `value: alto`, `effort: M`,
> `audience: produto`, `depends_on: []`, `mode: ambos`).
> **O problema, a evidência de mercado e o corte de MVP são decisão de produto tomada.** Este documento
> responde só ao *como*. Divergências de escopo estão em "Perguntas em aberto", não aplicadas.
> Roteiro: [`docs/feature-analysis-guide.md`](../../../feature-analysis-guide.md).

---

# Etapa 1 — Análise

## 1. Contexto

**Uma frase:** dar ao boilerplate uma forma única, tipada e traduzida de mandar e-mail do servidor —
camada de envio + layout comum + ramo de i18n + dois templates de prova + o preview funcionando nos 3
idiomas — sem que a falta de `RESEND_TOKEN` derrube nada.

### 1.1 O que a auditoria da spec afirmava — reconferido hoje, arquivo por arquivo

| Afirmação da spec | Verificação | Resultado |
|---|---|---|
| `packages/email/index.ts` tem 4 linhas e exporta só `resend` | `index.ts:1-4` | ✅ confirmado |
| `templates/` tem um arquivo, copy inglesa literal | `templates/contact.tsx:27,33,36`; assunto literal em `apps/web/.../actions/contact.tsx:32` | ✅ confirmado (o assunto está na **action**, não no template) |
| `keys.ts:7-8` ambos `.optional()`, `:14` desliga validação | `packages/email/keys.ts:7-8,14` | ✅ confirmado |
| `translations/` tem 3 ramos e nenhum de e-mail | `translations/global.ts:5-20`; 39 arquivos, nenhum `email` | ✅ confirmado |
| `apps/email` roda o preview na 3003 apontando para `packages/email/templates` | `apps/email/package.json:7` (`email dev --port 3003 --dir ../../packages/email/templates`) | ✅ confirmado |
| Único consumidor: a action de contato da `apps/web` | `apps/web/app/[locale]/contact/actions/contact.tsx:3-4,35` | ✅ confirmado **e agravado** — ver §1.2 |

### 1.2 Quatro achados que mudam o desenho (nenhum estava na spec)

**🔴 A1 — `new Resend(undefined)` LANÇA. O pacote de e-mail é uma bomba-relógio hoje.**
`packages/email/index.ts:4` faz `export const resend = new Resend(keys().RESEND_TOKEN)` **no topo do
módulo**. O construtor instalado (`resend@6.2.2`, `dist/index.js:501-511`) faz:

```js
if (!key) {
  if (typeof process !== "undefined" && process.env) { this.key = process.env.RESEND_API_KEY; }
  if (!this.key) { throw new Error('Missing API key. Pass it to the constructor `new Resend("re_123")`'); }
}
```

Ou seja: num fork sem `RESEND_TOKEN` (o estado que os três `.env.example` distribuem —
`apps/api/.env.example:20`, `apps/app/.env.example:10`, `apps/web/.env.example:3`, todos `""`), **basta
importar `@repo/email` para o módulo explodir**. Não é "o e-mail não sai": é 500 no handler que importou.
O sinal de pronto da spec (`:83` — "sem `RESEND_TOKEN`, o app continua funcionando […] não como erro 500
na cara do usuário") **hoje é falso**, e só não dói porque nada chama a action. **O cliente precisa virar
lazy** (§D3).

**🔴 A2 — a action de contato é código morto e nunca poderia ter enviado.** Três provas independentes:
1. `rg "actions/contact"` em `apps/`+`packages/` → **zero** chamadas. O botão do formulário
   (`contact-form-client.tsx:139-145`) não tem `onClick`, não há `<form>`, não há `action` nem
   `useActionState`.
2. Os campos da UI (`date`, `firstname`, `lastname`, `resume` — `:72,112,121,130`) **não batem** com a
   assinatura da action (`name`, `email`, `message` — `actions/contact.tsx:17-20`). Não existe campo de
   e-mail nem de mensagem na tela.
3. `actions/contact.tsx:25` lê `env.RESEND_FROM` de `@/env`, mas `apps/web/env.ts:22` usa
   `skipValidation: true` — e nesse modo o `@t3-oss/env-core` **devolve o `runtimeEnv` e descarta os
   `extends`** (causa raiz já confirmada no código instalado durante o `api-hardening`, ver
   `docs/features/api-hardening/STATE.md`). `apps/web/env.ts:17-21` só declara os dois `NEXT_PUBLIC_*`.
   Logo `env.RESEND_FROM` é **sempre `undefined` em runtime** e a linha `:25` **sempre lança**, mesmo com
   o `.env` perfeitamente preenchido.

Consequência para o corte: "migrar o formulário de contato" **não é migrar um envio que funciona** — é
consertar um envio que nunca funcionou. Isso muda o que "migrar" significa (§D4) e é a razão de a leitura
das chaves passar a ser feita **dentro** do `@repo/email`, nunca pelo `env` da app.

**🟡 A3 — os tokens do design system são inutilizáveis em e-mail.**
`packages/design-system/styles/globals.css:16-17,55-56,112-113` define tudo como CSS custom properties em
`oklch()` (`--primary: oklch(0.205 0 0)`, `--color-primary: var(--primary)`). Cliente de e-mail não
resolve `var()` nem entende `oklch()` (Outlook/Gmail). **A marca do e-mail tem de ser um arquivo próprio
de constantes em hex** dentro do `@repo/email` — não é preguiça, é a única coisa que renderiza (§D6).

**🟢 A4 — o teste de paridade cobre um ramo novo sem tocar em uma linha.**
`__tests__/parity.test.ts:15-22` (`keyPaths`) desce recursivamente por qualquer objeto e
`:49-53` roda sobre `globalTranslations` inteiro. Não há lista fixa de ramos. Portanto, pendurar
`packages.email` em `translations/packages/index.ts` já entra na varredura — **item 3 do corte satisfeito
com zero gambiarra e zero alteração no teste**. (Limite conhecido, relevante para §7: o teste compara
*caminhos de chave*, não valores — string vazia passa.)

### 1.3 Objetivos e escopo

**No corte (os 6 itens da spec, `:43-48`):**

| # | Item do corte | Onde é resolvido |
|---|---|---|
| 1 | Envio único e tipado, recebe idioma, resolve assunto e corpo pelo dicionário | `packages/email/send.ts` + `template.ts` + `copy.ts` (§B1–B3) |
| 2 | Layout comum herdado por todo template; fork troca marca em um lugar | `packages/email/components/layout.tsx` + `brand.ts` (§B4) |
| 3 | Ramo de e-mail no i18n, paridade cobrada pelo teste que já existe | `translations/packages/email/index.ts` (§B6, achado A4) |
| 4 | Dois templates reais — boas-vindas e um de ação com link | `templates/welcome.tsx` + `templates/action-link.tsx` (§D5) |
| 5 | Todos os templates visíveis no preview da 3003, nos 3 idiomas | `templates/previews/*` + subpath no `exports` do i18n (§D7) |
| 6 | Falha de envio não derruba a operação, e fica registrada | `SendResult` como união discriminada + log `[email]` (§D3) |

**Fora do corte** (herdado da spec `:50-56`, mais o que esta análise acrescenta):
- Templates de recuperação de senha e verificação de e-mail → `auth-recovery-verification`.
- Templates de cobrança → `billing-subscription`.
- Preferência de notificação por usuário, digest, fila, retry, provedor plugável, rastreio.
- **Ligar o formulário de contato da landing** (achado A2, ponto 1 e 2): trocar os 4 campos-maquete por
  `name/email/message`, `useActionState`, estados de loading/sucesso/erro e as chaves de UI
  correspondentes é **feature de produto na landing**, não base de e-mail. A spec pede apenas que "o envio
  do formulário de contato migra para o layout e a copy traduzida" (`:65`). → **Q4**.
- **Corrigir o `skipValidation: true` da `apps/web`** (achado A2, ponto 3): mexer nisso muda header, CTA e
  pricing da landing inteira. Contornado aqui lendo as chaves de dentro do pacote. Registrado para o
  `/spec --sync`.
- **Rota nova na API**: a spec é explícita (`:63` — "nenhuma rota nova no corte").

### 1.4 Apps impactados

| Camada | Impacto | Evidência |
|---|---|---|
| `packages/sdk` | **nenhum** | e-mail é server-side; não passa pela fachada (spec `:62`) |
| `apps/api` | **nenhum arquivo alterado**; ganha a *capacidade* de notificar | spec `:63` |
| `apps/app` | **nenhum** | spec `:64` |
| `apps/web` | `contact/actions/contact.tsx` reescrita (envio + locale + chaves do pacote) | §B7 |
| `apps/email` | **nenhum arquivo alterado** — o `--dir` já aponta certo (`package.json:7`) | §D7 |
| `packages/email` | camada de envio, layout, marca, 3 templates, suíte de teste nova | §B |
| `packages/internationalization` | ramo `packages.email` nos 3 idiomas + `resolveLocale` + 1 subpath no `exports` | §B6, §D1, §D2 |
| Infra/env | **nenhuma var nova**; `RESEND_*` deixam de ser decorativas | §12 |

- **Área do painel:** N/A (nada em `(common)`/`(admin)`).
- **Modo de produto (`subscription` × `simple`):** N/A — o envio não conhece plano.
- **Assinatura/plano ativo:** N/A.
- **Genérico × específico:** genérico. `packages/email` é pacote de **integração**, e o `CLAUDE.md` raiz
  autoriza domínio neles ("exceto pacotes de integração: `auth`, `email`, `payments`"). A copy vai para o
  i18n como **exemplo neutro**, seguindo `packages/CLAUDE.md:39`.

### 1.5 Fontes e referências

Entrada é a spec (lida na íntegra) + o código. Nenhum link externo, Figma, print ou card. Nota de
mercado citada pela spec: `specs/research/saas-starter-feature-benchmark.md`.
**Referências não lidas: nenhuma.**

## 2. Dados (Firestore)

**N/A por inteiro.** Nenhuma coleção, nenhum campo, nenhuma consulta, nenhum índice, nenhum backfill,
nenhuma mudança em regras de segurança. O idioma do destinatário **não é persistido** neste corte (é de
`account-settings`, spec `:53`) — ele viaja como parâmetro (§D2).

## 3. Contrato — `@repo/sdk`

**N/A.** Nenhum DTO, nenhuma action, nenhum registro no `Client`. Nada quebra em `apps/app`/`apps/web`
pelo lado do SDK.

## 4. API (`apps/api`)

**Nenhuma rota nova, nenhum guard novo, nenhum schema Zod novo, nenhum repositório/mapper novo.**

**Nenhum `error.code` novo → nenhuma entrada em `apiErrors`.** Isto é decisão, não esquecimento: a única
resposta HTTP que existiria seria a de uma rota que dispara e-mail, e não há rota no corte. Falha de envio
**não vira `error.code`** porque, por definição do item 6 do corte, ela não é erro da operação — é evento
de log. `translations/packages/shared/utils.ts` fica intocado.

Ponto que a API herda de graça: quando um fork for disparar e-mail de dentro de um handler, a assinatura
já obriga a passar o `locale` explicitamente (§B1), então não há caminho em que o e-mail saia "no idioma
do servidor" por acidente.

## 5. Front-end

### 5.1 `apps/web`
Único arquivo tocado: `app/[locale]/contact/actions/contact.tsx` (server action, sem UI).
`page.tsx`, `components/contact-form.tsx` e `components/contact-form-client.tsx` **não mudam** — decisão
Q4. Não há rota nova, `queryKeys`, hook, formulário RHF, tabela, `loading.tsx` ou entrada de `paths.ts`.
Sem `"use client"` novo.

### 5.2 `apps/email` (preview, porta 3003)
Não é UI de produto, mas **é a superfície de revisão do item 5 do corte**. O `--dir` já aponta para
`packages/email/templates` (`apps/email/package.json:7`); a estrutura de arquivos é que precisa ser
desenhada para o scanner do React Email (§D7).

### 5.3 i18n
Ramo novo `packages.email` nos 3 idiomas (§B6). Variáveis de dicionário com nome descritivo
(`emailTranslations`, `emailCopy`) — nunca `t`/`d` (regra de ouro 9).
**Primeira interpolação do repositório**: `rg` por função/template-literal em
`packages/internationalization/translations/` retorna **zero** — hoje todo valor é string literal. Isso
força uma decisão (§D8).

## 6. Autorização e segurança

- **Guards:** N/A (nenhum endpoint novo).
- **Impersonação:** N/A no corte. Registrado para quem for disparar e-mail de dentro da API: um admin
  personificando **não** pode causar e-mail para o usuário personificado sem intenção explícita — o
  `sendEmail` exige `to` explícito, então não há caminho implícito. Nada a fazer agora.
- **PII no log — restrição dura.** O formato herdado é o do `api-hardening`
  (`apps/api/proxy.ts:41-49`), cujo docstring é literal: *"Single line, stable prefix, no address, header
  or body: blocking is not a reason to start retaining personal data."* Log de e-mail é **muito** mais
  sensível que log de rate limit: o destinatário é PII direta. **Nada de `to`, `replyTo`, assunto ou corpo
  no log.** Só `template=`, `reason=` e, quando houver, `locale=`.
- **Segredo:** `RESEND_TOKEN` nunca aparece em log, em retorno de função ou em mensagem de erro. O
  `SendResult` devolve `reason` categórico, não a mensagem do provedor.
- Firestore rules / Arcjet: sem mudança.

## 7. Testes

Ver §14 para o detalhe por arquivo. Resumo do que cada item do corte compra em Vitest:

| Item do corte | Cobertura determinística | O que só o olho/preview pega |
|---|---|---|
| 1 envio tipado + idioma | suíte nova `packages/email/__tests__/sendEmail.test.ts` | — |
| 2 layout comum | asserção de que os 3 templates renderizados contêm `emailBrand.name` e o rodapé | fidelidade visual |
| 3 árvore i18n | **já coberto** por `parity.test.ts:49-53` (achado A4) + 1 teste novo de **valor não-vazio** (a paridade compara caminhos, não valores) | tradução idiomática |
| 4 dois templates | render + asserção de assunto localizado e do `href`/URL de fallback | — |
| 5 preview 3 idiomas | — | **`agent-browser` na 3003**, obrigatório |
| 6 falha não derruba | `not-configured` e `provider-error` retornam união, nunca lançam; log com prefixo `[email]` e **sem** o destinatário | — |

**Infra nova:** `packages/email` não tem `test`, nem `vitest`, nem config. Ganha os três — mesmo movimento
que `packages/security` fez no `api-hardening` (21 → 22 tasks no turbo). Aqui: **22 → 23**.

## 8. Validação visual (obrigatória)

Regra de ouro 11. Comandos do `agent-browser` **em sequência** (concorrência trava o daemon).

| # | Fluxo | O que provar |
|---|---|---|
| V1 | `pnpm --filter email dev` → `localhost:3003` | os 3 templates aparecem na lista, com a pasta `previews/` |
| V2 | Abrir `welcome`, `action-link`, `contact` (pt-br) | layout comum idêntico nos 3: mesmo cabeçalho, rodapé e assinatura |
| V3 | Abrir cada `previews/*.en.tsx` e `*.es.tsx` | **6 telas**: texto e assunto em inglês/espanhol, sem sobra de pt-br |
| V4 | Editar `brand.ts` (nome + cor) e recarregar | os 3 templates mudam juntos — prova do sinal de pronto `:80` |
| V5 | `pnpm --filter web dev` → `/pt-br/contact`, `/en/contact`, `/es/contact` | a página **não regrediu** (a UI não é tocada; é controle negativo) |
| V6 | Com `RESEND_TOKEN` vazio, exercitar o caminho de envio | nenhum 500; `[email] skipped …` no terminal; a operação retorna sucesso |

Screenshots: um por template × idioma (9) + o antes/depois do V4 + a landing do V5.
**Light/dark/mobile:** N/A para o preview (cliente de e-mail não tem tema do design system, achado A3);
aplicável ao V5, que é a landing intocada.

## 9. Critérios de aceite

Ficam para o `/test` (formato §9.1 do guia). Semente obrigatória — os 5 "Sinais de pronto" da spec
(`:79-83`) e os 6 itens do corte, mais estes derivados desta análise:
- importar `@repo/email` com `RESEND_TOKEN=""` **não lança** (regressão direta do achado A1);
- `RESEND_TOKEN="abc"` (malformado, não vazio) **continua** reprovando — a correção de `keys.ts` não pode
  virar um cheque em branco;
- `sendEmail` com `locale` desconhecido (`"fr"`, `""`, `null`) cai no padrão sem lançar;
- log de envio pulado/falho **não contém** o endereço de destino;
- paridade quebra ao remover uma chave de e-mail de **um** idioma (sinal de pronto `:81`).

---

# Etapa 2 — Blueprint técnico

## D. Decisões de arquitetura (as 6 que o `/analyze` foi mandado resolver + 2 que apareceram)

### D1 — Onde mora a camada de envio, e a direção da dependência

**Decisão: a camada de envio mora em `packages/email`; `@repo/email` passa a depender de
`@repo/internationalization`. Não há ciclo.**

- `@repo/internationalization` não importa nenhum `@repo/*` (só `next` e `zod` —
  `package.json:22-25`). A seta só pode apontar num sentido.
- Precedente idêntico já no repo: `packages/auth/package.json:20` e
  `packages/design-system/package.json:38` declaram `"@repo/internationalization": "workspace:*"`.
- `packages/CLAUDE.md:7-8` ("evite ciclos") fica satisfeito sem inversão.

**Mudanças de `package.json`/`tsconfig` (mínimas e explícitas):**

| Arquivo | Mudança | Por quê |
|---|---|---|
| `packages/email/package.json` | `+ "@repo/internationalization": "workspace:*"` em `dependencies` | resolução pnpm (hoje só o alias TS resolveria) |
| `packages/email/package.json` | `+ "vitest": "^4.0.3"` em `devDependencies`, `+ "test": "NODE_ENV=test vitest run"` em `scripts` | suíte nova; espelha `packages/security` |
| `packages/email/tsconfig.json` | **sem mudança** — já estende `@repo/typescript-config/nextjs.json` com `paths` `@repo/*` → `../../packages/*` e `baseUrl: "."` | — |
| `packages/internationalization/package.json` | `+ "./translations/global": "./translations/global.ts"` no `exports` | **não é cosmético** — ver D7 |
| `packages/email/package.json` | **não** ganha `exports` map | hoje não tem (`package.json:1-24`); os subpaths (`/keys`, `/templates/contact`) funcionam pelo alias. Adicionar um mapa agora é risco de quebrar imports existentes por ganho zero. Registrado como dívida. |

### D2 — Como o idioma chega ao envio

**Decisão: `Locale` de `@repo/internationalization/utils`. Nenhum union novo.**

`utils.ts:3-5` já define `export const locales = ["pt-br","en","es"] as const` e
`export type Locale = (typeof locales)[number]`. Precedente de consumo fora do pacote:
`packages/shared/utils/helpers/formattedError.ts:1` importa exatamente esse tipo;
`packages/auth/redirect.ts:1` importa `locales`. **Inventar um union em `packages/email` seria criar uma
segunda fonte de verdade para a mesma lista.**

**Padrão:** `getDefaultLocale()` (`utils.ts:15-18` — `NEXT_PUBLIC_DEFAULT_LOCALE` ou `locales[0]`), com o
mesmo saneamento que o `client.ts:12-26` já faz. Problema: essa função `resolveLocale` é **privada** de um
módulo `"use client"` — `packages/email` (que roda em Node e dentro do preview) não pode importá-la.

**Sub-decisão: promover `resolveLocale` para `@repo/internationalization/utils`** (módulo neutro, sem
`"use client"`/`"use server"`, já importado por `packages/shared`, `packages/auth` e `apps/web/proxy.ts`)
e fazer `client.ts` passar a usá-la. É ~12 linhas movidas + 1 import trocado, e evita a alternativa ruim
(duplicar o saneamento dentro do `packages/email`). Alinha com "procure o helper que já existe".

```ts
// packages/internationalization/utils.ts  (novo export, mesma lógica de client.ts:12-26)
export const resolveLocale = (value: string | null | undefined): Locale => {
    if (value && locales.includes(value as Locale)) return value as Locale;
    const fallback = getDefaultLocale();
    if (typeof fallback === "string" && locales.includes(fallback as Locale)) return fallback as Locale;
    return locales[0];
};
```

**De onde o chamador tira o locale** (recomendação da spec `:87` — o locale da requisição que originou a
ação, pt-br como padrão) — confirmada contra o código:

| Chamador | Fonte | Evidência |
|---|---|---|
| server action / RSC da `apps/web` | `const { locale } = await getDictionary()` de `@repo/internationalization/server` | `server.ts:18-34` lê o cookie `x-locale`, que `apps/web/proxy.ts:92,96` grava **a partir do segmento `[locale]` da URL** — logo o cookie e a URL nunca divergem |
| `apps/app` | idem (`server.ts` / `client.ts`) | — |
| handler da `apps/api` | **não tem** locale hoje: nenhum header de idioma é lido, e `rg "@repo/internationalization" apps/api` → zero | por isso o `locale` é **parâmetro obrigatório-com-padrão** do `sendEmail`, e não algo inferido lá dentro |

### D3 — Comportamento sem `RESEND_TOKEN` (sinal de pronto `:83`)

Três correções, todas com precedente no repo:

**(a) Cliente lazy — corrige o achado A1 (o 500 real de hoje).**
Espelha `packages/security/index.ts:42-44`, cujo docstring diz literalmente *"Answers with a decision
instead of throwing"*.

```ts
// packages/email/index.ts  — substitui o `new Resend(...)` de topo de módulo
let cachedClient: Resend | null = null;

export const isEmailEnabled = (): boolean =>
    Boolean(keys().RESEND_TOKEN && keys().RESEND_FROM);

const getResendClient = (): Resend | null => {
    const token = keys().RESEND_TOKEN;
    if (!token) return null;
    cachedClient ??= new Resend(token);
    return cachedClient;
};
```

> ⚠️ Quebra de superfície pública: o export `resend` deixa de existir. **Único consumidor no repo** é
> `apps/web/.../actions/contact.tsx:3`, que esta mesma entrega reescreve. Aceito e registrado.

**(b) `keys.ts`: string vazia significa ausente — o precedente do `ARCJET_KEY`, literalmente.**
`packages/security/keys.ts:4-15` já resolveu exatamente este problema, com o porquê escrito:
*"the example env files ship it declared but empty, so an empty value has to mean 'absent'"*. Os três
`.env.example` distribuem `RESEND_FROM=""` e `RESEND_TOKEN=""`.

```ts
// packages/email/keys.ts
const optionalEmail = z.preprocess(emptyToUndefined, z.string().email().optional());
const optionalToken = z.preprocess(emptyToUndefined, z.string().startsWith("re_").optional());
// e REMOVE o `skipValidation: !(RESEND_FROM && RESEND_TOKEN)` da linha 14
```

Remover o `skipValidation` **aperta** a validação em vez de afrouxar: hoje, se `RESEND_FROM` está vazia, a
validação inteira desliga e um `RESEND_TOKEN` malformado (`"abc"`) passa em silêncio. Depois: vazio →
ausente (ok), malformado → lança no boot, que é o comportamento correto para configuração errada.

**(c) Log — herdar o formato do `api-hardening`, não inventar outro.**
Modelo: `apps/api/proxy.ts:41-49` (`logBlocked`) — linha única, prefixo entre colchetes, `chave=valor`,
sem PII. Prefixo `[email]` (o repo já tem `[security]` em `proxy.ts:47` e `instrumentation.ts:25`; são os
dois únicos logs deliberados do repositório).

```
[email] skipped template=welcome reason=not-configured locale=pt-br
[email] failed  template=action-link reason=provider-error locale=es
```

**Loga toda tentativa pulada, não só a primeira.** `logBlocked` loga **toda** requisição bloqueada; só o
aviso de boot do `instrumentation.ts:24` é único, porque lá não existe evento por requisição. Deduplicar
esconderia que N e-mails foram perdidos.

**(d) Retorno: união discriminada, nunca `throw`** — item 6 do corte. Mesma forma do `RateLimitResult`
(`packages/security/index.ts:23-29`) e do `parseRequestJson`:

```ts
export type SendResult =
    | { sent: true; id: string | null }
    | { sent: false; reason: "not-configured" | "invalid-recipient" | "provider-error" };
```

### D4 — Migração do formulário de contato da `apps/web`

**Decisão: migrar a *action* e o *template*; não ligar o formulário.** (Spec `:88` recomenda migrar; `:65`
delimita a "migrar para o layout e a copy traduzida".)

Impacto exato na copy — hoje é literal em inglês em quatro pontos:

| Hoje | Onde | Depois |
|---|---|---|
| assunto `"Contact form submission"` | `actions/contact.tsx:32` | `packages.email.contact.subject` (3 idiomas) |
| `<Preview>New email from {name}</Preview>` | `templates/contact.tsx:27` | `packages.email.contact.preview` com `{name}` |
| título `New email from {name}` | `templates/contact.tsx:33` | `packages.email.contact.title` |
| `{name} ({email}) has sent you a message:` | `templates/contact.tsx:36` | `packages.email.contact.intro` com `{name}` e `{email}` |
| `"An unknown error occurred"` / `"Resend environment variables not configured."` | `actions/contact.tsx:14,26` | **somem** — viram `SendResult`, não string |

E — consequência do achado A2 ponto 3 — a action **para de ler `@/env`**: o remetente/destinatário vem de
`keys()` **dentro** do `@repo/email`, que não sofre do `skipValidation` da `apps/web`. Sem isso a migração
seria cosmética: continuaria não enviando.

Qual idioma para o e-mail de contato? O destinatário é o **dono do fork**, não o visitante. →
**recomendação: o locale do visitante** (o dono vai responder àquela pessoa naquele idioma, e é o único
consumidor vivo que prova o fluxo do locale ponta a ponta, que é justamente o argumento da spec `:88`).
Alternativa em **Q5**.

### D5 — O que é "um de ação com link"

**Decisão: um template genérico `action-link`, parametrizado por uma chave de ação no dicionário.**

Restrição dura: senha e verificação estão fora (spec `:52`). O template precisa ser genérico para o fork e
concreto para provar o slice — resolve-se separando **componente** de **copy**:

- o componente é sempre o mesmo: título, um parágrafo de contexto, botão com URL, **linha de URL em texto
  puro** (cliente que bloqueia botão) e nota de "se não foi você, ignore";
- a copy vem de `packages.email.actionLink.actions.<slug>`. Um fork adiciona um slug no dicionário e
  chama `sendEmail` — **sem tocar em nenhum `.tsx`**;
- o corte entrega **um** slug real: `confirmAccess` ("seu acesso está pronto — entrar no painel"), que
  não pisa em senha nem em verificação de e-mail e é usável por qualquer fork.

**Os dois templates não são ligados a nenhum gatilho neste corte** — e isso é deliberado, não omissão:
- a spec diz "nenhuma rota nova no corte" (`:63`) e "passa a **poder** notificar" (capacidade);
- o gatilho natural de boas-vindas seria `POST /auth/sign-up`, mas essa rota **não tem consumidor nenhum**
  no repositório (achado já registrado no `api-hardening`; `rg "auth/sign-up"` só encontra a própria
  entrada de rate limit em `apps/api/proxy.ts:33`) — ligar ali seria fiação morta sobre código morto;
- este é um **boilerplate**: template não-usado é ponto de partida, exatamente como o CRUD `entity` é um
  recurso não-usado que existe para ser copiado.
A prova de ponta a ponta vem do `contact` (consumidor vivo) + preview nos 3 idiomas + testes de render.
→ **Q6**.

### D6 — Marca em um lugar só (item 2 do corte / sinal de pronto `:80`)

`packages/email/brand.ts`, constantes em **hex** — porque `oklch()` e `var()` do design system não
renderizam em cliente de e-mail (achado A3). Um arquivo, ~8 linhas, comentário de 1 linha explicando
**por que não reusa o design system** (essa é uma das duas exceções legítimas de comentário: restrição
externa não evidente no código).

Alternativa considerada e recusada: marca por env (`EMAIL_BRAND_NAME`, `EMAIL_LOGO_URL`, …) — 5 vars
novas em 3 `.env.example` para trocar algo que o fork troca uma vez, no primeiro dia. → **Q7**.

### D7 — Preview nos 3 idiomas (item 5 do corte)

O React Email (`react-email@4.3.2`) varre `--dir` e renderiza **o export default de cada arquivo**, com
`PreviewProps` estáticos. **Não há como trocar props na interface.** Logo, 3 idiomas = 3 entradas por
template. Decisão:

```
packages/email/templates/          ← o que o preview varre
  contact.tsx        ← template real, PreviewProps com locale "pt-br"
  welcome.tsx
  action-link.tsx
  previews/          ← 6 wrappers de ~5 linhas, só para o preview
    contact.en.tsx        contact.es.tsx
    welcome.en.tsx        welcome.es.tsx
    action-link.en.tsx    action-link.es.tsx
```

Tudo que **não** é template previsualizável (`send.ts`, `brand.ts`, `components/layout.tsx`,
`preview-data.ts`) fica **fora** de `templates/`, senão o scanner tenta renderizar. `apps/email` não muda.

**Risco de resolução, e a razão do subpath no `exports`:** o preview do React Email **não** é o webpack do
Next e **não** aplica o alias `@repo/*` do tsconfig. Ele resolve por Node, que **honra o `exports` map**.
`packages/internationalization/package.json:5-11` expõe só `.`, `./keys`, `./server`, `./client`,
`./utils` — `./translations/global` **não está lá**. Sem o subpath, `packages/email/templates/*.tsx`
importando o dicionário **quebra o preview**, que é o item 5 do corte. Daí a adição em D1.
(Sintoma do mesmo buraco já no repo: `packages/shared/utils/helpers/formattedError.ts:3` importa o
dicionário por **caminho relativo** `../../../internationalization/translations/global` justamente porque
o subpath não existe. Não refatorar agora — fora de escopo, mas fica coerente depois.)

Consequência de desenho: os templates importam **`translations/global` e `utils`** — módulos de objeto
puro. **Nunca** `/client` (`"use client"`) nem `/server` (`"use server"`, importa `next/headers`), que não
existem no contexto do preview.

### D8 — Interpolação (`{name}`, `{url}`) — a primeira do repositório

`rg` por função/template-literal em `translations/` retorna **zero**: hoje todo valor é string literal.
Duas saídas:
- **(a)** quebrar a frase em pedaços e montar no JSX — a ordem das palavras muda entre pt-br/en/es;
  é como se produz tradução ruim;
- **(b)** um `interpolate(template, vars)` de ~6 linhas trocando `{chave}` pelo valor.

**Decisão: (b), e o helper fica em `packages/email/interpolate.ts`, não em `@repo/shared`** — a regra do
repo é não abstrair antes do segundo caso de uso. Se `auth-recovery-verification` precisar do mesmo,
promove-se. A paridade continua verde: `parity.test.ts:15-22` compara **caminhos de chave**, e o valor
segue sendo `string`.

## B. Blueprint por arquivo

### B0 — Árvore de arquivos

```
packages/email/
  index.ts                      (M)  getResendClient lazy + isEmailEnabled + reexports
  keys.ts                       (M)  z.preprocess vazio→ausente; sem skipValidation
  package.json                  (M)  dep @repo/internationalization; devDep vitest; script test
  tsconfig.json                 (=)
  vitest.config.mts             (N)  node + esbuild jsx automatic
  brand.ts                      (N)  emailBrand — hex, o "um lugar só"
  interpolate.ts                (N)  {chave} → valor
  copy.ts                       (N)  emailCopy(locale) → packages.email do dicionário
  template.ts                   (N)  tipo EmailTemplate<TData>
  send.ts                       (N)  sendEmail() + SendResult + log [email]
  preview-data.ts               (N)  dados de exemplo (fora de templates/, senão o scanner pega)
  components/
    layout.tsx                  (N)  EmailLayout — cabeçalho, corpo, rodapé, assinatura
    action-button.tsx           (N)  botão + linha de URL de fallback
  templates/
    contact.tsx                 (M)  layout + dicionário + locale
    welcome.tsx                 (N)
    action-link.tsx             (N)
    previews/*.{en,es}.tsx      (N)  6 wrappers
  __tests__/
    sendEmail.test.ts           (N)
    templates.test.tsx          (N)
    emailCopy.test.ts           (N)

packages/internationalization/
  package.json                            (M)  + "./translations/global" no exports
  utils.ts                                (M)  + export resolveLocale
  client.ts                               (M)  passa a usar resolveLocale de utils
  translations/packages/email/index.ts    (N)  ramo novo, 3 idiomas
  translations/packages/index.ts          (M)  pendura email

apps/web/
  app/[locale]/contact/actions/contact.tsx  (M)  sendEmail + locale + chaves do pacote
  __tests__/contactAction.test.ts           (N)
```

### B1 — Contrato do envio (item 1 do corte)

```ts
// packages/email/template.ts
import type { Locale } from "@repo/internationalization/utils";
import type { ReactElement } from "react";
import type { EmailCopy } from "./copy";

export type EmailTemplate<TData> = {
    readonly id: string;
    readonly subject: (copy: EmailCopy, data: TData) => string;
    readonly render: (args: { locale: Locale; data: TData }) => ReactElement;
};
```

```ts
// packages/email/send.ts
export type SendResult =
    | { sent: true; id: string | null }
    | { sent: false; reason: "not-configured" | "invalid-recipient" | "provider-error" };

export type SendEmailInput<TData> = {
    template: EmailTemplate<TData>;
    to: string | string[] | null;
    data: TData;
    locale?: string | null;
    replyTo?: string;
};

export const sendEmail = async <TData>(input: SendEmailInput<TData>): Promise<SendResult> => { … };
export const ownerInbox = (): string | null => keys().RESEND_FROM ?? null;
```

**Por que descritor e não união fechada de nomes de template:** com uma união
(`{ template: "welcome" } | { template: "actionLink" } | …`), todo fork que adiciona um template precisa
**editar `send.ts`**. Com o descritor, adiciona-se um arquivo e o `data` é inferido do template no ponto
de chamada — que é a mesma inferência tipada que a união daria. "Genérico no pacote" (CLAUDE.md raiz).

Esqueleto do handler de envio:

```ts
export const sendEmail = async <TData>({ template, to, data, locale, replyTo }: SendEmailInput<TData>) => {
    const resolvedLocale = resolveLocale(locale);
    const client = getResendClient();
    const from = keys().RESEND_FROM;

    if (!(client && from)) {
        logEmail("skipped", template.id, "not-configured", resolvedLocale);
        return { sent: false, reason: "not-configured" } as const;
    }
    if (!to || (Array.isArray(to) && to.length === 0)) {
        logEmail("skipped", template.id, "invalid-recipient", resolvedLocale);
        return { sent: false, reason: "invalid-recipient" } as const;
    }

    try {
        const { data: sent, error } = await client.emails.send({
            from,
            to,
            replyTo,
            subject: template.subject(emailCopy(resolvedLocale), data),
            react: template.render({ locale: resolvedLocale, data }),
        });
        if (error) {
            logEmail("failed", template.id, "provider-error", resolvedLocale);
            return { sent: false, reason: "provider-error" } as const;
        }
        return { sent: true, id: sent?.id ?? null } as const;
    } catch {
        logEmail("failed", template.id, "provider-error", resolvedLocale);
        return { sent: false, reason: "provider-error" } as const;
    }
};
```

> `resend@6.2.2` devolve `{ data, error }` **e** pode lançar (rede). Os dois caminhos precisam existir,
> senão o item 6 do corte fica meio-feito. O `catch` é **vazio de propósito**: a mensagem do provedor pode
> conter o destinatário.

### B2 — Log

```ts
/** Uma linha, prefixo estável, sem destinatário, assunto ou corpo: e-mail que não saiu não é motivo para começar a reter dado pessoal. */
const logEmail = (event: "skipped" | "failed", template: string, reason: string, locale: Locale): void => {
    console.warn(`[email] ${event} template=${template} reason=${reason} locale=${locale}`);
};
```

### B3 — Resolução da copy

```ts
// packages/email/copy.ts
import { globalTranslations } from "@repo/internationalization/translations/global";
import type { Locale } from "@repo/internationalization/utils";

export type EmailCopy = (typeof globalTranslations)["pt-br"]["packages"]["email"];
export const emailCopy = (locale: Locale): EmailCopy => globalTranslations[locale].packages.email;
```

### B4 — Layout comum e marca

```tsx
// packages/email/components/layout.tsx
export const EmailLayout = ({ locale, preview, children }: EmailLayoutProps) => {
    const copy = emailCopy(locale);
    return (
        <Tailwind>
            <Html lang={locale}>
                <Head />
                <Preview>{preview}</Preview>
                <Body style={{ backgroundColor: emailBrand.backgroundColor }} className="font-sans">
                    <Container className="mx-auto py-12">
                        {/* cabeçalho: logo ou nome da marca */}
                        <Section className="rounded-md p-8" style={{ backgroundColor: "#ffffff" }}>
                            {children}
                            <Hr className="my-6" />
                            <Text className="m-0 text-sm">{copy.layout.signature}</Text>
                        </Section>
                        <Text className="mt-4 text-center text-xs">{copy.layout.footerNote}</Text>
                    </Container>
                </Body>
            </Html>
        </Tailwind>
    );
};
```

`<Tailwind>` mantido (spec `:89`, e é o que `contact.tsx:24` já usa). Cores da marca via `style` inline em
hex, porque classe Tailwind arbitrária não cobre valor vindo de constante em runtime de forma confiável e
`oklch()` está fora de questão (A3).

### B5 — Os dois templates + o migrado

```tsx
// packages/email/templates/welcome.tsx
export const welcomeEmail: EmailTemplate<WelcomeData> = {
    id: "welcome",
    subject: (copy) => copy.welcome.subject,
    render: ({ locale, data }) => <WelcomeEmail locale={locale} data={data} />,
};
const WelcomeEmail = ({ locale, data }: …) => {
    const copy = emailCopy(locale).welcome;
    return (
        <EmailLayout locale={locale} preview={interpolate(copy.preview, { name: data.name })}>
            <Text …>{interpolate(copy.title, { name: data.name })}</Text>
            <Text …>{copy.body}</Text>
            {data.url ? <ActionButton href={data.url} label={copy.cta} locale={locale} /> : null}
        </EmailLayout>
    );
};
WelcomeEmail.PreviewProps = { locale: "pt-br", data: welcomePreviewData };
export default WelcomeEmail;
```

`action-link.tsx` idêntico em forma, com `data: { name, url, action: ActionSlug }` e
`copy.actionLink.actions[data.action]`. `contact.tsx` idem, com `data: { name, email, message }`.

`previews/welcome.en.tsx` (o padrão dos 6):
```tsx
import { welcomePreviewData } from "../../preview-data";
import WelcomeEmail from "../welcome";
const WelcomeEmailEn = () => <WelcomeEmail data={welcomePreviewData} locale="en" />;
export default WelcomeEmailEn;
```

### B6 — Árvore de i18n (item 3 do corte)

`packages/internationalization/translations/packages/email/index.ts` — mesma forma de
`translations/packages/auth/index.ts` (objeto com as 3 chaves de idioma inline). Pendurado em
`translations/packages/index.ts` ao lado de `auth` e `utils`. Acesso: `packages.email.*`.

```
packages.email
├── layout
│   ├── signature          "Equipe {brand}"
│   ├── footerNote         "Você recebeu este e-mail porque tem uma conta em {brand}."
│   └── fallbackUrlLabel   "Se o botão não funcionar, copie e cole este endereço:"
├── welcome
│   ├── subject            "Bem-vindo(a) a {brand}"
│   ├── preview            "Sua conta em {brand} está pronta"
│   ├── title              "Olá, {name}!"
│   ├── body               "Sua conta foi criada. …"
│   └── cta                "Acessar o painel"
├── actionLink
│   ├── ignoreNote         "Se você não pediu isso, ignore este e-mail."
│   └── actions
│       └── confirmAccess
│           ├── subject / preview / title / body / cta
└── contact
    ├── subject            "Nova mensagem do formulário de contato"
    ├── preview            "Nova mensagem de {name}"
    ├── title              "Nova mensagem de {name}"
    ├── intro              "{name} ({email}) enviou uma mensagem:"
    └── messageLabel       "Mensagem"
```

**19 chaves-folha × 3 idiomas = 57 valores.** Nenhuma vai para `apiErrors` (§4). Usar `/i18n-sync`.

### B7 — Pseudo-diff da action de contato

```diff
  "use server";
- import { resend } from "@repo/email";
- import { ContactTemplate } from "@repo/email/templates/contact";
- import { env } from "@/env";
+ import { ownerInbox, sendEmail } from "@repo/email";
+ import { contactEmail } from "@repo/email/templates/contact";
+ import { getDictionary } from "@repo/internationalization/server";

- const parseError = (error: unknown): string => { … };            // some: 3 strings inglesas

  export const contact = async (name, email, message): Promise<{ error?: string }> => {
-     try {
-         if (!(env.RESEND_FROM && env.RESEND_TOKEN)) { throw new Error("Resend environment variables not configured."); }
-         await resend.emails.send({ from: env.RESEND_FROM, to: env.RESEND_FROM, subject: "Contact form submission", replyTo: email, react: <ContactTemplate … /> });
-         return {};
-     } catch (error) { return { error: parseError(error) }; }
+     const { locale } = await getDictionary();
+     await sendEmail({
+         template: contactEmail,
+         to: ownerInbox(),
+         replyTo: email,
+         locale,
+         data: { name, email, message },
+     });
+     return {};
  };
```

Note o que sumiu: o `throw`, o `parseError`, o `env` da app e as 4 strings inglesas. E o que **não**
mudou: a assinatura pública da action (`name, email, message` → `{ error?: string }`) — para não obrigar a
mexer no formulário (Q4). A action passa a **sempre** retornar sucesso: falha de envio é log, não erro do
usuário (item 6 do corte).

## 11. Ordem de implementação e commits

A regra padrão é SDK → API → app/web → i18n. Aqui **SDK e API são N/A**, e o dicionário é o contrato do
qual o `packages/email` depende para compilar — então a ordem é por dependência, como o `api-hardening`
também fez:

| # | Commit | Conteúdo |
|---|---|---|
| 1 | `feat(internationalization): add the email copy branch in the three languages` | `translations/packages/email/index.ts` + `translations/packages/index.ts` |
| 2 | `refactor(internationalization): expose locale resolution and the dictionary subpath` | `utils.ts` (`resolveLocale`), `client.ts`, `package.json` (`exports`) |
| 3 | `fix(email): treat an empty Resend key as absent and build the client lazily` | `keys.ts`, `index.ts` (corrige A1) |
| 4 | `feat(email): add the shared layout, brand tokens and the typed send facade` | `brand.ts`, `interpolate.ts`, `copy.ts`, `template.ts`, `send.ts`, `components/*`, `package.json` |
| 5 | `feat(email): add the welcome and action-link templates with per-locale previews` | `templates/welcome.tsx`, `templates/action-link.tsx`, `templates/previews/*`, `preview-data.ts` |
| 6 | `refactor(email): move the contact template to the shared layout and dictionary` | `templates/contact.tsx` |
| 7 | `test(email): cover the send facade, the copy and the templates` | `vitest.config.mts`, `__tests__/*` |
| 8 | `refactor(web): send the contact email through the shared facade` | `actions/contact.tsx` |
| 9 | `test(web): cover the contact action` | `apps/web/__tests__/contactAction.test.ts` |
| 10 | `docs(features): transactional-emails` | `docs/features/transactional-emails/` |

Um commit por pacote/app, ordenado por dependência (`.claude/rules/git-commits.md`). Mensagens em inglês.
**Branch e commit são do `revisor-codigo`** — este plano não cria nem nomeia branch.

## 12. Env e o que cada fork configura

**Nenhuma variável nova.** `RESEND_FROM` e `RESEND_TOKEN` já estão declaradas em
`packages/email/keys.ts:7-8` e nos três `.env.example`. O que muda é o **significado**: deixam de ser
decorativas e passam a ser o interruptor do envio.

Para o fork usar de verdade (custo herdado que a spec já registra, `:71-72`):
1. conta no Resend e `RESEND_TOKEN` (`re_…`);
2. **domínio verificado com SPF + DKIM** — passo manual de DNS, sem contorno;
3. `RESEND_FROM` num remetente **daquele** domínio (senão o Resend recusa o envio);
4. editar `packages/email/brand.ts` (nome, logo, cores, e-mail de suporte);
5. traduzir/ajustar `translations/packages/email/index.ts` — os valores entregues são exemplos neutros.

Não adicionar `RESEND_*` ao `turbo.json`: `lint`/`typecheck`/`test` têm `env: []` de propósito, e a suíte
nova não pode depender de ambiente.

## 13. Rollback

Reverter os commits basta. Não há dado gravado, migração, índice, webhook ou registro externo. O único
efeito colateral irreversível é um e-mail já entregue. `RESEND_*` podem ficar como estão.

## 14. Testes — arquivo por arquivo

| Arquivo | Casos |
|---|---|
| `packages/email/__tests__/sendEmail.test.ts` (novo) | sem token → `{sent:false,reason:"not-configured"}`, **não lança**, `console.warn` chamado com `[email]` e **sem** o endereço na string · com token → `client.emails.send` recebe `from` de `RESEND_FROM`, `subject` do dicionário **do locale pedido** (asserção com `es`, sinal de pronto `:79`) e `replyTo` quando passado · `to: null`/`[]` → `invalid-recipient` · provedor devolve `{error}` → `provider-error` · provedor **lança** → `provider-error` (os dois caminhos do `resend@6.2.2`) · `locale: "fr"`/`""`/`null`/`undefined` → cai no padrão · `isEmailEnabled()` reflete as duas chaves |
| `packages/email/__tests__/emailCopy.test.ts` (novo) | **todo `subject` e todo `title` é string não-vazia nos 3 idiomas** — a paridade compara caminhos, não valores (limite de `parity.test.ts:15-22`), então placeholder vazio passaria despercebido · `interpolate` troca `{name}`, deixa `{}` desconhecido intacto e não quebra com valor vazio |
| `packages/email/__tests__/templates.test.tsx` (novo) | render via `@react-email/render` dos 3 templates × 3 idiomas: contém a copy daquele idioma e **não** contém a de outro · os 3 contêm `emailBrand.name` e o rodapé (prova do layout comum) · `action-link` renderiza a URL **como `href` e como texto visível** (fallback) |
| `packages/internationalization/__tests__/parity.test.ts` | **inalterado** — cobre o ramo novo automaticamente (A4). Verificação no `/develop`: remover 1 chave de `en` e confirmar que falha |
| `apps/web/__tests__/contactAction.test.ts` (novo) | mock de `@repo/email`: envio falho → a action **retorna sucesso** e não lança (item 6) · o `locale` passado ao `sendEmail` é o de `getDictionary()` · `replyTo` é o e-mail do visitante |
| `packages/security`, `apps/api`, `apps/app` | intocados; nenhuma regressão esperada |

**Gotcha de setup (não descobrir isso no meio da implementação):** `packages/email/tsconfig.json` estende
`nextjs.json`, que traz `"jsx": "preserve"` — o esbuild do Vitest não compila `.tsx` assim. O
`vitest.config.mts` novo precisa de `esbuild: { jsx: "automatic" }` (o `packages/security/vitest.config.mts`
não precisou porque é só `.ts`).

**Comandos:** `pnpm --filter @repo/email test` · `pnpm --filter @repo/internationalization test` ·
`pnpm --filter web test` · `pnpm turbo run lint typecheck test` (o que o CI roda; **22 → 23 tasks**).

**O que é impossível cobrir em Vitest** (fica para o `/test` e para o olho humano): fidelidade em cliente
real (Outlook/Gmail/Apple Mail), dark mode do cliente de e-mail, entregabilidade/spam, DNS. Isso é o
motivo de o item 5 do corte existir — o preview é o instrumento de revisão.

## 15. Riscos de implementação

| # | Risco | Mitigação |
|---|---|---|
| R1 | O preview da 3003 não resolve `@repo/internationalization` de dentro de `packages/email` (bundler próprio, honra `exports`) | subpath `./translations/global` no `exports` (D1/D7) + dep declarada. **Validar V1 cedo** — é o item 5 do corte |
| R2 | O React Email tenta renderizar arquivos que não são template | nada além de `.tsx` de template dentro de `templates/`; `send.ts`/`brand.ts`/`preview-data.ts`/`components/` ficam fora |
| R3 | Remover `skipValidation` de `keys.ts:14` derruba o boot de algum app | os 3 apps estendem `email()`; o `z.preprocess` cobre `""` (o caso real dos `.env.example`). `apps/api/env.ts:30` ainda tem `skipValidation` em dev. Rodar `pnpm --filter api build` e `--filter app build` com `.env.example` puro |
| R4 | Remover o export `resend` quebra algum consumidor | `rg "@repo/email"` → 5 imports, 1 único usa `resend` (a action migrada). Verificado |
| R5 | Tocar `client.ts` para usar `resolveLocale` regride a troca de idioma | comportamento idêntico (é a mesma função movida); `agent-browser` V5 nos 3 locales |
| R6 | `<Tailwind>` do React Email + `style` inline de cor conflitando | preferir `style` para cor de marca e classe para espaçamento; V2/V4 conferem |

---

# Perguntas em aberto

Cada uma tem uma **recomendação default**. Se o `/analyze` rodar em modo autônomo, siga a recomendação e
registre no `STATE.md`.

> **Resolução (2026-09-09) — as 10 seguiram a recomendação default.** O pipeline rodou em modo autônomo a
> pedido do usuário ("faça o mais longe que conseguir, deixe as perguntas para o final"), então **nenhuma
> foi confirmada por ele antes do `/develop`**. Todas são reversíveis e nenhuma trava outra: Q4, Q6 e Q10
> são decisões de **não fazer** (nada a desfazer); Q5, Q7 e Q9 trocam-se numa linha; Q2, Q3 e Q8 são
> aditivas. As que mais merecem ratificação são **Q4** (o formulário da landing continua sendo uma
> maquete que não envia) e **Q6** (dois dos quatro templates ficam sem gatilho no código).

**Q1 — As 3 perguntas da própria spec (`:87-89`): concordo com as três recomendações?**
Avaliadas contra o código: **sim, as três**.
(a) *idioma do locale da requisição, pt-br como padrão* — confirmado viável sem plumbing novo:
`apps/web/proxy.ts:92,96` garante que o cookie `x-locale` espelha o segmento `[locale]`, e
`server.ts:18-34` já entrega `{ locale }`. O padrão vem de `getDefaultLocale()` (`utils.ts:15-18`), que já
é `pt-br`.
(b) *migrar a rota de contato* — confirmado, **com a ressalva do achado A2**: ela nunca funcionou, então
"migrar" inclui consertar (ler as chaves de dentro do pacote).
(c) *manter Tailwind* — confirmado; é o que `contact.tsx:24` usa, e trocar por tabelas clássicas seria
reescrever o único template existente sem pedido.

**Q2 — Promover `resolveLocale` para `@repo/internationalization/utils` (e fazer `client.ts` usá-la)?**
Alternativa: duplicar ~10 linhas dentro do `packages/email`.
→ **Recomendação: promover.** É a única forma de o pacote de e-mail sanear locale sem duplicar a lista de
idiomas, e `utils.ts` já é o módulo neutro que `packages/shared`, `packages/auth` e `apps/web/proxy.ts`
consomem.

**Q3 — Adicionar `"./translations/global"` ao `exports` do `@repo/internationalization`?**
→ **Recomendação: adicionar.** Não é limpeza: sem isso o preview da 3003 (item 5 do corte) provavelmente
quebra, porque o bundler do React Email resolve por Node e honra o `exports` map. Adição aditiva, não
quebra nada, e legitima um deep import que 6 arquivos do repo já fazem.

**Q4 — Ligar o formulário de contato da landing (campos reais + submit) entra neste corte?**
Hoje ele é maquete: 4 campos que não batem com a action, botão sem handler (achado A2).
→ **Recomendação: NÃO.** A spec pede "o envio […] migra para o layout e a copy traduzida" (`:65`) — a
*base*, não a *feature*. Ligar o formulário exige campos novos, `useActionState`, estados de
loading/sucesso/erro, validação Zod e chaves de UI novas: é entrega de produto na landing, e vira spec
própria. Registrar no `/spec --sync` que a landing tem um formulário que não envia nada.

**Q5 — O e-mail de contato sai no idioma do visitante ou no idioma padrão do fork?**
O destinatário é a caixa do dono, não o visitante.
→ **Recomendação: idioma do visitante.** O dono vai responder àquela pessoa naquele idioma, e é o único
consumidor vivo capaz de provar o fluxo do locale ponta a ponta — que é exatamente o argumento da spec
(`:88`, "valida a base sem inventar caso de teste"). Se preferir o oposto, é trocar `locale` por
`getDefaultLocale()` numa linha.

**Q6 — Boas-vindas e `action-link` ficam sem gatilho (só preview + testes) neste corte?**
→ **Recomendação: SIM, sem gatilho.** A spec veda rota nova (`:63`) e o gatilho natural
(`POST /auth/sign-up`) **não tem consumidor no repositório** — ligar ali seria fiação morta sobre código
morto. Template não-usado num boilerplate é ponto de partida, como o CRUD `entity`. O consumidor vivo que
prova o slice é o `contact`.

**Q7 — Marca em `brand.ts` (arquivo TS) ou em variáveis de ambiente?**
→ **Recomendação: `brand.ts`.** É "um lugar só" (sinal de pronto `:80`) sem inflar 5 vars novas em 3
`.env.example` para algo que o fork troca uma vez. Env faria sentido se a marca variasse por ambiente —
não varia.

**Q8 — 6 arquivos-wrapper em `templates/previews/` para os idiomas não-padrão?**
O React Email só renderiza o export default com props estáticos; não há como trocar idioma na interface.
→ **Recomendação: SIM, os 6 wrappers** (~5 linhas cada). É o preço literal do item 5 do corte ("todos os
templates […] nos 3 idiomas"). A alternativa — preview só em pt-br e revisar en/es lendo o dicionário —
descumpre o item.

**Q9 — Qual o slug da única ação entregue no `action-link`?**
Proposto `confirmAccess` ("seu acesso está pronto — entrar no painel"), por não pisar em senha nem em
verificação de e-mail (ambas fora do corte, spec `:52`).
→ **Recomendação: `confirmAccess`.** Alternativas se preferir outro nome: `openPanel`, `finishSetup`.

**Q10 — Corrigir agora o `skipValidation: true` da `apps/web` (achado A2 ponto 3)?**
É a causa raiz de a action nunca ter podido enviar, e afeta header/CTA/pricing da landing inteira.
→ **Recomendação: NÃO nesta entrega.** Contornado aqui (as chaves são lidas de dentro do `@repo/email`).
É bug pré-existente, de raio maior que esta spec, já registrado desde o `api-hardening`. Levar ao
`/spec --sync`.
