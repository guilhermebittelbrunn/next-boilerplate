# Etapa de entrega

Última etapa antes de um produto criado a partir deste boilerplate ir para o cliente ou para produção. Ela
mede o que foi construído: procura falha de segurança no código do produto, confere a configuração dos
serviços, roda o produto como um usuário rodaria e deixa a documentação pronta para quem chega depois.

**Todo fork passa por aqui antes da entrega final.** Não há exceção para produto pequeno, e a maior parte
das verificações é um comando.

O core também passa. Antes de marcar uma versão do boilerplate como ponto de partida de forks, a mesma
etapa roda sobre ele, e o que reprovar vira spec em [`specs/`](../../specs/BACKLOG.md).

## As quatro partes

Cada parte tem a sua especificação, com o que verificar, como medir e quando o item está aprovado.

| # | Parte | Especificação | Quem executa | Resultado |
|---|-------|---------------|--------------|-----------|
| 1 | 🔒 Validação de segurança | [`01-security-review.md`](01-security-review.md) | Claude (leitura de código + comandos) e uma pessoa na revisão | Nenhuma falha 🔴 aberta no código do produto |
| 2 | 🛡️ Infra e hardening | [`02-infra-hardening.md`](02-infra-hardening.md) | Uma pessoa nos consoles, ou o Claude Cowork com o [prompt pronto](cowork-infra-prompt.md) | Controles ligados em GitHub, Vercel, Firebase/GCP, Arcjet, Stripe e Resend |
| 3 | 📈 Qualidade do produto | [`03-product-quality.md`](03-product-quality.md) | Claude (`analista-qa` com `agent-browser`) e PageSpeed | Celular, formulários, 404, desempenho e SEO medidos |
| 4 | 📚 Documentação | [`04-documentation.md`](04-documentation.md) | Claude (skill `brag-slim`) e uma pessoa na revisão | README no [modelo](../templates/README.template.md), vídeo e GIF do produto |

A ordem importa. Correção de segurança muda código, e a qualidade precisa ser medida sobre o código final.
O vídeo e o README vêm por último porque mostram o produto que vai ser entregue.

## Como rodar

Com o Claude Code, na raiz do fork:

```
/deliver            # as quatro partes, em ordem
/deliver 3          # só a parte 3 (aceita 1, 2, 3, 4 ou uma lista: 1,3)
```

O comando [`/deliver`](../../.claude/commands/deliver.md) segue estas especificações, roda os comandos de
verificação, aciona os agents que cada parte pede e grava o relatório. Sem o Claude Code, siga as quatro
especificações à mão e preencha o mesmo relatório.

## O relatório

Cada rodada grava `docs/delivery/reports/<AAAA-MM-DD>/report.md`, a partir do
[`report-template.md`](report-template.md). O relatório é versionado: é a prova de que o produto foi
medido, e o README do fork aponta para o mais recente (seção "✅ Entrega" do modelo).

Screenshots ficam em `docs/delivery/reports/<AAAA-MM-DD>/screenshots/`, que o `.gitignore` descarta. O que
um print prova precisa estar escrito no relatório.

⛔ **Nada de segredo no relatório.** Nem senha, nem token, nem chave, nem e-mail de pessoa real. Saída de
comando que traga um desses vai resumida ("a chave começa com `ajkey_`", "403 PERMISSION_DENIED"), nunca
colada inteira.

## Status de cada item

| Status | Significa |
|--------|-----------|
| ✅ | Aprovado, com a evidência escrita no relatório |
| ❌ | Reprovado. Precisa de correção antes da entrega ou de uma pendência aceita |
| ➖ | Não se aplica ao produto, com o motivo (por exemplo, upload num produto que não recebe arquivo) |
| 🔒 | Não verificado por falta de acesso ou de infra. Vira pendência com dono |

E a gravidade de cada reprovação:

| Gravidade | Regra |
|-----------|-------|
| 🔴 Bloqueia | A entrega não acontece com ela aberta. Exemplos: segredo no Git, rota sem guard, rules do Firestore abertas, `robots.txt` bloqueando produção |
| 🟡 Pendência | A entrega pode acontecer se a pendência tiver dono e prazo no relatório e entrar no [`PRE-PRODUCTION.md`](../PRE-PRODUCTION.md) |
| 🟢 Melhoria | Registrada no relatório, sem prazo |

Cada especificação diz a gravidade padrão de cada item. A pessoa que assina o relatório pode subir uma
gravidade, nunca baixar sem escrever o porquê.

**A entrega está aprovada quando** as quatro partes terminam sem nenhum 🔴 aberto, toda 🟡 tem dono e prazo,
e uma pessoa do time assinou o relatório.

## O que esta etapa não substitui

| Documento | Papel | Quando |
|-----------|-------|--------|
| [`FORKING.md`](../FORKING.md) | Criar o produto e publicar a primeira vez | No começo do fork |
| [`PRE-PRODUCTION.md`](../PRE-PRODUCTION.md) | Os passos de console, DNS e painel, com a verificação de cada um | Antes de abrir para usuários |
| [`review-checklist.md`](../review-checklist.md) | As invariantes que cada PR respeita | Em toda PR, pelo `/review` |
| [`SECURITY.md`](../SECURITY.md) | O modelo de segurança do core | Referência |

A etapa de entrega não refaz o trabalho desses documentos. Ela confere, no fim, que o produto ficou do jeito
que eles descrevem, e mede o que nenhum deles mede: desempenho, SEO, celular, vídeo e README.

## Lacunas conhecidas do core

O core ainda não passa em todos os itens. As lacunas medidas em 2026-11-19 estão nestas specs, e um fork
criado antes da entrega delas herda a lacuna e precisa tratá-la na própria etapa de entrega:

- [`specs/delivery-security-review.md`](../../specs/delivery-security-review.md): itens da parte 1.
- [`delivery-infra-hardening`](../features/delivery-infra-hardening/spec.md): itens da parte 2, entregues no
  core pela PR #65 (`afb5b35`). Um fork criado antes disso ainda precisa tratá-los.
- [`specs/delivery-product-quality.md`](../../specs/delivery-product-quality.md): itens da parte 3.

Quando uma dessas specs for entregue, o `/spec --sync` a move para `docs/features/<slug>/spec.md` e atualiza
este parágrafo.
