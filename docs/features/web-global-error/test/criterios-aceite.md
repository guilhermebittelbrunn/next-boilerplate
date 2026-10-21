# Critérios de Aceite (Checklist)

- [x] **A landing usa a própria tela de erro global**
  Com o root layout da landing quebrado num build de produção (`next build` + `next start`), a tela mostrada é a de
  `apps/web/app/global-error.tsx`, e não a embutida do Next. O texto "Application error: a server-side exception has
  occurred" não aparece em nenhum dos três idiomas. O arquivo `apps/web/app/[locale]/global-error.tsx` não existe mais,
  e nenhum artefato do build aponta para ele. Na linha de base (arquivo de volta em `[locale]`), a mesma requisição
  mostra a tela embutida, o que prova que é o lugar do arquivo que decide qual tela aparece.

- [x] **Título e botão no idioma da URL**
  Em `/pt-br`, a tela mostra "Ops, algo deu errado" e o botão "Tentar novamente"; em `/en`, "Oops, something went
  wrong" e "Try again"; em `/es`, "Ups, algo salió mal" e "Intentar de nuevo". O idioma vem do cookie `x-locale` que o
  proxy grava na mesma resposta, então a URL vence um cookie antigo de outro idioma (cookie `en` e visita a `/es` dão a
  tela em espanhol). Visitar `/` sem cookie redireciona (307) para `/pt-br/`, grava `x-locale=pt-br` e mostra o texto em
  português.

- [x] **`lang` do documento**
  O `<html>` da tela de erro, depois de montado no navegador, tem `lang` igual ao idioma da URL (`pt-br`, `en` ou
  `es`). A tela embutida não tinha `lang`. Sem cookie, o valor é o idioma padrão (`pt-br` quando
  `NEXT_PUBLIC_DEFAULT_LOCALE` não está definido), nunca vazio. A casca HTML que o servidor devolve com o status 500
  continua sendo `<html id="__next_error__">` sem `lang`; o atributo aparece quando o React monta a tela no cliente.

- [x] **O botão tenta de novo**
  Clicar no botão chama `reset()`: o React volta a renderizar a árvore, o layout quebra outra vez e a tela de erro
  continua de pé, com o mesmo texto. Cada clique registra no console o mesmo erro original do servidor (mesmo `digest`),
  e nenhum erro diferente, nem exceção não tratada na página, nem requisição de rede. Cliques repetidos têm o mesmo
  efeito.

- [x] **Nenhum detalhe do erro na tela**
  A tela não mostra `error.message`, stack nem `digest`. A tela embutida mostrava "Digest: <número>" no texto visível. O
  `digest` continua no payload RSC embutido no HTML e no console do navegador, que é o comportamento padrão do Next e
  não aparece para quem visita.

- [x] **A resposta continua sendo um erro**
  A requisição a uma página com o root layout quebrado responde HTTP 500, com `Content-Type: text/html` e o cookie
  `x-locale` do idioma da URL. Trocar a tela não muda o status nem esconde o erro do servidor, que segue registrado no
  log do `next start` com a mensagem e o `digest`.

- [x] **Build e gates**
  `pnpm --filter web build` termina sem erro e gera `/_global-error` (`_global-error.html`, `.meta`, `.rsc`,
  `.segments`) sem exigir `app/layout.tsx` na raiz, com e sem o layout quebrado. `pnpm --filter web typecheck` e
  `pnpm --filter web test` passam com o teste novo `globalErrorLocale.test.tsx`, e o `pnpm test` da raiz passa inteiro.
  Nenhum arquivo do diff de `leftover-ui-strings` foi alterado.

- [x] **Tema e tamanho de tela (observação, fora de escopo)**
  A tela sai sem estilo: fundo transparente sobre branco, texto preto, título em Times e botão nativo do navegador.
  Com `prefers-color-scheme: dark` a aparência é a mesma, e a 375 px não há rolagem horizontal (`scrollWidth` 375). O
  plano deixou estilo e tema fora do corte; o critério confere só que a tela continua legível nos dois temas e no
  celular.
