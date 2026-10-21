# Critérios de Aceite (Checklist)

- [x] **A lista mostra a notificação que o badge já contou**
  Quando uma resposta do servidor muda a contagem de não lidas (notificação nova, ou outra aba que marcou como
  lida), a próxima abertura do popover relê a lista e mostra o estado do servidor, mesmo dentro dos 60 s do
  `staleTime` global. A releitura acontece na abertura, nunca no instante em que a contagem muda: com o popover
  aberto, a lista visível não pula. Se, com o popover aberto, a pessoa marcar uma como lida, marcar todas ou
  clicar em "Carregar mais" depois que a contagem mudou, a reabertura continua relendo. Quem carregou várias
  páginas paga uma leitura por página nessa reabertura.

- [x] **Sem notificação nova, abrir o popover não lê mais do que antes**
  Abrir e fechar o popover várias vezes sem a contagem do servidor mudar não gera `GET /notifications` além do
  que o `staleTime` de 60 s já gerava. Marcar como lida ou marcar todas não conta como mudança: a contagem do
  servidor confirma o número que o cache otimista já mostrava, e a lista não é relida por isso.

- [x] **Sem badge depois de uma falha da contagem**
  Quando a releitura da contagem falha duas vezes seguidas (o `retry: 1` global), o badge some e o `aria-label`
  do sino volta para o texto sem número ("Notificações", "Notifications", "Notificaciones"), como na primeira
  leitura com erro. Nenhum toast aparece. Durante a primeira tentativa de novo, por cerca de 1 s, o número
  anterior ainda aparece. Quando a contagem volta a responder, o badge reaparece com o número que o servidor
  devolveu, nunca com o anterior à falha.

- [x] **Marcar como lida com a contagem em erro não ressuscita o número antigo**
  Com a contagem em erro, marcar uma como lida ou marcar todas não grava número no badge, com a API aceitando ou
  recusando o pedido. Na recusa, a lista volta ao estado anterior, o toast de erro aparece e o badge continua
  ausente. Com a contagem em dia, o otimista é o de antes: desconta 1 ou zera na hora, e restaura na falha.
  Depois da recuperação, a primeira abertura pode reler a lista uma vez a mais, porque o cache guardou o número
  de antes da falha; esse custo é aceito.

- [x] **Popover afastado das bordas no celular**
  Sem scrollbar ocupando largura (scrollbar sobreposta), o popover fica a 12 px da borda esquerda e a 12 px da
  direita a 375 px, sem rolagem horizontal no documento. Vale em light e dark, com itens, vazio ("Nenhuma
  notificação") e sob impersonação (botões de marcar desabilitados e aviso de somente leitura), nos três
  idiomas. Com scrollbar clássica de 15 px, o popover fica a 12 px das bordas da janela e avança 3 px sobre a
  scrollbar, sem rolagem horizontal. Em desktop o popover continua alinhado à direita do sino.

- [x] **Nada mais muda**
  O polling a cada 120 s com a aba visível, a releitura ao voltar para a aba e ao navegar com o número com mais
  de 30 s seguem iguais. O `99+` mantém tamanho e posição. A suíte da `apps/app` passa inteira, com os testes
  antigos do sino e das ações sem alteração, e o `pnpm test` da raiz (que gateia o `build`) passa.
