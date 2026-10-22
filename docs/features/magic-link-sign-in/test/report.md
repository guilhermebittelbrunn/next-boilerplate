# Relatório de QA: entrar com link enviado por e-mail

Rodada autônoma do `/cycle`, sem o usuário. Branch `guilhermebittelbrunn/feature-valor-cycle` (não protegida; a
troca para `feat/magic-link-sign-in` fica com o `/review` na aprovação dos commits). Nada foi para o índice, nada
foi commitado. Nenhum código de produção foi alterado nesta etapa.

Resumo: 18 critérios, 16 ✅, 0 ❌, 2 🔒. Os sete itens da lista "Verificar no `/test`" foram confirmados. Nenhum
defeito de produção. Quatro observações visuais e de copy, todas anteriores a esta feature, ficam como 🟢.

## Cobertura automatizada

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter app exec vitest run __tests__/emailLinkCompletion.test.tsx` | 19/19 (16 herdados + 3 novos) |
| `pnpm test` (raiz, com `JAVA_HOME` no JDK 21) | 15/15 tasks, 12 do cache. app 1045 (121 arquivos) · api 1500 (114) · api `test:emulator` 207 (5) · web 207 (26) · e2e 16 (2) · `@repo/auth` 136 (12) · `@repo/sdk` 11 (3) · `@repo/internationalization` 67 (7) · `@repo/email` 205 · `@repo/design-system` 171 · `@repo/shared` 56 · `@repo/security` 45 · `@repo/analytics` 34 · `@repo/next-config` 32 · `@repo/payments` 22. Zero falha |
| `pnpm turbo run typecheck --filter=app --filter=api --filter=@repo/auth --filter=@repo/sdk --filter=@repo/internationalization --filter=web` | 6/6, 5 do cache (`app` remedido por causa do teste novo) |
| `pnpm exec biome check apps/app/__tests__/emailLinkCompletion.test.tsx` | sem achado |
| `pnpm --filter api build` | build ok; `/auth/sign-in/email-link` listado como `ƒ` (Dynamic) |

A paridade de i18n (`@repo/internationalization`, 67/67) roda dentro do `pnpm test`. Nenhum gate rodou com
`--force`: não houve motivo para desconfiar do cache. O `pnpm check` da raiz não foi remedido; o `/review` já o
mediu e esta etapa só acrescentou casos a um arquivo de teste, conferido com o Biome isolado.

### Testes criados

Três casos em `apps/app/__tests__/emailLinkCompletion.test.tsx`, para o ramo `isSuccess` que o `/review` corrigiu
sem teste:

- `drops the form after a typed address is accepted and offers the way back to sign in`: e-mail digitado, conclusão
  resolvida; o formulário some, "Entrando…" e "Voltar para o login" (`/pt-br/sign-in`) aparecem, e o Firebase é
  chamado uma vez só.
- `offers the way back to sign in once the remembered address is accepted`: o mesmo com o e-mail guardado.
- `keeps the way back hidden while the attempt is still running`: com a tentativa pendente, o link de volta não
  aparece.

Prova de que os casos medem a correção: com o ramo `isSuccess` desligado de propósito (`if (false && …)`), os dois
primeiros falham e os outros 17 passam. O arquivo de produção foi restaurado e conferido byte a byte (`cmp`).

### Decisões de custo de teste

Nenhum teste da faixa cara foi criado. O que só a infra prova (o SDK do Firebase aceitando a URL montada, o
código não gasto com e-mail diferente, a conta inelegível sem código no emulador, o cookie e o `lastAccessAt`)
foi medido uma vez no percurso com `agent-browser` contra os emuladores, descrito abaixo. Transformar isso em teste
de emulador repetiria em todo CI um comportamento do Firebase que esta feature não controla.

| Módulo tocado | Teste novo? | O que já cobria |
|---------------|-------------|-----------------|
| `EmailLinkCompletion.tsx` | sim, 3 casos de componente | os 16 casos herdados cobriam erro, mismatch e StrictMode, não o estado pós-sucesso |
| `auth-action-links.ts` (kind `sign-in`) | não | `authActionLinks.test.ts`, 10 casos (elegibilidade, URL, recusas sem endereço) |
| rotas `auth/sign-in/email-link` (GET e POST) | não | `authEmailLinkSignInRoute.test.ts` (matriz de env, 404/503/400, corpo idêntico, `after`) |
| `email-link-sign-in.ts` (flag) | não | `emailLinkSignInEnabled.test.ts` |
| `proxy.ts` da API (rate limit) | não | `corsOrigin.test.ts` |
| `packages/auth` (`signInWithEmailLinkCode`, mutation) | não | `packages/auth/__tests__/emailLinkSignIn.test.ts`; a ligação com `onAuthSuccess` foi medida no browser |
| `EmailLinkRequestForm.tsx`, `SignInForm.tsx`, `emailLinkSignIn.ts` | não | `emailLinkRequestForm.test.tsx`, `signInEmailLinkEntry.test.tsx`, `emailLinkSignInLib.test.ts` |
| `proxy.ts` da app | não | `proxy.test.ts` (anônimo abre o link; quem tem sessão vai à home) |

## Verificar no `/test`

| # | Item do `review.md` | Veredito |
|---|---------------------|----------|
| 1 | Fluxo ponta a ponta no emulador | **Confirmado.** Pedido de `user@example.com` em `/pt-br/sign-in/email-link` gerou um `EMAIL_SIGNIN` no `oobCodes`, com `continueUrl` `http://localhost:3000/pt-br/sign-in/email-link`. Abrir `/pt-br/sign-in/email-link?oobCode=<código>` no mesmo navegador levou a `/pt-br`, com cookie `access-token`. O SDK do Firebase aceitou a URL montada na página |
| 2 | E-mail diferente não gasta o código | **Confirmado duas vezes** (pt-br light desktop e es dark 375 px). `user2@example.com` → "Este link foi pedido para outro e-mail." / "Este enlace se pidió para otro correo."; o código continuou listado no emulador; `user@example.com` em seguida entrou (`/es`) |
| 3 | Sessão recusada depois do link | **Confirmado nos dois caminhos.** Com `http://localhost:3000/api/auth/session` abortado: e-mail digitado → loader "Entrando…" + "Voltar para o login", sem formulário, sem cookie; e-mail guardado → o mesmo, com o alerta "Could not establish session". Desbloqueado, clicar em "Voltar para o login" gravou a sessão (`POST /api/auth/session` 200) e levou a `/pt-br`. Teste de componente criado |
| 4 | Cookie, `lastAccessAt`, onboarding, admin | **Confirmado.** `user@example.com`: `access-token` presente, `lastAccessAt` de ausente para `2026-10-22T03:43:18.392Z`. `admin@example.com` → `/pt-br/admin`. `qa-magic-link@example.com` (onboarding `step: profile`, `completedAt: null`) pediu em `/en` → `/en/onboarding`, `lastAccessAt` carimbado |
| 5 | Contas inelegíveis não ganham código | **Confirmado.** Só Google, não verificada e sem conta: `200 {"data":{"requested":true}}`, corpo idêntico ao da elegível; `oobCodes` vazio; log `[auth-action-link] refused kind=sign-in code=not-eligible` (duas vezes, uma por conta inelegível; nada para o e-mail sem conta). `providerData` igual depois: Google `["google.com"]` sem senha, não verificada `["password"]`, `emailVerified: false` |
| 6 | Build marca a rota de disponibilidade como dinâmica | **Confirmado.** `pnpm --filter api build` lista `ƒ /auth/sign-in/email-link` e `ƒ /auth/sign-in/email-link/request` |
| 7 | Telas novas em light, dark, mobile e 3 idiomas | **Confirmado**, com os 🟢 de Observações. Medido: loader "Entrando…" a 375×812 em dark, spinner no topo 350 px, texto em 630 px, link de volta termina em 684 px, dentro da dobra (812) |

## Critérios de aceite, item a item

| Critério | Status | Meio | Evidência |
|----------|--------|------|-----------|
| Recurso desligado por padrão | ✅ | e2e + curl + unit | flag vazia: GET `200 {"data":{"enabled":false}}`; POST com corpo `not json` → `404 {"error":{"code":"AUTH_EMAIL_LINK_DISABLED"}}`; `/pt-br/sign-in` sem o link (só "Esqueci minha senha" e "Cadastrar"); `/pt-br/sign-in/email-link` → "Entrar por link não está disponível" / "Use seu e-mail e senha ou o Google para entrar." / "Voltar para o login". Valores da flag em `emailLinkSignInEnabled.test.ts` |
| Ligado sem e-mail configurado | ✅ | curl + unit | flag `"true"`, Resend vazio: GET `enabled:false`; POST → `503 {"error":{"code":"EMAIL_NOT_CONFIGURED"}}`. Falta de `NEXT_PUBLIC_APP_URL` só na matriz da rota (unit) |
| Login oferece o link | ✅ | e2e + unit | pt-br "Receber link de acesso por e-mail", en "Get a sign-in link by email", es "Recibir un enlace de acceso por correo", todos com `href` `/<locale>/sign-in/email-link`. Carregando/erro: `signInEmailLinkEntry.test.tsx` |
| Pedido responde igual | ✅ | curl + e2e + log | cinco perfis com `200 {"data":{"requested":true}}`; códigos gerados só para a elegível e a desativada; logs da API sem nenhum `@example.com` (contagem 0) |
| E-mail no idioma com `confirmAccess` | ✅ | unit + log + emulador | `continueUrl` medido por idioma (`/pt-br/...`, `/en/...`); tentativas de envio registradas como `[email] failed template=action-link reason=provider-error locale=<idioma>` com o idioma do pedido (6 pt-br, 1 en, 2 es). Slug `confirmAccess` e URL da app: `authEmailLinkSignInRoute.test.ts` e `authActionLinks.test.ts`. A entrega real fica 🔒 |
| Validação na borda | ✅ | e2e + unit | `qa@x` → "Email inválido", sem requisição (contagem de POST na API inalterada). 400 da API: rota (unit) |
| Rate limit no pedido | 🔒 | unit | precisa de `ARCJET_KEY` real; a lista de paths está em `corsOrigin.test.ts` |
| Mesmo navegador entra direto | ✅ | e2e + emulador | ver item 4 acima; chave `email-link-sign-in:email` some do `localStorage` depois do sucesso |
| Outro navegador pede o e-mail | ✅ | e2e + curl | sessão limpa → "Confirme seu e-mail" / "Por segurança, digite o e-mail que recebeu este link."; `curl` do link antes de abrir: `200`, HTML com "Entrando…", e o código seguiu válido (o login no mesmo navegador funcionou depois) |
| Link usado ou expirado | ✅ | e2e + unit | reuso → "Este link não vale mais" / "Ele já foi usado ou está incompleto. Peça um link novo." + "Pedir outro link" (`/pt-br/sign-in/email-link`); `?oobCode=inventado-123` igual (375 px); `?oobCode=` vazio em en ("This link no longer works") e es ("Este enlace ya no es válido"). Região de alertas vazia. Expirado: só unit, o emulador não expira o código |
| Conta desativada não entra | ✅ | e2e | `/es`: "No se pudo iniciar sesión" / "Esta cuenta ha sido desactivada." / "Volver al inicio de sesión"; URL parada na página do link; sem `access-token` |
| Conta sem senha nunca é criada | ✅ | emulador + e2e | ver item 5; `user@example.com` depois do link: `["password"]`, `passwordHash` presente, `signInWithPassword` com a senha do seed devolve `idToken`; `/es/account?tab=security` mostra "Contraseña actual" e "Nueva contraseña" |
| Sessão já aberta | ✅ | e2e + unit | com sessão, abrir o link → `/pt-br`. "Utilizável depois do logout" vem da conclusão só no cliente (`proxy.test.ts` e o critério do leitor de link); não foi medido com logout |
| Submit repetido | ✅ | e2e + unit | duplo clique em "Enviar link" → um POST só (contagem de 3 para 4). Rajada na confirmação: unit |
| Falha de provedor nunca vira 500 | 🔒 | log + unit | parte do Resend medida: token falso, o Resend recusou e a resposta continuou `200`, log sem endereço. Provedor de link desligado e domínio não autorizado exigem projeto Firebase real |
| Sessão recusada depois do link aceito | ✅ | e2e + componente | ver item 3 |
| Paridade de i18n e copy | ✅ | unit + e2e | 67/67; strings vistas nos 3 idiomas |
| Tema e responsivo | ✅ | e2e | light e dark a 1280 px e 375 px em pt-br, en e es; erro do campo em dark com borda e texto vermelhos legíveis; sem sobreposição nem corte |

## Evidências do percurso

Os prints estão em `docs/features/magic-link-sign-in/test/e2e/` (29 arquivos, de `01-login-flag-off.png` a
`28-email-diferente-es-mobile-dark.png`). O `.gitignore` descarta a pasta; o texto acima é a prova.

- Cada cenário rodou em sessão própria do `agent-browser` (`ml` a `ml9`), com os comandos em sequência.
- O bloqueio de sessão só pegou com o URL exato (`network route "http://localhost:3000/api/auth/session" --abort`);
  o glob `**/api/auth/session` não interceptou. Ao concluir o link, o provider manda dois
  `POST /api/auth/session` (o `onAuthSuccess` e o listener do token); os dois precisam falhar para o cenário de
  sessão recusada existir.

## Observações 🟢 (nenhuma bloqueia, todas anteriores à feature)

1. Alerta de sessão recusada em inglês: "Could not establish session" aparece na tela em pt-br e es. Vem de
   `packages/auth/provider.tsx` (`new Error("Could not establish session")`), já apontado pelo `/review`; afeta
   também senha e Google.
2. Validação nativa do navegador: `nope` no campo de e-mail dispara o balão do navegador ("Please include an
   '@'…", no idioma do navegador) antes do Zod, porque o `<form>` não tem `noValidate`. O login e o "Esqueci minha
   senha" fazem o mesmo.
3. Cartão sem margem lateral no celular: a 375 px o `AuthCard` ocupa a largura toda (left 0, width 375), enquanto
   o cartão do login fica com 39 px de margem. O "Esqueci minha senha" mede igual (left 0, width 375); é o
   componente compartilhado, não esta feature.
4. Loader "Entrando…": o texto fica cerca de 280 px abaixo do spinner (`FullScreenLoader` com `min-h-[60vh]`), mas
   dentro da dobra a 375×812.

## Lacunas de teste herdadas

| Lacuna (origem) | Veredito |
|-----------------|----------|
| Nenhum teste monta o `AuthProvider` real com `signInWithEmailLink` (handoff) | Fechada aqui pelo percurso e2e (cookie, `lastAccessAt`, destino admin e onboarding medidos). Continua sem teste automatizado; montar o provider com Firebase mockado provaria só a linha `onSuccess: onAuthSuccess` |
| Comportamento real do SDK do Firebase com a URL montada (handoff) | Fechada aqui: o SDK cliente aceitou a URL e concluiu o login contra o emulador de Auth |
| "User disabled." em inglês (handoff) | Fora de escopo: texto do dicionário compartilhado com o login por senha |
| Estado pós-sucesso do `EmailLinkCompletion` (review) | Fechada: três casos novos em `emailLinkCompletion.test.tsx` |

Continuam abertas, por depender de infra externa: entrega real pelo Resend, rate limit com `ARCJET_KEY`,
provedor de link desligado ou domínio não autorizado, expiração real do link, leitor de link corporativo e a
remoção da senha de conta não verificada em projeto real (o filtro D1 impede que aconteça; a premissa vem da
documentação do Firebase).

## Cross-check

- `apps/app` × `apps/web`: só a `apps/app` tem a tela; a `apps/web` não monta o `AuthProvider` da app e passou nos
  testes (207).
- Comum × admin: comum vai à home, admin a `/admin`. Impersonação não se aplica: o fluxo é anônimo.
- `subscription` × `simple`: sem efeito.
- Light × dark, 1280 × 375 px, pt-br × en × es: percorridos.

## Ambiente do e2e

Todas as portas estavam livres no início (3000, 3001, 3002, 3003, 9099, 8080, 4001, 9199, 4400, 4500). Nada foi
reutilizado do usuário.

Subi, com variáveis de processo e sem tocar em `.env`: os emuladores (`pnpm emulators` com `JAVA_HOME` no
`openjdk@21`), o seed (`node scripts/seed-emulator.mjs` com o ambiente do emulador), a `apps/app`
(`next dev -p 3000`) e a `apps/api` (`next dev -p 3002`) três vezes: flag vazia, flag `"true"` sem Resend e flag
`"true"` com `RESEND_TOKEN`/`RESEND_FROM` de placeholder. O ambiente veio de `buildStackEnv` da `apps/e2e`, que
esvazia as credenciais do `.env` local (apontado para um projeto real) e força o projeto `demo-next-boilerplate`.

No fim, matei cada PID que subi, incluindo os filhos do emulador (o `firebase-tools` e o Java do Firestore). As
portas acima e a 9150 ficaram vazias (`lsof -ti tcp:<porta>` sem saída) e nenhuma sessão do `agent-browser`
ficou aberta. Apaguei os `firestore-debug.log` gerados na raiz e em `apps/api`. O `.next` de `apps/api` e
`apps/app` ficou (já ignorado pelo git).

## Dados de QA

Tudo no emulador, que morreu com o processo. Nada foi criado em projeto Firebase real e nada entra no
`docs/PRE-PRODUCTION.md`.

- `qa-magic-link@example.com`: cadastro pela API, e-mail confirmado no emulador, onboarding pendente.
- `qa-magic-link-unverified@example.com`: cadastro pela API, e-mail não confirmado.
- `qa-magic-link-google@example.com`: conta só Google, criada pelo `signInWithIdp` do emulador.
- `qa-magic-link-disabled@example.com`: cadastro pela API, confirmada e depois desativada no emulador.
- `qa-magic-link-nobody@example.com`: só usado no pedido, sem conta.

A senha dos cadastros de QA não foi gravada em arquivo; as contas não existem mais.
