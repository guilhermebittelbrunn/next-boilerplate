# Handoff do develop: canal de contato e suporte

Rodada autônoma do `/cycle`, 2026-10-19. Nada foi commitado e o índice ficou vazio
(`git diff --cached --stat` sem saída no fim da etapa). Nenhuma dependência e nenhuma variável de ambiente nova.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---|---|
| 10.2 limites compartilhados | `packages/shared/utils/helpers/contactMessage.ts` (novo), `packages/shared/utils/helpers/index.ts` (reexporta) |
| 10.3 destino | `packages/email/index.ts` (`ownerInbox` sai, `supportInbox` entra), `packages/email/__tests__/credentials.test.ts` |
| 10.1 contrato | `packages/sdk/src/types/contact/{contact,index}.ts`, `packages/sdk/src/types/index.ts`, `packages/sdk/src/actions/contact/action.ts`, `packages/sdk/src/client/index.ts`, `packages/sdk/__tests__/contactAction.test.ts` |
| 10.4 rota e validação | `apps/api/(shared)/validation/contact.schema.ts`, `apps/api/app/(routes)/contact/route.ts`, `apps/api/__tests__/contactRoute.test.ts` |
| 10.4 rate limit | `apps/api/proxy.ts`, `apps/api/__tests__/corsOrigin.test.ts` |
| 10.6 landing | `apps/web/app/[locale]/contact/page.tsx`, `components/contact-form.tsx`, `components/contact-form-client.tsx` (reescrito), `validations/contact.ts` (novo), `apps/web/shared/lib/privacyContact.ts` (JSDoc); testes novos `contactFormSchema.test.ts`, `contactForm.test.tsx`, `contactFormPrefill.test.tsx` |
| 10.6 remoções | `apps/web/app/[locale]/contact/actions/contact.tsx`, `apps/web/__tests__/contactAction.test.ts`, `apps/web/__tests__/contactFormDateLocale.test.tsx` |
| 10.7 app | `apps/app/shared/lib/contactPageUrl.ts` (novo), `apps/app/shared/components/ui/ProfileDropdown.tsx`, `apps/app/__tests__/profileDropdownHelpLink.test.tsx` |
| 10.8 i18n | `translations/apps/web/pages/contact/contact.ts`, `translations/apps/app/shared/index.ts`, `translations/packages/shared/utils.ts` |
| 10.9 docs | `packages/next-config/keys.ts` (comentário), `docs/ROPA.md`, `docs/SECURITY.md`, `docs/PRE-PRODUCTION.md`, `docs/SETUP.md`, `docs/FORKING.md`, `docs/SUBPROCESSORS.md` |

## Contrato e raio de impacto

- `apiClient.contact.send(body: ContactMessageRequest): Promise<ContactMessageSent>` faz `POST /contact`. O único
  consumidor é `contact-form-client.tsx` da `apps/web`. É acréscimo; nenhum método existente do SDK mudou.
- `@repo/email` deixou de exportar `ownerInbox`. `rg ownerInbox` fora de `docs/features/` e `specs/` não acha
  nada. Fork que chamava a função quebra no typecheck.
- `@repo/shared` ganhou `CONTACT_NAME_MAX_LENGTH` (120) e `CONTACT_MESSAGE_MAX_LENGTH` (5000), lidos pela API e
  pela landing.

## Códigos de erro

`CONTACT_UNAVAILABLE` (503) é novo e está em `apiErrors` nos três idiomas. A paridade passou
(`pnpm --filter @repo/internationalization test`: 7 arquivos, 67 testes). A rota também devolve
`VALIDATION_FAILED` (400) e `EMAIL_SEND_FAILED` (503), que já existiam. O 429 `AUTH_RATE_LIMITED` vem do proxy.

## Desvios em relação ao plano

Nenhuma decisão do plano estava errada. Os desvios abaixo são de detalhe ou de omissão do plano.

1. **`docs/SUBPROCESSORS.md` também apontava para a action removida** (`contact.tsx:16-22`, linha da Resend). O
   plano não listava o arquivo. A linha agora cita `apps/api/app/(routes)/contact/route.ts:31`, e as referências
   a `packages/email/index.ts` foram reajustadas para 77-80 e 90-101, deslocadas pelo import novo de `getBrand`.
2. **A confirmação de envio usa `<output>`, não `<div role="status">`.** O Biome recusa o `role` explícito
   (`lint/a11y/useSemanticElements`). `<output>` tem `status` como papel implícito. Como o modelo de conteúdo do
   `<output>` é de fraseado, título e descrição são `<span>`, não `<h2>`/`<p>`.
3. **`noValidate` no `<form>`.** Sem ele, o `type="email"` do navegador bloqueia o envio com uma mensagem do
   próprio navegador antes de o Zod mostrar o texto traduzido.
4. **`onSubmit` confere `isPending` além do botão desabilitado.** O botão desabilitado cobre o clique, mas um
   `submit` disparado por outro caminho (Enter antes de o estado chegar ao botão) passaria. O teste
   `contactFormPrefill.test.tsx` "sends once when submit is pressed twice while pending" falha sem essa guarda
   (medido trocando a condição por `true`: 1 teste falhou, depois o arquivo foi restaurado).
5. **Título da coluna do formulário virou `<h2>`** (antes era `<p>`), abaixo do `<h1>` da página.
6. **`docs/ROPA.md` §5 perdeu a frase sobre o bloqueio de bot da landing.** Ela citava `apps/web/env.ts:33` e
   `apps/web/proxy.ts:63`, que já estavam deslocados (hoje 36 e 67), e o envio deixou de passar pela landing. A
   linha agora descreve o rate limit da API.
7. **`docs/SECURITY.md`**: além da lista de 13 caminhos (`apps/api/proxy.ts:53-67`), a referência ao
   `logEvent("security", "blocked", …)` passou de `proxy.ts:74` para `:79`, porque o comentário novo deslocou
   a linha.
8. **`docs/FORKING.md` §variáveis**: a coluna "Prod" de `NEXT_PUBLIC_APP_SUPPORT_EMAIL` ficou "obrigatória para
   o contato", seguindo o formato de "obrigatória com subdomínios" que a tabela já usa.
9. **Teste de prefill com React Query real.** O plano previa só jsdom com o hook de auth mockado; o arquivo usa
   `QueryClientProvider` de verdade, então ele também cobre a troca pelo bloco de confirmação, os campos
   preservados no erro e o envio duplo.

## Testes removidos

- `apps/web/__tests__/contactAction.test.ts`: testava a server action apagada. O que ele cobria (destino,
  `replyTo`, idioma) está em `apps/api/__tests__/contactRoute.test.ts`, agora com a caixa de suporte como destino.
- `apps/web/__tests__/contactFormDateLocale.test.tsx`: testava o `DateInput` do formulário antigo, que não tem
  mais campo de data. O idioma do `DateInput` segue coberto por `apps/app/__tests__/entityBirthdateField.test.tsx`
  e `auditFiltersDateInput.test.tsx`.

Nenhum teste foi afrouxado ou desativado.

## Validação

| Gate | Comando | Resultado |
|---|---|---|
| Typecheck | `pnpm turbo run typecheck --filter=api --filter=web --filter=app --filter=@repo/sdk --filter=@repo/email --filter=@repo/internationalization --filter=@repo/next-config` | 7/7 tarefas ok |
| Testes | `pnpm turbo run test` nos mesmos workspaces mais `@repo/shared` | api 101 arquivos / 1304 testes; app 111 / 919; web 21 / 158; email 7 / 205; sdk 3 / 11; internationalization 7 / 67; shared 5 / 56. 13/13 tarefas ok |
| Lint | `pnpm check` | 928 arquivos, nenhum erro |
| Paridade i18n | `pnpm --filter @repo/internationalization test` | 67 testes ok |
| Build degradado | `NEXT_PUBLIC_APP_SUPPORT_EMAIL="" pnpm exec next build` em `apps/web` | exit 0; `/[locale]/contact` sai como rota dinâmica (`ƒ`) |
| Smoke SSR | `next start -p 3101` com o build acima, `curl /pt-br/contact` | 200; HTML contém "Canal de contato indisponível", zero `<form`, `<h1>` presente. Servidor derrubado pelo PID; porta livre depois |

O smoke só mostra que a página monta no modo degradado. Não é validação de tela.

## Comportamentos medidos por teste

- Rota: 503 `CONTACT_UNAVAILABLE` sem caixa, sem Resend ou sem os dois, com `request.bodyUsed === false` e sem
  chamar `sendEmail`; 400 para JSON inválido, campos ausentes ou só com espaço, e-mail sem `@`, e-mail com CR/LF,
  locale `fr`, nome com 121 e mensagem com 5001; 200 com 120 e 5000; `to` igual à caixa, `replyTo` igual ao
  e-mail do visitante, dados aparados, locale repassado e padrão do fork quando ausente; `provider-error` vira
  `EMAIL_SEND_FAILED`; `not-configured` e `invalid-recipient` viram `CONTACT_UNAVAILABLE`; nada de e-mail ou
  mensagem do visitante em `console.*` (`contactRoute.test.ts`, 21 testes).
- Proxy: `/contact` contado; `/contact/`, `/contact/x` e `/contacts` não; orçamento estourado devolve 429
  `AUTH_RATE_LIMITED` (`corsOrigin.test.ts`).
- `supportInbox()` devolve a variável válida e `null` para vazia, só espaços, ausente ou sem formato de e-mail
  (`credentials.test.ts`).
- Landing, nos três idiomas: aviso de indisponível sem `<form>`; formulário com nome, e-mail e mensagem, sem
  campo de arquivo ou data; confirmação em `<output>` depois do sucesso; payload com o locale da página; erro
  `CONTACT_UNAVAILABLE` e `EMAIL_SEND_FAILED` mostrados no idioma da página; botão desabilitado com a mutation
  pendente (`contactForm.test.tsx`, 13 testes).
- Landing em jsdom: e-mail preenchido quando a sessão chega; o que a pessoa digitou não é sobrescrito; envio
  vazio mostra três mensagens e não chama a API; erro preserva os três campos; dois envios com a mutation
  pendente geram uma chamada (`contactFormPrefill.test.tsx`, 6 testes). Os dois testes de guarda falham quando a
  guarda correspondente é removida.
- Schema da landing: mesmos limites da API e mensagens do dicionário nos três idiomas
  (`contactFormSchema.test.ts`, 18 testes).
- App: item com `href` `{WEB_URL}/pt-br/contact`, `target="_blank"`, `rel="noreferrer"`, sem query string, entre
  "Minha conta" e "Cookies"; some com `NEXT_PUBLIC_WEB_URL` ausente ou vazia (`profileDropdownHelpLink.test.tsx`,
  5 testes).

## A verificar no `/test`

Nada abaixo foi medido no navegador nesta etapa.

- T1 a T11 do plano (seção 9), em light, dark e 375 px, nos três idiomas.
- Formulário visível com a caixa definida. O build do smoke foi feito com a variável vazia; como ela é
  `NEXT_PUBLIC_*`, o estado com caixa exige outro build da `web` com a variável preenchida.
- Envio real pela rede: uma requisição `POST {NEXT_PUBLIC_API_URL}/contact` vinda do navegador, 503
  `CONTACT_UNAVAILABLE` com `RESEND_*` vazias e o toast traduzido. Conferir no painel de rede que não há
  chamada de server action.
- Preenchimento do e-mail pela sessão compartilhada em `localhost` (app na 3000, web na 3001) e com um admin
  personificando alguém.
- Legibilidade do `<output>` de confirmação e do aviso de indisponível no tema escuro.
- Item "Ajuda e contato" no menu do perfil, no tema da app.

## Lacunas de teste conhecidas

- Não há teste de componente para o `page.tsx` da landing escolhendo `available` a partir de `getBrand()`. A
  regra de `getBrand().supportEmail` já é coberta em `packages/next-config`, e o smoke SSR mostrou o aviso com a
  variável vazia.
- O caminho com Resend aceitando a mensagem só é provado com `sendEmail` mockado. A entrega real fica 🔒.
- O 429 real depende de `ARCJET_KEY` válida e fica 🔒.

## Pendências

Nenhuma decisão em aberto bloqueou a implementação. Os pré-requisitos de infra da seção 11 do plano continuam
manuais e já estão descritos no `docs/PRE-PRODUCTION.md` (§3, §8 e §13). Os achados adjacentes do plano
(`@repo/email` e `RESEND_*` sobrando na `apps/web`, `meta.title` fixo, promessa de "24 horas") continuam fora
desta entrega.
