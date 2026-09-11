# Critérios de Aceite (Checklist)

Feature: **Recuperação de senha e verificação de e-mail** (`auth-recovery-verification`).
Formato conforme a §9.1 de [`docs/feature-analysis-guide.md`](../../../feature-analysis-guide.md).

Os critérios estão agrupados pelos **5 itens do corte de MVP** da spec, seguidos dos critérios
transversais (segurança, valores-limite, i18n, tema/responsivo) e dos resíduos aceitos. O status de cada
um está no [`report.md`](report.md).

---

## Item 1 do corte — pedir a redefinição a partir do login

- [ ] **O login oferece a saída para quem esqueceu a senha**
  A tela `/{locale}/sign-in` mostra o link "Esqueci minha senha" no rodapé do formulário, acima de
  "Cadastrar", e ele leva a `/{locale}/forgot-password` preservando o idioma da navegação. O link tem de
  existir nos três idiomas e em ambos os temas; um usuário que chega ao login sem lembrar a senha não pode
  depender de digitar a URL à mão nem de alguém abrir o console do Firebase.

- [ ] **A tela de pedido aceita um e-mail e nada mais**
  `/{locale}/forgot-password` pede apenas o endereço. O campo é `type="email"` com validação Zod
  construída a partir do dicionário (`buildForgotPasswordSchema`), então um valor que o navegador aceita
  mas o Zod rejeita (ex.: `a@b`) tem de renderizar a mensagem **traduzida** ("Email inválido" /
  "Invalid email" / "Correo inválido") abaixo do campo — nunca texto do provedor, nunca inglês num app em
  pt-br. Endereço vazio ou só com espaços é rejeitado pelo `trim()` antes de qualquer chamada de rede.

- [ ] **Um clique repetido não dispara dois pedidos**
  O botão de submissão fica `disabled` e em estado `loading` enquanto a mutation está em voo, e ao concluir
  o formulário é substituído pelo painel de confirmação. Três cliques rápidos no botão têm de produzir
  **exatamente uma** requisição `POST /auth/password/reset-request` — o que importa aqui não é a UX, é a
  fatura: cada requisição extra é um e-mail que o fork paga.

## Item 2 do corte — receber o link e definir a senha nova na nossa tela

- [ ] **O link do e-mail aponta para a nossa página, nunca para a página hospedada do Firebase**
  `buildAuthActionLink` extrai apenas o `oobCode` do link que o Admin SDK gera e remonta a URL contra
  `NEXT_PUBLIC_APP_URL` no formato `{base}/{locale}/reset-password?oobCode={code}`. O domínio do Firebase
  (`*.firebaseapp.com/__/auth/action`) não pode aparecer em nenhum e-mail enviado, e o `oobCode` tem de ser
  escapado quando contiver caracteres de URL. Se `NEXT_PUBLIC_APP_URL` não estiver definida, a função
  responde `null` em vez de montar um link `"undefined/pt-br/..."`.

- [ ] **O e-mail chega no idioma em que o usuário navegava**
  O `locale` do corpo do pedido é repassado ao gerador de link **e** ao `sendEmail`, com o slug de ação
  `resetPassword`. Um pedido feito em `/es/forgot-password` tem de produzir o e-mail em espanhol; um pedido
  sem `locale` no corpo cai no idioma padrão (`pt-br`); um `locale` fora de `["pt-br","en","es"]` (ex.:
  `fr`) é recusado com `VALIDATION_FAILED` e status 400, sem enviar nada.

- [ ] **A tela de senha nova só aparece quando há um código na URL**
  `/{locale}/reset-password` sem `?oobCode=` renderiza o painel "Link inválido", **sem formulário**, com
  saída para `/forgot-password`. Não pode haver campo de senha na tela nesse estado — um formulário que não
  tem como funcionar convida o usuário a digitar a senha nova duas vezes para nada.

- [ ] **A senha nova é confirmada duas vezes e as duas têm de bater**
  O formulário tem "Nova senha" e "Confirmar nova senha". Se divergirem, a mensagem traduzida ("As senhas
  não conferem") aparece no campo de confirmação e **nenhuma** requisição sai. O mínimo aceito é 6
  caracteres e o máximo 1024: abaixo ou acima disso a validação da borda responde `VALIDATION_FAILED` 400
  **sem** chamar o Identity Toolkit, e exatamente 6 e exatamente 1024 são aceitos.

- [ ] **O ciclo completo termina com o usuário entrando com a senha nova**
  Pedido → e-mail → link → senha nova → login. Ao final, `POST /auth/password/reset` responde
  `{ data: { confirmed: true } }` e a senha antiga deixa de funcionar. É o "sinal de pronto" da spec: ninguém
  toca no console do Firebase em nenhum passo.

## Item 3 do corte — a redefinição encerra as sessões abertas

- [ ] **Redefinir a senha invalida a sessão em todos os apps do monorepo**
  Depois de `identityResetPassword`, a rota resolve o `uid` pelo endereço que **o provedor devolveu** e
  chama `revokeUserSessions`. Como `verifySessionCookie` roda com `checkRevoked: true`, a próxima navegação
  de uma sessão aberta antes do reset cai em `/sign-in?redirect=...` — inclusive numa aba de outro app que
  compartilha o cookie. Uma sessão que sobrevive à troca de senha é o cenário de conta comprometida que este
  item existe para fechar.

- [ ] **A revogação mira a conta do código de ação, não um endereço vindo do cliente**
  O endereço usado no `getUserByEmail` sai da resposta do Identity Toolkit, nunca do corpo da requisição.
  Um chamador que envie `{ oobCode, password, email: "vitima@example.com" }` tem de ver as sessões da conta
  **dona do `oobCode`** revogadas, e nada acontecer com a conta apontada no corpo.

- [ ] **Uma falha na revogação não desfaz a troca de senha**
  Se `getUserByEmail` ou `revokeUserSessions` falhar, a rota registra o erro no servidor e ainda responde
  `{ confirmed: true }`. O `oobCode` já foi consumido nesse ponto: transformar isso em erro deixaria o
  usuário com a senha nova valendo e uma tela dizendo que não funcionou, e mandaria ele pedir um link que
  não pode mais ser emitido.

- [ ] **Um link já usado ou expirado responde código estável, nunca mensagem do provedor**
  Segundo `POST` com o mesmo `oobCode` → `AUTH_OOB_CODE_INVALID` 400; código expirado →
  `AUTH_OOB_CODE_EXPIRED` 400; senha fraca recusada pelo provedor → `USERS_AUTH_WEAK_PASSWORD` 400; excesso
  de tentativas → `USERS_AUTH_RATE_LIMITED` 429; qualquer outra recusa → `AUTH_PASSWORD_RESET_FAILED` 400.
  Em nenhum desses casos as sessões são revogadas, e em nenhum a string crua do Identity Toolkit
  (`INVALID_OOB_CODE`, `EXPIRED_OOB_CODE`, …) chega à tela. Abrir o mesmo link duas vezes é o caso
  ordinário — recarregar a página, um cliente de e-mail que faz prefetch — não um ataque.

## Item 4 do corte — cadastro dispara verificação e o app avisa quem não confirmou

- [ ] **O cadastro por senha dispara o e-mail de verificação sem bloquear a entrada**
  Concluir o cadastro em `/{locale}/sign-up` chama `POST /auth/email-verification/send` e **não** atrasa a
  navegação para o painel: o usuário entra, e o e-mail sai em paralelo. O cadastro via Google **não**
  dispara verificação — o provedor já entrega o endereço verificado.

- [ ] **O painel avisa o dono da conta enquanto o endereço não está confirmado**
  O `EmailNotVerifiedNotice` aparece no layout do painel comum quando `user.emailVerified` é falso, como
  `role="alert"`, com título, explicação e o botão de reenvio. Ele desaparece assim que o endereço é
  confirmado, **sem reload manual** — o que exige reler o registro da conta (`reload`), porque
  `emailVerified` não vive no ID token e um refresh de token não o atualiza. O aviso fica quieto enquanto a
  sessão ainda está resolvendo (`loading`) e não aparece para visitante sem conta.

- [ ] **Um admin personificando outra pessoa não vê o aviso nem consegue disparar o e-mail dela**
  Sob impersonação o banner não renderiza (o guard cobre os quatro termos: `loading`, `isImpersonating`,
  `!user`, `emailVerified`), **e** a rota de reenvio resolve o **ator real** via `resolveApiActor`, nunca o
  sujeito personificado. A proteção existe nos dois lados: esconder o botão não bastaria, porque a rota
  seria alcançável direto. Um corpo de requisição com `email` de terceiro é ignorado — a rota nem lê
  endereço do corpo.

- [ ] **O reenvio está protegido contra rajada**
  O botão fica `disabled`/`loading` durante a requisição, então cliques repetidos produzem **uma** chamada.
  No servidor, `/auth/email-verification/send` está em `RATE_LIMITED_PATHS` (janela de 20 req/60 s por IP
  quando `ARCJET_KEY` está definida), e a barra final na URL não é bypass: o Next responde 308 para o path
  canônico, que é o contado.

- [ ] **Reenviar não pode virar beco sem saída**
  Quando o Firebase estrangula a geração de links, a rota responde **`EMAIL_SEND_FAILED` 503**, cuja copy é
  "Não foi possível **enviar** o e-mail agora. Tente de novo em instantes." A resposta **não** pode ser
  `AUTH_EMAIL_VERIFICATION_FAILED` ("não foi possível **confirmar** … peça um novo link"): é o verbo errado
  e manda o usuário buscar um link que a própria requisição falhou em criar. `AUTH_EMAIL_VERIFICATION_FAILED`
  só pode ser emitido pela rota de **confirmar**.

- [ ] **Confirmar o endereço com um código válido retira o aviso e não exige nova sessão**
  `/{locale}/verify-email?oobCode=<válido>` mostra o resultado de sucesso e, ao voltar ao painel, o banner
  já não está lá. Sem `oobCode` a tela mostra "Link inválido"; com código inválido/expirado/já usado mostra
  "Não foi possível confirmar — O link pode ter expirado ou já ter sido usado", com saída para o painel. A
  rota de confirmação **não exige sessão**: o `oobCode` é a credencial.

- [ ] **Uma falha ao reler a sessão não transforma uma confirmação bem-sucedida em erro**
  O `reloadCurrentUser()` que roda depois da confirmação está sob `.catch()`. Se ele falhar, a mutation
  ainda tem de reportar sucesso: o `oobCode` já foi gasto: no pior caso o banner permanece até o próximo
  login, o que é infinitamente melhor que mandar o usuário pedir outro link.

## Item 5 do corte — os erros novos chegam traduzidos, e legíveis

- [ ] **Os 6 `error.code` novos existem nos 3 idiomas em `apiErrors`**
  `EMAIL_NOT_CONFIGURED`, `EMAIL_SEND_FAILED`, `AUTH_OOB_CODE_INVALID`, `AUTH_OOB_CODE_EXPIRED`,
  `AUTH_PASSWORD_RESET_FAILED` e `AUTH_EMAIL_VERIFICATION_FAILED` estão em pt-br, en e es com estrutura
  idêntica, e o teste de paridade cobre isso de forma determinística. Nenhum deles pode cair em fallback
  nem vazar a chave crua na tela.

- [ ] **O código traduzido chega à tela de forma LEGÍVEL nos dois temas**
  Não basta o toast disparar: o texto tem de ser lido. O tema entregue ao `react-toastify` tem de ser
  sempre `"light"` ou `"dark"` — **nunca** a preferência crua `"system"` do `next-themes`, que deixa a
  biblioteca sem stylesheet e mantém o texto branco default sobre o `bg-background` branco (contraste 1:1,
  texto invisível). Isso vale para as quatro variantes (`success`, `info`, `warning`, `error`) e para os
  três apps, e tem de valer no estado **padrão** de um fork novo, onde a preferência é `system`. Contraste
  mínimo esperado em light: 4,5:1 (AA para texto normal).

- [ ] **Um fork sem remetente configurado diz isso, não finge sucesso**
  Sem `RESEND_FROM`/`RESEND_TOKEN`, o pedido de redefinição responde `EMAIL_NOT_CONFIGURED` 503 e a tela
  mostra "O envio de e-mails não está configurado. Fale com o suporte." Este é o ponto em que a spec
  entrava em conflito com a base de e-mail (que engole a falha de propósito): aqui o `reason` **propaga** até
  a tela, sem alterar `packages/email`. Um usuário que perde a conta em silêncio porque o fork esqueceu uma
  variável de ambiente é o pior desfecho possível desta feature.

- [ ] **Nenhuma string de interface fica solta**
  Título, descrição, rótulos, placeholders, botões, links e mensagens de validação das 4 telas novas e do
  banner saem do dicionário `@repo/internationalization`. Nenhum texto literal em JSX, nenhum
  `aria-label` cru, nenhuma copy derivada de mensagem de provedor.

## Segurança — anti-enumeração

- [ ] **O pedido de redefinição responde igual para conta existente e inexistente**
  Mesmo status (200), mesmo corpo (`{"data":{"requested":true}}`, byte a byte), mesmos headers de resposta
  e **mesma tela** — a comparação de screenshots do painel "Pedido recebido" tem de dar hash idêntico. A
  copy é condicional de propósito ("Se existir uma conta com esse e-mail…"), justamente para poder ser a
  mesma nos dois casos. Responder "e-mail não cadastrado" entregaria a lista de usuários do fork.

- [ ] **Uma falha de entrega também não revela existência de conta**
  Se `sendEmail` falhar no provedor, o pedido **continua** respondendo 200 `{ requested: true }`. E a
  recusa `EMAIL_NOT_CONFIGURED` é avaliada **antes** de qualquer consulta de conta
  (`canSendAuthActionLink()` é a primeira instrução do handler), então é função só da configuração do fork:
  com o remetente ausente, conta conhecida e desconhecida recebem 503 igualmente.

- [ ] **O log do servidor não carrega o endereço consultado**
  A linha de recusa é `[auth-action-link] refused kind=<kind> code=<code>`, sem e-mail. Um log que
  registra "não achei conta para X" reintroduz a enumeração pela porta de trás, para quem tem acesso ao
  log — inclusive um provedor de observabilidade terceiro.

- [ ] **O tempo de resposta ainda distingue conta existente de inexistente — resíduo aceito (D-A)**
  A resposta é indistinguível, mas o caminho da conta conhecida faz `getUserByEmail` +
  `generatePasswordResetLink` + `await sendEmail`, enquanto o da desconhecida para na primeira etapa. A
  diferença é medível e **sem sobreposição** entre as amostras, o que constitui um oráculo de enumeração
  por tempo. Isto está **aceito como resíduo**, não fechado: atenuado pelo rate limit da rota
  (20 req/60 s por IP com `ARCJET_KEY`) e comum no mercado. A correção limpa é responder antes do trabalho
  (`after()` do Next 15), o que torna o tempo constante por construção — endereçado em `api-hardening`.
  **O critério é: a divergência está medida e registrada**, não que ela seja zero.

## Autorização e rotas públicas

- [ ] **As 3 rotas públicas não exigem sessão, e a autenticada exige**
  `password/reset-request`, `password/reset` e `email-verification/confirm` funcionam sem sessão — no reset
  e na confirmação o `oobCode` **é** a credencial. Já `email-verification/send` sem credencial responde
  `AUTH_INVALID_TOKEN` 401. Um `emailVerified` já verdadeiro no ator faz a rota responder sucesso sem
  enviar nada (não há o que confirmar).

- [ ] **Um visitante logado que abre o link do e-mail não perde o código**
  O bounce do `apps/app/proxy.ts` limpava a query string, o que fazia um usuário logado clicar no link e
  cair no painel com o `oobCode` descartado em silêncio. A isenção tem de manter o visitante em
  `/reset-password?oobCode=X` e `/verify-email?oobCode=X` com o código **intacto** e o formulário
  renderizado, e **não** pode vazar para `/forgot-password` (onde o logado continua sendo mandado para
  casa) nem alargar acesso a rota autenticada: em sessão anônima, `/{locale}`, `/{locale}/entities` e
  `/{locale}/admin` seguem redirecionando para `sign-in` com o deep link preservado.

- [ ] **As 4 rotas novas estão sob rate limit pelo path real**
  `/auth/password/reset-request`, `/auth/password/reset`, `/auth/email-verification/send` e
  `/auth/email-verification/confirm` batem literalmente com `RATE_LIMITED_PATHS` (o grupo `(routes)` não
  entra na URL), as rotas vizinhas não limitadas continuam fora, e barra final não é bypass. Sem
  `ARCJET_KEY` o limite é no-op e a API avisa no boot — o que significa que **um fork que não configurar
  `ARCJET_KEY` expõe um gerador gratuito de e-mail em nome dele**, e a fatura é dele.

## Efeitos colaterais do provedor

- [ ] **A redefinição de senha marca o e-mail como verificado — efeito documentado, não regressão**
  O `accounts:resetPassword` do Identity Toolkit passa `emailVerified` a `true` como efeito do próprio
  reset, e o banner de confirmação pendente desaparece em consequência. Não estava no plano. É coerente
  (quem provou controlar a caixa de entrada ao clicar no link provou o mesmo que a verificação pede) e
  favorável, mas precisa estar **registrado** para que ninguém trate isso como bug depois, e para que um
  fork que endureça a política saiba que este caminho existe. Não há código nosso a mudar.

- [ ] **O Firebase estrangula a geração de links, e o sistema degrada com graça**
  Após poucas chamadas seguidas no mesmo projeto, o Admin SDK recusa com `auth/internal-error` opaco.
  Nesse estado o pedido público **continua** respondendo sucesso (anti-enumeração preservada) e o reenvio
  autenticado responde `EMAIL_SEND_FAILED` 503 com a copy de "tente em instantes". Não é defeito nosso,
  mas atrapalha teste repetitivo e tem de estar previsto.

## Valores-limite e manipulação de entrada

- [ ] **Os limites dos campos são recusados na borda, sem tocar no provedor**
  `oobCode` acima de 2048 caracteres → `VALIDATION_FAILED` 400 sem chamar o Identity Toolkit, e exatamente
  2048 é aceito. `oobCode` ausente, vazio ou só com espaços → 400. `email` acima de 320 caracteres → 400.
  `password` fora de [6, 1024] → 400. A validação da borda existe para que entrada absurda não vire custo
  de chamada externa.

- [ ] **Manipular a URL não dá acesso a nada de outra pessoa**
  Trocar o `oobCode` na query string por um valor arbitrário produz `AUTH_OOB_CODE_INVALID` traduzido, com
  o formulário preservado para nova tentativa. Não existe recurso por `id` nesta feature (não há Firestore
  envolvido: `emailVerified` vive no Auth), então o vetor de ownership clássico se reduz a este:
  **o `oobCode` é a única autoridade**, e ele não é adivinhável nem reutilizável.

## Tema, responsivo e idiomas

- [ ] **As 4 telas e o banner funcionam em light, dark e mobile**
  `/forgot-password`, `/reset-password`, `/verify-email` e o `EmailNotVerifiedNotice` renderizam nos dois
  temas e em 390×844 **sem overflow horizontal** (`scrollWidth == innerWidth`). O `Table` antd do painel,
  que convive com o banner na mesma tela, tem de respeitar o tema (cabeçalho escuro e texto claro em dark)
  — antd não é theme-aware por padrão, então isso é verificação, não suposição.

- [ ] **Tudo funciona nos três idiomas, sem chave faltando**
  As 4 telas, o banner e os toasts em pt-br, en e es: título, descrição, campos, botões, links, mensagens
  de validação e as mensagens de `apiErrors`. Nenhum fallback visível, nenhuma chave crua, nenhuma mistura
  de idiomas dentro da mesma tela.

## Fronteiras — o que NÃO está provado

- [ ] **A entrega real do e-mail nunca foi exercitada** ⛔
  Nada nesta feature prova que um e-mail **chega**. Exige `RESEND_TOKEN` com domínio verificado (SPF +
  DKIM), passo manual de DNS que não existe no ambiente de desenvolvimento. O que está provado: o template
  renderiza nos 3 idiomas, `sendEmail` é chamado com `action`/`locale`/`to` corretos, e as duas falhas
  (`not-configured`, `provider-error`) se comportam como projetado. O que falta: caixa de entrada,
  renderização em cliente de e-mail real, reputação do remetente. **Este item não pode ser marcado como
  aprovado antes de um envio real.**

- [ ] **O 429 real do rate limit não foi observado**
  `ARCJET_KEY` está vazia no ambiente local e a API avisa no boot que o rate limiting está desligado. O
  match de path está coberto por teste; a 21ª chamada em 60 s devolvendo 429 + `Retry-After` só pode ser
  verificada com a chave presente.

- [ ] **A revogação de sessão cruzando para a `apps/web` não foi verificada**
  O encerramento foi observado na `apps/app`. A `apps/web` compartilha o mesmo cookie de sessão e deveria
  cair junto, mas isso não foi exercitado.

- [ ] **A corrida entre o envio de verificação e o redirect pós-cadastro é aceita como degradação graciosa (D-D)**
  O `window.location.replace` do `SignUpFormClient` é navegação dura e **pode** cancelar a requisição de
  verificação em voo. Foi observado completando, mas isso é ordenação favorável, não garantia. Aceito
  porque a degradação é graciosa: se o e-mail não sair, o banner com "reenviar" cobre o caso. Um envio
  server-side dentro do `POST /auth/sign-up` seria imune, mas hoje essa rota não tem chamador — o cadastro
  da `apps/app` fala com o Firebase direto.
