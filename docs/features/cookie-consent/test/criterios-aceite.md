# Critérios de Aceite (Checklist)

Feature `cookie-consent`, branch `feat/cookie-consent`. Cada critério traz o resultado da verificação e
o meio pelo qual foi verificado: teste unitário, teste de componente, HTML servido ou passada de browser.
O relatório com os comandos e os números está em [`report.md`](report.md).

- [x] **Nenhuma medição carrega antes da escolha**
  Na primeira visita, com o cookie `bp:cookie-consent` ausente, o banner aparece e nenhum script do Google
  ou da Vercel entra no documento. O HTML servido não cita `googletagmanager` nenhuma vez, nem como
  `<script src>`, nem como `<link rel="preload">`. O `dataLayer` contém uma entrada só,
  `consent default` com `analytics_storage: denied` e `wait_for_update: 500`.
  Resultado: aprovado, por teste de componente e por HTML servido.

- [x] **Recusar tudo mantém a medição desligada, inclusive depois de recarregar**
  Clicar em "Recusar tudo" grava `v1:analytics=denied`, empilha um `consent update` negado, tira o banner
  da tela e não carrega tag nenhuma. Na visita seguinte o `consent default` sai negado e sem
  `wait_for_update`, porque não há decisão pendente, e o banner não volta.
  Resultado: aprovado, por teste de componente, por HTML servido e no browser.

- [x] **Aceitar tudo carrega as tags e o Consent Mode sai na ordem certa**
  Clicar em "Aceitar tudo" grava `v1:analytics=granted` e monta o Google Analytics e o Vercel Analytics.
  A ordem no `dataLayer` é `consent default` (negado), `consent update` (concedido), `js`, `config`, e a
  requisição de coleta sai com `gcs=G101`, que é o código de analytics concedido e publicidade negada.
  Resultado: aprovado, no browser.

- [x] **A visita seguinte a um consentimento nasce concedida**
  Com o cookie gravado como `granted`, o `consent default` já sai com `analytics_storage: granted`, sem
  `wait_for_update`, e é a primeira entrada do `dataLayer`, antes de `js` e de `config`. Um padrão negado
  sem `update` atrás faria a tag medir em modo restrito apesar do consentimento.
  Resultado: aprovado, por teste de componente e por HTML servido.

- [x] **O script de padrões entra na árvore antes da tag**
  A ordem no `dataLayer` é a ordem dos nós no documento. O script inline que declara os quatro sinais do
  Consent Mode v2 precisa preceder o `<GoogleAnalytics>`, senão o `gtag` recebe `config` antes de saber o
  que pode armazenar.
  Resultado: aprovado, por teste de componente. A garantia cobre a ordem na árvore; a estratégia de
  carregamento do `@next/third-parties` continua fora do alcance de qualquer teste deste repositório.

- [x] **Os sinais de publicidade nunca são concedidos**
  `ad_storage`, `ad_user_data` e `ad_personalization` saem negados no `default` e em todo `update`,
  inclusive quando o visitante aceita tudo. O boilerplate não embarca tag de anúncio e conceder esses
  sinais seria consentimento sem finalidade declarada.
  Resultado: aprovado, por teste unitário e no browser.

- [x] **Aceitar e recusar têm o mesmo peso visual**
  No primeiro nível, os dois botões usam a mesma variante, o mesmo tamanho e ocupam a mesma largura, no
  desktop e no celular. "Gerenciar preferências" fica como link, em terceiro plano.
  Resultado: aprovado, nas capturas `02-banner-claro-desktop.png` e `04-banner-mobile.png`.

- [x] **O segundo nível começa com a medição desligada**
  O diálogo de preferências mostra duas categorias. "Estritamente necessários" fica ligado e desabilitado,
  com o rótulo "Sempre ativo". "Medição de uso" começa desligado para quem ainda não decidiu, e refletindo
  a escolha gravada para quem já decidiu.
  Resultado: aprovado, na captura `03-preferencias-claro.png`.

- [x] **Fechar as preferências sem salvar não escreve nada**
  `Esc` e clique fora fecham o diálogo sem gravar cookie e sem empilhar `update`. A decisão anterior fica
  como estava e, se ainda não houver decisão, o banner continua na tela.
  Resultado: aprovado, no browser.

- [x] **A escolha sobrevive a fechar o navegador**
  O cookie é gravado com `expires` datado, e não como cookie de sessão. Medido no Chrome depois de
  aceitar: `session: false` e `expires` exatamente 15.552.000 segundos à frente, os 180 dias declarados
  em `CONSENT_COOKIE_TTL_SECONDS`.
  Resultado: aprovado, por leitura dos atributos do cookie no browser. O reinício do navegador em si não
  foi exercitado; o que prova o ponto é o atributo, que é o que o navegador usa para decidir se descarta
  o cookie ao fechar.

- [x] **A escolha atravessa os dois apps**
  Decidir em `apps/app` suprime o banner em `apps/web` e vice-versa, porque o cookie é do host e não da
  porta. Recusar em um app e navegar para o outro não carrega tag nenhuma.
  Resultado: aprovado, no browser, com os dois apps servindo em portas diferentes de `localhost`.

- [x] **Cookie corrompido volta a perguntar, com a medição negada**
  Valor sem separador, versão desconhecida (`v9:lixo`), categoria ausente, JSON no lugar do formato e lixo
  puro resultam todos em "sem decisão": o banner reaparece, o `consent default` sai negado com
  `wait_for_update` e nenhuma tag carrega. `parseConsent` não lança em nenhuma dessas entradas.
  Resultado: aprovado, por teste unitário e por HTML servido com o cookie `v9:lixo`.

- [x] **Duplo clique grava uma escolha só**
  Dois cliques seguidos em "Recusar tudo" ou em "Aceitar tudo" produzem uma gravação de cookie e um
  `consent update`. O banner sai do documento na primeira decisão, então o segundo clique não tem alvo.
  Resultado: aprovado, por teste de componente e com duplo clique real no browser.

- [x] **Sem tag configurada, nada disso aparece**
  Com `NEXT_PUBLIC_GA_MEASUREMENT_ID` vazio e fora da Vercel, o provider não monta banner, nem script de
  Consent Mode, nem tag, e o gatilho de reabertura some do rodapé e do menu de perfil. A página responde
  200 e o build passa. É o estado em que o repositório fica por padrão, já que o `.env.example` publica a
  variável vazia.
  Resultado: aprovado, por teste de componente e pelos builds registrados no handoff.

- [x] **Os três idiomas, com o link da política na locale corrente**
  Banner, diálogo de preferências e gatilho de reabertura existem em pt-br, en e es, e o link da política
  acompanha: `/pt-br/legal/privacy`, `/en/legal/privacy`, `/es/legal/privacy`. O teste de paridade do
  pacote de traduções cobre as 14 chaves novas.
  Resultado: aprovado, por teste de paridade e no browser nos três idiomas.

- [x] **Tema claro, tema escuro e celular**
  O banner e o diálogo respeitam o tema, e no celular os botões empilham em largura cheia. O texto
  "Sempre ativo" não quebra em duas linhas a 390 px.
  Resultado: aprovado, nas capturas em `e2e/`.

- [x] **A página de login continua utilizável com o banner aberto**
  Com o banner na tela, a página de autenticação cresce além da janela e rola, e "Continuar com Google",
  "Esqueci minha senha" e "Cadastrar" ficam alcançáveis depois de rolar até o fim, a 1280x800 e a 390x844.
  O elemento no ponto central de cada alvo é o próprio alvo, não o banner.
  Resultado: aprovado, medido de novo no browser com `elementFromPoint`, independente da medição do
  `/review`.

- [x] **Sem banner, a página de login volta ao que era**
  Depois da decisão, a folga condicional deixa de valer: a altura do documento volta a ser exatamente a
  da janela, sem rolagem e sem padding sobrando. Quem já respondeu vê a página de antes da tarefa.
  Resultado: aprovado, medido no browser (`scrollHeight` 800 em janela de 800).

- [x] **O atributo do banner e o seletor do layout não podem divergir em silêncio**
  A folga da página de autenticação depende de o banner publicar `data-cookie-banner` e de o layout
  esperar exatamente esse atributo dentro de `body:has(...)`. Renomear um dos lados devolve o formulário
  para baixo do banner sem quebrar build, tipo ou lint.
  Resultado: aprovado, com teste novo que lê o seletor do layout e o aplica ao banner renderizado.

- [ ] **O banner não deixa conteúdo inalcançável**
  Enquanto o banner está aberto, o card opaco cobre a faixa de baixo da janela. Nas páginas que rolam, o
  conteúdo coberto é alcançável rolando, com uma exceção: no fim da rolagem não há para onde rolar, e o
  que estiver ali embaixo fica sob o card. No rodapé da `apps/web` a 390x844, os quatro links medidos
  ("Início", "Preços", "Política de Privacidade", "Termos de Uso") ficam inalcançáveis; a 1280x800, os
  dois da coluna esquerda.
  Resultado: reprovado. A condição termina assim que o visitante responde ao banner, e a política de
  privacidade continua acessível pelo link de dentro do próprio banner. Detalhes e medições no
  `report.md`.

- [x] **Sem JavaScript, nada de medição carrega**
  Um navegador com JavaScript desligado recebe apenas o HTML servido. Sem decisão gravada e com decisão
  negada, esse HTML não cita `googletagmanager` nem `vercel-scripts`, então nada é medido. O banner
  aparece mas seus botões não respondem, o que mantém o estado padrão de recusa. A folga da página de
  autenticação continua valendo, porque `body:has(...)` é CSS e não depende de script.
  Resultado: aprovado, por HTML servido nos quatro estados de cookie.

- [x] **Nenhum dado pessoal entra no cookie de consentimento**
  O valor guarda a versão do formato e o estado de uma categoria, no formato `v1:analytics=granted`. Não
  há identificador, data nem qualquer referência à conta.
  Resultado: aprovado, por teste unitário e por leitura do cookie no browser.

- [x] **Visitante não autenticado decide igual**
  O consentimento é do navegador, não da conta. Na landing e na tela de login, sem sessão, o banner
  aparece, a decisão é gravada e vale para as duas aplicações.
  Resultado: aprovado, no browser.

- [ ] **Usuário autenticado e admin personificando mantêm a escolha do navegador**
  A troca de painel ou de usuário personificado não deve reabrir o banner nem alterar a decisão, já que o
  cookie não tem relação com a sessão. Verificar isso exige uma tela autenticada, e autenticar exige os
  emuladores do Firebase, que pedem JDK 21. A máquina tem `openjdk 17.0.13`.
  Resultado: não verificado, por falta de ambiente autenticado. A leitura do código sustenta a
  expectativa, já que nada no caminho do consentimento consulta sessão, mas leitura não é medição.

- [ ] **O item de preferências no menu de perfil da `apps/app`**
  O item aparece quando há medição configurada, abre o diálogo ao ser acionado e some quando não há o que
  consentir. Em tela, ele só existe autenticado, o que esbarra na mesma limitação de JDK.
  Resultado: não verificado no browser. O teste jsdom
  `apps/app/__tests__/profileDropdownCookieConsent.test.tsx` cobre as três condições, e o equivalente na
  `apps/web` (`CookiePreferencesButton`, mesmo hook, mesma chave de tradução) abre o diálogo corretamente
  no browser.

- [ ] **O Consent Mode chega ao Google como esperado**
  Os quatro sinais saem no `dataLayer` e a requisição de coleta carrega `gcs=G101`. O que o Google faz com
  eles só é observável numa propriedade real do Google Analytics, com um id de medição válido.
  Resultado: não verificado. Depende de infraestrutura externa e vira pendência de pré-produção, não
  reprovação.

- [ ] **O cookie vale entre subdomínios reais**
  `SESSION_COOKIE_DOMAIN` faz o cookie ser gravado no domínio pai, para que a decisão tomada em
  `app.exemplo.com` valha em `www.exemplo.com`. Em `localhost` o compartilhamento acontece de graça, então
  o caminho com domínio nunca é exercitado.
  Resultado: não verificado. O repasse do valor do servidor até o `setCookie` tem teste; o efeito no
  navegador depende de domínio real e fica como pendência de pré-produção.

## Itens do roteiro padrão que não se aplicam

O guia pede alguns eixos que esta feature não toca, e registrá-los evita que pareçam esquecidos:

- Ownership de recurso de outro usuário: não há recurso, não há API e nenhum documento no Firestore.
- `error.code` e mensagem de erro traduzida: a entrega não acrescenta rota nem código de erro.
- Modo de produto `subscription` contra `simple`: o consentimento não olha para o plano.
- Filtros, busca e manipulação de query param: não há listagem nem parâmetro de URL envolvido.

## Roteiro de teste manual

Para reproduzir sem os emuladores, basta `NEXT_PUBLIC_GA_MEASUREMENT_ID="G-TEST00000"` no ambiente dos
apps. Sem isso, o banner não aparece, e é o comportamento correto.

1. Suba `apps/web` e `apps/app` com a variável acima preenchida. Abra o DevTools em Application, Cookies.
2. Abra a landing numa aba anônima. Espere o banner. Na aba Network, confirme que nada saiu para
   `googletagmanager.com`, `google-analytics.com` ou `va.vercel-scripts.com`.
3. Clique em "Recusar tudo". O banner sai, `bp:cookie-consent` aparece com `v1:analytics=denied`, e a aba
   Network continua sem requisição de medição. Recarregue: o banner não volta.
4. Apague o cookie e recarregue. Clique em "Gerenciar preferências". Confirme que "Medição de uso" começa
   desligado e que "Estritamente necessários" não pode ser desligado. Feche com `Esc` e confirme que
   nenhum cookie foi escrito.
5. Clique em "Aceitar tudo". A tag carrega, os cookies `_ga` aparecem e `window.dataLayer` mostra
   `consent default`, `consent update`, `js` e `config`, nessa ordem.
6. Recarregue e leia a primeira entrada do `dataLayer`: ela já deve trazer `analytics_storage: granted`,
   sem `wait_for_update`.
7. No rodapé da landing, clique em "Preferências de cookies". O diálogo abre refletindo a escolha atual.
   Desligue a medição, salve e confirme o cookie em `denied`.
8. Com a decisão feita na porta da `apps/web`, abra a `apps/app` na outra porta: o banner não aparece.
9. Troque o idioma pelo seletor e recarregue. Banner, diálogo e link da política devem acompanhar a
   locale. Repita para o terceiro idioma.
10. Edite o valor do cookie para `v9:lixo` e recarregue: o banner volta e nenhuma tag carrega.
11. Reduza a janela para 390 de largura, apague o cookie e recarregue. Role até o fim da página e observe
    quais links do rodapé ficam sob o card do banner.
12. Abra a tela de login com o banner aberto, role até o fim e confirme que "Esqueci minha senha",
    "Cadastrar" e "Continuar com Google" recebem clique. Responda ao banner e confirme que a página volta
    a caber na janela, sem rolagem.
13. Autenticado, abra o menu de perfil e confirme o item "Preferências de cookies". Entre no painel
    administrativo, personifique um usuário e confirme que o banner não reaparece e que a decisão segue a
    mesma. Este passo depende dos emuladores com JDK 21.
