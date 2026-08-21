# Regra global — comentários no código

Aplica-se a **todo agent que escreve ou edita código** (`desenvolvedor`, `revisor-codigo`,
`analista-qa`, `mediador-pr`) e ao loop principal. Vale para código de produção, testes, scripts,
regras do Firestore e arquivos de tradução.

## 1. O padrão é NÃO comentar

Comentário é dívida: envelhece, mente e some do radar em refactor. Escreva o código de forma que ele se
explique — nome de variável/função claro, função pequena, early return, extração de helper.
Se está sentindo vontade de comentar, primeiro tente **reescrever o código**.

**Nunca comente:**

- o que o código já diz (`// cria a entidade` em cima de `createEntity()`);
- que algo é um hook, um DTO, um mapper, um repositório, um getter;
- lógica que qualquer dev competente entende só lendo (um `map`, um `if` óbvio, um guard trivial);
- código morto/comentado — apague, o git guarda o histórico;
- seções decorativas (`// ----- helpers -----`), TODOs genéricos sem dono nem contexto.

## 2. As duas exceções legítimas

Comente **só** nestes dois casos, sempre explicando o **porquê**, nunca o **o quê**, e em 1–3 linhas:

1. **Regra de negócio / restrição externa não evidente no código** — ex.: um mínimo cobrado pela Stripe,
   um limite de janela do session cookie do Firebase, uma ordem de eventos que o provedor impõe.
2. **Código genuinamente difícil de decifrar** — algoritmo não óbvio, workaround de bug de biblioteca,
   edge case contraintuitivo, race condition tratada de propósito, hidratação/SSR com armadilha real.

## 3. ⛔ NUNCA referencie o fluxo de desenvolvimento com agents

`docs/features/` **é versionado** (é o histórico de como cada feature foi construída), mas isso **não**
autoriza o código a apontar para lá. Três razões:

1. **Um comentário precisa ser autossuficiente.** Quem lê está naquela linha, depurando — não vai abrir
   `docs/features/<slug>/analyze/plan.md` para entender um `if`.
2. **O plano descreve a intenção de um momento; o código evolui.** O ponteiro apodrece: em seis meses o
   plano descreve algo que a linha ao lado já não faz. É pior que nenhum comentário, porque mente com
   aparência de autoridade.
3. **Parte das fontes não está no repo mesmo**: card de tarefa, wiki, print, Figma e a conversa com os
   agents. Essas referências nascem quebradas para qualquer pessoa fora daquele contexto.

**Proibido em comentário (e em mensagem de commit e docstring):**

- caminhos/artefatos do fluxo: `analyze/plan.md`, `develop/handoff.md`, `review/review.md`,
  `criterios-aceite.md`, `STATE.md`, `docs/features/...`;
- IDs e códigos internos do processo: `DEV-1234`, "card do ClickUp", "conforme a wiki", "print anexado",
  "Figma", "critério 3", "cenário 1b";
- narração da autoria/etapa: "ajustado no review", "corrigido após o QA", "pedido pelo revisor",
  "conforme discutido", "solicitado na análise", "gerado pelo agent";
- justificativa de edição: "mudado para atender ao plano", "adicionado nesta task".

Se a informação for **realmente** necessária para entender o código, **traga o conteúdo, não o ponteiro**:
escreva a regra de negócio em si (autocontida), sem citar de onde ela veio.

```ts
// ❌ referência quebrada
// Ajustado conforme o critério 4 do plano (docs/features/stripe-checkout/analyze/plan.md).
if (amount < MIN_CHARGE) amount = MIN_CHARGE;

// ✅ a regra, autocontida
// A Stripe rejeita cobranças abaixo de 50 centavos, então elevamos ao mínimo aceito.
if (amount < MIN_CHARGE) amount = MIN_CHARGE;

// ✅ melhor ainda: sem comentário, com o porquê no nome
const chargeableAmount = Math.max(calculatedAmount, STRIPE_MIN_CHARGE);
```

## 4. Onde o contexto do fluxo deve morar

Nada disso se perde — só não vai no código:

- decisões, desvios e pendências → `develop/handoff.md`, `review/review.md`;
- rastreio da tarefa → `STATE.md` (e o card, quando houver);
- o que mudou e por quê → **mensagem de commit** e descrição da PR. Descreva **a mudança em si**; não
  cite `plan.md`/`handoff.md`/ID de card, mesmo eles estando no repo.

Se uma decisão registrada no `handoff.md` é importante o bastante para quem lê o código, então ela deve
**virar código legível ou um comentário autocontido** — não um link.
