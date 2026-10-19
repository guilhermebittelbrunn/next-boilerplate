# Critérios de Aceite (Checklist)

Canal de contato e suporte da landing, com entrega na caixa de suporte do fork. A base são os 17 critérios
da §12 do plano. O `/test` acrescentou três (disponibilidade antes do corpo, um só `<h1>` na página e o
preenchimento do e-mail em domínio de produção, separado do caso local) e estendeu o critério de validação
com o limite de 320 caracteres do e-mail. Os itens `[x]` foram medidos nesta rodada; os `[ ]` dependem de
infra externa e ficam como não verificados. O status, o meio e o valor medido de cada item estão em
[`report.md`](report.md).

- [x] **Formulário de contato com nome, e-mail e mensagem**
  Com a caixa de suporte definida, `/pt-br/contact`, `/en/contact` e `/es/contact` mostram um formulário com
  três campos (nome, e-mail e mensagem) e rótulos e placeholders no idioma da URL. Não existe campo de data,
  sobrenome, currículo ou arquivo. O botão é `type="submit"` dentro de um `<form>`, então Enter no campo de
  nome também envia. O formulário tem `noValidate`, para que a mensagem traduzida do Zod apareça no lugar do
  balão nativo do `type="email"`.

- [x] **Validação no navegador nos três idiomas**
  Enviar com os três campos vazios mostra uma mensagem por campo no idioma da página e não dispara
  requisição. Campo só com espaços conta como vazio. Nome com 121 caracteres, mensagem com 5001, e-mail sem
  `@` e e-mail acima de 320 caracteres são recusados com mensagem traduzida e sem requisição. Nome com 120 e
  mensagem com 5000 passam e chegam à API. Os limites de nome e mensagem vêm de `contactMessage.ts`, os
  mesmos da API.

- [x] **Validação na borda da API**
  `POST /contact` com JSON inválido, campo ausente, campo só com espaços, e-mail inválido, `locale` fora de
  `pt-br`/`en`/`es`, nome acima de 120 ou mensagem acima de 5000 responde
  `400 { error: { code: "VALIDATION_FAILED" } }` sem chamar o provedor. A validação vale para quem chama a API
  sem passar pela landing.

- [x] **Disponibilidade antes do corpo**
  Sem caixa de suporte ou sem Resend, a rota responde `503 CONTACT_UNAVAILABLE` antes de ler o corpo: um
  corpo que não é JSON recebe 503, não 400. Com caixa e Resend configurados, o mesmo corpo recebe
  `400 VALIDATION_FAILED`. Nenhum caminho responde 500.

- [ ] **Entrega na caixa de suporte com resposta ao visitante**
  Com Resend e `NEXT_PUBLIC_APP_SUPPORT_EMAIL` configurados na API, o envio chama o template `contact` com
  `to` igual à caixa de suporte, `replyTo` igual ao e-mail digitado, nome, e-mail e mensagem aparados e o
  `locale` da página, e responde `200 { data: { sent: true } }`. O remetente `RESEND_FROM` nunca é o destino.
  O contrato está provado no teste da rota. A chegada da mensagem na caixa, com o visitante no "responder
  para", não foi verificada: exige domínio verificado no Resend.

- [ ] **Confirmação depois do envio**
  Quando a API aceita a mensagem, o formulário dá lugar a um bloco de confirmação traduzido em `<output>`,
  que tem `status` como papel implícito, e não há como reenviar a mesma mensagem com um segundo clique.
  Provado em teste de componente nos três idiomas. No navegador não foi verificado, porque o bloco só aparece
  com envio aceito pelo Resend.

- [x] **Canal indisponível sem caixa de suporte**
  Com `NEXT_PUBLIC_APP_SUPPORT_EMAIL` vazia, ausente, só com espaços ou com valor que não é e-mail, a página
  mostra o aviso de canal indisponível nos três idiomas no lugar do formulário, sem nenhum campo. A API
  responde `503 CONTACT_UNAVAILABLE` sem ler o corpo. O build da `web` passa com a variável vazia, a página
  não quebra e nada sugere que algo foi enviado.

- [x] **Canal indisponível sem Resend**
  Com a caixa definida e `RESEND_TOKEN` ou `RESEND_FROM` vazias na API, o envio responde
  `503 CONTACT_UNAVAILABLE` e a landing mostra o texto traduzido desse código num toast. O que a pessoa
  escreveu continua nos três campos, para ela copiar ou tentar depois.

- [x] **Falha do provedor**
  Se o Resend recusar ou falhar, a API responde `503 EMAIL_SEND_FAILED`, a landing mostra o texto traduzido e
  preserva os campos. O log tem uma linha `[email] failed template=contact reason=provider-error` sem o
  endereço nem a mensagem do visitante.

- [x] **Envio duplo**
  Dois cliques rápidos em "Enviar", Enter repetido no campo de nome ou um clique extra enquanto a requisição
  está pendente geram uma requisição só: o botão fica desabilitado e com `aria-busy` enquanto a mutation está
  pendente. Depois que a resposta chega, um novo envio é permitido, porque a pessoa pode querer tentar de
  novo depois de um erro.

- [ ] **Rate limit na rota pública**
  `/contact` está na lista do proxy, casada por igualdade (`/contact/` e `/contact/x` não contam). Com
  `ARCJET_KEY` válida, o 21º envio do mesmo IP no minuto recebe `429 AUTH_RATE_LIMITED` com `Retry-After` e o
  texto traduzido. Sem a chave, o limite é no-op e o envio segue. A lista e o 429 estão provados no teste do
  proxy; o 429 real não foi verificado, porque exige `ARCJET_KEY` válida.

- [x] **Envio pelo SDK, não por server action**
  O navegador faz `POST {NEXT_PUBLIC_API_URL}/contact` por `apiClient.contact.send`, sem bloqueio de CORS ou
  CSP, e nenhuma requisição `POST` vai para a própria landing. O arquivo `contact/actions/contact.tsx` não
  existe mais e `ownerInbox` não é exportado por `@repo/email`.

- [x] **"Ajuda e contato" no menu do perfil**
  Na app, o menu do perfil mostra "Ajuda e contato" / "Help and contact" / "Ayuda y contacto" logo depois de
  "Minha conta" e antes de "Cookies" (quando o consentimento de cookies está ativo). O item abre
  `{NEXT_PUBLIC_WEB_URL}/<locale>/contact` em aba nova, com `rel="noreferrer"`, e respeita o tema da app.
  Sem `NEXT_PUBLIC_WEB_URL` na app (ou com ela vazia), o item não aparece e o resto do menu segue igual.

- [x] **E-mail da conta preenchido, sem PII na URL**
  Logado no app, ao abrir "Ajuda e contato" a landing adota a sessão compartilhada e preenche o campo de
  e-mail com o da conta. O campo continua editável e, se a pessoa já digitou algo, não é sobrescrito. A URL
  aberta não tem query string, a aba nova não recebe `referrer` e não tem `opener`. Sem cookie compartilhado
  (domínios distintos), o campo fica vazio e o envio funciona.

- [ ] **E-mail preenchido em domínio de produção**
  Com `SESSION_COOKIE_DOMAIN` apontando para o domínio registrável comum à landing e ao app, o preenchimento
  funciona entre os dois subdomínios como funciona em `localhost`. Não verificado: exige domínio real.

- [x] **Personificação**
  Com um admin personificando um usuário comum, o item aparece no menu e a landing preenche o e-mail do
  próprio admin, dono do cookie de sessão, que é quem está escrevendo.

- [x] **Caminhos que já levavam a `/contact`**
  O card "Enterprise" da `/pricing`, o link de privacidade de `/legal/privacy` sem
  `NEXT_PUBLIC_PRIVACY_CONTACT`, o link do header e os CTAs da home chegam ao formulário funcional no idioma
  corrente. O JSDoc de `privacyContact.ts` e o comentário de `NEXT_PUBLIC_PRIVACY_CONTACT` em
  `packages/next-config/keys.ts` descrevem o comportamento real.

- [x] **Um só `<h1>` na página**
  `/<locale>/contact` tem exatamente um `<h1>`, no formulário e no aviso de indisponível. O título da coluna
  do formulário é `<h2>`.

- [x] **Tema e responsivo**
  O formulário, as mensagens de validação, o aviso de indisponível e o toast de erro ficam legíveis em light
  e dark, com contraste AA ou melhor. Em 375 px a coluna do formulário e o toast cabem sem rolagem
  horizontal. O item do menu respeita o tema da app.

- [x] **Documentação alinhada**
  `ROPA.md` §5 aponta para a rota da API e para a caixa de suporte e diz que a rota não loga dados do
  visitante. `SECURITY.md` lista 13 caminhos com rate limit e a linha de `/contact` na tabela de rotas sem
  guard. `PRE-PRODUCTION.md` §8 cita `/contact` e §13 diz que, sem a caixa, o formulário fica indisponível.
  `SETUP.md` e `FORKING.md` dizem que `NEXT_PUBLIC_APP_SUPPORT_EMAIL` é o destino do contato.
