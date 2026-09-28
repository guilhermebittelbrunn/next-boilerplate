# Critérios de Aceite (Checklist)

Base: seção 9 do `analyze/plan.md` e a lista "Verificar no `/test`" do `review/review.md`. Separei em
critérios próprios o fallback no HTML do servidor, os ícones da web e o remetente com nome não ASCII, porque
cada um tem prova e veredito diferentes. O status de cada item e o meio de prova estão em `test/report.md`.

Legenda do status: ✅ verificado e correto · ❌ falha · 🔒 sem como verificar sem infraestrutura externa.

- [x] **Sem nenhuma variável de marca, tudo sobe com o padrão neutro** ✅
  Com `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_LOGO_URL` e `NEXT_PUBLIC_APP_SUPPORT_EMAIL` vazias (`""`,
  como no `.env.example`) ou só com espaços (`"   "`), `next build` passa em app, web e api, e app e web
  sobem com `next start`. O nome exibido é `next-boilerplate` no `<title>`, no `og:site_name`, na barra
  lateral, no painel de entrada, no header, no footer e no JSON-LD. A barra lateral mostra a inicial `N`, o
  painel de entrada mostra o ícone `lucide-command` e o header da web mostra o triângulo. Nenhum e-mail traz
  linha de suporte, e o `from` segue o `RESEND_FROM` sem alteração quando não há nome configurado.

- [x] **Um nome configurado aparece em todas as superfícies** ✅
  Com `NEXT_PUBLIC_APP_NAME="  QA Brand  "`, o nome aparece sem os espaços das pontas na barra lateral comum
  e admin, no painel de login, cadastro, recuperação e redefinição de senha e verificação de e-mail, no
  `<title>` e no `og:site_name` do app e da web, no header e no footer da web, no `Organization` e no
  `WebSite` do JSON-LD e no cabeçalho, na assinatura e no rodapé dos três e-mails. Um nome só com espaços
  conta como ausente e devolve `next-boilerplate`. O assunto do e-mail usa o mesmo nome, coberto pelo teste
  de template.

- [x] **O logo configurado substitui o fallback, e um logo inválido é ignorado** ✅
  Com uma URL `https` pública de PNG real, barra lateral (expandida e recolhida, comum e admin), painel de
  entrada, header da web e cabeçalho dos e-mails mostram a imagem carregada, com `alt=""` onde o nome está ao
  lado e `alt` com o nome no e-mail. Valor relativo (`/logo.png`), `javascript:`, `ftp:`, texto qualquer,
  só espaços e host com `;`, `,`, `'` ou `*` contam como ausentes: cada superfície mostra o fallback e nenhum
  `src` vazio sai no HTML.

- [x] **Logo que não carrega mantém o fallback** ✅
  Com uma URL válida que responde 404, o Avatar do Radix nunca troca o fallback pela imagem: a barra lateral
  mostra a inicial, o painel mostra o ícone genérico e o header mostra o triângulo. Não aparece ícone de
  imagem quebrada, e nenhum `<img>` com `naturalWidth` zero fica no DOM.

- [x] **O HTML do servidor já traz o fallback, e a troca pela imagem não mexe no layout** ✅
  Mesmo com logo configurado, a resposta do servidor contém `data-slot="avatar-fallback"` com o ícone no
  painel de entrada e o triângulo no header da web, sem `<img>`. O Avatar tem tamanho fixo (32 px na barra
  lateral, 24 px no painel, 18 px no header), igual com fallback e com imagem, então o nome ao lado não se
  desloca quando a imagem entra.

- [x] **O CSP deixa passar o logo e só ele** ✅
  Com logo num host externo, o `content-security-policy` do app inclui a origem do logo em `img-src`, a
  imagem carrega e outra origem é bloqueada com violação `img-src` em modo `enforce`. A web, em
  report-only, recebe a mesma origem: o logo carrega sem relatório de violação e outra origem gera relatório
  `report`. Sem logo, ou com valor inválido, o `img-src` e a lista de diretivas saem idênticos aos do build
  sem marca, e o host `x;sandbox` não abre uma diretiva `sandbox`. Uma porta explícita no logo entra na
  origem (`https://cdn.example.com:8443`).

- [x] **O depoimento de exemplo saiu do painel de entrada** ✅
  O painel lateral de `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password` e `/verify-email` mostra
  só a marca e o seletor de tema, nos 3 idiomas. Não há `blockquote`, "Sofia Davis", "Acme" nem o texto do
  depoimento. Com o banner de cookies aberto, a folga `pb-96` mantém o formulário inteiro acima do banner no
  desktop e no mobile.

- [x] **O app responde a `/favicon.ico` com um ícone, em produção** ✅
  Em `next build && next start`, `GET /favicon.ico` responde `200 image/x-icon` com um ICO de uma imagem
  32×32 RGBA, `/icon.png` e `/apple-icon.png` respondem `200 image/png` sem redirecionar para o login, e
  `/pt-br/sign-in` responde `200`. As páginas autenticadas e as públicas declaram os três ícones no `<head>`,
  e as URLs com hash também respondem `200` sem sessão.

- [x] **A linha de suporte dos e-mails respeita a configuração e o destinatário** ✅
  Com `NEXT_PUBLIC_APP_SUPPORT_EMAIL` válido, `welcome` e `action-link` trazem a linha de suporte no idioma
  do destinatário (pt-br, en e es), com o endereço interpolado e sem `{supportEmail}` sobrando. O e-mail de
  contato, que vai para o dono do produto, não traz a linha. Endereço inválido (`sem-arroba`, `a@b`) conta
  como ausente. O preview de e-mail (porta 3003) lê as variáveis do processo, então mostra a marca quando o
  servidor sobe com elas.

- [x] **O remetente segue o nome configurado sem estragar um `RESEND_FROM` já nomeado** ✅
  Com `RESEND_FROM="hi@example.com"` e nome configurado, a chamada à Resend recebe `QA Brand
  <hi@example.com>`. Um `RESEND_FROM` que já traz nome sai como está, sem nome configurado o `from` é o
  endereço puro, e `\r`, `\n`, aspas, `<` e `>` saem do nome, que vai entre aspas quando tem caractere
  especial da RFC 5322. Tudo isso é coberto pelo `sendEmail.test.ts` com a Resend mockada.

- [ ] **Um nome não ASCII chega legível ao inbox** 🔒
  Com `NEXT_PUBLIC_APP_NAME="Café"`, o nome do remetente precisa aparecer como "Café" no cliente de e-mail.
  O cabeçalho vai para a Resend como string, e a codificação (RFC 2047) é da Resend. Só um envio real com
  chave da Resend e uma caixa de entrada provam o resultado.

- [x] **Nenhuma marca fixa sobra no código** ✅
  O `rg "Acme"` em `apps/` e `packages/`, fora de `__tests__` e `node_modules`, devolve só
  `apps/e2e/support/seedAccounts.ts:12`, `apps/api/scripts/seed-emulator.mjs:35` e o comentário de
  `packages/email/keys.ts:22`. `company name` e `Sofia Davis` só aparecem nas asserções negativas dos testes.
  O bloco `signIn.layout` não existe em nenhum idioma, e o teste de paridade passa.

- [x] **O roteiro de fork existe e é seguível** ✅
  `docs/FORKING.md` tem nove passos em ordem (marca, Firebase, domínios, variáveis, modo de produto, e-mail,
  pagamentos, textos legais e checklist antes do deploy) e avisa que trocar a marca pede build e deploy
  novos. A seção "Marca e SEO" do `docs/SETUP.md` lista as variáveis para `app`, `web` e `api`, não só para
  a web.

- [x] **Tema e responsivo** ✅
  Em light e dark, o nome da marca tem contraste acima de 14:1 no painel de entrada, na barra lateral e no
  header da web. A inicial do fallback da barra lateral fica em 4,3:1 no light e 5,8:1 no dark, que é o
  estilo padrão do `AvatarFallback` do design system. Recolhida, a barra lateral mostra só a inicial ou o
  logo. O painel de entrada some abaixo de `lg`. O header da web mantém um nome de 30 caracteres numa linha
  só em 1440, 1024, 390 e 360 px, e a barra lateral do mobile abre com a marca.

- [x] **Os ícones e o logo de fallback da web respondem** ✅
  O `logo` do JSON-LD sem logo configurado aponta para `/icon.png`, que responde `307` para
  `/pt-br/icon.png` e este responde `200 image/png`. `/favicon.ico` da web responde `200` com o HTML da home,
  porque a web não tem esse arquivo e a rota cai no segmento `[locale]`. O `<head>` da web declara
  `/<idioma>/icon.png`, então a aba do browser mostra o ícone. Os dois comportamentos já existiam antes
  desta entrega e estão registrados como observação no relatório.
