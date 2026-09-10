# Critérios de Aceite (Checklist)

> Derivados dos **6 itens do corte de MVP** (`specs/transactional-emails.md:43-48`) e dos
> **5 sinais de pronto** (`:79-83`), mais os derivados que a análise acrescentou.
> Status medido nesta rodada: **PASS** · **PARCIAL** · **FALHA** · **BLOQUEADO**.
> Evidência: `test/report.md` (números) e `test/e2e/` (prints).

---

## A. Itens do corte de MVP

- [x] **A1 · Uma forma única e tipada de enviar e-mail do servidor, que recebe o idioma e resolve assunto e corpo pelo dicionário** — **PASS** (unit + rota de log)
  `sendEmail({ template, to, data, locale, replyTo })` é o único ponto de saída: recebe um
  `EmailTemplate<TData>` e devolve a união discriminada `{sent:true,id}` / `{sent:false,reason}`, sem
  jamais lançar. O assunto vem de `template.subject(emailCopy(locale), data)` — provado com `locale:"es"`,
  em que o assunto entregue ao provedor é exatamente `emailCopy("es").contact.subject` e **difere** do
  `pt-br`. Idioma ausente, `null`, `""` ou não suportado (`"fr"`) cai no padrão sem lançar, via
  `resolveLocale`, agora coberto diretamente com 16 casos (incluindo `NEXT_PUBLIC_DEFAULT_LOCALE`
  inválido, vazio e com caixa errada, que caem em `pt-br`). O tipo é fechado: um template novo entra pelo
  descritor, sem editar a fachada.

- [x] **A2 · Um layout comum (cabeçalho, rodapé, assinatura, tema) que todo template herda, para o fork trocar marca em um lugar só** — **PASS** (unit + e2e)
  `EmailLayout` carrega marca no topo, card, `Hr`, assinatura e rodapé; os 3 templates renderizados nos 3
  idiomas contêm `emailBrand.name`, a assinatura e o rodapé interpolados (9 asserções). O ramo
  `logoUrl` preenchido — que nunca era exercitado porque `brand.ts` sai com `""` — agora tem teste: com
  logo hospedado sai `<img src=… alt="Acme">`, sem logo sai o nome em texto e **nunca** um `src=""`.
  ⚠️ Ressalva de copy medida em A6/B-D2: o rodapé é o mesmo para todos, inclusive o de contato.

- [x] **A3 · Uma árvore de e-mail no `@repo/internationalization`, com paridade pt-br/en/es cobrada pelo mesmo teste determinístico que já existe** — **PASS** (paridade + valores)
  `packages.email` pendurado em `translations/packages/index.ts` nos 3 idiomas; o `parity.test.ts`
  varre `globalTranslations` recursivamente e cobriu o ramo novo **sem uma linha de alteração**. A
  paridade compara caminhos, não valores, então o `emailCopy.test.ts` fecha o buraco: nenhum valor-folha
  vazio nos 3 idiomas, `subject` e `title` não-vazios por template, e nenhum placeholder fora do conjunto
  conhecido (`brand`/`name`/`email`/`url`). Prova por negação já executada duas vezes (develop e review):
  remover `packages.email.welcome.cta` só do `en` derruba a suíte.

- [x] **A4 · Dois templates reais usando a base — boas-vindas e um de ação com link — provando o slice de ponta a ponta** — **PASS** (unit + e2e)
  `welcome` e `action-link` existem, herdam o layout e resolvem toda a copy do dicionário. O
  `action-link` mostra a URL **duas vezes** — como `href` do botão e como texto visível de fallback —,
  porque vários clientes de e-mail removem o botão; asserção explícita para os dois. O slug de ação é
  tipado (`ActionSlug = keyof EmailCopy["actionLink"]["actions"]`), então um fork acrescenta ação
  editando o dicionário, sem tocar no template.

- [x] **A5 · Todos os templates visíveis e revisáveis no preview da porta 3003, nos 3 idiomas** — **PASS** (e2e + unit)
  A lista da 3003 mostra exatamente `previews/`, `action-link`, `contact`, `welcome` — nenhum arquivo
  não-template (`brand`, `copy`, `template`, `interpolate`, `preview-data`, `components/`) vazou para a
  barra lateral. As 9 combinações (3 templates × 3 idiomas) foram abertas e o texto extraído de dentro do
  iframe: cada uma inteiramente no idioma certo, com `<html lang>` correspondente e **sem sobra** de
  outro idioma. Os 6 wrappers, que antes só o olho garantia, agora têm asserção automatizada.

- [ ] **A6 · Falha de envio não derruba a operação que a originou, e fica registrada** — **PARCIAL**
  A primeira metade é **PASS** e está exaustivamente coberta: `not-configured` (sem credencial),
  `invalid-recipient` (`null`, `undefined`, `[]`, `""`, `"   "`, lista só de brancos) e `provider-error`
  nos **dois** caminhos do `resend@6.2.2` (resposta `{error}` e exceção lançada) devolvem a união e nunca
  propagam; a action de contato responde `{}` em todos eles. O registro também é PASS e mais forte do que
  o pedido: uma única linha `[email] <evento> template=… reason=… locale=…`, sem destinatário, assunto,
  corpo nem mensagem do provedor, e **nenhum outro canal do console é usado** — asserção contra
  `warn/error/log/info/debug` de uma vez. **O que impede o PASS:** a linha diz só `reason=provider-error`,
  então cota estourada, domínio não verificado e chave revogada são indistinguíveis sem reproduzir; a
  spec pede que a falha "fique registrada" e ela fica, mas sem diagnóstico. É a decisão D-4 do review,
  em aberto.

---

## B. Sinais de pronto da spec (`:79-83`)

- [ ] **B1 · `:79` — Um e-mail disparado com locale `es` chega em espanhol, assunto incluído** — **PARCIAL / BLOQUEADO no envio real**
  A **resolução** está provada: com `locale:"es"` o assunto entregue ao provedor é o espanhol e não o
  pt-br, e o corpo renderizado é integralmente `es` nos 3 templates. O que **não** pode ser provado em
  ambiente automatizado é a *chegada*: exige `RESEND_TOKEN` válido e domínio verificado com SPF/DKIM
  (passo de DNS, sem contorno). Ver o **roteiro manual M1** abaixo — é o único item da entrega que
  depende de um humano.

- [x] **B2 · `:80` — Trocar logotipo e cor da marca em um lugar muda todos os templates** — **PASS** (e2e medido)
  Editei `packages/email/brand.ts` (`Acme → Northwind`, `#18181b → #7c3aed`) e recarreguei: o nome mudou
  no cabeçalho, na assinatura e no rodapé dos **3 templates e dos 6 wrappers de idioma**, e a cor do botão
  foi para `rgb(124, 58, 237)` — lida por `getComputedStyle`, não por olho. `brand.ts` restaurado e
  conferido por MD5 (`cd48d2fa2bf18969efbeb975ab338624` antes e depois).

- [x] **B3 · `:81` — Faltar uma chave em um dos 3 idiomas quebra o teste de paridade** — **PASS**
  Provado por negação em duas etapas anteriores com a mensagem exata
  `[globalTranslations] en faltando: packages.email.welcome.cta`, e o mecanismo é estrutural: o
  `parity.test.ts` não tem lista fixa de ramos. Nesta rodada a suíte foi reexecutada verde e ganhou 16
  casos de `resolveLocale` ao lado.

- [x] **B4 · `:82` — O preview na porta 3003 lista os templates com dados de exemplo** — **PASS** (e2e)
  Lista correta e dados de exemplo neutros (`Jane Smith`, `jane.smith@example.com`,
  `https://app.example.com/...`) vindos de `preview-data.ts`, que fica **fora** de `templates/` para não
  ser interpretado como template. Nenhum dado real, nenhuma marca de produto.

- [ ] **B5 · `:83` — Sem `RESEND_TOKEN`, o app continua funcionando e o não-envio aparece no log, não como erro 500** — **PARCIAL**
  A primeira metade é **PASS e foi provada em runtime**: subi a `apps/web` com `RESEND_TOKEN=""` e
  `RESEND_FROM=""` e a `/pt-br/contact` respondeu **HTTP 200** em 1s, sem 500 e sem banner de erro (a
  precedência do shell sobre o `.env` foi verificada à parte, para o teste não mentir). Isso fecha a
  regressão do achado A1 (`new Resend(undefined)` lançava no topo do módulo). O log
  `[email] skipped … reason=not-configured` é garantido por teste com asserção byte a byte da linha —
  mas **não há como observá-lo por um fluxo de usuário**, porque o formulário da landing não chama a
  action (ver C3). Daí o PARCIAL.

---

## C. Derivados da análise e da revisão

- [x] **C1 · Importar `@repo/email` com `RESEND_TOKEN=""` não lança, e `""` significa "ausente"** — **PASS**
  O cliente Resend passou a ser construído na primeira utilização, nunca no `import`. `""`, `"   "` e a
  variável não declarada são lidos como ausentes nas duas chaves; um valor válido com espaços em volta é
  aparado. Isso importa porque os 3 `.env.example` distribuem as chaves declaradas e vazias: copiar o
  arquivo de exemplo não pode derrubar app nenhum.

- [x] **C2 · Credencial malformada continua reprovando, e as duas formas de remetente que o provedor aceita passam** — **PASS** (regressão nova, com prova de mutação)
  Era o 🔴 do review e **não tinha teste**; agora tem 25 casos. Aceita: endereço nu, `Acme <hi@acme.com>`
  (a forma do quickstart do Resend), nome com espaços, `<hi@acme.com>` e subendereçamento. Recusa:
  `not-an-address`, `Acme <not-an-address>`, colchete não fechado, sobra depois do `>` e dois endereços
  num valor só. Token: aceita `re_…`, recusa `abc`, `RE_abc` e `abc_re_123`. **Prova de mutação**:
  revertendo o `keys.ts` para a validação anterior, exatamente os 4 casos de nome de exibição falham —
  a rede pega a regressão que derrubaria o boot dos 3 apps. Arquivo restaurado byte a byte.

- [x] **C3 · Nenhum caminho de log emite destinatário, assunto ou corpo — nem o de erro do provedor** — **PASS** (regressão nova, com prova de mutação)
  É o caminho mais fácil de vazar PII, porque a mensagem do provedor costuma **conter o endereço**. O
  teste força justamente isso (erro com `delivery to jane.smith@example.com failed: <corpo>`) e exige que
  a linha registrada case com o formato fixo, não contenha `@`, nem o nome, nem o corpo, nem o assunto —
  e que **nada** saia por `console.error/log/info/debug`. O caminho de sucesso não registra nada.
  **Prova de mutação**: acrescentando um `console.error(error)` no `catch` do provedor — que é
  exatamente o que a recomendação D-4 tentaria fazer sem cuidado — o teste falha. Arquivo restaurado.

- [ ] **C4 · A feature tem um consumidor alcançável pelo usuário** — **FALHA** (decisão Q4, deliberada)
  Preenchi Nome e Sobrenome na `/pt-br/contact` e cliquei em **Enviar**: **zero** requisições de rede,
  **zero** linhas novas no log do servidor, nenhuma navegação, nenhum toast. O formulário continua
  maquete — os campos são `date/firstname/lastname/resume`, que não correspondem ao
  `name/email/message` que a action espera, e o botão não tem handler. O único consumidor de produção da
  feature é código inalcançável; o slice de contato é provado só por teste unitário. É bug de produto
  **pré-existente** (o formulário já era maquete antes desta entrega) e foi decidido não corrigir, mas
  precisa estar explícito: a entrega é a **base**, não um fluxo de produto funcionando.

- [ ] **C5 · A landing não regride em nenhum idioma, tema ou viewport** — **PASS**
  `/contact` conferida nos 3 idiomas em **dark**, **light** e **mobile (390×844)**: layout íntegro,
  troca de idioma correta em toda a navegação — o que é prova indireta de que promover `resolveLocale`
  para `utils.ts` não regrediu o `client.ts`. Marcado sem `[x]` só por conta do ruído pré-existente
  abaixo. **Não é regressão desta entrega**: o overlay de dev acusa 5 erros de hidratação
  (`<a>` dentro de `<a>`) vindos do `NavigationMenu` do header nos 3 idiomas, e nenhum arquivo da landing
  foi tocado por esta feature.

- [ ] **C6 · Configuração morta e copy que mente para o destinatário** — **FALHA** (achados 🟡 do review, medidos aqui)
  Dois defeitos de acabamento, nenhum bloqueia a base. (a) O rodapé "Você recebeu este e-mail porque tem
  uma conta em Acme." é aplicado **também ao e-mail de contato**, que vai para a caixa do dono do site —
  extraí o texto renderizado nos 3 idiomas e a frase está lá; o dono não tem conta no próprio produto, a
  copy mente. Corrigir custa um `footerNote?: boolean` no layout e **não** exige chave de i18n nova, mas
  quebra 3 asserções que hoje exigem o rodapé em todos os templates — por isso é decisão, não conserto.
  (b) `emailBrand.supportEmail` não é lido por ninguém: o fork edita e nada acontece.

- [x] **C7 · Interpolação previsível: placeholder faltando não apaga a frase, placeholder sobrando não quebra** — **PASS**
  `{chave}` desconhecida fica **intacta** no texto (uma frase incompleta é melhor do que uma frase com
  buraco), variável sobrando é ignorada, valor vazio não quebra e a mesma chave repetida é substituída em
  todas as ocorrências. Fechando o ciclo, nenhum dos 9 previews renderizados contém `{brand}`, `{name}`,
  `{email}` ou `{url}` sobrando.

- [x] **C8 · O gate do CI continua verde e o build não fica bloqueado** — **PASS**
  `pnpm turbo run lint typecheck test --force` → **23/23 sem cache**; `pnpm test` (root, o que gateia o
  `turbo build`) → **9/9 workspaces, 563 testes**; `pnpm check` → **430 arquivos, 0 erro**;
  `pnpm --filter @repo/email typecheck` limpo.

---

## Roteiro de teste manual

Só o **M1** é obrigatório, e só porque o envio real depende de infraestrutura que nenhum ambiente
automatizado tem: conta no Resend, **domínio verificado com SPF + DKIM** e um `RESEND_FROM` daquele
domínio. Os demais são conferência de olho no que o Vitest não alcança.

> ⛔ **Nunca** cole token, endereço real ou print com credencial em arquivo versionado. Se quiser reusar
> credenciais entre rodadas, coloque-as em `.claude/dev-credentials.local.md` (fora do git).

### M1 · O e-mail em espanhol chega em espanhol, assunto incluído (sinal de pronto `:79`)

Este é o único caminho que fecha B1.

1. No painel do Resend, crie a chave e **verifique o domínio** (registros SPF e DKIM no DNS). Espere a
   propagação — sem isso o e-mail sai, mas cai em spam ou é recusado.
2. Em `apps/web/.env`, ponha `RESEND_TOKEN=re_…` e `RESEND_FROM` num remetente **daquele domínio**.
   Vale testar as duas formas aceitas: `hi@seu-dominio.com` e `Acme <hi@seu-dominio.com>`.
3. Suba a API do e-mail pelo caminho que existir no seu fork; como o formulário da landing é maquete
   (C4), o disparo precisa vir de um ponto que chame `sendEmail` — por exemplo um `node`/rota temporária
   com `locale: "es"`, `to` a sua caixa pessoal e `template: welcomeEmail`.
4. **Esperado no terminal:** *nenhuma* linha `[email]` (só falha e pulo registram) e a operação
   devolvendo `{ sent: true, id: "…" }`.
5. **Esperado na caixa de entrada:** assunto **"Bienvenido a Acme"** (não "Boas-vindas", não "Welcome"),
   corpo "¡Hola, …!", botão "Ir al panel", assinatura "El equipo de Acme" e rodapé
   "Recibiste este correo porque tienes una cuenta en Acme."
6. Repita com `locale: "en"` e `locale: "pt-br"` e confira que **o assunto muda junto com o corpo** — é o
   erro clássico (traduzir o corpo e esquecer o assunto) que este critério existe para pegar.

### M2 · Falha real do provedor não derruba a operação (fecha o lado "real" de A6)

1. Troque o `RESEND_TOKEN` por um token **revogado** (não malformado: precisa passar no `re_…` para
   chegar ao provedor).
2. Dispare o mesmo envio do M1.
3. **Esperado:** a operação **retorna** em vez de estourar; no terminal, exatamente uma linha
   `[email] failed template=welcome reason=provider-error locale=es`.
4. **Confira o que não está lá:** o seu endereço, o assunto, o corpo e a mensagem do Resend. Se aparecer
   qualquer um, é regressão de C3.
5. Repita com o domínio **não verificado** e note que a linha é **idêntica** à do token revogado — essa
   é a limitação registrada em A6/D-4: você não sabe qual dos dois aconteceu sem reproduzir.

### M3 · Fidelidade em cliente de e-mail real (fora do alcance do Vitest e do preview)

1. Use o botão **Send** do preview da 3003 (ou o envio do M1) para mandar os 3 templates para caixas em
   **Gmail, Outlook e Apple Mail**.
2. Confira em cada um: o cabeçalho da marca, o card com borda, o botão (o Outlook costuma ser o que
   quebra), e principalmente a **URL de fallback em texto** — ela existe justamente porque parte dos
   clientes remove o botão.
3. Abra ao menos um deles no **dark mode do cliente** e veja se o texto continua legível: as cores são
   hex fixo em `brand.ts`, e o cliente pode inverter o fundo por conta própria.
4. Abra um no celular e confira que a URL longa quebra em vez de esticar a mensagem.

### M4 · Rebranding, do ponto de vista de quem forka

1. Edite **só** `packages/email/brand.ts`: `name`, `primaryColor` e, desta vez, `logoUrl` com uma imagem
   hospedada (o caso que sai vazio de fábrica).
2. Recarregue a 3003. **Esperado:** os 9 previews com o nome novo, o botão na cor nova e o logotipo no
   lugar do nome em texto no cabeçalho.
3. Restaure o arquivo. **Se algum template não acompanhar, é regressão de B2.**

> ⚠️ Antes de concluir que o preview está errado: `lsof -ti:3003`. Um servidor órfão serve módulos em
> cache de antes da edição e faz o rebranding parecer quebrado em alguns previews — já custou tempo uma
> vez nesta feature.

---

## Cross-check — onde conferir quando algo mudar aqui

| Eixo | Cobertura desta rodada |
|---|---|
| 3 idiomas × 3 templates | 9 combinações abertas no preview + asserção automatizada dos 6 wrappers |
| Light / dark | landing `/contact` nos dois; **N/A no e-mail** — cliente de e-mail não tem o tema do design system, a marca é hex por necessidade |
| Mobile / desktop | e-mail a 360px sem overflow horizontal (medido); landing a 390×844 |
| Com / sem `RESEND_TOKEN` | boot e `GET 200` provados nos dois; `""` e ausente tratados como "não configurado" |
| `apps/app` × `apps/web` | só a `web` consome a fachada; `app` e `api` apenas estendem `keys()` — os 3 buildam |
| comum × admin × impersonação | **N/A** — nenhum fluxo autenticado no escopo |
| `subscription` × `simple` | **N/A** — a feature não lê modo de produto |
