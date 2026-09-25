---
id: observability-logging
title: "Observabilidade: erros, tracing e logs estruturados"
status: in-progress
value: alto
effort: M
audience: dx
area: [apps/api, apps/app, apps/web, packages/analytics, packages/shared]
mode: ambos
depends_on: []
contends_on: [packages/shared/utils/helpers/requestErrorReporter.ts]
feature: observability-logging
updated: 2026-09-24
---

# Observabilidade: erros, tracing e logs estruturados

## Problema

Quando algo quebra em produção num fork deste boilerplate, ninguém fica sabendo. O modo padrão de descobrir
um bug é o cliente reclamar; o de investigar é pedir para ele reproduzir.

A PR #15 fechou a metade mecânica desse problema: hoje existe trilha, existe identificador por requisição e
existe um endpoint de prontidão que consulta o banco. O que **não** existe é quem vigia a trilha. O log sai
no stdout do processo, a plataforma o indexa, e ninguém é notificado — alguém ainda precisa ir olhar. Em
fluxos que envolvem dinheiro, como o webhook de pagamento, a falha agora deixa registro rastreável, mas
segue invisível até alguém conferir a fatura.

## O que já existe no repo

> **Seção reescrita em 2026-09-16, depois da PR #15** (`f8322f1`, mergeada em `main`, CI `success` no SHA
> de merge). O inventário anterior descrevia um repositório sem logger compartilhado, sem identificador de
> requisição e com um endpoint de saúde de duas linhas. Nenhuma dessas três afirmações continua verdadeira,
> e mantê-las seria o pior tipo de erro que uma spec comete: acusar de ausente algo que já está no código.
> O histórico de como a convenção de log se degradava por cópia — que era o argumento central desta spec —
> está preservado na spec e no plano da feature, em `docs/features/observability-logging/`.

### O que a PR #15 entregou

- **Helper de log compartilhado, com escopo fechado.** `packages/shared/utils/helpers/log.ts:51-57` expõe
  `logEvent(scope, event, fields)` e emite uma linha `[escopo] evento chave=valor`. O escopo é uma união
  fechada de **nove** valores (`:5-14`), então um call site novo precisa declarar onde pertence em vez de
  inventar um prefixo. A assinatura **não aceita objeto** (`:21`): passar um `Error` não compila, o que
  transforma em erro de tipo o vazamento que antes dependia de disciplina. `sanitizeValue` (`:27-29`) troca
  espaço em branco por `_`, de modo que um valor com quebra de linha não consiga forjar uma segunda entrada.
  *(Âncoras e contagem remedidas em 2026-09-17: a PR #18 acrescentou o escopo `audit` à união, deslocando o
  restante do arquivo em uma linha.)*
- **As variações de formato acabaram.** Os **16** pontos de log deliberado passam todos pelo helper, entre
  eles `apps/api/proxy.ts:67`, `webhooks/payments/route.ts:157,169`, `users/route.ts:73`,
  `auth/sign-up/route.ts:38`, `auth/password/reset/route.ts:53`, `auth/password/reset-request/route.ts:47`,
  `(shared)/lib/storage.ts:89`, `account-avatar.ts:45`, `entity-photo.ts:62` e os dois que a PR #18 trouxe
  em `(shared)/lib/audit-recorder.ts:112` e `:163` (o caminho fail-open da trilha). *(Âncoras de `proxy.ts` e `storage.ts` remedidas em 2026-09-23: a PR #23 deslocou as duas. A mesma PR
  acrescentou dois pontos novos pelo helper, `account-export.ts:90` e `account-erasure.ts:111`: `git grep "logEvent("`
  fora de `__tests__` dá 19 chamadas hoje, contra 17 no `03498ae`. A distância entre 17 e os 16 desta
  linha é de recorte, não de fato. Chamadas de `console` cru seguem em 18 em 12 arquivos, 7 delas em
  `packages/auth/server.ts`.)* *(Remedido em 2026-09-24, com a PR #25 mergeada: `git grep "logEvent("` fora
  de testes dá 26 linhas, uma delas a definição em `log.ts`, ou seja 25 chamadas. A PR levou o webhook reescrito de duas para
  cinco chamadas e acrescentou uma em cada rota de `payments/`. As âncoras `account-export.ts:90` e
  `account-erasure.ts:111` desceram para `:100` e `:159`. Chamadas de `console` cru passaram a 19 em 12
  arquivos: a nova é o aviso de chave Stripe pela metade no boot, `apps/api/instrumentation.ts:19`.)*
  Os dois clones que esta spec
  usava como evidência — `entity-photo.ts` e `account-avatar.ts`, que antes tinham só o prefixo — hoje
  emitem `sign-url-failed resource=…`, e a diferença entre eles é um campo, não um formato.
- **Identificador por requisição, do proxy até a tela.** `apps/api/proxy.ts:122` gera o UUID, `:161` o
  repassa ao handler pelo header de entrada e `:75-76` o carimba na resposta.
  `packages/shared/utils/helpers/request-id.ts:6` concentra o nome do header, e
  `formattedError.ts:24,117` o lê de volta da resposta que o browser recebeu, para que o identificador do
  toast case com o `requestId=` da linha de log.
- **`onRequestError` nos três apps** — `apps/api/instrumentation.ts:36-37`, `apps/app/instrumentation.ts:4-5`
  e `apps/web/instrumentation.ts:4-5`, todos apontando para `requestErrorReporter.ts:39-53`, que emite a
  linha estruturada e só então repassa o objeto de erro. `pathWithoutQuery` (`:21-23`) descarta a query
  string antes de logar, porque ela carrega o que o usuário digitou.
- **Prontidão separada de vida.** `health/route.ts:3` fixa `force-dynamic`, então a rota deixou de ser
  pré-renderizada; `health/ready/route.ts` consulta o Firestore via `(shared)/lib/readiness.ts:31-57`, com
  teto de 2 s (`:9`), e responde um booleano nu — sem nome de dependência, sem versão, sem mensagem do
  driver.
- **Nada disso custa nada a um fork.** Zero dependência nova, zero variável de ambiente nova, zero linha
  em `.env.example`. O modo degradado é o modo padrão.

### O que segue aberto

- **Ninguém é notificado.** Não há coletor plugado no `onRequestError`: a linha sai no stdout e a plataforma
  a indexa. Descobrir um erro continua dependendo de alguém abrir o painel. É o item 1 do corte, e é a
  razão de esta spec não estar fechada — detalhe em [Estado da entrega](#estado-da-entrega).
- **`packages/auth/server.ts` não foi migrado** e concentra **7** das 14 chamadas de `console` cruas que
  sobraram (`:191`, `:204`, `:220`, `:253`, `:279`, `:308`, `:327`), todas passando o objeto de erro e sem
  prefixo — num pacote de autenticação, que é onde o objeto de erro tem mais chance de carregar
  identificador de usuário.
  Recontagem de 2026-09-19, depois da PR #21: **16 chamadas `console.*` em 10 arquivos**, das quais 2 são o
  próprio helper (`log.ts:56`) e o repasse deliberado do erro não tratado (`requestErrorReporter.ts:52`).
  Sobram **14 em 8 arquivos**, contra 24 em 19 antes da PR #15. ⚠️ **O número piorou, e a causa é a
  PR #20**, que acrescentou duas chamadas cruas (`:308`, `:327`) ao mesmo arquivo que esta spec vinha
  apontando há cinco rodadas. *(As âncoras `:263` e `:276` da versão anterior deslocaram para `:253` e
  `:279`. E a rodada de 2026-09-16 escreveu "9 arquivos": subtraiu as 2 chamadas do total e esqueceu de
  subtrair os 2 arquivos que as hospedam.)*
- **`packages/email` mantém um helper próprio.** `packages/email/index.ts:39-49` (`logEmail`) produz
  exatamente o mesmo formato do `logEvent`, com `console.warn` direto. Não é divergência de formato, é
  duplicação de código — e o teste que reprova quem logar o objeto de erro
  (`packages/email/__tests__/logPrivacy.test.ts`) vigia só esta cópia.
- **`provider-error` continua colapsando três falhas distintas** — cota estourada, domínio não verificado e
  chave revogada — num único motivo (`packages/email/index.ts:120-130`). Descartar o objeto de erro é
  correto e deliberado (ele carrega o endereço do destinatário), mas ninguém distingue "acabou a cota" de
  "revogaram a chave" sem abrir o painel do provedor.
- **`import-in-the-middle` e `require-in-the-middle` seguem declarados e nunca importados**
  (`apps/app/package.json:27,36` — as duas linhas desceram uma posição na PR #16, que acrescentou
  `@repo/analytics`). São as dependências típicas de OTel/Sentry e continuam sendo peso morto: a PR #15
  entregou observabilidade **sem** tocá-las.

### Histórico, preservado por ser o argumento que sustentou a spec

- `apps/api/instrumentation.ts:15-34` deixou de ser um stub vazio em 2026-08-31
  (`firestore-admin-access`): o `register()` roda no boot e resolve a instância do Firestore, para que a
  falta de credencial mate o processo em vez de degradar. Desde `api-hardening` ele também derruba o boot
  quando falta `CORS_ORIGIN` em produção (`:20-24`) e emite um aviso de boot quando o rate limit está
  desligado (`:26-30`). ⚠️ **Correção de 2026-09-19:** a versão anterior dizia que este era "o único
  `console` cru que sobrou na `apps/api`". Não é — `apps/api/app/global-error.tsx:15` também tem um
  `console.error("Global error:", error)`.
- **A tese que sustentou esta spec por cinco rodadas, e que a PR #15 resolveu.** A convenção de log —
  linha única, prefixo entre colchetes, pares `chave=valor`, nenhum dado pessoal — emergiu sozinha em
  `api-hardening` e `transactional-emails`, e depois se propagou **por cópia**. Cada entrega nova a repetia
  no caminho comum e a degradava no caminho raro: a PR #11 criou `entity-photo.ts` com só o prefixo, e a
  #12 criou `account-avatar.ts` como clone textual do anterior. O placar antes da PR #15 era 4 conformes,
  3 semiconformes e 1 não-conforme. A leitura que os dados sustentavam não era "sem helper ninguém segue a
  convenção" — dois terços dos pontos novos nasciam certos por imitação —, era mais estreita e continua
  valendo como aprendizado: **sem helper, a convenção se degrada na borda**, e a borda é onde ninguém relê.
  O helper com escopo tipado fechou esse caminho, porque agora a forma errada não compila.
- `packages/analytics/server.ts` foi apagado em 2026-09-01 pelo saneamento de `ci-pipeline` (importava
  `posthog-node`, não declarado, e lia chaves que o `keys.ts` nunca declarou). É o item 6 do corte, entregue
  por tabela.
  > **Atenção ao homônimo (2026-09-16).** A PR #16 criou um arquivo **novo** no mesmo caminho: hoje
  > `packages/analytics/server.ts` é o resolvedor de bootstrap de consentimento, com `import "server-only"`
  > e sem dependência não declarada. Quem ler "foi apagado" e encontrar o arquivo no disco vai concluir que
  > houve regressão — não houve. O código morto continua fora; o nome foi reaproveitado.
  `@repo/analytics` segue sem dependência oculta, declarando `NEXT_PUBLIC_GA_MEASUREMENT_ID` como sua
  única env.
- `packages/security/index.ts:42-44` — o padrão de referência do repo para integração opcional: sem a
  variável de ambiente, a função retorna sem fazer nada. É o critério que o coletor precisa seguir quando
  alguém o adotar.

## Estado da entrega

**Auditado em 2026-09-16 contra o código, não contra o `status` gravado.** PR **#15** mergeada em `main` em
2026-09-16T17:01:02Z (merge commit `f8322f1`), CI `success` nesse SHA.

**Reconferido depois do merge da PR #17** (`c36e084`): a tabela abaixo continua valendo item a item, e a
busca por `sentry`/`betterstack`/`logtail`/`axiom` nos `package.json` segue devolvendo zero. O item 1
continua parcial pelo mesmo motivo, e a pergunta em aberto nº 1 vai ao usuário pela terceira rodada.

| item do corte | veredito | evidência |
|---------------|----------|-----------|
| 1. Erro não tratado coletado nos três apps, e chega a quem opera | **parcial** | o gancho existe e emite trilha (`apps/api/instrumentation.ts:36-37`, `apps/app/instrumentation.ts:4-5`, `apps/web/instrumentation.ts:4-5` → `requestErrorReporter.ts:39-53`); **não há coletor e ninguém é notificado** |
| 2. Identificador por requisição, do log até a resposta de erro | **implementado** | `apps/api/proxy.ts:122,161,75-76` · `packages/shared/utils/helpers/request-id.ts:6` · `formattedError.ts:24,117` |
| 3. `console` cru substituído por log estruturado nos fluxos críticos | **implementado** | `webhooks/payments/route.ts:157,169` · `users/route.ts:73` · `auth/sign-up/route.ts:38`, todos com `requestId` |
| 4. Endpoint de saúde deixa de mentir | **implementado** | `health/route.ts:3` (`force-dynamic`) · `health/ready/route.ts` · `(shared)/lib/readiness.ts:31-57`, booleano nu, teto de 2 s em `:9` |
| 5. Camada no-op sem a variável do serviço | **implementado**, por não haver serviço | zero dependência nova, zero env nova, zero linha em `.env.example` |
| 6. Código morto de analytics removido | **implementado** | entregue por tabela em 2026-09-01 |

**Por que a spec não foi fechada:** o item 1 pede que o erro chegue a quem opera "sem o cliente precisar
avisar", e os sinais de pronto pedem alerta rastreável no webhook de pagamento. A entrega parou na costura,
por decisão documentada no plano da feature: adotar um serviço gerenciado de coleta exige conta em
provedor, e `.claude/cycle-policy.md` proíbe provisionar infraestrutura numa rodada autônoma. A decisão é a
**pergunta em aberto nº 1 desta própria spec**, que nunca foi respondida.

O resíduo é pequeno e bem delimitado: acrescentar a chamada do provedor dentro de `reportRequestError` e a
variável correspondente, no padrão opt-in do `ARCJET_KEY`. Está registrado como passo de console em
[`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md), seção 11 ("Fechar o circuito de observabilidade") —
o ponteiro para a seção 10 estava errado, e a 10 é a CSP bloqueante da `apps/web`.

## Evidência de mercado

- Nota: [`research/engineering-baseline.md`](research/engineering-baseline.md)
- **Prática 6 (error tracking / tracing)** — *padrão de facto*; a dor evitada é literalmente "bug descoberto
  pelo cliente". A nota registra duas armadilhas grandes: Sentry v8+ configura OpenTelemetry por conta
  própria e **conflita com `@vercel/otel`**, quebrando a propagação de trace (é preciso desligar o setup
  automático de OTel); e amostragem de trace em 100% **queima cota** rapidamente.
- **Prática 7 (logs estruturados + request id)** — *padrão de facto*, esforço P–M, contra "incidente sem
  trilha". Armadilhas: `pino` **não roda no Edge Runtime**, o que restringe onde o logger pode viver;
  `headers()` é assíncrono no Next 15+, então o identificador entra no contexto no início do handler; e
  nunca logar token ou dado pessoal.
- **Prática 15 (health / readiness)** — *consolidada*, esforço P. Armadilha diretamente aplicável ao
  arquivo atual: sem forçar renderização dinâmica o Next pré-renderiza a rota e o health **mente para
  sempre**. A nota também alerta que um readiness público que enumera dependências e versões é vazamento.
- Custo: a nota classifica Sentry como serviço que **requer conta** (com free tier) e exige que seja
  opt-in por variável ausente, no padrão do `ARCJET_KEY`.

## Proposta — corte de MVP

- [~] Um erro não tratado, em qualquer um dos três apps, é registrado num serviço de coleta com stack, rota
      e contexto do usuário — e chega a quem opera sem o cliente precisar avisar. — **parcial:** a trilha
      existe e é correlacionável; o coletor e a notificação não.
- [x] Cada requisição da API carrega um identificador que aparece em todo log daquela requisição e volta na
      resposta de erro, colando o que o usuário vê ao que o servidor registrou. — `apps/api/proxy.ts:122`
      gera, `:161` repassa ao handler, `:75-76` carimba na resposta; `formattedError.ts:117` lê de volta.
- [x] Os pontos que hoje usam `console` em fluxos críticos (webhook de pagamento, criação de perfil)
      passam a emitir log estruturado com esse identificador. — `webhooks/payments/route.ts:157,169`,
      `users/route.ts:73`, `auth/sign-up/route.ts:38`.
- [x] O endpoint de saúde deixa de mentir: distingue "o processo está de pé" de "as dependências
      respondem", e não é pré-renderizado. — `health/route.ts:3` e `health/ready/route.ts`, sobre
      `(shared)/lib/readiness.ts:31-57`.
- [x] Toda essa camada é **no-op quando a variável do serviço não existe** — um fork sem conta continua
      rodando, apenas sem coleta remota. — cumprido de forma trivial: não há serviço, nem env, nem
      dependência nova.
- [x] O código morto de analytics de servidor é removido ou consertado. — **entregue por tabela** em
      2026-09-01 pelo saneamento de `ci-pipeline`: `packages/analytics/server.ts` foi apagado. Item
      cumprido fora desta spec; o restante do corte segue intacto.

### Fora do corte

- Tracing distribuído completo entre os três apps e o Firestore: exige decidir a relação com OpenTelemetry
  e a armadilha de conflito da prática 6. Comece por erros e request id.
- Alertas, painéis e política de retenção: configuração de conta, não código do boilerplate.
- Métricas de negócio e analytics de produto — assunto distinto de observabilidade de falha.
- Session replay, performance no cliente e monitoramento sintético externo: cota alta, ganho pequeno num MVP.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Propagar/expor o identificador de requisição nas respostas de erro, sem mudar o formato `{ error: { code } }`. |
| `apps/api` | Instrumentação real no lugar do stub; identificador por requisição; logs estruturados nos handlers críticos; endpoint de saúde com verificação de dependência. |
| `apps/app` | Ganha instrumentação (hoje inexistente) e captura de erro do cliente. |
| `apps/web` | Idem, em escala menor. |
| `packages/*` | Logger compartilhado (provavelmente em `shared`); `analytics` tem código quebrado a resolver. |
| Infra/env | Variáveis do serviço de coleta, **todas opcionais**; taxa de amostragem configurável. Nenhuma env obrigatória nova. |

## Riscos e trade-offs

- **Custo herdado por todo fork:** o serviço de coleta exige conta. Se a integração não for estritamente
  no-op na ausência da variável — como `packages/security/index.ts:42-44` já faz com `ARCJET_KEY` — todo
  fork passa a ter uma env obrigatória a mais para subir. Este é o risco número um da spec.
- **Cota queimada por amostragem alta** (prática 6): o free tier some em dias se o padrão for coletar tudo.
  O default do boilerplate precisa ser conservador, e o valor precisa ser configurável.
- **Vazamento de dado pessoal no log** (prática 7): token, e-mail e corpo de requisição não podem entrar.
  Num repo com autenticação e pagamento, um log descuidado é um incidente de privacidade — e cruza com o
  escopo de `data-rights-lgpd`, entregue na PR #23. O expurgo de conta dela registra só o **nome** do erro
  de cada passo, nunca a mensagem (`apps/api/(shared)/lib/account-erasure.ts:32-36`), porque a mensagem de
  uma falha do Firestore ou do Admin SDK carrega caminho de documento e payload do titular.
- **Conflito de instrumentação** (prática 6): coletor e plataforma disputam a configuração de
  OpenTelemetry, e o sintoma é trace mudo — falha silenciosa, difícil de perceber. **Restrição de runtime**
  (prática 7): o logger recomendado não roda no Edge, o que pode forçar caminhos distintos por runtime.
- Readiness que enumera dependências e versões publicamente é reconhecimento gratuito para um atacante
  (prática 15); o detalhe precisa ser protegido, não exposto.

## Sinais de pronto

Marcados com o resultado do `/test` da feature (16 critérios aprovados, 0 reprovados, 4 sem infra):

- ✅ Provocar um erro em cada um dos três apps produz registro consultável, com rota e stack. **Ressalva:**
  o registro sai no stdout do processo, então "sem terminal" depende de a plataforma indexar o log.
- ✅ A partir do identificador que o usuário vê numa tela de erro recupera-se toda a trilha da requisição —
  verificado em build de produção, não em `next dev`.
- ❌ Uma falha no webhook de pagamento gera **alerta** rastreável. Hoje gera **registro** rastreável
  (`webhooks/payments/route.ts:169`); alerta exige o coletor.
- ✅ Derrubar o acesso ao banco faz o endpoint de prontidão falhar; o de vida continua respondendo.
- ✅ Subir tudo do zero sem nenhuma variável de coleta funciona — é o modo padrão.
- ✅ Nenhum token, senha ou e-mail aparece nos logs: a assinatura do helper não aceita objeto, e a query
  string é descartada antes de logar (`requestErrorReporter.ts:21-23`).

## Perguntas em aberto

- 🔴 **A que decide o destino desta spec:** adotar um serviço gerenciado de coleta de erros ou ficar só em
  log estruturado na plataforma de deploy? A PR #15 entregou a segunda metade e deixou a pergunta aberta,
  porque adotar um serviço exige conta em provedor. **Recomendação:** fechar esta spec como entregue e
  abrir uma spec própria para o coletor, com esforço P, em vez de manter uma spec quase inteira parada por
  um item que depende de decisão de produto. Alternativa defensável: manter aberta até o coletor existir.
- ✅ **Decidida pela entrega:** o identificador de requisição é exposto ao usuário final na mensagem de
  erro, sem detalhe interno da falha. `formattedError.ts:24` o guarda, e o dicionário ganhou o rótulo
  correspondente.
- ✅ **Decidida em 2026-09-01:** o código de analytics de servidor foi removido, não consertado.
