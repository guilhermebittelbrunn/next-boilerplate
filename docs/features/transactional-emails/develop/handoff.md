# Handoff — E-mails transacionais traduzidos

> Implementação do `analyze/plan.md`. Nada commitado, nenhuma branch criada — working tree limpo de
> artefatos temporários, branch `cheyenne`.

## 1. Blueprint → arquivos

### `packages/internationalization` (commits 1–2 do plano §11)

| Item do blueprint | Arquivo | Estado |
|---|---|---|
| B6 — ramo `packages.email` nos 3 idiomas | `translations/packages/email/index.ts` | **novo** — 19 chaves-folha × 3 idiomas = 57 valores (contagem conferida em runtime) |
| B6 — pendurar no dicionário | `translations/packages/index.ts` | +`email:` nos 3 idiomas |
| D2 — promover `resolveLocale` | `utils.ts` | +`export function resolveLocale` (mesma lógica que estava privada em `client.ts:12-26`) |
| D2 — `client.ts` passa a usar | `client.ts` | função local removida, importa de `./utils`; comportamento idêntico |
| D1/D7 — subpath no `exports` | `package.json` | +`"./translations/global": "./translations/global.ts"` |

### `packages/email` (commits 3–7)

| Item | Arquivo | Estado |
|---|---|---|
| D3(b) — vazio = ausente, sem `skipValidation` | `keys.ts` | reescrito com `z.preprocess(emptyToUndefined, …)` para as duas chaves; `skipValidation` removido |
| D3(a) — cliente lazy · D3(c) log · D3(d) união · B1 contrato · B2 log | `index.ts` | reescrito: `sendEmail`, `SendResult`/`SendFailureReason`/`SendEmailInput`, `isEmailEnabled`, `ownerInbox`, `getResendClient` (privado), `logEmail` (privado). O export `resend` **deixou de existir** |
| D6 — marca em um lugar | `brand.ts` | **novo**, 10 constantes em hex |
| D8 — interpolação | `interpolate.ts` | **novo**, `{chave}` → valor, desconhecida fica intacta |
| B3 — resolução da copy | `copy.ts` | **novo**, `EmailCopy` + `emailCopy(locale)` |
| B1 — descritor de template | `template.ts` | **novo**, `EmailTemplate<TData>` |
| B4 — layout comum | `components/layout.tsx` | **novo** (`EmailLayout`: cabeçalho da marca, card, `Hr`, assinatura, rodapé) |
| B4 — botão + URL de fallback | `components/action-button.tsx` | **novo** |
| D7 — dados de exemplo fora de `templates/` | `preview-data.ts` | **novo** |
| B5 — boas-vindas | `templates/welcome.tsx` | **novo** (`welcomeEmail` + default export com `PreviewProps`) |
| D5 — ação com link, slug `confirmAccess` | `templates/action-link.tsx` | **novo**, `ActionSlug = keyof EmailCopy["actionLink"]["actions"]` |
| D4 — contato migrado | `templates/contact.tsx` | reescrito sobre `EmailLayout` + dicionário + `locale` |
| D7/Q8 — 6 wrappers de idioma | `templates/previews/{welcome,action-link,contact}.{en,es}.tsx` | **novos**, 5 linhas cada |
| §7 — infra de teste | `vitest.config.mts`, `package.json` | **novo**/`+ test`, `+ vitest`, `+ @repo/internationalization` |
| §14 — suíte | `__tests__/sendEmail.test.ts` (24) · `emailCopy.test.ts` (17) · `templates.test.tsx` (23) | **novos**, 64 casos |

### `apps/web` (commits 8–9)

| Item | Arquivo | Estado |
|---|---|---|
| B7 — action migrada | `app/[locale]/contact/actions/contact.tsx` | 44 → 25 linhas: sem `try/catch`, sem `parseError`, sem `@/env`, sem as 4 strings inglesas |
| §14 | `__tests__/contactAction.test.ts` | **novo**, 5 casos |

### N/A justificado (inalterados, como o plano previu)

`packages/sdk` · `apps/api` · `apps/app` · `apps/email` · `turbo.json` · os 3 `.env.example` ·
`translations/packages/shared/utils.ts` (`apiErrors`) · `__tests__/parity.test.ts`.

## 2. Contrato

**Não há DTO nem action de SDK nesta entrega.** O contrato que mudou é a superfície pública do
`@repo/email`:

| Antes | Depois | Consumidores |
|---|---|---|
| `export const resend` (instância `Resend` de topo de módulo) | **removido** | único uso era `apps/web/.../actions/contact.tsx`, reescrito aqui (`rg "@repo/email"` reconferido: 5 imports, nenhum outro tocava `resend`) |
| — | `sendEmail`, `SendResult`, `SendEmailInput`, `SendFailureReason`, `isEmailEnabled`, `ownerInbox` | `apps/web` (contato); disponível para `apps/api`/`apps/app` sem fiação nova |
| `ContactTemplate` (props soltas) | `contactEmail: EmailTemplate<ContactData>` + default export para o preview | `apps/web` |
| `keys()` com `skipValidation` condicional | `keys()` sempre validando, `""` ⇒ ausente | `apps/api/env.ts`, `apps/app/env.ts`, `apps/web/env.ts` (todos só estendem) |

`@repo/email` passou a declarar `@repo/internationalization` (seta única, sem ciclo — o i18n não importa
nenhum `@repo/*`).

## 3. Códigos de erro novos

**Nenhum**, e é decisão, não esquecimento: não há rota nova, e falha de envio é evento de log
(`SendResult.reason`), não `error.code`. `apiErrors` (`translations/packages/shared/utils.ts`) está
**intocado** nos 3 idiomas.

## 4. Desvios em relação ao plano

| # | Desvio | Por quê |
|---|---|---|
| D-1 | **`send.ts` e `resendClient.ts` não existem; a fachada inteira vive em `index.ts`** (o plano §B0 previa 3 arquivos) | O Biome do repo tem `lint/performance/noBarrelFile` **como erro** e ele dispara em qualquer arquivo com `export … from`. Um `index.ts` que reexportasse `send.ts` reprova o `pnpm check`; e `send.ts` importando `getResendClient` de `index.ts` fecharia um ciclo de módulo. `index.ts` como módulo real espelha `packages/security/index.ts` (mesmo tamanho, mesma forma). Os testes importam `../index` |
| D-2 | Os `PreviewProps` dos 3 templates leem de `preview-data.ts` (o plano §B5 mostrava o objeto inline) | evita duplicar o mesmo dado em 4 arquivos; `preview-data.ts` importa **só tipos** dos templates, então não há ciclo em runtime |
| D-3 | `hasRecipient` também recusa string em branco (`"   "`) e array só de brancos | o plano cobria `null`/`[]`; um `to` em branco chegaria ao provedor como erro de rede em vez de decisão nossa |
| D-4 | Copy `en` do rodapé virou "…you have an account at {brand}" (era "…a {brand} account") | detectado na validação visual: com o nome da marca interpolado, o artigo `a/an` fica errado para metade dos forks ("a Acme account"). Reescrito para não depender de artigo |
| D-5 | `layout.tsx` renderiza `<Img>` só quando `emailBrand.logoUrl` está preenchido; senão mostra o nome | `brand.ts` sai com `logoUrl: ""` (fork ainda não tem logo hospedado); um `<Img src="">` quebraria o cabeçalho |

Nada disso muda decisão de arquitetura do plano — são consequências de regra de lint e de copy.

## 5. Decisões em aberto / pendências

- **Q4 e Q6 continuam sem ratificação do usuário** (o pipeline rodou autônomo). Consequência visível:
  o formulário da landing **segue sendo maquete que não envia** (campos `date/firstname/lastname/resume`,
  botão sem handler) e `welcome`/`action-link` **não têm gatilho** em lugar nenhum do código. Ambos são
  decisões de *não fazer* — não há nada para desfazer se o usuário discordar.
- **Q10 mantido**: `apps/web/env.ts:22` (`skipValidation: true`) **não** foi corrigido. Contornado como o
  plano manda (as chaves são lidas dentro do `@repo/email`, não pelo `env` da app). Continua para o
  `/spec --sync`.
- **Ruído do preview (novo, não bloqueante):** o servidor da 3003 imprime em loop
  `Could not find index file for directory at packages/internationalization/utils`. Causa: o pacote tem
  **`utils.ts` e `utils/` convivendo**, e o caminhador de dependências do React Email resolve o diretório.
  Tudo renderiza (o `exports` map resolve o arquivo), mas é log sujo. Dívida registrada — a limpeza é
  renomear `utils/cookies.ts` ou criar `utils/index.ts`, fora de escopo aqui.
- **`packages/email` continua sem `main`/`exports`** (dívida já registrada no `STATE.md` do analyze). Os
  imports `@repo/email`, `@repo/email/keys` e `@repo/email/templates/contact` resolvem por alias TS +
  hoisting do pnpm. Não mexido: risco de quebrar imports por ganho zero.

## 6. Validação — gates

| Gate | Comando | Resultado |
|---|---|---|
| Lint/format | `pnpm check` | **425 arquivos, 0 erro, 0 warning** |
| CI completo | `pnpm turbo run lint typecheck test` | **23 successful, 23 total** — exatamente o 22 → 23 que o plano previu (a task nova é `@repo/email#test`) |
| Suíte nova | `pnpm --filter @repo/email test` | **3 arquivos, 64 testes, todos verdes** |
| Web | `pnpm --filter web test` | **4 arquivos, 27 testes** (era 3/22) |
| Paridade i18n | `pnpm --filter @repo/internationalization test` | **11 testes verdes** |
| Paridade — prova negativa | removi `welcome.cta` só do `en` e rodei | falhou com `[globalTranslations] en faltando: packages.email.welcome.cta`; chave restaurada e suíte verde de novo |
| **R3 — boot sem/`com` credencial** | `pnpm --filter api build`, `--filter app build`, `--filter web build` | **os 3 buildam**. A `api` é a prova real do caso vazio: seu `.env` tem `RESEND_FROM=""`/`RESEND_TOKEN=""` e o boot passa. Um token malformado (`"abc"`) **passa a reprovar** — coberto em `sendEmail.test.ts` ("still refuses a malformed token") |

## 7. Validação visual

Preview do React Email na **3003** (`pnpm --filter email dev`), `agent-browser 0.27.0`, comandos em
sequência. Screenshots em `docs/features/transactional-emails/develop/screenshots/`.

| # | O que foi percorrido | Observado | Screenshot |
|---|---|---|---|
| V1 | `localhost:3003` | os 3 templates + a pasta `previews/` na lista; nenhum arquivo não-template apareceu (R2 ok) | `v1-preview-list.png` |
| V2 | `welcome`, `action-link`, `contact` em pt-br | layout idêntico nos 3: cabeçalho com a marca, card branco com borda, `Hr`, assinatura "Equipe Acme", rodapé centralizado. `action-link` mostra o botão **e** a URL em texto | `v2-*-pt-br.png` |
| V2b | `welcome` no viewport mobile do preview | sem overflow horizontal; texto, botão e URL longa quebram corretamente | `v2-welcome-mobile.png` |
| V3 | os 6 wrappers `*.{en,es}` | **6 telas**, texto integralmente no idioma certo, sem sobra de pt-br. Foi aqui que apareceu o problema de artigo em inglês (desvio D-4) | `v3-*.png` |
| V4 | `brand.ts` → `name: "Northwind"`, `primaryColor: "#7c3aed"`, recarregar | **os 3 templates e os 6 wrappers mudaram juntos** — nome no cabeçalho, cor do botão e assinatura. Sinal de pronto da spec `:80` provado. `brand.ts` restaurado depois | `v4-brand-*-after.png` |
| V5 | `localhost:3001/{pt-br,en,es}/contact`, dark + light | página **não regrediu**; troca de idioma continua correta nos 3 (prova indireta de R5 — `client.ts` usando o `resolveLocale` movido). UI intocada, como decidido em Q4 | `v5-landing-contact-*.png` |
| V6 | `sendEmail` com `RESEND_TOKEN=""` e `RESEND_FROM=""` | **não lançou**; retornou `{"sent":false,"reason":"not-configured"}` e imprimiu **uma** linha: `[email] skipped template=contact reason=not-configured locale=es`. Sem destinatário, sem `replyTo`, sem assunto, sem corpo. Também confirma o `locale` viajando ponta a ponta | saída de terminal |

**Light/dark/mobile:** o preview de e-mail não usa o tema do design system (a marca é hex por
necessidade — achado A3), então light/dark não se aplica a V1–V4; o viewport mobile foi conferido em V2b.
A landing (V5) foi conferida em dark **e** light.

### Armadilha que custou tempo — vale para quem repetir a validação

Um `email dev` anterior **continuou vivo** na 3003; o segundo subiu na 3004 avisando
`Port 3003 is already in use`. Resultado: a 3003 seguiu servindo módulos em cache de antes da edição do
`brand.ts` e o V4 pareceu falhar em 3 dos 6 wrappers — **sintoma de processo órfão, não de código**.
Matando o processo e subindo um único servidor, todos os 9 previews acompanham `brand.ts`.
Antes de concluir que o preview está errado: `lsof -ti:3003`.

### Fora do escopo, observado em V5

O overlay de dev da `apps/web` acusa **5 issues** em `/contact` nos 3 idiomas: erros de hidratação
`<a> cannot be a descendant of <a>` vindos do `NavigationMenu` do header (radix). **Pré-existente** — esta
entrega não toca componente nenhum da landing.

## 8. Lacunas de teste conhecidas (para o `/test`)

1. **`resolveLocale` não tem teste próprio** em `@repo/internationalization`; só é exercitado
   indiretamente pelos 4 casos de fallback de `sendEmail`. Foi código *movido*, não escrito — mas agora é
   API pública do pacote e merece caso direto (incluindo `NEXT_PUBLIC_DEFAULT_LOCALE` inválido).
2. **Os 6 wrappers de `previews/` não têm asserção** de que cada um passa o `locale` certo. Hoje isso só é
   garantido pelo olho (V3). Um teste que importe os 6 defaults e cheque a copy renderizada fecharia.
3. **`EmailLayout` com `logoUrl` preenchido nunca é renderizado em teste** — `brand.ts` sai com `""`, então
   o ramo `<Img>` é código não coberto.
4. **A action da `apps/web` é testada com `getDictionary` mockado**; ninguém prova que o cookie `x-locale`
   gravado por `apps/web/proxy.ts:92,96` chega mesmo ao `sendEmail` numa requisição real.
5. **`isEmailEnabled` não tem consumidor** no código — está coberto por teste, mas nada o chama.
6. **Fora do alcance do Vitest** (fica para o olho): fidelidade em Outlook/Gmail/Apple Mail, dark mode do
   cliente de e-mail, entregabilidade/SPF/DKIM. É o motivo de o preview ser o instrumento de revisão.

## 9. O que o fork configura (sem variável nova)

`RESEND_FROM`/`RESEND_TOKEN` já existem nos 3 `.env.example` e deixam de ser decorativas. Custo manual
herdado: conta no Resend, **domínio verificado com SPF + DKIM** e `RESEND_FROM` num remetente daquele
domínio. Depois: editar `packages/email/brand.ts` e traduzir
`translations/packages/email/index.ts` (os valores entregues são exemplos neutros).
