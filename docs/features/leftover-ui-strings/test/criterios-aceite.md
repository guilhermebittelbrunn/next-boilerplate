# Critérios de Aceite (Checklist)

Status ao lado de cada título: ✅ verificado e correto, ❌ falha, 🔒 não verificável sem infra externa. O meio da
verificação e os valores medidos estão em `test/report.md`.

- [x] **Validação do login da landing no idioma da URL** ✅ (e2e + T1)
  Em `/pt-br/sign-in`, `/en/sign-in` e `/es/sign-in`, sem sessão, enviar o formulário vazio mostra as duas mensagens
  do Zod no idioma da URL: "Email inválido" e "A senha deve ter pelo menos 6 caracteres" em pt-br, "Invalid email" e
  "Password must be at least 6 characters" em en, "Email no válido" e "La contraseña debe tener al menos 6 caracteres"
  em es. O mesmo vale para `qa@example` com senha de 5 caracteres: esse e-mail passa na validação nativa do navegador
  (`validity.valid` verdadeiro) e o Zod o recusa. Os dois campos ficam com `aria-invalid="true"`. Valor sem `@` não
  entra no critério, porque o balão nativo do navegador aparece antes do Zod e no idioma do navegador (fora de escopo).

- [x] **Troca de idioma pelo seletor da landing não deixa mensagem no idioma anterior** ✅ (e2e)
  Com as mensagens em espanhol na tela, trocar para English pelo seletor de idioma faz navegação no cliente para
  `/en/sign-in`, sem recarregar a página. O formulário volta vazio e sem mensagens, e o próximo envio mostra o texto em
  inglês. Nenhuma mensagem fica presa no idioma anterior, porque o schema é montado a partir do dicionário corrente.

- [x] **Mínimo de senha do login continua 6** ✅ (T1 + T2 + e2e)
  Senha de 6 caracteres passa e de 5 é recusada nos três idiomas. O login aceita contas criadas antes da política de 8
  caracteres, então a mensagem cita 6 e nunca 8 (T2 confere o texto de cada idioma). Na tela, depois do envio com
  `12345`, digitar `123456` apaga só a mensagem da senha, e a do e-mail continua.

- [x] **Paridade de chaves** ✅ (teste de paridade)
  `apps.web.pages.signIn.validation` e `apps.app.pages.common.globalError` existem com as mesmas chaves em pt-br, en
  e es, e o teste de paridade de `@repo/internationalization` passa. Nenhuma chave existente foi renomeada ou
  removida.

- [x] **Tela de erro global da app no idioma da pessoa** ✅ (e2e em build de produção + T3)
  Com o root layout quebrando em `next build && next start`, visitar `/en` mostra "Oops, something went wrong", o botão
  "Try again" e `<html lang="en">`. Em `/es`, "Ups, algo salió mal", "Intentar de nuevo" e `lang="es"`. Em `/pt-br`,
  "Ops, algo deu errado", "Tentar novamente" e `lang="pt-br"`. O idioma vem do cookie `x-locale`, que o proxy grava na
  resposta. Sem cookie, o T3 confere a queda para o idioma padrão (`pt-br` com `NEXT_PUBLIC_DEFAULT_LOCALE` vazio).
  Antes da mudança, a tela mostrava sempre o texto em inglês com `lang="en"`.

- [x] **O botão da tela de erro continua ligado ao `reset()`** ✅ (e2e, por inspeção do handler)
  O botão renderizado no navegador tem `onClick` igual a `()=>e()`, a chamada de `reset` minificada. Clicar nele com o
  layout ainda quebrado mantém a tela de erro, sem travar e sem erro novo, o que é o comportamento esperado do Next
  quando a falha persiste. Nenhum teste automatizado clica no botão. O `onClick` não mudou neste diff.

- [x] **Tema e tamanho de tela no login da landing** ✅ (e2e)
  A 375 px, nos temas claro e escuro, as mensagens ficam dentro do cartão (x 33 a 327 px num cartão de 0 a 360 px), e a
  mensagem de senha em espanhol, a mais longa, quebra em duas linhas sem estourar a largura. O documento não ganha
  rolagem horizontal. O contraste calculado da mensagem fica perto de 4,7:1 no claro e 7:1 no escuro.

- [x] **Gates e build** ✅ (comandos)
  `pnpm test` da raiz passa, incluindo `test:emulator` com JDK 21. `typecheck` de `web`, `app` e
  `@repo/internationalization` passa. `pnpm check` não foi remedido, porque o `/test` não mexeu em código e o `/review`
  mediu 968 arquivos sem correção. `pnpm --filter app build` termina sem erro e gera `/_global-error`
  (`.next/server/app/_global-error.html`) com o `getDictionary()` no servidor.

- [x] **Cookie de idioma legível no cliente** ✅ (e2e + cabeçalho HTTP)
  A resposta da app traz `set-cookie: x-locale=en; Path=/`, sem `HttpOnly`, e `document.cookie` lê `x-locale=<idioma>`
  na tela de erro. É disso que a tela depende quando o root layout não chega a montar o `LocaleProvider`.
