# Revisão: canal de contato e suporte

Rodada autônoma do `/cycle`, 2026-10-19. A revisão leu o diff inteiro (30 arquivos modificados ou removidos e 15
novos fora de `docs/features/`), corrigiu o que estava claro e rodou os gates estáticos. Não subiu app, não
abriu browser e não rodou a suíte de testes. Nada foi commitado; o índice ficou vazio.

## Branch

- **Nome:** `feat/contact-support-channel`, criada com `git switch -c` a partir de
  `guilhermebittelbrunn/cycle-command-v4` no HEAD `44b2b04` (igual a `origin/main`). O working tree veio junto.
- **Por que sem `project`:** a entrega toca `apps/api`, `apps/web`, `apps/app` e quatro pacotes. Com vários
  apps, o padrão omite o prefixo.
- **Validação:** a branch de origem não casa com o regex (o prefixo `guilhermebittelbrunn/` não é projeto). A
  nova passou: `branch OK: feat/contact-support-channel`. A antiga não tinha remoto nem commit próprio e
  continua existindo, sem uso.

## Revisão: contact-support-channel

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `docs/SECURITY.md:17-28`: o inventário de guards dizia 40 arquivos de rota e 14 sem guard. A rota nova
  `apps/api/app/(routes)/contact/route.ts` não tem guard e não entrou na conta. Medido com
  `find "apps/api/app/(routes)" -name route.ts | wc -l` (41) e `grep -LE "require(CommonPanel|Admin|Plan)Api"`
  (15). **Corrigido:** 41 e quinze, com uma linha nova na tabela explicando por que `/contact` é pública. É o
  mesmo tipo de defasagem que o `BACKLOG.md` já registrou depois da PR #47.
- O comentário novo de `apps/api/proxy.ts` (4 linhas) e o caminho novo na lista deslocaram o arquivo em 5
  linhas, e o `privacyContact.ts` ganhou uma linha de JSDoc. Seis âncoras em documentos que o diff não tocou, ou
  tocou só em outra linha, passaram a apontar para o lugar errado. **Corrigido:**
  - `docs/ROPA.md:54` e `:94`: `proxy.ts:49-62` → `:53-67` (a lista de rate limit);
  - `docs/ROPA.md:69`, `:150`, `docs/INCIDENT-RESPONSE.md:65` e `docs/SUBPROCESSORS.md:37`: `proxy.ts:68-80` →
    `:73-85` (o `logBlocked`);
  - `docs/SUBPROCESSORS.md:40`: `proxy.ts:151` → `:156` (a chamada a `checkRateLimit`);
  - `docs/INCIDENT-RESPONSE.md:19`: `privacyContact.ts:10-19` → `:11-20`.

### 🟢 Sugestão / nit

- `apps/web/app/[locale]/contact/validations/contact.ts`: o schema da landing não limitava o e-mail, e a API
  recusa acima de 320 caracteres (`contact.schema.ts:9,13`). Um e-mail longo passava no navegador e voltava como
  `VALIDATION_FAILED` genérico. **Corrigido:** `.max(EMAIL_MAX, validation.emailInvalid)`, no mesmo molde de
  `accountEmailChangeSchema.ts`. Não há teste para esse caso (ver lacunas).
- `docs/ROPA.md:101-103`: a frase dizia que, sem a caixa de suporte, "a landing mostra o canal como
  indisponível". Quem decide isso é o build da `web`, que lê a própria variável; a API só responde 503.
  **Corrigido** para separar os dois lados.
- `apps/api/app/(routes)/contact/route.ts:20`: `parseRequestJson` lê o corpo inteiro antes de o Zod recusar
  tamanho. Nenhuma rota pública da API limita o corpo antes do parse; só o upload confere `content-length`
  (`file.schema.ts:100`). Com o canal indisponível, a rota responde 503 sem ler o corpo. Com o canal ativo, o
  rate limit e o teto da plataforma cobrem o caso. **Não corrigido:** seria um padrão novo só nesta rota.
  Candidato ao backlog como item transversal das rotas públicas.
- `specs/BACKLOG.md` e as specs vivas citam `apps/api/proxy.ts:49-62`, `docs/SECURITY.md:157/159/168` e "14 de
  40" rotas sem guard. Depois deste diff, as âncoras deslocam (+5 no proxy, +1 no `SECURITY.md` a partir da
  linha 27) e a conta passa a 15 de 41. **Não corrigido aqui:** `specs/` é outro assunto, e a remedição é do
  próximo `/spec --sync`.
- `EMAIL_SEND_FAILED` mostra "Não foi possível enviar o e-mail agora" no formulário de mensagem. O plano
  (pergunta 3) aceitou o texto; um código próprio custa três linhas de tradução se a copy incomodar.

### ✅ OK

- Ordem do handler (`route.ts:15-50`): disponibilidade antes de ler o corpo, depois JSON, Zod, envio síncrono e
  mapeamento dos três `reason` do `sendEmail`. Nenhum caminho responde 500: `sendEmail` não lança
  (`packages/email/index.ts:113-132`) e os outros ramos devolvem `error.code`.
- Injeção de cabeçalho: o assunto é fixo (`templates/contact.tsx:67`), nome e mensagem entram como texto React,
  o `replyTo` passa por `trim` + `email()` e a Resend recebe JSON, não SMTP. O destino vem do servidor
  (`supportInbox()`), então a rota não manda e-mail para endereço escolhido pelo cliente.
- Modo degradado: `getBrand().supportEmail` apara e valida (`brand.ts:38-41`), então vazio, espaços e valor
  inválido viram `null`; `isEmailEnabled()` usa `Boolean(...)`. O item do menu some com `NEXT_PUBLIC_WEB_URL`
  vazia (`contactPageUrl.ts:5`).
- Rate limit: `/contact` está em `RATE_LIMITED_PATHS` (`proxy.ts:66`), casado por igualdade, depois da
  checagem de origem. CORS não muda: a landing já chama a API do navegador no cadastro.
- PII: a rota não loga; `sendEmail` loga sem destinatário (`index.ts:42-51`); o e-mail do usuário logado vem de
  `useAuth()` e não da URL (`contact-form-client.tsx:45-49`).
- SDK como única porta: `apiClient.contact.send` (`contact-form-client.tsx:52-53`), action registrada no
  `Client` (`client/index.ts:24,36`), erro propaga cru e a tela formata com `FormattedError`.
- Formulário: `HookFormInput`/`HookFormTextarea` com o erro vindo do `fieldState`, schema por fábrica com o
  dicionário, `zodResolver`, botão `type="submit"` com `loading`/`disabled` em `isPending`.
- i18n: chaves novas nos três idiomas com a mesma forma; nenhuma string solta no JSX dos arquivos tocados;
  `CONTACT_UNAVAILABLE` em `apiErrors` nos três. As chaves removidas (`form.date`, `firstName`, `lastName`,
  `resume`) não têm outro leitor (`rg` vazio).
- `ownerInbox` não tem mais nenhum uso fora de `docs/features/` e `specs/`.
- Comentários: nenhuma referência ao fluxo nos arquivos de código e de teste (`rg` por `plan.md`, `handoff`,
  `review`, `critério`, `docs/features`).
- Testes: imports explícitos de `vitest`, sem `toBeInTheDocument`, e-mails só em `example.com`/`acme.com`.
- Spec: a entrega corresponde ao corte de MVP de `specs/contact-support-channel.md`, com as duas derivas que o
  plano já registrou (aviso antes de digitar só sem caixa; a atividade do ROPA já existia e foi corrigida).
- Artefatos de `docs/features/contact-support-channel/` e `docs/features/linked-sign-in-methods/spec.md`: o
  único e-mail é `qa-contact-support@example.com`; nenhuma senha, token ou chave. `re_qa_fake` é placeholder de
  roteiro de teste, não credencial.

### 👁 Verificar no `/test`

Afirmações do handoff que a leitura não confirma. Cada uma com o repro sugerido.

1. **Formulário visível com a caixa definida.** O único build medido foi com a variável vazia. Repro: build da
   `web` com `NEXT_PUBLIC_APP_SUPPORT_EMAIL` preenchida e a mesma variável na `api`; abrir `/pt-br/contact` e
   contar três campos, nenhum de data ou arquivo (T2).
2. **Envio sai do navegador para a API, sem server action e sem bloqueio de CSP ou CORS.** Repro: estado do item
   1 com `RESEND_*` vazias na `api`; enviar e conferir no painel de rede um `POST {NEXT_PUBLIC_API_URL}/contact`,
   resposta `503 CONTACT_UNAVAILABLE`, toast traduzido e os três campos preservados (T5).
3. **Ordem da rota (disponibilidade antes do corpo).** Repro sem browser: com a `api` sem caixa,
   `curl -X POST {API}/contact -H 'Origin: <web>' -H 'Content-Type: application/json' -d 'not-json'` tem de dar
   503 `CONTACT_UNAVAILABLE`, não 400. Com a caixa e Resend falsa, o mesmo corpo dá 400 `VALIDATION_FAILED`.
4. **Envio duplo gera uma requisição.** (Medido no `/test` e corrigido na rodada 2, abaixo.) O handoff provou em jsdom. A guarda em `onSubmit` lê o `isPending` da
   renderização em que o submit começou, então dois submits no mesmo ciclo passariam. Repro: duplo clique
   rápido e Enter repetido no estado T5; contar requisições no painel de rede (T6).
5. **E-mail preenchido pela sessão compartilhada.** Repro: login no app (3000), "Ajuda e contato" abre a web
   (3001) em aba nova com o e-mail da conta no campo; a URL aberta não tem query (T8). Repetir personificando
   um usuário: o e-mail esperado é o do admin (T10).
6. **Item do menu.** Posição entre "Minha conta" e "Cookies", nos três idiomas e no tema da app; ausente com a
   app sem `NEXT_PUBLIC_WEB_URL` (T8, T9).
7. **Validação no navegador.** `noValidate` deve impedir o balão nativo do `type="email"`; envio vazio mostra
   três mensagens no idioma e nenhuma requisição; 121 caracteres no nome, 5001 na mensagem e e-mail sem `@`
   são recusados (T3, T4).
8. **Um só `<h1>` na página.** O título da coluna esquerda virou `<h1>`; o handoff diz que o header não tem
   outro. Repro: contar `h1` no DOM de `/pt-br/contact`.
9. **Legibilidade.** Aviso de indisponível, `<output>` de confirmação e toast em light, dark e 375 px sem
   rolagem horizontal. A confirmação só aparece com envio aceito, então no browser ela fica 🔒 sem Resend real.
10. **Caminhos antigos para `/contact`.** Card "Enterprise" de `/pricing`, link de `/legal/privacy` sem
    `NEXT_PUBLIC_PRIVACY_CONTACT` e CTAs da home chegam ao formulário no idioma corrente (T11).

## Lacunas de teste

| Lacuna | Veredito |
|---|---|
| Sem teste de componente para `page.tsx` escolhendo `available` a partir de `getBrand()` (handoff) | fechada no `/test`: `apps/web/__tests__/contactPageAvailability.test.tsx` (6 testes) |
| Entrega real pela Resend só provada com `sendEmail` mockado (handoff) | continua aberta, 🔒 por infra |
| 429 real depende de `ARCJET_KEY` válida (handoff) | continua aberta, 🔒 por infra |
| E-mail acima de 320 caracteres no schema da landing (nova, da correção acima) | fechada no `/test`: 3 casos em `contactFormSchema.test.ts`, um por idioma |
| Dois submits na mesma tarefa JS mandam duas requisições (rodada 2) | fechada na rodada 2: dois testes novos em `contactFormPrefill.test.tsx` |

## Raio de impacto

- `@repo/sdk`: acréscimo de `apiClient.contact` e dos tipos `ContactMessageRequest`/`ContactMessageSent`. Único
  consumidor: `apps/web/.../contact-form-client.tsx`. Nenhum método existente mudou.
- `@repo/email`: `ownerInbox` saiu e `supportInbox` entrou. No repo não sobra chamador. Fork que use
  `ownerInbox` quebra no typecheck, de propósito.
- `@repo/shared`: `CONTACT_NAME_MAX_LENGTH` e `CONTACT_MESSAGE_MAX_LENGTH`, lidos pela API e pela landing.
- `@repo/internationalization`: `hero.form` da página de contato perdeu `date`, `firstName`, `lastName` e
  `resume`; o único leitor era o formulário reescrito.
- `apps/api/proxy.ts`: lista de rate limit com 13 caminhos. Spec que mexa no proxy em paralelo
  (`magic-link-sign-in`) conflita.
- Mudança visível para forks: sem `NEXT_PUBLIC_APP_SUPPORT_EMAIL`, a página de contato passa a mostrar
  "indisponível" no lugar do formulário de fachada.

## Gates

| Gate | Comando | Resultado | Origem |
|---|---|---|---|
| Lint | `pnpm check` | 928 arquivos, nenhum erro | medido nesta revisão, depois das correções |
| Typecheck `web` | `pnpm --filter web typecheck` | exit 0 | medido nesta revisão (o schema da landing mudou) |
| Typecheck demais | `api`, `app`, `@repo/sdk`, `@repo/email`, `@repo/internationalization`, `@repo/next-config` | 7/7 no handoff | não remedido: as correções não tocaram esses workspaces |
| Paridade i18n | `pnpm --filter @repo/internationalization test` | 67 testes no handoff | não remedido: nenhuma tradução mudou na revisão |

## Decisões em aberto

1. **Ordem dos commits com i18n.** A regra pede i18n por último, mas a `web` e a `app` não passam no typecheck
   sem as chaves novas, e a tradução da página de contato remove as chaves que o formulário antigo lê. Nenhuma
   ordem com um commit só de i18n deixa todos os commits compiláveis. **Adotado:** as traduções aditivas
   (`profileDropdown.helpAndContact` e `apiErrors.CONTACT_UNAVAILABLE`) vão num commit de i18n antes da `web` e
   da `app`, e a tradução da página de contato vai junto do commit da `web`, com o motivo na mensagem. Pelo
   mesmo critério, a `web` entra antes do `@repo/email`: enquanto a action antiga existir, remover `ownerInbox`
   quebra a `web`.
2. **Limite de corpo antes do parse nas rotas públicas.** Recomendação: item de backlog transversal, não nesta
   entrega.
3. **Branch antiga `guilhermebittelbrunn/cycle-command-v4`.** Ficou sem uso, sem remoto e sem commit próprio.
   Recomendação: apagar depois do push da nova.

## Rodada 2: trava do envio duplo

O `/test` mediu o item 4 da lista acima. Entrada real (três Enter, duplo clique e um clique extra, com a rede
atrasada em 2,5 s) gerou uma requisição. Dois `requestSubmit()` na mesma tarefa JS geraram dois `POST /contact`
com 1 ms de diferença; com a Resend configurada, seriam dois e-mails iguais na caixa de suporte.

### Correção

`apps/web/app/[locale]/contact/components/contact-form-client.tsx:50-69`: a guarda lia `sendMessage.isPending`,
que só muda na renderização seguinte. Agora um `useRef` é marcado antes do `mutate` e liberado no `onSettled`
da mutation, então o segundo submit da mesma tarefa encontra a trava fechada e uma falha da API reabre o
formulário para nova tentativa. Um comentário de duas linhas explica a corrida, porque a troca de
`isPending` por um ref parece desnecessária a quem lê sem esse contexto. A hipótese veio do QA; esta rodada
implementou e mediu.

Dois testes novos em `apps/web/__tests__/contactFormPrefill.test.tsx`:

- "sends once when the form is submitted twice in the same task": dois `fireEvent.submit` seguidos, sem
  `await` entre eles, com a requisição pendente para sempre;
- "lets the person send again after the API refuses": a primeira chamada falha com `CONTACT_UNAVAILABLE`, o
  segundo clique envia e a confirmação aparece.

### Medição

| Estado do componente | `pnpm exec vitest run __tests__/contactFormPrefill.test.tsx` |
|---|---|
| Guarda antiga (`isPending`) | 1 falhou, 7 passaram: "expected to be called 1 times, but got 2 times" no teste da mesma tarefa |
| Trava com `useRef` | 8 passaram |
| Trava que nunca libera (`onSettled` trocado para `true`, revertido em seguida) | 1 falhou, 7 passaram: o teste de nova tentativa |

Com `contactForm.test.tsx` junto, 21 de 21 passam com a trava.

### Gates da rodada 2

| Gate | Resultado |
|---|---|
| `pnpm check` | 929 arquivos, nenhum erro (um `noEmptyBlockStatements` no primeiro rascunho do teste foi corrigido) |
| `pnpm --filter web typecheck` | exit 0 |
| Outros workspaces e paridade de i18n | não remedidos: a rodada só mexeu em um componente e um teste da `web` |

### Varredura dos artefatos do `/test`

`test/criterios-aceite.md` e `test/report.md` citam só endereços `@example.com` (as contas do seed do
emulador e `qa-contact-support@example.com`). Nenhuma senha aparece: o report aponta para
`apps/e2e/support/seedAccounts.ts` em vez de repetir a do seed. `re_qa_fake` é token falso de roteiro.

### Achados fora do diff (backlog, não corrigidos)

- `apps/web/app/[locale]/(home)/components/hero.tsx:36` e `cta.tsx:29`: o CTA da home leva a `/contact` com
  ícone de telefone e o texto de `cta.primaryCta`, que é "Entrar"/"Sign In". Rótulo, ícone e destino não
  combinam.
- O `Textarea` do design system cresce sem limite: com 5000 caracteres, a mensagem chega a cerca de 2798 px de
  altura (medida do `/test`).
- Em 375 px, o cartão do formulário de contato encosta nas bordas da tela.

## Plano de commits

Antes do primeiro: `git diff --cached --stat` vazio (conferido no fim desta revisão). Depois de cada commit,
conferir `git show --stat --oneline HEAD` contra a lista.

1. `feat(shared): share contact message length limits`
   - `packages/shared/utils/helpers/contactMessage.ts`
   - `packages/shared/utils/helpers/index.ts`
2. `feat(sdk): add public contact message action`
   - `packages/sdk/src/types/contact/contact.ts`
   - `packages/sdk/src/types/contact/index.ts`
   - `packages/sdk/src/types/index.ts`
   - `packages/sdk/src/actions/contact/action.ts`
   - `packages/sdk/src/client/index.ts`
   - `packages/sdk/__tests__/contactAction.test.ts`
3. `feat(internationalization): add help menu entry and CONTACT_UNAVAILABLE copy`
   - `packages/internationalization/translations/apps/app/shared/index.ts`
   - `packages/internationalization/translations/packages/shared/utils.ts`
4. `feat(web): send the contact form through the API` (inclui a tradução da página, porque a troca de chaves e
   o formulário novo só compilam juntos)
   - `apps/web/app/[locale]/contact/page.tsx`
   - `apps/web/app/[locale]/contact/components/contact-form.tsx`
   - `apps/web/app/[locale]/contact/components/contact-form-client.tsx`
   - `apps/web/app/[locale]/contact/validations/contact.ts`
   - `apps/web/app/[locale]/contact/actions/contact.tsx` (removido)
   - `apps/web/shared/lib/privacyContact.ts`
   - `apps/web/__tests__/contactForm.test.tsx`
   - `apps/web/__tests__/contactFormPrefill.test.tsx`
   - `apps/web/__tests__/contactFormSchema.test.ts`
   - `apps/web/__tests__/contactPageAvailability.test.tsx`
   - `apps/web/__tests__/contactAction.test.ts` (removido)
   - `apps/web/__tests__/contactFormDateLocale.test.tsx` (removido)
   - `packages/internationalization/translations/apps/web/pages/contact/contact.ts`
5. `feat(email): deliver contact messages to the support inbox`
   - `packages/email/index.ts`
   - `packages/email/__tests__/credentials.test.ts`
6. `feat(api): add public POST /contact route`
   - `apps/api/(shared)/validation/contact.schema.ts`
   - `apps/api/app/(routes)/contact/route.ts`
   - `apps/api/__tests__/contactRoute.test.ts`
7. `feat(api): rate limit the contact endpoint`
   - `apps/api/proxy.ts`
   - `apps/api/__tests__/corsOrigin.test.ts`
8. `feat(app): add help and contact to the profile menu`
   - `apps/app/shared/lib/contactPageUrl.ts`
   - `apps/app/shared/components/ui/ProfileDropdown.tsx`
   - `apps/app/__tests__/profileDropdownHelpLink.test.tsx`
9. `docs(next-config): describe when the privacy channel fallback delivers`
   - `packages/next-config/keys.ts`
10. `docs: document the contact channel and re-anchor shifted references`
    - `docs/FORKING.md`
    - `docs/INCIDENT-RESPONSE.md`
    - `docs/PRE-PRODUCTION.md`
    - `docs/ROPA.md`
    - `docs/SECURITY.md`
    - `docs/SETUP.md`
    - `docs/SUBPROCESSORS.md`
11. `docs(specs): archive linked-sign-in-methods after PR #48 audit`
    - `specs/BACKLOG.md`
    - `specs/account-security-mfa.md`
    - `specs/magic-link-sign-in.md`
    - `specs/social-sign-in-providers.md`
    - `specs/linked-sign-in-methods.md` (removido)
    - `docs/features/linked-sign-in-methods/spec.md` (novo)
12. `docs(features): contact-support-channel`
    - `docs/features/contact-support-channel/STATE.md`
    - `docs/features/contact-support-channel/analyze/plan.md`
    - `docs/features/contact-support-channel/develop/handoff.md`
    - `docs/features/contact-support-channel/review/review.md`
    - `docs/features/contact-support-channel/test/criterios-aceite.md`
    - `docs/features/contact-support-channel/test/report.md`
    - `test/e2e/` fica de fora: o `.gitignore` descarta os prints (`git check-ignore` confirmou)

Título de PR sugerido: `feat: contact channel that delivers to the support inbox`.

Depois do último commit aprovado, o `/review` pergunta se sincroniza com
`git push -u origin feat/contact-support-channel`.

### Commits realizados

(preenchido pelo orquestrador)
