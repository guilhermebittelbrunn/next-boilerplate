---
name: market-research
description: Pesquisa de mercado com fontes para decidir se uma funcionalidade vale entrar neste boilerplate de MVPs. Levanta prevalência entre starters/SaaS de referência, requisitos de provedores (Stripe, Firebase, Vercel) e obrigações normativas (LGPD/GDPR/WCAG/OWASP), e grava uma nota citável em specs/research/. Use ao escrever ou revisar uma spec, ao avaliar "isso é padrão de mercado?", ou antes de adotar uma dependência/serviço novo.
---

# Pesquisa de mercado para o backlog do boilerplate

Transforma "acho que isso é padrão" em **evidência com fonte e data**. A saída é uma nota em
`specs/research/<topico>.md` que as specs citam em vez de recopiar argumentos.

Este repo é um **core de MVPs**: a pergunta nunca é "isso é legal?", é **"um fork qualquer sentiria falta
disso, e o mercado concorda?"**.

## 0. Antes de pesquisar

1. **Reuse.** Liste `specs/research/` e leia o frontmatter. Se uma nota cobre o tema e
   `revalidate_after` ainda não passou, **use-a** e pare aqui. Repesquisar tema fresco é desperdício.
2. **Delimite a pergunta.** "Notificações" é tema; "vale entregar notificações in-app + preferências de
   e-mail por padrão num boilerplate?" é pergunta pesquisável. Sem pergunta, a pesquisa vira coletânea.
3. **Carregue as ferramentas**: `ToolSearch` com `select:WebSearch,WebFetch`.

## 1. Hierarquia de fontes

Use nesta ordem e **nunca** cite a de baixo quando a de cima existe:

| Nível | Fonte | Exemplo |
|-------|-------|---------|
| 1 | Norma/lei/órgão regulador | texto da LGPD, orientação da ANPD, GDPR, WCAG 2.2, OWASP ASVS |
| 2 | Doc oficial do provedor | Stripe Docs, Firebase Docs, Vercel Docs, Turborepo Docs |
| 3 | Página de features/docs do produto de referência | next-forge, Makerkit, Supastarter, Clerk, WorkOS |
| 4 | Repositório público (código, não README de marketing) | GitHub do starter |
| 5 | Análise técnica assinada, com dados | post de engenharia com números |
| ✖ | Blog de agência, listicle de SEO, conteúdo gerado | **não cite** |

**Fonte primária vence.** Se um blog diz "o Stripe exige X", vá ao Stripe Docs confirmar e cite o Stripe.

## 2. As três lentes (use todas)

Uma spec pode nascer de qualquer uma; um backlog saudável tem as três.

- **`produto`** — valor para o usuário final do fork. Métrica de decisão: **prevalência** entre starters de
  referência + evidência de que a ausência gera atrito real.
- **`dx`** — valor para quem desenvolve/opera o fork. Métrica: **consolidação** (padrão de facto × opcional)
  e a dor concreta que evita.
- **`confianca`** — segurança, privacidade, conformidade e acessibilidade. Métrica: **natureza da
  obrigação** — exigido por lei, exigido por provedor, ou boa prática.

## 3. Medindo prevalência (o número que importa)

Escolha um painel de **8 a 12 referências comparáveis** e verifique **na página de features/docs de cada
uma** se entrega o recurso por padrão. Depois escreva a fração: **"7 de 11"**.

Painel sugerido para SaaS/starters: next-forge · Makerkit · Supastarter · ShipFast · Open SaaS · Saas-UI ·
Vercel Platforms · Nextacular · Clerk (como referência de auth) · WorkOS · Better-Auth.

Regras:
- **Verifique, não presuma.** Se não achou a página, conte como "não verificado" e diga quantos ficaram
  assim.
- **Declare o painel** na nota. Prevalência sem painel declarado é opinião.
- **1 de 11 é informação, não descarte automático** — pode ser diferencial legítimo. Mas tem de estar
  escrito, e o `value` da spec deve refletir isso.

## 4. Ceticismo obrigatório

Cheque explicitamente, e registre a resposta:

- **É moda?** O recurso existia há 2 anos? Continuará em 2? Se a resposta depende de um hype ciclo, diga.
- **O custo é do fork ou do core?** Serviço pago, env obrigatória, dependência pesada ou lock-in que todo
  fork herda — mesmo os que não usam o recurso — é **contra-argumento forte**. Registre em riscos.
- **Cabe no free tier?** O repo é feito para "começar de graça e escalar". Um recurso que exige plano pago
  desde o dia 1 precisa de justificativa.
- **É genérico?** Se só faz sentido em um domínio, **não é spec deste repo**. Diga isso e encerre.
- **Já existe?** Confirme no código antes de recomendar (grep/leitura). Recomendar o que existe é o pior
  erro possível desta skill.

## 5. Nunca invente

- Não invente número de prevalência, artigo de lei, versão de norma, preço ou limite de plano.
- Não confirmou numa fonte de nível 1–4? Escreva **"não confirmado"** e siga. Isso é resultado válido.
- Cite **URL completa** e a data em que você acessou (a nota carrega `collected:`).

## 6. Formato da nota

Grave em `specs/research/<topico>.md` — `<topico>` em inglês, kebab-case.

```markdown
---
topic: in-app-notifications
question: Vale entregar notificações in-app + preferências de e-mail por padrão num boilerplate de MVP?
lens: produto
panel: [next-forge, makerkit, supastarter, shipfast, open-saas, saas-ui, clerk, workos]
collected: 2026-08-21
revalidate_after: 2027-02-21
confidence: alta        # alta | média | baixa — o quanto as fontes convergem
---

# <Título da pergunta>

## Resposta curta
2–4 linhas. É padrão? Vale? Com que corte?

## Prevalência
"7 de 11 referências entregam por padrão." Tabela: referência | entrega? | fonte.
Quantas não foram verificadas e por quê.

## O que o mercado trata como o mínimo
As capacidades que aparecem em quase todas as referências — este é o insumo do corte de MVP.

## O que é opcional / avançado
O que só aparece em produtos maduros. Insumo do "fora do corte".

## Obrigações e requisitos externos
Exigências de lei ou de provedor, se houver. Cite a fonte de nível 1–2 ou marque "não confirmado".

## Armadilhas conhecidas
Problemas relatados na prática (custo, escala, acoplamento, edge case).

## Custo herdado por todo fork
Dependência, env, serviço pago, lock-in. Se for zero, escreva zero.

## Fontes
- <URL> — <o que sustenta>
```

## 7. Validade e revalidação

- `revalidate_after` padrão: **6 meses**. Tema de norma/lei: 12 meses. Tema de precificação de provedor:
  3 meses.
- Ao reusar uma nota vencida, **revalide só o que mudou** (preço, versão, prevalência) e atualize
  `collected`. Não reescreva a nota inteira.
- Nota que sustenta spec já `done` pode ficar como está — é registro histórico.

## Checklist final

- [ ] Pergunta pesquisável declarada no frontmatter.
- [ ] Painel de referências declarado; prevalência escrita como fração verificada.
- [ ] Toda afirmação de mercado tem URL de nível 1–4; nada de blog de agência.
- [ ] O que não foi confirmado está marcado como "não confirmado".
- [ ] Custo herdado por todo fork está explícito (mesmo quando é zero).
- [ ] Confirmado no **código** que o recurso ainda não existe.
- [ ] `collected` e `revalidate_after` preenchidos com datas absolutas (`date '+%Y-%m-%d'`).
