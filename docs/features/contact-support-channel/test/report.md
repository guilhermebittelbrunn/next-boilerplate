# Relatório de QA: canal de contato e suporte

Rodada autônoma do `/cycle`, 2026-10-19, rodada 1. Branch `feat/contact-support-channel`, criada pelo
`/review`. Nada foi commitado; os dois arquivos de teste que esta etapa mexeu ficam no working tree para o
`/review` commitar junto da `web`.

## Gate do `review`

O `STATE.md` mostra `review` em `in-progress`. Não há commit da feature: `HEAD` é `44b2b04`, igual a
`origin/main`, e o diff inteiro está no working tree. Isso bate com o `/cycle`, que não commita, então não é o
caso de gate aberto com commits já feitos. O plano de 12 commits do `review.md` continua pendente da
aprovação do usuário. Esta etapa marca `test` sem mexer na linha do `review`.

## Cobertura

| Comando | Resultado | Observação |
|---|---|---|
| `pnpm test` (root, com `JAVA_HOME` no JDK 21) | 15/15 tarefas ok, 12 do cache | gate do `build`; inclui `test:emulator` |
| `api:test` | 101 arquivos, 1304 testes | do cache; nenhum arquivo da `api` mudou nesta etapa |
| `api:test:emulator` | 4 arquivos, 186 testes | executado; emuladores próprios do script |
| `web:test` | 22 arquivos, 167 testes | executado (era 21/158 no handoff; +1 arquivo, +9 testes desta etapa) |
| `app:test` | 111 arquivos, 919 testes | do cache |
| `@repo/email:test` | 7 arquivos, 205 testes | do cache |
| `@repo/sdk:test` | 3 arquivos, 11 testes | do cache |
| `@repo/shared:test` | 5 arquivos, 56 testes | do cache |
| `@repo/internationalization:test` (paridade) | 7 arquivos, 67 testes | do cache; nenhuma tradução mudou nesta etapa |
| `@repo/next-config:test` | 1 arquivo, 32 testes | do cache |
| `pnpm turbo run test --filter=web` | 22 arquivos, 167 testes | rodado de novo depois do ajuste de lint no teste do schema |
| `pnpm --filter web typecheck` | exit 0 | com os dois arquivos de teste desta etapa |
| `pnpm exec biome check` nos dois arquivos de teste | sem erro | o primeiro rascunho tinha um `noMagicNumbers`, corrigido |

Rodei sem `--force`. Não remedi `pnpm check` do repo inteiro nem o typecheck dos outros workspaces: esta
etapa só tocou dois arquivos de teste da `web`, e o `review.md` registra `pnpm check` com 928 arquivos sem
erro.

### Testes criados ou alterados

- `apps/web/__tests__/contactPageAvailability.test.tsx` (novo, 6 testes): `page.tsx` passa `available` como
  `true` com a caixa válida (inclusive cercada de espaços) e `false` com a variável ausente, vazia, só com
  espaços ou sem formato de e-mail. Usa `vi.stubEnv` e o `getBrand()` real, sem mock. Conferi que o arquivo
  pega a regressão: com `available={true}` fixo no `page.tsx`, 4 dos 6 falham. Restaurei o arquivo depois.
- `apps/web/__tests__/contactFormSchema.test.ts` (+1 caso por idioma, 3 testes): e-mail com 321 caracteres é
  recusado com `code: "too_big"` e a mensagem `validation.emailInvalid`; com 320 não há `too_big`. Sem o
  `.max(EMAIL_MAX, ...)` no schema, os 3 falham. Restaurei o schema depois.

## Decisões de custo de teste

Nenhum teste da faixa cara foi criado. A rota não toca Firestore nem rules, e o que ela faz de infra (Resend e
Arcjet) não roda em emulador.

| Módulo tocado | Decisão |
|---|---|
| `apps/api/app/(routes)/contact/route.ts` | `contactRoute.test.ts` (21 testes, `sendEmail` mockado) já cobre ordem 503 antes do corpo, validação, destino, `replyTo` e mapeamento de `reason`. Confirmei a ordem por `curl` contra a API de pé. |
| `apps/api/proxy.ts` | `corsOrigin.test.ts` cobre `/contact` na lista e o 429. O 429 real precisa de `ARCJET_KEY`. |
| `apps/web/.../page.tsx` | era lacuna; fechada com teste unitário de 6 casos, sem jsdom. |
| `apps/web/.../validations/contact.ts` | era lacuna (320); fechada com 3 casos no teste existente. |
| `apps/web/.../contact-form-client.tsx` | `contactForm.test.tsx` e `contactFormPrefill.test.tsx` já cobriam; o resto ficou com o browser. |
| `apps/app/.../ProfileDropdown.tsx`, `contactPageUrl.ts` | `profileDropdownHelpLink.test.tsx` já cobria ordem e ausência sem `NEXT_PUBLIC_WEB_URL`. |
| `packages/email`, `packages/sdk`, `packages/shared` | testes do handoff bastam; nada do contrato mudou nesta etapa. |

## Verificar no `/test`

| # | Item do `review.md` | Veredito | O que foi medido |
|---|---|---|---|
| 1 | Formulário visível com a caixa definida | confirmado | Build de produção da `web` com a caixa definida: `/pt-br/contact` tem 1 `<form>` com `INPUT:text:name`, `INPUT:email:email`, `TEXTAREA:message`; zero `input[type=date]` ou `input[type=file]`; botão `submit` "Enviar mensagem". Idem em `en` e `es`. |
| 2 | Envio sai do navegador para a API, sem server action nem bloqueio de CSP/CORS | confirmado | XHR instrumentado na página: uma `POST http://localhost:3002/contact`, resposta `503 {"error":{"code":"CONTACT_UNAVAILABLE"}}`, nenhuma `POST` para a origem da landing. Preflight `OPTIONS` respondeu 204 com `access-control-allow-origin: http://localhost:3001`. Toast "O canal de contato não está disponível no momento." e os três campos preservados. |
| 3 | Disponibilidade antes do corpo | confirmado | `curl -d 'not-json'`: sem caixa, 503 `CONTACT_UNAVAILABLE`; com caixa e sem Resend, 503 `CONTACT_UNAVAILABLE`; com caixa e `RESEND_TOKEN=re_qa_fake`, 400 `VALIDATION_FAILED`. |
| 4 | Envio duplo gera uma requisição | confirmado para entrada real; a hipótese do revisor também se confirmou para o caso sintético | Com o envio atrasado 2,5 s na página: três Enter no campo de nome, depois `dblclick` e um clique a mais deram **1** requisição; o botão ficou `disabled` com `aria-busy="true"`. Sem atraso, `dblclick` deu 1. Dois `form.requestSubmit()` seguidos na mesma tarefa de JS deram **2** requisições, com 1 ms de diferença. Detalhe em "Achados". |
| 5 | E-mail preenchido pela sessão compartilhada | confirmado em `localhost` | Login como `user@example.com` (emulador) no app em `localhost:3100`; "Ajuda e contato" abriu `http://localhost:3001/pt-br/contact` em aba nova, `location.search` vazio, `document.referrer` vazio, `window.opener` nulo, campo de e-mail com `user@example.com`. Personificando `user2@example.com` como `admin@example.com`, o campo veio com `admin@example.com`. |
| 6 | Item do menu | confirmado | "Minha conta", "Ajuda e contato", "Sair" (pt-br); "My account", "Help and contact", "Sign out" (en, dark); "Mi cuenta", "Ayuda y contacto", "Salir" (es, light). `href` `http://localhost:3001/<locale>/contact`, `target="_blank"`, `rel="noreferrer"`. Contraste do item: 18,97 no dark, 19,8 no light. "Cookies" não aparece neste ambiente (sem GA, `cookieConsent.available` falso), então a ordem antes de "Cookies" vem do teste unitário. Ausência sem `NEXT_PUBLIC_WEB_URL`: teste unitário, não reiniciei a app sem a variável. |
| 7 | Validação no navegador | confirmado | `noValidate` presente. Envio vazio: "Informe seu nome.", "Informe um e-mail válido.", "Escreva sua mensagem." (pt-br), "Enter your name.", "Enter a valid email.", "Write your message." (en), "Indica tu nombre.", "Indica un correo electrónico válido.", "Escribe tu mensaje." (es); zero requisições. 121 no nome, 5001 na mensagem e `qa-contact-support.example.com`: "Use no máximo 120 caracteres no nome.", "Informe um e-mail válido.", "Use no máximo 5000 caracteres na mensagem."; zero requisições. 120 e 5000 com e-mail válido: uma requisição. |
| 8 | Um só `<h1>` | confirmado | 1 `<h1>` em todos os estados medidos (formulário e indisponível, nos três idiomas). |
| 9 | Legibilidade | confirmado, exceto o `<output>` (🔒) | Contraste medido (WCAG): rótulos 10,3 light e 7,61 dark; mensagens de erro 4,77 light e 6,85 dark; toast 4,61 light e 18,73 dark; aviso de indisponível, título 19,8/18,97 e descrição 5,04/7,66. Em 375 px, `scrollWidth` igual a `clientWidth` (360) e nenhum elemento passa da borda; o toast ocupa x 19 a 356. O `<output>` de confirmação não foi visto no browser: o mock do sucesso pelo `agent-browser` falhou no CORS, e o envio aceito exige Resend real. Ele usa as mesmas classes do aviso de indisponível (`font-medium text-lg` e `text-muted-foreground text-sm`), medidas acima. |
| 10 | Caminhos antigos | confirmado | Links para `/<locale>/contact` em `/`, `/pricing` e `/legal/privacy` nos três idiomas. Cliquei "Contáctanos" em `/es/pricing` (chegou em `/es/contact`, formulário "Escríbenos"), "Contact form" em `/en/legal/privacy` (chegou em `/en/contact`, "Get in touch") e "Entre em contato" na home pt-br (chegou em `/pt-br/contact`, "Fale com a gente"). |

## Critérios de aceite

| Critério | Status | Meio |
|---|---|---|
| Formulário com nome, e-mail e mensagem | ✅ | e2e (build de produção), 3 idiomas |
| Validação no navegador nos três idiomas | ✅ | e2e + `contactFormSchema.test.ts` (inclui 320) |
| Validação na borda da API | ✅ | `curl` (JSON inválido e `locale: "fr"` dão 400) + `contactRoute.test.ts` |
| Disponibilidade antes do corpo | ✅ | `curl` nos três estados da API |
| Entrega na caixa de suporte com resposta ao visitante | 🔒 | contrato no teste da rota; entrega real exige Resend com domínio verificado |
| Confirmação depois do envio | 🔒 | teste de componente; no browser exige envio aceito |
| Canal indisponível sem caixa de suporte | ✅ | e2e (build com a variável vazia: 0 `<form>`, 0 campos, aviso nos 3 idiomas) + `contactPageAvailability.test.tsx` + `curl` |
| Canal indisponível sem Resend | ✅ | e2e, toast nos 3 idiomas, campos preservados |
| Falha do provedor | ✅ | e2e com `RESEND_TOKEN=re_qa_fake`: 503 `EMAIL_SEND_FAILED`, toast nos 3 idiomas, campos preservados; log `[email] failed template=contact reason=provider-error locale=es`, sem e-mail nem mensagem |
| Envio duplo | ✅ | e2e com rede atrasada (1 requisição) |
| Rate limit na rota pública | 🔒 | lista e 429 no teste do proxy; 429 real exige `ARCJET_KEY` |
| Envio pelo SDK, não por server action | ✅ | e2e (XHR instrumentado) + `rg ownerInbox` vazio + `contact/actions/` inexistente |
| "Ajuda e contato" no menu do perfil | ✅ | e2e (3 idiomas, light e dark) + teste unitário (ordem com "Cookies" e ausência sem `NEXT_PUBLIC_WEB_URL`) |
| E-mail da conta preenchido, sem PII na URL | ✅ | e2e em `localhost` + `contactFormPrefill.test.tsx` (não sobrescreve o que foi digitado) |
| E-mail preenchido em domínio de produção | 🔒 | exige `SESSION_COOKIE_DOMAIN` com domínio real |
| Personificação | ✅ | e2e |
| Caminhos que já levavam a `/contact` | ✅ | e2e (3 cliques e os `href` dos 9 pares página/idioma); JSDoc e comentário lidos |
| Um só `<h1>` na página | ✅ | e2e |
| Tema e responsivo | ✅ | e2e, contraste e largura medidos |
| Documentação alinhada | ✅ | leitura: `SECURITY.md:28` e `:158` (13 caminhos), `ROPA.md:110-113`, `PRE-PRODUCTION.md:603` e `:736`, `SETUP.md:96`, `FORKING.md:114` e `:396`; `apps/api/proxy.ts:53-67` tem 13 entradas |

Total: 16 ✅, 0 ❌, 4 🔒.

## Evidências e2e

- Build de produção da `web` (`next build && next start`) nos dois estados da caixa; a API e a app rodaram
  em `next dev`. Nada do que foi classificado veio só do `next dev` da landing.
- Toast de erro: o texto vem seguido de "(Código do erro: <uuid>)", que é o `x-request-id` acrescentado pelo
  `handleClientError`, comportamento já existente.
- Em 375 px, sem rolagem horizontal em pt-br (dark), en (light) e es (dark), tanto no formulário quanto no
  aviso de indisponível.
- Prints em `docs/features/contact-support-channel/test/e2e/` (`01-ptbr-light-form.png` a
  `16-unavailable-*.png`). O `.gitignore` descarta a pasta; a prova é o texto acima.

## Achados

### Defeito de produção

Nenhum que reprove critério.

### Fragilidade do envio duplo (🟢)

`contact-form-client.tsx`, `onSubmit`: a guarda `if (!sendMessage.isPending)` lê o valor da renderização em
que o `handleSubmit` foi criado. Dois eventos `submit` na mesma tarefa de JS, antes do React renderizar de
novo, passam os dois: `form.requestSubmit(); form.requestSubmit();` gerou 2 requisições `POST /contact` com
1 ms de diferença. Nenhuma entrada real medida chegou a esse caso (duplo clique, Enter repetido e clique
extra com 2,5 s de pendência deram 1 requisição), porque o botão desabilitado bloqueia o clique e a submissão
implícita por Enter. Com Resend real, o caso sintético mandaria dois e-mails iguais. Correção sugerida, como
hipótese: uma trava síncrona com `useRef` marcada antes do `mutate` e liberada no `onSettled`. O teste
`contactFormPrefill.test.tsx` "sends once when submit is pressed twice while pending" passaria a cobrir o
caso se disparasse os dois `submit` sem `await` entre eles.

### Fora do escopo do diff

- `apps/web/app/[locale]/(home)/components/hero.tsx:36` e `cta.tsx:29`: o botão com ícone de telefone que leva
  a `/<locale>/contact` tem o texto `cta.primaryCta`, que é "Entrar" / "Sign In" / "Iniciar sesión". O link
  chega ao formulário, mas o rótulo promete login. Já existia antes desta feature.
- O `<h1>` da página mostra `meta.title` ("Contato - Next Boilerplate"), e o benefício diz "Nossa equipe
  responde em até 24 horas". O plano já listou os dois como achados adjacentes.
- O `Textarea` do design system usa `field-sizing-content`: com 5000 caracteres a caixa de mensagem cresce
  até 2798 px de altura e empurra o botão para fora da tela.
- Em 375 px o cartão do formulário encosta nas bordas da tela (sem margem lateral). Sem rolagem horizontal.

## Lacunas

| Lacuna herdada | Veredito |
|---|---|
| Teste de `page.tsx` escolhendo `available` a partir de `getBrand()` | fechada: `contactPageAvailability.test.tsx`, 6 casos |
| E-mail acima de 320 caracteres no schema da landing | fechada: 3 casos em `contactFormSchema.test.ts` |
| Entrega real pelo Resend | continua aberta, 🔒 por infra |
| 429 real com `ARCJET_KEY` | continua aberta, 🔒 por infra |
| Confirmação de envio no browser (handoff, "Verificar no `/test`" item 9) | continua aberta, 🔒: depende de envio aceito |
| Preenchimento com `SESSION_COOKIE_DOMAIN` em domínio real | continua aberta, 🔒 por infra |
| Item ausente sem `NEXT_PUBLIC_WEB_URL` no browser (T9) | fora do browser nesta rodada: o teste unitário renderiza o componente real sem a variável; reiniciar a app só para isso não traria informação nova |

## Ambiente do e2e

A porta 3000 estava ocupada por um processo Electron de outro projeto (`comanda10`), que não é o app deste
repo. Não reutilizei nem derrubei esse processo e subi a app em 3100. O resto subi eu:

- emuladores Auth, Firestore e Storage (`pnpm emulators`, projeto `demo-next-boilerplate`, JDK 21 via
  `JAVA_HOME`), com o seed de `apps/api/scripts/seed-emulator.mjs`;
- `api` em 3002 (`next dev`), em três configurações seguidas: caixa definida sem Resend; sem caixa; caixa
  definida com `RESEND_TOKEN=re_qa_fake` e `RESEND_FROM` de teste;
- `app` em 3100 (`next dev`);
- `web` em 3001 (`next build && next start`), primeiro com `NEXT_PUBLIC_APP_SUPPORT_EMAIL=support@example.com`
  e depois com ela vazia.

O ambiente de cada servidor veio do `buildStackEnv` da suíte e2e (que zera as chaves reais do `.env` local e
aponta para o emulador), com as URLs ajustadas para 3100. As variáveis de teste existiram só no ambiente
dos processos; nenhum arquivo versionado mudou para isso. Ao terminar, matei os processos pelo PID, depois os
filhos presos às portas que abri, e parei os emuladores com `SIGINT`. Conferi com `lsof` que 3001, 3002, 3100,
9099, 8080, 9199, 4001, 4400, 4500 e 9150 ficaram livres. O harness temporário (fora do repo) e o
`firestore-debug.log` gerado pelo emulador foram apagados. As duas sessões do `agent-browser` foram fechadas.

## Estado de dev alterado

Nenhum projeto Firebase real foi tocado. Usei as contas do seed do emulador (`user@example.com`,
`admin@example.com`, `user2@example.com`), que somem com o processo; a senha delas é a do seed, documentada
em `apps/e2e/support/seedAccounts.ts`. Não criei conta nova, então `qa-contact-support@example.com` aparece só
como e-mail digitado no formulário e não entra na lista do `PRE-PRODUCTION.md`. Durante a passada desativei
`user2@example.com` por engano na lista de usuários do admin e reativei em seguida; o estado morreu com o
emulador. As quatro chamadas com `re_qa_fake` que passaram da validação (uma por `curl`, três pelo formulário) foram até a API do Resend e voltaram recusadas; nenhuma mensagem
foi entregue.
