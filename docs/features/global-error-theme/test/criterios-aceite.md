# Critérios de aceite: estilo e tema nas telas de erro global

Medidos no `/test` de 2026-10-21, em build de produção (`next build` + `next start`) das duas apps, com um `throw`
temporário depois do `Promise.all` de cada root layout. O resultado e o meio de cada item estão em `test/report.md`.

Legenda: ✅ passou na medição · ❌ falhou · 🔒 não verificável sem infra externa.

# Critérios de Aceite (Checklist)

- [x] ✅ **A tela de erro global da app sai com o CSS do app no build de produção**
  O HTML da resposta 500 é o shell `__next_error__` do Next e não traz `<link rel="stylesheet">`. Ele traz o `preload`
  dos dois CSS do app no `<head>` e a entrada `"G"` do payload RSC com os dois como `rel: stylesheet`. Depois da
  montagem, o DOM tem os dois `link[rel=stylesheet]` e a tela usa Geist no título, o fundo do token `--background` e o
  botão do design system. Fonte serifada, botão nativo ou fundo transparente reprovam o critério.

- [x] ✅ **A tela de erro global da landing sai com o CSS da landing no build de produção**
  O mesmo vale para a `apps/web`, com o CSS de `app/[locale]/styles.css`, em `/pt-br`, `/en` e `/es`. O contêiner
  precisa ter, nos estilos calculados, altura mínima igual à da janela e fundo `bg-muted/30`. Isso prova que o
  Tailwind gerou as classes que só existem nesse arquivo.

- [x] ✅ **Sem escolha salva, a tela segue o tema do sistema**
  Com `localStorage.theme` ausente, a tela fica clara com o sistema claro e escura com o sistema escuro, nas duas apps.
  O `<html>` recebe a classe `light` ou `dark`, o `color-scheme` acompanha, e o fundo do `<body>` muda junto. Tela
  clara com o sistema escuro reprova.

- [x] ✅ **Com escolha salva, a escolha vence o sistema**
  Com `localStorage.theme = "dark"` e o sistema claro, a tela fica escura. Com `"light"` e o sistema escuro, fica
  clara. Vale nas duas apps, e garante que quem trocou o tema no seletor vê aqui o mesmo tema das outras páginas.

- [x] ✅ **A tela cabe em 375 px nos dois temas**
  A 375 px não há rolagem horizontal (`scrollWidth` igual a `innerWidth`), o card aparece inteiro e o botão ocupa a
  largura útil do card. Vale no claro e no escuro, nas duas apps.

- [x] ✅ **O idioma continua certo nos três idiomas**
  Em `/pt-br`, `/en` e `/es`, o `lang` do `<html>`, o título e o rótulo do botão saem do dicionário de cada app
  (`apps.app.pages.common.globalError` e `apps.web.pages.error`). Sem cookie de idioma, o padrão é `pt-br`. Nenhum
  texto fixo em inglês aparece em outro idioma.

- [x] ✅ **O botão de tentar de novo funciona**
  Clicar em "Tentar novamente" com o layout ainda quebrado mostra a tela de erro de novo, sem página em branco. Um
  segundo clique seguido dá o mesmo resultado. Cada clique registra no console o mesmo erro do servidor, com o mesmo
  `digest`, e nenhum erro de outro tipo. O botão não buscar de novo no servidor é comportamento do Next e não reprova.

- [x] ✅ **Sem aviso de hidratação no `<html>`**
  Em build de produção, o carregamento da tela não registra erro de hidratação nem aviso sobre o `<script>` do tema.
  O único erro do console é o do Server Component que quebrou, um por carregamento.

- [x] ✅ **A tela não mostra detalhes do erro**
  A mensagem `global-error probe` e o `digest` não aparecem no texto da página em nenhum idioma, nas duas apps, nem no
  HTML da resposta 500.

- [x] ✅ **As páginas normais não baixam CSS a mais**
  Sem o `throw`, todo CSS que a entrada `"G"` do payload lista também está entre os CSS que o layout já carrega, nas
  duas apps. Uma página normal continua com os mesmos dois arquivos de CSS.

- [x] ✅ **Testes e gates**
  `globalErrorLocale.test.tsx` da app com 8 casos e o da web com 9 passam, junto com a suíte das duas apps e o
  `pnpm test` da raiz. `pnpm check` e o `typecheck` das duas apps saem limpos. O build das duas apps termina com exit 0
  depois de tirar o `throw`.
