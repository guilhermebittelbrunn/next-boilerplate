# Critérios de Aceite (Checklist)

Origem: §9 do [`analyze/plan.md`](../analyze/plan.md). Os dois últimos não estavam lá — saíram das duas
correções que a revisão aplicou em `reportRequestError` e precisam de gate próprio.

Caixa marcada = verificado nesta rodada. Caixa vazia com 🔒 = ninguém consegue verificar sem infra
externa; não é reprovação. O status item a item, com o meio de verificação, está em
[`report.md`](report.md).

- [x] **Toda resposta da API carrega `x-request-id`**
  Qualquer requisição a `apps/api`, com qualquer método e em qualquer rota, recebe um header
  `x-request-id` com um UUID v4. Vale para o caminho feliz, para o `204` do preflight `OPTIONS`, para a
  recusa de origem (`AUTH_FORBIDDEN_ORIGIN`, 403) e para a recusa por rate limit (`AUTH_RATE_LIMITED`,
  429). Duas requisições seguidas recebem valores diferentes. Medi os quatro primeiros casos em build de
  produção; o de rate limit sai de teste unitário, porque sem `ARCJET_KEY` o limitador fica desligado e a
  rota nunca recusa.

- [x] **O identificador enviado pelo cliente é ignorado**
  Uma requisição com `x-request-id: qualquer-coisa` no header de entrada recebe de volta um UUID gerado
  pelo servidor, não o valor enviado. Um valor com quebra de linha ou caracteres de controle não aparece
  em nenhum log. Isso é deliberado: honrar o valor do cliente permitiria injetar linhas falsas na trilha.
  A regra vale também para a requisição que chega ao handler, não só para a resposta.

- [x] **O browser consegue ler o identificador em requisição cross-origin**
  `Access-Control-Expose-Headers` inclui `x-request-id` junto de `Retry-After`. Sem isso o header chega na
  aba de rede mas fica invisível para o código, que é o comportamento documentado em
  `apps/api/(shared)/lib/cors.ts:55-58` para o `Retry-After`. A prova é o JavaScript da página em
  `localhost:3000` lendo o header de uma resposta de `localhost:3002` e recebendo o UUID, não `null`.

- [x] **A mensagem de erro do painel mostra o identificador quando ele existe**
  Um erro vindo da API produz um alerta com a mensagem traduzida seguida do identificador, no formato
  `<mensagem> (<rótulo>: <uuid>)`, com o rótulo vindo do dicionário nos 3 idiomas. O valor mostrado é
  idêntico ao do header `x-request-id` daquela resposta. Vale tanto para os formulários de
  `(unauthenticated)` quanto para as mutations do painel, porque a composição da mensagem acontece num
  ponto só, dentro de `handleClientError`.

- [x] **Sem o identificador, a mensagem sai exatamente como antes**
  Erro de rede (API fora do ar), erro sem resposta HTTP, ou resposta sem o header: a mensagem é a mesma
  string de hoje, sem parênteses vazios, sem rótulo órfão e sem `null` ou `undefined` no texto. Este é o
  caminho degradado padrão e vale em `pnpm dev` sem nenhuma configuração.

- [x] **Um erro não tratado nos três apps produz uma linha estruturada**
  Provocar um `throw` num route handler da `apps/api`, num Server Component da `apps/app` e numa página da
  `apps/web` produz, em cada um, uma linha `[request] failed …` no stdout com `method`, `path`,
  `routeType` e `digest`. O processo não morre e a resposta ao usuário continua sendo a página de erro
  normal.

- [x] **O log deliberado nunca carrega objeto de erro nem PII**
  O helper de log aceita apenas pares `chave=valor` de tipo fechado; não há assinatura que permita passar
  um `Error`. O teste em `packages/shared/__tests__/log.test.ts` reprova se a saída tiver mais de um
  argumento, se contiver `@`, ou se não casar a regex ancorada. Um fluxo completo de cadastro e de
  redefinição de senha não deixa e-mail, token nem senha no stdout.

- [x] **Os 11 pontos de `console` da `apps/api` passam pelo helper**
  Nenhum `console.*` direto sobra em `apps/api`, exceto `instrumentation.ts` (aviso de boot) e
  `app/global-error.tsx:15` (componente React). Os dois clones de mensagem estática
  (`entity-photo.ts:61`, `account-avatar.ts:44`) passam a emitir par `chave=valor` e ficam distinguíveis
  um do outro e por recurso.

- [x] **`/health` continua respondendo e deixa de ser pré-renderizado**
  `GET /health` responde `200` com `{"message":"OK"}`, sem tocar o Firestore, mesmo com o banco fora do
  ar. O módulo exporta `dynamic = "force-dynamic"`, o que impede o Next de congelar a resposta no build.
  O contrato de corpo não muda, então o teste existente segue valendo.

- [x] **`/health/ready` distingue processo de pé de dependência viva**
  Com o Firestore respondendo, `GET /health/ready` devolve `200` com `{ "data": { "ready": true } }`. Com
  o Firestore inacessível ou lento além do timeout, devolve `503` com
  `{ "error": { "code": "HEALTH_DEPENDENCY_UNAVAILABLE" } }`. A resposta de falha não diz qual dependência
  falhou, não traz versão, não traz mensagem do driver e não traz stack.

- [x] **A prontidão não pendura a requisição**
  Uma sonda que nunca resolve faz `/health/ready` responder `503` dentro do timeout configurado, em vez de
  ficar aberta até o limite da plataforma. O timeout é uma constante nomeada, não um número solto no
  handler.

- [x] **Nenhuma variável de ambiente nova é exigida**
  Um clone limpo do repositório, com os `.env.example` copiados sem edição, sobe os três apps, passa
  `pnpm turbo run lint typecheck test` e responde em `/health` e `/health/ready`. A feature não acrescenta
  linha nenhuma a nenhum `.env.example`.

- [x] **Paridade de i18n nas chaves novas**
  `HEALTH_DEPENDENCY_UNAVAILABLE` em `apiErrors` e o rótulo do identificador existem em `pt-br`, `en` e
  `es` com a mesma estrutura. `pnpm --filter @repo/internationalization test` passa.

- [x] **Tema e responsivo**
  O alerta de erro com o identificador é legível em light e dark, e o identificador não estoura a largura
  do toast em viewport mobile (não quebra o layout nem é truncado sem reticências).

- [x] **O identificador do toast acha a linha do servidor**
  O UUID que o usuário citaria num chamado é o mesmo que aparece em `requestId=` na linha `[request]
  failed` daquela requisição. Sem esse laço o identificador do toast não leva a lugar nenhum. Vale também
  para a linha `[security] blocked`, que o proxy emite ao recusar uma origem.

- [x] **A query string não entra no log**
  A linha `[request] failed` retém só a parte do `path` anterior ao `?`. O runtime entrega o caminho com a
  query colada, e a busca do painel manda o termo digitado por query param — um `throw` numa busca por
  e-mail gravaria o endereço no log, que é o que a regra de privacidade desta feature proíbe.

- [ ] 🔒 **A prontidão responde `ready:true` contra o emulador do Firestore**
  O caminho de sucesso de `/health/ready` deveria ser medido contra o emulador, não contra o projeto
  Firebase real. `firebase-tools` 15.30.1 exige Java 21 e esta máquina tem Java 17, então `emulators:start`
  aborta antes de subir qualquer emulador. Instalar JDK é provisionar infra, fora do que a rodada pode
  fazer. Exerci o caminho de falha apontando `FIRESTORE_EMULATOR_HOST` para uma porta morta, e o de
  sucesso contra o projeto real, com uma leitura de documento inexistente e nenhuma escrita.

- [ ] 🔒 **Alguém é avisado quando um erro acontece**
  O `onRequestError` escreve no stdout e nenhum coletor está plugado, então a trilha existe e ninguém é
  notificado. É a decisão D1 do plano, deliberada, e está registrada como pendência em
  `docs/PRE-PRODUCTION.md`, seção 10. Verificar isto exige conta em provedor de coleta.

- [ ] 🔒 **O health check da plataforma consulta `/health/ready`**
  Criar a rota não faz ninguém consultá-la. Apontar o health check da Vercel, do Cloud Run ou do uptime
  check escolhido é passo de console de provedor, e está na seção 10 de `docs/PRE-PRODUCTION.md`.

- [ ] 🔒 **A retenção de log da plataforma cobre um post-mortem**
  Quanto tempo o stdout indexado sobrevive depende do plano contratado no provedor de deploy. O plano
  escreveu "cerca de uma hora" para o free tier da Vercel sem fonte com data; quem for usar esse número
  precisa lê-lo no painel antes.

## Roteiro de teste manual

Pré-requisitos: `pnpm --filter api dev` na 3002 e `pnpm --filter app dev` na 3000. Nenhuma env extra.

1. `curl -i http://localhost:3002/health` → `200`, corpo `{"message":"OK"}`, header `x-request-id` com um
   UUID. Repetir: o UUID muda.
2. `curl -i -H "x-request-id: FORJADO" http://localhost:3002/health` → volta um UUID do servidor, nunca
   `FORJADO`.
3. `curl -i -H "Origin: http://localhost:3000" http://localhost:3002/health` → cabeçalho
   `access-control-expose-headers: Retry-After, x-request-id`.
4. `curl -i -X OPTIONS -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST"
   http://localhost:3002/entities` → `204` com o mesmo cabeçalho.
5. `curl -i -H "Origin: https://evil.example" http://localhost:3002/health` → `403`
   `AUTH_FORBIDDEN_ORIGIN`, com `x-request-id` e sem `Access-Control-Allow-Origin`. No terminal da API,
   uma linha `[security] blocked reason=origin … requestId=<o mesmo UUID>`.
6. `curl -i http://localhost:3002/health/ready` → `200` `{"data":{"ready":true}}` em menos de 2 s.
7. Derrubar a API e subi-la de novo com `FIRESTORE_EMULATOR_HOST=127.0.0.1:9`. Repetir o passo 6: `503`
   `{"error":{"code":"HEALTH_DEPENDENCY_UNAVAILABLE"}}` por volta de 2 s, e `/health` continua `200` em
   milissegundos. No terminal, `[request] readiness-failed reason=timeout`, sem mensagem do driver.
8. Abrir `http://localhost:3000/pt-br/forgot-password`, preencher um e-mail e enviar. Com `RESEND_TOKEN`
   vazio, o toast traz `O envio de e-mails não está configurado. Fale com o suporte. (Código do erro:
   <uuid>)`. Conferir na aba de rede que o `x-request-id` da resposta é o mesmo UUID do toast.
9. Repetir o passo 8 em `/en/forgot-password` (`Error code`) e `/es/forgot-password`
   (`Código del error`).
10. Trocar o tema pelo seletor e repetir: o toast acompanha light e dark. Reduzir a janela para 390×844 e
    repetir: o UUID quebra em linhas dentro do toast, sem estourar a largura e sem truncar.
11. Derrubar a API e enviar o formulário de novo: a mensagem é exatamente `Um erro inesperado aconteceu`,
    sem parênteses, sem rótulo e sem `null`.
12. Para o laço de correlação, criar uma rota temporária que faça `throw` em `apps/api`, chamá-la e
    comparar o `x-request-id` da resposta com o `requestId=` da linha `[request] failed` no terminal.
    Chamá-la de novo com `?search=alguem@example.com`: a query não aparece no log. **Apagar a rota depois.**
