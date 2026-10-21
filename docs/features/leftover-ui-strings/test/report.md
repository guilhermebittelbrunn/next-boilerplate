# Relatório de QA: leftover-ui-strings

Rodada autônoma do `/cycle`. Branch `guilhermebittelbrunn/cycle-command-v7` (não protegida). Não criei branch nem
commit. Resultado: todos os critérios verificados e corretos, sem defeito de produção e sem teste novo.

## Cobertura

| Comando | Resultado |
|---|---|
| `pnpm turbo run test typecheck --filter=web --filter=app --filter=@repo/internationalization` | 14/14 tarefas ok (13 do cache). `web` 23 arquivos e 184 testes, `app` 116 e 975, `@repo/internationalization` 7 e 67 (inclui a paridade pt-br/en/es) |
| `pnpm test` (raiz, com `JAVA_HOME=/opt/homebrew/opt/openjdk@21`) | 15/15 tarefas ok (12 do cache). Além dos acima: `api` 112 arquivos e 1455 testes, `api:test:emulator` 5 e 207, `e2e` 2 e 16, pacotes `shared` 56, `security` 45, `payments` 22, `next-config` 32, `auth` 132, `email` 205, `design-system` 171, `sdk` 11, `analytics` 34 |
| `pnpm --filter app build` (com o `throw` temporário, ver adiante) | Compilou, passou no TypeScript e gerou as 9 páginas estáticas, incluindo `/_global-error` |

Sem `--force`. Não remedi `pnpm check`: o `/test` não alterou código, e o `/review` mediu 968 arquivos sem correção.

Testes da feature, escritos no `/develop` e executados aqui: T1 `apps/web/__tests__/signInSchema.test.ts` (15
casos), T2 `apps/app/__tests__/passwordPolicyCopy.test.ts` (entrada `web signIn.passwordMin`), T3
`apps/app/__tests__/globalErrorLocale.test.tsx` (4 casos). Todos passaram.

## Critérios de aceite

| Critério | Status | Meio |
|---|---|---|
| Validação do login da landing no idioma da URL | ✅ | e2e + T1 |
| Troca de idioma pelo seletor não deixa mensagem no idioma anterior | ✅ | e2e |
| Mínimo de senha do login continua 6 | ✅ | T1 + T2 + e2e |
| Paridade de chaves | ✅ | teste de paridade |
| Tela de erro global da app no idioma da pessoa | ✅ | e2e em build de produção + T3 |
| O botão da tela de erro continua ligado ao `reset()` | ✅ | e2e, por inspeção do handler |
| Tema e tamanho de tela no login da landing | ✅ | e2e |
| Gates e build | ✅ | comandos |
| Cookie de idioma legível no cliente | ✅ | e2e + cabeçalho HTTP |

Texto completo de cada critério em `test/criterios-aceite.md`.

## Decisões de custo de teste

Não criei teste. A passada de navegador cobriu o que faltava, e nada aqui tem a infra como objeto.

| Módulo tocado | Decisão |
|---|---|
| `apps/web/.../signInSchema.ts` | O T1 cobre as mensagens dos três idiomas e o limite de 6 caracteres |
| `apps/web/.../sign-in-form-client.tsx` | Sem teste de componente, como o plano decidiu. A ligação schema, formulário e mensagem foi medida no navegador nos três idiomas, e um teste de componente repetiria essa prova |
| `apps/app/app/global-error.tsx` | O T3 cobre o render por cookie e o caso sem cookie. O caminho real, com o root layout quebrando em build de produção, foi medido no navegador |
| Chaves em `packages/internationalization` | O teste de paridade existente cobre as chaves novas |

## Verificar no `/test`

| Item do `review.md` | Veredito |
|---|---|
| 1. Ligação schema, formulário e mensagem no login da landing | **Confirmado.** Textos medidos na seção de evidências, iguais ao dicionário nos três idiomas, no envio vazio e com `qa@example` + `12345` |
| 2. Mensagens em espanhol a 375 px, claro e escuro | **Confirmado.** A mensagem de senha quebra em duas linhas (40 px de altura) e fica dentro do cartão. Sem rolagem horizontal |
| 3. Tela de erro global no caminho real | **Confirmado** em `next build && next start`, com título, botão e `lang` corretos em en, es e pt-br |
| 4. Build pré-renderiza `/_global-error` | **Confirmado.** O build termina sem erro e gera `.next/server/app/_global-error.html` |
| R1 do plano (cookie legível no cliente; listado no handoff) | **Confirmado.** `set-cookie: x-locale=en; Path=/`, sem `HttpOnly`, e `document.cookie` devolve `x-locale=<idioma>` na tela de erro |

## Evidências e2e

### Login da landing (`apps/web`, `next dev` na 3001, sem sessão)

Depois de cada envio, o probe leu o texto das mensagens do formulário, os campos com `aria-invalid="true"`, o `lang`
do `<html>` e a classe de tema.

| URL | `lang` | Cenário | Mensagens exibidas |
|---|---|---|---|
| `/pt-br/sign-in` | `pt-br` | vazio e `qa@example` + `12345` | "Email inválido" / "A senha deve ter pelo menos 6 caracteres" |
| `/en/sign-in` | `en` | vazio e `qa@example` + `12345` | "Invalid email" / "Password must be at least 6 characters" |
| `/es/sign-in` | `es` | vazio e `qa@example` + `12345` | "Email no válido" / "La contraseña debe tener al menos 6 caracteres" |

- Em todos os casos, `email` e `password` ficaram com `aria-invalid="true"`.
- `qa@example` passou na validação nativa (`validity.valid === true`), então a mensagem veio do Zod.
- Em pt-br, depois do envio, trocar a senha por `123456` removeu só a mensagem da senha, e "Email inválido" continuou.
- Troca de idioma no cliente: com as mensagens em espanhol na tela, escolhi "English" no seletor. A URL foi para
  `/en/sign-in` sem recarregar (a entrada de navegação continuou `/es/sign-in`), o formulário voltou vazio e sem
  mensagem, e o envio seguinte mostrou "Invalid email" e "Password must be at least 6 characters".
- Tema e tela: desktop claro nos três idiomas, desktop escuro em en, 375 px claro em es e 375 px escuro em es, pt-br
  e en. No escuro a classe `dark` estava no `<html>` e a mensagem saiu em `lab(63.7 60.7 31.3)` sobre fundo
  `lab(2.75 0 0)`. No claro, `lab(48.4 77.4 61.5)` sobre `lab(100 0 0)`. Pela luminância derivada do L*, o contraste
  fica perto de 7:1 no escuro e 4,7:1 no claro. A 375 px, as mensagens ocupam x 33 a 327 px dentro de um cartão de 0 a
  360 px, e `scrollWidth` do documento é 360 (viewport 375 menos a barra de rolagem).

### Tela de erro global (`apps/app`, `next build && next start` na 3000)

Inseri um `throw` temporário em `apps/app/app/layout.tsx`, logo depois do `Promise.all`, para que as rotas
continuassem dinâmicas e o build não quebrasse no pré-render. O servidor respondeu 500 em `/en/sign-in` com a casca
`<html id="__next_error__">`, e o log registrou o erro forçado. O cliente renderizou o `global-error`:

| Visita | Cookie lido | `lang` | `<h1>` | Botão |
|---|---|---|---|---|
| `/en` (redireciona para `/en/sign-in`) | `x-locale=en` | `en` | "Oops, something went wrong" | "Try again" |
| `/es` | `x-locale=es` | `es` | "Ups, algo salió mal" | "Intentar de nuevo" |
| `/pt-br` | `x-locale=pt-br` | `pt-br` | "Ops, algo deu errado" | "Tentar novamente" |

O `onClick` do botão no navegador é `()=>e()`, a chamada de `reset` minificada. Clicar em "Tentar novamente" com o
layout ainda quebrado manteve a tela, sem erro novo no console.

Screenshots em `test/e2e/` (de `01-ptbr-vazio-light.png` a `12-global-error-es-dark.png`) servem só de apoio: o
`.gitignore` descarta a pasta. Nenhum print tem e-mail ou nome de pessoa real.

### Incidente do instrumento

Durante a passada, um `agent-browser wait --url` ficou preso e eu matei o processo pelo PID. A sessão do navegador
travou: cliques deixaram de chegar à página e um envio pareceu não mostrar mensagens. Fechei a sessão e refiz o
cenário do zero, e aí o comportamento foi o descrito acima. O falso negativo veio do instrumento, não da app.

## Observações fora de escopo (para o `/spec --sync`)

- A tela de erro global da app sai sem estilo: fonte serifada padrão, botão nativo, fundo transparente e texto preto
  mesmo com `prefers-color-scheme: dark`, porque o `global-error` não importa `styles.css` nem aplica tema. Era
  observação não medida no plano (§1.5). Agora está medida.
- No login da landing a 375 px, o cartão encosta na borda esquerda da tela (x 0). É layout anterior a esta tarefa.

## Lacunas herdadas

| Lacuna | Veredito |
|---|---|
| Sem teste de componente do `sign-in-form-client.tsx` | **Fechada aqui** pela passada de navegador nos três idiomas. Não recomendo teste novo |
| O T3 não clica no botão para conferir `reset()` | **Continua aberta** em teste automatizado. No navegador, o handler está ligado e o clique não quebra. O `onClick` não mudou neste diff |
| `noValidate` no login da landing, `global-error` inerte da `apps/web`, tela de erro da app sem `styles.css` | **Fora de escopo**, com o `/spec --sync`. A terceira agora tem medição (acima) |

## Ambiente do e2e

| Serviço | Origem | Fim |
|---|---|---|
| `pnpm --filter web dev` (3001) | Subi (porta livre) | Derrubei por PID. Nada escutando na 3001 |
| `pnpm --filter app start` (3000), depois de `pnpm --filter app build` | Subi (porta livre) | Derrubei por PID. Nada escutando na 3000 |
| Emuladores de Auth/Firestore | Subiram e caíram dentro do `api:test:emulator` | 8080 e 9099 livres ao final |
| Sessão `leftover` do `agent-browser` | Abri | Fechada |

Não reutilizei serviço do usuário: todas as portas estavam livres no início. API (3002) e emulador não foram
necessários para o e2e, porque o login não chega a ser chamado.

## Estado alterado e limpeza

- `apps/app/app/layout.tsx` voltou ao original a partir de uma cópia de segurança. `git diff` no arquivo sai vazio.
- Apaguei `apps/app/.next`, que não existia antes desta rodada e continha o build com o `throw`.
- Nenhuma conta, dado de dev ou dado de QA criado. Nenhuma senha, token ou chave neste relatório.
