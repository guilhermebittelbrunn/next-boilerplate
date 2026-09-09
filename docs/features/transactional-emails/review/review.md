# Review — E-mails transacionais traduzidos

> Revisão do diff completo antes dos commits. **Nada commitado, nada pushado** — as correções abaixo
> estão no working tree para o usuário conferir no `git diff`.
>
> **Duas passadas:** a primeira antes do `/test`; a segunda depois dele, fechando as 2 FALHAs que ele
> mediu (uma era um 🟡 meu que eu havia deixado como decisão) — ver **§3b**. O plano de commits do **§9**
> já acomoda os 5 arquivos de teste que o QA acrescentou.

## 1. Branch

| campo | valor |
|---|---|
| branch atual | `next-spec-task` — **não protegida**, **zero commits próprios** (está exatamente em `920ef6c`, o `origin/main` atual; o `main` local está 3 atrás) |
| campo `branch` do `STATE.md` | estava `cheyenne` — isso é o nome do **workspace do Conductor**, não da branch. **Corrigido** |
| branch proposta | `email/feat/transactional-emails`, criada **a partir da atual** (`git switch -c email/feat/transactional-emails`) |
| criada? | **não** — ver "Decisões em aberto" D-1 |

`next-spec-task` foi criada para o `/spec --sync`, não para esta feature: o nome não descreve a entrega e
não segue `<project>/<type>/<title>`. Como ela não tem nenhum commit próprio nem remoto, trocar de branch
é gratuito e não perde nada. O único motivo para não decidir sozinho é o Conductor, que amarra workspace a
branch.

## 2. Achados

| sev | arquivo:linha | problema | ação |
|---|---|---|---|
| 🔴 | `packages/email/keys.ts:18-21` (antes da correção) | `RESEND_FROM` só aceitava endereço nu. A forma `Acme <hi@acme.com>` — **a que a documentação do Resend usa** — reprovava o schema, e como o `skipValidation` saiu, `keys()` passou a validar **em todo boot dos 3 apps** (`email()` é chamado com avaliação ansiosa em `apps/{api,app,web}/env.ts`, e o `skipValidation` da app **não** protege). Fork que copia o quickstart do provedor derruba os 3 apps no boot | **corrigido** |
| 🟡 | `packages/email/index.ts:97` (antes) | `to: to as string | string[]` — cast para contornar o `hasRecipient` devolver `boolean` em vez de type predicate | **corrigido** |
| 🟡 | `packages/email/index.ts:31,82` (antes) | `keys()` chamado 2× por envio (uma no `getResendClient`, outra para o `from`); cada chamada revalida o schema inteiro e é mais um ponto que pode lançar | **corrigido** |
| 🟡 | `packages/email/components/layout.tsx:84-87` | o rodapé "Você recebeu este e-mail porque tem uma conta em {brand}" é aplicado **também ao `contact`**, que vai para a caixa do dono do site. O dono não "tem uma conta" no próprio produto — a copy mente nesse template. Confirmado nas 3 telas de `contact` (pt-br/en/es) | **corrigido na 2ª passada** (era D-2; o `/test` mediu como **FALHA C6a**) |
| 🟡 | `packages/email/index.ts:51-58` (antes) | `hasRecipient` exigia **um** destinatário não-branco mas **repassava a lista inteira**: `["", "owner@acme.com"]` chegava com o branco ao `emails.send`, e o Resend recusa a mensagem **inteira** quando um endereço da lista é inválido. Guard com falso positivo → e-mail perdido em silêncio, exatamente o modo de falha que a spec existe para evitar. Achado do `/test`; **reproduzi antes de corrigir** (`result={"sent":true} to=["","owner@acme.com","   "]`) | **corrigido na 2ª passada** |
| 🟡 | `apps/web/app/[locale]/contact/actions/contact.tsx` (todo) | a action está **inalcançável**: cliquei em "Enviar" na `/contact` e não houve navegação, toast, requisição nem uma linha `[email]` no log do servidor. O formulário continua maquete (`date/firstname/lastname/resume`). O único consumidor real da feature em produção é código morto — o "sinal de pronto" do contato só é provado por teste unitário | **não corrigido** (é a decisão Q4, deliberada) → D-3 |
| 🟡 | `packages/email/index.ts:109-113` | o `catch` do provedor descarta o erro **inteiro**. A spec pede que a falha "fique registrada": fica, mas só como `reason=provider-error`. Não há como distinguir cota estourada de domínio não verificado sem reproduzir | **não corrigido** → D-4 |
| 🟡 | `packages/email/brand.ts:9` | `supportEmail: "support@example.com"` **não é lido por ninguém** (`rg supportEmail` → 1 ocorrência, a declaração). Config morta: o fork edita e nada acontece | **não corrigido** → D-5 |
| 🟡 | `specs/BACKLOG.md:33-34,44,144` | o índice dizia `approved` / `in-progress: 0` para `transactional-emails` enquanto `specs/transactional-emails.md` (no mesmo push) já está `in-progress`, e afirmava recontagem "lendo o frontmatter de cada arquivo". Índice contradizendo o arquivo que indexa | **corrigido** |
| 🟢 | `packages/internationalization/utils.ts` vs `utils/` | o preview da 3003 cospe em loop `Could not find index file for directory at .../internationalization/utils` — **reproduzido**. Renderiza tudo, mas o aviso diz "probably going to cause issues with hot reloading" | **não corrigido** (fora de escopo, já registrado) |
| 🟢 | `apps/web` `/contact` | 5 erros de hidratação (`<a>` dentro de `<a>`) no `NavigationMenu` do header, nos 3 idiomas | **pré-existente**, não tocado por este diff |

### O que auditei e está conforme

- **`pnpm check`** — 425 arquivos, 0 erro (reexecutado, sem cache).
- **`pnpm turbo run lint typecheck test --force`** — **23/23**, zero cache, antes **e** depois das minhas
  correções. `@repo/email#test` é a 23ª task, 64 casos em 3 arquivos. Números do `/develop` confirmados:
  `@repo/email` 64 · `web` 27 · `@repo/internationalization` 11.
- **Paridade i18n provada por negação por mim**: removi `packages.email.welcome.cta` só do `en` → o
  `parity.test.ts` acusou `[globalTranslations] en faltando: packages.email.welcome.cta`. Chave
  restaurada, arquivo conferido byte a byte, suíte verde de novo.
- **Desvio D-1 do `/develop` (fachada em `index.ts`, sem `send.ts`) procede** — provado, não aceito de
  palavra: escrevi um arquivo com `export { emailBrand } from "./brand";` e o Biome reprovou com
  `lint/performance/noBarrelFile`. Um barril **quebraria o `pnpm check`**. Não há ciclo em runtime: o
  único ciclo é `templates/* ↔ preview-data.ts`, e é **só de tipo** (`import type`), portanto apagado na
  compilação.
- **`pnpm-lock.yaml`**: exatamente **2** entradas novas, ambas em `packages/email` — `@repo/internationalization` (link de workspace) e `vitest ^4.0.3`. Nada além do esperado.
- **Log sem PII**: `logEmail` é o **único** ponto que escreve log no pacote. Nem destinatário, nem
  `replyTo`, nem assunto, nem corpo, **nem a mensagem do provedor** (que é justamente o que poderia trazer
  o endereço). Coberto por asserção nos dois caminhos de falha.
- **`resolveLocale` promovido** para `utils.ts`: `utils.ts` não tem import de runtime nenhum (só
  `import type` do dicionário), então nada de servidor entrou no bundle do `client.ts`. Lógica idêntica à
  que estava privada. Troca de idioma conferida no browser nos 3 idiomas.
- **Subpath `./translations/global`**: adicionar entrada a um `exports` map não remove nem altera as
  outras. Os 6 deep imports que já existiam (`apps/app` `paths.ts` ×2, `signInSchema`, `signUpSchema`,
  `userFormSchema`, `entityFormSchema`) são `import type` e continuam resolvendo; os 2 imports de valor
  (`__tests__/entityFormSchema`, `__tests__/authSchemas`) passam no turbo. Nada quebrou.
- **i18n**: 20 chaves-folha × 3 idiomas (19 + `contact.footerNote`, acrescentada na 2ª passada)
  conferidas uma a uma; estrutura idêntica, valores neutros ("Acme", `example.com`), nenhuma marca de
  produto real. **Zero string de e-mail solta em JSX** — todo texto dos 3 templates e dos 2 componentes
  vem do dicionário; o que não vem é `emailBrand.name` (constante de marca) e a URL.
- **Corte de MVP da spec**: os 6 itens entregues. O sinal de pronto ":80" (trocar marca em um lugar muda
  todos) foi **provado por mim**, não aceito do relato — ver §4.
- **Segredo**: `docs/features/transactional-emails/` não contém credencial (varri por `re_[...]` e pelo
  token real). Os `.env` com o token vivo estão cobertos pelo `.gitignore:144` e **não entram em commit
  nenhum** deste plano. ⚠️ Ainda assim: o token em `apps/{web,app}/.env` é real e agora é load-bearing —
  vale rotacioná-lo se algum dia esse arquivo escapou.

## 3. Correções aplicadas (revisar antes de commitar)

### `packages/email/keys.ts` — aceita a forma de remetente que o Resend documenta

Único ponto que muda comportamento. Antes, isto derrubava o boot dos 3 apps:

```
RESULT "hi@acme.com"                   -> ok
RESULT "Acme <onboarding@resend.dev>"  -> THROWS      ← forma do quickstart do Resend
RESULT "Acme Inc <hi@acme.com>"        -> THROWS
```

Depois (medido, mesmo probe):

```
RESULT "hi@acme.com"                   -> ok (hi@acme.com)
RESULT "Acme <onboarding@resend.dev>"  -> ok (Acme <onboarding@resend.dev>)
RESULT "Acme Inc <hi@acme.com>"        -> ok (Acme Inc <hi@acme.com>)
RESULT "not-an-address"                -> THROWS      ← lixo continua reprovando
RESULT "Acme <not-an-address>"         -> THROWS
RESULT ""                              -> ok (undefined)   ← vazio continua sendo "ausente"
```

O aperto de validação que a entrega quis (token malformado reprova no boot) **fica de pé**; o que sai é a
recusa de um valor que o provedor considera correto. `from` vai direto para o `client.emails.send`, então
a forma com nome de exibição funciona no envio real.

### `packages/email/index.ts` — três ajustes sem mudança de comportamento

1. `hasRecipient` virou type predicate (`to is string | string[]`) → o `to as string | string[]` do
   `emails.send` **sumiu**.
2. `keys()` passa a ser chamado **uma vez** por envio (`const { RESEND_FROM: from, RESEND_TOKEN: token } = keys()`);
   `getResendClient` recebe o token em vez de reler o env.
3. Consequência de (2): um ponto a menos onde uma configuração malformada pode lançar dentro do `sendEmail`.

### `specs/BACKLOG.md` — índice alinhado à spec do mesmo push

Contadores `approved 1 → 0` / `in-progress 0 → 1`, célula de status de `transactional-emails`
`approved → in-progress`, e a frase "está no `/analyze`" (estado transitório já vencido) trocada por
"entrou nela".

---

## 3b. Correções da 2ª passada (depois do `/test`)

O `/test` mediu 19 critérios: 15 PASS, 3 PARCIAL, 2 FALHA. As duas falhas eram a copy do rodapé (que eu
tinha deixado como decisão D-2) e o consumidor inalcançável (C4, decisão de produto que **não** foi
mexida). Mais um achado novo do QA, no guard de destinatário.

### Rodapé próprio para o e-mail de contato — FALHA C6a fechada

O QA extraiu o texto renderizado e a frase estava lá nos 3 idiomas, num e-mail cujo destinatário é o dono
do site. Corrigido em 4 arquivos:

| arquivo | mudança |
|---|---|
| `packages/internationalization/translations/packages/email/index.ts` | **+1 chave-folha** `contact.footerNote` nos 3 idiomas (via `/i18n-sync`), valores neutros e usando o placeholder `{brand}` que já existia — o `emailCopy.test.ts`, que só aceita `brand`/`name`/`email`/`url`, continua verde sem alteração |
| `packages/email/components/layout.tsx` | `EmailLayout` ganhou `footerNote?: string`. **Opcional**: sem a prop, o rodapé padrão continua saindo. Quem não passa nada não muda de comportamento |
| `packages/email/templates/contact.tsx` | passa o seu `footerNote` interpolado |
| `packages/email/__tests__/templates.test.tsx` | os 3 casos que **asseveravam o comportamento errado** foram reescritos (abaixo) |

Texto entregue, por idioma:

- pt-br — "Você recebeu este e-mail porque este é o endereço de contato de {brand}."
- en — "You received this email because this is the contact address for {brand}."
- es — "Recibiste este correo porque esta es la dirección de contacto de {brand}."

### Guard de destinatário: brancos filtrados, não só tolerados — achado novo do QA

**Reproduzi o bug antes de mexer**, com o `resend` mockado:

```
antes:  to=["", "owner@acme.com", "   "]  → chega ao emails.send como ["","owner@acme.com","   "]
depois: to=["", "owner@acme.com", "   "]  → chega como ["owner@acme.com"]
```

`hasRecipient` (predicado booleano) virou `cleanRecipients`, que **normaliza e devolve** o destinatário:
apara os brancos, descarta os vazios e responde `null` quando não sobra ninguém — aí o caminho
`invalid-recipient` continua igual. Como bônus, um único destinatário com espaço em volta
(`"  owner@acme.com  "`) também passa aparado, em vez de ir com o padding para o provedor.

### Testes que ajustei (e por quê)

Os dois arquivos abaixo **asseveravam o comportamento defeituoso**, então o teste é que estava errado:

| arquivo | antes | depois |
|---|---|---|
| `__tests__/templates.test.tsx` | um `it.each` de 9 casos exigia o rodapé de conta em **todos** os templates | dividido em 3 blocos: **9 casos** de marca/assinatura/`lang` (inalterado), **6 casos** garantindo que `welcome` e `action-link` mantêm o rodapé de conta, e **3 casos** exigindo que o `contact` traga o seu **e não contenha** o de conta. Cobertura equivalente + guarda de regressão: 23 → **32 casos** no arquivo |
| `__tests__/logPrivacy.test.ts` | `"forwards a partially blank list to the provider untouched"` — teste de caracterização que fixava o bug | `"drops the blanks of a partially blank list before sending"` (lista mista, incluindo um endereço com padding) + `"trims a single recipient…"`. O caso irmão, que já recusava a lista **só** de brancos, ficou intacto |

Nenhum outro teste do QA foi tocado: `credentials`, `previews`, `layout` e `resolveLocale` passaram sem
alteração — inclusive `layout.test.tsx`, que renderiza o `EmailLayout` **sem** a prop nova e portanto
prova sozinho que o padrão não regrediu.

**Nenhum outro arquivo foi tocado por mim.** `brand.ts` e o dicionário de e-mail foram alterados
temporariamente durante a validação (prova da marca e prova por negação da paridade) e **restaurados
byte a byte** — conferido com `diff`.

## 4. Validação visual — feita por mim, não herdada

Preview do React Email na **3003** (`pnpm --filter email dev`; `lsof -ti:3003` antes: livre) e landing na
**3001**. `agent-browser` **estritamente em sequência**. Screenshots em `review/screenshots/`.

| # | percorrido | observado |
|---|---|---|
| R1 | `localhost:3003` | lista com `action-link`, `contact`, `welcome` + a pasta `previews/`. Nenhum arquivo não-template (`brand`, `copy`, `template`, `interpolate`, `preview-data`, `components/`) aparece |
| R2 | `welcome`, `action-link`, `contact` em pt-br | layout comum idêntico nos 3: marca no topo, card com borda, `Hr`, assinatura "Equipe Acme", rodapé centralizado. `action-link` mostra botão **e** a URL em texto |
| R3 | os 6 wrappers `*.{en,es}` | as **9 combinações** (3 templates × 3 idiomas) conferidas — 3 por screenshot, 6 por extração do texto renderizado dentro do iframe. Cada uma integralmente no idioma certo, **sem sobra de pt-br** |
| R4 | mobile 390×844 no `action-link` | sem overflow horizontal; a URL longa quebra (`break-all`); botão e texto legíveis |
| R5 | **prova do sinal de pronto `:80`** | editei `brand.ts` (`Acme → Northwind`, `#18181b → #7c3aed`), recarreguei: o nome mudou no cabeçalho, na assinatura e no rodapé **dos 3 templates e dos wrappers de idioma**, e o botão do `action-link` foi para `rgb(124, 58, 237)` — medido por `getComputedStyle`, não por olho. `brand.ts` restaurado |
| R6 | `localhost:3001/{pt-br,es,en}/contact` — light, dark e mobile | landing **não regrediu**; os 3 idiomas corretos em toda a navegação (prova indireta de que o `resolveLocale` movido segue servindo o `client.ts`). Dark e mobile íntegros |
| R7 | clique real no "Enviar" da landing | **nada acontece**: sem navegação, sem toast, sem requisição, `0` linhas `[email]` no log do servidor. A action de contato é inalcançável pela UI (achado 🟡 acima) |
| R8 | boot da `apps/web` com credencial real no `.env` | sobe em 1.4s com `RESEND_FROM`/`RESEND_TOKEN` preenchidos — o `keys.ts` sem `skipValidation` não atrapalha o caso configurado |

**Light/dark/mobile:** o preview de e-mail não usa o tema do design system (marca em hex por necessidade),
então light/dark não se aplica a R1–R5; o mobile foi conferido em R4. A landing (R6) foi conferida em
light, dark **e** mobile.

### Revalidação da 2ª passada (rodapé) — 3003 de novo, `lsof -ti:3003` livre antes

| # | percorrido | observado |
|---|---|---|
| R9 | `contact` nos 3 idiomas | rodapé novo em cada um: "…porque este é o endereço de contato de Acme." · "…this is the contact address for Acme." · "…esta es la dirección de contacto de Acme." Screenshots `f1-contact-ptbr-footer.png` e `f2-contact-es-footer.png` |
| R10 | `welcome` e `action-link` (pt-br, es, en) | **rodapé de conta intacto** — "…tem uma conta em Acme.", "…tienes una cuenta en Acme.", "…you have an account at Acme.". A prop nova não vazou para quem não a passa |

O texto foi extraído de dentro do iframe (últimos 95 caracteres do corpo renderizado), não lido de
screenshot — as 6 leituras estão no §3b.

## 5. Raio de impacto

| mudança de contrato | consumidores | veredito |
|---|---|---|
| `export const resend` **removido** de `@repo/email` | `rg "@repo/email"` → o único que usava era `apps/web/.../actions/contact.tsx`, reescrito aqui | ✅ sem quebra |
| `keys()` sem `skipValidation` | `apps/api/env.ts:2`, `apps/app/env.ts:1`, `apps/web/env.ts:1` — **os 3 chamam `email()` com avaliação ansiosa**, então a validação roda no boot dos 3 independentemente do `skipValidation` de cada app | ⚠️ era o risco 🔴; mitigado pela correção do remetente |
| `@repo/email` passa a depender de `@repo/internationalization` | seta única (o i18n não importa nenhum `@repo/*`) | ✅ sem ciclo |
| `+ "./translations/global"` no `exports` do i18n | 6 deep imports de tipo em `apps/app` + 2 de valor em testes + `packages/shared/utils/helpers/formattedError.ts` (que usa caminho relativo) | ✅ aditivo, nada quebra |
| `ContactTemplate` → `contactEmail` + default `ContactEmail` | `apps/web` (action) e o preview da 3003 | ✅ ambos migrados |
| `resolveLocale` promovido para `utils.ts` | `client.ts` (mesma lógica) e agora `@repo/email` | ✅ verificado no browser |

## 6. Lacunas de teste (para o `/test` — nada criado nem rodado aqui)

> **Atualizado depois do `/test`:** os 4 primeiros itens que eu havia apontado **foram fechados** pelo QA
> (`credentials.test.ts` cobre as duas formas de remetente com prova de mutação · `resolveLocale.test.ts`
> traz 16 casos, incluindo `NEXT_PUBLIC_DEFAULT_LOCALE` inválido · `previews.test.tsx` assevera os 6
> wrappers · `layout.test.tsx` exercita o ramo `logoUrl`). Sobra o que segue.

1. **A action da `apps/web` é testada com `getDictionary` mockado**: ninguém prova que o cookie `x-locale`
   gravado por `apps/web/proxy.ts:92,96` chega ao `sendEmail` numa requisição real. Agravante: como o
   formulário é maquete (R7), **não existe caminho manual** para provar isso.
2. **`isEmailEnabled` não tem consumidor** em lugar nenhum do código — coberto por teste, chamado por
   ninguém.
3. **Envio real** (`B1` do QA, bloqueado): exige `RESEND_TOKEN` válido e domínio verificado com SPF/DKIM.
   Roteiro manual M1 em `test/criterios-aceite.md`.
4. **Fora do alcance do Vitest**: fidelidade em Outlook/Gmail/Apple Mail, dark mode do cliente de e-mail,
   entregabilidade/SPF/DKIM.

## 7. Decisões em aberto

| # | decisão | recomendação |
|---|---|---|
| D-1 | **Criar `email/feat/transactional-emails` a partir da atual, ou commitar em `next-spec-task`?** A atual não é protegida e não tem commit próprio, mas o nome é de outro escopo (`/spec --sync`) e foge do padrão `<project>/<type>/<title>` | **criar** (`git switch -c email/feat/transactional-emails`) — custo zero, nada se perde, e o PR passa a se chamar pelo que entrega. Só não fiz sozinho porque o workspace do Conductor pode amarrar-se ao nome da branch |
| ~~D-2~~ | ~~Rodapé "você tem uma conta em {brand}" no e-mail de contato~~ | **RESOLVIDO na 2ª passada** — ver §3b. `EmailLayout` ganhou `footerNote?: string`, o `contact` passa o seu, e os 3 casos que exigiam o rodapé errado foram reescritos |
| D-3 | **O formulário da landing continua maquete** (Q4 do plano, decidida sem ratificação) — a feature entrega envio de e-mail cujo único consumidor não é alcançável pela UI | aceitável **se** estiver claro que o slice de contato é prova de base, não fluxo de produto. Se não estiver, ligar o formulário é tarefa curta e faz a entrega valer o dobro |
| D-4 | **Diagnóstico do erro do provedor.** Hoje o log diz só `reason=provider-error`, então cota estourada, domínio não verificado e chave revogada são indistinguíveis (o QA mediu como PARCIAL em A6) | acrescentar `code=${error.name}` — o `name` do Resend é vocabulário fixo (`validation_error`, `rate_limit_exceeded`, `invalid_access`), **nunca** carrega endereço, ao contrário do `message`. ⚠️ **Risco de PII se feito sem cuidado**: o `logPrivacy.test.ts` do QA tem prova de mutação — um `console.error(error)` no `catch` derruba a suíte. Continua em aberto por decisão sua |
| D-5 | **`emailBrand.supportEmail` é config morta** | remover. Se a ideia era oferecer contato de suporte no rodapé, isso precisa de chave nos 3 idiomas e vira item próprio |
| D-6 | **`utils.ts` + `utils/` convivendo** no i18n polui o log da 3003 com aviso de hot reload | criar `utils/index.ts` ou renomear `utils/cookies.ts`. Fora do escopo desta entrega; vale como item do `/spec --sync` |

## 8. Gates

Remedidos **depois** da 2ª passada, com a suíte do `/test` já dentro.

| gate | comando | resultado |
|---|---|---|
| Lint/format | `pnpm check` | **430 arquivos, 0 erro** |
| CI completo | `pnpm turbo run lint typecheck test --force` | **23/23, 0 cache** |
| Raiz (gateia o `turbo build`) | `pnpm test` | **9/9 workspaces, 573 testes** — os 563 medidos pelo `/test` **+10** meus (9 casos novos em `templates.test.tsx`, +2 −1 em `logPrivacy.test.ts`) |
| Suíte do pacote | `pnpm --filter @repo/email test` | 7 arquivos, **131 testes** |
| `apps/web` | `pnpm --filter web test` | 4 arquivos, **27 testes** |
| Paridade i18n | `pnpm --filter @repo/internationalization test` | 3 arquivos, **27 testes** — verde com a chave `contact.footerNote` nova nos 3 idiomas |
| Typecheck do pacote | `pnpm --filter @repo/email typecheck` | limpo |

## 9. Plano de commits proposto

Duas unidades independentes, **nesta ordem**. Mensagens em inglês; `packages/sdk` e `apps/api` são N/A.

### Unidade A — feature `transactional-emails`

**A1 · `feat(internationalization): add the email copy branch in the three languages`**
```
packages/internationalization/translations/packages/email/index.ts
packages/internationalization/translations/packages/index.ts
```

**A2 · `feat(internationalization): expose resolveLocale and the global dictionary subpath`**
```
packages/internationalization/utils.ts
packages/internationalization/client.ts
packages/internationalization/package.json
packages/internationalization/__tests__/resolveLocale.test.ts
```
> **Decisão sobre o teste do `/test`:** `resolveLocale.test.ts` entra **aqui**, e não num
> `test(internationalization)` separado. A regra do repo é "testes acompanham o commit da funcionalidade
> que cobrem", e é exatamente este commit que torna `resolveLocale` API pública do pacote — separá-lo
> deixaria a promoção sem rede em `git bisect`. São 4 arquivos, o commit continua pequeno.

**A3 · `fix(email): validate the credentials without disabling the schema`**
```
packages/email/keys.ts
```

**A4 · `feat(email): send through a lazy client that answers instead of throwing`**
```
packages/email/index.ts
packages/email/template.ts
packages/email/interpolate.ts
packages/email/copy.ts
```

**A5 · `feat(email): add the shared layout and the brand constants`**
```
packages/email/brand.ts
packages/email/components/layout.tsx
packages/email/components/action-button.tsx
```

**A6 · `feat(email): add the welcome and action-link templates and translate the contact one`**
```
packages/email/templates/welcome.tsx
packages/email/templates/action-link.tsx
packages/email/templates/contact.tsx
packages/email/preview-data.ts
packages/email/templates/previews/welcome.en.tsx
packages/email/templates/previews/welcome.es.tsx
packages/email/templates/previews/action-link.en.tsx
packages/email/templates/previews/action-link.es.tsx
packages/email/templates/previews/contact.en.tsx
packages/email/templates/previews/contact.es.tsx
```

**A7 · `test(email): set the package suite up and cover sending, copy and templates`**
```
packages/email/vitest.config.mts
packages/email/package.json
pnpm-lock.yaml
packages/email/__tests__/sendEmail.test.ts
packages/email/__tests__/emailCopy.test.ts
packages/email/__tests__/templates.test.tsx
```

**A8 · `test(email): guard the credentials, the log privacy, the layout and the previews`**
```
packages/email/__tests__/credentials.test.ts
packages/email/__tests__/logPrivacy.test.ts
packages/email/__tests__/layout.test.tsx
packages/email/__tests__/previews.test.tsx
```
> **Decisão sobre os 4 testes do `/test`:** ficam num bloco próprio, depois do que monta a suíte. Todos são
> **rede de regressão** sobre comportamento já entregue (formatos de credencial, ausência de PII no log,
> ramo `logoUrl`, wrappers de idioma), e três deles carregam prova de mutação. Misturá-los em A7
> empurraria aquele commit para 10 arquivos e apagaria a distinção entre "a suíte que nasceu com a
> feature" e "o cerco que o QA fechou depois".

**A9 · `refactor(web): send the contact message through the shared email facade`**
```
apps/web/app/[locale]/contact/actions/contact.tsx
```

**A10 · `test(web): cover the contact action against a failing send`**
```
apps/web/__tests__/contactAction.test.ts
```

**A11 · `docs(features): transactional-emails`**
```
docs/features/transactional-emails/**
```
> Inclui `analyze/`, `develop/` (+ 18 screenshots), `review/` (+ 10 screenshots), `test/`
> (`criterios-aceite.md` + 14 prints do e2e) e o `STATE.md`. Varrido por credencial: limpo.

### Unidade B — auditoria do `/spec --sync`

**B1 · `docs(specs): archive the API hardening spec and re-audit the backlog`**
```
specs/api-hardening.md -> docs/features/api-hardening/spec.md   (rename, já staged)
specs/BACKLOG.md
specs/e2e-testing.md
specs/transactional-emails.md
```

**Título de PR sugerido:** `feat(email): translated transactional emails`

**Push:** só depois de todos os commits aprovados, e **perguntando** ao usuário
(`git push -u origin email/feat/transactional-emails`).

### Commits realizados

_(preenchido pelo orquestrador do `/review` após cada bloco aprovado)_
