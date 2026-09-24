# Critérios de Aceite (Checklist)

Feature: direitos do titular (exportar dados e excluir conta). Branch `feat/data-rights-lgpd`.

Marcação: ✅ aprovado · ❌ reprovado · 🔒 não verificável sem infra externa. O meio de verificação de cada
item e a evidência em texto estão em [`report.md`](report.md).

Duas rodadas. A primeira reprovou a rolagem horizontal em 375 px; a segunda mediu a correção e reclassificou
o critério.

## Exportação

- [x] ✅ **O arquivo chega ao disco quando o titular clica em baixar**
  Na aba Privacidade, o botão "Baixar meus dados" grava um arquivo JSON no disco do navegador. O helper
  monta o arquivo no cliente com uma âncora que nunca entra no documento e revoga o `objectURL` de forma
  síncrona logo depois do clique, então o critério só fecha com download real, não com `click` mockado em
  jsdom. Verificado no Chromium: 2971 bytes de JSON válido. Em motor não Chromium o comportamento continua
  sem medição.

- [x] ✅ **O dossiê traz o perfil completo e deixa de fora a URL assinada do avatar**
  O bloco `account` carrega `email`, `displayName`, `phone`, `avatar`, `preferences`, `providerData`,
  `createdAt` e `lastAccessAt`. A chave `avatarUrl` não aparece, porque é uma URL assinada com validade de
  15 minutos e estaria morta assim que o titular abrisse o arquivo.

- [x] ✅ **O dossiê traz os registros do titular, inclusive os que ele apagou**
  O bloco `records.entities` lista as entidades do dono com o campo `deletedAt` preservado, então um
  registro soft-deletado aparece marcado como tal em vez de sumir. Registros de outros donos não entram.

- [x] ✅ **A trilha vai no dossiê sem nomear terceiro**
  Cada evento vira `{ action, actorRole, createdAt, requestId }`. Quando um operador agiu sobre a conta, o
  papel sai como `operator` e o e-mail do operador não acompanha, porque entregar o nome dele responderia
  o pedido de uma pessoa com o dado de outra. Quando o próprio titular agiu, o papel sai como `self`.

- [x] ✅ **O dossiê carrega a decisão de cookies do navegador**
  O bloco `cookieConsent` traz `source: "browser-cookie"`, o nome do cookie (`bp:cookie-consent`) e a
  decisão como aquele navegador a guarda. O servidor não mantém cópia dessa escolha, e o arquivo diz de
  onde o valor veio.

- [x] ✅ **Conta sem nenhum registro exporta mesmo assim**
  Com zero entidades, o arquivo sai com `records.entities: []` e `truncated: false` em vez de falhar ou
  omitir o bloco. O `auditEvents` traz apenas o próprio evento de exportação.

- [x] ✅ **Um passo do dossiê que falha custa uma seção, não o arquivo**
  Quando a listagem de objetos do bucket levanta exceção, `storageObjects` sai vazio e o restante do
  dossiê é entregue com status 200. Sem bucket configurado, a listagem nem é chamada.

- [ ] 🔒 **O teto de registros avisa em vez de cortar em silêncio**
  Acima de `EXPORT_MAX_RECORDS` (5000) cada bloco responde `truncated: true`. Semear 5001 registros pela
  interface não cabe numa passada de QA, então o comportamento fica provado por unidade e não foi
  observado na tela.

- [x] ✅ **Admin personificando não consegue extrair o dossiê**
  A aba mostra o aviso de modo somente leitura e o botão de baixar aparece desabilitado. A rota recusa com
  `ACCOUNT_EXPORT_IMPERSONATION_FORBIDDEN` e status 403, porque produzir um arquivo com o dossiê inteiro
  é extração, não suporte, mesmo que `GET` seja método seguro.

- [x] ✅ **Sem credencial a rota responde 401**
  Um chamador sem sessão recebe `AUTH_INVALID_TOKEN` antes de qualquer leitura.

## Exclusão da conta

- [x] ✅ **A exclusão exige a senha atual, digitada na hora**
  O diálogo pede a senha e a API refaz o sign-in no Identity Toolkit em vez de confiar em quão recente é a
  sessão. Entrar pelo cookie de sessão compartilhado reescreve o instante de autenticação, então uma
  sessão roubada se apresentaria como fresca.

- [x] ✅ **Senha vazia e senha curta não saem do navegador**
  Campo vazio mostra "Informe a senha." e nenhuma requisição é enviada. Com três caracteres, a mensagem é
  "A senha deve ter ao menos 6 caracteres." e também não há requisição. O mínimo de 6 vem do schema do
  formulário.

- [x] ✅ **Senha só com espaços chega à API e é recusada lá**
  Uma sequência de espaços passa do mínimo de tamanho, então o formulário deixa enviar. A API responde 400
  e o titular lê "A senha atual está incorreta.". A conta continua intacta.

- [x] ✅ **Senha errada devolve o código traduzido e não apaga nada**
  A resposta é 400 com `ACCOUNT_CURRENT_PASSWORD_INVALID`, e a interface mostra a mensagem do dicionário
  em vez de stack trace. Perfil, registros e conta de Auth permanecem.

- [x] ✅ **A exclusão apaga o perfil, os registros e a conta de autenticação**
  Depois da confirmação, o documento de perfil sai do Firestore, as entidades do dono somem (inclusive as
  soft-deletadas) e a conta no Firebase Auth deixa de existir. Registros de outros donos não são tocados.

- [x] ✅ **O e-mail volta a ficar livre: dá para se cadastrar de novo com ele**
  Esta é a diferença entre a exclusão do titular e o soft delete que o admin faz. Depois de excluir, o
  mesmo e-mail completa um cadastro novo e recebe um `uid` diferente e um perfil novo, sem herdar
  registro nenhum da conta anterior.

- [x] ✅ **Conta que entra só pelo Google não vê o formulário de senha**
  Sem provedor `password` no `providerData`, o painel troca o bloco de exclusão pelo texto do canal de
  privacidade e não renderiza botão de excluir. A API recusaria com
  `ACCOUNT_DELETION_REAUTH_UNSUPPORTED`, já que não há credencial para reconferir.

- [x] ✅ **Admin personificando não consegue excluir a conta do outro**
  O guard de personificação libera apenas `GET`, `HEAD` e `OPTIONS`, então o `POST` é recusado antes de o
  handler ler o corpo. O botão também aparece desabilitado na aba. Além disso a rota confere que o perfil
  em contexto é o dono da sessão e responde `AUTH_REQUEST_IMPERSONATION_FORBIDDEN` se algum dia deixar de
  ser.

- [x] ✅ **Um passo do expurgo que não se aplica reporta o motivo e não derruba os outros**
  Sem bucket, o passo `storage` responde `skipped: storage-not-configured`. Sem vínculo entre perfil e
  cliente de pagamento, `billing` responde `skipped: billing-not-linked`. A resposta só vira 500 quando o
  passo `authAccount` não conclui.

- [ ] 🔒 **Os objetos do titular saem do bucket junto**
  Não existe bucket no projeto de referência e o Cloud Storage não é emulado neste setup. O passo existe,
  varre por prefixo e reporta `skipped` enquanto não houver bucket.

- [ ] 🔒 **A assinatura é cancelada junto**
  Nenhum perfil guarda referência a cliente de pagamento e não há chave da Stripe configurada, então não
  existe assinatura para cancelar. O passo reporta `skipped: billing-not-linked`.

## Trilha de auditoria

- [x] ✅ **A trilha é retida e perde só o nome**
  Os eventos do titular continuam existindo depois da exclusão, com `action`, instante e `requestId`
  intactos. O que sai é o rótulo: `actorLabel` e `targetLabel` viram `null` nos papéis em que ele aparece.

- [x] ✅ **O rótulo do operador que agiu sobre a conta é preservado**
  Num evento em que o admin alterou o perfil do titular, `actorLabel` continua com o e-mail do admin e
  apenas `targetLabel` é limpo. Quem não pediu nada não perde o próprio registro.

- [x] ✅ **A varredura não alcança evento de terceiro**
  Eventos entre o admin e outro usuário ficam com os dois rótulos intactos. A consulta é escopada por
  `involvedUserIds` do titular.

- [x] ✅ **O evento de exclusão nasce sem rótulo**
  O `account.delete` é gravado depois da varredura, com `actorLabel` e `targetLabel` nulos, para não
  reintroduzir o e-mail que acabou de sair dos eventos anteriores.

- [x] ✅ **A tabela do admin mostra travessão no lugar do rótulo nulo**
  Em `/admin/audit` as colunas Autor e Alvo renderizam `—` quando o rótulo é nulo, não "null", "undefined"
  nem célula vazia. As duas ações novas aparecem traduzidas: "Dados exportados" e "Conta excluída pelo
  titular".

## Duplo clique e estados de envio

- [x] ✅ **Duplo clique em baixar dispara uma requisição só**
  Um duplo clique real no botão de exportar produz um único `GET /account/export`. O botão é desabilitado
  enquanto a mutation está pendente.

- [x] ✅ **Duplo clique em excluir dispara uma requisição só**
  Dois cliques seguidos em "Excluir para sempre" produzem um único `POST /account/deletion`. O segundo
  clique não encontra mais o botão, porque o diálogo já fechou.

## Páginas legais (`apps/web`)

- [x] ✅ **A seção de cookies existe nos 3 idiomas e nomeia cada cookie**
  Português, inglês e espanhol trazem a seção com os 7 nomes: `access-token`, `bp:cookie-consent`,
  `x-theme`, `x-locale`, `sidebar_state`, `bp:panel-request-role` e `bp:impersonate-firebase-uid`, mais os
  cookies de medição do Google Analytics.

- [x] ✅ **O canal de privacidade é clicável**
  Com `NEXT_PUBLIC_PRIVACY_CONTACT` preenchida, a seção mostra um link `mailto:` para o endereço
  configurado. Vazia, o link cai em `/{locale}/contact`, que é o formulário que já entrega na caixa do
  responsável.

- [x] ✅ **O prazo de 15 dias aparece nos 3 idiomas**
  "15 dias", "15 days" e "15 días" aparecem na seção de direitos da página de privacidade e no rodapé da
  aba Privacidade.

- [ ] 🔒 **O e-mail enviado ao canal de privacidade chega**
  Depende de `RESEND_*` configurado no fork. O link renderizar é verificável; a entrega não.

## Aparência e idiomas

- [x] ✅ **A aba Privacidade está traduzida nos 3 idiomas**
  Título, descrição, os dois blocos, o diálogo de confirmação, o rótulo do campo de senha e os dois botões
  aparecem em português, inglês e espanhol, sem string solta.

- [x] ✅ **A aba funciona em tema claro e escuro**
  Nos dois temas o painel mantém contraste legível. O botão destrutivo fica vermelho sólido com texto
  branco no claro e vermelho escuro com texto claro no escuro.

- [x] ✅ **A página da conta não rola na horizontal em 375 px**
  Reprovado na primeira rodada e corrigido: a faixa de abas ganhou um contêiner
  `w-full overflow-x-auto overflow-y-hidden`, então a largura da página deixou de depender do comprimento
  dos rótulos traduzidos. Medido nos três idiomas em 375 px, o documento mede 375 px e não há rolagem
  lateral, embora a faixa em si continue medindo 429 px em pt-br, 366 em inglês e 433 em espanhol. Em
  1280 px nada muda: o contêiner não cria barra quando a faixa cabe.

- [x] ✅ **A faixa de abas rola e nenhuma aba fica inacessível em 375 px**
  Com a faixa mais larga que a tela, ela rola no eixo X. Em português o percurso é de 86 px e em espanhol
  de 90 px; ao fim dele a quinta aba fica inteira à vista e responde ao clique, e as quatro anteriores
  continuam alcançáveis. O corte é só horizontal: a variante em uso é a `default`, cujo indicador de
  seleção é a pílula de fundo, e ela aparece inteira dentro do contêiner. O sublinhado `after:`, que
  ficaria 5 px abaixo da faixa, pertence à variante `line` e tem `opacity: 0` aqui, então o
  `overflow-y-hidden` não esconde nada visível. Ao carregar `?tab=privacy` direto em 375 px a faixa começa
  em `scrollLeft: 0` e a aba ativa aparece só em parte; o painel certo renderiza e um arraste traz a aba
  para o centro.

- [x] ✅ **O diálogo de exclusão cabe em 375 px**
  O diálogo mede 343 px, fica centralizado, o campo de senha ocupa a largura toda e os dois botões ficam
  lado a lado sem sobrepor.

- [x] ✅ **A página legal cabe em 375 px**
  A seção de cookies, que é o texto mais longo da página, quebra linha dentro da coluna e não estoura a
  largura. Sem rolagem horizontal.

## Navegação e URL

- [x] ✅ **Abrir `/account?tab=privacy` do zero cai na aba Privacidade**
  Carregar a URL diretamente seleciona a aba certa, porque o inicializador do estado lê o parâmetro na
  montagem.

- [ ] ❌ **Ir para Privacidade pela barra lateral deve trocar a aba**
  Clicando em Privacidade no menu lateral estando já em `/account`, a URL muda para `?tab=privacy` mas a
  aba selecionada continua Perfil. A navegação é suave na mesma rota, o componente não remonta e o
  `useState` com inicializador não roda de novo. O mecanismo é anterior a esta entrega e acontece igual com
  `?tab=security`, mas a entrega acrescentou um terceiro item de barra lateral que o exercita
  (`routes.tsx:55-58`): o defeito não é novo, a superfície dele cresceu. A correção ingênua não serve,
  porque a troca de aba usa `window.history.replaceState` e o `useSearchParams()` fica desatualizado.

- [ ] 🔒 **Um `tab` desconhecido na URL cai em Perfil**
  `resolveTab` devolve `profile` para qualquer valor fora da tupla de abas, mas isso está fechado só por
  leitura: não existe teste do `AccountTabs` e eu não carreguei uma URL com `tab` inválido nesta passada.

## Autorização e limites

- [x] ✅ **O corpo da exclusão recusa campo a mais**
  O schema é `.strict()` e só aceita `currentPassword`. Um corpo com `id` ou `uid` é tentativa de apagar
  outra pessoa e falha com `VALIDATION_FAILED`.

- [x] ✅ **Um perfil comum não consegue apontar a requisição para outro usuário**
  A validação do contexto de requisição recusa com `AUTH_REQUEST_IMPERSONATION_FORBIDDEN` antes de
  qualquer leitura, então não há caminho em que o expurgo alcance o dado de outro dono.

- [ ] 🔒 **O rate limit barra chamadas repetidas aos dois caminhos**
  Sem `ARCJET_KEY` o limitador é no-op, e a API diz isso no boot:
  `[security] rate limiting is DISABLED (no ARCJET_KEY)`. O que dá para verificar é que
  `/account/export` e `/account/deletion` estão na lista de caminhos limitados.

- [x] ✅ **Modo `simple` não muda o comportamento desta entrega**
  Nenhum arquivo da feature lê `NEXT_PUBLIC_PRODUCT_MODE`. Nesse modo o painel comum é inalcançável pelo
  usuário, então o autoatendimento some junto com a aba e sobra o canal publicado na `apps/web`. É
  consequência de produto, não de código.
