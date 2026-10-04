# Critérios de Aceite (Checklist)

Sessões ativas da conta, fatia 2 da spec `account-security-mfa`. A base são os 13 critérios da §11 do
plano, mais dois que a passada do `/test` acrescentou (erro de carga da lista e aparelho encerrado com a
tela aberta). O status e o meio de cada item estão em [`report.md`](report.md).

- [x] **Lista de sessões ativas na aba Segurança**
  O titular vê uma linha por sessão ativa, com navegador e sistema, tipo de aparelho, quando entrou e o
  último uso. A sessão atual aparece primeiro, com o selo "Esta sessão" e sem botão de encerrar; as demais
  seguem por último uso, da mais recente para a mais antiga. Sessão cujo `User-Agent` o parser não reconhece
  mostra "Dispositivo desconhecido" e não mostra tipo de aparelho. Sessões encerradas, as derrubadas por
  "Sair de todos" ou troca de senha e as que passaram do teto absoluto não aparecem.

- [x] **Encerrar uma sessão específica**
  "Encerrar" numa linha que não é a atual responde 204, a linha some depois da atualização e aparece o aviso
  "Sessão encerrada." (en "Session ended.", es "Sesión cerrada."). O aparelho encerrado recebe 401 na
  chamada seguinte à API pelos três transportes: ID token como bearer, cookie como bearer e cookie como
  cookie. Id malformado, inexistente ou de outra pessoa responde `404 ACCOUNT_SESSION_NOT_FOUND`; o id da
  sessão atual responde `409 ACCOUNT_SESSION_IS_CURRENT`; repetir o pedido para uma sessão já encerrada
  responde 204 sem gravar evento novo na trilha. O botão fica desabilitado enquanto a requisição está
  pendente, então duplo clique não dispara dois pedidos.

- [x] **Encerrar todas as outras mantendo a atual**
  O botão "Encerrar as outras sessões" abre um diálogo de confirmação; "Cancelar" fecha sem requisição e
  "Encerrar outras" chama `POST /account/sessions/revoke-others`, que responde com a contagem. A sessão
  atual continua funcionando e as outras caem na próxima requisição. Uma credencial emitida antes da
  marca d'água e nunca vista pela API também é recusada no primeiro uso, inclusive ao tentar gravar o
  cookie. O botão fica desabilitado quando só existe a sessão atual. Sem chave derivável da credencial a
  rota responde `409 ACCOUNT_SESSION_UNIDENTIFIED` e não encerra nada.

- [x] **Logout local**
  "Sair" no menu do perfil encerra só a sessão deste navegador: `DELETE /api/auth/session` limpa o cookie,
  chama `DELETE /auth/session` na API, a sessão some da lista dos outros aparelhos e eles seguem usando o
  app. O logout não chama `revokeRefreshTokens`. Se a API não responder, o cookie é limpo mesmo assim.

- [x] **Sem loop de redirect para sessão encerrada**
  O aparelho cuja sessão foi encerrada, ao abrir uma página do painel, termina na tela de login depois de um
  número finito de redirects (medido: 1), com `Set-Cookie: access-token=; Max-Age=0` e o aviso "Esta sessão
  foi encerrada. Entre novamente para continuar." nos 3 idiomas. Em rota pública (`/sign-in`) com o cookie de
  uma sessão encerrada, o proxy limpa o cookie e serve a página com 200, sem 307. Entrar de novo com a senha
  cria uma sessão nova, que aparece na lista.

- [x] **Sair num front-end desconecta o outro**
  Com app e web logados no mesmo navegador (a web pelo bootstrap de SSO), sair no app faz a web desconectar
  na próxima carga: `POST /api/auth/session` da web responde 401, o provider faz logout local com o aviso de
  sessão encerrada e o cabeçalho volta a mostrar "Entrar". O app não volta a ter sessão por causa da web
  (`POST /api/auth/custom-token` responde 401). Com a API fora do ar, o cookie é gravado como antes.

- [x] **"Sair de todos os dispositivos" continua igual**
  O botão existente, depois do diálogo "Tem certeza que deseja encerrar todas as sessões?", chama
  `POST /account/sessions/revoke`, que revoga no Firebase, e manda o aparelho atual para o login. Credenciais
  antigas passam a responder 401. Depois dele a lista só mostra o próximo login, como sessão nova.

- [x] **Personificação**
  O admin personificando um usuário vê a lista daquele usuário, sem nenhuma linha marcada como "Esta
  sessão", com os botões "Encerrar", "Encerrar as outras sessões" e "Sair de todos os dispositivos"
  desabilitados e o aviso "Modo somente leitura". `DELETE /account/sessions/<id>` e
  `POST /account/sessions/revoke-others` sob personificação respondem
  `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY` e não encerram nada. O admin que sai enquanto personifica
  encerra a própria sessão, não a do usuário.

- [x] **Último uso e aparelho**
  O último uso avança no máximo uma vez a cada 15 minutos por sessão. A sessão aberta pelo login já nasce
  com o aparelho do navegador (o `User-Agent` vai do navegador para a rota do front-end e dela para a API),
  não com o do servidor do front-end. Requisições do SSR, que não carregam o `User-Agent` do navegador, não
  sobrescrevem o aparelho gravado.

- [x] **Trilha de auditoria**
  Encerrar uma sessão grava `account.session.revoke` e encerrar as outras grava
  `account.sessions.revokeOthers`. Na trilha do admin os rótulos aparecem traduzidos: "Sessão encerrada" /
  "Outras sessões encerradas" (pt-br), "Session ended" / "Other sessions ended" (en), "Sesión cerrada" /
  "Otras sesiones cerradas" (es). Logout comum não grava evento.

- [x] **Exclusão e exportação de dados**
  Excluir a conta apaga os documentos de `session` do titular num passo próprio (`sessions`) do relatório da
  exclusão. A exportação traz a seção `sessions`, com as encerradas inclusive (campo `revokedAt` preenchido).

- [x] **Erros traduzidos**
  `AUTH_SESSION_REVOKED`, `ACCOUNT_SESSION_NOT_FOUND`, `ACCOUNT_SESSION_IS_CURRENT` e
  `ACCOUNT_SESSION_UNIDENTIFIED` têm mensagem em pt-br, en e es, sem stack trace, sem o próprio código e sem
  cair na cópia genérica.

- [x] **Tema e responsivo**
  O painel e o diálogo funcionam em light e dark e a 375 px sem rolagem horizontal da página: a tabela rola
  dentro do próprio contêiner e o diálogo ocupa 343 px. A tabela antd segue o tema (cabeçalho escuro e texto
  claro no dark, o inverso no light). Os textos, incluindo o `aria-label` "Encerrar a sessão em {device}" de
  cada linha, vêm do dicionário nos 3 idiomas.

- [x] **Erro ao carregar a lista**
  Se `GET /account/sessions` falhar, a tabela fica vazia, mostra no lugar do texto de lista vazia a mensagem
  traduzida do `error.code` e o botão "Atualizar" continua ativo para tentar de novo. Nenhum toast se repete a
  cada refetch.

- [x] **Aparelho encerrado com a tela aberta**
  Com o app aberto e sem recarregar, as chamadas do aparelho encerrado à API passam a responder
  `401 AUTH_INVALID_TOKEN` e a tela mostra o erro de sessão inválida no lugar dos dados. O logout local com
  o aviso de sessão encerrada acontece na próxima carga completa de página ou na próxima renovação do ID
  token (até 1 hora).

## Roteiro de teste manual

Pré-requisito: emulador com seed (`pnpm emulators`, `pnpm seed`) e `pnpm dev`. Conta `user@example.com`,
senha do seed em `docs/SETUP.md`. Use três perfis de navegador separados (A, B, C) e faça os logins com pelo
menos 1 segundo de diferença, porque a chave da sessão tem precisão de segundo.

1. Em A, B e C, entre no app com `user@example.com`. Resultado: os três chegam a `/pt-br`.
2. Em A, abra Minha conta, aba Segurança. Resultado: três linhas, a de A primeiro com "Esta sessão" e sem
   botão; as outras duas com "Encerrar".
3. Em A, clique em "Encerrar" na linha de B. Resultado: toast "Sessão encerrada." e a linha de B some.
4. Em B, abra `/pt-br/entities` digitando a URL. Resultado: cai em `/pt-br/sign-in` com o toast "Esta sessão
   foi encerrada. Entre novamente para continuar.", sem tela piscando entre login e home.
5. Em B, entre de novo. Em A, clique em "Atualizar". Resultado: B volta como sessão nova.
6. Em C, clique em "Encerrar as outras sessões" e depois em "Cancelar". Resultado: nada muda.
7. Em C, repita e confirme com "Encerrar outras". Resultado: toast "As outras sessões foram encerradas.",
   só a linha de C fica, e o botão "Encerrar as outras sessões" fica desabilitado.
8. Em A e B, recarregue uma página do painel. Resultado: os dois caem no login com o aviso de sessão
   encerrada; C continua navegando.
9. Em B, entre de novo e use "Sair" no menu do perfil. Resultado: B vai para o login; em C, "Atualizar"
   não mostra mais B.
10. Em C, abra a web (`http://localhost:3001/pt-br`). Resultado: o cabeçalho mostra "Ir para o painel" e
    "Sair". Volte ao app, use "Sair", e recarregue a web. Resultado: a web mostra o aviso de sessão
    encerrada e "Entrar"; abrir o app de novo leva ao login.
11. Entre como `admin@example.com`, troque o ambiente para "Painel do usuário", selecione
    `user@example.com` e abra a aba Segurança. Resultado: aviso "Modo somente leitura", nenhuma linha com
    "Esta sessão", todos os botões de encerrar desabilitados.
12. Como admin, abra Auditoria. Resultado: eventos "Sessão encerrada" e "Outras sessões encerradas"; troque
    para en e es e confira os rótulos traduzidos.
13. Em C, use "Sair de todos os dispositivos" e confirme. Resultado: C vai para o login e nenhum outro
    aparelho segue logado.
14. Repita os passos 2 e 7 em dark e com a janela em 375 px. Resultado: sem rolagem horizontal da página;
    a tabela rola dentro do cartão e o diálogo cabe na tela.
