---
name: spec-audit
description: Reconcilia o backlog de specs (specs/) com a realidade do código e do pipeline — confere no código se o corte de MVP de cada spec foi entregue, cruza com docs/features/*/STATE.md, corrige os status, detecta deriva, move as specs entregues para docs/features/<slug>/spec.md e regrava o BACKLOG.md. Use no /spec --sync, ao fechar um ciclo de entrega, ou quando desconfiar que o backlog está mentindo.
---

# Auditoria do backlog de specs

O `status` gravado numa spec é **uma afirmação, não um fato**. Esta skill verifica cada afirmação contra o
código e fecha o loop `/spec → /analyze → /develop → /review → /test → /spec`.

Regra que governa tudo: **o código é a verdade.** Se o frontmatter diz `proposed` e a capacidade está
implementada, o frontmatter está errado.

## 1. Levante o material

```bash
ls specs/*.md
ls docs/features/*/spec.md 2>/dev/null    # specs já entregues e arquivadas
grep -l '' docs/features/*/STATE.md 2>/dev/null
```

Para cada spec, leia o frontmatter (`id`, `status`, `feature`, `depends_on`) e a seção
**"Proposta — corte de MVP"** (a lista de capacidades é o que você vai verificar).

Contrato do backlog e valores válidos de `status`: [`specs/README.md`](../../../specs/README.md).

## 2. Verifique cada spec no código

Audite **tudo que ainda está em `specs/`**, exceto `rejected` (esse, só sob suspeita de regressão — §5).
Isso inclui três casos que é fácil deixar de fora:

- **`done` ainda em `specs/`** — é um estado inconsistente por definição: entregue deveria ter sido
  arquivado. Confirme no código; se bater, **arquive agora** (§4.1); se não bater, é **regressão** (§5).
  Sem esta linha o loop teria um estado absorvente — o `/analyze` detecta essa spec e não tem quem a
  resolva.
- **`deferred`** — adiar não impede que outra tarefa entregue o escopo por tabela. Verifique.
- **`superseded`** — confirme que a spec que a absorveu existe e ainda está viva.

Para **cada item do corte de MVP**, procure a evidência de implementação nas camadas que a spec declarou em
"Impacto por camada":

| Camada | Onde procurar a evidência |
|--------|---------------------------|
| Contrato | `packages/sdk/src/actions/**`, `packages/sdk/src/types/**` |
| API | `apps/api/app/(routes)/**`, `(shared)/repositories`, `(shared)/validation`, `(guards)` |
| App | `apps/app/app/[locale]/**`, `shared/hooks`, `shared/components` |
| Landing | `apps/web/app/[locale]/**` |
| Packages | `packages/<nome>/**` (exports reais no `package.json` **e** arquivo no disco) |
| i18n | `packages/internationalization/translations/**` |
| Infra | `firestore.rules`, `firestore.indexes.json`, `turbo.json`, `.github/workflows`, `env.ts`/`keys.ts` |

Classifique cada item em: **implementado** · **parcial** · **ausente**.

### Cuidados que evitam falso positivo

- **Export declarado ≠ arquivo existente.** Confira o disco, não só o `package.json`.
- **Código morto conta como ausente.** Função que ninguém chama, `keys.ts` sem a env, handler com corpo
  vazio ou `// TODO` não é entrega.
- **Documentação não é evidência.** Um `docs/*.md` descrevendo o recurso como pronto vale zero — se houver
  divergência entre doc e código, **registre-a**: é achado de auditoria.
- **Teste não é entrega**, mas entrega sem teste vira nota no relatório.

## 3. Cruze com o pipeline

Para cada `docs/features/*/STATE.md`:

- Leia o frontmatter (`slug`, `spec`, `branch`) e a tabela de etapas.
- Feature com `spec: <id>` e todas as etapas até `test` em `done` → forte indício de spec entregue (mas
  ainda **confirme no código**, §2).
- Feature em andamento → a spec correspondente deve estar `in-progress`.
- Feature sem `spec:` cujo escopo casa com uma spec → o vínculo faltou; proponha preenchê-lo nos dois
  lados.

## 4. Aplique as transições

| Achado | Transição | Observação |
|--------|-----------|------------|
| Todos os itens do MVP implementados | → `done` + **arquive** (§ 4.1) | preencha `feature: <slug>` e a data |
| Parte implementada, feature em andamento | → `in-progress` | liste os itens que faltam; **não** arquive |
| Parte implementada, **nenhuma** feature ativa | mantenha o status | **entrega parcial órfã** — sinalize alto |
| Nada implementado | mantenha | - |
| Escopo absorvido por outra spec | → `superseded` | aponte o `id` que a absorveu; **fica em `specs/`** |
| Tornou-se irrelevante | **proponha** `rejected` | ⚠️ **não aplique** — decisão do usuário |

### 4.1 Arquivar a spec entregue (o movimento)

Uma spec `done` **sai de `specs/`** e passa a viver junto da feature que a implementou. É isso que mantém
`specs/` como "o que falta" em vez de virar um arquivo morto crescente.

1. Descubra o `<slug>` da feature: pelo `feature:` do frontmatter, ou pelo `docs/features/*/STATE.md` que
   traz `spec: <id>`. **Sem slug identificado, não mova** — reporte e peça a decisão.
2. Confirme que `docs/features/<slug>/` existe. Se não existir, algo está errado (spec entregue sem
   feature registrada): reporte em vez de criar a pasta.
3. **Se `docs/features/<slug>/spec.md` já existir, PARE.** Não sobrescreva e **nunca** use `git mv -f`:
   ou a spec já foi arquivada (e a que está em `specs/` é duplicata a investigar), ou duas specs
   diferentes apontam para a mesma feature. Reporte a colisão com os dois caminhos e peça decisão.
4. Atualize o frontmatter **antes** de mover: `status: done`, `feature: <slug>`, `updated` de hoje.
5. Mova preservando o histórico do arquivo:

   ```bash
   git mv specs/<id>.md docs/features/<slug>/spec.md
   ```

   Se o arquivo ainda não estiver rastreado pelo git, use `mv` simples — mas prefira `git mv` sempre que
   possível, porque a rastreabilidade do arquivo é metade do valor de guardar a spec.
6. No `BACKLOG.md`, tire a spec da fila ativa e registre-a na seção **Entregues**, com link para o novo
   caminho. **O id nunca some do índice** — some da fila.
7. Se o `docs/features/<slug>/STATE.md` ainda não citar a spec, acrescente `spec: <id>` ao frontmatter.

**Nunca apague uma spec.** `done` é movida; `rejected` e `superseded` ficam em `specs/` como memória
institucional — é o que impede o `/spec` de repropor a mesma coisa na rodada seguinte.

> **Commit:** o arquivo movido pertence ao commit `docs(features): <slug>` daquela feature. Como o
> `--sync` costuma rodar depois do `/review`, na prática ele gera um commit de fechamento à parte. Não
> commite por conta própria — [`git-commits.md`](../../rules/git-commits.md) exige aprovação explícita.

## 5. Detecte deriva

**Deriva** = o corte de MVP foi implementado, mas **diferente** do especificado (outro modelo de dados,
outra área do painel, capacidade extra, capacidade silenciosamente cortada).

Deriva não é erro — é informação. Para cada caso, diga qual das duas ocorreu:

- **a spec estava errada** → atualize a spec para refletir a realidade, com uma linha de nota;
- **a implementação desviou** → registre como achado para o usuário decidir.

Verifique também **regressão**: spec `done` cuja capacidade não está mais no código (removida num refactor).
Isso é achado bloqueante — reporte, não rebaixe o status em silêncio.

## 6. Regrave o `BACKLOG.md`

- Regrave **o arquivo inteiro**, preservando as specs que você não tocou.
- Mantenha a seção **Entregues** com uma linha por spec arquivada, apontando para
  `docs/features/<slug>/spec.md`. O índice é a única visão que mostra entregue e pendente lado a lado.
- Ordene por prioridade (`value` alto e `effort` baixo primeiro), respeitando `depends_on`.
- Atualize os contadores por `status` e a data de auditoria.
- Confira as dependências: spec `approved` cujo `depends_on` aponta para spec não-`done` **não** pode ser
  recomendada como próxima — sinalize o bloqueio.

## 7. Relatório

```markdown
## Auditoria do backlog — <YYYY-MM-DD>

**Verificadas:** N specs · **transições aplicadas:** N · **precisam de decisão:** N

### Transições aplicadas
| id | de → para | evidência (arquivo:linha) | arquivada em |

### Precisam de decisão
| id | recomendação | por quê |

### Deriva
| id | especificado | implementado | leitura |

### Achados
- Entrega parcial órfã: <id> — <itens implementados sem feature ativa>
- Divergência doc × código: <arquivo> afirma X, código mostra Y
- Regressão: <id> — capacidade ausente no código
```

## Limites

- **Escreve em `specs/`** e, **só para arquivar a spec entregue**, cria `docs/features/<slug>/spec.md` e
  acrescenta o campo `spec:` ao `STATE.md` daquela feature. Nada além disso em `docs/features/**`.
- **Nunca toque em `apps/**` ou `packages/**`.**
- **Nunca aplique `rejected`** por conta própria — proponha.
- **Nunca apague uma spec.** Entregue é **movida**; `superseded` e `rejected` ficam em `specs/`.
- **Nunca arquive sem verificar o código.** Mover uma spec por acreditar no `status` gravado destrói
  exatamente a garantia que esta skill existe para dar.
- **Não commite.** Ver [`git-commits.md`](../../rules/git-commits.md).
- Datas absolutas via `date '+%Y-%m-%d'`.
