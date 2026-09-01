---
id: observability-logging
title: "Observabilidade: erros, tracing e logs estruturados"
status: proposed
value: alto
effort: M
audience: dx
area: [apps/api, apps/app, apps/web, packages/analytics, packages/shared]
mode: ambos
depends_on: []
feature: -
updated: 2026-08-31
---

# Observabilidade: erros, tracing e logs estruturados

## Problema

Quando algo quebra em produção num fork deste boilerplate, ninguém fica sabendo. Não há coleta de erros,
trilha por requisição nem log estruturado: o que existe são chamadas soltas a `console` que somem na saída
da plataforma, sem identificador, sem usuário, sem correlação entre o clique no navegador e a falha no
servidor. O modo padrão de descobrir um bug é o cliente reclamar; o de investigar é pedir para ele
reproduzir. Em fluxos que envolvem dinheiro, como o webhook de pagamento, uma falha de processamento é
invisível até alguém conferir a fatura.

## O que já existe no repo

- `apps/api/instrumentation.ts:8-15` — **deixou de ser um stub vazio** em 2026-08-31
  (`firestore-admin-access`): o `register()` roda no boot e resolve a instância do Firestore, para que a
  falta de credencial mate o processo em vez de degradar. Isso prova que o gancho funciona, mas **nenhuma
  observabilidade passa por ele** — nem logger, nem coletor de erro, nem tracing.
  `apps/api/instrumentation-client.ts:1` continua sendo só um comentário, sem exportação.
  **`apps/app` e `apps/web` não têm arquivo de instrumentação nenhum** — a busca no repositório retorna só
  os dois de `apps/api`. Os apps que o usuário acessa não têm nem o gancho.
- Não há Sentry, OpenTelemetry, logger estruturado ou qualquer coleta de erro em nenhum `package.json`.
- Registro de erro hoje é `console`, exatamente onde um incidente silencioso custa caro:
  `apps/api/app/(routes)/webhooks/payments/route.ts:66` (evento de pagamento não tratado) e `:72` (erro no
  webhook); `apps/api/app/(routes)/auth/sign-up/route.ts:38` e `apps/api/app/(routes)/users/route.ts:71`
  (falha ao criar perfil).
- `apps/api/app/(routes)/health/route.ts:3-4` — responde `{"message":"OK"}` fixo. **Não verifica nenhuma
  dependência** e não declara renderização dinâmica: responde OK mesmo com o Firestore fora do ar.
- **Achado: `packages/analytics/server.ts` está quebrado.** A linha 2 importa `posthog-node`, que **não
  está declarado** em `packages/analytics/package.json:9-16`; e as linhas 5-6 leem
  `NEXT_PUBLIC_POSTHOG_KEY`/`NEXT_PUBLIC_POSTHOG_HOST` de `keys()`, mas `packages/analytics/keys.ts:6-18`
  só declara `NEXT_PUBLIC_GA_MEASUREMENT_ID`. É código morto herdado do upstream que não compila se for
  importado — e hoje ninguém importa. Deve ser removido ou consertado antes que um fork o descubra.
- `packages/security/index.ts:16-18` — o padrão de referência do repo para integração opcional: sem a
  variável de ambiente, a função retorna sem fazer nada. É o critério que qualquer serviço novo deve seguir.
- **Lacuna:** nenhum erro é coletado, nenhuma requisição é rastreável, nenhum log é consultável.

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

- [ ] Um erro não tratado, em qualquer um dos três apps, é registrado num serviço de coleta com stack, rota
      e contexto do usuário — e chega a quem opera sem o cliente precisar avisar.
- [ ] Cada requisição da API carrega um identificador que aparece em todo log daquela requisição e volta na
      resposta de erro, colando o que o usuário vê ao que o servidor registrou.
- [ ] Os pontos que hoje usam `console` em fluxos críticos (webhook de pagamento, criação de perfil)
      passam a emitir log estruturado com esse identificador.
- [ ] O endpoint de saúde deixa de mentir: distingue "o processo está de pé" de "as dependências
      respondem", e não é pré-renderizado.
- [ ] Toda essa camada é **no-op quando a variável do serviço não existe** — um fork sem conta continua
      rodando, apenas sem coleta remota.
- [ ] O código morto de analytics de servidor é removido ou consertado.

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
  no-op na ausência da variável — como `packages/security/index.ts:16-18` já faz com `ARCJET_KEY` — todo
  fork passa a ter uma env obrigatória a mais para subir. Este é o risco número um da spec.
- **Cota queimada por amostragem alta** (prática 6): o free tier some em dias se o padrão for coletar tudo.
  O default do boilerplate precisa ser conservador, e o valor precisa ser configurável.
- **Vazamento de dado pessoal no log** (prática 7): token, e-mail e corpo de requisição não podem entrar.
  Num repo com autenticação e pagamento, um log descuidado é um incidente de privacidade — e cruza com o
  escopo de `data-rights-lgpd`.
- **Conflito de instrumentação** (prática 6): coletor e plataforma disputam a configuração de
  OpenTelemetry, e o sintoma é trace mudo — falha silenciosa, difícil de perceber. **Restrição de runtime**
  (prática 7): o logger recomendado não roda no Edge, o que pode forçar caminhos distintos por runtime.
- Readiness que enumera dependências e versões publicamente é reconhecimento gratuito para um atacante
  (prática 15); o detalhe precisa ser protegido, não exposto.

## Sinais de pronto

- Provocar um erro em cada um dos três apps produz registro consultável, com rota e stack, sem terminal.
- A partir do identificador que o usuário vê numa tela de erro recupera-se toda a trilha da requisição.
- Uma falha no webhook de pagamento gera alerta rastreável, em vez de sumir na saída padrão.
- Derrubar o acesso ao banco faz o endpoint de prontidão falhar; o endpoint de vida continua respondendo.
- Remover as variáveis do serviço de coleta e subir tudo do zero funciona normalmente, sem erro de env.
- Nenhum token, senha ou e-mail aparece nos logs de um fluxo completo de cadastro e assinatura.

## Perguntas em aberto

- Adotar um serviço gerenciado de coleta de erros ou ficar só em log estruturado na plataforma de deploy?
  — **recomendação:** serviço gerenciado, opt-in por env; log estruturado sozinho não notifica ninguém.
- O código de analytics de servidor deve ser **removido** ou consertado? — **recomendação:** remover; está
  quebrado, não é usado por ninguém, e reintroduzir analytics de produto é decisão de outra spec.
- O identificador de requisição deve ser exposto ao usuário final na mensagem de erro? — **recomendação:**
  sim, é o que torna o suporte viável; nunca junto de detalhe interno da falha.
