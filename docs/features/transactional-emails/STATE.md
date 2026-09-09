---
slug: transactional-emails
title: E-mails transacionais traduzidos
task: -
spec: transactional-emails
branch: email/feat/transactional-emails
epic: -
updated: 2026-09-09 02:31
---

# Pipeline — E-mails transacionais traduzidos

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-09 00:57 | analyze/plan.md | Plano em 10 commits na ordem `internationalization` (ramo `packages.email` + `resolveLocale` + subpath no `exports`) → `packages/email` (keys, cliente lazy, layout, marca, fachada `sendEmail`, 3 templates, suíte nova) → `apps/web` (action de contato) → docs, com **4 achados que mudam o desenho e não estavam na spec**: 🔴 **`new Resend(undefined)` LANÇA** (`resend@6.2.2 dist/index.js:501-511`) e `packages/email/index.ts:4` constrói o cliente **no topo do módulo** — num fork sem `RESEND_TOKEN` (o que os 3 `.env.example` distribuem) **importar `@repo/email` já é 500**, ou seja o sinal de pronto `:83` da spec é falso hoje; 🔴 a action de contato é **código morto que nunca poderia ter enviado** por 3 razões independentes (zero chamadas no repo; os 4 campos da maquete `date/firstname/lastname/resume` não batem com `name/email/message`; e `apps/web/env.ts:22` tem `skipValidation: true`, que faz o t3-env **descartar os `extends`**, então `env.RESEND_FROM` é sempre `undefined` e `actions/contact.tsx:25` **sempre lança**); 🟡 os tokens do design system são **inutilizáveis em e-mail** (`globals.css:16-17,112-113` é tudo `oklch()` + `var()`, que cliente de e-mail não resolve) — a marca precisa de arquivo próprio em hex; 🟢 **o teste de paridade cobre o ramo novo com zero alteração** (`parity.test.ts:15-22,49-53` varre `globalTranslations` recursivamente, sem lista fixa de ramos), então o item 3 do corte sai de graça pendurando `packages.email` em `translations/packages/index.ts`. **8 decisões de arquitetura tomadas**: seta `@repo/email → @repo/internationalization` sem ciclo (precedente `auth`/`design-system`), `Locale` reaproveitado de `utils.ts:3-5` (nenhum union novo), cliente lazy + `z.preprocess` vazio→ausente **copiando literalmente o precedente do `ARCJET_KEY`** (`security/keys.ts:4-15`) e removendo o `skipValidation` que hoje **afrouxa** a validação, log herdando o formato do `api-hardening` (`proxy.ts:41-49` — linha única, `[email]`, `chave=valor`, **sem destinatário**) e logando **toda** tentativa pulada como o `logBlocked` faz, retorno como união discriminada nos moldes do `RateLimitResult`, `EmailTemplate<TData>` por descritor em vez de união fechada (fork adiciona template sem editar `send.ts`), e o subpath `./translations/global` no `exports` do i18n como **requisito do item 5** (o preview do React Email resolve por Node e honra o `exports` map — sem isso a 3003 quebra). **N/A explícito e justificado**: Firestore, `@repo/sdk`, `apps/app`, rota/guard/schema na `apps/api` e `apiErrors` (falha de envio é evento de log, não `error.code`). **10 perguntas em aberto**, todas com recomendação default |
| develop | done    | 2026-09-09 01:28 | develop/handoff.md | Slice implementado na ordem do plano e **os 3 gates fecham**: `pnpm check` 0 erro em 425 arquivos, `pnpm turbo run lint typecheck test` **23/23 tasks** (o 22 → 23 previsto, task nova `@repo/email#test` com **64 casos** em 3 arquivos), paridade i18n verde — e **provada por negação**: removi `packages.email.welcome.cta` só do `en` e o `parity.test.ts` acusou `en faltando: packages.email.welcome.cta` sem uma linha de alteração no teste (achado A4 confirmado). Entregue: ramo `packages.email` com **19 chaves-folha × 3 idiomas = 57 valores** (contagem conferida em runtime), `resolveLocale` promovido de `client.ts` para `utils.ts` e subpath `./translations/global` no `exports`; em `packages/email` o **`new Resend()` de topo de módulo morreu** (cliente lazy) e o `keys.ts` passou a tratar `""` como ausente **sem** `skipValidation` — o que **aperta** a validação (token malformado agora reprova no boot, coberto por teste), com `pnpm --filter {api,app,web} build` passando e a `api` (cujo `.env` tem `RESEND_*=""`) servindo de prova real do R3; mais `brand.ts` em hex, `interpolate.ts` (primeira interpolação do repo), `EmailLayout`+`ActionButton`, os 3 templates (`welcome`, `action-link` com slug `confirmAccess`, `contact` migrado) e os 6 wrappers de idioma; a action de contato da `apps/web` caiu de 44 para 25 linhas (sem `try/catch`, sem `parseError`, **sem `@/env`** — contorno do Q10) e passou a sempre retornar sucesso. **Validação visual completa no preview da 3003**: V1–V6, 9 telas (3 templates × 3 idiomas) + mobile, e o **V4 provou o sinal de pronto `:80`** — trocar `name`/`primaryColor` em `brand.ts` mudou os 3 templates e os 6 wrappers de uma vez; V5 confirmou a landing `/contact` intacta em pt-br/en/es, dark e light; V6 mostrou a linha real `[email] skipped template=contact reason=not-configured locale=es` **sem destinatário, assunto ou corpo**, com a operação retornando `{sent:false,reason:"not-configured"}` em vez de lançar. **5 desvios**, todos consequência de lint ou de copy — o maior é que `send.ts`/`resendClient.ts` **não existem**: o Biome deste repo trata `lint/performance/noBarrelFile` como **erro** e ele dispara em qualquer `export … from`, então a fachada inteira vive em `index.ts` (mesma forma de `packages/security/index.ts`), o que de quebra elimina o ciclo `index ↔ send`. **Armadilha registrada**: um `email dev` órfão segurando a 3003 fez o V4 parecer quebrado em 3 wrappers (o segundo servidor subiu na 3004 em silêncio) — antes de culpar o código, `lsof -ti:3003` |
| review  | done    | 2026-09-09 02:31 | review/review.md | Diff revisto inteiro e **os números do `/develop` reconferidos por reexecução** (`pnpm check` 425/0 · `pnpm turbo run lint typecheck test --force` **23/23 sem cache** · 64 + 27 + 11 testes), com a paridade i18n **provada por negação por mim** (removi `packages.email.welcome.cta` do `en` → `[globalTranslations] en faltando: …`; restaurado) e o desvio D-1 do handoff **provado em vez de aceito** (escrevi um `export … from` e o Biome reprovou com `lint/performance/noBarrelFile`, então um barril quebraria o `pnpm check` de fato; o único ciclo é `templates ↔ preview-data` e é só de tipo). **1 achado 🔴 corrigido**: `RESEND_FROM` recusava `Acme <hi@acme.com>` — **a forma que a documentação do Resend usa** — e, sem o `skipValidation`, `keys()` passou a validar no boot dos **3** apps (o `email()` é avaliado ansiosamente em `apps/{api,app,web}/env.ts`, e o `skipValidation` da app **não** protege), então um fork que copiasse o quickstart do provedor derrubaria tudo no boot; o schema agora aceita as duas formas e continua recusando lixo (`not-an-address` e `Acme <not-an-address>` reprovam, `""` segue sendo ausente) — medido antes e depois. Mais 2 correções sem mudança de comportamento no `index.ts` (`hasRecipient` virou type predicate, eliminando o `to as string | string[]`; `keys()` passou de 2 chamadas por envio para 1) e o `specs/BACKLOG.md` alinhado à spec do mesmo push (dizia `approved`/`in-progress: 0` enquanto o frontmatter já estava `in-progress`). **Validação visual refeita do zero**: 9 combinações template × idioma no preview da 3003, mobile, e o **sinal de pronto `:80` provado por medição** (troquei `brand.ts` para Northwind/#7c3aed → nome mudou nos 3 templates e o botão foi para `rgb(124, 58, 237)` por `getComputedStyle`; `brand.ts` restaurado byte a byte), mais a landing `/contact` em light, dark e mobile nos 3 idiomas. **Achado novo da validação**: cliquei no "Enviar" da landing e **nada acontece** — sem requisição, sem toast, `0` linhas `[email]` no log —, ou seja o único consumidor de produção da feature é inalcançável pela UI (Q4); e o rodapé "você tem uma conta em {brand}" também é aplicado ao e-mail de **contato**, que vai para o dono do site. **6 decisões em aberto**, a primeira sendo a branch. **2ª passada (02:20, depois do `/test`)**: fechei as **2 FALHAs** que ele mediu como corrigíveis. (a) **C6a — o rodapé mentia no e-mail de contato**: `EmailLayout` ganhou `footerNote?: string` **opcional** (quem não passa nada não muda de comportamento — o `layout.test.tsx` do QA, que renderiza sem a prop, prova isso sozinho), o `contact` passa o seu, e a chave `contact.footerNote` entrou nos 3 idiomas pela `/i18n-sync` reusando o placeholder `{brand}` que já existia, então o `emailCopy.test.ts` seguiu verde sem alteração. Reescrevi os **3 casos que asseveravam o comportamento errado** — `templates.test.tsx` foi de 23 para **32**: 9 de marca/assinatura/`lang`, 6 garantindo que `welcome`/`action-link` **mantêm** o rodapé de conta e 3 exigindo que o `contact` traga o seu **e não contenha** o de conta (guarda de regressão que antes não existia). (b) **Achado novo do QA — `hasRecipient` repassava os brancos**: **reproduzi antes de corrigir** (`["", "owner@acme.com", "   "]` chegava intacto ao `emails.send`, e o Resend recusa a mensagem **inteira** quando um endereço é inválido — e-mail perdido em silêncio); virou `cleanRecipients`, que apara, filtra e devolve `null` quando não sobra ninguém, com bônus de aparar também o destinatário único. O teste de caracterização que **fixava o bug** (`"forwards a partially blank list … untouched"`) foi reescrito para asseverar o conserto. **Revalidação visual na 3003**: rodapé novo nas 3 telas de `contact` e o **antigo intacto** em `welcome`/`action-link`, com o texto extraído de dentro do iframe. Gates remedidos com a suíte do QA dentro: `pnpm check` **430/0**, `turbo … --force` **23/23 sem cache**, `pnpm test` do root **573** (os 563 dele +10 meus), `@repo/email` **7 arquivos/131**, i18n **27**. **Não** mexi no formulário-maquete (C4), no `provider-error` (D-4, risco de PII) nem no `supportEmail` (D-5) — os três vão como pergunta. **D-2 sai da lista: 5 decisões em aberto** · **12 commits feitos** em `email/feat/transactional-emails` (A1–A11 + B1 da auditoria), branch renomeada de `next-spec-task`, **nada pushado** |
| test    | done    | 2026-09-09 02:05 | test/criterios-aceite.md | **+73 testes** e os gates todos verdes por reexecução: `pnpm check` **430/0**, `pnpm turbo run lint typecheck test --force` **23/23 sem cache** e o `pnpm test` do root — o que gateia o `turbo build` — em **9/9 workspaces, 563 testes** (490 antes); `@repo/email` foi de 3 arquivos/64 casos para **7/121** e o i18n de 11 para **27**. Criei **5 arquivos** para as lacunas que o `/develop` e o `/review` deixaram listadas, e **provei cada um por mutação em vez de aceitar que passa**: `credentials.test.ts` (25) cobre o **🔴 que o review corrigiu e ninguém testava** — reverti o `keys.ts` para a validação antiga e exatamente os 4 casos de `Acme <hi@acme.com>` falharam, a regressão que derrubaria o boot dos 3 apps; `logPrivacy.test.ts` (8) exige, nos **5** caminhos de falha, uma única linha no formato fixo **sem `@`, sem nome, corpo ou assunto** e silêncio em `error/log/info/debug`, com o erro do provedor construído para vazar (`delivery to jane.smith@… failed: <corpo>`) — pôr um `console.error(error)` no `catch`, que é o que a recomendação D-4 faria sem cuidado, **quebra o teste**; `previews.test.tsx` (19) fecha as 9 combinações template × idioma que só o olho garantia (trocar `locale="es"` por `"en"` num wrapper falha); `layout.test.tsx` (5) renderiza o ramo `<Img>` que era código morto em teste (`brand.ts` sai com `logoUrl:""`); e `resolveLocale.test.ts` (16) cobre o código **movido** que virou API pública, incluindo `NEXT_PUBLIC_DEFAULT_LOCALE` inválido/vazio/com caixa errada. Todos os arquivos mutados restaurados e conferidos (`diff` idêntico, diffstat inalterado, `brand.ts` por **MD5**) — **zero linha de produção alterada por mim**. **e2e na 3003 e na 3001**, `agent-browser` em sequência, 13 prints em `test/e2e/`: as 9 telas de template × idioma com o texto extraído de dentro do iframe, mobile **sem overflow** (`scrollWidth 360 = clientWidth 360`), o **sinal `:80` provado por medição** (`brand.ts` → Northwind/`#7c3aed` mudou os 3 templates **e** os wrappers, botão em `rgb(124,58,237)` por `getComputedStyle`) e o **sinal `:83` provado em runtime** — subi a `web` com `RESEND_TOKEN=""`/`RESEND_FROM=""` e a `/pt-br/contact` respondeu **HTTP 200**, tendo eu verificado à parte que o `@next/env` respeitou os vazios do shell para o teste não mentir. **Reproduzi por conta própria os 2 🟡 que o review deixou em aberto**: cliquei em "Enviar" na landing e houve **0 requisição, 0 linha de log, nenhuma navegação** (a action é inalcançável pela UI), e o rodapé "você tem uma conta em {brand}" está mesmo no e-mail de **contato**, que vai para a caixa do dono do site. **1 achado novo 🟢**: `hasRecipient` exige um destinatário não-branco mas repassa a lista **com** os brancos (`["", "owner@…"]` chega assim ao provedor, que recusa a mensagem inteira). Veredito: **6/6 itens do corte entregues** (A6 PARCIAL só pelo `reason=provider-error` indistinguível) e **3/5 sinais PASS**; os 2 PARCIAL dependem de humano — envio real exige domínio com SPF/DKIM (roteiro M1–M4 nos critérios) e o formulário-maquete não dá caminho manual. **Nada bloqueia os commits**; os 5 arquivos novos precisam entrar no A7/A2 do plano de commits |
| observe | done    | 2026-09-09 02:17 | observacao.md   | Forma única e traduzida de enviar e-mail, com marca em um lugar só, preview nos 3 idiomas |

## Notas

### Origem

- **Spec**: `specs/transactional-emails.md` (`status: approved`, `value: alto`, `effort: M`,
  `audience: produto`, `depends_on: []`, `mode: ambos`, `updated: 2026-09-09`). Problema, evidência de
  mercado e corte de MVP são decisão de produto tomada — o plano responde só ao *como*.
  **Não editar a spec**: arquivá-la em `docs/features/transactional-emails/spec.md` é do `/spec --sync`.
- Nota de pesquisa citada pela spec: `specs/research/saas-starter-feature-benchmark.md` — "i18n real
  4/10: a armadilha recorrente é traduzir a UI e esquecer e-mails transacionais e mensagens de erro da
  API". O repo já resolveu a segunda metade (`apiErrors` por `error.code`).
- Nenhum card, wiki, Figma ou print. **Referências não lidas: nenhuma.**

### Reconferência das refs da spec

Todas reabertas em 2026-09-09 e **confirmadas**: `packages/email/index.ts:1-4` (4 linhas, só o cliente),
`templates/contact.tsx:27,33,36` (copy inglesa literal), `keys.ts:7-8,14`, `apps/email/package.json:7`
(`--dir ../../packages/email/templates --port 3003`), `translations/global.ts:5-20` (3 ramos, nenhum de
e-mail), consumidor único em `apps/web/.../actions/contact.tsx:3-4,35`.

**Uma precisão**: a spec (`:26`) atribui o assunto literal ao template; ele está na **action**
(`actions/contact.tsx:32`, `"Contact form submission"`). Não muda o corte. Spec não editada.

### Achados novos (para o `/spec --sync`, não corrigidos nem contornados aqui)

- 🔴 **`apps/web/env.ts:22` (`skipValidation: true`) torna todo `extends` invisível em runtime** — mesma
  causa raiz já provada no `api-hardening`. Efeito específico desta feature: `env.RESEND_FROM` é
  `undefined` mesmo com `.env` correto. Contornado (as chaves passam a ser lidas dentro do
  `@repo/email`), **não corrigido** — o raio é header/CTA/pricing da landing inteira. → Q10.
- 🟡 **O formulário de contato da landing é uma maquete que não envia nada**: botão sem handler
  (`contact-form-client.tsx:139-145`), sem `<form>`, e campos (`date`, `firstname`, `lastname`,
  `resume`) que não correspondem a nada. Bug de produto pré-existente, independente desta spec. → Q4.
- 🟡 **`packages/email/package.json` não tem `main`/`exports`**: `@repo/email`, `@repo/email/keys` e
  `@repo/email/templates/contact` só resolvem pelo alias TS `@repo/*` → `../../packages/*`. Não corrigir
  agora (risco de quebrar imports por ganho zero), mas é dívida real.
- 🟡 **`apps/app/env.ts:1` importa `@repo/email/keys` sem `apps/app/package.json` declarar `@repo/email`**
  — resolve por hoisting do pnpm. Mesma classe do achado do `api-hardening` sobre `@repo/analytics`.
- 🟡 `packages/shared/utils/helpers/formattedError.ts:3` importa o dicionário por caminho **relativo**
  (`../../../internationalization/translations/global`) justamente porque o subpath não existe no
  `exports`. O commit 2 deste plano legitima o deep import; a limpeza do `formattedError` fica fora de
  escopo.
- ⚪ `apps/api/(shared)/lib/cors.ts` allow-lista um header `"n"` que nenhum código do repo envia nem lê
  (o cookie de locale é `x-locale`, gravado em `apps/web/proxy.ts:92,96`). Resíduo.

### Achados do `/develop` (2026-09-09)

- 🟡 **`@repo/internationalization` tem `utils.ts` e `utils/` convivendo**, e o caminhador de dependências
  do React Email resolve o diretório: o preview da 3003 imprime em loop
  `Could not find index file for directory at .../internationalization/utils`. **Nada quebra** (o
  `exports` map resolve o arquivo e os 9 previews renderizam), mas o log fica sujo. Limpeza fora de
  escopo: `utils/index.ts` ou renomear `utils/cookies.ts`.
- 🟡 **O Biome deste repo trata `lint/performance/noBarrelFile` como erro** e ele dispara em *qualquer*
  `export … from`, não só em arquivos 100% de reexport. Consequência prática para todo pacote novo:
  **não existe `index.ts` barril fora de `packages/design-system/components/ui`** (excluído no
  `biome.jsonc:47`). Por isso a fachada de e-mail é um módulo real, não um barril.
- ⚪ A landing `/contact` acusa 5 erros de hidratação (`<a>` dentro de `<a>`) vindos do `NavigationMenu`
  do header. **Pré-existente**, independente desta spec.

### Decisão do modo autônomo (2026-09-09)

O usuário pediu o pipeline inteiro de uma vez, com as perguntas guardadas para o fim. **As 10 perguntas em
aberto seguiram a recomendação default e o `/develop` partiu com elas** — nenhuma foi ratificada por ele.
Todas são reversíveis e independentes: Q4/Q6/Q10 são decisões de **não fazer**, Q5/Q7/Q9 trocam-se numa
linha, Q2/Q3/Q8 são aditivas. As duas que mais pedem ratificação são **Q4** (o formulário da landing segue
maquete que não envia) e **Q6** (`welcome` e `action-link` ficam sem gatilho no código).

### Restrições de processo

- **Nada implementado.** Esta etapa é análise/plano; nenhum arquivo em `apps/` ou `packages/` foi tocado.
- **Nenhuma branch criada, nada commitado.** A branch atual é `cheyenne` (não protegida). Quem nomeia e
  cria branch é o `revisor-codigo`.
- **Setup de teste novo**: `packages/email` não tem `test`, nem `vitest`, nem config — ganha os três
  (mesmo movimento de `packages/security` no `api-hardening`). O turbo passa de **22 para 23 tasks** em
  `pnpm turbo run lint typecheck test`, que é exatamente a linha que o CI roda.
- **Gotcha de setup a não descobrir no meio**: `packages/email/tsconfig.json` estende `nextjs.json`, que
  traz `"jsx": "preserve"`; o esbuild do Vitest não compila `.tsx` assim. O `vitest.config.mts` novo
  precisa de `esbuild: { jsx: "automatic" }`.
- **Não adicionar `RESEND_*` ao `turbo.json`**: `lint`/`typecheck`/`test` têm `env: []` de propósito.
- **Validação visual é obrigatória** (regra de ouro 11) e aqui o gate real é o **preview na porta 3003**:
  9 telas (3 templates × 3 idiomas) + a prova de que editar `brand.ts` muda os três de uma vez
  (sinal de pronto `:80`) + a landing `/contact` como controle negativo. Roteiro V1–V6 em
  `analyze/plan.md` §8. Rodar `agent-browser` **em sequência**.

### Ordem de commit (do plano, §11)

`internationalization` (ramo `packages.email` → `resolveLocale`/`exports`) → `email` (keys+cliente lazy →
fachada+layout → templates → contact migrado → testes) → `web` (action → teste) → `docs(features)`.
Um commit por pacote/app, ordenado por dependência; SDK e API são N/A.

### O que o fork precisa configurar (pós-entrega)

Nenhuma variável nova. `RESEND_FROM`/`RESEND_TOKEN` já existem nos 3 `.env.example` e deixam de ser
decorativas. Custo manual herdado, que a spec já registra (`:71-72`): conta no Resend, **domínio
verificado com SPF + DKIM** (passo de DNS, sem contorno) e `RESEND_FROM` num remetente daquele domínio.
Depois: editar `packages/email/brand.ts` e traduzir `translations/packages/email/index.ts` (os valores
entregues são exemplos neutros).
