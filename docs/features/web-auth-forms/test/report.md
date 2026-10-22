# Relatório de QA: formulários de login e cadastro da landing

Branch `web/fix/auth-forms` (não protegida). Escopo: o diff de `apps/web` (dois `*-form-client.tsx`, um teste
novo e dois editados pelo `/develop`) mais um teste novo deste passo. Resultado: 11 critérios ✅, 0 ❌, 1 🔒. Não
encontrei defeito de produção no escopo do diff.

## Cobertura

| Comando | Resultado |
|---|---|
| `pnpm --filter web test` (antes do teste novo) | 25 arquivos, 199 testes, todos passando |
| `pnpm --filter web exec vitest run __tests__/signUpFormValidation.test.tsx` | 1 arquivo, 4 testes, todos passando |
| `pnpm --filter web test` (depois do teste novo) | 26 arquivos, 203 testes, todos passando |
| `pnpm --filter web typecheck` | exit 0 |
| `pnpm check` | `Checked 971 files in 533ms. No fixes applied.` |
| `pnpm test` (raiz, com `JAVA_HOME` no JDK 21, sem `--force`) | 15 de 15 tasks, 13 do cache. `web` 203, `api` 1455, `api:test:emulator` 207, `app` 975 e os pacotes, 3631 testes no total, todos passando |
| Paridade de i18n | não rodei à parte: o diff não toca `packages/internationalization` nem cria `error.code`. Ela roda dentro do `pnpm test` (`@repo/internationalization` 67 testes) |

### Teste criado

`apps/web/__tests__/signUpFormValidation.test.tsx` (jsdom no arquivo, mesmo molde do `signInFormRedirect.test.tsx`):
o cadastro em `es` mostra "Email no válido" para `abc`, `qa@example` e campo vazio sem chamar a criação da conta,
e cria a conta quando o e-mail é válido. Medi por mutação: com o `noValidate` removido do `<form>` do cadastro, o
caso `abc` falha (o jsdom aplica a validação nativa de `type="email"` e o submit não chega ao Zod). Restaurei o
arquivo e conferi com `cmp` que ficou idêntico ao do working tree.

## Decisões de custo de teste

| Módulo tocado | Decisão |
|---|---|
| `sign-in-form-client.tsx` | Nenhum teste novo. O `signInFormRedirect.test.tsx` (6 casos) já cobre o efeito, o ref e o `noValidate`. A ordem real entre o efeito e o `onAuthSuccess` do provider é coisa do navegador e foi medida no e2e (F3); um teste de unidade com o provider real teria de mockar Firebase e router juntos e não provaria essa ordem. |
| `sign-up-form-client.tsx` | Um teste novo, na faixa barata (jsdom, milissegundos): a mensagem do Zod com `noValidate`, que o handoff e o review listavam como lacuna. O pedido de verificação e o modo degradado já estavam cobertos no `signUpFormApi.test.tsx`. |
| Rota `POST /auth/email-verification/send` | Não foi tocada. O `apps/api/__tests__/authEmailVerification.test.ts` já cobre `EMAIL_NOT_CONFIGURED`. |
| Faixa cara | Nenhum teste criado. Subi o emulador só para a passada de navegador, não para teste persistente. |

## Verificar no `/test`: vereditos

| # | Item do `review.md` | Veredito |
|---|---|---|
| 1 | F3, `?redirect=` preservado depois do login pela tela | **Confirmado.** 4 de 4 tentativas com e-mail e senha (três com `user@example.com`, uma com `user2@example.com`) e 1 com o Google terminaram em `/pt-br/contact`. Com um gancho em `history.pushState`/`replaceState`, o log das tentativas 2 a 5 registrou uma única navegação, `pushState /pt-br/contact`, sem passar por `/pt-br`. |
| 2 | F4, cadastro sem Resend | **Confirmado** nos três idiomas. `POST /auth/sign-up` 201 seguido de `POST /auth/email-verification/send` 503, corpo `{"locale":"pt-br"}`, `{"locale":"en"}` e `{"locale":"es"}`, resposta `{"error":{"code":"EMAIL_NOT_CONFIGURED"}}`. O `Authorization: Bearer` trazia um ID token com `email` igual ao da conta recém-criada e `sign_in_provider: password`. A pessoa terminou em `/<locale>` com o header logado. A região de toasts mostrou só "Login realizado com sucesso!" durante 5 s. Console sem erro, só o aviso preexistente do Next sobre `scroll-behavior: smooth`. |
| 3 | F2, quem chega autenticado | **Confirmado.** Logado, `/pt-br/sign-in`, `/en/sign-in` e `/es/sign-in` abertos pela barra terminaram em `/pt-br`, `/en` e `/es`. Depois de sair da landing e entrar só pela app em `:3000`, abrir `http://localhost:3001/pt-br/sign-in` terminou em `/pt-br` com o header logado (sessão adotada pelo cookie compartilhado). |
| 4 | Fim de sessão | **Confirmado, por simulação.** Logado em `/pt-br/contact`, um script de init respondeu à próxima `POST /api/auth/session/refresh` com `401 {"error":{"code":"AUTH_SESSION_REVOKED"}}`, depois de chamar o `DELETE /api/auth/session` real para limpar o cookie, como o servidor faz. Ao recarregar, o log registrou `replaceState /pt-br/sign-in?redirect=%2Fpt-br%2Fcontact`, o formulário apareceu e, ao entrar de novo, a URL final foi `/pt-br/contact`. Não revoguei a sessão pelo servidor; a resposta simulada é a mesma que o `session-routes.ts` devolve. |
| 5 | F5, mensagens do Zod sem balão nativo | **Confirmado** nos 2 formulários × 3 idiomas × 3 entradas (18 combinações). `form.noValidate === true` em todas, `input.type` continua `email`, o submit chega ao Zod e a mensagem aparece no idioma da URL ("Email inválido", "Invalid email", "Email no válido"; senha curta: 6 caracteres no login, 8 no cadastro). Nenhuma chamada à API. |
| 6 | F6, recuo a 375 px | **Confirmado.** Viewport de 375 px: o headless reserva 15 px de barra de rolagem, então a largura útil foi 360 px, com cartão de 328 px a 16 px de cada borda e `scrollWidth` igual à largura útil (sem rolagem horizontal), nos dois cartões, claro e escuro. A 768 px e a 1280 px o cartão tem 448 px e fica centralizado (152,5 px e 408,5 px de cada lado), nos dois temas. O tema escuro aplica `dark` no `<html>`, fundo `lab(2.75 0 0)`, borda do cartão `lab(15.2 0 0)` e título `lab(98.26 0 0)`. |

## Critérios de aceite

Lista completa em [`criterios-aceite.md`](criterios-aceite.md).

| Critério | Status | Meio |
|---|---|---|
| Login pela tela leva à home do idioma | ✅ | e2e (pt-br, en, es; senha errada com toast "Senha incorreta.") |
| Visitante já autenticado não vê página vazia | ✅ | e2e (3 idiomas + SSO pela app) e unit (`signInFormRedirect`) |
| `?redirect=` continua valendo | ✅ | e2e (4× e-mail, 1× Google, `//evil.com` e `/contact` caem em `/pt-br`) |
| Fim de sessão volta à origem | ✅ | e2e com resposta simulada |
| Cadastro pede o e-mail de verificação | ✅ | e2e (3 idiomas; Google sem pedido à API) e unit (`signUpFormApi`) |
| Falha no pedido não estraga o cadastro | ✅ | e2e (503) e unit (rejeição do pedido e do `getIdToken`) |
| Erro na criação da conta continua como antes | ✅ | e2e (`USERS_AUTH_EMAIL_ALREADY_IN_USE`, duplo clique = 1 POST) e unit |
| Validação só pelo Zod, traduzida | ✅ | e2e (18 combinações) e unit (`signInFormRedirect`, `signUpFormValidation`) |
| Recuo a 375 px e centralizado em telas largas | ✅ | e2e (medição de `getBoundingClientRect`) |
| Gates | ✅ | comandos acima |
| Entrega real do e-mail | 🔒 | depende de Resend, `NEXT_PUBLIC_APP_URL` e `FIREBASE_WEB_API_KEY` reais |

## Evidências e2e

Prints em `docs/features/web-auth-forms/test/e2e/`, que o `.gitignore` descarta (`docs/features/**/test/e2e/`). O
texto acima é a prova; os prints serviram para eu conferir:

- `01-es-sign-up-zod-abc.png`: cadastro em `es`, escuro, 1280 px. "Email no válido" abaixo do e-mail e "La
  contraseña debe tener al menos 8 caracteres" nos dois campos de senha, bordas vermelhas, sem balão nativo.
- `02-pt-br-sign-in-senha-errada.png`: login em pt-br com senha errada, toast "Senha incorreta.".
- `03-en-sign-in-375-light.png`: login em `en`, claro, 375 px. O cartão começa na mesma coluna do logo do header.
- `04-es-sign-up-375-dark.png`: cadastro em `es`, escuro, 375 px, mesmo alinhamento.

Nenhum print mostra dado de pessoa real; só contas `@example.com`.

## Ambiente do e2e

Todas as portas estavam livres antes (3000, 3001, 3002, 3003, 8080, 9099, 9199, 4001, 4400, 4500). Não reutilizei
nada do usuário.

- Subi `pnpm emulators` (Auth, Firestore e Storage, projeto `demo-next-boilerplate`, JDK 21 via `JAVA_HOME`),
  rodei `pnpm seed` e subi `api` (3002), `web` (3001) e `app` (3000) com `next dev`. O ambiente de cada servidor
  veio do `buildStackEnv` do `apps/e2e` (`.env.example` + bloco do emulador, credenciais do Firebase e
  `RESEND_TOKEN` vazios), para o `.env` local, que aponta para um projeto real, não ser lido. Na `web` acrescentei
  `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_WEB_URL` com as URLs locais.
- No fim matei os PIDs que guardei, depois os `next-server` filhos presos às portas que eu abri, e mandei SIGINT
  ao `firebase-tools`. Conferi com `lsof`: 3000, 3001, 3002, 8080, 9099, 9199, 4001, 4400, 4500 e 9150 ficaram
  livres. O `pnpm test` final subiu e derrubou os próprios emuladores.
- Apaguei o harness temporário (`/tmp/wa-qa`: env, scripts do navegador, init script). No repo ficou só o teste
  novo.

## Lacunas: vereditos

| Lacuna herdada | Veredito |
|---|---|
| Nenhum teste prova a ordem entre o efeito do login e o `onAuthSuccess` do provider real | **Fechada no navegador** (F3, 5 tentativas com log de navegação). Continua sem teste automatizado: o lugar dele seria a suíte Playwright (`pnpm e2e`), que fica fora deste corte. |
| O cadastro não tem teste em jsdom da mensagem do Zod com `noValidate` | **Fechada** com `signUpFormValidation.test.tsx`, que falha sem o `noValidate`. |
| `px-4 md:px-2` sem teste | **Fechada no navegador** (F6). Sem teste persistente; fora de escopo de teste de unidade, como o plano previa. |
| 🟢 do review: `signInStartedHereRef` não volta a `false`, e a tela fica vazia quando o Firebase aceita a credencial e o cookie é recusado | **Continua aberta, fora de escopo.** Não medi; o caminho exige forçar recusa do cookie no `POST /api/auth/session`. Já está registrada como achado para o `/spec --sync`. |
| 🟢 do review: quem chega autenticado com `?redirect=` vai para `/<locale>` | **Confirmado como comportamento atual** (`/en/sign-in?redirect=%2Fen%2Fcontact` logado terminou em `/en`). Fora do corte (§1.5 do plano). |
| 🟢 do review: `consoleErrorSpy.mockRestore()` só roda quando as asserções passam | **Continua aberta.** Nit de teste, sem efeito enquanto a suíte está verde. |

## Achados adjacentes (fora do diff, preexistentes)

- **Copy do rodapé do cadastro.** Na página de cadastro, a chave `apps.web.pages.signUp.noAccount` diz "Não tem
  uma conta?" / "Don't have an account?" / "¿No tienes una cuenta?" ao lado do link "Entrar" / "Sign In" /
  "Iniciar sesión". A pergunta certa para essa página seria "Já tem uma conta?". O subtítulo em `es`, "Regístrate
  en tu cuenta para continuar", também soa errado, e a chave equivalente do login em `es` não tem o "¿" de
  abertura ("No tienes una cuenta? "). Fica para o `/spec --sync`.
- **Dois `POST /api/auth/session` por login com Google** na landing, um por `AuthProvider` aninhado. É o mesmo
  achado do §1.6 do plano.
- Na primeira tentativa da simulação de fim de sessão, respondi o 401 sem limpar o cookie; o provider deslogou, a
  sessão foi adotada de novo pelo cookie que continuava válido e o formulário mandou para `/pt-br`. Isso é
  artefato da simulação incompleta: o servidor real sempre limpa o cookie junto com o 401. Repeti limpando o
  cookie e o resultado está no item 4 acima.

## Dados de QA

Todos no emulador. O estado morreu com o processo e nenhum projeto Firebase real foi tocado, então nada entra no
`docs/PRE-PRODUCTION.md`.

- Contas criadas pelo cadastro da landing: `qa-web-auth-forms-1@example.com` (pt-br), `-2` (en), `-3` (es), `-4`
  (pt-br; usada também na tentativa de e-mail repetido) e `-5` (pt-br).
- Contas criadas pelo Google do emulador: `qa-web-auth-forms-google@example.com` (login) e
  `qa-web-auth-forms-google2@example.com` (cadastro).
- Contas do seed usadas no login: `user@example.com` e `user2@example.com`, com a senha documentada em
  `docs/SETUP.md`.

Nenhuma senha está gravada neste arquivo.

## Estado de dev alterado

Nenhum. O working tree ganhou só `apps/web/__tests__/signUpFormValidation.test.tsx` e os artefatos desta pasta.
